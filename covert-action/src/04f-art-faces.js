// ===================================================================
// ART 04f: suspect portraits - shaded 16-colour EGA mugshots
// (helpers prefixed fcX_; drawFace / drawUnknownFace override 04-art.js)
// Two hand-tuned masters: 52x64 (big) and 26x32 (small). The head, hair,
// neck, body, beard and hat are shaded shapes defined in 52x64 units and
// sampled at either scale; eyes, brows, nose, mouth, collar, tie and
// glasses are placed pixel by pixel for each master. Other sizes are
// resampled from the nearer master. Every result is cached per face+size.
// ===================================================================
const fcX_dither0 = dither; // 04e swaps the global dither out to get a portrait without backdrop
const fcX_L = (() => { const l = [-0.36, -0.36, 0.86], n = Math.hypot(l[0], l[1], l[2]); return [l[0] / n, l[1] / n, l[2] / n]; })();
function fcX_hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); return (h ^ (h >>> 15)) >>> 0; }
function fcX_n(a, b) { let n = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
function fcX_key(f) { return [f.sex, f.skin, f.hair, f.hairStyle, f.beard, f.glasses, f.hat ? 1 : 0, f.jacket, f.tie, f.eyes, f.bg, f.jaw].join('|'); }
const fcX_gs = (u, v, x, y, r) => Math.exp(-((u - x) * (u - x) + (v - y) * (v - y)) / (r * r));
const fcX_band = (t, a, b, s = 0.6) => Math.max(0, Math.min(1, (t - a) / s + 0.5)) * Math.max(0, Math.min(1, (b - t) / s + 0.5));
// ramp lookup with a tight ordered-dither band between steps (keeps flat, clean areas)
let fcX_sharp = 1.8;
function fcX_q(x, y, v, r) {
  v = v < 0 ? 0 : v > 0.999 ? 0.999 : v; const p = v * (r.length - 1), i = Math.floor(p);
  const fr = (p - i - 0.5) * fcX_sharp + 0.5;
  return BAYER[(y & 3) * 4 + (x & 3)] < fr * 16 ? r[i + 1] : r[i];
}

// ---------- colour ramps ----------
function fcX_skinR(f) { return f.skin === EGA.brown ? [P.K, P.RD, P.RD, P.BR, P.BR, P.BR] : [P.K, P.RD, P.BR, P.SK, P.SK]; }
function fcX_hairR(c) {
  switch (c) {
    case EGA.black: return [P.K, P.K, P.K, P.G1, P.G1];
    case EGA.brown: return [P.K, P.RD, P.BR, P.BR, P.BR, P.BR, P.YE];
    case EGA.dgray: return [P.K, P.G1, P.G1, P.G3];
    case EGA.yellow: return [P.BR, P.YE, P.YE, P.W];
    case EGA.lgray: return [P.G1, P.G3, P.G3, P.W];
  }
  return [P.K, c, c, P.W];
}
function fcX_clothR(c) {
  switch (c) {
    case EGA.dgray: return [P.K, P.G1, P.G1, P.G3];
    case EGA.brown: return [P.K, P.RD, P.BR, P.BR, P.YE];
    case EGA.blue: return [P.K, P.BL, P.BL, P.BL2];
    case EGA.black: return [P.K, P.K, P.K, P.G1];
    case EGA.lgray: return [P.G1, P.G3, P.G3, P.W];
    case EGA.green: return [P.K, P.GR, P.GR, P.GR2];
    case EGA.red: return [P.K, P.RD, P.RD, P.RD2];
    case EGA.magenta: return [P.K, P.MG, P.MG, P.PK];
    case EGA.cyan: return [P.K, P.TL, P.TL, P.CY];
  }
  return [P.K, c, c, P.W];
}
const fcX_SHIRT = [P.G1, P.G3, P.W, P.W, P.W];

// ---------- geometry (52x64 units, centre line x=26) ----------
function fcX_geom(f) {
  const fem = f.sex === 'f', h = fcX_hash(fcX_key(f)), r = k => fcX_n(h, k);
  const jaw = f.jaw | 0;
  const G = { f, fem, h, r, cx: 26, yT: fem ? 9.6 : 9, dark: f.skin === EGA.brown,
    hwB: (fem ? 10.5 : 11.3) + (jaw === 1 ? 0.7 : jaw === 2 ? -0.5 : 0) + (r(1) - 0.5) * 0.6,
    chinY: 45.8 + (jaw === 2 ? 1.2 : 0) - (fem ? 0.6 : 0) + (jaw === 1 && !fem ? 0.3 : 0),
    jn: fem ? [2.0, 2.5, 1.6][jaw] : [2.4, 3.8, 1.75][jaw],
    old: f.hair === EGA.lgray || (!fem && f.hairStyle === 1 && r(2) < 0.6),
    hat: !!f.hat, style: f.hairStyle | 0, gz: f.eyes ? 1 : 0 };
  G.hw = v => {
    if (v < G.yT || v > G.chinY) return 0;
    if (v < 22) return G.hwB * Math.sqrt(Math.max(0, 1 - ((22 - v) / (22 - G.yT)) ** 2));
    if (v <= 32) return G.hwB + (v > 25 ? 0.35 : 0);
    const t = (v - 32) / (G.chinY - 32); return (G.hwB + 0.35) * Math.pow(Math.max(0, 1 - Math.pow(t, G.jn)), 1 / G.jn);
  };
  // hair: outer volume and hairline (hair shows where v < hl(u))
  const s = G.style, hwB = G.hwB;
  const vol = [1.2, 0.9, 2.5, 1.7, 2.9, 3.4][s];
  G.hcy = 21.6 - vol * 0.35; G.hrx = hwB + 0.6 + vol; G.hry = 12.6 + vol;
  const steep = (adx, base, t) => adx < t ? base + 2.2 * (adx / t) ** 2 : base + 2.2 + (adx - t) * 5;
  G.hl = [
    u => steep(Math.abs(u - 26), 15.4 + (r(3) - 0.5), 9.3),
    u => { const a = Math.abs(u - 26); return a < 8.2 ? 0 : 13 + (a - 8.2) * 4; },
    u => steep(Math.abs(u - 26), 16.6 + Math.sin(u * 0.95 + r(4) * 6) * 0.9, 9.6),
    u => steep(Math.abs(u - 26), 14.9 + (u - 20) * 0.13 + (u > 21 ? 1 : 0) * Math.max(0, 1.4 - Math.abs(u - 27) * 0.2), 9.4),
    u => { const a = Math.abs(u - 26); return a < 9 ? 13.6 + a * 0.62 : 19.2 + (a - 9) * 9; },
    u => { const a = Math.abs(u - 26); return a < 8.6 ? 20.3 + Math.sin(u * 1.9) * 0.45 - (a > 6 ? (a - 6) * 0.7 : 0) : 18.5 + (a - 8.6) * 9; },
  ][s];
  if (s === 1) G.hl0 = u => steep(Math.abs(u - 26), 14.5, 9.3);
  return G;
}
// is (u,v) hair drawn in front of the face?  returns 0 (no), 1 (hair), 2 (thin/sparse hair), 3 (parting)
function fcX_hairAt(G, u, v) {
  const dx = u - 26, adx = Math.abs(dx), s = G.style, hw = G.hw(v);
  if (G.hat && v < (G.fem ? 12.5 : 15.5)) return 0;
  const inO = (dx / G.hrx) ** 2 + ((v - G.hcy) / G.hry) ** 2 < 1;
  if (s === 4) { // long: frames the face, falls over the shoulders
    if (inO && v < G.hl(u) && v < 24) return 1;
    const outer = v < 30 ? G.hwB + 3.4 : G.hwB + 3.4 + (v - 30) * 0.12;
    const bottom = 58 - Math.max(0, adx - 8) * 0.5 + fcX_n(Math.floor(u / 2), 9) * 2;
    const inner = v < 38 ? hw - 0.7 : Math.max(hw - 0.7, 6.4 + (v - 38) * 0.05);
    if (v >= 16 && v < bottom && adx < outer && adx >= inner && (inO || v > G.hcy)) return 1;
    return 0;
  }
  if (s === 5) { // bob with bangs
    if (inO && v < G.hl(u)) return 1;
    const outer = G.hwB + 3.5 - Math.max(0, v - 34) * 0.35;
    const bottom = 40.5 - Math.max(0, adx - G.hwB - 0.5) ** 2 * 0.25;
    if (v >= 16 && v < bottom && adx < outer && adx >= hw - 0.6 && (inO || v > G.hcy)) return 1;
    return 0;
  }
  if (!inO) {
    // sideburns / hair over the ears for the fuller styles
    if (s !== 1 && v > 20 && v < (s === 2 ? 31 : 29.5) && adx > hw - 1.4 && adx < hw + (s === 2 ? 1.6 : 0.9)) return 1;
    return 0;
  }
  if (s === 1) { // receding: fringe round the sides and back, thin on top
    if (v > 14.5 && v < 28.5 && adx > hw - (v < 20 ? 2.4 : 1.6) && v < G.hl0(u) + 12) return v < 17 ? 2 : 1;
    if (v < G.hl(u) && v > 12) return 1;
    return v < 14 && adx < 8 ? 2 : 0;
  }
  if (v < G.hl(u)) { if (s === 3 && v < 14.8 && v > 10 && Math.abs(u - 20.4 + (14.8 - v) * 0.15) < 0.55) return 3; return 1; }
  if (v > 20 && v < (s === 2 ? 31 : 29) && adx > hw - (s === 2 ? 1.6 : 1.2)) return 1;
  return 0;
}
function fcX_hairBack(G, u, v) { // hair behind the neck for the long styles
  const adx = Math.abs(u - 26);
  if (G.style === 4) return v > 18 && v < 57 - Math.max(0, adx - 9) && adx < G.hwB + 3.2 + Math.max(0, v - 30) * 0.12;
  if (G.style === 5) return v > 18 && v < 39.5 && adx < G.hwB + 3;
  return false;
}
function fcX_hairI(G, u, v) {
  const dx = u - 26;
  let nx = dx / (G.hrx + 1.5), ny = v < G.hcy ? (v - G.hcy) / (G.hry + 1) : 0.15;
  const d = nx * nx + ny * ny; if (d > 0.96) { const k = Math.sqrt(0.96 / d); nx *= k; ny *= k; }
  const nz = Math.sqrt(1 - nx * nx - ny * ny);
  let I = 0.12 + 0.95 * Math.max(0, nx * fcX_L[0] + ny * fcX_L[1] + nz * fcX_L[2]);
  // strands: radiate from the crown / parting, run straight down the long sides
  const ox = G.style === 3 ? 20.4 : 26, oy = G.style >= 4 ? 8 : 12;
  let strand;
  if (v > G.hcy + 2 && (G.style >= 4 || Math.abs(dx) > G.hwB - 1)) strand = Math.floor(u * 0.8 + Math.sin(v * 0.25) * 0.8);
  else strand = Math.floor(Math.atan2(u - ox, oy - v + 30) * 26 + (G.style === 3 && u > ox ? 7 : 0));
  I += (fcX_n(strand, G.h & 1023) - 0.5) * (G.style === 0 || G.style === 1 ? 0.18 : 0.3) * (G.S || 1);
  return I;
}
function fcX_faceI(G, u, v) {
  const hw = G.hw(v); if (hw <= 0) return null; const dx = u - 26; if (Math.abs(dx) > hw) return null;
  let nx = dx / (hw + 0.9) * (Math.abs(dx) < hw - 3 ? 0.7 : 0.7 + (Math.abs(dx) - hw + 3) * 0.1), ny = v < 22 ? -(22 - v) / (22 - G.yT) * 0.95 : v > 32 ? (v - 32) / (G.chinY - 32) * 0.6 : 0;
  const d = nx * nx + ny * ny; if (d > 0.97) { const k = Math.sqrt(0.97 / d); nx *= k; ny *= k; }
  const nz = Math.sqrt(1 - nx * nx - ny * ny);
  let I = 0.1 + 0.98 * Math.max(0, nx * fcX_L[0] + ny * fcX_L[1] + nz * fcX_L[2]);
  I -= 0.3 * (fcX_gs(u, v, 21.5, 26.2, 2.8) + fcX_gs(u, v, 30.5, 26.2, 2.8) * 1.1); // eye sockets
  I += 0.08 * fcX_gs(u, v, 26, 20, 4); // brow
  I += 0.1 * fcX_gs(u, v, 19.5, 31.5, 2.6) + 0.05 * fcX_gs(u, v, 33, 31.5, 2.2); // cheekbones
  I -= 0.12 * fcX_gs(u, v, 33.5, 36, 3); // cheek hollow
  I += 0.14 * fcX_band(u, 24.4, 26.1) * fcX_band(v, 27.5, 34.5); // lit side of the nose
  I -= 0.34 * fcX_band(u, 26.6, 28.6) * fcX_band(v, 28.5, 35); // shadow side of the nose
  I -= 0.32 * fcX_band(v, 35.4, 37) * fcX_band(Math.abs(dx), -1, 2.6); // under the nose
  I -= 0.18 * fcX_band(v, 41.8, 43) * fcX_band(Math.abs(dx), -1, 2.4); // under the lower lip
  I += 0.1 * fcX_gs(u, v, 25, 44.2, 1.7); // chin
  if (G.style !== 1) { const hd = v - G.hl(u); if (hd >= 0 && hd < 1.6) I -= 0.28; } // hair casts on the forehead
  if (G.hat) I -= G.fem ? 0 : 0.34 * fcX_band(v, 0, 19.5, 1.2);
  if (G.style === 1) I += 0.12 * fcX_gs(u, v, 22, 13, 3); // shine on a bald dome
  return I;
}
function fcX_earI(G, u, v, side) {
  const ex = 26 + side * (G.hw(30) + 0.5), ey = 30.2, rx = 2.1, ry = 3.9;
  const nx = (u - ex) / rx, ny = (v - ey) / ry, d = nx * nx + ny * ny; if (d > 1) return null;
  let I = 0.15 + 0.85 * Math.max(0, nx * fcX_L[0] + ny * fcX_L[1] + Math.sqrt(1 - d) * fcX_L[2]);
  I -= 0.4 * fcX_gs(u, v, ex - side * 0.4, ey - 0.3, 1.3);
  return side > 0 ? I - 0.12 : I;
}
function fcX_neckI(G, u, v) {
  const nw = G.fem ? 4.3 : 5.3, dx = u - 26; if (v < 33 || v > 62 || Math.abs(dx) > nw) return null;
  const nx = dx / (nw + 0.6);
  let I = 0.12 + 0.8 * Math.max(0, nx * fcX_L[0] + Math.sqrt(1 - nx * nx) * fcX_L[2]);
  const sh = G.chinY + 2.8 - Math.abs(dx) * 0.2; if (v < sh) I -= 0.38; else if (v < sh + 1.5) I -= 0.18;
  return I;
}
function fcX_bodyHW(G, v) { const top = G.fem ? 49.5 : 48, w0 = G.fem ? 8.2 : 9.6, w1 = G.fem ? 23.5 : 27; if (v < top) return 0; return w0 + (w1 - w0) * Math.sqrt(Math.min(1, (v - top) / 9.5)); }
function fcX_bodyI(G, u, v) {
  const hw = fcX_bodyHW(G, v), dx = u - 26, adx = Math.abs(dx); if (hw <= 0 || adx > hw) return null;
  const nx = dx / (hw + 3);
  let I = 0.15 + 0.8 * Math.max(0, nx * fcX_L[0] + Math.sqrt(1 - nx * nx) * fcX_L[2]);
  if (v < (G.fem ? 54 : 53)) I += 0.1; // shoulder tops catch the light
  I -= 0.3 * fcX_band(adx, 16.4, 17.6) * fcX_band(v, 57, 70); // arm / torso crease
  return I;
}
function fcX_beardAt(G, u, v) {
  const dx = u - 26, adx = Math.abs(dx), hw = G.hw(v);
  if (G.f.beard === 1) { const top = 36.4 + adx * 0.08, bot = 38.6 + adx * 0.22; return v > top && v < bot && adx < 5.3 - Math.max(0, v - 38.5) * 0.8; }
  if (G.f.beard !== 2) return false;
  if (v > 36.2 + adx * 0.08 && v < 38.7 && adx < 5.3) return true; // moustache
  if (v > 38.5 && v < 42.2 && adx < 3.4) return false; // mouth
  if (v > 25 && v < G.chinY + 1.4) {
    const w = v > G.chinY - 0.5 ? G.hw(G.chinY - 0.5) * Math.sqrt(Math.max(0, 1 - (v - G.chinY + 0.5) / 2)) + 0.8 : hw + 0.6;
    if (adx > w) return false;
    if (v > 33) return v > 38 || adx > hw - 3.8 - (v - 33) * 0.3 || adx > 6.5 - (v - 33) * 0.2;
    return adx > hw - 1.6;
  }
  return false;
}
// the fedora (men) / beret (women)
function fcX_hatAt(G, u, v) {
  const dx = u - 26, adx = Math.abs(dx);
  if (G.fem) {
    const bx = dx + 2.5, e = (bx / 14.8) ** 2 + ((v - 11.2) / 5.2) ** 2;
    if (e < 1) return { part: 'crown', I: 0.15 + 0.85 * Math.max(0, -bx / 16 * 0.55 + (11.2 - v) / 6 * 0.45 + 0.4) };
    if (Math.abs(u - 24) < 1 && v > 5 && v < 7) return { part: 'crown', I: 0.6 };
    return null;
  }
  const bv = 15.6 + (adx / 18.8) ** 2 * -1.6 + (adx < 10 ? 0.6 : 0);
  if (adx < 18.8 && v > bv - 2.3 && v < bv + 1.1) return { part: v > bv - 0.2 ? 'under' : 'brim', I: v > bv - 0.2 ? 0.1 : 0.55 - dx / 60 };
  const top = 3.4 + (adx < 3.6 ? 1.1 : 0) + (adx > 8.2 ? (adx - 8.2) * 1.3 : 0);
  if (adx < 10.8 && v > top && v < 15.2) {
    if (v > 11.4 && v < 13.4) return { part: 'band', I: 0.4 - dx / 30 };
    const nx = dx / 12; return { part: 'crown', I: 0.18 + 0.8 * Math.max(0, nx * fcX_L[0] + Math.sqrt(1 - nx * nx) * fcX_L[2]) - (adx < 3.6 && v < 6 ? 0.2 : 0) };
  }
  return null;
}

// paint a field over a W x H grid sampled at scale S (52x64 units)
function fcX_paint(S, W, H, fn) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = fn((x + 0.5) / S, (y + 0.5) / S, x, y); if (c) px(x, y, c); }
}

