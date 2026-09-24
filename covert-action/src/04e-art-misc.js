// ===================================================================
// ART 04e: interrogation room, Max's capture cell, vacation postcards
// Everything here is painted on the FINE grid (RES x layout) into cached
// art() layers; only small moving parts are drawn per frame with fine().
// Top-level names are prefixed msX_.
// ===================================================================

// ---------- toolkit (all coordinates in fine pixels on the current g) ----------
// A fine pixel shows 1.2x taller than wide (320x200 on a 4:3 screen): round things use ry = rx / msX_AS.
const msX_AS = 1.2;
const msX_rgb = c => hexRGB(c);
const msX_hex = (r, gg, b) => '#' + [r, gg, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const msX_ss = (a, b, t) => { t = (t - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
const msX_gs = (d2) => Math.exp(-d2);
const msX_H = (a, b) => { let n = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const msX_sexNow = () => (typeof game !== 'undefined' && game.agent && game.agent.sex) || 'm';
// scanline spans of a polygon
function msX_spn(pts, cb) {
  let y0 = 1e9, y1 = -1e9; for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    const sy = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) xs.push(a[0] + (sy - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]); if (xb > xa) cb(y, xa, xb); }
  }
}
function msX_poly(pts, c) { g.fillStyle = c; msX_spn(pts, (y, a, b) => g.fillRect(a, y, b - a, 1)); }
// crisp ellipse (no anti-aliasing)
function msX_ov(cx, cy, rx, ry, c) {
  g.fillStyle = c;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const d = (y + 0.5 - cy) / ry; if (d * d >= 1) continue; const hw = rx * Math.sqrt(1 - d * d);
    const a = Math.round(cx - hw), b = Math.round(cx + hw); if (b > a) g.fillRect(a, y, b - a, 1);
  }
}
// a thick line as a quad with round-ish caps
function msX_ln(x0, y0, x1, y1, w, c) {
  const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2;
  if (w <= 1.01) { line(x0, y0, x1, y1, c); return; }
  msX_poly([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], c);
}
// quadratic curve as a chain of thick segments
function msX_crv(x0, y0, cx, cy, x1, y1, w, c, n = 12) {
  let px0 = x0, py0 = y0;
  for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t, x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1; if (w <= 1.01) line(px0, py0, x, y, c); else msX_ln(px0, py0, x, y, w, c); px0 = x; py0 = y; }
}
// offscreen layer in fine pixels
function msX_lay(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; drawTo(x, fn); return c; }
// paint only onto what is already there (shading inside a silhouette)
function msX_atop(fn) { g.save(); g.globalCompositeOperation = 'source-atop'; try { fn(); } finally { g.restore(); } }
function msX_alpha(a, fn) { g.save(); g.globalAlpha = a; try { fn(); } finally { g.restore(); } }
// banded glow: n stepped ellipses, each adding a/n of colour c
function msX_glow(cx, cy, rx, ry, c, a, n = 6, mode = 'lighter') {
  g.save(); g.globalCompositeOperation = mode; g.globalAlpha = a / n;
  for (let i = 0; i < n; i++) { const k = 1 - i / n; msX_ov(cx, cy, rx * k, ry * k, c); }
  g.restore();
}
// selective outline on a layer: silhouette-edge pixels get a darker (shadow side) or lighter (lit side) tint of their own colour
function msX_edge(w, h, o = {}) {
  const im = g.getImageData(0, 0, w, h), d = im.data, A = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3];
  const lx = o.lx ?? -1, ly = o.ly ?? -1, dk = o.dark ?? 0.45, lt = o.light ?? 0, cool = o.cool ?? [18, 16, 40];
  const out = new Uint8ClampedArray(d);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (d[i + 3] < 128) continue;
    const ex = (A(x + 1, y) < 128 ? 1 : 0) - (A(x - 1, y) < 128 ? 1 : 0), ey = (A(x, y + 1) < 128 ? 1 : 0) - (A(x, y - 1) < 128 ? 1 : 0);
    if (!ex && !ey && A(x + 1, y) >= 128 && A(x - 1, y) >= 128 && A(x, y + 1) >= 128 && A(x, y - 1) >= 128) continue;
    const facing = ex * lx + ey * ly; // >0: edge faces the light
    if (facing > 0 && lt > 0) { for (let k = 0; k < 3; k++) out[i + k] = d[i + k] + (255 - d[i + k]) * lt; }
    else if (facing <= 0) { for (let k = 0; k < 3; k++) out[i + k] = d[i + k] * (1 - dk) + cool[k] * dk; }
  }
  im.data.set(out); g.putImageData(im, 0, 0);
}
// per-pixel light pass over a region of the current canvas: fn(x, y) -> [r, g, b] multipliers (1 = unchanged)
function msX_light(x0, y0, w, h, fn) {
  const im = g.getImageData(x0, y0, w, h), d = im.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (!d[i + 3]) continue; const m = fn(x + x0, y + y0);
    d[i] = Math.min(255, d[i] * m[0]); d[i + 1] = Math.min(255, d[i + 1] * m[1]); d[i + 2] = Math.min(255, d[i + 2] * m[2]);
  }
  g.putImageData(im, x0, y0);
}
// banded vertical gradient in fine pixels (n steps)
function msX_bands(x, y, w, h, cols, n) {
  for (let i = 0; i < n; i++) { const t = i / (n - 1), k = t * (cols.length - 1), j = Math.min(cols.length - 2, Math.floor(k)); const y0 = Math.round(y + h * i / n), y1 = Math.round(y + h * (i + 1) / n); rect(x, y0, w, y1 - y0, mix(cols[j], cols[j + 1], Math.round((k - j) * 16) / 16)); }
}
// pick from a ramp for a lighting value 0..1 (clean bands, no dither)
const msX_rp = (r, v) => r[Math.max(0, Math.min(r.length - 1, Math.round(v * (r.length - 1))))];
// shaded ellipsoid with clean bands
function msX_ball(cx, cy, rx, ry, r, L = [-0.5, -0.6, 0.62], amb = 0.12, dif = 0.95, test) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, q = nx * nx + ny * ny; if (q >= 1) continue; if (test && !test(x, y)) continue;
    const nz = Math.sqrt(1 - q); px(x, y, msX_rp(r, amb + dif * Math.max(0, nx * L[0] + ny * L[1] + nz * L[2])));
  }
}
// a polygon shaded as a vertical cylinder in clean bands (sleeves, bottles, torsos)
function msX_cyl(pts, r, lx = -0.6, amb = 0.15, dif = 0.9) {
  const lz = Math.sqrt(1 - lx * lx);
  msX_spn(pts, (y, a, b) => { for (let x = a; x < b; x++) { const u = (x + 0.5 - a) / (b - a) * 2 - 1; px(x, y, msX_rp(r, amb + dif * Math.max(0, u * lx + Math.sqrt(Math.max(0, 1 - u * u)) * lz))); } });
}
// a limb (tapered capsule) shaded across its axis
function msX_limb(x0, y0, x1, y1, w0, w1, r, L = [-0.6, -0.5, 0.62], amb = 0.15) {
  const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1, len = Math.sqrt(len2), nx = -dy / len, ny = dx / len, m = Math.max(w0, w1) / 2 + 1;
  for (let y = Math.floor(Math.min(y0, y1) - m); y <= Math.ceil(Math.max(y0, y1) + m); y++) for (let x = Math.floor(Math.min(x0, x1) - m); x <= Math.ceil(Math.max(x0, x1) + m); x++) {
    const qx = x + 0.5 - x0, qy = y + 0.5 - y0; let s = (qx * dx + qy * dy) / len2; s = s < 0 ? 0 : s > 1 ? 1 : s;
    const hw = (w0 + (w1 - w0) * s) / 2, ex = qx - dx * s, ey = qy - dy * s; if (ex * ex + ey * ey > hw * hw) continue;
    const u = (ex * nx + ey * ny) / hw, nz = Math.sqrt(Math.max(0, 1 - u * u));
    px(x, y, msX_rp(r, amb + (1 - amb) * Math.max(0, nx * u * L[0] + ny * u * L[1] + nz * L[2])));
  }
}

// ---------- palettes (hue-shifted ramps, dark -> light) ----------
const msX_SKIN = {
  l: ['#3b1a2c', '#6e3037', '#a4524a', '#d27f64', '#eeaa86', '#fdd2ad', '#fff0dc'],
  d: ['#22111f', '#452028', '#6d3a30', '#98603f', '#bf8754', '#dcac74', '#f3d3a2'],
};
const msX_HAIR = {
  '#000000': ['#07060c', '#100e1a', '#1b192b', '#2b2a42', '#46476a'],
  '#AA5500': ['#1c0e14', '#3a1c16', '#5f3220', '#8a502c', '#b5773e'],
  '#FFFF55': ['#4a2e1c', '#8a5c2a', '#c49440', '#e8c466', '#fff0a8'],
  '#AAAAAA': ['#34344a', '#5e6072', '#8e909e', '#bfc0c8', '#ececf0'],
  '#555555': ['#15151f', '#2a2a38', '#474858', '#6c6e80', '#9698a8'],
};
const msX_hairRamp = c => msX_HAIR[String(c).toUpperCase()] || msX_HAIR['#AA5500'];
// cloth ramps for the EGA jacket/tie colours the model hands out
const msX_CLOTH = {
  '#555555': ['#12121c', '#22232f', '#353847', '#4d5263', '#6b7285'],
  '#AA5500': ['#1c0f12', '#3a1f1a', '#5c3424', '#83502f', '#a8703e'],
  '#0000AA': ['#0a0c22', '#141b44', '#223068', '#344a8e', '#4d68b0'],
  '#000000': ['#07070d', '#101019', '#1b1c28', '#2b2d3d', '#434659'],
  '#AAAAAA': ['#2b2d3a', '#4a4e5e', '#6e7384', '#959aa8', '#bcc0ca'],
  '#00AA00': ['#0b1612', '#16291e', '#23402c', '#35593a', '#4f774b'],
  '#AA0000': ['#1e0a14', '#40121c', '#681c24', '#92302e', '#bc4a3c'],
};
const msX_clothRamp = c => msX_CLOTH[String(c).toUpperCase()] || msX_CLOTH['#555555'];
const msX_IRIS = ['#4a2a18', '#35607e', '#4c6a3a', '#3a2412'];

