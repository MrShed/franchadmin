// ===================================================================
// ART 04d: city pictures (a landmark for every city), the hotel lobby,
// enemy building exteriors and the binocular stake-out view.
// Painted on the fine (RES) grid in layers: cached sky / scenery / foreground
// canvases, with small animated overlays (clouds, water, traffic, people).
// ===================================================================
const ctX_now = () => performance.now() / 1000;
function ctX_rng(s) { let x = 7; for (const ch of String(s)) x = (Math.imul(x, 31) + ch.charCodeAt(0)) | 0; x = ((x >>> 0) % 2147483646) + 1; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }
function ctX_h(i, s = 0) { let x = Math.imul((i | 0) ^ 0x3c6ef372, 0x85ebca6b) ^ Math.imul((s | 0) + 0x632be5ab, 0xc2b2ae35); x ^= x >>> 13; x = Math.imul(x, 0x27d4eb2f); x ^= x >>> 16; return (x >>> 0) / 4294967296; }
function ctX_sid(s) { let x = 0; for (const ch of String(s)) x = (Math.imul(x, 31) + ch.charCodeAt(0)) | 0; return x; }

// ---------------------------------------------------------------
// the "view": design units -> fine pixels. Ground line y = 0, up is negative.
// ---------------------------------------------------------------
let ctX_V = null;
const ctX_x = x => ctX_V.ox + x * ctX_V.u, ctX_y = y => ctX_V.gy + y * ctX_V.u;
function ctX_R(x, y, w, h, c) {
  const V = ctX_V, a = Math.round(V.ox + x * V.u), b = Math.round(V.gy + y * V.u), a2 = Math.round(V.ox + (x + w) * V.u), b2 = Math.round(V.gy + (y + h) * V.u);
  g.fillStyle = c; g.fillRect(a, b, Math.max(1, a2 - a), Math.max(1, b2 - b));
}
function ctX_P(pts, c) { g.fillStyle = c; g.beginPath(); for (let i = 0; i < pts.length; i += 2) g.lineTo(ctX_x(pts[i]), ctX_y(pts[i + 1])); g.closePath(); g.fill(); }
function ctX_E(cx, cy, rx, ry, c) { g.fillStyle = c; g.beginPath(); g.ellipse(ctX_x(cx), ctX_y(cy), Math.max(.5, rx * ctX_V.u), Math.max(.5, ry * ctX_V.u), 0, 0, Math.PI * 2); g.fill(); }
function ctX_L(x0, y0, x1, y1, c, wd = 1) { g.strokeStyle = c; g.lineWidth = Math.max(1, wd * ctX_V.u); g.beginPath(); g.moveTo(ctX_x(x0), ctX_y(y0)); g.lineTo(ctX_x(x1), ctX_y(y1)); g.stroke(); }
function ctX_Lf(x0, y0, x1, y1, c, wd = 1) { g.strokeStyle = c; g.lineWidth = wd; g.beginPath(); g.moveTo(ctX_x(x0), ctX_y(y0)); g.lineTo(ctX_x(x1), ctX_y(y1)); g.stroke(); } // fixed fine width
// upper half ellipse (dome / arch head) as a path
function ctX_domePath(cx, by, rx, ry) { g.beginPath(); g.ellipse(ctX_x(cx), ctX_y(by), rx * ctX_V.u, ry * ctX_V.u, 0, Math.PI, 0); g.closePath(); }

// colour: the scene's light. k > 0 toward the key light, k < 0 into cool shadow.
// day: warm sun from the upper left; night: blue moonlight, or warm floodlight on landmarks.
function ctX_c(base, k = 0) {
  const V = ctX_V; let c = base;
  if (!V.n) { if (k > 0) c = mix(c, '#fff3cc', Math.min(.9, .2 * k)); else if (k < 0) c = mix(c, '#2d2b5e', Math.min(.92, .2 * -k)); }
  else if (V.flood) { c = mix(mix(c, '#ffd9a0', .3), '#3a2436', .22); if (k > 0) c = mix(c, '#ffe2a6', Math.min(.9, .2 * k)); else if (k < 0) c = mix(c, '#1a1030', Math.min(.92, .24 * -k)); }
  else { c = mix(c, '#161c40', .7); if (k > 0) c = mix(c, '#8d9fd0', Math.min(.9, .12 * k)); else if (k < 0) c = mix(c, '#05061a', Math.min(.92, .24 * -k)); }
  if (V.fog > 0) c = mix(c, V.hz, V.fog);
  return c;
}
// lit window colours at night (warm lamps, the odd TV)
const ctX_WARM = ['#ffd27a', '#ffc160', '#ffe3a0', '#f7a94e', '#ffd88f', '#9fc4ff'];
function ctX_lamp(r) { const c = ctX_WARM[Math.floor(r * 5.99)]; return ctX_V.fog > 0 ? mix(c, ctX_V.hz, ctX_V.fog * .45) : c; }

// shaded solids, key light from the left
function ctX_cyl(x, y, w, h, base, k = 0) {
  ctX_R(x, y, w, h, ctX_c(base, k)); ctX_R(x, y, w * .2, h, ctX_c(base, k + 1)); ctX_R(x + w * .6, y, w * .4, h, ctX_c(base, k - 1.2)); ctX_R(x + w * .84, y, w * .16, h, ctX_c(base, k - 2));
}
// sphere / dome shading: lit rim on the left, shadow crescent on the right
function ctX_shadeClip(X, Y, RX, RY, base, k) {
  g.fillStyle = ctX_c(base, k + 1.2); g.fillRect(X - RX - 2, Y - RY - 2, RX * 2 + 4, RY * 2 + 4);
  g.fillStyle = ctX_c(base, k); g.beginPath(); g.ellipse(X + RX * .16, Y + RY * .04, RX * 1.02, RY * 1.02, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = ctX_c(base, k - 1.3); g.beginPath(); g.rect(X - RX - 3, Y - RY - 3, RX * 2 + 6, RY * 2 + 6); g.ellipse(X - RX * .3, Y - RY * .1, RX * 1.02, RY * 1.1, 0, 0, Math.PI * 2); g.fill('evenodd');
  g.fillStyle = ctX_c(base, k - 2.2); g.beginPath(); g.rect(X - RX - 3, Y - RY - 3, RX * 2 + 6, RY * 2 + 6); g.ellipse(X - RX * .12, Y - RY * .1, RX * 1.0, RY * 1.12, 0, 0, Math.PI * 2); g.fill('evenodd');
}
function ctX_dome(cx, by, rx, ry, base, o = {}) {
  const X = ctX_x(cx), Y = ctX_y(by), RX = rx * ctX_V.u, RY = ry * ctX_V.u;
  g.save(); ctX_domePath(cx, by, rx, ry); g.clip(); ctX_shadeClip(X, Y, RX, RY, base, o.k || 0);
  if (o.ribs) { g.strokeStyle = ctX_c(base, -1.6); g.lineWidth = 1; for (const f of o.ribs) { g.beginPath(); g.ellipse(X, Y, Math.abs(f) * RX, RY, 0, Math.PI, 0); g.stroke(); } }
  if (o.bands) { g.fillStyle = ctX_c(o.bandC || base, -1); for (const f of o.bands) g.fillRect(X - RX, Y - RY * f, RX * 2, Math.max(1, ctX_V.u * .6)); }
  g.restore();
}
function ctX_ball(cx, cy, r, base, k = 0) { const X = ctX_x(cx), Y = ctX_y(cy), R = r * ctX_V.u; g.save(); g.beginPath(); g.arc(X, Y, R, 0, Math.PI * 2); g.clip(); ctX_shadeClip(X, Y, R, R, base, k); g.restore(); }
// onion / pointed dome (profile bulges then tapers to a point)
function ctX_onion(cx, by, rx, h, base, bulge = 1.15) {
  const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16, yy = -t * h; const w = rx * (t < .45 ? 1 + (bulge - 1) * Math.sin(t / .45 * Math.PI / 2) : bulge * Math.cos((t - .45) / .55 * Math.PI / 2) ** 1.4); pts.push([cx + w, by + yy]); }
  g.save(); g.beginPath(); for (const [a, b] of pts) g.lineTo(ctX_x(a), ctX_y(b)); for (let i = pts.length - 1; i >= 0; i--) g.lineTo(ctX_x(2 * cx - pts[i][0]), ctX_y(pts[i][1])); g.closePath(); g.clip();
  ctX_shadeClip(ctX_x(cx), ctX_y(by - h * .35), rx * bulge * ctX_V.u, h * .7 * ctX_V.u, base, 0); g.restore();
}
// a row of windows: day glass with a sky reflection, night warm lamps (seeded, a steady pattern)
function ctX_wins(x, y, w, h, nx, ny, ww, wh, seed, o = {}) {
  const sx = w / nx, sy = h / ny, V = ctX_V, lit = o.lit === undefined ? .42 : o.lit, glass = o.glass || '#3d4a66';
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const wx = x + i * sx + (sx - ww) / 2, wy = y + j * sy + (sy - wh) / 2, r = ctX_h(i * 131 + j * 17, seed);
    if (V.n) ctX_R(wx, wy, ww, wh, r < lit ? ctX_lamp(r / lit) : mix(ctX_c(glass, -1), V.hz, V.fog * .5));
    else { ctX_R(wx, wy, ww, wh, ctX_c(glass, -.5)); if (wh * V.u >= 3) ctX_R(wx, wy, ww, wh * .4, ctX_c(mix(glass, '#a9c3dc', .45), 0)); if (o.sill && V.u * wh > 3) ctX_R(wx - .2, wy + wh, ww + .4, .6, ctX_c(o.sill, 1)); }
  }
}
function ctX_banded(x, y, w, h, cols, steps) { // banded vertical gradient in fine px
  for (let i = 0; i < steps; i++) { const t = i / (steps - 1) * (cols.length - 1), k = Math.min(cols.length - 2, Math.floor(t)); g.fillStyle = mix(cols[k], cols[k + 1], Math.round((t - k) * 8) / 8); const y0 = Math.round(y + h * i / steps), y1 = Math.round(y + h * (i + 1) / steps); g.fillRect(x, y0, w, y1 - y0); }
}
function ctX_glow(X, Y, r, col, a) { const gr = g.createRadialGradient(X, Y, 0, X, Y, r); const c = hexRGB(col).join(','); gr.addColorStop(0, 'rgba(' + c + ',' + a + ')'); gr.addColorStop(.5, 'rgba(' + c + ',' + a * .35 + ')'); gr.addColorStop(1, 'rgba(' + c + ',0)'); g.fillStyle = gr; g.fillRect(X - r, Y - r, r * 2, r * 2); }

// ---------------------------------------------------------------
// skies, clouds, hills, towns, trees
// ---------------------------------------------------------------
const ctX_SKIES = {
  clear: { d: ['#285aa3', '#4479bd', '#6f9fd2', '#a5c6e0', '#d9e3dc', '#f2e6c6'], n: ['#05081c', '#0a1130', '#141d48', '#232a5a', '#3b3363', '#5d4263'] },
  deep: { d: ['#1d52a6', '#2f76c6', '#56a0dc', '#8cc6e6', '#c4e3ea', '#eef3e2'], n: ['#040a22', '#08163e', '#12265a', '#1f3468', '#3a3f6e', '#5f4a70'] },
  haze: { d: ['#4577b2', '#6a9bc9', '#98bbd3', '#c4d1cc', '#e3d6b4', '#f1d49e'], n: ['#06091c', '#0d1435', '#1b1d46', '#2f2750', '#4a3552', '#704a52'] },
  grey: { d: ['#5f6b82', '#77839a', '#929db0', '#adb4bf', '#c4c6c6', '#d6d3cb'], n: ['#07091a', '#0e1226', '#171c32', '#23253c', '#35303f', '#4d3e42'] },
  dusk: { d: ['#3a6db0', '#5f92c8', '#91b6d6', '#c7d2cf', '#ecd4a8', '#f6c98c'], n: ['#070a20', '#0f153a', '#1e1f4c', '#352a58', '#553659', '#7c4a55'] },
};
function ctX_skyPaint(V, S) {
  const cols = (ctX_SKIES[S.sky] || ctX_SKIES.clear)[V.n ? 'n' : 'd'], fw = V.fw, fh = V.fh;
  ctX_banded(0, 0, fw, V.gy + 2, cols, Math.max(10, Math.round(V.gy / 7)));
  g.fillStyle = cols[cols.length - 1]; g.fillRect(0, V.gy + 2, fw, fh);
  if (!V.n) { ctX_glow(fw * .08, 0, fw * .55, '#fff4d6', S.sky === 'grey' ? .15 : .32); return; }
  // stars: a sparse fixed field, brighter and bluer up top, fading into the horizon glow
  const N = Math.round(fw * V.gy / 520);
  for (let i = 0; i < N; i++) {
    const sx = Math.floor(ctX_h(i, 11) * fw), sy = Math.floor(ctX_h(i, 12) ** 1.6 * V.gy * .75), r = ctX_h(i, 13);
    const col = mix(r < .3 ? '#ffffff' : r < .6 ? '#c9d6ff' : '#ffe6c2', cols[Math.min(cols.length - 1, Math.floor(sy / V.gy * cols.length))], .25 + sy / V.gy * .6);
    g.fillStyle = col; g.fillRect(sx, sy, 1, 1);
    if (r > .96 && sy < V.gy * .4) { g.fillStyle = mix(col, cols[0], .5); g.fillRect(sx - 1, sy, 3, 1); g.fillRect(sx, sy - 1, 1, 3); g.fillStyle = '#ffffff'; g.fillRect(sx, sy, 1, 1); }
  }
  // moon with a halo
  const mx = Math.round(fw * (S.moonX || .8)), my = Math.round(Math.min(V.gy * .32, 14 + V.u * 12)), mr = Math.max(4, Math.round(V.u * 5));
  ctX_glow(mx, my, mr * 7, '#9fb2e8', .22); ctX_glow(mx, my, mr * 2.4, '#dfe6ff', .3);
  g.fillStyle = '#e9e6d4'; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill();
  g.fillStyle = '#fbf8ec'; g.beginPath(); g.arc(mx - mr * .18, my - mr * .15, mr * .82, 0, 7); g.fill();
  g.fillStyle = '#d6d2bd'; for (const [a, b, r] of [[-.3, -.2, .28], [.25, .2, .22], [.1, -.4, .16], [-.1, .35, .14]]) { g.beginPath(); g.arc(mx + a * mr, my + b * mr, Math.max(.8, r * mr), 0, 7); g.fill(); }
}
// clouds: flat-bottomed cumulus built from lobes; shadow body, lit tops, a sun-side rim
function ctX_cloudArt(key, w, h, n, mood, seed) {
  return art('ctXcl' + key, w, h, () => {
    const FW = w * RES, FH = h * RES, r = ctX_rng(seed), lobes = [], k = 5 + (r() * 4 | 0), base = FH * .86;
    for (let i = 0; i < k; i++) { const t = (i + .5) / k, env = Math.sin(t * Math.PI) ** .8, rr = FH * (.14 + .3 * env * (.6 + r() * .5)); lobes.push([FW * (.1 + .8 * t) + (r() - .5) * FW * .05, base - rr * (.55 + r() * .5), rr]); }
    const grey = mood === 'grey', warm = mood === 'haze' || mood === 'dusk';
    const C = n ? ['#10162f', '#151c3b', '#1b2447', '#2b3660'] : grey ? ['#8b91a3', '#a1a7b5', '#babfc7', '#d4d6d4'] : warm ? ['#b4aec0', '#d2ccd0', '#ece6dc', '#fff8ea'] : ['#a6b3d2', '#ccd6e8', '#e9eef4', '#fdfdfb'];
    const shape = () => { g.beginPath(); for (const [x, y, rr] of lobes) { g.moveTo(x + rr, y); g.arc(x, y, rr, 0, 7); } g.rect(FW * .1, base - FH * .22, FW * .8, FH * .22); };
    g.save(); shape(); g.clip();
    g.fillStyle = C[0]; g.fillRect(0, 0, FW, FH);
    const blob = (dx, dy, s, c) => { g.fillStyle = c; g.beginPath(); for (const [x, y, rr] of lobes) { g.moveTo(x + dx * rr + rr * s, y + dy * rr); g.arc(x + dx * rr, y + dy * rr, rr * s, 0, 7); } g.fill(); };
    blob(-.08, -.1, .98, C[1]); blob(-.2, -.24, .82, C[2]); blob(-.34, -.42, .5, C[3]);
    g.fillStyle = C[0]; g.fillRect(0, base - FH * .08, FW, FH); g.fillStyle = mix(C[0], C[1], .5); g.fillRect(0, base - FH * .14, FW, Math.max(1, FH * .06));
    g.restore();
  });
}
// ridge line of hills / mountains, shaded by slope (sun from the left), optional snow, valley haze at the foot
function ctX_ridge(x0, x1, hfn, base, o = {}) {
  const V = ctX_V, X0 = Math.floor(ctX_x(x0)), X1 = Math.ceil(ctX_x(x1)), by = Math.round(ctX_y(o.y || 0)), fog = V.fog;
  let top0 = by;
  const cv2 = document.createElement('canvas'); cv2.width = V.fw; cv2.height = V.fh;
  drawTo(cv2.getContext('2d'), () => {
    for (let X = Math.max(0, X0); X < Math.min(V.fw, X1); X++) {
      const dx = (X - V.ox) / V.u, hh = hfn(dx); if (hh <= 0) continue;
      const slope = (hfn(dx + 1.8) - hfn(dx - 1.8)) / 3.6, top = Math.round(by - hh * V.u); top0 = Math.min(top0, top);
      const k = slope > .45 ? 1.1 : slope > .12 ? .5 : slope > -.12 ? -.1 : slope > -.45 ? -.7 : -1.2;
      g.fillStyle = ctX_c(base, (o.k || 0) + k); g.fillRect(X, top, 1, by - top);
      if (o.snow && hh > o.snow) { const sh = Math.round((hh - o.snow) * V.u * .9 + (ctX_vnoise(dx * .45, 3) - .5) * V.u * 5 + V.u); g.fillStyle = ctX_c(k < 0 ? '#b4bedc' : '#f6f2ea', k > .6 ? .6 : 0); g.fillRect(X, top, 1, clamp(sh, 1, by - top)); }
    }
    g.globalCompositeOperation = 'source-atop';
    const gr = g.createLinearGradient(0, top0 + (by - top0) * .35, 0, by); const hz = hexRGB(V.hz).join(',');
    gr.addColorStop(0, 'rgba(' + hz + ',0)'); gr.addColorStop(1, 'rgba(' + hz + ',' + (o.haze === undefined ? .45 : o.haze) + ')'); g.fillStyle = gr; g.fillRect(0, top0, V.fw, by - top0);
    g.globalCompositeOperation = 'source-over';
  });
  g.drawImage(cv2, 0, 0); V.fog = fog;
}
function ctX_vnoise(x, seed) { const i = Math.floor(x), f = x - i, a = ctX_h(i, seed), b = ctX_h(i + 1, seed), t = f * f * (3 - 2 * f); return a + (b - a) * t; }
function ctX_peaks(list, rough = 1, seed = 0) { // [[x, h, halfWidth], ...] -> mountain height function (soft max of peaks + fractal detail)
  return x => { let s = 0, m = 0; for (const [px, ph, hw] of list) { const d = Math.abs(x - px) / hw; if (d < 1) { const v = ph * (rough > .7 ? (1 - d) ** 1.5 : (1 - d * d) ** 1.4); s += v ** 4; m = Math.max(m, v); } }
    if (m <= 0) return 0; const h = s ** .25;
    const n = ctX_vnoise(x * .07, seed) * .5 + ctX_vnoise(x * .19, seed + 1) * .3 + ctX_vnoise(x * .52, seed + 2) * .2 - .5;
    return Math.max(0, h + n * rough * Math.min(16, h * .55)); };
}
// a distant town: rows of simple blocks in one of several regional styles
const ctX_STY = {
  euro: { walls: ['#d8cdb8', '#cdbfa6', '#e2d8c6', '#bfae96'], roof: ['#5f6a82', '#6b5f66', '#b0674a'], hmin: 12, hmax: 22 },
  paris: { walls: ['#e6dac0', '#dccfb2', '#ebe1cd'], roof: ['#6a7892', '#5f6d88'], hmin: 14, hmax: 20, mansard: 1 },
  med: { walls: ['#e9d3a8', '#e4c190', '#f1e2c4', '#d8b184', '#ecd8b8'], roof: ['#b85e3e', '#c46c48'], hmin: 8, hmax: 16 },
  arab: { walls: ['#e8dcc2', '#dccaa6', '#f0e6d2', '#cfbb98'], roof: null, hmin: 7, hmax: 15 },
  latin: { walls: ['#e7c9a0', '#dca98c', '#e9d9b8', '#c9a27c', '#b7c7b0'], roof: ['#ad5a3c', '#9c4e36'], hmin: 7, hmax: 13 },
  modern: { walls: ['#9aa6b4', '#b8bcc0', '#8e9aa8', '#c9c2b4'], roof: null, hmin: 18, hmax: 40, tower: 1 },
  block: { walls: ['#b2aea2', '#a39f96', '#bdb8ac'], roof: null, hmin: 16, hmax: 26, slab: 1 },
  brick: { walls: ['#a45a42', '#9a5440', '#b06a4c', '#8e4c3a'], roof: null, hmin: 14, hmax: 34, tower: 1 },
};
function ctX_town(x0, x1, style, seed, o = {}) {
  const S = ctX_STY[style], r = ctX_rng('town' + seed), sc = o.sc || 1; let x = x0;
  while (x < x1) {
    const w = (S.tower ? 7 + r() * 9 : S.slab ? 14 + r() * 16 : 6 + r() * 10) * sc, h = (S.hmin + r() * (S.hmax - S.hmin)) * sc * (o.hk || 1);
    const wall = S.walls[r() * S.walls.length | 0], y = -h + (o.y || 0);
    ctX_R(x, y, w, h, ctX_c(wall, 0)); ctX_R(x + w * .72, y, w * .28, h, ctX_c(wall, -1.2)); ctX_R(x, y, Math.max(.6, w * .1), h, ctX_c(wall, .8));
    const fl = Math.max(1, Math.round(h / (3.2 * sc))), cols = Math.max(1, Math.round(w / (3 * sc)));
    if (ctX_V.u * sc > .7) ctX_wins(x + .8, y + 1.2 * sc, w * .72 - 1, h - 2.4 * sc, cols, fl, 1.1 * sc, 1.5 * sc, ctX_sid(seed) + x * 7 | 0, { lit: o.lit || .38, glass: S.tower ? '#44607e' : '#4a4e60' });
    if (S.roof && r() < .8) { const rc = S.roof[r() * S.roof.length | 0]; if (S.mansard) { ctX_P([x - .5, y, x + w + .5, y, x + w - 1.2 * sc, y - 3.5 * sc, x + 1.2 * sc, y - 3.5 * sc], ctX_c(rc, 0)); ctX_R(x + w * .6, y - 3.5 * sc, w * .4 - 1.2 * sc, 3.5 * sc, ctX_c(rc, -1)); for (let dx = 2 * sc; dx < w - 2 * sc; dx += 3.4 * sc) ctX_R(x + dx, y - 3 * sc, 1 * sc, 1.6 * sc, ctX_V.n && r() < .3 ? ctX_lamp(r()) : ctX_c('#e8e2d2', 0)); ctX_R(x + w * .3, y - 5.4 * sc, 1.2 * sc, 2 * sc, ctX_c('#a0826a', -.5)); }
      else { const ph = Math.min(w * .35, 4 * sc); ctX_P([x - .4, y, x + w + .4, y, x + w / 2, y - ph], ctX_c(rc, 0)); ctX_P([x + w / 2, y - ph, x + w + .4, y, x + w / 2, y], ctX_c(rc, -1.2)); } }
    if (style === 'arab' && r() < .35) { ctX_R(x + w * .2, y - 1.4, 2, 1.4, ctX_c('#c8c4bc', 0)); }
    if (style === 'block' && ctX_V.u > .9) for (let yy = y + 2.5; yy < -1; yy += 3.2 * sc) ctX_R(x, yy, w, .45, ctX_c(wall, -1.6));
    x += w + (S.slab ? 2 + r() * 6 : r() < .3 ? r() * 3 : 0) * sc;
  }
}
// trees: canopies from overlapping clusters, dark underside, lit upper-left
function ctX_tree(x, y, s, kind, o = {}) {
  const leaf = o.leaf || '#4f7a3a', bark = o.bark || '#5a4030';
  if (kind === 'palm') {
    const lean = o.lean === undefined ? .25 : o.lean, H = 26 * s, tx = x + lean * H, ty = y - H;
    g.save(); g.lineCap = 'round';
    for (let i = 0; i < 10; i++) { const t0 = i / 10, t1 = (i + 1) / 10, f = t => [x + lean * H * t * t, y - H * t]; const [a, b] = f(t0), [c2, d] = f(t1); ctX_L(a, b, c2, d, ctX_c(bark, i % 2 ? -.4 : .3), 1.5 * s * (1.15 - t0 * .35)); }
    const fr = [[-1, -.2], [-.85, .35], [-.5, .75], [.05, .9], [.55, .72], [.9, .3], [1, -.25], [-.2, -.55], [.35, -.5]];
    fr.forEach(([dx, dy], i) => { const L = 11 * s, ex = tx + dx * L, ey = ty + (dy > 0 ? dy * L * .6 : dy * L * .5), mx = tx + dx * L * .55, my = ty - L * .28 + dy * L * .2;
      const c = ctX_c(leaf, dy < -.3 ? 1 : dy > .6 ? -1.2 : dx < 0 ? .3 : -.5);
      g.strokeStyle = c; g.lineWidth = Math.max(1, 1.7 * s * ctX_V.u); g.beginPath(); g.moveTo(ctX_x(tx), ctX_y(ty)); g.quadraticCurveTo(ctX_x(mx), ctX_y(my), ctX_x(ex), ctX_y(ey)); g.stroke();
      if (s * ctX_V.u > 1.2) { g.lineWidth = 1; g.strokeStyle = ctX_c(leaf, -1.6); g.beginPath(); g.moveTo(ctX_x(mx), ctX_y(my + 1 * s)); g.quadraticCurveTo(ctX_x((mx + ex) / 2), ctX_y((my + ey) / 2 + 1.4 * s), ctX_x(ex), ctX_y(ey + .6 * s)); g.stroke(); } });
    ctX_E(tx, ty + .8 * s, 1.4 * s, 1 * s, ctX_c('#6b4a2a', -.5));
    g.restore(); return;
  }
  if (kind === 'cypress') { const H = 22 * s; ctX_P([x, y - H, x + 2.6 * s, y - H * .55, x + 2.4 * s, y - 1, x - 2.4 * s, y - 1, x - 2.6 * s, y - H * .55], ctX_c(leaf, -.6)); ctX_P([x, y - H, x - 2.6 * s, y - H * .55, x - 2.4 * s, y - 1, x - .5 * s, y - 1, x - .3 * s, y - H * .7], ctX_c(leaf, .5)); return; }
  if (kind === 'pine') { // umbrella pine
    const H = 22 * s; ctX_L(x, y, x + 1 * s, y - H * .8, ctX_c(bark, 0), 1.3 * s); ctX_L(x + .6 * s, y - H * .6, x - 4 * s, y - H * .82, ctX_c(bark, -.5), .8 * s);
    for (const [dx, dy, rx, ry, k] of [[0, -.86, 11, 3.6, -1.1], [-4, -.9, 7, 3, -.2], [4, -.92, 7, 3, -.4], [-1.5, -.97, 7, 2.4, .6], [-5, -.95, 4, 1.8, 1.2]]) ctX_E(x + dx * s, y + dy * H, rx * s, ry * s, ctX_c(leaf, k));
    return;
  }
  // round broadleaf
  const H = 16 * s; ctX_R(x - .7 * s, y - H * .5, 1.4 * s, H * .5, ctX_c(bark, -.5)); ctX_R(x - .7 * s, y - H * .5, .5 * s, H * .5, ctX_c(bark, .4));
  const cl = [[0, -.72, 6.5, 5.5, -1.2], [-3.2, -.66, 4.2, 3.8, -.8], [3.4, -.64, 4.2, 3.6, -1.4], [-1.2, -.84, 5, 4, -.1], [-3, -.8, 3, 2.6, .7], [-1.5, -.95, 2.6, 2, 1.3], [2.2, -.86, 3.2, 2.8, -.5]];
  for (const [dx, dy, rx, ry, k] of cl) ctX_E(x + dx * s, y + dy * H, rx * s, ry * s, ctX_c(leaf, k));
}

// ---------------------------------------------------------------
// ground planes (drawn on the scenery layer, below the ground line)
// ---------------------------------------------------------------
function ctX_gWater(V, o = {}) {
  const wy = o.y || 0, top = Math.round(ctX_y(wy)), c = o.c || '#2f5d86', x0 = o.x0 !== undefined ? Math.round(ctX_x(o.x0)) : 0, x1 = o.x1 !== undefined ? Math.round(ctX_x(o.x1)) : V.fw;
  const cols = V.n ? [mix(V.hz, '#1a2450', .5), mix(c, '#0b1230', .72), mix(c, '#050818', .8)] : [mix(V.hz, c, .45), c, ctX_c(c, -1.6)];
  ctX_banded(x0, top, x1 - x0, V.fh - top, cols, Math.max(5, Math.round((V.fh - top) / 5)));
  if (o.bank) { ctX_R(-400, 0, 800, wy, ctX_c(o.bank, -.6)); ctX_R(-400, 0, 800, Math.min(.8, wy), ctX_c(o.bank, .8)); if (V.u > .9) for (let xx = -300; xx < 300; xx += 6) ctX_R(xx, .8, .35, wy - .8, ctX_c(o.bank, -1.4)); }
}
function ctX_gStreet(V, o = {}) {
  const pave = o.pave || '#b8ad9c', road = o.road || '#56585e', R = clamp(V.bot * .42, 8, 20), pw = o.pw || 2.5;
  V.road = [pw, pw + R]; V.street = 1;
  ctX_R(-400, 0, 800, pw, ctX_c(pave, 0)); ctX_R(-400, 0, 800, .6, ctX_c(pave, -1));
  ctX_banded(0, Math.round(ctX_y(pw)), V.fw, Math.round(R * V.u) + 1, [ctX_c(road, -.6), ctX_c(road, .2)], 5);
  ctX_R(-400, pw, 800, .5, ctX_c(pave, 1.2));
  if (V.u > .9) for (let xx = -300; xx < 300; xx += 12) ctX_R(xx, pw + R / 2, 5, .45, ctX_c('#e6e0cc', V.n ? -1 : 0));
  const near = pw + R; ctX_R(-400, near, 800, 1, ctX_c('#cfc8b8', .5)); ctX_banded(0, Math.round(ctX_y(near + 1)), V.fw, V.fh, [ctX_c(pave, -.3), ctX_c(pave, -1.2)], 4);
  if (V.n) for (const lx of o.lamps || []) { ctX_glow(ctX_x(lx), ctX_y(pw + R * .5), R * V.u * .9, '#ffc070', .22); }
}
function ctX_gPlaza(V, o = {}) {
  const pave = o.pave || '#c8b89c';
  ctX_banded(0, V.gy, V.fw, V.fh - V.gy, [ctX_c(pave, .3), ctX_c(pave, -.2), ctX_c(pave, -.9)], 6);
  g.fillStyle = ctX_c(pave, -1); // joints in perspective toward a far vanishing point
  for (let i = 1; i < 12; i++) { const yy = Math.round(V.gy + (V.fh - V.gy) * (i / 12) ** 1.7); g.fillRect(0, yy, V.fw, 1); }
  g.strokeStyle = ctX_c(pave, -.8); g.lineWidth = 1; const vy = V.gy - V.u * 30;
  for (let i = -14; i <= 14; i++) { const bx = V.ox + i * V.u * 26; g.beginPath(); g.moveTo(V.ox + (bx - V.ox) * (V.gy - vy) / (V.fh - vy), V.gy); g.lineTo(bx, V.fh); g.stroke(); }
  if (o.kerb !== false) { ctX_R(-400, 0, 800, .6, ctX_c(pave, -1.4)); }
}
function ctX_gSand(V, o = {}) {
  const s = o.c || '#e0c08a';
  ctX_banded(0, V.gy, V.fw, V.fh - V.gy, [ctX_c(s, .5), ctX_c(s, 0), ctX_c(s, -.5)], 6);
  const r = ctX_rng('dune' + V.fw);
  for (let i = 0; i < 7; i++) { const cx = (r() - .5) * 220, cy = 2 + r() * V.bot, rw = 18 + r() * 30; ctX_P([cx - rw, cy, cx - rw * .2, cy - 1.6, cx + rw * .1, cy - 1.8, cx + rw, cy], ctX_c(s, .6)); ctX_P([cx + rw * .1, cy - 1.8, cx + rw, cy, cx + rw * .15, cy - .6], ctX_c(s, -.7)); }
}
function ctX_gGrass(V, o = {}) {
  const c = o.c || '#6e9a48';
  ctX_banded(0, V.gy, V.fw, V.fh - V.gy, [ctX_c(c, -.3), ctX_c(c, .2), ctX_c(c, -.4)], 6);
  for (let i = 0; i < 9; i++) { const k = i % 2 ? .5 : -.2, y0 = Math.round(V.gy + (V.fh - V.gy) * (i / 9) ** 1.5), y1 = Math.round(V.gy + (V.fh - V.gy) * ((i + 1) / 9) ** 1.5); g.fillStyle = ctX_c(c, k * .6); g.fillRect(0, y0, V.fw, Math.max(1, y1 - y0)); }
}

