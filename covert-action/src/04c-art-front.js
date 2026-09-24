// ===================================================================
// ART (front end): title backdrop, Max/Maxine figures, training cards, the Chief
// Re-declares drawMaxFigure / trainingArt / chiefArt from 04-art.js and adds
// frX_titleBackdrop (to replace titleBackdrop in 05-hub.js).
// ===================================================================

// ---------- shared helpers ----------
const frX_BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function frX_bay(x, y) { return (frX_BAY[(y & 3) * 4 + (x & 3)] + 0.5) / 16; }
function frX_hash(x, y) { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
// scanline polygon rasteriser (no anti-aliasing): fn(x0, x1, y) for each span [x0, x1)
function frX_spans(pts, fn) {
  let y0 = 1e9, y1 = -1e9; for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  y0 = Math.floor(y0); y1 = Math.ceil(y1);
  for (let y = y0; y < y1; y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) { const a = Math.round(xs[i]), b = Math.round(xs[i + 1]); if (b > a) fn(a, b, y); }
  }
}
function frX_poly(pts, c) { g.fillStyle = c; frX_spans(pts, (a, b, y) => g.fillRect(a, y, b - a, 1)); }
// cylindrically shaded polygon: ramp dark..light, light comes from `lu` (0 = left edge, 1 = right edge)
function frX_shade(pts, ramp, o = {}) {
  const band = o.band || 2, lu = o.lu === undefined ? 0.3 : o.lu, amb = o.amb === undefined ? 0.15 : o.amb, gain = o.gain || 1, n = ramp.length - 1;
  const al = Math.asin(lu * 2 - 1);
  frX_spans(pts, (x0, x1, y) => {
    const wd = Math.max(1, x1 - x0);
    for (let x = x0; x < x1; x++) {
      const nx = clamp((x + 0.5 - x0) / wd * 2 - 1, -1, 1);
      let b = amb + (1 - amb) * Math.max(0, Math.cos(Math.asin(nx) - al));
      if (o.vy) b *= o.vy(y);
      let v = b * gain * n + (o.bias || 0); const fi = Math.floor(v); v = fi + clamp((v - fi - 0.5) * band + 0.5, 0, 1);
      const i = clamp(Math.floor(v + frX_bay(x, y) - 0.5), 0, n);
      g.fillStyle = ramp[i]; g.fillRect(x, y, 1, 1);
      if (o.rec) o.rec.push(x, y);
    }
  });
}
// thick limb between two points (quad), shaded
function frX_limb(x0, y0, w0, x1, y1, w1, ramp, o) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  frX_shade([[x0 - nx * w0 / 2, y0 - ny * w0 / 2], [x0 + nx * w0 / 2, y0 + ny * w0 / 2], [x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2]], ramp, o);
}
// string sprite: rows of chars -> colours (map values may be a colour or [c1, c2] for a checker)
function frX_grid(rows, map, ox, oy) {
  for (let y = 0; y < rows.length; y++) {
    const r = rows[y];
    for (let x = 0; x < r.length; x++) {
      const m = map[r[x]]; if (!m) continue;
      const c = typeof m === 'string' ? m : m[(ox + x + oy + y) & 1];
      g.fillStyle = c; g.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}
// remap an offscreen canvas's EGA colours (used for the dimmed figures)
function frX_remap(src, map) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const x = c.getContext('2d'); x.drawImage(src, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), a = d.data, lut = {};
  for (const k in map) lut[k.toLowerCase()] = map[k];
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3]) continue;
    const hex = '#' + [a[i], a[i + 1], a[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
    const m = lut[hex]; if (!m) continue;
    a[i] = parseInt(m.slice(1, 3), 16); a[i + 1] = parseInt(m.slice(3, 5), 16); a[i + 2] = parseInt(m.slice(5, 7), 16);
  }
  x.putImageData(d, 0, 0); return c;
}
function frX_clip(x, y, w, h) { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); }

// ---------- palettes ----------
const frX_SKIN = [P.K, P.RD, P.SK, P.SK, P.SK, P.W]; // deep shadow .. highlight
const frX_SUIT = [P.K, P.K, P.K, P.K, P.G1, P.G1, P.G3];
const frX_SHIRT = [P.G1, P.G3, P.W, P.W];
const frX_DIM = { [P.W]: P.G3, [P.YE]: P.G3, [P.CY]: P.G3, [P.SK]: P.G3, [P.PK]: P.G3, [P.G3]: P.G1, [P.RD]: P.G1, [P.BR]: P.G1, [P.BL2]: P.G1, [P.MG]: P.G1, [P.TL]: P.G1, [P.GR2]: P.G1 };

