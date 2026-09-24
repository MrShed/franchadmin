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
// BREAK-IN ART (biX_): hand-built EGA sprites for rooms, furniture,
// people, the Max portrait, the kit and the armory. Everything static is
// rendered once into cached canvases (sprite()) and blitted per frame.
// ===================================================================
// colour ramps: [shadow, base, light] for every EGA colour
const biX_RAMP = {
  [EGA.black]: [P.K, P.K, P.G1], [EGA.blue]: [P.K, P.BL, P.BL2], [EGA.green]: [P.K, P.GR, P.GR2], [EGA.cyan]: [P.K, P.TL, P.CY],
  [EGA.red]: [P.K, P.RD, P.RD2], [EGA.magenta]: [P.K, P.MG, P.PK], [EGA.brown]: [P.K, P.BR, P.YE], [EGA.lgray]: [P.G1, P.G3, P.W],
  [EGA.dgray]: [P.K, P.G1, P.G3], [EGA.lblue]: [P.BL, P.BL2, P.CY], [EGA.lgreen]: [P.GR, P.GR2, P.W], [EGA.lcyan]: [P.TL, P.CY, P.W],
  [EGA.lred]: [P.RD, P.RD2, P.W], [EGA.lmagenta]: [P.MG, P.PK, P.W], [EGA.yellow]: [P.BR, P.YE, P.W], [EGA.white]: [P.G3, P.W, P.W],
};
const biX_ramp = c => biX_RAMP[c] || [P.K, c, P.W];
const biX_hash = (i, j, s = 0) => { let n = Math.imul(i + 7919 * s, 374761393) + Math.imul(j, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const biX_bay = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
// filled ellipse inscribed in a pixel box
function biX_ell(x, y, w, h, c) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); if (w <= 0 || h <= 0) return; g.fillStyle = c;
  for (let j = 0; j < h; j++) { const yy = (j + 0.5) / h * 2 - 1, hw = w / 2 * Math.sqrt(Math.max(0, 1 - yy * yy)); const a = Math.round(w / 2 - hw), b = Math.round(w / 2 + hw); if (b > a) g.fillRect(x + a, y + j, b - a, 1); }
}
// outlined, lit-from-top-left ellipse and box
function biX_ball(x, y, w, h, base, lt, dk, ol = P.K) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); if (w < 3 || h < 3) { biX_ell(x, y, w, h, ol || base); return; }
  if (ol) biX_ell(x, y, w, h, ol); biX_ell(x + 1, y + 1, w - 2, h - 2, dk); biX_ell(x + 1, y + 1, w - 3, h - 3, lt); if (w > 4 && h > 4) biX_ell(x + 2, y + 2, w - 4, h - 4, base);
}
function biX_box(x, y, w, h, base, lt, dk, ol = P.K) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); if (w <= 0 || h <= 0) return;
  if (w < 3 || h < 3) { rect(x, y, w, h, ol || base); return; }
  if (ol) rect(x, y, w, h, ol); rect(x + 1, y + 1, w - 2, h - 2, dk); rect(x + 1, y + 1, w - 3, h - 3, lt); if (w > 3 && h > 3) rect(x + 2, y + 2, w - 4, h - 4, base);
}
// per-pixel painter: fn(i, j) -> colour | null, optional 1-px outline around the shape
function biX_raster(x, y, w, h, fn, ol) {
  const G = new Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) G[j * w + i] = fn(i, j) || null;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const c = G[j * w + i]; if (c) { g.fillStyle = c; g.fillRect(x + i, y + j, 1, 1); } }
  if (ol) { g.fillStyle = ol; for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) { const at = (a, b) => a >= 0 && b >= 0 && a < w && b < h && G[b * w + a]; if (at(i, j)) continue; if (at(i - 1, j) || at(i + 1, j) || at(i, j - 1) || at(i, j + 1)) g.fillRect(x + i, y + j, 1, 1); } }
}
// string-row sprites: rows of characters mapped through a colour map ('.' or missing = clear)
function biX_rows(rows, x, y, map) { for (let j = 0; j < rows.length; j++) { const r = rows[j]; for (let i = 0; i < r.length; i++) { const c = map[r[i]]; if (c) { g.fillStyle = c; g.fillRect(x + i, y + j, 1, 1); } } } }
function biX_spr(key, rows, map) { return sprite('biX_r_' + key, Math.max(...rows.map(r => r.length)), rows.length, () => biX_rows(rows, 0, 0, map)); }
function biX_put(key, rows, map, x, y, flip) {
  const c = biX_spr(key, rows, map);
  if (!flip) { g.drawImage(c, x | 0, y | 0); return; }
  g.save(); g.translate((x | 0) + c.width, y | 0); g.scale(-1, 1); g.drawImage(c, 0, 0); g.restore();
}

// ---------- top-down people: one shape function, rendered at 16 headings ----------
// o: pose stand|crouch|out, dirI 0..15, step -1..1, k scale, uni colour, head cap|hood|hair, hair colour,
//    arms gun|side|up, gun pistol|uzi, mask, stripes, strap
// ---------- people: hand-drawn 3/4-view sprites, layered (legs, torso, arms, head) ----------
// letters: k outline, C/c cap light/base, v visor, H/h hair light/base, s skin, z skin shade, e eye,
// U/u/d uniform light/base/dark, b belt, Y buckle, P/p/q trousers light/base/dark, F/f shoes, g/G gun, m/M gas mask
const biX_PL = { // large: 15 x 17 canvas, feet on row 16
  head: {
    D: {
      cap: ['.....kkkkk.....', '....kCCccck....', '....kCcccck....', '...kvvvvvvvk...', '....ksesesk....', '....kzssszk....', '.....kzszk.....'],
      hood: ['.....kkkkk.....', '....kHhhhhk....', '....kHhhhhk....', '....khhhhhk....', '....ksesesk....', '....khzzzhk....', '.....khhhk.....'],
      hair: ['.....kkkkk.....', '....kHHhhhk....', '....kHhhhhk....', '....khssshk....', '....ksesesk....', '....kzssszk....', '.....kzszk.....'],
      mask: ['...............', '...............', '...............', '...............', '....kMmmMmk....', '....kmmmmmk....', '.....kmgmk.....'],
    },
    U: {
      cap: ['.....kkkkk.....', '....kCCccck....', '....kCcccck....', '....kcccccc....', '....khhhhhk....', '....zkhhhkz....', '.....kzzzk.....'],
      hood: ['.....kkkkk.....', '....kHhhhhk....', '....kHhhhhk....', '....khhhhhk....', '....khhhhhk....', '....khhhhhk....', '.....khhhk.....'],
      hair: ['.....kkkkk.....', '....kHHhhhk....', '....kHhhhhk....', '....khhhhhk....', '....khhhhhk....', '....zkhhhkz....', '.....kzzzk.....'],
      mask: ['...............', '...............', '...............', '...............', '...............', '....mk...km....', '...............'],
    },
    R: {
      cap: ['....kkkkk......', '...kCCccck.....', '...kCcccck.....', '...kcccvvvvk...', '...khssssek....', '...khzssssk....', '....kzzsk......'],
      hood: ['....kkkkk......', '...kHhhhhk.....', '...kHhhhhhk....', '...khhhhhhk....', '...khhsssek....', '...khhhhhhk....', '....khhhk......'],
      hair: ['....kkkkk......', '...kHHhhhk.....', '...kHhhhhhk....', '...khhhsssk....', '...khhssesk....', '...khzsssssk...', '....kzzssk.....'],
      mask: ['...............', '...............', '...............', '...............', '.......mmMk....', '.......mmmmk...', '.......kgk.....'],
    },
  },
  torso: {
    D: ['..kUUuuuuuudk..', '..kUuuuuuuudk..', '..kUuuuuuuudk..', '..kUuuuuuuudk..', '..kbbbbYbbbbk..'],
    U: ['..kUUuuuuuudk..', '..kUuuuuuuudk..', '..kUuuuuuuudk..', '..kUuuuuuuudk..', '..kbbbbbbbbbk..'],
    R: ['...kUUuuudk....', '...kUuuuudk....', '...kUuuuudk....', '...kUuuuudk....', '...kbbbbbbk....'],
  },
  arms: {
    D: {
      side: ['..kUk.....kdk..', '.kUuk.....kudk.', '.kUuk.....kudk.', '.kUdk.....kudk.', '.kssk.....kssk.', '..kk.......kk..'],
      up: ['.kk.........kk.', 'kssk.......kssk', 'kUdk.......kUdk', 'kUdk.......kUdk', '.kUk.......kdk.', '..kUk.....kdk..'],
      gun: ['..kUk.....kdk..', '.kUuUk...kudk..', '.kUuuUksskudk..', '..kkkkssskkk...', '......kgGk.....', '......kggk.....'],
      gunDR: ['..kUk.....kdk..', '..kUuk....kudk.', '..kUuuk...kuukk', '...kkUuuuussGGk', '......kkkkkzggk', '............kk.'],
    },
    U: {
      side: ['..kUk.....kdk..', '.kUuk.....kudk.', '.kUuk.....kudk.', '.kUdk.....kudk.', '.kssk.....kssk.', '..kk.......kk..'],
      up: ['.kk.........kk.', 'kssk.......kssk', 'kUdk.......kUdk', 'kUdk.......kUdk', '.kUk.......kdk.', '..kUk.....kdk..'],
      gun: ['.kUUk.....kddk.', '.kUuk.....kudk.', '..kUk.....kdk..', '...kk.....kk...', '...............', '...............'],
      gunUR: ['..kUk....kkdk..', '.kUuk...kssdk..', '.kUuk..kGgkk...', '..kk..kGgk.....', '......kgk......', '...............'],
    },
    R: {
      side: ['....kUk........', '....kUuk.......', '....kUuk.......', '....kUdk.......', '....kssk.......', '.....kk........'],
      up: ['...kssk........', '...kUuk........', '...kUuk........', '....kUk........', '...............', '...............'],
      gun: ['....kUk........', '....kUuk..kkkk.', '....kUuuusGGGGk', '.....kkkkszgkk.', '..........kgk..', '...........k...'],
      gunDR: ['....kUk........', '....kUuk.......', '....kUuuk......', '.....kUuusk....', '......kkkszGk..', '.........kkGgk.', '...........kgk.', '............k..'],
      gunUR: ['....kUk....kk..', '....kUuk..kGgk.', '....kUuuskGgk..', '.....kUuszkk...', '......kkkk.....', '...............'],
    },
  },
  legs: {
    D: [['...kPppkPppk...', '...kPppkPppk...', '...kPpqkPpqk...', '...kFffkFffk...', '...kkkkkkkkk...'],
      ['...kPppkPppk...', '...kPppkPppk...', '...kPpqkkkkk...', '...kFffkFffk...', '...kkkkkkkkk...'],
      ['...kPppkPppk...', '...kPppkPppk...', '...kkkkkPpqk...', '...kFffkFffk...', '...kkkkkkkkk...']],
    R: [['...kPppqk......', '...kPppqk......', '...kPpqk.......', '...kFfffk......', '...kkkkkk......'],
      ['..kPpqkPpk.....', '.kPpqk.kPpk....', '.kPqk...kPpk...', 'kFffk...kFffk..', 'kkkk.....kkkk..'],
      ['...kPpPpk......', '...kPpkPpk.....', '..kPqk.kPpk....', '..kFfk.kFffk...', '..kkk...kkkk...']],
  },
  crouch: { D: ['...kPppppppk...', '..kFfkkkkkFfk..'], R: ['...kPpppppk....', '...kFfkkkFfk...'] },
  y: { head: 0, torso: 7, arms: 7, legs: 12 }, w: 15, h: 17,
};
const biX_PS = { // small: 11 x 13 canvas
  head: {
    D: {
      cap: ['...kkkkk...', '..kCcccck..', '..kvvvvvk..', '...kesek...', '....kzk....'],
      hood: ['...kkkkk...', '..kHhhhhk..', '..khsesk...', '..khhhhhk..', '....khk....'],
      hair: ['...kkkkk...', '..kHhhhhk..', '..khsssk...', '...kesek...', '....kzk....'],
      mask: ['...........', '...........', '...........', '...kMmMk...', '....kgk....'],
    },
    U: {
      cap: ['...kkkkk...', '..kCcccck..', '..kcccccc..', '...khhhk...', '....kzk....'],
      hood: ['...kkkkk...', '..kHhhhhk..', '..khhhhhk..', '...khhhk...', '....khk....'],
      hair: ['...kkkkk...', '..kHhhhhk..', '..khhhhhk..', '...khhhk...', '....kzk....'],
      mask: ['...........', '...........', '...........', '...........', '...........'],
    },
    R: {
      cap: ['...kkkk....', '..kCccck...', '..kccvvvk..', '..khsesk...', '...kzzk....'],
      hood: ['...kkkk....', '..kHhhhk...', '..khhhhk...', '..khhsek...', '...khhk....'],
      hair: ['...kkkk....', '..kHhhhk...', '..khhssk...', '..khssek...', '...kzzsk...'],
      mask: ['...........', '...........', '...........', '.....mMk...', '.....kgk...'],
    },
  },
  torso: {
    D: ['..kUuuudk..', '..kUuuudk..', '..kbbYbbk..'],
    U: ['..kUuuudk..', '..kUuuudk..', '..kbbbbbk..'],
    R: ['...kUudk...', '...kUudk...', '...kbbbk...'],
  },
  arms: {
    D: {
      side: ['.kUk...kdk.', '.kUk...kdk.', '.ksk...ksk.', '..k.....k..'],
      up: ['ksk.....ksk', 'kUk.....kdk', '.kUk...kdk.', '...........'],
      gun: ['.kUk...kdk.', '..kUksskd..', '...kkgGk...', '....kgk....'],
      gunDR: ['.kUk...kdk.', '..kUkkkudk.', '...kkUussGk', '......kkzgk'],
    },
    U: {
      side: ['.kUk...kdk.', '.kUk...kdk.', '.ksk...ksk.', '..k.....k..'],
      up: ['ksk.....ksk', 'kUk.....kdk', '.kUk...kdk.', '...........'],
      gun: ['.kUk...kdk.', '.kUk...kdk.', '..k.....k..', '...........'],
      gunUR: ['.kUk..kskk.', '.kUk.kGgk..', '..k.kgk....', '...........'],
    },
    R: {
      side: ['...kUk.....', '...kUk.....', '...ksk.....', '....k......'],
      up: ['..ksk......', '..kUk......', '...kUk.....', '...........'],
      gun: ['...kUk..kk.', '...kUuusGGk', '....kkkzgk.', '........k..'],
      gunDR: ['...kUk.....', '...kUuk....', '....kUusk..', '.....kkzGk.', '.......kgk.', '........k..'],
      gunUR: ['...kUk..kk.', '...kUk.kGk.', '....kUusk..', '.....kkk...'],
    },
  },
  legs: {
    D: [['...kPkPk...', '...kpkpk...', '...kFkFk...', '...kkkkk...'],
      ['...kPkPk...', '...kpkkk...', '...kFkFk...', '...kkkkk...'],
      ['...kPkPk...', '...kkkpk...', '...kFkFk...', '...kkkkk...']],
    R: [['...kPpk....', '...kPpk....', '...kFfk....', '...kkkk....'],
      ['..kPkPk....', '.kPk.kPk...', '.kFk..kFk..', '.kk....kk..'],
      ['...kPPk....', '..kPkPk....', '..kFkkFk...', '..kk..kk...']],
  },
  crouch: { D: ['..kPpppPk..', '..kFkkkFk..'], R: ['..kPppppk..', '..kFkkkFk..'] },
  y: { head: 0, torso: 5, arms: 5, legs: 8 }, w: 11, h: 12,
};
// knocked-out: lying on the floor, head to the right
const biX_OUT_L = [
  '..........kk.......',
  '.........kssk......',
  '..........kUuk.kkk.',
  '.kk.kkkkkkkUuukkssk',
  'kFfkPpppkUuuuukzsek',
  'kFfkPpppbUuuuukhsHk',
  'kFfkPpppkUuuuukkhhk',
  '.kk.kqqqkkddddk.kk.',
  '.....kkk.kssk......',
  '..........kk.......',
];
const biX_OUT_S = [
  '......kk.....',
  '.kk.kkkUk.kk.',
  'kFkPpkUuukssk',
  'kFkPpbUuukhHk',
  '.kkqqkddkkkk.',
  '......ksk....',
  '.......k.....',
];
const biX_HAIR = { [EGA.black]: [P.K, P.G1], [EGA.brown]: [P.BR, P.BR], [EGA.yellow]: [P.YE, P.W], [EGA.lgray]: [P.G3, P.W], [EGA.dgray]: [P.G1, P.G3] };
function biX_pmap(o) {
  const u = o.uni === P.W ? [P.G3, P.W, P.W] : biX_ramp(o.uni), max_ = o.uni === P.K;
  const hr = biX_HAIR[o.hair] || [o.hair || P.BR, o.hair || P.BR], cap = max_ ? [P.K, P.K, P.G1] : u, dark = o.skin === EGA.brown;
  const pants = o.pants ? biX_ramp(o.pants) : max_ ? [P.K, P.K, P.G1] : [u[0] === P.K ? P.K : u[0], u[0] === P.K ? u[1] : u[0], u[1]];
  return {
    k: P.K, C: cap[2], c: cap[1], v: P.K, H: max_ ? P.G1 : hr[1], h: max_ ? P.K : hr[0], s: dark ? P.BR : P.SK, z: dark ? P.RD : P.BR, e: P.K,
    U: max_ ? P.G1 : u[2], u: u[1], d: max_ ? P.K : u[0] === P.K ? u[1] : u[0], b: max_ ? P.G1 : P.K, Y: max_ ? P.G1 : P.YE,
    P: pants[2], p: pants[1], q: pants[0], F: P.G1, f: P.K, g: P.K, G: P.G1, m: P.G3, M: P.CY,
  };
}
// o: { big, face 0..7 (0 = right, clockwise), frame 0..2, uni, head, hair, arms, mask, stripes, pants }
function biX_person(o) {
  const T = o.big ? biX_PL : biX_PS, f = o.face, flip = f > 2 && f < 6 ? 1 : 0;
  const fx = flip ? (12 - f) % 8 : f; // left-facing frames are mirrored right-facing ones
  const body = { 0: 'R', 1: 'R', 2: 'D', 6: 'U', 7: 'R' }[fx] || 'R';
  let arms = o.arms;
  if (arms === 'gun') arms = fx === 1 ? 'gunDR' : fx === 7 ? 'gunUR' : 'gun';
  if (body === 'D' && arms === 'gunUR') arms = 'gun';
  const key = 'biX_p_' + [o.big ? 1 : 0, body, flip, arms, o.frame, o.uni, o.head, o.hair, o.mask ? 1 : 0, o.stripes ? 1 : 0, o.pants || '', o.crouch ? 1 : 0, o.skin || ''].join('_');
  return sprite(key, T.w, T.h, () => {
    const map = biX_pmap(o);
    const lay = (rows, y0) => { for (let j = 0; j < rows.length; j++) { const r = rows[j]; for (let i = 0; i < r.length; i++) { let ch = r[i]; if (ch === '.') continue; if (o.stripes && 'Uud'.includes(ch) && (y0 + j) % 2) ch = 'G'; const c = map[ch]; if (c) px(flip ? T.w - 1 - i : i, y0 + j, c); } } };
    const lb = body === 'R' ? 'R' : 'D', off = o.crouch ? (o.big ? 3 : 2) : 0;
    if (o.crouch) lay(T.crouch[lb], T.h - 2); else lay(T.legs[lb][o.frame || 0], T.y.legs);
    lay(T.torso[body], T.y.torso + off);
    const A = T.arms[body][arms] || T.arms[body].side;
    const armsBehind = body === 'U';
    if (!armsBehind) lay(T.head[body][o.head] || T.head[body].hair, T.y.head + off);
    lay(A, T.y.arms + off);
    if (armsBehind) lay(T.head[body][o.head] || T.head[body].hair, T.y.head + off);
    if (o.mask) lay(T.head[body].mask, T.y.head + off);
  });
}
function biX_body(o) {
  const rows = o.big ? biX_OUT_L : biX_OUT_S, w = rows[0].length, flip = o.flip ? 1 : 0;
  return sprite('biX_out_' + [o.big ? 1 : 0, flip, o.uni, o.head, o.hair, o.stripes ? 1 : 0, o.skin || ''].join('_'), w, rows.length, () => {
    const m = biX_pmap(o); if (o.head !== 'cap') { m.C = m.H; m.c = m.h; }
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < w; i++) { let ch = rows[j][i]; if (ch === '.') continue; if (o.stripes && 'Uud'.includes(ch) && i % 2) ch = 'G'; if (m[ch]) px(flip ? w - 1 - i : i, j, m[ch]); }
  });
}