// ---------------------------------------------------------------
// small moving things (drawn every frame, in fine pixels via the view)
// ---------------------------------------------------------------
function ctX_car(x, y, col, dir, o = {}) { // x = centre, y = road line (wheels)
  const n = ctX_V.n, L = o.len || 12, s = dir > 0 ? 1 : -1, bx = x - L / 2;
  ctX_R(bx - .5, y - .4, L + 1, .9, 'rgba(0,0,0,.35)');
  if (o.bus) { const H = 9; ctX_R(bx, y - H, L, H - 1, ctX_c(col, 0)); ctX_R(bx, y - H, L, 1, ctX_c(col, 1)); ctX_R(bx, y - 2, L, 1, ctX_c(col, -1.2));
    for (let i = 0; i < 2; i++) for (let k = 1; k < L - 2; k += 2.6) ctX_R(bx + k, y - H + 1.3 + i * 3.6, 1.9, 2, n ? ctX_lamp(.1) : ctX_c('#39465e', 0));
  } else if (o.tram) { const H = 7; ctX_R(bx, y - H, L, H - 1, ctX_c(col, 0)); ctX_R(bx, y - 3.2, L, 1.4, ctX_c('#f0ece0', 0)); ctX_R(bx + L * .5, y - H - 3, .3, 3, ctX_c('#222', 0));
    for (let k = 1; k < L - 2; k += 2.5) ctX_R(bx + k, y - H + 1.2, 1.8, 2.2, n ? ctX_lamp(.3) : ctX_c('#39465e', 0));
  } else {
    const cab = o.old ? [.18, .7] : [.25, .72];
    ctX_P([bx + L * cab[0], y - 3.2, bx + L * (cab[0] + .1), y - 5.4, bx + L * (cab[1] - .1), y - 5.4, bx + L * cab[1], y - 3.2], ctX_c(col, .3));
    ctX_P([bx + L * (cab[0] + .05), y - 3.3, bx + L * (cab[0] + .12), y - 5, bx + L * (cab[1] - .12), y - 5, bx + L * (cab[1] - .04), y - 3.3], n ? '#20243a' : ctX_c('#8fb0cc', 0));
    ctX_R(bx, y - 3.4, L, 2.4, ctX_c(col, 0)); ctX_R(bx, y - 3.4, L, .6, ctX_c(col, 1.2)); ctX_R(bx, y - 1.4, L, .6, ctX_c(col, -1.3));
    if (o.old) { ctX_R(bx - .4, y - 1.7, L + .8, .5, ctX_c('#e8e4dc', 1)); ctX_E(bx + 1.8, y - 3, 1.4, .8, ctX_c(col, .6)); ctX_E(bx + L - 1.8, y - 3, 1.4, .8, ctX_c(col, .6)); }
  }
  for (const wx of [bx + L * .2, bx + L * .8]) { ctX_E(wx, y - .8, 1.05, 1.05, '#16161c'); ctX_E(wx, y - .8, .45, .45, ctX_c('#9a9a9a', 0)); }
  const fx = s > 0 ? bx + L : bx, bk = s > 0 ? bx : bx + L;
  if (n) { ctX_R(fx - s * .6 - (s < 0 ? 0 : 0), y - 2.8, .6, .8, '#fff4c8'); ctX_R(bk - (s > 0 ? 0 : .6), y - 2.8, .6, .8, '#ff4030');
    const X = ctX_x(fx), Y = ctX_y(y - 2.4), gr = g.createLinearGradient(X, 0, X + s * 22 * ctX_V.u, 0); gr.addColorStop(0, 'rgba(255,236,170,.45)'); gr.addColorStop(1, 'rgba(255,236,170,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(X, Y - 1); g.lineTo(X + s * 22 * ctX_V.u, Y + 2 * ctX_V.u); g.lineTo(X + s * 22 * ctX_V.u, Y + 4.5 * ctX_V.u); g.lineTo(X, Y + 1); g.fill(); }
  else ctX_R(fx - (s > 0 ? .5 : 0), y - 2.8, .5, .6, '#fff8e0');
}
const ctX_CLOTH = ['#3a4a6a', '#6a3a3a', '#d8d0c0', '#4a5a3a', '#2a2a30', '#8a6a4a', '#b04a3a', '#5a6a8a'];
function ctX_walker(x, y, s, seed, t, dir) { // a little pedestrian, 8 units tall at s = 1
  const V = ctX_V, cl = ctX_CLOTH[seed % 8], lg = ctX_CLOTH[(seed * 3 + 4) % 8], sk = ['#e0a888', '#b27a58', '#8a5a3e'][seed % 3], ph = Math.sin(t * 7 + seed), sw = ph * 1.1 * s;
  ctX_E(x, y, 2 * s, .5 * s, 'rgba(0,0,0,.25)');
  ctX_L(x - .3 * s, y - 3.4 * s, x - .3 * s + sw, y, ctX_c(lg, -.6), .9 * s); ctX_L(x + .3 * s, y - 3.4 * s, x + .3 * s - sw, y, ctX_c(lg, 0), .9 * s);
  ctX_R(x - 1 * s, y - 6.6 * s, 2 * s, 3.4 * s, ctX_c(cl, 0)); ctX_R(x + (dir > 0 ? -1 : .4) * s, y - 6.6 * s, .6 * s, 3.4 * s, ctX_c(cl, -1));
  ctX_E(x + dir * .15 * s, y - 7.5 * s, .85 * s, .95 * s, ctX_c(sk, V.n ? -1 : 0)); ctX_R(x - .8 * s, y - 8.5 * s, 1.6 * s, .6 * s, ctX_c(seed % 2 ? '#2a1e18' : '#5a3a22', 0));
}
function ctX_birds(V, t, seed) {
  for (let i = 0; i < 3; i++) { const p = (t * .04 + ctX_h(i, seed)) % 1, bx = -110 + p * 220, by = -60 + ctX_h(i, seed + 1) * 20 + Math.sin(t + i) * 2, fl = Math.sin(t * 9 + i * 2) > 0;
    const c = V.n ? '#101428' : '#3a3a4a'; ctX_Lf(bx - 1.2, by + (fl ? -.8 : .4), bx, by, c, 1); ctX_Lf(bx, by, bx + 1.2, by + (fl ? -.8 : .4), c, 1); }
}
function ctX_boat(x, y, s, col, o = {}) { // hull on the water line y
  const L = 14 * s; ctX_P([x - L / 2, y - 2 * s, x + L / 2 + 1.2 * s, y - 2 * s, x + L / 2 - .5 * s, y, x - L / 2 + 1 * s, y], ctX_c(col, 0)); ctX_R(x - L / 2, y - 2 * s, L + 1, .5 * s, ctX_c(col, 1));
  if (o.cabin) { ctX_R(x - L * .25, y - 4.2 * s, L * .45, 2.2 * s, ctX_c('#e8e4da', 0)); ctX_wins(x - L * .23, y - 3.9 * s, L * .41, 1.3 * s, 5, 1, .8 * s, .9 * s, 3, { lit: .8 }); }
  if (o.sail) { ctX_L(x, y - 2 * s, x, y - 14 * s, ctX_c('#d8d0c0', -.5), .4); ctX_P([x + .4, y - 13 * s, x + .4, y - 3 * s, x + 6 * s, y - 3 * s], ctX_c('#f4efe4', .5)); }
  if (o.stack) { ctX_R(x + L * .15, y - 6 * s, 1.6 * s, 2.8 * s, ctX_c(o.stack, 0)); ctX_R(x + L * .15, y - 6 * s, 1.6 * s, .6 * s, ctX_c('#222', 0)); }
}
function ctX_smoke(x, y, t, s, c) { for (let i = 0; i < 5; i++) { const ph = (t * .3 + i / 5) % 1; ctX_E(x + ph * 8 * s + Math.sin(t + i) * .5, y - ph * 12 * s, (1 + ph * 2.4) * s, (.8 + ph * 1.8) * s, mix(c, ctX_V.hz, ph * .7)); } }
function ctX_flag(x, y, t, cols, s = 1, vert) { // pole top at (x, y); cols as horizontal (or vertical) stripes
  const W2 = 7 * s, H2 = 4.6 * s, N = 8;
  for (let i = 0; i < N; i++) { const k = i / N, dy = Math.sin(t * 5 - k * 5) * .6 * s * k;
    for (let j = 0; j < cols.length; j++) { const c = vert ? cols[Math.min(cols.length - 1, Math.floor(k * cols.length))] : cols[j]; ctX_R(x + k * W2, y + dy + (vert ? 0 : j * H2 / cols.length), W2 / N + .05, vert ? H2 : H2 / cols.length, ctX_c(c, Math.sin(t * 5 - k * 5) > .3 ? -.7 : .2)); if (vert) break; } }
}

// the near pavement of a tall street picture: lamp posts, a bin, paving joints; people walk past in front
function ctX_streetFore(V) {
  const y0 = V.road[1] + 1, pv = '#b8ad9c';
  for (let k = 1; k < 6; k++) { const y = y0 + (V.bot - y0) * (k / 6) ** 1.3; ctX_R(-400, y, 800, .35, ctX_c(pv, -1.2)); }
  for (let x = -200; x < 200; x += 16) ctX_Lf(x * .6, y0, x, V.bot, ctX_c(pv, -1), 1);
  for (const lx of [-66, 72]) {
    const by = V.bot - 4, top = -14;
    ctX_E(lx + 3, by + .5, 5, 1, 'rgba(0,0,0,.28)');
    ctX_R(lx - 1.6, by - 3, 3.2, 3, ctX_c('#2c3834', 0)); ctX_R(lx - .8, top, 1.6, by - top, ctX_c('#2c3834', 0)); ctX_R(lx - .8, top, .5, by - top, ctX_c('#2c3834', 1.4));
    ctX_L(lx, top + 1, lx + 5, top - 1, ctX_c('#2c3834', 0), .8); ctX_P([lx + 3, top - 1, lx + 7.5, top - 1, lx + 6.6, top + 2, lx + 3.9, top + 2], ctX_c('#2c3834', .3));
    if (V.n) { ctX_R(lx + 4, top + 1.6, 2.6, 1, '#fff2c0'); ctX_glow(ctX_x(lx + 5.3), ctX_y(top + 3), 22 * V.u, '#ffd080', .35); ctX_glow(ctX_x(lx + 5), ctX_y(by), 18 * V.u, '#ffc870', .25); }
    else ctX_R(lx + 4, top + 1.6, 2.6, .8, ctX_c('#e8e4d0', 0));
  }
  const bx = 20, by = V.bot - 5; ctX_R(bx - 2, by - 6, 4, 6, ctX_c('#3a4a3e', 0)); ctX_R(bx - 2, by - 6, 1, 6, ctX_c('#3a4a3e', 1.2)); ctX_R(bx - 2.3, by - 6.5, 4.6, .8, ctX_c('#3a4a3e', .5));
}
function ctX_streetFront(V, t) { for (let i = 0; i < 3; i++) { const p = (t * .025 + i * .37) % 1, dir = i % 2 ? 1 : -1, x = dir > 0 ? -115 + p * 230 : 115 - p * 230; ctX_walker(x, V.road[1] + 5 + i * 5.5, 1.6 + i * .2, i + 11, t, dir); } }

// ---------------------------------------------------------------
// the 27 cities. Each: sky mood, ground, far layer, the landmark (lm),
// near dressing, optional foreground layer and animation.
// Design units: ground line y = 0, landmark centred on x = 0, ~74 units tall.
// ---------------------------------------------------------------
function ctX_sub(fn) { const V = ctX_V, c = document.createElement('canvas'); c.width = V.fw; c.height = V.fh; drawTo(c.getContext('2d'), fn); g.drawImage(c, 0, 0); }
const ctX_atop = fn => { g.globalCompositeOperation = 'source-atop'; fn(); g.globalCompositeOperation = 'source-over'; };
const ctX_cut = fn => { g.globalCompositeOperation = 'destination-out'; fn(); g.globalCompositeOperation = 'source-over'; };
function ctX_mirror(pts) { const out = pts.slice(); for (let i = pts.length - 2; i >= 0; i -= 2) out.push(-pts[i], pts[i + 1]); return out; }
// gothic / classical helpers
function ctX_pinnacle(x, y, h, w, base) { ctX_P([x - w / 2, y, x + w / 2, y, x, y - h], ctX_c(base, 0)); ctX_P([x, y - h, x + w / 2, y, x + w * .1, y], ctX_c(base, -1.3)); }
function ctX_columns(x0, x1, y, h, step, base, o = {}) { // a colonnade: lit shafts over a shadowed recess
  ctX_R(x0, y, x1 - x0, h, ctX_c(base, o.recess === undefined ? -2.2 : o.recess));
  for (let x = x0 + step * .2; x < x1 - step * .3; x += step) { ctX_R(x, y, step * .55, h, ctX_c(base, .2)); ctX_R(x, y, step * .16, h, ctX_c(base, 1.1)); ctX_R(x + step * .4, y, step * .15, h, ctX_c(base, -.9)); }
}
function ctX_pediment(x0, x1, y, h, base) { ctX_P([x0, y, x1, y, (x0 + x1) / 2, y - h], ctX_c(base, .3)); ctX_P([x0 + 1.2, y - .3, x1 - 1.2, y - .3, (x0 + x1) / 2, y - h + .9], ctX_c(base, -.8)); ctX_R(x0 - .5, y, x1 - x0 + 1, .8, ctX_c(base, 1)); }
function ctX_arches(x0, x1, y, h, n, base, fill) { // an arcade: n arched openings
  const s = (x1 - x0) / n; for (let i = 0; i < n; i++) { const ax = x0 + i * s + s * .18, aw = s * .64; ctX_R(ax, y + aw / 2, aw, h - aw / 2, fill); ctX_E(ax + aw / 2, y + aw / 2, aw / 2, aw / 2, fill); } }

const ctX_CITY = {};
// ---- PARIS: the Eiffel Tower over the Seine, Haussmann roofs ----
ctX_CITY.PAR = { sky: 'clear', flood: 1, water: { y: 3 },
  ground: V => ctX_gWater(V, { y: 3, c: '#46708a', bank: '#cdbf9e' }),
  far: V => { V.fog = .42; ctX_town(-210, -30, 'paris', 'parA'); ctX_town(34, 220, 'paris', 'parB'); V.fog = .25; for (const x of [-26, -19, 20, 27]) ctX_tree(x, 0, .8, 'round', { leaf: '#5c7f44' }); V.fog = 0; },
  lm: V => ctX_sub(() => {
    const base = '#8a6a4c', R = [14, 0, 11.6, -5, 9.8, -10, 8.4, -13.4, 6.9, -18, 5.7, -22.5, 4.8, -26.4, 3.6, -34, 2.6, -44, 1.8, -54, 1.3, -63, .9, -66.5, .45, -70, 0, -74.5];
    const pts = []; for (let i = 0; i < R.length; i += 2) pts.push(R[i], R[i + 1]); ctX_P(ctX_mirror(pts), ctX_c(base, 0));
    ctX_cut(() => { g.beginPath(); g.moveTo(ctX_x(-8.2), ctX_y(0)); g.bezierCurveTo(ctX_x(-6.5), ctX_y(-6), ctX_x(-4), ctX_y(-10.2), ctX_x(0), ctX_y(-10.4)); g.bezierCurveTo(ctX_x(4), ctX_y(-10.2), ctX_x(6.5), ctX_y(-6), ctX_x(8.2), ctX_y(0)); g.fill();
      ctX_P([-4.2, -15.2, 4.2, -15.2, 1.3, -25.2, -1.3, -25.2], '#000'); });
    ctX_atop(() => {
      ctX_R(.2, -80, 16, 80, ctX_c(base, -1.2)); ctX_R(-16, -80, 5, 80, ctX_c(base, .9)); ctX_R(-1.2, -80, 1.4, 80, ctX_c(base, -.4));
      const lc = ctX_c(base, -2.1); g.lineWidth = 1;
      for (let y = -2; y > -63; y -= (y > -26 ? 3.2 : 4.4)) { const w = 15 * Math.exp(y / 22); ctX_Lf(-w, y, w, y - 2.4, lc); ctX_Lf(w, y, -w, y - 2.4, lc); }
      for (const [y, k] of [[-13.4, 1.4], [-26.4, 1.2], [-63, 1]]) { ctX_R(-16, y - .8, 32, 1.4, ctX_c(base, k)); ctX_R(-16, y + .6, 32, .5, ctX_c(base, -2)); }
    });
    if (V.n) { ctX_R(-.3, -76, .6, 1.5, '#fff2c0'); }
  }),
  fore: V => { if (V.bot < 30) return; const y = V.bot - 7; ctX_R(-400, y, 800, 8, ctX_c('#c9b996', -.4)); ctX_R(-400, y, 800, 1.2, ctX_c('#c9b996', 1)); for (let x = -120; x < 120; x += 9) { ctX_R(x, y + 1.5, 4, 5, ctX_c('#c9b996', -1.4)); } ctX_R(-400, y - 1, 800, .7, ctX_c('#3a3a38', 0)); },
  live: (V, t) => { const p = (t * .025) % 1, x = 130 - p * 260; ctX_boat(x, 3 + Math.min(10, V.bot * .45), .9, '#2c3440', { cabin: 1 }); },
};
// ---- LONDON: Westminster and the Elizabeth Tower on the Thames ----
ctX_CITY.LON = { sky: 'grey', flood: 1, glowX: 30, cx: -8, water: { y: 3 }, clouds: 4,
  ground: V => ctX_gWater(V, { y: 3, c: '#4c6468', bank: '#b8a47e' }),
  far: V => { V.fog = .5; ctX_town(-220, 220, 'euro', 'lonA', { hk: 1.1 }); V.fog = .3; ctX_town(60, 200, 'modern', 'lonB', { sc: .8 }); V.fog = 0; },
  lm: V => {
    const st = '#cdb27e', roof = '#56606e';
    // Palace of Westminster: long gothic river front
    ctX_R(-120, -15, 146, 15, ctX_c(st, 0)); ctX_R(-120, -15, 146, 1, ctX_c(st, 1)); ctX_R(-120, -17.5, 146, 2.5, ctX_c(roof, -.3));
    for (let x = -118; x < 24; x += 3.2) { ctX_R(x, -15, .6, 15, ctX_c(st, -1.4)); ctX_R(x + .6, -15, .5, 15, ctX_c(st, .9)); ctX_pinnacle(x + .3, -17.5, 3, 1.1, st); }
    ctX_wins(-118, -13, 140, 12, 44, 3, 1, 2.2, 5, { lit: .5, glass: '#3a4258' });
    // central spire
    ctX_R(-36, -30, 8, 13, ctX_c(st, 0)); ctX_R(-31, -30, 3, 13, ctX_c(st, -1.3)); ctX_P([-36.5, -30, -27.5, -30, -32, -46], ctX_c(roof, .2)); ctX_P([-32, -46, -27.5, -30, -31, -30], ctX_c(roof, -1));
    // Victoria Tower
    ctX_R(-92, -58, 16, 58, ctX_c(st, 0)); ctX_R(-80, -58, 4, 58, ctX_c(st, -1.3)); ctX_R(-92, -58, 1.5, 58, ctX_c(st, 1));
    for (let x = -90; x < -78; x += 2.4) ctX_R(x, -52, .5, 44, ctX_c(st, -1.2));
    ctX_wins(-90, -52, 11, 40, 3, 6, 1.2, 3.2, 8, { lit: .3, glass: '#3a4258' });
    ctX_arches(-88, -79, -12, 12, 1, st, ctX_c(st, -2.4));
    for (const x of [-92, -77]) { ctX_R(x - .4, -64, 1.8, 6, ctX_c(st, 0)); ctX_pinnacle(x + .5, -64, 4, 2, st); }
    ctX_R(-92.2, -59, 16.4, 1.2, ctX_c(st, 1.2)); ctX_R(-84.3, -72, .4, 8, ctX_c('#333', 0));
    // Elizabeth Tower (Big Ben): front face + narrow side face
    const X0 = 24, X1 = 34, X2 = 37;
    ctX_R(X0, -44, X1 - X0, 44, ctX_c(st, .1)); ctX_R(X1, -44, X2 - X1, 44, ctX_c(st, -1.3)); ctX_R(X0, -44, 1, 44, ctX_c(st, 1.1));
    for (let x = X0 + 2; x < X1 - 1; x += 2) ctX_R(x, -42, .5, 40, ctX_c(st, -1.2));
    for (let y = -40; y < 0; y += 6) ctX_R(X0, y, X2 - X0, .5, ctX_c(st, -.8));
    ctX_R(X0 - .8, -56, X1 - X0 + 1.6, 12, ctX_c(st, .2)); ctX_R(X1 + .8, -56, X2 - X1, 12, ctX_c(st, -1.3)); ctX_R(X0 - .8, -56, X2 - X0 + 1.6, 1, ctX_c(st, 1));
    ctX_E(29, -49.8, 4.3, 4.3, ctX_c('#d8b04a', 0)); ctX_E(29, -49.8, 3.6, 3.6, V.n ? '#fff0b8' : ctX_c('#f2ecdc', .3));
    ctX_R(X0 - .8, -60, X2 - X0 + 1.6, 4, ctX_c(st, 0)); ctX_R(X1 + .8, -60, X2 - X1, 4, ctX_c(st, -1.4)); ctX_arches(X0, X1, -59.6, 3.4, 3, st, V.n ? '#ffcf70' : ctX_c(st, -2.5));
    ctX_P([X0 - 1, -60, X2 + .6, -60, 30.2, -71], ctX_c(roof, .3)); ctX_P([30.2, -71, X2 + .6, -60, 31.6, -60], ctX_c(roof, -1.2));
    for (const x of [X0 - .6, X2]) ctX_pinnacle(x, -60, 4, 1.4, '#c9a24a');
    ctX_R(29.9, -75, .6, 4.5, ctX_c('#c9a24a', 0));
  },
  near: V => { V.fog = 0; },
  live: (V, t) => { // the clock shows the game time
    const d = game.startDate ? dateOf(game.t || 0) : new Date(), hr = (d.getHours() % 12 + d.getMinutes() / 60) / 12 * Math.PI * 2, mn = d.getMinutes() / 60 * Math.PI * 2;
    const c = '#20202a'; ctX_Lf(29, -49.8, 29 + Math.sin(hr) * 2, -49.8 - Math.cos(hr) * 2, c, Math.max(1, V.u * .7)); ctX_Lf(29, -49.8, 29 + Math.sin(mn) * 3.1, -49.8 - Math.cos(mn) * 3.1, c, Math.max(1, V.u * .5));
    const p = (t * .02) % 1; ctX_boat(-140 + p * 280, 3 + Math.min(12, V.bot * .5), .8, '#e8e4d8', { cabin: 1 });
    ctX_flag(-84.1, -72, t, ['#1a3a8a', '#e8e8e8', '#c8102e', '#e8e8e8', '#1a3a8a'], .7);
  },
};
// ---- WASHINGTON: the Capitol, the Monument, the reflecting pool ----
ctX_CITY.WAS = { sky: 'deep', flood: 1, water: { y: 4, b: 20 },
  ground: V => { ctX_gGrass(V, { c: '#6f9a4c' }); const b = Math.min(V.bot - 2, 26); ctX_CITY.WAS.water.b = b; ctX_gWater(V, { y: 4, c: '#3f6a92' }); ctX_R(-400, b, 800, V.bot, ctX_c('#6f9a4c', 0)); ctX_R(-400, b, 800, .8, ctX_c('#e6dcc8', .8)); ctX_R(-400, 3.2, 800, .8, ctX_c('#e6dcc8', .8)); },
  far: V => { V.fog = .35; ctX_R(-80, -66, 3.6, 66, ctX_c('#efe8dc', .5)); ctX_R(-78.2, -66, 1.8, 66, ctX_c('#efe8dc', -1)); ctX_P([-80, -66, -76.4, -66, -78.2, -70], ctX_c('#efe8dc', 0));
    V.fog = .2; for (const x of [-120, -104, -76, 78, 96, 116]) ctX_tree(x, 0, 1.15, 'round', { leaf: '#557c3a' }); V.fog = 0; },
  lm: V => {
    const st = '#eee8dc';
    // wings and connectors
    for (const s of [-1, 1]) { const a = s < 0 ? -72 : 30; ctX_R(a, -14, 42, 14, ctX_c(st, 0)); ctX_columns(s < 0 ? -60 : 40, s < 0 ? -40 : 60, -12.5, 11, 2, st); ctX_pediment(s < 0 ? -61 : 39, s < 0 ? -39 : 61, -12.5, 4, st); ctX_R(a, -15.2, 42, 1.2, ctX_c(st, 1)); ctX_R(a, -1, 42, 1, ctX_c(st, -1.5));
      ctX_wins(s < 0 ? -71 : 61, -12, 10, 10, 3, 2, 1.2, 2.6, 3 + s); ctX_wins(s < 0 ? -39 : 31, -12, 9, 10, 3, 2, 1.2, 2.6, 5 + s); }
    ctX_R(-30, -16, 60, 16, ctX_c(st, .1)); ctX_R(-30, -17.4, 60, 1.4, ctX_c(st, 1));
    ctX_R(-18, -21, 36, 21, ctX_c(st, 0)); ctX_R(-18, -22.2, 36, 1.2, ctX_c(st, 1.1)); ctX_columns(-11, 11, -19.5, 16, 2.2, st); ctX_pediment(-12, 12, -19.5, 5.5, st);
    ctX_wins(-29, -14, 11, 12, 4, 2, 1.2, 2.8, 7); ctX_wins(18, -14, 11, 12, 4, 2, 1.2, 2.8, 9);
    for (let i = -2; i <= 2; i++) ctX_R(-6 + i * 1.2, -1.2 - (2 - Math.abs(i)) * 0, 12 - 0, .6, ctX_c(st, -.6 + i * .1));
    // the dome
    ctX_R(-16, -27, 32, 6, ctX_c(st, 0)); ctX_R(-16, -27.6, 32, .9, ctX_c(st, 1.1)); ctX_R(8, -27, 8, 6, ctX_c(st, -1));
    ctX_columns(-14, 14, -37, 10, 1.6, st); ctX_R(-14.6, -38.2, 29.2, 1.4, ctX_c(st, 1)); ctX_R(-12, -42, 24, 4, ctX_c(st, 0)); ctX_R(5, -42, 7, 4, ctX_c(st, -1.2)); ctX_wins(-11, -41.5, 22, 3, 8, 1, 1, 1.8, 11, { lit: .9 });
    ctX_dome(0, -42, 12, 12.5, st, { ribs: [.35, .7, 1], bands: [.35, .7] });
    ctX_cyl(-2.2, -58, 4.4, 5, st); ctX_R(-2.2, -57, 4.4, .4, ctX_c(st, -1.5)); ctX_dome(0, -58, 2.6, 2.2, st); ctX_R(-.35, -62.5, .7, 3, ctX_c('#7a7060', 0));
  },
  live: (V, t) => { for (const x of [-50, 50]) { ctX_R(x - .15, -23, .3, 7.5, ctX_c('#ddd', 0)); ctX_flag(x, -23, t + x, ['#b22234', '#f2f2f2', '#b22234', '#f2f2f2', '#b22234'], .45); ctX_R(x, -23, 1.3, 1.2, ctX_c('#2a3a7a', 0)); } if (V.n && (t * 1.2 | 0) % 2) ctX_R(-78.6, -69, .8, .8, '#ff5050'); },
  fore: V => { if (V.bot < 30) return; ctX_tree(-96, V.bot - 2, 2.2, 'round', { leaf: '#4f7a36' }); ctX_tree(104, V.bot - 2, 2.4, 'round', { leaf: '#4f7a36' }); },
};

// houses climbing a hillside (the higher, the farther: drawn top-down)
function ctX_hillTown(hfn, x0, x1, style, seed, o = {}) {
  const r = ctX_rng('ht' + seed), fr = o.frac || .7, rows = [];
  for (let x = x0; x < x1; x += 3.4 + r() * 2.6) { const top = hfn(x) * fr; for (let y = top; y > 1.5; y -= 3.2 + r() * 1.2) if (r() < (o.dens || .85)) rows.push([x + (r() - .5) * 1.5, -y, 2.8 + r() * 2.4, 2.4 + r() * 1.6, r()]); }
  rows.sort((a, b) => a[1] - b[1]);
  const S = ctX_STY[style] || ctX_STY.med;
  for (const [x, y, w, h, q] of rows) {
    const wall = S.walls[q * S.walls.length | 0];
    ctX_R(x, y - h, w, h, ctX_c(wall, .2)); ctX_R(x + w * .66, y - h, w * .34, h, ctX_c(wall, -1.1));
    if (S.roof && q > .25) { const rc = S.roof[(q * 7 | 0) % S.roof.length]; ctX_R(x - .3, y - h - .9, w + .6, 1, ctX_c(rc, q > .6 ? .3 : -.3)); }
    if (ctX_V.n ? q < (o.lit || .55) : ctX_V.u * w > 4 && q > .4) ctX_R(x + w * .25, y - h * .6, Math.max(.7, w * .22), Math.max(.8, h * .3), ctX_V.n ? ctX_lamp((q * 13) % 1) : ctX_c('#404a5c', 0));
  }
}
function ctX_minaret(x, h, w, base, o = {}) {
  const cap = o.cap || '#6e7a8a', bands = o.balc || [.62, .82];
  ctX_cyl(x - w / 2, -h * .9, w, h * .9, base);
  for (const f of bands) { const y = -h * .9 * f; ctX_R(x - w * .85, y, w * 1.7, w * .35, ctX_c(base, .6)); ctX_R(x - w * .85, y + w * .35, w * 1.7, w * .3, ctX_c(base, -1.6)); if (ctX_V.n && o.lights !== false) for (let k = -1; k <= 1; k++) ctX_R(x + k * w * .55 - .2, y - .5, .5, .5, '#ffe8a8'); }
  ctX_P([x - w * .62, -h * .9, x + w * .62, -h * .9, x, -h], ctX_c(cap, .4)); ctX_P([x, -h, x + w * .62, -h * .9, x + w * .1, -h * .9], ctX_c(cap, -1.2));
  ctX_R(x - .15, -h - 1.5, .3, 1.5, ctX_c('#c8a040', 0));
}
function ctX_crenel(x0, x1, y, s, base) { for (let x = x0; x < x1 - s * .5; x += s * 2) { ctX_R(x, y - s, s, s, ctX_c(base, .2)); ctX_R(x + s * .7, y - s, s * .3, s, ctX_c(base, -1)); } }

// ---- MARSEILLES: Notre-Dame de la Garde above the Vieux-Port ----
const ctX_mrsHill = ctX_peaks([[-12, 30, 70], [70, 16, 55], [-100, 12, 40]], .6, 3);
ctX_CITY.MRS = { sky: 'deep', flood: 1, glowX: -12, water: { y: 3 },
  ground: V => ctX_gWater(V, { y: 3, c: '#2f6a8c', bank: '#d6c29c' }),
  far: V => { V.fog = .2; ctX_ridge(-200, 200, ctX_mrsHill, '#a4a070', {}); V.fog = .1; ctX_hillTown(ctX_mrsHill, -200, 200, 'med', 'mrs', { frac: .85 }); V.fog = 0; ctX_town(-200, 200, 'med', 'mrsq', { hk: .7 }); },
  lm: V => {
    const st = '#e6dcc6', y0 = -30.5, gr = '#6f8a6a';
    ctX_P([-26, y0 + 6, 2, y0 + 6, 0, y0, -24, y0], ctX_c('#c8b894', -.3)); ctX_crenel(-24, 0, y0, 1, '#c8b894');
    ctX_R(-22, y0 - 8, 16, 8, ctX_c(st, 0)); for (let y = y0 - 7; y < y0; y += 2) ctX_R(-22, y, 16, .8, ctX_c(gr, -.2)); ctX_R(-10, y0 - 8, 4, 8, ctX_c(st, -1.3));
    ctX_dome(-18, y0 - 8, 2.4, 2.6, st); ctX_dome(-12.5, y0 - 8, 3, 3.4, st);
    ctX_R(-6, y0 - 22, 5, 22, ctX_c(st, .1)); ctX_R(-2.6, y0 - 22, 1.6, 22, ctX_c(st, -1.3)); ctX_R(-6, y0 - 22, .8, 22, ctX_c(st, 1));
    for (let y = y0 - 20; y < y0; y += 2.4) ctX_R(-6, y, 5, .7, ctX_c(gr, -.4));
    ctX_arches(-5.6, -1.4, y0 - 20, 5, 2, st, V.n ? '#ffd27a' : ctX_c(st, -2.4));
    ctX_R(-5, y0 - 25, 3, 3, ctX_c(st, 0)); ctX_E(-3.5, y0 - 26.5, 1.1, 1.3, ctX_c('#e8b840', 1)); ctX_P([-4.4, y0 - 26, -2.6, y0 - 26, -3.5, y0 - 30], ctX_c('#e8b840', .6)); ctX_E(-3.5, y0 - 30.5, .6, .7, ctX_c('#f4d060', 1));
  },
  near: V => { V.fog = 0; ctX_R(-160, -8, 60, 8, ctX_c('#c8b48e', 0)); ctX_crenel(-160, -100, -8, 1.2, '#c8b48e'); ctX_cyl(-104, -14, 8, 14, '#c8b48e'); ctX_crenel(-104, -96, -14, 1, '#c8b48e'); },
  live: (V, t) => { const y = 3 + Math.min(14, V.bot * .55); for (let i = 0; i < 9; i++) { const x = -95 + i * 23 + ctX_h(i, 4) * 6, bob = Math.sin(t * 1.3 + i * 1.7) * .4; ctX_boat(x, y + bob + (i % 2) * 2.5, .55, ['#f4f0e6', '#2a4a7a', '#e8e0d0', '#a83a2a'][i % 4], { sail: i % 3 !== 1 }); } },
};
// ---- MADRID: the Metropolis building at the head of the Gran Via ----
ctX_CITY.MAD = { sky: 'deep', flood: 1,
  ground: V => ctX_gStreet(V, { pave: '#c4b8a4', lamps: [-60, 0, 60] }),
  far: V => { V.fog = .35; ctX_town(-200, -40, 'euro', 'madA', { hk: 1.3 }); ctX_town(40, 220, 'euro', 'madB', { hk: 1.4 }); V.fog = 0; },
  lm: V => {
    const st = '#e8dcc6', sl = '#2c3040', au = '#d8a840';
    // wings receding along the two streets: tops and window rows converge away from the corner
    const wing = (x0, x1, h0, h1, lit) => { ctX_P([x0, 0, x1, 0, x1, -h1, x0, -h0], ctX_c(st, lit)); ctX_P([x0, -h0, x1, -h1, x1, -h1 - 1.6, x0, -h0 - 1.6], ctX_c(st, lit + .9));
      const N = 7; for (let i = 0; i < N; i++) { const a0 = (i + .25) / N, a1 = (i + .75) / N, xa = x0 + (x1 - x0) * a0, xb = x0 + (x1 - x0) * a1, ha = h0 + (h1 - h0) * a0, hb = h0 + (h1 - h0) * a1;
        for (let j = 0; j < 5; j++) { const f0 = (j + .3) / 5.4, f1 = (j + .8) / 5.4, on = V.n && ctX_h(i * 5 + j, x0 | 0) < .5; ctX_P([xa, -ha * f0, xb, -hb * f0, xb, -hb * f1, xa, -ha * f1], on ? ctX_lamp(ctX_h(j, i)) : ctX_c('#4a5068', lit - .4)); } } };
    wing(-60, -12, 20, 28, .7); wing(12, 60, 28, 20, -1);
    // the rotunda front
    ctX_cyl(-13, -36, 26, 36, st); ctX_R(-13, -36, 26, 1.4, ctX_c(st, 1));
    for (let y = -33; y < -4; y += 7) for (let x = -10; x < 10; x += 5) ctX_R(x + .4, y, 2.4, 4.2, V.n && ctX_h(x * 3 + y, 9) < .6 ? ctX_lamp(ctX_h(x, y)) : ctX_c('#3e4660', x > 2 ? -1 : 0));
    for (const x of [-12.5, -7.5, 7.5, 12.5]) ctX_R(x - .6, -34, 1.2, 12, ctX_c(st, x < 0 ? 1.2 : -.6));
    ctX_R(-11, -40, 22, 4, ctX_c(st, 0)); ctX_R(4, -40, 7, 4, ctX_c(st, -1.3));
    for (const x of [-9.5, -3.5, 3.5, 9.5]) { ctX_R(x - .5, -44, 1, 4, ctX_c(st, 0)); ctX_E(x, -44.8, .7, .9, ctX_c('#3a3a40', 0)); }
    ctX_dome(0, -40, 10.5, 13, sl, { ribs: [.4, .8], bands: [.45] , bandC: au });
    g.save(); ctX_domePath(0, -40, 10.5, 13); g.clip(); for (const f of [-.8, -.4, 0, .4, .8]) ctX_Lf(f * 10.5, -40, f * 4, -52, ctX_c(au, f < 0 ? .5 : -.5), Math.max(1, V.u * .6)); g.restore();
    ctX_cyl(-2, -56, 4, 4, sl); ctX_R(-2.4, -56.5, 4.8, .8, ctX_c(au, 0));
    // winged Victory
    const vc = '#e0b030'; ctX_R(-.5, -61, 1, 4.5, ctX_c(vc, .5)); ctX_E(0, -61.6, .6, .7, ctX_c(vc, .8)); ctX_P([-.3, -60, -4, -64, -3.5, -61.5, -.3, -58.5], ctX_c(vc, .8)); ctX_P([.3, -60, 4, -64.5, 3.6, -62, .3, -58.5], ctX_c(vc, -.5)); ctX_L(.5, -60.5, 2.5, -63.5, ctX_c(vc, 0), .4);
  },
  live: (V, t) => { const y = V.road[0] + (V.road[1] - V.road[0]) * .75, y2 = V.road[0] + (V.road[1] - V.road[0]) * .4;
    for (let i = 0; i < 3; i++) { const p = (t * .06 + i / 3) % 1; ctX_car(-120 + p * 240, y, ['#c83a2a', '#f0ecdf', '#2a3a5a'][i], 1, i === 0 ? { bus: 1, len: 20 } : {}); }
    for (let i = 0; i < 2; i++) { const p = (t * .05 + i / 2 + .3) % 1; ctX_car(120 - p * 240, y2, ['#1a1a1a', '#e8d8a0'][i], -1, {}); } },
};
// ---- ROME: the Colosseum, umbrella pines, St Peter's in the haze ----
ctX_CITY.ROM = { sky: 'haze', flood: 1, glowX: -5,
  ground: V => ctX_gStreet(V, { pave: '#cdb48c', road: '#5a544e', lamps: [-40, 40] }),
  far: V => { V.fog = .5; ctX_town(-200, 200, 'med', 'romA', { hk: 1.2 }); V.fog = .42; ctX_R(-108, -24, 18, 10, ctX_c('#ddd2bc', 0)); ctX_cyl(-106, -30, 14, 6, '#ddd2bc'); ctX_dome(-99, -30, 7, 8.5, '#c8c2b4', { ribs: [.5] }); ctX_cyl(-100.3, -41, 2.6, 3, '#ddd2bc'); ctX_R(-99.2, -44, .5, 3, ctX_c('#ddd2bc', 0));
    V.fog = .3; for (const [x, s] of [[-80, .9], [-66, .8], [96, 1], [110, .8]]) ctX_tree(x, 0, s, 'pine', { leaf: '#4c6e3e' }); V.fog = 0; },
  lm: V => {
    const st = '#dcc49a', X0 = -62, X1 = 62, top = x => x < 16 ? 44 : x < 34 ? 44 - (x - 16) * 1.1 - (Math.sin(x * 1.3) + 1) * 1.5 : 23 - (x - 34) * .05;
    // inner ring seen through the broken side
    ctX_R(8, -34, 50, 34, ctX_c(st, -1.6)); for (let x = 10; x < 56; x += 5) for (const y of [-31, -21]) { ctX_R(x, y, 2.6, 6, ctX_c(st, -2.6)); ctX_E(x + 1.3, y, 1.3, 1.3, ctX_c(st, -2.6)); }
    for (let x = X0; x < X1; x += .5) {
      const f = (x - X0) / (X1 - X0), k = 1.2 - f * 2.6, h = x < 50 ? top(x) : 23 - Math.max(0, x - 58) * 2;
      ctX_R(x, -h, .55, h, ctX_c(st, k));
    }
    // tiers of arches, narrower toward the curving edges; the attic has small windows
    for (const [y0, hh] of [[-10, 8.6], [-20.4, 8.6], [-30.8, 8.6]]) {
      ctX_R(X0, y0 - 1.2, X1 - X0, 1.2, ctX_c(st, .6));
      for (let i = 0; i < 24; i++) { const a = -1 + (i + .5) / 12, x = Math.sin(a * 1.18) / Math.sin(1.18) * 60, w = 2.9 * Math.cos(a * 1.18) + .4;
        if (-y0 - 1 > (x < 50 ? top(x) : 23) - 1.5) continue;
        const fill = V.n ? mix('#ffb45a', '#ff8a3a', ctX_h(i, y0)) : ctX_c(st, -2.4 + (a > 0 ? -.2 : .2));
        ctX_R(x - w / 2, y0 + w / 2, w, hh - w / 2 - .6, fill); ctX_E(x, y0 + w / 2, w / 2, w / 2, fill);
        ctX_R(x + w / 2, y0 - .4, Math.max(.35, 1 * Math.cos(a)), hh, ctX_c(st, a < 0 ? 1.4 : -.4)); }
    }
    ctX_R(X0, -.8, X1 - X0, .8, ctX_c(st, -1.4));
    for (let i = 0; i < 24; i++) { const a = -1 + (i + .5) / 12, x = Math.sin(a * 1.18) / Math.sin(1.18) * 60; if (x < 16) ctX_R(x - .6, -38, 1.2, 1.8, ctX_c(st, -2)); }
  },
  near: V => { V.fog = 0; ctX_tree(-92, 3, 1.35, 'pine', { leaf: '#3f6636' }); ctX_tree(84, 3, 1.2, 'pine', { leaf: '#3f6636' }); ctX_tree(72, 2, .9, 'cypress', { leaf: '#3a5a32' }); },
  live: (V, t) => { const y = V.road[0] + (V.road[1] - V.road[0]) * .7; for (let i = 0; i < 3; i++) { const p = (t * .07 + i * .37) % 1; ctX_car(-120 + p * 240, y, ['#e8d8b0', '#a8302a', '#6a8aa8'][i], 1, { len: i === 1 ? 8 : 10, old: 1 }); } },
};
// ---- BONN: the Minster, the Langer Eugen, the Rhine and the Siebengebirge ----
const ctX_bonHill = ctX_peaks([[-80, 22, 50], [-30, 28, 40], [20, 20, 45], [80, 26, 50], [140, 18, 40]], .8, 1);
ctX_CITY.BON = { sky: 'clear', water: { y: 3 }, cx: 8, clouds: 4, flood: 1, glowX: -20,
  ground: V => ctX_gWater(V, { y: 3, c: '#4c6f6c', bank: '#a8a48c' }),
  far: V => { V.fog = .5; ctX_ridge(-200, 200, ctX_bonHill, '#5f7c4c', {}); V.fog = .45; ctX_R(-31, -31, 2.4, 4, ctX_c('#a09080', 0)); ctX_R(-33, -28.5, 6, 1.5, ctX_c('#a09080', 0));
    V.fog = .3; ctX_town(-200, 200, 'euro', 'bonA', { hk: .7 }); V.fog = 0; },
  lm: V => {
    const st = '#c9b48c', sl = '#4a5566';
    ctX_R(-40, -15, 38, 15, ctX_c(st, 0)); ctX_P([-41, -15, -1, -15, -3, -21, -39, -21], ctX_c(sl, 0)); ctX_R(-40, -15, 38, .8, ctX_c(st, 1));
    for (let x = -38; x < -3; x += 4) { ctX_R(x, -12, 1.6, 4.5, ctX_c('#3a4054', 0)); ctX_E(x + .8, -12, .8, .8, ctX_c('#3a4054', 0)); ctX_R(x + 2.8, -15, .6, 15, ctX_c(st, -1)); }
    // apse and east towers
    ctX_R(-2, -17, 8, 17, ctX_c(st, -.8)); ctX_dome(2, -17, 4, 3, sl);
    for (const x of [-44, 4]) { ctX_R(x, -34, 5, 34, ctX_c(st, .2)); ctX_R(x + 3, -34, 2, 34, ctX_c(st, -1.3)); ctX_R(x + 1.3, -30, 1.4, 3, ctX_c('#3a4054', 0)); ctX_P([x - .4, -34, x + 5.4, -34, x + 2.5, -44], ctX_c(sl, .3)); ctX_P([x + 2.5, -44, x + 5.4, -34, x + 3.2, -34], ctX_c(sl, -1)); }
    // the central crossing tower with its tall spire
    ctX_R(-26, -30, 10, 12, ctX_c(st, .2)); ctX_R(-20, -30, 4, 12, ctX_c(st, -1.3)); ctX_arches(-25, -17, -28, 5, 3, st, ctX_c('#3a4054', 0));
    ctX_P([-27, -30, -15, -30, -21, -58], ctX_c(sl, .4)); ctX_P([-21, -58, -15, -30, -19.8, -30], ctX_c(sl, -1.2)); ctX_R(-21.2, -61, .4, 3, ctX_c('#c8a040', 0));
    // the Langer Eugen office tower
    V.fog = .12; ctX_R(42, -50, 16, 50, ctX_c('#b4b8b8', 0)); ctX_R(53, -50, 5, 50, ctX_c('#b4b8b8', -1.3)); ctX_wins(42.5, -49, 10, 48, 4, 16, 1.6, 1.8, 42, { lit: .5, glass: '#506070' }); ctX_R(41.5, -51.5, 17, 1.5, ctX_c('#9aa0a4', .5)); V.fog = 0;
    for (const x of [-70, -58, 24, 32, 72, 86]) ctX_tree(x, 0, .9, 'round', { leaf: '#5a7c3e' });
  },
  live: (V, t) => { const p = (t * .018) % 1, y = 3 + Math.min(12, V.bot * .5); const x = -150 + p * 300; ctX_R(x - 14, y - 2, 28, 2, ctX_c('#2a2a30', 0)); ctX_R(x - 14, y - 2.4, 28, .5, ctX_c('#a82a2a', 0)); ctX_R(x + 8, y - 5.5, 5, 3.2, ctX_c('#f0ece0', 0)); ctX_R(x + 8.5, y - 4.8, 4, .9, V.n ? '#ffd27a' : '#3a4a5a'); ctX_R(x - 12, y - 3.5, 18, 1.2, ctX_c('#7a6a4a', 0)); },
};
// ---- EAST BERLIN: the Brandenburg Gate, the Wall, the TV tower ----
ctX_CITY.BER = { sky: 'clear', flood: 1, cx: 4,
  ground: V => ctX_gStreet(V, { pave: '#a8a498', road: '#4c4e54', lamps: [-50, 50] }),
  far: V => { V.fog = .45; ctX_town(-200, 200, 'block', 'berA'); V.fog = .25;
    const tv = '#b8b8b8'; ctX_R(66, -54, 2.6, 54, ctX_c(tv, 0)); ctX_R(67.4, -54, 1.2, 54, ctX_c(tv, -1.2)); ctX_ball(67.3, -58, 5.2, '#aab0b8'); ctX_R(62, -58.4, 10.6, .9, ctX_c('#5a5a60', 0)); ctX_R(66.5, -80, 1.6, 17, ctX_c('#d8d8d8', 0)); for (let y = -80; y < -64; y += 3) ctX_R(66.5, y, 1.6, 1.5, ctX_c('#c83a2a', 0));
    V.fog = .15; // the Wall and its lamps
    for (let x = -200; x < 200; x += 18) { ctX_L(x, 0, x, -18, ctX_c('#6a6a70', 0), .5); ctX_L(x, -18, x + 3, -19, ctX_c('#6a6a70', 0), .5); if (V.n) ctX_R(x + 2.4, -19, 1.2, .8, '#fff0c0'); }
    ctX_R(-200, -6, 400, 6, ctX_c('#d4d0c4', 0)); ctX_R(-200, -6.8, 400, 1.2, ctX_c('#e4e0d8', .8)); for (let x = -200; x < 200; x += 2.4) ctX_R(x, -5.5, .25, 5.5, ctX_c('#d4d0c4', -1));
    ctX_R(-86, -22, 3, 22, ctX_c('#b4b0a8', 0)); ctX_R(-89, -28, 9, 6, ctX_c('#b4b0a8', .2)); ctX_R(-88, -27, 7, 2.4, V.n ? '#ffe0a0' : ctX_c('#3a4454', 0)); ctX_R(-89.5, -28.8, 10, .8, ctX_c('#8a8680', 0)); V.fog = 0; },
  lm: V => {
    const st = '#d8ccae';
    ctX_banded(Math.round(ctX_x(-30)), Math.round(ctX_y(-21)), Math.round(60 * V.u), Math.round(21 * V.u), V.n ? ['#5a3a2a', '#c88a4a'] : [ctX_c(st, -3), ctX_c(st, -2)], 6);
    for (let i = 0; i < 6; i++) { const x = -30 + i * 11.2; ctX_R(x, -21, 3.6, 21, ctX_c(st, 0)); ctX_R(x, -21, .9, 21, ctX_c(st, 1.2)); ctX_R(x + 1.6, -21, .4, 21, ctX_c(st, -.6)); ctX_R(x + 2.7, -21, .9, 21, ctX_c(st, -1.3)); ctX_R(x - .4, -21, 4.4, .8, ctX_c(st, .6)); ctX_R(x - .4, -1, 4.4, 1, ctX_c(st, .3)); }
    ctX_R(-32, -26, 64, 5, ctX_c(st, .2)); ctX_R(-32, -26, 64, .8, ctX_c(st, 1.2)); ctX_R(-32, -21.8, 64, .8, ctX_c(st, -1.5)); for (let x = -30; x < 30; x += 3) ctX_R(x, -24.6, 1, 2, ctX_c(st, -1.2));
    ctX_R(-26, -30, 52, 4, ctX_c(st, 0)); ctX_R(-14, -32, 28, 2, ctX_c(st, .4));
    for (const s of [-1, 1]) { const a = s < 0 ? -44 : 32; ctX_R(a, -14, 12, 14, ctX_c(st, s < 0 ? 0 : -.6)); ctX_columns(a + 1, a + 11, -12, 12, 2.4, st); ctX_R(a - .5, -16, 13, 2, ctX_c(st, .8)); }
    // the Quadriga
    const cu = '#4e7a68'; ctX_P([-6, -32, 6, -32, 5, -35, -5, -35], ctX_c(cu, 0));
    for (let i = 0; i < 4; i++) { const x = -5.4 + i * 2.6; ctX_P([x, -35, x + 2.4, -35, x + 2.6, -38.2, x + 1.4, -39.6, x + .6, -38], ctX_c(cu, i < 2 ? .5 : -.4)); }
    ctX_R(-.5, -44, 1, 7, ctX_c(cu, 0)); ctX_E(0, -44.4, .6, .7, ctX_c(cu, .5)); ctX_L(.5, -43, 2.5, -47, ctX_c(cu, 0), .45);
  },
  live: (V, t) => { const y = V.road[0] + (V.road[1] - V.road[0]) * .65; const p = (t * .045) % 1; ctX_car(-120 + p * 240, y, '#c8d0b8', 1, { len: 9 }); const q = (t * .035 + .5) % 1; ctX_car(120 - q * 240, V.road[0] + 3, '#5a6a8a', -1, { len: 9 });
    if (V.n) { const a = Math.sin(t * .6) * .9 - Math.PI / 2, X = ctX_x(-84.5), Y = ctX_y(-26), L = 180 * V.u; const gr = g.createLinearGradient(X, Y, X + Math.cos(a) * L, Y + Math.sin(a) * L); gr.addColorStop(0, 'rgba(230,240,255,.4)'); gr.addColorStop(1, 'rgba(230,240,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(X, Y); g.lineTo(X + Math.cos(a - .06) * L, Y + Math.sin(a - .06) * L); g.lineTo(X + Math.cos(a + .06) * L, Y + Math.sin(a + .06) * L); g.fill(); }
    if (V.n && (t * 1.1 | 0) % 2) ctX_R(66.8, -81.5, 1, 1, '#ff4a3a'); },
};
// ---- VIENNA: St Stephen's patterned roof and spire, the Riesenrad ----
ctX_CITY.VIE = { sky: 'clear', flood: 1, glowX: 15, cx: -6,
  ground: V => ctX_gStreet(V, { pave: '#bcb2a2', lamps: [-40, 30, 90] }),
  far: V => { V.fog = .4; ctX_town(-200, 220, 'euro', 'vieA', { hk: 1.1 }); V.fog = 0; ctX_town(-200, -50, 'euro', 'vieB', { hk: .9 }); ctX_town(62, 220, 'euro', 'vieC', { hk: 1 }); },
  lm: V => ctX_sub(() => {
    const st = '#cfc2a4', r0 = -18;
    ctX_R(-40, r0, 70, -r0, ctX_c(st, 0)); for (let x = -38; x < 28; x += 6) { ctX_R(x + 1.6, r0 + 3, 2.2, 12, ctX_c('#3e4658', 0)); ctX_E(x + 2.7, r0 + 3, 1.1, 1.4, ctX_c('#3e4658', 0)); ctX_R(x, r0, 1, -r0, ctX_c(st, 1)); ctX_R(x + 1, r0, .6, -r0, ctX_c(st, -1.2)); ctX_pinnacle(x + .5, r0, 3, 1.4, st); }
    // the tiled roof: chevrons of green, gold and black
    const roof = [-41, r0, 31, r0, 22, -50, -32, -50];
    ctX_sub(() => { ctX_P(roof, ctX_c('#d8c070', 0));
      ctX_atop(() => { for (let i = 0; i < 9; i++) { const y = r0 - 2 - i * 3.8; for (const [c, off] of [['#2a5e42', 0], ['#1c2026', 1.3]]) { g.strokeStyle = ctX_c(i % 3 === 1 && off === 0 ? '#e6dcc0' : c, 0); g.lineWidth = Math.max(1, V.u * 1.2); g.beginPath(); for (let x = -46; x < 40; x += 9) { g.lineTo(ctX_x(x), ctX_y(y - off)); g.lineTo(ctX_x(x + 4.5), ctX_y(y - off - 3)); } g.stroke(); } }
        ctX_R(-6, -60, 40, 60, 'rgba(20,10,40,.28)'); ctX_R(-44, -60, 8, 60, 'rgba(255,240,200,.12)'); }); });
    // north tower with its Renaissance cap
    ctX_R(-48, -38, 10, 38, ctX_c(st, .2)); ctX_R(-41, -38, 3, 38, ctX_c(st, -1.3)); ctX_arches(-47, -41, -34, 6, 1, st, ctX_c('#3e4658', 0)); ctX_dome(-43, -38, 5, 4, '#4e7a68'); ctX_R(-43.3, -45, .6, 3, ctX_c('#c8a040', 0));
    // the Steffl: the tall south spire
    const X = 34; ctX_R(X - 6, -34, 12, 34, ctX_c(st, .1)); ctX_R(X + 2, -34, 4, 34, ctX_c(st, -1.3)); ctX_R(X - 6, -34, 1, 34, ctX_c(st, 1));
    ctX_P([X - 6, -34, X + 6, -34, X + 4.5, -46, X - 4.5, -46], ctX_c(st, 0)); ctX_P([X + 1.5, -34, X + 6, -34, X + 4.5, -46, X + 1.2, -46], ctX_c(st, -1.3));
    ctX_P([X - 4.5, -46, X + 4.5, -46, X, -76], ctX_c(st, .2)); ctX_P([X, -76, X + 4.5, -46, X + 1, -46], ctX_c(st, -1.3));
    for (let y = -44; y > -70; y -= 3) { const w = 4.5 * (y + 76) / 30; ctX_R(X - w, y, w * 2, .5, ctX_c(st, -1.6)); ctX_pinnacle(X - w - .3, y, 2, .8, st); ctX_pinnacle(X + w + .3, y, 2, .8, st); }
    for (let y = -30; y < -2; y += 7) { ctX_R(X - 2.5, y, 1.8, 4.5, ctX_c('#3e4658', 0)); ctX_pinnacle(X - 6, y, 2.5, 1.2, st); }
  }),
  live: (V, t) => { // the Riesenrad turns; the tram passes
    const cx = -74, cy = -36, R = 26, a0 = t * .06; g.lineWidth = 1;
    ctX_L(cx, cy, cx - 12, 0, ctX_c('#6a4a3a', -.5), .9); ctX_L(cx, cy, cx + 12, 0, ctX_c('#6a4a3a', -.5), .9);
    g.strokeStyle = ctX_c('#8a6a52', 0); g.lineWidth = Math.max(1, V.u * .7); g.beginPath(); g.arc(ctX_x(cx), ctX_y(cy), R * V.u, 0, 7); g.stroke(); g.beginPath(); g.arc(ctX_x(cx), ctX_y(cy), R * .92 * V.u, 0, 7); g.stroke();
    for (let i = 0; i < 15; i++) { const a = a0 + i / 15 * Math.PI * 2; ctX_Lf(cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R, ctX_c('#8a6a52', -.6), 1); }
    for (let i = 0; i < 15; i++) { const a = a0 + i / 15 * Math.PI * 2, gx = cx + Math.cos(a) * R, gy = cy + Math.sin(a) * R; ctX_R(gx - 1.4, gy, 2.8, 2.4, ctX_c('#b83028', 0)); ctX_R(gx - 1.1, gy + .5, 2.2, .9, V.n ? '#ffd88a' : ctX_c('#dce4ec', 0)); }
    ctX_E(cx, cy, 1.4, 1.4, ctX_c('#5a4a3a', 0));
    const y = V.road[0] + (V.road[1] - V.road[0]) * .55, p = (t * .04) % 1; ctX_car(130 - p * 260, y, '#c83a30', -1, { tram: 1, len: 24 });
  },
};
// ---- BELGRADE: Kalemegdan fortress and the Victor above the confluence ----
const ctX_begHill = x => x < 40 ? 20 + Math.sin(x * .1) * 1.5 : Math.max(0, 20 - (x - 40) * .6);
ctX_CITY.BEG = { sky: 'clear', water: { y: 3 }, cx: -10, clouds: 4, flood: 1, glowX: -20,
  ground: V => ctX_gWater(V, { y: 3, c: '#4f7470', bank: '#8a8a6a' }),
  far: V => { V.fog = .45; ctX_town(-200, 220, 'block', 'begA', { hk: .9 }); V.fog = .25; ctX_town(-200, 30, 'euro', 'begB', { y: -18, hk: .9 }); V.fog = 0; },
  lm: V => {
    ctX_ridge(-200, 90, ctX_begHill, '#6a7e48', {});
    const st = '#b8a684';
    ctX_P([-200, -18, 40, -18, 44, -8, -200, -8], ctX_c(st, -.2)); ctX_P([40, -18, 44, -8, 50, -8, 44, -18], ctX_c(st, -1.3)); ctX_crenel(-200, 44, -18, 1.1, st);
    for (const x of [-70, -20, 26]) { ctX_R(x, -24, 8, 16, ctX_c(st, .2)); ctX_R(x + 5, -24, 3, 16, ctX_c(st, -1.2)); ctX_crenel(x, x + 8, -24, 1, st); }
    ctX_R(-46, -34, 7, 16, ctX_c('#d8cdb4', 0)); ctX_R(-41, -34, 2, 16, ctX_c('#d8cdb4', -1.2)); ctX_E(-42.5, -30, 1.8, 1.8, ctX_c('#f0ead8', .5)); ctX_onion(-42.5, -34, 2.8, 7, '#4e7a58'); ctX_R(-42.7, -43, .4, 2, ctX_c('#c8a040', 0));
    for (const x of [-100, -86, -58, 0, 14]) ctX_tree(x, -18, .75, 'round', { leaf: '#557a3a' });
    // the Victor on his column
    const X = 36; ctX_R(X - 3, -22, 6, 4, ctX_c(st, .3)); ctX_cyl(X - 1.2, -50, 2.4, 28, '#d4ccb8'); ctX_R(X - 1.8, -51, 3.6, 1.2, ctX_c('#d4ccb8', .5));
    const br = '#4a6a58'; ctX_R(X - .5, -57, 1.1, 6, ctX_c(br, 0)); ctX_E(X, -57.6, .6, .7, ctX_c(br, .4)); ctX_L(X + .4, -55.5, X + 2.2, -54, ctX_c(br, 0), .4); ctX_L(X - .4, -55.5, X - 1.8, -53, ctX_c(br, 0), .4);
  },
  live: (V, t) => { const p = (t * .015) % 1, y = 3 + Math.min(12, V.bot * .55), x = 150 - p * 300; ctX_R(x - 16, y - 2, 32, 2, ctX_c('#3a2a2a', 0)); ctX_R(x - 14, y - 3.5, 22, 1.5, ctX_c('#6a5a3a', 0)); ctX_R(x - 16, y - 5.5, 5, 3.5, ctX_c('#e8e4d8', 0)); ctX_R(x - 15.5, y - 5, 4, .9, V.n ? '#ffd27a' : '#3a4a5a');
    ctX_flag(-42.6, -45, t, ['#0c4076', '#f0f0f0', '#c6363c'], .45); },
};

// ---- ISTANBUL: the Blue Mosque's cascade of domes over the Bosphorus ----
ctX_CITY.IST = { sky: 'haze', flood: 1, water: { y: 3 }, clouds: 2,
  ground: V => ctX_gWater(V, { y: 3, c: '#35698c', bank: '#b8b0a0' }),
  far: V => { V.fog = .55; ctX_ridge(-200, 200, ctX_peaks([[-60, 12, 90], [70, 14, 90]], .3, 2), '#7a8a6a', {}); ctX_town(-200, 200, 'med', 'istA', { hk: .6 }); V.fog = .2; ctX_town(-200, 200, 'med', 'istB', { hk: .7 }); V.fog = 0; },
  lm: V => {
    const st = '#d6d0c4', ld = '#7d8898';
    ctX_R(-40, -14, 80, 14, ctX_c(st, 0)); ctX_R(-40, -14, 80, .8, ctX_c(st, 1)); ctX_R(22, -14, 18, 14, ctX_c(st, -1));
    ctX_arches(-38, 38, -11, 9, 14, st, ctX_c('#4a5264', 0));
    for (const s of [-1, 1]) { ctX_R(s * 30 - 3, -20, 6, 6, ctX_c(st, s < 0 ? .2 : -.8)); ctX_dome(s * 30, -20, 3.6, 3.4, ld); }
    for (const s of [-1, 1]) { ctX_R(s * 20 - 5, -24, 10, 10, ctX_c(st, s < 0 ? 0 : -.9)); ctX_dome(s * 20, -24, 7.5, 5.5, ld); }
    ctX_R(-15, -30, 30, 16, ctX_c(st, 0)); ctX_R(5, -30, 10, 16, ctX_c(st, -1.1));
    for (const s of [-1, 1]) ctX_dome(s * 11, -30, 7, 5, ld);
    ctX_R(-13, -35, 26, 5, ctX_c(st, .2)); for (let x = -12; x < 12; x += 2) ctX_R(x + .5, -34.4, .9, 3, V.n ? '#ffd68a' : ctX_c('#4a5264', 0));
    ctX_dome(0, -35, 13.5, 10.5, ld, { ribs: [.3, .62, .9] }); ctX_R(-.5, -48.5, 1, 3.2, ctX_c('#d8b040', 0)); ctX_E(0, -48.8, .7, .7, ctX_c('#d8b040', 1));
    for (const s of [-1, 1]) { ctX_R(s * 16 - 1, -38, 2, 3, ctX_c(st, 0)); ctX_dome(s * 16, -38, 1.4, 1.6, ld); }
    V.fog = .15; for (const x of [-52, 52]) ctX_minaret(x, 52, 2, st, { cap: ld, balc: [.6, .75, .88] }); V.fog = 0;
    for (const x of [-44, 44]) ctX_minaret(x, 58, 2.3, st, { cap: ld, balc: [.58, .74, .88] });
  },
  live: (V, t) => { const y = 3 + Math.min(16, V.bot * .6); for (let i = 0; i < 2; i++) { const p = (t * .02 + i * .5) % 1, x = i ? 150 - p * 300 : -150 + p * 300; ctX_boat(x, y - i * 4, .95 - i * .2, '#f0ece2', { cabin: 1, stack: '#1a1a1a' }); ctX_smoke(x + 2.5, y - i * 4 - 6.5, t, .9 - i * .2, V.n ? '#4a4e66' : '#d8d8d8'); } },
};
// ---- CAIRO: the pyramids of Giza and the Sphinx, the city in the haze ----
function ctX_cornerPalms(V, leaf) { if (V.bot < 30) return; const xl = -V.ox / V.u, xr = (V.fw - V.ox) / V.u; ctX_tree(xl + 4, V.bot + 2, 1.9, 'palm', { leaf, lean: .3 }); ctX_tree(xr - 3, V.bot + 2, 1.7, 'palm', { leaf, lean: -.35 }); }
ctX_CITY.CAI = { sky: 'haze', cx: 8, clouds: 1, moonX: .2,
  fore: V => { if (V.bot < 30) return; const s = '#dcb87e', xl = -V.ox / V.u, xr = (V.fw - V.ox) / V.u, y = V.bot;
    ctX_P([xl - 5, y + 2, xl - 5, y - 16, xl + 20, y - 22, xl + 60, y - 12, xl + 95, y + 2], ctX_c(s, .6)); ctX_P([xl + 20, y - 22, xl + 60, y - 12, xl + 95, y + 2, xl + 40, y + 2], ctX_c(s, -1.1));
    ctX_P([xr - 40, y + 2, xr - 30, y - 9, xr - 18, y - 12, xr - 8, y - 6, xr + 4, y + 2], ctX_c('#a88a62', 0)); ctX_P([xr - 18, y - 12, xr - 8, y - 6, xr + 4, y + 2, xr - 16, y + 2], ctX_c('#a88a62', -1.2));
    for (const [x, yy] of [[xl + 12, -18], [xl + 30, -16], [xr - 44, -1]]) { ctX_E(x, y + yy, 3, 1.4, ctX_c('#7a7a4a', -.4)); ctX_E(x - .6, y + yy - .6, 1.8, .8, ctX_c('#7a7a4a', .5)); } },
  ground: V => ctX_gSand(V, { c: '#dcb87e' }),
  far: V => { V.fog = .6; ctX_town(-200, -60, 'arab', 'caiA', { hk: 1.1 }); ctX_minaret(-120, 26, 1.4, '#e0d4bc', { lights: false }); ctX_minaret(-96, 22, 1.2, '#e0d4bc', { lights: false }); ctX_R(-140, -30, 3, 30, ctX_c('#c8c0b0', 0)); V.fog = 0; if (V.n) ctX_glow(ctX_x(-110), ctX_y(0), 70 * V.u, '#ff9a50', .25); },
  lm: V => {
    const s = '#e2c48c', pyr = (x, hb, h, y0 = 0, cap) => {
      ctX_P([x - hb, y0, x, y0 - h, x + hb * .25, y0], ctX_c(s, V.n ? .3 : 1)); ctX_P([x, y0 - h, x + hb, y0, x + hb * .25, y0], ctX_c(s, -1.3));
      g.save(); g.beginPath(); for (const [a, b] of [[x - hb, y0], [x, y0 - h], [x + hb, y0]]) g.lineTo(ctX_x(a), ctX_y(b)); g.clip();
      for (let yy = y0 - 1.6; yy > y0 - h; yy -= 1.6) ctX_R(x - hb, yy, hb * 2, .3, ctX_c(s, -.2));
      if (cap) ctX_R(x - hb, y0 - h, hb * 2, h * cap, ctX_c('#ecdcbc', .6));
      g.restore();
    };
    pyr(84, 16, 20, 0); pyr(40, 30, 40, -2, .16); pyr(-8, 36, 46, 0);
    // the Sphinx
    const sp = '#cfae78'; ctX_P([-66, 0, -46, 0, -46, -3, -52, -4, -60, -4, -66, -3], ctX_c(sp, 0)); ctX_R(-66, -1, 20, 1, ctX_c(sp, -1.2));
    ctX_P([-67, -3, -63, -3, -63, -8, -64, -10, -66.5, -10, -67.5, -8], ctX_c(sp, .6)); ctX_P([-63, -3, -61.5, -4, -61.5, -8, -63, -8], ctX_c(sp, -1)); ctX_R(-66.4, -7.4, 1.2, 1.2, ctX_c(sp, -1.6));
  },
  near: V => { for (const [x, s] of [[-96, 1.1], [-84, .9], [100, 1]]) ctX_tree(x, 1, s, 'palm', { leaf: '#5a7a3a', lean: x < 0 ? .2 : -.2 }); },
  live: (V, t) => { // a camel and rider crossing
    const p = (t * .012) % 1, x = -120 + p * 240, y = Math.min(V.bot - 2, 6 + V.bot * .55), st = Math.sin(t * 4) * .6, c = '#8a6440';
    ctX_E(x, y, 5, .6, 'rgba(60,40,20,.25)');
    for (const [dx, ph] of [[-3, 0], [-2, 2], [2, 1], [3, 3]]) ctX_L(x + dx, y - 5, x + dx + Math.sin(t * 4 + ph) * .8, y, ctX_c(c, -.6), .6);
    ctX_E(x, y - 6, 4.2, 2, ctX_c(c, 0)); ctX_E(x - .5, y - 7.6, 1.8, 1.4, ctX_c(c, .5)); ctX_L(x + 3.6, y - 6.5, x + 5.4, y - 9.5 + st * .3, ctX_c(c, 0), .9); ctX_E(x + 5.9, y - 9.8, 1.1, .6, ctX_c(c, .2));
    ctX_R(x - 1.4, y - 11.5, 1.6, 3, ctX_c('#f0ece0', 0)); ctX_E(x - .6, y - 12.3, .7, .7, ctX_c('#7a5234', 0)); ctX_R(x - 1.2, y - 12.8, 1.4, .5, ctX_c('#e8e0d0', 0));
  },
};
// ---- BEIRUT: the Pigeon Rocks off the corniche, scarred towers on the cliff ----
ctX_CITY.BEY = { sky: 'deep', water: { y: 0 }, cx: 10,
  ground: V => { ctX_gWater(V, { y: -14, c: '#2d6a92' }); },
  far: V => { V.fog = .35; ctX_ridge(-200, 200, ctX_peaks([[-40, 26, 100], [120, 30, 90]], .5, 5), '#8a8a70', { y: -14 }); V.fog = 0; },
  lm: V => {
    const rk = '#d4c09a';
    // the cliff and the corniche on the right
    ctX_P([28, 0, 30, -8, 36, -12, 200, -12, 200, 0], ctX_c(rk, -.3)); ctX_P([28, 0, 30, -8, 34, -10, 33, 0], ctX_c(rk, .7)); ctX_R(34, -13, 170, 1.2, ctX_c('#e8e2d4', .5));
    const r = ctX_rng('beyT'); let x = 38;
    while (x < 200) { const w = 9 + r() * 7, h = 16 + r() * 26, dmg = r() < .5, col = ['#e4dccb', '#d8cbb0', '#c9c2b8'][r() * 3 | 0];
      ctX_R(x, -12 - h, w, h, ctX_c(col, 0)); ctX_R(x + w * .7, -12 - h, w * .3, h, ctX_c(col, -1.2)); ctX_wins(x + .6, -11 - h, w * .66, h - 2, 3, Math.round(h / 3), 1.4, 1.4, x | 0, { lit: .3 });
      if (dmg) for (let i = 0; i < 5; i++) { const hx = x + r() * w * .8, hy = -12 - h + r() * h * .8; ctX_E(hx, hy, .8 + r(), .7 + r() * .6, ctX_c('#2a2420', 0)); }
      if (dmg && r() < .6) ctX_P([x, -12 - h, x + w * .6, -12 - h, x + w * .3, -12 - h + 3], ctX_c('#7ab0d8', 0));
      x += w + 1 + r() * 3; }
    // the two rocks: the great arch and its smaller neighbour
    ctX_P([-62, 0, -60, -12, -56, -16, -50, -15, -47, -9, -46, 0], ctX_c(rk, .2)); ctX_P([-50, -15, -47, -9, -46, 0, -50, 0, -51, -10], ctX_c(rk, -1.2));
    ctX_sub(() => { ctX_P([-26, 0, -25, -18, -20, -28, -10, -32, 0, -30, 6, -24, 10, -14, 11, 0], ctX_c(rk, 0));
      ctX_cut(() => { g.beginPath(); g.moveTo(ctX_x(-14), ctX_y(0)); g.bezierCurveTo(ctX_x(-14), ctX_y(-10), ctX_x(-4), ctX_y(-12), ctX_x(-3), ctX_y(0)); g.fill(); });
      ctX_atop(() => { ctX_R(-2, -40, 14, 40, ctX_c(rk, -1.3)); ctX_R(-27, -40, 5, 40, ctX_c(rk, 1)); for (let i = 0; i < 9; i++) ctX_R(-24 + i * 3.5, -32, .6, 32, ctX_c(rk, i % 2 ? -.8 : .5)); ctX_E(-8, -31, 9, 2.2, ctX_c('#7a8a4a', 0)); ctX_E(-10, -31.8, 5, 1.3, ctX_c('#7a8a4a', .8)); }); });
  },
  near: V => { for (const x of [54, 76, 98]) ctX_tree(x, -12, .7, 'palm', { leaf: '#4a7a3a' }); },
  live: (V, t) => { for (const [x0, x1] of [[-62, -46], [-26, -14], [-3, 11], [28, 34]]) for (let x = x0; x < x1; x += 2) { const a = Math.sin(t * 2 + x * .7); if (a > .1) ctX_R(x, -.6 + a * .2, 1.6, .6, V.n ? 'rgba(160,180,230,.5)' : 'rgba(255,255,255,.8)'); }
    const p = (t * .02) % 1; ctX_boat(-140 + p * 180, 3 + Math.min(10, V.bot * .4), .7, '#e8e4dc', { sail: 1 }); },
};
// ---- AMMAN: the Roman theatre in the hillside, the Citadel's columns ----
const ctX_ammHill = ctX_peaks([[-70, 34, 60], [10, 26, 70], [90, 30, 60]], .4, 7);
ctX_CITY.AMM = { sky: 'haze', flood: 1, clouds: 2,
  ground: V => ctX_gPlaza(V, { pave: '#d8c8a8' }),
  far: V => { V.fog = .3; ctX_ridge(-200, 200, ctX_ammHill, '#c4b08a', {}); ctX_hillTown(ctX_ammHill, -200, 200, 'arab', 'amm', { frac: .92, dens: .95 });
    V.fog = .25; const tc = '#d8c49c'; for (const x of [-78, -73.5, -69]) ctX_cyl(x, -44, 2, 10, tc); ctX_R(-79, -45.5, 12.5, 1.6, ctX_c(tc, .3)); V.fog = 0; },
  lm: V => {
    const st = '#d6c29e', N = 14;
    ctX_P([-64, 0, -60, -24, -50, -40, 50, -40, 60, -24, 64, 0], ctX_c('#c4b08a', -.5)); ctX_P([-64, 0, -60, -24, -50, -40, -46, -40, -55, -24, -58, 0], ctX_c('#c4b08a', .3));
    const band = (yc, rx, ry, th, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(ctX_x(0), ctX_y(yc), rx * V.u, ry * V.u, 0, 0, Math.PI); g.lineTo(ctX_x(-rx), ctX_y(yc + th)); g.ellipse(ctX_x(0), ctX_y(yc + th), rx * V.u, ry * V.u, 0, Math.PI, 0, true); g.closePath(); g.fill(); };
    for (let i = N - 1; i >= 0; i--) { const yc = -9 - i * 2.2, rx = 24 + i * 2.3, ry = 2.4 + i * .18;
      band(yc - .1, rx, ry, 2.5, ctX_c(st, -1.8)); band(yc, rx, ry, 1.5, ctX_c(st, i === 4 || i === 9 ? -.6 : .45)); band(yc, rx, ry, .4, ctX_c(st, 1.2)); }
    for (const a of [-.62, -.25, .25, .62]) ctX_L(a * 25, -7, a * 54, -36, ctX_c(st, -1.3), .6);
    for (const x of [-26, 0, 26]) { ctX_R(x - 1.6, -12, 3.2, 5, ctX_c('#3a3028', 0)); ctX_E(x, -12, 1.6, 1.4, ctX_c('#3a3028', 0)); }
    ctX_R(-26, -6, 52, 6, ctX_c(st, 0)); ctX_R(-26, -6, 52, .8, ctX_c(st, 1)); for (let x = -24; x < 26; x += 5) ctX_cyl(x, -12, 1.8, 6, st);
  },
  near: V => { for (const x of [-70, 70]) ctX_tree(x, 2, .9, 'palm', { leaf: '#5a7a3a' }); },
  front: (V, t) => { for (let i = 0; i < 4; i++) { const p = (t * .03 + i * .27) % 1, dir = i % 2 ? 1 : -1, x = dir > 0 ? -110 + p * 220 : 110 - p * 220; ctX_walker(x, 3 + i * 2.2 + (V.bot > 30 ? i * 4 : 0), V.bot > 30 ? 1.3 : .8, i + 3, t, dir); } },
};
// ---- TEL AVIV: white Bauhaus blocks on the beach, the Shalom Tower, old Jaffa ----
ctX_CITY.TLV = { sky: 'deep', water: { y: -3, x1: 12 }, cx: 22,
  ground: V => { ctX_gWater(V, { y: -3, c: '#2f78a0' }); ctX_P([8, -3, 400, -3, 400, 400, -60, 400, -40, 30, -20, 12], ctX_c('#e8d4a4', 0)); ctX_P([8, -3, -20, 12, -40, 30, -46, 30, -24, 11], ctX_c('#d8c090', -.4)); ctX_P([8, -3, 400, -3, 400, 2, 4, 2], ctX_c('#c8c0b0', 0)); ctX_R(4, 1.2, 400, .8, ctX_c('#c8c0b0', -1)); },
  far: V => { V.fog = .35; const j = '#d8c8a4'; ctX_P([-130, -3, -120, -12, -80, -16, -60, -10, -54, -3], ctX_c('#b8a880', 0)); ctX_town(-120, -64, 'arab', 'tlvJ', { y: -12, hk: .6 }); ctX_R(-96, -34, 3, 20, ctX_c(j, 0)); ctX_P([-96.5, -34, -92.5, -34, -94.5, -38], ctX_c('#a86a4a', 0)); ctX_R(-78, -28, 3, 12, ctX_c(j, .3)); ctX_dome(-76.5, -28, 1.6, 1.6, '#c8b890'); V.fog = 0; },
  lm: V => {
    const wh = '#f0ece2';
    const bau = (x, w, h, round) => { ctX_R(x, -h, w, h, ctX_c(wh, 0)); ctX_R(x + w * .75, -h, w * .25, h, ctX_c(wh, -1.1));
      for (let y = -h + 2; y < -1; y += 3.2) { ctX_R(x - .6, y + 1.8, w * .8, .8, ctX_c(wh, .8)); ctX_R(x - .6, y + 2.6, w * .8, .4, ctX_c(wh, -1.6)); ctX_R(x + 1, y, w * .6, 1.6, V.n && ctX_h(x * 5 + y, 2) < .45 ? ctX_lamp(ctX_h(y, x)) : ctX_c('#4a5a6e', 0)); }
      if (round) { ctX_E(x, -h / 2, 2, h / 2, ctX_c(wh, .6)); ctX_R(x - 2, -h / 2, 2, h / 2, ctX_c(wh, .6)); } ctX_R(x - .5, -h - .8, w + 1, .8, ctX_c(wh, .6)); };
    bau(20, 16, 18, 1); bau(40, 14, 22); bau(95, 18, 26, 1); bau(117, 14, 20);
    const tw = '#c4c0b4'; ctX_R(58, -66, 16, 66, ctX_c(tw, 0)); ctX_R(69, -66, 5, 66, ctX_c(tw, -1.3)); ctX_wins(58.5, -64, 10, 62, 5, 22, 1.2, 1.6, 58, { lit: .5, glass: '#4a6a86' }); ctX_R(57.5, -67.2, 17, 1.2, ctX_c(tw, .8)); ctX_R(64, -72, .6, 5, ctX_c('#888', 0));
    for (const x of [26, 52, 86, 110]) ctX_tree(x, 1, .7, 'palm', { leaf: '#4a7a36' });
  },
  fore: V => { for (const [x, c] of [[-20, '#d8403a'], [-4, '#3a6ab8'], [30, '#e8b838'], [60, '#d8403a']]) { const y = Math.min(V.bot - 3, 10 + V.bot * .25); ctX_L(x, y, x + .4, y - 7, ctX_c('#e8e4dc', 0), .35); ctX_P([x - 5, y - 6.5, x + 5.4, y - 7.5, x + .4, y - 9], ctX_c(c, .3)); ctX_P([x - 5, y - 6.5, x + 5.4, y - 7.5, x + .4, y - 7.3], ctX_c(c, -1)); } },
  live: (V, t) => { for (let i = 0; i < 3; i++) { const k = (t * .2 + i / 3) % 1, d = (1 - k) * 5; g.strokeStyle = `rgba(255,255,255,${(.7 * Math.sin(k * Math.PI)).toFixed(2)})`; g.lineWidth = Math.max(1, V.u * .6); g.beginPath(); g.moveTo(ctX_x(6 - d), ctX_y(-3)); g.lineTo(ctX_x(-22 - d), ctX_y(12)); g.lineTo(ctX_x(-42 - d), ctX_y(31)); g.stroke(); }
    const p = (t * .015) % 1; ctX_boat(-140 + p * 130, -1.5, .6, '#f4f0e8', { sail: 1 }); },
  front: (V, t) => { for (let i = 0; i < 3; i++) { const p = (t * .025 + i * .33) % 1, dir = i % 2 ? 1 : -1, x = dir > 0 ? -100 + p * 200 : 100 - p * 200; ctX_walker(x, Math.min(V.bot - 1, 8 + i * 3 + V.bot * .3), V.bot > 30 ? 1.4 : .8, i + 5, t, dir); } },
};
// ---- DAMASCUS: the Umayyad Mosque below Mount Qasioun ----
const ctX_damHill = ctX_peaks([[-90, 36, 90], [-10, 42, 80], [80, 38, 90]], .5, 9);
ctX_CITY.DAM = { sky: 'haze', flood: 1, clouds: 2,
  ground: V => ctX_gPlaza(V, { pave: '#d4c4a4' }),
  far: V => { V.fog = .4; ctX_ridge(-200, 200, ctX_damHill, '#a89070', {}); ctX_hillTown(ctX_damHill, -200, 200, 'arab', 'dam', { frac: .55, lit: .7 }); V.fog = .2; ctX_town(-200, 200, 'arab', 'damB', { hk: .9 }); V.fog = 0; },
  lm: V => {
    const st = '#d4c09a', ld = '#6f7a82';
    ctX_R(-62, -16, 124, 16, ctX_c(st, 0)); ctX_R(-62, -16, 124, .8, ctX_c(st, 1)); for (let y = -14; y < 0; y += 2.6) ctX_R(-62, y, 124, .5, ctX_c(st, -.6));
    ctX_arches(-60, -14, -12, 9, 9, st, ctX_c('#4a4238', 0)); ctX_arches(14, 60, -12, 9, 9, st, ctX_c('#4a4238', 0));
    ctX_R(-14, -26, 28, 26, ctX_c(st, .1)); ctX_R(6, -26, 8, 26, ctX_c(st, -1.1)); ctX_P([-15, -26, 15, -26, 0, -33], ctX_c(st, .4)); ctX_P([0, -33, 15, -26, 4, -26], ctX_c(st, -1));
    ctX_R(-10, -23, 20, 8, ctX_c('#3a8a6a', 0)); ctX_R(-10, -23, 20, 1.2, ctX_c('#d8b040', .5)); for (let x = -8; x < 8; x += 3) ctX_R(x, -21, 1.6, 5, ctX_c('#d8b040', 0));
    ctX_arches(-12, 12, -13, 13, 3, st, ctX_c('#4a4238', 0));
    ctX_R(-7, -38, 14, 5, ctX_c(st, 0)); ctX_R(3, -38, 4, 5, ctX_c(st, -1.2)); ctX_dome(0, -38, 8.5, 9, ld, { ribs: [.5] });
    ctX_R(-58, -34, 5, 34, ctX_c(st, .2)); ctX_R(-55, -34, 2, 34, ctX_c(st, -1.2)); ctX_minaret(-55.5, 50, 2.6, st, { cap: '#4a8a6a' });
    ctX_R(-26, -30, 5, 30, ctX_c(st, 0)); ctX_R(-23, -30, 2, 30, ctX_c(st, -1.2)); ctX_R(-26.8, -32, 6.6, 2, ctX_c(st, .8)); ctX_dome(-23.5, -32, 2.4, 2.8, ld);
    ctX_R(52, -30, 6, 30, ctX_c(st, 0)); ctX_R(56, -30, 2, 30, ctX_c(st, -1.2)); ctX_minaret(55, 56, 3, st, { cap: ld });
  },
  front: (V, t) => { for (let i = 0; i < 5; i++) { const p = (t * .02 + i * .21) % 1, dir = i % 2 ? 1 : -1, x = dir > 0 ? -110 + p * 220 : 110 - p * 220; ctX_walker(x, 3 + i * 1.8 + (V.bot > 30 ? i * 5 : 0), V.bot > 30 ? 1.4 : .8, i + 1, t, dir); } },
};
// ---- BAGHDAD: the split turquoise dome of the Martyr's Monument ----
function ctX_halfOnion(cx, dir, rx, h, base, lift = 0) { // dir -1 = left half, 1 = right half
  const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20, w = rx * (t < .4 ? Math.sin((t / .4) * Math.PI / 2) ** .6 : Math.cos((t - .4) / .6 * Math.PI / 2) ** 1.3); pts.push(cx + dir * w, -lift - t * h); }
  pts.push(cx, -lift - h, cx, -lift);
  ctX_sub(() => { ctX_P(pts, ctX_c(base, 0)); ctX_atop(() => { for (let i = 0; i < 12; i++) { const f = i / 12, x = cx + dir * rx * f; const k = dir < 0 ? (f > .7 ? 1.3 : f > .35 ? .6 : 0) : (f > .7 ? -2 : f > .35 ? -1.3 : -.6); ctX_R(Math.min(x, x + dir * rx / 12), -lift - h - 1, rx / 12 + .1, h + 2, ctX_c(base, k)); if (i % 2) ctX_R(x, -lift - h, .25, h, ctX_c(base, k - .6)); }
    ctX_R(cx - (dir < 0 ? 1.2 : 0), -lift - h, 1.2, h, ctX_c(base, dir < 0 ? -2.2 : -1.8)); }); });
}
ctX_CITY.BGW = { sky: 'haze', flood: 1, water: { y: 4 }, clouds: 1, fore: V => ctX_cornerPalms(V, '#4f7a34'),
  ground: V => { ctX_gSand(V, { c: '#d8c090' }); ctX_gWater(V, { y: 4, c: '#3e7890' }); const b = Math.min(V.bot - 2, 4 + V.bot * .55); ctX_CITY.BGW.water.b = b; ctX_R(-400, b, 800, V.bot, ctX_c('#d8c090', 0)); ctX_R(-400, b, 800, .8, ctX_c('#e8dcc4', .8)); },
  far: V => { V.fog = .55; ctX_town(-200, 200, 'arab', 'bgwA', { hk: 1 }); ctX_minaret(-90, 30, 1.6, '#e0d4bc', { lights: false }); ctX_onion(-70, -12, 4, 9, '#3a9aa8'); V.fog = .25; for (const x of [-110, -96, 94, 110]) ctX_tree(x, 0, 1, 'palm', { leaf: '#5a7a38' }); V.fog = 0; },
  lm: V => {
    const tq = '#38a8b8';
    ctX_R(-64, -3, 128, 3, ctX_c('#e4dccb', 0)); ctX_R(-64, -3.8, 128, .8, ctX_c('#e4dccb', 1)); ctX_R(-64, -.6, 128, .6, ctX_c('#e4dccb', -1.5));
    ctX_halfOnion(9, 1, 20, 44, tq, 3);
    ctX_R(-1, -14, 2, 11, ctX_c('#9a9a9a', -1)); ctX_R(-.2, -30, .4, 16, ctX_c('#c8c8c8', 0));
    ctX_halfOnion(-9, -1, 20, 40, tq, 3);
  },
  near: V => { for (const x of [-80, 76]) ctX_tree(x, 2, 1.1, 'palm', { leaf: '#557a36' }); },
  live: (V, t) => { for (let i = 0; i < 3; i++) { const f = Math.sin(t * 9 + i * 2); ctX_E(0, -14.5 - i * .6, 1.3 - i * .35, 1.4 + f * .3, ['#ff7a20', '#ffb030', '#fff0a0'][i]); }
    ctX_flag(.2, -30, t, ['#ce1126', '#ffffff', '#1a1a1a'], .6); },
};
// ---- TRIPOLI: the Red Castle over the harbour ----
ctX_CITY.TRP = { sky: 'deep', flood: 1, water: { y: 3 }, cx: -6,
  ground: V => ctX_gWater(V, { y: 3, c: '#2f7496', bank: '#c8b890' }),
  far: V => { V.fog = .4; ctX_town(-200, 220, 'arab', 'trpA', { hk: 1.1 }); ctX_minaret(62, 36, 2, '#e8e0cc', { cap: '#4a8a5a' }); ctX_minaret(96, 30, 1.8, '#e8e0cc', { cap: '#e8e0cc' }); V.fog = .15; ctX_town(40, 220, 'arab', 'trpB', { hk: .9 }); V.fog = 0; },
  lm: V => {
    const rc = '#c8845a';
    ctX_P([-66, 0, -62, -24, 30, -24, 36, 0], ctX_c(rc, 0)); ctX_P([22, -24, 30, -24, 36, 0, 26, 0], ctX_c(rc, -1.2)); ctX_P([-66, 0, -62, -24, -58, -24, -61, 0], ctX_c(rc, .9));
    for (let y = -22; y < 0; y += 3) ctX_R(-64, y, 94, .4, ctX_c(rc, -.6));
    ctX_cyl(-74, -30, 14, 30, rc); ctX_crenel(-74, -60, -30, 1.2, rc); ctX_crenel(-62, 30, -24, 1.2, rc);
    ctX_P([-40, -24, -36, -30, 14, -30, 18, -24], ctX_c(rc, .3)); ctX_P([10, -30, 14, -30, 18, -24, 14, -24], ctX_c(rc, -1.2)); ctX_crenel(-36, 14, -30, 1, rc);
    for (const [x, y] of [[-56, -16], [-40, -12], [-20, -18], [2, -14], [16, -10]]) { ctX_R(x, y, 1.4, 2.2, ctX_c('#3a2a20', 0)); }
    for (const x of [-52, -14, 22]) { ctX_R(x, -22, 2.2, 22, ctX_c(rc, .7)); ctX_R(x + 2.2, -22, 1.4, 22, ctX_c(rc, -1.4)); }
    ctX_R(-50, -34, 22, 10, ctX_c('#ecdcc0', 0)); ctX_R(-34, -34, 6, 10, ctX_c('#ecdcc0', -1.1)); ctX_wins(-48, -32, 14, 6, 4, 1, 1.2, 2.4, 5, { lit: .7 });
    ctX_R(-10, -36, 14, 6, ctX_c('#e8d4b4', 0)); ctX_R(0, -36, 4, 6, ctX_c('#e8d4b4', -1.2)); ctX_arches(-9, 3, -35, 5, 3, '#e8d4b4', V.n ? '#ffcf7a' : ctX_c('#5a4a3a', 0));
    for (const x of [-22, 10, 20]) ctX_tree(x, x > 0 ? -30 : -24, .75, 'palm', { leaf: '#4f7a36' });
    ctX_R(-66.2, -44, .4, 14, ctX_c('#ddd', 0));
  },
  live: (V, t) => { ctX_flag(-66, -44, t, ['#239e46'], .8); const y = 3 + Math.min(12, V.bot * .5); for (let i = 0; i < 4; i++) { const x = -30 + i * 30 + ctX_h(i, 3) * 8; ctX_boat(x, y + (i % 2) * 3 + Math.sin(t * 1.4 + i) * .4, .6, ['#2a6ab0', '#f0ece2', '#e0a030', '#f0ece2'][i], {}); } },
};
// ---- TEHRAN: the Azadi Tower before the snowy Alborz ----
ctX_CITY.THR = { sky: 'haze', flood: 1, clouds: 2,
  ground: V => ctX_gStreet(V, { pave: '#cfc4b0', road: '#56565a', lamps: [-50, 50] }),
  far: V => { V.fog = .42; ctX_ridge(-200, 200, ctX_peaks([[-150, 40, 50], [-110, 48, 45], [-60, 54, 50], [-20, 44, 40], [20, 50, 45], [60, 60, 50], [110, 50, 45], [160, 44, 50]], 1.1, 4), '#8c8a9a', { snow: 36 }); V.fog = .35; ctX_town(-200, 200, 'modern', 'thrA', { sc: .7 }); V.fog = 0; },
  lm: V => ctX_sub(() => {
    const st = '#e6ddca', tq = '#3a9ab0';
    const side = [30, 0, 26, -10, 20, -22, 14, -34, 10, -46, 9, -52];
    const sil = []; for (let i = 0; i < side.length; i += 2) sil.push(-side[i], side[i + 1]); for (let i = side.length - 2; i >= 0; i -= 2) sil.push(side[i], side[i + 1]);
    ctX_P(sil, ctX_c(st, 0)); ctX_R(-10, -60, 20, 8, ctX_c(st, .2)); ctX_R(-10.6, -61, 21.2, 1.2, ctX_c(st, 1));
    ctX_arches(-9, 9, -59, 5, 5, st, ctX_c(tq, -1));
    ctX_cut(() => { g.beginPath(); g.moveTo(ctX_x(-13), ctX_y(0)); g.quadraticCurveTo(ctX_x(-13), ctX_y(-22), ctX_x(0), ctX_y(-34)); g.quadraticCurveTo(ctX_x(13), ctX_y(-22), ctX_x(13), ctX_y(0)); g.fill(); });
    ctX_atop(() => {
      ctX_P([2, 0, 30, 0, 9, -52, 2, -52], ctX_c(st, -1.1)); ctX_P([-30, 0, -24, 0, -9, -52, -10, -52], ctX_c(st, 1));
      for (let k = 0; k < 7; k++) { const y = -36 - k * 2.2; ctX_L(-6 + k * .3, y, 0, y - 2, ctX_c(tq, 0), .4); ctX_L(6 - k * .3, y, 0, y - 2, ctX_c(tq, -.6), .4); }
      g.strokeStyle = ctX_c(st, -1.8); g.lineWidth = Math.max(1, V.u * .6); g.beginPath(); g.moveTo(ctX_x(-15), ctX_y(0)); g.quadraticCurveTo(ctX_x(-15), ctX_y(-24), ctX_x(0), ctX_y(-37)); g.quadraticCurveTo(ctX_x(15), ctX_y(-24), ctX_x(15), ctX_y(0)); g.stroke();
    });
  }),
  live: (V, t) => { const y = V.road[0] + (V.road[1] - V.road[0]) * .7, y2 = V.road[0] + (V.road[1] - V.road[0]) * .35; for (let i = 0; i < 4; i++) { const p = (t * .05 + i / 4) % 1; ctX_car(-120 + p * 240, y, ['#e8e4d8', '#c8a040', '#6a2a2a', '#e8e4d8'][i], 1, { len: 10 }); } for (let i = 0; i < 3; i++) { const p = (t * .04 + i / 3) % 1; ctX_car(120 - p * 240, y2, ['#2a4a6a', '#e8e4d8', '#8a8a8a'][i], -1, { len: 10 }); } },
};

// ---- MIAMI: art deco hotels on Ocean Drive, palms, neon at night ----
ctX_CITY.MIA = { sky: 'deep', clouds: 3,
  ground: V => ctX_gStreet(V, { pave: '#e8d8bc', road: '#5a5a62', lamps: [-70, 0, 70] }),
  far: V => { V.fog = .4; ctX_town(-200, 220, 'modern', 'miaA', { hk: 1.1 }); V.fog = 0; },
  lm: V => {
    const H = [['#f4b8c4', 26, 30, '#ff5aa0'], ['#a8e2d2', 24, 24, '#40e0ff'], ['#f6e4a4', 30, 36, '#ff6a4a'], ['#c8b8ec', 24, 26, '#60ff9a'], ['#f4f0e4', 28, 30, '#ff5aa0']];
    let x = -100;
    H.forEach(([c, w, h, neon], i) => {
      ctX_R(x, -h, w, h, ctX_c(c, 0)); ctX_R(x + w - 3, -h, 3, h, ctX_c(c, -1.1)); ctX_R(x, -h, 1, h, ctX_c(c, 1));
      // stepped crown
      ctX_R(x + w * .3, -h - 3, w * .4, 3, ctX_c(c, .2)); ctX_R(x + w * .4, -h - 5, w * .2, 2, ctX_c(c, .4));
      // eyebrow ledges throwing shadow bands over the windows
      for (let y = -h + 4; y < -4; y += 5) { ctX_R(x + 1, y, w - 2, .8, ctX_c(c, 1.2)); ctX_R(x + 1, y + .8, w - 2, .8, ctX_c(c, -1.5)); ctX_wins(x + 2, y + 1.6, w - 4, 2.6, Math.round(w / 4.5), 1, 2.2, 2.2, i * 13 + y | 0, { lit: .55, glass: '#4a6a80' }); }
      // the central fin with the hotel's name
      ctX_R(x + w / 2 - 1.5, -h - 8, 3, h - 2, ctX_c(c, .6)); ctX_R(x + w / 2 + .6, -h - 8, .9, h - 2, ctX_c(c, -1));
      if (V.n) { ctX_R(x + w / 2 - .6, -h - 7, 1.2, h - 5, neon); ctX_R(x, -h - .4, w, .6, neon); ctX_R(x, -5, w, .5, neon); }
      // porch with awning and café tables
      ctX_R(x + 1, -4, w - 2, 4, ctX_c('#3a3a44', V.n ? 1 : 0)); if (V.n) ctX_R(x + 2, -3.5, w - 4, 3, '#ffcf80');
      ctX_P([x, -4.5, x + w, -4.5, x + w + 1, -3, x - 1, -3], ctX_c(i % 2 ? '#2a8a9a' : '#e8e0d0', 0));
      x += w + 2;
    });
  },
  near: V => { for (const x of [-100, -48, 4, 54, 100]) ctX_tree(x, 2, 1.25, 'palm', { leaf: '#3f8a3a', lean: (x % 3) * .1 }); },
  live: (V, t) => { if (V.n && (t * 3 | 0) % 7 === 0) ctX_R(-100 + 26 + 2 + 24 / 2 - .6, -31, 1.2, 19, 'rgba(0,0,0,.6)');
    const y = V.road[0] + (V.road[1] - V.road[0]) * .7, y2 = V.road[0] + (V.road[1] - V.road[0]) * .35;
    for (let i = 0; i < 2; i++) { const p = (t * .045 + i / 2) % 1; ctX_car(-120 + p * 240, y, ['#f28ab0', '#f4f0e0'][i], 1, { len: 15, old: 1 }); }
    const q = (t * .05) % 1; ctX_car(120 - q * 240, y2, '#40b0c8', -1, { len: 12 }); },
  front: (V, t) => { if (V.bot < 26) return; for (let i = 0; i < 3; i++) { const p = (t * .03 + i * .33) % 1, dir = i % 2 ? 1 : -1, x = dir > 0 ? -110 + p * 220 : 110 - p * 220; ctX_walker(x, V.road[1] + 3 + i * 3, 1.4, i + 2, t, dir); } },
};
// ---- MEXICO CITY: the Metropolitan Cathedral on the Zocalo, the volcanoes ----
ctX_CITY.MEX = { sky: 'haze', flood: 1, clouds: 2,
  ground: V => ctX_gPlaza(V, { pave: '#c4b49a' }),
  far: V => { V.fog = .55; ctX_ridge(-200, 200, ctX_peaks([[-110, 36, 60], [-70, 40, 45], [80, 50, 55]], .5, 6), '#8a8aa0', { snow: 32 }); V.fog = .35; ctX_town(-200, 220, 'latin', 'mexA', { hk: 1.4 }); V.fog = 0; },
  lm: V => {
    const st = '#bcae98', tz = '#9a5848';
    ctX_R(-22, -30, 44, 30, ctX_c(st, 0)); ctX_R(-22, -30, 44, 1, ctX_c(st, 1));
    for (const x of [-15, 0, 15]) { ctX_R(x - 3.5, -16, 7, 16, ctX_c(st, -2)); ctX_E(x, -16, 3.5, 3.5, ctX_c(st, -2)); ctX_R(x - 5, -26, 1, 26, ctX_c(st, .8)); ctX_R(x + 4, -26, 1, 26, ctX_c(st, -1)); }
    ctX_R(-6, -36, 12, 6, ctX_c(st, .2)); ctX_E(0, -33, 2, 2, ctX_c('#e8e0d0', V.n ? 1 : 0)); ctX_P([-6, -36, 6, -36, 0, -39], ctX_c(st, .4));
    ctX_R(-6, -44, 12, 4, ctX_c(st, 0)); ctX_dome(0, -44, 7, 7, '#c8b8a0'); ctX_cyl(-1.4, -54, 2.8, 3, st); ctX_R(-.3, -57, .6, 3, ctX_c('#333', 0));
    for (const s of [-1, 1]) { const x = s * 27;
      ctX_R(x - 6, -36, 12, 36, ctX_c(st, s < 0 ? .3 : -.2)); ctX_R(x + 2.5, -36, 3.5, 36, ctX_c(st, -1.2));
      ctX_R(x - 5, -48, 10, 12, ctX_c(st, s < 0 ? .3 : -.1)); ctX_arches(x - 5, x + 5, -46, 8, 2, st, V.n ? '#ffcf7a' : ctX_c(st, -2.4)); ctX_R(x - 6.5, -36.8, 13, 1.2, ctX_c(st, 1));
      ctX_R(x - 5.8, -49, 11.6, 1, ctX_c(st, 1)); ctX_onion(x, -49, 4.4, 9, '#aaa08e', 1.1); ctX_R(x - .2, -60.5, .4, 2.5, ctX_c('#333', 0)); ctX_R(x - 1, -59.6, 2, .4, ctX_c('#333', 0)); }
    // the Sagrario's red tezontle
    ctX_R(34, -24, 30, 24, ctX_c(tz, 0)); ctX_R(56, -24, 8, 24, ctX_c(tz, -1.2)); ctX_R(42, -26, 14, 26, ctX_c('#d8ccb4', .2)); ctX_R(47, -14, 4, 14, ctX_c('#4a3a30', 0)); for (let y = -24; y < -2; y += 4) ctX_R(43, y, 12, .6, ctX_c('#d8ccb4', -1));
    ctX_R(-64, -22, 40, 22, ctX_c(tz, .2)); ctX_wins(-62, -20, 34, 16, 7, 3, 2, 3, 12, { lit: .5, sill: '#d8ccb4' });
  },
  near: V => { ctX_R(-75.4, -58, .8, 58, ctX_c('#d8d8d8', .5)); ctX_R(-77, -1.5, 4, 1.5, ctX_c('#8a8a8a', 0)); },
  live: (V, t) => { ctX_flag(-75, -58, t, ['#006847', '#f4f4f0', '#ce1126'], 1.6, true); },
  front: (V, t) => { for (let i = 0; i < 5; i++) { const p = (t * .02 + i * .21) % 1, dir = i % 2 ? 1 : -1, x = dir > 0 ? -110 + p * 220 : 110 - p * 220; ctX_walker(x, 3 + i * 2 + (V.bot > 30 ? i * 5 : 0), V.bot > 30 ? 1.4 : .8, i + 4, t, dir); } },
};
// ---- HAVANA: El Morro's lighthouse across the water, the Malecon wall ----
ctX_CITY.HAV = { sky: 'deep', clouds: 4, water: { y: -2, b: 6 }, cx: -24, zoom: 1.2,
  ground: V => ctX_gWater(V, { y: -6, c: '#2a78a8' }),
  far: V => { V.fog = .3; ctX_town(12, 220, 'latin', 'havA', { y: -2, hk: 1.2 }); ctX_R(12, -2, 200, 2, ctX_c('#c8b894', 0)); V.fog = .2; ctX_R(78, -34, 14, 16, ctX_c('#e8e0cc', 0)); ctX_dome(85, -34, 6, 7, '#c8c0b0'); ctX_R(84.6, -44, .8, 3, ctX_c('#c8a040', 0)); V.fog = 0; },
  lm: V => {
    const rk = '#9a8a6e', st = '#d4c098';
    ctX_P([-130, -2, -110, -8, -80, -12, -40, -12, -24, -6, -18, -2], ctX_c(rk, -.3)); ctX_P([-40, -12, -24, -6, -18, -2, -30, -2], ctX_c(rk, -1.3)); ctX_P([-110, -8, -80, -12, -70, -11, -100, -6], ctX_c(rk, .8));
    ctX_P([-100, -12, -44, -12, -40, -18, -96, -18], ctX_c(st, 0)); ctX_P([-48, -12, -40, -18, -38, -12], ctX_c(st, -1.3)); ctX_crenel(-96, -40, -18, 1, st);
    ctX_cyl(-58, -44, 5, 26, '#e8e2d4'); ctX_R(-58.6, -45, 6.2, 1.2, ctX_c('#e8e2d4', .6)); ctX_R(-57.6, -49, 4.2, 4, V.n ? '#fff4c0' : ctX_c('#a8c0d0', 0)); ctX_dome(-55.5, -49, 2.6, 2.4, '#8a4a3a');
  },
  fore: V => { const w = Math.min(V.bot * .45, 16), top = 6; ctX_R(-400, top, 800, 4, ctX_c('#d8d0bc', 0)); ctX_R(-400, top, 800, .8, ctX_c('#d8d0bc', 1.2)); ctX_R(-400, top + 3.2, 800, .8, ctX_c('#d8d0bc', -1.5));
    ctX_banded(0, Math.round(ctX_y(top + 4)), V.fw, V.fh, [ctX_c('#5c5a5c', -.2), ctX_c('#4a4a50', -.6)], 5); if (V.u > .9) for (let x = -300; x < 300; x += 12) ctX_R(x, top + 4 + w * .45, 5, .5, ctX_c('#e0dccc', -.5)); },
  live: (V, t) => { // spray over the sea wall, the lighthouse beam
    for (let i = 0; i < 4; i++) { const ph = (t * .4 + i * .27) % 1; if (ph > .5) continue; const x = -80 + i * 50 + ctX_h(i, 2) * 20, k = ph / .5; for (let j = 0; j < 5; j++) ctX_E(x + (j - 2) * 2.2 * k, 6 - Math.sin(k * Math.PI) * (5 + j % 3), 1.2 * (1 - k * .5), 1 * (1 - k * .5), `rgba(255,255,255,${(.75 * (1 - k)).toFixed(2)})`); }
    if (V.n) { const a = t * 1.2, X = ctX_x(-55.5), Y = ctX_y(-47), L = 120 * V.u, c = Math.cos(a); if (Math.abs(c) > .1) { const dir = c > 0 ? 1 : -1, sp = .05 + .1 * Math.abs(Math.sin(a)); const gr = g.createLinearGradient(X, Y, X + dir * L, Y); gr.addColorStop(0, 'rgba(255,245,200,' + (.45 * Math.abs(c)).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(255,245,200,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(X, Y); g.lineTo(X + dir * L, Y - L * sp); g.lineTo(X + dir * L, Y + L * sp); g.fill(); } } },
  front: (V, t) => { const y = 10 + Math.min(V.bot * .45, 16) * .7; const p = (t * .05) % 1; ctX_car(-120 + p * 240, y, ['#e05a7a', '#40a8c8', '#f0e090'][(t * .05 | 0) % 3], 1, { len: 15, old: 1 });
    for (let i = 0; i < 3; i++) { const x = -60 + i * 45; ctX_R(x, 4.2, 2, 2, ctX_c(ctX_CLOTH[i + 2], 0)); ctX_E(x + 1, 3.4, .9, .9, ctX_c('#8a5a3e', 0)); } },
};
// ---- PANAMA: a freighter in the Miraflores locks, the jungle hills ----
ctX_CITY.PAN = { sky: 'deep', clouds: 5, water: { y: 1, b: 7 }, fore: V => ctX_cornerPalms(V, '#3a7a36'),
  ground: V => { ctX_gWater(V, { y: 0, c: '#3a7078' }); ctX_R(-400, 7, 800, V.bot, ctX_c('#b8b4a8', 0)); ctX_R(-400, 7, 800, 1, ctX_c('#d8d4c8', 1)); ctX_R(-400, 8, 800, 1.2, ctX_c('#b8b4a8', -1.4)); if (V.bot > 20) { ctX_R(-400, 14, 800, V.bot, ctX_c('#6a9a4a', -.2)); for (let y = 16; y < V.bot; y += 5) ctX_R(-400, y, 800, 2.5, ctX_c('#6a9a4a', .3)); } },
  far: V => { V.fog = .5; ctX_ridge(-200, 200, ctX_peaks([[-100, 20, 70], [-20, 26, 60], [90, 22, 70]], .5, 1), '#4a7a4a', {}); V.fog = .4; g.strokeStyle = ctX_c('#5a7a7a', 0); g.lineWidth = Math.max(1, V.u * .8); g.beginPath(); g.moveTo(ctX_x(30), ctX_y(-8)); g.quadraticCurveTo(ctX_x(75), ctX_y(-36), ctX_x(120), ctX_y(-8)); g.stroke(); ctX_R(20, -9, 110, 1, ctX_c('#5a7a7a', 0)); for (let x = 36; x < 116; x += 5) { const yy = -8 - Math.sin((x - 30) / 90 * Math.PI) * 14; ctX_Lf(x, -9, x, yy, ctX_c('#5a7a7a', 0), 1); }
    V.fog = .25; ctX_ridge(-200, 200, ctX_peaks([[-80, 10, 60], [60, 8, 60]], .4, 3), '#3f6e3a', {}); V.fog = 0; },
  lm: V => {
    // the ship: hull, containers, bridge house
    const hull = '#2a3a4a';
    ctX_P([-70, -2, 44, -2, 50, -12, -76, -12], ctX_c(hull, 0)); ctX_R(-76, -12, 126, 1.2, ctX_c(hull, 1)); ctX_R(-72, -4, 118, 2, ctX_c('#a83a2a', 0));
    const cc = ['#c83a2a', '#2a6ab0', '#e8a030', '#3a8a4a', '#d8d4c8', '#8a3a6a'];
    for (let x = -68; x < 18; x += 6.2) for (let j = 0; j < 3; j++) { const c = cc[(ctX_h(x * 3 | 0, j) * 6) | 0]; ctX_R(x, -15.6 - j * 3.6, 6, 3.6, ctX_c(c, 0)); ctX_R(x, -15.6 - j * 3.6, 6, .5, ctX_c(c, 1)); ctX_R(x + 5.4, -15.6 - j * 3.6, .6, 3.6, ctX_c(c, -1.4)); }
    ctX_R(22, -30, 16, 18, ctX_c('#ecead8', 0)); ctX_R(34, -30, 4, 18, ctX_c('#ecead8', -1.2)); ctX_wins(23, -29, 10, 16, 4, 4, 1.4, 1.6, 22, { lit: .7 }); ctX_R(20, -31, 20, 1.2, ctX_c('#ecead8', .8)); ctX_R(28, -38, 4, 7, ctX_c('#c83a2a', 0)); ctX_R(28, -38, 4, 1, ctX_c('#222', 0));
    // lock control house
    ctX_R(70, -20, 26, 20, ctX_c('#e8e2d0', 0)); ctX_R(90, -20, 6, 20, ctX_c('#e8e2d0', -1.2)); ctX_P([69, -20, 97, -20, 94, -24, 72, -24], ctX_c('#b8583a', 0)); ctX_wins(71, -18, 18, 14, 5, 3, 1.6, 2.6, 70);
    ctX_R(80, -32, 6, 12, ctX_c('#e8e2d0', .2)); ctX_E(83, -28, 1.6, 1.6, ctX_c('#f4f0e0', 1)); ctX_P([79.5, -32, 86.5, -32, 83, -35], ctX_c('#b8583a', 0));
    for (const x of [-100, 108]) ctX_tree(x, 0, 1, 'palm', { leaf: '#3a7a36' });
  },
  live: (V, t) => { for (let i = 0; i < 2; i++) { const x = -60 + ((t * 3 + i * 70) % 140); ctX_R(x, 5, 6, 2.4, ctX_c('#b8c0c8', 0)); ctX_R(x + 1, 3.8, 3, 1.4, ctX_c('#b8c0c8', .5)); ctX_R(x, 6.6, 6, .5, ctX_c('#333', 0)); } },
};
// ---- BOGOTA: Monserrate's white church high above the city, the cable car ----
const ctX_bogP = ctX_peaks([[-30, 64, 50], [50, 54, 45], [-110, 48, 60], [120, 46, 60], [10, 42, 40], [-160, 40, 50], [170, 40, 50]], 1, 8), ctX_bogMtn = x => Math.abs(x + 30) < 3 ? ctX_bogP(-30) : ctX_bogP(x);
ctX_CITY.BOG = { sky: 'clear', clouds: 5,
  ground: V => ctX_gStreet(V, { pave: '#b8ac98', lamps: [-50, 40] }),
  far: V => { V.fog = .28; ctX_ridge(-200, 200, ctX_bogMtn, '#3f6a42', {}); V.fog = .24; const ty = -ctX_bogMtn(-30);
    ctX_R(-35, ty - 4, 10, 4, ctX_c('#f0ece4', 0)); ctX_P([-35.5, ty - 4, -24.5, ty - 4, -30, ty - 6], ctX_c('#b8583a', 0)); ctX_R(-35, ty - 9, 3, 5, ctX_c('#f0ece4', .3)); ctX_R(-28, ty - 9, 3, 5, ctX_c('#f0ece4', -.3));
    ctX_Lf(-60, -6, -31, ty - 1, ctX_c('#3a3a3a', 0), 1); V.fog = .15; ctX_town(-200, 220, 'latin', 'bogA', { hk: 1.2 }); V.fog = 0; },
  lm: V => {
    const br = '#a4553a';
    const tower = (x, w, h) => { ctX_R(x, -h, w, h, ctX_c(br, 0)); ctX_R(x + w * .7, -h, w * .3, h, ctX_c(br, -1.2)); ctX_E(x + w * .5, -h, w * .5, 1.2, ctX_c(br, .6)); for (let y = -h + 2; y < -1; y += 2.6) { ctX_R(x, y, w, .5, ctX_c(br, .8)); ctX_wins(x + 1, y + .8, w * .7 - 1.4, 1.3, Math.round(w / 3), 1, 1.3, 1.2, x * 7 + y | 0, { lit: .5 }); } };
    tower(-70, 12, 34); tower(-54, 11, 42); tower(-40, 12, 30);
    ctX_R(20, -54, 14, 54, ctX_c('#c8c4bc', 0)); ctX_R(30, -54, 4, 54, ctX_c('#c8c4bc', -1.2)); ctX_wins(21, -52, 9, 50, 4, 18, 1.4, 1.8, 20, { lit: .55, glass: '#40586e' });
    ctX_R(40, -30, 16, 30, ctX_c('#d8d0c0', 0)); ctX_R(52, -30, 4, 30, ctX_c('#d8d0c0', -1.2)); ctX_wins(41, -28, 11, 26, 4, 8, 1.6, 2, 40);
    ctX_R(-20, -14, 32, 14, ctX_c('#ece4d4', 0)); ctX_P([-21, -14, 13, -14, 10, -18, -18, -18], ctX_c('#a8503a', 0)); ctX_wins(-18, -12, 28, 10, 7, 2, 1.8, 3, 9, { sill: '#f4f0e8' });
  },
  live: (V, t) => { const ty = -ctX_bogMtn(-30), p = (t * .03) % 1, k = p < .5 ? p * 2 : 2 - p * 2; V.fog = .24; const x = -60 + k * 29, y = -6 + k * (ty + 5); ctX_R(x - 1.2, y + .6, 2.4, 1.8, ctX_c('#c83a2a', 0)); V.fog = 0;
    const ry = V.road[0] + (V.road[1] - V.road[0]) * .65; for (let i = 0; i < 2; i++) { const q = (t * .05 + i / 2) % 1; ctX_car(-120 + q * 240, ry, ['#e8c040', '#3a8ab0'][i], 1, i ? {} : { bus: 1, len: 16 }); } },
};
// ---- MEDELLIN: the Coltejer needle in the green valley, lights on the hills ----
const ctX_medHill = x => 16 + Math.abs(x) * .22 + Math.sin(x * .05) * 4;
ctX_CITY.MED = { sky: 'deep', clouds: 4,
  ground: V => ctX_gStreet(V, { pave: '#bcae96', lamps: [-60, 30] }),
  far: V => { V.fog = .45; ctX_ridge(-200, 200, x => ctX_medHill(x) + 10, '#4a7a48', {}); V.fog = .3; ctX_ridge(-200, 200, ctX_medHill, '#548a4a', {}); ctX_hillTown(ctX_medHill, -200, 200, 'latin', 'med', { frac: .8, lit: .7 }); V.fog = .15; ctX_town(-200, 220, 'brick', 'medA', { hk: .7 }); V.fog = 0; },
  lm: V => ctX_sub(() => {
    const wh = '#e4e4e0';
    ctX_R(-6, -52, 12, 52, ctX_c(wh, 0)); ctX_R(2, -52, 4, 52, ctX_c(wh, -1.2)); ctX_wins(-5.5, -50, 7.5, 48, 3, 17, 1.4, 1.6, 77, { lit: .55, glass: '#4a6076' });
    ctX_P([-6, -52, 6, -52, 0, -76], ctX_c(wh, .2)); ctX_P([0, -76, 6, -52, 1.2, -52], ctX_c(wh, -1.2));
    ctX_cut(() => ctX_P([-1.2, -56, 1.2, -56, .5, -70, -.5, -70], '#000'));
    const br = '#a0543c'; for (const [x, w, h] of [[-36, 12, 32], [-22, 10, 40], [14, 12, 36], [30, 14, 28]]) { ctX_R(x, -h, w, h, ctX_c(br, 0)); ctX_R(x + w * .7, -h, w * .3, h, ctX_c(br, -1.2)); ctX_wins(x + 1, -h + 1.5, w * .66, h - 3, 3, Math.round(h / 3), 1.4, 1.5, x * 3, { lit: .5 }); }
  }),
  live: (V, t) => { const ry = V.road[0] + (V.road[1] - V.road[0]) * .65; for (let i = 0; i < 3; i++) { const q = (t * .05 + i / 3) % 1; ctX_car(120 - q * 240, ry, ['#e8c040', '#d8d8d0', '#2a5a8a'][i], -1, {}); } },
};
// ---- LIMA: the cathedral and the carved balconies under a grey garua sky ----
ctX_CITY.LIM = { sky: 'grey', clouds: 5, flood: 1,
  ground: V => ctX_gPlaza(V, { pave: '#bcb2a0' }),
  far: V => { V.fog = .4; ctX_town(-200, 220, 'latin', 'limA', { hk: 1.2 }); V.fog = 0; },
  lm: V => {
    const st = '#e4d0a4', sl = '#4a4e56', wd = '#5a3a26';
    ctX_R(-24, -30, 48, 30, ctX_c(st, 0)); ctX_R(-24, -30, 48, 1, ctX_c(st, 1));
    ctX_R(-7, -26, 14, 26, ctX_c('#d0c4a8', .3)); ctX_R(-4, -14, 8, 14, ctX_c('#3a2a20', 0)); ctX_E(0, -14, 4, 4, ctX_c('#3a2a20', 0)); for (let y = -26; y < -16; y += 2.5) ctX_R(-7, y, 14, .5, ctX_c('#d0c4a8', -1)); ctX_E(0, -22, 1.6, 1.6, ctX_c('#3a2a20', 0));
    for (const x of [-17, 13]) { ctX_R(x, -12, 4, 12, ctX_c('#3a2a20', 0)); ctX_E(x + 2, -12, 2, 2, ctX_c('#3a2a20', 0)); }
    for (const s of [-1, 1]) { const x = s * 30;
      ctX_R(x - 7, -44, 14, 44, ctX_c(st, s < 0 ? .3 : -.2)); ctX_R(x + 3, -44, 4, 44, ctX_c(st, -1.2)); ctX_R(x - 7, -44, 14, 1, ctX_c(st, 1));
      ctX_R(x - 5.5, -52, 11, 8, ctX_c(st, .2)); ctX_arches(x - 5.5, x + 5.5, -51, 6, 2, st, V.n ? '#ffd27a' : ctX_c(st, -2.4));
      ctX_P([x - 6.5, -52, x + 6.5, -52, x, -62], ctX_c(sl, .3)); ctX_P([x, -62, x + 6.5, -52, x + 1, -52], ctX_c(sl, -1)); ctX_R(x - .2, -65, .4, 3, ctX_c('#333', 0)); }
    // Archbishop's palace with its wooden balconies
    const yl = '#e8c070'; ctX_R(38, -26, 70, 26, ctX_c(yl, 0)); ctX_R(38, -26, 70, 1, ctX_c(yl, 1)); ctX_wins(40, -10, 66, 8, 9, 1, 2.4, 5, 38, { sill: '#f4ecd8' });
    for (const x of [44, 76]) { ctX_R(x, -23, 24, 9, ctX_c(wd, 0)); ctX_R(x, -23, 24, 1, ctX_c(wd, 1)); ctX_R(x, -14.8, 24, .8, ctX_c(wd, -1.5)); for (let k = x + 1.5; k < x + 23; k += 3) { ctX_R(k, -21.5, 2.2, 5.5, V.n ? ctX_lamp(ctX_h(k, 4) * .6) : ctX_c(wd, -1.4)); ctX_R(k + .9, -21.5, .4, 5.5, ctX_c(wd, .6)); } }
    ctX_R(-100, -22, 60, 22, ctX_c('#d8c8b0', 0)); ctX_arches(-100, -40, -10, 10, 8, '#d8c8b0', ctX_c('#4a3a30', 0)); ctX_wins(-98, -20, 56, 7, 8, 1, 2.2, 4, 3, { sill: '#f0e8d8' });
  },
  near: V => { for (const x of [-60, 60]) ctX_tree(x, 2, 1, 'palm', { leaf: '#4a7a3e' }); const f = '#6a5a3a'; ctX_R(-6, -2, 12, 2, ctX_c('#a89a80', 0)); ctX_R(-1, -9, 2, 7, ctX_c(f, 0)); ctX_E(0, -6, 5, 1, ctX_c(f, .3)); ctX_E(0, -9.5, 1.5, 1.5, ctX_c(f, .5)); },
  live: (V, t) => { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + t; const k = (t * 1.5 + i / 6) % 1; ctX_R(Math.cos(a) * 3 * k, -10 + k * k * 8 - k * 4, .5, .5, 'rgba(200,220,255,.8)'); } },
  front: (V, t) => { for (let i = 0; i < 4; i++) { const p = (t * .02 + i * .27) % 1, dir = i % 2 ? 1 : -1, x = dir > 0 ? -110 + p * 220 : 110 - p * 220; ctX_walker(x, 3 + i * 2 + (V.bot > 30 ? i * 5 : 0), V.bot > 30 ? 1.4 : .8, i + 6, t, dir); } },
};
// ---- MONTEVIDEO: the Palacio Salvo over the Plaza Independencia ----
ctX_CITY.MVD = { sky: 'clear', clouds: 4, flood: 1, cx: 6,
  ground: V => ctX_gPlaza(V, { pave: '#b8b0a0' }),
  far: V => { V.fog = .4; ctX_town(-200, 220, 'euro', 'mvdA', { hk: 1.2 }); V.fog = 0; },
  lm: V => {
    const st = '#d4c8b0';
    ctX_R(-24, -32, 48, 32, ctX_c(st, 0)); ctX_R(16, -32, 8, 32, ctX_c(st, -1.2)); ctX_R(-24, -32, 1, 32, ctX_c(st, 1)); ctX_wins(-23, -30, 38, 28, 10, 9, 1.6, 2, 44, { sill: '#e8e0d0' });
    ctX_R(-25, -33, 50, 1.4, ctX_c(st, .8)); for (const x of [-24, 20]) ctX_cyl(x, -38, 4, 6, st);
    ctX_R(-12, -50, 24, 18, ctX_c(st, .1)); ctX_R(6, -50, 6, 18, ctX_c(st, -1.2)); ctX_wins(-11, -48, 16, 16, 5, 6, 1.4, 1.8, 45);
    ctX_R(-8, -58, 16, 8, ctX_c(st, .2)); ctX_R(4, -58, 4, 8, ctX_c(st, -1.2)); ctX_arches(-8, 8, -57, 6, 4, st, V.n ? '#ffd27a' : ctX_c(st, -2.2));
    ctX_cyl(-5, -64, 10, 6, st); ctX_R(-5.5, -64.8, 11, 1, ctX_c(st, 1)); ctX_dome(0, -64.8, 4.6, 4.4, '#8a9a9a'); ctX_cyl(-1, -72, 2, 3, st); ctX_R(-.25, -80, .5, 8, ctX_c('#555', 0));
  },
  near: V => { const b = '#3a4a3a'; ctX_R(-60, -8, 12, 8, ctX_c('#c8c0b0', 0)); ctX_R(-60, -8, 12, .8, ctX_c('#c8c0b0', 1));
    ctX_E(-54, -12, 4, 2.2, ctX_c(b, .2)); ctX_L(-57, -11, -57.4, -8, ctX_c(b, 0), .7); ctX_L(-51, -11, -50, -8, ctX_c(b, -.5), .7); ctX_E(-50, -14, 1.2, 1.8, ctX_c(b, .4)); ctX_R(-55, -17, 2, 4.5, ctX_c(b, .3)); ctX_E(-54, -17.6, .9, .9, ctX_c(b, .5));
    for (const x of [-90, 80, 96]) ctX_tree(x, 2, 1.05, 'palm', { leaf: '#4a7a3e' }); },
  live: (V, t) => { if (V.n && (t | 0) % 2) ctX_R(-.4, -80.5, .8, .8, '#ff4040'); },
  front: (V, t) => { for (let i = 0; i < 4; i++) { const p = (t * .02 + i * .27) % 1, dir = i % 2 ? 1 : -1, x = dir > 0 ? -110 + p * 220 : 110 - p * 220; ctX_walker(x, 3 + i * 2 + (V.bot > 30 ? i * 5 : 0), V.bot > 30 ? 1.4 : .8, i + 1, t, dir); } },
};

// ---------------------------------------------------------------
// CITY PICTURE machinery: three cached layers + animation between them
// ---------------------------------------------------------------
const ctX_layerCache = new Map();
function ctX_layers(c, S, w, h, n) {
  const key = 'ctX' + c.id + w + 'x' + h + (n ? 'n' : 'd');
  let L = ctX_layerCache.get(key); if (L) return L;
  const fw = w * RES, fh = h * RES, gy = Math.round(fh * (fh > 150 ? .7 : .8)), cols = (ctX_SKIES[S.sky] || ctX_SKIES.clear)[n ? 'n' : 'd'];
  const u = Math.min(fw / 180, gy / 74) * (S.zoom || 1);
  const V = { fw, fh, gy, u, ox: fw / 2 - (S.cx || 0) * u, n, fog: 0, flood: false, hz: mix(cols[cols.length - 2], cols[cols.length - 1], .5), bot: (fh - gy) / u };
  L = { V };
  const run = fn => () => { const pv = ctX_V; ctX_V = V; V.fog = 0; V.flood = false; try { fn(); } finally { V.fog = 0; V.flood = false; ctX_V = pv; } };
  L.back = art(key + 'b', w, h, run(() => ctX_skyPaint(V, S)));
  L.mid = art(key + 'm', w, h, run(() => {
    if (S.ground) S.ground(V);
    if (S.far) S.far(V);
    V.fog = 0;
    if (n && S.flood) ctX_glow(ctX_x(S.glowX || 0), ctX_y(-24), 60 * V.u, '#ffb060', .28);
    V.flood = n && !!S.flood; S.lm(V); V.flood = false; V.fog = 0;
    if (S.near) S.near(V);
  }));
  const foreFn = S.fore || (V.street && V.bot > 30 ? ctX_streetFore : null);
  L.fore = foreFn ? art(key + 'f', w, h, run(() => foreFn(V))) : null; L.front = S.front || (V.street && V.bot > 30 ? ctX_streetFront : null);
  // clouds: a few per city, sized to the picture
  const r = ctX_rng(c.id + 'cl'), nc = S.clouds === undefined ? 3 : S.clouds;
  L.clouds = [];
  for (let i = 0; i < nc; i++) { const ch = Math.max(5, Math.round(V.gy / RES * (.13 + r() * .1))), cw = Math.min(Math.round(w * .45), Math.round(ch * (2.8 + r() * 1.2))); L.clouds.push({ spr: ctX_cloudArt(c.id + i + (n ? 'n' : 'd') + cw + S.sky, cw, ch, n, S.sky, c.id + i), x: r(), y: r() * .6, v: .6 + r() * .8, cw: cw * RES, ch: ch * RES }); }
  ctX_layerCache.set(key, L); return L;
}
function ctX_reflect(L, S, V, t) {
  const o = S.water, wt = Math.round(ctX_y(o.y || 0)), wb = o.b !== undefined ? Math.round(ctX_y(o.b)) : V.fh;
  const x0 = o.x0 !== undefined ? Math.max(0, Math.round(ctX_x(o.x0))) : 0, x1 = o.x1 !== undefined ? Math.min(V.fw, Math.round(ctX_x(o.x1))) : V.fw;
  g.save(); g.beginPath(); g.rect(x0, wt, x1 - x0, wb - wt); g.clip();
  g.globalAlpha = V.n ? .55 : .36;
  for (let yy = wt, d = 0; yy < wb; yy += 2, d += 2) {
    const sy = wt - 2 - d * (o.sq || 1) | 0; if (sy < 0) break;
    const off = Math.round(Math.sin(t * 1.7 + yy * .45) * (.6 + d * .05));
    g.drawImage(L.mid, 0, sy, V.fw, 2, off, yy, V.fw, 2);
  }
  g.globalAlpha = 1;
  // glints: short bright dashes that come and go
  const N = Math.round((x1 - x0) * (wb - wt) / 260);
  for (let i = 0; i < N; i++) {
    const ph = (t * .5 + ctX_h(i, 77)) % 1; if (ph > .6) continue;
    const gx = x0 + ctX_h(i, 78) * (x1 - x0), gy2 = wt + 2 + ctX_h(i, 79) ** 1.3 * (wb - wt - 3), len = 2 + ctX_h(i, 80) * 4 * (1 + (gy2 - wt) / 40);
    g.fillStyle = V.n ? 'rgba(170,190,255,' + (.35 * Math.sin(ph / .6 * Math.PI)).toFixed(2) + ')' : 'rgba(255,255,240,' + (.55 * Math.sin(ph / .6 * Math.PI)).toFixed(2) + ')';
    g.fillRect(Math.round(gx + Math.sin(t + i) * 2), Math.round(gy2), Math.round(len), 1);
  }
  // at night, a column of golden light under a floodlit landmark
  if (V.n && S.flood && o.trail !== false) {
    const cx = ctX_x(S.glowX || 0);
    for (let yy = wt + 1; yy < wb; yy += 2) { const k = (yy - wt) / (wb - wt), w2 = (6 + k * 16) * V.u * (o.trailW || 1); const a = (.5 - k * .35) * (.55 + .45 * Math.sin(t * 3 + yy * .9)); if (a <= .05) continue;
      g.fillStyle = 'rgba(255,200,110,' + a.toFixed(2) + ')'; const j = Math.sin(yy * 1.7 + t * 2) * w2 * .4; g.fillRect(Math.round(cx - w2 / 2 + j), yy, Math.round(w2 * (.4 + .6 * ctX_h(yy, 5))), 1); }
  }
  g.restore();
}
function cityPic(x, y, w, h, c) {
  c = c || cityById(game.city);
  const n = isNight(), S = ctX_CITY[c.id] || ctX_CITY.WAS, L = ctX_layers(c, S, w, h, n), V = L.V, t = ctX_now(), pv = ctX_V;
  ctX_V = V;
  try {
    blit(L.back, x, y);
    const inPic = fn => fine(() => { g.translate(Math.round(x * RES), Math.round(y * RES)); g.beginPath(); g.rect(0, 0, V.fw, V.fh); g.clip(); fn(); });
    inPic(() => { for (const k of L.clouds) { const span = V.fw + k.cw; const cx = ((k.x * span + t * k.v * 1.6) % span) - k.cw; g.drawImage(k.spr, Math.round(cx), Math.round(k.y * V.gy * .5 - k.ch * .15)); } });
    blit(L.mid, x, y);
    inPic(() => { if (S.water) ctX_reflect(L, S, V, t); if (S.live) S.live(V, t); if (!n && S.birds !== false) ctX_birds(V, t, ctX_sid(c.id)); });
    if (L.fore) blit(L.fore, x, y);
    if (L.front) inPic(() => L.front(V, t));
  } finally { ctX_V = pv; }
}

// ---------------------------------------------------------------
// HOTEL LOBBY: a grand art-deco lobby, warm lamplight, marble and mahogany.
// The menu box sits top-left over the calm, shadowed panelled wall.
// All coordinates here are fine pixels (640 x 400).
// ---------------------------------------------------------------
const ctX_HP = {
  wood: ['#1e0f0c', '#2e1812', '#44231a', '#5e3222', '#7c462e', '#9c6040'],
  marb: ['#5e5046', '#8e7a66', '#b8a288', '#d6c4a6', '#ecdfc4', '#fbf3e0'],
  gold: ['#4a3010', '#7a5418', '#b08028', '#dcb048', '#f4dc88', '#fff6c8'],
  red: ['#2e0a0e', '#4e1016', '#76181e', '#a02a28', '#c84a38'],
  grn: ['#0e1a16', '#18302a', '#24463c', '#346050'],
  lea: ['#2e110e', '#4a1c14', '#6a2a1c', '#8a3c28', '#a8563a'],
};
function ctX_poly(pts, c) { g.fillStyle = c; g.beginPath(); for (let i = 0; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); }
function ctX_ell(cx, cy, rx, ry, c) { g.fillStyle = c; g.beginPath(); g.ellipse(cx, cy, Math.max(.5, rx), Math.max(.5, ry), 0, 0, 7); g.fill(); }
const ctX_VP = [392, 150];
function ctX_toVP(x, y, t) { return [x + (ctX_VP[0] - x) * t, y + (ctX_VP[1] - y) * t]; }
function ctX_hotelStatic(n) {
  const H = ctX_HP, [vx, vy] = ctX_VP, BX0 = 262, BX1 = 552, BY0 = 58, BY1 = 238;
  // ---- ceiling: coffered, receding ----
  ctX_poly([0, 0, 640, 0, BX1, BY0, BX0, BY0], H.marb[2]);
  for (let i = 0; i < 6; i++) { const t0 = i / 6, t1 = (i + .72) / 6; const a = ctX_toVP(0, 0, t0 * .66), b = ctX_toVP(640, 0, t0 * .66), c = ctX_toVP(640, 0, t1 * .66), d = ctX_toVP(0, 0, t1 * .66);
    ctX_poly([a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]], mix(H.marb[1], H.marb[2], i / 6)); }
  for (let k = -5; k <= 5; k++) { const fx = 320 + k * 70; g.strokeStyle = H.marb[1]; g.lineWidth = 3; g.beginPath(); g.moveTo(fx, 0); g.lineTo(fx + (vx - fx) * .66, 0 + (vy) * .66 * 0 + BY0 * 1); g.stroke(); }
  g.fillStyle = H.gold[2]; g.fillRect(BX0 - 4, BY0 - 5, BX1 - BX0 + 8, 3); g.fillStyle = H.gold[4]; g.fillRect(BX0 - 4, BY0 - 5, BX1 - BX0 + 8, 1);
  // ---- back wall: cream marble with pilasters ----
  ctX_banded(BX0, BY0, BX1 - BX0, BY1 - BY0, [H.marb[3], H.marb[4], H.marb[3]], 8);
  for (const px2 of [BX0 + 4, BX0 + 64, BX1 - 88, BX1 - 26]) { g.fillStyle = H.marb[4]; g.fillRect(px2, BY0, 22, BY1 - BY0); g.fillStyle = H.marb[5]; g.fillRect(px2, BY0, 4, BY1 - BY0); g.fillStyle = H.marb[2]; g.fillRect(px2 + 18, BY0, 4, BY1 - BY0); for (let fl = px2 + 7; fl < px2 + 18; fl += 4) { g.fillStyle = H.marb[3]; g.fillRect(fl, BY0 + 12, 2, BY1 - BY0 - 24); } g.fillStyle = H.gold[3]; g.fillRect(px2 - 3, BY0 + 2, 28, 7); g.fillStyle = H.gold[5]; g.fillRect(px2 - 3, BY0 + 2, 28, 2); g.fillStyle = H.gold[1]; g.fillRect(px2 - 3, BY0 + 8, 28, 2); }
  // ---- the arched window above the landing ----
  const wx0 = 352, wx1 = 432, wy0 = 72, wy1 = 150;
  g.save(); g.beginPath(); g.moveTo(wx0, wy1); g.lineTo(wx0, wy0 + 40); g.arc((wx0 + wx1) / 2, wy0 + 40, (wx1 - wx0) / 2, Math.PI, 0); g.lineTo(wx1, wy1); g.closePath(); g.clip();
  if (n) { ctX_banded(wx0, wy0, wx1 - wx0, wy1 - wy0, ['#0a1030', '#1a2250', '#3a2c5a'], 8); for (let i = 0; i < 18; i++) { g.fillStyle = i % 3 ? '#8898c8' : '#ffffff'; g.fillRect(wx0 + ctX_h(i, 3) * 80, wy0 + ctX_h(i, 4) * 40, 1, 1); }
    for (let i = 0; i < 12; i++) { const bx = wx0 + i * 7, bh = 10 + ctX_h(i, 5) * 22; g.fillStyle = '#141830'; g.fillRect(bx, wy1 - bh, 7, bh); for (let j = 0; j < 5; j++) if (ctX_h(i * 9 + j, 6) < .4) { g.fillStyle = ctX_WARM[j % 5]; g.fillRect(bx + 2, wy1 - bh + 3 + j * 4, 2, 2); } } }
  else { ctX_banded(wx0, wy0, wx1 - wx0, wy1 - wy0, ['#4a86c8', '#8ab8e0', '#dce8e8'], 8); for (let i = 0; i < 12; i++) { const bx = wx0 + i * 7, bh = 10 + ctX_h(i, 5) * 22; g.fillStyle = mix('#8a98b0', '#c8d4e0', ctX_h(i, 7) * .5); g.fillRect(bx, wy1 - bh, 7, bh); } }
  g.restore();
  g.fillStyle = H.gold[1]; for (const mx2 of [372, 392, 412]) g.fillRect(mx2, wy0 + 4, 2, wy1 - wy0); for (const my of [98, 124]) g.fillRect(wx0, my, wx1 - wx0, 2);
  g.strokeStyle = H.gold[3]; g.lineWidth = 4; g.beginPath(); g.moveTo(wx0 - 2, wy1); g.lineTo(wx0 - 2, wy0 + 40); g.arc((wx0 + wx1) / 2, wy0 + 40, (wx1 - wx0) / 2 + 2, Math.PI, 0); g.lineTo(wx1 + 2, wy1); g.stroke();
  g.strokeStyle = H.gold[5]; g.lineWidth = 1; g.beginPath(); g.arc((wx0 + wx1) / 2, wy0 + 40, (wx1 - wx0) / 2 + 3, Math.PI * 1.05, Math.PI * 1.5); g.stroke();
  // ---- grand staircase with a red runner ----
  const sx0 = 330, sx1 = 454, s0 = 238, s1 = 156, N = 12;
  ctX_poly([sx0 - 18, BY1, sx0, s1, sx1, s1, sx1 + 18, BY1], H.marb[2]);
  for (let i = 0; i < N; i++) { const y = s1 + (s0 - s1) * i / N, h = (s0 - s1) / N, ex = 18 * i / N;
    g.fillStyle = H.marb[4]; g.fillRect(sx0 - ex, y, sx1 - sx0 + ex * 2, Math.ceil(h * .45)); g.fillStyle = H.marb[2]; g.fillRect(sx0 - ex, y + h * .45, sx1 - sx0 + ex * 2, Math.ceil(h * .55));
    const rw = 22 + i * 1.2; g.fillStyle = H.red[3]; g.fillRect(392 - rw, y, rw * 2, Math.ceil(h * .45)); g.fillStyle = H.red[2]; g.fillRect(392 - rw, y + h * .45, rw * 2, Math.ceil(h * .55)); g.fillStyle = H.gold[4]; g.fillRect(392 - rw, y + h * .45 - 1, rw * 2, 1); }
  g.fillStyle = H.red[4]; g.fillRect(370, s1, 3, s0 - s1);
  // balustrades: brass rails sweeping down, with balusters
  for (const s of [-1, 1]) { const top = s < 0 ? sx0 - 4 : sx1 + 4, bot = s < 0 ? sx0 - 30 : sx1 + 30;
    for (let i = 0; i <= 14; i++) { const t = i / 14, bx = top + (bot - top) * t, by = s1 - 14 + (s0 - 20 - s1 + 14) * t; g.fillStyle = H.gold[2]; g.fillRect(bx - 1, by, 2, 16); g.fillStyle = H.gold[4]; g.fillRect(bx - 1, by, 1, 16); }
    g.strokeStyle = H.gold[3]; g.lineWidth = 3; g.beginPath(); g.moveTo(top, s1 - 15); g.lineTo(bot, s0 - 21); g.stroke(); g.strokeStyle = H.gold[5]; g.lineWidth = 1; g.beginPath(); g.moveTo(top, s1 - 16); g.lineTo(bot, s0 - 22); g.stroke();
    g.fillStyle = H.gold[2]; g.fillRect(bot - 4, s0 - 24, 8, 26); g.fillStyle = H.gold[4]; g.fillRect(bot - 4, s0 - 24, 2, 26); ctX_ell(bot, s0 - 27, 6, 5, H.gold[3]); ctX_ell(bot - 2, s0 - 29, 2, 2, H.gold[5]); }
  // ---- left wall: mahogany panels in perspective (calm, under the menu) ----
  ctX_poly([0, 0, BX0, BY0, BX0, BY1, 0, 400], H.wood[2]);
  const lw = (t, y) => { const top = ctX_toVP(0, y, 0); return [t, BY0 + (y - BY0)]; };
  for (let i = 0; i < 5; i++) { const x0 = 12 + i * 52 - i * i * 1.3, x1 = x0 + 40 - i * 4, f = x => (x / BX0);
    const yt = x => 24 + (BY0 + 8 - 24) * f(x), yb = x => 300 + (BY1 - 12 - 300) * f(x);
    ctX_poly([x0, yt(x0), x1, yt(x1), x1, yb(x1), x0, yb(x0)], H.wood[3]); ctX_poly([x0 + 3, yt(x0 + 3) + 3, x1 - 3, yt(x1 - 3) + 3, x1 - 3, yb(x1 - 3) - 3, x0 + 3, yb(x0 + 3) - 3], mix(H.wood[2], H.wood[3], .5));
    g.fillStyle = H.wood[4]; g.fillRect(x0, yt(x0), 2, yb(x0) - yt(x0)); g.fillStyle = H.wood[1]; g.fillRect(x1 - 2, yt(x1), 2, yb(x1) - yt(x1)); }
  const yb0 = x => 318 + (BY1 - 6 - 318) * (x / BX0); ctX_poly([0, 318, BX0, BY1 - 6, BX0, BY1, 0, 400], H.wood[1]); ctX_poly([0, 318, BX0, BY1 - 6, BX0, BY1 - 4, 0, 322], H.gold[2]);
  // a warm wall sconce by the stair
  ctX_glow(236, 120, 60, '#ffc870', n ? .35 : .22); g.fillStyle = H.gold[2]; g.fillRect(233, 118, 6, 14); ctX_ell(236, 114, 7, 6, '#fff0c8');
  // ---- right wall ----
  ctX_poly([640, 0, BX1, BY0, BX1, BY1, 640, 272], H.wood[1]);
  ctX_poly([568, 70, 620, 50, 620, 250, 568, 240], H.gold[2]); ctX_poly([572, 74, 616, 56, 616, 244, 572, 236], n ? '#3a3040' : '#8a7a70');
  ctX_poly([572, 74, 590, 67, 590, 238, 572, 236], n ? '#4a4050' : '#a09088');
  // ---- floor: polished checkerboard marble in perspective ----
  const fy0 = BY1, rows = 11;
  ctX_poly([0, 400, 0, 400, BX0, BY1, BX1, BY1, 640, 272, 640, 400], H.marb[3]);
  for (let r = 0; r < rows; r++) { const t0 = (r / rows) ** 1.6, t1 = ((r + 1) / rows) ** 1.6, ya = fy0 + (400 - fy0) * t0, yb = fy0 + (400 - fy0) * t1;
    for (let c = -12; c < 12; c++) { const xa = x => vx + (x - vx) * (ya - vy) / (400 - vy), xb = x => vx + (x - vx) * (yb - vy) / (400 - vy), X0 = vx + c * 60, X1 = X0 + 60;
      const dark = (r + c) & 1; ctX_poly([xa(X0 * 1 + 0) + (X0 - vx) * 0, ya, xa(X1), ya, xb(X1), yb, xb(X0), yb], dark ? mix(H.grn[2], H.grn[3], r / rows * .7) : mix(H.marb[2], H.marb[3], .3 + r / rows * .7)); } }
  // reflections of the window and the staircase in the polish
  g.save(); g.translate(392, BY1); g.scale(1, 2.6); const rg = g.createRadialGradient(0, 0, 4, 0, 0, 60); rg.addColorStop(0, 'rgba(200,60,50,.3)'); rg.addColorStop(.4, 'rgba(255,220,170,.16)'); rg.addColorStop(1, 'rgba(255,230,190,0)'); g.fillStyle = rg; g.fillRect(-60, 0, 120, 62); g.restore();
  for (const [lx, ly, r] of [[613, 300, 40], [236, 300, 30]]) { g.save(); g.translate(lx, ly); g.scale(1, 2); const lg = g.createRadialGradient(0, 0, 0, 0, 0, r); lg.addColorStop(0, 'rgba(255,230,170,.22)'); lg.addColorStop(1, 'rgba(255,230,170,0)'); g.fillStyle = lg; g.fillRect(-r, -r, r * 2, r * 2); g.restore(); }
  // ---- reception desk (right) with the key rack behind ----
  const kx = 470, ky = 128; g.fillStyle = H.wood[1]; g.fillRect(kx - 4, ky - 4, 78, 62); g.fillStyle = H.wood[3]; g.fillRect(kx, ky, 70, 54);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) { const x = kx + 3 + i * 11, y = ky + 3 + j * 13; g.fillStyle = H.wood[0]; g.fillRect(x, y, 9, 11); if (ctX_h(i * 4 + j, 9) < .6) { g.fillStyle = H.gold[3]; g.fillRect(x + 4, y + 3, 1, 5); g.fillStyle = H.gold[5]; g.fillRect(x + 3, y + 7, 3, 2); } if (ctX_h(i + j * 7, 10) < .25) { g.fillStyle = '#e8e0d0'; g.fillRect(x + 1, y + 6, 6, 4); } }
  ctX_ell(506, 104, 13, 13, H.gold[2]); ctX_ell(506, 104, 11, 11, '#f4ecd8'); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillStyle = '#4a3a2a'; g.fillRect(506 + Math.cos(a) * 9 - .5, 104 + Math.sin(a) * 9 - .5, 1.5, 1.5); }
  // counter
  ctX_poly([452, 236, 640, 222, 640, 300, 452, 300], H.wood[2]);
  ctX_poly([448, 228, 640, 212, 640, 224, 448, 238], H.marb[4]); ctX_poly([448, 228, 640, 212, 640, 214, 448, 230], H.marb[5]);
  for (let i = 0; i < 4; i++) { const x = 462 + i * 46; ctX_poly([x, 244 - i * 3.4, x + 36, 241 - i * 3.4, x + 36, 290, x, 292], H.wood[3]); ctX_poly([x + 3, 248 - i * 3.4, x + 33, 245 - i * 3.4, x + 33, 286, x + 3, 288], mix(H.wood[2], H.wood[3], .6)); g.fillStyle = H.gold[3]; g.fillRect(x + 16, 262 - i * 2, 4, 4); }
  ctX_poly([448, 296, 640, 296, 640, 304, 448, 304], H.gold[2]);
  // brass lamp with a green shade, and the bell
  g.fillStyle = H.gold[2]; g.fillRect(612, 196, 3, 22); ctX_poly([598, 196, 628, 196, 622, 184, 604, 184], '#2a6a4a'); ctX_poly([598, 196, 628, 196, 626, 192, 600, 192], '#3a8a5a'); ctX_glow(613, 204, 34, '#fff0b0', n ? .4 : .25);
  ctX_ell(480, 226, 6, 4, H.gold[3]); ctX_ell(478, 224, 2, 1.5, H.gold[5]); g.fillStyle = '#ece4d4'; g.fillRect(520, 222, 22, 5); g.fillStyle = '#b8b0a0'; g.fillRect(520, 226, 22, 1);
  // ---- the chandelier's glow in the room ----
  ctX_glow(392, 56, 170, '#ffd890', n ? .32 : .2);
  // ---- foreground: potted palm, armchair and side table (the watcher sits here) ----
  ctX_hotelChair(96, 350);
  const pot = (x, y) => { ctX_poly([x - 16, y - 26, x + 16, y - 26, x + 11, y, x - 11, y], H.gold[2]); ctX_poly([x - 16, y - 26, x - 8, y - 26, x - 6, y, x - 11, y], H.gold[4]); ctX_poly([x + 8, y - 26, x + 16, y - 26, x + 11, y, x + 7, y], H.gold[1]); g.fillStyle = H.gold[5]; g.fillRect(x - 17, y - 28, 34, 3);
    const fr = [[-1, -.3], [-.8, .3], [-.4, .7], [.1, .95], [.5, .7], [.85, .25], [1, -.2], [-.3, -.6], [.35, -.55]];
    for (const [dx, dy] of fr) { const L = 44, ex = x + dx * L, ey = y - 70 - dy * -L * .7, mx = x + dx * L * .5, my = y - 90 + dy * 8; g.strokeStyle = dy > .6 ? '#1e4a26' : dx < 0 ? '#3e7a3a' : '#2e5e30'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y - 30); g.quadraticCurveTo(mx, my, ex, ey); g.stroke(); g.strokeStyle = '#5a9a4a'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y - 31); g.quadraticCurveTo(mx, my - 1, ex, ey - 1); g.stroke(); } };
  pot(24, 400); pot(622, 400);
  if (n) { // night: the room sinks into warm shadow, the lamps and the chandelier carry it
    g.fillStyle = 'rgba(24,12,34,.34)'; g.fillRect(0, 0, 640, 400);
    g.globalCompositeOperation = 'lighter'; for (const [x, y, r, a] of [[392, 60, 190, .16], [613, 200, 60, .2], [236, 120, 60, .14], [182, 318, 70, .12], [392, 110, 60, .1]]) ctX_glow(x, y, r, '#ffc070', a); g.globalCompositeOperation = 'source-over';
  }
}
function ctX_hotelChair(x, y) { // a wing-back leather armchair seen from the front-right, with a side table and lamp
  const H = ctX_HP, L = H.lea;
  ctX_ell(x + 10, y + 42, 72, 10, 'rgba(0,0,0,.35)');
  ctX_poly([x - 44, y - 64, x + 36, y - 64, x + 40, y + 10, x - 48, y + 10], L[1]); ctX_poly([x - 40, y - 60, x + 32, y - 60, x + 34, y - 4, x - 42, y - 4], L[2]);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) ctX_ell(x - 30 + i * 20 + (j % 2) * 10, y - 50 + j * 16, 1.5, 1.5, L[0]);
  ctX_poly([x - 60, y - 30, x - 36, y - 34, x - 36, y + 34, x - 60, y + 36], L[2]); ctX_poly([x - 60, y - 30, x - 36, y - 34, x - 38, y - 26, x - 62, y - 22], L[4]);
  ctX_poly([x + 28, y - 34, x + 52, y - 30, x + 52, y + 36, x + 28, y + 34], L[1]); ctX_poly([x + 28, y - 34, x + 52, y - 30, x + 54, y - 22, x + 30, y - 26], L[3]);
  ctX_poly([x - 38, y + 4, x + 30, y + 4, x + 32, y + 36, x - 40, y + 36], L[2]); ctX_poly([x - 38, y + 4, x + 30, y + 4, x + 30, y + 8, x - 38, y + 8], L[4]);
  g.fillStyle = H.wood[1]; g.fillRect(x - 56, y + 36, 6, 8); g.fillRect(x + 46, y + 36, 6, 8);
  // side table with a lamp and an ashtray
  const tx = x + 94, ty = y + 4; ctX_ell(tx, ty, 24, 7, H.wood[3]); ctX_ell(tx, ty - 1, 24, 6, H.wood[4]); g.fillStyle = H.wood[2]; g.fillRect(tx - 3, ty, 6, 36); ctX_ell(tx, ty + 38, 12, 3, H.wood[1]);
  ctX_ell(tx + 10, ty - 3, 6, 2, '#9ab0b8'); ctX_ell(tx + 10, ty - 4, 4, 1.2, '#4a5a60');
  g.fillStyle = H.gold[2]; g.fillRect(tx - 9, ty - 34, 3, 32); ctX_poly([tx - 22, ty - 34, tx + 6, ty - 34, tx, ty - 50, tx - 16, ty - 50], '#e8d4a8'); ctX_poly([tx - 22, ty - 34, tx + 6, ty - 34, tx + 4, ty - 38, tx - 20, ty - 38], '#f8ecc8');
}
function ctX_hotelLive(t, n) {
  const H = ctX_HP;
  // lamp glow over the chair
  ctX_glow(182, 320, 60, '#ffd890', .22);
  // the chandelier: tiers of crystals catching the light
  const cx = 392; g.fillStyle = H.gold[1]; g.fillRect(cx - 1, 0, 2, 22);
  for (const [y, w, k] of [[24, 18, 5], [38, 34, 9], [54, 48, 13], [70, 30, 9]]) { g.fillStyle = H.gold[2]; g.fillRect(cx - w, y, w * 2, 3); g.fillStyle = H.gold[4]; g.fillRect(cx - w, y, w * 2, 1);
    for (let i = 0; i < k; i++) { const x = cx - w + (i + .5) * w * 2 / k, tw = Math.sin(t * 3 + i * 1.7 + y) > .75; g.fillStyle = tw ? '#ffffff' : '#fff4d0'; g.fillRect(x - 1, y + 3, 2, 6); g.fillStyle = tw ? '#ffffff' : '#e8f0ff'; g.fillRect(x - .5, y + 9, 1, 3); if (tw) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x - 3, y + 6, 6, 1); g.fillRect(x - .5, y + 3, 1, 8); } } }
  ctX_ell(cx, 84, 6, 5, H.gold[3]); ctX_ell(cx - 2, 82, 2, 2, H.gold[5]);
  // the clock above the desk shows the time
  const d = game.startDate ? dateOf(game.t || 0) : new Date(), hr = (d.getHours() % 12 + d.getMinutes() / 60) / 12 * Math.PI * 2, mn = d.getMinutes() / 60 * Math.PI * 2;
  g.strokeStyle = '#2a1a10'; g.lineWidth = 2; g.beginPath(); g.moveTo(506, 104); g.lineTo(506 + Math.sin(hr) * 5, 104 - Math.cos(hr) * 5); g.stroke(); g.lineWidth = 1; g.beginPath(); g.moveTo(506, 104); g.lineTo(506 + Math.sin(mn) * 8, 104 - Math.cos(mn) * 8); g.stroke();
  // the desk clerk
  const clx = 540, cly = 214, sk = '#e0a888'; g.fillStyle = '#1c1c24'; g.fillRect(clx - 16, cly - 22, 32, 24); g.fillStyle = '#2c2c38'; g.fillRect(clx - 16, cly - 22, 8, 24); g.fillStyle = '#f4f0e8'; ctX_poly([clx - 5, cly - 22, clx + 5, cly - 22, clx, cly - 10], '#f4f0e8'); ctX_poly([clx - 3, cly - 20, clx + 3, cly - 20, clx, cly - 16], '#a02a28');
  ctX_ell(clx, cly - 32, 8, 10, sk); ctX_ell(clx + 3, cly - 31, 4, 8, '#c08868'); g.fillStyle = '#2a1a12'; ctX_ell(clx, cly - 40, 9, 5, '#2a1a12'); g.fillRect(clx - 9, cly - 40, 3, 7);
  const blink = (t % 4) < .12; g.fillStyle = blink ? '#c08868' : '#1a1010'; g.fillRect(clx - 5, cly - 33, 3, blink ? 1 : 2); g.fillRect(clx + 2, cly - 33, 3, blink ? 1 : 2); g.fillStyle = '#8a4a3a'; g.fillRect(clx - 3, cly - 26, 6, 1);
  // the man in the armchair behind his newspaper: now and then he lowers it to look at you
  const x = 96, y = 350, ph = t % 9, low = ph > 6.2 && ph < 8.2 ? Math.min(1, (ph - 6.2) * 4, (8.2 - ph) * 4) : 0;
  g.fillStyle = '#3a3830'; ctX_poly([x - 24, y - 20, x + 20, y - 20, x + 22, y + 20, x - 26, y + 20], '#4a4638'); ctX_poly([x - 26, y + 6, x - 8, y + 6, x - 10, y + 40, x - 24, y + 40], '#2a2a30'); ctX_poly([x + 2, y + 6, x + 20, y + 6, x + 22, y + 40, x + 8, y + 40], '#34343a');
  g.fillStyle = '#141418'; g.fillRect(x - 26, y + 38, 16, 6); g.fillRect(x + 8, y + 38, 16, 6);
  const hy = y - 44; ctX_ell(x, hy, 10, 12, '#d8a080'); ctX_ell(x + 4, hy + 1, 5, 10, '#b88060');
  ctX_poly([x - 16, hy - 6, x + 16, hy - 6, x + 12, hy - 10, x - 12, hy - 10], '#3a3a36'); ctX_poly([x - 9, hy - 10, x + 9, hy - 10, x + 7, hy - 20, x - 7, hy - 20], '#4a4a44'); g.fillStyle = '#1a1a18'; g.fillRect(x - 9, hy - 12, 18, 2);
  if (low) { const eyeX = Math.sin(t * .7) > 0 ? 1 : 0; g.fillStyle = '#f0e8e0'; g.fillRect(x - 6, hy - 2, 4, 3); g.fillRect(x + 2, hy - 2, 4, 3); g.fillStyle = '#1a1010'; g.fillRect(x - 5 + eyeX, hy - 2, 2, 3); g.fillRect(x + 3 + eyeX, hy - 2, 2, 3); g.fillStyle = '#5a3a2a'; g.fillRect(x - 7, hy - 4, 5, 1); g.fillRect(x + 2, hy - 4, 5, 1); }
  const py = hy - 8 + low * 22; // the newspaper
  ctX_poly([x - 30, py, x + 30, py - 2, x + 32, py + 40, x - 28, py + 42], '#e8e2d2'); ctX_poly([x - 1, py - 1, x + 1, py - 1, x + 2, py + 41, x, py + 41], '#b8b0a0');
  g.fillStyle = '#3a3a3a'; g.fillRect(x - 26, py + 4, 24, 4); g.fillRect(x + 4, py + 4, 22, 3); for (let i = 0; i < 6; i++) { g.fillStyle = '#9a968a'; g.fillRect(x - 26, py + 12 + i * 4.5, 22, 1.5); g.fillRect(x + 5, py + 11 + i * 4.5, 22, 1.5); } g.fillStyle = '#6a6a6a'; g.fillRect(x + 6, py + 20, 12, 8);
  ctX_ell(x - 30, py + 22, 4, 5, '#d8a080'); ctX_ell(x + 31, py + 20, 4, 5, '#c89070');
  // a curl of cigarette smoke from the ashtray
  for (let i = 0; i < 6; i++) { const k = (t * .25 + i / 6) % 1; ctX_ell(200 + Math.sin(t * 1.3 + k * 6) * 4 * k, 350 - k * 60, 1.5 + k * 3, 1.5 + k * 2, `rgba(220,220,230,${(.35 * (1 - k)).toFixed(2)})`); }
  // the bellboy crossing with a luggage cart
  const p = (t * .035) % 1.4; if (p < 1) { const bx = 720 - p * 480, by = 330, step = Math.sin(t * 8);
    ctX_ell(bx + 10, by + 30, 44, 5, 'rgba(0,0,0,.3)');
    g.fillStyle = H.gold[3]; g.fillRect(bx - 40, by + 16, 52, 3); g.fillRect(bx - 40, by - 36, 3, 54); g.fillRect(bx + 9, by - 36, 3, 54); g.fillRect(bx - 40, by - 38, 52, 3); ctX_ell(bx - 34, by + 24, 5, 5, '#222'); ctX_ell(bx + 6, by + 24, 5, 5, '#222');
    ctX_poly([bx - 36, by - 10, bx + 6, by - 10, bx + 6, by + 16, bx - 36, by + 16], '#6a4a2e'); g.fillStyle = '#8a643e'; g.fillRect(bx - 36, by - 10, 42, 3); g.fillStyle = H.gold[4]; g.fillRect(bx - 20, by - 14, 10, 4);
    ctX_poly([bx - 32, by - 32, bx + 2, by - 32, bx + 2, by - 10, bx - 32, by - 10], '#3a5a7a'); g.fillStyle = '#5a7a9a'; g.fillRect(bx - 32, by - 32, 34, 3); g.fillStyle = '#c8a860'; g.fillRect(bx - 18, by - 22, 6, 2);
    const mx = bx + 28; g.fillStyle = '#1a1a22'; g.fillRect(mx - 5 + step * 3, by - 2, 5, 30); g.fillRect(mx + step * -3, by - 2, 5, 30);
    ctX_poly([mx - 8, by - 34, mx + 8, by - 34, mx + 9, by, mx - 9, by], '#a82a24'); g.fillStyle = '#c84a38'; g.fillRect(mx - 8, by - 34, 4, 34); for (let i = 0; i < 3; i++) { g.fillStyle = H.gold[4]; g.fillRect(mx + 2, by - 28 + i * 8, 2, 2); }
    g.fillStyle = '#a82a24'; g.fillRect(mx - 16, by - 28, 10, 5); ctX_ell(mx - 17, by - 26, 3, 3, '#d8a080');
    ctX_ell(mx, by - 42, 7, 8, '#d8a080'); ctX_ell(mx + 3, by - 41, 3, 6, '#b88060'); g.fillStyle = '#2a1a12'; g.fillRect(mx - 7, by - 49, 13, 4); ctX_poly([mx - 6, by - 50, mx + 6, by - 50, mx + 5, by - 57, mx - 5, by - 57], '#a82a24'); g.fillStyle = H.gold[4]; g.fillRect(mx - 6, by - 51, 12, 2);
    g.fillStyle = '#1a1010'; g.fillRect(mx - 4, by - 43, 2, 2); }
}
function hotelLobbyArt(t) {
  const n = isNight();
  blit(art('ctXlobby' + (n ? 'n' : 'd'), W, H, () => ctX_hotelStatic(n)), 0, 0);
  const tt = ctX_now();
  fine(() => ctX_hotelLive(tt, n));
}

