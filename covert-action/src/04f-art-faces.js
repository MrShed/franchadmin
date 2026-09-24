// ===================================================================
// ART 04f: suspect portraits - VGA-adventure-style ID photos
// (helpers prefixed fcX_; drawFace / drawUnknownFace override 04-art.js)
// Every portrait is rendered for the exact device-pixel size it lands on
// (layout size x the current canvas transform), so a 26x32 card, a 44x54
// dossier photo and a big interrogation shot are each crisp. The masses
// (head, hair, neck, clothes, hat, beard) come from a small analytic
// model shaded with one warm key light (upper left), a cool fill and a
// rim light from the backdrop, quantised into hand-picked hue-shifted
// ramps (clean clusters, no dither). Eyes, brows, mouth, glasses and
// jewellery are then placed per size tier, pixel by pixel at small sizes.
// The backdrop is a single dither() over the portrait rect plus a banded
// halo; when a caller swaps dither() out, the portrait comes out cut.
// ===================================================================
const fcX_dither0 = dither;
const fcX_cache = new Map();
function fcX_hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); return (h ^ (h >>> 15)) >>> 0; }
function fcX_key(f) { return [f.sex, f.skin, f.hair, f.hairStyle, f.beard, f.glasses, f.hat ? 1 : 0, f.jacket, f.tie, f.eyes, f.bg, f.jaw].join('|'); }
function fcX_rgb(c) { c = String(c || '#000'); if (c[0] !== '#') return [0, 0, 0]; if (c.length === 4) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]; const n = parseInt(c.slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
const fcX_R = a => a.map(fcX_rgb);
const fcX_mx = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const fcX_cl = (v, a, b) => v < a ? a : v > b ? b : v;
const fcX_ss = (a, b, x) => { const t = fcX_cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fcX_g = (x, y, rx, ry) => Math.exp(-(x * x) / (rx * rx) - (y * y) / (ry * ry));
// nearest of a set of anchor colours (callers may pass old EGA values or new richer ones)
function fcX_near(c, table) {
  const a = fcX_rgb(c); let best = null, bd = 1e9;
  for (const k in table) { const b = fcX_rgb(table[k]); const d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2; if (d < bd) { bd = d; best = k; } }
  return best;
}

// ---------- palettes: hue-shifted ramps, dark (cool) to light (warm) ----------
const fcX_SKIN = {
  pale: fcX_R(['#2c1b2a', '#5b3138', '#924f49', '#c27a62', '#e1a285', '#f5caa8']),
  fair: fcX_R(['#301a28', '#673035', '#a04e43', '#cd7859', '#e99f77', '#f9c49a']),
  olive: fcX_R(['#241b22', '#50362f', '#82583f', '#ad7b53', '#cb9c6b', '#e4bd8a']),
  tan: fcX_R(['#21151d', '#482c29', '#744631', '#9e663f', '#c08655', '#daa673']),
  brown: fcX_R(['#1a1118', '#382024', '#5c3429', '#834f34', '#a46d45', '#c28d5d']),
  deep: fcX_R(['#120c14', '#25161c', '#3e2621', '#5c392b', '#7a5137', '#976b47']),
};
const fcX_HAIR = {
  black: fcX_R(['#08070d', '#141119', '#221c29', '#352e3f', '#4f4760']),
  brown: fcX_R(['#140c10', '#2b1915', '#482b1d', '#6a4327', '#926135']),
  auburn: fcX_R(['#190b0c', '#38170f', '#5f2915', '#883f1d', '#b0612b']),
  blond: fcX_R(['#3a2616', '#694921', '#997333', '#c49c4b', '#e8c872']),
  grey: fcX_R(['#33333d', '#595965', '#83838d', '#adadb3', '#d9d9db']),
  pepper: fcX_R(['#15151b', '#2b2b33', '#45454e', '#63636c', '#8a8a91']),
};
const fcX_CLOTH = {
  charcoal: fcX_R(['#131419', '#22242d', '#343744', '#4c505f', '#6a6f80']),
  camel: fcX_R(['#22130e', '#432518', '#683b21', '#8f5930', '#b47d45']),
  navy: fcX_R(['#0b0d20', '#161d42', '#243166', '#37488a', '#5469aa']),
  black: fcX_R(['#07070b', '#101016', '#1b1b23', '#2b2b35', '#42424e']),
  stone: fcX_R(['#3b3d47', '#5f636c', '#858990', '#a8acb1', '#c9ccce']),
  olive: fcX_R(['#13160b', '#242a13', '#3a421f', '#545e2d', '#727c3f']),
};
const fcX_TIE = {
  red: fcX_R(['#2e0a12', '#5c111c', '#8d1b2a', '#bb3240', '#d85a5a']),
  blue: fcX_R(['#0a1030', '#15255c', '#243e8c', '#3c5fba', '#6284d4']),
  brown: fcX_R(['#24130b', '#442714', '#673d1f', '#8c5a2c', '#b07c42']),
  black: fcX_R(['#08080c', '#15151b', '#25252e', '#393944', '#50505c']),
};
const fcX_SHIRT = {
  white: fcX_R(['#4c5068', '#7d8299', '#adb1c2', '#d6d8e0', '#f1f1f2']),
  blue: fcX_R(['#3c4a68', '#627392', '#8b9dba', '#b0c2da', '#d3e1ef']),
  cream: fcX_R(['#58483e', '#8b7a66', '#b7a88e', '#dacdb2', '#f1e8d2']),
  dark: fcX_R(['#0d0d13', '#191a22', '#282a35', '#3a3d4b', '#525666']),
  wine: fcX_R(['#200812', '#401022', '#681c36', '#92304c', '#b85066']),
  sky: fcX_R(['#1e2c4a', '#34507a', '#5076a6', '#76a0c8', '#a2c6e2']),
};
const fcX_BG = {
  slate: fcX_R(['#161b30', '#212a48', '#303d62', '#44547e', '#5d6f99', '#7c8fb4']),
  teal: fcX_R(['#0f2127', '#18333a', '#244a4f', '#336366', '#4a8080', '#6aa19c']),
  grey: fcX_R(['#1a1a20', '#27272e', '#37373f', '#4a4a52', '#616169', '#7d7d84']),
};
const fcX_EYE = { dark: ['#2e1a12', '#3f2616', '#241612'], light: ['#3c6c9e', '#5f7d62', '#62768e', '#4c5f8a'] };

// ---------- per-face parameters: stable, derived from the face record ----------
function fcX_params(f) {
  let s = fcX_hash(fcX_key(f));
  const r = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const j = (a) => (r() - 0.5) * 2 * a;
  const fem = f.sex === 'f', jaw = fcX_cl(f.jaw | 0, 0, 2);
  const Q = { fem, jaw };
  // skin
  const dark = fcX_near(f.skin, { l: EGA.lred, d: EGA.brown, l2: '#e8b090', d2: '#8a5a3a' })[0] === 'd';
  const sv = r();
  Q.skinK = dark ? (sv < 0.45 ? 'tan' : sv < 0.8 ? 'brown' : 'deep') : (sv < 0.4 ? 'fair' : sv < 0.72 ? 'pale' : 'olive');
  Q.skin = fcX_SKIN[Q.skinK];
  // hair
  const hk = fcX_near(f.hair, { black: EGA.black, brown: EGA.brown, blond: EGA.yellow, grey: EGA.lgray, pepper: EGA.dgray });
  Q.hairK = hk === 'brown' && r() < 0.25 ? 'auburn' : hk;
  if (Q.hairK === 'auburn' && dark) Q.hairK = 'brown';
  Q.hair = fcX_HAIR[Q.hairK];
  Q.style = fcX_cl(f.hairStyle | 0, 0, 5); if (fem && Q.style < 4) Q.style = 4 + (Q.style & 1); if (!fem && Q.style > 3) Q.style = 3;
  Q.bald = !fem && Q.style === 1 && r() < 0.45;
  Q.age = Q.hairK === 'grey' ? 0.7 + r() * 0.3 : Q.hairK === 'pepper' ? 0.45 + r() * 0.35 : Q.style === 1 ? 0.4 + r() * 0.4 : r() * 0.55;
  if (fem) Q.age *= 0.6;
  Q.part = r() < 0.5 ? -1 : 1;
  // head geometry (units: portrait is 100 wide, 123 tall; head centre x = 50)
  Q.crown = (fem ? 19.5 : 17.5) + j(0.8);
  Q.vs = 50; Q.vj = (fem ? 69 : 70.5) + j(1); Q.vc = (fem ? 81.5 : 83.5) + j(1.2);
  Q.hwS = (fem ? 18.8 : 20.6) + j(0.8);
  Q.jw = [fem ? 13.6 : 15.4, fem ? 14.9 : 17.6, fem ? 16.2 : 19.4][jaw] + j(0.6);
  Q.chw = [3.8, 5.8, 8.4][jaw] * (fem ? 0.72 : 1);
  Q.jp = [1.9, 2.4, 3.1][jaw];
  Q.cheek = fem ? 0.9 : 0.5 + r() * 0.5;
  Q.ve = 51 + j(0.7); Q.es = 8.9 + j(0.7); Q.ew = (fem ? 6.9 : 6.3) + j(0.4);
  Q.browUp = j(0.8) + (fem ? 0.4 : 0); Q.browT = fem ? 1.25 : 1.6 + r() * 0.9; Q.scowl = fem ? r() * 0.4 : r() * 0.9 - 0.15;
  Q.vn = 62.5 + j(1.1); Q.nw = (fem ? 3.3 : 3.9) + j(0.5);
  Q.vm = Q.vn + (fem ? 7 : 7.6) + j(0.5); Q.mw = (fem ? 5.2 : 5.6) + j(0.6); Q.lip = fem ? 1.5 : 0.9 + r() * 0.5;
  Q.smirk = r() < 0.28 ? (r() < 0.5 ? -1 : 1) : 0; Q.frown = r() < 0.4 ? 1 : 0;
  Q.gaze = f.eyes ? j(0.35) : j(0.35);
  Q.eye = f.eyes ? fcX_rgb(fcX_EYE.light[(r() * 4) | 0]) : fcX_rgb(fcX_EYE.dark[(r() * 3) | 0]);
  Q.lids = r() < 0.35 ? 1 : 0; // heavy-lidded
  Q.ear = 1 + j(0.12);
  Q.nw2 = fem ? 7.4 : 10.4 + j(0.5); // neck half width
  // clothes
  const ck = fcX_near(f.jacket, { charcoal: EGA.dgray, camel: EGA.brown, navy: EGA.blue, black: EGA.black, stone: EGA.lgray, olive: EGA.green });
  Q.cloth = fcX_CLOTH[ck]; Q.clothK = ck;
  const tk = fcX_near(f.tie, { red: EGA.red, blue: EGA.blue, brown: EGA.brown, black: EGA.black });
  Q.tie = fcX_TIE[tk];
  const o = r();
  if (fem) { Q.outfit = o < 0.28 ? 'turtle' : 'blouse'; Q.shirt = fcX_SHIRT[{ red: 'wine', blue: 'sky', brown: 'cream', black: 'white' }[tk]]; }
  else {
    Q.outfit = ck === 'black' && o < 0.55 ? 'turtle' : ck === 'olive' ? 'open' : o < 0.2 ? 'open' : 'tie';
    const so = r(); Q.shirt = fcX_SHIRT[Q.outfit === 'open' && ck === 'olive' ? 'dark' : so < 0.68 ? 'white' : so < 0.88 ? 'blue' : 'cream'];
  }
  if (Q.outfit === 'turtle') Q.shirt = Q.cloth;
  // accessories and marks
  Q.beard = fem ? 0 : fcX_cl(f.beard | 0, 0, 2);
  Q.stubble = !fem && !Q.beard && r() < 0.35;
  Q.glasses = fcX_cl(f.glasses | 0, 0, 2); Q.frame = r() < 0.5 ? 'metal' : 'thick';
  Q.hat = !!f.hat; Q.hatC = fcX_CLOTH[fem ? (r() < 0.5 ? 'black' : 'camel') : r() < 0.5 ? 'charcoal' : r() < 0.5 ? 'camel' : 'black'];
  Q.lipstick = fem ? [[168, 40, 58], [138, 42, 74], [182, 72, 70], null][(r() * 4) | 0] : null;
  Q.earring = fem && r() < 0.65; Q.pearls = fem && Q.outfit === 'blouse' && r() < 0.5;
  Q.scar = !fem && r() < 0.16 ? { x: -12 + j(2), y: 56 + j(2), d: r() < 0.5 ? 1 : -1 } : null;
  Q.mole = r() < 0.18 ? { x: j(11), y: 60 + j(6) } : null;
  // backdrop
  Q.bgK = fcX_near(f.bg, { slate: EGA.blue, teal: EGA.cyan, grey: EGA.dgray });
  Q.bg = fcX_BG[Q.bgK];
  Q.rim = fcX_mx(Q.bg[5], [235, 240, 255], 0.35);
  // hair shape per style
  const H = Q.style, st = {};
  if (H === 0) Object.assign(st, { thT: 3.4, thS: 1.6, side: 50, burn: 56, cover: 0, k: 11, amp: 0.018 });
  else if (H === 1) Object.assign(st, { thT: 1.6, thS: 1.5, side: 54, burn: Q.bald ? 55 : 56, cover: 0, k: 9, amp: 0.015 });
  else if (H === 2) Object.assign(st, { thT: 5.8, thS: 2.1, side: 50, burn: 55, cover: 0, k: 3, amp: 0.02 });
  else if (H === 3) Object.assign(st, { thT: 7.2, thS: 3.6, side: 58, burn: 58, cover: 0, k: 9, amp: 0.035 });
  else if (H === 4) Object.assign(st, { thT: 6.2, thS: 5.6, side: 78 + j(2), burn: 0, cover: 2.6, k: 5, amp: 0.02 });
  else Object.assign(st, { thT: 5.4, thS: 4.8, side: 112, burn: 0, cover: 3.2, k: 4, amp: 0.02 });
  st.ph = r() * 6.28;
  Q.hs = st;
  return Q;
}

// ---------- geometry ----------
function fcX_hw(Q, v) { // half width of the face/skull at height v (-1 outside)
  if (v < Q.crown || v > Q.vc) return -1;
  if (v <= Q.vs) { const t = (Q.vs - v) / (Q.vs - Q.crown); return Q.hwS * Math.pow(Math.max(0, 1 - Math.pow(t, 2.3)), 1 / 2.3); }
  if (v <= Q.vj) { const t = (v - Q.vs) / (Q.vj - Q.vs), e = t * t * (3 - 2 * t); return Q.hwS + (Q.jw - Q.hwS) * e + Q.cheek * Math.sin(t * Math.PI) * (1 - t); }
  const t = (v - Q.vj) / (Q.vc - Q.vj);
  return Q.jw * Math.pow(Math.max(0, 1 - Math.pow(t, Q.jp)), 1 / Q.jp) * (1 - 0.12 * t * t * (1 - Q.chw / 9));
}
function fcX_hairline(Q, du) {
  const a = Math.abs(du);
  switch (Q.style) {
    case 0: return 33.5 - 0.018 * du * du + 2.2 * fcX_g(du, 0, 3.5, 1);
    case 1: return Q.bald ? -99 : 31.5 + 7 * Math.exp(-(((a - 8.5) / 4.5) ** 2)) + 0.01 * du * du;
    case 2: return 32 - 0.012 * du * du + 1.2 * fcX_g(du + Q.part * 6, 0, 4, 1);
    case 3: { const p = -Q.part; return 35 + 5.5 * fcX_ss(-12, 10, du * p) - 1.5 * fcX_g(du - p * 3, 0, 5, 1) + 0.008 * du * du; }
    case 4: return 42.5 + 0.004 * du * du - 0.8 * Math.cos(du * 0.9);
    default: return 32.5 + 0.05 * du * du;
  }
}
function fcX_shTop(Q, a) { // top edge of the shoulders
  a *= Q.fem ? 1.13 : 1;
  return a < 9 ? 90.5 : a < 33 ? 90.5 + (a - 9) * 0.28 : 97.2 + (a - 33) * (a - 33) * 0.05;
}
function fcX_chinY(Q, a) { // lower outline of the face at |du| = a
  if (a >= Q.jw) return Q.vj - 2;
  let lo = Q.vj, hi = Q.vc; for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (fcX_hw(Q, m) > a) lo = m; else hi = m; }
  return lo;
}

// ---------- the model: material + light at one sample point ----------
// materials: 0 bg, 1 skin, 2 hair, 3 cloth, 4 shirt, 5 tie, 6 hat, 7 hat band, 8 beard, 9 neck, 10 ear, 11 lips hole (skin)
const fcX_o = { m: 0, v: 0, t: 0 };
const fcX_L = [-0.56, -0.5, 0.66];
function fcX_lam(nx, ny) { const nz = Math.sqrt(Math.max(0.02, 1 - nx * nx - ny * ny)); return Math.max(0, fcX_L[0] * nx + fcX_L[1] * ny + fcX_L[2] * nz); }
const fcX_Z = 1.17, fcX_U = u => 50 + (u - 50) / fcX_Z, fcX_V = v => 60 + (v - 64) / fcX_Z; // photo -> model units
const fcX_PX = u => 50 + (u - 50) * fcX_Z, fcX_PY = v => 64 + (v - 60) * fcX_Z; // model -> photo units
function fcX_eval(Q, u, v) {
  u = fcX_U(u); v = fcX_V(v);
  const o = fcX_o; o.t = 0;
  const du = u - 50, a = Math.abs(du), hs = Q.hs;
  const hw = fcX_hw(Q, v), inFace = hw > 0 && a < hw;
  // ---- hat ----
  if (Q.hat) {
    if (!Q.fem) {
      const top = 9.5 + 2.6 * fcX_g(du, 0, 5, 1) + 0.004 * du * du * 3, crownW = Math.max(15.2 - Math.max(0, 30 - v) * 0.06, v > 22 ? hw + 0.6 : 0);
      const be = (du / 30) ** 2 + ((v - 33.2) / 4.6) ** 2;
      if (be < 1 && (v > 33.2 || a > crownW)) { o.m = 6; o.v = v < 33.2 ? 0.55 - du * 0.006 + (v < 31.5 ? 0.12 : 0) : 0.14 + (v > 35.6 ? -0.08 : 0) - du * 0.003; return o; }
      if (a < crownW && v > top && v <= 33.4) {
        if (v > 27.6) { o.m = 7; o.v = 0.5 - du / 30 + (v > 31.8 ? -0.25 : 0); return o; }
        const nx = du / (crownW + 2); o.m = 6; o.v = 0.12 + 0.8 * fcX_lam(nx, -0.2) - (Math.abs(du + 1) < 1.1 && v < 20 ? 0.2 : 0) - 0.18 * fcX_g(du - 5, v - 16, 3, 6); return o;
      }
    } else {
      const bx = du + 3, by = v - 27, rot = bx * 0.95 + by * 0.3, rot2 = -bx * 0.3 + by * 0.95;
      const e = (rot / 22.5) ** 2 + (rot2 / 8.5) ** 2;
      if (e < 1 || (Math.abs(du - 2) < 0.9 && v > 16.5 && v < 20)) { o.m = 6; o.v = 0.15 + 0.75 * fcX_lam(rot / 24, rot2 / 9 - 0.3) - (rot2 > 5.5 ? 0.15 : 0); return o; }
    }
  }
  // ---- hair (front) ----
  const hl = fcX_hairline(Q, du);
  const vsO = Q.vs, ryO0 = Q.vs - Q.crown + hs.thT, rxO = Q.hwS + hs.thS;
  const ang = Math.atan2(v - vsO, du), lump = 1 + hs.amp * Math.cos(ang * hs.k + hs.ph) * (v < vsO ? 1 : 0);
  const ryO = ryO0 * lump;
  let inVol;
  if (v <= vsO) inVol = Math.pow(Math.abs(du / (rxO * lump)), 2.3) + Math.pow(Math.abs((v - vsO) / ryO), 2.3) < 1;
  else inVol = a < rxO + (Q.style === 5 ? (v - vsO) * 0.1 : Q.style === 4 ? (v - vsO) * 0.06 : -(v - vsO) * 0.1) && v < hs.side - (Q.style === 4 ? Math.max(0, (a - Q.hwS + 3) * 0.35) - 0.9 * Math.abs(Math.sin(a * 0.9)) : 0);
  if (Q.style === 5 && v > 60 && v < hs.side) { // long hair falls down past the shoulders, tapering at the ends
    const outer = rxO + (v - vsO) * 0.1 + 1.2 * Math.sin(v * 0.2 + du * 0.1), inner = Math.max(hw > 0 ? hw - 2.2 : 0, v > Q.vj ? Q.nw2 + 0.8 : 0);
    const endY = hs.side - 6 + 5 * Math.cos(a * 0.45);
    inVol = a < outer && a > inner && v < endY;
  }
  if (Q.hat && !Q.fem && v < 34) inVol = false;
  if (Q.hat && Q.fem && v < 30) inVol = false;
  if (inVol) {
    let hair = false;
    if (inFace) hair = v < hl || (hs.cover && a > hw - hs.cover && v < Math.min(hs.side, 76) && v > 36) || (hs.burn && a > hw - 1.7 && v < hs.burn && v > hl - 4 && !(Q.bald && v < 44));
    else hair = !(Q.bald && v < 44 && hw > 0) && !(Q.bald && hw < 0 && v < 44);
    if (Q.bald && inFace && a > hw - 2.3 && v > 43 && v < hs.burn) hair = true;
    if (hair) {
      const nx = fcX_cl(du / rxO, -1, 1), ny = v < vsO ? fcX_cl((v - vsO) / ryO, -1, 1) : 0;
      let val = 0.06 + 0.82 * fcX_lam(nx * 0.95, ny * 0.9);
      const rho = Math.sqrt((du / rxO) ** 2 + (Math.min(0, v - vsO) / ryO) ** 2);
      if (Q.style === 2 || Q.style === 0 || Q.style === 1) { const sw = Math.sin(ang * (Q.style === 2 ? 30 : 44) + rho * 3); if (sw > 0.78 && du < 4 && v < 44) val += Q.style === 2 ? 0.14 : 0.08; }
      if (Q.style === 2) { const band = Math.abs(rho - 0.8 + du * 0.002); if (band < 0.07 && du < 6 && v < 42) val += 0.28; if (Math.abs(du - Q.part * 7) < 0.55 && v < hl + 1 && v > Q.crown - 2) val -= 0.35; }
      else if (Q.style === 3) { const w = Math.sin(rho * 23 + du * 0.28 + Math.sin(v * 0.3) * 0.8); if (w > 0.6 && du < 8) val += 0.2; else if (w < -0.75) val -= 0.13; }
      else if (Q.style === 5 || Q.style === 4) { const w = Math.sin(du * 0.55 + Math.sin(v * 0.11) * 2.2 + (v < vsO ? rho * 9 : 0)); if (w > 0.72 && du < 10) val += 0.18; else if (w < -0.8) val -= 0.12; if (Q.style === 5 && Math.abs(du) < 0.5 && v < hl + 1) val -= 0.35; if (v > vsO && a > (hw > 0 ? hw : Q.nw2)) val -= 0.08; }
      else { if (rho > 0.55 && rho < 0.78 && du < 2 && v < 40) val += 0.12; }
      if (inFace && v > hl - 2.5 && !hs.cover) val -= 0.12; // hairline shade
      if (Q.hat) val -= 0.18;
      o.m = 2; o.v = val; return o;
    }
  }
  // ---- beard / moustache ----
  if (Q.beard && hw > -1 && (inFace || (Q.beard === 2 && a < hw + 0.9 && v > Q.vj - 8))) {
    const nx = du / (hw + 3); let b = false;
    if (Q.beard === 2) {
      const top = 63.5 - 9 * fcX_cl((a - 5.5) / Math.max(2, hw - 5.5), 0, 1) + 0.3 * Math.cos(a);
      b = v > top && v < Q.vc + 1.2 && !((a / (Q.mw - 0.4)) ** 2 + ((v - Q.vm - 0.8) / 1.5) ** 2 < 1) && !(a > hw - 0.2 && v < Q.vj - 6);
      if (a < Q.nw + 1.5 && v < Q.vn + 1.1) b = false;
    } else {
      const top = Q.vn + 1.7 + a * a * 0.022, bot = Q.vm + 0.4 + Math.max(0, a - Q.mw * 0.5) * 1.0;
      b = v > top && v < bot && a < Q.mw + 3.4 - Math.max(0, v - Q.vm) * 0.35;
    }
    if (b) { o.m = 8; o.v = 0.08 + 0.72 * fcX_lam(nx, (v - 72) / 20) - (v > Q.vc - 2 ? 0.15 : 0) + (Math.sin(du * 1.3 + v * 0.5) > 0.8 && du < 3 ? 0.1 : 0); return o; }
  }
  // ---- face ----
  if (inFace) {
    const nx = du / (hw + 2.5);
    const ny = v < 40 ? -(40 - v) / (40 - Q.crown + 4) * 0.95 : v > Q.vj - 2 ? fcX_cl((v - Q.vj + 2) / (Q.vc - Q.vj + 2), 0, 1) * 0.7 : 0;
    let val = 0.1 + 0.86 * fcX_lam(nx, ny);
    const es = Q.es, ve = Q.ve;
    val -= 0.17 * fcX_g(du + es, v - ve + 0.4, 5.6, 3.6) + 0.22 * fcX_g(du - es, v - ve + 0.4, 5.6, 3.6); // sockets
    val += 0.07 * fcX_g(du + es + 1, v - ve + 5.8, 5.5, 1.4); // brow ridge
    // nose
    const t = (v - (ve - 1)) / (Q.vn - ve + 1);
    if (t > 0 && t < 1.08) {
      const w = Q.nw * (0.32 + 0.68 * t * t);
      if (a < w) { if (du < -w * 0.1) val += 0.1 * t; else if (du > w * 0.15) val -= 0.2 + 0.1 * t; }
      if (du > w * 0.15 && du < w + 1.6 * t && t > 0.55) val -= 0.1; // cast onto the cheek
    }
    val += 0.16 * fcX_g(du + 0.8, v - Q.vn + 1.9, 2.1, 1.5);
    val -= 0.1 * fcX_g(a - Q.nw * 0.95, v - Q.vn + 1, 1.2, 1.5);
    if (v > Q.vn - 0.2 && v < Q.vn + 1.3 && a < Q.nw * 0.9) val -= 0.3 + (du > 0 ? 0.1 : 0);
    if (v > Q.vn + 1.3 && v < Q.vm - 0.5 && du > 0.3 && du < 3) val -= 0.1; // philtrum shade
    // cheeks, mouth surround, chin
    val += 0.05 * fcX_g(du + 12, v - 56, 4, 3);
    val -= (0.06 + (Q.fem ? 0 : 0.05)) * fcX_g(a - 12.5, v - 65, 3.3, 5);
    { const ax = Q.nw + 1.2, ay = Q.vn - 0.4, bx = Q.mw + 1.1, by = Q.vm + 1.4, px = a - ax, py = v - ay, dx = bx - ax, dy = by - ay, k = fcX_cl((px * dx + py * dy) / (dx * dx + dy * dy), 0, 1), dd = Math.hypot(px - dx * k, py - dy * k);
      if (dd < 0.75) val -= (0.05 + Q.age * 0.12) * (du > 0 ? 1.3 : 1); }
    val -= 0.13 * fcX_g(du, v - Q.vm - 3.4, 3.4, 1.1);
    val += 0.08 * fcX_g(du + 1.5, v - Q.vc + 4.5, 3.4, 2.2);
    if (!inVolShade(Q, du, v, hl)) { /* no hair above */ } else if (v - hl < 2.3 && v >= hl) val -= 0.16;
    if (Q.hat && !Q.fem && v < ve - 1.5) val -= 0.3;
    if (Q.hat && !Q.fem && v < ve + 3 && v >= ve - 1.5) val -= 0.12;
    if (Q.hs.cover && a > hw - Q.hs.cover - 2.5 && v > 38 && v < 76) val -= 0.14;
    o.m = 1; o.v = val;
    if ((Q.stubble || Q.beard === 1) && v > 63.5 - 9 * fcX_cl((a - 5.5) / Math.max(2, hw - 5.5), 0, 1) && !(a < Q.nw + 1.5 && v < Q.vn + 1.1)) o.t = 1;
    return o;
  }
  // ---- ears ----
  if (!(Q.hs.cover) && !(Q.style === 3)) {
    const ex = fcX_hw(Q, 55) + 0.3 * Q.ear, ey = 56.5, dx = a - ex, dy = v - ey;
    if (a > 5 && (dx / (2.3 * Q.ear)) ** 2 + (dy / (5.2 * Q.ear)) ** 2 < 1) {
      const left = du < 0; let val = left ? 0.5 : 0.24;
      if (((dx + 0.6) / 1.4) ** 2 + ((dy + 0.3) / 3.2) ** 2 < 1) val -= 0.18;
      if (dx > 1.4) val += left ? 0.08 : 0.06;
      o.m = 10; o.v = val; return o;
    }
  } else if (Q.style === 3) {
    const ex = fcX_hw(Q, 55) + 1.1, dx = a - ex, dy = v - 59;
    if (a > 5 && (dx / 2.4) ** 2 + (dy / 2.8) ** 2 < 1 && v > 57.5) { o.m = 10; o.v = du < 0 ? 0.45 : 0.22; return o; }
  }
  // ---- neck (and skin in an open collar) ----
  const nw = Q.nw2 + Math.max(0, v - 90) * 0.9;
  const sh = fcX_shTop(Q, a);
  const vOpen = Q.outfit === 'open' || Q.outfit === 'blouse';
  const turtleTop = 86.5 - 0.02 * du * du;
  if (a < nw && v > Q.vj - 8 && v < 100 && !(Q.outfit === 'turtle' && v > turtleTop)) {
    const vneck = vOpen && a < (Q.fem ? 6.2 : 4.2) - (v - 92) * (Q.fem ? 0.45 : 0.36) && v < 106;
    if (v < sh + 1 || vneck || a < Q.nw2 + 0.3) {
      if (v < 94 || vneck) {
        let val = 0.34 - 0.2 * du / nw;
        const cy = fcX_chinY(Q, a);
        if (v < cy + 5.5 + du * 0.18) val = 0.08 + (du < -3 ? 0.06 : 0);
        if (!Q.fem && a < 1.8 && v > cy + 6 && v < cy + 9) val += 0.07;
        if (vneck && v > 93) val = 0.42 - 0.2 * du / 5 - (v - 93) * 0.012;
        o.m = 9; o.v = val; return o;
      }
    }
  }
  // ---- long hair over the shoulders is handled above; body ----
  if (v >= sh || (Q.outfit === 'turtle' && a < Q.nw2 + 0.8 && v > turtleTop - 0.5)) {
    const open = (Q.fem ? 8 : 9.6) - (v - 92) * 0.25;
    if (Q.outfit === 'turtle') {
      let val = 0.5 - 0.3 * du / 45 - (v - 100) * 0.006;
      if (a < Q.nw2 + 0.8 && v < 94) { val = 0.5 - 0.35 * du / Q.nw2; const r = Math.sin((v - turtleTop) * 1.25 + 0.4); if (r < -0.55) val -= 0.18; if (r > 0.75) val += 0.1; }
      if (v - sh < 2.2 && a > Q.nw2 + 1) val += 0.14 - du * 0.002;
      if (du > Q.nw2 && du < Q.nw2 + 9 && v < 99) val -= 0.12;
      if (Math.abs(a - 35) < 0.6 && v > 104) val -= 0.12;
      o.m = 3; o.v = val; return o;
    }
    const tieOn = Q.outfit === 'tie';
    // tie
    if (tieOn) {
      if (v > 91.2 && v < 97 && a < 2.7 - (v - 91.2) * 0.15) { o.m = 5; o.v = 0.6 - du * 0.12 + (v < 93 ? 0.1 : 0) - (v > 96 ? 0.1 : 0); return o; }
      if (v >= 97 && a < 1.7 + (v - 97) * 0.085) { o.m = 5; o.v = 0.48 - du * 0.14 - (v < 99 ? 0.18 : 0) + (Math.abs(du + 0.2) < 0.4 && v > 100 ? -0.1 : 0); return o; }
    }
    // shirt collar (stands around the neck, points out over the lapels)
    const cw = Q.nw2 + (Q.outfit === 'open' ? 5 : 3.2);
    if (Q.outfit !== 'blouse' || true) {
      const cBot = (tieOn ? 92.5 : 94) + (cw - a) * (Q.outfit === 'open' ? 1.3 : 1.0);
      const cTop = 88 - Math.max(0, a - Q.nw2) * 0.2;
      const gap = tieOn ? 2.5 : Q.fem ? 5.2 - (v - 92) * 0.4 : 4 - (v - 92) * 0.3;
      if (a < cw && v > cTop && v < cBot && a > gap) {
        let val = 0.8 - du * 0.012 + (du > 0 ? -0.15 : 0);
        if (v > cBot - 0.9) val -= 0.25;
        if (a < Q.nw2 + 0.6 && v < 92) val -= 0.3;
        if (du > 0 && v < 92.5) val -= 0.15;
        o.m = 4; o.v = val; return o;
      }
    }
    // shirt front in the jacket's V
    if (a < open && v > 88) {
      let val = 0.72 - du * 0.02 - (v < 94 ? 0.2 : 0);
      if (!tieOn && Math.abs(du - 0.8) < 0.45 && v > 98) val -= 0.25; // placket
      if (!tieOn && a < 1.2 && (v | 0) % 7 === 3 && Math.abs(v - (v | 0) - 0.5) < 0.45 && v > 100) val -= 0.2;
      o.m = 4; o.v = val; return o;
    }
    // jacket
    let val = 0.56 - 0.3 * du / 45 - (v - 100) * 0.005;
    const lapW = 4.2 + (v - 92) * 0.13;
    if (a < open + lapW && v > 90) {
      val += du < 0 ? 0.14 : -0.08;
      if (a > open + lapW - 0.8) val -= 0.18; // roll line
      if (a < open + 0.6) val += du < 0 ? 0.1 : 0.04; // lapel edge catches light
      if (v > 99.5 && v < 101 && a > open + lapW * 0.45) val -= 0.35; // notch
    }
    if (v - sh < 2.4 && a > Q.nw2 + 2) val += 0.16 - (du > 0 ? 0.08 : 0);
    if (du > Q.nw2 && v < sh + 5 - (du - Q.nw2) * 0.3) val -= 0.1;
    if (Math.abs(a - 36) < 0.6 && v > sh + 3) val -= 0.14;
    o.m = 3; o.v = val; return o;
  }
  // ---- back hair (behind the neck, between shoulders and jaw) ----
  if ((Q.style === 4 || Q.style === 5) && a < rxO + 1 && v > vsO && v < hs.side - 2 && v < sh) { o.m = 2; o.v = 0.05; return o; }
  o.m = 0; o.v = 0; return o;
}
function inVolShade(Q, du, v, hl) { return !Q.bald && hl < 90; }

// ---------- rendering to a pixel buffer ----------
function fcX_rampFor(Q, m) {
  switch (m) { case 1: case 9: case 10: case 11: return Q.skin; case 2: case 8: return Q.hair; case 3: return Q.cloth; case 4: return Q.shirt; case 5: return Q.tie; case 6: return Q.hatC; case 7: return Q.fem ? Q.hatC : fcX_CLOTH.black; default: return Q.bg; }
}
let fcX_fineR = false; // larger renders get the in-between tones of every ramp
const fcX_rCache = new WeakMap();
function fcX_fine(R) { let r = fcX_rCache.get(R); if (!r) { r = []; for (let i = 0; i < R.length; i++) { r.push(R[i]); if (i < R.length - 1) r.push(fcX_mx(R[i], R[i + 1], 0.5)); } fcX_rCache.set(R, r); } return r; }
function fcX_shade(Q, m, val, tint) {
  let R = fcX_rampFor(Q, m); if (fcX_fineR && m) R = fcX_fine(R);
  const n = R.length, i = fcX_cl(Math.floor(val * n), 0, n - 1);
  let c = R[i];
  if (tint === 1) c = fcX_mx(c, Q.skinK === 'deep' || Q.skinK === 'brown' ? [30, 26, 34] : [70, 76, 96], Q.beard === 1 ? 0.28 : 0.2);
  return c;
}
function fcX_render(Q, W, H) {
  fcX_fineR = W >= 90;
  const N = W * H, mat = new Uint8Array(N), col = new Float32Array(N * 3), alpha = new Float32Array(N);
  const su = 100 / W, sv = 123 / H;
  const sampleM = new Uint8Array(N), sampleV = new Float32Array(N), sampleT = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const r = fcX_eval(Q, (x + 0.5) * su, (y + 0.5) * sv), i = y * W + x; sampleM[i] = r.m; sampleV[i] = r.v; sampleT[i] = r.t;
  }
  // anti-alias only the silhouette and the hair/face edge, and only a single blended step
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, m = sampleM[i];
    let edge = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; if (sampleM[yy * W + xx] !== m) { edge = true; break; } }
    let c = fcX_shade(Q, m, sampleV[i], sampleT[i]), a = m ? 1 : 0;
    if (edge) {
      const S = 3, cnt = new Map(); let fig = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) { const r = fcX_eval(Q, (x + (sx + 0.5) / S) * su, (y + (sy + 0.5) / S) * sv); if (r.m) fig++; const e = cnt.get(r.m) || { n: 0, v: 0, t: r.t }; e.n++; e.v += r.v; cnt.set(r.m, e); }
      let bm = -1, bn = -1; for (const [k, e] of cnt) if (e.n > bn) { bn = e.n; bm = k; }
      const e = cnt.get(bm); c = fcX_shade(Q, bm, e.v / e.n, e.t); mat[i] = bm;
      const cov = fig / (S * S);
      if (bm === 0) { a = 0; if (cov >= 0.4 && W >= 70) { // a faint AA pixel outside the figure
        let om = -1, on = -1; for (const [k, e2] of cnt) if (k && e2.n > on) { on = e2.n; om = k; }
        const e2 = cnt.get(om); c = fcX_shade(Q, om, e2.v / e2.n, e2.t); a = 0.5; mat[i] = 0; } }
      else if (cov < 1 && cov >= 0.4 && cov < 0.62 && W >= 70) a = 0.55;
      else if (W >= 70 && bm !== 0) { // blend a soft step between hair and skin
        let om = -1, on = 0; for (const [k, e2] of cnt) if (k !== bm && k !== 0 && e2.n > on) { on = e2.n; om = k; }
        if (om >= 0 && on >= 3 && ((bm === 2) !== (om === 2))) { const e2 = cnt.get(om); c = fcX_mx(c, fcX_shade(Q, om, e2.v / e2.n, e2.t), 0.45); }
      }
    } else mat[i] = m;
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; alpha[i] = a;
  }
  return { W, H, mat, col, alpha, su, sv };
}
// ---------- pixel helpers for the feature pass ----------
function fcX_put(B, x, y, c, k = 1) {
  x |= 0; y |= 0; if (x < 0 || y < 0 || x >= B.W || y >= B.H) return; const i = y * B.W + x;
  if (k >= 1) { B.col[i * 3] = c[0]; B.col[i * 3 + 1] = c[1]; B.col[i * 3 + 2] = c[2]; }
  else { B.col[i * 3] += (c[0] - B.col[i * 3]) * k; B.col[i * 3 + 1] += (c[1] - B.col[i * 3 + 1]) * k; B.col[i * 3 + 2] += (c[2] - B.col[i * 3 + 2]) * k; }
  if (B.alpha[i] < 1 && k >= 1) B.alpha[i] = 1;
}
function fcX_get(B, x, y) { const i = y * B.W + x; return [B.col[i * 3], B.col[i * 3 + 1], B.col[i * 3 + 2]]; }
function fcX_m(B, x, y) { x |= 0; y |= 0; return x < 0 || y < 0 || x >= B.W || y >= B.H ? 0 : B.mat[y * B.W + x]; }
const fcX_isSkin = (B, x, y) => { const m = fcX_m(B, x, y); return m === 1 || m === 11; };

