// ===================================================================
// ART (front end): title backdrop, Max/Maxine figures, training cards, the Chief.
// Painted on the fine (2x) grid with clean vector clusters: every static layer is an art() cache,
// only the moving bits are drawn per frame through fine().
// ===================================================================

// ---------- toolkit (fine-grid painting) ----------
const frX_pc = new Map();
function frX_path(d) { let p = frX_pc.get(d); if (!p) { p = new Path2D(d); frX_pc.set(d, p); } return p; }
function frX_f(d, c) { g.fillStyle = c; g.fill(frX_path(d)); }
function frX_st(d, c, w, cap) { g.strokeStyle = c; g.lineWidth = w; g.lineCap = cap || 'round'; g.lineJoin = 'round'; g.stroke(frX_path(d)); }
function frX_in(d, fn) { g.save(); g.clip(frX_path(d)); fn(); g.restore(); }
function frX_r(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
function frX_e(x, y, rx, ry, c, rot) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 6.2832); g.fill(); }
function frX_seg(x0, y0, x1, y1, c, w) { g.strokeStyle = c; g.lineWidth = w || 1; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
function frX_a(a, fn) { const o = g.globalAlpha; g.globalAlpha = o * a; fn(); g.globalAlpha = o; }
// colour at u (0..1) along a list of hex colours
function frX_at(cols, u) { u = clamp(u, 0, 1); const t = u * (cols.length - 1), i = Math.min(cols.length - 2, Math.floor(t)); return mix(cols[i], cols[i + 1], Math.round((t - i) * 32) / 32); }
// gradient stops: n > 0 bands them into n flat steps (the retro look), n = 0 is smooth
function frX_stops(gr, cols, n) {
  if (!n) { cols.forEach((c, i) => gr.addColorStop(i / (cols.length - 1), c)); return gr; }
  for (let i = 0; i < n; i++) { const c = frX_at(cols, n === 1 ? 0 : i / (n - 1)); gr.addColorStop(i / n, c); gr.addColorStop(Math.max(i / n, (i + 1) / n - 0.0005), c); }
  return gr;
}
function frX_lg(x0, y0, x1, y1, cols, n) { return frX_stops(g.createLinearGradient(x0, y0, x1, y1), cols, n); }
// a soft light pool / glow (smooth radial, alpha falloff)
function frX_glow(x, y, r, c, a, sy) {
  g.save(); g.translate(x, y); g.scale(1, sy || 1);
  const rgb = hexRGB(c).join(','), gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
  gr.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); gr.addColorStop(0.45, 'rgba(' + rgb + ',' + a * 0.4 + ')'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
  g.fillStyle = gr; g.fillRect(-r, -r, r * 2, r * 2); g.restore();
}
function frX_hash(x, y) { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }

// ===================================================================
// THE CHIEF's office (full screen above the briefing box at y 147)
// Plan: stern, balding director dead centre in an oxblood wingback, framed by a dusk window
// over Washington (cool violet-to-amber sky = rim light on the bald dome and shoulders).
// Warm key light from the upper left (the green banker's lamp adds a pool on the desk).
// Ramps: skin 6 (purple-brown shadow -> peach), charcoal-navy suit 5, crimson tie 4, mahogany 6,
// burgundy drapes 4, dusk sky 7 banded, brass 4. Accent: the red hotline phone.
// ===================================================================
const frX_SK = ['#34192a', '#63323a', '#94533f', '#c07b5c', '#dea07c', '#f5cfaa']; // skin s0..s5
const frX_HAIRG = ['#4c4a57', '#7d7c89', '#aeadb6', '#dcdad8'];
const frX_WOOD = ['#1d0c08', '#34170d', '#4c2213', '#66311a', '#844424', '#a95f33'];
const frX_BRASS = ['#4a2e10', '#8a5e20', '#c9973a', '#f2d584'];
function frX_chiefRoom() {
  const wood = frX_WOOD;
  // --- back wall: raised mahogany panelling
  frX_r(0, 0, 640, 240, wood[2]);
  const panel = (x, y, w, h) => {
    frX_r(x, y, w, h, wood[1]);
    g.fillStyle = frX_lg(0, y, 0, y + h, [wood[3], wood[2]], 4); g.fillRect(x + 4, y + 4, w - 8, h - 8);
    frX_f(`M${x + 4},${y + 4}h${w - 8}l-6,6h${-(w - 20)}v${h - 20}l-6,6z`, wood[4]);
    frX_f(`M${x + w - 4},${y + h - 4}h${-(w - 8)}l6,-6h${w - 20}v${-(h - 20)}l6,-6z`, wood[1]);
    frX_a(0.35, () => { for (let k = 0; k < 3; k++) { const gx = x + 14 + k * (w - 28) / 2.2; frX_st(`M${gx},${y + 14}C${gx + 4},${y + h * 0.4} ${gx - 5},${y + h * 0.6} ${gx + 2},${y + h - 14}`, wood[1], 1.2); } });
  };
  for (const x of [-30, 60, 530, 606]) { panel(x, 12, 80, 104); panel(x, 126, 80, 104); }
  frX_r(0, 0, 640, 10, wood[1]); frX_r(0, 8, 640, 3, wood[4]); frX_r(0, 11, 640, 2, wood[0]); // cornice
  // --- the window: dusk over Washington
  const wx0 = 140, wx1 = 500, wy0 = 14, wy1 = 214;
  g.fillStyle = frX_lg(0, wy0, 0, 186, ['#171a44', '#2a2a62', '#4a3677', '#7c4778', '#b85c6a', '#e58660', '#f7b76c'], 9); g.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
  frX_glow(250, 188, 150, '#ffd08a', 0.35, 0.45); // sun just gone
  // long thin dusk clouds, lit from below
  for (const [cx, cy, w] of [[200, 60, 90], [410, 44, 120], [300, 112, 140], [460, 134, 70], [180, 150, 60]]) {
    frX_e(cx, cy, w / 2, 4, '#3b2f66'); frX_e(cx + 6, cy + 2, w / 2 - 10, 2.5, cy > 100 ? '#e0826a' : '#a0577a');
  }
  // distant city: the Monument (left) and the Capitol (right), cool haze silhouettes
  const hz = '#43305e', hzl = '#6a4670';
  frX_f('M186,190L190,70L194,62L198,70L202,190Z', hz); frX_f('M194,62L198,70L202,190L196,190Z', hzl); frX_r(193, 66, 2, 1, '#f7b76c');
  frX_f('M392,190v-22h86v22Z', hz); frX_f('M402,168v-10h66v10Z', hz); frX_f('M410,158C410,136 460,136 460,158Z', hz); frX_r(432, 126, 6, 12, hz); frX_e(435, 124, 3, 4, hz);
  frX_f('M436,138C450,140 460,148 460,158L436,158Z', hzl); for (let x = 404; x < 468; x += 6) frX_r(x, 170, 2, 18, '#5a3d68');
  // tree line and low city with a few warm windows
  frX_f('M140,214V186C160,178 176,188 196,182C220,176 236,190 260,184C300,176 330,188 360,182C390,178 420,190 450,184C470,180 488,186 500,184V214Z', '#241a38');
  for (let i = 0; i < 26; i++) { const x = 146 + frX_hash(i, 3) * 350, y = 192 + frX_hash(i, 5) * 16; frX_r(x | 0, y | 0, 2, 1, i % 3 ? '#f2b05a' : '#ffe2a0'); }
  // glass sheen + mullions and frame
  frX_a(0.07, () => frX_f('M160,14L230,14L150,214L140,214L140,60Z', '#ffffff'));
  frX_r(wx0, 118, wx1 - wx0, 6, wood[1]); frX_r(wx0, 118, wx1 - wx0, 2, wood[4]);
  frX_r(wx0 - 8, wy0 - 6, wx1 - wx0 + 16, 8, wood[3]); frX_r(wx0 - 8, wy0 - 6, wx1 - wx0 + 16, 2, wood[5]);
  // --- drapes, burgundy velvet, deep folds
  const drape = (x0, x1, flip) => {
    const w = x1 - x0, n = 4;
    for (let i = 0; i < n; i++) {
      const a = x0 + i * w / n, b = a + w / n;
      g.fillStyle = frX_lg(a, 0, b, 0, flip ? ['#2a0a12', '#5c1826', '#8a2c3a', '#b3464c', '#6e1e2e', '#2a0a12'] : ['#3a0e18', '#8a2c3a', '#c05a58', '#8a2c3a', '#4a1220', '#1f0710'], 6);
      g.fillRect(a, 6, b - a + 1, 222);
    }
    frX_r(x0, 222, w, 6, '#1f0710');
  };
  drape(100, 160, 0); drape(480, 540, 1);
  frX_r(90, 2, 460, 8, frX_BRASS[1]); frX_r(90, 2, 460, 2, frX_BRASS[3]); frX_e(90, 6, 6, 6, frX_BRASS[2]); frX_e(550, 6, 6, 6, frX_BRASS[2]); // curtain rod
  // --- the Stars and Stripes on its pole (left)
  frX_r(36, 20, 4, 212, frX_BRASS[1]); frX_r(36, 20, 1.5, 212, frX_BRASS[3]); frX_e(38, 16, 6, 6, frX_BRASS[2]); frX_e(36, 14, 2, 2, frX_BRASS[3]);
  const flag = 'M40,28C62,24 78,34 96,30L98,40C92,90 100,150 84,196C74,204 58,200 48,196C54,150 44,92 40,40Z';
  frX_in(flag, () => {
    for (let k = 0; k < 13; k++) frX_r(30, 28 + k * 14, 80, 7, '#b52a36'), frX_r(30, 35 + k * 14, 80, 7, '#eee6da');
    frX_r(30, 20, 36, 62, '#22306e'); for (let k = 0; k < 15; k++) frX_e(44 + (k % 3) * 8 + ((k / 3 | 0) % 2) * 4, 34 + (k / 3 | 0) * 10, 1.4, 1.4, '#eee6da');
    // folds: shadow troughs and lit crests
    g.fillStyle = frX_lg(40, 0, 98, 0, ['rgba(20,10,30,0.55)', 'rgba(20,10,30,0)', 'rgba(255,240,220,0.18)', 'rgba(20,10,30,0.5)', 'rgba(20,10,30,0.1)', 'rgba(20,10,30,0.6)'], 0); g.fillRect(30, 20, 80, 190);
  });
  frX_st('M84,196C74,204 58,200 48,196', '#c9973a', 2);
  // --- CIA-style seal plaque on the right panelling
  frX_e(588, 70, 30, 30, frX_BRASS[0]); frX_e(587, 69, 28, 28, frX_BRASS[2]); frX_e(588, 70, 23, 23, '#1d2a5a'); frX_e(588, 70, 20, 20, '#27397a');
  frX_f('M588,54L592,66L604,66L594,73L598,85L588,78L578,85L582,73L572,66L584,66Z', frX_BRASS[3]); frX_a(0.3, () => frX_e(581, 61, 8, 5, '#ffffff'));
  // --- the wingback chair (oxblood leather, buttoned)
  const chair = 'M222,236V92C222,40 262,20 320,20C378,20 418,40 418,92V236Z';
  frX_f(chair, '#3d1216');
  frX_in(chair, () => {
    g.fillStyle = frX_lg(222, 0, 418, 0, ['#5e1f1f', '#7a2c26', '#6a2421', '#471719', '#2e0e10'], 5); g.fillRect(222, 20, 196, 220);
    frX_a(0.5, () => frX_st('M232,90C232,46 268,28 320,28', '#b0564a', 3)); // top rim catching the key light
    frX_st('M408,70C400,40 370,28 336,26', 'rgba(170,140,200,0.55)', 2); // cool rim from the window
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
      const x = 240 + c * 32 + (r % 2) * 16, y = 52 + r * 30; if (x > 410) continue;
      frX_a(0.6, () => { frX_seg(x, y, x + 16, y + 15, '#2a0b0d', 1.5); frX_seg(x, y, x - 16, y + 15, '#2a0b0d', 1.5); });
      frX_e(x, y, 2.5, 2.5, '#240a0c'); frX_e(x - 0.8, y - 0.8, 1, 1, '#a24a40');
    }
  });
  frX_st(chair, '#1c0708', 2);
}
// the man himself; m = mouth state (0 shut .. 3), e = eyes (0 open, 1 shut)
function frX_chiefMan(m, e) {
  const s = frX_SK, H = frX_HAIRG;
  const suit = ['#10121c', '#1c2032', '#2a3048', '#3e4764', '#606c8e'];
  // --- jacket
  const jacket = 'M176,294L182,232C186,206 208,192 244,186C266,182 282,176 292,168L320,262L348,168C358,176 374,182 396,186C432,192 454,206 458,232L464,294Z';
  frX_f(jacket, suit[1]);
  frX_in(jacket, () => {
    g.fillStyle = frX_lg(176, 0, 464, 0, [suit[3], suit[2], suit[1], suit[1], suit[0]], 5); g.fillRect(170, 160, 300, 140);
    frX_f('M182,232C186,206 208,192 244,186C230,196 214,206 206,226Z', suit[4]); // lit left shoulder
    frX_a(0.8, () => frX_st('M400,188C430,194 452,206 456,232', '#5a5a86', 2.5)); // cool rim, right shoulder
  });
  // shirt, collar and tie
  frX_f('M292,170L348,170L336,262L304,262Z', '#e6e3dc'); frX_f('M320,170L348,170L336,262L320,262Z', '#bfbfca');
  frX_f('M288,166C300,176 340,176 352,166L354,180C340,188 300,188 286,180Z', '#d8d6d2');
  frX_f('M310,188L330,188L327,203L313,203Z', '#8e1f2c'); frX_f('M320,188L330,188L327,203L320,203Z', '#5e1420');
  const tie = 'M313,203L327,203L334,250L320,266L306,250Z';
  frX_f(tie, '#8e1f2c'); frX_in(tie, () => { for (let k = 0; k < 8; k++) frX_seg(300, 196 + k * 10, 340, 176 + k * 10 + 40, '#1d2450', 3); frX_r(320, 190, 20, 80, 'rgba(40,0,20,0.35)'); });
  frX_f('M294,170L318,190L304,200L286,178Z', '#f4f1ea'); frX_f('M346,170L322,190L336,200L354,178Z', '#c9c8d2'); // collar wings
  frX_st('M318,190L304,200', '#9a98a6', 1); frX_st('M322,190L336,200', '#8a889a', 1);
  // lapels with notches
  frX_f('M292,168L270,200L280,206L272,214L316,264L320,260L300,196Z', suit[2]);
  frX_f('M348,168L370,200L360,206L368,214L324,264L320,260L340,196Z', suit[0]);
  frX_st('M292,168L270,200L280,206L272,214L316,264', suit[4], 1.5);
  frX_st('M300,196L320,260', suit[0], 1.5);
  // flag pin and pocket square
  frX_r(282, 214, 6, 4, '#b52a36'); frX_r(282, 214, 3, 2, '#22306e'); frX_r(282, 217, 6, 1, '#eee6da');
  frX_f('M372,223L377,213L381,219L386,211L391,222Z', '#eeeae2'); frX_f('M377,213L381,219L378,223Z', '#b8b8c4'); frX_st('M368,224L396,221', suit[3], 1.5);
  // --- neck (in shadow under the jaw)
  frX_f('M292,120L348,120L350,174C340,182 300,182 290,174Z', s[2]);
  frX_f('M324,130L348,120L350,174C344,178 334,180 326,180Z', s[1]);
  frX_f('M292,148C310,164 330,164 348,150L348,166C330,176 310,176 292,166Z', s[1]);
  // --- the head: broad bald dome, heavy jaw and jowls
  const head = 'M320,34C350,34 369,54 370,84C371,96 369,108 367,116C365,130 360,142 352,151C344,160 334,166 320,166C306,166 296,160 288,151C280,142 275,130 273,116C271,108 269,96 270,84C271,54 290,34 320,34Z';
  frX_f(head, s[3]);
  frX_in(head, () => {
    // form shadow: the right side turns away from the key light
    frX_f('M330,30C346,46 352,70 350,92C348,110 348,126 344,138C340,150 330,162 316,170L400,170L400,30Z', mix(s[2], s[3], 0.5));
    frX_f('M338,30C354,46 360,70 358,92C356,110 355,126 351,138C347,150 338,160 322,170L400,170L400,30Z', s[2]);
    frX_f('M354,40C364,60 366,90 362,116C358,136 350,152 334,168L400,170L400,30Z', s[1]);
    // reflected cool rim on the far cheek/dome from the window
    frX_a(0.55, () => frX_st('M368,70C370,96 366,120 358,140', '#9a86a8', 2.5));
    // dome highlight and specular
    frX_e(306, 58, 26, 16, s[4], -0.25); frX_e(300, 52, 11, 6, s[5], -0.3);
    // forehead creases
    for (const [y, w] of [[66, 30], [74, 34], [82, 28]]) { frX_st(`M${320 - w},${y + 3}C${310},${y - 2} ${330},${y - 2} ${320 + w},${y + 3}`, s[2], 1.6); frX_a(0.8, () => frX_st(`M${322 - w},${y + 5}C${310},${y} ${330},${y} ${318 + w},${y + 5}`, s[4], 1)); }
    // brow ridge shadow, deep eye sockets
    frX_f('M284,96C292,88 312,88 316,98C314,108 290,110 284,104Z', s[2]);
    frX_f('M324,98C328,88 348,88 356,96C356,104 330,110 324,106Z', s[1]);
    // cheekbones and cheeks
    frX_a(0.6, () => frX_e(292, 118, 12, 7, s[4], 0.25)); frX_a(0.35, () => frX_e(294, 128, 9, 6, '#b8604e'));
    // nasolabial folds, heavy with age, and the jowls
    frX_f('M306,126C298,134 296,144 298,154C294,146 293,136 300,126Z', s[2]);
    frX_st('M306,126C298,134 296,144 298,154', s[1], 1.6); frX_st('M303,124C294,132 292,142 294,152', s[4], 1.2);
    frX_f('M334,126C344,134 346,146 342,156C348,146 348,134 340,124Z', s[1]);
    frX_st('M334,126C342,134 344,144 342,154', s[0], 1.6);
    frX_st('M296,156C294,160 292,160 288,156', s[1], 1.5); frX_st('M344,156C346,160 348,160 352,156', s[0], 1.5);
    // chin: lit ball, shadow beneath
    frX_e(316, 158, 12, 5, s[4]); frX_f('M300,166C310,162 330,162 342,166L342,170L300,170Z', s[1]);
  });
  frX_st('M340,36C360,44 370,62 370,84C371,98 368,112 366,120C362,136 356,146 350,152C342,160 332,166 320,166', s[0], 1.5); // shadow-side outline
  frX_st('M300,38C284,46 272,62 270,84', s[2], 1);
  // the fringe: close-cropped grey hair hugging the sides of the skull above and behind the ears
  frX_f('M283,80C274,83 267,90 264,100C262,108 263,116 267,122L273,120C272,112 274,102 278,95C280,90 283,86 283,80Z', H[1]);
  frX_f('M357,80C366,83 373,90 376,100C378,108 377,116 373,122L367,120C368,112 366,102 362,95C360,90 357,86 357,80Z', H[0]);
  frX_st('M280,84C273,88 268,96 266,106', H[3], 1.3); frX_st('M278,90C274,96 271,104 270,114', H[2], 1.1);
  frX_st('M360,84C367,88 372,96 374,106', H[2], 1.1); frX_st('M364,92C368,98 370,106 370,114', H[1], 1);
  for (let k = 0; k < 5; k++) { frX_seg(265.5 - k * 0.2, 94 + k * 5, 262.5, 96 + k * 5, H[2], 1.1); frX_seg(374.5 + k * 0.2, 94 + k * 5, 377.5, 96 + k * 5, H[1], 1.1); }
  // --- ears, in front of the fringe
  for (const sg of [-1, 1]) {
    const ex = 320 + sg * 53, lit = sg < 0;
    frX_f(`M${ex - sg * 4},100C${ex + sg * 6},96 ${ex + sg * 10},104 ${ex + sg * 9},114C${ex + sg * 9},124 ${ex + sg * 6},134 ${ex - sg * 3},136Z`, lit ? s[3] : s[2]);
    frX_f(`M${ex - sg * 1},105C${ex + sg * 5},103 ${ex + sg * 6},110 ${ex + sg * 5},116C${ex + sg * 4},122 ${ex + sg * 2},126 ${ex - sg * 2},126Z`, lit ? s[2] : s[1]);
    frX_st(`M${ex + sg * 2},101C${ex + sg * 9},103 ${ex + sg * 9},118 ${ex + sg * 6},130`, lit ? s[4] : s[3], 1.3);
    frX_e(ex + sg * 2, 131, 3.5, 4, lit ? '#c9745e' : s[2]);
    frX_st(`M${ex - sg * 4},100C${ex + sg * 6},96 ${ex + sg * 10},104 ${ex + sg * 9},114C${ex + sg * 9},124 ${ex + sg * 6},134 ${ex - sg * 3},136`, lit ? s[1] : s[0], 1);
  }
  // --- nose: big, straight, a touch red at the tip
  frX_f('M314,100C314,112 310,120 308,126C306,130 309,134 314,134C318,136 322,136 326,134C331,134 334,130 332,126C330,120 326,112 326,100Z', s[3]);
  frX_f('M322,100C324,112 328,120 332,126C334,130 331,134 326,134C324,130 322,116 322,100Z', s[2]);
  frX_st('M316,100C316,110 313,118 311,124', s[4], 2);
  frX_e(320, 128, 6, 4, '#d88c70'); frX_e(318, 126, 2.5, 1.6, s[5]);
  frX_f('M307,128C304,132 306,136 312,136C315,137 318,138 320,138C322,138 325,137 328,136C334,136 336,132 333,128C332,133 326,134 320,134C314,134 308,133 307,128Z', s[1]);
  frX_e(313, 134, 2.6, 1.3, s[0]); frX_e(327, 134, 2.6, 1.3, s[0]);
  frX_f('M308,138C314,142 326,142 332,138C328,144 312,144 308,138Z', s[2]); // under-nose shadow
  // --- eyes: hooded, pale steel blue, bags beneath
  for (const sg of [-1, 1]) {
    const ex = 320 + sg * 19, ey = 102, lit = sg < 0;
    const io = -sg, oc = [ex - io * 10, ey - 1], icn = [ex + io * 10, ey + 1.5];
    const eye = `M${oc[0]},${oc[1]}C${ex - io * 4},${ey - 5} ${ex + io * 5},${ey - 3.5} ${icn[0]},${icn[1]}C${ex + io * 5},${ey + 4.5} ${ex - io * 5},${ey + 4} ${oc[0]},${oc[1]}Z`;
    if (!e) {
      frX_f(eye, lit ? '#dccbbd' : '#a89590');
      frX_in(eye, () => {
        const ix = ex + io * 0.5; frX_e(ix, ey + 0.5, 4.2, 4.2, '#2c3c50'); frX_e(ix, ey + 1, 3.3, 3.3, lit ? '#6a84a0' : '#4f6780'); frX_e(ix, ey + 0.5, 1.8, 1.8, '#0a0c12');
        frX_r(ex - 12, ey - 7, 24, 4.6, lit ? s[1] : s[0]); // heavy lid throws a shadow on the eyeball
      });
      frX_e(ex + io * 0.5 - 1.6, ey - 0.6, 1, 1, '#ffffff');
      frX_st(`M${oc[0] - io},${oc[1] + 0.5}C${ex - io * 4},${ey - 5} ${ex + io * 5},${ey - 3.5} ${icn[0]},${icn[1]}`, s[0], 2.2); // lash line
      frX_st(`M${icn[0]},${icn[1]}C${ex + io * 5},${ey + 4.5} ${ex - io * 5},${ey + 4} ${oc[0]},${oc[1]}`, lit ? s[2] : s[1], 1);
    } else {
      frX_f(eye, lit ? s[3] : s[2]);
      frX_st(`M${oc[0]},${oc[1] + 1}C${ex - io * 4},${ey + 3} ${ex + io * 5},${ey + 3} ${icn[0]},${icn[1]}`, s[0], 2);
    }
    // hooded upper lid fold
    frX_st(`M${ex - 11},${ey - 4}C${ex - 4},${ey - 9} ${ex + 6},${ey - 8} ${ex + 12},${ey - 2}`, lit ? s[2] : s[1], 1.6);
    // bags under the eyes
    frX_st(`M${ex - 9},${ey + 6}C${ex - 4},${ey + 10} ${ex + 5},${ey + 10} ${ex + 10},${ey + 5}`, lit ? s[2] : s[1], 1.4);
    frX_a(0.9, () => frX_st(`M${ex - 8},${ey + 9}C${ex - 3},${ey + 12} ${ex + 4},${ey + 12} ${ex + 9},${ey + 8}`, lit ? s[4] : s[3], 1));
    // crow's feet
    frX_st(`M${ex + sg * 13},${ey}l${sg * 5},-2M${ex + sg * 13},${ey + 3}l${sg * 5},2`, lit ? s[2] : s[1], 1);
  }
  // --- brows: heavy grey thatch, knitted down into a scowl
  for (const sg of [-1, 1]) {
    const io = -sg, ex = 320 + sg * 19, lit = sg < 0;
    frX_f(`M${ex + io * 12},${98}C${ex + io * 6},${90} ${ex - io * 4},${86} ${ex - io * 14},${90}L${ex - io * 13},${93}C${ex - io * 4},${91} ${ex + io * 4},${94} ${ex + io * 11},${101}Z`, lit ? H[1] : H[0]);
    for (let k = 0; k < 13; k++) {
      const u = k / 12, bx = ex + io * (11 - u * 24), by = 97 - Math.sin(u * 2.6) * 7 + u * 1;
      frX_seg(bx, by + 1, bx - io * (3 + u * 4 + (k % 3)), by - 2 - (k % 2) - frX_hash(k, sg) * 2, k % 2 ? (lit ? H[3] : H[2]) : (lit ? H[2] : H[1]), 1.1);
    }
  }
  frX_st('M316,88C315,92 316,95 317,99M324,88C325,92 324,95 323,99', s[1], 1.5); frX_st('M319,88L319,97', s[4], 0.8); // the frown's "11"
  // --- mouth: thin, turned down
  const my = 148;
  frX_f(`M300,${my - 4}C308,${my - 6} 332,${my - 6} 340,${my - 4}L338,${my + 6}C330,${my + 10} 310,${my + 10} 302,${my + 6}Z`, s[3]);
  frX_f(`M320,${my - 5}C330,${my - 6} 336,${my - 5} 340,${my - 4}L338,${my + 6}C332,${my + 9} 326,${my + 10} 320,${my + 10}Z`, s[2]);
  if (m === 0) {
    frX_st(`M302,${my + 2}C308,${my - 1} 332,${my - 1} 338,${my + 2}`, s[0], 2);
    frX_st(`M300,${my + 3}L302,${my + 2}M338,${my + 2}L340,${my + 4}`, s[0], 1.5);
  } else {
    const o = [0, 3, 6, 5][m], wd = m === 3 ? 10 : 15;
    frX_f(`M${320 - wd},${my + 1}C${314 - wd / 2},${my - 1} ${326 + wd / 2},${my - 1} ${320 + wd},${my + 1}C${326 + wd / 2},${my + 1 + o} ${314 - wd / 2},${my + 1 + o} ${320 - wd},${my + 1}Z`, '#2a0e14');
    if (o > 3) frX_f(`M${322 - wd},${my + 1}C${314 - wd / 2},${my - 0.5} ${326 + wd / 2},${my - 0.5} ${318 + wd},${my + 1}L${318 + wd},${my + 2.5}L${322 - wd},${my + 2.5}Z`, '#d8cfc4');
    frX_st(`M300,${my + 3}L${320 - wd},${my + 1}M${320 + wd},${my + 1}L340,${my + 4}`, s[0], 1.5);
  }
  frX_st(`M306,${my - 3}C314,${my - 5} 326,${my - 5} 334,${my - 3}`, s[1], 1.2); // upper lip edge
  frX_st(`M308,${my + 7 + (m ? [0, 2, 4, 3][m] : 0)}C314,${my + 9 + (m ? [0, 2, 4, 3][m] : 0)} 326,${my + 9 + (m ? [0, 2, 4, 3][m] : 0)} 332,${my + 7 + (m ? [0, 2, 4, 3][m] : 0)}`, s[4], 1.2); // lower lip light
}
function frX_chiefDesk() {
  const wood = frX_WOOD, B = frX_BRASS;
  // --- the desk: mahogany top in perspective, gilt-tooled green leather blotter
  frX_f('M0,232L640,232L640,294L0,294Z', wood[3]);
  g.fillStyle = frX_lg(0, 226, 0, 254, [wood[3], wood[4], wood[3]], 4); frX_f('M0,228L640,228L640,254L0,254Z', g.fillStyle);
  frX_r(0, 226, 640, 2, wood[1]);
  frX_f('M200,230L440,230L452,252L188,252Z', '#1e3a2a'); frX_f('M206,232L434,232L444,250L196,250Z', '#28503a'); frX_st('M210,234L430,234L438,248L202,248Z', '#b88a3a', 1);
  frX_r(0, 252, 640, 4, wood[5]); frX_r(0, 256, 640, 2, wood[1]);
  g.fillStyle = frX_lg(0, 258, 0, 294, [wood[3], wood[2], wood[1]], 4); g.fillRect(0, 258, 640, 36);
  for (const x of [20, 170, 470]) { frX_st(`M${x},266h150v24h-150z`, wood[1], 2); frX_st(`M${x + 2},${268}h146`, wood[4], 1); }
  // --- sleeves and folded hands
  const suit = ['#10121c', '#1c2032', '#2a3048', '#3e4764', '#606c8e'], s = frX_SK;
  frX_a(0.5, () => frX_e(320, 250, 120, 6, '#1a0a06')); // arms' shadow on the desk
  frX_f('M180,236C188,214 206,204 226,206L284,226L282,250L186,250Z', suit[2]); frX_st('M184,232C192,218 206,210 224,210', suit[4], 2);
  frX_f('M460,236C452,214 434,204 414,206L356,226L358,250L454,250Z', suit[1]); frX_st('M450,220C442,212 430,208 418,210', '#5a5a86', 1.5);
  frX_st('M196,249L282,249M360,249L446,249', suit[0], 2);
  frX_f('M266,226L282,222L286,248L270,250Z', '#e6e3dc'); frX_f('M374,226L358,222L354,248L370,250Z', '#bfbfca'); // cuffs
  frX_r(272, 234, 3, 3, frX_BRASS[2]); frX_r(365, 234, 3, 3, frX_BRASS[2]);
  // big, heavy hands, fingers interlaced, resting on the blotter
  frX_f('M280,250C276,238 280,224 294,218L321,216L321,251Z', s[2]); // back of the left hand (lit from the left)
  frX_f('M360,250C364,238 360,224 346,218L319,216L319,251Z', s[1]); // back of the right hand
  frX_f('M282,248C279,238 283,226 294,221L300,222C290,228 287,238 288,248Z', s[3]); frX_st('M284,236C288,228 294,223 302,221', s[4], 1.3);
  frX_st('M352,222C358,228 360,238 358,248', '#9a86a8', 1); // cool rim
  for (let k = 0; k < 8; k++) { // fingers curling over the opposite hand, alternating left/right
    const left = k % 2 === 0, x = 293 + k * 7.6, col = left ? s[3] : s[2], dk = left ? s[2] : s[1];
    frX_f(`M${x - 3.6},${225}C${x - 4},${219} ${x + 4},${219} ${x + 3.6},${225}L${x + 3.2},${240 + (k % 2) * 3}C${x + 3},${246} ${x - 3},${246} ${x - 3.2},${240 + (k % 2) * 3}Z`, col);
    frX_f(`M${x + 1},${225}C${x + 2},${221} ${x + 4},${222} ${x + 3.6},${225}L${x + 3.2},${240 + (k % 2) * 3}C${x + 3},${244} ${x + 1.5},${245} ${x + 0.5},${245}Z`, dk);
    frX_e(x - 1, 223, 2, 1.4, left ? s[4] : s[3]);
    frX_st(`M${x - 2.6},${233.5}l3.6,0`, dk, 0.9);
  }
  frX_st('M320,218L320,251', s[0], 1.2);
  // thumbs crossed on top
  frX_f('M334,226C332,220 326,215 320,214C316,214 316,218 319,219C324,220 328,224 330,229Z', s[2]);
  frX_f('M300,228C303,220 310,214 318,213C322,213 322,218 318,219C312,220 306,224 304,231Z', s[4]);
  frX_st('M302,227C305,220 311,215 318,214', s[5], 0.9); frX_st('M304,231C306,225 312,221 318,219', s[2], 1);
  frX_st('M282,250L358,250', '#3a1c10', 1.5);
  // --- green banker's lamp (left) with its pool of light
  frX_glow(96, 236, 110, '#ffd890', 0.35, 0.28);
  frX_e(96, 228, 26, 5, B[0]); frX_e(96, 226, 24, 4, B[2]); frX_r(93, 184, 6, 42, B[1]); frX_r(93, 184, 2, 42, B[3]);
  frX_f('M50,188C54,168 138,168 142,188Z', '#1d5a38'); frX_f('M50,188C54,168 138,168 142,188Z', frX_lg(50, 0, 142, 0, ['#2e8a52', '#1f6a40', '#0f3a22'], 4));
  frX_a(0.9, () => frX_st('M60,180C70,172 90,170 104,171', '#8ad6a0', 2));
  frX_r(48, 187, 96, 4, B[2]); frX_r(48, 190, 96, 1, B[0]);
  frX_a(0.55, () => frX_f('M52,191L140,191L170,232L22,232Z', 'rgba(255,220,150,0.25)'));
  frX_r(60, 191, 72, 2, '#fff2c0');
  // --- the red hotline telephone
  frX_e(192, 244, 42, 6, 'rgba(10,4,4,0.45)');
  frX_f('M156,242L162,214C164,208 222,208 224,214L230,242Z', '#8e1a1c');
  frX_f('M156,242L162,214C164,208 186,208 192,210L186,242Z', '#c3302c');
  frX_f('M150,206C150,196 236,196 236,206L230,214L156,214Z', '#b52a2a'); frX_f('M150,206C150,196 190,196 196,198L186,210L156,214Z', '#e25a48');
  frX_e(152, 208, 10, 7, '#8e1a1c'); frX_e(234, 208, 10, 7, '#6e1216'); frX_a(0.8, () => frX_st('M160,200C176,196 196,196 210,198', '#ff9a80', 1.5));
  frX_e(193, 228, 12, 9, '#efe4d4'); frX_e(193, 228, 5, 4, '#8e1a1c'); for (let k = 0; k < 10; k++) frX_e(193 + Math.cos(k * 0.63) * 9, 228 + Math.sin(k * 0.63) * 6.5, 1.5, 1.2, '#5a0e10');
  frX_st('M230,238C246,244 248,250 262,246C272,244 270,252 278,254', '#3a0a0c', 2);
  // --- ashtray and a smouldering cigar
  frX_e(398, 244, 22, 6, 'rgba(10,4,4,0.4)'); frX_e(396, 240, 22, 7, '#8fa0a8'); frX_e(396, 238, 18, 5, '#3a4a54'); frX_a(0.8, () => frX_st('M378,236C386,232 402,232 410,234', '#e8f4f8', 1.5));
  frX_f('M388,236L426,228L428,233L390,240Z', '#6a3a1e'); frX_f('M388,236L426,228L427,230L389,238Z', '#9a6030'); frX_r(404, 230, 5, 6, '#c02a2a'); frX_r(404, 230, 5, 1.5, B[2]);
  frX_e(426, 230.5, 2.5, 2.8, '#6a6a6a');
  // --- framed photograph (angled) and the desk clock
  frX_f('M452,244L456,184L504,188L502,246Z', B[1]); frX_f('M452,244L456,184L504,188L502,246Z', frX_lg(452, 0, 504, 0, [B[2], B[1]], 3));
  frX_f('M460,238L463,192L497,195L496,240Z', '#9ab4c0'); frX_f('M460,238L461,222L496,224L496,240Z', '#4a6a40');
  frX_e(472, 214, 5, 5, s[3]); frX_f('M464,238L466,222C470,218 476,218 480,222L480,238Z', '#1d2a4a'); frX_e(485, 216, 4.5, 5, '#e0a080'); frX_f('M478,238L479,224C482,220 490,220 492,224L493,238Z', '#b04050'); frX_f('M480,214C480,206 492,206 491,215L488,212C486,210 482,210 480,214Z', '#6a4020');
  frX_a(0.25, () => frX_f('M463,192L497,195L470,238L461,238Z', '#ffffff'));
  frX_f('M530,246L534,182C540,172 580,172 586,182L590,246Z', wood[1]); frX_f('M532,244L536,184C542,176 578,176 584,184L588,244Z', frX_lg(532, 0, 588, 0, [wood[5], wood[3], wood[1]], 4));
  frX_e(560, 212, 20, 20, B[2]); frX_e(560, 212, 18, 18, B[0]); frX_e(560, 212, 16, 16, '#efe6d2'); frX_a(0.25, () => frX_e(554, 206, 9, 7, '#ffffff'));
  for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; frX_seg(560 + Math.cos(a) * 13, 212 + Math.sin(a) * 13, 560 + Math.cos(a) * (k % 3 ? 14.5 : 15.5), 212 + Math.sin(a) * (k % 3 ? 14.5 : 15.5), '#2a2020', k % 3 ? 1 : 2); }
  frX_r(528, 244, 64, 4, wood[1]);
}
function frX_chiefPic(m, e) {
  return art('frX_chief' + m + e, W, 147, () => { frX_chiefRoom(); frX_chiefMan(m, e); frX_chiefDesk(); });
}
function chiefArt(t) {
  const m = [0, 1, 2, 1, 0, 3, 2, 0][(t * 7 | 0) % 8];
  blit(frX_chiefPic(m, 0), 0, 0);
  if (t % 4.3 > 4.12) g.drawImage(frX_chiefPic(0, 1), 280, 86, 80, 28, 140, 43, 40, 14); // blink patch
  fine(() => {
    // cigar smoke: two lazy ribbons curling up from the ashtray, fading as they rise
    for (const [ph, amp, wd, al] of [[0, 1, 1, 0.42], [2.2, 0.6, 0.6, 0.3]]) {
      const L = [], R = [];
      for (let k = 0; k <= 36; k++) {
        const u = k / 36, y = 229 - u * 150, x = 427 + Math.sin(u * 6.5 - t * 1.3 + ph) * (1 + u * 16) * amp + u * 14, w = (0.8 + u * 5 + Math.sin(u * 9 + t + ph) * u * 2) * wd;
        L.push(x - w + ',' + y); R.unshift(x + w + ',' + y);
      }
      const gr = g.createLinearGradient(0, 229, 0, 79); gr.addColorStop(0, 'rgba(220,224,236,' + al + ')'); gr.addColorStop(0.5, 'rgba(200,204,222,' + al * 0.5 + ')'); gr.addColorStop(1, 'rgba(190,194,214,0)');
      g.fillStyle = gr; g.fill(new Path2D('M' + L.join('L') + 'L' + R.join('L') + 'Z'));
    }
    frX_e(426.5, 230.5, 2, 2.4, (t * 1.7 | 0) % 2 ? '#ff7a3a' : '#ffb85a');
    // clock hands
    const sec = (t + 17) % 60, a = sec / 60 * 6.283;
    frX_seg(560, 212, 560 + Math.sin(2.2) * 8, 212 - Math.cos(2.2) * 8, '#1a1414', 2); frX_seg(560, 212, 560 + Math.sin(0.1) * 12, 212 - Math.cos(0.1) * 12, '#1a1414', 1.6);
    frX_seg(560, 212, 560 + Math.sin(a) * 14, 212 - Math.cos(a) * 14, '#c02a2a', 1); frX_e(560, 212, 1.8, 1.8, frX_BRASS[2]);
    // brass nameplate on the desk front
    frX_r(482, 260, 120, 24, frX_BRASS[0]); frX_r(484, 261, 116, 21, frX_BRASS[2]); frX_r(484, 261, 116, 2, frX_BRASS[3]); frX_r(484, 280, 116, 2, frX_BRASS[1]);
    for (const x of [490, 594]) { frX_e(x, 271, 2.5, 2.5, frX_BRASS[1]); frX_e(x - 0.6, 270.4, 1, 1, frX_BRASS[3]); }
  });
  text('CHIEF', 268, 133, '#f2d584'); text('CHIEF', 267, 132, '#3a2208');
  rect(0, 147, W, 53, P.K); rect(0, 147, W, 1, P.W); rect(0, 199, W, 1, P.W); rect(0, 147, 1, 53, P.W); rect(319, 147, 1, 53, P.W);
}

