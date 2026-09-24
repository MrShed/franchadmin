// ===================================================================
// CIA BUILDING ART: marble lobby, Data / Intelligence / Crypto floors, the lift and its button panel
// Painted on the fine (2x) grid with hue-shifted ramps and posterised light; all extra identifiers
// carry the ciaX_ prefix.
// ===================================================================
const ciaX_T = 'rgba(0,0,0,0)';

// ---------- shared scanline helpers (also used by the crypto workstation) ----------
// one horizontal run. f = colour string | [c1, c2, level 0..16] (a blend) | function (x, y) -> colour|null
function ciaX_run(x0, x1, y, f) {
  x0 = Math.round(x0); x1 = Math.round(x1);
  if (x1 < x0) return;
  if (typeof f === 'string') { g.fillStyle = f; g.fillRect(x0, y, x1 - x0 + 1, 1); return; }
  if (typeof f === 'function') {
    let s = x0, cs = f(x0, y);
    for (let x = x0 + 1; x <= x1 + 1; x++) {
      const c = x <= x1 ? f(x, y) : null;
      if (c !== cs) { if (cs) { g.fillStyle = cs; g.fillRect(s, y, x - s, 1); } cs = c; s = x; }
    }
    return;
  }
  const c1 = f[0], c2 = f[1], l = f[2];
  if (c1 === ciaX_T) { g.save(); g.globalAlpha = clamp(l / 16, 0, 1); g.fillStyle = c2; g.fillRect(x0, y, x1 - x0 + 1, 1); g.restore(); return; }
  g.fillStyle = mix(c1, c2, clamp(l, 0, 16) / 16); g.fillRect(x0, y, x1 - x0 + 1, 1);
}
// crisp scanline polygon (no anti-aliasing), pts = [[x,y],...]
function ciaX_poly(pts, f) {
  let y0 = 1e9, y1 = -1e9; for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  y0 = Math.floor(y0); y1 = Math.ceil(y1);
  for (let y = y0; y < y1; y++) {
    const sy = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) xs.push(a[0] + (sy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) ciaX_run(Math.round(xs[k]), Math.round(xs[k + 1]) - 1, y, f);
  }
}
function ciaX_ell(cx, cy, rx, ry, f) {
  if (rx <= 0 || ry <= 0) return;
  const y0 = Math.ceil(cy - ry - 0.5), y1 = Math.floor(cy + ry - 0.5);
  for (let y = y0; y <= y1; y++) {
    const dy = (y + 0.5 - cy) / ry, k = 1 - dy * dy; if (k < 0) continue;
    const hw = rx * Math.sqrt(k); ciaX_run(Math.round(cx - hw), Math.round(cx + hw) - 1, y, f);
  }
}
function ciaX_clip(x, y, w, h) { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); }
// cached layout-scale layer with a 1-px dark outline around everything drawn (used by the crypto workstation)
function ciaX_fig(key, w, h, fn) {
  return sprite('ciaX_f_' + key, w, h, () => {
    fn();
    const d = g.getImageData(0, 0, w, h).data, on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
    g.fillStyle = P.K;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) g.fillRect(x, y, 1, 1);
  });
}
// a tiny 3x5 face for plaques, labels and chalk
const ciaX_F3 = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001011001111', '4': '101101111001001', '5': '111100111001111',
  '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111', ':': '000010000010000', ' ': '000000000000000',
  A: '010101111101101', B: '110101110101110', C: '111100100100111', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '111100101101111',
  H: '101101111101101', I: '111010010010111', J: '001001001101111', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101',
  O: '111101101101111', P: '110101110100100', Q: '111101101111001', R: '110101110101101', S: '111100111001111', T: '111010010010010', U: '101101101101111',
  V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111', '-': '000000111000000', '=': '000111000111000',
  '.': '000000000000010', '?': '111001011000010', '/': '001001010100100', '>': '100010001010100', '+': '000010111010000',
};
function ciaX_t3(s, x, y, c) {
  s = String(s).toUpperCase();
  for (const ch of s) {
    const bits = ciaX_F3[ch] || ciaX_F3['?'];
    const img = sprite('ciaX_g' + ch + c, 3, 5, () => { g.fillStyle = c; for (let i = 0; i < 15; i++) if (bits[i] === '1') g.fillRect(i % 3, i / 3 | 0, 1, 1); });
    g.drawImage(img, x, y); x += 4;
  }
}
const ciaX_hash = (a, b = 0) => { let n = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const ciaX_ease = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);

// ---------- colour ramps ----------
// interpolate key colours into an n-step ramp
function ciaX_ramp(keys, n) {
  const r = [];
  for (let i = 0; i < n; i++) { const t = i / (n - 1) * (keys.length - 1), j = Math.min(keys.length - 2, Math.floor(t)); r.push(mix(keys[j], keys[j + 1], Math.round((t - j) * 32) / 32)); }
  return r;
}
const ciaX_q = (ramp, v) => ramp[clamp(Math.floor(v * ramp.length), 0, ramp.length - 1)];
const ciaX_STEEL = ciaX_ramp(['#12151c', '#222731', '#343a45', '#4a515b', '#636a72', '#80858a', '#a3a4a2', '#c9c5b8', '#efe6d0'], 22);
const ciaX_BRASS = ciaX_ramp(['#221006', '#472709', '#744612', '#a26d20', '#c9963a', '#e6bf62', '#fbe6a4', '#fff8e0'], 12);
const ciaX_WAL = ciaX_ramp(['#10080b', '#24100f', '#3d1b11', '#5a2b16', '#7b401f', '#9c5b2b', '#c1813f', '#e6b064'], 12);
const ciaX_GRAN = ciaX_ramp(['#08080c', '#121117', '#1d1a21', '#2a252c', '#3a3238'], 6);
const ciaX_AMB = ['#2a0e06', '#5a1d08', '#a8420c', '#e8761a', '#ffb040', '#ffe39a', '#fffbe8'];

// banded glow: stacked ellipses, each adding a little light (drawn with 'lighter')
function ciaX_glow(cx, cy, rx, ry, col, a = 0.5, steps = 6) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < steps; i++) { const k = 1 - i / steps; g.globalAlpha = a / steps; ciaX_ell(cx, cy, rx * k, ry * k, col); }
  g.restore();
}
function ciaX_alpha(a, fn) { g.save(); g.globalAlpha = a; fn(); g.restore(); }
// darken the boundary pixels of a finished figure layer toward a local dark tone (selective outline)
function ciaX_rim(w, h, dark = '#140c14', k = 0.6) {
  const im = g.getImageData(0, 0, w, h), d = im.data, dk = hexRGB(dark), a = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3];
  const edge = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a(x, y) > 128 && (a(x - 1, y) < 128 || a(x + 1, y) < 128 || a(x, y - 1) < 128 || a(x, y + 1) < 128)) edge.push((y * w + x) * 4);
  for (const i of edge) for (let c = 0; c < 3; c++) d[i + c] = Math.round(d[i + c] + (dk[c] - d[i + c]) * k);
  g.putImageData(im, 0, 0);
}
// fine-grid layer for a layout-sized panel, blitted at layout coords
function ciaX_layer(key, w, h, fn) { return art('ciaX_' + key, w, h, fn); }