// ===================================================================
// FACE ENGINE: a lit height-field head with hand-placed features
// o: { S (half head width, fine px), sex, skin ('l'|'d' or EGA colour), hair (EGA), style 0-5, beard 0-2, glasses 0-2, hat,
//      jaw 0-2, gaze -1..1, expr ('calm'|'nervous'|'squint'|'smug'|'sleep'|'smile'|'grin'), L (light), amb, rim {dir,col},
//      stubble, scar, iris, cig }
// draws with the eye line at (cx, cy); returns nothing
// ===================================================================
function msX_face(cx, cy, o) {
  const S = o.S, SY = S / msX_AS, fem = o.sex === 'f';
  const skin = typeof o.skin === 'string' && o.skin.length > 1 && o.skin[0] === '#' ? (o.skin.toUpperCase() === '#AA5500' ? 'd' : 'l') : (o.skin || 'l');
  const SK = msX_SKIN[skin], HR = msX_hairRamp(o.hair || '#AA5500');
  let L = o.L || [-0.35, -0.55, 0.76]; { const n = Math.hypot(L[0], L[1], L[2]); L = [L[0] / n, L[1] / n, L[2] / n]; }
  const amb = o.amb ?? 0.14, dif = o.dif ?? 0.92;
  const jawW = [0.72, 0.8, 0.9][o.jaw ?? 1] - (fem ? 0.06 : 0), style = o.style ?? (fem ? 4 : 0), ex = o.expr || 'calm';
  // head outline half-width at height y (units of S; eye line y=0, skull top -1.25, chin 1.35)
  const hw = y => {
    if (y < -1.25 || y > 1.35) return 0;
    if (y <= 0.1) return Math.sqrt(Math.max(0, 1 - ((y - 0.1) / 1.35) ** 2));
    if (y <= 0.92) return 1 + (jawW - 1) * msX_ss(0.1, 0.92, y) - (fem ? 0.04 * msX_ss(0.3, 0.9, y) : 0);
    const t = (y - 0.92) / 0.43; return (jawW * (1 - t) + (fem ? 0.3 : 0.38) * t) * Math.sqrt(Math.max(0, 1 - t ** 4));
  };
  const G = (x, y, ax, ay, sx, sy) => msX_gs(((x - ax) / sx) ** 2 + ((y - ay) / sy) ** 2);
  // three-quarter turn: features slide towards one side and the far half compresses
  const TN = o.turn || 0, T = TN * 0.24, FX = (s, b) => T + s * b * (1 - s * TN * 0.3), XQ = x => { const f = x - T; return f / (1 - Math.sign(f) * TN * 0.3); };
  const ht = (x0_, y) => {
    const w = hw(y); if (w <= 0 || Math.abs(x0_) >= w) return -1;
    const x = XQ(x0_), ax = Math.abs(x);
    let h = Math.sqrt(1 - (x0_ / w) ** 2) * 0.95;
    h += 0.10 * msX_gs(((y + 0.24) / 0.1) ** 2) * msX_ss(0.85, 0.5, ax);          // brow ridge
    h -= 0.13 * G(ax, y, 0.4, 0.0, 0.2, 0.13);                                         // eye sockets
    const nz = msX_ss(-0.2, 0.44, y) * msX_ss(0.56, 0.47, y);                          // nose
    h += 0.30 * msX_gs((x / (0.09 + 0.05 * msX_ss(0, 0.45, y))) ** 2) * nz;
    h += 0.06 * G(x, y, 0, 0.43, 0.14, 0.08);                                          // nose tip
    h += 0.07 * G(ax, y, 0.14, 0.46, 0.08, 0.07);                                      // nostril wings
    h += 0.06 * G(ax, y, 0.55, 0.3, 0.2, 0.15);                                        // cheekbones
    h += 0.09 * G(x, y, 0, 0.84, 0.32, 0.17);                                          // muzzle
    h += 0.03 * G(x, y, 0, 0.93, 0.18, 0.05);                                          // lower lip
    h -= 0.03 * G(x, y, 0, 1.04, 0.16, 0.05);                                          // under-lip dent
    h += 0.07 * G(x, y, 0, 1.2, 0.24, 0.12);                                           // chin
    return h;
  };
  const x0 = Math.floor(cx - S * 1.05), x1 = Math.ceil(cx + S * 1.05), y0 = Math.floor(cy - 1.3 * SY), y1 = Math.ceil(cy + 1.4 * SY);
  const e = 0.03;
  // neck (behind the head) — shaded cylinder, dark under the jaw
  const nw = S * (fem ? 0.46 : 0.58), ny0 = cy + 0.7 * SY, ny1 = cy + (o.neck ?? 1.9) * SY;
  for (let y = Math.floor(ny0); y < ny1; y++) for (let x = Math.floor(cx - nw); x < cx + nw; x++) {
    const u = (x + 0.5 - cx) / nw, yy = (y + 0.5 - cy) / SY, jaw = 1.35 - 0.5 * u * u + (-L[1]) * 0.45, jawSh = yy < jaw ? 0.62 : 0.12;
    px(x, y, msX_rp(SK, Math.min(0.5, amb + dif * 0.75 * Math.max(0, u * L[0] + Math.sqrt(1 - Math.min(1, u * u)) * 0.7)) * (1 - jawSh)));
  }
  // ears
  for (const s of [-1, 1]) {
    if (s * TN > 0.3) continue;
    const ecx = cx + s * S * (0.98 - Math.abs(TN) * 0.05) - TN * S * 0.06, ecy = cy + 0.2 * SY, erx = S * 0.16, ery = SY * 0.34;
    for (let y = Math.floor(ecy - ery); y <= ecy + ery; y++) for (let x = Math.floor(ecx - erx); x <= ecx + erx; x++) {
      const u = (x + 0.5 - ecx) / erx, v = (y + 0.5 - ecy) / ery; if (u * u + v * v >= 1) continue;
      const inner = (u * s < 0.35 && u * u + v * v < 0.45);
      px(x, y, msX_rp(SK, (amb + dif * Math.max(0, s * L[0] * 0.8 + 0.3 * L[2] - v * L[1] * 0.3)) * (inner ? 0.55 : 0.9)));
    }
  }
  // skin
  const sh = new Map();
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    const x = (X + 0.5 - cx) / S, y = (Y + 0.5 - cy) / SY, h = ht(x, y); if (h < 0) continue;
    let nx = -(ht(x + e, y) - ht(x - e, y)) / (2 * e), ny = -(ht(x, y + e) - ht(x, y - e)) / (2 * e);
    if (!(isFinite(nx) && isFinite(ny)) || ht(x + e, y) < 0 || ht(x - e, y) < 0) nx = x / Math.max(0.2, hw(y)) * 4;
    if (ht(x, y + e) < 0 || ht(x, y - e) < 0) ny = ny || 0;
    const nn = Math.hypot(nx, ny, 1); nx /= nn; ny /= nn; const nz = 1 / nn;
    // cast shadow: march towards the light over the height field
    let lit = 1;
    for (let k = 1; k <= 14; k++) { const s = k * 0.03, hx = ht(x + L[0] * s, y + L[1] * s); if (hx > h + L[2] * s * 1.0 + 0.012) { lit = 0.18; break; } }
    let v = amb + dif * Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]) * lit;
    if (o.rim) { const r = o.rim.dir, rr = nx * r[0] + ny * r[1]; if (rr > 0.55 && nz < 0.75) v = Math.max(v, 0.5 + (rr - 0.55)); }
    if (fem) v += 0.02;
    let c = msX_rp(SK, v * 0.93);
    if (o.stubble) { const ax = Math.abs(XQ(x)), edge = 0.5 + 0.25 * (1 - ax) ** 2, bz = y > edge && !(ax < 0.2 && y > 0.76 && y < 0.97) && !(ax < 0.12 && y < 0.62); if (bz) { const k = y > edge + 0.1 ? 1 : 0.5, q = msX_rgb(c); c = msX_hex(q[0] * (1 - 0.3 * k), q[1] * (1 - 0.27 * k), q[2] * (1 - 0.12 * k)); } }
    px(X, Y, c); sh.set(X + ',' + Y, v);
  }
  // cheeks: soft warm flush (a banded blend, no noise)
  if (fem || o.flush) for (const s of [-1, 1]) msX_alpha(0.1, () => msX_ov(cx + FX(s, 0.52) * S, cy + 0.42 * SY, S * 0.2, SY * 0.12, '#e0506a'));
  const LX = Math.sign(L[0]) || -1; // which side is lit
  // ----- eyes -----
  const eyeY = Math.round(cy), eW0 = Math.max(2, Math.round(S * 0.2)), eH = Math.max(S >= 14 ? 2 : 1, Math.round(SY * 0.09));
  const iris = o.iris || msX_IRIS[(o.irisN ?? 0) % msX_IRIS.length], gz = o.gaze ?? 0;
  for (const s of [-1, 1]) {
    const ecx = Math.round(cx + FX(s, 0.4) * S), lit = s === LX, eW = Math.max(2, Math.round(eW0 * (1 - s * TN * 0.3)));
    let mode = ex === 'sleep' ? 'shut' : ex === 'squint' && s === -1 ? 'shut' : ex === 'smug' ? 'half' : ex === 'suave' ? 'lid' : ex === 'smile' || ex === 'grin' ? 'happy' : 'open';
    if (o.blink) mode = 'shut';
    const wide = (ex === 'squint' && s === 1) || ex === 'nervous' || ex === 'shock';
    const hH = eH + (wide ? 1 : 0);
    if (mode === 'shut' || mode === 'happy') {
      // closed lid: a curved dark line with a lighter lid above
      const up = mode === 'happy' ? -1 : 1;
      for (let i = -eW; i <= eW; i++) { const yy = eyeY + Math.round(up * (1 - (i / eW) ** 2) * Math.max(1, hH * 0.6)) * (mode === 'happy' ? 1 : 0.5); px(ecx + i, Math.round(yy), SK[0]); if (S > 16) px(ecx + i, Math.round(yy) - 1, SK[2]); }
      if (ex === 'squint' && s === -1 && S > 14) { // screwed-up eye: creases
        line(ecx - eW - 2, eyeY - 2, ecx - eW, eyeY, SK[1]); line(ecx + eW, eyeY + 2, ecx + eW + 2, eyeY + 3, SK[1]); line(ecx - eW, eyeY + 2, ecx + eW - 1, eyeY + 3, SK[1]);
      }
      continue;
    }
    // almond of eye white
    const top = mode === 'half' ? 0.15 : mode === 'lid' ? 0.6 : 1;
    for (let i = -eW; i <= eW; i++) {
      const f = 1 - (i / (eW + 0.5)) ** 2, a = Math.round(hH * f * top * 0.7), b = Math.round(hH * f * 0.55);
      for (let j = -a; j <= b; j++) px(ecx + i, eyeY + j, j <= -a + (S > 18 ? 1 : 0) ? '#a89088' : lit ? '#eadfd4' : '#cdbcb2');
    }
    // iris + pupil + glint
    const ir = Math.max(1, Math.round(eW * 0.5)), icx = ecx + Math.round(gz * eW * 0.45);
    for (let j = -hH; j <= hH; j++) for (let i = -ir; i <= ir; i++) {
      if (i * i + (j * msX_AS) ** 2 > ir * ir + 0.6) continue;
      const f = 1 - ((icx + i - ecx) / (eW + 0.5)) ** 2; const a = Math.round(hH * f * top * 0.7), b = Math.round(hH * f * 0.55);
      if (j < -a || j > b) continue;
      const pup = i * i + (j * msX_AS) ** 2 <= (ir * 0.45) ** 2 + 0.3;
      px(icx + i, eyeY + j, pup ? '#0d0b12' : j < 0 ? mix(iris, '#000000', 0.35) : iris);
    }
    if (S >= 10) px(icx - 1 * (LX < 0 ? 1 : -1) * (ir > 1 ? 1 : 0), eyeY - (hH > 1 ? 1 : 0), '#ffffff');
    // upper lid line (heavy) and lower lid (soft)
    for (let i = -eW - 1; i <= eW; i++) { const f = 1 - (i / (eW + 0.5)) ** 2, a = Math.round(hH * Math.max(0, f) * top * 0.7); px(ecx + i, eyeY - a - 1, S < 22 && Math.abs(i) > eW - 1 ? SK[1] : SK[0]); if (S > 18 && Math.abs(i) < eW) px(ecx + i, eyeY - a - 2, mix(SK[1], SK[2], 0.5)); }
    if (fem && S > 14) { px(ecx + s * (eW + 1), eyeY - hH - 1, SK[0]); if (S > 18) px(ecx + s * (eW + 2), eyeY - hH - 2, SK[0]); }
    if (S > 14) for (let i = -eW + 1; i < eW; i++) { const f = 1 - (i / (eW + 0.5)) ** 2; px(ecx + i, eyeY + Math.round(hH * f * 0.55) + 1, mix(SK[2], SK[1], 0.5)); }
    if (ex === 'squint' && s === 1 && S > 14) { // the good eye bulges: bags underneath
      for (let i = -eW; i <= eW; i++) px(ecx + i, eyeY + hH + 2 + Math.round((i / eW) ** 2), SK[1]);
    }
  }
  // ----- brows -----
  const HD = mix(HR[0], HR[1], 0.5);
  for (const s of [-1, 1]) {
    const bx = cx + FX(s, 0.4) * S, by = cy - SY * 0.26, bw = S * 0.28 * (1 - s * TN * 0.3), th = Math.max(1, Math.round(S * (fem ? 0.05 : 0.085)));
    const lift = ex === 'nervous' ? 0.1 : ex === 'squint' ? (s === -1 ? -0.06 : 0.09) : ex === 'smug' || ex === 'suave' ? (s === 1 ? 0.07 : 0) : ex === 'angry' ? 0 : 0;
    const tilt = ex === 'nervous' ? 0.12 : ex === 'angry' || (ex === 'squint' && s === -1) ? -0.14 : 0; // + raises the inner end
    for (let i = -bw; i <= bw; i++) {
      const t = i * s / bw, arch = (1 - t * t) * 0.07 + (fem ? 0.03 : 0), yy = by - SY * (lift + arch + tilt * (-t) * 0.5);
      const tk = th - (t > 0.6 ? 1 : 0); for (let k = 0; k < Math.max(1, tk); k++) px(Math.round(bx + i), Math.round(yy) + k, k === 0 && S > 16 ? HD : HR[0]);
    }
  }
  // ----- nose: nostrils and the lit wing -----
  { const nyy = Math.round(cy + SY * 0.5), nx0 = Math.round(S * 0.12), NC = Math.round(cx + T * S * 1.25);
    px(NC - nx0, nyy, SK[0]); px(NC + nx0 - 1, nyy, SK[0]);
    if (S > 16) { px(NC - nx0 + 1, nyy, SK[1]); px(NC + nx0 - 2, nyy, SK[1]); const hlx = Math.round(cx + T * S * 1.1 + LX * S * 0.04); px(hlx, Math.round(cy + SY * 0.36), SK[5]); px(hlx, Math.round(cy + SY * 0.3), SK[4]); }
  }
  // ----- mouth -----
  { const my = Math.round(cy + SY * 0.83), mw = Math.round(S * (fem ? 0.28 : 0.32)), lip = fem ? ['#6e1f33', '#a8303f', '#d04a55', '#f08a8a'] : [SK[0], mix(SK[1], '#903040', 0.3), mix(SK[2], '#b04a50', 0.25), SK[3]];
    const X = Math.round(cx + T * S * 1.1);
    if (ex === 'grin' || ex === 'smile' || ex === 'charm') {
      for (let i = -mw; i <= mw; i++) { const t = i / mw, yy = my - Math.round((t * t) * SY * 0.12) + (ex === 'grin' ? 0 : 0); px(X + i, yy, lip[0]); if (ex === 'grin' && Math.abs(t) < 0.75) { px(X + i, yy + 1, '#f4efe6'); px(X + i, yy + 2, Math.abs(t) < 0.6 ? lip[0] : lip[1]); } else if (S > 14) px(X + i, yy + 1, lip[2]); }
    } else if (ex === 'sleep' || ex === 'shock') {
      const r = Math.max(1, Math.round(S * 0.09)); msX_ov(X, my, r + 0.6, r / msX_AS + 0.8, lip[0]); if (S > 14) px(X, my - 1, lip[1]);
    } else {
      const smirk = ex === 'smug' || ex === 'squint' || ex === 'suave' ? 1 : 0, down = ex === 'nervous' ? 1 : 0;
      if (S > 14) { for (let i = -mw + 1; i < mw; i++) px(X + i, my - 1, lip[1]); for (let i = -mw + 2; i < mw - 1; i++) { px(X + i, my + 1, lip[2]); if (S > 20) px(X + i, my + 2, Math.abs(i) < mw * 0.5 ? lip[3] : lip[2]); } }
      for (let i = -mw; i <= mw; i++) { const t = i / mw; let yy = my + (down ? Math.round(t * t * 1.5) : 0) - (smirk && t > 0.3 ? Math.round((t - 0.3) * 3) : 0); px(X + i, yy, lip[0]); }
      if (fem && S <= 14) { px(X, my + 1, lip[2]); px(X - 1, my + 1, lip[2]); }
    }
  }
  // ----- beard / moustache -----
  if (o.beard === 1 || o.beard === 2) {
    for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
      const x = (X + 0.5 - cx) / S, y = (Y + 0.5 - cy) / SY, w = hw(y); if (w <= 0 || Math.abs(x) >= w) continue;
      const ax = Math.abs(XQ(x));
      const mous = y > 0.6 && y < 0.78 - ax * 0.12 && ax < 0.36 + (y - 0.6) * 0.4;
      const full = o.beard === 2 && y > 0.25 + ax * 0.0 && (ax > w - 0.22 || y > 0.62) && !(ax < 0.25 && y > 0.78 && y < 0.95);
      if (!(mous || full)) continue;
      const v = sh.get(X + ',' + Y) ?? 0.4; px(X, Y, msX_rp(HR, Math.min(0.95, v * 0.8)));
    }
  }
  if (o.folds && S > 16) for (const s2 of [-1, 1]) { msX_crv(cx + FX(s2, 0.22) * S, cy + SY * 0.5, cx + FX(s2, 0.44) * S, cy + SY * 0.62, cx + FX(s2, 0.4) * S, cy + SY * 0.95, 1, s2 === LX ? SK[2] : SK[1], 8); }
  if (o.gold) { const my = Math.round(cy + SY * 0.83); px(Math.round(cx + S * 0.14), my + 1, '#ffd24a'); px(Math.round(cx + S * 0.14) + 1, my + 1, '#b8862a'); }
  if (o.scar && S > 16) { const sx = Math.round(cx + S * 0.62), sy = Math.round(cy - SY * 0.1); for (let k = 0; k < Math.round(SY * 0.5); k++) { px(sx - (k >> 2), sy + k, k % 3 === 1 ? SK[5] : SK[1]); } }
  // ----- hair -----
  msX_hair(cx, cy, S, SY, style, HR, L, o, hw, fem);
  // ----- glasses -----
  if (o.glasses) {
    const gy = Math.round(cy), gw = eW0 + Math.max(1, Math.round(S * 0.08)), gh = eH + Math.max(1, Math.round(SY * 0.1));
    for (const s of [-1, 1]) {
      const gx = Math.round(cx + FX(s, 0.4) * S);
      if (o.glasses === 2) { for (let j = -gh; j <= gh; j++) { const f = 1 - Math.max(0, (j - gh * 0.3) / gh) ** 2 * 0.6; const w2 = Math.round(gw * f); rect(gx - w2, gy + j, w2 * 2 + 1, 1, j < 0 ? '#101018' : '#1d2030'); } if (S > 12) { px(gx - gw + 2, gy - gh + 1, '#8ea0c0'); px(gx - gw + 3, gy - gh + 1, '#5a6480'); } }
      else { frame(gx - gw, gy - gh, gw * 2 + 1, gh * 2 + 1, '#1a1720'); if (S > 16) { px(gx - gw + 2, gy - gh + 2, '#ffffff'); px(gx - gw + 3, gy - gh + 1 + 1, '#cfe0f0'); } }
    }
    const bgx = Math.round(cx + FX(-1, 0.4) * S + gw), bgx2 = Math.round(cx + FX(1, 0.4) * S - gw);
    rect(bgx, gy - gh + 1, bgx2 - bgx + 1, 1, '#1a1720');
    rect(Math.round(cx - S * 0.96), gy - gh + 1, Math.round(S * 0.4 - gw) + Math.round(S * 0.14), 1, '#1a1720'); rect(Math.round(cx + S * 0.4 + gw), gy - gh + 1, Math.round(S * 0.56 - gw), 1, '#1a1720');
  }
  if (o.sweat && S > 14) { const sx = Math.round(cx + S * 0.7 * (o.sweat > 0 ? 1 : -1)), sy = Math.round(cy - SY * 0.55); px(sx, sy, '#dff4ff'); px(sx, sy + 1, '#ffffff'); px(sx - 1, sy + 1, '#9fc0d8'); px(sx, sy + 2, '#9fc0d8'); }
}
// hair and hats, shaded as a larger shell around the skull
function msX_hair(cx, cy, S, SY, style, HR, L, o, hw, fem) {
  const hat = o.hat;
  // mask: returns true where hair covers pixel (x,y in S units)
  const inShell = (x, y, ax, top, bot) => (x / ax) ** 2 + ((y - (top + bot) / 2) / ((bot - top) / 2)) ** 2 < 1;
  const face = (x, y) => hw(y) > Math.abs(x);
  let m;
  const nwN = fem ? 0.46 : 0.58;
  // outer width of hanging hair (long styles) and the fringe line
  const owL = y => (y < 0.2 ? 1.14 * Math.sqrt(Math.max(0, 1 - ((y - 0.2) / 1.62) ** 2)) : 1.14 + 0.1 * msX_ss(0.2, 1.3, y) - 0.25 * msX_ss(1.4, 1.95, y));
  const owB = y => (y < 0.2 ? 1.18 * Math.sqrt(Math.max(0, 1 - ((y - 0.2) / 1.62) ** 2)) : 1.18 - 0.14 * msX_ss(0.55, 0.98, y));
  switch (style) {
    case 1: m = (x, y) => { const ax = Math.abs(x); return inShell(x, y, 1.06, -1.3, 0.45) && ((ax > 0.74 && y > -0.8 && y < 0.1 + (ax > 0.9 ? 0.12 : 0)) || (y < -1.12 && ax < 0.42 && !face(x, y + 0.06))); }; break; // receding
    case 2: m = (x, y) => inShell(x, y, 1.03, -1.33, 0.4) && (y < -0.8 + 0.05 * x * x || (Math.abs(x) > 0.92 && y < -0.1)); break; // crew
    case 3: m = (x, y) => inShell(x, y, 1.07, -1.56, 0.35) && (y < -0.78 - 0.1 * (1 - x * x) + 0.14 * msX_ss(0.25, 0, Math.abs(x)) || (Math.abs(x) > 0.9 && y < 0.1)); break; // slick, widow's peak
    case 4: m = (x, y) => { const ax = Math.abs(x); if (y > 1.72 + 0.16 * Math.cos((ax - 0.95) * 11) || ax > owL(y) - 0.04 * Math.cos(y * 17) * msX_ss(1.2, 1.8, y)) return false;
      if (face(x, y) && ax < hw(y) - 0.1 && y > -0.62 + 0.22 * msX_ss(-0.7, 0.8, x) - 0.1 * Math.abs(x - 0.1) * msX_ss(0, 0.7, -x)) return false;
      if (y > 1.3 && ax < nwN + 0.02) return false; return true; }; break; // long, side-swept fringe
    case 5: m = (x, y) => { const ax = Math.abs(x); if (y > 0.98 || ax > owB(y)) return false; if (face(x, y) && ax < hw(y) - 0.08 && y > -0.5 + 0.03 * Math.sin(x * 22)) return false; if (y > 0.75 && ax < hw(y) - 0.08) return false; return true; }; break; // bob
    default: m = (x, y) => inShell(x, y, 1.07, -1.42, 0.35) && (y < -0.72 + 0.12 * Math.max(0, x - 0.2) - (x < -0.3 ? 0.05 : 0) || (Math.abs(x) > 0.9 && y < 0.05 + (Math.abs(x) > 0.93 ? 0.12 : 0))); // side part
  }
  if (hat) { const old = m; m = (x, y) => old(x, y) && y > -0.95; }
  const x0 = Math.floor(cx - S * 1.35), x1 = Math.ceil(cx + S * 1.35), y0 = Math.floor(cy - 1.7 * SY), y1 = Math.ceil(cy + 2 * SY);
  const partX = style === 0 ? -0.42 : style === 4 ? -0.3 : 99;
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    const x = (X + 0.5 - cx) / S, y = (Y + 0.5 - cy) / SY; if (!m(x, y)) continue;
    // shell normal; hanging hair is shaded as a curtain wrapped round the neck
    let nx, ny, nz;
    if ((style === 4 || style === 5) && y > 0.15) { const ow = style === 4 ? owL(y) : owB(y); nx = Math.max(-1, Math.min(1, x / ow)) * 0.95; ny = 0.12; nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)); }
    else { const sx = x / 1.2, sy = (y + 0.2) / 1.7, q = Math.min(0.97, sx * sx + sy * sy); nx = sx; ny = sy; nz = Math.sqrt(1 - q); }
    const d = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
    let v = 0.06 + 0.72 * Math.pow(d, 1.3) + (d > 0.93 ? 0.22 : 0);
    // a few clean strand divisions (not texture): darker grooves in the long styles
    if (style === 4 && y > -0.2) { const k = (x * (1 + 0.1 * y) + 3) * 4.2; if (Math.abs(k - Math.round(k)) < 0.07 && Math.abs(x) > 0.7) v -= 0.18; }
    if (style === 3) v += ((Math.floor((y + 1.6) * 6 + x * x * 2) & 1) ? 0.06 : -0.03);
    if (Math.abs(x - partX) < 0.04 && y < -0.95 && y > -1.38) v = Math.min(v, 0.2);
    if (o.rim) { const r = o.rim.dir; if (nx * r[0] + ny * r[1] > 0.62) v = Math.max(v, 0.75); }
    px(X, Y, msX_rp(HR, v));
  }
  if (hat) msX_fedora(cx, cy, S, SY, o.hatCol || '#3a3a44', L);
}
function msX_fedora(cx, cy, S, SY, col, L) {
  const R = { '#3a3a44': ['#0d0d15', '#1c1c28', '#2e2f3e', '#454858', '#62667a'] }[col] || ['#140c0c', '#2a1814', '#45281e', '#6a402a', '#8e5c3a'];
  // crown
  msX_spn([[cx - S * 0.9, cy - SY * 0.9], [cx - S * 0.8, cy - SY * 1.6], [cx - S * 0.3, cy - SY * 1.85], [cx, cy - SY * 1.7], [cx + S * 0.3, cy - SY * 1.85], [cx + S * 0.8, cy - SY * 1.6], [cx + S * 0.9, cy - SY * 0.9]], (y, a, b) => {
    for (let x = a; x < b; x++) { const u = (x + 0.5 - cx) / (S * 0.9); px(x, y, msX_rp(R, 0.15 + 0.85 * Math.max(0, u * L[0] + Math.sqrt(Math.max(0, 1 - u * u)) * 0.8))); }
  });
  msX_poly([[cx - S * 0.9, cy - SY * 1.08], [cx + S * 0.9, cy - SY * 1.08], [cx + S * 0.9, cy - SY * 0.9], [cx - S * 0.9, cy - SY * 0.9]], R[0]); // band
  // brim
  for (let y = Math.floor(cy - SY * 1.05); y < cy - SY * 0.72; y++) { const t = (y + 0.5 - (cy - SY * 0.88)) / (SY * 0.17); const w = S * 1.45 * Math.sqrt(Math.max(0, 1 - t * t * 0.5)); rect(Math.round(cx - w), y, Math.round(w * 2), 1, t < -0.2 ? R[3] : t < 0.4 ? R[2] : R[1]); }
  // brim shadow across the brow
  msX_atop(() => msX_alpha(0.35, () => msX_ov(cx, cy - SY * 0.55, S * 0.98, SY * 0.22, '#10081a')));
}