// ---------- Maximillian & Maxine, full-length (character select) ----------
const frX_FACEMAP = { K: P.K, h: P.K, H: P.G1, j: [P.G1, P.G3], l: P.SK, L: [P.SK, P.W], s: P.SK, d: [P.SK, P.RD], r: P.RD, w: P.W, e: P.BL, m: P.RD, M: [P.RD, P.SK] };
const frX_MAXHEAD = [
  '....KKKKKKK.....',
  '..KKhHHHhhhKK...',
  '.KhHHjjHHhhhhK..',
  '.KhHjjHhhhhhhhK.',
  'KhHHhhhhhhhhhhK.',
  'KhhhllsssssshhhK',
  'KhhlllsssssssdhK',
  'KhlllsssssssddhK',
  'KhlKKKsssKKKsdK.',
  'slswKwsLswKwsddr',
  'sllssssLdsssddr.',
  'dlssssslddssddK.',
  '.KlsssrdrsssddK.',
  '.KlssssssssssdK.',
  '.KlsssrmmmrsddK.',
  '.KlssssdddsssdK.',
  '..KlssssssssdK..',
  '..KlsssllsssdK..',
  '...KKsssssddK...',
  '....KKKdddKK....',
];
const frX_MAXINEHEAD = [
  '....KKKKKKKK....',
  '..KKhHHHHhhhK...',
  '.KhHHjjHHhhhhK..',
  '.KhHjjHhhhhhhhK.',
  'KhHHhhhhhhhhhhhK',
  'KhHhhhllsshhhhhK',
  'KhHhlllssssshhhK',
  'KhhllssssssssdhK',
  'KhhlKKssssKKdhhK',
  'KhlKewslsweKdhhK',
  'KhlssssldsssdhhK',
  'KhlssssldssddhhK',
  'KhhlsssrdsssdhhK',
  'KhhlssssssssdhhK',
  'KhhlssmmmmsddhhK',
  'KhhlsssMMssddhhK',
  'KhhKlssssssdKhhK',
  'KhhhKlsssssKhhhK',
  '.KhhhKKddKKhhhK.',
];
const frX_figCache = {};
let frX_sequins = [];
function frX_drawMax() {
  const sk = frX_SKIN, suit = frX_SUIT, sh = frX_SHIRT;
  // trousers
  frX_shade([[15, 92], [28, 92], [27, 164], [18, 164]], suit, { gain: 0.6, band: 3, lu: 0.25 });
  frX_shade([[28, 92], [41, 92], [38, 164], [29, 164]], suit, { gain: 0.6, band: 3, lu: 0.25, amb: 0.05 });
  rect(28, 100, 1, 64, P.K); for (let y = 96; y < 162; y += 1) px(16 + (y - 96) * 2 / 68 | 0, y, P.G1); // satin stripe
  // shoes
  for (const [x0, x1] of [[16, 28], [29, 41]]) { rect(x0 - 1, 164, x1 - x0 + 2, 6, P.K); rect(x0, 163, x1 - x0, 2, P.K); rect(x0 + 2, 165, 4, 1, P.G3); px(x0 + 3, 166, P.W); rect(x0 - 1, 170, x1 - x0 + 2, 1, P.G1); }
  // neck
  frX_shade([[23, 16], [32, 16], [32, 28], [23, 28]], sk, { gain: 0.88, lu: 0.3, amb: 0.3 });
  // jacket
  const jacket = [[13, 27], [23, 24], [33, 24], [43, 27], [47, 33], [44, 52], [40, 76], [42, 96], [28, 99], [14, 96], [16, 76], [12, 52], [9, 33]];
  frX_shade(jacket, suit, { gain: 0.6, band: 3, lu: 0.3 });
  // shirt front & waistcoat opening
  frX_shade([[23, 25], [33, 25], [30, 64], [26, 64]], sh, { lu: 0.35, amb: 0.5 });
  for (let y = 34; y < 62; y += 6) px(28, y, P.K); // studs
  // satin lapels
  frX_shade([[22, 26], [25, 26], [27, 58], [26, 60], [19, 38]], [P.K, P.G1, P.G1, P.G3], { lu: 0.2 });
  frX_shade([[31, 26], [34, 26], [37, 38], [30, 60], [29, 58]], [P.K, P.K, P.G1], { lu: 0.2 });
  // wing collar & bow tie
  frX_poly([[23, 23], [27, 26], [24, 29]], P.W); frX_poly([[33, 23], [29, 26], [32, 29]], P.G3);
  frX_poly([[22, 26], [28, 28], [22, 31]], P.K); frX_poly([[34, 26], [28, 28], [34, 31]], P.K); rect(27, 27, 3, 3, P.G1); px(23, 27, P.G1); px(27, 27, P.G3);
  // pocket square & buttons
  rect(15, 44, 6, 1, P.G1); frX_poly([[16, 44], [18, 41], [19, 43], [20, 41], [21, 44]], P.W); px(29, 70, P.G1); px(29, 78, P.G1);
  // jacket hem split & pocket flap
  line(28, 64, 28, 98, P.K); rect(34, 80, 6, 1, P.G1); rect(17, 80, 6, 1, P.G1);
  // arms: sleeves, cuffs, hands
  frX_limb(12, 31, 9, 10, 62, 9, suit, { gain: 0.6, band: 3, lu: 0.2 }); frX_limb(10, 61, 9, 11, 88, 8, suit, { gain: 0.6, band: 3, lu: 0.2 });
  frX_limb(44, 31, 9, 46, 62, 9, suit, { gain: 0.6, band: 3, lu: 0.35, amb: 0.05 }); frX_limb(46, 61, 9, 45, 88, 8, suit, { gain: 0.6, band: 3, lu: 0.35, amb: 0.05 });
  line(15, 36, 14, 86, P.K); line(41, 36, 41, 86, P.K); // arm/torso separation
  rect(7, 88, 8, 2, P.W); rect(41, 88, 8, 2, P.G3); // cuffs
  // left hand relaxed
  frX_shade([[7, 90], [15, 90], [15, 97], [13, 101], [9, 101], [7, 96]], sk, { gain: 0.88, lu: 0.3, amb: 0.3 });
  px(10, 100, P.RD); px(12, 100, P.RD); line(14, 92, 14, 98, P.RD);
  // right hand holding a pistol, muzzle down
  frX_shade([[41, 90], [49, 90], [49, 97], [41, 97]], sk, { gain: 0.88, lu: 0.3, amb: 0.3 });
  rect(42, 96, 7, 3, P.K); rect(43, 96, 5, 1, P.G1); rect(44, 99, 4, 14, P.K); rect(44, 99, 1, 13, P.G3); rect(45, 99, 1, 13, P.G1); px(46, 112, P.G1);
  rect(42, 92, 1, 4, P.RD); px(43, 93, P.RD); px(45, 93, P.RD); px(47, 93, P.RD);
  // head
  frX_grid(frX_MAXHEAD, frX_FACEMAP, 20, 0);
}
function frX_drawMaxine(rec) {
  const sk = frX_SKIN, dress = [P.K, P.K, P.K, P.K, P.G1, P.G1, P.G3];
  // hair mass behind the head, falling to the shoulders
  frX_shade([[20, 2], [36, 2], [39, 12], [40, 30], [42, 44], [36, 48], [30, 36], [26, 36], [20, 48], [14, 44], [16, 30], [17, 12]], [P.K, P.K, P.K, P.G1, P.G1, P.G3], { lu: 0.3, amb: 0.1, gain: 0.8 });
  // neck & bare shoulders/decollete
  frX_shade([[24, 14], [32, 14], [32, 30], [24, 30]], sk, { gain: 0.88, lu: 0.3, amb: 0.35 });
  frX_shade([[16, 32], [24, 28], [32, 28], [40, 32], [42, 38], [14, 38]], sk, { gain: 0.88, lu: 0.3, amb: 0.35 });
  // gown: bodice, waist, hips, flared skirt with a slit
  const bodice = [[15, 38], [22, 36], [28, 39], [34, 36], [41, 38], [39, 52], [36, 66], [37, 76], [40, 92], [42, 118], [44, 162], [36, 163], [34, 116], [30, 110], [28, 163], [12, 163], [15, 118], [16, 92], [19, 76], [20, 66], [17, 52]];
  frX_shade(bodice, dress, { lu: 0.3, amb: 0.1, gain: 0.62, band: 3, rec });
  // bare leg through the slit
  frX_shade([[30, 112], [34, 118], [36, 162], [31, 162]], sk, { gain: 0.88, lu: 0.2, amb: 0.3 });
  // sequin sparkle baked in
  for (let i = 0; i < rec.length; i += 2) { const x = rec[i], y = rec[i + 1], h = frX_hash(x, y), lit = Math.abs((x - 20) - (y - 40) * 0.08) < 7; if (h < (lit ? 0.09 : 0.03)) px(x, y, P.G3); else if (h < (lit ? 0.12 : 0.035)) px(x, y, P.W); else if (h < (lit ? 0.3 : 0.1)) px(x, y, P.G1); }
  line(19, 33, 25, 32, P.RD); line(31, 32, 37, 33, P.RD); rect(27, 34, 2, 4, P.RD); px(28, 36, P.K); dither(33, 29, 8, 9, P.SK, P.RD, 5); rect(25, 28, 7, 1, P.RD);
  // neckline & waist
  line(15, 38, 22, 36, P.G1); line(34, 36, 41, 38, P.G1); line(22, 36, 28, 39, P.K); line(28, 39, 34, 36, P.K);
  // heels
  rect(30, 162, 6, 3, P.K); rect(34, 165, 2, 5, P.K); px(31, 162, P.G3); rect(20, 162, 7, 3, P.K); rect(21, 165, 2, 5, P.K); px(22, 162, P.G3); rect(25, 165, 2, 2, P.K); rect(30, 165, 3, 2, P.K);
  // left arm: bare upper arm, opera glove, hand on hip
  frX_limb(14, 34, 7, 11, 58, 6, sk, { gain: 0.88, lu: 0.25, amb: 0.3 }); frX_limb(11, 56, 6, 17, 76, 5, [P.K, P.K, P.G1, P.G3], { lu: 0.2 });
  frX_shade([[15, 73], [21, 71], [22, 77], [17, 79]], [P.K, P.G1, P.G3]);
  // right arm raised, pistol up by the shoulder
  frX_limb(41, 34, 7, 49, 52, 6, sk, { gain: 0.88, lu: 0.4, amb: 0.3 }); frX_limb(49, 52, 6, 44, 32, 5, [P.K, P.K, P.K, P.G1, P.G3], { lu: 0.25 });
  frX_shade([[40, 28], [46, 28], [46, 34], [40, 34]], [P.K, P.G1, P.G3]);
  rect(42, 12, 3, 17, P.K); rect(42, 12, 1, 16, P.G3); rect(43, 12, 1, 16, P.G1); rect(41, 26, 5, 3, P.K); px(43, 11, P.G1);
  // head
  frX_grid(frX_MAXINEHEAD, frX_FACEMAP, 20, 0);
  px(20, 13, P.YE); px(20, 14, P.YE); px(35, 13, P.YE); px(35, 14, P.YE); // earrings
}
function drawMaxFigure(cx, base, sex, lit) {
  const key = sex + (lit ? 1 : 0);
  let c = frX_figCache[key];
  if (!c) {
    const rec = [];
    const src = sprite('frX_fig' + sex, 56, 172, () => sex === 'm' ? frX_drawMax() : frX_drawMaxine(rec));
    if (sex === 'f' && rec.length) frX_sequins = rec;
    c = frX_figCache[key] = lit ? src : frX_remap(src, frX_DIM);
  }
  const ox = cx - 28, oy = base - 171;
  // soft floor shadow
  dither(cx - 22, base - 1, 44, 2, lit ? (sex === 'm' ? P.BL : P.RD) : P.K, P.K, lit ? 8 : 0);
  g.drawImage(c, ox, oy);
  if (lit && sex === 'f' && frX_sequins.length) { // twinkling sequins
    const f = (performance.now() / 120) | 0;
    for (let i = 0; i < 7; i++) { const k = ((frX_hash(f, i) * frX_sequins.length / 2) | 0) * 2; const x = ox + frX_sequins[k], y = oy + frX_sequins[k + 1]; px(x, y, P.W); if (i < 2) { px(x - 1, y, P.G3); px(x + 1, y, P.G3); px(x, y - 1, P.G3); px(x, y + 1, P.G3); } }
  }
}