// ---------- the portrait, drawn without background ----------
function fcX_render(f, big) {
  const S = big ? 1 : 0.5, W = big ? 52 : 26, H = big ? 64 : 32, G = fcX_geom(f); G.S = big ? 1 : 0.45; fcX_sharp = big ? 1.8 : 2.6;
  const skR = fcX_skinR(f), hR = fcX_hairR(f.hair), jR = fcX_clothR(f.jacket);
  const q = fcX_q;
  // hair behind the head
  fcX_paint(S, W, H, (u, v, x, y) => fcX_hairBack(G, u, v) ? q(x, y, fcX_hairI(G, u, v) - 0.3, hR) : null);
  // neck and shoulders
  fcX_paint(S, W, H, (u, v, x, y) => { const I = fcX_neckI(G, u, v); return I === null ? null : q(x, y, I, skR); });
  fcX_paint(S, W, H, (u, v, x, y) => { const I = fcX_bodyI(G, u, v); return I === null ? null : q(x, y, I, jR); });
  (big ? fcX_clothesBig : fcX_clothesSmall)(G, skR, jR);
  // ears, face
  fcX_paint(S, W, H, (u, v, x, y) => { let I = fcX_earI(G, u, v, -1); if (I === null) I = fcX_earI(G, u, v, 1); return I === null ? null : q(x, y, I, skR); });
  fcX_paint(S, W, H, (u, v, x, y) => { const I = fcX_faceI(G, u, v); return I === null ? null : q(x, y, I, skR); });
  (big ? fcX_featBig : fcX_featSmall)(G, skR, hR);
  // beard
  if (f.beard) fcX_paint(S, W, H, (u, v, x, y) => {
    if (!fcX_beardAt(G, u, v)) return null;
    const fi = fcX_faceI(G, u, v);
    return q(x, y, (fi === null ? 0.25 : fi * 0.75) + 0.05 + (fcX_n(Math.floor(u * 1.4), Math.floor(v / 2.5)) - 0.5) * 0.3, hR);
  });
  if (f.beard && !big) fcX_mouthSmall(G, true);
  if (f.beard && big) fcX_mouthBig(G, true);
  // hair in front
  fcX_paint(S, W, H, (u, v, x, y) => {
    const k = fcX_hairAt(G, u, v); if (!k) return null;
    if (k === 2 && BAYER[(y & 3) * 4 + (x & 3)] > (big ? 6 : 8)) return null;
    if (k === 3) return hR[1];
    return q(x, y, big ? fcX_hairI(G, u, v) : 0.68 + (fcX_hairI(G, u, v) - 0.62) * 0.62, hR);
  });
  (big ? fcX_glassesBig : fcX_glassesSmall)(G);
  // hat
  if (G.hat) {
    const hc = G.fem ? [[P.K, P.RD, P.RD, P.RD2], [P.K, P.BL, P.BL, P.BL2], [P.K, P.MG, P.MG, P.PK], [P.K, P.K, P.G1, P.G3]][G.h % 4]
      : [[P.K, P.K, P.G1, P.G1, P.G3], [P.K, P.RD, P.BR, P.BR], [P.K, P.K, P.K, P.G1], [P.G1, P.G1, P.G3, P.G3, P.W]][G.h % 4];
    const band = G.fem ? hc[0] : [P.K, P.K, P.RD, P.K][G.h % 4];
    fcX_paint(S, W, H, (u, v, x, y) => { const k = fcX_hatAt(G, u, v); if (!k) return null; return k.part === 'band' ? (big && (x + y) % 5 === 0 ? hc[1] : band) : k.part === 'under' ? hc[0] : q(x, y, k.I, hc); });
  }
}