// ===================================================================
// INTERROGATION (150x200 layout = 300x400 fine): a green enamel lamp
// over a steel table, the suspect in its cone, a one-way mirror, a
// NO SMOKING sign in a room full of smoke, and the detective's
// rim-lit shoulder in the foreground.
// Palette: cool slate/institutional green walls, warm tungsten key
// light from above-front, steel greys, one accent (the red REC lamp).
// ===================================================================
const msX_IR = { lx: 150, ly: 66 }; // lamp mouth, fine px
function msX_irLightAt(x, y) {
  const dx = x - msX_IR.lx, dy = y - msX_IR.ly; let I = 0;
  if (dy > 0) { const hw = 24 + dy * 0.6, t = Math.abs(dx) / hw; I = (1 - msX_ss(0.62, 1.06, t)) * Math.max(0, 1 - dy / 520) * 0.95; }
  I = Math.max(I, 0.5 * Math.exp(-(dx * dx + dy * dy * 2.5) / 1400));
  return Math.round(I * 7) / 7;
}
function msX_irWall() {
  return art('msX_irWall', 150, 200, () => {
    // --- albedo ---
    // upper wall: painted cinder block, lower: institutional green, divided by a rail
    for (let r = 0; r < 12; r++) {
      const y0 = r * 20 - 6, off = r & 1 ? 24 : 0;
      for (let c = -1; c < 8; c++) {
        const x0 = c * 48 + off, lo = y0 + 18 > 196;
        const face = lo ? '#34463f' : '#4a5160', top = lo ? '#3f5249' : '#565d6c', bot = lo ? '#2a3833' : '#3e4452';
        rect(x0, y0, 46, 18, face); rect(x0, y0, 46, 1, top); rect(x0, y0 + 17, 46, 1, bot); rect(x0 + 45, y0, 1, 18, bot);
        rect(x0 + 46, y0, 2, 20, lo ? '#1e2a26' : '#2c313d'); rect(x0, y0 + 18, 48, 2, lo ? '#1e2a26' : '#2c313d');
      }
    }
    // the lower wall is flat painted plaster below the rail
    rect(0, 196, 300, 58, '#34463f'); rect(0, 196, 300, 1, '#4b6055');
    rect(0, 190, 300, 6, '#5b574c'); rect(0, 190, 300, 1, '#7d7766'); rect(0, 195, 300, 1, '#2c2a26'); // rail
    // skirting + floor
    rect(0, 250, 300, 6, '#1e1b1c'); rect(0, 250, 300, 1, '#35302d');
    for (let y = 256; y < 400; y++) { const k = (y - 256) / 144; rect(0, y, 300, 1, mix('#2d2a2c', '#3a3432', k)); }
    for (let i = 0; i < 9; i++) { const yy = 256 + Math.round(Math.pow(i / 8, 1.6) * 144); rect(0, yy, 300, 1, '#24211f'); } // floor-tile joints in perspective
    for (let i = -6; i <= 6; i++) line(150 + i * 26, 256, 150 + i * 70, 400, '#24211f');
    // one-way mirror: aluminium frame, dark glass
    const mx = 14, my = 58, mw = 86, mh = 120;
    rect(mx - 4, my - 4, mw + 8, mh + 8, '#6d7480'); rect(mx - 4, my - 4, mw + 8, 1, '#a6adb8'); rect(mx - 4, my - 4, 1, mh + 8, '#8d95a1');
    rect(mx - 4, my + mh + 3, mw + 8, 1, '#3a3f49'); rect(mx + mw + 3, my - 4, 1, mh + 8, '#3a3f49');
    rect(mx - 1, my - 1, mw + 2, mh + 2, '#2b3038');
    for (let y = 0; y < mh; y++) rect(mx, my + y, mw, 1, mix('#1b2b33', '#0e171e', y / mh));
    // ledge
    rect(mx - 6, my + mh + 4, mw + 12, 4, '#7a818c'); rect(mx - 6, my + mh + 4, mw + 12, 1, '#b3bac4'); rect(mx - 6, my + mh + 8, mw + 12, 1, '#23262d');
    // steel door (right), with a wired-glass light
    const dx = 236, dy = 40, dw = 58, dh = 210;
    rect(dx - 5, dy - 5, dw + 10, dh + 5, '#3d424c'); rect(dx - 5, dy - 5, dw + 10, 1, '#6c7380'); rect(dx - 5, dy - 5, 1, dh + 5, '#5a616d');
    rect(dx, dy, dw, dh, '#4f5866'); rect(dx, dy, 1, dh, '#6d7686'); rect(dx + dw - 1, dy, 1, dh, '#353c47');
    rect(dx + 4, dy + 4, dw - 8, 1, '#3a414c'); rect(dx + 4, dy + dh - 30, dw - 8, 1, '#3a414c'); rect(dx + 4, dy + dh - 29, dw - 8, 1, '#6a7382');
    rect(dx + 14, dy + 18, 30, 34, '#262b33'); rect(dx + 15, dy + 19, 28, 32, '#223038');
    for (let i = 0; i < 4; i++) { rect(dx + 15, dy + 25 + i * 7, 28, 1, '#3a4650'); rect(dx + 21 + i * 7, dy + 19, 1, 32, '#3a4650'); }
    rect(dx + 14, dy + 52, 30, 1, '#7a8494');
    rect(dx + 6, dy + 104, 3, 14, '#2a2f37'); rect(dx + 5, dy + 108, 9, 3, '#a5acb6'); rect(dx + 5, dy + 111, 9, 1, '#454b55');
    // NO SMOKING plate above the mirror
    rect(26, 24, 64, 15, '#e6e0cf'); rect(26, 24, 64, 1, '#fffbe8'); rect(26, 38, 64, 1, '#8f8a7c'); frame(27, 25, 62, 13, '#b8352e');
    text('NO SMOKING', 58 - textW('NO SMOKING') / 2, 28, '#9a2a24');
    // clock
    msX_ov(196, 30, 13, 11, '#2a2d34'); msX_ov(196, 30, 11, 9.2, '#e8e2d2'); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; px(196 + Math.round(Math.sin(a) * 9), 30 - Math.round(Math.cos(a) * 7.5), '#3a3a40'); }
    // pipe + conduit along the ceiling
    rect(0, 6, 300, 5, '#3c4350'); rect(0, 6, 300, 1, '#5f6776'); rect(0, 10, 300, 1, '#23272f');
    for (let x = 20; x < 300; x += 70) { rect(x, 4, 4, 9, '#2c313a'); }
    // --- light pass: cool ambient, warm stepped cone ---
    msX_light(0, 0, 300, 400, (x, y) => { const I = msX_irLightAt(x, y > 256 ? 66 + (y - 256) * 0.2 + (y - 256) * 0.9 : y); return [0.36 + I * 1.45, 0.4 + I * 1.25, 0.56 + I * 0.86]; });
    // --- reflections in the one-way mirror (drawn after the light pass: glass shows what's in front) ---
    msX_alpha(0.22, () => { msX_poly([[14, 118], [60, 58], [74, 58], [28, 118]], '#9fc4d0'); msX_poly([[40, 178], [100, 96], [100, 108], [52, 178]], '#9fc4d0'); });
    msX_alpha(0.1, () => msX_poly([[16, 178], [100, 60], [100, 70], [24, 178]], '#9fc4d0'));
    msX_glow(84, 72, 7, 5, '#f6e2a0', 0.5, 3);
    // behind the glass: two watchers, barely there
    msX_alpha(0.28, () => { msX_ov(40, 112, 9, 9, '#060a0e'); msX_poly([[24, 178], [26, 132], [40, 124], [54, 132], [58, 178]], '#060a0e'); msX_ov(70, 118, 8, 8, '#060a0e'); msX_poly([[56, 178], [58, 138], [70, 130], [82, 138], [86, 178]], '#060a0e'); });
  });
}
// ---------- the suspect ----------
function msX_irKey(f) { return [f.sex, f.skin, f.hair, f.hairStyle, f.beard, f.glasses, f.hat ? 1 : 0, f.jacket, f.tie, f.eyes, f.jaw].join('|'); }
const msX_IRL = [-0.18, -0.78, 0.6];
function msX_irSuspect(p, blink) {
  const f = p.face || {}, key = 'msX_irS' + msX_irKey(f) + (p.role || '') + (blink ? 'b' : '');
  return art(key, 150, 200, () => {
    const fem = f.sex === 'f', J = msX_clothRamp(f.jacket || '#555555'), T = msX_clothRamp(f.tie || '#AA0000');
    const cx = 150, L = msX_IRL;
    // chair back (behind)
    msX_poly([[96, 196], [204, 196], [208, 262], [92, 262]], '#1c1a1e'); rect(96, 196, 108, 2, '#4a4040'); rect(96, 198, 108, 1, '#2c2628');
    // torso: a jacket shaded as a cylinder, lit shoulders
    const tor = [[cx - 74, 262], [cx - 76, 234], [cx - 70, 216], [cx - 50, 206], [cx - 16, 199], [cx + 16, 199], [cx + 50, 206], [cx + 70, 216], [cx + 76, 234], [cx + 74, 262]];
    msX_cyl(tor, J, -0.35, 0.1, 0.85);
    msX_atop(() => { // shoulder tops catch the lamp
      msX_alpha(0.55, () => { msX_poly([[cx - 70, 216], [cx - 50, 206], [cx - 16, 199], [cx + 16, 199], [cx + 50, 206], [cx + 70, 216], [cx + 58, 213], [cx + 20, 206], [cx - 20, 206], [cx - 58, 213]], J[4]); });
    });
    // shirt / blouse opening
    const sh = ['#6f6a78', '#a3a0ab', '#cfcbd0', '#eeeae6'];
    if (fem) {
      msX_poly([[cx - 18, 199], [cx + 18, 199], [cx, 238]], sh[2]); msX_poly([[cx - 18, 199], [cx - 4, 204], [cx, 238]], sh[1]);
      msX_poly([[cx - 22, 199], [cx - 6, 203], [cx - 12, 214]], sh[3]); msX_poly([[cx + 22, 199], [cx + 6, 203], [cx + 12, 214]], sh[2]);
    } else {
      msX_poly([[cx - 16, 199], [cx + 16, 199], [cx, 246]], sh[2]); msX_poly([[cx + 16, 199], [cx + 4, 199], [cx, 246]], sh[1]);
      // collar points
      msX_poly([[cx - 14, 198], [cx - 1, 206], [cx - 10, 214]], sh[3]); msX_poly([[cx + 14, 198], [cx + 1, 206], [cx + 10, 214]], sh[2]);
      // loosened tie: knot pulled down, askew
      msX_poly([[cx - 5, 206], [cx + 4, 206], [cx + 3, 214], [cx - 3, 214]], T[3]); rect(cx - 4, 206, 7, 1, T[4]);
      msX_poly([[cx - 3, 214], [cx + 3, 214], [cx + 7, 244], [cx + 1, 252], [cx - 3, 244]], T[2]); msX_poly([[cx + 1, 214], [cx + 3, 214], [cx + 7, 244], [cx + 1, 252]], T[1]);
      rect(cx - 12, 206, 4, 1, sh[0]); // open collar button shadow
    }
    // lapels
    msX_poly([[cx - 16, 199], [cx - 30, 204], [cx - 22, 226], [cx - 1, 250]], J[3]); msX_poly([[cx - 16, 199], [cx - 1, 250], [cx - 6, 250]], J[1]);
    msX_poly([[cx + 16, 199], [cx + 30, 204], [cx + 22, 226], [cx + 1, 250]], J[2]); msX_poly([[cx + 30, 204], [cx + 22, 226], [cx + 26, 224]], J[1]);
    line(cx - 30, 204, cx - 22, 226, J[4]);
    // upper arms hanging to the elbows on the table
    msX_limb(cx - 60, 230, cx - 72, 264, 28, 26, J, [-0.5, -0.6, 0.62], 0.08);
    msX_limb(cx + 60, 230, cx + 72, 264, 28, 26, J, [-0.5, -0.6, 0.62], 0.08);
    line(cx - 50, 234, cx - 56, 258, J[1]); line(cx + 50, 234, cx + 56, 258, J[0]);
    // edge darkening on everything so far
    msX_edge(300, 400, { lx: -0.3, ly: -1, dark: 0.5, light: 0.12 });
    // head (drawn after the collar so the chin sits over the neck)
    const expr = p.role === 'Mastermind' ? 'smug' : ['nervous', 'calm', 'nervous', 'angry'][(f.jaw | 0) + (f.eyes | 0) & 3];
    msX_face(cx, 165, { S: 25, sex: f.sex, skin: f.skin, hair: f.hair, style: f.hairStyle, beard: f.beard, glasses: f.glasses, hat: f.hat, jaw: f.jaw, gaze: expr === 'nervous' ? -0.9 : 0,
      irisN: (f.eyes | 0) + (f.skin === '#AA5500' ? 0 : 1) * ((f.hair === '#FFFF55') ? 1 : 0), expr, L, amb: 0.1, dif: 0.95, sweat: expr === 'nervous' ? 1 : 0, blink, neck: 1.9 });
    // re-cover the neck base with the collar
    if (!fem) { msX_poly([[cx - 14, 198], [cx - 1, 206], [cx - 10, 214]], sh[3]); msX_poly([[cx + 14, 198], [cx + 1, 206], [cx + 10, 214]], sh[2]); msX_poly([[cx - 5, 206], [cx + 4, 206], [cx + 3, 214], [cx - 3, 214]], T[3]); rect(cx - 4, 206, 7, 1, T[4]); }
    else { rect(cx - 12, 202, 24, 1, '#e6c77a'); px(cx, 204, '#ffe9a8'); } // a thin gold chain
  });
}
// ---------- table, props, hands (in front of the suspect) ----------
function msX_irTable(f) {
  const J = msX_clothRamp((f && f.jacket) || '#555555'), sk = (f && f.skin === '#AA5500') ? 'd' : 'l', SK = msX_SKIN[sk];
  return art('msX_irT' + (f ? f.jacket + f.skin : ''), 150, 200, () => {
    const ST = ['#101218', '#1b1f28', '#2a303b', '#3c4350', '#566070', '#7f8a9a', '#b8c0cc', '#eef0f2'];
    // table top in perspective
    const top = [[40, 258], [260, 258], [292, 304], [8, 304]];
    msX_poly(top, ST[2]);
    // the lamp's pool on the steel: stepped ellipses, warm
    msX_atop(() => { for (let k = 0; k < 5; k++) msX_alpha(0.14, () => msX_ov(150, 282, 150 - k * 24, 30 - k * 5, '#ffe2a0')); });
    rect(8, 304, 284, 2, ST[6]); rect(8, 306, 284, 12, ST[1]); rect(8, 306, 284, 1, ST[3]); rect(8, 317, 284, 1, ST[0]);
    rect(40, 258, 220, 1, ST[4]);
    // legs + stretcher in the dark below
    for (const lx of [16, 276]) { rect(lx, 318, 8, 82, ST[1]); rect(lx, 318, 1, 82, ST[3]); }
    for (const lx of [48, 246]) { rect(lx, 318, 6, 40, ST[0]); }
    // shadow under the table on the floor (clean band)
    msX_alpha(0.55, () => msX_poly([[0, 318], [300, 318], [300, 400], [0, 400]], '#07060a'));
    // suspect's forearms on the table, converging on cuffed hands
    const AL = [-0.25, -0.85, 0.45];
    msX_alpha(0.4, () => { msX_poly([[58, 272], [124, 298], [176, 298], [242, 272], [248, 280], [178, 306], [122, 306], [52, 280]], '#0a0c12'); });
    msX_limb(80, 264, 126, 286, 26, 20, J, AL, 0.1);
    msX_limb(220, 264, 174, 286, 26, 20, J, AL, 0.1);
    const SH = ['#6f6a78', '#a3a0ab', '#cfcbd0', '#eeeae6'];
    msX_limb(121, 283, 125, 285, 13, 12, SH, AL, 0.05); msX_limb(179, 283, 175, 285, 13, 12, SH, AL, 0.05);
    // clasped hands, fingers interlaced; light from above
    const hand = (dir) => { const w0 = 150 - dir * 22; // wrist x
      msX_spn([[w0, 280], [w0 + dir * 12, 278], [150 + dir * 1, 281], [150 + dir * 1, 290], [w0 + dir * 4, 292], [w0, 290]].map(q => [Math.min(q[0], q[0]), q[1]]), (y, a2, b2) => { for (let x = a2; x < b2; x++) px(x, y, msX_rp(SK, 0.92 - (y - 278) * 0.05 - Math.abs(x - 150) * 0.004)); });
    };
    hand(-1); hand(1);
    // eight interlaced fingers on the front, alternating hands (slightly different tones), round tips with a lit nail
    for (let i = 0; i < 8; i++) {
      const fx = 134 + i * 4, own = i & 1, top = 288 + (i === 0 || i === 7 ? 1 : 0), bot = 297 - (i === 0 || i === 7 ? 1 : 0);
      const b2 = bot - (i === 3 || i === 4 ? 0 : (i & 1)); for (let y = top; y < b2; y++) { const v = 0.62 - (y - top) * 0.045 - own * 0.08; px(fx, y, msX_rp(SK, v + 0.12)); px(fx + 1, y, msX_rp(SK, v)); px(fx + 2, y, msX_rp(SK, v - 0.1)); px(fx + 3, y, SK[1]); }
      px(fx + 1, bot, msX_rp(SK, 0.38)); px(fx + 2, bot, SK[1]); px(fx + 1, top, SK[5]);
    }
    // knuckle ridge and the two thumbs resting side by side on top
    for (let i = 0; i < 8; i++) { px(135 + i * 4, 287, SK[5]); px(136 + i * 4, 287, SK[4]); }
    msX_limb(141, 283, 149, 281, 5, 4, SK, AL, 0.3); msX_limb(159, 283, 151, 281, 5, 4, SK, AL, 0.3); px(149, 280, SK[6]); px(151, 280, SK[6]); rect(150, 281, 1, 3, SK[1]);
    // handcuffs: a steel band across each wrist, lit on top; chain sagging in front
    for (const [x0, dir] of [[128, -1], [172, 1]]) {
      msX_poly([[x0 - 2, 277], [x0 + 2, 277], [x0 + 3, 293], [x0 - 1, 293]], '#697180'); rect(x0 - 2, 277, 4, 1, '#f4f6f9'); rect(x0 - 1, 278, 1, 14, '#c9cfd8'); rect(x0 + 1, 280, 1, 12, '#454a55');
      msX_ov(x0 + dir * -6, 293, 2, 2, '#3a3f49'); px(x0 + dir * -6, 292, '#dfe3ea'); // the hinge ring
    }
    msX_crv(128, 292, 150, 304, 172, 292, 1, '#7d8592', 10); for (let i = 1; i < 10; i += 2) { const q = i / 10, u = 1 - q; px(Math.round(u * u * 128 + 2 * u * q * 150 + q * q * 172), Math.round(u * u * 292 + 2 * u * q * 304 + q * q * 292), '#eef1f5'); }
    // reel-to-reel recorder, left
    const rx = 22, ry = 266;
    msX_poly([[rx + 6, ry], [rx + 72, ry], [rx + 76, ry + 18], [rx + 2, ry + 18]], '#3a3430'); msX_poly([[rx + 2, ry + 18], [rx + 76, ry + 18], [rx + 76, ry + 28], [rx + 2, ry + 28]], '#221e1c');
    rect(rx + 6, ry, 66, 1, '#6a605a'); rect(rx + 2, ry + 18, 74, 1, '#6e645c');
    for (const c of [rx + 22, rx + 56]) { msX_ov(c, ry + 9, 14, 6, '#15131a'); msX_ov(c, ry + 9, 12.5, 5, '#8c919c'); msX_ov(c, ry + 9, 9, 3.6, '#4a3a2c'); msX_ov(c, ry + 9, 3, 1.4, '#c9ced6'); }
    rect(rx + 8, ry + 21, 8, 4, '#b0a898'); rect(rx + 18, ry + 21, 8, 4, '#b0a898'); rect(rx + 28, ry + 21, 8, 4, '#b0a898'); rect(rx + 8, ry + 21, 28, 1, '#e8e2d4');
    rect(rx + 50, ry + 21, 18, 5, '#101014'); rect(rx + 51, ry + 22, 16, 3, '#46503a');
    line(rx + 22, ry + 14, rx + 56, ry + 14, '#2c2420');
    // ashtray (glass), a cup of coffee
    msX_ov(214, 282, 14, 5.5, '#2a3036'); msX_ov(214, 281, 13, 4.8, '#8fa0a8'); msX_ov(214, 281, 10, 3.4, '#3c3a36'); px(206, 279, '#dfeaf0'); px(207, 279, '#dfeaf0');
    for (const [a, b] of [[210, 281], [216, 282], [212, 283]]) { rect(a, b, 4, 1, '#d8d0bc'); px(a + 4, b, '#6a4a30'); }
    msX_ln(218, 279, 232, 276, 2, '#efe9dc'); px(232, 276, '#c8b89a');
    const cupx = 230, cupy = 250; msX_cyl([[cupx - 8, cupy], [cupx + 8, cupy], [cupx + 6, cupy + 18], [cupx - 6, cupy + 18]], ['#8a8274', '#bdb4a2', '#e2dac8', '#f6f0e4'], -0.3);
    msX_ov(cupx, cupy, 8, 2.6, '#e6dece'); msX_ov(cupx, cupy + 0.4, 6.6, 1.8, '#3a2214'); rect(cupx - 7, cupy + 6, 14, 3, '#b33a2e');
    msX_alpha(0.35, () => msX_ov(cupx + 6, cupy + 19, 10, 2.5, '#0a0c12'));
    msX_edge(300, 400, { lx: 0, ly: -1, dark: 0.35, light: 0 });
  });
}
// ---------- the detective in the foreground: a silhouette with a warm rim ----------
function msX_irDet() {
  return art('msX_irDet', 150, 200, () => {
    const K = '#08080e', R1 = '#c9975a', R2 = '#f2cf8a';
    // shoulder + back of the head and hat, cut by the frame
    msX_poly([[206, 400], [212, 370], [230, 350], [256, 338], [300, 334], [300, 400]], K);
    msX_ov(282, 308, 24, 24, K);                                                 // head
    msX_poly([[256, 292], [260, 266], [282, 258], [300, 262], [300, 292]], K);   // crown
    msX_ov(284, 290, 40, 6.5, K);                                                // brim
    // rim light: pixels whose neighbour towards the lamp is empty
    const im = g.getImageData(0, 0, 300, 400).data, A = (x, y) => x < 0 || y < 0 || x >= 300 || y >= 400 ? 0 : im[(y * 300 + x) * 4 + 3];
    for (let y = 250; y < 400; y++) for (let x = 200; x < 300; x++) {
      if (!A(x, y)) continue;
      const dx = msX_IR.lx - x, dy = msX_IR.ly - y, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
      if (!A(Math.round(x + ux * 1.5), Math.round(y + uy * 1.5))) { px(x, y, y < 330 ? R2 : R1); if (!A(Math.round(x + ux * 3), Math.round(y + uy * 3)) && y < 320) px(x - Math.round(ux), y - Math.round(uy), '#5a3e26'); }
    }
    rect(258, 285, 42, 1, '#2a1e16'); // hat band
  });
}
function interrogationArt(x, y, w, h, p) {
  const t = performance.now() / 1000, ox = x + ((w - 150) >> 1), oy = y + ((h - 200) >> 1);
  const f = (p && p.face) || null;
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); rect(x, y, w, h, '#07070b');
  blit(msX_irWall(), ox, oy);
  // clock hands, live
  fine(() => {
    const X = ox * RES, Y = oy * RES, cx = X + 196, cy = Y + 30, d = new Date(), mn = d.getMinutes() / 60 * Math.PI * 2, hr = (d.getHours() % 12 + d.getMinutes() / 60) / 12 * Math.PI * 2;
    line(cx, cy, cx + Math.round(Math.sin(hr) * 5), cy - Math.round(Math.cos(hr) * 4), '#1a1a20'); line(cx, cy, cx + Math.round(Math.sin(mn) * 8), cy - Math.round(Math.cos(mn) * 6.5), '#1a1a20');
    const sc = d.getSeconds() / 60 * Math.PI * 2; line(cx, cy, cx + Math.round(Math.sin(sc) * 8), cy - Math.round(Math.cos(sc) * 6.5), '#a02a24');
  });
  if (f) { const blink = (t % 4.7) < 0.13 || ((t + 0.4) % 11) < 0.1; msX_irSuspect(p, !blink); blit(msX_irSuspect(p, blink), ox, oy); }
  blit(msX_irTable(f), ox, oy);
  fine(() => {
    const X = ox * RES, Y = oy * RES;
    // spinning reels: four spokes each
    for (const [c, sp] of [[44, 1.3], [78, 1.3]]) { const a = t * sp * (c === 44 ? 1 : 1.25); for (let k = 0; k < 3; k++) { const b = a + k * 2.094; px(X + c + Math.round(Math.cos(b) * 6), Y + 275 + Math.round(Math.sin(b) * 2.5), '#c9ced6'); px(X + c + Math.round(Math.cos(b) * 4), Y + 275 + Math.round(Math.sin(b) * 1.6), '#c9ced6'); } }
    rect(X + 74, Y + 288, 3, 2, (t % 1.2) < 0.7 ? '#ff4a3a' : '#5a1a18'); // REC
    // cigarette ember + a curling ribbon of smoke rising through the light cone
    const drag = 0.6 + 0.4 * Math.sin(t * 2.3); px(X + 233, Y + 276, drag > 0.8 ? '#ffd27a' : '#e0502a'); px(X + 232, Y + 276, '#8a3a20');
    g.save();
    for (let i = 0; i < 90; i++) {
      const ph = i / 90, age = ph + (t * 0.05 % (1 / 90)), yy = 272 - age * 200, w = t * 0.9 - age * 6;
      const sway = Math.sin(w) * (1 + age * 12) + Math.sin(w * 0.37 + 1.3) * age * 16;
      const xx = 232 - age * 40 + sway, lit = msX_irLightAt(xx, yy); g.globalAlpha = Math.min(1, age * 12) * (1 - age) * (0.12 + lit * 0.22);
      msX_ov(X + xx, Y + yy, 1 + age * 7, 1 + age * 3, lit > 0.3 ? '#efe6d4' : '#8c96aa');
    }
    // dust motes turning in the light cone
    for (let i = 0; i < 14; i++) { const a = msX_H(i, 7), b = msX_H(i, 9), yy = 80 + ((a * 170 + t * (3 + b * 4)) % 170), xx = 150 + Math.sin(t * 0.3 + i) * (18 + (yy - 66) * 0.45) * (b - 0.5) * 2;
      g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i); px(X + Math.round(xx), Y + Math.round(yy), '#fff1c8'); }
    g.restore();
    // the lamp: flex, green enamel shade, glowing bulb rim; light cone shimmer
    const fl = 1 + 0.06 * Math.sin(t * 13) * Math.sin(t * 3.1);
    rect(X + 149, Y + 0, 2, 40, '#15161c'); rect(X + 149, Y, 1, 40, '#3a3c44');
    g.save(); g.globalAlpha = 0.07 * fl; g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) msX_poly([[X + 136 + k * 3, Y + 64], [X + 164 - k * 3, Y + 64], [X + 150 + 78 - k * 14, Y + 250], [X + 150 - 78 + k * 14, Y + 250]], '#ffe7a8');
    g.restore();
  });
  blit(msX_irLamp(), ox, oy);
  blit(msX_irDet(), ox, oy);
  g.restore();
}
function msX_irLamp() {
  return art('msX_irLamp', 150, 200, () => {
    const E = ['#0b1a14', '#123024', '#1d4a36', '#2f6b4c', '#4f9468', '#8fc794'];
    // conical shade, lit from its own bulb below; outside lit by the room's dim ambient -> dark with a sheen
    msX_spn([[140, 38], [160, 38], [184, 62], [116, 62]], (y, a, b) => { for (let x = a; x < b; x++) { const u = (x + 0.5 - a) / (b - a) * 2 - 1; px(x, y, msX_rp(E, 0.12 + 0.8 * Math.max(0, -u * 0.55 + Math.sqrt(1 - u * u) * 0.5) * (0.5 + (y - 38) / 48))); } });
    msX_ov(150, 38, 10, 3, E[3]); rect(146, 32, 8, 6, '#2a2c30'); rect(146, 32, 2, 6, '#5c6068');
    // rim: the inside edge glows where the bulb shines out
    msX_ov(150, 63, 34, 4.5, '#6a5a30'); msX_ov(150, 63.5, 31, 3.5, '#ffe8a8'); msX_ov(150, 64, 18, 2.4, '#ffffff');
    msX_glow(150, 64, 26, 8, '#ffd98a', 0.4, 4);
  });
}

