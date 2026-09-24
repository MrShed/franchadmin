/* INDEX CASE engine — 05-sim.js
 * Agent-based spread, one day at a time. States: S E P(presymptomatic) I(symptomatic)
 * A(asymptomatic) H(hospital) C(intensive care) D R. Every infection is recorded
 * {infector, infectee, setting, place, day, mode} with a genome (parent + new mutations).
 *
 * Every random draw is counter-based (IX.u) on (agent, day, infector, setting), so
 * the untouched "ghost city" is the same simulation run with an empty policy: it
 * matches the player's city exactly until the first order that changes a contact.
 *
 *   var S = new IX.Sim(C, P, key)   // key: string for the draws
 *   S.step(pol)                     // simulate day S.sd, then S.sd++
 *   IX.calibrate(P, C, key)         // tunes P.beta (R) and P.preW (presymptomatic share)
 */
var IX = (typeof IX !== 'undefined' && IX) ? IX : {};

(function () {
  'use strict';
  var SET = IX.SET, u = IX.u, FLAG = IX.FLAG, OCC = IX.OCC, D = IX.DATA;
  var ST = IX.ST = { S: 0, E: 1, P: 2, I: 3, A: 4, H: 5, C: 6, D: 7, R: 8 };
  var NSET = 26;

  // close-contact multipliers by human route and setting; shared-air weight by route
  var CLOSE = {
    airborne: {}, droplet: { 15: 0.8 },
    contact: { 2: 0.15, 3: 0.3, 4: 0.8, 5: 0.1, 6: 1.2, 7: 1.5, 8: 0.15, 9: 0.1, 10: 0.3, 11: 0.3, 12: 0.1, 13: 0.1, 14: 0.3, 15: 0.1, 16: 0.5, 17: 0.4, 18: 0.1, 19: 0.2, 20: 0.2, 21: 1, 24: 1.3, 25: 0.2, 1: 1.2 },
    gut: { 2: 0.2, 3: 0.45, 4: 1.5, 5: 0.2, 6: 0.8, 7: 0.8, 8: 0.2, 9: 0.3, 10: 0.1, 11: 0.2, 12: 0.1, 13: 0.1, 14: 0.3, 15: 0.05, 16: 0.5, 17: 0.5, 18: 0.05, 19: 0.05, 20: 0.1, 21: 1, 24: 0.5, 25: 0.2, 1: 1.2 }
  };
  var ROOMW = { airborne: 1, droplet: 0.06, contact: 0.01, gut: 0 };
  var ROOMK = 7;          // shared-air dose scale relative to a household pair-day
  var FOODK = 0.12;       // per diner, from an infectious food handler at work (gut)
  var DOORK = 0.05;
  var VISITK = 0.5;
  var LEISURE = {}; [SET.PUB, SET.RESTAURANT, SET.GYM, SET.FAITH, SET.CHOIR, SET.STADIUM, SET.EVENT, SET.MARKET, SET.SHOP].forEach(function (s) { LEISURE[s] = 1; });
  IX.LEISURE = LEISURE;
  var SAMPLE_CAP = 60;

  function closeTable(route) { var t = new Float32Array(NSET); for (var s = 0; s < NSET; s++) { var v = CLOSE[route][s]; t[s] = v === undefined ? 1 : v; } return t; }

  // ---------------------------------------------------------------- the simulation
  function Sim(C, P, key) {
    this.C = C; this.P = P; this.key = String(key);
    var N = C.N;
    this.N = N;
    var kh = function (t) { return IX.hash(key + '/' + t); };
    this.K = { inf: kh('inf'), nh: kh('nh'), beh: kh('beh'), cont: kh('cont'), room: kh('room'), visit: kh('visit'), door: kh('door'), mut: kh('mut'), spill: kh('spill'),
      bg: kh('bg'), comp: kh('comp'), gp: kh('gp'), fear: kh('fear'), vac: kh('vac'), prim: kh('prim') };
    this.st = new Uint8Array(N);
    this.cur = new Int32Array(N).fill(-1);
    this.nInf = new Uint8Array(N);
    this.vac = new Int16Array(N).fill(-32000);
    this.bgUntil = new Int16Array(N).fill(-32000);
    this.isoUntil = new Int16Array(N).fill(-32000);   // set by the policy layer (known cases)
    this.quarUntil = new Int16Array(N).fill(-32000);  // traced contacts
    this.away = new Uint8Array(N);
    this.awayList = [];
    this.cap = 0; this.n = 0;
    this.grow(4096);
    this.active = [];
    this.sd = 0;
    this.mutN = 0;
    this.closeT = closeTable(P.humanRoute);
    this.roomW = ROOMW[P.humanRoute];
    this.daily = [];   // per-day truth summary
    this.admLog = [];  // admissions per day (novel)
    this.hospNow = 0; this.icuNow = 0;
    this.variantBorn = -1;
    this.spills = 0;
    this.wd0 = C.wd0;
    this.driverList = [];
    for (var a = 0; a < N; a++) if (C.flags[a] & FLAG.DELIVERY) this.driverList.push(a);
    this.foodPlaces = {};
    this.pres = new Array(C.nG); this.presDay = new Int32Array(C.nG).fill(-99999);
  }
  IX.Sim = Sim;
  var SP = Sim.prototype;

  var XF = ['who', 'by', 'day', 'set', 'place', 'mode', 'onset', 'pseudo', 'pre', 'hosp', 'icu', 'death', 'rec', 'care', 'vr', 'mut0', 'mutN', 'sym', 'flags', 'ud'];
  var XT = { who: Int32Array, by: Int32Array, day: Int16Array, set: Uint8Array, place: Int16Array, mode: Uint8Array, onset: Int16Array, pseudo: Int16Array, pre: Uint8Array,
    hosp: Int16Array, icu: Int16Array, death: Int16Array, rec: Int16Array, care: Int16Array, vr: Uint8Array, mut0: Int32Array, mutN: Uint8Array, sym: Int32Array, flags: Uint8Array, ud: Float32Array };
  IX.XF = XF; IX.XT = XT;
  // infection flags
  var XFL = IX.XFL = { SEVERE: 1, CAREDEATH: 2, DECIDED: 4, TREATED: 8, SEQFAIL: 16, OVERFLOW: 32 };

  SP.grow = function (cap) {
    var self = this;
    XF.forEach(function (f) {
      var T = XT[f], a = new T(cap);
      if (self['x' + f]) a.set(self['x' + f].subarray(0, self.n));
      self['x' + f] = a;
    });
    this.cap = cap;
  };

  SP.wd = function (sd) { return (sd + this.wd0) % 7; };

  // ---------------------------------------------------------------- natural history
  SP.ageFactor = function (a) { var P = this.P; return P.ageIFR[D.ageBand(this.C.age[a])]; };

  SP.infect = function (j, byX, sd, set, place, mode) {
    var P = this.P, C = this.C, K = this.K;
    if (this.n >= this.cap) this.grow(this.cap * 2);
    var x = this.n++;
    var ninf = this.nInf[j]++;
    var ku = function (t) { return u(K.nh, j, ninf * 64 + t, 0); };
    this.xwho[x] = j; this.xby[x] = byX; this.xday[x] = sd; this.xset[x] = set; this.xplace[x] = place; this.xmode[x] = mode;
    // variant inheritance / birth
    var vr = byX >= 0 ? this.xvr[byX] : 0;
    if (!vr && P.variant && this.variantSd !== undefined && this.variantBorn < 0 && sd >= this.variantSd && byX >= 0) { vr = 1; this.variantBorn = x; }
    this.xvr[x] = vr;
    // genome: new mutations on this transmission
    var nm = IX.poissonU(P.mutRate, u(K.mut, x, 1, 0));
    if (byX < 0) nm += IX.poissonU(byX === -2 ? 2.5 : 0.5, u(K.mut, x, 2, 0));
    if (vr && this.variantBorn === x) nm += 3;
    this.xmut0[x] = this.mutN; this.xmutN[x] = Math.min(255, nm); this.mutN += nm;
    // incubation, symptoms, severity
    var inc = Math.max(1, Math.round(IX.gammaMS(P.incMean, P.incSd, IX.normal2(ku(1), ku(2)))));
    var pre = Math.min(P.preDays, inc - 1);
    if (pre < 0) pre = 0;
    var age = C.age[j], band = D.ageBand(age);
    var asymP = P.asym * (age < 18 ? 1.25 : age >= 70 ? 0.8 : 1);
    var vacProt = this.vacProtect(j, sd);
    if (vacProt > 0) asymP = asymP + (1 - asymP) * 0.4 * vacProt;
    var asym = ku(3) < Math.min(0.9, asymP);
    this.xpre[x] = pre;
    this.xpseudo[x] = sd + inc;
    this.xflags[x] = 0; this.xud[x] = ku(9);
    this.xhosp[x] = -1; this.xicu[x] = -1; this.xdeath[x] = -1; this.xcare[x] = -1; this.xsym[x] = 0;
    if (asym) {
      this.xonset[x] = -1;
      this.xrec[x] = sd + inc + Math.max(3, Math.round(P.symDays * 0.7)) + 1;
    } else {
      var on = sd + inc;
      this.xonset[x] = on;
      var sm = 0;
      for (var s = 0; s < P.symptoms.length; s++) if (u(K.nh, j, ninf * 64 + 20 + s, 1) < P.symptoms[s].p) sm |= 1 << D.SYM[P.symptoms[s].id].i;
      if (!sm) sm = 1 << D.SYM[P.symptoms[0].id].i;
      this.xsym[x] = sm;
      // severity: P(hospital | symptomatic)
      var ihr = P.ageIHR[band] * (vr ? P.variant.ifr : 1);
      var pH = Math.min(0.95, ihr / Math.max(0.05, 1 - P.asym));
      if (vacProt > 0) pH *= (1 - 0.75 * vacProt);
      var severe = ku(4) < pH;
      if (severe) {
        this.xflags[x] |= XFL.SEVERE;
        var hd = on + Math.max(1, Math.round(IX.gammaMS(P.hospDelay, P.hospDelay * 0.35, IX.normal2(ku(5), ku(6)))));
        this.xhosp[x] = hd;
        this.xrec[x] = hd + Math.max(3, Math.round(IX.gammaMS(P.los, P.los * 0.35, IX.normal2(ku(7), ku(8)))));
      } else {
        this.xrec[x] = on + P.symDays + 1 + Math.floor(ku(10) * 3);
      }
      // GP / NHS 111 contact: more likely when more ill
      var pCare = severe ? 0.8 : 0.22 + 0.25 * (P.family === 'contact' ? 1 : 0);
      if (ku(11) < pCare) this.xcare[x] = on + 1 + Math.floor(ku(12) * 3);
    }
    this.st[j] = ST.E;
    this.cur[j] = x;
    this.active.push(x);
    return x;
  };

  SP.vacProtect = function (j, sd) {
    var v = this.vac[j]; if (v < -30000 || sd < v + 14) return 0;
    return 1;
  };

  // infectiousness of infection x on day sd (0 if not infectious)
  SP.weight = function (x, sd) {
    var P = this.P, on = this.xonset[x], pre = this.xpre[x], w, rel;
    if (on < 0) {
      rel = sd - this.xpseudo[x];
      if (rel < -pre) return 0;
      var dur = Math.max(3, Math.round(P.symDays * 0.7));
      if (rel >= dur) return 0;
      w = (rel < 0 ? P.preW : P.symW[rel]) * P.asymRel;
    } else {
      rel = sd - on;
      if (rel < -pre) return 0;
      if (rel >= P.symDays) {
        if (P.family === 'contact' && this.xhosp[x] >= 0 && sd < this.xrec[x] && (this.xdeath[x] < 0 || sd < this.xdeath[x])) w = P.symW[P.symDays - 1];
        else return 0;
      } else w = rel < 0 ? P.preW : P.symW[rel];
    }
    if (this.xvr[x]) w *= P.variant.beta;
    return w;
  };

  // ---------------------------------------------------------------- daily state
  SP.stateOn = function (x, sd) {
    var on = this.xonset[x], day = this.xday[x], pre = this.xpre[x];
    if (this.xdeath[x] >= 0 && sd >= this.xdeath[x]) return ST.D;
    if (sd >= this.xrec[x]) return ST.R;
    if (on < 0) { return sd >= this.xpseudo[x] - pre ? ST.A : ST.E; }
    if (this.xhosp[x] >= 0 && sd >= this.xhosp[x]) {
      if (this.xflags[x] & XFL.CAREDEATH) return ST.I;
      return (this.xicu[x] >= 0 && sd >= this.xicu[x]) ? ST.C : ST.H;
    }
    if (sd >= on) return ST.I;
    if (sd >= on - pre) return ST.P;
    return ST.E;
  };

  /** sick people stay home: probability by day of illness (children more) */
  SP.sickHome = function (j, x, sd, pol) {
    var on = this.xonset[x]; if (on < 0 || sd < on) return false;
    var rel = sd - on, age = this.C.age[j];
    var p = age < 16 ? 0.55 + 0.12 * rel : 0.3 + 0.12 * rel;
    if (this.C.flags[j] & (FLAG.HCW | FLAG.CARE_WORKER)) p -= 0.08;   // presenteeism
    if (this.P.family === 'gut') p += 0.1;
    // an isolation order (with support payments): the ill stay home from the first day of symptoms
    if (pol && pol.isoSym && this.complies(j, 0, pol)) p = Math.max(p, 0.88);
    return u(this.K.beh, j, sd, 1) < Math.min(0.94, p);
  };

  // ---------------------------------------------------------------- one day
  var EMPTY_POL = IX.EMPTY_POL = {
    closed: null, setRestr: null, mult: null, roomMult: null, foodMult: 1, excludeIllFood: false, hospIPC: 0, careRules: 0, isolate: false, quarantine: false,
    comp: null, beds: 0, icu: 0, treatment: 0, shield: null, noSpill: null, hhIso: 0.6, travel: 0
  };
  /** does agent j comply with order slot o today (pol.comp gives compliance per district x trust band) */
  SP.complies = function (j, oslot, pol) {
    if (!pol.comp) return false;
    var c = pol.comp[oslot]; if (!c) return false;
    var C = this.C, cv = c[C.dist[j] * 3 + D.trustBand(C.age[j])];
    return u(this.K.comp, j, oslot, 0) < cv;
  };

  /** is j absent from all out-of-home settings today (hospital, sick, isolating, quarantined, dead) */
  SP.computeAway = function (sd, pol) {
    var L = this.awayList, away = this.away, i;
    for (i = 0; i < L.length; i++) away[L[i]] = 0;
    L.length = 0;
    var act = this.active;
    for (i = 0; i < act.length; i++) {
      var x = act[i], j = this.xwho[x], s = this.st[j];
      var a = 0;
      if (s === ST.H || s === ST.C || s === ST.D) a = 2;
      else if (s === ST.I && this.sickHome(j, x, sd, pol)) a = 1;
      if (a) { away[j] = a; L.push(j); }
    }
    // background inpatients, isolation and quarantine lists (maintained by the policy layer)
    var bg = this.bgList || [];
    for (i = 0; i < bg.length; i++) { var b = bg[i]; if (this.bgUntil[b] >= sd && !away[b]) { away[b] = 2; L.push(b); } }
    if (pol.isoList) for (i = 0; i < pol.isoList.length; i++) { var q = pol.isoList[i]; if (!away[q] && this.isoUntil[q] >= sd && this.complies(q, 0, pol)) { away[q] = 3; L.push(q); } }
    if (pol.quarList) for (i = 0; i < pol.quarList.length; i++) { var r = pol.quarList[i]; if (!away[r] && this.quarUntil[r] >= sd && this.complies(r, 1, pol)) { away[r] = 4; L.push(r); } }
    for (i = 0; i < this.deadList.length; i++) { var dd = this.deadList[i]; if (!away[dd]) { away[dd] = 5; L.push(dd); } }
  };

  /** does agent j attend group g today (membership mask m) */
  SP.attends = function (j, g, m, sd, wd, pol) {
    if (this.away[j]) return false;
    var C = this.C;
    var gd = C.gDay[g];
    if (gd > -9999) { if (gd !== sd) return false; }
    else if (!(m & (1 << wd))) return false;
    if (C.gAlt[g] && (Math.floor((sd + this.wd0) / 7) & 1)) return false;
    var s = C.gSet[g];
    if (pol.closed) { var p = C.gPlace[g]; if (p >= 0 && pol.closed[p]) return false; }
    if (pol.setRestr) {
      var rs = pol.setRestr[s];
      if (rs) for (var k = 0; k < rs.length; k += 2) {
        var o = rs[k], strength = rs[k + 1];
        if (o < 0) { if (u(this.K.comp, j, 900 + s, sd) < strength) return false; }       // physical closure fraction
        else if (this.complies(j, o, pol) && (strength >= 1 || u(this.K.comp, j, 1000 + o, sd) < strength)) return false;
      }
      if (pol.wfh && s === SET.WORK) { var oc = C.occ[j]; if ((oc === OCC.OFFICE || oc === OCC.OUT) && this.complies(j, pol.wfh, pol)) return false; }
      if (pol.shield && (C.flags[j] & FLAG.VULNERABLE) && s !== SET.CARE && this.complies(j, pol.shield, pol)) return false;
      if (pol.lockWork && s === SET.WORK) { var oc2 = C.occ[j]; if ((oc2 === OCC.OFFICE || oc2 === OCC.OUT || oc2 === OCC.TRADES || oc2 === OCC.HOTEL) && this.complies(j, pol.lockWork, pol)) return false; }
    }
    if (LEISURE[s] && this.fear > 0 && u(this.K.fear, j, sd, s) < this.fear) return false;
    return true;
  };

  /** members of group g present today (cached per group per day) */
  SP.present = function (g, sd, wd, pol) {
    if (this.presDay[g] === sd) return this.pres[g];
    var C = this.C, L = this.pres[g];
    if (!L) L = this.pres[g] = [];
    L.length = 0;
    this.presDay[g] = sd;
    var gd = C.gDay[g];
    if (gd > -9999 && gd !== sd) return L;
    if (C.gAlt[g] && (Math.floor((sd + this.wd0) / 7) & 1)) return L;
    var p = C.gPlace[g];
    if (pol.closed && p >= 0 && pol.closed[p]) return L;
    for (var t = C.gStart[g], e = C.gStart[g + 1]; t < e; t++) {
      var j = C.gMem[t];
      if (this.away[j]) continue;
      if (this.attends(j, g, gd > -9999 ? 127 : C.gMask[t], sd, wd, pol)) L.push(j);
    }
    return L;
  };

  SP.maskOf = function (j, g) {
    var C = this.C, a = C.mStart[j], b = C.mStart[j + 1];
    for (var i = a; i < b; i++) if (C.mGroup[i] === g) return C.mMask[i];
    return 0;
  };

  SP.susc = function (j, sd, vr) {
    var s = this.st[j];
    if (s !== ST.S) {
      if (s === ST.R && vr && this.P.variant && this.P.variant.escape > 0) {
        var x = this.cur[j]; if (x >= 0 && this.xvr[x]) return 0;
        return this.P.variant.escape * 0.7;
      }
      return 0;
    }
    var f = this.C.age[j] < 18 ? this.P.childSusc || 1 : 1;
    if (this.vac[j] > -30000 && sd >= this.vac[j] + 14) f *= 1 - (this.VE_inf || 0.65) * (vr && this.P.variant ? 1 - this.P.variant.escape : 1);
    return f;
  };

  // exposure: draw (or accumulate the expected number when this.expect is set)
  SP.expose = function (i, x, j, lam, sd, set, place, mode, tag) {
    if (lam <= 0) return;
    var sc = this.susc(j, sd, this.xvr[x]);
    if (sc <= 0) return;
    if (this.expect) { this.expect.add(j, lam * sc); return; }
    var p = 1 - Math.exp(-lam * sc);
    if (u(this.K.inf, i * 32 + tag, j, sd) < p) this.infect(j, x, sd, set, place, mode);
  };

  /** transmission from agent i (infection x) on day sd */
  SP.spread = function (i, x, sd, wd, pol, w) {
    var C = this.C, P = this.P, beta = P.beta * w, closeT = this.closeT, roomW = this.roomW, s0 = this.st[i];
    var polMult = pol.mult, polRoom = pol.roomMult;
    var j, k, a, b;
    var inHosp = s0 === ST.H || s0 === ST.C || (this.bgUntil[i] >= sd);
    // household
    if (!inHosp) {
      var h = C.hh[i], hm = this.away[i] === 3 ? pol.hhIso : 1;
      if (pol.shieldHH && (C.flags[i] & FLAG.VULNERABLE)) hm *= 0.7;
      for (a = C.hStart[h], b = C.hStart[h + 1]; a < b; a++) {
        j = C.hMem[a]; if (j === i) continue;
        var aj = this.away[j]; if (aj === 2 || aj === 5) continue;
        this.expose(i, x, j, beta * hm * closeT[SET.HOME], sd, SET.HOME, -1, 0, 0);
      }
    }
    if (inHosp) { this.spreadWard(i, x, sd, pol, beta); return; }
    if (this.away[i]) {
      // at home: doorstep deliveries still happen
      this.spreadDoorIn(i, x, sd, wd, pol, beta);
      return;
    }
    // groups
    for (var mi = C.mStart[i], me = C.mStart[i + 1]; mi < me; mi++) {
      var g = C.mGroup[mi];
      if (!this.attends(i, g, C.mMask[mi], sd, wd, pol)) continue;
      var set = C.gSet[g], place = C.gPlace[g], ga = C.gStart[g], gb = C.gStart[g + 1], n = gb - ga;
      if (n < 2) continue;
      var pm = polMult ? polMult[set] : 1;
      var cl = beta * C.gDur[g] * closeT[set] * pm;
      if (set === SET.CARE && pol.careRules) cl *= 1 - 0.45 * pol.careRules;
      var kk = C.gK[g];
      var L = this.present(g, sd, wd, pol), nl = L.length;
      if (nl < 2) continue;
      // close contacts (among those present)
      if (cl > 0 && kk > 0) {
        for (k = 0; k < kk; k++) {
          j = L[Math.floor(u(this.K.cont, i, sd * 64 + k, g) * nl)];
          if (j === i) continue;
          this.expose(i, x, j, cl, sd, set, place, 0, 1 + k);
        }
      }
      // shared air
      var rw = roomW * C.gRoom[g] * ROOMK * (polRoom ? polRoom[set] : 1) * pm;
      if (set === SET.CARE && pol.careRules) rw *= 1 - 0.3 * pol.careRules;
      if (rw > 1e-4) this.spreadRoom(i, x, g, L, sd, beta * rw, set, place);
      // food from an infectious food handler at work
      if (P.family === 'gut' && (C.flags[i] & FLAG.FOOD) && set === SET.WORK && place >= 0 && C.places[place].food) this.spreadFood(i, x, place, sd, wd, pol, beta);
      if (P.family === 'gut' && (C.flags[i] & FLAG.FOOD) && set === SET.EVENT) this.spreadRoomFood(i, x, g, L, sd, beta * FOODK * pol.foodMult, place);
    }
    // visits with friends
    var fa = C.fStart[i], fb = C.fStart[i + 1];
    var vm = pol.visitMult === undefined ? 1 : pol.visitMult;
    for (a = fa; a < fb; a++) {
      j = C.fList[a];
      var lo = i < j ? i : j, hi = i < j ? j : i;
      var pv = (C.age[i] < 30 || C.age[j] < 30) ? 0.07 : 0.05;
      if (u(this.K.visit, lo, hi, sd) >= pv) continue;
      if (this.away[j]) continue;
      if (vm < 1 && u(this.K.visit, lo, hi, sd + 7777) >= vm) continue;
      this.expose(i, x, j, beta * VISITK * closeT[SET.VISIT], sd, SET.VISIT, -1, 0, 20);
    }
    // delivery driver on the round
    if ((C.flags[i] & FLAG.DELIVERY) && this.worksToday(i, sd, wd, pol)) {
      for (k = 0; k < 14; k++) {
        var hh = Math.floor(u(this.K.door, i, sd, k) * C.nH);
        var hs = C.hStart[hh], he = C.hStart[hh + 1]; if (he <= hs) continue;
        j = C.hMem[hs + Math.floor(u(this.K.door, i, sd, 100 + k) * (he - hs))];
        if (this.away[j] === 2 || this.away[j] === 5) continue;
        this.expose(i, x, j, beta * DOORK * closeT[SET.DOORSTEP], sd, SET.DOORSTEP, -1, 0, 21);
      }
    }
    this.spreadDoorIn(i, x, sd, wd, pol, beta);
    // a GP visit while infectious
    if (this.xcare[x] === sd) this.spreadGP(i, x, sd, wd, pol, beta);
  };

  SP.worksToday = function (i, sd, wd, pol) {
    var C = this.C;
    for (var mi = C.mStart[i], me = C.mStart[i + 1]; mi < me; mi++) { var g = C.mGroup[mi]; if (C.gSet[g] === SET.WORK && this.attends(i, g, C.mMask[mi], sd, wd, pol)) return true; }
    return false;
  };

  /** a delivery driver calls at i's door (i infectious at home) */
  SP.doorMapFor = function (sd) {
    if (!this._doorCache) this._doorCache = {};
    if (this._doorCache[sd]) return this._doorCache[sd];
    var C = this.C, L = this.driverList, M = {};
    for (var t = 0; t < L.length; t++) {
      var dr = L[t];
      for (var k = 0; k < 14; k++) {
        var h = Math.floor(u(this.K.door, dr, sd, k) * C.nH);
        (M[h] = M[h] || []).push(dr, k);
      }
    }
    if (!this.expect) this._doorCache = {};
    this._doorCache[sd] = M;
    return M;
  };
  SP.spreadDoorIn = function (i, x, sd, wd, pol, beta) {
    var C = this.C, h = C.hh[i], E = this.doorMapFor(sd)[h];
    if (!E) return;
    for (var t = 0; t < E.length; t += 2) {
      var dr = E[t], k = E[t + 1];
      var hs = C.hStart[h], he = C.hStart[h + 1];
      if (C.hMem[hs + Math.floor(u(this.K.door, dr, sd, 100 + k) * (he - hs))] !== i) continue;
      if (this.away[dr] || !this.worksToday(dr, sd, wd, pol)) continue;
      this.expose(i, x, dr, beta * DOORK * this.closeT[SET.DOORSTEP], sd, SET.DOORSTEP, -1, 0, 22);
    }
  };

  /** shared air: each person present gets the same dose; successes found by geometric skipping */
  SP.spreadRoom = function (i, x, g, L, sd, lamTot, set, place) {
    var nl = L.length, m = nl > SAMPLE_CAP ? SAMPLE_CAP : nl, t, j;
    var lam = lamTot / Math.max(1, nl - 1) * (nl / m);
    if (lam <= 0) return;
    var off = nl > SAMPLE_CAP ? Math.floor(u(this.K.room, i, sd, g) * nl) : 0;
    if (this.expect) {
      for (t = 0; t < m; t++) { j = L[(off + t) % nl]; if (j !== i) this.expose(i, x, j, lam, sd, set, place, 1, 40); }
      return;
    }
    var p = 1 - Math.exp(-lam);
    if (p < 1e-7) return;
    var lq = Math.log(1 - p), pos = -1, dr = 0, vr = this.xvr[x];
    for (;;) {
      var uu = u(this.K.room, i, sd * 64 + 63, g * 64 + (dr++));
      pos += 1 + (p >= 0.999999 ? 0 : Math.floor(Math.log(1 - uu) / lq));
      if (pos >= m || dr > 200) break;
      j = L[(off + pos) % nl];
      if (j === i) continue;
      var sc = this.susc(j, sd, vr);
      if (sc <= 0) continue;
      if (sc < 1 && u(this.K.inf, i * 32 + 31, j, sd) > (1 - Math.exp(-lam * sc)) / p) continue;
      this.infect(j, x, sd, set, place, 1);
    }
  };

  SP.spreadRoomFood = function (i, x, g, L, sd, lamEach, place) {
    var nl = L.length, m = nl > SAMPLE_CAP ? SAMPLE_CAP : nl, t, j;
    var off = nl > SAMPLE_CAP ? Math.floor(u(this.K.room, i, sd + 7, g) * nl) : 0;
    for (t = 0; t < m; t++) {
      j = L[(off + t) % nl];
      if (j === i) continue;
      this.expose(i, x, j, lamEach * (nl / m), sd, SET.FOOD, place, 2, 110 + t);
    }
  };

  SP.spreadFood = function (i, x, place, sd, wd, pol, beta) {
    var C = this.C;
    if (pol.excludeIllFood && this.st[i] === ST.I) return;
    var lam = beta * FOODK * pol.foodMult;
    if (lam <= 0) return;
    var gs = C.placeGroups[place];
    for (var q = 0; q < gs.length; q++) {
      var g = gs[q], s = C.gSet[g];
      if (s === SET.WORK) continue;
      var Lf = this.present(g, sd, wd, pol);
      if (Lf.length) this.spreadRoomFood(i, x, g, Lf, sd, lam * (s === SET.SCHOOL ? 0.5 : 1), place);
    }
    if (place === C.hospital) {   // hospital kitchen: patients on the wards
      var W = this.wardLists || [];
      for (var w = 0; w < W.length; w++) for (var z = 0; z < W[w].length && z < 20; z++) this.expose(i, x, W[w][z], lam * 0.6, sd, SET.FOOD, place, 2, 180 + z);
    }
  };

  /** hospital wards: patients (novel + other admissions) and ward staff */
  SP.wardOf = function (j, sd) {
    var s = this.st[j];
    if (s === ST.C) return 3;
    var x = this.cur[j];
    if (x >= 0 && (s === ST.H) && this.xhosp[x] === sd) return 4;   // admitted via the emergency department today
    if (s === ST.H) return this.C.age[j] >= 75 && (u(this.K.bg, j, 7, 0) < 0.5) ? 1 : 0;
    return Math.floor(u(this.K.bg, j, 8, 0) * 3);   // other admissions: wards 4, 7, 2
  };
  SP.buildWards = function (sd) {
    var W = [[], [], [], [], []];
    var act = this.active;
    for (var i = 0; i < act.length; i++) { var j = this.xwho[act[i]], s = this.st[j]; if ((s === ST.H || s === ST.C) && !(this.xflags[act[i]] & XFL.CAREDEATH)) W[this.wardOf(j, sd)].push(j); }
    var bg = this.bgList || [];
    for (i = 0; i < bg.length; i++) { var b = bg[i]; if (this.bgUntil[b] >= sd && this.st[b] !== ST.D) W[this.wardOf(b, sd)].push(b); }
    this.wardLists = W;
  };
  SP.spreadWard = function (i, x, sd, pol, beta) {
    var C = this.C, s0 = this.st[i];
    if (this.xflags[x] & XFL.CAREDEATH) return;   // cared for in the care home: spreads there via household-like care group below
    var w = this.wardOf(i, sd), W = this.wardLists[w];
    var novel = s0 === ST.H || s0 === ST.C;
    var ipc = novel ? pol.hospIPC || 0 : 0;       // cohorting and PPE once the disease is recognised
    var g = C.wards[w], wd = this.wd(sd), k, j;
    var Ls = this.present(g, sd, wd, pol), n = Ls.length;
    var cl = beta * IX.SET_PARAMS[SET.PATIENT].dur * this.closeT[SET.PATIENT] * (1 - 0.75 * ipc);
    // staff caring for the patient
    for (k = 0; k < 6 && n; k++) {
      j = Ls[Math.floor(u(this.K.cont, i, sd * 64 + k, g) * n)];
      this.expose(i, x, j, cl, sd, SET.PATIENT, C.hospital, 0, 60 + k);
    }
    // other patients on the ward (shared bays, shared air)
    var rw = this.roomW * IX.roomFactor(SET.PATIENT) * ROOMK * (1 - 0.9 * ipc);
    for (k = 0; k < W.length && k < 30; k++) {
      j = W[k]; if (j === i) continue;
      this.expose(i, x, j, beta * (rw / Math.max(4, W.length) + (k < 2 ? 0.1 * this.closeT[SET.PATIENT] * (1 - 0.9 * ipc) : 0)), sd, SET.PATIENT, C.hospital, 1, 70 + k);
    }
  };

  /** infectious staff member on a ward infects patients (called from spread via group membership) */
  SP.staffToPatients = function (i, x, sd, wd, pol, beta) {
    var C = this.C, t;
    for (var mi = C.mStart[i], me = C.mStart[i + 1]; mi < me; mi++) {
      var g = C.mGroup[mi]; if (C.gSet[g] !== SET.HOSP) continue;
      if (!this.attends(i, g, C.mMask[mi], sd, wd, pol)) continue;
      var w = C.wards.indexOf(g); if (w < 0) continue;
      var W = this.wardLists[w];
      for (t = 0; t < 4 && W.length; t++) {
        var j = W[Math.floor(u(this.K.cont, i, sd * 64 + 50 + t, g) * W.length)];
        this.expose(i, x, j, beta * 0.3 * this.closeT[SET.PATIENT] * (1 - 0.5 * (pol.hospIPC || 0)), sd, SET.PATIENT, C.hospital, 0, 80 + t);
      }
    }
  };

  SP.spreadGP = function (i, x, sd, wd, pol, beta) {
    var C = this.C, gpI = C.gpOfDist[C.dist[i]]; if (gpI === null || gpI === undefined) return;
    var p = C.places[gpI], g = p.waitGroup;
    if (pol.remoteGP) beta *= 0.3;
    // staff
    var Lg = this.present(g, sd, wd, pol);
    for (var t = 0; t < Lg.length; t++) { var j = Lg[t]; this.expose(i, x, j, beta * this.roomW * IX.roomFactor(SET.GP, p.ach, p.m3) * ROOMK / 10 + (t === 0 ? beta * 0.1 * this.closeT[SET.GP] : 0), sd, SET.GP, gpI, 1, 90 + t); }
    // other patients in the waiting room: random residents of the district
    var D0 = C.dist[i];
    for (t = 0; t < 6; t++) {
      var j2 = Math.floor(u(this.K.gp, i, sd, t) * C.N);
      if (C.dist[j2] !== D0 || this.away[j2]) continue;
      this.expose(i, x, j2, beta * this.roomW * IX.roomFactor(SET.GP, p.ach, p.m3) * ROOMK / 10, sd, SET.GP, gpI, 1, 100 + t);
    }
  };

  /** spillover from the animal source */
  SP.spill = function (sd, wd, pol) {
    var P = this.P, C = this.C;
    if (!this.spillSite && this.spillSite !== 0) return;
    var site = this.spillSite;
    if (pol.closed && pol.closed[site]) return;
    var rate = this.spillRate;
    if (!rate) return;
    var nEv = IX.poissonU(rate, u(this.K.spill, sd, 1, 0));
    for (var e = 0; e < nEv; e++) {
      var gs = C.placeGroups[site], cands = [];
      for (var q = 0; q < gs.length; q++) {
        var g = gs[q];
        var Lp = this.present(g, sd, wd, pol);
        for (var t = 0; t < Lp.length; t++) { var j = Lp[t]; if (this.st[j] === ST.S) cands.push(j); }
      }
      if (!cands.length) return;
      var who = cands[Math.floor(u(this.K.spill, sd, 2 + e, 0) * cands.length)];
      this.infect(who, -2, sd, SET.ANIMAL, site, 3);
      this.spills++;
    }
  };

  /** background hospital admissions (other illnesses) — they fill the wards and can catch it there */
  SP.bgAdmit = function (sd) {
    var C = this.C, n = IX.poissonU(1.4 * C.N / 8000, u(this.K.bg, sd, 1, 0));
    if (!this.bgList) this.bgList = [];
    for (var t = 0; t < n; t++) {
      var j = Math.floor(u(this.K.bg, sd, 10 + t, 0) * C.N);
      var age = C.age[j];
      if (u(this.K.bg, sd, 40 + t, 0) > (age >= 65 ? 1 : age >= 40 ? 0.35 : 0.15)) continue;
      if (this.st[j] === ST.D || this.st[j] === ST.H || this.st[j] === ST.C || this.bgUntil[j] >= sd) continue;
      this.bgUntil[j] = sd + 3 + Math.floor(u(this.K.bg, sd, 70 + t, 0) * 8);
      this.bgList.push(j);
    }
    if (this.bgList.length > 200) this.bgList = this.bgList.filter(function (b) { return this.bgUntil[b] >= sd; }, this);
  };

  /** advance one day. pol: compiled policy for this day (IX.EMPTY_POL for none) */
  SP.step = function (pol) {
    pol = pol || EMPTY_POL;
    var sd = this.sd, wd = this.wd(sd), P = this.P, C = this.C, i, x, j;
    if (!this.deadList) this.deadList = [];
    this.bgAdmit(sd);
    // 1. states for today
    var act = this.active, keep = [], nH = 0, nC = 0, adm = 0, deaths = 0, newDeaths = [];
    var beds = pol.beds || this.baseBeds, icuCap = pol.icu || this.baseIcu;
    for (i = 0; i < act.length; i++) {
      x = act[i]; j = this.xwho[x];
      // admission day: decide ICU and outcome (hospital capacity matters)
      if (this.xhosp[x] === sd && !(this.xflags[x] & XFL.DECIDED)) this.decide(x, sd, pol, beds, icuCap);
      var s = this.stateOn(x, sd);
      if (s === ST.D && this.st[j] !== ST.D) { deaths++; newDeaths.push(x); this.deadList.push(j); }
      if (this.xhosp[x] === sd && !(this.xflags[x] & XFL.CAREDEATH)) adm++;
      this.st[j] = s;
      if (s === ST.H) nH++; else if (s === ST.C) nC++;
      if (s !== ST.D && s !== ST.R) keep.push(x);
    }
    this.active = keep;
    this.hospNow = nH + nC; this.icuNow = nC;
    this.admLog.push(adm);
    var a7 = 0; for (i = Math.max(0, this.admLog.length - 7); i < this.admLog.length; i++) a7 += this.admLog[i];
    // people notice full hospitals and stay in a bit (same in the ghost city)
    this.fear = Math.min(0.3, a7 / (0.0035 * C.N));
    this.computeAway(sd, pol);
    this.buildWards(sd);
    // 2. transmission from everyone infectious today (in a fixed order)
    var inf = this.active.slice();
    var nInfectious = 0;
    for (i = 0; i < inf.length; i++) {
      x = inf[i];
      if (this.xday[x] >= sd) continue;   // infected today: not yet infectious
      j = this.xwho[x];
      var w = this.weight(x, sd);
      if (w <= 0) continue;
      var sj = this.st[j]; if (sj === ST.D || sj === ST.R) continue;
      nInfectious++;
      if (C.flags[j] & FLAG.HCW && sj !== ST.H && sj !== ST.C && !this.away[j]) this.staffToPatients(j, x, sd, wd, pol, P.beta * w);
      this.spread(j, x, sd, wd, pol, w);
    }
    if (P.route === 'animal') this.spill(sd, wd, pol);
    this.extraSpill(sd, wd, pol);
    // 3. vaccination (policy layer fills pol.vaccinate with agent ids)
    if (pol.vaccinate) for (i = 0; i < pol.vaccinate.length; i++) { j = pol.vaccinate[i]; if (this.vac[j] < -30000) this.vac[j] = sd; }
    var newInf = 0; for (i = this.n - 1; i >= 0 && this.xday[i] === sd; i--) newInf++;
    this.daily.push({ sd: sd, newInf: newInf, infectious: nInfectious, hosp: this.hospNow, icu: this.icuNow, adm: adm, deaths: deaths, overflow: this.hospNow > beds ? 1 : 0 });
    this.sd = sd + 1;
    return { newInf: newInf, deaths: newDeaths };
  };

  /** admission: ICU need and outcome; overflow and treatment change the odds */
  SP.decide = function (x, sd, pol, beds, icuCap) {
    var P = this.P, C = this.C, j = this.xwho[x], band = D.ageBand(C.age[j]);
    this.xflags[x] |= XFL.DECIDED;
    var fh = Math.min(0.92, P.ageFH[band] * (this.xvr[x] ? P.variant.ifr : 1));
    // care home residents are often cared for in the home
    var careRes = C.flags[j] & FLAG.CARE_RES;
    if (careRes && u(this.K.nh, j, 999, this.nInf[j]) < 0.4) {
      this.xflags[x] |= XFL.CAREDEATH;
      if (this.xud[x] < Math.min(0.95, fh * 1.25)) this.xdeath[x] = sd + Math.max(1, Math.round(P.deathDelay * 0.7));
      return;
    }
    var over = this.hospNow >= beds;
    var needIcu = u(this.K.nh, j, 998, this.nInf[j]) < P.icuShare + (this.xud[x] < fh ? 0.35 : 0);
    var icuFull = this.icuNow >= icuCap;
    var m = 1;
    if (over) { m *= 1.5; this.xflags[x] |= XFL.OVERFLOW; }
    if (needIcu && icuFull) m *= 1.8;
    if (pol.treatment) { m *= 1 - P.treatEffect; this.xflags[x] |= XFL.TREATED; }
    if (this.vacProtect(j, sd) > 0) m *= 0.4;
    if (needIcu && !icuFull) { this.xicu[x] = sd + 1 + Math.floor(u(this.K.nh, j, 997, 0) * 2); this.icuNow++; }
    this.hospNow++;
    if (this.xud[x] < Math.min(0.97, fh * m)) {
      this.xdeath[x] = sd + Math.max(1, Math.round(IX.gammaMS(P.deathDelay, P.deathDelay * 0.35, IX.normal2(u(this.K.nh, j, 996, 0), u(this.K.nh, j, 995, 0)))));
      if (this.xdeath[x] >= this.xrec[x]) this.xrec[x] = this.xdeath[x] + 1;
    }
  };

  /** extra early introductions (a second spillover for market/farm sources) */
  SP.extraSpill = function (sd, wd, pol) {
    if (!this.extra) return;
    for (var e = 0; e < this.extra.length; e++) {
      var ev = this.extra[e];
      if (ev.sd !== sd || ev.done) continue;
      ev.done = 1;
      if (pol.closed && pol.closed[ev.place]) continue;
      if (this.st[ev.who] === ST.S) this.infect(ev.who, ev.by, sd, ev.set, ev.place, ev.mode);
    }
  };

  /** start the outbreak: the primary case (and plan extra introductions) */
  SP.seedOutbreak = function () {
    var P = this.P, C = this.C, K = this.K, R = IX.rng(this.key + '/primary');
    var cands = [], set = SET.EXTERNAL, place = -1, mode = 3, a;
    var src = P.source;
    function flagged(f) { var L = []; for (var q = 0; q < C.N; q++) if ((C.flags[q] & f) && !(C.flags[q] & FLAG.CARE_RES)) L.push(q); return L; }
    function members(pi, setFilter) { var L = []; C.placeGroups[pi].forEach(function (g) { if (setFilter !== undefined && C.gSet[g] !== setFilter) return; for (var t = C.gStart[g]; t < C.gStart[g + 1]; t++) if (L.indexOf(C.gMem[t]) < 0) L.push(C.gMem[t]); }); return L; }
    if (src === 'traveller') { cands = flagged(FLAG.TRAVELLER); set = SET.EXTERNAL; }
    else if (src === 'hospital') { cands = []; [0, 4].forEach(function (w) { var g = C.wards[w]; for (var t = C.gStart[g]; t < C.gStart[g + 1]; t++) cands.push(C.gMem[t]); }); set = SET.HOSP; place = C.hospital; }
    else if (src === 'lab') { place = R.pick(C.labs); cands = members(place); set = SET.LAB; }
    else if (src === 'market') { place = P.route === 'animal' || R.chance(0.5) ? C.livestock : C.marketHall; cands = members(place); set = SET.ANIMAL; }
    else { var farms = C.animalSites.filter(function (p) { return C.places[p].kind === 'farm' || C.places[p].kind === 'meat_plant'; }); place = R.pick(farms); cands = members(place); set = SET.ANIMAL; }
    if (!cands.length) cands = flagged(FLAG.TRAVELLER);
    var prim = cands[Math.floor(R.next() * cands.length)];
    this.primary = prim; this.sourcePlace = place;
    this.infect(prim, src === 'market' || src === 'farm' ? -2 : -1, 0, set, place, mode);
    // animal route: the source keeps spilling over
    if (P.route === 'animal') { this.spillSite = place; this.spillRate = P.spillRate; }
    else if ((src === 'market' || src === 'farm') && R.chance(0.35)) {
      var others = cands.filter(function (q) { return q !== prim; });
      if (others.length) this.extra = [{ sd: R.int(3, 12), who: R.pick(others), by: -2, set: set, place: place, mode: 3 }];
    } else if (src === 'traveller' && R.chance(0.25)) {
      var tr = flagged(FLAG.TRAVELLER).filter(function (q) { return q !== prim; });
      if (tr.length) this.extra = [{ sd: R.int(4, 20), who: R.pick(tr), by: -1, set: SET.EXTERNAL, place: -1, mode: 3 }];
    }
  };

  // ---------------------------------------------------------------- genome helpers
  /** all mutation ids of infection x (root first) */
  SP.genome = function (x) {
    var chain = [];
    while (x >= 0) { chain.push(x); x = this.xby[x]; }
    var out = [];
    for (var c = chain.length - 1; c >= 0; c--) { var y = chain[c]; for (var m = 0; m < this.xmutN[y]; m++) out.push(this.xmut0[y] + m); }
    return out;
  };
  SP.mutLabel = function (m) {
    var h = IX.h3(this.K.mut, m, 7, 0), pos = 1 + (h % this.P.genomeLen), b = 'ACGT', f = b.charAt((h >>> 16) & 3), t = b.charAt(((h >>> 18) & 3) === ((h >>> 16) & 3) ? (((h >>> 16) & 3) + 1) & 3 : (h >>> 18) & 3);
    return f + pos + t;
  };

  // ---------------------------------------------------------------- snapshot
  SP.snapshot = function () {
    var o = { sd: this.sd, n: this.n, mutN: this.mutN, variantBorn: this.variantBorn, variantSd: this.variantSd, spills: this.spills, primary: this.primary, sourcePlace: this.sourcePlace,
      spillSite: this.spillSite, spillRate: this.spillRate, extra: this.extra || null, active: this.active, deadList: this.deadList, bgList: this.bgList || [], admLog: this.admLog, daily: this.daily,
      hospNow: this.hospNow, icuNow: this.icuNow, fear: this.fear, baseBeds: this.baseBeds, baseIcu: this.baseIcu, VE_inf: this.VE_inf };
    var self = this;
    o.arr = {};
    ['st', 'cur', 'nInf', 'vac', 'bgUntil', 'isoUntil', 'quarUntil'].forEach(function (k) { o.arr[k] = IX.b64enc(self[k]); });
    XF.forEach(function (f) { o.arr['x' + f] = IX.b64enc(self['x' + f].subarray(0, self.n)); });
    return o;
  };
  SP.restore = function (o) {
    var self = this;
    Object.keys(o).forEach(function (k) { if (k !== 'arr') self[k] = o[k]; });
    ['st', 'cur', 'nInf', 'vac', 'bgUntil', 'isoUntil', 'quarUntil'].forEach(function (k) { self[k] = IX.b64dec(o.arr[k], self[k].constructor); });
    var cap = 4096; while (cap < o.n + 16) cap *= 2;
    this.cap = 0; XF.forEach(function (f) { self['x' + f] = null; });
    this.n = 0; this.grow(cap); this.n = o.n;
    XF.forEach(function (f) { var src = IX.b64dec(o.arr['x' + f], XT[f]); self['x' + f].set(src); });
  };

  // ---------------------------------------------------------------- per-age severity tables
  IX.ageTables = function (P, C) {
    var shape = D.AGE_RISK[P.ageRisk], counts = [0, 0, 0, 0, 0, 0, 0];
    for (var a = 0; a < C.N; a++) counts[D.ageBand(C.age[a])]++;
    var tot = 0, w = 0; for (var b = 0; b < 7; b++) { tot += counts[b]; w += counts[b] * shape[b]; }
    var k = P.ifr * tot / w;
    P.ageIFR = shape.map(function (s) { return Math.min(0.6, s * k); });
    P.ageFH = D.FH_BASE.map(function (f) { return Math.min(0.85, f * P.sevScale * (P.family === 'contact' ? 1.8 : 1)); });
    P.ageIHR = P.ageIFR.map(function (f, b) { return Math.min(0.9, f / P.ageFH[b]); });
    // if IHR capped, raise fatality among the hospitalised to keep IFR
    P.ageFH = P.ageFH.map(function (f, b) { return Math.min(0.92, P.ageIFR[b] / P.ageIHR[b]); });
    var ih = 0; for (b = 0; b < 7; b++) ih += counts[b] * P.ageIHR[b];
    P.ihr = IX.round(ih / tot, 4);
  };

  // ---------------------------------------------------------------- calibration
  /** expected offspring per infection, using the real transmission code (expected-value mode) */
  function expectedOffspring(sim, idx, pol) {
    var P = sim.P, C = sim.C;
    var N = sim.C.N;
    var acc = { tot: new Float64Array(N), pre: new Float64Array(N), touched: [], add: function (j, l) { if (this.tot[j] === 0) this.touched.push(j); this.tot[j] += l; if (this.phase === 1) this.pre[j] += l; } };
    sim.expect = acc;
    var res = [];
    for (var q = 0; q < idx.length; q++) {
      var j = idx[q];
      acc.touched = [];
      var sdInf = 100 + (q % 7);
      // temporary infection record
      sim.n = 0; sim.active = []; sim.st[j] = 0; sim.nInf[j] = 0;
      var x = sim.infect(j, -1, sdInf, SET.EXTERNAL, -1, 3);
      var on = sim.xonset[x], end = sim.xrec[x];
      for (var sd = sdInf + 1; sd < end + 1; sd++) {
        var w = sim.weight(x, sd); if (w <= 0) continue;
        var s = sim.stateOn(x, sd);
        sim.st[j] = s;
        if (s === ST.H && !(sim.xflags[x] & XFL.DECIDED)) sim.decide(x, sd, pol, 999, 999);
        acc.phase = on < 0 ? 3 : sd < on ? 1 : 2;
        sim.away[j] = (s === ST.H || s === ST.C) ? 2 : (s === ST.I && sim.sickHome(j, x, sd)) ? 1 : 0;
        sim.wardLists = [[], [], [], [], []];
        if (C.flags[j] & FLAG.HCW && !sim.away[j]) sim.staffToPatients(j, x, sd, sim.wd(sd), pol, P.beta * w);
        sim.spread(j, x, sd, sim.wd(sd), pol, w);
      }
      sim.away[j] = 0; sim.st[j] = 0;
      // per target: P(infected) = 1-exp(-total hazard); the presymptomatic phase comes first,
      // so it claims 1-exp(-presymptomatic hazard) of it (household saturation)
      var tot = 0, pre = 0, tl = acc.touched, tg = [];
      for (var kq = 0; kq < tl.length; kq++) { var kk = tl[kq], pj = 1 - Math.exp(-acc.tot[kk]); pre += 1 - Math.exp(-acc.pre[kk]); tg.push(kk, pj); tot += pj; acc.tot[kk] = 0; acc.pre[kk] = 0; }
      res.push({ j: j, tot: tot, pre: pre, sym: tot - pre, asym: on < 0, targets: tg });
    }
    sim.expect = null; sim.n = 0; sim.active = [];
    return res;
  }

  // contacts cluster (households, friends and workmates share contacts), so the realised
  // reproduction number is a fraction of the random-mixing next-generation value (measured, by route)
  IX.R_CLUSTER = { airborne: 0.63, droplet: 0.51, gut: 0.46, contact: 0.4 };
  IX.calibrate = function (P, C, key) {
    IX.ageTables(P, C);
    var sim = new Sim(C, P, key + '/cal');
    sim.deadList = []; sim.baseBeds = 999; sim.baseIcu = 999;
    var R = IX.rng(key + '/cal');
    var pool = []; for (var a = 0; a < C.N; a++) pool.push(a);
    var n1 = 220, n2 = 320;
    var idx = R.sample(pool, n1);
    var targetS = P.presym;
    for (var it = 0; it < 3; it++) {
      var r1 = expectedOffspring(sim, idx, EMPTY_POL);
      // second generation: sample targets in proportion to how likely they are to be infected
      var tw = new Float64Array(C.N), tot = 0;
      r1.forEach(function (r) { var T = r.targets; for (var q2 = 0; q2 < T.length; q2 += 2) { tw[T[q2]] += T[q2 + 1]; tot += T[q2 + 1]; } });
      var keys = [], cum = [], c = 0;
      for (var a2 = 0; a2 < C.N; a2++) if (tw[a2] > 0) { keys.push(a2); c += tw[a2]; cum.push(c); }
      var idx2 = [];
      for (var q = 0; q < n2 && keys.length; q++) {
        var xx = R.next() * c, lo = 0, hi = cum.length - 1;
        while (lo < hi) { var mid = (lo + hi) >> 1; if (cum[mid] < xx) lo = mid + 1; else hi = mid; }
        idx2.push(+keys[lo]);
      }
      var r2 = expectedOffspring(sim, idx2, EMPTY_POL);
      var Rm = 0, pre = 0, sym = 0;
      r2.forEach(function (r) { Rm += r.tot; if (!r.asym) { pre += r.pre; sym += r.sym; } });
      Rm /= Math.max(1, r2.length);
      var Sm = pre / Math.max(1e-9, pre + sym);
      P.calib = { R: IX.round(Rm, 3), presym: IX.round(Sm, 3), beta: P.beta, preW: P.preW, it: it };
      var ratio = P.R / IX.R_CLUSTER[P.humanRoute] / Math.max(0.01, Rm);
      P.beta *= Math.pow(ratio, it < 2 ? 1 : 0.9);
      if (P.preDays > 0 && targetS > 0.01 && Sm > 0.001) {
        var oddsT = targetS / (1 - targetS), oddsM = Sm / (1 - Sm);
        P.preW = IX.clamp(P.preW * oddsT / oddsM, 0.05, 6);
      }
      if (Math.abs(ratio - 1) < 0.03 && (P.preDays === 0 || Math.abs(Sm - targetS) < 0.03) && it >= 1) break;
    }
    P.beta = IX.round(P.beta, 5); P.preW = IX.round(P.preW, 4);
    return P;
  };
})();
