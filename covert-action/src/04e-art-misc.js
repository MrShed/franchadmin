// ===================================================================
// ART 04e: interrogation room, Max's capture cell, vacation snapshots
// (helpers prefixed msX_; later declarations override 04-art.js)
// ===================================================================

// ---------- shading helpers (used inside cached sprites) ----------
const msX_L = [-0.45, -0.6, 0.66]; // default light: from the upper left, towards the viewer
// pick a colour from a dark->light ramp for a continuous value 0..1, Bayer-dithered between steps
function msX_c(x, y, v, r) {
  const n = r.length - 1; if (n < 1) return r[0];
  const f = (v < 0 ? 0 : v > 0.9999 ? 0.9999 : v) * n, i = f | 0;
  return BAYER[(y & 3) * 4 + (x & 3)] < Math.round((f - i) * 16) ? r[i + 1] : r[i];
}
// shaded ellipsoid (heads, bulbs, drums...)
function msX_ell(cx, cy, rx, ry, r, o = {}) {
  const L = o.L || msX_L, amb = o.amb ?? 0.12, dif = o.dif ?? 0.88, test = o.test;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny; if (d > 1) continue;
    if (test && !test(x, y)) continue;
    const nz = Math.sqrt(1 - d); px(x, y, msX_c(x, y, amb + dif * Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]), r));
  }
}
// scanline polygon spans
function msX_spans(pts, cb) {
  let y0 = 1e9, y1 = -1e9; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    const sy = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) xs.push(a[0] + (sy - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]); if (xb > xa) cb(y, xa, xb); }
  }
}
function msX_fill(pts, c) { msX_spans(pts, (y, a, b) => rect(a, y, b - a, 1, c)); }
function msX_dit(pts, c, lvl) { msX_spans(pts, (y, a, b) => { for (let x = a; x < b; x++) if (BAYER[(y & 3) * 4 + (x & 3)] < lvl) px(x, y, c); }); }
// polygon shaded like a vertical cylinder (torsos, trunks, cabinets)
function msX_cyl(pts, r, o = {}) {
  const lx = o.lx ?? -0.6, lz = Math.sqrt(1 - lx * lx), amb = o.amb ?? 0.15, dif = o.dif ?? 0.85, vy = o.vy || 0;
  let y0 = 1e9, y1 = -1e9; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  msX_spans(pts, (y, a, b) => { const fy = (y - y0) / Math.max(1, y1 - y0); for (let x = a; x < b; x++) { const u = (x + 0.5 - a) / (b - a) * 2 - 1; px(x, y, msX_c(x, y, amb + dif * Math.max(0, u * lx + Math.sqrt(Math.max(0, 1 - u * u)) * lz) - vy * fy, r)); } });
}
// a tapered, round-capped limb from (x0,y0) to (x1,y1), shaded across its axis
function msX_limb(x0, y0, x1, y1, w0, w1, r, o = {}) {
  const L = o.L || msX_L, amb = o.amb ?? 0.15, dif = o.dif ?? 0.85;
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, m = Math.max(w0, w1) / 2 + 1;
  for (let y = Math.floor(Math.min(y0, y1) - m); y <= Math.ceil(Math.max(y0, y1) + m); y++) for (let x = Math.floor(Math.min(x0, x1) - m); x <= Math.ceil(Math.max(x0, x1) + m); x++) {
    const qx = x + 0.5 - x0, qy = y + 0.5 - y0; let s = (qx * dx + qy * dy) / (len * len); s = s < 0 ? 0 : s > 1 ? 1 : s;
    const hw = (w0 + (w1 - w0) * s) / 2, ex = qx - dx * s, ey = qy - dy * s, d = ex * nx + ey * ny;
    if (ex * ex + ey * ey > hw * hw) continue;
    const u = d / hw, nz = Math.sqrt(Math.max(0, 1 - u * u));
    if (o.edge && Math.sqrt(ex * ex + ey * ey) > hw - 1) { px(x, y, o.edge); continue; }
    px(x, y, msX_c(x, y, amb + dif * Math.max(0, nx * u * L[0] + ny * u * L[1] + nz * L[2]), r));
  }
}
// 1-px outline around everything already drawn on the current (sprite) canvas
function msX_outline(w, h, c = P.K) {
  const id = g.getImageData(0, 0, w, h).data, on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && id[(y * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) px(x, y, c);
}
function msX_hairR(c) { return c === P.BR ? [P.K, P.K, P.K, P.BR] : c === P.K ? [P.K, P.K, P.G1] : msX_rampOf(c); }
// string sprite painter
function msX_str(rows, map, x, y) { rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = map[row[i]]; if (c) px(x + i, y + j, c); } }); }
// ramps
const msX_GRAY = [P.K, P.G1, P.G3, P.W], msX_STEEL = [P.K, P.G1, P.G3], msX_WOOD = [P.K, P.RD, P.BR, P.YE], msX_SKIN = [P.K, P.RD, P.BR, P.RD2],
  msX_GOLD = [P.BR, P.YE, P.W], msX_GRN = [P.K, P.GR, P.GR2], msX_RED = [P.K, P.RD, P.RD2], msX_BLUE = [P.K, P.BL, P.BL2, P.CY];
function msX_rampOf(c) {
  switch (c) {
    case P.K: return [P.K, P.K, P.G1]; case P.G1: return [P.K, P.G1, P.G3]; case P.G3: return [P.G1, P.G3, P.W]; case P.W: return [P.G3, P.W, P.W];
    case P.BL: return [P.K, P.BL, P.BL2]; case P.BL2: return [P.BL, P.BL2, P.CY]; case P.GR: return [P.K, P.GR, P.GR2]; case P.GR2: return [P.GR, P.GR2, P.YE];
    case P.TL: return [P.K, P.TL, P.CY]; case P.CY: return [P.TL, P.CY, P.W]; case P.RD: return [P.K, P.RD, P.RD2]; case P.RD2: return [P.RD, P.RD2, P.PK];
    case P.MG: return [P.K, P.MG, P.PK]; case P.PK: return [P.MG, P.PK, P.W]; case P.BR: return [P.K, P.BR, P.YE]; case P.YE: return [P.BR, P.YE, P.W];
  }
  return [P.K, c, P.W];
}
const msX_hash = (a, b) => { let n = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const msX_sex = () => (typeof game !== 'undefined' && game.agent && game.agent.sex) || 'm';
function msX_clip(x, y, w, h) { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); }

// a small shaded head with features; cx,cy = centre, r = half-width
function msX_head(cx, cy, r, o = {}) {
  const ry = Math.round(r * 1.22), skin = o.skin || P.SK, sk = skin === P.BR ? [P.K, P.RD, P.BR, P.BR] : [P.K, P.BR, P.RD2, P.RD2], hr = msX_hairR(o.hair || P.BR);
  const L = o.L || msX_L;
  if (o.style === 'long') msX_ell(cx, cy + r * 0.7, r + 2.5, ry + r * 0.8, hr, { L, amb: 0.2, dif: 0.7, test: (x, y) => y < cy + ry * 0.6 || Math.abs(x + 0.5 - cx) > r * 0.6 });
  if (o.style === 'up') msX_ell(cx + 1, cy - ry - 1, r * 0.75, r * 0.6, hr, { L, amb: 0.3 });
  msX_ell(cx - r, cy + 1, 1.6, 2.4, sk, { L, amb: 0.5 }); msX_ell(cx + r, cy + 1, 1.6, 2.4, sk, { L, amb: 0.45 });
  msX_ell(cx, cy, r, ry, sk, { L, amb: 0.64, dif: 0.4 });
  if (o.style !== 'bald') msX_ell(cx, cy - 1, r + 1, ry + 1, hr, { L, amb: 0.25, dif: 0.75, test: (x, y) => { const ax = Math.abs(x + 0.5 - cx) / r; return y < cy - ry * 0.3 - (ax < 0.5 && o.part ? 0 : 0) || (ax > 0.78 && y < cy + (o.style === 'long' || o.style === 'up' ? ry * 0.7 : 1)); } });
  const ey = Math.round(cy + ry * 0.08), ex = Math.max(2, Math.round(r * 0.42));
  const lx = Math.round(cx) - ex - 1, rx_ = Math.round(cx) + ex - 1;
  if (o.eyes === 'shades') { rect(lx - 1, ey - 1, 4, 3, P.K); rect(rx_ - 1, ey - 1, 4, 3, P.K); rect(lx + 2, ey - 1, rx_ - lx - 2, 1, P.K); px(lx, ey - 1, P.G1); px(rx_, ey - 1, P.G1); }
  else if (o.eyes === 'closed' || o.eyes === 'half') { rect(lx, ey, 2, 1, P.RD); rect(rx_, ey, 2, 1, P.RD); if (o.eyes === 'half') { px(lx + 1, ey + 1, P.K); px(rx_ + 1, ey + 1, P.K); } }
  else { px(lx, ey, P.W); px(lx + 1, ey, P.K); px(rx_, ey, P.W); px(rx_ + 1, ey, P.K); if (o.sex === 'f') { px(lx - 1, ey - 1, P.K); px(rx_ + 2, ey - 1, P.K); } }
  if (o.eyes !== 'shades') { const bc = hr[0] === P.K ? P.K : hr[1] === P.YE ? P.BR : P.K; rect(lx - (o.sex === 'f' ? 0 : 1), ey - 2, 3, 1, bc); rect(rx_, ey - 2, 3, 1, bc); }
  px(Math.round(cx), ey + 2, P.RD); px(Math.round(cx), ey + 3, P.RD);
  const my = ey + Math.max(4, Math.round(ry * 0.5));
  if (o.mouth === 'smile') { rect(Math.round(cx) - 2, my, 4, 1, o.sex === 'f' ? P.RD : P.K); px(Math.round(cx) - 3, my - 1, P.RD); px(Math.round(cx) + 2, my - 1, P.RD); }
  else if (o.mouth === 'o') { rect(Math.round(cx) - 1, my - 1, 2, 2, P.K); }
  else rect(Math.round(cx) - 2, my, 4, 1, o.sex === 'f' ? P.RD : P.RD);
  if (o.sex === 'f') { px(lx - 1, ey + 2, P.PK); px(rx_ + 2, ey + 2, P.PK); }
}