// ===================================================================
// CAPTURED (95x200 layout = 190x400 fine): Squinty, lit by a bare bulb
// from above-left, moonlight rim from a barred window on the right.
// Palette: warm stone browns under tungsten, cold blue in the shadows,
// oxblood leather, one hot accent (the cigarette).
// ===================================================================
const msX_CP = { bx: 64, by: 58 };
function msX_cpWall() {
  return art('msX_cpWall', 95, 200, () => {
    // rough stone courses: each block its own tone, lit top edge, dark bottom edge (no speckle)
    const T = ['#3b3232', '#443937', '#4d403b', '#3f3636', '#48403e'];
    let y = 0, r = 0;
    while (y < 300) {
      const hgt = 18 + Math.floor(msX_H(r, 1) * 10); let x = -Math.floor(msX_H(r, 2) * 30);
      while (x < 190) {
        const wd = 26 + Math.floor(msX_H(r, x) * 26), c = T[Math.floor(msX_H(x, r + 7) * T.length)];
        rect(x + 1, y + 1, wd - 2, hgt - 2, c); rect(x + 2, y + 1, wd - 4, 1, mix(c, '#b8a488', 0.25)); rect(x + 1, y + 2, 1, hgt - 4, mix(c, '#b8a488', 0.12));
        rect(x + 2, y + hgt - 2, wd - 3, 1, mix(c, '#000000', 0.35)); rect(x + wd - 2, y + 2, 1, hgt - 3, mix(c, '#000000', 0.3));
        if (msX_H(x, y) < 0.25) { const cx = x + 6 + Math.floor(msX_H(x, y + 1) * (wd - 12)); line(cx, y + 3, cx + 3, y + 8, mix(c, '#000000', 0.4)); line(cx + 3, y + 8, cx + 2, y + 12, mix(c, '#000000', 0.4)); } // a crack
        rect(x, y, wd, 1, '#1c1616'); rect(x, y, 1, hgt, '#1c1616');
        x += wd;
      }
      y += hgt; r++;
    }
    // barred window high on the right: night sky, a sliver of moon
    const wx = 128, wy = 70, ww = 50, wh = 44;
    rect(wx - 3, wy - 3, ww + 6, wh + 6, '#1a1414'); rect(wx - 3, wy + wh + 2, ww + 6, 2, '#6a5a50');
    for (let i = 0; i < wh; i++) rect(wx, wy + i, ww, 1, mix('#0d1834', '#2a4a78', i / wh));
    msX_ov(wx + 36, wy + 12, 6, 5, '#e8f0ff'); msX_ov(wx + 38, wy + 11, 5, 4.4, mix('#0d1834', '#2a4a78', 0.25));
    for (const [sx, sy] of [[wx + 8, wy + 6], [wx + 20, wy + 14], [wx + 44, wy + 30], [wx + 12, wy + 28]]) px(sx, sy, '#c8d8ff');
    // --- light pass: warm bulb, cold ambient ---
    msX_light(0, 0, 190, 400, (x, y) => {
      const d = Math.hypot(x - msX_CP.bx, (y - msX_CP.by) * 0.8); let I = Math.max(0, 1 - d / 190); I = Math.round(I * I * 8) / 8;
      return [0.3 + I * 1.4, 0.32 + I * 1.2, 0.5 + I * 0.8];
    });
    // window bars (after the light pass: backlit, dark)
    for (let i = 0; i < 4; i++) { const bx = wx + 6 + i * 12; rect(bx, wy - 2, 4, wh + 4, '#0e0c10'); rect(bx + 3, wy - 2, 1, wh + 4, '#4a5a80'); }
    // moonlight shaft falling down-left across the wall
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) { g.globalAlpha = 0.05; msX_poly([[wx + 4 + k * 4, wy + wh], [wx + ww - k * 4, wy + wh], [wx - 60 + ww - k * 6, 400], [wx - 110 + k * 8, 400]], '#6a8ad0'); }
    g.restore();
    // bulb flex anchor
    rect(msX_CP.bx - 4, 0, 8, 4, '#1a1616'); rect(msX_CP.bx - 4, 4, 8, 1, '#4a4040');
  });
}
function msX_squinty(blink) {
  return art('msX_squinty' + (blink ? 'b' : ''), 95, 200, () => {
    const cx = 94, L = [-0.4, -0.75, 0.52], rim = { dir: [0.95, -0.2] };
    const LE = ['#130a0e', '#26121a', '#3f1d20', '#5e2c26', '#86432f', '#b86a44'];     // oxblood leather
    const TK = ['#0a0a10', '#15151e', '#22222e', '#33333f'];                           // black turtleneck
    // shoulders: a leather jacket, broad
    const tor = [[0, 400], [0, 258], [14, 238], [50, 220], [cx - 20, 210], [cx + 20, 210], [138, 220], [174, 238], [190, 252], [190, 400]];
    msX_cyl(tor, LE, -0.45, 0.08, 0.9);
    // turtleneck: rolled collar, then the chest between the open lapels
    msX_cyl([[cx - 30, 400], [cx - 22, 214], [cx + 22, 214], [cx + 30, 400]].map(q => [q[0] + (q[1] > 300 ? (q[0] < cx ? -14 : 14) : 0), q[1]]), TK, -0.3, 0.12, 0.8);
    msX_cyl([[cx - 25, 216], [cx - 23, 186], [cx + 23, 186], [cx + 25, 216]], TK, -0.35, 0.18, 0.85);
    for (let i = 0; i < 3; i++) { rect(cx - 23, 193 + i * 7, 46, 1, TK[0]); rect(cx - 20, 194 + i * 7, 36, 1, TK[3]); }
    // lapels of the leather jacket, open
    msX_poly([[cx - 22, 212], [cx - 46, 204], [cx - 40, 240], [cx - 44, 400], [cx - 58, 400], [cx - 60, 250]], LE[3]); msX_poly([[cx - 46, 204], [cx - 40, 240], [cx - 50, 236]], LE[4]);
    msX_poly([[cx + 22, 212], [cx + 46, 204], [cx + 40, 240], [cx + 44, 400], [cx + 58, 400], [cx + 60, 250]], LE[2]); msX_poly([[cx + 46, 204], [cx + 40, 240], [cx + 50, 236]], LE[1]);
    line(cx - 40, 240, cx - 44, 400, LE[5]); line(cx + 40, 240, cx + 44, 400, LE[1]);
    for (let i = 0; i < 5; i++) line(cx - 20 + i * 10 - (i - 2) * 1, 226, cx - 30 + i * 15, 400, '#15151e'); // ribbed knit
    msX_atop(() => { // glossy leather: clean specular streaks along the shoulders
      msX_alpha(0.75, () => { msX_poly([[16, 242], [50, 224], [62, 224], [28, 246]], LE[5]); msX_poly([[6, 290], [12, 262], [16, 262], [10, 296]], LE[4]); msX_poly([[142, 228], [168, 240], [164, 243], [140, 232]], '#6a7aa8'); });
    });
    msX_edge(190, 400, { lx: -0.4, ly: -1, dark: 0.5, light: 0.1 });
    // the head: square jaw, stubble, a scar, folds, one eye screwed shut
    msX_face(cx, 156, { S: 40, sex: 'm', skin: 'l', hair: '#000000', style: 2, jaw: 2, expr: 'squint', stubble: 1, scar: 1, folds: 1, gold: 1, L, amb: 0.12, dif: 0.95, rim, irisN: 3, blink, neck: 1.6 });
    // flat cap: a wide flat crown overhanging a stiff peak, pulled low
    const CP = ['#121016', '#1e1b24', '#2c2834', '#3e3946', '#56505e', '#6e6878'];
    msX_spn([[cx - 46, 126], [cx - 46, 112], [cx - 34, 100], [cx - 8, 94], [cx + 22, 95], [cx + 42, 102], [cx + 50, 114], [cx + 48, 126]], (y, a, b) => { for (let x = a; x < b; x++) { const u = (x + 0.5 - cx) / 48, v = (y - 94) / 32; px(x, y, msX_rp(CP, 0.15 + 0.8 * Math.max(0, -u * 0.45 + (1 - v) * 0.55 + 0.12))); } });
    line(cx - 34, 104, cx + 36, 100, CP[5]); line(cx - 30, 112, cx + 4, 108, CP[1]); rect(cx - 3, 95, 6, 2, CP[5]); // seam + button
    msX_spn([[cx - 44, 124], [cx - 10, 121], [cx + 24, 121], [cx + 48, 124], [cx + 42, 133], [cx + 10, 136], [cx - 20, 136], [cx - 40, 132]], (y, a, b) => rect(a, y, b - a, 1, y < 126 ? CP[4] : y < 129 ? CP[2] : CP[1]));
    msX_atop(() => { msX_alpha(0.55, () => msX_poly([[cx - 40, 132], [cx + 42, 132], [cx + 40, 148], [cx - 38, 150]], '#12081a')); msX_alpha(0.3, () => msX_poly([[cx - 38, 148], [cx + 40, 146], [cx + 38, 154], [cx - 36, 156]], '#12081a')); });
    // a glint of the good eye from under the peak
    px(cx + 14, 154, '#ffffff');
    // cigarette in the corner of the mouth, drooping to the right
    msX_ln(cx + 12, 186, cx + 32, 193, 3, '#efe9dc'); rect(cx + 11, 185, 3, 3, '#c9b48a');
    msX_edge(190, 400, { lx: -0.4, ly: -1, dark: 0.3, light: 0 });
    // bulb falloff: lower parts sink into the dark
    msX_light(0, 0, 190, 400, (x, y) => { const I = Math.round(Math.max(0, 1 - Math.hypot(x - msX_CP.bx, (y - msX_CP.by) * 0.9) / 330) * 6) / 6; return [0.35 + I * 0.8, 0.36 + I * 0.75, 0.48 + I * 0.6]; });
    // moonlight rim on the right side of cap and jacket
    const im = g.getImageData(0, 0, 190, 400).data, A = (x, y) => x < 0 || y < 0 || x >= 190 || y >= 400 ? 0 : im[(y * 190 + x) * 4 + 3];
    for (let y = 90; y < 400; y++) for (let x = 100; x < 190; x++) if (A(x, y) && !A(x + 1, y)) { px(x, y, '#7c90c8'); if (A(x - 1, y)) px(x - 1, y, '#4a5680'); }
  });
}
function msX_cpTable() {
  return art('msX_cpTable', 95, 200, () => {
    const WD = ['#1a0f0c', '#2c1a14', '#44291c', '#603a24', '#80502e', '#a06a3c'];
    // tabletop: planks, lit from the bulb
    msX_poly([[0, 336], [190, 336], [190, 400], [0, 400]], WD[2]);
    for (let i = 0; i < 4; i++) { rect(0, 340 + i * 16, 190, 1, WD[0]); rect(0, 341 + i * 16, 190, 1, WD[3]); }
    rect(0, 336, 190, 2, WD[4]); rect(0, 336, 190, 1, WD[5]);
    // a vodka bottle and a glass
    const GL = ['#0e1a18', '#1c3430', '#2e5048', '#4c7a6c', '#9cc8b8', '#e8fff4'];
    msX_cyl([[20, 348], [20, 296], [26, 286], [28, 270], [36, 270], [38, 286], [44, 296], [44, 348]], GL, -0.5, 0.1, 0.9);
    rect(26, 266, 12, 5, '#b83a2c'); rect(26, 266, 12, 1, '#e86a4a');
    rect(21, 310, 22, 18, '#e8e0cc'); rect(21, 310, 22, 1, '#fff8e8'); rect(24, 314, 16, 3, '#b83a2c'); rect(26, 320, 12, 1, '#3a3030'); rect(26, 323, 9, 1, '#3a3030');
    rect(24, 290, 2, 50, '#f0fff8');
    msX_cyl([[56, 348], [54, 330], [70, 330], [68, 348]], ['#3a4a48', '#6a8480', '#a0c0b8', '#e0f4ee'], -0.5);
    msX_ov(62, 330, 8, 2, '#c8e4dc'); rect(55, 340, 14, 7, '#cfe0da'); rect(55, 340, 14, 1, '#ffffff');
    // his fist on the table, knuckles towards us, a heavy signet ring
    const SK = msX_SKIN.l, FL = [-0.4, -0.8, 0.45];
    msX_limb(168, 400, 146, 350, 42, 36, ['#130a0e', '#26121a', '#3f1d20', '#5e2c26', '#86432f', '#b86a44'], FL, 0.1);
    msX_alpha(0.45, () => msX_ov(128, 368, 34, 5, '#0a0608'));
    // back of the hand, sloping away to the wrist
    msX_spn([[104, 342], [118, 330], [146, 328], [156, 340], [152, 350], [106, 350]], (y, a2, b2) => { for (let x = a2; x < b2; x++) px(x, y, msX_rp(SK, 0.95 - (y - 328) * 0.022 - (x - 104) * 0.003)); });
    // four fingers, curled: vertical segments between two knuckle rows
    for (let i = 0; i < 4; i++) { const fx = 106 + i * 10, h2 = i === 3 ? 14 : 18;
      for (let y = 344; y < 344 + h2; y++) for (let x = fx; x < fx + 10; x++) { const u = (x - fx) / 9, v = (y - 344) / h2; px(x, y, msX_rp(SK, 0.3 + 0.55 * (1 - u) * (1 - v * 0.6) + (v < 0.15 ? 0.15 : 0))); }
      rect(fx + 9, 345, 1, h2 - 2, SK[0]); msX_ov(fx + 4, 344, 4, 2.4, SK[5]); rect(fx + 1, 344 + h2 - 1, 8, 1, SK[1]); }
    // thumb across the lower fingers
    msX_limb(104, 356, 134, 358, 9, 8, SK, FL, 0.2); rect(130, 356, 4, 2, SK[5]); px(135, 358, SK[1]);
    // the ring
    rect(126, 346, 10, 5, '#a87a2a'); rect(127, 346, 8, 2, '#f0c860'); px(128, 346, '#fff8c0'); rect(129, 348, 4, 2, '#6a1a2a');
    // the pistol, lying there as a reminder
    const PS = ['#0c0c10', '#1a1a20', '#2c2c34', '#4a4a56', '#7a7a88'];
    msX_poly([[40, 372], [96, 368], [98, 377], [62, 380], [58, 392], [46, 392], [48, 380], [40, 379]], PS[2]);
    rect(42, 368, 54, 3, PS[3]); rect(42, 368, 54, 1, PS[4]); rect(52, 382, 6, 8, PS[1]); rect(94, 369, 3, 2, PS[0]);
    for (let i = 0; i < 3; i++) rect(80 + i * 4, 371, 1, 5, PS[1]);
    msX_light(0, 250, 190, 150, (x, y) => { const I = Math.round(Math.max(0, 1 - Math.hypot(x - 70, (y - 300) * 1.6) / 190) * 6) / 6; return [0.45 + I * 0.9, 0.45 + I * 0.8, 0.55 + I * 0.5]; });
  });
}
function captureArt(x, y, w, h) {
  const t = performance.now() / 1000, ox = x + ((w - 95) >> 1), oy = y + ((h - 200) >> 1);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); rect(x, y, w, h, '#07060a');
  blit(msX_cpWall(), ox, oy);
  const sw = Math.sin(t * 1.1) * 3;
  fine(() => { // the bulb's warm halo on the wall, swinging a little
    const X = ox * RES, Y = oy * RES, bx = X + msX_CP.bx + sw, by = Y + msX_CP.by;
    msX_glow(bx, by, 70, 56, '#ffcf7a', 0.22, 6);
  });
  const blink = (t % 5.3) < 0.14; msX_squinty(!blink);
  blit(msX_squinty(blink), ox, oy);
  fine(() => {
    const X = ox * RES, Y = oy * RES, bx = X + msX_CP.bx + sw, by = Y + msX_CP.by;
    // flex + bulb
    line(X + msX_CP.bx, Y + 4, bx, by - 10, '#141214');
    rect(bx - 3, by - 11, 6, 6, '#3a3434'); rect(bx - 3, by - 11, 2, 6, '#6a6060');
    msX_ov(bx, by, 6, 6, '#ffe8b0'); msX_ov(bx - 1, by - 1, 3.5, 3.5, '#ffffff');
    msX_glow(bx, by, 16, 14, '#fff0c0', 0.5, 4);
    // a moth circling the bulb
    const ma = t * 5.3, mx = bx + Math.cos(ma) * 13 + Math.sin(t * 13) * 2, my = by + Math.sin(ma * 1.3) * 9;
    const wg = (t * 30 | 0) & 1; rect(Math.round(mx) - 1, Math.round(my), 3, 1, '#4a3a30'); px(Math.round(mx) - 1 - wg, Math.round(my) - 1, '#8a7a68'); px(Math.round(mx) + 1 + wg, Math.round(my) - 1, '#8a7a68');
    // the cigarette: ember pulses with each drag, smoke curls up through the light
    const drag = (t % 4.5) < 1.1, cx = X + 126, cy = Y + 193;
    rect(cx, cy - 1, 2, 3, drag ? '#ffd27a' : '#d0441e'); if (drag) { msX_glow(cx + 1, cy, 6, 5, '#ff8a3a', 0.5, 3); } px(cx + 2, cy, '#6a6a6a');
    g.save();
    for (let i = 0; i < 110; i++) {
      const age = i / 110 + (t * 0.06 % (1 / 110)), w = t * 0.8 - age * 7, yy = cy - 4 - age * 180;
      const xx = cx + 2 + Math.sin(w) * (1 + age * 10) + Math.sin(w * 0.41 + 2) * age * 14 - age * 20;
      g.globalAlpha = Math.min(1, age * 14) * (1 - age) * 0.2;
      msX_ov(xx, yy, 1.5 + age * 9, 1.5 + age * 5, age < 0.5 ? '#d8d4cc' : '#9aa6c0');
    }
    g.restore();
  });
  blit(msX_cpTable(), ox, oy);
  // vignette + frame
  fine(() => { const X = ox * RES, Y = oy * RES; g.save(); g.globalAlpha = 0.35; rect(X, Y, 4, 400, '#000000'); rect(X + 186, Y, 4, 400, '#000000'); g.restore(); });
  frame(x, y, w, h, '#2a2426');
  g.restore();
}