// ---------- furniture, drawn in a canonical orientation (its back to the north wall) ----------
function biX_furn(type, S, st) {
  const f = FURN[type], w = f.w * S, h = f.h * S;
  return sprite('biX_f_' + type + '_' + S + '_' + st, w, h, () => biX_furnDraw(type, w, h, S, st));
}
function biX_furnDraw(type, w, h, S, st) {
  const q = S / 8, R = Math.round, opened = st.indexOf('o') >= 0;
  const wood = (x, y, ww, hh) => {
    x = R(x); y = R(y); ww = R(ww); hh = R(hh); rect(x, y, ww, hh, P.K); rect(x + 1, y + 1, ww - 2, hh - 2, P.BR);
    for (let yy = y + 2; yy < y + hh - 2; yy++) for (let xx = x + 2; xx < x + ww - 2; xx++) if (biX_hash(xx >> 2, yy, 3) < 0.12 && (xx + yy) % 3) px(xx, yy, P.RD);
    for (let xx = x + 1; xx < x + ww - 1; xx++) if (xx % 2 === 0) px(xx, y + 1, P.YE); rect(x + 1, y + hh - 2, ww - 2, 1, P.RD); rect(x + ww - 2, y + 1, 1, hh - 2, P.RD);
  };
  const rbox = (x, y, ww, hh, c) => { x = R(x); y = R(y); ww = R(ww); hh = R(hh); biX_raster(x, y, ww, hh, (i, j) => { const e = Math.min(i, ww - 1 - i) + Math.min(j, hh - 1 - j); if ((i === 0 || i === ww - 1) && (j === 0 || j === hh - 1)) return null; if (i === 0 || j === 0) return c[2]; if (i === ww - 1 || j === hh - 1) return c[0]; return c[1]; }, P.K); };
  switch (type) {
    case 'desk': {
      const top = R(q);
      wood(0, top, w, h - top - 1);
      const iy = top + 2, ih = h - top - 5;
      // green leather blotter with a sheet of paper on it
      const bx = R(w * 0.3), bw = R(w * 0.34), by = iy + R(ih * 0.12), bh = Math.max(2, R(ih * 0.76));
      rect(bx, by, bw, bh, P.GR); rect(bx, by, bw, 1, P.GR2); rect(bx, by + bh - 1, bw, 1, P.K);
      const px0 = bx + R(bw * 0.2), pw = Math.max(2, R(bw * 0.45)); rect(px0, by, pw, Math.max(2, bh - 1), P.W); if (S >= 10) for (let yy = by + 1; yy < by + bh - 2; yy += 2) rect(px0 + 1, yy, Math.max(1, pw - 2 - (yy % 3)), 1, P.G3);
      if (S >= 10) { px(px0 + pw + 1, by + 1, P.K); px(px0 + pw + 2, by + 2, P.K); px(px0 + pw + 3, by + 3, P.YE); } // a pen
      // banker's lamp: green shade, brass stem
      const lx = w - R(w * 0.24), lw = Math.max(3, R(5 * q)), lh = Math.max(3, R(3 * q)); biX_ball(lx, iy - 1, lw, lh, P.GR, P.GR2, P.K); if (S >= 10) { px(lx + (lw >> 1), iy - 1 + lh, P.YE); px(lx + (lw >> 1) - 1, iy + lh, P.YE); px(lx + (lw >> 1) + 1, iy + lh, P.BR); }
      // telephone
      if (S >= 9) { const tx = R(w * 0.07) + 1, tw = Math.max(3, R(3 * q)); rect(tx, iy + 1, tw, 2, P.K); px(tx + 1, iy + 1, P.G1); rect(tx - 1, iy, tw + 2, 1, P.K); px(tx - 1, iy, P.G1); }
      if (opened) { const dx = R(w * 0.38), dw = R(w * 0.28), dh = Math.max(3, R(4 * q)), dy = h - dh; rect(dx, dy, dw, dh, P.K); rect(dx + 1, dy, dw - 2, dh - 1, P.RD); rect(dx + 2, dy, dw - 4, dh - 2, P.W); for (let xx = dx + 2; xx < dx + dw - 2; xx += 2) px(xx, dy + 1, P.G3); }
      else { const hy = h - 3; rect(R(w * 0.5) - 1, hy, 3, 1, P.YE); }
      break;
    }
    case 'chair': {
      // an office chair from above: castor star, padded seat, armrests, a curved backrest to the south
      const exec = st.indexOf('x') >= 0, c = exec ? [P.K, P.G1, P.G3] : [P.BL, P.BL2, P.CY], bk = exec ? [P.K, P.K, P.G1] : [P.K, P.BL, P.BL2];
      const m = Math.max(1, R(S * 0.2)), sw = S - 2 * m, sy = Math.max(1, R(S * 0.1)), sh = Math.max(3, R(S * 0.55)), by = sy + sh - 1, bh = Math.max(2, S - by - 1);
      if (S >= 9) { const cx = R(S / 2); rect(cx, 0, 1, sy + 1, P.K); rect(0, R(S * 0.45), m + 1, 1, P.K); rect(S - m - 1, R(S * 0.45), m + 1, 1, P.K); px(cx, 0, P.G1); px(0, R(S * 0.45), P.G1); px(S - 1, R(S * 0.45), P.G1); }
      rbox(m, sy, sw, sh, c);
      if (S >= 10) { rect(m + 2, sy + 2, sw - 4, 1, c[2]); rect(R(S / 2), sy + 2, 1, sh - 4, c[0]); }
      if (S >= 9) { rect(m - 1, sy + 1, 2, sh - 2, P.K); rect(S - m - 1, sy + 1, 2, sh - 2, P.K); px(m - 1, sy + 1, P.G1); px(S - m, sy + 1, P.G1); }
      rbox(m - 1, by, sw + 2, bh, bk);
      break;
    }
    case 'file': {
      biX_box(R(q * 0.5), 0, S - R(q), S - 1, P.G3, P.W, P.G1);
      const fy = S - Math.max(3, R(3 * q)) - 1; rect(R(q * 0.5) + 1, fy, S - R(q) - 2, 1, P.G1);
      if (opened) { rect(R(q * 0.5) + 2, 2, S - R(q) - 4, fy - 3, P.K); for (let x = R(q * 0.5) + 2, n = 0; x < S - R(q * 0.5) - 2; x += 2, n++) rect(x, 2 + (n % 2), 1, Math.max(1, fy - 4), [P.YE, P.W, P.CY, P.W][n % 4]); }
      else { px(R(S / 2) - 1, fy + 2, P.TL); px(R(S / 2), fy + 2, P.CY); if (S >= 10) { rect(R(q * 0.5) + 2, R(S * 0.35), S - R(q) - 4, 1, P.G1); px(R(S / 2), R(S * 0.35) + 2, P.TL); } }
      break;
    }
    case 'wallsafe': {
      const sh = Math.max(4, R(S * 0.72)), x0 = R(q), sw = S - 2 * R(q);
      biX_box(x0, 0, sw, sh, P.G1, P.G3, P.K);
      if (opened) {
        rect(x0 + 2, 1, sw - 4, sh - 3, P.K); rect(x0 + 2, R(sh / 2), sw - 4, 1, P.G1); if (sw > 6) { rect(x0 + 3, R(sh / 2) - 2, 3, 2, P.GR); px(x0 + 3, R(sh / 2) - 2, P.GR2); }
        rect(x0 + sw - 2, sh - 1, 3, Math.max(3, R(S * 0.28)), P.K); rect(x0 + sw - 1, sh - 1, 1, Math.max(2, R(S * 0.28) - 1), P.G3);   // the door, swung open
      } else { const cx = R(S / 2) - 1, cy = R(sh / 2) - 1; if (S >= 9) { biX_ball(cx - 1, cy - 1, 4, 4, P.G3, P.W, P.G1); px(cx + 1, cy - 1, P.RD2); } else px(cx, cy, P.W); px(S - R(q) - 3, cy + 1, P.YE); px(S - R(q) - 3, cy + 2, P.YE); }
      break;
    }
    case 'floorsafe': {
      biX_box(1, 1, S - 2, S - 2, P.G1, P.G3, P.K);
      if (opened) { rect(3, 3, S - 6, S - 6, P.K); rect(3, 3, S - 6, 1, P.G1); rect(S - 2, 2, 1, S - 4, P.W); }
      else {
        for (const [x, y] of [[2, 2], [S - 4, 2], [2, S - 4], [S - 4, S - 4]]) px(x + 0.5, y + 0.5, P.G3);
        const c = R(S / 2) - 1; if (S >= 9) { biX_ball(c - 1, c - 1, 4, 4, P.YE, P.W, P.BR); px(c + 1, c - 1, P.K); } else { px(c, c, P.YE); }
        if (S >= 11) { rect(3, R(S * 0.72), S - 6, 1, P.K); }
      }
      break;
    }
    case 'plant': {
      const cx = S / 2, cy = S / 2, rr = S * 0.5, nL = S >= 11 ? 9 : 7;
      biX_raster(0, 0, S, S, (i, j) => {
        const dx = i + 0.5 - cx, dy = j + 0.5 - cy, d = Math.hypot(dx, dy);
        if (d < S * 0.2) return d < S * 0.12 ? P.K : (dx + dy < 0 ? P.RD2 : P.BR);
        let a = Math.atan2(dy, dx) / (Math.PI * 2) * nL + 0.25; const fr = a - Math.floor(a), lob = Math.abs(fr - 0.5) * 2;
        const len = rr * (0.78 + 0.22 * biX_hash(Math.floor(a) & 15, 5));
        if (d < len * (1 - lob * lob * 0.9) && d < rr - 0.2) return fr < 0.42 ? P.GR2 : (d > len * 0.75 ? P.GR : P.GR);
        return null;
      }, P.K);
      break;
    }
    case 'typewriter': {
      wood(0, R(q), S, S - R(q) - 1);
      const bx = R(S * 0.14), bw = S - 2 * bx, by = R(S * 0.3), bh = Math.max(3, R(S * 0.52));
      rect(R(S * 0.3), 0, S - 2 * R(S * 0.3), by + 1, P.W); if (S >= 10) rect(R(S * 0.3) + 1, 1, S - 2 * R(S * 0.3) - 2, 1, P.G3);
      biX_box(bx, by, bw, bh, P.G1, P.G3, P.K); rect(bx, by, bw, 1, P.K); rect(bx + 1, by + 1, bw - 2, 1, P.G3);
      for (let r = 0; r < (S >= 10 ? 2 : 1); r++) for (let x = bx + 2 + r; x < bx + bw - 2; x += 2) px(x, by + 3 + r * 2, P.W);
      break;
    }
    case 'couch': {
      const lth = st.indexOf('x') >= 0, c = lth ? [P.K, P.BR, P.YE] : [P.RD, P.RD2, P.PK], back = Math.max(2, R(S * 0.34)), arm = Math.max(2, R(S * 0.22));
      const d = lth ? [P.K, P.RD, P.BR] : [P.K, P.RD, P.RD2];
      rbox(0, 0, w, h - 1, d);                                   // frame and backrest
      rbox(0, back - 1, arm + 1, h - back, d); rbox(w - arm - 1, back - 1, arm + 1, h - back, d); // arms
      const cw = (w - 2 * arm - 2) / 2;
      for (let n = 0; n < 2; n++) { const x0 = R(arm + 1 + n * cw), x1 = R(arm + 1 + (n + 1) * cw); rbox(x0, back, x1 - x0, h - back - 1, lth ? [P.RD, P.BR, P.YE] : c); if (S >= 10) { px(R((x0 + x1) / 2), R(back + (h - back) / 2), lth ? P.RD : P.RD); } }
      if (S >= 10) for (let x = arm + 3; x < w - arm - 3; x += 3) px(x, R(back / 2), d[0]);
      break;
    }
    case 'picture': {
      const x0 = R(S * 0.12), fw = S - 2 * x0, fh = Math.max(3, R(S * 0.28));
      rect(x0, 0, fw, fh, P.K); rect(x0 + 1, 0, fw - 2, fh - 1, P.YE); rect(x0 + 1, fh - 2, fw - 2, 1, P.BR);
      if (fh >= 4) { rect(x0 + 2, 0, fw - 4, fh - 3, P.BL2); for (let x = x0 + 2; x < x0 + fw - 2; x++) if ((x * 7) % 5 < 2) px(x, fh - 4, P.GR); }
      break;
    }
    case 'computer': {
      biX_box(0, 0, w, h - 1, P.G3, P.W, P.G1);
      rect(1, h - Math.max(3, R(3 * q)) - 1, w - 2, 1, P.G1);
      const L = biX_mfLayout(w, h);
      for (const r of L.reels) { biX_ball(r.x - r.r, r.y - r.r, r.r * 2 + 1, r.r * 2 + 1, P.K, P.G1, P.K, P.G1); px(r.x, r.y, P.G3); }
      rect(L.px, L.py, L.pw, L.ph, P.K);
      if (S >= 10) { rect(w - 4, 2, 2, 1, P.RD); for (let x = 2; x < w - 2; x += 3) px(x, h - 3, P.G1); }
      break;
    }
    case 'terminal': {
      wood(0, R(q), S, S - R(q) - 1);
      const cx = R(S * 0.14), cw = S - 2 * cx, ch = Math.max(4, R(S * 0.56));
      biX_box(cx, 0, cw, ch, P.G3, P.W, P.G1); rect(cx + 2, 2, cw - 4, ch - 4, P.K); rect(cx + 2, 2, cw - 4, ch - 4, P.GR);
      rect(cx + 2, 2, cw - 4, ch - 4, P.K); for (let y = 3; y < ch - 3; y += 2) rect(cx + 3, y, Math.max(1, R((cw - 6) * (0.4 + 0.5 * biX_hash(y, S)))), 1, P.GR);
      const ky = ch + 1; if (ky + 2 < S) { rect(cx, ky, cw, Math.max(2, R(S * 0.2)), P.K); rect(cx + 1, ky, cw - 2, Math.max(1, R(S * 0.2) - 1), P.G3); for (let x = cx + 2; x < cx + cw - 2; x += 2) px(x, ky + 1, P.W); }
      break;
    }
    case 'table': {
      const tw = [P.RD, P.BR, P.YE];
      biX_ball(1, 1, w - 2, h - 2, P.BR, P.BR, P.RD); biX_ell(3, 3, w - 7, h - 7, P.BR);
      for (let a = 0; a < 40; a++) { const an = a / 40 * Math.PI * 2; if (Math.cos(an) + Math.sin(an) < -0.7) px(R(w / 2 + Math.cos(an) * (w / 2 - 3)), R(h / 2 + Math.sin(an) * (h / 2 - 3)), a % 2 ? P.YE : P.BR); }
      for (let j = 4; j < h - 4; j += 3) for (let i = 4; i < w - 4; i++) if (biX_hash(i >> 2, j, 17) < 0.1 && Math.hypot(i - w / 2, j - h / 2) < w / 2 - 4) px(i, j, P.RD);
      // magazines, an ashtray, coffee cups
      const mx = R(w * 0.24), my = R(h * 0.34), mw = Math.max(3, R(5 * q)), mh = Math.max(3, R(6 * q));
      rect(mx + 1, my + 1, mw, mh, P.K); rect(mx, my, mw, mh, P.W); rect(mx, my, mw, Math.max(1, R(2 * q)), P.RD2); if (S >= 10) { rect(mx + 1, my + R(3 * q), mw - 2, 1, P.G3); rect(mx + 1, my + R(4 * q), mw - 3, 1, P.G3); }
      const ax = R(w * 0.58), ay = R(h * 0.52), aw = Math.max(3, R(4 * q)); biX_ball(ax, ay, aw, aw, P.G3, P.W, P.G1); px(ax + (aw >> 1), ay + (aw >> 1), P.K); if (S >= 10) px(ax + aw, ay + 1, P.W);
      const cxp = R(w * 0.62), cyp = R(h * 0.26); biX_ball(cxp, cyp, Math.max(3, R(3 * q)), Math.max(3, R(3 * q)), P.W, P.W, P.G3); px(cxp + 1, cyp + 1, P.BR);
      break;
    }
    case 'toilet': {
      const tx = R(S * 0.18); biX_box(tx, 0, S - 2 * tx, Math.max(3, R(S * 0.32)), P.W, P.W, P.G3);
      if (S >= 10) px(R(S / 2), 1, P.G3);
      const bx = R(S * 0.22), by = R(S * 0.26); biX_ball(bx, by, S - 2 * bx, S - by - 1, P.W, P.W, P.G3);
      biX_ell(bx + 2, by + 2, S - 2 * bx - 4, S - by - 5, P.TL); if (S >= 9) biX_ell(bx + 3, by + 3, S - 2 * bx - 6, S - by - 7, P.CY);
      break;
    }
    case 'sink': {
      const bx = R(S * 0.1); biX_ball(bx, R(S * 0.08), S - 2 * bx, R(S * 0.75), P.W, P.W, P.G3);
      biX_ell(bx + 2, R(S * 0.08) + 2, S - 2 * bx - 4, R(S * 0.75) - 4, P.G3); biX_ell(bx + 2, R(S * 0.08) + 3, S - 2 * bx - 4, R(S * 0.75) - 5, P.CY);
      px(R(S / 2), R(S * 0.45), P.K); rect(R(S / 2) - 1, 0, 3, Math.max(2, R(S * 0.2)), P.G1); px(R(S / 2), 0, P.W);
      break;
    }
    case 'evidence': {
      if (st.indexOf('c') < 0) break;
      biX_box(1, 1, S - 2, S - 2, P.BR, P.YE, P.RD);
      for (let y = 1 + Math.max(2, R(S / 3)); y < S - 2; y += Math.max(2, R(S / 3))) rect(2, y, S - 4, 1, P.RD);
      rect(2, 2, 1, S - 4, P.YE); line(2, 2, S - 3, S - 3, P.RD); if (S >= 10) { px(R(S / 2) - 1, R(S / 2) + 2, P.K); px(R(S / 2), R(S / 2) + 2, P.K); }
      break;
    }
    case 'car': {
      const c = biX_ramp(st.split('_')[1] || P.RD), glass = c[1] === P.BL || c[1] === P.BL2 ? [P.K, P.TL] : [P.BL, P.CY];
      const map = { k: P.K, t: P.K, T: P.G1, B: c[2], b: c[1], d: c[0] === P.K ? c[1] : c[0], g: glass[0], G: glass[1], w: P.G3, y: P.YE, r: P.RD2 };
      biX_rows(biX_CAR, R((w - 18) / 2), R((h - 12) / 2), map);
      break;
    }
    case 'bin': {
      biX_ball(R(S * 0.12), R(S * 0.12), S - 2 * R(S * 0.12), S - 2 * R(S * 0.12), P.G3, P.W, P.G1);
      biX_ell(R(S * 0.3), R(S * 0.3), S - 2 * R(S * 0.3), S - 2 * R(S * 0.3), P.G1); px(R(S / 2), R(S / 2), P.G3);
      break;
    }
    case 'lamp': {
      const cx = R(S / 2);
      biX_ball(cx - 2, R(S * 0.15), 4, 4, P.G1, P.G3, P.K);          // the post, from above
      rect(cx - 1, R(S * 0.15) + 3, 2, Math.max(1, R(S * 0.3)), P.K);  // arm out over the road
      biX_ball(cx - 2, S - 5, 5, 4, P.YE, P.W, P.BR);                 // lamp head
      break;
    }
  }
}
// where the mainframe's tape reels and lamp panel sit (shared by the static sprite and the animation)
function biX_mfLayout(w, h) {
  const r = Math.max(2, Math.round(h * 0.26)), y = Math.round(h * 0.42);
  return { reels: [{ x: Math.round(w * 0.2), y, r }, { x: Math.round(w * 0.2) + r * 2 + 2, y, r }], px: Math.round(w * 0.2) + r * 3 + 4, py: 2, pw: Math.max(3, w - (Math.round(w * 0.2) + r * 3 + 4) - 3), ph: Math.max(3, Math.round(h * 0.55)) };
}