// ===================================================================
// THE LIFT, seen from inside the car (fine grid 640x400): walnut and brass side walls, brushed steel
// front wall and doors, an art-deco brass dial over the doorway, warm downlights, polished granite floor
// ===================================================================
const ciaX_LO = { x0: 216, x1: 424, y0: 116, y1: 336 };   // door opening (fine px)
const ciaX_LIGHTS = [196, 320, 444];                       // downlight x positions along the front edge of the ceiling
// warm wall-wash scallops from the downlights on the front wall plane (brightness 0..1+)
function ciaX_wash(x, y) {
  let b = 0.28 - 0.12 * (y - 50) / 290;
  const dy = y - 46; if (dy < 0) return b;
  for (const lx of ciaX_LIGHTS) {
    const wd = 6 + dy * 0.3, cone = Math.exp(-(((x - lx) / wd) ** 2));
    b += 0.7 * cone * Math.min(1, dy / 10) * Math.exp(-dy / 110) + 0.07 * Math.exp(-(((x - lx) / 70) ** 2)) * Math.exp(-dy / 300);
  }
  return b;
}
// brushed grain: a smooth 1-D variation across x only, so quantised light turns into long vertical streaks
const ciaX_brush = (x, s = 0) => (vnoise(x / 5 + s * 17, s) - 0.5) * 0.06 + (vnoise(x / 23 + s * 5, s + 3) - 0.5) * 0.05;
// side wall (left; the right one is its mirror): u = depth 0 (at the viewer) .. 1 (front wall), v = 0 top .. 1 floor
function ciaX_sideWall(mirror) {
  const X = x => mirror ? 639 - x : x;
  const grainA = (u, v) => Math.sin(v * 44 + Math.sin(u * 4.3 + v * 2) * 2.2 + Math.sin(u * 13 + 1) * 0.5);
  for (let x = 0; x < 128; x++) {
    const top = 50 * x / 128, bot = 400 - 64 * x / 128, hh = bot - top;
    const u = x / 128, uu = u * u * 0.4 + u * 0.6;
    let runC = null, runY = 0;
    const flush = y => { if (runC) { g.fillStyle = runC; g.fillRect(X(x), runY, 1, y - runY); } };
    for (let y = Math.floor(top); y < Math.ceil(bot); y++) {
      const v = (y + 0.5 - top) / hh; let c;
      // light: a scallop from the side downlight halfway down the car, brighter up high
      const sc = Math.exp(-(((uu - 0.55) / (0.08 + v * 0.5)) ** 2)) * Math.exp(-v * 1.6) * Math.min(1, v * 14);
      const amb = 0.18 + uu * 0.12;
      if (v < 0.03) { c = ciaX_q(ciaX_BRASS, 0.25 + sc * 0.8 + (v > 0.02 ? 0.15 : 0)); }
      else if (v < 0.035) c = '#1a0e0a';
      else if (v < 0.5) {
        // two walnut panels framed by brass inlay
        const pu = uu < 0.5 ? (uu - 0.02) / 0.46 : (uu - 0.52) / 0.46, pv = (v - 0.035) / 0.465;
        if (uu > 0.49 && uu < 0.52) c = uu < 0.505 ? '#0e0708' : ciaX_q(ciaX_WAL, 0.3 + sc * 0.5);
        else {
          let b = amb + sc * 0.95 + 0.06 * (1 - pv);
          const gr = grainA(pu, pv);
          if (gr > 0.9) b -= 0.06; else if (gr < -0.97) b += 0.035;
          c = ciaX_q(ciaX_WAL, b);
          const inset = Math.min(pu, 1 - pu) * 18, insetV = Math.min(pv, 1 - pv) * 60;
          if ((inset > 0.9 && inset < 1.25 && insetV > 1.3) || (insetV > 1.3 && insetV < 1.9 && inset > 0.9)) c = ciaX_q(ciaX_BRASS, 0.35 + sc * 0.8);
        }
      } else if (v < 0.505) c = '#0c0709';
      else if (v < 0.93) {
        // brushed steel wainscot, reflecting the light as a soft horizontal band
        const w = (v - 0.505) / 0.425;
        const b = 0.2 + uu * 0.14 + 0.2 * Math.exp(-(((w - 0.12) / 0.14) ** 2)) + sc * 0.5 - w * 0.1;
        c = ciaX_q(ciaX_STEEL, b);
        if (Math.abs(uu - 0.505) < 0.006) c = ciaX_q(ciaX_STEEL, b - 0.14);
      } else if (v < 0.935) c = ciaX_q(ciaX_STEEL, 0.5 + uu * 0.2);
      else c = ciaX_q(ciaX_STEEL, 0.1 + uu * 0.06);
      if (c !== runC) { flush(y); runC = c; runY = y; }
    }
    flush(Math.ceil(bot));
    // brass handrail: a tube running in perspective
    const yc = top + hh * 0.56, r = hh * 0.022;
    for (let yy = Math.floor(yc - r); yy <= Math.ceil(yc + r); yy++) {
      const k = (yy + 0.5 - yc) / r; if (k < -1 || k > 1) continue;
      const spec = Math.exp(-(((uu - 0.55) / 0.12) ** 2));
      const b = 0.42 - k * 0.3 - (k > 0.5 ? 0.16 : 0) + (k < -0.4 && k > -0.75 ? 0.12 + spec * 0.35 : 0) + uu * 0.05;
      px(X(x), yy, ciaX_q(ciaX_BRASS, b));
    }
    // soft shadow of the rail on the steel below it
    ciaX_alpha(0.35, () => rect(X(x), Math.round(yc + r + 1 + hh * 0.01), 1, Math.max(1, Math.round(hh * 0.02)), '#05030a'));
  }
  // rail brackets
  for (const x of [34, 96]) {
    const top = 50 * x / 128, hh = 400 - 64 * x / 128 - top, yc = top + hh * 0.56, r = hh * 0.022, bw = Math.max(2, Math.round(r * 0.6));
    ciaX_poly([[X(x) - bw, yc + r], [X(x) + bw, yc + r], [X(x) + bw, yc + r + hh * 0.05], [X(x) - bw, yc + r + hh * 0.05]], ciaX_BRASS[3]);
    rect(X(x) - (mirror ? bw : -bw + 1), yc + r, 1, hh * 0.05, ciaX_BRASS[6]);
  }
}
function ciaX_liftShell() {
  return ciaX_layer('liftShell', 320, 200, () => {
    const LO = ciaX_LO;
    // ---- ceiling: dark bronze, three recessed downlights with brass trims ----
    ciaX_poly([[0, 0], [640, 0], [512, 50], [128, 50]], (x, y) => ciaX_q(ciaX_GRAN, 0.2 + y / 50 * 0.5 + 0.25 * Math.exp(-(((x - 320) / 260) ** 2)) * y / 50));
    for (let i = 1; i < 4; i++) { const k = i / 4; ciaX_poly([[128 * k, 50 * k], [640 - 128 * k, 50 * k], [640 - 128 * k, 50 * k + 1], [128 * k, 50 * k + 1]], mix(ciaX_GRAN[1], ciaX_GRAN[0], 0.5)); }
    ciaX_poly([[122, 46], [518, 46], [512, 50], [128, 50]], ciaX_BRASS[5]);
    ciaX_poly([[108, 42], [532, 42], [522, 46], [118, 46]], ciaX_BRASS[3]);
    ciaX_poly([[0, 0], [2, 0], [128, 49], [126, 49]], ciaX_BRASS[2]); ciaX_poly([[638, 0], [640, 0], [514, 49], [512, 49]], ciaX_BRASS[2]);
    for (const lx of ciaX_LIGHTS) {
      const ly = 30, rx = 24 - Math.abs(lx - 320) * 0.02, ry = 6;
      ciaX_ell(lx, ly + 1, rx + 3, ry + 2, ciaX_BRASS[2]); ciaX_ell(lx, ly, rx + 3, ry + 1.5, ciaX_BRASS[5]);
      ciaX_ell(lx, ly, rx, ry, '#ffe9b0'); ciaX_ell(lx, ly + 0.5, rx * 0.7, ry * 0.6, '#fffaf0');
      ciaX_ell(lx, ly - 2.5, rx * 0.9, 2, '#d8a860');
      ciaX_glow(lx, ly, rx * 2.6, ry * 3.2, '#8a5a30', 0.35, 5);
    }
    // ---- side walls ----
    ciaX_sideWall(false); ciaX_sideWall(true);
    // corners where side walls meet the front wall
    rect(127, 50, 2, 286, '#0a0609'); rect(511, 50, 2, 286, '#0a0609');
    // ---- front wall: brushed steel lit by the downlights ----
    ciaX_poly([[128, 50], [512, 50], [512, 336], [128, 336]], (x, y) => {
      let b = ciaX_wash(x, y) + ciaX_brush(x, 1) * 0.6;
      if ((x > 199 && x < 203) || (x > 437 && x < 441)) b -= 0.05;
      if (y > 322) b = 0.12 + (y === 323 ? 0.3 : 0);
      return ciaX_q(ciaX_STEEL, b);
    });
    rect(128, 50, 384, 2, '#0e0b10');
    // panel seams beside the architrave
    for (const sx of [178, 462]) { rect(sx, 52, 1, 270, '#1b1f27'); rect(sx + 1, 52, 1, 270, mix(ciaX_STEEL[8], '#ffffff', 0.1)); }
    rect(128, 322, 384, 1, '#0d1016');
    // ---- brass architrave around the doorway ----
    const prof = [-0.25, 0.05, 0.2, 0.34, 0.2, 0.06, -0.04, -0.1, -0.16, -0.2, -0.28, -0.36];
    ciaX_poly([[LO.x0 - 12, LO.y0 - 12], [LO.x1 + 12, LO.y0 - 12], [LO.x1 + 12, LO.y1], [LO.x0 - 12, LO.y1]], (x, y) => {
      const dl = x - (LO.x0 - 12), dr = LO.x1 + 11 - x, dt = y - (LO.y0 - 12);
      let i, b;
      if (dt < 12 && dt <= Math.min(dl, dr)) { i = dt; b = 0.5 + ciaX_wash(x, LO.y0 - 20) * 0.35; }
      else if (dl < 12) { i = dl; b = 0.4 + (1 - (y - LO.y0) / 220) * 0.15 + ciaX_wash(x - 14, y) * 0.3; }
      else if (dr < 12) { i = dr; b = 0.36 + (1 - (y - LO.y0) / 220) * 0.12 + ciaX_wash(x + 14, y) * 0.3; }
      else return null;
      return ciaX_q(ciaX_BRASS, b + prof[i]);
    });
    // plinth blocks at the foot of the architrave
    for (const bx of [LO.x0 - 14, LO.x1 - 2]) { ciaX_poly([[bx, 308], [bx + 16, 308], [bx + 16, 336], [bx, 336]], (x, y) => ciaX_q(ciaX_BRASS, 0.38 + (y === 308 ? 0.35 : 0) + (x - bx === 1 ? 0.2 : 0) - (x - bx > 13 ? 0.18 : 0))); }
    // ---- the art-deco dial crowning the doorway ----
    const DX = 320, DY = LO.y0 - 12, R = 46;
    // stepped deco fan behind the dial
    for (let i = 0; i < 3; i++) ciaX_poly([[DX - R - 16 + i * 5, DY], [DX - R - 10 + i * 5, DY - 8 - i * 6], [DX + R + 10 - i * 5, DY - 8 - i * 6], [DX + R + 16 - i * 5, DY]], ciaX_BRASS[2 + i]);
    ciaX_ell(DX, DY, R + 1, R + 1, (x, y) => y < DY ? '#1d0f06' : null);
    ciaX_ell(DX, DY, R, R, (x, y) => {
      if (y >= DY) return null;
      const dx = x + 0.5 - DX, dy = y + 0.5 - DY, r = Math.hypot(dx, dy), a = Math.atan2(-dy, dx);
      if (r > R - 5) return ciaX_q(ciaX_BRASS, 0.52 + 0.3 * Math.sin(a) + (r > R - 1.5 ? -0.2 : r < R - 4 ? -0.25 : 0.05));
      if (r > R - 6.5) return '#140a06';
      return mix('#0d0b10', '#241c22', clamp(1 - r / R, 0, 1) * 0.8);   // black enamel face
    });
    // tick marks between the numerals
    for (let k = 0; k <= 12; k++) {
      const a = (160 - k * 140 / 12) * Math.PI / 180, r0 = R - 7, r1 = k % 4 === 0 ? R - 10 : R - 8.5;
      line(Math.round(DX + Math.cos(a) * r0), Math.round(DY - Math.sin(a) * r0), Math.round(DX + Math.cos(a) * r1), Math.round(DY - Math.sin(a) * r1), ciaX_BRASS[4]);
    }
    // arrow lenses either side of the dial
    for (const [ax, up] of [[DX - R - 30, 1], [DX + R + 30, 0]]) { ciaX_ell(ax, DY - 16, 10, 10, ciaX_BRASS[3]); ciaX_ell(ax, DY - 16.5, 9, 9, ciaX_BRASS[5]); ciaX_ell(ax, DY - 16, 7.5, 7.5, '#120b0a'); }
    // ---- threshold: an aluminium sill with the door track ----
    ciaX_poly([[LO.x0 - 6, 336], [LO.x1 + 6, 336], [LO.x1 + 14, 348], [LO.x0 - 14, 348]], (x, y) => ciaX_q(ciaX_STEEL, y < 338 ? 0.3 : y < 341 ? 0.7 : y === 343 ? 0.15 : 0.58 - (y - 341) * 0.03));
    // ---- floor: polished granite ----
    ciaX_poly([[0, 400], [128, 336], [512, 336], [640, 400]], (x, y) => {
      const k = (y - 336) / 64, pool = Math.exp(-(((x - 320) / (150 + k * 120)) ** 2)) * (1 - k * 0.6);
      return ciaX_q(ciaX_GRAN, 0.3 + pool * 0.5 - k * 0.25);
    });
    // seams of the stone slabs
    for (let i = -3; i <= 3; i++) line(320 + i * 64, 336, 320 + i * 120, 400, '#0a090d');
    ciaX_poly([[0, 400], [128, 336], [131, 336], [5, 400]], '#060508'); ciaX_poly([[640, 400], [512, 336], [509, 336], [635, 400]], '#060508');
    // ---- car operating panel (brass) on the front wall ----
    ciaX_poly([[452, 150], [494, 150], [494, 300], [452, 300]], (x, y) => ciaX_q(ciaX_BRASS, 0.34 + ciaX_wash(x, y) * 0.5 + (x === 452 || y === 150 ? 0.25 : 0) - (x === 493 || y === 299 ? 0.25 : 0)));
    frame(456, 154, 34, 142, ciaX_BRASS[2]);
    for (let i = 0; i < 4; i++) {
      const by = 180 + i * 26;
      ciaX_ell(466, by, 8, 8, ciaX_STEEL[3]); ciaX_ell(465.5, by - 0.5, 7.5, 7.5, ciaX_STEEL[9]); ciaX_ell(466, by, 6.2, 6.2, '#0c0a0c');
      ciaX_ell(466, by, 4.8, 4.8, ciaX_STEEL[5]); ciaX_ell(465.5, by - 0.8, 3.6, 3.4, ciaX_STEEL[8]); px(464, by - 3, ciaX_STEEL[12]);
      text('321L'[i], 478, by - 4, ciaX_BRASS[1]);
    }
    ciaX_ell(466, 284, 7, 7, '#3a0a08'); ciaX_ell(466, 284, 5, 5, '#b0261a'); ciaX_ell(465, 283, 2.5, 2, '#ff8a6a');
    ciaX_t3('SOS', 474, 282, ciaX_BRASS[1]);
    for (const [sx, sy] of [[456, 158], [489, 158], [456, 294], [489, 294]]) { px(sx, sy, ciaX_BRASS[7]); px(sx + 1, sy + 1, ciaX_BRASS[1]); }
    // small certificate plate on the left of the doorway
    ciaX_poly([[146, 196], [174, 196], [174, 232], [146, 232]], (x, y) => ciaX_q(ciaX_BRASS, 0.3 + ciaX_wash(x, y) * 0.5 + (x === 146 || y === 196 ? 0.3 : 0) - (x === 173 || y === 231 ? 0.2 : 0)));
    for (let i = 0; i < 5; i++) rect(150, 202 + i * 6, i === 0 ? 20 : 12 + (i * 5) % 9, 1, ciaX_BRASS[2]);
    // the doorway itself is left open for the doors and the landing beyond
    g.clearRect(LO.x0, LO.y0, LO.x1 - LO.x0, LO.y1 - LO.y0);
  });
}
// one door leaf (side 0 = left, 1 = right), lit as it sits when closed
function ciaX_doorLeaf(side) {
  const LO = ciaX_LO, w = (LO.x1 - LO.x0) / 2, h = LO.y1 - LO.y0;
  return art('ciaX_leaf' + side, w / 2, h / 2, () => {
    for (let x = 0; x < w; x++) {
      const wx = LO.x0 + side * w + x;
      const edge = side ? x : w - 1 - x;           // distance from the meeting edge
      const refl = 0.12 * Math.exp(-((((side ? w - 1 - x : x) - 26) / 9) ** 2)) + 0.07 * Math.exp(-(((edge - 10) / 4) ** 2));
      let runC = null, runY = 0;
      for (let y = 0; y <= h; y++) {
        let c = null;
        if (y < h) {
          const wy = LO.y0 + y;
          let b = ciaX_wash(wx, wy) * 1.05 + refl + ciaX_brush(x, side + 4) * 1.3 + 0.07 - 0.05 * y / h;
          if (y > h - 18) b = 0.2 + (y === h - 18 ? 0.35 : 0) + refl * 0.5;
          if (edge === 0) b = 0.05; else if (edge === 1) b = b + 0.2;
          const outer = side ? w - 1 - x : x;
          if (outer === 0) b -= 0.18;
          c = ciaX_q(ciaX_STEEL, b);
        }
        if (c !== runC) { if (runC) { g.fillStyle = runC; g.fillRect(x, runY, 1, y - runY); } runC = c; runY = y; }
      }
    }
  });
}
// where the lift lets out: a patch of each floor's own room, lit in its colour
const ciaX_SPILL = ['#ffe6b0', '#bcd8ff', '#ffd48a', '#d0ffe8'];
function ciaX_landing(floor, t) {
  // the room picture, positioned so that its middle band shows through the doors (layout coords)
  const ax = 160 - 75, ay = 58 - 38;
  if (floor === 0) ciaLobbyArt(ax, ay, 150, 200, t);
  else if (floor === 1) dataRoomArt(ax, ay, 150, 200, t);
  else if (floor === 2) intelArt(ax, ay, 150, 200, t);
  else cryptoLabArt(ax, ay, 150, 200, t);
}
// the lift from inside: floor (may be fractional while moving), open 0..1, dir -1/0/1 lights an arrow, dest lights a button
function liftArt(x, y, w, h, t, floor, open, dir = 0, dest = floor) {
  g.save();
  g.translate(x, y); if (w !== 320 || h !== 200) g.scale(w / 320, h / 200);
  ciaX_clip(0, 0, 320, 200);
  const LO = ciaX_LO, pos = clamp(floor, 0, 3), f = Math.round(pos), o = clamp(open, 0, 1), e = ciaX_ease(o);
  const lw = (LO.x1 - LO.x0) / 2, sh = Math.round(e * (lw - 4));
  // ---- the landing beyond the doors ----
  ciaX_clip(LO.x0 / 2, LO.y0 / 2, (LO.x1 - LO.x0) / 2, (LO.y1 - LO.y0) / 2);
  if (o > 0) {
    rect(LO.x0 / 2, LO.y0 / 2, (LO.x1 - LO.x0) / 2, (LO.y1 - LO.y0) / 2, P.K);
    ciaX_landing(f, t);
    fine(() => {
      // the shaft's jamb shadows frame the view
      ciaX_alpha(0.55, () => { rect(LO.x0, LO.y0, 8, LO.y1 - LO.y0, '#05040a'); rect(LO.x1 - 8, LO.y0, 8, LO.y1 - LO.y0, '#05040a'); rect(LO.x0, LO.y0, LO.x1 - LO.x0, 6, '#05040a'); });
      ciaX_alpha(0.35, () => { rect(LO.x0 + 8, LO.y0, 6, LO.y1 - LO.y0, '#05040a'); rect(LO.x1 - 14, LO.y0, 6, LO.y1 - LO.y0, '#05040a'); rect(LO.x0, LO.y0 + 6, LO.x1 - LO.x0, 5, '#05040a'); });
    });
  } else rect(LO.x0 / 2, LO.y0 / 2, (LO.x1 - LO.x0) / 2, (LO.y1 - LO.y0) / 2, P.K);
  // ---- the doors ----
  fine(() => {
    g.drawImage(ciaX_doorLeaf(0), LO.x0 - sh, LO.y0); g.drawImage(ciaX_doorLeaf(1), LO.x0 + lw + sh, LO.y0);
    if (o > 0 && o < 1) { rect(LO.x0 + lw - sh - 1, LO.y0, 1, LO.y1 - LO.y0, '#07060a'); rect(LO.x0 + lw + sh, LO.y0, 1, LO.y1 - LO.y0, '#07060a'); }
    // travelling: light from each landing sweeps across the hairline gap between the leaves
    if (o === 0 && dir) {
      const p = ((pos % 1) + 1) % 1, yy = LO.y0 + (dir > 0 ? p : 1 - p) * (LO.y1 - LO.y0 + 80) - 40;
      ciaX_alpha(0.9, () => { rect(LO.x0 + lw - 1, Math.max(LO.y0, yy - 26), 2, 52, '#fff1c8'); });
      ciaX_glow(LO.x0 + lw, yy, 6, 30, '#ffcf80', 0.25, 4);
    }
  });
  g.restore();
  // ---- the car ----
  blit(ciaX_liftShell(), 0, 0);
  fine(() => {
    const DX = 320, DY = LO.y0 - 12, R = 46;
    // floor numerals on the dial, lit amber when the car is at that floor
    for (let i = 0; i < 4; i++) {
      const a = (160 - i * 140 / 3) * Math.PI / 180, cx = Math.round(DX + Math.cos(a) * (R - 17)), cy = Math.round(DY - Math.sin(a) * (R - 18));
      const on = i === f, ch = 'L123'[i];
      if (on) { ciaX_glow(cx, cy, 16, 16, '#ff8a20', 0.55, 6); ciaX_ell(cx, cy, 6.5, 6.5, '#b8480c'); ciaX_ell(cx, cy, 5.5, 5.5, '#f08a24'); }
      else ciaX_ell(cx, cy, 6.5, 6.5, '#1e1210');
      text(ch, cx - (ch === '1' ? 1 : 2), cy - 3, on ? '#fff6d8' : '#5a3a22');
    }
    // the needle sweeps smoothly with the car
    const na = (160 - pos * 140 / 3) * Math.PI / 180, nx = Math.cos(na), ny = -Math.sin(na);
    for (let r = 0; r < R - 27; r++) { const wdt = r < R - 36 ? 1 : 0; const cx = DX + nx * r, cy = DY - 2 + ny * r; rect(Math.round(cx - wdt / 2), Math.round(cy), 1 + wdt, 1, r > R - 32 ? ciaX_BRASS[7] : ciaX_BRASS[5]); }
    ciaX_ell(DX, DY - 1, 6, 5, ciaX_BRASS[2]); ciaX_ell(DX, DY - 2, 5, 4, ciaX_BRASS[5]); px(DX - 2, DY - 4, ciaX_BRASS[7]);
    // direction arrows
    const blinkOn = (t * 3 % 1) < 0.65;
    for (const [ax, up] of [[DX - R - 30, 1], [DX + R + 30, 0]]) {
      const lit = dir !== 0 && (up ? dir > 0 : dir < 0) && blinkOn, ay = DY - 16;
      if (lit) ciaX_glow(ax, ay, 18, 18, '#ff9a30', 0.5, 5);
      const c = lit ? '#ffd27a' : '#3a2016';
      for (let k = 0; k < 7; k++) { const yy = up ? ay - 4 + k : ay + 4 - k; rect(ax - k * 0.75 - 0.5 | 0, yy, Math.round(k * 1.5) + 1, 1, c); }
    }
    // the destination button glows on the car panel
    const bi = 3 - clamp(Math.round(dest), 0, 3), by = 180 + bi * 26;
    ciaX_glow(466, by, 16, 16, '#ff9a30', 0.45, 5);
    ciaX_ell(466, by, 6.2, 6.2, '#ffb040'); ciaX_ell(466, by, 4.8, 4.8, '#fff0c0'); ciaX_ell(465, by - 1, 2.4, 2, '#ffffff');
    // light from the landing spills across the threshold and onto the car floor
    if (o > 0) {
      const sc = ciaX_SPILL[f], hw = (sh + 2);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        g.globalAlpha = 0.07 * e;
        const k = 1 - i * 0.16;
        ciaX_poly([[320 - hw * k, 336], [320 + hw * k, 336], [320 + hw * k * 1.9, 400], [320 - hw * k * 1.9, 400]], sc);
      }
      g.restore();
    }
    // polished reflection of the doorway in the granite: copy the doorway once, then lay it down flipped, fading
    const m = g.getTransform(), rw = LO.x1 - LO.x0 + 32, rh = 52;
    const buf = ciaX_reflBuf(rw, rh);
    const bx = buf.getContext('2d');
    bx.setTransform(1, 0, 0, 1, 0, 0); bx.clearRect(0, 0, rw, rh);
    bx.drawImage(cv, m.a * (LO.x0 - 16) + m.e, m.d * (336 - rh) + m.f, m.a * rw, m.d * rh, 0, 0, rw, rh);
    for (let r = 0; r < rh; r += 2) {
      g.globalAlpha = 0.2 * (1 - r / rh);
      g.drawImage(buf, 0, rh - r - 2, rw, 2, LO.x0 - 16 - r * 0.2, 349 + r, rw + r * 0.4, 2);
    }
    g.globalAlpha = 1;
  });
  g.restore(); g.restore();
}
let ciaX_rbuf = null;
function ciaX_reflBuf(w, h) { if (!ciaX_rbuf || ciaX_rbuf.width !== w || ciaX_rbuf.height !== h) { ciaX_rbuf = document.createElement('canvas'); ciaX_rbuf.width = w; ciaX_rbuf.height = h; } return ciaX_rbuf; }
// the ride itself: doors close, the dial sweeps floor to floor, ding, doors open, then next()
function liftScene(fromFloor, toFloor, next) {
  const n = Math.abs(toFloor - fromFloor), dir = Math.sign(toFloor - fromFloor);
  const tClose0 = 0.1, tClose1 = 0.6, travel = n ? 0.4 + 0.2 * n : 0.2, tArrive = tClose1 + travel, tOpen0 = tArrive + 0.14, tOpen1 = tOpen0 + 0.5, tEnd = tOpen1 + 0.22;
  let done = false, stepsPlayed = 0; const flags = {};
  const finish = () => { if (done) return; done = true; next(); };
  const posAt = t => t <= tClose1 || !n ? (t <= tClose1 ? fromFloor : toFloor) : fromFloor + dir * n * ciaX_ease(Math.min(1, (t - tClose1) / travel));
  return {
    t: 0,
    update(dt) {
      const t = this.t += dt;
      if (!flags.close && t >= tClose0) { flags.close = 1; sfx.noise(0.35, 0.03, 300); }
      if (!flags.shut && t >= tClose1) { flags.shut = 1; sfx.tone(90, 0.08, 'square', 0.05); if (n) sfx.tone(55, travel, 'triangle', 0.05, 25); }
      const k = Math.abs(Math.round(posAt(t)) - fromFloor);
      while (stepsPlayed < k) { stepsPlayed++; if (stepsPlayed < n) sfx.tone(520, 0.03, 'square', 0.03); }
      if (!flags.ding && t >= tArrive) { flags.ding = 1; sfx.tone(1319, 0.5, 'sine', 0.09); sfx.tone(1047, 0.8, 'sine', 0.08, 0, 0.16); }
      if (!flags.open && t >= tOpen0) { flags.open = 1; sfx.noise(0.35, 0.03, 300); }
      if (t >= tEnd) finish();
    },
    draw() {
      const t = this.t;
      const open = t < tClose0 ? 1 : t < tClose1 ? 1 - (t - tClose0) / (tClose1 - tClose0) : t < tOpen0 ? 0 : Math.min(1, (t - tOpen0) / (tOpen1 - tOpen0));
      const moving = t > tClose1 && t < tArrive && n > 0;
      // a half-pixel jolt as the car starts and stops
      const jolt = n && ((t > tClose1 + 0.02 && t < tClose1 + 0.09) || (t > tArrive - 0.07 && t < tArrive)) ? 0.5 : 0;
      rect(0, 0, W, H, P.K);
      liftArt(0, jolt, 320, 200, t, posAt(t), open, moving ? dir : 0, toFloor);
    },
    onKey() { finish(); }, onTap() { finish(); },
  };
}

// ===================================================================
// (rooms)
// ===================================================================

