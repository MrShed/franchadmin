// ===================================================================
// ELECTRONICS: the junction-box puzzle. Current flows left to right
// through two-lane chips. Swap chips with the one in hand until no
// phone has power - without ever powering an alarm.
// ===================================================================
// chip types: route maps (top,bottom) inputs to outputs; inv flips a lane
const CHIPS = {
  S: { route: 'straight', inv: [0, 0] },   // =  two straight lanes
  X: { route: 'cross', inv: [0, 0] },      // X  lanes swap
  D: { route: 'down', inv: [0, 0] },       // top feeds the bottom output
  U: { route: 'up', inv: [0, 0] },         // bottom feeds the top output
  T: { route: 'straight', inv: [1, 0] },   // top lane is a terminator
  B: { route: 'straight', inv: [0, 1] },   // bottom lane is a terminator
  I: { route: 'straight', inv: [1, 1] },   // both lanes are terminators
};
function chipOut(type, a, b) {
  const c = CHIPS[type]; let o;
  if (c.route === 'straight') o = [a, b]; else if (c.route === 'cross') o = [b, a];
  else if (c.route === 'down') o = [0, a]; else o = [b, 0];
  return [c.inv[0] ? (o[0] ? 0 : 1) : o[0], c.inv[1] ? (o[1] ? 0 : 1) : o[1]];
}
const wtX_CW = 16;
// ---------- junction-box art: hand-placed EGA sprites (prefix wtX_) ----------
// string sprites: one char per pixel, '.' = transparent
function wtX_paint(rows, map, x, y) {
  for (let j = 0; j < rows.length; j++) { const r = rows[j]; let i = 0;
    while (i < r.length) { const ch = r[i], c = map[ch]; if (!c) { i++; continue; } let k = i + 1; while (k < r.length && r[k] === ch) k++; g.fillStyle = c; g.fillRect(x + i, y + j, k - i, 1); i = k; } }
}
function wtX_spr(key, rows, map) { return sprite('wtX_' + key, rows[0].length, rows.length, () => wtX_paint(rows, map, 0, 0)); }
// 3x5 silkscreen lettering
const wtX_T3 = {
  '0': '###,#.#,#.#,#.#,###', '1': '.#.,##.,.#.,.#.,###', '2': '##.,..#,.#.,#..,###', '3': '##.,..#,.#.,..#,##.', '4': '#.#,#.#,###,..#,..#',
  '5': '###,#..,##.,..#,##.', '6': '.##,#..,###,#.#,###', '7': '###,..#,.#.,.#.,.#.', '8': '###,#.#,###,#.#,###', '9': '###,#.#,###,..#,##.',
  'A': '.#.,#.#,###,#.#,#.#', 'B': '##.,#.#,##.,#.#,##.', 'C': '.##,#..,#..,#..,.##', 'D': '##.,#.#,#.#,#.#,##.', 'E': '###,#..,##.,#..,###',
  'F': '###,#..,##.,#..,#..', 'G': '.##,#..,#.#,#.#,.##', 'H': '#.#,#.#,###,#.#,#.#', 'I': '###,.#.,.#.,.#.,###', 'J': '..#,..#,..#,#.#,.#.',
  'K': '#.#,#.#,##.,#.#,#.#', 'L': '#..,#..,#..,#..,###', 'M': '#.#,###,###,#.#,#.#', 'N': '##.,#.#,#.#,#.#,#.#', 'O': '.#.,#.#,#.#,#.#,.#.',
  'P': '##.,#.#,##.,#..,#..', 'Q': '.#.,#.#,#.#,##.,.##', 'R': '##.,#.#,##.,#.#,#.#', 'S': '.##,#..,.#.,..#,##.', 'T': '###,.#.,.#.,.#.,.#.', 'U': '#.#,#.#,#.#,#.#,###',
  'V': '#.#,#.#,#.#,#.#,.#.', 'W': '#.#,#.#,###,###,#.#', 'X': '#.#,#.#,.#.,#.#,#.#', 'Y': '#.#,#.#,.#.,.#.,.#.', '+': '...,.#.,###,.#.,...',
  '-': '...,...,###,...,...', '.': '...,...,...,...,.#.', '/': '..#,..#,.#.,#..,#..', ':': '...,.#.,...,.#.,...', '!': '.#.,.#.,.#.,...,.#.',
  '(': '.#.,#..,#..,#..,.#.', ')': '.#.,..#,..#,..#,.#.',
};
function wtX_tiny(s, x, y, col) {
  for (const ch of String(s)) { const gl = wtX_T3[ch];
    if (gl) g.drawImage(sprite('wtX_t' + ch + col, 3, 5, () => gl.split(',').forEach((r, j) => { for (let i = 0; i < 3; i++) if (r[i] === '#') px(i, j, col); })), x, y);
    x += 4; }
}
const wtX_tinyW = s => String(s).length * 4 - 1;
// seven-segment LED digits, 5x9
const wtX_SEG = [0x7E, 0x30, 0x6D, 0x79, 0x33, 0x5B, 0x5F, 0x70, 0x7F, 0x7B];
const wtX_SEGR = [[1, 0, 3, 1], [4, 1, 1, 3], [4, 5, 1, 3], [1, 8, 3, 1], [0, 5, 1, 3], [0, 1, 1, 3], [1, 4, 3, 1]];
function wtX_seg7(d, x, y, on, off) { const m = wtX_SEG[d]; wtX_SEGR.forEach(([sx, sy, w, h], i) => { const lit = m & (0x40 >> i); if (lit || off) rect(x + sx, y + sy, w, h, lit ? on : off); }); }
// hardware
const wtX_SCREW = ['..KKK..', '.KWWgK.', 'KWggKgK', 'KggKgdK', 'KgKggdK', '.KgddK.', '..KKK..'];
const wtX_VIA = ['.gg.', 'gKKg', 'gKKg', '.gg.'];
const wtX_PHONE = [
  '..KKKKKKKKKKKK..', '.KhhhhhhhhhhhhK.', 'KhbbbbbbbbbbbbsK', 'KbbsKKKKKKKKbbsK', '.KKK........KKK.',
  '....KhhhhhhK....', '...KhbbbbbbsK...', '...KhbbddbbsK...', '..KhbbdbbdbbsK..', '..KhbdbKKbdbsK..',
  '..KhbbdbbdbbsK..', '.KhbbbbddbbbbsK.', '.KhbbbbbbbbbbsK.', 'KssssssssssssssK', '.KKKKKKKKKKKKKK.'];
const wtX_BELL = [
  '......KKKK......', '.....KhhbsK.....', '....KhbbbbsK....', '...KhbbbbbbsK...', '...KhbbbbbbsK...',
  '...KhbbbbbbsK...', '..KhbbbbbbbbsK..', '..KhbbbbbbbbsK..', '.KhbbbbbbbbbbsK.', 'KhhbbbbbbbbbbssK',
  'KssssssssssssssK', '.KKKKKKKKKKKKKK.', '.......cc.......', '......KccK......', '.......KK.......'];