// ---------- floors per room kind (drawn once into the room layer) ----------
function biX_floor(kind, X, Y, w, h, S) {
  const pat = {
    hall: (i, j) => { const t = (Math.floor(i / S) + Math.floor(j / S)) & 1; return t ? (biX_bay(i, j) < 5 ? P.G1 : P.G3) : (biX_hash(i, j, 1) < 0.04 ? P.W : P.G3); },
    office: (i, j) => {
      const ph = Math.max(3, Math.round(S / 2)), r = Math.floor(j / ph), pl = S * 2, off = (r % 3) * Math.round(S * 0.66), n = Math.floor((i + off) / pl);
      if (j % ph === ph - 1) return P.RD; if ((i + off) % pl === 0) return biX_bay(i, j) < 8 ? P.K : P.RD;
      const tone = biX_hash(n, r, 2), jj = j % ph;
      if (jj === 0 && tone > 0.5 && biX_hash(i >> 1, r, 4) < 0.5) return P.RD;           // grain streaks
      if (tone < 0.3 && jj === ph - 2 && biX_hash(i >> 2, r, 5) < 0.6) return P.RD;
      return biX_hash(i, j, 6) < 0.025 ? P.RD : P.BR;
    },
    exec: (i, j) => {
      const b = Math.max(2, Math.round(S * 0.5)), e = Math.min(i, j, w - 1 - i, h - 1 - j);
      if (e === b) return P.YE; if (e === b + 1) return P.BR; if (e === b - 1) return P.K;
      if (e > b + 1) { const u = (i - b) % 6, v = (j - b) % 6; if ((Math.abs(u - 3) + Math.abs(v - 3)) === 2 && S >= 9) return P.MG; }
      return biX_bay(i, j) < 1 ? P.K : P.RD;
    },
    file: (i, j) => { const fi = i % S, fj = j % S; if (fi === 0 || fj === 0) return P.G1; if (fi === 1 || fj === 1) return P.W; const hsh = biX_hash(i, j, 5); return hsh < 0.03 ? P.G1 : P.G3; },
    computer: (i, j) => { const fi = i % S, fj = j % S; if (fi === 0 || fj === 0) return P.W; if (fi === S - 1 || fj === S - 1) return P.G1; if (S >= 10 && fi % 3 === 1 && fj % 3 === 1 && fi > 1 && fj > 1 && fi < S - 2 && fj < S - 2) return P.G1; return P.G3; },
    cipher: (i, j) => biX_bay(i, j) < 2 ? P.BL2 : P.BL,
    lounge: (i, j) => biX_hash(i, j, 7) < 0.03 ? P.GR2 : biX_bay(i, j) < 2 ? P.K : P.GR,
    bath: (i, j) => { const ts = Math.max(3, Math.floor(S / 2)); const a = i % ts === 0, b = j % ts === 0; if (a && b) return P.TL; if (a || b) return P.G3; return P.W; },
  }[kind] || ((i, j) => P.G3);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(X + i, Y + j, pat(i, j));
  // shadow cast by the north and west walls
  const sh = S >= 10 ? 2 : 1;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const e = Math.min(i, j); if (e < sh && biX_bay(X + i, Y + j) < (e === 0 ? 10 : 5)) px(X + i, Y + j, P.K); }
}
// walls: 4px bevelled band with a cyan outline and mitred corners (after the original)
function biX_walls(X0, Y0, w, h) {
  rect(X0 - 4, Y0 - 4, w + 8, h + 8, P.CY); rect(X0 - 3, Y0 - 3, w + 6, h + 6, P.G3);
  rect(X0 - 3, Y0 - 3, w + 6, 1, P.W); rect(X0 - 3, Y0 - 3, 1, h + 6, P.W); rect(X0 - 3, Y0 + h + 2, w + 6, 1, P.G1); rect(X0 + w + 2, Y0 - 3, 1, h + 6, P.G1);
  rect(X0 - 1, Y0 - 1, w + 2, 1, P.G1); rect(X0 - 1, Y0 - 1, 1, h + 2, P.G1); rect(X0 - 1, Y0 + h, w + 2, 1, P.W); rect(X0 + w, Y0 - 1, 1, h + 2, P.W);
  for (const [cx, cy, dx, dy] of [[X0 - 3, Y0 - 3, 1, 1], [X0 + w + 2, Y0 - 3, -1, 1], [X0 - 3, Y0 + h + 2, 1, -1], [X0 + w + 2, Y0 + h + 2, -1, -1]]) for (let k = 0; k < 3; k++) px(cx + dx * k, cy + dy * k, P.G1);
}
// a door in canonical frame: opening along +x (width dw), wall depth 0..3 along +y, room beyond y=4
function biX_door(dw, open, outside, S) {
  rect(0, 0, 1, 4, P.K); rect(dw - 1, 0, 1, 4, P.K); rect(1, 0, 1, 4, P.G1); rect(dw - 2, 0, 1, 4, P.W);
  if (open) {
    if (outside) { for (let y = 0; y < 4; y++) for (let x = 2; x < dw - 2; x++) px(x, y, biX_bay(x, y) < 6 ? P.BL : P.K); }
    else { rect(2, 0, dw - 4, 4, P.G1); for (let x = 2; x < dw - 2; x++) if (x & 1) px(x, 1, P.G3); }
    // both leaves swung into the room, with their swing arcs dotted on the floor
    const L = Math.max(3, (dw >> 1) - 2), lc = outside ? P.GR2 : P.YE, lb = outside ? P.GR : P.BR;
    for (let a = 1; a < 10; a += 2) { const an = a / 10 * Math.PI / 2, xx = Math.round(Math.cos(an) * L), yy = Math.round(4 + Math.sin(an) * L); px(2 + xx, yy, P.G1); px(dw - 3 - xx, yy, P.G1); }
    for (const x0 of [2, dw - 5]) { rect(x0, 4, 3, L, P.K); rect(x0 + 1, 4, 1, L - 1, lb); px(x0 + 1, 4, lc); px(x0 + 1, 4 + L - 2, P.YE); }
  } else if (outside) { // steel street door: green panels, push bar, centre seam
    rect(2, 0, dw - 4, 4, P.GR); rect(2, 0, dw - 4, 1, P.K); rect(2, 1, dw - 4, 1, P.GR2); rect(2, 3, dw - 4, 1, P.K);
    const m = dw >> 1; rect(m, 0, 1, 4, P.K); rect(4, 2, m - 6, 1, P.G3); rect(m + 2, 2, dw - m - 6, 1, P.G3); px(m - 2, 2, P.W); px(m + 2, 2, P.W);
  } else { // wooden double door: panels, centre seam, brass handles
    rect(2, 0, dw - 4, 4, P.BR); rect(2, 0, dw - 4, 1, P.RD); rect(2, 3, dw - 4, 1, P.K);
    const m = dw >> 1; rect(m, 0, 1, 4, P.K);
    for (let x = 3; x < dw - 3; x++) if (x !== m && x !== m - 1 && x !== m + 1 && (x - 3) % 4 === 1) px(x, 1, P.YE);
    px(m - 2, 2, P.YE); px(m + 2, 2, P.YE); px(m - 2, 1, P.W); px(m + 2, 1, P.W);
  }
}

