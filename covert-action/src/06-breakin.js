// ===================================================================
// BREAK-IN: the Break-In Display from the manual (p.55)
//   left:  Max side view, Information Bar, Room Window (one room at a time)
//   right: Equipment Display (silhouette) and Building Window (plan)
// ===================================================================
const TS = 8;
const T_OUT = 0, T_FLOOR = 1, T_WALL = 2, T_DOOR = 3;
const ROOM_NAMES = { office: 'Office', file: 'File Room', computer: 'Computer Room', lounge: 'Lounge', bath: 'Bathroom', cipher: 'Cipher Room', hall: 'Hallway', exec: 'Office', street: 'Street' };
const FURN = {
  desk: { w: 2, h: 1, name: 'Desk', open: 1.2 }, chair: { w: 1, h: 1, name: 'Chair' }, file: { w: 1, h: 1, name: 'File cabinet', open: 1.5, hide: true },
  wallsafe: { w: 1, h: 1, name: 'Wall safe', open: 4, kit: true }, floorsafe: { w: 1, h: 1, name: 'Floor safe', open: 5, kit: true, flat: true },
  plant: { w: 1, h: 1, name: 'Plant', bug: true }, typewriter: { w: 1, h: 1, name: 'Typewriter', bug: true }, couch: { w: 2, h: 1, name: 'Couch', bug: true },
  picture: { w: 1, h: 1, name: 'Picture', bug: true, flat: true }, computer: { w: 2, h: 1, name: 'Mainframe computer', bug: true, hide: true },
  terminal: { w: 1, h: 1, name: 'Computer terminal' }, table: { w: 2, h: 2, name: 'Table' }, toilet: { w: 1, h: 1, name: 'Toilet' }, sink: { w: 1, h: 1, name: 'Sink' },
  evidence: { w: 1, h: 1, name: 'Crate', flat: true },
  car: { w: 3, h: 2, name: 'Parked car', hide: true }, bin: { w: 1, h: 1, name: 'Trash can', hide: true }, lamp: { w: 1, h: 1, name: 'Street lamp' },
};
const GREN = { frag: { name: 'Frag', col: P.RD2 }, stun: { name: 'Stun', col: P.W }, gas: { name: 'Gas', col: P.GR2 } };

function genBuilding(level) {
  const cols = 34 + ri(0, 12), rows = 24 + ri(0, 8), M = 1;
  const MW = cols + M * 2, MH = rows + M * 2;
  const T = [], R = [];
  for (let y = 0; y < MH; y++) { T.push(new Array(MW).fill(T_OUT)); R.push(new Array(MW).fill(-1)); }
  const bx = M, by = M, bw = cols, bh = rows;
  for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) T[y][x] = (x === bx || y === by || x === bx + bw - 1 || y === by + bh - 1) ? T_WALL : T_FLOOR;
  const leaves = [];
  (function split(r) {
    const canH = r.w >= 13, canV = r.h >= 11;
    if ((!canH && !canV) || (r.w <= 18 && r.h <= 16 && rnd() < 0.3)) { leaves.push(r); return; }
    const horiz = canH && (!canV || r.w / r.h > 1.1 || (r.w / r.h > 0.8 && rnd() < 0.5));
    if (horiz) { const sx = r.x + ri(5, r.w - 6); for (let y = r.y; y < r.y + r.h; y++) T[y][sx] = T_WALL; split({ x: r.x, y: r.y, w: sx - r.x, h: r.h }); split({ x: sx + 1, y: r.y, w: r.x + r.w - sx - 1, h: r.h }); }
    else { const sy = r.y + ri(4, r.h - 5); for (let x = r.x; x < r.x + r.w; x++) T[sy][x] = T_WALL; split({ x: r.x, y: r.y, w: r.w, h: sy - r.y }); split({ x: r.x, y: sy + 1, w: r.w, h: r.y + r.h - sy - 1 }); }
  })({ x: bx + 1, y: by + 1, w: bw - 2, h: bh - 2 });
  const rooms = leaves.map((l, i) => { for (let y = l.y; y < l.y + l.h; y++) for (let x = l.x; x < l.x + l.w; x++) R[y][x] = i; return Object.assign({ id: i, kind: 'office', seen: false, doors: [] }, l); });
  const cand = {};
  for (let y = by + 1; y < by + bh - 1; y++) for (let x = bx + 1; x < bx + bw - 1; x++) {
    if (T[y][x] !== T_WALL) continue;
    for (const [a, b, o] of [[R[y][x - 1], R[y][x + 1], 'v'], [R[y - 1][x], R[y + 1][x], 'h']]) if (a >= 0 && b >= 0 && a !== b) { const k = Math.min(a, b) + ',' + Math.max(a, b); (cand[k] = cand[k] || []).push({ x, y, o, a, b }); }
  }
  const parent = rooms.map((_, i) => i); const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const doors = [];
  const addDoor = c => { T[c.y][c.x] = T_DOOR; const d = { x: c.x, y: c.y, o: c.o, open: false, a: c.a, b: c.b }; doors.push(d); rooms[c.a].doors.push(d); if (c.b >= 0) rooms[c.b].doors.push(d); return d; };
  for (const k of shuffle(Object.keys(cand))) {
    const list = cand[k].filter(c => { const dx = c.o === 'v' ? 0 : 1, dy = c.o === 'v' ? 1 : 0; return T[c.y - dy][c.x - dx] === T_WALL && T[c.y + dy][c.x + dx] === T_WALL; });
    if (!list.length) continue; const c = list[Math.floor(list.length / 2 + (rnd() - 0.5) * list.length * 0.6)];
    const ra = find(c.a), rb = find(c.b); if (ra !== rb) { parent[ra] = rb; addDoor(c); } else if (rnd() < 0.25) addDoor(c);
  }
  // outside doors, 1 to 4 of them
  const outer = []; const want = ri(1, 4);
  for (const r of shuffle(rooms.slice())) {
    if (outer.length >= want) break;
    const opts = [];
    if (r.y === by + 1) opts.push({ x: r.x + Math.floor(r.w / 2), y: by, o: 'h', side: 'N' });
    if (r.y + r.h === by + bh - 1) opts.push({ x: r.x + Math.floor(r.w / 2), y: by + bh - 1, o: 'h', side: 'S' });
    if (r.x === bx + 1) opts.push({ x: bx, y: r.y + Math.floor(r.h / 2), o: 'v', side: 'W' });
    if (r.x + r.w === bx + bw - 1) opts.push({ x: bx + bw - 1, y: r.y + Math.floor(r.h / 2), o: 'v', side: 'E' });
    if (!opts.length) continue; const c = pick(opts); const d = addDoor({ ...c, a: r.id, b: -1 }); d.outside = true; d.side = c.side; outer.push(d);
  }
  const depth = bfsRooms(rooms, outer[0].a); const order = rooms.slice().sort((a, b) => depth[b.id] - depth[a.id]);
  order[0].kind = 'exec';
  const kinds = shuffle(['file', 'computer', 'lounge', 'bath', 'cipher', 'office', 'office', 'file', 'office', 'computer', 'office']);
  order.slice(1).forEach((r, i) => { r.kind = (r.w <= 4 || r.h <= 3) ? 'hall' : kinds[i % kinds.length]; });
  return { T, R, MW, MH, rooms, doors, outer, exec: order[0], bx, by, bw, bh };
}
// a city street for ambushes: sidewalks, building fronts, the road running off both ends
function genStreet() {
  const MW = 24, MH = 18, T = [], R = [];
  for (let y = 0; y < MH; y++) { T.push(new Array(MW).fill(T_WALL)); R.push(new Array(MW).fill(-1)); }
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) { T[y][x] = T_FLOOR; R[y][x] = 0; }
  for (let y = 5; y < MH - 5; y++) { T[y][0] = T_OUT; T[y][MW - 1] = T_OUT; }
  const room = { id: 0, kind: 'street', x: 1, y: 1, w: MW - 2, h: MH - 2, seen: true, doors: [] };
  return { T, R, MW, MH, rooms: [room], doors: [], outer: [], exec: room, bx: 0, by: 0, bw: MW, bh: MH, street: true };
}
function furnishStreet(B) {
  const F = [], occ = B.T.map(r => r.map(() => -1));
  const put = (type, x, y) => {
    const f = FURN[type]; for (let yy = y; yy < y + f.h; yy++) for (let xx = x; xx < x + f.w; xx++) if (!B.T[yy] || B.T[yy][xx] !== T_FLOOR || occ[yy][xx] >= 0) return null;
    const id = F.length; F.push({ type, x, y, w: f.w, h: f.h, room: 0, opened: false, content: null, col: pick([P.RD, P.BL2, P.BL, P.BR, P.TL, P.MG]) });
    for (let yy = y; yy < y + f.h; yy++) for (let xx = x; xx < x + f.w; xx++) occ[yy][xx] = id; return F[id];
  };
  for (const y of [3, B.MH - 6]) for (let x = ri(2, 4); x < B.MW - 5; x += ri(4, 7)) if (rnd() < 0.75) put('car', x, y);
  for (let i = 0; i < 2; i++) put('car', ri(5, B.MW - 9), ri(6, B.MH - 9));
  for (const y of [1, B.MH - 2]) for (let x = ri(2, 4); x < B.MW - 2; x += ri(4, 6)) put(rnd() < 0.5 ? 'lamp' : 'bin', x, y);
  return { F, occ };
}
function bfsRooms(rooms, start) { const dd = rooms.map(() => 99); dd[start] = 0; const q = [start]; while (q.length) { const r = q.shift(); for (const d of rooms[r].doors) { const o = d.a === r ? d.b : d.a; if (o >= 0 && dd[o] > dd[r] + 1) { dd[o] = dd[r] + 1; q.push(o); } } } return dd; }

function furnish(B, opts) {
  const F = []; const occ = B.T.map(r => r.map(() => -1));
  const nearDoor = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (B.T[y + dy] && B.T[y + dy][x + dx] === T_DOOR) return true; return false; };
  const free = (x, y, w, h, room) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (!B.T[yy] || B.T[yy][xx] !== T_FLOOR || B.R[yy][xx] !== room.id || occ[yy][xx] >= 0 || nearDoor(xx, yy)) return false; return true; };
  function reachable(room) {
    const ds = room.doors; if (!ds.length) return true; const s = ds[0]; const seen = new Set([s.x + ',' + s.y]); const q = [[s.x, s.y]]; let n = 0;
    while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k)) continue; const t = B.T[ny] && B.T[ny][nx]; if ((t === T_FLOOR && B.R[ny][nx] === room.id && (occ[ny][nx] < 0 || FURN[F[occ[ny][nx]].type].flat)) || (t === T_DOOR && ds.some(d => d.x === nx && d.y === ny))) { seen.add(k); q.push([nx, ny]); if (t === T_FLOOR) n++; } } }
    let tot = 0; for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) if (occ[y][x] < 0) tot++;
    return ds.every(d => seen.has(d.x + ',' + d.y)) && n >= tot * 0.8;
  }
  function place(type, room, x, y, extra = {}) {
    const f = FURN[type]; if (!free(x, y, f.w, f.h, room)) return null;
    const it = Object.assign({ type, x, y, w: f.w, h: f.h, room: room.id, opened: false, photographed: false, bugged: false, content: null }, extra); const id = F.length; F.push(it);
    for (let yy = y; yy < y + f.h; yy++) for (let xx = x; xx < x + f.w; xx++) occ[yy][xx] = id;
    if (!reachable(room)) { for (let yy = y; yy < y + f.h; yy++) for (let xx = x; xx < x + f.w; xx++) occ[yy][xx] = -1; F.pop(); return null; }
    return it;
  }
  const wallSpot = (room, type, n) => { let k = 0; for (let t = 0; t < 50 && k < n; t++) { const f = FURN[type], side = ri(0, 3); let x, y; if (side === 0) { x = ri(room.x, room.x + room.w - f.w); y = room.y; } else if (side === 1) { x = ri(room.x, room.x + room.w - f.w); y = room.y + room.h - f.h; } else if (side === 2) { x = room.x; y = ri(room.y, room.y + room.h - f.h); } else { x = room.x + room.w - f.w; y = ri(room.y, room.y + room.h - f.h); } if (place(type, room, x, y)) k++; } return k; };
  const mid = (room, type, n) => { let k = 0; for (let t = 0; t < 50 && k < n; t++) { const f = FURN[type]; const x = ri(room.x + 1, Math.max(room.x + 1, room.x + room.w - f.w - 1)), y = ri(room.y + 1, Math.max(room.y + 1, room.y + room.h - f.h - 1)); if (place(type, room, x, y)) k++; } return k; };
  function deskWithChair(room, occupant) { for (let t = 0; t < 40; t++) { const x = ri(room.x + 1, Math.max(room.x + 1, room.x + room.w - 3)), y = ri(room.y + 1, Math.max(room.y + 1, room.y + room.h - 3)); const d = place('desk', room, x, y); if (d) { const c = place('chair', room, x, y + 1); if (occupant && c) c.seat = true; return d; } } return null; }
  for (const room of B.rooms) {
    const a = room.w * room.h;
    switch (room.kind) {
      case 'exec': deskWithChair(room, true); wallSpot(room, 'file', 2); wallSpot(room, 'plant', 1); wallSpot(room, 'picture', 1); if (rnd() < 0.7) wallSpot(room, 'wallsafe', 1); mid(room, 'floorsafe', 1); wallSpot(room, 'couch', 1); break;
      case 'office': if (rnd() < 0.4) wallSpot(room, 'terminal', 1); for (let i = 0; i < Math.max(1, Math.floor(a / 40)); i++) deskWithChair(room); wallSpot(room, 'file', ri(1, 2)); wallSpot(room, 'typewriter', 1); wallSpot(room, 'plant', 1); wallSpot(room, 'picture', 1); break;
      case 'file': wallSpot(room, 'file', Math.max(3, Math.floor(a / 10))); if (rnd() < 0.4) wallSpot(room, 'wallsafe', 1); break;
      case 'computer': wallSpot(room, 'computer', 2); wallSpot(room, 'terminal', 2); mid(room, 'chair', 1); break;
      case 'cipher': deskWithChair(room); wallSpot(room, 'terminal', 1); wallSpot(room, 'typewriter', 1); wallSpot(room, 'wallsafe', 1); break;
      case 'lounge': mid(room, 'table', 1); wallSpot(room, 'couch', 2); wallSpot(room, 'plant', 2); wallSpot(room, 'picture', 1); break;
      case 'bath': wallSpot(room, 'toilet', 2); wallSpot(room, 'sink', 1); break;
      case 'hall': wallSpot(room, 'plant', 1); break;
    }
  }
  if (!F.some(f => f.type === 'computer')) { for (const r of shuffle(B.rooms.filter(r => r.kind !== 'hall' && r.kind !== 'bath'))) if (wallSpot(r, 'computer', 1)) break; }
  if (!F.some(f => f.type === 'terminal')) { for (const r of shuffle(B.rooms.filter(r => r.kind !== 'bath'))) if (wallSpot(r, 'terminal', 1)) break; }
  const openable = F.filter(f => FURN[f.type].open && !FURN[f.type].kit);
  const nClues = opts.occupant ? 3 + (opts.level < 2 ? 1 : 0) : 1;
  shuffle(openable).slice(0, nClues).forEach(f => f.content = 'clue');
  shuffle(openable.filter(f => !f.content)).slice(0, 2).forEach((f, i) => f.content = ['ammo', 'grenade'][i]);
  F.filter(f => f.type === 'wallsafe').forEach(f => f.content = rnd() < 0.8 ? 'message' : 'clue');
  F.filter(f => f.type === 'floorsafe').forEach(f => f.content = opts.occupant ? pick(['plan', 'personnel', 'plan']) : 'personnel');
  if (opts.occupant && rnd() < 0.5) { const r = pick(B.rooms.filter(r => r.kind !== 'exec' && r.kind !== 'hall')) || B.exec; if (mid(r, 'evidence', 1)) F[F.length - 1].content = 'evidence'; }
  return { F, occ };
}

// ===================================================================
// BREAK-IN ART (biX_): VGA-era top-down rooms on the fine grid.
// One key light from the north-west, a warm fill pool in each room,
// hue-shifted ramps (shadows lean blue-violet, highlights lean warm),
// crisp pixel clusters from a small mask painter (no dither, no speckle).
// Every static picture is cached (art()/sprite()); per frame we only blit
// and draw the few moving bits on the fine grid.
// ===================================================================
const biX_hash = (i, j, s = 0) => { let n = Math.imul(i + 7919 * s, 374761393) + Math.imul(j, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
// hue-shifted shading: k<0 sinks toward a cool violet, k>0 rises toward a warm cream
function biX_sh(c, k) { k = Math.round(k * 100) / 100; return k < 0 ? mix(c, '#140c28', Math.min(1, -k)) : k > 0 ? mix(c, '#fff0c4', Math.min(1, k)) : c; }
// 5-step ramp: [outline, shadow, base, light, highlight]
function biX_ramp(c, s = 1) { return [biX_sh(c, -0.66 * s), biX_sh(c, -0.3 * s), c, biX_sh(c, 0.2 * s), biX_sh(c, 0.42 * s)]; }
// the 16 EGA names the model hands us, as tasteful VGA colours
const biX_TONE = {
  [EGA.black]: '#26262e', [EGA.blue]: '#2e4c8e', [EGA.green]: '#3f6b3c', [EGA.cyan]: '#2d7a82', [EGA.red]: '#9a302c', [EGA.magenta]: '#76386f', [EGA.brown]: '#8a5a30', [EGA.lgray]: '#a9a79d',
  [EGA.dgray]: '#56585f', [EGA.lblue]: '#5878c4', [EGA.lgreen]: '#6ca24a', [EGA.lcyan]: '#6cbcc2', [EGA.lred]: '#d06a58', [EGA.lmagenta]: '#b86aae', [EGA.yellow]: '#d4b044', [EGA.white]: '#d8d4c8',
};
const biX_tone = c => biX_TONE[c] || biX_TONE[String(c).toUpperCase()] || c || '#808080';
// scene palette
const biX_C = {
  ink: '#120e1c', void: '#0c1018', skinL: '#e2a47c', skinD: '#8c5838', metal: '#6a7078', gun: '#34363e', brass: '#c49a48', paper: '#ece6d4',
  glass: '#1c2a3c', glassHi: '#7c9cbc', leaf: '#3f7a3c', pot: '#a4553a', wood: '#7c4c2c', walnut: '#5a3322', steel: '#7c8a86', fab: '#34465e',
};

// ---------- the mask painter ----------
// shapes are rasterised crisply into a mask, then shaded as one cluster: a selective outline,
// a lit rim on the edges that face the light (L = step toward the light), a shade rim on the far edges.
function biX_M(w, h) { return { w: Math.ceil(w), h: Math.ceil(h), a: new Uint8Array(Math.ceil(w) * Math.ceil(h)) }; }
function biX_mRect(m, x, y, w, h) { x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); for (let j = Math.max(0, y); j < Math.min(m.h, y + h); j++) for (let i = Math.max(0, x); i < Math.min(m.w, x + w); i++) m.a[j * m.w + i] = 1; return m; }
function biX_mEll(m, cx, cy, rx, ry) {
  if (rx <= 0 || ry <= 0) return m;
  for (let j = Math.max(0, Math.floor(cy - ry)); j <= Math.min(m.h - 1, Math.ceil(cy + ry)); j++) { const dy = (j + 0.5 - cy) / ry; if (Math.abs(dy) >= 1) continue; const hw = rx * Math.sqrt(1 - dy * dy); for (let i = Math.max(0, Math.round(cx - hw)); i < Math.min(m.w, Math.round(cx + hw)); i++) m.a[j * m.w + i] = 1; }
  return m;
}
function biX_mPoly(m, pts) {
  let y0 = 1e9, y1 = -1e9; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(m.h - 1, Math.ceil(y1)); y++) {
    const cy = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) xs.push(ax + (cy - ay) / (by - ay) * (bx - ax)); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.round(xs[k])); x < Math.min(m.w, Math.round(xs[k + 1])); x++) m.a[y * m.w + x] = 1;
  }
  return m;
}
function biX_mCap(m, ax, ay, bx, by, r) {
  const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r)), x1 = Math.min(m.w - 1, Math.ceil(Math.max(ax, bx) + r)), y0 = Math.max(0, Math.floor(Math.min(ay, by) - r)), y1 = Math.min(m.h - 1, Math.ceil(Math.max(ay, by) + r));
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-6;
  for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) { const px_ = i + 0.5 - ax, py_ = j + 0.5 - ay, t = Math.max(0, Math.min(1, (px_ * dx + py_ * dy) / L2)); if ((px_ - t * dx) ** 2 + (py_ - t * dy) ** 2 < r * r) m.a[j * m.w + i] = 1; }
  return m;
}
function biX_mFn(m, fn) { for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (fn(i + 0.5, j + 0.5)) m.a[j * m.w + i] = 1; return m; }
function biX_mCut(m, cut) { for (let i = 0; i < m.a.length; i++) if (cut.a[i]) m.a[i] = 0; return m; }
// o: L [lx,ly] toward the light, ol false = no outline, fn(i,j,edge) interior colour, rim width
function biX_paint(m, ox, oy, r, o = {}) {
  const { w, h, a } = m, L = o.L || [-1, -1], lx = L[0], ly = L[1], ol = o.ol !== false, rw = o.rim || 1;
  const inn = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[y * w + x] === 1;
  const d0 = ol ? 1 : 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    if (a[j * w + i] !== 1) continue; let c;
    if (ol && (!inn(i - 1, j) || !inn(i + 1, j) || !inn(i, j - 1) || !inn(i, j + 1))) c = !inn(i + lx, j + ly) && o.soft !== false ? r[1] : r[0];
    else {
      let lit = false, dk = false;
      for (let k = 1; k <= rw; k++) { if (!inn(i + lx * (k + d0), j + ly * (k + d0)) || (lx && !inn(i + lx * (k + d0), j)) || (ly && !inn(i, j + ly * (k + d0)))) { lit = true; break; } }
      if (!lit) for (let k = 1; k <= rw; k++) { if (!inn(i - lx * (k + d0), j - ly * (k + d0)) || (lx && !inn(i - lx * (k + d0), j)) || (ly && !inn(i, j - ly * (k + d0)))) { dk = true; break; } }
      c = o.fn ? o.fn(i, j, lit ? 1 : dk ? -1 : 0) : null;
      if (!c) c = lit ? r[3] : dk ? r[1] : r[2];
    }
    g.fillStyle = c; g.fillRect(ox + i, oy + j, 1, 1);
  }
}
// quick shape+paint helpers (fine coordinates, current context)
function biX_pRect(x, y, w, h, r, o) { x = Math.round(x); y = Math.round(y); const m = biX_mRect(biX_M(Math.round(w), Math.round(h)), 0, 0, w, h); biX_paint(m, x, y, r, o); }
function biX_pEll(cx, cy, rx, ry, r, o) { const x = Math.floor(cx - rx) - 1, y = Math.floor(cy - ry) - 1; const m = biX_mEll(biX_M(rx * 2 + 3, ry * 2 + 3), cx - x, cy - y, rx, ry); biX_paint(m, x, y, r, o); }
function biX_pCap(ax, ay, bx, by, rr, r, o) { const x = Math.floor(Math.min(ax, bx) - rr) - 1, y = Math.floor(Math.min(ay, by) - rr) - 1; const m = biX_mCap(biX_M(Math.abs(bx - ax) + rr * 2 + 3, Math.abs(by - ay) + rr * 2 + 3), ax - x, ay - y, bx - x, by - y, rr); biX_paint(m, x, y, r, o); }
function biX_pPoly(pts, r, o) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } x0 = Math.floor(x0) - 1; y0 = Math.floor(y0) - 1; const m = biX_mPoly(biX_M(x1 - x0 + 3, y1 - y0 + 3), pts.map(([x, y]) => [x - x0, y - y0])); biX_paint(m, x0, y0, r, o); }
// plain crisp fills (no shading)
function biX_ell(cx, cy, rx, ry, c) { const m = biX_mEll(biX_M(rx * 2 + 3, ry * 2 + 3), rx + 1, ry + 1, rx, ry); const x = Math.round(cx - rx - 1), y = Math.round(cy - ry - 1); g.fillStyle = c; for (let j = 0; j < m.h; j++) { let i = 0; while (i < m.w) { if (m.a[j * m.w + i]) { let k = i; while (k < m.w && m.a[j * m.w + k]) k++; g.fillRect(x + i, y + j, k - i, 1); i = k; } else i++; } } }
function biX_poly(pts, c) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } x0 = Math.floor(x0); y0 = Math.floor(y0); const m = biX_mPoly(biX_M(x1 - x0 + 2, y1 - y0 + 2), pts.map(([x, y]) => [x - x0, y - y0])); g.fillStyle = c; for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.a[j * m.w + i]) g.fillRect(x0 + i, y0 + j, 1, 1); }
function biX_cap(ax, ay, bx, by, rr, c) { const x = Math.floor(Math.min(ax, bx) - rr) - 1, y = Math.floor(Math.min(ay, by) - rr) - 1; const m = biX_mCap(biX_M(Math.abs(bx - ax) + rr * 2 + 3, Math.abs(by - ay) + rr * 2 + 3), ax - x, ay - y, bx - x, by - y, rr); g.fillStyle = c; for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.a[j * m.w + i]) g.fillRect(x + i, y + j, 1, 1); }
// soft radial light / shadow (smooth gradients are allowed for light)
function biX_glow(cx, cy, r, col, a0, add) { const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, col.replace(')', ',' + a0 + ')').replace('rgb(', 'rgba(')); gr.addColorStop(1, col.replace(')', ',0)').replace('rgb(', 'rgba(')); const op = g.globalCompositeOperation; if (add) g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2); g.globalCompositeOperation = op; }