// ===================================================================
// VACATION POSTCARDS (320x200 layout = 640x400 fine). The popup caption
// sits at layout y 176..196, x 60..260, so the bottom band stays calm.
// ===================================================================
// upper body in an outfit; (cx, cy) = the eye line. Returns the shoulder joints for msX_arm.
function msX_bust(cx, cy, S, o) {
  const SY = S / msX_AS, sh = cy + SY * 1.95, sw = S * (o.fem ? 1.72 : 2.1), L = o.L || [-0.3, -0.7, 0.65], R = o.ramp, bot = o.bot ?? cy + SY * 7;
  const SK = msX_SKIN[o.skin || 'l'];
  const wb = o.fem ? 0.66 : 0.84, tor = [[cx - sw * wb, bot], [cx - sw * 0.97, sh + SY * 1.4], [cx - sw, sh + SY * 0.6], [cx - sw * 0.93, sh + SY * 0.2], [cx - sw * 0.78, sh - SY * 0.03], [cx - S * 0.9, sh - SY * 0.2], [cx - S * 0.55, sh - SY * 0.32],
    [cx + S * 0.55, sh - SY * 0.32], [cx + S * 0.9, sh - SY * 0.2], [cx + sw * 0.78, sh - SY * 0.03], [cx + sw * 0.93, sh + SY * 0.2], [cx + sw, sh + SY * 0.6], [cx + sw * 0.97, sh + SY * 1.4], [cx + sw * wb, bot]];
  if (o.outfit === 'gown') {
    msX_cyl(tor, SK, L[0] * 0.9, 0.2, 0.8);
    const by = sh + SY * 1.25;
    // sweetheart bodice
    // the bodice: fills the torso below a soft sweetheart line
    const yTop = x => { const u = (x - cx) / (sw * 0.9), au = Math.abs(u); return by + SY * (0.35 * au * au - 0.28 * Math.exp(-(((au - 0.42) / 0.26) ** 2)) + 0.32 * Math.exp(-((u / 0.1) ** 2))); };
    const lz = Math.sqrt(1 - L[0] * L[0]);
    msX_spn(tor, (y, a, b) => { for (let x = a; x < b; x++) { if (y < yTop(x + 0.5)) continue; const u = (x + 0.5 - a) / (b - a) * 2 - 1; px(x, y, msX_rp(R, 0.12 + 0.88 * Math.max(0, u * L[0] + Math.sqrt(Math.max(0, 1 - u * u)) * lz) - (y - by) / 400)); } });
    for (let x = Math.round(cx - sw); x < cx + sw; x++) { const yy = Math.round(yTop(x + 0.5)); if (g.getImageData(x, yy + 1, 1, 1).data[3]) px(x, yy, R[R.length - 1]); }
    msX_atop(() => { msX_alpha(0.5, () => { msX_ov(cx - S * 0.45, by + SY * 0.25, S * 0.38, SY * 0.3, R[R.length - 1]); msX_ov(cx + S * 0.45, by + SY * 0.25, S * 0.3, SY * 0.25, R[R.length - 2]); }); msX_alpha(0.6, () => msX_poly([[cx - 1, by + SY * 0.3], [cx + 1, by + SY * 0.3], [cx + 2, bot], [cx - 2, bot]], R[0])); });
    // collarbones, necklace
    msX_crv(cx - S * 0.95, sh + SY * 0.05, cx - S * 0.55, sh + SY * 0.3, cx - S * 0.18, sh + SY * 0.28, 1, SK[4], 6); msX_crv(cx + S * 0.18, sh + SY * 0.28, cx + S * 0.55, sh + SY * 0.3, cx + S * 0.95, sh + SY * 0.05, 1, SK[2], 6);
    for (let i = -7; i <= 7; i++) { const a2 = i / 7, xx = cx + a2 * S * 0.6, yy = sh - SY * 0.2 + (1 - a2 * a2) * SY * 0.6; px(Math.round(xx), Math.round(yy), (i & 1) ? (o.jewel || '#f4f0e8') : '#a8a0a0'); }
    if (o.pendant) { msX_ov(cx, sh + SY * 0.55, 2, 2.4, o.pendant); px(cx - 1, sh + SY * 0.45, '#ffffff'); }
  } else {
    msX_cyl(tor, R, L[0], 0.1, 0.9);
    msX_atop(() => msX_alpha(0.45, () => msX_poly([[cx - sw * 0.96, sh + SY * 0.4], [cx - sw * 0.74, sh], [cx - S * 0.55, sh - SY * 0.32], [cx + S * 0.55, sh - SY * 0.32], [cx + sw * 0.74, sh], [cx + sw * 0.96, sh + SY * 0.4], [cx + sw * 0.7, sh + SY * 0.3], [cx - sw * 0.7, sh + SY * 0.3]], R[R.length - 1])));
    const vb = o.vBot ?? sh + SY * 3.4, sr = o.shirt || ['#7c7a8c', '#b0aebc', '#dcd8e0', '#f8f6f4'];
    if (o.outfit !== 'bare') msX_poly([[cx - S * 0.58, sh - SY * 0.34], [cx + S * 0.58, sh - SY * 0.34], [cx, vb]], sr[2]); if (o.outfit !== 'bare') msX_poly([[cx + S * 0.58, sh - SY * 0.34], [cx + S * 0.12, sh - SY * 0.34], [cx, vb]], sr[1]);
    if (o.outfit === 'tux') {
      for (let i = 1; i < 4; i++) { px(cx, Math.round(sh + SY * 0.7 * i), '#2a2a34'); px(cx, Math.round(sh + SY * 0.7 * i) - 1, '#6a6a7a'); }
      const byy = Math.round(sh - SY * 0.12), bw = S * 0.42;
      msX_poly([[cx - bw, byy - 4], [cx, byy], [cx - bw, byy + 4]], o.bow || '#101018'); msX_poly([[cx + bw, byy - 4], [cx, byy], [cx + bw, byy + 4]], o.bow || '#101018');
      rect(cx - 2, byy - 2, 4, 5, o.bowK || '#24242e'); px(cx - Math.round(bw) + 2, byy - 2, '#4a4a5a');
      const LP = o.lapel || ['#1a1a24', '#3a3a4c', '#6a6a82'];
      msX_poly([[cx - S * 0.58, sh - SY * 0.34], [cx - S * 1.25, sh + SY * 0.25], [cx - S * 0.8, sh + SY * 1.5], [cx - 1, vb]], LP[1]); line(cx - S * 1.25, sh + SY * 0.25, cx - S * 0.8, sh + SY * 1.5, LP[2]); line(cx - S * 0.58, sh - SY * 0.34, cx - S * 1.25, sh + SY * 0.25, LP[2]);
      msX_poly([[cx + S * 0.58, sh - SY * 0.34], [cx + S * 1.25, sh + SY * 0.25], [cx + S * 0.8, sh + SY * 1.5], [cx + 1, vb]], LP[0]);
      if (o.flower) { msX_ov(cx - S * 1.0, sh + SY * 0.7, 3, 2.6, o.flower); px(cx - S * 1.0 - 1, sh + SY * 0.7 - 1, '#ffffff'); }
      msX_poly([[cx + S * 0.95, sh + SY * 1.5], [cx + S * 1.45, sh + SY * 1.5], [cx + S * 1.2, sh + SY * 1.15]], '#f4f2ee'); rect(cx + S * 0.95, sh + SY * 1.5, S * 0.5, 1, LP[0]); // pocket square
      msX_ov(cx + 1, vb + SY * 0.5, 1.5, 1.5, LP[2]);
    } else if (o.outfit === 'robe') {
      const RB = R;
      msX_poly([[cx - S * 0.62, sh - SY * 0.36], [cx - S * 1.15, sh + SY * 0.1], [cx - S * 0.3, vb + SY * 0.4], [cx + S * 0.12, vb]], RB[RB.length - 1]); msX_poly([[cx - S * 0.62, sh - SY * 0.36], [cx - S * 0.38, sh - SY * 0.32], [cx + S * 0.12, vb]], RB[RB.length - 2]);
      msX_poly([[cx + S * 0.62, sh - SY * 0.36], [cx + S * 1.15, sh + SY * 0.1], [cx + S * 0.3, vb + SY * 0.4], [cx - S * 0.12, vb]], RB[2]);
    }
  }
  msX_face(cx, cy, Object.assign({ S, L, neck: 2.1 }, o.face));
  return { l: [cx - sw * 0.8, sh + SY * 0.55], r: [cx + sw * 0.8, sh + SY * 0.55], w: S * (o.fem ? 0.52 : 0.7), SY, sh };
}
// an arm: shoulder -> elbow -> hand, sleeve ramp (or skin), optional shirt cuff, and a hand
function msX_arm(sh, el, hd, w, R, SK, o = {}) {
  const L = o.L || [-0.3, -0.7, 0.65];
  if (o.outline !== false) { const dk = [mix(R[0], '#000000', 0.35)]; msX_limb(sh[0], sh[1], el[0], el[1], w + 2, w * 0.88 + 2, dk, L); msX_limb(el[0], el[1], hd[0], hd[1], w * 0.85 + 2, w * 0.72 + 2, dk, L); }
  if (o.back) { msX_limb(el[0], el[1], hd[0], hd[1], w * 0.85, w * 0.72, R, L, 0.1); msX_limb(sh[0], sh[1], el[0], el[1], w, w * 0.88, R, L, 0.1); }
  else { msX_limb(sh[0], sh[1], el[0], el[1], w, w * 0.88, R, L, 0.1); msX_limb(el[0], el[1], hd[0], hd[1], w * 0.85, w * 0.72, R, L, 0.1); }
  const dx = hd[0] - el[0], dy = hd[1] - el[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  if (o.cuff) msX_limb(hd[0] - ux * w * 0.5, hd[1] - uy * w * 0.5, hd[0] - ux * w * 0.1, hd[1] - uy * w * 0.1, w * 0.66, w * 0.64, o.cuff, L, 0.2);
  if (o.hand !== false) msX_ball(hd[0] + ux * w * 0.35, hd[1] + uy * w * 0.35, w * 0.46, w * 0.42, SK, L, 0.2, 0.85);
}

// ---------- 3: MONTE CARLO ----------
// Burgundy damask, gilt pilasters, a crystal chandelier, an arched window onto the harbour at night,
// Max in black tie (or Maxine in a gown) at the roulette table with company to match.
// Key light: the chandelier (warm, above); rim: cool moonlight from the window behind.
function msX_r3Bg(sex) {
  return art('msX_r3Bg' + sex, 320, 200, () => {
    const WL = ['#1c0610', '#2c0a18', '#3e1020', '#521828', '#6a2434'], GD = ['#2a1808', '#5a3a12', '#8e6420', '#c8962e', '#f0cc64', '#fff4c8'];
    // wall: damask diamonds, one step apart in tone
    rect(0, 0, 640, 300, WL[2]);
    for (let y = 0; y < 300; y += 24) for (let x = ((y / 24) & 1) * 16; x < 640; x += 32) { msX_poly([[x, y - 8], [x + 8, y + 2], [x, y + 12], [x - 8, y + 2]], WL[3]); msX_ov(x, y + 2, 2, 2, WL[1]); }
    // wainscot
    rect(0, 236, 640, 64, '#34120c'); rect(0, 236, 640, 3, GD[3]); rect(0, 239, 640, 1, GD[1]);
    for (let x = 12; x < 640; x += 76) { frame(x, 248, 64, 40, '#521e12'); rect(x + 1, 248, 62, 1, '#74301a'); }
    // cornice
    rect(0, 0, 640, 18, '#1e0a0a'); rect(0, 18, 640, 4, GD[3]); rect(0, 18, 640, 1, GD[5]); rect(0, 22, 640, 2, GD[1]);
    for (let x = 0; x < 640; x += 12) { rect(x, 24, 6, 4, GD[2]); rect(x, 24, 6, 1, GD[4]); }
    // pilasters
    for (const px0 of [18, 164, 456, 602]) {
      rect(px0 - 14, 28, 28, 208, GD[2]); rect(px0 - 14, 28, 4, 208, GD[4]); rect(px0 - 10, 28, 2, 208, GD[3]); rect(px0 + 10, 28, 4, 208, GD[1]);
      for (let k = 0; k < 3; k++) rect(px0 - 4 + k * 4, 40, 2, 180, GD[1 + (k === 0 ? 2 : 0)]);
      rect(px0 - 18, 28, 36, 8, GD[3]); rect(px0 - 18, 28, 36, 2, GD[5]); rect(px0 - 18, 226, 36, 10, GD[3]); rect(px0 - 18, 226, 36, 2, GD[4]);
    }
    // arched window onto the harbour
    const wx0 = 232, wx1 = 408, wy0 = 44, wy1 = 236, mx = (wx0 + wx1) / 2, rr = (wx1 - wx0) / 2;
    const inWin = (x, y) => x >= wx0 && x < wx1 && y < wy1 && (y >= wy0 + rr / msX_AS || ((x - mx) / rr) ** 2 + ((y - wy0 - rr / msX_AS) / (rr / msX_AS)) ** 2 < 1);
    for (let y = wy0; y < wy1; y++) for (let x = wx0; x < wx1; x++) {
      if (!inWin(x, y)) continue; const t = (y - wy0) / (wy1 - wy0);
      let c = t < 0.62 ? mix('#0a0c2a', '#3a2a5a', Math.round(t / 0.62 * 7) / 7) : mix('#10183a', '#060a1c', Math.round((t - 0.62) / 0.38 * 5) / 5);
      px(x, y, c);
    }
    // stars, moon and its path on the water
    for (let i = 0; i < 24; i++) { const sx = wx0 + 6 + Math.floor(msX_H(i, 3) * (wx1 - wx0 - 12)), sy = wy0 + 30 + Math.floor(msX_H(i, 4) * 60); if (inWin(sx, sy)) px(sx, sy, i % 3 ? '#8a90c0' : '#e8ecff'); }
    msX_ov(368, 96, 9, 8, '#fff8e0'); msX_ov(370, 95, 7, 6, '#f4ecd0'); px(365, 94, '#d8d0b8'); px(369, 99, '#d8d0b8');
    msX_glow(368, 96, 22, 18, '#8a8ad0', 0.25, 4);
    for (let k = 0; k < 14; k++) { const yy = 164 + k * 5, w = 4 + k * 1.6; rect(Math.round(368 - w / 2 + Math.sin(k * 1.7) * 3), yy, Math.round(w), 1, k & 1 ? '#c8c0a0' : '#8a86a0'); }
    // the far shore: hills of Monaco with lit windows
    msX_poly([[wx0, 150], [262, 136], [300, 142], [330, 128], [352, 140], [390, 134], [wx1, 144], [wx1, 162], [wx0, 162]], '#16122a');
    for (let i = 0; i < 40; i++) { const sx = wx0 + 4 + Math.floor(msX_H(i, 11) * 168), sy = 146 + Math.floor(msX_H(i, 12) * 14); if (inWin(sx, sy)) px(sx, sy, ['#ffd27a', '#ffe8b0', '#ff9a5a'][i % 3]); }
    rect(wx0, 162, wx1 - wx0, 1, '#2a2440');
    // yachts
    for (const [yx, yy, yw] of [[258, 186, 40], [322, 200, 56]]) { msX_poly([[yx, yy], [yx + yw, yy], [yx + yw - 6, yy + 7], [yx + 4, yy + 7]], '#dcdcec'); rect(yx + 8, yy - 6, yw - 22, 6, '#c8c8dc'); rect(yx + 12, yy - 10, yw - 34, 4, '#b8b8d0'); for (let k = 0; k < 5; k++) px(yx + 10 + k * Math.floor(yw / 7), yy - 3, '#ffd27a'); rect(yx + 2, yy + 8, yw - 4, 1, '#3a3a60'); }
    // window frame + glazing bars
    for (let y = wy0; y < wy1; y++) for (let x = wx0 - 6; x < wx1 + 6; x++) if (!inWin(x, y) && (inWin(x + 6, y) || inWin(x - 6, y) || inWin(x, y + 6))) px(x, y, GD[2]);
    rect(mx - 2, wy0, 4, wy1 - wy0, '#241808'); rect(wx0, 120, wx1 - wx0, 3, '#241808'); rect(wx0, 182, wx1 - wx0, 3, '#241808');
    rect(wx0 - 8, wy1, wx1 - wx0 + 16, 6, GD[3]); rect(wx0 - 8, wy1, wx1 - wx0 + 16, 1, GD[5]);
    // velvet drapes, folds as clean vertical bands, tied back with gold cord
    const DR = ['#20040a', '#3a0812', '#5a0e1a', '#801a26', '#a82c34'];
    for (const [d0, d1, dir] of [[196, 262, 1], [378, 444, -1]]) {
      for (let x = d0; x < d1; x++) {
        const k = (x - d0) / (d1 - d0), f = Math.sin(k * Math.PI * 4.5) * 0.5 + 0.5;
        const tie = 150, pinch = (y) => y < tie ? 0 : 0; void pinch;
        for (let y = 26; y < 300; y++) {
          // swag: the drape is gathered in at the tie-back
          const g0 = y < tie ? (y - 26) / (tie - 26) : 1 - (y - tie) / 150, inset = Math.max(0, g0) * 0.45 * (d1 - d0);
          const edge = dir > 0 ? d0 + (d1 - d0) - inset * 1 : d0 + inset;
          if (dir > 0 ? x > edge : x < edge) continue;
          px(x, y, msX_rp(DR, 0.15 + f * 0.7 - (y > 236 ? 0.1 : 0)));
        }
      }
      const tx = dir > 0 ? d0 + 10 : d1 - 10; msX_ov(tx, 152, 8, 5, GD[3]); msX_ov(tx, 151, 5, 3, GD[4]); msX_ln(tx, 156, tx + dir * 2, 172, 3, GD[3]); px(tx, 170, GD[5]);
    }
    rect(190, 26, 260, 8, DR[3]); for (let x = 190; x < 450; x += 20) msX_ov(x + 10, 34, 10, 5, DR[2]); // pelmet
    // sconces
    for (const sx of [18, 164, 456, 602]) { rect(sx - 2, 90, 4, 16, GD[3]); msX_ov(sx, 106, 7, 3, GD[3]); for (const d of [-6, 6]) { rect(sx + d - 1, 92, 3, 10, '#f6f0e0'); msX_ov(sx + d, 90, 1.5, 2.5, '#ffe8a0'); } }
    // warm light pass: chandelier above centre and the sconces
    msX_light(0, 0, 640, 300, (x, y) => {
      if (inWin(x, y)) return [1, 1, 1];
      let I = Math.max(0, 1 - Math.hypot(x - 320, (y - 40) * 1.4) / 420) * 0.9;
      for (const sx of [18, 164, 456, 602]) I += Math.max(0, 1 - Math.hypot(x - sx, (y - 94) * 1.3) / 70) * 0.7;
      I = Math.round(Math.min(1.2, I) * 7) / 7; return [0.5 + I * 0.9, 0.46 + I * 0.8, 0.55 + I * 0.55];
    });
    for (const sx of [18, 164, 456, 602]) msX_glow(sx, 94, 34, 26, '#ffb860', 0.3, 5);
  });
}
function msX_r3People(sex) {
  return art('msX_r3P' + sex, 320, 200, () => {
    const L = [-0.25, -0.7, 0.66], SKl = msX_SKIN.l;
    const TX = ['#07070d', '#101019', '#1b1c28', '#2b2d3d', '#434659'], CUFF = ['#8a8898', '#c0bec8', '#e8e6ea', '#ffffff'];
    const lean = (B, s, R, SK, o) => msX_arm(s < 0 ? B.l : B.r, [(s < 0 ? B.l : B.r)[0] + s * B.w * 0.9, B.sh + B.SY * 3.1], [(s < 0 ? B.l : B.r)[0] - s * B.w * 1.6, 281], B.w, R, SK, o);
    const him = { S: 23, cx: 270, cy: 124 }, her = { S: 22, cx: 384, cy: 132 };
    if (sex === 'f') {
      // Maxine in emerald silk, and an admirer in a white dinner jacket
      const WJ = ['#6a6258', '#a09888', '#cfc6b4', '#ece4d2', '#fffaf0'];
      const B = msX_bust(her.cx, her.cy - 6, 23, { ramp: WJ, outfit: 'tux', lapel: ['#b0a898', '#d8d0c0', '#fffaf0'], flower: '#c8202a', L, bot: 300, face: { sex: 'm', skin: 'l', hair: '#000000', style: 3, expr: 'charm', gaze: -1, turn: -0.8, amb: 0.24, rim: { dir: [-1, -0.3] } } });
      lean(B, 1, WJ, SKl, { L, cuff: CUFF });
      const GN = ['#031a12', '#06301e', '#0c4a2e', '#16663e', '#2a8a54', '#6ac08a'];
      const A = msX_bust(him.cx, him.cy + 6, 22, { fem: true, ramp: GN, outfit: 'gown', L, bot: 300, jewel: '#f0f4ff', pendant: '#4af0c0', face: { sex: 'f', skin: 'l', hair: '#FFFF55', style: 4, expr: 'charm', gaze: 0.8, turn: 0.7, amb: 0.26, rim: { dir: [1, -0.3] } } });
      const GV = ['#12121a', '#1e1e2a', '#2e2e40', '#4a4a64'];
      lean(A, 1, SKl, SKl, { L });
      msX_arm(A.l, [A.l[0] - 10, A.sh + A.SY * 3.2], [A.l[0] + 18, A.sh + A.SY * 1.4], A.w, GV, GV, { L });
      msX_r3Martini(A.l[0] + 22, A.sh + A.SY * 0.05);
      // his hand, lightly on her far shoulder
      msX_arm(B.l, [B.l[0] - 4, B.sh + B.SY * 2.8], [A.r[0] + 2, A.sh + A.SY * 2.6], B.w, WJ, SKl, { L, cuff: CUFF });
    } else {
      // Max in black tie; a woman in red on his arm
      const RD = ['#2a040c', '#4a0814', '#721020', '#9a1c2c', '#c8323c', '#f06a5a'];
      const B = msX_bust(her.cx, her.cy, her.S, { fem: true, ramp: RD, outfit: 'gown', L, bot: 300, jewel: '#f4f0e8', face: { sex: 'f', skin: 'l', hair: '#000000', style: 5, expr: 'charm', gaze: -1, turn: -0.75, amb: 0.26, rim: { dir: [-1, -0.3] } } });
      lean(B, 1, SKl, SKl, { L });
      const A = msX_bust(him.cx, him.cy, him.S, { ramp: TX, outfit: 'tux', L, bot: 300, flower: '#e8e4dc', face: { sex: 'm', skin: 'l', hair: '#AA5500', style: 0, expr: 'suave', gaze: 0.7, turn: 0.7, amb: 0.24, rim: { dir: [1, -0.3] } } });
      lean(A, 1, TX, SKl, { L, cuff: CUFF });
      msX_arm(A.l, [A.l[0] - 10, A.sh + A.SY * 3.2], [A.l[0] + 20, A.sh + A.SY * 1.4], A.w, TX, SKl, { L, cuff: CUFF });
      msX_r3Martini(A.l[0] + 24, A.sh + A.SY * 0.05);
      // her gloved hand on his arm
      const GV = ['#6a5a5a', '#a89a98', '#d8ccc8', '#f4ece8'];
      msX_arm(B.l, [B.l[0] - 4, B.sh + B.SY * 2.8], [A.r[0] + 2, A.sh + A.SY * 2.6], B.w, GV, GV, { L });
    }
    // the chandelier's light falls off down the figures
    msX_light(0, 0, 640, 300, (x, y) => { const k = Math.round(Math.max(0, Math.min(1, (300 - y) / 190)) * 5) / 5; return [0.72 + k * 0.4, 0.68 + k * 0.38, 0.72 + k * 0.3]; });
    msX_edge(640, 400, { lx: -0.3, ly: -1, dark: 0.45, light: 0.12 });
  });
}
function msX_r3Martini(x, y) {
  msX_poly([[x - 9, y], [x + 9, y], [x, y + 11]], '#cfe4ee'); msX_poly([[x - 7, y + 2], [x + 7, y + 2], [x, y + 9]], '#e8f4d8');
  rect(x - 9, y, 18, 1, '#ffffff'); rect(x, y + 11, 1, 10, '#dfe8ee'); rect(x - 5, y + 20, 11, 1, '#cfe0ea');
  msX_ov(x + 3, y + 5, 2, 2, '#5a8a3a'); px(x + 3, y + 4, '#9ad06a'); line(x + 3, y + 5, x + 8, y - 3, '#8a6a4a');
}
function msX_r3Table() {
  return art('msX_r3Table', 320, 200, () => {
    const FT = ['#04200f', '#08301a', '#0e4424', '#155a30', '#1e723e', '#2e8c50'], MH = ['#1a0806', '#34120c', '#521e12', '#74301a', '#9a4a26', '#c46a36'];
    // padded mahogany rail, then felt sloping towards us
    msX_poly([[0, 290], [640, 290], [640, 400], [0, 400]], FT[2]);
    msX_light(0, 290, 640, 110, () => [1, 1, 1]);
    for (let y = 290; y < 400; y++) { const I = Math.round(Math.max(0, 1 - Math.abs(y - 330) / 90) * 5) / 5; rect(0, y, 640, 1, msX_rp(FT, 0.2 + I * 0.5)); }
    rect(0, 272, 640, 18, MH[3]); rect(0, 272, 640, 3, MH[5]); rect(0, 275, 640, 2, MH[4]); rect(0, 286, 640, 4, MH[1]); rect(0, 289, 640, 1, '#c8962e');
    // betting layout: a grid of red/black numbers on the right, in perspective
    for (let r = 0; r < 3; r++) for (let c = 0; c < 12; c++) {
      const y0 = 302 + r * 16, y1 = y0 + 14, sk = (y) => (y - 290) * 0.25, x0 = 300 + c * 26 + sk(y0), x1 = x0 + 24;
      const red = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(c * 3 + 3 - r);
      msX_poly([[x0, y0], [x1, y0], [x1 + 3.5, y1], [x0 + 3.5, y1]], red ? '#8a1c20' : '#141418');
      msX_poly([[x0, y0], [x1, y0], [x1 + 0.3, y0 + 1], [x0 + 0.3, y0 + 1]], red ? '#b83034' : '#34343c');
    }
    for (let r = 0; r <= 3; r++) line(300 + (302 + r * 16 - 290) * 0.25, 301 + r * 16, 612 + (302 + r * 16 - 290) * 0.25, 301 + r * 16, '#c8d8b8');
    // the wheel: a polished bowl with a spinning rotor (the rotor is drawn live)
    const wx = 150, wy = 318;
    msX_ov(wx, wy + 6, 112, 36, '#061408'); msX_ov(wx, wy, 108, 33, MH[1]); msX_ov(wx, wy - 1, 104, 31, MH[3]); msX_ov(wx, wy - 2, 98, 28, MH[4]);
    msX_ov(wx, wy, 92, 26, MH[2]); msX_ov(wx, wy + 1, 84, 23, '#3a2412'); msX_ov(wx, wy + 2, 76, 20, '#2a180c');
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; msX_ov(wx + Math.cos(a) * 88, wy + Math.sin(a) * 25, 2.5, 1.5, '#e8c060'); }
    rect(wx - 102, wy - 6, 16, 1, '#e88a4a'); rect(wx + 60, wy - 26, 30, 1, '#e8a060');
    // chips: stacks of colours on the layout, a tower in front of Max
    const chip = (x, y, n, c, c2) => { for (let i = 0; i < n; i++) { msX_ov(x, y - i * 3, 9, 3.4, mix(c, '#000000', 0.35)); msX_ov(x, y - i * 3 - 1, 9, 3.4, c); for (let k = -1; k <= 1; k++) px(x + k * 6, y - i * 3, c2); } msX_ov(x, y - n * 3, 7, 2.2, mix(c, '#ffffff', 0.25)); };
    chip(360, 316, 5, '#c8302c', '#f0e8d8'); chip(384, 322, 3, '#1c4ab0', '#f0e8d8'); chip(442, 334, 7, '#e8e0cc', '#c8302c'); chip(470, 312, 2, '#161618', '#e0c050');
    chip(268, 304, 9, '#d8a030', '#fff4c0'); chip(290, 306, 6, '#c8302c', '#f0e8d8'); chip(248, 306, 4, '#1c4ab0', '#f0e8d8');
  });
}
function msX_r3Chandelier() {
  return art('msX_r3Ch', 320, 200, () => {
    const GD = ['#2a1808', '#5a3a12', '#8e6420', '#c8962e', '#f0cc64', '#fff4c8'];
    rect(319, 0, 3, 22, GD[2]); rect(319, 0, 1, 22, GD[4]);
    msX_ov(320, 24, 6, 4, GD[3]);
    // three tiers of crystal drops
    for (const [ty, rx, n] of [[36, 28, 7], [52, 48, 11], [70, 66, 15]]) {
      msX_ov(320, ty, rx, rx * 0.18, GD[1]); msX_ov(320, ty - 1, rx, rx * 0.16, GD[3]); rect(320 - rx, ty - 1, rx * 2, 1, GD[4]);
      for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * Math.PI, xx = 320 - Math.cos(a) * rx, yy = ty + Math.sin(a) * rx * 0.16;
        rect(Math.round(xx), Math.round(yy), 1, 6 + (i % 3) * 2, '#d8e8ff'); px(Math.round(xx), Math.round(yy) + 6 + (i % 3) * 2, '#ffffff');
        if (i % 2 === 0) { rect(Math.round(xx) - 1, Math.round(yy) - 7, 3, 6, '#fff8e8'); msX_ov(Math.round(xx), Math.round(yy) - 9, 1.5, 2.5, '#ffe8a0'); } }
    }
    for (let i = -3; i <= 3; i++) line(320, 26, 320 + i * 20, 70, GD[2]);
    msX_glow(320, 52, 110, 60, '#ffd890', 0.35, 7);
  });
}
function msX_casino(t, sex) {
  blit(msX_r3Bg(sex), 0, 0);
  // the sea glitters under the moon
  fine(() => { for (let k = 0; k < 7; k++) { const on = ((t * 3 + k * 1.7) | 0) % 3 === 0; if (on) px(362 + Math.round(msX_H(k, 5) * 12), 166 + k * 9, '#ffffff'); } });
  blit(msX_r3People(sex), 0, 0);
  blit(msX_r3Table(), 0, 0);
  fine(() => {
    // rotor: coloured pockets race round, the ball runs the other way
    const wx = 150, wy = 320, rot = t * 2.2;
    for (let i = 0; i < 37; i++) {
      const a = rot + i / 37 * Math.PI * 2, c = i === 0 ? '#1a8a3a' : i & 1 ? '#b0202a' : '#141418', x = wx + Math.cos(a) * 64, y = wy + Math.sin(a) * 17;
      msX_ov(x, y, 4.2, 2.2, c);
    }
    msX_ov(wx, wy, 44, 11.5, '#6a3c1a'); msX_ov(wx, wy - 1, 36, 9, '#9a5a26'); msX_ov(wx, wy - 2, 22, 5.5, '#c8962e');
    for (let k = 0; k < 4; k++) { const a = rot + k * Math.PI / 2; msX_ln(wx, wy - 4, wx + Math.cos(a) * 18, wy - 4 + Math.sin(a) * 4.5, 2, '#f0cc64'); }
    msX_ov(wx, wy - 7, 3, 3, '#fff4c8'); rect(wx - 1, wy - 12, 2, 5, '#f0cc64');
    const bt = t % 6, br = bt < 4 ? 78 - bt * 3 : 66, ba = -t * 3.6 * Math.max(0.2, 1 - bt / 5), bx = wx + Math.cos(ba) * br, by = wy - 1 + Math.sin(ba) * br * 0.27;
    msX_ov(bx, by, 2.4, 2.2, '#ffffff'); px(Math.round(bx) - 1, Math.round(by) - 1, '#ffffff');
  });
  blit(msX_r3Chandelier(), 0, 0);
  fine(() => { // crystal sparkle
    for (let k = 0; k < 5; k++) { const ph = (t * 1.3 + k * 0.37) % 1.8; if (ph > 0.25) continue; const x = 320 + Math.round((msX_H(k, 2) - 0.5) * 120), y = 44 + Math.round(msX_H(k, 3) * 34); rect(x - 3, y, 7, 1, '#ffffff'); rect(x, y - 3, 1, 7, '#ffffff'); }
  });
}
function rewardArt(i, x, y, w, h, t) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); rect(x, y, w, h, '#000000'); g.translate(x | 0, y | 0);
  const sex = msX_sexNow() === 'f' ? 'f' : 'm';
  ([msX_laundry, msX_office, msX_beach, msX_casino][i] || msX_office)(t || 0, sex);
  g.restore();
}

