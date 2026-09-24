// ===================================================================
// CIA BUILDING ART: marble lobby, Data / Intelligence / Crypto floors, and the lift ride
// (all extra identifiers carry the ciaX_ prefix)
// ===================================================================
const ciaX_T = 'rgba(0,0,0,0)';
const ciaX_M = { K: P.K, B: P.BL, b: P.BL2, G: P.GR, g: P.GR2, T: P.TL, C: P.CY, R: P.RD, r: P.RD2, M: P.MG, m: P.PK, N: P.BR, Y: P.YE, D: P.G1, L: P.G3, W: P.W };

// one horizontal run: a flat colour or an ordered dither [c1, c2, level 0..16]
function ciaX_run(x0, x1, y, f) {
  if (x1 < x0) return;
  if (typeof f === 'string') { g.fillStyle = f; g.fillRect(x0, y, x1 - x0 + 1, 1); return; }
  const c1 = f[0], c2 = f[1], l = f[2];
  if (c1 !== ciaX_T) { g.fillStyle = c1; g.fillRect(x0, y, x1 - x0 + 1, 1); }
  if (l <= 0) return; g.fillStyle = c2;
  if (l >= 16) { g.fillRect(x0, y, x1 - x0 + 1, 1); return; }
  const row = (y & 3) * 4;
  for (let x = x0; x <= x1; x++) if (BAYER[row + (x & 3)] < l) g.fillRect(x, y, 1, 1);
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
  for (let dy = -ry; dy <= ry; dy++) { const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / (ry + 0.5)) ** 2))); ciaX_run(cx - hw, cx + hw, cy + dy, f); }
}
function ciaX_ring(cx, cy, r, c, step = 0.05) { for (let a = 0; a < 6.3; a += step) px(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), c); }
// string sprite rows -> pixels (map chars via ciaX_M, '.' = transparent)
function ciaX_draw(rows, x, y, map = ciaX_M) {
  for (let j = 0; j < rows.length; j++) { const r = rows[j]; for (let i = 0; i < r.length; i++) { const c = map[r[i]]; if (c) { g.fillStyle = c; g.fillRect(x + i, y + j, 1, 1); } } }
}
function ciaX_S(key, rows, map) { return sprite('ciaX_s_' + key, Math.max(...rows.map(r => r.length)), rows.length, () => ciaX_draw(rows, 0, 0, map)); }
function ciaX_put(key, rows, x, y, map) { g.drawImage(ciaX_S(key, rows, map), x | 0, y | 0); }
// cached layer with an automatic 1-px black outline around everything drawn (EGA cartoon look)
function ciaX_fig(key, w, h, fn) {
  return sprite('ciaX_f_' + key, w, h, () => {
    fn();
    const d = g.getImageData(0, 0, w, h).data, on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
    g.fillStyle = P.K;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) g.fillRect(x, y, 1, 1);
  });
}
function ciaX_clip(x, y, w, h) { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); }
// a tiny 3x5 face for clocks, labels, CRT text and chalk
const ciaX_F3 = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001011001111', '4': '101101111001001', '5': '111100111001111',
  '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111', ':': '000010000010000', ' ': '000000000000000',
  A: '010101111101101', B: '110101110101110', C: '111100100100111', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '111100101101111',
  H: '101101111101101', I: '111010010010111', J: '001001001101111', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101',
  O: '111101101101111', P: '110101110100100', Q: '111101101111001', R: '110101110101101', S: '111100111001111', T: '111010010010010', U: '101101101101111',
  V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111', '-': '000000111000000', '=': '000111000111000',
  '.': '000000000000010', '?': '111001011000010', '/': '001001010100100', '>': '100010001010100',
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
// brushed stainless steel: vertical grain dithered between dark gray, light gray and white
function ciaX_steel(x, y, w, h, bright = 0, seed = 0) {
  for (let xx = 0; xx < w; xx++) {
    const col = ciaX_hash(xx + seed * 131, 7) * 0.34 + (ciaX_hash((xx >> 2) + seed, 3) - 0.5) * 0.16;
    for (let yy = 0; yy < h; yy++) {
      const v = Math.max(0, Math.min(0.999, col + 0.5 * (1 - yy / h) + 0.05 + bright));
      const thr = BAYER[((y + yy) & 3) * 4 + ((x + xx) & 3)] / 16;
      let c; if (v < 0.5) c = v * 2 > thr ? P.G3 : P.G1; else c = (v - 0.5) * 2 > thr ? P.W : P.G3;
      g.fillStyle = c; g.fillRect(x + xx, y + yy, 1, 1);
    }
  }
}
// polished marble: light gray / white with soft cloud and dark veins
function ciaX_marble(x, y, w, h, seed = 1) {
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const v = vnoise((x + xx) / 11 + seed, (y + yy) / 7) * 0.7 + vnoise((x + xx) / 4, (y + yy) / 3 + seed) * 0.3;
    const thr = BAYER[((y + yy) & 3) * 4 + ((x + xx) & 3)] / 16;
    g.fillStyle = v * 1.25 - 0.2 > thr ? P.W : P.G3; g.fillRect(x + xx, y + yy, 1, 1);
  }
  let s = seed * 977;
  for (let k = 0; k < w * h / 900 + 1; k++) {
    s = (s * 16807) % 2147483647; let vx = x + s % w; s = (s * 16807) % 2147483647; let vy = y + s % h;
    for (let n = 0; n < 40; n++) { s = (s * 16807) % 2147483647; vx += (s % 3) - 0.7; vy += 1; if (vx < x || vx >= x + w || vy >= y + h) break; if (n % 3 !== 2) px(vx, vy, P.G1); }
  }
}
const ciaX_ease = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
const ciaX_blink = (t, ph = 0) => ((t + ph) % 3.7) < 0.12;

