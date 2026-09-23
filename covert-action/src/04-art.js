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
// EGA SCENE ART (all drawn in code, 16 colours, dithered)
// ===================================================================
function brick(x, y, w, h, c1 = P.BR, c2 = P.RD) {
  rect(x, y, w, h, c1);
  for (let yy = 0; yy < h; yy += 3) { rect(x, y + yy, w, 1, P.K); for (let xx = ((yy / 3) % 2) * 3; xx < w; xx += 6) px(x + xx, y + yy + 1, P.K); }
  dither(x, y, w, h, 'rgba(0,0,0,0)', c2, 3);
}
function person(x, y, shirt, legs = P.K, skin = P.SK, hair = P.K, h = 14) { // small street figure, feet at y
  const s = h / 14;
  rect(x - 1, y - 14 * s, 3, 3 * s, skin); rect(x - 1, y - 14 * s, 3, 1, hair);
  rect(x - 2, y - 11 * s, 5, 6 * s, shirt); rect(x - 2, y - 5 * s, 2, 5 * s, legs); rect(x + 1, y - 5 * s, 2, 5 * s, legs);
}
function sky(x, y, w, h, night) { if (night) { rect(x, y, w, h, P.K); for (let i = 0; i < 30; i++) px(x + (i * 53) % w, y + (i * 29) % Math.max(1, h), i % 4 ? P.G1 : P.W); } else vgrad(x, y, w, h, [P.BL, P.BL2, P.CY]); }
const isNight = () => { const h = hourOf(game.t); return h < 6 || h >= 20; };

// ---------- the Chief ----------
function chiefArt(t) {
  rect(0, 0, W, 146, P.K);
  // curtains
  for (let x = 0; x < W; x += 4) { rect(x, 0, 2, 110, P.TL); rect(x + 2, 0, 1, 110, P.CY); }
  // window with sky and clouds
  rect(96, 0, 128, 100, P.CY); dither(96, 0, 128, 60, P.BL2, P.CY, 8);
  for (const [cx, cy] of [[120, 20], [170, 35], [200, 12]]) { disc(cx, cy, 5, P.W); disc(cx + 7, cy + 1, 6, P.W); disc(cx - 7, cy + 2, 4, P.W); }
  frame(96, 0, 128, 100, P.G3); rect(159, 0, 2, 100, P.G3);
  // flags
  rect(40, 10, 2, 110, P.YE); rect(42, 14, 30, 60, P.RD); dither(42, 14, 30, 60, P.RD, P.RD2, 4); for (let y = 16; y < 74; y += 4) px(72, y, P.YE);
  rect(274, 10, 2, 110, P.YE); rect(248, 14, 26, 64, P.BL); for (const [sx, sy] of [[256, 30], [264, 44], [254, 56], [266, 22]]) { px(sx, sy, P.YE); px(sx - 1, sy, P.YE); px(sx + 1, sy, P.YE); px(sx, sy - 1, P.YE); px(sx, sy + 1, P.YE); }
  // chair and the chief
  rect(122, 44, 76, 60, P.K); rect(126, 40, 68, 8, P.G1);
  rect(116, 76, 88, 34, P.G1); dither(116, 76, 88, 34, P.G1, P.K, 4); // shoulders & suit
  rect(150, 76, 20, 30, P.W); rect(157, 78, 6, 26, P.RD); // shirt, tie
  rect(146, 64, 28, 14, P.SK); disc(160, 56, 14, P.SK); rect(146, 52, 2, 10, P.G3); rect(172, 52, 2, 10, P.G3); // head, grey sides
  dither(146, 44, 28, 10, 'rgba(0,0,0,0)', P.RD, 3);
  rect(152, 56, 5, 2, P.K); rect(163, 56, 5, 2, P.K); rect(153, 57, 3, 1, P.W); rect(164, 57, 3, 1, P.W); rect(159, 59, 2, 5, P.RD); rect(154, 67, 12, 1, P.RD);
  // desk
  rect(0, 108, W, 38, P.BR); for (let y = 110; y < 146; y += 5) line(0, y, W, y + 3, P.RD); rect(0, 108, W, 2, P.YE);
  rect(130, 104, 60, 8, P.G3); for (let i = 0; i < 12; i++) rect(132 + i * 5, 105, 3, 2, P.W); // keyboard
  rect(128, 100, 12, 8, P.SK); rect(180, 100, 12, 8, P.SK); // hands
  rect(20, 112, 30, 22, P.K); frame(20, 112, 30, 22, P.W); rect(25, 116, 20, 14, P.G1); // photo frame
  rect(222, 112, 28, 3, P.K); line(236, 111, 244, 96, P.YE);
  rect(252, 118, 50, 12, P.YE); frame(252, 118, 50, 12, P.BR); disc(259, 124, 3, P.BL); text('CHIEF', 266, 121, P.K);
}

