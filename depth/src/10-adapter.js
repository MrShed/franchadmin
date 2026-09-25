/* DEPTH UI — 10-adapter.js
 * The ONLY UI file that touches the engine (DX; contract in depth/SPEC.md,
 * real shapes in the engine's 07-case.js / depth/ENGINE.md). Every view reads
 * through UIA, which normalises engine shapes into the small set the
 * interface draws:
 *   frequencies in MHz; modes 'voice' | 'cw' | 'burst' (+ bcast flag);
 *   times as minutes into the shift (0..480, 18:00 = 0) plus a shift index;
 *   bearings in compass degrees (0 = north = -y, clockwise);
 *   positions [x, y] in the unit square (y down, the sea to the north);
 *   message bodies as blocks [{k:'p'|'n'|'m'|'q', x:[parts]}], parts being
 *   strings or {ref, id, text}; digit strings with '?' for unknown digits.
 * Heavy reads are cached until the game changes (UIA.bump()). Where the engine
 * lacks something the SPEC promised (e.g. the mentor), the adapter supplies a
 * modest UI-side stand-in so the interface keeps working.
 */
var UIA = (function () {
  'use strict';
  var A = { g: null, v: 0, cache: {} };
  var SAVE_KEY = 'depth.save.v1';

  function arr(x) { return Array.isArray(x) ? x : x === undefined || x === null ? [] : typeof x === 'object' && typeof x.length !== 'number' ? Object.keys(x).map(function (k) { return x[k]; }) : [x]; }
  function num(x, d) { x = typeof x === 'string' && x !== '' && !isNaN(+x) ? +x : x; return typeof x === 'number' && isFinite(x) ? x : d; }
  function str(x) { return x === undefined || x === null ? null : String(x); }
  function pt(p) { if (!p) return null; if (Array.isArray(p) && p.length >= 2) return [+p[0], +p[1]]; if (typeof p === 'object' && 'x' in p) return [+p.x, +p.y]; return null; }
  function has(name) { return A.g && typeof A.g[name] === 'function'; }
  function hasB(name) { return A.g && A.g.bench && typeof A.g.bench[name] === 'function'; }
  function safe(f, d) { try { var x = f(); return x === undefined ? d : x; } catch (e) { if (typeof console !== 'undefined') console.warn('[UIA]', e && e.message); return d; } }
  function cached(key, f) { if (A.cache[key] && A.cache[key].v === A.v) return A.cache[key].x; var x = f(); A.cache[key] = { v: A.v, x: x }; return x; }
  function digitStr(d) { if (typeof d === 'string') return d; return arr(d).map(function (x) { return x === null || x < 0 || x === '?' ? '?' : String(x); }).join(''); }
  A.bump = function () { A.v++; };
  A.dx = function () { return typeof DX !== 'undefined' ? DX : null; };

  // ------------------------------------------------------------ lifecycle
  A.ready = function () { return typeof DX !== 'undefined' && typeof DX.newCase === 'function'; };
  A.isMock = function () { return typeof DX !== 'undefined' && !!DX._isMock; };
  var GDEF = [
    { id: 'cadet', label: 'Cadet', blurb: 'Five nights, six warrants, the codebook on file and the workbench pointing out where to look.' },
    { id: 'analyst', label: 'Analyst', blurb: 'The standard case. Four nights, four warrants, suggestions on the bench and a supervisor who helps if asked.' },
    { id: 'chief', label: 'Chief', blurb: 'Three warrants, a nervous ring and no checkerboard: recover it yourself. The tools still do the sums.' }
  ];
  A.grades = function () {
    var gg = typeof DX !== 'undefined' && Array.isArray(DX.GRADES) ? DX.GRADES : null;
    if (!gg || !gg.length) return GDEF;
    return gg.map(function (x) { var id = typeof x === 'string' ? x : x.id, d = GDEF.filter(function (y) { return y.id === id; })[0] || {}; return { id: id, label: (x && x.label) || d.label || id, blurb: (x && x.blurb) || d.blurb || '' }; });
  };
  A.create = function (seed, grade, opts) {
    opts = opts || {};
    var o = { grade: grade };
    if (opts.tutorial) o.tutorial = true;
    A.g = DX.newCase(String(seed), o);
    A.seed = String(A.g.seed || seed); A.grade = A.g.grade || grade; A.tutorial = !!opts.tutorial;
    A.cache = {}; A.bump();
    return A.g;
  };
  A.restore = function (s) { A.g = DX.load(s); A.cache = {}; A.bump(); return A.g; };
  A.serialize = function () { var s = A.g.save(); return typeof s === 'string' ? s : JSON.stringify(s); };
  A.readSave = function () { try { var s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } };
  A.writeSave = function (ui) {
    if (!A.g) return false;
    try {
      var c = A.clock();
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, engine: A.serialize(), ui: ui, when: Date.now(), seed: A.seed, grade: A.grade, tutorial: A.tutorial, shift: c.shift, shifts: c.shifts, label: c.label, night: c.night, over: A.over() }));
      return true;
    } catch (e) { return false; }
  };
  A.clearSave = function () { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } };
  A.loadSaved = function (o) { A.restore(o.engine); A.seed = o.seed || A.g.seed; A.grade = o.grade || A.g.grade || 'analyst'; A.tutorial = !!o.tutorial; return A.g; };
  A.gradeId = function () { return (A.g && A.g.grade) || A.grade || 'analyst'; };
  /** suggestions (likely crib positions, same-indicator badges, best-fit key digits) */
  A.helps = function () { var gi = A.g && A.g.gradeInfo; if (gi && gi.suggest !== undefined) return !!gi.suggest; return A.gradeId() !== 'chief'; };
  A.cadet = function () { return A.gradeId() === 'cadet'; };
  A.mentorInfo = function () { var m = typeof DX !== 'undefined' && DX.MENTOR_INFO; return { name: (m && m.name) || 'Mrs I. Holm', title: (m && m.title) || 'Night supervisor', bio: (m && m.bio) || '', short: ((m && m.name) || 'Mrs Holm').replace(/^(Mrs|Mr|Miss|Ms)\s+(\w+)\s+/, '$1 ') }; };
  /** minutes each bench / station operation costs (engine costs(), or modest defaults) */
  A.costs = function () { return cached('costs', function () { var c = has('costs') ? safe(function () { return A.g.costs(); }, {}) : {}; var d = { depth: 2, crib: 1, place: 0, period: 5, columns: 3, align: 3, setKey: 1, suggest: 2, boardSolve: 60, accept: 0, warrant: 10, van: 30, df: 3 }; for (var k in c) d[k] = num(c[k], d[k]); return d; }); };

  // ------------------------------------------------------------ clock
  function hhmm(m) { var t = 18 * 60 + Math.round(m), hh = Math.floor(t / 60) % 24, mm = ((t % 60) + 60) % 60; return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; }
  A.hhmm = hhmm;
  A.nightLabel = function (shift) { var D = A.dx(); if (D && D.dateLabel) return safe(function () { return D.dateLabel(shift); }, 'Night ' + (shift + 1)); return 'Night ' + (shift + 1); };
  A.clock = function () {
    var c = A.g, k = safe(function () { return c.clock(); }, {}) || {};
    var shift = num(c.shift, num(k.shift, 0)), shifts = num(c.shifts, 4), minute = num(c.minute, num(k.minute, 0));
    return { shift: shift, shifts: shifts, minute: minute, label: k.label || hhmm(minute), day: k.date || k.day || '', night: k.date || k.night || A.nightLabel(shift), abs: shift * 480 + minute, left: 480 - minute };
  };
  A.over = function () { return !!(A.g && A.g.over); };
  A.outcome = function () { var o = A.g.outcome; if (!o) return null; if (typeof o === 'string') o = { kind: o }; return { kind: o.kind || 'open', win: o.win !== undefined ? !!o.win : o.kind === 'stopped', title: o.title || '', text: o.text || '', how: o.how || o.kind }; };
  var ALERT_L = ['calm', 'wary', 'nervous', 'alarmed', 'running scared'];
  /** {level 0..4, label, value 0..100} */
  A.alert = function () {
    var c = A.g;
    if (has('alertLevel')) { var a = safe(function () { return c.alertLevel(); }, null); if (a && typeof a === 'object') return { level: UIclamp(num(a.level, 0), 0, 4), label: a.label || ALERT_L[num(a.level, 0)], value: num(a.value, 0) }; }
    var v = num(c.alert, 0); if (v <= 4) v = v * 25; // tolerate 0..3/4 scales
    var l = v < 20 ? 0 : v < 40 ? 1 : v < 60 ? 2 : v < 80 ? 3 : 4;
    return { level: l, label: ALERT_L[l], value: v };
  };

  // ------------------------------------------------------------ city
  A.city = function () {
    return cached('city', function () {
      var c = A.g.city || {};
      var ds = arr(c.districts).map(function (d, i) { return { id: d.id !== undefined ? String(d.id) : 'd' + i, name: d.name || 'District ' + (i + 1), poly: arr(d.poly || d.polygon).map(pt), centre: pt(d.centre || d.center) || [0.5, 0.5], blurb: d.blurb || '' }; });
      var ps = arr(c.places).map(function (p, i) { return { id: p.id !== undefined ? String(p.id) : 'p' + i, kind: String(p.kind || p.type || 'place').toLowerCase(), name: p.name || p.label || 'Place', code: p.code || '', district: str(p.district), pos: pt(p.pos || p.centre || p.at), blurb: p.blurb || '' }; });
      var os = arr(c.outstations).map(function (o, i) { return { id: o.id !== undefined ? String(o.id) : 'o' + i, name: o.name || 'DF ' + (i + 1), pos: pt(o.pos || o.at) || [0, 0], quality: num(o.quality, 1) }; });
      var st = arr(c.streets).map(function (s) { var line = Array.isArray(s) ? s : s.line || s.pts || s.points || []; return { name: s.name || '', line: line.map(pt).filter(Boolean), major: !!(s.major || s.main || /vej$|allé|gade$/i.test(s.name || '') && false) }; }).filter(function (s) { return s.line.length > 1; });
      var river = arr(c.river && (c.river.line || c.river)).map(pt).filter(Boolean);
      var hb = c.harbour || null, harbour = null;
      if (hb) harbour = { poly: arr(hb.poly || hb.polygon || (Array.isArray(hb) ? hb : [])).map(pt).filter(Boolean), coast: arr(hb.coast).map(pt).filter(Boolean), quays: arr(hb.quays).map(String) };
      var dById = {}, pById = {}, oById = {};
      ds.forEach(function (d) { dById[d.id] = d; });
      ps.forEach(function (p) { pById[p.id] = p; if (!p.pos && dById[p.district]) p.pos = dById[p.district].centre; if (!p.pos) p.pos = [0.5, 0.5]; });
      os.forEach(function (o) { oById[o.id] = o; });
      var sea = arr(c.sea).map(pt).filter(Boolean), coast = arr(c.coast).map(pt).filter(Boolean);
      return { name: c.name || 'Haldmar', districts: ds, places: ps, outstations: os, streets: st, river: river.length > 1 ? river : null, harbour: harbour, sea: sea.length > 2 ? sea : null, coast: coast.length > 1 ? coast : (harbour && harbour.coast.length > 1 ? harbour.coast : null), dById: dById, pById: pById, oById: oById };
    });
  };
  A.district = function (id) { return A.city().dById[String(id)] || null; };
  A.place = function (id) { return A.city().pById[String(id)] || null; };
  A.districtAt = function (x, y) {
    var best = null, bd = 9;
    A.city().districts.forEach(function (d) { if (bd < 0) return; if (d.poly.length > 2 && UIgeo.inPoly(x, y, d.poly)) { best = d; bd = -1; } else { var e = Math.hypot(d.centre[0] - x, d.centre[1] - y); if (e < bd) { bd = e; best = d; } } });
    return best;
  };
  /** located buildings (engine: van/raid/watch evidence) and marked areas */
  A.buildings = function () {
    return cached('bld', function () {
      if (!has('buildings')) return [];
      return arr(safe(function () { return A.g.buildings(); }, [])).map(function (b) { return { id: String(b.id), address: b.address || b.name || b.id, pos: pt(b.pos) || [0.5, 0.5], district: str(b.district), how: b.how || '', occupant: b.occupant || null, evidence: arr(b.evidence), callsigns: arr(b.callsigns).map(String), raided: !!b.raided, strong: !!b.strong }; });
    });
  };
  A.building = function (id) { return A.buildings().filter(function (b) { return b.id === String(id); })[0] || null; };
  A.areas = function () { return cached('areas', function () { if (!has('areas')) return []; return arr(safe(function () { return A.g.areas(); }, [])).map(function (a) { return { id: String(a.id), callsign: a.callsign || null, centre: pt(a.centre) || [0.5, 0.5], r: num(a.r, 0.03), shift: num(a.shift, 0) }; }); }); };

  // ------------------------------------------------------------ the air
  function mode(m) { m = String(m || '').toLowerCase(); if (/burst/.test(m)) return 'burst'; if (/cw|morse/.test(m)) return 'cw'; return 'voice'; }
  function mhz(f) { f = num(f, 0); return f > 100 ? f / 1000 : f; }
  A.mode = mode;
  function tx(t) {
    var m = String(t.mode || ''), bc = !!(t.bcast || t.broadcast || t.kind === 'broadcast' || /bcast|broadcast/i.test(m));
    var cs = t.callsign || null;
    return { id: String(t.id), freq: mhz(t.freq), mode: bc ? (/time|pip/i.test(t.label || '') ? 'cw' : 'voice') : mode(m), strength: UIclamp(num(t.strength, 0.6), 0, 1), drift: num(t.drift, 0.5),
      label: bc ? (t.label || 'Broadcast') : (cs || (t.label ? String(t.label).split(/\s*[→>-]+\s*/)[0] : null)), route: t.label || null, callsign: cs, bcast: bc, ends: num(t.t1 !== undefined ? t.t1 : t.ends, null), started: num(t.t0 !== undefined ? t.t0 : t.started !== undefined ? t.started : t.start, null), fist: t.fist || null };
  }
  A.band = function () {
    return cached('band', function () {
      var b = safe(function () { return A.g.band(); }, {}) || {};
      var now = arr(b.now || b).map(tx);
      return { now: now, noise: num(b.noise, 0.25), schedule: arr(b.schedule).map(slot) };
    });
  };
  /** receiver audio parameters for a transmission (engine signal(): callup, fist, voice, the interval tune, true groups for synthesis only) */
  A.signal = function (id) {
    return cached('sig' + id, function () {
      if (!has('signal')) return null;
      var s = safe(function () { return A.g.signal(id); }, null); if (!s) return null;
      var f = s.fist || null;
      return { callup: s.callup || '', fist: f ? { wpm: num(f.wpm, 16), dah: num(f.dah, 3), gap: num(f.charGap, num(f.gap, 1.2)), wordGap: num(f.wordGap, 7), jitter: num(f.jitter, 0.06), swing: num(f.swing, 0), quirk: f.quirk || '' } : null,
        voice: s.voice ? { sex: s.voice.voice || s.voice.sex || 'female', interval: arr(s.voice.interval).map(Number) } : null, noise: num(s.noise, 0.25), groups: arr(s.groups).map(String), dur: num(s.dur, 5), t0: num(s.t0, 0) };
    });
  };
  function slot(s) {
    var at = num(s.at !== undefined ? s.at : s.minute !== undefined ? s.minute : s.start, 0);
    return { id: s.id !== undefined ? String(s.id) : (s.callsign || '') + '@' + at + '@' + s.freq, at: at, dur: num(s.dur !== undefined ? s.dur : s.duration, 6), freq: mhz(s.freq), mode: mode(s.mode), callsign: s.callsign || null, to: s.to || null, label: s.label && !/^\d\d:\d\d$/.test(s.label) ? s.label : (s.callsign || '?') + (s.repeat ? ' (repeat)' : ''), repeat: !!s.repeat, source: s.source || '', nights: arr(s.nights) };
  }
  A.upcoming = function (ahead) { return cached('up' + ahead, function () { return arr(safe(function () { return A.g.upcoming(ahead); }, [])).map(slot).sort(function (a, b) { return a.at - b.at; }); }); };
  A.schedule = function () { return cached('sched', function () { return has('schedule') ? arr(safe(function () { return A.g.schedule(); }, [])).map(slot) : A.band().schedule; }); };
  /** q: {freqErr (kHz, mean absolute), modeOk, driftHeld (0..1)} */
  A.tune = function (id, q) {
    var r = safe(function () { return A.g.tune(id, q); }, { ok: false, err: 'The receiver lost it.' }) || {};
    A.bump();
    var groups = arr(r.groups).map(function (x) { return String(x); });
    var ic = r.intercept || {};
    return { ok: r.ok !== false && !r.err, err: r.err ? UIcap(r.err) + '.' : '', groups: groups, quality: num(r.quality, null), lost: num(r.lost, 0), logId: str(ic.id || r.logId || r.id), msg: str(r.msg || r.message), indicator: str(ic.indicator || r.indicator), callsign: ic.callsign || r.callsign || null, to: ic.to || r.to || null, text: r.text || '', broadcast: !!r.broadcast, repeat: !!(ic.repeat || r.repeat), events: events(r.events) };
  };
  function evText(e) {
    if (e.text || e.msg) return e.text || e.msg;
    var t = e.t !== undefined ? hhmm(e.t) + ' ' : '';
    if (e.kind === 'heard') return t + 'heard on the band watch: ' + UImhz(mhz(e.freq)) + ' MHz ' + UImodeName(mode(e.mode)) + (e.callsign ? ' (' + e.callsign + ')' : '') + ' — not copied.';
    if (e.kind === 'warrant') return t + 'Special Branch: ' + (e.result || (e.wkind || 'warrant') + ' carried out') + '.';
    if (e.kind === 'op') return t + (e.stopped ? 'The operation was stopped.' : 'Something happened in the city tonight.');
    return '';
  }
  function events(x) { return arr(x && x.events ? x.events : x).map(function (e) { if (typeof e === 'string') return { kind: 'note', text: e }; return { kind: e.kind || 'note', text: evText(e), t: num(e.t, null), tx: str(e.tx), intercept: str(e.intercept) }; }); }
  A.wait = function (m) { var r = safe(function () { return A.g.wait(m); }, []); A.bump(); return events(r); };
  A.advanceTo = function (m) { var r = safe(function () { return A.g.advanceTo(m); }, []); A.bump(); return events(r); };

  // ------------------------------------------------------------ DF + van
  function fix(f) { if (!f) return null; var p = pt(f); if (!p) return null; return { x: p[0], y: p[1], rx: num(f.rx, 0.03), ry: num(f.ry, num(f.rx, 0.03)), rot: num(f.rot, 0) }; }
  function df(d) { if (!d) return null; return { bearings: arr(d.bearings).map(function (b) { return { station: String(b.station !== undefined ? b.station : b.id), deg: num(b.deg !== undefined ? b.deg : b.bearing, 0), sd: num(b.sd, 4) }; }), fix: fix(d.fix), district: str(d.district), abroad: !!d.abroad }; }
  A.df = function (id, stations) {
    var r = safe(function () { return A.g.df(id, stations); }, { err: 'The outstations did not answer.' }) || {};
    A.bump();
    var o = df(r) || { bearings: [], fix: null };
    o.ok = r.ok !== false && !r.err && o.bearings.length > 0; o.err = r.err ? UIcap(r.err) + '.' : (o.bearings.length ? '' : 'No bearings.');
    return o;
  };
  /** re-compute a fix from adjusted bearings (engine fix()), or null */
  A.refix = function (bearings) { if (!has('fix')) return null; return fix(safe(function () { return A.g.fix(bearings); }, null)); };
  /** van scene in UI terms: scene coordinates 0..1 inside a square of the city */
  A.van = function (id, centre) {
    var r = safe(function () { return A.g.van(id, centre); }, { err: 'The van is not available.' }) || {};
    if (r.err || r.ok === false) return { ok: false, err: UIcap(r.err || 'The van cannot go.') + '.' };
    var sc = r.scene || r;
    if (sc.blocks) {
      return { ok: true, id: str(sc.id), tx: String(id), district: str(sc.district), origin: pt(sc.origin), size: num(sc.size, 0.16), cols: num(sc.cols, 6), rows: num(sc.rows, 6), streets: arr(sc.streets).map(function (s) { return { name: s.name || '', a: pt(s.a), b: pt(s.b) }; }),
        blocks: arr(sc.blocks).map(function (b) { return { x: +b.x, y: +b.y, w: +b.w, h: +b.h, buildings: arr(b.buildings).map(function (q) { return { id: String(q.id), x: +q.x, y: +q.y }; }) }; }),
        start: pt(sc.start) || [0.5, 1], seconds: num(sc.seconds, 75), _scene: sc };
    }
    // SPEC/mock shape: grid bounds in city coords + target
    var gr = sc.grid || {}, b = [gr.x0, gr.y0, gr.x1, gr.y1];
    if (b.some(function (v) { return typeof v !== 'number'; })) { var tt = pt(sc.target) || [0.5, 0.5]; b = [tt[0] - 0.08, tt[1] - 0.08, tt[0] + 0.08, tt[1] + 0.08]; }
    var size = b[2] - b[0], cols = num(gr.cols, 6), rows = num(gr.rows, 6), rg = UIrand('van' + id), blocks = [], streets = [];
    for (var i = 0; i <= cols; i++) streets.push({ name: '', a: [i / cols, 0], b: [i / cols, 1] });
    for (var j = 0; j <= rows; j++) streets.push({ name: '', a: [0, j / rows], b: [1, j / rows] });
    for (i = 0; i < cols; i++) for (j = 0; j < rows; j++) { var bl = { x: i / cols + 0.012, y: j / rows + 0.012, w: 1 / cols - 0.024, h: 1 / rows - 0.024, buildings: [] }; for (var q = 0; q < 4; q++) bl.buildings.push({ id: 'v' + i + j + q, x: bl.x + bl.w * (0.2 + rg() * 0.6), y: bl.y + bl.h * (q < 2 ? 0.1 : 0.9) }); blocks.push(bl); }
    var tg = pt(sc.target);
    return { ok: true, id: null, tx: String(id), district: str(sc.district), origin: [b[0], b[1]], size: size, cols: cols, rows: rows, streets: streets, blocks: blocks, start: [0.5, 1], seconds: num(sc.seconds, 75), _target: tg ? [(tg[0] - b[0]) / size, (tg[1] - b[1]) / size] : [0.5, 0.5], _scene: sc };
  };
  /** meter 0..1 at scene point (engine DX.vanMeter, or distance to the mock's target) */
  A.vanMeter = function (scene, x, y, sec) {
    if (scene._scene && scene._scene.k && typeof DX !== 'undefined' && DX.vanMeter) return num(safe(function () { return DX.vanMeter(scene._scene, x, y, sec); }, 0), 0);
    var t = scene._target || [0.5, 0.5], d = Math.hypot(x - t[0], y - t[1]);
    return UIclamp(1 / (1 + Math.pow(d / 0.16, 2)) + (Math.random() - 0.5) * 0.08, 0, 1);
  };
  A.vanResult = function (scene, found) {
    var sc = scene && scene._scene;
    var r = safe(function () {
      if (sc && sc.k) return A.g.vanResult(found ? { x: found[0], y: found[1] } : null, scene.id);
      // SPEC/mock: city coordinates
      return A.g.vanResult(found ? { x: scene.origin[0] + found[0] * scene.size, y: scene.origin[1] + found[1] * scene.size } : null);
    }, {}) || {};
    A.bump();
    var kind = r.kind || (r.exact ? 'exact' : r.ok ? 'area' : 'none');
    return { ok: r.ok !== false, kind: kind, exact: kind === 'exact', building: r.building ? String(r.building.id || r.building) : str(r.place), text: r.text || '', events: events(r.events) };
  };

  // ------------------------------------------------------------ log & messages
  A.log = function () {
    return cached('log', function () {
      return arr(safe(function () { return A.g.log(); }, [])).map(function (e, i) {
        var t = num(e.t, 0), shift = num(e.shift, Math.floor(t / 480)), minute = num(e.minute, t >= 480 ? t - shift * 480 : t);
        var groups = arr(e.groups).map(String);
        return { id: String(e.id !== undefined ? e.id : 'L' + i), tx: str(e.tx), t: shift * 480 + minute, shift: shift, minute: minute, label: e.clock || hhmm(minute), freq: mhz(e.freq), mode: mode(e.mode), callsign: e.callsign || null, to: e.to || null,
          length: num(e.length, groups.length), indicator: str(e.indicator), groups: groups, quality: num(e.quality, null), lost: num(e.lost, 0), df: df(e.df), faint: !!(e.faint || e.missed), msg: str(e.msg), repeat: !!e.repeat, decoy: !!(e.decoy || e.test), dur: num(e.dur, null) };
      });
    });
  };
  A.logEntry = function (id) { return A.log().filter(function (e) { return e.id === String(id); })[0] || null; };
  function verdictOf(d) { var v = d.verdict || d.grade || d.result; if (v) return String(v); return d.holes ? 'partial' : 'right'; }
  A.messages = function () {
    return cached('msgs', function () {
      return arr(safe(function () { return A.g.messages(); }, [])).map(function (m) {
        var groups = arr(m.groups).map(String), kind = String(m.kind || 'pad').toLowerCase(), ind = str(m.indicator);
        // the engine lists the indicator as group 0 of a pad message; the SPEC mock does not
        var body = kind === 'pad' && ind && groups[0] === ind && !A.isMock() ? groups.slice(1) : groups;
        var d = m.decrypted;
        var first = m.first ? num(m.first.shift, 0) * 480 + num(m.first.t, 0) : num(m.t, null);
        return { id: String(m.id), no: num(m.no, null), from: m.from || '?', to: m.to || '?', groups: groups, body: body, digits: body.join(''), indicator: ind, kind: kind, copies: num(m.copies, 1), t: first, holes: num(m.holes, (body.join('').match(/\?/g) || []).length),
          text: m.text || null, source: m.source || null, same: arr(m.sameIndicator).map(String),
          decrypted: d ? { text: String(d.text || ''), verdict: verdictOf(d), score: num(d.score, null) } : kind === 'clear' && m.text ? { text: String(m.text), verdict: 'right', score: 1 } : null };
      });
    });
  };
  A.message = function (id) { return A.messages().filter(function (m) { return m.id === String(id); })[0] || null; };
  /** pairs of pad messages sharing an indicator group (the page) — observable, shown as a suggestion on Cadet/Analyst */
  A.depthPairs = function () {
    var ms = A.messages().filter(function (m) { return m.kind === 'pad' && m.indicator && m.indicator.indexOf('?') < 0; }), out = [];
    for (var i = 0; i < ms.length; i++) for (var j = i + 1; j < ms.length; j++) if (ms[i].indicator === ms[j].indicator) out.push([ms[i].id, ms[j].id]);
    return out;
  };
  A.board = function () {
    return cached('board', function () {
      var b = safe(function () { return has('board') ? A.g.board() : A.g.board; }, null);
      if (!b || !b.rows) return null;
      var rows = arr(b.rows).map(function (r, i) { if (Array.isArray(r)) return { prefix: i ? '?' : '', cells: r.map(function (c) { return c || null; }) }; return { prefix: r.prefix === undefined || r.prefix === null ? '' : String(r.prefix), cells: arr(r.cells).map(function (c) { return c || null; }) }; });
      var blanks = b.blanks ? arr(b.blanks).map(Number) : rows[0].cells.map(function (c, i) { return c ? -1 : i; }).filter(function (i) { return i >= 0; });
      if (rows.length > 1 && rows[1].prefix === '?') rows.forEach(function (r, i) { if (i) r.prefix = String(blanks[i - 1]); });
      var map = {}; rows.forEach(function (r) { r.cells.forEach(function (c, i) { if (c) map[c] = r.prefix + i; }); });
      var engine = !!b.codes;
      // engine: FIG '/' and STOP '.', figures written twice; mock: FIG '.' and STOP '/', figures once
      var fig = b.fig || (engine ? map['/'] : map['.']) || null, stop = b.stop || (engine ? map['.'] : map['/']) || null;
      return { key: b.key || '', rows: rows, blanks: blanks, map: map, fig: fig, stop: stop, figSym: engine ? '/' : '.', stopSym: engine ? '.' : '/', doubleFigs: engine };
    });
  };
  /** letters -> digits with the held board (engine encode when available). Spaces vanish; '.' is the stop code. */
  A.encode = function (text) {
    var b = A.board(); if (!b) return null;
    if (hasB('encode') && !A.isMock()) { var r = safe(function () { return A.g.bench.encode(text); }, null); if (r && r.ok !== false && r.digits) return String(r.digits); }
    var out = '', fig = false;
    String(text).toUpperCase().replace(/Æ/g, 'AE').replace(/Ø/g, 'OE').replace(/Å/g, 'AA').split('').forEach(function (ch) {
      if (ch >= '0' && ch <= '9') { if (!fig && b.fig) { out += b.fig; fig = true; } out += b.doubleFigs ? ch + ch : ch; return; }
      if (fig && b.fig) { out += b.fig; fig = false; }
      if (ch === '.' && b.stop) { out += b.stop; return; }
      if (b.map[ch] && ch !== b.figSym) out += b.map[ch];
    });
    if (fig && b.fig) out += b.fig;
    return out;
  };
  /** digits -> [{ch, i, n}] (each letter with the digit index it started at and its digit count); skip digits at the start */
  A.decodeCells = function (digits, skip) {
    var b = A.board(); if (!b) return null;
    var out = [], i = skip || 0, fig = false, bl = b.blanks.map(String), figPend = null;
    function cell(p, c) { var r = b.rows[bl.indexOf(p) + 1]; return r ? r.cells[+c] : null; }
    while (i < digits.length) {
      var d = digits[i];
      if (d === '?' || d === undefined) { out.push({ ch: '?', i: i, n: 1 }); i++; continue; }
      if (bl.indexOf(d) >= 0) {
        var n = digits[i + 1]; if (n === undefined) { out.push({ ch: '?', i: i, n: 1 }); break; }
        var c = n === '?' ? '?' : cell(d, n);
        if (c === b.figSym) { fig = !fig; out.push({ ch: '', i: i, n: 2, fig: true }); }
        else if (fig && c !== '?') { out.push({ ch: d, i: i, n: 1 }); i++; continue; }
        else out.push({ ch: c === b.stopSym ? '.' : (c || '?'), i: i, n: 2 });
        i += 2; continue;
      }
      if (fig) { if (b.doubleFigs && digits[i + 1] === d) { out.push({ ch: d, i: i, n: 2 }); i += 2; } else { out.push({ ch: d, i: i, n: 1 }); i++; } continue; }
      out.push({ ch: b.rows[0].cells[+d] || '?', i: i, n: 1 }); i++;
    }
    return out;
  };
  /** plausibility of a decoded fragment 0..1 (engine language model, else a vowel/letter heuristic) */
  A.plaus = function (text) {
    text = String(text || '');
    if (typeof DX !== 'undefined' && DX.plaus && !A.isMock()) return num(safe(function () { return DX.plaus(text).score; }, 0), 0);
    var t = text.replace(/[^A-Z]/g, ''); if (t.length < 3 || /\?/.test(text)) return 0;
    var v = (t.match(/[AEIOU]/g) || []).length / t.length, bad = (t.match(/[QXZJ]{1}|[^AEIOU]{4,}/g) || []).length;
    return UIclamp(1 - Math.abs(v - 0.4) * 2.5 - bad * 0.25, 0, 1);
  };
  /** expected plaintext digit frequencies under the held board (10 fractions) */
  var EN = { E: 12.0, T: 9.1, A: 8.1, O: 7.7, I: 7.3, N: 6.9, S: 6.3, R: 6.0, H: 5.9, D: 4.3, L: 4.0, U: 2.9, C: 2.7, M: 2.6, F: 2.3, Y: 2.1, W: 2.1, G: 2.0, P: 1.8, B: 1.5, V: 1.1, K: 0.7, X: 0.2, Q: 0.1, J: 0.1, Z: 0.1 };
  A.expected = function () {
    return cached('expected', function () {
      var b = A.board(), f = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], tot = 0;
      if (!b) return null;
      var eng = A.dx() && A.dx().boardExpect && A.g._s && A.g._s.board && A.dx().boardCache ? safe(function () { return DX.boardExpect(DX.boardCache(A.g._s.board)); }, null) : null;
      if (eng) return eng.slice();
      EN[b.stopSym] = 7;
      Object.keys(EN).forEach(function (ch) { var code = b.map[ch]; if (!code) return; for (var i = 0; i < code.length; i++) { f[+code[i]] += EN[ch]; tot += EN[ch]; } });
      return f.map(function (x) { return x / tot; });
    });
  };

  // ------------------------------------------------------------ workbench
  function spent(r) { if (r && r.events) A._lastEvents = events(r.events); }
  A.bench = {
    depth: function (a, b) { var r = safe(function () { return A.g.bench.depth(a, b); }, null); A.bump(); if (!r || r.ok === false) return null; spent(r); return { diff: digitStr(r.diff || r), same: !!r.sameIndicator }; },
    /** authoritative crib (engine; may cost a minute). side 'A' puts the crib in message a. */
    crib: function (a, b, crib, offset, side) {
      var r = safe(function () { return A.g.bench.crib(a, b, crib, offset, side || 'A'); }, null); A.bump(); if (!r || r.ok === false) return r && r.err ? { err: r.err } : null;
      if (typeof r === 'string') r = { other: r };
      var pl = num(r.plaus, num(r.score, r.plausible ? 1 : 0));
      return { other: String(r.other || ''), plaus: pl, plausible: !!(r.plausible || pl >= 0.55), words: arr(r.words), skip: num(r.skip, 0), cribDigits: str(r.cribDigits), otherDigits: str(r.otherDigits || r.digits), fits: r.fits !== false };
    },
    /** free local preview for dragging: crib digits against the difference strip (no engine time) */
    preview: function (diff, crib, offset, side) {
      var cd = A.encode(crib); if (!cd) return null;
      var other = '';
      for (var i = 0; i < cd.length; i++) { var dd = diff[offset + i]; if (dd === undefined) break; if (dd === '?') { other += '?'; continue; } other += side === 'B' ? String((+cd[i] + +dd) % 10) : String(((+cd[i] - +dd) % 10 + 10) % 10); }
      var best = null;
      [0, 1].forEach(function (sk) { var cells = A.decodeCells(other, sk) || []; var t = cells.map(function (c) { return c.ch; }).join(''); var p = A.plaus(t); if (!best || p > best.plaus) best = { cells: cells, text: t, plaus: p, skip: sk }; });
      return { cribDigits: cd, otherDigits: other, cells: best.cells, other: best.text, plaus: best.plaus, skip: best.skip, fits: other.length === cd.length };
    },
    has: function (name) { return hasB(name); },
    place: function (a, b, side, crib, offset) { if (!hasB('place')) return null; var r = safe(function () { return A.g.bench.place(a, b, side, crib, offset); }, null); A.bump(); spent(r); return r && r.ok !== false ? work(r) : null; },
    unplace: function (a, b, index) { if (!hasB('unplace')) return null; var r = safe(function () { return A.g.bench.unplace(a, b, index); }, null); A.bump(); return r && r.ok !== false ? work(r) : null; },
    work: function (a, b) { if (!hasB('work')) return null; var r = safe(function () { return A.g.bench.work(a, b); }, null); return r && r.ok !== false ? work(r) : null; },
    suggest: function (a, b, offset, side) { if (!hasB('suggest')) return null; var r = safe(function () { return A.g.bench.suggest(a, b, offset, side); }, null); A.bump(); spent(r); if (!r || r.ok === false) return null; return arr(r.list).map(function (x) { return { word: String(x.word), other: String(x.other || ''), plaus: num(x.plaus, 0) }; }); },
    period: function (id) {
      var r = safe(function () { return A.g.bench.period(id); }, null); A.bump(); if (!r || r.ok === false) return null; spent(r);
      return { ic: arr(r.ic).map(function (x) { return { period: num(x.period, 0), ic: num(x.ic, 0) }; }), repeats: arr(r.repeats).map(function (x) { return { seq: String(x.seq), spacing: num(x.spacing, 0) }; }), best: num(r.best, null) };
    },
    columns: function (id, p) {
      var r = safe(function () { return A.g.bench.columns(id, p); }, null); A.bump(); if (!r || r.ok === false) return null; spent(r);
      var cols = Array.isArray(r) ? r : arr(r.cols);
      return { cols: cols.map(function (c, i) { var f = []; for (var d = 0; d < 10; d++) f.push(num(c.freq ? c.freq[d] : c[d], 0)); return { col: num(c.col, i), n: num(c.n, f.reduce(function (s, x) { return s + x; }, 0)), freq: f, fit: c.fit ? arr(c.fit).map(function (x) { return { shift: num(x.shift, 0), score: num(x.score, 0) }; }) : null }; }), expect: r.expect ? arr(r.expect).map(Number) : A.expected() };
    },
    align: function (id, p) { if (!hasB('align')) return null; var r = safe(function () { return A.g.bench.align(id, p); }, null); A.bump(); spent(r); return r && r.ok !== false ? { rel: arr(r.rel).map(Number), conf: arr(r.conf).map(Number) } : null; },
    setKey: function (id, key) {
      var r = safe(function () { return A.g.bench.setKey(id, key); }, null); A.bump(); if (r === null || r === undefined || r.ok === false) return null; spent(r);
      if (typeof r === 'string') return { text: r, plaus: A.plaus(r) };
      return { text: String(r.text || r.plain || ''), plaus: num(r.plaus, A.plaus(r.text || '')) };
    },
    boardSolve: function (id, rel) { if (!hasB('boardSolve')) return { ok: false, err: 'The computer room is closed.' }; var r = safe(function () { return A.g.bench.boardSolve(id, rel); }, { ok: false }); A.bump(); spent(r); return { ok: r.ok !== false && !r.err, err: r.err ? UIcap(r.err) + '.' : '', keyword: r.keyword || '' }; },
    accept: function (id, text) {
      var r = safe(function () { return A.g.bench.accept(id, text); }, { ok: false, err: 'The bench would not take it.' }) || {};
      A.bump();
      var v = r.verdict || r.grade || r.result || (r.ok === false ? 'wrong' : 'right');
      return { ok: r.ok !== false && !r.err, err: r.err || '', verdict: String(v), score: num(r.score, null), text: r.text || text };
    }
  };
  function work(r) {
    function side(s) { s = s || {}; return { text: String(s.text || ''), digits: String(s.digits || ''), runs: arr(s.runs).map(function (x) { return { from: num(x.from, 0), to: num(x.to, 0), known: !!x.known, text: x.text || '' }; }), plaus: num(s.plaus, 0) }; }
    return { a: side(r.a), b: side(r.b), placed: arr(r.placed).map(function (p) { return { side: p.side === 'B' ? 'B' : 'A', text: String(p.text), offset: num(p.offset, 0) }; }), diff: str(r.diff) };
  }

  // ------------------------------------------------------------ traffic diagram
  A.links = function () {
    return cached('links', function () {
      var r = safe(function () { return A.g.links(); }, []);
      var list = Array.isArray(r) ? r : arr(r && r.links);
      return list.map(function (l) {
        var s = l.support, sc = num(l.score, null);
        if (typeof s === 'number') { sc = s; s = l.supported || s >= 0.5 ? 'strong' : s > 0 ? 'some' : 'none'; }
        return { a: String(l.a), b: String(l.b), kind: l.kind || 'talks', support: s || 'hunch', score: sc === null ? 0 : sc, why: l.why || '', evidence: num(l.evidence, null) };
      });
    });
  };
  /** traffic seen between callsigns [{from, to, n}] (engine), else built from the log */
  A.traffic = function () {
    return cached('traffic', function () {
      var r = safe(function () { return A.g.links(); }, null);
      if (r && !Array.isArray(r) && r.traffic) return arr(r.traffic).map(function (t) { return { from: String(t.from), to: String(t.to), n: num(t.n, 1) }; });
      var m = {}; A.log().forEach(function (e) { if (e.callsign && e.to && !e.decoy) { var k = e.callsign + '>' + e.to; m[k] = (m[k] || 0) + 1; } });
      return Object.keys(m).map(function (k) { var p = k.split('>'); return { from: p[0], to: p[1], n: m[k] }; });
    });
  };
  A.LINK_KINDS = [['talks', 'Talks to', 'They exchange traffic.'], ['controls', 'Gives orders to', 'The first sends, the second answers.'], ['same', 'Same operator', 'One hand on the key under two callsigns.']];
  A.link = function (a, b, kind) { var r = safe(function () { return A.g.link(a, b, kind || 'talks'); }, {}); A.bump(); return r || {}; };
  A.unlink = function (a, b) { var r = safe(function () { return A.g.unlink(a, b); }, {}); A.bump(); return r || {}; };

  // ------------------------------------------------------------ warrants & desk
  A.warrants = function () {
    return cached('warrants', function () {
      var w = safe(function () { return A.g.warrants(); }, {}) || {};
      var used = arr(w.used).map(function (u, i) { return { id: String(u.id || 'W' + i), kind: String(u.kind || '').toLowerCase(), target: str(u.target), targetName: u.targetLabel || u.targetName || ((A.place(u.target) || A.building(u.target) || {}).name) || String(u.target || ''), night: num(u.night, num(u.shift, num((u.params || {}).night, 0))), status: u.status || 'pending', result: u.result || '' }; });
      var left = num(w.left, 0);
      return { left: left, max: num(w.total, num(w.max, left + used.length)), used: used };
    });
  };
  A.warrant = function (kind, target, params) {
    var r = safe(function () { return A.g.warrant(kind, target, params || {}); }, { ok: false, err: 'Special Branch did not answer.' }) || {};
    A.bump();
    var msgs = arr(r.msgs).map(function (m) { if (typeof m === 'string' && /^N\d+$/.test(m)) { var x = A.inbox().filter(function (q) { return q.id === m; })[0]; return x ? x.title : ''; } return String(m); }).filter(Boolean);
    return { ok: r.ok !== false && !r.err, err: r.err ? UIcap(r.err) + '.' : '', msgs: msgs, events: events(r.events) };
  };
  /** parts: plain strings, {t|ref|type, id, d|text|name} refs, and inline [[kind:id|text]] markup */
  function parts(b) {
    var out = [];
    arr(b).forEach(function (p) {
      if (p === null || p === undefined) return;
      if (typeof p === 'string' || typeof p === 'number') {
        String(p).split(/(\[\[[^\]]+\]\])/).forEach(function (s) {
          var m = /^\[\[(\w+):([^|\]]+)\|?([^\]]*)\]\]$/.exec(s);
          if (m) out.push({ ref: m[1], id: m[2], text: m[3] || m[2] }); else if (s) out.push(s);
        });
        return;
      }
      var t = String(p.t || p.ref || p.type || 'place');
      out.push({ ref: t === 'cs' ? 'callsign' : t, id: String(p.id), text: String(p.d || p.text || p.name || p.id) });
    });
    return out;
  }
  function blocks(b) {
    if (b === null || b === undefined) return [];
    if (typeof b === 'string') return b.split(/\n\n+/).map(function (s) { return { k: 'p', x: parts(s) }; });
    var list = arr(b), isBlocks = list.some(function (l) { return l && typeof l === 'object' && (l.k || l.x); });
    if (!isBlocks) return [{ k: 'p', x: parts(list) }].map(function (bl) { var out = [], cur = []; bl.x.forEach(function (p) { if (typeof p === 'string' && /\n\n/.test(p)) { var sp = p.split(/\n\n+/); sp.forEach(function (s, i) { if (s) cur.push(s); if (i < sp.length - 1) { out.push({ k: 'p', x: cur }); cur = []; } }); } else cur.push(p); }); out.push({ k: 'p', x: cur }); return out; })[0];
    return list.map(function (l) { if (typeof l === 'string') return { k: 'p', x: parts(l) }; return { k: l.k || 'p', x: parts(l.x !== undefined ? l.x : l.text) }; });
  }
  A.parts = parts;
  var KINDS = { super: 'super', superintendent: 'super', brief: 'super', outcome: 'super', mentor: 'mentor', sb: 'sb', warrant: 'sb', branch: 'sb', watch: 'sb', report: 'report', van: 'report', file: 'file', casefile: 'file', registry: 'file', bench: 'bench', system: 'system', station: 'system' };
  A.inbox = function () {
    return cached('inbox', function () {
      return arr(safe(function () { return A.g.inbox(); }, [])).map(function (m, i) {
        var t = num(m.t, 0), shift = num(m.shift, Math.floor(t / 480)), minute = t >= 480 ? t - shift * 480 : t;
        return { id: String(m.id !== undefined ? m.id : 'm' + i), t: shift * 480 + minute, shift: shift, label: m.clock || hhmm(minute), kind: KINDS[String(m.kind || '').toLowerCase()] || 'system', rawKind: m.kind || '', from: m.from || 'Station', title: m.title || m.subject || '(no subject)', body: blocks(m.body || m.text), read: !!m.read, urgent: !!m.urgent, msg: str(m.msg) };
      }).sort(function (a, b) { return b.t - a.t || (b.id > a.id ? 1 : -1); });
    });
  };
  A.markRead = function (id) { safe(function () { if (has('markRead')) A.g.markRead(id); }); A.bump(); };
  A.people = function () {
    return cached('people', function () {
      var ps = has('people') ? arr(safe(function () { return A.g.people(); }, [])) : [];
      var out = ps.map(function (p) { return { id: String(p.id), name: p.name || '?', job: p.job || p.cover || '', home: str(p.home), arrested: !!p.arrested }; });
      A.buildings().forEach(function (b) { var o = b.occupant; if (o && o.name && !out.some(function (q) { return q.name === o.name; })) out.push({ id: String(o.id || o.name), name: o.name, job: o.cover || o.job || '', home: b.id, arrested: !!o.arrested }); });
      A.inbox().forEach(function (m) { m.body.forEach(function (bl) { bl.x.forEach(function (p) { if (typeof p === 'object' && p.ref === 'person' && !out.some(function (q) { return q.id === p.id || q.name === p.text; })) out.push({ id: p.id, name: p.text, job: '', home: null, arrested: false }); }); }); });
      return out;
    });
  };
  A.person = function (id) { return A.people().filter(function (p) { return p.id === String(id); })[0] || null; };
  A.endShift = function () {
    var before = A.clock();
    var r = safe(function () { return A.g.endShift(); }, {}) || {};
    A.bump();
    var rep = r.report || {}, lines = arr(rep.lines || rep.text).map(String);
    if (!lines.length) {
      if (rep.copied !== undefined) lines.push(rep.copied + ' transmission' + (rep.copied === 1 ? '' : 's') + ' copied' + (rep.heard !== undefined ? ' of ' + rep.heard + ' heard' : '') + '.');
      if (rep.warrantsLeft !== undefined) lines.push(rep.warrantsLeft + ' warrant' + (rep.warrantsLeft === 1 ? '' : 's') + ' left.');
      if (rep.alert && rep.alert.label) lines.push('The ring seems ' + rep.alert.label + '.');
      if (rep.reactions) lines.push('Towards dawn their traffic pattern looked different.');
    }
    return { events: events(r.events), report: { title: rep.title || 'End of night ' + (before.shift + 1), lines: lines } };
  };
  /** the mentor: engine c.mentor(tier) if present; otherwise a small UI-side reading of the observable state */
  A.mentor = function (tier) {
    if (has('mentor')) {
      var r = safe(function () { return A.g.mentor(tier); }, null);
      A.bump();
      if (r) { if (typeof r === 'string') r = { text: r }; return { text: String(r.text || r.err || ''), action: r.action || null, cost: r.cost || null, ok: r.ok !== false }; }
    }
    return A._mentorLocal(tier);
  };
  A._mentorLocal = function (tier) {
    var up = A.upcoming(480), log = A.log(), copied = log.filter(function (e) { return !e.faint; }), pairs = A.depthPairs(), ms = A.messages(), card = A.opCard();
    var per = ms.filter(function (m) { return m.kind === 'periodic' && !m.decrypted; })[0];
    var t;
    if (!copied.length) t = up.length ? ['The ' + up[0].label + ' broadcast at ' + hhmm(up[0].at) + ' is where to start.', 'Wait until ' + hhmm(up[0].at) + ', tune ' + UImhz(up[0].freq) + ' MHz, lever on ' + (up[0].mode === 'voice' ? 'AM' : 'CW') + ', and press COPY.', 'I have set the schedule strip for you: press "Wait for".'] : ['Watch the band.', 'Use "Watch the band" — it stops when something new comes up.', 'Watch the band until something appears.'];
    else if (pairs.length) t = ['Look at the first group of every message.', 'Messages ' + pairs[0][0] + ' and ' + pairs[0][1] + ' share their first group: put them in depth.', 'Open the bench with ' + pairs[0][0] + ' and ' + pairs[0][1] + ' in depth and drag TO along the strip.'];
    else if (per) t = ['Courier traffic has no indicator page. Try the period finder.', per.id + ' uses a short repeating key: run the period finder on it.', 'Open ' + per.id + ' on the bench, period finder first.'];
    else if (!card.where.known) t = ['Keep copying: the controller will name the target in time.', 'The controller’s broadcasts carry the orders; get clean copies of each.', 'Copy every controller broadcast, including the repeats.'];
    else t = ['You know enough to act. Think about the stake-out.', 'The card says where and when: order a stake-out.', 'Desk → Warrants → Stake-out on ' + (card.where.value || 'the target') + '.'];
    var i = UIclamp(tier - 1, 0, 2);
    var action = pairs.length && copied.length ? { tab: 'bench', a: pairs[0][0], b: pairs[0][1] } : null;
    return { text: t[i], action: tier >= 2 ? action : null, ok: true, local: true };
  };
  /** operation card: engine opCard() (facts learnt from correct reads) plus the player's pencil notes */
  A.opCard = function () {
    return cached('card', function () {
      var c = has('opCard') ? safe(function () { return A.g.opCard(); }, null) : null;
      var out = {};
      ['what', 'where', 'when', 'who'].forEach(function (k) { var f = c && c[k] || {}; out[k] = { known: !!f.known, value: f.value || null, from: arr(f.from).map(String), note: f.note || '', place: str(f.place), night: f.night === undefined || f.night === null ? null : num(f.night, null), callsign: f.callsign || null }; });
      out.codeword = c && c.codeword ? (c.codeword.value || c.codeword) : null;
      out.engine = !!c;
      return out;
    });
  };
  A.cardNote = function (field, note) { if (has('card')) { safe(function () { return A.g.card(field, note); }); A.bump(); return true; } return false; };
  A.debrief = function () {
    var r = safe(function () { return A.g.debrief(); }, {}) || {};
    var t = r.truth || {}, ringIn = t.ring || {}, op = t.operation || {};
    var mem = Array.isArray(ringIn) ? ringIn : arr(ringIn.members || ringIn.people);
    var members = mem.map(function (m) { return { id: String(m.id || m.callsign), name: m.name || '?', job: m.cover || m.job || '', role: m.role || 'agent', callsign: m.callsign || '', address: m.address || m.homeName || (A.place(m.home) || {}).name || '', district: str(m.district), how: m.txFrom || m.how || '', arrested: !!(m.arrested || m.caught), executor: !!m.executor, cipher: m.cipher || '', fist: m.fist || null }; });
    var ctl = t.controller || ringIn.controller || null;
    var links = arr(ringIn.links).map(function (l) { return { a: String(l.a || l[0]), b: String(l.b || l[1]) }; });
    if (!links.length) { var seen = {}; arr(t.plaintexts).forEach(function (p) { if (p.from && p.to) { var k = p.from + '>' + p.to; if (!seen[k]) { seen[k] = 1; links.push({ a: p.from, b: p.to }); } } }); }
    var sc = r.score;
    return {
      outcome: typeof r.outcome === 'string' ? { kind: r.outcome } : (r.outcome || A.outcome() || { kind: 'open' }),
      ring: { controller: ctl ? { callsign: ctl.callsign || ctl.call || '', voice: ctl.voice || '' } : null, members: members, links: links },
      op: { codeword: op.codeword || '', what: op.what || '?', whatText: op.whatText || '', where: str(op.place || op.where), whereName: op.placeName || op.whereName || '?', when: op.date ? op.date + (op.time ? ', ' + op.time : '') : (op.when || '?'), who: op.executor || op.who || '', whoName: op.executorName || op.whoName || '' },
      plaintexts: arr(t.plaintexts).map(function (p) { return { id: String(p.id), wb: str(p.wb), night: num(p.night, null), from: p.from || '', to: p.to || '', kind: p.cipher || p.kind || '', text: String(p.text || ''), decrypted: p.decrypted || null, heard: p.heard !== false, depthWith: arr(p.depthWith).map(String), cancelled: !!p.cancelled }; }),
      drops: arr(t.drops), meeting: t.meeting || null, keyword: t.keyword || '',
      stats: r.stats || {}, score: sc && typeof sc === 'object' ? { total: num(sc.total, 0), grade: sc.grade || '', parts: sc.parts || {} } : { total: num(sc, 0), grade: '', parts: {} }
    };
  };
  A.notes = function (v) {
    if (v === undefined) { var n = A.g.notes; return typeof n === 'string' ? n : n && typeof n.text === 'string' ? n.text : ''; }
    if (A.g.notes && typeof A.g.notes === 'object') A.g.notes.text = v; else A.g.notes = String(v);
    return v;
  };
  A.callsigns = function () {
    return cached('callsigns', function () {
      var m = {};
      A.log().forEach(function (e) { if (e.decoy) return; [e.callsign, e.to].forEach(function (c, k) { if (!c) return; var o = m[c] || (m[c] = { id: c, n: 0, sent: 0, got: 0, copied: 0, modes: {}, freqs: {}, times: [], first: e.t, last: e.t, fixes: [] }); o.n++; if (k === 0) { o.sent++; if (!e.faint) o.copied++; o.modes[e.mode] = 1; o.freqs[e.freq.toFixed(3)] = 1; o.times.push(e.minute); if (e.df && e.df.fix) o.fixes.push({ log: e.id, fix: e.df.fix, shift: e.shift }); } else o.got++; o.first = Math.min(o.first, e.t); o.last = Math.max(o.last, e.t); }); });
      return Object.keys(m).map(function (k) { return m[k]; });
    });
  };
  A.controller = function () { return (A.g && (A.g.controller || (A.g.ring && A.g.ring.controller && A.g.ring.controller.callsign))) || null; };
  return A;
})();
