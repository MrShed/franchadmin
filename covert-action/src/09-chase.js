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
// string sprite: one char per pixel, '.' = transparent, cached offscreen
function chX_spr(key, rows, map) {
  return sprite('chX:' + key, rows[0].length, rows.length, () => {
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const c = map[r[x]]; if (c) px(x, y, c); } });
  });
}
function chX_rot(rows) { // rotate a string sprite 90 degrees clockwise
  const h = rows.length, w = rows[0].length, out = [];
  for (let x = 0; x < w; x++) { let s = ''; for (let y = h - 1; y >= 0; y--) s += rows[y][x]; out.push(s); }
  return out;
}
function chX_h(a, b, c) { let h = (a * 374761393 + b * 668265263 + c * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; }
function chX_lerp(pts, x) { // polyline y at x (pts sorted by x)
  if (x < pts[0][0] || x > pts[pts.length - 1][0]) return null;
  for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; if (x <= x1) return x1 === x0 ? y1 : y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
  return pts[pts.length - 1][1];
}
// shade (darker neighbour) of each EGA colour, used for car bodies
const chX_SHADE = { [P.W]: P.G3, [P.G3]: P.G1, [P.G1]: P.K, [P.BR]: P.RD, [P.YE]: P.BR, [P.RD]: P.BR, [P.RD2]: P.RD, [P.BL2]: P.BL, [P.BL]: P.K, [P.PK]: P.MG, [P.MG]: P.K, [P.GR2]: P.GR, [P.GR]: P.K, [P.CY]: P.TL, [P.TL]: P.BL, [P.K]: P.K };
const chX_shade = c => chX_SHADE[c] || P.K;

// ---------- side-view cars for the garage (108 x 36, wheels touch y=34) ----------
const chX_SHAPES = {
  Countach: { // ultra-low wedge with scissor-door glasshouse, NACA duct and rear wing
    top: [[0, 19], [2, 17], [12, 15], [30, 12], [41, 9], [50, 5], [53, 4], [67, 4], [74, 6], [86, 8], [100, 9], [105, 10], [107, 12], [108, 15], [108, 21]],
    bot: [[0, 19], [0, 21], [3, 23], [105, 23], [108, 21]],
    gTop: [[43, 9], [51, 5], [66, 5], [71, 7], [80, 9]], gBot: [[42, 10], [81, 10]], pillars: [[64, 65, 'k']],
    belt: 10, doors: [44, 76], handle: 70, wheels: [22, 87], pal: { b: P.W, h: P.W, s: P.G3, d: P.G1 },
  },
  Coupe: { // squared-off notchback coupe, chrome bumpers and window trim
    top: [[0, 15], [1, 13], [4, 12], [32, 11], [37, 10], [46, 4], [68, 4], [74, 7], [80, 10], [84, 11], [103, 11], [106, 12], [108, 14], [108, 21]],
    bot: [[0, 15], [0, 22], [2, 24], [4, 25], [104, 25], [107, 24], [108, 21]],
    gTop: [[38, 10], [46, 5], [67, 5], [79, 10]], gBot: [[37, 11], [80, 11]], pillars: [[60, 61, 'b']],
    belt: 11, doors: [36, 76], handle: 70, wheels: [21, 87], chrome: true, pal: { b: P.G1, h: P.G3, s: P.K, d: P.K },
  },
  'Sports car': { // long bonnet, fastback roof, side gill and pinstripe
    top: [[0, 17], [2, 15], [6, 13], [24, 12], [38, 10], [48, 5], [58, 3], [70, 3], [80, 5], [96, 9], [104, 11], [107, 13], [108, 16], [108, 21]],
    bot: [[0, 17], [0, 22], [3, 25], [105, 25], [108, 22]],
    gTop: [[40, 10], [49, 5], [58, 4], [69, 4], [78, 6], [86, 10]], gBot: [[39, 11], [87, 11]], pillars: [[66, 67, 'b']],
    belt: 11, doors: [40, 72], handle: 66, wheels: [21, 88], stripe: P.W, pal: { b: P.GR2, h: P.W, s: P.GR, d: P.K },
  },
  Hatchback: { // tall boxy two-box shape, big glass area, rear hatch
    top: [[0, 14], [1, 12], [4, 11], [22, 10], [27, 9], [38, 2], [40, 1], [80, 1], [85, 2], [96, 7], [101, 11], [103, 14], [104, 21]],
    bot: [[0, 14], [0, 22], [2, 24], [4, 25], [100, 25], [103, 24], [104, 21]],
    gTop: [[29, 9], [38, 3], [40, 2], [80, 2], [85, 3], [95, 8], [96, 9]], gBot: [[28, 10], [97, 10]], pillars: [[57, 58, 'b'], [78, 79, 'b']],
    belt: 10, doors: [26, 58], handle: 52, wheels: [21, 84], chrome: true, pal: { b: P.CY, h: P.W, s: P.TL, d: P.BL },
  },
};
function chX_paintCar(c) {
  const S = chX_SHAPES[c.name] || chX_SHAPES.Countach, pal = S.pal;
  const X0 = S.top[0][0], X1 = S.top[S.top.length - 1][0];
  // ground shadow
  for (let x = 4; x < X1 - 2; x++) { px(x, 34, P.K); if (x > 8 && x < X1 - 6 && (x & 1)) px(x, 35, P.K); }
  // outline
  for (let x = X0; x <= X1; x++) { const t = chX_lerp(S.top, x), b = chX_lerp(S.bot, x); rect(x - 1, Math.floor(t) - 1, 3, Math.ceil(b) - Math.floor(t) + 2, P.K); }
  // body with shading: top gloss, shoulder crease, horizon reflection band, darkening to the sill
  for (let x = X0; x <= X1; x++) {
    const t = Math.round(chX_lerp(S.top, x)), b = Math.round(chX_lerp(S.bot, x));
    for (let y = t; y < b; y++) {
      let col = pal.b; const k = BAYER[(y & 3) * 4 + (x & 3)];
      if (y === t) col = pal.h;
      else if (y === S.belt + 3) col = pal.h;
      else if (y === S.belt + 4) col = pal.b;
      else if (y === S.belt + 6 && k < 8) col = pal.s;
      else if (y >= b - 2) col = pal.d;
      else if (y >= b - 7 && k < (y - (b - 7)) * 3) col = pal.s;
      if ((x <= X0 + 1 || x >= X1 - 1) && y > t) col = k < 8 ? pal.s : col; // rounded ends
      px(x, y, col);
    }
  }
  if (S.stripe) for (let x = X0 + 4; x < X1 - 4; x++) px(x, S.belt + 3, S.stripe);
  // glasshouse: tinted glass, sky reflection bands, chrome/black trim
  for (let x = S.gTop[0][0]; x <= S.gTop[S.gTop.length - 1][0]; x++) {
    const t = Math.round(chX_lerp(S.gTop, x)), b = Math.round(chX_lerp(S.gBot, x) ?? S.belt);
    for (let y = t; y <= b; y++) {
      const k = BAYER[(y & 3) * 4 + (x & 3)], rel = (y - t) / Math.max(1, b - t);
      let col = rel < 0.45 ? P.BL : (k < 6 ? P.TL : P.BL);
      const streak = (x + (y - t) * 2) % 19; if (streak < 2) col = P.CY; if (streak === 0 && rel < 0.5) col = P.W;
      px(x, y, col);
    }
    px(x, b, S.chrome ? P.W : P.K); px(x, t - 1, S.chrome ? P.G3 : P.K);
  }
  for (const [a, bb, kind] of S.pillars) for (let x = a; x <= bb; x++) { const t = Math.round(chX_lerp(S.gTop, x)), b = Math.round(chX_lerp(S.gBot, x)); rect(x, t - 1, 1, b - t + 1, kind === 'k' ? P.K : (x === a ? pal.h : pal.b)); }
  for (const [pa] of S.pillars) { const hx = pa - 7, t = Math.round(chX_lerp(S.gTop, hx) ?? S.belt); if (S.belt - t > 3) { rect(hx, t + 1, 4, S.belt - t - 1, P.K); rect(hx + 1, t + 1, 2, 1, P.G1); } }
  // door shut lines, handle, mirror
  for (const dx of S.doors) { const t = Math.round(chX_lerp(S.top, dx)); rect(dx, Math.max(t + 1, S.belt + 1), 1, Math.round(chX_lerp(S.bot, dx)) - 1 - Math.max(t + 1, S.belt + 1), pal.d === P.K ? P.K : chX_shade(pal.s)); }
  rect(S.handle, S.belt + 2, 3, 1, P.K); px(S.handle, S.belt + 1, P.W);
  const gx = S.gBot[0][0]; rect(gx + 1, S.belt - 2, 3, 2, pal.b); px(gx + 1, S.belt - 2, pal.h); rect(gx + 1, S.belt, 3, 1, P.K);
  // lamps and bumpers
  if (c.name === 'Countach') {
    rect(2, 17, 6, 1, P.K); rect(3, 18, 4, 1, P.YE); px(2, 20, P.YE); // slit lamp + indicator
    rect(104, 12, 4, 3, P.RD); rect(105, 12, 2, 1, P.RD2);
    for (let x = 76; x < 90; x++) { const d = Math.round((x - 76) * 3 / 14); rect(x, 13 + d - 1, 1, 5 - d, x === 76 ? P.K : (x & 1 ? P.K : P.G1)); } // NACA intake
    for (let q = 0; q < 4; q++) rect(88 + q * 4, 7, 2, 1, P.K); // engine slats
    rect(86, 0, 21, 2, P.K); rect(87, 0, 19, 1, P.W); rect(87, 1, 19, 1, P.G3); rect(92, 2, 2, 6, P.K); rect(101, 2, 2, 7, P.K); // wing
    rect(34, 21, 42, 1, P.G1); // sill crease
  } else if (c.name === 'Sports car') {
    rect(2, 14, 7, 1, P.K); rect(3, 15, 5, 1, P.YE); // pop-up lamp edge
    rect(104, 12, 4, 3, P.RD2); rect(104, 15, 4, 1, P.RD);
    for (let q = 0; q < 3; q++) rect(28 + q * 3, 15, 2, 4, P.K); // fender gill
  } else if (c.name === 'Coupe') {
    rect(1, 13, 4, 3, P.W); rect(1, 16, 4, 1, P.YE); // square lamp
    rect(105, 12, 3, 4, P.RD2); rect(105, 16, 3, 1, P.RD);
  } else {
    rect(1, 12, 4, 3, P.W); px(1, 12, P.YE); rect(1, 15, 3, 1, P.YE);
    rect(102, 11, 3, 5, P.RD2); rect(102, 16, 3, 1, P.RD);
    line(41, 1, 50, -8, P.G1); // radio aerial
    rect(90, 5, 5, 1, P.K); // rear wiper
  }
  if (S.chrome) { rect(0, 19, 6, 2, P.G3); rect(0, 19, 6, 1, P.W); rect(X1 - 5, 19, 6, 2, P.G3); rect(X1 - 5, 19, 6, 1, P.W); }
  rect(X1 - 10, 25, 5, 1, P.G1); px(X1 - 10, 25, P.G3); // exhaust
  // wheel arches and wheels: tyre, alloy with spokes, specular glint
  for (const wx of S.wheels) {
    for (let y = 17; y <= 27; y++) for (let x = wx - 10; x <= wx + 10; x++) if ((x - wx) ** 2 + (y - 27) ** 2 <= 90 && y <= 26) px(x, y, P.K);
    disc(wx, 27, 7, P.K); disc(wx, 27, 5, P.G1); disc(wx, 27, 4, P.G3);
    for (let a = 0; a < 5; a++) { const an = a * 1.2566 + 0.3; px(wx + Math.round(Math.cos(an) * 3), 27 + Math.round(Math.sin(an) * 3), P.G1); }
    px(wx - 2, 24, P.W); px(wx - 3, 25, P.W); px(wx - 1, 24, P.W); disc(wx, 27, 1, P.G1); px(wx, 27, P.W);
    rect(wx - 4, 34, 9, 1, P.K);
  }
}
function chX_carSprite(c) { return sprite('chX:car:' + c.name + c.col, 112, 36, () => chX_paintCar(c)); }
function drawCarSide(x, y, c) { g.drawImage(chX_carSprite(c), x | 0, y | 0); }

// ---------- garage bay backdrop for the car-select screen (320 x 46) ----------
function chX_garage(i, lit) {
  return sprite('chX:bay' + i + (lit ? 'L' : ''), W, 50, () => {
    const wall = lit ? P.BL2 : P.BL, mortar = lit ? P.BL : P.K;
    rect(0, 0, W, 38, wall);
    for (let y = 0; y < 38; y += 6) { rect(0, y, W, 1, mortar); for (let x = ((y / 6) & 1) * 8; x < W; x += 16) rect(x, y, 1, 6, mortar); } // cinder blocks
    if (lit) { // spotlight pool behind the car
      for (let y = 1; y < 38; y++) { const hw = 14 + y * 1.4; for (let x = Math.floor(66 - hw); x < 66 + hw; x++) { const k = BAYER[(y & 3) * 4 + (x & 3)]; if (k < 10 - y / 5) px(x, y, P.CY); } }
    } else dither(0, 1, W, 37, wall, P.K, 3);
    rect(36, 0, 60, 2, P.G1); rect(38, 1, 56, 1, lit ? P.W : P.G3); // fluorescent tube
    // tool board with hanging spanners and a tyre on a hook, between car and data plate
    rect(124, 4, 18, 18, P.BR); frame(124, 4, 18, 18, P.K); for (let x = 125; x < 141; x += 2) for (let y = 5; y < 21; y += 2) px(x, y, P.RD);
    for (let q = 0; q < 3; q++) { rect(128 + q * 4, 7, 1, 6 + q * 2, P.G3); rect(127 + q * 4, 6, 3, 2, P.G3); px(128 + q * 4, 7, P.K); }
    rect(135, 16, 5, 3, P.RD2); rect(135, 16, 5, 1, P.W); // oil can
    // polished floor
    rect(0, 38, W, 8, P.G1); rect(0, 38, W, 1, P.K); dither(0, 39, W, 7, P.G1, P.K, lit ? 2 : 6);
    for (let x = 0; x < W; x += 40) rect(x, 39, 1, 7, P.K);
    if (lit) for (let y = 39; y < 46; y++) for (let x = 20; x < 116; x++) if (BAYER[(y & 3) * 4 + (x & 3)] < 7 - Math.abs(x - 66) / 9 - (y - 39)) px(x, y, P.G3);
    textC('BAY', 133, 23, lit ? P.YE : P.G3); textC(String(i + 1), 133, 30, lit ? P.YE : P.G3);
    // hazard-striped steel beam between the bays
    rect(0, 46, W, 1, P.G3); for (let x = 0; x < W; x++) { px(x, 47, (x >> 2) & 1 ? P.YE : P.K); px(x, 48, ((x + 1) >> 2) & 1 ? P.YE : P.K); } rect(0, 49, W, 1, P.G1);
  });
}
function carSelectScene(start) {
  const picks = []; let sel = 0;
  const choose = () => { if (picks.includes(sel)) { picks.splice(picks.indexOf(sel), 1); sfx.blip(); return; } picks.push(sel); sfx.select(); if (picks.length === 2) setTimeout(() => start(picks.map(i => CARS[i])), 300); };
  const labCol = [P.CY, P.RD2, P.PK, P.YE];
  return {
    t: 0, update(dt) { this.t += dt; },
    onKey(k) { if (k === 'up' || k === 'left') { sel = (sel + 3) % 4; sfx.blip(); } else if (k === 'down' || k === 'right') { sel = (sel + 1) % 4; sfx.blip(); } else if (k === 'select' || k === 'fire') choose(); },
    onTap(x, y) { const i = Math.floor(y / 50); if (i >= 0 && i < 4) { sel = i; choose(); } },
    draw() {
      rect(0, 0, W, H, P.K);
      const t = this.t;
      CARS.forEach((c, i) => {
        const y = i * 50, lit = i === sel;
        g.drawImage(chX_garage(i, lit), 0, y);
        drawCarSide(12, y + 4, c);
        if (lit) { // a glint running along the roofline
          const S = chX_SHAPES[c.name] || chX_SHAPES.Countach, gx = Math.floor(t * 40) % 160;
          if (gx < 100) { const ty = Math.round(chX_lerp(S.top, gx + 4) ?? 20); const gy = y + 4 + ty; px(12 + gx + 4, gy, P.W); if ((t * 8 | 0) % 2) { px(12 + gx + 3, gy, P.W); px(12 + gx + 5, gy, P.W); px(12 + gx + 4, gy - 1, P.W); px(12 + gx + 4, gy + 1, P.W); } }
        }
        // data plate
        rect(146, y + 1, 172, 37, P.K); frame(146, y + 1, 172, 37, lit ? P.YE : P.G1); frame(147, y + 2, 170, 35, lit ? P.BR : P.K);
        text(c.name.toUpperCase(), 150, y + 3, lit ? P.W : P.G3);
        if (c.tracking) { textR('(Tracking)', 312, y + 3, P.GR2); }
        text('Max. Speed:', 150, y + 12, labCol[i]); text(c.speed + ' mph', 244, y + 12, P.W);
        text('Handling:', 150, y + 20, labCol[i]); text(c.handling, 244, y + 20, P.W);
        text('Conspicuousity:', 150, y + 28, labCol[i]); text(c.consp, 244, y + 28, P.W);
        if (picks.includes(i)) { const s = 'Car #' + (picks.indexOf(i) + 1), tw = textW(s); rect(10, y + 1, tw + 5, 10, P.K); frame(10, y + 1, tw + 5, 10, P.YE); text(s, 13, y + 2, P.YE); }
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
      rect(0, 0, W, H, P.K);
      drawMap();
      // bezel between the three views
      rect(200, 0, 1, 200, P.G3); rect(319, 0, 1, 200, P.G3); rect(200, 98, 120, 1, P.G3); rect(200, 99, 120, 1, P.G1);
      drawWindshield(201, 0, 118, 98);
      drawCloseUp(201, 100, 118, 100);
      // ---- overlays ----
      if (msgT > 0 && !over) { const ls = wrap(msg, 180); box(6, 4, 188, ls.length * 8 + 6, P.BL2, P.BL); ls.forEach((l, i) => text(l, 10, 7 + i * 8, P.W)); }
      if (prompt > 0 && !over) { // police-light flasher
        const f = (t * 6 | 0) % 2; box(10, 86, 180, 16, f ? P.RD2 : P.BL2, f ? P.RD : P.BL);
        rect(13, 90, 4, 8, f ? P.RD2 : P.K); rect(183, 90, 4, 8, f ? P.K : P.BL2);
        textC(evade ? 'Press F1 to duck into the CIA' : 'Press F1 now to make arrest', 100, 90, f ? P.YE : P.W);
      }
      if (evade && !over) {
        const left = Math.max(0, 60 - evadeT), tx = timerX(); g.save(); g.translate(tx - 4, 0); box(4, 184, 110, 13, P.RD2, P.RD);
        disc(11, 190, 4, P.G3); disc(11, 190, 3, P.W); rect(10, 185, 3, 1, P.G3); const a = -Math.PI / 2 + (evadeT / 60) * Math.PI * 2; line(11, 190, 11 + Math.round(Math.cos(a) * 2.6), 190 + Math.round(Math.sin(a) * 2.6), P.RD); px(11, 190, P.K);
        text('Shake them: ' + Math.ceil(left) + ' sec', 18, 187, P.YE);
        rect(16, 194, Math.round(96 * (1 - left / 60)), 1, P.GR2); g.restore();
      }
      if (over) {
        const [hd, c] = { followed: ['DESTINATION FOUND', P.GR2], arrest: ['ARREST!', P.GR2], lost: ['YOU LOST HIM', P.RD2], late: ['TOO LATE', P.RD2], abort: [evade ? 'YOU STOP THE CAR' : 'CHASE ABANDONED', P.YE], evaded: ['YOU SHOOK THEM', P.GR2], safe: ['SAFE AT THE CIA', P.GR2], caught: ['CUT OFF!', P.RD2] }[over.kind];
        const bar = c === P.GR2 ? P.GR : c === P.RD2 ? P.RD : P.BR;
        rect(14, 62, 176, 70, P.K); // drop shadow
        rect(12, 60, 176, 70, P.K); frame(12, 60, 176, 70, P.G3); frame(13, 61, 174, 68, P.G1);
        rect(14, 62, 172, 14, bar); dither(14, 62, 172, 14, bar, P.K, 3); rect(14, 75, 172, 1, c);
        for (let q = 0; q < 172; q += 8) { px(14 + q, 62, c); }
        // result icon: check mark or cross
        if (c === P.GR2) { line(20, 68, 22, 71, P.W); line(22, 71, 27, 65, P.W); line(20, 69, 22, 72, P.W); line(22, 72, 27, 66, P.W); }
        else if (c === P.RD2) { line(20, 65, 26, 71, P.W); line(26, 65, 20, 71, P.W); line(21, 65, 27, 71, P.W); line(27, 65, 21, 71, P.W); }
        else { rect(22, 65, 2, 5, P.W); rect(22, 71, 2, 2, P.W); }
        textC(hd, 100, 65, P.W, P.K);
        para({ followed: 'He parks and goes inside. You note the address.', arrest: 'You cut him off head-on and drag him out of the car.', lost: 'The car disappears into the city.', late: 'By the time you get there the car is empty.', abort: evade ? 'You jump out and face them on foot.' : 'You give up the chase.', evaded: 'The hit squad loses you in traffic.', safe: 'You screech into the CIA garage. The hit squad drives on.', caught: 'Their car slams into yours. Doors fly open - guns come out.' }[over.kind], 22, 82, 156, P.W, 9);
        if (over.t > 0.6) textC('Press a key', 100, 118, (t * 2 | 0) % 2 ? P.G3 : P.W);
      }
    },
  };
  function timerX() { const [cx, cy] = nodeXY(labels[0].i, labels[0].j); return cx < 124 && cy > 170 ? 86 : 4; }
  // framed message box: black body, outer light rim, inner accent rim
  function box(x, y, w, h, rim, inner) { rect(x, y, w, h, P.K); frame(x, y, w, h, rim); frame(x + 1, y + 1, w - 2, h - 2, inner); px(x, y, P.K); px(x + w - 1, y, P.K); px(x, y + h - 1, P.K); px(x + w - 1, y + h - 1, P.K); }
  let edgeList = null; const degree = new Map();
  function edges() {
    if (!edgeList) { edgeList = [...edge].map(k => k.split(',').map(Number)); for (const [i, j, d] of edgeList) { const a = i + ',' + j, b = d === 0 ? (i + 1) + ',' + j : i + ',' + (j + 1); degree.set(a, (degree.get(a) || 0) + 1); degree.set(b, (degree.get(b) || 0) + 1); } }
    return edgeList;
  }
  // ================= CITY MAP (main play surface) =================
  let mapCv = null;
  function paintMap() {
    const base = night ? P.G1 : P.G3, hi = night ? P.G3 : P.W, lo = night ? P.G1 : P.G1, det = night ? P.K : P.G1;
    rect(0, 0, 200, 200, P.BL); rect(1, 1, 198, 198, base);
    g.save(); g.beginPath(); g.rect(1, 1, 198, 198); g.clip();
    // alleys between merged blocks get a paved texture
    if (!night) dither(1, 1, 198, 198, base, lo, 2);
    for (let j = -1; j < N; j++) for (let i = -1; i < N; i++) {
      const [x0, y0] = nodeXY(i, j), X = x0 + 1, Y = y0 + 1, hsh = chX_h(i + 40, j + 40, 7) % 20;
      if (hsh < 2) { // park: grass with tree dots
        rect(X, Y, 6, 6, night ? P.GR : P.GR); for (let q = 0; q < 6; q++) { const tx = X + chX_h(i, j, q) % 5, ty = Y + chX_h(j, i, q) % 5; px(tx, ty, night ? P.K : P.GR2); }
        if (!night) px(X + 2, Y + 3, P.GR2);
      } else if (hsh === 2) { // plaza
        for (let yy = 0; yy < 6; yy++) for (let xx = 0; xx < 6; xx++) px(X + xx, Y + yy, (xx + yy) & 1 ? base : hi);
        px(X + 2, Y + 2, night ? P.BL : P.BL2); px(X + 3, Y + 3, night ? P.BL : P.BL2); px(X + 3, Y + 2, P.BL); px(X + 2, Y + 3, P.BL);
      } else { // building roof: lit top/left parapet, shaded bottom/right, a rooftop unit
        rect(X, Y, 6, 6, base); rect(X, Y, 6, 1, hi); rect(X, Y, 1, 6, hi); rect(X, Y + 5, 6, 1, lo); rect(X + 5, Y, 1, 6, lo);
        const u = chX_h(i, j, 3); if (u % 3 === 0) { px(X + 2 + (u >>> 3) % 2, Y + 2 + (u >>> 5) % 2, det); } else if (u % 3 === 1) rect(X + 2, Y + 2, 2, 1, det);
      }
    }
    for (const [i, j, d] of edges()) { const [x, y] = nodeXY(i, j); if (d === 0) rect(x - 1, y - 1, SP + 2, 2, P.K); else rect(x - 1, y - 1, 2, SP + 2, P.K); }
    g.restore();
    frame(0, 0, 200, 200, P.BL); frame(1, 1, 198, 198, P.K);
  }
  function drawMap() {
    if (!mapCv) { mapCv = document.createElement('canvas'); mapCv.width = 200; mapCv.height = 200; drawTo(mapCv.getContext('2d'), paintMap); }
    g.drawImage(mapCv, 0, 0);
    // landmark plaques
    for (const l of labels) {
      if (l.dest && (evade || (!over && arrivedT < 0))) continue;
      const [x, y] = nodeXY(l.i, l.j);
      if (l.dest) { rect(x - 1, y - 7, 1, 8, P.W); rect(x, y - 7, 4, 3, P.YE); px(x + 3, y - 5, P.BR); rect(x - 1, y - 1, 2, 2, P.YE); continue; }
      const cia = l.name === 'CIA', tw = textW(l.name), pw = tw + 4, ph = 9;
      if (!l.box) { // place the plaque beside its pin, dodging plaques already placed
        const tries = [[x + 3, y - 4], [x - 3 - pw, y - 4], [x + 3, y + 3], [x - 3 - pw, y + 3], [x + 3, y - 12], [x - 3 - pw, y - 12], [x + 3, y + 11], [x - 3 - pw, y + 11]];
        const placed = labels.filter(o => o.box).map(o => o.box.concat()); if (evade) placed.push([timerX() - 1, 183, 112]);
        let best = null; for (const [tx, ty] of tries) { const bx = clamp(tx, 2, 197 - pw), by = clamp(ty, 2, 188); if (!placed.some(o => bx < o[0] + o[2] + 1 && o[0] < bx + pw + 1 && by < o[1] + ph + 1 && o[1] < by + ph + 1)) { best = [bx, by]; break; } }
        l.box = [...(best || [clamp(x + 3, 2, 197 - pw), clamp(y - 4, 2, 188)]), pw];
      }
      const [bx, by] = l.box;
      const fill = cia ? (evade && (t * 3 | 0) % 2 ? P.GR2 : P.GR) : P.BL;
      rect(bx + 1, by + 1, pw, ph, P.K); rect(bx, by, pw, ph, fill); rect(bx, by, pw, 1, cia ? P.GR2 : P.BL2); rect(bx, by, 1, ph, cia ? P.GR2 : P.BL2);
      text(l.name, bx + 2, by + 1, cia && evade && (t * 3 | 0) % 2 ? P.K : P.W);
      rect(x - 1, y - 1, 2, 2, P.W);
    }
    // car blips
    for (const c of cars) {
      if (c === sus || c.wait) continue; const [x, y, dx] = pos(c); const hor = dx !== 0;
      if (c.kind === 'agent') { rect(x - 1, y - 1, 2, 2, c.col); if (c === me() && (t * 4 | 0) % 2) { px(x - 3, y - 3, P.W); px(x + 2, y - 3, P.W); px(x - 3, y + 2, P.W); px(x + 2, y + 2, P.W); } }
      else if (c.kind === 'hunter') rect(x - 1, y - 1, 2, 2, P.RD2);
      else rect(x - 0.5, y - 0.5, hor ? 2 : 1, hor ? 1 : 2, night ? P.G3 : P.G1);
    }
    const seenNow = mine.some(m => m.seen);
    if (seenNow) { const [x, y] = pos(sus); rect(x - 1, y - 1, 2, 2, P.PK); }
    else if (lastSeen) { const [x, y] = lastSeen; px(x - 1, y - 1, P.MG); px(x + 1, y - 1, P.MG); px(x, y, P.MG); px(x - 1, y + 1, P.MG); px(x + 1, y + 1, P.MG); }
  }
  // ================= WINDSHIELD: first-person street view + dashboard =================
  const F = 46, E = 1, RW = 1.5, XB = 2.4, GAP = 1.8, ZFAR = 60;
  let prevHead = '', prevCar = null, turnT = 0, turnDir = 0, lastT = 0;
  const DAYPAL = [ // side wall, front face, window, trim
    [P.RD, P.RD2, P.K, P.BR], [P.G1, P.G3, P.K, P.G3], [P.G3, P.W, P.BL, P.W], [P.BL, P.BL2, P.CY, P.BL2],
    [P.TL, P.CY, P.BL, P.CY], [P.BR, P.BR, P.K, P.YE], [P.G3, P.W, P.K, P.G1], [P.RD, P.RD2, P.CY, P.RD2]];
  const NIGHTPAL = [[P.BL, P.G1], [P.G1, P.G1], [P.BL, P.BL], [P.K, P.BL], [P.G1, P.G1], [P.BL, P.G1], [P.BL, P.BL], [P.G1, P.BL]];
  function bldg(key, blk, half) {
    const hs = chX_h(key, blk, half);
    return { id: key * 1e5 + blk * 2 + half, hgt: 3 + hs % 7, pal: (hs >>> 4) % 8, style: (hs >>> 8) % 3, shop: (hs >>> 11) % 6, seed: hs };
  }
  const FH = 0.6, BW = 0.62; // storey height and window-bay width in world units
  function wallColumn(col, top, bot, z, b, facing, u, lx) { // draw one screen column of a facade
    const pal = DAYPAL[b.pal], wall = night ? NIGHTPAL[b.pal][facing ? 1 : 0] : pal[facing ? 1 : 0];
    top = Math.round(top); bot = Math.round(bot);
    rect(col, top, 1, bot - top, wall);
    const sc = F / z; // pixels per world unit
    if (sc < 2.2) { if (!night) px(col, top, pal[3]); else if (chX_h(b.seed, col, 0) % 7 === 0) px(col, top + 2 + chX_h(col, 1, b.seed) % Math.max(1, bot - top - 3), P.YE); return; }
    const bay = Math.floor(u / BW), wu = u / BW - bay; // position inside a window bay
    const inBay = b.style === 1 ? wu > 0.08 : b.style === 2 ? (wu > 0.3 && wu < 0.66) : (wu > 0.22 && wu < 0.74);
    const [fa, fb] = b.style === 1 ? [0.3, 0.72] : b.style === 2 ? [0.18, 0.86] : [0.3, 0.78];
    const floors = Math.floor(b.hgt / FH);
    if (inBay) for (let f = 2; f < floors; f++) {
      const y0 = Math.round(hyG + (E - (f + fb) * FH) * sc), y1 = Math.round(hyG + (E - (f + fa) * FH) * sc);
      if (y1 <= top + 1 || y0 >= bot) continue;
      let wc;
      if (night) { const hs = chX_h(b.seed, f, bay); wc = hs % 5 < 2 ? ((hs >>> 5) % 4 ? P.YE : P.W) : P.K; if (wc !== P.K && wu > 0.66 && b.style !== 1) wc = P.BR; }
      else { wc = pal[2]; if (wu < 0.36 && b.style !== 1 && y1 - y0 > 1) wc = pal[2] === P.K ? P.G1 : P.W; }
      const ya = Math.max(top + 2, y0), yb = Math.min(bot, y1); rect(col, ya, 1, yb - ya, wc);
      if (!night && yb - ya > 2) px(col, yb, pal[3]); // sill
    }
    // cornice line under the roof
    if (!night) { rect(col, top, 1, Math.max(1, Math.round(0.12 * sc)), pal[3]); }
    // ground floor: shop window under a striped awning, or a doorway
    const a0 = Math.round(hyG + (E - 1.5 * FH) * sc), a1 = Math.round(hyG + (E - 1.25 * FH) * sc), w0 = Math.round(hyG + (E - 1.15 * FH) * sc), w1 = Math.round(hyG + (E - 0.1) * sc);
    if (b.shop < 3) {
      const awn = [P.RD, P.GR, P.BL][b.shop];
      if (a1 > a0) rect(col, a0, 1, a1 - a0, (((u * 3) | 0) & 1) ? awn : (night ? P.G1 : P.W));
      const m = ((u % 1.5) + 1.5) % 1.5;
      if (w1 > w0) rect(col, w0, 1, w1 - w0, m < 0.08 ? (night ? P.K : P.G1) : night ? (b.shop === 0 ? (m < 0.35 ? P.YE : P.BR) : P.K) : (m < 0.3 ? P.CY : P.BL));
    } else if (lx) {
      const m = ((u % 2.4) + 2.4) % 2.4; if (m < 0.5) { const d0 = Math.round(hyG + (E - 1.2 * FH) * sc); rect(col, d0, 1, bot - d0, m < 0.06 || m > 0.44 ? P.K : P.BR); }
    }
  }
  let hyG = 0; // horizon row of the current frame
  function carRear(col, oncoming) {
    const rows = oncoming ? ['...kkkkkkkkkk...', '..kwwwwwwwwwwk..', '.kcwwwwwwwwwwck.', 'kcccccccccccccck', 'klllcckkkkcclllk', 'kcccccccccccccck', 'kddddddddddddddk', '.kkk........kkk.']
      : ['...kkkkkkkkkk...', '..kwwwwwwwwwwk..', '.kcwwwwwwwwwwck.', 'kcccccccccccccck', 'krrrccccccccrrrk', 'kccccchhhhccccck', 'kddddddddddddddk', '.kkk........kkk.'];
    return chX_spr('rear' + col + (oncoming ? 'f' : 'r') + (night ? 'n' : ''), rows, { k: P.K, w: night ? P.K : P.TL, c: night ? chX_shade(col) : col, d: night ? P.G1 : P.G3, h: night ? P.G1 : P.W, r: P.RD2, l: night ? P.W : P.YE });
  }
  function drawWindshield(x, y, w, h) {
    const c = me(); const [cmx, cmy, dx, dy] = pos(c), CB = 2.5; const mx = cmx - dx * CB, my = cmy - dy * CB; // camera sits in the driver's seat, behind the car's map point
    const dt = Math.max(0, Math.min(0.1, t - lastT)); lastT = t;
    const head = dx + ',' + dy;
    if (prevCar === c && prevHead && head !== prevHead) { const [pdx, pdy] = prevHead.split(',').map(Number); const cr = pdx * dy - pdy * dx; turnDir = cr || 2; turnT = cr ? 0.45 : 0.6; }
    prevHead = head; prevCar = c; turnT = Math.max(0, turnT - dt);
    const tk = turnT / (turnDir === 2 ? 0.6 : 0.45), sway = Math.round((turnDir === 2 ? 120 : 46 * turnDir) * tk * tk);
    const bob = c.v > 2 && ((t * 9) | 0) % 3 === 0 ? 1 : 0;
    const cx = x + (w >> 1) + sway, hy = y + 22 + bob; hyG = hy;
    const q0 = dx ? mx : my, s = dx || dy, perpIdx = Math.round(((dx ? my : mx) - MX) / SP);
    const nodeAt = k => dx ? [k, perpIdx] : [perpIdx, k];
    g.save(); g.beginPath(); g.rect(x, y, w, 56); g.clip();
    // sky with distant skyline
    g.drawImage(skySprite(), x - 70 + ((sway % 70) + 70) % 70 - 35, y + bob - 2);
    // nodes ahead: where does the street end, where are side streets
    let zEnd = 1e9; const nodes = [];
    for (let k = -1; k < 9; k++) {
      const n = [c.b[0] + dx * k, c.b[1] + dy * k], zn = (SP - c.s) + k * SP + CB; nodes.push({ n, zn });
      if (k >= 0 && !has(n[0], n[1], n[0] + dx, n[1] + dy)) { zEnd = zn + GAP; break; }
    }
    const L = [dy, -dx], R = [-dy, dx];
    const sideOpen = (n, sv) => has(n[0], n[1], n[0] + sv[0], n[1] + sv[1]);
    // ---- ground: pavement, road, curbs, centre line, cross streets, zebra crossings ----
    for (let sy = hy + 1; sy < y + 56; sy++) {
      const z = E * F / (sy - hy); if (z > ZFAR) continue;
      const rh = RW * F / z, q = q0 + s * z;
      rect(x, sy, w, 1, night ? P.K : (z < 12 && sy & 1 ? P.G3 : P.G3));
      let lo = cx - rh, hi = cx + rh, cross = null;
      for (const nd of nodes) if (Math.abs(z - nd.zn) < GAP) { cross = nd; if (sideOpen(nd.n, L)) lo = x; if (sideOpen(nd.n, R)) hi = x + w; }
      rect(lo, sy, hi - lo, 1, night ? P.K : P.G1);
      if (night && z < 9) { const lw = rh * 0.9, k = BAYER[(sy & 3) * 4] ; const lv = z < 4 ? 16 : Math.round(16 - (z - 4) * 3); for (let xx = Math.round(cx - lw); xx < cx + lw; xx++) if (BAYER[(sy & 3) * 4 + (xx & 3)] < lv) px(xx, sy, P.G1); }
      if (!cross) { rect(cx - rh - 1, sy, 1, 1, night ? P.G1 : P.W); rect(cx + rh, sy, 1, 1, night ? P.G1 : P.W); }
      const dz = cross ? z - cross.zn : 99;
      if (cross && Math.abs(Math.abs(dz) - 1.35) < 0.3) { // zebra crossing
        const sw = Math.max(1, Math.round(0.35 * F / z)); for (let xx = Math.round(cx - rh); xx < cx + rh; xx += sw * 2) rect(xx, sy, sw, 1, night ? P.G1 : P.W);
      } else if (!cross && ((q / 2.5) & 1)) rect(cx - Math.max(1, 0.12 * F / z) / 2, sy, Math.max(1, Math.round(0.12 * F / z)), 1, P.YE);
    }
    // ---- dead end: the facade across the end of the street ----
    if (zEnd < ZFAR) {
      const b = bldg(9000 + perpIdx * 4 + (dx ? 0 : 2) + (s > 0 ? 1 : 0), Math.round(q0 + s * zEnd), 0), sc = F / zEnd;
      const top = hy + (E - b.hgt) * sc, bot = hy + E * sc;
      for (let col = x; col < x + w; col++) wallColumn(col, top, bot, zEnd, b, true, (col - cx) / sc + 50, true);
    } else rect(cx - 1, hy - 1, 2, 2, night ? P.K : P.G3);
    // ---- facades lining the street, column by column ----
    let prevId = -1;
    for (let col = x; col < x + w; col++) {
      const off = col + 0.5 - cx; if (Math.abs(off) < 0.6) { prevId = -1; continue; }
      const sv = off < 0 ? L : R, z = XB * F / Math.abs(off); if (z >= zEnd || z > ZFAR) { prevId = -1; continue; }
      const q = q0 + s * z, uu = (q - MX) / SP, blk = Math.floor(uu), fu = uu - blk;
      const key = perpIdx * 4 + (dx ? 0 : 2) + (sv[0] + sv[1] > 0 ? 1 : 0);
      let nI = null; if (fu < GAP / SP) nI = blk; else if (fu > 1 - GAP / SP) nI = blk + 1;
      if (nI !== null && sideOpen(nodeAt(nI), sv)) { // gap: side street, we see the front of the next block
        const zn = (MX + nI * SP - q0) * s, zf = zn + GAP; if (zf >= zEnd) { prevId = -1; continue; }
        const b = bldg(key, s > 0 ? nI : nI - 1, s > 0 ? 0 : 1), sc = F / zf;
        wallColumn(col, hy + (E - b.hgt) * sc, hy + E * sc, zf, b, true, Math.abs(off) / sc - XB, false); prevId = -1; continue;
      }
      const b = bldg(key, blk, fu < 0.5 ? 0 : 1), sc = F / z;
      wallColumn(col, hy + (E - b.hgt) * sc, hy + E * sc, z, b, false, q * s, true);
      if (prevId !== -1 && prevId !== b.id) rect(col, hy + (E - b.hgt) * sc, 1, E * sc - (E - b.hgt) * sc, night ? P.K : P.G1);
      prevId = b.id;
    }
    // far haze at the vanishing point
    if (zEnd >= ZFAR) { const hz = Math.max(1, Math.round(XB * F / ZFAR)); rect(cx - hz, hy - 3, hz * 2, 3, night ? P.BL : P.BL2); }
    // ---- street lamps (mid-block, both kerbs), far to near ----
    const lampZ = []; { const first = Math.floor((q0 - MX) / SP) - 1; for (let k = 0; k < 10; k++) { const qL = MX + (first + k * s) * SP + SP / 2; const z = (qL - q0) * s; if (z > 1.6 && z < Math.min(zEnd - GAP, 44)) lampZ.push(z); } }
    lampZ.sort((a, b) => b - a);
    for (const z of lampZ) for (const side of [-1, 1]) {
      const sc = F / z, sx = Math.round(cx + side * 2.0 * sc), bot = Math.round(hy + E * sc), top = Math.round(hy + (E - 3.1) * sc), pw = Math.max(1, Math.round(0.1 * sc));
      rect(sx, top, pw, bot - top, night ? P.G1 : P.K);
      const arm = Math.max(1, Math.round(0.45 * sc)); rect(side < 0 ? sx : sx - arm + pw, top, arm, Math.max(1, pw), night ? P.G1 : P.K);
      const hx = side < 0 ? sx + arm - 1 : sx - arm + pw, hw = Math.max(1, Math.round(0.3 * sc));
      rect(hx - (side < 0 ? 0 : hw - 1), top + pw, hw, Math.max(1, Math.round(hw / 2)), night ? P.YE : P.W);
      if (night && sc > 5) { const gx = hx - (side < 0 ? 0 : hw - 1) + (hw >> 1), gy = top + pw + 1; px(gx - 2, gy, P.YE); px(gx + 2, gy, P.YE); px(gx, gy + 2, P.YE); const py = Math.round(hy + E * sc); for (let q = -3; q <= 3; q += 2) px(gx + q * Math.round(sc / 4), py - 1, P.YE); }
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
      const sc = F / z, cw = Math.max(2, Math.round(1.8 * sc)), ch = Math.max(1, Math.round(cw / 2)), col = o === sus ? P.PK : o.col;
      const sx = Math.round(cx + (on ? -0.75 : 0.75) * sc - cw / 2), sb = Math.round(hy + E * sc);
      if (night && z > 12) { px(sx, sb - 1, on ? P.W : P.RD2); px(sx + cw - 1, sb - 1, on ? P.W : P.RD2); continue; }
      if (cw < 5) { rect(sx, sb - ch, cw, ch, night ? chX_shade(col) : col); px(sx, sb - 1, on ? P.YE : P.RD2); px(sx + cw - 1, sb - 1, on ? P.YE : P.RD2); continue; }
      g.drawImage(carRear(col, on), sx, sb - ch, cw, ch);
      if (o === sus && (t * 4 | 0) % 2) { px(sx + (cw >> 1), sb - ch - 3, P.PK); } // our target
    }
    // ---- our own bonnet, A-pillars, roof lining, mirror ----
    g.drawImage(hoodSprite(c.def.col), x, y + 46);
    g.drawImage(cabinSprite(), x, y);
    mirror(x, y, c, cmx, cmy, dx, dy);
    g.restore();
    // ================= DASHBOARD =================
    g.save(); g.beginPath(); g.rect(x, y + 56, w, 42); g.clip();
    g.drawImage(dashSprite(), x, y + 56);
    // speedometer needle and cruise marker
    const mph = c.v / 0.12, ang = mp => (225 - Math.min(100, mp) * 2.7) * Math.PI / 180, scx = x + 16, scy = y + 73;
    { const a = ang(c.target / 0.12); px(scx + Math.round(Math.cos(a) * 11), scy - Math.round(Math.sin(a) * 11), P.YE); px(scx + Math.round(Math.cos(a) * 10), scy - Math.round(Math.sin(a) * 10), P.YE); }
    { const a = ang(mph); line(scx, scy, scx + Math.round(Math.cos(a) * 9), scy - Math.round(Math.sin(a) * 9), P.RD2); px(scx, scy, P.W); }
    textC(String(Math.round(mph / 5) * 5), scx, y + 77, P.GR2);
    // suspicion lights
    const susLights = Math.min(5, Math.floor(c.susp / 20));
    for (let i = 0; i < 5; i++) { const lx = x + 51 + i * 6, on = i < susLights && !(c.susp > 80 && (t * 6 | 0) % 2); rect(lx, y + 58, 4, 3, on ? P.RD2 : P.RD); if (on) px(lx + 1, y + 58, P.W); else rect(lx, y + 59, 4, 1, P.K); }
    // steering wheel with the driver's hands
    const rot = (turnDir === 2 ? 3 : turnDir) * -1.1 * tk + (c.order ? (c.order[0] * dy - c.order[1] * dx) * 0.18 : 0);
    const wcx = x + 62, wcy = y + 101, wr = 17;
    for (let a = 0; a < 64; a++) { const an = a / 64 * Math.PI * 2, ex = wcx + Math.cos(an) * wr, ey = wcy + Math.sin(an) * wr; if (ey < y + 80) continue; rect(ex - 1, ey - 1, 3, 3, P.K); }
    for (let a = 0; a < 64; a++) { const an = a / 64 * Math.PI * 2, ex = wcx + Math.cos(an) * wr, ey = wcy + Math.sin(an) * wr; if (ey < y + 80) continue; rect(ex, ey, 2, 1, P.G1); }
    for (let a = 0; a < 64; a++) { const an = a / 64 * Math.PI * 2, ex = wcx + Math.cos(an) * wr, ey = wcy + Math.sin(an) * wr; if (ey < y + 80) continue; px(ex, ey - 1, Math.sin(an) < -0.6 ? P.G3 : P.G1); }
    for (const sa of [Math.PI, 0]) { const an = sa + rot; line(wcx + Math.round(Math.cos(an) * 5), wcy + Math.round(Math.sin(an) * 5), wcx + Math.round(Math.cos(an) * (wr - 1)), wcy + Math.round(Math.sin(an) * (wr - 1)), P.G1); }
    disc(wcx, wcy, 6, P.K); disc(wcx, wcy, 5, P.G1); px(wcx - 1, wcy - 4, P.G3); px(wcx, wcy - 4, P.G3);
    for (const side of [-1, 1]) {
      const an = -Math.PI / 2 + side * 0.95 + rot, hx = Math.round(wcx + Math.cos(an) * wr), hy2 = Math.round(wcy + Math.sin(an) * wr);
      const ex = x + 62 + side * 24, ey = y + 99;
      for (let q = -1; q <= 1; q++) line(ex + q, ey, hx + q + side, hy2 + 3, P.BR); line(ex - side * 2, ey, hx + side, hy2 + 4, P.RD);
      rect(hx - 2 + side, hy2 + 2, 4, 2, P.W); // shirt cuff
      g.drawImage(handSprite(side), hx - 3, hy2 - 3);
    }
    // car number, follow / order indicators
    text('#' + c.n, x + 82, y + 58, P.W); if (c.follow && (t * 2 | 0) % 2) text('F', x + 98, y + 58, P.YE);
    if (c.order) text({ '0,-1': '▲', '0,1': '▼', '-1,0': '◀', '1,0': '▶' }[c.order.join(',')], x + 105, y + 57, P.GR2);
    // compass: heading tick plus the tracking arrow
    const ccx = x + 98, ccy = y + 76;
    px(ccx + dx * 6, ccy + dy * 6, P.W); px(ccx + dx * 5, ccy + dy * 5, P.W);
    if (c.def.tracking && !evade) { const [sx, sy] = pos(sus); const a = Math.atan2(sy - my, sx - mx); if ((t * 3 | 0) % 2) { const d4 = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? [Math.sign(Math.cos(a)), 0] : [0, Math.sign(Math.sin(a))]; arrow(ccx, ccy, d4, P.YE); } }
    else if (!c.def.tracking && !evade) text('--', ccx - 4, ccy - 3, P.G1);
    if (evade) { const [hx, hy_] = nodeXY(labels[0].i, labels[0].j); const a = Math.atan2(hy_ - cmy, hx - cmx); const d4 = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? [Math.sign(Math.cos(a)), 0] : [0, Math.sign(Math.sin(a))]; arrow(ccx, ccy, d4, P.GR2); }
    // clock
    const hh = hourOf(game.t || 0); text((hh % 12 || 12) + ':' + String(Math.floor(t / 60 * 5) % 60).padStart(2, '0') + ':' + String(Math.floor(t * 5) % 60).padStart(2, '0'), x + 83, y + 88, P.GR2);
    g.restore();
  }
  function arrow(cx, cy, d, col) { // small 4-way arrow sprite on the compass
    const [ax, ay] = d; for (let k = -4; k <= 4; k++) px(cx + ax * k, cy + ay * k, col);
    for (let k = 1; k <= 3; k++) { px(cx + ax * (4 - k) + ay * k, cy + ay * (4 - k) + ax * k, col); px(cx + ax * (4 - k) - ay * k, cy + ay * (4 - k) - ax * k, col); }
  }
  function mirror(x, y, c, mx, my, dx, dy) {
    const mx0 = x + 50, my0 = y + 2; rect(mx0 + 8, y, 1, 2, P.K);
    rect(mx0, my0, 18, 6, P.K); rect(mx0 + 1, my0 + 1, 16, 4, night ? P.K : P.BL2); rect(mx0 + 1, my0 + 3, 16, 2, night ? P.K : P.G1); rect(mx0 + 7, my0 + 3, 4, 2, night ? P.K : P.G3);
    for (const o of cars) { if (o === c || o.wait || o === sus) continue; const [ox, oy] = pos(o); const d = -((ox - mx) * dx + (oy - my) * dy), perp = (ox - mx) * dy - (oy - my) * dx; if (Math.abs(perp) > 1.5 || d < 1 || d > 24) continue; const sz = d < 8 ? 2 : 1; rect(mx0 + 9 - sz, my0 + 4 - sz, sz * 2, sz, o.kind === 'hunter' ? P.RD2 : night ? P.W : o.col); }
    rect(mx0 + 1, my0 + 1, 3, 1, P.W);
  }
  function skySprite() {
    return sprite('chX:sky' + (night ? 'n' : 'd'), 260, 30, () => {
      if (night) { rect(0, 0, 260, 30, P.K); for (let i = 0; i < 40; i++) px(chX_h(i, 1, 2) % 260, chX_h(i, 3, 4) % 18, i % 5 ? P.G1 : P.W); disc(40, 6, 3, P.W); disc(41, 5, 3, P.K); }
      else { vgrad(0, 0, 260, 26, [P.BL2, P.BL2, P.CY]); for (const [cx, cy, r] of [[30, 6, 4], [38, 5, 5], [46, 7, 3], [150, 9, 3], [157, 8, 4], [220, 5, 4], [228, 6, 3]]) { disc(cx, cy, r, P.W); } rect(26, 9, 26, 2, P.W); rect(146, 11, 16, 1, P.W); for (let x = 20; x < 240; x++) if ((x & 3) === 0) px(x, 11, P.CY); }
      for (let x = 0; x < 260; x++) { const hh = 4 + chX_h(x >> 3, 5, 6) % 7; rect(x, 30 - hh, 1, hh, night ? P.BL : P.G3); if (night && chX_h(x, hh, 1) % 9 === 0) px(x, 30 - hh + 2, P.YE); if (!night && ((x >> 3) & 1)) px(x, 30 - hh, P.W); }
    });
  }
  function hoodSprite(col) {
    return sprite('chX:hood' + col + (night ? 'n' : ''), 118, 10, () => {
      const sh = chX_shade(col), dk = chX_shade(sh);
      for (let xx = 0; xx < 118; xx++) {
        const e = (xx - 59) / 59, top = Math.round(3 + e * e * 7);
        for (let yy = top; yy < 10; yy++) { const k = BAYER[(yy & 3) * 4 + (xx & 3)]; let cc = night ? (k < 5 ? sh : dk) : col; if (yy === top) cc = night ? sh : P.W; else if (!night && yy > 6 && k < 8) cc = sh; if (Math.abs(xx - 59) < 2 && yy > top) cc = night ? P.K : sh; px(xx, yy, cc); }
      }
      if (!night) { for (let xx = 34; xx < 52; xx++) px(xx, 6 + ((xx - 34) >> 3), P.W); for (let xx = 70; xx < 78; xx++) px(xx, 5, P.W); }
      for (const hx of [40, 78]) { rect(hx - 2, 4 + Math.round(((hx - 59) / 59) ** 2 * 7) - 1, 4, 1, P.K); } // washer jets
    });
  }
  function cabinSprite() {
    return sprite('chX:cabin', 118, 56, () => {
      for (let yy = 0; yy < 56; yy++) { const pw = Math.round(10 - yy * 0.13); rect(0, yy, pw, 1, P.K); px(pw, yy, P.G1); rect(118 - pw, yy, pw, 1, P.K); px(117 - pw, yy, P.G1); }
      rect(0, 0, 118, 2, P.K); rect(0, 2, 118, 1, P.G1);
      for (let yy = 50; yy < 56; yy++) { const inset = (56 - yy); rect(0, yy, 12 - inset, 1, P.K); rect(106 + inset, yy, 12 - inset, 1, P.K); }
    });
  }
  function handSprite(side) {
    const rows = ['..sss.', '.sSSSs', 'sSSSSs', 'sSSSSk', '.sSSk.', '..kk..'];
    return chX_spr('hand' + side, side < 0 ? rows : rows.map(r => r.split('').reverse().join('')), { s: P.SK, S: P.SK, k: P.BR });
  }
  function dashSprite() {
    return sprite('chX:dash', 118, 42, () => {
      rect(0, 0, 118, 42, P.K); dither(0, 3, 118, 39, P.K, P.G1, 5);
      rect(0, 0, 118, 2, P.G1); rect(0, 0, 118, 1, P.G3); rect(0, 2, 118, 1, P.K); // dash top roll
      // speedometer bezel, dial face and ticks
      disc(16, 17, 14, P.K); disc(16, 17, 13, P.G3); disc(16, 16, 12, P.W); disc(16, 17, 12, P.G1); disc(16, 17, 11, P.K);
      for (let mph = 0; mph <= 100; mph += 10) { const a = (225 - mph * 2.7) * Math.PI / 180, major = mph % 20 === 0; for (let r = major ? 8 : 9; r <= 10; r++) px(16 + Math.round(Math.cos(a) * r), 17 - Math.round(Math.sin(a) * r), mph >= 80 ? P.RD2 : major ? P.W : P.G3); }
      // speed keys
      for (const [kx, lab] of [[30, '-'], [40, '+']]) { rect(kx, 8, 9, 10, P.K); bevel(kx, 8, 9, 9, P.G3, P.W, P.G1); textC(lab, kx + 5, 9, P.K); }
      // warning-lamp housing
      rect(49, 1, 32, 6, P.K); frame(49, 1, 32, 6, P.G1);
      // compass housing
      disc(97, 20, 10, P.K); disc(97, 20, 9, P.G3); disc(97, 20, 8, P.K); for (const [ax, ay] of [[0, -7], [7, 0], [0, 7], [-7, 0]]) px(97 + ax, 20 + ay, P.G1); px(97, 13, P.RD2);
      // clock LCD
      rect(80, 30, 37, 11, P.K); frame(80, 30, 37, 11, P.G1); rect(81, 40, 35, 1, P.G3);
      // steering column
      rect(56, 36, 12, 6, P.K);
    });
  }
  // ================= CITY CLOSE-UP (top-down) =================
  const Z = 4, BS = (SP - 2) * Z;
  const KINDS = [1, 1, 6, 6, 4, 4, 0, 3, 5, 2, 1, 6];
  function blockSprite(kind, v) {
    return sprite('chX:blk' + kind + v + (night ? 'n' : ''), BS, BS, () => {
      const N_ = { [P.W]: P.G3, [P.G3]: P.G1, [P.G1]: P.K, [P.CY]: P.TL, [P.BL2]: P.BL, [P.GR2]: P.GR, [P.GR]: P.K, [P.RD2]: P.RD, [P.PK]: P.MG, [P.TL]: P.BL };
      const C = col => night ? (N_[col] || col) : col, LIT = night ? P.YE : P.CY;
      const tree = (tx, ty, r) => { disc(tx + 1, ty + 1, r, P.K); disc(tx, ty, r, C(P.GR)); disc(tx - 1, ty - 1, r - 1, C(P.GR2)); px(tx - 1, ty - 2, night ? P.GR : P.W); };
      // sidewalk ring with paving joints
      rect(0, 0, BS, BS, C(P.G3)); for (let q = 0; q < BS; q += 4) { px(q, 0, C(P.W)); px(0, q, C(P.W)); px(q, BS - 1, C(P.G1)); px(BS - 1, q, C(P.G1)); }
      const I = 2, S2 = BS - 4, fl = v & 1; // inner lot
      if (kind === 0) { // park with pond, path and trees
        dither(I, I, S2, S2, C(P.GR), C(P.GR2), night ? 2 : 5);
        for (let q = 0; q < S2; q++) { px(I + q, I + (fl ? S2 - 1 - q : q), C(P.BR)); px(I + q + 1, I + (fl ? S2 - 1 - q : q), C(P.BR)); }
        disc(fl ? 8 : 14, 15, 3, C(P.BL)); px(fl ? 7 : 13, 14, C(P.CY));
        tree(6, 6, 3); tree(16, 5, 2); tree(fl ? 17 : 6, 17, 3);
      } else if (kind === 1) { // office roof: gravel, parapet, AC units, skylights
        dither(I, I, S2, S2, C(P.G3), C(P.G1), 3); rect(I, I, S2, 1, C(P.W)); rect(I, I, 1, S2, C(P.W)); rect(I, I + S2 - 1, S2, 1, C(P.G1)); rect(I + S2 - 1, I, 1, S2, C(P.G1));
        for (let q = 0; q < 3; q++) { rect(5 + q * 5, fl ? 14 : 5, 4, 3, C(P.G1)); rect(5 + q * 5, fl ? 14 : 5, 4, 1, C(P.W)); px(6 + q * 5, fl ? 16 : 7, C(P.K)); }
        for (let q = 0; q < 4; q++) rect(5 + q * 4, fl ? 6 : 13, 3, 4, LIT);
        disc(17, fl ? 7 : 17, 1, C(P.G1));
      } else if (kind === 2) { // tower with helipad
        rect(I, I, S2, S2, C(P.G1)); rect(I + 2, I + 2, S2 - 4, S2 - 4, C(P.G3)); rect(I + 2, I + 2, S2 - 4, 1, C(P.W)); rect(I + 2, I + 2, 1, S2 - 4, C(P.W));
        rect(I + S2 - 2, I + 3, 2, S2 - 3, P.K); rect(I + 3, I + S2 - 2, S2 - 3, 2, P.K); // shadow
        disc(12, 12, 6, C(P.G1)); disc(12, 12, 5, C(P.W)); disc(12, 12, 4, C(P.G1)); rect(10, 10, 1, 5, P.YE); rect(14, 10, 1, 5, P.YE); rect(11, 12, 3, 1, P.YE);
      } else if (kind === 3) { // parking lot
        rect(I, I, S2, S2, C(P.G1)); for (let q = 0; q < 5; q++) { rect(I + 1 + q * 4, I + 1, 1, 7, C(P.W)); rect(I + 1 + q * 4, I + S2 - 8, 1, 7, C(P.W)); }
        const cols = [P.RD, P.BL2, P.W, P.YE, P.GR, P.BR];
        for (let q = 0; q < 4; q++) { if ((v + q) % 3 !== 2) g.drawImage(topCar(cols[(q + v) % 6], 0), I + 2 + q * 4 - 1, I + 1 - 1); if ((v + q) % 4 !== 1) g.drawImage(topCar(cols[(q * 2 + v) % 6], 2), I + 2 + q * 4 - 1, I + S2 - 9 - 1); }
        rect(I + 15, I + 9, 4, 3, C(P.W)); px(I + 16, I + 10, LIT); // booth
      } else if (kind === 4) { // houses with pitched roofs and gardens
        dither(I, I, S2, S2, C(P.GR), C(P.GR2), 4);
        for (const [hx, hy] of [[3, 3], [13, 3], [3, 13], [13, 13]]) {
          rect(hx + 1, hy + 1, 8, 7, P.K); rect(hx, hy, 8, 3, C(P.RD2)); rect(hx, hy + 3, 8, 4, C(P.RD)); rect(hx, hy + 3, 8, 1, C(P.BR));
          for (let q = 0; q < 8; q += 2) { px(hx + q, hy + 1, C(P.RD)); px(hx + q + 1, hy + 5, P.K); }
          rect(hx + ((hx + v) % 5) + 1, hy, 2, 2, C(P.G1));
        }
        tree(11, 11, 2);
      } else if (kind === 5) { // plaza with fountain and benches
        for (let yy = I; yy < I + S2; yy++) for (let xx = I; xx < I + S2; xx++) px(xx, yy, ((xx >> 1) + (yy >> 1)) & 1 ? C(P.W) : C(P.G3));
        disc(12, 12, 6, C(P.G1)); disc(12, 12, 5, C(P.G3)); disc(12, 12, 4, C(P.BL)); disc(12, 12, 1, C(P.W));
        tree(4, 4, 2); tree(19, 4, 2); tree(4, 19, 2); tree(19, 19, 2);
        rect(9, 3, 6, 1, C(P.BR)); rect(9, 20, 6, 1, C(P.BR));
      } else { // brick apartment block round a courtyard
        rect(I, I, S2, S2, C(P.BR)); for (let q = I; q < I + S2; q += 2) rect(I, q, S2, 1, C(P.RD));
        rect(I + 6, I + 6, S2 - 12, S2 - 12, C(P.GR)); tree(12, 12, 2);
        rect(I, I, S2, 1, C(P.RD2)); rect(I, I, 1, S2, C(P.RD2)); rect(I + S2 - 1, I, 1, S2, P.K); rect(I, I + S2 - 1, S2, 1, P.K);
        rect(I + 6, I + 6, S2 - 12, 1, P.K); rect(I + 6, I + 6, 1, S2 - 12, P.K);
        for (let q = 0; q < 3; q++) px(I + 2 + q * 7, I + 2, LIT);
      }
    });
  }
  function topCar(col, dir) { // 5x9 top-down car, dir 0=up 1=right 2=down 3=left
    let rows = ['.lcl.', 'dcccd', 'dwwwd', 'dwwwd', 'dcccd', 'dchcd', 'dbbbd', 'dcccd', '.rcr.'];
    for (let k = 0; k < dir; k++) rows = chX_rot(rows);
    return chX_spr('top' + col + dir + (night ? 'n' : ''), rows, { c: col, d: chX_shade(col), w: night ? P.TL : P.CY, b: P.BL, h: col === P.W ? P.G3 : P.W, l: night ? P.YE : P.W, r: P.RD2 });
  }
  function beamSprite(dir) {
    let rows = ['y.y.y', '.y.y.', 'y.y.y', '.y.y.', '..y..', '.....'];
    for (let k = 0; k < dir; k++) rows = chX_rot(rows);
    return chX_spr('beam' + dir, rows, { y: P.YE });
  }
  function drawCloseUp(x, y, w, h) {
    const c = me(); const [mx, my] = pos(c);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    rect(x, y, w, h, night ? P.G1 : P.G3);
    const ox = Math.round(x + w / 2 - mx * Z), oy = Math.round(y + h / 2 - my * Z);
    const i0 = Math.max(-1, Math.floor(((x - ox) / Z - MX) / SP) - 1), i1 = Math.min(N - 1, Math.ceil(((x + w - ox) / Z - MX) / SP));
    const j0 = Math.max(-1, Math.floor(((y - oy) / Z - MY) / SP) - 1), j1 = Math.min(N - 1, Math.ceil(((y + h - oy) / Z - MY) / SP));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const [bx, by] = nodeXY(i, j); const X = ox + (bx + 1) * Z, Y = oy + (by + 1) * Z;
      const hs = chX_h(i + 50, j + 50, 11), kind = KINDS[hs % KINDS.length];
      g.drawImage(blockSprite(kind, (hs >>> 5) % 2), X, Y);
      if (kind === 2 && (t * 2 | 0) % 2) { px(X + 4, Y + 4, P.RD2); px(X + BS - 5, Y + BS - 5, P.RD2); } // aircraft warning lights
      if (kind === 5) { const a = t * 3 + i; px(X + 12 + Math.round(Math.cos(a) * 3), Y + 12 + Math.round(Math.sin(a) * 3), P.CY); px(X + 12 - Math.round(Math.cos(a) * 3), Y + 12 - Math.round(Math.sin(a) * 3), P.W); }
      // pedestrians strolling round the block
      for (let p = 0; p < 2; p++) {
        const per = (BS - 2) * 4, ph = (chX_h(i, j, p) % per + t * (3 + p) * (p ? -1 : 1)) % per, pp = (ph + per) % per, sd = BS - 2;
        let px_, py_; if (pp < sd) { px_ = pp; py_ = 0; } else if (pp < sd * 2) { px_ = sd; py_ = pp - sd; } else if (pp < sd * 3) { px_ = sd * 3 - pp; py_ = sd; } else { px_ = 0; py_ = per - pp; }
        const hs2 = chX_h(i, j, p + 5), shirt = [P.RD2, P.BL2, P.YE, P.W, P.GR2, P.PK][hs2 % 6];
        px(X + px_, Y + py_, shirt); px(X + px_ + 1, Y + py_, shirt); px(X + px_ + ((t * 4 | 0) & 1), Y + py_ + 1, P.K); px(X + px_, Y + py_ - 1, [P.BR, P.K, P.YE][hs2 % 3]);
      }
    }
    // streets
    const asph = night ? P.K : P.G1;
    for (const [i, j, d] of edges()) {
      const [bx, by] = nodeXY(i, j); const X = ox + (bx - 1) * Z, Y = oy + (by - 1) * Z; const L_ = (SP + 2) * Z;
      if (d === 0 ? (X > x + w || X + L_ < x || Y > y + h || Y + 8 < y) : (X > x + w || X + 8 < x || Y > y + h || Y + L_ < y)) continue;
      const deg0 = degree.get(i + ',' + j) || 0, deg1 = degree.get(d === 0 ? (i + 1) + ',' + j : i + ',' + (j + 1)) || 0;
      if (d === 0) {
        rect(X, Y, L_, 8, asph); for (let q = 12; q < SP * Z - 4; q += 6) rect(X + q, Y + 4, 3, 1, P.YE);
        if (deg0 > 2) for (let q = 1; q < 8; q += 2) rect(X + 9, Y + q, 3, 1, night ? P.G1 : P.W);
        if (deg1 > 2) for (let q = 1; q < 8; q += 2) rect(X + L_ - 12, Y + q, 3, 1, night ? P.G1 : P.W);
      } else {
        rect(X, Y, 8, L_, asph); for (let q = 12; q < SP * Z - 4; q += 6) rect(X + 4, Y + q, 1, 3, P.YE);
        if (deg0 > 2) for (let q = 1; q < 8; q += 2) rect(X + q, Y + 9, 1, 3, night ? P.G1 : P.W);
        if (deg1 > 2) for (let q = 1; q < 8; q += 2) rect(X + q, Y + L_ - 12, 1, 3, night ? P.G1 : P.W);
      }
    }
    // intersections: traffic lights on the corners, lamp pools at night
    for (let j = Math.max(0, j0); j <= j1; j++) for (let i = Math.max(0, i0); i <= i1; i++) {
      const dg = degree.get(i + ',' + j) || 0; if (dg < 3) continue;
      const [bx, by] = nodeXY(i, j); const X = ox + (bx - 1) * Z, Y = oy + (by - 1) * Z;
      const cyc = (t + (i * 7 + j * 3) % 6) % 6, hGreen = cyc < 2.6, hAmber = cyc >= 2.6 && cyc < 3, vGreen = cyc >= 3 && cyc < 5.6, vAmber = cyc >= 5.6;
      const hc = hGreen ? P.GR2 : hAmber ? P.YE : P.RD2, vc = vGreen ? P.GR2 : vAmber ? P.YE : P.RD2;
      rect(X - 3, Y - 3, 2, 2, P.K); px(X - 3, Y - 3, vc); rect(X + 9, Y + 9, 2, 2, P.K); px(X + 10, Y + 10, vc);
      rect(X + 9, Y - 3, 2, 2, P.K); px(X + 10, Y - 3, hc); rect(X - 3, Y + 9, 2, 2, P.K); px(X - 3, Y + 10, hc);
      if (night) { px(X + 1, Y + 1, P.G1); px(X + 6, Y + 6, P.G1); px(X + 6, Y + 1, P.G1); px(X + 1, Y + 6, P.G1); px(X + 3, Y + 4, P.G1); }
    }
    // traffic, top-down, keeping to the right-hand lane
    for (const o of cars) {
      if (o.wait) continue; if (o === sus && !mine.some(m => m.seen)) continue;
      const [px0, py0, dx, dy] = pos(o); const X = Math.round(ox + px0 * Z + (-dy) * 2), Y = Math.round(oy + py0 * Z + dx * 2);
      const dir = dy < 0 ? 0 : dx > 0 ? 1 : dy > 0 ? 2 : 3, hor = dx !== 0, col = o === sus ? P.PK : o.col;
      if (night) g.drawImage(beamSprite(dir), dir === 1 ? X + 5 : dir === 3 ? X - 10 : X - 2, dir === 2 ? Y + 5 : dir === 0 ? Y - 10 : Y - 2);
      g.drawImage(topCar(col, dir), X - (hor ? 4 : 2), Y - (hor ? 2 : 4));
      if (o === c && (t * 4 | 0) % 2) { for (const [ax, ay] of [[-7, -7], [5, -7], [-7, 5], [5, 5]]) { rect(X + ax, Y + ay + (ay < 0 ? 0 : 1), 2, 1, P.W); rect(X + ax + (ax < 0 ? 0 : 1), Y + ay, 1, 2, P.W); } }
    }
    g.restore();
  }
  return scene;
}