// ---------- people, top-down: rendered per heading so the light stays in the north-west ----------
// o: { sz, face 0..7, frame 0..4, pose stand|crouch, arms gun|side|up, gun pistol|uzi, uni, head cap|hood|hair, hair, skin, mask, stripes, strap, pants }
const biX_WALK = [0, 0.3, 0, -0.3, 0]; // stride per frame (frame 0 = standing)
function biX_look(o) {
  const skin = o.skin === EGA.brown ? biX_C.skinD : biX_C.skinL;
  const hairC = { [EGA.black]: '#2a2226', [EGA.brown]: '#6a3e24', [EGA.yellow]: '#c8a458', [EGA.lgray]: '#a8a49c', [EGA.dgray]: '#4a4644' }[o.hair] || '#3a2c26';
  const uni = o.uni === 'max' ? '#3a4054' : biX_tone(o.uni);
  return { skin: biX_ramp(skin, 0.8), hair: biX_ramp(hairC), uni: biX_ramp(uni), dark: biX_ramp(biX_sh(uni, -0.35)), pants: biX_ramp(o.pants ? biX_tone(o.pants) : biX_sh(uni, -0.3)), shoe: biX_ramp('#2a2628'), gun: biX_ramp(biX_C.gun), mask: biX_ramp('#6c7478'), lens: biX_ramp('#5aa8b8') };
}
function biX_person(o) {
  const sz = o.sz, D = 2 * Math.ceil(sz * 1.15) + 6, c0 = D / 2;
  const key = 'biX_pp_' + [sz, o.face, o.frame, o.pose, o.arms, o.gun, o.uni, o.head, o.hair, o.skin, o.mask ? 1 : 0, o.stripes ? 1 : 0, o.strap ? 1 : 0, o.pants || ''].join('_');
  return sprite(key, D, D, () => {
    const a = o.face * Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a), C = biX_look(o);
    // local frame: X forward, Y to the right, in units of sz
    const loc = (i, j) => { const dx = i - c0, dy = j - c0; return [(dx * ca + dy * sa) / sz, (-dx * sa + dy * ca) / sz]; };
    const ell = (cx, cy, rx, ry) => (i, j) => { const [X, Y] = loc(i, j); return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 < 1; };
    const cap = (ax, ay, bx, by, r) => (i, j) => { const [X, Y] = loc(i, j), dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-6, t = Math.max(0, Math.min(1, ((X - ax) * dx + (Y - ay) * dy) / L2)); return (X - ax - t * dx) ** 2 + (Y - ay - t * dy) ** 2 < r * r; };
    const any = (...fs) => (i, j) => fs.some(f => f(i, j));
    // dome shading: a per-pixel normal over an ellipse in the local frame, lit from the north-west and above
    const dome = (cx, cy, rx, ry, ramp, fn2) => (i, j, e) => { const f2 = fn2 && fn2(i, j, e); if (f2) return f2; const [X, Y] = loc(i, j), ex = (X - cx) / rx, ey = (Y - cy) / ry, q = Math.min(0.98, ex * ex + ey * ey), wx = ex * ca - ey * sa, wy = ex * sa + ey * ca, nz = Math.sqrt(1 - q), I = (-0.6 * wx - 0.65 * wy) * 0.8 + nz * 0.62; return I > 0.86 ? ramp[4] : I > 0.6 ? ramp[3] : I > 0.18 ? ramp[2] : ramp[1]; };
    const part = (test, ramp, o2) => biX_paint(biX_mFn(biX_M(D, D), test), 0, 0, ramp, o2);
    const st = biX_WALK[o.frame || 0], crouch = o.pose === 'crouch';
    // drop shadow toward the south-east
    const body = any(ell(-0.02, 0, 0.24, 0.5), ell(0.04, 0, 0.23, 0.23));
    g.fillStyle = 'rgba(14,8,30,0.34)'; const sx = Math.max(1, Math.round(sz * 0.1)), sy = Math.max(2, Math.round(sz * 0.14));
    for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) if (body(i - sx, j - sy)) g.fillRect(i, j, 1, 1);
    // legs and shoes
    if (crouch) {
      for (const s of [-1, 1]) { part(cap(0, s * 0.16, 0.36, s * 0.17, 0.12), C.pants); part(ell(0.46, s * 0.17, 0.1, 0.085), C.shoe); }
    } else {
      for (const s of [-1, 1]) { const f = (s < 0 ? st : -st) + 0.14; if (Math.abs(f - 0.14) > 0.05) part(cap(0, s * 0.16, f, s * 0.16, 0.1), C.pants); part(ell(f + 0.1, s * 0.16, 0.13, 0.085), C.shoe); }
    }
    // torso (shoulders)
    const stripeFn = o.stripes ? (i, j, e) => { if (e) return null; const [X] = loc(i, j); return Math.floor((X + 1) * sz / 3) % 2 ? C.dark[2] : null; } : null;
    part(ell(-0.02, 0, 0.22, 0.47), C.uni, { fn: dome(-0.06, 0, 0.3, 0.52, C.uni, stripeFn) });
    if (o.strap) part(cap(0.14, -0.3, -0.16, 0.34, 0.055), biX_ramp('#4a3a30'), { ol: false });
    // arms and hands
    const armR = 0.09;
    if (o.arms === 'gun') {
      const uzi = o.gun === 'uzi';
      part(cap(0.02, 0.38, 0.42, 0.07, armR), C.uni); part(cap(0.02, -0.38, 0.38, -0.03, armR), C.uni);
      part(any(cap(0.42, 0.02, uzi ? 0.86 : 0.76, 0.02, uzi ? 0.06 : 0.045), uzi ? cap(0.56, 0.02, 0.56, 0.16, 0.05) : () => false), C.gun);
      part(any(ell(0.45, 0.07, 0.085, 0.085), ell(0.41, -0.04, 0.08, 0.08)), C.skin);
    } else if (o.arms === 'up') {
      for (const s of [-1, 1]) { part(cap(-0.02, s * 0.42, 0.1, s * 0.4, armR), C.uni); part(ell(0.14, s * 0.38, 0.09, 0.09), C.skin); }
    } else {
      for (const s of [-1, 1]) { const sw = crouch ? 0.2 : (s < 0 ? -st : st) * 0.7; part(cap(0.02, s * 0.39, sw + 0.06, s * 0.42, armR), C.uni); part(ell(sw + 0.13, s * 0.42, 0.075, 0.075), C.skin); }
    }
    // head: a lit dome, with the face showing at the front
    const hx = 0.04, HR = 0.215, face = (i, j) => { const [X, Y] = loc(i, j); return X > hx + 0.1 && Math.abs(Y) < 0.13 ? (X > hx + 0.165 ? C.skin[1] : C.skin[3]) : null; };
    if (o.head === 'cap') {
      const CAP = biX_ramp(biX_sh(C.uni[2], -0.22));
      part(ell(hx + 0.2, 0, 0.12, 0.17), biX_ramp(biX_sh(C.uni[2], -0.5)));                                   // visor
      part(ell(hx, 0, HR, HR), CAP, { fn: dome(hx, 0, HR, HR, CAP, (i, j) => { const [X, Y] = loc(i, j); return Math.abs(Y) < 0.03 && X < hx + 0.12 && X > hx - 0.16 ? CAP[1] : null; }) });
    } else if (o.head === 'hood') {
      const HD = biX_ramp('#22222c'); part(ell(hx, 0, HR, HR), HD, { fn: dome(hx, 0, HR, HR, HD, face) });
    } else {
      part(ell(hx, 0, HR, HR), C.hair, { fn: dome(hx, 0, HR, HR, C.hair, face) });
    }
    if (o.mask) { part(ell(hx + 0.2, 0, 0.09, 0.11), C.mask); for (const s of [-1, 1]) part(ell(hx + 0.14, s * 0.11, 0.05, 0.05), C.lens, { ol: false }); }
  });
}
// knocked out: flat on the back, arms flung wide
function biX_body(o) {
  const sz = o.sz, D = 2 * Math.ceil(sz * 1.25) + 6, c0 = D / 2;
  const key = 'biX_pb_' + [sz, o.face, o.uni, o.head, o.hair, o.skin, o.stripes ? 1 : 0, o.pants || ''].join('_');
  return sprite(key, D, D, () => {
    const a = o.face * Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a), C = biX_look(o);
    const loc = (i, j) => { const dx = i - c0, dy = j - c0; return [(dx * ca + dy * sa) / sz, (-dx * sa + dy * ca) / sz]; };
    const ell = (cx, cy, rx, ry) => (i, j) => { const [X, Y] = loc(i, j); return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 < 1; };
    const cap = (ax, ay, bx, by, r) => (i, j) => { const [X, Y] = loc(i, j), dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-6, t = Math.max(0, Math.min(1, ((X - ax) * dx + (Y - ay) * dy) / L2)); return (X - ax - t * dx) ** 2 + (Y - ay - t * dy) ** 2 < r * r; };
    const part = (test, ramp, o2) => biX_paint(biX_mFn(biX_M(D, D), test), 0, 0, ramp, o2);
    const all = (i, j) => ell(0.05, 0, 0.36, 0.26)(i, j) || ell(0.5, 0, 0.18, 0.18)(i, j) || cap(-0.3, 0, -0.9, 0, 0.2)(i, j);
    g.fillStyle = 'rgba(14,8,30,0.28)'; for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) if (all(i - 1, j - 2)) g.fillRect(i, j, 1, 1);
    for (const s of [-1, 1]) { part(cap(-0.25, s * 0.1, -0.78, s * 0.2, 0.1), C.pants); part(ell(-0.86, s * 0.22, 0.09, 0.07), C.shoe); }
    for (const s of [-1, 1]) { part(cap(0.22, s * 0.24, 0.3, s * 0.62, 0.085), C.uni); part(ell(0.33, s * 0.68, 0.075, 0.075), C.skin); }
    const stripeFn = o.stripes ? (i, j, e) => { if (e) return null; const [, Y] = loc(i, j); return Math.floor((Y + 1) * sz / 3) % 2 ? C.dark[2] : null; } : null;
    part(ell(0.02, 0, 0.34, 0.25), C.uni, { fn: stripeFn });
    // the face, turned up to the ceiling
    const hr = o.head === 'hood' ? biX_ramp('#262834') : o.head === 'cap' ? biX_ramp('#3a3438') : C.hair;
    if (o.head === 'cap') part(ell(0.7, 0.08, 0.1, 0.16), biX_ramp(biX_sh(C.uni[2], -0.22)));
    part(ell(0.52, 0, 0.17, 0.17), C.skin, { fn: (i, j, e) => { const [X, Y] = loc(i, j); if (X > 0.6) return hr[2]; if (Math.abs(Y) > 0.055 && Math.abs(Y) < 0.09 && Math.abs(X - 0.52) < 0.02) return biX_C.ink; return null; } });
  });
}

// ---------- furniture: drawn in its own frame (back to the north wall), lit from L ----------
// how tall things are, for the shadows they throw onto the floor (in tiles)
const biX_TALL = { desk: 0.2, chair: 0.12, file: 0.34, wallsafe: 0.1, floorsafe: 0, plant: 0.24, typewriter: 0.16, couch: 0.18, picture: 0, computer: 0.36, terminal: 0.2, table: 0.16, toilet: 0.14, sink: 0.12, evidence: 0.16, car: 0.26, bin: 0.2, lamp: 0.1 };
function biX_furn(type, F, st, L) {
  const f = FURN[type], w = f.w * F, h = f.h * F;
  return sprite('biX_f_' + type + '_' + F + '_' + st + '_' + L.join(','), w, h, () => biX_furnDraw(type, w, h, F, st, L));
}
function biX_furnDraw(type, w, h, F, st, L) {
  const R = Math.round, opened = st.indexOf('o') >= 0, u = F / 16;
  const O = o => Object.assign({ L }, o || {});
  const box = (x, y, ww, hh, r, o) => biX_pRect(x, y, ww, hh, r, O(o));
  const ell = (cx, cy, rx, ry, r, o) => biX_pEll(cx, cy, rx, ry, r, O(o));
  const cap = (ax, ay, bx, by, rr, r, o) => biX_pCap(ax, ay, bx, by, rr, r, O(o));
  const poly = (pts, r, o) => biX_pPoly(pts, r, O(o));
  const grain = (x0, y0, ww, hh, r, seed) => (i, j, e) => { if (e) return null; const row = Math.floor((j - y0) / Math.max(3, R(3 * u))); const hsh = biX_hash(row, seed, 21); if ((j - y0) % Math.max(3, R(3 * u)) === 0 && biX_hash(Math.floor((i - x0) / Math.max(4, R(9 * u))), row, seed) < 0.5) return r[1]; return hsh < 0.3 ? biX_sh(r[2], -0.06) : null; };
  const WOOD = biX_ramp(biX_C.wood), WAL = biX_ramp(biX_C.walnut), STEEL = biX_ramp(biX_C.steel), PORC = biX_ramp('#e4e6e0', 0.6), BRASS = biX_ramp(biX_C.brass), PAPER = biX_ramp(biX_C.paper, 0.5), BLACK = biX_ramp('#2c2a30');
  const lines = (x, y, ww, hh, n, c) => { const sp = Math.max(2, R(hh / (n + 1))); for (let k = 1; k <= n; k++) if (y + k * sp < y + hh - 1) rect(R(x + 1), R(y + k * sp), Math.max(1, R(ww * (0.55 + 0.35 * biX_hash(k, R(x), 5)) - 2)), 1, c); };
  switch (type) {
    case 'desk': {
      const x0 = R(1.5 * u), y0 = R(2 * u), ww = w - 2 * x0, hh = h - y0 - R(2.5 * u);
      if (opened) { const dx = R(w * 0.38), dw = R(w * 0.26); box(dx, h - R(6 * u), dw, R(6 * u), WAL); rect(dx + 2, h - R(5 * u), dw - 4, R(4 * u) - 1, '#2a1a14'); rect(dx + 3, h - R(5 * u), dw - 8, R(3 * u), biX_C.paper); rect(dx + 3 + R(dw * 0.4), h - R(5 * u) + 1, R(dw * 0.3), R(2 * u), '#d8b868'); }
      const exec = st.indexOf('x') >= 0, TOP = exec ? biX_ramp('#9a6236') : biX_ramp('#7a8480', 0.8);
      box(x0, y0, ww, hh, TOP, { rim: Math.max(1, R(u)), fn: exec ? grain(x0, y0, ww, hh, TOP, 3) : (i, j, e) => !e && (j === y0 + R(2 * u) || j === y0 + hh - R(2 * u) - 1) && i > x0 + 1 && i < x0 + ww - 2 ? TOP[1] : null });
      // leather blotter, a letter on it
      const bx = R(w * 0.3), bw = R(w * 0.36), by = y0 + R(hh * 0.16), bh = R(hh * 0.68); box(bx, by, bw, bh, biX_ramp('#6a2e26'), { ol: false });
      rect(bx, by, bw, 1, '#2a2020'); rect(bx, by + bh - 1, bw, 1, '#2a2020');
      const pw = R(bw * 0.42), pX = bx + R(bw * 0.2), pY = by + R(bh * 0.1), pH = R(bh * 0.84); rect(pX + 1, pY + 1, pw, pH, 'rgba(10,6,20,0.35)'); rect(pX, pY, pw, pH, biX_C.paper); rect(pX, pY, pw, 1, '#fffaf0'); lines(pX + 1, pY, pw - 2, pH, Math.max(2, R(pH / 3)), '#a8a498');
      // banker's lamp: brass foot, green glass shade, warm light pooling on the top
      const lx = x0 + ww - R(5.5 * u), ly = y0 + R(hh * 0.34);
      biX_glow(lx, ly + R(3 * u), R(10 * u), 'rgb(255,214,140)', 0.28, true);
      ell(lx, ly + R(2.5 * u), 1.8 * u, 1.8 * u, BRASS);
      cap(lx - 2.6 * u, ly, lx + 2.6 * u, ly, Math.max(1.2, 1.7 * u), biX_ramp('#2e7a52'));
      // telephone and a coffee mug
      const tx = x0 + R(2.5 * u), ty = y0 + R(hh * 0.2); box(tx, ty, R(6 * u), R(5.5 * u), BLACK); cap(tx + R(0.8 * u), ty + R(1.4 * u), tx + R(5.2 * u), ty + R(1.4 * u), Math.max(0.8, 1.1 * u), biX_ramp('#44424a'), { ol: false }); biX_ell(tx + R(3 * u), ty + R(3.8 * u), Math.max(1, R(u)), Math.max(1, R(u)), '#8a8890');
      const mx = x0 + R(4.5 * u), my = y0 + R(hh * 0.74); ell(mx, my, 2 * u, 2 * u, PORC); biX_ell(mx, my, Math.max(1, R(1.1 * u)), Math.max(1, R(1.1 * u)), '#4a2a1a');
      break;
    }
    case 'chair': {
      const exec = st.indexOf('x') >= 0, fab = biX_ramp(exec ? '#3a2428' : biX_C.fab), cx = w / 2, cy = h * 0.46;
      for (const [dx, dy] of [[-5.5, -3.5], [5.5, -3.5], [0, -6]]) biX_ell(cx + dx * u, cy + dy * u, Math.max(1, R(1.1 * u)), Math.max(1, R(1.1 * u)), '#1c1a22');
      for (const s of [-1, 1]) cap(cx + s * 5.6 * u, cy - 2.5 * u, cx + s * 5.6 * u, cy + 2 * u, Math.max(1, 1.2 * u), BLACK);
      ell(cx, cy, 5 * u, 4.6 * u, fab, { fn: exec && u > 1 ? (i, j, e) => !e && (i + j) % R(3 * u) === 0 && (i - j) % R(3 * u) === 0 ? fab[1] : null : null });
      cap(cx - 4.4 * u, h * 0.83, cx + 4.4 * u, h * 0.83, Math.max(1.4, 2 * u), exec ? biX_ramp('#2e1c20') : biX_ramp(biX_sh(biX_C.fab, -0.2)));
      break;
    }
    case 'file': {
      const x0 = R(1.5 * u), fw = w - 2 * x0, fh = h - R(1.5 * u), face = R(4 * u);
      box(x0, 0, fw, fh, STEEL);
      box(x0 + 1, fh - face, fw - 2, face, biX_ramp(biX_sh(biX_C.steel, -0.18)), { ol: false });
      rect(x0 + R(fw * 0.35), fh - R(face * 0.55), R(fw * 0.3), Math.max(1, R(u)), '#d8dcd4');
      if (opened) {
        const ix = x0 + R(2 * u), iy = R(2 * u), iw = fw - R(4 * u), ih = fh - face - R(3 * u); rect(ix, iy, iw, ih, '#26242a');
        const step = Math.max(2, R(2 * u)); for (let x = ix + 1, n = 0; x < ix + iw - 1; x += step, n++) { rect(x, iy + 1 + (n % 3 === 1 ? 1 : 0), Math.max(1, step - 1), ih - 2, n % 5 === 2 ? '#c8d0dc' : '#d6b86a'); rect(x, iy + 1 + (n % 3 === 1 ? 1 : 0), Math.max(1, step - 1), 1, n % 4 === 1 ? '#c0443a' : n % 4 === 3 ? '#3a64a8' : '#f0dca0'); }
      } else rect(x0 + R(2 * u), R(fh * 0.42), fw - R(4 * u), 1, STEEL[1]);
      break;
    }
    case 'wallsafe': {
      const x0 = R(2.5 * u), sw = w - 2 * x0, sh = R(h * 0.62), GUN = biX_ramp('#4a5058');
      box(x0, 0, sw, sh, GUN);
      if (opened) {
        rect(x0 + R(1.5 * u), R(u), sw - R(3 * u), sh - R(2.5 * u), '#141218');
        rect(x0 + R(2.5 * u), sh - R(5 * u), R(sw * 0.35), R(3 * u), '#4c7a4a'); rect(x0 + R(2.5 * u), sh - R(5 * u), R(sw * 0.35), 1, '#7aa870');
        rect(x0 + R(sw * 0.55), sh - R(6 * u), R(sw * 0.28), R(4 * u), biX_C.paper);
        box(x0 + sw - R(1.5 * u), sh - R(u), R(2.5 * u), R(h * 0.36), GUN);
      } else {
        const cx = x0 + sw / 2, cy = sh * 0.5; ell(cx, cy, 3.4 * u, 3.4 * u, biX_ramp('#b8bcc0', 0.7)); biX_ell(cx, cy, Math.max(1, R(1.2 * u)), Math.max(1, R(1.2 * u)), '#3a3c44'); rect(R(cx), R(cy - 3.4 * u), 1, R(1.4 * u), '#c83c30');
        cap(x0 + sw - R(3 * u), cy - 3 * u, x0 + sw - R(3 * u), cy + 3 * u, Math.max(0.8, 0.9 * u), biX_ramp('#c8ccd0', 0.6));
      }
      break;
    }
    case 'floorsafe': {
      const m = R(1.5 * u), GUN = biX_ramp('#555a60');
      if (opened) {
        box(m, m, w - 2 * m, h - 2 * m, GUN); rect(m + R(2.5 * u), m + R(2.5 * u), w - 2 * m - R(5 * u), h - 2 * m - R(5 * u), '#0e0c12');
        rect(m + R(3.5 * u), h - m - R(5 * u), R(w * 0.3), R(2 * u), biX_C.paper);
        box(w - m - R(3 * u), m - R(u), R(4 * u), h - 2 * m + R(u), biX_ramp('#6a7076'));
      } else {
        box(m, m, w - 2 * m, h - 2 * m, GUN, { rim: Math.max(1, R(u)) });
        for (const [x, y] of [[m + 2.5 * u, m + 2.5 * u], [w - m - 3.5 * u, m + 2.5 * u], [m + 2.5 * u, h - m - 3.5 * u], [w - m - 3.5 * u, h - m - 3.5 * u]]) { rect(R(x), R(y), Math.max(1, R(u)), Math.max(1, R(u)), GUN[4]); rect(R(x) + Math.max(1, R(u)), R(y) + Math.max(1, R(u)), 1, 1, GUN[0]); }
        ell(w / 2, h / 2, 3 * u, 3 * u, BRASS); biX_ell(w / 2, h / 2, Math.max(1, R(u)), Math.max(1, R(u)), '#4a3a1c');
      }
      break;
    }
    case 'plant': {
      const cx = w / 2, cy = h / 2;
      ell(cx, cy, 5.4 * u, 5.4 * u, biX_ramp(biX_C.pot)); biX_ell(cx, cy, 4.2 * u, 4.2 * u, '#3a2820');
      const n = 9, LEAF = biX_ramp(biX_C.leaf), LEAF2 = biX_ramp('#4f8a3a');
      for (let k = 0; k < n; k++) {
        const an = k / n * Math.PI * 2 + 0.35 + biX_hash(k, F, 2) * 0.3, len = (5.4 + 2.2 * biX_hash(k, 1, 3)) * u, wd = 1.9 * u;
        const ex = cx + Math.cos(an) * len, ey = cy + Math.sin(an) * len, mx = cx + Math.cos(an) * len * 0.55, my = cy + Math.sin(an) * len * 0.55, nx = -Math.sin(an) * wd, ny = Math.cos(an) * wd;
        poly([[cx + Math.cos(an) * 1.2 * u, cy + Math.sin(an) * 1.2 * u], [mx + nx, my + ny], [ex, ey], [mx - nx, my - ny]], k % 2 ? LEAF : LEAF2);
      }
      ell(cx, cy, 1.6 * u, 1.6 * u, LEAF2);
      break;
    }
    case 'typewriter': {
      box(R(u), R(2 * u), w - R(2 * u), h - R(3.5 * u), WOOD, { fn: grain(0, 0, w, h, WOOD, 7) });
      const bx = R(3 * u), bw = w - R(6 * u), by = R(5.5 * u), bh = h - R(8.5 * u);
      rect(R(5 * u), R(1 * u), w - R(10 * u), R(6 * u), biX_C.paper); lines(R(5 * u), R(u), w - R(10 * u), R(6 * u), 2, '#9a968c');
      box(bx, by, bw, bh, biX_ramp('#3a3e3a'));
      cap(bx - R(u), by + R(u), bx + bw + R(u), by + R(u), Math.max(1, 1.4 * u), BLACK);
      const kr = Math.max(2, R(2 * u)); for (let y = by + R(4 * u); y < by + bh - 2; y += kr) for (let x = bx + R(2 * u) + ((y / kr) % 2 ? 1 : 0); x < bx + bw - R(2 * u); x += kr) rect(x, y, Math.max(1, kr - 1), Math.max(1, kr - 1), '#b8b4a8');
      break;
    }
    case 'couch': {
      const lth = st.indexOf('x') >= 0, base = lth ? '#6a3a24' : '#a04a36', FAB = biX_ramp(base), DK = biX_ramp(biX_sh(base, -0.18)), back = R(5 * u), arm = R(3.6 * u);
      box(0, R(u), w, h - R(2 * u), DK);
      box(R(u), R(u), w - R(2 * u), back, FAB, { fn: lth ? (i, j, e) => !e && (i % R(4 * u) === 0) && j === R(u + back / 2) ? FAB[0] : null : null });
      box(0, R(2 * u), arm, h - R(3 * u), FAB); box(w - arm, R(2 * u), arm, h - R(3 * u), FAB);
      const n = 2, cw = (w - 2 * arm) / n; for (let k = 0; k < n; k++) box(R(arm + k * cw), back, R(cw), h - back - R(2 * u), FAB, { rim: Math.max(1, R(u)) });
      if (!lth) { const px0 = R(arm + 2 * u), py0 = back + R(u); poly([[px0, py0 + 2.5 * u], [px0 + 2.5 * u, py0], [px0 + 5 * u, py0 + 2.5 * u], [px0 + 2.5 * u, py0 + 5 * u]], biX_ramp('#d8b448')); }
      break;
    }
    case 'picture': {
      const x0 = R(2 * u), fw = w - 2 * x0, fh = R(5 * u);
      box(x0, 0, fw, fh, BRASS);
      const ix = x0 + Math.max(1, R(u)) + 1, iw = fw - 2 * (Math.max(1, R(u)) + 1), ih = fh - Math.max(1, R(u)) * 2 - 1;
      if (ih > 0) { rect(ix, 1, iw, ih, '#5a84b4'); rect(ix, 1 + R(ih / 2), iw, ih - R(ih / 2), '#4e7a3c'); rect(ix + R(iw * 0.6), 1, Math.max(1, R(u)), Math.max(1, R(u)), '#f0d890'); }
      break;
    }
    case 'computer': {
      const CAB = biX_ramp('#aeb0a8'), Lm = biX_mfLayout(w, h);
      box(R(u), 0, w - R(2 * u), h - R(u), CAB);
      box(R(2 * u), h - R(5 * u), w - R(4 * u), R(3.5 * u), biX_ramp('#8a8c86'), { ol: false });
      for (let x = R(4 * u); x < w - R(4 * u); x += Math.max(2, R(2 * u))) rect(x, h - R(4 * u), 1, R(2 * u), '#5a5c58');
      for (const r of Lm.reels) { rect(r.x - r.r - 1, r.y - r.r - 1, r.r * 2 + 3, r.r * 2 + 3, '#1a1e28'); ell(r.x + 0.5, r.y + 0.5, r.r, r.r, biX_ramp('#3a3e48'), { ol: false }); biX_ell(r.x + 0.5, r.y + 0.5, Math.max(1, R(r.r * 0.35)), Math.max(1, R(r.r * 0.35)), '#9aa0a8'); }
      rect(Lm.px - 1, Lm.py - 1, Lm.pw + 2, Lm.ph + 2, '#3a3c38'); rect(Lm.px, Lm.py, Lm.pw, Lm.ph, '#141418');
      break;
    }
    case 'terminal': {
      box(R(u), R(2 * u), w - R(2 * u), h - R(3.5 * u), WOOD, { fn: grain(0, 0, w, h, WOOD, 9) });
      const T = biX_termLayout(F); box(T.x - R(1.5 * u), T.y - R(1.5 * u), T.w + R(3 * u), T.h + R(3 * u), biX_ramp('#c4bca4', 0.7));
      rect(T.x, T.y, T.w, T.h, '#0c1a12');
      box(R(3 * u), T.y + T.h + R(3 * u), w - R(6 * u), R(3.5 * u), biX_ramp('#bcb49c', 0.7));
      for (let x = R(4 * u); x < w - R(4 * u); x += Math.max(2, R(1.5 * u))) rect(x, T.y + T.h + R(4 * u), 1, Math.max(1, R(1.5 * u)), '#8a826c');
      break;
    }
    case 'table': {
      const cx = w / 2, cy = h / 2, rx = w / 2 - 2 * u, ry = h / 2 - 2 * u, TW = biX_ramp('#8a5634');
      ell(cx, cy, rx, ry, TW, { rim: Math.max(1, R(u)), fn: (i, j, e) => { if (e) return null; const d = Math.hypot((i - cx) / rx, (j - cy) / ry); return Math.abs(d - 0.72) < 0.03 ? TW[1] : null; } });
      const mX = R(w * 0.24), mY = R(h * 0.3), mw = R(7 * u), mh = R(9 * u);
      rect(mX + 1, mY + 1, mw, mh, 'rgba(20,10,20,0.35)'); rect(mX, mY, mw, mh, '#e8e2d0'); rect(mX, mY, mw, R(3 * u), '#c0443a'); rect(mX + R(u), mY + R(4 * u), mw - R(2 * u), 1, '#9a9488'); rect(mX + R(u), mY + R(6 * u), mw - R(3 * u), 1, '#9a9488');
      ell(w * 0.6, h * 0.56, 3 * u, 3 * u, biX_ramp('#a8c0c8', 0.6)); biX_ell(w * 0.6, h * 0.56, Math.max(1, R(1.4 * u)), Math.max(1, R(1.4 * u)), '#6a7c84');
      for (const [x, y] of [[0.64, 0.3], [0.36, 0.7]]) { ell(w * x, h * y, 2.6 * u, 2.6 * u, PORC); biX_ell(w * x, h * y, Math.max(1, R(1.3 * u)), Math.max(1, R(1.3 * u)), '#4a2a1a'); }
      break;
    }
    case 'toilet': {
      box(R(3.5 * u), R(0.5 * u), w - R(7 * u), R(4.5 * u), PORC);
      ell(w / 2, h * 0.62, 5.2 * u, 5.6 * u, PORC);
      biX_ell(w / 2, h * 0.64, R(3.4 * u), R(3.8 * u), '#c8d0d0'); biX_ell(w / 2, h * 0.66, R(2.6 * u), R(3 * u), '#7aaec0'); rect(R(w / 2 - 1.5 * u), R(h * 0.58), Math.max(1, R(u)), Math.max(1, R(u)), '#b8dce8');
      rect(R(w - 5 * u), R(1.5 * u), R(1.8 * u), Math.max(1, R(u)), '#9aa2a8');
      break;
    }
    case 'sink': {
      box(R(u), 0, w - R(2 * u), R(h * 0.8), biX_ramp('#cfc8b8', 0.6));
      ell(w / 2, h * 0.44, 5.4 * u, 4.4 * u, PORC); biX_ell(w / 2, h * 0.46, R(4 * u), R(3.1 * u), '#bcc8cc'); biX_ell(w / 2, h * 0.5, R(1 * u) || 1, R(1 * u) || 1, '#4a5458');
      cap(w / 2, R(0.5 * u), w / 2, R(3 * u), Math.max(1, 1.1 * u), biX_ramp('#c8d0d8', 0.6));
      for (const s of [-1, 1]) ell(w / 2 + s * 3.2 * u, R(1.5 * u), 1.3 * u, 1.3 * u, biX_ramp('#c8d0d8', 0.6));
      break;
    }
    case 'evidence': {
      if (st.indexOf('c') < 0) break;
      const CR = biX_ramp('#b08a52'), m = R(1.5 * u); box(m, m, w - 2 * m, h - 2 * m, CR, { fn: (i, j, e) => !e && (j - m) % Math.max(3, R(4 * u)) === 0 ? CR[1] : null });
      biX_cap(m + 2 * u, m + 2 * u, w - m - 2 * u, h - m - 2 * u, Math.max(0.7, 0.8 * u), CR[3]);
      rect(R(w * 0.38), R(h * 0.38), R(w * 0.24), R(h * 0.2), 'rgba(40,20,20,0.55)');
      break;
    }
    case 'car': {
      const col = biX_tone(st.split('_')[1] || P.RD), B = biX_ramp(col), cx = w / 2, cy = h / 2, bl = w * 0.46, bw = h * 0.36;
      // wheels just showing at the arches
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) box(cx + sx * bl * 0.62 - 3 * u, cy + sy * bw - (sy > 0 ? 1.5 * u : 1.5 * u), 6 * u, 3 * u, biX_ramp('#1e1c22'));
      const body = [[cx - bl, cy - bw + 2 * u], [cx - bl + 2 * u, cy - bw], [cx + bl - 3 * u, cy - bw], [cx + bl, cy - bw + 3 * u], [cx + bl, cy + bw - 3 * u], [cx + bl - 3 * u, cy + bw], [cx - bl + 2 * u, cy + bw], [cx - bl, cy + bw - 2 * u]];
      poly(body, B, { rim: Math.max(1, R(u)) });
      // glass: windscreen toward +x, rear window, side glass; the roof between catches the light
      const wx = cx + bl * 0.18, rx0 = cx - bl * 0.5;
      poly([[wx, cy - bw + 2 * u], [wx + bl * 0.24, cy - bw + 3.5 * u], [wx + bl * 0.24, cy + bw - 3.5 * u], [wx, cy + bw - 2 * u]], biX_ramp(biX_C.glass), { ol: false, fn: (i, j, e) => (i + j) % R(10 * u) < R(2 * u) ? biX_C.glassHi : null });
      poly([[rx0, cy - bw + 2.5 * u], [rx0 - bl * 0.16, cy - bw + 3.5 * u], [rx0 - bl * 0.16, cy + bw - 3.5 * u], [rx0, cy + bw - 2.5 * u]], biX_ramp(biX_C.glass), { ol: false });
      for (const sy of [-1, 1]) rect(R(rx0), R(cy + sy * (bw - 1.4 * u) - 0.6 * u), R(wx - rx0), Math.max(1, R(1.2 * u)), biX_C.glass);
      box(rx0, cy - bw + 2.6 * u, wx - rx0, 2 * bw - 5.2 * u, [B[1], B[2], B[3], B[4], B[4]], { ol: false });
      // hood crease, lights, mirrors
      rect(R(wx + bl * 0.34), R(cy), R(bl * 0.38), 1, B[1]);
      for (const sy of [-1, 1]) { rect(R(cx + bl - 1.5 * u), R(cy + sy * (bw - 3.6 * u) - 1.2 * u), R(1.5 * u), R(2.4 * u), '#fff0b8'); rect(R(cx - bl), R(cy + sy * (bw - 3.2 * u) - 1.2 * u), R(1.2 * u), R(2.4 * u), '#c8302c'); box(wx - u, cy + sy * (bw + 0.8 * u) - u, 2 * u, 2 * u, B); }
      break;
    }
    case 'bin': {
      const cx = w / 2, cy = h / 2, M = biX_ramp('#7a8288'); ell(cx, cy, 5.4 * u, 5.4 * u, M, { rim: Math.max(1, R(u)), fn: (i, j, e) => !e && Math.abs(Math.hypot(i - cx, j - cy) - 3.4 * u) < 0.6 ? M[1] : null });
      cap(cx - 1.8 * u, cy, cx + 1.8 * u, cy, Math.max(1, u), M);
      break;
    }
    case 'lamp': {
      const cx = w / 2; ell(cx, h * 0.18, 2.6 * u, 2.6 * u, biX_ramp('#3c4048')); cap(cx, h * 0.24, cx, h * 0.7, Math.max(1, u), biX_ramp('#3c4048'));
      ell(cx, h * 0.78, 3.2 * u, 2.4 * u, biX_ramp('#4a4e56')); biX_ell(cx, h * 0.8, Math.max(1, R(2 * u)), Math.max(1, R(1.3 * u)), '#fff0b0');
      break;
    }
  }
}
// where the mainframe's tape reels and lamp panel sit (fine px), shared by the sprite and the animation
function biX_mfLayout(w, h) {
  const r = Math.max(2, Math.round(h * 0.2)), y = Math.round(h * 0.34), x0 = Math.round(w * 0.14);
  const px0 = x0 + r * 4 + 6;
  return { reels: [{ x: x0 + r, y, r }, { x: x0 + r * 3 + 3, y, r }], px: px0, py: Math.round(h * 0.12), pw: Math.max(4, w - px0 - Math.round(w * 0.08)), ph: Math.max(4, Math.round(h * 0.46)) };
}
function biX_termLayout(F) { const u = F / 16; return { x: Math.round(4 * u), y: Math.round(1.5 * u), w: F - Math.round(8 * u), h: Math.round(7 * u) }; }

