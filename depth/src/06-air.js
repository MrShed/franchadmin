/* DEPTH engine — 06-air.js
 * The band (3-12 MHz), propagation, copy quality, direction finding and the DF van.
 *   DX.AIR.strength(world, tx)       0..1 received strength at Kestrel
 *   DX.AIR.noise(world, night, min)  0..1 band noise
 *   DX.AIR.quality(inp, tx, noise)   0..1 copy quality from the receiver mini-game's measured inputs
 *   DX.AIR.copy(world, tx, inp, join) -> {groups, quality, lost, corrupt}
 *   DX.AIR.bearing(world, tx, station) -> {station, deg, sd}
 *   DX.fixFrom(stations, bearings)   -> {x, y, rx, ry, rot} (least squares; 2-sigma ellipse, rot in degrees)
 *   DX.AIR.vanScene(world, tx, centre, secs) / DX.vanMeter(scene, x, y, sec) / DX.AIR.vanJudge(scene, pt)
 * Bearings: degrees clockwise from north; north is up the map (towards the sea, -y).
 */
(function () {
  'use strict';
  var AIR = DX.AIR = {};

  AIR.noise = function (W, night, minute) {
    var k = W.key;
    var weather = 0.12 + 0.18 * DX.u(k, 901, night, 0);                      // per-night static
    var diurnal = 0.06 * Math.sin((minute / 480) * Math.PI * 2 + 1.1);        // evening crackle, quieter after midnight
    var crash = DX.u(k, 902, night, Math.floor(minute / 10)) < 0.1 ? 0.12 : 0; // static crashes
    return DX.round(DX.clamp(weather + diurnal + crash, 0.05, 0.6), 3);
  };

  AIR.strength = function (W, tx) {
    var k = W.key;
    if (tx.fromId === 'ctl') {
      // skywave from abroad: weak before 19:30, best 21:00-01:00, fades before dawn
      var m = tx.minute, sky = m < 90 ? 0.35 + m / 300 : m > 420 ? 0.55 : 0.68;
      return DX.round(DX.clamp(sky + 0.12 * (DX.u(k, 903, tx.night, tx.minute) - 0.5), 0.2, 0.9), 3);
    }
    if (tx.test) return 0.5;
    // local groundwave: set power per sender, a little per-night variation
    var base = 0.55 + 0.3 * DX.u(k, 904, DX.hash(tx.fromId || 'x') & 0xffff, 0);
    return DX.round(DX.clamp(base + 0.1 * (DX.u(k, 905, tx.night, tx.minute) - 0.5) - (tx.mode === 'BURST' ? 0.1 : 0), 0.2, 0.95), 3);
  };

  /** slow carrier drift in kHz per minute (the receiver mini-game makes the player hold it) */
  AIR.drift = function (W, tx) {
    var d = (DX.u(W.key, 906, DX.hash(tx.id) & 0xffff, 0) - 0.5) * (tx.fromId === 'ctl' ? 0.2 : 0.6);
    return DX.round(d, 3);
  };

  /** inp: {freqErr: kHz (abs), modeOk: bool, driftHeld: 0..1}. Missing fields default to a decent operator. */
  AIR.quality = function (inp, strength, noise) {
    inp = inp || {};
    var fe = Math.abs(+inp.freqErr || 0);
    var tuneQ = Math.exp(-Math.pow(fe / 0.45, 2));
    var modeQ = inp.modeOk === false ? 0.35 : 1;
    var dh = inp.driftHeld === undefined ? 0.8 : DX.clamp(+inp.driftHeld, 0, 1);
    var driftQ = 0.55 + 0.45 * dh;
    var snr = strength / (strength + noise);
    var sq = DX.clamp(0.5 + 0.5 * snr / 0.75, 0, 1);
    return DX.round(DX.clamp(tuneQ * modeQ * driftQ * sq, 0, 1), 3);
  };

  /** per-group corruption probability for a quality */
  AIR.pCorrupt = function (G, q, mode) {
    var p = G.garble * 0.6 * Math.pow(1 - q, 1.25) + 0.012;
    if (mode === 'BURST') p += 0.08 * G.garble;
    return DX.clamp(p, 0, 0.97);
  };

  /** copy a transmission. join = minute within shift at which the player started listening. */
  AIR.copy = function (W, tx, groups, inp, join, q) {
    var G = W.G, k = W.key, txi = +tx.id.slice(1);
    var p = AIR.pCorrupt(G, q, tx.mode);
    // groups lost at the start when joining late (voice has a 2.5 minute interval signal before the groups)
    var lead = tx.mode === 'VOICE' ? 2.5 : tx.mode === 'BURST' ? 0 : 1;
    var perGroup = (tx.dur - lead) / Math.max(1, groups.length);
    var lostN = 0;
    if (join > tx.minute) lostN = tx.mode === 'BURST' ? groups.length : DX.clamp(Math.ceil((join - tx.minute - lead) / perGroup), 0, groups.length);
    var out = [], corrupt = 0;
    groups.forEach(function (g, gi) {
      if (gi < lostN) { out.push('?????'); corrupt++; return; }
      var r = DX.u(k, 910, txi, gi);
      if (r >= p) { out.push(g); return; }
      corrupt++;
      // how badly: worse copies lose more digits
      var nBad = 1 + Math.floor(DX.u(k, 911, txi, gi) * (1 + 4 * (1 - q)));
      var chars = g.split(''), order = [0, 1, 2, 3, 4].sort(function (a, b) { return DX.u(k, 912, txi, gi * 5 + a) - DX.u(k, 912, txi, gi * 5 + b); });
      for (var j = 0; j < Math.min(5, nBad); j++) chars[order[j]] = '?';
      out.push(chars.join(''));
    });
    return { groups: out, quality: q, lost: lostN, corrupt: corrupt, p: DX.round(p, 3) };
  };

  // ---------------------------------------------------------------- direction finding
  function bearingDeg(from, to) {
    var dx = to[0] - from[0], dy = to[1] - from[1];
    var d = Math.atan2(dx, -dy) * 180 / Math.PI;
    return (d + 360) % 360;
  }
  DX.bearingDeg = bearingDeg;

  AIR.bearing = function (W, tx, st, heardMin) {
    var G = W.G;
    var dur = Math.max(0.2, heardMin === undefined ? tx.dur : heardMin);
    var strength = AIR.strength(W, tx);
    var sd = st.quality * G.dfSd * (1.6 + 5 / Math.sqrt(dur)) * (1.25 - 0.5 * strength);
    if (tx.mode === 'BURST') sd *= 1.6;
    sd = DX.round(DX.clamp(sd, 1, 25), 1);
    var sti = +st.id.slice(2);
    var err = DX.un(W.key, 920, +tx.id.slice(1), sti) * sd;
    return { station: st.id, deg: DX.round((bearingDeg(st.pos, tx.pos) + err + 360) % 360, 1), sd: sd };
  };

  /** least-squares fix from bearings [{station, deg, sd}] and station list -> ellipse (2 sigma) or null */
  DX.fixFrom = function (stations, bearings) {
    var S = {};
    stations.forEach(function (s) { S[s.id] = s; });
    var bs = bearings.filter(function (b) { return S[b.station]; });
    if (bs.length < 2) return null;
    var p = [0.5, 0.6];
    for (var it = 0; it < 4; it++) {
      var a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
      bs.forEach(function (b) {
        var s = S[b.station].pos, th = b.deg * Math.PI / 180;
        var nx = Math.cos(th), ny = Math.sin(th);   // normal to the bearing line (direction (sin, -cos))
        var dist = it === 0 ? 0.6 : Math.max(0.08, DX.dist(s, p));
        var sdU = (b.sd * Math.PI / 180) * dist;
        var w = 1 / (sdU * sdU);
        var c = nx * s[0] + ny * s[1];
        a11 += w * nx * nx; a12 += w * nx * ny; a22 += w * ny * ny; b1 += w * nx * c; b2 += w * ny * c;
      });
      var det = a11 * a22 - a12 * a12;
      if (Math.abs(det) < 1e-9) return null;
      p = [(a22 * b1 - a12 * b2) / det, (a11 * b2 - a12 * b1) / det];
      var inv = [a22 / det, -a12 / det, a11 / det];
    }
    // covariance eigen-decomposition -> 2-sigma ellipse
    var A = inv[0], B = inv[1], C = inv[2];
    var tr = A + C, dd = Math.sqrt(Math.max(0, (A - C) * (A - C) / 4 + B * B));
    var l1 = tr / 2 + dd, l2 = Math.max(1e-9, tr / 2 - dd);
    var rot = 0.5 * Math.atan2(2 * B, A - C) * 180 / Math.PI;
    return { x: DX.round(p[0], 4), y: DX.round(p[1], 4), rx: DX.round(2 * Math.sqrt(l1), 4), ry: DX.round(2 * Math.sqrt(l2), 4), rot: DX.round(rot, 1) };
  };
  /** is a point inside a fix ellipse (scale k = 1 for the 2-sigma ellipse) */
  DX.inFix = function (fix, pt, k) {
    if (!fix) return false;
    k = k || 1;
    var r = -fix.rot * Math.PI / 180, dx = pt[0] - fix.x, dy = pt[1] - fix.y;
    var u = dx * Math.cos(r) - dy * Math.sin(r), v = dx * Math.sin(r) + dy * Math.cos(r);
    return (u * u) / (fix.rx * fix.rx * k * k) + (v * v) / (fix.ry * fix.ry * k * k) <= 1;
  };

  // ---------------------------------------------------------------- the van
  var VAN_SIZE = 0.16;   // city units covered by a van search scene
  /** scene: a street grid around centre (scene coords 0..1). The transmitter position is hidden in `k`. */
  AIR.vanScene = function (W, tx, centre, seconds, sceneNo) {
    var city = W.city, R = DX.rng(W.seed + '/van/' + tx.id + '/' + sceneNo);
    var cx = DX.clamp(centre[0], VAN_SIZE / 2, 1 - VAN_SIZE / 2), cy = DX.clamp(centre[1], VAN_SIZE / 2 + 0.1, 1 - VAN_SIZE / 2);
    var origin = [cx - VAN_SIZE / 2, cy - VAN_SIZE / 2];
    var cols = 6, rows = 6, streets = [], blocks = [], used = {};
    function sname() { for (var q = 0; q < 30; q++) { var n = R.pick(DX.DATA.STREET_A) + R.pick(DX.DATA.STREET_B); if (!used[n]) { used[n] = 1; return n; } } return 'Tværgade'; }
    for (var i = 0; i <= cols; i++) streets.push({ name: sname(), a: [i / cols, 0], b: [i / cols, 1] });
    for (var j = 0; j <= rows; j++) streets.push({ name: sname(), a: [0, j / rows], b: [1, j / rows] });
    var target = [(tx.pos[0] - origin[0]) / VAN_SIZE, (tx.pos[1] - origin[1]) / VAN_SIZE];
    var bn = 0;
    for (i = 0; i < cols; i++) for (j = 0; j < rows; j++) {
      var bx = i / cols, by = j / rows, w = 1 / cols, h = 1 / rows, bl = { x: DX.round(bx + 0.012, 4), y: DX.round(by + 0.012, 4), w: DX.round(w - 0.024, 4), h: DX.round(h - 0.024, 4), buildings: [] };
      var nb = R.int(4, 6);
      for (var q = 0; q < nb; q++) {
        var side = q % 4, t = (Math.floor(q / 4) + 0.5) / 2 * 0.8 + 0.1 + R.range(-0.05, 0.05);
        var px = side === 0 ? bx + w * t : side === 1 ? bx + w - 0.02 : side === 2 ? bx + w * t : bx + 0.02;
        var py = side === 0 ? by + 0.02 : side === 1 ? by + h * t : side === 2 ? by + h - 0.02 : by + h * t;
        bl.buildings.push({ id: 'v' + (bn++), x: DX.round(px, 4), y: DX.round(py, 4) });
      }
      blocks.push(bl);
    }
    // obfuscate the target so a casual look at the scene does not give it away
    var h = DX.hash('vk' + tx.id + sceneNo), ox = (h % 1000) / 1000, oy = ((h >>> 10) % 1000) / 1000;
    return {
      id: 'V' + sceneNo, tx: tx.id, centre: [DX.round(cx, 4), DX.round(cy, 4)], origin: [DX.round(origin[0], 4), DX.round(origin[1], 4)], size: VAN_SIZE,
      district: DX.cityDistrictAt(city, [cx, cy]), cols: cols, rows: rows, streets: streets, blocks: blocks,
      start: [0.5, 1], seconds: seconds, noise: DX.round(0.05 + 0.08 * W.G.garble, 3),
      k: [DX.round(target[0] + ox, 5), DX.round(target[1] + oy, 5), h]
    };
  };
  function unk(scene) { var h = scene.k[2], ox = (h % 1000) / 1000, oy = ((h >>> 10) % 1000) / 1000; return [scene.k[0] - ox, scene.k[1] - oy]; }
  /** signal meter 0..1 at scene point (x,y) at second sec (noise flickers with time) */
  DX.vanMeter = function (scene, x, y, sec) {
    var t = unk(scene), d = Math.sqrt((x - t[0]) * (x - t[0]) + (y - t[1]) * (y - t[1]));
    var s = 1 / (1 + Math.pow(d / 0.16, 2));
    var n = scene.noise * (DX.u(scene.k[2], Math.floor((sec || 0) * 4), Math.round(x * 50), Math.round(y * 50)) - 0.5) * 2;
    return DX.round(DX.clamp(s + n, 0, 1), 3);
  };
  /** judge where the van stopped: exact (within ~a building), narrowed (within ~a block and a half), or nothing */
  AIR.vanJudge = function (scene, pt) {
    if (!pt) return { kind: 'none' };
    var t = unk(scene), d = Math.sqrt((pt.x - t[0]) * (pt.x - t[0]) + (pt.y - t[1]) * (pt.y - t[1]));
    var inside = t[0] >= 0 && t[0] <= 1 && t[1] >= 0 && t[1] <= 1;
    if (d <= 0.075 && inside) return { kind: 'exact', d: d };
    if (d <= 0.25 && inside) return { kind: 'area', d: d, centre: [scene.origin[0] + pt.x * scene.size, scene.origin[1] + pt.y * scene.size], r: 0.3 * scene.size };
    return { kind: 'none', d: d };
  };
  AIR.VAN_SIZE = VAN_SIZE;
})();
