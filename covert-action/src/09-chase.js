// ===================================================================
// CAR CHASE: City Map (left), Windshield + dashboard (top right),
// City Close-Up (bottom right). Tail the suspect, or ram him head-on.
// ===================================================================
const CARS = [
  { name: 'Countach', speed: 80, handling: 'Excellent', consp: 'High', tracking: true, col: P.W, body: 'wedge' },
  { name: 'Coupe', speed: 80, handling: 'Excellent', consp: 'Low', tracking: false, col: P.G1, body: 'wedge' },
  { name: 'Sports car', speed: 80, handling: 'Fair', consp: 'Moderate', tracking: true, col: P.GR2, body: 'wedge' },
  { name: 'Hatchback', speed: 40, handling: 'Excellent', consp: 'Low', tracking: true, col: P.CY, body: 'box' },
];
const CONSP = { Low: 0.6, Moderate: 1, High: 1.5, Extreme: 2.2 };


// ---------- chase art helpers (prefix chX_) ----------
// Plan (garage): four showroom bays stacked in 50-px bands. Key light is a warm tungsten spot over each car
// (only the selected bay is lit; the others sit in a cool blue gloom), fill is cold blue bounce from the
// wall, rim light comes off the polished floor. Cars are OutRun-style glossy side views: sky-reflection
// band above the shoulder crease, a dark horizon line, deepening towards the sill, hard specular streaks.
// Ramps (6 steps, shadows purple-blue, highlights warm): red hero, midnight coupe, yellow GT, teal hatch.
function chX_h(a, b, c) { let h = (a * 374761393 + b * 668265263 + c * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; }
// body ramps: deep, dark, mid, light, high, spec
const chX_PAINT = {
  Countach: ['#2a0718', '#6e0c1e', '#b81c22', '#e8452a', '#ff9a5c', '#fff2d2'],
  Coupe: ['#07080f', '#151a2a', '#262f47', '#465374', '#8494b8', '#e6eeff'],
  'Sports car': ['#6a3018', '#b8680e', '#eca81c', '#ffd23e', '#fff39a', '#ffffff'],
  Hatchback: ['#0c2230', '#1a4a5c', '#2f7d8c', '#5cb4b8', '#aee6d8', '#ffffff'],
};
const chX_paintOf = c => chX_PAINT[c && c.name] || chX_PAINT.Coupe;
const chX_CHROME = ['#3a4050', '#7a8294', '#c4cad8', '#f4f7ff'];
function chX_path(pts) { // closed polygon with per-corner radii: [x, y, r]
  const n = pts.length; g.beginPath();
  const a = pts[n - 1], b = pts[0]; g.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; if (p[2]) g.arcTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, p[2]); else g.lineTo(p[0], p[1]); }
  g.closePath();
}
function chX_fillPath(pts, col) { chX_path(pts); g.fillStyle = col; g.fill(); }
// banded vertical gradient: stops [[t, colour], ...], quantised to `steps` bands per segment
function chX_bands(x, y, w, h, stops, steps = 6) {
  for (let yy = 0; yy < h; yy++) {
    const t = yy / Math.max(1, h - 1); let i = 0; while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
    const [t0, c0] = stops[i], [t1, c1] = stops[i + 1], k = Math.max(0, Math.min(1, (t - t0) / Math.max(1e-6, t1 - t0)));
    g.fillStyle = mix(c0, c1, Math.round(k * steps) / steps); g.fillRect(x, y + yy, w, 1);
  }
}
function chX_radial(cx, cy, r, stops, sy = 1) { // soft light pool (ellipse when sy != 1)
  g.save(); g.translate(cx, cy); g.scale(1, sy); const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
  for (const [t, c] of stops) gr.addColorStop(t, c); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.restore();
}
function chX_circ(cx, cy, r, col) { g.fillStyle = col; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); }
function chX_arcS(cx, cy, r, a0, a1, col, w) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke(); }
function chX_seg(x0, y0, x1, y1, col, w = 1) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
function chX_streak(x, y, len, col, a = 1) { // tapered horizontal specular streak
  const gr = g.createLinearGradient(x, 0, x + len, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.3, col); gr.addColorStop(0.75, col); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.save(); g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x, y, len, 1); g.restore();
}

// ---------- side-view cars (art 116 x 38 layout; fine canvas 232 x 76, wheels touch y = 68) ----------
const chX_CARDEF = {
  Countach: { // ultra-low wedge: angular arches, NACA duct, rear wing, "telephone dial" wheels
    body: [[2, 43, 3], [86, 30, 3], [114, 15, 6], [142, 14, 7], [206, 22, 4], [228, 25, 3], [230, 46, 3], [225, 58, 3], [8, 58, 4], [2, 51, 2]],
    glass: [[92, 31, 1], [115, 17, 4], [139, 16, 4], [151, 24, 2], [156, 32, 1]], pillar: [131, 4],
    belt: 36, wheels: [46, 184], arch: 'square', rim: 'dial', glint: [[4, 42], [86, 29], [114, 14], [142, 13], [206, 21], [228, 24]],
  },
  Coupe: { // long-nosed notchback grand tourer, chrome bumpers and window trim
    body: [[2, 36, 3], [9, 31, 4], [80, 28, 3], [103, 12, 6], [150, 12, 6], [172, 26, 4], [219, 27, 3], [229, 30, 2], [230, 50, 3], [226, 58, 3], [6, 58, 3], [2, 50, 2]],
    glass: [[85, 28, 1], [104, 14, 4], [148, 14, 4], [167, 28, 1]], pillar: [131, 5],
    belt: 34, wheels: [46, 182], arch: 'round', rim: 'mesh', chrome: true, glint: [[3, 35], [80, 27], [103, 11], [150, 11], [172, 25], [228, 29]],
  },
  'Sports car': { // long bonnet, fastback roof, side gills and twin pinstripes
    body: [[2, 41, 4], [72, 30, 5], [94, 28, 2], [118, 11, 9], [140, 11, 7], [206, 26, 7], [228, 30, 3], [230, 48, 3], [224, 58, 3], [8, 58, 4], [2, 52, 3]],
    glass: [[98, 28, 1], [120, 13, 6], [139, 13, 4], [172, 24, 3], [177, 28, 1]], pillar: [141, 4],
    belt: 34, wheels: [48, 182], arch: 'round', rim: 'star', stripe: true, glint: [[3, 40], [72, 29], [118, 10], [140, 10], [206, 25], [228, 29]],
  },
  Hatchback: { // tall two-box hot hatch, big glasshouse, black bumpers with a red pinstripe
    body: [[2, 34, 3], [52, 28, 3], [62, 27, 1], [86, 5, 4], [176, 5, 4], [201, 20, 5], [212, 26, 3], [214, 50, 3], [210, 58, 3], [6, 58, 3], [2, 50, 2]],
    glass: [[66, 26, 1], [88, 8, 2], [174, 8, 2], [195, 22, 2], [197, 26, 1]], pillar: [118, 4], cpillar: [164, 12],
    belt: 32, wheels: [44, 170], arch: 'round', rim: 'pepper', bumpers: true, glint: [[3, 33], [52, 27], [86, 4], [176, 4], [201, 19], [212, 25]],
  },
};
function chX_wheel(cx, cy, style) {
  chX_circ(cx, cy, 14, '#131219');
  chX_arcS(cx, cy, 12.3, Math.PI * 1.05, Math.PI * 1.6, '#4a4858', 1.4); // sidewall catches the key light
  chX_arcS(cx, cy, 12.3, Math.PI * 0.1, Math.PI * 0.55, '#24222c', 1.2);
  // rim: silver dish, cool lower-right, warm upper-left
  chX_circ(cx, cy, 9.5, '#2a2e3a'); chX_circ(cx - 0.4, cy - 0.4, 8.8, '#8c93a6');
  g.save(); g.beginPath(); g.arc(cx, cy, 8.8, 0, Math.PI * 2); g.clip();
  chX_circ(cx + 2, cy + 2, 8.5, '#5c6276'); chX_circ(cx - 1.2, cy - 1.2, 7.4, '#b8bfcf'); chX_circ(cx - 0.6, cy - 0.6, 6.2, '#9aa1b3');
  if (style === 'dial') { for (let k = 0; k < 5; k++) { const a = k * 1.2566 - 1.3; chX_circ(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, 2.1, '#1c1e28'); chX_arcS(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, 2.1, Math.PI * 0.1, Math.PI * 0.9, '#dfe4ef', 0.8); } }
  else if (style === 'mesh') { for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; chX_seg(cx + Math.cos(a) * 2.6, cy + Math.sin(a) * 2.6, cx + Math.cos(a + 0.5) * 8, cy + Math.sin(a + 0.5) * 8, '#4a5062', 0.9); chX_seg(cx + Math.cos(a) * 2.6, cy + Math.sin(a) * 2.6, cx + Math.cos(a - 0.5) * 8, cy + Math.sin(a - 0.5) * 8, '#4a5062', 0.9); } chX_arcS(cx, cy, 8, 0, Math.PI * 2, '#e6eaf4', 0.9); }
  else if (style === 'star') { for (let k = 0; k < 5; k++) { const a = k * 1.2566 - Math.PI / 2; g.save(); g.translate(cx, cy); g.rotate(a); g.fillStyle = '#3a3e4c'; g.beginPath(); g.moveTo(3, -2.8); g.lineTo(8.4, -4.6); g.arc(0, 0, 8.4, -0.55, 0.55); g.lineTo(3, 2.8); g.closePath(); g.fill(); g.restore(); } }
  else { for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.6; chX_circ(cx + Math.cos(a) * 5.4, cy + Math.sin(a) * 5.4, 1.7, '#1c1e28'); } chX_circ(cx, cy, 3.6, '#d4d9e4'); }
  g.restore();
  chX_circ(cx, cy, 2.2, '#40465a'); chX_circ(cx - 0.5, cy - 0.5, 1.3, '#e8ecf6');
  chX_arcS(cx, cy, 8.8, Math.PI * 1.1, Math.PI * 1.45, '#ffffff', 1); // rim-lip glint
}
function chX_paintCar(c, P6) {
  const D = chX_CARDEF[c.name] || chX_CARDEF.Coupe, [deep, dark, mid, lite, high, spec] = P6 || chX_paintOf(c);
  const top = Math.min(...D.body.map(p => p[1])), bel = D.belt;
  // contact shadow
  chX_radial(116, 68, 112, [[0, 'rgba(4,4,12,0.85)'], [0.75, 'rgba(4,4,12,0.55)'], [1, 'rgba(4,4,12,0)']], 0.055);
  // wing sits behind the body line
  if (c.name === 'Countach') {
    chX_fillPath([[196, 23, 0], [199, 13, 0], [202, 13, 0], [201, 23, 0]], deep); chX_fillPath([[214, 25, 0], [217, 13, 0], [220, 13, 0], [219, 25, 0]], deep);
    chX_fillPath([[188, 10, 2], [226, 9, 2], [229, 13, 2], [191, 15, 2]], mid); chX_seg(190, 10.5, 226, 9.5, high, 1.2); chX_seg(192, 14.5, 228, 13, deep, 1);
  }
  // ---- body paint, clipped to the silhouette ----
  g.save(); chX_path(D.body); g.clip();
  chX_bands(0, top, 232, bel - top + 1, [[0, high], [0.35, lite], [1, mid]], 4);
  g.fillStyle = spec; g.fillRect(0, bel - 1, 232, 1); // shoulder crease catches the light
  chX_bands(0, bel, 232, 3, [[0, lite], [1, mid]], 2);
  chX_bands(0, bel + 3, 232, 60 - bel, [[0, dark], [0.18, mid], [0.55, dark], [0.85, deep], [1, deep]], 5);
  // floor bounce along the sill
  g.fillStyle = mix(dark, '#8a6a58', 0.25); g.fillRect(0, 55, 232, 1);
  // front/rear ends turn away from the light
  const x0 = D.body[0][0], x1 = Math.max(...D.body.map(p => p[0]));
  const ge = g.createLinearGradient(x0, 0, x0 + 14, 0); ge.addColorStop(0, 'rgba(250,240,220,0.35)'); ge.addColorStop(1, 'rgba(250,240,220,0)'); g.fillStyle = ge; g.fillRect(x0, 0, 14, 76);
  const gr = g.createLinearGradient(x1 - 16, 0, x1, 0); gr.addColorStop(0, 'rgba(20,6,40,0)'); gr.addColorStop(1, 'rgba(20,6,40,0.45)'); g.fillStyle = gr; g.fillRect(x1 - 16, 0, 16, 76);
  // wheel arches: dark wells cut into the body
  for (const wx of D.wheels) {
    g.fillStyle = '#0a0a12';
    if (D.arch === 'square') { chX_path([[wx - 21, 60, 0], [wx - 15, 38, 3], [wx + 15, 38, 3], [wx + 21, 60, 0]]); g.fill(); }
    else { g.beginPath(); g.arc(wx, 54, 17.5, 0, Math.PI * 2); g.fill(); }
  }
  g.restore();
  // arch lips: a lit edge on the rear-facing half, a shadow line on top
  for (const wx of D.wheels) {
    if (D.arch === 'square') { chX_seg(wx - 15, 37.5, wx + 15, 37.5, deep, 1); chX_seg(wx + 15.5, 38.5, wx + 21, 58, lite, 1); chX_seg(wx - 21, 58, wx - 15.5, 38.5, dark, 1); }
    else { chX_arcS(wx, 54, 18, Math.PI * 1.08, Math.PI * 1.92, deep, 1.2); chX_arcS(wx, 54, 18.4, Math.PI * 1.55, Math.PI * 1.95, lite, 0.9); }
  }
  // ---- glasshouse ----
  g.save(); chX_path(D.glass); g.clip();
  const gt = Math.min(...D.glass.map(p => p[1])), gb = Math.max(...D.glass.map(p => p[1]));
  chX_bands(0, gt, 232, gb - gt + 1, [[0, '#9fb8d8'], [0.25, '#4a6a98'], [0.6, '#1c2a4a'], [1, '#101626']], 5);
  // interior: seat back and headrest in silhouette
  const sx = D.pillar[0] - 12; chX_fillPath([[sx - 6, gb + 2, 0], [sx - 4, gt + 6, 2], [sx + 4, gt + 5, 2], [sx + 6, gb + 2, 0]], '#0a0d18');
  // diagonal sky reflections sweeping across the glass
  g.globalAlpha = 0.5; for (const [ox, w] of [[D.glass[1][0] + 4, 7], [D.glass[1][0] + 16, 3], [D.pillar[0] + 10, 5]]) { g.fillStyle = '#d8ecff'; g.beginPath(); g.moveTo(ox, gt - 2); g.lineTo(ox + w, gt - 2); g.lineTo(ox + w - 20, gb + 2); g.lineTo(ox - 20, gb + 2); g.closePath(); g.fill(); }
  g.globalAlpha = 1; g.restore();
  // pillars and trim
  const [pX, pW] = D.pillar; g.save(); chX_path(D.glass); g.clip();
  g.fillStyle = D.chrome ? '#10131c' : dark; g.fillRect(pX, 0, pW, 76); g.fillStyle = D.chrome ? '#2a3042' : mid; g.fillRect(pX, 0, 1, 76);
  if (D.cpillar) { g.fillStyle = mid; g.fillRect(D.cpillar[0], 0, D.cpillar[1], 76); g.fillStyle = lite; g.fillRect(D.cpillar[0], 0, 1, 76); g.fillStyle = dark; g.fillRect(D.cpillar[0] + D.cpillar[1] - 1, 0, 1, 76); }
  g.restore();
  chX_path(D.glass); g.strokeStyle = D.chrome ? '#dfe5f2' : '#141620'; g.lineWidth = D.chrome ? 1 : 1.2; g.stroke();
  chX_seg(D.glass[0][0], D.glass[0][1] + 1, D.glass[D.glass.length - 1][0], D.glass[D.glass.length - 1][1] + 1, D.chrome ? '#f4f7ff' : '#141620', 1); // window sill
  // ---- door shut lines, handle, mirror ----
  const dF = D.glass[0][0] - 3, dR = D.pillar[0] + (c.name === 'Hatchback' ? 0 : 8);
  for (const dx of [dF, dR]) { chX_seg(dx + 0.5, bel + 1, dx - 1.5, 57, deep, 1); chX_seg(dx + 1.5, bel + 2, dx - 0.5, 56, mix(mid, lite, 0.5), 0.7); }
  if (c.name !== 'Countach') { g.fillStyle = '#12141c'; g.fillRect(dR - 12, bel + 3, 7, 2); g.fillStyle = D.chrome ? '#e8eefc' : lite; g.fillRect(dR - 12, bel + 3, 7, 1); }
  const mx = D.glass[0][0] + 3; chX_fillPath([[mx, bel - 7, 2], [mx + 8, bel - 8, 2], [mx + 9, bel - 3, 1], [mx + 1, bel - 3, 1]], mid); chX_seg(mx + 1, bel - 7.5, mx + 7, bel - 8.2, high, 1); chX_fillPath([[mx + 3, bel - 3, 0], [mx + 6, bel - 3, 0], [mx + 5, bel, 0], [mx + 3, bel, 0]], deep);
  // ---- per-model detail ----
  if (c.name === 'Countach') {
    chX_fillPath([[136, 35, 0], [166, 35, 1], [166, 43, 1]], '#15060e'); chX_seg(137, 35.5, 165, 35.5, spec, 0.8); chX_seg(140, 36.6, 165, 42.4, lite, 0.8); // NACA duct
    g.fillStyle = '#1a1620'; g.fillRect(64, 53, 100, 5); g.fillStyle = '#3a3440'; g.fillRect(64, 53, 100, 1); // sill cover
    g.fillStyle = '#1a1620'; chX_fillPath([[3, 50, 1], [26, 54, 0], [26, 58, 0], [8, 58, 2], [3, 54, 1]], '#1a1620'); // chin spoiler
    g.fillStyle = '#ffb030'; g.fillRect(4, 44, 9, 2); g.fillStyle = '#fff0b0'; g.fillRect(5, 44, 4, 1); // slit indicator
    for (let q = 0; q < 4; q++) { g.fillStyle = '#12060c'; g.fillRect(160 + q * 9, 20 + q * 0.9, 6, 1.4); } // engine-cover slats
    chX_fillPath([[221, 28, 1], [229, 28, 1], [230, 40, 1], [222, 40, 1]], '#5a0610'); g.fillStyle = '#ff3a30'; g.fillRect(223, 29, 6, 4); g.fillStyle = '#ffb08a'; g.fillRect(224, 29, 3, 1); g.fillStyle = '#ff9a20'; g.fillRect(223, 35, 6, 3);
  } else if (c.name === 'Coupe') {
    for (const [bx, w] of [[0, 12], [220, 12]]) { chX_bands(bx, 44, w, 7, [[0, chX_CHROME[3]], [0.4, chX_CHROME[2]], [0.6, chX_CHROME[0]], [1, chX_CHROME[1]]], 3); }
    g.fillStyle = '#0c0e16'; g.fillRect(12, 45, 208, 3); g.fillStyle = '#c4cad8'; g.fillRect(12, 45, 208, 1); // rubbing strip with chrome
    chX_fillPath([[2, 36, 1], [10, 35, 1], [10, 42, 1], [2, 42, 1]], '#fff2c8'); g.fillStyle = '#ffffff'; g.fillRect(3, 37, 3, 2); g.fillStyle = '#ff9a20'; g.fillRect(3, 42, 6, 2);
    chX_fillPath([[222, 31, 1], [229, 31, 1], [230, 42, 1], [222, 42, 1]], '#b01820'); g.fillStyle = '#ff5a40'; g.fillRect(223, 32, 6, 3); g.fillStyle = '#ffb090'; g.fillRect(224, 32, 3, 1);
  } else if (c.name === 'Sports car') {
    g.fillStyle = '#16100a'; g.fillRect(8, 41, 214, 1.6); g.fillRect(8, 44, 214, 1.6); // pinstripes
    for (let q = 0; q < 3; q++) { chX_fillPath([[70 + q * 6, 36, 1], [74 + q * 6, 36, 1], [72 + q * 6, 46, 1], [68 + q * 6, 46, 1]], '#1a0e08'); chX_seg(74.5 + q * 6, 36.5, 72.5 + q * 6, 45.5, high, 0.7); } // wing gills
    chX_seg(6, 39.5, 34, 35.5, deep, 1); chX_seg(6, 40.5, 34, 36.5, spec, 0.7); // pop-up lamp lid
    g.fillStyle = '#ff9a20'; g.fillRect(3, 46, 7, 2);
    chX_fillPath([[220, 32, 1], [229, 32, 1], [230, 40, 1], [221, 40, 1]], '#6a0a10'); g.fillStyle = '#ff3a30'; g.fillRect(222, 33, 6, 3); g.fillStyle = '#ffb08a'; g.fillRect(223, 33, 3, 1);
    chX_fillPath([[204, 26, 1], [228, 28, 1], [229, 31, 1], [206, 29, 1]], dark); chX_seg(205, 26.5, 227, 28.5, lite, 0.8); // duck-tail spoiler
  } else {
    for (const [bx, w] of [[0, 12], [204, 12]]) { chX_fillPath([[bx, 42, 2], [bx + w, 42, 1], [bx + w, 50, 1], [bx, 50, 2]], '#15161c'); g.fillStyle = '#3a3c48'; g.fillRect(bx + 1, 42, w - 1, 1); g.fillStyle = '#d0202a'; g.fillRect(bx + 1, 45, w - 1, 1); }
    g.fillStyle = '#15161c'; g.fillRect(12, 45, 192, 3); g.fillStyle = '#d0202a'; g.fillRect(12, 46, 192, 1); // side rubbing strip, GTI red line
    chX_fillPath([[2, 33, 1], [9, 33, 1], [9, 40, 1], [2, 40, 1]], '#fff2c8'); g.fillStyle = '#ffffff'; g.fillRect(3, 34, 3, 2); g.fillStyle = '#ff9a20'; g.fillRect(3, 40, 5, 2);
    chX_fillPath([[206, 27, 1], [213, 27, 1], [214, 39, 1], [206, 39, 1]], '#b01820'); g.fillStyle = '#ff5a40'; g.fillRect(207, 28, 6, 3); g.fillStyle = '#ffb090'; g.fillRect(208, 28, 3, 1);
    chX_seg(92, 6, 108, -8, '#2a2c38', 1); // radio aerial
    chX_seg(186, 17, 196, 21, '#141620', 1.2); // rear wiper
  }
  // ---- specular highlights: long streaks along the upper band, clipped to the paint ----
  g.save(); chX_path(D.body); g.clip();
  chX_streak(x0 + 14, bel - 4, 60, spec, 0.9); chX_streak(x0 + 36, bel - 2, 34, spec, 0.6);
  chX_streak(x1 - 76, bel - 3, 48, spec, 0.75); chX_streak(x0 + 40, bel + 8, 110, lite, 0.35); g.restore();
  // wheels in front of the wells
  for (const wx of D.wheels) chX_wheel(wx, 54, D.rim);
}
function chX_carArt(c) { return art('chX:car:' + c.name, 116, 38, () => chX_paintCar(c)); }
function drawCarSide(x, y, c) { blit(chX_carArt(c), Math.round(x), Math.round(y)); }

