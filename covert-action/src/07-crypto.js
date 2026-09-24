// ===================================================================
// CRYPTO WORKSTATION: letter-substitution cipher against the clock
// (art helpers carry the cyX_ prefix; they build on the ciaX_ helpers of the CIA floor art)
// ===================================================================
// the CRT glass of the close-up workstation (the monitor case fills the screen)
const cyX_GX = 14, cyX_GY = 6, cyX_GW = 292, cyX_GH = 170;
const cyX_HELP = 'TAB = hint (costs time)  ESC = quit';
const cyX_ease = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
const cyX_hash = (a, b) => { let h = Math.imul(a * 374761393 + b * 668265263, 1274126177); h ^= h >>> 13; return ((h >>> 0) % 1000) / 1000; };

// ---------- close-up: the monitor case (glass area left transparent) ----------
function cyX_case() {
  return sprite('cyX_case', 320, 200, () => {
    // moulded beige plastic, lit from above: warm highlight at the top, shadowed chin
    rect(0, 0, 320, 200, P.G3); dither(0, 0, 320, 4, P.G3, P.W, 8);
    dither(0, 196, 320, 4, P.G3, P.G1, 4);
    rect(0, 0, 320, 1, P.W); rect(0, 0, 1, 200, P.W); rect(319, 0, 1, 200, P.G1);
    // rounded outer corners show the dark room behind
    rect(0, 0, 3, 1, P.K); rect(0, 1, 1, 2, P.K); rect(317, 0, 3, 1, P.K); rect(319, 1, 1, 2, P.K);
    // recessed bezel around the tube, bevelled toward the glass
    const o = { x0: 8, y0: 1, x1: 312, y1: 182 }, i = { x0: cyX_GX, y0: cyX_GY, x1: cyX_GX + cyX_GW, y1: cyX_GY + cyX_GH };
    ciaX_poly([[o.x0, o.y0], [o.x1, o.y0], [i.x1, i.y0], [i.x0, i.y0]], P.G1);
    ciaX_poly([[o.x0, o.y0], [i.x0, i.y0], [i.x0, i.y1], [o.x0, o.y1]], [P.G1, P.G3, 5]);
    ciaX_poly([[o.x1, o.y0], [o.x1, o.y1], [i.x1, i.y1], [i.x1, i.y0]], [P.G3, P.W, 3]);
    ciaX_poly([[o.x0, o.y1], [i.x0, i.y1], [i.x1, i.y1], [o.x1, o.y1]], [P.G3, P.W, 9]);
    rect(o.x0, o.y1, o.x1 - o.x0, 1, P.W); rect(o.x1, o.y0, 1, o.y1 - o.y0 + 1, P.W); rect(o.x0 - 1, o.y0, 1, o.y1 - o.y0, P.G1);
    // mitred corners of the recess
    line(o.x0, o.y0, i.x0, i.y0, P.K); line(o.x1, o.y0, i.x1, i.y0, P.G1); line(o.x0, o.y1, i.x0, i.y1, P.G1); line(o.x1, o.y1, i.x1, i.y1, P.G3);
    // black rubber gasket, then the glass hole with rounded tube corners
    frame(i.x0 - 1, i.y0 - 1, cyX_GW + 2, cyX_GH + 2, P.K);
    g.clearRect(i.x0, i.y0, cyX_GW, cyX_GH);
    const ins = [5, 3, 2, 1, 1];
    ins.forEach((n, k) => { rect(i.x0, i.y0 + k, n, 1, P.K); rect(i.x1 - n, i.y0 + k, n, 1, P.K); rect(i.x0, i.y1 - 1 - k, n, 1, P.K); rect(i.x1 - n, i.y1 - 1 - k, n, 1, P.K); });
    // chin: classification label, embossed help, LEDs, abort key, screws
    rect(17, 185, 31, 11, P.K); rect(18, 186, 29, 9, P.RD); rect(18, 186, 29, 1, P.RD2); ciaX_t3('SECRET', 21, 188, P.W);
    text(cyX_HELP, 54, 188, P.W); text(cyX_HELP, 54, 187, P.G1);
    for (const lx of [246, 255]) { rect(lx - 1, 185, 6, 4, P.G1); rect(lx - 1, 188, 6, 1, P.W); rect(lx, 186, 4, 2, P.K); }
    ciaX_t3('ON', 245, 191, P.G1); ciaX_t3('HD', 254, 191, P.G1);
    rect(265, 184, 46, 14, P.K); rect(266, 185, 44, 12, P.RD); rect(266, 185, 44, 1, P.RD2); rect(266, 185, 1, 11, P.RD2); rect(266, 196, 44, 1, P.K); dither(267, 193, 42, 3, P.RD, P.K, 4);
    text('ABORT', 274, 187, P.K); text('ABORT', 273, 186, P.W);
    for (const [sx, sy] of [[6, 190], [313, 190]]) { rect(sx - 1, sy - 1, 3, 3, P.G1); px(sx, sy, P.K); px(sx - 1, sy - 1, P.W); }
    // vent slots across the lower chin
    for (let k = 0; k < 6; k++) { rect(56 + k * 30, 197, 22, 1, P.G1); rect(56 + k * 30, 198, 22, 1, P.W); }
  });
}
// the dark phosphor glass: glare on the curved tube and a faint raster texture
function cyX_glassBG() {
  return sprite('cyX_glass', cyX_GW, cyX_GH, () => {
    rect(0, 0, cyX_GW, cyX_GH, P.K);
    // curved glare hugging the top-left of the tube, and a glint bottom right
    for (let a = 0; a <= 1; a += 0.01) { const x = Math.round(5 + (1 - Math.cos(a * 1.57)) * 70), y = Math.round(4 + (1 - Math.sin(a * 1.57)) * 34); if ((x + y) % 2 === 0) px(x, y, P.G1); if (a > 0.35 && a < 0.8 && (x + y) % 2 === 1) px(x + 2, y + 2, P.G1); }
    for (let x = 226; x < cyX_GW - 10; x += 2) px(x, cyX_GH - 5 - ((x - 226) / 22 | 0), P.G1);
  });
}
// the dead tube reflects the analyst sitting in front of it
function cyX_refl() {
  return sprite('cyX_refl', 120, 90, () => {
    const on = (x, y) => { const hx = (x - 60) / 17, hy = (y - 34) / 21; if (hx * hx + hy * hy < 1) return true; if (y > 52 && y < 60 && Math.abs(x - 60) < 8) return true; const sw = 12 + (y - 56) * 1.6; return y >= 58 && Math.abs(x - 60) < Math.min(58, sw); };
    for (let y = 0; y < 90; y++) for (let x = 0; x < 120; x++) if (on(x, y) && BAYER[(y & 3) * 4 + (x & 3)] < 1) px(x, y, P.BL);
  });
}
// the sweep of the electron beam: a soft band of phosphor dots
function cyX_beam() {
  return sprite('cyX_beam', cyX_GW, 7, () => {
    for (let y = 0; y < 7; y++) { const l = [0, 1, 2, 3, 2, 1, 0][y]; for (let x = 0; x < cyX_GW; x++) if (BAYER[(y & 3) * 4 + (x & 3)] < l) px(x, y, P.GR); }
  });
}
// ---------- touch picker: a beige keyboard sliding up over the chin ----------
function cyX_kbd() {
  return sprite('cyX_kbd', 240, 80, () => {
    ciaX_poly([[4, 0], [236, 0], [240, 6], [240, 80], [0, 80], [0, 6]], P.G3);
    dither(0, 60, 240, 20, P.G3, P.G1, 3); rect(4, 0, 232, 1, P.W); line(0, 6, 4, 0, P.W); line(236, 0, 239, 5, P.G1); rect(0, 6, 1, 74, P.W); rect(239, 6, 1, 74, P.G1);
    // caption window (LCD-green on black) and the key well
    rect(7, 3, 226, 12, P.G1); rect(8, 4, 224, 10, P.K); rect(8, 13, 224, 1, P.G3);
    rect(11, 15, 218, 64, P.G1); rect(11, 15, 218, 1, P.K); rect(12, 16, 216, 62, P.K); dither(12, 16, 216, 62, P.K, P.G1, 3);
    ciaX_t3('CRYPTO-90', 184, 72, P.G3); rect(18, 70, 4, 3, P.K); rect(19, 71, 2, 1, P.GR2);
  });
}
function cyX_cap(kind) { // 18x13 key cap: n normal, t taken, c current mapping, p pressed
  return sprite('cyX_cap' + kind, 18, 13, () => {
    const face = { n: P.G3, t: P.G1, c: P.YE, p: P.W }[kind], hi = { n: P.W, t: P.G3, c: P.W, p: P.W }[kind], lo = { n: P.G1, t: P.K, c: P.BR, p: P.G3 }[kind];
    rect(0, 0, 18, 13, P.K); rect(1, 1, 16, 11, lo); rect(2, 1, 14, 9, face); rect(2, 1, 14, 1, hi); rect(2, 1, 1, 9, hi);
  });
}

