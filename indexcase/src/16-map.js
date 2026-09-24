/* INDEX CASE UI — 16-map.js: the night map of the city.
 * UIMapR is a reusable canvas renderer (map tab, debrief replay, title backdrop);
 * UIMap is the MAP tab with layers, filters, pinch-zoom and place/district sheets.
 * Look: a city at night seen from above — faint relief and contours, cold street
 * light, glowing arterials, a dark river; cases burn warm against it. */
var UIMapR = (function () {
  var M = {};
  var sprites = {};
  /** soft additive glow sprite */
  function sprite(key, core, halo, size, soft) {
    if (sprites[key]) return sprites[key];
    var c = document.createElement('canvas'), s = size * 2; c.width = c.height = s;
    var x = c.getContext('2d'), g = x.createRadialGradient(size, size, 0, size, size, size);
    if (soft) { g.addColorStop(0, core); g.addColorStop(0.35, halo); g.addColorStop(1, 'rgba(0,0,0,0)'); }
    else { g.addColorStop(0, core); g.addColorStop(0.16, core); g.addColorStop(0.3, halo); g.addColorStop(1, 'rgba(0,0,0,0)'); }
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    sprites[key] = c; return c;
  }
  M.sprite = sprite;
  M.RECENCY = [
    { max: 2, core: 'rgba(255,244,230,1)', halo: 'rgba(255,136,74,.6)', r: 1.25, l: 'Last 3 days' },
    { max: 7, core: 'rgba(255,164,104,1)', halo: 'rgba(255,104,52,.42)', r: 1, l: '3–7 days' },
    { max: 14, core: 'rgba(222,86,56,.95)', halo: 'rgba(196,60,40,.3)', r: .85, l: '1–2 weeks' },
    { max: 1e9, core: 'rgba(140,66,56,.8)', halo: 'rgba(110,40,35,.16)', r: .7, l: 'Older' }
  ];
  M.bucket = function (age) { for (var i = 0; i < M.RECENCY.length; i++) if (age <= M.RECENCY[i].max) return i; return 3; };
  M.FONT = function (k) { return getComputedStyle(document.body).getPropertyValue(k || '--f-mono'); };

  /** tileable fbm value-noise texture: the relief under the city (built once) */
  M.tex = function () {
    if (M._tex) return M._tex;
    var n = 128, c = document.createElement('canvas'); c.width = c.height = n;
    var x = c.getContext('2d'), img = x.createImageData(n, n), r = UIrand('relief');
    function grid(g) {
      var a = []; for (var i = 0; i < g * g; i++) a.push(r());
      return function (u, v) {
        u *= g; v *= g; var i0 = Math.floor(u), j0 = Math.floor(v), fu = u - i0, fv = v - j0;
        fu = fu * fu * (3 - 2 * fu); fv = fv * fv * (3 - 2 * fv);
        var i1 = (i0 + 1) % g, j1 = (j0 + 1) % g; i0 %= g; j0 %= g;
        var a0 = a[j0 * g + i0] + (a[j0 * g + i1] - a[j0 * g + i0]) * fu, a1 = a[j1 * g + i0] + (a[j1 * g + i1] - a[j1 * g + i0]) * fu;
        return a0 + (a1 - a0) * fv;
      };
    }
    var oc = [[grid(3), .5], [grid(6), .27], [grid(12), .15], [grid(24), .08]];
    for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
      var v = 0; oc.forEach(function (o) { v += o[0](i / n, j / n) * o[1]; });
      var k = (j * n + i) * 4, e = Math.max(0, v - .38) * 1.9;
      img.data[k] = 118; img.data[k + 1] = 168; img.data[k + 2] = 214; img.data[k + 3] = Math.round(Math.min(1, e * e) * 70);
    }
    x.putImageData(img, 0, 0);
    M._tex = c; return c;
  };

  /** deterministic decoration for a city: streets, arterials, river, contours, street lights */
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
    var out = [];
    for (var k = 0; k < 7; k++) { var a = k / 7 * Math.PI * 2 + r(); out.push([ctr[0] + Math.cos(a) * .25, ctr[1] + Math.sin(a) * .25, ctr[0] + Math.cos(a) * .5, ctr[1] + Math.sin(a) * .5, ctr[0] + Math.cos(a + (r() - .5) * .3) * .95, ctr[1] + Math.sin(a + (r() - .5) * .3) * .95]); }
    // river: a meander through the city
    var river = null;
    if (!city.river) {
      var ra = r() * Math.PI, pts = [];
      for (var t = -0.75; t <= 0.75; t += 0.05) { var off = Math.sin(t * 7 + r() * .4) * .035 + Math.sin(t * 3.1) * .05; pts.push([ctr[0] + Math.cos(ra) * t - Math.sin(ra) * off, ctr[1] + Math.sin(ra) * t + Math.cos(ra) * off]); }
      river = pts;
    } else river = city.river;
    // topographic contours around the city
    var contours = []; for (var c = 0; c < 16; c++) { var rad = 0.47 + c * 0.055, ph1 = r() * 6, ph2 = r() * 6, pts2 = []; for (var q = 0; q <= 96; q++) { var aa = q / 96 * Math.PI * 2; var rr = rad + Math.sin(aa * 3 + ph1) * (0.02 + c * .002) + Math.sin(aa * 5 + ph2) * 0.012 + Math.sin(aa * 11 + c) * 0.004; pts2.push([ctr[0] + Math.cos(aa) * rr, ctr[1] + Math.sin(aa) * rr * .95]); } contours.push(pts2); }
    // street lights: points strewn along each district's streets, denser where more people live
    var lights = [], maxPop = Math.max.apply(null, D.map(function (d) { return d.pop || 1; }));
    D.forEach(function (d, i) {
      if (!d.poly || d.poly.length < 3) return;
      var n = Math.round(90 + 260 * Math.sqrt((d.pop || maxPop * .5) / maxPop)), L = streets[i], tries = 0;
      for (var m = 0; m < n && tries < n * 4; tries++) {
        var s = L[Math.floor(r() * L.length)]; if (!s) break;
        var u = r(), x = s[0] + (s[2] - s[0]) * u, y = s[1] + (s[3] - s[1]) * u;
        if (!M.inPoly(x, y, d.poly)) continue;
        var e = r(); lights.push([x, y, e > .93 ? 2 : e > .55 ? 1 : 0]); m++;
      }
    });
    city._decor = { streets: streets, art: art, out: out, river: river, contours: contours, ctr: ctr, lights: lights };
    return city._decor;
  };

  function bbox(city) {
    if (city._bb) return city._bb;
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    (city.boundary ? [city.boundary] : city.districts.map(function (d) { return d.poly || []; })).forEach(function (pl) { pl.forEach(function (p) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }); });
    if (x0 > x1) { x0 = y0 = 0; x1 = y1 = 1; }
    city._bb = [x0, y0, x1, y1]; return city._bb;
  }
  /** world->screen transform for a viewport. fit (optional): {city, t, b, l, r} fits the
   * city's outline inside the viewport minus those insets (map tab); else the unit square. */
  M.xf = function (w, h, view, fit) {
    var s0, ox, oy;
    if (fit && fit.city) {
      var bb = bbox(fit.city), bw = bb[2] - bb[0], bh = bb[3] - bb[1], t = fit.t || 0, b = fit.b || 0, l = fit.l || 0, rr = fit.r || 0;
      var aw = Math.max(80, w - l - rr), ah = Math.max(80, h - t - b);
      s0 = Math.min(aw / bw * (fit.over || 1), ah / bh);
      ox = l + (aw - bw * s0) / 2 - bb[0] * s0; oy = t + (ah - bh * s0) / 2 - bb[1] * s0;
    } else {
      s0 = Math.min(w, h * 1.05) * 0.98; ox = (w - s0) / 2; oy = (h - s0) / 2;
    }
    return { s: s0 * view.k, x: ox * view.k + view.x, y: oy * view.k + view.y, base: s0, ox: ox, oy: oy };
  };
  function tx(T, p) { return [T.x + p[0] * T.s, T.y + p[1] * T.s]; }
  M.toScreen = function (T, p) { return tx(T, p); };
  M.toWorld = function (T, x, y) { return [(x - T.x) / T.s, (y - T.y) / T.s]; };
  function poly(ctx, T, pts) { ctx.beginPath(); pts.forEach(function (p, i) { var q = tx(T, p); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath(); }
  /** open polyline smoothed through midpoints */
  function smooth(ctx, T, pts) {
    var q = pts.map(function (p) { return tx(T, Array.isArray(p) ? p : [p.x, p.y]); });
    ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]);
    if (q.length < 3) { ctx.lineTo(q[q.length - 1][0], q[q.length - 1][1]); return; }
    for (var i = 1; i < q.length - 1; i++) ctx.quadraticCurveTo(q[i][0], q[i][1], (q[i][0] + q[i + 1][0]) / 2, (q[i][1] + q[i + 1][1]) / 2);
    ctx.lineTo(q[q.length - 1][0], q[q.length - 1][1]);
  }
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

  /** draw the base map. o: {city, view, fit, sel (district id), ww: {id: 0..1}, noVignette} */
  M.base = function (ctx, w, h, o) {
    var city = o.city, T = o.T || M.xf(w, h, o.view, o.fit), dec = M.decor(city), D = city.districts;
    var cc = tx(T, dec.ctr);
    // night ground
    var g = ctx.createRadialGradient(cc[0], cc[1], 0, cc[0], cc[1], Math.max(w, h, T.s * .9));
    g.addColorStop(0, '#0c1824'); g.addColorStop(.55, '#070e16'); g.addColorStop(1, '#03060a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // relief texture, fixed to the world
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = .9;
    var tp = tx(T, [dec.ctr[0] - 1.3, dec.ctr[1] - 1.3]); ctx.drawImage(M.tex(), tp[0], tp[1], T.s * 2.6, T.s * 2.6);
    ctx.restore();
    // contours beyond the city: every fourth an index contour
    ctx.lineWidth = 1;
    [0, 1].forEach(function (pass) {
      ctx.strokeStyle = pass ? 'rgba(143,203,255,.075)' : 'rgba(143,203,255,.035)'; ctx.beginPath();
      dec.contours.forEach(function (c, ci) { if ((ci % 4 === 0) !== !!pass) return; c.forEach(function (p, i) { var q = tx(T, p); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); });
      ctx.stroke();
    });
    // roads leaving the city
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(143,203,255,.09)'; ctx.lineWidth = 1;
    ctx.beginPath(); dec.out.forEach(function (a) { var p0 = tx(T, [a[0], a[1]]), p1 = tx(T, [a[2], a[3]]), p2 = tx(T, [a[4], a[5]]); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); }); ctx.stroke();
    // city edge: a halo of light spilling out
    if (city.boundary) {
      ctx.save(); poly(ctx, T, city.boundary);
      ctx.shadowColor = 'rgba(90,160,230,.28)'; ctx.shadowBlur = Math.min(60, T.s * .07); ctx.fillStyle = 'rgba(12,22,32,.92)'; ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(143,203,255,.16)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    }
    // district land: denser districts sit a touch lighter
    var maxPop = Math.max.apply(null, D.map(function (d) { return d.pop || 1; }));
    D.forEach(function (d) {
      if (!d.poly || d.poly.length < 3) return;
      poly(ctx, T, d.poly);
      var c = tx(T, d.centre), gg = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], T.s * 0.22), dn = Math.sqrt((d.pop || 0) / maxPop);
      if (o.sel === d.id) { gg.addColorStop(0, 'rgba(44,72,100,.96)'); gg.addColorStop(1, 'rgba(24,42,60,.96)'); }
      else { gg.addColorStop(0, 'rgba(' + Math.round(16 + dn * 8) + ',' + Math.round(28 + dn * 10) + ',' + Math.round(40 + dn * 12) + ',.9)'); gg.addColorStop(1, 'rgba(10,18,27,.9)'); }
      ctx.fillStyle = gg; ctx.fill();
    });
    // streets, clipped per district
    var sw = Math.max(0.5, Math.min(1.1, T.s / 900));
    ctx.save(); ctx.beginPath();
    D.forEach(function (d) { if (d.poly && d.poly.length > 2) d.poly.forEach(function (p, i) { var q = tx(T, p); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath(); });
    ctx.clip();
    ctx.strokeStyle = 'rgba(143,203,255,' + (0.045 + Math.min(0.05, T.s / 30000)).toFixed(3) + ')'; ctx.lineWidth = sw;
    ctx.beginPath();
    dec.streets.forEach(function (L) { L.forEach(function (l) { var a = tx(T, [l[0], l[1]]), b = tx(T, [l[2], l[3]]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }); });
    ctx.stroke();
    ctx.restore();
    // street lights
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    var ls = UIclamp(T.s / 420, .9, 2.4), LC = ['rgba(150,200,255,.16)', 'rgba(170,215,255,.3)', 'rgba(225,240,255,.62)'];
    for (var li = 0; li < 3; li++) {
      ctx.fillStyle = LC[li]; var z = li === 2 ? ls * 1.35 : ls;
      dec.lights.forEach(function (p) { if (p[2] !== li) return; var q = tx(T, p); if (q[0] < -2 || q[1] < -2 || q[0] > w + 2 || q[1] > h + 2) return; ctx.fillRect(q[0] - z / 2, q[1] - z / 2, z, z); });
    }
    ctx.restore();
    // wastewater: a violet heat haze pooled in each district
    if (o.ww) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      D.forEach(function (d) {
        var v = o.ww[d.id]; if (!v || !d.poly || d.poly.length < 3) return;
        ctx.save(); poly(ctx, T, d.poly); ctx.clip();
        var rr = UIrand('ww' + d.id);
        for (var b = 0; b < 3; b++) {
          var c = tx(T, [d.centre[0] + (rr() - .5) * .05, d.centre[1] + (rr() - .5) * .05]), rad = T.s * (0.07 + 0.11 * v) * (b ? .75 : 1.1), gg = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], rad);
          gg.addColorStop(0, 'rgba(170,140,255,' + ((0.08 + 0.34 * v) * (b ? .7 : 1)).toFixed(3) + ')'); gg.addColorStop(.6, 'rgba(120,90,230,' + (0.05 + 0.12 * v).toFixed(3) + ')'); gg.addColorStop(1, 'rgba(90,70,200,0)');
          ctx.fillStyle = gg; ctx.fillRect(c[0] - rad, c[1] - rad, rad * 2, rad * 2);
        }
        ctx.restore();
      });
      ctx.restore();
    }
    // river: dark banks, deep water, a cold sheen
    if (dec.river && dec.river.length > 1) {
      var rivers = [dec.river].concat(city.rivers2 || []);
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      rivers.forEach(function (rvp, ri) {
        var k = ri ? .6 : 1;
        function rv(wd, st) { smooth(ctx, T, rvp); ctx.lineWidth = wd; ctx.strokeStyle = st; ctx.stroke(); }
        rv(Math.max(5, T.s * 0.022 * k), 'rgba(2,5,9,.92)');
        rv(Math.max(3, T.s * 0.014 * k), '#0b2134');
        ctx.globalCompositeOperation = 'lighter';
        rv(Math.max(1.5, T.s * 0.007 * k), 'rgba(60,130,200,.16)');
        rv(1, 'rgba(150,210,255,.3)');
        ctx.globalCompositeOperation = 'source-over';
      });
      ctx.restore();
    }
    // arterials: glowing ribbons (engine roads when supplied, plus decorative links)
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalCompositeOperation = 'lighter';
    function arts(path) {
      if (city.roads) city.roads.forEach(function (rd) { smooth(ctx, T, rd); path(); });
      else dec.art.forEach(function (a) { var p0 = tx(T, [a[0], a[1]]), p1 = tx(T, [a[2], a[3]]), p2 = tx(T, [a[4], a[5]]); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); path(); });
    }
    if (city.roads) { ctx.strokeStyle = 'rgba(143,203,255,.07)'; ctx.lineWidth = Math.max(.7, sw * .9); ctx.beginPath(); dec.art.forEach(function (a) { var p0 = tx(T, [a[0], a[1]]), p1 = tx(T, [a[2], a[3]]), p2 = tx(T, [a[4], a[5]]); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); }); ctx.stroke(); }
    var rw = UIclamp(T.s / 160, 2.4, 9);
    arts(function () { ctx.strokeStyle = 'rgba(90,160,240,.05)'; ctx.lineWidth = rw * 2.2; ctx.stroke(); });
    arts(function () { ctx.strokeStyle = 'rgba(140,200,255,.1)'; ctx.lineWidth = rw * .7; ctx.stroke(); });
    arts(function () { ctx.strokeStyle = 'rgba(200,228,255,.3)'; ctx.lineWidth = Math.max(.7, rw * .16); ctx.stroke(); });
    ctx.restore();
    // borders
    ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.strokeStyle = 'rgba(143,203,255,.14)';
    D.forEach(function (d) { if (d.poly && d.poly.length > 2) { poly(ctx, T, d.poly); ctx.stroke(); } });
    ctx.setLineDash([]);
    if (o.sel && city.dById[o.sel]) { var sd = city.dById[o.sel]; ctx.save(); poly(ctx, T, sd.poly); ctx.strokeStyle = 'rgba(197,228,255,.8)'; ctx.lineWidth = 1.6; ctx.shadowColor = 'rgba(143,203,255,.9)'; ctx.shadowBlur = 12; ctx.stroke(); ctx.restore(); }
    if (!o.noVignette) M.vignette(ctx, w, h);
    return T;
  };
  /** lens vignette with a faint warm leak in one corner */
  M.vignette = function (ctx, w, h) {
    var R = Math.hypot(w, h) / 2, v = ctx.createRadialGradient(w / 2, h * .46, R * .38, w / 2, h / 2, R * 1.02);
    v.addColorStop(0, 'rgba(2,4,7,0)'); v.addColorStop(.7, 'rgba(2,4,7,.32)'); v.addColorStop(1, 'rgba(2,4,7,.78)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    var l = ctx.createRadialGradient(w * 1.02, h * .98, 0, w * 1.02, h * .98, R * .9);
    l.addColorStop(0, 'rgba(255,110,60,.07)'); l.addColorStop(1, 'rgba(255,110,60,0)');
    ctx.fillStyle = l; ctx.fillRect(0, 0, w, h);
  };
  /** district names, set in tracked small capitals with a dark halo */
  M.labels = function (ctx, T, city, o) {
    o = o || {};
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    var fs = UIclamp(T.s / 64, 9, 13.5), fb = M.FONT('--f-cond'), fm = M.FONT('--f-mono');
    var hasLS = 'letterSpacing' in ctx; if ('fontStretch' in ctx) ctx.fontStretch = 'condensed';
    var boxes = [], order = city.districts.slice().sort(function (a, b) { return (b.pop || 0) - (a.pop || 0); });
    order.forEach(function (d, rank) {
      var f = fs * (rank < 3 ? 1.08 : 1), txt = d.name.toUpperCase();
      ctx.font = '600 ' + f.toFixed(1) + 'px ' + fb;
      if (hasLS) ctx.letterSpacing = (f * .2).toFixed(1) + 'px'; else txt = txt.split('').join(' ');
      var c = tx(T, d.centre), tw = ctx.measureText(txt).width;
      if (o.w) c = [UIclamp(c[0], tw / 2 + 6, o.w - tw / 2 - 6), c[1]];
      var bx = [c[0] - tw / 2 - 3, c[1] - f * .7, tw + 6, f * 1.4];
      function hit() { return boxes.some(function (b) { return bx[0] < b[0] + b[2] && bx[0] + bx[2] > b[0] && bx[1] < b[1] + b[3] && bx[1] + bx[3] > b[1]; }); }
      if (o.sel !== d.id && hit()) { bx[1] += f * 1.5; c = [c[0], c[1] + f * 1.5]; if (hit()) return; }
      boxes.push(bx);
      ctx.strokeStyle = 'rgba(3,7,11,.82)'; ctx.lineWidth = 3.2; ctx.strokeText(txt, c[0], c[1]);
      ctx.fillStyle = o.sel === d.id ? 'rgba(232,244,255,.98)' : 'rgba(176,204,228,.62)'; ctx.fillText(txt, c[0], c[1]);
      if (o.counts && o.counts[d.id] && T.s > 500) {
        if (hasLS) ctx.letterSpacing = '0px';
        ctx.font = '600 ' + (f * .88).toFixed(1) + 'px ' + fm; var ct = o.counts[d.id] + (o.counts[d.id] === 1 ? ' case' : ' cases');
        ctx.strokeText(ct, c[0], c[1] + f * 1.35); ctx.fillStyle = 'rgba(255,170,126,.9)'; ctx.fillText(ct, c[0], c[1] + f * 1.35);
      }
    });
    if (hasLS) ctx.letterSpacing = '0px';
    ctx.restore();
  };
  /** warm bloom beneath clusters of cases: pts as for dots */
  M.bloom = function (ctx, T, pts, o) {
    if (!pts.length) return;
    o = o || {};
    var sp = sprite('bloom', 'rgba(255,120,60,.55)', 'rgba(255,90,40,.14)', 64, true), s = UIclamp(T.s / 14, 26, 120) * (o.scale || 1);
    var a = UIclamp(1.6 / Math.sqrt(pts.length), .05, .5);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    pts.forEach(function (q) { var c = tx(T, q.p); ctx.globalAlpha = a * (q.b === 0 ? 1 : q.b === 1 ? .8 : q.b === 2 ? .5 : .25) * (q.a === undefined ? 1 : Math.min(1, q.a * 1.5)); ctx.drawImage(sp, c[0] - s, c[1] - s, s * 2, s * 2); });
    ctx.restore(); ctx.globalAlpha = 1;
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
  /** base map (+ labels) cached in an offscreen canvas until key changes; returns T */
  M.cached = function (store, ctx, w, h, o, key) {
    var dpr = ctx.canvas.width / Math.max(1, w);
    key = [w, h, dpr.toFixed(2), key].join('|');
    if (store.key !== key) {
      var c = store.c || (store.c = document.createElement('canvas'));
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      var x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      store.T = M.base(x, w, h, o);
      if (o.labels) M.labels(x, store.T, o.city, o.labels === true ? {} : o.labels);
      store.key = key;
    }
    ctx.drawImage(store.c, 0, 0, w, h);
    return store.T;
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
      '<div class="mp-foot"><div class="mp-legend" id="mp-legend"></div><div class="mp-stat" id="mp-stat"></div></div>' +
      '<div class="mp-zoom" data-nogesture><button data-z="in" aria-label="Zoom in">' + UIICON.plus + '</button><button data-z="out" aria-label="Zoom out">' + UIICON.minus + '</button><button data-z="fit" aria-label="Fit city">' + UIICON.fit + '</button></div></div>';
    var st = UIS.map;
    if (!st.view) st.view = { x: 0, y: 0, k: 1 };
    this.dkey = null; this.fade0 = 0; this.arrive0 = 0; this.ins = null;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { self.dkey = null; if (self.cv) self.cv.frame(); });
    if (!this._on) { this._on = true; UI.on(function (ev) { if (ev === 'morning' && UIS && UIS.tab === 'map') { self.arrive0 = performance.now(); if (self.cv) self.cv.frame(); } }); }
    this.cv = UIcanvas(UI$('#mp-cv'), function (ctx, w, h) { self.draw(ctx, w, h); });
    this.g = UIgesture(UI$('#mp-cv'), st.view, { min: 0.7, max: 14, onChange: function () { self.moving(); }, onTap: function (x, y) { self.tap(x, y); }, onDouble: function (x, y) { self.zoomTo(x, y, 1.8); } });
    UI$('#mp .mp-zoom').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; UIAudio.cue('tap');
      var cv = self.cv; if (b.dataset.z === 'fit') { self.tween({ x: 0, y: 0, k: 1 }); return; }
      self.zoomTo(cv.w / 2, cv.h / 2, b.dataset.z === 'in' ? 1.6 : 1 / 1.6);
    });
    UI$('#mp-rec').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; st.recency = +b.dataset.r; self.chrome(); self.cv.frame(); UI.save(); });
    UI$('#mp-layers').addEventListener('click', function (e) { var b = e.target.closest('[data-l]'); if (!b) return; st.layers[b.dataset.l] = !st.layers[b.dataset.l]; UIAudio.cue('tap'); if (b.dataset.l === 'ww' && st.layers.ww && !self.hasWW) UItoast('No wastewater samples yet — start sampling from the Lab tab'); self.chrome(); self.cv.frame(); UI.save(); });
    this.anim();
  },
  /** the view moved (gesture or tween): draw the cached map transformed until it settles */
  moving: function () {
    var self = this; this.lastMove = performance.now(); this.cv.frame();
    clearTimeout(this._settle); this._settle = setTimeout(function () { self.cv.frame(); }, 160);
  },
  /** eased move of the view to a target {x,y,k} */
  tween: function (to, ms) {
    var st = UIS.map, v = st.view, from = { x: v.x, y: v.y, k: v.k }, t0 = performance.now(), self = this;
    ms = UImotion() ? (ms || 420) : 1;
    cancelAnimationFrame(this._tw);
    (function step() {
      var t = Math.min(1, (performance.now() - t0) / ms), e = 1 - Math.pow(1 - t, 3);
      v.x = from.x + (to.x - from.x) * e; v.y = from.y + (to.y - from.y) * e; v.k = from.k + (to.k - from.k) * e;
      self.moving(); if (t < 1) self._tw = requestAnimationFrame(step); else UI.save();
    })();
  },
  zoomTo: function (px, py, f) {
    var v = UIS.map.view, k = UIclamp(v.k * f, 0.7, 14), wx = (px - v.x) / v.k, wy = (py - v.y) / v.k;
    this.tween({ k: k, x: px - wx * k, y: py - wy * k }, 360);
  },
  /** room taken by the controls above and the caption below the city */
  measure: function (w, h) {
    var top = UI$('#mp .mp-top'), foot = UI$('#mp .mp-foot');
    this.ins = { w: w, h: h, t: (top && top.offsetHeight ? top.offsetHeight : 90) + 4, b: (foot && foot.offsetHeight ? foot.offsetHeight : 60) + 8 };
  },
  /** transform for the current view: the city fitted between the top controls and the caption */
  xf: function (w, h, view) {
    var cv = this.cv; w = w || cv.w; h = h || cv.h;
    if (!this.ins || this.ins.w !== w || this.ins.h !== h) this.measure(w, h);
    var fit = { city: UIA.city(), t: this.ins.t, b: this.ins.b, l: 8, r: w < 600 ? 8 : 70, over: w < 600 ? 1.08 : 1 };
    if (h - fit.t - fit.b < h * .5) { fit.t = h * .18; fit.b = h * .16; }
    return UIMapR.xf(w, h, view || UIS.map.view, fit);
  },
  show: function () { this.data(); this.chrome(); this.cv.resize(); this.cv.frame(); },
  refresh: function () { this.data(); this.chrome(); this.cv.frame(); },
  data: function () {
    this.dataV = (this.dataV || 0) + 1;
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
    UI$('#mp-stat').innerHTML = '<b>' + UIesc(UIA.city().name) + '</b><span><em>' + UIfmt.n(UIA.city().pop) + '</em> people · <em class="c">' + UIfmt.plural(shown, 'case') + '</em>' + (st.recency ? ' in ' + st.recency + ' days' : ' shown') + (cl ? ' · ' + UIfmt.plural(cl, 'cluster') : '') + '</span>';
    var leg = '';
    if (st.layers.cases) leg += '<div class="lg-row"><span class="lg-k">Onset</span>' + UIMapR.RECENCY.map(function (R, i) { return '<span><i style="background:' + R.core + ';box-shadow:0 0 7px ' + R.halo + '"></i>' + (i === 0 ? '≤2d' : i === 1 ? '≤7d' : i === 2 ? '≤14d' : 'older') + '</span>'; }).join('') + '</div>';
    if (st.layers.ww) leg += '<div class="lg-row"><span class="lg-k">Sewage</span><span class="lg-grad"></span><span>low → high</span></div>';
    UI$('#mp-legend').innerHTML = leg; UI$('#mp-legend').hidden = !leg;
    this.ins = null;
  },
  shownClusters: function () {
    var day = UIA.day(), k = UIS.map.view.k;
    var L = (this.clusters || []).filter(function (c) { return c.pos && (k >= 2.5 || c.lastOnset === null || day - c.lastOnset < 21); });
    L.sort(function (a, b) { return (b.lastOnset || 0) - (a.lastOnset || 0) || b.size - a.size; });
    return L.slice(0, Math.round(24 * Math.max(1, k)));
  },
  visiblePts: function () {
    var st = UIS.map; if (!st.layers.cases || !this.pts) return [];
    return this.pts.filter(function (q) { return !st.recency || q.age < st.recency; });
  },
  /* the static layers render into a cached canvas; animation frames only add the pulses */
  /* The static layers render into a cached canvas at the view they were drawn for. While
   * the view moves the cache is drawn transformed (cheap, fluid); once it settles it is
   * redrawn crisp. When the data change (a new day) the old cache fades out over the new.
   * Animation frames only add the pulses on top. */
  draw: function (ctx, w, h) {
    var st = UIS.map, dpr = this.cv.dpr, now = performance.now(), T = this.xf(w, h);
    this.T = T;
    var dkey = [w, h, dpr, JSON.stringify(st.layers), st.recency, this.sel, UIA.v, this.dataV, UIA.city().name].join('|');
    var vkey = [T.x.toFixed(1), T.y.toFixed(1), T.s.toFixed(2)].join('|');
    var moving = now - (this.lastMove || 0) < 150;
    if (dkey !== this.dkey || (!moving && vkey !== this.vkey)) {
      var dataChanged = this.dkey && this.dataKey !== this.dataV + '|' + UIA.v && vkey === this.vkey;
      if (dataChanged && UImotion()) { var p = this.prev || (this.prev = document.createElement('canvas')); var tmp = this.cache; this.cache = p; this.prev = tmp; this.fade0 = now; this.arrive0 = now; }
      var c = this.cache || (this.cache = document.createElement('canvas'));
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      var x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.layers(x, w, h, false, T);
      this.dkey = dkey; this.vkey = vkey; this.cT = T; this.dataKey = this.dataV + '|' + UIA.v;
    }
    if (vkey === this.vkey) ctx.drawImage(this.cache, 0, 0, w, h);
    else {
      ctx.fillStyle = '#04080c'; ctx.fillRect(0, 0, w, h);
      var r = T.s / this.cT.s; ctx.drawImage(this.cache, T.x - this.cT.x * r, T.y - this.cT.y * r, w * r, h * r);
    }
    if (this.fade0 && this.prev && now - this.fade0 < 700) { ctx.globalAlpha = 1 - (now - this.fade0) / 700; ctx.drawImage(this.prev, 0, 0, w, h); ctx.globalAlpha = 1; }
    else this.fade0 = 0;
    this.layers(ctx, w, h, true, T);
  },
  layers: function (ctx, w, h, anim, T) {
    var st = UIS.map, city = UIA.city(), day = UIA.day();
    if (!anim) UIMapR.base(ctx, w, h, { city: city, view: st.view, T: T, sel: this.sel, ww: st.layers.ww ? this.wv : null, noVignette: true, T: T });
    var t = (performance.now() / 1000), fb = UIMapR.FONT('--f-body'), fm = UIMapR.FONT('--f-mono');
    // venues: pinpoints at city scale, labelled diamonds when zoomed in; cluster venues always stand out
    if (st.layers.venues && !anim) {
      ctx.save();
      var near = T.s > 900, vs = UIclamp(T.s / 85, 6, 12), hot = {};
      if (st.layers.clusters) this.shownClusters().forEach(function (c) { if (c.place) hot[c.place] = 1; });
      city.places.forEach(function (p) {
        if (!p.pos) return; var q = UIMapR.toScreen(T, p.pos);
        if (q[0] < -20 || q[1] < -20 || q[0] > w + 20 || q[1] > h + 20) return;
        if (!near && !hot[p.id]) { ctx.fillStyle = 'rgba(92,224,190,.42)'; ctx.fillRect(q[0] - 1.1, q[1] - 1.1, 2.2, 2.2); return; }
        ctx.shadowColor = 'rgba(63,208,170,.6)'; ctx.shadowBlur = hot[p.id] ? 10 : 0;
        ctx.fillStyle = 'rgba(5,16,18,.92)'; ctx.strokeStyle = hot[p.id] ? 'rgba(160,240,218,1)' : 'rgba(63,208,170,.75)'; ctx.lineWidth = hot[p.id] ? 1.5 : 1.1;
        ctx.beginPath(); ctx.moveTo(q[0], q[1] - vs); ctx.lineTo(q[0] + vs, q[1]); ctx.lineTo(q[0], q[1] + vs); ctx.lineTo(q[0] - vs, q[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#9ff0da'; ctx.font = '600 ' + (vs * .8).toFixed(1) + 'px ' + fm; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(UIplaceKind(p.kind)[1].charAt(0), q[0], q[1] + .5);
        if (T.s > 1500) { ctx.font = '600 11px ' + fb; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(3,7,11,.85)'; ctx.textAlign = 'left'; ctx.strokeText(p.name, q[0] + vs + 5, q[1]); ctx.fillStyle = 'rgba(160,240,218,.9)'; ctx.fillText(p.name, q[0] + vs + 5, q[1]); }
      });
      ctx.restore();
    }
    if (!anim) UIMapR.labels(ctx, T, city, { sel: this.sel, counts: this.counts, w: w });
    // cases: bloom under the dots, then the dots
    var vp = this.visiblePts();
    if (!anim) {
      var dens = UIclamp(Math.sqrt(400 / Math.max(1, vp.length)), .18, 1); vp.forEach(function (q) { q.a = dens * (q.b === 3 ? .6 : 1); });
      UIMapR.bloom(ctx, T, vp); UIMapR.dots(ctx, T, vp);
      ctx.save(); ctx.strokeStyle = 'rgba(217,211,199,.75)'; ctx.lineWidth = 1.2;
      vp.forEach(function (q) { if (!q.died) return; var c = UIMapR.toScreen(T, q.p); ctx.beginPath(); ctx.arc(c[0], c[1], UIclamp(T.s / 120, 3, 7) + 2, 0, Math.PI * 2); ctx.stroke(); });
      ctx.restore();
    }
    // clusters: dashed rings with pulses, labels kept on screen and apart
    if (st.layers.clusters && this.clusters) {
      var boxes = [], maxLbl = Math.round(UIclamp(w * h / 60000, 4, 14) * Math.min(3, Math.sqrt(st.view.k)));
      var cls = this.shownClusters().sort(function (a, b) { var ra = a.lastOnset !== null && day - a.lastOnset < 14 ? 1 : 0, rb = b.lastOnset !== null && day - b.lastOnset < 14 ? 1 : 0; return rb - ra || b.size - a.size; });
      cls.forEach(function (c, i) {
        var stale = c.lastOnset !== null && day - c.lastOnset >= 21;
        if (!c.pos) return; var q = UIMapR.toScreen(T, c.pos), rad = UIclamp(T.s / 60, 10, 30) * (0.8 + Math.sqrt(c.size) * .25), ph = (t * .5 + i * .37) % 1;
        if (anim) {
          if (!stale && UImotion()) { ctx.strokeStyle = 'rgba(255,224,194,' + (0.55 * Math.pow(1 - ph, 1.5)).toFixed(3) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(q[0], q[1], rad * (1 + ph * .9), 0, Math.PI * 2); ctx.stroke(); }
          return;
        }
        ctx.save();
        if (stale) ctx.globalAlpha = 0.4;
        ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(255,224,194,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(q[0], q[1], rad, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(255,224,194,.25)'; ctx.beginPath(); ctx.arc(q[0], q[1], rad + 4, 0, Math.PI * 2); ctx.stroke();
        if (i >= maxLbl || stale) { ctx.fillStyle = 'rgba(20,12,8,.92)'; ctx.beginPath(); ctx.arc(q[0] + rad * .7, q[1] - rad * .7, 8.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(255,164,119,.55)'; ctx.stroke(); ctx.fillStyle = '#ffe0c2'; ctx.font = '600 10px ' + fm; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(c.size), q[0] + rad * .7, q[1] - rad * .7 + .5); ctx.restore(); return; }
        var nm = c.name.length > 26 ? c.name.slice(0, 25) + '…' : c.name, ns = String(c.size);
        ctx.font = '600 11.5px ' + fb; var tw = ctx.measureText(nm).width; ctx.font = '600 11px ' + fm; var cw = ctx.measureText(ns).width;
        var bw = tw + cw + 26, bh = 22;
        var bx = UIclamp(q[0] - bw / 2, 6, w - bw - 6), by = q[1] - rad - 28;
        for (var k = 0; k < 8 && boxes.some(function (b) { return bx < b[0] + b[2] + 4 && bx + bw + 4 > b[0] && by < b[1] + b[3] + 3 && by + bh + 3 > b[1]; }); k++) by -= bh + 4;
        boxes.push([bx, by, bw, bh]);
        if (by + bh < q[1] - rad - 4) { ctx.strokeStyle = 'rgba(255,164,119,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q[0], q[1] - rad); ctx.lineTo(UIclamp(q[0], bx + 8, bx + bw - 8), by + bh); ctx.stroke(); }
        ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
        ctx.fillStyle = 'rgba(22,13,9,.9)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 11); else ctx.rect(bx, by, bw, bh); ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.strokeStyle = 'rgba(255,164,119,.55)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
        ctx.font = '600 11.5px ' + fb; ctx.fillStyle = '#ffeadb'; ctx.fillText(nm, bx + 10, by + bh / 2 + .5);
        ctx.fillStyle = 'rgba(255,164,119,.35)'; ctx.fillRect(bx + 16 + tw, by + 6, 1, bh - 12);
        ctx.font = '600 11px ' + fm; ctx.fillStyle = '#ff9d6e'; ctx.fillText(ns, bx + 21 + tw, by + bh / 2 + .5);
        ctx.restore();
      });
    }
    if (!anim) { UIMapR.vignette(ctx, w, h); return; }
    // animation: pulses on today's cases, a flare as a new day's cases arrive, the focus ring
    var ar = this.arrive0 ? (performance.now() - this.arrive0) / 1400 : 1;
    ctx.save();
    vp.forEach(function (q) {
      if (!q.big) return;
      var c = UIMapR.toScreen(T, q.p);
      if (ar < 1) { var e = 1 - Math.pow(1 - ar, 2); ctx.strokeStyle = 'rgba(255,236,214,' + (0.9 * (1 - e)).toFixed(3) + ')'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(c[0], c[1], 3 + e * 30, 0, Math.PI * 2); ctx.stroke(); }
      if (UImotion()) { var ph = (t * .7 + (UIh(q.c.pid) % 100) / 100) % 1; ctx.strokeStyle = 'rgba(255,200,160,' + (0.6 * (1 - ph)).toFixed(3) + ')'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(c[0], c[1], 4 + ph * 16, 0, Math.PI * 2); ctx.stroke(); }
    });
    if (this.hl) { var hp = UIMapR.toScreen(T, this.hl), hph = (t * 1.2) % 1; ctx.strokeStyle = '#c5e4ff'; ctx.lineWidth = 2; ctx.shadowColor = 'rgba(143,203,255,.9)'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(hp[0], hp[1], 12, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(197,228,255,' + (0.7 * (1 - hph)).toFixed(3) + ')'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(hp[0], hp[1], 12 + hph * 22, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  },
  anim: function () {
    if (this._anim) return; this._anim = true;
    var self = this, last = 0;
    function loop(ts) {
      requestAnimationFrame(loop);
      if (document.hidden || !UIS || UIS.tab !== 'map' || UI$('#game').hidden || !self.cv) return;
      var busy = self.fade0 || (self.arrive0 && ts - self.arrive0 < 1500);
      if (!busy && ts - last < 50) return; last = ts;
      var any = busy || self.hl || (UImotion() && ((UIS.map.layers.clusters && self.clusters && self.clusters.length) || (self.pts && self.pts.some(function (q) { return q.big; }))));
      if (any) self.cv.frame();
    }
    requestAnimationFrame(loop);
  },
  tap: function (x, y) {
    var T = this.xf(), st = UIS.map, best = null, bd = 20, city = UIA.city();
    this.visiblePts().forEach(function (q) { var c = UIMapR.toScreen(T, q.p), d = Math.hypot(c[0] - x, c[1] - y); if (d < bd) { bd = d; best = { t: 'case', id: q.c.pid }; } });
    if (st.layers.clusters) this.shownClusters().forEach(function (c) { if (!c.pos) return; var q = UIMapR.toScreen(T, c.pos), d = Math.hypot(q[0] - x, q[1] - y); if (d < bd + 4) { bd = d; best = { t: 'cluster', id: c.id }; } });
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
  focus: function (pos) {
    this.hl = pos; UI.go('map');
    var st = UIS.map, cv = this.cv, self = this; cv.resize();
    var k = Math.max(st.view.k, 2.4), T1 = this.xf(cv.w, cv.h, { x: 0, y: 0, k: 1 });
    this.tween({ k: k, x: cv.w / 2 - k * (T1.x + pos[0] * T1.s), y: cv.h / 2 - k * (T1.y + pos[1] * T1.s) }, 700);
    clearTimeout(this._hlT); this._hlT = setTimeout(function () { self.hl = null; self.cv.frame(); }, 3200);
  }
};