// ===================================================================
// LIFT: seen from inside the car, looking out through the doors
// ===================================================================
const ciaX_LD = { x: 104, y: 46, w: 112, h: 126 }; // doorway
function ciaX_liftShell() {
  return sprite('ciaX_liftShell', 320, 200, () => {
    // ceiling with a luminous panel
    ciaX_poly([[0, 0], [320, 0], [252, 22], [68, 22]], [P.G1, P.K, 5]);
    ciaX_poly([[40, 3], [280, 3], [236, 17], [84, 17]], P.G3);
    ciaX_poly([[44, 4], [276, 4], [233, 16], [87, 16]], [P.G3, P.W, 12]);
    for (let i = 1; i < 6; i++) { const u = i / 6; line(Math.round(44 + 232 * u), 4, Math.round(87 + 146 * u), 16, P.G3); }
    line(40, 10, 280, 10, P.G3);
    // side walls: walnut panels above, brushed steel below, brass handrail
    const wall = (sx, xe) => { // sx=screen edge x, xe=far edge x
      const top = xx => 22 * (xx - sx) / (xe - sx), bot = xx => 200 - 28 * (xx - sx) / (xe - sx), dir = Math.sign(xe - sx);
      for (let xx = sx; xx !== xe; xx += dir) {
        const t0 = top(xx), b0 = bot(xx), yr = Math.round(t0 + (b0 - t0) * 0.62), yk = Math.round(t0 + (b0 - t0) * 0.86), d = Math.abs(xx - sx);
        const gh = ciaX_hash(xx, 5), streak = gh > 0.78, off = (gh * 40) | 0;
        // walnut veneer: brown, dark grain streaks, a warm sheen under the light panel
        for (let y = Math.round(t0); y < yr; y++) {
          const b = BAYER[(y & 3) * 4 + (xx & 3)], dy = y - t0;
          let c = P.BR;
          if (streak && ((y + off) % 13) < 9) c = P.K;
          else if (dy < 12 && b < 12 - dy) c = P.RD;
          else if (dy > 60 && b < (dy - 60) / 4) c = P.K;
          g.fillStyle = c; g.fillRect(xx, y, 1, 1);
        }
        // brushed steel wainscot
        const sv = ciaX_hash(xx, 9) * 10 + 3;
        for (let y = yr; y < yk; y++) { g.fillStyle = BAYER[(y & 3) * 4 + (xx & 3)] < sv - (y - yr) / 6 ? P.G3 : P.G1; g.fillRect(xx, y, 1, 1); }
        for (let y = yk; y < Math.round(b0); y++) { g.fillStyle = BAYER[(y & 3) * 4 + (xx & 3)] < 3 ? P.G1 : P.K; g.fillRect(xx, y, 1, 1); }
        // panel seams
        if (d === 22 || d === 46) for (let y = Math.round(t0) + 1; y < yr; y++) px(xx, y, P.K);
        if (d === 23 || d === 47) for (let y = Math.round(t0) + 1; y < yr; y++) px(xx, y, P.RD);
        // handrail
        const rr = Math.round(t0 + (b0 - t0) * 0.55);
        px(xx, rr - 1, P.W); px(xx, rr, P.YE); px(xx, rr + 1, P.YE); px(xx, rr + 2, P.BR); px(xx, rr + 3, P.K);
        px(xx, yr, P.K); px(xx, yr + 1, P.W); px(xx, yk, P.K);
      }
      for (const d of [14, 50]) { const xx = sx + dir * d, t0 = top(xx), b0 = bot(xx), rr = Math.round(t0 + (b0 - t0) * 0.55); rect(xx - 1, rr + 3, 3, 6, P.G1); px(xx, rr + 4, P.G3); }
    };
    wall(0, 68); wall(319, 251);
    // floor: rubber tiles, lit near the doors
    ciaX_poly([[0, 200], [68, 172], [252, 172], [320, 200]], [P.K, P.G1, 4]);
    ciaX_poly([[70, 200], [100, 172], [220, 172], [250, 200]], [P.K, P.G1, 8]);
    for (let i = 0; i <= 8; i++) { const u = i / 8; line(Math.round(68 + 184 * u), 172, Math.round(-40 + 400 * u), 200, P.G1); }
    for (const y of [176, 182, 190]) rect(0, y, 320, 1, P.G1);
    ciaX_poly([[0, 200], [68, 172], [70, 172], [3, 200]], P.K); ciaX_poly([[320, 200], [252, 172], [250, 172], [317, 200]], P.K);
    // front wall: brushed steel around the doorway
    const D = ciaX_LD;
    ciaX_steel(68, 22, 184, D.y - 22, 0.05, 9);
    ciaX_steel(68, D.y, D.x - 68, 150 - D.y + 22, 0, 4);
    ciaX_steel(D.x + D.w, D.y, 252 - D.x - D.w, 150 - D.y + 22, 0, 5);
    rect(68, 22, 1, 150, P.K); rect(251, 22, 1, 150, P.K); rect(68, 22, 184, 1, P.K);
    rect(69, 23, 1, 149, P.W); rect(250, 23, 1, 149, P.G1);
    // door jamb
    frame(D.x - 3, D.y - 3, D.w + 6, D.h + 3, P.K); rect(D.x - 2, D.y - 2, D.w + 4, 1, P.G1); rect(D.x - 2, D.y - 2, 1, D.h + 2, P.G1); rect(D.x + D.w + 1, D.y - 2, 1, D.h + 2, P.W);
    rect(D.x - 1, D.y - 1, D.w + 2, 1, P.K); rect(D.x - 1, D.y - 1, 1, D.h + 1, P.K); rect(D.x + D.w, D.y - 1, 1, D.h + 1, P.K);
    // sill with the door track
    ciaX_poly([[D.x - 3, 172], [D.x + D.w + 3, 172], [D.x + D.w + 7, 177], [D.x - 7, 177]], P.G3);
    rect(D.x - 5, 174, D.w + 10, 1, P.K); rect(D.x - 6, 177, D.w + 12, 1, P.K); rect(D.x - 3, 172, D.w + 6, 1, P.W);
    // indicator housing
    rect(122, 26, 76, 16, P.K); frame(121, 25, 78, 18, P.G1); rect(121, 25, 78, 1, P.W);
    // car operating panel
    rect(224, 74, 22, 76, P.K); ciaX_steel(225, 75, 20, 74, 0.25, 2);
    for (const [bx, by] of [[226, 76], [243, 76], [226, 147], [243, 147]]) px(bx, by, P.G1);
    for (let i = 0; i < 4; i++) { const by = 86 + i * 12; ciaX_ell(231, by, 4, 4, P.K); ciaX_ell(231, by, 3, 3, P.G1); px(230, by - 2, P.G3); ciaX_t3('321L'[i], 238, by - 2, P.K); }
    ciaX_ell(231, 136, 4, 4, P.K); ciaX_ell(231, 136, 3, 3, P.RD); px(230, 134, P.RD2); rect(237, 134, 5, 5, P.YE); px(239, 136, P.K);
    rect(229, 142, 12, 3, P.K); rect(230, 143, 10, 1, P.G1);
    // brass inspection plate
    rect(78, 62, 18, 12, P.BR); frame(78, 62, 18, 12, P.K); rect(79, 63, 16, 1, P.YE); ciaX_t3('CIA', 81, 66, P.K);
  });
}
function ciaX_doorPanel(side) {
  const D = ciaX_LD, w = D.w / 2;
  return sprite('ciaX_door' + side, w, D.h, () => {
    ciaX_steel(0, 0, w, D.h, 0.08, side ? 21 : 13);
    // meeting edge rubber and outer shadow
    if (side) { rect(0, 0, 1, D.h, P.K); rect(1, 0, 1, D.h, P.W); rect(w - 2, 0, 2, D.h, P.G1); }
    else { rect(w - 1, 0, 1, D.h, P.K); rect(w - 2, 0, 1, D.h, P.G1); rect(0, 0, 2, D.h, P.G1); }
    // kick plate
    rect(0, D.h - 10, w, 1, P.K); dither(0, D.h - 9, w, 9, P.G1, P.G3, 4);
    // a soft reflection of the ceiling light
    for (let y = 2; y < D.h - 12; y++) { const xr = Math.round((side ? 10 : 30) + y * 0.12); if ((y & 1) === 0) px(xr, y, P.W); }
  });
}
function ciaX_glimpse(floor, x, y, w, h, t) {
  ciaX_clip(x, y, w, h);
  const ax = x + (w - 150) / 2 | 0, ay = y - 30;
  if (floor === 0) ciaLobbyArt(ax, ay, 150, 200, t);
  else if (floor === 1) dataRoomArt(ax, ay, 150, 200, t);
  else if (floor === 2) intelArt(ax, ay, 150, 200, t);
  else cryptoLabArt(ax, ay, 150, 200, t);
  g.restore();
}
// the lift from inside: floor (number, may be fractional while moving), open 0..1, dir -1/0/1 lights an arrow
function liftArt(x, y, w, h, t, floor, open, dir = 0, dest = floor) {
  g.save();
  if (w !== 320 || h !== 200) { g.translate(x, y); g.scale(w / 320, h / 200); x = 0; y = 0; } else g.translate(x, y);
  ciaX_clip(0, 0, 320, 200);
  const D = ciaX_LD, f = clamp(Math.round(floor), 0, 3), o = clamp(open, 0, 1);
  // the landing outside
  if (o > 0) ciaX_glimpse(f, D.x, D.y, D.w, D.h, t); else rect(D.x, D.y, D.w, D.h, P.K);
  // door panels, sliding into the jambs
  const sh = Math.round(ciaX_ease(o) * (D.w / 2 - 2));
  ciaX_clip(D.x, D.y, D.w, D.h);
  g.drawImage(ciaX_doorPanel(0), D.x - sh, D.y); g.drawImage(ciaX_doorPanel(1), D.x + D.w / 2 + sh, D.y);
  if (o > 0 && o < 1) { rect(D.x + D.w / 2 - sh - 1, D.y, 1, D.h, P.K); rect(D.x + D.w / 2 + sh, D.y, 1, D.h, P.K); }
  g.restore();
  g.drawImage(ciaX_liftShell(), 0, 0);
  // indicator: L 1 2 3 in amber, arrows at the sides
  for (let i = 0; i < 4; i++) {
    const lx = 138 + i * 13, on = i === f;
    rect(lx - 1, 28, 9, 12, on ? P.BR : P.K);
    g.save(); g.translate(lx + 1, 29); g.scale(2, 2); ciaX_t3('L123'[i], 0, 0, on ? P.YE : P.G1); g.restore();
  }
  const arrow = (ax, up, lit) => { const c = lit ? P.GR2 : P.G1; for (let k = 0; k < 4; k++) rect(ax - k, up ? 30 + k : 37 - k, 1 + 2 * k, 1, c); rect(ax - 1, up ? 34 : 29, 3, 4, c); };
  const blinkOn = (t * 4 | 0) % 2 === 0;
  arrow(128, true, dir > 0 && blinkOn); arrow(192, false, dir < 0 && blinkOn);
  // lit destination button on the car panel
  const bi = 3 - clamp(Math.round(dest), 0, 3); ciaX_ell(231, 86 + bi * 12, 3, 3, P.YE); px(230, 85 + bi * 12, P.W);
  g.restore(); g.restore();
}
// the ride itself: doors close, indicator steps floor to floor, ding, doors open, then next()
function liftScene(fromFloor, toFloor, next) {
  const n = Math.abs(toFloor - fromFloor), dir = Math.sign(toFloor - fromFloor);
  const tClose0 = 0.15, tClose1 = 0.55, travel = n ? 0.45 + 0.22 * n : 0.25, tArrive = tClose1 + travel, tOpen0 = tArrive + 0.08, tOpen1 = tOpen0 + 0.45, tEnd = tOpen1 + 0.3;
  let done = false, stepsPlayed = 0, flags = {};
  const finish = () => { if (done) return; done = true; next(); };
  const floorAt = t => { if (t < tClose1 || !n) return t < tClose1 ? fromFloor : toFloor; const k = Math.min(n, Math.floor((t - tClose1) / travel * n + 0.5)); return fromFloor + dir * k; };
  return {
    t: 0,
    update(dt) {
      const t = this.t += dt;
      if (!flags.close && t >= tClose0) { flags.close = 1; sfx.noise(0.35, 0.03, 300); }
      if (!flags.shut && t >= tClose1) { flags.shut = 1; sfx.tone(90, 0.08, 'square', 0.05); if (n) sfx.tone(55, travel, 'triangle', 0.05, 25); }
      const k = Math.abs(floorAt(t) - fromFloor);
      while (stepsPlayed < k) { stepsPlayed++; if (stepsPlayed < n) sfx.tone(520, 0.03, 'square', 0.03); }
      if (!flags.ding && t >= tArrive) { flags.ding = 1; sfx.tone(1319, 0.5, 'sine', 0.09); sfx.tone(1047, 0.8, 'sine', 0.08, 0, 0.16); }
      if (!flags.open && t >= tOpen0) { flags.open = 1; sfx.noise(0.35, 0.03, 300); }
      if (t >= tEnd) finish();
    },
    draw() {
      const t = this.t;
      const open = t < tClose0 ? 1 : t < tClose1 ? 1 - (t - tClose0) / (tClose1 - tClose0) : t < tOpen0 ? 0 : Math.min(1, (t - tOpen0) / (tOpen1 - tOpen0));
      const moving = t >= tClose1 && t < tArrive && n > 0;
      // a one-pixel jolt as the car starts and stops
      const jolt = n && ((t > tClose1 + 0.02 && t < tClose1 + 0.08) || (t > tArrive - 0.06 && t < tArrive)) ? 1 : 0;
      rect(0, 0, W, H, P.K);
      liftArt(0, jolt, 320, 200, t, floorAt(t), open, moving ? dir : 0, toFloor);
    },
    onKey() { finish(); }, onTap() { finish(); },
  };
}