// ---------- training panels ----------
function trainingArt(i, x, y, w, h, t) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  if (i === 0) { rect(x, y, w, h, P.RD); const cx = x + w / 2; disc(cx, y + 18, 6, P.K); rect(cx - 3, y + 12, 7, 3, P.BR); rect(cx - 8, y + 25, 16, 34, P.K); rect(cx - 8, y + 58, 6, 38, P.K); rect(cx + 2, y + 58, 6, 38, P.K); rect(cx + 8, y + 28, 16, 4, P.K); rect(cx + 20, y + 26, 6, 3, P.G3); rect(cx - 12, y + 28, 5, 20, P.K); px(cx - 2, y + 17, P.SK); px(cx + 2, y + 17, P.SK); }
  else if (i === 1) { rect(x, y, w, h, P.K); for (let k = 0; k < 14; k++) px(x + (k * 37) % w, y + (k * 23) % 40, P.W); disc(x + 14, y + 12, 3, P.YE); for (let k = 0; k < 40; k += 2) { px(x + 4 + k, y + 90 - k * 0.8, P.MG); px(x + 10 + k, y + 96 - k * 0.8, P.PK); } g.save(); g.translate(x + w / 2 + 6, y + 58); g.rotate(-0.5); rect(-20, -6, 40, 12, P.RD2); rect(-14, -9, 22, 5, P.RD); rect(-8, -8, 10, 3, P.CY); rect(-20, 4, 8, 4, P.K); rect(10, 4, 8, 4, P.K); g.restore(); }
  else if (i === 2) { rect(x, y, w, h, P.BL); rect(x, y + 60, w, h - 60, P.G1); rect(x + 4, y + 62, w - 8, 4, P.W); rect(x + 8, y + 10, 16, 12, P.W); frame(x + 8, y + 10, 16, 12, P.G1); disc(x + 34, y + 30, 8, P.SK); rect(x + 26, y + 20, 16, 8, P.K); rect(x + 24, y + 38, 22, 26, P.W); rect(x + 44, y + 50, 14, 4, P.W); rect(x + 38, y + 58, 20, 6, P.CR); for (let k = 0; k < 4; k++) rect(x + 40, y + 59 + k, 14, 1, P.G3); }
  else { rect(x, y, w, h, P.K); for (let k = 0; k < w; k += 6) rect(x + k, y, 3, h, P.G1); rect(x + 6, y + 30, w - 12, 44, P.GR); for (let k = 0; k < 6; k++) rect(x + 10 + k * 8, y + 40, 5, 6, P.G3); for (let k = 0; k < 6; k++) line(x + 12 + k * 8, y + 46, x + 8 + k * 9, y + 70, [P.RD2, P.YE, P.W][k % 3]); rect(x + 18, y + 10, 30, 20, P.BL); dither(x + 18, y + 10, 30, 20, P.BL, P.K, 6); rect(x + 30, y + 26, 14, 10, P.BL); line(x + 44, y + 30, x + 60, y + 22, P.RD2); }
  g.restore();
}