// ===================================================================
// MAXIMILLIAN & MAXINE, full length (character select), 56 x 172 layout = 112 x 344 fine.
// Plan: stage-lit like a film poster: warm key spot from the upper left, a rim of curtain
// colour (blue for Max, red for Maxine) down the right edge, soft floor shadow.
// Max: midnight tuxedo (5 blue-black steps), white shirt, walther held down by his thigh.
// Maxine: black satin gown with violet sheen, opera gloves, raven hair, pistol raised.
// Skin 6 steps (rose-brown shadow -> warm cream); ~30 colours each.
// ===================================================================
const frX_FS = ['#3a1c24', '#6e3632', '#a85c46', '#d68c68', '#efb38c', '#fbdcbc'];
const frX_TUX = ['#06060c', '#0e0f1a', '#191b2b', '#2a2e44', '#474c68'];
function frX_hand(x, y, flip, S, sc) { // relaxed hand hanging down, knuckles out; (x, y) = wrist centre
  g.save(); g.translate(x, y); g.scale(flip ? -sc : sc, sc);
  frX_f('M-5,0C-6,6 -6,12 -4,17C-3,20 1,21 3,19C5,16 6,10 5,3L5,0Z', S[3]);
  frX_f('M1,1C3,6 4,12 3,19C5,16 6,10 5,3L5,0Z', S[2]);
  frX_st('M-2,13L-1.5,19.5M0.5,13.5L1,20M2.8,13L3,18.5', S[1], 0.8);
  frX_f('M-5,2C-8,5 -8,10 -6,13L-4,12C-5,9 -5,6 -4,4Z', S[3]); // thumb
  frX_st('M-5,3C-6,6 -6,9 -5.5,11', S[4], 0.9);
  g.restore();
}
function frX_maxFig() {
  const S = frX_FS, T = frX_TUX, rim = '#5a7ed8';
  // --- trousers, satin stripe down the seams
  frX_f('M33,182L57,186L54,262L52,332L38,332L35,262Z', T[2]);
  frX_f('M55,186L80,180L79,262L76,332L62,332L58,262Z', T[1]);
  frX_f('M33,182L44,184L41,262L42,332L38,332L35,262Z', T[3]);
  frX_st('M34,186L36,262L38.5,330', T[4], 1.2); frX_st('M79.5,186L78.5,262L75.8,330', rim, 1.4);
  frX_st('M55,190L54,262L52,300', T[0], 1); frX_st('M58,190L59,262L62,300', T[0], 1);
  frX_st('M44,250C47,254 50,254 53,252', T[1], 1); // knee crease
  // --- patent shoes
  frX_f('M38,329L52,329L53,336C53,340 49,341 44,341L30,341C27,341 27,337 31,335Z', T[0]); frX_st('M31,336C36,334 42,334 48,334', '#8890b0', 1.2); frX_e(34, 336, 2, 1, '#e8ecf8');
  frX_f('M62,329L76,329L81,335C85,337 85,341 82,341L68,341C63,341 61,340 61,336Z', T[0]); frX_st('M66,334C70,334 76,334 81,336', '#6070a0', 1.2);
  // --- right arm (viewer's right) behind the torso, hanging, pistol pointing down
  frX_f('M82,70C92,74 96,86 96,108L96,150L94,186L82,186L82,150L80,110Z', T[1]);
  frX_st('M92,76C96,88 97,104 97,140L95,184', rim, 1.6);
  frX_f('M82,184L95,184L96,190L82,190Z', '#dcdde6');
  // pistol: slide, grip in the fist, muzzle down along the thigh
  frX_f('M85,196L95,196L95.5,236L85.5,236Z', '#1c1e28'); frX_st('M87,200L87.4,234', '#8890b0', 1.2); frX_st('M94.2,200L94.4,234', '#30344a', 1); frX_r(88, 224, 5, 1, '#0c0d12'); frX_e(90.5, 237, 1.6, 1, '#050508');
  frX_st('M85,208C81,212 81,218 85,220', '#1c1e28', 1.6); // trigger guard
  frX_f('M82,192L97,192L97,206L82,206Z', '#1a1c24');
  frX_f('M81,190C80,196 81,204 85,207C89,209 95,208 97,204C98,198 97,193 96,190Z', S[2]);
  frX_st('M82,196C84,197 86,197 88,196M82,200C84,201 86,201 88,200M83,204C85,205 87,205 89,204', S[1], 0.9);
  frX_f('M89,190C92,192 96,195 97,200C94,198 91,196 89,194Z', S[3]);
  // --- jacket body
  const jk = 'M20,72C22,66 34,61 45,59L67,59C78,61 90,66 92,72L89,112L84,148L87,190C76,194 66,194 57,192C46,194 36,194 25,190L28,148L23,112Z';
  frX_f(jk, T[2]);
  frX_in(jk, () => {
    g.fillStyle = frX_lg(20, 0, 92, 0, [T[3], T[2], T[2], T[1], T[0]], 5); g.fillRect(18, 56, 80, 140);
    frX_f('M20,72C22,66 34,61 45,59L40,70C32,72 24,78 22,90Z', T[4]); // lit shoulder
    frX_st('M91,74L88,112L84,148L86,190', rim, 1.8);
    frX_st('M56,150L57,192', T[0], 1.2); // front opening below the button
    frX_st('M28,160C36,162 44,162 50,160M62,160C70,162 78,162 84,160', T[0], 1); // pocket jets
  });
  // shirt front, studs
  frX_f('M45,59L67,59L57,146L55,146Z', '#eceae4'); frX_f('M56,59L67,59L57,146Z', '#c4c6d4');
  frX_st('M52,76L53,140', '#d8d6d0', 0.8); for (let y = 88; y < 140; y += 14) frX_e(55.5, y, 1.2, 1.2, '#15161f');
  // satin shawl lapels
  frX_f('M45,59L33,68L52,140L56,148Z', T[1]); frX_f('M67,59L79,68L60,140L56,148Z', T[0]);
  frX_st('M44,61L35,69L52,138', '#6a7090', 1.4); frX_st('M68,61L78,68', rim, 1);
  frX_e(56, 150, 1.6, 1.6, '#2e3248');
  // pocket square
  frX_f('M68,94L71,88L74,92L77,87L80,94Z', '#f4f2ea'); frX_st('M66,95L82,93', T[3], 1.4);
  // --- left arm (viewer's left) hanging relaxed, in front of the torso's edge
  const armL = 'M21,70C12,74 9,86 10,108L11,150L15,186L28,186L28,150L30,110L31,80Z';
  frX_f(armL, T[2]);
  frX_in(armL, () => { frX_f('M21,70C12,74 9,86 10,108L11,150L15,186L19,186L16,150L15,108C15,90 17,80 24,74Z', T[3]); frX_st('M29,82L28,150L27,186', T[0], 1.4); });
  frX_st('M13,120C16,122 20,122 24,121', T[1], 1); // elbow crease
  frX_f('M14,184L28,184L28,190L15,190Z', '#eeece6'); frX_r(20, 186, 2, 2, '#c9973a');
  frX_hand(21, 190, false, S, 1.15);
  // --- neck, collar, bow tie
  frX_f('M48,44L64,44L65,60L47,60Z', S[2]); frX_f('M47,46C52,56 60,56 65,46L65,58L47,58Z', S[1]); frX_st('M50,52L50,58', S[3], 1.2);
  frX_f('M46,57L55,60L50,66L45,62Z', '#f6f4ee'); frX_f('M66,57L57,60L62,66L67,62Z', '#c8cad6');
  frX_f('M56,62L46,58L45,67L56,64Z', '#0c0c14'); frX_f('M56,62L66,58L67,67L56,64Z', '#0c0c14'); frX_e(56, 63, 2.6, 2.6, '#1a1b26');
  frX_st('M47,60L51,62', '#3a3c52', 0.8);
  // --- head: square-jawed, side-parted dark hair, a half smile
  const hd = 'M56,13C66,13 72,20 72,30C72,36 71,41 68,46C65,50 61,53 56,53C51,53 47,50 44,46C41,41 40,36 40,30C40,20 46,13 56,13Z';
  frX_e(40.5, 34, 3, 5, S[3]); frX_e(71.5, 34, 3, 5, S[2]); frX_e(41, 34, 1.4, 3, S[2]); frX_e(71, 34, 1.4, 3, S[1]);
  frX_f(hd, S[3]);
  frX_in(hd, () => {
    frX_f('M62,12C68,20 68,34 66,42C64,48 60,52 54,56L80,56L80,10Z', S[2]);
    frX_f('M68,20C71,30 70,40 66,48L80,56L80,10Z', S[1]);
    frX_a(0.5, () => { frX_e(48, 36, 3.4, 2.6, S[4]); frX_e(52, 23, 6, 3, S[4]); }); // cheek & brow light
    frX_f('M44,46C48,52 64,52 68,46L68,56L44,56Z', S[2]); // under the jaw
  });
  frX_st('M68,20C72,30 71,42 66,48C62,52 58,53 54,53', S[1], 1);
  // hair: slicked, parted on his right, with a glossy highlight from the key light
  frX_f('M39,32C37,20 42,10 52,8C62,6 72,10 74,20C75,26 74,30 72,33C70,26 68,22 64,20C58,22 50,20 46,18C44,22 42,26 41,33Z', '#1a100c');
  frX_f('M46,18C50,12 58,10 64,12C70,14 73,20 73,26C70,20 64,17 58,17C54,17 50,18 46,18Z', '#2e1c14');
  frX_st('M45,16C50,11 58,10 63,12', '#6a4a36', 1.4); frX_st('M50,12C54,10 58,10 60,10', '#9a7458', 1);
  frX_st('M72,24C74,28 73,32 72,33', rim, 1);
  // brows, eyes, nose, mouth
  frX_st('M45,28C47,26.5 50,26.5 53,27.5', '#2a1812', 1.6); frX_st('M59,27.5C62,26.5 65,26.5 67,28', '#2a1812', 1.6);
  for (const [ex, lit] of [[49.5, 1], [62.5, 0]]) {
    frX_f(`M${ex - 3.4},31C${ex - 2},29.4 ${ex + 2},29.4 ${ex + 3.4},31C${ex + 2},32.2 ${ex - 2},32.2 ${ex - 3.4},31Z`, lit ? '#f0e6e0' : '#c8b8b4');
    frX_e(ex + 0.6, 31, 1.5, 1.5, '#3a2a20'); frX_e(ex + 0.6, 31, 0.8, 0.8, '#0a0808'); frX_r(ex, 30, 0.8, 0.8, '#ffffff');
    frX_st(`M${ex - 3.6},30.8C${ex - 2},29 ${ex + 2},29 ${ex + 3.6},30.8`, '#2a1410', 1);
  }
  frX_f('M55,31L54,39C53.5,41 55,42 56.5,42L59,41.5C60,41 59.5,39.5 58,39L57,31Z', S[2]); frX_st('M55,32L54.2,39', S[4], 1);
  frX_st('M53.5,41.6C55,43 58,43 59.5,41.6', S[1], 0.9);
  frX_st('M51,46.5C54,47.6 58,47.6 62,45.6', '#6a2c2a', 1.2); frX_st('M53,48.6C55,49.4 58,49.4 60,48.4', S[4], 0.8);
  frX_st('M56,50.6C57,51 59,50.6 60,50', S[2], 0.8);
}
function frX_maxineFig() {
  const S = frX_FS, rim = '#e05a5a';
  const D = ['#07060c', '#120f1c', '#211c32', '#3a3254', '#6a5a8a', '#b8a6d4']; // satin: deep..sheen
  const HR = ['#0a0608', '#1c1014', '#34202a', '#5a3a48', '#8a6070'];
  // --- long raven hair behind the shoulders
  frX_f('M40,20C36,34 34,56 36,80C38,92 44,96 50,92L50,40L62,40L62,92C68,96 76,92 78,80C80,56 76,34 72,20Z', HR[1]);
  frX_st('M40,40C38,56 38,72 40,86', HR[3], 1.2); frX_st('M75,40C77,56 77,70 76,84', rim, 1.2);
  // --- the gown: strapless fitted bodice, narrow waist, a long skirt flaring to the floor
  const gown = 'M40,75C42,69 50,68 53,72L56,77L59,72C62,68 70,69 72,75C74,86 72,100 68,112C70,126 74,138 76,150C80,176 82,210 84,240C86,280 88,310 92,338C70,342 44,342 22,338C26,310 28,280 30,240C32,210 34,176 38,150C40,138 42,126 44,112C40,100 38,86 40,72Z';
  const slit = 'M63,190C62,230 60,290 58,339L78,339C76,300 72,240 66,196Z';
  frX_f(gown, D[1]);
  frX_in(gown, () => {
    g.fillStyle = frX_lg(22, 0, 92, 0, [D[3], D[2], D[1], D[1], D[0]], 5); g.fillRect(18, 60, 80, 290);
    // folds fanning out from the hips to the hem: lit crests and deep troughs
    for (const [x0, x1, c, w] of [[42, 30, D[4], 3.2], [44, 33, D[5], 1], [50, 44, D[0], 2.4], [54, 52, D[3], 2.6], [58, 57, D[0], 1.6], [70, 84, D[0], 2.4], [73, 90, rim, 1.4]]) {
      frX_st(`M${x0},152C${x0 + (x1 - x0) * 0.3},210 ${x1},270 ${x1},340`, c, w);
    }
    frX_f('M40,75C42,69 50,68 53,72L56,77L56,110C50,110 45,106 42,96Z', D[3]); // lit side of the bodice
    frX_st('M41,86C45,90 51,90 55,86', D[1], 1.4); frX_st('M57,86C61,90 67,90 71,86', D[0], 1.4); frX_a(0.9, () => frX_st('M42,80C43,76 46,73 50,73', D[4], 1.6)); // bust
    frX_a(0.8, () => frX_st('M43,80C45,90 47,100 50,106', D[4], 1.4));
    frX_st('M71,78C71,90 70,100 68,110', rim, 1);
    frX_st('M44,112C50,116 62,116 68,112', D[0], 1.4); // waist seam
    frX_st('M56,78L56,112', D[0], 1);
    // the slit: her left leg stepping through
    frX_f(slit, D[0]);
    frX_in(slit, () => {
      frX_f('M60,190C66,210 70,240 68,262C68,280 70,310 72,332L76,340L64,340L64,332C62,310 62,290 62,270C60,250 58,220 58,190Z', S[3]);
      frX_f('M65,196C70,214 72,244 70,264C70,284 72,312 74,334L76,340L70,340C68,316 66,288 66,268C66,244 66,220 63,196Z', S[2]);
      frX_st('M60,200C62,226 62,250 62,268C62,290 64,312 65,330', S[4], 1.2);
      frX_st('M62,262C64,264 66,264 68,262', S[2], 0.8); // knee
    });
  });
  frX_st('M63,190C62,230 60,290 58,339', D[3], 1.2); frX_st('M66,196C72,240 76,300 78,339', D[0], 1.4);
  // gold strappy heel peeking out of the slit, and the other toe under the hem
  frX_f('M63,334L73,334L77,341L62,341Z', D[0]); frX_st('M64,336L74,336', '#c9973a', 1); frX_st('M73,334L74,342', '#c9973a', 0.8);
  frX_e(40, 340, 5, 1.6, D[0]);
  // --- shoulders, decolletage and neck
  frX_f('M41,72C45,64 52,62 56,62C60,62 67,64 71,72L72,76C70,70 62,68 59,72L56,77L53,72C50,68 42,70 40,76Z', S[3]);
  frX_f('M56,62C60,62 67,64 71,72L72,76C70,70 62,68 59,72L56,77Z', S[2]); frX_st('M56,70L56,76', S[1], 1);
  frX_f('M51.5,44L60.5,44L61,58C63,61 66,62 68,64L44,64C46,62 49,61 51,58Z', S[3]); frX_f('M56,44L60.5,44L61,58C63,61 66,62 68,64L56,64Z', S[2]); frX_f('M51.5,46C54,52 58,52 60.5,46L60.5,51L51.5,51Z', S[1]);
  frX_st('M47,68C51,67 54,67 56,68', S[4], 1); frX_e(56, 68, 1.2, 1.4, '#e8e4f0'); frX_st('M50,64C53,67 59,67 62,64', '#d8d4e4', 0.8); // pendant on a fine chain
  // --- her right arm (viewer's left): opera glove, hand on the hip
  frX_f('M42,72C34,74 28,84 25,96C24,100 24,104 26,106L32,106C32,100 36,90 44,82Z', S[3]);
  frX_st('M36,76C31,82 27,92 26,102', S[4], 1);
  frX_f('M25,104L32,104C36,114 40,124 45,130L40,137C34,128 28,116 25,104Z', D[2]); frX_st('M26,106C30,116 35,126 40,134', D[4], 1); // glove forearm
  frX_f('M40,132C44,130 50,130 52,134C52,140 48,144 42,142C40,140 39,136 40,132Z', D[2]); frX_st('M41,134C45,132 49,132 51,135', D[4], 1);
  frX_st('M24.5,104L32.5,104', D[4], 1.2);
  // --- her left arm (viewer's right) raised: elbow out, pistol up by the shoulder
  frX_f('M70,72C76,76 82,86 86,100L80,104C76,94 72,86 68,80Z', S[2]); frX_st('M72,74C78,80 83,90 86,100', rim, 1);
  frX_f('M80,104L86,100C88,90 86,76 80,66L76,68C80,80 81,92 80,104Z', D[2]); frX_st('M86,100C88,90 86,78 80,67', rim, 1.2); frX_st('M79.5,103C80.5,92 79,80 76.5,69', D[4], 1);
  frX_f('M73,56C73,50 82,50 82,56L82,66L73,66Z', D[2]); frX_st('M74,56C74,52 80,52 81,55', D[4], 1); // gloved fist
  frX_f('M75,20L80,20L80,54L75,54Z', '#1a1c24'); frX_st('M76.2,22L76.2,52', '#8890a8', 1.2); frX_f('M74,50L82,50L82,58L74,58Z', '#1a1c24'); frX_e(77.5, 19.5, 1.6, 1, '#303442');
  // --- head: fine-boned, three-quarter light
  const hd = 'M56,19C64,19 69,24 69,32C69,37.5 67,42 64,45.5C61,48.5 59,50 56,50C53,50 51,48.5 48,45.5C45,42 43,37.5 43,32C43,24 48,19 56,19Z';
  frX_f(hd, S[3]);
  frX_in(hd, () => { frX_f('M62,14C67,22 67,34 64,42C62,47 58,50 54,54L80,54L80,10Z', S[2]); frX_a(0.45, () => frX_e(49, 37, 3.4, 2.4, '#e89a86')); frX_e(52, 25, 5, 3, S[4]); });
  // eyes: smoky, long lashes
  for (const [ex, lit] of [[50.5, 1], [61.5, 0]]) {
    frX_f(`M${ex - 3.4},31.5C${ex - 2},29.4 ${ex + 2},29.4 ${ex + 3.6},31C${ex + 2},32.6 ${ex - 2},32.6 ${ex - 3.4},31.5Z`, lit ? '#f4ece8' : '#cabab8');
    frX_e(ex + 0.4, 31.2, 1.6, 1.6, '#2a4a3a'); frX_e(ex + 0.4, 31.2, 0.8, 0.8, '#060606'); frX_r(ex - 0.3, 30.2, 0.8, 0.8, '#ffffff');
    frX_st(`M${ex - 3.8},31.2C${ex - 2},28.6 ${ex + 2},28.6 ${ex + 4},30.6`, '#120a0c', 1.4);
    frX_st(`M${ex + (lit ? -3.6 : 3.8)},${lit ? 31 : 30.6}l${lit ? -1.4 : 1.4},-1.2`, '#120a0c', 0.9);
    frX_a(0.45, () => frX_st(`M${ex - 3},28.6C${ex - 1},27.6 ${ex + 1},27.6 ${ex + 3},28.4`, '#6a3a5a', 1.4)); // shadow
  }
  frX_st('M46.5,26.4C48.5,25.2 51,25.2 53.5,26', '#1c1014', 1.1); frX_st('M58.5,26C61,25.2 63.5,25.4 65.5,26.6', '#1c1014', 1.1);
  frX_st('M56.5,32L55.6,39.2C55.6,40.2 56.6,40.6 57.6,40.4', S[2], 1); frX_st('M55.4,32.5L54.8,38', S[4], 0.8);
  // red lips
  frX_f('M52.4,44.6C54,43.6 55.4,43.8 56.4,44.2C57.4,43.8 58.8,43.6 60.4,44.6C58.8,46.8 54,46.8 52.4,44.6Z', '#b0202e');
  frX_f('M52.4,44.6C54,45.2 58.8,45.2 60.4,44.6C58.8,47.6 54,47.6 52.4,44.6Z', '#d8384a'); frX_r(55, 45.8, 2, 0.8, '#ff9aa0');
  // hair: glossy raven waves over one eye, swept to the side
  frX_f('M42,36C38,24 42,13 54,12C66,11 74,18 74,29C74,35 72,40 70,44C70,36 68,30 64,26C60,28 54,26 48,28C45,30 43,33 42,36Z', HR[1]);
  frX_f('M42,36C40,28 44,20 52,18C58,17 64,20 66,26C62,24 56,25 50,27C46,29 44,32 42,36Z', HR[2]);
  frX_f('M50,20C58,18 66,20 68,28C66,32 64,33 62,32C62,28 58,24 50,20Z', HR[1]); // sweep over the brow
  frX_st('M44,26C48,18 56,14 64,16', HR[4], 1.6); frX_st('M50,15C54,13 60,13 64,15', '#c090a0', 1);
  frX_st('M72,24C75,32 74,40 70,46', rim, 1.2);
  frX_f('M70,44C72,50 74,58 72,68L68,70C70,60 70,52 68,46Z', HR[1]); frX_f('M42,36C40,46 40,56 42,66L46,68C44,58 44,48 45,40Z', HR[2]);
  frX_st('M43,44C42,52 42,58 43,64', HR[4], 1);
  // earrings
  frX_e(43.5, 40, 1.4, 2.2, '#f2d584'); frX_e(68.8, 40, 1.2, 2, '#c9973a');
}
function frX_figArt(sex, lit) {
  return art('frX_fig' + sex + (lit ? 1 : 0), 56, 172, () => {
    if (lit) { if (sex === 'm') frX_maxFig(); else frX_maxineFig(); return; }
    g.drawImage(frX_figArt(sex, true), 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(6,6,16,0.64)'; g.fillRect(0, 0, 112, 344); g.globalCompositeOperation = 'source-over';
  });
}
function drawMaxFigure(cx, base, sex, lit) {
  fine(() => {
    const X = cx * 2, Y = base * 2;
    g.save(); g.translate(X, Y - 2); g.scale(1, 0.18);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 40); gr.addColorStop(0, 'rgba(0,0,0,' + (lit ? 0.75 : 0.5) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(-40, -40, 80, 80); g.restore();
  });
  blit(frX_figArt(sex, lit), cx - 28, base - 171);
  if (lit && sex === 'f') fine(() => { // a glint travelling along the pistol and her earring
    const t = performance.now() / 1000, k = (t * 0.7) % 3;
    if (k < 1) { const x = (cx - 28) * 2 + 76.2, y = (base - 171) * 2 + 22 + k * 30; frX_a(1 - Math.abs(k - 0.5) * 2, () => { frX_r(x - 0.5, y - 3, 1, 6, '#ffffff'); frX_r(x - 2, y - 0.5, 4, 1, '#ffffff'); }); }
  });
}

// ===================================================================
// TRAINING cards: 73 x 126 layout = 146 x 252 fine, static art() layers + animated fine() bits.
// ===================================================================
// --- 0: COMBAT. Plan: a pistol range, side view. Cool blue-grey concrete in shadow, a warm
// overhead lamp over the booth (key light from above), the paper target down range in its own
// cold spot. Focal point: the agent's two-handed stance, yellow ear defenders as the accent.
// Ramps: concrete 5 (blue-grey), lamp warm 3, skin 5, black turtleneck 4, target paper 3.
function frX_card0() {
  return art('frX_card0', 73, 126, () => {
    const C = ['#0d1018', '#161b26', '#212838', '#2f384c', '#46526a'];
    g.fillStyle = frX_lg(0, 0, 0, 170, [C[0], C[1], C[2], C[1]], 6); g.fillRect(0, 0, 146, 252);
    // back wall blockwork, a range stripe, lane numbers
    for (let y = 40; y < 160; y += 12) frX_r(0, y, 146, 1, C[0]);
    frX_r(0, 118, 146, 5, '#5a2a26'); frX_r(0, 118, 146, 1, '#7a3a30');
    // ceiling baffles in perspective
    for (let k = 0; k < 4; k++) { const y = 6 + k * 11; frX_f(`M0,${y}L146,${y - 3}L146,${y + 4}L0,${y + 8}Z`, C[1]); frX_st(`M0,${y + 8}L146,${y + 4}`, C[3], 1.2); }
    // down-range target: carrier rail, a small paper silhouette in a cold spotlight far away
    frX_glow(138, 100, 30, '#9ab8e8', 0.3);
    frX_r(96, 76, 50, 1.4, C[3]); frX_r(138, 77, 1, 9, C[4]);
    frX_r(132, 86, 13, 26, '#cfcab8'); frX_r(132, 86, 13, 1, '#f4efe0'); frX_r(144, 86, 1, 26, '#9a9684');
    frX_e(138.5, 92, 2.4, 3, '#1c1c24'); frX_f('M133.5,111L134,101C134.5,98 136.5,97 138.5,97C140.5,97 142.5,98 143,101L143.5,111Z', '#1c1c24');
    for (const [r, c] of [[4.4, '#cfcab8'], [3.6, '#1c1c24'], [2.4, '#cfcab8'], [1.7, '#1c1c24'], [0.9, '#c83a30']]) frX_e(138.5, 104, r * 0.8, r, c);
    // lane floor and the booth counter
    g.fillStyle = frX_lg(0, 150, 0, 252, ['#2a2622', '#1a1816', '#0e0d0c'], 5); g.fillRect(0, 150, 146, 102);
    frX_r(0, 150, 146, 1, '#3a3630');
    for (const x of [-120, -30, 60, 150]) frX_st(`M${x},252L${138 + (x - 60) * 0.03},150`, '#3a3630', 1);
    // warm overhead lamp and its cone over the booth
    frX_f('M40,0L64,0L62,6L42,6Z', '#2a2a30'); frX_e(52, 6, 12, 2.4, '#ffe6a8');
    frX_a(0.2, () => frX_f('M40,6L64,6L110,200L0,200Z', '#ffd890'));
    frX_glow(52, 120, 70, '#ffd08a', 0.22, 1.4);
    // booth partition, foreground left
    frX_f('M0,30L6,32L6,252L0,252Z', '#1e1a18'); frX_st('M6,32L6,252', '#6a5a48', 1);
    g.save(); g.translate(-32, -14); g.scale(1.3, 1.3);
    // the agent (side view, facing right): torso, head, ear defenders; arms are drawn per frame
    const S = frX_FS, T = ['#0b0b10', '#16161e', '#262634', '#3e3e52'];
    frX_f('M38,108C42,100 52,98 60,100C66,102 68,110 68,122L70,170L34,170L36,126Z', T[1]); // turtleneck body
    frX_f('M38,108C42,100 52,98 58,100L54,126L50,170L34,170L36,126Z', T[2]);
    frX_st('M42,102C48,98 56,98 62,101', T[3], 1.6); // key light across the shoulders
    frX_f('M46,94L58,94L58,104L46,104Z', T[1]); frX_st('M46,95L58,95', T[3], 1); // roll neck
    // head in profile: strong brow, straight nose, set jaw
    const hd = 'M47,84C46,74 52,67 60,67C66,67 70,70 70,76L70.5,79L74,85.5L71,87L71.5,89.5L70.6,90.6L71,93C70,95.5 67,96.5 64,96.5L60,97L57,100L48,100C48,95 47,90 47,84Z';
    frX_f(hd, S[3]);
    frX_in(hd, () => { frX_f('M62,68C68,70 71,74 71,80L76,86L72,98L60,98C65,92 66,80 62,68Z', S[4]); frX_f('M47,90C52,96 58,98 64,97L64,102L46,102Z', S[2]); frX_f('M47,80C50,86 52,92 56,96L46,100Z', S[2]); });
    frX_st('M70.5,79L74,85.5L71,87', S[2], 0.8); frX_st('M70,91.2L68,91.4', '#8a3a36', 1); // nostril line, mouth
    frX_st('M64,78.6C65.6,77.6 67.4,77.4 69,77.8', '#2a1812', 1.2); frX_e(67.4, 80.6, 1, 0.9, '#141010'); frX_r(66.6, 79.8, 0.6, 0.6, '#f0e0d0');
    frX_f('M46,86C44,74 50,65 60,64C67,63 72,67 71,73C67,70 62,70 58,72C54,74 51,80 50,88Z', '#1c1210'); // cropped hair
    frX_st('M51,68C55,65 61,64 67,66', '#5a3a2a', 1.2);
    frX_st('M51,75C51,66 57,62.5 64,63.5', '#2a2a30', 2.4); // headband of the ear defenders
    frX_e(52, 82, 6, 8, '#d8a020'); frX_e(52.5, 81, 4.4, 6, '#f2c640'); frX_e(51, 79, 1.6, 2.4, '#fff0a0');
    frX_st('M42,128C46,120 52,114 60,111', '#4a2e1a', 2.2); frX_st('M42,127C46,119.6 52,113.6 60,110.4', '#8a5a34', 0.7); // holster strap
    frX_st('M40,140C44,146 48,150 54,152', T[0], 1.2); frX_st('M62,122C64,132 66,146 66,160', T[0], 1);
    g.restore();
    // the counter in front of the booth, a box of rounds and spent brass
    frX_f('M0,196L146,196L146,206L0,206Z', '#6a5038'); frX_r(0, 196, 146, 1.5, '#b08a60'); frX_f('M0,206L146,206L146,232L0,232Z', '#2a2018'); frX_r(0, 206, 146, 1, '#120c08');
    frX_r(0, 232, 146, 20, '#0c0a08'); frX_st('M0,232L146,232', '#3a2c20', 1);
    frX_f('M10,186L30,186L30,196L10,196Z', '#8a2a24'); frX_r(10, 186, 20, 2.4, '#b04a3a'); frX_r(14, 190, 12, 4, '#e8d8b0'); frX_f('M30,186L34,184L34,194L30,196Z', '#5a1a16');
    for (const [x, a] of [[40, 0.3], [47, -0.5], [120, 1], [128, 0.2]]) { g.save(); g.translate(x, 194.5); g.rotate(a); frX_r(-2, -0.8, 4, 1.8, '#c9973a'); frX_r(-2, -0.8, 4, 0.6, '#f2d584'); g.restore(); }
  });
}
function frX_card0Live(t) {
  const S = frX_FS, T = ['#0b0b10', '#16161e', '#262634', '#3e3e52'];
  const ph = t % 0.9, kick = ph < 0.06 ? 3 : ph < 0.14 ? 1.5 : 0;
  // bullet holes in the paper, a fresh target every 7 shots
  const shot = t / 0.9 | 0;
  for (let k = 0; k < shot % 7; k++) { const hx = 136 + frX_hash(k, shot / 7 | 0) * 5, hy = 99 + frX_hash(shot / 7 | 0, k) * 9; frX_e(hx, hy, 0.6, 0.7, '#0a0a0a'); }
  // arms: far arm first, then the near one, both locked out towards the target
  g.save(); g.translate(-32, -14); g.scale(1.3, 1.3);
  const hy = 98 - kick * 0.6, hx = 100;
  frX_f(`M58,108L${hx - 2},${hy - 1}L${hx},${hy + 5}L60,118Z`, T[0]);
  frX_f(`M54,104C60,102 70,102 ${hx - 4},${hy}L${hx - 2},${hy + 6}C80,${hy + 8} 66,118 58,120Z`, T[2]);
  frX_st(`M56,103C64,101 74,101 ${hx - 4},${hy}`, T[3], 1.4);
  // hands on the grip and the pistol (kicks up with each shot)
  g.save(); g.translate(hx + 2, hy + 2); g.rotate(-kick * 0.05);
  frX_f('M-6,-4C-2,-6 4,-5 6,-2L6,5C2,7 -4,7 -6,4Z', S[3]); frX_st('M-4,-5C0,-6 4,-5 5.5,-2', S[4], 1); frX_st('M-3,1L3,1M-3,3.5L3,3.5', S[1], 0.8);
  frX_f('M2,-8L22,-8L22,-3L6,-3L6,4L1,4Z', '#1a1c24'); frX_st('M3,-7.2L21.5,-7.2', '#7a8098', 1); frX_r(21, -7.5, 1.4, 1.2, '#50546a');
  if (ph < 0.07) { // muzzle flash
    frX_glow(26, -5.5, 18, '#ffc860', 0.8);
    frX_f('M22,-5.5L30,-10L28,-6.5L36,-5.5L28,-4.5L30,-1L22,-5.5Z', '#ffe890'); frX_e(24, -5.5, 3, 2, '#ffffff');
  }
  g.restore();
  if (ph < 0.07) frX_a(0.35, () => frX_glow(80, 100, 40, '#ffc860', 0.6));
  // spent case spinning up and back, gun smoke drifting
  if (ph < 0.4) { const u = ph / 0.4, x = hx + 6 - u * 22, y = hy - 6 - Math.sin(u * 3.1) * 16 + u * 20; g.save(); g.translate(x, y); g.rotate(u * 12); frX_r(-2, -0.8, 4, 1.8, '#f2d584'); g.restore(); }
  if (ph > 0.05 && ph < 0.8) { const u = (ph - 0.05) / 0.75; frX_a((1 - u) * 0.45, () => { frX_e(hx + 26 + u * 8, hy - 4 - u * 12, 3 + u * 6, 2 + u * 4, '#c8ccd8'); frX_e(hx + 22 + u * 4, hy - 2 - u * 8, 2 + u * 4, 1.6 + u * 3, '#dde0ea'); }); }
  g.restore();
}
// --- 1: DRIVING. Plan: night pursuit on a country road, camera behind our red roadster.
// Deep blue night sky banded to a violet horizon, moonlit hills in 2 atmospheric layers, the
// headlight beams warm the asphalt ahead; accent = the car's red body and glowing tail lights.
// Ramps: night 6, hills 3, asphalt 4, car red 5, chrome 3.
function frX_card1() {
  return art('frX_card1', 73, 126, () => {
    g.fillStyle = frX_lg(0, 0, 0, 104, ['#05081a', '#0b1230', '#182456', '#34357a', '#5a4488'], 8); g.fillRect(0, 0, 146, 106);
    for (let i = 0; i < 26; i++) { const x = frX_hash(i, 41) * 146, y = frX_hash(i, 42) * 80; frX_r(x | 0, y | 0, 1, 1, i % 4 ? '#8a9ad0' : '#ffffff'); }
    frX_glow(34, 30, 34, '#c8d8ff', 0.3); frX_e(34, 30, 9, 9, '#eef0e0'); frX_e(37, 28, 8, 8, '#c8cce0');
    frX_f('M25,30A9,9 0 1,0 43,30A8,8 0 1,1 25,30Z', '#fffbe8');
    frX_f('M0,98C20,88 34,92 50,86C70,80 90,90 110,84C124,80 136,86 146,82L146,108L0,108Z', '#1c2250');
    frX_f('M0,106C18,100 30,104 48,98C60,95 66,102 74,104L0,112Z', '#0e1330'); frX_f('M74,104C84,100 100,96 118,100C130,102 140,98 146,96L146,112Z', '#0e1330');
    for (let i = 0; i < 7; i++) frX_r(88 + i * 6 + frX_hash(i, 1) * 3, 96 + frX_hash(i, 2) * 2, 1.2, 1, '#ffd070');
    // fields either side of the road
    g.fillStyle = frX_lg(0, 104, 0, 252, ['#0a0e22', '#0c1024', '#080a16'], 4); g.fillRect(0, 104, 146, 148);
    // road in perspective, vanishing at (74, 104)
    frX_f('M71,104L77,104L190,252L-44,252Z', '#1e2029');
    g.save(); g.clip(frX_path('M71,104L77,104L190,252L-44,252Z'));
    frX_a(0.5, () => frX_f('M68,108L80,108L136,210L12,210Z', 'rgba(255,226,160,0.35)'));
    frX_glow(74, 170, 70, '#ffe0a0', 0.28, 0.6);
    g.restore();
    frX_st('M72,104L-30,252', '#c8ccd8', 1.4); frX_st('M76,104L178,252', '#c8ccd8', 1.4);
    // line of trees against the hills
    for (let i = 0; i < 8; i++) { const x = 8 + i * 9 + frX_hash(i, 9) * 4, h = 8 + frX_hash(i, 8) * 6; frX_f(`M${x - 4},${106}L${x},${106 - h}L${x + 4},${106}Z`, '#070a1a'); }
    for (let i = 0; i < 5; i++) { const x = 100 + i * 10 + frX_hash(i, 7) * 4, h = 6 + frX_hash(i, 6) * 5; frX_f(`M${x - 3},${104}L${x},${104 - h}L${x + 3},${104}Z`, '#070a1a'); }
  });
}
function frX_car() { // red roadster from behind, 96 x 52 fine
  return art('frX_car', 48, 26, () => {
    const R = ['#3a060c', '#6e1016', '#a81e20', '#d8402e', '#ff8a6a'];
    frX_e(48, 50, 50, 3.5, 'rgba(0,0,0,0.6)');
    frX_f('M8,36L10,50L24,50L24,38Z', '#0c0c10'); frX_f('M88,36L86,50L72,50L72,38Z', '#0c0c10'); // tyres
    frX_f('M4,30C4,22 10,18 18,17L26,6C30,2 66,2 70,6L78,17C86,18 92,22 92,30L92,40C92,44 88,46 84,46L12,46C8,46 4,44 4,40Z', R[2]);
    frX_f('M4,32L92,32L92,40C92,44 88,46 84,46L12,46C8,46 4,44 4,40Z', R[1]);
    frX_f('M26,7C30,3 66,3 70,7L77,17L19,17Z', '#141828'); // rear window
    frX_f('M30,8L52,8L42,16L22,16Z', '#2e3a64'); frX_a(0.6, () => frX_st('M32,9L50,9', '#8aa0e0', 1));
    frX_st('M18,17C10,18 5,22 4,30', R[4], 1.4); frX_st('M19,17L77,17', R[3], 1.4); frX_st('M78,17C86,18 91,22 92,30', R[3], 1);
    frX_st('M6,31L90,31', R[0], 1.2);
    // tail lights, plate, exhaust
    frX_f('M8,24L26,24L26,30L8,30Z', '#5a0808'); frX_f('M70,24L88,24L88,30L70,30Z', '#5a0808');
    frX_f('M38,34L58,34L58,41L38,41Z', '#e8e4d0'); frX_r(41, 36.5, 14, 2, '#3a3a44');
    frX_e(20, 45, 3, 2, '#8a8a94'); frX_e(20, 45, 1.8, 1.2, '#16161c');
  });
}
function frX_card1Live(t) {
  // centre-line dashes and reflector posts rushing at us
  for (let k = 0; k < 8; k++) {
    const z = (k / 8 + t * 0.9) % 1, f = z * z * z, y = 104 + f * 148, w = 0.6 + f * 6, h = 0.8 + f * 26;
    frX_f(`M${74 - w * 0.4},${y}L${74 + w * 0.4},${y}L${74 + w * 0.5},${y + h}L${74 - w * 0.5},${y + h}Z`, '#e8c050');
  }
  for (let k = 0; k < 3; k++) for (const side of [-1, 1]) {
    const z = (k / 3 + t * 0.55 + (side > 0 ? 0.15 : 0)) % 1, f = z * z * z, y = 104 + f * 148, x = 74 + side * (6 + f * 150), h = 3 + f * 60, w = 0.8 + f * 6;
    frX_r(x - w / 2, y - h, w, h, '#d8dce8'); frX_r(x - w / 2, y - h, w, Math.max(1, h * 0.12), side > 0 ? '#ff4030' : '#ffb030');
  }
  // the car we're chasing, far ahead
  const ex = 74 + Math.sin(t * 1.3) * 2;
  frX_r(ex - 3, 108, 6, 2.4, '#0a0a10'); frX_e(ex - 2.4, 109, 1.3, 0.9, '#ff3030'); frX_e(ex + 2.4, 109, 1.3, 0.9, '#ff3030'); frX_glow(ex, 109, 6, '#ff3030', 0.4);
  // our roadster, drifting through the bends
  const sway = Math.sin(t * 1.7) * 7, bob = (t * 10 | 0) % 2 ? 0.5 : 0, brake = (t * 0.7 % 1) < 0.25;
  const cx = 25 + sway, cy = 188 + bob;
  g.drawImage(frX_car(), cx, cy);
  for (const lx of [cx + 17, cx + 79]) { frX_r(lx - 8, cy + 24, 16, 6, brake ? '#ff5040' : '#c01818'); frX_r(lx - 7, cy + 25, 14, 1.5, brake ? '#ffc0a0' : '#ff6a50'); frX_glow(lx, cy + 27, brake ? 22 : 14, '#ff3020', brake ? 0.5 : 0.3); }
  for (let k = 0; k < 4; k++) { const u = (t * 1.6 + k / 4) % 1; frX_a((1 - u) * 0.35, () => frX_e(cx + 20 - u * 8 + Math.sin(u * 8 + k) * 2, cy + 46 + u * 6, 2 + u * 7, 1.5 + u * 3, '#9aa0b8')); }
}
// --- 2: CRYPTOGRAPHY. Plan: a basement code room at night. A single green-shaded pendant lamp
// pours a warm cone onto a rotor cipher machine; letters light up on its lampboard as the
// analyst types; decrypts appear on the pad. Olive-grey walls in shadow, warm walnut desk.
// Ramps: wall 4 (olive-grey), walnut 5, lamp green 3, amber lampboard glow, paper 3.
function frX_card2() {
  return art('frX_card2', 73, 126, () => {
    const Wl = ['#12130f', '#1c1e18', '#2a2c24', '#3c3e32'], Wd = ['#1a0e08', '#2e1a0e', '#4a2c16', '#6a4222', '#8e5c30'];
    g.fillStyle = frX_lg(0, 0, 0, 140, [Wl[0], Wl[1], Wl[2]], 5); g.fillRect(0, 0, 146, 140);
    frX_glow(73, 110, 90, '#ffd890', 0.18, 0.9);
    // pinned-up frequency chart and a teleprinter strip
    frX_f('M10,34L52,30L54,82L12,86Z', '#bfb49a'); frX_f('M10,34L52,30L52,33L10,37Z', '#dcd2b8');
    for (let k = 0; k < 9; k++) { const hgt = [30, 12, 18, 22, 36, 10, 14, 26, 20][k]; frX_r(15 + k * 4, 78 - hgt, 2.6, hgt, k === 4 ? '#b83028' : '#3a3a40'); }
    frX_e(31, 32, 1.6, 1.6, '#c83030');
    frX_f('M96,26L130,24L131,34L97,36Z', '#d8d0bc'); for (let k = 0; k < 6; k++) frX_r(100 + k * 5, 28.5, 3, 2, '#3a3a40'); frX_e(113, 25, 1.4, 1.4, '#3070c0');
    // wall clock
    frX_e(116, 58, 13, 13, '#0c0d0a'); frX_e(116, 58, 11, 11, '#e8e2d0');
    for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; frX_seg(116 + Math.cos(a) * 8.5, 58 + Math.sin(a) * 8.5, 116 + Math.cos(a) * 10, 58 + Math.sin(a) * 10, '#2a2a2a', 1); }
    frX_seg(116, 58, 116, 51, '#1a1a1a', 1.4); frX_seg(116, 58, 121, 60, '#1a1a1a', 1.4);
    // the pendant lamp and its light cone
    frX_r(72, 0, 2, 44, '#0a0a08');
    frX_a(0.16, () => frX_f('M58,56L88,56L140,170L6,170Z', '#ffd890'));
    frX_f('M56,58C58,46 88,46 90,58Z', '#1d5a38'); frX_f('M56,58C58,46 88,46 90,58Z', frX_lg(56, 0, 90, 0, ['#3a9a60', '#1f6a40', '#0c3020'], 4));
    frX_r(55, 57, 36, 2, '#c9973a'); frX_e(73, 60, 10, 2, '#fff4c8');
    // walnut desk
    g.fillStyle = frX_lg(0, 140, 0, 252, [Wd[3], Wd[2], Wd[1], Wd[0]], 5); g.fillRect(0, 140, 146, 112);
    frX_r(0, 140, 146, 2, Wd[4]); frX_glow(73, 180, 80, '#ffd890', 0.25, 0.5);
    // the rotor cipher machine: open wooden case, rotors, lampboard, keyboard
    frX_f('M14,122L132,122L140,196L6,196Z', '#3a2616'); frX_f('M16,124L130,124L137,194L9,194Z', '#1a1a1e');
    frX_f('M40,116L106,116L108,126L38,126Z', '#26262c'); // rotor housing
    for (let k = 0; k < 3; k++) { const x = 56 + k * 16; frX_r(x - 5, 110, 10, 12, '#4a4a52'); for (let r = 0; r < 4; r++) frX_r(x - 5, 111 + r * 3, 10, 1, '#2a2a30'); frX_r(x - 5, 110, 3, 12, '#70707a'); frX_r(x - 3, 124, 7, 5, '#e8e0c8'); }
    for (let r = 0; r < 3; r++) for (let c = 0; c < 9 - (r === 2 ? 1 : 0); c++) { // lampboard
      const x = 26 + c * 12 + r * 5 + (r === 2 ? 6 : 0), y = 136 + r * 9; frX_e(x, y, 4, 3, '#0c0c10'); frX_e(x, y, 3, 2.2, '#4a4436');
    }
    for (let r = 0; r < 3; r++) for (let c = 0; c < 9 - (r === 2 ? 1 : 0); c++) { // keyboard
      const x = 22 + c * 12.6 + r * 5 + (r === 2 ? 6 : 0) - 2, y = 166 + r * 10;
      frX_e(x, y + 1.5, 4.6, 3.2, '#050507'); frX_e(x, y, 4.6, 3.2, '#2a2a30'); frX_e(x, y, 3.6, 2.4, '#e8e2d0'); frX_e(x, y - 0.6, 3.6, 1.6, '#fffaf0'); frX_r(x - 0.8, y - 0.6, 1.6, 1.4, '#3a3a40');
    }
    frX_st('M14,122L132,122', '#8e5c30', 1.4);
    // notepad and pencil, coffee mug
    frX_f('M78,204L140,200L144,250L82,252Z', '#e8e2cc'); frX_f('M78,204L140,200L140,203L78,207Z', '#b83028');
    for (let k = 0; k < 5; k++) frX_st(`M84,${214 + k * 8}L${138},${210 + k * 8}`, '#a8b8d0', 0.8);
    frX_e(26, 226, 13, 4, '#0a0604'); frX_f('M14,206L38,206L37,226C37,230 15,230 15,226Z', '#c8c4b8'); frX_f('M28,206L38,206L37,226C36,229 32,230 28,230Z', '#8e8a80');
    frX_e(26, 206, 12, 3, '#d8d4c8'); frX_e(26, 206, 10, 2.2, '#3a2010'); frX_st('M38,210C44,210 44,222 37,222', '#a8a498', 2.4);
  });
}
function frX_card2Live(t) {
  // a lamp lights on the board for each letter typed; the rotor windows step
  const step = t * 3 | 0, lit = frX_hash(step, 5) * 25 | 0, r = lit < 9 ? 0 : lit < 18 ? 1 : 2, c = lit % 9 % (r === 2 ? 8 : 9);
  const x = 26 + c * 12 + r * 5 + (r === 2 ? 6 : 0), y = 136 + r * 9;
  frX_glow(x, y, 10, '#ffb040', 0.6); frX_e(x, y, 3, 2.2, '#ffd070'); frX_e(x - 0.6, y - 0.6, 1.4, 1, '#fff8d0');
  for (let k = 0; k < 3; k++) { const x0 = 56 + k * 16, ch = (step >> (k * 2)) & 3; frX_r(x0 - 3, 124, 7, 5, '#e8e0c8'); frX_r(x0 - 1.5 + (ch & 1), 125, 2 + (ch >> 1), 3, '#2a2a30'); }
  // the decrypt appearing on the pad, letter by letter
  const n = (t * 3) % 36 | 0;
  for (let k = 0; k < n; k++) { const row = k / 9 | 0, col = k % 9; frX_r(86 + col * 5.6, 209.5 + row * 8 - col * 0.5, 3.4, 3.4, '#2a2a38'); frX_r(86.6 + col * 5.6, 210.2 + row * 8 - col * 0.5, 2.2, 2, '#e8e2cc'); if (frX_hash(k, 3) < 0.5) frX_r(86 + col * 5.6, 211 + row * 8 - col * 0.5, 3.4, 0.8, '#2a2a38'); }
  // the pencil following the writing
  const k = n, row = k / 9 | 0, col = k % 9, px_ = 88 + col * 5.6, py = 210 + row * 8 - col * 0.5 + (t * 12 | 0) % 2;
  frX_seg(px_, py, px_ + 18, py - 24, '#e0a020', 3); frX_seg(px_ + 1, py - 1.6, px_ + 18, py - 24, '#f8c840', 1); frX_seg(px_, py, px_ + 1.6, py - 2.2, '#2a2020', 2); frX_seg(px_ + 17, py - 22.6, px_ + 19, py - 25.4, '#d06a6a', 3.4);
  // coffee steam
  for (let k2 = 0; k2 < 3; k2++) { const u = (t * 0.4 + k2 / 3) % 1; frX_a((1 - u) * u * 1.4, () => frX_e(26 + Math.sin(u * 6 + k2 * 2) * 3, 203 - u * 16, 2 + u * 3, 2 + u * 3, '#c8ccd4')); }
  // clock second hand
  const a = (t | 0) / 60 * 6.283; frX_seg(116, 58, 116 + Math.sin(a) * 9, 58 - Math.cos(a) * 9, '#c02a2a', 0.8);
}
// --- 3: ELECTRONICS. Plan: a workbench at night. The oscilloscope's green phosphor is the key
// light (cold green), a warm clip lamp from the right rakes across the circuit board; the
// soldering iron's hot tip and the blinking LED are the accents.
// Ramps: bench 4, instrument beige 4, phosphor green 5, PCB green 4, copper/gold 3.
function frX_card3() {
  return art('frX_card3', 73, 126, () => {
    g.fillStyle = frX_lg(0, 0, 0, 252, ['#0c0e12', '#14171c', '#101216'], 4); g.fillRect(0, 0, 146, 252);
    frX_r(0, 104, 146, 3, '#2a2620'); frX_r(0, 104, 146, 1, '#4a4238'); // shelf
    // oscilloscope: beige case, bezel, graticule screen, knobs
    const B = ['#2e2b24', '#5a5446', '#8a8270', '#b8ae94'];
    frX_f('M6,10L140,10L140,102L6,102Z', B[1]); frX_f('M6,10L140,10L137,13L9,13L9,99L6,102Z', B[3]); frX_f('M140,102L6,102L9,99L137,99L137,13L140,10Z', B[0]);
    frX_f('M14,18L96,18L96,92L14,92Z', '#0c0e0c'); frX_f('M17,21L93,21L93,89L17,89Z', '#0c2016');
    frX_glow(55, 55, 42, '#40ff90', 0.12);
    for (let k = 1; k < 8; k++) frX_r(17 + k * 9.5, 21, 0.6, 68, 'rgba(90,200,130,0.3)'); for (let k = 1; k < 6; k++) frX_r(17, 21 + k * 11.3, 76, 0.6, 'rgba(90,200,130,0.3)');
    frX_a(0.12, () => frX_f('M17,21L60,21L30,89L17,89Z', '#ffffff')); // curved glass sheen
    for (let k = 0; k < 4; k++) { const y = 26 + k * 17; frX_e(118, y, 7, 7, '#1a1a1c'); frX_e(118, y, 5.5, 5.5, '#3a3a3e'); frX_e(117, y - 1, 2.5, 2.5, '#6a6a70'); frX_seg(118, y, 118 + Math.cos(k * 1.7) * 5, y + Math.sin(k * 1.7) * 5, '#e8e2d0', 1); }
    frX_r(104, 88, 10, 6, '#1a1a1c'); frX_r(128, 88, 6, 6, '#c02a2a');
    // the bench and a green circuit board in perspective
    g.fillStyle = frX_lg(0, 108, 0, 252, ['#2a241c', '#1e1a14', '#120f0c'], 4); g.fillRect(0, 108, 146, 144);
    frX_glow(120, 170, 90, '#ffcf8a', 0.2, 0.7);
    const pcb = 'M16,128L130,124L142,232L4,236Z';
    frX_f('M16,130L130,126L142,236L4,240Z', '#060806'); frX_f(pcb, '#1c5a34');
    g.save(); g.clip(frX_path(pcb));
    g.fillStyle = frX_lg(0, 124, 146, 236, ['#1a4a2c', '#23703e', '#1c5a34'], 4); g.fillRect(0, 120, 146, 120);
    for (const d of ['M20,150L60,150L70,160L120,160', 'M26,170L50,170L60,180L130,180', 'M14,200L44,200L52,190L100,190L108,200L136,200', 'M36,140L36,226', 'M90,136L96,150L96,220', 'M116,132L124,150L128,226', 'M10,218L70,218L78,210L120,210'])
      frX_st(d, '#c9a040', 1.2);
    for (let k = 0; k < 14; k++) frX_e(16 + frX_hash(k, 1) * 116, 134 + frX_hash(k, 2) * 94, 1.8, 1.4, '#e8c860');
    g.restore();
    frX_st('M16,128L130,124L142,232', '#3a9a5a', 1);
    // chips with silver legs, resistors, capacitors
    const chip = (x, y, w, h) => { for (let k = 0; k < w; k += 3) { frX_r(x + 1 + k, y - 1.6, 1.2, 2, '#c8ccd4'); frX_r(x + 1 + k, y + h - 0.4, 1.2, 2, '#c8ccd4'); } frX_r(x, y, w, h, '#15151a'); frX_r(x, y, w, 1.4, '#3a3a44'); frX_e(x + 2.4, y + h / 2, 1, 1, '#2a2a30'); };
    chip(24, 140, 30, 12); chip(70, 146, 22, 10); chip(40, 182, 34, 13); chip(98, 186, 26, 12);
    const res = (x, y, cols) => { frX_seg(x - 8, y, x + 8, y, '#c8ccd4', 1); frX_e(x, y, 6, 2.4, '#d8c49a'); cols.forEach((c, i) => frX_r(x - 3.6 + i * 2.6, y - 2.2, 1.2, 4.4, c)); frX_st(`M${x - 5},${y - 1.4}L${x + 5},${y - 1.4}`, '#f4e8c8', 0.8); };
    res(110, 150, ['#8a4a20', '#101010', '#c02a2a']); res(64, 206, ['#e8a020', '#8a2ac0', '#8a4a20']); res(26, 214, ['#c02a2a', '#c02a2a', '#101010']);
    for (const [x, y] of [[108, 212], [60, 164]]) { frX_e(x, y + 6, 5, 2, '#0c1428'); frX_r(x - 5, y - 4, 10, 10, '#1e4aa0'); frX_r(x - 5, y - 4, 3, 10, '#4a7ad8'); frX_e(x, y - 4, 5, 2, '#8aa8e8'); }
    frX_r(120, 138, 1, 6, '#c8ccd4'); frX_r(123, 138, 1, 6, '#c8ccd4'); // LED legs
    // the soldering iron coming in from the lower right
    frX_seg(146, 250, 102, 214, '#1a1a22', 9); frX_seg(144, 247, 104, 214, '#3a60b0', 7); frX_seg(143, 245, 106, 214, '#6a90e0', 1.6);
    frX_seg(102, 214, 90, 204, '#9aa0a8', 5); frX_seg(102, 213, 91, 203.5, '#e8ecf0', 1.2); frX_seg(92, 205, 78, 194, '#8a8a90', 2.4);
  });
}
function frX_card3Live(t) {
  // scope trace: a sine with a glitch sliding along, with phosphor bloom
  const pts = [];
  for (let k = 0; k <= 76; k++) { const x = 17 + k, glitch = Math.abs(((k + t * 30) % 76) - 38) < 3 ? 10 : 0, y = 55 + Math.sin(k / 76 * 6.283 * 2 + t * 5) * 22 - glitch; pts.push(x + ',' + y.toFixed(1)); }
  const d = 'M' + pts.join('L');
  g.save(); g.beginPath(); g.rect(17, 21, 76, 68); g.clip();
  g.strokeStyle = 'rgba(80,255,140,0.22)'; g.lineWidth = 5; g.lineJoin = 'round'; g.stroke(new Path2D(d));
  g.strokeStyle = '#60ff9a'; g.lineWidth = 1.4; g.stroke(new Path2D(d)); g.strokeStyle = '#d8ffe4'; g.lineWidth = 0.6; g.stroke(new Path2D(d));
  g.restore();
  // blinking LED
  const on = (t * 2.5 | 0) % 2; frX_e(121.5, 136, 3, 3.4, on ? '#ff4a3a' : '#6a1010'); if (on) { frX_glow(121.5, 136, 12, '#ff3020', 0.5); frX_e(120.6, 135, 1, 1.2, '#ffd0c0'); }
  // hot tip glow, solder sparkle, and smoke rising
  frX_glow(78, 194, 10, '#ff9040', 0.5); frX_e(78, 194, 1.8, 1.8, (t * 8 | 0) % 3 ? '#ffb060' : '#fff0c0');
  for (let k = 0; k < 5; k++) { const u = (t * 0.5 + k / 5) % 1; frX_a((1 - u) * Math.min(1, u * 5) * 0.4, () => frX_e(78 + Math.sin(u * 8 + k) * (2 + u * 6), 190 - u * 70, 1.5 + u * 5, 2 + u * 4, '#d0d4de')); }
}
function trainingArt(i, x, y, w, h, t) {
  blit([frX_card0, frX_card1, frX_card2, frX_card3][i](), x, y);
  fine(() => { g.translate(x * 2, y * 2); g.beginPath(); g.rect(0, 0, 146, 252); g.clip(); [frX_card0Live, frX_card1Live, frX_card2Live, frX_card3Live][i](t); });
}