// ---------- the city street for ambushes ----------
function biX_street(X0, Y0, w, h, S, oy, MH, night) {
  // building fronts in the margin: brick with doorways and lit windows
  for (let j = -4; j < h + 4; j++) for (let i = -4; i < w + 4; i++) {
    if (j >= 0 && j < h && i >= 0 && i < w) continue;
    const bi = i + 64, bj = j + 64; let c = (bj % 3 === 0 || (bi + (Math.floor(bj / 3) % 2) * 3) % 6 === 0) ? P.K : (biX_hash(bi >> 1, bj, 9) < 0.2 ? P.BR : P.RD);
    px(X0 + i, Y0 + j, c);
  }
  for (const yy of [Y0 - 4, Y0 + h]) for (let x = X0 + 6; x < X0 + w - 8; x += 26) { rect(x, yy, 8, 4, P.K); rect(x + 1, yy === Y0 - 4 ? yy : yy + 1, 6, 3, P.BR); rect(x + 14, yy + 1, 6, 2, night ? P.YE : P.TL); }
  // sidewalks: paving slabs, curb, gutter
  const sw = 2 * S;
  for (const sy of [Y0, Y0 + h - sw]) { for (let j = 0; j < sw; j++) for (let i = 0; i < w; i++) { const hs = biX_hash(i, j + sy, 11); px(X0 + i, sy + j, (i % S === 0 || j % S === 0) ? P.G1 : hs < 0.05 ? P.W : hs > 0.95 ? P.G1 : P.G3); } }
  rect(X0, Y0 + sw - 1, w, 1, P.W); rect(X0, Y0 + sw, w, 1, P.K); rect(X0, Y0 + h - sw, w, 1, P.W); rect(X0, Y0 + h - sw - 1, w, 1, P.K);
  // asphalt
  const ry = Y0 + sw + 1, rh = h - 2 * sw - 2;
  for (let j = 0; j < rh; j++) for (let i = 0; i < w; i++) { const hs = biX_hash(i, j, 12), patch = vnoise(i / 9, j / 7) > 0.68; px(X0 + i, ry + j, night ? (hs < 0.04 ? P.G3 : biX_bay(i, j) < 8 ? P.K : P.G1) : (hs < 0.05 ? P.K : hs > 0.985 ? P.G3 : patch && biX_bay(i, j) < 5 ? P.K : P.G1)); }
  // lane markings, a manhole, an oil stain
  const cy = oy + Math.floor(MH / 2) * S; for (let x = X0 + 2; x < X0 + w; x += 10) rect(x, cy, 5, 1, P.YE);
  for (let x = X0 + 2; x < X0 + w; x += 3 * S) { rect(x, ry + 2 * S - 1, 1, 2, P.W); rect(x, ry + rh - 2 * S - 1, 1, 2, P.W); }
  biX_ball(X0 + Math.round(w * 0.62), cy + 4, 7, 5, P.G1, P.G3, P.K); rect(X0 + Math.round(w * 0.62) + 2, cy + 6, 3, 1, P.K);
  for (let k = 0; k < 14; k++) { const a = biX_hash(k, 3, 13) * 6.28, d = biX_hash(k, 4, 13) * 5; px(X0 + Math.round(w * 0.3 + Math.cos(a) * d * 1.4), cy - 8 + Math.round(Math.sin(a) * d), P.K); }
  // the road runs off both ends
  for (const ex of [X0 - 4, X0 + w]) { const y0 = oy + 5 * S, hh = (MH - 10) * S; for (let j = 0; j < hh; j++) for (let i = 0; i < 4; i++) px(ex + i, y0 + j, biX_bay(ex + i, y0 + j) < 6 ? P.K : P.G1); }
}

// ---------- explosions and gas (cached frames) ----------
function biX_boom(type, fi, rad) {
  return sprite('biX_boom_' + type + fi + '_' + rad, rad * 2 + 1, rad * 2 + 1, () => {
    const p = fi / 7, fr = rad * (0.35 + 0.65 * Math.sqrt(p));
    for (let j = 0; j <= rad * 2; j++) for (let i = 0; i <= rad * 2; i++) {
      const dx = i - rad, dy = j - rad, d = Math.hypot(dx, dy) / fr; if (d > 1.15 || Math.hypot(dx, dy) > rad) continue;
      const n = vnoise(i * 0.3 + fi * 3.1, j * 0.3) - 0.5, b = biX_bay(i, j) / 16;
      if (type === 'frag') {
        const z = d + n * 0.5 + p * 0.75;
        if (d + n * 0.4 > 1 + (b - 0.5) * 0.2) continue;
        if (p > 0.55 && z > 1.2 && b < (p - 0.5) * 1.6) continue; // the smoke thins out
        px(i, j, z < 0.3 ? P.W : z < 0.55 ? P.YE : z < 0.8 ? P.RD2 : z < 1.0 ? P.RD : z < 1.3 || b < 0.5 ? P.G1 : P.K);
      } else {
        const ring = Math.abs(d - 0.9 - n * 0.2);
        if (ring < 0.12) px(i, j, p < 0.5 ? P.W : P.CY);
        else if (d < 0.8 && b < (1 - p) * 0.9 - d * 0.4) px(i, j, d < 0.4 ? P.W : P.YE);
      }
    }
  });
}
function biX_gas(rad, ph) {
  return sprite('biX_gas_' + rad + '_' + ph, rad * 2 + 1, rad * 2 + 1, () => {
    for (let j = 0; j <= rad * 2; j++) for (let i = 0; i <= rad * 2; i++) {
      const d = Math.hypot(i - rad, j - rad) / rad; if (d > 1) continue;
      const n = vnoise(i * 0.16 + ph * 1.3, j * 0.16 - ph * 0.7), dens = (1 - d) * 1.5 + (n - 0.5) * 1.1, b = biX_bay(i, j);
      if (b < dens * 7) px(i, j, b < dens * 2.2 ? P.GR : P.GR2);
    }
  });
}

