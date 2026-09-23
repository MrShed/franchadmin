// ===================================================================
// ART: suspect portraits, world map, city skylines, agent portrait
// ===================================================================

// ---------- dossier photo, 26x32 ----------
function drawFace(f, x, y, w = 26, h = 32) {
  const key = 'face' + JSON.stringify(f) + w;
  const c = sprite(key, 26, 32, () => {
    dither(0, 0, 26, 32, f.bg, P.K, 5);
    // shoulders / jacket
    rect(2, 26, 22, 6, f.jacket); rect(4, 24, 18, 3, f.jacket);
    rect(10, 24, 6, 8, P.W); rect(12, 25, 2, 7, f.sex === 'm' ? f.tie : P.W);
    if (f.sex === 'f') { rect(10, 24, 6, 4, f.skin); }
    // neck
    rect(10, 20, 6, 5, f.skin); rect(10, 22, 6, 1, P.SK3);
    // head
    const jw = [0, 1, -1][f.jaw];
    rect(7, 6, 12, 14, f.skin); rect(8 + (jw < 0 ? 1 : 0), 20, 10 - (jw < 0 ? 2 : 0), 2, f.skin); rect(6, 10, 1, 6, f.skin); rect(19, 10, 1, 6, f.skin);
    rect(5, 11, 1, 3, f.skin); rect(20, 11, 1, 3, f.skin); // ears
    rect(18, 7, 1, 13, P.SK3); rect(8, 21, 10, 1, P.SK3);
    // hair
    const hc = f.hair;
    if (f.hairStyle === 0) { rect(7, 4, 12, 4, hc); rect(6, 6, 2, 5, hc); rect(18, 6, 2, 5, hc); }
    else if (f.hairStyle === 1) { rect(8, 5, 10, 2, hc); rect(7, 6, 1, 3, hc); rect(18, 6, 1, 3, hc); } // receding
    else if (f.hairStyle === 2) { rect(6, 3, 14, 5, hc); rect(6, 7, 2, 7, hc); rect(18, 7, 2, 7, hc); rect(9, 7, 4, 1, hc); } // full
    else if (f.hairStyle === 3) { rect(7, 3, 12, 4, hc); rect(7, 6, 3, 2, hc); rect(12, 6, 2, 1, hc); } // side part
    else if (f.hairStyle === 4) { rect(5, 3, 16, 5, hc); rect(4, 7, 3, 17, hc); rect(19, 7, 3, 17, hc); } // long
    else { rect(6, 3, 14, 5, hc); rect(5, 7, 3, 10, hc); rect(18, 7, 3, 10, hc); rect(9, 2, 8, 2, hc); } // bob
    if (f.hat) { rect(4, 5, 18, 2, P.D2); rect(7, 0, 12, 6, P.D2); rect(7, 4, 12, 1, P.RD); }
    // eyes & brows
    rect(9, 11, 3, 1, hc === P.G3 ? P.G2 : P.K); rect(14, 11, 3, 1, hc === P.G3 ? P.G2 : P.K);
    rect(9, 13, 3, 1, P.W); rect(14, 13, 3, 1, P.W); px(10 + f.eyes, 13, P.K); px(15 + f.eyes, 13, P.K);
    if (f.glasses === 1) { frame(8, 12, 5, 3, P.K); frame(13, 12, 5, 3, P.K); }
    if (f.glasses === 2) { rect(8, 12, 10, 3, P.K); px(10, 13, P.G2); px(15, 13, P.G2); }
    // nose / mouth
    rect(12, 14, 2, 3, P.SK3); px(13, 14, f.skin);
    rect(11, 18, 5, 1, f.sex === 'f' ? P.RD : P.SK3);
    if (f.beard === 1) { rect(10, 17, 7, 1, hc); }
    if (f.beard === 2) { rect(8, 17, 10, 5, hc); rect(11, 18, 5, 1, P.SK3); }
    if (f.sex === 'f') { px(8, 15, P.PK); px(17, 15, P.PK); }
  });
  g.drawImage(c, x, y, w, h);
}
function drawUnknownFace(x, y) {
  dither(x, y, 26, 32, P.G1, P.K, 6);
  rect(x + 8, y + 7, 10, 13, P.G2); rect(x + 5, y + 24, 16, 8, P.G2); rect(x + 10, y + 20, 6, 4, P.G2);
  textC('?', x + 13, y + 9, P.G4);
}