// ===================================================================
// "WHICH FLOOR?": standing in the car, facing the brass button panel (150x200 panel, fine 300x400)
// ===================================================================
const ciaX_FLOORNAMES = ['LOBBY', 'DATA', 'INTEL', 'CRYPTO'];
const ciaX_BTN = i => ({ x: 132, y: 186 + (3 - i) * 42 });   // button centre for floor i (0 = L)
function ciaX_copBG() {
  return ciaX_layer('cop', 150, 200, () => {
    // brushed steel wall, washed by a downlight up and to the left
    ciaX_poly([[0, 0], [300, 0], [300, 400], [0, 400]], (x, y) => {
      const dy = y + 30, wd = 20 + dy * 0.34, cone = Math.exp(-(((x - 70) / wd) ** 2)) * Math.exp(-dy / 260);
      return ciaX_q(ciaX_STEEL, 0.2 + cone * 0.7 + 0.12 * (1 - y / 400) + ciaX_brush(x, 7));
    });
    // the edge of the door architrave and a sliver of the door on the far left
    ciaX_poly([[0, 0], [10, 0], [10, 400], [0, 400]], (x, y) => ciaX_q(ciaX_STEEL, 0.3 + ciaX_brush(x, 4) - y / 2000));
    rect(10, 0, 1, 400, '#0b0a0e');
    const prof = [-0.3, 0.02, 0.18, 0.34, 0.42, 0.3, 0.16, 0.06, -0.02, -0.08, -0.12, -0.16, -0.2, -0.24, -0.28, -0.32, -0.36, -0.42];
    ciaX_poly([[11, 0], [11 + prof.length, 0], [11 + prof.length, 400], [11, 400]], (x, y) => ciaX_q(ciaX_BRASS, 0.42 + prof[x - 11] + 0.15 * Math.exp(-(((y - 90) / 120) ** 2))));
    ciaX_alpha(0.35, () => rect(29, 0, 5, 400, '#07060c'));
    // the brass panel: a raised plate with a soft diagonal sheen
    const PX0 = 78, PX1 = 262, PY0 = 26, PY1 = 384;
    ciaX_alpha(0.45, () => ciaX_poly([[PX0 + 6, PY0 + 8], [PX1 + 7, PY0 + 8], [PX1 + 7, PY1 + 8], [PX0 + 6, PY1 + 8]], '#06050a'));
    ciaX_poly([[PX0 + 3, PY0], [PX1 - 3, PY0], [PX1, PY0 + 3], [PX1, PY1 - 3], [PX1 - 3, PY1], [PX0 + 3, PY1], [PX0, PY1 - 3], [PX0, PY0 + 3]], (x, y) => {
      const d = (x - PX0) * 0.55 + (y - PY0) * 0.45, sheen = Math.exp(-(((d - 70) / 34) ** 2)) * 0.22 + Math.exp(-(((d - 150) / 12) ** 2)) * 0.1;
      let b = 0.5 - (y - PY0) / (PY1 - PY0) * 0.2 - (x - PX0) / (PX1 - PX0) * 0.08 + sheen;
      if (x - PX0 < 2 || y - PY0 < 2) b += 0.28; else if (PX1 - x < 3 || PY1 - y < 3) b -= 0.3;
      return ciaX_q(ciaX_BRASS, b);
    });
    // an engraved border line
    const eng = (x0, y0, x1, y1) => { frame(x0, y0, x1 - x0, y1 - y0, ciaX_BRASS[2]); frame(x0 + 1, y0 + 1, x1 - x0, y1 - y0, ciaX_BRASS[7]); frame(x0, y0, x1 - x0, y1 - y0, ciaX_BRASS[2]); };
    eng(PX0 + 8, PY0 + 8, PX1 - 8, PY1 - 8);
    for (const [sx, sy] of [[PX0 + 16, PY0 + 16], [PX1 - 17, PY0 + 16], [PX0 + 16, PY1 - 17], [PX1 - 17, PY1 - 17]]) {
      ciaX_ell(sx + 0.5, sy + 1, 4, 4, ciaX_BRASS[1]); ciaX_ell(sx, sy, 4, 4, ciaX_BRASS[4]); ciaX_ell(sx - 0.5, sy - 0.5, 2.5, 2.5, ciaX_BRASS[6]);
      line(sx - 2, sy + 2, sx + 2, sy - 2, ciaX_BRASS[1]);
    }
    // engraved heading and the agency star in a ring
    const engText = (s, x, y) => { text(s, x + 1, y + 1, ciaX_BRASS[7]); text(s, x, y, ciaX_BRASS[1]); };
    const cx = (PX0 + PX1) / 2;
    engText('CENTRAL', cx - textW('CENTRAL') / 2, 46); engText('INTELLIGENCE', cx - textW('INTELLIGENCE') / 2, 56); engText('AGENCY', cx - textW('AGENCY') / 2, 66);
    // position indicator: a black glass window
    const IX0 = 108, IX1 = 232, IY0 = 82, IY1 = 110;
    rect(IX0 - 3, IY0 - 3, IX1 - IX0 + 6, IY1 - IY0 + 6, ciaX_BRASS[2]); rect(IX0 - 2, IY1 + 2, IX1 - IX0 + 5, 1, ciaX_BRASS[7]); rect(IX1 + 2, IY0 - 2, 1, IY1 - IY0 + 5, ciaX_BRASS[7]);
    ciaX_poly([[IX0, IY0], [IX1, IY0], [IX1, IY1], [IX0, IY1]], (x, y) => mix('#0a0708', '#1d1416', (y - IY0) / (IY1 - IY0) * 0.6));
    ciaX_alpha(0.12, () => ciaX_poly([[IX0 + 10, IY0], [IX0 + 34, IY0], [IX0 + 22, IY1], [IX0 - 2, IY1]], '#ffffff'));
    // the seal: a sixteen-point compass star in a double ring, engraved
    const SX = cx, SY = 140;
    ciaX_ell(SX + 1, SY + 1, 19, 19, ciaX_BRASS[7]); ciaX_ell(SX, SY, 19, 19, ciaX_BRASS[2]); ciaX_ell(SX, SY, 17, 17, ciaX_BRASS[5]);
    ciaX_ell(SX, SY, 14, 14, ciaX_BRASS[2]); ciaX_ell(SX, SY, 13, 13, ciaX_BRASS[4]);
    for (let k = 0; k < 16; k++) {
      const a = k * Math.PI / 8, r = k % 4 === 0 ? 12 : k % 2 === 0 ? 8.5 : 6, w = k % 4 === 0 ? 2.6 : 1.8;
      const tx = SX + Math.cos(a) * r, ty = SY + Math.sin(a) * r, lx = SX + Math.cos(a + Math.PI / 2) * w, ly = SY + Math.sin(a + Math.PI / 2) * w, rx = SX - Math.cos(a + Math.PI / 2) * w, ry = SY - Math.sin(a + Math.PI / 2) * w;
      ciaX_poly([[lx, ly], [tx, ty], [SX, SY]], ciaX_BRASS[6]); ciaX_poly([[SX, SY], [tx, ty], [rx, ry]], ciaX_BRASS[2]);
    }
    ciaX_ell(SX, SY, 2, 2, ciaX_BRASS[7]);
    // floor buttons in a column with engraved name plates
    for (let i = 0; i < 4; i++) {
      const b = ciaX_BTN(i);
      ciaX_ell(b.x + 2, b.y + 3, 17, 17, ciaX_BRASS[1]);                                   // cast shadow on the plate
      ciaX_ell(b.x, b.y, 17, 17, (x, y) => ciaX_q(ciaX_STEEL, 0.62 - ((x - b.x) + (y - b.y)) / 40)); // bezel ring
      ciaX_ell(b.x, b.y, 14, 14, '#0a080b');                                                  // gap where the ring light sits
      ciaX_ell(b.x, b.y, 12.5, 12.5, (x, y) => {                                             // convex steel face
        const dx = x + 0.5 - b.x, dy = y + 0.5 - b.y, r = Math.hypot(dx, dy) / 12.5;
        return ciaX_q(ciaX_STEEL, 0.5 - (dx + dy) / 50 - r * r * 0.15 + (Math.hypot(dx + 5, dy + 5) < 3.2 ? 0.3 : 0));
      });
      const ch = 'L123'[i]; text(ch, b.x - (ch === '1' ? 1 : 2) + 1, b.y - 3 + 1, ciaX_STEEL[13]); text(ch, b.x - (ch === '1' ? 1 : 2), b.y - 3, ciaX_STEEL[2]);
      // name plate
      const nx = b.x + 26, ny = b.y - 9, nw = 70;
      rect(nx, ny, nw, 18, ciaX_BRASS[2]); rect(nx + 1, ny + 1, nw - 1, 17, ciaX_BRASS[7]); rect(nx + 1, ny + 1, nw - 2, 16, ciaX_BRASS[4]);
      ciaX_poly([[nx + 1, ny + 1], [nx + nw - 1, ny + 1], [nx + nw - 1, ny + 7], [nx + 1, ny + 7]], mix(ciaX_BRASS[4], ciaX_BRASS[5], 0.5));
      engText(ciaX_FLOORNAMES[i], nx + (nw - textW(ciaX_FLOORNAMES[i])) / 2, ny + 5);
    }
    // alarm and door buttons along the bottom
    const bY = 350;
    for (const [bx, col, lab] of [[124, '#b02418', 'bell'], [160, null, 'open'], [196, null, 'close']]) {
      ciaX_ell(bx + 1, bY + 2, 11, 11, ciaX_BRASS[1]); ciaX_ell(bx, bY, 11, 11, (x, y) => ciaX_q(ciaX_STEEL, 0.6 - ((x - bx) + (y - bY)) / 26));
      ciaX_ell(bx, bY, 8.5, 8.5, '#0a080b');
      if (col) { ciaX_ell(bx, bY, 7.5, 7.5, col); ciaX_ell(bx - 2, bY - 2, 3.5, 3, '#ff8a6a'); ciaX_ell(bx - 2.5, bY - 2.5, 1.5, 1.2, '#ffd8c8'); }
      else {
        ciaX_ell(bx, bY, 7.5, 7.5, (x, y) => ciaX_q(ciaX_STEEL, 0.45 - ((x - bx) + (y - bY)) / 30));
        const c = ciaX_STEEL[2], o = lab === 'open';
        for (let k = 0; k < 4; k++) { rect(bx - 5 + (o ? 3 - k : k), bY - k, 1, k * 2 + 1, c); rect(bx + 4 - (o ? 3 - k : k), bY - k, 1, k * 2 + 1, c); }
        rect(bx, bY - 4, 1, 9, c);
      }
    }
    // a keyswitch for the fire service
    ciaX_ell(232, bY, 7, 7, ciaX_STEEL[4]); ciaX_ell(232, bY, 5, 5, ciaX_STEEL[10]); rect(231, bY - 3, 2, 7, '#0a080b');
  });
}
// the agent's hand, index finger out (fingertip at 0,0; arm goes off down and to the right)
function ciaX_hand() {
  return art('ciaX_hand', 80, 70, () => {
    g.translate(8, 6);
    const SK = ['#3a1c1c', '#6a3528', '#9a5638', '#c47d52', '#e3a778', '#f6cfa0'];
    const NV = ['#07080f', '#11152a', '#1c2240', '#2a3358', '#3b4772'];
    // sleeve: navy suit cloth, lit along its upper edge
    ciaX_poly([[70, 52], [100, 36], [170, 120], [170, 150], [104, 150]], (x, y) => { const d = ((x - 70) * 0.6 - (y - 52) * 0.8); return NV[clamp(Math.floor(2 + d / 14 - (x - 70) / 60), 0, 4)]; });
    ciaX_poly([[98, 38], [104, 36], [124, 60], [118, 62]], NV[4]);
    // shirt cuff
    ciaX_poly([[60, 50], [90, 32], [104, 44], [76, 64]], (x, y) => (y - 32) - (x - 60) * 0.1 < 14 ? '#e8e4dc' : '#a8aab8');
    ciaX_poly([[60, 50], [90, 32], [92, 35], [63, 53]], '#ffffff');
    // back of the hand
    ciaX_poly([[26, 24], [44, 14], [62, 18], [80, 38], [66, 58], [44, 58], [30, 46]], (x, y) => SK[clamp(Math.floor(4.1 - (y - 14) / 16 + (x - 26) / 90), 1, 5)]);
    // curled fingers under the palm
    for (let k = 0; k < 3; k++) {
      const fx = 34 + k * 9, fy = 44 + k * 5;
      ciaX_ell(fx, fy, 7, 6, SK[2]); ciaX_ell(fx - 0.5, fy - 1.5, 6, 4.5, SK[3]); ciaX_ell(fx - 2, fy - 3, 2.5, 1.5, SK[4]);
      px(fx - 6, fy + 1, SK[1]); rect(fx - 5, fy + 4, 7, 1, SK[1]);
    }
    // thumb tucked along the side
    ciaX_poly([[24, 30], [40, 26], [50, 34], [44, 40], [28, 38]], SK[3]); ciaX_poly([[24, 30], [40, 26], [44, 30], [26, 34]], SK[4]);
    ciaX_ell(26, 34, 4, 3.5, SK[3]); px(24, 31, SK[5]);
    // the index finger, pointing up and to the left
    ciaX_poly([[0, -2], [5, -4], [42, 12], [38, 24], [2, 7], [-2, 3]], (x, y) => {
      const d = (y - x * 0.42) ;  // across the finger: small = upper (lit) edge
      return SK[d < -1.5 ? 5 : d < 1.5 ? 4 : d < 5 ? 3 : 2];
    });
    ciaX_ell(1.5, 1.5, 4, 4, SK[4]); ciaX_ell(0.5, 0.5, 2.5, 2.2, SK[5]);
    // fingernail and knuckle creases
    ciaX_poly([[-1, 0], [3, -2], [7, 0], [3, 3]], '#f4d0c0'); px(0, 0, '#ffffff');
    line(14, 7, 17, 4, SK[2]); line(15, 8, 18, 5, SK[5]); line(27, 13, 30, 9, SK[2]);
    // knuckle highlights along the top of the hand
    for (const [kx, ky] of [[44, 17], [52, 23], [60, 29]]) { rect(kx - 2, ky, 4, 1, SK[5]); px(kx - 2, ky + 1, SK[2]); }
    ciaX_rim(160, 140, '#1a0c10', 0.55);
  });
}
let ciaX_handPos = null, ciaX_warm = false;
function ciaFloorsArt(x, y, w, h, t, floor, sel) {
  ciaX_clip(x, y, w, h);
  blit(ciaX_copBG(), x, y);
  sel = clamp(sel | 0, 0, 3); floor = clamp(Math.round(floor || 0), 0, 3);
  fine(() => {
    g.translate(x * 2, y * 2);
    // the position indicator shows the floor the car is standing at
    const IX0 = 108, IY0 = 82;
    for (let i = 0; i < 4; i++) {
      const lx = IX0 + 28 + i * 23, ly = IY0 + 14, on = i === floor, ch = 'L123'[i];
      if (on) { ciaX_glow(lx, ly, 13, 11, '#ff7a18', 0.6, 5); ciaX_ell(lx, ly, 7, 7, '#a33e0c'); ciaX_ell(lx, ly, 6, 6, '#f28a24'); }
      else ciaX_ell(lx, ly, 6.5, 6.5, '#1f1212');
      text(ch, lx - (ch === '1' ? 1 : 2), ly - 3, on ? '#fff4d0' : '#553624');
    }
    // the chosen button's ring light
    const b = ciaX_BTN(sel), pulse = 0.8 + 0.2 * Math.sin(t * 4);
    ciaX_glow(b.x, b.y, 34, 34, '#ff8a20', 0.42 * pulse, 7);
    ciaX_ell(b.x, b.y, 14, 14, '#ffc85a'); ciaX_ell(b.x, b.y, 13.2, 13.2, '#fff2c0');
    ciaX_ell(b.x, b.y, 12.5, 12.5, (xx, yy) => {
      const dx = xx + 0.5 - b.x, dy = yy + 0.5 - b.y, r = Math.hypot(dx, dy) / 12.5;
      return ciaX_q(ciaX_BRASS, 0.62 - (dx + dy) / 60 - r * r * 0.18 + (Math.hypot(dx + 5, dy + 5) < 3.2 ? 0.25 : 0));
    });
    const ch = 'L123'[sel]; text(ch, b.x - (ch === '1' ? 1 : 2), b.y - 3, '#6a3208');
    // warm light on the name plate
    ciaX_glow(b.x + 61, b.y, 40, 12, '#ff9a30', 0.18 * pulse, 4);
    // the agent's hand glides to the chosen button
    const tx = b.x + 9, ty = b.y + 11;
    if (!ciaX_handPos) ciaX_handPos = { x: tx, y: ty, t };
    const dt = clamp(t - ciaX_handPos.t, 0, 0.1); ciaX_handPos.t = t;
    const k = 1 - Math.exp(-dt * 12); ciaX_handPos.x += (tx - ciaX_handPos.x) * k; ciaX_handPos.y += (ty - ciaX_handPos.y) * k;
    if (Math.abs(ciaX_handPos.y - ty) > 200) { ciaX_handPos.x = tx; ciaX_handPos.y = ty; }
    const hx = Math.round(ciaX_handPos.x), hy = Math.round(ciaX_handPos.y + Math.sin(t * 1.7) * 1.2);
    // its shadow on the plate, then the hand
    ciaX_alpha(0.3, () => { g.save(); g.translate(hx + 8, hy + 10); ciaX_poly([[0, 0], [44, 18], [80, 40], [180, 200], [100, 200], [20, 60]], '#0a0508'); g.restore(); });
    g.drawImage(ciaX_hand(), hx - 8, hy - 6);
  });
  g.restore();
  // while the player reads the menu, quietly build the lift's cached layers so the ride starts smoothly
  if (t > 0.3 && !ciaX_warm) { ciaX_warm = true; ciaX_liftShell(); ciaX_doorLeaf(0); ciaX_doorLeaf(1); }
}

// banded light across a shape: ramp index = base + (x - cx) * kx + (y - cy) * ky
const ciaX_sh = (ramp, base, cx, cy, kx, ky) => (x, y) => ramp[clamp(Math.round(base + (x - cx) * kx + (y - cy) * ky), 0, ramp.length - 1)];
// an eye: white, iris, catch-light (fine px)
function ciaX_eye(x, y, dir = 0, white = '#e8dcd0', iris = '#3a2418') { rect(x, y, 3, 2, white); rect(x + 1 + dir, y, 1, 2, iris); px(x + 1 + dir, y, '#120a0a'); }