// ---------- floors per room kind (fine px; F = fine px per tile) ----------
function biX_floorArt(kind, X, Y, w, h, F, sd) {
  const R = Math.round, u = F / 16;
  const planks = (tones, seam, lite, gr) => {
    const ph = Math.max(4, R(F / 3));
    for (let r = 0, y = 0; y < h; r++, y += ph) {
      const hh = Math.min(ph, h - y); let x = -R(biX_hash(r, sd, 1) * F * 2);
      for (let k = 0; x < w; k++) {
        const len = R(F * (2 + biX_hash(r, k + sd, 2) * 2.5)), x0 = Math.max(0, x), x1 = Math.min(w, x + len), tone = tones[Math.floor(biX_hash(r, k, 3 + sd) * tones.length)];
        rect(X + x0, Y + y, x1 - x0, hh, tone);
        rect(X + x0, Y + y, x1 - x0, 1, lite);
        if (hh === ph) rect(X + x0, Y + y + ph - 1, x1 - x0, 1, seam);
        if (x >= 0) rect(X + x, Y + y, 1, hh, seam);
        if (biX_hash(r, k, 5 + sd) < 0.65 && ph >= 5) { const gx = x0 + R((x1 - x0) * 0.15), gl = R((x1 - x0) * (0.3 + 0.4 * biX_hash(k, r, 6))), gy = Y + y + 2 + R(biX_hash(k, r, 7) * (ph - 4)); rect(X + gx, gy, Math.min(gl, x1 - gx - 1), 1, gr); }
        x += len;
      }
    }
  };
  const tiles = (ts, fill, lite, dark, seam, pick) => {
    for (let ty = 0; ty < h; ty += ts) for (let tx = 0; tx < w; tx += ts) {
      const tw = Math.min(ts, w - tx), th = Math.min(ts, h - ty), f = pick ? pick(tx / ts | 0, ty / ts | 0) : fill;
      rect(X + tx, Y + ty, tw, th, f); rect(X + tx, Y + ty, tw, 1, lite); rect(X + tx, Y + ty, 1, th, lite);
      if (dark) { rect(X + tx, Y + ty + th - 1, tw, 1, dark); rect(X + tx + tw - 1, Y + ty, 1, th, dark); }
      if (seam) { rect(X + tx, Y + ty, tw, 1, seam); rect(X + tx, Y + ty, 1, th, seam); if (ts > 6) { rect(X + tx + 1, Y + ty + 1, tw - 1, 1, lite); rect(X + tx + 1, Y + ty + 1, 1, th - 1, lite); } }
    }
  };
  const rug = (m, field, border, gold, fringe) => {
    const rw = Math.min(w - 2 * m, F * 7), rh = Math.min(h - 2 * m, F * 5), rx = X + Math.round((w - rw) / 2), ry = Y + Math.round((h - rh) / 2); if (rw < F * 1.5 || rh < F * 1.2) return;
    rect(rx + 2, ry + 3, rw, rh, 'rgba(14,8,30,0.28)');
    rect(rx, ry, rw, rh, border); const b = Math.max(3, R(F * 0.28));
    rect(rx + 1, ry + 1, rw - 2, 1, gold); rect(rx + 1, ry + rh - 2, rw - 2, 1, gold); rect(rx + 1, ry + 1, 1, rh - 2, gold); rect(rx + rw - 2, ry + 1, 1, rh - 2, gold);
    rect(rx + b, ry + b, rw - 2 * b, rh - 2 * b, field); const f2 = biX_sh(field, 0.12);
    rect(rx + b, ry + b, rw - 2 * b, 1, gold); rect(rx + b, ry + rh - b - 1, rw - 2 * b, 1, gold); rect(rx + b, ry + b, 1, rh - 2 * b, gold); rect(rx + rw - b - 1, ry + b, 1, rh - 2 * b, gold);
    // a central medallion and quarter-lozenges in the corners
    const cx = rx + rw / 2, cy = ry + rh / 2, mw = Math.min(rw, rh) * 0.34;
    biX_poly([[cx - mw * 1.3, cy], [cx, cy - mw], [cx + mw * 1.3, cy], [cx, cy + mw]], border); biX_poly([[cx - mw * 1.05, cy], [cx, cy - mw * 0.78], [cx + mw * 1.05, cy], [cx, cy + mw * 0.78]], f2);
    biX_poly([[cx - mw * 0.55, cy], [cx, cy - mw * 0.4], [cx + mw * 0.55, cy], [cx, cy + mw * 0.4]], gold); biX_poly([[cx - mw * 0.3, cy], [cx, cy - mw * 0.2], [cx + mw * 0.3, cy], [cx, cy + mw * 0.2]], border);
    const q = mw * 0.55; for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const ox = sx ? rx + rw - b - 1 : rx + b + 1, oy = sy ? ry + rh - b - 1 : ry + b + 1, dx = sx ? -1 : 1, dy = sy ? -1 : 1; biX_poly([[ox, oy], [ox + dx * q * 1.2, oy], [ox, oy + dy * q]], border); }
    if (fringe) for (let yy = ry + 1; yy < ry + rh - 1; yy += 2) { rect(rx - 2, yy, 2, 1, fringe); rect(rx + rw, yy, 2, 1, fringe); }
  };
  switch (kind) {
    case 'office': planks(['#7c4c2e', '#845432', '#744629'], '#4a2a1c', '#946038', '#6a3e24'); break;
    case 'exec': planks(['#5a3322', '#613826', '#532f1f'], '#301a14', '#6e4430', '#4a2a1c'); rug(R(F * 0.75), '#7a2430', '#22304e', '#c49a48', '#d8ceb0'); break;
    case 'file': tiles(F, null, '#78867c', null, '#4a554e', (a, b) => (a + b) % 2 ? '#66736a' : '#5d6a61'); break;
    case 'computer': tiles(F, '#98a4b2', '#bcc6d2', '#6c7888', null);
      for (let ty = 0; ty < h; ty += F) for (let tx = 0; tx < w; tx += F) if (biX_hash(tx / F, ty / F, sd + 9) < 0.28) { const s = Math.max(2, R(3 * u)); for (let yy = ty + R(3 * u); yy < Math.min(h, ty + F) - R(3 * u); yy += s) for (let xx = tx + R(3 * u); xx < Math.min(w, tx + F) - R(3 * u); xx += s) rect(X + xx, Y + yy, Math.max(1, R(u)), Math.max(1, R(u)), '#6a7686'); }
      break;
    case 'cipher': tiles(F, null, '#2e395a', null, '#222a44', (a, b) => (a + b) % 2 ? '#29334f' : '#2c3754'); break;
    case 'lounge': rect(X, Y, w, h, '#86704e'); for (let yy = 0; yy < h; yy += Math.max(3, R(4 * u))) rect(X, Y + yy, w, 1, '#806a4a'); rug(R(F * 1.1), '#2f6466', '#1e3a44', '#c49a48', null); break;
    case 'bath': tiles(Math.max(5, R(F / 2)), '#dfe6e4', '#f0f4f2', null, '#a8b6b6', (a, b) => (a === 0 || b === 0 || (a + 1) * Math.max(5, R(F / 2)) >= w || (b + 1) * Math.max(5, R(F / 2)) >= h) ? '#78aab4' : '#dfe6e4'); break;
    case 'hall': tiles(F, null, null, null, '#9a907e', (a, b) => (a + b) % 2 ? '#d0c6ae' : '#7c7468'); break;
    default: rect(X, Y, w, h, '#8a8478');
  }
}
// the inside face of the north wall, seen at a slight angle, with its skirting board
function biX_wallFace(X, Y, w, F, kind) {
  const fh = Math.max(4, Math.round(F * 0.3)), face = { bath: '#b8c4c2', computer: '#8a929c', exec: '#7a5a48', lounge: '#8a7a60', cipher: '#4a5068', file: '#7a8278', hall: '#8a8272' }[kind] || '#8c8272';
  vgrad(X, Y, w, fh, [biX_sh(face, -0.25), face, biX_sh(face, 0.06)]);
  rect(X, Y + fh - 2, w, 2, biX_sh(face, -0.45)); rect(X, Y + fh - 3, w, 1, biX_sh(face, 0.18)); rect(X, Y + fh, w, 1, 'rgba(16,10,40,0.35)');
}
// the north-west light: wall shadows across the floor, a warm pool in the middle, darker corners
function biX_roomLight(X, Y, w, h, F) {
  const bw = Math.max(3, Math.round(F * 0.32));
  for (let k = 0; k < bw; k++) { const a = [0.36, 0.26, 0.16, 0.08][Math.floor(k / bw * 4)]; g.fillStyle = 'rgba(16,10,40,' + a + ')'; g.fillRect(X + k, Y + k, w - k, 1); g.fillRect(X + k, Y + k + 1, 1, h - k - 1); }
  g.fillStyle = 'rgba(16,10,40,0.16)'; g.fillRect(X, Y + h - 1, w, 1); g.fillRect(X + w - 1, Y, 1, h);
  const cx = X + w * 0.46, cy = Y + h * 0.44, r = Math.hypot(w, h) * 0.62;
  let gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, 'rgba(255,224,168,0.16)'); gr.addColorStop(0.5, 'rgba(255,224,168,0.04)'); gr.addColorStop(0.55, 'rgba(18,10,40,0)'); gr.addColorStop(1, 'rgba(18,10,40,0.34)');
  g.fillStyle = gr; g.fillRect(X, Y, w, h);
}
// walls: a plaster cap 8 fine px thick all round, lit on the edges that face the north-west
const biX_WALL = ['#1c1824', '#6a6360', '#958c80', '#b6ac9c', '#d4cab6'];
function biX_wallsArt(X, Y, w, h) {
  const m = biX_M(w + 16, h + 16); biX_mRect(m, 0, 0, w + 16, h + 16); const hole = biX_mRect(biX_M(w + 16, h + 16), 8, 8, w, h); biX_mCut(m, hole);
  biX_paint(m, X - 8, Y - 8, biX_WALL, { rim: 1, fn: (i, j, e) => { if (e) return null; const ii = Math.min(i, w + 15 - i), jj = Math.min(j, h + 15 - j), d = Math.min(ii, jj); return d === 4 ? biX_WALL[3] : null; } });
}
// a door in its canonical frame: the opening runs along +x (dw fine px), the wall depth is y 0..8, the room lies beyond y = 8
function biX_doorArt(dw, open, outside, F, L) {
  const post = biX_ramp(outside ? '#50585e' : '#5a3a26'), leafC = biX_ramp(outside ? '#4e6e5c' : '#8a5a34'), u = F / 16, O = { L };
  rect(2, 0, dw - 4, 8, open ? (outside ? '#1a2234' : '#7a7266') : '#3a3434');
  if (open) {
    if (outside) { rect(2, 0, dw - 4, 3, '#101626'); }
    else { rect(2, 3, dw - 4, 2, '#8c8476'); }
    const Lf = Math.max(4, Math.round((dw - 4) / 2) - 1);
    biX_pRect(2, 8, 3, Lf, leafC, O); biX_pRect(dw - 5, 8, 3, Lf, leafC, O);
    if (outside) { g.fillStyle = 'rgba(190,210,240,0.10)'; biX_poly([[3, 8], [dw - 3, 8], [dw + Lf * 0.4, 8 + Lf * 1.6], [-Lf * 0.4, 8 + Lf * 1.6]], 'rgba(190,210,240,0.09)'); }
  } else {
    const half = Math.floor((dw - 4) / 2);
    biX_pRect(2, 2, half, 5, leafC, O); biX_pRect(2 + half, 2, dw - 4 - half, 5, leafC, O);
    if (outside) { rect(4, 4, dw - 8, 1, '#9aa8a0'); }
    rect(1 + half, 4, 1, 1, '#e8c870'); rect(3 + half, 4, 1, 1, '#e8c870');
  }
  biX_pRect(0, 0, 3, 9, post, O); biX_pRect(dw - 3, 0, 3, 9, post, O);
}
// ---------- the city street for ambushes (fine px, interior at X,Y) ----------
function biX_streetArt(X, Y, w, h, F, night, lamps) {
  const R = Math.round, u = F / 16;
  const A = night ? { road: '#262a38', road2: '#2c3040', walk: '#565866', walk2: '#4e505e', seam: '#3e404c', lite: '#6a6c7a', curb: '#8a8a94', brick: '#3a2c30', win: '#e8c878' }
    : { road: '#4c4c54', road2: '#55545c', walk: '#a09a8e', walk2: '#9a9488', seam: '#7c776e', lite: '#b8b2a4', curb: '#d0c8b6', brick: '#7a4c3a', win: '#5a7890' };
  // building fronts in the margin: brick plinths with doorways and a window's glow
  rect(X - 8, Y - 8, w + 16, h + 16, A.brick);
  for (const yy of [Y - 8, Y + h]) { rect(X - 8, yy + (yy < Y ? 7 : 0), w + 16, 1, biX_sh(A.brick, -0.4)); for (let x = X + 6; x < X + w - 16; x += R(F * 3.4)) { rect(x, yy + 1, R(F * 0.9), 6, biX_sh(A.brick, -0.5)); rect(x + R(F * 1.5), yy + 2, R(F * 1.1), 4, A.win); } }
  // road (runs off both ends)
  const sw = 2 * F, ry = Y + sw, rh = h - 2 * sw;
  rect(X - 8, ry, w + 16, rh, A.road);
  for (let k = 0; k < 4; k++) { const px0 = X + R(biX_hash(k, 1, 40) * (w - F * 3)) + F, py0 = ry + R(F * 0.6 + biX_hash(k, 2, 40) * (rh - F * 2)), pw = R(F * (1.2 + biX_hash(k, 3, 40) * 1.5)), ph = R(F * (0.5 + biX_hash(k, 4, 40) * 0.6)); biX_ell(px0, py0, pw / 2, ph / 2, A.road2); }
  const cy = Y + R(h / 2); for (let x = X; x < X + w; x += R(F * 1.25)) rect(x, cy - 1, R(F * 0.7), Math.max(2, R(1.5 * u)), night ? '#b09038' : '#d8b440');
  for (const ly of [ry + R(F * 2.2), ry + rh - R(F * 2.2)]) for (let x = X + R(F); x < X + w; x += 3 * F) rect(x, ly, 1, R(F * 0.6), night ? '#8a8a90' : '#d8d4c8');
  // a zebra crossing near the west end
  const zx = X + R(F * 2.5), zw = R(F * 1.4); for (let yy = ry + R(F * 0.4); yy < ry + rh - R(F * 0.4); yy += R(F * 0.5)) rect(zx, yy, zw, Math.max(2, R(F * 0.25)), night ? '#6a6a74' : '#c8c4b8');
  // manhole and an oil stain
  const mx = X + R(w * 0.64), my = cy + R(F * 1.4); biX_pEll(mx, my, 3.4 * u + 2, 3.4 * u + 2, biX_ramp(night ? '#3a3e4a' : '#5e5e66'), { rim: 1, fn: (i, j, e) => !e && (i % 3 === 0 || j % 3 === 0) ? (night ? '#30343e' : '#4e4e56') : null });
  g.fillStyle = 'rgba(10,6,20,0.3)'; biX_ell(X + w * 0.3, cy - F * 0.9, R(F * 0.7), R(F * 0.4), 'rgba(10,6,20,0.28)');
  // sidewalks: slabs, curbs, a drain in the gutter
  for (const [sy, top] of [[Y, 1], [Y + h - sw, 0]]) {
    for (let ty = 0; ty < sw; ty += F) for (let tx = 0; tx < w; tx += F) { const f = biX_hash(tx / F, (sy + ty) / F, 41) < 0.25 ? A.walk2 : A.walk, tw = Math.min(F, w - tx); rect(X + tx, sy + ty, tw, F, f); rect(X + tx, sy + ty, tw, 1, A.seam); rect(X + tx, sy + ty, 1, F, A.seam); rect(X + tx + 1, sy + ty + 1, tw - 1, 1, A.lite); }
    const cyb = top ? sy + sw - R(2 * u) : sy; rect(X, cyb, w, R(2 * u), A.curb); rect(X, top ? cyb + R(2 * u) : cyb - 1, w, 1, biX_sh(A.road, -0.35)); rect(X, top ? cyb : cyb + R(2 * u) - 1, w, 1, top ? biX_sh(A.curb, 0.3) : biX_sh(A.curb, -0.3));
    for (let x = X + R(F * 2.5); x < X + w; x += 6 * F) { const gy = top ? sy + sw : sy - R(2 * u) - 1; rect(x, gy, R(F * 0.8), R(2 * u), '#1a1a22'); for (let k = 1; k < R(F * 0.8); k += 2) rect(x + k, gy, 1, R(2 * u), '#4a4a52'); }
  }
  // shadow of the building line on the northern walk
  g.fillStyle = 'rgba(16,10,40,0.22)'; g.fillRect(X, Y, w, R(F * 0.35)); g.fillRect(X, Y + h - sw, w, R(F * 0.12));
}
// night street lamps: warm pools (after the furniture so the cars catch the light too)
function biX_streetGlow(lamps) { for (const [x, y, r] of lamps) { biX_glow(x, y, r, 'rgb(255,200,120)', 0.34, true); biX_glow(x, y, r * 0.4, 'rgb(255,230,170)', 0.22, true); } }