// ---------- world map ----------
const LAND = [
  // North America
  [[-165, 62], [-160, 70], [-140, 70], [-120, 69], [-95, 70], [-80, 73], [-65, 62], [-60, 55], [-56, 52], [-67, 45], [-70, 42], [-76, 38], [-76, 35], [-81, 31], [-80, 26], [-82, 25], [-84, 30], [-90, 29], [-97, 27], [-97, 22], [-92, 18], [-87, 21], [-88, 16], [-83, 15], [-83, 10], [-78, 8], [-80, 8], [-86, 12], [-92, 14], [-105, 20], [-110, 23], [-112, 30], [-117, 32], [-124, 40], [-124, 48], [-130, 55], [-140, 60], [-152, 59], [-158, 56], [-165, 55]],
  [[-55, 78], [-20, 78], [-20, 70], [-40, 62], [-50, 61], [-54, 67]], // Greenland
  [[-78, 8], [-72, 12], [-62, 11], [-52, 5], [-35, -5], [-39, -14], [-41, -22], [-48, -26], [-53, -34], [-58, -38], [-65, -41], [-68, -50], [-70, -54], [-74, -50], [-73, -40], [-71, -30], [-70, -18], [-76, -14], [-81, -5], [-80, 0], [-77, 4]],
  // Eurasia
  [[-9, 38], [-9, 43], [-2, 43.5], [-4, 48], [2, 51], [5, 53], [8, 54], [14, 54], [20, 55], [22, 58], [24, 60], [30, 60], [33, 66], [40, 67], [44, 68], [55, 68], [60, 70], [70, 73], [80, 73], [100, 78], [140, 78], [180, 72], [190, 66], [172, 62], [163, 60], [157, 51], [156, 57], [145, 59], [135, 55], [140, 48], [135, 43], [130, 42], [129, 35], [126, 35], [126, 37], [125, 40], [121, 40], [122, 37], [119, 35], [121, 31], [122, 28], [119, 25], [114, 22], [108, 21], [106, 17], [109, 12], [106, 10], [100, 13], [101, 6], [104, 1.5], [101, 3], [98, 8], [97, 17], [92, 22], [88, 22], [80, 15], [77, 8], [73, 17], [70, 22], [66, 25], [58, 24], [59, 22], [52, 16], [43, 12], [39, 20], [35, 28], [34, 31], [36, 36], [30, 36], [27, 37], [26, 40], [23, 40], [22, 37], [20, 40], [19, 42], [13, 45], [12, 44], [16, 41], [18, 40], [16, 38], [15, 40], [11, 42], [9, 44], [7, 44], [3, 43], [0, 39], [-2, 37], [-6, 36]],
  [[5, 58], [6, 62], [13, 66], [18, 70], [28, 71], [31, 69], [29, 65], [25, 65], [21, 63], [19, 60], [16, 56], [12, 56], [10, 59], [8, 58]], // Scandinavia
  // Africa
  [[-17, 21], [-17, 15], [-15, 11], [-8, 5], [-3, 5], [5, 6], [9, 4], [10, 0], [13, -6], [12, -17], [15, -27], [18, -34], [22, -34], [27, -33], [32, -28], [35, -22], [40, -15], [40, -5], [43, 0], [48, 5], [51, 11], [44, 11], [38, 18], [35, 24], [33, 29], [32, 31], [25, 32], [20, 31], [15, 32], [11, 34], [10, 37], [3, 37], [-2, 35], [-6, 36], [-10, 30], [-13, 27]],
  [[44, -25], [47, -25], [50, -15], [49, -12], [44, -16]],
  [[-5, 50], [1, 51], [1.7, 53], [0, 54], [-2, 56], [-2, 58], [-5, 58.6], [-6, 57], [-5, 55], [-3, 54], [-4.5, 52]], // Britain
  [[-10, 52], [-6, 52], [-6, 55], [-8, 55], [-10, 54]],
  [[-24, 64], [-22, 66], [-15, 66.5], [-13, 65], [-18, 63.5]],
  [[130, 31], [132, 34], [135, 34], [140, 35], [141, 38], [142, 41], [140, 41.5], [139, 38], [137, 37], [133, 35.5], [130, 33.5]], // Japan
  [[140, 42], [145, 43], [142, 45.5], [140, 43.5]],
  [[114, -22], [114, -34], [118, -35], [123, -34], [131, -31], [137, -33], [140, -38], [147, -39], [150, -37], [153, -30], [153, -25], [146, -18], [145, -14], [142, -11], [141, -17], [136, -12], [130, -12], [125, -14], [122, -18]],
  [[109, 1], [111, -3], [116, -4], [119, 0], [117, 7], [113, 3]], [[95, 5], [98, 4], [106, -6], [104, -5], [100, -1]],
  [[131, -1], [141, -3], [150, -10], [142, -9], [138, -8], [132, -4]], [[120, 18], [122, 18], [126, 7], [124, 7], [121, 13]],
  [[-85, 22], [-80, 23], [-74, 20], [-77, 20], [-82, 22]], [[-74, 20], [-68, 19.5], [-69, 18], [-74, 18]],
  [[172, -35], [178, -38], [175, -41.5], [172, -41]], [[172, -41], [174, -42], [171, -46], [167, -46], [168, -44]],
];
const WATER = [
  [[-95, 60], [-80, 63], [-77, 55], [-82, 52], [-92, 57]], // Hudson Bay
  [[47, 45], [53, 47], [54, 42], [53, 37], [49, 38], [47, 42]], // Caspian
  [[28, 41], [28, 45], [33, 46], [38, 47], [41, 42], [36, 41.5], [30, 41]], // Black Sea
];
const DESERTS = [[10, 23, 16], [30, 24, 10], [46, 22, 9], [60, 30, 7], [100, 42, 11], [80, 40, 7], [132, -25, 10], [20, -24, 6], [-112, 32, 6], [-70, -24, 4]];
function vnoise(x, y) { const h = (i, j) => { let n = Math.imul(i, 374761393) + Math.imul(j, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }; const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; }
const MAP = { x0: 0, y0: 8, w: 320, h: 104, lon0: -170, lat0: 78 };
function mapXY(lon, lat) { if (lon < MAP.lon0) lon += 360; return [MAP.x0 + (lon - MAP.lon0) * 0.889, MAP.y0 + (MAP.lat0 - lat) * 0.775]; }
let mapCanvas = null;
function buildMap() {
  const w = MAP.w, h = MAP.h + MAP.y0 + 4;
  const m = document.createElement('canvas'); m.width = w; m.height = h; const mc = m.getContext('2d');
  mc.fillStyle = '#fff';
  const path = poly => { mc.beginPath(); poly.forEach(([lo, la], i) => { const [x, y] = mapXY(lo, la); i ? mc.lineTo(x, y) : mc.moveTo(x, y); }); mc.closePath(); mc.fill(); };
  LAND.forEach(path); mc.fillStyle = '#000'; WATER.forEach(path);
  const d = mc.getImageData(0, 0, w, h).data; const land = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4] > 127;
  mapCanvas = document.createElement('canvas'); mapCanvas.width = w; mapCanvas.height = h;
  drawTo(mapCanvas.getContext('2d'), () => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const lat = MAP.lat0 - (y - MAP.y0) / 0.775, lon = MAP.lon0 + x / 0.889;
      const b = BAYER[(y & 3) * 4 + (x & 3)];
      if (land(x, y)) {
        const coast = !land(x - 1, y) || !land(x + 1, y) || !land(x, y - 1) || !land(x, y + 1);
        const n = vnoise(lon / 9, lat / 9) * 0.6 + vnoise(lon / 3, lat / 3) * 0.4;
        let dz = 0; for (const [dl, dt, r] of DESERTS) { const dd = ((lon - dl) ** 2 + (lat - dt) ** 2) / (r * r); dz += Math.exp(-dd); }
        dz += (n - 0.5) * 0.6;
        const tl = lat + (n - 0.5) * 8;
        let col;
        if (tl > 66) col = b < 10 ? P.G5 : P.G4;
        else if (tl > 60) col = b < 7 ? P.G4 : P.OL;
        else if (dz > 0.62) col = b < 5 ? P.BR3 : P.TN;
        else if (dz > 0.42) col = b < 8 ? P.TN : P.OL;
        else if (tl > 50) col = b < 9 ? P.DG : P.GR;
        else if (Math.abs(lat) < 10 + n * 6) col = b < 11 ? P.DG : P.GR;
        else col = b < 5 ? P.DG : P.GR;
        px(x, y, coast ? P.OL : col);
      } else {
        let near = false; for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) if (land(x + dx, y + dy)) { near = true; break; }
        px(x, y, near ? (b < 8 ? P.BL : P.NV) : (b < 2 ? P.BL : P.NV));
      }
    }
    // graticule every 30 degrees
    for (let lo = -150; lo <= 180; lo += 30) { const [x] = mapXY(lo, 0); for (let y = MAP.y0; y < h; y += 3) if (!land(x | 0, y)) px(x, y, P.BL2); }
    for (const la of [60, 30, 0, -30]) { const [, y] = mapXY(0, la); for (let x = 0; x < w; x += 3) if (!land(x, y | 0)) px(x, y, la === 0 ? P.BL3 : P.BL2); }
  });
}