// ===================================================================
// LOBBY (150x200, fine 300x400; the floor bar covers the top 22 fine rows)
// Late-afternoon sun slants in from high windows on the right across a cream marble hall:
// the Memorial Wall of stars, the flag, brass lift doors, the guard at his walnut desk and
// the agency seal inlaid in the polished granite floor. Your contact waits in the foreground.
// ===================================================================
const ciaX_MARB = ciaX_ramp(['#2c2533', '#4d4350', '#766a70', '#9c8f8e', '#bfb2a6', '#dccfbe', '#f1e6d2', '#fff8e8'], 16);
const ciaX_FLR = ciaX_ramp(['#0f0e15', '#1c1a24', '#2c2934', '#403b46', '#58515a', '#746b70', '#948a88'], 14);
const ciaX_VP = { x: 150, y: 168 };
function ciaX_contact() {
  return art('ciaX_contact', 50, 116, () => {
    const COAT = ['#1f1519', '#382621', '#56402c', '#79603d', '#9b7e50', '#bc9d66', '#dcbd83', '#f2dca6'];
    const HAT = ['#141117', '#231e24', '#362e32', '#4a3f41', '#62544f', '#7c6b60'];
    const SKIN = ['#2e1719', '#5a2e27', '#8a4c38', '#b46e50', '#d8966c', '#f0bd8e'];
    const TRS = ['#0d0c12', '#191822', '#262532', '#353444'];
    const lit = (r, b, cx, k = 0.09) => ciaX_sh(r, b, cx, 0, k, 0);
    // legs and shoes
    ciaX_poly([[30, 176], [44, 176], [43, 214], [31, 214]], lit(TRS, 1, 37, 0.1));
    ciaX_poly([[48, 176], [62, 176], [60, 214], [49, 214]], lit(TRS, 1.6, 55, 0.12));
    ciaX_poly([[26, 212], [44, 212], [45, 220], [24, 220]], '#120c0e'); ciaX_poly([[27, 212], [42, 212], [42, 214], [28, 214]], '#3a2826');
    ciaX_poly([[48, 212], [62, 212], [66, 220], [48, 220]], '#140d0e'); ciaX_poly([[50, 212], [61, 212], [63, 215], [50, 214]], '#5a403a');
    // coat skirt, flaring, with folds
    ciaX_poly([[24, 104], [68, 104], [76, 178], [70, 181], [16, 181], [13, 178]], (x, y) => {
      let i = 3 + (x - 44) * 0.07;
      const f = Math.sin((x - 44) * 0.36 + (y - 104) * 0.015);
      if (f > 0.75) i += 1; else if (f < -0.8) i -= 1;
      return COAT[clamp(Math.round(i), 1, 6)];
    });
    ciaX_poly([[13, 178], [76, 178], [70, 182], [16, 182]], COAT[1]);
    line(46, 108, 47, 180, COAT[1]); line(47, 108, 48, 180, COAT[4]);
    // torso and shoulders; the sun comes from the right
    ciaX_poly([[19, 52], [30, 44], [60, 44], [72, 52], [70, 104], [22, 104]], lit(COAT, 3.3, 46, 0.075));
    // arms, hands deep in the pockets
    ciaX_poly([[12, 56], [22, 50], [30, 60], [28, 120], [16, 122], [12, 100]], lit(COAT, 2.2, 22, 0.08));
    ciaX_poly([[64, 50], [74, 54], [79, 98], [76, 122], [64, 120], [64, 64]], lit(COAT, 4.6, 70, 0.14));
    line(79, 64, 78, 110, COAT[7]); line(78, 60, 79, 64, COAT[7]);
    ciaX_poly([[14, 116], [29, 114], [29, 122], [15, 124]], COAT[1]); ciaX_poly([[63, 114], [77, 116], [76, 124], [63, 122]], COAT[3]);
    // belt with buckle
    ciaX_poly([[21, 100], [71, 100], [71, 108], [21, 108]], (x, y) => y === 100 ? COAT[5] : lit(COAT, 1.8, 46, 0.06)(x, y));
    rect(40, 99, 10, 10, COAT[1]); rect(42, 101, 6, 6, COAT[3]); rect(44, 103, 2, 2, COAT[1]);
    // lapels and upturned collar
    ciaX_poly([[34, 44], [44, 46], [42, 76], [30, 56]], COAT[2]); ciaX_poly([[44, 46], [58, 44], [60, 56], [46, 76]], COAT[5]);
    line(44, 47, 44, 76, COAT[1]);
    ciaX_poly([[30, 34], [37, 40], [36, 50], [28, 48]], COAT[3]); ciaX_poly([[53, 40], [60, 34], [63, 48], [55, 50]], COAT[6]);
    // shirt and tie in the V
    ciaX_poly([[38, 44], [50, 44], [44, 60]], '#d8d4cc'); ciaX_poly([[42, 44], [46, 44], [46, 58], [44, 62], [42, 58]], '#6e1a1c'); rect(43, 45, 1, 12, '#a8322c');
    // double-breasted buttons
    for (const [bx, by] of [[36, 64], [52, 64], [36, 82], [52, 82]]) { rect(bx, by, 3, 3, COAT[1]); px(bx + 1, by, COAT[5]); }
    // epaulette and storm flap
    ciaX_poly([[60, 46], [71, 50], [71, 53], [60, 50]], COAT[6]);
    // neck in shadow, then the head
    ciaX_poly([[38, 36], [50, 36], [50, 45], [38, 45]], SKIN[1]);
    ciaX_ell(44, 29, 9.5, 11.5, (x, y) => SKIN[clamp(Math.round(2.6 + (x - 44) * 0.18 - (y < 25 ? 1 : 0)), 1, 5)]);
    // ear
    ciaX_ell(35, 29, 2.5, 3.5, SKIN[2]); px(35, 29, SKIN[1]);
    // shadow of the brim across the brow
    ciaX_poly([[34, 18], [55, 18], [54, 24], [35, 25]], (x, y) => SKIN[x > 49 ? 2 : 1]);
    // eyes under the brim, a strong nose catching the sun, set mouth
    ciaX_eye(38, 25, 1, '#b8a698', '#241410'); ciaX_eye(46, 25, 1, '#d8c4b0', '#241410');
    rect(38, 24, 4, 1, SKIN[0]); rect(46, 24, 4, 1, SKIN[0]);
    rect(45, 26, 1, 5, SKIN[5]); rect(44, 31, 3, 1, SKIN[1]); px(47, 30, SKIN[4]);
    rect(41, 34, 6, 1, SKIN[1]); rect(42, 35, 4, 1, SKIN[3]);
    rect(36, 30, 2, 5, SKIN[1]);     // shadowed cheek
    ciaX_poly([[36, 36], [44, 40], [52, 36], [50, 39], [44, 42], [38, 39]], SKIN[2]);  // jaw
    rect(51, 27, 2, 8, SKIN[5]);    // sunlit cheek edge
    // the cigarette, drooping from the corner of the mouth
    line(47, 34, 55, 36, '#f4efe4'); line(47, 35, 54, 37, '#b8b0a4'); px(56, 36, '#ff6a1a'); px(56, 37, '#a02a0a');
    // fedora
    ciaX_poly([[30, 4], [37, 0], [52, 0], [58, 4], [59, 16], [29, 16]], (x, y) => HAT[clamp(Math.round(2.4 + (x - 44) * 0.1 + (y < 4 ? 1 : 0)), 0, 5)]);
    line(44, 1, 44, 7, HAT[0]); line(45, 1, 45, 6, HAT[4]);
    ciaX_poly([[29, 11], [59, 11], [59, 15], [29, 15]], '#0e0b0e'); rect(29, 11, 30, 1, '#2a2226');
    ciaX_ell(44, 17, 24, 4.6, (x, y) => HAT[clamp(Math.round(2 + (x - 44) * 0.07 + (y < 17 ? 1.2 : -0.6)), 0, 5)]);
    rect(58, 15, 9, 1, HAT[5]);
    ciaX_rim(100, 232, '#120a10', 0.55);
  });
}
function ciaX_guard() {
  return art('ciaX_guard', 26, 32, () => {
    const NV = ['#090b16', '#131a30', '#1e2946', '#2d3c62', '#415486', '#5b70a6'];
    const SKIN = ['#2a1616', '#57302a', '#86503c', '#b07458', '#d49b78', '#ecc39e'];
    // shoulders and chest
    ciaX_poly([[4, 40], [14, 32], [38, 32], [48, 40], [50, 64], [2, 64]], ciaX_sh(NV, 2.4, 26, 0, 0.07, 0));
    ciaX_poly([[21, 32], [31, 32], [26, 46]], '#b8c4d8'); ciaX_poly([[25, 33], [27, 33], [27, 45], [26, 47], [25, 45]], '#0b0e18');
    ciaX_poly([[36, 44], [43, 44], [43, 51], [39, 53], [36, 51]], '#c9a24a'); px(39, 47, '#fff0b0');   // badge
    rect(8, 40, 8, 3, '#c9a24a'); rect(36, 38, 8, 3, '#c9a24a');                                // shoulder braid
    rect(14, 52, 7, 2, NV[1]);
    // neck and head
    ciaX_poly([[21, 24], [31, 24], [31, 33], [21, 33]], SKIN[2]);
    ciaX_ell(26, 20, 8.5, 10, (x, y) => SKIN[clamp(Math.round(3 + (x - 26) * 0.16), 1, 5)]);
    ciaX_ell(17.5, 20, 2, 3, SKIN[2]); ciaX_ell(34.5, 20, 2, 3, SKIN[4]);
    ciaX_eye(21, 18, 0, '#e8dccc'); ciaX_eye(28, 18, 0, '#f0e4d4');
    rect(21, 16, 3, 1, '#3a2418'); rect(28, 16, 3, 1, '#3a2418');
    rect(26, 19, 1, 4, SKIN[4]); rect(25, 23, 3, 1, SKIN[1]);
    rect(23, 26, 6, 1, SKIN[1]);
    // peaked cap with badge
    ciaX_poly([[16, 8], [20, 3], [32, 3], [36, 8], [36, 12], [16, 12]], ciaX_sh(NV, 2.2, 26, 0, 0.1, 0));
    rect(16, 10, 20, 2, '#0a0a10'); ciaX_poly([[15, 12], [37, 12], [34, 15], [18, 15]], '#060608'); rect(19, 12, 13, 1, '#3a3e4c');
    rect(24, 5, 4, 4, '#d8b050'); px(25, 5, '#fff2c0');
    ciaX_rim(52, 64, '#0a0a14', 0.5);
  });
}
function ciaX_star(cx, cy, r, c) { const pts = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.42 : r; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } ciaX_poly(pts, c); }
// the slanting bands of late sun (x + 0.75 y within a band)
const ciaX_SUN = [[236, 258], [280, 296], [318, 342], [362, 372]];
const ciaX_sunBand = (x, y) => { const c = x + 0.75 * y; for (const [a, b] of ciaX_SUN) if (c >= a && c < b) return 1; return 0; };
function ciaX_lobbyBG() {
  return ciaX_layer('lobby', 150, 200, () => {
    const BX0 = 44, BX1 = 256, BY0 = 44, BY1 = 236, VP = ciaX_VP;
    // sun patch function: where the slanted light falls on the back wall
    const sunWall = (x, y) => ciaX_sunBand(x, y) ? 1 : 0;
    // ---- coffered ceiling ----
    ciaX_poly([[0, 0], [300, 0], [BX1, BY0], [BX0, BY0], [0, 0]], (x, y) => ciaX_q(ciaX_MARB, 0.16 + y / BY0 * 0.3));
    for (let i = 1; i < 6; i++) { const xx = BX0 + (BX1 - BX0) * i / 6; line(VP.x + (xx - VP.x) * 2.2, 0, xx, BY0, ciaX_MARB[2]); }
    for (const yy of [16, 30]) rect(0, yy, 300, 1, ciaX_MARB[2]);
    // ---- back wall: cream marble slabs ----
    ciaX_poly([[BX0, BY0], [BX1, BY0], [BX1, BY1], [BX0, BY1]], (x, y) => {
      let b = 0.52 + (y - BY0) / (BY1 - BY0) * 0.08 - Math.abs(x - 150) / 400;
      const vein = Math.sin(x * 0.05 + y * 0.11 + Math.sin(y * 0.06 + x * 0.02) * 2.4);
      if (vein > 0.94) b -= 0.06;
      if (sunWall(x, y)) b += 0.22;
      return ciaX_q(ciaX_MARB, b);
    });
    // slab joints
    for (let xx = BX0 + 35; xx < BX1; xx += 35) rect(xx, BY0 + 12, 1, BY1 - BY0 - 20, ciaX_MARB[5]);
    rect(BX0, 148, BX1 - BX0, 1, ciaX_MARB[5]);
    // cornice and skirting
    for (let i = 0; i < 12; i++) rect(BX0, BY0 + i, BX1 - BX0, 1, ciaX_MARB[[9, 11, 13, 10, 7, 5, 9, 12, 8, 6, 5, 4][i]]);
    rect(BX0, BY1 - 8, BX1 - BX0, 8, ciaX_MARB[4]); rect(BX0, BY1 - 8, BX1 - BX0, 1, ciaX_MARB[10]);
    // ---- side walls in perspective ----
    ciaX_poly([[0, -8], [BX0, BY0], [BX0, BY1], [0, 264]], (x, y) => ciaX_q(ciaX_MARB, 0.24 + x / BX0 * 0.12));
    ciaX_poly([[300, -8], [BX1, BY0], [BX1, BY1], [300, 264]], (x, y) => ciaX_q(ciaX_MARB, 0.3 + (300 - x) / 44 * 0.12));
    // pilasters on the side walls
    // ---- the Memorial Wall: rows of carved stars under an inscription ----
    for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) {
      const sx = 60 + c * 8 + (r % 2) * 4, sy = 104 + r * 9;
      ciaX_star(sx + 0.5, sy + 0.7, 3.2, ciaX_MARB[13]); ciaX_star(sx, sy, 3.2, ciaX_MARB[3]);
    }
    ciaX_t3('IN HONOR OF', 74, 86, ciaX_MARB[4]);
    // ---- the flag on its pole ----
    const FX = 118;
    rect(FX, 100, 2, 136, '#8a6a2a'); rect(FX, 100, 1, 136, '#e8c878'); ciaX_ell(FX + 1, 98, 3, 3, '#e8c060'); px(FX, 97, '#fff4c0');
    // draped: stripes following the folds, blue canton at the top
    for (let yy = 104; yy < 176; yy++) {
      const k = (yy - 104) / 72, x0 = FX + 2, x1 = FX + 2 + Math.round(16 - k * 6);
      for (let xx = x0; xx <= x1; xx++) {
        const fold = Math.sin((xx - x0) * 0.9 + k * 2) * 0.5 + 0.5, stripe = Math.floor((yy - 104 + (xx - x0) * (0.6 + k)) / 5.5) % 2;
        let c;
        if (yy < 132 && xx < x0 + 9) c = fold > 0.5 ? '#2c3a7a' : '#1a2350';
        else c = stripe ? (fold > 0.5 ? '#f2ece0' : '#b8b0b4') : (fold > 0.5 ? '#c42a2e' : '#7a1620');
        px(xx, yy, c);
      }
    }
    for (const [sx, sy] of [[FX + 4, 108], [FX + 7, 112], [FX + 4, 118], [FX + 8, 122], [FX + 5, 127]]) px(sx, sy, '#e8e4f0');
    // ---- brass lift doors with a little dial above ----
    const LX0 = 138, LX1 = 184, LY0 = 158;
    ciaX_poly([[LX0 - 6, LY0 - 6], [LX1 + 6, LY0 - 6], [LX1 + 6, BY1], [LX0 - 6, BY1]], (x, y) => ciaX_q(ciaX_BRASS, 0.5 + (y === LY0 - 6 || x === LX0 - 6 ? 0.25 : 0) - (x > LX1 + 3 ? 0.15 : 0)));
    ciaX_poly([[LX0, LY0], [LX1, LY0], [LX1, BY1], [LX0, BY1]], (x, y) => {
      const m = (LX0 + LX1) / 2;
      let b = 0.42 + 0.18 * Math.exp(-(((x - (x < m ? LX0 + 8 : m + 8)) / 5) ** 2)) - (y - LY0) / 400;
      if (x === Math.floor(m)) b = 0.1;
      return ciaX_q(ciaX_BRASS, b);
    });
    ciaX_ell(161, LY0 - 12, 9, 9, (x, y) => y < LY0 - 6 ? ciaX_BRASS[y < LY0 - 16 ? 7 : 5] : null); ciaX_ell(161, LY0 - 11, 7, 7, (x, y) => y < LY0 - 6 ? '#1a1012' : null);
    line(161, LY0 - 7, 157, LY0 - 13, ciaX_BRASS[7]); px(161, LY0 - 7, ciaX_BRASS[7]);
    // ---- polished granite floor with the seal ----
    ciaX_poly([[0, 264], [BX0, BY1], [BX1, BY1], [300, 264], [300, 400], [0, 400]], (x, y) => ciaX_q(ciaX_FLR, 0.4 - (y - BY1) / 164 * 0.3 + 0.08 * Math.exp(-(((x - 150) / 100) ** 2))));
    // reflections of the lit back wall
    ciaX_alpha(0.18, () => ciaX_poly([[BX0, BY1], [BX1, BY1], [BX1 + 20, 300], [BX0 - 20, 300]], ciaX_MARB[8]));
    ciaX_alpha(0.3, () => { ciaX_poly([[LX0, BY1], [LX1, BY1], [LX1 + 3, 280], [LX0 - 3, 280]], ciaX_BRASS[4]); });
    // floor joints converging on the vanishing point
    for (let i = -6; i <= 6; i++) { const xb = BX0 + (BX1 - BX0) * (i + 6) / 12; line(xb, BY1, VP.x + (xb - VP.x) * 3.4, 400, ciaX_FLR[1]); }
    for (const yy of [250, 272, 306, 360]) rect(0, yy, 300, 1, ciaX_FLR[1]);
    // the seal: granite rings and a sixteen-point star, foreshortened
    const SX = 158, SY = 322, SR = 92, SQ = 0.3;
    ciaX_ell(SX, SY, SR, SR * SQ, ciaX_FLR[9]); ciaX_ell(SX, SY, SR - 3, (SR - 3) * SQ, ciaX_FLR[2]);
    ciaX_ell(SX, SY, SR - 15, (SR - 15) * SQ, ciaX_FLR[8]); ciaX_ell(SX, SY, SR - 17, (SR - 17) * SQ, ciaX_FLR[3]);
    for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; rect(SX + Math.cos(a) * (SR - 9) - 1, SY + Math.sin(a) * (SR - 9) * SQ, 3, 1, ciaX_FLR[7]); }
    for (let k = 0; k < 16; k++) {
      const a = k * Math.PI / 8, r = k % 4 === 0 ? SR - 20 : k % 2 === 0 ? 48 : 32, w = k % 4 === 0 ? 9 : 6;
      const P2 = (rr, aa) => [SX + Math.cos(aa) * rr, SY + Math.sin(aa) * rr * SQ];
      const tip = P2(r, a), l = P2(w, a + Math.PI / 2), rr = P2(w, a - Math.PI / 2);
      ciaX_poly([l, tip, [SX, SY]], ciaX_FLR[11]); ciaX_poly([[SX, SY], tip, rr], ciaX_FLR[7]);
    }
    ciaX_ell(SX, SY, 22, 22 * SQ, ciaX_FLR[4]); ciaX_ell(SX, SY, 18, 18 * SQ, '#27324e');
    ciaX_ell(SX, SY - 1, 9, 9 * SQ, '#b8a878');
    // ---- sunlight lying across the floor ----
    ciaX_alpha(0.2, () => ciaX_poly([[0, 236], [300, 236], [300, 400], [0, 400]], (x, y) => ciaX_sunBand(x, y) ? '#c89a64' : null));
  });
}
// the desk, the guard and the contact stand in front of the sun shafts
function ciaX_lobbyFG() {
  return ciaX_layer('lobbyFG', 150, 200, () => {
    // ---- the security desk: walnut with a marble top, lamp, guard behind ----
    g.drawImage(ciaX_guard(), 222, 196);
    const DX0 = 196, DX1 = 300, DY0 = 240;
    ciaX_poly([[DX0, DY0], [DX1, DY0], [DX1, DY0 + 6], [DX0 - 2, DY0 + 6]], (x, y) => ciaX_q(ciaX_MARB, y === DY0 ? 0.9 : 0.62));
    ciaX_poly([[DX0, DY0 + 6], [DX1, DY0 + 6], [DX1, 292], [DX0, 292]], (x, y) => {
      let b = 0.3 + (y - DY0) / 300 - (x - DX0) / 800;
      if (((x - DX0) % 26) < 2) b -= 0.1; else if (((x - DX0) % 26) < 3) b += 0.08;
      if (y > 284) b = 0.1;
      return ciaX_q(ciaX_WAL, b);
    });
    // agency seal on the desk front
    ciaX_ell(248, 266, 10, 10, ciaX_BRASS[3]); ciaX_ell(248, 266, 8, 8, '#1d2744'); ciaX_star(248, 266, 5, ciaX_BRASS[6]);
    // banker's lamp
    rect(210, 230, 2, 10, ciaX_BRASS[4]); ciaX_ell(211, 239, 5, 1.5, ciaX_BRASS[3]);
    ciaX_poly([[203, 226], [220, 226], [222, 231], [201, 231]], '#1e6a4a'); ciaX_poly([[204, 226], [219, 226], [220, 228], [203, 228]], '#4aa87a');
    ciaX_alpha(0.3, () => ciaX_ell(211, 240, 12, 2.5, '#ffe8a0'));
    // a sign-in book and a telephone
    ciaX_poly([[228, 236], [250, 236], [252, 240], [226, 240]], '#e8e0cc'); rect(239, 236, 1, 4, '#9a8a70');
    rect(272, 233, 12, 6, '#141216'); rect(273, 231, 10, 2, '#26222a');
    // ---- dark foreground edge to seat the picture ----
    ciaX_alpha(0.35, () => ciaX_poly([[0, 380], [300, 380], [300, 400], [0, 400]], '#05040a'));
    // the contact
    g.drawImage(ciaX_contact(), 16, 160);
    // his shadow stretches away from the sun, to the left
    ciaX_alpha(0.32, () => ciaX_poly([[26, 378], [80, 378], [30, 392], [0, 396], [0, 386]], '#05040c'));
  });
}
function ciaLobbyArt(x, y, w, h, t) {
  ciaX_clip(x, y, w, h);
  blit(ciaX_lobbyBG(), x, y);
  fine(() => {
    g.translate(x * 2, y * 2);
    // light shafts hanging in the air, gently breathing
    g.save(); g.globalCompositeOperation = 'lighter';
    const br = 0.07 + 0.02 * Math.sin(t * 0.7);
    for (const [a, b] of ciaX_SUN) {
      g.globalAlpha = br;
      ciaX_poly([[a, 0], [b, 0], [b - 0.75 * 400, 400], [a - 0.75 * 400, 400]], '#ffd79a');
    }
    // dust motes drifting through the sun
    g.globalAlpha = 0.6;
    for (let i = 0; i < 9; i++) {
      const ph = ciaX_hash(i, 5), sp = 0.015 + ph * 0.02, k = (t * sp + ph) % 1;
      const band = ciaX_SUN[i % 4], my = 30 + k * 300 + Math.cos(t * 0.6 + i * 2) * 5, mx = (band[0] + band[1]) / 2 - 0.75 * my + Math.sin(t * 0.8 + i) * 5;
      rect(Math.round(mx), Math.round(my), 1, 1, '#fff2d0');
    }
    g.restore();
    g.translate(-x * 2, -y * 2);
  });
  blit(ciaX_lobbyFG(), x, y);
  fine(() => {
    g.translate(x * 2, y * 2);
    // cigarette smoke curling up from the contact
    for (let i = 0; i < 7; i++) {
      const k = ((t * 0.35 + i / 7) % 1), sx = 16 + 57 + Math.sin(k * 7 + t * 0.8) * (2 + k * 6) + k * 4, sy = 160 + 34 - k * 70;
      ciaX_alpha(0.45 * (1 - k), () => ciaX_ell(sx, sy, 1.5 + k * 3, 1.2 + k * 2, '#d8d4dc'));
    }
    // the guard blinks
    if ((t % 4.3) < 0.13) { rect(222 + 21, 196 + 18, 3, 2, '#b07458'); rect(222 + 28, 196 + 18, 3, 2, '#d49b78'); }
  });
  g.restore();
}