// ---------- Max, side view, for the portrait box ----------
const biX_MAX_TOP = [
  '......kkkkk..........',
  '.....kbbdDdk.........',
  '....kbbbbbddk........',
  '....kbdbbbbbk........',
  '....kkkkkkkkkk.......',
  '....kbbhsskkk........',
  '....kbhsssewk........',
  '....kbhsssssk........',
  '....kbhssssssk.......',
  '.....khsshsk.........',
  '......kbbhhbk........',
  '....kkbbdbbbbkk......',
  '...kbbbddbbbbbbkkkkkk',
  '...kbbddbbbbddssmmnnn',
  '...kbddbbbbbbkhhgkkkk',
  '...kbdbbbbbbbk..gg...',
  '...kbdbbbbbbk........',
  '...kbdbbbbbbk........',
  '...kGGGGGGGGk........',
];
const biX_MAX_LEGS = [[
  '...kbbbbbbbbk........',
  '...kbbdbkbbbk........',
  '...kbbdbkbbdk........',
  '...kbbdbkbbdk........',
  '...kbdbk.kbdk........',
  '...kbdbk.kbdk........',
  '...kbdbk.kbdk........',
  '...klllk.klllk.......',
  '...kllllkkLlllk......',
], [
  '...kbbbbbbbbk........',
  '..kbbdbbbbbbbk.......',
  '..kbdbk.kbbdbk.......',
  '.kbdbk...kbbdbk......',
  '.kbdbk....kbdbk......',
  'kbdbk......kbdbk.....',
  'kbdk........kbdbk....',
  'kllk........klllk....',
  'kLllk.......kLlllk...',
], [
  '...kbbbbbbbbk........',
  '...kbdbbbbbbk........',
  '...kbdbkkbdbk........',
  '...kbdbkkbdk.........',
  '....kbdbkbdk.........',
  '....kbdbkbdk.........',
  '....kbdkkbdk.........',
  '....klllklllk........',
  '....kLlllkLlllk......',
]];
const biX_MAX_CROUCH = [
  '...kbbbbbbbbbbbbk....',
  '...kbdbbbbbbbbdbbk...',
  '...kbdbkkkkkkkbdbk...',
  '..kbdbk......kbdk....',
  '.kLlllk.....kLllk....',
];
function biX_maxMap(disg, uni) {
  const r = disg ? biX_ramp(uni) : [P.K, P.K, P.G1];
  return { k: P.K, b: r[1], d: disg ? r[2] : P.G1, D: disg ? P.W : P.G3, s: P.SK, h: P.BR, e: P.K, w: P.W, l: P.K, L: P.G1, G: disg ? P.K : P.G1, g: P.K, m: P.G1, n: P.G3 };
}

// ---------- equipment display pieces ----------
function biX_gunSide(uzi) {
  return sprite('biX_gun_' + (uzi ? 'uzi' : 'pistol'), 60, 20, () => {
    if (!uzi) {
      biX_box(0, 3, 19, 5, P.G1, P.G3, P.K); for (let x = 3; x < 17; x += 3) px(x, 6, P.K); rect(0, 4, 1, 3, P.K); px(1, 5, P.K);
      rect(18, 1, 26, 6, P.K); rect(19, 2, 24, 4, P.G1); rect(19, 2, 24, 1, P.G3); rect(24, 3, 6, 1, P.K); for (let x = 36; x < 42; x += 2) rect(x, 3, 1, 2, P.K);
      px(20, 0, P.K); rect(41, 0, 2, 1, P.K);
      rect(18, 7, 24, 2, P.K); rect(19, 7, 22, 1, P.G1);
      frame(23, 8, 8, 5, P.K); px(27, 9, P.G3); px(27, 10, P.G1);
      for (let r = 0; r < 9; r++) { const x0 = 31 + Math.round(r * 0.6); rect(x0, 8 + r, 10, 1, P.K); if (r < 8) { rect(x0 + 1, 8 + r, 8, 1, P.BR); if (r % 2) px(x0 + 3, 8 + r, P.RD); px(x0 + 1, 8 + r, P.YE); } }
    } else {
      rect(0, 5, 8, 3, P.K); rect(1, 5, 6, 1, P.G1); rect(6, 3, 3, 7, P.K); px(7, 4, P.G3);
      biX_box(8, 2, 32, 9, P.G1, P.G3, P.K); for (let x = 12; x < 22; x += 2) rect(x, 4, 1, 4, P.K); rect(23, 3, 10, 1, P.W); rect(28, 2, 3, 1, P.K);
      rect(9, 0, 2, 2, P.K); rect(35, 0, 3, 2, P.K);
      frame(16, 10, 9, 5, P.K); px(20, 11, P.G3);
      rect(25, 11, 8, 9, P.K); rect(26, 11, 6, 8, P.G1); rect(26, 11, 1, 8, P.G3); for (let y = 13; y < 19; y += 2) rect(27, y, 4, 1, P.K);
      rect(40, 4, 18, 1, P.K); rect(40, 8, 18, 1, P.K); rect(40, 5, 17, 1, P.G1); rect(56, 3, 3, 7, P.K); rect(57, 4, 1, 5, P.G1);
    }
  });
}
const biX_CAR = [
  '...tTt......tTt...', '.kkkkkkkkkkkkkkkk.', 'krBBBBBBBBBBBBBByk', 'kwbbkgGBBBgGkbbbwk', 'kwbbkgbbbbggkbbbwk', 'kwbbkgbbbbggkBBBwk',
  'kwbbkgbbbbggkbbbwk', 'kwbbkGbbbbgGkbbbwk', 'kwbbkgddddggkbbbwk', 'krddddddddddddddyk', '.kkkkkkkkkkkkkkkk.', '...tTt......tTt...',
];
const biX_GREN = ['.kgk.', 'kcwck', 'kcccd', '.kdk.'];
function biX_grenMap(col) { const r = biX_ramp(col); return { k: P.K, g: P.G3, c: r[1], w: r[2], d: r[0] === P.K ? P.G1 : r[0] }; }
const biX_BUG = ['...k...', '.kkRkk.', 'kRRWRRk', 'kRRRRRk', '.kkkkk.', '.k...k.'];
const biX_BUGMAP = { k: P.K, R: P.RD, W: P.RD2 };
const biX_ROUND = ['.Y.', 'YYW', 'YYB', 'BBB', 'BBB', 'BBB', 'KKK'];
const biX_ROUNDMAP = { Y: P.BR, W: P.YE, B: P.YE, K: P.BR };
const biX_CLIP = ['kkkkkkk', 'kYYWYYk', 'kGgggGk', 'kGgggGk', 'kGgggGk', 'kGgggGk', 'kGgggGk', 'kGgggGk', 'kGgggGk', 'kGgggGk', 'kGgggGk', 'kGgggGk', 'kGgggGk', 'kkkkkkk'];
const biX_CLIPMAP = { k: P.K, Y: P.BR, W: P.YE, G: P.G3, g: P.G1 };
function biX_camera() {
  return sprite('biX_cam', 22, 14, () => {
    rect(4, 0, 6, 2, P.K); rect(5, 1, 4, 1, P.G3); rect(14, 1, 4, 2, P.K); px(15, 1, P.RD2);
    biX_box(0, 2, 22, 11, P.K, P.K, P.K); rect(1, 3, 20, 2, P.G3); rect(1, 3, 20, 1, P.W); rect(1, 5, 20, 7, P.K); for (let x = 2; x < 20; x += 2) for (let y = 6; y < 12; y += 2) px(x + (y & 2 ? 1 : 0), y, P.G1);
    biX_ball(6, 4, 10, 10, P.G1, P.G3, P.K); biX_ell(8, 6, 6, 6, P.BL); biX_ell(9, 7, 4, 4, P.TL); px(9, 7, P.W); px(10, 7, P.CY);
    rect(17, 6, 3, 2, P.TL); px(17, 6, P.CY);
  });
}
function biX_safekit() {
  return sprite('biX_safekit', 46, 25, () => {
    // an open leather tool roll: stethoscope, hand drill, lock picks
    rect(0, 3, 46, 22, P.K); rect(1, 4, 44, 20, P.BR); rect(2, 5, 42, 18, P.K); for (let x = 2; x < 44; x += 2) { px(x, 4, P.YE); px(x + 1, 23, P.RD); }
    for (const x of [16, 31]) rect(x, 6, 1, 16, P.RD);
    rect(17, 0, 12, 4, P.K); rect(18, 1, 10, 2, P.BR); px(18, 1, P.YE);
    // stethoscope: ear tubes, a loop of tubing, the chest piece
    for (let a = 0; a < 30; a++) { const an = a / 30 * Math.PI * 1.75 + 0.3; px(9 + Math.round(Math.cos(an) * 5), 12 + Math.round(Math.sin(an) * 5), a % 5 ? P.G3 : P.W); }
    rect(4, 6, 1, 4, P.G3); rect(12, 6, 1, 4, P.G3); px(4, 6, P.W); px(12, 6, P.W);
    biX_ball(9, 15, 6, 6, P.G3, P.W, P.G1); px(11, 17, P.K);
    // drill
    biX_box(19, 8, 10, 6, P.YE, P.W, P.BR); rect(24, 14, 4, 7, P.K); rect(25, 14, 2, 6, P.RD); px(25, 15, P.RD2); rect(18, 10, 1, 2, P.K); rect(17, 10, 1, 2, P.G3); rect(18, 10, 1, 1, P.W);
    // picks and tension wrenches
    for (let n = 0; n < 5; n++) { rect(33 + n * 2, 7, 1, 14, P.G3); px(33 + n * 2, 7, P.W); rect(33 + n * 2, 17, 1, 4, P.BR); if (n % 2) px(34 + n * 2, 8, P.G3); }
  });
}
function biX_silhouette() {
  return sprite('biX_sil', 145, 99, () => {
    rect(0, 0, 145, 99, P.BL);
    const cx = 276 - 173;
    const inside = (x, y) => {
      if (((x - cx) / 11) ** 2 + ((y - 17) / 14) ** 2 < 1) return true;
      if (Math.abs(x - cx) < 7 && y >= 28 && y < 40) return true;
      if (y >= 34) { const s = Math.min(1, (y - 33) / 12), hw = 7 + 24 * Math.sqrt(s) + Math.max(0, (y - 46) * 0.06); if (Math.abs(x - cx) < hw) return true; }
      if (y >= 42 && y < 54 && x > 232 - 173 && x < cx) return y - 42 > (cx - x) * 0.05 - 1;
      return false;
    };
    for (let y = 0; y < 99; y++) for (let x = 0; x < 145; x++) {
      if (!inside(x, y)) continue;
      if (!inside(x - 1, y)) { px(x, y, P.BR); continue; }
      if (!inside(x + 1, y)) { px(x, y, P.K); continue; }
      if (y % 2 === 0) px(x, y, (x - cx) > 12 && biX_bay(x, y) < 10 ? P.K : P.G1);
    }
  });
}
function biX_mask(x, y) { // gas mask on the silhouette's face
  biX_ball(x, y, 22, 17, P.G1, P.G3, P.K); biX_ball(x + 3, y + 3, 7, 6, P.TL, P.CY, P.BL); biX_ball(x + 12, y + 3, 7, 6, P.TL, P.CY, P.BL); px(x + 5, y + 4, P.W); px(x + 14, y + 4, P.W);
  biX_ball(x + 7, y + 10, 8, 8, P.G3, P.W, P.G1); for (let i = 0; i < 3; i++) px(x + 9 + i * 2, y + 13, P.K); rect(x, y + 6, 2, 3, P.K); rect(x + 20, y + 6, 2, 3, P.K);
}