// ---------- agent portrait for the title / files ----------
function drawAgent(sex, x, y) {
  drawFace({ sex, skin: P.SK, hair: sex === 'f' ? P.BR2 : P.BR, hairStyle: sex === 'f' ? 5 : 3, beard: 0, glasses: 0, hat: false, jacket: P.G1, tie: P.NV, eyes: 0, bg: P.BL, jaw: 0 }, x, y, 52, 64);
}


// ===================================================================
// EGA SCENE ART - painted in code, 16 colours, after the original's pictures
// ===================================================================
function brick(x, y, w, h, c1 = P.BR, c2 = P.G1) {
  rect(x, y, w, h, c1); dither(x, y, w, h, 'rgba(0,0,0,0)', c2, 6);
  for (let yy = 0; yy < h; yy += 3) { rect(x, y + yy, w, 1, P.K); for (let xx = ((yy / 3) % 2) * 3; xx < w; xx += 6) px(x + xx, y + yy + 1, P.K); }
}
function person(x, y, shirt, legs = P.K, skin = P.SK, hair = P.K, h = 16) {
  const s = h / 16;
  rect(x - 1, y - 16 * s, 3, 3 * s, skin); rect(x - 1, y - 16 * s, 3, 1, hair);
  rect(x - 2, y - 13 * s, 5, 7 * s, shirt); rect(x - 2, y - 6 * s, 2, 6 * s, legs); rect(x + 1, y - 6 * s, 2, 6 * s, legs);
}
function sky(x, y, w, h, night) { if (night) { rect(x, y, w, h, P.K); for (let i = 0; i < 26; i++) px(x + (i * 53) % w, y + (i * 29) % Math.max(1, h), i % 4 ? P.G1 : P.W); } else vgrad(x, y, w, h, [P.BL, P.BL2, P.CY]); }
const isNight = () => { const h = hourOf(game.t || 0); return h < 6 || h >= 19; };
function sidewalk(x, y, w, h) { rect(x, y, w, h, P.G1); dither(x, y, w, h, P.G1, P.G3, 6); }

// ---------- the Chief ----------
function chiefArt(t) {
  rect(0, 0, W, H, P.K);
  for (let x = 0; x < W; x += 5) { rect(x, 0, 3, 120, P.TL); rect(x + 3, 0, 1, 120, P.CY); rect(x + 4, 0, 1, 120, P.K); }
  rect(92, 0, 136, 100, P.CY); dither(92, 0, 136, 56, P.CY, P.W, 3);
  for (const [cx, cy] of [[118, 14], [168, 30], [205, 10]]) { dither(cx - 16, cy - 5, 32, 10, 'rgba(0,0,0,0)', P.W, 9); }
  frame(92, 0, 136, 100, P.G3);
  rect(44, 6, 2, 118, P.YE); g.fillStyle = P.RD; g.beginPath(); g.moveTo(46, 10); g.lineTo(80, 14); g.lineTo(74, 90); g.lineTo(46, 96); g.fill(); dither(46, 10, 34, 86, 'rgba(0,0,0,0)', P.RD2, 3); for (let y = 12; y < 94; y += 3) px(46 + (y > 50 ? 26 : 32), y, P.YE);
  rect(276, 6, 2, 118, P.YE); g.fillStyle = P.BL; g.beginPath(); g.moveTo(276, 10); g.lineTo(244, 16); g.lineTo(250, 92); g.lineTo(276, 98); g.fill(); for (const [sx, sy] of [[258, 34], [266, 50], [256, 64], [264, 24], [268, 76]]) { px(sx, sy, P.YE); px(sx - 1, sy, P.YE); px(sx + 1, sy, P.YE); px(sx, sy - 1, P.YE); px(sx, sy + 1, P.YE); }
  rect(118, 40, 84, 70, P.K); rect(122, 36, 76, 8, P.G1);
  rect(108, 74, 104, 40, P.G1); dither(108, 74, 104, 40, P.G1, P.G3, 3);
  rect(148, 74, 24, 36, P.W); rect(157, 76, 6, 30, P.RD); rect(155, 74, 10, 3, P.RD);
  rect(146, 62, 28, 14, P.SK); disc(160, 52, 15, P.SK); dither(146, 38, 28, 12, 'rgba(0,0,0,0)', P.RD, 4); rect(145, 48, 3, 10, P.G3); rect(172, 48, 3, 10, P.G3);
  rect(151, 52, 6, 2, P.K); rect(163, 52, 6, 2, P.K); rect(152, 53, 3, 1, P.W); rect(164, 53, 3, 1, P.W); rect(159, 55, 2, 6, P.RD); rect(154, 65, 12, 1, P.RD);
  rect(0, 106, W, 41, P.BR); for (let y = 108; y < 146; y += 4) line(0, y, W, y + 3, P.RD); dither(0, 106, W, 41, 'rgba(0,0,0,0)', P.K, 2); rect(0, 106, W, 2, P.YE);
  rect(126, 104, 68, 10, P.G3); for (let i = 0; i < 13; i++) rect(128 + i * 5, 106, 3, 2, P.W); rect(126, 99, 14, 8, P.SK); rect(180, 99, 14, 8, P.SK);
  rect(28, 112, 30, 24, P.K); frame(28, 112, 30, 24, P.W); rect(33, 116, 20, 16, P.G1); line(30, 134, 22, 142, P.K);
  rect(236, 110, 46, 4, P.W); rect(238, 114, 44, 3, P.G3); line(212, 110, 222, 92, P.YE); rect(208, 110, 10, 3, P.K);
  rect(241, 130, 61, 12, P.YE); rect(241, 130, 61, 1, P.W); rect(241, 141, 61, 1, P.G1); rect(301, 130, 1, 12, P.G1);
  disc(250, 136, 4, P.G1); disc(250, 136, 3, P.TL); px(249, 135, P.W); text('CHIEF', 268, 133, P.G1); text('CHIEF', 267, 132, P.K);
  rect(0, 147, W, 53, P.K); rect(0, 147, W, 1, P.W); rect(0, 199, W, 1, P.W); rect(0, 147, 1, 53, P.W); rect(319, 147, 1, 53, P.W);
}