// ===================================================================
// DATA SECTION (150x200, fine 300x400): a hushed computer room in blue. A great world map glows on
// the back wall, tape drives spin on the right, and an operator in a rose cardigan works a green
// terminal in the foreground, her profile lit by the screen.
// ===================================================================
const ciaX_NAVY = ciaX_ramp(['#05070f', '#0b1222', '#142039', '#1e3052', '#2b4468', '#3d5b82', '#58789e', '#7d9cbc'], 14);
const ciaX_BEIGE = ciaX_ramp(['#1c1b24', '#35333b', '#56524f', '#7d766a', '#a29886', '#c4b9a0', '#e2d8bc'], 12);
const ciaX_LAND = [
  [[-168, 66], [-140, 70], [-95, 72], [-82, 64], [-62, 56], [-56, 48], [-66, 44], [-76, 36], [-80, 26], [-84, 30], [-97, 27], [-97, 20], [-88, 20], [-86, 14], [-78, 8], [-92, 14], [-106, 22], [-112, 30], [-118, 33], [-124, 41], [-124, 49], [-135, 58], [-152, 60], [-165, 60]],
  [[-80, 10], [-62, 11], [-50, 0], [-35, -7], [-40, -22], [-49, -28], [-58, -38], [-65, -42], [-68, -54], [-74, -50], [-72, -30], [-71, -18], [-77, -12], [-81, -4]],
  [[-10, 36], [-9, 43], [-2, 44], [-4, 48], [3, 51], [9, 55], [7, 58], [5, 62], [15, 69], [28, 71], [42, 67], [60, 70], [72, 72], [100, 77], [120, 73], [142, 72], [180, 69], [178, 64], [162, 60], [157, 51], [142, 53], [140, 46], [131, 42], [126, 37], [122, 31], [120, 23], [110, 20], [108, 12], [104, 2], [100, 8], [98, 16], [91, 22], [86, 21], [80, 13], [77, 8], [72, 20], [66, 25], [58, 24], [52, 17], [44, 12], [38, 22], [34, 30], [30, 32], [36, 36], [27, 37], [26, 40], [20, 40], [16, 38], [18, 42], [13, 45], [9, 44], [3, 43], [-2, 37]],
  [[-17, 21], [-13, 28], [-9, 34], [-2, 36], [10, 37], [20, 32], [33, 31], [36, 22], [43, 12], [51, 12], [40, -2], [40, -15], [35, -24], [32, -29], [20, -35], [16, -28], [12, -17], [13, -6], [9, 3], [3, 6], [-8, 5], [-13, 8], [-17, 14]],
  [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -25], [151, -34], [146, -39], [137, -35], [129, -32], [116, -35], [114, -28]],
  [[-55, 60], [-44, 60], [-20, 70], [-22, 76], [-30, 83], [-58, 81], [-68, 76], [-60, 70]],
  [[-5, 50], [1, 51], [-2, 55], [-3, 58], [-6, 57]], [[130, 31], [136, 34], [141, 38], [142, 44], [138, 40], [132, 34]], [[44, -13], [50, -15], [48, -25], [44, -24]],
  [[95, 5], [104, -4], [106, -6], [98, 0]], [[110, -7], [120, -8], [112, -8]], [[131, -2], [141, -3], [150, -6], [142, -8], [135, -5]],
];
const ciaX_SPOTS = [[-77, 39], [37.6, 55.7], [2.3, 48.8], [-0.1, 51.5], [13.4, 52.5], [116, 40], [139.7, 35.7], [-43, -23], [31, 30], [-99, 19], [18, -34], [28, 41], [151, -34], [77, 28.6]];
const ciaX_MAP = { x0: 20, y0: 52, x1: 204, y1: 162 };
const ciaX_mapXY = (lon, lat) => { const M = ciaX_MAP; return [M.x0 + 4 + (lon + 170) / 360 * (M.x1 - M.x0 - 8) + 2, M.y0 + 4 + (80 - lat) / 140 * (M.y1 - M.y0 - 8)]; };
function ciaX_dataBG() {
  return ciaX_layer('data', 150, 200, () => {
    const M = ciaX_MAP;
    // back wall and ceiling
    ciaX_poly([[0, 0], [300, 0], [300, 300], [0, 300]], (x, y) => ciaX_q(ciaX_NAVY, 0.24 - y / 2000 + 0.14 * Math.exp(-(((x - 112) / 140) ** 2)) * Math.exp(-(((y - 110) / 90) ** 2))));
    ciaX_poly([[0, 0], [300, 0], [300, 40], [0, 40]], (x, y) => ciaX_q(ciaX_NAVY, 0.12 + y / 200));
    // fluorescent panels, cool and bright
    for (const [fx, fw] of [[26, 70], [128, 70], [230, 70]]) { rect(fx - 2, 30, fw + 4, 8, ciaX_NAVY[2]); rect(fx, 31, fw, 5, '#dff0ff'); rect(fx, 31, fw, 1, '#ffffff'); rect(fx, 35, fw, 1, '#a8c8e8'); }
    ciaX_glow(150, 44, 170, 20, '#3a6aa8', 0.2, 5);
    rect(0, 40, 300, 2, ciaX_NAVY[1]);
    // ---- the map board: steel frame, dark glass, lat/long grid, glowing continents ----
    ciaX_glow((M.x0 + M.x1) / 2, (M.y0 + M.y1) / 2, 150, 90, '#1a6a9a', 0.35, 7);
    rect(M.x0 - 5, M.y0 - 5, M.x1 - M.x0 + 10, M.y1 - M.y0 + 10, ciaX_STEEL[3]);
    rect(M.x0 - 5, M.y0 - 5, M.x1 - M.x0 + 10, 1, ciaX_STEEL[10]); rect(M.x0 - 5, M.y1 + 4, M.x1 - M.x0 + 10, 1, ciaX_STEEL[1]);
    rect(M.x0 - 2, M.y0 - 2, M.x1 - M.x0 + 4, M.y1 - M.y0 + 4, '#05080e');
    ciaX_poly([[M.x0, M.y0], [M.x1, M.y0], [M.x1, M.y1], [M.x0, M.y1]], (x, y) => mix('#061222', '#0c2a44', 0.5 + 0.5 * Math.cos((x - 112) / 120) * Math.cos((y - 107) / 90) - 0.3));
    for (let lon = -150; lon <= 180; lon += 30) { const [gx] = ciaX_mapXY(lon, 0); rect(gx, M.y0 + 1, 1, M.y1 - M.y0 - 2, '#12344e'); }
    for (let lat = 60; lat >= -60; lat -= 30) { const [, gy] = ciaX_mapXY(0, lat); rect(M.x0 + 1, gy, M.x1 - M.x0 - 2, 1, lat === 0 ? '#1a4a68' : '#12344e'); }
    for (const poly of ciaX_LAND) {
      const pts = poly.map(p => ciaX_mapXY(p[0], p[1]));
      ciaX_poly(pts.map(p => [p[0], p[1] + 1]), '#0a3a4c');
      ciaX_poly(pts, (x, y) => '#1c7e8e');
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), '#56d0d8'); }
    }
    // glass sheen on the board
    ciaX_alpha(0.07, () => ciaX_poly([[M.x0 + 30, M.y0], [M.x0 + 80, M.y0], [M.x0 + 30, M.y1], [M.x0 - 20, M.y1]], '#bfe8ff'));
    ciaX_alpha(0.07, () => ciaX_poly([[M.x0 + 96, M.y0], [M.x0 + 108, M.y0], [M.x0 + 58, M.y1], [M.x0 + 46, M.y1]], '#bfe8ff'));
    // ---- a long console under the board ----
    ciaX_poly([[0, 176], [210, 176], [210, 214], [0, 214]], (x, y) => ciaX_q(ciaX_BEIGE, y < 180 ? 0.45 : 0.22 - (y - 180) / 400));
    for (let i = 0; i < 26; i++) { const lx = 10 + i * 7.6, c = ['#ff5a3a', '#ffc040', '#40ff90', '#60a0ff'][Math.floor(ciaX_hash(i, 4) * 4)]; rect(lx, 188, 3, 2, mix(c, '#000000', 0.55)); }
    rect(0, 176, 210, 1, ciaX_BEIGE[9]);
    // ---- raised floor ----
    ciaX_poly([[0, 214], [300, 214], [300, 400], [0, 400]], (x, y) => ciaX_q(ciaX_NAVY, 0.3 - (y - 214) / 700 + 0.08 * Math.exp(-(((x - 110) / 90) ** 2))));
    for (const yy of [224, 240, 262, 294, 340]) rect(0, yy, 300, 1, ciaX_NAVY[3]);
    for (let i = -8; i <= 8; i++) line(110 + i * 24, 214, 110 + i * 60, 400, ciaX_NAVY[3]);
    ciaX_alpha(0.14, () => ciaX_poly([[20, 214], [204, 214], [230, 280], [0, 280]], '#3aa0c0'));
    // ---- tape drives on the right ----
    for (const [cx0, cx1, sd] of [[212, 256, 0], [258, 306, 1]]) {
      ciaX_alpha(0.4, () => ciaX_poly([[cx0 - 6, 330], [cx1, 330], [cx1 + 8, 340], [cx0 - 14, 340]], '#020308'));
      ciaX_poly([[cx0, 70], [cx1, 70], [cx1, 332], [cx0, 332]], (x, y) => ciaX_q(ciaX_BEIGE, 0.46 - (x - cx0) / 300 + (x === cx0 ? 0.25 : 0) - y / 1400));
      rect(cx0, 70, cx1 - cx0, 2, ciaX_BEIGE[10]);
      // window over the reels
      rect(cx0 + 4, 80, cx1 - cx0 - 8, 70, '#0a0e18'); rect(cx0 + 4, 80, cx1 - cx0 - 8, 1, '#000000'); rect(cx0 + 4, 149, cx1 - cx0 - 8, 1, ciaX_BEIGE[8]);
      // vacuum columns
      for (const vx of [cx0 + 8, cx0 + 26]) { rect(vx, 160, 12, 90, '#080a12'); rect(vx, 160, 1, 90, ciaX_BEIGE[2]); rect(vx + 11, 160, 1, 90, ciaX_BEIGE[8]); }
      // control panel
      rect(cx0 + 4, 262, cx1 - cx0 - 8, 30, ciaX_BEIGE[3]); rect(cx0 + 4, 262, cx1 - cx0 - 8, 1, ciaX_BEIGE[9]);
      rect(cx0, 300, cx1 - cx0, 1, ciaX_BEIGE[2]); rect(cx0, 301, cx1 - cx0, 1, ciaX_BEIGE[8]);
    }
  });
}
function ciaX_reel(cx, cy, r, a, full) {
  ciaX_ell(cx, cy, r, r, '#8e9cb0'); ciaX_ell(cx, cy, r - 1, r - 1, '#5a6478');
  ciaX_ell(cx, cy, r * full, r * full, '#3a2418'); ciaX_ell(cx, cy, r * full - 1, r * full - 1, '#5a3622');
  ciaX_ell(cx - 1, cy - 1, r * full * 0.6, r * full * 0.4, '#6e442a');
  ciaX_ell(cx, cy, 4, 4, '#c8d0dc');
  for (let k = 0; k < 3; k++) { const aa = a + k * 2.094; ciaX_ell(cx + Math.cos(aa) * 2.6, cy + Math.sin(aa) * 2.6, 1.2, 1.2, '#1a1e28'); }
  px(cx, cy, '#1a1e28');
}
function ciaX_operator() {
  return art('ciaX_operator', 70, 100, () => {
    g.translate(30, 0);
    const ROSE = ['#1a0c18', '#35182a', '#56263c', '#7a3a52', '#9c5268', '#c07684'];
    const SK = ['#1e1216', '#3e2626', '#6a4238', '#96644e', '#c08a6c', '#e4b492'];
    const HAIR = ['#160806', '#2e0f0a', '#4e1c10', '#76301a', '#9a4a26', '#c07038'];
    const GRN = '#6af0a8', gl = (c, k) => mix(c, GRN, k);
    const SKIRT = ['#080a14', '#121628', '#1e243c'];
    // lap and legs going under the desk, in shadow
    ciaX_poly([[70, 100], [74, 118], [24, 124], [14, 120], [16, 108], [40, 104]], (x, y) => SKIRT[y < 108 ? 2 : 1]);
    ciaX_poly([[14, 120], [26, 122], [24, 170], [14, 170]], SKIRT[0]);
    // torso in profile, facing left: the screen lights her front, the blue room rims her back
    ciaX_poly([[46, 52], [58, 48], [70, 52], [76, 64], [76, 100], [70, 108], [42, 106], [40, 88], [36, 74], [40, 60]], (x, y) => ROSE[clamp(Math.round(3.4 - (x - 44) * 0.06 - (y - 52) * 0.012), 1, 5)]);
    ciaX_poly([[36, 72], [40, 62], [44, 64], [42, 80], [40, 88]], gl(ROSE[4], 0.25));                 // chest catching the screen
    ciaX_poly([[73, 60], [76, 64], [77, 98], [74, 98]], '#5a7aa8');                                    // cool rim on her back
    // upper arm down to the elbow, forearm out to the keyboard
    ciaX_poly([[50, 56], [64, 56], [62, 90], [52, 96], [46, 90]], (x, y) => ROSE[clamp(Math.round(3 - (y - 56) * 0.03), 1, 5)]);
    ciaX_poly([[46, 88], [58, 92], [54, 100], [22, 100], [18, 94]], (x, y) => ROSE[clamp(Math.round(3.2 - (x - 50) * 0.03 - (y > 96 ? 1 : 0)), 1, 5)]);
    rect(18, 93, 6, 7, '#d8ccd0'); rect(18, 93, 6, 1, gl('#e8dce0', 0.3));                              // blouse cuff
    ciaX_poly([[4, 94], [18, 93], [19, 100], [8, 101], [2, 99]], gl(SK[3], 0.12)); rect(2, 94, 12, 2, gl(SK[4], 0.2)); rect(3, 99, 3, 2, SK[2]);
    // neck
    ciaX_poly([[48, 38], [58, 38], [60, 52], [48, 54]], SK[2]); rect(48, 40, 3, 13, gl(SK[3], 0.18));
    // head: skull, then the profile of the face
    ciaX_ell(57, 28, 12, 14, (x, y) => SK[clamp(Math.round(3.3 - (x - 57) * 0.08), 1, 4)]);
    const face = [[47, 14], [44, 19], [43, 24], [42, 27], [39, 32], [39, 33], [42, 34], [41, 36], [42, 37], [41, 39], [43, 42], [47, 44], [53, 44], [58, 40], [56, 28], [52, 16]];
    ciaX_poly(face, (x, y) => { const d = x - 42; return d < 3 ? gl(SK[5], 0.16) : d < 7 ? gl(SK[4], 0.12) : d < 12 ? SK[4] : SK[3]; });
    px(39, 32, gl('#fff0e0', 0.12)); rect(42, 33, 2, 1, SK[1]);                                        // nose tip, nostril shade
    rect(41, 36, 2, 1, '#9a3a48'); rect(41, 37, 2, 1, '#c85a68'); px(43, 36, '#5a1a28');               // lips
    rect(44, 42, 8, 1, SK[1]);                                                                        // under the jaw
    // eye: lash line, a sliver of white, the screen's glint
    rect(44, 25, 4, 1, '#1a0c0a'); rect(44, 26, 3, 2, '#e8f4ec'); rect(44, 26, 1, 2, '#1a3022'); px(44, 26, GRN); px(47, 26, '#1a0c0a');
    rect(43, 22, 5, 1, HAIR[2]);                                                                      // brow
    ciaX_ell(58, 31, 2.6, 3.6, SK[3]); px(58, 31, SK[1]); ciaX_ell(58, 36, 1.2, 1.2, '#f4f0ff');       // ear and pearl
    // auburn hair swept back into a bun
    ciaX_poly([[46, 15], [50, 10], [58, 8], [66, 11], [70, 18], [70, 32], [66, 40], [62, 40], [60, 30], [56, 22], [50, 18]], (x, y) => HAIR[clamp(Math.round(2.6 + (y < 13 ? 1.4 : 0) - (x > 66 ? 0.8 : 0) + (x < 54 ? 0.6 : 0)), 1, 5)]);
    ciaX_ell(72, 24, 7, 8, (x, y) => HAIR[clamp(Math.round(2.4 + (y < 20 ? 1.2 : 0) - (x < 70 ? 0.8 : 0)), 1, 5)]);
    for (const [a, b, c, d] of [[49, 13, 62, 11], [52, 18, 66, 16], [60, 24, 68, 21], [69, 20, 76, 22]]) line(a, b, c, d, HAIR[4]);
    rect(78, 20, 1, 9, '#6a8ab8'); rect(66, 10, 5, 1, '#6a8ab8'); px(71, 12, '#6a8ab8');               // cool rim light
    // the chair back, between us and her
    ciaX_poly([[74, 70], [96, 64], [101, 70], [100, 130], [76, 134]], (x, y) => ciaX_q(ciaX_NAVY, 0.14 + (x > 94 ? 0.16 : 0) + (y < 72 ? 0.1 : 0)));
    ciaX_poly([[60, 124], [104, 124], [106, 134], [58, 134]], ciaX_NAVY[2]); rect(80, 134, 7, 30, ciaX_NAVY[1]); rect(80, 134, 1, 30, ciaX_NAVY[4]);
    ciaX_poly([[60, 164], [106, 164], [108, 168], [58, 168]], ciaX_NAVY[2]);
    ciaX_rim(140, 200, '#060812', 0.45);
  });
}
function dataRoomArt(x, y, w, h, t) {
  ciaX_clip(x, y, w, h);
  blit(ciaX_dataBG(), x, y);
  fine(() => {
    g.translate(x * 2, y * 2);
    const M = ciaX_MAP;
    // hot spots on the map pulse in turn; a scan line sweeps the board
    const sweep = M.x0 + ((t * 30) % (M.x1 - M.x0 + 60)) - 30;
    ciaX_alpha(0.12, () => ciaX_poly([[sweep - 14, M.y0], [sweep, M.y0], [sweep, M.y1], [sweep - 14, M.y1]], '#7ae8ff'));
    if (sweep >= M.x0 && sweep < M.x1) rect(sweep, M.y0, 1, M.y1 - M.y0, '#a8f4ff');
    ciaX_SPOTS.forEach(([lon, lat], i) => {
      const [sx, sy] = ciaX_mapXY(lon, lat), ph = (t * 0.8 + ciaX_hash(i, 2)) % 1, red = i === 0 || i === 1;
      const c = red ? '#ff4a3a' : '#ffc84a';
      if (ph < 0.5 || red) { ciaX_glow(sx, sy, 5 + ph * 6, 5 + ph * 6, c, 0.4 * (1 - ph), 3); rect(sx - 1, sy - 1, 2, 2, c); px(sx - 1, sy - 1, '#ffffff'); }
      else rect(sx - 1, sy - 1, 2, 2, mix(c, '#000000', 0.5));
    });
    // console lamps twinkle
    for (let i = 0; i < 26; i++) if (((t * 2 + ciaX_hash(i, 9) * 7) | 0) % 3 === 0) { const c = ['#ff5a3a', '#ffc040', '#40ff90', '#60a0ff'][Math.floor(ciaX_hash(i, 4) * 4)]; rect(10 + i * 7.6, 188, 3, 2, c); }
    // tape reels turn in fits and starts
    [[212, 256], [258, 306]].forEach(([c0, c1], k) => {
      const run = Math.sin(t * 0.9 + k * 2) > -0.2 ? 1 : 0, a = t * (3 + k) * run + k;
      const r = 10, cy = 114, m = (c0 + c1) / 2 - 1;
      ciaX_reel(m + 1, 97, 14, a, 0.85 - k * 0.25); ciaX_reel(m + 1, 133, 14, -a * 1.3, 0.45 + k * 0.3);
      ciaX_alpha(0.08, () => ciaX_poly([[c0 + 6, 81], [c0 + 18, 81], [c0 + 6, 118]], '#ffffff'));
      // tape loops in the vacuum columns rise and fall
      for (const [vx, ph] of [[c0 + 8, 0], [c0 + 26, 1.4]]) { const ly = 190 + Math.sin(t * 1.6 + ph + k) * 26 * run; rect(vx + 2, 160, 1, ly - 160, '#4a2c1c'); rect(vx + 9, 160, 1, ly - 160, '#4a2c1c'); rect(vx + 2, ly, 8, 2, '#5a3622'); }
      for (let i = 0; i < 6; i++) { const on = ((t * 3 + i * 1.7 + k) | 0) % 4 !== 0; rect(c0 + 8 + i * 6, 270, 3, 3, on ? ['#ffb040', '#40ff90', '#ff5a3a'][i % 3] : '#2a2420'); }
      rect(c0 + 8, 280, 14, 6, '#1a1618'); rect(c0 + 9, 281, 12, 2, '#a8a090');
    });
    // the terminal: a beige CRT turned toward the operator, text scrolling
    ciaX_terminal(t);
    g.drawImage(ciaX_operator(), 70, 196);
    // she blinks
    if ((t % 3.9) < 0.12) rect(70 + 30 + 44, 196 + 26, 3, 2, '#96644e');
  });
  g.restore();
}
function ciaX_termStatic() {
  return ciaX_layer('term', 150, 200, () => {
  // desk
  ciaX_poly([[0, 292], [236, 292], [244, 304], [0, 304]], (x, y) => ciaX_q(ciaX_BEIGE, y < 294 ? 0.62 : 0.44));
  ciaX_poly([[0, 304], [244, 304], [244, 400], [0, 400]], (x, y) => ciaX_q(ciaX_NAVY, 0.2 - (y - 304) / 800));
  rect(0, 304, 244, 1, ciaX_NAVY[1]);
  // CRT: case side in shadow, front bezel angled toward her
  ciaX_poly([[26, 226], [46, 218], [46, 290], [26, 292]], ciaX_BEIGE[3]);
  ciaX_poly([[46, 218], [104, 212], [106, 290], [46, 290]], (x, y) => ciaX_q(ciaX_BEIGE, 0.5 + (x > 100 ? 0.2 : 0) - (y > 284 ? 0.15 : 0)));
  ciaX_poly([[52, 224], [98, 220], [99, 270], [52, 272]], '#04120a');
  rect(52, 280, 8, 3, '#1a1a1a'); px(54, 281, '#40ff80');
  // keyboard
  ciaX_poly([[58, 292], [106, 290], [112, 298], [52, 300]], ciaX_BEIGE[5]); ciaX_poly([[60, 293], [104, 291], [108, 296], [56, 297]], ciaX_BEIGE[3]);
  for (let i = 0; i < 10; i++) rect(60 + i * 4.6, 293, 3, 1, ciaX_BEIGE[8]);
  // a folded printout on the desk, green-barred
  ciaX_poly([[150, 286], [186, 284], [192, 294], [146, 296]], '#e2e8d6');
  for (let i = 0; i < 3; i++) ciaX_poly([[150 - i * 1.3, 288 + i * 2.6], [187 + i * 1.6, 286 + i * 2.6], [188 + i * 1.6, 287.3 + i * 2.6], [149 - i * 1.3, 289.3 + i * 2.6]], '#a8cca8');
  ciaX_poly([[146, 296], [192, 294], [192, 296], [146, 298]], '#8a9888');
  // green spill on the desk
  ciaX_alpha(0.15, () => ciaX_poly([[46, 292], [110, 292], [124, 304], [40, 304]], '#40ff90'));
  });
}
function ciaX_terminal(t) {
  g.drawImage(ciaX_termStatic(), 0, 0);
  // green text, scrolling
  const off = Math.floor(t * 3);
  for (let i = 0; i < 8; i++) {
    const n = off + i, w = 6 + Math.floor(ciaX_hash(n, 3) * 24), yy = 228 + i * 5;
    rect(56, yy, w, 2, i === 7 ? '#a8ffc8' : '#2ec86a');
    if (ciaX_hash(n, 8) > 0.5) rect(58 + w, yy, Math.min(92 - 58 - w, Math.floor(ciaX_hash(n, 1) * 10)), 2, '#1a8a48');
  }
  if ((t * 2 | 0) % 2) rect(56 + 6 + Math.floor(ciaX_hash(off + 7, 3) * 24) + 2, 263, 3, 2, '#c8ffe0');
  ciaX_glow(76, 246, 50, 40, '#20c060', 0.22, 5);
  ciaX_alpha(0.12, () => ciaX_poly([[56, 224], [66, 223], [58, 270], [52, 270]], '#ffffff'));
}