// ===================================================================
// shared people parts: string-sprite heads
// ===================================================================
const ciaX_HEAD = {
  contact: [ // fedora, 3/4 left, cigarette
    '.....DDDDDDD....',
    '....DDLLDDDDD...',
    '...DDLDDDDDDDD..',
    '...DDDDDDDDDDD..',
    '...KKKKKKKKKKK..',
    '.DDDDDDDDDDDDDDD',
    'DLLLLDDDDDDDDDD.',
    '...KNNNNNNNKKN..',
    '...rrrrrrrrNKN..',
    '..rKKKrrKKKrNr..',
    '..rWKrrrWKrrNrr.',
    '..rrrrNrrrrrNNr.',
    '..rrrNNrrrrrNr..',
    '...rrrrrrrrN....',
    '...rrKKKRrrN....',
    '....rrrrrrN.....',
    '.....NNNNN......',
  ],
  guard: [
    '..BBBBBBBBB..',
    '.BBBBBYBBBBB.',
    '.BBBBBBBBBBBB',
    'KKKKKKKKKKKK.',
    '.NKKrrrrKKN..',
    '.rrrrrrrrrr..',
    'rrKKKrrKKKrr.',
    'rrWKrrrrWKrr.',
    '.rrrrNrrrrr..',
    '.rrrrNNrrrr..',
    '.rrrrrrrrrr..',
    '..rrRRRRrr...',
    '..NrrrrrrN...',
    '...NNNNNN....',
  ],
  dataman: [
    '..NNNNNNNN...',
    '.NNNYNNNNNN..',
    'NNNNNNNNNNNN.',
    'NNrrrrrrrrNN.',
    'NrrKKrrrKKrN.',
    'rrrWKrrrWKrr.',
    'rrrrrrNrrrrr.',
    '.rrrrrNrrrr..',
    '.rrrrNNrrrr..',
    '.rrrrrrrrrr..',
    '..rrRRRRrr...',
    '..Nrrrrrrr...',
    '...NNNNNN....',
  ],
  woman: [
    '...KKKKKKK....',
    '..KKKKKKKKKK..',
    '.KKKKKKKKKKKK.',
    '.KKKNNNNNNKKK.',
    'KKNNNNNNNNNKK.',
    'KKNKKNNNKKNKK.',
    'KKNWKNNNWKNKK.',
    'KKNNNNRNNNNKK.',
    '.KNNNNRNNNNK..',
    '.KYNNNNNNNNYK.',
    '..KNNRRRRNNK..',
    '...KNNNNNNK...',
    '....NNNNNN....',
  ],
  sam: [
    '....rrrrr....',
    '..rrrrrrrrr..',
    '.LLrrrrrrrLL.',
    '.LrNrrrrrNrL.',
    '.rKKKKrKKKKr.',
    'rrKCKKKKCKKrr',
    'rrKKKrrrKKKrr',
    '.rrrrrNrrrrr.',
    '.rrrrNNNrrrr.',
    '.rrKKKKKKKrr.',
    '.rrrrRRRrrrr.',
    '..rrrrrrrrr..',
    '...NNNNNNN...',
  ],
  redhead: [ // back view, long red hair
    '...RRRRRR...',
    '..RRrRRRRR..',
    '.RRrRRRRRRR.',
    '.RrRRRRRRRRR',
    'rRRRRRRRRRRR',
    '.RRRRRRRRRRR',
    '.RRRRRRRRRR.',
    '.RRRRRRRRRR.',
    '..RRRRRRRRR.',
    '..RRRRRRRR..',
    '...RRRRRRR..',
  ],
  prof: [ // back view, grey hair, 3/4 right
    '...LLLLLL...',
    '..LLWLLLLLL.',
    '.LLWLLLLLLLL',
    '.LLLLLLLLLLL',
    '.LLLDLLLLLrr',
    '.LLLLLLLLLrN',
    '..LLLLLLLLr.',
    '..LDLLLLLrr.',
    '...LLLLrrr..',
    '...rrrrrr...',
  ],
  cryptowoman: [ // 3/4 right, glasses, bun
    '...NNNN......',
    '..NNYNNN.....',
    '...NNNNNNN...',
    '..NNNNNNNNNN.',
    '.NNNNrrrrrrN.',
    '.NNNrrrrrrrN.',
    '.NNrKKKrKKKr.',
    '.NNrKWKKKWKr.',
    '.NNrrKrrrKrr.',
    '..Nrrrrrrrrr.',
    '..rrrrrrNNrr.',
    '...rrrrrrrr..',
    '...rrrRRRr...',
    '....rrrrrr...',
    '.....NNNN....',
  ],
};
function ciaX_head(k, x, y) { ciaX_put('h_' + k, ciaX_HEAD[k], x, y); }