// ---------- 52x64 hand-placed details ----------
function fcX_clothesBig(G, skR, jR) {
  const f = G.f, sh = G.dark ? P.RD : P.BR;
  if (!G.fem) {
    // shirt in the jacket's V, collar wings, tie, lapels
    for (let y = 47; y < 64; y++) { const vw = Math.max(1, Math.round(7 - (y - 47) * 0.42)); for (let x = 26 - vw; x < 26 + vw; x++) px(x, y, fcX_q(x, y, x < 26 ? 0.95 : 0.62, fcX_SHIRT)); }
    for (let y = 46; y < 49; y++) for (let x = 20; x < 32; x++) px(x, y, fcX_q(x, y, x < 26 ? 0.9 : 0.6, fcX_SHIRT));
    const tR = fcX_clothR(f.tie), stripe = G.r(20) < 0.45;
    for (let y = 49; y < 64; y++) {
      const tw = y < 52 ? 2.2 - (y - 49) * 0.2 : 1.2 + (y - 52) * 0.14;
      for (let x = Math.round(26 - tw); x < Math.round(26 + tw); x++) {
        let I = x < 26 ? 0.72 : 0.42; if (y === 52 || y === 49) I -= 0.3;
        if (stripe && y > 52 && (x + y) % 4 === 0) I += 0.5;
        px(x, y, fcX_q(x, y, I, tR));
      }
    }
    // collar wings (outlined in grey)
    for (const s of [-1, 1]) {
      const pts = [[26 + s * 6.5, 46], [26 + s * 2.3, 49.5], [26 + s * 3, 55], [26 + s * 7.4, 50]];
      fcX_poly(pts, P.W); if (s > 0) fcX_poly([[26 + s * 5, 50], [26 + s * 3.2, 53.8], [26 + s * 3, 55], [26 + s * 7.4, 50]], P.G3);
      line(26 + s * 2.4, 49.6, 26 + s * 3, 55, P.G3);
      line(26 + s * 3, 55, 26 + s * 7.4, 50, P.G1);
    }
    // lapel edges and notches
    for (const s of [-1, 1]) {
      const c = s < 0 ? jR[1] : jR[0];
      line(26 + s * 7.6, 50, 26 + s * 1.5, 63, P.K);
      line(26 + s * 7.6, 50, 26 + s * 11, 53, c); line(26 + s * 11, 53, 26 + s * 9.4, 55, c); line(26 + s * 9.4, 55, 26 + s * 5.6, 63, c);
    }
    px(25, 63, P.K); px(26, 63, P.K);
    return;
  }
  // women: open V-neck with a white blouse collar and maybe a necklace
  const vt = 59;
  for (let y = 46; y < vt; y++) { const vw = Math.max(0.5, 5.6 - (y - 47) * 0.45); for (let x = Math.round(26 - vw); x < Math.round(26 + vw); x++) { const nx = (x + 0.5 - 26) / 7; px(x, y, fcX_q(x, y, 0.2 + 0.75 * Math.max(0, nx * fcX_L[0] + Math.sqrt(1 - nx * nx) * fcX_L[2]) - (y < 51 ? 0.2 : 0), skR)); } }
  for (let y = 47; y < 64; y++) {
    const vw = 5.6 - (y - 47) * 0.45;
    for (let k = 0; k < 3; k++) for (const s of [-1, 1]) {
      const x = Math.round(26 + s * (Math.max(0, vw) + k + 0.5) - (s < 0 ? 1 : 0)); if (y >= vt - 1 && Math.abs(x + 0.5 - 26) > 3 + (y - vt)) continue;
      px(x, y, k === 2 ? P.G3 : fcX_q(x, y, s < 0 ? 0.9 : 0.55, fcX_SHIRT));
    }
  }
  for (let y = 58; y < 64; y++) for (let x = 24; x < 28; x++) px(x, y, fcX_q(x, y, x < 26 ? 0.9 : 0.6, fcX_SHIRT));
  if (G.r(21) < 0.5) { const c = G.r(22) < 0.5 ? P.W : P.YE; for (let x = 21; x <= 30; x += 2) { const y = Math.round(49.5 + ((x + 0.5 - 26) / 4.5) ** 2 * -1 + 3.5); px(x, y, c); } }
}
function fcX_featBig(G, skR) {
  const f = G.f, fem = G.fem, dark = G.dark;
  const mid = dark ? P.RD : P.BR, deep = dark ? P.K : P.RD;
  const bc = { [EGA.black]: P.K, [EGA.brown]: dark ? P.K : P.RD, [EGA.dgray]: P.K, [EGA.yellow]: P.BR, [EGA.lgray]: P.G1 }[f.hair] || P.K;
  const ic = dark ? (G.r(30) < 0.5 ? P.BR : P.K) : [P.BL, P.BR, P.GR, P.TL, P.BL2, P.K][Math.floor(G.r(30) * 6)];
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? 19 : 28, M = (xx) => s < 0 ? xx : 51 - xx; // mirror about the centre
    // brows
    const tilt = G.r(31) < 0.25 ? 1 : 0, bushy = !fem && G.r(32) < 0.35;
    if (fem) { for (const [a, b] of [[20, 21], [21, 21], [22, 21], [19, 22], [23, 22], [24, 22 + tilt], [18, 23]]) px(M(a), b, bc); }
    else {
      for (let a = 20; a <= 22; a++) px(M(a), 21, bc);
      for (let a = 18; a <= 24; a++) px(M(a), 22, bc);
      if (tilt) px(M(24), 23, bc);
      if (bushy) { px(M(21), 20, bc); px(M(22), 20, bc); for (let a = 19; a <= 23; a++) px(M(a), 23, bc); }
    }
    // upper lid, eye, lower lid
    for (let a = 0; a < 5; a++) px(M(19 + a), 26, fem || a > 0 ? P.K : deep);
    if (fem) { px(M(18), 26, P.K); px(M(17), 25, P.K); px(M(18), 25, fem && !dark ? mid : P.K); }
    for (let a = 0; a < 5; a++) px(x0 + a, 27, P.W);
    px(M(19), 28, skR[2]); px(M(23), 28, P.W); for (let a = 1; a < 4; a++) px(x0 + a, 28, P.W); for (let a = 1; a < 4; a++) px(x0 + a, 29, a === 2 ? mid : skR[3]);
    const pcc = x0 + 2 + G.gz;
    px(pcc - 1, 27, ic); px(pcc + 1, 27, ic); px(pcc, 27, P.K); px(pcc, 28, ic);
    if (!dark || ic !== P.K) px(pcc - 1, 27, ic === P.K ? P.G1 : ic);
    // lid crease and bags
    if (fem && G.r(33) < 0.6) for (let a = 1; a < 4; a++) px(M(19 + a), 25, G.r(34) < 0.5 ? P.BL : P.MG); 
    if (G.old) { px(M(20), 29, mid); px(M(21), 30, mid); px(M(22), 30, mid); px(M(17), 27, mid); px(M(17), 29, mid); }
    else px(M(21), 29, (x0 + G.h) & 1 ? mid : skR[3]);
  }
  // nose
  const nw = G.r(35) < 0.3 ? 1 : 0;
  px(27, 29, mid); px(27, 30, mid); px(28, 31, mid); px(28, 32, mid); px(28, 33, deep);
  px(25 - nw, 34, mid); px(26 + nw, 34, skR[3]); px(24 - nw, 35, deep); px(27 + nw, 35, deep); px(25, 35, mid); px(26, 35, mid);
  px(25, 32, skR[4]); px(25, 33, skR[4]);
  if (!f.beard) fcX_mouthBig(G, false);
  // age lines and blush
  if (G.old) { for (let x = 22; x < 30; x++) if (x % 3) px(x, 17, mid); for (let x = 21; x < 31; x++) if ((x + 1) % 3) px(x, 19, mid); px(22, 37, mid); px(21, 38, mid); px(30, 37, mid); px(31, 38, mid); }
  if (fem && !dark) for (const [a, b] of [[19, 33], [20, 34], [32, 33], [31, 34]]) px(a, b, P.PK);
  if (fem && G.r(36) < 0.55) { const ec = G.r(37) < 0.5 ? P.YE : P.W; const ex = Math.round(26 - G.hw(30) - 1.2); px(ex, 35, ec); px(51 - ex, 35, ec); }
}
function fcX_mouthBig(G, beard) {
  const fem = G.fem, dark = G.dark, mid = dark ? P.RD : P.BR, deep = dark ? P.K : P.RD;
  const mw = fem ? 4 : 3 + (G.r(40) < 0.4 ? 1 : 0), mood = G.r(41) < 0.25 ? -1 : G.r(41) > 0.75 ? 1 : 0; // -1 frown 0 flat 1 smirk
  if (fem) {
    const lip = G.r(42) < 0.6 ? P.RD : P.MG, hi = lip === P.RD ? (dark ? P.RD2 : P.PK) : P.PK;
    for (let x = 26 - mw + 1; x < 26 + mw - 1; x++) px(x, 38, (x === 25 || x === 26) ? mid : lip);
    px(24, 38, lip); px(27, 38, lip);
    for (let x = 26 - mw + 1; x < 26 + mw - 1; x++) px(x, 39, lip);
    for (let x = 26 - mw; x < 26 + mw; x++) px(x, 40, dark ? P.K : P.RD === lip ? P.K : P.RD);
    for (let x = 26 - mw + 1; x < 26 + mw - 1; x++) px(x, 41, lip);
    for (let x = 25 - mw + 3; x < 27 + mw - 3; x++) px(x, 42, lip);
    px(24, 41, hi); px(25, 41, hi);
    return;
  }
  if (!beard) for (let x = 26 - mw + 1; x < 26 + mw - 1; x++) px(x, 39, mid);
  for (let x = 26 - mw; x < 26 + mw; x++) px(x, 40, deep);
  const cy = 40 - (mood > 0 ? 1 : 0) + (mood < 0 ? 1 : 0);
  px(26 - mw - 1, cy, deep); if (mood !== 1) px(26 + mw, cy, deep); else px(26 + mw, 39, deep);
  for (let x = 26 - mw + 1; x < 26 + mw - 1; x++) px(x, 41, x < 26 ? (dark ? P.BR : P.SK) : mid);
  if (beard) { px(26 - mw, 41, mid); px(26 + mw - 1, 41, mid); }
}
function fcX_glassesBig(G) {
  const gl = G.f.glasses; if (!gl) return;
  const fc = gl === 2 ? P.K : [P.K, P.K, P.YE, P.G1][G.h % 4];
  for (const s of [-1, 1]) {
    const M = xx => s < 0 ? xx : 51 - xx;
    // rounded rectangular rims around each eye
    for (let a = 18; a <= 24; a++) { px(M(a), 24, fc); px(M(a), 30, fc); }
    for (let b = 25; b <= 29; b++) { px(M(17), b, fc); px(M(25), b, fc); }
    if (gl === 2) {
      for (let b = 25; b <= 29; b++) for (let a = 18; a <= 24; a++) px(M(a), b, P.K);
      px(M(19), 25, P.G1); px(M(20), 25, P.BL2); px(M(19), 26, P.BL); px(M(23), 28, P.G1); px(M(22), 29, P.BL);
    } else { px(M(23), 28, P.W); px(M(22), 29, P.W); }
    // temples back to the ears
    const ex = Math.round(26 - G.hw(26) + 0.4); for (let a = ex; a < 17; a++) px(M(a), 25, fc);
  }
  px(26, 25, fc); px(25, 25, fc); px(25, 26, P.K === fc ? P.K : fc);
}

