/* INDEX CASE engine — 06-surveillance.js
 * What the player can see. Everything here reads the simulation's truth through
 * an observation model: who seeks care and when, what doctors call it before the
 * disease has a name, test capacity/sensitivity/delays, reporting delays, recall
 * errors in interviews, contacts found or missed, wastewater noise, sequencing.
 * Also: messages and typed refs, the line list, person sheets, curves, the tree.
 *
 * Methods are added to IX.GP (the game prototype, finished in 08-acts.js).
 */
var IX = (typeof IX !== 'undefined' && IX) ? IX : {};

(function () {
  'use strict';
  var D = IX.DATA, SET = IX.SET, FLAG = IX.FLAG, OCC = IX.OCC, ST = IX.ST, u = IX.u, XFL = IX.XFL;
  var GP = IX.GP = IX.GP || {};

  // ---------------------------------------------------------------- refs and messages
  GP.name = function (pid) { return this.C.first[pid] + ' ' + this.C.last[pid]; };
  GP.pref = function (pid, d) { return { t: 'person', id: pid, d: d || this.name(pid) }; };
  GP.plref = function (pi, d) { var p = this.C.places[pi]; return { t: 'place', id: p.id, d: d || p.name }; };
  GP.dref = function (di) { var d = this.C.districts[di]; return { t: 'district', id: d.id, d: d.name }; };
  GP.placeIdx = function (id) { if (typeof id === 'number') return id; var m = /^p(\d+)$/.exec(String(id)); return m ? +m[1] : -1; };
  GP.distIdx = function (id) { if (typeof id === 'number') return id; var m = /^d(\d+)$/.exec(String(id)); return m ? +m[1] : -1; };

  /** build a message. lines: array of line objects or strings (paragraphs) */
  GP.msg = function (kind, title, from, lines, o) {
    o = o || {};
    var S = this.S;
    var body = (lines || []).filter(function (l) { return l !== '' && l !== null && l !== undefined; }).map(function (l) {
      if (typeof l === 'string') return { k: 'p', x: [l] };
      if (Array.isArray(l)) return { k: 'p', x: l };
      if (!l.k) return { k: 'p', x: [l] };   // a bare ref
      return l;
    });
    var refs = [], seen = {};
    function scan(seg) { if (seg && typeof seg === 'object' && seg.t) { var k = seg.t + ':' + seg.id; if (!seen[k]) { seen[k] = 1; refs.push(seg); } } }
    body.forEach(function (l) { (l.x || []).forEach(scan); if (l.rows) l.rows.forEach(function (r) { r.forEach(scan); }); if (l.who) scan(l.who); });
    var m = { id: 'M' + (++S.msgSeq), day: o.day !== undefined ? o.day : S.day, kind: kind, title: title, from: from || '', body: body, refs: refs, read: false };
    if (o.urgent) m.urgent = true;
    if (o.choices) m.choices = o.choices;
    if (o.meta) m.meta = o.meta;
    S.msgs.push(m);
    if (this._fresh) this._fresh.push(m);
    return m;
  };
  IX.msgText = function (m) {
    function seg(x) { return typeof x === 'string' ? x : (x && x.d) || ''; }
    var out = [m.title + (m.from ? ' — ' + m.from : '')];
    m.body.forEach(function (l) {
      if (l.k === 'table') { out.push('  ' + l.head.join(' | ')); l.rows.forEach(function (r) { out.push('  ' + r.map(seg).join(' | ')); }); }
      else out.push((l.k === 'h' ? '## ' : l.k === 'q' ? '  "' : l.k === 'm' ? '  ' : l.k === 'n' ? '  (' : '') + l.x.map(seg).join('') + (l.k === 'q' ? '"' : l.k === 'n' ? ')' : ''));
    });
    if (m.choices) out.push('  [' + m.choices.map(function (c) { return c.label; }).join(' / ') + ']');
    return out.join('\n');
  };

  // ---------------------------------------------------------------- day helpers
  GP.gd = function (sd) { return sd - this.S.sd0; };
  GP.sdOf = function (d) { return d + this.S.sd0; };
  GP.dateLabel = function (d) { return this.cal.nice(d); };
  GP.dateLong = function (d) { return this.cal.long(d); };
  GP.shortDate = function (d) { return this.cal.short(d); };
  GP.inf = function (pid) { return this.sim.cur[pid]; };
  /** infection of pid that had begun by sim day sd (or -1) */
  GP.infBy = function (pid, sd) { var x = this.sim.cur[pid]; return x >= 0 && this.sim.xday[x] <= sd ? x : -1; };

  // ---------------------------------------------------------------- background illness (flu season, other ILI)
  GP.seasonAt = function (sd) {
    var peak = this.S.fluPeak, w = 24;
    var z = (sd - peak) / w;
    return 0.25 + Math.exp(-z * z);
  };
  /** background influenza-like illness starting on sim day sd: [{pid, kind:'flu'|'other', hosp, sym}] (deterministic) */
  GP.bgIli = function (sd) {
    var C = this.C, K = this.keys.ili;
    var lam = C.N / 8000 * 2.6 * this.seasonAt(sd);
    var n = IX.poissonU(lam, u(K, sd, 1, 0)), out = [];
    for (var t = 0; t < n; t++) {
      var pid = Math.floor(u(K, sd, 10 + t, 0) * C.N);
      var age = C.age[pid], kind = u(K, sd, 40 + t, 0) < 0.55 ? 'flu' : 'other';
      var hosp = u(K, sd, 70 + t, 0) < (age >= 75 ? 0.07 : age >= 60 ? 0.025 : age < 5 ? 0.02 : 0.004);
      var sym = 0;
      D.SYMPTOMS.forEach(function (s) { if (u(K, sd, 100 + t * 30 + s.i, 1) < s.flu) sym |= 1 << s.i; });
      out.push({ pid: pid, kind: kind, hosp: hosp, sym: sym || 3, onset: sd });
    }
    return out;
  };
  /** does pid have background ILI around sim day sd (returns record or null) */
  GP.bgFor = function (pid, sd) {
    var r = this.S.bgIli[pid];
    if (r && sd - r.onset >= -1 && sd - r.onset <= 10) return r;
    return null;
  };

  // ---------------------------------------------------------------- tests
  GP.testResult = function (pid, sd, kind, salt) {
    var sim = this.sim, P = this.P, K = this.keys.test;
    var uu = u(K, pid, sd, salt || 0);
    if (kind === 'panel') {
      var bg = this.bgFor(pid, sd);
      if (bg && uu < 0.9) return bg.kind;
      return 'neg';
    }
    var x = this.infBy(pid, sd);
    if (kind === 'sero') {
      if (x >= 0 && sd - sim.xday[x] >= 14) return uu < 0.9 ? 'pos' : 'neg';
      if (x >= 0 && sd - sim.xday[x] >= 10) return uu < 0.5 ? 'pos' : 'neg';
      return uu < 0.005 ? 'pos' : 'neg';
    }
    // PCR for the new agent
    if (x >= 0) {
      var on = sim.xonset[x] >= 0 ? sim.xonset[x] : sim.xpseudo[x];
      var rel = sd - on;
      if (rel >= P.detFrom && rel <= P.detTo) {
        var edge = rel === P.detFrom || rel >= P.detTo - 1 ? 0.7 : 1;
        if (this.grade === 'director') edge *= 0.95;
        return uu < P.sens * edge ? 'pos' : 'neg';
      }
      // a slightly wider tail: weakly positive late
      if (rel > P.detTo && rel <= P.detTo + 4) return uu < 0.2 ? 'pos' : 'neg';
    }
    return uu < 0.002 ? 'pos' : 'neg';
  };

  /** request a test: prio 0 hospital, 1 targeted by the player, 2 traced contacts, 3 GP, 4 community */
  GP.requestTest = function (pid, kind, prio, why) {
    var S = this.S;
    if (!kind) kind = S.recognized ? 'pcr' : 'panel';
    // do not duplicate a pending test of the same kind
    for (var i = 0; i < S.testQueue.length; i++) { var q = S.tests[S.testQueue[i]]; if (q.pid === pid && q.kind === kind) return q; }
    var t = { id: S.tests.length, pid: pid, kind: kind, req: S.day, prio: prio, why: why || '', result: 'pending' };
    if (why === 'stored sample re-tested') { var sid = this.sampleOf(pid); if (sid && S.samples[sid]) t.sampleDay = S.samples[sid].day; }
    S.tests.push(t); S.testQueue.push(t.id);
    var cs = S.cases[pid]; if (cs) cs.tests.push(t.id);
    return t;
  };

  /** process today's test queue up to capacity; results arrive tomorrow (panel/sero: the day after) */
  GP.processTests = function (sd) {
    var S = this.S, cap = S.testsLeft, done = [], self = this;
    S.testQueue.sort(function (a, b) { var A = S.tests[a], B = S.tests[b]; return A.prio - B.prio || A.req - B.req || A.id - B.id; });
    var keep = [];
    S.testQueue.forEach(function (id) {
      var t = S.tests[id];
      if (cap <= 0) { keep.push(id); return; }
      cap--;
      t.day = S.day; t.due = S.day + (t.kind === 'pcr' ? 1 : 2) + (S.lagBonus || 0);
      t.res = self.testResult(t.pid, t.sampleDay !== undefined ? self.sdOf(t.sampleDay) : sd, t.kind, id);
      S.pendingResults.push(id);
      done.push(t);
    });
    S.testQueue = keep;
    S.testsUsed = (S.testsUsed || 0) + done.length;
    S.series.tests[S.day - S.from] = (S.series.tests[S.day - S.from] || 0) + done.length;
    return done;
  };

  // ---------------------------------------------------------------- the line list
  GP.addCase = function (pid, via, status, o) {
    var S = this.S; o = o || {};
    var cs = S.cases[pid];
    if (!cs) {
      cs = S.cases[pid] = { pid: pid, status: status || 'suspected', via: via, reported: S.day, onset: null, outcome: 'unknown', tests: [], interviewed: false, traced: false, household: false };
      S.caseOrder.push(pid);
      this.knowPerson(pid);
      this.reportOnset(pid, cs);
    } else if (status && rank(status) > rank(cs.status)) cs.status = status;
    if (o.onset !== undefined && cs.onset === null) cs.onset = o.onset;
    return cs;
  };
  function rank(s) { return { discarded: 0, suspected: 1, probable: 2, confirmed: 3 }[s] || 0; }
  /** the case tells us when they fell ill (recall: mostly right, sometimes a day or two out) */
  GP.reportOnset = function (pid, cs, sdNow) {
    var x = this.sim.cur[pid];
    sdNow = sdNow === undefined ? this.sdOf(this.S.day) : sdNow;
    if (x >= 0 && this.sim.xonset[x] >= 0 && this.sim.xonset[x] <= sdNow) {
      var e = u(this.keys.recall, pid, 1, 0), err = e < 0.72 ? 0 : e < 0.86 ? -1 : e < 0.95 ? 1 : e < 0.98 ? -2 : 2;
      if (this.grade === 'probationer') err = e < 0.85 ? 0 : e < 0.93 ? -1 : 1;
      cs.onset = this.gd(this.sim.xonset[x]) + err;
      cs.outcome = cs.outcome === 'unknown' || cs.outcome === 'well' ? 'unwell' : cs.outcome;
      return true;
    }
    var bg = this.bgFor(pid, sdNow);
    if (bg && !(x >= 0 && this.sim.xday[x] <= sdNow)) { cs.onset = this.gd(bg.onset); cs.outcome = 'unwell'; return true; }
    return false;
  };
  GP.knowPerson = function (pid) {
    var S = this.S;
    if (!S.people[pid]) S.people[pid] = { known: {}, notes: [] };
    return S.people[pid];
  };

  // ---------------------------------------------------------------- symptom text
  GP.symList = function (mask) { var out = []; D.SYMPTOMS.forEach(function (s) { if (mask & (1 << s.i)) out.push(s.id); }); return out; };
  GP.symText = function (mask) {
    var L = this.symList(mask).map(function (id) { return D.SYM[id].label; });
    if (L.length <= 1) return L.join('');
    return L.slice(0, -1).join(', ') + ' and ' + L[L.length - 1];
  };
  /** symptoms a person reports (novel infection, or background illness) */
  GP.personSym = function (pid, sd) {
    var x = this.infBy(pid, sd);
    if (x >= 0 && this.sim.xonset[x] >= 0 && this.sim.xonset[x] <= sd) return this.sim.xsym[x];
    var bg = this.bgFor(pid, sd); if (bg) return bg.sym;
    return 0;
  };

  // ---------------------------------------------------------------- occupations and routines
  var OCC_LABEL = {};
  OCC_LABEL[OCC.OFFICE] = 'office worker'; OCC_LABEL[OCC.FACTORY] = 'works at'; OCC_LABEL[OCC.HCW] = 'nurse'; OCC_LABEL[OCC.HOSP_SUPPORT] = 'hospital porter/cleaner';
  OCC_LABEL[OCC.CARE] = 'care worker'; OCC_LABEL[OCC.TEACHER] = 'teacher'; OCC_LABEL[OCC.NURSERY_WORKER] = 'nursery nurse'; OCC_LABEL[OCC.RETAIL] = 'shop worker';
  OCC_LABEL[OCC.HOSPITALITY] = 'kitchen/bar staff'; OCC_LABEL[OCC.TRANSPORT] = 'bus driver'; OCC_LABEL[OCC.DELIVERY] = 'delivery driver'; OCC_LABEL[OCC.TRADES] = 'builder/tradesperson';
  OCC_LABEL[OCC.LAB] = 'laboratory scientist'; OCC_LABEL[OCC.MARKET] = 'market trader'; OCC_LABEL[OCC.FARM] = 'farm worker'; OCC_LABEL[OCC.MEAT] = 'meat plant operative';
  OCC_LABEL[OCC.STUDENT] = 'university student'; OCC_LABEL[OCC.PUPIL] = 'pupil'; OCC_LABEL[OCC.NURSERY_CHILD] = 'goes to nursery'; OCC_LABEL[OCC.CARE_RES] = 'care home resident';
  OCC_LABEL[OCC.HOME] = 'looks after the home'; OCC_LABEL[OCC.RETIRED] = 'retired'; OCC_LABEL[OCC.GP_STAFF] = 'GP surgery staff'; OCC_LABEL[OCC.UNEMPLOYED] = 'between jobs';
  OCC_LABEL[OCC.OUT] = 'works out of town / from home'; OCC_LABEL[OCC.UNI_STAFF] = 'university lecturer'; OCC_LABEL[OCC.HOTEL] = 'hotel staff'; OCC_LABEL[OCC.CHILD_HOME] = 'at home with family';
  GP.occLabel = function (pid) {
    var C = this.C, o = C.occ[pid], w = C.work[pid];
    var base = OCC_LABEL[o] || '';
    if (o === OCC.HCW) base = C.sex[pid] ? (u(this.keys.misc, pid, 1, 0) < 0.4 ? 'doctor' : 'nurse') : (u(this.keys.misc, pid, 1, 0) < 0.3 ? 'doctor' : 'nurse');
    if (o === OCC.FACTORY && w >= 0) return 'works at ' + C.places[w].name;
    if (w >= 0 && o !== OCC.CARE_RES && o !== OCC.RETIRED) return base + ', ' + C.places[w].name;
    return base;
  };

  /** was pid at group g on sim day sd (reconstructed: routine, closures, illness) */
  GP.wasAt = function (pid, g, sd, mask) {
    var C = this.C, sim = this.sim;
    var gd = C.gDay[g];
    if (gd > -9999) { if (gd !== sd) return false; }
    else if (!(mask & (1 << sim.wd(sd)))) return false;
    if (C.gAlt[g] && (Math.floor((sd + sim.wd0) / 7) & 1)) return false;
    var p = C.gPlace[g];
    if (p >= 0 && this.closedOn(p, C.gSet[g], sd)) return false;
    var x = this.infBy(pid, sd);
    if (x >= 0) {
      var s = sim.stateOn(x, sd);
      if (s === ST.H || s === ST.C || s === ST.D) return false;
      if (s === ST.I && sim.sickHome(pid, x, sd)) return false;
    }
    if (sim.bgUntil[pid] >= sd && sim.bgUntil[pid] - 12 <= sd) return false;
    return true;
  };
  /** was a place (or a whole setting) shut by an order on sim day sd */
  GP.closedOn = function (pi, set, sd) {
    var H = this.S.closeHist;
    for (var i = 0; i < H.length; i++) { var h = H[i]; if (sd >= h.from && sd <= h.to && (h.place === pi || (h.sets && h.sets.indexOf(set) >= 0))) return true; }
    return false;
  };

  // ---------------------------------------------------------------- daily surveillance (runs after sim.step for sim day sd)
  GP.surveil = function (sd) {
    var S = this.S, sim = this.sim, P = this.P, C = this.C, self = this;
    var day = S.day, idx = day - S.from, K = this.keys;
    var ser = S.series;
    // background ILI and deaths
    var ili = this.bgIli(sd), nIli = 0;
    ili.forEach(function (r) { if (!S.bgIli[r.pid]) { S.bgIli[r.pid] = r; nIli++; } });
    // novel infections consulting a GP today, background ILI too (syndromic count, by consultation day)
    var care = 0, newAdm = [], newDeaths = [];
    var lo = Math.max(0, sim.n - 1);
    for (var x = 0; x < sim.n; x++) {
      if (sim.xcare[x] === sd) care++;
      if (sim.xhosp[x] === sd && !(sim.xflags[x] & XFL.CAREDEATH)) newAdm.push(x);
      if (sim.xdeath[x] === sd) newDeaths.push(x);
    }
    ser.ili[idx] = (ser.ili[idx] || 0) + care + nIli;
    var bgDeaths = IX.poissonU(0.22 * C.N / 8000 * (0.8 + 0.4 * this.seasonAt(sd)), u(K.bgd, sd, 1, 0));
    ser.allDeaths[idx] = (ser.allDeaths[idx] || 0) + bgDeaths + newDeaths.length;
    // --- hospital
    newAdm.forEach(function (x) { self.onAdmission(x, sd); });
    // background pneumonia admissions (flu and others): after the alert, flagged if flu-negative
    ili.forEach(function (r) { if (r.hosp && S.alerted && r.kind === 'other' && u(K.flag, r.pid, sd, 3) < (S.recognized ? 0.15 : 0.35)) self.flagUnexplained(r.pid, sd, true); });
    // --- deaths of known cases (reported after certification: 1-3 days)
    newDeaths.forEach(function (x) {
      var pid = sim.xwho[x], cs = S.cases[pid];
      var delay = 1 + Math.floor(u(K.delay, pid, sd, 5) * 3);
      if (cs && cs.status !== 'discarded') S.deathQueue.push({ pid: pid, due: day + delay, x: x });
      else if (S.recognized && (sim.xhosp[x] >= 0 || (C.flags[pid] & FLAG.CARE_RES)) && u(K.flag, pid, 4, 0) < 0.6) S.deathQueue.push({ pid: pid, due: day + delay + 1, x: x, postMortem: true });
    });
    // --- community: GP consultations and test sites
    if (S.recognized) {
      for (x = 0; x < sim.n; x++) {
        var pid = sim.xwho[x];
        if (sim.xcare[x] === sd) {
          var pT = this.gpTestProb(sim.xsym[x]);
          if (u(K.gp, pid, sd, 1) < pT) this.requestTest(pid, 'pcr', 3, 'GP referral');
        }
        var on = sim.xonset[x];
        if (on >= 0 && sd - on === 1 + Math.floor(u(K.gp, pid, 2, 0) * 3)) {
          var pw = this.walkInProb(pid);
          if (u(K.gp, pid, sd, 3) < pw) this.requestTest(pid, 'pcr', 4, 'walk-in test site');
        }
      }
      // background ILI also comes for tests (depends on how specific the case definition is)
      ili.forEach(function (r) { if (u(K.gp, r.pid, sd, 7) < self.bgTestProb(r.sym)) self.requestTest(r.pid, 'pcr', 4, 'walk-in test site'); });
      // mass testing: random asymptomatic screening
      if (this.orderActive('mass_testing')) {
        var nScreen = Math.round(8 * C.N / 8000);
        for (var t = 0; t < nScreen; t++) { var q = Math.floor(u(K.gp, sd, 100 + t, 9) * C.N); if (sim.st[q] !== ST.D) this.requestTest(q, 'pcr', 5, 'community screening'); }
      }
    }
    // --- contact follow-up: traced contacts who fall ill
    this.followUps(sd);
    // --- tests: process queue (results tomorrow), deliver due results
    this.processTests(sd);
    // --- wastewater
    this.wastewaterDay(sd);
    // --- household studies, sequencing, trials, serosurveys, questionnaires (due items)
    this.dueWork(sd);
    // --- cluster noticing (alert and later press leaks)
    if (!S.alerted) this.checkAlert(sd);
  };

  /** results and reports that arrive on the morning of S.day (called after S.day++) */
  GP.morning = function () {
    var S = this.S, self = this, sim = this.sim, K = this.keys;
    var sdPrev = this.sdOf(S.day - 1);
    // test results
    var due = [], keep = [];
    S.pendingResults.forEach(function (id) { var t = S.tests[id]; if (t.due <= S.day) due.push(t); else keep.push(id); });
    S.pendingResults = keep;
    if (due.length) this.deliverResults(due);
    // deaths
    var dq = [], dk = [];
    S.deathQueue.forEach(function (e) { if (e.due <= S.day) dq.push(e); else dk.push(e); });
    S.deathQueue = dk;
    if (dq.length) this.reportDeaths(dq);
    // admissions of known cases
    // (known cases' outcomes update from hospital records)
    S.caseOrder.forEach(function (pid) {
      var cs = S.cases[pid]; if (cs.status === 'discarded') return;
      var x = sim.cur[pid]; if (x < 0) return;
      var sdn = self.sdOf(S.day - 1);
      if (cs.onset === null) self.reportOnset(pid, cs, sdn);
      var st = sim.stateOn(x, sdn);
      if (cs.outcome === 'died') return;
      if (sim.xhosp[x] >= 0 && sim.xhosp[x] <= sdn && !(sim.xflags[x] & XFL.CAREDEATH)) { if (cs.admitted === undefined) cs.admitted = self.gd(sim.xhosp[x]); cs.outcome = st === ST.C ? 'icu' : st === ST.R ? 'recovered' : st === ST.D ? cs.outcome : 'hospital'; }
      else if (st === ST.R && cs.outcome !== 'died') cs.outcome = sim.xonset[x] >= 0 ? 'recovered' : 'well';
      else if (st === ST.I && (cs.outcome === 'unknown' || cs.outcome === 'well')) cs.outcome = 'unwell';
      else if ((st === ST.A || st === ST.P || st === ST.E) && cs.outcome === 'unknown' && cs.status === 'confirmed') cs.outcome = 'well';
    });
  };

  // ---------------------------------------------------------------- hospital
  GP.onAdmission = function (x, sd) {
    var S = this.S, sim = this.sim, pid = sim.xwho[x], K = this.keys, P = this.P;
    S.admTruth = (S.admTruth || 0) + 1;
    if (S.recognized) {
      this.requestTest(pid, 'pcr', 0, 'tested on admission');
      var cs = S.cases[pid];
      if (cs && cs.status !== 'discarded') { cs.admitted = this.gd(sd); cs.outcome = 'hospital'; }
      this.S.hospSamples[pid] = sd;
      return;
    }
    // before the disease has a name: doctors flag severe illness they cannot explain
    var sym = sim.xsym[x], pF;
    if (P.family === 'contact') pF = 0.55;
    else if (P.family === 'gut') pF = 0.25;
    else pF = 0.3;
    if (P.tell && (sym & (1 << D.SYM[P.tell].i))) pF += 0.35;
    if (S.alerted) pF = Math.min(0.95, pF + 0.5);
    if (this.grade === 'probationer') pF += 0.1;
    S.hospSamples[pid] = sd;
    if (u(K.flag, pid, sd, 1) < pF) this.flagUnexplained(pid, sd, false);
  };
  GP.flagUnexplained = function (pid, sd, isBg) {
    var S = this.S;
    if (!S.alerted) { S.preFlags.push({ pid: pid, sd: sd }); return; }
    if (S.cases[pid]) return;
    var cs = this.addCase(pid, 'hospital', 'suspected');
    S.hospSamples[pid] = sd;
    S.newSuspects.push(pid);
  };

  // ---------------------------------------------------------------- GP and walk-in testing
  GP.caseDefMatch = function (sym) {
    var def = this.S.caseDef;
    if (!def || !def.length) return null;
    var hit = 0; def.forEach(function (id) { if (sym & (1 << D.SYM[id].i)) hit++; });
    return hit / def.length;
  };
  GP.gpTestProb = function (sym) {
    var S = this.S, m = this.caseDefMatch(sym);
    var base = m === null ? 0.45 : 0.2 + 0.7 * m;
    if (this.rumourActive('test')) base *= 0.75;
    return Math.min(0.95, base);
  };
  GP.bgTestProb = function (sym) {
    var m = this.caseDefMatch(sym);
    var base = m === null ? 0.25 : 0.05 + 0.4 * m * m;
    if (this.orderActive('mass_testing')) base *= 1.4;
    return base;
  };
  GP.walkInProb = function (pid) {
    var t = this.trustOf(pid) / 100;
    var p = (this.orderActive('mass_testing') ? 0.45 : 0.15) * (0.5 + t);
    if (this.rumourBelieves('test', pid)) p *= 0.2;
    return p;
  };

  // ---------------------------------------------------------------- deliver results
  GP.deliverResults = function (tests) {
    var S = this.S, self = this, sim = this.sim;
    var pos = [], neg = [], panel = [], sero = [];
    tests.forEach(function (t) {
      t.result = t.res; t.resultDay = S.day;
      var pid = t.pid;
      if (t.kind === 'pcr') {
        S.series.positive[S.day - S.from] = (S.series.positive[S.day - S.from] || 0) + (t.res === 'pos' ? 1 : 0);
        if (t.res === 'pos') {
          var cs = self.addCase(pid, viaOf(t), 'confirmed');
          cs.status = 'confirmed';
          if (cs.outcome === 'unknown') cs.outcome = self.reportOnset(pid, cs, self.sdOf(S.day - 1)) ? 'unwell' : 'well';
          self.storeSample(pid, t);
          pos.push(t);
          self.onConfirmed(pid);
        } else {
          var c2 = S.cases[pid];
          if (c2 && c2.status !== 'confirmed') {
            // a single negative does not rule it out if they are clearly ill; the second one does
            var negs = c2.tests.filter(function (id) { var q = S.tests[id]; return q.kind === 'pcr' && q.result === 'neg'; }).length;
            if (negs >= 2 || (c2.status === 'suspected' && negs >= 1 && !c2.epiLinked)) c2.status = 'discarded';
          }
          neg.push(t);
        }
      } else if (t.kind === 'panel') {
        var c3 = S.cases[pid];
        if (c3 && (t.res === 'flu' || t.res === 'other')) c3.status = 'discarded';
        if (t.res === 'neg') self.storeSample(pid, t);
        panel.push(t);
      } else if (t.kind === 'sero') sero.push(t);
    });
    // one summary message per morning (individual results are on the line list)
    var lines = [], rows = [];
    tests.forEach(function (t) {
      if (t.batch) return;
      rows.push([self.pref(t.pid), t.kind === 'panel' ? 'extended panel' : t.kind === 'sero' ? 'antibody' : 'PCR (' + (S.agentName || 'new agent') + ')', resLabel(t), t.why || '']);
    });
    if (!rows.length) return;
    var np = pos.length;
    var title = S.recognized ? (np ? np + ' positive' + (np > 1 ? 's' : '') + ' of ' + tests.length + ' results' : tests.length + ' result' + (tests.length > 1 ? 's' : '') + ', none positive') : 'Laboratory results: ' + tests.length;
    lines.push({ k: 'table', head: ['Person', 'Test', 'Result', 'Why'], rows: rows.slice(0, 60) });
    if (rows.length > 60) lines.push({ k: 'n', x: [(rows.length - 60) + ' more results are on the line list.'] });
    if (!S.recognized && panel.some(function (t) { return t.res === 'neg'; })) lines.push({ k: 'n', x: ['"Negative" means negative for every pathogen on the extended panel: influenza A and B, RSV, SARS-CoV-2, adenovirus, rhinovirus, metapneumovirus, mycoplasma, legionella, and the usual gastrointestinal suspects.'] });
    this.msg('lab', title, 'Public Health Laboratory, ' + this.C.name, lines);
  };
  function resLabel(t) { return t.res === 'pos' ? 'POSITIVE' : t.res === 'neg' ? (t.kind === 'panel' ? 'negative (all)' : 'negative') : t.res === 'flu' ? 'influenza' : t.res === 'other' ? 'other virus (RSV/rhinovirus)' : t.res; }
  function viaOf(t) { return t.prio === 0 ? 'hospital' : t.prio === 2 ? 'tracing' : t.prio === 3 ? 'gp' : t.prio === 5 ? 'testing' : t.why === 'household study' ? 'household' : t.prio === 4 ? 'testing' : 'testing'; }

  GP.storeSample = function (pid, t) {
    var S = this.S;
    if (!S.samples) S.samples = {};
    var sid = 'S' + (S.sampleSeq = (S.sampleSeq || 0) + 1);
    S.samples[sid] = { id: sid, pid: pid, day: t.day, kind: t.kind, test: t.id };
    t.sample = sid;
    var cs = S.cases[pid]; if (cs) cs.sample = sid;
    return sid;
  };

  GP.onConfirmed = function (pid) {
    var S = this.S;
    // under an isolation order, confirmed cases are asked to isolate (10 days from now)
    this.sim.isoUntil[pid] = this.sdOf(S.day) + 10;
    if (S.isoList.indexOf(pid) < 0) S.isoList.push(pid);
  };

  // ---------------------------------------------------------------- deaths
  var EPITAPH = IX.EPITAPH = function (g, pid) {
    var C = g.C, a = C.age[pid], o = C.occ[pid], sex = C.sex[pid], h = C.hh[pid], K = g.keys.misc;
    var hsz = C.hStart[h + 1] - C.hStart[h];
    var k = IX.h3(K, pid, 77, 0);
    var bits = [];
    if (o === OCC.CARE_RES) bits.push(['Had lived at ' + C.places[C.work[pid]].name + ' since ' + (2026 - 1 - (k % 6)) + '.', 'A resident of ' + C.places[C.work[pid]].name + '; the staff say ' + (sex ? 'he' : 'she') + ' knew every carer\'s children by name.', 'Resident at ' + C.places[C.work[pid]].name + '. Loved the quiz on Thursday afternoons.'][k % 3]);
    else if (o === OCC.HCW) bits.push(['Worked at St Anne\'s for ' + (3 + k % 25) + ' years.', 'A nurse at St Anne\'s. Colleagues lined the corridor.', 'Worked nights at St Anne\'s; always brought biscuits.'][k % 3]);
    else if (o === OCC.CARE) bits.push('Care worker at ' + C.places[C.work[pid]].name + '.');
    else if (o === OCC.TEACHER) bits.push('Taught at ' + C.places[C.work[pid]].name + '.');
    else if (o === OCC.RETIRED) bits.push(['Retired ' + ['postman', 'machinist', 'bus driver', 'nurse', 'teacher', 'dinner lady', 'mill worker', 'engineer', 'shopkeeper', 'police officer', 'secretary', 'plasterer'][k % 12] + '.', 'Retired; ' + ['kept an allotment on Hollin Lane', 'walked the dog along the canal every morning', 'did the crossword in ink', 'volunteered at the food bank', 'sang in the church choir', 'followed the Town through thick and thin'][(k >> 4) % 6] + '.'][(k >> 8) % 2]);
    else if (o === OCC.PUPIL || o === OCC.NURSERY_CHILD || o === OCC.CHILD_HOME) bits.push(a < 5 ? 'The family has asked for privacy.' : 'A pupil at ' + (C.work[pid] >= 0 ? C.places[C.work[pid]].name : 'a local school') + '.');
    else if (C.work[pid] >= 0) bits.push(g.occLabel(pid).charAt(0).toUpperCase() + g.occLabel(pid).slice(1) + '.');
    if (a >= 60 && hsz === 1 && o !== OCC.CARE_RES) bits.push('Lived alone.');
    else if (a >= 70) bits.push(['Grandparent of ' + (2 + k % 7) + '.', 'Married for ' + (30 + k % 30) + ' years.', ''][(k >> 12) % 3]);
    else if (a >= 25 && a < 60 && hsz >= 3) bits.push('Leaves a partner and ' + (hsz - 2 > 1 ? (hsz - 2) + ' children' : 'a child') + '.');
    return bits.filter(Boolean).join(' ');
  };
  GP.reportDeaths = function (list) {
    var S = this.S, self = this, sim = this.sim, C = this.C;
    var rows = [];
    list.forEach(function (e) {
      var pid = e.pid, cs = S.cases[pid];
      if (!cs) { cs = self.addCase(pid, 'hospital', 'confirmed'); cs.postMortem = true; }
      if (cs.status !== 'confirmed' && cs.status !== 'probable') cs.status = S.recognized ? 'confirmed' : cs.status;
      cs.outcome = 'died'; cs.died = self.gd(sim.xdeath[e.x]);
      S.series.deaths[S.day - S.from] = (S.series.deaths[S.day - S.from] || 0) + 1;
      S.deathsReported = (S.deathsReported || 0) + 1;
      var where = sim.xflags[e.x] & XFL.CAREDEATH ? 'at ' + C.places[C.work[pid]].name : sim.xhosp[e.x] >= 0 ? "in St Anne's" : 'at home';
      rows.push([self.pref(pid), String(C.age[pid]), self.C.districts[C.dist[pid]].name, where, EPITAPH(self, pid)]);
      S.dead.push(pid);
    });
    if (!rows.length) return;
    var n = rows.length;
    this.msg('death', n === 1 ? 'Death reported: ' + rows[0][0].d + ', ' + rows[0][1] : n + ' deaths reported', 'Mortality surveillance', [
      { k: 'table', head: ['Name', 'Age', 'District', 'Died', ''], rows: rows },
      S.recognized ? (S.deathsReported <= n ? 'The first confirmed deaths from ' + S.agentName + '. Families have been informed.' : 'Total deaths among known cases: ' + S.deathsReported + '.') : 'Cause of death recorded as unexplained severe illness; samples retained.'
    ], { urgent: S.deathsReported <= 3 });
  };

  // ---------------------------------------------------------------- the alert (a cluster noticed at one setting)
  GP.clusterKey = function (x) {
    // which "noticeable" setting a symptomatic case belongs to
    var sim = this.sim, C = this.C, pid = sim.xwho[x], f = C.flags[pid], o = C.occ[pid];
    if (f & FLAG.CARE_RES) return C.work[pid];
    if (o === OCC.CARE) return C.work[pid];
    if (o === OCC.PUPIL || o === OCC.NURSERY_CHILD || o === OCC.TEACHER || o === OCC.NURSERY_WORKER) return C.work[pid];
    if (sim.xset[x] === SET.EVENT || sim.xset[x] === SET.CHOIR || sim.xset[x] === SET.FAITH || sim.xset[x] === SET.FUNERAL) return sim.xplace[x] >= 0 ? sim.xplace[x] : -1;
    if (sim.xset[x] === SET.PATIENT || (f & FLAG.HCW && o === OCC.HCW)) return C.hospital;
    if (o === OCC.MEAT || o === OCC.FACTORY) return C.work[pid];
    return -1;
  };
  GP.checkAlert = function (sd) {
    var S = this.S, sim = this.sim, C = this.C, P = this.P, K = this.keys;
    var byPlace = {}, hospSevere = [];
    for (var x = 0; x < sim.n; x++) {
      var on = sim.xonset[x];
      if (on < 0 || on > sd || on < sd - 9) continue;
      var k = this.clusterKey(x);
      if (k >= 0) (byPlace[k] = byPlace[k] || []).push(x);
    }
    // severe unexplained illness flagged at the hospital in the last 10 days
    S.preFlags.forEach(function (f) { if (f.sd >= sd - 10) hospSevere.push(f.pid); });
    var best = null;
    var tellBoost = P.tell ? 1.4 : 1;
    if (hospSevere.length >= 3 || (hospSevere.length >= 2 && P.family === 'contact')) best = { kind: 'hospital', place: C.hospital, pids: hospSevere.slice(), p: 0.7 };
    var self = this;
    Object.keys(byPlace).forEach(function (pk) {
      var L = byPlace[pk], p = C.places[pk], need, pn;
      switch (p.kind) {
        case 'care_home': need = 3; pn = 0.6; break;
        case 'school': need = 6; pn = 0.3; break;
        case 'nursery': need = 4; pn = 0.35; break;
        case 'hospital': need = 3; pn = 0.5; break;
        case 'hotel': case 'community_hall': need = 5; pn = 0.3; break;
        case 'choir': need = 4; pn = 0.45; break;
        case 'meat_plant': case 'factory': need = 7; pn = 0.3; break;
        default: need = 6; pn = 0.2;
      }
      if (L.length >= need) {
        var cand = { kind: p.kind, place: +pk, pids: L.map(function (x) { return sim.xwho[x]; }), p: pn };
        if (!best || cand.pids.length / need > best.pids.length / 3) best = cand;
      }
    });
    if (!best) return;
    if (u(K.flag, sd, 99, 0) >= Math.min(0.95, best.p * tellBoost * (this.grade === 'probationer' ? 1.3 : 1))) return;
    S.alerted = true; S.alertSd = sd; S.alert = best;
  };

  // ---------------------------------------------------------------- contact follow-up
  GP.followUps = function (sd) {
    var S = this.S, sim = this.sim, K = this.keys, self = this;
    var ill = [];
    Object.keys(S.contacts).forEach(function (k) {
      var c = S.contacts[k], pid = +k;
      if (c.status !== 'monitoring') return;
      if (self.gd(sd) > c.followUntil) { c.status = 'well'; return; }
      var x = self.infBy(pid, sd), on = x >= 0 ? sim.xonset[x] : -1;
      var bg = self.bgFor(pid, sd);
      var fell = (on >= 0 && on <= sd && self.gd(on) >= c.exposure) ? on : (bg && bg.onset <= sd && self.gd(bg.onset) >= c.exposure ? bg.onset : -1);
      if (fell < 0) return;
      if (u(K.follow, pid, 1, 0) < 0.08) { c.status = 'lost'; return; }
      c.status = 'ill'; c.onset = self.gd(fell);
      ill.push(pid);
      var cs = self.addCase(pid, 'tracing', S.recognized ? 'probable' : 'suspected');
      cs.epiLinked = true;
      if (!cs.infectorGuess && c.of.length === 1) cs.infectorGuess = c.of[0];
      self.requestTest(pid, S.recognized ? 'pcr' : 'panel', 2, 'traced contact, now ill');
    });
    if (ill.length) {
      this.msg('report', ill.length + ' traced contact' + (ill.length > 1 ? 's have' : ' has') + ' fallen ill', 'Contact tracing team', [
        { k: 'table', head: ['Contact', 'Contact of', 'Exposed', 'Ill from'], rows: ill.map(function (pid) { var c = S.contacts[pid]; return [self.pref(pid), c.of.map(function (o) { return self.name(o); }).join(', '), self.shortDate(c.exposure), self.shortDate(c.onset)]; }) },
        'Tests requested. They are on the line list as ' + (S.recognized ? 'probable' : 'suspected') + ' cases.'
      ]);
    }
  };

  // ---------------------------------------------------------------- wastewater
  GP.shedding = function (x, sd) {
    var sim = this.sim, on = sim.xonset[x] >= 0 ? sim.xonset[x] : sim.xpseudo[x];
    var rel = sd - on;
    if (sd - sim.xday[x] < 2) return 0;
    if (rel < -3 || rel > 16) return 0;
    var w = rel < 0 ? 0.4 + 0.2 * (3 + rel) : Math.exp(-rel / 6);
    return w * (sim.xonset[x] >= 0 ? 1 : 0.6);
  };
  GP.wastewaterDay = function (sd) {
    var S = this.S, sim = this.sim, C = this.C, P = this.P, K = this.keys;
    var nd = C.districts.length, sig = new Float64Array(nd);
    for (var i = 0; i < sim.active.length; i++) { var x = sim.active[i]; var s = this.shedding(x, sd); if (s > 0) sig[C.dist[sim.xwho[x]]] += s; }
    var day = S.day;
    var vals = [];
    for (var d = 0; d < nd; d++) {
      var pop = C.districts[d].pop;
      // copies per litre (normalised to flow and population), background noise from other viruses/PMMoV normalisation
      var base = 1e4 * P.shed * sig[d] / pop * 800;
      var noise = Math.exp(0.45 * IX.normal2(u(K.ww, d, sd, 1), u(K.ww, d, sd, 2)));
      var v = (base + 30 * u(K.ww, d, sd, 3)) * noise;
      vals.push(Math.round(v < 40 ? 0 : v));
    }
    S.wwTruth[day - S.from] = vals;
    // sampled Mon/Wed/Fri once the programme runs; archived samples (twice weekly) are tested when it starts
    var wd = sim.wd(sd);
    if (this.orderActive('wastewater') && (wd === 1 || wd === 3 || wd === 5)) S.wwPending.push({ day: day, due: day + 2 });
  };

  // ---------------------------------------------------------------- scheduled work (studies, sequencing, trials)
  GP.dueWork = function (sd) {
    var S = this.S, self = this, day = S.day;
    // wastewater results
    var keep = [];
    S.wwPending.forEach(function (w) { if (w.due <= day + 1) { S.ww[w.day - S.from] = S.wwTruth[w.day - S.from]; S.wwNew = true; } else keep.push(w); });
    S.wwPending = keep;
    // generic scheduled jobs
    var jobs = S.jobs, rest = [];
    for (var i = 0; i < jobs.length; i++) { var j = jobs[i]; if (j.due <= day + 1) this.runJob(j, sd); else rest.push(j); }
    S.jobs = rest.concat(S.jobs.slice(jobs.length));
  };
  GP.schedule = function (kind, due, data) { this.S.jobs.push({ kind: kind, due: due, data: data || {} }); };
  GP.runJob = function (j, sd) {
    var fn = this['job_' + j.kind];
    if (fn) fn.call(this, j.data, sd);
  };

  // ---------------------------------------------------------------- views
  function xy(p) { return { x: p[0], y: p[1] }; }
  GP.lineList = function () {
    var S = this.S, self = this;
    return S.caseOrder.map(function (pid) { return self.caseView(pid); });
  };
  GP.caseView = function (pid) {
    var S = this.S, cs = S.cases[pid], C = this.C, self = this;
    if (!cs) return null;
    var v = { pid: pid, name: this.name(pid), age: C.age[pid], sex: C.sex[pid] ? 'M' : 'F', district: C.districts[C.dist[pid]].id, status: cs.status, onset: cs.onset,
      reported: cs.reported, outcome: cs.outcome, via: cs.via, interviewed: cs.interviewed, traced: cs.traced, household: cs.household, pos: xy(C.hPos[C.hh[pid]]) };
    if (cs.admitted !== undefined) v.admitted = cs.admitted;
    if (cs.died !== undefined) v.died = cs.died;
    v.tests = cs.tests.map(function (id) { var t = S.tests[id]; var o = { day: t.req, kind: t.kind, result: t.result }; if (t.resultDay !== undefined) o.resultDay = t.resultDay; if (t.sample) o.sample = t.sample; return o; });
    if (cs.exposures) v.exposures = cs.exposures;
    if (cs.illContacts) v.illContacts = cs.illContacts;
    if (cs.contacts) v.contacts = cs.contacts.slice();
    if (cs.infectorGuess !== undefined) v.infectorGuess = cs.infectorGuess;
    if (cs.symptoms) v.symptoms = cs.symptoms;
    if (cs.sample) v.sample = cs.sample;
    if (cs.seqId) v.seqId = cs.seqId;
    v.cluster = this.clustersOf(pid);
    return v;
  };
  GP.person = function (pid) {
    pid = +pid;
    var C = this.C, S = this.S;
    if (!(pid >= 0 && pid < C.N)) return null;
    var kp = S.people[pid] || { known: {}, notes: [] };
    var her = D.HERITAGES[C.her[pid]];
    var o = {
      pid: pid, name: this.name(pid), first: C.first[pid], last: C.last[pid], age: C.age[pid], sex: C.sex[pid] ? 'M' : 'F', district: C.districts[C.dist[pid]].id,
      address: C.hAddr[C.hh[pid]] + ', ' + C.districts[C.dist[pid]].name, pos: xy(C.hPos[C.hh[pid]]), heritage: her, portrait: IX.h3(this.keys.misc, pid, 3, 0),
      known: IX.clone(kp.known), notes: kp.notes.slice()
    };
    if (S.cases[pid]) o.case = this.caseView(pid);
    if (S.contacts[pid]) { var c = S.contacts[pid]; o.contactOf = c.of.slice(); o.followUp = { from: c.exposure, to: c.followUntil, status: c.status, onset: c.onset }; }
    return o;
  };
  GP.contacts = function () {
    var S = this.S, self = this;
    return Object.keys(S.contacts).map(function (k) {
      var c = S.contacts[k], pid = +k;
      var o = { pid: pid, name: self.name(pid), of: c.of.slice(), exposure: c.exposure, setting: c.setting, followUntil: c.followUntil, status: c.status, days: IX.clone(c.days || {}) };
      if (c.onset !== undefined) o.onset = c.onset;
      if (c.place !== undefined && c.place >= 0) o.place = self.plref(c.place);
      if (S.cases[pid]) o.tested = S.cases[pid].tests.length > 0;
      return o;
    });
  };

  GP.epiCurve = function () {
    var S = this.S, self = this, C = this.C;
    var from = S.from, n = S.day - from;
    var byOnset = new Array(n).fill(0), byReport = new Array(n).fill(0);
    var ages = [0, 0, 0, 0, 0, 0, 0], adm = [0, 0, 0, 0, 0, 0, 0], died = [0, 0, 0, 0, 0, 0, 0];
    var delays = [];
    S.caseOrder.forEach(function (pid) {
      var cs = S.cases[pid];
      if (cs.status !== 'confirmed' && cs.status !== 'probable') return;
      if (cs.onset !== null && cs.onset >= from && cs.onset < S.day) byOnset[cs.onset - from]++;
      if (cs.reported >= from && cs.reported < S.day) byReport[cs.reported - from]++;
      var b = D.ageBand(C.age[pid]); ages[b]++;
      if (cs.admitted !== undefined) adm[b]++;
      if (cs.outcome === 'died') died[b]++;
      if (cs.onset !== null && cs.reported >= cs.onset) delays.push(cs.reported - cs.onset);
    });
    // nowcast: cases with onset d not yet reported, from the empirical reporting-delay distribution
    var nowcast = new Array(n).fill(null);
    if (delays.length >= 8) {
      delays.sort(function (a, b) { return a - b; });
      for (var i = Math.max(0, n - 14); i < n; i++) {
        var d = from + i, elapsed = S.day - 1 - d;
        var k = 0; while (k < delays.length && delays[k] <= elapsed) k++;
        var frac = Math.max(0.08, k / delays.length);
        var obs = byOnset[i], est = obs / frac;
        var sdv = Math.sqrt(Math.max(1, est) * (1 - frac)) + 0.5;
        nowcast[i] = { lo: Math.max(obs, Math.round(est - 1.28 * sdv)), hi: Math.round(est + 1.28 * sdv + (frac < 0.3 ? est * 0.3 : 0)) };
      }
    }
    function arr(a) { var out = new Array(n).fill(0); for (var i2 = 0; i2 < n; i2++) out[i2] = a[i2] || 0; return out; }
    return { from: from, byOnset: byOnset, byReport: byReport, nowcast: nowcast, admissions: arr(S.series.adm), deaths: arr(S.series.deaths), ili: arr(S.series.ili),
      tests: arr(S.series.tests), positive: arr(S.series.positive), allDeaths: arr(S.series.allDeaths), byAge: { bands: D.AGE_BANDS.slice(), cases: ages, admitted: adm, died: died } };
  };

  GP.wastewater = function () {
    var S = this.S, C = this.C, n = S.day - S.from, out = {};
    var flag = {};
    C.districts.forEach(function (d, di) {
      var a = new Array(n).fill(null);
      for (var i = 0; i < n; i++) if (S.ww[i]) a[i] = S.ww[i][di];
      out[d.id] = a;
      // trend: last two samples vs the two before
      var v = a.filter(function (q) { return q !== null; });
      if (v.length >= 4) { var r = (v[v.length - 1] + v[v.length - 2] + 1) / (v[v.length - 3] + v[v.length - 4] + 1); flag[d.id] = r > 1.6 && v[v.length - 1] > 200 ? 'rising' : v[v.length - 1] > 3000 ? 'high' : null; }
      else flag[d.id] = null;
    });
    return { from: S.from, sampling: this.orderActive('wastewater'), unit: 'copies/L (normalised)', byDistrict: out, flag: flag };
  };

  // ---------------------------------------------------------------- the genome tree (sequenced samples only)
  GP.tree = function () {
    var S = this.S, sim = this.sim, self = this;
    var seqs = Object.keys(S.seqs || {}).map(function (sid) { return S.seqs[sid]; }).filter(function (q) { return q.done && q.ok; });
    // trie over ancestral mutation order; branch points and samples become nodes
    var trie = { kids: {}, samples: [] };
    seqs.forEach(function (q) {
      var t = trie;
      q.genome.forEach(function (m) { t = t.kids[m] = t.kids[m] || { kids: {}, samples: [], mut: m }; });
      t.samples.push(q);
    });
    var out = [{ id: 'root', sampleOf: null, parent: null, mutations: [], label: 'reference' }], nid = 0;
    // collapse: we pass accumulated mutations along single-child chains
    (function start() {
      var keys = Object.keys(trie.kids);
      trie.samples.forEach(function (q) { out.push({ id: q.id, sampleOf: q.pid, parent: 'root', mutations: [], day: q.day, name: self.name(q.pid) }); });
      keys.forEach(function (k) { walk2(trie.kids[k], 'root', [trie.kids[k].mut]); });
    })();
    function walk2(t, parentId, acc) {
      var keys = Object.keys(t.kids);
      var isNode = t.samples.length > 0 || keys.length !== 1;
      if (!isNode) { var c = t.kids[keys[0]]; walk2(c, parentId, acc.concat([c.mut])); return; }
      var myId;
      if (t.samples.length === 1 && keys.length === 0) {
        var q = t.samples[0];
        out.push({ id: q.id, sampleOf: q.pid, parent: parentId, mutations: acc.map(function (m) { return sim.mutLabel(m); }), day: q.day, name: self.name(q.pid), lineage: q.lineage || 'A' });
        return;
      }
      myId = 'n' + (++nid);
      out.push({ id: myId, sampleOf: null, parent: parentId, mutations: acc.map(function (m) { return sim.mutLabel(m); }) });
      t.samples.forEach(function (q) { out.push({ id: q.id, sampleOf: q.pid, parent: myId, mutations: [], day: q.day, name: self.name(q.pid), lineage: q.lineage || 'A' }); });
      keys.forEach(function (k) { var c = t.kids[k]; walk2(c, myId, [c.mut]); });
    }
    return { root: 'root', nodes: out, samples: seqs.length };
  };

  // ---------------------------------------------------------------- clusters (from what the player has learned)
  GP.clusters = function () {
    var S = this.S, self = this, C = this.C;
    var byPlace = {};
    S.caseOrder.forEach(function (pid) {
      var cs = S.cases[pid];
      if (cs.status === 'discarded') return;
      (cs.exposures || []).forEach(function (e) {
        if (e.kind !== 'place' || !e.place) return;
        var pi = self.placeIdx(e.place.id);
        if (C.places[pi].kind === 'supermarket' || C.places[pi].kind === 'station') return;
        (byPlace[pi] = byPlace[pi] || {})[pid] = 1;
      });
      var kp = S.people[pid];
      if (kp && kp.seenAt) Object.keys(kp.seenAt).forEach(function (pi) { (byPlace[pi] = byPlace[pi] || {})[pid] = 1; });
    });
    var out = [];
    Object.keys(byPlace).forEach(function (pi) {
      var pids = Object.keys(byPlace[pi]).map(Number);
      if (pids.length < 2) return;
      var ons = pids.map(function (p) { return S.cases[p].onset; }).filter(function (o) { return o !== null; });
      out.push({ id: 'K' + pi, place: self.plref(+pi), kind: C.places[pi].kind, cases: pids, size: pids.length, firstOnset: ons.length ? Math.min.apply(null, ons) : null, lastOnset: ons.length ? Math.max.apply(null, ons) : null,
        note: pids.length + ' cases linked to ' + C.places[pi].name });
    });
    // households with more than one case
    var byHH = {};
    S.caseOrder.forEach(function (pid) { var cs = S.cases[pid]; if (cs.status === 'discarded') return; var h = C.hh[pid]; (byHH[h] = byHH[h] || []).push(pid); });
    Object.keys(byHH).forEach(function (h) {
      var pids = byHH[h]; if (pids.length < 2) return;
      var ons = pids.map(function (p) { return S.cases[p].onset; }).filter(function (o) { return o !== null; });
      out.push({ id: 'H' + h, place: null, kind: 'household', cases: pids, size: pids.length, firstOnset: ons.length ? Math.min.apply(null, ons) : null, lastOnset: ons.length ? Math.max.apply(null, ons) : null, note: 'Household at ' + C.hAddr[h] });
    });
    out.sort(function (a, b) { return b.size - a.size; });
    return out;
  };
  GP.clustersOf = function (pid) {
    if (!this._clCache || this._clCache.v !== this.S.msgSeq + ':' + this.S.caseOrder.length) this._clCache = { v: this.S.msgSeq + ':' + this.S.caseOrder.length, list: this.clusters() };
    var out = [];
    this._clCache.list.forEach(function (c) { if (c.cases.indexOf(pid) >= 0) out.push(c.id); });
    return out;
  };
})();