// ---------- TITLE backdrop: rainy Washington night, searchlights, a rooftop chase ----------
// Replaces titleBackdrop(t) from 05-hub.js. After 1.2 s the logo band (y38..162) and the
// caption box (40..280 x 168..192) cover the middle, so the action lives in the top strip.
const frX_ROOFS = [[-60, 52, 35], [58, 118, 32], [124, 190, 35], [197, 262, 33], [268, 380, 35]]; // x0, x1, roof y
function frX_roofAt(x) {
  for (let i = 0; i < frX_ROOFS.length; i++) {
    const [a, b, y] = frX_ROOFS[i];
    if (x >= a && x < b) return y;
    const n = frX_ROOFS[i + 1];
    if (n && x >= b && x < n[0]) return null;
  }
  return 35;
}
function frX_thick(x0, y0, x1, y1, w, c) {
  g.fillStyle = c; const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2));
  for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; g.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), w, w); }
}
function frX_ell(cx, cy, rx, ry, c) { g.fillStyle = c; for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + 0.5)) ** 2))); g.fillRect(cx - w, cy + y, w * 2 + 1, 1); } }
function frX_titleSky() {
  return sprite('frX_tsky', W, H, () => {
    rect(0, 0, W, H, P.BL);
    for (const [cx, cy, rw] of [[60, 8, 60], [250, 14, 70], [150, 26, 40]]) {
      for (let y = -4; y <= 4; y++) { const hw = Math.round(rw * Math.sqrt(1 - (y / 5) * (y / 5)) * (0.85 + 0.15 * Math.sin(y * 1.7 + cx))); dither(cx - hw, cy + y, hw * 2, 1, P.BL, P.BL2, y < -1 ? 1 : 3); }
    }
    // moon
    disc(106, 13, 8, P.G3); disc(105, 12, 7, P.W); px(102, 10, P.G3); px(108, 15, P.G3); rect(104, 16, 2, 1, P.G3); px(101, 14, P.G3); px(107, 9, P.G3);
    // scanlines: every other row black (the MicroProse title look)
    g.fillStyle = P.K; for (let y = 1; y < H; y += 2) g.fillRect(0, y, W, 1);
    // distant Washington: Capitol dome and the Monument, solid haze blue over the scanlines
    const hz = P.G3;
    rect(122, 31, 68, 7, P.G1); rect(124, 30, 64, 1, P.G3); for (let x = 126; x < 188; x += 3) rect(x, 32, 1, 5, P.G3);
    frX_poly([[144, 29], [156, 24], [168, 29]], P.G3); rect(145, 29, 22, 2, P.W);
    rect(146, 20, 20, 5, P.G1); for (let x = 147; x < 166; x += 2) rect(x, 20, 1, 5, x < 158 ? P.W : P.G3);
    for (let y = 0; y < 7; y++) { const w = Math.round(9 * Math.sqrt(1 - (y / 7) ** 2)); rect(156 - w, 19 - y, w, 1, P.W); rect(156, 19 - y, w, 1, P.G3); }
    rect(154, 10, 4, 3, P.G3); rect(155, 8, 2, 2, P.W);
    frX_poly([[228, 38], [229, 7], [230, 5], [231, 7], [232, 38]], hz); rect(231, 7, 1, 31, P.G1);
    g.fillStyle = P.K; for (let y = 1; y < 40; y += 2) g.fillRect(126, y, 110, 1);
  });
}
function frX_titleFront() {
  return sprite('frX_tfront', W, H, () => {
    for (const [a, b, y] of frX_ROOFS) {
      const x0 = Math.max(0, a), x1 = Math.min(W, b);
      rect(x0, y, x1 - x0, H - y, P.K);
      rect(x0, y, x1 - x0, 1, P.G1); rect(x0, y + 3, x1 - x0, 1, P.G1); // parapet & cornice
      if (a > 0) rect(x0, y, 1, H - y, P.BL); // moonlit corner
      // windows, floor by floor
      for (let wy = y + 9; wy < H - 2; wy += 10) {
        rect(x0 + 1, wy - 3, x1 - x0 - 1, 1, P.G1 === P.G1 && (wy / 10 | 0) % 3 === 0 ? P.BL : P.K);
        for (let wx = x0 + 5; wx < x1 - 6; wx += 9) {
          const h = frX_hash(wx, wy);
          if (h < 0.16) { rect(wx, wy, 4, 5, P.YE); if (h < 0.04) { rect(wx + 1, wy + 2, 2, 3, P.BR); px(wx + 1, wy + 1, P.BR); } else if (h > 0.1) for (let k = 0; k < 5; k += 2) rect(wx, wy + k, 4, 1, P.BR); }
          else if (h < 0.26) rect(wx, wy, 4, 5, P.BR);
          else if (h < 0.4) { dither(wx, wy, 4, 5, P.K, P.BL, 6); }
          else { rect(wx, wy + 5, 4, 1, P.G1); }
        }
      }
    }
    // the gaps between buildings are dark alleys
    for (let i = 0; i + 1 < frX_ROOFS.length; i++) { const a = frX_ROOFS[i][1], b = frX_ROOFS[i + 1][0]; rect(a, 40, b - a, H - 40, P.K); dither(a, 40, b - a, 10, P.K, P.BL, 3); }
    // rooftop furniture: water tank, vents, aerials, a stair house
    const rt = (x, y) => { rect(x, y - 11, 12, 8, P.K); rect(x - 1, y - 12, 14, 2, P.K); rect(x + 1, y - 4, 1, 4, P.K); rect(x + 10, y - 4, 1, 4, P.K); line(x + 1, y - 3, x + 10, y - 1, P.K); for (let k = 0; k < 3; k++) px(x + 3 + k * 3, y - 8, P.G1); };
    rt(28, 35); rect(76, 26, 14, 6, P.K); rect(78, 24, 10, 2, P.K); rect(92, 29, 3, 3, P.K); rect(100, 28, 2, 4, P.K);
    rect(142, 33, 3, 2, P.K); rect(174, 18, 1, 17, P.K); line(170, 22, 178, 22, P.K); line(171, 26, 177, 26, P.K);
    rect(212, 27, 3, 6, P.K); rect(244, 29, 4, 4, P.K); rt(292, 35); rect(20, 20, 1, 15, P.K);
    // vertical neon sign on the right-hand block (unlit tubes)
    rect(300, 56, 12, 78, P.K); frame(300, 56, 12, 78, P.G1); rect(304, 52, 1, 4, P.G1); rect(308, 52, 1, 4, P.G1);
    'HOTEL'.split('').forEach((ch, i) => textC(ch, 306, 62 + i * 14, P.RD));
  });
}
function frX_runner(type, f) {
  return sprite('frX_run' + type + '_' + f, 30, 32, () => {
    const p = f / 8 * Math.PI * 2, c = P.K, bob = Math.abs(Math.cos(p)) < 0.4 ? 0 : 1;
    const hip = [13, 15 + bob], sh = [16, 7 + bob], hd = [18, 3 + bob];
    const leg = (ph) => { const A = 0.8 * Math.sin(ph), bend = Math.cos(ph) > 0 ? 0.3 : 1.5; const k = [hip[0] + 8 * Math.sin(A), hip[1] + 8 * Math.cos(A)]; const S = A - bend; const ft = [k[0] + 8 * Math.sin(S), k[1] + 8 * Math.cos(S)]; frX_thick(hip[0], hip[1], k[0], k[1], 3, c); frX_thick(k[0], k[1], ft[0], ft[1], 2, c); frX_thick(ft[0], ft[1], ft[0] + 2.5, ft[1] + 0.5, 2, c); };
    const arm = (ph, gun) => {
      if (gun) { const e = [sh[0] + 5, sh[1] + 1], hnd = [e[0] + 5, e[1] - 1]; frX_thick(sh[0], sh[1], e[0], e[1], 2, c); frX_thick(e[0], e[1], hnd[0], hnd[1], 2, c); frX_thick(hnd[0], hnd[1] - 1, hnd[0] + 4, hnd[1] - 1, 1, c); px(hnd[0], hnd[1] + 1, c); return hnd; }
      const U = -0.9 * Math.sin(ph), e = [sh[0] + 5 * Math.sin(U), sh[1] + 5 * Math.cos(U)], F = U + 1.6, hnd = [e[0] + 4 * Math.sin(F), e[1] + 4 * Math.cos(F)];
      frX_thick(sh[0], sh[1], e[0], e[1], 2, c); frX_thick(e[0], e[1], hnd[0], hnd[1], 2, c); return hnd;
    };
    leg(p + Math.PI); arm(p, false);
    frX_thick(hip[0], hip[1], sh[0], sh[1], 5, c); // torso, leaning into the run
    if (type === 0) { frX_poly([[sh[0] - 3, sh[1] - 1], [sh[0] + 3, sh[1]], [hip[0] + 4, hip[1] + 4], [hip[0] - 5 - bob, hip[1] + 6], [hip[0] - 7, hip[1] + 3]], c); } // flapping coat
    leg(p);
    frX_thick(sh[0], sh[1] - 1, hd[0], hd[1], 2, c); frX_ell(hd[0], hd[1], 2, 3, c);
    if (type === 0) { rect(hd[0] - 4, hd[1] - 2, 8, 1, c); rect(hd[0] - 2, hd[1] - 4, 5, 2, c); }
    else { px(hd[0] - 2, hd[1] - 2, c); }
    const hnd = arm(p + Math.PI, type === 1);
    if (type === 0) rect(hnd[0] - 2, hnd[1], 5, 4, c); // briefcase
  });
}
function frX_runnerLit(type, f) { // silhouette with a 1-px light-blue glow so it reads against the scanlines
  return sprite('frX_runL' + type + '_' + f, 32, 34, () => {
    const src = frX_runner(type, f), glow = frX_remap(src, { '#000000': P.BL2 });
    for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) g.drawImage(glow, dx, dy);
    g.drawImage(src, 1, 1);
  });
}
function frX_titleBackdrop(t) {
  g.drawImage(frX_titleSky(), 0, 0);
  // lightning every ~9 s
  const lt = t % 9.3;
  if (lt > 6 && lt < 6.08 || lt > 6.16 && lt < 6.22) { g.fillStyle = P.BL2; for (let y = 0; y < 38; y += 2) g.fillRect(0, y, W, 1); line(262, 0, 258, 8, P.W); line(258, 8, 264, 14, P.W); line(264, 14, 260, 24, P.W); }
  // sweeping searchlights from behind the rooftops (scanline style: only even rows are lit)
  for (const [bx, ph, sp] of [[64, 0, 0.5], [206, 2.1, 0.37], [282, 4, 0.6]]) {
    const a = Math.sin(t * sp + ph) * 0.6, ta = Math.tan(a), by = 44;
    for (let y = by - 2; y >= 0; y -= 2) {
      const d = by - y, cx = bx + d * ta, hw = 1 + d * 0.13;
      rect(cx - hw, y, hw * 2, 1, P.BL2);
      rect(cx - hw * 0.35, y, Math.max(1, hw * 0.7), 1, d < 30 ? P.W : P.CY);
    }
  }
  g.drawImage(frX_titleFront(), 0, 0);
  // neon sign flicker, aircraft warning lights, a window switching on and off
  const on = !((t * 7 | 0) % 23 === 0 || (t * 7 | 0) % 37 === 0);
  if (on) { frame(300, 56, 12, 78, P.RD); 'HOTEL'.split('').forEach((ch, i) => textC(ch, 306, 62 + i * 14, P.RD2)); }
  const blink = (t * 1.4 | 0) % 2;
  px(174, 17, blink ? P.RD2 : P.RD); px(20, 19, blink ? P.RD : P.RD2); px(230, 5, (t * 0.9 | 0) % 2 ? P.RD2 : P.RD);
  rect(20, 170, 4, 5, (t / 3 | 0) % 2 ? P.YE : P.K); rect(292, 188, 4, 5, (t / 4.3 | 0) % 2 ? P.K : P.YE);
  // the chase across the rooftops: a courier with a briefcase, two agents after him
  const lead = (t * 46) % (W + 200) - 40;
  const run = (x, type, off) => {
    const fx = Math.round(x); if (fx < -30 || fx > W + 10) return;
    const cx = fx + 14; let base = frX_roofAt(cx), lift = 0;
    // jumping the gaps between buildings
    for (let i = 0; i + 1 < frX_ROOFS.length; i++) {
      const g0 = frX_ROOFS[i][1], g1 = frX_ROOFS[i + 1][0];
      if (cx > g0 - 10 && cx < g1 + 10) { const u = (cx - (g0 - 10)) / (g1 - g0 + 20); lift = Math.sin(u * Math.PI) * 7; const y0 = frX_ROOFS[i][2], y1 = frX_ROOFS[i + 1][2]; base = y0 + (y1 - y0) * u; }
    }
    if (base === null) base = 35;
    const fr = lift > 2 ? 2 : ((t * 12 + off) | 0) % 8;
    g.drawImage(frX_runnerLit(type, fr), fx - 1, Math.round(base - 32 - lift));
    return [fx, Math.round(base - 31 - lift)];
  };
  run(lead, 0, 0);
  const a1 = run(lead - 38, 1, 3), a2 = run(lead - 66, 2, 5);
  if (a1 && (t * 1.3) % 1 < 0.07) { const x = a1[0] + 26, y = a1[1] + 7; px(x, y, P.W); px(x + 1, y, P.YE); px(x + 2, y, P.YE); px(x + 1, y - 1, P.YE); px(x + 1, y + 1, P.YE); px(x + 3, y, P.RD2); }
  // rain
  const f = t * 60;
  for (let i = 0; i < 80; i++) {
    const sx = frX_hash(i, 7) * (W + 60), sp = 3 + frX_hash(i, 9) * 2, len = 2 + (i & 3);
    const y = ((frX_hash(i, 3) * H + f * sp) % (H + 20)) - 10, x = ((sx - (y + 10) * 0.3) % (W + 60) + W + 60) % (W + 60) - 20;
    g.fillStyle = i % 3 ? P.BL2 : P.CY; for (let k = 0; k < len; k++) g.fillRect(Math.round(x - k * 0.3), Math.round(y - k), 1, 1);
  }
}