// ---------- 26x32 hand-placed details ----------
function fcX_clothesSmall(G, skR, jR) {
  const f = G.f;
  if (!G.fem) {
    const rows = ['WWWWWW', 'WWWWWW', 'WW..WW', ' W..W ', '  ..  ', '  ..  ', '  ..  ', '  ..  '];
    for (let j = 0; j < 8; j++) for (let i = 0; i < 6; i++) { const ch = rows[j][i]; if (ch === 'W') px(10 + i, 23 + j, i < 3 ? P.W : P.G3); }
    const tR = fcX_clothR(f.tie);
    for (let y = 24; y < 32; y++) { px(12, y, tR[y === 25 ? 1 : 2]); px(13, y, tR[1]); }
    px(12, 31, tR[1]); px(13, 31, tR[1]);
    px(12, 25, tR[0]); px(13, 25, tR[0]);
    for (let j = 0; j < 7; j++) { px(10 - Math.floor(j / 3), 25 + j, jR[j > 1 ? 1 : 0]); }
    line(9, 25, 11, 31, P.K); line(16, 25, 14, 31, P.K);
    line(8, 26, 7, 27, jR[jR.length - 1]);
    return;
  }
  for (let y = 23; y < 29; y++) { const vw = Math.max(0, 3 - (y - 23) * 0.5); for (let x = Math.round(13 - vw); x < Math.round(13 + vw); x++) px(x, y, fcX_q(x, y, x < 13 ? 0.75 : 0.5, skR)); }
  for (let y = 23; y < 32; y++) { const vw = Math.max(0, 3 - (y - 23) * 0.5); const a = Math.round(13 - vw) - 1, b = Math.round(13 + vw); px(a, y, P.W); px(b, y, P.G3); if (y > 25) { px(a - 1, y, P.G3); } }
  if (G.r(21) < 0.5) { const c = G.r(22) < 0.5 ? P.W : P.YE; px(11, 25, c); px(13, 26, c); px(15, 25, c); }
}
function fcX_featSmall(G, skR) {
  const f = G.f, fem = G.fem, dark = G.dark, mid = dark ? P.RD : P.BR, deep = dark ? P.K : P.RD;
  const bc = { [EGA.black]: P.K, [EGA.brown]: dark ? P.K : P.RD, [EGA.dgray]: P.K, [EGA.yellow]: P.BR, [EGA.lgray]: P.G1 }[f.hair] || P.K;
  for (const s of [-1, 1]) {
    const M = xx => s < 0 ? xx : 25 - xx;
    if (fem) { px(M(9), 10, bc); px(M(10), 10, bc); px(M(8), 11, bc); px(M(11), 11, G.r(31) < 0.25 ? bc : mid); }
    else { px(M(9), 10, bc); px(M(10), 10, bc); px(M(11), 10 + (G.r(31) < 0.25 ? 1 : 0), bc); px(M(8), 11, bc); if (G.r(32) < 0.35) px(M(9), 11, bc); }
    // lid + eye
    if (f.glasses) { /* the rims take the lid row */ }
    else if (fem) { px(M(8), 12, P.K); px(M(9), 12, P.K); px(M(10), 12, P.K); px(M(11), 12, mid); }
    else if (G.old) px(M(10), 12, mid);
    const x0 = s < 0 ? 9 : 14;
    px(x0, 13, P.W); px(x0 + 1, 13, P.W); px(x0 + 2, 13, P.W);
    px(x0 + 1 + G.gz, 13, P.K);
    if (G.old) px(M(10), 14, mid);
  }
  // nose
  px(13, 14, mid); px(13, 15, mid); px(14, 16, mid); px(12, 17, deep); px(13, 17, mid);
  if (!f.beard) fcX_mouthSmall(G, false);
  if (fem && !dark) { px(8, 16, P.PK); px(17, 16, P.PK); }
  if (G.old) { px(11, 8, mid); px(13, 8, mid); px(14, 8, mid); }
}
function fcX_mouthSmall(G, beard) {
  const dark = G.dark, mid = dark ? P.RD : P.BR, deep = dark ? P.K : P.RD;
  if (G.fem) { const lip = G.r(42) < 0.6 ? P.RD : P.MG; px(11, 19, lip); px(12, 19, lip); px(13, 19, lip); px(14, 19, lip); px(12, 20, lip); px(12, 20, lip); px(13, 20, lip === P.RD ? P.RD : P.PK); return; }
  const mood = G.r(41) < 0.25 ? -1 : G.r(41) > 0.75 ? 1 : 0;
  px(11, 20, deep); px(12, 20, deep); px(13, 20, deep); px(14, 20, deep);
  if (mood < 0) { px(10, 21, mid); } else if (mood > 0) { px(15, 19, mid); }
  if (!beard) px(12, 21, dark ? P.BR : P.SK);
}
function fcX_glassesSmall(G) {
  const gl = G.f.glasses; if (!gl) return;
  const fc = gl === 2 ? P.K : [P.K, P.K, P.YE, P.G1][G.h % 4];
  if (gl === 2) { rect(8, 12, 10, 3, P.K); px(9, 12, P.G1); px(14, 12, P.G1); px(10, 13, P.BL); px(15, 13, P.BL); px(7, 12, P.K); px(18, 12, P.K); return; }
  for (const x0 of [8, 13]) { rect(x0 + 1, 12, 3, 1, fc); rect(x0 + 1, 14, 3, 1, fc); px(x0, 13, fc); px(x0 + 4, 13, fc); } px(7, 12, fc); px(18, 12, fc); px(10, 14, P.W === fc ? P.G3 : fc);
}

