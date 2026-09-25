/* DEPTH UI — 17-van.js: the VAN SEARCH, the one real-time scene. Top-down
 * streets at night around the fix; tap a street and the van drives there
 * along the grid; the signal meter needle and the DF beeper quicken as it
 * closes on the set; tap a building and mark it before the countdown ends. */
var UIVan = (function () {
  var V = {}, sc = null, st = null, cv = null, meterCv = null, raf = 0;
  V.active = function () { return !!st; };
  V.start = function (txId, label, centre) {
    if (UIRx.listening && UIRx.listening()) { UItoast('Finish copying first.'); return; }
    var s = UIA.van(txId, centre);
    if (!s.ok) { UItoast(s.err, { err: true }); return; }
    UIsheet.close();
    sc = s;
    st = { t0: 0, t: 0, pos: [s.start[0], s.start[1]], dir: [0, -1], path: [], sel: null, m: 0, needle: 0, beepAt: 0, done: false, label: label || '?', started: false };
    var box = UI$('#van');
    box.innerHTML = '<div class="van-cv" id="van-cv"></div>' +
      '<div class="van-hud"><div class="van-meter" id="van-meter"></div><div class="van-mid"><span class="engr xs">Van Kestrel-2 · ' + UIesc(st.label) + '</span><div class="van-clock" id="van-clock"></div><span class="van-hint" id="van-hint">Tap a street to drive</span></div>' +
      '<button class="btn sm ghost van-quit" id="van-quit">Give up</button></div>' +
      '<div class="van-foot"><button class="btn pri" id="van-mark" disabled>' + UIICON.target + 'Mark this building</button></div><div class="van-res" id="van-res" hidden></div>';
    box.hidden = false;
    UIAudio.setRx(null);
    cv = UIcanvas(UI$('#van-cv'), draw);
    meterCv = UIcanvas(UI$('#van-meter'), function (x, w, h) { UIPaint.meter(x, w, h, st ? st.needle : 0, { label: 'SIG' }); });
    UIdrag(UI$('#van-cv'), { end: function (p, moved) { if (!moved) tap(p.x, p.y); } });
    UI$('#van-mark').addEventListener('click', mark);
    UI$('#van-quit').addEventListener('click', function () { finish(null, true); });
    UIhist.push('van', function () { finish(null, true); });
    UIExplain.once('van', go);
    if (UIS.explained.van && UI$('#explain').hidden) go();
    function go() { if (!st || st.started) return; st.started = true; st.t0 = performance.now(); UIAudio.cue('engine'); loop(); }
  };
  // scene <-> screen: the scene square fitted to the canvas, a little inset
  function geo() { var w = cv.w, h = cv.h, m = Math.min(w, h - 120) * 0.94; return { s: m, ox: (w - m) / 2, oy: (h - m) / 2 + 20 }; }
  function toS(p) { var g = geo(); return [g.ox + p[0] * g.s, g.oy + p[1] * g.s]; }
  function toW(x, y) { var g = geo(); return [(x - g.ox) / g.s, (y - g.oy) / g.s]; }
  function snap(p) {
    // nearest point on the street grid
    var cx = Math.round(p[0] * sc.cols) / sc.cols, cy = Math.round(p[1] * sc.rows) / sc.rows;
    var a = [cx, UIclamp(p[1], 0, 1)], b = [UIclamp(p[0], 0, 1), cy];
    return Math.abs(p[0] - cx) < Math.abs(p[1] - cy) ? a : b;
  }
  function route(from, to) {
    // along the grid: to the nearest crossing, across in x then y, then along the target street
    var pts = [], onV = Math.abs(from[0] * sc.cols - Math.round(from[0] * sc.cols)) < 1e-3;
    var c1 = onV ? [from[0], Math.round(from[1] * sc.rows) / sc.rows] : [Math.round(from[0] * sc.cols) / sc.cols, from[1]];
    var tV = Math.abs(to[0] * sc.cols - Math.round(to[0] * sc.cols)) < 1e-3;
    var c2 = tV ? [to[0], Math.round(to[1] * sc.rows) / sc.rows] : [Math.round(to[0] * sc.cols) / sc.cols, to[1]];
    // same street: go straight
    if ((onV && tV && Math.abs(from[0] - to[0]) < 1e-3) || (!onV && !tV && Math.abs(from[1] - to[1]) < 1e-3)) return [to];
    pts.push(c1); pts.push([c2[0], c1[1]]); pts.push(c2); pts.push(to);
    return pts.filter(function (p, i) { var q = i ? pts[i - 1] : from; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-4; });
  }
  function tap(x, y) {
    if (!st || st.done) return;
    var w = toW(x, y);
    // a building?
    var best = null, bd = 0.045;
    sc.blocks.forEach(function (b) { b.buildings.forEach(function (q) { var d = Math.hypot(q.x - w[0], q.y - w[1]); if (d < bd) { bd = d; best = q; } }); });
    if (best && Math.hypot(best.x - st.pos[0], best.y - st.pos[1]) < 0.12) { st.sel = best; UIAudio.cue('tap'); UI$('#van-mark').disabled = false; UI$('#van-hint').textContent = 'Building marked — confirm below, or drive on'; return; }
    if (w[0] < -0.05 || w[0] > 1.05 || w[1] < -0.05 || w[1] > 1.05) return;
    var tgt = snap([UIclamp(w[0], 0, 1), UIclamp(w[1], 0, 1)]);
    st.path = route(st.pos, tgt); st.sel = null; UI$('#van-mark').disabled = true;
    UI$('#van-hint').textContent = best ? 'Too far to see — drive closer' : 'Driving…';
    UIAudio.cue('engine');
  }
  function loop() {
    if (!st) return;
    var now = performance.now(), secs = (now - st.t0) / 1000, dt = Math.min(0.1, (now - (st.last || now)) / 1000); st.last = now;
    var left = Math.max(0, sc.seconds - secs);
    // drive
    if (st.path.length && !st.done) {
      var tgt = st.path[0], dx = tgt[0] - st.pos[0], dy = tgt[1] - st.pos[1], d = Math.hypot(dx, dy), sp = 0.16 * dt;
      if (d <= sp) { st.pos = [tgt[0], tgt[1]]; st.path.shift(); if (!st.path.length) UI$('#van-hint').textContent = 'Stopped. Tap a building next to the van to mark it'; }
      else { st.dir = [dx / d, dy / d]; st.pos = [st.pos[0] + dx / d * sp, st.pos[1] + dy / d * sp]; }
    }
    // meter and beeper
    if (!st.mAt || now - st.mAt > 110) { st.mAt = now; st.m = UIA.vanMeter(sc, st.pos[0], st.pos[1], secs); }
    st.needle += (st.m - st.needle) * Math.min(1, dt * 6);
    if (now > st.beepAt && !st.done) { UIAudio.cue(st.m > 0.75 ? 'beephi' : 'beep'); st.beepAt = now + 1500 - 1350 * UIclamp(st.m, 0, 1); }
    UI$('#van-clock').innerHTML = '<span class="led">' + UISeg.html(String(Math.floor(left / 60)) + ':' + String(Math.floor(left % 60)).padStart(2, '0')) + '</span>';
    cv.paint(); meterCv.paint();
    if (left <= 0 && !st.done) { finish([st.pos[0], st.pos[1]], false, true); return; }
    raf = requestAnimationFrame(loop);
  }
  function mark() { if (!st || !st.sel) return; UIAudio.cue('stamp'); finish([st.sel.x, st.sel.y]); }
  function finish(pt, quit, timeout) {
    if (!st || st.done) return;
    st.done = true; cancelAnimationFrame(raf);
    UIhist.drop('van');
    var r = UIA.vanResult(sc, quit ? null : pt);
    var res = UI$('#van-res');
    var head = r.kind === 'exact' ? 'Transmitter located' : r.kind === 'area' ? 'Close — area narrowed' : 'Lost it';
    var b = r.building ? UIA.building(r.building) : null;
    res.innerHTML = '<div class="van-card paper"><span class="eyebrow">' + (timeout ? 'The set went off the air' : 'Van Kestrel-2 reports') + '</span><h3>' + head + '</h3><p>' +
      (r.kind === 'exact' ? 'The crew pinned it to <b>' + UIesc(b ? b.address : 'the building') + '</b>. It is on the map, ready for a watch or a raid.' : r.kind === 'area' ? 'Within a block or two when it stopped. The area is pencilled on the map.' : 'The meter never settled. Try again another night, starting from a tighter fix.') + '</p>' +
      '<button class="btn pri" id="van-close">Back to the map</button></div>';
    res.hidden = false;
    UIAudio.cue(r.kind === 'exact' ? 'win' : 'err');
    UI$('#van-close').addEventListener('click', V.close);
    UI.refresh(); UI.save();
    UI.emit('van', r.kind);
  }
  V.close = function () {
    var box = UI$('#van'); box.hidden = true; box.innerHTML = ''; st = null; sc = null;
    UI.go('map'); UI.act(function () { });
  };
  function draw(x, w, h) {
    x.fillStyle = '#0b0d0e'; x.fillRect(0, 0, w, h);
    var g = geo(), s = g.s;
    // asphalt
    x.fillStyle = '#1a1e21'; x.fillRect(g.ox - 10, g.oy - 10, s + 20, s + 20);
    // blocks: roofs
    sc.blocks.forEach(function (b, i) {
      var p = toS([b.x, b.y]), r = UIrand('blk' + i);
      x.fillStyle = '#23282b'; x.fillRect(p[0], p[1], b.w * s, b.h * s);
      x.fillStyle = 'rgba(255,255,255,.025)'; for (var k = 0; k < 4; k++) x.fillRect(p[0] + r() * b.w * s * 0.7, p[1] + r() * b.h * s * 0.7, b.w * s * 0.3, b.h * s * 0.3);
      // back yards
      x.fillStyle = '#161a1c'; x.fillRect(p[0] + b.w * s * 0.25, p[1] + b.h * s * 0.25, b.w * s * 0.5, b.h * s * 0.5);
      b.buildings.forEach(function (q, j) {
        var c = toS([q.x, q.y]), sz = s * 0.034, sel = st.sel && st.sel.id === q.id;
        x.fillStyle = sel ? '#6b3a2a' : '#2e3438'; x.fillRect(c[0] - sz / 2, c[1] - sz / 2, sz, sz);
        x.strokeStyle = 'rgba(0,0,0,.6)'; x.strokeRect(c[0] - sz / 2 + 0.5, c[1] - sz / 2 + 0.5, sz - 1, sz - 1);
        if (r() < 0.35) { x.fillStyle = 'rgba(255,200,110,' + (0.35 + r() * 0.4) + ')'; x.fillRect(c[0] - sz * 0.2, c[1] - sz * 0.2, sz * 0.18, sz * 0.18); }
        if (sel) { x.strokeStyle = '#ff6a45'; x.lineWidth = 2; x.strokeRect(c[0] - sz / 2 - 3, c[1] - sz / 2 - 3, sz + 6, sz + 6); x.lineWidth = 1; }
      });
    });
    // street lamps at the crossings
    for (var i = 0; i <= sc.cols; i++) for (var j = 0; j <= sc.rows; j++) {
      if ((i + j) % 2) continue;
      var c = toS([i / sc.cols, j / sc.rows]), gl = x.createRadialGradient(c[0], c[1], 0, c[0], c[1], s * 0.06);
      gl.addColorStop(0, 'rgba(255,190,100,.28)'); gl.addColorStop(1, 'rgba(255,190,100,0)'); x.fillStyle = gl; x.fillRect(c[0] - s * 0.06, c[1] - s * 0.06, s * 0.12, s * 0.12);
      x.fillStyle = '#ffd89a'; x.beginPath(); x.arc(c[0], c[1], 1.6, 0, 7); x.fill();
    }
    // street names
    x.font = '600 10px "DX Mono", monospace'; x.fillStyle = 'rgba(200,200,190,.35)'; x.textAlign = 'center';
    sc.streets.forEach(function (st2, k) { if (!st2.name || k % 2) return; var a = toS(st2.a), b = toS(st2.b); x.save(); x.translate((a[0] + b[0]) / 2 + (a[0] === b[0] ? -4 : 0), (a[1] + b[1]) / 2 + (a[1] === b[1] ? -4 : 0)); if (a[0] === b[0]) x.rotate(-Math.PI / 2); x.fillText(st2.name.toUpperCase(), 0, 0); x.restore(); });
    // planned route
    if (st.path.length) { x.setLineDash([3, 5]); x.strokeStyle = 'rgba(255,210,140,.7)'; x.lineWidth = 2; x.beginPath(); var p0 = toS(st.pos); x.moveTo(p0[0], p0[1]); st.path.forEach(function (p) { var q = toS(p); x.lineTo(q[0], q[1]); }); x.stroke(); x.setLineDash([]); }
    // the van with its headlights
    var v = toS(st.pos), a = Math.atan2(st.dir[1], st.dir[0]);
    x.save(); x.translate(v[0], v[1]); x.rotate(a);
    var hl = x.createRadialGradient(10, 0, 2, 40, 0, 60); hl.addColorStop(0, 'rgba(255,245,210,.5)'); hl.addColorStop(1, 'rgba(255,245,210,0)');
    x.fillStyle = hl; x.beginPath(); x.moveTo(8, -4); x.lineTo(70, -26); x.lineTo(70, 26); x.lineTo(8, 4); x.closePath(); x.fill();
    x.fillStyle = '#c9c3b0'; x.fillRect(-10, -6, 20, 12); x.fillStyle = '#6f7a6c'; x.fillRect(-10, -6, 7, 12);
    x.strokeStyle = '#1a1a1a'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(-2, -6); x.lineTo(-2, 6); x.stroke();
    x.fillStyle = '#222'; x.beginPath(); x.arc(-4, 0, 3, 0, 7); x.fill(); // the loop aerial on the roof
    x.strokeStyle = '#d8d2bc'; x.lineWidth = 1; x.beginPath(); x.arc(-4, 0, 3, 0, 7); x.stroke();
    x.restore();
    // vignette
    var vg = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)'); x.fillStyle = vg; x.fillRect(0, 0, w, h);
  }
  return V;
})();