function wtX_phone(live) { return wtX_spr('ph' + (live ? 1 : 0), wtX_PHONE, live ? { K: P.K, h: P.W, b: P.G3, s: P.G1, d: P.K } : { K: P.K, h: P.G3, b: P.G1, s: P.K, d: P.K }); }
function wtX_bell(lit) { return wtX_spr('bl' + (lit ? 1 : 0), wtX_BELL, lit ? { K: P.K, h: P.W, b: P.RD2, s: P.RD, c: P.YE } : { K: P.K, h: P.W, b: P.YE, s: P.BR, c: P.G3 }); }
function wtX_dial(on, n) {
  return sprite('wtX_dial' + (on ? 1 : 0) + n, 16, 15, () => {
    rect(0, 0, 16, 15, P.K); rect(1, 1, 14, 13, P.G1); rect(1, 1, 14, 1, P.G3); rect(1, 1, 1, 13, P.G3);
    disc(5, 8, 5, P.K); disc(5, 8, 4, P.G3); px(3, 5, P.W); px(4, 5, P.W); px(3, 6, P.W); rect(7, 10, 2, 1, P.G1); rect(8, 9, 1, 1, P.G1);
    if (on) line(5, 8, 8, 5, P.K); else line(5, 8, 2, 11, P.K);
    rect(10, 2, 5, 3, P.K); rect(11, 3, 3, 1, on ? P.RD2 : P.RD); if (on) px(11, 3, P.W);
    text(String(n), n === 1 ? 11 : 10, 6, on ? P.W : P.G3);
  });
}
function wtX_screw(cx, cy) { disc(cx, cy, 4, P.G1); g.drawImage(wtX_spr('screw', wtX_SCREW, { K: P.K, W: P.W, g: P.G3, d: P.G1 }), cx - 3, cy - 3); }
// chip route symbol, printed on the package
function wtX_glyph(type, x, y, col, bub) {
  const c = CHIPS[type], L = x + 3, R = x + 12, T = y + 4, Bm = y + 12;
  const lane = (yy, inv) => {
    if (inv) { rect(L, yy, 3, 1, col); px(L + 4, yy - 1, bub); px(L + 5, yy - 1, bub); px(L + 3, yy, bub); px(L + 6, yy, bub); px(L + 4, yy + 1, bub); px(L + 5, yy + 1, bub); rect(L + 7, yy, R - L - 6, 1, col); }
    else rect(L, yy, R - L + 1, 1, col);
    px(R - 1, yy - 1, col); px(R - 1, yy + 1, col);
  };
  if (c.route === 'straight') { lane(T, c.inv[0]); lane(Bm, c.inv[1]); }
  else if (c.route === 'cross') { line(L, T, R, Bm, col); line(L, Bm, R, T, col); px(R - 1, Bm - 1, col); px(R - 2, Bm, col); px(R - 1, T + 1, col); px(R - 2, T, col); }
  else if (c.route === 'down') { rect(L, T, 2, 1, col); line(L + 1, T, R, Bm, col); rect(R - 2, Bm, 2, 1, col); rect(R, Bm - 2, 1, 2, col); }
  else { rect(L, Bm, 2, 1, col); line(L + 1, Bm, R, T, col); rect(R - 2, T, 2, 1, col); rect(R, T + 1, 1, 2, col); }
}
// a DIP package in its socket (or soldered straight to the board), 22x20, body at (3,2)
function wtX_chip(type, isFixed, sel, bare) {
  return sprite('wtX_chip' + type + (isFixed ? 1 : 0) + (sel ? 1 : 0) + (bare ? 1 : 0), 22, 20, () => {
    const x = 3, y = 2;
    if (!isFixed && !bare) { // turned-pin socket
      rect(x - 1, y - 2, 18, 20, P.K); rect(x, y - 2, 16, 1, P.G1); rect(x, y + 17, 16, 1, P.G1);
      for (let i = 2; i < 15; i += 4) { px(x + i, y - 2, P.K); px(x + i, y + 17, P.K); }
    }
    for (const yy of [4, 8, 12]) {
      if (isFixed) for (const sx of [x - 3, x + 16]) { rect(sx, y + yy - 1, 3, 3, P.G3); rect(sx + 1, y + yy - 2, 1, 5, P.G3); px(sx, y + yy - 1, P.W); px(sx + 1, y + yy - 2, P.W); }
      const pc = yy === 8 ? P.G1 : P.G3;
      rect(x - 2, y + yy - 1, 2, 3, pc); rect(x + 16, y + yy - 1, 2, 3, pc);
      if (yy !== 8) { px(x - 2, y + yy - 1, P.W); px(x + 16, y + yy - 1, P.W); px(x - 1, y + yy + 1, P.G1); px(x + 17, y + yy + 1, P.G1); }
    }
    const face = sel ? P.BL : P.G1;
    rect(x, y, 16, 16, P.K); rect(x + 1, y + 1, 14, 14, face);
    rect(x + 1, y + 1, 14, 1, sel ? P.BL2 : P.G3); px(x + 1, y + 1, sel ? P.CY : P.W);
    rect(x + 1, y + 14, 14, 1, sel ? P.NV : P.K); px(x + 14, y + 13, sel ? P.NV : P.K);
    // moulding marks: notch at the pin-1 end, ejector dimple
    rect(x, y + 6, 2, 4, P.K); rect(x + 2, y + 7, 1, 2, P.K); px(x + 13, y + 2, sel ? P.NV : P.K);
    if (type === '?') { textC('?', x + 8, y + 4, P.YE); return; }
    wtX_glyph(type, x, y, sel ? P.W : P.CY, P.YE);
  });
}
// the bare circuit board inside the box: laminate, silkscreen, vias, screws, +5V rail
function wtX_pcbArt(chipXY, COLS, ROWS) {
  return sprite('wtX_pcb', 320, 169, () => {
    rect(0, 0, 320, 169, P.K);
    // steel box walls seen past the board edge
    rect(0, 0, 320, 1, P.G3); rect(0, 1, 320, 1, P.G1); rect(0, 0, 1, 169, P.G3); rect(1, 1, 1, 168, P.G1); rect(318, 1, 1, 168, P.G1); rect(319, 0, 1, 169, P.G3); rect(0, 168, 320, 1, P.G1);
    // board laminate: green solder mask with an ordered-dither grain and a glossy band
    dither(3, 2, 314, 166, P.GR, P.K, 2);
    rect(3, 2, 314, 1, P.GR2); rect(3, 2, 1, 166, P.GR2); rect(3, 167, 314, 1, P.K); rect(316, 2, 1, 166, P.K);
    // vias scattered where the copper would need them
    let s = 7; const r = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const via = wtX_spr('via', wtX_VIA, { g: P.G3, K: P.K });
    for (let n = 0, k = 0; n < 46 && k < 900; k++) {
      const vx = 22 + (r() * 236 | 0), vy = 4 + (r() * 158 | 0); let ok = true;
      for (let c = 0; c < COLS && ok; c++) for (let rr = 0; rr < ROWS; rr++) { const [cx, cy] = chipXY(c, rr); if (vx > cx - 9 && vx < cx + wtX_CW + 6 && vy > cy - 6 && vy < cy + wtX_CW + 10) { ok = false; break; } }
      if (ok) { g.drawImage(via, vx, vy); n++; }
    }
    // silkscreen: part numbers, jack numbers, the maker's legend
    for (let c = 0; c < COLS; c++) for (let rr = 0; rr < ROWS; rr++) { const [cx, cy] = chipXY(c, rr), lab = 'U' + (c * ROWS + rr + 1); wtX_tiny(lab, cx + 8 - (wtX_tinyW(lab) >> 1), cy + 20, P.W); px(cx - 3, cy + 7, P.W); px(cx - 3, cy + 8, P.W); }
    for (let l = 0; l < ROWS * 2; l++) { const ex = l % 2 ? 294 : 266, ey = 6 + l * 15.6 | 0; if (l < 9) wtX_tiny('J' + (l + 1), ex - 10, ey + 1, P.W); else wtX_tiny('J10', ex - 11, ey + 9, P.W); }
    wtX_tiny('LIU-7 LINE INTERFACE', 38, 3, P.W); wtX_tiny('REV.C', 128, 3, P.W);
    // caution triangle
    const tx = 150; line(tx, 7, tx + 3, 2, P.YE); line(tx + 3, 2, tx + 6, 7, P.YE); rect(tx, 7, 7, 1, P.YE); px(tx + 3, 4, P.YE); px(tx + 3, 6, P.YE);
    wtX_tiny('CAUTION', 160, 3, P.YE);
    wtX_tiny('(C)1990  MADE IN U.S.A.  QC PASSED', 46, 162, P.W);
    // +5V rail along the bottom-left edge
    rect(4, 163, 18, 4, P.K); rect(4, 163, 18, 3, P.YE); rect(4, 165, 18, 1, P.BR); rect(4, 163, 18, 1, P.W);
    wtX_tiny('+5V', 23, 162, P.YE);
    // mounting screws
    wtX_screw(13, 8); wtX_screw(27, 154); wtX_screw(305, 10); wtX_screw(268, 159);
  });
}
// recessed compartment in the steel tool tray
function wtX_well(x, y, w, h, fill) { rect(x, y, w, h, P.K); rect(x + 1, y + 1, w - 1, h - 1, fill); rect(x + w, y, 1, h + 1, P.G3); rect(x, y + h, w + 1, 1, P.G3); }
// the technician's tray under the box: power posts, legal pad, anti-static foam, timer
function wtX_trayArt() {
  return sprite('wtX_tray', 320, 31, () => {
    dither(0, 0, 320, 31, P.G1, P.G3, 3); rect(0, 0, 320, 1, P.G3); rect(0, 1, 320, 1, P.W); rect(0, 30, 320, 1, P.K);
    for (let x = 1; x < 320; x += 5) px(x, 3 + (x * 7 % 3), P.K);
    // power pack
    wtX_well(3, 3, 54, 16, P.K); dither(4, 4, 53, 15, P.K, P.G1, 2);
    disc(10, 7, 3, P.K); disc(10, 7, 2, P.RD); px(9, 6, P.RD2); px(10, 6, P.RD2); px(10, 7, P.K);
    disc(10, 14, 3, P.K); disc(10, 14, 2, P.G1); px(9, 13, P.G3); px(10, 14, P.K);
    text('+5V', 16, 4, P.RD2); text('GND', 16, 11, P.G3);
    rect(38, 6, 3, 3, P.K); rect(39, 7, 1, 1, P.GR2); wtX_tiny('PWR', 43, 6, P.G3);
    // quit button (tap zone: bottom-left)
    rect(3, 20, 54, 10, P.K); rect(4, 21, 52, 8, P.RD); rect(4, 21, 52, 1, P.RD2); rect(4, 21, 1, 8, P.RD2); rect(4, 28, 52, 1, P.K);
    // yellow legal pad
    wtX_well(60, 2, 128, 27, P.G1);
    rect(63, 4, 124, 25, P.K); rect(62, 3, 124, 25, P.YE); rect(62, 3, 124, 2, P.RD); rect(62, 5, 124, 1, P.BR);
    rect(62, 16, 124, 1, P.BL2); rect(62, 26, 124, 1, P.BL2); rect(66, 6, 1, 22, P.RD2);
    rect(183, 25, 3, 3, P.G1); px(183, 25, P.YE); px(185, 27, P.G1); // dog-eared corner
    // anti-static foam for the spare chip
    wtX_well(191, 2, 64, 27, P.K);
    for (let y = 3; y < 29; y++) for (let x = 192; x < 255; x++) if (BAYER[(y & 3) * 4 + (x & 3)] < 2 && ((x * 3 + y * 5) % 7) < 4) px(x, y, P.G1);
    // countdown timer
    wtX_well(258, 2, 58, 27, P.K); rect(259, 3, 57, 26, P.G1); rect(259, 3, 57, 1, P.G3); rect(259, 3, 1, 26, P.G3);
    wtX_tiny('TIMER', 262, 5, P.W); rect(304, 5, 3, 3, P.K); rect(309, 5, 3, 3, P.K);
    rect(261, 11, 53, 15, P.K); rect(262, 12, 51, 13, P.K); frame(261, 11, 53, 15, P.G3); rect(261, 25, 53, 1, P.W);
  });
}
// tweezers gripping the spare chip from the right
function wtX_tweezers(x, y) {
  // stainless tips hug the top and bottom of the package, the arms spring apart and meet at the back
  rect(x + 3, y - 2, 13, 1, P.W); rect(x + 3, y - 1, 13, 1, P.G3); rect(x + 3, y + 16, 13, 1, P.G3); rect(x + 3, y + 17, 13, 1, P.G1); px(x + 2, y - 1, P.G3); px(x + 2, y + 16, P.G3);
  for (const [y0, y1, hi] of [[y - 2, y + 5, P.W], [y + 16, y + 11, P.G3]]) { line(x + 16, y0, x + 29, y1, hi); line(x + 16, y0 + 1, x + 29, y1 + 1, P.G3); line(x + 17, y0 + 2 * (y0 < y1 ? 1 : 0), x + 29, y1 + 2, P.G1); }
  for (let i = 0; i < 4; i++) { px(x + 20 + i * 2, y + 1 + i, P.G1); px(x + 20 + i * 2, y + 14 - i, P.G1); } // grip serrations
  rect(x + 28, y + 5, 3, 9, P.G3); rect(x + 28, y + 5, 3, 1, P.W); rect(x + 30, y + 6, 1, 8, P.G1); rect(x + 28, y + 13, 3, 1, P.K);
}
// ---------- opening shot: the box on the wall (tap) or under the car (tracer) ----------
function wtX_wallArt() {
  return sprite('wtX_wall', 320, 200, () => {
    rect(0, 0, 320, 200, P.K);
    // brick wall: each brick shaded as a whole by its distance from the lamp
    let sd = 3; const rn = () => (sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let row = 0; row < 26; row++) { const y0 = row * 7, off = row % 2 ? 9 : 0;
      for (let x0 = -off; x0 < 320; x0 += 18) {
        const v = Math.max(0, 1 - Math.hypot(x0 + 8 - 44, (y0 + 3 - 14) * 1.25) / 230) + (rn() - 0.5) * 0.12;
        const bx = Math.max(0, x0), bw = Math.min(x0 + 17, 320) - bx; if (bw <= 0) continue;
        if (v > 0.72) { dither(bx, y0, bw, 6, P.RD, P.BR, Math.round((v - 0.72) * 30)); rect(bx, y0, bw, 1, v > 0.85 ? P.RD2 : P.BR); }
        else if (v > 0.3) { dither(bx, y0, bw, 6, P.K, P.RD, Math.round(4 + (v - 0.3) * 28)); rect(bx, y0, bw, 1, P.RD); }
        else dither(bx, y0, bw, 6, P.K, P.RD, 2 + Math.round(v * 8));
        if (v > 0.2 && rn() < 0.15) px(bx + (rn() * bw | 0), y0 + 2 + (rn() * 3 | 0), P.K); // pits
      } }
    // lamp on a bracket, and its pool of light
    rect(0, 6, 34, 2, P.G1); rect(0, 6, 34, 1, P.G3); rect(30, 6, 2, 4, P.G1);
    rect(24, 10, 14, 3, P.G1); rect(24, 10, 14, 1, P.G3); rect(26, 13, 10, 2, P.YE); rect(28, 13, 6, 1, P.W);
    for (let y = 15; y < 26; y++) for (let x = 20; x < 44; x++) { if (Math.abs(x - 31) < (y - 13) && BAYER[(y & 3) * 4 + (x & 3)] < 3) px(x, y, P.YE); }
    // sidewalk and curb
    rect(0, 176, 320, 24, P.G1); dither(0, 184, 320, 16, P.G1, P.K, 8); rect(0, 176, 320, 1, P.G3); rect(0, 177, 320, 1, P.W);
    for (let x = 0; x < 320; x += 40) { rect(x, 178, 1, 22, P.K); }
    // conduit into the top of the box, and the drop to the ground
    for (const [cx, y0, y1] of [[156, 0, 36], [150, 150, 176]]) { rect(cx, y0, 8, y1 - y0, P.G1); rect(cx + 1, y0, 2, y1 - y0, P.G3); px(cx + 1, y0, P.W); rect(cx + 7, y0, 1, y1 - y0, P.K); }
    rect(153, 16, 14, 3, P.G3); rect(153, 18, 14, 1, P.K); rect(147, 162, 14, 3, P.G3); rect(147, 164, 14, 1, P.K);
  });
}
function wtX_carArt() {
  return sprite('wtX_car', 320, 200, () => {
    // night street, a parked sedan seen from behind
    rect(0, 0, 320, 200, P.K);
    for (let i = 0; i < 30; i++) px((i * 71) % 320, (i * 37) % 60, i % 5 ? P.G1 : P.W);
    // skyline across the street, a few windows still lit
    for (let x = 0, k = 0; x < 320; k++) { const bw = 30 + (k * 17) % 26, top = 44 + (k * 29) % 40; rect(x, top, bw - 1, 140 - top, P.K); dither(x, top, bw - 1, 140 - top, P.K, P.G1, 2); rect(x, top, bw - 1, 1, P.G1);
      for (let wy = top + 5; wy < 136; wy += 8) for (let wx = x + 4; wx < x + bw - 6; wx += 7) if (((wx * 7 + wy * 13 + k) % 11) < 2) { rect(wx, wy, 3, 4, P.YE); px(wx, wy, P.W); } else rect(wx, wy, 3, 4, P.K);
      x += bw; }
    // street lamp on the right
    rect(300, 22, 2, 118, P.G1); rect(300, 22, 1, 118, P.G3); rect(288, 20, 14, 3, P.G1); rect(286, 22, 8, 2, P.YE); px(288, 22, P.W);
    // road
    rect(0, 140, 320, 60, P.G1); dither(0, 140, 320, 60, P.G1, P.K, 9);
    for (let y = 140; y < 200; y++) for (let x = 0; x < 320; x++) { const gl = 1 - Math.abs(x - 290) / (14 + (y - 140) * 1.2); if (gl > 0 && BAYER[(y & 3) * 4 + (x & 3)] < gl * 7) px(x, y, gl > 0.6 ? P.G3 : P.G1); }
    // car body (dark blue), cabin and rear window
    const C = { K: P.K };
    rect(92, 30, 136, 4, P.BL); rect(96, 29, 128, 1, P.BL2);
    for (let y = 34; y < 64; y++) { const inset = Math.round((64 - y) * 0.35); rect(80 + inset, y, 160 - inset * 2, 1, P.BL); }
    for (let y = 37; y < 61; y++) { const inset = Math.round((64 - y) * 0.35) + 5; rect(80 + inset, y, 160 - inset * 2, 1, P.K); if (y < 50) for (let x = 80 + inset; x < 240 - inset; x++) if ((x - y * 2) % 23 === 0) px(x, y, P.G1); }
    rect(86, 37, 148, 1, P.G1);
    rect(40, 64, 240, 62, P.BL); dither(40, 100, 240, 14, P.BL, P.K, 5);
    rect(40, 64, 240, 2, P.BL2); rect(42, 72, 236, 1, P.K); rect(42, 73, 236, 1, P.BL2);
    rect(40, 64, 2, 62, P.K); rect(278, 64, 2, 62, P.K);
    // tail lights and a chrome strip
    for (const x of [46, 236]) { rect(x, 78, 38, 16, P.K); rect(x + 1, 79, 36, 14, P.RD); dither(x + 2, 80, 34, 6, P.RD, P.RD2, 6); rect(x + 1, 88, 36, 5, P.BR); }
    rect(86, 84, 148, 1, P.G3); rect(86, 85, 148, 1, P.G1);
    // licence plate
    rect(132, 92, 56, 16, P.K); rect(133, 93, 54, 14, P.W); rect(133, 93, 54, 1, P.G3);
    text('LX 4412', 138, 96, P.BL);
    // bumper
    rect(34, 114, 252, 10, P.G3); rect(34, 114, 252, 2, P.W); rect(34, 121, 252, 3, P.G1); rect(34, 124, 252, 1, P.K);
    // tyres and the shadow beneath
    rect(46, 125, 228, 18, P.K);
    for (const x of [52, 232]) { rect(x, 124, 36, 22, P.K); dither(x + 1, 125, 5, 20, P.K, P.G1, 6); dither(x + 30, 125, 5, 20, P.K, P.G1, 6); for (let tx = x + 8; tx < x + 29; tx += 4) rect(tx, 142, 2, 3, P.G1); rect(x + 2, 145, 32, 1, P.G1); }
    // exhaust
    rect(250, 125, 10, 5, P.G1); rect(250, 125, 10, 1, P.G3); rect(252, 127, 6, 2, P.K);
  });
}
// the inside of an opened box: a miniature board, cable bundle and terminal strips
function wtX_boxInside(w, h) {
  return sprite('wtX_in' + w + 'x' + h, w, h, () => {
    rect(0, 0, w, h, P.K); dither(1, 1, w - 2, h - 2, P.G1, P.K, 6);
    // bundle of coloured pairs coming in from the top
    [P.RD2, P.BL2, P.YE, P.W, P.GR2, P.BR].forEach((c, i) => { const x = w / 2 - 6 + i * 2; rect(x, 0, 1, 10, c); rect(x, 10, 1, 3, P.K); });
    rect(w / 2 - 8, 5, 14, 2, P.K);
    // terminal strips left and right
    for (let y = 14; y < h - 8; y += 5) { rect(3, y, 5, 3, P.G3); px(5, y + 1, P.K); rect(w - 8, y, 5, 3, P.G3); px(w - 6, y + 1, P.K); }
    // the circuit board, in miniature
    const bx = 11, by = 13, bw = w - 22, bh = h - 22;
    rect(bx, by, bw, bh, P.GR); dither(bx, by, bw, bh, P.GR, P.K, 2); rect(bx, by, bw, 1, P.GR2); rect(bx, by, 1, bh, P.GR2);
    const nr = bh > 50 ? 5 : 2, nc = bw > 60 ? 5 : 4;
    for (let r = 0; r < nr; r++) { const yy = by + 4 + r * ((bh - 6) / nr | 0); rect(bx + 2, yy + 1, bw - 4, 1, r % 2 ? P.YE : P.GR2);
      for (let c = 0; c < nc; c++) { const xx = bx + 3 + c * ((bw - 6) / nc | 0); rect(xx, yy - 1, 7, 5, P.K); rect(xx + 1, yy, 5, 3, P.G1); px(xx + 1, yy, P.G3); } }
  });
}
function wiretapScene(opts, done) {
  const sk = game.agent ? game.agent.skills.electronics : 2, level = opts.level || 1;
  const COLS = 7, ROWS = 5, LANES = ROWS * 2;
  const tracer = opts.mode === 'tracer';
  const eff = Math.max(0, level - Math.max(0, sk - 1)); // skill above Good makes it easier
  const pool = eff >= 1 ? 'SSXXDUTBI' : 'SSSXXXDU'; // inverters from National Threat up
  const unknownRate = [0, 0.1, 0.2, 0.3][Math.min(3, eff)], hardRate = [0.08, 0.12, 0.16, 0.2][Math.min(3, eff)];
  let grid, links, inputs, ends, hand, fixed, hidden;
  function build() {
    grid = []; fixed = []; hidden = [];
    for (let c = 0; c < COLS; c++) { grid.push([]); fixed.push([]); for (let r = 0; r < ROWS; r++) { grid[c].push(pick(pool.split(''))); fixed[c].push(c === COLS - 1 || rnd() < hardRate); }
      hidden.push([]); for (let r = 0; r < ROWS; r++) hidden[c].push(!fixed[c][r] && rnd() < unknownRate); }
    // wiring between columns: mostly straight, with crossings between neighbouring chips
    links = []; for (let c = 0; c < COLS - 1; c++) { const m = [...Array(LANES).keys()]; for (let l = 1; l < LANES - 1; l += 2) if (rnd() < 0.35) { [m[l], m[l + 1]] = [m[l + 1], m[l]]; } for (let l = 0; l < LANES; l += 2) if (rnd() < 0.2) { [m[l], m[l + 1]] = [m[l + 1], m[l]]; } links.push(m); }
    // 5 volts enter at the bottom left and feed the lanes; some lanes are grounded
    inputs = [...Array(LANES)].map(() => rnd() < 0.55 ? 1 : 0); inputs[LANES - 1] = 1;
    hand = pick(pool.split(''));
  }
  function simulate(g, h) { // returns lane power per column output, and final outputs
    const cols = []; let lanes = inputs.slice();
    for (let c = 0; c < COLS; c++) {
      const out = []; for (let r = 0; r < ROWS; r++) { const [a, b] = chipOut(g[c][r], lanes[r * 2], lanes[r * 2 + 1]); out.push(a, b); }
      cols.push({ in: lanes, out }); if (c < COLS - 1) { const nx = []; links[c].forEach((to, from) => nx[to] = out[from]); lanes = nx; } else lanes = out;
    }
    return { cols, final: lanes };
  }
  // generate a board whose starting state powers every phone and no alarm, and that can be solved
  let tries = 0;
  for (; tries < 200; tries++) {
    build(); const f = simulate(grid).final;
    const nOn = f.filter(Boolean).length; if (nOn < 3 || nOn > 7) continue;
    ends = f.map(v => v ? (tracer ? 'setting' : 'phone') : 'alarm');
    if (solvable()) break;
  }
  function score(g) { const f = simulate(g).final; let s = 0; f.forEach((v, i) => { if (v) s += ends[i] === 'alarm' ? 3 : 1; }); return s; }
  function solvable() { // random-restart hill climb over swaps with the hand chip
    for (let restart = 0; restart < 6; restart++) {
      const g = grid.map(c => c.slice()); let h = hand, cur = score(g);
      for (let it = 0; it < 400; it++) {
        const c = ri(0, COLS - 2), r = ri(0, ROWS - 1); if (fixed[c][r]) continue;
        const old = g[c][r]; g[c][r] = h; const s = score(g);
        if (s <= cur || rnd() < 0.05) { h = old; cur = s; if (cur === 0) return true; } else g[c][r] = old;
      }
    }
    return false;
  }
  const time0 = (tracer ? 60 : 150) + sk * 20 - level * 10 - (opts.alert || 0) * 15; let time = time0, cur = [0, 0], over = null, t = 0, flash = 0;
  // briefing card before the clock starts; a live alarm gives you a moment to swap back before it trips
  let intro = !opts.noIntro, opening = intro, arming = 0; const grace = [2, 1.6, 1.3, 1][Math.min(3, eff)], preview = eff <= 1;
  const need = tracer ? Math.min(5, ends.filter(e => e === 'setting').length) : 0;
  const cutCount = () => simulate(grid).final.filter((v, i) => !v && ends[i] !== 'alarm').length;
  const X0 = 34, Y0 = 12, DXc = 32, DYr = 31, CW = 16, CH = 16;
  const chipXY = (c, r) => [X0 + c * DXc, Y0 + r * DYr];
  const laneY = (r, l) => Y0 + r * DYr + 4 + l * 8;
  const alarmLive = () => simulate(grid).final.some((v, i) => v && ends[i] === 'alarm');
  function check() {
    const f = simulate(grid).final;
    if (f.some((v, i) => v && ends[i] === 'alarm')) { if (!arming) { arming = grace; sfx.tone(1200, 0.08, 'square', 0.05); } return; }
    arming = 0;
    const n = cutCount();
    if (tracer ? n >= need : !f.some((v, i) => v && ends[i] === 'phone')) { over = { win: true, t: 0 }; sfx.success(); }
  }
  function swap() { const [c, r] = cur; if (fixed[c][r]) { sfx.deny(); return; } [grid[c][r], hand] = [hand, grid[c][r]]; hidden[c][r] = false; sfx.tone(900, 0.03); sfx.tone(600, 0.04, 'square', 0.04, 0, 0.04); check(); }
  function result() { const n = over.alarm ? 0 : cutCount(); return { success: over.win || (!tracer && n > 0 && !over.alarm), tapped: tracer ? 0 : n, alarm: !!over.alarm }; }
  function moveCur(dc, dr) { let [c, r] = cur; for (let k = 0; k < COLS * ROWS; k++) { c = (c + dc + COLS) % COLS; r = (r + dr + ROWS) % ROWS; if (!fixed[c][r]) break; if (!dc && !dr) break; } cur = [c, r]; sfx.blip(); }
  if (fixed[0][0]) moveCur(1, 0);
  // ---------- art ----------
  // every trace on the board as a list of pixels in the direction the current flows
  const paths = [];
  (function buildPaths() {
    const seg = (pts, x0, y0, x1, y1) => { x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
      for (let n = 0; n < 1000; n++) { const lp = pts[pts.length - 1]; if (!lp || lp[0] !== x0 || lp[1] !== y0) pts.push([x0, y0]); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } };
    for (let l = 0; l < LANES; l++) { const pts = [], y = laneY(l >> 1, l & 1), bx = 6 + (l % 5) * 3; seg(pts, bx, 167, bx, y); seg(pts, bx, y, X0 - 2, y); paths.push({ k: 'in', l, pts }); }
    for (let c = 0; c < COLS - 1; c++) for (let l = 0; l < LANES; l++) {
      const to = links[c][l], [x0] = chipXY(c, 0), [x1] = chipXY(c + 1, 0), y0 = laneY(l >> 1, l & 1), y1 = laneY(to >> 1, to & 1), xa = x0 + CW + 1, xb = x1 - 2, pts = [];
      if (y0 === y1) seg(pts, xa, y0, xb, y1); else { seg(pts, xa, y0, xa + 4, y0); seg(pts, xa + 4, y0, xb - 4, y1); seg(pts, xb - 4, y1, xb, y1); }
      paths.push({ k: 'ln', c, l, pts });
    }
    for (let l = 0; l < LANES; l++) { const [x0] = chipXY(COLS - 1, 0), y = laneY(l >> 1, l & 1), ex = l % 2 ? 294 : 266, ey = 6 + l * 15.6 | 0, pts = [];
      seg(pts, x0 + CW + 1, y, ex - 12, y); seg(pts, ex - 12, y, ex - 12, ey + 7); seg(pts, ex - 12, ey + 7, ex - 1, ey + 7); paths.push({ k: 'out', l, pts }); }
  })();
  const pathOn = (p, sim) => p.k === 'in' ? inputs[p.l] : p.k === 'ln' ? sim.cols[p.c].out[p.l] : sim.final[p.l];
  // the copper layer is redrawn only when the flow of power changes
  const copper = document.createElement('canvas'); copper.width = W; copper.height = 169; let copperSig = '';
  function drawCopper(sim) {
    const sig = paths.map(p => pathOn(p, sim) ? 1 : 0).join(''); if (sig === copperSig) return; copperSig = sig;
    const cx = copper.getContext('2d'); cx.clearRect(0, 0, W, 169);
    drawTo(cx, () => {
      g.fillStyle = P.K; for (const p of paths) for (const [x, y] of p.pts) g.fillRect(x + 1, y + 1, 1, 1);
      for (const on of [0, 1]) for (const p of paths) { if (!!pathOn(p, sim) !== !!on) continue; g.fillStyle = on ? P.YE : P.GR2; for (const [x, y] of p.pts) g.fillRect(x, y, 1, 1); }
    });
  }
  function drawChip(type, x, y, isFixed, sel, bare) {
    g.drawImage(wtX_chip(type, isFixed, sel, bare), x - 3, y - 2);
    if (isFixed && !bare) frame(x - 5, y - 3, CW + 10, CH + 6, P.W);
    if (sel) { const c = (t * 4 | 0) % 2 ? P.YE : P.W, x0 = x - 6, y0 = y - 4, x1 = x + CW + 5, y1 = y + CH + 3;
      for (const [bx, by, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { rect(Math.min(bx, bx + sx * 4), by, 5, 1, c); rect(bx, Math.min(by, by + sy * 4), 1, 5, c); } }
  }
  const lanePin = (x, y, on) => { if (!on) return; rect(x, y - 1, 2, 3, P.YE); px(x, y - 1, P.W); };
  function drawEnd(l, on, sim) {
    const ex = l % 2 ? 294 : 266, ey = 6 + l * 15.6 | 0;
    rect(ex - 2, ey + 6, 2, 3, on ? P.YE : P.G3); px(ex - 2, ey + 6, P.W);
    if (ends[l] === 'setting') g.drawImage(wtX_dial(on, 1 + (l >> 1)), ex, ey);
    else if (ends[l] === 'phone') g.drawImage(wtX_phone(on), ex, ey);
    else { const lit = on || (flash > 0 && (t * 10 | 0) % 2), ring = on && !over || (flash > 0 && over && over.alarm), f = t * 16 | 0, dx = ring ? (f % 2 ? 1 : -1) : 0;
      g.drawImage(wtX_bell(lit), ex + dx, ey);
      if (ring) { const c = f % 4 < 2 ? P.W : P.YE; px(ex + 1, ey + 2, c); px(ex, ey + 1, c); px(ex + 14, ey + 2, c); px(ex + 15, ey + 1, c); if (f % 3) { px(ex + 1, ey + 5, c); px(ex, ey + 6, c); px(ex + 14, ey + 5, c); px(ex + 15, ey + 6, c); } } }
  }
  function drawTray() {
    g.drawImage(wtX_trayArt(), 0, 169);
    // red lead from the +5V post up to the rail
    rect(13, 170, 2, 7, P.RD); rect(13, 170, 1, 7, P.RD2); rect(12, 166, 4, 4, P.G3); px(12, 166, P.W); rect(15, 167, 1, 3, P.G1);
    text('ESC: QUIT', 8, 190, P.W);
    const tot = ends.filter(e => e === 'phone').length, n = cutCount();
    text(tracer ? 'Settings cut ' + n + '/' + need : 'Phones cut ' + n + '/' + tot, 69, 178, P.K); text('Enter/tap: swap', 69, 188, P.G1);
    // progress ticks in the pad's margin
    for (let i = 0, m = tracer ? need : tot; i < m; i++) { const bx = 179 - (m - 1 - i) * 5; rect(bx, 188, 4, 5, P.K); rect(bx, 188, 3, 4, i < n ? P.GR2 : P.W); if (i < n) px(bx, 188, P.W); }
    text('IN', 195, 175, P.YE); text('HAND', 195, 185, P.YE);
    drawChip(hand, 222, 181, false, false, true); wtX_tweezers(222, 181);
    // countdown: 00:MM:SS in red LEDs, blinking when it gets short
    const mm = Math.floor(time / 60), ss = Math.floor(time % 60), low = time < 20 && !over && !intro && (t * 2 | 0) % 2;
    const on = low ? P.RD : P.RD2, dg = [0, 0, mm / 10 | 0, mm % 10, ss / 10 | 0, ss % 10]; let x = 265;
    dg.forEach((d, i) => { wtX_seg7(Math.min(9, d), x, 183, on, null); x += 6; if (i === 1 || i === 3) { px(x, 185, on); px(x, 189, on); x += 3; } });
    if (!over && !intro && (t * 2 | 0) % 2) px(310, 175, P.GR2);
  }
  function drawBriefing() {
    // a blueprint page from the service manual
    rect(6, 12, W - 12, 164, P.K); rect(7, 13, W - 14, 162, P.BL);
    frame(8, 14, W - 16, 160, P.W); frame(10, 16, W - 20, 156, P.BL2); rect(11, 17, W - 22, 11, P.BL); rect(11, 28, W - 22, 1, P.BL2);
    for (const [cx, cy] of [[12, 18], [W - 14, 18], [12, 170], [W - 14, 170]]) { px(cx, cy, P.W); }
    wtX_tiny('FIG.7', W - 36, 164, P.BL2); wtX_tiny('LIU-7', 16, 164, P.BL2);
  }
  function drawOpening() {
    const car = tracer, bx = car ? 128 : 112, by = car ? 130 : 36, bw = car ? 64 : 96, bh = car ? 40 : 114;
    g.drawImage(car ? wtX_carArt() : wtX_wallArt(), 0, 0);
    if (car) { for (const mx of [bx + 8, bx + bw - 16]) { rect(mx, 124, 8, by - 124 - 3, P.G1); rect(mx, 124, 8, 1, P.G3); } // magnets
      line(bx + bw + 3, by + 4, bx + bw + 12, by - 5, P.G3); px(bx + bw + 12, by - 5, P.W); }
    // box shell and its open interior
    rect(bx - 3, by - 3, bw + 6, bh + 6, P.K); rect(bx - 2, by - 2, bw + 4, bh + 4, car ? P.G1 : P.G3); rect(bx - 2, by - 2, bw + 4, 1, P.W); rect(bx + bw + 1, by - 2, 1, bh + 4, P.G1);
    g.drawImage(wtX_boxInside(bw, bh), bx, by);
    if (((t * 3) | 0) % 2) { px(bx + 14, by + 16, P.RD2); }
    // the door swings open on its left hinge
    const k = clamp((t - 0.5) / 1.1, 0, 1), a = (1 - Math.cos(k * Math.PI)) / 2 * 1.85, cw = Math.cos(a), dw = Math.round(bw * Math.abs(cw)), sk = Math.round(Math.sin(a) * 10);
    if (k === 0 || dw > 0) for (let i = 0; i < Math.max(1, dw); i++) {
      const f = dw ? i / dw : 0, top = Math.round(by - 2 - f * sk / 2), h = bh + 4 + Math.round(f * sk), u = cw >= 0 ? Math.min(bw - 1, (f * bw) | 0) : bw - 1 - Math.min(bw - 1, (f * bw) | 0);
      const outside = cw >= 0, col = outside ? (car ? P.G1 : P.G3) : P.G1;
      rect(bx - 2 + i, top, 1, h, col); px(bx - 2 + i, top, P.K); px(bx - 2 + i, top + h - 1, P.K);
      if (outside) { if (u % 12 === 0) rect(bx - 2 + i, top + 1, 1, h - 2, car ? P.K : P.G1); if (i === 0 || i === dw - 1) rect(bx - 2 + i, top, 1, h, P.K);
        // louvres, warning plate, latch
        if (!car) for (let j = 0; j < 5; j++) { const ly = top + Math.round((14 + j * 5) * h / (bh + 4)); if (u > 16 && u < bw - 16) rect(bx - 2 + i, ly, 1, 2, P.K); }
        const py = top + Math.round((car ? 14 : 58) * h / (bh + 4)); if (u > 20 && u < bw - 20) rect(bx - 2 + i, py, 1, 12, u < 24 || u > bw - 25 ? P.K : car ? P.RD : P.YE);
        if (u > bw - 12 && u < bw - 6) rect(bx - 2 + i, top + Math.round(h / 2) - 4, 1, 8, P.W); }
      else { if (u > 12 && u < bw - 12) { const py = top + 12 + Math.round(f * 2); rect(bx - 2 + i, py, 1, Math.max(4, Math.round(h * 0.45)), u % 9 === 0 ? P.BL2 : P.G3); } rect(bx - 2 + i, top, 1, 1, P.K); }
    }
    if (k < 0.04) { const py = by + (car ? 14 : 58); textC('DANGER', bx + bw / 2, py + 2, car ? P.W : P.K); }
    // caption
    rect(0, 186, W, 14, P.K); rect(0, 186, W, 1, P.G1);
    textC(fitText((car ? 'CAR TRACER - ' : 'JUNCTION BOX - ') + String(opts.label || '').toUpperCase(), 300), W / 2, 189, P.YE);
    if ((t * 2 | 0) % 2 && t > 1.6) textC('press a key', W / 2, 176, P.G3);
  }
  return {
    update(dt) {
      t += dt; flash = Math.max(0, flash - dt);
      if (opening) { if (t - dt < 0.5 && t >= 0.5) { sfx.tone(140, 0.35, 'sawtooth', 0.03, 60); sfx.tone(90, 0.1, 'square', 0.04, 0, 0.45); } if (t > 3.8) opening = false; return; }
      if (over) { over.t += dt; return; } if (intro) return;
      if (arming) { const a0 = arming; arming = Math.max(0, arming - dt); if ((a0 * 4 | 0) !== (arming * 4 | 0)) sfx.tone(1200, 0.06, 'square', 0.05); if (!arming && alarmLive()) { over = { win: false, alarm: true, t: 0, why: 'An alarm is live! Somewhere a light is blinking on a security desk.' }; flash = 2; sfx.alarm(); return; } }
      time -= dt; if (time <= 0) { time = 0; over = { win: false, t: 0, why: tracer ? 'The car pulls away before your tracer is ready.' : 'Guards are coming. You pack up and keep whatever lines you have cut.' }; sfx.fail(); } },
    onKey(k) {
      if (opening) { opening = false; sfx.select(); return; }
      if (over) { if (over.t > 0.6 && (k === 'select' || k === 'fire' || k === 'menu')) done(result()); return; }
      if (intro) { if (k === 'menu') over = { win: false, t: 1, why: tracer ? 'You give up on the tracer.' : 'You close the junction box and walk away.' }; else { intro = false; sfx.select(); } return; }
      if (k === 'left') moveCur(-1, 0); else if (k === 'right') moveCur(1, 0); else if (k === 'up') moveCur(0, -1); else if (k === 'down') moveCur(0, 1);
      else if (k === 'select' || k === 'fire' || k === 'action') swap();
      else if (k === 'menu') over = { win: false, t: 1, why: tracer ? 'You give up on the tracer.' : 'You close the junction box and walk away.' };
    },
    onTap(x, y) {
      if (opening) { opening = false; sfx.select(); return; }
      if (over) { if (over.t > 0.6) done(result()); return; }
      if (intro) { intro = false; sfx.select(); return; }
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) { const [cx, cy] = chipXY(c, r); if (x >= cx - 4 && x < cx + CW + 4 && y >= cy - 4 && y < cy + CH + 4) { if (fixed[c][r]) { sfx.deny(); return; } if (cur[0] === c && cur[1] === r) swap(); else { cur = [c, r]; sfx.blip(); } return; } }
      if (y > 186 && x < 60) over = { win: false, t: 1, why: tracer ? 'You give up on the tracer.' : 'You close the junction box and walk away.' };
    },
    draw() {
      if (opening) { drawOpening(); return; }
      const sim = simulate(grid);
      g.drawImage(wtX_pcbArt(chipXY, COLS, ROWS), 0, 0);
      drawCopper(sim); g.drawImage(copper, 0, 0);
      // current pulses racing along every live trace
      const ph = (t * 24 | 0) % 8;
      for (const p of paths) { if (!pathOn(p, sim)) continue; const pts = p.pts; for (let i = ph; i < pts.length; i += 8) { g.fillStyle = P.W; g.fillRect(pts[i][0], pts[i][1], 1, 1); if (i > 0) { g.fillStyle = P.BR; g.fillRect(pts[i - 1][0], pts[i - 1][1], 1, 1); } } }
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        const [x, y] = chipXY(c, r); drawChip(hidden[c][r] ? '?' : grid[c][r], x, y, fixed[c][r], !over && !intro && cur[0] === c && cur[1] === r);
        const ci = sim.cols[c].in, co = sim.cols[c].out; lanePin(x - 2, y + 4, ci[r * 2]); lanePin(x - 2, y + 12, ci[r * 2 + 1]); lanePin(x + CW, y + 4, co[r * 2]); lanePin(x + CW, y + 12, co[r * 2 + 1]);
      }
      for (let l = 0; l < LANES; l++) drawEnd(l, sim.final[l], sim);
      // what the swap would do (easier levels): green = a phone goes dead, red = an alarm goes live
      if (preview && !over && !intro && !fixed[cur[0]][cur[1]]) {
        const g2 = grid.map(col => col.slice()); g2[cur[0]][cur[1]] = hand; const f2 = simulate(g2).final;
        for (let l = 0; l < LANES; l++) { if (f2[l] === sim.final[l]) continue; const ex = l % 2 ? 294 : 266, ey = 6 + l * 15.6 | 0; const alarmOn = ends[l] === 'alarm' && f2[l]; const col = alarmOn ? P.RD2 : ends[l] === 'alarm' ? P.GR2 : f2[l] ? P.YE : P.GR2; if (!alarmOn || (t * 3 | 0) % 2) { frame(ex - 2, ey - 1, 20, 17, col); frame(ex - 3, ey - 2, 22, 19, col); } }
      }
      drawTray();
      if ((arming && !over) || (flash > 0 && (t * 10 | 0) % 2)) { const on = (t * 8 | 0) % 2, c = on ? P.RD2 : P.YE; frame(0, 0, W, 169, c); frame(1, 1, W - 2, 167, c); frame(2, 1, W - 4, 166, P.K); }
      if (arming && !over) {
        const on = (t * 8 | 0) % 2;
        // hazard-striped warning plate
        rect(64, 66, 162, 32, P.YE); for (let x = 64; x < 226; x++) for (const yy of [66, 67, 68, 95, 96, 97]) if (((x - yy) >> 2) % 2) px(x, yy, P.K);
        for (let y = 69; y < 95; y++) for (const xx of [64, 65, 66, 223, 224, 225]) if (((xx - y) >> 2) % 2) px(xx, y, P.K);
        msgBox(70, 70, 150, 24); textC('ALARM ARMING - SWAP BACK!', 145, 74, on ? P.RD2 : P.YE); textC(arming.toFixed(1) + ' s', 145, 83, P.W);
      }
      if (intro && !over) {
        drawBriefing();
        textC(tracer ? 'CAR TRACER' : 'WIRETAP: THE JUNCTION BOX', W / 2, 20, P.YE);
        const lines = tracer ? ['Power flows left to right through the chips.', 'Cut the power to ' + need + ' of the numbered tracer settings.'] : ['Power flows left to right through the chips.', 'Kill the power to every PHONE (right-hand side).', 'A dead phone line is a tapped phone line.'];
        lines.push('Never let power reach an ALARM (the bells).', 'Move with the arrows, Enter swaps the chip under the', 'cursor with the one in your HAND. On touch: tap a chip,', 'then tap it again to swap.', 'Framed chips are soldered in. ? chips are unknown.', 'If an alarm lights up, swap straight back!');
        lines.forEach((l, i) => text(l, 15, 31 + i * 9, i < (tracer ? 2 : 3) ? P.W : P.G3));
        const ly = 113; [['S', 'straight'], ['X', 'cross'], ['D', 'down'], ['U', 'up'], ['T', 'flip']].forEach(([k2, lab], i) => { const lx = 40 + i * 52; drawChip(k2, lx, ly, false, false, true); textC(lab, lx + 8, ly + 19, P.CY); });
        if (eff >= 1) text('T, B and I chips flip lanes: live becomes dead, dead live.', 15, 144, P.G3);
        if (preview) text('Frames on the right preview a swap: green cut, red alarm.', 15, eff >= 1 ? 153 : 144, P.GR2);
        if ((t * 2 | 0) % 2) textC('Press a key to start the clock', W / 2, 162, P.YE);
      }
      if (over) {
        const good = over.win || (!tracer && !over.alarm && cutCount());
        rect(38, 54, W - 76, 62, P.K); bevel(39, 55, W - 78, 60, P.G1, P.G3, P.K); frame(41, 57, W - 82, 56, P.K);
        rect(42, 58, W - 84, 54, P.K); rect(42, 58, W - 84, 15, good ? P.GR : P.RD); rect(42, 72, W - 84, 1, good ? P.GR2 : P.RD2);
        for (let x = 44; x < W - 44; x += 2) px(x, 59, good ? P.GR2 : P.RD2);
        const title = over.win ? (tracer ? 'TRACER SET' : 'ALL PHONES TAPPED') : over.alarm ? 'ALARM!' : (!tracer && cutCount() ? cutCount() + ' PHONES TAPPED' : 'NO TAP');
        textC(title, W / 2 + 1, 63, P.K); textC(title, W / 2, 62, P.W);
        // a little icon either side of the title
        const ic = over.alarm ? wtX_bell(true) : wtX_phone(!good); g.drawImage(ic, 50, 58); g.drawImage(ic, W - 66, 58);
        para(over.win ? (tracer ? 'The tracer is live. You can follow the car at a safe distance.' : 'Every phone is dead and nobody noticed. Your bugs are on the lines.') : over.why, 52, 78, W - 104, P.W, 9);
        if (over.t > 0.6 && (t * 2 | 0) % 2) textC('Press a key', W / 2, 102, P.G3);
      }
    },
  };
}