// scanline polygon fill
function fcX_poly(pts, c) {
  let y0 = 1e9, y1 = -1e9; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    const sy = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) xs.push(a[0] + (sy - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]); if (xb > xa) rect(xa, y, xb - xa, 1, c); }
  }
}

// ---------- masters and resampling ----------
const fcX_masters = new Map();
function fcX_master(f, big) {
  const k = fcX_key(f) + (big ? 'B' : 's');
  let c = fcX_masters.get(k); if (c) return c;
  c = document.createElement('canvas'); c.width = big ? 52 : 26; c.height = big ? 64 : 32;
  drawTo(c.getContext('2d'), () => fcX_render(f, big));
  fcX_masters.set(k, c); return c;
}
// area resample that keeps small dark features (eyes, brows, mouth) alive
function fcX_resample(src, w, h) {
  const sw = src.width, sh = src.height, sd = src.getContext('2d').getImageData(0, 0, sw, sh).data;
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const oc = out.getContext('2d'), im = oc.createImageData(w, h), od = im.data;
  const fx = sw / w, fy = sh / h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const x0 = x * fx, x1 = x0 + fx, y0 = y * fy, y1 = y0 + fy, votes = new Map(); let alpha = 0, tot = 0;
    for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
      const wgt = (Math.min(x1, sx + 1) - Math.max(x0, sx)) * (Math.min(y1, sy + 1) - Math.max(y0, sy)); if (wgt <= 0) continue;
      const i = (sy * sw + sx) * 4; tot += wgt; if (sd[i + 3] < 128) continue; alpha += wgt;
      const lum = sd[i] * 0.3 + sd[i + 1] * 0.59 + sd[i + 2] * 0.11, key = (sd[i] << 16) | (sd[i + 1] << 8) | sd[i + 2];
      const bonus = lum < 60 ? 1.7 : sd[i] === 255 && sd[i + 1] === 255 && sd[i + 2] === 255 ? 1.4 : 1;
      votes.set(key, (votes.get(key) || 0) + wgt * bonus);
    }
    if (alpha < tot * 0.5) continue;
    let best = 0, bv = -1; for (const [k, v] of votes) if (v > bv) { bv = v; best = k; }
    const o = (y * w + x) * 4; od[o] = best >> 16; od[o + 1] = (best >> 8) & 255; od[o + 2] = best & 255; od[o + 3] = 255;
  }
  oc.putImageData(im, 0, 0); return out;
}