// ===================================================================
// INTERROGATION: suspect under the lamp, one-way mirror, a detective's shoulder
// ===================================================================
function msX_irL(s) { const a = s * 0.075; return { lx: 75 + Math.round(Math.sin(a) * 34), ly: 31, tn: Math.tan(a) }; }
function msX_irI(x, y, L) {
  const oy = L.ly + 12, dy = y - oy; let i = 0;
  if (dy > 0) { const cx = L.lx + dy * L.tn, hw = 9 + dy * 0.47, u = (x + 0.5 - cx) / hw; if (u > -1 && u < 1) i = (1 - u * u) * Math.max(0.3, 1 - dy / 220); }
  const d = Math.hypot(x - L.lx, (y - oy + 3) * 1.3); i = Math.max(i, 0.55 - d / 30);
  return i < 0 ? 0 : i > 1 ? 1 : i;
}
function msX_irBg(s) {
  return sprite('msXirbg' + s, 150, 200, () => {
    const L = msX_irL(s);
    // cinder-block wall
    for (let y = 0; y < 116; y++) {
      const off = ((y / 10) | 0) & 1 ? 10 : 0;
      for (let x = 0; x < 150; x++) {
        const I = msX_irI(x, y, L), mort = y % 10 === 9 || (x + off) % 20 === 19;
        let v = 0.1 + I * 0.66 + (vnoise(x * 0.45, y * 0.45) - 0.5) * 0.14 - (mort ? 0.16 : 0) + (y % 10 === 0 && !mort ? 0.06 : 0) - Math.abs(x - 75) / 75 * 0.06;
        px(x, y, msX_c(x, y, v, msX_GRAY));
      }
    }
    // floor tiles in perspective
    for (let y = 116; y < 200; y++) for (let x = 0; x < 150; x++) {
      const d = y - 92, X = (x - 75) / d * 1.7, Z = 110 / d, tile = (Math.floor(X) + Math.floor(Z)) & 1;
      const gx = X - Math.floor(X) < 0.05 || Z - Math.floor(Z) < 0.06;
      px(x, y, msX_c(x, y, (tile ? 0.2 : 0.12) + msX_irI(x, y - 20, L) * 0.25 - (gx ? 0.1 : 0), msX_GRAY));
    }
    rect(0, 114, 150, 1, P.G1); rect(0, 115, 150, 2, P.K);
    // one-way mirror
    const mx = 5, my = 28, mw = 42, mh = 64;
    rect(mx - 2, my - 2, mw + 4, mh + 4, P.K); frame(mx - 1, my - 1, mw + 2, mh + 2, P.G3); rect(mx - 1, my + mh, mw + 2, 1, P.G1); rect(mx + mw, my - 1, 1, mh + 2, P.G1);
    for (let y = my; y < my + mh; y++) for (let x = mx; x < mx + mw; x++) {
      const st = (x - y * 0.7 + 400) % 44;
      const ghost = (Math.hypot(x - 18, (y - 52) * 0.9) < 7 || (y > 60 && Math.abs(x - 18) < 13 - (y < 64 ? 4 : 0)) || Math.hypot(x - 36, (y - 56) * 0.9) < 6 || (y > 63 && Math.abs(x - 36) < 11));
      const v = 0.14 + (st < 4 ? 0.36 : st < 7 ? 0.17 : 0) + msX_irI(x, y, L) * 0.3 + (y - my) / mh * 0.06 - (ghost ? 0.07 : 0);
      px(x, y, msX_c(x, y, v, [P.K, P.BL, P.BL2, P.CY]));
    }
    rect(mx - 2, my + mh + 2, mw + 4, 2, P.G3); rect(mx - 2, my + mh + 4, mw + 4, 1, P.K); // sill
    // steel door with wired glass
    rect(108, 24, 40, 92, P.K); frame(109, 25, 38, 91, P.G1); rect(110, 26, 1, 90, P.G3);
    for (let y = 27; y < 115; y++) for (let x = 112; x < 146; x++) px(x, y, msX_c(x, y, 0.16 + msX_irI(x, y, L) * 0.6 - (x === 145 ? 0.1 : 0) + (x === 112 ? 0.1 : 0), [P.K, P.TL, P.CY]));
    rect(118, 34, 22, 22, P.K);
    for (let y = 35; y < 55; y++) for (let x = 119; x < 139; x++) px(x, y, ((x + y) % 5 === 0 || (x - y + 40) % 5 === 0) ? P.G1 : msX_c(x, y, 0.3 + (x - 119) / 60, [P.K, P.BL, P.BL2]));
    frame(117, 33, 24, 24, P.G1); rect(113, 62, 30, 1, P.K); rect(113, 63, 30, 1, P.CY);
    msX_ell(115, 78, 2.5, 2.5, msX_GOLD, { amb: 0.2 }); rect(113, 82, 5, 2, P.G1);
    // clock
    disc(128, 13, 7, P.K); msX_ell(128, 13.5, 6, 6, [P.G3, P.W, P.W], { amb: 0.5 });
    for (const [dx, dy] of [[0, -5], [5, 0], [0, 5], [-5, 0]]) px(128 + dx, 13 + dy, P.K);
    // chair back behind the suspect
    const CW = [P.K, P.RD, P.BR]; msX_limb(47, 90, 47, 128, 5, 5, CW, { amb: 0.1, dif: 0.8 }); msX_limb(103, 90, 103, 128, 5, 5, CW, { amb: 0.1, dif: 0.8 });
    msX_limb(45, 88, 105, 88, 6, 6, CW, { amb: 0.15, dif: 0.8, L: [0, -0.8, 0.6] });
  });
}
function msX_irTab(s) {
  return sprite('msXirtab' + s, 150, 200, () => {
    const L = msX_irL(s), cx = L.lx + (133 - L.ly - 12) * L.tn;
    // floor shadow + legs
    msX_dit([[8, 186], [142, 186], [146, 196], [4, 196]], P.K, 10);
    msX_cyl([[29, 141], [33, 141], [33, 178], [29, 178]], msX_STEEL, { amb: 0.05, dif: 0.5 }); msX_cyl([[117, 141], [121, 141], [121, 178], [117, 178]], msX_STEEL, { amb: 0.05, dif: 0.5 });
    msX_cyl([[14, 148], [19, 148], [19, 194], [14, 194]], msX_STEEL, { amb: 0.1 }); msX_cyl([[131, 148], [136, 148], [136, 194], [131, 194]], msX_STEEL, { amb: 0.1 });
    rect(13, 194, 7, 1, P.K); rect(130, 194, 7, 1, P.K);
    // top & apron
    msX_spans([[24, 125], [126, 125], [138, 140], [12, 140]], (y, a, b) => { for (let x = a; x < b; x++) { const e = ((x - cx) / 36) ** 2 + ((y - 133) / 9) ** 2; px(x, y, msX_c(x, y, 0.2 + Math.max(0, 1 - e) * 0.72 + (y === 125 ? 0.1 : 0), msX_GRAY)); } });
    rect(12, 140, 126, 1, P.G3); for (let y = 141; y < 149; y++) for (let x = 13; x < 137; x++) px(x, y, msX_c(x, y, 0.3 - (y - 141) * 0.03 + Math.max(0, 1 - Math.abs(x - cx) / 50) * 0.25, msX_GRAY));
    rect(13, 149, 124, 1, P.K);
    // manila folder with a photo
    msX_fill([[31, 127], [55, 127], [58, 137], [28, 137]], P.BR); msX_fill([[31, 126], [54, 126], [56, 135], [29, 135]], P.YE);
    msX_dit([[31, 126], [54, 126], [56, 135], [29, 135]], P.W, 3); rect(36, 128, 8, 5, P.K); rect(37, 129, 6, 3, P.G1); px(40, 129, P.G3);
    for (let k = 0; k < 3; k++) rect(46, 128 + k * 2, 7, 1, P.G1);
    // ash tray & cigarette
    msX_ell(21, 134, 7, 3, msX_GRAY, { amb: 0.3, L: [-0.3, -0.9, 0.3] }); msX_ell(21, 134, 4.5, 1.6, [P.K, P.G1], { amb: 0 });
    rect(22, 132, 6, 1, P.W); px(28, 132, P.BR); px(21, 132, P.G3); px(19, 135, P.G3); px(23, 135, P.G1);
    // tape recorder
    msX_cyl([[102, 127], [116, 127], [118, 136], [100, 136]], msX_STEEL, { lx: -0.4, amb: 0.1 }); disc(105, 130, 2, P.K); disc(112, 130, 2, P.K); px(105, 130, P.G3); px(112, 130, P.G3); px(115, 134, P.RD2);
  });
}
// the suspect's own mugshot with its background removed
function msX_cutFace(f) {
  return sprite('msXcut' + JSON.stringify(f), 52, 64, () => {
    g.imageSmoothingEnabled = false; const d = dither;
    dither = function () {}; try { drawFace(Object.assign({}, f, { msXcut: 1 }), 0, 0, 52, 64); } finally { dither = d; }
  });
}
function msX_irSuspect(f, front) {
  return sprite('msXsus' + (front ? 'A' : 'T') + JSON.stringify(f), 150, 200, () => {
    const jr = msX_rampOf(f.jacket);
    if (!front) {
      msX_cyl([[53, 110], [97, 110], [102, 134], [48, 134]], jr, { lx: -0.5, amb: 0.2, dif: 0.45 });
      rect(69, 110, 12, 24, f.sex === 'f' ? f.skin : P.W); if (f.sex === 'f') { rect(69, 118, 12, 16, P.W); msX_dit([[69, 118], [81, 118], [81, 134], [69, 134]], P.G3, 5); }
      else { rect(73, 110, 4, 20, f.tie); rect(74, 110, 2, 20, f.tie); msX_dit([[73, 110], [77, 110], [77, 130], [73, 130]], P.K, 3); rect(73, 128, 4, 1, P.K); }
      rect(68, 110, 1, 24, P.K); rect(81, 110, 1, 24, P.K);
      return;
    }
    const sk = f.skin === P.BR ? [P.K, P.RD, P.BR, P.BR] : msX_SKIN;
    // upper arms from the shoulders, elbows on the table, cuffed hands together
    msX_limb(56, 107, 48, 129, 9, 8, jr, { amb: 0.2, dif: 0.5 }); msX_limb(94, 107, 102, 129, 9, 8, jr, { amb: 0.12, dif: 0.5 });
    msX_limb(48, 130, 66, 134, 8, 7, jr, { amb: 0.2, dif: 0.5, L: [-0.3, -0.8, 0.5] }); msX_limb(102, 130, 84, 134, 8, 7, jr, { amb: 0.15, dif: 0.5, L: [-0.3, -0.8, 0.5] });
    rect(65, 131, 2, 6, P.W); rect(84, 131, 2, 6, P.W);
    msX_ell(71, 134, 4.5, 3.5, sk, { amb: 0.4, dif: 0.6 }); msX_ell(79, 134, 4.5, 3.5, sk, { amb: 0.35, dif: 0.6 });
    rect(74, 133, 1, 3, P.RD); rect(71, 136, 3, 1, P.RD); rect(77, 136, 3, 1, P.RD);
    // handcuffs
    for (const cx of [68, 82]) { frame(cx - 1, 131, 3, 6, P.G3); px(cx, 131, P.W); px(cx + 1, 136, P.G1); }
    for (let x = 70; x < 81; x++) px(x, 138 + (x & 1), x & 1 ? P.G1 : P.W);
  });
}
function msX_irFg() {
  return sprite('msXirfg', 150, 200, () => {
    // the interrogator, seen from behind: trench coat and fedora, a black shape rim-lit by the lamp
    const K1 = [P.K];
    msX_fill([[84, 200], [88, 176], [98, 165], [116, 158], [146, 156], [150, 158], [150, 200]], P.K);
    msX_limb(96, 174, 88, 200, 18, 20, K1);
    msX_ell(131, 142, 14, 17, K1, { test: (x, y) => y < 158 });
    msX_ell(131, 130, 25, 5, K1); msX_ell(131, 121, 14, 10, K1, { test: (x, y) => y < 130 && !(y < 114 && Math.abs(x + 0.5 - 131) < 3) });
    const id = g.getImageData(0, 0, 150, 200).data, on = (x, y) => x >= 0 && y >= 0 && x < 150 && y < 200 && id[(y * 150 + x) * 4 + 3] > 0;
    for (let y = 100; y < 200; y++) for (let x = 80; x < 150; x++) {
      if (!on(x, y)) continue;
      const up = !on(x, y - 1), lf = !on(x - 1, y), ul = !on(x - 1, y - 1);
      if ((up && lf) || (up && x < 136) || (lf && y < 150)) px(x, y, y < 136 || (x < 100 && y < 185) ? P.G3 : P.G1);
      else if (ul || (!on(x, y - 2) && x < 140) || (!on(x - 2, y) && y < 170)) px(x, y, BAYER[(y & 3) * 4 + (x & 3)] < 8 ? P.G1 : P.K);
    }
    // coat collar crease, hat band, ear
    line(113, 161, 119, 173, P.G1); line(124, 151, 118, 158, P.G1);
    rect(118, 126, 27, 2, P.G1); rect(118, 127, 27, 1, P.K); px(118, 126, P.G3);
    msX_ell(117.5, 143, 2.5, 5, [P.K, P.RD, P.BR, P.RD2], { L: [-0.7, -0.6, 0.3], amb: 0.05 }); px(117, 143, P.K);
  });
}
function msX_shade() {
  return sprite('msXshade', 21, 13, () => {
    msX_cyl([[8, 0], [13, 0], [21, 10], [0, 10]], msX_GRN, { lx: -0.6, amb: 0.1 });
    rect(9, 0, 3, 1, P.G3); rect(0, 10, 21, 1, P.G3); rect(1, 11, 19, 1, P.YE); rect(3, 12, 15, 1, P.YE); rect(7, 11, 7, 2, P.W);
  });
}
function interrogationArt(x, y, w, h, p) {
  const t = performance.now() / 1000, ox = x + ((w - 150) >> 1), oy = y + ((h - 200) >> 1);
  const s = Math.max(-3, Math.min(3, Math.round(Math.sin(t * 1.3) * 3.4))), L = msX_irL(s);
  msX_clip(x, y, w, h); rect(x, y, w, h, P.K);
  g.drawImage(msX_irBg(s), ox, oy);
  // clock hands
  const mn = t / 60 * Math.PI * 2, sc = Math.floor(t) / 60 * Math.PI * 2;
  line(ox + 128, oy + 13, ox + 128 + Math.round(Math.sin(1.1) * 3), oy + 13 - Math.round(Math.cos(1.1) * 3), P.K);
  line(ox + 128, oy + 13, ox + 128 + Math.round(Math.sin(mn + 4) * 5), oy + 13 - Math.round(Math.cos(mn + 4) * 5), P.K);
  px(ox + 128 + Math.round(Math.sin(sc) * 4), oy + 13 - Math.round(Math.cos(sc) * 4), P.RD);
  // suspect
  const f = p && p.face;
  if (f) {
    g.drawImage(msX_irSuspect(f, false), ox, oy); g.drawImage(msX_cutFace(f), ox + 49, oy + 52);
    if (f.glasses !== 2 && (t % 4.3) < 0.14) { rect(ox + 67, oy + 76, 6, 3, f.skin); rect(ox + 77, oy + 76, 6, 3, f.skin); rect(ox + 67, oy + 78, 6, 1, P.SK3); rect(ox + 77, oy + 78, 6, 1, P.SK3); }
  }
  g.drawImage(msX_irTab(s), ox, oy);
  if (f) g.drawImage(msX_irSuspect(f, true), ox, oy);
  // smoke from the ashtray
  for (let i = 0; i < 16; i++) {
    const ph = (t * 0.3 + i / 16) % 1, yy = 131 - ph * 86, xx = 28 + Math.sin(ph * 9 + t * 1.2) * ph * 8 + ph * 4;
    if (ph > 0.7 && i & 1) continue; const c = ph < 0.45 ? P.G3 : (i & 1 ? P.G3 : P.G1);
    px(ox + xx, oy + yy, c); if (ph > 0.25 && ph < 0.8) px(ox + xx + 1, oy + yy - 1, P.G1);
  }
  if ((t * 3 | 0) % 4) px(ox + 28, oy + 132, P.RD2); else px(ox + 28, oy + 132, P.YE);
  // lamp on its flex
  line(ox + 75, oy, ox + L.lx, oy + L.ly, P.G1); line(ox + 76, oy, ox + L.lx + 1, oy + L.ly, P.K);
  g.drawImage(msX_shade(), ox + L.lx - 10, oy + L.ly);
  g.drawImage(msX_irFg(), ox, oy);
  g.restore();
}