// ---------- features ----------
function fcX_features(Q, B) {
  const W = B.W, H = B.H, sx = W / 100, sy = H / 123;
  const X = u => fcX_PX(u) * sx, Y = v => fcX_PY(v) * sy, Z = fcX_Z;
  const S = Q.skin, lash = fcX_mx(fcX_mx(Q.hair[0], S[0], 0.35), [10, 6, 12], 0.4);
  const tier = W < 40 ? 0 : W < 72 ? 1 : W < 110 ? 2 : 3;
  const eyeW = Q.ew * sx * Z;
  const whiteL = fcX_mx([226, 220, 212], S[5], 0.18), whiteR = fcX_mx([170, 160, 160], S[3], 0.3);
  const pupil = [16, 10, 14];
  const eyeTop = [];
  // ---- eyes ----
  for (const side of [-1, 1]) {
    const cxf = X(50 + side * Q.es), cyf = Y(Q.ve);
    const wht = side < 0 ? whiteL : whiteR, iris = side < 0 ? Q.eye : fcX_mx(Q.eye, [0, 0, 0], 0.25);
    if (tier === 0) {
      const w = 2, x0 = side < 0 ? Math.round(cxf - w / 2) : W - Math.round(X(50 - Q.es) - w / 2) - w, y0 = Math.round(cyf - 0.5);
      fcX_put(B, x0, y0, fcX_mx(lash, iris, 0.2)); fcX_put(B, x0 + 1, y0, fcX_mx(lash, iris, 0.2));
      fcX_put(B, side < 0 ? x0 : x0 + 1, y0, fcX_mx(wht, S[2], 0.55));
      eyeTop.push([x0, y0, w]);
      continue;
    }
    if (tier === 1) {
      const w = eyeW < 3.6 ? 3 : 4, xl = Math.round(X(50 - Q.es) - w / 2), x0 = side < 0 ? xl : W - xl - w, y0 = Math.round(cyf - 0.5);
      for (let k = 0; k < w; k++) fcX_put(B, x0 + k, y0 - 1, lash);
      if (Q.fem) { fcX_put(B, side < 0 ? x0 - 1 : x0 + w, y0 - 1, lash, 0.6); }
      const wh2 = fcX_mx(wht, S[2], 0.45);
      for (let k = 0; k < w; k++) fcX_put(B, x0 + k, y0, k === 0 || k === w - 1 ? wh2 : wht);
      const ic = x0 + 1 + (w === 4 && Q.gaze > 0.2 ? 1 : 0);
      fcX_put(B, ic, y0, fcX_mx(iris, pupil, 0.5)); if (w === 4 && ic + 1 < x0 + w) fcX_put(B, ic + 1, y0, fcX_mx(iris, pupil, 0.75));
      fcX_put(B, ic, y0 - 1, fcX_mx(lash, iris, 0.15));
      if (Q.lids) for (let k = 0; k < w; k++) fcX_put(B, x0 + k, y0 - 2, S[2], 0.6);
      eyeTop.push([x0, y0 - 1, w]);
      continue;
    }
    // tier 2/3: almond eye rasterised per pixel
    const a = eyeW / 2, b = a * (Q.fem ? 0.5 : 0.44) * (Q.lids ? 0.85 : 1), cx = side < 0 ? cxf : W - X(50 - Q.es), cy = cyf;
    const ir = b * 1.15, icx = cx + Q.gaze * a * 0.4, icy = cy + b * 0.1;
    const top = dx => -b * Math.pow(Math.max(0, 1 - (dx / a) ** 2), 0.75) + (side * dx / a) * b * 0.12, bot = dx => b * 0.85 * Math.pow(Math.max(0, 1 - (dx / a) ** 2), 0.9);
    for (let y = Math.floor(cy - b - 3); y <= Math.ceil(cy + b + 2); y++) for (let x = Math.floor(cx - a - 2); x <= Math.ceil(cx + a + 1); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (Math.abs(dx) > a + 0.6) continue;
      const tp = top(dx), bt = bot(dx);
      if (dy >= tp && dy <= bt) {
        let c = wht;
        if (Math.abs(dx) > a * 0.7) c = fcX_mx(c, S[1], 0.3);
        const di = Math.hypot(x + 0.5 - icx, y + 0.5 - icy);
        if (di < ir) c = di < ir * 0.48 ? pupil : fcX_mx(iris, pupil, di > ir * 0.82 ? 0.5 : 0);
        if (dy < tp + 0.9) c = fcX_mx(c, [0, 0, 0], 0.35); // lid shadow on the eyeball
        fcX_put(B, x, y, c);
      } else if (dy < tp && dy > tp - (tier === 3 ? 1.6 : 1.05) && Math.abs(dx) < a + (Q.fem ? 0.9 : 0.2)) fcX_put(B, x, y, lash);
      else if (tier >= 2 && dy > bt && dy < bt + 1 && Math.abs(dx) < a * 0.8) fcX_put(B, x, y, fcX_mx(fcX_get(B, x, y), S[1], 0.35));
    }
    // catch light
    fcX_put(B, Math.floor(icx - ir * 0.35), Math.floor(icy - ir * 0.35), [255, 250, 240]);
    // crease / heavy lid
    const cr = tier === 3 ? 2.2 : 1.6;
    for (let x = Math.floor(cx - a * 0.8); x <= Math.ceil(cx + a * 0.9); x++) { const dx = x + 0.5 - cx; const y = Math.floor(cy + top(dx) * (Q.lids ? 1.05 : 1.2) - cr); if (fcX_isSkin(B, x, y)) fcX_put(B, x, y, S[1], Q.lids ? 0.6 : 0.4); }
    if (Q.age > 0.55) for (let x = Math.floor(cx - a * 0.6); x <= Math.ceil(cx + a * 0.6); x++) { const y = Math.floor(cy + b * 1.9 + 1); if (fcX_isSkin(B, x, y)) fcX_put(B, x, y, S[1], 0.3); }
    eyeTop.push([Math.floor(cx - a), Math.floor(cy - b), Math.ceil(a * 2)]);
  }
  // ---- brows ----
  const browC = Q.hairK === 'blond' ? Q.hair[1] : Q.hairK === 'grey' ? Q.hair[1] : fcX_mx(Q.hair[0], Q.hair[1], 0.5);
  for (const side of [-1, 1]) {
    const pts = [[3.2 + Q.scowl * 0.2, Q.ve - 4.2 + Q.scowl * 0.9 - Q.browUp], [7.5, Q.ve - 5.9 - Q.browUp], [12.8, Q.ve - 5.1 - Q.browUp * 0.5]];
    const x0 = X(50 + side * pts[0][0]), x2 = X(50 + side * pts[2][0]);
    const lo = Math.round(Math.min(x0, x2)), hi = Math.round(Math.max(x0, x2));
    if (tier === 0) {
      const y = Math.round(Y(Q.ve - 5)) - (Q.fem ? 0 : 0);
      const xa = side < 0 ? Math.round(X(50 - Q.es) - 1.5) : W - Math.round(X(50 - Q.es) - 1.5) - 3;
      for (let k = 0; k < 3; k++) if (fcX_isSkin(B, xa + k, y)) fcX_put(B, xa + k, y, browC, Q.fem ? 0.6 : 0.85);
      continue;
    }
    for (let x = lo; x <= hi; x++) {
      const u = Math.abs(fcX_U((x + 0.5) / sx) - 50), t = fcX_cl((u - pts[0][0]) / (pts[2][0] - pts[0][0]), 0, 1);
      const v = t < 0.5 ? pts[0][1] + (pts[1][1] - pts[0][1]) * Math.sin(t * Math.PI) : pts[2][1] + (pts[1][1] - pts[2][1]) * Math.sin((1 - t) * Math.PI) ;
      const vv = t < 0.45 ? pts[0][1] + (pts[1][1] - pts[0][1]) * (t / 0.45) ** 0.7 : pts[1][1] + (pts[2][1] - pts[1][1]) * ((t - 0.45) / 0.55) ** 1.6;
      const th = Math.max(1, Q.browT * sy * Z * (1.15 - t * 0.55)) * (tier === 1 && !Q.fem ? 1.3 : 1);
      const yc = Y(vv) - 0.5;
      const y0 = Math.round(yc - th / 2), n = Math.max(1, Math.round(th));
      for (let k = 0; k < n; k++) if (fcX_isSkin(B, x, y0 + k)) fcX_put(B, x, y0 + k, k === 0 && side < 0 && tier >= 2 ? fcX_mx(browC, Q.hair[2], 0.35) : browC, Q.fem ? 0.8 : 1);
      void v;
    }
  }
  // ---- nose accents ----
  if (tier >= 2) {
    for (const side of [-1, 1]) { const x = Math.floor(X(50 + side * Q.nw * 0.55)), y = Math.floor(Y(Q.vn + 0.3)); if (fcX_isSkin(B, x, y)) fcX_put(B, x, y, fcX_mx(S[0], S[1], 0.4)); if (tier === 3 && fcX_isSkin(B, x + side, y)) fcX_put(B, x + side, y, S[1], 0.6); }
    const hx = Math.floor(X(49.2)), hy = Math.floor(Y(Q.vn - 2.3)); if (fcX_isSkin(B, hx, hy)) fcX_put(B, hx, hy, S[5], 0.7);
  } else if (tier === 1) {
    const x = Math.floor(X(50 + Q.nw * 0.45)), y = Math.floor(Y(Q.vn + 0.2)); if (fcX_isSkin(B, x, y)) fcX_put(B, x, y, S[1]);
  } else { const x = Math.floor(X(51)), y = Math.floor(Y(Q.vn)); if (fcX_isSkin(B, x, y)) fcX_put(B, x, y, S[2], 0.7); }
  // ---- mouth ----
  {
    const lipBase = Q.lipstick || [150, 60, 62];
    const line = fcX_mx(fcX_mx(S[0], lipBase, Q.lipstick ? 0.45 : 0.25), [20, 8, 14], 0.25);
    const upper = fcX_mx(S[2], lipBase, Q.lipstick ? 0.7 : 0.28), lower = fcX_mx(S[3], lipBase, Q.lipstick ? 0.65 : 0.22), lowHi = fcX_mx(S[4], [255, 220, 210], 0.2);
    const mw = Q.mw * sx * Z, cxm = W / 2, ym = Y(Q.vm);
    const xl = Math.round(cxm - mw), xr = W - xl;
    const lipTh = Math.max(1, Q.lip * sy * Z);
    const okM = (x, y) => fcX_isSkin(B, x, y);
    for (let x = xl; x < xr; x++) {
      const t = ((x + 0.5) - cxm) / mw; // -1..1
      let yy = ym + (Q.frown ? Math.abs(t) ** 3 * 0.8 : 0) - (Q.smirk * t > 0 ? Math.abs(t) ** 2 * 1.0 * sy * 1.2 : 0);
      const y = Math.floor(yy - 0.3);
      if (tier === 0) { if (Math.abs(t) < 0.85 && okM(x, y)) fcX_put(B, x, y, line, 0.75); continue; }
      const edge = Math.abs(t) > 0.82;
      if (okM(x, y)) fcX_put(B, x, y, line, edge ? 0.6 : 1);
      if (Q.beard === 1) continue;
      const un = Math.max(1, Math.round(lipTh * (1 - t * t) * (Q.fem ? 1 : 0.8)));
      if (!edge) for (let k = 1; k <= un && tier >= 1; k++) if (okM(x, y - k) && (tier >= 2 || Q.fem)) fcX_put(B, x, y - k, upper, Q.fem ? 1 : 0.65);
      const ln = Math.max(1, Math.round(lipTh * 1.2 * (1 - t * t)));
      if (!edge) for (let k = 1; k <= ln; k++) if (okM(x, y + k) || fcX_m(B, x, y + k) === 8) {
        if (fcX_m(B, x, y + k) === 8) fcX_put(B, x, y + k, lower); else fcX_put(B, x, y + k, k === 1 && t > -0.5 && t < -0.1 && tier >= 2 ? lowHi : lower, Q.fem || tier >= 2 ? 1 : 0.55);
      }
    }
  }
  // ---- marks ----
  if (Q.mole && tier >= 1) { const x = Math.floor(X(50 + Q.mole.x)), y = Math.floor(Y(Q.mole.y)); if (fcX_isSkin(B, x, y)) fcX_put(B, x, y, fcX_mx(S[0], [60, 30, 20], 0.3)); }
  if (Q.scar && tier >= 1) {
    const n = Math.round(9 * sy * Z);
    for (let k = 0; k < n; k++) { const x = Math.floor(X(50 + Q.scar.x + Q.scar.d * k / n * 4)), y = Math.floor(Y(Q.scar.y) + k); if (fcX_isSkin(B, x, y)) { fcX_put(B, x, y, fcX_mx(S[4], [230, 170, 170], 0.3)); if (tier >= 2 && fcX_isSkin(B, x + 1, y)) fcX_put(B, x + 1, y, S[1], 0.5); } }
  }
  if (Q.age > 0.6 && tier >= 2) { // forehead lines
    for (const dv of [0, 2.6]) for (let x = Math.floor(X(40)); x <= Math.ceil(X(60)); x++) { const u = fcX_U((x + 0.5) / sx) - 50, y = Math.floor(Y(Q.ve - 11 - dv + u * u * 0.012)); if (fcX_isSkin(B, x, y)) fcX_put(B, x, y, S[2], 0.35); }
  }
  // ---- glasses ----
  if (Q.glasses) {
    const sun = Q.glasses === 2, thick = Q.frame === 'thick' || (sun && Q.frame !== 'metal');
    const fr = thick ? [22, 18, 22] : [196, 170, 110], frHi = thick ? [80, 76, 86] : [250, 232, 170];
    const la = (Q.ew / 2 + 2.6) * sx * Z, lb = (sun ? 4.3 : 3.8) * sy * Z, t = Math.max(1, thick ? Math.round(0.9 * sx * Z) : 1);
    const pw = thick ? 3 : 2.2; // metal frames: rounder lenses; thick frames: squarer
    const lens = (dx, dy) => Math.pow(Math.abs(dx / la), pw) + Math.pow(Math.abs((dy < 0 ? dy * 1.12 : dy) / lb), pw) < 1;
    for (const side of [-1, 1]) {
      const cx = side < 0 ? X(50 - Q.es) : W - X(50 - Q.es), cy = Y(Q.ve) + lb * 0.1;
      for (let y = Math.floor(cy - lb - 3); y <= Math.ceil(cy + lb + 3); y++) for (let x = Math.floor(cx - la - 3); x <= Math.ceil(cx + la + 3); x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        const ins = lens(dx, dy), shrink = (dx2, dy2) => lens(dx2 * la / Math.max(1, la - t), dy2 * lb / Math.max(1, lb - t));
        if (!ins) continue;
        const inner = shrink(dx, dy);
        if (!inner) { fcX_put(B, x, y, dy < 0 && dx * side < 0 ? frHi : fr); continue; }
        if (sun) { const k = fcX_cl((dy + lb) / (2 * lb), 0, 1); let c = fcX_mx([14, 12, 22], [52, 58, 76], k); if (Math.abs(dx + dy * 0.9 + la * 0.25) < Math.max(0.8, la * 0.12)) c = fcX_mx(c, Q.rim, 0.5); fcX_put(B, x, y, c); }
        else { fcX_put(B, x, y, [200, 220, 240], 0.1); if (tier >= 1 && Math.abs(dx + dy - la * 0.35) < 0.7 && dy < 0) fcX_put(B, x, y, [240, 248, 255], 0.45); }
      }
      // temple arm to the ear
      const ex = side < 0 ? X(50 - fcX_hw(Q, Q.ve)) : W - X(50 - fcX_hw(Q, Q.ve)), y = Math.floor(cy - lb * 0.55);
      for (let x = Math.round(Math.min(ex, cx + side * la)); x <= Math.round(Math.max(ex, cx + side * la)); x++) { const m = fcX_m(B, x, y); if (m === 1 || m === 2 || m === 10) fcX_put(B, x, y, fr); }
    }
    // bridge
    const bx0 = Math.round(X(50 - Q.es) + la - 1), bx1 = W - bx0, by = Math.floor(Y(Q.ve) - lb * 0.45);
    for (let x = bx0; x < bx1; x++) fcX_put(B, x, by, fr);
  }
  // ---- jewellery ----
  if (Q.earring && tier >= 1) for (const side of [-1, 1]) {
    const hwE = fcX_hw(Q, 62), x = Math.floor(side < 0 ? X(50 - hwE - 0.6) : W - X(50 - hwE - 0.6)), y = Math.floor(Y(63.5));
    fcX_put(B, x, y, [236, 200, 110]); if (tier >= 2) { fcX_put(B, x, y + 1, [150, 110, 50]); fcX_put(B, x + side, y, [150, 110, 50]); }
  }
  if (Q.pearls && tier >= 1) {
    const n = tier === 1 ? 7 : 11;
    for (let k = 0; k <= n; k++) { const du = -6.5 + 13 * k / n, x = Math.floor(X(50 + du)), y = Math.floor(Y(91.5 + du * du * 0.045)); fcX_put(B, x, y, du < 0 ? [246, 240, 228] : [196, 188, 184]); }
  }
}
// rim light from the backdrop along the right-hand silhouette, and a warm key rim on the left edge of the face
function fcX_rim(Q, B) {
  const W = B.W, H = B.H, tier = W < 40 ? 0 : W < 72 ? 1 : 2;
  const cut = Math.floor(H * 0.86);
  for (let y = 0; y < cut; y++) for (let x = W - 1; x > W / 2; x--) {
    const i = y * W + x; if (!B.mat[i] || B.alpha[i] < 1) continue;
    const r = x + 1 < W ? B.mat[i + 1] : 0; if (r) continue;
    const m = B.mat[i]; const k = m === 2 || m === 8 ? 0.45 : m === 1 || m === 9 || m === 10 ? 0.4 : 0.32;
    fcX_put(B, x, y, Q.rim, k);
    if (tier >= 2 && x - 1 >= 0 && B.mat[i - 1]) fcX_put(B, x - 1, y, Q.rim, k * 0.35);
  }
}
function fcX_toCanvas(B) {
  const c = document.createElement('canvas'); c.width = B.W; c.height = B.H;
  const x = c.getContext('2d'), im = x.createImageData(B.W, B.H), d = im.data;
  for (let i = 0; i < B.W * B.H; i++) { d[i * 4] = B.col[i * 3]; d[i * 4 + 1] = B.col[i * 3 + 1]; d[i * 4 + 2] = B.col[i * 3 + 2]; d[i * 4 + 3] = Math.round(B.alpha[i] * 255); }
  x.putImageData(im, 0, 0); return c;
}
// the backdrop: a banded halo behind the head and the sitter's soft shadow thrown to the right
function fcX_backdrop(Q, B) {
  const W = B.W, H = B.H, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'), im = x.createImageData(W, H), d = im.data, R = Q.bg;
  const offX = Math.max(1, Math.round(W * 0.055)), offY = Math.max(1, Math.round(H * 0.02)), off2 = Math.max(1, Math.round(offX * 0.5));
  const steps = W < 40 ? 4 : 8;
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
    const u = (xx + 0.5) / W * 100, v = (yy + 0.5) / H * 123;
    let val = 0.64 - Math.hypot((u - 40) / 72, (v - 40) / 84) * 0.6 - (v > 100 ? (v - 100) * 0.004 : 0);
    val = Math.round(val * steps) / steps;
    const sh = (dx) => { const sx2 = xx - dx, sy2 = yy - offY; return sx2 >= 0 && sy2 >= 0 && B.mat[sy2 * W + sx2] && B.alpha[sy2 * W + sx2] >= 1; };
    if (sh(offX)) val -= 0.3; else if (sh(off2)) val -= 0.15;
    const n = R.length - 1, p = fcX_cl(val, 0, 0.999) * n, i = Math.floor(p);
    const col = R[fcX_cl(i, 0, n)], k = (xx + yy * W) * 4;
    d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
  }
  x.putImageData(im, 0, 0); return c;
}
function fcX_build(f, W, H) {
  const Q = fcX_params(f);
  const B = fcX_render(Q, W, H);
  fcX_features(Q, B); fcX_rim(Q, B);
  return { fig: fcX_toCanvas(B), bg: fcX_backdrop(Q, B), mid: Q.bg[2], dark: Q.bg[0] };
}
const fcX_hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