// ---------- TRAINING cards (73 x 126 each) ----------
const frX_PROFILE = [ // head in profile, facing right
  '..KKKKKK.....',
  '.KhHHhhhKK...',
  'KhHHhhhhhhK..',
  'KhhhhhhhhhsK.',
  'KhhhhhhssssK.',
  'KhhhhhssKKsK.',
  'KhhhdrdssKssK',
  '.KhhdrdsssssK',
  '.KhhhdsssssrK',
  '.KhhhdssssKK.',
  '.KhhdssssmmK.',
  '..KhdsssssK..',
  '..KddssssKK..',
  '...KddddK....',
];
function frX_combatBg(w, h) {
  return sprite('frX_tr0', w, h, () => {
    vgrad(0, 0, w, 84, [P.K, P.RD, P.RD]); rect(0, 84, w, h - 84, P.K);
    // acoustic baffles overhead
    for (let i = 0; i < 4; i++) { rect(0, i * 7, w, 3, P.G1); rect(0, i * 7 + 3, w, 1, P.K); dither(0, i * 7, w, 1, P.G1, P.G3, 6); }
    // range floor in perspective, lanes converging on the target line
    dither(0, 84, w, h - 84, P.K, P.G1, 3); for (const [x0, x1] of [[-40, 52], [20, 60], [80, 68], [140, 76]]) line(x0, h - 1, x1, 84, P.G1);
    rect(0, 84, w, 1, P.G3);
    // target carrier wire and the paper target
    rect(0, 28, w, 1, P.G1); rect(67, 28, 1, 16, P.G3);
    rect(62, 44, 11, 34, P.W); rect(72, 44, 1, 34, P.G3); rect(62, 77, 11, 1, P.G3);
    frX_ell(67, 50, 2, 3, P.K); rect(66, 53, 3, 2, P.K); frX_poly([[63, 56], [72, 56], [72, 77], [62, 77]], P.K); px(63, 56, P.W); px(71, 56, P.W);
    for (const [r, c] of [[4, P.W], [2, P.W]]) for (let a = 0; a < 24; a++) px(67 + Math.round(Math.cos(a / 24 * 6.283) * r), 65 + Math.round(Math.sin(a / 24 * 6.283) * r * 1.3), c);
    px(67, 65, P.RD2);
    // Max, side-on, both hands on the pistol
    const sk = frX_SKIN, suit = frX_SUIT;
    frX_shade([[20, 74], [27, 74], [25, 118], [18, 118]], suit, { gain: 0.55, band: 3, lu: 0.3 }); // far leg
    rect(16, 117, 10, 3, P.K); px(24, 117, P.G1);
    frX_limb(28, 41, 5, 50, 40, 4, suit, { gain: 0.5, band: 3 }); // far arm
    frX_shade([[17, 36], [28, 35], [31, 46], [29, 74], [18, 74], [15, 50]], suit, { gain: 0.62, band: 3, lu: 0.35 });
    frX_shade([[23, 72], [30, 72], [37, 117], [30, 118]], suit, { gain: 0.62, band: 3, lu: 0.3 }); // near leg, striding
    rect(30, 116, 10, 4, P.K); rect(31, 116, 4, 1, P.G1); px(38, 118, P.G3);
    frX_shade([[22, 30], [27, 30], [27, 37], [22, 37]], sk, { gain: 0.8 }); // neck
    rect(25, 36, 4, 3, P.W); // collar
    frX_limb(25, 40, 6, 49, 38, 5, suit, { gain: 0.62, band: 3, lu: 0.2 }); // near arm
    rect(47, 36, 2, 5, P.W);
    frX_shade([[49, 36], [54, 36], [54, 41], [49, 41]], sk, { gain: 0.85 });
    rect(52, 33, 9, 3, P.K); rect(53, 33, 7, 1, P.G3); rect(52, 36, 3, 5, P.K); px(60, 32, P.G1); // pistol
    frX_grid(frX_PROFILE, frX_FACEMAP, 17, 19);
    // ear defenders
    rect(17, 18, 8, 1, P.G1); rect(18, 17, 6, 1, P.G1); rect(19, 24, 5, 6, P.K); rect(20, 25, 3, 4, P.YE); px(20, 25, P.W); rect(18, 19, 1, 6, P.G1);
  });
}
function frX_driveBg(w, h) {
  return sprite('frX_tr1', w, h, () => {
    vgrad(0, 0, w, 50, [P.K, P.K, P.BL, P.BL2]);
    for (let k = 0; k < 18; k++) { const sx = (k * 37 + 11) % w, sy = (k * 23 + 3) % 34; px(sx, sy, k % 5 ? P.G3 : P.W); }
    disc(14, 12, 5, P.YE); disc(16, 11, 4, P.K); dither(10, 8, 4, 8, P.YE, P.W, 3); // crescent moon
    // distant city on the horizon
    let s = 7; for (let x = 0; x < w;) { s = (s * 16807) % 2147483647; const bw = 3 + s % 5, bh = 3 + (s >> 5) % 9; rect(x, 50 - bh, bw, bh, P.K); for (let yy = 50 - bh + 1; yy < 49; yy += 2) for (let xx = x + 1; xx < x + bw - 1; xx += 2) if (frX_hash(xx, yy) < 0.4) px(xx, yy, P.YE); x += bw; }
    // fields either side
    rect(0, 50, w, h - 50, P.K); dither(0, 50, w, 20, P.K, P.GR, 3);
    // road
    frX_poly([[34, 50], [39, 50], [w + 30, h], [-30, h]], P.G1);
    for (let y = 50; y < h; y++) { const f = (y - 50) / (h - 50); dither(Math.round(34 - f * 64), y, Math.round(5 + f * 128), 1, P.G1, P.K, 6 - f * 5); }
    line(34, 50, -30, h, P.W); line(39, 50, w + 30, h, P.W);
  });
}
function frX_car(w) { // red sports car, from behind
  return sprite('frX_car', 44, 26, () => {
    frX_poly([[4, 8], [40, 8], [43, 20], [1, 20]], P.RD);
    frX_poly([[10, 1], [34, 1], [38, 9], [6, 9]], P.RD); frX_poly([[12, 2], [32, 2], [35, 8], [9, 8]], P.K); dither(12, 2, 20, 6, P.K, P.BL, 3);
    rect(1, 9, 42, 1, P.RD2); rect(3, 12, 38, 1, P.K); rect(3, 13, 8, 3, P.RD2); rect(33, 13, 8, 3, P.RD2); rect(4, 14, 6, 1, P.W); rect(34, 14, 6, 1, P.W);
    rect(15, 14, 14, 4, P.K); rect(17, 15, 10, 2, P.W); rect(1, 19, 42, 2, P.K); rect(0, 18, 3, 1, P.G1); rect(41, 18, 3, 1, P.G1);
    rect(2, 20, 8, 5, P.K); rect(34, 20, 8, 5, P.K); dither(14, 20, 16, 2, P.K, P.G1, 5);
    px(5, 9, P.W); px(20, 1, P.RD2);
  });
}
const frX_BOFFIN = [ // the cryptanalyst, front view: grey hair, spectacles
  '...KKKKKKKKK....',
  '..KjjjjHjjjjK...',
  '.KjjHHjjjjHjjK..',
  '.KjHssssssssjK..',
  'KjHssssssssssjK.',
  'KjlsssssssssdjK.',
  'KjlssssssssssdK.',
  'KjlssssssssssdK.',
  'KsKKKKsKsKKKKdKs',
  'sKlwKwKLKwKwKdKr',
  'sllKKKsLdKKKddr.',
  'dlsssssLdsssddK.',
  '.KlsssrdrsssddK.',
  '.KlssssssssssdK.',
  '.KlssssrrrssddK.',
  '.KlssssdddsssdK.',
  '..KlssssssssdK..',
  '..KlsssllsssdK..',
  '...KKsssssddK...',
  '....KKKdddKK....',
];
function frX_cryptoBg(w, h) {
  return sprite('frX_tr2', w, h, () => {
    rect(0, 0, w, h, P.G1); dither(0, 0, w, 88, P.G1, P.K, 4);
    // wall: pinned-up map and a clock
    rect(3, 5, 24, 17, P.W); frame(3, 5, 24, 17, P.G3); rect(6, 8, 8, 6, P.CY); rect(15, 10, 9, 8, P.CY); rect(7, 9, 5, 4, P.GR2); rect(17, 11, 5, 5, P.GR2); for (let k = 0; k < 4; k++) px(9 + k * 4, 9 + (k * 5) % 9, P.RD);
    disc(50, 12, 7, P.G3); disc(50, 12, 6, P.W); px(50, 7, P.K); px(55, 12, P.K); px(50, 17, P.K); px(45, 12, P.K); px(50, 12, P.K);
    // the analyst: shoulders, shirt, tie, rolled sleeves
    const sk = frX_SKIN, shirt = [P.G1, P.G3, P.W, P.W];
    frX_shade([[20, 46], [26, 46], [26, 54], [20, 54]], sk, { gain: 0.8 });
    frX_shade([[6, 56], [16, 51], [30, 51], [40, 56], [42, 88], [4, 88]], shirt, { lu: 0.35 });
    frX_poly([[17, 51], [23, 56], [29, 51], [27, 50], [23, 53], [19, 50]], P.W); rect(22, 55, 3, 3, P.RD); frX_poly([[22, 58], [25, 58], [26, 72], [23, 75], [21, 72]], P.RD); line(24, 59, 24, 72, P.RD2);
    line(9, 56, 11, 88, P.G1); line(37, 56, 35, 88, P.G1); // suspenders
    // arms resting forward on the desk
    frX_limb(8, 60, 7, 8, 80, 7, shirt, { lu: 0.3 }); frX_limb(38, 60, 7, 38, 80, 7, shirt, { lu: 0.3 });
    rect(4, 78, 8, 2, P.G3); rect(34, 78, 8, 2, P.G3);
    // desk
    rect(0, 88, w, 5, P.BR); rect(0, 88, w, 1, P.YE); rect(0, 93, w, h - 93, P.K); dither(0, 93, w, 4, P.BR, P.K, 10);
    for (const [dx, dw] of [[3, 30], [40, 30]]) { dither(dx, 98, dw, 26, P.BR, P.K, 7); frame(dx, 98, dw, 26, P.K); rect(dx + 1, 98, dw - 2, 1, P.BR); for (let k = 0; k < 2; k++) { rect(dx + dw / 2 - 3, 104 + k * 12, 6, 2, P.YE); px(dx + dw / 2 - 3, 105 + k * 12, P.BR); } line(dx + 1, 110, dx + dw - 2, 110, P.K); }
    // open codebook under his hands
    frX_poly([[6, 84], [23, 81], [40, 84], [42, 91], [4, 91]], P.W); line(23, 81, 23, 91, P.G1); rect(4, 91, 38, 1, P.G3);
    for (let k = 0; k < 3; k++) { rect(8, 85 + k * 2, 12, 1, P.G1); rect(26, 85 + k * 2, 12, 1, P.G1); }
    frX_shade([[6, 79], [13, 79], [14, 85], [5, 85]], sk, { gain: 0.85 }); frX_shade([[33, 79], [40, 79], [41, 85], [32, 85]], sk, { gain: 0.85 });
    frX_grid(frX_BOFFIN, Object.assign({}, frX_FACEMAP, { j: [P.G3, P.W], H: P.G3 }), 15, 28);
    // the teletype on the right of the desk
    frX_shade([[46, 62], [72, 62], [72, 88], [44, 88]], [P.G1, P.G3, P.G3, P.W], { lu: 0.3 });
    rect(46, 78, 26, 2, P.K); for (let k = 0; k < 6; k++) { rect(47 + k * 4, 81, 3, 2, P.W); rect(47 + k * 4, 84, 3, 2, P.G3); }
    rect(49, 60, 20, 3, P.K); frX_ell(59, 60, 10, 2, P.G1);
  });
}
function frX_elecBg(w, h) {
  return sprite('frX_tr3', w, h, () => {
    rect(0, 0, w, h, P.K);
    // oscilloscope
    rect(2, 2, w - 4, 48, P.G3); frame(2, 2, w - 4, 48, P.W); rect(2, 49, w - 4, 1, P.G1); rect(w - 3, 2, 1, 48, P.G1);
    rect(6, 6, 44, 38, P.K); frame(6, 6, 44, 38, P.G1);
    for (let x = 10; x < 48; x += 8) for (let y = 8; y < 43; y += 2) px(x, y, P.GR); for (let y = 10; y < 43; y += 8) for (let x = 8; x < 49; x += 2) px(x, y, P.GR);
    for (let k = 0; k < 4; k++) { disc(58, 10 + k * 10, 3, P.K); disc(58, 10 + k * 10, 2, P.G1); px(58, 9 + k * 10, P.W); }
    rect(64, 8, 4, 2, P.RD2); rect(64, 14, 4, 2, P.GR2); rect(62, 42, 7, 3, P.K); px(63, 43, P.G3);
    // circuit board
    rect(0, 54, w, h - 54, P.GR); dither(0, 54, w, h - 54, P.GR, P.K, 3);
    for (let k = 0; k < 12; k++) { const y = 58 + k * 6; line(0, y, w, y + ((k * 7) % 5) - 2, P.GR2); }
    for (let k = 0; k < 7; k++) { const x = 4 + k * 10; line(x, 54, x + 3, h, P.YE); }
    const chip = (x, y, cw, ch) => { rect(x - 1, y, cw + 2, ch, P.G3); rect(x, y, cw, ch, P.K); for (let i = 1; i < ch; i += 2) { px(x - 1, y + i, P.W); px(x + cw, y + i, P.W); } rect(x + 1, y + 1, 2, 1, P.G1); };
    chip(8, 62, 14, 10); chip(30, 60, 18, 12); chip(10, 84, 10, 8); chip(52, 80, 12, 14); chip(30, 96, 16, 8);
    for (const [x, y, c1, c2] of [[40, 80, P.BR, P.RD], [26, 80, P.RD, P.YE], [58, 104, P.BL, P.RD], [8, 104, P.YE, P.MG]]) { rect(x, y, 8, 3, P.TN); px(x + 2, y, c1); px(x + 2, y + 1, c1); px(x + 4, y, c2); px(x + 4, y + 1, c2); px(x + 6, y, P.YE); }
    disc(64, 64, 4, P.BL); disc(64, 64, 3, P.BL2); px(63, 62, P.W); // capacitor
    // soldering iron and a hand
    line(w, 90, 62, 94, P.K); line(62, 94, 66, 99, P.K); // cable
    frX_limb(w + 4, 97, 6, 56, 106, 5, [P.K, P.RD, P.RD2, P.RD2], { lu: 0.3 }); for (let k = 0; k < 4; k++) rect(60 + k * 3, 101 + k * 0.4, 1, 5, P.K);
    frX_limb(56, 107, 3, 43, 114, 2, [P.G1, P.G3, P.W]); px(43, 115, P.G3);
  });
}
function trainingArt(i, x, y, w, h, t) {
  frX_clip(x, y, w, h); g.translate(x, y);
  if (i === 0) {
    g.drawImage(frX_combatBg(w, h), 0, 0);
    const shot = t / 0.9 | 0, ph = t % 0.9;
    // bullet holes pile up on the target, then a fresh sheet
    for (let k = 0; k < shot % 7; k++) { const hx = 64 + (frX_hash(k, shot / 7 | 0) * 7 | 0), hy = 58 + (frX_hash(shot / 7 | 0, k) * 13 | 0); px(hx, hy, P.W); }
    if (ph < 0.08) { rect(61, 32, 4, 3, P.YE); rect(65, 33, 3, 1, P.YE); rect(62, 30, 1, 7, P.YE); line(64, 31, 67, 29, P.RD2); line(64, 35, 67, 37, P.RD2); rect(62, 33, 2, 1, P.W); px(68, 33, P.RD2); }
    if (ph < 0.35) { const u = ph / 0.35; px(54 + u * 6 | 0, 32 - Math.sin(u * 3.1) * 8 | 0, P.YE); } // spent case
    if (ph > 0.07 && ph < 0.6) { const u = (ph - 0.07) / 0.53; px(61 + u * 3 | 0, 31 - u * 6 | 0, P.G3); if (u < 0.5) px(62 + u * 3 | 0, 30 - u * 6 | 0, P.G1); }
  } else if (i === 1) {
    g.drawImage(frX_driveBg(w, h), 0, 0);
    // centre-line dashes rushing towards us
    for (let k = 0; k < 7; k++) {
      const z = ((k / 7 + t * 0.9) % 1), f = z * z, y = 50 + f * (h - 50);
      const hh = Math.max(1, f * 10 | 0), ww = Math.max(1, 1 + f * 3 | 0); rect(36 + (f * 2 | 0) - (ww >> 1), y, ww, hh, P.YE);
    }
    // telegraph poles whipping past on the verge
    for (let k = 0; k < 3; k++) {
      const z = ((k / 3 + t * 0.6) % 1), f = z * z, px0 = 30 - f * 70, py = 50 + f * (h - 50);
      rect(px0, py - 4 - f * 70, Math.max(1, f * 4 | 0), 4 + f * 70, P.K); rect(px0 - f * 6, py - 4 - f * 70, f * 14 | 0, Math.max(1, f * 3 | 0), P.K);
    }
    // the car we're chasing, taillights far ahead
    const ex = 36 + Math.sin(t * 1.3) * 3 | 0; rect(ex - 2, 54, 5, 2, P.K); px(ex - 2, 55, P.RD2); px(ex + 2, 55, P.RD2);
    // our car, drifting through the bends
    const sway = Math.sin(t * 1.7) * 5 | 0, bob = (t * 12 | 0) % 2;
    dither(14 + sway, 118, 46, 4, P.K, P.K, 0); rect(16 + sway, 117, 42, 3, P.K);
    g.drawImage(frX_car(), 15 + sway, 94 + bob);
    if ((t * 3 | 0) % 2) { px(18 + sway, 106 + bob, P.W); px(55 + sway, 106 + bob, P.W); } // brake lights flicker
    for (let k = 0; k < 3; k++) px(24 + sway + k * 3 + ((t * 20 | 0) % 3), 121 + (k & 1), P.G3); // exhaust
  } else if (i === 2) {
    g.drawImage(frX_cryptoBg(w, h), 0, 0);
    // paper feeding out of the teletype as it prints
    const line_ = t * 4 | 0, sub = (t * 4) % 1;
    rect(50, 32, 18, 28, P.W); rect(50, 32, 1, 28, P.G3); rect(67, 32, 1, 28, P.G3);
    frX_ell(59, 31, 9, 2, P.W); rect(50, 29, 18, 1, P.G3); dither(50, 32, 18, 2, P.W, P.G3, 6); // paper curling over the top
    for (let k = 0; k < 6; k++) {
      const yy = 56 - k * 4; if (yy < 35) break;
      const n = k === 0 ? Math.floor(sub * 8) : 8;
      for (let c = 0; c < n; c++) if (frX_hash(line_ - k, c) < 0.8) rect(52 + c * 2, yy, 1, 2, k === 0 ? P.K : P.G1);
    }
    const hx = 52 + Math.floor(sub * 8) * 2; rect(hx - 1, 58, 3, 3, P.K); px(hx, 57, P.G3); // print head
    // the analyst's pencil working down the codebook, and a blink now and then
    const pp = (t * 3 | 0) % 3; line(36, 84 + pp, 40, 79 + pp, P.YE); px(36, 85 + pp, P.K);
    if (t % 3.7 < 0.15) { rect(18, 37, 3, 1, P.SK); rect(24, 37, 3, 1, P.SK); }
    // clock second hand
    const sa = (t | 0) / 60 * 6.283; px(50 + Math.round(Math.sin(sa) * 4), 12 - Math.round(Math.cos(sa) * 4), P.RD);
  } else {
    g.drawImage(frX_elecBg(w, h), 0, 0);
    // scope trace: a sine with a glitch that the student is hunting
    let py = null;
    for (let xx = 0; xx < 42; xx++) {
      const ph = xx / 42 * Math.PI * 4 + t * 5, glitch = Math.abs(((xx + t * 18) % 42) - 20) < 2 ? 6 : 0;
      const yy = 25 + Math.round(Math.sin(ph) * 11) - glitch;
      if (py !== null) rect(7 + xx, Math.min(py, yy), 1, Math.abs(yy - py) + 1, P.GR2); else px(7 + xx, yy, P.GR2);
      py = yy;
    }
    // LED and the wisp of solder smoke
    px(66, 56, (t * 3 | 0) % 2 ? P.RD2 : P.RD); rect(65, 57, 3, 1, P.G1);
    for (let k = 0; k < 5; k++) { const u = ((t * 0.8 + k / 5) % 1); const sx = 42 + Math.sin(u * 9 + k) * 2 * u, sy = 114 - u * 26; px(sx, sy, u < 0.5 ? P.W : P.G3); if (u < 0.3) px(sx + 1, sy, P.G3); }
    if ((t * 8 | 0) % 3 === 0) px(42, 115, P.YE);
  }
  g.restore();
}

