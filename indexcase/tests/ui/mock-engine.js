/* INDEX CASE — UI development mock of the IX game API (NOT shipped).
 * Follows indexcase/ENGINE.md shapes so the interface can be built and
 * play-tested before src/05-09 land. Uses the real IX.makeCity / makePathogen
 * when the engine files are present. Loaded only by tests/ui/build-dev.sh. */
var IX = typeof IX !== 'undefined' ? IX : {};
(function () {
  'use strict';
  if (IX.newGame && !IX._mockWanted) return;
  function R(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hs(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function pick(r, a) { return a[Math.floor(r() * a.length)]; }
  function pois(r, l) { var L = Math.exp(-l), k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }
  var START = Date.UTC(2025, 9, 13), MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var OCC = ['retired', 'nurse', 'teacher', 'student', 'delivery driver', 'care worker', 'market trader', 'office worker', 'chef', 'bus driver', 'shop assistant', 'factory worker', 'unemployed', 'child'];

  function Game(seed, opts) {
    opts = opts || {};
    this.seed = String(seed); this.grade = opts.grade || 'consultant'; this.tutorial = !!opts.tutorial; this.attempt = 0; this.log = [];
    var r = this.r = R(hs(seed));
    var C = IX.makeCity(this.tutorial ? 'tutorial' : this.seed, {});
    this.C = C;
    this.city = { name: C.name, population: C.population, agents: C.N, scale: C.scale, districts: C.districts.map(function (d) { return { id: d.id, name: d.name, poly: d.poly, centre: d.centre, pop: d.pop, deprivation: d.deprivation, blurb: d.blurb }; }),
      places: C.places.map(function (p) { return { id: p.id, kind: p.kind, name: p.name, district: p.district, pos: p.pos, size: p.size, indoor: p.indoor, blurb: p.blurb }; }), hospitalId: C.hospitalId, river: C.river, boundary: C.boundary };
    var P = this.path = IX.makePathogen(this.seed, {});
    this.people = [];
    for (var i = 0; i < C.N; i++) this.people.push({ pid: 'a' + i, i: i, name: C.first[i] + ' ' + C.last[i], age: C.age[i], sex: C.sex[i] ? 'M' : 'F', district: 'd' + C.dist[i], hh: C.hh[i], pos: C.hPos[C.hh[i]], haunts: [] });
    var self = this;
    this.people.forEach(function (p) { var w = C.work[p.i]; if (w >= 0 && C.places[w]) p.haunts.push(C.places[w].id); if (r() < .3) p.haunts.push(C.places[Math.floor(r() * C.places.length)].id); });
    this.hhOf = {}; this.people.forEach(function (p) { (self.hhOf[p.hh] = self.hhOf[p.hh] || []).push(p.pid); });
    this.day = 0; this.actNo = 1; this.actLabel = 'Detect'; this.over = false; this.outcome = null; this.agentName = null; this.credibility = 70;
    this.inf = {}; this.events = []; this.msgs = []; this.known = {}; this.tests = []; this.seqs = []; this._ord = []; this.pub = {}; this.draft = {}; this.hist = []; this.nextId = 1; this.mUsed = {};
    this.res = { staffMax: { tracers: 30, field: 15, analysts: 15 }, testsCap: 40, seqCap: 4, funding: 500, spent: 0, economy: 0, trust: 62, byDistrict: {} };
    this.city.districts.forEach(function (d) { self.res.byDistrict[d.id] = 45 + Math.round(r() * 35); });
    var src = C.places.filter(function (p) { return p.kind === 'market'; })[0] || C.places[5];
    this.srcPlace = src.id;
    var idx = this.people.filter(function (p) { return p.age > 30 && p.age < 60; })[7]; idx.haunts.push(src.id);
    this.infect(idx, null, -18, src.id);
    for (var d = -18; d < 0; d++) this.spread(d);
    var early = this.events.filter(function (e) { return e.onset !== null && e.onset < -1; }).slice(0, 4); if (early.length < 3) early = this.events.slice(0, 4); early.forEach(function (e) { if (e.onset === null || e.onset > -1) e.onset = -2 - Math.floor(r() * 4); });
    early.forEach(function (e) { self.know(e.pid, 0, 'alert'); });
    this.msg('alert', 'Unexplained pneumonia on Ward 4', [{ k: 'p', x: ['Dr Rachel Amos, consultant physician at ', { t: 'place', id: C.hospitalId, d: "St Anne's Hospital" }, ': ' + early.length + ' adults admitted in five days with severe atypical pneumonia. Routine respiratory panels are negative so far.'] }, { k: 'table', head: ['Patient', 'Age', 'Onset'], rows: early.map(function (e) { var p = self.P(e.pid); return [[self.ref(e.pid)], [String(p.age)], [self.dateLabel(e.onset)]]; }) }, { k: 'n', x: ['Would public health like to take a look?'] }], "St Anne's Hospital", true);
    this.msg('mentor', 'A note from Dr Okonjo', [{ k: 'p', x: ['Morning. Four odd pneumonias is either nothing or everything. Interview them, test them for the usual suspects, and look at where they have been.'] }], 'Dr Ife Okonjo');
    this.startDay();
  }
  var G = Game.prototype;
  G.P = function (pid) { return this.people[+String(pid).slice(1)]; };
  G.ref = function (pid) { return { t: 'person', id: pid, d: this.P(pid).name }; };
  G.pref = function (id) { var p = this.C.places[+String(id).slice(1)]; return { t: 'place', id: id, d: p ? p.name : id }; };
  G.dateLabel = function (d) { var t = new Date(START + d * 864e5); return WD[t.getUTCDay()] + ' ' + t.getUTCDate() + ' ' + MON[t.getUTCMonth()]; };
  G.dateLong = function (d) { var t = new Date(START + d * 864e5); return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][t.getUTCDay()] + ' ' + t.getUTCDate() + ' ' + MON[t.getUTCMonth()] + ' ' + t.getUTCFullYear(); };
  G.infect = function (p, by, day, place) {
    if (this.inf[p.pid]) return;
    var r = this.r, P = this.path, sym = r() > P.asym, inc = Math.max(1, Math.round(P.incMean + (r() - .5) * 2 * P.incSd));
    var sev = sym && r() < (p.age > 70 ? .3 : p.age > 50 ? .08 : .02), die = sev && r() < (p.age > 75 ? .4 : .1);
    var par = by ? this.inf[by] : null, genome = par ? par.genome.slice() : [];
    for (var m = pois(r, 0.8); m > 0; m--) genome.push('C' + (1000 + this.nextId++) + 'T');
    var e = { pid: p.pid, by: by, day: day, place: place, onset: sym ? day + inc : null, hosp: sev ? day + inc + 5 : null, death: die ? day + inc + 13 : null, genome: genome };
    this.inf[p.pid] = e; this.events.push(e);
  };
  G.mult = function () { var m = 1, self = this; this._ord.forEach(function (o) { if (self.day >= o.effectFrom) m *= o.mult; }); return m; };
  G.spread = function (d) {
    var r = this.r, self = this, m = d >= 0 ? this.mult() : 1;
    this.events.slice().forEach(function (e) {
      var age = d - e.day; if (age < 2 || age > 9 || (e.death !== null && d >= e.death)) return;
      var n = pois(r, self.path.R / 7 * m * (e.onset === null ? .6 : 1));
      for (var i = 0; i < n; i++) {
        var src = self.P(e.pid), tgt = null, place = 'home', u = r();
        if (u < .35) tgt = self.P(pick(r, self.hhOf[src.hh]));
        else if (u < .75 && src.haunts.length) { place = pick(r, src.haunts); var c = self.people.filter(function (q) { return q.haunts.indexOf(place) >= 0; }); if (c.length) tgt = pick(r, c); }
        else { place = 'community'; tgt = self.people[Math.floor(r() * self.people.length)]; }
        if (tgt && !self.inf[tgt.pid]) self.infect(tgt, e.pid, d, place);
      }
    });
  };
  G.startDay = function () { var m = this.res.staffMax; this.left = { tracers: m.tracers, field: m.field, analysts: m.analysts }; this.tLeft = this.res.testsCap; this.sLeft = this.res.seqCap; };
  G.msg = function (kind, title, body, from, urgent, extra) { var m = { id: 'M' + (this.nextId++), day: this.day, kind: kind, title: title, from: from || '', urgent: !!urgent, read: false, body: body, refs: [] }; if (extra) Object.keys(extra).forEach(function (k) { m[k] = extra[k]; }); body.forEach(function (l) { var segs = (l.x || []).slice(); (l.rows || []).forEach(function (row) { row.forEach(function (cell) { segs = segs.concat(cell); }); }); segs.forEach(function (s) { if (s && typeof s === 'object' && s.t) m.refs.push(s); }); }); this.msgs.push(m); return m; };
  G.know = function (pid, day, via) { if (!this.known[pid]) this.known[pid] = { reported: day, via: via, tests: [], interviewed: false, traced: false, household: false }; };
  G.resources = function () {
    var self = this, used = this.events.filter(function (e) { return e.hosp !== null && e.hosp <= self.day && (e.death === null || e.death > self.day) && self.day - e.hosp < 10; }).length;
    return { staffHours: { tracers: this.left.tracers, field: this.left.field, analysts: this.left.analysts }, staffMax: this.res.staffMax, staff: { tracers: 4, field: 2, analysts: 2 }, testsLeft: this.tLeft, testsCap: this.res.testsCap, testQueue: this.tests.filter(function (t) { return t.due > self.day; }).length, seqLeft: this.sLeft, seqCap: this.res.seqCap,
      funding: this.res.funding, spent: this.res.spent, economy: this.res.economy, beds: { used: used, cap: 40 }, icu: { used: Math.round(used / 4), cap: 6 }, trust: { overall: this.res.trust, byDistrict: this.res.byDistrict }, credibility: this.credibility, vaccine: null };
  };
  G.inbox = function () { return this.msgs.slice(); };
  G.markRead = function (id) { this.msgs.forEach(function (m) { if (m.id === id) m.read = true; }); };
  G.caseOf = function (pid) {
    var k = this.known[pid], p = this.P(pid), e = this.inf[pid], d = this.day;
    var out = !e ? 'well' : e.death !== null && e.death <= d ? 'died' : e.hosp !== null && e.hosp <= d && d - e.hosp < 10 ? (d - e.hosp < 3 && p.age > 60 ? 'icu' : 'hospital') : e.onset !== null && e.onset <= d && d - e.onset < 10 ? 'unwell' : e.onset !== null && e.onset <= d ? 'recovered' : 'unknown';
    var st = k.tests.some(function (t) { return t.result === 'pos'; }) ? 'confirmed' : k.tests.length && k.tests.every(function (t) { return t.result === 'flu'; }) ? 'discarded' : e && e.onset !== null && e.onset <= d ? 'probable' : 'suspected';
    var c = { pid: pid, name: p.name, age: p.age, sex: p.sex, district: p.district, status: st, onset: e && e.onset !== null && e.onset <= d ? e.onset : null, reported: k.reported, outcome: out, tests: k.tests, interviewed: k.interviewed, traced: k.traced, household: k.household, via: k.via };
    if (e && e.hosp !== null && e.hosp <= d) c.admitted = e.hosp;
    if (e && e.death !== null && e.death <= d) c.died = e.death;
    if (k.interviewed) { var self = this; c.exposures = p.haunts.map(function (h) { return { day: (e ? e.day : d - 5) + Math.round(R(hs(pid + h))() * 2), place: self.pref(h), setting: self.C.places[+h.slice(1)].kind, note: 'regular visits' }; }); if (e && e.by && R(hs(pid))() < .5) c.exposures.push({ day: e.day, person: this.ref(e.by), setting: 'home', note: 'shares a household' }); }
    if (k.traced) c.contacts = this.hhOf[p.hh].filter(function (x) { return x !== pid; });
    if (k.seq) c.seqId = k.seq;
    return c;
  };
  G.lineList = function () { var self = this; return Object.keys(this.known).map(function (pid) { return self.caseOf(pid); }); };
  G.person = function (pid) {
    var p = this.P(pid), k = this.known[pid], o = { pid: pid, name: p.name, age: p.age, sex: p.sex, district: p.district, address: this.C.hAddr[p.hh], heritage: '', portrait: hs(pid), known: {}, notes: [] };
    if (k && k.interviewed) { o.known.occupation = OCC[this.C.occ[p.i] % OCC.length]; o.known.habits = ['choir on Thursdays', 'the gym']; o.known.household = this.hhOf[p.hh].filter(function (x) { return x !== pid; }); var w = this.C.work[p.i]; if (w >= 0) o.known.workplace = this.pref('p' + w); }
    if (k) o.case = this.caseOf(pid);
    return o;
  };
  G.contacts = function () {
    var self = this, out = [];
    Object.keys(this.known).forEach(function (pid) { var k = self.known[pid]; if (!k.traced) return; self.hhOf[self.P(pid).hh].forEach(function (c) { if (c === pid || self.known[c]) return; out.push({ pid: c, name: self.P(c).name, of: [pid], exposure: self.day - 2, setting: 'home', followUntil: self.day + 12, status: self.inf[c] && self.inf[c].onset !== null && self.inf[c].onset <= self.day ? 'ill' : 'monitoring' }); }); });
    return out;
  };
  G.epiCurve = function () {
    var self = this, from = -21, n = this.day - from, o = { from: from, byOnset: [], byReport: [], nowcast: [], admissions: [], deaths: [], ili: [], tests: [], positive: [] };
    for (var i = 0; i < n; i++) { o.byOnset.push(0); o.byReport.push(0); o.admissions.push(0); o.deaths.push(0); o.nowcast.push(null); o.ili.push(20 + Math.round(R(i)() * 10)); o.tests.push(0); o.positive.push(0); }
    var bands = [[0, 4], [5, 17], [18, 34], [35, 49], [50, 64], [65, 79], [80, 200]], byAge = { bands: ['0-4', '5-17', '18-34', '35-49', '50-64', '65-79', '80+'], cases: [0, 0, 0, 0, 0, 0, 0], admitted: [0, 0, 0, 0, 0, 0, 0], died: [0, 0, 0, 0, 0, 0, 0] };
    this.lineList().forEach(function (c) {
      if (c.status === 'discarded' || c.status === 'suspected') return;
      if (c.onset !== null && c.onset - from < n && c.onset >= from) o.byOnset[c.onset - from]++;
      if (c.reported - from < n) o.byReport[c.reported - from]++;
      if (c.admitted !== undefined && c.admitted - from < n) o.admissions[c.admitted - from]++;
      if (c.died !== undefined && c.died - from < n) o.deaths[c.died - from]++;
      var b = bands.findIndex(function (x) { return c.age >= x[0] && c.age <= x[1]; }); byAge.cases[b]++; if (c.admitted !== undefined) byAge.admitted[b]++; if (c.died !== undefined) byAge.died[b]++;
    });
    for (var j = Math.max(0, n - 7); j < n; j++) { var f = (n - j) / 7, v = o.byOnset[j]; o.nowcast[j] = { lo: v + Math.round(v * f * .4), hi: v + Math.round((v + 2) * f * 1.6) }; }
    o.byAge = byAge;
    return o;
  };
  G.wastewater = function () {
    var self = this, o = { from: -21, sampling: this._ord.some(function (x) { return x.type === 'wastewater'; }) || this.day > 6, unit: 'copies/L (norm.)', byDistrict: {}, flag: {} };
    if (!o.sampling) return o;
    this.city.districts.forEach(function (D) { var a = []; for (var d = -21; d < self.day; d++) { var s = 0; self.events.forEach(function (e) { if (self.P(e.pid).district === D.id && d - e.day >= 1 && d - e.day < 12) s++; }); a.push(d < 0 ? null : Math.round(s * 30 + R(hs(D.id + d))() * 40)); } o.byDistrict[D.id] = a; });
    return o;
  };
  G.tree = function () {
    var self = this, nodes = [];
    this.seqs.forEach(function (s) { if (s.due > self.day) return; var e = self.inf[s.pid]; nodes.push({ id: 'S' + s.pid, sampleOf: s.pid, parent: null, mutations: e ? e.genome : [] }); });
    return { root: null, nodes: nodes };
  };
  G.clusters = function () {
    var by = {}, self = this;
    Object.keys(this.known).forEach(function (pid) { if (!self.known[pid].interviewed) return; self.P(pid).haunts.forEach(function (h) { (by[h] = by[h] || []).push(pid); }); });
    return Object.keys(by).filter(function (h) { return by[h].length >= 2; }).map(function (h) { return { id: 'K' + h, place: self.pref(h), kind: self.C.places[+h.slice(1)].kind, cases: by[h], firstOnset: -5, lastOnset: 0, size: by[h].length, note: '' }; });
  };
  var CAT = [
    ['interview', 'Interview', 'investigate', { hours: { tracers: 2 } }, 'case', 'Symptoms, onset, where they have been in the 14 days before, who they met.'],
    ['trace', 'Trace contacts', 'investigate', { hours: { tracers: 3 } }, 'case', 'Find their contacts and follow them up for 14 days.'],
    ['household', 'Household study', 'investigate', { hours: { field: 3 }, tests: 3 }, 'case', 'Test everyone at home now and at day 7 and 14; record who stays well.'],
    ['site_visit', 'Site visit', 'investigate', { hours: { field: 4 } }, 'place', 'Attendance lists, CO2 readings, layout.'],
    ['questionnaire', 'Cluster questionnaire', 'investigate', { hours: { analysts: 4, field: 2 } }, 'place', 'Attack rates by activity among attendees.'],
    ['record_review', 'Hospital record review', 'investigate', { hours: { analysts: 4 } }, 'none', 'Admissions by age and symptoms; search for missed cases.'],
    ['test', 'Test', 'lab', { tests: 1 }, 'person', 'The extended respiratory panel; result in 1–2 days.'],
    ['sequence', 'Sequence', 'lab', { seq: 1, hours: { analysts: 1 } }, 'case', 'Whole genome from a stored positive; 3–5 days.'],
    ['declare_novel', 'Novel-agent screen', 'lab', { tests: 3, hours: { analysts: 2 } }, 'none', 'Ask the reference lab to confirm a new agent. Needs panel-negative samples from 3 linked cases.'],
    ['serosurvey', 'Serosurvey', 'lab', { tests: 10, money: 20 }, 'none', 'Antibodies in a random sample of residents.', 0, [{ id: 'n', label: 'People sampled', type: 'int', min: 100, max: 1000, default: 300 }]],
    ['trial', 'Treatment trial', 'lab', { money: 40, hours: { analysts: 6 } }, 'none', 'Randomise admitted patients to an existing antiviral or usual care.', 0, [{ id: 'n', label: 'Patients enrolled', type: 'int', min: 40, max: 400, default: 120 }]],
    ['briefing', 'Press briefing', 'communicate', { hours: { analysts: 2 } }, 'none', 'Say what you know.'],
    ['request_funding', 'Ask the council for money', 'admin', {}, 'none', 'A request to the next council meeting.', 0, [{ id: 'amount', label: 'Amount (£k)', type: 'int', min: 50, max: 1000, default: 200 }]],
    ['isolate', 'Isolation of cases', 'contain', { money: 4 }, 'none', 'Confirmed and symptomatic cases isolate with support payments.', 1, null, true],
    ['quarantine', 'Quarantine contacts', 'contain', { money: 6 }, 'none', 'Traced contacts stay home 10 days.', 2, null, true],
    ['close_place', 'Close a venue', 'contain', { money: 2 }, 'place', 'Shut one venue, school or workplace.', 1, null, true],
    ['close_schools', 'Close schools', 'contain', { money: 30 }, 'none', 'Schools, nurseries and the university close.', 2, null, true],
    ['gatherings', 'Limit gatherings', 'contain', { money: 10 }, 'none', 'Caps on faith, choir, stadium and events.', 3, [{ id: 'max', label: 'Maximum', type: 'choice', options: [{ id: 30, label: '30 people' }, { id: 6, label: '6 people' }] }], true],
    ['masks', 'Masks indoors', 'contain', { money: 2 }, 'none', 'Masks in shops, transport and workplaces.', 4, null, true],
    ['lockdown', 'Lockdown', 'contain', { money: 200 }, 'none', 'Stay at home except for essentials.', 4, null, true],
    ['wastewater', 'Wastewater sampling', 'lab', { money: 3 }, 'none', 'Sample sewage in every district daily.', 2, null, true],
    ['surge', 'Hospital surge', 'protect', { money: 25 }, 'none', 'Extra beds and ICU.', 7, null, true],
    ['shielding', 'Shielding advice', 'protect', { money: 1 }, 'none', 'Advice for the vulnerable group.', 3, [{ id: 'group', label: 'Group', type: 'choice', options: [{ id: 'over70', label: 'Over 70s' }, { id: 'children', label: 'Children' }, { id: 'clinical', label: 'Clinically vulnerable' }] }], true],
    ['vaccinate', 'Vaccinate', 'protect', { money: 20 }, 'none', 'Roll out the vaccine in your priority order.', 14, [{ id: 'priority', label: 'Priority order', type: 'order', options: [{ id: 'care', label: 'Care homes' }, { id: 'hcw', label: 'Health workers' }, { id: 'over70', label: 'Over 70s' }, { id: 'clinical', label: 'Clinically vulnerable' }, { id: 'adults', label: 'Other adults' }] }], true]
  ];
  var MULT = { isolate: .85, quarantine: .8, close_place: .95, close_schools: .85, gatherings: .8, masks: .85, lockdown: .45 };
  G.actions = function () {
    var self = this;
    return CAT.map(function (c) {
      var ok = true, why = c[5], costs = c[3];
      if (costs.hours) Object.keys(costs.hours).forEach(function (k) { if (self.left[k] < costs.hours[k]) { ok = false; why = 'Not enough ' + k + ' hours left today'; } });
      if (costs.tests && self.tLeft < costs.tests) { ok = false; why = 'No tests left today'; }
      if (costs.seq && self.sLeft < costs.seq) { ok = false; why = 'No sequencing slots left today'; }
      if (c[0] === 'declare_novel' && (self.actNo > 1 || self.pendingDeclare)) { ok = false; why = self.actNo > 1 ? 'The agent is already confirmed' : 'Samples are at the reference lab'; }
      if (c[0] === 'vaccinate') { ok = false; why = 'No vaccine yet'; }
      if (c[8] && self._ord.some(function (o) { return o.type === c[0] && c[4] === 'none'; })) { ok = false; why = 'Already in force'; }
      return { id: c[0], label: c[1], area: c[2], order: !!c[8], costs: costs, target: c[4], params: c[7] || undefined, lag: c[6], available: ok, why: why, desc: c[5], economy: c[8] ? (costs.money || 0) / 100 : undefined, targetKinds: c[0] === 'close_place' ? ['school', 'pub', 'gym', 'choir', 'market', 'office', 'factory', 'restaurant'] : undefined };
    });
  };
  G.canAct = function (id, target) { var a = this.actions().filter(function (x) { return x.id === id; })[0]; if (!a) return 'Unknown'; if (!a.available) return a.why; if (id === 'interview' && this.known[target] && this.known[target].interviewed) return 'Already interviewed'; return null; };
  G.spend = function (c) { var self = this; if (c.hours) Object.keys(c.hours).forEach(function (k) { self.left[k] -= c.hours[k]; }); if (c.tests) this.tLeft -= c.tests; if (c.seq) this.sLeft -= c.seq; if (c.money) { this.res.funding -= c.money; this.res.spent += c.money; } };
  G.act = function (id, target, params) {
    var a = this.actions().filter(function (x) { return x.id === id; })[0];
    if (!a) return { ok: false, err: 'Unknown action', msgs: [] };
    if (a.order) return this.order(id, Object.assign({ target: target }, params || {}));
    var why = this.canAct(id, target); if (why) return { ok: false, err: why, msgs: [] };
    this.log.push(['act', id, target, params]);
    this.spend(a.costs);
    var k = this.known[target], msgs = [], self = this, P = target && String(target).charAt(0) === 'a' ? this.P(target) : null;
    if (id === 'interview' && k) { k.interviewed = true; var e = this.inf[target]; msgs.push(this.msg('interview', 'Interview: ' + P.name, [{ k: 'q', who: this.ref(target), x: ['I started feeling rough ' + (e && e.onset !== null ? 'on ' + this.dateLabel(e.onset) : 'a few days ago') + '. Temperature, a cough that would not stop, and I couldn\'t taste my tea.'] }, { k: 'p', x: ['Places in the 14 days before onset: '].concat(P.haunts.map(function (h, i) { return i ? [', ', self.pref(h)] : [self.pref(h)]; }).reduce(function (a, b) { return a.concat(b); }, [])).concat(['.']) }, { k: 'n', x: ['Recall is patchy for the first week.'] }], 'Contact tracing team')); }
    else if (id === 'trace' && k) { k.traced = true; msgs.push(this.msg('result', 'Contacts traced: ' + P.name, [{ k: 'p', x: [String(this.hhOf[P.hh].length - 1) + ' household contacts listed and under follow-up.'] }], 'Contact tracing team')); }
    else if (id === 'test') { this.know(target, this.day, 'testing'); var due = this.day + 1 + Math.floor(this.r() * 2); this.tests.push({ pid: target, day: this.day, due: due }); this.known[target].tests.push({ day: this.day, kind: this.actNo > 1 ? 'pcr' : 'panel', result: 'pending' }); }
    else if (id === 'sequence') { this.seqs.push({ pid: target, day: this.day, due: this.day + 3 }); if (k) k.seq = 'S' + target; }
    else if (id === 'household' && k) { k.household = true; this.hhOf[P.hh].forEach(function (q) { if (q === target) return; self.know(q, self.day, 'household'); self.tests.push({ pid: q, day: self.day, due: self.day + 1 }); self.known[q].tests.push({ day: self.day, kind: self.actNo > 1 ? 'pcr' : 'panel', result: 'pending' }); }); }
    else if (id === 'declare_novel') { if (!this.pendingDeclare) this.pendingDeclare = this.day + 2; }
    else if (id === 'site_visit') msgs.push(this.msg('result', 'Site visit: ' + this.pref(target).d, [{ k: 'p', x: ['Our field team visited ', this.pref(target), '. CO2 peaked at 1,900 ppm during Thursday evening sessions: poorly ventilated.'] }, { k: 'table', head: ['Day', 'Attendance'], rows: [[['Mon'], ['42']], [['Thu'], ['118']], [['Sat'], ['240']]] }], 'Field team'));
    else if (id === 'briefing') this.res.trust += 2;
    return { ok: true, msgs: msgs };
  };
  G.order = function (id, params) {
    params = params || {};
    var a = this.actions().filter(function (x) { return x.id === id; })[0];
    if (!a) return { ok: false, err: 'Unknown order' };
    if (!a.available) return { ok: false, err: a.why };
    this.log.push(['order', id, params]);
    var o = { id: 'O' + (this.nextId++), type: id, label: a.label, target: params.target ? this.pref(params.target) : null, params: params, since: this.day, lag: a.lag, effectFrom: this.day + a.lag, compliance: 0.55 + this.r() * .3, costPerDay: a.costs.money || 0, economyPerDay: (a.costs.money || 0) / 100, mult: MULT[id] || 1 };
    this._ord.push(o);
    return { ok: true, order: o, msgs: [] };
  };
  G.orders = function () { return this._ord.map(function (o) { var c = {}; Object.keys(o).forEach(function (k) { if (k !== 'mult') c[k] = o[k]; }); return c; }); };
  G.revoke = function (id) { this.log.push(['revoke', id]); this._ord = this._ord.filter(function (o) { return o.id !== id; }); return { ok: true, msgs: [] }; };
  G.answer = function (mid, choice) { this.log.push(['answer', mid, choice]); var m = this.msgs.filter(function (x) { return x.id === mid; })[0]; if (m) m.answered = choice; if (choice === 'reassure') this.res.trust -= 2; return { ok: true, msgs: [] }; };
  var TRAITS = [
    { id: 'route', label: 'Route', type: 'choice', options: ['airborne', 'droplet', 'contact', 'gut', 'animal'], key: true },
    { id: 'incubation', label: 'Incubation', type: 'number', unit: 'days', min: 1, max: 16, key: true },
    { id: 'presym', label: 'Spread before symptoms', type: 'percent', min: 0, max: 70, key: true },
    { id: 'asym', label: 'Never ill', type: 'percent', min: 0, max: 80, key: true },
    { id: 'R', label: 'R', type: 'number', min: 0.5, max: 6, key: true },
    { id: 'ifr', label: 'Infection fatality', type: 'percent', min: 0.05, max: 15, key: true },
    { id: 'ageRisk', label: 'Who it hits', type: 'choice', options: [{ id: 'elderly', label: 'The elderly' }, { id: 'young-adult', label: 'Young adults' }, { id: 'children', label: 'Children' }, { id: 'even', label: 'All ages evenly' }], key: true },
    { id: 'ihr', label: 'Hospitalised', type: 'percent', min: 0, max: 40 },
    { id: 'source', label: 'Source', type: 'choice', options: ['market', 'farm', 'lab', 'traveller', 'hospital'] },
    { id: 'originCase', label: 'First case', type: 'person' },
    { id: 'treatment', label: 'Treatment', type: 'choice', options: ['none', 'partial', 'good'] },
    { id: 'caseDef', label: 'Case definition', type: 'multi', options: [{ id: 'fever', label: 'Fever' }, { id: 'cough', label: 'Cough' }, { id: 'anosmia', label: 'Loss of smell' }, { id: 'fatigue', label: 'Fatigue' }, { id: 'rash', label: 'Rash' }, { id: 'diarrhoea', label: 'Diarrhoea' }, { id: 'red_eyes', label: 'Red eyes' }] }
  ];
  G.estimates = function () { return { traits: TRAITS, draft: this.draft, published: this.pub, history: this.hist }; };
  G.setDraft = function (id, v) { this.log.push(['draft', id, v]); if (v === null || v === undefined) delete this.draft[id]; else this.draft[id] = v; };
  G.publish = function (v) {
    this.log.push(['publish', v]);
    var self = this; Object.keys(v).forEach(function (k) { var p = self.pub[k]; self.pub[k] = { value: v[k], day: self.day, revisions: p ? p.revisions + 1 : 0 }; self.hist.push({ day: self.day, trait: k, value: v[k] }); delete self.draft[k]; });
    var m = this.msg('press', 'Health chief sets out what we know', [{ k: 'p', x: ['The public health team has published its first estimates about the illness. "We will update these as we learn more," a spokesperson said.'] }], this.city.name + ' Courier');
    if (this.actNo === 2 && TRAITS.filter(function (t) { return t.key; }).every(function (t) { return self.pub[t.id]; })) { this.actNo = 3; this.actLabel = 'Contain'; }
    return { ok: true, msgs: [m], trust: this.res.trust };
  };
  G.endDay = function () {
    this.log.push(['end']);
    var self = this, before = this.msgs.length, events = [];
    this.spread(this.day);
    this.day++;
    this.events.forEach(function (e) { if (self.known[e.pid]) return; if (e.onset !== null && self.day - e.onset === 3 && R(hs(e.pid))() < (self.actNo > 1 ? .7 : .35)) self.know(e.pid, self.day, 'gp'); if (e.hosp === self.day) self.know(e.pid, self.day, 'hospital'); });
    this.tests.forEach(function (t) {
      if (t.due !== self.day) return;
      var e = self.inf[t.pid], inf = e && self.day - e.day >= 1 && self.day - e.day < 14;
      var rec = self.known[t.pid].tests.filter(function (x) { return x.result === 'pending'; })[0];
      var res = inf ? (self.actNo > 1 ? 'pos' : 'neg') : (R(hs(t.pid + 'f'))() < .5 ? 'flu' : 'neg');
      if (rec) { rec.result = res; rec.resultDay = self.day; }
      self.msg('lab', (res === 'pos' ? 'Positive: ' : res === 'flu' ? 'Influenza A: ' : 'Panel negative: ') + self.P(t.pid).name, [{ k: 'p', x: ['Sample from ', self.ref(t.pid), ' taken ' + self.dateLabel(t.day) + '.'] }, { k: 'm', x: [res === 'neg' ? 'FluA neg  FluB neg  RSV neg  hMPV neg  AdV neg  SARS-CoV-2 neg' : res === 'flu' ? 'FluA POS  FluB neg  RSV neg' : 'Target 1 POS  Ct 24.1'] }], 'Public Health Laboratory');
    });
    this.seqs.forEach(function (s) { if (s.due === self.day) self.msg('lab', 'Genome ready: ' + self.P(s.pid).name, [{ k: 'p', x: ['Sequence for ', self.ref(s.pid), ' has been added to the tree.'] }], 'Sequencing unit'); });
    if (this.pendingDeclare === this.day && this.actNo === 1) { this.actNo = 2; this.actLabel = 'Characterise'; this.agentName = 'Agent ' + this.city.name.slice(0, 2).toUpperCase() + '-1'; events.push({ kind: 'act', act: 2, text: 'Novel agent confirmed', day: this.day }); this.msg('lab', 'Novel agent confirmed: ' + this.agentName, [{ k: 'p', x: ['The reference laboratory confirms a previously undescribed virus in samples from ' + this.city.name + '.'] }], 'Reference Laboratory', true); }
    if (this.day % 7 === 3) this.msg('council', 'Emergency committee — minutes', [{ k: 'h', x: ['Item 1: the market'] }, { k: 'p', x: ['Cllr Pauline Grey (Leader) asked whether the market could stay open for the weekend trade.'] }, { k: 'q', x: ['We cannot shut the city on the strength of four pneumonias.'] }, { k: 'h', x: ['Item 2: funding'] }, { k: 'p', x: ['The committee will consider a request for additional tracers at its next meeting.'] }], this.city.name + ' City Council', false, { choices: [{ id: 'keep', label: 'Recommend the market stays open', hint: 'Council happy; risk continues' }, { id: 'close', label: 'Recommend closing the market', hint: 'Costs trust with traders' }] });
    if (this.day === 2) this.msg('mayor', 'The Mayor is on the line', [{ k: 'q', x: ['I have the Courier asking about a mystery bug at St Anne\'s. What do I tell them? And please — not the word plague.'] }], 'Mayor Colin Hart', true, { choices: [{ id: 'reassure', label: '"There is no cause for alarm."', hint: 'Calms things now; costly if wrong' }, { id: 'honest', label: '"We are investigating. We will say more when we know more."', hint: 'Honest; some anxiety' }] });
    if (this.day === 4) this.msg('rumour', 'Rumour: "it\'s in the water"', [{ k: 'p', x: ['A post claiming the reservoir is contaminated has been shared 2,300 times in ', { t: 'district', id: 'd3', d: this.city.districts[3].name }, '. Bottled water is selling out.'] }], 'Social listening');
    if (this.day === 3) this.msg('press', 'MYSTERY BUG AT ST ANNE\'S', [{ k: 'p', x: ['Patients on a ward at St Anne\'s Hospital have been struck down by a mystery illness, the Courier can reveal. Staff are "baffled", a source said.'] }, { k: 'p', x: ['A hospital spokesperson declined to comment.'] }], 'The ' + this.city.name + ' Courier');
    this.events.forEach(function (e) { if (e.death === self.day && self.known[e.pid]) self.msg('death', 'Death: ' + self.P(e.pid).name + ', ' + self.P(e.pid).age, [{ k: 'p', x: [self.ref(e.pid), ' died at St Anne\'s this morning.'] }], "St Anne's Hospital"); });
    if (this.day >= 70) { this.over = true; this.outcome = { kind: 'timeout', day: this.day, title: 'Ten weeks on', text: 'The emergency period ended with the virus still circulating.' }; }
    this.startDay();
    return { day: this.day, newMsgs: this.msgs.slice(before), events: events, over: this.over, outcome: this.outcome };
  };
  G.advance = function (n) { var all = [], ev = []; for (var i = 0; i < n; i++) { var r = this.endDay(); all = all.concat(r.newMsgs); ev = ev.concat(r.events); if (r.over || r.events.length) break; } return { day: this.day, newMsgs: all, events: ev, over: this.over, outcome: this.outcome }; };
  G.mentorStatus = function () { var d = this.day; return { nudge: { ok: this.mUsed.nudge !== d, why: this.mUsed.nudge === d ? 'Once a day' : '' }, pointer: { ok: this.left.analysts >= 3, why: this.left.analysts >= 3 ? '' : 'Needs 3 analyst hours' }, answer: { ok: true }, used: {} }; };
  G.mentor = function (tier) {
    this.log.push(['mentor', tier]);
    var T = { nudge: 'Have you sent samples that test negative for everything we know? That is how you get the reference lab to look.', pointer: 'The market keeps coming up. A site visit there would tell you who was there, and when.', answer: 'It is new, it spreads in the air indoors, and the first cases all worked the fish hall at the market.' };
    if (tier === 'nudge') this.mUsed.nudge = this.day;
    if (tier === 'pointer') this.left.analysts -= 3;
    if (tier === 'answer') this.credibility -= 10;
    return { ok: true, tier: tier, text: T[tier], action: tier === 'pointer' ? { id: 'site_visit', target: this.srcPlace } : null, charged: true };
  };
  G.debrief = function () {
    var self = this, from = -21, n = this.day - from, act = { infections: [], deaths: [], hospital: [] }, gh = { infections: [], deaths: [], hospital: [] };
    for (var i = 0; i < n; i++) { var d = from + i; var c = this.events.filter(function (e) { return e.day === d; }).length, dd = this.events.filter(function (e) { return e.death === d; }).length; act.infections.push(c); act.deaths.push(dd); act.hospital.push(this.events.filter(function (e) { return e.hosp === d; }).length); gh.infections.push(Math.round(c * (1 + Math.max(0, d) * .07))); gh.deaths.push(Math.round(dd * (1 + Math.max(0, d) * .07) * 10) / 10); gh.hospital.push(0); }
    var named = this.events.filter(function (e) { return e.death !== null && e.death <= self.day; }).map(function (e) { var p = self.P(e.pid); return { pid: e.pid, name: p.name, age: p.age, district: p.district, day: e.death, note: OCC[self.C.occ[p.i] % OCC.length] }; });
    var P = this.path, card = { route: P.route, incubation: P.incMean, presym: Math.round(P.presym * 100), asym: Math.round(P.asym * 100), R: P.R, ifr: +(P.ifr * 100).toFixed(2), ageRisk: P.ageRisk, source: P.source, treatment: P.treatment, symptoms: P.symptoms.map(function (s) { return { id: s.id, label: s.id.replace(/_/g, ' '), p: s.p }; }), tell: P.tell };
    var est = TRAITS.map(function (t) { var p = self.pub[t.id], tv = card[t.id]; var g = 'none'; if (p && tv !== undefined) { g = typeof tv === 'number' ? (Math.abs(p.value - tv) / Math.max(.1, tv) < .2 ? 'good' : Math.abs(p.value - tv) / Math.max(.1, tv) < .5 ? 'close' : 'wrong') : (String(p.value) === String(tv) ? 'good' : 'wrong'); } return { trait: t.id, label: t.label, truth: tv, published: p ? p.value : null, day: p ? p.day : null, error: null, grade: g }; });
    var frames = []; for (var d2 = -18; d2 <= this.day; d2++) frames.push({ day: d2, infections: this.events.filter(function (e) { return e.day === d2; }).map(function (e) { var p = self.P(e.pid); return [e.pid, p.pos[0], p.pos[1], e.place]; }) });
    return { truth: { card: card }, estimates: est, curves: { from: from, actual: act, ghost: gh }, deaths: { actual: named.length, ghost: Math.round(named.length * 3 + 6), named: named }, costs: { spent: this.res.spent, economy: this.res.economy, closureDays: 14, orders: [] }, trust: { start: 62, end: this.res.trust }, origin: { primary: this.events[0].pid, primaryName: this.P(this.events[0].pid).name, source: P.source, place: this.srcPlace, day: -18, found: false, indexCase: Object.keys(this.known)[0] },
      frames: frames, tree: { nodes: this.events.map(function (e) { var pl = e.place && String(e.place).charAt(0) === 'p' ? self.C.places[+e.place.slice(1)] : null; return { pid: e.pid, infector: e.by, day: e.day, setting: pl ? pl.kind : e.place, place: pl ? pl.id : null }; }) }, score: { total: 640, lines: [{ label: 'Lives', pts: 300 }, { label: 'Understanding', pts: 220 }, { label: 'Cost', pts: 120 }] }, grade: 'B' };
  };
  G.save = function () { return JSON.stringify({ seed: this.seed, opts: { grade: this.grade, tutorial: this.tutorial }, log: this.log }); };
  IX.GRADES = [{ id: 'probationer', label: 'Probationer', blurb: 'Generous capacity, clearer data, a patient council.' }, { id: 'consultant', label: 'Consultant', blurb: 'The standard game.' }, { id: 'director', label: 'Director', blurb: 'Noisy reports, slow labs, a nervous city.' }];
  IX.MENTOR = { name: 'Dr Ife Okonjo', title: 'Retired consultant epidemiologist', bio: 'Ran the regional outbreak team for twenty years.', costs: { nudge: 0, pointer: { analysts: 3 }, answer: { credibility: 10 } } };
  IX.newGame = function (seed, opts) { return new Game(seed, opts); };
  IX.load = function (json) {
    var s = JSON.parse(json), g = new Game(s.seed, s.opts);
    s.log.forEach(function (l) { if (l[0] === 'act') g.act(l[1], l[2], l[3]); else if (l[0] === 'order') g.order(l[1], l[2]); else if (l[0] === 'revoke') g.revoke(l[1]); else if (l[0] === 'publish') g.publish(l[1]); else if (l[0] === 'end') g.endDay(); else if (l[0] === 'mentor') g.mentor(l[1]); else if (l[0] === 'answer') g.answer(l[1], l[2]); else if (l[0] === 'draft') g.setDraft(l[1], l[2]); });
    return g;
  };
})();