// ---------- dossier photo: draw face f into (x, y, w, h) ----------
function drawFace(f, x, y, w = 26, h = 32) {
  w = Math.round(w); h = Math.round(h);
  const noBg = dither !== fcX_dither0;
  const c = sprite('fcX' + fcX_key(f) + (noBg ? '~' : '') + w + 'x' + h, w, h, () => {
    g.imageSmoothingEnabled = false;
    // backdrop: the global dither (a darker rim, a lighter halo behind the head)
    dither(0, 0, w, h, f.bg, P.K, 5);
    dither(Math.round(w * 0.15), Math.round(h * 0.06), Math.round(w * 0.7), Math.round(h * 0.6), f.bg, P.K, 2);
    let layer;
    if (w === 52 && h === 64) layer = fcX_master(f, true);
    else if (w === 26 && h === 32) layer = fcX_master(f, false);
    else if (w > 52 || w < 26) layer = fcX_master(f, w > 52);
    else layer = fcX_resample(fcX_master(f, true), w, h);
    g.drawImage(layer, 0, 0, w, h);
  });
  g.drawImage(c, Math.round(x), Math.round(y));
}
// no photo on file: a shadowy silhouette and a question mark
function drawUnknownFace(x, y) {
  const c = sprite('fcXunknown', 26, 32, () => {
    for (let yy = 0; yy < 32; yy++) for (let xx = 0; xx < 26; xx++) {
      const dx = xx + 0.5 - 13, hd = (dx / 5.6) ** 2 + ((yy + 0.5 - 13) / 7.2) ** 2, bw = yy < 23 ? 0 : 5 + Math.sqrt(Math.min(1, (yy - 22) / 7)) * 9;
      const inside = hd < 1 || Math.abs(dx) < bw || (Math.abs(dx) < 2.8 && yy > 17);
      const b = BAYER[(yy & 3) * 4 + (xx & 3)];
      const rim = inside && dx < 0 && !(((dx - 1) / 5.6) ** 2 + ((yy + 0.5 - 13) / 7.2) ** 2 < 1 || Math.abs(dx - 1) < bw || (Math.abs(dx - 1) < 2.8 && yy > 17));
      px(xx, yy, rim ? P.G1 : inside ? P.K : b < 2 ? P.K : P.BL);
    }
    textC('?', 13, 8, P.G3);
  });
  g.drawImage(c, Math.round(x), Math.round(y));
}