// ===================================================================
// LOBBY
// ===================================================================
function ciaX_seal(cx, cy) {
  ciaX_ell(cx, cy, 19, 19, P.K); ciaX_ell(cx, cy, 18, 18, P.BL); ciaX_ell(cx, cy, 17, 17, P.W); ciaX_ell(cx, cy, 16, 16, P.BL);
  // lettering round the ring
  for (let a = -3.9; a < 0.75; a += 0.16) { const r = 13.6; if (((a * 100) | 0) % 5 === 0) continue; px(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), P.W); px(Math.round(cx + Math.cos(a + 0.05) * (r + 1)), Math.round(cy + Math.sin(a + 0.05) * (r + 1)), P.W); }
  for (let a = 0.9; a < 2.25; a += 0.18) px(Math.round(cx + Math.cos(a) * 13.8), Math.round(cy + Math.sin(a) * 13.8), P.W);
  ciaX_ell(cx, cy, 11, 11, P.W); ciaX_ell(cx, cy, 10, 10, P.BL);
  // shield with the compass rose
  ciaX_poly([[cx - 5, cy - 2], [cx + 6, cy - 2], [cx + 6, cy + 4], [cx + 3, cy + 8], [cx + 0.5, cy + 9], [cx - 2, cy + 8], [cx - 5, cy + 4]], P.W);
  line(cx, cy - 1, cx, cy + 7, P.RD); line(cx - 4, cy + 3, cx + 4, cy + 3, P.RD); line(cx - 3, cy, cx + 3, cy + 6, P.RD); line(cx + 3, cy, cx - 3, cy + 6, P.RD); px(cx, cy + 3, P.W);
  // eagle head
  ciaX_put('eagle', ['..WWW..', '.WWWWWY', 'WWKWWYY', '.WWWW..', '..WW...'], cx - 4, cy - 9);
  ciaX_ell(cx - 7, cy + 1, 1, 3, P.W); ciaX_ell(cx + 8, cy + 1, 1, 3, P.W);
}
function ciaX_flag(x, y) {
  rect(x, y - 4, 1, 82, P.YE); rect(x + 1, y - 4, 1, 82, P.BR); ciaX_ell(x, y - 6, 1, 1, P.YE);
  // hanging flag with folds
  for (let yy = 0; yy < 30; yy++) for (let xx = 0; xx < 10; xx++) {
    const canton = yy < 12 && xx < 5; let c = canton ? P.BL : ((yy >> 1) & 1 ? P.W : P.RD);
    if (canton && (xx + yy) % 3 === 0 && yy % 2 === 0) c = P.W;
    const fold = [0, 1, 0, 0, 2, 2, 0, 1, 0, 2][xx];
    if (fold === 2 && BAYER[(yy & 3) * 4 + (xx & 3)] < 8) c = c === P.W ? P.G3 : c === P.RD ? P.K : P.K;
    px(x + 2 + xx, y + yy + (xx > 7 ? xx - 7 : 0), c);
  }
  for (let k = 0; k < 4; k++) px(x + 2 + k * 2, y + 30 + (k % 2), P.YE);
}
function ciaX_contactFig() {
  return ciaX_fig('contact', 50, 112, () => {
    const cx = 22;
    // trousers and shoes
    ciaX_poly([[cx - 9, 84], [cx - 1, 84], [cx - 2, 104], [cx - 8, 104]], P.G1);
    ciaX_poly([[cx + 1, 84], [cx + 9, 84], [cx + 10, 104], [cx + 3, 104]], P.G1); line(cx + 7, 86, cx + 8, 103, P.K);
    ciaX_poly([[cx - 10, 104], [cx - 1, 104], [cx - 1, 108], [cx - 12, 108]], P.K); rect(cx - 9, 105, 3, 1, P.G1);
    ciaX_poly([[cx + 3, 104], [cx + 11, 104], [cx + 13, 108], [cx + 3, 108]], P.K); rect(cx + 7, 105, 3, 1, P.G1);
    // coat: light gray, a checker half-tone band, then solid shadow on the right
    ciaX_poly([[cx - 14, 25], [cx + 14, 25], [cx + 17, 33], [cx + 17, 62], [cx + 20, 88], [cx - 18, 88], [cx - 15, 62], [cx - 16, 33]], P.G3);
    ciaX_poly([[cx + 6, 25], [cx + 14, 25], [cx + 17, 33], [cx + 17, 62], [cx + 20, 88], [cx + 7, 88], [cx + 4, 60]], [P.G3, P.G1, 8]);
    ciaX_poly([[cx + 10, 25], [cx + 14, 25], [cx + 17, 33], [cx + 17, 62], [cx + 20, 88], [cx + 12, 88], [cx + 9, 60]], P.G1);
    line(cx - 15, 34, cx - 17, 86, P.W);
    // folds and hem
    line(cx - 6, 62, cx - 9, 87, P.G1); line(cx - 1, 68, cx - 2, 87, P.G1); line(cx + 5, 64, cx + 6, 87, P.G1);
    rect(cx - 17, 87, 37, 1, P.G1);
    // shirt, tie, lapels
    ciaX_poly([[cx - 4, 22], [cx + 4, 22], [cx + 1, 38], [cx - 1, 38]], P.W);
    ciaX_poly([[cx - 1, 24], [cx + 1, 24], [cx + 1, 35], [cx, 37], [cx - 1, 35]], P.RD);
    ciaX_poly([[cx - 10, 24], [cx - 4, 22], [cx - 1, 40], [cx - 9, 31]], P.G3); line(cx - 9, 31, cx - 1, 40, P.K); line(cx - 10, 25, cx - 4, 23, P.W);
    ciaX_poly([[cx + 10, 24], [cx + 4, 22], [cx + 1, 40], [cx + 9, 31]], P.G1); line(cx + 9, 31, cx + 1, 40, P.K);
    // raised collar
    ciaX_poly([[cx - 10, 15], [cx - 5, 20], [cx - 6, 25], [cx - 13, 25]], P.G3); line(cx - 10, 15, cx - 13, 24, P.W);
    ciaX_poly([[cx + 10, 15], [cx + 5, 20], [cx + 6, 25], [cx + 13, 25]], P.G1);
    // belt with buckle
    rect(cx - 16, 52, 33, 4, P.G3); rect(cx - 16, 52, 33, 1, P.W); rect(cx - 16, 55, 33, 1, P.K); rect(cx + 8, 52, 9, 4, P.G1); rect(cx - 2, 51, 5, 6, P.K); rect(cx - 1, 52, 3, 4, P.G3);
    for (const [bx, by] of [[-5, 32], [-5, 44], [5, 32], [5, 44], [-5, 62], [5, 62]]) { px(cx + bx, by, P.K); px(cx + bx - 1, by - 1, P.W); }
    line(cx + 1, 40, cx + 2, 88, P.K);
    // left arm, hand in pocket
    ciaX_poly([[cx - 16, 27], [cx - 10, 31], [cx - 9, 50], [cx - 11, 60], [cx - 18, 58], [cx - 19, 40]], P.G3);
    line(cx - 18, 31, cx - 19, 56, P.W); line(cx - 11, 33, cx - 10, 50, P.G1); line(cx - 10, 50, cx - 11, 60, P.K); rect(cx - 17, 60, 7, 1, P.G1);
    // right arm down to the briefcase
    ciaX_poly([[cx + 14, 25], [cx + 19, 31], [cx + 21, 64], [cx + 14, 64], [cx + 13, 36]], P.G1);
    line(cx + 14, 36, cx + 15, 63, P.K); rect(cx + 14, 62, 8, 2, P.G3);
    ciaX_poly([[cx + 14, 64], [cx + 21, 64], [cx + 21, 70], [cx + 15, 70]], P.SK); px(cx + 15, 69, P.BR); px(cx + 18, 69, P.BR); px(cx + 20, 65, P.BR);
    // briefcase
    rect(cx + 12, 68, 2, 4, P.K); rect(cx + 22, 68, 2, 4, P.K);
    ciaX_poly([[cx + 6, 72], [cx + 30, 72], [cx + 30, 90], [cx + 6, 90]], P.BR);
    rect(cx + 6, 72, 24, 1, P.YE); rect(cx + 6, 77, 24, 1, P.K); rect(cx + 6, 89, 24, 1, P.K); rect(cx + 29, 73, 1, 16, P.K);
    rect(cx + 9, 75, 2, 3, P.YE); rect(cx + 25, 75, 2, 3, P.YE); rect(cx + 8, 79, 1, 9, P.RD);
    // neck and head
    rect(cx - 3, 17, 7, 6, P.SK); rect(cx + 2, 17, 2, 6, P.BR);
    ciaX_draw(ciaX_HEAD.contact, cx - 9, 3);
  });
}
function ciaX_guardLayer() {
  return ciaX_fig('guard', 38, 46, () => {
    const cx = 16;
    ciaX_poly([[cx - 13, 21], [cx + 13, 21], [cx + 16, 27], [cx + 16, 46], [cx - 16, 46], [cx - 16, 27]], P.BL);
    ciaX_poly([[cx + 7, 21], [cx + 13, 21], [cx + 16, 27], [cx + 16, 46], [cx + 9, 46]], P.K);
    line(cx + 7, 22, cx + 9, 45, P.BL); rect(cx - 13, 21, 7, 2, P.BL2); rect(cx + 7, 21, 6, 2, P.BL2);
    line(cx - 15, 27, cx - 15, 45, P.BL2);
    ciaX_poly([[cx - 4, 19], [cx + 4, 19], [cx + 1, 30], [cx - 1, 30]], P.CY);
    rect(cx - 1, 21, 2, 9, P.K);
    ciaX_draw(['.YYY.', 'YWYBY', 'YYYYY', '.YNY.', '..Y..'], cx - 11, 26);
    rect(cx + 5, 27, 6, 1, P.BL2); rect(cx + 5, 28, 6, 3, P.BL); rect(cx + 6, 25, 1, 3, P.YE); rect(cx + 8, 25, 1, 3, P.RD);
    for (let y = 33; y < 46; y += 5) px(cx, y, P.YE);
    ciaX_poly([[cx - 16, 27], [cx - 10, 31], [cx - 8, 42], [cx - 16, 42]], P.BL); line(cx - 10, 31, cx - 8, 41, P.K);
    ciaX_poly([[cx + 14, 27], [cx + 18, 33], [cx + 20, 42], [cx + 14, 42]], P.K);
    rect(cx - 10, 41, 7, 4, P.SK); rect(cx + 13, 41, 7, 4, P.SK); px(cx - 5, 44, P.BR); px(cx + 15, 44, P.BR);
    rect(cx - 3, 15, 6, 6, P.SK); rect(cx + 1, 15, 2, 6, P.BR);
    ciaX_draw(ciaX_HEAD.guard, cx - 6, 4);
  });
}
function ciaX_lobbyBG() {
  return sprite('ciaX_lobby', 150, 200, () => {
    // ceiling with coffers and downlights
    rect(0, 0, 150, 24, P.K); dither(0, 11, 150, 12, P.K, P.G1, 5);
    for (let x = 0; x < 150; x += 25) rect(x, 11, 1, 12, P.K);
    for (const lx of [25, 75, 125]) { rect(lx - 4, 20, 9, 2, P.G3); rect(lx - 3, 21, 7, 1, P.W); }
    ciaX_marble(0, 24, 150, 106, 3);
    // light scallops washing the wall
    for (const lx of [25, 75, 125]) for (let yy = 26; yy < 80; yy++) { const hw = Math.round(3 + (yy - 26) * 0.45); ciaX_run(lx - hw, lx + hw, yy, [ciaX_T, P.W, Math.max(0, 11 - ((yy - 26) / 4 | 0))]); }
    rect(0, 24, 150, 1, P.W); rect(0, 25, 150, 1, P.G3); rect(0, 26, 150, 1, P.G1);
    // panel joints
    for (const jx of [49, 99]) { rect(jx, 27, 1, 101, P.G1); rect(jx + 1, 27, 1, 101, P.W); }
    rect(0, 78, 150, 1, P.G1); rect(0, 79, 150, 1, P.W);
    // two lifts
    const lift = (lx, open) => {
      // granite portal
      rect(lx - 5, 40, 42, 90, P.K); dither(lx - 4, 41, 40, 89, P.G1, P.K, 7); frame(lx - 5, 40, 42, 90, P.K);
      for (let k = 0; k < 12; k++) px(lx - 4 + (k * 13) % 40, 42 + (k * 29) % 86, P.G3);
      rect(lx - 1, 46, 34, 1, P.G3); rect(lx - 1, 46, 1, 84, P.G3); rect(lx + 32, 46, 1, 84, P.W);
      // indicator plate
      rect(lx + 6, 42, 20, 3, P.K);
      if (!open) { ciaX_steel(lx, 47, 32, 83, 0.05, lx); rect(lx + 15, 47, 1, 83, P.K); rect(lx + 16, 47, 1, 83, P.G1); rect(lx, 121, 32, 1, P.G1); }
      else {
        // lit car interior
        rect(lx, 47, 32, 83, P.BL); dither(lx, 47, 32, 83, P.BL, P.BL2, 7); dither(lx + 5, 50, 22, 60, P.BL2, P.CY, 4);
        ciaX_poly([[lx, 47], [lx + 5, 50], [lx + 5, 118], [lx, 130]], [P.BL, P.K, 6]); ciaX_poly([[lx + 32, 47], [lx + 27, 50], [lx + 27, 118], [lx + 32, 130]], [P.BL, P.K, 4]);
        rect(lx + 5, 50, 22, 2, P.W); rect(lx + 5, 92, 22, 1, P.YE); ciaX_poly([[lx, 118], [lx + 32, 118], [lx + 32, 130], [lx, 130]], [P.G1, P.K, 6]);
        rect(lx, 47, 1, 83, P.G3); rect(lx + 31, 47, 1, 83, P.G3);
      }
    };
    lift(8, false); lift(106, true);
    // seal and flags
    ciaX_seal(74, 58);
    ciaX_flag(51, 50); ciaX_flag(92, 50);
    rect(56, 90, 36, 10, P.BR); frame(56, 90, 36, 10, P.K); rect(57, 91, 34, 1, P.YE); ciaX_t3('LANGLEY', 59, 93, P.K);
    // skirting
    rect(0, 128, 150, 2, P.K); rect(0, 130, 150, 1, P.G1);
    // polished stone floor in perspective with reflections
    const vy = 58, vx = 74;
    const rows = [131, 135, 141, 150, 163, 181, 206];
    for (let r = 0; r + 1 < rows.length; r++) {
      const y0 = rows[r], y1 = rows[r + 1];
      for (let c = -9; c <= 9; c++) {
        const xa0 = vx + (c * 22) * (y0 - vy) / 142, xb0 = vx + ((c + 1) * 22) * (y0 - vy) / 142, xa1 = vx + (c * 22) * (y1 - vy) / 142, xb1 = vx + ((c + 1) * 22) * (y1 - vy) / 142;
        ciaX_poly([[xa0, y0], [xb0, y0], [xb1, y1], [xa1, y1]], (r + c) & 1 ? [P.G1, P.K, 8] : P.G1);
      }
    }
    // reflections of the lifts and the light
    for (const [rx, rw] of [[8, 32], [106, 32]]) for (let yy = 131; yy < 168; yy++) ciaX_run(rx, rx + rw - 1, yy, [ciaX_T, P.G3, Math.max(0, 6 - ((yy - 131) / 5 | 0))]);
    for (let yy = 131; yy < 160; yy++) ciaX_run(108, 136, yy, [ciaX_T, P.BL2, Math.max(0, 5 - ((yy - 131) / 6 | 0))]);
    // a soft pool of light where the contact stands
    for (let yy = 150; yy < 196; yy++) ciaX_run(60, 140, yy, [ciaX_T, P.G3, 2]);
    // security desk (foreground left)
    const gl = ciaX_guardLayer(); g.drawImage(gl, 2, 104);
    ciaX_poly([[0, 146], [46, 146], [50, 152], [0, 152]], P.G3); rect(0, 146, 47, 1, P.W); rect(0, 151, 50, 1, P.G1);
    rect(0, 152, 50, 44, P.BR);
    for (let xx = 0; xx < 50; xx++) for (let yy = 152; yy < 196; yy++) if (ciaX_hash(xx, yy >> 2) > 0.8 || BAYER[(yy & 3) * 4 + (xx & 3)] < 3) px(xx, yy, ciaX_hash(xx + 3, yy) > 0.5 ? P.K : P.RD);
    for (const px_ of [16, 33]) { rect(px_, 153, 1, 43, P.K); rect(px_ + 1, 153, 1, 43, P.RD); }
    rect(49, 152, 1, 44, P.K); rect(0, 195, 50, 1, P.K); rect(0, 196, 50, 4, P.K);
    rect(4, 164, 38, 9, P.K); rect(5, 165, 36, 7, P.YE); rect(5, 165, 36, 1, P.W); ciaX_t3('SECURITY', 7, 166, P.K);
    // CCTV monitor on the desk
    rect(28, 128, 18, 18, P.K); rect(29, 129, 16, 15, P.G3); rect(29, 129, 16, 1, P.W); rect(44, 129, 1, 15, P.G1); rect(32, 144, 10, 2, P.G1);
    // green banker's lamp and sign-in book
    rect(7, 144, 6, 2, P.YE); rect(9, 139, 2, 5, P.YE); ciaX_poly([[4, 135], [16, 135], [18, 140], [2, 140]], P.GR); rect(4, 135, 12, 1, P.GR2); rect(3, 140, 15, 1, P.YE);
    ciaX_poly([[16, 146], [26, 146], [27, 149], [15, 149]], P.W); line(21, 146, 21, 149, P.G1);
    // the contact, just out of the lift
    g.drawImage(ciaX_contactFig(), 94, 84);
  });
}
function ciaLobbyArt(x, y, w, h, t) {
  ciaX_clip(x, y, w, h);
  g.drawImage(ciaX_lobbyBG(), x, y);
  // lift indicators: the left car wanders, the right one waits at L
  const lf = [0, 1, 2, 3, 3, 2, 1, 0][(t / 1.1 | 0) % 8];
  for (let i = 0; i < 4; i++) { px(x + 16 + i * 4, y + 43, i === lf ? P.YE : P.BR); px(x + 114 + i * 4, y + 43, i === 0 ? P.YE : P.BR); }
  // CCTV: rolling picture of a corridor
  const mx = x + 30, my = y + 130;
  rect(mx, my, 14, 12, P.K); dither(mx, my, 14, 12, P.K, P.TL, 4); rect(mx + 5, my + 2, 4, 8, P.K); rect(mx + 2, my + 9, 10, 1, P.TL);
  const scan = (t * 14 | 0) % 12; rect(mx, my + scan, 14, 1, P.CY);
  if ((t * 0.5 | 0) % 2) { rect(mx + 6, my + 4, 2, 5, P.CY); }
  // guard blinks and glances at the monitor
  const gx = x + 12, gy = y + 108 + 7;
  if (ciaX_blink(t, 1.3)) { rect(gx + 2, gy, 2, 1, P.SK); rect(gx + 8, gy, 2, 1, P.SK); }
  else if ((t % 6) > 4) { px(gx + 2, gy, P.K); px(gx + 3, gy, P.W); px(gx + 8, gy, P.K); px(gx + 9, gy, P.W); }
  // contact blinks; cigarette glow and drifting smoke
  const hx = x + 107, hy = y + 87;
  if (ciaX_blink(t)) { rect(hx + 3, hy + 10, 2, 1, P.SK); rect(hx + 8, hy + 10, 2, 1, P.SK); }
  px(hx + 2, hy + 14, P.W); px(hx + 1, hy + 14, P.W); px(hx, hy + 14, (t * 3 | 0) % 3 ? P.RD2 : P.YE);
  for (let k = 0; k < 7; k++) {
    const ph = (t * 0.5 + k / 7) % 1, sy = hy + 12 - ph * 30, sx = hx + Math.sin(ph * 8 + k * 0.3) * (1 + ph * 3);
    if (sy > y + 12) px(sx, sy, ph < 0.45 ? P.W : P.G3);
  }
  g.restore();
}