// ---------- explosions, stun flashes and gas (cached frames, fine px) ----------
function biX_boomArt(type, fi, rad) {
  return sprite('biX_bm_' + type + fi + '_' + rad, rad * 2 + 2, rad * 2 + 2, () => {
    const c = rad + 1, p = fi / 7, D2 = rad * 2 + 2;
    const puffs = (n, spread, size, seed, lift) => { const o = []; for (let k = 0; k < n; k++) { const an = k / n * Math.PI * 2 + biX_hash(k, seed, 50) * 0.7, d = rad * spread * (0.35 + 0.65 * biX_hash(k, seed + 1, 50)); o.push([c + Math.cos(an) * d, c + Math.sin(an) * d * 0.85 - lift, rad * size * (0.7 + 0.5 * biX_hash(k, seed + 2, 50))]); } return o; };
    // shade a union of puffs: each pixel takes the brightest dome over it, then a heat/brightness band
    const field = (ps, fn) => { for (let j = 0; j < D2; j++) for (let i = 0; i < D2; i++) { let best = -1; for (const [x, y, r] of ps) { const dx = (i + 0.5 - x) / r, dy = (j + 0.5 - y) / r, q = dx * dx + dy * dy; if (q < 1) { const lit = Math.sqrt(1 - q) * 0.7 + (-dx - dy) * 0.25; if (lit > best) best = lit; } } if (best >= 0) { const col = fn(i, j, best); if (col) { g.fillStyle = col; g.fillRect(i, j, 1, 1); } } } };
    if (type === 'frag') {
      if (fi <= 2) { g.fillStyle = 'rgba(255,236,200,' + (0.55 - fi * 0.2) + ')'; const rr = rad * (0.55 + fi * 0.22); for (let a = 0; a < 140; a++) { const an = a / 140 * Math.PI * 2; g.fillRect(Math.round(c + Math.cos(an) * rr), Math.round(c + Math.sin(an) * rr), 2, 2); } }
      // smoke, growing and thinning as the fire dies
      if (fi >= 1) { const a = [0, 0.75, 0.8, 0.75, 0.62, 0.48, 0.34, 0.2][fi]; field(puffs(9, 0.55 + p * 0.25, 0.22 + p * 0.2, 7, p * rad * 0.25), (i, j, l) => l > 0.72 ? 'rgba(128,112,124,' + a + ')' : l > 0.4 ? 'rgba(92,78,96,' + a + ')' : 'rgba(58,46,66,' + a + ')'); }
      // the fireball: hottest at the centre, banded white-yellow-orange-red
      if (fi <= 5) { const fr = rad * [0.5, 0.62, 0.6, 0.52, 0.4, 0.28][fi], cool = fi * 0.1; field(puffs(8, [0.3, 0.38, 0.38, 0.34, 0.28, 0.2][fi], [0.3, 0.36, 0.34, 0.28, 0.2, 0.13][fi], 3, 0).concat([[c, c, fr * 0.7]]), (i, j, l) => { const d = Math.hypot(i + 0.5 - c, j + 0.5 - c) / (fr || 1), h = 1.15 - d * 0.7 + l * 0.35 - cool; return h > 1.0 ? '#fffbe0' : h > 0.82 ? '#ffe070' : h > 0.62 ? '#ffa838' : h > 0.4 ? '#e8602a' : '#a8302a'; }); }
    } else {
      const k = 1 - p;
      g.fillStyle = 'rgba(220,244,255,' + (0.85 * k) + ')'; const rr = rad * (0.35 + p * 0.65); for (let a = 0; a < 140; a++) { const an = a / 140 * Math.PI * 2; g.fillRect(Math.round(c + Math.cos(an) * rr), Math.round(c + Math.sin(an) * rr), 2, 2); }
      if (fi < 5) { biX_pEll(c, c, rad * 0.34 * k, rad * 0.34 * k, biX_ramp('#e8f8ff', 0.3), { ol: false }); for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2 + 0.2, l = rad * (0.4 + 0.5 * k) * (a % 2 ? 0.6 : 1); biX_cap(c, c, c + Math.cos(an) * l, c + Math.sin(an) * l, Math.max(1, rad * 0.04 * k), '#ffffff'); } }
    }
  });
}
function biX_gasArt(rad, ph) {
  return sprite('biX_gs_' + rad + '_' + ph, rad * 2 + 2, rad * 2 + 2, () => {
    const c = rad + 1, D2 = rad * 2 + 2, N = 12, ps = [];
    for (let k = 0; k < N; k++) { const an = k / N * Math.PI * 2 + ph * 0.22 * (k % 2 ? 1 : -1), d = rad * (k < 4 ? 0.16 : 0.5) * (0.85 + 0.3 * biX_hash(k, 1, 60)), r = rad * (k < 4 ? 0.36 : 0.32) * (0.85 + 0.2 * Math.sin(ph * 0.9 + k)); ps.push([c + Math.cos(an) * d, c + Math.sin(an) * d, Math.min(r, rad - d - 1)]); }
    for (let j = 0; j < D2; j++) for (let i = 0; i < D2; i++) {
      let best = -1, cnt = 0; for (const [x, y, r] of ps) { if (r <= 1) continue; const dx = (i + 0.5 - x) / r, dy = (j + 0.5 - y) / r, q = dx * dx + dy * dy; if (q < 1) { cnt++; const lit = Math.sqrt(1 - q) * 0.6 + (-dx - dy) * 0.3; if (lit > best) best = lit; } }
      if (best < 0) continue; const a = Math.min(0.7, 0.3 + cnt * 0.1);
      g.fillStyle = best > 0.72 ? 'rgba(214,232,150,' + a + ')' : best > 0.38 ? 'rgba(160,198,92,' + a + ')' : 'rgba(104,146,64,' + a + ')'; g.fillRect(i, j, 1, 1);
    }
  });
}
function biX_grenArt(type) {
  return sprite('biX_gn_' + type, 12, 10, () => {
    const col = { frag: '#5e6e3a', stun: '#c8ccd0', gas: '#5a9a3a' }[type], G = biX_ramp(col, type === 'stun' ? 0.7 : 1), O = { L: [-1, -1] };
    if (type === 'frag') { biX_pEll(6, 6.2, 4, 3.8, G, O); rect(3, 6, 6, 1, G[1]); }
    else { biX_pRect(2, 3, 8, 7, G, O); rect(3, 6, 6, 2, type === 'gas' ? '#e8e070' : '#e8b030'); }
    biX_pRect(4, 0, 4, 3, biX_ramp('#8a9098', 0.7), O); rect(8, 1, 2, 1, '#c8ccd0');
  });
}

// ---------- Max, side view, for the portrait box (46 x 76 fine px) ----------
// backlit by a doorway on the right: the figure reads as a dark shape with a warm rim on its front edges
const biX_MAXPOSE = {
  // hip, front knee/ankle, back knee/ankle, shoulder, head centre
  0: { hip: [19, 42], fk: [21, 57], fa: [20, 71], bk: [17, 57], ba: [16, 71], sh: [20, 21], hd: [22, 11] },
  1: { hip: [19, 42], fk: [24, 56], fa: [27, 70], bk: [15, 57], ba: [10, 68], sh: [20, 21], hd: [22, 11] },
  2: { hip: [19, 42], fk: [19, 57], fa: [15, 69], bk: [22, 56], ba: [23, 71], sh: [20, 21], hd: [22, 11] },
  c: { hip: [16, 55], fk: [27, 58], fa: [26, 71], bk: [11, 69], ba: [4, 71], sh: [19, 35], hd: [22, 25] },
};
function biX_maxSide(fr, disg, uniC, uzi, mask) {
  return sprite('biX_mx_' + [fr, disg ? uniC : 'n', uzi ? 1 : 0, mask ? 1 : 0].join('_'), 46, 76, () => {
    const P0 = biX_MAXPOSE[fr], rimR = (c, k = 1) => { const r = biX_ramp(c); return [r[0], r[1], r[2], mix(r[2], '#ffc880', 0.45 * k), mix(r[2], '#ffe0b0', 0.7 * k)]; };
    const base = disg ? biX_tone(uniC) : '#2c3042', SU = rimR(base), SD = rimR(biX_sh(base, -0.3), 0.6), BOOT = rimR('#1c1a20', 0.6), SK = rimR(biX_C.skinL), GUNR = rimR('#2c2c34', 0.8), HOOD = rimR('#1e1e28');
    const O = { L: [1, -1] }, sh = P0.sh, hd = P0.hd, hip = P0.hip, aimY = sh[1] + 4, hand = [36, aimY];
    const leg = (k, a, r) => { const m = biX_M(46, 76); biX_mCap(m, hip[0], hip[1], k[0], k[1], 3.8); biX_mCap(m, k[0], k[1], a[0], a[1] - 2, 3.1); biX_paint(m, 0, 0, r, O); biX_pPoly([[a[0] - 3, a[1] - 3], [a[0] + 2, a[1] - 3], [a[0] + 6, a[1] + 1], [a[0] + 6, a[1] + 3], [a[0] - 3, a[1] + 3]], BOOT, O); };
    // far leg, far arm
    leg(P0.bk, P0.ba, SD);
    biX_pCap(sh[0] + 1, sh[1] + 2, hand[0] - 3, hand[1] - 1, 2.4, SD, O);
    // neck and torso: a deep chest, the back curving down to the belt
    biX_pRect(hd[0] - 3, hd[1] + 3, 6, 7, disg ? SK : HOOD, O);
    biX_pPoly([[sh[0] - 6, sh[1] - 1], [sh[0] + 4, sh[1] - 2], [sh[0] + 7, sh[1] + 3], [sh[0] + 7, sh[1] + 10], [hip[0] + 5, hip[1] - 1], [hip[0] + 5, hip[1] + 2], [hip[0] - 5, hip[1] + 2], [hip[0] - 5, hip[1] - 6], [sh[0] - 8, sh[1] + 8]], SU, O);
    biX_pRect(hip[0] - 5, hip[1] - 2, 11, 3, rimR(disg ? '#2a2226' : '#3a3028', 0.7), { L: [1, -1], ol: false });
    if (!disg) { biX_pRect(hip[0] - 8, hip[1] - 4, 5, 6, rimR('#34342a', 0.7), O); biX_pCap(sh[0] + 5, sh[1] + 1, hip[0] - 4, hip[1] - 3, 1, rimR('#3a3028', 0.5), { L: [1, -1], ol: false }); }
    // head: balaclava with an eye slit, or a guard's cap over a face in profile
    if (disg) {
      biX_pEll(hd[0], hd[1], 4.8, 5.2, SK, O); biX_pPoly([[hd[0] + 4, hd[1] - 1], [hd[0] + 6.5, hd[1] + 2], [hd[0] + 4, hd[1] + 3]], SK, { L: [1, -1], ol: false });
      biX_pPoly([[hd[0] - 5.5, hd[1] - 2], [hd[0] - 4.5, hd[1] - 6.5], [hd[0] + 4, hd[1] - 6.5], [hd[0] + 5, hd[1] - 2]], SU, O); biX_pRect(hd[0] + 2, hd[1] - 3, 7, 2, SD, O);
      rect(hd[0] + 3, hd[1], 1, 1, biX_C.ink); rect(hd[0] + 4, hd[1] + 4, 2, 1, SK[1]); rect(hd[0] - 3, hd[1] + 1, 2, 3, SK[1]);
    } else {
      biX_pEll(hd[0], hd[1], 5, 5.4, HOOD, O);
      rect(hd[0] + 1, hd[1] - 2, 5, 3, SK[2]); rect(hd[0] + 1, hd[1] - 2, 5, 1, SK[3]); rect(hd[0] + 3, hd[1] - 1, 2, 1, '#f4f0e8'); rect(hd[0] + 4, hd[1] - 1, 1, 1, biX_C.ink);
    }
    if (mask) { biX_pPoly([[hd[0] + 1, hd[1] - 3], [hd[0] + 6, hd[1] - 2], [hd[0] + 8, hd[1] + 3], [hd[0] + 3, hd[1] + 5]], rimR('#4c5458'), O); biX_pEll(hd[0] + 7, hd[1] + 4, 2.4, 2.4, rimR('#4a5436'), O); biX_pEll(hd[0] + 3.5, hd[1] - 1, 1.4, 1.4, biX_ramp('#6ab4c4'), { ol: false }); }
    // near leg, the aiming arm, the gun and a gloved hand
    leg(P0.fk, P0.fa, SU);
    biX_pCap(sh[0] - 1, sh[1] + 2, hand[0] - 2, hand[1], 2.7, SU, O);
    if (uzi) { biX_pPoly([[hand[0] - 6, aimY - 3], [hand[0] + 9, aimY - 3], [hand[0] + 9, aimY + 1], [hand[0] - 6, aimY + 1]], GUNR, O); biX_pRect(hand[0] - 1, aimY + 1, 3, 6, GUNR, O); rect(hand[0] + 9, aimY - 2, 1, 2, biX_C.ink); }
    else { biX_pPoly([[hand[0] - 2, aimY - 3], [hand[0] + 6, aimY - 3], [hand[0] + 6, aimY], [hand[0] - 2, aimY]], GUNR, O); biX_pRect(hand[0] + 6, aimY - 2, 4, 2, GUNR, { L: [1, -1], ol: false }); }
    biX_pEll(hand[0] - 1, hand[1] + 1, 2.4, 2.2, disg ? SK : rimR('#24222a'), O);
  });
}
function biX_portraitBg() {
  return art('biX_pbg', 23, 38, () => {
    vgrad(0, 0, 46, 64, ['#343a52', '#2c3248', '#242a3e']);
    // a lit doorway behind him on the right
    vgrad(30, 4, 16, 58, ['#f0d49a', '#d8b074', '#a87c50']); rect(29, 4, 1, 58, '#5a4a3c'); rect(30, 4, 16, 1, '#ffecc0');
    biX_glow(40, 36, 30, 'rgb(255,200,130)', 0.22, true);
    rect(0, 62, 46, 14, '#2e2824'); vgrad(0, 62, 46, 14, ['#4a3e34', '#2a2420']); rect(0, 62, 46, 1, '#6a5644');
    biX_glow(38, 64, 20, 'rgb(255,190,120)', 0.25, true);
  });
}
// ---------- the Equipment Display (layout: the panel's left edge is x = 173) ----------
function biX_panelBg() {
  return art('biX_eqbg', 145, 99, () => { vgrad(0, 0, 290, 198, ['#1c2638', '#18202e', '#141b28']); biX_glow(206, 80, 130, 'rgb(120,160,220)', 0.16, true); rect(0, 196, 290, 2, '#0a0e16'); });
}
// Max's silhouette: head, neck, shoulders and the arm stretched out toward the gun, rim-lit from the north-west
function biX_silArt() {
  return art('biX_sil', 145, 99, () => {
    const cx = 206, m = biX_M(290, 198);
    biX_mEll(m, cx, 34, 21, 27); biX_mRect(m, cx - 11, 54, 22, 20);
    biX_mPoly(m, [[cx - 12, 66], [cx + 12, 66], [cx + 58, 88], [cx + 64, 110], [cx + 66, 198], [cx - 66, 198], [cx - 64, 110], [cx - 50, 86]]);
    biX_mCap(m, cx - 44, 96, 90, 92, 11);
    const SIL = ['#0c101a', '#1e2638', '#28324a', '#3c4a68', '#5a6e96'];
    biX_paint(m, 0, 0, SIL, { rim: 2, fn: (i, j, e) => e ? null : (j > 120 && i > cx + 20 ? SIL[1] : null) });
  });
}
function biX_gunArt(uzi) {
  return art('biX_gun' + (uzi ? 'u' : 'p'), 60, 20, () => {
    const M = biX_ramp('#3c3e46'), D = biX_ramp('#2a2a30'), GRIP = biX_ramp('#5a3a28'), O = { L: [-1, -1] };
    if (!uzi) {
      biX_pRect(0, 7, 40, 8, D, O);                                                  // silencer
      for (let x = 6; x < 36; x += 6) rect(x, 8, 1, 6, D[1]);
      biX_pPoly([[36, 3], [88, 3], [90, 5], [90, 15], [36, 15]], M, O);                // slide
      for (let x = 72; x < 86; x += 3) rect(x, 5, 1, 6, M[1]); rect(40, 4, 30, 1, M[4]);
      biX_pRect(84, 1, 4, 3, M, O); biX_pRect(40, 1, 3, 3, M, O);
      biX_pPoly([[46, 15], [84, 15], [84, 19], [46, 19]], M, O);                        // frame
      biX_pPoly([[50, 18], [62, 18], [62, 26], [50, 26]], D, { L: [-1, -1] }); rect(52, 20, 8, 5, '#12101a'); rect(55, 20, 2, 4, M[3]);
      biX_pPoly([[62, 18], [82, 18], [88, 38], [70, 38]], GRIP, O);                    // grip
      for (let k = 0; k < 5; k++) rect(70 + k * 3, 24 + k * 2, 8, 1, GRIP[1]);
    } else {
      biX_pRect(0, 9, 18, 6, D, O); biX_pRect(12, 6, 6, 14, D, O);                      // folded stock
      biX_pPoly([[18, 4], [82, 4], [84, 6], [84, 22], [18, 22]], M, O);
      for (let x = 24; x < 44; x += 4) rect(x, 8, 2, 8, M[1]); rect(46, 6, 22, 2, M[4]); biX_pRect(56, 2, 6, 3, M, O);
      biX_pRect(82, 9, 34, 5, D, O); biX_pRect(112, 7, 5, 9, D, O);                    // barrel
      biX_pPoly([[32, 22], [48, 22], [48, 30], [32, 30]], D, O); rect(35, 24, 10, 4, '#12101a');
      biX_pPoly([[50, 22], [66, 22], [68, 40], [52, 40]], M, O);                      // magazine in the grip
      for (let y = 26; y < 38; y += 3) rect(53, y, 12, 1, M[1]);
    }
  });
}
function biX_cameraArt() {
  return art('biX_cam', 22, 14, () => {
    const B = biX_ramp('#2c2a30'), CH = biX_ramp('#b8bcc4', 0.6), O = { L: [-1, -1] };
    biX_pRect(8, 0, 12, 5, CH, O); biX_pRect(28, 2, 8, 4, CH, O); rect(30, 3, 3, 2, '#c83c30');
    biX_pRect(0, 4, 44, 8, CH, O); biX_pRect(0, 11, 44, 16, B, O);
    for (let x = 3; x < 41; x += 3) rect(x, 14, 1, 11, B[1]);
    biX_pEll(22, 16, 10, 10, B, O); biX_pEll(22, 16, 7.5, 7.5, biX_ramp('#3a4050'), O);
    biX_pEll(22, 16, 5, 5, biX_ramp('#2a4a72'), { ol: false }); rect(19, 12, 3, 2, '#b8d8f0'); rect(24, 18, 2, 1, '#5aa0c8');
    rect(35, 6, 5, 3, '#1a1a20'); rect(36, 6, 3, 1, '#5a7898');
  });
}
function biX_safekitArt() {
  return art('biX_sk', 46, 25, () => {
    const LTH = biX_ramp('#7a4a2a'), IN = '#2a1a18', O = { L: [-1, -1] };
    biX_pRect(34, 0, 24, 8, LTH, O); rect(38, 2, 16, 3, LTH[1]);
    biX_pRect(0, 6, 92, 44, LTH, O); rect(4, 10, 84, 36, IN);
    for (let x = 6; x < 88; x += 4) { rect(x, 8, 2, 1, LTH[3]); rect(x, 47, 2, 1, LTH[1]); }
    rect(32, 10, 2, 36, LTH[1]); rect(62, 10, 2, 36, LTH[1]);
    // stethoscope
    g.fillStyle = '#9aa0a8'; for (let a = 0; a < 60; a++) { const an = a / 60 * Math.PI * 1.7 + 0.4; g.fillRect(Math.round(17 + Math.cos(an) * 9), Math.round(26 + Math.sin(an) * 9), 2, 2); }
    biX_pCap(9, 13, 9, 20, 1.2, biX_ramp('#c8ccd0', 0.6), O); biX_pCap(25, 13, 25, 20, 1.2, biX_ramp('#c8ccd0', 0.6), O);
    biX_pEll(19, 38, 5, 5, biX_ramp('#c8ccd0', 0.6), O); biX_ell(19, 38, 2, 2, '#4a4e56');
    // hand drill
    biX_pRect(38, 16, 20, 10, biX_ramp('#d4a830'), O); biX_pRect(48, 26, 8, 16, biX_ramp('#3a3a40'), O); biX_pRect(32, 19, 7, 4, biX_ramp('#a8acb4', 0.6), O);
    // picks and tension wrenches
    for (let n = 0; n < 6; n++) { const x = 67 + n * 3.5; biX_pRect(x, 14 + (n % 2) * 2, 2, 22, biX_ramp('#b8bcc4', 0.6), { L: [-1, -1], ol: false }); biX_pRect(x - 0.5, 34, 3, 8, biX_ramp('#6a3a24'), { L: [-1, -1], ol: false }); }
  });
}
function biX_vestArt(w, h) {
  return art('biX_vest' + w + 'x' + h, w, h, () => {
    const W2 = w * 2, H2 = h * 2, cx = W2 / 2, s = W2 / 100, t = H2 / 130, VE = biX_ramp('#46503e'), ST = biX_ramp('#343a30'), O = { L: [-1, -1] };
    const m = biX_M(W2, H2);
    biX_mPoly(m, [[cx - 34 * s, 0], [cx - 18 * s, 0], [cx - 12 * s, 24 * t], [cx + 12 * s, 24 * t], [cx + 18 * s, 0], [cx + 34 * s, 0], [cx + 38 * s, 36 * t], [cx + 48 * s, 44 * t], [cx + 48 * s, 124 * t], [cx + 40 * s, 130 * t], [cx - 40 * s, 130 * t], [cx - 48 * s, 124 * t], [cx - 48 * s, 44 * t], [cx - 38 * s, 36 * t]]);
    biX_paint(m, 0, 0, VE, { rim: 2, fn: (i, j, e) => !e && Math.abs(i - cx) < 1 && j > 24 * t ? VE[0] : null });
    for (const sx of [-1, 1]) {
      for (let k = 0; k < 2; k++) { const px0 = cx + sx * (8 + k * 18) * s - (sx < 0 ? 16 * s : 0); biX_pRect(px0, 62 * t, 16 * s, 24 * t, VE, O); biX_pRect(px0, 62 * t, 16 * s, 7 * t, ST, O); }
      biX_pRect(cx + sx * 34 * s - (sx < 0 ? 14 * s : 0), 104 * t, 14 * s, 7 * t, ST, O);
    }
    biX_pRect(cx - 44 * s, 96 * t, 88 * s, 3 * t, ST, { L: [-1, -1], ol: false });
  });
}
function biX_maskArt() {
  return art('biX_gm', 22, 17, () => {
    const RB = biX_ramp('#3a3e44'), O = { L: [-1, -1] };
    biX_pPoly([[4, 4], [12, 0], [32, 0], [40, 4], [42, 16], [34, 28], [22, 33], [10, 28], [2, 16]], RB, { L: [-1, -1], rim: 2 });
    for (const x of [13, 31]) { biX_pEll(x, 12, 6, 5.4, biX_ramp('#8a9098'), O); biX_pEll(x, 12, 4.2, 3.8, biX_ramp('#3a7a8e'), { ol: false }); rect(x - 2, 10, 2, 1, '#c8eef4'); }
    biX_pEll(22, 25, 6, 6, biX_ramp('#5c6a44'), O); for (let k = -3; k <= 3; k += 2) rect(19, 25 + k, 7, 1, '#3e4a2e');
  });
}
function biX_bugArt() { return art('biX_bug', 7, 6, () => { biX_pEll(7, 7.5, 5.6, 4.4, biX_ramp('#a8acb4', 0.7), { rim: 1 }); biX_ell(7, 7.5, 2, 1.6, '#3a3c44'); rect(6, 6, 2, 2, '#ff5a3a'); rect(6, 6, 1, 1, '#ffd0a0'); biX_cap(10, 5, 13, 0, 0.5, '#c8ccd0'); }); }
function biX_roundArt() { return art('biX_rnd', 3, 7, () => { biX_pRect(0, 5, 6, 9, biX_ramp('#c89a40')); biX_pPoly([[1, 5], [1, 2], [3, 0], [5, 2], [5, 5]], biX_ramp('#b86a3c'), { L: [-1, -1], ol: false }); }); }
function biX_clipArt() { return art('biX_clp', 7, 14, () => { biX_pRect(0, 2, 14, 26, biX_ramp('#5a5e66'), { rim: 1 }); biX_pRect(3, 0, 8, 4, biX_ramp('#c89a40'), { L: [-1, -1] }); for (let y = 8; y < 26; y += 4) rect(3, y, 8, 1, '#3c3e46'); }); }
function biX_equip(kit, m, t, bare) {
  if (!bare) blit(biX_panelBg(), 173, 0); blit(biX_silArt(), 173, 0);
  if (kit.kevlar) { blit(biX_vestArt(50, 65), 250, 31); for (let i = 0; i < m.hits; i++) { const hx = 262 + (i * 17) % 30, hy = 50 + (i * 11) % 30; fine(() => { biX_pEll(hx * 2, hy * 2, 3, 3, biX_ramp('#9a9ea4')); biX_ell(hx * 2, hy * 2, 1, 1, '#1a1a20'); }); } }
  else for (let i = 0; i < m.hits; i++) { const hx = 266 + i * 8, hy = 56; fine(() => { biX_pEll(hx * 2 + 2, hy * 2 + 2, 5, 4, biX_ramp('#a0242a'), { ol: false }); biX_ell(hx * 2 + 4, hy * 2 + 9, 1, 2, '#8a1c22'); }); }
  if (kit.gasmask) blit(biX_maskArt(), 265, 12);
  if (kit.detector) { blit(biX_headsetArt(), 257, 0); fine(() => { for (const ex of [525, 581]) { g.fillStyle = (t * 3 | 0) % 2 ? '#ff4a3a' : '#ffd060'; g.fillRect(ex - 1, 0, 3, 3); } }); }
  const uzi = m.gun === 'uzi'; blit(biX_gunArt(uzi), uzi ? 188 : 183, uzi ? 37 : 38);
  // a gloved hand round the grip
  blit(biX_fistArt(), uzi ? 213 : 211, uzi ? 41 : 42);
  // grenade bandolier: three leather belts, the selected one lit
  blit(biX_bandolier(), 177, 1);
  ['frag', 'stun', 'gas'].forEach((k2, row) => {
    const y = 3 + row * 5, on = m.gtype === k2;
    if (on) fine(() => { g.fillStyle = 'rgba(255,196,90,0.28)'; g.fillRect(356, y * 2 - 2, 112, 10); g.fillStyle = '#ffc860'; g.fillRect(356, y * 2 - 2, 112, 1); g.fillRect(356, y * 2 + 7, 112, 1); g.fillRect(356, y * 2 - 2, 1, 10); g.fillRect(467, y * 2 - 2, 1, 10); });
    for (let n = 0; n < Math.min(8, m.gren[k2]); n++) blit(biX_grenArt(k2), 178.5 + n * 7, y - 1);
  });
  for (let n = 0; n < m.bugs; n++) blit(biX_bugArt(), 236 + (n % 2) * 9, 8 + Math.floor(n / 2) * 8);
  for (let n = 0; n < m.clip; n++) blit(biX_roundArt(), 178 + n * 5, 70);
  for (let n = 0; n < Math.min(4, m.clips); n++) blit(biX_clipArt(), 178 + n * 10, 80);
  if (kit.camera) {
    blit(biX_cameraArt(), 224, 71);
    rect(223, 86, 15, 9, '#0c140e'); frame(223, 86, 15, 9, '#3a4a3e'); text(String(m.film).padStart(2, '0'), 225, 87, '#7ce07a');
    blit(biX_filmArt(), 239, 85);
  }
  if (kit.safekit) blit(biX_safekitArt(), 248, 73);
}
function biX_bandolier() {
  return art('biX_band', 58, 17, () => {
    rect(0, 0, 116, 34, '#141018'); const LT = biX_ramp('#5a3a26');
    for (let row = 0; row < 3; row++) { const y = 2 + row * 10; biX_pRect(2, y + 3, 112, 6, LT, { L: [-1, -1] }); for (let n = 0; n < 8; n++) rect(14 + n * 14, y + 3, 1, 6, LT[0]); }
  });
}
function biX_headsetArt() { return art('biX_hset', 38, 22, () => { g.fillStyle = '#8a929c'; for (let a = 0; a <= 48; a++) { const an = Math.PI + a / 48 * Math.PI; g.fillRect(Math.round(38 + Math.cos(an) * 27), Math.round(34 + Math.sin(an) * 30), 3, 2); } for (const ex of [6, 62]) { biX_pRect(ex, 22, 10, 20, biX_ramp('#3a3e46')); rect(ex + 4, 1, 2, 21, '#9aa0a8'); } }); }
function biX_fistArt() { return art('biX_fist', 10, 9, () => { biX_pEll(10, 9, 8.5, 7.5, biX_ramp('#2e2c34')); for (const y of [5, 9, 13]) rect(12, y, 6, 1, '#1a1820'); }); }
function biX_filmArt() { return art('biX_film', 8, 10, () => { biX_pRect(0, 2, 14, 16, biX_ramp('#d8b030')); rect(2, 8, 10, 5, '#2a2a30'); rect(4, 0, 6, 3, '#6a6e76'); }); }

