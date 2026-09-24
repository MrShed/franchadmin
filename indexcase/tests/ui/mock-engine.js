/* INDEX CASE — UI development mock of the IX engine (NOT shipped).
 * Implements the SPEC.md API loosely so the interface can be built before the
 * real engine lands. Used only by tests/ui/build-dev.sh. */
var IX = (function () {
  'use strict';
  function R(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hs(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function pick(r, a) { return a[Math.floor(r() * a.length)]; }
  function pois(r, l) { var L = Math.exp(-l), k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }
  var FIRST = ['Amira', 'Tom', 'Grace', 'Oluwaseun', 'Priya', 'Jack', 'Siobhan', 'Mohammed', 'Ellie', 'Kwame', 'Harriet', 'Declan', 'Mei', 'Rhys', 'Fatima', 'George', 'Zainab', 'Callum', 'Agnieszka', 'Ravi', 'Bethan', 'Leon', 'Joyce', 'Tariq', 'Niamh', 'Samuel', 'Aisha', 'Owen', 'Rosa', 'Imran', 'Margaret', 'Dev', 'Lily', 'Ade', 'Hannah', 'Kofi', 'Doreen', 'Arjun', 'Isla', 'Stanley'];
  var LAST = ['Okafor', 'Hughes', 'Patel', 'Walsh', 'Begum', 'Clarke', 'Nowak', 'Evans', 'Chen', 'Mensah', 'Price', 'Doyle', 'Khan', 'Thornton', 'Ahmed', 'Bell', 'Singh', 'Morgan', 'Ali', 'Fletcher', 'Kowalski', 'Reid', 'Osei', 'Lloyd', 'Hussain', 'Barker', 'Mahmood', 'Shaw', 'Adeyemi', 'Pearce'];
  var DN = ['Castlegate', 'Harrow Fields', 'St Anne\'s', 'Millbrook', 'Old Quay', 'Wexmoor Park', 'Tanner\'s Row', 'Redhill', 'Northgate', 'Ashby Vale', 'Coldharbour', 'Friar\'s Green', 'Bramley', 'Westcliff'];
  var START = Date.UTC(2026, 1, 9);
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function voronoi(pts, hull) {
    return pts.map(function (p, i) {
      var poly = hull.slice();
      pts.forEach(function (q, j) {
        if (i === j) return;
        var mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, nx = q[0] - p[0], ny = q[1] - p[1];
        var out = [];
        for (var k = 0; k < poly.length; k++) {
          var a = poly[k], b = poly[(k + 1) % poly.length];
          var da = (a[0] - mx) * nx + (a[1] - my) * ny, db = (b[0] - mx) * nx + (b[1] - my) * ny;
          if (da <= 0) out.push(a);
          if ((da <= 0) !== (db <= 0)) { var t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
        }
        poly = out;
      });
      return poly;
    });
  }
  function inPoly(x, y, poly) { var c = false; for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) { var a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }

  function Game(seed, opts) {
    opts = opts || {};
    this.seed = String(seed); this.opts = opts; this.log = [];
    var r = this.r = R(hs(seed));
    // city
    var hull = []; for (var k = 0; k < 18; k++) { var a = k / 18 * Math.PI * 2, rr = 0.44 + r() * 0.05; hull.push([0.5 + Math.cos(a) * rr, 0.5 + Math.sin(a) * rr * 0.92]); }
    var pts = []; var n = 12;
    for (var i = 0; i < n; i++) { var ang = i < 1 ? 0 : (i < 5 ? i / 4 : i / 7) * Math.PI * 2 + r(), rad = i < 1 ? 0.02 : i < 5 ? 0.17 : 0.33; pts.push([0.5 + Math.cos(ang) * rad + (r() - .5) * .05, 0.5 + Math.sin(ang) * rad * .9 + (r() - .5) * .05]); }
    var polys = voronoi(pts, hull);
    var names = DN.slice().sort(function () { return r() - .5; });
    var districts = pts.map(function (p, i) { return { id: 'd' + i, name: names[i], poly: polys[i], centre: p, pop: Math.round(15000 + r() * 12000), deprivation: r() }; });
    var kinds = [['hospital', 'St Anne\'s Hospital'], ['carehome', 'Elm Lodge'], ['carehome', 'Beechwood House'], ['school', 'Millbrook Primary'], ['school', 'Redhill Academy'], ['school', 'Northgate High'], ['pub', 'The Crown & Anchor'], ['pub', 'The Lamb'], ['pub', 'Quayside Tap'], ['gym', 'IronWorks Gym'], ['church', 'St Peter\'s'], ['mosque', 'Central Mosque'], ['temple', 'Sri Murugan Temple'], ['choir', 'Wexmoor Community Choir'], ['stadium', 'Castle Road Ground'], ['market', 'Old Quay Market'], ['farm', 'Hollins Poultry'], ['lab', 'Harwood Biosciences'], ['hub', 'Central Station'], ['work', 'Parcelforce Depot'], ['work', 'Brightwater Call Centre'], ['venue', 'The Assembly Rooms'], ['work', 'Kellan Foods'], ['hospital', 'Redhill Community Hospital']];
    var places = kinds.map(function (kk, i) { var d = districts[Math.floor(r() * n)]; return { id: 'p' + i, kind: kk[0], name: kk[1], district: d.id, pos: [d.centre[0] + (r() - .5) * .08, d.centre[1] + (r() - .5) * .08] }; });
    this.city = { name: 'Wexmoor', districts: districts, places: places, pop: 250000 };
    // people
    var people = [];
    for (var p = 0; p < 3000; p++) {
      var di = Math.floor(r() * n), D = districts[di], x, y, g = 0;
      do { x = D.centre[0] + (r() - .5) * .22; y = D.centre[1] + (r() - .5) * .22; g++; } while (!inPoly(x, y, D.poly) && g < 30);
      if (g >= 30) { x = D.centre[0]; y = D.centre[1]; }
      var age = Math.min(97, Math.floor(-Math.log(1 - r() * .985) * 34));
      people.push({ pid: 'x' + p, name: pick(r, FIRST) + ' ' + pick(r, LAST), age: age, sex: r() < .5 ? 'F' : 'M', district: D.id, pos: [x, y], hh: Math.floor(p / 3), haunts: [places[Math.floor(r() * places.length)].id, places[Math.floor(r() * places.length)].id] });
    }
    this.people = people;
    this.truth = { route: 'airborne', incubation: 5.2, presym: 0.32, asym: 0.28, R: 2.6, ifr: 0.014, ageRisk: 'elderly', symptoms: [['fever', .82], ['dry cough', .71], ['loss of taste', .44], ['fatigue', .6], ['headache', .35]], tell: 'loss of taste', source: 'market', treatment: 'partial', mutation: 0.7 };
    this.day = 0; this.stage = 1; this.over = false; this.outcome = null;
    this.inf = {}; this.events = []; this.msgs = []; this.known = {}; this.tests = []; this.seqs = []; this.nodes = []; this._ord = []; this.pub = {}; this.pubHist = []; this.nextId = 1;
    this.res = { staffHours: { tracers: 24, field: 12, analysts: 8 }, testsLeft: 30, seqLeft: 4, funding: 250000, beds: 180, icu: 16, trust: { overall: 0.66, byDistrict: {} } };
    districts.forEach(function (d) { this.res.trust.byDistrict[d.id] = 0.5 + r() * .35; }, this);
    // seed infections before day 0
    var idx = people[5]; idx.haunts[0] = 'p15';
    this.infect(idx, null, -14, 'p15');
    for (var d0 = -14; d0 < 0; d0++) this.spread(d0);
    this.hosp = [];
    var self = this;
    // initial alert: 4 hospital cases
    var inf = Object.keys(this.inf).map(function (k) { return self.inf[k]; }).filter(function (e) { return e.onset !== null && e.onset < 0; }).slice(0, 4);
    inf.forEach(function (e) { self.know(e.pid, -1, 'hospital'); });
    this.msg('report', 'Unexplained pneumonia — St Anne\'s, Ward 4', [{ k: 'p', x: ['Dr Rachel Amos, consultant respiratory physician: four adults admitted in five days with severe atypical pneumonia. Routine respiratory panels negative so far. Patients: ', this.ref(inf[0].pid), ', ', this.ref(inf[1].pid), ' and others. Would public health like to take a look?'] }, { k: 'p', x: ['Two of them mention the ', { ref: 'place', id: 'p15', text: 'Old Quay Market' }, '.'] }], 'St Anne\'s Hospital');
    this.msg('mentor', 'A note from Dr Okonjo', [{ k: 'p', x: ['Morning. Four odd pneumonias is either nothing or everything. Interview them, test them for the usual suspects, and look at where they have been. I\'ll be on the phone if you need me.'] }], 'Dr Ife Okonjo');
    this.startRes();
  }
  var G = Game.prototype;
  G.ref = function (pid) { var p = this.people[+pid.slice(1)]; return { ref: 'person', id: pid, text: p.name }; };
  G.P = function (pid) { return this.people[+pid.slice(1)]; };
  G.infect = function (p, by, day, place) {
    if (this.inf[p.pid]) return;
    var r = this.r;
    var sym = r() > this.truth.asym;
    var inc = Math.max(1, Math.round(this.truth.incubation + (r() - .5) * 5));
    var sev = sym && r() < (p.age > 70 ? .3 : p.age > 50 ? .08 : .02);
    var die = sev && r() < (p.age > 75 ? .4 : .12);
    var par = by ? this.inf[by] : null;
    var genome = par ? par.genome.slice() : [];
    for (var m = pois(r, this.truth.mutation); m > 0; m--) genome.push(this.nextId++);
    var e = { pid: p.pid, by: by, day: day, place: place, onset: sym ? day + inc : null, hosp: sev ? day + inc + 4 : null, death: die ? day + inc + 12 : null, genome: genome };
    this.inf[p.pid] = e; this.events.push(e);
  };
  G.mult = function () { var m = 1; this._ord.forEach(function (o) { if (this.day >= o.since + o.lag) m *= o.mult; }, this); return m; };
  G.spread = function (d) {
    var r = this.r, self = this, list = this.events.slice(), m = d >= 0 ? this.mult() : 1;
    list.forEach(function (e) {
      var age = d - e.day; if (age < 2 || age > 9) return;
      if (e.death !== null && d >= e.death) return;
      var n = pois(r, self.truth.R / 7 * m * (e.onset === null ? .6 : 1));
      for (var i = 0; i < n; i++) {
        var src = self.P(e.pid), tgt, place = null, u = r();
        if (u < .35) tgt = self.people[Math.min(self.people.length - 1, src.hh * 3 + Math.floor(r() * 3))], place = 'home';
        else if (u < .7) { place = pick(r, src.haunts); var c = self.people.filter(function (q) { return q.haunts.indexOf(place) >= 0; }); tgt = c.length ? pick(r, c) : null; }
        else { var dd = self.people.filter(function (q) { return q.district === src.district; }); tgt = pick(r, dd); place = 'community'; }
        if (tgt && !self.inf[tgt.pid]) self.infect(tgt, e.pid, d, place);
      }
    });
  };
  G.startRes = function () { this.left = JSON.parse(JSON.stringify(this.res.staffHours)); this.tLeft = this.res.testsLeft; this.sLeft = this.res.seqLeft; };
  G.msg = function (kind, title, body, from) { var m = { id: 'm' + (this.nextId++), day: this.day, kind: kind, title: title, body: body, from: from || '' }; this.msgs.push(m); return m; };
  G.know = function (pid, day, how) { if (!this.known[pid]) this.known[pid] = { reported: day, how: how, tests: [], interviewed: false, traced: false }; };
  G.dateLabel = function (d) { var t = new Date(START + d * 864e5); return WD[t.getUTCDay()] + ' ' + t.getUTCDate() + ' ' + MON[t.getUTCMonth()]; };
  G.resources = function () {
    var o = JSON.parse(JSON.stringify(this.res));
    o.staffHours = { tracers: this.left.tracers, field: this.left.field, analysts: this.left.analysts };
    o.staffMax = JSON.parse(JSON.stringify(this.res.staffHours));
    o.testsLeft = this.tLeft; o.testsMax = this.res.testsLeft; o.seqLeft = this.sLeft; o.seqMax = this.res.seqLeft;
    var self = this; o.bedsUsed = this.events.filter(function (e) { return e.hosp !== null && e.hosp <= self.day && (e.death === null || e.death > self.day) && self.day - e.hosp < 10; }).length * 3;
    o.icuUsed = Math.round(o.bedsUsed / 7);
    return o;
  };
  G.inbox = function () { return this.msgs.slice(); };
  G.lineList = function () {
    var self = this;
    return Object.keys(this.known).map(function (pid) {
      var k = self.known[pid], p = self.P(pid), e = self.inf[pid];
      var st = !e ? 'suspected' : e.death !== null && e.death <= self.day ? 'died' : e.hosp !== null && e.hosp <= self.day && self.day - e.hosp < 10 ? 'hospital' : k.tests.some(function (t) { return t.result === 'pos'; }) ? 'confirmed' : 'probable';
      return { pid: pid, name: p.name, age: p.age, sex: p.sex, district: p.district, onset: e && e.onset !== null && e.onset <= self.day ? e.onset : null, reported: k.reported, status: st, tests: k.tests, interviewed: k.interviewed, traced: k.traced, seqId: k.seq || null, pos: p.pos };
    });
  };
  G.person = function (pid) {
    var p = this.P(pid), k = this.known[pid] || {}, e = this.inf[pid], self = this, L = this.lineList().filter(function (c) { return c.pid === pid; })[0] || {};
    var o = { pid: pid, name: p.name, age: p.age, sex: p.sex, district: p.district, pos: p.pos, job: pick(R(hs(pid)), ['nurse', 'retired', 'delivery driver', 'student', 'teacher', 'market trader', 'care worker', 'accountant', 'bus driver', 'chef']), known: !!this.known[pid], status: L.status || 'contact', onset: L.onset, reported: k.reported, tests: k.tests || [], interviewed: !!k.interviewed, traced: !!k.traced, seqId: k.seq || null };
    if (k.interviewed) {
      o.symptoms = e && e.onset !== null ? this.truth.symptoms.filter(function (s, i) { return R(hs(pid + i))() < s[1]; }).map(function (s) { return s[0]; }) : ['cough'];
      o.exposures = p.haunts.map(function (h) { var pl = self.city.places[+h.slice(1)]; return { place: h, name: pl.name, day: (e ? e.day : self.day - 5) + Math.round(R(hs(pid + h))() * 2), note: 'attended' }; });
      o.interview = ['Says they felt ' + (o.symptoms.length ? 'unwell with ' + o.symptoms.join(', ') : 'fine') + '.', 'Recalls visiting ' + o.exposures.map(function (x) { return x.name; }).join(' and ') + ' in the fortnight before.'];
    }
    if (k.traced) {
      o.contacts = this.people.filter(function (q) { return q.hh === p.hh && q.pid !== pid; }).map(function (q) { return { pid: q.pid, name: q.name, rel: 'household', status: self.known[q.pid] ? 'case' : 'contact' }; });
    }
    return o;
  };
  G.epiCurve = function () {
    var N = this.day + 1, self = this, o = { start: -14, byOnset: [], byReport: [], nowcast: [], admissions: [], deaths: [] };
    for (var d = -14; d <= this.day; d++) { o.byOnset.push(0); o.byReport.push(0); o.admissions.push(0); o.deaths.push(0); o.nowcast.push(null); }
    this.lineList().forEach(function (c) {
      var e = self.inf[c.pid];
      if (c.onset !== null) o.byOnset[c.onset + 14]++;
      if (c.reported >= -14) o.byReport[c.reported + 14]++;
      if (e && e.hosp !== null && e.hosp <= self.day) o.admissions[e.hosp + 14]++;
      if (e && e.death !== null && e.death <= self.day) o.deaths[e.death + 14]++;
    });
    for (var i = Math.max(0, o.byOnset.length - 6); i < o.byOnset.length; i++) { var f = (o.byOnset.length - i) / 6; var v = o.byOnset[i]; o.nowcast[i] = { lo: v + Math.round(v * f * .5), hi: v + Math.round((v + 2) * f * 2) }; }
    return o;
  };
  G.wastewater = function () {
    var o = { start: -14, byDistrict: {} }, self = this;
    this.city.districts.forEach(function (D, di) {
      var a = [];
      for (var d = -14; d <= self.day; d++) { var s = 0; self.events.forEach(function (e) { if (self.P(e.pid).district === D.id && d - e.day >= 1 && d - e.day < 12) s++; }); a.push(Math.max(0, s * 3 + R(hs(D.id + d))() * 6)); }
      o.byDistrict[D.id] = a;
    });
    return o;
  };
  G.tree = function () {
    var self = this, nodes = [];
    this.seqs.forEach(function (s) { if (s.due > self.day) return; var e = self.inf[s.pid]; nodes.push({ id: 's' + s.pid, sampleOf: s.pid, mutations: e ? e.genome : [] }); });
    return { nodes: nodes };
  };
  G.clusters = function () {
    var by = {}, self = this;
    Object.keys(this.known).forEach(function (pid) { var k = self.known[pid]; if (!k.interviewed) return; self.P(pid).haunts.forEach(function (h) { (by[h] = by[h] || []).push(pid); }); });
    return Object.keys(by).filter(function (h) { return by[h].length >= 2; }).map(function (h) { var pl = self.city.places[+h.slice(1)]; return { id: 'c' + h, place: h, name: pl.name, pos: pl.pos, cases: by[h], size: by[h].length, firstDay: -3 }; });
  };
  var CAT = [
    ['interview', 'Interview a case', 'investigate', { hours: { tracers: 2 } }, 'case', 'Symptoms, onset, where they have been, who they met.', 0],
    ['trace', 'Trace contacts', 'investigate', { hours: { tracers: 4 } }, 'case', 'Find and name the people they met; list household and close contacts.', 0],
    ['household', 'Household study', 'investigate', { hours: { tracers: 3 }, tests: 4 }, 'case', 'Test every household member, well or not.', 0],
    ['sitevisit', 'Site visit', 'investigate', { hours: { field: 4 } }, 'place', 'Attendance lists, layout, ventilation readings.', 0],
    ['questionnaire', 'Cluster questionnaire', 'investigate', { hours: { analysts: 4, field: 2 } }, 'place', 'Attack rates by activity and area at a venue.', 0],
    ['records', 'Hospital record review', 'investigate', { hours: { analysts: 3 } }, 'none', 'Admissions by age and symptoms from St Anne\'s.', 0],
    ['test', 'Test a person', 'lab', { tests: 1 }, 'person', 'PCR panel; result in 1–2 days.', 0],
    ['sequence', 'Sequence a sample', 'lab', { seq: 1 }, 'case', 'Whole genome; about 3 days.', 0],
    ['declare', 'Send samples for novel-agent screen', 'lab', { tests: 3, hours: { analysts: 2 } }, 'none', 'Needs samples negative for known pathogens. Confirms a new agent.', 0],
    ['trial', 'Treatment trial', 'lab', { money: 40000, hours: { analysts: 6 } }, 'none', 'Randomised trial of an existing antiviral. Choose size.', 0],
    ['isolate', 'Isolation of confirmed cases', 'contain', { money: 2000 }, 'none', 'Cases stay home 10 days.', 1],
    ['quarantine', 'Quarantine contacts', 'contain', { money: 6000 }, 'none', 'Named contacts stay home 10 days.', 2],
    ['closeVenue', 'Close a venue', 'contain', { money: 3000 }, 'place', 'Shut one place until revoked.', 1],
    ['schools', 'Close schools', 'contain', { money: 60000 }, 'none', 'All schools shut. Parents stay home.', 2],
    ['gatherings', 'Limit gatherings (30)', 'contain', { money: 25000 }, 'none', 'Indoor events capped.', 3],
    ['masks', 'Masks indoors', 'contain', { money: 4000 }, 'none', 'Guidance on masks in shops and transport.', 4],
    ['lockdown', 'City-wide lockdown', 'contain', { money: 400000 }, 'none', 'Last resort. Everything non-essential shuts.', 4],
    ['surge', 'Hospital surge plan', 'protect', { money: 50000 }, 'none', '+60 beds and +8 ICU after a week.', 7],
    ['shield', 'Shielding advice', 'protect', { money: 5000 }, 'none', 'Advice for the most vulnerable group.', 3],
    ['carehome', 'Care home visiting rules', 'protect', { money: 2000 }, 'none', 'Restrict visits; test staff weekly.', 2],
    ['briefing', 'Press briefing', 'communicate', { hours: { analysts: 2 } }, 'none', 'Say what you know. Answers rumours.', 0],
    ['counter', 'Counter a rumour', 'communicate', { hours: { analysts: 1 } }, 'none', 'Targeted messaging in affected districts.', 1]
  ];
  G.actions = function () {
    var self = this;
    return CAT.map(function (c) {
      var ok = true, why = '';
      if (c[3].hours) Object.keys(c[3].hours).forEach(function (k) { if (self.left[k] < c[3].hours[k]) { ok = false; why = 'Not enough ' + k + ' hours today'; } });
      if (c[3].tests && self.tLeft < c[3].tests) { ok = false; why = 'No tests left today'; }
      if (c[3].seq && self.sLeft < c[3].seq) { ok = false; why = 'Sequencer full today'; }
      if (c[0] === 'declare' && self.stage > 1) { ok = false; why = 'Already confirmed'; }
      return { id: c[0], label: c[1], area: c[2], costs: c[3], target: c[4], desc: c[5], lag: c[6], kind: c[2] === 'contain' || c[2] === 'protect' ? 'order' : 'action', available: ok, why: why, effect: c[2] === 'contain' ? 'Cuts transmission in affected settings' : '' };
    });
  };
  G.spend = function (c) { var self = this; if (c.hours) Object.keys(c.hours).forEach(function (k) { self.left[k] -= c.hours[k]; }); if (c.tests) this.tLeft -= c.tests; if (c.seq) this.sLeft -= c.seq; if (c.money) this.res.funding -= c.money; };
  G.act = function (id, target, params) {
    this.log.push(['act', id, target, params]);
    var a = this.actions().filter(function (x) { return x.id === id; })[0];
    if (!a) return { ok: false, err: 'Unknown action' };
    if (!a.available) return { ok: false, err: a.why };
    if (a.kind === 'order') return this.order(id, Object.assign({ target: target }, params || {}));
    this.spend(a.costs);
    var k = this.known[target], msgs = [], self = this;
    if (id === 'interview' && k) { k.interviewed = true; msgs.push('Interview done: ' + this.P(target).name); }
    else if (id === 'trace' && k) { k.traced = true; msgs.push('Contacts listed'); }
    else if (id === 'test') { if (!k) this.know(target, this.day, 'contact'); this.tests.push({ pid: target, day: this.day, due: this.day + 1 + Math.floor(this.r() * 2) }); this.known[target].tests.push({ day: this.day, result: 'pending' }); msgs.push('Sample sent'); }
    else if (id === 'sequence') { this.seqs.push({ pid: target, day: this.day, due: this.day + 3 }); if (k) k.seq = 'q'; msgs.push('Sample queued for sequencing'); }
    else if (id === 'household' && k) { this.people.filter(function (q) { return q.hh === self.P(target).hh && q.pid !== target; }).forEach(function (q) { self.know(q.pid, self.day, 'household'); self.tests.push({ pid: q.pid, day: self.day, due: self.day + 1 }); self.known[q.pid].tests.push({ day: self.day, result: 'pending' }); }); msgs.push('Household tested'); }
    else if (id === 'declare') { this.pendingDeclare = this.day + 2; msgs.push('Samples on their way to the reference lab'); }
    else if (id === 'briefing') { this.res.trust.overall = Math.min(1, this.res.trust.overall + .02); msgs.push('Briefing given'); }
    else msgs.push(a.label + ' done');
    return { ok: true, msgs: msgs };
  };
  var MULT = { isolate: .85, quarantine: .8, closeVenue: .95, schools: .85, gatherings: .8, masks: .85, lockdown: .45, surge: 1, shield: 1, carehome: .97, counter: 1 };
  G.order = function (id, params) {
    var a = this.actions().filter(function (x) { return x.id === id; })[0];
    if (this._ord.some(function (o) { return o.action === id && (!params || !params.target || o.target === params.target); })) return { ok: false, err: 'Already in force' };
    this.spend(a.costs);
    var o = { id: 'o' + (this.nextId++), action: id, label: a.label, target: params && params.target || null, since: this.day, lag: a.lag, costPerDay: (a.costs.money || 0) / 5, compliance: 0.55 + this.r() * .3, mult: MULT[id] || 1 };
    this._ord.push(o);
    return { ok: true, msgs: [a.label + ' ordered'] };
  };
  G.orders = function () { return this._ord.slice(); };
  G.revoke = function (id) { this.log.push(['revoke', id]); this._ord = this._ord.filter(function (o) { return o.id !== id; }); return { ok: true }; };
  G.estimates = function () {
    return { traits: [
      { id: 'route', label: 'Route', type: 'choice', options: ['airborne', 'droplet', 'contact', 'gut', 'animal'] },
      { id: 'incubation', label: 'Incubation', type: 'number', unit: 'days', min: 1, max: 16, step: 0.5 },
      { id: 'presym', label: 'Spread before symptoms', type: 'pct', min: 0, max: 0.7, step: 0.05 },
      { id: 'asym', label: 'Never ill', type: 'pct', min: 0, max: 0.8, step: 0.05 },
      { id: 'R', label: 'R (reproduction number)', type: 'number', min: 0.5, max: 6, step: 0.1 },
      { id: 'ifr', label: 'Infection fatality', type: 'pct', min: 0.001, max: 0.15, step: 0.001, log: true },
      { id: 'ageRisk', label: 'Who it hits', type: 'choice', options: ['elderly', 'young adults', 'children', 'even'] },
      { id: 'source', label: 'Source', type: 'choice', options: ['market', 'farm', 'lab', 'traveller', 'hospital'] }
    ], published: this.pub, history: this.pubHist, hints: { incubation: { lo: 3, hi: 8 } } };
  };
  G.publish = function (v) {
    this.log.push(['publish', v]);
    var self = this; Object.keys(v).forEach(function (k) { self.pub[k] = { value: v[k], day: self.day }; self.pubHist.push({ trait: k, value: v[k], day: self.day }); });
    var m = this.msg('press', 'Health chief: "' + Object.keys(v).length + ' things we now know"', [{ k: 'p', x: ['The Wexmoor Courier reports the public health team\'s first published estimates. Reaction on social media is mixed.'] }], 'Wexmoor Courier');
    if (Object.keys(this.pub).length >= 6 && this.stage === 2) this.stage = 3;
    return { msgs: [m] };
  };
  G.endDay = function () {
    this.log.push(['end']);
    var self = this, before = this.msgs.length, events = [];
    this.spread(this.day);
    this.day++;
    // reporting
    this.events.forEach(function (e) {
      if (self.known[e.pid]) return;
      if (e.onset !== null && self.day - e.onset === 3 && R(hs(e.pid))() < (self.stage > 1 ? .7 : .35)) self.know(e.pid, self.day, 'GP');
      if (e.hosp === self.day) self.know(e.pid, self.day, 'hospital');
    });
    this.tests.forEach(function (t) {
      if (t.due !== self.day) return;
      var e = self.inf[t.pid], pos = e && self.day - e.day >= 1 && self.day - e.day < 14;
      var rec = self.known[t.pid].tests.filter(function (x) { return x.result === 'pending'; })[0];
      if (rec) { rec.result = pos ? (self.stage > 1 ? 'pos' : 'neg-known') : 'neg'; rec.resultDay = self.day; }
      self.msg('lab', 'Result: ' + self.P(t.pid).name + ' — ' + (pos ? (self.stage > 1 ? 'POSITIVE' : 'negative for known pathogens') : 'negative'), [{ k: 'p', x: ['Sample from ', self.ref(t.pid), ' taken ' + self.dateLabel(t.day) + '.'] }], 'Public Health Lab');
    });
    this.seqs.forEach(function (s) { if (s.due === self.day) { if (self.known[s.pid]) self.known[s.pid].seq = 's' + s.pid; self.msg('lab', 'Genome ready: ' + self.P(s.pid).name, [{ k: 'p', x: ['Sequence for ', self.ref(s.pid), ' added to the tree.'] }], 'Sequencing unit'); } });
    if (this.pendingDeclare === this.day && this.stage === 1) { this.stage = 2; events.push({ kind: 'act', act: 2 }); this.msg('lab', 'Novel agent confirmed: Agent WX-1', [{ k: 'p', x: ['The reference laboratory confirms a previously undescribed virus in samples from Wexmoor. It will be referred to as Agent WX-1.'] }], 'Reference Laboratory'); }
    if (this.day % 7 === 3) this.msg('council', 'Council emergency committee — minutes', [{ k: 'p', x: ['Cllr Pauline Grey (Leader) asked whether the market could stay open for the Easter trade. The committee requests a recommendation by Friday.'] }, { k: 'q', x: ['"We cannot shut the city on the strength of four pneumonias."'] }], 'Wexmoor City Council');
    if (this.day === 2) this.msg('mayor', 'The Mayor is on the line', [{ k: 'q', x: ['"I have the Courier asking me about a mystery bug at St Anne\'s. What do I tell them? And please — not the word plague."'] }], 'Mayor Colin Hart');
    if (this.day === 4) this.msg('rumour', 'Rumour: "it\'s in the water"', [{ k: 'p', x: ['A post claiming the reservoir is contaminated has been shared 2,300 times in ', { ref: 'district', id: 'd3', text: this.city.districts[3].name }, '. Bottled water is selling out.'] }], 'Social listening');
    if (this.day === 3) this.msg('press', 'MYSTERY BUG AT ST ANNE\'S', [{ k: 'p', x: ['Patients on a ward at St Anne\'s Hospital have been struck down by a mystery illness, the Courier can reveal. Staff are "baffled", a source said.'] }], 'Wexmoor Courier');
    if (this.day >= 60) { this.over = true; this.outcome = 'dayLimit'; }
    this.startRes();
    var dead = this.events.filter(function (e) { return e.death === self.day; }).length;
    return { newMsgs: this.msgs.slice(before), events: events, summary: { newCases: this.lineList().filter(function (c) { return c.reported === self.day; }).length, deaths: dead } };
  };
  G.mentor = function (tier) {
    this.log.push(['mentor', tier]);
    var t = ['Have you sent samples that test negative for everything we know? That is how you get the reference lab to look.', 'The market keeps coming up in interviews. A site visit at Old Quay Market would tell you who was there on which days.', 'Straight answer: it is new, it spreads through the air indoors, and the first cases all worked the fish hall at the market.'];
    if (tier === 1) this.left.analysts = Math.max(0, this.left.analysts - 2);
    if (tier === 2) this.res.trust.overall -= .03;
    return { text: t[tier] || t[0], action: tier === 1 ? { id: 'sitevisit', target: 'p15' } : null };
  };
  G.debrief = function () {
    var self = this, N = this.day + 15, act = [], ghost = [];
    for (var d = -14; d <= this.day; d++) { var c = this.events.filter(function (e) { return e.day === d; }).length; act.push(c); ghost.push(Math.round(c * (1 + Math.max(0, d) * .06))); }
    var dead = this.events.filter(function (e) { return e.death !== null && e.death <= self.day; }).map(function (e) { var p = self.P(e.pid); return { pid: e.pid, name: p.name, age: p.age, district: p.district, day: e.death, job: self.person(e.pid).job }; });
    return {
      truth: this.truth, estimates: this.pub, history: this.pubHist,
      curves: { start: -14, actual: act, ghost: ghost, deaths: act.map(function (x) { return x * .02; }), ghostDeaths: ghost.map(function (x) { return x * .02; }) },
      totals: { infections: this.events.length, ghostInfections: Math.round(this.events.length * 3.1), deaths: dead.length, ghostDeaths: Math.round(dead.length * 3 + 5), cost: 250000 - this.res.funding, closureDays: 12 },
      deaths: dead, trust: { start: .66, end: this.res.trust.overall }, origin: { pid: 'x5', place: 'p15', source: 'market', found: false },
      frames: this.events.map(function (e) { return { pid: e.pid, day: e.day, pos: self.P(e.pid).pos, by: e.by, place: e.place }; }),
      tree: this.events.map(function (e) { return { id: e.pid, parent: e.by, day: e.day, place: e.place }; }),
      score: { lives: 0.6, understanding: 0.5, cost: 0.7, overall: 62, grade: 'B' }
    };
  };
  G.save = function () { return JSON.stringify({ seed: this.seed, opts: this.opts, log: this.log }); };
  var API = {
    newGame: function (seed, opts) {
      return new Game(seed, opts);
    },
    load: function (json) {
      var s = JSON.parse(json), g = API.newGame(s.seed, s.opts);
      s.log.forEach(function (l) { if (l[0] === 'act') g.act(l[1], l[2], l[3]); else if (l[0] === 'revoke') g.revoke(l[1]); else if (l[0] === 'publish') g.publish(l[1]); else if (l[0] === 'end') g.endDay(); else if (l[0] === 'mentor') g.mentor(l[1]); });
      return g;
    },
    grades: [{ id: 'probationer', label: 'Probationer', blurb: 'Generous capacity, clearer data, a patient council.' }, { id: 'consultant', label: 'Consultant', blurb: 'The standard game.' }, { id: 'director', label: 'Director', blurb: 'Noisy reports, slow labs, a nervous city.' }]
  };
  return API;
})();