// ===================================================================
// INTELLIGENCE SECTION: Sam's situation room (150x200, fine 300x400). Night. A green-shaded lamp
// hangs over the map table; Sam leans on it with both hands, lit hard from above, a cool rim of
// streetlight from the blinds behind him. Clocks for the world's capitals, a corkboard of faces
// and red string, and an analyst's copper hair in the dark foreground.
// ===================================================================
const ciaX_ROOM = ciaX_ramp(['#060609', '#0e0d12', '#18161c', '#232026', '#302b2e', '#403836', '#554a42'], 12);
const ciaX_PAPER = ciaX_ramp(['#3a2e20', '#6a5838', '#9a8458', '#c4ae80', '#e2d0a4', '#f8ecc8'], 10);
const ciaX_LAMP = { x: 150, y: 136 };          // centre of the lamp shade's mouth
const ciaX_SAMSK = ['#241012', '#4a2420', '#76402e', '#a26248', '#c88662', '#e6ac84', '#fad2aa'];
function ciaX_sam() {
  return art('ciaX_sam', 64, 60, () => {
    g.translate(4, 0);
    const SK = ciaX_SAMSK;
    const SH = ['#141a28', '#2c3446', '#4e586c', '#7c8494', '#a8acb2', '#d2d0c8', '#f2ecde'];
    const HR = ['#2a2a30', '#55555c', '#85858a', '#b2b0ae', '#dcd8d0'];
    const TIE = ['#240810', '#4a1018', '#7a1c26', '#a8323a'];
    const RIM = '#7aa4dc';
    // shirt: sloping shoulders, hunched forward over the table; lit from above, cool in the shadows
    ciaX_poly([[44, 50], [68, 50], [86, 58], [100, 68], [106, 84], [108, 120], [4, 120], [6, 84], [12, 68], [26, 58]], (x, y) => {
      const top = y - 50 - Math.abs(x - 56) * 0.28;
      return SH[clamp(Math.round(5.4 - top * 0.075 - (Math.abs(x - 56) > 40 ? 1 : 0)), 1, 6)];
    });
    // arm seams and the folds where the arms go forward
    line(24, 62, 16, 118, SH[2]); line(88, 62, 96, 118, SH[2]);
    ciaX_poly([[6, 90], [16, 86], [14, 120], [4, 120]], SH[2]); ciaX_poly([[96, 86], [106, 90], [108, 120], [98, 120]], SH[3]);
    // suspenders
    ciaX_poly([[36, 56], [41, 55], [45, 120], [39, 120]], '#40221e'); ciaX_poly([[71, 55], [76, 56], [73, 120], [67, 120]], '#40221e');
    rect(37, 57, 1, 50, '#7a4636'); rect(72, 57, 1, 50, '#6a3a30');
    // neck, short and thick, in the shadow of the jaw
    ciaX_poly([[45, 40], [67, 40], [70, 54], [42, 54]], SK[2]); rect(46, 44, 20, 3, SK[1]);
    // open collar and a loosened tie
    ciaX_poly([[42, 52], [50, 50], [56, 60], [48, 64]], SH[6]); ciaX_poly([[70, 52], [62, 50], [56, 60], [64, 64]], SH[5]);
    ciaX_poly([[53, 58], [59, 58], [60, 64], [52, 64]], TIE[2]);
    ciaX_poly([[53, 64], [59, 64], [62, 108], [56, 116], [50, 108]], (x, y) => TIE[x < 55 ? 3 : y > 96 ? 1 : 2]);
    // head: cranium and jaw
    ciaX_ell(56, 22, 16, 18, SK[3]);
    ciaX_poly([[40, 26], [72, 26], [70, 38], [64, 46], [56, 49], [48, 46], [42, 38]], SK[3]);
    // the planes of the face, lit from above
    ciaX_ell(56, 13, 13, 7, SK[4]); ciaX_ell(56, 11, 8, 4, SK[5]);
    ciaX_poly([[40, 18], [44, 18], [45, 38], [42, 38]], SK[2]); ciaX_poly([[68, 18], [72, 18], [70, 38], [67, 38]], SK[2]);
    ciaX_ell(49, 26, 5.5, 3, SK[2]); ciaX_ell(63, 26, 5.5, 3, SK[2]);                        // eye sockets
    ciaX_ell(47, 32, 4, 2, SK[4]); ciaX_ell(65, 32, 4, 2, SK[4]);                            // cheekbones
    ciaX_poly([[44, 38], [50, 44], [56, 46], [62, 44], [68, 38], [66, 44], [60, 48], [52, 48], [46, 44]], SK[2]);   // jowls
    // eyes: whites, brown irises, a glint of the lamp; heavy lids
    for (const ex of [46, 60]) { rect(ex, 26, 6, 2, '#dccfc2'); rect(ex + 2, 26, 2, 2, '#4a3020'); px(ex + 2, 26, '#120806'); px(ex + 3, 26, '#fff6e8'); rect(ex - 1, 25, 8, 1, SK[1]); }
    // bushy grey brows
    ciaX_poly([[43, 21], [52, 20], [53, 23], [44, 24]], HR[3]); ciaX_poly([[60, 20], [69, 21], [68, 24], [59, 23]], HR[3]);
    rect(44, 21, 8, 1, HR[4]); rect(60, 21, 8, 1, HR[4]);
    // nose: lit ridge, broad tip, hard shadow beneath
    rect(55, 24, 2, 9, SK[5]); px(55, 24, SK[6]);
    ciaX_ell(56, 34, 3.5, 2, SK[4]); px(55, 33, SK[6]); px(53, 36, SK[1]); px(59, 36, SK[1]);
    rect(52, 37, 9, 1, SK[1]); rect(53, 38, 7, 1, SK[2]);
    line(51, 35, 49, 41, SK[2]); line(61, 35, 63, 41, SK[2]);                                  // lines from nose to mouth
    // mouth set hard, chin catching the light
    rect(52, 40, 8, 1, SK[2]); rect(51, 41, 10, 1, SK[1]); px(50, 41, SK[2]); px(61, 41, SK[2]); rect(52, 42, 8, 1, SK[4]); rect(53, 44, 6, 1, SK[2]);
    ciaX_ell(56, 46, 4, 1.4, SK[4]);
    // ears
    ciaX_ell(39.5, 29, 2.5, 4.5, SK[3]); px(39, 29, SK[1]); ciaX_ell(72.5, 29, 2.5, 4.5, SK[2]); px(73, 29, SK[1]);
    // grey hair: short at the sides, thin on top, the lamp shining on his scalp
    ciaX_poly([[39, 14], [44, 10], [45, 24], [41, 28], [39, 26]], HR[2]); ciaX_poly([[68, 10], [73, 14], [73, 26], [71, 28], [67, 24]], HR[1]);
    for (const [a, b, c, d] of [[40, 16], [42, 13], [70, 14], [71, 18]].map(p => [p[0], p[1], p[0] + 1, p[1] + 8])) line(a, b, c, d, HR[4]);
    for (let k = 0; k < 5; k++) line(47 + k * 4, 6, 49 + k * 4, 10, HR[3]);
    ciaX_ell(55, 8, 4, 1.5, '#fff0d8');
    // cool rim from the blinds on his left
    rect(73, 14, 1, 14, RIM); line(86, 58, 100, 68, RIM); rect(106, 84, 1, 36, RIM);
    ciaX_rim(128, 120, '#0c0608', 0.5);
  });
}
// his forearms and big hands planted on the map (drawn over the table)
function ciaX_samHands() {
  const SK = ciaX_SAMSK;
  for (const [hx, dir] of [[112, 1], [188, -1]]) {
    // forearm coming toward us out of a rolled sleeve at the far edge of the table
    ciaX_poly([[hx - 12 * dir, 262], [hx + 4 * dir, 262], [hx + 8 * dir, 284], [hx - 8 * dir, 284]], (x, y) => SK[clamp(Math.round(3.2 + (y - 262) * 0.05 - (dir * (x - hx) < -6 ? 1 : 0)), 1, 6)]);
    ciaX_poly([[hx - 14 * dir, 258], [hx + 6 * dir, 258], [hx + 6 * dir, 265], [hx - 14 * dir, 265]], '#c8c8c0');
    rect(Math.min(hx - 14 * dir, hx + 6 * dir), 258, 20, 1, '#f2ecde');
    // the hand, fingers spread flat toward us
    const hl = hx - 10, hr = hx + 10;
    ciaX_poly([[hl, 282], [hr, 282], [hr + 2, 290], [hl - 2, 290]], SK[4]);
    for (let f = 0; f < 4; f++) { const fx = hl - 2 + f * 6 + (dir < 0 ? 1 : 0); ciaX_poly([[fx, 289], [fx + 4, 289], [fx + 4 + (f - 1.5) * 1.2, 297], [fx + (f - 1.5) * 1.2, 297]], SK[3]); rect(fx, 289, 4, 1, SK[5]); rect(fx + (f - 1.5) * 1.2, 296, 4, 1, SK[1]); }
    const tx = dir > 0 ? hr : hl - 6; ciaX_poly([[tx, 284], [tx + 6, 284], [tx + 6 + dir * 3, 292], [tx + dir * 3, 292]], SK[3]); rect(tx, 284, 6, 1, SK[5]);
    rect(hl, 282, 20, 1, SK[6]);
    ciaX_alpha(0.45, () => ciaX_poly([[hl - 2, 297], [hr + 3, 297], [hr + 6, 301], [hl, 301]], '#1a0c06'));
  }
  // wristwatch
  rect(106, 276, 12, 3, '#2a241c'); rect(110, 276, 4, 3, '#c8c0a8');
}
function ciaX_analyst() {
  return art('ciaX_analyst', 52, 60, () => {
    const HR = ['#1a0604', '#3e1208', '#6a2410', '#98401c', '#c8622a', '#f09048'];
    const JK = ['#050508', '#0c0c12', '#16161e', '#22222c'];
    // shoulders in a dark jacket, a thin lamp-lit edge along the top
    ciaX_poly([[0, 74], [22, 60], [60, 56], [84, 62], [104, 80], [104, 120], [0, 120]], (x, y) => JK[clamp(Math.round(2 - (y - 60) * 0.03), 0, 3)]);
    ciaX_poly([[22, 60], [60, 56], [84, 62], [84, 64], [60, 58], [22, 62]], '#4a3a30');
    // copper bob seen from behind, lit on the crown by the lamp
    // a bob: rounded crown, straight sides, ends curling under; mostly in shadow, the lamp catching the crown
    ciaX_poly([[30, 20], [38, 9], [52, 5], [66, 9], [74, 20], [78, 40], [80, 58], [74, 64], [30, 64], [24, 58], [26, 40]], (x, y) => {
      const r = Math.hypot((x - 62) / 26, (y - 8) / 24);
      return HR[clamp(Math.round(4.2 - r * 3.4), 0, 4)];
    });
    ciaX_poly([[24, 58], [80, 58], [76, 64], [28, 64]], HR[0]);
    for (const [a, b, c, d] of [[46, 10, 36, 40], [56, 8, 54, 36], [66, 12, 72, 40]]) line(a, b, c, d, HR[1]);
    line(58, 7, 68, 11, HR[5]); line(68, 11, 73, 18, HR[4]);
    ciaX_poly([[36, 64], [68, 64], [66, 70], [38, 70]], '#1a0e0c');
    ciaX_rim(104, 120, '#030306', 0.4);
  });
}
function ciaX_intelBG() {
  return ciaX_layer('intel', 150, 200, () => {
    const L = ciaX_LAMP;
    // back wall: dark, a soft warm fall-off around the lamp
    ciaX_poly([[0, 0], [300, 0], [300, 262], [0, 262]], (x, y) => ciaX_q(ciaX_ROOM, 0.2 + 0.35 * Math.exp(-(((x - L.x) / 110) ** 2) - (((y - 190) / 90) ** 2))));
    // a window with venetian blinds, night blue light between the slats
    const WX0 = 214, WX1 = 296, WY0 = 64, WY1 = 196;
    rect(WX0 - 4, WY0 - 4, WX1 - WX0 + 8, WY1 - WY0 + 8, ciaX_ROOM[1]);
    for (let yy = WY0; yy < WY1; yy++) {
      const slat = (yy - WY0) % 7, open = yy > 150 ? 2 : 3;
      rect(WX0, yy, WX1 - WX0, 1, slat < open ? mix('#3a6ab0', '#9ac0f0', slat === 1 ? 0.6 : 0.1) : slat === open ? '#1e2a44' : mix('#0e1424', '#1a2238', slat / 7));
    }
    rect(WX0 + 38, WY0, 1, WY1 - WY0, '#0a0e18');
    // the slatted light falls across the wall to the left
    ciaX_alpha(0.1, () => { for (let k = 0; k < 14; k++) ciaX_poly([[WX0 - 4, WY0 + 12 + k * 9], [WX0 - 60, WY0 + 40 + k * 9], [WX0 - 60, WY0 + 43 + k * 9], [WX0 - 4, WY0 + 15 + k * 9]], '#7aa4e8'); });
    // wall clocks for the capitals
    [['WASH', 0.5], ['LOND', 0.2], ['MOSC', 0.8], ['TOKY', 0.35]].forEach(([lab, h], i) => {
      const cx = 44 + i * 52, cy = 52;
      ciaX_ell(cx, cy + 1, 13, 13, '#050406'); ciaX_ell(cx, cy, 13, 13, ciaX_BRASS[3]); ciaX_ell(cx, cy, 11, 11, mix('#e8e0cc', '#6a6254', 0.55 - 0.3 * Math.exp(-(((cx - L.x) / 90) ** 2))));
      for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; px(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, '#1a1410'); }
      const ha = h * Math.PI * 2 - Math.PI / 2, ma = ((h * 12) % 1) * Math.PI * 2 - Math.PI / 2;
      line(cx, cy, Math.round(cx + Math.cos(ha) * 5), Math.round(cy + Math.sin(ha) * 5), '#100c0a'); line(cx, cy, Math.round(cx + Math.cos(ma) * 8), Math.round(cy + Math.sin(ma) * 8), '#100c0a');
      rect(cx - 9, cy + 17, 19, 7, '#15120e'); ciaX_t3(lab, cx - 7, cy + 18, ciaX_BRASS[5]);
    });
    // corkboard: faces, a map scrap, red string between the pins
    const CX0 = 8, CX1 = 96, CY0 = 92, CY1 = 196;
    rect(CX0 - 3, CY0 - 3, CX1 - CX0 + 6, CY1 - CY0 + 6, '#1c140e');
    ciaX_poly([[CX0, CY0], [CX1, CY0], [CX1, CY1], [CX0, CY1]], (x, y) => mix('#4a3420', '#7a5838', clamp(0.2 + 0.6 * Math.exp(-(((x - 120) / 90) ** 2) - (((y - 170) / 80) ** 2)), 0, 1)));
    const pins = [];
    [[14, 100, 1], [44, 104, 0], [70, 98, 1], [18, 140, 0], [52, 146, 1], [76, 136, 0], [30, 172, 1], [66, 174, 0]].forEach(([px0, py0, k], i) => {
      const w = 16, h = 20;
      ciaX_alpha(0.5, () => rect(px0 + 2, py0 + 2, w, h, '#0c0806'));
      rect(px0, py0, w, h, '#d8d0bc'); rect(px0 + 2, py0 + 2, w - 4, h - 7, k ? '#5a5652' : '#6a625a');
      // a face in each photo
      ciaX_ell(px0 + w / 2, py0 + 8, 3.2, 4, k ? '#b8aa9a' : '#a89888'); rect(px0 + 4, py0 + 12, 8, 3, k ? '#3a3632' : '#2a2622');
      rect(px0 + 6, py0 + 7, 1, 1, '#2a2622'); rect(px0 + 9, py0 + 7, 1, 1, '#2a2622');
      if (i === 4) { line(px0 + 1, py0 + 1, px0 + w - 2, py0 + h - 2, '#c02a2a'); line(px0 + w - 2, py0 + 1, px0 + 1, py0 + h - 2, '#c02a2a'); }
      pins.push([px0 + w / 2, py0 - 1]);
    });
    for (const [a, b] of [[0, 4], [1, 4], [2, 5], [4, 6], [4, 7], [3, 6]]) line(pins[a][0], pins[a][1], pins[b][0], pins[b][1], '#c8302c');
    for (const [x0, y0] of pins) { rect(x0 - 1, y0 - 1, 3, 3, '#e8402a'); px(x0 - 1, y0 - 1, '#ffb0a0'); }
    // ---- Sam, then the table in front of him ----
    g.drawImage(ciaX_sam(), 90, 150);
    // table: dark wood, with the great map spread on it and a pool of lamplight
    const T = { fy: 262, ny: 346 };
    ciaX_poly([[26, T.fy], [274, T.fy], [320, T.ny], [-20, T.ny]], (x, y) => ciaX_q(ciaX_WAL, 0.14 + 0.5 * Math.exp(-(((x - 150) / 120) ** 2) - (((y - 290) / 50) ** 2))));
    ciaX_poly([[-20, T.ny], [320, T.ny], [320, T.ny + 10], [-20, T.ny + 10]], (x, y) => ciaX_q(ciaX_WAL, y === T.ny ? 0.5 : 0.12));
    ciaX_poly([[-20, T.ny + 10], [320, T.ny + 10], [320, 400], [-20, 400]], ciaX_ROOM[0]);
    // the map on the table, slightly askew
    const mp = [[62, 268], [238, 266], [262, 330], [40, 334]];
    ciaX_alpha(0.5, () => ciaX_poly(mp.map(p => [p[0] + 3, p[1] + 3]), '#060404'));
    ciaX_poly(mp, (x, y) => ciaX_q(ciaX_PAPER, 0.25 + 0.75 * Math.exp(-(((x - 150) / 95) ** 2) - (((y - 296) / 44) ** 2))));
    // inked on it: a coastline with the sea washed in grey-blue, a faint grid, a red dashed route
    const coast = y => 104 + 14 * Math.sin((y - 266) / 8) + (y - 266) * 0.5;
    ciaX_alpha(0.35, () => ciaX_poly(mp, (x, y) => x < coast(y) ? '#4a6a7a' : null));
    for (let y = 268; y < 332; y++) { px(Math.round(coast(y)), y, '#4a3a26'); }
    ciaX_alpha(0.25, () => { for (let i = 1; i < 6; i++) line(62 + i * 30, 267, 40 + i * 37, 333, '#5a4a34'); rect(52, 288, 196, 1, '#5a4a34'); rect(46, 310, 208, 1, '#5a4a34'); });
    for (let k = 0; k < 16; k++) { const u = k / 16, x0 = 96 + u * 120, y0 = 312 - u * 26 - Math.sin(u * 3.1) * 8; if (k % 2 === 0) rect(x0, y0, 4, 1, '#a82a20'); }
    for (let a = 0; a < 6.3; a += 0.3) px(96 + Math.cos(a) * 5, 312 + Math.sin(a) * 2.5, '#a82a20');
    for (const [mx, my] of [[140, 296], [184, 304], [110, 286]]) { rect(mx - 1, my - 5, 2, 5, '#6a1a14'); ciaX_ell(mx, my - 6, 2.5, 2.5, '#e8382a'); px(mx - 1, my - 7, '#ffb0a0'); }
    // photographs and a folder at the near edge, coffee, ashtray
    ciaX_poly([[196, 312], [226, 308], [230, 330], [200, 334]], '#e8e0cc'); ciaX_poly([[199, 314], [224, 311], [226, 324], [201, 327]], '#48443e');
    ciaX_ell(212, 318, 3, 3.5, '#9a8e80');
    ciaX_poly([[46, 316], [98, 314], [104, 342], [40, 344]], (x, y) => ciaX_q(ciaX_PAPER, 0.55 - (y - 314) / 90)); rect(52, 322, 30, 2, '#6a5838'); rect(52, 327, 22, 2, '#6a5838'); rect(40, 344, 64, 1, '#3a2e20');
    rect(58, 320, 14, 6, '#b02020'); ciaX_t3('TOP', 59, 320, '#f0e8d8');
    ciaX_ell(250, 314, 9, 3.5, '#d8d4cc'); rect(241, 314, 18, 12, '#c8c4bc'); rect(241, 314, 4, 12, '#e8e4dc'); ciaX_ell(250, 326, 9, 3, '#8a8680'); ciaX_ell(250, 314, 7, 2.5, '#2a160c');
    ciaX_poly([[259, 316], [263, 316], [264, 322], [259, 323]], '#a8a49c');
    ciaX_ell(92, 290, 10, 3.5, '#2a2e34'); ciaX_ell(92, 289, 8, 2.5, '#141418'); line(92, 289, 104, 286, '#f0ece0'); px(104, 286, '#ff6020');
    ciaX_samHands();
    // the lamp: cord, green glass shade, the hot mouth of the bulb
    rect(L.x, 0, 1, L.y - 34, '#0a0a0c');
    ciaX_poly([[L.x - 8, L.y - 36], [L.x + 8, L.y - 36], [L.x + 10, L.y - 30], [L.x - 10, L.y - 30]], ciaX_BRASS[3]);
    const GL = ['#06180e', '#0e2e1a', '#16482a', '#22683c', '#3a9058', '#7acc90', '#c8f0d0'];
    ciaX_poly([[L.x - 12, L.y - 30], [L.x + 12, L.y - 30], [L.x + 34, L.y - 2], [L.x - 34, L.y - 2]], (x, y) => { const d = (x - L.x) / 34; return GL[clamp(Math.round(3.4 - d * 2.4 - (y - L.y + 30) * 0.04 + (Math.abs(d + 0.35) < 0.08 ? 2 : 0)), 0, 6)]; });
    ciaX_poly([[L.x - 35, L.y - 3], [L.x + 35, L.y - 3], [L.x + 35, L.y], [L.x - 35, L.y]], ciaX_BRASS[4]);
    ciaX_ell(L.x, L.y, 32, 4, '#fff6d8'); ciaX_ell(L.x, L.y + 0.5, 14, 2, '#ffffff');
    // the analyst in the dark foreground
    g.drawImage(ciaX_analyst(), -6, 282);
  });
}
function intelArt(x, y, w, h, t) {
  ciaX_clip(x, y, w, h);
  blit(ciaX_intelBG(), x, y);
  fine(() => {
    g.translate(x * 2, y * 2);
    const L = ciaX_LAMP, fl = 1 + 0.04 * Math.sin(t * 13) * Math.sin(t * 3.1);
    // the cone of lamplight, faintly visible in the smoky air
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) { g.globalAlpha = 0.035 * fl; const k = 1 - i * 0.2; ciaX_poly([[L.x - 32 * k, L.y], [L.x + 32 * k, L.y], [L.x + 130 * k, 300], [L.x - 130 * k, 300]], '#ffd890'); }
    g.globalAlpha = 0.5 * fl; ciaX_glow(L.x, L.y + 2, 70, 16, '#ffcf80', 0.5, 6);
    g.restore();
    // smoke from the ashtray, drifting into the light
    for (let i = 0; i < 8; i++) {
      const k = (t * 0.28 + i / 8) % 1, sx = 104 + Math.sin(k * 6 + t) * (2 + k * 10) + k * 18, sy = 286 - k * 110;
      ciaX_alpha(0.4 * (1 - k) * (k < 0.1 ? k * 10 : 1), () => ciaX_ell(sx, sy, 1.5 + k * 4, 1 + k * 2.5, '#c8c4c0'));
    }
    // Sam's eyes: a slow blink
    if ((t % 5.2) < 0.14) { rect(94 + 46, 150 + 26, 6, 2, '#76402e'); rect(94 + 60, 150 + 26, 6, 2, '#76402e'); }
  });
  g.restore();
}

