// ===================================================================
// CRYPTO WORKSTATION: letter-substitution cipher against the clock
// (art helpers carry the cyX_ prefix and are self-contained; static layers are art() caches
//  drawn on the fine 640x400 grid, moving parts are drawn per frame in fine coordinates)
// ===================================================================
// the CRT glass of the close-up workstation (the monitor case fills the screen)
const cyX_GX = 14, cyX_GY = 6, cyX_GW = 292, cyX_GH = 170;
const cyX_HELP = 'TAB = hint (costs time)  ESC = quit';
const cyX_ease = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
const cyX_hash = (a, b) => { let h = Math.imul(a * 374761393 + b * 668265263, 1274126177); h ^= h >>> 13; return ((h >>> 0) % 1000) / 1000; };
const cyX_TAU = Math.PI * 2;
// where the workstation sits in the desk shot (layout units); the close-up is exactly 4x this rectangle
const cyX_MX = 150, cyX_MY = 40;

// ---------- palette: hue-shifted ramps (shadows cool, highlights warm) ----------
const cyX_C = {
  // night: the room in shadow and the sky
  n0: '#05060d', n1: '#0b0d1c', n2: '#131731', n3: '#1d2446', n4: '#2c365e', n5: '#46537e',
  // lamp light
  l0: '#fff5d6', l1: '#ffdc8e', l2: '#f2ac52', l3: '#c4722e', l4: '#7c3f1e', l5: '#3e1f18',
  // walnut
  w0: '#140a0c', w1: '#28130f', w2: '#452210', w3: '#6c3616', w4: '#9a5222', w5: '#cf8538', w6: '#f0b866',
  // skin
  s0: '#ffe2bc', s1: '#eeb58c', s2: '#c9835f', s3: '#94553f', s4: '#5a3036', s5: '#33202c',
  // shirt
  h0: '#fff7e4', h1: '#e8dcc2', h2: '#bdb2a6', h3: '#81819a', h4: '#4d5170', h5: '#2c304a',
  // hair
  r0: '#9c8a78', r1: '#66503f', r2: '#43322a', r3: '#261b1c',
  // putty plastic
  p0: '#f4e8cc', p1: '#dccba6', p2: '#b9a684', p3: '#8c7c68', p4: '#5b524e', p5: '#34303a', p6: '#1c1a22',
  // P1 phosphor
  g0: '#030a06', g1: '#0a2014', g2: '#16502c', g3: '#2c9c4e', g4: '#66e67e', g5: '#d8ffd2',
  // amber and red accents
  a1: '#a86a14', a2: '#ffbf45', a3: '#ffe6a0', red: '#c22a34', red2: '#ff6a58', redd: '#6a1422', redk: '#3a0c16',
  brass: '#d8ac56', brass2: '#8a6428', brass3: '#4a3018', lamp: '#1d6a4a', lamp2: '#2f9a6a', lamp3: '#0c3326',
  ink: '#1c2034', inkB: '#243c8a', paper: '#fbf3dc', paper2: '#e9dcbc', paper3: '#b8a888',
};
// ---------- fine-grid drawing helpers ----------
function cyX_poly(pts, c) { g.fillStyle = c; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); }
function cyX_path(d, c) { g.fillStyle = c; g.fill(new Path2D(d)); }
function cyX_strk(d, c, w) { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(typeof d === 'string' ? new Path2D(d) : d); }
function cyX_ell(cx, cy, rx, ry, c) { g.fillStyle = c; g.beginPath(); g.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, cyX_TAU); g.fill(); }
function cyX_rr(x, y, w, h, r, c) { g.fillStyle = c; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); }
function cyX_lg(x0, y0, x1, y1, ...cols) { const gr = g.createLinearGradient(x0, y0, x1, y1); cols.forEach((c, i) => gr.addColorStop(i / (cols.length - 1), c)); return gr; }
// stepped gradient: each colour a flat band (the VGA look for shaded surfaces)
function cyX_lb(x0, y0, x1, y1, ...cols) { const gr = g.createLinearGradient(x0, y0, x1, y1), n = cols.length; cols.forEach((c, i) => { gr.addColorStop(i / n, c); gr.addColorStop(Math.min(1, (i + 1) / n - 0.0001), c); }); return gr; }
// soft light in retro bands: n stacked ellipses of low alpha
function cyX_glow(cx, cy, rx, ry, c, a, n = 8) { const o = g.globalAlpha; g.fillStyle = c; for (let i = 0; i < n; i++) { const k = 1 - i / n; g.globalAlpha = o * a / n; g.beginPath(); g.ellipse(cx, cy, rx * k, ry * k, 0, 0, cyX_TAU); g.fill(); } g.globalAlpha = o; }
function cyX_al(a, fn) { const o = g.globalAlpha; g.globalAlpha = o * a; try { fn(); } finally { g.globalAlpha = o; } }
function cyX_clip(x, y, w, h) { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); }
function cyX_microText(s, x, y, c) { text(s, x, y, c); } // the bitmap font at fine scale (labels on hardware)
// scratch canvases (fine resolution) reused every frame
const cyX_bufs = new Map();
function cyX_buf(key, w, h) {
  let b = cyX_bufs.get(key);
  if (!b) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); b = { c, x }; cyX_bufs.set(key, b); }
  return b;
}