// ===================================================================
// DATA SECTION
// ===================================================================
function ciaX_worldMap(w, h) {
  return sprite('ciaX_wmap' + w + 'x' + h, w, h, () => {
    rect(0, 0, w, h, P.BL);
    for (let gx = 0; gx < w; gx += 8) for (let gy = 0; gy < h; gy += 2) px(gx, gy, P.BL2);
    for (let gy = 0; gy < h; gy += 8) for (let gx = 0; gx < w; gx += 2) px(gx, gy, P.BL2);
    const pr = (lo, la) => [(lo + 170) / 360 * w, (80 - la) / 140 * h];
    for (const pl of LAND) ciaX_poly(pl.map(([lo, la]) => pr(lo, la)), P.TL);
    // light coastline on the lit side
    const d = g.getImageData(0, 0, w, h).data;
    for (let y = 1; y < h; y++) for (let x = 1; x < w; x++) { const i = (y * w + x) * 4; const land = d[i + 1] === 0xAA && d[i + 2] === 0xAA && d[i] === 0; const up = (i2 => d[i2] === 0 && d[i2 + 1] === 0xAA && d[i2 + 2] === 0xAA)(((y - 1) * w + x) * 4); if (land && !up) px(x, y, P.CY); }
  });
}
function ciaX_datamanFig() {
  return ciaX_fig('dataman', 52, 60, () => {
    const cx = 24;
    // chair back
    ciaX_poly([[cx - 16, 14], [cx + 16, 14], [cx + 17, 50], [cx - 17, 50]], P.G1); rect(cx - 15, 14, 30, 1, P.G3); line(cx - 16, 15, cx - 17, 49, P.G3);
    // shirt with a shaded right side
    ciaX_poly([[cx - 13, 24], [cx + 13, 24], [cx + 15, 31], [cx + 15, 60], [cx - 15, 60], [cx - 15, 31]], P.W);
    ciaX_poly([[cx + 7, 24], [cx + 13, 24], [cx + 15, 31], [cx + 15, 60], [cx + 8, 60]], P.G3);
    line(cx - 8, 36, cx - 6, 57, P.G3); line(cx + 4, 32, cx + 3, 58, P.G3);
    ciaX_poly([[cx - 1, 22], [cx + 2, 22], [cx + 2, 42], [cx, 45], [cx - 1, 42]], P.BL); px(cx, 24, P.BL2); px(cx, 30, P.BL2);
    ciaX_poly([[cx - 5, 21], [cx - 1, 22], [cx - 3, 26]], P.W); ciaX_poly([[cx + 6, 21], [cx + 2, 22], [cx + 4, 26]], P.G3);
    // left arm: elbow out, handset at the ear
    ciaX_poly([[cx + 12, 25], [cx + 18, 30], [cx + 21, 44], [cx + 15, 46], [cx + 11, 34]], P.G3);
    ciaX_poly([[cx + 15, 46], [cx + 21, 44], [cx + 15, 21], [cx + 10, 21]], P.W); line(cx + 10, 22, cx + 15, 45, P.K); line(cx + 20, 43, cx + 15, 23, P.G3);
    rect(cx + 9, 16, 6, 6, P.SK); px(cx + 9, 19, P.BR); px(cx + 14, 17, P.BR);
    ciaX_poly([[cx + 5, 8], [cx + 9, 6], [cx + 13, 19], [cx + 11, 25], [cx + 7, 23], [cx + 9, 19]], P.RD); line(cx + 9, 7, cx + 12, 18, P.RD2);
    // right forearm down on the desk
    ciaX_poly([[cx - 15, 30], [cx - 9, 34], [cx - 8, 58], [cx - 15, 60]], P.W); line(cx - 9, 36, cx - 8, 57, P.G3);
    rect(cx - 3, 19, 7, 5, P.SK); rect(cx + 2, 19, 2, 5, P.BR);
    ciaX_draw(ciaX_HEAD.dataman, cx - 6, 8);
  });
}
function ciaX_womanFig() {
  return ciaX_fig('dwoman', 40, 118, () => {
    const cx = 20;
    rect(cx - 6, 90, 4, 19, P.BR); rect(cx + 2, 90, 4, 19, P.BR); rect(cx + 4, 90, 2, 19, P.K); rect(cx - 6, 90, 1, 19, P.RD);
    rect(cx - 7, 108, 6, 3, P.K); rect(cx + 1, 108, 6, 3, P.K); px(cx - 6, 108, P.RD); px(cx + 2, 108, P.RD);
    // dress
    ciaX_poly([[cx - 10, 20], [cx + 10, 20], [cx + 12, 28], [cx + 10, 46], [cx + 14, 92], [cx - 14, 92], [cx - 10, 46], [cx - 12, 28]], P.GR);
    ciaX_poly([[cx + 5, 20], [cx + 10, 20], [cx + 12, 28], [cx + 10, 46], [cx + 14, 92], [cx + 6, 92], [cx + 4, 50]], P.K);
    ciaX_poly([[cx + 3, 46], [cx + 5, 46], [cx + 7, 92], [cx + 4, 92]], [P.GR, P.K, 8]);
    line(cx - 11, 30, cx - 9, 46, P.GR2); line(cx - 10, 48, cx - 13, 90, P.GR2);
    rect(cx - 10, 45, 20, 2, P.GR2); rect(cx - 10, 47, 20, 1, P.K);
    line(cx - 3, 52, cx - 5, 90, P.K); line(cx + 1, 55, cx + 1, 90, P.K);
    ciaX_poly([[cx - 4, 18], [cx + 4, 18], [cx, 26]], P.BR);
    // arms cradling the folders
    ciaX_poly([[cx - 12, 22], [cx - 7, 24], [cx - 6, 40], [cx - 13, 42]], P.GR); line(cx - 12, 24, cx - 13, 40, P.GR2);
    ciaX_poly([[cx + 10, 22], [cx + 13, 28], [cx + 12, 42], [cx + 6, 42]], P.K);
    ciaX_poly([[cx - 10, 30], [cx + 9, 26], [cx + 12, 40], [cx - 7, 44]], P.YE);
    ciaX_poly([[cx - 9, 36], [cx + 10, 32], [cx + 12, 40], [cx - 7, 44]], P.BR);
    line(cx - 10, 30, cx + 9, 26, P.W); line(cx - 9, 34, cx + 10, 30, P.YE); line(cx - 9, 35, cx + 10, 31, P.K); line(cx - 8, 39, cx + 11, 35, P.YE);
    rect(cx - 13, 38, 6, 5, P.BR); rect(cx + 7, 36, 5, 5, P.BR); px(cx - 12, 38, P.RD); px(cx + 8, 36, P.RD);
    rect(cx - 3, 12, 6, 8, P.BR); rect(cx + 1, 12, 2, 8, P.K);
    ciaX_draw(ciaX_HEAD.woman, cx - 7, 2);
  });
}
function ciaX_dataBG() {
  return sprite('ciaX_data', 150, 200, () => {
    rect(0, 0, 150, 200, P.K); dither(0, 11, 150, 120, P.K, P.G1, 4);
    for (let x = 0; x < 150; x += 30) rect(x, 11, 1, 120, P.K);
    // clocks
    const labels = ['D.C.', 'LON', 'TOK'];
    for (let i = 0; i < 3; i++) { const bx = 44 + i * 36; ciaX_t3(labels[i], bx + 12 - labels[i].length * 2, 13, P.W); rect(bx, 19, 25, 9, P.K); rect(bx + 1, 20, 23, 7, P.YE); }
    // map wall
    rect(38, 30, 112, 70, P.K); bevel(39, 31, 110, 68, P.G3, P.W, P.G1);
    g.drawImage(ciaX_worldMap(104, 62), 42, 34);
    frame(41, 33, 106, 64, P.K);
    // left monitor stack
    for (let i = 0; i < 3; i++) { const my = 13 + i * 26; rect(2, my, 32, 24, P.K); bevel(3, my + 1, 30, 22, P.G3, P.W, P.G1); rect(6, my + 4, 24, 15, P.K); rect(26, my + 20, 3, 1, P.GR2); }
    // console behind the man
    ciaX_poly([[0, 108], [150, 108], [150, 128], [0, 128]], [P.G1, P.K, 6]);
    rect(0, 108, 150, 1, P.G3); for (let k = 0; k < 14; k++) { px(6 + k * 10, 114, k % 3 ? P.GR : P.RD); px(8 + k * 10, 114, P.G3); }
    rect(0, 127, 150, 1, P.K);
    // teletype
    rect(2, 100, 28, 30, P.K); rect(3, 101, 26, 28, P.G3); rect(3, 101, 26, 1, P.W); dither(3, 118, 26, 11, P.G3, P.G1, 5); rect(6, 104, 20, 4, P.K);
    for (let k = 0; k < 5; k++) rect(5 + k * 5, 112, 3, 2, P.G1);
    // the man on the phone
    g.drawImage(ciaX_datamanFig(), 36, 96);
    // foreground desk
    rect(0, 150, 112, 50, P.K); ciaX_poly([[0, 150], [112, 150], [116, 156], [0, 156]], P.G3); rect(0, 150, 112, 1, P.W); rect(0, 156, 116, 1, P.K);
    rect(0, 157, 116, 43, P.BR); for (let yy = 184; yy < 200; yy++) ciaX_run(0, 115, yy, [P.BR, P.K, (yy - 184) >> 1]);
    rect(0, 157, 116, 1, P.RD); for (const px_ of [4, 56, 108]) { rect(px_, 161, 1, 39, P.K); rect(px_ + 1, 161, 1, 39, P.RD); } rect(4, 161, 105, 1, P.K); rect(115, 157, 1, 43, P.K);
    // desk top clutter: notepad, phone base, mug, papers
    ciaX_poly([[30, 146], [48, 146], [50, 152], [28, 152]], P.W); for (let k = 0; k < 3; k++) line(31, 147 + k * 2, 47, 147 + k * 2, P.BL2);
    rect(64, 144, 14, 6, P.RD); rect(66, 142, 10, 3, P.RD); rect(66, 142, 10, 1, P.RD2); rect(69, 146, 4, 2, P.K);
    line(72, 144, 72, 132, P.K);
    rect(88, 142, 6, 8, P.W); rect(93, 144, 2, 3, P.W); rect(88, 142, 6, 1, P.BR); px(89, 144, P.BL);
    ciaX_poly([[4, 147], [22, 145], [24, 151], [6, 152]], P.W); ciaX_poly([[8, 146], [24, 146], [23, 150], [9, 151]], P.G3);
    // standing woman
    g.drawImage(ciaX_womanFig(), 108, 76);
  });
}
function dataRoomArt(x, y, w, h, t) {
  ciaX_clip(x, y, w, h);
  g.drawImage(ciaX_dataBG(), x, y);
  // live clocks
  const base = game.startDate ? hourOf(game.t || 0) * 60 + dateOf(game.t || 0).getMinutes() : 600;
  [0, 5 * 60, 14 * 60].forEach((off, i) => { const m = (base + off) % 1440, s = String((m / 60 | 0) % 12 || 12).padStart(2, ' ') + ((t * 2 | 0) % 2 ? ':' : ' ') + String(m % 60).padStart(2, '0'); ciaX_t3(s, x + 45 + i * 36 + 2, y + 21, P.K); });
  // incidents blinking on the map
  const spots = [[-77, 39], [0, 51], [37, 55], [31, 30], [116, 40], [-43, -22], [18, 59]];
  spots.forEach(([lo, la], i) => { const sx = x + 42 + (lo + 170) / 360 * 104 | 0, sy = y + 34 + (80 - la) / 140 * 62 | 0, on = ((t * 2 + i * 0.7) | 0) % 3; if (on) { rect(sx - 1, sy - 1, 3, 3, i === 0 ? P.YE : P.RD2); px(sx, sy, P.W); } });
  const tg = spots[(t / 2.5 | 0) % spots.length], tx = x + 42 + (tg[0] + 170) / 360 * 104 | 0, ty = y + 34 + (80 - tg[1]) / 140 * 62 | 0;
  if ((t * 4 | 0) % 2) { frame(tx - 4, ty - 4, 9, 9, P.YE); } rect(x + 42, ty, 104, 1, P.BL2); rect(tx, y + 34, 1, 62, P.BL2); if ((t * 4 | 0) % 2) frame(tx - 4, ty - 4, 9, 9, P.YE);
  // monitors: mugshot, radar, scrolling text
  const m1 = y + 17; rect(x + 6, m1, 24, 15, P.BL); const face = (t / 3 | 0) % 3;
  rect(x + 14, m1 + 3, 8, 8, [P.SK, P.BR, P.SK][face]); rect(x + 13, m1 + 2, 10, 3, [P.K, P.K, P.YE][face]); rect(x + 11, m1 + 11, 14, 4, [P.G1, P.BL2, P.RD][face]); px(x + 16, m1 + 6, P.K); px(x + 19, m1 + 6, P.K); rect(x + 16, m1 + 9, 4, 1, P.RD);
  if ((t * 8 | 0) % 7 === 0) rect(x + 6, m1 + ((t * 30) | 0) % 15, 24, 1, P.CY);
  const m2 = y + 43; rect(x + 6, m2, 24, 15, P.K); for (let r = 2; r < 8; r += 3) ciaX_ring(x + 18, m2 + 7, r, P.GR, 0.3);
  const a = t * 3; line(x + 18, m2 + 7, x + 18 + Math.round(Math.cos(a) * 7), m2 + 7 + Math.round(Math.sin(a) * 7), P.GR2); if ((a % 6.28) > 3) px(x + 22, m2 + 4, P.GR2);
  const m3 = y + 69; rect(x + 6, m3, 24, 15, P.K); const off = (t * 3 | 0);
  for (let r = 0; r < 3; r++) ciaX_t3(['AGT', 'OK?', 'MSG', 'CEL', 'RDV', 'NEG'][(off + r) % 6] + ((off + r) % 10), x + 7, m3 + r * 5, P.GR2);
  // teletype chattering
  const tt = (t * 6 | 0);
  for (let k = 0; k < 5; k++) rect(x + 5 + k * 5, y + 112 - ((tt + k) % 3 === 0 ? 1 : 0), 3, 2, P.G1);
  rect(x + 7, y + 91, 18, 13, P.W); for (let r = 0; r < 4; r++) rect(x + 9, y + 92 + r * 3 - (tt % 3 === 0 ? 1 : 0), 4 + ((tt + r * 5) % 11), 1, P.G1);
  // the man writes; the woman blinks
  const wx = x + 34 + ((t * 5 | 0) % 4), wy = y + 148 + ((t * 5 | 0) % 2);
  rect(wx, wy - 3, 5, 4, P.SK); line(wx + 4, wy - 3, wx + 7, wy - 7, P.K);
  if (ciaX_blink(t, 0.4)) { rect(x + 124, y + 84, 2, 1, P.BR); rect(x + 129, y + 84, 2, 1, P.BR); }
  if (ciaX_blink(t, 2.1)) { rect(x + 57, y + 109, 2, 1, P.SK); rect(x + 62, y + 109, 2, 1, P.SK); }
  g.restore();
}