// ---------- static frames of the Break-In Display (layout sizes, painted on the fine grid) ----------
let biX_roomSeq = 0;
function biX_leftBg() {
  return art('biX_lbg', 171, 200, () => {
    vgrad(0, 0, 342, 400, ['#161c2a', '#10151f', '#0c1018']);
    g.fillStyle = '#18202e'; for (let x = 16; x < 342; x += 16) g.fillRect(x, 40, 1, 360); for (let y = 48; y < 400; y += 16) g.fillRect(0, y, 342, 1);
    g.fillStyle = '#1c2636'; for (let x = 64; x < 342; x += 64) g.fillRect(x, 40, 1, 360); for (let y = 96; y < 400; y += 64) g.fillRect(0, y, 342, 1);
    const gr = g.createRadialGradient(171, 214, 40, 171, 214, 260); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,8,0.55)'); g.fillStyle = gr; g.fillRect(0, 0, 342, 400);
  });
}
function biX_rightBg() {
  return art('biX_rbg', 149, 200, () => {
    rect(0, 0, 2, 400, '#56627e'); rect(2, 0, 2, 400, '#05070b');
    vgrad(4, 0, 290, 400, ['#1c2638', '#141b28', '#10151f']);
    rect(294, 0, 2, 400, '#05070b'); rect(296, 0, 2, 400, '#3a4660');
    rect(4, 196, 290, 2, '#0a0e16'); rect(4, 198, 290, 1, '#2e3a52');
  });
}
function biX_portraitFrame() {
  return art('biX_pfr', 25, 40, () => { rect(0, 0, 50, 80, '#07090e'); rect(1, 1, 48, 78, '#6a7690'); rect(3, 3, 46, 76, '#1a2030'); rect(2, 78, 47, 1, '#1a2030'); rect(48, 2, 1, 77, '#1a2030'); });
}
function biX_infoBar() {
  return art('biX_ibar', 145, 19, () => {
    rect(0, 0, 290, 38, '#07090e'); rect(1, 1, 288, 36, '#5a6682'); rect(2, 2, 287, 35, '#222a3c'); rect(3, 3, 285, 33, '#3e4a64');
    vgrad(4, 4, 282, 30, ['#1a2438', '#141c2c', '#101624']);
    rect(4, 17, 282, 1, '#0a0e18'); rect(4, 18, 282, 1, '#26324a');
  });
}
function biX_planFrame(w, h) {
  return art('biX_plan' + w + 'x' + h, w + 2, h + 2, () => {
    const W2 = 2 * w + 4, H2 = 2 * h + 4; rect(0, 0, W2, H2, '#07090e'); rect(1, 1, W2 - 2, H2 - 2, '#5a6682'); rect(2, 2, W2 - 3, H2 - 3, '#222a3c'); rect(3, 3, W2 - 6, H2 - 6, '#0b1424');
    g.fillStyle = '#101c30'; for (let x = 11; x < W2 - 3; x += 8) g.fillRect(x, 3, 1, H2 - 6); for (let y = 11; y < H2 - 3; y += 8) g.fillRect(3, y, W2 - 6, 1);
    const gr = g.createRadialGradient(W2 / 2, H2 / 2, 10, W2 / 2, H2 / 2, W2 * 0.7); gr.addColorStop(0, 'rgba(60,120,180,0.10)'); gr.addColorStop(1, 'rgba(0,0,10,0.35)'); g.fillStyle = gr; g.fillRect(3, 3, W2 - 6, H2 - 6);
  });
}
// the enemy mainframe's console: a CRT on the desk and its keyboard (layout 8..163 x 22..186)
function biX_terminalArt() {
  return art('biX_term', 155, 164, () => {
    vgrad(0, 0, 310, 328, ['#2a2024', '#1e181c']);
    const BZ = biX_ramp('#c8c0a8', 0.7);
    biX_pRect(0, 0, 310, 242, BZ, { rim: 2 }); biX_pRect(4, 4, 302, 226, biX_ramp('#aaa28a', 0.7), { L: [1, 1], ol: false });
    rect(8, 8, 294, 220, '#040c08'); const gr = g.createRadialGradient(155, 118, 20, 155, 118, 190); gr.addColorStop(0, 'rgba(40,120,70,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0.4)'); g.fillStyle = gr; g.fillRect(8, 8, 294, 220);
    for (const [x, y] of [[8, 8], [301, 8], [8, 227], [301, 227]]) rect(x, y, 1, 1, BZ[1]);
    rect(20, 232, 40, 5, '#8a826c'); rect(21, 233, 38, 1, '#e8e0c8');
    // keyboard
    const KB = biX_ramp('#bcb49a', 0.7); biX_pRect(0, 246, 314, 80, KB, { rim: 2 });
    for (let i = 0; i < 29; i++) {
      const x = (i % 13) * 24 + 4, y = 252 + Math.floor(i / 13) * 24, sp = i >= 26, ok = i === 28, kw = ok ? 68 : 20;
      rect(x + 1, y + 2, kw, 20, '#5a5444'); biX_pRect(x, y, kw, 19, biX_ramp(ok ? '#4a8a5a' : sp ? '#8a8474' : '#e6e0cc', 0.6), { rim: 1 });
    }
  });
}

// ---------- ARMORY art ----------
function biX_armoryBg(slots) {
  return art('biX_armory', 320, 172, () => {
    vgrad(0, 0, 320, 344, ['#34444a', '#2a383e', '#222e34']);
    g.fillStyle = '#2e3c42'; for (let x = 12; x < 320; x += 24) g.fillRect(x, 0, 1, 344);
    for (const s of slots) {
      const x = s.x * 2, y = (s.y + 8) * 2, w = s.w * 2, h = s.h * 2;
      rect(x - 2, y - 2, w + 4, h + 4, '#141c20'); rect(x - 2, y + h, w + 4, 2, '#56686e'); rect(x + w, y - 2, 2, h + 4, '#46585e');
      vgrad(x, y, w, h, ['#16261f', '#1e3229', '#223a30']);
      for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(4,8,10,' + (0.42 - k * 0.07) + ')'; g.fillRect(x, y + k, w, 1); g.fillRect(x + k, y, 1, h); }
      const gl = g.createRadialGradient(x + w / 2, y + h * 0.3, 2, x + w / 2, y + h * 0.3, w * 0.7); gl.addColorStop(0, 'rgba(255,230,180,0.10)'); gl.addColorStop(1, 'rgba(255,230,180,0)'); g.fillStyle = gl; g.fillRect(x, y, w, h);
      // steel shelf and the shadow it throws on the wall
      biX_pRect(x - 3, y + h, w + 6, 6, biX_ramp('#9aa4a8', 0.7), { rim: 1 });
      g.fillStyle = 'rgba(6,10,14,0.45)'; g.fillRect(x - 1, y + h + 6, w + 4, 3); g.fillStyle = 'rgba(6,10,14,0.2)'; g.fillRect(x, y + h + 9, w + 4, 3);
      for (const bx of [x + 6, x + w - 10]) biX_pRect(bx, y + h + 5, 4, 7, biX_ramp('#6a7478'), { rim: 1 });
    }
    for (const ux of [148, 316]) { biX_pRect(ux, 0, 6, 344, biX_ramp('#8a9498', 0.7), { rim: 1, ol: false }); g.fillStyle = '#3a4448'; for (let y = 6; y < 344; y += 12) g.fillRect(ux + 2, y, 2, 3); }
  });
}
function biX_armoryPanel() {
  return art('biX_armp', 160, 172, () => {
    rect(0, 0, 2, 344, '#05070b'); vgrad(2, 0, 318, 344, ['#1c2638', '#141b28', '#10151f']);
    biX_glow(160, 180, 180, 'rgb(120,160,220)', 0.1, true);
    // brass-edged title plate
    biX_pRect(4, 4, 312, 68, biX_ramp('#2a3244'), { rim: 2 }); rect(10, 10, 300, 56, '#161c28'); rect(10, 10, 300, 1, '#0a0e16'); rect(10, 65, 300, 1, '#34405a');
    for (const [x, y] of [[10, 10], [304, 10], [10, 60], [304, 60]]) { biX_pEll(x + 3, y + 3, 2.5, 2.5, biX_ramp('#a8aeb8', 0.6)); }
  });
}
const biX_BIGGREN = { frag: '#56663a', stun: '#c4c8cc', gas: '#6aa040' };
function biX_bigGrenArt(k) {
  return art('biX_bg_' + k, 7, 10, () => {
    const R_ = biX_ramp(biX_BIGGREN[k]), O = { L: [-1, -1] };
    if (k === 'frag') { biX_pEll(7, 12.5, 6.5, 7.5, R_, O); for (const y of [9, 13, 17]) rect(2, y, 10, 1, R_[1]); for (const x of [5, 9]) rect(x, 6, 1, 13, R_[1]); }
    else if (k === 'stun') { biX_pRect(2, 5, 10, 15, R_, O); rect(3, 10, 8, 3, '#e8c040'); }
    else { biX_pRect(1, 5, 12, 15, R_, O); rect(2, 11, 10, 1, R_[0]); rect(2, 14, 10, 2, '#d8e070'); }
    biX_pRect(4, 1, 6, 5, biX_ramp('#8a9098', 0.7), O); biX_pCap(10, 3, 12, 9, 0.8, biX_ramp('#8a9098', 0.7), { L: [-1, -1], ol: false }); biX_pEll(3, 3, 2, 2, biX_ramp('#c8ccd0', 0.6), O);
  });
}
// each shelf item is painted once into its own picture (80 x 64 layout, anchored at the middle of the shelf)
function armoryItem(k, cx, base) { blit(art('biX_ai_' + k, 80, 64, () => { g.scale(RES, RES); biX_armoryItemDraw(k, 40, 64); }), Math.round(cx) - 40, Math.round(base) - 64); }
function biX_armoryItemDraw(k, cx, base) {
  const peg = (x, y) => fine(() => { biX_pRect(2 * x - 1, 2 * y, 3, 8, biX_ramp('#9aa4a8', 0.6), { rim: 1 }); });
  switch (k) {
    case 'uzi': peg(cx - 14, base - 27); peg(cx + 12, base - 27); blit(biX_gunArt(true), cx - 30, base - 21); break;
    case 'camera': fine(() => { g.fillStyle = '#1a1a20'; for (let a = 0; a <= 24; a++) { const an = Math.PI + a / 24 * Math.PI; g.fillRect(Math.round(2 * cx - 4 + Math.cos(an) * 24), Math.round(2 * base - 24 + Math.sin(an) * 10), 2, 2); } }); blit(biX_cameraArt(), cx - 13, base - 14);
      fine(() => { biX_pRect(2 * cx + 26, 2 * base - 16, 14, 16, biX_ramp('#d8b030')); rect(2 * cx + 28, 2 * base - 11, 10, 5, '#2a2a30'); rect(2 * cx + 30, 2 * base - 18, 6, 3, '#6a6e76'); }); break;
    case 'bugs': fine(() => { biX_pRect(2 * cx - 64, 2 * base - 18, 128, 16, biX_ramp('#2a2a30'), { rim: 1 }); for (let n = 0; n < 6; n++) biX_ell(2 * cx - 53 + n * 20, 2 * base - 9, 7, 5, '#141418'); }); for (let n = 0; n < 6; n++) blit(biX_bugArt(), cx - 30 + n * 10, base - 8); break;
    case 'frag': case 'stun': case 'gas': for (let n = 0; n < 7; n++) blit(biX_bigGrenArt(k), cx - 31 + n * 9, base - 10); break;
    case 'gasmask': fine(() => { for (const s of [-1, 1]) biX_cap(2 * cx + s * 18, 2 * base - 22, 2 * cx + s * 10, 2 * base - 46, 1.2, '#26282e'); }); peg(cx, base - 25); blit(biX_maskArt(), cx - 11, base - 19); break;
    case 'detector': fine(() => {
      const X = 2 * cx, Y = 2 * base; g.fillStyle = '#8a929c'; for (let a = 0; a <= 40; a++) { const an = Math.PI + a / 40 * Math.PI; g.fillRect(Math.round(X + Math.cos(an) * 21), Math.round(Y - 20 + Math.sin(an) * 18), 3, 2); }
      for (const ex of [X - 27, X + 17]) { biX_pRect(ex, Y - 24, 10, 20, biX_ramp('#3a3e46')); rect(ex + 4, Y - 50, 2, 26, '#9aa0a8'); biX_ell(ex + 5, Y - 50, 2, 2, '#ff5a3a'); }
      biX_pRect(X - 10, Y - 18, 22, 18, biX_ramp('#4a4e56')); rect(X - 6, Y - 14, 14, 7, '#0c1a10'); rect(X - 5, Y - 12, 3, 1, '#7ae07a'); rect(X + 1, Y - 10, 4, 1, '#7ae07a'); rect(X + 5, Y - 6, 2, 2, '#ff5a3a');
    }); break;
    case 'kevlar': peg(cx, base - 56); fine(() => biX_cap(2 * cx - 18, 2 * base - 100, 2 * cx + 18, 2 * base - 100, 1.5, '#8a929c')); blit(biX_vestArt(40, 50), cx - 20, base - 51); break;
    case 'safekit': fine(() => { biX_pRect(2 * cx - 48, 2 * base - 70, 96, 20, biX_ramp('#5a3a24'), { rim: 2 }); rect(2 * cx - 42, 2 * base - 64, 84, 10, '#2a1a14'); rect(2 * cx - 42, 2 * base - 64, 84, 2, '#8a2a2a'); }); blit(biX_safekitArt(), cx - 23, base - 25); break;
  }
}
function biX_takenArt(tw) { return art('biX_tk' + tw, tw, 12, () => { biX_pRect(0, 0, 2 * tw, 24, biX_ramp('#3a4452'), { rim: 1 }); rect(3, 3, 2 * tw - 6, 18, '#161c26'); }); }
function biX_ledArt(on) { return art('biX_led' + (on ? 1 : 0), 7, 7, () => { rect(0, 0, 14, 14, '#07090e'); biX_pRect(1, 1, 12, 12, biX_ramp(on ? '#e8a830' : '#3a4250', 0.8), { rim: 1 }); }); }
function biX_armoryChrome() { return art('biX_achr', 320, 28, () => { vgrad(0, 0, 640, 56, ['#161c28', '#0e121a']); rect(0, 0, 640, 2, '#3a4660'); rect(0, 2, 640, 1, '#07090e'); rect(498, 18, 132, 32, '#07090e'); biX_pRect(500, 20, 128, 28, biX_ramp('#3c6a4a'), { rim: 2 }); }); }