// ---------- the analyst's desk (intro): night office in the Crypto Branch ----------
function cyX_analyst() { // over-the-shoulder, bottom left: shirt-sleeves, red braces, forearm on the desk
  return ciaX_fig('cyX_analyst', 150, 116, () => {
    // back and shoulders; the lamp lights him from the upper right
    ciaX_poly([[10, 116], [12, 72], [24, 56], [44, 49], [66, 49], [84, 54], [98, 64], [104, 116]], P.W);
    ciaX_poly([[10, 116], [12, 72], [24, 56], [32, 54], [24, 76], [22, 116]], [P.W, P.G3, 9]);
    ciaX_poly([[12, 84], [20, 70], [22, 116], [10, 116]], P.G3);
    line(56, 60, 55, 116, P.G3); line(30, 66, 36, 84, P.G3); line(88, 66, 84, 80, P.G3); line(60, 78, 68, 96, P.G3); line(44, 84, 42, 104, P.G3); line(80, 92, 86, 110, P.G3);
    // braces
    ciaX_poly([[33, 53], [38, 52], [45, 116], [40, 116]], P.RD); line(37, 53, 44, 116, P.RD2);
    ciaX_poly([[72, 52], [77, 53], [72, 116], [67, 116]], P.RD); line(76, 53, 71, 116, P.RD2);
    // upper arm reaching forward (foreshortened) to the elbow resting on the desk edge
    ciaX_poly([[84, 54], [100, 58], [118, 44], [112, 36], [98, 42]], P.W); ciaX_poly([[92, 60], [100, 58], [118, 44], [116, 48], [102, 62]], P.G3);
    ciaX_poly([[108, 38], [114, 34], [120, 44], [114, 48]], P.G3); line(109, 37, 114, 34, P.W); line(114, 47, 120, 44, P.G1);
    // forearm and hand on the keys
    ciaX_poly([[116, 38], [136, 28], [140, 34], [120, 46]], P.SK); ciaX_poly([[118, 44], [138, 32], [140, 34], [120, 46]], P.SK2); line(120, 39, 132, 33, P.SK3);
    ciaX_poly([[135, 27], [144, 24], [149, 28], [146, 33], [139, 34]], P.SK); line(139, 33, 147, 31, P.SK2); px(144, 25, P.W); px(147, 28, P.SK3); px(145, 30, P.SK3);
    // collar and neck
    rect(49, 36, 14, 9, P.SK); rect(49, 36, 4, 9, P.SK2); rect(53, 36, 10, 2, P.SK3);
    ciaX_poly([[42, 49], [48, 43], [64, 43], [70, 49], [64, 53], [48, 53]], P.W); line(42, 49, 48, 53, P.G3); line(64, 53, 70, 49, P.G3); line(48, 43, 64, 43, P.G3);
    // the head from behind, turned toward the screen: cheek and ear show on the right
    ciaX_poly([[66, 10], [73, 15], [75, 27], [72, 36], [62, 40]], P.SK); ciaX_poly([[70, 26], [75, 27], [72, 36], [67, 37]], P.SK2);
    ciaX_ell(56, 22, 15, 17, P.BR);
    ciaX_poly([[42, 30], [45, 38], [60, 40], [68, 33], [58, 35]], [P.BR, P.K, 6]);
    ciaX_poly([[50, 6], [61, 5], [69, 12], [68, 17], [59, 11], [50, 11]], [P.BR, P.YE, 3]); px(62, 6, P.YE); px(65, 8, P.YE); px(67, 11, P.YE);
    line(46, 12, 43, 30, P.K); line(51, 10, 49, 26, P.K); line(58, 13, 60, 28, P.K); line(64, 16, 66, 26, P.K); line(55, 8, 53, 16, P.K);
    ciaX_ell(72, 24, 2, 5, P.SK); px(72, 23, P.SK3); px(72, 26, P.SK3); px(73, 20, P.W); line(70, 20, 70, 29, P.SK2);
  });
}
function cyX_monitorMini(x, y) { // the workstation seen across the desk: 80x50, a quarter-scale twin of the close-up
  rect(x, y, 80, 50, P.G3); rect(x, y, 80, 1, P.W); rect(x, y, 1, 50, P.W); rect(x + 79, y, 1, 50, P.G1); rect(x, y + 49, 80, 1, P.G1);
  dither(x + 1, y + 46, 78, 3, P.G3, P.G1, 4);
  rect(x + 2, y, 76, 46, P.G1); dither(x + 2, y + 1, 1, 45, P.G1, P.G3, 8); rect(x + 2, y + 45, 76, 1, P.W); rect(x + 77, y + 1, 1, 45, P.W);
  rect(x + 3, y + 1, 74, 44, P.K);
  rect(x + 4, y + 46, 7, 3, P.RD); rect(x + 66, y + 46, 11, 3, P.RD); px(x + 66, y + 46, P.RD2); rect(x + 14, y + 47, 48, 1, P.G1);
}
function cyX_desk() {
  return sprite('cyX_desk', 320, 200, () => {
    // back wall: painted government blue, falling into the dark corners
    vgrad(0, 0, 320, 104, [P.K, P.BL, P.BL, P.BL]);
    for (let x = 0; x < 320; x += 40) { rect(x, 6, 1, 98, P.K); if (x) px(x + 1, 6, P.BL2); } // panel seams
    dither(0, 92, 320, 12, P.BL, P.K, 6); rect(0, 88, 320, 1, P.K); rect(0, 87, 320, 1, P.BL2); // dado rail
    // window with venetian blinds, the night city behind
    rect(10, 8, 78, 62, P.G1); rect(12, 10, 74, 58, P.K); dither(12, 10, 74, 58, P.K, P.BL, 5);
    for (let k = 0; k < 9; k++) { const bw = Math.min(5 + (k * 7) % 6, 83 - 12 - k * 9), bh = 12 + (k * 13) % 22, bx = 12 + k * 9; rect(bx, 68 - bh, bw + 2, bh, P.K); for (let wy = 70 - bh; wy < 66; wy += 3) for (let wx = bx + 1; wx < bx + bw; wx += 2) if (cyX_hash(wx, wy) < 0.3) px(wx, wy, P.YE); }
    px(30, 16, P.W); px(64, 13, P.W); px(76, 22, P.G3); ciaX_ell(72, 18, 3, 3, P.G3); ciaX_ell(73, 17, 3, 3, P.K); // stars and a crescent moon
    for (let sy = 10; sy < 40; sy += 3) { rect(12, sy, 74, 1, P.G3); rect(12, sy + 1, 74, 1, P.G1); }
    rect(12, 40, 74, 2, P.G3); rect(12, 42, 74, 1, P.K); // bottom rail of the raised blinds
    rect(22, 10, 1, 32, P.G1); rect(76, 10, 1, 32, P.G1); rect(48, 42, 1, 10, P.W); rect(47, 52, 3, 3, P.G3);
    rect(10, 68, 78, 3, P.G3); rect(10, 68, 78, 1, P.W); rect(49, 10, 1, 58, P.G1);
    // wall clock above the workstation
    ciaX_ell(160, 22, 11, 11, P.K); ciaX_ell(160, 22, 10, 10, P.G3); ciaX_ell(160, 22, 9, 9, P.W);
    for (let k = 0; k < 12; k++) px(160 + Math.round(Math.cos(k / 12 * 6.283) * 7), 22 + Math.round(Math.sin(k / 12 * 6.283) * 7), k % 3 ? P.G3 : P.K);
    // pinned frequency chart: ENGLISH LETTER FREQUENCY
    rect(188, 12, 44, 38, P.W); rect(189, 13, 44, 38, P.G1); rect(188, 12, 44, 38, P.W); rect(188, 49, 44, 1, P.G3);
    ciaX_t3('ETAOIN', 196, 15, P.K); rect(191, 22, 38, 1, P.G3);
    [18, 13, 12, 11, 10, 10, 9, 9, 8].forEach((h, k) => { rect(192 + k * 4, 44 - h, 3, h, k < 1 ? P.RD : P.BL); });
    rect(191, 45, 38, 1, P.K); for (let k = 0; k < 9; k++) px(193 + k * 4, 47, P.G1);
    px(210, 12, P.RD); px(210, 13, P.RD2);
    // the desk: walnut top in perspective and a dark front
    ciaX_poly([[0, 104], [320, 100], [320, 128], [0, 132]], P.BR);
    for (let k = 0; k < 9; k++) { const y0 = 107 + k * 2.6; let x = (k * 53) % 40; while (x < 320) { const len = 18 + ((x * 7 + k * 13) % 50); line(x, y0 - x / 80, x + len, y0 - (x + len) / 80, k % 3 ? P.K : P.RD); x += len + 10 + ((x + k) % 23); } }
    dither(0, 101, 320, 5, P.BR, P.K, 7);
    ciaX_poly([[0, 132], [320, 128], [320, 133], [0, 137]], P.BR); line(0, 132, 320, 128, P.YE); line(0, 136, 320, 132, P.K);
    ciaX_poly([[0, 137], [320, 133], [320, 200], [0, 200]], [P.BR, P.K, 4]); dither(0, 186, 320, 14, P.BR, P.K, 9);
    for (let k = 0; k < 12; k++) { const yy = 140 + k * 5; line(100, yy - 1, 210, yy - 2, P.K); }
    rect(214, 142, 96, 30, P.K); rect(215, 143, 94, 28, P.BR); rect(215, 143, 94, 1, P.RD2); rect(215, 143, 1, 28, P.RD2); for (let k = 0; k < 5; k++) line(220, 148 + k * 5, 304, 147 + k * 5, P.RD);
    rect(250, 152, 24, 4, P.G1); rect(250, 152, 24, 1, P.W); rect(252, 156, 20, 1, P.K);
    rect(214, 176, 96, 24, P.K); rect(215, 177, 94, 23, P.BR); rect(215, 177, 94, 1, P.RD2); rect(215, 177, 1, 23, P.RD2); for (let k = 0; k < 4; k++) line(220, 182 + k * 5, 304, 181 + k * 5, P.RD); rect(250, 184, 24, 4, P.G1); rect(250, 184, 24, 1, P.W);
    // lamplight pooling on the desk top
    for (let y = 104; y < 128; y++) { const hw = Math.round(34 * Math.sqrt(Math.max(0, 1 - ((y - 114) / 12) ** 2))); for (let x = 106 - hw; x <= 106 + hw; x++) { const d = Math.hypot((x - 106) / 34, (y - 114) / 12); if (BAYER[(y & 3) * 4 + (x & 3)] < (d < 0.5 ? 3 : d < 0.8 ? 2 : 1)) px(x, y, P.YE); } }
    // in-tray with a stack of intercepts and a red-bordered folder
    ciaX_poly([[14, 96], [70, 94], [74, 110], [12, 113]], P.K);
    for (let k = 0; k < 5; k++) { ciaX_poly([[16, 104 - k * 2], [68, 102 - k * 2], [70, 106 - k * 2], [15, 108 - k * 2]], k === 3 ? P.RD : P.W); line(15, 108 - k * 2, 70, 106 - k * 2, P.G3); }
    ciaX_poly([[20, 94], [64, 92], [66, 96], [18, 98]], P.YE); line(24, 95, 44, 94, P.BR); line(24, 96, 38, 96, P.BR);
    for (let k = 0; k < 6; k++) line(13 + k * 12, 110 - k * 0.3, 14 + k * 12, 100, P.G1);
    line(12, 113, 74, 110, P.G3); line(12, 101, 72, 98, P.G3);
    // the desk lamp: weighted base, sprung arm, green shade
    ciaX_ell(98, 110, 10, 3, P.K); ciaX_ell(98, 109, 9, 2, P.G1); rect(92, 108, 12, 1, P.G3);
    line(98, 108, 92, 80, P.G3); line(99, 108, 93, 80, P.G1); line(92, 80, 106, 64, P.G3); line(93, 81, 107, 65, P.G1);
    line(95, 94, 103, 72, P.G1); ciaX_ell(92, 80, 2, 2, P.G1); px(92, 80, P.W);
    ciaX_poly([[98, 60], [110, 58], [120, 74], [96, 78]], P.GR); ciaX_poly([[98, 60], [104, 59], [106, 76], [96, 78]], [P.GR, P.GR2, 4]); line(98, 60, 110, 58, P.GR2);
    ciaX_poly([[96, 78], [120, 74], [120, 76], [97, 80]], P.YE); line(100, 78, 116, 76, P.W);
    // the workstation: monitor, tilt stand and keyboard
    cyX_monitorMini(120, 46);
    rect(150, 96, 20, 6, P.G1); rect(150, 96, 20, 1, P.G3); ciaX_ell(160, 104, 22, 3, P.K); ciaX_ell(160, 103, 21, 2, P.G3); rect(140, 103, 40, 1, P.W);
    ciaX_poly([[126, 110], [194, 110], [198, 121], [122, 121]], P.K); ciaX_poly([[127, 110], [193, 110], [196, 119], [124, 119]], P.G3);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 13; k++) { const kx = 128 + k * 5 - r + (r === 1 ? 1 : 0), ky = 111 + r * 3; rect(kx, ky, 4, 2, r === 2 && k > 3 && k < 9 ? P.G3 : P.W); px(kx, ky + 1, P.G1); }
    rect(152, 117, 18, 2, P.W); rect(124, 119, 72, 2, P.G1); line(122, 121, 198, 121, P.K);
    // coffee mug and an overflowing ashtray
    rect(204, 98, 11, 12, P.K); rect(205, 99, 9, 10, P.W); rect(205, 99, 9, 2, P.BR); dither(211, 101, 3, 8, P.W, P.G3, 8); rect(214, 101, 3, 6, P.K); rect(215, 102, 1, 4, P.W);
    rect(207, 103, 5, 4, P.BL); px(209, 104, P.YE);
    ciaX_ell(184, 124, 8, 3, P.K); ciaX_ell(184, 123, 7, 2, P.G1); ciaX_ell(184, 123, 5, 1, P.G3); rect(181, 122, 5, 1, P.W); rect(186, 121, 6, 1, P.W); px(191, 121, P.RD2);
    // the teletype, printing the intercept onto a roll of canary paper
    ciaX_ell(268, 80, 26, 5, P.G3); ciaX_ell(268, 79, 24, 4, P.W); // paper roll behind the hood
    ciaX_poly([[228, 84], [308, 84], [314, 96], [314, 122], [222, 122], [222, 96]], P.K);
    ciaX_poly([[229, 85], [307, 85], [312, 96], [312, 120], [224, 120], [224, 96]], P.G3);
    dither(224, 108, 88, 12, P.G3, P.G1, 5); rect(229, 85, 78, 1, P.W); line(224, 96, 229, 85, P.W);
    ciaX_poly([[232, 86], [304, 86], [306, 94], [230, 94]], P.G1); rect(236, 88, 64, 4, P.K); rect(236, 88, 64, 1, P.G1); // platen well
    ciaX_ell(233, 90, 3, 3, P.K); ciaX_ell(233, 90, 2, 2, P.G1); ciaX_ell(303, 90, 3, 3, P.K); ciaX_ell(303, 90, 2, 2, P.G1);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 11; k++) { const kx = 234 + k * 6 + r * 2, ky = 99 + r * 5; rect(kx + 1, ky, 4, 3, P.K); rect(kx + 1, ky, 3, 1, P.W); px(kx + 1, ky + 1, P.G3); }
    rect(250, 115, 22, 7, P.K); ciaX_t3('TELEX', 251, 116, P.G3);
    rect(228, 122, 82, 3, P.K); rect(228, 122, 82, 1, P.G1);
    // the analyst himself, over the shoulder
    g.drawImage(cyX_analyst(), 0, 84);
  });
}
// the whole desk scene, animated: t = seconds, glow = how far the monitor has lit (0..1)
function cyX_deskScene(t, glow) {
  g.drawImage(cyX_desk(), 0, 0);
  // clock hands
  const mm = (t / 20) % 1; line(160, 22, 160 + Math.round(Math.cos(mm * 6.283 - 1.57) * 7), 22 + Math.round(Math.sin(mm * 6.283 - 1.57) * 7), P.K); line(160, 22, 156, 19, P.K); px(160, 22, P.RD);
  // teletype paper feeding up out of the platen and curling over the top
  const feed = (t * 22) | 0;
  rect(240, 18, 56, 70, P.W); dither(240, 18, 56, 70, P.W, P.YE, 2); rect(240, 18, 2, 70, P.G3); rect(294, 18, 2, 70, P.G3);
  ciaX_poly([[240, 18], [296, 18], [300, 12], [244, 11]], P.G3); ciaX_poly([[244, 11], [300, 12], [298, 9], [246, 8]], P.W);
  for (let yy = 86; yy > 20; yy -= 3) {
    const ln = Math.floor((yy + feed) / 3), n = ln % 7 === 0 ? 0 : 10 + ((ln * 37) % 40);
    if (ln % 9 === 4) { rect(246, yy, 18, 1, P.RD); continue; }
    for (let x = 0; x < n; x += 2) if (cyX_hash(x >> 2, ln) < 0.8) rect(246 + x, yy, (cyX_hash(x, ln) < 0.5) ? 1 : 2, 1, P.G1);
  }
  rect(240, 86, 56, 2, P.K);
  // print head chattering along the platen
  const hx = 244 + ((t * 90) % 48 | 0); rect(hx, 84, 6, 5, P.G1); rect(hx, 84, 6, 1, P.G3); rect(hx + 1, 88, 4, 1, P.RD);
  // steam from the coffee, smoke from the cigarette
  for (let k = 0; k < 5; k++) { const s = (t * 1.6 + k / 5) % 1, sy = 96 - s * 22, sx = 209 + Math.round(Math.sin(s * 7 + k) * 2); if (s < 0.8) px(sx, sy | 0, s < 0.4 ? P.G3 : P.G1); }
  for (let k = 0; k < 7; k++) { const s = (t * 0.9 + k / 7) % 1, sy = 119 - s * 40, sx = 192 + Math.round(Math.sin(s * 9 + t) * (1 + s * 3)); px(sx, sy | 0, s < 0.5 ? P.G3 : P.G1); }
  // desk lamp bulb flicker (barely)
  if ((t * 13 | 0) % 37 === 0) rect(100, 78, 16, 1, P.W);
  // the analyst's typing hand
  if ((t * 8 | 0) % 2) { px(147, 112, P.SK); px(148, 113, P.SK2); } else { px(143, 110, P.K); px(146, 110, P.SK); }
  // monitor screen: dark, or glowing as it warms up
  if (glow > 0) {
    const gx = 123, gy = 47, gw = 74, gh = 44;
    if (glow < 0.5) { const w = Math.max(1, Math.round(gw * glow * 2)); rect(gx + (gw - w) / 2, gy + gh / 2, w, 1, P.W); }
    else { dither(gx, gy, gw, gh, P.K, P.GR, Math.round((glow - 0.5) * 8)); rect(gx + 2, gy + 2, gw - 4, 2, P.GR2); for (let r = 0; r < 4; r++) rect(gx + 4, gy + 8 + r * 5, 40 + ((r * 17) % 26), 1, P.GR2); }
  }
  // tiny power LED on the monitor chin
  px(137, 94, glow > 0 ? P.GR2 : P.GR);
}