// ---------- dossier photo: draw face f into (x, y, w, h) ----------
function drawFace(f, x, y, w = 26, h = 32) {
  const t = g.getTransform ? g.getTransform() : { a: 1, b: 0, c: 0, d: 1 };
  const W = Math.max(8, Math.round(w * Math.hypot(t.a, t.b))), H = Math.max(10, Math.round(h * Math.hypot(t.c, t.d)));
  const key = fcX_key(f) + '@' + W + 'x' + H;
  let P2 = fcX_cache.get(key);
  if (!P2) { P2 = fcX_build(f, W, H); fcX_cache.set(key, P2); if (fcX_cache.size > 400) fcX_cache.delete(fcX_cache.keys().next().value); }
  const noBg = dither !== fcX_dither0 || !!f.msXcut;
  const was = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false;
  // the backdrop: one call on the full rect (callers that swap dither() get a cut-out portrait)
  dither(x, y, w, h, fcX_hex(P2.mid), fcX_hex(P2.dark), 5);
  if (!noBg) g.drawImage(P2.bg, x, y, w, h);
  g.drawImage(P2.fig, x, y, w, h);
  g.imageSmoothingEnabled = was;
}
// no photo on file: a shadowy silhouette and a question mark
function drawUnknownFace(x, y) {
  const t = g.getTransform ? g.getTransform() : { a: 1, b: 0, c: 0, d: 1 };
  const W = Math.max(8, Math.round(26 * Math.hypot(t.a, t.b))), H = Math.max(10, Math.round(32 * Math.hypot(t.c, t.d)));
  const key = 'unknown@' + W + 'x' + H;
  let c = fcX_cache.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = W; c.height = H;
    const cx = c.getContext('2d'), im = cx.createImageData(W, H), d = im.data;
    const bg = fcX_BG.teal, Q = fcX_params({ sex: 'm', skin: EGA.lred, hair: EGA.black, hairStyle: 0, beard: 0, glasses: 0, hat: true, jacket: EGA.black, tie: EGA.black, eyes: 0, bg: EGA.cyan, jaw: 1 });
    Q.hat = true; Q.fem = false; Q.outfit = 'tie';
    const figAt = (u, v) => fcX_eval(Q, u, v).m !== 0;
    const qm = (u, v) => { // the question mark, in portrait units
      const r = Math.hypot(u - 50, v - 50), an = Math.atan2(v - 50, u - 50);
      if (Math.abs(r - 9) < 2.6 && (an < 1.1 && an > -Math.PI || an > 2.9)) return true;
      if (Math.abs(u - 51) < 2.6 && v > 58 && v < 66) return true;
      if (Math.hypot(u - 51, v - 72.5) < 3) return true;
      return false;
    };
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
      const u = (xx + 0.5) / W * 100, v = (yy + 0.5) / H * 123, k = (yy * W + xx) * 4;
      let col;
      if (figAt(u, v)) {
        col = [10, 12, 18];
        if (!figAt(u + 100 / W * 1.2, v)) col = fcX_mx(col, bg[4], 0.6);
        else if (!figAt(u - 100 / W * 1.2, v)) col = fcX_mx(col, bg[2], 0.35);
      } else { let val = 0.8 - Math.hypot((u - 45) / 70, (v - 40) / 80); val = Math.round(val * 6) / 6; col = bg[fcX_cl(Math.floor(val * 6), 0, 5)]; }
      if (qm(u + 1.2, v - 1.2) && !qm(u, v)) col = fcX_mx(col, [0, 0, 0], 0.6);
      if (qm(u, v)) col = qm(u - 2, v - 2) ? [232, 214, 150] : [172, 146, 84];
      d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
    }
    cx.putImageData(im, 0, 0); fcX_cache.set(key, c);
  }
  const was = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false;
  g.drawImage(c, x, y, 26, 32); g.imageSmoothingEnabled = was;
}