// ===================================================================
// CAPTURED: a stone cell, a swinging bulb, and the one they call Squinty
// ===================================================================
function msX_cpL(s) { const a = s * 0.08; return { bx: 66 + Math.round(Math.sin(a) * 46), by: 2 + Math.round(Math.cos(a) * 46) }; }
function msX_cpBg(s) {
  return sprite('msXcpbg' + s, 95, 200, () => {
    const L = msX_cpL(s), R = [P.K, P.G1, P.G3, P.W];
    let y = 0, row = 0;
    while (y < 200) {
      const hgt = 9 + Math.floor(msX_hash(row, 7) * 5), edges = [];
      let xx = -Math.floor(msX_hash(row, 3) * 14); while (xx < 95) { edges.push(xx); xx += 12 + Math.floor(msX_hash(row, xx + 40) * 12); } edges.push(xx);
      for (let yy = y; yy < Math.min(200, y + hgt); yy++) {
        let k = 0;
        for (let x = 0; x < 95; x++) {
          while (edges[k + 1] <= x) k++;
          const lx_ = x - edges[k], lw = edges[k + 1] - edges[k], ly_ = yy - y;
          const d = Math.hypot(x - L.bx, (yy - L.by) * 1.05), I = Math.max(0, 1 - d / 78) ** 1.5;
          const mort = lx_ === 0 || ly_ === hgt - 1;
          const v = mort ? 0.02 + I * 0.25 : 0.07 + I * 0.62 + (vnoise(x * 0.35 + row * 5, yy * 0.35) - 0.5) * 0.2 + (ly_ === 0 ? 0.08 : 0) + (lx_ === 1 ? 0.04 : 0) - (ly_ === hgt - 2 ? 0.08 : 0) - (lx_ === lw - 1 ? 0.07 : 0);
          let c = msX_c(x, yy, v, R);
          px(x, yy, c);
        }
      }
      y += hgt; row++;
    }
    // barred window with a night sky and a crescent moon
    const wx = 8, wy = 12;
    rect(wx - 4, wy - 3, 42, 38, P.K);
    for (let yy = wy; yy < wy + 30; yy++) for (let x = wx; x < wx + 34; x++) px(x, yy, msX_c(x, yy, 0.45 - (yy - wy) / 30 * 0.35, [P.K, P.BL, P.BL2]));
    for (const [sx, sy] of [[3, 4], [16, 10], [9, 23], [25, 20], [31, 27], [5, 15], [21, 3]]) px(wx + sx, wy + sy, P.W);
    for (let yy = wy + 1; yy < wy + 13; yy++) for (let x = wx + 22; x < wx + 34; x++) { const a = Math.hypot(x - wx - 27, yy - wy - 6), b = Math.hypot(x - wx - 29.5, yy - wy - 4.5); if (a < 4.6 && b > 4) px(x, yy, a < 3.8 ? P.W : P.YE); }
    msX_fill([[wx - 4, wy - 3], [wx + 38, wy - 3], [wx + 34, wy], [wx, wy]], P.G1); msX_fill([[wx - 4, wy - 3], [wx, wy], [wx, wy + 30], [wx - 4, wy + 34]], P.K);
    msX_fill([[wx + 34, wy], [wx + 38, wy - 3], [wx + 38, wy + 34], [wx + 34, wy + 30]], P.G1);
    msX_fill([[wx, wy + 30], [wx + 34, wy + 30], [wx + 38, wy + 34], [wx - 4, wy + 34]], P.G3); rect(wx - 4, wy + 34, 42, 1, P.K); rect(wx - 3, wy + 35, 40, 1, P.G1);
    for (const bx of [4, 12, 20, 28]) { rect(wx + bx, wy - 1, 1, 33, P.G3); rect(wx + bx + 1, wy - 1, 1, 33, P.G1); rect(wx + bx + 2, wy - 1, 1, 33, P.K); px(wx + bx, wy + 30, P.BR); }
    rect(wx, wy + 14, 34, 1, P.G3); rect(wx, wy + 15, 34, 1, P.K);
    // pale moonlight on the sill
    for (let x = wx; x < wx + 34; x++) if (![4, 5, 6, 12, 13, 14, 20, 21, 22, 28, 29, 30].includes(x - wx)) px(x, wy + 31, P.BL2);
  });
}
function msX_squinty() {
  return sprite('msXsq', 95, 200, () => {
    const L = [-0.3, -0.75, 0.58], coat = [P.K, P.G1, P.G3], SK = msX_SKIN, cx = 47.5;
    const skin = (x0, y0, rx, ry, o = {}) => msX_ell(x0, y0, rx, ry, SK, Object.assign({ L, amb: 0.42, dif: 0.62 }, o));
    // greatcoat
    msX_cyl([[0, 200], [0, 164], [10, 153], [30, 147], [65, 147], [85, 153], [95, 164], [95, 200]], coat, { lx: -0.45, amb: 0.08, dif: 0.6, vy: 0.25 });
    msX_limb(10, 172, 4, 200, 20, 22, coat, { L, amb: 0.05, dif: 0.65 }); msX_limb(85, 172, 91, 200, 20, 22, coat, { L, amb: 0.02, dif: 0.45 });
    // neck and turned-up collar
    msX_cyl([[35, 132], [60, 132], [62, 148], [33, 148]], [P.K, P.RD, P.BR, P.RD2], { lx: -0.3, amb: 0.05, dif: 0.5 });
    rect(34, 138, 28, 1, P.RD);
    msX_cyl([[30, 140], [65, 140], [67, 150], [28, 150]], coat, { lx: -0.5, amb: 0.1, dif: 0.6 }); rect(30, 140, 35, 1, P.G3);
    const lap = [[16, 158], [30, 146], [46, 160], [40, 188]], rap = [[79, 158], [65, 146], [49, 160], [55, 188]];
    msX_cyl(lap, coat, { lx: -0.8, amb: 0.2, dif: 0.6 }); msX_cyl(rap, coat, { lx: -0.8, amb: 0.02, dif: 0.35 });
    line(30, 146, 46, 160, P.K); line(65, 146, 49, 160, P.K); line(46, 160, 40, 188, P.K); line(49, 160, 55, 188, P.K); msX_fill([[44, 150], [51, 150], [49, 160], [46, 160]], P.K);
    msX_fill([[22, 160], [31, 154], [34, 162], [26, 167]], P.RD); line(22, 160, 31, 154, P.RD2); px(28, 161, P.YE); px(30, 160, P.YE);
    msX_fill([[73, 160], [64, 154], [61, 162], [69, 167]], P.RD); px(66, 161, P.YE);
    // gold epaulettes with fringe
    msX_limb(4, 165, 24, 157, 6, 6, msX_GOLD, { L, amb: 0.1 }); msX_limb(71, 157, 91, 165, 6, 6, msX_GOLD, { L, amb: 0.02, dif: 0.7 });
    for (let k = 0; k < 9; k++) { rect(3 + k * 2, 168 - k, 1, 3, k & 1 ? P.YE : P.BR); rect(73 + k * 2, 161 + k, 1, 3, k & 1 ? P.BR : P.YE); }
    // medals and buttons
    [[P.RD, P.YE], [P.BL, P.W], [P.GR, P.RD], [P.YE, P.RD], [P.W, P.BL], [P.RD, P.W]].forEach(([a, b], k) => { rect(58 + (k % 3) * 7, 176 + (k / 3 | 0) * 3, 6, 2, a); px(60 + (k % 3) * 7, 176 + (k / 3 | 0) * 3, b); });
    rect(64, 182, 2, 3, P.RD); msX_ell(65, 188, 3, 3, msX_GOLD, { L }); px(64, 187, P.W);
    rect(47, 188, 1, 12, P.K); for (const by of [191, 198]) { rect(43, by, 2, 2, P.YE); px(44, by + 1, P.BR); }
    // ears, jaw, skull
    skin(25, 112, 4, 7, { amb: 0.3 }); skin(70, 112, 4, 7, { amb: 0.25 }); rect(24, 110, 1, 5, P.RD); rect(70, 110, 1, 5, P.RD);
    skin(cx, 124, 19, 16, { amb: 0.36 });
    skin(cx, 110, 21, 26, { test: (x, y) => y < 126 });
    // visor shadow across the brow
    for (let y = 97; y < 102; y++) for (let x = 27; x < 69; x++) if (BAYER[(y & 3) * 4 + (x & 3)] < 16 - (y - 97) * 3) px(x, y, y < 99 ? P.RD : P.BR);
    // stubble
    msX_spans([[30, 121], [65, 121], [60, 139], [35, 139]], (y, a, b) => { for (let x = a; x < b; x++) if (BAYER[(y & 3) * 4 + (x & 3)] < 4 && !(y > 124 && y < 132 && x > 39 && x < 56)) px(x, y, (x * 3 + y) % 4 ? P.RD : P.G1); });
    // heavy brows angled down into a scowl
    for (let k = 0; k < 12; k++) { const dy = (k * 0.5) | 0; rect(31 + k, 101 + dy, 1, 3, P.K); px(31 + k, 100 + dy, P.G1); rect(63 - k, 101 + dy, 1, 3, P.K); px(63 - k, 100 + dy, P.G1); }
    // the squint: left eye a glinting slit, right screwed shut
    rect(33, 108, 11, 1, P.K); rect(34, 109, 9, 1, P.K); px(38, 109, P.G1); px(39, 109, P.W); rect(34, 110, 9, 1, P.RD); rect(35, 111, 7, 1, P.BR); rect(36, 112, 5, 1, P.RD);
    rect(51, 109, 12, 1, P.K); px(50, 108, P.K); px(63, 108, P.K); rect(52, 110, 10, 1, P.RD); rect(53, 111, 8, 1, P.BR); rect(54, 112, 6, 1, P.RD);
    px(31, 107, P.RD); px(31, 109, P.RD); px(64, 107, P.RD); px(65, 110, P.RD); px(64, 111, P.RD);
    // nose
    rect(49, 106, 1, 14, P.RD); rect(48, 108, 1, 10, P.BR); rect(46, 109, 1, 9, P.RD2); px(46, 112, P.PK);
    skin(47.5, 120.5, 4, 3, { amb: 0.5 }); px(43, 122, P.K); px(44, 122, P.K); rect(51, 122, 2, 1, P.K); px(46, 119, P.PK);
    line(41, 121, 38, 130, P.RD); line(54, 121, 57, 129, P.RD);
    // scar across the left cheek
    for (let k = 0; k < 14; k++) px(29 + (k * 0.45 | 0), 105 + k, k & 1 ? P.PK : P.W); for (let k = 0; k < 4; k++) px(28 + k * 2, 111 + k * 2, P.RD);
    // pencil moustache and a sneer
    rect(40, 125, 7, 1, P.K); rect(49, 125, 7, 1, P.K); rect(41, 126, 14, 1, P.RD);
    rect(41, 129, 12, 1, P.K); px(53, 128, P.K); px(54, 128, P.K); px(55, 127, P.K); rect(42, 130, 10, 1, P.RD); rect(43, 131, 8, 1, P.BR); px(40, 130, P.RD);
    rect(43, 135, 9, 1, P.RD);
    // officer's cap
    msX_ell(48, 83, 30, 11, coat, { L, amb: 0.02, dif: 0.7, test: (x, y) => y < 90 });
    msX_cyl([[22, 84], [74, 84], [72, 91], [24, 91]], coat, { lx: -0.4, amb: 0.02, dif: 0.6 });
    msX_cyl([[24, 88], [72, 88], [71, 95], [25, 95]], msX_RED, { lx: -0.5, amb: 0.15 }); rect(25, 88, 46, 1, P.RD2); rect(24, 87, 48, 1, P.K);
    msX_ell(48, 96, 25, 5, [P.K, P.K, P.G1, P.G3, P.W], { L: [-0.3, -0.9, 0.3], amb: 0, test: (x, y) => y >= 95 });
    line(30, 97, 44, 96, P.G3); rect(23, 95, 50, 1, P.K);
    msX_str(['...Y...', 'Y.YWY.Y', 'YYYWYYY', '.YYWYY.', '..YBY..', '..Y.Y..'], { Y: P.YE, W: P.W, B: P.BR }, 45, 80);
    // cigarette dangling from the corner of his mouth
    for (let k = 0; k < 13; k++) { const yy = 128 + (k * 0.4 | 0); px(54 + k, yy, k < 3 ? P.BR : P.W); px(54 + k, yy + 1, k < 3 ? P.BR : P.G3); }
  });
}
function captureArt(x, y, w, h) {
  const t = performance.now() / 1000, ox = x + ((w - 95) >> 1), oy = y + ((h - 200) >> 1);
  const s = Math.max(-3, Math.min(3, Math.round(Math.sin(t * 1.1) * 3.4))), L = msX_cpL(s);
  msX_clip(x, y, w, h); rect(x, y, w, h, P.K);
  g.drawImage(msX_cpBg(s), ox, oy);
  // the bare bulb on its flex
  line(ox + 66, oy, ox + L.bx, oy + L.by - 5, P.K);
  rect(ox + L.bx - 2, oy + L.by - 6, 4, 3, P.G1); px(ox + L.bx - 2, oy + L.by - 6, P.G3);
  const fl = (t * 7 | 0) % 23 === 0;
  disc(ox + L.bx - 0.5, oy + L.by, 3, fl ? P.BR : P.YE); rect(ox + L.bx - 1, oy + L.by - 2, 2, 3, fl ? P.YE : P.W);
  if (!fl) for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + (t * 2 | 0) * 0.2; px(ox + L.bx + Math.round(Math.cos(a) * 6), oy + L.by + Math.round(Math.sin(a) * 6), k & 1 ? P.YE : P.BR); }
  g.drawImage(msX_squinty(), ox, oy);
  // the cigarette tip glows with each drag; smoke curls up past the bulb
  const drag = (t % 5) < 1.2;
  px(ox + 67, oy + 132, drag ? P.YE : P.RD2); px(ox + 67, oy + 133, drag ? P.RD2 : P.RD); if (drag) { px(ox + 68, oy + 132, P.RD2); px(ox + 66, oy + 131, P.RD); }
  for (let i = 0; i < 24; i++) {
    const ph = (t * 0.2 + i / 24) % 1, yy = 129 - ph * 125, xx = 68 + Math.sin(ph * 7 + t * 0.9 + i * 0.2) * (2 + ph * 9) + ph * 4;
    if (ph > 0.75 && i % 3) continue;
    const c = ph < 0.45 ? P.W : ph < 0.7 ? P.G3 : P.G1; px(ox + xx, oy + yy, c); if (ph > 0.15) px(ox + xx + 1, oy + yy, ph < 0.55 ? P.W : P.G3); if (ph > 0.4 && i & 1) px(ox + xx, oy + yy - 1, P.G3);
  }
  // now and then a glint in the one open eye
  if ((t % 3.1) < 0.25) { px(ox + 39, oy + 108, P.W); px(ox + 40, oy + 109, P.W); }
  frame(x, y, w, h, P.G1);
  g.restore();
}