// ---------- decode success: a teletype close-up printing the plain text ----------
function cyX_printBG() {
  return sprite('cyX_printBG', 320, 200, () => {
    vgrad(0, 0, 320, 140, [P.K, P.K, P.BL]); for (let x = 20; x < 320; x += 40) rect(x, 30, 1, 110, P.K);
    // lamp light warming the top of the machine
    rect(0, 120, 320, 80, P.K); dither(0, 118, 320, 20, P.K, P.BR, 3);
  });
}
function cyX_printBody() {
  return sprite('cyX_printBody', 320, 64, () => {
    // platen and its knobs (y 0..9), then the hood with a plexiglass window, then the base
    rect(26, 1, 268, 9, P.K); rect(28, 2, 264, 2, P.G1); rect(28, 3, 264, 1, P.G3);
    for (const kx of [14, 296]) { rect(kx, 0, 10, 11, P.K); rect(kx + 1, 1, 8, 9, P.G1); for (let k = 0; k < 4; k++) rect(kx + 2 + k * 2, 2, 1, 7, P.G3); rect(kx + 1, 1, 8, 1, P.W); }
    ciaX_poly([[10, 12], [310, 12], [318, 22], [318, 64], [2, 64], [2, 22]], P.K);
    ciaX_poly([[11, 13], [309, 13], [316, 22], [316, 64], [4, 64], [4, 22]], P.G3);
    rect(11, 13, 298, 1, P.W); line(4, 22, 11, 13, P.W); line(309, 13, 316, 22, P.G1);
    dither(4, 44, 312, 20, P.G3, P.G1, 4); dither(4, 56, 312, 8, P.G3, P.G1, 9);
    // plexiglass window over the type mechanism
    rect(56, 16, 208, 22, P.K); rect(57, 17, 206, 20, P.G1); dither(57, 17, 206, 20, P.K, P.BL, 3);
    for (let k = 0; k < 7; k++) line(66 + k * 26, 36, 78 + k * 26, 18, P.BL2);
    for (const sx of [80, 240]) { ciaX_ell(sx, 27, 8, 7, P.K); ciaX_ell(sx, 27, 7, 6, P.RD); ciaX_ell(sx, 27, 5, 4, P.K); ciaX_ell(sx, 27, 2, 2, P.G3); px(sx - 1, 26, P.W); }
    rect(88, 26, 144, 1, P.RD); rect(88, 27, 144, 1, P.K);
    rect(56, 38, 208, 1, P.W);
    // brand and screws
    rect(22, 44, 30, 9, P.K); rect(23, 45, 28, 7, P.G1); ciaX_t3('TELEX', 27, 46, P.W);
    ciaX_t3('MODEL 33', 262, 46, P.G1);
    for (const sx of [10, 310]) { rect(sx - 1, 49, 3, 3, P.G1); px(sx, 50, P.K); }
  });
}
function cyX_stamp() { // red rubber stamp, worn ink
  return sprite('cyX_stamp', 100, 30, () => {
    frame(0, 0, 100, 30, P.RD); frame(1, 1, 98, 28, P.RD); frame(4, 4, 92, 22, P.RD);
    bigText('DECODED', 50 - bigW('DECODED', 2) / 2, 7, 2, P.RD);
    for (let y = 0; y < 30; y++) for (let x = 0; x < 100; x++) { const h = cyX_hash(x, y); if (h < 0.05 || (h < 0.2 && cyX_hash(x >> 3, y >> 2) < 0.2)) g.clearRect(x, y, 1, 1); }
  });
}
function cyX_drawStamp(x, y) { // a slight tilt made from stepped rows, 1990 style
  const s = cyX_stamp(); for (let r = 0; r < 30; r++) g.drawImage(s, 0, r, 100, 1, x + Math.floor((29 - r) / 8), y + r, 100, 1);
}