// ---------- garage bay for the car-select screen (320 x 50, car drawn at 12, 4) ----------
function chX_bay(i, lit, c) {
  return art('chX:bay' + i + (lit ? 'L' : 'D'), W, 50, () => {
    const F = 2, wall = lit ? ['#20283c', '#2c3650', '#3a4462'] : ['#0e1220', '#141a2c', '#1a2236'];
    // back wall: vertical steel panels, cool fill light; a darker dado below
    chX_bands(0, 0, 640, 76, [[0, wall[0]], [0.6, wall[1]], [1, wall[2]]], 6);
    for (let x = 16; x < 300; x += 44) { g.fillStyle = 'rgba(0,0,10,0.35)'; g.fillRect(x, 0, 2, 76); g.fillStyle = 'rgba(160,190,255,0.10)'; g.fillRect(x + 2, 0, 1, 76); }
    g.fillStyle = lit ? '#1a2032' : '#0a0e18'; g.fillRect(0, 58, 292, 18); g.fillStyle = lit ? '#4a5678' : '#1e263a'; g.fillRect(0, 58, 292, 1);
    // key light: tungsten spot from the ceiling, banded cone on the wall
    if (lit) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 7; k++) { const a = 0.05 + k * 0.012; g.fillStyle = 'rgba(255,190,110,' + a.toFixed(3) + ')'; g.beginPath(); const s = 1 - k / 7; g.moveTo(132 - 24 * s, 4); g.lineTo(132 + 24 * s, 4); g.lineTo(132 + 130 * s, 76); g.lineTo(132 - 130 * s, 76); g.closePath(); g.fill(); }
      chX_radial(132, 50, 120, [[0, 'rgba(255,200,130,0.28)'], [0.5, 'rgba(255,170,100,0.10)'], [1, 'rgba(255,160,90,0)']], 0.45);
      g.restore();
    }
    // lamp fixture
    chX_fillPath([[112, 0, 0], [152, 0, 0], [146, 5, 2], [118, 5, 2]], lit ? '#3a3e4a' : '#1a1c26'); g.fillStyle = lit ? '#fff4d8' : '#3a3c4a'; g.fillRect(120, 4, 24, 2);
    if (lit) { g.fillStyle = '#ffffff'; g.fillRect(124, 5, 16, 1); }
    // bay number: stencilled on an enamel plate beside the car
    const px0 = 258, py0 = 10;
    chX_fillPath([[px0, py0, 3], [px0 + 30, py0, 3], [px0 + 30, py0 + 38, 3], [px0, py0 + 38, 3]], lit ? '#c8a040' : '#3a3424');
    chX_fillPath([[px0 + 2, py0 + 2, 2], [px0 + 28, py0 + 2, 2], [px0 + 28, py0 + 36, 2], [px0 + 2, py0 + 36, 2]], lit ? '#20180c' : '#100e0a');
    for (const [rx, ry] of [[px0 + 4, py0 + 4], [px0 + 26, py0 + 4], [px0 + 4, py0 + 34], [px0 + 26, py0 + 34]]) chX_circ(rx, ry, 1, lit ? '#e8c870' : '#4a4430');
    // polished floor: dark, with the car's reflection and a warm pool under the light
    chX_bands(0, 76, 640, 16, [[0, lit ? '#2a2a36' : '#101218'], [1, lit ? '#14141c' : '#08090e']], 4);
    g.fillStyle = lit ? '#6a6070' : '#22242e'; g.fillRect(0, 76, 292, 1);
    for (let x = 40; x < 292; x += 80) { g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.moveTo(x, 77); g.lineTo(x + 2, 77); g.lineTo(x + 2 + (x - 146) * 0.25, 92); g.lineTo(x + (x - 146) * 0.25, 92); g.fill(); }
    if (lit) { g.save(); g.globalCompositeOperation = 'lighter'; chX_radial(140, 82, 120, [[0, 'rgba(255,190,120,0.30)'], [0.6, 'rgba(255,160,100,0.10)'], [1, 'rgba(255,160,90,0)']], 0.12); g.restore(); }
    const car = chX_carArt(c);
    g.save(); g.beginPath(); g.rect(0, 77, 292, 15); g.clip(); g.globalAlpha = lit ? 0.3 : 0.16; g.translate(24, 76 + 68 * 0.55); g.scale(1, -0.55); g.drawImage(car, 0, 0); g.restore();
    const fg = g.createLinearGradient(0, 77, 0, 92); fg.addColorStop(0, 'rgba(8,8,14,0)'); fg.addColorStop(1, lit ? 'rgba(10,10,18,0.8)' : 'rgba(6,6,10,0.9)'); g.fillStyle = fg; g.fillRect(0, 77, 292, 15);
    // the car itself; unlit bays sink into a cool gloom
    g.drawImage(car, 24, 8);
    if (!lit) { g.fillStyle = 'rgba(8,12,30,0.5)'; g.fillRect(0, 0, 292, 92); }
    else { g.save(); g.globalCompositeOperation = 'lighter'; chX_radial(130, 30, 110, [[0, 'rgba(255,190,120,0.10)'], [1, 'rgba(255,190,120,0)']], 0.4); g.restore(); }
    // steel beam between bays: I-beam with crisp chevron hazard paint
    g.fillStyle = '#5a5e6a'; g.fillRect(0, 92, 640, 1); g.fillStyle = '#2a2c34'; g.fillRect(0, 93, 640, 1);
    g.save(); g.beginPath(); g.rect(0, 94, 640, 4); g.clip(); g.fillStyle = '#141418'; g.fillRect(0, 94, 640, 4);
    g.fillStyle = lit ? '#f0b828' : '#8a6a1c'; for (let x = -8; x < 648; x += 12) { g.beginPath(); g.moveTo(x, 98); g.lineTo(x + 4, 94); g.lineTo(x + 10, 94); g.lineTo(x + 6, 98); g.fill(); }
    g.restore(); g.fillStyle = '#0a0a0e'; g.fillRect(0, 98, 640, 2);
    void F;
  });
}
function chX_plate(lit) { // data plate: dark brushed-steel panel with a bevel and rivets
  return art('chX:plate' + (lit ? 'L' : 'D'), 172, 37, () => {
    chX_fillPath([[0, 0, 4], [344, 0, 4], [344, 74, 4], [0, 74, 4]], lit ? '#c89838' : '#2a3044');
    chX_fillPath([[2, 2, 3], [342, 2, 3], [342, 72, 3], [2, 72, 3]], lit ? '#6a4a18' : '#141824');
    chX_fillPath([[4, 4, 2], [340, 4, 2], [340, 70, 2], [4, 70, 2]], '#0a0c14');
    chX_bands(5, 5, 334, 64, [[0, lit ? '#1c2234' : '#121622'], [1, lit ? '#0e1220' : '#0a0c14']], 5);
    g.fillStyle = lit ? 'rgba(255,200,120,0.18)' : 'rgba(120,140,200,0.08)'; g.fillRect(8, 20, 328, 1);
    for (const [rx, ry] of [[9, 9], [335, 9], [9, 65], [335, 65]]) { chX_circ(rx, ry, 1.6, lit ? '#8a6a30' : '#2a3044'); chX_circ(rx - 0.5, ry - 0.5, 0.7, lit ? '#ffe0a0' : '#4a5470'); }
  });
}
function carSelectScene(start) {
  const picks = []; let sel = 0;
  const choose = () => { if (picks.includes(sel)) { picks.splice(picks.indexOf(sel), 1); sfx.blip(); return; } picks.push(sel); sfx.select(); if (picks.length === 2) setTimeout(() => start(picks.map(i => CARS[i])), 300); };
  const labCol = ['#ff8a6a', '#9ab0e8', '#ffd060', '#7ad8d0'];
  return {
    t: 0, update(dt) { this.t += dt; },
    onKey(k) { if (k === 'up' || k === 'left') { sel = (sel + 3) % 4; sfx.blip(); } else if (k === 'down' || k === 'right') { sel = (sel + 1) % 4; sfx.blip(); } else if (k === 'select' || k === 'fire') choose(); },
    onTap(x, y) { const i = Math.floor(y / 50); if (i >= 0 && i < 4) { sel = i; choose(); } },
    draw() {
      rect(0, 0, W, H, '#07080e');
      const t = this.t;
      CARS.forEach((c, i) => {
        const y = i * 50, lit = i === sel;
        blit(chX_bay(i, lit, c), 0, y);
        textC(String(i + 1), 137, y + 11, lit ? '#ffe6a0' : '#6a6048');
        if (lit) { // a specular glint sliding along the roofline
          const D = chX_CARDEF[c.name], G = D.glint, n = G.length - 1, u = (t * 0.45) % 1.6;
          if (u < 1) {
            const f = u * n, k = Math.min(n - 1, Math.floor(f)), r = f - k, gx = 24 + G[k][0] + (G[k + 1][0] - G[k][0]) * r, gy = 8 + y * 2 + G[k][1] + (G[k + 1][1] - G[k][1]) * r;
            const s = 2 + Math.sin(t * 9) * 1.2;
            fine(() => { g.save(); g.globalCompositeOperation = 'lighter'; chX_radial(gx, gy, 7, [[0, 'rgba(255,240,210,0.7)'], [1, 'rgba(255,220,160,0)']]); g.fillStyle = '#fffbe8'; g.fillRect(gx - s * 2, gy, s * 4 + 1, 1); g.fillRect(gx, gy - s, 1, s * 2 + 1); g.fillRect(gx - 1, gy - 1, 3, 3); g.restore(); });
          }
        }
        // data plate
        blit(chX_plate(lit), 146, y + 1);
        text(c.name.toUpperCase(), 151, y + 4, lit ? '#fff4dc' : '#8a92aa', '#05060a');
        if (c.tracking) textR('(Tracking)', 313, y + 4, lit ? '#7ae88a' : '#3a7050');
        const lc = lit ? labCol[i] : mix(labCol[i], '#20283c', 0.45), vc = lit ? '#ffffff' : '#a4acc0';
        text('Max. Speed:', 151, y + 13, lc); text(c.speed + ' mph', 244, y + 13, vc);
        text('Handling:', 151, y + 21, lc); text(c.handling, 244, y + 21, vc);
        text('Conspicuousity:', 151, y + 29, lc); text(c.consp, 244, y + 29, vc);
        if (picks.includes(i)) { const s = 'Car #' + (picks.indexOf(i) + 1), tw = textW(s); rect(9, y + 2, tw + 7, 11, '#050608'); rect(10, y + 3, tw + 5, 9, '#c89838'); rect(11, y + 4, tw + 3, 7, '#1a1208'); text(s, 13, y + 4, '#ffd870'); }
      });
    },
  };
}