// ------------------------------------------------------------------
function breakinScene(opts, done) {
  const level = opts.level || 0, occupant = opts.occupant || null, org = opts.org || ORGS[0];
  const mode = opts.mode || 'breakin'; // 'defend' = guard a jailed suspect, 'street' = ambush gunfight
  const kit = opts.kit || { uzi: false, camera: true, bugs: 0, gasmask: false, detector: false, kevlar: false, safekit: false, frag: 0, stun: 4, gas: 0 };
  const sk = skillLevel('combat');
  const uniC = org.uni || P.YE; // guards wear the organization's colours
  // persistent layout: the same seed builds the same building
  const saved = seed; if (opts.building && opts.building.seed) seed = opts.building.seed;
  const B = mode === 'street' ? genStreet() : genBuilding(level); const { F, occ } = mode === 'street' ? furnishStreet(B) : furnish(B, { occupant, level });
  seed = saved;
  const PWORDS = ['CONDOR', 'SPHINX', 'ORCHID', 'JACKAL', 'VORTEX', 'ZENITH', 'COBALT', 'PHOENIX', 'MIDNIGHT', 'TANGO', 'OMEGA', 'SCIMITAR', 'GRANITE', 'MONSOON', 'LANTERN'];
  const bld = opts.building || {};
  if (!bld.pw) { bld.pw = PWORDS[(bld.seed || ri(0, 999)) % PWORDS.length]; bld.pwKnown = bld.pw.split('').map(() => false); }
  const terminals = F.filter(f => f.type === 'terminal'); terminals.forEach((f, i) => f.letter = i % bld.pw.length);
  let comp = null; // the mainframe session overlay
  const people = [], bullets = [], grenades = [], clouds = [], fx = [], traps = [];
  const out = { clues: [], messages: 0, plan: false, personnel: false, evidence: null, alarm: false, bugged: false };
  let msg = 'Select the door to enter by.', t = 0, clock = hourOf(game.t || 0) * 3600 + ri(0, 3599), alarm = false, alarmT = 0, over = null, entryDoor = null, pauseMenu = null, pauseTitle = '';
  const say = m => { msg = m; };
  const max = { kind: 'max', x: 0, y: 0, dir: 0, walk: 0, hits: 0, maxHits: opts.maxHits || (kit.kevlar ? 4 : 2), gun: kit.uzi ? 'uzi' : 'pistol', clip: 6, clips: 3, cool: 0, gren: { frag: kit.frag, stun: kit.stun, gas: kit.gas }, gtype: 'stun', film: kit.camera ? 36 : 0, bugs: kit.bugs,
    crouch: false, disguised: false, stun: 0, gassed: 0, prisoner: null, busy: null };
  if (!max.gren.stun) max.gtype = max.gren.gas ? 'gas' : max.gren.frag ? 'frag' : 'stun';

  // ---------- geometry ----------
  const doorAt = (tx, ty) => B.doors.find(d => d.x === tx && d.y === ty);
  function solid(tx, ty, bullet) { const t = B.T[ty] && B.T[ty][tx]; if (t === undefined || t === T_WALL) return true; if (t === T_OUT) return false; if (t === T_DOOR) return !doorAt(tx, ty).open; if (occ[ty][tx] >= 0) { const f = FURN[F[occ[ty][tx]].type]; return bullet ? !!f.hide : !f.flat; } return false; }
  function blocked(x, y, r = 2.5) { for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) if (solid(Math.floor((x + dx) / TS), Math.floor((y + dy) / TS))) return true; return false; }
  function opaque(tx, ty) { const t = B.T[ty] && B.T[ty][tx]; if (t === undefined || t === T_WALL) return true; if (t === T_DOOR) return !doorAt(tx, ty).open; return false; }
  function los(x0, y0, x1, y1) { const d = dist(x0, y0, x1, y1), n = Math.ceil(d / 3); for (let i = 1; i < n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; if (opaque(Math.floor(x / TS), Math.floor(y / TS))) return false; } return true; }
  const roomOf = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); const r = B.R[ty] ? B.R[ty][tx] : -1; if (r >= 0 && r !== undefined) return r; const d = doorAt(tx, ty); return d ? d.a : -1; };
  const inside = (x, y) => { const row = B.T[Math.floor(y / TS)]; const t = row && row[Math.floor(x / TS)]; return t === T_FLOOR || t === T_DOOR; };
  function moveEnt(e, vx, vy, dt) { const nx = e.x + vx * dt, ny = e.y + vy * dt; if (!blocked(nx, e.y)) e.x = nx; else if (e !== max) openNear(nx, e.y); if (!blocked(e.x, ny)) e.y = ny; else if (e !== max) openNear(e.x, ny); }
  function openNear(x, y) { for (const [dx, dy] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { const d = doorAt(Math.floor((x + dx) / TS), Math.floor((y + dy) / TS)); if (d && !d.open && !d.outside) d.open = true; } }
  function pathTo(sx, sy, gx, gy) {
    const s = [Math.floor(sx / TS), Math.floor(sy / TS)], goal = [Math.floor(gx / TS), Math.floor(gy / TS)]; const key = (x, y) => y * B.MW + x; const prev = new Map([[key(...s), -1]]); const q = [s]; let ok = false, n = 0;
    while (q.length && n++ < 3000) { const [x, y] = q.shift(); if (x === goal[0] && y === goal[1]) { ok = true; break; } for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = key(nx, ny); if (prev.has(k)) continue; const t = B.T[ny] && B.T[ny][nx]; if (t !== T_FLOOR && t !== T_DOOR) continue; if (t === T_DOOR && doorAt(nx, ny).outside) continue; if (t === T_FLOOR && occ[ny][nx] >= 0 && !FURN[F[occ[ny][nx]].type].flat) continue; prev.set(k, key(x, y)); q.push([nx, ny]); } }
    if (!ok) return null; const o = []; let k = key(...goal); while (k !== -1 && k !== undefined) { o.unshift([(k % B.MW) * TS + 4, Math.floor(k / B.MW) * TS + 4]); k = prev.get(k); } return o;
  }
  function spot(room) { for (let i = 0; i < 80; i++) { const x = ri(room.x, room.x + room.w - 1), y = ri(room.y, room.y + room.h - 1); if (B.T[y][x] === T_FLOOR && occ[y][x] < 0 && !people.some(p => Math.abs(p.x - x * TS - 4) < 8 && Math.abs(p.y - y * TS - 4) < 8)) return [x * TS + 4, y * TS + 4]; } return [room.x * TS + 4, room.y * TS + 4]; }

  // ---------- people ----------
  function addGuard(room, st = 'patrol') { const [x, y] = spot(room); const g2 = { kind: 'guard', x, y, dir: rnd() * 7, walk: 0, state: st, out: false, stun: 0, cool: 1 + rnd(), home: room.id, path: null, pathT: 0, seeT: 0, gasmask: rnd() < 0.15 * level, gren: rnd() < 0.3 ? 1 : 0, col: uniC }; people.push(g2); return g2; }
  const important = B.rooms.filter(r => ['file', 'computer', 'cipher', 'exec'].includes(r.kind));
  const nGuards = mode !== 'breakin' ? 0 : Math.min(12, 3 + level * 2 + (opts.alert || 0) * 2 + Math.floor(B.rooms.length / 6));
  for (let i = 0; i < nGuards; i++) addGuard(rnd() < 0.5 && important.length ? pick(important) : pick(B.rooms), rnd() < 0.7 ? 'patrol' : 'idle');
  let target = null;
  if (occupant) { const seat = F.find(f => f.seat); const [x, y] = seat ? [seat.x * TS + 4, seat.y * TS + 4] : spot(B.exec); target = { kind: 'suspect', x, y, dir: -Math.PI / 2, walk: 0, state: 'seated', out: false, stun: 0, col: pick([P.W, P.MG, P.BL2]), path: null, pathT: 0, seeT: 0 }; people.push(target); }

  // ---------- entry ----------
  function enterAt(d) { entryDoor = d; d.open = true; const dx = d.side === 'W' ? 1 : d.side === 'E' ? -1 : 0, dy = d.side === 'N' ? 1 : d.side === 'S' ? -1 : 0; max.x = (d.x + dx) * TS + 4; max.y = (d.y + dy) * TS + 4; max.dir = Math.atan2(dy, dx); B.rooms[d.a].seen = true; say('Inside. Close the door behind you (E): guards notice open doors.'); sfx.select(); }
  if (mode === 'breakin' && B.outer.length === 1) enterAt(B.outer[0]);
  // ---------- prison defence and street ambush ----------
  let ward = null, raidLeft = 0, raidT = 0;
  function spawnRaider() {
    let x, y;
    if (mode === 'defend') { const d = pick(B.outer); d.open = true; x = (d.x + (d.side === 'W' ? 1 : d.side === 'E' ? -1 : 0)) * TS + 4; y = (d.y + (d.side === 'N' ? 1 : d.side === 'S' ? -1 : 0)) * TS + 4; }
    else { x = (rnd() < 0.5 ? 1 : B.MW - 2) * TS + 4; y = ri(5, B.MH - 7) * TS + 4; }
    people.push({ kind: 'guard', raider: true, x, y, dir: Math.atan2(max.y - y, max.x - x), walk: 0, state: mode === 'defend' ? 'raid' : 'hunt', out: false, stun: 0, cool: 1.2 + rnd(), home: Math.max(0, roomOf(x, y)), path: null, pathT: 0, seeT: 0, gasmask: rnd() < 0.2 * level, gren: rnd() < 0.3 ? 1 : 0, col: uniC });
    raidLeft--; sfx.tone(300, 0.15, 'square', 0.04, -100);
  }
  if (mode === 'defend') {
    const [wx, wy] = spot(B.exec); ward = { kind: 'ward', x: wx, y: wy, dir: Math.PI / 2, walk: 0, state: 'seated', out: false, stun: 0, col: P.W, path: null, pathT: 0, seeT: 0 }; people.push(ward);
    const [mx, my] = spot(B.exec); max.x = mx; max.y = my; entryDoor = { a: B.exec.id, dummy: true }; B.exec.seen = true;
    alarm = true; raidLeft = 4 + level * 2; raidT = 5; msg = 'Hold this room! Nobody reaches the prisoner.';
  }
  if (mode === 'street') {
    entryDoor = { a: 0, dummy: true }; alarm = true; raidLeft = 3 + level * 2; raidT = 1.5;
    let best = null; for (let k = 0; k < 60; k++) { const x = ri(8, B.MW - 9), y = ri(6, B.MH - 8); if (occ[y][x] < 0 && (!best || Math.abs(x - B.MW / 2) + Math.abs(y - B.MH / 2) < Math.abs(best[0] - B.MW / 2) + Math.abs(best[1] - B.MH / 2))) best = [x, y]; }
    max.x = best[0] * TS + 4; max.y = best[1] * TS + 4; msg = 'Ambush! Take cover behind the cars (C to crouch).';
  }

  // ---------- noise / alarm / sight ----------
  function noise(x, y, r) { for (const p of people) if (p.kind === 'guard' && !p.out && p.stun <= 0 && dist(p.x, p.y, x, y) < r && p.state !== 'attack') { p.state = 'investigate'; p.target = [x, y]; p.path = null; } }
  function raiseAlarm(why) {
    if (alarm) return; alarm = true; out.alarm = true; alarmT = 0; say(why + ' ALARM!'); sfx.alarm(); max.disguised = false;
    for (const p of people) if (p.kind === 'guard' && !p.out) { p.state = 'hunt'; p.path = null; }
    for (let i = 0; i < 1 + level; i++) { const d = pick(B.outer); const g2 = addGuard(B.rooms[d.a], 'hunt'); g2.x = (d.x + (d.side === 'W' ? 1 : d.side === 'E' ? -1 : 0)) * TS + 4; g2.y = (d.y + (d.side === 'N' ? 1 : d.side === 'S' ? -1 : 0)) * TS + 4; }
  }
  function coverNear() { const tx = Math.floor(max.x / TS), ty = Math.floor(max.y / TS); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const o = occ[ty + dy] && occ[ty + dy][tx + dx]; if (o >= 0 && !FURN[F[o].type].flat) return true; } return false; }
  function canSee(p, range = 80) {
    if (over) return false; const d = dist(p.x, p.y, max.x, max.y); if (d > range) return false;
    if (d > 10) { let a = Math.atan2(max.y - p.y, max.x - p.x) - p.dir; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) > 1.1) return false; }
    if (!los(p.x, p.y, max.x, max.y)) return false;
    if (max.crouch && coverNear() && d > 14) return false;
    return true;
  }

  // ---------- combat ----------
  function fire() {
    if (max.cool > 0 || max.stun > 0 || max.busy) return;
    if (max.clip <= 0) { if (max.clips > 0) { max.clips--; max.clip = 6; max.cool = 0.8; say('Reloading.'); sfx.tick(); } else { say('Out of ammunition.'); sfx.deny(); max.cool = 0.4; } return; }
    max.clip--; max.cool = max.gun === 'uzi' ? 0.25 : 0.55; max.fl = t;
    const n = max.gun === 'uzi' ? 3 : 1; for (let i = 0; i < n; i++) { const a = max.dir + (rnd() - 0.5) * (0.18 - sk * 0.03) + (i - 1) * 0.04; bullets.push({ x: max.x, y: max.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, mine: true, life: 0.7 }); }
    sfx.tone(180, 0.05, 'square', 0.04, -80); noise(max.x, max.y, 40);
    if (max.disguised) { max.disguised = false; say('Your disguise is blown.'); }
  }
  function knockOut(p) { if (p.out) return; p.out = true; p.stun = 0; if (p === target) say((occupant.known.name ? occupant.name : 'The suspect') + ' is out cold. Walk over him to grab him.'); }
  function stunP(p, s) { if (!p.out) p.stun = Math.max(p.stun, s); }
  function hurtMax() { if (over) return; max.hits++; hitFlash = 3; sfx.tone(120, 0.2, 'sawtooth', 0.08, -60); say('You are hit!'); if (max.hits >= max.maxHits) finish('captured'); }
  function explode(gr) {
    if (gr.type === 'gas') { clouds.push({ x: gr.x, y: gr.y, r: 3, t: 12, room: roomOf(gr.x, gr.y), trap: gr.trap }); sfx.hiss(); return; }
    fx.push({ k: 'boom', x: gr.x, y: gr.y, t: 0.5, type: gr.type }); sfx.boom(); if (gr.type === 'frag') { noise(gr.x, gr.y, 300); raiseAlarm('The explosion was heard.'); }
    for (const p of people) { if (p === ward) continue; const d = dist(p.x, p.y, gr.x, gr.y); if (d < 26 && los(gr.x, gr.y, p.x, p.y)) { if (gr.type === 'frag') knockOut(p); else stunP(p, 25 + rnd() * 20); } }
    const d = dist(max.x, max.y, gr.x, gr.y); if (!gr.trap && d < 26 && los(gr.x, gr.y, max.x, max.y) && !(max.crouch && coverNear())) { if (gr.type === 'frag') hurtMax(); else max.stun = 6; }
  }
  function throwG(range) {
    if (max.gren[max.gtype] <= 0) { say('No ' + GREN[max.gtype].name.toLowerCase() + ' grenades.'); sfx.deny(); return; }
    max.gren[max.gtype]--; const d = [24, 48, 72][range];
    grenades.push({ x: max.x, y: max.y, sx: max.x, sy: max.y, tx: max.x + Math.cos(max.dir) * d, ty: max.y + Math.sin(max.dir) * d, t: 0, z: 0, type: max.gtype }); sfx.tone(500, 0.1, 'triangle', 0.05, -200);
  }

  // ---------- traps: booby-trapped and remote-control grenades (F9 set, F8 detonate) ----------
  function setTrap(kind) {
    if (max.gren[max.gtype] <= 0) { say('No ' + GREN[max.gtype].name.toLowerCase() + ' grenades to rig.'); sfx.deny(); return; }
    const x = max.x + Math.cos(max.dir) * 7, y = max.y + Math.sin(max.dir) * 7;
    if (solid(Math.floor(x / TS), Math.floor(y / TS))) { say('No room to set a trap there.'); sfx.deny(); return; }
    max.gren[max.gtype]--; traps.push({ x, y, type: max.gtype, kind, arm: 1.2 }); sfx.tone(900, 0.05, 'square', 0.04);
    say(kind === 'booby' ? GREN[max.gtype].name + ' booby trap set. Mind your step - it only knows you.' : 'Remote-control ' + GREN[max.gtype].name.toLowerCase() + ' grenade set. Detonate with F8 (R).');
  }
  function detonate() {
    const rs = traps.filter(tr => tr.kind === 'remote' && !tr.done); if (!rs.length) { say('No remote-control grenades are set.'); sfx.deny(); return; }
    rs.forEach(tr => { tr.done = true; explode({ x: tr.x, y: tr.y, type: tr.type, trap: true }); }); say(rs.length > 1 ? 'You press the button. ' + rs.length + ' charges go off.' : 'You press the button.');
  }
  function openMenu(title, items) { pauseTitle = title; pauseMenu = Menu(items, 44, 52, 118); }
  const trapMenu = () => openMenu('Set Trap', [{ label: 'Booby Trap', go: () => { pauseMenu = null; setTrap('booby'); } }, { label: 'Remote Control', go: () => { pauseMenu = null; setTrap('remote'); } }, { label: 'Cancel', go: () => { pauseMenu = null; } }]);

  // ---------- examine / photograph / bug ----------
  function facing() {
    const fx_ = max.x + Math.cos(max.dir) * 7, fy = max.y + Math.sin(max.dir) * 7; const tx = Math.floor(fx_ / TS), ty = Math.floor(fy / TS);
    for (const p of people) if (!p.hidden && dist(p.x, p.y, fx_, fy) < 6) return { p };
    const d = doorAt(tx, ty); if (d) return { door: d };
    const o = occ[ty] && occ[ty][tx]; if (o >= 0) return { f: F[o] };
    // a door you just walked through can be closed behind you
    const back = B.doors.find(dd => dist(dd.x * TS + 4, dd.y * TS + 4, max.x, max.y) < 11); if (back) return { door: back };
    return {};
  }
  function examine() {
    if (max.busy || max.stun > 0) return;
    const { door, f, p } = facing();
    if (p === target && target && !target.out) { if (target.state === 'seated' || target.state === 'cower') { say('"Freeze," Max hissed. "Do what I say or I\'ll kill you. Understand?"'); target.state = 'captive'; max.prisoner = target; sfx.select(); target.alarmIn = 8; } return; }
    if (p && p === ward) { say('"Sit tight," Max tells the prisoner. "Your friends are not getting in."'); return; }
    if (p && p.out) { say('Out cold.'); return; }
    if (door) { door.open = !door.open; sfx.tone(door.open ? 220 : 180, 0.06); say(door.open ? 'Door opened.' : 'Door closed.'); return; }
    if (!f) { say('Nothing there.'); return; }
    const def = FURN[f.type];
    if (f.type === 'terminal') { const i = f.letter; bld.pwKnown[i] = true; sfx.tick(); say('Terminal. Password letter ' + (i + 1) + ' of ' + bld.pw.length + ' is "' + bld.pw[i] + '".  ' + pwPattern()); return; }
    if (f.type === 'computer') { openComputer(); return; }
    if (f.type === 'evidence' && f.content) { out.evidence = pick(game.crime ? game.crime.items : ['payoff money']); f.content = null; say('You pick up the ' + out.evidence + '!'); sfx.select(); raiseAlarm('The evidence is missing.'); return; }
    if (!def.open) { say(def.name + '.' + (def.bug && !f.bugged ? '    bug' : '')); return; }
    if (def.kit && !kit.safekit) { say(def.name + '. You need a safecracking kit.'); sfx.deny(); return; }
    if (f.opened) { say(def.name + ' open.' + (f.content === 'clue' && !f.photographed ? '    photo' : ' Nothing more here.')); return; }
    max.busy = { f, t: 0, need: def.open * (def.kit ? 1 - skillLevel('electronics') * 0.1 : 1) }; say((def.kit ? 'Cracking the ' : 'Opening the ') + def.name.toLowerCase() + '...');
  }
  // ---------- enemy computers: password, then search ----------
  const pwPattern = () => bld.pwKnown.map((k, i) => k ? bld.pw[i] : '_').join(' ');
  function openComputer() { comp = { stage: 'pw', input: '', lines: ['MAINFRAME ONLINE. ENTER PASSWORD.', 'Known letters: ' + pwPattern()], searches: 0, misses: 0 }; typing = true; sfx.select(); say('Mainframe computer. Type the password (F4).'); }
  function closeComputer(m) { comp = null; typing = false; if (m) say(m); }
  function compChar(ch) {
    if (!comp) return; if (ch === '') { comp.input = comp.input.slice(0, -1); return; }
    if (comp.stage === 'result') { comp.stage = 'search'; comp.input = ''; }
    if (comp.input.length < 18) comp.input += ch; sfx.tick();
  }
  function compEnter() {
    if (!comp) return;
    if (comp.stage === 'result') { comp.stage = 'search'; comp.input = ''; return; }
    if (comp.stage === 'pw') {
      if (comp.input === bld.pw) { comp.stage = 'search'; comp.input = ''; comp.lines = ['ACCESS GRANTED.', 'Search for a person, city, organization,', 'street address or item of evidence.']; sfx.success(); bld.pwKnown = bld.pw.split('').map(() => true); }
      else { closeComputer('ACCESS DENIED.'); raiseAlarm('The computer logs a bad password.'); }
      return;
    }
    const res = searchDB(comp.input.trim()); comp.stage = 'result';
    if (res.length) { comp.searches++; comp.lines = ['SEARCH: ' + comp.input, ...res]; res.forEach(r => out.clues.push(r)); sfx.select(); }
    else { comp.misses++; comp.lines = ['SEARCH: ' + comp.input, 'NO RECORDS FOUND.', comp.misses >= 3 ? 'SESSION TERMINATED.' : 'You may try again.']; sfx.deny(); }
    if (comp.searches >= 3 || comp.misses >= 3) comp.last = true;
  }
  function searchDB(q) {
    q = q.toUpperCase(); if (q.length < 3 || !game.crime) return [];
    const cr = game.crime, found = []; const add = s => { if (s && !found.includes(s)) found.push(s); };
    // people: a hit on the name gives the smoking gun - the role
    for (const p of cr.people) { const n = p.name.toUpperCase(); if (n.includes(q) || q.includes(n.split(' ')[1])) { learn(p, 'name'); learn(p, 'org'); learn(p, 'city'); const c = clueAbout(p, 'Enemy Computer', 'role'); add(p.name + ': ' + p.role + ', ' + p.org.name + ', ' + cityById(p.city).name + '.'); if (!p.known.hideout && rnd() < 0.6) { learn(p, 'hideout'); add('Works from ' + game.buildings[p.building].address + '.'); } } }
    // cities: organizations and suspects operating there
    for (const c of CITIES) if (c.name.toUpperCase().includes(q)) { for (const b of Object.values(game.buildings)) if (b.city === c.id && b.org && (b.org === org || cr.orgs.includes(b.org))) { b.known = true; b.orgKnown = true; add(b.org.name + ' office: ' + b.address + ', ' + c.name + '.'); } const ps = cr.people.filter(p => p.city === c.id); ps.forEach(p => { learn(p, 'city'); p.exists = true; }); if (ps.length) add(ps.length + ' of our associates operate in ' + c.name + '.'); }
    // organizations: their offices and people
    for (const o of ORGS) if (o.name.toUpperCase().includes(q) || o.short.toUpperCase() === q) { for (const b of Object.values(game.buildings)) if (b.org === o) { b.known = true; b.orgKnown = true; add(o.name + ': ' + b.address + ', ' + cityById(b.city).name + '.'); } cr.people.filter(p => p.org === o).forEach(p => { learn(p, 'name'); learn(p, 'org'); add(p.name + ' - member of the ' + o.name + '.'); }); }
    // street addresses
    for (const b of Object.values(game.buildings)) if (b.address.toUpperCase().includes(q) && b.org) { b.known = true; b.orgKnown = true; add(b.address + ' is used by the ' + b.org.name + '.'); const s = b.suspect !== null && b.suspect !== undefined ? cr.people[b.suspect] : null; if (s) { learn(s, 'face'); learn(s, 'name'); add('Resident: ' + s.name + '.'); } }
    // crime evidence
    for (const s of cr.steps) if (s.kind === 'item' && s.item.toUpperCase().includes(q)) { const p = cr.people[s.from]; learn(p, 'role'); learn(p, 'name'); s.known = true; add('The ' + s.item + ' is handled by ' + p.name + ' (' + p.role + ').'); }
    return found.slice(0, 7);
  }
  function opened(f) {
    f.opened = true; const def = FURN[f.type];
    if (f.content === 'ammo') { max.clips += 2; f.content = null; say(def.name + ' open. Two clips of ammunition!'); sfx.select(); return; }
    if (f.content === 'grenade') { const k = pick(['stun', 'gas', 'frag']); max.gren[k]++; f.content = null; say(def.name + ' open. A ' + GREN[k].name.toLowerCase() + ' grenade!'); sfx.select(); return; }
    if (f.content === 'message') { out.messages++; f.content = null; say('Wall safe open. A coded message behind some cash. Taken.'); sfx.select(); return; }
    if (f.content === 'plan') { out.plan = true; f.content = null; say('Floor safe open. A master plan of the operation!'); sfx.success(); return; }
    if (f.content === 'personnel') { out.personnel = true; f.content = null; say('Floor safe open. A personnel file!'); sfx.success(); return; }
    say(def.name + ' open. ' + (f.content === 'clue' ? 'Papers.    photo' : pick(['Office supplies.', 'Old invoices.', 'Files closed.', 'Nothing of interest.'])));
  }
  function photo() {
    if (max.busy) return; const { f } = facing();
    if (!kit.camera) { say('You have no camera.'); sfx.deny(); return; }
    if (max.film <= 0) { say('Out of film.'); sfx.deny(); return; }
    if (!f || !f.opened) { say('Open something first, then photograph it.'); return; }
    max.film--; sfx.tone(1800, 0.03); sfx.noise(0.05, 0.05, 3000);
    if (f.content === 'clue' && !f.photographed) {
      f.photographed = true; f.content = null;
      const pool = occupant && game.crime ? [occupant, ...game.crime.people.filter(q => q.parent === occupant.id || q.id === occupant.parent || game.crime.steps.some(s => (s.from === occupant.id && s.to === q.id) || (s.to === occupant.id && s.from === q.id)))] : [];
      const c = pool.length ? clueAbout(pick(pool), 'Photographed Documents', rnd() < 0.3 ? 'role' : undefined) : null;
      out.clues.push(c ? c.text : 'Routine documents of the ' + (org.name || 'organization') + '.'); say(c ? 'Photographed: ' + c.text : 'Photographed some routine papers.');
    } else say('Click. Nothing worth recording.');
  }
  function bug() {
    const { f } = facing();
    if (max.bugs <= 0) { say('No bugs left.'); sfx.deny(); return; }
    if (!f || !FURN[f.type].bug) { say('You cannot bug that.'); return; }
    const r = B.rooms[f.room]; if (r.bugged) { say('One bug per room is enough.'); return; }
    max.bugs--; r.bugged = true; f.bugged = true; out.bugged = true; say('Bug planted in the ' + FURN[f.type].name.toLowerCase() + '.'); sfx.select();
  }
  function finish(kind) { if (over) return; over = { kind, t: 0 }; ['escaped', 'held', 'won'].includes(kind) ? sfx.success() : sfx.fail(); }

  // ---------- AI ----------
  function ai(p, dt) {
    if (p.out || p === max.prisoner || p === ward) return;
    const resume = () => p.raider && ward ? 'raid' : alarm ? 'hunt' : 'investigate';
    if (p.stun > 0) { p.stun -= dt; if (p.stun <= 0 && p.kind === 'guard') { p.state = resume(); p.target = [max.x, max.y]; } return; }
    const sees = canSee(p, p.kind === 'suspect' ? 90 : 76);
    const walkTo = (tx, ty, sp) => { p.pathT -= dt; if (!p.path || p.pathT <= 0) { p.path = pathTo(p.x, p.y, tx, ty); p.pathT = 0.7; } if (!p.path || !p.path.length) return true; const [nx, ny] = p.path[0]; if (dist(p.x, p.y, nx, ny) < 2) { p.path.shift(); return !p.path.length; } p.dir = Math.atan2(ny - p.y, nx - p.x); moveEnt(p, Math.cos(p.dir) * sp, Math.sin(p.dir) * sp, dt); p.walk += dt; return false; };
    if (p.kind === 'suspect') { if (sees && !max.disguised && p.state === 'seated') { p.state = 'cower'; raiseAlarm((occupant.known.name ? occupant.name : 'The suspect') + ' sees you and hits a button.'); } return; }
    const sp = alarm ? 36 : 22;
    if (sees) {
      if (max.disguised && dist(p.x, p.y, max.x, max.y) > 16) p.seeT = 0;
      else { p.seeT += dt; p.last = [max.x, max.y]; if (p.seeT > (alarm ? 0 : 0.4) && p.state !== 'attack') { p.state = 'attack'; p.alertT = 0; if (max.disguised) { max.disguised = false; say('A guard sees through your disguise!'); } } }
    } else p.seeT = Math.max(0, p.seeT - dt);
    if (!alarm && p.state !== 'attack') { const body = people.find(q => q !== p && q.out && !q.hidden && dist(q.x, q.y, p.x, p.y) < 40 && los(p.x, p.y, q.x, q.y)); if (body) raiseAlarm('A guard finds a body.'); }
    switch (p.state) {
      case 'idle': p.idleT = (p.idleT || 3) - dt; if (p.idleT <= 0) { p.idleT = 3 + rnd() * 3; if (rnd() < 0.5) p.state = 'patrol'; else p.dir += Math.PI / 2; } break;
      case 'patrol': if (!p.wp) { const r = rnd() < 0.6 ? B.rooms[p.home] : (important.length && rnd() < 0.5 ? pick(important) : pick(B.rooms)); p.wp = spot(r); p.path = null; } if (walkTo(p.wp[0], p.wp[1], sp * 0.8)) { p.wp = null; if (rnd() < 0.4) { p.state = 'idle'; p.idleT = 2 + rnd() * 4; } } break;
      case 'investigate': if (!p.target || walkTo(p.target[0], p.target[1], sp)) { p.state = 'patrol'; p.target = null; } break;
      case 'hunt': if (walkTo(max.x, max.y, sp)) p.path = null; break;
      case 'raid': if (walkTo(ward.x, ward.y, sp)) p.path = null; break;
      case 'attack':
        p.alertT += dt; if (p.alertT > 2 && !alarm) raiseAlarm('A guard sounds the alarm.');
        if (sees) {
          p.dir = Math.atan2(max.y - p.y, max.x - p.x); p.cool -= dt;
          if (dist(p.x, p.y, max.x, max.y) > 36) { moveEnt(p, Math.cos(p.dir) * sp, Math.sin(p.dir) * sp, dt); p.walk += dt; }
          if (p.cool <= 0) { p.cool = 1.4 - level * 0.15 + rnd() * 0.8; if (p.gren && rnd() < 0.2 && dist(p.x, p.y, max.x, max.y) > 30) { p.gren--; grenades.push({ x: p.x, y: p.y, sx: p.x, sy: p.y, tx: max.x, ty: max.y, t: 0, z: 0, type: 'stun' }); } else { const a = p.dir + (rnd() - 0.5) * (0.3 - level * 0.04 + (max.crouch ? 0.15 : 0)); bullets.push({ x: p.x, y: p.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, mine: false, life: 0.8 }); p.fl = t; sfx.tone(160, 0.05, 'square', 0.04, -60); } }
        } else if (p.last) { if (walkTo(p.last[0], p.last[1], sp)) { p.state = resume(); p.target = [max.x, max.y]; } }
        break;
    }
    if (!p.out && dist(p.x, p.y, max.x, max.y) < 5 && (p.state === 'attack' || p.state === 'hunt') && !max.disguised) { knockOut(p); if (rnd() < 0.5) hurtMax(); say('Hand to hand! The guard goes down.'); sfx.noise(0.1, 0.12, 300); }
  }

  // ---------- update ----------
  const scene = {
    update(dt) {
      if (pauseMenu || !entryDoor) return;
      t += dt; if (over) { over.t += dt; return; }
      clock += dt * 6;
      if (max.stun > 0) max.stun -= dt;
      if (max.gassed > 0) max.gassed = Math.max(0, max.gassed - dt * 0.5);
      max.cool -= dt;
      const ax = comp ? { x: 0, y: 0 } : input.axis();
      if (max.busy) { if (ax.x || ax.y) { max.busy = null; say('Interrupted.'); } else { max.busy.t += dt; if ((max.busy.t * 5 | 0) !== ((max.busy.t - dt) * 5 | 0)) sfx.tick(); if (max.busy.t >= max.busy.need) { const f = max.busy.f; max.busy = null; opened(f); } } }
      else if (max.stun <= 0 && (ax.x || ax.y)) { const l = Math.hypot(ax.x, ax.y); max.dir = Math.atan2(ax.y, ax.x); const sp = (max.crouch ? 14 : 30) * (max.prisoner ? 0.8 : 1); moveEnt(max, ax.x / l * sp, ax.y / l * sp, dt); max.walk += dt; }
      if (input.held('fire') && !comp) fire();
      if (comp && people.some(p => p.kind === 'guard' && p.state === 'attack' && !p.out)) closeComputer('A guard! You jump away from the keyboard.');
      if (max.prisoner) { const p = max.prisoner; const d = dist(p.x, p.y, max.x, max.y); if (d > 8) { p.dir = Math.atan2(max.y - p.y, max.x - p.x); moveEnt(p, Math.cos(p.dir) * 34, Math.sin(p.dir) * 34, dt); p.walk += dt; if (d > 30) { p.x = max.x - Math.cos(max.dir) * 6; p.y = max.y - Math.sin(max.dir) * 6; } } if (p.alarmIn !== undefined) { p.alarmIn -= dt; if (p.alarmIn <= 0) { p.alarmIn = undefined; raiseAlarm('The kidnapping has been noticed.'); } } }
      for (const p of people) if (p.out && !p.hidden && dist(p.x, p.y, max.x, max.y) < 4) {
        if (p === target) { target.state = 'captive'; target.out = false; max.prisoner = target; say('You hoist the suspect over your shoulder. Get out!'); continue; }
        p.hidden = true; if (p.gren) { max.gren.stun += p.gren; p.gren = 0; } if (!alarm && !max.disguised) { max.disguised = true; say('You put on the guard\'s uniform. Disguised.'); } else say('You search the guard and hide the body.');
      }
      const rid = roomOf(max.x, max.y); if (rid >= 0) B.rooms[rid].seen = true;
      if (!inside(max.x, max.y)) finish(mode === 'defend' ? 'freed' : 'escaped');
      for (const gr of grenades) { gr.t += dt / 0.6; const k = Math.min(1, gr.t); const nx = gr.sx + (gr.tx - gr.sx) * k, ny = gr.sy + (gr.ty - gr.sy) * k; if (opaque(Math.floor(nx / TS), Math.floor(ny / TS))) gr.t = Math.max(gr.t, 1); else { gr.x = nx; gr.y = ny; } gr.z = Math.sin(k * Math.PI) * 10; if (gr.t >= 1.4) { gr.done = true; explode(gr); } }
      for (let i = grenades.length - 1; i >= 0; i--) if (grenades[i].done) grenades.splice(i, 1);
      for (const c of clouds) { c.t -= dt; c.r = Math.min(30, c.r + dt * 12); for (const p of people) if (dist(p.x, p.y, c.x, c.y) < c.r && !p.gasmask) stunP(p, 20); if (!c.trap && dist(max.x, max.y, c.x, c.y) < c.r && !kit.gasmask) { max.gassed += dt * 2; if (max.gassed > 2.5) { max.stun = 5; max.gassed = 0; say('You breathed the gas!'); } } }
      for (let i = clouds.length - 1; i >= 0; i--) if (clouds[i].t <= 0) clouds.splice(i, 1);
      for (const b of bullets) {
        for (let s = 0; s < 4 && !b.dead; s++) {
          b.x += b.vx * dt / 4; b.y += b.vy * dt / 4;
          if (solid(Math.floor(b.x / TS), Math.floor(b.y / TS), true)) { b.dead = true; fx.push({ k: 'spark', x: b.x, y: b.y, t: 0.1 }); break; }
          if (b.mine) { for (const p of people) { if (p.out || p === max.prisoner || p === ward) continue; if (dist(p.x, p.y, b.x, b.y) < 3.5) { b.dead = true; knockOut(p); fx.push({ k: 'hit', x: b.x, y: b.y, t: 0.15 }); break; } } }
          else if (dist(max.x, max.y, b.x, b.y) < 3.5) { b.dead = true; if (!(max.crouch && coverNear() && rnd() < 0.5)) hurtMax(); }
        }
        b.life -= dt; if (b.life <= 0) b.dead = true;
      }
      for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].dead) bullets.splice(i, 1);
      for (const f of fx) f.t -= dt; for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t <= 0) fx.splice(i, 1);
      for (const p of people) ai(p, dt);
      for (const tr of traps) { if (tr.done) continue; if (tr.arm > 0) { tr.arm -= dt; continue; } if (tr.kind === 'booby' && people.some(p => p.kind === 'guard' && !p.out && dist(p.x, p.y, tr.x, tr.y) < 7)) { tr.done = true; explode({ x: tr.x, y: tr.y, type: tr.type, trap: true }); } }
      for (let i = traps.length - 1; i >= 0; i--) if (traps[i].done) traps.splice(i, 1);
      if (mode !== 'breakin') {
        if (raidLeft > 0) { raidT -= dt; if (raidT <= 0) { spawnRaider(); raidT = mode === 'street' ? 2.5 + rnd() * 3 : 5 + rnd() * 3; if (mode === 'defend') say('Footsteps! Someone is in the building.'); } }
        const alive = people.filter(p => p.raider && !p.out);
        if (ward) { const wr = roomOf(ward.x, ward.y), mr = roomOf(max.x, max.y); if (alive.some(p => p.stun <= 0 && (dist(p.x, p.y, ward.x, ward.y) < 7 || (roomOf(p.x, p.y) === wr && mr !== wr)))) finish('freed'); }
        if (!raidLeft && !alive.length) finish(mode === 'street' ? 'won' : 'held');
      }
      if (alarm && mode === 'breakin') { alarmT += dt; if ((alarmT % 3) < dt) sfx.tone(1000, 0.3, 'square', 0.04); if (alarmT > 50 && !people.some(p => p.kind === 'guard' && !p.out && p.state === 'attack')) { alarm = false; say('The alarm has been switched off.'); for (const p of people) if (p.state === 'hunt') p.state = 'patrol'; } }
    },
  };

  // ---------- drawing: the Break-In Display ----------
  const VX0 = 8, VX1 = 163, VY0 = 42, VY1 = 172;
  let hitFlash = 0;
  function roomView() {
    const r = B.rooms[roomOf(max.x, max.y)] || B.rooms[entryDoor ? entryDoor.a : 0];
    const S = Math.max(6, Math.min(16, Math.floor(Math.min((VX1 - VX0 - 8) / r.w, (VY1 - VY0 - 8) / r.h))));
    const w = r.w * S, h = r.h * S; const ox = Math.floor((VX0 + VX1) / 2 - w / 2) - r.x * S, oy = Math.floor((VY0 + VY1) / 2 - h / 2) - r.y * S;
    return { r, S, ox, oy, sx: wx => ox + wx / TS * S, sy: wy => oy + wy / TS * S };
  }
  const night = isNight();
  const roomF = B.rooms.map(r => F.filter(f => f.room === r.id));
  const layers = new Map(), sd0 = (bld.seed || 7) % 997;
  // the static part of a room (floor, light, shadows, furniture, walls, doors) is painted once per room, scale and state
  function drawRoom(v) {
    const { r, S, ox, oy } = v, X0 = ox + r.x * S, Y0 = oy + r.y * S, w = r.w * S, h = r.h * S;
    const key = r.id + '|' + S + '|' + r.doors.map(d => d.open ? 1 : 0).join('') + '|' + roomF[r.id].map(furnState).join(',');
    let c = layers.get(key);
    if (!c) {
      if (layers.size > 40) layers.clear();
      const ak = 'biX_room' + (++biX_roomSeq); c = art(ak, w + 8, h + 8, () => paintRoom(v, X0, Y0, w, h)); artCache.delete(ak); layers.set(key, c);
    }
    fine(() => { g.fillStyle = 'rgba(0,0,6,0.45)'; g.fillRect(2 * X0 - 2, 2 * Y0 + 2, 2 * w + 16, 2 * h + 16); g.fillStyle = 'rgba(0,0,6,0.3)'; g.fillRect(2 * X0, 2 * Y0 + 4, 2 * w + 18, 2 * h + 18); });
    blit(c, X0 - 4, Y0 - 4);
  }
  function paintRoom(v, X0, Y0, w, h) {
    const { r, S } = v, F = 2 * S, FX = 2 * X0, FY = 2 * Y0, W2 = 2 * w, H2 = 2 * h, fs = roomF[r.id], street = r.kind === 'street';
    g.translate(8 - FX, 8 - FY);
    if (street) biX_streetArt(FX, FY, W2, H2, F, night); else { biX_floorArt(r.kind, FX, FY, W2, H2, F, r.id * 7 + sd0); biX_wallFace(FX, FY, W2, F, r.kind); }
    // one shadow mask for everything that stands on the floor, thrown to the south-east
    const m = biX_M(W2, H2), u = F / 16;
    for (const f of fs) {
      const k = biX_TALL[f.type]; if (!k || (f.type === 'evidence' && !f.content)) continue;
      const x = (f.x - r.x) * F + k * F * 0.55, y = (f.y - r.y) * F + k * F * 0.75, fw = f.w * F, fh = f.h * F;
      if (f.type === 'plant' || f.type === 'table' || f.type === 'bin') biX_mEll(m, x + fw / 2, y + fh / 2, fw / 2 - 2 * u, fh / 2 - 2 * u);
      else if (f.type === 'lamp') biX_mEll(m, x + fw / 2, y + fh * 0.2, 3 * u, 3 * u);
      else if (f.type === 'car') biX_mRect(m, x + fw * 0.04, y + fh * 0.14, fw * 0.92, fh * 0.72);
      else if (f.type === 'chair') biX_mEll(m, x + fw / 2, y + fh / 2, fw * 0.38, fh * 0.4);
      else biX_mRect(m, x + 1.5 * u, y + 1.5 * u, fw - 3 * u, fh - 3 * u);
    }
    g.fillStyle = street && night ? 'rgba(4,2,14,0.4)' : 'rgba(16,8,36,0.3)'; for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.a[j * m.w + i]) g.fillRect(FX + i, FY + j, 1, 1);
    for (const f of fs) drawFurn(f, v);
    if (street) {
      if (night) { g.fillStyle = 'rgba(8,10,36,0.34)'; g.fillRect(FX - 8, FY - 8, W2 + 16, H2 + 16); }
      if (night) biX_streetGlow(fs.filter(f => f.type === 'lamp').map(f => [2 * (v.ox + f.x * S) + F / 2, 2 * (v.oy + f.y * S) + (f.y > B.MH / 2 ? F * 0.2 : F * 0.8), F * 2.8]));
      else { const gr = g.createLinearGradient(FX, FY, FX + W2, FY + H2); gr.addColorStop(0, 'rgba(255,230,180,0.08)'); gr.addColorStop(1, 'rgba(20,10,50,0.16)'); g.fillStyle = gr; g.fillRect(FX - 8, FY - 8, W2 + 16, H2 + 16); }
    } else {
      biX_roomLight(FX, FY, W2, H2, F);
      biX_wallsArt(FX, FY, W2, H2); for (const d of r.doors) drawDoor(d, v, X0, Y0, w, h);
    }
  }
  function drawDoor(d, v, X0, Y0, w, h) {
    const S = v.S, F = 2 * S, dw = 2 * F, half = 2 * Math.floor(S / 2); let L; g.save();
    if (d.o === 'h') { const dx = 2 * (v.ox + d.x * S) - half; if (d.y < v.r.y) { g.translate(dx, 2 * Y0 - 8); L = [-1, -1]; } else { g.translate(dx + dw, 2 * (Y0 + h) + 8); g.rotate(Math.PI); L = [1, 1]; } }
    else { const dy = 2 * (v.oy + d.y * S) - half; if (d.x < v.r.x) { g.translate(2 * X0 - 8, dy + dw); g.rotate(-Math.PI / 2); L = [1, -1]; } else { g.translate(2 * (X0 + w) + 8, dy); g.rotate(Math.PI / 2); L = [-1, 1]; } }
    biX_doorArt(dw, d.open, d.outside, F, L); g.restore();
  }
  function furnState(f) {
    let s = f.opened ? 'o' : ''; if (f.type === 'evidence' && f.content) s += 'c';
    if ((f.type === 'chair' || f.type === 'couch' || f.type === 'desk') && B.rooms[f.room] && B.rooms[f.room].kind === 'exec') s += 'x';
    if (f.type === 'car') s += '_' + f.col; return s;
  }
  function wallSide(f) { const r = B.rooms[f.room]; if (!r || r.kind === 'street') return 'N'; if (f.y === r.y) return 'N'; if (f.y + f.h === r.y + r.h) return 'S'; if (f.x === r.x) return 'W'; if (f.x + f.w === r.x + r.w) return 'E'; return 'N'; }
  const WALLED = { file: 1, wallsafe: 1, picture: 1, typewriter: 1, terminal: 1, toilet: 1, sink: 1, computer: 1, couch: 1 };
  // run fn in the furniture's own frame (fine px): canonical sprite coordinates, turned to face away from its wall
  function inFurnFrame(f, v, fn) {
    const S = v.S, F = 2 * S, X = 2 * (v.ox + f.x * S), Y = 2 * (v.oy + f.y * S), w = f.w * F, h = f.h * F;
    let side = WALLED[f.type] ? wallSide(f) : f.type === 'lamp' && f.y > B.MH / 2 ? 'S' : 'N'; if (w !== h && (side === 'E' || side === 'W')) side = 'N';
    g.save(); let L = [-1, -1];
    if (f.type === 'car' && f.x % 2) { g.translate(X + w, Y); g.scale(-1, 1); L = [1, -1]; }
    else if (side === 'N') g.translate(X, Y);
    else { g.translate(X + w / 2, Y + h / 2); g.rotate({ E: Math.PI / 2, S: Math.PI, W: -Math.PI / 2 }[side]); g.translate(-w / 2, -h / 2); L = { E: [-1, 1], S: [1, 1], W: [1, -1] }[side]; }
    fn(w, h, L); g.restore();
  }
  function drawFurn(f, v) { inFurnFrame(f, v, (w, h, L) => g.drawImage(biX_furn(f.type, 2 * v.S, furnState(f), L), 0, 0)); }
  // the moving parts: tape reels, lamp panels, terminal text
  function animFurn(f, v) {
    const F = 2 * v.S;
    if (f.type === 'computer') fine(() => inFurnFrame(f, v, (w, h) => {
      const Lm = biX_mfLayout(w, h);
      Lm.reels.forEach((r, i) => { const a = t * (i ? 4.2 : -3.4); for (const s of [0, 2.1, 4.2]) { const rr = r.r * 0.66; g.fillStyle = '#c8ccd4'; g.fillRect(Math.round(r.x + Math.cos(a + s) * rr), Math.round(r.y + Math.sin(a + s) * rr), 2, 2); } });
      const cs = Math.max(3, Math.round(F / 7)), ph = t * 3 | 0;
      for (let yy = Lm.py + 1; yy + cs - 1 <= Lm.py + Lm.ph - 1; yy += cs) for (let xx = Lm.px + 1; xx + cs - 1 <= Lm.px + Lm.pw - 1; xx += cs) { const on = biX_hash(xx * 7 + yy, ph + ((xx * 3 + yy) >> 3), 8) < 0.5; g.fillStyle = on ? ['#ff6a4a', '#7ae07a', '#ffd060', '#e8f0ff'][(xx + yy * 3) % 4] : '#2a2a32'; g.fillRect(xx, yy, cs - 1, cs - 1); }
    }));
    if (f.type === 'terminal') fine(() => inFurnFrame(f, v, () => {
      const T = biX_termLayout(F), n = Math.max(1, Math.floor((T.h - 2) / 2)), cur = (t * 1.2 | 0) % (n + 1);
      g.fillStyle = 'rgba(70,200,110,0.16)'; g.fillRect(T.x, T.y, T.w, T.h);
      for (let k = 0; k < Math.min(cur + 1, n); k++) { const full = Math.max(1, Math.round((T.w - 3) * (0.35 + 0.6 * biX_hash(k, f.x * 31 + f.y, 3)))), ww = k === cur ? Math.min(full, 1 + ((t * 12 | 0) % full)) : full; g.fillStyle = k === cur ? '#b8f8b0' : '#5ac878'; g.fillRect(T.x + 1, T.y + 1 + k * 2, ww, 1); }
    }));
  }
  // ---------- people ----------
  const szOf = S => Math.round(clamp(S * 2.5, 20, 30));
  const faceOf = a => ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
  function look(p) {
    if (p === max) { const d = max.disguised; return { uni: d ? uniC : 'max', head: d ? 'cap' : 'hood', hair: P.K, arms: 'gun', gun: max.gun, mask: kit.gasmask && clouds.length > 0, strap: !d }; }
    if (p.kind === 'guard') return { uni: p.col || uniC, head: 'cap', hair: P.K, arms: 'gun', gun: 'pistol', mask: !!p.gasmask && clouds.length > 0 };
    if (p.kind === 'ward') return { uni: P.W, head: 'hair', hair: EGA.dgray, arms: 'side', stripes: true, pants: P.W };
    const fc = p === target && occupant && occupant.face || {};
    return { uni: p.col || P.W, head: 'hair', hair: fc.hair || EGA.brown, skin: fc.skin, pants: P.K, arms: (p.state === 'cower' || p.state === 'captive') ? 'up' : 'side' };
  }
  function muzzle(x, y, a, sz) { // fine px
    biX_glow(x, y, sz * 1.6, 'rgb(255,190,100)', 0.5, true);
    const f = (t * 30 | 0) % 2, l = sz * (f ? 0.62 : 0.46), c = Math.cos(a), s = Math.sin(a), wd = sz * 0.16;
    biX_poly([[x - s * wd, y + c * wd], [x + c * l, y + s * l], [x + s * wd, y - c * wd]], '#ff9a30');
    biX_poly([[x - s * wd * 0.5, y + c * wd * 0.5], [x + c * l * 0.65, y + s * l * 0.65], [x + s * wd * 0.5, y - c * wd * 0.5]], '#ffe070');
    for (const k of [-1, 1]) biX_cap(x, y, x + (c * 0.35 - s * k * 0.45) * l, y + (s * 0.35 + c * k * 0.45) * l, 0.8, '#ffc050');
    biX_ell(x, y, 2, 2, '#fffbe8');
  }
  function stars(x, y) { for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1, sx = Math.round(x + Math.cos(a) * 10), sy = Math.round(y + Math.sin(a) * 4); const c = ((t * 8) | 0) % 2 === i % 2 ? '#fff4b0' : '#ffd040'; g.fillStyle = c; g.fillRect(sx - 1, sy, 3, 1); g.fillRect(sx, sy - 1, 1, 3); g.fillStyle = '#ffffff'; g.fillRect(sx, sy, 1, 1); } }
  function drawGuy(p, X, Y, S) {
    const sz = szOf(S), L = look(p), cx = Math.round(X * 2), cy = Math.round(Y * 2);
    if (p.out) { if (p.hidden) return; const spr = biX_body(Object.assign({ sz, face: faceOf(p.dir) }, L)); fine(() => g.drawImage(spr, cx - spr.width / 2, cy - spr.height / 2)); return; }
    if (p._lw !== p.walk) { p._lw = p.walk; p._mt = t; }
    const moving = t - (p._mt === undefined ? -9 : p._mt) < 0.12, frame = moving ? 1 + ((p.walk * 7 | 0) % 4) : 0;
    const crouch = (p === max && max.crouch) || (p.state === 'seated' && (p === target || p === ward)), face = faceOf(p.dir);
    const spr = biX_person(Object.assign({ sz, face, frame: crouch ? 0 : frame, pose: crouch ? 'crouch' : 'stand' }, L));
    const fl = p === max ? max.fl : p.fl;
    fine(() => {
      g.drawImage(spr, cx - spr.width / 2, cy - spr.height / 2);
      if (L.arms === 'gun' && fl !== undefined && t - fl < 0.07) { const a = face * Math.PI / 4, r = sz * (L.gun === 'uzi' ? 0.92 : 0.82); muzzle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, a, sz); }
      if (p.stun > 0 || (p === max && max.stun > 0)) stars(cx, cy - sz * 0.55);
      if (p === target && p.state === 'seated') { const by = cy - sz * 0.9 - ((t * 3 | 0) % 2) * 2; biX_poly([[cx - 6, by - 6], [cx + 6, by - 6], [cx, by + 1]], biX_C.ink); biX_poly([[cx - 4, by - 5], [cx + 4, by - 5], [cx, by - 1]], '#ffd040'); }
    });
  }
  scene.draw = function () {
    blit(biX_leftBg(), 0, 0); blit(biX_rightBg(), 171, 0);
    drawEquip();
    drawBuildingWindow(179, 99, 122, 98);
    if (!entryDoor) { drawDoorMenu(); postFlash(); return; }
    const v = roomView(), r = v.r, S = v.S, X0 = v.ox + r.x * S, Y0 = v.oy + r.y * S;
    drawRoom(v);
    for (const f of roomF[r.id]) if (f.type === 'computer' || f.type === 'terminal') animFurn(f, v);
    g.save(); g.beginPath(); g.rect(X0 - 4, Y0 - 4, r.w * S + 8, r.h * S + 8); g.clip();
    fine(() => {
      for (const tr of traps) if (roomOf(tr.x, tr.y) === r.id) {
        const X = Math.round(v.sx(tr.x) * 2), Y = Math.round(v.sy(tr.y) * 2), on = (t * 3 | 0) % 2;
        if (tr.kind === 'booby') { g.fillStyle = 'rgba(220,220,230,0.7)'; g.fillRect(X + 4, Y + 3, Math.round(S * 1.2), 1); }
        g.drawImage(biX_grenArt(tr.type), X - 6, Y - 5);
        if (on) { biX_glow(X, Y - 6, 6, tr.kind === 'booby' ? 'rgb(255,70,50)' : 'rgb(90,220,255)', 0.8, true); g.fillStyle = tr.kind === 'booby' ? '#ff5a4a' : '#7ae8ff'; g.fillRect(X - 1, Y - 7, 2, 2); }
      }
    });
    // people: the fallen first, then everyone else from north to south
    const here = people.filter(p => roomOf(p.x, p.y) === r.id || p === max.prisoner).concat([max]);
    for (const p of here) if (p.out) drawGuy(p, v.sx(p.x), v.sy(p.y), S);
    for (const p of here.filter(p => !p.out).sort((a, b) => a.y - b.y)) drawGuy(p, v.sx(p.x), v.sy(p.y), S);
    if (clouds.some(c => c.room === r.id)) fine(() => {
      for (const c of clouds) if (c.room === r.id) { const rad = Math.max(8, Math.round(c.r / TS * S * 2 / 4) * 4), spr = biX_gasArt(rad, (t * 2.5 | 0) % 8); g.drawImage(spr, Math.round(v.sx(c.x) * 2) - rad - 1, Math.round(v.sy(c.y) * 2) - rad - 1); }
    });
    fine(() => {
      for (const b of bullets) if (roomOf(b.x, b.y) === r.id) { const X = v.sx(b.x) * 2, Y = v.sy(b.y) * 2, l = Math.hypot(b.vx, b.vy) || 1, tl = Math.max(5, S * 0.9), dx = b.vx / l, dy = b.vy / l; biX_cap(X - dx * tl, Y - dy * tl, X - dx * tl * 0.4, Y - dy * tl * 0.4, 0.6, b.mine ? '#c88a30' : '#b8402a'); biX_cap(X - dx * tl * 0.5, Y - dy * tl * 0.5, X, Y, 0.8, b.mine ? '#ffe070' : '#ff8a50'); g.fillStyle = '#fffbe8'; g.fillRect(Math.round(X) - 1, Math.round(Y) - 1, 2, 2); }
      for (const gr of grenades) if (roomOf(gr.x, gr.y) === r.id) {
        const X = Math.round(v.sx(gr.x) * 2), Y = Math.round(v.sy(gr.y) * 2), z = Math.round(gr.z * 2);
        biX_ell(X, Y + 2, 4, 2, 'rgba(10,6,24,0.4)');
        if (gr.t < 1) for (const dk of [0.08, 0.16, 0.24]) { const kk = gr.t - dk; if (kk <= 0) continue; g.fillStyle = 'rgba(230,230,240,' + (0.5 - dk * 1.5) + ')'; g.fillRect(Math.round(v.sx(gr.sx + (gr.tx - gr.sx) * kk) * 2) - 1, Math.round((v.sy(gr.sy + (gr.ty - gr.sy) * kk) - Math.sin(kk * Math.PI) * 10) * 2) - 1, 2, 2); }
        g.drawImage(biX_grenArt(gr.type), X - 6, Y - z - 6);
        if (gr.t >= 1 && (t * 12 | 0) % 2) { g.fillStyle = '#ffe070'; g.fillRect(X - 1, Y - z - 9, 2, 2); }
      }
      for (const e of fx) {
        const X = Math.round(v.sx(e.x) * 2), Y = Math.round(v.sy(e.y) * 2);
        if (e.k === 'boom') {
          const age = 0.5 - e.t, fi = Math.max(0, Math.min(7, Math.floor(age / 0.5 * 8))), rad = Math.max(16, Math.round(26 / TS * S * 1.6));
          if (fi < 3) biX_glow(X, Y, rad * 2.2, e.type === 'frag' ? 'rgb(255,170,80)' : 'rgb(190,230,255)', 0.55 - fi * 0.15, true);
          const spr = biX_boomArt(e.type === 'frag' ? 'frag' : 'stun', fi, rad); g.drawImage(spr, X - rad - 1, Y - rad - 1);
          if (e.type === 'frag') for (let i = 0; i < 14; i++) { const a = i * 2.4 + biX_hash(i, X, 15) * 0.8, sp = (0.5 + biX_hash(i, Y, 14) * 0.9) * rad * 1.5, d = sp * Math.min(1, age * 3.2), lift = Math.sin(Math.min(1, age * 2.4) * Math.PI) * 8; g.fillStyle = ['#c8c0b0', '#8a5a34', '#2a2228', '#ffd060', '#fff4d0'][i % 5]; g.fillRect(Math.round(X + Math.cos(a) * d), Math.round(Y + Math.sin(a) * d - lift), 2, 2); }
        } else if (e.k === 'hit') { for (const [dx, dy, c] of [[0, 0, '#d82a2a'], [3, -2, '#a01c22'], [-2, 3, '#a01c22'], [2, 3, '#e84a3a'], [-3, -2, '#a01c22']]) { g.fillStyle = c; g.fillRect(X + dx - 1, Y + dy - 1, 2, 2); } }
        else { g.fillStyle = '#fffbe0'; g.fillRect(X - 1, Y - 1, 2, 2); if (e.t > 0.05) { g.fillStyle = '#ffd060'; g.fillRect(X - 4, Y, 3, 1); g.fillRect(X + 2, Y, 3, 1); g.fillRect(X, Y - 4, 1, 3); g.fillRect(X, Y + 2, 1, 3); } }
      }
    });
    if (alarm && mode === 'breakin') { const k = 0.5 + 0.5 * Math.sin(t * 8); g.fillStyle = 'rgba(220,30,20,' + (0.05 + k * 0.1).toFixed(3) + ')'; g.fillRect(X0 - 4, Y0 - 4, r.w * S + 8, r.h * S + 8); }
    g.restore();
    if (max.busy) { const X = Math.round(v.sx(max.x)), Y = Math.round(v.sy(max.y)); rect(X - 10, Y - 15, 20, 5, '#0a0a12'); rect(X - 9, Y - 14, 18, 3, '#2a3040'); const n = Math.round(18 * Math.min(1, max.busy.t / max.busy.need)); rect(X - 9, Y - 14, n, 3, '#4aa860'); fine(() => { g.fillStyle = '#9ae8a0'; g.fillRect(2 * X - 18, 2 * Y - 28, 2 * n, 1); }); }
    const tgt = people.find(p => p.kind === 'guard' && !p.out && roomOf(p.x, p.y) === r.id && Math.abs(Math.atan2(Math.sin(Math.atan2(p.y - max.y, p.x - max.x) - max.dir), Math.cos(Math.atan2(p.y - max.y, p.x - max.x) - max.dir))) < 0.3 && los(max.x, max.y, p.x, p.y));
    // Max portrait, x0..24 y0..39
    blit(biX_portraitFrame(), 0, 0); blit(biX_portraitBg(), 1, 1); drawMaxSide(1, 1, tgt);
    if (max.stun > 0 || max.gassed > 0.4) { const k = Math.min(1, Math.max(max.stun / 6, max.gassed / 2.5)), y0 = 1 + Math.round(38 * (1 - k)); rect(1, y0, 23, 39 - y0, max.gassed > 0.4 ? 'rgba(110,170,60,0.5)' : 'rgba(40,40,70,0.55)'); }
    // information bar, x26..170 y0..18
    blit(biX_infoBar(), 26, 0);
    text(fitText(ROOM_NAMES[r.kind], 78), 30, 2, '#f0e8d8');
    const hh = Math.floor(clock / 3600) % 24, mm = Math.floor(clock / 60) % 60, ss = Math.floor(clock) % 60;
    if (max.disguised || max.gassed > 0.4) text(max.gassed > 0.4 ? 'GAS' : 'Disguise', 102, 2, '#ff6a50');
    textR([hh, mm, ss].map(v2 => String(v2).padStart(2, '0')).join(':'), 167, 2, '#ffc860');
    textC(fitText(msg, 138), 98, 10, '#e4e8f0');
    if (msgLong()) { const ls = wrap(msg, 146); msgBox(12, 20, 150, ls.length * 8 + 6); ls.forEach((l, i) => text(l, 16, 23 + i * 8, P.W)); }
    if (alarm && mode === 'breakin') { const on = (t * 4 | 0) % 2; fine(() => { const x = 2 * X0 - 10, y = 2 * Y0 - 10, w = 2 * r.w * S + 20, h = 2 * r.h * S + 20; for (const [d, c] of [[0, on ? '#ff5a40' : '#8a1a18'], [1, on ? '#c02820' : '#5a1010'], [2, 'rgba(255,60,40,0.35)']]) { g.fillStyle = c; g.fillRect(x - d, y - d, w + 2 * d, 1); g.fillRect(x - d, y + h - 1 + d, w + 2 * d, 1); g.fillRect(x - d, y - d, 1, h + 2 * d); g.fillRect(x + w - 1 + d, y - d, 1, h + 2 * d); } }); }
    if (comp) drawComputer();
    if (over) drawOver();
    if (pauseMenu) { msgBox(30, 40, 136, 18 + pauseMenu.items.length * 8); text(pauseTitle, 36, 43, P.W); pauseMenu.draw(); }
    postFlash();
  };
  let lastMsg = '', msgT0 = 0;
  function msgLong() { if (msg !== lastMsg) { lastMsg = msg; msgT0 = t; } return textW(msg) > 138 && t - msgT0 < 4; }
  function postFlash() { // being hit washes the screen red for a moment
    if (hitFlash <= 0) return; g.fillStyle = 'rgba(220,40,30,' + (0.12 * hitFlash).toFixed(2) + ')'; g.fillRect(0, 0, W, H); hitFlash--;
  }
  // ---------- Max, side view (top-left box) ----------
  function drawMaxSide(x, y, tgt) {
    const mv = input.axis(); const moving = (mv.x || mv.y) && !max.busy && max.stun <= 0 && !comp; const fr = max.crouch ? 'c' : moving ? 1 + ((t * 6 | 0) % 2) : 0;
    const mask = kit.gasmask && clouds.length > 0;
    blit(biX_maxSide(fr, max.disguised, uniC, max.gun === 'uzi', mask), x, y);
    if (max.fl !== undefined && t - max.fl < 0.07) fine(() => { const fy = 2 * y + biX_MAXPOSE[fr].sh[1] + 2, fx = 2 * x + (max.gun === 'uzi' ? 46 : 46); biX_glow(fx - 2, fy, 10, 'rgb(255,190,100)', 0.6, true); biX_poly([[fx - 4, fy - 3], [fx + 2, fy], [fx - 4, fy + 3]], '#ffc050'); biX_ell(fx - 4, fy, 1, 1, '#fffbe8'); });
    if (tgt) {
      const q = Math.min(1, (0.3 + sk * 0.2) * (max.gun === 'uzi' ? 1.4 : 1)); const col = q > 0.8 ? '#ff5a40' : q > 0.5 ? '#ffb040' : q > 0.3 ? '#e8d890' : '#8a8a90';
      fine(() => { const cx = 38, cy = 10; g.fillStyle = biX_C.ink; for (const [dx, dy, w, h] of [[-7, -1, 4, 3], [4, -1, 4, 3], [-1, -7, 3, 4], [-1, 4, 3, 4]]) g.fillRect(cx + dx, cy + dy, w, h); g.fillStyle = col; for (const [dx, dy, w, h] of [[-6, 0, 3, 1], [4, 0, 3, 1], [0, -6, 1, 3], [0, 4, 1, 3]]) g.fillRect(cx + dx, cy + dy, w, h); g.fillStyle = (t * 4 | 0) % 2 ? '#ff5a40' : col; g.fillRect(cx, cy, 1, 1); });
    }
  }
  // ---------- Equipment Display: the kit on Max's silhouette ----------
  const drawEquip = () => biX_equip(kit, max, t);
  function drawBuildingWindow(x, y, w, h) {
    blit(biX_planFrame(w, h), x - 1, y - 1);
    const sc = Math.min((w - 6) / B.bw, (h - 6) / B.bh), ox = x + 3 - B.bx * sc + ((w - 6) - B.bw * sc) / 2, oy = y + 3 - B.by * sc;
    fine(() => {
      const X = v => Math.round(v * 2), box = (r, c) => { g.fillStyle = c; g.fillRect(X(ox + r.x * sc), X(oy + r.y * sc), X(ox + (r.x + r.w) * sc) - X(ox + r.x * sc), X(oy + (r.y + r.h) * sc) - X(oy + r.y * sc)); };
      const edge = (r, c) => { const x0 = X(ox + r.x * sc) - 1, y0 = X(oy + r.y * sc) - 1, x1 = X(ox + (r.x + r.w) * sc), y1 = X(oy + (r.y + r.h) * sc); g.fillStyle = c; g.fillRect(x0, y0, x1 - x0 + 1, 1); g.fillRect(x0, y1, x1 - x0 + 1, 1); g.fillRect(x0, y0, 1, y1 - y0 + 1); g.fillRect(x1, y0, 1, y1 - y0 + 1); };
      if (opts.plan) { box({ x: B.bx, y: B.by, w: B.bw, h: B.bh }, '#1a2c44'); for (const r of B.rooms) if (!r.seen) { box(r, '#13233a'); edge(r, '#3a5a7a'); } }
      for (const r of B.rooms) if (r.seen) {
        box(r, B.street ? '#2a303c' : r.id === roomOf(max.x, max.y) && entryDoor ? '#2a6484' : '#1e4c68'); edge(r, '#8cd0ec');
        for (const f of roomF[r.id]) { const c = f.type === 'car' ? biX_tone(f.col) : { desk: '#c08a50', file: '#8a9a90', chair: '#6a86b0', couch: '#c05a44', computer: '#e8ecf0', terminal: '#9ae8a0', floorsafe: '#ffc860', wallsafe: '#ffc860', table: '#b07a50' }[f.type] || '#6a8aa0'; g.fillStyle = c; g.fillRect(X(ox + f.x * sc) + 1, X(oy + f.y * sc) + 1, Math.max(2, X(f.w * sc) - 2), Math.max(2, X(f.h * sc) - 2)); }
      }
      for (const d of B.doors) if (d.open && (B.rooms[d.a].seen || (d.b >= 0 && B.rooms[d.b].seen))) { g.fillStyle = '#1e4c68'; g.fillRect(X(ox + d.x * sc), X(oy + d.y * sc), Math.max(2, X(sc)), Math.max(2, X(sc))); }
      for (const d of B.outer) { g.fillStyle = '#ffb040'; g.fillRect(X(ox + d.x * sc) - 1, X(oy + d.y * sc) - 1, 3, 3); }
      for (const p of people) { if (p.out || p.kind !== 'guard') continue; const near = kit.detector && dist(p.x, p.y, max.x, max.y) < 110; const rr = B.rooms[roomOf(p.x, p.y)]; if (near || (rr && rr.bugged)) { const gx = X(ox + p.x / TS * sc), gy = X(oy + p.y / TS * sc); g.fillStyle = 'rgba(255,220,80,0.35)'; g.fillRect(gx - 2, gy - 2, 5, 5); g.fillStyle = '#ffe060'; g.fillRect(gx - 1, gy - 1, 3, 3); } }
      if (entryDoor && (t * 3 | 0) % 2) { const mx = X(ox + max.x / TS * sc), my = X(oy + max.y / TS * sc); g.fillStyle = '#0a0a12'; g.fillRect(mx - 2, my - 2, 5, 5); g.fillStyle = '#ffffff'; g.fillRect(mx - 1, my - 1, 3, 3); }
    });
  }
  const doorMenu = B.outer.length && Menu(B.outer.map((d, i) => ({ label: 'Door #' + (i + 1), go: () => enterAt(d) })), 46, 70, 80);
  function drawDoorMenu() { msgBox(28, 58, 110, 16 + B.outer.length * 8); text('Which door?', 34, 61, P.W); doorMenu.draw(); const sc = Math.min(116 / B.bw, 92 / B.bh), ox = 182 - B.bx * sc + (116 - B.bw * sc) / 2, oy = 102 - B.by * sc; B.outer.forEach((d, i) => text(String(i + 1), ox + d.x * sc - 2, oy + d.y * sc - 4, '#ffc860', P.K)); }
  function drawComputer() {
    blit(biX_terminalArt(), 8, 22);
    const on = (t * 3 | 0) % 2;
    let y = VY0 - 14; for (const l of comp.lines) { y = para(l, VX0 + 8, y, VX1 - VX0 - 16, '#8cf09a', 8) + 1; if (y > VY0 + 70) break; }
    const prompt = comp.stage === 'pw' ? 'PASSWORD: ' : 'SEARCH: ';
    if (comp.stage !== 'result') text(prompt + comp.input + (on ? '_' : ''), VX0 + 8, VY0 + 76, '#ffd070');
    else text(comp.last ? 'Enter: log off' : 'Type again, or Esc: log off', VX0 + 8, VY0 + 76, '#6ab87a');
    fine(() => { g.fillStyle = 'rgba(0,0,0,0.16)'; for (let yy = 2 * 28; yy < 2 * 132; yy += 2) g.fillRect(2 * 14, yy, 2 * 143, 1); g.fillStyle = on ? '#5aff7a' : '#1a5a2a'; g.fillRect(2 * 150, 2 * 136, 3, 3); });
    // the keyboard
    const K = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < 29; i++) {
      const x = 10 + (i % 13) * 12, yy = 148 + Math.floor(i / 13) * 12, sp = i >= 26, ok = i === 28, kw = ok ? 34 : 10;
      textC(i < 26 ? K[i] : ['_', '<', 'ENTER'][i - 26], x + (kw >> 1), yy + 2, ok ? '#f4fff0' : sp ? '#e8e4d8' : '#3a3630');
    }
  }
  function drawOver() {
    const k = over.kind; const lines = [{ escaped: mode === 'street' ? 'You sprint off down the street and lose them.' : 'You quickly slip out of the building.', captured: 'You slump to the ground, overcome by your wounds.', abort: mode === 'breakin' ? 'You abandon the mission.' : 'You run for it.', held: 'The last raider goes down. The prisoner stays behind bars.', freed: 'The raiders reach the cell and spirit the prisoner away.', won: 'The hit squad is down. The street goes quiet.' }[k]];
    if (mode !== 'breakin') { if (k === 'captured' && ward) lines.push('The prisoner is freed.'); const ls = lines.flatMap(l => wrap(l, 136)); msgBox(14, 60, 144, ls.length * 8 + 20); ls.forEach((l, i) => text(l, 18, 64 + i * 8, P.W)); if (over.t > 0.8) text('Press a key', 18, 66 + ls.length * 8, P.G3); return; }
    if (max.prisoner && k === 'escaped') lines.push('Your prisoner comes with you: ' + (occupant.known.name ? occupant.name : 'the suspect') + '.');
    if (k === 'captured' && max.prisoner) lines.push('Your prisoner escapes.');
    lines.push('Clues photographed: ' + out.clues.length + (out.messages ? '. Coded messages: ' + out.messages : '.'));
    if (out.plan) lines.push('Master plan recovered.'); if (out.personnel) lines.push('Personnel file recovered.'); if (out.evidence) lines.push('Evidence taken: ' + out.evidence + '.'); if (out.bugged) lines.push('The building is bugged.');
    const ls = lines.flatMap(l => wrap(l, 136)); msgBox(14, 60, 144, ls.length * 8 + 20); ls.forEach((l, i) => text(l, 18, 64 + i * 8, P.W));
    if (over.t > 0.8) text('Press a key', 18, 66 + ls.length * 8, P.G3);
  }
  function end() {
    const k = over.kind, lost = k === 'captured';
    if (out.bugged && opts.building && !lost) game.taps.push({ key: opts.building.key, until: dayOf(game.t) + 4 });
    done({ kind: k, clues: out.clues, messages: lost ? 0 : out.messages, plan: !lost && out.plan, personnel: !lost && out.personnel, evidence: lost ? null : out.evidence, prisoner: k === 'escaped' && max.prisoner ? occupant : null, alarm: out.alarm, seconds: t });
  }
  scene.onChar = ch => compChar(ch);
  scene.onKey = function (k) {
    if (comp) { if (k === 'menu') closeComputer('You log off.'); else if (k === 'select') { if (comp.last && comp.stage === 'result') closeComputer('The mainframe logs you off.'); else compEnter(); } else if (k === 'fire' && comp.stage !== 'pw') compChar(' '); return; }
    if (!entryDoor) { if (k === 'menu') { over = { kind: 'abort', t: 1 }; end(); return; } doorMenu.key(k); return; }
    if (over) { if (over.t > 0.8 && (k === 'select' || k === 'fire' || k === 'action' || k === 'menu')) end(); return; }
    if (pauseMenu) { if (k === 'menu') pauseMenu = null; else pauseMenu.key(k); return; }
    if (k === 'menu') { openMenu('Do you want to...', [{ label: 'Continue', go: () => { pauseMenu = null; } }, { label: 'Photograph (P)', go: () => { pauseMenu = null; photo(); } }, { label: 'Plant a bug (B)', go: () => { pauseMenu = null; bug(); } }, { label: 'Crouch/stand (C)', go: () => { pauseMenu = null; max.crouch = !max.crouch; } }, { label: 'Long throw (F7)', go: () => { pauseMenu = null; throwG(2); } }, { label: 'Set trap (F9)', go: trapMenu }, { label: 'Detonate (F8)', go: () => { pauseMenu = null; detonate(); } }, { label: mode === 'breakin' ? 'Abort mission' : 'Run for it', go: () => { pauseMenu = null; finish(mode === 'defend' ? 'freed' : 'abort'); } }]); return; }
    if (max.stun > 0) return;
    if (k === 'action' || k === 'select') examine();
    if (k === 'alt') throwG(1);
    if (k === 'alt2') { const ks = ['frag', 'stun', 'gas']; max.gtype = ks[(ks.indexOf(max.gtype) + 1) % 3]; sfx.blip(); say(GREN[max.gtype].name + ' grenades selected.'); }
  };
  scene.onTap = function (x, y) {
    if (comp) { const c = Math.floor((x - 8) / 12), r = Math.floor((y - 148) / 12); if (r >= 0 && r < 3 && c >= 0 && c < 13) { const K = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; const i = r * 13 + c; if (i < 26) compChar(K[i]); else if (i === 26) compChar(' '); else if (i === 27) compChar(''); else scene.onKey('select'); } return; }
    if (!entryDoor) { doorMenu.tap(x, y); return; }
    if (over) { if (over.t > 0.8) end(); return; }
    if (pauseMenu) { pauseMenu.tap(x, y); return; }
    if (x > 176 && x < 234 && y < 18) { const ks = ['frag', 'stun', 'gas']; const i = Math.floor((y - 2) / 5); if (ks[i]) { max.gtype = ks[i]; sfx.blip(); } return; }
    if (x > 220 && x < 247 && y > 70 && y < 96) { photo(); return; }
    if (x > 234 && x < 254 && y < 44) { bug(); return; }
    if (x < 26 && y < 40) { max.crouch = !max.crouch; say(max.crouch ? 'Crouching.' : 'Standing.'); return; }
    const v = roomView(); if (x < 170 && y > 20) max.dir = Math.atan2((y - v.oy) / v.S * TS - max.y, (x - v.ox) / v.S * TS - max.x);
  };
  scene.rawKey = e => {
    const c = e.code; if (!entryDoor || over || pauseMenu || comp) return false;
    if (c === 'KeyP' || c === 'F2') { photo(); return true; } if (c === 'KeyB' || c === 'F3') { bug(); return true; }
    if (c === 'KeyC' || c === 'Numpad5') { max.crouch = !max.crouch; say(max.crouch ? 'Crouching.' : 'Standing.'); return true; }
    if (c === 'F1') { examine(); return true; } if (c === 'F4') { const { f } = facing(); if (f && f.type === 'computer') openComputer(); else say('Face the mainframe to use it.'); return true; } if (c === 'F5' || c === 'Digit1') { throwG(0); return true; } if (c === 'F6' || c === 'Digit2') { throwG(1); return true; } if (c === 'F7' || c === 'Digit3') { throwG(2); return true; }
    if (c === 'F9' || c === 'KeyT') { trapMenu(); return true; } if (c === 'F8' || c === 'KeyR') { detonate(); return true; }
    if (c === 'F10') { const ks = ['frag', 'stun', 'gas']; max.gtype = ks[(ks.indexOf(max.gtype) + 1) % 3]; return true; }
    return false;
  };
  scene.dbg = { max, people, B, F, traps, raiseAlarm, enterAt, setTrap, detonate, get ward() { return ward; }, get over() { return over; } };
  return scene;
}

