/* INDEX CASE UI — 16-map.js: the night map of the city.
 * UIMapR is a reusable canvas renderer (map tab, debrief replay, title backdrop);
 * UIMap is the MAP tab with layers, filters, pinch-zoom and place/district sheets. */
var UIMapR = (function () {
  var M = {};
  var sprites = {};
  /** soft additive glow sprite */
  function sprite(key, core, halo, size) {
    if (sprites[key]) return sprites[key];
    var c = document.createElement('canvas'), s = size * 2; c.width = c.height = s;
    var x = c.getContext('2d'), g = x.createRadialGradient(size, size, 0, size, size, size);
    g.addColorStop(0, core); g.addColorStop(0.18, core); g.addColorStop(0.32, halo); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    sprites[key] = c; return c;
  }
  M.RECENCY = [
    { max: 2, core: 'rgba(255,240,220,1)', halo: 'rgba(255,130,70,.55)', r: 1.25, l: 'Last 3 days' },
    { max: 7, core: 'rgba(255,150,90,1)', halo: 'rgba(255,100,50,.4)', r: 1, l: '3–7 days' },
    { max: 14, core: 'rgba(214,82,52,.95)', halo: 'rgba(190,60,40,.28)', r: .85, l: '1–2 weeks' },
    { max: 1e9, core: 'rgba(130,60,50,.8)', halo: 'rgba(110,40,35,.16)', r: .7, l: 'Older' }
  ];
  M.bucket = function (age) { for (var i = 0; i < M.RECENCY.length; i++) if (age <= M.RECENCY[i].max) return i; return 3; };

  /** deterministic decoration for a city: streets, arterials, river, contours */
  M.decor = function (city) {
    if (city._decor) return city._decor;
    var r = UIrand('decor:' + city.name), D = city.districts;
    var ctr = [0, 0]; D.forEach(function (d) { ctr[0] += d.centre[0] / D.length; ctr[1] += d.centre[1] / D.length; });
    var streets = D.map(function (d) {
      var dc = Math.hypot(d.centre[0] - ctr[0], d.centre[1] - ctr[1]);
      var sp = 0.0075 + dc * 0.02 + r() * 0.003, ang = r() * Math.PI, lines = [];
      for (var pass = 0; pass < 2; pass++) {
        var a = ang + pass * (Math.PI / 2 + (r() - .5) * .5), ca = Math.cos(a), sa = Math.sin(a), ext = 0.3;
        for (var o = -ext; o <= ext; o += sp * (pass ? 1.6 : 1)) {
          if (r() < 0.12) continue;
          var mx = d.centre[0] - sa * o, my = d.centre[1] + ca * o, l = ext * (0.6 + r() * .4), wob = (r() - .5) * .006;
          lines.push([mx - ca * l, my - sa * l, mx + ca * l + wob, my + sa * l - wob]);
        }
      }
      return lines;
    });
    // arterials: each centre to its nearest 3
    var art = [], seen = {};
    D.forEach(function (d, i) {
      var ns = D.map(function (e, j) { return { j: j, d: Math.hypot(e.centre[0] - d.centre[0], e.centre[1] - d.centre[1]) }; }).filter(function (x) { return x.j !== i; }).sort(function (a, b) { return a.d - b.d; }).slice(0, 3);
      ns.forEach(function (n) { var k = Math.min(i, n.j) + '-' + Math.max(i, n.j); if (seen[k]) return; seen[k] = 1; var e = D[n.j]; var mx = (d.centre[0] + e.centre[0]) / 2 + (r() - .5) * .04, my = (d.centre[1] + e.centre[1]) / 2 + (r() - .5) * .04; art.push([d.centre[0], d.centre[1], mx, my, e.centre[0], e.centre[1]]); });
    });
    // radial roads out of the city
    for (var k = 0; k < 6; k++) { var a = k / 6 * Math.PI * 2 + r(); art.push([ctr[0], ctr[1], ctr[0] + Math.cos(a) * .3, ctr[1] + Math.sin(a) * .3, ctr[0] + Math.cos(a + (r() - .5) * .3) * .75, ctr[1] + Math.sin(a + (r() - .5) * .3) * .75]); }
    // river: a meander through the city
    var river = null;
    if (!city.rivers) {
      var ra = r() * Math.PI, pts = [];
      for (var t = -0.75; t <= 0.75; t += 0.05) { var off = Math.sin(t * 7 + r() * .4) * .035 + Math.sin(t * 3.1) * .05; pts.push([ctr[0] + Math.cos(ra) * t - Math.sin(ra) * off, ctr[1] + Math.sin(ra) * t + Math.cos(ra) * off]); }
      river = pts;
    } else river = city.rivers[0] || city.rivers;
    var contours = []; for (var c = 0; c < 9; c++) { var rad = 0.5 + c * 0.07, pts2 = []; for (var q = 0; q <= 64; q++) { var aa = q / 64 * Math.PI * 2; var rr = rad + Math.sin(aa * 3 + c) * 0.02 + Math.sin(aa * 7 + c * 2) * 0.01; pts2.push([ctr[0] + Math.cos(aa) * rr, ctr[1] + Math.sin(aa) * rr * .95]); } contours.push(pts2); }
    city._decor = { streets: streets, art: art, river: river, contours: contours, ctr: ctr };
    return city._decor;
  };

  /** world->screen transform for a viewport */
  M.xf = function (w, h, view) {
    var base = Math.min(w, h * 1.05) * 0.98;
    var ox = (w - base) / 2, oy = (h - base) / 2;
    return { s: base * view.k, x: ox * view.k + view.x, y: oy * view.k + view.y, base: base, ox: ox, oy: oy };
  };
  function tx(T, p) { return [T.x + p[0] * T.s, T.y + p[1] * T.s]; }
  M.toScreen = function (T, p) { return tx(T, p); };
  M.toWorld = function (T, x, y) { return [(x - T.x) / T.s, (y - T.y) / T.s]; };
  function poly(ctx, T, pts) { ctx.beginPath(); pts.forEach(function (p, i) { var q = tx(T, p); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath(); }
  M.inPoly = function (x, y, pts) { var c = false; for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) { var a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  /** stable position for a person inside their district */
  M.homePos = function (city, pid, did, pos) {
    if (pos && pos.length === 2) return pos;
    city._hp = city._hp || {};
    if (city._hp[pid]) return city._hp[pid];
    var d = city.dById[did] || city.districts[UIh(pid) % city.districts.length];
    var r = UIrand('home:' + pid), p = d.centre;
    if (d.poly && d.poly.length > 2) {
      var xs = d.poly.map(function (q) { return q[0]; }), ys = d.poly.map(function (q) { return q[1]; });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      for (var i = 0; i < 40; i++) { var x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0); if (M.inPoly(x, y, d.poly)) { var dx = x - d.centre[0], dy = y - d.centre[1]; p = [d.centre[0] + dx * .86, d.centre[1] + dy * .86]; break; } }
    }
    city._hp[pid] = p; return p;
  };

  /** draw the base map. o: {city, view, sel (district id), ww: {id: 0..1}, labels, dim} */
  M.base = function (ctx, w, h, o) {
    var city = o.city, T = M.xf(w, h, o.view), dec = M.decor(city), D = city.districts;
    var g = ctx.createRadialGradient(w * .5, h * .42, 0, w * .5, h * .5, Math.max(w, h) * .8);
    g.addColorStop(0, '#0b1520'); g.addColorStop(1, '#03060a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // contours beyond the city
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(143,203,255,.04)';
    dec.contours.forEach(function (c) { ctx.beginPath(); c.forEach(function (p, i) { var q = tx(T, p); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.stroke(); });
    // arterials outside (under districts)
    ctx.strokeStyle = 'rgba(143,203,255,.07)'; ctx.lineWidth = 1.2;
    dec.art.forEach(function (a) { var p0 = tx(T, [a[0], a[1]]), p1 = tx(T, [a[2], a[3]]), p2 = tx(T, [a[4], a[5]]); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); ctx.stroke(); });
    // district land
    D.forEach(function (d) {
      if (!d.poly || d.poly.length < 3) return;
      poly(ctx, T, d.poly);
      var c = tx(T, d.centre), gg = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], T.s * 0.2);
      gg.addColorStop(0, o.sel === d.id ? 'rgba(40,64,88,.95)' : 'rgba(22,36,50,.92)'); gg.addColorStop(1, o.sel === d.id ? 'rgba(26,44,62,.95)' : 'rgba(12,21,30,.92)');
      ctx.fillStyle = gg; ctx.fill();
    });
    // streets, clipped per district
    var sw = Math.max(0.5, Math.min(1.1, T.s / 900));
    D.forEach(function (d, i) {
      if (!d.poly || d.poly.length < 3) return;
      ctx.save(); poly(ctx, T, d.poly); ctx.clip();
      ctx.strokeStyle = 'rgba(143,203,255,' + (0.05 + Math.min(0.06, T.s / 30000)) + ')'; ctx.lineWidth = sw;
      ctx.beginPath();
      dec.streets[i].forEach(function (l) { var a = tx(T, [l[0], l[1]]), b = tx(T, [l[2], l[3]]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); });
      ctx.stroke();
      ctx.restore();
    });
    // wastewater heat
    if (o.ww) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      D.forEach(function (d) {
        var v = o.ww[d.id]; if (!v || !d.poly || d.poly.length < 3) return;
        ctx.save(); poly(ctx, T, d.poly); ctx.clip();
        var c = tx(T, d.centre), rad = T.s * (0.1 + 0.12 * v), gg = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], rad);
        gg.addColorStop(0, 'rgba(150,120,255,' + (0.12 + 0.5 * v).toFixed(3) + ')'); gg.addColorStop(1, 'rgba(90,70,200,0)');
        ctx.fillStyle = gg; ctx.fillRect(c[0] - rad, c[1] - rad, rad * 2, rad * 2);
        ctx.restore();
      });
      ctx.restore();
    }
    // river
    if (dec.river && dec.river.length > 1) {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      function rv(wd, st) { ctx.beginPath(); dec.river.forEach(function (p, i) { var q = tx(T, p); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.lineWidth = wd; ctx.strokeStyle = st; ctx.stroke(); }
      rv(Math.max(4, T.s * 0.016), 'rgba(4,9,15,.95)'); rv(Math.max(2.5, T.s * 0.011), 'rgba(18,40,62,.95)'); rv(1, 'rgba(120,180,240,.18)');
      ctx.restore();
    }
    // arterials within the city, brighter
    ctx.strokeStyle = 'rgba(160,210,255,.13)'; ctx.lineWidth = Math.max(1, sw * 1.6);
    dec.art.forEach(function (a) { var p0 = tx(T, [a[0], a[1]]), p1 = tx(T, [a[2], a[3]]), p2 = tx(T, [a[4], a[5]]); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); ctx.stroke(); });
    // borders
    ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(143,203,255,.16)';
    D.forEach(function (d) { if (d.poly && d.poly.length > 2) { poly(ctx, T, d.poly); ctx.stroke(); } });
    ctx.setLineDash([]);
    if (o.sel && city.dById[o.sel]) { var sd = city.dById[o.sel]; poly(ctx, T, sd.poly); ctx.strokeStyle = 'rgba(197,228,255,.7)'; ctx.lineWidth = 1.6; ctx.shadowColor = 'rgba(143,203,255,.8)'; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0; }
    return T;
  };
  M.labels = function (ctx, T, city, o) {
    o = o || {};
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var fs = UIclamp(T.s / 70, 8.5, 13);
    ctx.font = '600 ' + fs.toFixed(1) + 'px ' + getComputedStyle(document.body).getPropertyValue('--f-mono');
    city.districts.forEach(function (d) {
      var c = tx(T, d.centre), txt = d.name.toUpperCase().split('').join(' ');
      ctx.fillStyle = 'rgba(3,6,10,.7)'; ctx.fillText(txt, c[0] + 1, c[1] + 1);
      ctx.fillStyle = o.sel === d.id ? 'rgba(220,238,255,.95)' : 'rgba(164,190,214,.55)'; ctx.fillText(txt, c[0], c[1]);
      if (o.counts && o.counts[d.id] && T.s > 500) { ctx.font = '600 ' + (fs * .9).toFixed(1) + 'px ' + getComputedStyle(document.body).getPropertyValue('--f-mono'); ctx.fillStyle = 'rgba(255,164,119,.8)'; ctx.fillText(o.counts[d.id] + ' cases', c[0], c[1] + fs * 1.3); ctx.font = '600 ' + fs.toFixed(1) + 'px ' + getComputedStyle(document.body).getPropertyValue('--f-mono'); }
    });
  };
  /** glowing dots: pts [{p:[x,y], b: bucket, big}] */
  M.dots = function (ctx, T, pts, o) {
    o = o || {};
    var sz = UIclamp(T.s / 110, 3.2, 9) * (o.scale || 1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (var i = pts.length - 1; i >= 0; i--) {
      var q = pts[i], R = M.RECENCY[q.b], sp = sprite('d' + q.b, R.core, R.halo, 32), s = sz * R.r * (q.big ? 1.4 : 1) * 3.2, c = tx(T, q.p);
      ctx.globalAlpha = q.a === undefined ? 1 : q.a;
      ctx.drawImage(sp, c[0] - s, c[1] - s, s * 2, s * 2);
    }
    ctx.restore(); ctx.globalAlpha = 1;
  };

  /** decorative city for the title screen */
  M.fakeCity = function (seed) {
    var r = UIrand('title:' + seed), hull = [], n = 13, pts = [];
    for (var k = 0; k < 22; k++) { var a = k / 22 * Math.PI * 2, rr = 0.42 + r() * 0.06; hull.push([0.5 + Math.cos(a) * rr, 0.5 + Math.sin(a) * rr * .9]); }
    for (var i = 0; i < n; i++) { var ang = i / (n - 1) * Math.PI * 4 + r(), rad = i ? 0.1 + 0.25 * Math.sqrt(i / n) : 0.02; pts.push([0.5 + Math.cos(ang) * rad, 0.5 + Math.sin(ang) * rad * .9]); }
    var polys = pts.map(function (p, i) {
      var pl = hull.slice();
      pts.forEach(function (q, j) { if (i === j) return; var mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, nx = q[0] - p[0], ny = q[1] - p[1], out = []; for (var k = 0; k < pl.length; k++) { var a = pl[k], b = pl[(k + 1) % pl.length], da = (a[0] - mx) * nx + (a[1] - my) * ny, db = (b[0] - mx) * nx + (b[1] - my) * ny; if (da <= 0) out.push(a); if ((da <= 0) !== (db <= 0)) { var t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } } pl = out; });
      return pl;
    });
    var ds = pts.map(function (p, i) { return { id: 'd' + i, name: '', centre: p, poly: polys[i] }; }), by = {};
    ds.forEach(function (d) { by[d.id] = d; });
    return { name: 'title' + seed, districts: ds, dById: by, places: [] };
  };
  return M;
})();

var UIMap = UI.views.map = {
  build: function (root) {
    var self = this;
    root.innerHTML = '<div class="mp" id="mp"><div class="mp-cv" id="mp-cv"></div>' +
      '<div class="mp-top"><div class="chips" id="mp-layers"></div><div class="mp-rec seg" id="mp-rec"><button data-r="7">7 days</button><button data-r="14">14 days</button><button data-r="0">All</button></div></div>' +
      '<div class="mp-stat" id="mp-stat"></div>' +
      '<div class="mp-legend" id="mp-legend"></div>' +
      '<div class="mp-zoom" data-nogesture><button data-z="in" aria-label="Zoom in">' + UIICON.plus + '</button><button data-z="out" aria-label="Zoom out">' + UIICON.minus + '</button><button data-z="fit" aria-label="Fit city">' + UIICON.fit + '</button></div></div>';
    var st = UIS.map;
    if (!st.view) st.view = { x: 0, y: 0, k: 1 };
    this.cv = UIcanvas(UI$('#mp-cv'), function (ctx, w, h) { self.draw(ctx, w, h); });
    this.g = UIgesture(UI$('#mp-cv'), st.view, { min: 0.7, max: 14, onChange: function () { self.cv.frame(); self.sel = self.sel; }, onTap: function (x, y) { self.tap(x, y); }, onDouble: function (x, y) { self.g.zoomAt(x, y, 1.8); } });
    UI$('#mp .mp-zoom').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; UIAudio.cue('tap');
      var cv = self.cv; if (b.dataset.z === 'fit') { st.view.x = 0; st.view.y = 0; st.view.k = 1; self.cv.frame(); return; }
      self.g.zoomAt(cv.w / 2, cv.h / 2, b.dataset.z === 'in' ? 1.5 : 1 / 1.5);
    });
    UI$('#mp-rec').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.recency = +b.dataset.r; self.chrome(); self.cv.frame(); UI.save(); });
    UI$('#mp-layers').addEventListener('click', function (e) { var b = e.target.closest('[data-l]'); if (!b) return; st.layers[b.dataset.l] = !st.layers[b.dataset.l]; UIAudio.cue('tap'); self.chrome(); self.cv.frame(); UI.save(); });
    this.anim();
  },
  show: function () { this.data(); this.chrome(); this.cv.resize(); this.cv.frame(); },
  refresh: function () { this.data(); this.chrome(); this.cv.frame(); },
  data: function () {
    var city = UIA.city(), day = UIA.day(), cases = UIA.cases();
    var counts = {};
    this.pts = cases.filter(function (c) { return c.status !== 'negative' && c.status !== 'contact'; }).map(function (c) {
      var ref = c.onset !== null ? c.onset : c.reported, age = day - (ref === null ? day : ref);
      counts[c.district] = (counts[c.district] || 0) + 1;
      return { c: c, p: UIMapR.homePos(city, c.pid, c.district, c.pos), age: age, b: UIMapR.bucket(age), big: c.reported === day, died: c.status === 'died' };
    });
    this.counts = counts;
    var ww = UIA.ww(), wv = {}, mx = 0;
    Object.keys(ww.byDistrict).forEach(function (k) { var a = ww.byDistrict[k], v = null; for (var i = a.length - 1; i >= 0 && i >= a.length - 3; i--) if (a[i] !== null) { v = a[i]; break; } wv[k] = v || 0; mx = Math.max(mx, v || 0); });
    Object.keys(wv).forEach(function (k) { wv[k] = mx ? wv[k] / mx : 0; });
    this.wv = wv; this.hasWW = mx > 0;
    this.clusters = UIA.clusters();
  },
  chrome: function () {
    var st = UIS.map, L = [['cases', 'Cases', 'var(--ember)'], ['clusters', 'Clusters', 'var(--hot)'], ['venues', 'Venues', 'var(--teal)'], ['ww', 'Wastewater', 'var(--violet)']];
    UI$('#mp-layers').innerHTML = L.map(function (l) { return '<button class="chip' + (st.layers[l[0]] ? ' on' : '') + '" data-l="' + l[0] + '"><span class="sw" style="background:' + l[2] + ';box-shadow:0 0 8px ' + l[2] + '"></span>' + l[1] + '</button>'; }).join('');
    UI$$('#mp-rec button').forEach(function (b) { b.classList.toggle('on', +b.dataset.r === st.recency); });
    UI$('#mp-rec').hidden = !st.layers.cases;
    var shown = this.visiblePts().length, cl = this.clusters.length;
    UI$('#mp-stat').innerHTML = '<b>' + UIesc(UIA.city().name) + '</b><span>' + UIfmt.n(UIA.city().pop) + ' people · ' + UIfmt.plural(shown, 'case') + ' shown' + (cl ? ' · ' + UIfmt.plural(cl, 'cluster') : '') + '</span>';
    var leg = '';
    if (st.layers.cases) leg += '<div class="lg-row">' + UIMapR.RECENCY.map(function (R, i) { return '<span><i style="background:' + R.core + ';box-shadow:0 0 8px ' + R.halo + '"></i>' + (i === 0 ? 'Onset ≤2d' : i === 1 ? '≤7d' : i === 2 ? '≤14d' : 'older') + '</span>'; }).join('') + '</div>';
    if (st.layers.ww) leg += '<div class="lg-row"><span class="lg-grad"></span><span>Wastewater: low → high</span></div>';
    UI$('#mp-legend').innerHTML = leg; UI$('#mp-legend').hidden = !leg;
  },
  visiblePts: function () {
    var st = UIS.map; if (!st.layers.cases || !this.pts) return [];
    return this.pts.filter(function (q) { return !st.recency || q.age < st.recency; });
  },
  draw: function (ctx, w, h) {
    var st = UIS.map, city = UIA.city();
    var T = UIMapR.base(ctx, w, h, { city: city, view: st.view, sel: this.sel, ww: st.layers.ww ? this.wv : null });
    this.T = T;
    var t = (performance.now() / 1000);
    // venues
    if (st.layers.venues) {
      ctx.save();
      var vs = UIclamp(T.s / 70, 7, 13);
      city.places.forEach(function (p) {
        if (!p.pos) return; var q = UIMapR.toScreen(T, p.pos);
        ctx.fillStyle = 'rgba(8,20,22,.85)'; ctx.strokeStyle = 'rgba(63,208,170,.75)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(q[0], q[1] - vs); ctx.lineTo(q[0] + vs, q[1]); ctx.lineTo(q[0], q[1] + vs); ctx.lineTo(q[0] - vs, q[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#8ce8cf'; ctx.font = '700 ' + (vs * .9).toFixed(1) + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(UIplaceKind(p.kind)[1].charAt(0), q[0], q[1] + .5);
        if (T.s > 1100) { ctx.font = '600 10px system-ui,sans-serif'; ctx.fillStyle = 'rgba(140,232,207,.75)'; ctx.textAlign = 'left'; ctx.fillText(p.name, q[0] + vs + 4, q[1]); }
      });
      ctx.restore();
    }
    UIMapR.labels(ctx, T, city, { sel: this.sel, counts: this.counts });
    // clusters
    if (st.layers.clusters && this.clusters) {
      this.clusters.forEach(function (c, i) {
        if (!c.pos) return; var q = UIMapR.toScreen(T, c.pos), rad = UIclamp(T.s / 60, 10, 30) * (0.8 + Math.sqrt(c.size) * .25), ph = (t * .6 + i * .37) % 1;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,224,194,' + (0.5 * (1 - ph)).toFixed(3) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(q[0], q[1], rad * (1 + ph * .7), 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([4, 3]); ctx.strokeStyle = 'rgba(255,224,194,.85)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(q[0], q[1], rad, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        var lbl = c.name + ' · ' + c.size; ctx.font = '600 11px system-ui,sans-serif'; var tw = ctx.measureText(lbl).width;
        ctx.fillStyle = 'rgba(20,12,8,.85)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(q[0] - tw / 2 - 7, q[1] - rad - 24, tw + 14, 19, 9.5); else ctx.rect(q[0] - tw / 2 - 7, q[1] - rad - 24, tw + 14, 19); ctx.fill();
        ctx.strokeStyle = 'rgba(255,164,119,.5)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#ffe0c2'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lbl, q[0], q[1] - rad - 14.5);
        ctx.restore();
      });
    }
    // cases
    var vp = this.visiblePts();
    UIMapR.dots(ctx, T, vp);
    ctx.save();
    vp.forEach(function (q) {
      var c = UIMapR.toScreen(T, q.p);
      if (q.died) { ctx.strokeStyle = 'rgba(217,211,199,.75)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(c[0], c[1], UIclamp(T.s / 120, 3, 7) + 2, 0, Math.PI * 2); ctx.stroke(); }
      if (q.big) { var ph = (t * .8 + (UIh(q.c.pid) % 100) / 100) % 1; ctx.strokeStyle = 'rgba(255,200,160,' + (0.6 * (1 - ph)).toFixed(3) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(c[0], c[1], 4 + ph * 16, 0, Math.PI * 2); ctx.stroke(); }
    });
    if (this.hl) { var hp = UIMapR.toScreen(T, this.hl); ctx.strokeStyle = '#c5e4ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hp[0], hp[1], 12, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  },
  anim: function () {
    if (this._anim) return; this._anim = true;
    var self = this, last = 0;
    function loop(ts) {
      requestAnimationFrame(loop);
      if (document.hidden || !UIS || UIS.tab !== 'map' || UI$('#game').hidden) return;
      if (ts - last < 50) return; last = ts;
      var any = (UIS.map.layers.clusters && self.clusters && self.clusters.length) || (self.pts && self.pts.some(function (q) { return q.big; }));
      if (any) self.cv.frame();
    }
    requestAnimationFrame(loop);
  },
  tap: function (x, y) {
    var T = this.T, st = UIS.map, best = null, bd = 20, city = UIA.city();
    this.visiblePts().forEach(function (q) { var c = UIMapR.toScreen(T, q.p), d = Math.hypot(c[0] - x, c[1] - y); if (d < bd) { bd = d; best = { t: 'case', id: q.c.pid }; } });
    if (st.layers.clusters) (this.clusters || []).forEach(function (c) { if (!c.pos) return; var q = UIMapR.toScreen(T, c.pos), d = Math.hypot(q[0] - x, q[1] - y); if (d < bd + 4) { bd = d; best = { t: 'cluster', id: c.id }; } });
    if (st.layers.venues) city.places.forEach(function (p) { if (!p.pos) return; var q = UIMapR.toScreen(T, p.pos), d = Math.hypot(q[0] - x, q[1] - y); if (d < bd) { bd = d; best = { t: 'place', id: p.id }; } });
    if (best) {
      // several cases stacked at one spot: list them
      if (best.t === 'case') {
        var near = this.visiblePts().filter(function (q) { var c = UIMapR.toScreen(T, q.p); return Math.hypot(c[0] - x, c[1] - y) < 16; });
        if (near.length > 1) { this.pickSheet(near.map(function (q) { return q.c; })); return; }
      }
      UI.openRef(best.t, best.id); return;
    }
    var w = UIMapR.toWorld(T, x, y), hit = city.districts.filter(function (d) { return d.poly && UIMapR.inPoly(w[0], w[1], d.poly); })[0];
    if (hit) { this.sel = hit.id; this.cv.frame(); this.districtSheet(hit.id); }
  },
  pickSheet: function (cs) {
    UIsheet.open({ eyebrow: 'Same spot on the map', title: UIfmt.plural(cs.length, 'case'), html: '<div class="list">' + cs.map(function (c) { return UIli({ attrs: 'data-ref="person" data-id="' + UIesc(c.pid) + '"', ic: '<span class="mini-face">' + UIPortrait.svg(c) + '</span>', icStyle: 'background:none;padding:0;overflow:hidden', label: UIesc(c.name), small: UIfmt.age(c) + ' · ' + UIstatus(c.status).l }); }).join('') + '</div>' });
  },
  /** place / venue sheet */
  placeSheet: function (id, o) {
    o = o || {};
    var p = UIA.place(id); if (!p) { UItoast('Unknown place'); return; }
    var self = this, K = UIplaceKind(p.kind), d = UIA.district(p.district);
    var cl = UIA.clusters().filter(function (c) { return c.place === p.id; })[0];
    var acts = UIA.actions().filter(function (a) { return a.target === 'place' || a.target === 'venue'; });
    var ords = UIA.orders().filter(function (x) { return String(x.target) === p.id; });
    var html = '<div class="pl-head"><span class="pl-glyph">' + UIesc(K[1]) + '</span><div><b>' + UIesc(K[0]) + '</b><span>' + (d ? '<span class="lnk dt" data-ref="district" data-id="' + UIesc(d.id) + '">' + UIesc(d.name) + '</span>' : '') + (p.size ? ' · about ' + UIfmt.n(p.size) + ' people a week' : '') + '</span></div></div>';
    if (cl) html += '<div class="eyebrow sh-sec">Cluster · ' + UIfmt.plural(cl.size, 'linked case') + '</div><div class="list">' + cl.cases.map(function (pid) { var c = UIA.caseOf(pid) || { pid: pid, name: pid, status: 'contact' }; return UIli({ attrs: 'data-ref="person" data-id="' + UIesc(pid) + '"', ic: '<span class="mini-face">' + UIPortrait.svg(c) + '</span>', icStyle: 'background:none;padding:0;overflow:hidden', label: UIesc(c.name), small: UIfmt.age(c) + ' · <span class="pill ' + UIstatus(c.status).c + '">' + UIstatus(c.status).l + '</span>' }); }).join('') + '</div>';
    else html += '<p class="note" style="margin-top:12px">No cluster linked to this place yet. Interviews that mention it will link cases here.</p>';
    if (ords.length) html += '<div class="eyebrow sh-sec">Orders in force</div><div class="list">' + ords.map(function (x) { return UIli({ attrs: 'data-go="actions"', ic: UIICON.shield, label: UIesc(x.label), small: 'Since ' + UIesc(UIA.dateLabel(x.since)) }); }).join('') + '</div>';
    html += UIActions.targetActionsHTML(acts, p.id);
    UIsheet.open({ eyebrow: 'Place', title: p.name, push: o.push, tag: 'place', html: html, reopen: function () { self.placeSheet(id, { push: false }); },
      mount: function (b) { UIActions.bindTargetActions(b, p.id, 'place'); b.addEventListener('click', function (e) { if (e.target.closest('[data-go]')) { UIsheet.close(); UI.go('actions'); } }); } });
  },
  districtSheet: function (id, o) {
    o = o || {};
    var d = UIA.district(id); if (!d) return;
    var self = this, day = UIA.day(), cs = UIA.cases().filter(function (c) { return c.district === d.id; });
    var wk = cs.filter(function (c) { return c.reported !== null && day - c.reported < 7; }).length;
    var ww = UIA.ww().byDistrict[d.id] || [], tr = UIA.res().trust.byDistrict[d.id];
    var places = UIA.city().places.filter(function (p) { return p.district === d.id; });
    var acts = UIA.actions().filter(function (a) { return a.target === 'district'; });
    var html = '<div class="grid2"><div class="stat"><b>' + UIfmt.n(d.pop) + '</b><span>residents</span></div><div class="stat"><b style="color:var(--ember)">' + cs.length + '</b><span>known cases · ' + wk + ' this week</span></div>' +
      (tr !== undefined ? '<div class="stat"><b style="color:' + (tr < .4 ? 'var(--red)' : 'var(--ice)') + '">' + Math.round(tr * 100) + '</b><span>trust in the response</span></div>' : '') +
      '<div class="stat"><b style="color:var(--violet)">' + (ww.length ? UIfmt.n(ww[ww.length - 1]) : '—') + '</b><span>wastewater signal</span></div></div>';
    if (ww.length > 1) html += '<div class="eyebrow sh-sec">Wastewater, last ' + Math.min(28, ww.length) + ' days</div><div class="ww-big">' + UIChart.spark(ww.slice(-28).map(function (v) { return v || 0; }), Math.min(520, window.innerWidth - 40), 60, '#a592ff', { id: d.id }) + '</div>';
    if (places.length) html += '<div class="eyebrow sh-sec">Places here</div><div class="list">' + places.map(function (p) { return UIli({ attrs: 'data-ref="place" data-id="' + UIesc(p.id) + '"', ic: '<b style="font:700 13px var(--f-mono)">' + UIesc(UIplaceKind(p.kind)[1]) + '</b>', icStyle: 'color:var(--teal2);background:rgba(63,208,170,.1)', label: UIesc(p.name), small: UIesc(UIplaceKind(p.kind)[0]) }); }).join('') + '</div>';
    if (cs.length) html += '<div class="eyebrow sh-sec">Latest cases</div><div class="list">' + cs.slice().sort(function (a, b) { return (b.reported || 0) - (a.reported || 0); }).slice(0, 6).map(function (c) { return UIli({ attrs: 'data-ref="person" data-id="' + UIesc(c.pid) + '"', ic: '<span class="mini-face">' + UIPortrait.svg(c) + '</span>', icStyle: 'background:none;padding:0;overflow:hidden', label: UIesc(c.name), small: UIfmt.age(c) + ' · reported ' + UIesc(UIA.dateShort(c.reported)) }); }).join('') + '</div>';
    html += UIActions.targetActionsHTML(acts, d.id);
    UIsheet.open({ eyebrow: 'District', title: d.name, push: o.push, tag: 'district', html: html, reopen: function () { self.districtSheet(id); }, onClose: function () { self.sel = null; if (self.cv) self.cv.frame(); },
      mount: function (b) { UIActions.bindTargetActions(b, d.id, 'district'); } });
  },
  clusterSheet: function (id, o) {
    var c = UIA.clusters().filter(function (x) { return x.id === id; })[0]; if (!c) return;
    if (c.place) this.placeSheet(c.place, o);
  },
  focus: function (pos) { this.hl = pos; UI.go('map'); var st = UIS.map, cv = this.cv; st.view.k = Math.max(st.view.k, 2.4); var T = UIMapR.xf(cv.w, cv.h, st.view), q = UIMapR.toScreen(T, pos); st.view.x += cv.w / 2 - q[0]; st.view.y += cv.h / 2 - q[1]; cv.frame(); var self = this; setTimeout(function () { self.hl = null; self.cv.frame(); }, 2600); }
};