// ===================================================================
// THE CLOSE-UP WORKSTATION
// ===================================================================
// putty plastic case, lit by the desk lamp from the right and by the tube itself; the glass is a hole
function cyX_case() {
  return art('cyX_case', 320, 200, () => {
    const C = cyX_C;
    rect(0, 0, 640, 400, C.n0);
    // the moulded front, rounded at the corners
    cyX_rr(0, -20, 640, 420, 22, cyX_lg(0, 0, 640, 0, C.p3, C.p2, C.p2, C.p1));
    cyX_al(0.5, () => rect(0, 330, 640, 70, cyX_lg(0, 330, 0, 400, 'rgba(0,0,0,0)', C.p4)));
    cyX_al(0.35, () => rect(560, 0, 80, 400, cyX_lg(560, 0, 640, 0, 'rgba(0,0,0,0)', C.l1)));
    rect(0, 0, 640, 2, C.p1); rect(638, 0, 2, 380, C.p0);
    // recessed bezel: four sloped walls falling to the glass
    const o = [16, 2, 624, 366], i = [28, 12, 612, 352];
    cyX_poly([[o[0], o[1]], [o[2], o[1]], [i[2], i[1]], [i[0], i[1]]], C.p4);
    cyX_poly([[o[0], o[1]], [i[0], i[1]], [i[0], i[3]], [o[0], o[3]]], cyX_lg(0, 0, 0, 366, C.p4, C.p3));
    cyX_poly([[o[2], o[1]], [o[2], o[3]], [i[2], i[3]], [i[2], i[1]]], cyX_lg(0, 0, 0, 366, C.p3, C.p2));
    cyX_poly([[o[0], o[3]], [i[0], i[3]], [i[2], i[3]], [o[2], o[3]]], cyX_lg(0, 0, 640, 0, C.p2, C.p1, C.p0));
    // the lip of the recess: a lit edge below and to the right, a dark crease above and to the left
    rect(o[0], o[3], o[2] - o[0], 2, C.p0); rect(o[2], o[1], 2, o[3] - o[1] + 2, C.p1);
    rect(o[0] - 2, o[1], 2, o[3] - o[1], C.p4); rect(o[0], o[1], o[2] - o[0], 1, C.p5);
    // badge moulded into the bottom wall
    rect(262, 354, 116, 10, C.p2); rect(262, 354, 116, 1, C.p3); rect(262, 363, 116, 1, C.p0);
    cyX_microText('CRYPTO-90 WORKSTATION', 265, 355, C.p4);
    // black rubber gasket, then cut the glass with rounded tube corners
    cyX_rr(i[0] - 3, i[1] - 3, i[2] - i[0] + 6, i[3] - i[1] + 6, 18, C.p6);
    g.globalCompositeOperation = 'destination-out'; cyX_rr(i[0], i[1], i[2] - i[0], i[3] - i[1], 16, '#000'); g.globalCompositeOperation = 'source-over';
    // chin: a seam, then the controls
    rect(0, 367, 640, 2, C.p4); rect(0, 369, 640, 1, C.p0);
    // SECRET sticker (layout 17,185,31,11)
    rect(34, 370, 62, 22, C.redk); rect(35, 371, 60, 20, C.red); rect(35, 371, 60, 2, C.red2); rect(35, 389, 60, 2, C.redd);
    rect(39, 373, 52, 1, C.l0); rect(39, 388, 52, 1, C.l0);
    cyX_microText('SECRET', 48, 377, C.redk); cyX_microText('SECRET', 47, 376, C.l0);
    // help text engraved into the chin (layout 54,188)
    g.save(); g.translate(0, 1); g.scale(2, 2); text(cyX_HELP, 54, 188, C.p0); g.restore(); g.save(); g.scale(2, 2); text(cyX_HELP, 54, 188, C.p5); g.restore();
    // LED windows for ON and HD (layout 246/255, 186)
    for (const lx of [490, 508]) { rect(lx - 2, 370, 14, 8, C.p4); rect(lx - 2, 377, 14, 1, C.p0); rect(lx, 372, 10, 4, C.p6); }
    cyX_microText('ON', 489, 381, C.p4); cyX_microText('HD', 507, 381, C.p4);
    // ABORT key (layout 265,184,46,14): red rubber with a sculpted top
    cyX_rr(528, 367, 94, 30, 5, C.redk);
    cyX_rr(530, 368, 90, 26, 4, cyX_lg(0, 368, 0, 394, C.red2, C.red, C.redd));
    cyX_rr(534, 370, 82, 18, 3, cyX_lg(0, 370, 0, 388, '#e84a48', C.red));
    rect(536, 370, 78, 1, '#ff9a86');
    g.save(); g.translate(1, 1); g.scale(2, 2); text('ABORT', 274, 186, C.redk); g.restore(); g.save(); g.scale(2, 2); text('ABORT', 274, 186, C.l0); g.restore();
    // screws and vent slots
    for (const sx of [10, 630]) { cyX_ell(sx, 384, 4, 4, C.p4); cyX_ell(sx, 384, 3, 3, C.p2); rect(sx - 2, 384, 5, 1, C.p4); px(sx - 1, 382, C.p0); }
  });
}
// green phosphor light falling on the inner walls of the bezel (drawn at the tube's brightness)
function cyX_spill() {
  return art('cyX_spill', 320, 200, () => {
    const C = cyX_C;
    g.save(); g.beginPath();
    g.moveTo(16, 2); g.lineTo(624, 2); g.lineTo(624, 366); g.lineTo(16, 366); g.closePath();
    g.moveTo(28, 12); g.lineTo(28, 352); g.lineTo(612, 352); g.lineTo(612, 12); g.closePath(); g.clip('evenodd');
    // strongest right at the glass, fading outward
    for (let k = 0; k < 6; k++) { g.globalAlpha = 0.09; g.strokeStyle = C.g4; g.lineWidth = 2 + k * 3; g.beginPath(); g.roundRect(28 - k, 12 - k, 584 + k * 2, 340 + k * 2, 16); g.stroke(); }
    g.restore();
    // the gasket catches a thin rim of light
    g.globalAlpha = 0.5; g.strokeStyle = C.g3; g.lineWidth = 1; g.beginPath(); g.roundRect(26.5, 10.5, 587, 343, 17); g.stroke(); g.globalAlpha = 1;
  });
}
// the phosphor glass itself: nearly black, lifted a little toward the centre
function cyX_glassBG() {
  return art('cyX_glass', cyX_GW, cyX_GH, () => {
    const w = cyX_GW * 2, h = cyX_GH * 2;
    const gr = g.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.62);
    gr.addColorStop(0, '#0b1d13'); gr.addColorStop(0.6, '#07130c'); gr.addColorStop(1, '#020604');
    rect(0, 0, w, h, gr);
  });
}
// over the picture: raster lines, the curvature vignette and reflections in the glass
function cyX_glassFX() {
  return art('cyX_glassFX', cyX_GW, cyX_GH, () => {
    const w = cyX_GW * 2, h = cyX_GH * 2;
    g.fillStyle = 'rgba(0,0,0,0.26)'; for (let y = 1; y < h; y += 2) g.fillRect(0, y, w, 1);
    const gr = g.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.66);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.55)'); rect(0, 0, w, h, gr);
    // curved sheen of the room on the tube, top left
    g.save(); g.beginPath(); g.ellipse(w * 0.52, h * 0.95, w * 0.62, h * 0.98, 0, Math.PI * 1.08, Math.PI * 1.42); g.lineWidth = 16; g.strokeStyle = 'rgba(190,210,255,0.035)'; g.stroke();
    g.lineWidth = 5; g.strokeStyle = 'rgba(210,225,255,0.05)'; g.stroke(); g.restore();
    // the desk lamp, reflected small in the upper right of the glass
    cyX_glow(w - 64, 30, 34, 12, '#ffd890', 0.12, 6); cyX_glow(w - 64, 30, 10, 3, '#fff0c8', 0.3, 3);
    // bottom-right glint where the curve turns
    g.strokeStyle = 'rgba(255,240,210,0.08)'; g.lineWidth = 2; g.beginPath(); g.ellipse(w * 0.5, h * 0.1, w * 0.49, h * 0.86, 0, Math.PI * 0.22, Math.PI * 0.34); g.stroke();
  });
}
// the dead tube reflects the analyst sitting in front of it, and the lamp behind him
function cyX_refl() {
  return art('cyX_refl', cyX_GW, cyX_GH, () => {
    const w = cyX_GW * 2, h = cyX_GH * 2;
    // the room behind him, faint in the glass: the night window with its blinds, the lamp
    cyX_glow(120, 130, 120, 110, '#8a9ae0', 0.12, 6); cyX_al(0.05, () => { rect(24, 36, 190, 190, '#8a9ae0'); });
    cyX_al(0.04, () => { for (let y = 36; y < 110; y += 7) rect(24, y, 190, 3, '#c0c8f0'); }); cyX_al(0.3, () => rect(116, 36, 5, 190, '#000'));
    cyX_glow(470, 70, 110, 60, '#b08050', 0.2, 8); cyX_glow(470, 70, 26, 8, '#ffe0a0', 0.4, 4);
    cyX_al(0.12, () => cyX_poly([[440, 74], [500, 74], [494, 62], [446, 62]], '#60c090'));
    // the analyst, dark against it: hair, ears, glasses, open collar, braces
    const sil = 'M 150 340 C 154 300 176 276 222 264 C 244 258 256 250 260 236 C 256 230 252 222 252 214 C 246 214 242 204 244 196 C 246 190 250 190 252 192 C 250 170 250 150 256 136 C 262 118 280 106 300 106 C 322 106 338 118 344 136 C 350 152 350 172 348 192 C 350 190 354 190 356 196 C 358 204 354 214 348 214 C 348 222 344 230 340 236 C 344 250 356 258 378 264 C 424 276 446 300 450 340 Z';
    cyX_al(0.85, () => cyX_path(sil, '#010302'));
    g.save(); g.clip(new Path2D(sil));
    cyX_al(0.3, () => cyX_strk('M 346 140 C 352 162 352 190 348 214 C 346 228 340 238 342 248 C 350 258 370 264 392 272 C 424 284 444 306 450 340', '#ffc890', 5));
    cyX_al(0.18, () => cyX_strk('M 256 136 C 250 160 250 190 252 214', '#8aa0e0', 3));
    // glasses catching the lamp, collar points, braces
    cyX_al(0.3, () => { cyX_strk('M 268 176 C 276 170 290 170 296 176 C 294 186 280 190 270 186 Z', '#d8e0ff', 1.2); cyX_strk('M 306 176 C 312 170 326 170 334 176 C 332 186 318 190 308 186 Z', '#d8e0ff', 1.2); cyX_strk('M 296 176 L 306 176', '#d8e0ff', 1.2); });
    cyX_al(0.2, () => { cyX_poly([[322, 172], [330, 174], [322, 184], [316, 182]], '#fff0d0'); });
    cyX_al(0.12, () => { cyX_poly([[268, 262], [300, 286], [284, 296]], '#e8e8f0'); cyX_poly([[332, 262], [300, 286], [316, 296]], '#e8e8f0'); });
    cyX_al(0.14, () => { cyX_poly([[240, 272], [250, 272], [236, 340], [226, 340]], '#ff6060'); cyX_poly([[352, 272], [362, 272], [376, 340], [366, 340]], '#ff6060'); });
    g.restore();
    // a last wisp of cigarette smoke rising past him
    cyX_al(0.1, () => cyX_strk('M 330 230 C 360 200 330 170 364 136 C 392 108 368 80 388 50', '#c8d0f0', 4));
  });
}
// ---------- touch picker: a putty keyboard sliding up over the chin ----------
function cyX_kbd() {
  return art('cyX_kbd', 240, 80, () => {
    const C = cyX_C;
    g.beginPath(); g.moveTo(10, 0); g.lineTo(470, 0); g.lineTo(480, 14); g.lineTo(480, 160); g.lineTo(0, 160); g.lineTo(0, 14); g.closePath();
    g.fillStyle = cyX_lg(0, 0, 0, 160, C.p1, C.p2, C.p3); g.fill();
    rect(10, 0, 460, 2, C.p0); cyX_poly([[0, 14], [10, 0], [12, 0], [2, 14]], C.p0); cyX_poly([[470, 0], [480, 14], [478, 14], [468, 0]], C.p3);
    rect(0, 14, 2, 146, C.p0); rect(478, 14, 2, 146, C.p4);
    // LCD caption window, then the dark well for the keys
    rect(13, 5, 454, 24, C.p4); rect(13, 28, 454, 2, C.p0); rect(15, 7, 450, 21, '#040b06');
    cyX_al(0.25, () => rect(15, 7, 450, 21, cyX_lg(0, 7, 0, 28, C.g2, 'rgba(0,0,0,0)')));
    rect(21, 30, 438, 128, C.p4); rect(23, 32, 434, 126, C.p6);
    cyX_al(0.6, () => rect(23, 32, 434, 12, cyX_lg(0, 32, 0, 44, '#000', 'rgba(0,0,0,0)')));
    // power LED and brand on the frame
    rect(34, 140, 8, 5, C.p6); rect(35, 141, 6, 3, C.g4); cyX_glow(38, 142, 8, 5, C.g4, 0.4, 3);
    cyX_microText('CRYPTO-90', 374, 146, C.p3);
  });
}
function cyX_cap(kind) { // 18x13 key cap: n normal, t taken, c current mapping, p pressed
  return art('cyX_cap' + kind, 18, 13, () => {
    const C = cyX_C;
    const side = { n: C.p3, t: C.p5, c: C.a1, p: C.p2 }[kind], face = { n: C.p1, t: C.p4, c: C.a2, p: C.p0 }[kind], top = { n: C.p0, t: C.p3, c: C.a3, p: '#fffaf0' }[kind];
    cyX_rr(0, 0, 36, 26, 4, C.p6);
    cyX_rr(1, 1, 34, 24, 4, side);
    cyX_rr(4, 2, 28, 18, 3, face);
    cyX_rr(5, 3, 26, 3, 2, top);
    cyX_al(0.35, () => cyX_rr(4, 14, 28, 6, 3, side));
  });
}

