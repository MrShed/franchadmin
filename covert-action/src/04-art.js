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

// ---------- title / character art ----------

// ---------- the small framed city picture on the city menu ----------

// ---------- CIA floors ----------

// ---------- buildings: townhouse (hideout), glass office, tower (active cel), stucco safehouse (agent) ----------
// watching through binoculars

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
