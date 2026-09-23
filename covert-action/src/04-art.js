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

// ---------- city skylines for the hub picture ----------
function skyCols(hour) {
  if (hour < 5 || hour >= 21) return [P.K, P.NV, P.BL];
  if (hour < 8) return [P.NV, P.PU, P.OR];
  if (hour >= 18) return [P.BL, P.MG, P.OR];
  return [P.BL, P.BL2, P.BL3];
}
function drawCityScene(city, x, y, w, h, hour) {
  const night = hour < 6 || hour >= 20;
  vgrad(x, y, w, h, skyCols(hour));
  if (night) { let s = 1; for (let i = 0; i < 40; i++) { s = (s * 16807) % 2147483647; px(x + s % w, y + (s >> 8) % (h / 2), i % 5 ? P.G4 : P.W); } disc(x + w - 40, y + 16, 5, P.CR); disc(x + w - 38, y + 15, 5, P.NV); }
  else { disc(x + w - 46, y + 18, 7, hour >= 17 || hour < 9 ? P.OR : P.YE); }
  // clouds
  if (!night) for (let i = 0; i < 3; i++) { const cx = x + 30 + i * 100 + (city.id.charCodeAt(0) * 7 + i * 31) % 40, cy = y + 12 + i * 6; rect(cx, cy, 28, 3, P.G5); rect(cx + 5, cy - 2, 16, 2, P.W); rect(cx + 3, cy + 3, 24, 1, P.G4); }
  const base = y + h - 14;
  const bodyC = night ? P.D2 : P.G2, bodyC2 = night ? P.K : P.G1, win = night ? P.YE : P.G3;
  // generic far skyline
  let s = city.id.charCodeAt(1) * 131 + city.id.charCodeAt(2);
  for (let bx = x; bx < x + w;) { s = (s * 16807) % 2147483647; const bw = 10 + s % 18, bh = 12 + (s >> 5) % 26; rect(bx, base - bh, bw, bh, night ? P.K : P.G3); bx += bw + 1; }
  for (let bx = x + 4; bx < x + w;) {
    s = (s * 16807) % 2147483647; const bw = 14 + s % 22, bh = 16 + (s >> 6) % 34;
    rect(bx, base - bh, bw, bh, bodyC); rect(bx + bw - 2, base - bh, 2, bh, bodyC2);
    for (let wy = base - bh + 3; wy < base - 3; wy += 4) for (let wx = bx + 2; wx < bx + bw - 3; wx += 3) if (((wx * 7 + wy * 13 + s) % 5) > (night ? 2 : 0)) px(wx, wy, win);
    bx += bw + 3 + (s >> 9) % 14;
  }
  landmark(city.look, x, base, w, night);
  // street
  rect(x, base, w, 14, night ? P.K : P.D2); rect(x, base, w, 1, P.G3);
  for (let i = x + 4; i < x + w; i += 16) rect(i, base + 7, 8, 1, night ? P.YE2 : P.YE);
}
function landmark(look, x, base, w, night) {
  const c = night ? P.D2 : P.G4, c2 = night ? P.K : P.G3, lit = night ? P.YE2 : P.W, cx = x + (w * 0.3 | 0);
  switch (look) {
    case 'capitol': rect(cx - 30, base - 18, 60, 18, c); rect(cx - 12, base - 30, 24, 12, c); disc(cx, base - 32, 11, c); rect(cx - 12, base - 32, 24, 3, c); rect(cx - 1, base - 50, 3, 8, c); for (let i = -26; i < 28; i += 5) rect(cx + i, base - 15, 2, 14, c2); break;
    case 'towers': for (const o of [-12, 6]) { rect(cx + o, base - 70, 12, 70, c); for (let yy = base - 68; yy < base; yy += 2) rect(cx + o + 1, yy, 10, 1, c2); } rect(cx - 7, base - 80, 1, 10, c); break;
    case 'pyramid': for (let i = 0; i < 9; i++) rect(cx - 30 + i * 3, base - 4 - i * 4, 60 - i * 6, 4, i % 2 ? c : c2); rect(cx - 3, base - 38, 6, 36, c2); break;
    case 'fort': rect(cx - 30, base - 12, 60, 12, c); for (let i = -30; i < 30; i += 6) rect(cx + i, base - 16, 3, 4, c); rect(cx + 14, base - 38, 8, 26, c); rect(cx + 12, base - 42, 12, 4, c2); disc(cx + 18, base - 46, 3, lit); rect(cx - 50, base - 30, 2, 30, P.BR); disc(cx - 49, base - 32, 7, night ? P.DG : P.GR); break;
    case 'andes': for (let i = 0; i < 3; i++) { const mx = x + 40 + i * 110; for (let yy = 0; yy < 50; yy++) rect(mx - yy * 1.3, base - 60 + yy, yy * 2.6, 1, yy < 8 ? P.W : night ? P.K : P.G2); } break;
    case 'sugarloaf': for (let yy = 0; yy < 60; yy++) { const ww = Math.sqrt(yy) * 6; rect(cx + 50 - ww / 2, base - 60 + yy, ww, 1, night ? P.DG : P.GR); } rect(cx - 60, base - 40, 3, 40, c); rect(cx - 70, base - 36, 23, 3, c); rect(cx - 60, base - 44, 3, 4, c); break;
    case 'clock': rect(cx - 6, base - 70, 12, 70, c); rect(cx - 8, base - 50, 16, 14, c); disc(cx, base - 43, 5, lit); line(cx, base - 43, cx, base - 47, P.K); line(cx, base - 43, cx + 3, base - 43, P.K); for (let i = 0; i < 8; i++) rect(cx - 5 + i * 0.6, base - 78 + i, 10 - i * 1.2, 1, c); rect(cx + 10, base - 22, 70, 22, c); for (let i = cx + 14; i < cx + 80; i += 8) rect(i, base - 28, 3, 6, c); break;
    case 'eiffel': for (let yy = 0; yy < 84; yy++) { const hw = yy > 60 ? 18 - (84 - yy) * 0.2 + (yy - 60) * 0.7 : 2 + yy * 0.22; if (yy > 60) { rect(cx - hw, base - 84 + yy, 5, 1, c); rect(cx + hw - 5, base - 84 + yy, 5, 1, c); } else rect(cx - hw, base - 84 + yy, hw * 2, 1, c); } rect(cx - 16, base - 32, 32, 3, c); rect(cx - 12, base - 58, 24, 2, c); rect(cx - 1, base - 92, 2, 8, c); break;
    case 'colosseum': rect(cx - 40, base - 34, 80, 34, c); for (let r = 0; r < 3; r++) for (let i = -38; i < 38; i += 7) rect(cx + i, base - 30 + r * 10, 4, 6, c2); rect(cx + 20, base - 40, 20, 6, c); break;
    case 'spire': rect(cx - 30, base - 26, 60, 26, c); rect(cx - 8, base - 50, 16, 24, c); for (let i = 0; i < 30; i++) rect(cx - 7 + i * 0.23, base - 80 + i, 14 - i * 0.46 < 1 ? 1 : 14 - (30 - i) * 0.4, 1, c); rect(cx - 30, base - 30, 60, 4, P.GR); break;
    case 'tvtower': rect(cx - 2, base - 80, 4, 80, c); disc(cx, base - 58, 8, c); rect(cx - 8, base - 59, 16, 2, lit); rect(cx - 1, base - 96, 2, 16, P.RD); break;
    case 'onion': for (const [o, s] of [[-20, 6], [0, 9], [20, 6]]) { rect(cx + o - s / 2, base - 36, s, 36, c); disc(cx + o, base - 40 - s / 2, s, [P.RD, P.GR, P.BL2][(o / 20 + 1)]); rect(cx + o, base - 52 - s, 1, 8, P.YE); } rect(cx - 36, base - 18, 72, 18, P.RD); break;
    case 'minaret': disc(cx, base - 24, 18, c); rect(cx - 22, base - 24, 44, 24, c); for (const o of [-34, 34]) { rect(cx + o - 2, base - 60, 4, 60, c); rect(cx + o - 3, base - 46, 6, 2, c2); rect(cx + o - 1, base - 66, 2, 6, c); } break;
    case 'pyramids': for (const [o, s] of [[-30, 38], [16, 30], [52, 16]]) for (let yy = 0; yy < s; yy++) { rect(cx + o - yy, base - s + yy, yy * 2, 1, night ? P.BR : P.TN); rect(cx + o, base - s + yy, yy, 1, night ? P.K : P.BR3); } break;
    case 'harbour': rect(x, base - 6, w, 6, night ? P.NV : P.BL); for (let i = 0; i < 4; i++) { const hx = x + 20 + i * 70; rect(hx, base - 9, 22, 4, P.BR); rect(hx + 8, base - 22, 1, 14, P.TN); rect(hx + 9, base - 21, 9, 11, P.RD); } rect(cx + 40, base - 90, 14, 84, c); for (let yy = base - 88; yy < base - 6; yy += 6) line(cx + 40, yy, cx + 54, yy + 6, c2); break;
    case 'tokyotower': for (let yy = 0; yy < 84; yy++) { const hw = 1 + yy * yy / 280; rect(cx - hw, base - 84 + yy, hw * 2, 1, (yy >> 3) % 2 ? P.W : P.OR); } rect(cx - 9, base - 50, 18, 3, P.W); break;
  }
}

// ---------- agent portrait for the title / files ----------
function drawAgent(sex, x, y) {
  drawFace({ sex, skin: P.SK, hair: sex === 'f' ? P.BR2 : P.BR, hairStyle: sex === 'f' ? 5 : 3, beard: 0, glasses: 0, hat: false, jacket: P.G1, tie: P.NV, eyes: 0, bg: P.BL, jaw: 0 }, x, y, 52, 64);
}

// ---------- MicroProse-flavoured title logo ----------
function drawLogo(cx, y, t) {
  const s = 'COVERT ACTION', sc = 3, w = bigW(s, sc);
  const x = cx - w / 2;
  bigText(s, x + 2, y + 2, sc, P.K);
  // metallic banding through the letters
  const tmp = sprite('logo', w + 4, 9 * sc + 4, () => {
    bigText(s, 0, 0, sc, P.W);
    g.globalCompositeOperation = 'source-atop';
    const bands = [P.W, P.G5, P.G4, P.G3, P.G4, P.G5, P.CY, P.BL3, P.BL2];
    bands.forEach((c, i) => rect(0, i * 3, w + 4, 3, c));
    g.globalCompositeOperation = 'source-over';
  });
  g.drawImage(tmp, x, y);
}