// ===================================================================
// THE ANALYST'S DESK (intro): a night office in the Crypto Branch at Langley
// ===================================================================
// the window: night sky, the lit monuments of Washington beyond the Langley trees, blinds half up
function cyX_windowArt() {
  return art('cyX_window', 136, 80, () => {
    const w = 272, h = 160, base = 146;
    // sky: deep indigo to a mauve city haze on the horizon
    vgrad(0, 0, w, h, ['#070919', '#0c1030', '#171a44', '#2c2454', '#553a60', '#8a5660']);
    // moon with a soft halo
    cyX_glow(52, 78, 40, 40, '#8ca0d8', 0.22, 8); cyX_ell(52, 78, 8, 8, '#efe9d2'); cyX_ell(53, 79, 7, 7, '#f8f3e0');
    cyX_ell(50, 76, 2.2, 1.8, '#d8d0bc'); cyX_ell(55, 81, 1.8, 1.4, '#dcd4c0');
    for (const [sx, sy] of [[118, 66], [150, 76], [206, 62], [252, 90], [24, 100], [96, 94]]) px(sx, sy, '#aab4e0');
    // distant city (atmospheric: pale violet silhouettes, lit windows in tidy grids)
    const blocks = [[0, 128, 16], [14, 134, 14], [66, 130, 16], [84, 124, 12], [150, 128, 18], [170, 120, 14], [196, 130, 18], [246, 122, 16], [260, 132, 12]];
    for (const [bx, by, bw] of blocks) {
      rect(bx, by, bw, base - by, '#2a2446'); rect(bx, by, bw, 1, '#3e355c');
      for (let wy = by + 3; wy < base - 2; wy += 4) for (let wx = bx + 2; wx < bx + bw - 2; wx += 4) if (cyX_hash(wx * 3, wy) < 0.34) rect(wx, wy, 2, 1, cyX_hash(wx, wy * 5) < 0.5 ? '#f8c878' : '#c89a70');
    }
    // the Capitol dome, floodlit
    const cx = 40;
    rect(cx - 22, 130, 44, 16, '#4a3e5c'); rect(cx - 22, 130, 44, 1, '#8a7a8a');
    rect(cx - 11, 118, 22, 12, '#6a5a70'); for (let k = 0; k < 6; k++) rect(cx - 10 + k * 4, 120, 2, 9, '#a89a9c');
    g.beginPath(); g.ellipse(cx, 118, 12, 11, 0, Math.PI, 0); g.fillStyle = cyX_lb(cx - 12, 0, cx + 12, 0, '#6a5a70', '#b8a8a8', '#e8dccc', '#f8eedc'); g.fill();
    rect(cx - 1, 101, 3, 7, '#e8dcc8'); px(cx, 99, '#fff4e0');
    cyX_glow(cx, 118, 34, 22, '#f0d8b0', 0.2, 6);
    // the Washington Monument, floodlit
    const mx = 232;
    cyX_poly([[mx - 5, base], [mx - 3.5, 80], [mx + 3.5, 80], [mx + 5, base]], cyX_lb(mx - 5, 0, mx + 5, 0, '#8a7e92', '#d8ccc0', '#fff2e0'));
    cyX_poly([[mx - 3.5, 80], [mx, 72], [mx + 3.5, 80]], '#f4e8d8');
    cyX_glow(mx, 132, 18, 28, '#f0dcc0', 0.18, 6);
    // the Langley woods in front, near-black with a cool rim from the sky
    const tree = 'M 0 160 L 0 142 C 8 136 14 140 20 134 C 26 128 34 136 40 138 C 46 132 54 128 60 134 C 66 140 72 136 80 140 C 90 144 98 138 106 142 C 114 146 124 140 132 144 C 142 148 150 142 160 146 C 170 140 178 136 186 142 C 194 148 204 144 212 140 C 220 134 228 138 236 142 C 244 136 252 132 260 138 C 266 142 270 138 272 140 L 272 160 Z';
    cyX_path(tree, '#0a0b18');
    cyX_al(0.4, () => cyX_strk('M 0 142 C 8 136 14 140 20 134 C 26 128 34 136 40 138 C 46 132 54 128 60 134 C 66 140 72 136 80 140', '#5a64a0', 1));
    // raised blinds: a stack of slats across the top, lit faintly from the room
    for (let y = 0; y < 45; y += 5) { rect(0, y, w, 4, '#23253e'); rect(0, y, w, 1, '#3c3e5c'); rect(0, y + 3, w, 1, '#141528'); }
    cyX_al(0.5, () => rect(0, 0, w, 45, cyX_lg(0, 0, w, 0, 'rgba(0,0,0,0)', 'rgba(255,190,120,0.25)')));
    rect(0, 45, w, 5, '#4a4a66'); rect(0, 45, w, 1, '#7a7898'); rect(0, 49, w, 1, '#141528');
    for (const tx of [40, 232]) rect(tx, 0, 2, 45, '#555777');
    rect(256, 50, 1, 50, '#6a6a88'); cyX_ell(256.5, 102, 2, 4, '#8a8aa8');
    // faint reflections on the pane
    cyX_al(0.05, () => { cyX_poly([[150, 50], [180, 50], [120, 160], [90, 160]], '#c0d0ff'); cyX_poly([[196, 50], [204, 50], [148, 160], [140, 160]], '#c0d0ff'); });
  });
}
function cyX_deskArt() {
  return art('cyX_desk', 320, 200, () => {
    const C = cyX_C;
    // ---- back wall: dark painted government blue, warmed by the lamp ----
    rect(0, 0, 640, 210, cyX_lg(0, 0, 0, 210, C.n1, C.n2, C.n3));
    cyX_glow(505, 150, 260, 150, C.l3, 0.35, 10);
    cyX_glow(505, 176, 120, 60, C.l2, 0.25, 8);
    // green CRT spill will be added per frame; panel seams and a chair rail
    for (const sx of [290, 470]) { rect(sx, 0, 1, 196, C.n1); rect(sx + 1, 0, 1, 196, 'rgba(120,130,190,0.08)'); }
    rect(0, 150, 640, 2, C.n1); rect(0, 152, 640, 1, 'rgba(255,200,140,0.12)');
    // ---- the window ----
    rect(14, 14, 284, 172, C.n0);
    g.drawImage(cyX_windowArt(), 20, 20);
    rect(154, 20, 4, 160, '#1a1b2e'); rect(157, 20, 1, 160, '#34365a'); // mullion
    // frame, lit on the right edges
    frame(14, 14, 284, 168, '#23243a'); rect(16, 16, 280, 4, '#2a2b44'); rect(16, 16, 4, 164, '#1c1d30'); rect(292, 16, 4, 164, '#3a3552');
    rect(8, 180, 296, 8, '#2e2c40'); rect(8, 180, 296, 1, '#6a5a6a'); rect(8, 187, 296, 2, C.n0); // sill
    // ---- wall clock ----
    const ck = [372, 38];
    cyX_ell(ck[0] + 2, ck[1] + 3, 24, 24, 'rgba(0,0,0,0.35)');
    cyX_ell(ck[0], ck[1], 24, 24, '#161620'); cyX_ell(ck[0], ck[1], 22, 22, cyX_lg(ck[0] - 22, 0, ck[0] + 22, 0, '#2a2a36', '#4a4448'));
    cyX_ell(ck[0], ck[1], 19, 19, cyX_lg(0, ck[1] - 19, 0, ck[1] + 19, '#9a9488', '#d8ccb0', '#e8d6b0'));
    for (let k = 0; k < 12; k++) { const a = k / 12 * cyX_TAU, r0 = k % 3 ? 15 : 13; line(ck[0] + Math.cos(a) * r0, ck[1] + Math.sin(a) * r0, ck[0] + Math.cos(a) * 17, ck[1] + Math.sin(a) * 17, '#3a3230'); }
    cyX_al(0.25, () => cyX_ell(ck[0] - 6, ck[1] - 8, 10, 5, '#ffffff'));
    // ---- pinned frequency chart, lit from below by the lamp ----
    g.save(); g.translate(446, 30); g.rotate(0.03);
    rect(3, 4, 64, 80, 'rgba(0,0,0,0.3)');
    rect(0, 0, 62, 78, cyX_lg(0, 0, 0, 78, '#8a8278', '#d8c8a8', '#f4dcae'));
    cyX_microText('ETAOIN', 13, 5, '#3a3040'); rect(6, 15, 50, 1, '#8a7a70');
    [36, 27, 24, 22, 21, 20, 18, 17, 13].forEach((hh, k) => rect(8 + k * 5.4, 66 - hh, 4, hh, k ? '#3a4a8a' : C.red));
    rect(6, 67, 50, 1, '#3a3040');
    cyX_ell(31, 3, 3, 3, C.red); px(30, 2, '#ff9a90');
    g.restore();
    // ---- corkboard: index cards, a surveillance photo, red pins ----
    rect(536, 22, 100, 76, '#1a1210'); rect(538, 24, 96, 72, cyX_lb(0, 24, 0, 96, '#6a4424', '#7a5028', '#8a5a2c', '#9a6430'));
    rect(538, 24, 96, 2, '#b07a40');
    g.save(); g.translate(548, 32); g.rotate(-0.06); rect(2, 2, 30, 36, 'rgba(0,0,0,0.35)'); rect(0, 0, 30, 36, '#e8e0d0'); rect(3, 3, 24, 22, '#2a2a34');
    cyX_ell(15, 12, 5, 6, '#6a6470'); cyX_path('M 5 25 C 7 18 23 18 25 25 Z', '#4a4654'); cyX_microText('?', 12, 27, '#3a3040'); g.restore();
    g.save(); g.translate(586, 30); g.rotate(0.05); rect(2, 2, 40, 26, 'rgba(0,0,0,0.35)'); rect(0, 0, 40, 26, '#f4ecd8'); rect(0, 5, 40, 1, C.red);
    for (let k = 0; k < 3; k++) rect(4, 10 + k * 5, 26 - k * 6, 1, '#6a6a80'); g.restore();
    g.save(); g.translate(590, 62); g.rotate(-0.1); rect(2, 2, 34, 22, 'rgba(0,0,0,0.35)'); rect(0, 0, 34, 22, '#e8d890');
    for (let k = 0; k < 3; k++) rect(4, 5 + k * 5, 24, 1, '#6a6a80'); g.restore();
    for (const [qx, qy] of [[563, 33], [606, 31], [606, 63]]) { cyX_ell(qx, qy, 2.5, 2.5, C.red); px(qx - 1, qy - 1, '#ff9a90'); }
    // ---- the desk: walnut in perspective ----
    const top = 204, front = 284;
    rect(0, top, 640, front - top, cyX_lg(0, top, 0, front, C.w1, C.w2, C.w3));
    // long clean grain lines, following the perspective
    g.save(); g.beginPath(); g.rect(0, top, 640, front - top); g.clip();
    for (let k = 0; k < 14; k++) {
      const y = top + 5 + k * 5.6, sx = (k * 97) % 180 - 60;
      cyX_al(0.35, () => cyX_strk(`M ${sx} ${y} C ${sx + 140} ${y - 2} ${sx + 260} ${y + 3} ${sx + 420} ${y} S ${sx + 640} ${y + 2} ${sx + 760} ${y}`, k % 3 ? C.w1 : C.w4, 1));
    }
    g.restore();
    // lamp pool on the desk top, banded
    cyX_glow(502, 236, 190, 40, C.l2, 0.55, 10); cyX_glow(502, 232, 100, 22, C.l1, 0.4, 8);
    // back edge shadow against the wall
    rect(0, top, 640, 3, C.w0); cyX_al(0.4, () => rect(0, top + 3, 640, 6, cyX_lg(0, top + 3, 0, top + 9, C.w0, 'rgba(0,0,0,0)')));
    // front lip and face
    rect(0, front, 640, 6, cyX_lg(0, 0, 640, 0, C.w3, C.w4, C.w5, C.w4));
    rect(0, front, 640, 1, cyX_lg(0, 0, 640, 0, C.w4, C.w6, C.w5));
    rect(0, front + 6, 640, 110, cyX_lg(0, front + 6, 0, 400, C.w1, C.w0));
    cyX_al(0.3, () => rect(380, front + 6, 260, 110, cyX_lg(380, 0, 640, 0, 'rgba(0,0,0,0)', C.w3)));
    rect(0, 298, 640, 1, C.w0); rect(0, 299, 640, 1, 'rgba(255,190,120,0.12)');
    // a drawer with a brass pull on the right
    rect(430, 306, 196, 80, C.w0); rect(432, 308, 192, 76, cyX_lg(0, 308, 0, 384, C.w2, C.w1)); rect(432, 308, 192, 1, C.w4);
    cyX_rr(506, 338, 44, 8, 3, C.brass3); cyX_rr(507, 338, 42, 6, 3, cyX_lg(507, 0, 549, 0, C.brass2, C.brass, '#ffe0a0', C.brass2));
    // ---- the workstation (its front is the close-up case, shrunk) ----
    const mx = cyX_MX * 2, my = cyX_MY * 2;
    // tube housing behind, seen slightly from above and left
    cyX_poly([[mx + 12, my + 2], [mx + 22, my - 8], [mx + 138, my - 8], [mx + 148, my + 2]], cyX_lg(0, my - 8, 0, my + 2, C.p3, C.p2));
    cyX_poly([[mx + 2, my + 6], [mx - 8, my + 10], [mx - 8, my + 84], [mx + 2, my + 92]], C.p4);
    // shadow on the wall behind
    cyX_al(0.35, () => cyX_poly([[mx + 150, my + 6], [mx + 172, my + 16], [mx + 172, my + 108], [mx + 160, my + 118]], C.n0));
    rect(mx + 2, my + 2, 156, 96, '#07100a'); // glass behind the case hole
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(cyX_case(), mx, my, 160, 100); g.restore();
    // tilt-swivel stand
    rect(mx + 62, my + 100, 36, 12, cyX_lg(mx + 62, 0, mx + 98, 0, C.p4, C.p3, C.p2)); rect(mx + 62, my + 100, 36, 2, C.p5);
    cyX_ell(mx + 82, my + 122, 46, 8, 'rgba(0,0,0,0.45)');
    cyX_ell(mx + 80, my + 118, 44, 7, C.p4); cyX_ell(mx + 80, my + 116, 43, 6, cyX_lg(mx + 36, 0, mx + 124, 0, C.p3, C.p2, C.p1));
    // ---- wire in-tray of intercepts, left of the monitor ----
    cyX_ell(252, 214, 42, 5, 'rgba(0,0,0,0.4)');
    cyX_poly([[216, 212], [288, 212], [284, 198], [220, 198]], '#1a1a22');
    for (let k = 0; k < 6; k++) { const y = 209 - k * 2.4; cyX_poly([[222, y], [282, y - 0.5], [280, y - 5], [224, y - 4.5]], k === 3 ? C.red : k === 5 ? '#f0e4c8' : k % 2 ? '#c8baa0' : '#b0a288'); }
    rect(232, 199, 26, 1, '#6a6070'); rect(232, 201, 18, 1, '#6a6070');
    for (let k = 0; k <= 8; k++) { const x = 216 + k * 9; cyX_strk(`M ${x} 212 L ${x + (k - 4) * 0.5 + 2} 198`, 'rgba(160,160,180,0.7)', 1); }
    rect(216, 211, 72, 1.5, '#9a9aac'); rect(220, 197, 64, 1.5, '#7a7a8c');
    // ---- keyboard in front of the monitor ----
    cyX_ell(386, 250, 82, 10, 'rgba(0,0,0,0.35)');
    cyX_poly([[312, 246], [458, 246], [448, 224], [322, 224]], C.p3);
    cyX_poly([[314, 244], [456, 244], [447, 226], [323, 226]], cyX_lg(0, 226, 0, 244, C.p3, C.p2));
    rect(312, 246, 146, 3, C.p4);
    for (let r = 0; r < 4; r++) for (let k = 0; k < 16; k++) { const y = 228 + r * 4, x = 326 + k * 7.6 - r * 1.2 + (r === 3 ? 0 : 0); if (r === 3 && k > 3 && k < 12) continue; rect(x, y, 6, 3, C.p1); rect(x, y, 6, 1, C.p0); rect(x, y + 2, 6, 1, C.p3); }
    rect(356, 240, 58, 3, C.p1); rect(356, 242, 58, 1, C.p3);
    // ---- a legal pad with pencilled guesses ----
    g.save(); g.translate(362, 264); g.rotate(-0.08);
    rect(2, 2, 70, 26, 'rgba(0,0,0,0.35)'); rect(0, 0, 70, 26, cyX_lg(0, 0, 70, 0, '#d8c070', '#f4dc8a', '#fff0a8')); rect(0, 0, 70, 4, '#9a3a2a');
    for (let k = 0; k < 4; k++) rect(3, 8 + k * 5, 64, 1, 'rgba(90,120,170,0.35)');
    cyX_microText('E=T?', 5, 8, '#4a4a60'); cyX_microText('Q-A', 36, 14, '#4a4a60');
    g.restore();
    cyX_strk('M 420 270 L 452 256', '#e8b030', 3); cyX_strk('M 452 256 L 456 254', '#f0c8a0', 3); px(456, 254, '#333');
    // ---- the banker's lamp ----
    const lx = 506;
    cyX_ell(lx, 224, 26, 5, 'rgba(0,0,0,0.4)');
    cyX_ell(lx, 220, 22, 5, C.brass3); cyX_ell(lx, 218, 21, 4, cyX_lg(lx - 21, 0, lx + 21, 0, C.brass2, C.brass, '#fff0b0', C.brass2));
    rect(lx - 2, 186, 5, 32, cyX_lg(lx - 2, 0, lx + 3, 0, C.brass2, '#ffe6a0', C.brass2));
    cyX_ell(lx, 200, 4, 2, C.brass);
    // shade: green glass, glowing through at the lower edge
    g.beginPath(); g.moveTo(lx - 34, 190); g.quadraticCurveTo(lx - 30, 164, lx, 162); g.quadraticCurveTo(lx + 30, 164, lx + 34, 190); g.closePath();
    g.fillStyle = cyX_lg(lx - 34, 0, lx + 34, 0, C.lamp3, C.lamp, C.lamp2, C.lamp); g.fill();
    cyX_strk(`M ${lx - 24} 170 Q ${lx - 6} 164 ${lx + 14} 166`, 'rgba(200,255,220,0.35)', 2);
    cyX_poly([[lx - 34, 188], [lx + 34, 188], [lx + 32, 192], [lx - 32, 192]], '#fff4c0');
    rect(lx - 32, 192, 64, 1, C.l2);
    cyX_strk(`M ${lx + 20} 192 L ${lx + 22} 206`, C.brass, 1); cyX_ell(lx + 22, 207, 1.5, 2, C.brass);
    // ---- coffee mug ----
    const cx = 552;
    cyX_ell(cx + 2, 232, 12, 3, 'rgba(0,0,0,0.4)');
    rect(cx - 10, 208, 20, 24, cyX_lg(cx - 10, 0, cx + 10, 0, '#8a8aa0', '#e8e0d0', '#fff8ec')); cyX_ell(cx, 232, 10, 2.5, '#d8d0c0');
    cyX_ell(cx, 208, 10, 2.5, '#fff8ec'); cyX_ell(cx, 208.5, 8.5, 1.8, '#3a1a10');
    cyX_strk(`M ${cx + 10} 213 C ${cx + 18} 213 ${cx + 18} 226 ${cx + 10} 226`, '#e8e0d0', 3);
    rect(cx - 6, 216, 12, 7, C.inkB); px(cx - 1, 219, '#ffd84a');
    // ---- ashtray with dead butts, near his hand ----
    const ax = 274, ay = 252;
    cyX_ell(ax + 2, ay + 3, 20, 5, 'rgba(0,0,0,0.4)');
    cyX_ell(ax, ay, 19, 5, '#3a4050'); cyX_ell(ax, ay - 1, 17, 4, '#6a7488'); cyX_ell(ax, ay - 1, 13, 3, '#262a36');
    cyX_ell(ax - 2, ay - 1, 8, 1.5, '#5a5a60');
    for (const [bx, by, bl] of [[ax - 8, ay - 2, 8], [ax + 1, ay - 3, 7], [ax + 3, ay, 6]]) { rect(bx, by, bl, 2, '#e8e0d0'); rect(bx + bl - 3, by, 3, 2, '#c8883a'); }
    // ---- the teletype, cut by the frame on the right ----
    const tx = 566;
    cyX_ell(tx + 50, 264, 80, 8, 'rgba(0,0,0,0.45)');
    cyX_poly([[tx, 262], [tx + 8, 196], [650, 196], [650, 262]], cyX_lg(tx, 0, 650, 0, C.p3, C.p2, C.p2));
    rect(tx + 8, 196, 90, 2, C.p1);
    cyX_poly([[tx + 12, 196], [tx + 16, 178], [650, 178], [650, 196]], cyX_lg(0, 178, 0, 196, C.p4, C.p3));
    rect(tx + 18, 180, 70, 10, C.p6); rect(tx + 18, 184, 70, 3, '#2a2a2e'); // platen
    cyX_ell(tx + 16, 185, 5, 6, C.p5); cyX_ell(tx + 16, 185, 3, 4, C.p3);
    for (let r = 0; r < 4; r++) for (let k = 0; k < 9; k++) { const x = tx + 14 + k * 8 + r * 2, y = 206 + r * 11; cyX_ell(x + 3, y + 3, 3.4, 3, C.p6); cyX_ell(x + 3, y + 2, 3, 2.4, C.p1); px(x + 2, y + 1, C.p0); }
    rect(tx + 6, 258, 90, 4, C.p4);
    // ---- the analyst ----
    cyX_analyst();
  });
}
// the analyst, seen from behind his left shoulder: late shift, braces, rolled sleeves, cigarette on his lip
function cyX_analyst() {
  const C = cyX_C;
  // far (right) arm reaching the keyboard: rolled sleeve, forearm, hand
  cyX_path('M 226 236 C 252 236 278 242 300 250 L 296 266 C 276 262 250 258 228 262 Z', cyX_lb(0, 236, 0, 266, C.h1, C.h2, C.h3));
  cyX_path('M 288 247 C 290 240 298 236 306 238 L 304 262 C 298 262 292 258 288 254 Z', C.h1);
  cyX_path('M 300 244 C 310 238 318 234 330 232 L 334 244 C 322 248 310 254 302 260 Z', cyX_lb(0, 232, 0, 260, C.s1, C.s2, C.s3));
  // shoulders and back in a white shirt, lamp light across the top, cool shadow down the near side
  const back = 'M 46 400 C 42 330 48 280 72 252 C 90 234 114 220 140 210 L 184 206 C 204 212 220 222 232 236 C 246 256 250 292 248 330 L 248 400 Z';
  cyX_path(back, cyX_lb(46, 0, 248, 0, C.h4, C.h3, C.h2, C.h2, C.h1));
  g.save(); g.clip(new Path2D(back));
  cyX_path('M 118 216 C 156 204 196 208 226 230 C 238 242 246 258 248 274 C 226 256 196 244 160 240 C 136 238 120 230 118 216 Z', C.h1);
  cyX_path('M 150 210 C 176 206 204 212 224 228 C 204 222 178 220 156 222 Z', C.h0);
  cyX_path('M 46 400 C 44 330 50 284 72 254 C 80 270 82 310 78 400 Z', C.h5);
  cyX_strk('M 80 268 C 96 286 104 306 108 332', C.h4, 3); cyX_strk('M 206 246 C 200 266 202 290 208 312', C.h3, 2.5);
  cyX_strk('M 150 240 C 148 264 150 288 152 310', C.h3, 2);
  g.restore();
  // braces over the shoulders
  cyX_path('M 110 216 L 120 213 C 114 242 108 270 104 300 L 94 300 C 98 270 104 242 110 216 Z', C.redd);
  cyX_strk('M 118 215 C 112 244 106 272 102 298', C.red, 1.5);
  cyX_path('M 176 208 L 186 210 C 192 238 196 268 198 300 L 188 300 C 186 268 182 238 176 208 Z', C.redd);
  cyX_strk('M 184 210 C 190 238 194 268 196 298', '#e8584c', 1.5);
  // his chair: black leather, a warm rim where the lamp catches it
  const chair = 'M 70 400 L 72 334 C 74 310 90 300 120 298 L 204 298 C 232 300 244 312 244 336 L 246 400 Z';
  cyX_path(chair, cyX_lg(70, 0, 246, 0, '#0c0a10', '#141018', '#221a1e', '#3a2826'));
  cyX_strk('M 204 299 C 230 301 243 313 243 336 L 245 400', '#8a5840', 2);
  cyX_strk('M 73 334 C 75 312 90 301 120 299 L 204 299', '#3a3450', 1.5);
  for (const [bx, by] of [[112, 330], [158, 328], [204, 330], [135, 362], [181, 362], [112, 392], [158, 392], [204, 392]]) { cyX_ell(bx, by, 3, 2, '#050408'); px(bx + 1, by - 2, '#4a3434'); }
  cyX_al(0.3, () => cyX_strk('M 112 330 L 135 362 L 158 328 L 181 362 L 204 330 M 135 362 L 112 392 M 135 362 L 158 392 L 181 362 L 204 392', '#050408', 1));
  // near (left) upper arm hanging beside the chair, sleeve rolled to the elbow
  cyX_path('M 72 252 C 54 268 44 304 46 344 L 84 348 C 88 314 90 280 88 258 Z', cyX_lb(44, 0, 90, 0, C.h5, C.h4, C.h4, C.h3));
  cyX_path('M 44 340 C 58 332 74 334 86 342 L 86 358 C 72 352 58 352 44 358 Z', C.h2); cyX_strk('M 45 347 C 60 341 72 342 86 349', C.h3, 1.5);
  cyX_path('M 46 358 C 58 354 72 354 84 358 L 82 400 L 50 400 Z', cyX_lb(46, 0, 84, 0, C.s4, C.s3, C.s3));
  cyX_strk('M 84 360 L 82 400', C.s2, 2);
  cyX_strk('M 45 400 C 41 330 48 282 70 254', 'rgba(120,140,220,0.55)', 2); // window rim light
  // --- the head, in profile, turned to the screen ---
  // neck: throat in lamp light, nape in shadow
  cyX_path('M 146 176 L 184 186 C 183 194 184 202 188 208 C 172 214 156 214 144 208 C 146 198 146 186 146 176 Z', cyX_lb(144, 0, 190, 0, C.s4, C.s3, C.s3, C.s2));
  cyX_strk('M 184 192 C 186 198 186 204 188 208', C.s1, 2); px(185, 196, C.s0);
  // collar, open at the throat
  cyX_path('M 132 210 C 136 200 142 198 150 202 C 164 208 178 206 186 200 C 194 204 196 210 194 216 C 176 220 150 220 132 210 Z', C.h1);
  cyX_strk('M 134 209 C 150 216 176 216 194 212', C.h3, 1.5); cyX_strk('M 186 201 C 193 204 196 210 194 215', C.h0, 1.5);
  const skull = 'M 138 182 C 126 170 120 152 122 136 C 124 116 140 104 160 102 C 180 101 194 110 198 124 L 200 138 C 201 142 200 144 199 146 C 202 150 205 155 208 159 C 209 162 207 164 203 164 L 202 166 C 203 168 203 170 201 171 C 202 173 202 175 200 177 C 203 180 203 186 197 190 C 188 194 178 194 170 190 C 160 186 150 186 138 182 Z';
  cyX_path(skull, C.s2);
  g.save(); g.clip(new Path2D(skull));
  // shadow side (back of the face, under the cheekbone, under the jaw)
  cyX_path('M 120 100 L 170 100 C 168 116 166 128 170 138 C 172 146 176 150 180 156 C 184 164 180 172 184 180 C 188 186 194 190 200 192 L 120 200 Z', C.s3);
  cyX_path('M 150 168 C 162 180 178 188 200 190 L 200 200 L 140 200 Z', C.s4);
  // lit planes: forehead, cheekbone, nose, chin
  cyX_path('M 176 104 C 190 110 198 122 200 136 L 196 146 C 190 144 186 140 184 132 C 182 122 180 112 176 104 Z', C.s1);
  cyX_path('M 186 150 C 192 148 198 150 202 156 L 202 166 C 196 168 190 166 186 160 Z', C.s1);
  cyX_path('M 190 112 C 196 118 199 126 200 136 L 196 136 C 195 128 193 120 190 112 Z', C.s0);
  cyX_path('M 197 146 C 201 150 205 155 208 159 L 204 160 C 202 156 199 152 197 146 Z', C.s0);
  cyX_path('M 194 178 C 198 178 202 182 201 186 L 196 188 Z', C.s1);
  cyX_path('M 178 172 C 186 178 192 180 198 181 L 198 192 L 176 192 Z', 'rgba(70,80,120,0.16)'); // five-o'clock shadow
  g.restore();
  // eye socket, eye with white and pupil looking at the screen, heavy lids
  cyX_path('M 182 140 C 188 139 194 141 197 146 C 194 150 188 151 183 149 Z', C.s3);
  cyX_path('M 189 144 C 192 144 194 145 195 147 C 193 148 191 149 189 148 Z', '#f2ece4');
  rect(192, 145, 2, 3, '#2a1c20'); px(193, 145, '#ffffff');
  cyX_strk('M 187 143.5 C 190 142.5 194 143 196 145.5', C.s5, 1.2);
  cyX_strk('M 188 150.5 C 191 151.5 194 150.5 195 149', C.s3, 1);
  cyX_strk('M 181 138 C 186 135.5 193 136 198 139', C.r3, 2.2); // brow
  // nostril, mouth, chin crease
  cyX_strk('M 201 160 C 199 161 199 163 201 163', C.s4, 1.2);
  cyX_strk('M 196 170.5 L 201 171', C.s4, 1.2); cyX_path('M 196 171 C 199 171 201 172 201 173.5 C 199 175 197 175 196 174 Z', '#b86454');
  cyX_strk('M 193 179 C 196 178 199 178 200 179', C.s3, 1);
  // hair: short, dark, combed back, greying at the temple; the ear sits in front of it
  const hair = 'M 136 182 C 124 170 118 152 120 134 C 122 114 138 100 160 98 C 180 96 194 104 198 118 C 194 114 186 112 182 116 C 178 122 178 128 174 132 C 170 134 168 138 166 144 L 164 152 C 160 150 158 142 154 138 C 150 136 144 140 142 148 C 140 158 142 170 144 182 Z';
  cyX_path(hair, C.r2);
  g.save(); g.clip(new Path2D(hair));
  cyX_path('M 118 150 C 120 130 128 116 140 108 C 134 124 132 146 138 184 L 118 184 Z', C.r3);
  cyX_path('M 150 100 C 168 96 186 100 198 116 C 190 112 182 112 176 116 C 168 108 160 104 150 100 Z', C.r1);
  cyX_strk('M 128 124 C 140 108 158 100 178 102', C.r1, 2); cyX_strk('M 164 99 C 178 99 190 106 196 116', C.r0, 1.5);
  cyX_strk('M 132 136 C 142 120 158 112 176 112', C.r2, 1.5); cyX_strk('M 126 150 C 132 134 146 124 162 122', C.r2, 1.5);
  cyX_path('M 164 132 C 168 136 168 146 164 152 L 160 146 C 162 140 162 136 164 132 Z', C.r0); // grey at the temple
  cyX_strk('M 124 132 C 122 152 128 170 140 182', 'rgba(120,140,220,0.7)', 2.5); // window rim
  g.restore();
  // ear, catching a little lamp light on the rim
  cyX_path('M 152 139 C 144 138 141 148 143 157 C 145 166 151 169 157 165 C 160 157 160 145 152 139 Z', C.s4);
  cyX_path('M 152 141 C 146 140 144 148 145 156 C 147 164 151 166 156 163 C 158 156 158 146 152 141 Z', C.s2);
  cyX_path('M 151 146 C 148 149 148 156 151 160 C 154 157 155 150 151 146 Z', C.s4);
  cyX_strk('M 154 142 C 158 147 158 157 156 163', C.s1, 1.2); px(147, 144, C.s1);
  // glasses: tortoiseshell arm to the ear, the lens seen edge-on in front of the eye
  cyX_strk('M 154 145 L 190 141', '#2a1a14', 2); cyX_strk('M 154 145 C 150 147 150 152 152 156', '#2a1a14', 1.5);
  cyX_strk('M 199 139 C 202 143 202 151 199 155', '#2a1a14', 2.2);
  cyX_al(0.35, () => cyX_path('M 190 140 L 199 139 C 202 143 202 151 199 155 L 190 153 Z', '#bcd4f0'));
  px(201, 142, '#fff4d0'); px(201, 143, '#fff4d0');
  // cigarette on the lip
  cyX_strk('M 200 173 L 214 176', '#f4eee2', 2.4); cyX_strk('M 200 173 L 204 173.8', '#d8a060', 2.4);
}
// fingers on the keyboard: drawn per frame in fine coordinates, bobbing as he types
function cyX_hand(t) {
  const C = cyX_C, k = (t * 7 | 0) % 3;
  cyX_path('M 326 232 C 334 226 344 226 350 230 L 352 238 C 344 242 332 242 326 240 Z', C.s1);
  cyX_strk('M 330 238 C 338 240 346 239 350 236', C.s2, 1.5);
  for (let f = 0; f < 3; f++) { const x = 340 + f * 5, y = 232 + (f === k ? -2 : 0); cyX_strk(`M ${x} ${y} L ${x + 4} ${y + 6}`, f === k ? C.s0 : C.s1, 2.4); }
  cyX_strk('M 330 232 L 336 236', C.s0, 1.5);
}
// cigarette smoke: two curling ribbons, lit warm where they cross the lamp light
function cyX_smoke(x0, y0, t, n, drift) {
  for (let r = 0; r < n; r++) {
    const ph = t * (0.9 + r * 0.37) + r * 2.9, fq = 6 + r * 3.3, dr = drift + r * 0.35, top = 150 - r * 40; let px0 = x0, py0 = y0;
    for (let s = 1; s <= 26; s++) {
      const u = s / 26, x = x0 + dr * u * 60 + Math.sin(u * fq - ph * 2.2) * (1 + u * u * 22) + Math.sin(u * 17 - ph * 3.1) * u * 4, y = y0 - u * top;
      const a = (1 - u) * (u < 0.08 ? u / 0.08 : 1) * (r ? 0.28 : 0.5);
      g.globalAlpha = a; g.strokeStyle = u < 0.35 ? '#cfd6ec' : '#9aa6cc'; g.lineWidth = 1.2 + u * 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(px0, py0); g.lineTo(x, y); g.stroke(); px0 = x; py0 = y;
    }
  }
  g.globalAlpha = 1;
}
// the whole desk scene, animated, drawn in FINE coordinates: t = seconds, glow = how far the monitor has lit (0..1)
function cyX_deskScene(t, glow) {
  const C = cyX_C;
  g.drawImage(cyX_deskArt(), 0, 0);
  // clock hands
  const ck = [372, 38], mm = (t / 20) % 1, hh = 0.93 + mm / 12;
  cyX_strk(`M ${ck[0]} ${ck[1]} L ${ck[0] + Math.cos(hh * cyX_TAU - 1.571) * 10} ${ck[1] + Math.sin(hh * cyX_TAU - 1.571) * 10}`, '#1a1418', 2.4);
  cyX_strk(`M ${ck[0]} ${ck[1]} L ${ck[0] + Math.cos(mm * cyX_TAU - 1.571) * 15} ${ck[1] + Math.sin(mm * cyX_TAU - 1.571) * 15}`, '#1a1418', 1.6);
  cyX_ell(ck[0], ck[1], 1.6, 1.6, C.red);
  // aircraft warning lights on the monument
  if ((t * 1.2) % 1 < 0.5) { cyX_glow(252, 96, 5, 5, '#ff4040', 0.8, 3); px(252, 95, '#ffb0a0'); }
  // teletype paper feeding up out of the platen and curling back over the top of the machine
  const px0 = 588, pw = 56, feed = t * 30, pt = 112;
  cyX_al(0.35, () => rect(px0 + 4, pt + 6, pw, 184 - pt - 6, C.n0));
  rect(px0, pt, pw, 184 - pt, cyX_lb(0, pt, 0, 184, '#d8c8a0', '#f0e2ba', '#fbeec6', '#fff4d0'));
  rect(px0, pt, 1.5, 184 - pt, '#a89a78'); rect(px0 + pw - 1.5, pt, 1.5, 184 - pt, '#fff8e0');
  cyX_path(`M ${px0} ${pt} C ${px0 + 2} ${pt - 12} ${px0 + pw - 4} ${pt - 14} ${px0 + pw + 4} ${pt - 6} L ${px0 + pw} ${pt} Z`, cyX_lg(0, pt - 14, 0, pt, '#8a7c64', '#b8a888'));
  g.save(); g.beginPath(); g.rect(px0 + 4, pt + 2, pw - 8, 184 - pt - 6); g.clip();
  for (let k = -1; k < 14; k++) {
    const ln = Math.floor(feed / 6) + k, y = 178 - k * 6 - (feed % 6);
    if (ln % 9 === 0) continue;
    if (ln % 13 === 5) { rect(px0 + 6, y, 24, 1.5, '#a82a2a'); continue; }
    let x = px0 + 6; const len = 16 + (ln * 37) % 30;
    while (x < px0 + 6 + len) { const wl = 3 + (cyX_hash(x | 0, ln) * 8 | 0); rect(x, y, Math.min(wl, px0 + pw - 6 - x), 1.5, '#4a4458'); x += wl + 3; }
  }
  g.restore();
  // print head chattering along the platen
  const hx = 590 + ((t * 160) % 48 | 0); rect(hx, 176, 10, 10, C.p5); rect(hx, 176, 10, 2, C.p3); rect(hx + 3, 185, 4, 2, C.red);
  // steam from the coffee
  for (let k = 0; k < 2; k++) cyX_al(0.6, () => {
    const ph = t * 1.4 + k * 2.1; g.strokeStyle = '#d8d0c8'; g.lineWidth = 1.5; g.beginPath();
    for (let s = 0; s <= 12; s++) { const u = s / 12, x = 548 + k * 6 + Math.sin(u * 6 - ph * 2) * 3 * u, y = 204 - u * 32; g.globalAlpha = 0.4 * (1 - u); if (s) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  });
  g.globalAlpha = 1;
  // the ember brightens as he draws on the cigarette
  const drag = 0.5 + 0.5 * Math.sin(t * 2.4);
  cyX_glow(215, 176, 8 + drag * 6, 6 + drag * 4, '#ff8a3a', 0.3 + drag * 0.4, 4);
  rect(213, 174.5, 3, 3, drag > 0.6 ? '#ffe070' : '#ff7a2a'); px(214, 175, '#fff4c0');
  cyX_smoke(216, 172, t, 2, 0.3);
  // typing hand
  cyX_hand(t);
  // the monitor: dark glass, then a white line, then the phosphor warming across the tube
  const gx = cyX_MX * 2 + 7, gy = cyX_MY * 2 + 3, gw = 146, gh = 85;
  if (glow > 0) {
    g.save(); g.beginPath(); g.roundRect(gx, gy, gw, gh, 4); g.clip();
    if (glow < 0.5) { const w = Math.max(2, gw * glow * 2); rect(gx + (gw - w) / 2, gy + gh / 2 - 0.5, w, 1.5, '#f0fff0'); cyX_glow(gx + gw / 2, gy + gh / 2, w / 2 + 4, 6, C.g4, 0.5, 4); }
    else {
      const k = (glow - 0.5) * 2; rect(gx, gy, gw, gh, mix('#07100a', C.g1, k));
      rect(gx + 4, gy + 3, gw - 8, 5, mix('#07100a', C.g3, k));
      for (let r = 0; r < 6; r++) rect(gx + 8, gy + 14 + r * 9, 60 + ((r * 37) % 60), 2, mix('#07100a', C.g4, k * 0.8));
    }
    g.restore();
    // phosphor glow falling on the desk, the wall and his face
    cyX_al(glow, () => { cyX_glow(380, 140, 150, 110, C.g3, 0.18, 8); cyX_glow(384, 232, 110, 20, C.g3, 0.25, 6); cyX_glow(200, 150, 26, 36, C.g3, 0.18, 4); });
  }
  // power LED on the monitor chin
  const on = glow > 0; rect(cyX_MX * 2 + 122, cyX_MY * 2 + 93, 3, 1.5, on ? C.g4 : C.g2); if (on) cyX_glow(cyX_MX * 2 + 123, cyX_MY * 2 + 94, 5, 3, C.g4, 0.5, 3);
}

// ===================================================================
// DECODE SUCCESS: a close-up of the teletype printing the plain text
// ===================================================================
function cyX_printBG() {
  return art('cyX_printBG', 320, 200, () => {
    const C = cyX_C;
    rect(0, 0, 640, 400, cyX_lg(0, 0, 0, 280, C.n0, C.n2, C.n3));
    cyX_glow(560, 60, 260, 220, C.l3, 0.35, 10);   // the lamp, off to the upper right
    cyX_glow(60, 140, 160, 160, C.g2, 0.25, 8);    // the workstation, off to the left
    for (const sx of [70, 580]) { rect(sx, 0, 1, 280, C.n1); rect(sx + 1, 0, 1, 280, 'rgba(120,130,190,0.08)'); }
    // desk top behind and under the machine
    rect(0, 236, 640, 164, cyX_lg(0, 236, 0, 280, C.w1, C.w3)); cyX_glow(520, 262, 220, 30, C.l2, 0.35, 8);
  });
}
function cyX_printBody() {
  return art('cyX_printBody', 320, 64, () => {
    const C = cyX_C;
    // platen: black rubber roller between chrome knobs (y 0..20)
    rect(46, 2, 548, 20, cyX_lg(0, 2, 0, 22, '#3a3a44', '#15141a', '#050508'));
    rect(46, 6, 548, 2, 'rgba(255,255,255,0.18)');
    for (const kx of [20, 594]) {
      cyX_rr(kx, 0, 26, 24, 5, cyX_lg(kx, 0, kx + 26, 0, '#6a6a78', '#e8e8f0', '#9a9aa8', '#4a4a58'));
      for (let k = 0; k < 6; k++) rect(kx + 3 + k * 4, 3, 1.5, 18, 'rgba(0,0,0,0.3)');
    }
    // the hood
    g.beginPath(); g.moveTo(20, 24); g.lineTo(620, 24); g.quadraticCurveTo(640, 26, 638, 48); g.lineTo(638, 128); g.lineTo(2, 128); g.lineTo(2, 48); g.quadraticCurveTo(0, 26, 20, 24); g.closePath();
    g.fillStyle = cyX_lg(0, 24, 0, 128, C.p1, C.p2, C.p3, C.p4); g.fill();
    cyX_al(0.4, () => rect(0, 24, 640, 104, cyX_lg(0, 0, 640, 0, C.n3, 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', C.l2)));
    rect(20, 24, 600, 2, C.p0);
    // plexiglass window over the type mechanism
    cyX_rr(110, 32, 420, 48, 6, C.p5);
    cyX_rr(113, 35, 414, 42, 5, cyX_lg(0, 35, 0, 77, '#1a1c2c', '#0c0d16'));
    // ribbon spools and the ribbon between them
    for (const sx of [168, 472]) {
      cyX_ell(sx, 56, 17, 15, C.p6); cyX_ell(sx, 56, 15, 13, cyX_lg(sx - 15, 0, sx + 15, 0, '#3a0c14', C.red, '#e85a4c'));
      cyX_ell(sx, 56, 9, 8, '#1a0a0e'); cyX_ell(sx, 56, 4, 4, cyX_lg(sx - 4, 0, sx + 4, 0, '#8a8a9a', '#f0f0f8')); px(sx - 1, 54, '#ffffff');
    }
    // carriage rods and the type cylinder's rack behind the glass
    rect(118, 42, 404, 3, cyX_lg(0, 42, 0, 45, '#9a9aa8', '#3a3a48')); rect(118, 66, 404, 3, cyX_lg(0, 66, 0, 69, '#9a9aa8', '#3a3a48'));
    for (let x = 200; x < 440; x += 6) rect(x, 70, 3, 4, '#3a3a48');
    for (const [gx, gy, r] of [[134, 60, 9], [506, 60, 9], [212, 44, 5], [428, 44, 5]]) { cyX_ell(gx, gy, r, r, '#2a2a36'); cyX_ell(gx, gy, r - 2, r - 2, '#6a6a78'); cyX_ell(gx, gy, 2, 2, '#1a1a22'); for (let a = 0; a < 8; a++) px(gx + Math.cos(a * 0.785) * r, gy + Math.sin(a * 0.785) * r, '#8a8a98'); }
    rect(180, 52, 280, 3, C.redd); rect(180, 52, 280, 1, C.red);
    cyX_al(0.14, () => { cyX_poly([[140, 35], [180, 35], [150, 77], [110, 77]], '#c8d8ff'); cyX_poly([[300, 35], [316, 35], [286, 77], [270, 77]], '#c8d8ff'); });
    rect(113, 78, 414, 2, C.p0);
    // nameplate and the MODEL badge
    cyX_rr(40, 92, 70, 20, 3, C.p5); cyX_rr(42, 94, 66, 16, 2, cyX_lg(0, 94, 0, 110, '#3a3a48', '#1a1a24'));
    cyX_microText('TELEX', 58, 98, '#e8dcc0');
    cyX_microText('MODEL 33', 522, 98, C.p4); cyX_microText('MODEL 33', 522, 97, C.p1);
    for (const sx of [14, 626]) { cyX_ell(sx, 104, 4, 4, C.p4); cyX_ell(sx, 104, 3, 3, C.p2); rect(sx - 2, 104, 5, 1, C.p4); }
  });
}
// the red rubber stamp: clean double border, worn a little where the rubber is uneven
function cyX_stamp() {
  return art('cyX_stamp', 110, 36, () => {
    const C = cyX_C;
    g.translate(110, 36); g.rotate(-0.07); g.translate(-110, -36);
    g.strokeStyle = C.red; g.lineWidth = 4; g.beginPath(); g.roundRect(8, 6, 204, 60, 6); g.stroke();
    g.lineWidth = 1.5; g.beginPath(); g.roundRect(15, 13, 190, 46, 3); g.stroke();
    g.save(); g.scale(4, 4); text('DECODED', (55 - textW('DECODED')) / 2, 5, C.red); g.restore();
    // ink starvation: a few broad soft patches, not noise
    g.globalCompositeOperation = 'destination-out';
    cyX_glow(40, 20, 50, 14, '#000', 0.6, 5); cyX_glow(172, 56, 40, 12, '#000', 0.5, 5); cyX_glow(120, 40, 20, 30, '#000', 0.25, 4);
    g.globalCompositeOperation = 'source-over';
  });
}
function cyX_drawStamp(x, y, k) { // k: 0..1 slam-down (big and faint to crisp)
  const s = cyX_stamp(), sc = 1 + (1 - k) * 0.35;
  g.save(); g.globalAlpha = 0.25 + 0.65 * k; g.translate(x + 55, y + 18); g.scale(sc, sc);
  g.drawImage(s, -55, -18, 110, 36); g.restore();
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
  const C = cyX_C;
  // phosphor colours for the text
  const TX = { cipher: '#5fe07a', dim: C.g2, mid: C.g3, guess: C.a2, given: C.g5, flash: '#ffffff', wrong: C.red2, cur: C.a2, curD: '#3a2408' };

  // ---------------- drawing ----------------
  // everything on the tube is drawn into a scratch layer, then composited with a phosphor bloom
  function tube(fn, bright = 1) {
    const L = cyX_buf('cyX_tube', 640, 400);
    L.x.setTransform(1, 0, 0, 1, 0, 0); L.x.clearRect(0, 0, 640, 400); L.x.setTransform(2, 0, 0, 2, 0, 0); L.x.imageSmoothingEnabled = false;
    drawTo(L.x, fn);
    blit(cyX_glassBG(), cyX_GX, cyX_GY);
    g.drawImage(L.c, 0, 0, 640, 400, 0, 0, 320, 200);
    // bloom: shrink the layer twice and add it back soft
    const s1 = cyX_buf('cyX_bl1', 160, 100), s2 = cyX_buf('cyX_bl2', 64, 40);
    s1.x.imageSmoothingEnabled = true; s1.x.clearRect(0, 0, 160, 100); s1.x.drawImage(L.c, 0, 0, 160, 100);
    s2.x.imageSmoothingEnabled = true; s2.x.clearRect(0, 0, 64, 40); s2.x.drawImage(s1.c, 0, 0, 64, 40);
    cyX_clip(cyX_GX, cyX_GY, cyX_GW, cyX_GH); g.imageSmoothingEnabled = true; g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.3 * bright; g.drawImage(s1.c, 0, 0, 320, 200);
    g.globalAlpha = 0.32 * bright; g.drawImage(s2.c, 0, 0, 320, 200);
    g.restore(); g.imageSmoothingEnabled = false;
  }
  function glassFX() { blit(cyX_glassFX(), cyX_GX, cyX_GY); }
  function roll() { // the slow refresh band drifting down the tube
    const by = ((t * 24) % (cyX_GH + 60)) - 30;
    cyX_clip(cyX_GX, cyX_GY, cyX_GW, cyX_GH); rect(cyX_GX, cyX_GY + by, cyX_GW, 18, cyX_lg(0, cyX_GY + by, 0, cyX_GY + by + 18, 'rgba(120,255,150,0)', 'rgba(120,255,150,0.035)', 'rgba(120,255,150,0)')); g.restore();
  }
  function drawGlass(o) {
    tube(() => drawTubeText(o), o.bright == null ? 1 : o.bright);
    roll();
  }
  function drawTubeText(o) {
    // status line in inverse video
    const sb = o.status;
    if (sb > 0) {
      const w = Math.round(284 * Math.min(1, sb)); rect(18, 8, w, 9, C.g3); rect(18, 8, w, 1, C.g4);
      if (sb >= 1) {
        const title = o.title || 'CRYPTO WORKSTATION  MSG#' + msgNo; text(title, 21, 9, C.g0);
        if (!o.title) { textR(clock(time), 298, 9, C.g0); if (!over && introDone() && (t % 1) < 0.5) rect(255, 10, 3, 5, C.g0); }
      }
    }
    // cipher text and guesses
    const selC = letterCells[cur] && letterCells[cur].ch, live = !over && introDone();
    const shown = o.reveal == null ? cells.length : o.reveal;
    cells.forEach((c, i) => {
      if (i >= shown) return;
      const x = X0 + c.c * CW, y = LY + c.r * LH;
      if (!A.includes(c.ch)) { text(c.ch, cx0(c.ch, x), y, TX.cipher); return; }
      // decode resolve: letters roll through the alphabet and settle on the plain text
      if (o.resolve != null) {
        const li = letterCells.indexOf(c), s = 0.1 + li / letterCells.length * 0.9, dt = o.resolve - s;
        if (dt >= 0) { const pc = plainOf(c.ch); if (dt < 0.12) rect(x, y - 1, 6, 9, C.g3); text(pc, cx0(pc, x), y, dt < 0.12 ? '#ffffff' : C.g5); return; }
        if (dt > -0.18) { const rc = A[(li * 7 + (t * 40 | 0)) % 26]; text(rc, cx0(rc, x), y, C.a2); return; }
      }
      const isCur = letterCells[cur] === c, inst = live && c.ch === selC;
      if (inst) {
        if (isCur) { const on = (t * 3 | 0) % 2; rect(x - 1, y - 2, 8, 11, on ? C.a1 : C.a2); rect(x, y - 1, 6, 9, on ? C.a2 : C.a3); }
        else rect(x, y - 1, 6, 9, C.g2);
        text(c.ch, cx0(c.ch, x), y, isCur ? TX.curD : C.g5);
      } else text(c.ch, cx0(c.ch, x), y, TX.cipher);
      const gch = guess[c.ch];
      if (gch) {
        const fl = flash[c.ch] != null && t - flash[c.ch] < 0.3;
        const col = fl ? TX.flash : given.has(c.ch) ? TX.given : over && !over.win && gch !== plainOf(c.ch) ? TX.wrong : TX.guess;
        text(gch, cx0(gch, x), y + 8, col);
      } else rect(x + 1, y + 14, 5, 1, inst ? C.g4 : C.g2);
      if (isCur && live && !picker && (t * 2.5 | 0) % 2) { if (gch) rect(x, y + 15, 7, 1, C.a3); else rect(x + 1, y + 8, 5, 7, C.a2); }
    });
    if (o.cursorAt != null && (t * 8 | 0) % 2) { const c = cells[Math.min(cells.length - 1, o.cursorAt)]; if (c) rect(X0 + c.c * CW + 7, LY + c.r * LH, 5, 7, C.g4); }
    // frequency analysis chart
    if (o.chart > 0) drawChart(o.chart, selC, live);
  }
  function drawChart(k, selC, live) {
    fine(() => { text('FREQUENCY ANALYSIS', FX * 2, 243, C.g3); textR('ENGLISH: E T A O I N  S H R D L U', 578, 243, C.g3); });
    for (let x = FX - 2; x < 292; x += 2) rect(x, 128.5, 1, 0.5, C.g2);
    rect(FX - 2, FB + 1, 264, 1, C.g3);
    for (let i = 0; i < 26; i++) {
      const c = A[i], n = freq[c] || 0, cx = FX + i * FP, cc = cx + 4, sel = live && c === selC;
      if (n) {
        const h = Math.max(1, Math.round(n / maxF * 17 * k));
        rect(cc - 2, FB - h + 1, 6, h, sel ? C.a1 : C.g2);
        rect(cc - 2, FB - h + 1, 4, h, sel ? C.a2 : C.g3);
        rect(cc - 2, FB - h + 1, 6, 1, sel ? C.a3 : C.g4);
        if (k >= 1) { const s = String(n); fine(() => textR(s, cc * 2 + 5 + (s.length - 1) * 3, (FB - h - 5) * 2, sel ? C.a2 : C.g3)); }
      }
      if (sel) rect(cx + 1, 153, 7, 9, C.a2);
      text(c, cx + 2 + ((5 - FONT[c].w) >> 1), 154, sel ? TX.curD : n ? TX.cipher : C.g2);
      const gch = guess[c];
      if (gch && k >= 1) { const fl = flash[c] != null && t - flash[c] < 0.3; text(gch, cx + 2 + ((5 - FONT[gch].w) >> 1), 164, fl ? TX.flash : given.has(c) ? TX.given : over && !over.win && gch !== plainOf(c) ? TX.wrong : TX.guess); }
      else if (n) rect(cx + 2, 171, 5, 1, C.g2);
    }
  }
  function drawCaseLive(bright = 1) {
    blit(cyX_case(), 0, 0);
    if (bright > 0) { g.globalAlpha = bright; blit(cyX_spill(), 0, 0); g.globalAlpha = 1; }
    const on = intro >= 1.15 || over;
    fine(() => {
      rect(490, 372, 10, 4, on ? C.g4 : '#0e2a18'); if (on) { cyX_glow(495, 374, 12, 7, C.g4, 0.5, 4); rect(491, 372, 3, 1, C.g5); }
      const disk = ledT > 0 ? (t * 30 | 0) % 3 !== 0 : (t % 5) < 0.12 || ((t + 1.3) % 7.3) < 0.08;
      rect(508, 372, 10, 4, disk ? '#ffa030' : '#3a1a08'); if (disk) { cyX_glow(513, 374, 12, 7, '#ffa030', 0.5, 4); rect(509, 372, 3, 1, '#ffe0a0'); }
    });
  }
  function drawKeyboard() {
    const e = cyX_ease(pickT), oy = Math.round((1 - e) * 84);
    if (e <= 0) return;
    const selC = letterCells[cur] && letterCells[cur].ch;
    // shadow cast up onto the screen as it slides in
    cyX_al(0.5 * e, () => rect(KBX - 4, KBY + oy - 6, 248, 6, cyX_lg(0, KBY + oy - 6, 0, KBY + oy, 'rgba(0,0,0,0)', '#000')));
    blit(cyX_kbd(), KBX, KBY + oy);
    const cap = 'CODE LETTER ' + selC + ' STANDS FOR...';
    text(cap, KBX + 12, KBY + 5 + oy, C.g4);
    if ((t * 2 | 0) % 2) rect(KBX + 12 + textW(cap) + 2, KBY + 5 + oy, 5, 7, C.g4);
    const taken = new Set(Object.values(guess)), mine = guess[selC];
    KROWS.forEach((row, r) => { for (let i = 0; i < row.length; i++) {
      const ch = row[i], x = KX + KOFF[r] + i * KP, y = KY + r * KV + oy;
      const pressed = keyFlash && keyFlash.ch === ch && t - keyFlash.t < 0.15;
      const kind = pressed ? 'p' : ch === mine ? 'c' : taken.has(ch) ? 't' : 'n';
      blit(cyX_cap(kind), x, y + (pressed ? 1 : 0));
      text(ch, x + 9 - FONT[ch].w / 2 | 0, y + 2 + (pressed ? 1 : 0), kind === 't' ? C.p3 : kind === 'c' ? '#4a2a04' : C.p6);
    } });
    const cy = CLR.y + oy;
    fine(() => {
      const x = CLR.x * 2, y = cy * 2, w = CLR.w * 2, h = CLR.h * 2 - 2;
      cyX_rr(x, y, w, h, 4, C.redk); cyX_rr(x + 2, y + 1, w - 4, h - 4, 3, cyX_lg(0, y, 0, y + h, C.red2, C.red, C.redd)); rect(x + 6, y + 2, w - 12, 1, '#ff9a86');
    });
    textC('CLEAR THIS LETTER', CLR.x + CLR.w / 2, cy + 3, C.l0);
  }
  // intro: the desk, a push-in to the monitor, the CRT warming up, the cipher typing on
  function drawIntro() {
    const u = intro;
    if (u < 1.15) {
      const B = cyX_buf('cyX_desk', 640, 400);
      B.x.setTransform(1, 0, 0, 1, 0, 0); B.x.imageSmoothingEnabled = false;
      drawTo(B.x, () => cyX_deskScene(t, u > 0.85 ? (u - 0.85) / 0.3 * 0.4 : 0));
      const k = cyX_ease((u - 0.7) / 0.45), k2 = k * k;
      const sx = cyX_MX * k2, sy = cyX_MY * k2, sw = 320 - 240 * k2, sh = 200 - 150 * k2;
      g.imageSmoothingEnabled = k2 > 0; g.drawImage(B.c, sx * 2, sy * 2, sw * 2, sh * 2, 0, 0, 320, 200); g.imageSmoothingEnabled = false;
      // the close-up fades in over the last of the push so the cut is seamless
      if (k2 > 0.55) {
        const a = Math.min(1, (k2 - 0.55) / 0.4), s = 320 / sw, dx = (cyX_MX - sx) * s, dy = (cyX_MY - sy) * s;
        g.save(); g.globalAlpha = a; g.translate(dx, dy); g.scale(s / 4, s / 4); blit(cyX_case(), 0, 0); g.restore();
      }
      if (u < 0.25) { g.globalAlpha = 1 - u / 0.25; rect(0, 0, 320, 200, '#000'); g.globalAlpha = 1; } // fade up from black
      return;
    }
    // close-up: warm-up of the tube
    const w = (u - 1.15) / 0.3;
    if (w < 1) {
      rect(cyX_GX, cyX_GY, cyX_GW, cyX_GH, '#020604');
      const cxm = cyX_GX + cyX_GW / 2, cym = cyX_GY + cyX_GH / 2;
      fine(() => {
        const X = cxm * 2, Y = cym * 2;
        if (w < 0.25) { const r = 2 + w * 30; cyX_glow(X, Y, r * 3, 8, C.g4, 0.6, 4); rect(X - r, Y - 1, r * 2, 2, '#f4fff0'); }
        else if (w < 0.55) { const hw = (w - 0.25) / 0.3 * cyX_GW; cyX_glow(X, Y, hw + 20, 20, C.g4, 0.5, 5); rect(X - hw, Y - 1, hw * 2, 2, '#f4fff0'); rect(X - hw / 2, Y - 3, hw, 6, 'rgba(220,255,220,0.5)'); }
        else { const hh = (w - 0.55) / 0.45 * cyX_GH; const k = 1 - (w - 0.55) / 0.45; rect(cyX_GX * 2, Y - hh, cyX_GW * 2, hh * 2, mix(C.g1, C.g3, k * 0.6)); rect(cyX_GX * 2, Y - hh, cyX_GW * 2, 2, C.g5); rect(cyX_GX * 2, Y + hh - 2, cyX_GW * 2, 2, C.g5); }
      });
      glassFX(); drawCaseLive(Math.min(1, w * 1.5)); return;
    }
    // typing the cipher on
    const p = (u - 1.45) / (INTRO - 1.45), n = Math.floor(cells.length * Math.min(1, p * 1.15));
    drawGlass({ status: Math.min(1, p * 4), reveal: n, cursorAt: n, chart: Math.min(1, Math.max(0, p * 1.4 - 0.2)) });
    glassFX(); drawCaseLive();
  }
  function drawWin() {
    const u = over.t;
    if (u < 1.3) {
      drawGlass({ status: 1, title: (u < 1.05 ? 'DECRYPTING' + '...'.slice(0, (t * 4 | 0) % 4) : 'MESSAGE DECODED') + '   MSG#' + msgNo, resolve: u, chart: 1 });
      if (u > 1.05 && (t * 8 | 0) % 2) { const s = 'MESSAGE DECODED'; rect(160 - textW(s) / 2 - 5, 123, textW(s) + 10, 13, C.g4); textC(s, 160, 126, C.g0); }
      glassFX(); drawCaseLive();
      if (u > 1.15) { const k = (u - 1.15) / 0.15; g.globalAlpha = Math.min(1, k); rect(0, 0, 320, 200, '#000'); g.globalAlpha = 1; }
      return;
    }
    // teletype close-up: the page rises out of the platen line by line
    if (!printBody) { printLines[1] = 'MSG# ' + msgNo + '    WORK TIME ' + clock(time).slice(3); printBody = printLines.concat(wrap(plain, 204)); }
    const L = printBody.length, q = Math.max(0, Math.min(L, (u - 1.4) / 1.6 * L)), k = Math.floor(q);
    const adv = Math.round(cyX_ease((u - 3.0) / 0.25) * 58);
    const shake = u > 3.3 && u < 3.45 ? ((t * 40 | 0) % 2 ? 1 : -1) : 0;
    blit(cyX_printBG(), 0, 0);
    // the sheet: lit from the upper right, shadowed where it curls out of the machine
    cyX_al(0.45, () => rect(56, 0, 216, 140, '#000'));
    rect(52, 0, 216, 140, cyX_lg(52, 0, 268, 0, '#e2d6b8', C.paper, '#fff8e6'));
    cyX_al(0.5, () => rect(52, 104, 216, 36, cyX_lg(0, 104, 0, 140, 'rgba(0,0,0,0)', '#6a5a48')));
    rect(52, 0, 1, 140, '#b8a888'); rect(267, 0, 1, 140, '#fffaf0');
    cyX_clip(52, 0, 216, 136);
    const top = 134 - (Math.min(k, L - 1)) * 10 - adv - 6 + shake;
    // faint page perforation scrolling with the paper
    for (let yy = ((top % 120) + 120) % 120 - 120; yy < 140; yy += 120) fine(() => { for (let x = 108; x < 536; x += 6) rect(x, yy * 2 + 60, 3, 1, '#d8c8a8'); });
    for (let i = 0; i <= Math.min(k, L - 1); i++) {
      const s = printBody[i], y = top + 6 + i * 10; if (y < -9) continue;
      const part = i < k ? s : s.slice(0, Math.floor((q - k) * s.length));
      text(part, i < 2 ? 160 - textW(s) / 2 : 60, y, i < 2 ? C.inkB : C.ink);
      if (i === 0) rect(60, y + 9, 200, 1, C.inkB);
    }
    if (u >= 3.3) cyX_drawStamp(150, top + 6 + L * 10 + 2, cyX_ease((u - 3.3) / 0.12));
    g.restore();
    blit(cyX_printBody(), 0, 136);
    // type head riding the platen
    const cl = printBody[Math.min(k, L - 1)];
    const px0 = k < L ? 60 + Math.min(200, textW(cl.slice(0, Math.floor((q - k) * cl.length)))) : 60 + ((u * 40) % 200);
    fine(() => {
      const x = px0 * 2;
      cyX_rr(x - 14, 250, 28, 26, 4, C.p6); cyX_rr(x - 12, 252, 24, 20, 3, cyX_lg(x - 12, 0, x + 12, 0, '#4a4a58', '#c8c8d4', '#6a6a78'));
      rect(x - 10, 268, 20, 4, C.red); rect(x - 1, 272, 3, 4, '#e8e8f0');
      if (k < L && (t * 30 | 0) % 2) cyX_glow(x, 270, 10, 4, '#ffffff', 0.2, 2);
    });
    // paper bail with rollers
    fine(() => { rect(80, 246, 480, 4, cyX_lg(0, 0, 640, 0, '#6a6a78', '#e8e8f0', '#9a9aa8')); rect(80, 246, 480, 1, '#ffffff'); for (const rx of [192, 432]) { cyX_rr(rx, 243, 16, 10, 3, '#1a1a22'); cyX_rr(rx + 2, 245, 12, 5, 2, '#5a5a66'); } });
    if (u >= WIN_END) { fine(() => { cyX_rr(196, 370, 248, 24, 5, 'rgba(10,10,16,0.82)'); cyX_rr(196, 370, 248, 24, 5, 'rgba(0,0,0,0)'); g.strokeStyle = C.p3; g.lineWidth = 1; g.beginPath(); g.roundRect(196.5, 370.5, 247, 23, 5); g.stroke(); }); textC('Press a key', 160, 188, C.l0); }
  }
  function drawFail() {
    const u = over.t - 1;
    if (u < 0.55) {
      drawGlass({ status: 1, title: 'DECODING ABANDONED   MSG#' + msgNo, chart: 1, bright: 1 - u });
      // interference: streaks of snow tearing across the picture
      const n = Math.round(u / 0.55 * 160), f = t * 60 | 0;
      fine(() => {
        cyX_clip(cyX_GX * 2, cyX_GY * 2, cyX_GW * 2, cyX_GH * 2);
        g.globalAlpha = Math.min(0.85, u / 0.55); rect(cyX_GX * 2, cyX_GY * 2, cyX_GW * 2, cyX_GH * 2, '#0a120e'); g.globalAlpha = 1;
        for (let i = 0; i < n; i++) { const h = cyX_hash(i, f); rect(cyX_GX * 2 + cyX_hash(f, i) * cyX_GW * 2, cyX_GY * 2 + (cyX_hash(i + 7, f) * cyX_GH * 2 | 0), 4 + h * 30, 1.5, h < 0.3 ? '#e8f0ec' : h < 0.65 ? '#8a9a92' : '#4a5a52'); }
        for (let k = 0; k < 3; k++) { const y = cyX_GY * 2 + ((t * 340 + k * 114) % (cyX_GH * 2) | 0); rect(cyX_GX * 2, y, cyX_GW * 2, 3, 'rgba(200,230,210,0.25)'); }
        g.restore();
      });
      glassFX(); drawCaseLive(1 - u); return;
    }
    rect(cyX_GX, cyX_GY, cyX_GW, cyX_GH, '#020604');
    const cxm = cyX_GX + cyX_GW / 2, cym = cyX_GY + cyX_GH / 2;
    if (u < 0.95) { // the tube collapses to a line, then to a dot
      const s = (u - 0.55) / 0.4;
      fine(() => {
        const X = cxm * 2, Y = cym * 2;
        if (s < 0.5) { const hh = (1 - s * 2) * cyX_GH; rect(cyX_GX * 2, Y - hh, cyX_GW * 2, hh * 2, 'rgba(160,190,175,0.35)'); rect(cyX_GX * 2, Y - 1, cyX_GW * 2, 2, '#f4fff4'); cyX_glow(X, Y, cyX_GW, 14, '#c8ffd8', 0.4, 4); }
        else { const hw = (1 - (s - 0.5) * 2) * cyX_GW; rect(X - hw, Y - 1, hw * 2, 2, '#f4fff4'); cyX_glow(X, Y, hw + 10, 12, '#c8ffd8', 0.45, 4); }
      });
    } else if (u < 1.2) { if ((t * 20 | 0) % 2) fine(() => { cyX_glow(cxm * 2, cym * 2, 16, 16, '#e8fff0', 0.6, 4); cyX_ell(cxm * 2, cym * 2, 2.5, 2.5, '#ffffff'); }); }
    else {
      blit(cyX_glassBG(), cyX_GX, cyX_GY); blit(cyX_refl(), cyX_GX, cyX_GY);
      const k = Math.min(1, (u - 1.2) / 0.3);
      if (k >= 0.3) {
        textC('DECODING ABANDONED', 160, 56, C.red2); rect(100, 66, 120, 1, C.red);
        para('The message goes back in the pile for the analysts at Langley.', 60, 76, 200, '#e8a090', 10);
        if (u + 1 >= FAIL_END) textC('Press a key', 160, 140, C.red2);
      }
      if (k < 1) fine(() => { cyX_glow(cxm * 2, cym * 2, 40 * (1 - k) + 4, 40 * (1 - k) + 4, '#c8ffd8', 0.35 * (1 - k), 4); });
    }
    glassFX(); drawCaseLive(0);
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
      glassFX(); drawCaseLive();
      drawKeyboard();
    },
  };
}