// a seated figure seen from the front (deck chair, plastic chair): bust + foreshortened legs.
// o.legs: { knee: [dx, dy], foot: [dx, dy] } relative to the hips; o.pants ramp, o.shoe(x, y, s) painter
function msX_seated(cx, cy, S, o) {
  const SY = S / msX_AS, hipY = o.hip ?? cy + SY * 6.2, L = o.L || [-0.3, -0.7, 0.65], PR = o.pants || o.ramp;
  const kn = o.knee || [S * 0.8, SY * 0.9], ft = o.foot || [S * 0.9, SY * 3.8], lw = S * (o.fem ? 0.78 : 0.9);
  const B = msX_bust(cx, cy, S, Object.assign({}, o, { bot: hipY }));
  // shins hang from the knees; thighs come towards us, so they are short, wide, and lit on top
  for (const s of [-1, 1]) {
    const kx = cx + s * kn[0], ky = hipY + kn[1], fx = cx + s * ft[0], fy = hipY + ft[1];
    msX_limb(kx, ky, fx, fy, lw * 0.8, lw * 0.58, o.shin || PR, L, 0.12);
    if (o.shoe) o.shoe(fx, fy, s);
  }
  for (const s of [-1, 1]) {
    const kx = cx + s * kn[0], ky = hipY + kn[1];
    msX_limb(cx + s * S * 0.45, hipY - SY * 0.5, kx, ky, lw * 1.15, lw * 1.0, PR, L, 0.15);
    if (o.knees) msX_ball(kx, ky, lw * 0.5, lw * 0.42, o.knees, L, 0.2, 0.85);
  }
  return Object.assign(B, { hipY });
}
// ---------- 2: THE BEACH ----------
// A turquoise lagoon under a high sun, a leaning palm framing the left, Max in a striped deck chair
// under a red umbrella, cocktail raised; and, not far off, the Agency keeping an eye on things
// from behind a newspaper. Key light: sun top-right; shadows fall down-left, tinted blue-violet.
function msX_r2Bg() {
  return art('msX_r2Bg', 320, 200, () => {
    const SKY = ['#1b3f8f', '#2a5cae', '#3f7cc8', '#63a0dc', '#93c4ea', '#c4e0f0', '#f4f0d8'];
    msX_bands(0, 0, 640, 172, SKY, 14);
    // sun + banded halo
    msX_glow(548, 52, 58, 48, '#fff4c0', 0.32, 5); msX_ov(548, 52, 20, 17, '#fffbe8'); msX_ov(546, 50, 15, 12.5, '#ffffff');
    // cumulus: clean three-tone clusters
    const cloud = (x, y, k) => { const pts = [[0, 0, 22], [20, -8, 18], [40, -2, 20], [58, 4, 14], [-16, 6, 12]];
      for (const [dx, dy, r] of pts) msX_ov(x + dx * k, y + dy * k + 3, r * k, r * k / msX_AS, '#a8c0dc');
      for (const [dx, dy, r] of pts) msX_ov(x + dx * k + 2, y + dy * k, r * k * 0.92, r * k / msX_AS * 0.9, '#f4f8fc');
      for (const [dx, dy, r] of pts) msX_ov(x + dx * k + 5, y + dy * k - 3, r * k * 0.55, r * k / msX_AS * 0.5, '#fffdf0');
      rect(x - 28 * k, y + 12 * k, 100 * k, 3, '#a8c0dc'); };
    cloud(250, 60, 1); cloud(420, 110, 0.6); cloud(90, 128, 0.5);
    // distant island in haze
    msX_poly([[0, 172], [0, 150], [30, 146], [60, 128], [84, 120], [100, 126], [130, 142], [170, 150], [200, 164], [220, 172]], '#6a9cc4');
    msX_poly([[40, 172], [70, 156], [110, 150], [150, 160], [180, 172]], '#5a8cb8');
    // the sea: banded from deep at the horizon to shallow turquoise
    const SEA = ['#0d3a78', '#145a9a', '#1a7ab4', '#23a0c4', '#3cc4cc', '#6ad8d0', '#a8ecdc'];
    msX_bands(0, 172, 640, 92, SEA, 12);
    rect(0, 172, 640, 1, '#e8f4f0');
    // long swell lines
    for (let i = 0; i < 12; i++) { const yy = 180 + Math.round(Math.pow(i / 11, 1.5) * 76); for (let x = (i * 37) % 60; x < 640; x += 60 + i * 8) rect(x, yy, 18 + i * 3, 1, mix('#ffffff', SEA[Math.min(6, 2 + (i >> 1))], 0.5)); }
    // sand
    const SAND = ['#c89660', '#dcae74', '#ebc48a', '#f4d8a4', '#fbe8c2'];
    msX_bands(0, 262, 640, 138, [SAND[3], SAND[2], SAND[3], SAND[4]], 8);
    rect(0, 262, 640, 6, '#c8b088'); rect(0, 268, 640, 4, '#dcc49a'); // wet sand
    // dune ripples: a few long clean arcs
    for (let i = 0; i < 7; i++) { const yy = 290 + i * 16, x0 = (i * 97) % 300; msX_crv(x0, yy, x0 + 90, yy - 5, x0 + 180, yy, 1, SAND[1], 10); msX_crv(x0, yy + 1, x0 + 90, yy - 4, x0 + 180, yy + 1, 1, SAND[4], 10); }
    // footprints wandering up to the deck chair
    for (let i = 0; i < 9; i++) { const fx = 300 + i * 13, fy = 392 - i * 9 + (i & 1) * 4; msX_ov(fx, fy, 3, 1.8, SAND[1]); msX_ov(fx + 1, fy - 1, 2, 1, '#bf9464'); }
    // a sandcastle and a starfish
    const sc = [[560, 330], [594, 330], [590, 314], [586, 306], [584, 296], [570, 296], [568, 306], [564, 314]];
    msX_poly([[548, 334], [606, 334], [600, 326], [554, 326]], SAND[2]); msX_poly(sc, SAND[3]); msX_poly([[577, 306], [586, 306], [590, 314], [594, 330], [577, 330]], SAND[1]);
    for (let k = 0; k < 3; k++) rect(570 + k * 6, 293, 3, 3, SAND[3]); rect(576, 280, 1, 14, '#6a4a30'); msX_poly([[577, 280], [586, 283], [577, 286]], '#d8303a');
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; msX_ln(96, 356, 96 + Math.cos(a) * 7, 356 + Math.sin(a) * 6, 3, '#e87a4a'); } msX_ov(96, 356, 3, 3, '#f09a5a');
  });
}
function msX_r2Palm() {
  return art('msX_r2Palm', 320, 200, () => {
    const TR = ['#2e1c14', '#4a2e1c', '#6a4628', '#8c6236', '#b08448', '#d0a868'], FR = ['#0c2616', '#163e20', '#23592a', '#377a34', '#57a040', '#8cc858'];
    // trunk: a curved tapering column of rings, lit from the right
    const P0 = [40, 410], P1 = [70, 200], P2 = [150, 70];
    for (let i = 0; i < 44; i++) {
      const t = i / 44, u = 1 - t, x = u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0], y = u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1], w = 22 - t * 10;
      const tt = (i + 1) / 44, uu = 1 - tt, x2 = uu * uu * P0[0] + 2 * uu * tt * P1[0] + tt * tt * P2[0], y2 = uu * uu * P0[1] + 2 * uu * tt * P1[1] + tt * tt * P2[1];
      msX_limb(x, y, x2, y2, w, w - 0.25, TR, [0.7, -0.5, 0.5], 0.12);
      if (i % 2 === 0) { const dx = x2 - x, dy = y2 - y, l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l; msX_ln(x - nx * w / 2, y - ny * w / 2, x + nx * w / 2, y + ny * w / 2 - 2, 1, TR[1]); msX_ln(x - nx * w / 2 + 1, y - ny * w / 2 + 1, x + nx * w / 2 + 1, y + ny * w / 2 - 1, 1, TR[4]); }
    }
    // coconuts
    for (const [x, y] of [[144, 78], [156, 82], [150, 88]]) msX_ball(x, y, 6, 5, ['#2a1a10', '#4a3018', '#6a4820', '#8a6430'], [0.6, -0.6, 0.5], 0.15);
    // fronds: curved spines with drooping leaflets, darker undersides
    const frond = (ang, len, droop, flip) => {
      const x0 = 150, y0 = 72, ex = x0 + Math.cos(ang) * len, ey = y0 + Math.sin(ang) * len * 0.7, mx = x0 + Math.cos(ang) * len * 0.5, my = y0 + Math.sin(ang) * len * 0.35 - 26;
      const pt = t => { const u = 1 - t; return [u * u * x0 + 2 * u * t * mx + t * t * ex, u * u * y0 + 2 * u * t * my + t * t * (ey + droop)]; };
      for (let i = 2; i < 40; i++) {
        const t = i / 40, [x, y] = pt(t), [x2, y2] = pt(t + 0.02), dx = x2 - x, dy = y2 - y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
        const ll = (1 - t * 0.7) * 26, dr = 10 + t * 12;
        for (const s of [-1, 1]) { const lx = x + nx * s * ll + dx / l * 6, ly = y + ny * s * ll + dr; msX_ln(x, y, lx, ly, 2, s * flip > 0 ? FR[4] : FR[2]); line(x, y, lx, ly, s * flip > 0 ? FR[5] : FR[1]); }
      }
      for (let i = 0; i < 40; i++) { const [x, y] = pt(i / 40), [x2, y2] = pt((i + 1) / 40); msX_ln(x, y, x2, y2, 3 - i / 20, FR[3]); }
    };
    frond(-2.6, 140, 70, 1); frond(-1.9, 110, 40, 1); frond(-0.7, 140, 60, -1); frond(0.1, 150, 90, -1); frond(-3.2, 150, 100, 1); frond(2.6, 110, 90, 1); frond(0.7, 110, 110, -1);
  });
}
function msX_r2Agent() {
  // the Agency's man on the beach: trench coat, hat, newspaper with two eye-holes (the eyes are drawn live)
  return art('msX_r2Ag', 320, 200, () => {
    const TC = ['#3a2a1c', '#5a4228', '#7e6036', '#a2804a', '#c4a468'], HT = ['#1a1a20', '#2c2c36', '#44444e', '#5e5e6a'];
    msX_alpha(0.35, () => msX_ov(214, 300, 36, 5, '#6a4a6a'));                       // shadow on the sand
    rect(172, 292, 64, 8, '#c83a3a'); for (let x = 176; x < 236; x += 8) rect(x, 292, 4, 8, '#f4ece0'); rect(172, 299, 64, 1, '#8a2a2a'); // beach towel
    msX_cyl([[182, 296], [186, 256], [226, 256], [230, 296]], TC, 0.5, 0.15, 0.85);  // coat, sitting
    // knees drawn up in front, shoes peeking out below
    msX_ball(196, 282, 9, 8, TC, [0.6, -0.6, 0.5], 0.15); msX_ball(216, 282, 9, 8, TC, [0.6, -0.6, 0.5], 0.15);
    msX_limb(196, 284, 194, 296, 12, 10, TC, [0.6, -0.6, 0.5], 0.15); msX_limb(216, 284, 218, 296, 12, 10, TC, [0.6, -0.6, 0.5], 0.15);
    msX_ov(191, 297, 7, 3, '#1a1414'); msX_ov(221, 297, 7, 3, '#1a1414'); px(188, 296, '#5a5a60'); px(224, 296, '#5a5a60');
    // fedora above the paper: pinched crown, band, brim
    msX_cyl([[196, 240], [198, 226], [206, 229], [214, 226], [216, 240]], HT, 0.5); rect(196, 236, 20, 3, '#101014');
    msX_ov(206, 241, 20, 3.5, HT[1]); rect(190, 240, 32, 1, HT[3]);
    // the newspaper, held up
    rect(182, 242, 48, 30, '#ecead8'); rect(182, 242, 48, 1, '#ffffff'); rect(229, 242, 1, 30, '#b8b4a0'); rect(206, 242, 1, 30, '#c8c4b0');
    for (let k = 0; k < 7; k++) { rect(185, 254 + k * 2 + (k > 2 ? 2 : 0), 18, 1, '#8a8878'); rect(209, 254 + k * 2 + (k > 2 ? 2 : 0), 18, 1, '#8a8878'); }
    text('DAILY', 206 - textW('DAILY') / 2, 244, '#2a2a30'); rect(184, 251, 44, 1, '#2a2a30');
    rect(196, 252, 4, 3, '#1a1414'); rect(208, 252, 4, 3, '#1a1414'); // eye-holes
    // hands gripping the edges
    msX_ball(181, 258, 3.5, 4, msX_SKIN.l, [0.6, -0.6, 0.5], 0.2); msX_ball(231, 258, 3.5, 4, msX_SKIN.l, [0.6, -0.6, 0.5], 0.2);
  });
}
function msX_r2Max(sex) {
  return art('msX_r2Max' + sex, 320, 200, () => {
    const L = [0.55, -0.7, 0.45], fem = sex === 'f', SKl = msX_SKIN.l, cx = 452;
    // umbrella shadow on the sand, then the chair's shadow
    msX_alpha(0.3, () => msX_ov(420, 350, 110, 16, '#5a3a6a'));
    msX_ln(532, 356, 486, 116, 3, '#e8e0d0'); line(533, 356, 487, 116, '#a8a090'); // umbrella pole, planted behind
    // deck chair: wooden frame + striped canvas sling
    const WD = ['#4a2a18', '#7a4a28', '#a8703c', '#d09a58'];
    msX_ln(398, 352, 414, 238, 5, WD[1]); msX_ln(506, 352, 490, 238, 5, WD[2]); msX_ln(398, 352, 400, 300, 4, WD[1]);
    msX_ln(392, 300, 512, 300, 5, WD[2]); rect(392, 298, 120, 1, WD[3]); msX_ln(504, 352, 506, 300, 4, WD[2]);
    for (let x = 406; x < 498; x++) { const st = Math.floor((x - 406) / 10) & 1; for (let y = 232; y < 300; y++) { const sag = Math.sin((y - 232) / 68 * Math.PI) * 6, xx = x + (x < 452 ? sag : -sag) * 0.2; px(Math.round(xx), y, st ? (y < 260 ? '#f4f0e4' : '#dcd4c4') : (y < 260 ? '#2a6ac8' : '#1e52a0')); } }
    rect(406, 230, 92, 3, WD[2]); rect(406, 230, 92, 1, WD[3]);
    const pants = fem ? ['#4a0a1c', '#7a1028', '#b01c34', '#d8304a', '#f06a70'] : ['#0e1e48', '#183070', '#23489a', '#3a64b8', '#5a88d0'];
    const shoe = (x, y, s) => { msX_ov(x + s * 2, y + 3, 7, 3, fem ? '#e84a7a' : '#2a2a30'); msX_ov(x + s * 2, y + 2, 5, 2, fem ? '#ff8ab0' : '#5a5a66'); };
    const B = msX_seated(cx, 226, 15, { fem, ramp: fem ? pants : SKl, pants: fem ? SKl : pants, shin: SKl, outfit: fem ? 'gown' : 'bare', skin: 'l', L, hip: 296, knee: [13, 12], foot: [15, 50], shoe, knees: fem ? null : SKl,
      face: { sex, skin: 'l', hair: fem ? '#FFFF55' : '#AA5500', style: fem ? 4 : 0, expr: 'grin', glasses: 2, turn: -0.3, amb: 0.3, L } });
    if (!fem) { // Hawaiian shirt, open over a sunburnt chest
      const HS = ['#8a2a10', '#c0441a', '#e8682a', '#ff9a4a'];
      for (const s of [-1, 1]) { msX_poly([[cx + s * 5, B.sh - 6], [cx + s * 30, B.sh - 2], [cx + s * 34, 300], [cx + s * 10, 300], [cx + s * 3, B.sh + 20]], s < 0 ? HS[2] : HS[1]);
        for (let k = 0; k < 5; k++) { const fx = cx + s * (14 + (k % 2) * 10), fy = B.sh + 6 + k * 10; msX_ov(fx, fy, 2.5, 2, '#fff4d0'); px(fx, fy, '#ffd040'); } }
      msX_poly([[cx - 5, B.sh - 7], [cx - 16, B.sh - 4], [cx - 8, B.sh + 8]], HS[3]); msX_poly([[cx + 5, B.sh - 7], [cx + 16, B.sh - 4], [cx + 8, B.sh + 8]], HS[1]);
      line(cx - 6, B.sh + 18, cx - 2, B.sh + 22, SKl[2]); line(cx + 2, B.sh + 22, cx + 6, B.sh + 18, SKl[2]); // pecs
    } else { // a wide straw sun hat
      msX_ov(cx, 226 - 18, 34, 7, '#c89a4a'); msX_ov(cx, 226 - 19, 32, 6, '#e8c070'); msX_cyl([[cx - 13, 208], [cx - 11, 194], [cx + 11, 194], [cx + 13, 208]], ['#a87a3a', '#d0a458', '#ecc878', '#fbe4a0'], 0.5); rect(cx - 13, 204, 26, 3, '#d8304a');
    }
    // arms: one lazily on the arm rest, one raising the cocktail
    const armR = fem ? SKl : SKl;
    msX_arm(B.l, [B.l[0] - 10, 286], [B.l[0] - 4, 300], B.w, fem ? SKl : ['#8a2a10', '#c0441a', '#e8682a', '#ff9a4a'], SKl, { L });
    msX_arm(B.r, [B.r[0] + 16, 288], [B.r[0] + 10, 256], B.w, fem ? SKl : ['#8a2a10', '#c0441a', '#e8682a', '#ff9a4a'], armR, { L });
    // the cocktail: a hurricane glass, pink, with a paper umbrella and a cherry
    const gx = B.r[0] + 12, gy = 238;
    msX_poly([[gx - 6, gy], [gx + 6, gy], [gx + 4, gy + 10], [gx + 5, gy + 16], [gx - 5, gy + 16], [gx - 4, gy + 10]], '#f07aa0'); rect(gx - 6, gy, 12, 2, '#ffd0e0'); rect(gx - 4, gy + 2, 1, 12, '#ffffff');
    msX_poly([[gx + 2, gy - 12], [gx + 14, gy - 6], [gx - 8, gy - 6]], '#3ac8a0'); msX_poly([[gx + 2, gy - 12], [gx + 14, gy - 6], [gx + 4, gy - 6]], '#2a9a7a'); line(gx + 2, gy - 12, gx + 1, gy + 2, '#f4f0e0');
    msX_ov(gx - 3, gy - 1, 2.5, 2.5, '#d0102a'); px(gx - 4, gy - 2, '#ff8a9a');
    msX_edge(640, 400, { lx: 1, ly: -1, dark: 0.35, light: 0.12 });
    // umbrella canopy: a scalloped dome, panels lit from the right, drawn over everything
    const ax = 486, ay = 112, rcx = 482, rcy = 150, rx = 128, ry = 24;
    const rim = a => [rcx + Math.cos(a) * rx, rcy + Math.sin(a) * ry];
    for (let k = 0; k < 10; k++) {
      const a0 = k / 10 * Math.PI, a1 = (k + 1) / 10 * Math.PI, p0 = rim(a1), p1 = rim(a0), m = rim((a0 + a1) / 2);
      const lit = Math.cos((a0 + a1) / 2) > -0.1, red = !(k & 1);
      const col = red ? (lit ? '#e8323e' : '#a81c2c') : (lit ? '#fff8ec' : '#cfc2b4');
      msX_poly([[ax, ay], p0, [m[0], m[1] + 5], p1], col);
      // scallop edge
      msX_crv(p0[0], p0[1], m[0], m[1] + 9, p1[0], p1[1], 2, red ? (lit ? '#b01e2e' : '#7a1020') : (lit ? '#e0d4c4' : '#a89a8c'), 8);
    }
    for (let k = 0; k <= 10; k++) { const p = rim(k / 10 * Math.PI); line(ax, ay, p[0], p[1], 'rgba(0,0,0,0.12)'); msX_ov(p[0], p[1], 2, 1.6, '#f4ece0'); }
    msX_ov(ax, ay, 4, 3, '#f4ece0'); rect(ax - 1, ay - 7, 2, 5, '#c8c0b0');
  });
}
function msX_beach(t, sex) {
  blit(msX_r2Bg(), 0, 0);
  fine(() => {
    // a sailboat creeping along the horizon; glitter on the water; the gull
    const bx = 260 + ((t * 4) % 460) - 60;
    msX_poly([[bx, 168], [bx + 16, 168], [bx + 13, 172], [bx + 3, 172]], '#f4f0e8'); msX_poly([[bx + 8, 148], [bx + 8, 166], [bx + 18, 166]], '#ffffff'); msX_poly([[bx + 7, 150], [bx + 7, 166], [bx - 2, 166]], '#e8e4dc');
    for (let i = 0; i < 26; i++) { const ph = (t * 1.7 + msX_H(i, 1) * 10) % 3; if (ph > 0.5) continue; const x = Math.floor(msX_H(i, 2) * 640), y = 176 + Math.floor(Math.pow(msX_H(i, 3), 1.4) * 80); rect(x - 2, y, 5, 1, '#ffffff'); if (ph < 0.2) rect(x, y - 1, 1, 3, '#ffffff'); }
    // the shore: a lacy line of foam breathing in and out
    const sw = Math.sin(t * 0.9) * 4;
    for (let x = 0; x < 640; x += 2) { const y = 262 + sw + Math.sin(x * 0.03 + t * 0.9) * 2 + Math.sin(x * 0.11) * 1; rect(x, Math.round(y), 2, 2, '#ffffff'); rect(x, Math.round(y) + 2, 2, 1, '#bfe8e4'); rect(x, Math.round(y) - 1, 2, 1, '#9ae0dc'); }
    const gx = (t * 30) % 760 - 60, gy = 90 + Math.sin(t * 0.7) * 10, fl = Math.sin(t * 7) > 0;
    msX_ln(gx - 9, gy + (fl ? -5 : 2), gx, gy, 2, '#ffffff'); msX_ln(gx, gy, gx + 9, gy + (fl ? -5 : 2), 2, '#ffffff'); px(Math.round(gx), Math.round(gy) + 1, '#9aa4b0');
  });
  blit(msX_r2Agent(), 0, 0);
  fine(() => { // eyes behind the newspaper follow Max, then blink
    const k = (t % 4) < 0.15; if (!k) { rect(198, 253, 2, 2, '#ffffff'); px(199, 254, '#2a2a30'); rect(210, 253, 2, 2, '#ffffff'); px(211, 254, '#2a2a30'); }
  });
  blit(msX_r2Max(sex), 0, 0);
  fine(() => { // a crab edging towards Max's toes
    const cx0 = 360 + Math.sin(t * 0.5) * 30, cy0 = 344, st = (t * 8 | 0) & 1;
    msX_ov(cx0, cy0, 7, 4, '#d8402a'); msX_ov(cx0 - 1, cy0 - 1, 5, 2.5, '#f06a40');
    for (const s of [-1, 1]) { px(Math.round(cx0 + s * 3), cy0 - 5, '#1a1414'); line(cx0 + s * 3, cy0 - 4, cx0 + s * 3, cy0 - 2, '#d8402a'); msX_ov(cx0 + s * 10, cy0 - 3 - st, 3, 2.5, '#e8502e');
      for (let k = 0; k < 3; k++) line(cx0 + s * 5, cy0 + 1, cx0 + s * (9 + k * 2), cy0 + 4 + ((k + st) & 1), '#b0301e'); }
  });
  blit(msX_r2Palm(), 0, 0);
}

