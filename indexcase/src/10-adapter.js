/* INDEX CASE UI — 10-adapter.js
 * The only UI file that touches the engine (IX; see indexcase/ENGINE.md).
 * Every view reads through UIA, which normalises engine shapes into the small
 * set the interface draws (money in £, trust and percentages as 0..1) and
 * caches the heavier reads until the game state changes (UIA.bump()).
 */
var UIA = (function () {
  'use strict';
  var A = { g: null, v: 0, cache: {} };
  var SAVE_KEY = 'indexcase.save.v1';

  function arr(x) { return Array.isArray(x) ? x : x === undefined || x === null ? [] : [x]; }
  function num(x, d) { return typeof x === 'number' && isFinite(x) ? x : d; }
  function str(x) { return x === undefined || x === null ? null : String(x); }
  function call(name) { var g = A.g; if (!g || typeof g[name] !== 'function') return undefined; return g[name].apply(g, Array.prototype.slice.call(arguments, 1)); }
  function cached(key, f) { if (A.cache[key] && A.cache[key].v === A.v) return A.cache[key].x; var x = f(); A.cache[key] = { v: A.v, x: x }; return x; }
  function refId(r) { return r && typeof r === 'object' ? str(r.id) : str(r); }
  A.bump = function () { A.v++; };

  // ------------------------------------------------------------ lifecycle
  A.ready = function () { return typeof IX !== 'undefined' && typeof IX.newGame === 'function'; };
  A.grades = function () {
    var def = [
      { id: 'probationer', label: 'Probationer', blurb: 'Clearer reports, more tests and a patient council. Recommended for a first outbreak.' },
      { id: 'consultant', label: 'Consultant', blurb: 'The standard game. Noisy data, real delays, a city with opinions.' },
      { id: 'director', label: 'Director', blurb: 'Slow labs, sparse reporting, a wider range of diseases and a nervous council.' }
    ];
    var g = typeof IX !== 'undefined' ? IX.GRADES : null;
    if (!g || !g.length) return def;
    return g.map(function (x) { var d = def.filter(function (y) { return y.id === x.id; })[0] || {}; return { id: x.id, label: x.label || d.label || x.id, blurb: x.blurb || d.blurb || '' }; });
  };
  A.create = function (seed, grade, opts) {
    opts = opts || {};
    var o = { grade: grade };
    if (opts.tutorial) o.tutorial = true;
    A.g = IX.newGame(String(seed), o);
    A.seed = String(seed); A.grade = grade; A.tutorial = !!opts.tutorial;
    A.cache = {}; A.bump();
    return A.g;
  };
  A.restore = function (json) { A.g = IX.load(json); A.cache = {}; A.bump(); return A.g; };
  A.serialize = function () { var s = A.g.save(); return typeof s === 'string' ? s : JSON.stringify(s); };
  A.readSave = function () { try { var s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } };
  A.writeSave = function (ui) {
    if (!A.g) return false;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, engine: A.serialize(), ui: ui, when: Date.now(), day: A.day(), seed: A.seed, grade: A.grade, tutorial: A.tutorial, act: A.actNo(), city: A.city().name, over: A.over() }));
      return true;
    } catch (e) { return false; }
  };
  A.clearSave = function () { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } };
  A.loadSaved = function (o) { A.restore(o.engine); A.seed = o.seed || A.g.seed; A.grade = o.grade || A.g.grade; A.tutorial = !!o.tutorial; return A.g; };

  // ------------------------------------------------------------ clock
  var ACTN = { detect: 1, characterise: 2, characterize: 2, contain: 3 };
  A.day = function () { return num(A.g.day, 0); };
  A.actNo = function () {
    var g = A.g;
    if (typeof g.act === 'number') return g.act;
    if (typeof g.actNo === 'number') return g.actNo;
    if (typeof g.stage === 'number') return g.stage;
    if (g.actLabel && ACTN[String(g.actLabel).toLowerCase()]) return ACTN[String(g.actLabel).toLowerCase()];
    return 1;
  };
  A.ACTS = { 1: ['Act one', 'Detect'], 2: ['Act two', 'Characterise'], 3: ['Act three', 'Contain'] };
  A.over = function () { return !!A.g.over; };
  A.outcome = function () { var o = A.g.outcome; if (!o) return null; return typeof o === 'string' ? { kind: o } : o; };
  A.agentName = function () { return A.g.agentName || null; };
  A.dateLabel = function (d) { try { var s = A.g.dateLabel(d); if (s) return String(s); } catch (e) { /* ignore */ } return 'Day ' + d; };
  A.dateLong = function (d) { try { if (A.g.dateLong) return String(A.g.dateLong(d)); } catch (e) { /* ignore */ } return A.dateLabel(d); };
  A.dateShort = function (d) { var s = A.dateLabel(d).split(' '); return s.length >= 3 ? s[1] + ' ' + s[2] : s.join(' '); };

  // ------------------------------------------------------------ city
  A.city = function () {
    return cached('city', function () {
      var c = A.g.city || {};
      var ds = arr(c.districts).map(function (d, i) { return { id: d.id !== undefined ? String(d.id) : 'd' + i, name: d.name, poly: d.poly || d.polygon || [], centre: d.centre || d.center || [0.5, 0.5], pop: num(d.pop, 0), deprivation: d.deprivation, blurb: d.blurb || '' }; });
      var ps = arr(c.places).map(function (p, i) { return { id: p.id !== undefined ? String(p.id) : 'p' + i, kind: p.kind || p.type || 'venue', name: p.name, district: str(p.district), pos: p.pos || p.centre || null, size: p.size, indoor: p.indoor, blurb: p.blurb || '' }; });
      var dById = {}, pById = {};
      ds.forEach(function (d) { dById[d.id] = d; });
      ps.forEach(function (p) { pById[p.id] = p; if (!p.pos && dById[p.district]) p.pos = dById[p.district].centre; });
      var pop = num(c.population, num(c.pop, 250000)), agents = num(c.agents, ds.reduce(function (s, d) { return s + d.pop; }, 0));
      return { name: c.name || 'the city', pop: pop, agents: agents, scale: num(c.scale, agents ? pop / agents : 1), districts: ds, places: ps, dById: dById, pById: pById, hospitalId: str(c.hospitalId), rivers: c.rivers || c.river || null };
    });
  };
  A.district = function (id) { return A.city().dById[String(id)] || null; };
  A.place = function (id) { return A.city().pById[refId(id)] || null; };

  // ------------------------------------------------------------ resources
  function pair(v, max) { return { left: num(v, 0), max: num(max, num(v, 0)) }; }
  function frac(x, d) { x = num(x, null); if (x === null) return d; return x > 1.001 ? x / 100 : x; }
  A.res = function () {
    return cached('res', function () {
      var r = call('resources') || {};
      var sh = r.staffHours || {}, mx = r.staffMax || {};
      var tb = {}; Object.keys((r.trust && r.trust.byDistrict) || {}).forEach(function (k) { tb[k] = frac(r.trust.byDistrict[k], 0.5); });
      return {
        hours: { tracers: pair(sh.tracers, mx.tracers), field: pair(sh.field, mx.field), analysts: pair(sh.analysts, mx.analysts) },
        staff: r.staff || null,
        tests: pair(r.testsLeft, num(r.testsCap, r.testsMax)), queue: num(r.testQueue, 0), seq: pair(r.seqLeft, num(r.seqCap, r.seqMax)),
        funding: num(r.funding, 0) * 1000, spent: num(r.spent, 0) * 1000, economy: num(r.economy, 0) * 1e6,
        beds: { used: num(r.beds && r.beds.used, 0), max: num(r.beds && (r.beds.cap !== undefined ? r.beds.cap : r.beds.max), 0) },
        icu: { used: num(r.icu && r.icu.used, 0), max: num(r.icu && (r.icu.cap !== undefined ? r.icu.cap : r.icu.max), 0) },
        trust: { overall: frac(r.trust && r.trust.overall, 0.5), byDistrict: tb, byAge: r.trust && r.trust.byAge || null },
        credibility: frac(r.credibility, frac(A.g.credibility, null)),
        vaccine: r.vaccine || null
      };
    });
  };

  // ------------------------------------------------------------ messages
  var KIND = { alert: 'alert', report: 'report', lab: 'lab', result: 'result', interview: 'interview', council: 'council', mayor: 'mayor', press: 'press', rumour: 'rumour', rumor: 'rumour', mentor: 'mentor', system: 'system', death: 'death' };
  function part(p) {
    if (p === null || p === undefined) return '';
    if (typeof p === 'string' || typeof p === 'number') return String(p);
    var t = p.t || p.ref || p.type || 'person';
    return { ref: t, id: String(p.id), text: p.d || p.text || p.name || String(p.id) };
  }
  function body(b) {
    if (!b) return [];
    if (typeof b === 'string') return b.split(/\n\n+/).map(function (s) { return { k: 'p', x: [s] }; });
    return arr(b).map(function (l) {
      if (typeof l === 'string') return { k: 'p', x: [l] };
      if (l.k === 'table' || l.rows) return { k: 'table', head: l.head || null, rows: arr(l.rows).map(function (r) { return arr(r).map(function (c) { return arr(c).map(part); }); }) };
      return { k: l.k || 'p', x: arr(l.x !== undefined ? l.x : l.text).map(part), who: l.who ? part(l.who) : null };
    });
  }
  A.body = body;
  A.inbox = function () {
    return cached('inbox', function () {
      return arr(call('inbox')).map(function (m, i) {
        return { id: String(m.id !== undefined ? m.id : 'm' + i), day: num(m.day, 0), kind: KIND[m.kind] || 'report', title: m.title || '(untitled)', from: m.from || '', body: body(m.body), refs: arr(m.refs).map(part), urgent: !!m.urgent, read: !!m.read, choices: m.choices ? arr(m.choices) : null, answered: m.answered || null };
      });
    });
  };
  A.msg = function (id) { return A.inbox().filter(function (m) { return m.id === String(id); })[0] || null; };
  A.markRead = function (id) { try { if (A.g.markRead) A.g.markRead(id); } catch (e) { /* ignore */ } };
  A.answer = function (id, choice) { var r; try { r = A.g.answer(id, choice); } catch (e) { r = { ok: false, err: e.message }; } A.bump(); r = r || {}; return { ok: r.ok !== false && !r.err, err: r.err || '', msgs: arr(r.msgs) }; };
  A.bodyText = function (m) { return m.body.map(function (b) { if (b.k === 'table') return ''; return (b.x || []).map(function (p) { return typeof p === 'string' ? p : p.text; }).join(''); }).join(' '); };
  A.msgsAbout = function (id) { id = String(id); return A.inbox().filter(function (m) { return m.refs.some(function (r) { return typeof r === 'object' && r.id === id; }); }); };

  // ------------------------------------------------------------ cases
  function testRec(t) { return { day: num(t.day, null), kind: t.kind || '', result: t.result || 'pending', resultDay: num(t.resultDay, null), sample: t.sample || null }; }
  function normCase(c) {
    var out = c.outcome || '', st = c.status || 'suspected';
    var disp = out === 'died' ? 'died' : out === 'icu' ? 'icu' : out === 'hospital' ? 'hospital' : st === 'discarded' ? 'negative' : out === 'recovered' && st === 'confirmed' ? 'recovered' : st;
    var tree = A.treeIds();
    return {
      pid: String(c.pid), name: c.name || '—', age: num(c.age, null), sex: c.sex || '', district: str(c.district),
      onset: num(c.onset, null), reported: num(c.reported, null), status: disp, caseStatus: st, outcome: out,
      admitted: num(c.admitted, null), died: num(c.died, null),
      tests: arr(c.tests).map(testRec), interviewed: !!c.interviewed, traced: !!c.traced, household: !!c.household,
      exposures: c.exposures ? arr(c.exposures) : null, contacts: c.contacts ? arr(c.contacts).map(String) : null,
      cluster: arr(c.cluster).map(String), seqId: str(c.seqId), seq: c.seqId ? (tree[String(c.seqId)] ? 'done' : 'pending') : null,
      via: c.via || '', pos: null, raw: c
    };
  }
  A.cases = function () { return cached('cases', function () { return arr(call('lineList')).map(normCase); }); };
  A.caseOf = function (pid) { var id = String(pid); return cached('caseIdx', function () { var o = {}; A.cases().forEach(function (c) { o[c.pid] = c; }); return o; })[id] || null; };
  /** 'none' | 'pending' | 'pos' | 'neg' (panel negative / PCR negative) | 'flu' (a known pathogen) */
  A.testState = function (c) {
    var t = c.tests; if (!t.length) return 'none';
    if (t.some(function (x) { return x.result === 'pos'; })) return 'pos';
    var last = t[t.length - 1];
    if (last.result === 'pending') return 'pending';
    if (t.some(function (x) { return x.result === 'flu' || x.result === 'other'; })) return 'flu';
    return 'neg';
  };
  A.testLabel = function (t) {
    var panel = t.kind === 'panel';
    return { pending: 'Awaiting result', pos: 'Positive', neg: panel ? 'Panel negative — no known pathogen' : 'Negative', flu: 'Influenza — a known virus', other: 'Another known pathogen' }[t.result] || UIcap(t.result);
  };
  A.contacts = function () { return cached('contacts', function () { return arr(call('contacts')).map(function (c) { return { pid: String(c.pid), name: c.name, of: arr(c.of).map(String), exposure: num(c.exposure, null), setting: c.setting || '', followUntil: num(c.followUntil, null), status: c.status || 'monitoring', tested: c.tested }; }); }); };
  A.person = function (pid) {
    var p = call('person', String(pid)) || {};
    var c = A.caseOf(pid), k = p.known || {};
    var fl = A.contacts().filter(function (x) { return x.pid === String(pid); })[0] || null;
    return {
      pid: String(pid), name: p.name || (c && c.name) || 'Unknown', age: num(p.age, c ? c.age : null), sex: p.sex || (c && c.sex) || '', district: str(p.district !== undefined ? p.district : c && c.district),
      address: p.address || null, heritage: p.heritage || null, portrait: p.portrait,
      occupation: k.occupation || null, workplace: k.workplace ? part(k.workplace) : null, school: k.school ? part(k.school) : null, habits: arr(k.habits), household: arr(k.household).map(String),
      c: c, known: !!c, status: c ? c.status : fl ? 'contact' : 'contact', contactOf: arr(p.contactOf).map(String), followUp: p.followUp || null, follow: fl,
      notes: arr(p.notes), raw: p
    };
  };

  // ------------------------------------------------------------ series
  A.curve = function () {
    return cached('curve', function () {
      var e = call('epiCurve') || {};
      var start = num(e.from, num(e.start, 0));
      var n = Math.max(arr(e.byOnset).length, arr(e.byReport).length);
      function s(a) { a = arr(a); var o = []; for (var i = 0; i < n; i++) o.push(num(a[i], 0)); return o; }
      var nc = arr(e.nowcast), now = [];
      for (var i = 0; i < n; i++) { var x = nc[i]; now.push(x && typeof x === 'object' ? { lo: num(x.lo, 0), hi: num(x.hi, 0) } : null); }
      return { start: start, n: n, byOnset: s(e.byOnset), byReport: s(e.byReport), nowcast: now, admissions: s(e.admissions), deaths: s(e.deaths), ili: e.ili ? s(e.ili) : null, tests: e.tests ? s(e.tests) : null, positive: e.positive ? s(e.positive) : null, byAge: e.byAge || null };
    });
  };
  A.ww = function () {
    return cached('ww', function () {
      var w = call('wastewater') || {};
      var by = w.byDistrict || {}, o = {};
      Object.keys(by).forEach(function (k) { o[String(k)] = arr(by[k]).map(function (v) { return v === null || v === undefined ? null : num(v, null); }); });
      return { start: num(w.from, num(w.start, 0)), byDistrict: o, sampling: w.sampling !== undefined ? !!w.sampling : Object.keys(o).length > 0, unit: w.unit || '', flag: w.flag || {} };
    });
  };
  A.treeIds = function () { return cached('treeIds', function () { var o = {}; arr((call('tree') || {}).nodes).forEach(function (n) { o[String(n.id)] = 1; }); return o; }); };
  A.tree = function () {
    return cached('tree', function () {
      var t = call('tree') || {};
      return { root: str(t.root), nodes: arr(t.nodes).map(function (n) { return { id: String(n.id), pid: str(n.sampleOf), parent: str(n.parent), muts: arr(n.mutations), day: num(n.day, null), lineage: n.lineage || null, variant: n.variant || null }; }) };
    });
  };
  A.clusters = function () {
    return cached('clusters', function () {
      return arr(call('clusters')).map(function (c, i) {
        var pid = refId(c.place), p = A.place(pid);
        return { id: String(c.id || 'c' + i), place: pid, name: (c.place && c.place.d) || (p && p.name) || 'Cluster', pos: (p && p.pos) || null, cases: arr(c.cases).map(String), size: num(c.size, arr(c.cases).length), kind: c.kind || (p && p.kind) || '', firstOnset: num(c.firstOnset, null), lastOnset: num(c.lastOnset, null), note: c.note || '' };
      });
    });
  };

  // ------------------------------------------------------------ actions & orders
  var AREA = { investigate: 'investigate', lab: 'lab', contain: 'contain', protect: 'protect', communicate: 'communicate', admin: 'admin' };
  function normParam(p) {
    var t = p.type === 'int' || p.type === 'number' ? 'range' : p.type || 'range';
    var opts = p.options ? arr(p.options).map(function (o) { return typeof o === 'object' ? { id: String(o.id), label: o.label || String(o.id) } : { id: String(o), label: String(o) }; }) : null;
    return { id: p.id, label: p.label || p.id, type: t, min: p.min, max: p.max, step: p.step, options: opts, items: t === 'order' ? opts : null, value: p.default !== undefined ? p.default : p.value, unit: p.unit };
  }
  A.actions = function () {
    return cached('actions', function () {
      return arr(call('actions')).map(function (a) {
        var c = a.costs || {}, order = !!a.order;
        var money = num(c.money, 0) * 1000;
        return {
          id: String(a.id), label: a.label || a.id, area: AREA[a.area] || 'investigate', order: order, kind: order ? 'order' : 'action',
          costs: { hours: c.hours || {}, tests: num(c.tests, 0), seq: num(c.seq, 0), money: order ? 0 : money, perDay: order ? money : 0, economy: num(a.economy, 0) * 1e6 },
          target: a.target || 'none', targetKinds: a.targetKinds || null, params: a.params && arr(a.params).length ? arr(a.params).map(normParam) : null,
          lag: num(a.lag, null), available: a.available !== false, why: a.available === false ? (a.why || 'Not available') : '', desc: a.desc || (a.available !== false ? a.why : '') || '', effect: a.effect || '', raw: a
        };
      });
    });
  };
  A.action = function (id) { return A.actions().filter(function (a) { return a.id === id; })[0] || null; };
  A.canAct = function (id, target, params) { try { return A.g.canAct ? A.g.canAct(id, target === undefined ? null : target, params || {}) : null; } catch (e) { return e.message; } };
  A.doAct = function (id, target, params) {
    var r, a = A.action(id), g = A.g;
    try {
      if (a && a.order && typeof g.order === 'function') { var p = {}; Object.keys(params || {}).forEach(function (k) { p[k] = params[k]; }); if (target !== undefined && target !== null) p.target = target; r = g.order(id, p); }
      else if (typeof g.act === 'function') r = g.act(id, target === undefined ? null : target, params || {});
      else if (typeof g.doAct === 'function') r = g.doAct(id, target === undefined ? null : target, params || {});
      else r = { ok: false, err: 'The engine has no action entry point' };
    } catch (e) { r = { ok: false, err: e.message }; if (typeof console !== 'undefined') console.error(e); }
    A.bump();
    r = r || {};
    var msgs = arr(r.msgs);
    return { ok: r.ok !== false && !r.err, err: r.err || r.error || '', msgs: msgs.map(function (m) { return typeof m === 'string' ? m : m.title || m.text || ''; }), msgIds: msgs.filter(function (m) { return m && m.id !== undefined; }).map(function (m) { return String(m.id); }), raw: r };
  };
  A.orders = function () {
    return cached('orders', function () {
      return arr(call('orders')).map(function (o) { return { id: String(o.id), type: o.type || o.action, label: o.label || o.type, target: refId(o.target), params: o.params || {}, since: num(o.since, 0), lag: num(o.lag, 0), effectFrom: num(o.effectFrom, num(o.since, 0) + num(o.lag, 0)), compliance: num(o.compliance, null), costPerDay: num(o.costPerDay, 0) * 1000, economyPerDay: num(o.economyPerDay, 0) * 1e6 }; });
    });
  };
  A.revoke = function (id) { var r; try { r = A.g.revoke(id); } catch (e) { r = { ok: false, err: e.message }; } A.bump(); return r || { ok: true }; };

  // ------------------------------------------------------------ estimates (percent traits carried as 0..1 in the UI)
  function isPct(t) { return t.type === 'percent' || t.type === 'pct'; }
  A.estimates = function () {
    return cached('est', function () {
      var e = call('estimates') || {};
      var traits = arr(e.traits).map(function (t) {
        var pct = isPct(t), ty = pct ? 'pct' : t.id === 'originCase' || t.type === 'person' ? 'person' : t.id === 'caseDef' || t.type === 'multi' ? 'multi' : t.options ? 'choice' : t.type === 'number' ? 'number' : t.type || 'number';
        var opts = t.options ? arr(t.options).map(function (o) { return typeof o === 'object' ? { id: String(o.id), label: o.label || String(o.id) } : { id: String(o), label: String(o) }; }) : null;
        var o = { id: t.id, label: t.label || t.id, type: ty, options: opts, unit: t.unit || '', key: !!t.key, min: t.min, max: t.max, step: t.step };
        if (pct) { o.min = t.min !== undefined ? t.min / 100 : 0; o.max = t.max !== undefined ? t.max / 100 : 1; o.step = t.step !== undefined ? t.step / 100 : 0.01; }
        return o;
      });
      var tt = {}; traits.forEach(function (t) { tt[t.id] = t; });
      function toUI(id, v) { return v !== null && v !== undefined && tt[id] && tt[id].type === 'pct' ? v / 100 : v; }
      var pub = {}; Object.keys(e.published || {}).forEach(function (k) { var p = e.published[k]; pub[k] = p && typeof p === 'object' && 'value' in p ? { value: toUI(k, p.value), day: num(p.day, null), revisions: num(p.revisions, 0) } : { value: toUI(k, p), day: null, revisions: 0 }; });
      var draft = {}; Object.keys(e.draft || {}).forEach(function (k) { draft[k] = toUI(k, e.draft[k]); });
      return { traits: traits, published: pub, draft: draft, history: arr(e.history), engineDraft: typeof A.g.setDraft === 'function' };
    });
  };
  function toEngine(id, v) { var t = A.estimates().traits.filter(function (x) { return x.id === id; })[0]; return t && t.type === 'pct' && v !== null && v !== undefined ? Math.round(v * 1000) / 10 : v; }
  A.setDraft = function (id, v) { try { if (A.g.setDraft) A.g.setDraft(id, v === undefined ? null : toEngine(id, v)); } catch (e) { /* ignore */ } A.bump(); };
  A.publish = function (vals) {
    var o = {}; Object.keys(vals).forEach(function (k) { o[k] = toEngine(k, vals[k]); });
    var r; try { r = A.g.publish(o); } catch (e) { r = { ok: false, err: e.message }; }
    A.bump(); r = r || {};
    return { ok: r.ok !== false && !r.err, err: r.err || '', msgs: arr(r.msgs) };
  };

  // ------------------------------------------------------------ day
  A.endDay = function (n) {
    var act0 = A.actNo();
    var r = (n && n > 1 && typeof A.g.advance === 'function' ? A.g.advance(n) : A.g.endDay()) || {};
    A.bump();
    var ev = arr(r.events);
    if (A.actNo() !== act0 && !ev.some(function (e) { return e.kind === 'act'; })) ev.push({ kind: 'act', act: A.actNo() });
    ev.forEach(function (e) { if (e.kind === 'act' && e.act === undefined) e.act = A.actNo(); });
    return { newMsgs: arr(r.newMsgs), events: ev };
  };
  A.canAdvance = function () { return typeof A.g.advance === 'function'; };

  // ------------------------------------------------------------ mentor
  var TIER = ['nudge', 'pointer', 'answer'];
  A.mentorInfo = function () {
    var M = typeof IX !== 'undefined' && IX.MENTOR || {};
    var c = M.costs || {};
    function cost(x) { if (!x) return 'Free'; if (typeof x === 'number') return x ? x + ' credibility' : 'Free'; var s = []; Object.keys(x).forEach(function (k) { s.push(x[k] + (k === 'credibility' ? ' credibility' : 'h ' + k)); }); return s.join(', ') || 'Free'; }
    return { name: M.name || 'Dr Ife Okonjo', title: M.title || 'Retired consultant epidemiologist', bio: M.bio || '', costs: [c.nudge === 0 || !c.nudge ? 'Free · once a day' : cost(c.nudge), cost(c.pointer), cost(c.answer)] };
  };
  A.mentorStatus = function () {
    var s = call('mentorStatus');
    if (!s) return [{ ok: true }, { ok: true }, { ok: true }];
    return TIER.map(function (k) { var x = s[k] || {}; return { ok: x.ok !== false, why: x.why || '' }; });
  };
  A.mentor = function (tier) {
    var r; try { r = A.g.mentor(TIER[tier] || tier); } catch (e) { r = { ok: false, text: 'Dr Okonjo is not answering: ' + e.message }; }
    A.bump(); r = r || {};
    return { ok: r.ok !== false, text: r.text || r.why || '', action: r.action || null, trait: r.trait || null };
  };

  // ------------------------------------------------------------ debrief
  A.debrief = function () { return cached('debrief', function () { return call('debrief') || {}; }); };
  A.debriefN = function () {
    var D = A.debrief() || {}, truth = (D.truth && (D.truth.card || D.truth)) || {};
    var traitDefs = A.estimates().traits, byId = {}; traitDefs.forEach(function (t) { byId[t.id] = t; });
    var ests = arr(D.estimates);
    var traits = (ests.length ? ests : traitDefs.map(function (t) { return { trait: t.id, label: t.label, truth: truth[t.id] }; })).map(function (e) {
      var t = byId[e.trait] || { id: e.trait, label: e.label || e.trait, type: typeof e.truth === 'number' ? 'number' : 'choice' };
      function conv(v) { return t.type === 'pct' && typeof v === 'number' ? v / 100 : v; }
      var pv = e.published && typeof e.published === 'object' && 'value' in e.published ? e.published.value : e.published;
      var G = { good: 'good', close: 'near', wrong: 'off', none: 'none' };
      return { id: t.id, label: e.label || t.label, truth: fmtT(t, conv(e.truth !== undefined ? e.truth : truth[t.id])), yours: pv === undefined || pv === null ? null : fmtT(t, conv(pv)), day: num(e.day, null), verdict: G[e.grade] || (pv === null || pv === undefined ? 'none' : 'near'), key: t.key };
    });
    function fmtT(t, v) {
      if (v === undefined || v === null) return '—';
      if (t.type === 'person') { var c = A.caseOf(v); return c ? c.name : String(v); }
      if (Array.isArray(v)) return v.map(function (x) { var o = (t.options || []).filter(function (y) { return y.id === String(x); })[0]; return o ? o.label : x; }).join(', ');
      if (t.type === 'pct') return UIfmt.pct(v, v < 0.01 ? 2 : v < 0.1 ? 1 : 0);
      if (t.type === 'number' || typeof v === 'number') return (+v).toFixed(Math.abs(v) < 10 && v % 1 ? 1 : 0) + (t.unit ? ' ' + t.unit : '');
      var op = (t.options || []).filter(function (y) { return y.id === String(v); })[0];
      return op ? op.label : UIcap(String(v));
    }
    var cv = D.curves || {}, act = cv.actual || {}, gh = cv.ghost || {};
    var dth = D.deaths || {}, costs = D.costs || {};
    var named = arr(dth.named).map(function (p) { return { pid: str(p.pid), name: p.name, age: num(p.age, null), district: str(p.district), day: num(p.day, null), note: p.note || '' }; });
    var frames = [];
    arr(D.frames).forEach(function (f) { arr(f.infections).forEach(function (x) { frames.push({ pid: String(x[0]), day: num(f.day, 0), pos: [x[1], x[2]], kind: x[3] || null }); }); });
    var tnodes = arr(D.tree && D.tree.nodes ? D.tree.nodes : D.tree).map(function (n) { var pl = A.place(n.place); return { id: String(n.pid !== undefined ? n.pid : n.id), parent: str(n.infector !== undefined ? n.infector : n.parent), day: num(n.day, 0), setting: n.setting || (pl ? pl.kind : ''), placeName: pl ? pl.name : '', name: n.name || null, died: !!n.died }; });
    var byT = {}; tnodes.forEach(function (n) { byT[n.id] = n; });
    frames.forEach(function (f) { var n = byT[f.pid]; if (n) f.by = n.parent; });
    var namesByPid = {}; named.forEach(function (p) { if (p.pid) namesByPid[p.pid] = p; });
    tnodes.forEach(function (n) { if (namesByPid[n.id]) { n.died = true; n.name = n.name || namesByPid[n.id].name; } var c = A.caseOf(n.id); if (c && !n.name) n.name = c.name; });
    var og = D.origin || null;
    if (og) { var op = A.place(og.place); var ys = (A.estimates().published.source || {}).value; og = { source: og.source, name: og.primaryName || null, day: num(og.day, null), place: op ? op.name : (og.place && og.place.d) || null, found: !!og.found, yourSource: ys || null }; }
    function total(a) { return Array.isArray(a) ? a.reduce(function (s, v) { return s + (v || 0); }, 0) : num(a, 0); }
    var sc = D.score || null;
    return {
      outcome: A.outcome() || D.outcome || null, agentName: A.agentName() || truth.name || 'The agent', traits: traits,
      symptoms: arr(truth.symptoms).map(function (s) { return Array.isArray(s) ? s : [s.label || s.name || s.id || String(s), s.freq !== undefined ? s.freq : s.p]; }),
      tell: truth.tell || null, scale: A.city().scale,
      totals: { deaths: named.length || total(act.deaths), ghostDeaths: num(dth.ghost, total(gh.deaths)), infections: total(act.infections), ghostInfections: total(gh.infections), cost: num(costs.spent, 0) * 1000, economy: num(costs.economy, 0) * 1e6, closureDays: num(costs.closureDays, 0), hospital: total(act.hospital), ghostHospital: total(gh.hospital) },
      curves: { start: num(cv.from, 0), actual: arr(act.infections), ghost: arr(gh.infections), deaths: arr(act.deaths), ghostDeaths: arr(gh.deaths) },
      frames: frames, tree: tnodes, deaths: named, origin: og,
      trust: { start: frac(D.trust && D.trust.start, null), end: frac(D.trust && D.trust.end, A.res().trust.overall) },
      score: sc ? { total: num(sc.total, null), lines: arr(sc.lines), grade: D.grade || sc.grade || null } : (D.grade ? { grade: D.grade, lines: [] } : null)
    };
  };
  A.trials = function () { return []; };
  return A;
})();