// ---------- city street (city menu picture) ----------
function streetArt(x, y, w, h, city) {
  const night = isNight(); sky(x, y, w, 90, night);
  const reg = city.region, hq = city.hq; let s = city.id.charCodeAt(0) * 7 + city.id.charCodeAt(2);
  const base = y + 118;
  for (let bx = x; bx < x + w;) {
    s = (s * 16807) % 2147483647; const bw = 22 + s % 26, bh = 40 + (s >> 5) % 50;
    const wall = reg === 'mideast' ? pick2(s, [P.TN, P.W, P.YE2]) : reg === 'americas' ? pick2(s, [P.G3, P.W, P.CY]) : pick2(s, [P.BR, P.G3, P.G1]);
    rect(bx, base - bh, bw, bh, wall); rect(bx + bw - 2, base - bh, 2, bh, P.K);
    if (reg === 'mideast' && s % 3 === 0) disc(bx + bw / 2, base - bh, bw / 3, P.TL);
    for (let wy = base - bh + 5; wy < base - 8; wy += 8) for (let wx = bx + 3; wx < bx + bw - 5; wx += 6) rect(wx, wy, 3, 4, night ? ((wx + wy) % 3 ? P.YE : P.K) : P.K);
    bx += bw + 2;
  }
  if (hq) { rect(x + 40, base - 60, 90, 60, P.W); disc(x + 85, base - 64, 16, P.W); rect(x + 83, base - 88, 4, 10, P.W); for (let i = 0; i < 9; i++) rect(x + 44 + i * 10, base - 50, 3, 48, P.G3); }
  if (reg === 'americas' && !hq) for (const px_ of [x + 12, x + w - 20]) { rect(px_, base - 40, 3, 40, P.BR); for (let a = 0; a < 5; a++) line(px_ + 1, base - 40, px_ + 1 + Math.cos(a * 1.3) * 14, base - 40 + Math.sin(a * 1.3) * 6 - 4, P.GR); }
  rect(x, base, w, h - (base - y), P.G1); rect(x, base, w, 2, P.G3); rect(x, base + 16, w, h, P.K);
  for (let i = 0; i < 6; i++) person(x + 10 + i * 28 + (s >> i) % 10, base + 14, [P.RD, P.BL2, P.W, P.GR, P.YE, P.MG][i], P.K, i % 3 ? P.SK : P.BR);
}
const pick2 = (s, a) => a[s % a.length];

function embassyArt(x, y, w, h) {
  sky(x, y, w, 100, isNight()); const base = y + 124;
  rect(x + 10, base - 70, w - 20, 70, P.G3); rect(x + 4, base - 78, w - 8, 8, P.W); for (let i = 0; i < 8; i++) rect(x + 20 + i * 18, base - 70, 6, 66, P.W);
  rect(x + w / 2 - 12, base - 30, 24, 30, P.K); rect(x + w / 2 - 1, base - 110, 2, 34, P.W);
  for (let k = 0; k < 7; k++) rect(x + w / 2 + 1, base - 110 + k * 2, 26, 1, k % 2 ? P.W : P.RD); rect(x + w / 2 + 1, base - 110, 10, 7, P.BL);
  rect(x, base, w, 40, P.G1); for (let i = 0; i < w; i += 5) rect(x + i, base - 8, 1, 12, P.K); rect(x, base - 8, w, 1, P.K);
  person(x + w / 2 - 20, base + 10, P.GR, P.GR); person(x + w / 2 + 20, base + 10, P.GR, P.GR);
}
function hotelArt(x, y, w, h) {
  const night = isNight(); sky(x, y, w, 100, night); const base = y + 124;
  rect(x + 30, base - 110, w - 60, 110, P.CR); for (let wy = base - 104; wy < base - 20; wy += 8) for (let wx = x + 36; wx < x + w - 36; wx += 10) rect(wx, wy, 6, 5, night && (wx * wy) % 3 ? P.YE : P.BL);
  rect(x + w - 44, base - 100, 12, 64, P.RD); 'HOTEL'.split('').forEach((c, i) => text(c, x + w - 42, base - 96 + i * 12, (Date.now() / 400 | 0) % 2 || !night ? P.YE : P.RD2));
  rect(x + 40, base - 22, w - 80, 6, P.RD); rect(x + w / 2 - 10, base - 16, 20, 16, P.K);
  rect(x, base, w, 40, P.G1); person(x + w / 2 + 16, base + 8, P.RD, P.K); person(x + 30, base + 12, P.W, P.BL);
}
function terminalArt(x, y, w, h) {
  rect(x, y, w, h, P.K); rect(x + 10, y + 20, w - 20, 100, P.G3); rect(x + 16, y + 26, w - 32, 80, P.K);
  for (let i = 0; i < 8; i++) rect(x + 22, y + 32 + i * 9, 30 + ((i * 37) % 80), 3, P.GR2);
  if ((Date.now() / 500 | 0) % 2) rect(x + 22, y + 104 - 6, 5, 3, P.GR2);
  rect(x + 30, y + 120, w - 60, 8, P.G3); rect(x + 4, y + 132, w - 8, 24, P.G3); for (let i = 0; i < 15; i++) for (let j = 0; j < 3; j++) rect(x + 8 + i * 10, y + 136 + j * 6, 8, 4, P.W);
}
function buildingArt(x, y, w, h, b) {
  const night = isNight(); sky(x, y, w, 100, night); const base = y + 132;
  if (b.agency) { rect(x + 10, base - 90, w - 20, 90, P.G3); dither(x + 10, base - 90, w - 20, 90, P.G3, P.G1, 3); for (let wy = base - 84; wy < base - 20; wy += 14) for (let wx = x + 18; wx < x + w - 22; wx += 16) { rect(wx, wy, 9, 10, P.K); rect(wx, wy, 9, 1, P.W); } rect(x + w / 2 - 12, base - 26, 24, 26, P.BR); rect(x + w / 2 - 22, base - 34, 44, 7, P.K); textC(b.agency, x + w / 2, base - 33, P.YE); }
  else {
    const alert = b.alert || 0;
    // brick town house like the original's "unknown building"
    rect(x + 16, base - 110, w - 32, 12, P.G1); for (let i = 0; i < 12; i++) line(x + 16 + i * 12, base - 110, x + 22 + i * 12, base - 98, P.K);
    rect(x + 22, base - 124, 10, 16, P.BR);
    brick(x + 16, base - 98, w - 32, 98, P.G1, P.BR);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const wx = x + 26 + c * ((w - 60) / 3), wy = base - 90 + r * 26; rect(wx - 2, wy - 2, 18, 20, P.BR); rect(wx, wy, 14, 16, night && (r + c) % 2 ? P.YE : P.G1); rect(wx, wy + 7, 14, 1, P.BR); rect(wx + 6, wy, 1, 16, P.BR); if ((r * 4 + c + b.address.length) % 5 === 0) person(wx + 7, wy + 16, P.RD, P.RD, P.SK, P.K, 10); }
    rect(x + w / 2 - 16, base - 30, 32, 30, P.BR); rect(x + w / 2 - 13, base - 27, 12, 27, P.K); rect(x + w / 2 + 1, base - 27, 12, 27, P.K);
    for (let i = 0; i < w - 40; i += 3) rect(x + 20 + i, base - 10, 1, 10, P.K); rect(x + 20, base - 10, w - 40, 1, P.K);
    const nG = 1 + alert * 2 + (b.suspect !== null && b.suspect !== undefined ? 1 : 0);
    for (let i = 0; i < Math.min(8, nG); i++) person(x + 14 + i * 20, base + 18, b.org ? b.org.uni : P.G1, P.K, P.SK, P.K, 16);
  }
  rect(x, base, w, 50, P.G3); dither(x, base, w, 50, P.G3, P.G1, 5);
}