// ===================================================================
function cryptoScene(plain, opts, done) {
  const sk = game.agent ? game.agent.skills.crypto : 2;
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let key; do { key = shuffle(A.split('')); } while (key.some((c, i) => c === A[i]));
  const enc = ch => A.includes(ch) ? key[A.indexOf(ch)] : ch;
  const cipher = plain.split('').map(enc).join('').replace(/ /g, (opts.level || 0) >= 3 ? '' : ' ');
  const used = [...new Set(cipher.split('').filter(c => A.includes(c)))];
  const guess = {}, given = new Set();
  const freq = {}; for (const c of cipher) if (A.includes(c)) freq[c] = (freq[c] || 0) + 1;
  const byFreq = used.slice().sort((a, b) => freq[b] - freq[a]);
  const lvl = opts.level || 0; // Local Disturbance gives the most help; skill adds more
  const nGiven = Math.max(1, 3 - lvl + sk);
  byFreq.slice(0, nGiven).forEach(c => { guess[c] = A[key.indexOf(c)]; given.add(c); });
  const msgNo = opts.msgNo || 'M' + ri(100, 399); let hints = 0;
  let time = 0, over = null, t = 0, picker = false; // the workstation clock counts up
  let intro = 0, finished = false, pickT = 0, ledT = 0, keyFlash = null; const flash = {};
  const INTRO = 2.0, WIN_END = 3.7, FAIL_END = 2.4; // fail timeline starts at over.t = 1
  const plainOf = c => A[key.indexOf(c)];
  // text layout: 6px cells, lines broken at spaces, hyphenated like the original if a word won't fit
  const CW = 6, X0 = 28, maxCols = 44, LH = 16, LY = 23;
  const lines = []; { let cur = ''; for (const word of cipher.split(' ')) { const cand = cur ? cur + ' ' + word : word; if (cand.length > maxCols) { lines.push(cur); cur = word; } else cur = cand; } if (cur) lines.push(cur); }
  for (let i = 0; i < lines.length; i++) if (lines[i].length > maxCols) lines.splice(i, 1, lines[i].slice(0, maxCols), lines[i].slice(maxCols));
  const cells = []; lines.forEach((l, r) => { for (let i = 0; i < l.length; i++) cells.push({ ch: l[i], r, c: i }); });
  const letterCells = cells.filter(c => A.includes(c.ch));
  let cur = letterCells.findIndex(c => !given.has(c.ch)); if (cur < 0) cur = 0;
  const solved = () => used.every(c => guess[c] === A[key.indexOf(c)]);
  // once enough is right the computer fills in the rest, as in the original
  const nearlySolved = () => used.filter(c => guess[c] === A[key.indexOf(c)]).length >= Math.ceil(used.length * 0.8);
  function hint() { const c = used.find(c => guess[c] !== A[key.indexOf(c)]); if (!c) return; guess[c] = A[key.indexOf(c)]; given.add(c); flash[c] = t; ledT = 0.5; hints++; time += 120; sfx.select(); if (solved() || nearlySolved()) finishSolve(); }
  function finishSolve() { used.forEach(c => { guess[c] = A[key.indexOf(c)]; }); over = { win: true, t: 0 }; picker = false; sfx.success(); }
  function setGuess(p) {
    const c = letterCells[cur].ch; if (given.has(c)) { sfx.deny(); return; }
    if (p) { for (const k in guess) if (guess[k] === p && k !== c && !given.has(k)) delete guess[k]; guess[c] = p; } else delete guess[c];
    sfx.tone(500 + A.indexOf(p || 'A') * 25, 0.03); flash[c] = t; ledT = 0.25; if (p) keyFlash = { ch: p, t };
    if (p) for (let i = 1; i <= letterCells.length; i++) { const j = (cur + i) % letterCells.length; if (!guess[letterCells[j].ch]) { cur = j; break; } }
    if (solved() || nearlySolved()) finishSolve();
  }
  function move(dx, dy) {
    const c = letterCells[cur];
    if (dy) { let best = -1, bd = 1e9; letterCells.forEach((o, i) => { if (o.r === c.r + dy) { const d = Math.abs(o.c - c.c); if (d < bd) { bd = d; best = i; } } }); if (best >= 0) cur = best; }
    else cur = (cur + dx + letterCells.length) % letterCells.length;
    sfx.tick();
  }
  // on-screen letter picker for touch players: a QWERTY keyboard that slides up over the chin
  const KROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'], KOFF = [0, 5, 15], KX = 61, KY = 137, KP = 20, KV = 15;
  const KBX = 40, KBY = 120, CLR = { x: 100, y: 182, w: 120, h: 14 };
  const pickAt = (x, y) => { const r = Math.floor((y - KY) / KV); if (r < 0 || r > 2) return null; const c = Math.floor((x - KX - KOFF[r]) / KP); if (c < 0 || c >= KROWS[r].length) return null; return KROWS[r][c]; };
  // frequency chart under the text: one column per cipher letter
  const FX = 30, FP = 10, FB = 151; // left edge, pitch, bar baseline
  const chartAt = (x, y) => { if (y < 124 || y >= 172) return null; const i = Math.floor((x - FX) / FP); return i >= 0 && i < 26 ? A[i] : null; };
  const maxF = Math.max(1, ...used.map(c => freq[c]));
  const clock = s => { const m = Math.floor(s / 60), ss = Math.floor(s % 60); return '00:' + String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0'); };
  const introDone = () => intro >= INTRO;
  const endT = () => over.win ? WIN_END : FAIL_END;
  function finish() { if (finished) return; finished = true; done({ success: over.win, seconds: time, hints }); }
  function overPress() { if (over.t <= 0.6) return; if (over.t < endT()) { over.t = endT(); return; } finish(); }
  const cx0 = (ch, x) => x + 1 + ((5 - (FONT[ch] || FONT['?']).w) >> 1); // centre narrow glyphs in their 6px cell
  // the printout for a successful decode
  const printLines = ['** CIA CRYPTO BRANCH  -  DECRYPT **', 'MSG# ' + msgNo + '    WORK TIME ' + clock(0).slice(3), ''];
  let printBody = null;

  // ---------------- drawing ----------------
  function drawGlass(o) {
    g.drawImage(cyX_glassBG(), cyX_GX, cyX_GY);
    const by = ((t * 30) % (cyX_GH + 40)) - 20; if (by > -7 && by < cyX_GH) { ciaX_clip(cyX_GX, cyX_GY, cyX_GW, cyX_GH); g.drawImage(cyX_beam(), cyX_GX, cyX_GY + (by | 0)); g.restore(); }
    // status line in inverse video with raster gaps
    const sb = o.status;
    if (sb > 0) {
      const w = Math.round(284 * Math.min(1, sb)); rect(18, 8, w, 9, P.GR2); for (let y = 9; y < 17; y += 2) rect(18, y, w, 1, P.GR);
      if (sb >= 1) {
        const title = o.title || 'CRYPTO WORKSTATION  MSG#' + msgNo; text(title, 21, 9, P.K);
        if (!o.title) { textR(clock(time), 298, 9, P.K); if (!over && introDone() && (t % 1) < 0.5) rect(255, 10, 3, 5, P.K); }
      }
    }
    // cipher text and guesses
    const selC = letterCells[cur] && letterCells[cur].ch, live = !over && introDone();
    const shown = o.reveal == null ? cells.length : o.reveal;
    cells.forEach((c, i) => {
      if (i >= shown) return;
      const x = X0 + c.c * CW, y = LY + c.r * LH;
      if (!A.includes(c.ch)) { text(c.ch, cx0(c.ch, x) + 1, y, P.GR); text(c.ch, cx0(c.ch, x), y, P.GR2); return; }
      // decode resolve: letters roll through the alphabet and settle on the plain text
      if (o.resolve != null) {
        const li = letterCells.indexOf(c), s = 0.1 + li / letterCells.length * 0.9, dt = o.resolve - s;
        if (dt >= 0) { const pc = plainOf(c.ch); if (dt < 0.12) rect(x, y - 1, 6, 9, P.GR); text(pc, cx0(pc, x) + 1, y, P.GR); text(pc, cx0(pc, x), y, dt < 0.12 ? P.W : P.GR2); return; }
        if (dt > -0.18) { const rc = A[(li * 7 + (t * 40 | 0)) % 26]; text(rc, cx0(rc, x), y, P.CY); return; }
      }
      const isCur = letterCells[cur] === c, inst = live && c.ch === selC;
      if (inst) {
        if (isCur) { const on = (t * 3 | 0) % 2; rect(x - 1, y - 2, 8, 11, on ? P.BR : P.YE); rect(x, y - 1, 6, 9, on ? P.YE : P.W); }
        else { rect(x, y - 1, 6, 9, P.GR); px(x, y - 1, P.K); px(x + 5, y - 1, P.K); px(x, y + 7, P.K); px(x + 5, y + 7, P.K); }
        text(c.ch, cx0(c.ch, x), y, isCur ? P.K : P.W);
      } else { text(c.ch, cx0(c.ch, x) + 1, y, P.GR); text(c.ch, cx0(c.ch, x), y, P.GR2); }
      const gch = guess[c.ch];
      if (gch) {
        const fl = flash[c.ch] != null && t - flash[c.ch] < 0.3;
        const col = fl ? P.YE : given.has(c.ch) ? P.W : over && !over.win && gch !== plainOf(c.ch) ? P.RD2 : P.CY;
        text(gch, cx0(gch, x), y + 8, col);
      } else rect(x + 1, y + 14, 5, 1, inst ? P.GR2 : P.GR);
      if (isCur && live && !picker && (t * 2.5 | 0) % 2) { if (gch) rect(x, y + 15, 7, 1, P.W); else rect(x + 1, y + 8, 5, 7, P.GR2); }
    });
    if (o.cursorAt != null && (t * 8 | 0) % 2) { const c = cells[Math.min(cells.length - 1, o.cursorAt)]; if (c) rect(X0 + c.c * CW + 7, LY + c.r * LH, 5, 7, P.GR2); }
    // frequency analysis chart
    if (o.chart > 0) drawChart(o.chart, selC, live);
  }
  function drawChart(k, selC, live) {
    ciaX_t3('FREQUENCY ANALYSIS', FX, 122, P.GR); ciaX_t3('ENGLISH: ETAOIN SHRDLU', 289 - 22 * 4, 122, P.GR);
    for (let x = FX - 2; x < 292; x += 3) px(x, 129, P.GR);
    rect(FX - 2, FB + 1, 264, 1, P.GR);
    for (let i = 0; i < 26; i++) {
      const c = A[i], n = freq[c] || 0, cx = FX + i * FP, cc = cx + 4, sel = live && c === selC;
      if (i % 2 === 0) px(cc, FB + 2, P.GR);
      if (n) {
        const h = Math.max(1, Math.round(n / maxF * 17 * k));
        for (let y = 0; y < h; y++) rect(cc - 2, FB - y, 6, 1, sel ? (y & 1 ? P.BR : P.YE) : (y & 1 ? P.GR : P.GR2));
        rect(cc - 2, FB - h + 1, 6, 1, sel ? P.W : P.GR2); px(cc + 3, FB - h + 1, sel ? P.YE : P.W);
        if (k >= 1) { const s = String(n); ciaX_t3(s, cc + 1 - s.length * 2, FB - h - 5, sel ? P.YE : P.GR); }
      }
      if (sel) rect(cx + 1, 153, 7, 9, P.YE);
      text(c, cx + 2 + ((5 - FONT[c].w) >> 1), 154, sel ? P.K : n ? P.GR2 : P.GR);
      const gch = guess[c];
      if (gch && k >= 1) { const fl = flash[c] != null && t - flash[c] < 0.3; text(gch, cx + 2 + ((5 - FONT[gch].w) >> 1), 164, fl ? P.YE : given.has(c) ? P.W : over && !over.win && gch !== plainOf(c) ? P.RD2 : P.CY); }
      else if (n) rect(cx + 2, 171, 5, 1, P.GR);
    }
  }
  function drawCaseLive() {
    g.drawImage(cyX_case(), 0, 0);
    const on = intro >= 1.15 || over;
    rect(246, 186, 4, 2, on ? P.GR2 : P.GR); if (on) px(246, 186, P.W);
    const disk = ledT > 0 ? (t * 30 | 0) % 3 !== 0 : (t % 5) < 0.12 || ((t + 1.3) % 7.3) < 0.08;
    rect(255, 186, 4, 2, disk ? P.RD2 : P.RD); if (disk) px(255, 186, P.YE);
  }
  function drawKeyboard() {
    const e = cyX_ease(pickT), oy = Math.round((1 - e) * 84);
    if (e <= 0) return;
    const selC = letterCells[cur] && letterCells[cur].ch;
    g.drawImage(cyX_kbd(), KBX, KBY + oy);
    text('CODE LETTER ' + selC + ' STANDS FOR...', KBX + 12, KBY + 5 + oy, P.GR2);
    if ((t * 2 | 0) % 2) rect(KBX + 12 + textW('CODE LETTER ' + selC + ' STANDS FOR...') + 2, KBY + 5 + oy, 5, 7, P.GR2);
    const taken = new Set(Object.values(guess)), mine = guess[selC];
    KROWS.forEach((row, r) => { for (let i = 0; i < row.length; i++) {
      const ch = row[i], x = KX + KOFF[r] + i * KP, y = KY + r * KV + oy;
      const pressed = keyFlash && keyFlash.ch === ch && t - keyFlash.t < 0.15;
      const kind = pressed ? 'p' : ch === mine ? 'c' : taken.has(ch) ? 't' : 'n';
      g.drawImage(cyX_cap(kind), x, y + (pressed ? 1 : 0));
      text(ch, x + 9 - FONT[ch].w / 2 | 0, y + 2 + (pressed ? 1 : 0), kind === 't' ? P.G3 : P.K);
    } });
    const cy = CLR.y + oy; rect(CLR.x, cy, CLR.w, CLR.h - 1, P.K); rect(CLR.x + 1, cy + 1, CLR.w - 2, CLR.h - 3, P.RD); rect(CLR.x + 1, cy + 1, CLR.w - 2, 1, P.RD2); rect(CLR.x + 1, cy + CLR.h - 3, CLR.w - 2, 1, P.K);
    textC('CLEAR THIS LETTER', CLR.x + CLR.w / 2, cy + 3, P.W);
  }
  // intro: the desk, a push-in to the monitor, the CRT warming up, the cipher typing on
  function drawIntro() {
    const u = intro;
    if (u < 1.15) {
      const buf = sprite('cyX_buf', 320, 200, () => {});
      drawTo(buf.getContext('2d'), () => cyX_deskScene(t, u > 0.85 ? (u - 0.85) / 0.3 * 0.4 : 0));
      const k = cyX_ease((u - 0.7) / 0.45), k2 = k * k;
      const sx = 120 * k2, sy = 46 * k2, sw = 320 - 240 * k2, sh = 200 - 150 * k2;
      g.drawImage(buf, sx, sy, sw, sh, 0, 0, 320, 200);
      if (u < 0.12) for (let y = 0; y < 200; y += 2) rect(0, y, 320, 1, P.K); // fade in on alternate lines
      return;
    }
    // close-up: warm-up of the tube
    const w = (u - 1.15) / 0.3;
    if (w < 1) {
      rect(cyX_GX, cyX_GY, cyX_GW, cyX_GH, P.K);
      const cxm = cyX_GX + cyX_GW / 2, cym = cyX_GY + cyX_GH / 2;
      if (w < 0.25) { const r = 1 + Math.round(w * 8); rect(cxm - r, cym, r * 2, 1, P.W); px(cxm, cym - 1, P.W); }
      else if (w < 0.55) { const hw = Math.round((w - 0.25) / 0.3 * cyX_GW / 2); rect(cxm - hw, cym, hw * 2, 1, P.W); rect(cxm - hw / 2, cym - 1, hw, 3, P.W); }
      else { const hh = Math.round((w - 0.55) / 0.45 * cyX_GH / 2); dither(cyX_GX, cym - hh, cyX_GW, hh * 2 + 1, P.K, P.GR, 6 - Math.round((w - 0.55) * 8)); rect(cyX_GX, cym - hh, cyX_GW, 1, P.GR2); rect(cyX_GX, cym + hh, cyX_GW, 1, P.GR2); for (let k = 0; k < 40; k++) px(cyX_GX + (cyX_hash(k, t * 60 | 0) * cyX_GW | 0), cym - hh + (cyX_hash(t * 60 | 0, k) * (hh * 2 + 1) | 0), P.W); }
      drawCaseLive(); return;
    }
    // typing the cipher on
    const p = (u - 1.45) / (INTRO - 1.45), n = Math.floor(cells.length * Math.min(1, p * 1.15));
    drawGlass({ status: Math.min(1, p * 4), reveal: n, cursorAt: n, chart: Math.min(1, Math.max(0, p * 1.4 - 0.2)) });
    drawCaseLive();
  }
  function drawWin() {
    const u = over.t;
    if (u < 1.3) {
      drawGlass({ status: 1, title: (u < 1.05 ? 'DECRYPTING' + '...'.slice(0, (t * 4 | 0) % 4) : 'MESSAGE DECODED') + '   MSG#' + msgNo, resolve: u, chart: 1 });
      if (u > 1.05 && (t * 8 | 0) % 2) { const s = 'MESSAGE DECODED'; rect(160 - textW(s) / 2 - 4, 124, textW(s) + 8, 11, P.K); textC(s, 160, 126, P.GR2); }
      drawCaseLive();
      if (u > 1.15) { const k = (u - 1.15) / 0.15; for (let y = 0; y < 200; y += 2) if (cyX_hash(y, 1) < k) rect(0, y, 320, 2, P.K); }
      return;
    }
    // teletype close-up: the page rises out of the platen line by line
    if (!printBody) { printLines[1] = 'MSG# ' + msgNo + '    WORK TIME ' + clock(time).slice(3); printBody = printLines.concat(wrap(plain, 204)); }
    const L = printBody.length, q = Math.max(0, Math.min(L, (u - 1.4) / 1.6 * L)), k = Math.floor(q);
    const adv = Math.round(cyX_ease((u - 3.0) / 0.25) * 58);
    const shake = u > 3.3 && u < 3.45 ? ((t * 40 | 0) % 2 ? 2 : -1) : 0;
    g.drawImage(cyX_printBG(), 0, 0);
    ciaX_clip(0, 0, 320, 140);
    const top = 134 - (Math.min(k, L - 1)) * 10 - adv - 6 + shake;
    rect(52, 0, 216, 140, P.W); dither(52, 0, 216, 140, P.W, P.YE, 1); rect(52, 0, 2, 140, P.G3); rect(266, 0, 2, 140, P.G3);
    for (let yy = 4 - ((top % 20) + 20) % 20; yy < 140; yy += 20) px(56, yy + 10, P.G3);
    for (let i = 0; i <= Math.min(k, L - 1); i++) {
      const s = printBody[i], y = top + 6 + i * 10; if (y < -9) continue;
      const part = i < k ? s : s.slice(0, Math.floor((q - k) * s.length));
      text(part, i < 2 ? 160 - textW(s) / 2 : 60, y, i < 2 ? P.BL : P.K);
      if (i === 0) rect(60, y + 9, 200, 1, P.BL);
    }
    if (u >= 3.3) cyX_drawStamp(150, top + 6 + L * 10 + 4);
    g.restore();
    rect(0, 138, 320, 2, P.K); // shadow under the bail
    g.drawImage(cyX_printBody(), 0, 136);
    // print head riding the platen
    const px0 = k < L ? 60 + Math.min(200, textW(printBody[Math.min(k, L - 1)].slice(0, Math.floor((q - k) * printBody[Math.min(k, L - 1)].length)))) : 60 + ((u * 40) % 200);
    rect(px0 - 6, 128, 14, 12, P.K); rect(px0 - 5, 129, 12, 10, P.G1); rect(px0 - 5, 129, 12, 1, P.G3); rect(px0 - 5, 136, 12, 2, P.RD); px(px0, 139, P.W);
    // paper bail with rollers
    rect(40, 124, 240, 2, P.G3); rect(40, 124, 240, 1, P.W); for (const rx of [96, 216]) { rect(rx, 123, 8, 4, P.K); rect(rx + 1, 124, 6, 2, P.W); }
    if (u >= WIN_END) { rect(98, 186, 124, 11, P.K); rect(99, 187, 122, 9, P.G1); if ((t * 2 | 0) % 2 || true) textC('Press a key', 160, 188, P.W); }
  }
  function drawFail() {
    const u = over.t - 1;
    if (u < 0.55) {
      drawGlass({ status: 1, title: 'DECODING ABANDONED   MSG#' + msgNo, chart: 1 });
      // static swells over the picture, with rolling tear lines
      const n = Math.round(u / 0.55 * 900);
      for (let i = 0; i < n; i++) { const h = cyX_hash(i, t * 60 | 0); px(cyX_GX + (h * cyX_GW | 0), cyX_GY + (cyX_hash(t * 60 | 0, i) * cyX_GH | 0), h < 0.3 ? P.W : h < 0.6 ? P.G3 : P.G1); }
      for (let k = 0; k < 3; k++) { const y = cyX_GY + ((t * 170 + k * 57) % cyX_GH | 0); rect(cyX_GX, y, cyX_GW, 1, P.G3); }
      drawCaseLive(); return;
    }
    rect(cyX_GX, cyX_GY, cyX_GW, cyX_GH, P.K);
    const cxm = cyX_GX + cyX_GW / 2, cym = cyX_GY + cyX_GH / 2;
    if (u < 0.95) { // the tube collapses to a line, then to a dot
      const s = (u - 0.55) / 0.4;
      if (s < 0.5) { const hh = Math.round((1 - s * 2) * cyX_GH / 2); dither(cyX_GX, cym - hh, cyX_GW, hh * 2 + 1, P.K, P.G3, 8); rect(cyX_GX, cym, cyX_GW, 1, P.W); }
      else { const hw = Math.round((1 - (s - 0.5) * 2) * cyX_GW / 2); rect(cxm - hw, cym, hw * 2 + 1, 1, P.W); }
    } else if (u < 1.2) { if ((t * 20 | 0) % 2) { rect(cxm - 1, cym - 1, 3, 3, P.W); px(cxm - 2, cym, P.G3); px(cxm + 2, cym, P.G3); } }
    else {
      g.drawImage(cyX_glassBG(), cyX_GX, cyX_GY); g.drawImage(cyX_refl(), 196, cyX_GY + cyX_GH - 90);
      const k = Math.min(1, (u - 1.2) / 0.3);
      if (k >= 0.3) {
        textC('DECODING ABANDONED', 160, 56, P.RD2); rect(100, 66, 120, 1, P.RD);
        para('The message goes back in the pile for the analysts at Langley.', 60, 76, 200, P.RD2, 10);
        if (u + 1 >= FAIL_END) textC('Press a key', 160, 140, P.RD);
      }
      if (k < 1) for (let i = 0; i < 300 * (1 - k); i++) px(cyX_GX + (cyX_hash(i, t * 60 | 0) * cyX_GW | 0), cyX_GY + (cyX_hash(t * 60 | 0, i + 9) * cyX_GH | 0), P.G1);
    }
    drawCaseLive();
  }

  return {
    typing: true,
    update(dt) {
      t += dt; if (ledT > 0) ledT -= dt;
      if (!introDone()) {
        const was = intro; intro += dt;
        if (intro < 0.7 && (intro * 14 | 0) !== (was * 14 | 0)) sfx.tone(1100 + ((intro * 97) % 5 | 0) * 90, 0.012, 'square', 0.02);
        if (was < 1.15 && intro >= 1.15) sfx.tone(60, 0.35, 'sawtooth', 0.05, 40);
        if (intro > 1.45 && (intro * 30 | 0) !== (was * 30 | 0) && (intro * 30 | 0) % 2 === 0) sfx.tick();
        return;
      }
      pickT = Math.max(0, Math.min(1, pickT + (picker && !over ? dt : -dt) * 6));
      if (over) {
        const was = over.t; over.t += dt; const u = over.t;
        if (over.win) {
          if (u > 1.4 && u < 3.05 && (u * 25 | 0) !== (was * 25 | 0)) sfx.tone(900 + ((u * 131) % 4 | 0) * 120, 0.01, 'square', 0.02);
          if (was < 3.3 && u >= 3.3) { sfx.noise(0.08, 0.35, 150); sfx.tone(90, 0.1, 'square', 0.06); }
        } else {
          if (was < 1.02 && u >= 1.02) sfx.hiss();
          if (was < 1.55 && u >= 1.55) sfx.tone(300, 0.3, 'sawtooth', 0.04, -240);
        }
        return;
      }
      time += dt;
    },
    onChar(ch) { if (!introDone()) { intro = INTRO; return; } if (over) { overPress(); return; } picker = false; setGuess(ch); },
    onKey(k) {
      if (!introDone()) { intro = INTRO; return; }
      if (over) { if (k === 'select' || k === 'fire' || k === 'menu') overPress(); return; }
      if (k === 'left') move(-1, 0); else if (k === 'right') move(1, 0); else if (k === 'up') move(0, -1); else if (k === 'down') move(0, 1);
      else if (k === 'select' || k === 'fire') picker = !picker;
      else if (k === 'action' || k === 'alt' || k === 'alt2') hint();
      else if (k === 'menu') { if (picker) picker = false; else { over = { win: false, t: 1, gaveUp: true }; } }
    },
    onTap(x, y) {
      if (!introDone()) { intro = INTRO; return; }
      if (over) { overPress(); return; }
      if (picker) {
        const p = pickAt(x, y); if (p) { picker = false; setGuess(p); return; }
        if (y >= CLR.y && y < CLR.y + CLR.h && x >= CLR.x && x < CLR.x + CLR.w) { picker = false; setGuess(''); return; }
        picker = false; return;
      }
      if (y >= 182 && x >= 264) { over = { win: false, t: 1, gaveUp: true }; return; }
      const fc = chartAt(x, y);
      if (fc) { const i = letterCells.findIndex(c => c.ch === fc); if (i >= 0) { cur = i; picker = true; sfx.tick(); } return; }
      letterCells.forEach((c, i) => { const cx = X0 + c.c * CW, cy = LY + c.r * LH; if (x >= cx - 1 && x < cx + CW && y >= cy - 2 && y < cy + LH - 2) { cur = i; picker = true; sfx.tick(); } });
    },
    draw() {
      if (!introDone()) { drawIntro(); return; }
      if (over && over.win) { drawWin(); return; }
      if (over) { drawFail(); return; }
      drawGlass({ status: 1, chart: 1 - cyX_ease(pickT) });
      drawCaseLive();
      drawKeyboard();
    },
  };
}