// ---------- title / character art ----------
function drawMaxFigure(cx, base, sex, lit) {
  const c = lit ? P.K : P.G1, sk = lit ? P.W : P.G3;
  if (sex === 'm') {
    disc(cx, base - 164, 7, c); rect(cx - 4, base - 160, 8, 8, sk); rect(cx - 5, base - 170, 10, 4, c);
    g.fillStyle = c; g.beginPath(); g.moveTo(cx - 14, base - 150); g.lineTo(cx + 14, base - 150); g.lineTo(cx + 12, base - 80); g.lineTo(cx - 12, base - 80); g.fill();
    rect(cx - 3, base - 150, 6, 20, sk); rect(cx - 1, base - 148, 2, 16, c);
    rect(cx - 12, base - 80, 10, 80, c); rect(cx + 2, base - 80, 10, 80, c); rect(cx - 19, base - 146, 6, 50, c); rect(cx + 13, base - 146, 6, 46, c); rect(cx + 13, base - 100, 6, 5, sk);
  } else {
    disc(cx, base - 166, 7, c); rect(cx - 8, base - 166, 16, 22, c); rect(cx - 3, base - 164, 6, 8, sk);
    g.fillStyle = c; g.beginPath(); g.moveTo(cx - 10, base - 148); g.lineTo(cx + 10, base - 148); g.lineTo(cx + 8, base - 110); g.lineTo(cx + 14, base - 20); g.lineTo(cx - 14, base - 20); g.lineTo(cx - 8, base - 110); g.fill();
    for (let i = 0; i < 40; i++) px(cx - 8 + (i * 7) % 16, base - 140 + (i * 13) % 110, lit ? P.G3 : P.G1);
    rect(cx - 6, base - 20, 3, 20, sk); rect(cx + 3, base - 20, 3, 20, sk); rect(cx - 16, base - 144, 5, 44, sk); rect(cx + 11, base - 144, 5, 44, sk);
  }
}
function trainingArt(i, x, y, w, h, t) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const cx = x + w / 2;
  if (i === 0) { rect(x, y, w, h, P.RD); rect(cx - 16, y + 6, 32, h - 6, P.K); dither(cx - 16, y + 6, 32, h - 6, P.K, P.RD, 2); disc(cx, y + 22, 7, P.K); rect(cx - 5, y + 18, 10, 4, P.BR); rect(cx - 3, y + 22, 6, 5, P.SK); rect(cx - 10, y + 30, 20, 44, P.K); rect(cx - 10, y + 74, 8, 50, P.K); rect(cx + 2, y + 74, 8, 50, P.K); rect(cx + 10, y + 34, 20, 4, P.K); rect(cx + 26, y + 31, 7, 4, P.G3); rect(cx - 14, y + 34, 5, 26, P.K); px(cx + 33, y + 31, P.W); }
  else if (i === 1) { rect(x, y, w, h, P.K); rect(x, y, w, 60, P.BL); dither(x, y + 40, w, 20, P.BL, P.K, 8); for (let k = 0; k < 14; k++) px(x + (k * 37) % w, y + (k * 23) % 40, P.W); disc(x + 14, y + 14, 3, P.YE); for (let k = 0; k < 44; k += 2) { px(x + 4 + k, y + 120 - k, P.MG); px(x + 12 + k, y + 124 - k, P.PK); } g.save(); g.translate(cx + 6, y + 80); g.rotate(-0.6); rect(-22, -6, 44, 12, P.RD2); rect(-14, -10, 22, 5, P.RD); rect(-8, -9, 10, 3, P.CY); rect(-22, 4, 9, 4, P.K); rect(12, 4, 9, 4, P.K); rect(20, -4, 3, 3, P.YE); g.restore(); for (let k = 0; k < 6; k++) line(cx + 20, y + 94, cx + 34 + k * 3, y + 116, P.YE); }
  else if (i === 2) { rect(x, y, w, h, P.G1); dither(x, y, w, 70, P.G1, P.G3, 4); rect(x + 44, y + 6, 22, 26, P.W); frame(x + 44, y + 6, 22, 26, P.K); for (let k = 0; k < 5; k++) rect(x + 47, y + 10 + k * 4, 16, 1, P.G1); disc(cx - 4, y + 40, 9, P.SK); rect(cx - 14, y + 30, 20, 8, P.K); dither(cx - 14, y + 28, 22, 14, 'rgba(0,0,0,0)', P.W, 4); rect(cx - 16, y + 50, 26, 40, P.W); rect(cx + 6, y + 64, 16, 5, P.W); rect(x, y + 88, w, h - 88, P.K); rect(x + 4, y + 88, w - 8, 5, P.G3); rect(cx + 10, y + 70, 6, 18, P.G3); rect(cx + 6, y + 66, 14, 5, P.K); }
  else { rect(x, y, w, h, P.K); for (let k = 0; k < 7; k++) { rect(x + w - 22, y + 6 + k * 16, 20, 12, P.G1); rect(x + w - 20, y + 8 + k * 16, 16, 2, P.G3); } rect(x + 2, y + 20, 44, 70, P.BL); dither(x + 2, y + 20, 44, 70, P.BL, P.K, 6); dither(x + 2, y + 30, 40, 40, 'rgba(0,0,0,0)', P.BL2, 3); line(x + 20, y + 40, x + w - 20, y + 30, P.RD2); line(x + 24, y + 50, x + w - 22, y + 44, P.RD2); line(x + 18, y + 60, x + w - 22, y + 60, P.W); }
  g.restore();
}