// ---------------------------------------------------------------
// ENEMY BUILDINGS: townhouse (hideout), glass office, tower block (active cel),
// stucco villa (agent). The city's own sky behind, guards in the org's colours.
// ---------------------------------------------------------------
function ctX_scaled(k, x, y, fn) { const V = ctX_V, V2 = Object.assign({}, V, { u: V.u * k, ox: ctX_x(x), gy: ctX_y(y) }); ctX_V = V2; try { fn(); } finally { ctX_V = V; } }
const ctX_REG_STYLE = { europe: 'euro', mideast: 'arab', americas: 'latin' };
function ctX_bType(b) { return b.agency ? (b.type || 'office') : (b.type || 'hideout'); }
function ctX_uni(b) { if (b.agency) return ({ KGB: '#4e5a3c', MI6: '#2c303c', Mossad: '#5e604a' })[b.agency] || '#3a3a44'; return mix(b.org && b.org.uni || '#555555', '#3a3a46', .38); }
// a guard, ~18 units tall at s = 1: boots, trousers, jacket in the uniform colour, cap, a sub-machine gun
function ctX_guard(x, y, s, uni, dir, t, ph, walk) {
  const V = ctX_V, sk = ['#e0a888', '#b27a58', '#8a5a3e'][ph % 3], sw = walk ? Math.sin(t * 7 + ph) * 1.6 * s : 0, br = walk ? 0 : Math.sin(t * 1.5 + ph) * .15 * s;
  ctX_E(x, y, 3.4 * s, .8 * s, 'rgba(0,0,0,.3)');
  ctX_L(x - .8 * s, y - 7 * s, x - .8 * s + sw, y - .6 * s, ctX_c('#24242c', -.4), 1.4 * s); ctX_L(x + .8 * s, y - 7 * s, x + .8 * s - sw, y - .6 * s, ctX_c('#24242c', .2), 1.4 * s);
  ctX_R(x - 1.6 * s + sw - .2 * s, y - 1 * s, 2 * s, 1 * s, '#141418'); ctX_R(x + .1 * s - sw, y - 1 * s, 2 * s, 1 * s, '#141418');
  ctX_P([x - 2.6 * s, y - 14.6 * s + br, x + 2.6 * s, y - 14.6 * s + br, x + 2.4 * s, y - 6.6 * s, x - 2.4 * s, y - 6.6 * s], ctX_c(uni, 0));
  ctX_R(x + (dir > 0 ? -2.6 : 1.2) * s, y - 14.6 * s + br, 1.4 * s, 8 * s, ctX_c(uni, -1.3)); ctX_R(x + (dir > 0 ? 1.4 : -2.6) * s, y - 14.6 * s + br, 1.1 * s, 8 * s, ctX_c(uni, 1));
  ctX_R(x - 2.5 * s, y - 8 * s, 5 * s, .8 * s, ctX_c('#1a1a1a', 0));
  // the gun held across the chest, arms around it
  ctX_L(x - 2.4 * s * dir, y - 9.8 * s, x + 3.4 * s * dir, y - 12.6 * s, '#16161a', 1.1 * s); ctX_R(x + (dir > 0 ? .6 : -1.6) * s, y - 11 * s, 1 * s, 2.2 * s, '#16161a');
  ctX_L(x - 2.2 * s * dir, y - 13.6 * s + br, x - 1 * s * dir, y - 10 * s, ctX_c(uni, -.6), 1.2 * s); ctX_L(x + 2.2 * s * dir, y - 13.8 * s + br, x + 1.4 * s * dir, y - 11.6 * s, ctX_c(uni, .3), 1.2 * s);
  ctX_E(x - 1 * s * dir, y - 10 * s, .6 * s, .6 * s, ctX_c(sk, 0)); ctX_E(x + 1.4 * s * dir, y - 11.6 * s, .6 * s, .6 * s, ctX_c(sk, 0));
  // head and cap
  ctX_R(x - .6 * s, y - 15.6 * s + br, 1.2 * s, 1.2 * s, ctX_c(sk, -.6));
  ctX_E(x + .2 * s * dir, y - 16.8 * s + br, 1.4 * s, 1.6 * s, ctX_c(sk, 0)); ctX_E(x + (dir > 0 ? -.5 : .9) * s, y - 16.6 * s + br, .7 * s, 1.3 * s, ctX_c(sk, -1));
  ctX_R(x + .6 * s * dir - .25 * s, y - 17 * s + br, .5 * s, .4 * s, '#1a1010');
  ctX_P([x - 1.6 * s, y - 17.6 * s + br, x + 1.6 * s, y - 17.6 * s + br, x + 1.3 * s, y - 19.2 * s + br, x - 1.3 * s, y - 19.2 * s + br], ctX_c(uni, -.8)); ctX_R(x + (dir > 0 ? 0 : -2.4) * s, y - 17.8 * s + br, 2.4 * s, .5 * s, ctX_c('#141414', 0));
}
// sash window with stone lintel and sill, curtains; lit at night
function ctX_sash(x, y, w, h, seed, o = {}) {
  const V = ctX_V, lit = V.n && ctX_h(seed, 21) < (o.lit || .5), st = o.stone || '#d8ccb4', fr = o.frame || '#ece8de';
  ctX_R(x - 1, y - 1.8, w + 2, 1.8, ctX_c(st, .6)); ctX_R(x - 1, y - .6, w + 2, .6, ctX_c(st, -1.2));
  ctX_R(x - .5, y, w + 1, h + .5, ctX_c(fr, -1.2));
  if (lit) { ctX_banded(Math.round(ctX_x(x)), Math.round(ctX_y(y)), Math.round(w * V.u), Math.round(h * V.u), ['#ffe8a8', '#ffc670'], 4); }
  else { ctX_R(x, y, w, h, ctX_c('#2c3448', -.3)); ctX_P([x, y, x + w * .5, y, x, y + h * .6], ctX_c('#6a86a8', V.n ? -1 : .2)); }
  const cc = o.curtain || ['#8a2a2a', '#2a4a6a', '#6a5a2a', '#4a2a4a'][ctX_h(seed, 22) * 4 | 0];
  if (!o.bare) { const cw = w * (ctX_h(seed, 23) < .4 ? .3 : .17); ctX_R(x, y, cw, h, ctX_c(cc, lit ? 1.5 : -.4)); ctX_R(x + w - cw, y, cw, h, ctX_c(cc, lit ? 1 : -.8)); if (lit) ctX_R(x + cw - .4, y, .4, h, ctX_c(cc, -1)); }
  ctX_R(x - .3, y + h / 2 - .3, w + .6, .6, ctX_c(fr, 0)); ctX_R(x + w / 2 - .25, y, .5, h, ctX_c(fr, 0));
  ctX_R(x - 1.4, y + h, w + 2.8, 1.1, ctX_c(st, .8)); ctX_R(x - 1.4, y + h + 1.1, w + 2.8, .5, ctX_c(st, -1.5));
  return lit;
}
function ctX_bWall(x, y, w, h, base, kind, seed) { // facade material: brick courses, concrete panels, stucco, or plain
  const V = ctX_V; ctX_R(x, y, w, h, ctX_c(base, 0));
  if (kind === 'brick') { for (let yy = y + 1.6, k = 0; yy < y + h; yy += 1.6, k++) { ctX_R(x, yy, w, .3, mix(ctX_c(base, 0), ctX_c('#c8bca8', 0), .35)); if (V.u >= 3) for (let xx = x + (k % 2) * 1.8; xx < x + w; xx += 3.6) ctX_R(xx, yy - 1.3, .3, 1.3, mix(ctX_c(base, 0), ctX_c('#c8bca8', 0), .3)); } for (let i = 0; i < 26; i++) { const bx = x + ctX_h(i, seed) * (w - 3), by = y + Math.floor(ctX_h(i, seed + 1) * h / 1.6) * 1.6 + .3; ctX_R(bx, by, 3.2, 1.3, ctX_c(base, ctX_h(i, seed + 2) < .5 ? .5 : -.6)); } }
  if (kind === 'panel') { for (let yy = y; yy < y + h; yy += 6) ctX_R(x, yy, w, .45, ctX_c(base, -1.2)); for (let xx = x; xx < x + w; xx += 10) ctX_R(xx, y, .45, h, ctX_c(base, -1)); }
  if (kind === 'stucco') { ctX_R(x, y + h - 4, w, 4, ctX_c(base, -.5)); }
}
function ctX_townhouse(V, b, r) {
  const br = ['#8e4c38', '#7c4234', '#9a5a40'][r() * 3 | 0], st = '#d8ccb4', door = ['#1e3a2c', '#1e2230', '#5a1a1e', '#1a2a4a'][r() * 4 | 0], X0 = -34, X1 = 34, top = -74;
  // neighbours
  V.fog = .12; ctX_bWall(-150, -68, 114, 68, '#cfc2a6', 'plain'); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) ctX_sash(-128 + i * 30, -62 + j * 20, 9, 13, 90 + i * 3 + j, { lit: .4 });
  ctX_R(-150, -71, 114, 3, ctX_c('#cfc2a6', .8)); ctX_bWall(36, -62, 114, 62, '#a6624a', 'brick', 7); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) ctX_sash(46 + i * 30, -56 + j * 18, 9, 12, 60 + i * 3 + j, { lit: .4 });
  ctX_R(36, -65, 114, 3, ctX_c('#d8ccb4', .6)); V.fog = 0;
  // the house
  ctX_P([X0 + 2, top, X1 - 2, top, X1 - 8, top - 14, X0 + 8, top - 14], ctX_c('#4a5264', 0)); ctX_P([X1 - 12, top, X1 - 2, top, X1 - 8, top - 14, X1 - 14, top - 14], ctX_c('#4a5264', -1.2));
  for (const dx of [-14, 12]) { ctX_R(dx - 4, top - 11, 8, 9, ctX_c('#e8e2d6', 0)); ctX_P([dx - 5, top - 11, dx + 5, top - 11, dx, top - 15], ctX_c('#4a5264', .5)); ctX_sash(dx - 2.5, top - 9.6, 5, 6.5, r() * 99 | 0, { bare: 1 }); }
  for (const cx of [X0 + 4, X1 - 8]) { ctX_R(cx, top - 22, 5, 22, ctX_c(br, 0)); ctX_R(cx + 3.4, top - 22, 1.6, 22, ctX_c(br, -1.2)); ctX_R(cx - .6, top - 23, 6.2, 1.4, ctX_c(st, .4)); for (const px2 of [.8, 3]) { ctX_R(cx + px2, top - 25.5, 1.4, 2.5, ctX_c('#b0603a', 0)); } }
  ctX_bWall(X0, top, X1 - X0, -top, br, 'brick', 3);
  ctX_R(X0, top, X1 - X0, -top, 'rgba(0,0,0,0)');
  for (let yy = top; yy < 0; yy += 4) { ctX_R(X0, yy, 2.4, 2, ctX_c(st, .4)); ctX_R(X1 - 2.4, yy + 2, 2.4, 2, ctX_c(st, -.2)); }
  ctX_R(X0 - 1.5, top - 1, X1 - X0 + 3, 2.4, ctX_c(st, .8)); ctX_R(X0 - 1.5, top + 1.4, X1 - X0 + 3, .7, ctX_c(st, -1.6));
  ctX_R(X0, -24, X1 - X0, 1.2, ctX_c(st, .5));
  const wins = []; for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) { const wx = X0 + 7 + i * 20 - 2.5, wy = top + 7 + j * 22; wins.push([wx, wy, 9, 14]); ctX_sash(wx, wy, 9, 14, i * 5 + j * 17 + (r() * 50 | 0)); }
  for (const i of [0, 2]) { const wx = X0 + 7 + i * 20 - 2.5; wins.push([wx, -19, 9, 12]); ctX_sash(wx, -19, 9, 12, i * 7 + 3 + (r() * 50 | 0)); }
  // door, fanlight and steps
  ctX_R(-7, -21, 14, 21, ctX_c(st, .3)); ctX_E(0, -16, 6, 5, ctX_c(st, .5)); ctX_R(-5, -16, 10, 16, ctX_c(door, 0)); ctX_E(0, -16, 5, 4.2, V.n ? '#ffd890' : ctX_c('#3a4458', 0));
  for (const k of [-3.2, 1]) { ctX_R(k, -13, 2.4, 5, ctX_c(door, .8)); ctX_R(k, -6.5, 2.4, 5, ctX_c(door, .8)); ctX_R(k + 1.9, -13, .5, 11.5, ctX_c(door, -1)); }
  ctX_E(0, -9, .7, .7, ctX_c('#d8b040', 1)); ctX_R(-1, -18.5, 2, 1.3, ctX_c('#d8b040', .5));
  for (let i = 0; i < 3; i++) ctX_R(-9 - i * 1.5, i * 1.1 - .2, 18 + i * 3, 1.2, ctX_c(st, i % 2 ? -.3 : .5));
  for (const s of [-1, 1]) { ctX_L(s * 9, -6, s * 12.5, 3, '#141418', .5); for (let k = 0; k < 4; k++) ctX_L(s * (9 + k), -6 + k * 2.2, s * (9 + k), 3, '#141418', .35); }
  ctX_R(X0, -.6, 26, .5, '#141418'); ctX_R(8, -.6, 26, .5, '#141418'); for (let xx = X0; xx < X1; xx += 1.6) if (Math.abs(xx) > 9) ctX_R(xx, -4, .3, 3.4, '#141418');
  return { wins, door: [0, -8], smoke: [[X0 + 6.5, top - 26], [X1 - 5.5, top - 26]], lamp: -52, guards: [[-14, 5], [14, 5], [-44, 7], [44, 7]] };
}
function ctX_office(V, b, r) {
  const X0 = -44, X1 = 44, top = -112, glass = '#3e6a86', steel = '#8a949c';
  V.fog = .15; ctX_bWall(-150, -84, 104, 84, '#b8ae9c', 'plain'); ctX_wins(-146, -80, 96, 76, 6, 11, 5, 4, 5, { lit: .45 }); ctX_bWall(46, -70, 104, 70, '#a09888', 'plain'); ctX_wins(50, -66, 96, 62, 6, 9, 5, 4, 9, { lit: .45 }); V.fog = 0;
  // service core
  ctX_R(X1 - 12, top - 6, 12, -top + 6, ctX_c('#b4b0a8', -.9)); ctX_R(X1 - 12, top - 6, 2, -top + 6, ctX_c('#b4b0a8', 0));
  // curtain wall: panes reflect the sky, with slanted glints
  const gx0 = X0, gx1 = X1 - 12, cols = 8, rows = 14, pw = (gx1 - gx0) / cols, ph = (-12 - top) / rows;
  ctX_sub(() => {
    ctX_banded(Math.round(ctX_x(gx0)), Math.round(ctX_y(top)), Math.round((gx1 - gx0) * V.u), Math.round((-12 - top) * V.u), V.n ? ['#0e1830', '#182848'] : [ctX_c('#7aa4c8', .6), ctX_c(glass, 0), ctX_c(glass, -1)], 10);
    ctX_atop(() => { if (!V.n) for (const [a, w2] of [[-30, 10], [-8, 4], [14, 16]]) ctX_P([gx0 + a, -12, gx0 + a + w2, -12, gx0 + a + w2 + 60, top, gx0 + a + 60, top], 'rgba(255,255,255,.12)');
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const on = V.n && ctX_h(i * 31 + j, 8) < .5; if (on) ctX_R(gx0 + i * pw + .4, top + j * ph + .4, pw - .8, ph - .8, ctX_h(i, j) < .8 ? '#dce8e0' : '#ffd890'); } });
  });
  for (let i = 0; i <= cols; i++) ctX_R(gx0 + i * pw - .3, top, .6, -12 - top, ctX_c(steel, i === 0 ? 1 : 0));
  for (let j = 0; j <= rows; j++) ctX_R(gx0, top + j * ph - .35, gx1 - gx0, .7, ctX_c(steel, -.3));
  ctX_R(X0 - 1, top - 3, X1 - X0 + 2, 3, ctX_c('#c8c4bc', .6));
  // lobby: glass doors under a canopy
  ctX_R(X0, -12, X1 - X0, 12, ctX_c('#c8c0b0', 0)); ctX_R(-20, -11, 40, 11, V.n ? '#ffe8b0' : ctX_c('#3a5068', 0)); for (let x = -20; x <= 20; x += 8) ctX_R(x - .3, -11, .6, 11, ctX_c(steel, 0));
  if (V.n) { ctX_R(-20, -3, 40, 3, '#e8d098'); ctX_glow(ctX_x(0), ctX_y(0), 30 * V.u, '#ffe0a0', .25); }
  ctX_R(-26, -15, 52, 3, ctX_c('#d8d4cc', .4)); ctX_R(-26, -12.4, 52, .6, ctX_c('#222', 0));
  for (const x of [-38, 30]) { ctX_R(x, -4, 8, 4, ctX_c('#8a8a88', 0)); ctX_E(x + 4, -5.5, 4.4, 2.4, ctX_c('#4a7a3a', 0)); ctX_E(x + 3, -6.4, 2.4, 1.2, ctX_c('#4a7a3a', 1)); }
  ctX_R(X0 - 1, -.8, X1 - X0 + 2, .8, ctX_c('#8a8a88', 0));
  return { wins: [], door: [0, -6], sign: [0, -19.5], flag: b.agency ? [X0 + 2, top - 3] : null, lamp: -60, guards: [[-24, 5], [24, 5], [-50, 7], [52, 7]] };
}
function ctX_towerBlock(V, b, r) {
  const X0 = -40, X1 = 40, top = -130, con = '#b4b0a4';
  V.fog = .2; ctX_bWall(-160, -110, 100, 110, '#a8a498', 'panel'); ctX_wins(-156, -106, 92, 102, 7, 17, 4, 3, 3, { lit: .4 }); ctX_bWall(62, -96, 100, 96, '#aca698', 'panel'); ctX_wins(66, -92, 92, 88, 7, 15, 4, 3, 4, { lit: .4 }); V.fog = 0;
  ctX_bWall(X0, top, X1 - X0, -top, con, 'panel');
  ctX_R(X1 - 8, top, 8, -top, ctX_c(con, -1)); ctX_R(X0, top, 1.5, -top, ctX_c(con, .8));
  const wins = [];
  for (let j = 0; j < 20; j++) { const y = top + 3 + j * 6; if (y > -12) break;
    for (let i = 0; i < 6; i++) { const x = X0 + 3 + i * 12; if (i === 3) { ctX_R(x + 1, y + .5, 3, 4, V.n ? ctX_lamp(.2) : ctX_c('#3a4458', 0)); continue; }
      const lit = V.n && ctX_h(i * 23 + j, 11) < .45; ctX_R(x, y, 7, 4, lit ? ctX_lamp(ctX_h(i, j)) : ctX_c('#3a4458', -.2)); if (!lit) ctX_R(x, y, 3.5, 1.5, ctX_c('#6a86a8', V.n ? -1.5 : 0)); wins.push([x, y, 7, 4]);
      if ((i + j) % 2 === 0 && i !== 3) { const bc = ['#b85a3a', '#5a7aa0', '#c8c4b8', '#8a9a5a'][ctX_h(i, j + 50) * 4 | 0]; ctX_R(x - 1, y + 3, 9, 2.6, ctX_c(bc, 0)); ctX_R(x - 1, y + 3, 9, .5, ctX_c(bc, 1)); ctX_R(x - 1, y + 5.6, 9, .5, 'rgba(0,0,0,.35)');
        if (ctX_h(i, j + 70) < .3) ctX_E(x + 1.5, y + 2.2, 1.6, 1.2, ctX_c('#4a8a3a', 0)); } }
  }
  for (const [x, h2] of [[-30, 8], [-14, 10], [22, 7]]) { ctX_L(x, top, x, top - h2, '#2a2a2e', .4); ctX_L(x - 3, top - h2 + 1, x + 3, top - h2 + 1, '#2a2a2e', .4); ctX_L(x - 2, top - h2 + 3, x + 2, top - h2 + 3, '#2a2a2e', .4); }
  // entrance, canopy and graffiti
  ctX_R(-8, -11, 16, 11, ctX_c('#4a4a52', 0)); ctX_R(-6, -10, 12, 10, V.n ? '#ffdca0' : ctX_c('#2a3038', 0)); ctX_R(-.3, -10, .6, 10, ctX_c('#8a8a8a', 0)); ctX_R(-12, -14, 24, 2.4, ctX_c('#8a8a88', .4)); ctX_R(-12, -11.8, 24, .5, '#222');
  const tag = (x, y, c, k) => { g.strokeStyle = ctX_c(c, .4); g.lineWidth = Math.max(1, V.u * .7); g.beginPath(); for (let i = 0; i < 7; i++) g.lineTo(ctX_x(x + i * 1.6), ctX_y(y + (ctX_h(i, k) - .5) * 5)); g.stroke(); };
  tag(-36, -4, '#d83a3a', 1); tag(-24, -3, '#3a8ad8', 2); tag(18, -5, '#e8c83a', 3); tag(28, -3, '#e83ac8', 4);
  return { wins, door: [0, -5], sign: [0, -17], laundry: [[X0 + 14, -58], [X0 + 38, -94], [X0 + 62, -40]], flag: null, lamp: -54, guards: [[-16, 5], [16, 5], [-48, 7], [50, 7]] };
}
function ctX_villa(V, b, r) {
  const reg = (cityById(b.city) || {}).region || 'europe', wall = { europe: '#e6c088', mideast: '#ece2cc', americas: '#e8aaa0' }[reg], X0 = -40, X1 = 40, top = -40, tile = '#b85e3e';
  V.fog = .15; for (const [x, w2] of [[-150, 100], [52, 100]]) { ctX_bWall(x, -34, w2, 34, reg === 'mideast' ? '#dcd0b4' : '#d8b890', 'stucco'); ctX_P([x - 2, -34, x + w2 + 2, -34, x + w2 - 8, -42, x + 8, -42], ctX_c(tile, -.3)); ctX_wins(x + 6, -30, w2 - 12, 22, 4, 2, 5, 6, x | 0, { lit: .4 }); } V.fog = 0;
  for (const x of [-56, 58]) ctX_tree(x, -2, 1.6, reg === 'europe' ? 'cypress' : 'palm', { leaf: '#3f6e36', lean: .1 });
  ctX_bWall(X0, top, X1 - X0, -top, wall, 'stucco'); ctX_R(X1 - 6, top, 6, -top, ctX_c(wall, -1));
  ctX_P([X0 - 5, top, X1 + 5, top, X1 - 10, top - 14, X0 + 10, top - 14], ctX_c(tile, 0)); ctX_P([X1 - 10, top - 14, X1 + 5, top, X1 - 6, top], ctX_c(tile, -1.2));
  for (let yy = top - 12; yy < top; yy += 2.2) ctX_R(X0 - 4 + (yy - top + 14) * -.9, yy, X1 - X0 + 8 - (yy - top + 14) * -1.8, .5, ctX_c(tile, -.9));
  ctX_R(X0 - 5, top, X1 - X0 + 10, 1.4, ctX_c(wall, -2));
  const wins = [];
  const arched = (x, y, w, h, shut) => { const lit = V.n && ctX_h(x * 3 + y, 31) < .55; ctX_R(x - .8, y - .8, w + 1.6, h + .8, ctX_c(wall, .8)); ctX_R(x, y + w / 2, w, h - w / 2, lit ? '#ffd890' : ctX_c('#2c3040', 0)); ctX_E(x + w / 2, y + w / 2, w / 2, w / 2, lit ? '#ffe0a0' : ctX_c('#2c3040', 0));
    ctX_R(x + w / 2 - .25, y + w / 2, .5, h - w / 2, ctX_c('#e8e0d0', -1)); if (shut) { ctX_R(x - w * .55, y + w / 2, w * .5, h - w / 2, ctX_c('#3a6a4a', 0)); ctX_R(x + w * 1.05, y + w / 2, w * .5, h - w / 2, ctX_c('#3a6a4a', -.6)); for (let k = y + w / 2 + 1; k < y + h; k += 1.4) { ctX_R(x - w * .55, k, w * .5, .3, ctX_c('#3a6a4a', -1.4)); ctX_R(x + w * 1.05, k, w * .5, .3, ctX_c('#3a6a4a', -1.8)); } }
    ctX_R(x - 1, y + h, w + 2, 1, ctX_c(wall, 1)); wins.push([x, y, w, h]); };
  arched(-30, -35, 7, 13, 1); arched(-3.5, -35, 7, 13, 0); arched(23, -35, 7, 13, 1); arched(-30, -17, 7, 12, 1); arched(23, -17, 7, 12, 0);
  ctX_R(-9, -23, 18, 1.2, ctX_c('#2a2a2e', 0)); for (let x = -9; x <= 9; x += 1.5) ctX_R(x, -26.5, .35, 3.5, '#2a2a2e'); ctX_R(-9, -26.8, 18, .5, '#2a2a2e');
  ctX_R(-5, -15, 10, 15, ctX_c('#5a3a24', 0)); ctX_E(0, -15, 5, 4, ctX_c('#5a3a24', 0)); for (let k = -4; k < 5; k += 2) ctX_R(k, -17, .4, 17, ctX_c('#5a3a24', -1)); ctX_E(2.8, -7, .6, .6, ctX_c('#c8a040', 0));
  // garden wall, iron gate, bougainvillea
  const gw = '#dcc8a8'; ctX_R(-120, -9, 240, 9, ctX_c(gw, 0)); ctX_R(-120, -10, 240, 1.4, ctX_c(gw, 1)); ctX_R(-120, -1, 240, 1, ctX_c(gw, -1.2));
  ctX_R(-9, -13, 18, 13, V.n ? ctX_c('#5a3a24', 0) : 'rgba(0,0,0,0)');
  ctX_R(-9, -9, 18, 9, ctX_c('#5a4a38', -1.5)); for (let x = -8; x <= 8; x += 2) ctX_R(x, -12, .5, 12, '#1c1c20'); ctX_R(-9, -12, 18, .6, '#1c1c20'); ctX_R(-9, -6, 18, .5, '#1c1c20');
  for (const x of [-11, 9]) { ctX_R(x, -13, 2.4, 13, ctX_c(gw, .3)); ctX_R(x - .4, -14, 3.2, 1.2, ctX_c(gw, 1)); }
  for (let i = 0; i < 26; i++) { const bx = -100 + ctX_h(i, 61) * 80 + (ctX_h(i, 62) < .5 ? 0 : 108), by = -10 + ctX_h(i, 63) * 8, rr = 1.4 + ctX_h(i, 64) * 1.6;
    ctX_E(bx, by, rr * 1.2, rr, ctX_c('#3e6a34', ctX_h(i, 65) < .5 ? -.6 : .2)); ctX_E(bx - .4, by - .4, rr * .7, rr * .6, ctX_c('#c8307a', ctX_h(i, 66) < .5 ? .6 : -.2)); }
  return { wins, door: [0, -8], sign: null, lamp: -20, guards: [[-16, 5], [16, 5], [-48, 7], [48, 7]], gateLamp: [[-9.8, -16], [10.2, -16]] };
}
const ctX_bldCache = new Map();
function ctX_bldLayers(b, w, h, n) {
  const type = ctX_bType(b), key = 'ctXbld' + (b.key || b.address) + type + w + 'x' + h + (n ? 'n' : 'd');
  let L = ctX_bldCache.get(key); if (L) return L;
  const c = cityById(b.city) || CITIES[0], S = ctX_CITY[c.id] || ctX_CITY.WAS, fw = w * RES, fh = h * RES, gy = Math.round(fh * .8), u = fw / 200;
  const cols = (ctX_SKIES[S.sky] || ctX_SKIES.clear)[n ? 'n' : 'd'];
  const V = { fw, fh, gy, u, ox: fw / 2, n, fog: 0, flood: false, hz: mix(cols[cols.length - 2], cols[cols.length - 1], .5), bot: (fh - gy) / u };
  L = { V, type };
  const run = fn => () => { const pv = ctX_V; ctX_V = V; try { fn(); } finally { V.fog = 0; ctX_V = pv; } };
  L.back = art(key + 'b', w, h, run(() => ctX_skyPaint(V, Object.assign({}, S, { moonX: .15 }))));
  L.mid = art(key + 'm', w, h, run(() => {
    V.fog = .45; ctX_town(-200, 200, ctX_REG_STYLE[c.region] || 'euro', 'bt' + c.id, { hk: type === 'agent' ? 1.3 : type === 'hideout' ? 2.4 : 3.2, sc: 1.4 }); V.fog = 0;
    ctX_gStreet(V, { pave: '#b8ae9c', lamps: [], pw: 11 });
    const r = ctX_rng(key);
    if (type === 'agent') { const k = 1.35; ctX_scaled(k, 0, 0, () => { L.info = ctX_villa(ctX_V, b, r); }); const I = L.info; I.wins = I.wins.map(([a, b2, c2, d]) => [a * k, b2 * k, c2 * k, d * k]); I.door = [I.door[0] * k, I.door[1] * k]; I.gateLamp = I.gateLamp.map(([a, b2]) => [a * k, b2 * k]); }
    else L.info = (type === 'office' ? ctX_office : type === 'active cell' ? ctX_towerBlock : ctX_townhouse)(V, b, r);
    // a street lamp on the pavement
    const lx = L.info.lamp; ctX_R(lx - .6, -44, 1.2, 46, ctX_c('#2a302e', 0)); ctX_R(lx - .6, -44, .4, 46, ctX_c('#2a302e', 1.2)); ctX_R(lx - 1.4, -1, 2.8, 3, ctX_c('#2a302e', 0));
    ctX_L(lx, -43, lx + 6, -45, ctX_c('#2a302e', 0), .8); ctX_P([lx + 4, -45.5, lx + 9, -45.5, lx + 8, -43, lx + 5, -43], ctX_c('#2a302e', .4)); ctX_R(lx + 5.2, -43, 2.6, .8, V.n ? '#fff4c8' : ctX_c('#e8e4d0', 0));
    if (V.n) { ctX_glow(ctX_x(lx + 6.5), ctX_y(-42), 26 * V.u, '#ffd080', .3); g.save(); g.translate(ctX_x(lx + 6.5), ctX_y(3)); g.scale(1, .3); ctX_glow(0, 0, 30 * V.u, '#ffc870', .35); g.restore(); }
  }));
  ctX_bldCache.set(key, L); return L;
}
function ctX_sign(L, b, x, y) { // agency / company signs in the chunky UI font, on a plate
  const i = L.info; if (!i.sign && !b.agency) return;
  const V = L.V, s = b.agency || (L.type === 'office' ? 'IMPORT-EXPORT' : null); if (!s) return;
  const [sx, sy] = i.sign || [0, -18], cx = x + ctX_x(sx) / RES, cy = y + ctX_y(sy) / RES, tw = textW(s) + 8;
  const col = { KGB: ['#8a1a1a', '#e8c040'], MI6: ['#1a2238', '#d8d0b8'], Mossad: ['#e8e8f0', '#1a3a8a'] }[b.agency] || ['#2a2a30', '#d8d4c8'];
  rect(cx - tw / 2 + 1, cy - 5, tw, 11, 'rgba(0,0,0,.4)'); rect(cx - tw / 2, cy - 6, tw, 11, col[0]); rect(cx - tw / 2, cy - 6, tw, 1, mix(col[0], '#ffffff', .3));
  if (b.agency === 'KGB') { rect(cx - tw / 2 + 2, cy - 3, 3, 3, col[1]); }
  textC(s, cx, cy - 4, col[1]);
}
function buildingArt(x, y, w, h, b) {
  const n = isNight(), L = ctX_bldLayers(b, w, h, n), V = L.V, t = ctX_now(), pv = ctX_V, i = L.info;
  ctX_V = V;
  try {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    blit(L.back, x, y);
    fine(() => { g.translate(Math.round(x * RES), Math.round(y * RES)); const cl = ctX_cloudArt('b' + (n ? 'n' : 'd') + b.city, 60, 18, n, (ctX_CITY[b.city] || {}).sky, b.city); g.drawImage(cl, Math.round((t * 2 + 40) % (V.fw + 120) - 120), 20); });
    blit(L.mid, x, y);
    fine(() => { g.translate(Math.round(x * RES), Math.round(y * RES)); ctX_bldLive(L, b, t); });
    ctX_sign(L, b, x, y);
    g.restore();
  } finally { ctX_V = pv; }
}
function ctX_bldLive(L, b, t) {
  const V = L.V, i = L.info, n = V.n, uni = ctX_uni(b), seed = ctX_sid(b.key || b.address || 'x');
  // chimney smoke, laundry, a face at a window, TV flicker
  for (const [sx, sy] of i.smoke || []) ctX_smoke(sx, sy, t, 1.3, n ? '#3a4058' : '#d8d8dc');
  for (const [lx, ly] of i.laundry || []) { ctX_L(lx - 4, ly, lx + 6, ly, '#3a3a3a', .25); for (let k = 0; k < 4; k++) { const sw = Math.sin(t * 3 + k + lx) * .6; ctX_P([lx - 3.5 + k * 2.4, ly, lx - 1.8 + k * 2.4, ly, lx - 1.8 + k * 2.4 + sw, ly + 2.6, lx - 3.5 + k * 2.4 + sw, ly + 2.6], ctX_c(['#e8e4d8', '#c84a3a', '#4a7ac8', '#e8c040'][(k + seed) & 3], 0)); } }
  if (i.wins.length) { const wv = i.wins[(seed >>> 0) % i.wins.length], ph = t % 7;
    if (ph > 4.6) { const [wx, wy, ww, wh] = wv, fx = wx + ww / 2; ctX_E(fx, wy + wh * .4, ww * .18, wh * .16, n ? '#1a1414' : ctX_c('#d8a080', -.5)); ctX_R(fx - ww * .28, wy + wh * .55, ww * .56, wh * .45, n ? '#1a1414' : ctX_c(uni, -.5)); }
    if (n) { const tv = i.wins[(seed >>> 3) % i.wins.length], f = Math.sin(t * 13) + Math.sin(t * 7.3); ctX_R(tv[0] + .5, tv[1] + .5, tv[2] - 1, tv[3] - 1, `rgba(120,170,255,${(.25 + .12 * f).toFixed(2)})`); } }
  if (i.gateLamp && n) for (const [gx, gy] of i.gateLamp) { ctX_R(gx - .6, gy - 1.6, 1.2, 1.6, '#ffe8a8'); ctX_glow(ctX_x(gx), ctX_y(gy), 10 * V.u, '#ffc870', .3); }
  if (i.flag) { const [fx, fy] = i.flag, a = b.agency; ctX_R(fx - .2, fy - 14, .4, 14, ctX_c('#d8d8d8', 0));
    ctX_flag(fx + .2, fy - 14, t, a === 'KGB' ? ['#c8201c'] : a === 'MI6' ? ['#1a3a8a', '#e8e8e8', '#c8102e', '#e8e8e8', '#1a3a8a'] : ['#f0f0f4', '#2a4ab0', '#f0f0f4', '#f0f0f4', '#2a4ab0', '#f0f0f4'], 1.1);
    if (a === 'KGB') ctX_R(fx + 1.2, fy - 13.2, 1, 1, '#f0d040'); }
  // traffic: a parked car at the kerb and one passing now and then
  const road = V.road; ctX_scaled(1.9, 60, road[0] + 3.6, () => ctX_car(0, 0, ['#2a2a30', '#6a1a1a', '#1a3a5a', '#d8d4c8'][(seed >>> 5) & 3], -1, { len: 13 }));
  const ph = (t + (seed & 7) * 3) % 12; if (ph < 3) { const dir = ((t / 12) | 0) % 2 ? 1 : -1, k = ph / 3; ctX_scaled(1.9, dir > 0 ? -130 + k * 260 : 130 - k * 260, road[0] + (dir > 0 ? road[1] - road[0] - 1 : 6), () => ctX_car(0, 0, ['#c8c4b4', '#8a2a2a', '#3a5a8a', '#e0b040'][((t / 12) | 0) & 3], dir, { len: 13 })); }
  // guards: more of them the more alert the building is
  const nG = Math.min(6, 1 + (b.alert || 0) + (b.suspect !== null && b.suspect !== undefined ? 1 : 0) + (b.agency ? 1 : 0));
  for (let k = 0; k < nG; k++) {
    if (k < i.guards.length) { const [gx, gy] = i.guards[k], dir = ((t / 3 + k) | 0) % 3 === 0 ? -1 : 1; ctX_guard(gx, gy, 1.05, uni, gx < 0 ? dir : -dir, t, k, false);
      if (n && k === 1) { const X = ctX_x(gx - 3), Y = ctX_y(gy - 11), a = Math.sin(t * .8) * .4 + 2.6; const gr = g.createLinearGradient(X, Y, X + Math.cos(a) * 60 * V.u, Y + Math.sin(a) * 60 * V.u); gr.addColorStop(0, 'rgba(255,250,220,.35)'); gr.addColorStop(1, 'rgba(255,250,220,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(X, Y); g.lineTo(X + Math.cos(a - .15) * 60 * V.u, Y + Math.sin(a - .15) * 60 * V.u); g.lineTo(X + Math.cos(a + .15) * 60 * V.u, Y + Math.sin(a + .15) * 60 * V.u); g.fill(); } }
    else { const span = 240, kk = k - i.guards.length, pos = (t * 7 + kk * 90) % (span * 2), fwd = pos < span, xx = fwd ? -120 + pos : 120 - (pos - span); ctX_guard(xx, 8 + kk * 1.5, 1.1, uni, fwd ? 1 : -1, t, k + 3, true); }
  }
  // a passer-by
  const cp = (t * 5 + (seed & 31) * 7) % 300; if (cp < 260) ctX_walker(130 - cp, 9.5, 2.2, seed & 7, t, -1);
}

// ---------------------------------------------------------------
// BINOCULARS: the doorway, magnified, through two overlapping lenses;
// whoever comes out is shown with their dossier face.
// ---------------------------------------------------------------
function ctX_binoMask(w, h, c1x, c2x, cy, r) {
  return art('ctXbmask' + w + 'x' + h + '|' + r, w, h, () => {
    const FW = w * RES, FH = h * RES, R = r * RES, im = g.createImageData(FW, FH), d = im.data;
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      const e = R - Math.min(Math.hypot(x - c1x * RES, y - cy * RES), Math.hypot(x - c2x * RES, y - cy * RES)), i = (y * FW + x) * 4;
      const a = e < 0 ? 1 : e < 26 ? (1 - e / 26) ** 2 * .9 : 0; d[i] = 4; d[i + 1] = 4; d[i + 2] = 8; d[i + 3] = Math.round(a * 255);
    }
    g.putImageData(im, 0, 0);
  });
}
function ctX_binoBack(b, type, n, open) { // 100 x 100 design units on a 400 x 400 fine canvas (u = 4)
  const V = { fw: 400, fh: 400, gy: 300, u: 4, ox: 200, n, fog: 0, flood: false, hz: '#8898b0', bot: 25 }, pv = ctX_V; ctX_V = V;
  try {
    const wall = { hideout: '#8e4c38', office: '#c8c0b0', 'active cell': '#b4b0a4', agent: '#e6c088' }[type] || '#8e4c38';
    ctX_bWall(-60, -80, 120, 80, wall, type === 'hideout' ? 'brick' : type === 'active cell' ? 'panel' : 'plain', 5);
    if (type === 'office') { for (let x = -60; x < 60; x += 12) ctX_R(x, -80, .8, 80, ctX_c('#8a949c', 0)); ctX_banded(Math.round(ctX_x(-60)), 0, 480, Math.round(ctX_y(-50)), n ? ['#0e1830', '#1a2a48'] : ['#6a94b8', '#3e6a86'], 6); }
    if (type === 'active cell') { g.strokeStyle = ctX_c('#d83a3a', .3); g.lineWidth = 5; g.beginPath(); for (let i = 0; i < 8; i++) g.lineTo(ctX_x(-44 + i * 3), ctX_y(-20 + (ctX_h(i, 3) - .5) * 8)); g.stroke(); g.strokeStyle = ctX_c('#3a8ad8', .3); g.beginPath(); for (let i = 0; i < 7; i++) g.lineTo(ctX_x(24 + i * 3), ctX_y(-14 + (ctX_h(i, 5) - .5) * 8)); g.stroke(); }
    // doorway
    const dw = 15, dh = 36, frameC = type === 'agent' ? '#f0e4c8' : '#d8ccb4';
    ctX_R(-dw / 2 - 3, -dh - 3, dw + 6, dh + 3, ctX_c(frameC, .3)); ctX_R(-dw / 2 - 3, -dh - 3, 1.2, dh + 3, ctX_c(frameC, 1.2)); ctX_R(dw / 2 + 1.8, -dh - 3, 1.2, dh + 3, ctX_c(frameC, -1.3));
    if (open) { ctX_banded(Math.round(ctX_x(-dw / 2)), Math.round(ctX_y(-dh)), dw * 4, dh * 4, n ? ['#ffe0a0', '#c88a4a'] : ['#3a2c24', '#1e1814'], 6); ctX_R(-dw / 2, -dh, 3, dh, n ? '#b87a40' : '#2a201a'); const dc = type === 'hideout' ? '#1e3a2c' : type === 'agent' ? '#5a3a24' : '#5a6068'; ctX_P([dw / 2 - 1, -dh, dw / 2 + 5, -dh - 2, dw / 2 + 5, 2, dw / 2 - 1, 0], ctX_c(dc, -.4)); }
    else { const dc = type === 'hideout' ? '#1e3a2c' : type === 'agent' ? '#5a3a24' : '#5a6068'; ctX_R(-dw / 2, -dh, dw, dh, ctX_c(dc, 0)); for (const [x, y, w2, h2] of [[-6, -33, 5, 14], [1, -33, 5, 14], [-6, -16, 5, 14], [1, -16, 5, 14]]) { ctX_R(x, y, w2, h2, ctX_c(dc, .6)); ctX_R(x + .4, y + .4, w2 - .8, h2 - .8, ctX_c(dc, -.2)); } ctX_E(4.5, -18, .8, .8, ctX_c('#d8b040', 1)); }
    // house number, lamp, steps
    const num = String((b.address || '').replace(/\D/g, '') || '12').slice(0, 2);
    ctX_R(-22, -30, 8, 5, ctX_c('#ece8dc', 0)); ctX_R(-22, -25.4, 8, .4, ctX_c('#ece8dc', -1.5));
    ctX_R(13, -31, 4, 6, ctX_c('#1e1e22', 0)); ctX_R(13.6, -30.4, 2.8, 4.4, n ? '#ffe8a8' : ctX_c('#c8d0d8', 0)); if (n) ctX_glow(ctX_x(15), ctX_y(-28), 60, '#ffd080', .35);
    for (let i = 0; i < 3; i++) ctX_R(-dw / 2 - 5 - i * 2, i * 2.2 - .2, dw + 10 + i * 4, 2.3, ctX_c('#c8c0b0', i % 2 ? -.4 : .4));
    ctX_R(-60, 6.6, 120, 20, ctX_c('#a8a090', -.3)); ctX_R(-60, 6.6, 120, .8, ctX_c('#a8a090', .8));
    // their car waiting at the kerb
    ctX_R(20, 14, 40, 14, ctX_c('#1e1e24', 0)); ctX_R(20, 14, 40, 1.4, ctX_c('#4a4a58', 0)); ctX_P([26, 14, 30, 7, 56, 7, 60, 14], ctX_c('#1e1e24', .3)); ctX_P([28, 13.6, 31, 8, 42, 8, 42, 13.6], n ? '#20243a' : ctX_c('#7a9ab8', 0));
    return num;
  } finally { ctX_V = pv; }
}
const ctX_faceCuts = new Map();
function ctX_faceFig(f, w, h) { // the dossier portrait at device size, backdrop swapped out, the coat extended down to the waist
  const key = (typeof fcX_key === 'function' ? fcX_key(f) : JSON.stringify(f)) + w + 'x' + h;
  let c = ctX_faceCuts.get(key); if (c) return c;
  const cut = document.createElement('canvas'); cut.width = w * RES; cut.height = h * RES; const cx = cut.getContext('2d'); cx.setTransform(RES, 0, 0, RES, 0, 0);
  const d0 = dither; dither = () => {};
  try { drawTo(cx, () => drawFace(Object.assign({}, f, { msXcut: true }), 0, 0, w, h)); } finally { dither = d0; }
  c = document.createElement('canvas'); c.width = cut.width; c.height = Math.round(cut.height * 1.9); const fx = c.getContext('2d'), CW = c.width, CH = c.height, PH = cut.height;
  fx.drawImage(cut, 0, 0);
  fx.drawImage(cut, 0, PH - 2, CW, 1, 0, PH - 2, CW, CH - PH + 2); // extrude the bottom row: lapels, tie and coat carry on
  let l = 0, r = CW - 1, skin = '#d8a080';
  try { const row = fx.getImageData(0, PH - 3, CW, 1).data; while (l < CW - 1 && row[l * 4 + 3] < 128) l++; while (r > 0 && row[r * 4 + 3] < 128) r--;
    const sp = cx.getImageData(Math.round(CW * .5), Math.round(PH * .46), 1, 1).data; if (sp[3] > 200) skin = '#' + [sp[0], sp[1], sp[2]].map(v => v.toString(16).padStart(2, '0')).join(''); } catch (e) { l = CW * .1; r = CW * .9; }
  fx.globalCompositeOperation = 'source-atop';
  const gr = fx.createLinearGradient(0, PH, 0, CH); gr.addColorStop(0, 'rgba(10,8,20,0)'); gr.addColorStop(1, 'rgba(10,8,20,.45)'); fx.fillStyle = gr; fx.fillRect(0, PH, CW, CH - PH);
  const aw = (r - l) * .2; fx.fillStyle = 'rgba(10,8,20,.35)'; fx.fillRect(l + aw, PH + 4, 2, CH * .78 - PH); fx.fillRect(r - aw - 2, PH + 4, 2, CH * .78 - PH);
  fx.fillStyle = 'rgba(255,255,255,.1)'; fx.fillRect(l, PH, aw * .4, CH - PH); fx.fillStyle = 'rgba(0,0,0,.25)'; fx.fillRect(r - aw * .5, PH, aw * .5, CH - PH);
  fx.globalCompositeOperation = 'source-over';
  const hy = CH * .8; fx.fillStyle = skin; fx.beginPath(); fx.ellipse(l + aw * .5, hy, aw * .45, aw * .55, 0, 0, 7); fx.fill(); fx.beginPath(); fx.ellipse(r - aw * .5, hy, aw * .45, aw * .55, 0, 0, 7); fx.fill();
  fx.fillStyle = 'rgba(0,0,0,.25)'; fx.fillRect(l + aw * .5, hy - aw * .1, aw * .45, aw * .6); fx.fillRect(r - aw * .5, hy - aw * .1, aw * .45, aw * .6);
  const bx = r - aw * 1.4, by = hy + aw * .3; fx.fillStyle = '#4a2c1a'; fx.fillRect(bx - aw * 1.2, by, aw * 3.4, aw * 2.4); fx.fillStyle = '#6a4228'; fx.fillRect(bx - aw * 1.2, by, aw * 3.4, 3); fx.fillStyle = '#2a180e'; fx.fillRect(bx - aw * 1.2, by + aw * 2.4 - 3, aw * 3.4, 3); fx.fillStyle = '#d8b040'; fx.fillRect(bx + aw * .4, by + 5, 4, 3);
  fx.strokeStyle = '#2a180e'; fx.lineWidth = 3; fx.beginPath(); fx.moveTo(bx - aw * .1, by); fx.lineTo(bx - aw * .1, by - aw * .5); fx.lineTo(bx + aw * 1, by - aw * .5); fx.lineTo(bx + aw * 1, by); fx.stroke();
  ctX_faceCuts.set(key, c); return c;
}
let ctX_binoFace = null, ctX_binoT0 = 0;
function binocularArt(x, y, w, h, b, face) {
  const n = isNight(), type = ctX_bType(b), t = ctX_now();
  if (face !== ctX_binoFace) { ctX_binoFace = face; ctX_binoT0 = t; }
  const cy = Math.round(h / 2 - 8), r = Math.round(Math.min(h * .3, w * .3)), c1x = Math.round(w / 2 - r * .64), c2x = Math.round(w / 2 + r * .64);
  const bg = art('ctXbino' + (b.key || b.address) + type + (n ? 'n' : 'd') + (face ? 'o' : 'c'), 200, 200, () => ctX_binoBack(b, type, n, !!face));
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); rect(x, y, w, h, '#040408');
  g.beginPath(); g.arc(x + c1x, y + cy, r, 0, 7); g.moveTo(x + c2x + r, y + cy); g.arc(x + c2x, y + cy, r, 0, 7); g.clip();
  // hand-held: a slow drift plus a little tremor
  const jx = Math.sin(t * .9) * 1.6 + Math.sin(t * 3.1) * .7, jy = Math.cos(t * .7) * 1.3 + Math.sin(t * 2.7) * .6, Z = 1.5, ox = x + w / 2 - 100 * Z - 16 + jx, oy = y + cy - 114 * Z + 12 + jy;
  g.drawImage(bg, ox, oy, 200 * Z, 200 * Z);
  const num = String((b.address || '').replace(/\D/g, '') || '12').slice(0, 2); textC(num, ox + 64 * Z, oy + 92 * Z, '#2a2a30');
  if (face) { // they step out of the door toward the car
    const e = clamp((t - ctX_binoT0) / 1.8, 0, 1), fw = 42, fh = 52, fig = ctX_faceFig(face, fw, fh), walk = e < 1 ? Math.abs(Math.sin(t * 7)) * 1.4 : 0;
    const px2 = ox + 100 * Z - fw / 2 + e * 22, py = oy + 72 * Z + (1 - e) * 4 - walk + e * 6;
    g.drawImage(fig, px2, py, fw, fig.height / RES);
  }
  g.restore();
  g.drawImage(ctX_binoMask(w, h, c1x, c2x, cy, r), x, y, w, h);
  // eyecup rims and a glint on the glass
  g.save(); g.lineWidth = 2; g.strokeStyle = 'rgba(40,40,52,.9)'; g.beginPath(); g.arc(x + c1x, y + cy, r + .5, Math.PI * .55, Math.PI * 1.45 + 0); g.stroke(); g.beginPath(); g.arc(x + c2x, y + cy, r + .5, -Math.PI * .45, Math.PI * .45); g.stroke();
  g.lineWidth = 1; g.strokeStyle = 'rgba(200,220,255,.18)'; g.beginPath(); g.arc(x + c1x, y + cy, r - 5, Math.PI * 1.1, Math.PI * 1.4); g.stroke(); g.beginPath(); g.arc(x + c2x, y + cy, r - 5, Math.PI * 1.1, Math.PI * 1.4); g.stroke(); g.restore();
}