// ---------- THE CHIEF's office ----------
// sphere-lit blob: inside(x, y) decides coverage, normals from the ellipsoid (cx, cy, rx, ry)
function frX_sphere(x0, y0, x1, y1, cx, cy, rx, ry, inside, ramp, o = {}) {
  const L = o.L || [-0.55, -0.55, 0.63], amb = o.amb === undefined ? 0.2 : o.amb, n = ramp.length - 1, gain = o.gain || 1;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (!inside(x, y)) continue;
    const nx = clamp((x + 0.5 - cx) / rx, -1, 1), ny = clamp((y + 0.5 - cy) / ry, -1, 1), nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny));
    const d = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]), v = (amb + (1 - amb) * d) * gain * n;
    g.fillStyle = ramp[clamp(Math.floor(v + frX_bay(x, y) - 0.5), 0, n)]; g.fillRect(x, y, 1, 1);
  }
}
const frX_CX = 160, frX_CY = 44; // chief's face centre
function frX_chiefHead() {
  const cx = frX_CX, cy = frX_CY, skin = [P.RD, P.RD, P.SK, P.SK, P.SK, P.SK, P.W];
  // neck
  frX_shade([[cx - 9, cy + 14], [cx + 9, cy + 14], [cx + 10, cy + 26], [cx - 10, cy + 26]], skin, { lu: 0.35, amb: 0.2, gain: 0.8 });
  // ears
  for (const sgn of [-1, 1]) { frX_ell(cx + sgn * 16, cy + 3, 3, 6, sgn < 0 ? P.SK : P.RD); frX_ell(cx + sgn * 16, cy + 3, 1, 3, P.RD); px(cx + sgn * 17, cy - 1, P.SK); px(cx + sgn * 18, cy + 1, sgn < 0 ? P.W : P.SK); }
  // the skull and heavy jowls
  const inside = (x, y) => { const a = (x + 0.5 - cx) / 15, b = (y + 0.5 - (cy - 5)) / 17, c = (x + 0.5 - cx) / 14.5, d = (y + 0.5 - (cy + 6)) / 13; return a * a + b * b < 1 || (c * c + d * d < 1 && y > cy); };
  frX_sphere(cx - 17, cy - 23, cx + 17, cy + 20, cx, cy - 4, 17, 26, inside, [P.RD, P.RD, P.SK, P.SK, P.W], { amb: 0.25, gain: 0.92, L: [-0.55, -0.4, 0.73] });
  // outline
  for (let y = cy - 23; y < cy + 20; y++) for (let x = cx - 17; x < cx + 17; x++) if (inside(x, y) && (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y + 1) || !inside(x, y - 1))) px(x, y, x > cx ? P.K : P.RD);
  // grey fringe over the ears and the back of the head
  for (const sgn of [-1, 1]) for (let y = cy - 8; y < cy + 6; y++) { const w = y < cy - 4 ? 2 : 3; for (let k = 0; k < w; k++) { const x = cx + sgn * (14 - k); if (inside(x, y)) px(x, y, (x + y) % 2 ? P.G3 : (sgn < 0 ? P.W : P.G1)); } }
  // brows: bushy, grey, knitted into a frown
  for (const sgn of [-1, 1]) { for (let k = 0; k < 8; k++) { const x = cx + sgn * (3 + k), y = cy - 6 + (k < 3 ? 1 : 0) - (k > 5 ? 0 : 0); px(x, y, P.G3); px(x, y - 1, k % 2 ? P.W : P.G3); px(x, y + 1, P.RD); } }
  px(cx - 2, cy - 5, P.RD); px(cx + 2, cy - 5, P.RD); rect(cx, cy - 9, 1, 4, P.RD); // frown lines
  // eyes
  frX_chiefEyes(false);
  // nose
  rect(cx - 1, cy - 3, 1, 9, P.W); rect(cx + 1, cy - 2, 1, 9, P.RD); rect(cx + 2, cy + 3, 1, 4, P.RD);
  rect(cx - 3, cy + 6, 7, 2, P.SK); px(cx - 3, cy + 7, P.RD); px(cx + 3, cy + 7, P.K); px(cx - 2, cy + 8, P.K); px(cx + 2, cy + 8, P.K); px(cx, cy + 8, P.RD); px(cx - 1, cy + 5, P.W);
  // nasolabial folds and jowls
  line(cx - 5, cy + 6, cx - 7, cy + 13, P.RD); line(cx + 5, cy + 6, cx + 7, cy + 13, P.K); line(cx + 6, cy + 5, cx + 8, cy + 12, P.RD);
  line(cx - 11, cy + 10, cx - 9, cy + 16, P.RD); line(cx + 11, cy + 10, cx + 9, cy + 16, P.K);
  // chin
  rect(cx - 4, cy + 16, 8, 1, P.RD); px(cx - 1, cy + 14, P.W); px(cx, cy + 14, P.SK);
  frX_chiefMouth(0);
}
function frX_chiefEyes(shut) {
  const cx = frX_CX, cy = frX_CY;
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * 6 - 2;
    if (shut) { rect(ex - 1, cy - 4, 6, 3, P.SK); rect(ex - 1, cy - 2, 6, 1, P.K); px(ex + 4, cy - 3, P.RD); continue; }
    rect(ex - 1, cy - 4, 6, 1, P.K); // heavy upper lid
    rect(ex, cy - 3, 4, 1, P.W); rect(ex + 1, cy - 3, 2, 1, P.BL); px(ex + (sgn < 0 ? 2 : 1), cy - 3, P.K);
    rect(ex, cy - 2, 4, 1, P.SK); rect(ex, cy - 1, 4, 1, P.RD); // bags
  }
}
function frX_chiefMouth(open) {
  const cx = frX_CX, my = frX_CY + 11;
  rect(cx - 5, my - 1, 11, 4, P.SK);
  if (!open) { rect(cx - 4, my, 9, 1, P.K); px(cx - 5, my + 1, P.K); px(cx + 5, my + 1, P.K); rect(cx - 3, my + 1, 7, 1, P.RD); }
  else { rect(cx - 4, my, 9, 1, P.K); rect(cx - 3, my + 1, 7, open, P.K); if (open > 1) rect(cx - 2, my + 1, 5, 1, P.W); px(cx - 5, my + 1, P.K); px(cx + 5, my + 1, P.K); rect(cx - 3, my + 1 + open, 7, 1, P.RD); }
}
function frX_chiefOffice() {
  return sprite('frX_chief', W, 147, () => {
    // window: Washington under a pale sky
    vgrad(92, 0, 136, 70, [P.BL2, P.CY, P.CY, P.W]);
    for (const [cx, cy, rw] of [[110, 16, 16], [150, 10, 22], [206, 22, 18], [188, 38, 12]]) for (let y = -3; y <= 3; y++) { const hw = Math.round(rw * Math.sqrt(1 - (y / 4) ** 2)); dither(cx - hw, cy + y, hw * 2, 1, P.CY, P.W, y < 0 ? 12 : 6); }
    frX_poly([[203, 70], [205, 20], [208, 15], [211, 20], [213, 70]], P.W); frX_poly([[208, 15], [211, 20], [213, 70], [209, 70]], P.G3); // the Monument
    rect(95, 62, 30, 8, P.G3); rect(99, 58, 20, 4, P.W); for (let x = 100; x < 118; x += 2) px(x, 60, P.G3); for (let y = 0; y < 6; y++) { const w = Math.round(7 * Math.sqrt(1 - (y / 6) ** 2)); rect(109 - w, 57 - y, w, 1, P.W); rect(109, 57 - y, w, 1, P.G3); } rect(108, 48, 2, 4, P.W); // the Capitol
    rect(92, 70, 136, 30, P.GR); dither(92, 66, 136, 34, P.GR, P.GR2, 3); for (let k = 0; k < 14; k++) { const tx = 94 + k * 10, ty = 66 + (k * 7) % 5; disc(tx, ty, 4, P.GR); dither(tx - 4, ty - 4, 5, 4, P.GR, P.GR2, 5); }
    rect(92, 49, 136, 2, P.W); rect(92, 51, 136, 1, P.G3); rect(92, 0, 3, 100, P.W); rect(225, 0, 3, 100, P.G3); rect(92, 98, 136, 2, P.G3);
    // curtains, teal with deep folds, and a valance
    for (const [x0, x1] of [[0, 100], [220, W]]) {
      for (let x = x0; x < x1; x++) { const f = Math.sin((x - x0) * 0.55) * 0.5 + 0.5, lv = Math.round(f * 14); dither(x, 0, 1, 106, P.TL, P.CY, lv > 11 ? 8 : 0); if (lv < 3) rect(x, 0, 1, 106, P.K); else if (lv < 6) dither(x, 0, 1, 106, P.TL, P.K, 7); }
    }
    for (let x = 0; x < W; x++) { const sag = Math.round(Math.abs(Math.sin(x / 320 * Math.PI * 5)) * 4); rect(x, 0, 1, 7 + sag, P.TL); if ((x % 10) < 2) rect(x, 0, 1, 7 + sag, P.K); px(x, 7 + sag, P.YE); }
    // flags: the Stars and Stripes on the left, a blue standard with gold stars on the right
    rect(44, 6, 2, 118, P.YE); rect(45, 6, 1, 118, P.BR); disc(45, 5, 2, P.YE);
    for (let y = 10; y < 96; y++) { const x0 = 46, x1 = 46 + Math.round(30 - Math.abs(y - 50) * 0.12 - (y > 60 ? (y - 60) * 0.25 : 0)); for (let x = x0; x < x1; x++) { const band = ((y - 10 + Math.round(Math.sin((x - 46) * 0.4) * 1.2)) / 6 | 0) % 2; let c = band ? P.W : P.RD; if (y < 38 && x < 62) c = P.BL; const fold = Math.sin((x - 46) * 0.4); if (fold < -0.5) c = c === P.W ? P.G3 : c === P.RD ? P.RD : P.K; px(x, y, c); } }
    for (let k = 0; k < 12; k++) px(48 + (k % 4) * 4 - (k / 4 & 1) * 0, 13 + (k / 4 | 0) * 8, P.W);
    for (let y = 10; y < 96; y += 2) px(46 + Math.round(30 - Math.abs(y - 50) * 0.12 - (y > 60 ? (y - 60) * 0.25 : 0)), y, P.YE);
    rect(276, 6, 2, 118, P.YE); rect(277, 6, 1, 118, P.BR); disc(277, 5, 2, P.YE);
    for (let y = 10; y < 96; y++) { const x1 = 276, x0 = 276 - Math.round(30 - Math.abs(y - 50) * 0.12 - (y > 60 ? (y - 60) * 0.25 : 0)); for (let x = x0; x < x1; x++) { const fold = Math.sin((276 - x) * 0.4); px(x, y, fold < -0.5 ? P.K : fold > 0.6 ? P.BL2 : P.BL); } px(x0, y, (y & 1) ? P.YE : P.BR); }
    for (let k = 0; k < 10; k++) { const a = k / 10 * 6.283, sx = 260 + Math.round(Math.cos(a) * 8), sy = 44 + Math.round(Math.sin(a) * 10); px(sx, sy, P.YE); px(sx - 1, sy, P.YE); px(sx, sy - 1, P.YE); }
    disc(260, 44, 3, P.YE); px(260, 44, P.BR);
    // high-backed leather chair, buttoned
    frX_sphere(124, 14, 197, 108, 160, 60, 38, 60, (x, y) => { const a = (x + 0.5 - 160) / 36, b = (y + 0.5 - 40) / 26; return (y >= 40 && x >= 124 && x < 196) || a * a + b * b < 1; }, [P.K, P.K, P.K, P.K, P.K, P.G1], { amb: 0.05 });
    for (let y = 22; y < 100; y += 10) for (let x = 132 + ((y / 10 | 0) % 2) * 6; x < 190; x += 12) { px(x, y, P.K); px(x - 1, y - 1, P.G1); }
    // the Chief: dark grey suit, white shirt, red tie
    const suit = [P.K, P.K, P.G1, P.G1, P.G1, P.G3];
    frX_shade([[120, 74], [140, 66], [180, 66], [200, 74], [206, 108], [114, 108]], suit, { lu: 0.3, amb: 0.2 });
    line(140, 66, 128, 108, P.K); line(180, 66, 192, 108, P.K); // arm seams
    frX_poly([[148, 66], [172, 66], [165, 100], [155, 100]], P.W); dither(162, 66, 10, 34, P.W, P.G3, 6);
    frX_poly([[148, 66], [160, 84], [157, 104], [146, 72]], P.G1); frX_poly([[172, 66], [160, 84], [163, 104], [174, 72]], P.K); // lapels
    frX_poly([[157, 70], [163, 70], [162, 74], [158, 74]], P.RD); frX_poly([[158, 74], [162, 74], [165, 96], [160, 100], [155, 96]], P.RD); line(159, 76, 158, 94, P.RD2);
    rect(123, 82, 10, 2, P.G3); frX_poly([[124, 82], [126, 79], [128, 81], [130, 78], [132, 82]], P.W); // pocket square
    frX_chiefHead();
    // collar points over the neck
    frX_poly([[150, 64], [159, 69], [152, 72]], P.W); frX_poly([[170, 64], [161, 69], [168, 72]], P.G3);
    // desk
    rect(0, 106, W, 41, P.BR); for (let y = 108; y < 146; y += 3) { const o = (y * 37) % 23; for (let x = -o; x < W; x += 23) { rect(x, y, 14, 1, P.RD); } } dither(0, 106, W, 41, P.BR, P.K, 0);
    dither(0, 130, W, 17, P.BR, P.K, 4); rect(0, 106, W, 2, P.YE); rect(0, 108, W, 1, P.RD);
    // his hands folded on the blotter
    frX_poly([[116, 107], [204, 107], [208, 122], [112, 122]], P.K); frX_poly([[118, 108], [202, 108], [205, 121], [115, 121]], P.GR); dither(118, 108, 88, 13, P.GR, P.K, 5); frX_poly([[115, 116], [124, 108], [118, 108], [115, 121]], P.BR); frX_poly([[205, 116], [196, 108], [202, 108], [205, 121]], P.BR);
    frX_shade([[128, 96], [146, 96], [150, 108], [130, 110]], suit, { lu: 0.3 }); frX_shade([[174, 96], [192, 96], [190, 110], [170, 108]], suit, { lu: 0.3 });
    rect(145, 101, 4, 6, P.W); rect(171, 101, 4, 6, P.W);
    const hs = [P.RD, P.RD, P.SK, P.SK, P.SK, P.W];
    frX_sphere(146, 99, 162, 112, 153, 104, 9, 7, (x, y) => ((x + 0.5 - 154) / 8) ** 2 + ((y + 0.5 - 105) / 6) ** 2 < 1, hs, { amb: 0.35 }); // left hand
    frX_sphere(158, 99, 175, 112, 166, 104, 9, 7, (x, y) => ((x + 0.5 - 166) / 8) ** 2 + ((y + 0.5 - 105) / 6) ** 2 < 1, hs, { amb: 0.3 }); // right hand over it
    for (let k = 0; k < 4; k++) { line(160 + k * 3, 101, 159 + k * 3, 109, P.RD); } line(149, 101, 158, 101, P.RD); rect(158, 102, 2, 6, P.SK); px(158, 102, P.W); rect(157, 108, 4, 1, P.RD); // interlaced fingers, thumbs
    px(165, 103, P.YE); px(165, 104, P.YE); // wedding ring
    // framed photograph
    rect(24, 108, 34, 26, P.K); frame(24, 108, 34, 26, P.YE); frame(25, 109, 32, 24, P.BR); rect(28, 112, 26, 18, P.CY); rect(28, 124, 26, 6, P.GR);
    disc(36, 118, 3, P.SK); rect(33, 121, 6, 5, P.BL); disc(45, 119, 3, P.SK); rect(42, 122, 6, 4, P.RD); rect(35, 115, 3, 1, P.BR); rect(43, 116, 5, 1, P.YE);
    line(30, 134, 22, 142, P.K);
    // the red hotline telephone
    frX_shade([[64, 120], [92, 120], [95, 134], [61, 134]], [P.K, P.RD, P.RD, P.RD2], { lu: 0.3 });
    frX_shade([[62, 112], [94, 112], [96, 118], [60, 118]], [P.K, P.RD, P.RD2, P.W], { lu: 0.3 }); rect(58, 114, 6, 5, P.RD); rect(92, 114, 6, 5, P.RD);
    disc(78, 127, 5, P.W); disc(78, 127, 2, P.RD); for (let k = 0; k < 8; k++) px(78 + Math.round(Math.cos(k * 0.8) * 4), 127 + Math.round(Math.sin(k * 0.8) * 4), P.K);
    line(95, 128, 104, 140, P.K); line(104, 140, 112, 138, P.K);
    // glass ashtray and cigar
    frX_ell(112, 128, 9, 3, P.G3); frX_ell(112, 127, 7, 2, P.G1); px(106, 126, P.W); px(107, 126, P.W);
    rect(112, 124, 12, 2, P.BR); rect(112, 124, 12, 1, P.YE); rect(110, 125, 3, 1, P.YE); px(122, 124, P.RD); rect(114, 124, 2, 2, P.RD);
    // pen stand and in-tray of papers
    rect(190, 118, 16, 5, P.K); rect(191, 118, 14, 1, P.G1); line(194, 118, 186, 104, P.YE); line(202, 118, 208, 104, P.YE); px(186, 104, P.W); px(208, 104, P.W);
    frX_poly([[208, 112], [240, 110], [244, 124], [206, 126]], P.W); frX_poly([[208, 115], [238, 113], [242, 126], [206, 128]], P.G3); frX_poly([[210, 111], [236, 109], [239, 120], [208, 122]], P.W);
    for (let k = 0; k < 4; k++) line(214, 113 + k * 2, 230, 111 + k * 2, P.G1); rect(224, 116, 10, 3, P.RD); rect(225, 117, 8, 1, P.W);
    // desk clock
    rect(248, 104, 22, 22, P.BR); rect(249, 105, 20, 20, P.YE); frame(248, 104, 22, 22, P.K); disc(259, 114, 7, P.W); frame(247, 125, 24, 2, P.K); rect(247, 125, 24, 1, P.BR);
    for (let k = 0; k < 12; k++) px(259 + Math.round(Math.cos(k / 12 * 6.283) * 6), 114 + Math.round(Math.sin(k / 12 * 6.283) * 6), P.K);
    // brass lamp with a green shade
    rect(290, 120, 18, 4, P.YE); rect(290, 123, 18, 1, P.BR); rect(298, 84, 2, 36, P.YE); rect(299, 84, 1, 36, P.BR);
    frX_shade([[282, 80], [316, 80], [319, 90], [279, 90]], [P.K, P.GR, P.GR, P.GR2, P.W], { lu: 0.3 }); rect(280, 90, 38, 1, P.YE); dither(282, 91, 34, 6, P.K, P.YE, 3);
  });
}
function chiefArt(t) {
  g.drawImage(frX_chiefOffice(), 0, 0);
  // blink every few seconds; talk while the briefing is on screen
  if (t % 4.3 > 4.15) frX_chiefEyes(true);
  const m = (t * 7 | 0) % 6; frX_chiefMouth([0, 1, 2, 1, 0, 2][m]);
  // cigar smoke curling up
  for (let k = 0; k < 30; k++) {
    const u = (t * 0.3 + k / 30) % 1, sx = Math.round(124 + Math.sin(u * 7 - t * 1.1) * (1 + u * 7) + u * 4), sy = Math.round(123 - u * 64);
    if (u < 0.35) px(sx, sy, P.W);
    else if (u < 0.75) { px(sx, sy, P.G3); px(sx + 1, sy, k % 2 ? P.W : P.G3); }
    else if (k % 2) { px(sx, sy, P.G3); px(sx + 2, sy - 1, P.G3); }
  }
  px(123, 124, (t * 2 | 0) % 2 ? P.RD2 : P.YE);
  // clock hands
  const sec = (t + 17) % 60, a = sec / 60 * 6.283;
  line(259, 114, 259 + Math.round(Math.sin(1.9) * 4), 114 - Math.round(Math.cos(1.9) * 4), P.K); line(259, 114, 259, 109, P.K);
  line(259, 114, 259 + Math.round(Math.sin(a) * 6), 114 - Math.round(Math.cos(a) * 6), P.RD);
  // nameplate & text box, exactly where the briefing text expects them
  rect(241, 130, 61, 12, P.YE); rect(241, 130, 61, 1, P.W); rect(241, 141, 61, 1, P.G1); rect(301, 130, 1, 12, P.G1);
  disc(250, 136, 4, P.G1); disc(250, 136, 3, P.TL); px(249, 135, P.W); text('CHIEF', 268, 133, P.G1); text('CHIEF', 267, 132, P.K);
  rect(0, 147, W, 53, P.K); rect(0, 147, W, 1, P.W); rect(0, 199, W, 1, P.W); rect(0, 147, 1, 53, P.W); rect(319, 147, 1, 53, P.W);
}
// same name as the old backdrop in 05-hub.js: once that one is deleted, titleScene picks this up unchanged
function titleBackdrop(t) { frX_titleBackdrop(t); }
