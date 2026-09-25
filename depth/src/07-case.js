/* DEPTH engine — 07-case.js
 * DX.newCase(seed, {grade, tutorial}) -> c ; DX.load(str) -> c ; c.save() -> str
 * The Case: station time, the receiver, the traffic log, the workbench, DF and the van, the link diagram,
 * warrants, the security officer, the superintendent, the inbox, the outcome and the debrief.
 * World (regenerated from seed+attempt): c._w. Player state (saved): c._s.
 * See ENGINE.md for the full API.
 */
(function () {
  'use strict';
  var D = DX.DATA;
  var SHIFT = 480;

  // ---------------------------------------------------------------- world
  DX.makeWorld = function (seed, gradeId, attempt) {
    var G = DX.grade(gradeId);
    var s2 = String(seed) + (attempt ? '#' + attempt : '');
    var city = DX.makeCity(s2, { outstations: G.outstations });
    var ring = DX.makeRing(s2, city, G);
    var op = DX.makeOperation(s2, ring, city, G);
    var plan = DX.makePlan(s2, ring, op, city, G);
    var W = { seed: s2, baseSeed: String(seed), attempt: attempt || 0, key: DX.hash(s2 + '/key'), G: G, city: city, ring: ring, op: op, plan: plan };
    indexWorld(W);
    return W;
  };
  function indexWorld(W) {
    W.tx = {}; W.msg = {}; W.mem = {}; W.place = {}; W.byNight = [];
    W.plan.txs.forEach(function (t) { W.tx[t.id] = t; });
    W.plan.msgs.forEach(function (m) { W.msg[m.id] = m; });
    W.ring.members.forEach(function (m) { W.mem[m.id] = m; });
    W.city.places.forEach(function (p) { W.place[p.id] = p; });
    for (var n = 0; n < W.G.shifts; n++) W.byNight.push([]);
    W.plan.txs.forEach(function (t) { if (W.byNight[t.night]) W.byNight[t.night].push(t); });
    W.byNight.forEach(function (arr) { arr.sort(function (a, b) { return a.minute - b.minute || (a.id < b.id ? -1 : 1); }); });
  }
  DX._indexWorld = indexWorld;

  function ref(t, id, d) { return { t: t, id: id, d: d }; }
  DX.ref = ref;
  /** plain-text rendering of an inbox message (tests, accessibility) */
  DX.msgText = function (m) {
    return m.title + '\n' + m.body.map(function (l) { return (l.x || []).map(function (sg) { return typeof sg === 'string' ? sg : sg.d; }).join(''); }).join('\n');
  };

  // ---------------------------------------------------------------- Case
  function Case(W, s) { this._w = W; this._s = s; var self = this; this.bench = makeBench(this); Object.defineProperty(this, 'notes', { get: function () { return self._s.notes; }, set: function (v) { self._s.notes = String(v == null ? '' : v).slice(0, 20000); }, enumerable: true }); }
  DX.Case = Case;
  var CP = Case.prototype;

  Object.defineProperty(CP, 'shift', { get: function () { return this._s.shift; } });
  Object.defineProperty(CP, 'shifts', { get: function () { return this._w.G.shifts; } });
  Object.defineProperty(CP, 'minute', { get: function () { return this._s.minute; } });
  Object.defineProperty(CP, 'over', { get: function () { return !!this._s.outcome; } });
  Object.defineProperty(CP, 'outcome', { get: function () { return this._s.outcome; } });
  Object.defineProperty(CP, 'city', { get: function () { return this._w.city; } });
  Object.defineProperty(CP, 'seed', { get: function () { return this._w.baseSeed; } });
  Object.defineProperty(CP, 'grade', { get: function () { return this._w.G.id; } });
  Object.defineProperty(CP, 'gradeInfo', { get: function () { return this._w.G; } });
  Object.defineProperty(CP, 'attempt', { get: function () { return this._w.attempt; } });
  Object.defineProperty(CP, 'alert', { get: function () { return Math.round(this._s.alert); } });
  Object.defineProperty(CP, 'patience', { get: function () { return Math.round(this._s.patience); } });
  Object.defineProperty(CP, 'controller', { get: function () { return this._w.ring.controller.call; } });

  CP.clock = function (shift, minute) {
    shift = shift === undefined ? this._s.shift : shift; minute = minute === undefined ? this._s.minute : minute;
    var lab = DX.hhmm(minute);
    return { shift: shift, day: shift + 1, dayName: DX.nightShort(shift), date: DX.dateLabel(shift), minute: minute, hh: +lab.slice(0, 2), mm: +lab.slice(3), label: lab, left: SHIFT - minute };
  };
  CP.alertLevel = function () {
    var a = this._s.alert;
    return { value: Math.round(a), level: a < 20 ? 0 : a < 40 ? 1 : a < 60 ? 2 : a < 80 ? 3 : 4, label: a < 20 ? 'calm' : a < 40 ? 'wary' : a < 60 ? 'nervous' : a < 80 ? 'alarmed' : 'running scared' };
  };
  CP.costs = function () {
    var k = this._w.G.cost;
    return { depth: r1(2 * k), crib: r1(1 * k), place: 0, period: r1(5 * k), columns: r1(3 * k), align: r1(3 * k), setKey: r1(1 * k), suggest: r1(2 * k), boardSolve: 5, accept: 0, warrant: 10, van: this._w.G.id === 'cadet' ? 5 : this._w.G.id === 'analyst' ? 10 : 15, boardSolveWait: 60, df: 0 };
  };
  function r1(x) { return Math.max(0, Math.round(x)); }

  // ---------------------------------------------------------------- the air
  function txLive(c, t) { return t && !t.cancelled && t.night === c._s.shift; }
  CP._txOnAir = function (minute) {
    var c = this, n = this._s.shift, list = this._w.byNight[n] || [];
    return list.filter(function (t) { return !t.cancelled && t.minute <= minute && minute < t.minute + t.dur; });
  };
  function slotKey(t) { return t.from + '|' + t.freq + '|' + t.minute; }
  CP._learnSlot = function (t, how) {
    var S = this._s.slots, k = slotKey(t);
    var sl = S[k] || (S[k] = { callsign: t.from, to: t.to, freq: t.freq, minute: t.minute, mode: t.mode, nights: [], source: how });
    if (sl.nights.indexOf(t.night) < 0) sl.nights.push(t.night);
    sl.mode = t.mode; sl.last = t.night;
  };
  CP.band = function () {
    var c = this, W = this._w, m = this._s.minute;
    var now = this._txOnAir(m).map(function (t) { return c._txView(t); });
    W.plan.bcast.forEach(function (b) { now.push({ id: b.id, freq: b.freq, mode: 'BCAST', strength: 0.8, drift: 0, label: b.label, t0: 0, t1: SHIFT }); });
    return { now: now, schedule: this.schedule(), noise: DX.AIR.noise(W, this._s.shift, m), minute: m, range: [3, 12] };
  };
  CP._txView = function (t) {
    var W = this._w, s = this._s;
    var known = s.heard[t.id] !== undefined;
    var slot = s.slots[slotKey(t)];
    return { id: t.id, freq: t.freq, mode: t.mode, strength: DX.AIR.strength(W, t), drift: DX.AIR.drift(W, t), t0: t.minute, t1: t.minute + t.dur,
      label: known || slot ? (t.from + (t.to ? ' → ' + t.to : '')) : null, callsign: known || slot ? t.from : null, remaining: t.minute + t.dur - s.minute };
  };
  /** full audio parameters for the receiver (true cipher groups for synthesis; the COPY comes from tune) */
  CP.signal = function (txId) {
    var W = this._w, t = W.tx[txId];
    if (!t) return null;
    var m = t.msg ? W.msg[t.msg] : null, mem = W.mem[t.fromId];
    var groups = m ? m.groups.slice() : (t.groups || []).slice();
    return { id: t.id, mode: t.mode, freq: t.freq, drift: DX.AIR.drift(W, t), strength: DX.AIR.strength(W, t), noise: DX.AIR.noise(W, t.night, t.minute),
      t0: t.minute, dur: t.dur, groups: groups, callup: t.test ? 'VVV VVV VVV DE ' + (t.from || 'VVV') : t.mode === 'VOICE' ? (t.to + ' ').repeat(3).trim() : t.to + ' DE ' + t.from,
      fist: mem ? DX.copy(mem.fist) : t.fist || { wpm: 16, dah: 3, charGap: 1.2, wordGap: 7, jitter: 0.05, swing: 0, quirk: 'machine-even (tape keyer)' },
      voice: t.fromId === 'ctl' ? { voice: W.ring.controller.voice, interval: W.ring.controller.interval.slice() } : null };
  };
  CP.schedule = function () {
    var S = this._s.slots;
    return Object.keys(S).map(function (k) { var x = S[k]; return { callsign: x.callsign, to: x.to, freq: x.freq, minute: x.minute, label: DX.hhmm(x.minute), mode: x.mode, nights: x.nights.slice(), last: x.last, source: x.source }; })
      .sort(function (a, b) { return a.minute - b.minute; });
  };
  /** known slots projected onto tonight within the next `ahead` minutes */
  CP.upcoming = function (ahead) {
    ahead = ahead === undefined ? SHIFT : ahead;
    var m = this._s.minute, n = this._s.shift;
    return this.schedule().filter(function (x) { return x.minute >= m - 2 && x.minute <= m + ahead && x.nights.indexOf(n) < 0; })
      .map(function (x) { x.expected = true; x.inMin = x.minute - m; return x; });
  };

  // ---------------------------------------------------------------- time
  function ev(list, kind, o) { o.kind = kind; list.push(o); return o; }
  /** advance to minute (<= 480), processing transmissions, warrants and the operation in time order */
  CP._advance = function (target) {
    var s = this._s, W = this._w, events = [];
    if (s.outcome) return events;
    target = DX.clamp(Math.round(target), s.minute, SHIFT);
    var n = s.shift, list = W.byNight[n] || [], self = this;
    // gather timed happenings in (minute, target]
    var items = [];
    list.forEach(function (t) { if (!t.cancelled && t.minute >= s.minute && t.minute <= target && !s.seenStart[t.id]) items.push({ at: t.minute, k: 'tx', t: t }); });
    s.pending.forEach(function (p) { if (p.shift === n && p.at <= target && !p.done) items.push({ at: p.at, k: 'warrant', p: p }); });
    if (W.op.night === n && W.op.minute <= target && !s.opDone) items.push({ at: W.op.minute, k: 'op' });
    items.sort(function (a, b) { return a.at - b.at || (a.k === 'tx' ? -1 : 1); });
    for (var i = 0; i < items.length && !s.outcome; i++) {
      var it = items[i];
      s.minute = Math.max(s.minute, it.at);
      if (it.k === 'tx') {
        s.seenStart[it.t.id] = 1;
        if (!it.t.cancelled) { var le = self._logFaint(it.t); ev(events, 'heard', { t: it.at, tx: it.t.id, intercept: le.id, freq: it.t.freq, mode: it.t.mode, callsign: le.callsign }); }
      } else if (it.k === 'warrant' && it.p.kind === 'computer') {
        it.p.done = true;
        var cr = self._computerJob(it.p);
        ev(events, 'computer', { t: it.at, job: it.p.id, ok: cr.ok, keyword: cr.keyword || null, inbox: cr.msgIds });
      } else if (it.k === 'warrant') {
        it.p.done = true;
        var r = self._resolveWarrant(it.p);
        ev(events, 'warrant', { t: it.at, warrant: it.p.id, wkind: it.p.kind, result: r.summary, inbox: r.msgIds });
      } else if (it.k === 'op') {
        s.opDone = true;
        self._resolveOp(events);
      }
    }
    if (!s.outcome) s.minute = target;
    return events;
  };
  CP.wait = function (minutes) { return { events: this._advance(this._s.minute + Math.max(0, +minutes || 0)), clock: this.clock() }; };
  CP.advanceTo = function (minute) { return { events: this._advance(minute), clock: this.clock() }; };
  CP._spend = function (minutes) { return this._advance(this._s.minute + minutes); };
  /** band watch with the operator at the set: advance until the next transmission keys up (or `max` minutes).
   *  -> {events, tx: band view of what just came on air | null, clock} */
  CP.waitForSignal = function (max) {
    var s = this._s, W = this._w, m = s.minute, end = Math.min(SHIFT, m + (max === undefined ? SHIFT : max));
    var list = (W.byNight[s.shift] || []).filter(function (t) { return !t.cancelled && t.minute >= m && t.minute <= end && !s.seenStart[t.id]; });
    list.sort(function (a, b) { return a.minute - b.minute; });
    var t = list[0];
    var events = this._advance(t ? t.minute : end);
    return { events: events, tx: t && !s.outcome ? this._txView(t) : null, clock: this.clock() };
  };

  // ---------------------------------------------------------------- log
  CP._logFaint = function (t) {
    var s = this._s;
    if (s.heard[t.id] !== undefined) return s.log[s.heard[t.id]];
    var W = this._w;
    var e = { id: 'I' + (s.log.length + 1), tx: t.id, shift: t.night, t: t.minute, clock: DX.hhmm(t.minute), freq: t.freq, mode: t.mode,
      callsign: t.from, to: t.to || null, length: null, indicator: null, groups: null, quality: 0, faint: true, df: null, msg: null, dur: t.dur, test: !!t.test };
    s.heard[t.id] = s.log.length;
    s.log.push(e);
    this._learnSlot(t, 'heard');
    return e;
  };
  CP.log = function () { return this._s.log.map(function (e) { var o = DX.copy(e); return o; }); };

  /** listen to a transmission for its remaining duration. inp = {freqErr (kHz), modeOk, driftHeld (0..1)} */
  CP.tune = function (txId, inp) {
    var s = this._s, W = this._w, t = W.tx[txId];
    if (s.outcome) return { ok: false, err: 'the case is closed' };
    if (!t || t.night !== s.shift || t.cancelled) return { ok: false, err: 'nothing on that frequency tonight' };
    if (s.heard[txId] !== undefined && !s.log[s.heard[txId]].faint) return { ok: false, err: 'already copied' };
    var m = s.minute;
    if (m >= t.minute + t.dur) return { ok: false, err: 'the transmission has ended' };
    if (m < t.minute - 15) return { ok: false, err: 'too early: it is not on air yet' };
    var events = [];
    if (m < t.minute) events = events.concat(this._advance(t.minute));
    if (s.outcome) return { ok: false, err: 'the case is closed', events: events };
    var join = s.minute;
    var noise = DX.AIR.noise(W, t.night, t.minute), str = DX.AIR.strength(W, t);
    var q = DX.AIR.quality(inp, str, noise);
    var groups = t.msg ? W.msg[t.msg].groups : t.groups;
    var cp = DX.AIR.copy(W, t, groups, inp, join, q);
    events = events.concat(this._advance(t.minute + t.dur));
    var e = this._logFaint(t);
    e.faint = false; e.groups = cp.groups; e.quality = cp.quality; e.length = groups.length; e.lost = cp.lost; e.corrupt = cp.corrupt;
    var hasInd = t.msg ? W.msg[t.msg].cipher === 'pad' : !!t.indicator;
    e.indicator = hasInd ? cp.groups[0] : null;
    // workbench message (copies of the same message merge: repeats are recognised by length and indicator)
    var key = t.msg || ('decoy:' + t.id);
    if (!s.wbByKey[key]) { var no = s.nextNo++; s.wbByKey[key] = 'M' + no; s.wb['M' + no] = { id: 'M' + no, no: no, key: key, copies: [], first: { shift: t.night, t: t.minute }, from: t.from, to: t.to, kind: hasInd ? 'pad' : 'periodic' }; }
    var wid = s.wbByKey[key];
    s.wb[wid].copies.push(e.id);
    e.msg = wid; e.repeat = s.wb[wid].copies.length > 1;
    this._learnSlot(t, 'copied');
    return { ok: true, intercept: DX.copy(e), msg: wid, groups: cp.groups.slice(), quality: cp.quality, lost: cp.lost, corrupt: cp.corrupt, events: events, clock: this.clock() };
  };

  // ---------------------------------------------------------------- workbench messages
  CP._mergedGroups = function (wid) {
    var s = this._s, wb = s.wb[wid], out = [];
    wb.copies.forEach(function (lid) {
      var e = s.log.filter(function (x) { return x.id === lid; })[0];
      e.groups.forEach(function (g, i) {
        if (out[i] === undefined) { out[i] = g; return; }
        var a = out[i].split(''), b = g.split('');
        out[i] = a.map(function (ch, k) { return ch === '?' ? b[k] : ch; }).join('');
      });
    });
    return out;
  };
  CP._digitsOf = function (wid) {
    var wb = this._s.wb[wid];
    if (!wb || wb.kind === 'clear') return null;
    var g = this._mergedGroups(wid);
    return DX.toDigits((wb.kind === 'pad' ? g.slice(1) : g).join(''));
  };
  CP.messages = function () {
    var self = this, s = this._s;
    return Object.keys(s.wb).map(function (k) { return self.message(k); }).sort(function (a, b) { return a.no - b.no; });
  };
  CP.message = function (wid) {
    var s = this._s, wb = s.wb[wid];
    if (!wb) return null;
    var o = { id: wb.id, no: wb.no, from: wb.from, to: wb.to, kind: wb.kind, copies: wb.copies.length, first: DX.copy(wb.first), intercepts: wb.copies.slice() };
    if (wb.kind === 'clear') { o.groups = []; o.indicator = null; o.text = wb.text; o.source = wb.source; o.holes = 0; }
    else {
      var g = this._mergedGroups(wid);
      o.groups = g; o.indicator = wb.kind === 'pad' ? g[0] : null;
      o.holes = g.join('').split('').filter(function (ch) { return ch === '?'; }).length;
      o.length = g.length;
    }
    if (s.accepts[wid]) o.decrypted = DX.copy(s.accepts[wid]);
    // depth partners the player can see: the same indicator group (exact), or the same apart from garbled figures
    o.sameIndicator = []; o.likelyIndicator = [];
    if (o.indicator) {
      var self = this, mine = o.indicator;
      Object.keys(s.wb).forEach(function (k) {
        if (k === wid || s.wb[k].kind !== 'pad') return;
        var other = self._mergedGroups(k)[0];
        if (!other) return;
        var agree = 0, unk = 0;
        for (var i = 0; i < 5; i++) { if (mine[i] === '?' || other[i] === '?') unk++; else if (mine[i] === other[i]) agree++; }
        if (agree === 5) o.sameIndicator.push(k);
        else if (agree + unk === 5 && unk <= 2) o.likelyIndicator.push(k);
      });
    }
    return o;
  };
  CP.board = function () {
    var s = this._s;
    if (!s.board) return null;
    return DX.boardView(DX.boardCache(s.board));
  };

  // ---------------------------------------------------------------- DF and the van
  CP.df = function (txId, stationIds) {
    var s = this._s, W = this._w, t = W.tx[txId], self = this;
    if (!t || t.night !== s.shift || t.cancelled) return { ok: false, err: 'no such transmission tonight' };
    if (!(t.minute <= s.minute && s.minute < t.minute + t.dur) && !(t.mode === 'BURST' && s.minute === t.minute + t.dur)) return { ok: false, err: 'the outstations can only take bearings while it is on air' };
    var sts = W.city.outstations.filter(function (o) { return !stationIds || stationIds.indexOf(o.id) >= 0; });
    var bearings = sts.map(function (st) { return DX.AIR.bearing(W, t, st); });
    var fix = DX.fixFrom(W.city.outstations, bearings);
    var res = { ok: true, tx: txId, bearings: bearings, fix: fix, district: fix ? DX.cityDistrictAt(W.city, [fix.x, fix.y]) : null, abroad: !!(fix && (fix.y < DX.coastY(fix.x) - 0.15 || fix.y < -0.2)) };
    s.dfs[txId] = DX.copy(res);
    var e = this._logFaint(t);
    e.df = DX.copy(res);
    return res;
  };
  /** re-compute a fix from (possibly adjusted) bearings */
  CP.fix = function (bearings) { return DX.fixFrom(this._w.city.outstations, bearings); };

  CP.van = function (txId, centre) {
    var s = this._s, W = this._w, t = W.tx[txId];
    if (s.outcome) return { ok: false, err: 'the case is closed' };
    if (!t || t.night !== s.shift || t.cancelled) return { ok: false, err: 'no such transmission tonight' };
    if (!(t.minute <= s.minute && s.minute < t.minute + t.dur)) return { ok: false, err: 'the van can only hunt while the set is on air' };
    var rem = t.minute + t.dur - s.minute;
    if (rem < 3) return { ok: false, err: 'not enough time left on air for the van (needs 3 minutes)' };
    if (!centre) { var d = s.dfs[txId]; centre = d && d.fix ? [d.fix.x, d.fix.y] : null; }
    if (!centre) return { ok: false, err: 'send the van where? Take bearings first or pick a point' };
    if (Array.isArray(centre) === false) centre = [centre.x, centre.y];
    var secs = Math.round(Math.min(W.G.vanSec, rem * 25));
    var scene = DX.AIR.vanScene(W, t, centre, secs, s.vans.length);
    s.vans.push({ id: scene.id, tx: txId, centre: scene.centre, shift: s.shift, t: s.minute, done: false });
    return { ok: true, scene: scene };
  };
  /** found: {x, y} in scene coordinates where the van stopped (or null if it gave up). */
  CP.vanResult = function (found, sceneId) {
    var s = this._s, W = this._w;
    var v = sceneId ? s.vans.filter(function (x) { return x.id === sceneId; })[0] : s.vans[s.vans.length - 1];
    if (!v || v.done) return { ok: false, err: 'no van search in progress' };
    v.done = true;
    var t = W.tx[v.tx];
    var scene = DX.AIR.vanScene(W, t, v.centre, 0, +v.id.slice(1));
    var j = DX.AIR.vanJudge(scene, found);
    var out = { ok: true, found: j.kind === 'exact', kind: j.kind, msgs: [] };
    // the van may be noticed
    var mem = W.mem[t.fromId];
    var seenP = 0.12 * W.G.alert * (mem ? 0.6 + mem.careful : 1);
    if (DX.u(W.key, 950, s.vans.length, s.shift) < seenP) { this._raise(8, 'van seen'); v.seen = true; }
    if (j.kind === 'exact') {
      var b = this._locate(t, 'van');
      out.building = this.building(b.id);
      out.msgs.push(this._post('report', 'DF van: transmitter located', 'Van crew', [
        { k: 'p', x: ['The van closed on the ', ref('callsign', t.from, t.from), ' signal at ' + DX.hhmm(t.minute) + '. '].concat(b.how === 'vehicle' ? ['It came from a parked van; the registration is traced to ', ref('building', b.id, b.address), '.'] : ['It came from ', ref('building', b.id, b.address), '.']) },
        { k: 'n', x: [b.truth === 'decoy' ? 'No lights in the window. The crew thought the keying sounded very even.' : 'Aerial wire along the gutter. The crew did not stop.'] }]));
    } else if (j.kind === 'area') {
      var area = { id: 'A' + (s.areas.length + 1), tx: t.id, callsign: t.from, centre: [DX.round(j.centre[0], 4), DX.round(j.centre[1], 4)], r: DX.round(j.r, 4), shift: s.shift };
      s.areas.push(area);
      out.area = DX.copy(area);
      out.msgs.push(this._post('report', 'DF van: close, not exact', 'Van crew', [{ k: 'p', x: ['The ', ref('callsign', t.from, t.from), ' set went off the air while we were within a block or two. Area marked on the map.'] }]));
    } else {
      out.msgs.push(this._post('report', 'DF van: lost it', 'Van crew', [{ k: 'p', x: ['No joy on ', ref('callsign', t.from, t.from), '. The meter never climbed properly.'] }]));
    }
    // the hunt ran while the set was on air; afterwards the crew reports in
    var endT = Math.max(s.minute, v.shift === s.shift ? Math.min(SHIFT, t.minute + t.dur) : s.minute);
    out.events = this._advance(Math.min(SHIFT, endT + this.costs().van));
    return out;
  };
  /** building from a transmitter trace */
  CP._locate = function (t, how) {
    var W = this._w, mem = W.mem[t.fromId];
    if (t.decoySite) return this._building({ key: 'decoy:' + t.decoySite.text, address: t.decoySite.text, pos: t.decoySite.pos, truth: 'decoy', how: 'van' }, { kind: 'transmitter', detail: t.from + ' traced here' });
    if (!mem) return this._building({ key: 'odd:' + t.id, address: 'a garage off ' + DX.address(W.city, DX.rng(W.seed + t.id), DX.cityDistrictAt(W.city, t.pos)).street, pos: t.pos, truth: 'none', how: 'van' }, { kind: 'transmitter', detail: 'test transmitter' });
    var addr = mem.movedTo && t.pos === mem.movedTo.pos ? mem.movedTo : mem.room && t.pos === mem.room.pos ? mem.room : mem.home;
    var kindHow = mem.txFrom === 'mobile' && addr === mem.home ? 'vehicle' : addr === mem.home ? 'home' : 'room';
    return this._building({ key: 'mem:' + mem.id + ':' + addr.text, address: addr.text, pos: addr.pos, truth: mem.id, how: kindHow }, { kind: 'transmitter', detail: t.from + ' traced here (' + DX.hhmm(t.minute) + ', ' + DX.nightShort(t.night) + ')', callsign: t.from });
  };
  CP._building = function (o, evidence) {
    var s = this._s, b = null;
    Object.keys(s.buildings).forEach(function (k) { if (s.buildings[k].key === o.key) b = s.buildings[k]; });
    if (!b) {
      var id = 'b' + (Object.keys(s.buildings).length + 1);
      b = s.buildings[id] = { id: id, key: o.key, address: o.address, pos: o.pos, district: DX.cityDistrictAt(this._w.city, o.pos), truth: o.truth, how: o.how, occupant: null, evidence: [], callsigns: [] };
    }
    if (evidence) { evidence.shift = s.shift; evidence.t = s.minute; b.evidence.push(evidence); if (evidence.callsign && b.callsigns.indexOf(evidence.callsign) < 0) b.callsigns.push(evidence.callsign); }
    return b;
  };
  CP.building = function (id) {
    var b = this._s.buildings[id];
    if (!b) return null;
    return { id: b.id, address: b.address, pos: b.pos.slice(), district: b.district, how: b.how, occupant: b.occupant ? DX.copy(b.occupant) : null, evidence: DX.copy(b.evidence), callsigns: b.callsigns.slice(), raided: !!b.raided,
      strong: b.evidence.some(function (e) { return ['transmitter', 'meeting', 'drop'].indexOf(e.kind) >= 0; }) };
  };
  CP.buildings = function () { var self = this; return Object.keys(this._s.buildings).map(function (k) { return self.building(k); }); };
  CP.areas = function () { return DX.copy(this._s.areas); };

  // ---------------------------------------------------------------- inbox
  CP._post = function (kind, title, from, body, extra) {
    var s = this._s;
    var refs = [];
    body.forEach(function (l) { (l.x || []).forEach(function (sg) { if (typeof sg === 'object' && !refs.some(function (r) { return r.t === sg.t && r.id === sg.id; })) refs.push(sg); }); });
    var m = { id: 'N' + (s.inbox.length + 1), shift: s.shift, t: s.minute, clock: DX.hhmm(s.minute), kind: kind, title: title, from: from, body: body, refs: refs, read: false };
    if (extra) for (var k in extra) m[k] = extra[k];
    s.inbox.push(m);
    return m.id;
  };
  CP.inbox = function () { return DX.copy(this._s.inbox); };
  CP.markRead = function (id) { this._s.inbox.forEach(function (m) { if (m.id === id) m.read = true; }); };

  // ---------------------------------------------------------------- links (the player's diagram)
  var LINK_KINDS = ['talks', 'controls', 'same'];
  CP.link = function (a, b, kind) {
    kind = kind || 'talks';
    if (LINK_KINDS.indexOf(kind) < 0) return { ok: false, err: 'kind must be talks|controls|same' };
    if (!a || !b || a === b) return { ok: false, err: 'two different callsigns' };
    this.unlink(a, b);
    this._s.links.push({ a: a, b: b, kind: kind });
    return { ok: true, links: this.links() };
  };
  CP.unlink = function (a, b) { this._s.links = this._s.links.filter(function (l) { return !((l.a === a && l.b === b) || (l.a === b && l.b === a)); }); return { ok: true }; };
  CP.links = function () {
    var s = this._s, self = this;
    var nodes = {}, traffic = {};
    s.log.forEach(function (e) {
      if (e.test || !e.callsign) return;
      nodes[e.callsign] = nodes[e.callsign] || { id: e.callsign, heard: 0, copied: 0, modes: [], first: e.shift * SHIFT + e.t };
      nodes[e.callsign].heard++; if (!e.faint) nodes[e.callsign].copied++;
      if (nodes[e.callsign].modes.indexOf(e.mode) < 0) nodes[e.callsign].modes.push(e.mode);
      if (e.to) { nodes[e.to] = nodes[e.to] || { id: e.to, heard: 0, copied: 0, modes: [], first: e.shift * SHIFT + e.t }; var k = e.callsign + '>' + e.to; traffic[k] = (traffic[k] || 0) + 1; }
    });
    var links = s.links.map(function (l) {
      var ab = traffic[l.a + '>' + l.b] || 0, ba = traffic[l.b + '>' + l.a] || 0, sup = 0, why = [];
      if (l.kind === 'talks') { sup = Math.min(1, (ab + ba) / 2); if (ab + ba) why.push((ab + ba) + ' transmission' + (ab + ba > 1 ? 's' : '') + ' between them'); }
      else if (l.kind === 'controls') { sup = ab ? Math.min(1, ab / 2) * (ab >= ba ? 1 : 0.5) : 0; if (ab) why.push(ab + ' from ' + l.a + ' to ' + l.b + (ba ? ', ' + ba + ' back' : '')); }
      else if (l.kind === 'same') {
        // same operator: same fist heard under both callsigns
        var fa = self._fistOf(l.a), fb = self._fistOf(l.b);
        sup = fa && fb && fa === fb ? 1 : 0; if (sup) why.push('the same hand on the key');
      }
      if (!why.length) why.push('no traffic seen between them yet');
      return { a: l.a, b: l.b, kind: l.kind, support: DX.round(sup, 2), supported: sup >= 0.5, why: why.join('; ') };
    });
    return { nodes: Object.keys(nodes).map(function (k) { return nodes[k]; }), links: links, traffic: Object.keys(traffic).map(function (k) { var p = k.split('>'); return { from: p[0], to: p[1], n: traffic[k] }; }) };
  };
  CP._fistOf = function (call) {
    var W = this._w;
    var m = W.ring.members.filter(function (x) { return x.call === call; })[0];
    return m ? m.id : null;
  };

  // ---------------------------------------------------------------- warrants
  CP.warrants = function () {
    var s = this._s;
    return { left: s.warrantsLeft, total: this._w.G.warrants, used: s.warrants.map(function (w) { return DX.copy(w); }), stakeouts: s.stakeouts.map(DX.copy) };
  };
  var WDELAY = { cadet: 60, analyst: 90, chief: 120 };
  /** kind: watch|lift|raid|stakeout. target: place id (watch/lift/stakeout) or building id (watch/raid). params: {night} */
  CP.warrant = function (kind, target, params) {
    var s = this._s, W = this._w, self = this;
    params = params || {};
    if (s.outcome) return { ok: false, err: 'the case is closed' };
    if (['watch', 'lift', 'raid', 'stakeout'].indexOf(kind) < 0) return { ok: false, err: 'unknown warrant' };
    if (s.warrantsLeft <= 0) return { ok: false, err: 'no warrants left: Special Branch will not act without one' };
    var place = W.place[target], bld = s.buildings[target];
    var night = params.night === undefined ? s.shift : +params.night;
    if (night < s.shift || night >= W.G.shifts) return { ok: false, err: 'that night is not in the case' };
    var w = { id: 'W' + (s.warrants.length + 1), kind: kind, target: target, targetLabel: place ? place.name : bld ? bld.address : target, night: night, orderedShift: s.shift, orderedAt: s.minute, status: 'pending', result: null };
    if (kind === 'watch') {
      if (!place && !bld) return { ok: false, err: 'watch what? pick a place or a located building' };
      w.at = bld ? Math.min(SHIFT, s.minute + 60) : SHIFT;     // place watches report at the end of the night
      w.from = night === s.shift ? s.minute : 0;
    } else if (kind === 'lift') {
      if (!place || place.kind !== 'spot') return { ok: false, err: 'a lift needs a dead-drop site (a spot on the map)' };
      if (night !== s.shift) return { ok: false, err: 'a lift is done tonight or not at all' };
      w.at = Math.min(SHIFT, s.minute + 60);
    } else if (kind === 'raid') {
      if (!bld) return { ok: false, err: 'Special Branch raid buildings, not districts: locate the building first' };
      if (bld.raided) return { ok: false, err: 'already raided' };
      if (!bld.evidence.length) return { ok: false, err: 'Inspector Lyng wants evidence that ties this address to the ring' };
      w.at = Math.min(SHIFT, s.minute + WDELAY[W.G.id]);
    } else if (kind === 'stakeout') {
      if (!place) return { ok: false, err: 'stake out which place?' };
      if (s.stakeouts.some(function (x) { return x.place === target && x.night === night; })) return { ok: false, err: 'already covered' };
      w.at = null;
    }
    s.warrantsLeft--;
    s.warrants.push(w);
    var msgs = [];
    if (kind === 'stakeout') {
      var late = night === s.shift && W.op.night === night && s.minute > W.op.minute - 45;
      s.stakeouts.push({ place: target, night: night, w: w.id, late: late });
      w.status = 'set';
      msgs.push(this._post('warrant', 'Stake-out approved', D.SB, [{ k: 'p', x: ['A team will be in position at ', ref('place', target, place.name), ' on the night of ' + DX.dateLabel(night) + ', from 18:00.'] }]));
    } else {
      s.pending.push({ id: w.id, kind: kind, shift: night, at: Math.min(SHIFT, w.at), from: w.from || 0, target: target, params: DX.copy(params), done: false });
      var what = kind === 'watch' ? 'Watch on ' : kind === 'lift' ? 'Photograph-and-replace at ' : 'Raid on ';
      msgs.push(this._post('warrant', 'Warrant granted: ' + kind, D.SB, [{ k: 'p', x: [what, place ? ref('place', target, place.name) : ref('building', target, bld.address), kind === 'watch' ? ', night of ' + DX.dateLabel(night) + '.' : ' at about ' + DX.hhmm(Math.min(SHIFT, w.at)) + '.'] }].concat(kind === 'raid' && !this.building(target).strong ? [{ k: 'n', x: ['Lyng: "Thin, this. I hope you are right."'] }] : [])));
    }
    var events = this._spend(this.costs().warrant);
    return { ok: true, id: w.id, msgs: msgs, events: events };
  };

  CP._raise = function (n, why) { var s = this._s; s.alert = DX.clamp(s.alert + n * this._w.G.alert, 0, 100); s.alertLog.push({ shift: s.shift, t: s.minute, n: n, why: why }); };

  function meetingAt(W, placeId, night) { var m = W.plan.meet; return m.cafe === placeId && m.night === night ? m : null; }

  CP._resolveWarrant = function (p) {
    var s = this._s, W = this._w, self = this;
    var w = s.warrants.filter(function (x) { return x.id === p.id; })[0];
    var place = W.place[p.target], bld = s.buildings[p.target], msgIds = [], summary = '';
    w.status = 'done';
    if (p.kind === 'watch' && place) {
      var mt = meetingAt(W, place.id, p.shift);
      var body = [], found = [];
      if (mt && mt.minute >= p.from && !W.mem[mt.agent].arrested && !W.mem[mt.resident].arrested) {
        var a = W.mem[mt.resident], b = W.mem[mt.agent];
        body.push({ k: 'p', x: ['At ' + DX.hhmm(mt.minute) + ' a ' + (a.sex === 'F' ? 'woman' : 'man') + ' sat down at ', ref('place', place.id, place.name), ' with a newspaper folded under the left arm. A ' + (b.sex === 'F' ? 'woman' : 'man') + ' joined within five minutes. They talked for twenty minutes and left separately.'] });
        [a, b].forEach(function (m) {
          var bb = self._building({ key: 'mem:' + m.id + ':' + m.home.text, address: m.home.text, pos: m.home.pos, truth: m.id, how: 'home' }, { kind: 'meeting', detail: 'met at ' + place.name + ' (' + DX.dateLabel(p.shift) + ')' });
          bb.occupant = { name: m.name, cover: m.cover, photo: DX.hash(m.id + W.seed) % 1000 };
          found.push(bb);
          body.push({ k: 'p', x: ['Followed home: ', ref('person', bb.id, m.name), ', ' + m.cover + ', to ', ref('building', bb.id, bb.address), '.'] });
        });
        summary = 'meeting seen, two followed';
        s.watchHits++;
      }
      W.plan.drops.forEach(function (d) {
        if (d.place !== place.id) return;
        var loader = d.contents === 'exec' ? (W.ring.members.filter(function (m) { return m.courier; })[0] || W.ring.resident) : W.ring.resident;
        var ev = null;
        if (d.night === p.shift && d.after >= p.from && !loader.arrested) ev = { m: loader, t: d.after, verb: 'loaded' };
        if (d.collect.night === p.shift && d.collect.minute >= p.from && !W.mem[d.forId].arrested) ev = { m: W.mem[d.forId], t: d.collect.minute, verb: 'cleared' };
        if (!ev) return;
        var bb = self._building({ key: 'mem:' + ev.m.id + ':' + ev.m.home.text, address: ev.m.home.text, pos: ev.m.home.pos, truth: ev.m.id, how: 'home' }, { kind: 'drop', detail: ev.verb + ' the drop at ' + place.name + ' (' + DX.dateLabel(p.shift) + ')' });
        bb.occupant = { name: ev.m.name, cover: ev.m.cover, photo: DX.hash(ev.m.id + W.seed) % 1000 };
        found.push(bb);
        body.push({ k: 'p', x: ['At about ' + DX.hhmm(ev.t) + ' a ' + (ev.m.sex === 'F' ? 'woman' : 'man') + ' stopped at ', ref('place', place.id, place.name), ', crouched, and ' + ev.verb + ' something. Followed to ', ref('building', bb.id, bb.address), ': ', ref('person', bb.id, ev.m.name), ', ' + ev.m.cover + '.'] });
        summary = 'drop serviced, followed';
        s.watchHits++;
      });
      if (W.op.place === place.id && W.op.night === p.shift && W.op.minute >= p.from) {
        body.push({ k: 'p', x: ['Our watchers saw figures at ', ref('place', place.id, place.name), ' at ' + DX.hhmm(W.op.minute) + '. A watch team cannot intervene.'] });
      }
      if (!body.length) {
        // an innocent sometimes looks interesting
        if (DX.u(W.key, 960, s.warrants.length, p.shift) < (W.G.id === 'chief' ? 0.5 : W.G.id === 'analyst' ? 0.3 : 0)) {
          var IR = DX.rng(W.seed + '/inn/' + p.id), fn = IR.pick(D.FIRST_M) + ' ' + IR.pick(D.SURNAMES), ad = DX.address(W.city, IR, place.district);
          var ib = self._building({ key: 'inn:' + p.id, address: ad.text, pos: ad.pos, truth: 'innocent', how: 'home' }, { kind: 'seen', detail: 'lingered at ' + place.name });
          ib.occupant = { name: fn, cover: IR.pick(D.COVERS), photo: IR.int(0, 999) };
          body.push({ k: 'p', x: ['Nothing obvious. One man lingered at ', ref('place', place.id, place.name), ' for half an hour and looked about him; followed to ', ref('building', ib.id, ib.address), ' (', ref('person', ib.id, fn), ').'] });
          summary = 'someone lingered';
        } else {
          body.push({ k: 'p', x: ['Nothing of interest at ', ref('place', place.id, place.name), ' all night.'] });
          summary = 'nothing';
          s.patience -= 3;
        }
      }
      if (DX.u(W.key, 961, s.warrants.length, p.shift) < 0.1 * W.G.alert) this._raise(6, 'watchers noticed');
      else this._raise(2, 'watch');
      msgIds.push(this._post('result', 'Watch report: ' + place.name, D.SB, body, { found: found.map(function (x) { return x.id; }) }));
      // results arrive when the night's events are over
    } else if (p.kind === 'watch' && bld) {
      var body2 = [];
      if (bld.truth && W.mem[bld.truth]) {
        var mm = W.mem[bld.truth];
        bld.occupant = { name: mm.name, cover: mm.cover, photo: DX.hash(mm.id + W.seed) % 1000 };
        body2.push({ k: 'p', x: ['The occupant of ', ref('building', bld.id, bld.address), ' is ', ref('person', bld.id, mm.name), ', ' + mm.cover + '. ' + (mm.sex === 'F' ? 'She' : 'He') + ' keeps late hours; the curtains stay drawn.'] });
        summary = 'occupant identified';
      } else if (bld.truth === 'decoy') {
        body2.push({ k: 'p', x: ['Nobody came or went at ', ref('building', bld.id, bld.address), '. The landlord says the room was let for cash to a man he never saw again.'] });
        summary = 'empty';
      } else {
        bld.occupant = bld.occupant || { name: 'a family (the Holms)', cover: 'a docker, his wife and two children', photo: 0 };
        body2.push({ k: 'p', x: ['A family lives at ', ref('building', bld.id, bld.address), '. Nothing suggests anything else.'] });
        summary = 'ordinary household';
      }
      this._raise(2, 'watch');
      msgIds.push(this._post('result', 'Watch report: ' + bld.address, D.SB, body2));
    } else if (p.kind === 'lift') {
      var at = p.at, dropHit = null;
      W.plan.drops.forEach(function (d) {
        if (d.place !== place.id || d.lifted) return;
        var abs = p.shift * SHIFT + at, from = d.night * SHIFT + d.after, to = d.collect.night * SHIFT + d.collect.minute;
        if (abs >= from && abs < to) dropHit = d;
      });
      if (dropHit) {
        dropHit.lifted = true;
        var wid = this._clearMessage('drop:' + dropHit.id, dropHit.text, 'Contents of the dead drop at ' + place.name + ', photographed and replaced');
        msgIds.push(this._post('result', 'Lift: ' + place.name, D.SB, [{ k: 'p', x: ['Behind the ', ref('place', place.id, place.name), ' we found a tobacco tin: ' + (dropHit.contents === 'exec' ? (W.op.item.toLowerCase() + ' and a typed note') : 'banknotes and a typed note') + '. Photographed and put back exactly as found.'] }, { k: 'm', x: [ref('msg', wid, 'Note: ' + dropHit.text)] }]));
        this._learnFacts(wid, dropHit.norm, dropHit.facts, 'lift');
        var carefulM = W.mem[dropHit.forId];
        if (DX.u(W.key, 962, p.shift, 1) < 0.25 * W.G.alert * (carefulM ? carefulM.careful + 0.3 : 1)) this._raise(12, 'drop disturbed');
        else this._raise(3, 'lift');
        summary = 'contents photographed';
      } else {
        msgIds.push(this._post('result', 'Lift: nothing', D.SB, [{ k: 'p', x: ['The site at ', ref('place', place.id, place.name), ' was empty. Two men and a morning wasted.'] }]));
        s.patience -= 6; summary = 'empty';
        this._raise(2, 'lift');
      }
    } else if (p.kind === 'raid') {
      var r = this._raid(bld);
      msgIds = msgIds.concat(r.msgIds); summary = r.summary;
    }
    w.result = summary;
    if (s.patience <= 0 && !s.outcome) this._end('sacked');
    return { summary: summary, msgIds: msgIds };
  };

  CP._computerJob = function (job) {
    var s = this._s, self = this;
    var st = job.ids.map(function (id) { return self._digitsOf(id); }).filter(Boolean);
    var best = st.length ? DX.searchBoard(st, typeof job.arg === 'number' ? job.arg : DX.toDigits(job.arg)) : null;
    job.result = best ? { keyword: best.keyword, key: best.key, plaus: best.plaus } : null;
    if (best && best.plaus >= 0.55) {
      if (!s.board) s.board = best.keyword;
      job.ok = true;
      return { ok: true, keyword: best.keyword, key: best.key, msgIds: [this._post('report', 'The big computer: checkerboard recovered', 'Computer room', [{ k: 'p', x: ['Keyword ' + best.keyword + ' gives readable text on ', ref('msg', job.ids[0], 'the courier traffic'), ' with key ' + best.key.join('') + ' (period ' + best.key.length + '). The checkerboard is on your bench.'] }], { job: job.id, keyword: best.keyword, key: best.key })] };
    }
    job.ok = false;
    return { ok: false, msgIds: [this._post('report', 'The big computer: no luck', 'Computer room', [{ k: 'p', x: ['No keyword in the list gives readable text with period ' + (typeof job.arg === 'number' ? job.arg : job.arg.length) + '. Check the period, or wait for more traffic.'] }], { job: job.id })] };
  };

  CP._clearMessage = function (key, text, source) {
    var s = this._s;
    if (s.wbByKey[key]) return s.wbByKey[key];
    var no = s.nextNo++;
    s.wbByKey[key] = 'M' + no;
    s.wb['M' + no] = { id: 'M' + no, no: no, key: key, copies: [], first: { shift: s.shift, t: s.minute }, from: null, to: null, kind: 'clear', text: text, source: source };
    return 'M' + no;
  };

  CP._raid = function (bld) {
    var s = this._s, W = this._w, self = this, msgIds = [], summary;
    bld.raided = true;
    var m = W.mem[bld.truth];
    if (m && !m.arrested) {
      m.arrested = true;
      s.arrested[m.id] = { shift: s.shift, t: s.minute };
      bld.occupant = { name: m.name, cover: m.cover, photo: DX.hash(m.id + W.seed) % 1000 };
      this._applyArrest(m);
      var found = [];
      found.push('a transmitter' + (m.txFrom === 'mobile' ? ' in the back of a van' : ' under the floorboards'));
      if (m.courier) { found.push('a card with the digits ' + m.periodKey.join('') + ' pencilled on it'); s.keys[m.call] = m.periodKey.slice(); }
      else { found.push('a one-time pad with a dozen pages left'); s.padLinks[m.role === 'resident' ? 'ctl' : m.id] = true; if (m.role === 'resident') W.ring.members.forEach(function (x) { if (x.role !== 'resident') s.padLinks[x.id] = true; }); }
      if (!s.board) { s.board = W.ring.keyword; found.push('a checkerboard card (keyword ' + W.ring.keyword + ')'); }
      if (m.executor) found.push(W.op.item.toLowerCase() + ' and a sketch of ' + W.place[W.op.place].name);
      var body = [{ k: 'p', x: ['Special Branch went into ', ref('building', bld.id, bld.address), ' at ' + DX.hhmm(s.minute) + ' and arrested ', ref('person', bld.id, m.name), ' (' + m.cover + '). Found: ' + found.join('; ') + '.'] }];
      if (m.executor) body.push({ k: 'p', x: ['The sketch is marked with a time: ' + DX.hhmm(W.op.minute) + '. Lyng is sure this was the one who would have done it.'] });
      msgIds.push(this._post('result', 'Raid: ' + m.name + ' arrested', D.SB, body, { urgent: true }));
      this._autoDecrypt();
      this._raise(18, 'arrest');
      summary = 'arrested ' + m.name;
      if (m.executor && !s.outcome) { this._end('arrest'); }
      else if (!s.outcome && this._collapsed()) this._end('collapse');
    } else if (bld.truth === 'decoy') {
      msgIds.push(this._post('result', 'Raid: empty room', D.SB, [{ k: 'p', x: ['At ', ref('building', bld.id, bld.address), ' there was nobody: a transmitter wired to a tape keyer on a clock timer. A decoy. The ring will know we took the bait.'] }], { urgent: true }));
      this._raise(20, 'decoy raided'); s.patience -= 12; s.wrongRaids++;
      summary = 'decoy';
    } else {
      msgIds.push(this._post('result', 'Raid: wrong house', D.SB, [{ k: 'p', x: ['The raid on ', ref('building', bld.id, bld.address), ' found a frightened family and nothing else. There will be a complaint.'] }], { urgent: true }));
      this._post('super', 'The superintendent', D.SUPER, [{ k: 'p', x: ['"I have had the chief constable on the telephone. No more raids on hunches."'] }]);
      this._raise(25, 'wrong raid'); s.patience -= 30; s.wrongRaids++;
      summary = 'wrong house';
    }
    return { msgIds: msgIds, summary: summary };
  };
  CP._collapsed = function () {
    var W = this._w, res = W.ring.resident;
    if (!res.arrested) return false;
    var n = W.ring.members.filter(function (m) { return m.role !== 'resident' && m.arrested; }).length;
    return n >= W.G.collapseAgents;
  };
  CP._applyArrest = function (m) {
    var s = this._s, W = this._w;
    W.plan.txs.forEach(function (t) { if (t.fromId === m.id && (t.night > s.shift || (t.night === s.shift && t.minute > s.minute))) t.cancelled = true; });
  };
  /** pads/keys seized in raids decrypt the traffic they cover */
  CP._autoDecrypt = function () {
    var s = this._s, W = this._w, self = this;
    Object.keys(s.wb).forEach(function (wid) {
      var wb = s.wb[wid];
      if (wb.kind === 'clear' || s.accepts[wid]) return;
      var m = W.msg[wb.key];
      if (!m) return;
      var ok = (m.cipher === 'pad' && s.padLinks[m.link]) || (m.cipher === 'periodic' && s.keys[W.mem[m.from].call]);
      if (!ok || !s.board) return;
      // decrypt the copy we hold (holes stay holes)
      var dg = self._digitsOf(wid), key = m.cipher === 'pad' ? DX.toDigits(padDigits(W, m)) : m.key;
      var txt = DX.decode(DX.boardCache(s.board), DX.subKey(dg, key)).text;
      self._accept(wid, txt, 'seized');
    });
  };
  function padDigits(W, m) { var PR = DX.rng(W.seed + '/page/' + m.page); return PR.digits(400).slice(0, m.plain.length); }
  DX._padDigits = padDigits;

  // ---------------------------------------------------------------- the operation
  CP._resolveOp = function (events) {
    var s = this._s, W = this._w, op = W.op;
    var so = s.stakeouts.filter(function (x) { return x.place === op.place && x.night === op.night && !x.late; })[0];
    if (so) { this._end('stakeout'); ev(events, 'op', { t: op.minute, stopped: true }); return; }
    ev(events, 'op', { t: op.minute, stopped: false });
    this._end('failed');
  };
  var OUT = {
    stakeout: { win: true, title: 'Caught in the act', text: 'The stake-out team was waiting. The operation was stopped at the scene and the executor arrested.' },
    arrest: { win: true, title: 'Stopped before it started', text: 'The agent who was to carry out the operation is in custody. The ring has called it off.' },
    collapse: { win: true, title: 'The ring collapsed', text: 'With the resident and his people in custody the controller has gone silent. The operation died with the network.' },
    failed: { win: false, title: 'It went ahead', text: 'The operation went ahead. By morning it is in the newspapers.' },
    sacked: { win: false, title: 'Relieved of the case', text: 'The superintendent has run out of patience and handed the case to Copenhagen.' }
  };
  CP._end = function (kind) {
    var s = this._s, W = this._w;
    if (s.outcome) return;
    var o = OUT[kind];
    var place = W.place[W.op.place];
    var text = o.text;
    if (kind === 'failed') text = 'At ' + DX.hhmm(W.op.minute) + ' on ' + DX.dateLabel(W.op.night) + ' the ring carried out operation ' + W.op.codeword + ' at ' + place.name + ': they meant to ' + W.op.label + '. ' + o.text;
    s.outcome = { kind: kind, win: o.win, title: o.title, text: text, shift: s.shift, t: s.minute };
    this._post('outcome', o.title, D.SUPER, [{ k: 'p', x: [text] }], { urgent: true });
  };

  // ---------------------------------------------------------------- the security officer
  var REACT = {
    cadet: ['reschedule', 'reschedule', 'decoy', 'move'],
    analyst: ['reschedule', 'stopReuse', 'decoy', 'burst', 'move'],
    chief: ['stopReuse', 'reschedule', 'burst', 'decoy', 'move']
  };
  CP._securityDawn = function () {
    var s = this._s, W = this._w, self = this, out = [];
    // silence after arrests keeps them nervous
    var nArr = Object.keys(s.arrested).length;
    if (nArr) this._raise(3 * nArr, 'arrests');
    var level = Math.floor(s.alert / 20);
    var seq = REACT[W.G.id];
    while (s.reactions.length < Math.min(level, seq.length)) {
      var r = { kind: seq[s.reactions.length], shift: s.shift, i: s.reactions.length };
      s.reactions.push(r);
      DX.applyReaction(W, r);
      out.push(r);
    }
    return out;
  };
  /** apply a security reaction to the plan (future nights only). Deterministic: re-applied on load. */
  DX.applyReaction = function (W, r) {
    var R = DX.rng(W.seed + '/react/' + r.i), after = r.shift;   // effective from the next night
    if (!r.live) r.live = W.ring.members.filter(function (m) { return !m.arrested; }).map(function (m) { return m.id; });
    var live = r.live.map(function (id) { return W.mem[id]; });
    if (r.kind === 'reschedule') {
      // everyone moves their times and frequencies; the controller moves frequency
      live.forEach(function (m) {
        var dm = R.pick([-1, 1]) * R.int(4, 9) * 10, nf = DX.round(Math.round(R.range(3.5, 10.5) * 200) / 200, 3);
        W.plan.txs.forEach(function (t) { if (t.fromId === m.id && t.night > after) { t.minute = DX.clamp(t.minute + dm, 30, 465 - t.dur); t.freq = nf; } });
      });
      var cf = [DX.round(Math.round(R.range(4, 5.8) * 200) / 200, 3), DX.round(Math.round(R.range(6.2, 8.8) * 200) / 200, 3)];
      W.plan.txs.forEach(function (t) { if (t.fromId === 'ctl' && t.night > after) t.freq = cf[/ctl1/.test(t.slot) ? 1 : 0]; });
      r.detail = 'all stations change times and frequencies';
    } else if (r.kind === 'stopReuse') {
      W.plan.msgs.forEach(function (m) {
        if (m.cipher !== 'pad') return;
        var partners = W.plan.pages[m.page] || [];
        if (partners.length < 2 || partners[0] === m.id) return;
        var first = W.tx[m.txs[0]];
        if (first && first.night > after) {
          m.page = DX.pad(10000 + R.int(0, 89999), 5);
          m.indicator = m.page;
          var cd = DX.digitStr(DX.addKey(m.plain, DX._padDigits(W, m)));
          m.groups = [m.indicator].concat(DX.groupsOf(cd));
          W.plan.pages[m.page] = [m.id];
          m.reuseStopped = true;
        }
      });
      r.detail = 'pad clerk told to stop re-using pages';
    } else if (r.kind === 'decoy') {
      var call = 'Q' + R.int(2, 9) + R.pick('BDFHKLMNPRTVWXZ'.split(''));
      var did = R.pick(W.city.districts).id, site = DX.address(W.city, R, did);
      var reals = W.plan.msgs.filter(function (m) { return m.cipher === 'pad' && W.tx[m.txs[0]] && W.tx[m.txs[0]].night <= after; });
      for (var n = after + 1; n < W.G.shifts; n++) {
        for (var k = 0; k < 2; k++) {
          var PR = DX.rng(W.seed + '/decoy/' + r.i + '/' + n + '/' + k);
          var ng = PR.int(14, 24), gr = [reals.length && PR.chance(0.5) ? PR.pick(reals).indicator : PR.digits(5)];
          for (var g = 1; g < ng; g++) gr.push(PR.digits(5));
          var t = { id: 'T' + (W.plan.txs.length + 1), night: n, minute: PR.int(8, 44) * 10, dur: Math.round(2 + ng * 0.3), freq: DX.round(Math.round(PR.range(3.6, 10.8) * 200) / 200, 3), mode: 'CW', from: call, fromId: 'decoy', to: W.ring.resident.call, toId: null, msg: null, groups: gr, indicator: true, decoy: true, repeat: false, slot: 'decoy', pos: site.pos, decoySite: site,
            fist: { wpm: 18, dah: 3, charGap: 1, wordGap: 7, jitter: 0.005, swing: 0, quirk: 'machine-even (tape keyer)' } };
          W.plan.txs.push(t); W.tx[t.id] = t; if (W.byNight[n]) { W.byNight[n].push(t); W.byNight[n].sort(function (a, b) { return a.minute - b.minute; }); }
        }
      }
      r.detail = 'decoy transmitter ' + call + ' put on the air';
    } else if (r.kind === 'burst') {
      live.filter(function (m) { return m.role !== 'resident'; }).forEach(function (m) {
        W.plan.txs.forEach(function (t) { if (t.fromId === m.id && t.night > after) { t.mode = 'BURST'; t.dur = 1; } });
      });
      r.detail = 'agents switch to burst transmitters';
    } else if (r.kind === 'move') {
      live.forEach(function (m) {
        if (R.chance(0.6)) {
          var nd = R.pick(W.city.districts).id, room = DX.address(W.city, R, nd);
          W.plan.txs.forEach(function (t) { if (t.fromId === m.id && t.night > after) t.pos = room.pos; });
          m.movedTo = room;
        }
      });
      r.detail = 'sets moved to new rooms';
    }
  };

  // ---------------------------------------------------------------- shifts
  CP.endShift = function () {
    var s = this._s, W = this._w, self = this;
    if (s.outcome) return { ok: false, err: 'the case is closed', events: [] };
    var events = this._advance(SHIFT);
    // stake-outs that saw nothing
    var report = { shift: s.shift, heard: s.log.filter(function (e) { return e.shift === s.shift; }).length,
      copied: s.log.filter(function (e) { return e.shift === s.shift && !e.faint; }).length, alert: this.alertLevel(), warrantsLeft: s.warrantsLeft, patience: Math.round(s.patience) };
    if (s.outcome) { report.over = true; return { ok: true, events: events, report: report, outcome: s.outcome }; }
    var reacts = this._securityDawn();
    report.reactions = reacts.length;   // the player is not told what they are
    // the superintendent's morning note
    var nd = s.shift + 1;
    var sup = [];
    if (s.patience < 40) sup.push('"Results, please. I cannot keep Special Branch on standby for ever."');
    else if (report.copied === 0) sup.push('"Nothing copied last night? The sets were on, I trust."');
    else sup.push('"Keep at it. ' + (W.G.shifts - nd) + ' night' + (W.G.shifts - nd === 1 ? '' : 's') + ' left before Copenhagen takes this off us."');
    if (reacts.length) sup.push('Kestrel night log: the ring\'s traffic pattern looked different towards dawn. They may be changing their habits.');
    s.shift = nd; s.minute = 0; s.seenStart = {};
    s.nudged = false;
    if (s.shift >= W.G.shifts) {
      // should not happen: the operation always falls inside the case
      this._end('failed');
      return { ok: true, events: events, report: report, outcome: s.outcome };
    }
    this._post('super', 'Morning note, ' + DX.dateLabel(s.shift), D.SUPER, sup.map(function (x) { return { k: 'p', x: [x] }; }));
    if (s.patience <= 0) this._end('sacked');
    return { ok: true, events: events, report: report, outcome: s.outcome };
  };

  // ---------------------------------------------------------------- operation card (facts learnt from correct reads)
  CP._learnFacts = function (wid, truthNorm, facts, how) {
    var s = this._s, W = this._w, self = this;
    var txt = s.accepts[wid] ? DX.norm(s.accepts[wid].text) : truthNorm;
    (facts || []).forEach(function (f) {
      if (f.fact === 'codeword') return;
      var v = DX.norm(f.value);
      if (txt.indexOf(v) < 0) return;
      var card = s.card[f.fact] || (s.card[f.fact] = { known: false, parts: {}, from: [] });
      card.parts[f.key] = f.value;
      if (card.from.indexOf(wid) < 0) card.from.push(wid);
      card.known = f.fact !== 'when' || (card.parts.OPDAY !== undefined);
    });
  };
  CP.opCard = function () {
    var s = this._s, W = this._w, out = {};
    ['what', 'where', 'when', 'who'].forEach(function (k) {
      var c = s.card[k];
      var o = { known: !!(c && c.known), value: null, from: c ? c.from.slice() : [], note: s.cardNotes[k] || '' };
      if (c && c.known) {
        if (k === 'what') o.value = c.parts.WHAT;
        if (k === 'where') { var pl = W.city.places.filter(function (p) { return DX.norm(p.code) === DX.norm(c.parts.OPPLACE); })[0]; o.value = pl ? pl.name : c.parts.OPPLACE; o.place = pl ? pl.id : null; }
        if (k === 'when') { o.value = 'night of ' + c.parts.OPDAY.charAt(0) + c.parts.OPDAY.slice(1).toLowerCase() + (c.parts.OPTIME ? ' at ' + c.parts.OPTIME.slice(0, 2) + ':' + c.parts.OPTIME.slice(2) : ''); o.night = DX.CAL.DAY_NAMES.indexOf(c.parts.OPDAY) >= 0 ? (DX.CAL.DAY_NAMES.indexOf(c.parts.OPDAY) % 7) : null; }
        if (k === 'who') o.value = c.parts.EXEC, o.callsign = c.parts.EXEC;
      }
      out[k] = o;
    });
    out.codeword = s.card.codeword || null;
    return out;
  };
  CP.card = function (field, note) { if (['what', 'where', 'when', 'who'].indexOf(field) < 0) return { ok: false }; this._s.cardNotes[field] = String(note || '').slice(0, 200); return { ok: true }; };

  CP._accept = function (wid, text, by) {
    var s = this._s, W = this._w, wb = s.wb[wid];
    var m = W.msg[wb.key];
    var truth = m ? m.norm : '';
    var g = m ? DX.gradeText2(truth, text) : { score: 0, grade: 'wrong' };
    s.accepts[wid] = { text: String(text), grade: g.grade, score: g.score, by: by || 'player', shift: s.shift, t: s.minute };
    if (m) this._learnFacts(wid, truth, m.facts, by);
    return g;
  };

  // ---------------------------------------------------------------- bench
  function makeBench(c) {
    var B = {};
    function need(ids, n) {
      ids = Array.isArray(ids) ? ids : [ids];
      for (var i = 0; i < ids.length; i++) { var wb = c._s.wb[ids[i]]; if (!wb) return 'no such message ' + ids[i]; if (wb.kind === 'clear') return ids[i] + ' is already in clear'; }
      return null;
    }
    function streams(ids) { return (Array.isArray(ids) ? ids : [ids]).map(function (id) { return c._digitsOf(id); }); }
    function board() { return c._s.board ? DX.boardCache(c._s.board) : null; }
    B.depth = function (a, b) {
      var e = need([a, b]); if (e) return { ok: false, err: e };
      var ka = c._s.wb[a].kind, kb = c._s.wb[b].kind;
      var d = DX.diff(c._digitsOf(a), c._digitsOf(b));
      var ma = c.message(a), mb = c.message(b);
      var ev2 = c._spend(c.costs().depth);
      return { ok: true, diff: d, diffStr: DX.digitStr(d), len: d.length, sameIndicator: !!(ma.indicator && ma.indicator === mb.indicator && ma.indicator.indexOf('?') < 0), kinds: [ka, kb], events: ev2 };
    };
    B.crib = function (a, b, crib, offset, side) {
      var e = need([a, b]); if (e) return { ok: false, err: e };
      var bd = board(); if (!bd) return { ok: false, err: 'no checkerboard: recover it first' };
      side = side === 'B' ? 'B' : 'A';
      var d = DX.diff(c._digitsOf(a), c._digitsOf(b));
      offset = Math.max(0, offset | 0);
      var r = DX.cribDrag(bd, d, crib, offset, side);
      r.ok = true; r.side = side; r.offset = offset;
      r.events = c._spend(c.costs().crib);
      return r;
    };
    function wkey(a, b) { return a + '|' + b; }
    /** commit a crib to the pair's workspace; returns the workspace */
    B.place = function (a, b, side, crib, offset) {
      var e = need([a, b]); if (e) return { ok: false, err: e };
      if (!board()) return { ok: false, err: 'no checkerboard: recover it first' };
      var W2 = c._s.work[wkey(a, b)] || (c._s.work[wkey(a, b)] = { a: a, b: b, placed: [] });
      W2.placed.push({ side: side === 'B' ? 'B' : 'A', text: DX.norm(crib), offset: Math.max(0, offset | 0) });
      var ev3 = c._spend(c.costs().place);
      var w = B.work(a, b); w.events = ev3; return w;
    };
    B.unplace = function (a, b, index) {
      var W2 = c._s.work[wkey(a, b)]; if (!W2) return { ok: false, err: 'nothing placed' };
      if (index === undefined) W2.placed = []; else W2.placed.splice(index, 1);
      return B.work(a, b);
    };
    B.work = function (a, b) {
      var bd = board(), W2 = c._s.work[wkey(a, b)];
      if (!bd) return { ok: false, err: 'no checkerboard' };
      var da = c._digitsOf(a), db = c._digitsOf(b), d = DX.diff(da, db);
      var A = da.map(function () { return -1; }), Bd = db.map(function () { return -1; }), starts = { A: {}, B: {} };
      (W2 ? W2.placed : []).forEach(function (p) {
        var cd = DX.toDigits(DX.encode(bd, p.text)), own = p.side === 'A' ? A : Bd, oth = p.side === 'A' ? Bd : A;
        starts[p.side][p.offset] = 1;
        for (var i = 0; i < cd.length; i++) {
          var j = p.offset + i; if (j >= own.length) break;
          own[j] = cd[i];
          if (j < d.length && d[j] >= 0 && j < oth.length) oth[j] = p.side === 'A' ? ((cd[i] - d[j]) % 10 + 10) % 10 : (cd[i] + d[j]) % 10;
        }
      });
      return { ok: true, a: sideView(bd, A, starts.A), b: sideView(bd, Bd, starts.B), placed: W2 ? DX.copy(W2.placed) : [], diff: DX.digitStr(d) };
    };
    function sideView(bd, arr, starts) {
      // decode each known run; unknown runs become '?' (about one per 1.4 digits)
      var text = '', runs = [], i = 0;
      while (i < arr.length) {
        var j = i;
        if (arr[i] < 0) { while (j < arr.length && arr[j] < 0) j++; var n = Math.max(1, Math.round((j - i) / 1.4)); text += new Array(n + 1).join('?'); runs.push({ from: i, to: j, known: false }); i = j; continue; }
        while (j < arr.length && arr[j] >= 0) j++;
        var seg = arr.slice(i, j);
        var best = null;
        [0, 1].forEach(function (sk) { var dd = DX.decode(bd, seg, sk); var pl = DX.plaus(dd.text).score + (sk === 0 && starts[i] ? 0.2 : 0); if (!best || pl > best.pl) best = { t: (sk ? '?' : '') + dd.text, pl: pl }; });
        text += best.t; runs.push({ from: i, to: j, known: true, text: best.t });
        i = j;
      }
      return { text: text, digits: DX.digitStr(arr), runs: runs, plaus: DX.plaus(text.replace(/\?/g, '')).score };
    }
    B.period = function (ids) {
      var e = need(ids); if (e) return { ok: false, err: e };
      var st = streams(ids);
      var ic = DX.icByPeriod(st, 12), reps = DX.repeats(st, 5);
      var ev4 = c._spend(c.costs().period);
      return { ok: true, ic: ic, repeats: reps, best: DX.bestPeriod(ic, reps), events: ev4 };
    };
    B.columns = function (ids, period) {
      var e = need(ids); if (e) return { ok: false, err: e };
      period = Math.max(1, period | 0);
      var cols = DX.columnFreq(streams(ids), period, board());
      var ev5 = c._spend(c.costs().columns);
      return { ok: true, cols: cols, expect: board() ? DX.boardExpect(board()).map(function (x) { return DX.round(x, 4); }) : null, events: ev5 };
    };
    B.align = function (ids, period) {
      var e = need(ids); if (e) return { ok: false, err: e };
      var r = DX.alignColumns(streams(ids), Math.max(1, period | 0));
      r.ok = true; r.events = c._spend(c.costs().align);
      return r;
    };
    B.setKey = function (ids, key) {
      var e = need(ids); if (e) return { ok: false, err: e };
      var bd = board(); if (!bd) return { ok: false, err: 'no checkerboard: recover it first' };
      var k = DX.toDigits(key);
      var list = (Array.isArray(ids) ? ids : [ids]).map(function (id) { var t = DX.decode(bd, DX.subKey(c._digitsOf(id), k)).text; return { id: id, text: t, plaus: DX.plaus(t).score }; });
      var ev6 = c._spend(c.costs().setKey);
      return { ok: true, texts: list, text: list[0].text, plaus: list[0].plaus, events: ev6 };
    };
    /** book the big computer: it tries every keyword in the list against these messages with this period (or
     *  relative key). The job runs for an hour; the answer comes to the inbox (event kind 'computer'). */
    B.boardSolve = function (ids, periodOrRel) {
      var e = need(ids); if (e) return { ok: false, err: e };
      var s = c._s;
      if (s.pending.some(function (p) { return p.kind === 'computer' && !p.done; })) return { ok: false, err: 'the computer is already running a job for you' };
      var job = { id: 'C' + (s.pending.length + 1), kind: 'computer', shift: s.shift, at: Math.min(SHIFT, s.minute + c.costs().boardSolveWait), ids: (Array.isArray(ids) ? ids : [ids]).slice(), arg: periodOrRel, done: false };
      if (s.minute + c.costs().boardSolveWait > SHIFT) { job.shift = s.shift + 1; job.at = Math.min(SHIFT, s.minute + c.costs().boardSolveWait - SHIFT); }
      s.pending.push(job);
      var ev7 = c._spend(c.costs().boardSolve);
      return { ok: true, pending: true, job: job.id, ready: { shift: job.shift, t: job.at, label: DX.hhmm(job.at) }, events: ev7 };
    };
    B.decode = function (digits) { var bd = board(); if (!bd) return { ok: false, err: 'no checkerboard' }; var d = DX.decode(bd, digits); return { ok: true, text: d.text, plaus: DX.plaus(d.text).score }; };
    B.encode = function (text) { var bd = board(); if (!bd) return { ok: false, err: 'no checkerboard' }; return { ok: true, digits: DX.encode(bd, text) }; };
    /** Cadet/Analyst tool help: likely words at an offset of a depth pair */
    B.suggest = function (a, b, offset, side) {
      if (!c._w.G.suggest) return { ok: false, err: 'no suggestions at this grade' };
      var e = need([a, b]); if (e) return { ok: false, err: e };
      var bd = board(); if (!bd) return { ok: false, err: 'no checkerboard' };
      var d = DX.diff(c._digitsOf(a), c._digitsOf(b)), out = [];
      DX.vocab().forEach(function (v) {
        if (v.w.length < 3) return;
        var r = DX.cribDrag(bd, d, v.w, offset | 0, side === 'B' ? 'B' : 'A');
        if (r.fits && r.plaus >= 0.5) out.push({ word: v.w, other: r.other, plaus: r.plaus });
      });
      out.sort(function (x, y) { return y.plaus - x.plaus || y.word.length - x.word.length; });
      var ev8 = c._spend(c.costs().suggest);
      return { ok: true, list: out.slice(0, 8), events: ev8 };
    };
    B.accept = function (id, text) {
      var wb = c._s.wb[id]; if (!wb) return { ok: false, err: 'no such message' };
      if (wb.kind === 'clear') return { ok: false, err: 'already in clear' };
      var g = c._accept(id, text, 'player');
      var card = c.opCard();
      return { ok: true, grade: g.grade, score: g.score, card: card };
    };
    return B;
  }

  /** alignment-tolerant grading (LCS), holes never match */
  DX.gradeText2 = function (truth, text) {
    var t = DX.norm(truth), p = DX.norm(text);
    if (!t.length) return { score: 0, grade: 'wrong' };
    p = p.slice(0, t.length + 12);
    var prev = new Array(p.length + 1).fill(0), cur = new Array(p.length + 1).fill(0);
    for (var i = 1; i <= t.length; i++) {
      for (var j = 1; j <= p.length; j++) cur[j] = t[i - 1] === p[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
      var tmp = prev; prev = cur; cur = tmp;
    }
    var score = prev[p.length] / t.length;
    return { score: DX.round(score, 3), grade: score >= 0.95 ? 'right' : score >= 0.4 ? 'partial' : 'wrong' };
  };

  // ---------------------------------------------------------------- debrief
  CP.debrief = function () {
    var s = this._s, W = this._w, self = this;
    var ring = W.ring, op = W.op;
    var heardMsgs = {};
    Object.keys(s.wb).forEach(function (k) { heardMsgs[s.wb[k].key] = k; });
    var members = ring.members.map(function (m) {
      return { id: m.id, callsign: m.call, role: m.role, name: m.name, cover: m.cover, address: m.home.text, district: m.district, room: m.room ? m.room.text : null,
        txFrom: m.txFrom, executor: m.executor, arrested: !!m.arrested, fist: DX.copy(m.fist), cipher: m.courier ? 'periodic key ' + m.periodKey.join('') : 'one-time pad', movedTo: m.movedTo ? m.movedTo.text : null };
    });
    var plaintexts = W.plan.msgs.map(function (m) {
      var wid = heardMsgs[m.id];
      var partners = (W.plan.pages[m.page] || []).filter(function (x) { return x !== m.id; });
      return { id: m.id, wb: wid || null, night: m.night, from: m.from === 'ctl' ? ring.controller.call : W.mem[m.from].call, to: m.to === 'ctl' ? ring.controller.call : W.mem[m.to].call,
        text: m.text, cipher: m.cipher, page: m.page || null, depthWith: partners.length ? partners : null, facts: m.facts.map(function (f) { return f.fact; }).filter(function (f, i, a) { return f !== 'codeword' && a.indexOf(f) === i; }),
        heard: !!wid, decrypted: wid && s.accepts[wid] ? s.accepts[wid].grade : null, cancelled: m.txs && m.txs.every(function (t) { return W.tx[t].cancelled; }) };
    });
    var used = s.warrants.length, wasted = s.warrants.filter(function (w) { return /nothing|empty|wrong|decoy/.test(w.result || ''); }).length;
    var decR = Object.keys(s.accepts).filter(function (k) { return s.accepts[k].grade === 'right'; }).length;
    var decP = Object.keys(s.accepts).filter(function (k) { return s.accepts[k].grade === 'partial'; }).length;
    var arrests = members.filter(function (m) { return m.arrested; }).length;
    var win = !!(s.outcome && s.outcome.win);
    var score = { win: win ? 50 : 0, arrests: arrests * 8, decrypts: decR * 3 + decP, warrants: -wasted * 5, mentor: -s.mentorPenalty, alert: -Math.round(s.alert / 10), time: win && s.outcome ? Math.max(0, (W.G.shifts - s.outcome.shift - 1) * 5) : 0 };
    var total = Math.max(0, Object.keys(score).reduce(function (a, k) { return a + score[k]; }, 0));
    var letter = total >= 90 ? 'Exemplary' : total >= 70 ? 'Commended' : total >= 50 ? 'Sound' : total >= 30 ? 'Adequate' : 'Poor';
    return {
      outcome: s.outcome ? DX.copy(s.outcome) : null,
      truth: {
        controller: { callsign: ring.controller.call, voice: ring.controller.voice },
        ring: members, security: { name: ring.security.name, reactions: DX.copy(s.reactions) },
        operation: { codeword: op.codeword, what: op.label, whatText: op.what, place: op.place, placeName: W.place[op.place].name, night: op.night, date: DX.dateLabel(op.night), time: DX.hhmm(op.minute), executor: W.mem[op.executor].call, executorName: W.mem[op.executor].name, item: op.item },
        plaintexts: plaintexts, keyword: ring.keyword, board: DX.boardView(ring.board),
        drops: W.plan.drops.map(function (d) { return { place: d.place, placeName: W.place[d.place].name, night: d.night, after: DX.hhmm(d.after), forCallsign: W.mem[d.forId].call, text: d.text, lifted: !!d.lifted }; }),
        meeting: { place: W.plan.meet.cafe, placeName: W.place[W.plan.meet.cafe].name, night: W.plan.meet.night, time: DX.hhmm(W.plan.meet.minute), agent: W.mem[W.plan.meet.agent].call },
        pairs: W.plan.pairs.map(function (p) { return { a: p.a, b: p.b, wbA: heardMsgs[p.a] || null, wbB: heardMsgs[p.b] || null }; })
      },
      stats: { heard: s.log.length, copied: s.log.filter(function (e) { return !e.faint; }).length, messages: Object.keys(s.wb).length, decryptedRight: decR, decryptedPartial: decP,
        warrantsUsed: used, warrantsWasted: wasted, wrongRaids: s.wrongRaids, arrests: arrests, alert: Math.round(s.alert), patience: Math.round(s.patience), mentor: DX.copy(s.mentorUsed), vans: s.vans.length, dfs: Object.keys(s.dfs).length },
      score: { parts: score, total: total, grade: letter }
    };
  };

  // ---------------------------------------------------------------- creation, save, load
  function initialState(W) {
    var G = W.G;
    return { v: 1, seed: W.baseSeed, grade: G.id, attempt: W.attempt, tutorial: false, shift: 0, minute: 0, outcome: null, opDone: false,
      log: [], heard: {}, seenStart: {}, slots: {}, wb: {}, wbByKey: {}, nextNo: 101 + (DX.hash(W.seed) % 40), accepts: {}, work: {},
      links: [], warrants: [], warrantsLeft: G.warrants, pending: [], stakeouts: [], buildings: {}, areas: [], vans: [], dfs: {},
      inbox: [], alert: 0, alertLog: [], reactions: [], patience: G.patience, arrested: {}, wrongRaids: 0, watchHits: 0,
      card: {}, cardNotes: {}, board: G.boardHeld ? W.ring.keyword : null, padLinks: {}, keys: {}, notes: '',
      mentorUsed: { 1: 0, 2: 0, 3: 0 }, mentorPenalty: 0, nudged: false, mentorLog: [] };
  }
  function openingInbox(c) {
    var W = c._w, ring = W.ring, sch = W.plan.sched.ctl, G = W.G;
    var ctl = ring.controller.call, res = ring.resident.call;
    c._post('brief', 'Case file: the ' + ctl + ' network', D.SUPER, [
      { k: 'p', x: ['An illegal network in ', ref('district', W.city.districts[0].id, D.CITY), ' is preparing an operation. We do not know what, where or when. Your job is to find out and stop it.'] },
      { k: 'p', x: ['Its controller abroad broadcasts voice numbers under the callsign ', ref('callsign', ctl, ctl), ' to a station in the city that calls itself ', ref('callsign', res, res), '. Schedule: ' + DX.hhmm(sch[0].minute) + ' on ' + sch[0].freq.toFixed(3) + ' MHz and ' + DX.hhmm(sch[1].minute) + ' on ' + sch[1].freq.toFixed(3) + ' MHz. Every message is repeated the following night a quarter of an hour after its slot, so a garbled copy can be mended.'] },
      { k: 'p', x: ['The resident and his agents answer in Morse. Their times and frequencies are for you to learn: keep the band watch running and the log will fill.'] },
      { k: 'p', x: ['You have ' + G.warrants + ' warrants from Special Branch for ' + G.shifts + ' nights. Watch, lift, raid, stake-out: a raid needs a building and evidence. A wrong raid will cost us.'] }
    ]);
    if (G.boardHeld) c._post('casefile', 'Case file: the checkerboard', 'Registry', [
      { k: 'p', x: ['Taken from the courier arrested in Aalborg in March. The ring builds its straddling checkerboard from the keyword ' + ring.keyword + '. ETAONRIS take one figure; the rest two. Figures are written twice between figure-shift signs.'] }, { k: 'm', x: ['(see the checkerboard card on the bench)'] }]);
    else c._post('casefile', 'Case file: no checkerboard', 'Registry', [
      { k: 'p', x: ['We do not hold this ring\'s checkerboard. The couriers use a short additive key on top of it: find the period, align the columns, and book time on the big computer to try the keyword list.'] }]);
    c._post('mentor', 'From the night supervisor', DX.MENTOR_INFO.name, [
      { k: 'p', x: ['"Listen first. Copy the ' + DX.hhmm(sch[0].minute) + ' broadcast cleanly, then look at the indicator groups: if two messages carry the same one, the pad clerk has been lazy and we can read them. Ask me if you are stuck."'] }]);
    // the case file gives the controller's known slots (and their repeats)
    sch.forEach(function (sl, k) {
      var t0 = W.plan.txs.filter(function (t) { return t.fromId === 'ctl' && t.slot === 'ctl' + k; })[0];
      if (!t0) return;
      var key = t0.from + '|' + sl.freq + '|' + sl.minute;
      c._s.slots[key] = { callsign: t0.from, to: t0.to, freq: sl.freq, minute: sl.minute, mode: 'VOICE', nights: [], source: 'casefile' };
      var key2 = t0.from + '|' + sl.freq + '|' + (sl.minute + 15);
      c._s.slots[key2] = { callsign: t0.from, to: t0.to, freq: sl.freq, minute: sl.minute + 15, mode: 'VOICE', nights: [], source: 'casefile', repeat: true };
    });
  }

  DX.newCase = function (seed, opts) {
    opts = opts || {};
    if (seed === undefined || seed === null || seed === '') seed = String(Math.floor(Math.random() * 1e9));
    var grade = DX.grade(opts.tutorial ? 'cadet' : opts.grade || 'analyst').id;
    if (opts.tutorial) seed = 'tutorial-1977';
    var W, attempt = 0, v;
    for (; attempt < 25; attempt++) {
      W = DX.makeWorld(seed, grade, attempt);
      v = DX.verifyWorld ? DX.verifyWorld(W) : { ok: true };
      if (v.ok) break;
    }
    var s = initialState(W);
    s.tutorial = !!opts.tutorial;
    var c = new Case(W, s);
    c._verify = v;
    openingInbox(c);
    return c;
  };

  CP.save = function () {
    var json = JSON.stringify(this._s).replace(/[Ā-￿]/g, function (ch) { return '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4); });
    return 'DX1:' + DX.pack(json);
  };
  DX.load = function (str) {
    var json = /^DX1:/.test(str) ? DX.unpack(str.slice(4)) : str;
    var s = JSON.parse(json);
    var W = DX.makeWorld(s.seed, s.grade, s.attempt);
    // replay the world changes: security reactions and arrests, in order
    s.reactions.forEach(function (r) { DX.applyReaction(W, r); });
    var c = new Case(W, s);
    Object.keys(s.arrested).forEach(function (id) {
      var m = W.mem[id]; m.arrested = true;
      var at = s.arrested[id];
      W.plan.txs.forEach(function (t) { if (t.fromId === m.id && (t.night > at.shift || (t.night === at.shift && t.minute > at.t))) t.cancelled = true; });
    });
    W.plan.drops.forEach(function (d) { if (s.wbByKey['drop:' + d.id]) d.lifted = true; });
    return c;
  };
})();
