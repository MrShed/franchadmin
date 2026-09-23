// ===================================================================
// BREAK-IN: the Break-In Display from the manual (p.55)
//   left:  Max side view, Information Bar, Room Window (one room at a time)
//   right: Equipment Display (silhouette) and Building Window (plan)
// ===================================================================
const TS = 8;
const T_OUT = 0, T_FLOOR = 1, T_WALL = 2, T_DOOR = 3;
const ROOM_NAMES = { office: 'Office', file: 'File Room', computer: 'Computer Room', lounge: 'Lounge', bath: 'Bathroom', cipher: 'Cipher Room', hall: 'Hallway', exec: 'Office' };
const FURN = {
  desk: { w: 2, h: 1, name: 'Desk', open: 1.2 }, chair: { w: 1, h: 1, name: 'Chair' }, file: { w: 1, h: 1, name: 'File cabinet', open: 1.5, hide: true },
  wallsafe: { w: 1, h: 1, name: 'Wall safe', open: 4, kit: true }, floorsafe: { w: 1, h: 1, name: 'Floor safe', open: 5, kit: true, flat: true },
  plant: { w: 1, h: 1, name: 'Plant', bug: true }, typewriter: { w: 1, h: 1, name: 'Typewriter', bug: true }, couch: { w: 2, h: 1, name: 'Couch', bug: true },
  picture: { w: 1, h: 1, name: 'Picture', bug: true, flat: true }, computer: { w: 2, h: 1, name: 'Mainframe computer', bug: true, hide: true },
  terminal: { w: 1, h: 1, name: 'Computer terminal' }, table: { w: 2, h: 2, name: 'Table' }, toilet: { w: 1, h: 1, name: 'Toilet' }, sink: { w: 1, h: 1, name: 'Sink' },
  evidence: { w: 1, h: 1, name: 'Crate', flat: true },
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

// ------------------------------------------------------------------
function breakinScene(opts, done) {
  const level = opts.level || 0, occupant = opts.occupant || null, org = opts.org || ORGS[0];
  const kit = opts.kit || { uzi: false, camera: true, bugs: 0, gasmask: false, detector: false, kevlar: false, safekit: false, frag: 0, stun: 4, gas: 0 };
  const sk = skillLevel('combat');
  // persistent layout: the same seed builds the same building
  const saved = seed; if (opts.building && opts.building.seed) seed = opts.building.seed;
  const B = genBuilding(level); const { F, occ } = furnish(B, { occupant, level });
  seed = saved;
  const PWORDS = ['CONDOR', 'SPHINX', 'ORCHID', 'JACKAL', 'VORTEX', 'ZENITH', 'COBALT', 'PHOENIX', 'MIDNIGHT', 'TANGO', 'OMEGA', 'SCIMITAR', 'GRANITE', 'MONSOON', 'LANTERN'];
  const bld = opts.building || {};
  if (!bld.pw) { bld.pw = PWORDS[(bld.seed || ri(0, 999)) % PWORDS.length]; bld.pwKnown = bld.pw.split('').map(() => false); }
  const terminals = F.filter(f => f.type === 'terminal'); terminals.forEach((f, i) => f.letter = i % bld.pw.length);
  let comp = null; // the mainframe session overlay
  const people = [], bullets = [], grenades = [], clouds = [], fx = [];
  const out = { clues: [], messages: 0, plan: false, personnel: false, evidence: null, alarm: false, bugged: false };
  let msg = 'Select the door to enter by.', t = 0, clock = hourOf(game.t || 0) * 3600 + ri(0, 3599), alarm = false, alarmT = 0, over = null, entryDoor = null, pauseMenu = null;
  const say = m => { msg = m; };
  const max = { kind: 'max', x: 0, y: 0, dir: 0, walk: 0, hits: 0, maxHits: kit.kevlar ? 4 : 2, gun: kit.uzi ? 'uzi' : 'pistol', clip: 6, clips: 3, cool: 0, gren: { frag: kit.frag, stun: kit.stun, gas: kit.gas }, gtype: 'stun', film: kit.camera ? 36 : 0, bugs: kit.bugs,
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
  function addGuard(room, st = 'patrol') { const [x, y] = spot(room); const g2 = { kind: 'guard', x, y, dir: rnd() * 7, walk: 0, state: st, out: false, stun: 0, cool: 1 + rnd(), home: room.id, path: null, pathT: 0, seeT: 0, gasmask: rnd() < 0.15 * level, gren: rnd() < 0.3 ? 1 : 0, col: P.YE }; people.push(g2); return g2; }
  const important = B.rooms.filter(r => ['file', 'computer', 'cipher', 'exec'].includes(r.kind));
  const nGuards = Math.min(12, 3 + level * 2 + (opts.alert || 0) * 2 + Math.floor(B.rooms.length / 6));
  for (let i = 0; i < nGuards; i++) addGuard(rnd() < 0.5 && important.length ? pick(important) : pick(B.rooms), rnd() < 0.7 ? 'patrol' : 'idle');
  let target = null;
  if (occupant) { const seat = F.find(f => f.seat); const [x, y] = seat ? [seat.x * TS + 4, seat.y * TS + 4] : spot(B.exec); target = { kind: 'suspect', x, y, dir: -Math.PI / 2, walk: 0, state: 'seated', out: false, stun: 0, col: pick([P.W, P.MG, P.BL2]), path: null, pathT: 0, seeT: 0 }; people.push(target); }

  // ---------- entry ----------
  function enterAt(d) { entryDoor = d; d.open = true; const dx = d.side === 'W' ? 1 : d.side === 'E' ? -1 : 0, dy = d.side === 'N' ? 1 : d.side === 'S' ? -1 : 0; max.x = (d.x + dx) * TS + 4; max.y = (d.y + dy) * TS + 4; max.dir = Math.atan2(dy, dx); B.rooms[d.a].seen = true; say('Inside. Close the door behind you (E): guards notice open doors.'); sfx.select(); }
  if (B.outer.length === 1) enterAt(B.outer[0]);

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
    max.clip--; max.cool = max.gun === 'uzi' ? 0.25 : 0.55;
    const n = max.gun === 'uzi' ? 3 : 1; for (let i = 0; i < n; i++) { const a = max.dir + (rnd() - 0.5) * (0.18 - sk * 0.03) + (i - 1) * 0.04; bullets.push({ x: max.x, y: max.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, mine: true, life: 0.7 }); }
    sfx.tone(180, 0.05, 'square', 0.04, -80); noise(max.x, max.y, 40);
    if (max.disguised) { max.disguised = false; say('Your disguise is blown.'); }
  }
  function knockOut(p) { if (p.out) return; p.out = true; p.stun = 0; if (p === target) say((occupant.known.name ? occupant.name : 'The suspect') + ' is out cold. Walk over him to grab him.'); }
  function stunP(p, s) { if (!p.out) p.stun = Math.max(p.stun, s); }
  function hurtMax() { if (over) return; max.hits++; hitFlash = 3; sfx.tone(120, 0.2, 'sawtooth', 0.08, -60); say('You are hit!'); if (max.hits >= max.maxHits) finish('captured'); }
  function explode(gr) {
    if (gr.type === 'gas') { clouds.push({ x: gr.x, y: gr.y, r: 3, t: 12, room: roomOf(gr.x, gr.y) }); sfx.hiss(); return; }
    fx.push({ k: 'boom', x: gr.x, y: gr.y, t: 0.5, type: gr.type }); sfx.boom(); if (gr.type === 'frag') { noise(gr.x, gr.y, 300); raiseAlarm('The explosion was heard.'); }
    for (const p of people) { const d = dist(p.x, p.y, gr.x, gr.y); if (d < 26 && los(gr.x, gr.y, p.x, p.y)) { if (gr.type === 'frag') knockOut(p); else stunP(p, 25 + rnd() * 20); } }
    const d = dist(max.x, max.y, gr.x, gr.y); if (d < 26 && los(gr.x, gr.y, max.x, max.y) && !(max.crouch && coverNear())) { if (gr.type === 'frag') hurtMax(); else max.stun = 6; }
  }
  function throwG(range) {
    if (max.gren[max.gtype] <= 0) { say('No ' + GREN[max.gtype].name.toLowerCase() + ' grenades.'); sfx.deny(); return; }
    max.gren[max.gtype]--; const d = [24, 48, 72][range];
    grenades.push({ x: max.x, y: max.y, sx: max.x, sy: max.y, tx: max.x + Math.cos(max.dir) * d, ty: max.y + Math.sin(max.dir) * d, t: 0, z: 0, type: max.gtype }); sfx.tone(500, 0.1, 'triangle', 0.05, -200);
  }

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
  function finish(kind) { if (over) return; over = { kind, t: 0 }; kind === 'escaped' ? sfx.success() : sfx.fail(); }

  // ---------- AI ----------
  function ai(p, dt) {
    if (p.out || p === max.prisoner) return;
    if (p.stun > 0) { p.stun -= dt; if (p.stun <= 0 && p.kind === 'guard') { p.state = alarm ? 'hunt' : 'investigate'; p.target = [max.x, max.y]; } return; }
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
      case 'attack':
        p.alertT += dt; if (p.alertT > 2 && !alarm) raiseAlarm('A guard sounds the alarm.');
        if (sees) {
          p.dir = Math.atan2(max.y - p.y, max.x - p.x); p.cool -= dt;
          if (dist(p.x, p.y, max.x, max.y) > 36) { moveEnt(p, Math.cos(p.dir) * sp, Math.sin(p.dir) * sp, dt); p.walk += dt; }
          if (p.cool <= 0) { p.cool = 1.4 - level * 0.15 + rnd() * 0.8; if (p.gren && rnd() < 0.2 && dist(p.x, p.y, max.x, max.y) > 30) { p.gren--; grenades.push({ x: p.x, y: p.y, sx: p.x, sy: p.y, tx: max.x, ty: max.y, t: 0, z: 0, type: 'stun' }); } else { const a = p.dir + (rnd() - 0.5) * (0.3 - level * 0.04 + (max.crouch ? 0.15 : 0)); bullets.push({ x: p.x, y: p.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, mine: false, life: 0.8 }); sfx.tone(160, 0.05, 'square', 0.04, -60); } }
        } else if (p.last) { if (walkTo(p.last[0], p.last[1], sp)) { p.state = alarm ? 'hunt' : 'investigate'; p.target = [max.x, max.y]; } }
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
      if (!inside(max.x, max.y)) finish('escaped');
      for (const gr of grenades) { gr.t += dt / 0.6; const k = Math.min(1, gr.t); const nx = gr.sx + (gr.tx - gr.sx) * k, ny = gr.sy + (gr.ty - gr.sy) * k; if (opaque(Math.floor(nx / TS), Math.floor(ny / TS))) gr.t = Math.max(gr.t, 1); else { gr.x = nx; gr.y = ny; } gr.z = Math.sin(k * Math.PI) * 10; if (gr.t >= 1.4) { gr.done = true; explode(gr); } }
      for (let i = grenades.length - 1; i >= 0; i--) if (grenades[i].done) grenades.splice(i, 1);
      for (const c of clouds) { c.t -= dt; c.r = Math.min(30, c.r + dt * 12); for (const p of people) if (dist(p.x, p.y, c.x, c.y) < c.r && !p.gasmask) stunP(p, 20); if (dist(max.x, max.y, c.x, c.y) < c.r && !kit.gasmask) { max.gassed += dt * 2; if (max.gassed > 2.5) { max.stun = 5; max.gassed = 0; say('You breathed the gas!'); } } }
      for (let i = clouds.length - 1; i >= 0; i--) if (clouds[i].t <= 0) clouds.splice(i, 1);
      for (const b of bullets) {
        for (let s = 0; s < 4 && !b.dead; s++) {
          b.x += b.vx * dt / 4; b.y += b.vy * dt / 4;
          if (solid(Math.floor(b.x / TS), Math.floor(b.y / TS), true)) { b.dead = true; fx.push({ k: 'spark', x: b.x, y: b.y, t: 0.1 }); break; }
          if (b.mine) { for (const p of people) { if (p.out || p === max.prisoner) continue; if (dist(p.x, p.y, b.x, b.y) < 3.5) { b.dead = true; knockOut(p); fx.push({ k: 'hit', x: b.x, y: b.y, t: 0.15 }); break; } } }
          else if (dist(max.x, max.y, b.x, b.y) < 3.5) { b.dead = true; if (!(max.crouch && coverNear() && rnd() < 0.5)) hurtMax(); }
        }
        b.life -= dt; if (b.life <= 0) b.dead = true;
      }
      for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].dead) bullets.splice(i, 1);
      for (const f of fx) f.t -= dt; for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t <= 0) fx.splice(i, 1);
      for (const p of people) ai(p, dt);
      if (alarm) { alarmT += dt; if ((alarmT % 3) < dt) sfx.tone(1000, 0.3, 'square', 0.04); if (alarmT > 50 && !people.some(p => p.kind === 'guard' && !p.out && p.state === 'attack')) { alarm = false; say('The alarm has been switched off.'); for (const p of people) if (p.state === 'hunt') p.state = 'patrol'; } }
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
  function drawRoom(v) {
    const { r, S, ox, oy } = v; const X0 = ox + r.x * S, Y0 = oy + r.y * S, w = r.w * S, h = r.h * S;
    // light cyan outline, 3-px light gray wall with mitred dark corners
    rect(X0 - 4, Y0 - 4, w + 8, h + 8, P.CY); rect(X0 - 3, Y0 - 3, w + 6, h + 6, P.G3);
    for (const [cx, cy, dx, dy] of [[X0 - 3, Y0 - 3, 1, 1], [X0 + w + 2, Y0 - 3, -1, 1], [X0 - 3, Y0 + h + 2, 1, -1], [X0 + w + 2, Y0 + h + 2, -1, -1]]) for (let k = 0; k < 3; k++) px(cx + dx * k, cy + dy * k, P.G1);
    // checkerboard floor
    for (let yy = 0; yy < h; yy++) { g.fillStyle = P.G1; g.fillRect(X0, Y0 + yy, w, 1); g.fillStyle = P.BL2; for (let xx = (yy & 1); xx < w; xx += 2) g.fillRect(X0 + xx, Y0 + yy, 1, 1); }
    for (const d of r.doors) {
      const horizWall = d.o === 'h'; let dx, dy, dw, dh;
      if (horizWall) { dx = ox + d.x * S - S / 2; dw = S * 2; dy = d.y < r.y ? Y0 - 3 : Y0 + h; dh = 3; } else { dy = oy + d.y * S - S / 2; dh = S * 2; dx = d.x < r.x ? X0 - 3 : X0 + w; dw = 3; }
      rect(dx, dy - (horizWall ? 1 : 0), dw, dh + (horizWall ? 2 : 0), d.open ? P.BL : d.outside ? P.GR2 : P.G1);
      if (d.open) dither(dx, dy, dw, dh, P.BL, P.BL2, 8); else px(dx + dw / 2, dy + dh / 2, P.W);
    }
  }
  function drawFurn(f, v) {
    const S = v.S, X = v.ox + f.x * S, Y = v.oy + f.y * S, w = f.w * S, h = f.h * S, q = Math.max(1, S / 8);
    const box = (x, y, ww, hh, c) => { rect(x, y, ww, hh, P.K); rect(x + 1, y + 1, ww - 2, hh - 2, c); rect(x + 1, y + 1, ww - 2, 1, P.W); };
    switch (f.type) {
      case 'desk': box(X, Y + 1, w, h - 2, P.BR); rect(X + 3 * q, Y + 3 * q, 5 * q, 3 * q, f.opened ? P.W : P.G3); rect(X + w - 6 * q, Y + 2 * q, 2 * q, 2 * q, P.RD2); rect(X + w / 2, Y + 3 * q, 3 * q, 2 * q, P.W); break;
      case 'chair': box(X + 1, Y + 1, w - 2, h - 2, P.BL2); rect(X + 2, Y + h - 3, w - 4, 1, P.BL); break;
      case 'file': box(X, Y, w, h, P.G3); rect(X + w / 2 - 1, Y + h / 2 - 1, 2, 1, P.TL); if (f.opened) rect(X + 2, Y + h - 3, w - 4, 2, P.W); break;
      case 'wallsafe': box(X + 1, Y + 1, w - 2, h - 2, f.opened ? P.K : P.G1); px(X + w / 2, Y + h / 2, P.W); break;
      case 'floorsafe': rect(X + 1, Y + 1, w - 2, h - 2, f.opened ? P.RD : P.RD2); line(X + 3, Y + 3, X + w - 4, Y + h - 4, P.YE); line(X + w - 4, Y + 3, X + 3, Y + h - 4, P.YE); break;
      case 'plant': { const cx = X + w / 2, cy = Y + h / 2; for (let k = 0; k < 8; k++) { const a = k * 0.8; line(cx, cy, cx + Math.cos(a) * w / 2, cy + Math.sin(a) * h / 2, k % 2 ? P.GR : P.GR2); } px(cx - 2, cy - 1, P.W); px(cx + 2, cy + 2, P.BL2); break; }
      case 'typewriter': box(X + 1, Y + 1, w - 2, h - 2, P.K); rect(X + 2, Y + 2, w - 4, 2, P.W); rect(X + 3, Y + h / 2, w - 6, 1, P.CY); break;
      case 'couch': box(X, Y + 1, w, h - 2, P.RD); rect(X + 2, Y + 3, w - 4, h - 6, P.RD2); break;
      case 'picture': rect(X + 1, Y, w - 2, 3, P.BR); rect(X + 2, Y, w - 4, 2, P.BL2); break;
      case 'computer': box(X, Y, w, h, P.W); rect(X + 1, Y + h / 2, w - 2, 2, P.TL); for (let i = 0; i < 4; i++) px(X + 3 + i * 3, Y + 3, ((t * 4 | 0) + i) % 2 ? P.RD2 : P.K); break;
      case 'terminal': box(X + 1, Y + 1, w - 2, h - 2, P.G3); rect(X + 3, Y + 3, w - 6, h - 7, P.TL); rect(X + 3, Y + h - 3, w - 6, 1, P.W); break;
      case 'table': { rect(X + 2, Y + 1, w - 4, h - 2, P.BR); rect(X + 1, Y + 2, w - 2, h - 4, P.BR); rect(X + w / 2 - 2, Y + h / 2 - 1, 4, 3, P.YE); break; }
      case 'toilet': box(X + 2, Y + 1, w - 4, h - 2, P.W); break;
      case 'sink': box(X + 1, Y + 1, w - 2, h - 3, P.W); rect(X + w / 2 - 1, Y + 3, 2, 2, P.CY); break;
      case 'evidence': if (f.content) { box(X + 1, Y + 1, w - 2, h - 2, P.BR); line(X + 2, Y + 2, X + w - 3, Y + h - 3, P.K); } break;
    }
  }
  function drawGuy(p, X, Y) {
    const x = Math.round(X), y = Math.round(Y);
    if (p.out) { if (p.hidden) return; const c = p.col || P.YE; line(x - 5, y - 4, x + 5, y + 4, c); line(x - 5, y + 4, x + 5, y - 4, c); line(x - 4, y - 4, x + 4, y + 4, P.BR); rect(x - 1, y - 1, 3, 3, P.K); return; }
    const ph = (p.walk * 8 | 0) % 2, dx = Math.round(Math.cos(p.dir) * 5), dy = Math.round(Math.sin(p.dir) * 5);
    if (p.kind === 'max') {
      const c = max.disguised ? P.YE : P.K; rect(x - 3, y - 4, 7, 9, c); rect(x - 2, y - 3, 5, 7, max.crouch ? P.K : P.G1); rect(x - 1, y - 2, 3, 3, P.BR);
      if (!max.crouch) { line(x, y, x + dx, y + dy, P.K); px(x + dx, y + dy, max.cool > (max.gun === 'uzi' ? 0.15 : 0.4) ? P.W : P.G3); }
    } else {
      const c = p.col || P.YE, shade = p.kind === 'guard' ? P.GR : P.G1;
      rect(x - 4, y - 4, 9, 9, c); rect(x + 2, y - 3, 2, 7, shade); rect(x - 2, y - 2, 5, 5, P.K); px(x, y - 1, p.kind === 'guard' ? P.G1 : P.BR);
      if (p.kind === 'guard') { px(x + Math.round(dx * 0.8), y + Math.round(dy * 0.8), P.PK); line(x + Math.round(dx * 0.8), y + Math.round(dy * 0.8), x + dx + Math.sign(dx), y + dy + Math.sign(dy), P.K); if (p.state === 'attack' && p.cool > 1) { px(x + dx * 2, y + dy * 2, P.YE); px(x + dx * 2 + 1, y + dy * 2, P.W); } }
      px(ph ? x - 4 : x + 4, y + 4, c);
      if (p.stun > 0) px(x, y - 7, (t * 6 | 0) % 2 ? P.YE : P.W);
      if (p === target && p.state === 'seated') rect(x - 1, y - 8, 3, 1, P.YE);
    }
  }
  scene.draw = function () {
    // left: black/blue scan-lines; right: blue panel; white divider
    rect(0, 0, 171, H, P.K); for (let y = 1; y < H; y += 2) rect(0, y, 171, 1, P.BL);
    rect(171, 0, 1, H, P.W); rect(172, 0, 1, H, P.K); rect(173, 0, 145, H, P.BL); rect(318, 0, 1, H, P.K); rect(319, 0, 1, H, P.W);
    drawEquip();
    drawBuildingWindow(179, 99, 122, 98);
    if (!entryDoor) { drawDoorMenu(); postFlash(); return; }
    const v = roomView(), r = v.r;
    drawRoom(v);
    for (const f of F) if (f.room === r.id) drawFurn(f, v);
    for (const c of clouds) if (c.room === r.id) { const cr = c.r / TS * v.S; dither(v.sx(c.x) - cr, v.sy(c.y) - cr, cr * 2, cr * 2, 'rgba(0,0,0,0)', P.GR2, 6); }
    const here = people.filter(p => roomOf(p.x, p.y) === r.id || p === max.prisoner).concat([max]).sort((a, b) => a.y - b.y);
    for (const p of here) drawGuy(p, v.sx(p.x), v.sy(p.y));
    for (const b of bullets) if (roomOf(b.x, b.y) === r.id) rect(v.sx(b.x), v.sy(b.y), 1, 1, b.mine ? P.W : P.YE);
    for (const gr of grenades) if (roomOf(gr.x, gr.y) === r.id) rect(v.sx(gr.x) - 1, v.sy(gr.y) - gr.z - 1, 3, 3, GREN[gr.type].col);
    for (const e of fx) { const X = v.sx(e.x), Y = v.sy(e.y); if (e.k === 'boom') { disc(X, Y, 6 + (0.5 - e.t) * 40, e.type === 'frag' ? P.RD2 : P.W); disc(X, Y, 5, P.YE); } else px(X, Y, e.k === 'hit' ? P.RD2 : P.YE); }
    if (max.busy) { const X = v.sx(max.x), Y = v.sy(max.y); rect(X - 8, Y - 10, 16, 2, P.K); rect(X - 8, Y - 10, 16 * max.busy.t / max.busy.need, 2, P.GR2); }
    const tgt = people.find(p => p.kind === 'guard' && !p.out && roomOf(p.x, p.y) === r.id && Math.abs(Math.atan2(Math.sin(Math.atan2(p.y - max.y, p.x - max.x) - max.dir), Math.cos(Math.atan2(p.y - max.y, p.x - max.x) - max.dir))) < 0.3 && los(max.x, max.y, p.x, p.y));
    // Max portrait, x0..24 y0..39
    rect(0, 0, 25, 40, P.G3); rect(1, 1, 23, 38, P.BL2); drawMaxSide(3, 10, tgt);
    if (max.stun > 0 || max.gassed > 0.4) { const k = Math.min(1, Math.max(max.stun / 6, max.gassed / 2.5)); rect(1, 1 + 38 * (1 - k), 23, 38 * k, max.gassed > 0.4 ? P.BR : P.G1); }
    // information bar, x26..170 y0..18
    rect(26, 0, 145, 19, P.G3); rect(27, 1, 142, 17, P.BL); rect(169, 1, 1, 17, P.K);
    text(fitText(ROOM_NAMES[r.kind], 78), 30, 2, P.W);
    const hh = Math.floor(clock / 3600) % 24, mm = Math.floor(clock / 60) % 60, ss = Math.floor(clock) % 60;
    if (max.disguised || max.gassed > 0.4) text(max.gassed > 0.4 ? 'GAS' : 'Disguise', 102, 2, P.RD2);
    textR([hh, mm, ss].map(v2 => String(v2).padStart(2, '0')).join(':'), 167, 2, P.W);
    textC(fitText(msg, 138), 98, 10, P.W);
    if (msgLong()) { const ls = wrap(msg, 146); msgBox(12, 20, 150, ls.length * 8 + 6); ls.forEach((l, i) => text(l, 16, 23 + i * 8, P.W)); }
    if (alarm && (t * 4 | 0) % 2) { frame(v.ox + r.x * v.S - 5, v.oy + r.y * v.S - 5, r.w * v.S + 10, r.h * v.S + 10, P.RD2); }
    if (comp) drawComputer();
    if (over) drawOver();
    if (pauseMenu) { msgBox(30, 50, 136, 70); text('Do you want to...', 36, 53, P.W); pauseMenu.draw(); }
    postFlash();
  };
  let lastMsg = '', msgT0 = 0;
  function msgLong() { if (msg !== lastMsg) { lastMsg = msg; msgT0 = t; } return textW(msg) > 138 && t - msgT0 < 4; }
  function postFlash() { // being hit turns every light gray pixel light red for a moment
    if (hitFlash <= 0) return; hitFlash--;
    const d = g.getImageData(0, 0, W, H), a = d.data; for (let i = 0; i < a.length; i += 4) if (a[i] === 0xAA && a[i + 1] === 0xAA && a[i + 2] === 0xAA) { a[i] = 0xFF; a[i + 1] = 0x55; a[i + 2] = 0x55; } g.putImageData(d, 0, 0);
  }
  function drawMaxSide(x, y, tgt) {
    const mv = input.axis(); const walk = (mv.x || mv.y) ? (t * 6 | 0) % 2 : 0; const top = max.crouch ? 8 : 0;
    rect(x + 7, y + top, 5, 5, P.RD2); rect(x + 7, y + top, 5, 2, P.BR); rect(x + 11, y + 2 + top, 1, 2, P.RD);
    rect(x + 5, y + 5 + top, 9, 11 - top / 2, max.disguised ? P.YE : P.K); rect(x + 6, y + 6 + top, 2, 8, P.G1); rect(x + 13, y + 7 + top, 5, 2, P.K); rect(x + 17, y + 6 + top, 3, 2, P.G3);
    if (!max.crouch) { rect(x + 6, y + 16, 3, 10 - walk, P.K); rect(x + 10, y + 16, 3, 9 + walk, P.K); } else rect(x + 5, y + 18, 11, 6, P.K);
    if (tgt) { const q = Math.min(1, (0.3 + sk * 0.2) * (max.gun === 'uzi' ? 1.4 : 1)); const col = q > 0.8 ? P.W : q > 0.5 ? P.G3 : q > 0.3 ? P.G1 : P.K; frame(x + 5, y + 2, 9, 9, col); px(x + 9, y + 6, col); }
  }
  function drawEquip() {
    // Max's silhouette: dark gray / blue stripes, brown lit edge
    const sil = (y) => { if (y < 26) return [262, 286]; if (y < 34) return [266, 282]; return [248 - Math.min(6, (y - 34) / 8), 310]; };
    for (let y = 0; y < H; y++) { const [a, b] = sil(y); rect(a, y, b - a, 1, y % 2 ? P.G1 : P.BL); px(a, y, P.BR); }
    rect(240, 36, 12, 8, P.G1);
    if (kit.kevlar) { rect(252, 30, 48, 66, P.G3); dither(252, 30, 48, 66, P.G3, P.G1, 5); rect(266, 30, 20, 10, P.BL); for (let i = 0; i < max.hits; i++) { const hx = 262 + (i * 17) % 30, hy = 50 + (i * 11) % 30; px(hx, hy, P.K); px(hx - 1, hy - 1, P.G1); px(hx + 1, hy + 1, P.G1); px(hx + 1, hy - 1, P.K); } }
    else for (let i = 0; i < max.hits; i++) rect(266 + i * 8, 56, 4, 4, P.RD2);
    if (kit.gasmask) { rect(266, 12, 20, 10, P.G3); disc(276, 17, 3, P.BR); disc(276, 17, 1, P.YE); }
    if (kit.detector) { rect(262, 6, 2, 12, P.YE); rect(288, 6, 2, 12, P.YE); rect(263, 3, 26, 2, P.YE); }
    // the gun, held at shoulder height
    if (max.gun === 'uzi') { rect(178, 44, 54, 7, P.K); rect(184, 45, 44, 2, P.G1); rect(200, 51, 6, 8, P.K); rect(214, 51, 5, 10, P.G1); } else { rect(186, 44, 40, 6, P.K); rect(190, 45, 32, 2, P.G1); rect(206, 50, 6, 8, P.K); }
    px(max.gun === 'uzi' ? 178 : 186, 46, P.G3); rect(226, 44, 18, 4, P.G1);
    // grenade rack
    rect(177, 2, 57, 15, P.BL2); ['frag', 'stun', 'gas'].forEach((k2, row) => { const y = 3 + row * 5; if (max.gtype === k2) rect(177, y - 1, 57, 5, P.CY); for (let n = 0; n < Math.min(8, max.gren[k2]); n++) { rect(179 + n * 7, y, 5, 4, P.K); rect(180 + n * 7, y, 3, 3, GREN[k2].col); } });
    // bugs
    for (let n = 0; n < max.bugs; n++) { const bx = 236 + (n % 2) * 9, by = 8 + Math.floor(n / 2) * 8; rect(bx, by, 7, 5, P.RD); rect(bx + 1, by + 1, 5, 3, P.RD2); }
    // bullets and magazines
    for (let n = 0; n < max.clip; n++) { rect(178 + n * 5, 71, 3, 6, P.W); rect(178 + n * 5, 75, 3, 2, P.G1); }
    for (let n = 0; n < Math.min(4, max.clips); n++) { rect(178 + n * 10, 80, 7, 14, P.G3); for (let k2 = 0; k2 < 7; k2++) rect(178 + n * 10, 81 + k2 * 2, 7, 1, P.G1); }
    if (kit.camera) { rect(226, 73, 19, 11, P.W); rect(227, 74, 17, 2, P.G3); disc(235, 79, 3, P.TL); rect(223, 86, 14, 8, P.K); text(String(max.film).padStart(2, '0'), 224, 86, P.GR2); rect(238, 86, 6, 6, P.BL2); }
    if (kit.safekit) { rect(248, 73, 45, 24, P.K); frame(248, 73, 45, 24, P.G3); textC('SAFE', 270, 74, P.G1); textC('CRACKING', 270, 81, P.G1); textC('KIT', 270, 88, P.G1); }
  }
  function drawBuildingWindow(x, y, w, h) {
    frame(x, y, w, h, P.G3); rect(x + 1, y + 1, w - 2, h - 2, P.K);
    const sc = Math.min((w - 6) / B.bw, (h - 6) / B.bh), ox = x + 3 - B.bx * sc + ((w - 6) - B.bw * sc) / 2, oy = y + 3 - B.by * sc;
    if (opts.plan) rect(ox + B.bx * sc, oy + B.by * sc, B.bw * sc, B.bh * sc, P.YE);
    for (const r of B.rooms) if (r.seen) { rect(ox + r.x * sc, oy + r.y * sc, r.w * sc, r.h * sc, P.TL); frame(ox + r.x * sc - 1, oy + r.y * sc - 1, r.w * sc + 2, r.h * sc + 2, P.CY); for (const f of F) if (f.room === r.id) rect(ox + f.x * sc, oy + f.y * sc, Math.max(1, f.w * sc - 1), Math.max(1, f.h * sc - 1), { desk: P.BR, file: P.G1, chair: P.BL, couch: P.RD, computer: P.W, terminal: P.W, floorsafe: P.RD2 }[f.type] || P.G1); }
    for (const d of B.outer) rect(ox + d.x * sc - 1, oy + d.y * sc - 1, 2, 2, P.G1);
    for (const p of people) { if (p.out || p.kind !== 'guard') continue; const near = kit.detector && dist(p.x, p.y, max.x, max.y) < 110; const rr = B.rooms[roomOf(p.x, p.y)]; if (near || (rr && rr.bugged)) rect(ox + p.x / TS * sc, oy + p.y / TS * sc, 2, 1, P.YE); }
    if (entryDoor && (t * 3 | 0) % 2) rect(ox + max.x / TS * sc - 1, oy + max.y / TS * sc - 1, 2, 2, P.K);
  }
  const doorMenu = Menu(B.outer.map((d, i) => ({ label: 'Door #' + (i + 1), go: () => enterAt(d) })), 46, 70, 80);
  function drawDoorMenu() { msgBox(28, 58, 110, 16 + B.outer.length * 8); text('Which door?', 34, 61, P.W); doorMenu.draw(); const sc = Math.min(116 / B.bw, 92 / B.bh), ox = 182 - B.bx * sc + (116 - B.bw * sc) / 2, oy = 102 - B.by * sc; B.outer.forEach((d, i) => text(String(i + 1), ox + d.x * sc - 2, oy + d.y * sc - 4, P.YE, P.K)); }
  function drawComputer() {
    rect(VX0, VY0 - 20, VX1 - VX0, VY1 - VY0 + 26, P.K); frame(VX0, VY0 - 20, VX1 - VX0, VY1 - VY0 + 26, P.CY);
    let y = VY0 - 16; for (const l of comp.lines) { y = para(l, VX0 + 4, y, VX1 - VX0 - 8, P.GR2, 8) + 1; if (y > VY0 + 70) break; }
    const prompt = comp.stage === 'pw' ? 'PASSWORD: ' : 'SEARCH: ';
    if (comp.stage !== 'result') text(prompt + comp.input + ((t * 3 | 0) % 2 ? '_' : ''), VX0 + 4, VY0 + 76, P.YE);
    else text(comp.last ? 'Enter: log off' : 'Type again, or Esc: log off', VX0 + 4, VY0 + 76, P.G3);
    const K = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < 29; i++) { const x = 10 + (i % 13) * 12, yy = 148 + Math.floor(i / 13) * 12; rect(x, yy, 11, 11, i < 26 ? P.GR : P.G1); textC(i < 26 ? K[i] : ['_', '<', 'OK'][i - 26], x + 5, yy + 2, i < 26 ? P.K : P.W); }
  }
  function drawOver() {
    const k = over.kind; const lines = [{ escaped: 'You quickly slip out of the building.', captured: 'You slump to the ground, overcome by your wounds.', abort: 'You abandon the mission.' }[k]];
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
    if (k === 'menu') { pauseMenu = Menu([{ label: 'Continue', go: () => { pauseMenu = null; } }, { label: 'Photograph (P)', go: () => { pauseMenu = null; photo(); } }, { label: 'Plant a bug (B)', go: () => { pauseMenu = null; bug(); } }, { label: 'Crouch/stand (C)', go: () => { pauseMenu = null; max.crouch = !max.crouch; } }, { label: 'Long throw (F7)', go: () => { pauseMenu = null; throwG(2); } }, { label: 'Abort mission', go: () => { pauseMenu = null; finish('abort'); } }], 44, 62, 118); return; }
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
    if (c === 'F10') { const ks = ['frag', 'stun', 'gas']; max.gtype = ks[(ks.indexOf(max.gtype) + 1) % 3]; return true; }
    return false;
  };
  scene.dbg = { max, people, B, F, raiseAlarm, enterAt };
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
      rect(0, 0, W, H, P.K); rect(0, 0, 160, 172, P.BL2); rect(74, 0, 2, 172, P.K); rect(158, 0, 2, 172, P.K);
      slots.forEach((s, i) => {
        const on = i === sel, y0 = s.y + 8; rect(s.x, y0, s.w, s.h, on ? P.CY : P.BL); if (on) dither(s.x, y0, s.w, s.h, P.CY, P.W, 3);
        rect(s.x, y0 + s.h, s.w, 3, P.BR); rect(s.x, y0 + s.h + 3, s.w, 1, P.K);
        if (s.label) textC(s.label, s.x + s.w / 2, s.y, P.W);
        if (s.k === 'detector') { rect(s.x, s.y + 8, s.w, 9, P.BL2); textC('DETECTOR', s.x + s.w / 2, s.y + 8, P.W); }
        if (!taken[s.k]) armoryItem(s.k, s.x + s.w / 2, y0 + s.h);
      });
      const cx = 238;
      for (let yy = 0; yy < 162; yy += 2) { const w = yy < 26 ? 16 : yy < 34 ? 10 : Math.min(58, 36 + (yy - 34) / 2); rect(cx - w / 2, 6 + yy, w, 1, P.BL); }
      rect(cx - 70, 44, 50, 3, P.BL); rect(cx - 96, 40, 30, 5, P.G3); rect(cx - 88, 45, 5, 8, P.G3); if (taken.uzi) { rect(cx - 104, 38, 44, 6, P.G1); rect(cx - 84, 44, 5, 12, P.G1); }
      for (let n = 0; n < 6; n++) rect(cx - 90 + n * 5, 70, 3, 8, P.YE); for (let n = 0; n < 3; n++) rect(cx - 90 + n * 10, 82, 7, 12, P.G3);
      if (taken.kevlar) { rect(cx - 20, 48, 42, 50, P.G1); for (let i = 0; i < 6; i++) rect(cx - 16, 52 + i * 8, 34, 1, P.G3); }
      if (taken.gasmask) { rect(cx - 9, 14, 18, 10, P.G3); disc(cx, 22, 3, P.K); }
      if (taken.detector) { rect(cx - 13, 8, 3, 14, P.YE); rect(cx + 11, 8, 3, 14, P.YE); rect(cx - 12, 4, 25, 2, P.YE); }
      if (taken.camera) { rect(cx + 24, 60, 14, 9, P.G3); disc(cx + 31, 64, 3, P.K); }
      if (taken.safekit) { rect(cx - 20, 110, 40, 18, P.G1); frame(cx - 20, 110, 40, 18, P.G3); text('KIT', cx - 7, 115, P.W); }
      ['frag', 'stun', 'gas'].forEach((k, r) => { if (taken[k]) for (let n = 0; n < 4; n++) disc(cx - 104 + n * 7, 104 + r * 8, 2, GREN[k].col); });
      if (taken.bugs) for (let n = 0; n < 4; n++) disc(cx + 30 + n * 6, 130, 2, P.RD);
      text('Items taken: ' + used() + ' of 5.  The silenced pistol is free.', 4, 176, P.W);
      text('Enter takes or returns.  Esc when ready.', 4, 187, P.G3);
      bevel(250, 182, 64, 14, P.BL, P.BL2, P.K); textC('Go in', 282, 185, P.YE);
    },
  };
}
function armoryItem(k, cx, base) {
  switch (k) {
    case 'uzi': rect(cx - 16, base - 14, 32, 6, P.G1); rect(cx - 4, base - 8, 5, 8, P.G1); rect(cx + 8, base - 10, 3, 6, P.G1); break;
    case 'camera': rect(cx - 7, base - 9, 14, 9, P.G1); disc(cx, base - 5, 3, P.K); rect(cx + 3, base - 11, 3, 2, P.G3); break;
    case 'bugs': for (let n = 0; n < 6; n++) { disc(cx - 25 + n * 10, base - 4, 3, P.RD); px(cx - 25 + n * 10, base - 5, P.W); } break;
    case 'frag': case 'stun': case 'gas': for (let n = 0; n < 7; n++) { disc(cx - 28 + n * 9, base - 5, 3, GREN[k].col); rect(cx - 29 + n * 9, base - 10, 2, 2, P.G3); } break;
    case 'gasmask': disc(cx, base - 14, 10, P.G3); disc(cx - 4, base - 16, 3, P.CY); disc(cx + 4, base - 16, 3, P.CY); disc(cx, base - 7, 4, P.K); break;
    case 'detector': rect(cx - 10, base - 22, 3, 14, P.K); rect(cx + 7, base - 22, 3, 14, P.K); rect(cx - 9, base - 25, 19, 3, P.K); rect(cx - 12, base - 10, 7, 8, P.RD); rect(cx + 5, base - 10, 7, 8, P.RD); break;
    case 'kevlar': rect(cx - 20, base - 50, 40, 48, P.G1); rect(cx - 8, base - 50, 16, 10, P.BL); for (let i = 0; i < 5; i++) rect(cx - 17, base - 38 + i * 8, 34, 1, P.G3); break;
    case 'safekit': rect(cx - 34, base - 12, 68, 12, P.G3); rect(cx - 30, base - 28, 18, 16, P.G1); for (let i = 0; i < 3; i++) rect(cx - 26 + i * 5, base - 26, 2, 12, [P.RD, P.GR2, P.YE][i]); rect(cx - 6, base - 28, 34, 16, P.K); for (let i = 0; i < 12; i++) px(cx - 2 + (i % 6) * 5, base - 24 + Math.floor(i / 6) * 5, i % 3 ? P.RD2 : P.GR2); break;
  }
}