// ===================================================================
// VACATION SNAPSHOTS: laundromat, office, beach, Monte Carlo
// ===================================================================
function msX_hairOf(sex) { return sex === 'f' ? P.YE : P.BR; }
function msX_cloud() {
  return sprite('msXcloud', 34, 12, () => {
    for (const [cx, cy, rx, ry] of [[8, 8, 7, 4], [16, 5, 8, 5], [25, 7, 7, 4], [17, 9, 13, 3]]) msX_ell(cx, cy, rx, ry, [P.CY, P.W, P.W], { L: [-0.2, -0.9, 0.4], amb: 0.3 });
  });
}

// ---------- 0: Saturday night at the laundromat ----------
function msX_r0Bg() {
  return sprite('msXr0bg', 320, 200, () => {
    // ceiling with fluorescent fittings
    for (let y = 0; y < 14; y++) for (let x = 0; x < 320; x++) px(x, y, msX_c(x, y, 0.12 + y / 14 * 0.25, msX_GRAY));
    for (const fx of [14, 124, 234]) { rect(fx, 2, 72, 5, P.G1); rect(fx, 2, 72, 1, P.G3); rect(fx + 2, 7, 68, 2, P.W); rect(fx + 2, 9, 68, 1, P.CY); }
    // painted upper wall, tiled lower wall
    for (let y = 14; y < 86; y++) for (let x = 0; x < 320; x++) {
      const lit = Math.max(0, 1 - Math.min(...[50, 160, 270].map(c => Math.hypot(x - c, (y - 10) * 1.4))) / 90);
      px(x, y, msX_c(x, y, 0.3 + lit * 0.45 - (y - 14) / 72 * 0.1, [P.BL, P.TL, P.CY]));
    }
    rect(0, 84, 320, 2, P.W); rect(0, 86, 320, 1, P.TL);
    for (let y = 87; y < 150; y++) for (let x = 0; x < 320; x++) px(x, y, (y - 87) % 7 === 6 || x % 8 === 7 ? P.G3 : msX_c(x, y, 0.8 - (y - 87) / 63 * 0.25, [P.G3, P.W, P.W]));
    // floor: black & white checker in perspective
    for (let y = 150; y < 200; y++) for (let x = 0; x < 320; x++) {
      const d = y - 60, X = (x - 160) / d * 2.4, Z = 900 / d, tile = (Math.floor(X) + Math.floor(Z)) & 1;
      px(x, y, msX_c(x, y, (tile ? 0.88 : 0.2) - Math.max(0, 6 - (y - 150)) * 0.06, msX_GRAY));
    }
    rect(0, 150, 320, 1, P.K);
    // window onto the night street
    const wx = 6, wy = 20, ww = 64, wh = 58;
    rect(wx - 3, wy - 3, ww + 6, wh + 6, P.G3); frame(wx - 3, wy - 3, ww + 6, wh + 6, P.G1); rect(wx - 1, wy - 1, ww + 2, wh + 2, P.K);
    for (let y = wy; y < wy + wh; y++) for (let x = wx; x < wx + ww; x++) {
      let c;
      if (y < wy + 12) c = msX_c(x, y, 0.28 - (y - wy) * 0.015, [P.K, P.BL]);
      else if (y < wy + 44) { const bx = (x - wx) % 16, by = (y - wy - 12) % 9; c = bx > 3 && bx < 11 && by > 2 && by < 7 ? (msX_hash(x - bx, y - by) < 0.45 ? (by === 3 ? P.W : P.YE) : P.K) : msX_c(x, y, 0.3, [P.K, P.RD, P.BR]); }
      else if (y < wy + 48) c = P.G1;
      else c = msX_c(x, y, 0.15, [P.K, P.G1]);
      px(x, y, c);
    }
    for (let y = wy + 49; y < wy + wh; y += 2) { px(wx + 44, y, P.YE); px(wx + 15, y + 1, P.RD2); } // puddle reflections
    rect(wx + 44, wy + 14, 1, 34, P.G1); msX_ell(wx + 44.5, wy + 14, 3, 2, msX_GOLD, { amb: 0.5 });
    rect(wx + 10, wy + 14, 12, 10, P.K); frame(wx + 10, wy + 14, 12, 10, P.RD2); text('BAR', wx + 11, wy + 15, P.RD2);
    for (let k = 0; k < 90; k++) { const sx = k % 30, sy = (k * 7) % wh; if ((sx + sy) % 23 === 0) px(wx + sx * 2, wy + sy, P.CY); }
    for (let k = 0; k < 16; k++) { px(wx + 40 + k, wy + 2 + k, P.BL2); px(wx + 46 + k, wy + 2 + k, P.BL2); }
    rect(wx + ww / 2, wy, 2, wh, P.G3); rect(wx + ww / 2 + 1, wy, 1, wh, P.G1);
    // clock (hands per frame)
    msX_ell(97, 50, 10, 10, msX_GRAY, { amb: 0.2 }); msX_ell(97, 50, 8, 8, [P.G3, P.W, P.W], { amb: 0.5 });
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; px(97 + Math.round(Math.sin(a) * 6.5) - 1, 50 - Math.round(Math.cos(a) * 6.5), k % 3 ? P.G1 : P.K); }
    // neon sign board
    rect(116, 18, 190, 26, P.K); frame(116, 18, 190, 26, P.G1); frame(119, 21, 184, 20, P.MG);
    // laundry basket and a row of plastic chairs
    for (const cx of [8, 60]) chairAt(cx);
    function chairAt(cx) {
      msX_cyl([[cx + 6, 118], [cx + 36, 118], [cx + 36, 146], [cx + 6, 146]], [P.K, P.BR, P.YE], { lx: -0.5, amb: 0.2, dif: 0.7 });
      msX_cyl([[cx + 2, 146], [cx + 40, 146], [cx + 42, 152], [cx, 152]], [P.K, P.BR, P.YE], { lx: -0.3, amb: 0.3 });
      rect(cx + 4, 152, 2, 18, P.G3); rect(cx + 36, 152, 2, 18, P.G3); rect(cx + 5, 152, 1, 18, P.G1); rect(cx + 37, 152, 1, 18, P.G1);
      rect(cx + 2, 169, 6, 1, P.K); rect(cx + 34, 169, 6, 1, P.K);
    }
    // magazine on the empty chair
    msX_fill([[66, 146], [84, 144], [88, 149], [70, 151]], P.RD2); msX_fill([[68, 146], [74, 145], [76, 148], [70, 149]], P.YE); rect(76, 147, 8, 1, P.W);
    // laundry basket
    const bx = 60, by = 160;
    msX_ell(bx + 12, by + 2, 13, 5, [P.RD, P.BL2, P.W, P.RD2, P.YE], { amb: 0.3 });
    msX_cyl([[bx, by], [bx + 24, by], [bx + 22, by + 16], [bx + 2, by + 16]], [P.G1, P.G3, P.W], { lx: -0.5, amb: 0.3 });
    for (let yy = by + 3; yy < by + 14; yy += 4) for (let xx = bx + 4; xx < bx + 21; xx += 4) rect(xx, yy, 2, 2, P.G1);
    rect(bx + 1, by, 22, 1, P.W); msX_dit([[bx - 4, by + 16], [bx + 28, by + 16], [bx + 26, by + 19], [bx - 2, by + 19]], P.K, 8);
  });
}
function msX_washer() {
  return sprite('msXwash', 44, 70, () => {
    msX_cyl([[0, 1], [44, 1], [44, 70], [0, 70]], [P.G1, P.G3, P.W, P.W], { lx: -0.55, amb: 0.35, dif: 0.65 });
    rect(1, 0, 42, 1, P.W); rect(0, 1, 44, 2, P.W); rect(0, 3, 44, 1, P.G3);
    rect(2, 5, 40, 12, P.G1); rect(2, 5, 40, 1, P.K); rect(2, 16, 40, 1, P.W);
    rect(5, 8, 10, 5, P.K); frame(5, 8, 10, 5, P.G3); rect(8, 10, 4, 1, P.G1);
    msX_ell(34, 11, 4, 4, msX_GRAY, { amb: 0.2 }); rect(34, 8, 1, 3, P.K);
    msX_ell(22, 42, 16, 16, msX_GRAY, { amb: 0.25 });
    msX_ell(22, 42, 13.5, 13.5, [P.K, P.G1, P.G3], { L: [0.45, 0.6, 0.66], amb: 0.1 });
    msX_ell(22, 42, 12, 12, [P.K, P.BL, P.BL2], { L: [0.3, 0.8, 0.5], amb: 0.05, dif: 0.8 });
    rect(38, 37, 3, 10, P.G3); rect(40, 37, 1, 10, P.G1); rect(38, 36, 3, 1, P.W);
    rect(0, 63, 44, 7, P.G1); for (let k = 0; k < 6; k++) rect(6 + k * 6, 65, 4, 1, P.K); rect(0, 69, 44, 1, P.K);
    rect(0, 1, 1, 69, P.G1); rect(43, 1, 1, 69, P.G1);
  });
}
function msX_r0Max(sex) {
  return sprite('msXr0max' + sex, 48, 72, () => {
    const hair = msX_hairOf(sex), shirt = sex === 'f' ? [P.K, P.MG, P.PK] : [P.K, P.RD, P.RD2], jeans = [P.K, P.BL, P.BL2];
    msX_limb(18, 47, 15, 55, 10, 9, jeans, { amb: 0.3 }); msX_limb(30, 47, 33, 55, 10, 9, jeans, { amb: 0.25 });
    msX_limb(15, 55, 14, 64, 8, 7, jeans, { amb: 0.3, edge: P.BL }); msX_limb(33, 55, 35, 64, 8, 7, jeans, { amb: 0.25, edge: P.BL });
    rect(23, 48, 1, 7, P.BL);
    msX_ell(13.5, 66, 5, 2.5, [P.K, P.G1, P.W], { amb: 0.2 }); rect(9, 67, 10, 1, P.W);
    msX_cyl([[15, 21], [33, 21], [35, 47], [13, 47]], shirt, { lx: -0.5, amb: 0.3, dif: 0.6 });
    if (sex === 'm') { for (let yy = 24; yy < 46; yy += 4) for (let xx = 14; xx < 35; xx++) if (BAYER[(yy & 3) * 4 + (xx & 3)] < 10) px(xx, yy, P.RD); rect(24, 22, 1, 25, P.RD); }
    else { rect(20, 21, 8, 3, P.PK); }
    msX_limb(33, 23, 37, 37, 7, 6, shirt, { amb: 0.2, edge: P.RD }); msX_limb(37, 38, 30, 46, 6, 5, shirt, { amb: 0.3, edge: P.RD });
    msX_ell(29, 47, 3, 2.5, msX_SKIN, { amb: 0.6, dif: 0.4 });
    msX_cyl([[21, 17], [27, 17], [27, 22], [21, 22]], msX_SKIN, { amb: 0.3, dif: 0.5 });
    msX_head(24, 11, 6, { hair, style: sex === 'f' ? 'long' : 'short', sex, eyes: 'half', mouth: 'flat' });
    msX_limb(15, 24, 13, 42, 7, 6, shirt, { amb: 0.35, edge: P.RD }); msX_limb(13, 42, 20, 22, 6, 5, shirt, { amb: 0.45, edge: P.RD });
    msX_ell(21.5, 20, 3.5, 2.5, msX_SKIN, { amb: 0.6, dif: 0.4 }); px(20, 19, P.BR); px(22, 19, P.BR);
    msX_outline(48, 72);
  });
}
function msX_laundry(t) {
  g.drawImage(msX_r0Bg(), 0, 0);
  // neon sign, one letter on the blink
  const bad = (t * 5 | 0) % 17 < 2;
  const s = 'WASH-O-RAMA', sx = 211 - bigW(s, 2) / 2;
  bigText(s, sx, 23, 2, P.MG); bigText(s, sx - 1, 22, 2, P.PK);
  if (bad) rect(sx + bigW('WASH-', 2), 21, bigW('O', 2) + 2, 20, P.K);
  // fluorescent tube flicker
  if ((t * 11 | 0) % 29 === 0) rect(236, 7, 68, 2, P.G3);
  // clock at twenty to midnight
  const cm = (40 + t / 6) / 60 * Math.PI * 2;
  line(97, 50, 97 + Math.round(Math.sin(-0.35) * 4), 50 - Math.round(Math.cos(-0.35) * 4), P.K);
  line(97, 50, 97 + Math.round(Math.sin(cm) * 6), 50 - Math.round(Math.cos(cm) * 6), P.K);
  // the machines, drums tumbling
  const wash = msX_washer(), cols = [[P.RD2, P.YE, P.W, P.GR2], [P.PK, P.W, P.BL2, P.YE], [P.W, P.RD, P.CY, P.YE], [P.GR2, P.RD2, P.W, P.MG], [P.YE, P.BL2, P.PK, P.W]];
  for (let k = 0; k < 5; k++) {
    const shake = k === 2 ? ((t * 18 | 0) & 1) : 0, mx = 84 + k * 46 + shake, my = 82, cx = mx + 22, cy = my + 42;
    g.drawImage(wash, mx, my);
    const sp = [2.2, 3.1, 0, 2.6, 1.7][k], a0 = t * sp;
    if (k === 2) { for (let j = 0; j < 28; j++) { const a = j / 28 * Math.PI * 2; px(cx + Math.round(Math.cos(a) * 8), cy + Math.round(Math.sin(a) * 8), cols[k][(j + (t * 40 | 0)) & 3]); px(cx + Math.round(Math.cos(a) * 7), cy + Math.round(Math.sin(a) * 7), cols[k][(j + 1 + (t * 40 | 0)) & 3]); } }
    else {
      for (let j = 0; j < 8; j++) { const a = a0 * 0.8 + j * Math.PI / 4; px(cx + Math.round(Math.cos(a) * 10), cy + Math.round(Math.sin(a) * 10), P.K); }
      const wl = cy + 3 + Math.round(Math.sin(t * 3 + k) * 1);
      for (let yy = wl; yy < cy + 11; yy += 2) { const hw = Math.floor(Math.sqrt(Math.max(0, 110 - (yy - cy) ** 2))); rect(cx - hw, yy, hw * 2, 1, P.BL2); }
      rect(cx - 9, wl, 18, 1, P.CY);
      for (let j = 0; j < 4; j++) { const a = a0 + j * 1.7 + Math.sin(a0 * 0.7 + j) * 0.4, r = 5 + (j & 1) * 2; const qx = cx + Math.round(Math.cos(a) * r), qy = cy + 2 + Math.round(Math.sin(a) * r * 0.9); rect(qx - 2, qy - 1, 4, 3, cols[k][j]); px(qx + 1, qy + 1, P.K); }
    }
    for (const [gx, gy] of [[-7, -8], [-8, -7], [-6, -9], [-9, -5], [-4, -10]]) px(cx + gx, cy + gy, P.W);
    px(mx + 4, my + 7, (t * 2 + k) % 2 < 1 ? P.RD2 : P.RD); px(mx + 17, my + 7, k === 4 ? P.YE : P.GR2);
  }
  // Max, bored stiff; tapping a foot and yawning now and then
  const sex = msX_sex(); g.drawImage(msX_r0Max(sex), 16, 100);
  const tap = (t * 3 | 0) & 1;
  g.drawImage(msX_r0Shoe(), 45, 163 - tap);
  if (t % 7 > 5.6) { rect(39, 115, 2, 2, P.K); px(39, 117, P.RD); }
}
function msX_r0Shoe() { return sprite('msXr0shoe', 12, 6, () => { msX_ell(6.5, 3, 5, 2.5, [P.K, P.G1, P.W], { amb: 0.2 }); rect(2, 4, 10, 1, P.W); }); }