// ---------- the small framed city picture on the city menu ----------
function cityPic(x, y, w, h, c) {
  const night = isNight(); sky(x, y, w, h, night);
  const base = y + h - 8, cx = x + w / 2, stone = night ? P.G3 : P.W;
  rect(x, base, w, 8, P.G1); dither(x, base, w, 8, P.G1, P.G3, 4);
  const trees = () => { for (const tx of [x + 12, x + w - 14]) { disc(tx, base - 12, 9, P.GR); dither(tx - 9, base - 21, 18, 18, 'rgba(0,0,0,0)', P.GR2, 3); rect(tx - 1, base - 4, 2, 4, P.BR); } };
  switch (c.id) {
    case 'WAS': trees(); rect(cx - 40, base - 12, 80, 12, stone); for (let i = -38; i < 38; i += 4) rect(cx + i, base - 11, 2, 10, P.G3); rect(cx - 16, base - 20, 32, 8, stone); disc(cx, base - 22, 10, stone); rect(cx - 10, base - 22, 20, 2, P.G3); rect(cx - 1, base - 36, 2, 5, stone); break;
    case 'ROM': rect(cx - 36, base - 26, 72, 26, P.TN); for (let r = 0; r < 3; r++) for (let i = -34; i < 34; i += 6) rect(cx + i, base - 22 + r * 8, 3, 5, P.BR); break;
    case 'PAR': for (let yy = 0; yy < 38; yy++) { const hw = yy > 26 ? 4 + (yy - 26) * 1.3 : 1 + yy * 0.12; rect(cx - hw, base - 38 + yy, hw * 2, 1, P.G1); } break;
    case 'LON': rect(cx - 4, base - 36, 8, 36, P.TN); disc(cx, base - 26, 3, P.W); rect(cx + 6, base - 14, 44, 14, P.TN); for (let i = 0; i < 40; i += 6) rect(cx + 8 + i, base - 18, 2, 4, P.TN); break;
    case 'CAI': for (const [o, s] of [[-24, 26], [10, 20], [36, 12]]) for (let yy = 0; yy < s; yy++) rect(cx + o - yy, base - s + yy, yy * 2, 1, yy % 3 ? P.YE : P.BR); break;
    case 'IST': case 'DAM': case 'BGW': case 'AMM': case 'BEY': case 'TRP': case 'THR': disc(cx, base - 14, 14, stone); rect(cx - 16, base - 14, 32, 14, stone); for (const o of [-24, 24]) { rect(cx + o - 1, base - 34, 3, 34, stone); rect(cx + o - 1, base - 37, 3, 3, P.TL); } break;
    default: { let s = c.id.charCodeAt(0) * 7; for (let bx = x + 4; bx < x + w - 8;) { s = (s * 16807) % 2147483647; const bw = 10 + s % 12, bh = 12 + (s >> 4) % 26; rect(bx, base - bh, bw, bh, [P.G3, P.W, P.TN, P.CY][s % 4]); for (let wy = base - bh + 3; wy < base - 3; wy += 4) for (let wx = bx + 2; wx < bx + bw - 2; wx += 3) px(wx, wy, night ? P.YE : P.BL); bx += bw + 2; } if (c.region === 'americas') trees(); }
  }
}

