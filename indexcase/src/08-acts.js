/* INDEX CASE engine — 08-acts.js
 * Game flow. IX.newGame builds the city and a pathogen, runs the outbreak silently
 * until someone notices a cluster (the alert: day 0), and checks with the solver
 * that the game is fair. Then: acts (Detect, Characterise, Contain), the end
 * (contained, vaccine, day 180, collapse), the mentor, score, debrief, saves.
 */
var IX = (typeof IX !== 'undefined' && IX) ? IX : {};

(function () {
  'use strict';
  var D = IX.DATA, SET = IX.SET, FLAG = IX.FLAG, OCC = IX.OCC, ST = IX.ST, u = IX.u, XFL = IX.XFL;
  var GP = IX.GP;
  var DAY_LIMIT = 180;
  IX.DAY_LIMIT = DAY_LIMIT;

  var OBS_KEYS = ['ili', 'test', 'recall', 'flag', 'delay', 'gp', 'follow', 'bgd', 'ww', 'misc', 'quest', 'seq', 'sero', 'vac', 'rum', 'press', 'text', 'mentor'];

  function Game(seed, opts, attempt, C, P) {
    this.seed = String(seed); this.opts = opts || {}; this.grade = this.opts.grade || 'consultant'; this.attempt = attempt || 0;
    this.C = C; this.P = P;
    var key = this.seed + '#' + this.attempt + '/' + this.grade;
    this.key = key;
    var keys = this.keys = {};
    OBS_KEYS.forEach(function (k) { keys[k] = IX.hash(key + '/obs/' + k); });
    this.sim = new IX.Sim(C, P, key + '/sim');
    this.sim.baseBeds = Math.round(22 * C.N / 8000); this.sim.baseIcu = Math.max(3, Math.round(4 * C.N / 8000));
    this.sim.deadList = [];
    this.sim.VE_inf = 0.65;
    var R = IX.rng(key + '/cal');
    // calendar: sim day 0 falls on the city's weekday, in autumn
    var base = Date.UTC(2026, 8, 1) + R.int(0, 70) * 86400000;
    while (new Date(base).getUTCDay() !== C.wd0) base += 86400000;
    this.simBase = base;
    this.S = this.freshState(R);
  }
  Game.prototype = GP;
  IX.Game = Game;

  GP.freshState = function (R) {
    var G = IX.gradeOf(this.grade), C = this.C, nd = C.districts.length;
    var trust = [];
    for (var d = 0; d < nd; d++) for (var b = 0; b < 3; b++) trust.push(IX.round(IX.clamp(64 - 30 * C.districts[d].deprivation + (b === 2 ? 8 : b === 0 ? -6 : 0) + R.range(-5, 5), 20, 90), 1));
    return {
      v: 1, day: 0, act: 1, over: false, outcome: null, sd0: null, from: -56, alerted: false, alert: null,
      msgSeq: 0, msgs: [], cases: {}, caseOrder: [], people: {}, contacts: {}, tests: [], testQueue: [], pendingResults: [], samples: {}, seqs: {},
      hospSamples: {}, preFlags: [], newSuspects: [], deathQueue: [], dead: [], bgIli: {}, isoList: [], quarList: [],
      series: { ili: [], adm: [], deaths: [], tests: [], positive: [], allDeaths: [] },
      ww: [], wwTruth: [], wwPending: [], jobs: [], hhStudies: [], siteLists: {}, siteVisits: {}, quests: [], reviews: [], animalTests: [], seroResults: [],
      closeHist: [], orders: [], orderSeq: 0, fundingRequests: [], hires: [], pressQueue: [], mayorQueue: [], mayorDone: {}, pressLeaked: {},
      staff: IX.clone(G.staff), staff0: G.staff.tracers + G.staff.field + G.staff.analysts, used: { tracers: 0, field: 0, analysts: 0 },
      testsCap: G.panel, testsEffCap: G.panel, seqCap: G.seq, seqUsed: 0, funding: G.funding, spent: 0, economy: 0,
      trust: trust, trust0: trust.slice(), credibility: 70, credLog: [], rumours: [], rumourShare: null,
      draft: {}, published: {}, estHistory: [], caseDef: null, recognized: false, agentName: null,
      mentor: { used: { nudge: 0, pointer: 0, answer: 0 }, nudgeDay: null, log: [] }, log: [], events: [],
      fluPeak: R.int(20, 90), lagBonus: G.lagBonus
    };
  };

  // ---------------------------------------------------------------- read-only props
  Object.defineProperty(GP, 'day', { get: function () { return this.S.day; } });
  Object.defineProperty(GP, 'actNo', { get: function () { return this.S.act; } });   // g.act(...) is the action method
  Object.defineProperty(GP, 'actLabel', { get: function () { return ['', 'Detect', 'Characterise', 'Contain'][this.S.act]; } });
  Object.defineProperty(GP, 'over', { get: function () { return this.S.over; } });
  Object.defineProperty(GP, 'outcome', { get: function () { return this.S.outcome; } });
  Object.defineProperty(GP, 'agentName', { get: function () { return this.S.agentName; } });
  Object.defineProperty(GP, 'credibility', { get: function () { return Math.round(this.S.credibility); } });
  Object.defineProperty(GP, 'city', { get: function () {
    if (this._cityView) return this._cityView;
    var C = this.C;
    this._cityView = {
      name: C.name, population: C.population, agents: C.N, scale: C.scale, hospitalId: C.hospitalId, boundary: C.boundary, river: C.river, rivers: [C.river], roads: C.roads,
      districts: C.districts.map(function (d) { return { id: d.id, name: d.name, type: d.type, poly: d.poly, centre: d.centre, pop: d.pop, deprivation: d.deprivation, blurb: d.blurb }; }),
      places: C.places.map(function (p) { var o = { id: p.id, kind: p.kind, name: p.name, district: p.district, pos: p.pos, size: p.size, indoor: p.indoor, blurb: p.blurb }; if (p.sub) o.sub = p.sub; return o; })
    };
    return this._cityView;
  } });
  GP.msg_ = null;
  GP.inbox = function () { return this.S.msgs; };
  GP.msgById = function (id) { return this.S.msgs.filter(function (m) { return m.id === id; })[0] || null; };
  GP.markRead = function (id) { var m = this.msgById(id); if (m) m.read = true; };
  // g.msg(id) is documented for reading; internally msg() builds messages — keep both via arity
  var buildMsg = GP.msg;
  GP.msg = function (a, b, c, d, e) { if (arguments.length === 1) return this.msgById(a); return buildMsg.call(this, a, b, c, d, e); };
  GP.dateLabel = function (d) { return this.cal.nice(d); };
  GP.dateLong = function (d) { return this.cal.long(d); };

  // ---------------------------------------------------------------- the silent start and the alert
  /** run the outbreak until someone notices; returns false if it fizzles or nobody notices in time */
  GP.prerun = function (maxSd) {
    var sim = this.sim, S = this.S, C = this.C, self = this;
    maxSd = maxSd || 130;
    sim.seedOutbreak();
    var pre = this._pre = { care: {}, deaths: {}, ww: {} };
    S.day = 0;
    for (var sd = 0; sd < maxSd; sd++) {
      sim.step(IX.EMPTY_POL);
      // what a hospital would flag and what the city would notice
      for (var x = 0; x < sim.n; x++) {
        if (sim.xhosp[x] === sd && !(sim.xflags[x] & XFL.CAREDEATH)) this.onAdmission(x, sd);
        if (sim.xcare[x] === sd) pre.care[sd] = (pre.care[sd] || 0) + 1;
        if (sim.xdeath[x] === sd) pre.deaths[sd] = (pre.deaths[sd] || 0) + 1;
      }
      pre.ww[sd] = this.wwValues(sd);
      this.checkAlert(sd);
      if (S.alerted) break;
      if (!sim.active.length && !(sim.extra && sim.extra.some(function (e) { return !e.done; })) && !(this.P.route === 'animal')) return false;
    }
    if (!S.alerted) return false;
    this.startGame();
    return true;
  };
  GP.wwValues = function (sd) {
    var sim = this.sim, C = this.C, P = this.P, K = this.keys.ww, nd = C.districts.length, sig = new Float64Array(nd);
    for (var i = 0; i < sim.active.length; i++) { var x = sim.active[i]; var s = this.shedding(x, sd); if (s > 0) sig[C.dist[sim.xwho[x]]] += s; }
    var vals = [];
    for (var d = 0; d < nd; d++) {
      var base = 1e4 * P.shed * sig[d] / C.districts[d].pop * 800;
      var noise = Math.exp(0.45 * IX.normal2(u(K, d, sd, 1), u(K, d, sd, 2)));
      var v = (base + 30 * u(K, d, sd, 3)) * noise;
      vals.push(Math.round(v < 40 ? 0 : v));
    }
    return vals;
  };
  // the in-game wastewater day uses the same values
  GP.wastewaterDay = function (sd) {
    var S = this.S, sim = this.sim;
    S.wwTruth[S.day - S.from] = this.wwValues(sd);
    var wd = sim.wd(sd);
    if (this.orderActive('wastewater') && (wd === 1 || wd === 3 || wd === 5)) S.wwPending.push({ day: S.day, due: S.day + 2 });
    // when the programme starts, archived samples from the last fortnight are tested (twice a week)
    var o = this.ordersOf('wastewater')[0];
    if (o && !o.archived && this.orderActive('wastewater')) {
      o.archived = true;
      for (var d = S.day - 14; d < S.day; d++) { var w2 = sim.wd(this.sdOf(d)); if (w2 === 1 || w2 === 4) S.wwPending.push({ day: d, due: S.day + 2 }); }
    }
  };

  GP.startGame = function () {
    var S = this.S, sim = this.sim, C = this.C, P = this.P, self = this, pre = this._pre;
    var A = S.alertSd;
    S.sd0 = A + 1;
    S.day = 0;
    if (P.variant) sim.variantSd = S.sd0 + P.variant.day;
    this.cal = IX.Calendar(this.simBase + S.sd0 * 86400000);
    // back-fill the surveillance series for the weeks before the alert
    for (var gd = S.from; gd < 0; gd++) {
      var sd = gd + S.sd0, i = gd - S.from;
      var ili = this.bgIli(sd);
      ili.forEach(function (r) { if (!S.bgIli[r.pid]) S.bgIli[r.pid] = r; });
      S.series.ili[i] = ili.length + (pre.care[sd] || 0);
      S.series.allDeaths[i] = IX.poissonU(0.22 * C.N / 8000 * (0.8 + 0.4 * this.seasonAt(sd)), u(this.keys.bgd, sd, 1, 0)) + (pre.deaths[sd] || 0);
      S.wwTruth[i] = sd >= 0 ? pre.ww[sd] : this.wwValues(sd);
    }
    this._pre = null;
    // the alert
    var al = S.alert, place = C.places[al.place];
    var pids = al.pids.slice(0, 8);
    // a confounder: someone at the same place with ordinary flu
    var conf = null;
    Object.keys(S.bgIli).forEach(function (k) {
      var r = S.bgIli[k]; if (conf || r.onset < A - 8 || r.onset > A) return;
      var q = r.pid; if (pids.indexOf(q) >= 0) return;
      var there = C.work[q] === al.place || (r.hosp && al.kind === 'hospital');
      if (there && (S.hospSamples[q] !== undefined || al.kind !== 'hospital' || r.hosp)) conf = q;
    });
    if (conf !== null && this.grade !== 'probationer') pids.push(conf);
    pids.forEach(function (q) { var cs = self.addCase(q, 'alert', 'suspected'); if (al.kind === 'hospital' || S.hospSamples[q] !== undefined) S.hospSamples[q] = S.hospSamples[q] !== undefined ? S.hospSamples[q] : A; });
    // other unexplained admissions the hospital had already flagged
    S.preFlags.forEach(function (f) { if (!S.cases[f.pid]) self.addCase(f.pid, 'hospital', 'suspected'); });
    this.alertMessage(al, pids);
    this.msg('system', 'Day 1: ' + this.dateLong(0), 'Incident room', [
      'You are the Director of Public Health for ' + C.name + ' (population ' + IX.fmt(C.population) + '). This morning something landed on your desk that might be nothing.',
      { k: 'n', x: ['ACT 1 — DETECT. Is this something new? Test the patients against everything we know (the extended panel), talk to them, find out what links them. If three or more ill people test negative for everything, you can ask the lab to look for a new agent. Nobody else will.'] }]);
    S.act = 1;
    this.resetDay();
  };
  GP.alertMessage = function (al, pids) {
    var S = this.S, C = this.C, self = this, place = C.places[al.place], P = this.P;
    var fam = P.family, n = pids.length;
    var illness = fam === 'gut' ? 'severe vomiting and diarrhoea' : fam === 'contact' ? 'high fever and bleeding' : 'severe pneumonia';
    if (P.tell) illness += (fam === 'resp' ? ', ' : ' with ') + D.SYM[P.tell].label;
    var from, lines = [], title;
    var rows = pids.map(function (q) { var cs = S.cases[q]; return [self.pref(q), String(C.age[q]), self.C.districts[C.dist[q]].name, cs.onset !== null ? self.shortDate(cs.onset) : '?', self.occLabel(q)]; });
    if (al.kind === 'hospital') {
      from = 'Dr Helen Achterberg, consultant microbiologist, St Anne\'s';
      title = 'St Anne\'s: ' + n + ' patients with unexplained ' + (fam === 'resp' ? 'pneumonia' : 'illness');
      lines.push({ k: 'q', x: ['I\'ve got ' + n + ' patients with ' + illness + ' that I cannot explain. Flu negative on the ward test, not responding to the usual antibiotics. It may be nothing. It is the "may" that bothers me. I\'d rather ring you now than at the inquiry.'] });
    } else if (al.kind === 'care_home') {
      from = 'Care home manager, ' + place.name;
      title = place.name + ': ' + n + ' residents and staff ill';
      lines.push({ k: 'q', x: ['We\'ve had ' + n + ' poorly in a week, residents and two of my carers. It started like a cold. Mrs ' + C.last[pids[0]] + ' went downhill very fast. The GP says it\'s probably the season. I don\'t think it is.'] });
    } else if (al.kind === 'school' || al.kind === 'nursery') {
      from = 'Headteacher, ' + place.name;
      title = place.name + ': unusual illness among pupils and staff';
      lines.push({ k: 'q', x: ['Attendance has dropped off a cliff in some classes and parents are describing ' + illness + '. One of my teaching assistants is in St Anne\'s. I\'ve had to send a letter home and I don\'t know what to put in it.'] });
    } else if (al.kind === 'choir') {
      from = 'GP, ' + C.places[C.gpOfDist[place.di]].name;
      title = n + ' members of ' + place.name + ' ill';
      lines.push({ k: 'q', x: ['Odd one. I\'ve seen ' + Math.min(n, 4) + ' patients this week who all sing in ' + place.name + '. ' + illness.charAt(0).toUpperCase() + illness.slice(1) + '. Their choir master rang me to ask if he should cancel Thursday. I didn\'t know what to tell him.'] });
    } else {
      from = 'GP, ' + C.places[C.gpOfDist[place.di]].name;
      title = n + ' people linked to ' + place.name + ' ill';
      lines.push({ k: 'q', x: ['I\'ve had a run of patients this week who were all at ' + place.name + '. ' + illness.charAt(0).toUpperCase() + illness.slice(1) + '. Could be food poisoning, could be flu. Could be something else. I thought you should know.'] });
    }
    lines.push({ k: 'table', head: ['Name', 'Age', 'District', 'Ill from', 'Occupation'], rows: rows });
    lines.push({ k: 'n', x: ['Linked to ', this.plref(al.place), '. Everyone on this list is on your line list as a suspected case.' + (S.preFlags.length ? ' St Anne\'s adds that it has admitted ' + S.preFlags.length + ' patient' + (S.preFlags.length > 1 ? 's' : '') + ' with unexplained severe illness in recent weeks.' : '')] });
    this.msg('alert', title, from, lines, { urgent: true });
  };

  // ---------------------------------------------------------------- the day
  GP.resetDay = function () {
    var S = this.S;
    S.used = { tracers: 0, field: 0, analysts: 0 };
    S.seqUsed = 0;
    S.testsLeft = Math.floor(S.testsEffCap || S.testsCap);
    this.mentorNewDay();
  };
  GP.endDay = function () {
    var S = this.S, sim = this.sim;
    if (S.over) return { day: S.day, newMsgs: [], events: [], over: true, outcome: S.outcome };
    this._fresh = [];
    var events = this._events = [];
    var sd = this.sdOf(S.day);
    var pol = this.compilePolicy(sd);
    sim.step(pol);
    S.testsLeft = Math.floor(S.testsEffCap || S.testsCap);
    this.surveil(sd);
    this.trialDay(sd);
    this.policyDay();
    this.trustDay();
    this.rumourTriggers();
    this.rumourDay();
    S.log.push([S.day, 'end']);
    // --- the next morning
    S.day++;
    this.morning();
    this.suspectReport();
    this.councilDay();
    this.pressDay();
    this.mayorDay();
    this.estimateChecks();
    this.updateCureClock();
    this.variantWatch();
    this.checkActs();
    this.checkEnd();
    this.resetDay();
    var fresh = this._fresh; this._fresh = null; this._events = null;
    fresh.forEach(function (m) { if (m.day < S.day) m.day = S.day; });
    return { day: S.day, newMsgs: fresh, events: events, over: S.over, outcome: S.outcome };
  };
  GP.advance = function (n) {
    var out = { day: this.S.day, newMsgs: [], events: [], over: false, outcome: null };
    for (var i = 0; i < (n || 7); i++) {
      var act0 = this.S.act;
      var r = this.endDay();
      out.day = r.day; out.newMsgs = out.newMsgs.concat(r.newMsgs); out.events = out.events.concat(r.events); out.over = r.over; out.outcome = r.outcome;
      if (r.over || this.S.act !== act0 || r.newMsgs.some(function (m) { return m.urgent || m.choices; })) break;
    }
    return out;
  };
  GP.event = function (kind, text, ref) { var e = { kind: kind, text: text, day: this.S.day }; if (ref) e.ref = ref; this.S.events.push(e); if (this._events) this._events.push(e); };

  /** pre-recognition: the hospital sends the names of newly flagged patients */
  GP.suspectReport = function () {
    var S = this.S, self = this;
    if (!S.newSuspects.length) return;
    var L = S.newSuspects; S.newSuspects = [];
    this.msg('report', 'St Anne\'s: ' + L.length + ' more unexplained admission' + (L.length > 1 ? 's' : ''), 'Dr Helen Achterberg, St Anne\'s', [
      { k: 'table', head: ['Patient', 'Age', 'District', 'Admitted'], rows: L.map(function (q) { return [self.pref(q), String(self.C.age[q]), self.C.districts[self.C.dist[q]].name, self.shortDate(self.gd(S.hospSamples[q]))]; }) },
      'Samples are in the fridge if you want them tested.']);
  };

  GP.variantWatch = function () {
    var S = this.S, sim = this.sim;
    if (sim.variantBorn >= 0 && !S.variantEvent) { S.variantEvent = S.day; this.event('variant', 'A variant has emerged (truth only)'); }
    if (S.variantSeen && !S.variantPress && S.day > S.variantSeen + 3) { S.variantPress = S.day; S.pressQueue.push({ kind: 'variant' }); }
  };

  // ---------------------------------------------------------------- acts and the end
  /** community spread: many recent cases that nobody can link to a known case or cluster (observable) */
  GP.communitySpread = function () {
    var S = this.S, C = this.C, self = this, known = 0, recent = 0, unlinked = 0, dists = {};
    if (!S.recognized || S.day - S.recognizedDay < 7) return false;
    var cl = null;
    S.caseOrder.forEach(function (pid) {
      var cs = S.cases[pid]; if (cs.status !== 'confirmed' && cs.status !== 'probable') return;
      known++;
      if (cs.reported < S.day - 10) return;
      recent++; dists[C.dist[pid]] = 1;
      if (cs.epiLinked || cs.infectorGuess !== undefined || S.contacts[pid]) return;
      if (!cl) cl = self.clusters();
      if (cl.some(function (k) { return k.cases.indexOf(pid) >= 0; })) return;
      unlinked++;
    });
    var scale = C.N / 8000;
    return (recent >= 40 * scale && unlinked >= 0.5 * recent && Object.keys(dists).length >= 5) || known >= 150 * scale;
  };
  GP.checkActs = function () {
    var S = this.S, self = this;
    if (S.act === 1 && S.recognized && S.day >= S.recognizedDay) { S.act = 2; S.act2Day = S.day; this.event('act', 'Act 2: Characterise'); S.pressQueue.push({ kind: 'agent' }); }
    if (S.act === 2) {
      var allPub = IX.KEY_TRAITS.every(function (k) { return S.published[k]; });
      var comm = this.communitySpread();
      if (allPub || comm) {
        S.act = 3; S.act3Day = S.day; S.act3Why = allPub ? 'characterised' : 'community';
        this.event('act', 'Act 3: Contain');
        this.msg('system', allPub ? 'Act 3: Contain' : 'Community transmission', 'Incident room', [
          allPub ? 'Every key trait is published. You know enough about ' + S.agentName + ' to fight it properly. Now hold the line until treatment or a vaccine arrives, or until it is gone.' : S.agentName + ' is spreading in the community faster than you can trace it: cases with no link to any known cluster, in district after district. You will have to act before you are sure.',
          { k: 'n', x: ['ACT 3 — CONTAIN. Testing, tracing, isolation, closures, what you tell the public. The hospital, the council, the press and the rumour mill are all watching.'] }], { urgent: true });
      }
    }
    if (S.act === 1 && S.day >= 25 && this.communitySpread() && !S.act1Warn) { S.act1Warn = S.day; this.msg('mentor', 'A word from Dr Gethin', IX.MENTOR.name, [{ k: 'q', x: ['Whatever this is, it is everywhere now. Get three clean negative panels to the lab and declare it. Waiting for certainty is a decision too.'] }], { urgent: true }); }
  };
  GP.checkEnd = function () {
    var S = this.S, sim = this.sim, P = this.P, C = this.C;
    if (S.over) return;
    var out = null;
    var spillLive = P.route === 'animal' && !(this.ordersActive().some(function (o) { return o.type === 'close_animal' && o.target === sim.spillSite && o.since < S.day; }));
    var pendingExtra = sim.extra && sim.extra.some(function (e) { return !e.done; });
    if (!sim.active.length && !spillLive && !pendingExtra) { if (S.extinctDay === undefined) S.extinctDay = S.day; }
    else S.extinctDay = undefined;
    var tr = this.trustSummary().overall;
    if (S.extinctDay !== undefined && S.day - S.extinctDay >= 21) out = { kind: 'contained', title: 'It\'s over', text: 'No new infections for three weeks: ' + (S.agentName || 'the outbreak') + ' is gone from ' + C.name + '.' };
    else if (S.vaccine && S.vaccine.status === 'done') out = { kind: 'vaccine', title: 'Vaccination programme complete', text: 'Everyone who wanted a vaccine in your priority groups has had one. The emergency is over, though the virus is not.' };
    else if (S.credibility <= 0 || tr < 15) out = { kind: 'collapse', title: 'Relieved of command', text: S.credibility <= 0 ? 'The council has lost confidence in you. An interim director starts on Monday.' : 'The city has stopped listening. The council has asked the national agency to take over the response.' };
    else if (S.day >= DAY_LIMIT) out = { kind: 'timeout', title: 'Six months on', text: 'Six months after the first alert, the response moves to a national footing. Your part in it ends here.' };
    if (out) {
      out.day = S.day;
      S.over = true; S.outcome = out;
      this.event('end', out.title);
      this.msg('system', out.title, 'Incident room', [out.text, { k: 'n', x: ['The debrief is ready: the true disease, the ghost city where nobody acted, and the people behind the numbers.'] }], { urgent: true });
    }
  };

  // ---------------------------------------------------------------- truth (debrief, estimates checks, solver)
  /** realised trait values: the numbers the data in this city can actually show */
  GP.truthCard = function () {
    if (this._truth && this._truth.day === this.S.day) return this._truth;
    var P = this.P, sim = this.sim, C = this.C, S = this.S;
    var card = IX.pathogenCard(P);
    var n = sim.n;
    // incubation: mean over symptomatic infections so far
    var inc = [], asym = 0, tot = 0, pre = 0, symT = 0, off = new Int32Array(Math.max(1, n));
    for (var x = 0; x < n; x++) { if (sim.xby[x] >= 0) off[sim.xby[x]]++; }
    var early = Math.min(n, Math.max(40, Math.round(0.03 * C.N)));
    var earlyT = Math.max(300, Math.round(0.06 * C.N));   // traits are measured on the early epidemic, as the player sees it
    var sumOff = 0, cntOff = 0;
    for (x = 0; x < n; x++) {
      if (sim.xday[x] > sim.sd - 25) continue;   // not yet complete
      if (x >= earlyT && tot >= 300) continue;
      tot++;
      if (sim.xonset[x] < 0) asym++; else inc.push(sim.xonset[x] - sim.xday[x]);
      if (x < early) { sumOff += off[x]; cntOff++; }
      var b = sim.xby[x];
      if (b >= 0 && sim.xonset[b] >= 0) { if (sim.xday[x] < sim.xonset[b]) pre++; else symT++; }
    }
    card.incubation = inc.length >= 20 ? IX.round(IX.mean(inc), 1) : P.incMean;
    card.asym = tot >= 40 ? Math.round(100 * asym / tot) : Math.round(100 * P.asym);
    card.presym = pre + symT >= 30 ? Math.round(100 * pre / (pre + symT)) : Math.round(100 * P.presym);
    card.R = this.S.R0 || (cntOff >= 30 ? IX.round(sumOff / cntOff, 2) : P.R);
    // fatality: expected deaths at normal capacity for the people actually infected (age mix of this outbreak)
    // severity as it actually played out among the early, resolved infections (age mix, crowded wards and all),
    // shrunk towards the expected value for that age mix when deaths are few
    var ef = 0, eh = 0, m = 0, dd = 0, hh = 0;
    for (x = 0; x < n && m < earlyT; x++) {
      if (sim.xday[x] > sim.sd - 30) continue;
      var a = sim.xwho[x], bd = D.ageBand(C.age[a]); ef += P.ageIFR[bd]; eh += P.ageIHR[bd]; m++;
      if (sim.xdeath[x] >= 0) dd++;
      if (sim.xhosp[x] >= 0) hh++;
    }
    var K0 = 150;
    card.ifrExpected = m ? IX.round(100 * ef / m, 2) : IX.round(100 * P.ifr, 2);
    card.ifr = m >= 50 ? IX.round(100 * (dd + K0 * ef / m) / (m + K0), 2) : IX.round(100 * P.ifr, 2);
    card.ihr = m >= 50 ? IX.round(100 * (hh + K0 * eh / m) / (m + K0), 1) : IX.round(100 * P.ihr, 1);
    card.originCase = sim.primary;
    card.sourcePlace = sim.sourcePlace >= 0 ? C.places[sim.sourcePlace].id : null;
    card.day = S.day;
    this._truth = card;
    return card;
  };

  /** the ghost city: the same outbreak with nobody acting, to sim day sdEnd */
  GP.ghost = function (sdEnd) {
    sdEnd = sdEnd === undefined ? this.sdOf(Math.max(this.S.day, DAY_LIMIT)) : sdEnd;
    if (this._ghost && this._ghost.sim.sd >= sdEnd) return this._ghost;
    var gs = new IX.Sim(this.C, this.P, this.key + '/sim');
    gs.baseBeds = this.sim.baseBeds; gs.baseIcu = this.sim.baseIcu; gs.deadList = []; gs.VE_inf = this.sim.VE_inf;
    if (this.P.variant) gs.variantSd = this.S.sd0 + this.P.variant.day;
    gs.seedOutbreak();
    while (gs.sd < sdEnd) gs.step(IX.EMPTY_POL);
    this._ghost = { sim: gs };
    return this._ghost;
  };
  /** early reproduction number, measured in the ghost city (identical to the real one before any order) */
  GP.measureR0 = function () {
    var gh = this.ghost(this.sdOf(0) + 120).sim, n = gh.n, C = this.C;
    var off = new Int32Array(Math.max(1, n));
    for (var x = 0; x < n; x++) if (gh.xby[x] >= 0) off[gh.xby[x]]++;
    var early = Math.min(n, Math.max(40, Math.round(0.03 * C.N))), s = 0, c = 0;
    for (x = 0; x < early; x++) { if (gh.xday[x] > gh.sd - 25) break; s += off[x]; c++; }
    return c >= 20 ? IX.round(s / c, 2) : this.P.R;
  };

  // ---------------------------------------------------------------- the mentor
  IX.MENTOR = { name: 'Dr Ros Gethin', title: 'Retired regional epidemiologist', bio: 'Thirty years in health protection, from Legionnaires\' in cooling towers to the last pandemic. Now keeps bees near Hebden and answers the phone on the fourth ring.',
    costs: { nudge: 0, pointer: { analysts: 3 }, answer: { credibility: 10 } } };
  GP.mentorNewDay = function () { };
  GP.mentorStatus = function () {
    var S = this.S, G = this.grades(), M = S.mentor;
    var r = this.resources();
    return {
      nudge: { ok: M.nudgeDay !== S.day && !S.over, why: M.nudgeDay === S.day ? 'One nudge a day.' : 'Free.' },
      pointer: { ok: r.staffHours.analysts >= G.mentorCost.analysts && !S.over, why: 'Costs ' + G.mentorCost.analysts + ' analyst hours (she needs someone to pull the data together).' },
      answer: { ok: S.credibility > G.mentorCost.credibility && !S.over, why: 'Costs ' + G.mentorCost.credibility + ' credibility: the council will hear you had to ask.' },
      used: IX.clone(M.used), costs: { nudge: 0, pointer: { analysts: G.mentorCost.analysts }, answer: { credibility: G.mentorCost.credibility } }
    };
  };
  GP.mentor = function (tier) {
    var S = this.S, G = this.grades(), st = this.mentorStatus();
    if (!st[tier]) return { ok: false, tier: tier, text: 'She only does nudges, pointers and answers.' };
    if (!st[tier].ok) return { ok: false, tier: tier, text: st[tier].why };
    var advice = IX.mentorAdvice(this, tier);
    if (!advice || !advice.text) return { ok: false, tier: tier, text: 'Dr Gethin listens, then says you are doing what she would do. Carry on.' };
    this._fresh = [];
    var charged = {};
    if (tier === 'nudge') S.mentor.nudgeDay = S.day;
    if (tier === 'pointer') { S.used.analysts += G.mentorCost.analysts; charged.analysts = G.mentorCost.analysts; }
    if (tier === 'answer') { this.credit(-G.mentorCost.credibility, 'asked the mentor'); charged.credibility = G.mentorCost.credibility; }
    S.mentor.used[tier]++;
    S.mentor.log.push({ day: S.day, tier: tier, text: advice.text });
    S.log.push([S.day, 'mentor', tier]);
    var m = this.msg('mentor', tier === 'nudge' ? 'Dr Gethin: a thought' : tier === 'pointer' ? 'Dr Gethin: where to look' : 'Dr Gethin: the answer', IX.MENTOR.name, [{ k: 'q', x: advice.segs || [advice.text] }]);
    this._fresh = null;
    var out = { ok: true, tier: tier, text: advice.text, charged: charged, msg: m };
    if (advice.action) out.action = advice.action;
    if (advice.trait) out.trait = advice.trait;
    return out;
  };

  // ---------------------------------------------------------------- score and debrief
  GP.score = function () {
    var S = this.S, self = this, sim = this.sim;
    var lines = [];
    var sdEnd = sim.sd;
    var gh = this.ghost(Math.max(sdEnd, this.sdOf(DAY_LIMIT))).sim;
    var dA = 0, dG = 0, dGnow = 0;
    for (var x = 0; x < sim.n; x++) if (sim.xdeath[x] >= 0) dA++;
    for (x = 0; x < gh.n; x++) if (gh.xdeath[x] >= 0) { dG++; if (gh.xdeath[x] < sdEnd + 30) dGnow++; }
    var iA = sim.n, iG = gh.n;
    var lives = dG >= 5 ? IX.clamp((dG - dA) / dG, 0, 1) : IX.clamp((iG - iA) / Math.max(1, iG), 0, 1);
    lines.push({ label: 'Lives: ' + dA + ' died (ghost city: ' + dG + ')', pts: Math.round(400 * lives) });
    // understanding
    var und = 0, card = this.truthCard();
    var ref = S.act3Day !== undefined ? S.act3Day : S.day;
    IX.KEY_TRAITS.forEach(function (k) {
      var p = S.published[k];
      if (!p) return;
      var e = self.estimateError(k, p.value);
      var lateness = Math.max(0, p.day - ref);
      und += (1 - e) * Math.max(0.4, 1 - lateness / 60);
    });
    lines.push({ label: 'Understanding: estimates close to the truth, and early', pts: Math.round(300 * und / IX.KEY_TRAITS.length) });
    var econ = S.economy;
    var costPts = Math.round(150 * IX.clamp(1 - econ / 120, 0, 1) - Math.max(0, -S.funding) / 20);
    lines.push({ label: 'Cost: £' + econ.toFixed(1) + 'm to the local economy, £' + IX.fmt(S.spent) + 'k spent', pts: Math.max(-50, costPts) });
    var tr = this.trustSummary().overall;
    lines.push({ label: 'Trust at the end: ' + tr + '/100', pts: Math.round(tr) });
    var orig = 0;
    if (S.published.source && S.published.source.value === this.P.source) orig += 25;
    if (S.published.originCase && +S.published.originCase.value === sim.primary) orig += 25;
    lines.push({ label: 'The origin', pts: orig });
    var M = S.mentor.used, pen = -(5 * M.pointer + 15 * M.answer);
    if (pen) lines.push({ label: 'Help from Dr Gethin', pts: pen });
    var total = lines.reduce(function (s, l) { return s + l.pts; }, 0);
    var grade = total >= 800 ? 'Exemplary' : total >= 650 ? 'Commended' : total >= 500 ? 'Sound' : total >= 350 ? 'Lessons to be learned' : 'Public inquiry';
    return { total: total, lines: lines, grade: grade };
  };

  GP.debrief = function () {
    var S = this.S, sim = this.sim, C = this.C, self = this, P = this.P;
    var sdEnd = sim.sd, sdGhost = Math.max(sdEnd, this.sdOf(DAY_LIMIT));
    var gh = this.ghost(sdGhost).sim;
    var card = this.truthCard();
    if (!S.R0) { S.R0 = this.measureR0(); this._truth = null; card = this.truthCard(); }
    var from = S.from, nA = sdEnd - (from + S.sd0), nG = sdGhost - (from + S.sd0);
    function curves(s, n) {
      var inf = new Array(n).fill(0), dth = new Array(n).fill(0), hosp = new Array(n).fill(0);
      for (var x = 0; x < s.n; x++) { var i = s.xday[x] - (from + S.sd0); if (i >= 0 && i < n) inf[i]++; if (s.xdeath[x] >= 0) { var j = s.xdeath[x] - (from + S.sd0); if (j >= 0 && j < n) dth[j]++; } }
      s.daily.forEach(function (q) { var i = q.sd - (from + S.sd0); if (i >= 0 && i < n) hosp[i] = q.hosp; });
      return { infections: inf, deaths: dth, hospital: hosp };
    }
    var est = IX.TRAITS.map(function (t) {
      var p = S.published[t.id], truth = card[t.id];
      var e = p ? self.estimateError(t.id, p.value) : null;
      return { trait: t.id, label: t.label, truth: truth, published: p ? p.value : null, day: p ? p.day : null, revisions: p ? p.revisions : 0, error: e,
        grade: e === null ? 'none' : e <= 0.35 ? 'good' : e <= 0.7 ? 'close' : 'wrong' };
    });
    var named = [];
    for (var x = 0; x < sim.n; x++) if (sim.xdeath[x] >= 0 && sim.xdeath[x] < sdEnd) { var q = sim.xwho[x]; named.push({ pid: q, name: this.name(q), age: C.age[q], district: C.districts[C.dist[q]].id, day: this.gd(sim.xdeath[x]), known: !!(S.cases[q] && S.cases[q].outcome === 'died'), note: IX.EPITAPH(this, q) }); }
    var dG = 0; for (x = 0; x < gh.n; x++) if (gh.xdeath[x] >= 0) dG++;
    // replay frames: infections per day with positions (home), by district
    var frames = [];
    for (var d = from; d < this.gd(sdEnd); d++) frames.push({ day: d, infections: [], byDistrict: {} });
    for (x = 0; x < sim.n; x++) {
      var gd = this.gd(sim.xday[x]); var fi = gd - from; if (fi < 0 || fi >= frames.length) continue;
      var pid = sim.xwho[x], pos = C.hPos[C.hh[pid]];
      frames[fi].infections.push([pid, pos[0], pos[1], IX.SET_NAMES[sim.xset[x]]]);
      var did = C.districts[C.dist[pid]].id; frames[fi].byDistrict[did] = (frames[fi].byDistrict[did] || 0) + 1;
    }
    var tree = [];
    for (x = 0; x < sim.n; x++) tree.push({ pid: sim.xwho[x], infector: sim.xby[x] >= 0 ? sim.xwho[sim.xby[x]] : null, day: this.gd(sim.xday[x]), setting: IX.SET_NAMES[sim.xset[x]], place: sim.xplace[x] >= 0 ? C.places[sim.xplace[x]].id : null, variant: !!sim.xvr[x], known: !!S.cases[sim.xwho[x]] });
    var prim = sim.primary;
    var origin = { primary: prim, primaryName: this.name(prim), source: P.source, place: sim.sourcePlace >= 0 ? this.plref(sim.sourcePlace) : null, day: this.gd(0 + 0) - S.sd0 + 0,
      infectedDay: this.gd(sim.xday[0]), indexCase: S.alert ? S.alert.pids[0] : null, found: !!(S.published.originCase && +S.published.originCase.value === prim),
      sourceFound: !!(S.published.source && S.published.source.value === P.source), spillovers: sim.spills, knownToYou: !!S.cases[prim] };
    return {
      truth: { card: card, archetype: P.archetype, pathogen: IX.clone({ route: P.route, humanRoute: P.humanRoute, incMean: P.incMean, presym: P.presym, asym: P.asym, R: P.R, ifr: P.ifr, ageRisk: P.ageRisk, tell: P.tell, variant: P.variant, source: P.source, treatment: P.treatment, mutRate: P.mutRate }) },
      estimates: est,
      curves: { from: from, actual: curves(sim, nA), ghost: curves(gh, nG) },
      deaths: { actual: named.length, ghost: dG, named: named },
      infections: { actual: sim.n, ghost: gh.n },
      costs: { spent: IX.round(S.spent, 1), economy: IX.round(S.economy, 2), closureDays: this.closureDays(), orders: S.orders.map(function (o) { return self.orderView(o); }) },
      trust: { start: Math.round(avg(S.trust0)), end: this.trustSummary().overall, byDistrict: this.trustSummary().byDistrict },
      origin: origin, frames: frames, tree: { nodes: tree }, score: this.score(), outcome: S.outcome, grade: this.grade, mentor: IX.clone(S.mentor.used)
    };
  };
  function avg(a) { var s = 0; a.forEach(function (v) { s += v; }); return s / a.length; }
  GP.closureDays = function () {
    var S = this.S, n = 0;
    S.orders.forEach(function (o) { if (['close_schools', 'close_hospitality', 'lockdown', 'close_place'].indexOf(o.type) >= 0) n += (o.until !== undefined ? o.until : S.day) - o.since; });
    return n;
  };

  // ---------------------------------------------------------------- save / load
  GP.save = function () {
    var S = this.S, C = this.C, self = this;
    var s2 = {};
    Object.keys(S).forEach(function (k) { s2[k] = S[k]; });
    s2.rumours = S.rumours.map(function (r) { var o = {}; Object.keys(r).forEach(function (k) { o[k] = r[k]; }); o.bel = IX.b64enc(r.bel); return o; });
    s2.msgs = S.msgs.map(function (m) { var o = {}; Object.keys(m).forEach(function (k) { if (k !== 'refs') o[k] = m[k]; }); return o; });
    // refs whose display text is derivable are stored as short tokens
    var json = JSON.stringify({ v: 2, seed: this.seed, opts: this.opts, attempt: this.attempt, P: this.P, simBase: this.simBase, S: s2, sim: this.sim.snapshot() }, function (k, v) {
      if (v && typeof v === 'object' && v.t && v.id !== undefined && Object.keys(v).length === 3) {
        if (v.t === 'person' && v.d === self.name(v.id)) return '\u0001P' + v.id;
        if (v.t === 'place' && C.places[self.placeIdx(v.id)] && v.d === C.places[self.placeIdx(v.id)].name) return '\u0001L' + self.placeIdx(v.id);
        if (v.t === 'district' && C.districts[self.distIdx(v.id)] && v.d === C.districts[self.distIdx(v.id)].name) return '\u0001D' + self.distIdx(v.id);
      }
      return v;
    });
    return IX.pack(json);
  };
  IX.load = function (data) {
    var json = typeof data === 'string' ? IX.unpack(data) : null;
    var o = json !== null ? JSON.parse(json) : data;
    var C = IX.cityFor(o.P.citySeed || o.seed, o.opts);
    var g = new Game(o.seed, o.opts, o.attempt, C, o.P);
    function revive(v) {
      if (typeof v === 'string') {
        if (v.charCodeAt(0) !== 1) return v;
        var t = v.charAt(1), id = +v.slice(2);
        if (t === 'P') return { t: 'person', id: id, d: g.name(id) };
        if (t === 'L') return { t: 'place', id: C.places[id].id, d: C.places[id].name };
        if (t === 'D') return { t: 'district', id: C.districts[id].id, d: C.districts[id].name };
        return v;
      }
      if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) v[i] = revive(v[i]); return v; }
      if (v && typeof v === 'object') { for (var k in v) v[k] = revive(v[k]); return v; }
      return v;
    }
    g.simBase = o.simBase;
    g.S = o.S;
    if (o.v >= 2) { revive(g.S.msgs); revive(g.S.cases); revive(g.S.people); revive(g.S.orders); }
    g.S.msgs.forEach(function (m) {
      if (m.refs) return;
      var refs = [], seen = {};
      function scan(seg) { if (seg && typeof seg === 'object' && seg.t) { var k = seg.t + ':' + seg.id; if (!seen[k]) { seen[k] = 1; refs.push(seg); } } }
      m.body.forEach(function (l) { (l.x || []).forEach(scan); if (l.rows) l.rows.forEach(function (r) { r.forEach(scan); }); if (l.who) scan(l.who); });
      m.refs = refs;
    });
    g.S.rumours = o.S.rumours.map(function (r) { r.bel = IX.b64dec(r.bel, Uint8Array); return r; });
    g.sim.restore(o.sim);
    g.cal = IX.Calendar(g.simBase + g.S.sd0 * 86400000);
    return g;
  };

  // ---------------------------------------------------------------- creating a game
  var cityCache = {};
  IX.cityFor = function (seed, opts) {
    var k = String(seed);
    if (!cityCache[k]) { cityCache = {}; cityCache[k] = IX.makeCity(k, {}); }
    return cityCache[k];
  };
  IX.TUTORIAL = { seed: 'tutorial-1', grade: 'probationer', fixed: { route: 'airborne', incMean: 5, presym: 0.3, asym: 0.25, R: 2.4, ifr: 0.012, ageRisk: 'elderly', tell: 'anosmia', source: 'traveller', variant: false, treatment: 'partial' } };
  /** build attempt k of a seed (pathogen changes every 3 attempts; the outbreak's draws every attempt) */
  IX.buildAttempt = function (seed, opts, attempt) {
    opts = opts || {};
    var C = IX.cityFor(seed, opts);
    var pk = String(seed) + (attempt >= 3 ? '~' + Math.floor(attempt / 3) : '');
    var P = IX.makePathogen(pk, { grade: opts.grade || 'consultant', fixed: opts.fixed });
    IX.calibrate(P, C, pk);
    P.citySeed = String(seed);
    var g = new Game(seed, opts, attempt, C, P);
    var ok = g.prerun();
    return ok ? g : null;
  };
  /** generation: pathogen k (a few draws each) until the acceptance check passes */
  function genOpts(seed, opts) {
    opts = IX.clone(opts || {});
    if (opts.tutorial) { seed = IX.TUTORIAL.seed; opts.grade = IX.TUTORIAL.grade; opts.fixed = IX.TUTORIAL.fixed; }
    if (!opts.grade) opts.grade = 'consultant';
    seed = String(seed === undefined || seed === null ? Math.floor(Math.random() * 1e9) : seed);
    return { seed: seed, opts: opts };
  }
  var MAX_ATTEMPTS = 36, DRAWS_PER_PATHOGEN = 3;
  /** one generation step; state {pk, draw, attempt, last, done, g} */
  IX.genStep = function (seed, opts, st) {
    if (st.done) return st;
    var attempt = st.pk * DRAWS_PER_PATHOGEN + st.draw;
    st.attempt = attempt;
    var g = IX.buildAttemptCached(seed, opts, attempt);
    var v = g ? (IX.accept ? IX.accept(g) : { ok: true }) : { ok: false, fails: ['fizzled before anyone noticed'], level: 'draw' };
    if (g) { g._verify = v; st.last = g; }
    st.tries = (st.tries || 0) + 1;
    if (g && v.ok) { st.done = true; st.g = g; return st; }
    if (v.level === 'pathogen' || st.draw + 1 >= DRAWS_PER_PATHOGEN) { st.pk++; st.draw = 0; } else st.draw++;
    if (st.tries >= MAX_ATTEMPTS) { st.done = true; st.g = st.last; }
    return st;
  };
  IX.newGame = function (seed, opts) {
    var o = genOpts(seed, opts), st = { pk: 0, draw: 0 };
    while (!st.done) IX.genStep(o.seed, o.opts, st);
    return st.g;
  };
  /** the same, yielding to the browser between attempts: onProgress({tries, fraction}) */
  IX.newGameAsync = function (seed, opts, onProgress) {
    var o = genOpts(seed, opts), st = { pk: 0, draw: 0 };
    return new Promise(function (resolve, reject) {
      function step() {
        try { IX.genStep(o.seed, o.opts, st); } catch (e) { reject(e); return; }
        if (onProgress) try { onProgress({ tries: st.tries, fraction: st.done ? 1 : Math.min(0.95, st.tries / 6) }); } catch (e2) { }
        if (st.done) resolve(st.g); else setTimeout(step, 0);
      }
      setTimeout(step, 0);
    });
  };
  // pathogen calibration is shared by the three attempts that use the same pathogen
  var calCache = {};
  IX.buildAttemptCached = function (seed, opts, attempt) {
    var C = IX.cityFor(seed, opts);
    var pk = String(seed) + (attempt >= DRAWS_PER_PATHOGEN ? '~' + Math.floor(attempt / DRAWS_PER_PATHOGEN) : '') + '/' + (opts.grade || 'consultant');
    var P = calCache[pk];
    if (!P) {
      P = IX.makePathogen(pk.replace(/\/.*$/, ''), { grade: opts.grade || 'consultant', fixed: opts.fixed });
      IX.calibrate(P, C, pk);
      P.citySeed = String(seed);
      calCache = {}; calCache[pk] = P;
    }
    var g = new Game(seed, opts, attempt, C, IX.clone(P));
    return g.prerun() ? g : null;
  };
})();