// ===================================================================
// INTELLIGENCE SECTION: tape drives and Sam's situation table
// ===================================================================
function ciaX_tableProj(u, v) { // u,v 0..1 on the table top -> local coords
  const vv = v * v * 0.35 + v * 0.65, y = 124 + vv * 42, xl = 26 - vv * 26, xr = 124 + vv * 26;
  return [xl + (xr - xl) * u, y];
}
function ciaX_samFig() { // Sam from the waist up; his hands are drawn on the table afterwards
  return ciaX_fig('sam', 56, 60, () => {
    const cx = 26;
    ciaX_poly([[cx - 14, 20], [cx + 14, 20], [cx + 16, 28], [cx + 16, 60], [cx - 16, 60], [cx - 16, 28]], P.W);
    ciaX_poly([[cx + 7, 20], [cx + 14, 20], [cx + 16, 28], [cx + 16, 60], [cx + 8, 60]], P.G3);
    line(cx - 7, 30, cx - 9, 58, P.G3); line(cx + 4, 34, cx + 5, 58, P.G3);
    rect(cx - 8, 20, 2, 40, P.RD); rect(cx + 7, 20, 2, 40, P.RD);
    ciaX_poly([[cx - 2, 20], [cx + 2, 20], [cx + 3, 40], [cx, 44], [cx - 2, 40]], P.BL); line(cx - 1, 24, cx + 1, 38, P.BL2);
    ciaX_poly([[cx - 5, 17], [cx - 1, 20], [cx - 3, 23]], P.W); ciaX_poly([[cx + 5, 17], [cx + 1, 20], [cx + 3, 23]], P.G3);
    rect(cx + 9, 27, 5, 5, P.G1); rect(cx + 10, 25, 1, 3, P.BL); rect(cx + 12, 25, 1, 3, P.RD);
    // arms reaching down to the table
    ciaX_poly([[cx - 14, 22], [cx - 20, 34], [cx - 23, 60], [cx - 15, 60], [cx - 12, 36]], P.W); line(cx - 13, 36, cx - 15, 59, P.G3);
    rect(cx - 23, 48, 9, 3, P.G3); rect(cx - 23, 51, 9, 1, P.K);
    ciaX_poly([[cx - 22, 52], [cx - 15, 52], [cx - 15, 60], [cx - 22, 60]], P.SK); line(cx - 16, 52, cx - 16, 60, P.BR);
    ciaX_poly([[cx + 13, 22], [cx + 20, 30], [cx + 24, 46], [cx + 17, 48], [cx + 13, 34]], P.G3); line(cx + 14, 34, cx + 17, 47, P.G1);
    rect(cx + 16, 44, 9, 3, P.W); rect(cx + 16, 47, 9, 1, P.K);
    rect(cx - 3, 13, 7, 7, P.SK); rect(cx + 2, 13, 2, 7, P.BR);
    ciaX_draw(ciaX_HEAD.sam, cx - 6, 4);
  });
}
function ciaX_analystFig() { // red-haired analyst seen from behind, leaning on the near edge
  return ciaX_fig('analyst', 36, 84, () => {
    const cx = 17;
    ciaX_poly([[cx - 11, 14], [cx + 11, 14], [cx + 14, 22], [cx + 12, 50], [cx - 12, 50], [cx - 14, 22]], P.BL2);
    ciaX_poly([[cx + 5, 14], [cx + 11, 14], [cx + 14, 22], [cx + 12, 50], [cx + 6, 50]], P.BL);
    line(cx - 1, 22, cx, 48, P.BL); line(cx - 12, 24, cx - 11, 48, P.W);
    ciaX_poly([[cx - 12, 50], [cx + 12, 50], [cx + 14, 84], [cx - 14, 84]], P.G1); line(cx, 52, cx, 84, P.K); ciaX_poly([[cx + 6, 50], [cx + 12, 50], [cx + 14, 84], [cx + 8, 84]], P.K);
    rect(cx - 12, 49, 24, 2, P.K);
    ciaX_poly([[cx - 14, 22], [cx - 18, 36], [cx - 16, 46], [cx - 11, 44], [cx - 11, 30]], P.BL2); line(cx - 11, 30, cx - 11, 44, P.BL);
    ciaX_poly([[cx + 14, 22], [cx + 18, 36], [cx + 16, 46], [cx + 11, 44], [cx + 11, 30]], P.BL);
    rect(cx - 18, 44, 6, 4, P.SK); rect(cx + 12, 44, 6, 4, P.SK);
    ciaX_draw(ciaX_HEAD.redhead, cx - 6, 3);
  });
}
function ciaX_intelBG() {
  return sprite('ciaX_intel', 150, 200, () => {
    rect(0, 0, 150, 200, P.K); dither(0, 11, 150, 110, P.G1, P.K, 9);
    // reel-to-reel tape drives along the back wall
    for (let i = 0; i < 4; i++) {
      const bx = 3 + i * 37;
      rect(bx, 16, 34, 92, P.K); rect(bx + 1, 17, 32, 90, P.G3); rect(bx + 1, 17, 32, 1, P.W); rect(bx + 1, 17, 1, 90, P.W); rect(bx + 32, 17, 1, 90, P.G1);
      rect(bx + 3, 20, 28, 42, P.K); rect(bx + 4, 21, 26, 40, P.BL); dither(bx + 4, 21, 26, 40, P.BL, P.K, 8);
      rect(bx + 3, 66, 28, 8, P.G1); for (let k = 0; k < 7; k++) px(bx + 5 + k * 4, 68, P.K);
      for (let k = 0; k < 6; k++) rect(bx + 4, 80 + k * 4, 26, 1, P.G1);
      rect(bx + 1, 104, 32, 3, P.G1);
    }
    // ceiling lamp and its pool of light on the table
    rect(74, 11, 1, 16, P.G1); ciaX_poly([[66, 30], [84, 30], [80, 26], [70, 26]], P.GR); rect(66, 30, 18, 1, P.GR2); rect(70, 31, 10, 1, P.YE);
    // floor
    rect(0, 120, 150, 80, P.K); dither(0, 150, 150, 50, P.K, P.G1, 3);
    // Sam behind the table
    g.drawImage(ciaX_samFig(), 50, 68);
    // situation table
    const pt = (u, v) => ciaX_tableProj(u, v);
    ciaX_poly([pt(0, 0), pt(1, 0), pt(1, 1), pt(0, 1)], P.BL);
    for (let v = 0; v <= 1.001; v += 0.125) { const a = pt(0, v), b = pt(1, v); line(a[0], a[1], b[0], b[1], P.BL2); }
    for (let u = 0; u <= 1.001; u += 0.1) { const a = pt(u, 0), b = pt(u, 1); line(a[0], a[1], b[0], b[1], P.BL2); }
    // Europe and the Middle East laid out on the table
    const L0 = -14, L1 = 62, A0 = 66, A1 = 20;
    for (const pl of LAND) {
      const pp = pl.map(([lo, la]) => pt(clamp((lo - L0) / (L1 - L0), -0.2, 1.2), clamp((A0 - la) / (A0 - A1), -0.2, 1.2)));
      ciaX_poly(pp, P.GR);
    }
    for (let v = 0; v <= 1.001; v += 0.25) { const a = pt(0, v), b = pt(1, v); for (let k = 0; k <= 40; k += 2) px(a[0] + (b[0] - a[0]) * k / 40, a[1] + (b[1] - a[1]) * k / 40, P.GR2); }
    // trim the overspill beyond the table edges
    ciaX_poly([[0, 116], [150, 116], [150, 124], [0, 124]], [P.G1, P.K, 9]);
    ciaX_poly([[0, 124], [26, 124], [0, 166]], P.K); ciaX_poly([[124, 124], [150, 124], [150, 166]], P.K);
    // table rim and body
    const a = pt(0, 0), b = pt(1, 0), c = pt(1, 1), d = pt(0, 1);
    line(a[0], a[1], b[0], b[1], P.G3); line(a[0] - 1, a[1], d[0] - 1, d[1], P.G3); line(b[0], b[1], c[0], c[1], P.G1);
    ciaX_poly([[d[0], d[1]], [c[0], c[1]], [c[0], c[1] + 3], [d[0], d[1] + 3]], P.W);
    ciaX_poly([[0, d[1] + 3], [150, c[1] + 3], [150, 200], [0, 200]], P.G1); for (let yy = 184; yy < 200; yy++) ciaX_run(0, 149, yy, [P.G1, P.K, (yy - 184)]);
    rect(0, d[1] + 3, 150, 1, P.G3); rect(0, d[1] + 4, 150, 1, P.K);
    for (let k = 0; k < 10; k++) rect(8 + k * 14, d[1] + 10, 8, 2, P.K);
    // brass name plate
    rect(60, 180, 30, 9, P.K); rect(61, 181, 28, 7, P.YE); rect(61, 181, 28, 1, P.W); ciaX_t3('SAM', 69, 182, P.K);
    // red-haired analyst leaning in from the left, back to us
    g.drawImage(ciaX_analystFig(), 0, 118);
  });
}
function intelArt(x, y, w, h, t) {
  ciaX_clip(x, y, w, h);
  g.drawImage(ciaX_intelBG(), x, y);
  // spinning reels and blinking lamps
  for (let i = 0; i < 4; i++) {
    const bx = x + 3 + i * 37, run = ((t * 0.7 + i * 0.37) % 3) < 2.1, sp = run ? (i % 2 ? 4 : -5) : 0;
    for (const [rx, ry, ph] of [[bx + 11, y + 32, 0], [bx + 23, y + 48, 1]]) {
      ciaX_ell(rx, ry, 7, 7, P.G3); ciaX_ell(rx, ry, 6, 6, P.BR); ciaX_ell(rx, ry, 4, 4, P.K); ciaX_ell(rx, ry, 2, 2, P.W);
      for (let s = 0; s < 3; s++) { const an = t * sp + s * 2.094 + ph; px(rx + Math.round(Math.cos(an) * 5), ry + Math.round(Math.sin(an) * 5), P.W); px(rx + Math.round(Math.cos(an) * 3), ry + Math.round(Math.sin(an) * 3), P.G3); }
    }
    line(bx + 11, y + 39, bx + 23, y + 41, P.BR);
    for (let k = 0; k < 7; k++) { const on = ciaX_hash(k + i * 7, (t * 5 | 0)) > 0.55; px(bx + 5 + k * 4, y + 68, on ? [P.RD2, P.GR2, P.YE][k % 3] : P.K); }
  }
  // markers on the table; Sam's pointer walks between them
  const marks = [[0.3, 0.3, P.RD2], [0.55, 0.45, P.RD], [0.72, 0.62, P.YE], [0.4, 0.75, P.W], [0.85, 0.3, P.RD2], [0.15, 0.6, P.YE]];
  marks.forEach(([u, v, c], i) => { const [mx, my] = ciaX_tableProj(u, v); rect(x + mx - 1, y + my - 1, 3, 2, (i === 1 && (t * 3 | 0) % 2) ? P.W : c); px(x + mx - 1, y + my - 2, P.K); });
  const [ax, ay] = ciaX_tableProj(0.55, 0.45), [bx2, by2] = ciaX_tableProj(0.72, 0.62);
  for (let k = 0; k < 8; k++) { const f = k / 8; if (((t * 4 | 0) + k) % 4) px(x + ax + (bx2 - ax) * f, y + ay + (by2 - ay) * f, P.RD2); }
  const tgt = marks[(t / 1.8 | 0) % 3 + 1], [tx, ty] = ciaX_tableProj(tgt[0], tgt[1]);
  const hx = x + 98, hy = y + 121;
  ciaX_poly([[x + 92, y + 114], [x + 101, y + 114], [hx + 3, hy], [hx - 3, hy]], P.SK); line(x + 92, y + 114, hx - 3, hy, P.K); line(x + 101, y + 114, hx + 3, hy, P.K);
  line(hx, hy, x + tx, y + ty - 2, P.BR); px(x + tx, y + ty - 2, P.W);
  rect(hx - 3, hy - 1, 7, 5, P.SK); frame(hx - 4, hy - 2, 9, 7, P.K); px(hx - 2, hy + 2, P.BR);
  // his other hand flat on the table
  rect(x + 51, y + 120, 10, 6, P.K); rect(x + 52, y + 121, 8, 4, P.SK); px(x + 54, y + 124, P.BR); px(x + 57, y + 124, P.BR);
  if (ciaX_blink(t, 0.9)) { px(x + 73, y + 77, P.K); px(x + 78, y + 77, P.K); }
  g.restore();
}