// ---------- CIA floors ----------
function ciaLobbyArt(x, y, w, h, t) {
  rect(x, y, w, h, P.G3); dither(x, y, w, h, P.G3, P.W, 3); rect(x, y + 150, w, 50, P.BR); dither(x, y + 150, w, 50, P.BR, P.K, 4);
  rect(x + 16, y + 30, 36, 50, P.BL); frame(x + 16, y + 30, 36, 50, P.K); rect(x + 96, y + 30, 36, 50, P.BL); frame(x + 96, y + 30, 36, 50, P.K);
  disc(x + w / 2, y + 60, 18, P.BL); disc(x + w / 2, y + 60, 15, P.W); textC('CIA', x + w / 2, y + 57, P.BL);
  // contact in a trenchcoat
  const cx = x + 90; disc(cx, y + 104, 7, P.SK); rect(cx - 7, y + 98, 14, 4, P.BR); rect(cx - 12, y + 112, 24, 70, P.G3); dither(cx - 12, y + 112, 24, 70, P.G3, P.G1, 3); rect(cx - 2, y + 112, 4, 30, P.K);
}
function dataRoomArt(x, y, w, h, t) {
  rect(x, y, w, h, P.K); rect(x + 4, y + 16, w - 8, 80, P.BL); for (let i = 0; i < 3; i++) { rect(x + 10 + i * 46, y + 18, 30, 8, P.YE); text(['D.C.', 'LONDON', 'TOKYO'][i], x + 12 + i * 46, y + 18, P.K); }
  for (const pl of LAND.slice(0, 8)) { g.fillStyle = P.TL; g.beginPath(); pl.forEach(([lo, la], k) => { const px_ = x + 8 + (lo + 170) / 360 * (w - 16), py = y + 30 + (78 - la) / 140 * 60; k ? g.lineTo(px_, py) : g.moveTo(px_, py); }); g.fill(); }
  rect(x, y + 120, w, 80, P.G1); rect(x + 10, y + 128, 60, 20, P.G3); disc(x + 60, y + 120, 10, P.SK); rect(x + 44, y + 130, 34, 50, P.W); rect(x + 64, y + 116, 6, 10, P.K);
  disc(x + 120, y + 70, 7, P.BR); rect(x + 112, y + 78, 18, 50, P.GR2); dither(x + 112, y + 110, 18, 40, P.GR2, P.YE, 5); rect(x + 120, y + 86, 16, 12, P.W);
}
function intelArt(x, y, w, h, t) {
  rect(x, y, w, h, P.G1); dither(x, y, w, h, P.G1, P.K, 5); g.fillStyle = P.TL; g.beginPath(); g.ellipse(x + w / 2, y + 60, 44, 16, 0, 0, 7); g.fill(); rect(x + w / 2 - 44, y + 60, 88, 70, P.TL); g.fillStyle = P.CY; g.beginPath(); g.ellipse(x + w / 2, y + 60, 44, 16, 0, 0, 7); g.fill();
  for (let i = 0; i < 8; i++) rect(x + w / 2 - 40 + i * 11, y + 80, 6, 40, P.BL); for (let i = 0; i < 10; i++) px(x + w / 2 - 36 + i * 8, y + 72, (t * 5 + i | 0) % 2 ? P.RD2 : P.GR2);
  person(x + 20, y + 190, P.W, P.BL, P.SK, P.BR, 44); person(x + 132, y + 190, P.W, P.G1, P.SK, P.K, 44);
}
function cryptoLabArt(x, y, w, h, t) {
  rect(x, y, w, h, P.BL); rect(x, y + 110, w, 90, P.G1); rect(x + 6, y + 110, w - 12, 6, P.W);
  rect(x + 20, y + 30, 40, 30, P.W); frame(x + 20, y + 30, 40, 30, P.K); for (let i = 0; i < 5; i++) rect(x + 24, y + 34 + i * 5, 30, 1, P.G1);
  disc(x + 96, y + 60, 12, P.SK); dither(x + 82, y + 44, 28, 16, 'rgba(0,0,0,0)', P.W, 6); rect(x + 80, y + 72, 32, 40, P.W); rect(x + 110, y + 84, 16, 6, P.W); rect(x + 116, y + 86, 8, 22, P.G3); rect(x + 112, y + 80, 16, 6, P.K);
}
function hotelLobbyArt(t) {
  rect(0, 0, W, H, P.K);
  for (let x = 0; x < W; x += 60) { rect(x + 20, 20, 10, 150, P.K); rect(x + 21, 20, 2, 150, P.YE); }
  rect(0, 0, W, 16, P.G1); for (let i = 0; i < 12; i++) disc(160 + Math.cos(i / 12 * 6.28) * 30, 10 + Math.sin(i / 12 * 6.28) * 6, 1, P.YE);
  // red stairs and the herringbone carpet
  for (let i = 0; i < 10; i++) rect(150 - i * 6, 90 + i * 4, 40 + i * 12, 4, i % 2 ? P.RD : P.RD2);
  for (let y = 130; y < H; y += 2) { const hw = (y - 130) * 1.1 + 30; for (let x = 160 - hw; x < 160 + hw; x += 4) { px(x + (y % 4), y, P.RD); px(x + 2 - (y % 4) / 2, y, P.BL); } }
  rect(230, 110, 60, 30, P.BR); rect(230, 110, 60, 3, P.YE); person(260, 110, P.W, P.K, P.SK, P.K, 22);
  for (const [px_, py] of [[20, 180], [300, 176], [280, 60]]) { disc(px_, py - 14, 12, P.GR); dither(px_ - 12, py - 26, 24, 24, 'rgba(0,0,0,0)', P.GR2, 4); rect(px_ - 4, py - 4, 8, 6, P.BR); }
  person(190, 160, P.W, P.BL, P.SK, P.BR, 26); person(175, 150, P.RD2, P.K, P.SK, P.K, 22); person(212, 172, P.BL2, P.K, P.SK, P.YE, 28);
}
function interrogationArt(x, y, w, h, p) {
  rect(x, y, w, h, P.K); vgrad(x, y, w, 120, [P.K, P.G1]); disc(x + w / 2, y + 12, 3, P.YE); line(x + w / 2, y, x + w / 2, y + 9, P.G3);
  rect(x + 20, y + 110, w - 40, 6, P.BR); rect(x + w / 2 - 30, y + 42, 60, 72, P.W); frame(x + w / 2 - 30, y + 42, 60, 72, P.G3); drawFace(p.face, x + w / 2 - 26, y + 46, 52, 64);
}
function captureArt(x, y, w, h) {
  rect(x, y, w, h, P.GR); dither(x, y, w, h, P.GR, P.BL, 6); frame(x, y, w, h, P.W);
  rect(x + 10, y + 30, w - 20, 140, P.RD); dither(x + 10, y + 30, w - 20, 140, P.RD, P.RD2, 5); rect(x + 10, y + 26, w - 20, 8, P.YE);
  rect(x + w / 2 - 22, y + 60, 44, 40, P.G3); disc(x + w / 2, y + 80, 14, P.G1); disc(x + w / 2, y + 80, 9, P.K); rect(x + w / 2 - 16, y + 100, 32, 50, P.G1); rect(x + w / 2 - 20, y + 140, 40, 30, P.K);
}