// ---------- 1: another week hanging around the office ----------
function msX_paper(x0, w, top, bot, seed) {
  for (let y = top; y < bot; y++) {
    const off = Math.round((msX_hash(seed, y) - 0.5) * 3), h = msX_hash(y, seed + 9);
    const c = h < 0.07 ? P.YE : h < 0.1 ? P.BL2 : h < 0.12 ? P.RD2 : (y & 1 ? P.G3 : P.W);
    rect(x0 + off, y, w, 1, c); px(x0 + off, y, P.G1); px(x0 + off + w - 1, y, y & 1 ? P.G1 : P.G3);
  }
  rect(x0, top - 1, w, 2, P.W); for (let k = 0; k < 3; k++) rect(x0 + 3, top + 2 + k * 2, w - 8 - k * 3, 1, P.G3);
  rect(x0 - 1, bot - 1, w + 2, 1, P.K);
}
function msX_r1Bg(sex) {
  return sprite('msXr1bg', 320, 200, () => {
    // warm plaster wall, oak wainscot
    for (let y = 0; y < 116; y++) for (let x = 0; x < 320; x++) {
      const v = 0.6 - Math.abs(x - 160) / 160 * 0.2 - y / 116 * 0.06 + Math.max(0, 0.18 - Math.hypot(x - 160, y - 50) / 500); px(x, y, msX_c(x, y, v, [P.G1, P.G3, P.W]));
    }
    for (let y = 92; y < 116; y++) for (let x = 0; x < 320; x++) { const gx = x % 26; px(x, y, msX_c(x, y, 0.45 + (gx === 1 ? 0.25 : 0) - (gx === 0 ? 0.35 : 0) + (vnoise(x * 0.2, y * 1.5) - 0.5) * 0.2, msX_WOOD.slice(0, 3))); }
    rect(0, 90, 320, 2, P.BR); rect(0, 90, 320, 1, P.YE); rect(0, 92, 320, 1, P.K);
    // window frame (view & blinds drawn per frame)
    rect(100, 8, 120, 82, P.W); frame(100, 8, 120, 82, P.G3); rect(104, 12, 112, 74, P.K); rect(218, 10, 2, 80, P.G3);
    rect(96, 86, 128, 4, P.W); rect(96, 89, 128, 1, P.G3); rect(98, 90, 124, 1, P.K);
    // clock face (hands per frame)
    msX_ell(56, 34, 14, 14, [P.K, P.RD, P.BR, P.YE], { amb: 0.2 }); msX_ell(56, 34, 11.5, 11.5, [P.G3, P.W, P.W], { amb: 0.55, L: [0.4, 0.6, 0.7] });
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; px(56 + Math.round(Math.sin(a) * 9.5) - 1, 34 - Math.round(Math.cos(a) * 9.5), k % 3 ? P.G1 : P.K); if (!(k % 3)) px(56 + Math.round(Math.sin(a) * 9.5) - 1, 34 - Math.round(Math.cos(a) * 8.5), P.K); }
    // Agency seal
    msX_ell(80, 66, 10, 10, msX_GOLD, { amb: 0.2 }); msX_ell(80, 66, 8, 8, [P.K, P.BL, P.BL2], { amb: 0.3 }); msX_ell(80, 66, 5, 5, [P.G3, P.W], { amb: 0.6 });
    msX_str(['..K..', 'KKKKK', '.KBK.', '.K.K.'], { K: P.BR, B: P.BL }, 78, 64); rect(69, 78, 22, 2, P.K);
    // calendar
    rect(236, 16, 38, 46, P.K); rect(237, 17, 36, 44, P.W); rect(237, 17, 36, 10, P.RD); rect(237, 26, 36, 1, P.RD2); text('WEEK', 243, 18, P.W);
    for (let k = 0; k < 3; k++) rect(240, 54 + k * 2, 30 - k * 6, 1, P.G3); rect(254, 13, 2, 4, P.G1); rect(273, 18, 1, 44, P.G3); rect(237, 61, 37, 1, P.G3);
    // coat stand with trench coat and fedora
    msX_cyl([[22, 22], [26, 22], [26, 116], [22, 116]], msX_WOOD, { amb: 0.1, lx: 0.5 }); msX_ell(24, 20, 3, 3, msX_WOOD, { amb: 0.2 });
    msX_cyl([[18, 30], [30, 30], [42, 104], [6, 104]], [P.K, P.BR, P.YE], { lx: -0.6, amb: 0.2, dif: 0.7 });
    msX_fill([[18, 30], [24, 36], [22, 60], [16, 40]], P.BR); line(24, 36, 24, 104, P.K); line(18, 31, 23, 60, P.K); line(30, 31, 25, 60, P.K);
    rect(9, 70, 31, 3, P.BR); rect(9, 71, 31, 1, P.K); rect(22, 70, 4, 3, P.YE); for (const by of [48, 60, 80]) px(26, by, P.K);
    msX_ell(24, 27, 11, 2.6, [P.K, P.K, P.G1, P.G3], { amb: 0.1 }); msX_ell(24, 22, 6.5, 5, [P.K, P.K, P.G1, P.G3], { amb: 0.1, test: (x, y) => y < 26 && !(y < 19 && Math.abs(x - 23.5) < 2) }); rect(18, 24, 13, 2, P.RD);
    // filing cabinet
    msX_cyl([[282, 50], [316, 50], [316, 116], [282, 116]], msX_GRAY, { lx: -0.5, amb: 0.3, dif: 0.6 });
    for (let k = 0; k < 3; k++) { const dy = 54 + k * 20; frame(285, dy, 28, 17, P.G1); rect(285, dy, 28, 1, P.W); rect(294, dy + 4, 10, 4, P.W); frame(294, dy + 4, 10, 4, P.G1); rect(293, dy + 10, 12, 2, P.G1); rect(293, dy + 10, 12, 1, P.W); }
    rect(284, 44, 30, 6, P.K); rect(286, 45, 26, 5, P.YE); rect(287, 44, 8, 3, P.BL2); rect(300, 43, 10, 4, P.W);
  });
}
function msX_r1Fg(sex) {
  return sprite('msXr1fg' + sex, 320, 200, () => {
    // Max's leather chair
    msX_cyl([[140, 62], [184, 62], [186, 116], [138, 116]], [P.K, P.K, P.G1, P.G3], { lx: -0.5, amb: 0.1, dif: 0.8 });
    msX_ell(162, 63, 23, 5, [P.K, P.G1, P.G3], { amb: 0.2, test: (x, y) => y < 64 });
    for (let yy = 70; yy < 112; yy += 10) for (let xx = 148; xx < 180; xx += 10) { px(xx, yy, P.K); px(xx + 1, yy + 1, P.G1); }
    // Max, head propped on a hand, dozing
    const hair = msX_hairOf(sex), shirt = [P.G3, P.W, P.W];
    msX_cyl([[146, 96], [178, 96], [184, 116], [140, 116]], shirt, { lx: -0.6, amb: 0.35, dif: 0.6 });
    if (sex === 'm') { msX_fill([[160, 96], [165, 96], [166, 112], [162, 116], [159, 112]], P.RD); rect(160, 96, 5, 2, P.RD2); line(162, 98, 162, 112, P.RD2); }
    else { msX_fill([[157, 96], [167, 96], [162, 104]], P.SK); px(162, 103, P.W); }
    msX_cyl([[158, 90], [166, 90], [166, 97], [158, 97]], msX_SKIN, { amb: 0.3, dif: 0.5 });
    msX_head(161, 84, 7, { hair, style: sex === 'f' ? 'long' : 'short', sex, eyes: 'closed', mouth: 'o' });
    msX_limb(178, 100, 182, 114, 8, 7, shirt, { amb: 0.35, edge: P.G3 }); msX_limb(182, 114, 172, 92, 6, 5, shirt, { amb: 0.4, edge: P.G3 });
    msX_ell(170.5, 90, 3.5, 3, msX_SKIN, { amb: 0.6, dif: 0.4 });
    msX_limb(146, 101, 136, 114, 8, 7, shirt, { amb: 0.4, edge: P.G3 });
    // desk
    msX_spans([[8, 114], [312, 114], [319, 127], [1, 127]], (y, a, b) => { for (let x = a; x < b; x++) px(x, y, msX_c(x, y, 0.56 + (vnoise(x * 0.08, y * 0.9) - 0.5) * 0.18 + (y === 114 ? 0.2 : 0), msX_WOOD)); });
    rect(0, 127, 320, 2, P.YE); rect(0, 129, 320, 1, P.K);
    for (let y = 130; y < 200; y++) for (let x = 0; x < 320; x++) px(x, y, msX_c(x, y, 0.42 + (vnoise(x * 0.06, y * 0.5) - 0.5) * 0.3 - (y - 130) * 0.002, [P.K, P.BR, P.YE]));
    for (const [px0, pw] of [[10, 96], [112, 96], [214, 96]]) { frame(px0, 136, pw, 60, P.K); rect(px0 + 1, 137, pw - 2, 1, P.YE); rect(px0 + 1, 137, 1, 58, P.YE); }
    for (const hx of [52, 256]) { msX_ell(hx + 6, 146, 7, 2.5, msX_GOLD, { amb: 0.2 }); rect(hx, 146, 13, 1, P.BR); }
    // things on the desk
    msX_limb(138, 114, 160, 112, 7, 6, shirt, { amb: 0.45, edge: P.G3, L: [-0.3, -0.9, 0.3] }); msX_ell(161, 112, 3, 2.5, msX_SKIN, { amb: 0.6, dif: 0.4 }); line(162, 110, 170, 106, P.YE); px(170, 106, P.K);
    msX_paper(14, 32, 58, 118, 1); msX_paper(50, 28, 76, 118, 2); msX_paper(80, 22, 96, 118, 3);
    msX_paper(206, 30, 72, 118, 4); msX_paper(240, 30, 88, 118, 5); msX_paper(274, 30, 100, 118, 6); msX_paper(222, 20, 104, 118, 7);
    // green banker's lamp
    msX_ell(118, 117, 8, 2.5, msX_GOLD, { amb: 0.2 }); rect(117, 102, 2, 14, P.YE); rect(118, 102, 1, 14, P.BR);
    msX_cyl([[106, 96], [130, 96], [132, 104], [104, 104]], msX_GRN, { lx: -0.5, amb: 0.15 }); msX_ell(118, 96, 12, 2, msX_GRN, { amb: 0.4, test: (x, y) => y < 96 });
    rect(106, 104, 24, 1, P.YE); rect(109, 105, 18, 1, P.W);
    msX_dit([[98, 115], [140, 115], [146, 126], [92, 126]], P.YE, 4);
    // coffee mug
    msX_cyl([[128, 104], [136, 104], [136, 115], [128, 115]], [P.G3, P.W, P.W], { lx: -0.6, amb: 0.3 }); rect(128, 108, 8, 2, P.RD); rect(128, 103, 8, 1, P.BR); frame(136, 106, 3, 6, P.W);
    // telephone
    msX_cyl([[186, 106], [206, 106], [209, 116], [183, 116]], [P.K, P.K, P.G1, P.G3], { lx: -0.5, amb: 0.1 }); msX_ell(196, 111, 4, 3, [P.G1, P.G3, P.W], { amb: 0.3 });
    msX_limb(185, 104, 207, 104, 4, 4, [P.K, P.K, P.G1, P.G3], { L: [-0.2, -0.9, 0.3], amb: 0.1 });
  });
}
function msX_r1View() {
  return sprite('msXr1view', 112, 74, () => {
    for (let y = 0; y < 74; y++) for (let x = 0; x < 112; x++) px(x, y, msX_c(x, y, 0.15 + y / 74 * 0.8, [P.BL2, P.CY, P.W]));
  });
}
function msX_r1Town() {
  return sprite('msXr1town', 112, 74, () => {
    // Washington Monument and the Capitol, over the treetops
    msX_cyl([[28, 14], [33, 14], [35, 60], [26, 60]], [P.G1, P.G3, P.W], { lx: 0.4, amb: 0.3 }); msX_fill([[28, 14], [33, 14], [30.5, 8]], P.W); px(29, 10, P.W);
    msX_cyl([[60, 44], [100, 44], [100, 60], [60, 60]], [P.G1, P.G3, P.W], { lx: 0.4, amb: 0.4 });
    for (let x = 62; x < 99; x += 3) rect(x, 47, 1, 11, P.G1);
    msX_cyl([[70, 36], [90, 36], [90, 44], [70, 44]], [P.G1, P.G3, P.W], { lx: 0.4, amb: 0.4 }); for (let x = 72; x < 90; x += 3) rect(x, 38, 1, 5, P.G1);
    msX_ell(80, 36, 10, 9, [P.G1, P.G3, P.W], { L: [0.5, -0.6, 0.6], amb: 0.25, test: (x, y) => y < 36 }); rect(79, 24, 2, 4, P.G3); px(79, 23, P.W);
    for (let x = 0; x < 112; x++) { const th = 58 + Math.round(Math.sin(x * 0.5) * 1.5 + Math.sin(x * 0.17) * 2); for (let y = th; y < 74; y++) px(x, y, msX_c(x, y, 0.35 + (y - th) * 0.02 + (vnoise(x * 0.4, y * 0.4) - 0.5) * 0.4, msX_GRN)); }
  });
}
function msX_blinds() {
  return sprite('msXblinds', 112, 74, () => {
    for (let y = 0; y < 54; y++) { const r = y % 5; if (r < 3) rect(0, y, 112, 1, [P.W, P.G3, P.G1][r]); }
    rect(0, 54, 112, 3, P.W); rect(0, 56, 112, 1, P.G1);
    for (const cx of [24, 88]) for (let y = 0; y < 55; y++) if (y % 5 > 2) px(cx, y, P.G3);
    rect(106, 57, 1, 12, P.G3); msX_ell(106.5, 70, 1.5, 2.5, [P.BR, P.YE], { amb: 0.3 });
  });
}
function msX_office(t) {
  const sex = msX_sex();
  g.drawImage(msX_r1Bg(), 0, 0);
  // the view: drifting clouds behind the monuments, blinds half drawn
  msX_clip(104, 12, 112, 74);
  g.drawImage(msX_r1View(), 104, 12);
  for (let k = 0; k < 3; k++) { const cxp = ((t * 3 + k * 55) % 170) - 34; g.drawImage(msX_cloud(), 104 + Math.round(cxp), 16 + k * 9); }
  g.drawImage(msX_r1Town(), 104, 12); g.drawImage(msX_blinds(), 104, 12);
  g.restore();
  g.drawImage(msX_r1Fg(sex), 0, 0);
  // clock hands racing through the week
  const hr = t / 8 * Math.PI * 2, mn = t / 0.66 * Math.PI * 2;
  line(56, 34, 56 + Math.round(Math.sin(hr) * 5), 34 - Math.round(Math.cos(hr) * 5), P.K);
  line(56, 34, 56 + Math.round(Math.sin(mn) * 8), 34 - Math.round(Math.cos(mn) * 8), P.K); px(56, 34, P.RD);
  // calendar pages flip
  const day = (t / 1.6 | 0), ph = (t / 1.6) % 1;
  rect(238, 28, 34, 24, P.W); bigText(String(day % 28 + 1), 255 - bigW(String(day % 28 + 1), 2) / 2, 30, 2, P.K);
  if (ph < 0.18) { const k = Math.round(ph / 0.18 * 20); msX_fill([[237, 27], [273, 27], [273 - k, 27 + (20 - k)], [237, 47 - k]], P.G3); line(237, 47 - k, 273 - k, 27 + (20 - k), P.G1); }
  // steam from the mug
  for (let i = 0; i < 8; i++) { const p = (t * 0.5 + i / 8) % 1; px(132 + Math.round(Math.sin(p * 8 + i) * 2), 101 - Math.round(p * 16), p < 0.5 ? P.W : P.G3); }
  // dozing: Zs float up
  for (let i = 0; i < 3; i++) { const p = (t * 0.33 + i / 3) % 1; if (p < 0.85) text('z', 172 + Math.round(p * 10 + Math.sin(p * 6) * 2), 74 - Math.round(p * 34), p < 0.5 ? P.BL : P.BL2); }
}
// ---------- 2: the Agency sends you to the beach ----------
function msX_r2Bg() {
  return sprite('msXr2bg', 320, 200, () => {
    for (let y = 0; y < 86; y++) for (let x = 0; x < 320; x++) { const sd = Math.hypot(x - 262, y - 28); px(x, y, msX_c(x, y, 0.12 + y / 86 * 0.62 + Math.max(0, 0.35 - sd / 90), [P.BL, P.BL2, P.CY, P.W])); }
    // sun
    for (let y = 4; y < 54; y++) for (let x = 238; x < 288; x++) { const d = Math.hypot(x - 262, y - 28); if (d < 22 && d > 12 && BAYER[(y & 3) * 4 + (x & 3)] < (22 - d) * 1.2) px(x, y, P.YE); }
    disc(262, 28, 12, P.YE); disc(261, 27, 8, P.W);
    // distant headland with a white town
    for (let x = 0; x < 120; x++) { const top = Math.round(86 - Math.max(0, 16 * Math.exp(-(((x - 30) / 34) ** 2)) + 7 * Math.exp(-(((x - 84) / 16) ** 2)))); for (let y = top; y < 86; y++) px(x, y, msX_c(x, y, 0.3 + (y - top) * 0.02 + (vnoise(x * 0.3, y * 0.3) - 0.5) * 0.3, [P.BL, P.TL, P.GR])); }
    for (let k = 0; k < 18; k++) { const hx = 12 + (k * 13) % 70, hy = 80 - (k * 7) % 8; rect(hx, hy, 2, 2, P.W); px(hx + 1, hy + 1, P.G3); }
    // sea
    for (let y = 86; y < 136; y++) for (let x = 0; x < 320; x++) px(x, y, msX_c(x, y, (y - 86) / 50 * 0.85 + (vnoise(x * 0.1, y * 0.6) - 0.5) * 0.12, [P.BL, P.BL2, P.TL, P.CY]));
    rect(0, 86, 320, 1, P.BL2);
    // sand
    for (let y = 128; y < 200; y++) for (let x = 0; x < 320; x++) { const wet = y < 138 ? (138 - y) / 10 : 0; px(x, y, msX_c(x, y, 0.52 - wet * 0.35 + (vnoise(x * 0.25, y * 0.4) - 0.5) * 0.25 + (y - 128) * 0.002, [P.BR, P.YE, P.W])); }
    // shells & a starfish
    for (const [sx, sy] of [[110, 152], [150, 188], [284, 186], [26, 170], [132, 170]]) { px(sx, sy, P.W); px(sx + 1, sy, P.PK); }
    msX_str(['..R..', '.RRR.', 'RRRRR', '.R.R.', 'R...R'], { R: P.RD2 }, 146, 166);
    // shade of the umbrella
    msX_spans([[176, 172], [262, 172], [270, 182], [170, 182]], (y, a, b) => { for (let x = a; x < b; x++) { const e = ((x - 219) / 48) ** 2 + ((y - 177) / 6) ** 2; if (e < 1 && BAYER[(y & 3) * 4 + (x & 3)] < 9) px(x, y, P.BR); } });
    msX_spans([[20, 190], [64, 190], [66, 196], [18, 196]], (y, a, b) => { for (let x = a; x < b; x++) if (BAYER[(y & 3) * 4 + (x & 3)] < 6) px(x, y, P.BR); });
  });
}
function msX_r2Fg(sex) {
  return sprite('msXr2fg' + sex, 320, 200, () => {
    // palm trunk, ringed, curving up to the crown
    for (let i = 0; i <= 64; i++) {
      const s_ = i / 64, x = (1 - s_) ** 2 * 40 + 2 * (1 - s_) * s_ * 24 + s_ * s_ * 74, y = (1 - s_) ** 2 * 194 + 2 * (1 - s_) * s_ * 120 + s_ * s_ * 52, rw = 5 - s_ * 2;
      msX_ell(x, y, rw, 2.6, i % 4 === 0 ? [P.K, P.K, P.RD, P.BR] : [P.K, P.RD, P.BR, P.YE], { L: [0.7, -0.4, 0.6], amb: 0.15, dif: 0.85 });
    }
    // beach umbrella
    rect(219, 96, 2, 80, P.W); rect(220, 96, 1, 80, P.G3); rect(218, 174, 4, 2, P.BR);
    for (let y = 76; y < 106; y++) for (let x = 170; x < 270; x++) {
      const nx = (x + 0.5 - 220) / 48, ny = (y + 0.5 - 100) / 23; if (nx * nx + ny * ny > 1 || y > 100 + Math.round(Math.abs(Math.sin((x - 172) / 96 * Math.PI * 4)) * 3) - 1) continue;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), st = Math.floor((Math.asin(Math.max(-1, Math.min(1, nx))) / Math.PI + 0.5) * 8) & 1;
      const v = 0.3 + 0.7 * Math.max(0, nx * 0.5 - ny * 0.6 + nz * 0.6); px(x, y, msX_c(x, y, v, st ? [P.K, P.RD, P.RD2] : [P.G1, P.G3, P.W, P.W]));
    }
    rect(219, 74, 2, 3, P.W);
    // deck chair
    const WD = [P.K, P.BR, P.YE];
    msX_limb(190, 124, 208, 160, 3, 3, WD); msX_limb(208, 160, 252, 166, 3, 3, WD); msX_limb(200, 150, 192, 176, 3, 3, WD); msX_limb(206, 158, 210, 176, 3, 3, WD); msX_limb(248, 164, 250, 178, 3, 3, WD);
    msX_limb(193, 122, 211, 156, 8, 8, [P.BL, P.BL2, P.CY], { amb: 0.3 }); msX_limb(211, 156, 250, 161, 7, 7, [P.BL, P.BL2, P.CY], { amb: 0.35, L: [0, -0.9, 0.4] });
    for (let k = 0; k < 6; k++) { line(195 + k * 3, 120 + k * 6, 191 + k * 3, 124 + k * 6, P.W); line(216 + k * 6, 154, 216 + k * 6, 160, P.W); }
    // Max, soaking up the sun
    const sk = msX_SKIN, hair = msX_hairOf(sex), suit = sex === 'f' ? msX_RED : [P.K, P.BL, P.BL2];
    msX_limb(221, 153, 236, 146, 7, 6, sk, { amb: 0.45, dif: 0.5, edge: P.BR }); msX_limb(236, 146, 252, 157, 6, 5, sk, { amb: 0.45, dif: 0.5, edge: P.BR });
    msX_limb(221, 157, 240, 158, 7, 6, sk, { amb: 0.4, dif: 0.5, edge: P.BR }); msX_limb(240, 158, 254, 161, 6, 5, sk, { amb: 0.4, dif: 0.5, edge: P.BR });
    msX_ell(255, 156, 2, 3, sk, { amb: 0.5 }); msX_ell(256, 160, 2, 3, sk, { amb: 0.5 });
    msX_limb(204, 131, 214, 151, 13, 12, sex === 'f' ? suit : sk, { amb: 0.45, dif: 0.5, edge: sex === 'f' ? P.RD : P.BR });
    msX_limb(214, 150, 221, 155, 12, 11, suit, { amb: 0.3, dif: 0.6 });
    if (sex === 'm') { px(207, 136, P.BR); px(211, 138, P.BR); rect(207, 143, 3, 1, P.BR); }
    msX_limb(205, 129, 196, 120, 4, 4, sk, { amb: 0.5, dif: 0.4, edge: P.BR });
    msX_head(199, 120, 6, { hair, style: sex === 'f' ? 'long' : 'short', sex, eyes: 'shades', mouth: 'smile' });
    msX_limb(212, 135, 222, 141, 4, 4, sk, { amb: 0.5, dif: 0.4, edge: P.BR }); msX_limb(222, 141, 226, 131, 4, 3, sk, { amb: 0.5, dif: 0.4, edge: P.BR });
    // cocktail with a paper umbrella
    msX_fill([[223, 122], [231, 122], [227, 127]], P.CY); msX_fill([[224, 123], [230, 123], [227, 126]], P.RD2); rect(227, 127, 1, 4, P.W); rect(225, 131, 5, 1, P.W);
    line(229, 123, 232, 117, P.YE); msX_fill([[229, 118], [236, 118], [232.5, 114]], P.PK); px(226, 121, P.YE);
    msX_outline(320, 200, P.K);
  });
}
function msX_frond(k) {
  return sprite('msXfrond' + k, 150, 100, () => {
    const cx = 74, cy = 46, sw = (k - 1) * 0.06;
    const fr = [[-2.9, 44, 18], [-2.4, 40, 24], [-1.9, 30, 10], [-1.2, 32, 8], [-0.6, 40, 20], [-0.1, 44, 26], [0.5, 34, 22], [2.6, 36, 26], [3.2, 30, 20]];
    for (const [a0, len, droop] of fr) {
      const a = a0 + sw * (a0 > -1.6 ? 1 : -1), dx = Math.cos(a), dy = Math.sin(a) * 0.6;
      for (let i = 0; i <= 30; i++) {
        const s_ = i / 30, x = cx + dx * len * s_, y = cy + dy * len * s_ + droop * s_ * s_ - 6 * s_ * (1 - s_);
        const lw = Math.round((1 - s_) * 6 + 2);
        for (let j = 1; j <= lw; j++) { px(x - dx * j * 0.5 + (dx > 0 ? -1 : 1) * 0, y + j, j === lw ? P.K : j < 3 ? P.GR2 : P.GR); px(x + (dx > 0 ? -j * 0.4 : j * 0.4), y - j * 0.5, j === lw ? P.GR : P.GR2); }
        px(x, y, P.BR);
      }
    }
    msX_ell(72, 50, 3, 3, [P.K, P.BR, P.YE], { amb: 0.2 }); msX_ell(78, 51, 3, 3, [P.K, P.BR, P.YE], { amb: 0.2 }); msX_ell(75, 54, 3, 3, [P.K, P.BR, P.YE], { amb: 0.2 });
  });
}
function msX_beach(t) {
  g.drawImage(msX_r2Bg(), 0, 0);
  // sun shimmer, drifting clouds, a sail on the horizon
  for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + t * 0.3, r = 15 + ((k + (t * 4 | 0)) % 3) * 2; px(262 + Math.round(Math.cos(a) * r), 28 + Math.round(Math.sin(a) * r), P.W); }
  for (let k = 0; k < 3; k++) g.drawImage(msX_cloud(), Math.round(((t * (2 + k) + k * 130) % 380) - 40), 10 + k * 16);
  const bx = 150 + Math.round(Math.sin(t * 0.07) * 40);
  rect(bx - 5, 84, 11, 2, P.W); rect(bx - 4, 86, 9, 1, P.G1); msX_str(['..W', '.WW', '.WW', 'WWW', 'WWW', 'WWW'], { W: P.W }, bx - 2, 77); rect(bx + 1, 76, 1, 8, P.G1);
  // waves roll in
  for (let k = 0; k < 10; k++) {
    const y = 88 + Math.round(k * k * 0.42), sp = 14 + k * 3, len = 2 + (k >> 1), off = (t * (3 + k * 1.5) + k * 37) % sp;
    for (let x = -sp + off; x < 320; x += sp) rect(Math.round(x + (k & 1) * 5), y, len, 1, k > 5 ? P.W : P.CY);
  }
  // glitter under the sun
  const gs = t * 6 | 0; for (let k = 0; k < 14; k++) { const hx = msX_hash(k, gs), hy = msX_hash(gs, k + 50); px(252 + Math.round(hx * 22), 88 + Math.round(hy * 30), P.W); }
  // surf running up the sand
  const tide = Math.sin(t * 0.8) * 2.5;
  for (let x = 0; x < 320; x += 2) { const y = Math.round(132 + tide + Math.sin(x * 0.06 + t * 0.6) * 1.5); rect(x, y, 2, 1, P.W); if ((x >> 1) & 1) rect(x, y - 1, 2, 1, P.CY); if ((x + (t * 8 | 0)) % 6 === 0) px(x, y + 1, P.W); }
  // a crab scuttling sideways
  const cx = Math.round(128 + Math.sin(t * 0.5) * 22), leg = (t * 8 | 0) & 1;
  msX_str(leg ? ['R.....R', '.RRRRR.', 'RRKRKRR', '.RRRRR.', 'R.R.R.R'] : ['.R...R.', 'RRRRRRR', '.RKRKR.', 'RRRRRRR', '.R.R.R.'], { R: P.RD2, K: P.K }, cx - 3, 160);
  g.drawImage(msX_r2Fg(msX_sex()), 0, 0);
  g.drawImage(msX_frond((t * 1.2 | 0) % 4 === 3 ? 1 : [0, 1, 2][(t * 1.2 | 0) % 4]), 0, 0);
  // gulls
  for (let k = 0; k < 3; k++) {
    const gx = Math.round(((t * (14 + k * 3) + k * 120) % 380) - 30), gy = Math.round(26 + k * 13 + Math.sin(t * 1.5 + k) * 3), up = ((t * 5 + k) | 0) & 1;
    msX_str(up ? ['W.....W', '.W...W.', '..WKW..'] : ['.......', 'WWW.WWW', '...K...'], { W: P.W, K: P.G1 }, gx, gy);
  }
}

