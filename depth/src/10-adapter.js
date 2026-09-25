/* DEPTH UI — 10-adapter.js
 * The ONLY UI file that touches the engine (DX; contract in depth/SPEC.md,
 * real shapes in depth/ENGINE.md). Every view reads through UIA, which
 * normalises engine shapes into the small set the interface draws:
 *   frequencies in MHz, modes 'voice' | 'cw' | 'burst', times as minutes into
 *   the shift (0..480, 18:00 = 0) plus a shift index, bearings in compass
 *   degrees (0 = north = -y, clockwise), positions [x, y] in the unit square,
 *   message bodies as arrays of parts (string | {ref, id, text}).
 * Heavy reads are cached until the game changes (UIA.bump()).
 */
var UIA = (function () {
  'use strict';
  var A = { g: null, v: 0, cache: {} };
  var SAVE_KEY = 'depth.save.v1';

  function arr(x) { return Array.isArray(x) ? x : x === undefined || x === null ? [] : typeof x === 'object' && typeof x.length !== 'number' ? Object.keys(x).map(function (k) { return x[k]; }) : [x]; }
  function num(x, d) { x = typeof x === 'string' && x !== '' && !isNaN(+x) ? +x : x; return typeof x === 'number' && isFinite(x) ? x : d; }
  function str(x) { return x === undefined || x === null ? null : String(x); }
  function pt(p) { if (!p) return null; if (Array.isArray(p) && p.length >= 2) return [+p[0], +p[1]]; if (typeof p === 'object' && 'x' in p) return [+p.x, +p.y]; return null; }
  function g() { return A.g; }
  function has(name) { return A.g && typeof A.g[name] === 'function'; }
  function safe(f, d) { try { var x = f(); return x === undefined ? d : x; } catch (e) { if (typeof console !== 'undefined') console.warn('[UIA]', e && e.message); return d; } }
  function cached(key, f) { if (A.cache[key] && A.cache[key].v === A.v) return A.cache[key].x; var x = f(); A.cache[key] = { v: A.v, x: x }; return x; }
  A.bump = function () { A.v++; };

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
    A.seed = String(seed); A.grade = grade; A.tutorial = !!opts.tutorial;
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
  A.gradeId = function () { return A.grade || (A.g && A.g.grade) || 'analyst'; };
  /** suggestions (likely crib positions, same-indicator badges, best-fit key digits) */
  A.helps = function () { return A.gradeId() !== 'chief'; };
  A.cadet = function () { return A.gradeId() === 'cadet'; };

  // ------------------------------------------------------------ clock
  function hhmm(m) { var t = 18 * 60 + Math.round(m), hh = Math.floor(t / 60) % 24, mm = ((t % 60) + 60) % 60; return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; }
  A.hhmm = hhmm;
  A.SHIFT_LEN = 480;
  A.clock = function () {
    var c = A.g, k = safe(function () { return c.clock(); }, {}) || {};
    var shift = num(c.shift, 0), shifts = num(c.shifts, 4), minute = num(c.minute, 0);
    return { shift: shift, shifts: shifts, minute: minute, label: k.label || hhmm(minute), day: k.day || '', night: k.night || ('Night ' + (shift + 1)), hh: num(k.hh, 0), mm: num(k.mm, 0), abs: shift * 480 + minute };
  };
  A.over = function () { return !!(A.g && A.g.over); };
  A.outcome = function () { var o = A.g.outcome; if (!o) return null; return typeof o === 'string' ? { kind: o } : o; };
  A.alert = function () {
    var c = A.g, a = c.alert !== undefined ? c.alert : c.alertLevel !== undefined ? c.alertLevel : c.security && c.security.alert;
    if (typeof a === 'function') a = safe(function () { return a.call(c); }, 0);
    a = num(a, 0); if (a > 0 && a <= 1 && String(a).indexOf('.') >= 0) a = a * 3; // tolerate 0..1
    return Math.max(0, Math.min(3, Math.round(a)));
  };

  // ------------------------------------------------------------ city
  A.city = function () {
    return cached('city', function () {
      var c = A.g.city || (has('city') ? A.g.city() : {}) || {};
      var ds = arr(c.districts).map(function (d, i) { return { id: d.id !== undefined ? String(d.id) : 'd' + i, name: d.name || 'District ' + (i + 1), poly: arr(d.poly || d.polygon).map(pt), centre: pt(d.centre || d.center) || [0.5, 0.5] }; });
      var ps = arr(c.places).map(function (p, i) { return { id: p.id !== undefined ? String(p.id) : 'p' + i, kind: String(p.kind || p.type || 'place').toLowerCase(), name: p.name || p.label || 'Place', district: str(p.district), pos: pt(p.pos || p.centre || p.at) }; });
      var os = arr(c.outstations).map(function (o, i) { return { id: o.id !== undefined ? String(o.id) : 'o' + i, name: o.name || 'DF ' + (i + 1), pos: pt(o.pos || o.at) || [0, 0] }; });
      var st = arr(c.streets).map(function (s) { var line = Array.isArray(s) ? s : s.line || s.pts || s.points || []; return { name: s.name || '', line: line.map(pt).filter(Boolean), major: !!(s.major || s.main || s.kind === 'major') }; }).filter(function (s) { return s.line.length > 1; });
      var river = arr(c.river && (c.river.line || c.river)).map(pt).filter(Boolean);
      var hb = c.harbour || null, harbour = null;
      if (hb) harbour = { poly: arr(hb.poly || hb.polygon || (Array.isArray(hb) ? hb : [])).map(pt).filter(Boolean), coast: arr(hb.coast).map(pt).filter(Boolean) };
      var dById = {}, pById = {}, oById = {};
      ds.forEach(function (d) { dById[d.id] = d; });
      ps.forEach(function (p) { pById[p.id] = p; if (!p.pos && dById[p.district]) p.pos = dById[p.district].centre; if (!p.pos) p.pos = [0.5, 0.5]; });
      os.forEach(function (o) { oById[o.id] = o; });
      return { name: c.name || 'Haldmar', districts: ds, places: ps, outstations: os, streets: st, river: river.length > 1 ? river : null, harbour: harbour, dById: dById, pById: pById, oById: oById };
    });
  };
  A.district = function (id) { return A.city().dById[String(id)] || null; };
  A.place = function (id) { return A.city().pById[String(id)] || null; };
  A.districtAt = function (x, y) {
    var best = null, bd = 9;
    A.city().districts.forEach(function (d) { if (d.poly.length > 2 && UIgeo.inPoly(x, y, d.poly)) { best = d; bd = -1; } else if (bd >= 0) { var e = Math.hypot(d.centre[0] - x, d.centre[1] - y); if (e < bd) { bd = e; best = d; } } });
    return best;
  };

  // ------------------------------------------------------------ the air
  function mode(m) { m = String(m || '').toLowerCase(); if (/burst/.test(m)) return 'burst'; if (/cw|morse/.test(m)) return 'cw'; return 'voice'; }
  function mhz(f) { f = num(f, 0); return f > 100 ? f / 1000 : f; }
  A.mode = mode;
  function tx(t) {
    return { id: String(t.id), freq: mhz(t.freq), mode: mode(t.mode), strength: Math.max(0, Math.min(1, num(t.strength, 0.6))), drift: num(t.drift, 0.5),
      label: t.label || t.callsign || null, callsign: t.callsign || null, bcast: !!(t.bcast || t.broadcast || t.kind === 'broadcast'), ends: num(t.ends, null), started: num(t.started, num(t.start, null)) };
  }
  A.band = function () {
    return cached('band', function () {
      var b = safe(function () { return A.g.band(); }, {}) || {};
      var now = arr(b.now || b).map(tx);
      return { now: now, schedule: arr(b.schedule).map(slot) };
    });
  };
  function slot(s) { return { id: s.id !== undefined ? String(s.id) : null, at: num(s.at !== undefined ? s.at : s.minute !== undefined ? s.minute : s.start, 0), dur: num(s.dur !== undefined ? s.dur : s.duration, 5), freq: mhz(s.freq), mode: mode(s.mode), callsign: s.callsign || null, label: s.label || s.callsign || '?' }; }
  A.upcoming = function (ahead) { return cached('up' + ahead, function () { return arr(safe(function () { return A.g.upcoming(ahead); }, [])).map(slot).sort(function (a, b) { return a.at - b.at; }); }); };
  /** q: {freqErr (kHz, mean absolute), modeOk, driftHeld (0..1)} */
  A.tune = function (id, q) {
    var r = safe(function () { return A.g.tune(id, q); }, { ok: false, err: 'The receiver lost it.' }) || {};
    A.bump();
    var groups = arr(r.groups).map(function (x) { return String(x); });
    return { ok: r.ok !== false && !r.err, err: r.err || '', groups: groups, quality: num(r.quality, null), logId: str(r.logId || r.id), msg: str(r.msg || r.message), indicator: str(r.indicator), callsign: r.callsign || null, to: r.to || null, text: r.text || '', broadcast: !!r.broadcast, repeat: !!r.repeat };
  };
  function events(x) { return arr(x && x.events ? x.events : x).map(function (e) { return typeof e === 'string' ? { kind: 'note', text: e } : { kind: e.kind || 'note', text: e.text || e.msg || '', t: num(e.t, null) }; }); }
  A.wait = function (m) { var r = safe(function () { return A.g.wait(m); }, []); A.bump(); return events(r); };
  A.advanceTo = function (m) { var r = safe(function () { return A.g.advanceTo(m); }, []); A.bump(); return events(r); };

  // ------------------------------------------------------------ DF + van
  function fix(f) { if (!f) return null; var p = pt(f); if (!p) return null; return { x: p[0], y: p[1], rx: num(f.rx, 0.03), ry: num(f.ry, num(f.rx, 0.03)), rot: num(f.rot, 0) }; }
  function df(d) { if (!d) return null; return { bearings: arr(d.bearings).map(function (b) { return { station: String(b.station !== undefined ? b.station : b.id), deg: num(b.deg !== undefined ? b.deg : b.bearing, 0), sd: num(b.sd, 4) }; }), fix: fix(d.fix) }; }
  A.df = function (id, stations) {
    var r = safe(function () { return A.g.df(id, stations); }, { err: 'The outstations did not answer.' }) || {};
    A.bump();
    var o = df(r) || { bearings: [], fix: null };
    o.ok = !r.err && o.bearings.length > 0; o.err = r.err || (o.bearings.length ? '' : 'No bearings.');
    return o;
  };
  A.van = function (id) {
    var r = safe(function () { return A.g.van(id); }, { err: 'The van is not available.' }) || {};
    if (r.err) return { ok: false, err: r.err };
    var gr = r.grid || {};
    var bounds = gr.bounds || [gr.x0, gr.y0, gr.x1, gr.y1];
    if (bounds.some(function (v) { return typeof v !== 'number'; })) { var t = pt(r.target) || [0.5, 0.5]; bounds = [t[0] - 0.08, t[1] - 0.08, t[0] + 0.08, t[1] + 0.08]; }
    return { ok: true, tx: String(id), district: str(r.district), bounds: bounds, cols: num(gr.cols, 6), rows: num(gr.rows, 6), seed: String(gr.seed || id), target: pt(r.target), seconds: num(r.seconds, 75), start: pt(r.start) || [(bounds[0] + bounds[2]) / 2, bounds[3]] };
  };
  A.vanResult = function (found) { var r = safe(function () { return A.g.vanResult(found ? { x: found[0], y: found[1] } : null); }, {}) || {}; A.bump(); return { ok: r.ok !== false, exact: !!r.exact, place: str(r.place), text: r.text || '' }; };

  // ------------------------------------------------------------ log & messages
  A.log = function () {
    return cached('log', function () {
      return arr(safe(function () { return A.g.log(); }, [])).map(function (e, i) {
        var t = num(e.t, 0), shift = num(e.shift, Math.floor(t / 480)), minute = num(e.minute, t - shift * 480);
        var groups = arr(e.groups).map(String);
        return { id: String(e.id !== undefined ? e.id : 'L' + i), tx: str(e.tx), t: shift * 480 + minute, shift: shift, minute: minute, label: hhmm(minute), freq: mhz(e.freq), mode: mode(e.mode), callsign: e.callsign || null, to: e.to || null,
          length: num(e.length, groups.length), indicator: str(e.indicator) || (groups[0] || null), groups: groups, quality: num(e.quality, null), df: df(e.df), faint: !!(e.faint || e.missed || (!groups.length && !e.decoy && e.quality === 0)), msg: str(e.msg), repeat: !!e.repeat, decoy: !!e.decoy };
      });
    });
  };
  A.logEntry = function (id) { return A.log().filter(function (e) { return e.id === String(id); })[0] || null; };
  A.messages = function () {
    return cached('msgs', function () {
      return arr(safe(function () { return A.g.messages(); }, [])).map(function (m) {
        var groups = arr(m.groups).map(String), d = m.decrypted;
        return { id: String(m.id), from: m.from || '?', to: m.to || '?', groups: groups, digits: groups.join(''), indicator: str(m.indicator), kind: String(m.kind || 'pad').toLowerCase(), copies: num(m.copies, 1), t: num(m.t, null),
          decrypted: d ? { text: String(d.text || ''), holes: d.holes, verdict: d.verdict || (d.holes ? 'partial' : 'right') } : null };
      });
    });
  };
  A.message = function (id) { return A.messages().filter(function (m) { return m.id === String(id); })[0] || null; };
  /** pairs of messages sharing an indicator group (the page) — observable, shown as a suggestion on Cadet/Analyst */
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
      return { key: b.key || '', rows: rows, blanks: blanks, map: map, fig: map['.'] || null, stop: map['/'] || null };
    });
  };
  /** letters -> digits with the held board (null if no board). Spaces become the stop code when the board has one, else vanish. */
  A.encode = function (text, keepSpaces) {
    var b = A.board(); if (!b) return null;
    var out = '', fig = false;
    String(text).toUpperCase().split('').forEach(function (ch) {
      if (ch >= '0' && ch <= '9') { if (!fig && b.fig) { out += b.fig; fig = true; } out += ch; return; }
      if (fig && b.fig) { out += b.fig; fig = false; }
      if (ch === ' ') { if (keepSpaces && b.stop) out += b.stop; return; }
      if (b.map[ch]) out += b.map[ch];
    });
    if (fig && b.fig) out += b.fig;
    return out;
  };
  /** digits -> [{ch, i, n}] (each letter with the digit index it started at and its digit count) */
  A.decodeCells = function (digits) {
    var b = A.board(); if (!b) return null;
    var out = [], i = 0, fig = false, bl = b.blanks.map(String);
    while (i < digits.length) {
      var d = digits[i];
      if (d === '?' || d === undefined) { out.push({ ch: '?', i: i, n: 1 }); i++; continue; }
      if (fig) { if (bl.indexOf(d) >= 0 && digits[i + 1] !== undefined && b.rows[bl.indexOf(d) + 1] && b.rows[bl.indexOf(d) + 1].cells[+digits[i + 1]] === '.') { fig = false; out.push({ ch: '', i: i, n: 2 }); i += 2; continue; } out.push({ ch: d, i: i, n: 1 }); i++; continue; }
      if (bl.indexOf(d) >= 0) {
        var n = digits[i + 1]; if (n === undefined) { out.push({ ch: '?', i: i, n: 1 }); break; }
        var c = n === '?' ? '?' : (b.rows[bl.indexOf(d) + 1] || { cells: [] }).cells[+n];
        if (c === '.') { fig = true; out.push({ ch: '', i: i, n: 2 }); } else out.push({ ch: c === '/' ? ' ' : (c || '?'), i: i, n: 2 });
        i += 2;
      } else { out.push({ ch: b.rows[0].cells[+d] || '?', i: i, n: 1 }); i++; }
    }
    return out;
  };
  /** expected cipher-free digit frequencies of plaintext under the held board (fractions summing to 1), from English letter frequencies */
  var EN = { E: 12.0, T: 9.1, A: 8.1, O: 7.7, I: 7.3, N: 6.9, S: 6.3, R: 6.0, H: 5.9, D: 4.3, L: 4.0, U: 2.9, C: 2.7, M: 2.6, F: 2.3, Y: 2.1, W: 2.1, G: 2.0, P: 1.8, B: 1.5, V: 1.1, K: 0.7, X: 0.2, Q: 0.1, J: 0.1, Z: 0.1, '/': 9 };
  A.expected = function () {
    return cached('expected', function () {
      var b = A.board(), f = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], tot = 0;
      if (!b) { var gen = [0.07, 0.08, 0.16, 0.08, 0.09, 0.08, 0.07, 0.15, 0.1, 0.12]; return gen; }
      Object.keys(EN).forEach(function (ch) { var code = b.map[ch]; if (!code) return; for (var i = 0; i < code.length; i++) { f[+code[i]] += EN[ch]; tot += EN[ch]; } });
      return f.map(function (x) { return x / tot; });
    });
  };

  // ------------------------------------------------------------ workbench
  A.bench = {
    depth: function (a, b) { var r = safe(function () { return A.g.bench.depth(a, b); }, null); A.bump(); if (!r) return null; return { diff: arr(r.diff || r).map(String) }; },
    crib: function (a, b, crib, offset) {
      var r = safe(function () { return A.g.bench.crib(a, b, crib, offset); }, null); if (!r) return null;
      if (typeof r === 'string') r = { other: r };
      return { other: String(r.other || ''), plausible: !!(r.plausible || r.ok || (typeof r.score === 'number' && r.score >= 0.9)), score: num(r.score, r.plausible ? 1 : 0), digits: r.digits ? String(r.digits) : null, cribDigits: r.cribDigits ? String(r.cribDigits) : null };
    },
    period: function (id) {
      var r = safe(function () { return A.g.bench.period(id); }, null); A.bump(); if (!r) return null;
      return { ic: arr(r.ic).map(function (x) { return { period: num(x.period, 0), ic: num(x.ic, 0) }; }), repeats: arr(r.repeats).map(function (x) { return { seq: String(x.seq), spacing: num(x.spacing, 0) }; }) };
    },
    columns: function (id, p) {
      var r = safe(function () { return A.g.bench.columns(id, p); }, null); A.bump(); if (!r) return null;
      return arr(r).map(function (c, i) { var f = []; for (var d = 0; d < 10; d++) f.push(num(c.freq ? c.freq[d] : c[d], 0)); return { col: num(c.col, i), freq: f }; });
    },
    setKey: function (id, key) {
      var r = safe(function () { return A.g.bench.setKey(id, key); }, null); A.bump(); if (r === null || r === undefined) return null;
      if (typeof r === 'string') return { text: r, digits: null };
      return { text: String(r.text || r.plain || ''), digits: r.digits ? String(r.digits) : null };
    },
    accept: function (id, text) {
      var r = safe(function () { return A.g.bench.accept(id, text); }, { ok: false, err: 'The bench would not take it.' }) || {};
      A.bump();
      var v = r.verdict || r.result || (r.ok === false ? 'wrong' : 'right');
      return { ok: r.ok !== false && !r.err, err: r.err || '', verdict: String(v), text: r.text || text };
    }
  };

  // ------------------------------------------------------------ traffic diagram
  A.links = function () {
    return cached('links', function () {
      return arr(safe(function () { return A.g.links(); }, [])).map(function (l) {
        var s = l.support, sc = num(l.score, null);
        if (typeof s === 'number') { sc = s; s = s > 0.66 ? 'strong' : s > 0.2 ? 'some' : s > 0 ? 'hunch' : 'none'; }
        return { a: String(l.a), b: String(l.b), kind: l.kind || 'talks', support: s || 'hunch', score: sc === null ? 0 : sc, evidence: num(l.evidence, null) };
      });
    });
  };
  A.link = function (a, b, kind) { var r = safe(function () { return A.g.link(a, b, kind || 'talks'); }, {}); A.bump(); return r || {}; };
  A.unlink = function (a, b) { var r = safe(function () { return A.g.unlink(a, b); }, {}); A.bump(); return r || {}; };

  // ------------------------------------------------------------ warrants & desk
  A.warrants = function () {
    return cached('warrants', function () {
      var w = safe(function () { return A.g.warrants(); }, {}) || {};
      var used = arr(w.used).map(function (u, i) { return { id: String(u.id || 'W' + i), kind: String(u.kind || '').toLowerCase(), target: str(u.target), targetName: u.targetName || (A.place(u.target) || {}).name || String(u.target || ''), params: u.params || {}, shift: num(u.shift, 0), status: u.status || 'pending', result: u.result || '' }; });
      var left = num(w.left, 0);
      return { left: left, max: num(w.max, left + used.length), used: used };
    });
  };
  A.warrant = function (kind, target, params) {
    var r = safe(function () { return A.g.warrant(kind, target, params || {}); }, { ok: false, err: 'Special Branch did not answer.' }) || {};
    A.bump();
    return { ok: r.ok !== false && !r.err, err: r.err || '', msgs: arr(r.msgs).map(String) };
  };
  /** message parts: plain strings, {t|ref|type, id, d|text|name} refs, and inline [[kind:id|text]] markup */
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
      if (p.k || p.x) { out = out.concat(parts(p.x)); out.push('\n'); return; }
      var t = String(p.t || p.ref || p.type || 'place');
      out.push({ ref: t === 'cs' ? 'callsign' : t, id: String(p.id), text: String(p.d || p.text || p.name || p.id) });
    });
    return out;
  }
  A.parts = parts;
  var KINDS = { super: 'super', superintendent: 'super', mentor: 'mentor', sb: 'sb', branch: 'sb', special: 'sb', watch: 'sb', van: 'van', file: 'file', registry: 'file', bench: 'bench', system: 'system', station: 'system' };
  A.inbox = function () {
    return cached('inbox', function () {
      return arr(safe(function () { return A.g.inbox(); }, [])).map(function (m, i) {
        var t = num(m.t, 0), shift = num(m.shift, Math.floor(t / 480));
        return { id: String(m.id !== undefined ? m.id : 'm' + i), t: t, shift: shift, label: hhmm(t - shift * 480), kind: KINDS[String(m.kind || '').toLowerCase()] || 'system', from: m.from || 'Station', title: m.title || m.subject || '(no subject)', body: parts(m.body || m.text), read: !!m.read, msg: str(m.msg) };
      });
    });
  };
  A.markRead = function (id) { safe(function () { if (has('markRead')) A.g.markRead(id); }); A.bump(); };
  A.people = function () {
    return cached('people', function () {
      var ps = has('people') ? arr(safe(function () { return A.g.people(); }, [])) : [];
      var out = ps.map(function (p) { return { id: String(p.id), name: p.name || '?', job: p.job || '', home: str(p.home), arrested: !!p.arrested }; });
      // anyone named in the inbox is someone the player has heard of
      A.inbox().forEach(function (m) { m.body.forEach(function (p) { if (typeof p === 'object' && p.ref === 'person' && !out.some(function (q) { return q.id === p.id; })) out.push({ id: p.id, name: p.text, job: '', home: null, arrested: false }); }); });
      return out;
    });
  };
  A.person = function (id) { return A.people().filter(function (p) { return p.id === String(id); })[0] || null; };
  A.endShift = function () {
    var r = safe(function () { return A.g.endShift(); }, {}) || {};
    A.bump();
    var rep = r.report || {};
    return { events: events(r.events), report: { title: rep.title || 'End of shift', lines: arr(rep.lines || rep.text).map(String) } };
  };
  A.mentor = function (tier) {
    var r = safe(function () { return A.g.mentor(tier); }, { text: 'Mrs Holm is on the telephone.' }) || {};
    A.bump();
    if (typeof r === 'string') r = { text: r };
    return { text: String(r.text || ''), action: r.action || null };
  };
  A.debrief = function () {
    var r = safe(function () { return A.g.debrief(); }, {}) || {};
    var t = r.truth || {}, ring = t.ring || {}, op = t.operation || {};
    var members = arr(ring.members || ring.people || ring).map(function (m) { return { id: String(m.id || m.callsign), name: m.name || '?', job: m.job || '', role: m.role || 'agent', callsign: m.callsign || '', home: str(m.home), homeName: m.homeName || (A.place(m.home) || {}).name || '', district: str(m.district), how: m.how || '', arrested: !!(m.arrested || m.caught), executor: !!m.executor }; });
    return {
      outcome: typeof r.outcome === 'string' ? { kind: r.outcome } : (r.outcome || A.outcome() || { kind: 'open' }),
      ring: { controller: ring.controller || null, members: members, links: arr(ring.links).map(function (l) { return { a: String(l.a || l[0]), b: String(l.b || l[1]) }; }) },
      op: { what: op.what || '?', where: str(op.where), whereName: op.whereName || (A.place(op.where) || {}).name || '?', when: op.when || op.time || '?', who: str(op.who), whoName: op.whoName || '' },
      plaintexts: arr(t.plaintexts).map(function (p) { return { id: String(p.id), from: p.from || '', to: p.to || '', kind: p.kind || '', text: String(p.text || ''), decrypted: p.decrypted || null, heard: p.heard !== false }; }),
      stats: r.stats || {}, score: num(r.score && typeof r.score === 'object' ? r.score.total : r.score, null)
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
      A.log().forEach(function (e) { [e.callsign, e.to].forEach(function (c, k) { if (!c) return; var o = m[c] || (m[c] = { id: c, n: 0, sent: 0, got: 0, modes: {}, freqs: {}, first: e.t, last: e.t, fixes: [] }); o.n++; if (k === 0) { o.sent++; o.modes[e.mode] = 1; o.freqs[e.freq.toFixed(3)] = 1; if (e.df && e.df.fix) o.fixes.push({ log: e.id, fix: e.df.fix }); } else o.got++; o.first = Math.min(o.first, e.t); o.last = Math.max(o.last, e.t); }); });
      return Object.keys(m).map(function (k) { return m[k]; });
    });
  };
  return A;
})();