// ---------- buildings: townhouse (hideout), glass office, tower (active cel), stucco safehouse (agent) ----------
function buildingArt(x, y, w, h, b) {
  rect(x, y, w, h, P.K); const base = y + h - 22;
  const type = b.agency ? (b.type || 'office') : b.type || 'hideout';
  if (type === 'hideout') {
    g.fillStyle = P.G1; g.beginPath(); g.moveTo(x + 22, base - 118); g.lineTo(x + w - 22, base - 118); g.lineTo(x + w - 14, base - 104); g.lineTo(x + 14, base - 104); g.fill(); dither(x + 14, base - 118, w - 28, 14, 'rgba(0,0,0,0)', P.W, 3);
    rect(x + 28, base - 132, 12, 18, P.BR); dither(x + 28, base - 132, 12, 18, P.BR, P.G1, 6);
    brick(x + 16, base - 104, w - 32, 104, P.BR, P.G3);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const wx = x + 26 + c * ((w - 62) / 3), wy = base - 96 + r * 28; rect(wx - 2, wy - 2, 18, 22, P.BR); rect(wx, wy, 14, 18, (r * 4 + c + b.address.length) % 7 === 0 ? P.YE : P.G1); rect(wx, wy + 8, 14, 1, P.BR); rect(wx + 6, wy, 1, 18, P.BR); for (let k = 1; k < 8; k += 2) rect(wx + 1, wy + k, 5, 1, P.K); if ((r * 4 + c + b.address.length) % 7 === 0) person(wx + 10, wy + 18, b.org ? b.org.uni : P.RD, P.K, P.SK, P.K, 12); }
    rect(x + w / 2 - 18, base - 30, 36, 30, P.K); frame(x + w / 2 - 18, base - 30, 36, 30, P.BR); rect(x + w / 2 - 1, base - 30, 2, 30, P.BR); rect(x + w / 2 - 22, base - 34, 44, 4, P.RD);
    for (let i = 0; i < 44; i += 3) rect(x + w / 2 - 22 + i, base - 10, 1, 10, P.K); rect(x + w / 2 - 22, base - 10, 44, 1, P.K);
  } else if (type === 'office') {
    rect(x + 20, base - 130, w - 40, 130, P.TL); for (let yy = base - 126; yy < base - 20; yy += 10) for (let xx = x + 24; xx < x + w - 24; xx += 12) { rect(xx, yy, 10, 8, (xx + yy) % 3 ? P.CY : P.W); dither(xx, yy, 10, 8, 'rgba(0,0,0,0)', P.BL2, 3); }
    rect(x + w / 2 - 16, base - 20, 32, 20, P.K); rect(x + 14, base - 22, w - 28, 2, P.G3); if (b.agency) { rect(x + w / 2 - 26, base - 32, 52, 9, P.K); textC(b.agency, x + w / 2, base - 31, P.YE); }
  } else if (type === 'active cel') {
    rect(x + 40, base - 150, w - 80, 150, P.W); for (let yy = base - 144; yy < base - 16; yy += 9) { for (let xx = x + 46; xx < x + w - 46; xx += 9) rect(xx, yy, 6, 6, P.BL); rect(x + 40, yy + 7, w - 80, 1, P.G3); }
    for (const px_ of [x + 30, x + w - 38]) { rect(px_, base - 10, 10, 10, P.G3); disc(px_ + 5, base - 12, 6, P.GR); }
    rect(x + w / 2 - 12, base - 18, 24, 18, P.K);
  } else {
    rect(x + 16, base - 90, w - 32, 90, P.TN); dither(x + 16, base - 90, w - 32, 90, P.TN, P.W, 5); rect(x + 12, base - 96, w - 24, 6, P.RD);
    for (let c = 0; c < 4; c++) { const ax = x + 26 + c * ((w - 60) / 3); rect(ax, base - 70, 18, 40, P.K); disc(ax + 9, base - 70, 9, P.K); rect(ax, base - 70, 18, 1, P.TN); }
    rect(x + w / 2 - 12, base - 26, 24, 26, P.BR); disc(x + w / 2, base - 26, 12, P.BR);
  }
  sidewalk(x, base, w, 22);
  const nG = 1 + (b.alert || 0) + (b.suspect !== null && b.suspect !== undefined ? 1 : 0);
  for (let i = 0; i < Math.min(6, nG + 1); i++) person(x + 12 + i * 28, base + 18, i % 2 ? (b.org ? b.org.uni : P.G1) : [P.W, P.BL2, P.RD, P.GR][i % 4], P.K, i % 3 ? P.SK : P.BR, P.K, 16);
}
// watching through binoculars
function binocularArt(x, y, w, h, b, face) {
  rect(x, y, w, h, P.K);
  const cx = x + w / 2, cy = y + h / 2 - 10, r = Math.min(w, h) / 2 - 6;
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.clip();
  rect(cx - r, cy - r, r * 2, r * 2, P.BL); dither(cx - r, cy - r, r * 2, r * 2, P.BL, P.K, 6); rect(cx - 6, cy - r, 12, r * 2, P.G3); rect(cx - r, cy - 4, r * 2, 8, P.G3);
  if (face) { drawFace(face, cx - 26, cy - 20, 52, 64); dither(cx - 30, cy + 34, 60, 16, 'rgba(0,0,0,0)', P.GR, 4); }
  g.restore();
  for (let k = 0; k < 8; k++) { g.strokeStyle = P.K; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, r - k, 0, 7); g.stroke(); }
  dither(cx - r - 4, cy - r - 4, r * 2 + 8, r * 2 + 8, 'rgba(0,0,0,0)', P.K, 1);
}

