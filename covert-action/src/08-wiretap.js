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
// ---------- junction-box art, drawn on the fine (2x) grid (prefix wtX_) ----------
// key light: a work lamp at the upper left, warm; fill: cool night blue.
const wtX_C = {
  // solder mask, cool shadow -> warm highlight
  m0: '#051410', m1: '#0a231d', m2: '#0f3228', m3: '#154330', m4: '#1e5739', m5: '#357149',
  // copper under the mask (no power) and lit copper (power)
  cuS: '#07201a', cu1: '#2b6a3e', cu2: '#5c9a5a', bot: '#0d3024',
  li0: '#6e320c', li1: '#d8862a', li2: '#ffc453', li3: '#fff4cc',
  silk: '#dfe2d2', silk2: '#9fb3a0',
  tin0: '#3a3f47', tin1: '#858c94', tin2: '#c3cace', tin3: '#f3f6f6',
  ep0: '#07080b', ep1: '#14161c', ep2: '#1f222a', ep3: '#2f343f', ep4: '#5a6274',
  ink: '#92e2ff', inkS: '#0b2230', bub: '#ffd25a',
  gold0: '#5e3f12', gold1: '#a47a2c', gold2: '#dab058', gold3: '#fbe6a2',
};
function wtX_lin(x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
function wtX_rad(x, y, r0, r1, stops) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
function wtX_rr(x, y, w, h, r, c) { g.fillStyle = c; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); }
function wtX_poly(pts, c) { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); }
function wtX_ell(x, y, rx, ry, c) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); }
function wtX_line(pts, c, w) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }
function wtX_big(fn) { g.save(); g.scale(RES, RES); try { fn(); } finally { g.restore(); } } // layout-scale UI text inside an art() canvas
// 3x5 silkscreen lettering, drawn on the fine grid (sc = cell size)
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
function wtX_ft(s, x, y, col, sc = 1) {
  g.fillStyle = col;
  for (const ch of String(s)) { const gl = wtX_T3[ch]; if (gl) gl.split(',').forEach((r, j) => { for (let i = 0; i < 3; i++) if (r[i] === '#') g.fillRect(x + i * sc, y + j * sc, sc, sc); }); x += 4 * sc; }
}
const wtX_ftW = (s, sc = 1) => (String(s).length * 4 - 1) * sc;
// a slotted screw head, fine px
function wtX_screw(cx, cy, r) {
  wtX_ell(cx + 1, cy + 1.5, r + 1, r + 1, 'rgba(0,0,0,0.45)');
  wtX_ell(cx, cy, r + 1, r + 1, '#1a1d22');
  g.fillStyle = wtX_lin(cx - r, cy - r, cx + r, cy + r, [[0, '#e4e8ea'], [0.45, '#9aa1a8'], [1, '#474d56']]); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
  wtX_line([[cx - r * 0.7, cy + r * 0.55], [cx + r * 0.7, cy - r * 0.55]], '#2a2e35', 1.6);
  wtX_line([[cx - r * 0.6, cy + r * 0.75], [cx + r * 0.75, cy - r * 0.3]], 'rgba(255,255,255,0.35)', 0.8);
}
// the route symbol printed on a chip, fine px relative to the package body at (bx,by)
function wtX_glyph(type, bx, by, col, sh, bub) {
  const c = CHIPS[type], L = bx + 5, R = bx + 27, T = by + 9, B = by + 25;
  const arrow = (x, y, dx, dy, cc, o) => { const n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n; wtX_poly([[x + o + ux * 2, y + o + uy * 2], [x + o - ux * 5 - uy * 4, y + o - uy * 5 + ux * 4], [x + o - ux * 5 + uy * 4, y + o - uy * 5 - ux * 4]], cc); };
  const draw = (cc, bc, o) => {
    g.lineCap = 'round';
    const lane = (y, inv) => {
      if (inv) { rect(L + o, y - 1 + o, 5, 2, cc); g.strokeStyle = bc; g.lineWidth = 1.7; g.beginPath(); g.arc(L + 9 + o, y + o, 3.3, 0, Math.PI * 2); g.stroke(); rect(L + 13 + o, y - 1 + o, R - L - 16, 2, cc); }
      else rect(L + o, y - 1 + o, R - L - 3, 2, cc);
      arrow(R - 2, y, 1, 0, cc, o);
    };
    if (c.route === 'straight') { lane(T, c.inv[0]); lane(B, c.inv[1]); return; }
    const segs = c.route === 'cross' ? [[T, B], [B, T]] : c.route === 'down' ? [[T, B]] : [[B, T]];
    for (const [y0, y1] of segs) {
      const x0 = L + 3, x1 = R - 5, dx = x1 - x0, dy = y1 - y0;
      rect(L + o, y0 - 1 + o, 4, 2, cc);
      wtX_line([[x0 + o, y0 + o], [x1 + o, y1 + o]], cc, 2.2);
      arrow(x1 + dx * 0.06, y1 + dy * 0.06, dx, dy, cc, o);
    }
  };
  draw(sh, sh, 1); draw(col, bub, 0);
}
// a DIP package, 28x24 layout, body at fine (12,8): in its socket, soldered in (framed), or bare in the tweezers
function wtX_chip(type, isFixed, sel, bare) {
  return art('wtX_chip' + type + (isFixed ? 1 : 0) + (sel ? 1 : 0) + (bare ? 1 : 0), 28, 24, () => {
    const C = wtX_C, bx = 12, by = 8, socket = !isFixed && !bare, rows = [by + 9, by + 17, by + 25];
    if (isFixed && !bare) { // silkscreened keep-out frame: this one is soldered to the board
      g.fillStyle = C.silk; g.fillRect(2, 2, 52, 2); g.fillRect(2, 44, 52, 2); g.fillRect(2, 2, 2, 44); g.fillRect(52, 2, 2, 44);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(4, 4, 48, 1); g.fillRect(4, 4, 1, 40);
    }
    if (socket) { // turned-pin DIP socket
      wtX_rr(bx - 4, by - 1, 44, 38, 3, 'rgba(0,8,4,0.5)');
      wtX_rr(bx - 6, by - 3, 44, 38, 2, '#17161b');
      rect(bx - 5, by - 3, 42, 1, '#46444f'); rect(bx - 6, by - 2, 1, 35, '#2e2d35'); rect(bx - 5, by + 34, 42, 1, '#08080a');
      rect(bx - 1, by - 1, 34, 34, '#0b0b0e');
      for (const cy of rows) for (const sx of [bx - 5, bx + 33]) { rect(sx, cy - 3, 4, 6, C.gold1); rect(sx, cy - 3, 4, 1, C.gold3); rect(sx, cy + 2, 4, 1, C.gold0); rect(sx + 1, cy - 1, 2, 2, '#3a2a10'); }
    } else wtX_rr(bx - 2, by + 3, 38, 33, 3, bare ? 'rgba(0,0,0,0.45)' : 'rgba(0,8,4,0.5)');
    if (isFixed && !bare) for (const cy of rows) for (const sx of [bx - 5, bx + 37]) { // solder fillets
      wtX_ell(sx, cy + 0.5, 3.4, 3.4, C.tin0); wtX_ell(sx, cy, 3, 3, C.tin1); wtX_ell(sx - 1, cy - 1, 1.4, 1.2, C.tin3); }
    // tinned legs; the middle pair carries nothing
    rows.forEach((cy, k) => { for (const sx of [bx - 4, bx + 32]) { rect(sx, cy - 2, 4, 4, k === 1 ? C.tin0 : C.tin1); rect(sx, cy - 2, 4, 1, k === 1 ? C.tin1 : C.tin3); rect(sx, cy + 1, 4, 1, '#30353c'); } });
    // the package
    const pal = sel ? { e: '#070c1c', a: '#3a5c9c', b: '#223a70', c: '#142348', hi: '#8eacea', lo: '#060a16', ink: '#ffffff', sh: '#08112a', bub: '#ffd25a' }
      : isFixed ? { e: '#120d0b', a: '#5b4a3f', b: '#3f332c', c: '#281f1b', hi: '#8f7b6a', lo: '#0c0907', ink: '#3b2206', sh: '#fff3c4', bub: '#9a2412' }
      : { e: '#040506', a: C.ep3, b: C.ep2, c: C.ep1, hi: C.ep4, lo: C.ep0, ink: C.ink, sh: C.inkS, bub: C.bub };
    wtX_rr(bx, by, 32, 32, 3, pal.e);
    wtX_rr(bx + 1, by + 1, 30, 30, 2, wtX_lin(bx, by, bx + 30, by + 32, [[0, pal.a], [0.5, pal.b], [1, pal.c]]));
    rect(bx + 3, by + 1, 26, 1, pal.hi); rect(bx + 1, by + 3, 1, 25, mix(pal.a, pal.hi, 0.5)); rect(bx + 3, by + 30, 26, 1, pal.lo); rect(bx + 30, by + 3, 1, 26, pal.lo);
    if (isFixed) { // gold-lidded ceramic package
      wtX_rr(bx + 3, by + 3, 26, 26, 2, '#2a1c0c');
      wtX_rr(bx + 4, by + 4, 24, 24, 2, wtX_lin(bx + 4, by + 4, bx + 28, by + 28, [[0, C.gold3], [0.35, C.gold2], [1, C.gold1]]));
      rect(bx + 5, by + 4, 22, 1, '#fff6d0'); rect(bx + 5, by + 27, 22, 1, C.gold0);
    } else { // glossy epoxy: a soft sheen across the lit corner
      wtX_poly([[bx + 2, by + 2], [bx + 18, by + 2], [bx + 2, by + 18]], 'rgba(255,255,255,0.05)');
      wtX_line([[bx + 4, by + 13], [bx + 13, by + 4]], 'rgba(255,255,255,0.10)', 1.2);
    }
    // pin-1 notch and ejector dimple
    g.fillStyle = pal.lo; g.beginPath(); g.arc(bx + 1, by + 17, 3.5, -Math.PI / 2, Math.PI / 2); g.fill();
    rect(bx + 1, by + 20, 2, 1, mix(pal.b, pal.hi, 0.6));
    wtX_ell(bx + 25, by + 25, 2.2, 2.2, isFixed ? C.gold1 : pal.c); rect(bx + 25, by + 26, 2, 1, isFixed ? C.gold3 : pal.hi);
    if (type === '?') { wtX_big(() => textC('?', (bx + 16) / 2 + 0.5, (by + 8) / 2 + 0.5, '#1a1200')); wtX_big(() => textC('?', (bx + 16) / 2, (by + 8) / 2, '#ffd84a')); return; }
    wtX_glyph(type, bx, by, pal.ink, pal.sh, pal.bub);
  });
}
// ---------- the board ----------
function wtX_pcbArt(chipXY, COLS, ROWS) {
  return art('wtX_pcb3', 320, 169, () => {
    const C = wtX_C;
    // steel enclosure seen past the board edge
    g.fillStyle = wtX_lin(0, 0, 0, 338, [[0, '#2c3038'], [1, '#131519']]); g.fillRect(0, 0, 640, 338);
    rect(0, 0, 640, 1, '#747c88'); rect(0, 1, 640, 1, '#474c56');
    // the board: green solder mask under the work lamp
    g.fillStyle = wtX_lin(0, 0, 640, 338, [[0, C.m4], [0.4, C.m3], [1, C.m1]]); g.fillRect(4, 4, 632, 330);
    g.fillStyle = wtX_rad(80, 20, 0, 470, [[0, 'rgba(255,232,160,0.17)'], [0.5, 'rgba(255,232,160,0.05)'], [1, 'rgba(255,232,160,0)']]); g.fillRect(4, 4, 632, 330);
    g.fillStyle = wtX_rad(320, 170, 230, 430, [[0, 'rgba(0,6,10,0)'], [1, 'rgba(0,6,10,0.38)']]); g.fillRect(4, 4, 632, 330);
    rect(4, 4, 632, 2, C.m5); rect(4, 6, 2, 328, mix(C.m5, C.m3, 0.5)); rect(4, 332, 632, 2, C.m0); rect(634, 4, 2, 330, C.m0);
    // silkscreen: part numbers, jack numbers, pin-1 marks
    for (let c = 0; c < COLS; c++) for (let rr = 0; rr < ROWS; rr++) { const [cx, cy] = chipXY(c, rr), lab = 'U' + (c * ROWS + rr + 1);
      wtX_ft(lab, cx * 2 + 16 - (wtX_ftW(lab) >> 1), cy * 2 + 40, C.silk); rect(cx * 2 - 9, cy * 2 - 4, 2, 2, C.silk2); }
    for (let l = 0; l < ROWS * 2; l++) { const ex = l % 2 ? 294 : 266, ey = 6 + l * 15.6 | 0, lab = 'J' + (l + 1); wtX_ft(lab, ex * 2 - 5 - wtX_ftW(lab), ey * 2 + 5, C.silk); }
    // maker's legend across the top
    wtX_ft('LIU-7 LINE INTERFACE', 78, 7, C.silk, 2); wtX_ft('REV.C', 250, 7, C.silk2, 2);
    // a yellow caution sticker
    wtX_rr(301, 5, 86, 14, 2, 'rgba(0,0,0,0.35)'); wtX_rr(300, 4, 86, 14, 2, '#e9c43c'); rect(302, 4, 82, 1, '#fff0a0');
    wtX_poly([[305, 16], [311, 6], [317, 16]], '#1a1406'); rect(310, 9, 2, 4, '#e9c43c'); rect(310, 14, 2, 1, '#e9c43c');
    wtX_ft('CAUTION', 322, 7, '#1a1406', 2);
    // HC-49 crystal can
    wtX_rr(400, 5, 34, 14, 7, '#10141a'); wtX_rr(401, 5, 32, 13, 6.5, wtX_lin(0, 5, 0, 18, [[0, '#f2f5f6'], [0.35, '#aab2b8'], [1, '#4a5058']])); rect(408, 6, 18, 1, '#ffffff');
    wtX_ft('Y1', 438, 8, C.silk);
    // electrolytic can, seen from above
    wtX_ell(508, 322, 13, 13, 'rgba(0,0,0,0.45)'); wtX_ell(506, 320, 13, 13, '#16305c'); wtX_ell(506, 320, 11, 11, wtX_lin(496, 310, 516, 330, [[0, '#e8ecee'], [0.5, '#a8b0b6'], [1, '#5c646c']]));
    g.strokeStyle = 'rgba(40,46,54,0.8)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(506, 312); g.lineTo(506, 328); g.moveTo(498, 320); g.lineTo(514, 320); g.stroke();
    g.strokeStyle = '#c8d0e0'; g.lineWidth = 2; g.beginPath(); g.arc(506, 320, 12, 0.3, 1.3); g.stroke();
    wtX_ft('C1', 482, 324, C.silk);
    // legend along the bottom, a QC sticker
    wtX_ft('(C)1990  MADE IN U.S.A.', 92, 322, C.silk, 2); wtX_ft('QC PASSED', 300, 322, C.silk2, 2);
    wtX_ell(384, 327, 6, 6, 'rgba(0,0,0,0.35)'); wtX_ell(383, 326, 6, 6, '#3cc86a'); wtX_ft('QC', 377, 324, '#0a3a1a');
    wtX_ft('+5V', 28, 304, C.li2, 2);
    // mounting screws
    wtX_screw(44, 15, 6); wtX_screw(62, 320, 6); wtX_screw(606, 20, 6); wtX_screw(626, 324, 5);
  });
}
// ---------- end-of-line devices (16x15 layout) ----------
function wtX_phone(live) {
  return art('wtX_ph' + (live ? 1 : 0), 16, 15, () => {
    const r = live ? ['#4a3c30', '#8c765a', '#c4ab84', '#e8d6ae', '#fff3d8'] : ['#15171d', '#262a33', '#3a3f4a', '#525866', '#6c7382'];
    wtX_ell(17, 27, 14, 3, 'rgba(0,0,0,0.5)');
    // base
    wtX_poly([[5, 14], [27, 14], [31, 27], [1, 27]], r[0]);
    wtX_poly([[6, 14], [26, 14], [29, 25], [3, 25]], wtX_lin(0, 14, 0, 26, [[0, r[3]], [1, r[2]]]));
    rect(6, 14, 20, 1, r[4]); rect(3, 25, 26, 2, r[1]);
    // push-buttons
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { rect(10 + i * 4, 16 + j * 3, 3, 2, r[1]); rect(10 + i * 4, 16 + j * 3, 3, 1, r[4]); }
    // handset in its cradle
    wtX_rr(1, 4, 10, 9, 4, r[0]); wtX_rr(21, 4, 10, 9, 4, r[0]);
    wtX_rr(2, 4, 8, 7, 3, r[2]); wtX_rr(22, 4, 8, 7, 3, r[2]); rect(3, 4, 6, 1, r[4]); rect(23, 4, 6, 1, r[4]);
    wtX_rr(4, 2, 24, 5, 2.5, r[0]); wtX_rr(4, 2, 24, 4, 2, wtX_lin(0, 2, 0, 6, [[0, r[4]], [1, r[3]]]));
    // coiled cord
    g.strokeStyle = r[1]; g.lineWidth = 1.2; g.beginPath(); for (let i = 0; i < 5; i++) g.arc(1.5, 14 + i * 2.4, 1.3, -1.6, 1.6); g.stroke();
    // line lamp: lit while the phone still has power
    if (live) { wtX_ell(26.5, 17.5, 4, 4, 'rgba(255,190,70,0.35)'); wtX_ell(26.5, 17.5, 1.8, 1.8, '#ffc84a'); rect(26, 17, 1, 1, '#fff6d8'); }
    else wtX_ell(26.5, 17.5, 1.6, 1.6, '#101216');
  });
}
function wtX_bell(lit) {
  return art('wtX_bl' + (lit ? 1 : 0), 16, 15, () => {
    const r = lit ? ['#4a0e08', '#98241a', '#dc4a2a', '#ff9a64', '#fff0d0'] : ['#3a2810', '#6c4e1e', '#a47f38', '#d8b664', '#fbeab4'];
    wtX_ell(17, 27.5, 12, 2.5, 'rgba(0,0,0,0.5)');
    if (lit) { g.fillStyle = wtX_rad(16, 15, 2, 16, [[0, 'rgba(255,80,40,0.55)'], [1, 'rgba(255,60,30,0)']]); g.fillRect(0, 0, 32, 30); }
    // the bell: dome flaring to a rolled lip
    const bell = () => { g.beginPath(); g.moveTo(8, 21); g.bezierCurveTo(8, 12, 10, 7, 16, 7); g.bezierCurveTo(22, 7, 24, 12, 24, 21); g.lineTo(28, 24); g.lineTo(4, 24); g.closePath(); };
    g.fillStyle = r[0]; g.save(); g.translate(0, 0.8); bell(); g.fill(); g.restore();
    g.fillStyle = wtX_lin(5, 0, 27, 0, [[0, r[1]], [0.22, r[3]], [0.34, r[4]], [0.5, r[3]], [0.8, r[2]], [1, r[1]]]); bell(); g.fill();
    wtX_ell(16, 24, 12, 2.4, r[1]); wtX_ell(16, 23.4, 11.5, 1.6, r[3]); rect(8, 22, 5, 1, r[4]);
    // clapper
    wtX_ell(16, 26.5, 2.3, 2, '#1c1a18'); rect(15, 25, 1, 1, '#8a8278');
    // strobe on top
    rect(15, 5, 2, 3, '#1c1e22');
    wtX_ell(16, 4, 4.2, 3.2, '#101114');
    if (lit) { wtX_ell(16, 4, 3.4, 2.6, '#ff4a30'); wtX_ell(15, 3.2, 1.6, 1.1, '#ffe0d0'); }
    else { wtX_ell(16, 4, 3.4, 2.6, '#5a1612'); rect(14, 2, 2, 1, '#a0453a'); }
  });
}
function wtX_dial(on, n) {
  return art('wtX_dial' + (on ? 1 : 0) + n, 16, 15, () => {
    wtX_rr(1, 1, 31, 29, 3, 'rgba(0,0,0,0.5)');
    wtX_rr(0, 0, 31, 28, 3, '#15181d'); wtX_rr(1, 1, 29, 26, 2, wtX_lin(0, 0, 30, 28, [[0, '#6c7480'], [0.5, '#474e5a'], [1, '#2c3139']])); rect(3, 1, 25, 1, '#a8b0bc');
    // ticks around the knob
    g.strokeStyle = '#d0d6de'; g.lineWidth = 1; g.beginPath();
    for (let i = 0; i < 7; i++) { const a = Math.PI * (0.75 + i * 0.25); g.moveTo(11 + Math.cos(a) * 9, 15 + Math.sin(a) * 9); g.lineTo(11 + Math.cos(a) * 10.8, 15 + Math.sin(a) * 10.8); } g.stroke();
    wtX_ell(12, 16, 7.5, 7.5, 'rgba(0,0,0,0.5)');
    g.fillStyle = wtX_rad(9, 12, 0.5, 8, [[0, '#6a7080'], [0.5, '#262a32'], [1, '#0c0d10']]); g.beginPath(); g.arc(11, 15, 7, 0, 7); g.fill();
    const a = on ? -Math.PI / 4 : Math.PI * 0.75; wtX_line([[11, 15], [11 + Math.cos(a) * 6, 15 + Math.sin(a) * 6]], '#f4f4ee', 1.6);
    // setting lamp and number
    wtX_ell(25, 6, 3.4, 3.4, '#0c0d10');
    if (on) { wtX_ell(25, 6, 5, 5, 'rgba(255,70,40,0.35)'); wtX_ell(25, 6, 2.5, 2.5, '#ff4a30'); rect(24, 5, 1, 1, '#ffe0d0'); } else wtX_ell(25, 6, 2.5, 2.5, '#4a1410');
    wtX_ft(String(n), 21, 15, on ? '#ffffff' : '#8a929e', 2);
  });
}
// ---------- the technician's tray under the box ----------
function wtX_trayArt() {
  return art('wtX_tray3', 320, 31, () => {
    g.fillStyle = wtX_lin(0, 0, 0, 62, [[0, '#3a3f48'], [0.5, '#262a31'], [1, '#17191e']]); g.fillRect(0, 0, 640, 62);
    rect(0, 0, 640, 1, '#08090b'); rect(0, 1, 640, 1, '#a0a8b2'); rect(0, 2, 640, 1, '#5e6570'); rect(0, 61, 640, 1, '#060708');
    const well = (x, y, w, h) => { rect(x - 1, y - 1, w + 2, h + 2, '#0a0b0e'); rect(x, y + h, w, 1, '#5a616c'); rect(x + w, y, 1, h + 1, '#474d57'); };
    // power pack: +5V and GND binding posts
    well(6, 6, 108, 32); g.fillStyle = wtX_lin(0, 6, 0, 38, [[0, '#24262b'], [1, '#141518']]); g.fillRect(6, 6, 108, 32);
    for (const [cy, a, b, c] of [[14, '#ff7a5a', '#c42a1c', '#5a0c08'], [29, '#8a8f98', '#3a3d44', '#101114']]) {
      wtX_ell(21, cy + 1, 6, 6, 'rgba(0,0,0,0.6)'); g.fillStyle = wtX_rad(18, cy - 3, 0.5, 7, [[0, a], [0.5, b], [1, c]]); g.beginPath(); g.arc(20, cy, 5.5, 0, 7); g.fill();
      wtX_ell(20, cy, 1.6, 1.6, '#0a0a0c'); }
    wtX_big(() => { text('+5V', 16, 4, '#ff6a52'); text('GND', 16, 11, '#9aa0aa'); });
    wtX_ell(79, 15, 4, 4, 'rgba(90,255,110,0.25)'); wtX_ell(79, 15, 2.2, 2.2, '#6aff7a'); rect(78, 14, 1, 1, '#eaffea'); wtX_ft('PWR', 86, 13, '#8a929e');
    // quit button
    wtX_rr(6, 41, 108, 20, 4, '#0a0b0d'); wtX_rr(7, 41, 106, 18, 3, wtX_lin(0, 41, 0, 59, [[0, '#e04a34'], [0.5, '#b02a1c'], [1, '#6e140e']])); rect(10, 42, 100, 1, '#ff9a80');
    // yellow legal pad
    well(120, 4, 256, 54); rect(120, 4, 256, 54, '#1a1c20');
    wtX_poly([[128, 10], [374, 10], [374, 56], [128, 58]], 'rgba(0,0,0,0.5)');
    g.fillStyle = wtX_lin(124, 6, 372, 56, [[0, '#fff08e'], [1, '#e8cc62']]); g.fillRect(124, 6, 248, 50);
    rect(124, 6, 248, 5, '#b0342a'); rect(124, 6, 248, 1, '#e86a58'); rect(124, 11, 248, 1, '#6e1812');
    rect(124, 35, 248, 1, '#7a9ad8'); rect(124, 55, 248, 1, '#7a9ad8'); rect(132, 12, 1, 44, '#e0584a');
    wtX_poly([[362, 56], [372, 46], [372, 56]], '#1a1c20'); wtX_poly([[362, 56], [372, 46], [362, 46]], '#c8ae50');
    // anti-static foam
    well(382, 4, 128, 54); g.fillStyle = wtX_lin(382, 4, 510, 58, [[0, '#2e2e36'], [1, '#1c1c22']]); g.fillRect(382, 4, 128, 54);
    rect(382, 4, 128, 2, '#0e0e12'); rect(382, 4, 2, 54, '#0e0e12');
    // countdown timer module
    well(516, 4, 116, 54); g.fillStyle = wtX_lin(0, 4, 0, 58, [[0, '#2c3038'], [1, '#17191d']]); g.fillRect(516, 4, 116, 54); rect(516, 4, 116, 1, '#6a7280');
    wtX_ft('TIMER', 524, 9, '#b8c0cc', 2);
    for (const bx of [604, 616]) { wtX_rr(bx, 8, 8, 8, 2, '#0a0b0d'); wtX_rr(bx, 8, 7, 7, 2, '#4a505a'); rect(bx + 1, 8, 5, 1, '#8a929e'); }
    rect(521, 21, 108, 32, '#060607'); rect(521, 52, 108, 1, '#6a7280');
    g.fillStyle = wtX_lin(0, 22, 0, 52, [[0, '#240607'], [1, '#150303']]); g.fillRect(523, 23, 104, 28);
    wtX_poly([[523, 23], [560, 23], [540, 51], [523, 51]], 'rgba(255,255,255,0.035)');
  });
}
// tweezers gripping the spare chip from the right; 32x22 layout at (x, y-3)
function wtX_tweezArt() {
  return art('wtX_tweez3', 32, 22, () => {
    const top = [[3, 2], [30, 2], [61, 18.5], [61, 21.5], [29, 6], [3, 6]], bot = top.map(([x, y]) => [x, 44 - y]);
    for (const pts of [top, bot]) wtX_poly(pts.map(([x, y]) => [x + 2, y + 3]), 'rgba(0,0,0,0.4)');
    g.lineCap = 'round';
    for (const [pts, up] of [[top, 1], [bot, 0]]) {
      wtX_poly(pts, up ? '#aab3ba' : '#858e97');
      wtX_line(up ? [pts[0], pts[1], pts[2]] : [pts[5], pts[4], pts[3]], '#f4f7f8', 1);
      wtX_line(up ? [pts[5], pts[4], pts[3]] : [pts[0], pts[1], pts[2]], '#40474e', 1);
      for (let i = 0; i < 3; i++) { const x = 38 + i * 5, y = up ? 5.5 + (x - 30) * 0.5 : 38.5 - (x - 30) * 0.5; rect(x, y - 1.5, 1, 3, '#4a5158'); }
    }
    wtX_rr(57, 17, 7, 10, 4, '#3a4148'); wtX_rr(57, 17, 6, 9, 4, '#c0c8ce'); rect(58, 18, 3, 1, '#ffffff');
  });
}
// ---------- opening shot: the box on the wall (tap) or under the car (tracer) ----------
// Wall: night alley. Key: a gooseneck lamp upper-left (warm tungsten); fill: cold night from the right.
// Brick ramp shifts from lamp-orange to violet in the dark; the box casts a long shadow down-right.
function wtX_wallArt() {
  return art('wtX_wall3', 320, 200, () => {
    const LX = 62, LY = 34;
    const ramp = ['#15111d', '#201726', '#2f1d2c', '#422430', '#5a2d32', '#763836', '#94473a', '#b25a42', '#cf744e'];
    const mort = ['#0f0c15', '#18131e', '#221b28', '#2e2530', '#3e3238', '#524240', '#6a5648', '#826a54', '#9a7e62'];
    const lum = (x, y) => Math.max(0, 1 - Math.hypot(x - LX, (y - LY) * 1.2) / 470) ** 1.5;
    for (let row = 0; row < 26; row++) { const y0 = row * 14, off = row % 2 ? 18 : 0;
      for (let x0 = -off - 18; x0 < 640; x0 += 36) {
        const v = lum(x0 + 18, y0 + 7), h = (((row + 3) * 7919 + (x0 + 60) * 104729) % 997) / 997;
        const k = clamp(v * 8.6 + (h - 0.5) * 0.8 + 0.15, 0, 8), i = Math.floor(k);
        rect(x0, y0, 36, 14, mort[clamp(Math.round(v * 8.6), 0, 8)]);
        rect(x0, y0, 34, 12, ramp[i]);
        rect(x0, y0, 34, 1, ramp[Math.min(8, i + 1)]); rect(x0, y0 + 1, 1, 11, ramp[Math.min(8, i + 1)]);
        rect(x0 + 1, y0 + 11, 33, 1, ramp[Math.max(0, i - 1)]); rect(x0 + 33, y0 + 1, 1, 11, ramp[Math.max(0, i - 1)]);
        if (h < 0.06) wtX_poly([[x0 + 22, y0], [x0 + 34, y0], [x0 + 34, y0 + 6]], mort[clamp(Math.round(v * 8.6), 0, 8)]); // chipped corner
      } }
    // warm spill around the lamp
    g.fillStyle = wtX_rad(LX, LY + 6, 4, 190, [[0, 'rgba(255,196,120,0.30)'], [0.4, 'rgba(255,170,100,0.10)'], [1, 'rgba(255,160,90,0)']]); g.fillRect(0, 0, 400, 260);
    // cold rim of night on the right
    g.fillStyle = wtX_lin(420, 0, 640, 0, [[0, 'rgba(60,80,140,0)'], [1, 'rgba(60,80,140,0.12)']]); g.fillRect(420, 0, 220, 352);
    // shadows cast by the box and its conduits
    const sh = 'rgba(8,4,16,0.55)';
    wtX_poly([[222, 70], [426, 70], [446, 84], [446, 324], [242, 324], [222, 310]], sh);
    wtX_poly([[312, 0], [328, 0], [342, 70], [326, 70]], sh); wtX_poly([[300, 306], [316, 306], [336, 352], [320, 352]], sh);
    // a torn notice pasted on the bricks, in the gloom
    wtX_poly([[466, 132], [528, 128], [532, 206], [470, 210]], 'rgba(0,0,0,0.3)');
    wtX_poly([[462, 128], [524, 124], [528, 200], [500, 202], [494, 194], [484, 203], [466, 204]], '#3e3a46');
    wtX_poly([[462, 128], [524, 124], [525, 134], [463, 138]], '#4c4656'); rect(470, 146, 44, 6, '#2c2834'); for (let i = 0; i < 5; i++) rect(470, 160 + i * 7, 36 + (i * 11) % 14, 2, '#36323e');
    // drainpipe on the right, lit by the cold fill
    wtX_poly([[574, 0], [596, 0], [608, 352], [586, 352]], 'rgba(8,4,16,0.4)');
    g.fillStyle = wtX_lin(560, 0, 580, 0, [[0, '#1a1c26'], [0.5, '#262a36'], [0.85, '#3a4458'], [1, '#6a7ea4']]); g.fillRect(560, 0, 20, 352);
    rect(560, 0, 1, 352, '#0c0d12');
    for (const y of [60, 200, 330]) { rect(556, y, 28, 8, '#14161c'); rect(556, y, 28, 2, '#3c4456'); rect(582, y, 2, 8, '#7a8cb0'); }
    // conduits into the top and bottom of the box: galvanised, lit from the left
    const pipe = (x, y0, y1) => { g.fillStyle = wtX_lin(x, 0, x + 16, 0, [[0, '#c9ced4'], [0.25, '#9aa2ac'], [0.7, '#4e5560'], [1, '#262a32']]); g.fillRect(x, y0, 16, y1 - y0); };
    pipe(312, 0, 70); pipe(300, 306, 356);
    for (const [x, y] of [[308, 32], [296, 324]]) { g.fillStyle = wtX_lin(x, 0, x + 24, 0, [[0, '#e0e4e8'], [0.3, '#a8b0b8'], [1, '#30353e']]); g.fillRect(x, y, 24, 6); rect(x, y + 6, 24, 1, '#15171c'); }
    // the box shell (the door is drawn over it)
    const bx = 218, by = 66, bw = 204, bh = 240;
    rect(bx - 2, by - 2, bw + 4, bh + 4, '#0e1214');
    g.fillStyle = wtX_lin(bx, by, bx + bw, by + bh, [[0, '#8e9c92'], [0.5, '#5e6c64'], [1, '#3a4540']]); g.fillRect(bx, by, bw, bh);
    rect(bx, by, bw, 2, '#b8c6b8'); rect(bx, by, 2, bh, '#a0aea2'); rect(bx, by + bh - 2, bw, 2, '#2a3230'); rect(bx + bw - 2, by, 2, bh, '#2a3230');
    rect(bx + 4, by + 4, bw - 8, bh - 8, '#0c0f10');
    // hinges on the left
    for (const hy of [by + 24, by + bh - 44]) { g.fillStyle = wtX_lin(bx - 6, 0, bx + 2, 0, [[0, '#d4dad4'], [0.5, '#7e8a84'], [1, '#2e3634']]); g.fillRect(bx - 6, hy, 8, 20); rect(bx - 6, hy, 8, 1, '#f0f4f0'); rect(bx - 6, hy + 19, 8, 1, '#1a1e1e'); }
    // the lamp: gooseneck arm, enamel shade, glowing bulb
    g.fillStyle = wtX_lin(0, 10, 0, 18, [[0, '#6a6e76'], [1, '#1c1e24']]); g.fillRect(0, 12, 60, 5);
    wtX_line([[58, 14], [64, 16], [66, 22]], '#2a2c32', 5); wtX_line([[57, 13], [63, 15]], '#8a8e96', 1.5);
    rect(0, 6, 8, 18, '#16181c'); rect(0, 6, 8, 2, '#50545c');
    wtX_poly([[54, 22], [78, 22], [90, 34], [42, 34]], '#1f3a2c'); wtX_poly([[54, 22], [66, 22], [58, 34], [42, 34]], '#3f6a50'); rect(54, 22, 24, 1, '#6a9a7a');
    g.fillStyle = wtX_rad(66, 36, 1, 30, [[0, 'rgba(255,240,190,0.9)'], [0.3, 'rgba(255,210,130,0.4)'], [1, 'rgba(255,190,110,0)']]); g.fillRect(30, 20, 72, 50);
    wtX_ell(66, 35, 14, 3, '#fff2c4'); wtX_ell(66, 35, 8, 1.8, '#ffffff');
    // sidewalk: concrete slabs, wet under the lamp
    g.fillStyle = wtX_lin(0, 0, 640, 0, [[0, '#6a5a52'], [0.35, '#3a3440'], [1, '#22212c']]); g.fillRect(0, 352, 640, 48);
    rect(0, 352, 640, 2, '#8a7a6c'); rect(0, 354, 640, 1, '#1a1820');
    g.fillStyle = wtX_lin(0, 0, 640, 0, [[0, 'rgba(255,200,140,0.35)'], [0.3, 'rgba(255,200,140,0.08)'], [1, 'rgba(160,180,255,0.06)']]); g.fillRect(0, 352, 640, 2);
    for (let x = 70; x < 640; x += 160) rect(x, 355, 2, 45, 'rgba(10,8,14,0.6)');
    for (const [x, y, w, a] of [[40, 360, 70, 0.16], [58, 364, 46, 0.22], [30, 367, 56, 0.12], [70, 369, 26, 0.18]]) rect(x, y, w, 1, 'rgba(255,214,160,' + a + ')');
  });
}
// Car: low angle behind a parked sedan. Key: sodium street lamp at the right (orange rim light);
// fill: violet city-glow sky. The tracer box hangs under the bumper on two magnets.
function wtX_carArt() {
  return art('wtX_car3', 320, 200, () => {
    vgrad(0, 0, 640, 290, ['#05061a', '#0b0d2a', '#171a3e', '#2c2448', '#48304e']);
    for (const [x, y, b] of [[40, 30, 1], [132, 18, 0], [222, 40, 0], [500, 22, 1], [548, 64, 0], [30, 96, 0], [606, 108, 0], [474, 42, 0]]) { rect(x, y, b ? 2 : 1, b ? 2 : 1, b ? '#e8ecff' : '#8a90c0'); }
    // crescent moon with a soft halo
    g.fillStyle = wtX_rad(96, 52, 8, 50, [[0, 'rgba(210,210,255,0.25)'], [1, 'rgba(210,210,255,0)']]); g.fillRect(40, 0, 120, 110);
    wtX_ell(96, 52, 11, 11, '#f2ead0'); wtX_ell(101, 48, 10, 10, '#0c0e2c');
    // city across the street: far layer, then near blocks with a few lit windows
    const blocks = (layer, col, win, seed) => { let x = -10, k = seed;
      while (x < 640) { const bw = 60 + (k * 37) % 50, top = (layer ? 150 : 110) + (k * 53) % (layer ? 60 : 50);
        rect(x, top, bw - 2, 290 - top, col); rect(x, top, bw - 2, 2, mix(col, '#6a5a8a', 0.35));
        if (layer) for (let wy = top + 10; wy < 240; wy += 18) for (let wx = x + 8; wx < x + bw - 12; wx += 14) { const h = (wx * 31 + wy * 17 + k * 7) % 23;
          if (h < 2) { rect(wx, wy, 6, 8, '#f0b45a'); rect(wx, wy, 6, 2, '#ffdc98'); } else rect(wx, wy, 6, 8, win); }
        x += bw; k++; } };
    blocks(0, '#1a1936', '', 3); blocks(1, '#0f0f22', '#18182e', 5);
    // sodium street lamp
    rect(596, 42, 6, 244, '#101014'); rect(596, 42, 1, 244, '#4a3a38'); rect(601, 42, 1, 244, '#c07a40');
    rect(566, 38, 36, 5, '#15151a'); rect(566, 38, 36, 1, '#5a4a48');
    wtX_poly([[560, 43], [590, 43], [586, 50], [564, 50]], '#1e1e24');
    g.fillStyle = wtX_rad(575, 50, 2, 120, [[0, 'rgba(255,190,100,0.55)'], [0.25, 'rgba(255,160,70,0.18)'], [1, 'rgba(255,140,60,0)']]); g.fillRect(440, 0, 200, 190);
    wtX_ell(575, 50, 11, 3, '#ffcf7a'); wtX_ell(575, 50, 6, 1.5, '#fff4d8');
    wtX_poly([[564, 52], [586, 52], [640, 290], [500, 290]], 'rgba(255,170,80,0.05)');
    // road, wet: the lamp breaks into bands on the asphalt
    rect(0, 276, 640, 6, '#1c1a26'); rect(0, 276, 640, 1, '#3a3044');
    g.fillStyle = wtX_lin(0, 282, 0, 400, [[0, '#131220'], [1, '#221f2c']]); g.fillRect(0, 282, 640, 118);
    g.save(); g.translate(575, 284); g.scale(0.28, 1); g.fillStyle = wtX_rad(0, 0, 0, 90, [[0, 'rgba(255,170,80,0.38)'], [1, 'rgba(255,170,80,0)']]); g.fillRect(-100, 0, 200, 90); g.restore();
    for (let y = 286, i = 0; y < 372; y += 4 + (i % 3), i++) { const w = 10 + i * 1.2 + (i * 7 % 5) * 2, a = 0.30 - i * 0.012; if (a > 0) rect(575 - w / 2 + (i * 5 % 3) - 1, y, w, 1, 'rgba(255,214,150,' + a.toFixed(3) + ')'); }
    for (const lx of [130, 510]) for (let y = 300, i = 0; y < 360; y += 7, i++) rect(lx - 16 + i, y, 32 - i * 2, 2, 'rgba(200,40,40,' + (0.16 - i * 0.018).toFixed(3) + ')');
    // shadow under the car
    g.fillStyle = wtX_rad(320, 280, 60, 280, [[0, 'rgba(0,0,4,0.95)'], [0.7, 'rgba(0,0,4,0.7)'], [1, 'rgba(0,0,4,0)']]); g.fillRect(40, 244, 560, 76);
    // tyres
    for (const x of [104, 464]) {
      wtX_rr(x, 236, 72, 58, 12, '#0b0b0f');
      for (let y = 254; y < 288; y += 7) wtX_rr(x + 12, y, 48, 3, 1.5, '#1a1a20');
      wtX_rr(x, 236, 72, 58, 12, wtX_lin(x, 0, x + 72, 0, [[0, '#34343e'], [0.16, 'rgba(0,0,0,0)'], [0.84, 'rgba(0,0,0,0)'], [1, x > 300 ? '#7a4c34' : '#26262e']]));
      wtX_ell(x + 36, 294, 40, 3, 'rgba(0,0,0,0.8)'); }
    // exhaust
    wtX_rr(496, 246, 26, 14, 5, '#2a2c32'); wtX_ell(509, 253, 11, 6, '#7a808a'); wtX_ell(509, 253, 8, 4, '#0a0a0c'); rect(502, 247, 12, 1, '#c8ccd2');
    // body: roof, cabin, rear window
    const B = ['#070d16', '#0f1b2c', '#172a42', '#223c5c', '#34587e', '#6a90b6'], rim = '#e0a468';
    wtX_poly([[196, 58], [444, 58], [454, 68], [186, 68]], B[3]); rect(198, 58, 244, 1, B[5]);
    wtX_poly([[186, 68], [454, 68], [480, 130], [160, 130]], B[2]);
    wtX_poly([[202, 74], [438, 74], [458, 124], [182, 124]], '#05070e');
    g.fillStyle = wtX_lin(0, 74, 0, 124, [[0, '#3a4468'], [0.5, '#161c34'], [1, '#080a14']]); wtX_poly([[204, 75], [436, 75], [456, 123], [184, 123]], g.fillStyle);
    for (const hx of [262, 378]) { wtX_rr(hx - 22, 98, 44, 26, 8, '#04050a'); }
    for (let y = 84; y < 120; y += 7) rect(196 + (y - 84) * 0.3, y, 248 - (y - 84) * 0.1, 1, 'rgba(90,110,160,0.18)');
    wtX_poly([[240, 75], [290, 75], [240, 123], [196, 123]], 'rgba(200,215,255,0.07)');
    wtX_line([[454, 68], [480, 130]], rim, 2); wtX_line([[444, 58], [454, 68]], rim, 1.5);
    // trunk deck and rear panel
    g.fillStyle = wtX_lin(0, 130, 0, 150, [[0, B[4]], [1, B[2]]]); g.fillRect(80, 130, 480, 20);
    rect(80, 130, 480, 2, B[5]); rect(80, 150, 480, 2, B[0]); rect(80, 152, 480, 1, B[4]);
    g.fillStyle = wtX_lin(0, 153, 0, 230, [[0, B[2]], [0.6, B[1]], [1, B[0]]]); g.fillRect(80, 153, 480, 77);
    rect(556, 130, 4, 100, rim); rect(554, 132, 2, 96, '#8a6a58');
    g.fillStyle = wtX_lin(80, 0, 100, 0, [[0, B[0]], [1, 'rgba(0,0,0,0)']]); g.fillRect(80, 132, 20, 98);
    for (const [cx, sgn] of [[80, 1], [560, -1]]) { g.fillStyle = '#1a1936'; g.beginPath(); g.moveTo(cx, 129); g.lineTo(cx + sgn * 10, 129); g.quadraticCurveTo(cx, 129, cx, 139); g.closePath(); g.fill(); }
    // tail lights: ribbed red lenses, amber indicators
    for (const x of [92, 472]) {
      rect(x - 2, 156, 80, 36, '#050507');
      g.fillStyle = wtX_lin(0, 158, 0, 180, [[0, '#c02624'], [1, '#6a0c0e']]); g.fillRect(x, 158, 76, 22);
      for (let rx = x + 4; rx < x + 76; rx += 6) rect(rx, 158, 1, 22, 'rgba(255,120,110,0.18)');
      rect(x, 180, 76, 10, '#9a5010'); rect(x, 180, 76, 1, '#e08a2a');
      rect(x, 158, 76, 1, '#ff8a7a');
      if (x > 300) { rect(x + 60, 160, 14, 3, '#ffc8a0'); rect(x + 74, 158, 2, 32, rim); } else rect(x + 4, 160, 10, 2, '#ff9a8a');
    }
    // chrome strip and trunk lock
    g.fillStyle = wtX_lin(0, 168, 0, 172, [[0, '#e8eef6'], [1, '#4a5466']]); g.fillRect(174, 168, 292, 4);
    wtX_ell(320, 161, 3.5, 3.5, '#1a1e28'); wtX_ell(320, 160.5, 2.8, 2.8, '#c8d0dc'); rect(319.5, 159, 1, 3, '#1a1e28');
    // licence plate under its lamp
    g.fillStyle = wtX_rad(320, 184, 4, 70, [[0, 'rgba(255,250,230,0.35)'], [1, 'rgba(255,250,230,0)']]); g.fillRect(250, 178, 140, 44);
    rect(262, 182, 116, 36, '#0a0c12');
    g.fillStyle = wtX_lin(0, 184, 0, 216, [[0, '#f4f2e6'], [1, '#bab6a4']]); g.fillRect(265, 185, 110, 30);
    rect(265, 185, 110, 1, '#ffffff'); wtX_big(() => text('LX 4412', 139, 96, '#1a2a5e'));
    // chrome bumper reflecting the sky, black rubber strip, lamp glint on the right
    g.fillStyle = wtX_lin(0, 226, 0, 250, [[0, '#f0f4fa'], [0.15, '#b4bed0'], [0.4, '#3c4660'], [0.55, '#1c2234'], [0.75, '#7a86a0'], [1, '#2a3040']]); wtX_rr(66, 226, 508, 24, 5, g.fillStyle);
    rect(70, 237, 500, 5, '#141519'); rect(70, 237, 500, 1, '#40424a');
    wtX_ell(556, 230, 12, 2, 'rgba(255,220,170,0.9)'); wtX_ell(546, 246, 8, 1.5, 'rgba(255,200,150,0.5)');
    // tracer box: magnets up to the bumper, antenna whip, shell
    const bx = 256, by = 260, bw = 128, bh = 80;
    for (const mx of [bx + 16, bx + bw - 32]) { rect(mx, 248, 16, 8, '#111216'); rect(mx, 248, 16, 2, '#5a606a'); rect(mx - 2, 254, 20, 3, '#9aa2ac'); }
    wtX_line([[bx + bw + 6, by + 8], [bx + bw + 26, by - 12]], '#1a1c20', 3); wtX_line([[bx + bw + 6, by + 7], [bx + bw + 26, by - 13]], '#8a929c', 1); wtX_ell(bx + bw + 26, by - 13, 2, 2, '#c0c6cc');
    rect(bx - 6, by - 6, bw + 12, bh + 12, '#08090b');
    g.fillStyle = wtX_lin(bx - 4, by - 4, bx + bw + 4, by + bh + 4, [[0, '#5a616c'], [0.5, '#353a42'], [1, '#1c1f24']]); g.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
    rect(bx - 4, by - 4, bw + 8, 1, '#8a929e'); rect(bx + bw + 3, by - 4, 1, bh + 8, '#c0885a');
    rect(bx, by, bw, bh, '#08090b');
  });
}
// the inside of an opened box: back plate, cable bundle, terminal strips and a small board
function wtX_boxInside(w, h) {
  return art('wtX_in3' + w + 'x' + h, w, h, () => {
    const W2 = w * 2, H2 = h * 2;
    g.fillStyle = wtX_lin(0, 0, 0, H2, [[0, '#15191c'], [1, '#2a3236']]); g.fillRect(0, 0, W2, H2);
    // cable bundle from the top into a clamp
    const wires = ['#d8412f', '#3a6ad8', '#e8c040', '#e8e8e0', '#3aa84a', '#b0682a'];
    wires.forEach((c, i) => { const x = W2 / 2 - 12 + i * 4; rect(x, 0, 3, 26, c); rect(x, 0, 1, 26, mix(c, '#ffffff', 0.35)); rect(x + 2, 0, 1, 26, mix(c, '#000000', 0.45)); });
    wtX_rr(W2 / 2 - 18, 8, 36, 6, 2, '#0c0d10'); rect(W2 / 2 - 17, 8, 34, 1, '#4a4e58');
    // the box's inner walls: top and left in shadow, right and bottom catching the light
    wtX_poly([[0, 0], [W2, 0], [W2 - 7, 8], [7, 8]], '#0a0c0d'); wtX_poly([[0, 0], [7, 8], [7, H2 - 7], [0, H2]], '#15191b');
    wtX_poly([[W2, 0], [W2, H2], [W2 - 7, H2 - 7], [W2 - 7, 8]], '#3c464a'); wtX_poly([[0, H2], [7, H2 - 7], [W2 - 7, H2 - 7], [W2, H2]], '#4a5458');
    // terminal strips with brass screws
    for (const sx of [9, W2 - 21]) { rect(sx, 26, 12, H2 - 38, '#3a2616'); rect(sx, 26, 12, 1, '#7a5634'); rect(sx + 11, 26, 1, H2 - 38, '#1a1008');
      for (let y = 32; y < H2 - 16; y += 10) { wtX_ell(sx + 6, y, 3.4, 3.4, '#1a1008'); wtX_ell(sx + 6, y - 0.5, 3, 3, '#caa24e'); rect(sx + 4, y - 1, 5, 1, '#5a3e14'); } }
    // the board, in miniature: green mask, a live rail, gold traces and little DIPs
    const bx = 26, by = 28, bw = W2 - 52, bh = H2 - 44;
    rect(bx + 2, by + 2, bw, bh, 'rgba(0,0,0,0.5)');
    g.fillStyle = wtX_lin(bx, by, bx + bw, by + bh, [[0, '#1f5a38'], [1, '#0c2a20']]); g.fillRect(bx, by, bw, bh);
    rect(bx, by, bw, 1, '#4a8a5a'); rect(bx, by, 1, bh, '#3a7a4a');
    wires.forEach((c, i) => rect(W2 / 2 - 12 + i * 4, 26, 3, 3, c));
    rect(bx + 4, by + 6, 2, bh - 10, '#e0a040');
    const nr = bh > 100 ? 5 : 2, nc = bw > 120 ? 5 : 4, sy = (bh - 8) / nr, sx = (bw - 14) / nc;
    for (let r = 0; r < nr; r++) { const yy = by + 6 + r * sy + sy / 2 - 6 | 0, on = (r * 3 + nc) % 3 !== 1;
      rect(bx + 5, yy + 3, bw - 8, 1, on ? '#e8a640' : '#3f8a52'); rect(bx + 5, yy + 9, bw - 8, 1, on && r % 2 ? '#e8a640' : '#3f8a52');
      for (let c = 0; c < nc; c++) { const xx = bx + 12 + c * sx | 0;
        rect(xx + 1, yy + 2, 13, 11, 'rgba(0,0,0,0.5)');
        for (const py of [yy + 2, yy + 8]) { rect(xx - 2, py, 2, 2, '#a8b0b8'); rect(xx + 12, py, 2, 2, '#a8b0b8'); }
        rect(xx, yy, 12, 12, '#0e1014'); rect(xx + 1, yy + 1, 10, 10, '#1c2028'); rect(xx + 1, yy, 10, 1, '#5a6272'); rect(xx + 3, yy + 5, 6, 1, '#6ab8d8'); } }
    // the agent's penlight: a warm pool on the board, the rest of the box in gloom
    g.fillStyle = 'rgba(2,4,8,0.38)'; g.fillRect(0, 0, W2, H2);
    g.fillStyle = wtX_rad(W2 * 0.55, H2 * 0.45, 4, Math.min(W2, H2) * 0.55, [[0, 'rgba(255,236,190,0.30)'], [0.6, 'rgba(255,220,160,0.10)'], [1, 'rgba(255,220,160,0)']]); g.fillRect(0, 0, W2, H2);
    // shadow cast by the lip of the box
    g.fillStyle = wtX_lin(0, 0, 0, 16, [[0, 'rgba(0,0,0,0.7)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(0, 0, W2, 16);
    g.fillStyle = wtX_lin(7, 0, 20, 0, [[0, 'rgba(0,0,0,0.5)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(7, 8, 13, H2 - 15);
  });
}
// the door, flat: painted outside (louvres, warning plate, latch) or the bare inside with a taped wiring card
function wtX_doorTex(w, h, car, inside) {
  return art('wtX_door' + w + 'x' + h + (car ? 1 : 0) + (inside ? 1 : 0), w, h, () => {
    const W2 = w * 2, H2 = h * 2;
    if (inside) {
      g.fillStyle = wtX_lin(0, 0, W2, H2, [[0, '#8a9296'], [1, '#4c5458']]); g.fillRect(0, 0, W2, H2);
      rect(0, 0, W2, H2, '#15171a'); g.fillStyle = wtX_lin(0, 0, W2, H2, [[0, '#9aa2a6'], [1, '#50585c']]); g.fillRect(3, 3, W2 - 6, H2 - 6);
      rect(6, 6, W2 - 12, 2, '#111214'); rect(6, H2 - 8, W2 - 12, 2, '#111214'); rect(6, 6, 2, H2 - 12, '#111214'); rect(W2 - 8, 6, 2, H2 - 12, '#111214');
      if (!car) { // the wiring card, taped on
        const px0 = 22, py0 = 26, pw = W2 - 44, ph = Math.round(H2 * 0.42);
        rect(px0 + 2, py0 + 2, pw, ph, 'rgba(0,0,0,0.35)'); rect(px0, py0, pw, ph, '#ece6d2'); rect(px0, py0, pw, 1, '#ffffff');
        for (let i = 0; i < 7; i++) { const yy = py0 + 10 + i * (ph - 16) / 6 | 0; rect(px0 + 8, yy, pw - 16, 1, '#4a6ab0'); for (let j = 0; j < 4; j++) rect(px0 + 16 + j * (pw - 32) / 3 | 0, yy - 3, 6, 6, (i + j) % 3 ? '#4a6ab0' : '#b03a2a'); }
        for (const tx of [px0 - 4, px0 + pw - 16]) rect(tx, py0 - 4, 20, 8, 'rgba(250,244,210,0.6)');
      }
      return;
    }
    const pal = car ? ['#0e1014', '#24282e', '#3a4048', '#5a626c', '#8a929c'] : ['#1a201e', '#3e4a45', '#5f6d66', '#8a998f', '#b6c4b8'];
    rect(0, 0, W2, H2, pal[0]);
    g.fillStyle = wtX_lin(0, 0, W2, H2, [[0, pal[3]], [0.55, pal[2]], [1, pal[1]]]); g.fillRect(2, 2, W2 - 4, H2 - 4);
    rect(2, 2, W2 - 4, 2, pal[4]); rect(2, 2, 2, H2 - 4, pal[4]); rect(2, H2 - 4, W2 - 4, 2, pal[0]); rect(W2 - 4, 2, 2, H2 - 4, pal[0]);
    if (!car) { g.fillStyle = wtX_rad(0, 0, 10, W2 * 1.3, [[0, 'rgba(255,200,130,0.28)'], [1, 'rgba(255,200,130,0)']]); g.fillRect(0, 0, W2, H2); }
    if (!car) for (let j = 0; j < 5; j++) { const y = 28 + j * 10; rect(32, y, W2 - 64, 4, pal[0]); rect(32, y + 4, W2 - 64, 1, pal[4]); rect(32, y, W2 - 64, 1, '#0a0c0c'); }
    const py = (car ? 14 : 58) * 2, pc = car ? ['#6a1410', '#b8302a', '#e05a48'] : ['#6a5010', '#e2bc36', '#fff0a0'], x0 = car ? 12 : 40, x1 = car ? W2 - 30 : W2 - 40;
    rect(x0, py - 2, x1 - x0, 28, pal[0]); rect(x0 + 2, py, x1 - x0 - 4, 24, pc[1]); rect(x0 + 2, py, x1 - x0 - 4, 1, pc[2]); rect(x0 + 2, py + 23, x1 - x0 - 4, 1, pc[0]);
    if (!car) for (const sx of [x0 + 6, x1 - 6]) wtX_ell(sx, py + 12, 2, 2, pc[0]);
    wtX_big(() => textC('DANGER', (x0 + x1) / 4, py / 2 + 2, car ? '#ffffff' : '#1a1206'));
    // latch
    const lx = (w - 12) * 2, ly = h - 8;
    wtX_rr(lx + 2, ly + 2, 10, 32, 3, 'rgba(0,0,0,0.5)'); wtX_rr(lx, ly, 10, 32, 3, '#1c1e22');
    wtX_rr(lx + 1, ly + 1, 8, 30, 3, wtX_lin(lx, 0, lx + 9, 0, [[0, '#f4f6f8'], [0.5, '#a0a8b0'], [1, '#4a525a']]));
    wtX_ell(lx + 5, ly + 22, 1.6, 2.4, '#101216');
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
  const C = wtX_C, F = v => v * 2 + 1; // layout pixel -> centre of its fine pixels
  // every trace on the board as fine-grid polylines, in the direction the current flows;
  // a lane that climbs to a neighbour dives through vias to the bottom layer to pass under the one coming down
  const paths = [];
  (function buildPaths() {
    const railTop = laneY(0, 0) - 2;
    paths.push({ k: 'rail', segs: [{ pts: [[F(10), F(166)], [F(10), F(railTop)]] }], vias: [], w: 5 });
    for (let l = 0; l < LANES; l++) { const y = laneY(l >> 1, l & 1), x0 = inputs[l] ? 10 : 17;
      paths.push({ k: 'in', l, segs: [{ pts: [[F(x0), F(y)], [F(X0 - 2), F(y)]] }], vias: [], gnd: inputs[l] ? null : [F(x0), F(y)] }); }
    for (let c = 0; c < COLS - 1; c++) for (let l = 0; l < LANES; l++) {
      const to = links[c][l], [x0] = chipXY(c, 0), [x1] = chipXY(c + 1, 0), y0 = laneY(l >> 1, l & 1), y1 = laneY(to >> 1, to & 1), xa = x0 + CW + 1, xb = x1 - 2;
      if (y0 === y1) paths.push({ k: 'ln', c, l, segs: [{ pts: [[F(xa), F(y0)], [F(xb), F(y1)]] }], vias: [] });
      else { const p1 = [F(xa), F(y0)], p2 = [F(xa + 4), F(y0)], p3 = [F(xb - 4), F(y1)], p4 = [F(xb), F(y1)], bot = y1 < y0;
        paths.push({ k: 'ln', c, l, segs: [{ pts: [p1, p2] }, { pts: [p2, p3], bot }, { pts: [p3, p4] }], vias: bot ? [p2, p3] : [] }); }
    }
    for (let l = 0; l < LANES; l++) { const [x0] = chipXY(COLS - 1, 0), y = laneY(l >> 1, l & 1), ex = l % 2 ? 294 : 266, ey = 6 + l * 15.6 | 0;
      paths.push({ k: 'out', l, segs: [{ pts: [[F(x0 + CW + 1), F(y)], [F(ex - 12), F(y)], [F(ex - 12), F(ey + 7)], [F(ex - 1), F(ey + 7)]] }], vias: [] }); }
    for (const p of paths) { p.all = []; for (const s of p.segs) for (const q of s.pts) { const lp = p.all[p.all.length - 1]; if (!lp || lp[0] !== q[0] || lp[1] !== q[1]) p.all.push(q); } }
  })();
  const pathOn = (p, sim) => p.k === 'rail' ? 1 : p.k === 'in' ? inputs[p.l] : p.k === 'ln' ? sim.cols[p.c].out[p.l] : sim.final[p.l];
  // the copper layer is redrawn only when the flow of power changes
  const copper = document.createElement('canvas'); copper.width = W * RES; copper.height = 169 * RES; let copperSig = '', live = new Path2D();
  function drawCopper(sim) {
    const sig = paths.map(p => pathOn(p, sim) ? 1 : 0).join(''); if (sig === copperSig) return; copperSig = sig;
    const cx = copper.getContext('2d'); cx.clearRect(0, 0, copper.width, copper.height);
    live = new Path2D(); for (const p of paths) if (pathOn(p, sim)) p.all.forEach(([x, y], i) => i ? live.lineTo(x, y) : live.moveTo(x, y));
    drawTo(cx, () => {
      g.lineCap = 'round'; g.lineJoin = 'round';
      const each = (fn) => { for (const p of paths) { const on = !!pathOn(p, sim); for (const s of p.segs) fn(p, s, on); } };
      const shift = (pts, d) => pts.map(([x, y]) => [x + d, y + d]);
      // bottom layer, seen dimly through the laminate
      each((p, s, on) => { if (s.bot) wtX_line(s.pts, on ? 'rgba(255,150,50,0.45)' : C.bot, 3); });
      // top layer: cast shadow, then copper under the mask, then lit copper with its glow
      each((p, s, on) => { if (!s.bot) wtX_line(shift(s.pts, 1), C.cuS, (p.w || 3) + 1); });
      each((p, s, on) => { if (!s.bot && !on) { wtX_line(s.pts, C.cu1, p.w || 3); wtX_line(shift(s.pts, -0.7), C.cu2, 1); } });
      each((p, s, on) => { if (!s.bot && on) wtX_line(s.pts, 'rgba(255,150,50,0.16)', (p.w || 3) + 8); });
      each((p, s, on) => { if (!s.bot && on) { wtX_line(s.pts, C.li0, (p.w || 3) + 1); wtX_line(s.pts, C.li1, p.w || 3); wtX_line(shift(s.pts, -0.6), C.li2, p.w ? 2 : 1.2); } });
      // vias, junctions and grounds
      for (const p of paths) { const on = pathOn(p, sim);
        for (const [x, y] of p.vias) { wtX_ell(x + 0.5, y + 0.5, 3.4, 3.4, C.cuS); wtX_ell(x, y, 3, 3, on ? C.li1 : C.tin1); wtX_ell(x - 0.6, y - 0.6, 1.6, 1.6, on ? C.li3 : C.tin2); wtX_ell(x, y, 1.1, 1.1, '#050807'); }
        if (p.k === 'in' && !p.gnd) { wtX_ell(p.all[0][0], p.all[0][1], 3.4, 3.4, C.li2); wtX_ell(p.all[0][0] - 0.8, p.all[0][1] - 0.8, 1.3, 1.3, C.li3); }
        if (p.gnd) { const [x, y] = p.gnd; wtX_ell(x, y, 3, 3, C.tin1); wtX_ell(x, y, 1.1, 1.1, '#050807'); rect(x - 7, y - 4, 1, 9, C.silk); rect(x - 9, y - 3, 1, 7, C.silk); rect(x - 11, y - 2, 1, 5, C.silk); rect(x - 7, y, 3, 1, C.silk); }
      }
      // the +5V rail ends in a tinned pad for the test clip
      wtX_rr(F(10) - 6, F(162), 12, 9, 2, C.li0); wtX_rr(F(10) - 5, F(162), 10, 7, 2, C.tin2); rect(F(10) - 4, F(162), 8, 1, C.tin3);
    });
  }
  function drawChip(type, x, y, isFixed, sel, bare) {
    blit(wtX_chip(type, isFixed, sel, bare), x - 6, y - 4);
    if (sel) { const blink = (t * 4 | 0) % 2, c = blink ? '#ffd84a' : '#ffffff', x0 = (x - 6) * 2, y0 = (y - 4) * 2, x1 = (x + CW + 6) * 2, y1 = (y + CH + 4) * 2;
      fine(() => {
        g.fillStyle = 'rgba(140,210,255,0.10)'; g.fillRect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4);
        for (const [bx, by, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
          const hx = sx > 0 ? bx : bx - 10, vy = sy > 0 ? by : by - 10, hy = sy > 0 ? by : by - 2, vx = sx > 0 ? bx : bx - 2;
          g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(hx - 1, hy - 1, 12, 4); g.fillRect(vx - 1, vy - 1, 4, 12);
          g.fillStyle = c; g.fillRect(hx, hy, 10, 2); g.fillRect(vx, vy, 2, 10); }
      }); }
  }
  function drawEnd(l, on, sim) {
    const ex = l % 2 ? 294 : 266, ey = 6 + l * 15.6 | 0;
    fine(() => { const x = ex * 2 - 4, y = ey * 2 + 12; wtX_rr(x, y, 5, 6, 1, '#101214'); rect(x, y + 1, 4, 4, on ? C.li2 : C.tin1); rect(x, y + 1, 4, 1, on ? C.li3 : C.tin3); });
    if (ends[l] === 'setting') blit(wtX_dial(on, 1 + (l >> 1)), ex, ey);
    else if (ends[l] === 'phone') blit(wtX_phone(on), ex, ey);
    else { const lit = on || (flash > 0 && (t * 10 | 0) % 2), ring = on && !over || (flash > 0 && over && over.alarm), f = t * 16 | 0, dx = ring ? (f % 2 ? 1 : -1) : 0;
      if (lit) fine(() => { g.fillStyle = wtX_rad(ex * 2 + 16, ey * 2 + 10, 2, 26, [[0, 'rgba(255,60,30,0.45)'], [1, 'rgba(255,40,20,0)']]); g.fillRect(ex * 2 - 12, ey * 2 - 16, 56, 52); });
      blit(wtX_bell(lit), ex + dx, ey);
      if (ring) { const c = f % 4 < 2 ? '#ffffff' : '#ffd84a'; fine(() => { g.strokeStyle = c; g.lineWidth = 1.5; g.lineCap = 'round';
        for (const [cx, s] of [[ex * 2 + 16, -1], [ex * 2 + 16, 1]]) for (const r of f % 3 ? [15, 19] : [15]) { g.beginPath(); g.arc(cx, ey * 2 + 15, r, s < 0 ? Math.PI * 0.8 : -Math.PI * 0.2, s < 0 ? Math.PI * 1.2 : Math.PI * 0.2); g.stroke(); } }); } }
  }
  function drawTray() {
    blit(wtX_trayArt(), 0, 169);
    // red test lead from the +5V post up to the rail pad, with its crocodile clip
    fine(() => {
      g.lineCap = 'round'; g.strokeStyle = '#4a0a06'; g.lineWidth = 5; g.beginPath(); g.moveTo(20, 351); g.bezierCurveTo(19, 347, 22, 346, 21, 342); g.stroke();
      g.strokeStyle = '#c42a1c'; g.lineWidth = 3; g.stroke();
      wtX_rr(15, 336, 13, 9, 3, '#5a0c08'); wtX_rr(15, 335, 12, 8, 3, wtX_lin(15, 0, 27, 0, [[0, '#ff7a5a'], [0.4, '#d23424'], [1, '#7a140c']]));
      wtX_poly([[16, 336], [26, 336], [24.5, 322], [17.5, 322]], '#30353c');
      wtX_poly([[16.5, 336], [21, 336], [21, 322], [18, 322]], wtX_lin(16, 0, 21, 0, [[0, '#f0f4f6'], [1, '#9aa2aa']]));
      wtX_poly([[21, 336], [25.5, 336], [24, 322], [21, 322]], '#6a727a');
      rect(20.5, 322, 1, 13, '#15171a'); for (let y = 323; y < 333; y += 3) rect(19.5, y, 3, 1, '#2a2e34');
    });
    text('ESC: QUIT', 8, 190, P.W);
    const tot = ends.filter(e => e === 'phone').length, n = cutCount();
    text(tracer ? 'Settings cut ' + n + '/' + need : 'Phones cut ' + n + '/' + tot, 69, 178, '#1a1408'); text('Enter/tap: swap', 69, 188, '#5a4a2a');
    // progress ticks in the pad's margin
    fine(() => { for (let i = 0, m = tracer ? need : tot; i < m; i++) { const bx = (179 - (m - 1 - i) * 5) * 2, by = 376;
      rect(bx, by, 8, 9, '#2a2418'); rect(bx + 1, by + 1, 6, 7, i < n ? '#3aa85a' : '#fff6c8');
      if (i < n) { g.strokeStyle = '#eaffea'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(bx + 2, by + 4.5); g.lineTo(bx + 3.5, by + 6.5); g.lineTo(bx + 6.5, by + 2); g.stroke(); } } });
    text('IN', 195, 175, '#ffd84a'); text('HAND', 195, 185, '#ffd84a');
    drawChip(hand, 222, 181, false, false, true); blit(wtX_tweezArt(), 222, 178);
    // countdown: 00:MM:SS in red LEDs, blinking when it gets short
    const mm = Math.floor(time / 60), ss = Math.floor(time % 60), low = time < 20 && !over && !intro && (t * 2 | 0) % 2;
    const dg = [0, 0, mm / 10 | 0, mm % 10, ss / 10 | 0, ss % 10];
    fine(() => {
      const on = low ? '#8a1a10' : '#ff3a24', hot = low ? '#b0301c' : '#ffb09a', off = '#3a0a0a';
      const SEG = [[2, 0, 6, 2], [8, 2, 2, 6], [8, 10, 2, 6], [2, 16, 6, 2], [0, 10, 2, 6], [0, 2, 2, 6], [2, 8, 6, 2]], M = [0x7E, 0x30, 0x6D, 0x79, 0x33, 0x5B, 0x5F, 0x70, 0x7F, 0x7B];
      let x = 530; const y = 366;
      if (!low) { g.fillStyle = 'rgba(255,40,20,0.10)'; g.fillRect(526, 362, 100, 26); }
      dg.forEach((d, i) => { const m = M[Math.min(9, d)];
        SEG.forEach(([sx, sy, w, h], k) => { const lit = m & (0x40 >> k); g.fillStyle = lit ? on : off; g.fillRect(x + sx, y + sy, w, h); if (lit) { g.fillStyle = hot; if (w > h) g.fillRect(x + sx + 1, y + sy, w - 2, 1); else g.fillRect(x + sx, y + sy + 1, 1, h - 2); } });
        x += 12; if (i === 1 || i === 3) { g.fillStyle = on; g.fillRect(x - 1, y + 4, 2, 2); g.fillRect(x - 1, y + 12, 2, 2); x += 6; } });
      const run = !over && !intro && (t * 2 | 0) % 2; wtX_ell(619.5, 349.5, 2, 2, run ? '#6aff7a' : '#1a3a1e'); if (run) wtX_ell(619.5, 349.5, 4.5, 4.5, 'rgba(90,255,110,0.3)');
    });
  }
  function drawBriefing() {
    // a blueprint page from the service manual, taped over the board
    fine(() => { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(18, 30, 616, 328); });
    blit(art('wtX_brief3', 308, 164, () => {
      g.fillStyle = wtX_lin(0, 0, 616, 328, [[0, '#1f4a92'], [0.6, '#173a7a'], [1, '#12306a']]); g.fillRect(0, 0, 616, 328);
      for (let x = 8; x < 616; x += 16) rect(x, 0, 1, 328, x % 64 === 8 ? 'rgba(160,200,255,0.13)' : 'rgba(150,190,255,0.06)');
      for (let y = 8; y < 328; y += 16) rect(0, y, 616, 1, y % 64 === 8 ? 'rgba(160,200,255,0.13)' : 'rgba(150,190,255,0.06)');
      g.fillStyle = 'rgba(0,0,0,0)'; rect(0, 0, 616, 1, '#6a90d8'); rect(0, 327, 616, 1, '#0a1a3a');
      g.strokeStyle = '#dce8ff'; g.lineWidth = 2; g.strokeRect(5, 5, 606, 318); g.strokeStyle = '#7fa6ea'; g.lineWidth = 1; g.strokeRect(9.5, 9.5, 597, 309);
      g.fillStyle = wtX_lin(0, 10, 0, 32, [[0, '#122c62'], [1, '#0e2656']]); g.fillRect(10, 10, 596, 22); rect(10, 32, 596, 2, '#7fa6ea');
      rect(10, 196, 596, 1, 'rgba(127,166,234,0.5)');
      wtX_ft('LIU-7', 20, 306, '#7fa6ea', 2); wtX_ft('FIG.7', 556, 306, '#7fa6ea', 2);
      for (const [tx, a] of [[14, -0.35], [586, 0.35]]) { g.save(); g.translate(tx + 8, 4); g.rotate(a); g.fillStyle = 'rgba(245,238,200,0.55)'; g.fillRect(-18, -6, 36, 12); g.restore(); }
    }), 6, 12);
  }
  // the arming warning: hazard-striped plate with a dark glass readout
  const armArt = () => art('wtX_arm3', 162, 32, () => {
    g.fillStyle = '#e8c02c'; g.fillRect(0, 0, 324, 64);
    g.save(); g.beginPath(); g.rect(0, 0, 324, 64); g.clip(); g.fillStyle = '#16120a';
    for (let x = -64; x < 340; x += 16) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 8, 64); g.lineTo(x + 72, 0); g.lineTo(x + 64, 0); g.closePath(); g.fill(); }
    g.restore();
    rect(0, 0, 324, 2, '#fff09a'); rect(0, 62, 324, 2, '#5a4406'); rect(0, 0, 2, 64, '#fff09a'); rect(322, 0, 2, 64, '#5a4406');
    rect(10, 6, 304, 52, '#0a0808'); rect(10, 57, 304, 1, '#f0d060');
    g.fillStyle = wtX_lin(0, 8, 0, 56, [[0, '#2a0808'], [1, '#120303']]); g.fillRect(12, 8, 300, 48);
    g.fillStyle = 'rgba(255,60,40,0.10)'; g.fillRect(12, 8, 300, 2);
    for (const [sx, sy] of [[5, 5], [318, 5], [5, 58], [318, 58]]) wtX_screw(sx, sy, 2.5);
  });
  const panelArt = good => art('wtX_end3' + (good ? 1 : 0), 244, 62, () => {
    g.fillStyle = wtX_lin(0, 0, 0, 124, [[0, '#5a616c'], [1, '#262a31']]); g.fillRect(0, 0, 488, 124);
    rect(0, 0, 488, 2, '#b8c0ca'); rect(0, 0, 2, 124, '#8a929e'); rect(0, 122, 488, 2, '#0e1013'); rect(486, 0, 2, 124, '#0e1013');
    rect(7, 7, 474, 110, '#07080a'); rect(8, 116, 474, 1, '#6a727e');
    g.fillStyle = wtX_lin(0, 8, 0, 116, [[0, '#161a21'], [1, '#0c0e12']]); g.fillRect(8, 8, 472, 108);
    const hc = good ? ['#3cc070', '#1e8a48', '#0e5028', '#8affb0'] : ['#e8543a', '#b02a1c', '#6a120c', '#ffa890'];
    g.fillStyle = wtX_lin(0, 8, 0, 38, [[0, hc[0]], [0.5, hc[1]], [1, hc[2]]]); g.fillRect(8, 8, 472, 30); rect(8, 8, 472, 1, hc[3]); rect(8, 38, 472, 2, '#050608');
    for (const [sx, sy] of [[4, 4], [484, 4], [4, 120], [484, 120]]) wtX_screw(sx, sy, 2.5);
  });
  function drawOpening() {
    const car = tracer, bx = car ? 128 : 112, by = car ? 130 : 36, bw = car ? 64 : 96, bh = car ? 40 : 114;
    blit(car ? wtX_carArt() : wtX_wallArt(), 0, 0);
    blit(wtX_boxInside(bw, bh), bx, by);
    if (((t * 3) | 0) % 2) fine(() => { const x = (bx + 14) * 2 + 1, y = (by + 16) * 2 + 1; wtX_ell(x, y, 6, 6, 'rgba(255,60,40,0.35)'); wtX_ell(x, y, 2, 2, '#ff5a40'); rect(x - 1, y - 1, 1, 1, '#ffe0d0'); });
    // the door swings open on its left hinge
    const k = clamp((t - 0.5) / 1.1, 0, 1), a = (1 - Math.cos(k * Math.PI)) / 2 * 1.85, cw = Math.cos(a), sn = Math.sin(a);
    const D = (bw + 4) * 2, Hd = (bh + 4) * 2, hx = (bx - 2) * 2, top0 = (by - 2) * 2, sw = Math.round(D * Math.abs(cw)), skew = sn * 20;
    const tex = wtX_doorTex(bw + 4, bh + 4, car, cw < 0);
    fine(() => {
      const n = Math.max(1, sw), far = cw >= 0 ? hx + n : hx - n;
      // the door's shadow on the box and wall
      if (k > 0) wtX_poly([[hx, top0 + 4], [far + (cw >= 0 ? 10 : -4), top0 - skew / 2 + 10], [far + (cw >= 0 ? 10 : -4), top0 + Hd + skew / 2 + 6], [hx, top0 + Hd + 4]], 'rgba(0,0,0,' + (0.25 + sn * 0.2).toFixed(3) + ')');
      for (let i = 0; i < n; i++) { const f = i / n, u = Math.min(D - 1, f * D | 0), top = top0 - f * skew / 2, hh = Hd + f * skew;
        g.drawImage(tex, u, 0, 1, Hd, cw >= 0 ? hx + i : hx - 1 - i, top, 1, hh); }
      const shade = cw >= 0 ? (1 - cw) * 0.5 : 0.28 - cw * 0.12;
      if (shade > 0.01) wtX_poly([[hx, top0], [far, top0 - skew / 2], [far, top0 + Hd + skew / 2], [hx, top0 + Hd]], 'rgba(4,6,12,' + shade.toFixed(3) + ')');
      if (sn > 0.2) { const e = cw >= 0 ? far : far - 3; rect(e, top0 - skew / 2, 3, Hd + skew, car ? '#1c1f24' : '#3a4640'); rect(e, top0 - skew / 2, 1, Hd + skew, car ? '#5a626c' : '#8a9a8e'); }
    });
    if (!car) fine(() => { const mx = 66 + Math.cos(t * 4.3) * 20 + Math.sin(t * 11) * 4, my = 50 + Math.sin(t * 6.1) * 9, w = (t * 30 | 0) % 2;
      rect(mx - 1 - w, my, 3 + w * 2, 1, '#d8ccb0'); rect(mx, my - 1, 1, 3, '#6a5a48'); });
    // caption
    rect(0, 186, W, 14, P.K); fine(() => { rect(0, 372, 640, 1, '#3a3e48'); rect(0, 373, 640, 1, '#16181c'); });
    textC(fitText((car ? 'CAR TRACER - ' : 'JUNCTION BOX - ') + String(opts.label || '').toUpperCase(), 300), W / 2, 189, P.YE);
    if ((t * 2 | 0) % 2 && t > 1.6) textC('press a key', W / 2, 176, '#c8ccd4', '#000000');
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
      blit(wtX_pcbArt(chipXY, COLS, ROWS), 0, 0);
      drawCopper(sim); blit(copper, 0, 0);
      // current pulses racing along every live trace
      fine(() => { g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([3, 13]); g.lineDashOffset = -(t * 60 % 16);
        g.strokeStyle = 'rgba(255,214,130,0.35)'; g.lineWidth = 5; g.stroke(live); g.strokeStyle = '#fff8e0'; g.lineWidth = 1.8; g.stroke(live); g.restore(); });
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        const [x, y] = chipXY(c, r); drawChip(hidden[c][r] ? '?' : grid[c][r], x, y, fixed[c][r], !over && !intro && cur[0] === c && cur[1] === r);
      }
      // legs carrying power glow
      fine(() => { for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) { const [x, y] = chipXY(c, r), ci = sim.cols[c].in, co = sim.cols[c].out;
        for (const [px0, py0, on] of [[x - 2, y + 4, ci[r * 2]], [x - 2, y + 12, ci[r * 2 + 1]], [x + CW, y + 4, co[r * 2]], [x + CW, y + 12, co[r * 2 + 1]]]) {
          if (!on) continue; const fx = px0 * 2, fy = py0 * 2 - 1;
          wtX_ell(fx + 2, fy + 2, 5, 4, 'rgba(255,170,60,0.22)'); rect(fx, fy, 4, 4, C.li2); rect(fx, fy, 4, 1, C.li3); rect(fx, fy + 3, 4, 1, C.li1); } } });
      for (let l = 0; l < LANES; l++) drawEnd(l, sim.final[l], sim);
      // what the swap would do (easier levels): green = a phone goes dead, red = an alarm goes live
      if (preview && !over && !intro && !fixed[cur[0]][cur[1]]) {
        const g2 = grid.map(col => col.slice()); g2[cur[0]][cur[1]] = hand; const f2 = simulate(g2).final;
        for (let l = 0; l < LANES; l++) { if (f2[l] === sim.final[l]) continue; const ex = l % 2 ? 294 : 266, ey = 6 + l * 15.6 | 0; const alarmOn = ends[l] === 'alarm' && f2[l]; const col = alarmOn ? '#ff4a36' : ends[l] === 'alarm' ? '#5cff8a' : f2[l] ? '#ffd84a' : '#5cff8a';
          if (!alarmOn || (t * 3 | 0) % 2) fine(() => { const x = ex * 2 - 5, y = ey * 2 - 3; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 4; g.beginPath(); g.roundRect(x, y, 42, 36, 5); g.stroke(); g.strokeStyle = col; g.lineWidth = 2; g.stroke(); }); }
      }
      drawTray();
      if ((arming && !over) || (flash > 0 && (t * 10 | 0) % 2)) { const on = (t * 8 | 0) % 2, c = on ? '#ff4a36' : '#ffd84a';
        fine(() => { g.strokeStyle = c; g.lineWidth = 4; g.strokeRect(2, 2, 636, 334); g.strokeStyle = 'rgba(255,60,40,0.3)'; g.lineWidth = 8; g.strokeRect(8, 8, 624, 322); }); }
      if (arming && !over) {
        const on = (t * 8 | 0) % 2;
        fine(() => { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(134, 138, 324, 64); });
        blit(armArt(), 64, 66);
        textC('ALARM ARMING - SWAP BACK!', 145, 74, on ? '#ff5a44' : '#ffd84a'); textC(arming.toFixed(1) + ' s', 145, 83, P.W);
      }
      if (intro && !over) {
        drawBriefing();
        textC(tracer ? 'CAR TRACER' : 'WIRETAP: THE JUNCTION BOX', W / 2, 20, P.YE);
        const lines = tracer ? ['Power flows left to right through the chips.', 'Cut the power to ' + need + ' of the numbered tracer settings.'] : ['Power flows left to right through the chips.', 'Kill the power to every PHONE (right-hand side).', 'A dead phone line is a tapped phone line.'];
        lines.push('Never let power reach an ALARM (the bells).', 'Move with the arrows, Enter swaps the chip under the', 'cursor with the one in your HAND. On touch: tap a chip,', 'then tap it again to swap.', 'Framed chips are soldered in. ? chips are unknown.', 'If an alarm lights up, swap straight back!');
        lines.forEach((l, i) => text(l, 15, 31 + i * 9, i < (tracer ? 2 : 3) ? P.W : '#b8c8e8'));
        const ly = 113; [['S', 'straight'], ['X', 'cross'], ['D', 'down'], ['U', 'up'], ['T', 'flip']].forEach(([k2, lab], i) => { const lx = 40 + i * 52; drawChip(k2, lx, ly, false, false, true); textC(lab, lx + 8, ly + 19, P.CY); });
        if (eff >= 1) text('T, B and I chips flip lanes: live becomes dead, dead live.', 15, 144, '#b8c8e8');
        if (preview) text('Frames on the right preview a swap: green cut, red alarm.', 15, eff >= 1 ? 153 : 144, '#7affa0');
        if ((t * 2 | 0) % 2) textC('Press a key to start the clock', W / 2, 162, P.YE);
      }
      if (over) {
        const good = over.win || (!tracer && !over.alarm && cutCount());
        fine(() => { g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(82, 114, 488, 124); });
        blit(panelArt(!!good), 38, 54);
        const title = over.win ? (tracer ? 'TRACER SET' : 'ALL PHONES TAPPED') : over.alarm ? 'ALARM!' : (!tracer && cutCount() ? cutCount() + ' PHONES TAPPED' : 'NO TAP');
        textC(title, W / 2 + 1, 63, P.K); textC(title, W / 2, 62, P.W);
        // a little icon either side of the title
        const ic = over.alarm ? wtX_bell(true) : wtX_phone(!good); blit(ic, 50, 58); blit(ic, W - 66, 58);
        para(over.win ? (tracer ? 'The tracer is live. You can follow the car at a safe distance.' : 'Every phone is dead and nobody noticed. Your bugs are on the lines.') : over.why, 52, 78, W - 104, P.W, 9);
        if (over.t > 0.6 && (t * 2 | 0) % 2) textC('Press a key', W / 2, 102, P.G3);
      }
    },
  };
}