// ---------- regional map for the airport ----------
const regionMapCache = {};
function drawRegionMap(region, x, y, w, h, here, dests, selItem, flying, t) {
  const R = REGIONS[region]; const [lo0, lo1] = R.lon, [la0, la1] = R.lat;
  const proj = (lon, lat) => [x + (lon - lo0) / (lo1 - lo0) * w, y + (la1 - lat) / (la1 - la0) * h];
  let c = regionMapCache[region + w + h];
  if (!c) {
    c = document.createElement('canvas'); c.width = w; c.height = h; const m = document.createElement('canvas'); m.width = w; m.height = h; const mc = m.getContext('2d'); mc.fillStyle = '#fff';
    const path = poly => { mc.beginPath(); poly.forEach(([lo, la], i) => { const px_ = (lo - lo0) / (lo1 - lo0) * w, py = (la1 - la) / (la1 - la0) * h; i ? mc.lineTo(px_, py) : mc.moveTo(px_, py); }); mc.closePath(); mc.fill(); };
    LAND.forEach(path); mc.fillStyle = '#000'; WATER.forEach(path);
    const d = mc.getImageData(0, 0, w, h).data; const land = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && d[(yy * w + xx) * 4] > 127;
    drawTo(c.getContext('2d'), () => { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const b = BAYER[(yy & 3) * 4 + (xx & 3)]; if (land(xx, yy)) { const edge = !land(xx - 1, yy) || !land(xx + 1, yy) || !land(xx, yy - 1) || !land(xx, yy + 1); px(xx, yy, edge ? P.K : b < 4 ? P.BR : P.GR); } else px(xx, yy, b < 2 ? P.BL2 : P.BL); } });
    regionMapCache[region + w + h] = c;
  }
  g.drawImage(c, x, y); frame(x - 1, y - 1, w + 2, h + 2, P.W);
  const all = [here, ...dests];
  for (const ct of all) {
    let [cx, cy] = proj(ct.lon, ct.lat); if (ct.hq) { cx = x + 4; cy = y + 8; }
    const sel = selItem && selItem.label === ct.name;
    rect(cx - 1, cy - 1, 3, 3, ct === here ? P.YE : sel ? P.RD2 : P.W);
    if (sel || ct === here) text(ct.hq ? 'to Washington' : ct.name, cx + 4, cy - 3, ct === here ? P.YE : P.W, P.K);
  }
  if (flying) { const [ax, ay] = here.hq ? [x + 4, y + 8] : proj(here.lon, here.lat), [bx, by] = flying.to.hq ? [x + 4, y + 8] : proj(flying.to.lon, flying.to.lat); const k = flying.t; const px_ = ax + (bx - ax) * k, py = ay + (by - ay) * k; for (let i = 0; i < 20 * k; i++) px(ax + (bx - ax) * i / 20, ay + (by - ay) * i / 20, P.W); rect(px_ - 3, py, 7, 1, P.W); rect(px_, py - 2, 1, 5, P.W); }
}

