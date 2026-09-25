/* DEPTH UI — 16-map.js: the MAP. A city plan of Haldmar under the desk lamp
 * with a tracing sheet over it: bearings drawn in red pencil from the
 * outstations as cones, fixes as dashed ellipses, van areas, located
 * buildings, warrant stamps and the target once known. Pan / pinch / wheel;
 * tap a place, building or fix. The van search launches from here. */
var UIMap = (function () {
  var M = {}, root = null, cv = null, view = { x: 0, y: 0, k: 1 }, S = 1, pat = {}, hover = null;
  function helps() { return UIA.helps(); }
  function W2S(p) { return [view.x + p[0] * S * view.k, view.y + p[1] * S * view.k]; }
  function S2W(x, y) { return [(x - view.x) / (S * view.k), (y - view.y) / (S * view.k)]; }
  var KIND = {
    quay: ['Quay', 'q'], cafe: ['Café', 'c'], spot: ['Quiet spot', 's'], phone: ['Telephone kiosk', 't'], signal: ['Signal site', 'g'],
    naval_yard: ['Naval yard', 'L'], fuel_depot: ['Fuel depot', 'L'], station: ['Railway station', 'L'], ferry: ['Ferry terminal', 'L'], lighthouse: ['Lighthouse', 'L'], power: ['Power station', 'L'],
    bridge: ['Bridge', 'L'], customs: ['Customs house', 'L'], radar: ['Radar station', 'L'], hotel: ['Hotel', 'L'], church: ['Church', 'L'], market: ['Market', 'L'], cinema: ['Cinema', 'L'], post: ['Post office', 'L'],
    tram: ['Tram depot', 'L'], park: ['Park', 'L'], gasworks: ['Gasworks', 'L'], hospital: ['Hospital', 'L'], depot: ['Depot', 'L'], yard: ['Yard', 'L'], office: ['Office', 'L'], club: ['Club', 'L'], address: ['Address', 'a']
  };
  M.kindName = function (k) { return (KIND[k] || [UIcap(String(k).replace(/_/g, ' ')), 'L'])[0]; };

  // ------------------------------------------------------------------ build
  M.build = function (r) {
    root = r;
    root.innerHTML = '<div class="map-wrap"><div class="map-cv" id="mp-cv"></div>' +
      '<div class="map-top" data-nogesture><div class="map-chips"><button class="chip" id="mp-trace" aria-pressed="true">' + UIICON.layers + '<span>Tracing sheet</span></button>' +
      '<button class="chip" id="mp-night"><span>All nights</span></button>' + UIExplain.btn('map') + '</div>' +
      '<div class="map-zoom"><button class="ib" data-z="in" aria-label="Zoom in">' + UIICON.plus + '</button><button class="ib" data-z="out" aria-label="Zoom out">' + UIICON.minus + '</button><button class="ib" data-z="fit" aria-label="Whole city">' + UIICON.target + '</button></div></div>' +
      '<div class="map-air" id="mp-air" data-nogesture hidden></div>' +
      '<div class="map-legend" data-nogesture><span><i class="lg-cone"></i>bearing</span><span><i class="lg-fix"></i>fix</span><span><i class="lg-bld"></i>located</span><span><i class="lg-spot"></i>quiet spot</span></div></div>';
    cv = UIcanvas(UI$('#mp-cv'), draw);
    cv.onResize = function () { if (!UIS.map.view || !M._fitted) fit(); };
    UIgesture(UI$('#mp-cv'), view, { min: 0.8, max: 7, onChange: function () { UIS.map.view = { x: view.x, y: view.y, k: view.k, w: cv.w, h: cv.h }; cv.frame(); }, onTap: tap });
    UI$('#mp-trace').addEventListener('click', function () { UIS.map.trace = !UIS.map.trace; UIAudio.cue('paper'); chips(); cv.frame(); });
    UI$('#mp-night').addEventListener('click', function () { UIS.map.tonight = !UIS.map.tonight; UIAudio.cue('tap'); chips(); cv.frame(); });
    root.querySelector('.map-zoom').addEventListener('click', function (e) { var b = e.target.closest('[data-z]'); if (!b) return; UIAudio.cue('tap'); if (b.dataset.z === 'fit') fit(); else zoom(b.dataset.z === 'in' ? 1.4 : 1 / 1.4); });
    UI$('#mp-air').addEventListener('click', onAir);
    chips(); M.refresh();
    UIExplain.once('map');
  };
  M.reset = function () { root = null; cv = null; M._fitted = false; };
  function chips() { var t = UI$('#mp-trace'); t.setAttribute('aria-pressed', String(!!UIS.map.trace)); t.classList.toggle('on', !!UIS.map.trace); var n = UI$('#mp-night'); n.querySelector('span').textContent = UIS.map.tonight ? 'Tonight only' : 'All nights'; n.classList.toggle('on', !!UIS.map.tonight); }
  function fit() {
    if (!cv || !cv.w) return;
    var w = cv.w, h = cv.h, pad = w < 600 ? 10 : 30;
    S = Math.min(w - pad * 2, h - pad * 2 - (w < 600 ? 90 : 40));
    view.k = 1; view.x = (w - S) / 2; view.y = (h - S) / 2 + (w < 600 ? 22 : 10);
    M._fitted = true; cv.frame();
  }
  function zoom(f) { var cx = cv.w / 2, cy = cv.h / 2, k = UIclamp(view.k * f, 0.8, 7), wx = (cx - view.x) / view.k, wy = (cy - view.y) / view.k; view.k = k; view.x = cx - wx * k; view.y = cy - wy * k; cv.frame(); }
  M.refresh = function () { if (!cv) return; if (!M._fitted) fit(); airBanner(); cv.frame(); };
  M.show = function () { if (cv) { cv.resize(); if (!M._fitted) fit(); airBanner(); cv.frame(); } };

  // ------------------------------------------------------------------ what is on the air (DF / van from the map)
  function onAirNow() { return UIA.band().now.filter(function (s) { return !s.bcast; }); }
  function airBanner() {
    var box = UI$('#mp-air'); if (!box) return;
    var list = onAirNow();
    if (!list.length) { box.hidden = true; return; }
    var s = list[0], c = UIA.clock(), left = s.ends !== null ? Math.max(0, s.ends - c.minute) : null, live = UIRx.liveDf[s.id];
    box.hidden = false;
    box.innerHTML = '<span class="air-lamp"></span><span class="air-t"><b>On the air</b>' + UIesc(s.label || 'unknown') + ' · ' + UImhz(s.freq) + ' ' + UImodeName(s.mode) + (left !== null ? ' · ' + left + ' min left' : '') + '</span>' +
      '<button class="btn sm" data-air="df" data-id="' + UIesc(s.id) + '">' + UIICON.df + (live ? 'Again' : 'Bearings') + '</button>' +
      (s.mode !== 'voice' ? '<button class="btn sm pri" data-air="van" data-id="' + UIesc(s.id) + '">' + UIICON.van + 'Van</button>' : '');
  }
  function onAir(e) {
    var b = e.target.closest('[data-air]'); if (!b) return;
    var s = onAirNow().filter(function (x) { return x.id === b.dataset.id; })[0]; if (!s) return;
    if (b.dataset.air === 'df') {
      UIAudio.cue('phone');
      var r = UIA.df(s.id, null);
      if (!r.ok) { UItoast(r.err, { err: true }); return; }
      UIRx.liveDf[s.id] = { bearings: r.bearings, fix: r.fix, callsign: s.label, t: UIA.clock().abs, freq: s.freq };
      UI.act(function () { });
      UItoast(r.bearings.length + ' bearings in.' + (r.fix ? ' The fix is drawn.' : ''), { icon: 'df' });
      if (r.fix) M.focusFix(r.fix);
      UI.emit('df', s.id);
    } else M.sendVan(s);
  }
  /** van for an on-air set: centre on tonight's fix of that set, or the latest fix of the callsign */
  M.sendVan = function (s) {
    var live = UIRx.liveDf[s.id], centre = live && live.fix ? [live.fix.x, live.fix.y] : null;
    if (!centre && s.label) { var cs = UIA.callsigns().filter(function (c) { return c.id === s.label; })[0]; if (cs && cs.fixes.length) { var f = cs.fixes[cs.fixes.length - 1].fix; centre = [f.x, f.y]; } }
    if (!centre) { UItoast('Take bearings first, so the crew know where to start.', { err: true }); return; }
    UIVan.start(s.id, s.label, centre);
  };

  // ------------------------------------------------------------------ data to draw
  function dfs() {
    var c = UIA.clock(), out = [], seen = {};
    Object.keys(UIRx.liveDf).forEach(function (k) { var d = UIRx.liveDf[k]; out.push({ key: 'live' + k, cs: d.callsign, bearings: d.bearings, fix: d.fix, shift: c.shift, label: UIA.hhmm(c.minute), live: true }); seen[k] = 1; });
    UIA.log().forEach(function (e) {
      if (!e.df || seen[e.tx]) return;
      if (UIS.map.tonight && e.shift !== c.shift) return;
      out.push({ key: e.id, log: e.id, cs: e.callsign, bearings: e.df.bearings, fix: e.df.fix, shift: e.shift, label: e.label, live: false });
    });
    return out;
  }
  function selKey() { return UIS.map.sel; }

  // ------------------------------------------------------------------ drawing
  function patt(x, name) {
    if (pat[name]) return pat[name];
    var src = name === 'paper' ? UITex.paper : UITex.trace;
    if (name === 'sea') { var c = document.createElement('canvas'); c.width = 8; c.height = 6; var g = c.getContext('2d'); g.fillStyle = '#c9d5d4'; g.fillRect(0, 0, 8, 6); g.strokeStyle = 'rgba(70,100,120,.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, 3); g.lineTo(8, 3); g.stroke(); src = c; }
    if (name === 'hatch') { var c2 = document.createElement('canvas'); c2.width = 6; c2.height = 6; var g2 = c2.getContext('2d'); g2.strokeStyle = 'rgba(190,40,30,.45)'; g2.lineWidth = 1; g2.beginPath(); g2.moveTo(0, 6); g2.lineTo(6, 0); g2.stroke(); src = c2; }
    if (!src) return null;
    pat[name] = x.createPattern(src, 'repeat');
    return pat[name];
  }
  function path(x, pts, close) { x.beginPath(); pts.forEach(function (p, i) { var q = W2S(p); if (i) x.lineTo(q[0], q[1]); else x.moveTo(q[0], q[1]); }); if (close) x.closePath(); }
  function jitterLine(x, a, b, seed, amp) {
    var r = UIrand(seed), n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 30));
    x.beginPath(); x.moveTo(a[0], a[1]);
    for (var i = 1; i <= n; i++) { var t = i / n; x.lineTo(a[0] + (b[0] - a[0]) * t + (i < n ? (r() - 0.5) * amp : 0), a[1] + (b[1] - a[1]) * t + (i < n ? (r() - 0.5) * amp : 0)); }
    x.stroke();
  }
  function draw(x, w, h) {
    var city = UIA.city(), k = view.k, sc = S * k;
    // the desk under the lamp
    x.fillStyle = '#16140f'; x.fillRect(0, 0, w, h);
    var tl = W2S([-0.04, -0.04]), br = W2S([1.04, 1.04]);
    // the plan: paper with a shadow
    x.save(); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 26; x.shadowOffsetY = 8;
    x.fillStyle = '#e7dfc6'; x.fillRect(tl[0], tl[1], br[0] - tl[0], br[1] - tl[1]); x.restore();
    var pp = patt(x, 'paper'); if (pp) { x.fillStyle = pp; x.fillRect(tl[0], tl[1], br[0] - tl[0], br[1] - tl[1]); }
    x.save(); x.beginPath(); x.rect(tl[0], tl[1], br[0] - tl[0], br[1] - tl[1]); x.clip();
    // sea
    var sea = city.sea || (city.coast ? [[0, 0], [1, 0]].concat(city.coast.slice().reverse()) : null);
    if (sea) { path(x, sea.map(function (p) { return [p[0] === 0 ? -0.1 : p[0] === 1 ? 1.1 : p[0], p[1] === 0 ? -0.1 : p[1]]; }), true); x.fillStyle = patt(x, 'sea') || '#c9d5d4'; x.fill(); }
    if (city.harbour && city.harbour.poly.length > 2) { path(x, city.harbour.poly, true); x.fillStyle = 'rgba(160,185,190,.55)'; x.fill(); }
    // districts
    city.districts.forEach(function (d, i) { if (d.poly.length < 3) return; path(x, d.poly, true); x.fillStyle = i % 2 ? 'rgba(210,196,160,.25)' : 'rgba(225,214,184,.18)'; x.fill(); });
    // coast with water-lining
    if (city.coast) {
      [[7, 0.08], [4.5, 0.12], [2.5, 0.2]].forEach(function (o) { x.save(); x.translate(0, -o[0] * Math.min(2, k)); path(x, city.coast); x.strokeStyle = 'rgba(50,80,100,' + o[1] + ')'; x.lineWidth = 1; x.stroke(); x.restore(); });
      path(x, city.coast); x.strokeStyle = '#3b4a52'; x.lineWidth = 1.8; x.stroke();
    }
    // river
    if (city.river) { path(x, city.river); x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#4c6570'; x.lineWidth = Math.max(4, 0.016 * sc); x.stroke(); x.strokeStyle = '#b9cdd0'; x.lineWidth = Math.max(2.5, 0.016 * sc - 2.4); x.stroke(); }
    // streets
    city.streets.forEach(function (s, i) { path(x, s.line); x.strokeStyle = 'rgba(95,82,58,.7)'; x.lineWidth = Math.max(0.8, 0.0026 * sc); x.lineCap = 'round'; x.lineJoin = 'round'; x.stroke(); });
    // district boundaries and names
    x.setLineDash([5, 4]);
    city.districts.forEach(function (d) { if (d.poly.length < 3) return; path(x, d.poly, true); x.strokeStyle = 'rgba(120,95,60,.45)'; x.lineWidth = 1; x.stroke(); });
    x.setLineDash([]);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    city.districts.forEach(function (d) { var c = W2S(d.centre); x.font = '700 ' + Math.round(UIclamp(9 + k * 2, 9, 17)) + 'px "DX Type", monospace'; x.fillStyle = 'rgba(95,72,40,.55)'; spaced(x, d.name.toUpperCase(), c[0], c[1], 1.5 + k * 0.4); });
    // street names when zoomed
    if (k > 2.2) { x.font = 'italic 400 ' + Math.round(9 + k) + 'px "DX Serif", serif'; x.fillStyle = 'rgba(80,65,45,.7)'; city.streets.forEach(function (s) { if (!s.name || s.line.length < 2) return; var m = Math.floor(s.line.length / 2), a = W2S(s.line[m - 1] || s.line[0]), b = W2S(s.line[m]); var ang = Math.atan2(b[1] - a[1], b[0] - a[0]); if (ang > Math.PI / 2) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI; x.save(); x.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); x.rotate(ang); x.fillText(s.name, 0, -6); x.restore(); }); }
    // places
    city.places.forEach(function (p) { glyph(x, p, k); });
    // outstations
    city.outstations.forEach(function (o) {
      var c = W2S(o.pos); x.fillStyle = '#1d2024'; x.beginPath(); x.moveTo(c[0], c[1] - 8); x.lineTo(c[0] + 7, c[1] + 5); x.lineTo(c[0] - 7, c[1] + 5); x.closePath(); x.fill();
      x.strokeStyle = '#e7dfc6'; x.lineWidth = 1; x.beginPath(); x.moveTo(c[0], c[1] - 3); x.lineTo(c[0], c[1] + 3); x.stroke();
      x.font = '700 11px "DX Type", monospace'; x.fillStyle = '#1d2024'; x.textAlign = c[0] > w / 2 ? 'right' : 'left'; x.fillText(o.name, c[0] + (c[0] > w / 2 ? -10 : 10), c[1] + (c[1] > h / 2 ? -12 : 12));
    });
    x.restore();
    // ---- the tracing sheet
    if (UIS.map.trace) {
      var t1 = W2S([-0.02, -0.02]), t2 = W2S([1.02, 1.02]);
      x.save(); x.fillStyle = 'rgba(248,247,238,.28)'; x.fillRect(t1[0], t1[1], t2[0] - t1[0], t2[1] - t1[1]);
      var tp = patt(x, 'trace'); if (tp) { x.globalAlpha = 0.55; x.fillStyle = tp; x.fillRect(t1[0], t1[1], t2[0] - t1[0], t2[1] - t1[1]); x.globalAlpha = 1; }
      x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1; x.strokeRect(t1[0] + 0.5, t1[1] + 0.5, t2[0] - t1[0], t2[1] - t1[1]);
      // masking tape at the corners
      [[t1[0], t1[1], -35], [t2[0], t1[1], 35], [t1[0], t2[1], 35], [t2[0], t2[1], -35]].forEach(function (q) { x.save(); x.translate(q[0], q[1]); x.rotate(q[2] * Math.PI / 180); x.fillStyle = 'rgba(232,214,160,.85)'; x.fillRect(-20, -7, 40, 14); x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(-20, -7, 40, 3); x.restore(); });
      x.restore();
      pencil(x, w, h, city);
    }
    // the lamp
    var lamp = x.createRadialGradient(w * 0.55, h * 0.3, Math.min(w, h) * 0.1, w * 0.5, h * 0.45, Math.max(w, h) * 0.85);
    lamp.addColorStop(0, 'rgba(255,220,160,.10)'); lamp.addColorStop(0.55, 'rgba(0,0,0,0)'); lamp.addColorStop(1, 'rgba(0,0,0,.55)');
    x.fillStyle = lamp; x.fillRect(0, 0, w, h);
  }
  function spaced(x, t, cx, cy, sp) { var wsum = 0, ws = t.split('').map(function (c) { var m = x.measureText(c).width; wsum += m + sp; return m; }); var px = cx - (wsum - sp) / 2; x.textAlign = 'left'; t.split('').forEach(function (c, i) { x.fillText(c, px, cy); px += ws[i] + sp; }); x.textAlign = 'center'; }
  function glyph(x, p, k) {
    var c = W2S(p.pos), kd = (KIND[p.kind] || ['', 'L'])[1], r = 4 + Math.min(3, k);
    x.save();
    if (kd === 'q') { x.fillStyle = '#2d3d46'; x.fillRect(c[0] - r * 0.7, c[1] - r * 0.4, r * 1.4, r * 0.8); }
    else if (kd === 'c') { x.fillStyle = '#6a4320'; x.beginPath(); x.arc(c[0], c[1], r * 0.62, 0, 7); x.fill(); x.fillStyle = '#e7dfc6'; x.beginPath(); x.arc(c[0], c[1], r * 0.25, 0, 7); x.fill(); }
    else if (kd === 's') { x.strokeStyle = '#5a3a2a'; x.lineWidth = 1.4; x.beginPath(); x.arc(c[0], c[1], r * 0.7, 0, 7); x.stroke(); x.beginPath(); x.moveTo(c[0] - r * 0.4, c[1] - r * 0.4); x.lineTo(c[0] + r * 0.4, c[1] + r * 0.4); x.moveTo(c[0] + r * 0.4, c[1] - r * 0.4); x.lineTo(c[0] - r * 0.4, c[1] + r * 0.4); x.stroke(); }
    else if (kd === 't') { x.fillStyle = '#8a2a1c'; x.fillRect(c[0] - r * 0.35, c[1] - r * 0.7, r * 0.7, r * 1.4); }
    else if (kd === 'g') { x.fillStyle = '#44503a'; x.beginPath(); x.moveTo(c[0], c[1] - r * 0.7); x.lineTo(c[0] + r * 0.6, c[1] + r * 0.5); x.lineTo(c[0] - r * 0.6, c[1] + r * 0.5); x.closePath(); x.fill(); }
    else if (kd === 'a') { x.fillStyle = '#6b6252'; x.fillRect(c[0] - r * 0.35, c[1] - r * 0.35, r * 0.7, r * 0.7); }
    else { x.fillStyle = '#1d2024'; x.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.35 : r * 0.8; x.lineTo(c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr); } x.closePath(); x.fill(); }
    var show = kd === 'L' || kd === 'q' ? k > 0.9 : k > 1.7;
    if (hover === p.id) show = true;
    if (show && !(kd === 'q' && k < 1.6 && !/ 1$| 5$| 9$/.test(p.name))) {
      x.font = (kd === 'L' ? '700 ' : '400 ') + Math.round(UIclamp(9 + k * 0.8, 9, 13)) + 'px "DX Type", monospace'; x.textAlign = 'left'; x.textBaseline = 'middle';
      x.lineWidth = 3; x.strokeStyle = 'rgba(231,223,198,.85)'; x.strokeText(p.name, c[0] + r + 3, c[1]); x.fillStyle = '#26221b'; x.fillText(p.name, c[0] + r + 3, c[1]);
    }
    x.restore();
  }
  function pencil(x, w, h, city) {
    var sel = selKey(), list = dfs(), sc = S * view.k;
    x.save(); x.lineCap = 'round';
    // bearings: cones and lines (selected: red; others: graphite, lighter)
    list.forEach(function (d) {
      var on = sel ? sel === d.key : d.live || list.length <= 2 || d === list[list.length - 1];
      if (!on && !d.fix) return;
      if (!on) return;
      d.bearings.forEach(function (b) {
        var o = city.oById[b.station]; if (!o) return;
        var p0 = W2S(o.pos), L = 1.8 * sc;
        var a1 = UIgeo.dir(b.deg - b.sd * 2), a2 = UIgeo.dir(b.deg + b.sd * 2), a0 = UIgeo.dir(b.deg);
        x.beginPath(); x.moveTo(p0[0], p0[1]); x.lineTo(p0[0] + a1[0] * L, p0[1] + a1[1] * L); x.lineTo(p0[0] + a2[0] * L, p0[1] + a2[1] * L); x.closePath();
        x.fillStyle = 'rgba(191,53,38,.07)'; x.fill(); x.fillStyle = patt(x, 'hatch'); x.globalAlpha = 0.35; x.fill(); x.globalAlpha = 1;
        x.strokeStyle = 'rgba(191,53,38,.35)'; x.lineWidth = 0.8; x.beginPath(); x.moveTo(p0[0], p0[1]); x.lineTo(p0[0] + a1[0] * L, p0[1] + a1[1] * L); x.moveTo(p0[0], p0[1]); x.lineTo(p0[0] + a2[0] * L, p0[1] + a2[1] * L); x.stroke();
        x.strokeStyle = 'rgba(176,40,28,.9)'; x.lineWidth = 1.5; jitterLine(x, p0, [p0[0] + a0[0] * L, p0[1] + a0[1] * L], d.key + b.station, 1.2);
        x.font = '600 15px "DX Hand", cursive'; x.fillStyle = 'rgba(176,40,28,.95)'; x.textAlign = 'center';
        var lp = [p0[0] + a0[0] * 46, p0[1] + a0[1] * 46]; x.fillText(Math.round(b.deg) + '°', lp[0] + 12, lp[1]);
      });
    });
    // fixes
    list.forEach(function (d) {
      if (!d.fix) return;
      var f = d.fix, c = W2S([f.x, f.y]), on = sel ? sel === d.key : true;
      x.save(); x.translate(c[0], c[1]); x.rotate(f.rot * Math.PI / 180);
      x.setLineDash([5, 4]); x.lineWidth = on ? 2.2 : 1.4; x.strokeStyle = on ? 'rgba(176,40,28,.95)' : 'rgba(60,64,70,.65)';
      x.beginPath(); x.ellipse(0, 0, Math.max(6, f.rx * sc), Math.max(4, f.ry * sc), 0, 0, 7); x.stroke(); x.setLineDash([]);
      if (on) { x.fillStyle = 'rgba(191,53,38,.08)'; x.fill(); }
      x.restore();
      x.fillStyle = on ? 'rgba(176,40,28,.95)' : 'rgba(55,58,62,.8)'; x.font = '600 ' + (on ? 18 : 15) + 'px "DX Hand", cursive'; x.textAlign = 'left'; x.textBaseline = 'middle';
      x.fillText((d.cs || '?') + ' · ' + d.label + (d.live ? ' (now)' : ''), c[0] + Math.max(6, f.rx * sc) + 6, c[1] - 4);
    });
    // van areas
    UIA.areas().forEach(function (a) { var c = W2S(a.centre), r = a.r * sc; x.strokeStyle = 'rgba(55,58,62,.8)'; x.lineWidth = 1.3; x.beginPath(); x.arc(c[0], c[1], Math.max(8, r), 0, 7); x.stroke(); x.fillStyle = patt(x, 'hatch'); x.globalAlpha = 0.3; x.fill(); x.globalAlpha = 1; x.font = '600 15px "DX Hand", cursive'; x.fillStyle = 'rgba(55,58,62,.9)'; x.fillText('van: ' + (a.callsign || '?'), c[0] + Math.max(8, r) + 4, c[1]); });
    // the target, once the operation card knows it
    var card = UIA.opCard();
    if (card.where.known && card.where.place) { var tp = UIA.place(card.where.place); if (tp) { var c2 = W2S(tp.pos); x.strokeStyle = 'rgba(176,40,28,.95)'; x.lineWidth = 2.4; for (var i = 0; i < 2; i++) { x.beginPath(); x.ellipse(c2[0] + i, c2[1] - i, 18 + i * 2, 14 + i, -0.2, 0, 6.2); x.stroke(); } x.font = '600 18px "DX Hand", cursive'; x.fillStyle = 'rgba(176,40,28,.95)'; x.fillText('target' + (card.when.known ? ' · ' + card.when.value : ''), c2[0] + 24, c2[1] + 20); } }
    // located buildings
    UIA.buildings().forEach(function (b) {
      var c = W2S(b.pos); x.fillStyle = '#15171a'; x.beginPath(); x.moveTo(c[0] - 6, c[1] + 5); x.lineTo(c[0] - 6, c[1] - 1); x.lineTo(c[0], c[1] - 7); x.lineTo(c[0] + 6, c[1] - 1); x.lineTo(c[0] + 6, c[1] + 5); x.closePath(); x.fill();
      x.font = '700 11px "DX Type", monospace'; x.textAlign = 'left'; x.lineWidth = 3; x.strokeStyle = 'rgba(245,242,230,.9)'; x.strokeText(b.address, c[0] + 9, c[1]); x.fillStyle = '#15171a'; x.fillText(b.address, c[0] + 9, c[1]);
      if (b.raided) { x.strokeStyle = 'rgba(176,40,28,.95)'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(c[0] - 9, c[1] - 9); x.lineTo(c[0] + 9, c[1] + 7); x.moveTo(c[0] + 9, c[1] - 9); x.lineTo(c[0] - 9, c[1] + 7); x.stroke(); }
    });
    // warrant stamps
    UIA.warrants().used.forEach(function (wt, i) {
      var tgt = UIA.place(wt.target) || UIA.building(wt.target); if (!tgt) return;
      var c = W2S(tgt.pos); x.save(); x.translate(c[0] - 8, c[1] + 16 + (i % 2) * 4); x.rotate(-0.12);
      var t = wt.kind === 'stakeout' ? 'STAKE-OUT' : wt.kind.toUpperCase(); x.font = '700 10px "DX Mono", monospace'; var tw = x.measureText(t).width + 8;
      x.strokeStyle = 'rgba(40,70,150,.85)'; x.fillStyle = 'rgba(40,70,150,.9)'; x.lineWidth = 1.5; x.strokeRect(0, 0, tw, 15); x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(t, 4, 8); x.restore();
    });
    x.restore();
  }

  // ------------------------------------------------------------------ taps
  function tap(px, py) {
    var city = UIA.city(), best = null, bd = 22;
    function near(p, what, id) { var c = W2S(p), d = Math.hypot(c[0] - px, c[1] - py); if (d < bd) { bd = d; best = { what: what, id: id }; } }
    UIA.buildings().forEach(function (b) { near(b.pos, 'building', b.id); });
    city.places.forEach(function (p) { near(p.pos, 'place', p.id); });
    if (best) { UIAudio.cue('tap'); if (best.what === 'building') M.buildingSheet(best.id); else M.placeSheet(best.id); return; }
    var w = S2W(px, py), hit = null;
    dfs().forEach(function (d) { if (d.fix && UIgeo.inEllipse(w[0], w[1], d.fix, 1.3)) hit = d; });
    if (hit) { UIAudio.cue('tap'); UIS.map.sel = hit.key; cv.frame(); M.fixSheet(hit); return; }
    var dd = UIA.districtAt(w[0], w[1]);
    if (dd && w[0] > 0 && w[0] < 1 && w[1] > 0 && w[1] < 1) { UIS.map.sel = null; cv.frame(); M.districtSheet(dd.id); }
  }

  // ------------------------------------------------------------------ sheets
  function warrantBtns(target, kinds) {
    var left = UIA.warrants().left, desc = { watch: 'Special Branch watch it tonight: who lives there, who calls.', lift: 'Open a dead drop, photograph what is inside, put it back.', raid: 'Arrest whoever is inside. Needs evidence tying the building to the ring.', stakeout: 'Men in position on a chosen night. Catches the operation if it is here and then.' };
    return '<h4>Warrants · ' + left + ' left</h4><div class="wbtns">' + kinds.map(function (k) { return '<button class="wbtn" data-w="' + k + '" data-t="' + UIesc(target) + '"' + (left <= 0 ? ' disabled' : '') + '>' + UIICON[k === 'stakeout' ? 'stake' : k] + '<span><b>' + (k === 'stakeout' ? 'Stake-out' : UIcap(k)) + '</b><small>' + desc[k] + '</small></span></button>'; }).join('') + '</div>';
  }
  function bindWarrants(b) { b.addEventListener('click', function (e) { var x = e.target.closest('[data-w]'); if (!x) return; UIDesk.warrantForm(x.dataset.w, x.dataset.t); }); }
  M.placeSheet = function (id, o) {
    var p = UIA.place(id); if (!p) { var bl = UIA.building(id); if (bl) M.buildingSheet(id, o); return; }
    var d = UIA.district(p.district), card = UIA.opCard(), isTarget = card.where.known && card.where.place === p.id;
    var kinds = ['watch', 'stakeout']; if (p.kind === 'spot') kinds.splice(1, 0, 'lift');
    UIsheet.open({ push: o && o.push, title: p.name, eyebrow: M.kindName(p.kind) + (d ? ' · ' + UIesc(d.name) : ''), tag: 'place:' + p.id, html:
      (isTarget ? '<p class="stamp-line">The operation’s target</p>' : '') + (p.blurb ? '<p>' + UIesc(UIcap(p.blurb)) + '.</p>' : '') +
      (p.kind === 'spot' ? '<p class="note">Quiet corners like this are where dead drops are left. A lift only makes sense once a decrypt names it.</p>' : '') +
      warrantBtns(p.id, kinds) + '<div class="row gap"><button class="btn sm" data-go="map">' + UIICON.map + 'Show on map</button><button class="btn sm" data-card="where">' + UIICON.pencil + 'Pencil in as WHERE</button></div>',
      mount: function (b) {
        bindWarrants(b);
        b.addEventListener('click', function (e) { var g = e.target.closest('[data-go]'); if (g) { UIsheet.close(); UI.go('map'); M.focus(p.pos, 3); } var c = e.target.closest('[data-card]'); if (c) { UIDesk.pencilCard('where', p.name); UItoast('Pencilled on the operation card: WHERE — ' + p.name + '.'); } });
      } });
  };
  M.buildingSheet = function (id, o) {
    var b = UIA.building(id); if (!b) return;
    var d = UIA.district(b.district);
    UIsheet.open({ push: o && o.push, title: b.address, eyebrow: 'Located building' + (d ? ' · ' + UIesc(d.name) : ''), tag: 'building:' + b.id, html:
      (b.raided ? '<p class="stamp-line">Raided</p>' : '') +
      (b.occupant ? '<dl class="kv"><dt>Occupant</dt><dd>' + UIesc(b.occupant.name || '') + (b.occupant.cover ? ', ' + UIesc(b.occupant.cover) : '') + '</dd></dl>' : '') +
      (b.callsigns.length ? '<dl class="kv"><dt>Callsigns</dt><dd>' + b.callsigns.map(function (c) { return '<span class="lnk r-callsign" data-ref="callsign" data-id="' + UIesc(c) + '">' + UIesc(c) + '</span>'; }).join(', ') + '</dd></dl>' : '') +
      '<h4>Evidence</h4>' + (b.evidence.length ? '<ul class="evid">' + b.evidence.map(function (e) { return '<li><b>' + UIesc(e.kind || '') + '</b> ' + UIesc(e.detail || '') + '</li>'; }).join('') + '</ul>' : '<p class="note">Nothing yet ties this address to the ring.</p>') +
      (b.strong ? '' : '<p class="note">Inspector Lyng wants a transmitter, a meeting or a drop tied to this address before a raid.</p>') +
      warrantBtns(b.id, b.raided ? ['watch'] : ['watch', 'raid']),
      mount: bindWarrants });
  };
  M.districtSheet = function (id) {
    var d = UIA.district(id); if (!d) return;
    var ps = UIA.city().places.filter(function (p) { return p.district === d.id; });
    UIsheet.open({ title: d.name, eyebrow: 'District', tag: 'district:' + id, html: (d.blurb ? '<p>' + UIesc(UIcap(d.blurb)) + '.</p>' : '') + '<h4>Places</h4><div class="plist">' + ps.map(function (p) { return '<button class="li" data-ref="place" data-id="' + UIesc(p.id) + '"><span><b>' + UIesc(p.name) + '</b><small>' + M.kindName(p.kind) + '</small></span></button>'; }).join('') + '</div>' });
  };
  M.fixSheet = function (d) {
    var city = UIA.city(), dist = d.fix ? UIA.districtAt(d.fix.x, d.fix.y) : null;
    var area = d.fix ? Math.round(Math.PI * d.fix.rx * d.fix.ry * 1e4) / 10 : null;
    var inside = d.fix ? UIA.buildings().filter(function (b) { return UIgeo.inEllipse(b.pos[0], b.pos[1], d.fix, 1); }).concat(city.places.filter(function (p) { return UIgeo.inEllipse(p.pos[0], p.pos[1], d.fix, 1); })) : [];
    var onAir = onAirNow().filter(function (s) { return s.label && s.label === d.cs; })[0];
    UIsheet.open({ title: 'Fix: ' + (d.cs || 'unknown set'), eyebrow: 'Night ' + (d.shift + 1) + ' · ' + d.label, tag: 'fix', html:
      '<ul class="brg">' + d.bearings.map(function (b) { return '<li><b>' + UIesc((city.oById[b.station] || { name: b.station }).name) + '</b> ' + b.deg.toFixed(1) + '° ± ' + b.sd.toFixed(1) + '°</li>'; }).join('') + '</ul>' +
      (d.fix ? '<p>The bearings cross in <b>' + UIesc(dist ? dist.name : 'the city') + '</b>. The dashed ellipse is where the set is, 19 times in 20 — about ' + (area < 1 ? 'a few blocks' : area + ' % of the city') + '.</p>' : '<p>Fewer than two bearings: no fix. Ask more outstations next time.</p>') +
      (inside.length ? '<h4>Inside the ellipse</h4><div class="plist">' + inside.slice(0, 8).map(function (p) { return '<button class="li" data-ref="' + (p.address ? 'building' : 'place') + '" data-id="' + UIesc(p.id) + '"><span><b>' + UIesc(p.address || p.name) + '</b><small>' + (p.address ? 'located building' : M.kindName(p.kind)) + '</small></span></button>'; }).join('') + '</div>' : '') +
      '<p class="note">A fix narrows the search to blocks, not an address. Sending the DF van while the set is on the air can find the building.</p>' +
      '<div class="row gap">' + (onAir ? '<button class="btn pri" data-van="' + UIesc(onAir.id) + '">' + UIICON.van + 'Send the van now</button>' : '') + (d.cs ? '<button class="btn sm" data-ref="callsign" data-id="' + UIesc(d.cs) + '">' + UIICON.traffic + d.cs + ' in the traffic book</button>' : '') + '</div>',
      mount: function (b) { b.addEventListener('click', function (e) { var v = e.target.closest('[data-van]'); if (v) { UIsheet.close(); M.sendVan(onAir); } }); } });
  };
  UI.openRefBuilding = function (id) { M.buildingSheet(id, { push: UIsheet.isOpen() }); };

  // ------------------------------------------------------------------ focus helpers
  M.focus = function (p, k) { if (!cv) return; cv.resize(); if (!M._fitted) fit(); k = k || 2.5; view.k = k; view.x = cv.w / 2 - p[0] * S * k; view.y = cv.h / 2 - p[1] * S * k; cv.frame(); };
  M.focusFix = function (f) { if (!f) return; var k = UIclamp(0.35 / Math.max(f.rx, f.ry, 0.02), 1.2, 4.5); UIS.map.sel = null; if (UIS.tab === 'map') M.focus([f.x, f.y], k); };
  M.focusDistrict = function (id) { var d = UIA.district(id); if (d) setTimeout(function () { M.focus(d.centre, 2.4); }, 60); };
  M.focusLog = function (id) { var e = UIA.logEntry(id); if (!e || !e.df) return; UIS.map.sel = e.id; setTimeout(function () { if (e.df.fix) M.focus([e.df.fix.x, e.df.fix.y], 2.2); else if (cv) cv.frame(); }, 60); };
  UI.views.map = M;
  return M;
})();