// ---------- 1: A WEEK AT THE OFFICE ----------
// Late afternoon through venetian blinds: warm bars of light raked across a khaki government wall,
// Max asleep in a swivel chair, feet on the desk, the Post over his face; paperwork towers,
// a HANG IN THERE kitten, pencils in the ceiling tiles. Key: low sun from the left window.
const msX_R1 = { stripe: (x, y) => { // is (x, y) on the back wall inside a bar of sunlight from the blinds?
  // the window's image, stretched and skewed across the wall to the right
  const u = (x - 380) / 230, v = (y - 70 - (x - 380) * 0.28) / 170; if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
  const k = v * 14; return (k - Math.floor(k)) < 0.52 ? 1 : 0; } };
function msX_r1Bg() {
  return art('msX_r1Bg', 320, 200, () => {
    const WL = '#8a7c5e', WLd = '#6a5e48';
    // ceiling tiles with a grid; pencils stuck in them
    msX_bands(0, 0, 640, 30, ['#8a8474', '#a8a290'], 4); for (let x = 0; x < 640; x += 64) rect(x, 0, 2, 30, '#6e6858'); rect(0, 14, 640, 2, '#6e6858'); rect(0, 29, 640, 1, '#4e483a');
    for (const [x, a] of [[372, 0.2], [388, -0.3], [470, 0.1]]) { msX_ln(x, 16, x + a * 20, 34, 2, '#e8b830'); rect(x - 1 + a * 20, 32, 3, 3, '#e89a9a'); px(x, 16, '#3a3a3a'); }
    // wall
    rect(0, 30, 640, 240, WL); rect(0, 250, 640, 20, '#5a4c38'); rect(0, 250, 640, 2, '#8a7650');
    // window with venetian blinds on the left; sky and the Monument in the gaps
    const wx = 28, wy = 48, ww = 176, wh = 190;
    rect(wx - 8, wy - 8, ww + 16, wh + 16, '#e4dcc8'); rect(wx - 8, wy - 8, ww + 16, 2, '#fff8e8'); rect(wx - 8, wy + wh + 6, ww + 16, 2, '#9a9078');
    for (let y = 0; y < wh; y++) rect(wx, wy + y, ww, 1, mix('#f8d890', '#f0a868', y / wh));
    msX_poly([[wx + 120, wy + wh], [wx + 124, wy + 70], [wx + 127, wy + 62], [wx + 130, wy + 70], [wx + 134, wy + wh]], '#c8a488'); // the Monument
    msX_poly([[wx, wy + wh], [wx, wy + 160], [wx + 40, wy + 150], [wx + 80, wy + 158], [wx + 100, wy + 146], [wx + 150, wy + 156], [wx + ww, wy + 150], [wx + ww, wy + wh]], '#b08a78');
    for (let k = 0; k < 14; k++) { const sy = wy + 4 + k * 13; rect(wx, sy, ww, 7, '#d8ceb4'); rect(wx, sy, ww, 1, '#fff4dc'); rect(wx, sy + 6, ww, 1, '#9a9078'); }
    rect(wx + 40, wy, 1, wh, '#6a6454'); rect(wx + 136, wy, 1, wh, '#6a6454');
    // HANG IN THERE: a kitten dangling from a branch
    const px0 = 404, py0 = 84;
    rect(px0 - 2, py0 - 2, 64, 84, '#3a3024'); rect(px0, py0, 60, 80, '#8ab8d8'); for (let y = 0; y < 50; y++) rect(px0, py0 + y, 60, 1, mix('#a8d0e8', '#dce8e8', y / 50));
    msX_ln(px0 + 4, py0 + 16, px0 + 56, py0 + 12, 3, '#6a4a2a'); msX_ov(px0 + 40, py0 + 10, 6, 3, '#4a8a3a');
    msX_ball(px0 + 30, py0 + 36, 9, 10, ['#6a5a4a', '#9a8a78', '#c8b8a0', '#e8dccc'], [-0.5, -0.6, 0.6], 0.2);
    msX_ball(px0 + 30, py0 + 25, 7, 6, ['#6a5a4a', '#9a8a78', '#c8b8a0', '#e8dccc'], [-0.5, -0.6, 0.6], 0.2);
    msX_poly([[px0 + 24, py0 + 21], [px0 + 25, py0 + 16], [px0 + 28, py0 + 20]], '#9a8a78'); msX_poly([[px0 + 32, py0 + 20], [px0 + 35, py0 + 16], [px0 + 36, py0 + 21]], '#9a8a78');
    px(px0 + 27, py0 + 25, '#1a1a1a'); px(px0 + 33, py0 + 25, '#1a1a1a'); px(px0 + 30, py0 + 27, '#d86a7a');
    msX_ln(px0 + 25, py0 + 30, px0 + 22, py0 + 15, 3, '#9a8a78'); msX_ln(px0 + 35, py0 + 30, px0 + 38, py0 + 14, 3, '#9a8a78');
    text('HANG IN', px0 + 8, py0 + 56, '#ffffff'); text('THERE!', px0 + 12, py0 + 66, '#ffffff');
    // wall calendar, days crossed off
    const cx0 = 484, cy0 = 76; rect(cx0, cy0, 56, 70, '#f4f0e4'); rect(cx0, cy0, 56, 14, '#b8302a'); text('FRIDAY', cx0 + 10, cy0 + 4, '#ffffff');
    for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) { const x = cx0 + 3 + c * 7.5, y = cy0 + 18 + r * 10; rect(Math.round(x), y, 6, 8, '#e0dccc'); if (r * 7 + c < 26) { line(x, y, x + 5, y + 7, '#c02a2a'); line(x + 5, y, x, y + 7, '#c02a2a'); } }
    // clock
    msX_ov(548, 58, 16, 13.5, '#3a3024'); msX_ov(548, 58, 14, 11.7, '#f4f0e4'); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; px(548 + Math.round(Math.sin(a) * 11), 58 - Math.round(Math.cos(a) * 9.4), '#3a3024'); }
    // coat rack with Max's trench coat and hat
    const TC = ['#3a2c1c', '#5c4428', '#806038', '#a8844c', '#c8a468'];
    rect(598, 110, 5, 150, '#4a3420'); rect(598, 110, 1, 150, '#7a5a3a'); msX_ov(600, 258, 16, 3, '#3a2818');
    msX_cyl([[578, 250], [584, 142], [596, 124], [608, 124], [618, 142], [624, 250]], TC, -0.6, 0.15, 0.85); line(601, 130, 598, 250, TC[1]); msX_poly([[590, 126], [600, 150], [596, 124]], TC[3]);
    msX_ov(601, 118, 20, 4, '#2c2c36'); msX_cyl([[590, 118], [592, 104], [601, 107], [610, 104], [612, 118]], ['#1a1a22', '#2c2c36', '#44444e', '#5e5e6a'], -0.6); rect(590, 114, 22, 3, '#101014');
    // --- light: bars of low sun from the blinds, the rest in cool shade ---
    msX_light(0, 30, 640, 240, (x, y) => {
      if (x >= wx - 8 && x < wx + ww + 8 && y >= wy - 8 && y < wy + wh + 8) return [1, 1, 1];
      const on = msX_R1.stripe(x, y), fall = Math.max(0, 1 - Math.abs(x - 330) / 500);
      const win = Math.round(Math.max(0, 1 - Math.hypot(x - 120, (y - 140) * 1.4) / 420) * 5) / 5 * 0.3; return on ? [1.3, 1.12, 0.84] : [0.78 + fall * 0.1 + win, 0.75 + fall * 0.08 + win * 0.8, 0.84 + fall * 0.05 + win * 0.4];
    });
  });
}
function msX_r1Max(sex) {
  return art('msX_r1Max' + sex, 320, 200, () => {
    const fem = sex === 'f', L = [-0.8, -0.3, 0.5], SKl = msX_SKIN.l;
    const CH = ['#140c0c', '#241412', '#3a201a', '#56302a', '#7a4a3a'];
    // the swivel chair, tipped right back: a tall leather back
    msX_spn([[270, 236], [276, 92], [296, 70], [364, 70], [384, 92], [390, 236]], (y, a, b) => { for (let x = a; x < b; x++) { const u = (x + 0.5 - a) / (b - a) * 2 - 1; px(x, y, msX_rp(CH, 0.15 + 0.75 * Math.max(0, -u * 0.7 + Math.sqrt(1 - u * u) * 0.5))); } });
    for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) { msX_ov(298 + k * 32, 92 + j * 34, 2, 2, CH[0]); px(297 + k * 32, 91 + j * 34, CH[4]); }
    // torso reclined (foreshortened): shirt, loosened tie, sleeves rolled
    const SH = fem ? ['#3a4a6a', '#5a6e94', '#8aa0c0', '#c0d0e4'] : ['#5e6070', '#8e90a2', '#bcbece', '#e6e8f0'];
    msX_cyl([[286, 214], [290, 150], [306, 136], [354, 136], [370, 150], [374, 214]], SH, -0.7, 0.15, 0.85);
    if (!fem) { msX_poly([[326, 140], [336, 140], [338, 184], [331, 192], [324, 184]], '#9a2420'); msX_poly([[331, 140], [336, 140], [338, 184], [331, 192]], '#641618'); rect(325, 138, 12, 5, '#b83028'); }
    else { msX_poly([[318, 136], [342, 136], [330, 160]], SKl[3]); for (let i = -4; i <= 4; i++) px(330 + i * 2, 146 + Math.round((1 - (i / 4) ** 2) * 6), '#f4f0e8'); }
    // arms folded across the chest
    for (const [a, b2] of [[[290, 150], [298, 186]], [[370, 150], [362, 186]]]) msX_limb(a[0], a[1], b2[0], b2[1], 19, 17, [mix(SH[0], '#000000', 0.3)], L);
    msX_limb(292, 150, 298, 186, 17, 15, SH, L, 0.15); msX_limb(368, 150, 362, 186, 17, 15, SH, L, 0.15);
    msX_limb(298, 188, 324, 196, 17, 14, [mix(SH[0], '#000000', 0.3)], L); msX_limb(362, 188, 336, 196, 17, 14, [mix(SH[0], '#000000', 0.3)], L);
    msX_limb(298, 188, 324, 196, 15, 12, SH, L, 0.15); msX_limb(362, 188, 336, 196, 15, 12, SH, L, 0.15);
    msX_ball(328, 197, 7, 5.5, SKl, L, 0.2); msX_ball(334, 198, 7, 5.5, SKl, L, 0.2); for (let k = 0; k < 3; k++) px(326 + k * 3, 199, SKl[1]);
    // head tipped back: hair over the chair's crown, chin up
    if (fem) { msX_ball(330, 112, 26, 16, ['#8a5c2a', '#c49440', '#e8c466', '#fff0a8'], L, 0.25); msX_poly([[304, 116], [296, 150], [306, 158], [312, 120]], '#c49440'); msX_poly([[356, 116], [364, 150], [354, 158], [348, 120]], '#8a5c2a'); }
    else msX_ball(330, 112, 23, 14, ['#1c0e14', '#3a1c16', '#5f3220', '#8a502c'], L, 0.2);
    msX_ov(330, 132, 13, 6, SKl[3]); msX_ov(330, 133, 9, 4, SKl[4]); rect(322, 137, 16, 2, SKl[1]); // chin + jaw shadow
    msX_edge(640, 400, { lx: -1, ly: -0.3, dark: 0.45, light: 0.12 });
  });
}
function msX_r1Desk(sex) {
  return art('msX_r1Desk' + sex, 320, 200, () => {
    const fem = sex === 'f', WD = ['#2a160e', '#442416', '#5e3420', '#7c4a2c', '#9c643a', '#c08450'];
    // desktop (seen from above a little), front panel
    msX_poly([[40, 262], [600, 262], [632, 300], [8, 300]], WD[3]);
    msX_light(8, 262, 624, 38, (x, y) => { const on = x < 300 ? 1 : 0; return on ? [1.25, 1.1, 0.9] : [0.85, 0.85, 0.95]; });
    rect(8, 300, 624, 4, WD[5]); rect(8, 304, 624, 96, WD[2]); rect(8, 304, 624, 1, WD[4]);
    for (const x of [30, 330]) { frame(x, 314, 280, 70, WD[1]); rect(x + 1, 315, 278, 1, WD[3]); }
    // blotter, in-tray towers
    msX_poly([[190, 268], [300, 268], [306, 292], [186, 292]], '#2a4a3a'); rect(186, 292, 120, 2, '#1a2e24');
    const stack = (x, y, n, w) => { for (let i = 0; i < n; i++) { const off = Math.round(Math.sin(i * 1.7) * 2); rect(x + off, y - i * 3, w, 3, i % 5 === 0 ? '#e8dcb8' : '#f4f0e4'); rect(x + off, y - i * 3 + 2, w, 1, '#b8b0a0'); } };
    stack(52, 288, 34, 46); stack(104, 290, 22, 44); stack(520, 290, 28, 50);
    msX_poly([[52, 186], [98, 186], [104, 180], [58, 180]], '#f8f4ea'); // top sheet
    // a manila folder stamped TOP SECRET, a rubber stamp
    msX_poly([[430, 272], [500, 270], [506, 292], [428, 294]], '#d8b870'); rect(438, 278, 34, 7, '#e8c880'); text('TOP', 444, 278, '#b8302a');
    rect(478, 260, 8, 12, '#3a2418'); msX_ov(482, 258, 7, 3, '#5a3a24'); rect(476, 272, 12, 3, '#6a1a1a');
    // a rotary telephone
    msX_poly([[146, 276], [184, 276], [188, 292], [142, 292]], '#1a1a20'); msX_ov(165, 282, 11, 5, '#2c2c34'); msX_ov(165, 282, 6, 3, '#e8e4dc');
    msX_ln(146, 272, 186, 272, 7, '#24242c'); rect(146, 270, 40, 1, '#5a5a66'); msX_ov(146, 273, 5, 4, '#24242c'); msX_ov(186, 273, 5, 4, '#24242c');
    // the coffee mug
    msX_cyl([[390, 262], [406, 262], [406, 284], [390, 284]], ['#6a6a78', '#a8a8b8', '#dcdce4', '#ffffff'], -0.7); msX_ov(398, 262, 8, 2.5, '#e8e8f0'); msX_ov(398, 262.5, 6.5, 1.8, '#3a2014');
    msX_crv(406, 266, 414, 272, 406, 280, 2, '#c8c8d4', 6); text('#1', 393, 270, '#b8302a');
    // feet up on the desk: trouser legs running back to the lap, shoe soles towards us
    const PT = fem ? ['#141420', '#22222e', '#34344a', '#4a4a64'] : ['#1a1a24', '#2a2a36', '#3e3e4e', '#585868'];
    msX_limb(314, 248, 316, 206, 30, 30, PT, [-0.8, -0.3, 0.5], 0.15); msX_limb(350, 248, 344, 206, 30, 30, PT, [-0.8, -0.3, 0.5], 0.15);
    for (const [x, s] of [[312, -1], [352, 1]]) {
      if (fem) { // pumps: a slim red sole and a stiletto heel
        msX_ov(x, 236, 13, 22, '#2a0a14'); msX_ov(x, 235, 11, 19, '#9a1c2c'); msX_ov(x - 3, 228, 5, 8, '#c8303e'); rect(x - 3, 256, 6, 8, '#1a0a10'); rect(x - 3, 256, 2, 8, '#6a2a3a');
      } else {
        msX_ov(x, 234, 17, 26, '#140e0a'); msX_ov(x, 232, 15, 22, '#3a2a20'); msX_ov(x - 3, 224, 6, 9, '#4e3c2e');
        msX_ov(x, 255, 14, 8, '#2a1c16'); rect(x - 13, 248, 26, 2, '#140e0a'); msX_ov(x - 3, 254, 5, 3, '#3e2e24');
        if (s > 0) { msX_ov(x + 2, 230, 5, 6, '#ecc4a4'); msX_ov(x + 1, 229, 3, 3, '#fff0dc'); px(x + 4, 233, '#b8806a'); } // a hole in the sole: a toe peeks out
      }
    }
    msX_edge(640, 400, { lx: -1, ly: -0.3, dark: 0.3, light: 0.08 });
  });
}
function msX_office(t, sex) {
  blit(msX_r1Bg(), 0, 0);
  fine(() => { // clock hands
    const d = new Date(), mn = d.getMinutes() / 60 * Math.PI * 2, hr = (d.getHours() % 12 + d.getMinutes() / 60) / 12 * Math.PI * 2;
    line(548, 58, 548 + Math.round(Math.sin(hr) * 6), 58 - Math.round(Math.cos(hr) * 5), '#2a2018'); line(548, 58, 548 + Math.round(Math.sin(mn) * 10), 58 - Math.round(Math.cos(mn) * 8.5), '#2a2018');
  });
  blit(msX_r1Max(sex), 0, 0);
  fine(() => { // the newspaper rises and falls with each snore
    const br = Math.sin(t * 1.6), lift = Math.round(br * 1.5 + 1.5);
    // an open newspaper draped over the face: two pages, a centre fold, the edges drooping
    const top = 108 - lift, NP = ['#a8a490', '#cfcbb6', '#ece8d8'];
    msX_poly([[276, 150], [282, 124 - lift * 0.5], [330, top], [330, 140], [300, 154]], NP[2]); msX_poly([[330, top], [378, 124 - lift * 0.5], [384, 150], [360, 154], [330, 140]], NP[1]);
    msX_poly([[276, 150], [300, 154], [298, 156], [276, 152]], NP[0]); msX_poly([[384, 150], [360, 154], [362, 156], [384, 152]], '#8a8674');
    line(330, top, 330, 140, '#8a8674');
    text('POST', 292, top + 8, '#2a2a30'); rect(290, top + 16, 34, 1, '#2a2a30');
    for (let k = 0; k < 4; k++) { rect(290 + k, top + 20 + k * 4, 30 - k * 2, 1, '#8a8878'); rect(338, top + 8 + k * 5, 30 - (k % 2) * 6, 1, '#7a7868'); }
    rect(344, top + 28, 12, 8, '#9a9888'); rect(345, top + 29, 10, 6, '#b8b4a4');
    // Z z z drifting up
    for (let k = 0; k < 3; k++) { const ph = (t * 0.4 + k / 3) % 1, x = 366 + ph * 40 + Math.sin(ph * 6) * 4, y = 90 - ph * 60, sz = 4 + ph * 6; g.save(); g.globalAlpha = 1 - ph;
      msX_ln(x, y, x + sz, y, 2, '#ffffff'); msX_ln(x + sz, y, x, y + sz, 2, '#ffffff'); msX_ln(x, y + sz, x + sz, y + sz, 2, '#ffffff'); g.restore(); }
  });
  blit(msX_r1Beam(), 0, 0);
  fine(() => { // dust turning in the sunbeam
    for (let i = 0; i < 18; i++) { const u = (msX_H(i, 4) + t * 0.01 * (1 + msX_H(i, 5))) % 1, v = msX_H(i, 6), x = 110 + u * 380, y = 80 + v * 150 + u * 60 + Math.sin(t * 0.7 + i) * 4;
      g.save(); g.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.3 + i * 2); px(Math.round(x), Math.round(y), '#fff4d0'); g.restore(); }
  });
  blit(msX_r1Desk(sex), 0, 0);
  fine(() => { // steam from the mug; a desk fan sweeping back and forth
    for (let k = 0; k < 12; k++) { const ph = (t * 0.35 + k / 12) % 1; g.save(); g.globalAlpha = (1 - ph) * 0.4; msX_ov(398 + Math.sin(ph * 7 + t) * 4, 258 - ph * 34, 1.5 + ph * 3, 1.2 + ph * 2, '#ffffff'); g.restore(); }
    const fx = 576, fy = 238, sw = Math.sin(t * 0.8) * 0.6;
    rect(fx - 10, 282, 20, 6, '#3a3a44'); rect(fx - 10, 282, 20, 1, '#6a6a78'); rect(fx - 2, 256, 4, 28, '#4a4a56');
    msX_ov(fx, fy, 20 * (1 - Math.abs(sw) * 0.5), 18, '#5a5a66'); msX_ov(fx, fy, 18 * (1 - Math.abs(sw) * 0.5), 16, '#2a2a34');
    for (let k = 0; k < 3; k++) { const a = t * 20 + k * 2.09; msX_ln(fx, fy, fx + Math.cos(a) * 15 * (1 - Math.abs(sw) * 0.5), fy + Math.sin(a) * 13, 5, '#8a8a98'); }
    for (let k = -3; k <= 3; k++) line(fx + k * 5 * (1 - Math.abs(sw) * 0.5), fy - 17, fx + k * 5 * (1 - Math.abs(sw) * 0.5), fy + 17, '#9a9aa8');
    msX_ov(fx, fy, 3, 3, '#c8c8d4');
  });
}