function chaseScene(opts, done) {
  const sk = skillLevel('driving'), level = opts.level || 0, evade = opts.mode === 'evade'; // evade: a hit squad is after you
  const N = 25, SP = 8, MX = 5, MY = 5; // streets every 8 px, 2 px wide, 6-px blocks
  const nodeXY = (i, j) => [MX + i * SP, MY + j * SP];
  const edge = new Set(); const ek = (i, j, d) => i + ',' + j + ',' + d;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { if (i < N - 1) edge.add(ek(i, j, 0)); if (j < N - 1) edge.add(ek(i, j, 1)); }
  const has = (i, j, ni, nj) => { if (ni < 0 || nj < 0 || ni >= N || nj >= N) return false; return nj === j ? edge.has(ek(Math.min(i, ni), j, 0)) : edge.has(ek(i, Math.min(j, nj), 1)); };
  const nbrs = (i, j) => [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => has(i, j, a, b));
  function connected() { const seen = new Set(['0,0']); const q = [[0, 0]]; while (q.length) { const [i, j] = q.shift(); for (const [a, b] of nbrs(i, j)) { const k = a + ',' + b; if (!seen.has(k)) { seen.add(k); q.push([a, b]); } } } return seen.size === N * N; }
  // carve a maze-like street plan: remove a good share of street segments while keeping everything reachable
  for (const k of shuffle([...edge]).slice(0, Math.floor(edge.size * 0.42))) { edge.delete(k); if (!connected()) edge.add(k); }
  // landmark buildings: organization headquarters and the CIA
  const labels = [];
  const orgNames = shuffle(ORGS.filter(o => o.regions.includes(game.region || 'europe')).map(o => o.short)).slice(0, 5);
  ['CIA', ...orgNames].forEach(n => labels.push({ name: n, i: ri(0, N - 1), j: ri(0, N - 1) }));
  const night = !!opts.night, sight = night ? 2 : 6;
  // ---- cars ----
  const cars = [];
  const mph2px = v => v * 0.12;
  function mk(i, j, kind, col, speed) { const nb = nbrs(i, j); const [a, b] = pick(nb); const c = { a: [i, j], b: [a, b], s: 0, v: 0, target: mph2px(speed), kind, col, order: null, stopped: false, seen: false, susp: 0 }; cars.push(c); return c; }
  const len = () => SP;
  const pos = c => { const [ax, ay] = nodeXY(...c.a), [bx, by] = nodeXY(...c.b); const k = c.s / SP; const dx = Math.sign(bx - ax), dy = Math.sign(by - ay); return [ax + (bx - ax) * k + 0.5, ay + (by - ay) * k + 0.5, dx, dy]; };
  function route(from, to) { const key = n => n[0] + ',' + n[1]; const D = new Map([[key(from), 0]]), prev = new Map(); const q = [[0, from]]; while (q.length) { q.sort((a, b) => a[0] - b[0]); const [d, n] = q.shift(); if (key(n) === key(to)) break; for (const m of nbrs(...n)) { const nd = d + 1 + rnd() * 0.6; if (nd < (D.get(key(m)) ?? 1e9)) { D.set(key(m), nd); prev.set(key(m), n); q.push([nd, m]); } } } const out = []; let n = to; while (n && key(n) !== key(from)) { out.unshift(n); n = prev.get(key(n)); } return out; }
  const start = [ri(6, N - 7), ri(6, N - 7)];
  let dest; do { dest = [ri(0, N - 1), ri(0, N - 1)]; } while (Math.abs(dest[0] - start[0]) + Math.abs(dest[1] - start[1]) < 18);
  labels.push({ name: '', i: dest[0], j: dest[1], dest: true });
  const sus = mk(start[0], start[1], 'suspect', P.PK, 40 + level * 5); sus.route = route(start, dest); sus.b = sus.route.shift(); sus.a = start.slice(); sus.path = [start.slice()];
  const mine = opts.cars.map((cd, n) => { const c = mk(start[0], start[1], 'agent', P.GR2, cd.speed); c.def = cd; c.n = n + 1; c.follow = true; c.a = start.slice(); c.b = sus.b.slice(); c.s = 0; c.wait = 2 + n * 2; c.target = mph2px(40); return c; });
  const hunters = []; let evadeT = 0;
  if (evade) {
    sus.wait = 1e9; mine.forEach(c => { c.follow = false; c.wait = 0; c.b = pick(nbrs(...c.a)); });
    for (let n = 0; n < 2 + Math.min(2, level); n++) { let h; do { h = [ri(0, N - 1), ri(0, N - 1)]; } while (Math.abs(h[0] - start[0]) + Math.abs(h[1] - start[1]) < 12); const c = mk(h[0], h[1], 'hunter', P.RD2, 50 + level * 6); c.wait = n * 3; hunters.push(c); }
  }
  for (let n = 0; n < 14; n++) mk(ri(0, N - 1), ri(0, N - 1), 'civ', pick([P.G3, P.W, P.BR, P.YE, P.RD, P.BL2]), 30 + rnd() * 20).target = mph2px(25 + rnd() * 20);
  let ctrl = 0, t = 0, over = null, aware = false, arrivedT = -1, lostT = 0, prompt = 0, msg = evade ? 'A hit squad is on your tail! Shake them for 60 seconds, or reach the CIA building and press F1.' : 'The suspect pulls away. Both your cars are following (F).', msgT = evade ? 5 : 4, lastSeen = null;
  const me = () => mine[ctrl];
  const inSight = c => { const [sx, sy] = pos(sus), [cx, cy] = pos(c); const sameRow = Math.abs(sy - cy) < 2.5 && Math.abs(sx - cx) <= sight * SP; const sameCol = Math.abs(sx - cx) < 2.5 && Math.abs(sy - cy) <= sight * SP; if (!sameRow && !sameCol) return dist(sx, sy, cx, cy) < 5; // check the street is continuous
    const [ai, aj] = [Math.round((cx - MX) / SP), Math.round((cy - MY) / SP)], [bi, bj] = [Math.round((sx - MX) / SP), Math.round((sy - MY) / SP)];
    if (sameRow) { for (let i = Math.min(ai, bi); i < Math.max(ai, bi); i++) if (!has(i, aj, i + 1, aj)) return false; } else { for (let j = Math.min(aj, bj); j < Math.max(aj, bj); j++) if (!has(ai, j, ai, j + 1)) return false; }
    return true; };
  function atNode(c) {
    const here = c.b, back = c.a, opts2 = nbrs(...here); const dx = here[0] - back[0], dy = here[1] - back[1]; let next = null;
    if (c.kind === 'suspect') {
      c.path.push(here.slice());
      if (aware) { const ahead = opts2.filter(n => !(n[0] === back[0] && n[1] === back[1])); next = pick(ahead.length ? ahead : opts2); }
      else if (c.route.length) next = c.route.shift();
      else { c.stopped = true; c.v = 0; if (arrivedT < 0) arrivedT = t; return; }
    } else if (c.kind === 'hunter') { const r = route(here, me().b); next = r.length ? r[0] : pick(opts2); }
    else if (c.kind === 'civ') { const ahead = opts2.filter(n => !(n[0] === back[0] && n[1] === back[1])); next = pick(ahead.length ? ahead : opts2); }
    else {
      if (c.order) { const n = [here[0] + c.order[0], here[1] + c.order[1]]; if (opts2.some(o => o[0] === n[0] && o[1] === n[1])) { next = n; c.order = null; } }
      if (!next && c.follow && c.lastSusTurn && c.lastSusTurn.at[0] === here[0] && c.lastSusTurn.at[1] === here[1]) next = c.lastSusTurn.to;
      if (!next) { const st = [here[0] + dx, here[1] + dy]; if (opts2.some(o => o[0] === st[0] && o[1] === st[1])) next = st; }
      if (!next) { c.stopped = true; c.v = 0; c.s = SP; return; }
    }
    c.a = here; c.b = next; c.s = 0; c.stopped = false;
    if (c === sus) for (const m of mine) if (m.follow && inSight(m)) m.lastSusTurn = { at: here.slice(), to: next.slice() };
  }
  function uturn(c) { if (c.def && c.def.handling !== 'Excellent') { msg = 'This car cannot make a U-turn.'; msgT = 2; sfx.deny(); return; } [c.a, c.b] = [c.b, c.a]; c.s = SP - c.s; sfx.tone(200, 0.2, 'sawtooth', 0.04); }
  function ahead(c) { let best = null, bd = 1e9; for (const o of cars) { if (o === c) continue; if (o.a[0] === c.a[0] && o.a[1] === c.a[1] && o.b[0] === c.b[0] && o.b[1] === c.b[1] && o.s > c.s) { const d = o.s - c.s; if (d < bd) { bd = d; best = o; } } } return best ? [best, bd] : null; }
  function headOn(c) { return sus.a[0] === c.b[0] && sus.a[1] === c.b[1] && sus.b[0] === c.a[0] && sus.b[1] === c.a[1] && Math.abs((SP - sus.s) - c.s) < 3; }
  function finish(kind) { if (over) return; over = { kind, t: 0 }; ['followed', 'arrest', 'evaded', 'safe'].includes(kind) ? sfx.success() : sfx.fail(); }
  const scene = {
    update(dt) {
      t += dt; if (msgT > 0) msgT -= dt; if (over) { over.t += dt; return; }
      for (const c of cars) {
        if (c.wait) { c.wait -= dt; if (c.wait <= 0) c.wait = 0; else continue; }
        if (c.stopped) { if (c.kind === 'agent' && (c.order || c.follow)) atNode(c); continue; }
        let tg = c.target; if (c === sus && aware) tg = mph2px(70);
        const a = c.kind === 'hunter' ? null : ahead(c); if (a) { const [o, d] = a; if (d < 6) tg = Math.min(tg, o.v); if (d < 3.5) tg = 0; }
        c.v += (tg - c.v) * Math.min(1, dt * 2.5); c.s += c.v * dt; if (c.s >= SP) { c.s = SP; atNode(c); }
      }
      if (evade) {
        evadeT += dt; const [mx, my] = pos(me());
        for (const h of hunters) { if (h.wait) continue; for (const m of mine) { const [hx, hy] = pos(h), [ax, ay] = pos(m); if (dist(hx, hy, ax, ay) < 3) finish('caught'); } }
        if (evadeT >= 60) finish('evaded'); prompt = dist(mx, my, ...nodeXY(labels[0].i, labels[0].j)) < SP * 1.3 ? 0.5 : 0; return;
      }
      // seeing and suspicion
      let anySeen = false;
      for (const m of mine) {
        m.seen = inSight(m); if (m.seen) { anySeen = true; lastSeen = pos(sus); }
        const [sx, sy] = pos(sus), [mx, my] = pos(m); const d = dist(sx, sy, mx, my);
        if (m.seen && !aware) { const close = d < SP * 1.2 ? 2.2 : d < SP * 2 ? 1 : 0.35; const speeding = m.v > mph2px(45) ? 1.5 : 1; m.susp += dt * 5.5 * close * speeding * CONSP[m.def.consp] * (1.3 - sk * 0.15) * (1 + level * 0.2); }
        else m.susp = Math.max(0, m.susp - dt * 2);
        if (m.susp >= 100 && !aware) { aware = true; msg = 'The suspect has spotted car #' + m.n + '! He is trying to lose you.'; msgT = 4; sfx.alarm(); }
        if (headOn(m)) prompt = 1.2;
      }
      prompt = Math.max(0, prompt - dt);
      if (!anySeen) { lostT += dt; if (lostT > (aware ? 12 : 25)) finish('lost'); } else lostT = 0;
      if (arrivedT >= 0) { if (anySeen || mine.some(m => dist(...pos(m).slice(0, 2), ...nodeXY(...dest)) < SP * 2)) finish('followed'); else if (t - arrivedT > 6) finish('late'); }
    },
    onKey(k) {
      if (over) { if (over.t > 0.6 && (k === 'select' || k === 'fire' || k === 'menu' || k === 'action')) done({ success: over.kind === 'followed', arrest: over.kind === 'arrest', how: over.kind, spotted: aware }); return; }
      const c = me(); const dx = c.b[0] - c.a[0], dy = c.b[1] - c.a[1];
      const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      if (dirs[k]) { const d = dirs[k]; c.follow = false; if (d[0] === -dx && d[1] === -dy) uturn(c); else { c.order = d; if (c.stopped) atNode(c); } sfx.tick(); }
      if (k === 'alt2' || k === 'fire') { ctrl = (ctrl + 1) % mine.length; msg = 'Now controlling car #' + (ctrl + 1) + '.'; msgT = 1.5; sfx.select(); }
      if (evade && (k === 'action' || k === 'select')) { if (prompt > 0) finish('safe'); else { msg = 'Get to the CIA building first.'; msgT = 1.5; sfx.deny(); } return; }
      if (k === 'action' || k === 'select') { if (prompt > 0 && headOn(c)) finish('arrest'); else if (prompt > 0 && mine.some(headOn)) finish('arrest'); else { aware = aware || rnd() < 0.5; msg = 'Nothing to grab. That probably tipped him off.'; msgT = 2; } }
      if (k === 'alt' && !evade) { c.follow = true; c.order = null; msg = 'Car #' + c.n + ' resumes following.'; msgT = 1.5; sfx.tick(); }
      if (k === 'menu') finish('abort');
    },
    rawKey(e) { if (over) return false; const c = me(); if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') { c.target = Math.min(mph2px(c.def.speed), c.target + mph2px(20)); sfx.tick(); return true; } if (e.key === '-' || e.code === 'NumpadSubtract') { c.target = Math.max(0, c.target - mph2px(20)); sfx.tick(); return true; } if (e.code === 'KeyF' || e.code === 'F10') { c.follow = true; c.order = null; return true; } if (e.code === 'F1') { scene.onKey('action'); return true; } return false; },
    onTap(x, y) {
      if (over) { if (over.t > 0.6) done({ success: over.kind === 'followed', arrest: over.kind === 'arrest', how: over.kind, spotted: aware }); return; }
      const c = me();
      if (x > 200 && y > 56 && y < 98) { if (x < 240) { c.target = Math.max(0, c.target - mph2px(20)); } else if (x < 280) { c.target = Math.min(mph2px(c.def.speed), c.target + mph2px(20)); } else { this.onKey('alt2'); } sfx.tick(); return; }
      if (prompt > 0) { this.onKey('action'); return; }
      if (x < 198) { const [mx, my] = pos(c); const dx = x - mx, dy = y - my; const d = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]; this.onKey(d[0] < 0 ? 'left' : d[0] > 0 ? 'right' : d[1] < 0 ? 'up' : 'down'); }
    },
    draw() {
      rect(0, 0, W, H, '#05060a');
      drawMap();
      drawWindshield(201, 0, 118, 98);
      drawCloseUp(201, 100, 118, 100);
      blit(chX_bezel(), 200, 0);
      // ---- overlays ----
      if (msgT > 0 && !over) { const ls = wrap(msg, 180); box(6, 4, 188, ls.length * 8 + 6, '#7a96e8', '#0c1434'); ls.forEach((l, i) => text(l, 10, 7 + i * 8, '#f4f6ff', '#04060e')); }
      if (prompt > 0 && !over) { // police-light flasher
        const f = (t * 6 | 0) % 2; box(10, 86, 180, 16, f ? '#ff5a4a' : '#5a82ff', f ? '#2a0610' : '#081030');
        fine(() => { for (const [lx, on, col] of [[30, f, '255,70,50'], [370, !f, '80,130,255']]) { chX_circ(lx, 188, 5, on ? 'rgb(' + col + ')' : '#1a1a24'); if (on) { g.save(); g.globalCompositeOperation = 'lighter'; chX_radial(lx, 188, 22, [[0, 'rgba(' + col + ',0.8)'], [1, 'rgba(' + col + ',0)']]); g.restore(); chX_circ(lx - 1, 187, 1.6, '#ffffff'); } } });
        textC(evade ? 'Press F1 to duck into the CIA' : 'Press F1 now to make arrest', 100, 90, f ? '#ffe070' : '#ffffff', '#000000');
      }
      if (evade && !over) {
        const left = Math.max(0, 60 - evadeT), tx = timerX(); g.save(); g.translate(tx - 4, 0); box(4, 184, 110, 13, '#ff6a50', '#2a0810');
        const a = -Math.PI / 2 + (evadeT / 60) * Math.PI * 2;
        fine(() => { chX_circ(22, 380, 8, '#c8ccd8'); chX_circ(22, 380, 6.6, '#f4f2ea'); g.fillStyle = '#c8ccd8'; g.fillRect(20, 369, 4, 3); g.fillStyle = 'rgba(220,40,40,0.35)'; g.beginPath(); g.moveTo(22, 380); g.arc(22, 380, 6, -Math.PI / 2, a); g.fill(); chX_seg(22, 380, 22 + Math.cos(a) * 5.5, 380 + Math.sin(a) * 5.5, '#c01818', 1.4); chX_circ(22, 380, 1.2, '#1a1a20'); });
        text('Shake them: ' + Math.ceil(left) + ' sec', 18, 187, '#ffe070');
        fine(() => { g.fillStyle = '#3a0c14'; g.fillRect(32, 389, 192, 2); g.fillStyle = '#7aff6a'; g.fillRect(32, 389, Math.round(192 * (1 - left / 60)), 2); }); g.restore();
      }
      if (over) {
        const good = ['followed', 'arrest', 'evaded', 'safe'].includes(over.kind), bad = ['lost', 'late', 'caught'].includes(over.kind);
        const hd = { followed: 'DESTINATION FOUND', arrest: 'ARREST!', lost: 'YOU LOST HIM', late: 'TOO LATE', abort: evade ? 'YOU STOP THE CAR' : 'CHASE ABANDONED', evaded: 'YOU SHOOK THEM', safe: 'SAFE AT THE CIA', caught: 'CUT OFF!' }[over.kind];
        const ramp = good ? ['#0c3a1c', '#1c7a3a', '#5ae07a'] : bad ? ['#3a0810', '#8a1a22', '#ff6a5a'] : ['#3a2a08', '#8a6014', '#ffd060'];
        fine(() => {
          g.fillStyle = 'rgba(0,0,6,0.55)'; g.fillRect(30, 126, 352, 140);
          chX_fillPath([[24, 120, 5], [376, 120, 5], [376, 260, 5], [24, 260, 5]], ramp[2]);
          chX_fillPath([[26, 122, 4], [374, 122, 4], [374, 258, 4], [26, 258, 4]], '#0a0c16');
          g.save(); chX_path([[27, 123, 3], [373, 123, 3], [373, 257, 3], [27, 257, 3]]); g.clip();
          chX_bands(27, 123, 346, 28, [[0, ramp[1]], [1, ramp[0]]], 6); g.fillStyle = ramp[2]; g.fillRect(27, 150, 346, 1); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(27, 123, 346, 1);
          chX_bands(27, 151, 346, 106, [[0, '#141a2c'], [1, '#0a0c16']], 5); g.restore();
          // result icon
          chX_circ(48, 137, 10, ramp[0]); chX_circ(48, 137, 9, ramp[2]); chX_circ(47, 136, 7.5, mix(ramp[2], '#ffffff', 0.25));
          g.strokeStyle = '#0a0c16'; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath();
          if (good) { g.moveTo(43, 137); g.lineTo(47, 141); g.lineTo(54, 132); } else if (bad) { g.moveTo(44, 133); g.lineTo(52, 141); g.moveTo(52, 133); g.lineTo(44, 141); } else { g.moveTo(48, 131); g.lineTo(48, 138); g.moveTo(48, 142); g.lineTo(48, 142.5); }
          g.stroke(); g.lineCap = 'butt';
        });
        textC(hd, 102, 65, '#ffffff', '#000000');
        para({ followed: 'He parks and goes inside. You note the address.', arrest: 'You cut him off head-on and drag him out of the car.', lost: 'The car disappears into the city.', late: 'By the time you get there the car is empty.', abort: evade ? 'You jump out and face them on foot.' : 'You give up the chase.', evaded: 'The hit squad loses you in traffic.', safe: 'You screech into the CIA garage. The hit squad drives on.', caught: 'Their car slams into yours. Doors fly open - guns come out.' }[over.kind], 22, 82, 156, '#e8ecf8', 9);
        if (over.t > 0.6) textC('Press a key', 100, 118, (t * 2 | 0) % 2 ? '#7a8298' : '#ffffff');
      }
    },
  };
  function timerX() { const [cx, cy] = nodeXY(labels[0].i, labels[0].j); return cx < 124 && cy > 170 ? 86 : 4; }
  // framed message box: dark glass panel, bright outer rim, soft inner rim, drop shadow
  function box(x, y, w, h, rim, inner) {
    fine(() => {
      const X = x * 2, Y = y * 2, Wd = w * 2, Hd = h * 2;
      g.fillStyle = 'rgba(0,0,8,0.5)'; g.fillRect(X + 3, Y + 3, Wd, Hd);
      chX_fillPath([[X, Y, 3], [X + Wd, Y, 3], [X + Wd, Y + Hd, 3], [X, Y + Hd, 3]], rim);
      chX_fillPath([[X + 2, Y + 2, 2], [X + Wd - 2, Y + 2, 2], [X + Wd - 2, Y + Hd - 2, 2], [X + 2, Y + Hd - 2, 2]], mix(inner, '#000000', 0.2));
      g.save(); chX_path([[X + 3, Y + 3, 1], [X + Wd - 3, Y + 3, 1], [X + Wd - 3, Y + Hd - 3, 1], [X + 3, Y + Hd - 3, 1]]); g.clip();
      chX_bands(X + 3, Y + 3, Wd - 6, Hd - 6, [[0, mix(inner, rim, 0.18)], [0.5, inner], [1, mix(inner, '#000000', 0.3)]], 4); g.restore();
      g.fillStyle = mix(rim, '#ffffff', 0.45); g.fillRect(X + 4, Y + 1, Wd - 8, 1);
    });
  }
  let edgeList = null; const degree = new Map();
  function edges() {
    if (!edgeList) { edgeList = [...edge].map(k => k.split(',').map(Number)); for (const [i, j, d] of edgeList) { const a = i + ',' + j, b = d === 0 ? (i + 1) + ',' + j : i + ',' + (j + 1); degree.set(a, (degree.get(a) || 0) + 1); degree.set(b, (degree.get(b) || 0) + 1); } }
    return edgeList;
  }
  // ================= CITY MAP (main play surface) =================
  // Plan: a clean aerial street map. Dark cool asphalt streets read instantly against warm pale pavements;
  // rooftops are muted, desaturated ramps (lit parapet top-left, shade bottom-right, cast shadow falling
  // down-right onto the street) so the bright car blips are the only saturated things on the board.
  // Blocks with no street between them merge into bigger buildings, so dead ends read as walls.
  // Night: navy asphalt, dark roofs, a few lit skylights and warm sodium pools at the junctions.
  let mapCv = null;
  const MP = night ? { asph: '#141828', pave: '#2c2e3e', kerb: '#3c3e52', grass: '#1a3428', tree: ['#0c1e18', '#16301f', '#264a30'], shadow: 'rgba(0,0,10,0.55)',
    roofs: [['#1c1f2e', '#2a2f44', '#3a4058'], ['#221c28', '#342a38', '#4a3a4a'], ['#1a2230', '#26344a', '#364a66'], ['#201e26', '#302e38', '#44424e']], det: '#12141e', plaza: '#34364a', water: '#1a2a4a' }
    : { asph: '#343846', pave: '#bdb6a6', kerb: '#d4cebe', grass: '#5a9044', tree: ['#1e4a34', '#2e6a36', '#6aa848'], shadow: 'rgba(24,20,56,0.38)',
      roofs: [['#78767e', '#9c9a96', '#c2beb4'], ['#7e7466', '#a49884', '#c8bca2'], ['#6a7282', '#8a92a0', '#aeb4c0'], ['#86645e', '#a88272', '#c8a28c']], det: '#4a4a56', plaza: '#d6cdb6', water: '#3a6aa8' };
  function blockKind(i, j) { const hsh = chX_h(i + 40, j + 40, 7) % 20; return hsh < 2 ? 'park' : hsh === 2 ? 'plaza' : 'bld'; }
  function paintMap() {
    const f = v => v * 2, bx = i => f(MX + i * SP), fill = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    fill(0, 0, 400, 400, MP.pave);
    g.save(); g.beginPath(); g.rect(2, 2, 396, 396); g.clip();
    // streets
    for (const [i, j, d] of edges()) { const x = bx(i), y = f(MY + j * SP); if (d === 0) fill(x - 2, y - 2, f(SP) + 4, 4, MP.asph); else fill(x - 2, y - 2, 4, f(SP) + 4, MP.asph); }
    // roof footprints (merged across missing streets)
    const roofs = [];
    for (let j = -1; j < N; j++) for (let i = -1; i < N; i++) {
      const X = bx(i) + 2, Y = f(MY + j * SP) + 2, k = blockKind(i, j), hs = chX_h(i, j, 21);
      if (k !== 'bld') continue;
      const mr = blockKind(i + 1, j) === 'bld' && i + 1 < N && !has(i + 1, j, i + 1, j + 1) && j >= 0 && j < N - 1;
      const md = blockKind(i, j + 1) === 'bld' && j + 1 < N && !has(i, j + 1, i + 1, j + 1) && i >= 0 && i < N - 1;
      roofs.push({ x: X + 1, y: Y + 1, w: 10, h: 10, pal: MP.roofs[[0, 0, 1, 1, 2, 2, 0, 1, 3][hs % 9]], hs, mr, md });
    }
    for (const r of roofs) { fill(r.x + 2, r.y + 2, r.w, r.h, MP.shadow); if (r.mr) fill(r.x + 12, r.y + 2, 6, r.h, MP.shadow); if (r.md) fill(r.x + 2, r.y + 12, r.w, 6, MP.shadow); }
    for (const r of roofs) {
      const [lo, mid, hi] = r.pal; fill(r.x, r.y, r.w, r.h, mid); fill(r.x, r.y, r.w, 1, hi); fill(r.x, r.y, 1, r.h, hi); if (!r.md) fill(r.x, r.y + r.h - 1, r.w, 1, lo); if (!r.mr) fill(r.x + r.w - 1, r.y, 1, r.h, lo);
      if (r.mr) { fill(r.x + 10, r.y, 6, 10, mid); fill(r.x + 10, r.y, 6, 1, hi); fill(r.x + 10, r.y + 9, 6, 1, lo); }
      if (r.md) { fill(r.x, r.y + 10, 10, 6, mid); fill(r.x, r.y + 10, 1, 6, hi); fill(r.x + 9, r.y + 10, 1, 6, lo); }
      const u = r.hs >>> 3, cx = r.x + 3 + (u % 3), cy = r.y + 3 + ((u >>> 2) % 3);
      if (u % 4 === 0) { fill(cx, cy, 3, 2, hi); fill(cx, cy + 2, 3, 1, lo); } // rooftop plant box
      else if (u % 4 === 1) { const on = night && (u >>> 5) % 4 === 0; fill(cx, cy, 2, 3, night ? (on ? '#e8b060' : lo) : '#8a9cb4'); fill(cx, cy, 2, 1, night ? (on ? '#ffe0a0' : mid) : '#dfe8f0'); } // skylight
      else if (u % 4 === 2) { fill(cx + 1, cy, 2, 1, lo); fill(cx, cy + 1, 4, 2, lo); fill(cx + 1, cy + 1, 2, 1, hi); } // water tank
    }
    // parks and plazas
    for (let j = -1; j < N; j++) for (let i = -1; i < N; i++) {
      const k = blockKind(i, j); if (k === 'bld') continue;
      const X = bx(i) + 2, Y = f(MY + j * SP) + 2;
      if (k === 'park') {
        fill(X + 1, Y + 1, 10, 10, MP.grass); fill(X + 1, Y + 1, 10, 1, mix(MP.grass, '#ffffff', 0.15));
        const hs = chX_h(i, j, 5);
        for (const [tx, ty] of [[3 + hs % 2, 3], [8, 4 + (hs >>> 2) % 2], [4 + (hs >>> 4) % 3, 8]]) { fill(X + tx, Y + ty + 1, 3, 2, MP.tree[0]); fill(X + tx - 1, Y + ty - 1, 3, 3, MP.tree[1]); fill(X + tx - 1, Y + ty - 1, 2, 1, MP.tree[2]); }
      } else {
        fill(X + 1, Y + 1, 10, 10, MP.plaza); fill(X + 1, Y + 1, 10, 1, mix(MP.plaza, '#ffffff', 0.3));
        fill(X + 4, Y + 3, 4, 6, MP.water); fill(X + 3, Y + 4, 6, 4, MP.water); fill(X + 5, Y + 5, 2, 2, night ? '#6a8ac0' : '#e8f4ff');
      }
    }
    // junction street lamps at night
    if (night) { g.save(); g.globalCompositeOperation = 'lighter'; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if ((degree.get(i + ',' + j) || 0) >= 4 || ((degree.get(i + ',' + j) || 0) === 3 && (i + j) % 2)) chX_radial(bx(i), f(MY + j * SP), 6, [[0, 'rgba(255,180,90,0.30)'], [1, 'rgba(255,150,70,0)']]); g.restore(); }
    g.restore();
    // bevelled frame
    fill(0, 0, 400, 2, '#3a4258'); fill(0, 0, 2, 400, '#3a4258'); fill(0, 398, 400, 2, '#0a0c14'); fill(398, 0, 2, 400, '#0a0c14');
    fill(2, 2, 396, 1, '#0a0c14'); fill(2, 2, 1, 396, '#0a0c14');
  }
  function drawMap() {
    if (!mapCv) { edges(); mapCv = document.createElement('canvas'); mapCv.width = 400; mapCv.height = 400; drawTo(mapCv.getContext('2d'), paintMap); }
    g.drawImage(mapCv, 0, 0, 200, 200);
    fine(() => {
      // landmark pins
      for (const l of labels) { if (l.dest) continue; const [x, y] = nodeXY(l.i, l.j); chX_circ(x * 2, y * 2, 2.6, '#0a0c14'); chX_circ(x * 2, y * 2, 1.7, l.name === 'CIA' ? '#8aff9a' : '#ffffff'); }
      // car blips: small oriented cars with a dark keyline, so they pop on both asphalt and roofs
      const blip = (x, y, dx, col, len, wid, key) => { const hor = dx !== 0, w = hor ? len : wid, h = hor ? wid : len, X = Math.round(x * 2 - 1 - w / 2), Y = Math.round(y * 2 - 1 - h / 2); if (key) { g.fillStyle = key; g.fillRect(X - 1, Y - 1, w + 2, h + 2); } g.fillStyle = col; g.fillRect(X, Y, w, h); return [X, Y, w, h]; };
      for (const c of cars) {
        if (c === sus || c.wait || c.kind !== 'civ') continue; const [x, y, dx, dy] = pos(c);
        const [X, Y, w, h] = blip(x, y, dx, night ? '#5a6078' : '#e4e0d4', 4, 2, null);
        if (night) { g.fillStyle = '#ffe9a0'; g.fillRect(dx > 0 ? X + w - 1 : dx < 0 ? X : X + (w >> 1), dy > 0 ? Y + h - 1 : dy < 0 ? Y : Y + (h >> 1), 1, 1); }
      }
      const seenNow = mine.some(m => m.seen);
      if (!seenNow && lastSeen) { const X = lastSeen[0] * 2 - 1, Y = lastSeen[1] * 2 - 1; chX_seg(X - 3, Y - 3, X + 3, Y + 3, '#1a0012', 3); chX_seg(X + 3, Y - 3, X - 3, Y + 3, '#1a0012', 3); chX_seg(X - 2.5, Y - 2.5, X + 2.5, Y + 2.5, '#ff5ad8', 1.4); chX_seg(X + 2.5, Y - 2.5, X - 2.5, Y + 2.5, '#ff5ad8', 1.4); }
      for (const c of cars) {
        if (c === sus || c.wait || c.kind === 'civ') continue; const [x, y, dx] = pos(c);
        if (c.kind === 'hunter') { const p = (t * 5 | 0) % 2; g.save(); g.globalCompositeOperation = 'lighter'; chX_radial(x * 2 - 1, y * 2 - 1, 8, [[0, 'rgba(255,60,30,' + (p ? 0.5 : 0.25) + ')'], [1, 'rgba(255,60,30,0)']]); g.restore(); blip(x, y, dx, p ? '#ff6a4a' : '#e8302a', 7, 5, '#2a0006'); }
        else { const mineNow = c === me(); blip(x, y, dx, mineNow ? '#8aff5a' : '#3ec85a', 7, 5, '#062a10'); if (mineNow) { const X = Math.round(x * 2 - 1), Y = Math.round(y * 2 - 1); g.fillStyle = '#e8ffe0'; g.fillRect(X - 1, Y - 1, 2, 2); } if (mineNow && (t * 4 | 0) % 2) { const X = x * 2 - 1, Y = y * 2 - 1; g.fillStyle = '#ffffff'; for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.fillRect(X + sx * 8 - (sx < 0 ? 0 : 2), Y + sy * 8, 3, 1); g.fillRect(X + sx * 8, Y + sy * 8 - (sy < 0 ? 0 : 2), 1, 3); } } }
      }
      if (seenNow) { const [x, y, dx] = pos(sus); g.save(); g.globalCompositeOperation = 'lighter'; chX_radial(x * 2 - 1, y * 2 - 1, 9, [[0, 'rgba(255,80,210,0.55)'], [1, 'rgba(255,80,210,0)']]); g.restore(); blip(x, y, dx, '#ff5ad8', 7, 5, '#2a0020'); }

    });
    // landmark plaques
    for (const l of labels) {
      if (l.dest && (evade || (!over && arrivedT < 0))) continue;
      const [x, y] = nodeXY(l.i, l.j);
      if (l.dest) { fine(() => { const X = x * 2, Y = y * 2; g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(X + 1, Y - 1, 6, 2); g.fillStyle = '#e8e4d8'; g.fillRect(X - 1, Y - 15, 2, 16); chX_fillPath([[X + 1, Y - 15, 0], [X + 10, Y - 12, 1], [X + 1, Y - 9, 0]], '#ffcc30'); chX_seg(X + 1, Y - 14.5, X + 8, Y - 12.3, '#fff4b0', 0.8); chX_circ(X, Y - 15.5, 1.5, '#ffffff'); }); continue; }
      const cia = l.name === 'CIA', tw = textW(l.name), pw = tw + 4, ph = 9;
      if (!l.box) { // place the plaque beside its pin, dodging plaques already placed
        const tries = [[x + 3, y - 4], [x - 3 - pw, y - 4], [x + 3, y + 3], [x - 3 - pw, y + 3], [x + 3, y - 12], [x - 3 - pw, y - 12], [x + 3, y + 11], [x - 3 - pw, y + 11]];
        const placed = labels.filter(o => o.box).map(o => o.box.concat()); if (evade) placed.push([timerX() - 1, 183, 112]);
        let best = null; for (const [tx, ty] of tries) { const bx = clamp(tx, 2, 197 - pw), by = clamp(ty, 2, 188); if (!placed.some(o => bx < o[0] + o[2] + 1 && o[0] < bx + pw + 1 && by < o[1] + ph + 1 && o[1] < by + ph + 1)) { best = [bx, by]; break; } }
        l.box = [...(best || [clamp(x + 3, 2, 197 - pw), clamp(y - 4, 2, 188)]), pw];
      }
      const [bx, by] = l.box, flash = cia && evade && (t * 3 | 0) % 2;
      const pal = cia ? (flash ? ['#062a12', '#6aff8a', '#c8ffd0'] : ['#0e3a20', '#2e9a52', '#8ae8a0']) : night ? ['#0c1230', '#34489a', '#8aa0f0'] : ['#141c44', '#3a54b0', '#9ab0ff'];
      fine(() => {
        const X = bx * 2, Y = by * 2, Wd = pw * 2, Hd = ph * 2, px_ = x * 2, py_ = y * 2;
        // leader line from the plaque to the pin
        const lx = clamp(px_, X + 2, X + Wd - 2), ly = clamp(py_, Y + 2, Y + Hd - 2); chX_seg(lx, ly, px_, py_, 'rgba(10,12,20,0.8)', 2); chX_seg(lx, ly, px_, py_, pal[2], 0.8);
        g.fillStyle = 'rgba(0,0,10,0.45)'; g.fillRect(X + 2, Y + 2, Wd, Hd);
        chX_fillPath([[X, Y, 2], [X + Wd, Y, 2], [X + Wd, Y + Hd, 2], [X, Y + Hd, 2]], pal[1]);
        chX_fillPath([[X + 1, Y + 1, 1], [X + Wd - 1, Y + 1, 1], [X + Wd - 1, Y + Hd - 1, 1], [X + 1, Y + Hd - 1, 1]], pal[0]);
        g.fillStyle = pal[1]; g.fillRect(X + 2, Y + 2, Wd - 4, 1);
      });
      text(l.name, bx + 2, by + 1, flash ? '#ffffff' : cia ? '#d8ffe0' : '#ffffff');
    }
  }
  // ================= WINDSHIELD: first-person street view + dashboard =================
  // Plan: drawn on the fine grid. Key light low from the left: facades on the left kerb are sunlit and warm,
  // the right-hand ones are in cool shade; everything fades into a blue-grey haze with distance (atmospheric
  // perspective). Sky: warm horizon to deep blue, lit-top clouds. Night: navy sky, dark facades with warm lit
  // windows, sodium lamp halos and our own headlight pool on the asphalt. Our glossy bonnet (the chosen car's
  // paint ramp) reflects the sky; A-pillars and the mirror frame the view. Dashboard: plum-black vinyl,
  // chrome-ringed gauges with glowing needles, LCD clock, leather wheel held by two hands.
  const F = 92, E = 1, RW = 1.5, XB = 2.4, GAP = 1.8, ZFAR = 60;
  let prevHead = '', prevCar = null, turnT = 0, turnDir = 0, lastT = 0;
  // materials: sunlit side, shaded side, front face, trim/cornice
  const MAT = [['#c0664a', '#6a3844', '#a0503e', '#ecc8a0'], ['#dcc090', '#86707a', '#c2a47a', '#f8ead0'], ['#c4c2b8', '#6c7084', '#a4a6a8', '#ecece4'], ['#7896c0', '#34405e', '#58749e', '#c4d8f0'],
    ['#68a49c', '#2e5264', '#50887e', '#cce8dc'], ['#9a6a4c', '#4a3444', '#80583e', '#dab080'], ['#e8dcc4', '#908494', '#ccc0a8', '#ffffff'], ['#984e4c', '#4a2a3c', '#7c4042', '#d8a890']];
  const HAZE = night ? '#121830' : '#b4c4da';
  const fogI = z => z <= 3 ? 0 : z >= ZFAR ? 10 : Math.round(((z - 3) / (ZFAR - 3)) ** 0.8 * 10), fogQ = z => fogI(z) / 10;
  const fogTab = new Map(); // colour -> its 11 haze steps
  const fogC = (c, z) => { let r = fogTab.get(c); if (!r) { r = []; for (let k = 0; k <= 10; k++) r.push(mix(c, HAZE, k / 10 * (night ? 0.9 : 0.85))); fogTab.set(c, r); } return r[fogI(z)]; };
  const nightC = c => mix(c, '#0a0c18', 0.78);
  function bldg(key, blk, half) {
    const hs = chX_h(key, blk, half);
    return { id: key * 1e5 + blk * 2 + half, hgt: 3 + hs % 7, pal: (hs >>> 4) % 8, style: (hs >>> 8) % 3, shop: (hs >>> 11) % 6, seed: hs };
  }
  const FH = 0.6, BW = 0.62; // storey height and window-bay width in world units
  let hyG = 0, viewTop = 0, cxG = 0; // horizon row and top of the windshield in the current frame (fine px)
  // Facades are scanned one fine column at a time (to find buildings, side streets and window bays), but drawn
  // as runs: consecutive columns with the same building, face, haze step and ground-floor detail become one quad
  // per horizontal band (wall, cornice, awning, shop window, door). Heights are linear in column, so it is exact.
  let bRun = null; const bRuns = [], litPix = [], seps = [];
  function wallColumn(col, top, bot, z, b, face, u, lx) { // face: 0 lit side, 1 shaded side, 2 front
    const sc = F / z, near = sc >= 3.2, fi = fogI(z);
    let key = b.id * 8 + face + '|' + fi, st = -1, sh = -1, dr = -1;
    if (!near) {
      if (night && chX_h(b.seed, col >> 1, 0) % 5 === 0) litPix.push(col, Math.round(top) + 2 + chX_h(col >> 1, 1, b.seed) % Math.max(1, Math.round(bot - top) - 3), fi > 7 ? '#7a6a50' : '#e8b060');
      key += '|f';
    } else {
      const bay = Math.floor(u / BW), wu = u / BW - bay; // position inside a window bay
      const inBay = b.style === 1 ? wu > 0.08 : b.style === 2 ? (wu > 0.3 && wu < 0.66) : (wu > 0.22 && wu < 0.74);
      if (inBay) winCollect(col, b, face, bay, night && wu > 0.62 && b.style !== 1 ? 1 : 0, z);
      if (b.shop < 3) { st = ((u * 3) | 0) & 1; const mm = ((u % 1.5) + 1.5) % 1.5; sh = mm < 0.08 ? 0 : mm < 0.3 ? 1 : mm < 0.35 ? 2 : 3; }
      else if (lx) { const mm = ((u % 2.4) + 2.4) % 2.4; dr = mm < 0.5 ? (mm < 0.06 || mm > 0.44 ? 1 : 2) : 0; }
      key += '|' + st + '|' + sh + '|' + dr;
    }
    if (bRun && bRun.key === key && bRun.c1 === col - 1) { bRun.c1 = col; return; }
    if (bRun) bRuns.push(bRun);
    const m = MAT[b.pal], base = m[face === 2 ? 2 : face], H = b.hgt, bands = [[H, 0, fogC(night ? nightC(base) : base, z)]];
    if (!near) { if (!night) bands.push([H, H - 0.1, fogC(m[3], z)]); }
    else {
      if (!night) bands.push([H, H - 0.12, fogC(m[3], z)], [H - 0.12, H - 0.18, fogC(m[1], z)]);
      if (st >= 0) {
        const awn = [['#c83a34', '#f4ece0'], ['#2e8a52', '#f4ece0'], ['#2e4a9a', '#f0d890']][b.shop][st];
        bands.push([1.5 * FH, 1.25 * FH, fogC(night ? nightC(awn) : awn, z)], [1.25 * FH, 1.25 * FH - 0.06, night ? '#05060c' : fogC(m[1], z)]);
        let wc; if (sh === 0) wc = night ? '#0a0a12' : fogC('#3a3440', z); else if (night) wc = b.shop === 0 ? (sh < 3 ? '#ffe090' : '#e0a050') : b.shop === 1 ? '#6ac8a0' : '#141626'; else wc = fogC(sh === 1 ? '#b8d4f0' : '#34445e', z);
        bands.push([1.15 * FH, 0.1, wc]);
      } else if (dr > 0) bands.push([1.2 * FH, 0, dr === 1 ? fogC(night ? nightC(m[3]) : m[3], z) : night ? '#1a120e' : fogC('#5a3a2a', z)]);
    }
    bRun = { key, bands, face, z0: z, c0: col, c1: col };
  }
  function bandFlush() {
    if (bRun) bRuns.push(bRun); bRun = null;
    for (const r of bRuns) {
      const xa = r.c0, xb = r.c1 + 1, side = r.face !== 2, sA = side ? Math.abs(xa - cxG) / XB : F / r.z0, sB = side ? Math.abs(xb - cxG) / XB : F / r.z0;
      const Y = (h, s) => Math.round(hyG + (E - h) * s);
      for (const [h0, h1, col] of r.bands) { const a0 = Y(h0, sA), b0 = Y(h0, sB), a1 = Math.max(a0 + 1, Y(h1, sA)), b1 = Math.max(b0 + 1, Y(h1, sB)); if (Math.max(a1, b1) <= viewTop) continue; g.fillStyle = col; if (xb - xa === 1) g.fillRect(xa, a0, 1, a1 - a0); else quad(xa, a0, b0, xb, b1, a1); }
    }
    bRuns.length = 0;
    for (let k = 0; k < seps.length; k += 4) { g.fillStyle = seps[k + 3]; g.fillRect(seps[k], seps[k + 1], 1, seps[k + 2]); } seps.length = 0;
    winFlush();
    for (let k = 0; k < litPix.length; k += 3) { g.fillStyle = litPix[k + 2]; g.fillRect(litPix[k], litPix[k + 1], 1, 1); } litPix.length = 0;
  }
  // windows are gathered into runs of columns (one bay of one facade) and drawn as one quad per floor:
  // facade heights are linear in screen column, so the quad is exact and saves thousands of 1-px slivers
  let wRun = null; const wRuns = [];
  function winCollect(col, b, face, bay, sub, z) {
    const key = b.id * 64 + face * 16 + sub;
    if (wRun && wRun.key === key && wRun.bay === bay && wRun.c1 === col - 1) { wRun.c1 = col; wRun.z1 = z; return; }
    if (wRun) wRuns.push(wRun);
    wRun = { key, b, face, bay, sub, c0: col, c1: col, z0: z, z1: z };
  }
  function winFlush() { if (wRun) wRuns.push(wRun); wRun = null; for (const r of wRuns) winDraw(r); wRuns.length = 0; }
  function quad(xa, y0a, y0b, xb, y1b, y1a) { g.beginPath(); g.moveTo(xa, y0a); g.lineTo(xb, y0b); g.lineTo(xb, y1b); g.lineTo(xa, y1a); g.closePath(); g.fill(); }
  function winDraw(r) {
    const b = r.b, m = MAT[b.pal], xa = r.c0, xb = r.c1 + 1, side = r.face !== 2;
    const sA = side ? Math.abs(xa - cxG) / XB : F / r.z0, sB = side ? Math.abs(xb - cxG) / XB : F / r.z0, zm = (r.z0 + r.z1) / 2, fz = fogQ(zm);
    const [fa, fb] = b.style === 1 ? [0.3, 0.72] : b.style === 2 ? [0.18, 0.86] : [0.3, 0.78];
    const floors = Math.floor(b.hgt / FH), fTop = Math.min(floors, Math.ceil(((hyG - viewTop) / Math.min(sA, sB) + E) / FH));
    const Y = (h, s) => Math.round(hyG + (E - h) * s), sp = 0.35 + 0.3 * Math.abs(Math.sin(r.bay * 1.7));
    const refl = fogC(r.face === 0 ? '#a8c4e8' : '#5a7098', zm), glass = fogC(r.face === 0 ? '#3a4a6a' : '#1c2238', zm), sill = fogC(m[3], zm);
    for (let f = 2; f < fTop; f++) {
      const ta = Y((f + fb) * FH, sA), tb = Y((f + fb) * FH, sB), ba = Y((f + fa) * FH, sA), bb = Y((f + fa) * FH, sB);
      if (Math.max(ba, bb) <= viewTop || Math.max(ba - ta, bb - tb) < 1) continue;
      if (night) {
        const hs = chX_h(b.seed, f, r.bay), on = hs % 5 < 2;
        let wc = on ? ((hs >>> 5) % 5 === 0 ? '#9ad0ff' : (hs >>> 5) % 3 ? '#ffc864' : '#ffe6a8') : '#07080e';
        if (on && r.sub) wc = '#c07a3a'; // curtain edge
        g.fillStyle = on ? mix(wc, HAZE, Math.round(fz * 5) / 10) : wc; quad(xa, ta, tb, xb, bb, ba);
      } else {
        const sa = ta + Math.max(1, Math.round((ba - ta) * sp)), sb = tb + Math.max(1, Math.round((bb - tb) * sp));
        g.fillStyle = refl; quad(xa, ta, tb, xb, sb, sa); g.fillStyle = glass; quad(xa, sa, sb, xb, bb, ba);
        if (Math.max(ba - ta, bb - tb) > 3) { g.fillStyle = sill; quad(xa, ba, bb, xb, bb + 1, ba + 1); }
      }
    }
  }
  // paint ramps for the traffic: [dark, mid, light]
  const CIVP = { [P.G3]: ['#3a3e4c', '#8a90a0', '#d0d4de'], [P.W]: ['#5a5e70', '#d4d8e2', '#ffffff'], [P.BR]: ['#3a2218', '#7a4e30', '#c08a5c'], [P.YE]: ['#7a5410', '#d8a830', '#fff08a'],
    [P.RD]: ['#3a0812', '#901c24', '#d8483a'], [P.BL2]: ['#16224a', '#3656a0', '#7aa0e8'], [P.PK]: ['#4a0634', '#c0268a', '#ff7ad8'], [P.RD2]: ['#1a0a10', '#5a141e', '#b83a36'] };
  const rampOf = o => o.def ? chX_paintOf(o.def).slice(1, 4) : CIVP[o === sus ? P.PK : o.col] || CIVP[P.G3];
  function carBack(sx, sb, cw, o, on, z) { // procedural rear/front view of a car, cw fine px wide, bottom at sb
    const [dk, md, lt] = rampOf(o).map(c => night ? mix(c, '#06070e', 0.55) : fogC(c, z)), ch = Math.max(3, Math.round(cw * 0.52));
    const top = sb - ch, belt = sb - Math.round(ch * 0.55);
    g.fillStyle = 'rgba(0,0,8,0.45)'; g.fillRect(sx - 1, sb - 1, cw + 2, 2);
    g.fillStyle = '#0a0a10'; g.fillRect(sx + 1, sb - 2, Math.max(1, cw * 0.18), 2); g.fillRect(sx + cw - 1 - Math.max(1, cw * 0.18), sb - 2, Math.max(1, cw * 0.18), 2); // tyres
    g.fillStyle = md; g.fillRect(sx, belt, cw, sb - 2 - belt); g.fillStyle = lt; g.fillRect(sx, belt, cw, 1); g.fillStyle = dk; g.fillRect(sx, sb - 3, cw, 1);
    const ci = Math.round(cw * 0.14); g.fillStyle = md; g.fillRect(sx + ci, top, cw - ci * 2, belt - top);
    g.fillStyle = lt; g.fillRect(sx + ci, top, cw - ci * 2, 1);
    if (belt - top > 2) { const gi = ci + Math.max(1, Math.round(cw * 0.06)); g.fillStyle = night ? '#05060c' : fogC('#1a2034', z); g.fillRect(sx + gi, top + 1, cw - gi * 2, belt - top - 1); if (!night) { g.fillStyle = fogC('#7a90b8', z); g.fillRect(sx + gi, top + 1, Math.max(1, (cw - gi * 2) >> 2), belt - top - 1); } }
    const lw = Math.max(1, Math.round(cw * 0.2)), lh = Math.max(1, Math.round(ch * 0.14)), ly = belt + 1;
    const lc = on ? (night ? '#fffbe0' : '#fff4c0') : (night ? '#ff3a2a' : '#e02a2a');
    g.fillStyle = lc; g.fillRect(sx, ly, lw, lh); g.fillRect(sx + cw - lw, ly, lw, lh);
    if (cw > 14) { g.fillStyle = on ? '#ffffff' : '#ffb0a0'; g.fillRect(sx + 1, ly, 1, 1); g.fillRect(sx + cw - lw + 1, ly, 1, 1); g.fillStyle = '#e8e6d8'; g.fillRect(sx + (cw >> 1) - 2, sb - 5, 4, 2); }
    if (night) { g.save(); g.globalCompositeOperation = 'lighter'; const r = Math.max(3, cw * 0.35), cc = on ? '255,240,190' : '255,60,40'; chX_radial(sx + lw / 2, ly, r, [[0, 'rgba(' + cc + ',0.55)'], [1, 'rgba(' + cc + ',0)']]); chX_radial(sx + cw - lw / 2, ly, r, [[0, 'rgba(' + cc + ',0.55)'], [1, 'rgba(' + cc + ',0)']]); g.restore(); }
  }
  function drawWindshield(x0l, y0l, wl, hl) {
    const c = me(); const [cmx, cmy, dx, dy] = pos(c), CB = 2.5; const mx = cmx - dx * CB, my = cmy - dy * CB; // camera sits in the driver's seat, behind the car's map point
    const dt = Math.max(0, Math.min(0.1, t - lastT)); lastT = t;
    const head = dx + ',' + dy;
    if (prevCar === c && prevHead && head !== prevHead) { const [pdx, pdy] = prevHead.split(',').map(Number); const cr = pdx * dy - pdy * dx; turnDir = cr || 2; turnT = cr ? 0.45 : 0.6; }
    prevHead = head; prevCar = c; turnT = Math.max(0, turnT - dt);
    const tk = turnT / (turnDir === 2 ? 0.6 : 0.45), sway = Math.round((turnDir === 2 ? 120 : 46 * turnDir) * tk * tk);
    const bob = c.v > 2 && ((t * 9) | 0) % 3 === 0 ? 1 : 0;
    const x = x0l * 2, y = y0l * 2, w = wl * 2, VH = 112;
    const cx = x + (w >> 1) + sway * 2, hy = y + 44 + bob; hyG = hy; viewTop = y; cxG = cx;
    const q0 = dx ? mx : my, s = dx || dy, perpIdx = Math.round(((dx ? my : mx) - MX) / SP);
    const nodeAt = k => dx ? [k, perpIdx] : [perpIdx, k];
    fine(() => {
      g.save(); g.beginPath(); g.rect(x, y, w, VH); g.clip();
      // sky with distant skyline (wraps as we turn)
      const sk = skyArt(), off = ((sway * 2 % 280) + 280) % 280; g.drawImage(sk, x - 280 + off, y + bob - 4); g.drawImage(sk, x + off, y + bob - 4);
      // nodes ahead: where does the street end, where are side streets
      let zEnd = 1e9; const nodes = [];
      for (let k = -1; k < 9; k++) {
        const n = [c.b[0] + dx * k, c.b[1] + dy * k], zn = (SP - c.s) + k * SP + CB; nodes.push({ n, zn });
        if (k >= 0 && !has(n[0], n[1], n[0] + dx, n[1] + dy)) { zEnd = zn + GAP; break; }
      }
      const L = [dy, -dx], R = [-dy, dx];
      const sideOpen = (n, sv) => has(n[0], n[1], n[0] + sv[0], n[1] + sv[1]);
      // ---- ground: pavement, road, kerbs, centre line, cross streets, zebra crossings ----
      const paveC = night ? '#23242e' : '#a8a296', roadC = night ? '#15172a' : '#4c505e';
      for (let sy = hy + 1; sy < y + VH; sy++) {
        const z = E * F / (sy - hy); if (z > ZFAR) continue;
        const rh = RW * F / z, q = q0 + s * z;
        g.fillStyle = fogC(paveC, z); g.fillRect(x, sy, w, 1);
        let lo = cx - rh, hi = cx + rh, cross = null;
        for (const nd of nodes) if (Math.abs(z - nd.zn) < GAP) { cross = nd; if (sideOpen(nd.n, L)) lo = x; if (sideOpen(nd.n, R)) hi = x + w; }
        g.fillStyle = fogC(roadC, z); g.fillRect(lo, sy, hi - lo, 1);
        if (!cross) { const kw = Math.max(1, Math.round(0.08 * F / z)); g.fillStyle = fogC(night ? '#3a3a48' : '#e0dccf', z); g.fillRect(cx - rh - kw, sy, kw, 1); g.fillRect(cx + rh, sy, kw, 1); }
        if (night && z < 10) { const k = 1 - z / 10, lw = rh * (0.4 + 0.5 * k); g.fillStyle = 'rgba(255,230,170,' + (k * k * 0.3).toFixed(3) + ')'; g.fillRect(cx - lw, sy, lw * 2, 1); } // our headlights
        const dz = cross ? z - cross.zn : 99;
        if (cross && Math.abs(Math.abs(dz) - 1.35) < 0.3) { // zebra crossing
          g.fillStyle = fogC(night ? '#5a5a66' : '#ecebe4', z); const k = F / z; for (let xw = -RW + 0.1; xw < RW - 0.2; xw += 0.5) { const a = Math.round(cx + xw * k), b = Math.round(cx + (xw + 0.28) * k); g.fillRect(a, sy, Math.max(1, b - a), 1); }
        } else if (!cross && ((q / 2.5) & 1)) { const lw = Math.max(1, Math.round(0.12 * F / z)); g.fillStyle = fogC(night ? (z < 10 ? '#d8b040' : '#6a5a30') : '#f4cc3a', z); g.fillRect(Math.round(cx - lw / 2), sy, lw, 1); }
      }
      // ---- dead end: the facade across the end of the street ----
      if (zEnd < ZFAR) {
        const b = bldg(9000 + perpIdx * 4 + (dx ? 0 : 2) + (s > 0 ? 1 : 0), Math.round(q0 + s * zEnd), 0), sc = F / zEnd;
        const top = hy + (E - b.hgt) * sc, bot = hy + E * sc;
        for (let col = x; col < x + w; col++) wallColumn(col, top, bot, zEnd, b, 2, (col - cx) / sc + 50, true);
        bandFlush();
      }
      // ---- facades lining the street, column by column ----
      let prevId = -1;
      for (let col = x; col < x + w; col++) {
        const off = col + 0.5 - cx; if (Math.abs(off) < 1.2) { prevId = -1; continue; }
        const sv = off < 0 ? L : R, z = XB * F / Math.abs(off); if (z >= zEnd || z > ZFAR) { prevId = -1; continue; }
        const q = q0 + s * z, uu = (q - MX) / SP, blk = Math.floor(uu), fu = uu - blk;
        const key = perpIdx * 4 + (dx ? 0 : 2) + (sv[0] + sv[1] > 0 ? 1 : 0);
        let nI = null; if (fu < GAP / SP) nI = blk; else if (fu > 1 - GAP / SP) nI = blk + 1;
        if (nI !== null && sideOpen(nodeAt(nI), sv)) { // gap: side street, we see the front of the next block
          const zn = (MX + nI * SP - q0) * s, zf = zn + GAP; if (zf >= zEnd) { prevId = -1; continue; }
          const b = bldg(key, s > 0 ? nI : nI - 1, s > 0 ? 0 : 1), sc = F / zf;
          wallColumn(col, hy + (E - b.hgt) * sc, hy + E * sc, zf, b, 2, Math.abs(off) / sc - XB, false); prevId = -1; continue;
        }
        const b = bldg(key, blk, fu < 0.5 ? 0 : 1), sc = F / z;
        wallColumn(col, hy + (E - b.hgt) * sc, hy + E * sc, z, b, off < 0 ? 0 : 1, q * s, true);
        if (prevId !== -1 && prevId !== b.id) { const tp = Math.round(hy + (E - b.hgt) * sc); seps.push(col, tp, Math.round(hy + E * sc) - tp, night ? '#05060a' : fogC('#3a3444', z)); }
        prevId = b.id;
      }
      bandFlush();
      // far haze at the vanishing point
      if (zEnd >= ZFAR) { const hz = Math.max(2, Math.round(XB * F / ZFAR)); g.fillStyle = HAZE; g.fillRect(cx - hz, hy - 8, hz * 2, 8); }
      // ---- street lamps (mid-block, both kerbs), far to near ----
      const lampZ = []; { const first = Math.floor((q0 - MX) / SP) - 1; for (let k = 0; k < 10; k++) { const qL = MX + (first + k * s) * SP + SP / 2; const z = (qL - q0) * s; if (z > 1.6 && z < Math.min(zEnd - GAP, 44)) lampZ.push(z); } }
      lampZ.sort((a, b) => b - a);
      for (const z of lampZ) for (const side of [-1, 1]) {
        const sc = F / z, sx = Math.round(cx + side * 2.0 * sc), bot = Math.round(hy + E * sc), top = Math.round(hy + (E - 3.1) * sc), pw = Math.max(1, Math.round(0.08 * sc));
        const pole = night ? '#1a1c28' : fogC('#2c3040', z);
        g.fillStyle = pole; g.fillRect(sx, top, pw, bot - top);
        const arm = Math.max(1, Math.round(0.45 * sc)); g.fillRect(side < 0 ? sx : sx - arm + pw, top, arm, Math.max(1, pw));
        const hw = Math.max(1, Math.round(0.3 * sc)), hx = side < 0 ? sx + arm - hw : sx - arm + pw, hh = Math.max(1, Math.round(hw / 2.5));
        g.fillStyle = pole; g.fillRect(hx, top, hw, hh); g.fillStyle = night ? '#fff2c0' : fogC('#e8ecf0', z); g.fillRect(hx, top + hh, hw, 1);
        if (night) { g.save(); g.globalCompositeOperation = 'lighter'; chX_radial(hx + hw / 2, top + hh, Math.max(3, sc * 0.9), [[0, 'rgba(255,200,120,0.6)'], [1, 'rgba(255,170,90,0)']]); chX_radial(hx + hw / 2, bot, Math.max(3, sc * 1.4), [[0, 'rgba(255,180,100,0.22)'], [1, 'rgba(255,160,90,0)']], 0.3); g.restore(); }
      }
      // ---- cars ahead of us on this street ----
      const ahead_ = [];
      for (const o of cars) {
        if (o === c || o.wait) continue; if (o === sus && !c.seen) continue;
        const [ox, oy, odx, ody] = pos(o); const d = (ox - mx) * dx + (oy - my) * dy, perp = (ox - mx) * dy - (oy - my) * dx;
        if (Math.abs(perp) > 1.5 || d < CB + 1.2 || d > Math.min(zEnd - 1, 50)) continue;
        ahead_.push({ o, z: d, on: odx * dx + ody * dy < 0 });
      }
      ahead_.sort((a, b) => b.z - a.z);
      for (const { o, z, on } of ahead_) {
        const sc = F / z, cw = Math.max(3, Math.round(1.8 * sc));
        const sx = Math.round(cx + (on ? -0.75 : 0.75) * sc - cw / 2), sb = Math.round(hy + E * sc);
        if (night && z > 14) { g.fillStyle = on ? '#fff4d0' : '#ff3a2a'; g.fillRect(sx, sb - 2, 1, 1); g.fillRect(sx + cw - 1, sb - 2, 1, 1); continue; }
        carBack(sx, sb, cw, o, on, z);
        if (o === sus && (t * 4 | 0) % 2) { const ax = sx + (cw >> 1), ay = sb - Math.round(cw * 0.52) - 4; chX_fillPath([[ax - 3, ay - 3, 0], [ax + 3, ay - 3, 0], [ax, ay + 1, 0]], '#ff5ad8'); }
      }
      // ---- our own bonnet, A-pillars, roof lining ----
      g.drawImage(hoodArt(c.def), x, y + 88);
      g.drawImage(cabinArt(), x, y);
      mirror(x, y, c, cmx, cmy, dx, dy);
      g.restore();
    });
    // ================= DASHBOARD =================
    const Y = y + 112, spd = c.v / 0.12;
    fine(() => {
      g.save(); g.beginPath(); g.rect(x, Y, w, 84); g.clip();
      g.drawImage(dashArt(), x, Y);
      // speedometer: cruise marker and needle
      const ang = mp => (225 - Math.min(100, mp) * 2.7) * Math.PI / 180, scx = x + 32, scy = Y + 34;
      { const a = ang(c.target / 0.12); chX_seg(scx + Math.cos(a) * 18, scy - Math.sin(a) * 18, scx + Math.cos(a) * 23, scy - Math.sin(a) * 23, '#ffd040', 2); }
      { const a = ang(spd); g.save(); g.globalCompositeOperation = 'lighter'; chX_seg(scx, scy, scx + Math.cos(a) * 19, scy - Math.sin(a) * 19, 'rgba(255,90,40,0.35)', 3.5); g.restore(); chX_seg(scx - Math.cos(a) * 3, scy + Math.sin(a) * 3, scx + Math.cos(a) * 19, scy - Math.sin(a) * 19, '#ff6a3a', 1.4); chX_circ(scx, scy, 2.6, '#2a2c36'); chX_circ(scx - 0.6, scy - 0.6, 1.2, '#c8ccd8'); }
      // suspicion lamps
      const susLights = Math.min(5, Math.floor(c.susp / 20));
      for (let i = 0; i < 5; i++) {
        const lx = x + 102 + i * 12, on = i < susLights && !(c.susp > 80 && (t * 6 | 0) % 2);
        g.fillStyle = on ? '#ff4a30' : '#3a0c10'; g.fillRect(lx, Y + 4, 8, 6); g.fillStyle = on ? '#ffc0a0' : '#5a1a1c'; g.fillRect(lx + 1, Y + 4, 4, 1);
        if (on) { g.save(); g.globalCompositeOperation = 'lighter'; chX_radial(lx + 4, Y + 7, 8, [[0, 'rgba(255,70,40,0.5)'], [1, 'rgba(255,70,40,0)']]); g.restore(); }
      }
      // compass: heading tick, tracking arrow
      const ccx = x + 194, ccy = Y + 40;
      chX_seg(ccx + dx * 10, ccy + dy * 10, ccx + dx * 15, ccy + dy * 15, '#ffffff', 2);
      if (c.def.tracking && !evade) { const [sx, sy] = pos(sus); const a = Math.atan2(sy - my, sx - mx); if ((t * 3 | 0) % 2) { const d4 = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? [Math.sign(Math.cos(a)), 0] : [0, Math.sign(Math.sin(a))]; arrow(ccx, ccy, d4, '#ffd040'); } }
      if (evade) { const [hx, hy_] = nodeXY(labels[0].i, labels[0].j); const a = Math.atan2(hy_ - cmy, hx - cmx); const d4 = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? [Math.sign(Math.cos(a)), 0] : [0, Math.sign(Math.sin(a))]; arrow(ccx, ccy, d4, '#6aff8a'); }
      // steering wheel with the driver's hands
      const rot = (turnDir === 2 ? 3 : turnDir) * -1.1 * tk + (c.order ? (c.order[0] * dy - c.order[1] * dx) * 0.18 : 0);
      const wcx = x + 124, wcy = Y + 90, wr = 34;
      g.save(); g.beginPath(); g.rect(x, Y + 46, w, 38); g.clip();
      chX_arcS(wcx, wcy + 1, wr, Math.PI, Math.PI * 2, '#050508', 10);
      chX_arcS(wcx, wcy, wr, Math.PI, Math.PI * 2, '#1e1c24', 7.5);
      chX_arcS(wcx, wcy - 2, wr + 1.5, Math.PI * 1.12, Math.PI * 1.88, '#4e4a58', 1.5); chX_arcS(wcx, wcy + 1.5, wr - 2.5, Math.PI * 1.1, Math.PI * 1.9, '#0c0b10', 1.2);
      for (const sa of [Math.PI, 0]) { const an = sa + rot; chX_seg(wcx + Math.cos(an) * 10, wcy + Math.sin(an) * 10, wcx + Math.cos(an) * (wr - 2), wcy + Math.sin(an) * (wr - 2), '#141218', 5); chX_seg(wcx + Math.cos(an) * 10, wcy + Math.sin(an) * 10 - 1.5, wcx + Math.cos(an) * (wr - 2), wcy + Math.sin(an) * (wr - 2) - 1.5, '#34303c', 1); }
      chX_circ(wcx, wcy, 12, '#0e0d12'); chX_circ(wcx, wcy, 10.5, '#22202a'); chX_arcS(wcx, wcy, 9, Math.PI * 1.15, Math.PI * 1.7, '#5a5664', 1.2);
      g.drawImage(badgeArt(), wcx - 5, wcy - 9);
      for (const side of [-1, 1]) {
        const an = -Math.PI / 2 + side * 0.95 + rot, hx = wcx + Math.cos(an) * wr, hy2 = wcy + Math.sin(an) * wr;
        g.save(); g.translate(hx, hy2); g.rotate(an + Math.PI / 2); g.scale(side > 0 ? -0.88 : 0.88, 0.88); chX_hand(); g.restore();
      }
      g.restore();
      g.restore();
    });
    // car number, follow / order indicators, speed readout, clock (bitmap UI font)
    text('#' + c.n, x0l + 82, y0l + 58, '#ffffff'); if (c.follow && (t * 2 | 0) % 2) text('F', x0l + 98, y0l + 58, '#ffd040');
    if (c.order) text({ '0,-1': '▲', '0,1': '▼', '-1,0': '◀', '1,0': '▶' }[c.order.join(',')], x0l + 105, y0l + 57, '#7aff8a');
    textC(String(Math.round(spd / 5) * 5), x0l + 16, y0l + 77, '#8aff9a');
    if (!c.def.tracking && !evade) text('--', x0l + 94, y0l + 73, '#5a6070');
    const hh = hourOf(game.t || 0); text((hh % 12 || 12) + ':' + String(Math.floor(t / 60 * 5) % 60).padStart(2, '0') + ':' + String(Math.floor(t * 5) % 60).padStart(2, '0'), x0l + 83, y0l + 88, '#8aff9a');
  }
  function arrow(cx, cy, d, col) { // compass needle arrow, fine grid
    const [ax, ay] = d; chX_seg(cx - ax * 10, cy - ay * 10, cx + ax * 8, cy + ay * 8, '#05060a', 3.4); chX_seg(cx - ax * 10, cy - ay * 10, cx + ax * 8, cy + ay * 8, col, 1.6);
    chX_fillPath([[cx + ax * 13, cy + ay * 13, 0], [cx + ax * 6 + ay * 5, cy + ay * 6 + ax * 5, 0], [cx + ax * 6 - ay * 5, cy + ay * 6 - ax * 5, 0]], col);
  }
  function mirror(x, y, c, mx, my, dx, dy) { // fine grid
    const X = x + 100, Y = y + 4; g.fillStyle = '#0c0c12'; g.fillRect(X + 17, y, 3, 5);
    chX_fillPath([[X, Y, 3], [X + 36, Y, 3], [X + 36, Y + 13, 3], [X, Y + 13, 3]], '#0c0c12');
    g.save(); chX_path([[X + 2, Y + 2, 2], [X + 34, Y + 2, 2], [X + 34, Y + 11, 2], [X + 2, Y + 11, 2]]); g.clip();
    chX_bands(X, Y + 2, 36, 5, night ? [[0, '#0a0e22'], [1, '#1a1e38']] : [[0, '#6a90c8'], [1, '#c8d4e4']], 3);
    g.fillStyle = night ? '#141626' : '#6a6e7a'; g.fillRect(X, Y + 7, 36, 4); g.fillStyle = night ? '#20222e' : '#9a9690'; g.fillRect(X + 14, Y + 7, 8, 4);
    for (const o of cars) { if (o === c || o.wait || o === sus) continue; const [ox, oy] = pos(o); const d = -((ox - mx) * dx + (oy - my) * dy), perp = (ox - mx) * dy - (oy - my) * dx; if (Math.abs(perp) > 1.5 || d < 1 || d > 24) continue; const sz = d < 8 ? 4 : 2; const col = o.kind === 'hunter' ? '#ff3a2a' : night ? '#fff0c0' : rampOf(o)[1]; g.fillStyle = col; g.fillRect(X + 18 - sz, Y + 9 - sz, sz * 2, sz); if (night || o.kind === 'hunter') { g.save(); g.globalCompositeOperation = 'lighter'; chX_radial(X + 18, Y + 9 - sz / 2, sz * 2, [[0, o.kind === 'hunter' ? 'rgba(255,60,40,0.6)' : 'rgba(255,240,190,0.5)'], [1, 'rgba(0,0,0,0)']]); g.restore(); } }
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(X + 4, Y + 2); g.lineTo(X + 9, Y + 2); g.lineTo(X + 5, Y + 11); g.lineTo(X + 1, Y + 11); g.fill();
    g.restore();
  }
  function skyArt() {
    return art('chX:sky' + (night ? 'n' : 'd'), 140, 30, () => {
      const Wd = 280;
      if (night) {
        chX_bands(0, 0, Wd, 60, [[0, '#04060e'], [0.55, '#0e1430'], [0.85, '#221c3c'], [1, '#3a2a48']], 8);
        for (let i = 0; i < 46; i++) { const sx = chX_h(i, 1, 2) % Wd, sy = chX_h(i, 3, 4) % 34, b = i % 7 === 0; g.fillStyle = b ? '#ffffff' : i % 3 ? '#6a74a0' : '#b0b8e0'; g.fillRect(sx, sy, 1, 1); if (b) { g.fillStyle = 'rgba(200,210,255,0.4)'; g.fillRect(sx - 1, sy, 3, 1); g.fillRect(sx, sy - 1, 1, 3); } }
        g.save(); g.globalCompositeOperation = 'lighter'; chX_radial(84, 14, 16, [[0, 'rgba(200,210,255,0.35)'], [1, 'rgba(160,170,255,0)']]); g.restore();
        chX_circ(84, 14, 6, '#f4f0dc'); chX_circ(87, 12, 5.4, '#0e1430'); chX_arcS(84, 14, 5.2, Math.PI * 0.55, Math.PI * 1.1, '#ffffff', 1);
      } else {
        chX_bands(0, 0, Wd, 60, [[0, '#3a68b4'], [0.5, '#6a9ad4'], [0.8, '#a8c4e0'], [1, '#e8dcc8']], 8);
        const cloud = (cx, cy, s) => { for (const [ox, oy, r] of [[-10, 2, 6], [-3, -2, 8], [6, 0, 7], [13, 3, 5], [0, 4, 7]]) chX_circ(cx + ox * s, cy + oy * s, r * s, '#c8c4dc'); for (const [ox, oy, r] of [[-10, 1, 5.4], [-3, -3, 7.4], [6, -1, 6.4], [13, 2, 4.4], [0, 2, 6]]) chX_circ(cx + ox * s, cy + oy * s - 0.6, r * s, '#f4f2ee'); for (const [ox, oy, r] of [[-3, -4, 5], [6, -2, 4]]) chX_circ(cx + ox * s - 1, cy + oy * s - 1, r * s, '#ffffff'); g.fillStyle = '#b4b4d0'; g.fillRect(cx - 16 * s, cy + 6 * s, 34 * s, 1.5); };
        cloud(40, 14, 0.9); cloud(150, 20, 0.6); cloud(226, 10, 0.75);
      }
      // distant skyline silhouette in two hazy layers
      for (const [layer, hmin, hvar, col, top] of [[0, 10, 12, night ? '#141a34' : '#98a8c4', night ? '#1c2444' : '#b0bed4'], [1, 5, 9, night ? '#0e1226' : '#8494b4', night ? '#161c36' : '#9aa8c4']]) {
        for (let xb = 0; xb < Wd; xb += 6) { const hs = chX_h(xb >> 1, 5 + layer, 6), bw = 6 + (hs % 3) * 2, hh = hmin + (hs >>> 3) % hvar; g.fillStyle = col; g.fillRect(xb, 60 - hh, bw, hh); g.fillStyle = top; g.fillRect(xb, 60 - hh, bw, 1);
          if (night) for (let k = 0; k < 3; k++) { const wh = chX_h(xb, k, layer); if (wh % 3 === 0) { g.fillStyle = wh % 2 ? '#ffc864' : '#e8a050'; g.fillRect(xb + 1 + wh % (bw - 2), 60 - hh + 2 + (wh >>> 4) % Math.max(1, hh - 3), 1, 1); } }
          else if ((hs >>> 7) % 5 === 0) { g.fillStyle = top; g.fillRect(xb + (bw >> 1), 60 - hh - 4, 1, 4); } }
      }
    });
  }
  function hoodArt(def) {
    return art('chX:hood' + def.name + (night ? 'n' : 'd'), 118, 12, () => {
      const [deep, dark, mid, lite, high, spec] = chX_paintOf(def), Wd = 236, top = xx => { const e = (xx - 118) / 118; return 8 + e * e * 16; };
      g.save(); g.beginPath(); g.moveTo(0, 24); for (let xx = 0; xx <= Wd; xx += 4) g.lineTo(xx, top(xx)); g.lineTo(Wd, 24); g.closePath(); g.clip();
      const n = c => night ? mix(c, '#05060e', 0.6) : c;
      chX_bands(0, 7, Wd, 17, [[0, n(high)], [0.15, n(lite)], [0.3, n(dark)], [0.55, n(mid)], [1, n(deep)]], 4);
      g.fillStyle = n(spec); for (let xx = 0; xx < Wd; xx++) g.fillRect(xx, Math.round(top(xx)), 1, 1); // leading-edge highlight
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(116, 8, 4, 16); g.fillStyle = n(lite); g.fillRect(115, 8, 1, 16); // centre crease
      if (!night) { chX_streak(40, 13, 60, spec, 0.8); chX_streak(140, 12, 40, spec, 0.55); } else { chX_streak(60, 12, 40, '#ffe0a0', 0.35); }
      g.restore();
      g.fillStyle = '#0a0a10'; g.fillRect(40, 21, 60, 2); g.fillRect(132, 21, 64, 2); g.fillStyle = '#3a3a48'; g.fillRect(40, 21, 60, 1); g.fillRect(132, 21, 64, 1); // wipers
      g.fillStyle = '#0a0a10'; g.fillRect(0, 23, Wd, 1);
    });
  }
  function cabinArt() {
    return art('chX:cabin', 118, 56, () => {
      const Wd = 236, Hd = 112;
      for (let yy = 0; yy < Hd; yy++) { const pw = Math.round(22 - yy * 0.2); g.fillStyle = '#0e0d14'; g.fillRect(0, yy, pw, 1); g.fillRect(Wd - pw, yy, pw, 1); g.fillStyle = '#2e2c38'; g.fillRect(pw - 1, yy, 1, 1); g.fillStyle = '#1e1c26'; g.fillRect(Wd - pw, yy, 1, 1); }
      chX_bands(0, 0, Wd, 6, [[0, '#2a2834'], [1, '#141219']], 3); g.fillStyle = '#3e3c48'; g.fillRect(0, 5, Wd, 1); g.fillStyle = '#08080c'; g.fillRect(0, 6, Wd, 1);
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.moveTo(0, 7); g.lineTo(26, 7); g.lineTo(0, 30); g.fill(); g.beginPath(); g.moveTo(Wd, 7); g.lineTo(Wd - 26, 7); g.lineTo(Wd, 30); g.fill(); // rounded screen corners
      for (let yy = 100; yy < Hd; yy++) { const inset = (Hd - yy) * 2; g.fillStyle = '#0e0d14'; g.fillRect(0, yy, 24 - inset, 1); g.fillRect(Wd - 24 + inset, yy, 24 - inset, 1); }
    });
  }
  function badgeArt() { return art('chX:badge', 5, 5, () => { chX_circ(5, 5, 4.5, '#c8a040'); chX_circ(5, 5, 3.4, '#2a1c10'); chX_fillPath([[5, 2.5, 0], [7.4, 6.5, 0], [2.6, 6.5, 0]], '#ffd870'); }); }
  function dashArt() {
    return art('chX:dash', 118, 42, () => {
      const Wd = 236, Hd = 84;
      chX_bands(0, 0, Wd, Hd, [[0, '#2a2632'], [0.12, '#1c1a24'], [1, '#0a090e']], 6);
      g.fillStyle = '#4a4656'; g.fillRect(0, 0, Wd, 1); g.fillStyle = '#34303e'; g.fillRect(0, 1, Wd, 2); g.fillStyle = '#060508'; g.fillRect(0, 4, Wd, 1); // dash top roll
      // instrument binnacle behind the speedometer
      chX_circ(32, 35, 31, '#060508'); chX_circ(32, 34, 30, '#2a2834');
      // speedometer: chrome bezel, black face, ticks with a red zone
      chX_circ(32, 34, 27.5, '#5a6072'); chX_arcS(32, 34, 26.5, Math.PI * 1.05, Math.PI * 1.75, '#e8ecf4', 1.4); chX_arcS(32, 34, 26.5, Math.PI * 0.1, Math.PI * 0.7, '#2a2e3a', 1.4);
      chX_circ(32, 34, 25, '#07080c'); chX_radial(28, 28, 26, [[0, 'rgba(60,70,100,0.35)'], [1, 'rgba(0,0,0,0)']]);
      for (let mph = 0; mph <= 100; mph += 5) { const a = (225 - mph * 2.7) * Math.PI / 180, major = mph % 20 === 0, mid10 = mph % 10 === 0, r0 = major ? 17 : mid10 ? 19 : 21; chX_seg(32 + Math.cos(a) * r0, 34 - Math.sin(a) * r0, 32 + Math.cos(a) * 23, 34 - Math.sin(a) * 23, mph >= 80 ? '#ff4a34' : major ? '#f4f4f8' : '#8a90a0', major ? 1.4 : 0.9); }
      chX_fillPath([[18, 42, 2], [46, 42, 2], [46, 56, 2], [18, 56, 2]], '#2a3a2e'); chX_fillPath([[19, 43, 1], [45, 43, 1], [45, 55, 1], [19, 55, 1]], '#081208'); // readout window
      // speed keys: rubber buttons with chrome rims (layout 30..39 and 40..49, y 8..18)
      for (const [kx, lab] of [[60, '-'], [80, '+']]) {
        chX_fillPath([[kx, 16, 3], [kx + 18, 16, 3], [kx + 18, 36, 3], [kx, 36, 3]], '#050508');
        chX_fillPath([[kx + 1, 16, 3], [kx + 17, 16, 3], [kx + 17, 34, 3], [kx + 1, 34, 3]], '#8a90a0');
        chX_fillPath([[kx + 2, 17, 2], [kx + 16, 17, 2], [kx + 16, 33, 2], [kx + 2, 33, 2]], '#3a3a46');
        chX_bands(kx + 3, 18, 12, 14, [[0, '#5a5a68'], [1, '#2a2a34']], 3);
        g.fillStyle = '#f4f4f8'; g.fillRect(kx + 5, 24, 8, 2); if (lab === '+') g.fillRect(kx + 8, 21, 2, 8);
      }
      // warning-lamp housing
      chX_fillPath([[98, 1, 2], [164, 1, 2], [164, 13, 2], [98, 13, 2]], '#050508'); chX_fillPath([[99, 2, 1], [163, 2, 1], [163, 12, 1], [99, 12, 1]], '#1a1820');
      // compass housing: chrome ring, dark face, rose
      chX_circ(194, 40, 21, '#060508'); chX_circ(194, 40, 19.5, '#5a6072'); chX_arcS(194, 40, 18.6, Math.PI * 1.05, Math.PI * 1.75, '#e8ecf4', 1.2);
      chX_circ(194, 40, 17, '#0a0c14'); chX_radial(190, 35, 16, [[0, 'rgba(60,70,110,0.4)'], [1, 'rgba(0,0,0,0)']]);
      for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, r0 = k % 4 === 0 ? 12 : 14.5; chX_seg(194 + Math.cos(a) * r0, 40 + Math.sin(a) * r0, 194 + Math.cos(a) * 16, 40 + Math.sin(a) * 16, k % 4 === 0 ? '#c8ccd8' : '#4a5064', k % 4 === 0 ? 1.2 : 0.8); }
      chX_fillPath([[194, 23, 0], [196.5, 28, 0], [191.5, 28, 0]], '#ff4a34');
      // clock LCD
      chX_fillPath([[160, 60, 2], [234, 60, 2], [234, 82, 2], [160, 82, 2]], '#050508');
      chX_fillPath([[161, 61, 2], [233, 61, 2], [233, 81, 2], [161, 81, 2]], '#5a6072');
      chX_bands(162, 62, 70, 18, [[0, '#0e2418'], [1, '#06120c']], 3); g.fillStyle = 'rgba(160,255,190,0.08)'; g.fillRect(162, 62, 70, 1);
      // steering column shroud
      chX_fillPath([[108, 84, 0], [112, 70, 4], [136, 70, 4], [140, 84, 0]], '#0e0d12');
    });
  }
  // ================= CITY CLOSE-UP (top-down) =================
  // Plan: a 4x zoom aerial view on the fine grid. Sun from the upper left: every building has a lit parapet
  // top-left, a shaded edge bottom-right and a cast shadow on the pavement down-right. Materials read by
  // clean clusters (gravel roof, glass skylights, clay roof tiles, lawn, water). Night grades the same art
  // with a cool multiply and relights it with warm windows, junction lamps and headlight beams.
  const Z = 4, BS = (SP - 2) * Z;
  const KINDS = [1, 1, 6, 6, 4, 4, 0, 3, 5, 2, 1, 6];
  function blockArt(kind, v) {
    return art('chX:blk' + kind + v + (night ? 'n' : 'd'), BS, BS, () => {
      const S = BS * 2, fl = v & 1, fill = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      const tree = (tx, ty, r) => { chX_circ(tx + r * 0.5, ty + r * 0.6, r, 'rgba(10,20,40,0.45)'); chX_circ(tx, ty, r, '#24583a'); chX_circ(tx - r * 0.2, ty - r * 0.2, r * 0.78, '#3a7a3e'); chX_circ(tx - r * 0.35, ty - r * 0.38, r * 0.45, '#6aa84a'); chX_circ(tx - r * 0.45, ty - r * 0.5, r * 0.18, '#a8d070'); };
      const shadowBox = (x, y, w, h, d) => { g.fillStyle = 'rgba(20,18,50,0.42)'; g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w + d, y + d); g.lineTo(x + w + d, y + h + d); g.lineTo(x + d, y + h + d); g.lineTo(x, y + h); g.lineTo(x + w, y + h); g.closePath(); g.fill(); };
      const roofBox = (x, y, w, h, lo, mid, hi) => { fill(x, y, w, h, mid); fill(x, y, w, 2, hi); fill(x, y, 2, h, hi); fill(x, y + h - 2, w, 2, lo); fill(x + w - 2, y, 2, h, lo); };
      // pavement ring with kerb stones
      fill(0, 0, S, S, '#b4ad9e'); fill(0, 0, S, 1, '#d8d2c2'); fill(0, 0, 1, S, '#d8d2c2'); fill(0, S - 1, S, 1, '#6a6660'); fill(S - 1, 0, 1, S, '#6a6660');
      for (let q = 8; q < S; q += 8) { fill(q, 1, 1, 3, '#a09a8c'); fill(1, q, 3, 1, '#a09a8c'); fill(q, S - 4, 1, 3, '#a09a8c'); fill(S - 4, q, 3, 1, '#a09a8c'); }
      const I = 4, L = S - 8;
      if (kind === 0) { // park: lawn, a curving gravel path, pond, trees
        chX_bands(I, I, L, L, [[0, '#5c9a46'], [1, '#467e3a']], 4); fill(I, I, L, 1, '#78b056');
        g.strokeStyle = '#d4c49a'; g.lineWidth = 3; g.beginPath(); g.moveTo(I, fl ? I + L - 6 : I + 6); g.bezierCurveTo(I + 16, fl ? I + 10 : I + L - 10, I + L - 16, fl ? I + L - 10 : I + 10, I + L, fl ? I + 6 : I + L - 6); g.stroke();
        const px_ = fl ? 16 : 30; chX_fillPath([[px_ - 8, 26, 5], [px_ + 8, 24, 5], [px_ + 9, 36, 5], [px_ - 7, 37, 5]], '#2a4a74'); chX_fillPath([[px_ - 6, 27, 4], [px_ + 7, 26, 4], [px_ + 7, 34, 4], [px_ - 5, 35, 4]], '#3a6aa8'); fill(px_ - 3, 28, 6, 1, '#a8d0f0');
        tree(12, 12, 6); tree(32, 10, 4.5); tree(fl ? 34 : 13, 36, 5.5);
      } else if (kind === 1) { // office: gravel roof, parapet, AC units, skylights
        shadowBox(I, I, L, L, 3); roofBox(I, I, L, L, '#6e6c76', '#9a978f', '#c8c4ba');
        fill(I + 3, I + 3, L - 6, L - 6, '#8c8a86');
        for (let q = 0; q < 3; q++) { const ax = 9 + q * 10, ay = fl ? 28 : 9; shadowBox(ax, ay, 8, 6, 2); roofBox(ax, ay, 8, 6, '#5a5e6c', '#9aa0ae', '#d8dce6'); chX_circ(ax + 4, ay + 3, 2, '#3a3e4a'); chX_circ(ax + 3.6, ay + 2.6, 0.9, '#c8ccd8'); }
        for (let q = 0; q < 4; q++) { const sx = 9 + q * 8, sy = fl ? 10 : 27; fill(sx, sy, 6, 9, '#3a4a68'); fill(sx, sy, 6, 3, '#9ab4d8'); fill(sx, sy, 1, 9, '#c8dcf0'); fill(sx + 5, sy, 1, 9, '#2a3450'); }
      } else if (kind === 2) { // tower with helipad: tall, long cast shadow
        g.fillStyle = 'rgba(20,18,50,0.45)'; g.beginPath(); g.moveTo(I + L - 2, I + 2); g.lineTo(S, I + 10); g.lineTo(S, S); g.lineTo(I + 10, S); g.lineTo(I + 2, I + L - 2); g.closePath(); g.fill();
        roofBox(I + 2, I + 2, L - 4, L - 4, '#3a4058', '#5a627c', '#8a94ae');
        fill(I + 5, I + 5, L - 10, L - 10, '#4a5068');
        chX_circ(24, 24, 11, '#2a2e3c'); chX_circ(24, 24, 10, '#e8e4d8'); chX_circ(24, 24, 8.6, '#3e4458');
        fill(20, 19, 2, 10, '#ffd040'); fill(26, 19, 2, 10, '#ffd040'); fill(22, 23, 4, 2, '#ffd040');
      } else if (kind === 3) { // parking lot
        fill(I, I, L, L, '#4a4e5a'); fill(I, I, L, 1, '#6a6e7a');
        for (let q = 0; q <= 5; q++) { fill(I + 2 + q * 8, I + 2, 1, 13, '#e4e2da'); fill(I + 2 + q * 8, I + L - 15, 1, 13, '#e4e2da'); }
        const cols = [P.RD, P.BL2, P.W, P.YE, P.G3, P.BR];
        for (let q = 0; q < 5; q++) { if ((v + q) % 3 !== 2) g.drawImage(topArt(CIVP[cols[(q + v) % 6]], true), I + 4 + q * 8 - 1, I + 2); if ((v + q) % 4 !== 1) { g.save(); g.translate(I + 4 + q * 8 - 1 + 10, I + L - 2); g.rotate(Math.PI); g.drawImage(topArt(CIVP[cols[(q * 2 + v) % 6]], true), 0, 0); g.restore(); } }
        shadowBox(I + 28, I + 18, 8, 6, 2); roofBox(I + 28, I + 18, 8, 6, '#8a8680', '#d8d2c4', '#ffffff'); fill(I + 30, I + 20, 3, 2, '#9ab4d8');
      } else if (kind === 4) { // houses: pitched clay roofs, chimneys, gardens and hedges
        chX_bands(I, I, L, L, [[0, '#6a9c4e'], [1, '#54883e']], 3);
        for (const [hx, hy] of [[6, 6], [26, 6], [6, 26], [26, 26]]) {
          shadowBox(hx, hy, 16, 14, 3);
          fill(hx, hy, 16, 7, '#d8805a'); fill(hx, hy + 7, 16, 7, '#9a4a3e'); fill(hx, hy + 6, 16, 1, '#f0b08a'); fill(hx, hy, 16, 1, '#e89a72');
          for (let q = 2; q < 16; q += 3) { fill(hx + q, hy + 1, 1, 5, '#c06a4a'); fill(hx + q, hy + 8, 1, 5, '#7a3a34'); }
          const cx = hx + 3 + (hx + v * 5) % 9; fill(cx, hy + 2, 3, 3, '#6a5a5a'); fill(cx, hy + 2, 3, 1, '#a89a90');
        }
        fill(I, 23, L, 2, '#3a6a34'); fill(23, I, 2, L, '#3a6a34');
      } else if (kind === 5) { // plaza: stone paving, fountain, benches, four trees
        fill(I, I, L, L, '#d4cab4'); for (let q = I + 6; q < I + L; q += 7) { fill(q, I, 1, L, '#c2b89e'); fill(I, q, L, 1, '#c2b89e'); }
        chX_circ(24, 24, 11, '#8a8272'); chX_circ(24, 24, 10, '#e8e0cc'); chX_circ(24, 24, 8.5, '#2a5a94'); chX_circ(23, 23, 6, '#3a74b8'); chX_circ(24, 24, 2.2, '#d8d0bc');
        tree(9, 9, 4.5); tree(39, 9, 4.5); tree(9, 39, 4.5); tree(39, 39, 4.5);
        for (const by of [6, 41]) { fill(19, by, 10, 2, '#7a5236'); fill(19, by, 10, 1, '#b08058'); }
      } else { // brick apartment ring round a courtyard
        shadowBox(I, I, L, L, 4); roofBox(I, I, L, L, '#6a3a38', '#a85a48', '#d88a6a');
        for (let q = I + 4; q < I + L - 2; q += 4) fill(I + 2, q, L - 4, 1, '#94503e');
        fill(14, 14, 20, 20, '#5a8a48'); fill(14, 14, 20, 3, 'rgba(20,18,50,0.4)'); fill(14, 14, 3, 20, 'rgba(20,18,50,0.4)'); tree(25, 25, 4.5);
        for (let q = 0; q < 3; q++) { fill(I + 4 + q * 14, I + 3, 5, 3, '#6a6e7a'); fill(I + 4 + q * 14, I + 3, 5, 1, '#b8bcc8'); }
      }
      if (night) { // cool night grade, then relight
        g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#343c68'; g.fillRect(0, 0, S, S); g.restore();
        g.save(); g.globalCompositeOperation = 'lighter';
        const lit = (x, y, r, a = 0.6) => chX_radial(x, y, r, [[0, 'rgba(255,190,110,' + a + ')'], [1, 'rgba(255,160,80,0)']]);
        if (kind === 1) for (let q = 0; q < 4; q++) { if ((q + v) % 3) { fill(9 + q * 8, fl ? 10 : 27, 6, 9, 'rgba(255,200,110,0.55)'); lit(12 + q * 8, fl ? 14 : 31, 8, 0.25); } }
        if (kind === 6) for (let q = 0; q < 6; q++) { const wx = 8 + (q % 3) * 14, wy = q < 3 ? 8 : 40; fill(wx, wy, 3, 2, '#ffd070'); }
        if (kind === 4) for (const [hx, hy] of [[6, 6], [26, 6], [6, 26], [26, 26]]) lit(hx + 8, hy + 16, 5, 0.5);
        if (kind === 5) { lit(24, 24, 14, 0.25); chX_radial(24, 24, 9, [[0, 'rgba(90,160,255,0.35)'], [1, 'rgba(90,160,255,0)']]); }
        if (kind === 3) lit(I + 32, I + 21, 10, 0.4);
        g.restore();
      }
    });
  }
  function topArt(ramp, parked) { // 5 x 9 layout top-down car, nose up; ramp [dark, mid, light]
    const [dk, md, lt] = ramp;
    return art('chX:top' + dk + md + (night && !parked ? 'n' : '') + (parked && night ? 'p' : ''), 5, 9, () => {
      chX_fillPath([[1, 2, 3], [9, 2, 3], [9, 17, 2], [1, 17, 2]], 'rgba(10,10,30,0.45)');
      chX_fillPath([[0, 1, 3], [8, 1, 3], [8, 16, 2], [0, 16, 2]], dk);
      chX_fillPath([[0.6, 1, 3], [7.4, 1, 3], [7.4, 15, 2], [0.6, 15, 2]], md);
      g.fillStyle = lt; g.fillRect(1, 2, 2, 12); g.fillRect(2, 1, 4, 1);
      chX_fillPath([[1.5, 5, 1], [6.5, 5, 1], [6, 8, 0], [2, 8, 0]], '#1a2238'); g.fillStyle = '#8aaad8'; g.fillRect(2, 5, 2, 1); // windscreen
      g.fillStyle = mix(md, lt, 0.4); g.fillRect(2, 8, 4, 4); g.fillStyle = lt; g.fillRect(2, 8, 4, 1); // roof
      chX_fillPath([[2, 12, 0], [6, 12, 0], [6.5, 14, 1], [1.5, 14, 1]], '#1a2238');
      g.fillStyle = '#fff2c0'; g.fillRect(1, 1, 2, 1); g.fillRect(5, 1, 2, 1); g.fillStyle = '#e02a2a'; g.fillRect(1, 15, 2, 1); g.fillRect(5, 15, 2, 1);
      if (night && parked) { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#343c68'; g.fillRect(0, 0, 10, 18); g.restore(); }
    });
  }
  function beamArt() { // headlight cone, nose up, drawn with 'lighter'
    return art('chX:beam', 10, 12, () => {
      const gr = g.createLinearGradient(0, 24, 0, 0); gr.addColorStop(0, 'rgba(255,240,180,0.55)'); gr.addColorStop(1, 'rgba(255,240,180,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(7, 24); g.lineTo(13, 24); g.lineTo(20, 0); g.lineTo(0, 0); g.closePath(); g.fill();
    });
  }
  function glowArt() { return art('chX:glow', 16, 16, () => chX_radial(16, 16, 16, [[0, 'rgba(255,190,110,0.55)'], [0.5, 'rgba(255,160,80,0.18)'], [1, 'rgba(255,150,70,0)']])); }
  function drawCloseUp(xl, yl, wl, hl) {
    const c = me(); const [mx, my] = pos(c);
    const x = xl * 2, y = yl * 2, w = wl * 2, h = hl * 2;
    fine(() => {
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
      g.fillStyle = night ? '#2a2c3a' : '#b4ad9e'; g.fillRect(x, y, w, h);
      const ox = Math.round(x + w / 2 - mx * Z * 2), oy = Math.round(y + h / 2 - my * Z * 2), Z2 = Z * 2;
      const i0 = Math.max(-1, Math.floor(((xl - (ox / 2)) / Z - MX) / SP) - 1), i1 = Math.min(N - 1, Math.ceil(((xl + wl - ox / 2) / Z - MX) / SP));
      const j0 = Math.max(-1, Math.floor(((yl - oy / 2) / Z - MY) / SP) - 1), j1 = Math.min(N - 1, Math.ceil(((yl + hl - oy / 2) / Z - MY) / SP));
      // streets: asphalt with lane dashes and zebra crossings
      const dash = night ? '#8a7a40' : '#f0c83a', zeb = night ? '#4a4c5a' : '#e4e2da';
      for (const [i, j, d] of edges()) {
        const [bx, by] = nodeXY(i, j); const X = ox + (bx - 1) * Z2, Y = oy + (by - 1) * Z2, L_ = (SP + 2) * Z2;
        if (d === 0 ? (X > x + w || X + L_ < x || Y > y + h || Y + 16 < y) : (X > x + w || X + 16 < x || Y > y + h || Y + L_ < y)) continue;
        const deg0 = degree.get(i + ',' + j) || 0, deg1 = degree.get(d === 0 ? (i + 1) + ',' + j : i + ',' + (j + 1)) || 0;
        g.fillStyle = night ? '#101320' : '#4a4e5c'; if (d === 0) g.fillRect(X, Y, L_, 16); else g.fillRect(X, Y, 16, L_);
        g.fillStyle = dash;
        if (d === 0) { for (let q = 24; q < SP * Z2 - 8; q += 12) g.fillRect(X + q, Y + 7, 6, 2); g.fillStyle = zeb; if (deg0 > 2) for (let q = 2; q < 16; q += 4) g.fillRect(X + 18, Y + q, 6, 2); if (deg1 > 2) for (let q = 2; q < 16; q += 4) g.fillRect(X + L_ - 24, Y + q, 6, 2); }
        else { for (let q = 24; q < SP * Z2 - 8; q += 12) g.fillRect(X + 7, Y + q, 2, 6); g.fillStyle = zeb; if (deg0 > 2) for (let q = 2; q < 16; q += 4) g.fillRect(X + q, Y + 18, 2, 6); if (deg1 > 2) for (let q = 2; q < 16; q += 4) g.fillRect(X + q, Y + L_ - 24, 2, 6); }
      }
      // blocks
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const [bx, by] = nodeXY(i, j); const X = ox + (bx + 1) * Z2, Y = oy + (by + 1) * Z2;
        const hs = chX_h(i + 50, j + 50, 11), kind = KINDS[hs % KINDS.length];
        g.drawImage(blockArt(kind, (hs >>> 5) % 2), X, Y);
        if (kind === 2 && (t * 2 | 0) % 2) { for (const [ax, ay] of [[8, 8], [38, 38]]) { g.fillStyle = '#ff3a2a'; g.fillRect(X + ax, Y + ay, 2, 2); g.save(); g.globalCompositeOperation = 'lighter'; chX_radial(X + ax + 1, Y + ay + 1, 5, [[0, 'rgba(255,60,40,0.6)'], [1, 'rgba(255,60,40,0)']]); g.restore(); } }
        if (kind === 5) { for (let k = 0; k < 6; k++) { const a = t * 2.4 + k * 1.047, r = 3 + ((t * 3 + k) % 1) * 4; g.fillStyle = k & 1 ? '#e8f4ff' : '#9ad0ff'; g.fillRect(X + 24 + Math.round(Math.cos(a) * r), Y + 24 + Math.round(Math.sin(a) * r), 1, 1); } }
        // pedestrians strolling round the block on the pavement
        for (let p = 0; p < 2; p++) {
          const sd = (BS - 2) * 2, per = sd * 4, ph = (chX_h(i, j, p) % per + t * (6 + 2 * p) * (p ? -1 : 1)) % per, pp = (ph + per) % per;
          let qx, qy; if (pp < sd) { qx = pp; qy = 0; } else if (pp < sd * 2) { qx = sd; qy = pp - sd; } else if (pp < sd * 3) { qx = sd * 3 - pp; qy = sd; } else { qx = 0; qy = per - pp; }
          const hs2 = chX_h(i, j, p + 5), shirt = ['#d83a34', '#3a6ad8', '#f0c030', '#f0eee8', '#3aa85a', '#c050b0'][hs2 % 6], hair = ['#3a2418', '#14141a', '#c8a048'][hs2 % 3];
          const PX = X + 1 + Math.round(qx), PY = Y + 1 + Math.round(qy), step = (t * 6 | 0) & 1;
          g.fillStyle = 'rgba(10,10,30,0.4)'; g.fillRect(PX + 1, PY + 1, 3, 3);
          g.fillStyle = '#2a2a34'; g.fillRect(PX + step, PY + 2, 1, 1);
          g.fillStyle = night ? mix(shirt, '#101430', 0.55) : shirt; g.fillRect(PX, PY + 1, 3, 2); g.fillStyle = 'rgba(0,0,30,0.3)'; g.fillRect(PX + 2, PY + 1, 1, 2);
          g.fillStyle = night ? '#3a2a2a' : hair; g.fillRect(PX + 1, PY, 2, 2); g.fillStyle = night ? '#6a4a40' : '#e8b08a'; g.fillRect(PX + 1, PY + 1, 1, 1);
        }
      }
      // junctions: traffic lights on the corners, sodium lamps at night
      for (let j = Math.max(0, j0); j <= j1; j++) for (let i = Math.max(0, i0); i <= i1; i++) {
        const dg = degree.get(i + ',' + j) || 0; if (dg < 3) continue;
        const [bx, by] = nodeXY(i, j); const X = ox + (bx - 1) * Z2, Y = oy + (by - 1) * Z2;
        if (night) { g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(glowArt(), X - 8, Y - 8); g.restore(); }
        const cyc = (t + (i * 7 + j * 3) % 6) % 6, hGreen = cyc < 2.6, hAmber = cyc >= 2.6 && cyc < 3, vGreen = cyc >= 3 && cyc < 5.6, vAmber = cyc >= 5.6;
        const hc = hGreen ? '#5aff7a' : hAmber ? '#ffc830' : '#ff3a2a', vc = vGreen ? '#5aff7a' : vAmber ? '#ffc830' : '#ff3a2a';
        for (const [lx, ly, col] of [[-5, -5, vc], [18, 18, vc], [18, -5, hc], [-5, 18, hc]]) {
          g.fillStyle = '#0a0a10'; g.fillRect(X + lx, Y + ly, 4, 4); g.fillStyle = col; g.fillRect(X + lx + 1, Y + ly + 1, 2, 2);
          if (night) { g.save(); g.globalCompositeOperation = 'lighter'; chX_radial(X + lx + 2, Y + ly + 2, 5, [[0, col === '#ff3a2a' ? 'rgba(255,60,40,0.5)' : col === '#ffc830' ? 'rgba(255,200,40,0.5)' : 'rgba(80,255,120,0.5)'], [1, 'rgba(0,0,0,0)']]); g.restore(); }
        }
      }
      // traffic, top-down, keeping to the right-hand lane
      for (const o of cars) {
        if (o.wait) continue; if (o === sus && !mine.some(m => m.seen)) continue;
        const [px0, py0, dx, dy] = pos(o); const X = Math.round(ox + (px0 - 0.5) * Z2 + (-dy) * 4), Y = Math.round(oy + (py0 - 0.5) * Z2 + dx * 4);
        const ang = Math.atan2(dy, dx) + Math.PI / 2;
        g.save(); g.translate(X, Y); g.rotate(ang);
        if (night) { g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(beamArt(), -10, -33); g.restore(); }
        g.drawImage(topArt(rampOf(o), false), -5, -9);
        if (o.kind === 'hunter' && (t * 5 | 0) % 2) { g.fillStyle = '#ff3a2a'; g.fillRect(-1, -1, 2, 2); }
        g.restore();
        if (o === sus) { g.save(); g.globalCompositeOperation = 'lighter'; chX_radial(X, Y, 14, [[0, 'rgba(255,80,210,0.35)'], [1, 'rgba(255,80,210,0)']]); g.restore(); }
        if (o === c && (t * 4 | 0) % 2) { g.fillStyle = '#ffffff'; for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const cx_ = X + sx * 13, cy_ = Y + sy * 13; g.fillRect(sx < 0 ? cx_ : cx_ - 4, cy_, 5, 1); g.fillRect(cx_, sy < 0 ? cy_ : cy_ - 4, 1, 5); } }
      }
      g.restore();
    });
  }
  return scene;
}
// bezel between the three chase views (art, transparent inside the panes)
function chX_bezel() {
  return art('chX:bezel', 120, 200, () => {
    const f = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    f(0, 0, 2, 400, '#07080c'); f(1, 0, 1, 400, '#4a5064'); f(238, 0, 2, 400, '#07080c'); f(238, 0, 1, 400, '#3a4052');
    f(0, 196, 240, 4, '#07080c'); f(2, 196, 236, 1, '#4a5064'); f(2, 199, 236, 1, '#2a2e3a');
    for (const yy of [8, 188, 212, 392]) { chX_circ(1, yy, 1.4, '#6a7084'); }
  });
}
// driver's left hand gripping the wheel at ten to two, drawn in the rim's local frame:
// +x runs clockwise along the rim (towards 12 o'clock), -y points out of the wheel, the forearm trails along -x
function chX_hand() {
  const sk = ['#4a2630', '#9a584a', '#d08c6c', '#f0b890', '#ffdcc0'];
  // jacket sleeve widening towards the viewer, then the shirt cuff
  chX_fillPath([[-15, -6, 0], [-80, -4, 0], [-80, 18, 0], [-15, 6, 0]], '#141826'); chX_seg(-16, -5.5, -80, -3.5, '#34405a', 1.2);
  chX_fillPath([[-18, -6, 1], [-12, -6, 1], [-12, 6, 1], [-18, 7, 1]], '#e6e6ee'); g.fillStyle = '#9a9cb0'; g.fillRect(-18, 4, 6, 3);
  // back of the hand
  chX_fillPath([[-13, -5, 2], [-4, -8, 3], [6, -7, 3], [9, -2, 3], [5, 5, 3], [-6, 6, 2], [-13, 5, 1]], sk[0]);
  chX_fillPath([[-12, -4, 2], [-4, -7, 3], [5.5, -6, 3], [8, -2, 3], [4, 4, 3], [-6, 5, 2], [-12, 4, 1]], sk[2]);
  chX_fillPath([[-11, -3, 2], [-4, -6, 2], [3, -5, 2], [1, 0, 2], [-10, 1, 1]], sk[3]); // key light on the back of the hand
  g.fillStyle = sk[1]; g.fillRect(-12, 2, 14, 2); // shadow side
  // knuckles over the rim, creases between the fingers
  for (let k = 0; k < 4; k++) { const kx = -3.5 + k * 2.9, ky = -6 + (k === 0 || k === 3 ? 0.6 : 0); chX_circ(kx, ky, 1.9, sk[2]); chX_circ(kx - 0.5, ky - 0.6, 1, sk[3]); g.fillStyle = sk[4]; g.fillRect(kx - 1, ky - 1.4, 1, 1); if (k) chX_seg(kx - 1.45, ky - 1, kx - 1.45, ky + 2.4, sk[1], 0.8); }
  // thumb lying along the inside of the rim
  chX_fillPath([[2, 1, 2], [10.5, 1.2, 2], [11, 4.6, 2], [3, 5.4, 2]], sk[0]);
  chX_fillPath([[2.5, 1.6, 1.6], [10, 1.8, 1.6], [10.2, 4, 1.6], [3, 4.6, 1.6]], sk[2]); g.fillStyle = sk[3]; g.fillRect(4, 2, 5, 1); g.fillStyle = sk[4]; g.fillRect(9, 2, 1, 1);
}