// ===================================================================
// CRYPTO BRANCH: blackboard, cipher machine, terminal
// ===================================================================
function ciaX_profFig() { // lab coat, seen from behind writing on the board
  return ciaX_fig('prof', 40, 92, () => {
    const cx = 18;
    rect(cx - 7, 72, 5, 16, P.G1); rect(cx + 2, 72, 5, 16, P.G1); rect(cx + 5, 72, 2, 16, P.K); rect(cx - 8, 87, 7, 3, P.K); rect(cx + 2, 87, 7, 3, P.K);
    ciaX_poly([[cx - 10, 17], [cx + 10, 17], [cx + 13, 25], [cx + 13, 48], [cx + 15, 74], [cx - 15, 74], [cx - 13, 48], [cx - 13, 25]], P.W);
    ciaX_poly([[cx + 5, 17], [cx + 10, 17], [cx + 13, 25], [cx + 13, 48], [cx + 15, 74], [cx + 7, 74], [cx + 6, 40]], P.G3);
    line(cx, 30, cx - 1, 74, P.G3); line(cx - 6, 50, cx - 8, 73, P.G3); rect(cx - 10, 44, 20, 1, P.G3); rect(cx - 3, 44, 6, 2, P.G3);
    // left arm hanging with the board duster
    ciaX_poly([[cx - 13, 24], [cx - 16, 36], [cx - 15, 54], [cx - 10, 54], [cx - 10, 30]], P.W); line(cx - 10, 31, cx - 10, 53, P.G3);
    rect(cx - 16, 54, 6, 4, P.SK); rect(cx - 17, 57, 8, 3, P.BR); rect(cx - 17, 59, 8, 1, P.G3);
    // right shoulder raised toward the board
    ciaX_poly([[cx + 9, 18], [cx + 15, 16], [cx + 17, 22], [cx + 13, 28]], P.G3);
    rect(cx - 3, 13, 7, 5, P.SK); rect(cx + 1, 13, 3, 5, P.BR);
    ciaX_draw(ciaX_HEAD.prof, cx - 6, 5);
  });
}
function ciaX_cwomanFig() {
  return ciaX_fig('cwoman', 46, 70, () => {
    const cx = 18;
    // chair back
    ciaX_poly([[cx - 17, 20], [cx - 10, 20], [cx - 8, 60], [cx - 17, 60]], P.BL); line(cx - 16, 21, cx - 16, 59, P.BL2);
    // lab coat torso, turned toward the machine on the right
    ciaX_poly([[cx - 11, 24], [cx + 10, 24], [cx + 13, 32], [cx + 13, 70], [cx - 13, 70], [cx - 13, 32]], P.W);
    ciaX_poly([[cx - 13, 32], [cx - 7, 28], [cx - 6, 70], [cx - 13, 70]], P.G3);
    ciaX_poly([[cx - 2, 24], [cx + 5, 24], [cx + 2, 36]], P.MG); ciaX_poly([[cx - 4, 23], [cx - 1, 24], [cx + 1, 38], [cx - 3, 30]], P.G3);
    line(cx + 1, 36, cx + 2, 70, P.G3); rect(cx + 6, 40, 6, 1, P.G3); rect(cx + 8, 37, 1, 4, P.BL);
    // arms reaching to the keyboard
    ciaX_poly([[cx + 8, 26], [cx + 14, 34], [cx + 27, 43], [cx + 25, 48], [cx + 10, 42]], P.W); line(cx + 11, 42, cx + 25, 48, P.G3);
    ciaX_poly([[cx - 10, 30], [cx - 4, 46], [cx + 18, 51], [cx + 17, 56], [cx - 8, 52], [cx - 13, 36]], P.G3); line(cx - 4, 46, cx + 18, 51, P.W);
    rect(cx - 2, 15, 6, 9, P.SK); rect(cx - 2, 15, 2, 9, P.BR);
    ciaX_draw(ciaX_HEAD.cryptowoman, cx - 7, 3);
  });
}
function ciaX_cryptoBG() {
  return sprite('ciaX_crypto', 150, 200, () => {
    // blue-painted walls with a dado rail
    rect(0, 0, 150, 200, P.BL); dither(0, 11, 150, 100, P.BL, P.K, 3); dither(0, 11, 150, 14, P.BL, P.K, 7);
    rect(0, 96, 150, 1, P.BL2); rect(0, 97, 150, 1, P.K); dither(0, 98, 150, 22, P.BL, P.K, 6);
    // blackboard
    rect(6, 20, 92, 58, P.BR); rect(8, 22, 88, 54, P.K); dither(9, 23, 86, 52, P.K, P.GR, 4); rect(8, 76, 90, 3, P.BR); rect(8, 76, 90, 1, P.YE);
    rect(20, 77, 6, 1, P.W); rect(60, 77, 4, 1, P.YE);
    // chalk: a cipher, a key and a frequency count
    ciaX_t3('XQJ KZV', 12, 26, P.W); ciaX_t3('= THE', 44, 26, P.W);
    ciaX_t3('E=Q T=J', 12, 34, P.G3); line(12, 40, 60, 40, P.G3);
    for (let k = 0; k < 10; k++) { const hh = [18, 7, 11, 13, 4, 9, 14, 3, 6, 12][k]; rect(14 + k * 5, 70 - hh, 3, hh, P.W); ciaX_t3('EQJTAZKOVN'[k], 14 + k * 5, 71 - hh - 7 < 42 ? 42 : 70 - hh - 6, P.G3); }
    line(12, 70, 66, 70, P.W);
    
    // wall clock
    ciaX_ell(118, 30, 9, 9, P.K); ciaX_ell(118, 30, 8, 8, P.W); for (let k = 0; k < 12; k++) px(118 + Math.round(Math.cos(k / 12 * 6.28) * 6), 30 + Math.round(Math.sin(k / 12 * 6.28) * 6), P.G1);
    // bookshelf
    rect(104, 46, 44, 60, P.BR); rect(104, 46, 44, 1, P.YE);
    for (let s = 0; s < 3; s++) { const sy = 50 + s * 18; rect(106, sy, 40, 14, P.K); let bx = 107; let k = s * 5; while (bx < 144) { const bw = 2 + (k * 7) % 3, bh = 10 + (k * 5) % 4; rect(bx, sy + 14 - bh, bw, bh, [P.RD, P.GR, P.BL2, P.YE, P.W, P.MG, P.TL][k % 7]); px(bx, sy + 14 - bh, P.K); bx += bw + 1; k++; } rect(104, sy + 14, 44, 2, P.BR); }
    // back bench with the terminal and cipher printer
    rect(0, 120, 150, 80, P.G1); dither(0, 120, 150, 30, P.G1, P.K, 8); rect(0, 120, 150, 1, P.G3);
    // the professor at the blackboard
    g.drawImage(ciaX_profFig(), 56, 44);
    // desk
    ciaX_poly([[0, 146], [150, 140], [150, 150], [0, 158]], P.G3); line(0, 146, 150, 140, P.W);
    ciaX_poly([[0, 158], [150, 150], [150, 200], [0, 200]], P.BR); line(0, 158, 150, 150, P.K); line(0, 159, 150, 151, P.RD); for (const dx of [40, 100]) line(dx, 158 - dx / 19, dx, 200, P.K); for (let yy = 186; yy < 200; yy++) ciaX_run(0, 149, yy, [ciaX_T, P.K, (yy - 186)]);
    // terminal (right)
    rect(108, 112, 38, 32, P.K); rect(109, 113, 36, 30, P.G3); rect(109, 113, 36, 1, P.W); rect(113, 116, 28, 20, P.K); rect(112, 115, 30, 1, P.G1);
    rect(118, 143, 18, 2, P.G1); ciaX_poly([[110, 146], [146, 143], [148, 147], [111, 150]], P.G1); for (let k = 0; k < 8; k++) px(114 + k * 4, 146 - (k / 3 | 0), P.G3);
    // cipher machine (centre)
    ciaX_poly([[46, 128], [96, 124], [100, 146], [44, 150]], P.K); ciaX_poly([[47, 129], [95, 125], [99, 145], [45, 149]], P.G1);
    ciaX_poly([[50, 131], [92, 128], [93, 136], [50, 139]], P.K);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 9; k++) { const kx = 50 + k * 5 + r, ky = 140 + r * 3 - k * 0.4; rect(kx, ky, 3, 2, P.G3); px(kx, ky, P.W); }
    rect(64, 118, 20, 8, P.G3); rect(64, 118, 20, 1, P.W); rect(66, 120, 16, 4, P.K);
    // the cryptanalyst at the machine
    g.drawImage(ciaX_cwomanFig(), 6, 100);
  });
}
function cryptoLabArt(x, y, w, h, t) {
  ciaX_clip(x, y, w, h);
  g.drawImage(ciaX_cryptoBG(), x, y);
  // clock hands
  const mm = (t / 8) % 1; line(x + 118, y + 30, x + 118 + Math.round(Math.cos(mm * 6.28 - 1.57) * 6), y + 30 + Math.round(Math.sin(mm * 6.28 - 1.57) * 6), P.K); line(x + 118, y + 30, x + 121, y + 28, P.K);
  // professor chalking: his arm travels along the line he is writing
  const ph = (t * 1.1) % 5, k0 = Math.min(4, ph | 0), hx = x + 76 + Math.round(Math.min(ph, 4) * 4), hy = y + 44 + ((t * 6 | 0) % 2), sx = x + 88, sy = y + 62;
  ciaX_poly([[sx - 3, sy], [sx + 3, sy + 1], [hx + 2, hy + 2], [hx - 1, hy + 2]], P.W); line(sx - 3, sy, hx - 1, hy + 2, P.K); line(sx + 3, sy + 1, hx + 2, hy + 2, P.K);
  rect(hx - 1, hy - 1, 4, 3, P.SK); px(hx, hy - 2, P.W);
  for (let k = 0; k < k0; k++) ciaX_t3('KEYS'[k], x + 74 + k * 4, y + 38, P.W);
  // green terminal text scrolling
  const sc = (t * 2.5 | 0);
  for (let r = 0; r < 3; r++) { const ln = ['ABCQZ', 'DEF=T', 'KXV?', 'JQL=E', 'TRY 7', 'MATCH'][(sc + r) % 6]; ciaX_t3(ln, x + 115, y + 118 + r * 6, P.GR2); }
  if ((t * 3 | 0) % 2) rect(x + 115 + 4 * 5, y + 130, 3, 5, P.GR2);
  // cipher lamps flicker as she keys, paper tape feeds out
  const lit = (t * 7 | 0) % 9, row = (t * 7 | 0) % 2;
  for (let k = 0; k < 9; k++) { const kx = x + 51 + k * 4.5, ky = y + 132 - k * 0.35 + row * 3; px(kx, ky, k === lit ? P.YE : P.G1); px(kx + 1, ky, k === lit ? P.YE : P.K); }
  const tape = (t * 10 | 0) % 6;
  for (let k = 0; k < 14; k++) { const tx = x + 84 + k, ty = y + 121 - (k > 6 ? (k - 6) : 0); px(tx, ty, P.W); if ((k + tape) % 3 === 0) px(tx, ty, P.G1); }
  ciaX_t3('ZX' + 'QJKT'[(t * 2 | 0) % 4], x + 67, y + 120, P.RD2);
  // her hands tap the keys
  const tap = (t * 7 | 0) % 2;
  rect(x + 46, y + 142 - tap, 5, 3, P.SK); rect(x + 39, y + 150 - (1 - tap), 5, 3, P.SK);
  if (ciaX_blink(t, 1.7)) { px(x + 22, y + 110, P.SK); px(x + 26, y + 110, P.SK); }
  g.restore();
}