// ---------- 0: SATURDAY NIGHT AT THE LAUNDROMAT ----------
// Hard fluorescent light, mint tiles, a row of front-loaders, rain on the window and a pink neon sign
// reading backwards; Max in a bathrobe and bunny slippers (everything else is in the wash),
// chin in hand, one sock. A cat sleeps on a dryer. Key: flat cool overheads; accents: orange chairs, pink neon.
function msX_r0Bg() {
  return art('msX_r0Bg', 320, 200, () => {
    // ceiling + two fluorescent fixtures
    rect(0, 0, 640, 34, '#3e4a4c'); for (let x = 0; x < 640; x += 80) rect(x, 0, 1, 34, '#323c3e'); rect(0, 33, 640, 1, '#2a3234');
    for (const fx of [120, 380]) { rect(fx - 4, 14, 128, 12, '#8a9496'); rect(fx, 16, 120, 6, '#f4fff8'); rect(fx, 22, 120, 2, '#c8d8d4'); }
    // upper wall: mint paint; lower: small square tiles
    rect(0, 34, 640, 118, '#9cc4b4'); rect(0, 34, 640, 3, '#7aa494');
    const TL = '#b8dcd0', TLg = '#8ab0a4';
    rect(0, 152, 640, 110, TL);
    for (let y = 152; y < 262; y += 11) rect(0, y, 640, 1, TLg); for (let x = 0; x < 640; x += 11) rect(x, 152, 1, 110, TLg);
    rect(0, 150, 640, 3, '#5a8a7a'); rect(0, 150, 640, 1, '#cfe8e0');
    // signs on the wall
    rect(40, 70, 76, 40, '#f4f0e0'); frame(40, 70, 76, 40, '#3a4a48'); text('WASH 50c', 48, 76, '#c8302a'); text('DRY 25c', 48, 88, '#2a4a8a'); text('NO DYES', 48, 99, '#3a3a3a');
    rect(180, 64, 64, 50, '#e8e4d0'); frame(180, 64, 64, 50, '#6a5a3a'); for (let k = 0; k < 5; k++) rect(186 + (k % 2) * 4, 70 + k * 8, 40 + (k * 13 % 12), 5, ['#f0d860', '#8ac8e8', '#f0a0b8', '#b8e0a0', '#f4f4f4'][k]); // notice board
    // clock at 11:47
    msX_ov(300, 72, 15, 12.5, '#2a3634'); msX_ov(300, 72, 13, 10.8, '#f8f8f0'); line(300, 72, 297, 64, '#1a1a1a'); line(300, 72, 292, 70, '#1a1a1a'); px(300, 72, '#c8302a');
    // floor: linoleum checks in perspective
    rect(0, 262, 640, 138, '#e8e0c8');
    for (let y = 262; y < 400; y++) {
      const z = 900 / (y - 222), row = Math.floor(z / 2.2);
      for (let x = 0; x < 640; x++) { const X = (x - 320) / (y - 222) * 3.2, col = Math.floor(X); if ((row + col) & 1) px(x, y, '#9cc4b6'); }
    }
    rect(0, 262, 640, 2, '#4a6a60'); msX_alpha(0.25, () => rect(0, 264, 460, 8, '#1a3a34'));
    // the shop window: rainy street at night
    const wx = 470, wy = 44, ww = 170, wh = 206;
    rect(wx - 8, wy - 6, ww + 8, wh + 12, '#c8d0cc'); rect(wx - 8, wy - 6, 2, wh + 12, '#eef4f0');
    for (let y = 0; y < wh; y++) rect(wx, wy + y, ww, 1, mix('#141430', '#2a2448', y / wh));
    // the building across the street, lit windows
    msX_poly([[wx, wy + 120], [wx, wy + 20], [wx + 100, wy + 20], [wx + 100, wy + 120]], '#0c0c1e');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (msX_H(r, c) < 0.45) rect(wx + 10 + c * 22, wy + 30 + r * 22, 10, 12, r === 1 && c === 2 ? '#ffd27a' : '#e8a050');
    // street lamp glow, wet street with reflections, a parked car
    rect(wx + 140, wy + 30, 3, 110, '#1a1a2a'); msX_ov(wx + 136, wy + 30, 10, 4, '#2a2a3a'); msX_glow(wx + 136, wy + 36, 40, 34, '#ff9a3a', 0.45, 5);
    rect(wx, wy + 150, ww, wh - 150, '#1a1a30'); for (let k = 0; k < 6; k++) rect(wx + 134 - k, wy + 152 + k * 8, 6 + k * 2, 3, '#a86a3a');
    msX_poly([[wx + 6, wy + 150], [wx + 16, wy + 128], [wx + 70, wy + 126], [wx + 90, wy + 138], [wx + 110, wy + 140], [wx + 112, wy + 152], [wx + 6, wy + 154]], '#241a30');
    msX_poly([[wx + 22, wy + 132], [wx + 34, wy + 131], [wx + 32, wy + 137], [wx + 20, wy + 138]], '#4a4a6a'); msX_ov(wx + 30, wy + 154, 8, 5, '#0a0a14'); msX_ov(wx + 94, wy + 154, 8, 5, '#0a0a14');
    // glazing bar, sill
    rect(wx + 84, wy, 3, wh, '#c8d0cc'); rect(wx - 8, wy + wh, ww + 8, 8, '#a8b4b0');
    // --- light pass: flat cool fluorescents, a little brighter under the tubes ---
    msX_light(0, 34, 460, 366, (x, y) => { const d = Math.min(Math.abs(x - 180), Math.abs(x - 440)); const I = Math.round(Math.max(0, 1 - d / 400 - (y - 34) / 900) * 5) / 5; return [0.8 + I * 0.25, 0.86 + I * 0.25, 0.86 + I * 0.22]; });
    msX_glow(180, 22, 110, 18, '#e8fff4', 0.2, 4); msX_glow(440, 22, 110, 18, '#e8fff4', 0.2, 4);
  });
}
function msX_r0Washers() {
  return art('msX_r0Wash', 320, 200, () => {
    const EN = ['#5a6a70', '#8a9aa0', '#b8c8cc', '#dce8ea', '#f4fcfc'], L = [0, -0.9, 0.45];
    for (let i = 0; i < 4; i++) {
      const x0 = 16 + i * 108, y0 = 150, w = 100, h = 126;
      rect(x0, y0, w, h, EN[3]); rect(x0, y0, w, 2, EN[4]); rect(x0, y0, 2, h, EN[4]); rect(x0 + w - 3, y0, 3, h, EN[1]); rect(x0, y0 + h - 4, w, 4, EN[0]);
      rect(x0 + 4, y0 + 6, w - 8, 18, '#c8d4d8'); rect(x0 + 4, y0 + 23, w - 8, 1, EN[1]); // control panel
      msX_ov(x0 + 18, y0 + 15, 5, 4, '#6a7a80'); msX_ov(x0 + 18, y0 + 14, 4, 3, EN[4]); rect(x0 + 50, y0 + 11, 22, 8, '#3a4448'); rect(x0 + 52, y0 + 13, 18, 1, '#8a9aa0'); rect(x0 + 80, y0 + 12, 8, 6, '#b8a040');
      // porthole door
      const pcx = x0 + 50, pcy = y0 + 76;
      msX_ov(pcx, pcy, 36, 30, EN[1]); msX_ov(pcx, pcy - 1, 34, 28, '#e8f0f2'); msX_ov(pcx, pcy, 28, 23, '#8a9aa0'); msX_ov(pcx, pcy, 26, 21.5, '#1c2a34');
      rect(pcx + 30, pcy - 6, 5, 12, '#8a9aa0');
      rect(x0 + 8, y0 + h - 14, w - 16, 6, EN[2]); rect(x0 + 8, y0 + h - 14, w - 16, 1, EN[0]); // kick panel
    }
    // OUT OF ORDER on the first machine
    rect(40, 196, 52, 24, '#f4ecb0'); rect(40, 196, 52, 1, '#fff8d8'); text('OUT OF', 46, 200, '#c8302a'); text('ORDER', 48, 209, '#c8302a'); msX_ln(40, 196, 48, 190, 4, '#e8e0c8');
    // detergent box on the second machine, a cat asleep on the fourth
    msX_poly([[128, 150], [128, 126], [156, 122], [160, 126], [160, 150]], '#e8702a'); rect(130, 130, 26, 9, '#fff4e0'); text('SUDZ', 143 - textW('SUDZ') / 2, 131, '#2a5ac8'); rect(157, 126, 3, 24, '#b04a1a'); rect(128, 126, 28, 1, '#ffa050');
    const CT = ['#6a3010', '#a8541c', '#d8803a', '#f4a860'];
    msX_ball(368, 142, 22, 10, CT, L, 0.2); msX_ball(350, 140, 9, 8, CT, L, 0.25);
    msX_poly([[344, 134], [345, 127], [350, 132]], CT[2]); msX_poly([[352, 132], [357, 127], [358, 134]], CT[1]);
    line(346, 141, 349, 141, '#3a1a08'); line(352, 141, 355, 141, '#3a1a08'); px(350, 143, '#d86a7a');
    for (let k = 0; k < 4; k++) msX_crv(360 + k * 8, 134, 362 + k * 8, 142, 360 + k * 8, 149, 1, CT[1], 4); // stripes
    msX_crv(388, 146, 402, 148, 404, 162, 3, CT[2], 8); msX_ov(404, 164, 2.5, 2, CT[1]); // tail over the edge
    msX_ov(344, 148, 5, 2.5, CT[3]); msX_ov(354, 149, 5, 2.5, CT[3]); // paws
    // a moulded orange chair by the wall, a magazine on it
    const OR = ['#6a2008', '#a8400e', '#e0702a', '#ffa050'];
    msX_spn([[20, 290], [24, 250], [60, 246], [64, 290]], (y, a, b) => { for (let x = a; x < b; x++) px(x, y, msX_rp(OR, 0.3 + 0.6 * (1 - (x - a) / (b - a)))); });
    msX_poly([[14, 300], [70, 300], [74, 290], [18, 288]], OR[2]); rect(18, 300, 52, 3, OR[0]); rect(22, 303, 3, 30, '#a8b0b4'); rect(62, 303, 3, 30, '#a8b0b4');
    msX_poly([[28, 292], [54, 290], [58, 296], [30, 298]], '#f4f0e4'); rect(32, 292, 20, 3, '#c8302a');
  });
}
function msX_r0Max(sex) {
  return art('msX_r0Max' + sex, 320, 200, () => {
    const fem = sex === 'f', L = [-0.2, -0.85, 0.5], SKl = msX_SKIN.l, cx = 186;
    const OR = ['#6a2008', '#a8400e', '#e0702a', '#ffa050'];
    // the chair behind Max
    msX_spn([[cx - 42, 318], [cx - 38, 262], [cx + 38, 262], [cx + 42, 318]], (y, a, b) => { for (let x = a; x < b; x++) px(x, y, msX_rp(OR, 0.25 + 0.6 * (1 - (x - a) / (b - a)))); });
    rect(cx - 38, 262, 76, 2, OR[3]);
    msX_poly([[cx - 50, 324], [cx + 50, 324], [cx + 56, 312], [cx - 56, 312]], OR[2]); rect(cx - 50, 324, 100, 3, OR[0]);
    for (const x of [cx - 44, cx + 42]) { rect(x, 327, 4, 26, '#a8b0b4'); rect(x, 327, 1, 26, '#e8eef0'); }
    msX_alpha(0.3, () => msX_ov(cx, 354, 60, 5, '#2a4a44'));
    // Max in a terry bathrobe; bunny slippers
    const RB = fem ? ['#7a2a4a', '#a84a6a', '#d0748e', '#eaa0b4', '#fcd0dc'] : ['#2a4a6a', '#4a70941', '#7a9ec0', '#a8c8e0', '#dcecf8'].map(c => c.slice(0, 7));
    const slipper = (x, y, s) => {
      msX_ov(x, y + 3, 11, 5, '#e8c8d0'); msX_ov(x, y + 2, 10, 4.2, '#fff0f4'); msX_ov(x - 1, y + 1, 4, 2, '#ffffff');
      msX_ln(x - 4, y, x - 7, y - 12, 4, '#fff0f4'); msX_ln(x + 3, y, x + 5, y - 12, 4, '#f4e0e6'); px(x - 7, y - 10, '#f4a0b8'); px(x + 5, y - 10, '#f4a0b8'); // ears
      px(x - 3, y + 1, '#1a1a1a'); px(x + 2, y + 1, '#1a1a1a'); px(x, y + 3, '#f4a0b8');
    };
    const B = msX_seated(cx, 210, 19, { fem, ramp: RB, pants: RB, shin: SKl, outfit: 'robe', shirt: SKl.slice(2), skin: 'l', L, hip: 314, knee: [16, 8], foot: [18, 34], shoe: slipper, knees: RB,
      face: { sex, skin: 'l', hair: fem ? '#FFFF55' : '#AA5500', style: fem ? 5 : 0, expr: 'smug', gaze: 0.9, turn: 0.2, amb: 0.3, L, stubble: fem ? 0 : 1 } });
    // belt of the robe
    rect(cx - 30, 292, 60, 5, RB[1]); msX_ln(cx + 6, 296, cx + 12, 312, 4, RB[1]); msX_ln(cx + 10, 296, cx + 18, 308, 4, RB[2]);
    if (fem) { // curlers
      for (let k = 0; k < 4; k++) { const x = cx - 19 + k * 12, y = 210 - 26 + Math.abs(k - 1.5) * 2; rect(x, y, 7, 5, ['#f06a9a', '#6ac0f0', '#f0d04a', '#8ae07a'][k]); rect(x, y, 7, 1, '#ffffff'); }
    }
    // left arm (viewer's right): elbow on the knee, chin on the fist
    msX_arm(B.r, [cx + 20, 320], [cx + 6, 240], B.w, RB, SKl, { L });
    // right arm: a single sock dangling from two fingers
    msX_arm(B.l, [cx - 40, 294], [cx - 44, 318], B.w, RB, SKl, { L });
    msX_ln(cx - 46, 322, cx - 48, 342, 5, '#e8e4dc'); msX_ov(cx - 46, 344, 5, 3, '#e8e4dc'); rect(cx - 49, 325, 5, 2, '#c8302a'); rect(cx - 49, 329, 5, 2, '#c8302a');
    msX_edge(640, 400, { lx: -0.2, ly: -1, dark: 0.4, light: 0.1 });
    // laundry basket beside the chair, one sock hanging over the rim
    const BK = ['#2a5a8a', '#3a78b0', '#5a9ad0', '#8ac0e8'];
    const bx = 262; msX_alpha(0.3, () => msX_ov(bx + 32, 348, 34, 4, '#2a4a44'));
    msX_poly([[bx, 346], [bx + 6, 312], [bx + 58, 312], [bx + 64, 346]], BK[1]);
    for (let k = 0; k < 6; k++) rect(bx + 10 + k * 8, 318, 4, 22, BK[0]);
    rect(bx + 2, 310, 60, 4, BK[3]); rect(bx + 2, 313, 60, 1, BK[0]);
    msX_ov(bx + 32, 308, 24, 6, '#f4f0e8'); msX_ov(bx + 24, 306, 8, 4, '#8ab8e8'); msX_ov(bx + 42, 306, 7, 3, '#f0a0b8');
    msX_ln(bx + 52, 312, bx + 58, 330, 5, '#f4f0e8'); msX_ov(bx + 58, 332, 5, 3, '#f4f0e8'); rect(bx + 55, 318, 5, 2, '#2a5ac8');
  });
}
function msX_laundry(t, sex) {
  blit(msX_r0Bg(), 0, 0);
  fine(() => {
    // rain streaks and drops running down the window; the neon sign (reversed, we're inside) flickers
    const wx = 470, wy = 44, ww = 170, wh = 206;
    g.save(); g.beginPath(); g.rect(wx, wy, ww, wh); g.clip();
    for (let i = 0; i < 40; i++) { const x = wx + msX_H(i, 1) * ww, y = wy + ((msX_H(i, 2) * wh + t * (220 + msX_H(i, 3) * 80)) % wh); g.globalAlpha = 0.5; line(x, y, x - 2, y + 8, '#8a9ac8'); }
    g.globalAlpha = 1;
    for (let i = 0; i < 8; i++) { const x = wx + 10 + msX_H(i, 7) * (ww - 20), y = wy + ((msX_H(i, 8) * wh + t * (6 + msX_H(i, 9) * 10)) % wh); rect(Math.round(x), Math.round(y), 2, 3, '#b8c8f0'); px(Math.round(x), Math.round(y) - 3, '#6a7aa8'); }
    const on = !(((t * 3) | 0) % 17 === 0 || ((t * 7) | 0) % 23 === 0);
    if (on) msX_glow(wx + 85, wy + 20, 90, 22, '#ff3a9a', 0.4, 5);
    g.drawImage(msX_neon(on), wx + 5, wy + 10);
    g.restore();
    // one tube flickers
    const fl = ((t * 11) | 0) % 13 === 0 || ((t * 5) | 0) % 19 === 0;
    if (fl) { rect(380, 16, 120, 6, '#8a9a96'); } else { msX_glow(440, 22, 70, 14, '#ffffff', 0.25, 3); }
  });
  blit(msX_r0Washers(), 0, 0);
  fine(() => {
    // Max's machine (third) tumbles: coloured clothes rolling round the drum, a slosh line
    const drums = [[282, 226, 2.4], [390, 226, -1.1]];
    for (const [pcx, pcy, sp] of drums) {
      g.save(); g.beginPath(); g.ellipse(pcx, pcy, 26, 21.5, 0, 0, Math.PI * 2); g.clip();
      if (sp) {
        const a0 = t * sp; rect(pcx - 26, pcy + 4 + Math.round(Math.sin(t * 3) * 2), 52, 20, '#3a7ab4'); rect(pcx - 26, pcy + 4 + Math.round(Math.sin(t * 3) * 2), 52, 1, '#9ad0f0');
        for (let k = 0; k < 6; k++) { const a = a0 + k * 1.05, r = 12 + (k % 2) * 5; msX_ov(pcx + Math.cos(a) * r, pcy + Math.sin(a) * r * 0.8, 7, 5, ['#c8302a', '#f4f0e8', '#2a5ac8', '#e8c040', '#f4f0e8', '#3a8a4a'][k]); }
        for (let k = 0; k < 5; k++) { const ph = (t * 1.3 + k / 5) % 1; msX_ov(pcx - 14 + k * 7, pcy + 20 - ph * 30, 1.5, 1.5, '#e0f4ff'); }
      }
      g.restore();
      // glass: reflection arcs
      msX_crv(pcx - 18, pcy - 10, pcx - 12, pcy - 18, pcx - 2, pcy - 20, 2, 'rgba(255,255,255,0.35)', 6);
    }
  });
  blit(msX_r0Max(sex), 0, 0);
}
// the laundromat's neon, seen from inside: LAUNDROMAT in fat pink tubes, mirrored
function msX_neon(on) {
  const k = 'msX_neon' + (on ? 1 : 0); let c = spriteCache.get(k); if (c) return c;
  const w = 160, h = 22, src = msX_lay(w, h, () => {
    const tw = textW('LAUNDROMAT'); g.save(); g.translate(Math.round((w - tw * 2) / 2), 3); g.scale(2, 2); text('LAUNDROMAT', 0, 0, on ? '#ff5ab0' : '#4a1430'); g.restore();
    if (on) { g.save(); g.translate(Math.round((w - tw * 2) / 2), 3); g.scale(2, 2); text('LAUNDROMAT', 0, 0, '#ffd8ee'); g.restore();
      const im = g.getImageData(0, 0, w, h), d = im.data; // core stays hot, rim goes pink
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (!d[i + 3]) continue; const edge = !(x & 1) || !(y & 1); if (edge) { d[i] = 255; d[i + 1] = 80; d[i + 2] = 170; } } g.putImageData(im, 0, 0); }
  });
  c = msX_lay(w, h, () => { g.save(); g.translate(w, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); g.restore(); });
  spriteCache.set(k, c); return c;
}

function msX_r1Beam() {
  return art('msX_r1Beam', 320, 200, () => {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) { g.globalAlpha = 0.035; const i = k * 10; msX_poly([[204, 56 + i], [204, 236 - i], [380 + k * 20, 300 - i * 0.6], [610 - k * 20, 300 - i * 0.6], [610 - k * 20, 134 + i], [380 + k * 20, 70 + i]], '#ffd890'); }
    g.restore();
  });
}