// ---------- reward pictures ----------
function rewardArt(i, x, y, w, h, t) {
  if (i === 0) { rect(x, y, w, h, P.G3); rect(x, y + 80, w, 40, P.W); for (let k = 0; k < 6; k++) { const mx = x + 14 + k * 50; rect(mx, y + 40, 40, 50, P.W); frame(mx, y + 40, 40, 50, P.G1); disc(mx + 20, y + 68, 12, P.G1); disc(mx + 20, y + 68, 9, (k + (t * 4 | 0)) % 2 ? P.BL2 : P.CY); } text('LAUNDROMAT', x + 110, y + 12, P.RD); rect(x + 60, y + 90, 12, 24, P.BL); disc(x + 66, y + 86, 4, P.SK); }
  else if (i === 1) { rect(x, y, w, h, P.CY); rect(x, y + 70, w, 50, P.BR); rect(x + 60, y + 60, 200, 14, P.BR); rect(x + 60, y + 60, 200, 3, P.YE); for (let k = 0; k < 6; k++) rect(x + 80 + k * 10, y + 50 - k * 2, 30, 4, P.W); disc(x + 250, y + 24, 12, P.W); line(x + 250, y + 24, x + 250, y + 16, P.K); line(x + 250, y + 24, x + 256, y + 24, P.K); }
  else if (i === 2) { vgrad(x, y, w, 60, [P.BL2, P.CY]); rect(x, y + 60, w, 22, P.BL); for (let k = 0; k < w; k += 8) rect(x + k + ((t * 10 | 0) % 8), y + 66, 4, 1, P.W); rect(x, y + 82, w, 38, P.YE); dither(x, y + 82, w, 38, P.YE, P.BR, 2); disc(x + 260, y + 20, 10, P.YE); line(x + 200, y + 110, x + 210, y + 50, P.W); for (let k = 0; k < 7; k++) line(x + 210, y + 50, x + 184 + k * 9, y + 64, k % 2 ? P.RD2 : P.W); rect(x + 170, y + 96, 20, 8, P.RD2); }
  else { rect(x, y, w, h, P.K); for (let k = 0; k < w; k += 12) { const on = ((k / 12 + (t * 6 | 0)) % 3) === 0; rect(x + k, y + 4, 8, 3, on ? P.YE : P.RD); } g.fillStyle = P.GR; g.beginPath(); g.ellipse(x + w / 2, y + 86, 120, 30, 0, 0, 7); g.fill(); disc(x + w / 2, y + 86, 18, P.BR); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2 + t; px(x + w / 2 + Math.cos(a) * 14, y + 86 + Math.sin(a) * 14 * 0.6, k % 2 ? P.RD : P.K); } for (let k = 0; k < 5; k++) { rect(x + 60 + k * 44, y + 100, 8, 3, [P.RD2, P.BL2, P.W, P.YE, P.GR2][k]); } person(x + 40, y + 70, P.RD2, P.RD2, P.SK, P.YE, 30); person(x + 270, y + 70, P.G1, P.G1, P.SK, P.K, 30); text('MONTE CARLO', x + 120, y + 16, P.YE); }
}

// ---------- watch the building: someone steps out ----------
function watchArt(x, y, w, h, b, face, t) {
  buildingArt(x, y, w, h, b);
  if (face) { msgBox(x + w - 70, y + 6, 64, 80); drawFace(face, x + w - 67, y + 9, 58, 72); }
}