// ---------- the Equipment Display: kit on Max's silhouette (also used by the armory) ----------
function biX_vestPx(i, j) { // design space 50 x 65
  const c = 24.5, dx = Math.abs(i - c);
  if (j < 14) { if (dx > 8 && dx < 17) return (dx < 10 ? P.G3 : dx > 15 ? P.K : (j % 3 ? P.G1 : P.K)); return null; }   // shoulder straps
  if (j < 22 && dx < 8 + (j - 14) * 0.2 && j < 14 + (8 - dx) * 0.9) return null;                                       // neck scoop
  const half = j < 22 ? 17 + (j - 14) * 0.9 : 24; if (dx > half) return null;
  if (j > 60 && dx > 24 - (64 - j)) return null;
  if (dx < 1) return j % 3 === 0 ? P.G3 : P.K;                                                                      // velcro seam
  const pouch = j >= 30 && j < 43 && (dx > 3 && dx < 11 || dx > 12 && dx < 20);
  if (pouch) { if (j < 33) return j === 30 ? P.G3 : P.G1; if ((dx < 5 || (dx > 9.5 && dx < 13.5) || dx > 18.5) || j === 42) return P.K; return biX_bay(i, j) < 3 ? P.G3 : P.G1; }
  if (j === 29 || j === 48) return P.K; if (j === 49) return P.G3;
  if (j >= 52 && j < 56 && dx > 14) return j === 52 ? P.G3 : P.K;                                                  // side straps
  if (dx > half - 1.5) return i < c ? P.G3 : P.K;
  return biX_bay(i, j) < 2 ? P.K : P.G1;
}
function biX_vest(w, h) { return sprite('biX_vest' + w + 'x' + h, w + 2, h + 1, () => biX_raster(1, 0, w, h, (i, j) => biX_vestPx(Math.floor((i + 0.5) * 50 / w), Math.floor((j + 0.5) * 65 / h)), P.K)); }
// kit: the chosen equipment; m: { gun, hits, gren, gtype, bugs, clip, clips, film }; drawn for a panel whose left edge is x=173
function biX_equip(kit, m, t) {
  g.drawImage(biX_silhouette(), 173, 0);
  if (kit.kevlar) { g.drawImage(biX_vest(50, 65), 250, 31); for (let i = 0; i < m.hits; i++) { const hx = 262 + (i * 17) % 30, hy = 50 + (i * 11) % 30; biX_ball(hx - 2, hy - 2, 5, 5, P.G1, P.W, P.K, P.G3); px(hx, hy, P.K); } }
  else for (let i = 0; i < m.hits; i++) { const hx = 266 + i * 8, hy = 56; biX_ell(hx - 1, hy, 6, 5, P.RD); px(hx, hy + 1, P.RD2); px(hx + 1, hy + 5, P.RD); px(hx + 2, hy + 6, P.RD); }
  if (kit.gasmask) biX_mask(265, 12);
  if (kit.detector) {
    for (let a = 0; a <= 24; a++) { const an = Math.PI + a / 24 * Math.PI, xx = 276 + Math.round(Math.cos(an) * 13), yy = 17 + Math.round(Math.sin(an) * 15); px(xx, yy, P.G3); px(xx, yy - 1, P.W); px(xx, yy + 1, P.K); }
    for (const ex of [260, 288]) { biX_box(ex, 11, 5, 10, P.G1, P.G3, P.K); rect(ex + 2, 0, 1, 11, P.G3); px(ex + 2, 0, (t * 3 | 0) % 2 ? P.RD2 : P.YE); }
  }
  const uzi = m.gun === 'uzi'; g.drawImage(biX_gunSide(uzi), uzi ? 188 : 183, uzi ? 37 : 38);
  biX_ball(214, 43, 10, 9, P.G1, P.G3, P.K); rect(216, 51, 5, 2, P.K);
  // grenade bandolier
  rect(177, 1, 58, 17, P.K);
  ['frag', 'stun', 'gas'].forEach((k2, row) => {
    const y = 3 + row * 5, on = m.gtype === k2; rect(178, y - 1, 56, 5, on ? P.TL : P.G1); rect(178, y - 1, 56, 1, on ? P.CY : P.G3);
    for (let n = 0; n < 8; n++) px(184 + n * 7, y + 1, P.K);
    for (let n = 0; n < Math.min(8, m.gren[k2]); n++) biX_put('gr_' + k2, biX_GREN, biX_grenMap(GREN[k2].col), 179 + n * 7, y);
  });
  for (let n = 0; n < m.bugs; n++) biX_put('bug', biX_BUG, biX_BUGMAP, 236 + (n % 2) * 9, 8 + Math.floor(n / 2) * 8);
  for (let n = 0; n < m.clip; n++) biX_put('round', biX_ROUND, biX_ROUNDMAP, 178 + n * 5, 70);
  for (let n = 0; n < Math.min(4, m.clips); n++) biX_put('clip', biX_CLIP, biX_CLIPMAP, 178 + n * 10, 80);
  if (kit.camera) {
    g.drawImage(biX_camera(), 224, 71);
    rect(223, 86, 15, 9, P.K); frame(223, 86, 15, 9, P.G1); text(String(m.film).padStart(2, '0'), 225, 87, P.GR2);
    rect(239, 86, 7, 8, P.K); rect(240, 87, 5, 6, P.YE); rect(240, 89, 5, 2, P.K); px(242, 86, P.G3);
  }
  if (kit.safekit) g.drawImage(biX_safekit(), 248, 73);
}

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
  const layers = new Map();
  // the static part of a room (floor, walls, doors, furniture) is painted once per room, scale and state
  function drawRoom(v) {
    const { r, S, ox, oy } = v, X0 = ox + r.x * S, Y0 = oy + r.y * S, w = r.w * S, h = r.h * S;
    const key = r.id + '|' + S + '|' + r.doors.map(d => d.open ? 1 : 0).join('') + '|' + roomF[r.id].map(furnState).join(',');
    let c = layers.get(key);
    if (!c) {
      if (layers.size > 40) layers.clear();
      c = document.createElement('canvas'); c.width = w + 8; c.height = h + 8;
      drawTo(c.getContext('2d'), () => {
        g.translate(4 - X0, 4 - Y0);
        if (r.kind === 'street') {
          biX_street(X0, Y0, w, h, S, oy, B.MH, night);
          if (night) for (const f of roomF[r.id]) if (f.type === 'lamp') { const cx = ox + f.x * S + S / 2, cy = oy + f.y * S + S / 2, R = S * 2.6; for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) { const d = Math.hypot(xx, yy) / R; const X = Math.round(cx + xx), Y = Math.round(cy + yy); if (d < 1 && X >= X0 && X < X0 + w && Y >= Y0 && Y < Y0 + h && biX_bay(X, Y) < (1 - d) * 7) px(X, Y, P.YE); } }
        } else { biX_walls(X0, Y0, w, h); biX_floor(r.kind, X0, Y0, w, h, S); for (const d of r.doors) drawDoor(d, v, X0, Y0, w, h); }
        for (const f of roomF[r.id]) drawFurn(f, v);
      });
      layers.set(key, c);
    }
    g.drawImage(c, X0 - 4, Y0 - 4);
  }
  function drawDoor(d, v, X0, Y0, w, h) {
    const S = v.S, dw = 2 * S, half = Math.floor(S / 2); g.save();
    if (d.o === 'h') { const dx = v.ox + d.x * S - half; if (d.y < v.r.y) g.translate(dx, Y0 - 4); else { g.translate(dx + dw, Y0 + h + 4); g.rotate(Math.PI); } }
    else { const dy = v.oy + d.y * S - half; if (d.x < v.r.x) { g.translate(X0 - 4, dy + dw); g.rotate(-Math.PI / 2); } else { g.translate(X0 + w + 4, dy); g.rotate(Math.PI / 2); } }
    biX_door(dw, d.open, d.outside, S); g.restore();
  }
  function furnState(f) {
    let s = f.opened ? 'o' : ''; if (f.type === 'evidence' && f.content) s += 'c';
    if ((f.type === 'chair' || f.type === 'couch') && B.rooms[f.room] && B.rooms[f.room].kind === 'exec') s += 'x';
    if (f.type === 'car') s += '_' + f.col; return s;
  }
  function wallSide(f) { const r = B.rooms[f.room]; if (!r || r.kind === 'street') return 'N'; if (f.y === r.y) return 'N'; if (f.y + f.h === r.y + r.h) return 'S'; if (f.x === r.x) return 'W'; if (f.x + f.w === r.x + r.w) return 'E'; return 'N'; }
  const WALLED = { file: 1, wallsafe: 1, picture: 1, typewriter: 1, terminal: 1, toilet: 1, sink: 1, computer: 1, couch: 1 };
  // run fn in the furniture's own frame: canonical sprite coordinates, turned to face away from its wall
  function inFurnFrame(f, v, fn) {
    const S = v.S, X = v.ox + f.x * S, Y = v.oy + f.y * S, w = f.w * S, h = f.h * S;
    let side = WALLED[f.type] ? wallSide(f) : f.type === 'lamp' && f.y > B.MH / 2 ? 'S' : 'N'; if (w !== h && (side === 'E' || side === 'W')) side = 'N';
    g.save();
    if (f.type === 'car' && f.x % 2) { g.translate(X + w, Y); g.scale(-1, 1); }
    else if (side === 'N') g.translate(X, Y);
    else { g.translate(X + w / 2, Y + h / 2); g.rotate({ E: Math.PI / 2, S: Math.PI, W: -Math.PI / 2 }[side]); g.translate(-w / 2, -h / 2); }
    fn(w, h); g.restore();
  }
  function drawFurn(f, v) { const spr = biX_furn(f.type, v.S, furnState(f)); inFurnFrame(f, v, () => g.drawImage(spr, 0, 0)); }
  // the moving parts: tape reels, lamp panels, terminal cursors
  function animFurn(f, v) {
    const S = v.S;
    if (f.type === 'computer') inFurnFrame(f, v, (w, h) => {
      const L = biX_mfLayout(w, h);
      L.reels.forEach((r, i) => { const a = t * (i ? 4.2 : -3.4); for (const s of [0, 2.1, 4.2]) px(r.x + Math.round(Math.cos(a + s) * (r.r - 1)), r.y + Math.round(Math.sin(a + s) * (r.r - 1)), P.G3); });
      const ph = t * 4 | 0;
      for (let yy = L.py + 1; yy < L.py + L.ph - 1; yy += 2) for (let xx = L.px + 1; xx < L.px + L.pw - 1; xx += 2) if (biX_hash(xx * 7 + yy, ph + ((xx * 3 + yy) >> 2), 8) < 0.45) px(xx, yy, [P.RD2, P.GR2, P.YE, P.W][(xx + yy * 3) % 4]);
    });
    if (f.type === 'terminal') inFurnFrame(f, v, () => {
      const cx = Math.round(S * 0.14), cw = S - 2 * cx, ch = Math.max(4, Math.round(S * 0.56));
      const lines = Math.max(1, Math.floor((ch - 6) / 2) + 1), ln = (t * 1.5 | 0) % lines, y = 3 + ln * 2;
      if (y < ch - 2) { const n = Math.max(1, cw - 6); rect(cx + 3, y, Math.min(n, 1 + ((t * 8 | 0) % n)), 1, P.GR2); if ((t * 3 | 0) % 2) px(cx + 3 + Math.min(n - 1, (t * 8 | 0) % n), y, P.W); }
    });
  }
  // ---------- people ----------
  const bigOf = S => S >= 10;
  const faceOf = a => ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8;
  function look(p) {
    if (p === max) { const d = max.disguised; return { uni: d ? uniC : P.K, head: d ? 'cap' : 'hood', hair: P.K, arms: 'gun', gun: max.gun, mask: kit.gasmask && clouds.length > 0, strap: !d }; }
    if (p.kind === 'guard') return { uni: p.col || uniC, head: 'cap', hair: P.K, arms: 'gun', gun: 'pistol', mask: !!p.gasmask && clouds.length > 0 };
    if (p.kind === 'ward') return { uni: P.W, head: 'hair', hair: P.G1, arms: 'side', stripes: true };
    const fc = p === target && occupant && occupant.face || {};
    return { uni: p.col || P.W, head: 'hair', hair: fc.hair || P.BR, skin: fc.skin, pants: P.K, arms: (p.state === 'cower' || p.state === 'captive') ? 'up' : 'side' };
  }
  function muzzle(x, y) { const f = (t * 30 | 0) % 2; px(x, y, P.W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px(x + dx, y + dy, P.YE); if (f) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) px(x + dx, y + dy, P.RD2); else for (const [dx, dy] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) px(x + dx, y + dy, P.RD2); }
  function stars(x, y) { for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1, sx = x + Math.round(Math.cos(a) * 5), sy = y + Math.round(Math.sin(a) * 2); px(sx, sy, P.W); if (((t * 8) | 0) % 2 === i % 2) { px(sx - 1, sy, P.YE); px(sx + 1, sy, P.YE); px(sx, sy - 1, P.YE); px(sx, sy + 1, P.YE); } } }
  const MARK = ['kkkkkkk', 'kYYYYYk', '.kYYYk.', '..kYk..', '...k...'];
  function drawGuy(p, X, Y, S) {
    const x = Math.round(X), y = Math.round(Y), big = bigOf(S), L = look(p);
    if (p.out) { if (p.hidden) return; const spr = biX_body(Object.assign({ big, flip: Math.cos(p.dir) < 0 }, L)); g.drawImage(spr, x - (spr.width >> 1), y - (spr.height >> 1)); return; }
    if (p._lw !== p.walk) { p._lw = p.walk; p._mt = t; }
    const moving = t - (p._mt === undefined ? -9 : p._mt) < 0.12, frame = moving ? 1 + ((p.walk * 6 | 0) % 2) : 0;
    const crouch = (p === max && max.crouch) || (p.state === 'seated' && (p === target || p === ward)), face = faceOf(p.dir);
    const spr = biX_person(Object.assign({ big, face, frame, crouch }, L)), top = y - (big ? 11 : 8);
    // a soft shadow on the floor under the feet
    const sw = big ? 9 : 7, fy = top + spr.height - 1; for (let i = 0; i < sw; i++) if ((i + fy) & 1) px(x - (sw >> 1) + i, fy, P.K);
    g.drawImage(spr, x - (spr.width >> 1), top);
    const fl = p === max ? max.fl : p.fl;
    if (L.arms === 'gun' && fl !== undefined && t - fl < 0.07) { const c = Math.cos(p.dir), s = Math.sin(p.dir), r = big ? 8 : 6; muzzle(x + Math.round(c * r), y + Math.round(s * r) - (big ? 2 : 1) + (crouch ? 2 : 0)); }
    if (p.stun > 0 || (p === max && max.stun > 0)) stars(x, top - 1);
    if (p === target && p.state === 'seated') biX_put('mark', MARK, { k: P.K, Y: P.YE }, x - 3, top - 6 - ((t * 3 | 0) % 2));
  }
  scene.draw = function () {
    // left: black/blue scan-lines; right: blue panel; white divider
    rect(0, 0, 171, H, P.K); for (let y = 1; y < H; y += 2) rect(0, y, 171, 1, P.BL);
    rect(171, 0, 1, H, P.W); rect(172, 0, 1, H, P.K); rect(173, 0, 145, H, P.BL); rect(318, 0, 1, H, P.K); rect(319, 0, 1, H, P.W);
    drawEquip();
    drawBuildingWindow(179, 99, 122, 98);
    if (!entryDoor) { drawDoorMenu(); postFlash(); return; }
    const v = roomView(), r = v.r, S = v.S, X0 = v.ox + r.x * S, Y0 = v.oy + r.y * S;
    drawRoom(v);
    for (const f of roomF[r.id]) if (f.type === 'computer' || f.type === 'terminal') animFurn(f, v);
    for (const tr of traps) if (roomOf(tr.x, tr.y) === r.id) {
      const X = Math.round(v.sx(tr.x)), Y = Math.round(v.sy(tr.y));
      if (tr.kind === 'booby') for (let i = 3; i < 8; i += 2) px(X + i, Y + 1, P.G3);
      biX_put('gr_' + tr.type, biX_GREN, biX_grenMap(GREN[tr.type].col), X - 2, Y - 2);
      if ((t * 3 | 0) % 2) { px(X, Y - 3, tr.kind === 'booby' ? P.RD2 : P.CY); px(X + 1, Y - 3, P.K); }
    }
    if (clouds.some(c => c.room === r.id)) {
      g.save(); g.beginPath(); g.rect(X0, Y0, r.w * S, r.h * S); g.clip();
      for (const c of clouds) if (c.room === r.id) { const rad = Math.max(3, Math.round(c.r / TS * S / 3) * 3), spr = biX_gas(rad, (t * 2.5 | 0) % 6); g.drawImage(spr, Math.round(v.sx(c.x)) - rad, Math.round(v.sy(c.y)) - rad); }
      g.restore();
    }
    const here = people.filter(p => roomOf(p.x, p.y) === r.id || p === max.prisoner).concat([max]);
    for (const p of here) if (p.out) drawGuy(p, v.sx(p.x), v.sy(p.y), S);
    const tall = roomF[r.id].filter(f => !FURN[f.type].flat && f.type !== 'chair');
    for (const p of here.filter(p => !p.out).sort((a, b) => a.y - b.y)) {
      const X = v.sx(p.x), Y = v.sy(p.y); drawGuy(p, X, Y, S);
      // whoever stands just north of a desk or cabinet disappears behind it
      const hw = bigOf(S) ? 8 : 6;
      for (const f of tall) { const fx0 = v.ox + f.x * S, fy0 = v.oy + f.y * S; if (fy0 > Y && fy0 < Y + 9 && fx0 < X + hw && fx0 + f.w * S > X - hw) { drawFurn(f, v); animFurn(f, v); } }
    }
    for (const b of bullets) if (roomOf(b.x, b.y) === r.id) { const X = Math.round(v.sx(b.x)), Y = Math.round(v.sy(b.y)), l = Math.hypot(b.vx, b.vy) || 1, tl = Math.max(2, S * 0.3); line(X - b.vx / l * tl, Y - b.vy / l * tl, X, Y, b.mine ? P.YE : P.RD2); px(X, Y, P.W); }
    for (const gr of grenades) if (roomOf(gr.x, gr.y) === r.id) {
      const X = Math.round(v.sx(gr.x)), Y = Math.round(v.sy(gr.y)), z = Math.round(gr.z);
      rect(X - 1, Y + 1, 3, 1, P.K);
      if (gr.t < 1) for (const dk of [0.1, 0.2, 0.3]) { const kk = gr.t - dk; if (kk <= 0) continue; px(Math.round(v.sx(gr.sx + (gr.tx - gr.sx) * kk)), Math.round(v.sy(gr.sy + (gr.ty - gr.sy) * kk) - Math.sin(kk * Math.PI) * 10), dk < 0.15 ? P.G3 : P.G1); }
      biX_put('gr_' + gr.type, biX_GREN, biX_grenMap(GREN[gr.type].col), X - 2, Y - z - 2);
      if (gr.t >= 1 && (t * 12 | 0) % 2) px(X, Y - z - 3, P.YE);
    }
    g.save(); g.beginPath(); g.rect(X0 - 4, Y0 - 4, r.w * S + 8, r.h * S + 8); g.clip();
    for (const e of fx) {
      const X = Math.round(v.sx(e.x)), Y = Math.round(v.sy(e.y));
      if (e.k === 'boom') {
        const age = 0.5 - e.t, fi = Math.max(0, Math.min(7, Math.floor(age / 0.5 * 8))), rad = Math.max(8, Math.round(26 / TS * S * 0.8));
        const spr = biX_boom(e.type === 'frag' ? 'frag' : 'stun', fi, rad); g.drawImage(spr, X - rad, Y - rad);
        if (e.type === 'frag') for (let i = 0; i < 14; i++) { const a = i * 2.4 + biX_hash(i, X, 15) * 0.8, sp = (0.5 + biX_hash(i, Y, 14) * 0.9) * rad * 1.5, d = sp * Math.min(1, age * 3.2), lift = Math.sin(Math.min(1, age * 2.4) * Math.PI) * 4; px(X + Math.cos(a) * d, Y + Math.sin(a) * d - lift, [P.G3, P.BR, P.K, P.YE, P.W][i % 5]); if (i % 3 === 0) px(X + Math.cos(a) * d + 1, Y + Math.sin(a) * d - lift, P.K); }
      } else if (e.k === 'hit') { px(X, Y, P.RD2); px(X + 1, Y - 1, P.RD); px(X - 1, Y + 1, P.RD); px(X + 1, Y + 1, P.RD2); px(X - 1, Y - 1, P.RD); }
      else { px(X, Y, P.W); if (e.t > 0.05) { px(X - 1, Y - 1, P.YE); px(X + 1, Y - 1, P.YE); px(X, Y - 2, P.YE); } }
    }
    g.restore();
    if (max.busy) { const X = Math.round(v.sx(max.x)), Y = Math.round(v.sy(max.y)); rect(X - 9, Y - 13, 18, 4, P.K); rect(X - 8, Y - 12, 16, 2, P.G1); const n = Math.round(16 * Math.min(1, max.busy.t / max.busy.need)); rect(X - 8, Y - 12, n, 2, P.GR); rect(X - 8, Y - 12, n, 1, P.GR2); }
    const tgt = people.find(p => p.kind === 'guard' && !p.out && roomOf(p.x, p.y) === r.id && Math.abs(Math.atan2(Math.sin(Math.atan2(p.y - max.y, p.x - max.x) - max.dir), Math.cos(Math.atan2(p.y - max.y, p.x - max.x) - max.dir))) < 0.3 && los(max.x, max.y, p.x, p.y));
    // Max portrait, x0..24 y0..39
    rect(0, 0, 25, 40, P.G3); g.drawImage(sideBackdrop(), 1, 1); drawMaxSide(3, 10, tgt);
    if (max.stun > 0 || max.gassed > 0.4) { const k = Math.min(1, Math.max(max.stun / 6, max.gassed / 2.5)), y0 = 1 + Math.round(38 * (1 - k)), c = max.gassed > 0.4 ? P.GR : P.G1; for (let y = y0; y < 39; y++) for (let x = 1; x < 24; x++) if (biX_bay(x, y) < 9) px(x, y, c); }
    // information bar, x26..170 y0..18
    rect(26, 0, 145, 19, P.G3); rect(26, 0, 145, 1, P.W); rect(26, 0, 1, 19, P.W); rect(27, 1, 142, 17, P.BL); rect(169, 1, 1, 17, P.K); rect(27, 18, 143, 1, P.G1);
    text(fitText(ROOM_NAMES[r.kind], 78), 30, 2, P.W);
    const hh = Math.floor(clock / 3600) % 24, mm = Math.floor(clock / 60) % 60, ss = Math.floor(clock) % 60;
    if (max.disguised || max.gassed > 0.4) text(max.gassed > 0.4 ? 'GAS' : 'Disguise', 102, 2, P.RD2);
    textR([hh, mm, ss].map(v2 => String(v2).padStart(2, '0')).join(':'), 167, 2, P.W);
    textC(fitText(msg, 138), 98, 10, P.W);
    if (msgLong()) { const ls = wrap(msg, 146); msgBox(12, 20, 150, ls.length * 8 + 6); ls.forEach((l, i) => text(l, 16, 23 + i * 8, P.W)); }
    if (alarm && mode === 'breakin' && (t * 4 | 0) % 2) { frame(X0 - 5, Y0 - 5, r.w * S + 10, r.h * S + 10, P.RD2); frame(X0 - 6, Y0 - 6, r.w * S + 12, r.h * S + 12, P.RD); }
    if (comp) drawComputer();
    if (over) drawOver();
    if (pauseMenu) { msgBox(30, 40, 136, 18 + pauseMenu.items.length * 8); text(pauseTitle, 36, 43, P.W); pauseMenu.draw(); }
    postFlash();
  };
  let lastMsg = '', msgT0 = 0;
  function msgLong() { if (msg !== lastMsg) { lastMsg = msg; msgT0 = t; } return textW(msg) > 138 && t - msgT0 < 4; }
  function postFlash() { // being hit turns every light gray pixel light red for a moment
    if (hitFlash <= 0) return; hitFlash--;
    const d = g.getImageData(0, 0, cv.width, cv.height), a = d.data; for (let i = 0; i < a.length; i += 4) if (a[i] === 0xAA && a[i + 1] === 0xAA && a[i + 2] === 0xAA) { a[i] = 0xFF; a[i + 1] = 0x55; a[i + 2] = 0x55; } g.putImageData(d, 0, 0);
  }
  // ---------- Max, side view (top-left box) ----------
  const sideBackdrop = () => sprite('biX_sidebg', 23, 38, () => {
    for (let y = 0; y < 31; y++) for (let x = 0; x < 23; x++) px(x, y, biX_bay(x, y) < y / 2 ? P.BL : P.BL2);
    rect(0, 31, 23, 1, P.W); rect(0, 32, 23, 1, P.G3);
    for (let y = 33; y < 38; y++) for (let x = 0; x < 23; x++) px(x, y, (x + y * 2) % 7 === 0 ? P.G1 : biX_bay(x, y) < 4 ? P.G1 : P.G3);
  });
  function drawMaxSide(x, y, tgt) {
    const mv = input.axis(); const moving = (mv.x || mv.y) && !max.busy && max.stun <= 0 && !comp; const fr = moving ? 1 + ((t * 6 | 0) % 2) : 0;
    const map = biX_maxMap(max.disguised, uniC), key = max.disguised ? 'd' + uniC : 'n';
    const top = max.crouch ? 5 : 0;
    biX_put('mxT' + key, biX_MAX_TOP, map, x, y + top);
    if (max.crouch) biX_put('mxC' + key, biX_MAX_CROUCH, map, x, y + top + 19);
    else biX_put('mxL' + fr + key, biX_MAX_LEGS[fr], map, x, y + 19);
    if (max.gun === 'uzi') { rect(x + 16, y + top + 15, 2, 3, P.K); px(x + 16, y + top + 15, P.G1); rect(x + 12, y + top + 11, 3, 1, P.K); }
    if (max.fl !== undefined && t - max.fl < 0.07) { px(x + 21, y + top + 13, P.W); px(x + 22, y + top + 13, P.YE); px(x + 21, y + top + 12, P.YE); px(x + 21, y + top + 14, P.YE); }
    if (kit.gasmask && clouds.length) { rect(x + 9, y + top + 6, 5, 3, P.G3); px(x + 11, y + top + 6, P.CY); rect(x + 10, y + top + 9, 3, 2, P.G1); }
    if (tgt) {
      const q = Math.min(1, (0.3 + sk * 0.2) * (max.gun === 'uzi' ? 1.4 : 1)); const col = q > 0.8 ? P.W : q > 0.5 ? P.G3 : q > 0.3 ? P.G1 : P.K;
      const cx = 19, cy = 5; for (const [dx, dy] of [[-3, -1], [-3, 0], [-3, 1], [3, -1], [3, 0], [3, 1], [-1, -3], [0, -3], [1, -3], [-1, 3], [0, 3], [1, 3]]) px(cx + dx, cy + dy, col);
      px(cx, cy, (t * 4 | 0) % 2 ? P.RD2 : col); px(cx - 2, cy - 2, col); px(cx + 2, cy - 2, col); px(cx - 2, cy + 2, col); px(cx + 2, cy + 2, col);
    }
  }
  // ---------- Equipment Display: the kit on Max's silhouette ----------
  const drawEquip = () => biX_equip(kit, max, t);
  function drawBuildingWindow(x, y, w, h) {
    frame(x, y, w, h, P.G3); rect(x + 1, y + 1, w - 2, h - 2, P.K);
    const sc = Math.min((w - 6) / B.bw, (h - 6) / B.bh), ox = x + 3 - B.bx * sc + ((w - 6) - B.bw * sc) / 2, oy = y + 3 - B.by * sc;
    if (opts.plan) rect(ox + B.bx * sc, oy + B.by * sc, B.bw * sc, B.bh * sc, P.YE);
    for (const r of B.rooms) if (r.seen) { rect(ox + r.x * sc, oy + r.y * sc, r.w * sc, r.h * sc, P.TL); frame(ox + r.x * sc - 1, oy + r.y * sc - 1, r.w * sc + 2, r.h * sc + 2, P.CY); for (const f of F) if (f.room === r.id) rect(ox + f.x * sc, oy + f.y * sc, Math.max(1, f.w * sc - 1), Math.max(1, f.h * sc - 1), { desk: P.BR, file: P.G1, chair: P.BL, couch: P.RD, computer: P.W, terminal: P.W, floorsafe: P.RD2 }[f.type] || P.G1); }
    for (const d of B.outer) rect(ox + d.x * sc - 1, oy + d.y * sc - 1, 2, 2, P.G1);
    for (const p of people) { if (p.out || p.kind !== 'guard') continue; const near = kit.detector && dist(p.x, p.y, max.x, max.y) < 110; const rr = B.rooms[roomOf(p.x, p.y)]; if (near || (rr && rr.bugged)) rect(ox + p.x / TS * sc, oy + p.y / TS * sc, 2, 1, P.YE); }
    if (entryDoor && (t * 3 | 0) % 2) rect(ox + max.x / TS * sc - 1, oy + max.y / TS * sc - 1, 2, 2, P.K);
  }
  const doorMenu = B.outer.length && Menu(B.outer.map((d, i) => ({ label: 'Door #' + (i + 1), go: () => enterAt(d) })), 46, 70, 80);
  function drawDoorMenu() { msgBox(28, 58, 110, 16 + B.outer.length * 8); text('Which door?', 34, 61, P.W); doorMenu.draw(); const sc = Math.min(116 / B.bw, 92 / B.bh), ox = 182 - B.bx * sc + (116 - B.bw * sc) / 2, oy = 102 - B.by * sc; B.outer.forEach((d, i) => text(String(i + 1), ox + d.x * sc - 2, oy + d.y * sc - 4, P.YE, P.K)); }
  function drawComputer() {
    const x0 = VX0, y0 = VY0 - 20, w = VX1 - VX0, h = VY1 - VY0 + 26;
    rect(x0, y0, w, h, P.K); frame(x0, y0, w, h, P.G3); frame(x0 + 1, y0 + 1, w - 2, h - 2, P.G1); rect(x0 + 1, y0 + 1, w - 2, 1, P.W);
    px(x0 + 3, y0 + 3, P.G1); px(x0 + 4, y0 + 3, P.G1); px(x0 + 3, y0 + 4, P.G1);
    let y = VY0 - 16; for (const l of comp.lines) { y = para(l, VX0 + 4, y, VX1 - VX0 - 8, P.GR2, 8) + 1; if (y > VY0 + 70) break; }
    const prompt = comp.stage === 'pw' ? 'PASSWORD: ' : 'SEARCH: ';
    if (comp.stage !== 'result') text(prompt + comp.input + ((t * 3 | 0) % 2 ? '_' : ''), VX0 + 4, VY0 + 76, P.YE);
    else text(comp.last ? 'Enter: log off' : 'Type again, or Esc: log off', VX0 + 4, VY0 + 76, P.G3);
    if ((t * 2 | 0) % 2) px(x0 + w - 6, y0 + h - 5, P.GR2); rect(x0 + w - 12, y0 + h - 5, 4, 1, P.G1);
    // the keyboard
    rect(8, 145, 157, 40, P.K); rect(9, 146, 155, 38, P.G1); rect(9, 146, 155, 1, P.G3);
    const K = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < 29; i++) {
      const x = 10 + (i % 13) * 12, yy = 148 + Math.floor(i / 13) * 12, sp = i >= 26, ok = i === 28, kw = ok ? 34 : 10;
      rect(x, yy, kw + 1, 11, P.K); bevel(x, yy, kw, 10, ok ? P.GR : sp ? P.G1 : P.G3, ok ? P.GR2 : sp ? P.G3 : P.W, ok ? P.K : sp ? P.K : P.G1);
      textC(i < 26 ? K[i] : ['_', '<', 'ENTER'][i - 26], x + (kw >> 1), yy + 2, sp && !ok ? P.W : P.K);
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
      g.drawImage(biX_armoryBg(slots), 0, 0);
      slots.forEach((s, i) => {
        const on = i === sel, y0 = s.y + 8;
        if (on) { for (let y = y0 + 1; y < y0 + s.h; y++) for (let x = s.x + 1; x < s.x + s.w - 1; x++) if (biX_bay(x, y) < 3) px(x, y, P.BL2); }
        if (!taken[s.k]) armoryItem(s.k, s.x + s.w / 2, y0 + s.h);
        else { const cx = Math.round(s.x + s.w / 2), cy = Math.round(y0 + s.h / 2) - 3; const tw = textW('TAKEN') + 6; rect(cx - (tw >> 1), cy, tw, 10, P.K); frame(cx - (tw >> 1), cy, tw, 10, P.G1); textC('TAKEN', cx, cy + 1, P.G3); }
        if (on) { const c = (t * 4 | 0) % 2 ? P.YE : P.W; frame(s.x - 1, y0 - 1, s.w + 2, s.h + 2, c); frame(s.x, y0, s.w, s.h, P.K); }
        const lc = on ? P.YE : P.W, lx = s.x + s.w / 2;
        if (s.k === 'gasmask') { textC('GAS', lx, 4, lc, P.K); textC('MASK', lx, 12, lc, P.K); }
        else if (s.label) textC(s.k === 'safekit' ? 'SAFECRACKING' : s.label, lx, s.y, lc, P.K);
        if (s.k === 'detector') textC('SENSOR', lx, s.y + 8, lc, P.K);
      });
      // right: Max's silhouette carrying what has been picked so far
      const k = kit(), m = { gun: taken.uzi ? 'uzi' : 'pistol', hits: 0, gren: { frag: k.frag, stun: k.stun, gas: k.gas }, gtype: k.stun ? 'stun' : k.gas ? 'gas' : k.frag ? 'frag' : 'stun', bugs: k.bugs, clip: 6, clips: 3, film: 36 };
      rect(160, 0, 160, 172, P.BL);
      g.save(); g.translate(-9, 40); biX_equip(k, m, t); g.restore();
      rect(162, 2, 156, 34, P.K); frame(162, 2, 156, 34, P.G1); rect(163, 3, 154, 1, P.G3);
      textC('EQUIPMENT ROOM', 240, 7, P.YE, P.K); textC('Choose up to five items', 240, 17, P.G3); textC('for the break-in.', 240, 25, P.G3);
      for (let n = 0; n < 5; n++) { const x = 170 + n * 9, on = n < used(); rect(x, 158, 7, 7, P.K); rect(x + 1, 159, 5, 5, on ? P.YE : P.G1); if (on) px(x + 1, 159, P.W); }
      text(used() + ' of 5', 218, 158, P.W);
      rect(0, 172, W, 28, P.K); rect(0, 172, W, 1, P.G1);
      text('Items taken: ' + used() + ' of 5.  The silenced pistol is free.', 4, 176, P.W);
      text('Enter takes or returns.  Esc when ready.', 4, 187, P.G3);
      bevel(250, 182, 64, 14, P.BL, P.BL2, P.K); frame(249, 181, 66, 16, P.K); textC('Go in', 282, 185, P.YE);
    },
  };
}
// the equipment room: pegboard wall, felt-lined cubbies, steel shelves and uprights
function biX_armoryBg(slots) {
  return sprite('biX_armory', 320, 172, () => {
    for (let y = 0; y < 172; y++) for (let x = 0; x < 160; x++) px(x, y, (x % 4 === 2 && y % 4 === 2) ? P.K : biX_bay(x, y) < (y > 120 ? 4 : 2) ? P.RD : P.BR);
    for (const s of slots) {
      const y0 = s.y + 8;
      rect(s.x, y0, s.w, s.h, P.BL); for (let y = y0; y < y0 + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) if (biX_bay(x, y) < 2) px(x, y, P.K);
      rect(s.x, y0, s.w, 1, P.K); rect(s.x, y0, 1, s.h, P.K); rect(s.x + 1, y0 + 1, s.w - 1, 1, P.NV); rect(s.x + s.w - 1, y0, 1, s.h, P.BL2);
      // steel shelf and its shadow on the pegboard
      rect(s.x - 1, y0 + s.h, s.w + 2, 3, P.G3); rect(s.x - 1, y0 + s.h, s.w + 2, 1, P.W); rect(s.x - 1, y0 + s.h + 2, s.w + 2, 1, P.G1); rect(s.x - 1, y0 + s.h + 3, s.w + 2, 1, P.K);
      for (let x = s.x; x < s.x + s.w; x++) if (x % 2) px(x, y0 + s.h + 4, P.K);
      for (const bx of [s.x + 3, s.x + s.w - 5]) { rect(bx, y0 + s.h + 3, 2, 3, P.G1); px(bx, y0 + s.h + 3, P.G3); }
    }
    for (const ux of [74, 158]) { rect(ux, 0, 3, 172, P.G3); rect(ux, 0, 1, 172, P.W); rect(ux + 2, 0, 1, 172, P.G1); for (let y = 3; y < 172; y += 6) px(ux + 1, y, P.K); }
    rect(0, 0, 1, 172, P.K);
  });
}
const biX_BIGGREN = {
  frag: ['..kkk..', '.kGGGk.', '..kGkWk', '.kwcck.', 'kwcdcdk', 'kcdcdck', 'kdcdcdk', 'kcdcddk', '.kdddk.', '..kkk..'],
  stun: ['..kkk..', '.kGGGk.', '..kGkWk', '.kkkkk.', '.kwcck.', '.kwcdk.', '.kyyyk.', '.kwcdk.', '.kccdk.', '.kkkkk.'],
  gas: ['..kkk..', '.kGGGk.', '.kkGkk.', 'kwwccdk', 'kwcccdk', 'kkkkkkk', 'kwcccdk', 'kwcccdk', 'kcccddk', '.kkkkk.'],
};
function armoryItem(k, cx, base) {
  cx = Math.round(cx); base = Math.round(base);
  switch (k) {
    case 'uzi': g.drawImage(biX_gunSide(true), cx - 30, base - 21); for (const hx of [cx - 14, cx + 12]) { rect(hx, base - 26, 1, 4, P.G3); px(hx, base - 26, P.W); } break;
    case 'camera': g.drawImage(biX_camera(), cx - 13, base - 14); for (let a = 0; a <= 12; a++) { const an = Math.PI + a / 12 * Math.PI; px(cx - 2 + Math.round(Math.cos(an) * 12), base - 12 + Math.round(Math.sin(an) * 5), P.K); } rect(cx + 13, base - 8, 7, 8, P.K); rect(cx + 14, base - 7, 5, 7, P.YE); rect(cx + 14, base - 5, 5, 2, P.K); px(cx + 16, base - 8, P.G3); break;
    case 'bugs': for (let n = 0; n < 6; n++) { const bx = cx - 30 + n * 10; biX_put('bug', biX_BUG, biX_BUGMAP, bx, base - 6); px(bx + 3, base - 8, P.G3); px(bx + 3, base - 9, n % 2 ? P.RD2 : P.G3); } break;
    case 'frag': case 'stun': case 'gas': { const r = biX_ramp(GREN[k].col); for (let n = 0; n < 7; n++) biX_put('bg_' + k, biX_BIGGREN[k], { k: P.K, G: P.G3, W: P.W, w: r[2], c: r[1], d: r[0] === P.K ? P.G1 : r[0], y: P.YE }, cx - 31 + n * 9, base - 10); break; }
    case 'gasmask': for (const sx of [-1, 1]) { line(cx + sx * 10, base - 12, cx + sx * 6, base - 24, P.K); line(cx + sx * 11, base - 12, cx + sx * 7, base - 24, P.G1); } biX_mask(cx - 11, base - 19); rect(cx - 2, base - 2, 5, 2, P.G1); break;
    case 'detector': {
      for (let a = 0; a <= 20; a++) { const an = Math.PI + a / 20 * Math.PI, xx = cx + Math.round(Math.cos(an) * 10), yy = base - 10 + Math.round(Math.sin(an) * 9); px(xx, yy, P.G3); px(xx, yy - 1, P.W); px(xx, yy + 1, P.K); }
      for (const ex of [cx - 13, cx + 9]) { biX_box(ex, base - 12, 5, 10, P.G1, P.G3, P.K); rect(ex + 2, base - 24, 1, 12, P.G3); px(ex + 2, base - 25, P.YE); px(ex + 2, base - 24, P.RD2); }
      biX_box(cx - 5, base - 9, 11, 9, P.G1, P.G3, P.K); rect(cx - 3, base - 7, 7, 3, P.GR); px(cx - 2, base - 6, P.GR2); px(cx + 1, base - 5, P.GR2); px(cx + 3, base - 3, P.RD2);
      break;
    }
    case 'kevlar': g.drawImage(biX_vest(40, 50), cx - 21, base - 51); rect(cx - 1, base - 55, 2, 5, P.G3); px(cx - 1, base - 55, P.W); rect(cx - 9, base - 52, 18, 1, P.G3); break;
    case 'safekit': biX_box(cx - 24, base - 35, 48, 11, P.G1, P.G3, P.K); rect(cx - 21, base - 32, 42, 6, P.K); rect(cx - 21, base - 32, 42, 1, P.RD); px(cx - 20, base - 27, P.G3); px(cx + 19, base - 27, P.G3); g.drawImage(biX_safekit(), cx - 23, base - 25); break;
  }
}