// ===================================================================
// CRYPTO BRANCH (150x200, fine 300x400): a green-walled back room. The professor, wild grey hair and
// a lab coat, chalks a frequency attack across the blackboard; in the foreground a rotor cipher
// machine sits in the warm pool of a desk lamp, its lampboard lighting letter after letter.
// ===================================================================
const ciaX_GW = ciaX_ramp(['#070c0b', '#101a17', '#1a2923', '#263a30', '#344c3c', '#46604a', '#5e785c', '#7c9270'], 14);
const ciaX_ENIG = 'QWERTZUIOASDFGHJKPYXCVBNML';
function ciaX_prof() {
  return art('ciaX_prof', 50, 100, () => {
    g.translate(8, 24);
    const CT = ['#1e2630', '#3a4452', '#5c6674', '#848c96', '#aeb4b6', '#d2d4ce', '#eeeee4'];
    const HR = ['#4a4a52', '#7c7c84', '#aeaeb0', '#d6d4ce', '#f6f4ec'];
    const SK = ['#2a1616', '#57302a', '#86503c', '#b07458', '#d49b78'];
    // trousers and shoes
    ciaX_poly([[26, 150], [40, 150], [39, 186], [27, 186]], '#2a2c34'); ciaX_poly([[44, 150], [58, 150], [58, 186], [45, 186]], '#353844');
    ciaX_poly([[24, 185], [41, 185], [42, 192], [22, 192]], '#141214'); ciaX_poly([[44, 185], [60, 185], [62, 192], [44, 192]], '#1c181a');
    // the coat from behind: long, a centre vent, lit from above and a little from the right
    ciaX_poly([[18, 38], [30, 31], [54, 31], [66, 38], [66, 70], [62, 96], [70, 150], [72, 156], [12, 156], [14, 150], [22, 96], [18, 70]], (x, y) => {
      let i = 4.4 + (x - 42) * 0.03 - (y - 30) * 0.01;
      const f = Math.sin((x - 42) * 0.4 + y * 0.01); if (y > 96 && f > 0.8) i += 0.8; if (y > 96 && f < -0.85) i -= 1;
      return CT[clamp(Math.round(i), 1, 6)];
    });
    line(42, 110, 42, 156, CT[1]); line(43, 110, 43, 156, CT[5]);
    ciaX_poly([[26, 90], [58, 90], [58, 96], [26, 96]], CT[3]); rect(26, 90, 32, 1, CT[5]); rect(30, 94, 2, 2, CT[1]); rect(52, 94, 2, 2, CT[1]);
    line(26, 40, 24, 90, CT[3]); line(58, 40, 60, 90, CT[3]);
    // left arm hanging, a notebook in the hand
    ciaX_poly([[12, 40], [24, 36], [22, 104], [12, 108], [8, 70]], (x, y) => CT[clamp(Math.round(3.6 - (y - 40) * 0.015 - (x < 12 ? 1 : 0)), 1, 6)]);
    ciaX_poly([[8, 104], [20, 102], [20, 112], [8, 112]], SK[3]);
    ciaX_poly([[2, 108], [18, 104], [22, 130], [6, 134]], '#6a2a22'); ciaX_poly([[3, 109], [17, 105], [18, 108], [4, 112]], '#9a4436'); line(6, 110, 9, 132, '#e8dcc8');
    // right arm raised to the board, chalk in the fingers
    ciaX_poly([[54, 32], [68, 38], [80, 20], [84, -4], [76, -6], [70, 14], [58, 28]], (x, y) => CT[clamp(Math.round(4.4 + (x - 70) * 0.05 - (y < 10 ? 0.6 : 0)), 1, 6)]);
    ciaX_poly([[75, -6], [85, -5], [84, -2], [76, -2]], CT[6]);
    ciaX_poly([[76, -8], [84, -9], [86, -16], [82, -20], [76, -16]], SK[3]); rect(78, -18, 4, 2, SK[4]); rect(83, -22, 2, 4, '#f4f4ec');
    // collar, neck, then the head from behind
    ciaX_poly([[28, 22], [36, 20], [48, 20], [56, 24], [54, 32], [30, 32]], SK[2]);
    ciaX_poly([[24, 30], [34, 24], [42, 30], [50, 24], [60, 30], [56, 36], [28, 36]], CT[5]);
    ciaX_ell(42, 10, 13, 15, SK[2]);
    ciaX_ell(53, 12, 2.5, 4.5, SK[3]); px(54, 12, SK[4]);                                             // ear
    ciaX_poly([[54, 6], [56, 5], [58, 8], [57, 9]], '#c8b070'); line(54, 7, 44, 6, '#8a7640');          // spectacles arm
    // wild grey hair: a cloud of clumps, bright where the tubes catch it, darker underneath
    const clumps = [[42, 16, 12, 6, 2], [30, 12, 6, 7, 2], [54, 12, 6, 7, 2], [42, 6, 13, 9, 3], [34, 0, 8, 6, 3.6], [49, 0, 8, 6, 3.6], [42, -4, 7, 5, 4.2], [25, 7, 4, 4, 2.6], [59, 6, 4, 4, 2.6]];
    for (const [cx, cy, rx, ry, l] of clumps) ciaX_ell(cx, cy, rx, ry, (x, y) => HR[clamp(Math.round(l - (y - cy) / ry * 0.9 - (x < cx - rx * 0.4 ? 0.7 : 0)), 0, 4)]);
    for (const [a, b, c, d] of [[34, 6, 37, 13], [47, 5, 45, 13], [40, 12, 42, 19]]) line(a, b, c, d, HR[1]);
    for (const [xx, yy] of [[22, 4], [21, 9], [62, 3], [63, 8], [37, -8], [48, -9]]) px(xx, yy, HR[3]);
    ciaX_rim(100, 200, '#080a10', 0.5);
  });
}
function ciaX_cryptoBG() {
  return ciaX_layer('crypto', 150, 200, () => {
    // institutional green wall and a dark ceiling strip with fluorescent tubes
    ciaX_poly([[0, 0], [300, 0], [300, 300], [0, 300]], (x, y) => ciaX_q(ciaX_GW, 0.38 - y / 1400 + 0.12 * Math.exp(-(((x - 150) / 160) ** 2)) - (y > 250 ? 0.08 : 0)));
    rect(0, 0, 300, 40, ciaX_GW[2]);
    for (const fx of [30, 170]) { rect(fx - 3, 30, 106, 8, ciaX_GW[1]); rect(fx, 31, 100, 4, '#eef8f0'); rect(fx, 31, 100, 1, '#ffffff'); rect(fx, 34, 100, 1, '#b8d8c4'); }
    ciaX_glow(150, 42, 200, 24, '#4a8a6a', 0.22, 5);
    // dado rail and a darker lower wall
    rect(0, 244, 300, 3, ciaX_GW[9]); rect(0, 247, 300, 1, ciaX_GW[2]);
    ciaX_poly([[0, 248], [300, 248], [300, 300], [0, 300]], (x, y) => ciaX_q(ciaX_GW, 0.2 - (y - 248) / 600));
    // the blackboard in a wooden frame
    const B = { x0: 16, y0: 58, x1: 284, y1: 196 };
    ciaX_alpha(0.5, () => rect(B.x0 - 3, B.y0 + 2, B.x1 - B.x0 + 10, B.y1 - B.y0 + 10, '#040806'));
    rect(B.x0 - 6, B.y0 - 6, B.x1 - B.x0 + 12, B.y1 - B.y0 + 12, ciaX_WAL[4]); rect(B.x0 - 6, B.y0 - 6, B.x1 - B.x0 + 12, 1, ciaX_WAL[8]); rect(B.x0 - 6, B.y0 - 6, 1, B.y1 - B.y0 + 12, ciaX_WAL[6]);
    rect(B.x0 - 1, B.y0 - 1, B.x1 - B.x0 + 2, B.y1 - B.y0 + 2, ciaX_WAL[1]);
    ciaX_poly([[B.x0, B.y0], [B.x1, B.y0], [B.x1, B.y1], [B.x0, B.y1]], (x, y) => mix('#16241e', '#23362c', clamp(0.35 + 0.5 * Math.exp(-(((x - 150) / 150) ** 2)) - (y - B.y0) / 400, 0, 1)));
    // old erasures: soft chalky smears
    ciaX_alpha(0.07, () => { ciaX_poly([[30, 70], [120, 66], [126, 84], [34, 90]], '#dfe8dc'); ciaX_poly([[180, 150], [270, 146], [272, 170], [176, 176]], '#dfe8dc'); });
    // chalk: a ciphertext line, the key being worked out, a frequency histogram, arrows
    const chalk = (s, x, y, a = 0.85) => ciaX_alpha(a, () => text(s, x, y, '#e6ece0'));
    chalk('XLIVI MW E QSPI', 26, 68); chalk('THERE IS A MOLE', 26, 82, 0.7);
    ciaX_alpha(0.7, () => { line(26, 78, 150, 78, '#e6ece0'); });
    chalk('SHIFT +4', 160, 68, 0.8);
    ciaX_alpha(0.8, () => { for (let a = 0; a < 6.28; a += 0.04) px(186 + Math.cos(a) * 30, 72 + Math.sin(a) * 9, '#e6ece0'); });
    // histogram of letter counts
    const hs = [9, 3, 5, 6, 14, 4, 3, 7, 10, 1, 2, 6, 5, 9, 11, 3];
    ciaX_alpha(0.8, () => { rect(30, 176, 130, 1, '#e6ece0'); rect(30, 118, 1, 58, '#e6ece0'); hs.forEach((v, i) => { rect(34 + i * 8, 176 - v * 3.8, 5, v * 3.8, '#c8d8c8'); }); });
    ciaX_alpha(0.55, () => { hs.forEach((v, i) => rect(34 + i * 8, 176 - v * 3.8, 5, 1, '#ffffff')); ciaX_t3('ETAOINSHRDLU', 34, 180, '#e6ece0'); });
    chalk('E = I ?', 170, 104, 0.8); chalk('T = X', 170, 118, 0.7);
    ciaX_alpha(0.7, () => { line(158, 108, 132, 128, '#e6ece0'); line(132, 128, 136, 122, '#e6ece0'); line(132, 128, 138, 127, '#e6ece0'); });
    // chalk tray with sticks and a felt eraser
    rect(B.x0 - 8, B.y1 + 6, B.x1 - B.x0 + 16, 5, ciaX_WAL[5]); rect(B.x0 - 8, B.y1 + 6, B.x1 - B.x0 + 16, 1, ciaX_WAL[9]); rect(B.x0 - 8, B.y1 + 11, B.x1 - B.x0 + 16, 2, ciaX_WAL[1]);
    rect(60, B.y1 + 3, 10, 3, '#f0f0e8'); rect(74, B.y1 + 4, 6, 2, '#e8e0d0'); rect(236, B.y1 + 1, 22, 5, '#6a4a2a'); rect(236, B.y1 + 4, 22, 2, '#c8c8c0');
    // a lino floor
    ciaX_poly([[0, 300], [300, 300], [300, 400], [0, 400]], (x, y) => ciaX_q(ciaX_GW, 0.22 - (y - 300) / 500));
    for (let i = -6; i <= 6; i++) line(150 + i * 30, 300, 150 + i * 70, 400, ciaX_GW[2]);
    // the professor at the board, and his shadow
    ciaX_alpha(0.25, () => ciaX_poly([[150, 222], [210, 222], [216, 300], [140, 300]], '#050a08'));
    g.drawImage(ciaX_prof(), 132, 98);
    // ---- foreground desk ----
    const DY = 300;
    ciaX_poly([[-10, DY], [310, DY], [310, 312], [-10, 312]], (x, y) => ciaX_q(ciaX_WAL, 0.42 + 0.3 * Math.exp(-(((x - 214) / 70) ** 2)) + (y === DY ? 0.2 : 0)));
    ciaX_poly([[-10, 312], [310, 312], [310, 400], [-10, 400]], (x, y) => ciaX_q(ciaX_WAL, 0.14 - (y - 312) / 900 + ((x + 10) % 64 < 1 ? -0.06 : 0)));
    // drawer fronts with brass pulls, catching a little lamplight
    for (const [dx0, dx1] of [[4, 96], [104, 196], [204, 296]]) {
      ciaX_poly([[dx0, 324], [dx1, 324], [dx1, 372], [dx0, 372]], (x, y) => ciaX_q(ciaX_WAL, 0.2 + 0.18 * Math.exp(-(((x - 230) / 80) ** 2)) - (y - 324) / 400 + (y === 324 ? 0.14 : 0) - (y === 371 ? 0.1 : 0)));
      const hx = (dx0 + dx1) / 2; rect(hx - 10, 338, 20, 4, ciaX_BRASS[2]); rect(hx - 10, 338, 20, 1, ciaX_BRASS[5 + (dx0 > 150 ? 1 : 0)]);
    }
    // papers and a stack of punched cards
    ciaX_poly([[12, 292], [70, 290], [76, 304], [8, 306]], '#e4dcc8'); for (let i = 0; i < 5; i++) rect(18, 294 + i * 2.4, 40 - i * 5, 1, '#8a8474');
    for (let k = 0; k < 4; k++) { ciaX_poly([[86 + k, 288 - k * 2], [124 + k, 288 - k * 2], [126 + k, 296 - k * 2], [88 + k, 296 - k * 2]], k % 2 ? '#e8d8a8' : '#d8c898'); }
    for (let i = 0; i < 9; i++) rect(92 + i * 3.5, 283, 1, 2, '#6a5a3a');
    // coffee mug
    rect(136, 284, 14, 16, '#cfd4cc'); rect(136, 284, 4, 16, '#eef0ea'); ciaX_ell(143, 284, 7, 2, '#2a1a10'); ciaX_poly([[150, 288], [155, 288], [155, 296], [150, 296]], '#b8beb6');
  });
}
// the rotor machine in the lamp's pool, seen from above and in front (fine coords on the panel)
const ciaX_EN = { by: 258, fy: 302, bx0: 176, bx1: 266, fx0: 164, fx1: 278 };
const ciaX_enX = (u, y) => { const E = ciaX_EN, k = (y - E.by) / (E.fy - E.by); return E.bx0 + (E.fx0 - E.bx0) * k + u * ((E.bx1 - E.bx0) + ((E.fx1 - E.fx0) - (E.bx1 - E.bx0)) * k); };
const ciaX_enRows = [[272, 9, 0], [278, 9, 0.04], [284, 8, 0.08]];
function ciaX_enigma() {
  const E = ciaX_EN;
  // the open lid standing up behind, an instruction card inside
  ciaX_poly([[E.bx0 + 2, E.by - 30], [E.bx1 - 2, E.by - 30], [E.bx1, E.by], [E.bx0, E.by]], (x, y) => ciaX_q(ciaX_WAL, 0.32 + (y < E.by - 28 ? 0.25 : 0) + 0.2 * Math.exp(-(((x - 214) / 40) ** 2))));
  ciaX_poly([[E.bx0 + 8, E.by - 24], [E.bx1 - 8, E.by - 24], [E.bx1 - 6, E.by - 2], [E.bx0 + 6, E.by - 2]], (x, y) => ciaX_q(ciaX_GRAN, 0.3));
  ciaX_poly([[204, E.by - 21], [226, E.by - 21], [227, E.by - 7], [203, E.by - 7]], '#e8dcc0'); for (let i = 0; i < 4; i++) rect(206, E.by - 18 + i * 3, 12 + (i % 2) * 6, 1, '#8a7a60');
  // the deck
  ciaX_poly([[E.bx0, E.by], [E.bx1, E.by], [E.fx1, E.fy], [E.fx0, E.fy]], (x, y) => ciaX_q(ciaX_GRAN, 0.35 + (y - E.by) / 120 + 0.25 * Math.exp(-(((x - 216) / 50) ** 2))));
  ciaX_poly([[E.bx0, E.by], [E.bx1, E.by], [E.bx1, E.by + 1], [E.bx0, E.by + 1]], ciaX_WAL[6]);
  // front of the wooden case
  ciaX_poly([[E.fx0, E.fy], [E.fx1, E.fy], [E.fx1, E.fy + 11], [E.fx0, E.fy + 11]], (x, y) => ciaX_q(ciaX_WAL, y === E.fy ? 0.75 : 0.42 + 0.2 * Math.exp(-(((x - 214) / 50) ** 2))));
  for (let c = 0; c < 13; c++) { const px0 = E.fx0 + 8 + c * 8; rect(px0, E.fy + 4, 3, 2, '#0a0806'); rect(px0 + 4, E.fy + 4, 3, 2, '#0a0806'); }
  line(E.fx0 + 20, E.fy + 6, E.fx0 + 44, E.fy + 9, '#9a2a20'); line(E.fx0 + 60, E.fy + 6, E.fx0 + 84, E.fy + 8, '#9a2a20');
  // rotor window with three wheels
  const wy = E.by + 3;
  rect(200, wy, 30, 9, '#070708');
  for (let i = 0; i < 3; i++) { const rx = 203 + i * 9; rect(rx, wy + 1, 6, 7, '#cfc6ac'); rect(rx, wy + 1, 6, 1, '#8a8270'); rect(rx, wy + 7, 6, 1, '#6a6254'); ciaX_t3('KBD'[i], rx + 1, wy + 2, '#1a1410'); }
  // lampboard: rows of glass lenses
  for (const [ly, n, off] of ciaX_enRows) for (let c = 0; c < n; c++) { const lx = ciaX_enX(0.1 + off + c * 0.1, ly); ciaX_ell(lx, ly, 3.2, 1.8, '#15130e'); ciaX_ell(lx, ly - 0.3, 2.4, 1.2, '#48402c'); }
  // keyboard: white-rimmed round keys
  for (const [ky, n, off] of [[290, 9, 0], [295, 9, 0.04], [300, 8, 0.08]]) for (let c = 0; c < n; c++) { const kx = ciaX_enX(0.08 + off + c * 0.105, ky); ciaX_ell(kx, ky + 0.8, 3.8, 2, '#050506'); ciaX_ell(kx, ky, 3.8, 2, '#d8d6cc'); ciaX_ell(kx, ky - 0.2, 2.8, 1.3, '#16161a'); px(kx - 1, ky - 1, '#f4f2ea'); }
}
function cryptoLabArt(x, y, w, h, t) {
  ciaX_clip(x, y, w, h);
  blit(ciaX_cryptoBG(), x, y);
  fine(() => {
    g.translate(x * 2, y * 2);
    // chalk dust puffs by his hand now and then
    const k = (t * 0.7) % 1;
    if (k < 0.5) for (let i = 0; i < 4; i++) px(222 + Math.sin(i * 2 + t) * 4, 96 + k * 30 + i * 3, 'rgba(230,236,224,' + (0.6 * (1 - k * 2)).toFixed(2) + ')');
    // the desk lamp's warm pool
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5;
    ciaX_glow(214, 306, 90, 20, '#ffb060', 0.45, 6); g.restore();
    // the machine
    g.drawImage(ciaX_layer('enigma', 150, 200, ciaX_enigma), 0, 0);
    // a lamp lights on the lampboard as a key is struck
    const n = Math.floor(t * 1.6), idx = Math.floor(ciaX_hash(n, 7) * 26), r = idx < 9 ? 0 : idx < 18 ? 1 : 2, c = idx < 9 ? idx : idx < 18 ? idx - 9 : Math.min(7, idx - 18);
    const [ly, , off] = ciaX_enRows[r], lx = ciaX_enX(0.1 + off + c * 0.1, ly);
    ciaX_glow(lx, ly, 12, 8, '#ffb040', 0.6, 5); ciaX_ell(lx, ly - 0.3, 2.6, 1.4, '#ffe8a0'); px(Math.round(lx) - 1, ly - 1, '#ffffff');
    // desk lamp on its gooseneck, leaning over the machine
    ciaX_ell(290, 306, 12, 3, '#0c0c0a'); ciaX_ell(290, 304, 11, 3, '#2e2e2a'); rect(289, 250, 3, 54, '#1c1c1a'); rect(289, 250, 1, 54, '#5a5a54');
    line(290, 250, 276, 238, '#1c1c1a'); line(291, 250, 277, 238, '#3a3a36');
    ciaX_poly([[252, 232], [276, 230], [282, 244], [248, 250]], '#1e3a2c'); ciaX_poly([[252, 232], [276, 230], [277, 233], [253, 235]], '#5a8a6c');
    ciaX_ell(265, 247, 16, 3, '#fff0c8'); ciaX_ell(265, 247, 8, 1.5, '#ffffff');
  });
  g.restore();
}