/* ------------------------------------------------------------------------------------------
 * Investigations: interviews, tracing, household studies, site visits, questionnaires,
 * record reviews, animal sampling, sequencing, serosurveys, trials, declaring a novel agent.
 * Each returns {ok, msgs, err}. Costs are charged by GP.act (07).
 * ------------------------------------------------------------------------------------------ */
(function () {
  'use strict';
  var D = IX.DATA, SET = IX.SET, FLAG = IX.FLAG, OCC = IX.OCC, ST = IX.ST, u = IX.u, XFL = IX.XFL;
  var GP = IX.GP;

  var SET_WORDS = {};
  SET_WORDS[SET.WORK] = 'work'; SET_WORDS[SET.SCHOOL] = 'school'; SET_WORDS[SET.NURSERY] = 'nursery'; SET_WORDS[SET.UNI] = 'lectures';
  SET_WORDS[SET.HOSP] = 'shifts'; SET_WORDS[SET.CARE] = 'the care home'; SET_WORDS[SET.PUB] = 'the pub'; SET_WORDS[SET.RESTAURANT] = 'a meal out';
  SET_WORDS[SET.GYM] = 'the gym'; SET_WORDS[SET.FAITH] = 'worship'; SET_WORDS[SET.CHOIR] = 'choir practice'; SET_WORDS[SET.STADIUM] = 'the match';
  SET_WORDS[SET.MARKET] = 'the market'; SET_WORDS[SET.TRANSPORT] = 'the bus'; SET_WORDS[SET.EVENT] = 'a do'; SET_WORDS[SET.SHOP] = 'shopping';
  SET_WORDS[SET.ANIMAL] = 'the animals'; SET_WORDS[SET.LAB] = 'the lab';

  function days(g, list) { return list.map(function (d) { return g.shortDate(d); }).join(', '); }
  function wdList(g, list) {
    if (list.length >= 5) return list.length + ' days (' + g.shortDate(list[0]) + ' to ' + g.shortDate(list[list.length - 1]) + ')';
    return list.map(function (d) { return g.dateLabel(d); }).join(', ');
  }
  function pr(g, pid) { return g.pref(pid); }

  /** the exposure window for a person: 14 days before onset (or before a positive test) */
  GP.exposureWindow = function (pid) {
    var sim = this.sim, S = this.S, x = sim.cur[pid], sdNow = this.sdOf(S.day);
    var end = sdNow;
    if (x >= 0 && sim.xonset[x] >= 0 && sim.xonset[x] <= sdNow) end = sim.xonset[x];
    else {
      var cs = S.cases[pid];
      var tpos = cs ? cs.tests.map(function (id) { return S.tests[id]; }).filter(function (t) { return t.result === 'pos'; })[0] : null;
      if (tpos) end = this.sdOf(tpos.day);
      var bg = this.bgFor(pid, sdNow); if (bg && !(x >= 0 && sim.xday[x] <= sdNow)) end = bg.onset;
    }
    return { from: end - 14, to: end };
  };

  /** routine attendance over a window, by place (reconstructed truth, before recall errors) */
  GP.routineIn = function (pid, from, to) {
    var C = this.C, out = [];
    for (var mi = C.mStart[pid]; mi < C.mStart[pid + 1]; mi++) {
      var g = C.mGroup[mi], mask = C.mMask[mi], set = C.gSet[g];
      var ds = [];
      for (var sd = Math.max(0, from); sd <= to; sd++) if (this.wasAt(pid, g, sd, mask)) ds.push(sd);
      if (ds.length) out.push({ g: g, set: set, place: C.gPlace[g], sds: ds });
    }
    return out;
  };
  /** friends met in a window (visits are symmetric draws, so this is exact) */
  GP.visitsIn = function (pid, from, to) {
    var C = this.C, sim = this.sim, out = [];
    for (var a = C.fStart[pid]; a < C.fStart[pid + 1]; a++) {
      var j = C.fList[a], lo = pid < j ? pid : j, hi = pid < j ? j : pid, ds = [];
      var pv = (C.age[pid] < 30 || C.age[j] < 30) ? 0.07 : 0.05;
      for (var sd = Math.max(0, from); sd <= to; sd++) if (u(sim.K.visit, lo, hi, sd) < pv) ds.push(sd);
      if (ds.length) out.push({ pid: j, sds: ds });
    }
    return out;
  };
  GP.illOnsetOf = function (pid, sdMax) {
    var x = this.infBy(pid, sdMax), sim = this.sim;
    if (x >= 0 && sim.xonset[x] >= 0 && sim.xonset[x] <= sdMax) return sim.xonset[x];
    var r = this.S.bgIli[pid]; if (r && r.onset <= sdMax && r.onset >= sdMax - 30) return r.onset;
    return -1;
  };

  // ============================================================== interview
  GP.inv_interview = function (pid) {
    var S = this.S, C = this.C, sim = this.sim, K = this.keys, self = this;
    var cs = S.cases[pid];
    if (!cs) return { ok: false, err: 'Not on the line list.' };
    var dead = cs.outcome === 'died' || sim.st[pid] === ST.D;
    var proxy = dead || sim.st[pid] === ST.C || C.age[pid] < 12 || (C.flags[pid] & FLAG.CARE_RES);
    var tries = cs.interviewTries = (cs.interviewTries || 0) + 1;
    var pRefuse = 0.05 + (this.trustOf(pid) < 40 ? 0.08 : 0) + (this.rumourBelieves('coverup', pid) ? 0.25 : 0) + (C.occ[pid] === OCC.OUT && C.her[pid] >= 3 ? 0.06 : 0);
    if (tries > 1) pRefuse *= 0.4;
    if (u(K.recall, pid, 50, tries) < pRefuse) {
      var m0 = this.msg('interview', 'Interview declined: ' + this.name(pid), 'Contact tracing team', [
        { k: 'q', x: [IX.pickText(this, 'refuse', pid)], who: this.pref(pid) },
        { k: 'n', x: ['You can try again tomorrow; a second approach, by someone from their own community, often works.'] }]);
      return { ok: true, msgs: [m0], refused: true };
    }
    var win = this.exposureWindow(pid);
    var routine = this.routineIn(pid, win.from, win.to);
    var restrict = this.restrictionsOn();
    var exps = [], lines = [], rows = [];
    var who = proxy ? (dead ? 'family member' : C.age[pid] < 12 ? 'parent' : 'next of kin') : 'self';
    lines.push({ k: 'n', x: [proxy ? 'Interview by proxy (' + who + ').' : 'Interviewed by phone.', ' Exposure window: ' + this.shortDate(this.gd(win.from)) + ' to ' + this.shortDate(this.gd(win.to)) + '.'] });
    // symptoms and onset
    var sym = this.personSym(pid, this.sdOf(S.day));
    if (sym) {
      var L = this.symList(sym);
      if (L.length > 3 && u(K.recall, pid, 51, 0) < 0.25) L.splice(1 + Math.floor(u(K.recall, pid, 52, 0) * (L.length - 1)), 1);
      cs.symptoms = L;
      if (cs.onset === null) this.reportOnset(pid, cs);
      var symS = L.map(function (id) { return D.SYM[id].label; });
      symS = symS.length > 1 ? symS.slice(0, -1).join(', ') + ' and ' + symS[symS.length - 1] : symS[0];
      symS = symS.charAt(0).toUpperCase() + symS.slice(1);
      var dateS = cs.onset !== null ? this.dateLabel(cs.onset) : 'a few days ago';
      if (proxy) {
        var age0 = C.age[pid], male = C.sex[pid];
        var whoS = age0 < 16 ? (male ? 'My son' : 'My daughter') : age0 >= 70 ? (male ? 'Dad' : 'Mum') : (male ? 'My husband' : 'My wife');
        if (C.flags[pid] & FLAG.CARE_RES) whoS = male ? 'Dad' : 'Mum';
        lines.push({ k: 'q', x: [IX.pickText(this, 'onset_proxy', pid, { who: whoS, date: dateS, sym: symS, pron: male ? 'He' : 'She', pron2: male ? 'he' : 'she' })] });
      } else lines.push({ k: 'q', who: this.pref(pid), x: [IX.pickText(this, 'onset', pid, { date: dateS, sym: symS })] });
    } else {
      cs.symptoms = [];
      lines.push({ k: 'q', who: this.pref(pid), x: ['I feel absolutely fine. I only had the test because I was told to.'] });
    }
    // occupation
    var kp = this.knowPerson(pid);
    kp.known.occupation = this.occLabel(pid);
    if (C.work[pid] >= 0) kp.known.workplace = this.plref(C.work[pid]);
    kp.known.household = [];
    for (var a = C.hStart[C.hh[pid]]; a < C.hStart[C.hh[pid] + 1]; a++) { var hm = C.hMem[a]; if (hm !== pid) { kp.known.household.push(hm); this.knowPerson(hm); } }
    // household
    if (kp.known.household.length) {
      exps.push({ kind: 'person', setting: 'household', days: [], persons: kp.known.household.slice(), note: 'lives with ' + kp.known.household.length });
      rows.push(['Household', kp.known.household.map(function (h) { return self.name(h) + ' (' + C.age[h] + ')'; }).join(', '), 'every day']);
    } else rows.push(['Household', 'lives alone', '']);
    // places
    var habits = [];
    routine.forEach(function (r) {
      var set = r.set, isWork = set === SET.WORK || set === SET.SCHOOL || set === SET.NURSERY || set === SET.HOSP || set === SET.CARE || set === SET.UNI || set === SET.LAB || set === SET.ANIMAL && C.occ[pid] === OCC.FARM;
      if (set === SET.SHOP || set === SET.TRANSPORT) {
        if (u(K.recall, pid, 60 + r.g, 0) < 0.5) rows.push([set === SET.SHOP ? 'Shopping' : 'Bus', set === SET.SHOP && r.place >= 0 ? C.places[r.place].name : 'commute', r.sds.length + ' times']);
        return;
      }
      var pOmit = isWork ? 0.02 : 0.12;
      var lie = !isWork && restrict[set] && u(K.recall, pid, 70 + r.g, 0) < 0.55;
      if (lie || u(K.recall, pid, 80 + r.g, 0) < pOmit) return;
      var ds = r.sds.filter(function (sd, i) { return isWork || u(K.recall, pid, 90 + r.g, i) < 0.92; }).map(function (sd, i) {
        if (!isWork && u(K.recall, pid, 120 + r.g, i) < 0.12) return self.gd(sd) + (u(K.recall, pid, 150 + r.g, i) < 0.5 ? -1 : 1);
        return self.gd(sd);
      });
      if (!ds.length) return;
      var place = r.place >= 0 ? self.plref(r.place) : null;
      var label = C.gLabel[r.g] || IX.SET_NAMES[set];
      var ent = { kind: 'place', place: place, days: ds, setting: IX.SET_NAMES[set], group: label, note: label };
      // named companions in the group (friends who are members)
      var named = [];
      for (var f = C.fStart[pid]; f < C.fStart[pid + 1] && named.length < 3; f++) {
        var fr = C.fList[f];
        for (var t = C.gStart[r.g]; t < C.gStart[r.g + 1]; t++) if (C.gMem[t] === fr) { named.push(fr); break; }
      }
      if (named.length) { ent.persons = named; named.forEach(function (n) { self.knowPerson(n); }); }
      exps.push(ent);
      if (r.place >= 0) { if (!kp.seenAtI) kp.seenAtI = {}; }
      rows.push([IX.SET_NAMES[set].charAt(0).toUpperCase() + IX.SET_NAMES[set].slice(1), place || label, (ds.length > 4 ? ds.length + ' days' : days(self, ds)) + (named.length ? '; with ' + named.map(function (n) { return self.name(n); }).join(', ') : '')]);
      if (!isWork) habits.push(IX.SET_NAMES[set] + (place ? ' (' + place.d + ')' : ''));
      if (set === SET.EVENT) lines.push({ k: 'q', who: self.pref(pid), x: [IX.pickText(self, 'event', pid, { what: label, date: self.dateLabel(ds[0]), where: place ? place.d : 'at a friend\'s house', host: '' })] });
      if (set === SET.CHOIR) lines.push({ k: 'q', who: self.pref(pid), x: ['I sing with ' + place.d + '. We rehearse ' + IX.WEEKDAYS[self.sim.wd(r.sds[0])] + ' evenings. Two and a half hours, and we do like to give it some welly.'] });
    });
    kp.known.habits = habits;
    // friends visited
    var vis = this.visitsIn(pid, win.from, win.to);
    vis.forEach(function (v) {
      if (u(K.recall, pid, 200, v.pid) < 0.15) return;
      var ds = v.sds.map(function (sd) { return self.gd(sd); });
      exps.push({ kind: 'person', setting: 'social visit', persons: [v.pid], days: ds, note: 'saw ' + self.name(v.pid) });
      self.knowPerson(v.pid);
      rows.push(['Saw friend/relative', self.pref(v.pid), days(self, ds)]);
    });
    // delivery driver: rounds
    if (C.flags[pid] & FLAG.DELIVERY) lines.push({ k: 'q', who: this.pref(pid), x: ['I do about fifteen drops a day, all over ' + C.name + '. Parcels, mostly. I don\'t go in, just the doorstep. Sometimes they want a chat.'] });
    // travel and animals
    var x = sim.cur[pid];
    if (x >= 0 && sim.xset[x] === SET.EXTERNAL && sim.xday[x] >= win.from - 3) {
      var dd = this.gd(sim.xday[x]) + Math.floor(u(K.recall, pid, 210, 0) * 3);
      exps.push({ kind: 'travel', days: [dd], setting: 'outside the city', note: 'travel abroad' });
      lines.push({ k: 'q', who: this.pref(pid), x: [IX.pickText(this, 'travel', pid, { date: this.dateLabel(dd) })] });
      rows.push(['Travel', 'abroad', 'returned ' + this.shortDate(dd)]);
    } else if (C.flags[pid] & FLAG.TRAVELLER && u(K.recall, pid, 211, 0) < 0.4) {
      lines.push({ k: 'q', who: this.pref(pid), x: ['We were away in the summer, but not since. Does that count?'] });
    }
    if (C.flags[pid] & FLAG.ANIMAL) {
      var an = routine.filter(function (r) { return r.set === SET.ANIMAL || (r.place >= 0 && C.places[r.place].animal); })[0];
      if (an) { exps.push({ kind: 'animal', place: this.plref(an.place), days: an.sds.map(function (sd) { return self.gd(sd); }), setting: 'animals', note: 'contact with animals' }); lines.push({ k: 'q', who: this.pref(pid), x: [IX.pickText(this, 'animal', pid, { place: C.places[an.place].name })] }); }
    }
    if (C.flags[pid] & FLAG.LAB && x >= 0 && sim.xset[x] === SET.LAB && u(K.recall, pid, 212, 0) < 0.6) lines.push({ k: 'q', who: this.pref(pid), x: ['There was a spill in the containment suite about ten days before I got ill. We followed the procedure. Mostly.'] });
    if (x >= 0 && sim.xset[x] === SET.HOSP && sim.xby[x] === -1) lines.push({ k: 'q', who: this.pref(pid), x: ['We had a patient transferred in from abroad, very poorly, before any of this. I nursed him for three shifts. He went on to a specialist centre.'] });
    if (C.occ[pid] === OCC.HCW || C.occ[pid] === OCC.CARE) lines.push({ k: 'q', who: this.pref(pid), x: [IX.pickText(this, 'carer', pid, {})] });
    // people they know who were ill before them
    var ill = [], cand = {};
    kp.known.household.forEach(function (h) { cand[h] = 'household'; });
    vis.forEach(function (v) { cand[v.pid] = 'friend'; });
    routine.forEach(function (r) {
      var n = C.gStart[r.g + 1] - C.gStart[r.g];
      if (n > 30) return;
      for (var t = C.gStart[r.g]; t < C.gStart[r.g + 1]; t++) { var m = C.gMem[t]; if (m !== pid && !cand[m]) cand[m] = r.set === SET.SCHOOL ? 'classmate' : r.set === SET.CARE ? 'care home' : 'colleague'; }
    });
    Object.keys(cand).forEach(function (k) {
      var q = +k, on = self.illOnsetOf(q, win.to);
      if (on < 0 || on < win.from - 3) return;
      var knowP = cand[k] === 'household' ? 0.95 : cand[k] === 'friend' ? 0.7 : 0.35;
      if (u(K.recall, pid, 300, q) >= knowP) return;
      var od = self.gd(on) + (u(K.recall, pid, 301, q) < 0.25 ? (u(K.recall, pid, 302, q) < 0.5 ? -1 : 1) : 0);
      ill.push({ person: self.pref(q), onset: od, relation: cand[k] });
      self.knowPerson(q);
    });
    cs.illContacts = ill;
    if (ill.length) {
      lines.push({ k: 'q', who: this.pref(pid), x: [ill.length === 1 ? IX.pickText(this, 'illcontact', pid, { who: ill[0].person.d, rel: ill[0].relation, date: this.dateLabel(ill[0].onset) }) : 'A few people I know were poorly before me, now you mention it.'] });
      rows.push(['Knew someone ill', ill.map(function (i) { return i.person.d + ' (' + i.relation + ', ill from ' + self.shortDate(i.onset) + ')'; }).join('; '), '']);
    }
    cs.exposures = exps;
    cs.interviewed = true; cs.interviewDay = S.day;
    lines.push({ k: 'table', head: ['Exposure', 'Where / who', 'When'], rows: rows.map(function (r) { return [r[0], r[1], r[2]]; }) });
    if (u(K.recall, pid, 400, 0) < 0.25) lines.push({ k: 'q', who: this.pref(pid), x: [IX.pickText(this, 'aside', pid, {})] });
    var m = this.msg('interview', 'Interview: ' + this.name(pid) + ', ' + C.age[pid], 'Contact tracing team', lines);
    return { ok: true, msgs: [m] };
  };

  // ============================================================== contact tracing
  GP.inv_trace = function (pid, params) {
    var S = this.S, C = this.C, sim = this.sim, K = this.keys, self = this;
    var cs = S.cases[pid];
    if (!cs) return { ok: false, err: 'Not on the line list.' };
    var back = params && +params.daysBefore >= 0 ? Math.min(10, +params.daysBefore) : 2;
    var sdNow = this.sdOf(S.day) - 1;
    var anchor = cs.onset !== null ? this.sdOf(cs.onset) : (cs.tests.length ? this.sdOf(S.tests[cs.tests[cs.tests.length - 1]].req) : sdNow);
    var from = anchor - back, to = sdNow;
    var x = sim.cur[pid];
    if (x >= 0 && sim.xhosp[x] >= 0 && sim.xhosp[x] <= to) to = sim.xhosp[x];
    if (cs.outcome === 'died' && cs.died !== undefined) to = Math.min(to, this.sdOf(cs.died));
    var found = {}, add = function (q, sd, setting, place, sds) {
      if (q === pid) return;
      var e = found[q];
      if (!e) e = found[q] = { sd: sd, setting: setting, place: place === undefined ? -1 : place, sds: [] };
      if (sd > e.sd) { e.sd = sd; e.setting = setting; e.place = place === undefined ? -1 : place; }
      (sds || [sd]).forEach(function (d) { if (e.sds.indexOf(d) < 0) e.sds.push(d); });
    };
    // household
    var allDays = []; for (var dd0 = from; dd0 <= to; dd0++) allDays.push(dd0);
    for (var a = C.hStart[C.hh[pid]]; a < C.hStart[C.hh[pid] + 1]; a++) add(C.hMem[a], to, 'household', -1, allDays);
    // friends seen
    this.visitsIn(pid, from, to).forEach(function (v) { if (u(K.follow, pid, 10, v.pid) < 0.9) add(v.pid, v.sds[v.sds.length - 1], 'social visit', -1, v.sds); });
    // groups
    var unnamed = [];
    this.routineIn(pid, from, to).forEach(function (r) {
      var n = C.gStart[r.g + 1] - C.gStart[r.g], last = r.sds[r.sds.length - 1];
      var pl = r.place >= 0 ? C.places[r.place] : null;
      var listed = r.place >= 0 && S.siteLists[r.place] && ['market', 'supermarket', 'station', 'stadium', 'shop', 'hospital'].indexOf(C.places[r.place].kind) < 0 && r.set !== SET.SHOP && r.set !== SET.MARKET;
      if (r.set === SET.SCHOOL || r.set === SET.NURSERY || (n <= 16 && (r.set === SET.WORK || r.set === SET.CARE || r.set === SET.HOSP || r.set === SET.LAB || r.set === SET.ANIMAL)) || r.set === SET.EVENT && n <= 40) {
        var pFind = r.set === SET.SCHOOL || r.set === SET.NURSERY ? 0.95 : r.set === SET.EVENT ? 0.6 : 0.75;
        for (var t = C.gStart[r.g]; t < C.gStart[r.g + 1]; t++) {
          var q = C.gMem[t];
          if (u(K.follow, pid, 20 + r.g, q) >= pFind) continue;
          var both = r.sds.filter(function (sd) { return self.wasAt(q, r.g, sd, C.gMask[t]); });
          if (both.length) add(q, both[both.length - 1], IX.SET_NAMES[r.set], r.place, both);
        }
      } else if (listed) {
        // venue attendance lists from a site visit: people there on the same days
        for (var t2 = C.gStart[r.g]; t2 < C.gStart[r.g + 1]; t2++) {
          var q2 = C.gMem[t2];
          var both2 = r.sds.filter(function (sd) { return sd >= listed.from && self.wasAt(q2, r.g, sd, C.gMask[t2]); });
          if (both2.length && u(K.follow, pid, 30 + r.g, q2) < 0.7) add(q2, both2[both2.length - 1], IX.SET_NAMES[r.set], r.place, both2);
        }
      } else if (r.set !== SET.SHOP && r.set !== SET.TRANSPORT) {
        // named companions only; the rest need an attendance list
        for (var f = C.fStart[pid]; f < C.fStart[pid + 1]; f++) {
          var fr = C.fList[f];
          for (var t3 = C.gStart[r.g]; t3 < C.gStart[r.g + 1]; t3++) if (C.gMem[t3] === fr) { var both3 = r.sds.filter(function (sd) { return self.wasAt(fr, r.g, sd, C.gMask[t3]); }); if (both3.length) add(fr, both3[both3.length - 1], IX.SET_NAMES[r.set], r.place, both3); }
        }
        if (pl) unnamed.push({ place: r.place, days: r.sds.map(function (sd) { return self.gd(sd); }), n: n });
      }
    });
    var list = Object.keys(found).map(Number);
    cs.traced = true; cs.traceDay = S.day; cs.traceBack = back;
    cs.contacts = (cs.contacts || []).concat(list.filter(function (q) { return (cs.contacts || []).indexOf(q) < 0; }));
    var quar = this.orderActive('quarantine');
    var rows = [];
    list.forEach(function (q) {
      var e = found[q];
      var c = S.contacts[q];
      if (!c) c = S.contacts[q] = { of: [], exposure: self.gd(e.sd), setting: e.setting, place: e.place, followUntil: self.gd(e.sd) + 14, status: 'monitoring', days: {} };
      if (c.of.indexOf(pid) < 0) c.of.push(pid);
      if (!c.days) c.days = {};
      c.days[pid] = e.sds.sort(function (x1, x2) { return x1 - x2; }).map(function (sd) { return self.gd(sd); });
      if (self.gd(e.sd) > c.exposure) { c.exposure = self.gd(e.sd); c.followUntil = c.exposure + 14; if (c.status === 'well') c.status = 'monitoring'; }
      self.knowPerson(q);
      sim.quarUntil[q] = Math.max(sim.quarUntil[q], e.sd + 10);
      if (S.quarList.indexOf(q) < 0) S.quarList.push(q);
      // already ill at the first call?
      var on = self.illOnsetOf(q, sdNow);
      var st = on >= 0 && on >= sdNow - 14 ? 'ill since ' + self.shortDate(self.gd(on)) : 'well';
      rows.push([self.pref(q), String(C.age[q]), e.setting, e.place >= 0 ? self.plref(e.place) : '', self.shortDate(self.gd(e.sd)), st]);
    });
    var lines = [{ k: 'n', x: ['Window: ' + back + ' days before ' + (cs.onset !== null ? 'onset' : 'the test') + ' (' + this.shortDate(this.gd(from)) + ') to ' + this.shortDate(this.gd(to)) + '. ' + list.length + ' contacts identified' + (quar ? '; all asked to quarantine for 10 days from their last exposure.' : '; no quarantine order is in force, so they have been given advice only.')] }];
    if (rows.length) lines.push({ k: 'table', head: ['Contact', 'Age', 'Setting', 'Place', 'Last exposure', 'Now'], rows: rows });
    unnamed.forEach(function (un) { lines.push({ k: 'n', x: ['Also at ', self.plref(un.place), ' on ' + un.days.map(function (d) { return self.shortDate(d); }).join(', ') + ': other people there could not be named without an attendance list (site visit).'] }); });
    lines.push({ k: 'n', x: ['Tracers will call each contact daily until 14 days after exposure and report anyone who falls ill.'] });
    if (params && params.quiet) return { ok: true, msgs: [], found: list.length };
    var m = this.msg('result', 'Contact tracing: ' + this.name(pid) + ' (' + list.length + ' contacts)', 'Contact tracing team', lines);
    return { ok: true, msgs: [m], found: list.length };
  };

  // ============================================================== household study
  GP.inv_household = function (pid) {
    var S = this.S, C = this.C, self = this;
    var cs = S.cases[pid];
    if (!cs) return { ok: false, err: 'Not on the line list.' };
    var mem = [];
    for (var a = C.hStart[C.hh[pid]]; a < C.hStart[C.hh[pid] + 1]; a++) if (C.hMem[a] !== pid) mem.push(C.hMem[a]);
    if (!mem.length) return { ok: false, err: 'Lives alone.' };
    cs.household = true;
    var study = { id: S.hhStudies.length, index: pid, members: mem, start: S.day, tests: {} };
    S.hhStudies.push(study);
    mem.forEach(function (q) { self.knowPerson(q); study.tests[q] = [self.requestTest(q, S.recognized ? 'pcr' : 'panel', 1, 'household study').id]; });
    this.schedule('hh', S.day + 7, { study: study.id, round: 1 });
    this.schedule('hh', S.day + 14, { study: study.id, round: 2 });
    this.schedule('hh', S.day + 21, { study: study.id, round: 3 });
    var m = this.msg('result', 'Household study started: ' + this.name(pid), 'Field epidemiology team', [
      ['Everyone in the household at ' + C.hAddr[C.hh[pid]] + ' is being swabbed today, again at day 7 and day 14, with an antibody test at day 21 and a symptom diary throughout. ', mem.length + ' people: ', mem.map(function (q) { return self.name(q) + ' (' + C.age[q] + ')'; }).join(', '), '.'],
      { k: 'n', x: ['The final report arrives on ' + this.dateLabel(S.day + 21) + '. It tells you who was infected, and who was infected without ever feeling ill.'] }]);
    return { ok: true, msgs: [m] };
  };
  GP.job_hh = function (d, sd) {
    var S = this.S, C = this.C, self = this, st = S.hhStudies[d.study];
    if (d.round === 1 || d.round === 2) {
      st.members.forEach(function (q) { st.tests[q].push(self.requestTest(q, S.recognized ? 'pcr' : 'panel', 1, 'household study').id); });
      return;
    }
    // round 3: antibody test and the final report (the antibody result is read in a day)
    var rows = [], nPos = 0, nAsym = 0, nSym = 0;
    st.members.forEach(function (q) {
      var tl = st.tests[q].map(function (id) { return S.tests[id]; });
      var pcr = tl.map(function (t) { return t.result === 'pending' ? '…' : t.kind === 'panel' ? (t.result === 'neg' ? '−' : t.result) : t.result === 'pos' ? '+' : '−'; });
      var sero = self.testResult(q, sd, 'sero', 777);
      var on = self.illOnsetOf(q, sd), symptomatic = on >= self.sdOf(st.start) - 14 && on >= 0;
      var novelOn = (function () { var x = self.infBy(q, sd); return x >= 0 && self.sim.xonset[x] >= 0 && self.sim.xonset[x] <= sd; })();
      var anyPos = tl.some(function (t) { return t.result === 'pos'; }) || (S.recognized && sero === 'pos');
      var cls = anyPos ? (symptomatic && novelOn ? 'infected, ill' : symptomatic ? 'infected; ill (other cause?)' : 'infected, never ill') : symptomatic ? 'not infected; ill (other cause)' : 'not infected';
      if (anyPos) { nPos++; if (/never ill/.test(cls)) nAsym++; else nSym++; }
      rows.push([self.pref(q), String(C.age[q]), pcr.join(' '), S.recognized ? (sero === 'pos' ? '+' : '−') : 'n/a', symptomatic ? 'from ' + self.shortDate(self.gd(on)) : 'none', cls]);
      if (anyPos) {
        var cs = self.addCase(q, 'household', 'confirmed'); cs.epiLinked = true;
        if (!symptomatic) { cs.onset = null; if (cs.outcome === 'unknown' || cs.outcome === 'unwell') cs.outcome = 'well'; cs.asymConfirmed = true; }
        if (cs.infectorGuess === undefined) cs.infectorGuess = st.index;
      }
    });
    st.done = S.day + 1;
    // serial intervals from the household's first case; co-primary cases (ill within a day of it) are excluded
    var ons = [], sis = [];
    [st.index].concat(st.members).forEach(function (q) { var cq = S.cases[q]; if (cq && cq.status === 'confirmed' && cq.onset !== null && !cq.asymConfirmed) ons.push(cq.onset); });
    ons.sort(function (a, b) { return a - b; });
    for (var oi = 1; oi < ons.length; oi++) if (ons[oi] - ons[0] >= 2) sis.push(ons[oi] - ons[0]);
    st.result = { members: st.members.length, infected: nPos, asym: nAsym, sym: nSym, si: sis };
    this.msg('result', 'Household study: ' + this.name(st.index) + ' — ' + nPos + ' of ' + st.members.length + ' infected, ' + nAsym + ' never ill', 'Field epidemiology team', [
      { k: 'table', head: ['Member', 'Age', 'PCR d0 d7 d14', 'Antibodies d21', 'Symptoms', 'Classification'], rows: rows },
      { k: 'n', x: ['Index case: ', this.pref(st.index), '. "Never ill" means no symptoms in the diary at any point in 21 days.'] }], { day: S.day + 1 });
  };

  // ============================================================== site visit
  GP.co2 = function (p) { return p.indoor ? Math.round((420 + 2400 / Math.pow(p.ach, 0.8)) / 10) * 10 : 450; };
  GP.inv_site_visit = function (pi) {
    var S = this.S, C = this.C, self = this, p = C.places[pi];
    if (!p) return { ok: false, err: 'Unknown place.' };
    var sdNow = this.sdOf(S.day) - 1, from = sdNow - 13;
    var att = {};
    var gs = C.placeGroups[pi];
    if (p.kind === 'choir' && p.host !== undefined) gs = gs.concat([]);
    gs.forEach(function (g) {
      for (var t = C.gStart[g]; t < C.gStart[g + 1]; t++) {
        var q = C.gMem[t];
        for (var sd = from; sd <= sdNow; sd++) if (self.wasAt(q, g, sd, C.gMask[t])) (att[q] = att[q] || []).push(self.gd(sd));
      }
    });
    var ppl = Object.keys(att).map(Number);
    S.siteLists[pi] = { from: from, day: S.day };
    ppl.forEach(function (q) { var kp = self.knowPerson(q); kp.seenAt = kp.seenAt || {}; kp.seenAt[pi] = att[q]; });
    var co2 = this.co2(p);
    var lines = [];
    lines.push(IX.pickText(this, 'site_' + (IX.SITE_KINDS[p.kind] || 'generic'), pi, { place: p.name }));
    lines.push({ k: 'm', x: [p.indoor ? 'CO2 (peak, occupied): ' + IX.fmt(co2) + ' ppm' + (co2 >= 1500 ? '  — poor: people are breathing each other\'s air' : co2 >= 1000 ? '  — mediocre' : '  — good') : 'Mostly outdoors.'] });
    lines.push({ k: 'm', x: ['Estimated air changes per hour: ' + (p.indoor ? p.ach : 'n/a (outdoors)') + '. ' + ppl.length + ' different people here in the last 14 days.'] });
    // food businesses: hygiene and ill staff
    if (p.food) {
      var sick = [];
      gs.forEach(function (g) { if (C.gSet[g] !== SET.WORK) return; for (var t = C.gStart[g]; t < C.gStart[g + 1]; t++) { var q = C.gMem[t]; if (!(C.flags[q] & FLAG.FOOD)) continue; var on = self.illOnsetOf(q, sdNow); if (on >= from - 7) sick.push({ q: q, on: on }); } });
      var rating = 1 + (IX.h3(this.keys.misc, pi, 5, 0) % 5);
      lines.push({ k: 'm', x: ['Food hygiene rating: ' + rating + ' of 5.'] });
      sick.forEach(function (s) { lines.push({ k: 'q', who: self.pref(s.q), x: ['I was a bit poorly around ' + self.dateLabel(self.gd(s.on)) + '. ' + (u(self.keys.recall, s.q, 5, 0) < 0.6 ? 'I kept working. You can\'t not, can you, on my hours.' : 'I stayed home a couple of days.')] }); self.knowPerson(s.q); });
    }
    if (p.animal) lines.push({ k: 'p', x: ['Animals on site: ', p.kind === 'market' ? 'poultry, sheep and pigs through the sale ring twice a week; handlers use no gloves or masks.' : p.kind === 'meat_plant' ? 'livestock arrive daily; the kill floor and cutting rooms are cold and loud, and workers stand shoulder to shoulder.' : 'sheds of poultry/pigs; a few staff also work the livestock market.'] });
    lines.push({ k: 'n', x: ['Attendance lists for the last 14 days obtained: ' + ppl.length + ' people. Tracing contacts of cases who were here can now name them.'] });
    var casesHere = ppl.filter(function (q) { return S.cases[q] && S.cases[q].status !== 'discarded'; });
    if (casesHere.length) lines.push({ k: 'p', x: ['Known cases on the list: '].concat(joinRefs(this, casesHere)) });
    var rows = ppl.slice(0, 120).map(function (q) { return [self.pref(q), String(C.age[q]), att[q].length > 3 ? att[q].length + ' days' : att[q].map(function (d) { return self.shortDate(d); }).join(', ')]; });
    lines.push({ k: 'table', head: ['Name', 'Age', 'Days present'], rows: rows });
    if (ppl.length > 120) lines.push({ k: 'n', x: [(ppl.length - 120) + ' more names on file.'] });
    S.siteVisits[pi] = S.day;
    var m = this.msg('result', 'Site visit: ' + p.name, 'Field epidemiology team', lines);
    return { ok: true, msgs: [m] };
  };
  function joinRefs(g, pids) { var out = []; pids.forEach(function (q, i) { if (i) out.push(', '); out.push(g.pref(q)); }); return out; }
  IX.QCAT = { close: 'Close contact (<2 m, 15 min+) with someone who fell ill', near: 'Same room, within a few metres of someone who fell ill', far: 'Same room or venue, well away from anyone who fell ill', ate: 'Ate food prepared on site', nate: 'Did not eat' };
  IX.SITE_KINDS = { choir: 'choir', pub: 'pub', restaurant: 'restaurant', school: 'school', nursery: 'nursery', care_home: 'care', hospital: 'hospital', church: 'faith', mosque: 'faith', temple: 'faith', gurdwara: 'faith',
    gym: 'gym', meat_plant: 'meat', factory: 'work', office: 'work', market: 'market', farm: 'farm', hotel: 'hall', community_hall: 'hall', stadium: 'stadium', supermarket: 'shop', lab: 'lab', university: 'uni', gp: 'gp', station: 'shop' };

  // ============================================================== questionnaire (cluster attack rates)
  GP.inv_questionnaire = function (pi) {
    var S = this.S, C = this.C, p = C.places[pi];
    if (!p) return { ok: false, err: 'Unknown place.' };
    this.schedule('quest', S.day + 2, { place: pi, asked: S.day });
    var m = this.msg('result', 'Questionnaire sent: ' + p.name, 'Epidemiology analysts', [['A short exposure questionnaire has gone to everyone who was at ', this.plref(pi), ' around the time of the cluster: where they sat or stood, what they did, what they ate, and whether they have been ill. Analysis in two days.']]);
    return { ok: true, msgs: [m] };
  };
  GP.job_quest = function (d, sdNowPlus) {
    var S = this.S, C = this.C, sim = this.sim, self = this, K = this.keys, pi = d.place, p = C.places[pi];
    var sdEnd = this.sdOf(d.asked) - 1;
    // key day: the day with the most infections at this place in the last 28 days (the event the cluster came from)
    var byDay = {};
    for (var x = 0; x < sim.n; x++) if (sim.xplace[x] === pi && sim.xday[x] <= sdEnd && sim.xday[x] >= sdEnd - 28 && (sim.xset[x] !== SET.WORK || p.kind === 'meat_plant' || p.kind === 'factory' || p.kind === 'office')) byDay[sim.xday[x]] = (byDay[sim.xday[x]] || 0) + 1;
    var key = -1, bestN = 0;
    // the event is the day most known cases were there (from interviews and attendance lists)
    var kd = {};
    S.caseOrder.forEach(function (q) {
      var cs = S.cases[q]; if (cs.status === 'discarded') return;
      (cs.exposures || []).forEach(function (e) { if (e.kind === 'place' && e.place && self.placeIdx(e.place.id) === pi) e.days.forEach(function (d0) { var sd0 = self.sdOf(d0); if (sd0 <= sdEnd && sd0 >= sdEnd - 28) kd[sd0] = (kd[sd0] || 0) + 1; }); });
      var kp = S.people[q]; if (kp && kp.seenAt && kp.seenAt[pi]) kp.seenAt[pi].forEach(function (d0) { var sd0 = self.sdOf(d0); if (sd0 <= sdEnd && sd0 >= sdEnd - 28) kd[sd0] = (kd[sd0] || 0) + 1; });
    });
    Object.keys(kd).forEach(function (k) { if (kd[k] > bestN || (kd[k] === bestN && +k < key)) { bestN = kd[k]; key = +k; } });
    if (bestN < 2) { key = -1; bestN = 0; Object.keys(byDay).forEach(function (k) { if (byDay[k] > bestN) { bestN = byDay[k]; key = +k; } }); }
    if (key < 0) {
      // no cluster here: use the most recent day a known case attended
      key = sdEnd - 7;
    }
    // attendees that day
    var att = [];
    C.placeGroups[pi].forEach(function (g) { for (var t = C.gStart[g]; t < C.gStart[g + 1]; t++) { var q = C.gMem[t]; if (att.indexOf(q) < 0 && self.wasAt(q, g, key, C.gMask[t])) att.push(q); } });
    var resp = att.filter(function (q) { return u(K.quest, q, pi, 0) < 0.8; });
    var food = p.food && (this.P.family === 'gut');
    var outdoorable = p.kind === 'pub' || p.kind === 'stadium' || p.kind === 'market';
    var cats = {};
    function addCat(label, ill) { var c = cats[label] = cats[label] || { n: 0, ill: 0 }; c.n++; if (ill) c.ill++; }
    var illList = [];
    var nIllTrue = 0;
    resp.forEach(function (q) {
      var x = self.infBy(q, key + 14);
      var infectedHere = x >= 0 && sim.xday[x] === key && sim.xplace[x] === pi;
      var on = self.illOnsetOf(q, Math.min(sdEnd + 2, key + 21));
      var ill = on > key && on <= key + 21;
      if (ill) illList.push(q);
      if (infectedHere) nIllTrue++;
      var mode = infectedHere ? sim.xmode[x] : -1;
      // how close were they to someone who fell ill
      var r0 = u(K.quest, q, pi, 1);
      var dist = mode === 0 ? 'close' : mode === 1 ? (r0 < 0.15 ? 'close' : r0 < 0.6 ? 'near' : 'far') : (r0 < 0.2 ? 'close' : r0 < 0.55 ? 'near' : 'far');
      addCat(IX.QCAT[dist], ill);
      if (food) { var ate = mode === 2 ? true : u(K.quest, q, pi, 3) < 0.65; addCat(ate ? IX.QCAT.ate : IX.QCAT.nate, ill); }
      if (outdoorable) { var outside = mode === 1 || mode === 0 ? u(K.quest, q, pi, 4) < 0.08 : u(K.quest, q, pi, 5) < 0.3; addCat(outside ? 'Mostly outdoors' : 'Mostly indoors', ill); }
      if (p.kind === 'choir' || p.kind === 'church' || p.kind === 'mosque') { var act = p.kind === 'choir' ? (mode >= 0 ? u(K.quest, q, pi, 6) < 0.95 : u(K.quest, q, pi, 7) < 0.85) : u(K.quest, q, pi, 8) < 0.5; addCat(p.kind === 'choir' ? (act ? 'Sang' : 'Accompanist / listener') : (act ? 'Stayed for refreshments afterwards' : 'Left straight after'), ill); }
    });
    var rows = Object.keys(cats).map(function (k) { var c = cats[k]; return [k, String(c.n), String(c.ill), c.n ? Math.round(100 * c.ill / c.n) + '%' : '–']; });
    // the onset curve of a point-source event: days from the event to illness
    var onsetRel = illList.map(function (q) { var on = self.illOnsetOf(q, Math.min(sdEnd + 2, key + 21)); var e = u(K.recall, q, 60, 0), err = e < 0.75 ? 0 : e < 0.88 ? -1 : 1; return on - key + err; }).filter(function (v) { return v >= 0; });
    var hist = {}; onsetRel.forEach(function (v) { hist[v] = (hist[v] || 0) + 1; });
    var tot = resp.length, nIll = illList.length;
    // ill respondents join the line list
    illList.forEach(function (q) { if (!S.cases[q]) { var cs = self.addCase(q, 'questionnaire', S.recognized ? 'probable' : 'suspected'); cs.epiLinked = true; } });
    var lines = [
      ['Event studied: ', this.plref(pi), ' on ' + this.dateLong(this.gd(key)) + '. ' + att.length + ' people present, ' + tot + ' responded (' + Math.round(100 * tot / Math.max(1, att.length)) + '%). ' + nIll + ' reported illness starting within three weeks.'],
      { k: 'table', head: ['Exposure', 'Respondents', 'Ill', 'Attack rate'], rows: rows },
      onsetRel.length ? { k: 'm', x: ['Illness began (days after the event): ' + Object.keys(hist).map(Number).sort(function (a, b) { return a - b; }).map(function (d2) { return '+' + d2 + ': ' + hist[d2]; }).join('  ')] } : '',
      { k: 'n', x: ['Ill respondents who were not already known have been added to the line list. Some illness will be ordinary winter bugs.'] }
    ];
    S.quests.push({ place: pi, kind: p.kind, day: this.gd(key), resp: tot, ill: nIll, cats: cats, onsets: onsetRel });
    this.msg('result', 'Questionnaire results: ' + p.name + ' (' + nIll + ' of ' + tot + ' ill)', 'Epidemiology analysts', lines, { day: S.day + 1 });
  };

  // ============================================================== hospital record review
  GP.inv_record_review = function () {
    var S = this.S, C = this.C, sim = this.sim, self = this, K = this.keys;
    var sdNow = this.sdOf(S.day) - 1;
    var found = [], rows = [], byAge = [0, 0, 0, 0, 0, 0, 0], icu = [0, 0, 0, 0, 0, 0, 0], died = [0, 0, 0, 0, 0, 0, 0], symCount = {}, nAdm = 0;
    var earliest = null, noso = 0;
    for (var x = 0; x < sim.n; x++) {
      var h = sim.xhosp[x];
      if (h < 0 || h > sdNow || (sim.xflags[x] & XFL.CAREDEATH)) continue;
      var pid = sim.xwho[x];
      var compatible = u(K.flag, pid, 60, 0) < 0.85;   // notes good enough to recognise it
      if (!compatible) continue;
      nAdm++;
      var b = D.ageBand(C.age[pid]); byAge[b]++;
      if (sim.xicu[x] >= 0 && sim.xicu[x] <= sdNow) icu[b]++;
      if (sim.xdeath[x] >= 0 && sim.xdeath[x] <= sdNow) died[b]++;
      self.symList(sim.xsym[x]).forEach(function (s) { symCount[s] = (symCount[s] || 0) + 1; });
      if (earliest === null || h < earliest.h) earliest = { h: h, pid: pid };
      if (sim.xset[x] === SET.PATIENT) noso++;
      if (!S.cases[pid]) { found.push(pid); var cs = self.addCase(pid, 'review', S.recognized ? 'probable' : 'suspected'); cs.admitted = self.gd(h); S.hospSamples[pid] = h; }
    }
    // false positives: flu-negative pneumonia in the notes
    var fp = 0;
    Object.keys(S.bgIli).forEach(function (k) { var r = S.bgIli[k]; if (r.hosp && r.kind === 'other' && r.onset >= sdNow - 30 && !S.cases[r.pid] && u(K.flag, r.pid, 61, 0) < 0.4) { fp++; self.addCase(r.pid, 'review', 'suspected'); } });
    var lines = [];
    lines.push(['Records of ' + nAdm + ' admissions compatible with the illness were reviewed at ', this.plref(C.hospital), '.' + (found.length ? ' ' + (found.length + fp) + ' patients not previously reported have been added to the line list' + (fp ? ' (some will turn out to be something else)' : '') + '.' : '')]);
    rows = D.AGE_BANDS.map(function (bd, i) { return [bd, String(byAge[i]), String(icu[i]), String(died[i])]; });
    lines.push({ k: 'table', head: ['Age', 'Admitted', 'Intensive care', 'Died'], rows: rows });
    var symRows = Object.keys(symCount).sort(function (a, b) { return symCount[b] - symCount[a]; }).map(function (s) { return [D.SYM[s].label, Math.round(100 * symCount[s] / nAdm) + '%']; });
    if (symRows.length) lines.push({ k: 'table', head: ['Symptom on admission', 'Share'], rows: symRows });
    if (earliest) lines.push(['The earliest compatible admission was ', this.pref(earliest.pid), ' on ' + this.dateLong(this.gd(earliest.h)) + '.']);
    if (noso) lines.push(noso + ' of these patients were already in hospital for something else when they fell ill (infected on the ward).');
    var m = this.msg('result', 'Hospital record review: ' + nAdm + ' compatible admissions', 'Epidemiology analysts', lines);
    S.reviews.push({ day: S.day, byAge: byAge, icu: icu, died: died, n: nAdm });
    return { ok: true, msgs: [m] };
  };

  // ============================================================== animal / environmental sampling
  GP.inv_animal_sampling = function (pi) {
    var S = this.S, p = this.C.places[pi];
    if (!p || !(p.animal || p.kind === 'market' || p.kind === 'farm' || p.kind === 'meat_plant')) return { ok: false, err: 'Not an animal site.' };
    this.schedule('animal', S.day + 3, { place: pi, asked: S.day });
    return { ok: true, msgs: [this.msg('result', 'Animal sampling: ' + p.name, 'Field epidemiology team, with the animal health agency', [['Swabs from animals, pens and surfaces at ', this.plref(pi), ' have gone to the lab. Results in three days.']])] };
  };
  GP.job_animal = function (d, sd) {
    var S = this.S, sim = this.sim, P = this.P, K = this.keys, pi = d.place, p = this.C.places[pi];
    var positive = false, n = 20, k = 0;
    var reservoir = (P.route === 'animal' && sim.spillSite === pi) || ((P.source === 'market' || P.source === 'farm') && sim.sourcePlace === pi);
    if (reservoir && S.recognized) { var rate = P.route === 'animal' ? 0.3 : 0.1; for (var i = 0; i < n; i++) if (u(K.misc, pi, d.asked, i) < rate) k++; positive = k > 0; }
    var lines = [];
    if (!S.recognized) lines.push('No known pathogens of concern. Samples are stored; without a specific test for the new agent there is nothing more to look for.');
    else if (positive) lines.push([S.agentName + ' detected in ' + k + ' of ' + n + ' swabs from ', this.plref(pi), '. ' + (P.route === 'animal' ? 'The animals are still carrying it.' : 'A few animals still carry it at low levels.')]);
    else lines.push(['All ' + n + ' swabs from ', this.plref(pi), ' negative for ' + S.agentName + '.']);
    S.animalTests.push({ place: pi, day: S.day + 1, pos: k, n: n, valid: S.recognized });
    if (positive && S.recognized && P.route === 'animal') S.animalFound = pi;
    this.msg('lab', 'Animal sampling result: ' + p.name + (positive ? ' — POSITIVE' : ''), 'Animal health laboratory', lines, { day: S.day + 1, urgent: positive });
  };

  // ============================================================== sequencing
  GP.sampleOf = function (pid) {
    var S = this.S, cs = S.cases[pid];
    if (cs && cs.sample) return cs.sample;
    if (S.hospSamples[pid] !== undefined) {
      var sid = 'H' + pid;
      if (!S.samples[sid]) S.samples[sid] = { id: sid, pid: pid, day: this.gd(S.hospSamples[pid]), kind: 'hospital' };
      return sid;
    }
    return null;
  };
  GP.inv_sequence = function (pid) {
    var S = this.S, sim = this.sim, K = this.keys;
    if (!S.recognized) return { ok: false, err: 'Nothing to sequence against yet: the lab has not identified the agent.' };
    var sid = this.sampleOf(pid);
    if (!sid) return { ok: false, err: 'No stored sample for this person. Test them first.' };
    if (S.seqs[sid]) return { ok: false, err: 'Already sequenced.' };
    var smp = S.samples[sid], sdS = this.sdOf(smp.day);
    var x = this.infBy(pid, sdS);
    var ok = x >= 0;
    if (ok) {
      var on = sim.xonset[x] >= 0 ? sim.xonset[x] : sim.xpseudo[x];
      var rel = sdS - on, pf = rel > this.P.detTo - 2 ? 0.35 : 0.05;
      if (u(K.seq, pid, sdS, 1) < pf) ok = false;
    }
    var due = S.day + 3 + Math.floor(u(K.seq, pid, sdS, 2) * 3);
    S.seqs[sid] = { id: sid, pid: pid, day: smp.day, asked: S.day, due: due, done: false, ok: ok, x: x };
    var cs = S.cases[pid]; if (cs) cs.seqId = sid;
    this.schedule('seq', due - 1, { sid: sid });
    return { ok: true, msgs: [this.msg('lab', 'Sample ' + sid + ' (' + this.name(pid) + ') queued for sequencing', 'Genomics unit', ['Whole-genome sequencing. Expect a result by ' + this.dateLabel(due) + '.'])] };
  };
  GP.job_seq = function (d, sd) {
    var S = this.S, sim = this.sim, q = S.seqs[d.sid];
    q.done = true;
    if (!q.ok) {
      this.msg('lab', 'Sequencing failed: ' + q.id + ' (' + this.name(q.pid) + ')', 'Genomics unit', ['Too little viral material in the sample for a full genome' + (q.x < 0 ? ' — or none at all' : '') + '. An earlier sample in the illness works better.'], { day: S.day + 1 });
      return;
    }
    q.genome = sim.genome(q.x);
    q.lineage = sim.xvr[q.x] ? 'B' : 'A';
    var labels = q.genome.map(function (m) { return sim.mutLabel(m); });
    this.msg('lab', 'Genome: ' + q.id + ' (' + this.name(q.pid) + ')' + (q.lineage === 'B' ? ' — new lineage B' : ''), 'Genomics unit', [
      ['Sample from ', this.pref(q.pid), ' taken ' + this.shortDate(q.day) + ': ' + labels.length + ' mutation' + (labels.length === 1 ? '' : 's') + ' relative to the reference genome.'],
      { k: 'm', x: [labels.length ? labels.join('  ') : '(identical to the reference)'] },
      { k: 'n', x: ['Added to the tree on the LAB screen.' + (q.lineage === 'B' ? ' This genome carries a cluster of changes in the region that binds to our cells. Watch how fast this branch grows.' : '')] }], { day: S.day + 1, urgent: q.lineage === 'B' && !S.variantSeen });
    if (q.lineage === 'B') S.variantSeen = S.variantSeen || S.day + 1;
  };

  // ============================================================== declare a novel agent (end of act 1)
  GP.inv_declare_novel = function () {
    var S = this.S, sim = this.sim, self = this;
    if (S.recognized || S.declared) return { ok: false, err: S.recognized ? 'Already confirmed.' : 'The lab is already working on it.' };
    var negs = [];
    S.caseOrder.forEach(function (pid) {
      var cs = S.cases[pid];
      if (cs.tests.some(function (id) { var t = S.tests[id]; return t.kind === 'panel' && t.result === 'neg'; })) negs.push(pid);
    });
    if (negs.length < 3) return { ok: false, err: 'The lab wants panel-negative samples from at least three ill people before it will run metagenomic sequencing (you have ' + negs.length + ').' };
    var truly = negs.filter(function (pid) { return self.infBy(pid, self.sdOf(S.day)) >= 0; });
    S.declared = { day: S.day, negs: negs, truly: truly.length };
    this.schedule('confirm', S.day + 2, {});
    return { ok: true, msgs: [this.msg('lab', 'Metagenomic sequencing requested', 'Public Health Laboratory', ['You have asked the lab to look for something new in ' + negs.length + ' panel-negative samples. They will sequence everything in them and see what is left over. Two days.', { k: 'n', x: ['If it comes back empty-handed, the director of the lab will remember.'] }])] };
  };
  GP.job_confirm = function () {
    var S = this.S, sim = this.sim, self = this;
    var d = S.declared;
    if (d.truly < 2) {
      S.declared = null;
      S.declareFails = (S.declareFails || 0) + 1;
      this.credit(-8, 'false alarm');
      this.msg('lab', 'Metagenomics: nothing new found', 'Public Health Laboratory', ['Deep sequencing of the samples found rhinovirus in one and nothing of note in the others. The lab\'s view is that this is winter doing what winter does.', { k: 'n', x: ['Your credibility with the lab has taken a knock. If you still think something is out there, get cleaner samples: severe cases, linked to each other, tested early.'] }], { day: S.day + 1, urgent: true });
      return;
    }
    S.recognized = true; S.recognizedDay = S.day + 1;
    S.agentName = 'Agent ' + this.agentCode();
    // the discovery genome becomes the reference; stored samples are re-tested with the new PCR
    var first = d.negs.filter(function (pid) { return self.infBy(pid, self.sdOf(d.day)) >= 0; })[0];
    S.refPid = first;
    S.caseOrder.forEach(function (pid) {
      var cs = S.cases[pid];
      if (cs.status === 'discarded') return;
      var sid = self.sampleOf(pid);
      if (sid || cs.tests.length) {
        var t = self.requestTest(pid, 'pcr', 0, 'stored sample re-tested');
      }
    });
    S.testsCap = Math.max(S.testsCap, this.grades().pcrStart);
    S.caseDef = null;
    this.msg('lab', 'Novel agent confirmed: ' + S.agentName, 'Public Health Laboratory', [
      { k: 'h', x: ['A new virus'] },
      'Metagenomic sequencing of the samples found the same previously unknown ' + (this.P.family === 'gut' ? 'enteric virus' : this.P.family === 'contact' ? 'virus, from a family better known for haemorrhagic fevers,' : 'respiratory virus') + ' in ' + d.truly + ' of ' + d.negs.length + ' samples. It has been designated ' + S.agentName + '.',
      'A specific PCR test is available from today: ' + S.testsCap + ' tests a day to start with, rising as the lab scales up. Every stored sample from the line list is being re-tested overnight.',
      { k: 'n', x: ['Act 2 begins. Nobody knows how it spreads, how long it hides, or whom it kills. Work it out.'] }], { day: S.day + 1, urgent: true, meta: { act: 2 } });
    S.actQueued = 2;
  };
  GP.agentCode = function () {
    var S = this.S, C = this.C, p = S.alert ? C.places[S.alert.place] : null;
    var nm = p ? p.name.replace(/^(The|St|Our)\s+/, '') : C.name;
    var letters = nm.replace(/[^A-Za-z ]/g, '').split(/\s+/).filter(Boolean);
    var code = letters.length >= 2 ? (letters[0][0] + letters[1][0]).toUpperCase() : nm.slice(0, 2).toUpperCase();
    if (p && p.kind === 'hospital') code = 'SA';
    return code + '-' + (1 + IX.h3(this.keys.misc, 9, 9, 9) % 9);
  };

  // ============================================================== serosurvey
  GP.inv_serosurvey = function (params) {
    var S = this.S, n = Math.max(50, Math.min(1000, +(params && params.n) || 300));
    if (!S.recognized) return { ok: false, err: 'No antibody test exists until the agent is identified.' };
    if (S.day < S.recognizedDay + 10) return { ok: false, err: 'The antibody assay is still being validated (ready ' + this.dateLabel(S.recognizedDay + 10) + ').' };
    this.schedule('sero', S.day + 4, { n: n, asked: S.day });
    return { ok: true, msgs: [this.msg('result', 'Serosurvey: ' + n + ' residents', 'Field epidemiology team', ['A random sample of ' + n + ' residents, drawn from GP lists, is being invited for an antibody test. Results in four days.'])] };
  };
  GP.job_sero = function (d, sd) {
    var S = this.S, C = this.C, K = this.keys, self = this;
    var n = d.n, pos = 0, got = 0, byAge = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
    for (var t = 0; got < n && t < n * 3; t++) {
      var q = Math.floor(u(K.sero, d.asked, t, 0) * C.N);
      if (this.sim.st[q] === ST.D) continue;
      if (u(K.sero, d.asked, t, 1) > 0.75) continue;   // non-response
      got++;
      var r = this.testResult(q, sd, 'sero', 500 + t) === 'pos';
      if (r) pos++;
      var b = D.ageBand(C.age[q]); byAge[b][0]++; if (r) byAge[b][1]++;
    }
    var ci = IX.wilson(pos, got);
    S.seroResults.push({ day: S.day + 1, n: got, pos: pos, lo: ci[0], hi: ci[1], asked: d.asked, byAge: byAge });
    this.msg('result', 'Serosurvey: ' + (100 * pos / Math.max(1, got)).toFixed(1) + '% have antibodies', 'Field epidemiology team', [
      pos + ' of ' + got + ' residents tested positive for antibodies to ' + S.agentName + ': ' + (100 * pos / got).toFixed(1) + '% (95% CI ' + (100 * ci[0]).toFixed(1) + '–' + (100 * ci[1]).toFixed(1) + '%). Antibodies take about two weeks to appear, so this reflects infections up to mid-' + this.shortDate(this.gd(sd) - 14) + '.',
      { k: 'table', head: ['Age', 'Tested', 'Positive', '%'], rows: byAge.map(function (a, i) { return [D.AGE_BANDS[i], String(a[0]), String(a[1]), a[0] ? (100 * a[1] / a[0]).toFixed(0) + '%' : '–']; }) },
      { k: 'n', x: ['Assay sensitivity about 90%, specificity 99.5%. Across ' + IX.fmt(C.population) + ' people, ' + (100 * pos / got).toFixed(1) + '% is roughly ' + IX.fmt(C.population * pos / got) + ' infections so far.'] }], { day: S.day + 1 });
  };

  // ============================================================== treatment trial
  GP.inv_trial = function (params) {
    var S = this.S, n = Math.max(20, Math.min(400, +(params && params.n) || 60));
    if (!S.recognized) return { ok: false, err: 'Identify the agent first.' };
    if (S.trial && !S.trial.done) return { ok: false, err: 'A trial is already running.' };
    var drug = IX.pickText(this, 'drug', 1, {});
    S.trial = { start: S.day, n: n, closes: S.day + 28, enrolled: [], drug: drug, done: false };
    return { ok: true, msgs: [this.msg('result', 'Treatment trial opened: ' + drug, 'Clinical trials unit, St Anne\'s', ['Adults admitted with confirmed ' + S.agentName + ' will be randomised 1:1 to ' + drug + ' or usual care, up to ' + n + ' patients or four weeks. Primary outcome: death within 28 days of admission. We report when the last patient reaches day 21 of follow-up.', { k: 'n', x: ['A trial with few deaths in it cannot tell you much. Size it to the number of admissions you expect.'] }])] };
  };
  GP.trialDay = function (sd) {
    var S = this.S, T = S.trial, sim = this.sim;
    if (!T || T.done) return;
    // enrolment happens in the simulation at admission (sim.trialLog); follow-up 21 days after the last
    if (sim.trialLog && sim.trialLog.length) { sim.trialLog.forEach(function (e) { T.enrolled.push(e); }); sim.trialLog = []; }
    if (!T.closed && (T.enrolled.length >= T.n || S.day >= T.closes)) { T.closed = S.day; }
    if (T.closed !== undefined && S.day >= T.closed + 21) this.trialReport();
  };
  GP.trialReport = function () {
    var S = this.S, T = S.trial, sim = this.sim, self = this;
    T.done = true;
    var a = [0, 0], d = [0, 0];
    T.enrolled.forEach(function (e) { a[e.arm]++; var x = e.x; if (sim.xdeath[x] >= 0 && sim.xdeath[x] <= sim.sd) d[e.arm]++; });
    var r1 = d[1] / Math.max(1, a[1]), r0 = d[0] / Math.max(1, a[0]);
    var rr = (d[1] + 0.5) / (a[1] + 0.5) / ((d[0] + 0.5) / (a[0] + 0.5));
    var se = Math.sqrt(1 / (d[1] + 0.5) - 1 / (a[1] + 0.5) + 1 / (d[0] + 0.5) - 1 / (a[0] + 0.5));
    var lo = Math.exp(Math.log(rr) - 1.96 * se), hi = Math.exp(Math.log(rr) + 1.96 * se);
    T.result = { treated: a[1], tDeaths: d[1], control: a[0], cDeaths: d[0], rr: rr, lo: lo, hi: hi };
    var verdict = hi < 1 ? 'The drug reduces deaths: the whole confidence interval is below 1.' : lo > 1 ? 'The drug appears to cause harm.' : a[0] + a[1] < 40 ? 'Inconclusive: too few patients to say either way.' : 'No clear effect: the interval includes 1.';
    this.msg('result', 'Trial result: ' + T.drug, 'Clinical trials unit, St Anne\'s', [
      { k: 'table', head: ['Arm', 'Patients', 'Died', 'Mortality'], rows: [[T.drug, String(a[1]), String(d[1]), (100 * r1).toFixed(0) + '%'], ['Usual care', String(a[0]), String(d[0]), (100 * r0).toFixed(0) + '%']] },
      'Risk ratio ' + rr.toFixed(2) + ' (95% CI ' + lo.toFixed(2) + '–' + hi.toFixed(2) + '). ' + verdict,
      { k: 'n', x: ['You can adopt it as standard treatment (PROTECT → treatment protocol) whatever this says. Whether you should is another matter.'] }], { urgent: true });
  };

  // ============================================================== publish the sequence
  GP.inv_publish_sequence = function () {
    var S = this.S;
    var done = Object.keys(S.seqs).filter(function (k) { return S.seqs[k].done && S.seqs[k].ok; });
    if (!done.length) return { ok: false, err: 'You need at least one complete genome.' };
    if (S.seqPublished !== undefined) return { ok: false, err: 'Already published.' };
    S.seqPublished = S.day;
    var m = this.msg('lab', 'Genome of ' + S.agentName + ' published', 'Genomics unit', ['The sequence is on the international databases. Vaccine developers and drug companies can start work as soon as they know enough about the disease itself: how it spreads, how long it incubates, who it harms.']);
    this.checkCureClock();
    return { ok: true, msgs: [m] };
  };
})();