// ---------- regional travel maps: dark gray land, embossed yellow coasts, dithered sea ----------
const regionMapCache = {};
const TRAVEL_VIEW = { europe: { lon: [-26, 46], lat: [30, 70] }, mideast: { lon: [-4, 62], lat: [12, 46] }, americas: { lon: [-122, -32], lat: [-40, 44] } };
function travelProj(region, x, y, w, h) { const V = TRAVEL_VIEW[region]; return (lon, lat) => [x + (lon - V.lon[0]) / (V.lon[1] - V.lon[0]) * w, y + (V.lat[1] - lat) / (V.lat[1] - V.lat[0]) * h]; }
function drawRegionMap(region, x, y, w, h, here, dests, selCity, flying, t) {
  const proj = travelProj(region, x, y, w, h); const key = region + w + 'x' + h;
  let c = regionMapCache[key];
  if (!c) {
    const V = TRAVEL_VIEW[region];
    c = document.createElement('canvas'); c.width = w; c.height = h; const m = document.createElement('canvas'); m.width = w; m.height = h; const mc = m.getContext('2d'); mc.fillStyle = '#fff';
    const path = poly => { mc.beginPath(); poly.forEach(([lo, la], i) => { const px_ = (lo - V.lon[0]) / (V.lon[1] - V.lon[0]) * w, py = (V.lat[1] - la) / (V.lat[1] - V.lat[0]) * h; i ? mc.lineTo(px_, py) : mc.moveTo(px_, py); }); mc.closePath(); mc.fill(); };
    LAND.forEach(path); mc.fillStyle = '#000'; WATER.forEach(path);
    const d = mc.getImageData(0, 0, w, h).data; const land = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && d[(yy * w + xx) * 4] > 127;
    let s = 7;
    drawTo(c.getContext('2d'), () => { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { if (land(xx, yy)) { const lit = !land(xx - 1, yy) || !land(xx, yy - 1), shade = !land(xx + 1, yy) || !land(xx, yy + 1); px(xx, yy, lit ? P.YE : shade ? P.K : P.G1); } else { s = (s * 1103515245 + 12345) & 0x7fffffff; const r = (s >> 16) % 5; px(xx, yy, r < 2 ? P.BL : r < 4 ? P.BL2 : P.K); } } });
    regionMapCache[key] = c;
  }
  g.drawImage(c, x, y);
  for (const ct of [here, ...dests]) {
    if (ct.hq) continue; const [cx, cy] = proj(ct.lon, ct.lat); const sel = selCity === ct;
    rect(cx, cy, 2, 2, P.CY); if (sel || ct === here) text(ct.name, cx + 4, cy - 3, sel ? P.CY : P.W, P.K);
  }
  if (here.hq || (dests.some(d => d.hq) && selCity && selCity.hq)) { rect(x + 1, y + h / 2, 3, 2, P.CY); text('Washington', x + 5, y + h / 2 - 3, selCity && selCity.hq ? P.CY : P.W); }
  if (flying) { const a = here.hq ? [x + 2, y + h / 2] : proj(here.lon, here.lat), b = flying.to.hq ? [x + 2, y + h / 2] : proj(flying.to.lon, flying.to.lat); const k = flying.t; const px_ = a[0] + (b[0] - a[0]) * k, py = a[1] + (b[1] - a[1]) * k; for (let i = 0; i < 24 * k; i += 2) px(a[0] + (b[0] - a[0]) * i / 24, a[1] + (b[1] - a[1]) * i / 24, P.W); rect(px_ - 3, py, 7, 1, P.W); rect(px_, py - 2, 1, 5, P.W); rect(px_ - 2, py + 2, 5, 1, P.W); }
}

// ---------- vacation snapshots ----------
function rewardArt(i, x, y, w, h, t) {
  if (i === 0) { rect(x, y, w, h, P.PK); dither(x, y, w, 120, P.PK, P.W, 4); rect(x, y + 140, w, 60, P.G3); for (let k = 0; k < 5; k++) { const mx = x + 14 + k * 62; rect(mx, y + 80, 52, 64, P.W); frame(mx, y + 80, 52, 64, P.G1); disc(mx + 26, y + 116, 16, P.G1); disc(mx + 26, y + 116, 12, (k + (t * 4 | 0)) % 2 ? P.BL2 : P.CY); rect(mx + 4, y + 84, 44, 6, P.G3); } person(x + 80, y + 180, P.GR, P.BL, P.SK, P.BR, 60); person(x + 230, y + 180, P.MG, P.K, P.SK, P.YE, 56); rect(x + 238, y + 150, 26, 14, P.TN); textC('WASH-O-RAMA', x + w / 2, y + 20, P.RD); }
  else if (i === 1) { rect(x, y, w, h, P.CY); rect(x, y + 120, w, 80, P.BR); rect(x + 50, y + 104, 220, 20, P.BR); rect(x + 50, y + 104, 220, 3, P.YE); for (let k = 0; k < 8; k++) rect(x + 70 + k * 12, y + 96 - k * 2, 40, 5, P.W); disc(x + 260, y + 40, 16, P.W); line(x + 260, y + 40, x + 260, y + 30, P.K); line(x + 260, y + 40, x + 268, y + 40, P.K); person(x + 160, y + 104, P.W, P.G1, P.SK, P.BR, 50); }
  else if (i === 2) { vgrad(x, y, w, 90, [P.BL2, P.CY]); rect(x, y + 90, w, 36, P.BL); for (let k = 0; k < w; k += 10) rect(x + k + ((t * 10 | 0) % 10), y + 98, 5, 1, P.W); rect(x, y + 126, w, 74, P.YE); dither(x, y + 126, w, 74, P.YE, P.BR, 2); disc(x + 270, y + 30, 14, P.YE); line(x + 200, y + 180, x + 212, y + 96, P.W); for (let k = 0; k < 9; k++) line(x + 212, y + 96, x + 176 + k * 9, y + 114, k % 2 ? P.RD2 : P.W); rect(x + 150, y + 160, 40, 10, P.RD2); person(x + 120, y + 180, P.RD2, P.SK, P.SK, P.BR, 40); }
  else { rect(x, y, w, h, P.K); for (let k = 0; k < w; k += 12) { const on = ((k / 12 + (t * 6 | 0)) % 3) === 0; rect(x + k, y + 4, 8, 3, on ? P.YE : P.RD); } g.fillStyle = P.GR; g.beginPath(); g.ellipse(x + w / 2, y + 130, 130, 40, 0, 0, 7); g.fill(); disc(x + w / 2, y + 130, 24, P.BR); for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2 + t; px(x + w / 2 + Math.cos(a) * 19, y + 130 + Math.sin(a) * 12, k % 2 ? P.RD : P.K); } for (let k = 0; k < 6; k++) rect(x + 50 + k * 44, y + 150, 10, 4, [P.RD2, P.BL2, P.W, P.YE, P.GR2, P.PK][k]); person(x + 40, y + 120, P.RD2, P.RD2, P.SK, P.YE, 70); person(x + 280, y + 120, P.K, P.K, P.SK, P.K, 70); textC('MONTE CARLO', x + w / 2, y + 20, P.YE); }
}
