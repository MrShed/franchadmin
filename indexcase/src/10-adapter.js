/* INDEX CASE UI — 10-adapter.js
 * The only UI file that touches the engine (IX). Every view reads through UIA,
 * which normalises engine shapes into the small set the interface draws, and
 * caches the heavier reads until the game state changes (UIA.bump()).
 */
var UIA = (function () {
  'use strict';
  var A = { g: null, v: 0, cache: {} };
  var SAVE_KEY = 'indexcase.save.v1';

  function arr(x) { return Array.isArray(x) ? x : x ? [x] : []; }
  function num(x, d) { return typeof x === 'number' && isFinite(x) ? x : d; }
  function call(name) { var g = A.g; if (!g || typeof g[name] !== 'function') return undefined; return g[name].apply(g, Array.prototype.slice.call(arguments, 1)); }
  function cached(key, f) { if (A.cache[key] && A.cache[key].v === A.v) return A.cache[key].x; var x = f(); A.cache[key] = { v: A.v, x: x }; return x; }
  A.bump = function () { A.v++; };

  // ------------------------------------------------------------ lifecycle
  A.ready = function () { return typeof IX !== 'undefined' && typeof IX.newGame === 'function'; };
  A.grades = function () {
    var g = typeof IX !== 'undefined' && (IX.grades || (IX.GRADES)) || null;
    if (typeof g === 'function') g = g();
    if (g && !Array.isArray(g)) g = Object.keys(g).map(function (k) { var o = g[k]; return { id: o.id || k, label: o.label || k, blurb: o.blurb || o.desc || '' }; });
    var def = [
      { id: 'probationer', label: 'Probationer', blurb: 'Clearer reports, more tests and a patient council. Recommended for a first outbreak.' },
      { id: 'consultant', label: 'Consultant', blurb: 'The standard game. Noisy data, real delays, a city with opinions.' },
      { id: 'director', label: 'Director', blurb: 'Slow labs, sparse reporting, wider range of diseases and a nervous council.' }
    ];
    if (!g || !g.length) return def;
    return g.map(function (x) { var d = def.filter(function (y) { return y.id === x.id; })[0] || {}; return { id: x.id, label: x.label || d.label || x.id, blurb: x.blurb || d.blurb || '' }; });
  };
  A.create = function (seed, grade, opts) {
    opts = opts || {};
    var o = { grade: grade };
    if (opts.tutorial) { o.tutorial = true; o.scenario = 'tutorial'; }
    A.g = IX.newGame(seed, o);
    A.seed = String(seed); A.grade = grade; A.tutorial = !!opts.tutorial;
    A.bump();
    return A.g;
  };
  A.restore = function (json) { A.g = IX.load(json); A.bump(); return A.g; };
  A.serialize = function () { var s = A.g.save(); return typeof s === 'string' ? s : JSON.stringify(s); };
  A.readSave = function () { try { var s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } };
  A.writeSave = function (ui) {
    if (!A.g) return false;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, engine: A.serialize(), ui: ui, when: Date.now(), day: A.day(), seed: A.seed, grade: A.grade, tutorial: A.tutorial, label: A.dateLabel(A.day()), act: A.actNo(), city: A.city().name, over: A.over() }));
      return true;
    } catch (e) { return false; }
  };
  A.clearSave = function () { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } };
  A.loadSaved = function (o) { A.restore(o.engine); A.seed = o.seed; A.grade = o.grade; A.tutorial = !!o.tutorial; return A.g; };

  // ------------------------------------------------------------ clock
  A.day = function () { return num(A.g.day, 0); };
  A.actNo = function () { var g = A.g; return typeof g.act === 'number' ? g.act : num(g.stage, num(g.actNo, num(g.currentAct, 1))); };
  A.ACTS = { 1: ['Act one', 'Detect'], 2: ['Act two', 'Characterise'], 3: ['Act three', 'Contain'] };
  A.over = function () { return !!A.g.over; };
  A.outcome = function () { return A.g.outcome || null; };
  A.dateLabel = function (d) { try { var s = A.g.dateLabel(d); if (s) return String(s); } catch (e) { /* ignore */ } return 'Day ' + d; };
  A.dateShort = function (d) { var s = A.dateLabel(d).split(' '); return s.length >= 3 ? s[1] + ' ' + s[2] : s.join(' '); };

  // ------------------------------------------------------------ city
  A.city = function () {
    return cached('city', function () {
      var c = A.g.city || call('cityInfo') || {};
      var ds = arr(c.districts).map(function (d, i) { return { id: d.id !== undefined ? String(d.id) : 'd' + i, name: d.name, poly: d.poly || d.polygon || [], centre: d.centre || d.center || [0.5, 0.5], pop: num(d.pop, 0), deprivation: d.deprivation }; });
      var ps = arr(c.places).map(function (p, i) { return { id: p.id !== undefined ? String(p.id) : 'p' + i, kind: p.kind || p.type || 'venue', name: p.name, district: p.district !== undefined ? String(p.district) : null, pos: p.pos || p.centre || null, size: p.size, vent: p.ventilation }; });
      var dById = {}, pById = {};
      ds.forEach(function (d) { dById[d.id] = d; });
      ps.forEach(function (p) { pById[p.id] = p; if (!p.pos && dById[p.district]) p.pos = dById[p.district].centre; });
      return { name: c.name || 'the city', pop: num(c.pop, ds.reduce(function (s, d) { return s + d.pop; }, 0)), districts: ds, places: ps, dById: dById, pById: pById, rivers: c.rivers || c.river || null, coast: c.coast || null };
    });
  };
  A.district = function (id) { return A.city().dById[String(id)] || null; };
  A.place = function (id) { return A.city().pById[String(id)] || null; };

  // ------------------------------------------------------------ resources
  function pair(v, max) { if (v && typeof v === 'object') return { left: num(v.left, num(v.value, 0)), max: num(v.max, num(v.cap, num(v.total, num(v.left, 0)))) }; return { left: num(v, 0), max: num(max, num(v, 0)) }; }
  A.res = function () {
    return cached('res', function () {
      var r = call('resources') || {};
      var sh = r.staffHours || {}, mx = r.staffMax || r.staffHoursMax || {};
      var o = {
        hours: { tracers: pair(sh.tracers, mx.tracers), field: pair(sh.field, mx.field), analysts: pair(sh.analysts, mx.analysts) },
        tests: pair(r.testsLeft, r.testsMax || r.testCapacity), seq: pair(r.seqLeft, r.seqMax || r.seqCapacity),
        funding: num(r.funding, 0), spent: num(r.spent, null),
        beds: r.beds && typeof r.beds === 'object' ? { used: num(r.beds.used, 0), max: num(r.beds.max, num(r.beds.total, 0)) } : { used: num(r.bedsUsed, 0), max: num(r.beds, 0) },
        icu: r.icu && typeof r.icu === 'object' ? { used: num(r.icu.used, 0), max: num(r.icu.max, num(r.icu.total, 0)) } : { used: num(r.icuUsed, 0), max: num(r.icu, 0) },
        trust: { overall: num(r.trust && r.trust.overall, num(r.trust, 0.5)), byDistrict: (r.trust && r.trust.byDistrict) || {}, byAge: (r.trust && r.trust.byAge) || null },
        credibility: num(r.credibility, null),
        raw: r
      };
      // keep the day's opening hours so the bar can show spent vs left
      return o;
    });
  };

  // ------------------------------------------------------------ messages
  var KIND = { report: 'report', gp: 'report', hospital: 'report', lab: 'lab', result: 'lab', council: 'council', minutes: 'council', press: 'press', news: 'press', mayor: 'mayor', call: 'mayor', rumour: 'rumour', rumor: 'rumour', mentor: 'mentor', system: 'system', event: 'system' };
  function normPart(p) {
    if (p === null || p === undefined) return '';
    if (typeof p === 'string' || typeof p === 'number') return String(p);
    if (p.ref || p.t || p.type) {
      var t = p.ref || p.t || p.type;
      if (t === true) t = p.kind || 'person';
      return { ref: t, id: String(p.id !== undefined ? p.id : p.v), text: p.text || p.d || p.label || p.name || String(p.id) };
    }
    return String(p.text || '');
  }
  function normBody(b) {
    if (!b) return [];
    if (typeof b === 'string') return b.split(/\n\n+/).map(function (s) { return { k: 'p', x: [s] }; });
    return arr(b).map(function (blk) {
      if (typeof blk === 'string') return { k: 'p', x: [blk] };
      if (blk.rows) return { k: 'table', head: blk.head || blk.cols || null, rows: blk.rows.map(function (r) { return arr(r).map(function (c) { return arr(c).map(normPart); }); }) };
      return { k: blk.k || blk.kind || 'p', x: arr(blk.x !== undefined ? blk.x : blk.text).map(normPart), who: blk.who || blk.speaker };
    });
  }
  A.inbox = function () {
    return cached('inbox', function () {
      return arr(call('inbox')).map(function (m, i) {
        return { id: String(m.id !== undefined ? m.id : 'm' + i), day: num(m.day, 0), kind: KIND[m.kind] || m.kind || 'report', title: m.title || '(untitled)', from: m.from || m.source || '', body: normBody(m.body), refs: m.refs || [], urgent: !!m.urgent, raw: m };
      });
    });
  };
  A.msg = function (id) { return A.inbox().filter(function (m) { return m.id === id; })[0] || null; };
  A.bodyText = function (m) { return m.body.map(function (b) { return (b.x || []).map(function (p) { return typeof p === 'string' ? p : p.text; }).join(''); }).join(' '); };

  // ------------------------------------------------------------ cases
  var STATUS = { suspected: 'suspected', possible: 'suspected', probable: 'probable', confirmed: 'confirmed', hospital: 'hospital', admitted: 'hospital', icu: 'icu', died: 'died', dead: 'died', recovered: 'recovered', contact: 'contact', negative: 'negative', ruledout: 'negative' };
  A.cases = function () {
    return cached('cases', function () {
      return arr(call('lineList')).map(function (c) {
        return {
          pid: String(c.pid), name: c.name || '—', age: num(c.age, null), sex: c.sex || '', district: c.district !== undefined ? String(c.district) : null,
          onset: num(c.onset, null), reported: num(c.reported, null), status: STATUS[c.status] || c.status || 'suspected',
          tests: arr(c.tests), interviewed: !!(c.interviewed || c.exposures), traced: !!(c.traced || c.contacts), seq: c.seqId ? (String(c.seqId).charAt(0) === 'q' || c.seqPending ? 'pending' : 'done') : (c.sequenced ? 'done' : null),
          pos: c.pos || c.home || null, cluster: c.cluster || null, place: c.place || null, raw: c
        };
      });
    });
  };
  A.caseOf = function (pid) { return A.cases().filter(function (c) { return c.pid === String(pid); })[0] || null; };
  A.testState = function (c) {
    var t = c.tests; if (!t.length) return 'none';
    var last = t[t.length - 1], r = last.result || last.r || last.status;
    if (t.some(function (x) { return /pos/i.test(x.result || x.r || ''); })) return 'pos';
    if (!r || /pend|wait|queue/i.test(r)) return 'pending';
    return 'neg';
  };
  A.person = function (pid) {
    var p = call('person', pid) || {};
    var c = A.caseOf(pid);
    return {
      pid: String(pid), name: p.name || (c && c.name) || 'Unknown', age: num(p.age, c && c.age), sex: p.sex || (c && c.sex) || '', district: p.district !== undefined ? String(p.district) : c && c.district,
      job: p.job || p.occupation || null, household: p.household || null, habits: arr(p.habits), status: STATUS[p.status] || p.status || (c ? c.status : 'contact'),
      onset: num(p.onset, c ? c.onset : null), reported: num(p.reported, c ? c.reported : null), known: p.known !== undefined ? !!p.known : !!c,
      symptoms: p.symptoms || null, exposures: p.exposures ? arr(p.exposures).map(function (e) { return { place: e.place !== undefined ? String(e.place) : null, name: e.name || (A.place(e.place) || {}).name || e.place, day: num(e.day, null), note: e.note || e.what || '', person: e.person || null }; }) : null,
      contacts: p.contacts ? arr(p.contacts).map(function (x) { return { pid: String(x.pid), name: x.name, rel: x.rel || x.setting || '', status: x.status || '' }; }) : null,
      tests: arr(p.tests || (c && c.tests)), seq: p.seqId || (c && c.seq) || null, interview: p.interview ? normBody(p.interview) : null,
      interviewed: !!(p.interviewed || p.exposures || p.interview), traced: !!(p.traced || p.contacts), notes: arr(p.notes), pos: p.pos || (c && c.pos) || null, raw: p
    };
  };

  // ------------------------------------------------------------ series
  A.curve = function () {
    return cached('curve', function () {
      var e = call('epiCurve') || {};
      var start = num(e.start, num(e.day0, 0));
      var n = Math.max(arr(e.byOnset).length, arr(e.byReport).length);
      function s(a) { a = arr(a); var o = []; for (var i = 0; i < n; i++) o.push(num(a[i], 0)); return o; }
      var nc = arr(e.nowcast); var now = []; for (var i = 0; i < n; i++) { var x = nc[i]; now.push(x && typeof x === 'object' ? { lo: num(x.lo, 0), hi: num(x.hi, 0) } : null); }
      return { start: start, n: n, byOnset: s(e.byOnset), byReport: s(e.byReport), nowcast: now, admissions: s(e.admissions), deaths: s(e.deaths) };
    });
  };
  A.ww = function () {
    return cached('ww', function () {
      var w = call('wastewater') || {};
      var by = w.byDistrict || {}, o = {};
      Object.keys(by).forEach(function (k) { o[String(k)] = arr(by[k]).map(function (v) { return v === null || v === undefined ? null : num(v.value !== undefined ? v.value : v, null); }); });
      return { start: num(w.start, num(w.day0, 0)), byDistrict: o, sampled: w.sampled || null };
    });
  };
  A.tree = function () {
    return cached('tree', function () {
      var t = call('tree') || {};
      return { nodes: arr(t.nodes).map(function (n) { return { id: String(n.id), pid: n.sampleOf !== undefined && n.sampleOf !== null ? String(n.sampleOf) : null, parent: n.parent !== undefined && n.parent !== null ? String(n.parent) : null, muts: arr(n.mutations), day: num(n.day, null), variant: n.variant || null }; }) };
    });
  };
  A.clusters = function () {
    return cached('clusters', function () {
      return arr(call('clusters')).map(function (c, i) { var p = A.place(c.place); return { id: String(c.id || 'c' + i), place: c.place !== undefined ? String(c.place) : null, name: c.name || (p && p.name) || 'Cluster', pos: c.pos || (p && p.pos) || null, cases: arr(c.cases).map(String), size: num(c.size, arr(c.cases).length), setting: c.setting || (p && p.kind) || '' }; });
    });
  };

  // ------------------------------------------------------------ actions & orders
  var AREA = { investigate: 'investigate', investigation: 'investigate', lab: 'lab', laboratory: 'lab', contain: 'contain', containment: 'contain', protect: 'protect', protection: 'protect', communicate: 'communicate', comms: 'communicate' };
  A.actions = function () {
    return cached('actions', function () {
      return arr(call('actions')).map(function (a) {
        var c = a.costs || {};
        return { id: String(a.id), label: a.label || a.id, area: AREA[a.area] || a.area || 'investigate', costs: { hours: c.hours || {}, tests: num(c.tests, 0), seq: num(c.seq, 0), money: num(c.money, 0), perDay: num(c.perDay, num(a.costPerDay, 0)) }, target: a.target || 'none', available: a.available !== false, why: a.why || '', desc: a.desc || a.description || '', effect: a.effect || a.effects || '', lag: num(a.lag, null), kind: a.kind || (a.order ? 'order' : 'action'), params: a.params || null, raw: a };
      });
    });
  };
  A.action = function (id) { return A.actions().filter(function (a) { return a.id === id; })[0] || null; };
  A.doAct = function (id, target, params) {
    var r;
    try { r = A.g.act(id, target === undefined ? null : target, params || {}); } catch (e) { r = { ok: false, err: e.message }; }
    A.bump();
    r = r || {};
    return { ok: r.ok !== false && !r.err, err: r.err || r.error || '', msgs: arr(r.msgs).map(function (m) { return typeof m === 'string' ? m : m.title || m.text || ''; }), raw: r };
  };
  A.orders = function () {
    return cached('orders', function () {
      return arr(call('orders')).map(function (o) { return { id: String(o.id), action: o.action || o.kind, label: o.label || o.action, target: o.target || null, since: num(o.since, num(o.day, 0)), lag: num(o.lag, 0), costPerDay: num(o.costPerDay, 0), compliance: num(o.compliance, null), raw: o }; });
    });
  };
  A.revoke = function (id) { var r; try { r = A.g.revoke(id); } catch (e) { r = { ok: false, err: e.message }; } A.bump(); return r || { ok: true }; };

  // ------------------------------------------------------------ estimates
  A.estimates = function () {
    return cached('est', function () {
      var e = call('estimates') || {};
      return { traits: arr(e.traits), published: e.published || {}, history: arr(e.history), raw: e };
    });
  };
  A.publish = function (vals) { var r; try { r = A.g.publish(vals); } catch (e) { r = { err: e.message }; } A.bump(); return r || {}; };

  // ------------------------------------------------------------ day
  A.endDay = function () {
    var before = A.inbox().length, act0 = A.actNo();
    var r = A.g.endDay() || {};
    A.bump();
    var ev = arr(r.events);
    if (A.actNo() !== act0 && !ev.some(function (e) { return e.kind === 'act'; })) ev.push({ kind: 'act', act: A.actNo() });
    return { newMsgs: arr(r.newMsgs).length ? arr(r.newMsgs) : A.inbox().slice(before), events: ev, summary: r.summary || null };
  };
  A.mentor = function (tier) { var r; try { r = A.g.mentor(tier); } catch (e) { r = { text: 'Dr Okonjo is not answering.' }; } A.bump(); r = r || {}; return { text: r.text || '', action: r.action || null, cost: r.cost || null }; };
  A.mentorInfo = function () { var g = A.g; var i = typeof g.mentorInfo === 'function' ? g.mentorInfo() : null; return i || { name: 'Dr Ife Okonjo', role: 'Retired consultant epidemiologist, on the end of a phone' }; };
  A.debrief = function () { return cached('debrief', function () { return call('debrief') || {}; }); };
  return A;
})();