// ===================================================================
// TITLE backdrop: a rainy Washington night, a rooftop chase.
// titleScene covers y 38..163 with the logo band after 1.2 s and 40..280 x 168..192 with the
// caption, so the story lives in the top strip (sky, skyline, rooftops, runners) and along the
// street at the bottom (wet asphalt, reflections, a passing car); the middle is quiet facades.
// Plan: indigo night ramp banded 8 steps, a cold moon (key, upper left) rim-lighting every
// silhouette, sodium-orange windows and a red neon sign as the warm accents, cyan-white rain.
// ===================================================================
const frX_ROOFS = [[-160, 104, 70], [118, 236, 64], [250, 380, 70], [394, 526, 66], [540, 800, 70]]; // x0, x1, roof y (fine)
function frX_titleBack() {
  return art('frX_tback', W, H, () => {
    // sky
    g.fillStyle = frX_lg(0, 0, 0, 90, ['#04061a', '#0a1030', '#141c4a', '#232a62', '#3a3470'], 8); g.fillRect(0, 0, 640, 400);
    frX_glow(120, 26, 90, '#a8b8ff', 0.22);
    frX_e(120, 26, 15, 15, '#fbf6e2'); frX_e(124, 23, 3, 2.4, '#e2dcc4'); frX_e(114, 30, 2.4, 2, '#e2dcc4'); frX_e(121, 33, 1.6, 1.2, '#e2dcc4');
    // thin clouds, silvered underneath by the moon
    for (const [cx, cy, w] of [[30, 16, 90], [270, 12, 150], [520, 24, 160], [390, 40, 90], [196, 46, 60]]) {
      frX_e(cx, cy, w / 2, 3.6, '#1e2458'); frX_e(cx + 6, cy + 1.6, w / 2 - 12, 1.6, '#4a5494');
    }
    for (let i = 0; i < 40; i++) { const x = frX_hash(i, 71) * 640, y = frX_hash(i, 72) * 50; if (Math.hypot(x - 120, y - 26) > 40) frX_r(x | 0, y | 0, 1, 1, i % 5 ? '#6a78c0' : '#e8ecff'); }
    // distant Washington in the haze: the Capitol and the Monument
    const hz = '#2c2f62', hzl = '#46498a';
    frX_f('M270,72V60H370V72Z', hz); frX_f('M284,60V52H356V60Z', hz); frX_f('M296,52C296,32 344,32 344,52Z', hz); frX_r(316, 22, 8, 12, hz); frX_e(320, 20, 4, 5, hz);
    frX_f('M320,33C334,34 344,42 344,52L320,52Z', hzl); for (let x = 290; x < 352; x += 6) frX_r(x, 61, 2, 10, '#23265a');
    frX_f('M462,72L465,14L469,8L473,14L476,72Z', hz); frX_f('M469,8L473,14L476,72L470,72Z', hzl);
    // city glow at the horizon
    frX_glow(320, 76, 260, '#ff9a5a', 0.12, 0.2);
    // facades: blocks of dark brick, rows of windows, some warm, some catching the moon
    const facade = ['#0b0c18', '#12142a', '#1a1c38'];
    for (const [a, b, y] of frX_ROOFS) {
      const x0 = Math.max(0, a), x1 = Math.min(640, b);
      g.fillStyle = frX_lg(0, y, 0, 400, [facade[1], facade[0], facade[0]], 4); g.fillRect(x0, y, x1 - x0, 400 - y);
      frX_r(x0, y, x1 - x0, 3, '#2a2e56'); frX_r(x0, y + 3, x1 - x0, 2, '#06070e'); // parapet + coping
      if (a > 0) frX_r(x0, y, 2, 400 - y, '#3a3f78'); // moonlit corner
      for (let wy = y + 18; wy < 330; wy += 22) for (let wx = x0 + 10; wx < x1 - 16; wx += 18) {
        const h = frX_hash(wx, wy);
        frX_r(wx - 1, wy - 1, 10, 14, '#07080f');
        if (h < 0.18) { g.fillStyle = frX_lg(0, wy, 0, wy + 12, ['#ffd27a', '#f09a3a'], 3); g.fillRect(wx, wy, 8, 12); if (h < 0.06) frX_f(`M${wx + 2},${wy + 12}L${wx + 3},${wy + 5}C${wx + 3},${wy + 3} ${wx + 6},${wy + 3} ${wx + 6},${wy + 5}L${wx + 7},${wy + 12}Z`, '#3a1c10'); else frX_r(wx, wy, 8, 3, '#b86a2a'); }
        else if (h < 0.3) { frX_r(wx, wy, 8, 12, '#1a2450'); frX_f(`M${wx},${wy + 8}L${wx + 8},${wy}L${wx + 8},${wy + 3}L${wx + 3},${wy + 12}L${wx},${wy + 12}Z`, '#26306a'); }
        else frX_r(wx, wy, 8, 12, '#0e1022');
        frX_r(wx - 1, wy + 13, 10, 1.5, '#23264a'); // sill
      }
    }
    // the alleys between the blocks: deep, a far wall in moonlight, a lit window or two
    for (let i = 0; i + 1 < frX_ROOFS.length; i++) {
      const a = frX_ROOFS[i][1], b = frX_ROOFS[i + 1][0], top = Math.max(frX_ROOFS[i][2], frX_ROOFS[i + 1][2]) + 6;
      g.fillStyle = frX_lg(0, top - 10, 0, 330, ['#161a3a', '#0a0b1a', '#040509'], 5); g.fillRect(a, top - 10, b - a, 340 - top);
      frX_r(a, top - 10, b - a, 1, '#2a3060'); frX_r(a + 3, top + 60 + i * 30, 4, 6, '#d88a3a');
    }
    // fire escape on the second block
    for (let y = 100; y < 320; y += 44) { frX_r(150, y, 60, 2, '#05060c'); frX_st(`M154,${y}L204,${y + 42}`, '#05060c', 1.5); for (let x = 150; x < 212; x += 6) frX_r(x, y - 10, 1, 10, '#05060c'); frX_r(150, y - 10, 60, 1, '#05060c'); }
    // rooftop furniture, a notch darker than the sky: water tanks, vents, aerials, a stair house
    const sil = '#05060e', rim = '#5a68b8';
    const tank = (x, y) => { frX_f(`M${x},${y - 30}L${x + 26},${y - 30}L${x + 26},${y - 12}L${x},${y - 12}Z`, sil); frX_f(`M${x - 2},${y - 30}L${x + 13},${y - 40}L${x + 28},${y - 30}Z`, sil); for (const lx of [x + 3, x + 22]) frX_r(lx, y - 12, 2, 12, sil); frX_st(`M${x + 4},${y - 2}L${x + 22},${y - 11}M${x + 4},${y - 11}L${x + 22},${y - 2}`, sil, 1); frX_st(`M${x},${y - 30}L${x},${y - 12}M${x - 2},${y - 30}L${x + 13},${y - 40}`, rim, 1); };
    tank(40, 70); tank(574, 70);
    frX_r(150, 46, 30, 18, sil); frX_r(148, 44, 34, 3, sil); frX_st('M150,46L150,64', rim, 1); // stair house
    for (const [x, y, h] of [[200, 64, 22], [30, 70, 34], [436, 66, 28], [612, 70, 20]]) { frX_r(x, y - h, 1.5, h, sil); frX_r(x - 5, y - h + 5, 11, 1, sil); frX_r(x - 3, y - h + 10, 7, 1, sil); }
    for (const x of [290, 330, 470, 500]) { frX_r(x, 62, 8, 8, sil); frX_r(x - 1, 60, 10, 3, sil); frX_st(`M${x},${62}L${x},${70}`, rim, 0.8); }
    // the vertical HOTEL sign, tubes unlit
    frX_r(588, 100, 28, 200, '#0a0a14'); frX_st('M588,100h28v200h-28z', '#2a2a44', 1.5); frX_r(596, 90, 2, 10, '#1a1a2a'); frX_r(606, 90, 2, 10, '#1a1a2a');
    g.save(); g.scale(2, 2); 'HOTEL'.split('').forEach((ch, i) => textC(ch, 301, 58 + i * 18, '#4a1a26')); g.restore();
    // street level: shop fronts, sidewalk, kerb, wet road
    frX_r(0, 330, 640, 22, '#0a0b16');
    const shop = (x, w, c, name) => { // lit shop window: glow, mullions, a silhouette display, sill
      g.fillStyle = frX_lg(0, 332, 0, 350, [mix(c, '#ffffff', 0.25), c, mix(c, '#000000', 0.45)], 4); g.fillRect(x, 332, w, 18);
      for (let k = 1; k < 3; k++) frX_r(x + k * w / 3 - 1, 332, 2, 18, '#14152a');
      frX_r(x, 332, w, 3, '#14152a'); frX_r(x - 2, 350, w + 4, 2, '#3a3c56');
      frX_f(`M${x + 6},350L${x + 8},342L${x + 16},341L${x + 18},350Z`, mix(c, '#000000', 0.6)); frX_e(x + w - 12, 346, 5, 4, mix(c, '#000000', 0.55));
      frX_glow(x + w / 2, 352, w * 0.7, c, 0.25, 0.3);
    };
    shop(6, 62, '#ffc070'); shop(100, 76, '#7ac0ff'); shop(516, 44, '#ff9060');
    frX_f('M560,326L640,326L640,336L552,336Z', '#6a1a24'); for (let x = 556; x < 640; x += 10) frX_r(x, 326, 5, 10, '#8a2a34'); // hotel awning
    frX_r(0, 352, 640, 22, '#1a1c2c'); for (let x = -10; x < 640; x += 36) frX_r(x, 352, 1, 22, '#12131f');
    frX_r(0, 372, 640, 3, '#3a3c56'); frX_r(0, 375, 640, 2, '#07080e');
    g.fillStyle = frX_lg(0, 377, 0, 400, ['#0c0e1c', '#101326'], 3); g.fillRect(0, 377, 640, 23);
    // reflections of the lit windows and shop fronts in the wet road
    for (const [x, w, c] of [[6, 62, '#ffc070'], [100, 76, '#7ac0ff'], [516, 44, '#ff9060'], [590, 26, '#ff4060']]) for (let k = 0; k < 5; k++) { // broken, rippling reflections
      const y = 379 + k * 4.4, ww = w * (0.8 - k * 0.12), xo = x + (w - ww) / 2 + Math.sin(k * 2.1 + x) * 3;
      frX_a(0.3 - k * 0.045, () => frX_r(xo, y, ww, 2.2, c));
    }
    // street lamps at both edges, their pools on the sidewalk
    for (const x of [84, 628]) {
      frX_r(x - 1.5, 262, 3, 110, '#05060c'); frX_r(x - 3, 366, 6, 6, '#05060c'); frX_st(`M${x},262C${x},254 ${x - 4},250 ${x - 12},250`, '#05060c', 2.4);
      frX_f(`M${x - 20},250L${x - 4},250L${x - 7},256L${x - 17},256Z`, '#05060c'); frX_glow(x - 12, 258, 26, '#ffcf80', 0.6); frX_r(x - 16, 256, 8, 1.4, '#fff4d0');
      frX_glow(x - 12, 362, 56, '#ffcf80', 0.3, 0.3); frX_a(0.3, () => { for (let k = 0; k < 5; k++) frX_r(x - 15 + Math.sin(k * 2) * 2, 379 + k * 4.4, 6 - k, 2.2, '#ffcf80'); });
    }
  });
}
// running figures: a cold-rimmed silhouette built from thick limbs; type 0 courier (hat, coat,
// briefcase), 1 agent with a pistol, 2 agent
function frX_runner(type, x, y, p, air) {
  // run cycle: forward-leaning torso, high knee drive, arms pumping at a right angle
  const bob = Math.abs(Math.cos(p)) * 2.2, lean = 0.32, hip = [0, -25 + bob];
  const sh = [hip[0] + Math.sin(lean) * 16, hip[1] - Math.cos(lean) * 16], hd = [sh[0] + 3.4, sh[1] - 6.2];
  const leg = ph => {
    const c = Math.max(0, Math.cos(ph)), a = air ? 0.9 * Math.sin(ph) + 0.2 : 0.75 * Math.sin(ph) + 0.6 * c, k = air ? 1.2 : 0.15 + 1.8 * c;
    const kn = [hip[0] + 12 * Math.sin(a), hip[1] + 12 * Math.cos(a)], sa = a - k, ft = [kn[0] + 12 * Math.sin(sa), kn[1] + 12 * Math.cos(sa)];
    return [`M${hip[0]},${hip[1]}L${kn[0]},${kn[1]}`, `M${kn[0]},${kn[1]}L${ft[0]},${ft[1]}L${ft[0] + 3.6 * Math.cos(sa)},${ft[1] - 3.6 * Math.sin(sa) * 0.3 + 0.6}`];
  };
  const arm = (ph, gun) => {
    if (gun) return [`M${sh[0]},${sh[1]}L${sh[0] + 7.5},${sh[1] + 1.5}`, `M${sh[0] + 7.5},${sh[1] + 1.5}L${sh[0] + 14},${sh[1] - 0.5}`];
    const u = -1 * Math.sin(ph) + 0.1, el = [sh[0] + 9 * Math.sin(u), sh[1] + 9 * Math.cos(u)], f = u + 1.6;
    return [`M${sh[0]},${sh[1]}L${el[0]},${el[1]}`, `M${el[0]},${el[1]}L${el[0] + 8 * Math.sin(f)},${el[1] + 8 * Math.cos(f)}`];
  };
  const LA = leg(p + Math.PI), LB = leg(p), AA = arm(p), AB = arm(p + Math.PI, type === 1);
  const draw = (c, dx, dy) => {
    g.save(); g.translate(x + dx, y + dy); g.strokeStyle = c; g.fillStyle = c; g.lineCap = 'round'; g.lineJoin = 'round';
    const st = (d, w) => { g.lineWidth = w; g.stroke(frX_path(d)); };
    st(LA[0], 5); st(LA[1], 3.6); st(AA[0], 3.2); st(AA[1], 2.8);
    g.beginPath(); g.moveTo(hip[0] - 3.4, hip[1] + 1); g.lineTo(sh[0] - 3.4, sh[1] - 0.5); g.lineTo(sh[0] + 3.2, sh[1] + 0.5); g.lineTo(hip[0] + 3, hip[1] + 1.5); g.closePath(); g.fill(); // torso
    if (type === 0) { g.beginPath(); g.moveTo(sh[0] - 3.4, sh[1]); g.lineTo(hip[0] - 3.4, hip[1]); g.lineTo(hip[0] - 9 - bob * 1.5, hip[1] + 10); g.lineTo(hip[0] + 1, hip[1] + 9); g.lineTo(hip[0] + 3, hip[1]); g.closePath(); g.fill(); } // coat tails
    st(LB[0], 5); st(LB[1], 3.6);
    st(`M${sh[0] + 0.6},${sh[1]}L${hd[0] - 0.6},${hd[1] + 2}`, 3);
    g.beginPath(); g.ellipse(hd[0], hd[1], 3.2, 3.8, 0.3, 0, 6.283); g.fill();
    if (type === 0) { g.beginPath(); g.ellipse(hd[0] + 0.3, hd[1] - 2.8, 6, 1.1, 0.15, 0, 6.283); g.fill(); g.fillRect(hd[0] - 3, hd[1] - 7, 6.4, 4.4); }
    st(AB[0], 3.2); st(AB[1], 2.8);
    if (type === 1) g.fillRect(sh[0] + 13.5, sh[1] - 2.6, 6, 2.2);
    if (type === 0) { const m = AB[1].split('L')[1].split(','); g.fillRect(+m[0] - 4, +m[1] - 0.5, 9, 6.5); } // briefcase
    g.restore();
  };
  draw('#7a8cff', -1.1, -0.7); draw('#03040a', 0, 0);
}
function frX_roofY(x) {
  for (let i = 0; i < frX_ROOFS.length; i++) {
    const [a, b, y] = frX_ROOFS[i];
    if (x >= a - 12 && x < b + 12) {
      const n = frX_ROOFS[i + 1];
      if (n && x > b - 12) { const u = (x - (b - 12)) / (n[0] - b + 24); return { y: y + (n[2] - y) * u, lift: Math.sin(u * Math.PI) * 12 }; }
      return { y, lift: 0 };
    }
  }
  return { y: 70, lift: 0 };
}
function titleBackdrop(t) {
  blit(frX_titleBack(), 0, 0);
  fine(() => {
    // lightning every ~9 s: a flash over the sky and a forked bolt
    const lt = t % 9.3, flash = (lt > 6 && lt < 6.08) || (lt > 6.16 && lt < 6.24);
    if (flash) { frX_a(0.35, () => frX_r(0, 0, 640, 72, '#b8c4ff')); frX_st('M540,0L532,18L542,26L530,48L536,52L528,66', '#f4f6ff', 1.6); frX_a(0.5, () => frX_st('M540,0L532,18L542,26L530,48L536,52L528,66', '#b8c4ff', 5)); }
    // searchlights sweeping up from behind the rooftops
    g.globalCompositeOperation = 'lighter';
    for (const [bx, ph, sp] of [[130, 0, 0.5], [410, 2.1, 0.37], [560, 4, 0.6]]) {
      const a = Math.sin(t * sp + ph) * 0.55, len = 110, tx = bx + Math.sin(a) * len, ty = 72 - Math.cos(a) * len, px = Math.cos(a) * 16, py = Math.sin(a) * 16;
      const gr = g.createLinearGradient(bx, 72, tx, ty); gr.addColorStop(0, 'rgba(170,190,255,0.28)'); gr.addColorStop(1, 'rgba(170,190,255,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(bx - 2, 72); g.lineTo(bx + 2, 72); g.lineTo(tx + px, ty + py); g.lineTo(tx - px, ty - py); g.closePath(); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    // redraw the roofline over the beams' roots (the beams start behind the buildings)
    for (const [a, b, y] of frX_ROOFS) { const x0 = Math.max(0, a), x1 = Math.min(640, b); frX_r(x0, y + 5, x1 - x0, 6, '#12142a'); }
    // aircraft warning light on the Monument, blinking
    if ((t * 1.2 | 0) % 2) { frX_glow(469, 10, 8, '#ff3030', 0.7); frX_e(469, 10, 1.2, 1.2, '#ff8080'); }
    // the chase: a courier with a briefcase, two agents after him
    const lead = (t * 92) % (640 + 380) - 60;
    const run = (x, type, off) => {
      if (x < -30 || x > 670) return null;
      const r = frX_roofY(x), p = t * 11 + off;
      frX_runner(type, x, r.y - r.lift, p, r.lift > 3);
      return [x, r.y - r.lift];
    };
    run(lead, 0, 0); const a1 = run(lead - 76, 1, 2); run(lead - 128, 2, 4);
    if (a1 && (t * 1.3) % 1 < 0.07) { frX_glow(a1[0] + 26, a1[1] - 42, 10, '#ffd060', 0.8); frX_e(a1[0] + 25.5, a1[1] - 42, 2.4, 1.6, '#ffffff'); }
    // neon HOTEL flickering, and its glow on the wall
    const on = !((t * 7 | 0) % 23 === 0 || (t * 7 | 0) % 37 === 0);
    if (on) frX_glow(602, 200, 70, '#ff2a50', 0.22, 1.8);
    // a car cruising past on the street, headlights sweeping the wet road
    const cp = (t % 7) / 7, cx = -120 + cp * 900;
    if (cp < 0.95) {
      frX_a(0.3, () => frX_f(`M${cx + 100},${384}L${cx + 190},${376}L${cx + 190},${398}Z`, '#fff2c0'));
      frX_f(`M${cx},392L${cx + 4},380L${cx + 24},378L${cx + 36},368L${cx + 70},368L${cx + 84},378L${cx + 100},380L${cx + 102},392Z`, '#0a0b14');
      frX_st(`M${cx + 24},378L${cx + 36},368L${cx + 70},368L${cx + 84},378`, '#4a58a8', 1);
      frX_r(cx + 38, 370, 14, 7, '#1c2450'); frX_r(cx + 55, 370, 14, 7, '#1c2450');
      frX_e(cx + 20, 393, 7, 7, '#020204'); frX_e(cx + 82, 393, 7, 7, '#020204');
      frX_e(cx + 100, 383, 2.4, 1.8, '#fff8e0'); frX_glow(cx + 100, 383, 14, '#fff2c0', 0.5); frX_r(cx, 381, 3, 3, '#ff3030');
      frX_a(0.3, () => frX_r(cx + 60, 398, 60, 2, '#fff2c0'));
    }
    // rain: long thin streaks slanting left, splashes on the road
    const f = t * 60;
    for (let i = 0; i < 110; i++) {
      const sp = 6 + frX_hash(i, 9) * 4, len = 8 + (i & 7) * 1.5, y = ((frX_hash(i, 3) * 440 + f * sp) % 440) - 20, x = ((frX_hash(i, 7) * 700 - y * 0.25) % 700 + 700) % 700 - 30;
      g.strokeStyle = i % 3 ? 'rgba(140,160,230,0.45)' : 'rgba(200,220,255,0.6)'; g.lineWidth = i % 4 ? 0.8 : 1.2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + len * 0.25, y - len); g.stroke();
    }
    for (let i = 0; i < 12; i++) { const u = (t * 2 + frX_hash(i, 1)) % 1, x = frX_hash(i, 2 + (t * 2 + frX_hash(i, 1) | 0)) * 640, y = 380 + frX_hash(i, 5) * 18; frX_a(1 - u, () => { g.strokeStyle = '#a8b8f0'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(x, y, 1 + u * 5, 0.5 + u * 1.4, 0, 0, 6.283); g.stroke(); }); }
  });
  // neon letters on top (layout font)
  const on = !((t * 7 | 0) % 23 === 0 || (t * 7 | 0) % 37 === 0);
  if (on) 'HOTEL'.split('').forEach((ch, i) => textC(ch, 301, 58 + i * 18, '#ff5a7a'));
}