// ---------- 3: a casino in Monaco, and company to match ----------
function msX_tux(cx, hy, hair, sex) {
  const J = [P.K, P.K, P.G1, P.G3], sk = { amb: 0.6, dif: 0.4 };
  msX_ell(cx - 12, hy + 19, 6, 5, J, { amb: 0, dif: 0.7 }); msX_ell(cx + 12, hy + 19, 6, 5, J, { amb: 0, dif: 0.5 });
  msX_cyl([[cx - 16, hy + 18], [cx + 16, hy + 18], [cx + 17, hy + 62], [cx - 17, hy + 62]], J, { lx: -0.6, amb: 0, dif: 0.6 });
  msX_fill([[cx - 5, hy + 13], [cx + 5, hy + 13], [cx + 1, hy + 40], [cx - 1, hy + 40]], P.W); rect(cx + 1, hy + 20, 1, 18, P.G3);
  line(cx - 6, hy + 14, cx - 1, hy + 41, P.G3); line(cx + 6, hy + 14, cx + 1, hy + 41, P.G1); line(cx - 7, hy + 15, cx - 2, hy + 41, P.G1);
  msX_str(['KK.KK', 'KKKKK', 'KK.KK'], { K: P.K }, cx - 2, hy + 13); px(cx, hy + 14, P.G1); px(cx, hy + 26, P.K); px(cx, hy + 32, P.K);
  msX_limb(cx - 16, hy + 21, cx - 19, hy + 54, 8, 7, J, { amb: 0, dif: 0.75, edge: P.G1 }); msX_limb(cx + 16, hy + 21, cx + 18, hy + 54, 8, 7, J, { amb: 0, dif: 0.5, edge: P.G1 });
  rect(cx - 22, hy + 56, 6, 2, P.W); rect(cx + 15, hy + 56, 6, 2, P.W);
  msX_ell(cx - 19, hy + 60, 3, 2.5, msX_SKIN, sk); msX_ell(cx + 18, hy + 60, 3, 2.5, msX_SKIN, sk);
  rect(cx + 8, hy + 23, 5, 2, P.W); px(cx + 9, hy + 22, P.W);
  msX_cyl([[cx - 3, hy + 6], [cx + 3, hy + 6], [cx + 3, hy + 13], [cx - 3, hy + 13]], msX_SKIN, { amb: 0.3, dif: 0.5 });
  msX_head(cx, hy, 7, { hair, style: 'short', sex, mouth: 'smile' });
}
function msX_gown(cx, hy, hair, gown, glass) {
  msX_cyl([[cx - 11, hy + 12], [cx + 11, hy + 12], [cx + 12, hy + 22], [cx - 12, hy + 22]], msX_SKIN, { lx: -0.5, amb: 0.5, dif: 0.45 });
  msX_cyl([[cx - 12, hy + 20], [cx + 12, hy + 20], [cx + 15, hy + 62], [cx - 15, hy + 62]], gown, { lx: -0.6, amb: 0.2, dif: 0.75 });
  for (let k = -12; k <= 12; k++) px(cx + k, hy + 20 + Math.round(Math.abs(Math.sin(k / 12 * Math.PI)) * 2), gown[1]);
  for (let k = -5; k <= 5; k += 2) px(cx + k, hy + 15 + Math.round((k * k) / 12), P.W);
  msX_cyl([[cx - 3, hy + 6], [cx + 3, hy + 6], [cx + 3, hy + 13], [cx - 3, hy + 13]], msX_SKIN, { amb: 0.4, dif: 0.5 });
  msX_head(cx, hy, 6, { hair, style: 'up', sex: 'f', mouth: 'smile' });
  const sd = glass;
  msX_limb(cx + 11 * sd, hy + 16, cx + 15 * sd, hy + 36, 5, 4, msX_SKIN, { amb: 0.5, dif: 0.4, edge: P.BR });
  msX_limb(cx + 15 * sd, hy + 36, cx + 11 * sd, hy + 24, 4, 4, msX_SKIN, { amb: 0.55, dif: 0.4, edge: P.BR });
  const gx = cx + 11 * sd; rect(gx - 1, hy + 10, 3, 9, P.CY); rect(gx, hy + 11, 1, 7, P.YE); rect(gx, hy + 19, 1, 4, P.W); rect(gx - 1, hy + 23, 3, 1, P.W); px(gx - 1, hy + 10, P.W);
  msX_ell(gx, hy + 24, 2.5, 2, msX_SKIN, { amb: 0.6 });
  msX_limb(cx - 11 * sd, hy + 16, cx - 16 * sd, hy + 34, 5, 4, msX_SKIN, { amb: 0.45, dif: 0.4, edge: P.BR });
}
function msX_r3Bg(sex) {
  return sprite('msXr3bg' + sex, 320, 200, () => {
    // velvet drapes
    for (let y = 0; y < 124; y++) for (let x = 0; x < 320; x++) { const u = ((x % 18) / 18) * 2 - 1; px(x, y, msX_c(x, y, 0.15 + 0.55 * Math.cos(u * 1.3) - y / 124 * 0.12, msX_RED)); }
    // two arched windows onto the harbour at night
    for (const wx of [26, 236]) {
      const W_ = 58, top = 20, bot = 94;
      for (let y = top - 4; y < bot + 4; y++) for (let x = wx - 4; x < wx + W_ + 4; x++) {
        const cy = top + W_ / 2, inArch = y >= cy || Math.hypot(x + 0.5 - wx - W_ / 2, y + 0.5 - cy) < W_ / 2, inOut = y >= cy - 2 || Math.hypot(x + 0.5 - wx - W_ / 2, y + 0.5 - cy) < W_ / 2 + 4;
        if (!inOut || y > bot + 3) continue;
        if (!inArch || y >= bot || x < wx || x >= wx + W_) { px(x, y, msX_c(x, y, 0.5, msX_GOLD)); continue; }
        const hill = 62 + Math.round(Math.sin((x - wx) * 0.12) * 4 + Math.sin((x - wx) * 0.05) * 5);
        let c = y < hill ? msX_c(x, y, 0.3 - (y - top) * 0.004, [P.K, P.BL]) : y < 74 ? P.K : msX_c(x, y, 0.25, [P.K, P.BL]);
        if (y >= hill && y < 74 && msX_hash(x, y) < 0.06) c = P.YE;
        if (y >= 74 && ((x * 7) % 11 === 0) && ((y + x) & 1)) c = P.YE;
        px(x, y, c);
      }
      rect(wx + W_ / 2 - 1, top, 2, bot - top, P.BR); rect(wx, 60, W_, 2, P.BR); px(wx + 14, 26, P.W); px(wx + 40, 32, P.W); px(wx + 22, 30, P.W);
    }
    // gilded pilasters and frieze
    for (const cx of [0, 110, 210, 320]) { msX_cyl([[cx - 6, 8], [cx + 6, 8], [cx + 6, 124], [cx - 6, 124]], msX_GOLD, { amb: 0.1 }); rect(cx - 2, 16, 1, 100, P.BR); rect(cx + 2, 16, 1, 100, P.BR); rect(cx - 8, 8, 16, 4, P.YE); rect(cx - 8, 11, 16, 1, P.BR); }
    rect(0, 0, 320, 8, P.YE); for (let x = 0; x < 320; x += 4) rect(x, 5, 2, 2, P.BR); rect(0, 7, 320, 1, P.BR);
    // the chandelier
    rect(159, 0, 2, 14, P.BR);
    msX_ell(160, 22, 34, 6, msX_GOLD, { amb: 0.2, test: (x, y) => Math.hypot((x + 0.5 - 160) / 34, (y + 0.5 - 22) / 6) > 0.72 });
    msX_ell(160, 32, 22, 4, msX_GOLD, { amb: 0.2, test: (x, y) => Math.hypot((x + 0.5 - 160) / 22, (y + 0.5 - 32) / 4) > 0.6 });
    for (let k = 0; k < 9; k++) { const a = k / 8 * Math.PI, x = 160 - Math.round(Math.cos(a) * 32), y = 22 + Math.round(Math.sin(a) * 5); rect(x, y - 5, 1, 4, P.W); px(x, y - 6, P.YE); px(x, y - 7, P.W); for (let j = 0; j < 4 + (k & 1) * 3; j++) px(x, y + 2 + j, j & 1 ? P.CY : P.W); }
    for (let k = 0; k < 7; k++) { const a = k / 6 * Math.PI, x = 160 - Math.round(Math.cos(a) * 20), y = 32 + Math.round(Math.sin(a) * 3); for (let j = 0; j < 3 + (k & 1) * 2; j++) px(x, y + 2 + j, j & 1 ? P.CY : P.W); }
    line(160, 14, 128, 22, P.YE); line(160, 14, 192, 22, P.YE); line(160, 14, 142, 32, P.BR); line(160, 14, 178, 32, P.BR);
    for (let j = 0; j < 10; j++) px(160, 34 + j, j & 1 ? P.CY : P.W); msX_ell(160.5, 46, 2, 3, [P.TL, P.CY, P.W], { amb: 0.3 });
    // carpet
    for (let y = 124; y < 200; y++) for (let x = 0; x < 320; x++) { const d = ((x + y * 2) % 16 === 0) || ((x - y * 2 + 640) % 16 === 0); px(x, y, d ? P.BR : msX_c(x, y, 0.3, msX_RED)); }
    // croupier, Max and company, behind the table
    const hair = msX_hairOf(sex);
    // croupier with a rake
    msX_ell(117, 81, 5, 4, [P.K, P.K, P.G1], { amb: 0, dif: 0.7 }); msX_ell(139, 81, 5, 4, [P.K, P.K, P.G1], { amb: 0, dif: 0.5 });
    msX_cyl([[114, 80], [142, 80], [145, 124], [111, 124]], [P.K, P.K, P.G1, P.G3], { lx: -0.6, amb: 0, dif: 0.6 });
    msX_fill([[122, 76], [134, 76], [130, 100], [126, 100]], P.W); msX_str(['KK.KK', 'KKKKK', 'KK.KK'], { K: P.K }, 126, 76);
    msX_cyl([[125, 70], [131, 70], [131, 77], [125, 77]], msX_SKIN, { amb: 0.3 });
    msX_head(128, 64, 6, { hair: P.K, style: 'short', sex: 'm', mouth: 'flat' }); rect(125, 69, 7, 1, P.K);
    msX_limb(140, 84, 149, 102, 7, 6, [P.K, P.K, P.G1, P.G3], { amb: 0, dif: 0.6, edge: P.G1 }); rect(148, 102, 4, 2, P.W); msX_ell(151, 106, 3, 2.5, msX_SKIN, { amb: 0.6 });
    // Max and companion
    if (sex === 'f') { msX_tux(258, 58, P.K, 'm'); msX_gown(214, 60, hair, [P.K, P.BL, P.BL2], -1); }
    else { msX_tux(214, 56, hair, 'm'); msX_gown(256, 62, P.YE, msX_RED, 1); }
    // the roulette table
    for (let y = 108; y < 200; y++) for (let x = 0; x < 320; x++) {
      const e = Math.hypot((x + 0.5 - 160) / 158, (y + 0.5 - 164) / 50); if (e > 1) continue;
      if (e > 0.93) px(x, y, msX_c(x, y, 0.35 + (y < 164 ? 0.3 * (1 - (e - 0.93) / 0.07) : 0) + (e < 0.95 ? -0.2 : 0), msX_WOOD));
      else px(x, y, msX_c(x, y, 0.5 + (1 - e) * 0.35 + (vnoise(x * 0.2, y * 0.2) - 0.5) * 0.08, msX_GRN));
    }
    line(150, 104, 176, 138, P.BR); line(151, 104, 177, 138, P.YE); rect(172, 137, 10, 2, P.BR);
    // betting layout in perspective
    for (let y = 132; y < 176; y++) for (let x = 130; x < 312; x++) {
      const v = (y - 132) / 44, lft = 170 - 26 * v, rgt = 286 + 20 * v, u = (x - lft) / (rgt - lft); if (u < 0 || u > 1) continue;
      const cu = u * 13, cv = v * 3, fu = cu - Math.floor(cu), fv = cv - Math.floor(cv), cellW = (rgt - lft) / 13;
      if (fu * cellW < 1 || fv * 44 / 3 < 1) { px(x, y, P.W); continue; }
      const col = Math.floor(cu), row = Math.floor(cv), n = col * 3 + row;
      if (col === 0) { if (Math.abs(fu - 0.5) < 0.3 && Math.abs(fv - 0.5) < 0.25) px(x, y, P.GR2); continue; }
      if (Math.abs(fu - 0.5) < 0.24 && Math.abs(fv - 0.5) < 0.2) px(x, y, (n * 7 % 5) & 1 ? P.RD : P.K);
    }
    // chip stacks
    const chip = (x, y, n, c) => { for (let j = 0; j < n; j++) { msX_ell(x, y - j * 2, 4, 1.8, msX_rampOf(c), { amb: 0.4, L: [-0.3, -0.9, 0.3] }); px(x - 3, y - j * 2 + 1, P.W); px(x + 2, y - j * 2 + 1, P.W); } };
    chip(206, 136, 5, P.RD2); chip(216, 134, 3, P.BL2); chip(226, 137, 7, P.YE); chip(248, 150, 2, P.W); chip(196, 160, 3, P.RD2); chip(274, 146, 4, P.GR2); chip(232, 158, 2, P.BL2);
    // the wheel's bowl
    for (let y = 126; y < 172; y++) for (let x = 36; x < 130; x++) {
      const e = Math.hypot((x + 0.5 - 82) / 44, (y + 0.5 - 148) / 18); if (e > 1) continue;
      if (e > 0.86) px(x, y, msX_c(x, y, 0.4 + (y < 148 ? 0.45 : -0.1) * (e - 0.86) / 0.14, msX_WOOD));
      else if (e > 0.64) px(x, y, msX_c(x, y, 0.2 + (y > 148 ? 0.25 : 0.05), msX_WOOD));
      else px(x, y, e > 0.42 ? P.K : msX_c(x, y, 0.4 + (1 - e) * 0.4, msX_WOOD));
    }
  });
}
function msX_casino(t) {
  const sex = msX_sex();
  g.drawImage(msX_r3Bg(sex), 0, 0);
  // harbour lights twinkle, crystals sparkle
  const st = t * 5 | 0;
  for (let k = 0; k < 6; k++) { const wx = (k & 1 ? 236 : 26) + Math.round(msX_hash(k, st) * 56), wy = 64 + Math.round(msX_hash(st, k) * 8); px(wx, wy, P.W); }
  for (let k = 0; k < 5; k++) { const a = msX_hash(k, st + 99) * Math.PI, sx = 160 - Math.round(Math.cos(a) * 32), sy = 22 + Math.round(Math.sin(a) * 5) + 3 + Math.round(msX_hash(st, k + 7) * 3); px(sx, sy, P.W); px(sx - 1, sy, P.CY); px(sx + 1, sy, P.CY); px(sx, sy - 1, P.CY); px(sx, sy + 1, P.CY); }
  // champagne bubbles & an earring glint
  const gx = sex === 'f' ? 203 : 267, gy = sex === 'f' ? 70 : 72;
  for (let k = 0; k < 3; k++) px(gx, gy + 7 - ((t * 6 + k * 3) | 0) % 8, P.W);
  if ((t % 2.3) < 0.2) { const ex = sex === 'f' ? 220 : 262, ey = sex === 'f' ? 61 : 63; px(ex, ey, P.W); px(ex - 1, ey, P.CY); px(ex + 1, ey, P.CY); px(ex, ey - 1, P.CY); px(ex, ey + 1, P.CY); }
  // the wheel spins, the ball races the other way
  const rot = t * 1.6, cx = 82, cy = 148;
  for (let k = 0; k < 37; k++) {
    const a = k / 37 * Math.PI * 2 + rot, x = cx + Math.cos(a) * 44 * 0.53, y = cy + Math.sin(a) * 18 * 0.53;
    rect(Math.round(x) - 1, Math.round(y) - 1, 3, 2, k === 0 ? P.GR2 : k & 1 ? P.RD : P.K); px(Math.round(x + Math.cos(a) * 4), Math.round(y + Math.sin(a) * 1.6), P.G3);
  }
  msX_ringRotor(cx, cy, rot);
  const ba = -t * 2.7, br = 0.75 - Math.max(0, Math.sin(t * 0.4)) * 0.18;
  const bx = Math.round(cx + Math.cos(ba) * 44 * br), by = Math.round(cy + Math.sin(ba) * 18 * br);
  rect(bx, by - 1, 2, 2, P.W); px(bx + 1, by, P.G3);
}
function msX_ringRotor(cx, cy, rot) {
  for (let k = 0; k < 4; k++) { const a = rot + k * Math.PI / 2; line(cx, cy - 3, Math.round(cx + Math.cos(a) * 12), Math.round(cy - 3 + Math.sin(a) * 5), P.YE); }
  rect(cx - 2, cy - 6, 4, 6, P.YE); rect(cx - 1, cy - 8, 2, 2, P.W); rect(cx - 3, cy - 1, 6, 2, P.BR);
}

function rewardArt(i, x, y, w, h, t) {
  msX_clip(x, y, w, h); rect(x, y, w, h, P.K); g.translate(x | 0, y | 0);
  ([msX_laundry, msX_office, msX_beach, msX_casino][i] || msX_office)(t || 0);
  g.restore();
}