// ---------- ARMORY: shelves on the left, silhouette on the right ----------
function armoryScene(start) {
  const slots = [
    { k: 'uzi', label: 'UZI', x: 4, y: 2, w: 68, h: 30 }, { k: 'camera', label: 'CAMERA', x: 4, y: 44, w: 68, h: 20 }, { k: 'bugs', label: 'BUGS', x: 4, y: 74, w: 68, h: 16 },
    { k: 'frag', label: 'GRENADES', x: 4, y: 100, w: 68, h: 14 }, { k: 'stun', label: '', x: 4, y: 118, w: 68, h: 14 }, { k: 'gas', label: '', x: 4, y: 136, w: 68, h: 14 },
    { k: 'gasmask', label: 'GAS MASK', x: 78, y: 12, w: 38, h: 28 }, { k: 'detector', label: 'MOTION', x: 118, y: 4, w: 38, h: 36 },
    { k: 'kevlar', label: 'KEVLAR ARMOR', x: 78, y: 50, w: 78, h: 56 }, { k: 'safekit', label: 'SAFECRACKING KIT', x: 78, y: 118, w: 78, h: 38 },
  ];
  const taken = {}; let sel = 0; const used = () => Object.keys(taken).length;
  function toggle() { const s = slots[sel]; if (taken[s.k]) { delete taken[s.k]; sfx.blip(); return; } if (used() >= 5) { sfx.deny(); toast('Only 5 items'); return; } taken[s.k] = true; sfx.select(); }
  const kit = () => ({ uzi: !!taken.uzi, camera: !!taken.camera, bugs: taken.bugs ? 4 : 0, gasmask: !!taken.gasmask, detector: !!taken.detector, kevlar: !!taken.kevlar, safekit: !!taken.safekit, frag: taken.frag ? 4 : 0, stun: taken.stun ? 4 : 0, gas: taken.gas ? 4 : 0 });
  const nav = (dx, dy) => { const c = slots[sel]; let best = -1, bd = 1e9; slots.forEach((s, i) => { if (i === sel) return; const vx = (s.x + s.w / 2) - (c.x + c.w / 2), vy = (s.y + s.h / 2) - (c.y + c.h / 2); const along = vx * dx + vy * dy; if (along <= 0) return; const d = along + Math.abs(vx * dy - vy * dx) * 2; if (d < bd) { bd = d; best = i; } }); if (best >= 0) { sel = best; sfx.blip(); } };
  const go_ = () => { sfx.select(); start({ kit: kit() }); };
  return {
    t: 0, update(dt) { this.t += dt; },
    onKey(k) { if (k === 'up') nav(0, -1); else if (k === 'down') nav(0, 1); else if (k === 'left') nav(-1, 0); else if (k === 'right') nav(1, 0); else if (k === 'select' || k === 'fire') toggle(); else if (k === 'menu' || k === 'alt2') go_(); },
    onTap(x, y) { const i = slots.findIndex(s => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h + 12); if (i >= 0) { sel = i; toggle(); return; } if (y > 178 && x > 240) go_(); },
    draw() {
      const t = this.t;
      blit(biX_armoryBg(slots), 0, 0);
      slots.forEach((s, i) => {
        const on = i === sel, y0 = s.y + 8;
        if (on) fine(() => { const gl = g.createRadialGradient(2 * s.x + s.w, 2 * y0 + s.h, 4, 2 * s.x + s.w, 2 * y0 + s.h, s.w * 1.2); gl.addColorStop(0, 'rgba(255,200,110,0.22)'); gl.addColorStop(1, 'rgba(255,200,110,0.04)'); g.fillStyle = gl; g.fillRect(2 * s.x, 2 * y0, 2 * s.w, 2 * s.h); });
        if (!taken[s.k]) armoryItem(s.k, s.x + s.w / 2, y0 + s.h);
        else { const cx = Math.round(s.x + s.w / 2), cy = Math.round(y0 + s.h / 2) - 3, tw = textW('TAKEN') + 8; blit(biX_takenArt(tw), cx - (tw >> 1), cy - 1); textC('TAKEN', cx, cy + 2, '#8a96a8'); }
        if (on) { const c = (t * 4 | 0) % 2 ? '#ffd070' : '#ffb040', l = 5; fine(() => { const x0 = 2 * s.x - 3, y1 = 2 * y0 - 3, x1 = 2 * (s.x + s.w) + 2, y2 = 2 * (y0 + s.h) + 2; g.fillStyle = biX_C.ink; for (const [x, y, dx, dy] of [[x0, y1, 1, 1], [x1, y1, -1, 1], [x0, y2, 1, -1], [x1, y2, -1, -1]]) { g.fillRect(Math.min(x, x + dx * l * 2) - 1, y - 1, l * 2 + 3, 4); g.fillRect(x - 1, Math.min(y, y + dy * l * 2) - 1, 4, l * 2 + 3); } g.fillStyle = c; for (const [x, y, dx, dy] of [[x0, y1, 1, 1], [x1, y1, -1, 1], [x0, y2, 1, -1], [x1, y2, -1, -1]]) { g.fillRect(Math.min(x, x + dx * l * 2), y, l * 2 + 1, 2); g.fillRect(x, Math.min(y, y + dy * l * 2), 2, l * 2 + 1); } }); }
        const lc = on ? '#ffd070' : '#e8e4d8', lx = s.x + s.w / 2;
        if (s.k === 'gasmask') { textC('GAS', lx, 4, lc, P.K); textC('MASK', lx, 12, lc, P.K); }
        else if (s.label) textC(s.k === 'safekit' ? 'SAFECRACKING' : s.label, lx, s.y, lc, P.K);
        if (s.k === 'detector') textC('SENSOR', lx, s.y + 8, lc, P.K);
      });
      // right: Max's silhouette carrying what has been picked so far
      const k = kit(), m = { gun: taken.uzi ? 'uzi' : 'pistol', hits: 0, gren: { frag: k.frag, stun: k.stun, gas: k.gas }, gtype: k.stun ? 'stun' : k.gas ? 'gas' : k.frag ? 'frag' : 'stun', bugs: k.bugs, clip: 6, clips: 3, film: 36 };
      blit(biX_armoryPanel(), 160, 0);
      fine(() => biX_glow(394, 170, 150, 'rgb(120,160,220)', 0.14, true));
      g.save(); g.translate(-9, 40); biX_equip(k, m, t, true); g.restore();
      fine(() => { const gr = g.createLinearGradient(0, 250, 0, 280); gr.addColorStop(0, 'rgba(18,24,36,0)'); gr.addColorStop(1, 'rgba(18,24,36,1)'); g.fillStyle = gr; g.fillRect(330, 250, 290, 30); });
      textC('EQUIPMENT ROOM', 240, 7, '#ffc860', P.K); textC('Choose up to five items', 240, 17, '#b8c0d0'); textC('for the break-in.', 240, 25, '#b8c0d0');
      for (let n = 0; n < 5; n++) { const on = n < used(); blit(biX_ledArt(on), 170 + n * 9, 158); if (on) fine(() => biX_glow(2 * (170 + n * 9) + 7, 323, 12, 'rgb(255,190,80)', 0.35, true)); }
      text(used() + ' of 5', 218, 158, '#f0e8d8');
      blit(biX_armoryChrome(), 0, 172);
      text('Items taken: ' + used() + ' of 5.  The silenced pistol is free.', 4, 176, '#f0e8d8');
      text('Enter takes or returns.  Esc when ready.', 4, 187, '#8a96a8');
      textC('Go in', 282, 185, '#fff0c0');
    },
  };
}
