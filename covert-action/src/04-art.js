// ===================================================================
// ART: suspect portraits, world map, city skylines, agent portrait
// ===================================================================

// ---------- dossier photo, 26x32 ----------

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
  // Mediterranean islands, Jutland and Zealand
  [[32.3, 34.7], [33, 34.6], [34, 35], [34.6, 35.7], [33.5, 35.4], [32.4, 35.1]], [[23.5, 35.3], [24.5, 35.1], [26.3, 35], [26.2, 35.3], [25, 35.45], [23.6, 35.6]],
  [[12.4, 38.1], [13.3, 38.2], [15.6, 38.3], [15.1, 37], [14.4, 36.7], [12.5, 37.6]], [[8.2, 39], [9.6, 39.1], [9.8, 40.9], [9.2, 41.25], [8.2, 40.9], [8.4, 39.8]],
  [[8.6, 41.4], [9.3, 41.4], [9.5, 42.6], [9.4, 43], [8.6, 42.3]], [[2.3, 39.5], [3.2, 39.3], [3.5, 39.7], [2.9, 39.95]],
];
const WATER = [
  [[-95, 60], [-80, 63], [-77, 55], [-82, 52], [-92, 57]], // Hudson Bay
  [[47, 45], [53, 47], [54, 42], [53, 37], [49, 38], [47, 42]], // Caspian
  [[28, 41], [28, 45], [33, 46], [38, 47], [41, 42], [36, 41.5], [30, 41]], // Black Sea
  [[32.5, 30], [33.5, 28], [35, 27.5], [37, 24], [39, 20], [41.5, 16], [43.3, 12.6], [42.5, 12.3], [40, 15.5], [38, 18.5], [36.5, 22], [35, 24], [33.5, 26.5]], // Red Sea
  [[48, 30], [50, 30], [51.5, 27.8], [54, 26.5], [56.3, 27], [56.5, 26], [56, 24.5], [54.5, 24.2], [52, 24], [51.5, 25.5], [51, 26.2], [50, 26], [49.5, 27], [48.5, 28.5]], // Persian Gulf
  [[10.5, 54.3], [14, 53.9], [18.5, 54.6], [21, 55.2], [21.2, 56.8], [23.5, 57.2], [24.3, 59.3], [29.5, 59.9], [23, 60.2], [21.6, 61], [21.5, 63.3], [25.2, 65], [25.5, 65.8], [22, 65.8], [17.5, 62.5], [17.2, 61], [18.8, 60], [16.5, 57], [14.5, 55.8], [12.8, 55.5], [11, 55.8]], // Baltic
];
const DESERTS = [[10, 23, 16], [30, 24, 10], [46, 22, 9], [60, 30, 7], [100, 42, 11], [80, 40, 7], [132, -25, 10], [20, -24, 6], [-112, 32, 6], [-70, -24, 4]];
function vnoise(x, y) { const h = (i, j) => { let n = Math.imul(i, 374761393) + Math.imul(j, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }; const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; }
const MAP = { x0: 0, y0: 8, w: 320, h: 104, lon0: -170, lat0: 78 };
function mapXY(lon, lat) { if (lon < MAP.lon0) lon += 360; return [MAP.x0 + (lon - MAP.lon0) * 0.889, MAP.y0 + (MAP.lat0 - lat) * 0.775]; }
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

// ---------- regional travel maps: a painted relief chart ----------
// Plan: a VGA flight chart lit from the upper left. Sea in 5 clean depth bands (shelf to deep, blue ->
// indigo) with a pale surf hairline and the land's cast shadow on the water; land hill-shaded from a
// smooth height field (ridges where the real ranges are), coloured by biome ramps (green lowland,
// forest, steppe, desert, rock, snow), 5 steps each, highlights warm, shadows cool. Faint 10-degree
// graticule on the sea. No dither: every pixel comes from a quantised ramp.
const regionMapCache = {};
const TRAVEL_VIEW = { europe: { lon: [-26, 46], lat: [30, 70] }, mideast: { lon: [-4, 62], lat: [12, 46] }, americas: { lon: [-122, -32], lat: [-40, 44] } };
function travelProj(region, x, y, w, h) { const V = TRAVEL_VIEW[region]; return (lon, lat) => [x + (lon - V.lon[0]) / (V.lon[1] - V.lon[0]) * w, y + (V.lat[1] - lat) / (V.lat[1] - V.lat[0]) * h]; }
// mountain ranges: lon, lat, radius lon, radius lat, height
const uiX_MOUNT = [[10, 46.3, 5, 1.2, 1], [1, 42.7, 2.6, 0.6, 0.8], [24.5, 46.2, 3.2, 1.5, 0.6], [44, 42.6, 5, 1.1, 1], [48, 33.5, 6, 2.6, 0.8], [33, 37.3, 4.5, 0.9, 0.7], [-3, 32, 6, 1.4, 0.8],
  [14, 64, 3.5, 5.5, 0.55], [20.5, 41.8, 2.5, 2.5, 0.45], [-69.5, -26, 2.6, 15, 1.2], [-76, 2, 2.4, 9, 1], [-78.5, -9, 2.2, 6, 1.1], [-102, 21, 4, 6, 0.8], [-111, 37, 6, 8, 0.9], [-120, 46, 3, 6, 0.7],
  [62, 35, 7, 2.3, 0.6], [71, 36, 5, 2.5, 1.1], [38.5, 11, 3, 4, 0.7], [44, 16, 2, 4, 0.5], [-5, 40.5, 2.5, 0.8, 0.45], [-3.5, 37.2, 2.5, 0.7, 0.5], [42.5, 39, 4, 1.8, 0.8], [53.5, 36.2, 3, 0.7, 0.8],
  [35.8, 34, 0.7, 1.6, 0.5], [-4, 57, 1.8, 1, 0.4], [14.5, 50, 3, 1, 0.3], [-64, -32, 2, 4, 0.3], [-44, -20, 4, 4, 0.3], [-80, 38, 3, 4, 0.35]];
const uiX_BIOME = { // shadow .. lit
  green: ['#2b4526', '#39582e', '#4a6e36', '#608842', '#7ea452'], forest: ['#1f3622', '#29462a', '#355832', '#44693a', '#5c8446'],
  steppe: ['#4d4a2c', '#665f37', '#827943', '#9f9453', '#bcb06a'], desert: ['#6d4f30', '#8c6a40', '#ad8a52', '#c9a767', '#e1c486'],
  rock: ['#3e3638', '#564c48', '#716558', '#8f836e', '#b3a78c'], snow: ['#7c8898', '#9aa6b6', '#bcc6d2', '#dbe2e8', '#f5f8fa'],
  tundra: ['#3e4a3e', '#546252', '#6b7a66', '#869479', '#a5b196'],
};
// islands that sit inside the WATER polygons (drawn after them)
const uiX_ISLES = [[[8.1, 55.5], [8.6, 57.1], [10.6, 57.7], [10.3, 56.4], [9.8, 55.3], [9.4, 54.4], [8.6, 54.4]], [[11, 55.4], [12.5, 55.4], [12.6, 56], [11.7, 56]], [[18.2, 57], [18.9, 57.4], [18.7, 57.9], [18.1, 57.5]]];
// fertile ground in the dry lands: the Nile, Mesopotamia, the Levant coast
const uiX_GREENS = [[31.3, 26, 0.6, 4.5], [31, 30.8, 1.5, 0.8], [44.5, 33, 2.4, 2.2], [35.8, 33.5, 1, 2.5], [-7, 33.5, 3, 1.2]];
const uiX_SEA = ['#9fd6e2', '#3f8dba', '#3480b0', '#2b70a1', '#266593', '#225b88'];
function uiX_rgbOf(c) { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
// paint LAND at fine resolution fw x fh into the current (untransformed) context; proj(lon,lat)->[fx,fy], inv(fx,fy)->[lon,lat]
function uiX_mapRender(fw, fh, proj, inv, mini) {
  const m = document.createElement('canvas'); m.width = fw; m.height = fh; const mc = m.getContext('2d'); mc.fillStyle = '#fff';
  const path = poly => { mc.beginPath(); poly.forEach(([lo, la], i) => { const [a, b] = proj(lo, la); i ? mc.lineTo(a, b) : mc.moveTo(a, b); }); mc.closePath(); mc.fill(); };
  LAND.forEach(path); mc.fillStyle = '#000'; WATER.forEach(path); mc.fillStyle = '#fff'; uiX_ISLES.forEach(path);
  const d = mc.getImageData(0, 0, fw, fh).data, N = fw * fh;
  // the source outlines are coarse polygons: warp the lookup a little so the coasts wander like real ones
  const L = new Uint8Array(N);
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
    const wx = (vnoise(x / 13, y / 13) - 0.5) * 9 + (vnoise(x / 4.5 + 31, y / 4.5) - 0.5) * 3.5, wy = (vnoise(x / 13 + 77, y / 13 + 5) - 0.5) * 9 + (vnoise(x / 4.5, y / 4.5 + 51) - 0.5) * 3.5;
    const sx = clamp(Math.round(x + wx), 0, fw - 1), sy = clamp(Math.round(y + wy), 0, fh - 1);
    L[y * fw + x] = d[(sy * fw + sx) * 4] > 127 ? 1 : 0;
  }
  // every city stands on dry land, whatever the warp did to its coast
  for (const ct of CITIES) { const [cx, cy] = proj(ct.lon, ct.lat); for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const xx = Math.round(cx) + i, yy = Math.round(cy) + j; if (i * i + j * j <= 10 && xx >= 0 && yy >= 0 && xx < fw && yy < fh) L[yy * fw + xx] = 1; } }
  const land = (x, y) => L[clamp(y, 0, fh - 1) * fw + clamp(x, 0, fw - 1)];
  // chamfer distances: sea pixels to the coast, land pixels to the sea
  const cham = (D) => {
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const i = y * fw + x; if (x) D[i] = Math.min(D[i], D[i - 1] + 1); if (y) D[i] = Math.min(D[i], D[i - fw] + 1); if (x && y) D[i] = Math.min(D[i], D[i - fw - 1] + 1.4); if (y && x < fw - 1) D[i] = Math.min(D[i], D[i - fw + 1] + 1.4); }
    for (let y = fh - 1; y >= 0; y--) for (let x = fw - 1; x >= 0; x--) { const i = y * fw + x; if (x < fw - 1) D[i] = Math.min(D[i], D[i + 1] + 1); if (y < fh - 1) D[i] = Math.min(D[i], D[i + fw] + 1); if (x < fw - 1 && y < fh - 1) D[i] = Math.min(D[i], D[i + fw + 1] + 1.4); if (y < fh - 1 && x) D[i] = Math.min(D[i], D[i + fw - 1] + 1.4); }
  };
  const DS = new Float32Array(N).fill(999), DL = new Float32Array(N).fill(999);
  for (let i = 0; i < N; i++) { if (L[i]) DS[i] = 0; else DL[i] = 0; }
  cham(DS); cham(DL);
  const [lonA] = inv(0, 0), [lonB] = inv(fw, 0), dpp = Math.abs(lonB - lonA) / fw; // degrees per fine pixel
  // height field
  const HT = new Float32Array(N), BI = new Uint8Array(N);
  const BN = ['green', 'forest', 'steppe', 'desert', 'rock', 'snow', 'tundra'];
  // height and biome are smooth fields: sample them every other pixel and fill the 2x2 block
  for (let y = 0; y < fh; y += 2) for (let x = 0; x < fw; x += 2) {
    const i = y * fw + x; if (!(L[i] || (x + 1 < fw && L[i + 1]) || (y + 1 < fh && L[i + fw]) || (x + 1 < fw && y + 1 < fh && L[i + fw + 1]))) continue;
    const [lon, lat] = inv(x + 1, y + 1);
    let r = 0; for (const [ml, mt, rx, ry, s] of uiX_MOUNT) { const q = ((lon - ml) / rx) ** 2 + ((lat - mt) / ry) ** 2; if (q < 9) r += s * Math.exp(-q); }
    const rn = (a, b) => vnoise(a * 0.8 + b * 0.6, b * 0.8 - a * 0.6) * 0.65 + vnoise(a * 1.9 - b * 0.7 + 17, b * 1.9 + a * 0.7) * 0.35; // rotated, two octaves: no grid-aligned blobs
    const n1 = rn(lon / 3.2 + 40, lat / 3.2 + 40), n2 = rn(lon / 1.1 + 9, lat / 1.1 + 9), n3 = vnoise(lon / 0.45, lat / 0.45);
    let h = 0.22 * n1 + 0.12 * n2 + 0.03 * n3 + r * (0.45 + 0.55 * n2) * (0.8 + 0.4 * n3);
    h *= Math.min(1, (DL[i] + 1) / 7);
    let dz = 0; for (const [dl, dt, rr] of DESERTS) { const q = ((lon - dl) ** 2 + (lat - dt) ** 2) / (rr * rr); if (q < 9) dz += Math.exp(-q); }
    dz += (n1 - 0.5) * 0.7 + (lat < 36 && lat > 12 && lon > -20 && lon < 65 ? 0.25 : 0);
    for (const [gl, gt, rx, ry] of uiX_GREENS) { const q = ((lon - gl) / rx) ** 2 + ((lat - gt) / ry) ** 2; if (q < 4) dz -= 1.1 * Math.exp(-q); }
    let b;
    if (lat > 64 + n1 * 4) b = 6; else if (dz > 0.6) b = 3; else if (dz > 0.34) b = 2;
    else if (rn(lon / 3.4 + 3, lat / 3.4 + 7) > 0.58 + (lat < 40 ? 0.1 : 0) || (lat > 56 && n1 > 0.42)) b = 1; else b = 0;
    if (h > 0.62) b = 4; if (h > 0.95 || (h > 0.72 && lat > 58)) b = 5;
    for (let j = 0; j < 2 && y + j < fh; j++) for (let k = 0; k < 2 && x + k < fw; k++) { HT[i + j * fw + k] = h; BI[i + j * fw + k] = b; }
  }
  // soften the height field so the hill shading reads as landforms, not grain
  { const T = new Float32Array(HT); for (let y = 1; y < fh - 1; y++) for (let x = 1; x < fw - 1; x++) { const i = y * fw + x; if (!L[i]) continue; let sum = 0, n = 0; for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) { const q = i + j * fw + k; if (L[q]) { sum += T[q]; n++; } } HT[i] = sum / n; } }
  const RAMPS = BN.map(k => uiX_BIOME[k].map(uiX_rgbOf)), SEA = uiX_SEA.map(uiX_rgbOf);
  const img = mc.createImageData(fw, fh), o = img.data, K = 0.018 / Math.max(0.02, dpp) * (mini ? 0.8 : 1);
  const put = (i, c) => { o[i * 4] = c[0]; o[i * 4 + 1] = c[1]; o[i * 4 + 2] = c[2]; o[i * 4 + 3] = 255; };
  const blend = (c, e, k) => [c[0] + (e[0] - c[0]) * k | 0, c[1] + (e[1] - c[1]) * k | 0, c[2] + (e[2] - c[2]) * k | 0];
  const deep = [14, 30, 58], grat = [150, 200, 230];
  for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
    const i = y * fw + x;
    if (L[i]) {
      const hx = HT[y * fw + Math.min(fw - 1, x + 1)] - HT[y * fw + Math.max(0, x - 1)], hy = HT[Math.min(fh - 1, y + 1) * fw + x] - HT[Math.max(0, y - 1) * fw + x];
      let s = -(hx + hy) / K * 0.5;
      let lv = clamp(Math.round(2 + s * 2.4), 0, 4);
      // coast rim: the lit side catches the light, the far side falls into shade
      if (!land(x - 1, y) || !land(x, y - 1)) lv = 4; else if (!land(x + 1, y) || !land(x, y + 1)) lv = 0;
      put(i, RAMPS[BI[i]][lv]);
    } else {
      const dd = DS[i];
      let c = dd <= 1.2 ? SEA[0] : dd < 4 ? SEA[1] : dd < 9 ? SEA[2] : dd < 20 ? SEA[3] : dd < 40 ? SEA[4] : SEA[5];
      if (land(x - 3, y - 3) && dd < 5) c = blend(c, deep, 0.5); // the land's shadow on the water
      else if (dd > 1.2) {
        const [lon, lat] = inv(x + 0.5, y + 0.5), step = 10, h2 = dpp * 0.55;
        if (Math.abs(lon - Math.round(lon / step) * step) < h2 || Math.abs(lat - Math.round(lat / step) * step) < h2) c = blend(c, grat, 0.16);
      }
      put(i, c);
    }
  }
  g.putImageData(img, 0, 0);
}
// the airliner on the flight map, drawn along its heading
function uiX_planeF(cx, cy, ang, shadow) {
  g.save(); g.translate(cx, cy); g.rotate(ang);
  const P_ = (pts, c) => uiX_poly(pts, c);
  const body = [[13, 0], [11, -1.9], [-9, -1.9], [-12.5, -0.9], [-12.5, 0.9], [-9, 1.9], [11, 1.9]];
  const wingL = [[3.5, -1.6], [-3.5, -12.5], [-6.8, -12.5], [-3.2, -1.6]], wingR = wingL.map(([a, b]) => [a, -b]);
  const tailL = [[-8.2, -1.2], [-11.8, -5.8], [-13.6, -5.8], [-11.6, -1.2]], tailR = tailL.map(([a, b]) => [a, -b]);
  if (shadow) { for (const s of [body, wingL, wingR, tailL, tailR]) P_(s, 'rgba(5,15,30,0.4)'); g.restore(); return; }
  g.lineJoin = 'round';
  for (const s of [wingL, wingR, tailL, tailR, body]) { g.strokeStyle = '#1b2531'; g.lineWidth = 1.6; g.beginPath(); s.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.stroke(); }
  P_(wingL, '#e9edf1'); P_(wingR, '#a9b4bf'); P_(tailL, '#e9edf1'); P_(tailR, '#a9b4bf');
  P_(body, '#f5f7f8'); P_([[11, 0.2], [-12.5, 0.2], [-12.5, 0.9], [-9, 1.9], [11, 1.9]], '#b7c1ca');
  rect(-2.5, -7.5, 3, 2, '#7b8792'); rect(-2.5, 5.5, 3, 2, '#6a7580'); rect(9, -1, 2, 2, '#2c4968');
  rect(-12.5, -0.6, 4, 1.2, '#c0392b');
  g.restore();
}
function drawRegionMap(region, x, y, w, h, here, dests, selCity, flying, t) {
  const V = TRAVEL_VIEW[region]; t = t || 0;
  const proj = travelProj(region, x, y, w, h), key = region + w + 'x' + h;
  const c = regionMapCache[key] || (regionMapCache[key] = art('uiX_region' + key, w, h, () => uiX_mapRender(w * 2, h * 2,
    (lo, la) => [(lo - V.lon[0]) / (V.lon[1] - V.lon[0]) * w * 2, (V.lat[1] - la) / (V.lat[1] - V.lat[0]) * h * 2],
    (fx, fy) => [V.lon[0] + fx / (w * 2) * (V.lon[1] - V.lon[0]), V.lat[1] - fy / (h * 2) * (V.lat[1] - V.lat[0])])));
  blit(c, x, y);
  const pos = ct => ct.hq ? [x + 4, y + h / 2] : proj(ct.lon, ct.lat);
  const hqShown = here.hq || (dests.some(d => d.hq) && selCity && selCity.hq);
  fine(() => {
    g.save(); g.beginPath(); g.rect(x * 2, y * 2, w * 2, h * 2); g.clip();
    // a vignette so the edges of the chart fall away
    g.fillStyle = uiX_rg((x + w / 2) * 2, (y + h / 2) * 2, h * 0.7, h * 1.35, ['rgba(4,8,20,0)', 'rgba(4,8,20,0.45)']); g.fillRect(x * 2, y * 2, w * 2, h * 2);
    if (flying) {
      const a = pos(here), b = pos(flying.to), k = Math.min(1, flying.t), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const cxp = (a[0] + b[0]) / 2, cyp = (a[1] + b[1]) / 2 - len * 0.28;
      const at = u => [(1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * cxp + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * cyp + u * u * b[1]];
      const n = Math.max(12, len | 0);
      for (let i = 0; i <= n; i++) { const u = i / n, [qx, qy] = at(u); if (u <= k) { if (i % 2 === 0) { rect(qx * 2 - 1, qy * 2 - 1, 2, 2, '#ffd35c'); } } else if (i % 3 === 0) rect(qx * 2 - 0.5, qy * 2 - 0.5, 1.5, 1.5, 'rgba(240,240,230,0.7)'); }
      const [jx, jy] = at(k), [nx, ny] = at(Math.min(1, k + 0.01)), [ox, oy] = at(Math.max(0, k - 0.01)), ang = Math.atan2(ny - oy, nx - ox), alt = Math.sin(k * Math.PI) * 9 + 2;
      uiX_planeF(jx * 2 + alt, jy * 2 + alt * 1.2, ang, true); uiX_planeF(jx * 2, jy * 2, ang);
      if ((t * 4 | 0) % 2) uiX_ledF(jx * 2 - Math.cos(ang) * 12, jy * 2 - Math.sin(ang) * 12, 1, '#ff4a3a');
    }
    // cities: a dark-rimmed dot; home glows amber, the pick pulses cyan
    for (const ct of [here, ...dests]) {
      if (ct.hq) continue; const [cx, cy] = proj(ct.lon, ct.lat), sel = selCity === ct, me = ct === here, X = cx * 2, Y = cy * 2;
      if (sel) { const q = (t * 1.3) % 1; g.strokeStyle = 'rgba(134,224,238,' + (1 - q).toFixed(2) + ')'; g.lineWidth = 1.5; g.beginPath(); g.arc(X, Y, 5 + q * 12, 0, Math.PI * 2); g.stroke(); }
      if (me) { g.fillStyle = uiX_rg(X, Y, 0, 10, ['rgba(255,200,80,0.6)', 'rgba(255,200,80,0)']); g.fillRect(X - 10, Y - 10, 20, 20); }
      uiX_circ(X + 1, Y + 1, 3.6, 'rgba(0,10,25,0.55)'); uiX_circ(X, Y, 3.4, '#101820'); uiX_circ(X, Y, 2.3, me ? '#ffc94a' : sel ? '#86e0ee' : '#f3efe2'); rect(X - 1, Y - 1, 1, 1, '#ffffff');
    }
    if (hqShown) { const cy = (y + h / 2) * 2; uiX_poly([[x * 2 + 3, cy], [x * 2 + 11, cy - 6], [x * 2 + 11, cy + 6]], '#101820'); uiX_poly([[x * 2 + 5, cy], [x * 2 + 10, cy - 4], [x * 2 + 10, cy + 4]], selCity && selCity.hq ? '#86e0ee' : '#f3efe2'); }
    g.restore();
  });
  const label = (s, cx, cy, col) => {
    const tw = textW(s); let lx = cx + 5; if (lx + tw > x + w - 3) lx = cx - 6 - tw;
    fine(() => { const X = (lx - 3) * 2, Y = (cy - 5) * 2, Wd = (tw + 6) * 2, Hh = 22; g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(X + 2, Y + 2, Wd, Hh); g.fillStyle = 'rgba(10,16,28,0.86)'; g.fillRect(X, Y, Wd, Hh); rect(X, Y, Wd, 1, 'rgba(255,255,255,0.22)'); rect(X, Y, 2, Hh, col); });
    text(s, lx, cy - 3, col);
  };
  let hy_ = null; if (!here.hq) { const [hx, hy] = proj(here.lon, here.lat); hy_ = [hx, hy]; label(here.name, hx, hy, '#ffc94a'); }
  if (selCity && !selCity.hq && selCity !== here) { let [cx, cy] = proj(selCity.lon, selCity.lat); if (hy_ && Math.abs(cy - hy_[1]) < 11 && Math.abs(cx - hy_[0]) < 70) cy = hy_[1] + (cy >= hy_[1] ? 11 : -11); label(selCity.name, cx, cy, uiX_T.cyan); }
  if (hqShown) label('Washington', x + 3, y + h / 2 | 0, selCity && selCity.hq ? uiX_T.cyan : here.hq ? '#ffc94a' : '#f3efe2');
}

// ---------- vacation snapshots ----------
