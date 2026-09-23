// ===================================================================
// BREAK-IN: top-down building infiltration
// ===================================================================
const TS = 8, VIEW_H = 168;
const T_OUT = 0, T_FLOOR = 1, T_WALL = 2, T_DOOR = 3, T_GRASS = 4, T_ROAD = 5;
const ROOM_KINDS = {
  lobby: { name: 'Lobby', floor: 'marble' }, office: { name: 'Office', floor: 'carpet' }, exec: { name: 'Executive office', floor: 'wood' },
  records: { name: 'Records room', floor: 'tile' }, lab: { name: 'Communications room', floor: 'lino' }, lounge: { name: 'Lounge', floor: 'carpet2' },
  storage: { name: 'Storage', floor: 'concrete' }, guard: { name: 'Guard post', floor: 'concrete' }, hall: { name: 'Corridor', floor: 'lino' },
};
const FURN = {
  desk: { w: 2, h: 1, search: 1.4, tall: false }, bigdesk: { w: 3, h: 2, search: 2, tall: false }, filecab: { w: 1, h: 1, search: 2, tall: true },
  safe: { w: 1, h: 1, search: 4.5, tall: true }, shelf: { w: 2, h: 1, search: 1.6, tall: true }, computer: { w: 2, h: 1, search: 3, tall: false },
  sofa: { w: 2, h: 1 }, plant: { w: 1, h: 1, tall: true }, table: { w: 2, h: 2 }, crate: { w: 1, h: 1, tall: true }, bigcrate: { w: 2, h: 2, tall: true },
  cooler: { w: 1, h: 1, tall: true }, locker: { w: 1, h: 1, search: 1, tall: true }, bench: { w: 3, h: 1, search: 2 }, copier: { w: 1, h: 1, tall: true },
};
const WEAPONS = {
  pistol: { name: 'Silenced 9mm', ammo: 24, rate: 0.35, dmg: 1, noise: 60, spread: 0.05, speed: 260 },
  smg: { name: 'SMG', ammo: 60, rate: 0.09, dmg: 1, noise: 170, spread: 0.12, speed: 280 },
  shotgun: { name: 'Shotgun', ammo: 12, rate: 0.8, dmg: 2, noise: 200, spread: 0.3, speed: 240, pellets: 5 },
};
const GREN = { stun: { name: 'Stun', col: P.W }, gas: { name: 'Gas', col: P.GR2 }, frag: { name: 'Frag', col: P.OR } };

function genBuilding(level) {
  const cols = 40 + ri(0, 14), rows = 26 + ri(0, 8), M = 3;
  const MW = cols + M * 2, MH = rows + M + 6;
  const T = [], R = [];
  for (let y = 0; y < MH; y++) { T.push(new Array(MW).fill(T_GRASS)); R.push(new Array(MW).fill(-1)); }
  const bx = M, by = M, bw = cols, bh = rows;
  for (let y = by + bh; y < MH; y++) for (let x = 0; x < MW; x++) T[y][x] = y >= by + bh + 2 ? T_ROAD : T_OUT;
  for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) T[y][x] = (x === bx || y === by || x === bx + bw - 1 || y === by + bh - 1) ? T_WALL : T_FLOOR;
  // BSP into rooms
  const leaves = [];
  (function split(r, depth) {
    const canH = r.w >= 15, canV = r.h >= 12;
    if ((!canH && !canV) || (depth > 2 && rnd() < 0.25 && r.w * r.h < 180)) { leaves.push(r); return; }
    const horiz = canH && (!canV || r.w / r.h > 1.2 || (r.w / r.h > 0.8 && rnd() < 0.5));
    if (horiz) { const sx = r.x + ri(6, r.w - 7); for (let y = r.y; y < r.y + r.h; y++) T[y][sx] = T_WALL; split({ x: r.x, y: r.y, w: sx - r.x, h: r.h }, depth + 1); split({ x: sx + 1, y: r.y, w: r.x + r.w - sx - 1, h: r.h }, depth + 1); }
    else { const sy = r.y + ri(5, r.h - 6); for (let x = r.x; x < r.x + r.w; x++) T[sy][x] = T_WALL; split({ x: r.x, y: r.y, w: r.w, h: sy - r.y }, depth + 1); split({ x: r.x, y: sy + 1, w: r.w, h: r.y + r.h - sy - 1 }, depth + 1); }
  })({ x: bx + 1, y: by + 1, w: bw - 2, h: bh - 2 }, 0);
  const rooms = leaves.map((l, i) => { for (let y = l.y; y < l.y + l.h; y++) for (let x = l.x; x < l.x + l.w; x++) R[y][x] = i; return Object.assign({ id: i, kind: 'office', seen: false, doors: [] }, l); });
  // door candidates between room pairs
  const cand = {};
  for (let y = by + 1; y < by + bh - 1; y++) for (let x = bx + 1; x < bx + bw - 1; x++) {
    if (T[y][x] !== T_WALL) continue;
    const pairs = [[R[y][x - 1], R[y][x + 1], 'v'], [R[y - 1][x], R[y + 1][x], 'h']];
    for (const [a, b, o] of pairs) if (a >= 0 && b >= 0 && a !== b) { const k = Math.min(a, b) + ',' + Math.max(a, b); (cand[k] = cand[k] || []).push({ x, y, o, a, b }); }
  }
  const parent = rooms.map((_, i) => i); const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const doors = [];
  const addDoor = c => { T[c.y][c.x] = T_DOOR; const d = { x: c.x, y: c.y, o: c.o, open: false, locked: false, a: c.a, b: c.b }; doors.push(d); rooms[c.a].doors.push(d); rooms[c.b].doors.push(d); };
  const keys = shuffle(Object.keys(cand));
  for (const k of keys) {
    const list = cand[k].filter(c => { // not at the ends of a wall run
      const dx = c.o === 'v' ? 0 : 1, dy = c.o === 'v' ? 1 : 0;
      return T[c.y - dy][c.x - dx] === T_WALL && T[c.y + dy][c.x + dx] === T_WALL;
    });
    if (list.length < 1) continue;
    const c = list[Math.floor(list.length / 2 + (rnd() - 0.5) * list.length * 0.6)];
    const ra = find(c.a), rb = find(c.b);
    if (ra !== rb) { parent[ra] = rb; addDoor(c); } else if (rnd() < 0.3) addDoor(c);
  }
  // entrance on the bottom wall
  const bottom = rooms.filter(r => r.y + r.h === by + bh - 1 && r.w >= 5);
  const lobby = bottom.length ? pick(bottom) : rooms[0];
  const ex = lobby.x + Math.floor(lobby.w / 2), ey = by + bh - 1;
  T[ey][ex] = T_DOOR; const entrance = { x: ex, y: ey, o: 'h', open: true, locked: false, a: lobby.id, b: -1, entrance: true }; doors.push(entrance); lobby.doors.push(entrance);
  // walkway to the street
  for (let y = ey + 1; y < by + bh + 2; y++) T[y][ex] = T_OUT;
  // room roles, by distance from the lobby
  const depth = bfsRooms(rooms, lobby.id);
  lobby.kind = 'lobby';
  const others = rooms.filter(r => r !== lobby).sort((a, b) => depth[b.id] - depth[a.id] || b.w * b.h - a.w * a.h);
  if (others[0]) others[0].kind = 'exec';
  const kinds = shuffle(['records', 'lab', 'guard', 'lounge', 'storage', 'office', 'office', 'office', 'records', 'office', 'storage', 'lab']);
  others.slice(1).forEach((r, i) => { r.kind = (r.w <= 5 || r.h <= 4) ? 'hall' : kinds[i % kinds.length]; });
  // locks: doors deep in the building
  doors.forEach(d => { if (!d.entrance && (depth[d.a] >= 2 || depth[d.b] >= 2) && rnd() < 0.18 + level * 0.04) d.locked = true; });
  const execDoorLocked = others[0] && others[0].doors.some(d => d.locked);
  return { T, R, MW, MH, rooms, doors, lobby, entrance, exec: others[0] || lobby, depth, bx, by, bw, bh, execDoorLocked };
}
function bfsRooms(rooms, start) {
  const dd = rooms.map(() => 99); dd[start] = 0; const q = [start];
  while (q.length) { const r = q.shift(); for (const d of rooms[r].doors) { const o = d.a === r ? d.b : d.a; if (o >= 0 && dd[o] > dd[r] + 1) { dd[o] = dd[r] + 1; q.push(o); } } }
  return dd;
}

function furnish(B, occupant, level) {
  const F = []; const occ = B.T.map(r => r.map(() => -1));
  const isDoorAdj = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = B.T[y + dy] && B.T[y + dy][x + dx]; if (t === T_DOOR) return true; } return false; };
  function free(x, y, w, h, room) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { if (B.T[yy] === undefined || B.T[yy][xx] !== T_FLOOR || B.R[yy][xx] !== room.id || occ[yy][xx] >= 0 || isDoorAdj(xx, yy)) return false; } return true; }
  function reachable(room) {
    const ds = room.doors; if (ds.length < 1) return true; const start = ds[0]; const seen = new Set([start.x + ',' + start.y]); const q = [[start.x, start.y]]; let floorN = 0;
    while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (seen.has(k)) continue; const t = B.T[ny] && B.T[ny][nx]; if ((t === T_FLOOR && B.R[ny][nx] === room.id && occ[ny][nx] < 0) || (t === T_DOOR && room.doors.some(d => d.x === nx && d.y === ny))) { seen.add(k); q.push([nx, ny]); if (t === T_FLOOR) floorN++; } } }
    let total = 0; for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) if (occ[y][x] < 0) total++;
    return ds.every(d => seen.has(d.x + ',' + d.y)) && floorN >= total * 0.85;
  }
  function place(type, room, x, y, extra = {}) {
    const f = FURN[type]; if (!free(x, y, f.w, f.h, room)) return null;
    const it = Object.assign({ type, x, y, w: f.w, h: f.h, room: room.id, searched: false, loot: null }, extra); const id = F.length; F.push(it);
    for (let yy = y; yy < y + f.h; yy++) for (let xx = x; xx < x + f.w; xx++) occ[yy][xx] = id;
    if (!reachable(room)) { for (let yy = y; yy < y + f.h; yy++) for (let xx = x; xx < x + f.w; xx++) occ[yy][xx] = -1; F.pop(); return null; }
    return it;
  }
  const alongWalls = (room, type, n) => { let k = 0; for (let tries = 0; tries < 40 && k < n; tries++) { const side = ri(0, 3); const f = FURN[type]; let x, y; if (side === 0) { x = ri(room.x, room.x + room.w - f.w); y = room.y; } else if (side === 1) { x = ri(room.x, room.x + room.w - f.w); y = room.y + room.h - f.h; } else if (side === 2) { x = room.x; y = ri(room.y, room.y + room.h - f.h); } else { x = room.x + room.w - f.w; y = ri(room.y, room.y + room.h - f.h); } if (place(type, room, x, y)) k++; } return k; };
  const center = (room, type, n) => { let k = 0; for (let tries = 0; tries < 40 && k < n; tries++) { const f = FURN[type]; const x = ri(room.x + 1, room.x + room.w - f.w - 1), y = ri(room.y + 1, room.y + room.h - f.h - 1); if (place(type, room, x, y)) k++; } return k; };
  for (const room of B.rooms) {
    const a = room.w * room.h;
    switch (room.kind) {
      case 'lobby': center(room, 'sofa', 1); alongWalls(room, 'plant', 2); center(room, 'desk', 1); alongWalls(room, 'cooler', 1); break;
      case 'office': center(room, 'desk', Math.max(1, Math.floor(a / 30))); alongWalls(room, 'filecab', ri(1, 3)); alongWalls(room, 'plant', 1); if (rnd() < 0.5) alongWalls(room, 'computer', 1); break;
      case 'exec': center(room, 'bigdesk', 1); alongWalls(room, 'safe', 1); alongWalls(room, 'shelf', 2); alongWalls(room, 'plant', 2); alongWalls(room, 'sofa', 1); break;
      case 'records': alongWalls(room, 'filecab', Math.max(3, Math.floor(a / 8))); center(room, 'shelf', 2); break;
      case 'lab': alongWalls(room, 'computer', 3); center(room, 'bench', 1); alongWalls(room, 'copier', 1); break;
      case 'lounge': center(room, 'table', 1); alongWalls(room, 'sofa', 2); alongWalls(room, 'cooler', 1); alongWalls(room, 'plant', 1); break;
      case 'storage': center(room, 'bigcrate', 1); alongWalls(room, 'crate', ri(3, 6)); alongWalls(room, 'locker', 1); break;
      case 'guard': alongWalls(room, 'locker', ri(2, 4)); center(room, 'table', 1); break;
      case 'hall': alongWalls(room, 'plant', 1); break;
    }
  }
  // stash clues and items
  const searchable = F.filter(f => FURN[f.type].search);
  const nClues = occupant ? 3 + Math.min(3, Math.floor(level / 2)) : 1;
  const byPriority = shuffle(searchable.slice()).sort((a, b) => (b.type === 'safe') - (a.type === 'safe') + ((B.rooms[b.room].kind === 'exec') - (B.rooms[a.room].kind === 'exec')) * 0.5);
  byPriority.slice(0, nClues).forEach(f => f.loot = { kind: 'clue' });
  shuffle(searchable.filter(f => !f.loot)).slice(0, 4).forEach((f, i) => f.loot = { kind: ['ammo', 'grenade', 'medkit', 'key'][i] });
  if (B.execDoorLocked) { const k = searchable.find(f => f.loot && f.loot.kind === 'key'); if (!k) { const f = searchable.find(f => !f.loot && B.rooms[f.room].kind !== 'exec'); if (f) f.loot = { kind: 'key' }; } }
  return { F, occ };
}

// ------------------------------------------------------------------
function breakinScene(opts, done) {
  const level = opts.level || 1, occupant = opts.occupant || null, org = opts.org || pick(ORGS);
  const sk = game.agent ? game.agent.skills : { combat: 2 };
  const B = genBuilding(level); const { F, occ } = furnish(B, occupant, level);
  const MWpx = B.MW * TS, MHpx = B.MH * TS;
  const W0 = WEAPONS[opts.weapon || 'pistol'];
  const max = {
    x: B.entrance.x * TS + 4, y: (B.entrance.y + 2) * TS + 6, dir: -Math.PI / 2, face: 2, walk: 0, hp: 3 + (sk.combat >= 4 ? 1 : 0) + (opts.armor ? 2 : 0), maxHp: 0,
    weapon: W0, ammo: W0.ammo, cool: 0, gren: Object.assign({ stun: 0, gas: 0, frag: 0 }, opts.grenades || { stun: 2, gas: 1, frag: 0 }), gtype: 'stun',
    keys: 0, captive: null, search: null, speed: opts.armor ? 34 : 40, hitFlash: 0,
  };
  max.maxHp = max.hp; if (!max.gren[max.gtype]) max.gtype = Object.keys(max.gren).find(k => max.gren[k]) || 'stun';
  const people = [], bullets = [], grenades = [], clouds = [], fx = [];
  const clues = [], loot = []; let msg = 'Get inside. Search the building and get out alive.', msgT = 6;
  let alarm = false, alarmT = 0, police = 0, reinf = 0, reinfLeft = 3 + level, over = null, t = 0, kills = { guard: 0, civ: 0 };
  const say = (m, d = 3.5) => { msg = m; msgT = d; };

  // people
  const tileFree = (tx, ty) => B.T[ty] && (B.T[ty][tx] === T_FLOOR) && occ[ty][tx] < 0;
  function spot(room) { for (let i = 0; i < 60; i++) { const x = ri(room.x, room.x + room.w - 1), y = ri(room.y, room.y + room.h - 1); if (tileFree(x, y) && !people.some(p => Math.abs(p.x - x * TS - 4) < 8 && Math.abs(p.y - y * TS - 6) < 8)) return [x * TS + 4, y * TS + 6]; } return [room.x * TS + 4, room.y * TS + 6]; }
  function addPerson(kind, room, extra = {}) {
    const [x, y] = spot(room);
    const p = Object.assign({ kind, x, y, dir: rnd() * Math.PI * 2, walk: 0, state: kind === 'guard' ? 'patrol' : 'idle', hp: kind === 'guard' ? 2 : 1, room: room.id, home: room.id, path: null, pathT: 0, cool: 1, stun: 0, seeT: 0, alertT: 0, target: null, turnT: rnd() * 3,
      skin: pick([P.SK, P.SK, P.SK2, P.SK3]), hair: pick([P.K, P.BR, P.G3, P.TN]), torso: kind === 'guard' ? org.uni : pick([P.W, P.G4, P.BL3, P.CR, P.PK]), legs: kind === 'guard' ? org.uni2 : pick([P.G1, P.NV, P.BR, P.D2]) }, extra);
    people.push(p); return p;
  }
  const nGuards = Math.min(14, 2 + level * 2 + Math.floor(B.rooms.length / 5));
  const guardRooms = B.rooms.filter(r => r.kind !== 'lobby' || rnd() < 0.5);
  for (let i = 0; i < nGuards; i++) { const r = i < 2 ? B.rooms.find(r => r.kind === 'guard') || pick(guardRooms) : pick(guardRooms); addPerson('guard', r, { state: rnd() < 0.6 ? 'patrol' : 'idle' }); }
  B.rooms.forEach(r => { if ((r.kind === 'office' || r.kind === 'lab' || r.kind === 'lobby') && rnd() < 0.6) addPerson('civ', r); });
  let target = null;
  if (occupant) { target = addPerson('civ', B.exec, { vip: occupant, torso: occupant.face.jacket, legs: P.K, skin: occupant.face.skin, hair: occupant.face.hair }); }

  // ---------- helpers ----------
  const tileAt = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return B.T[ty] ? B.T[ty][tx] : T_WALL; };
  const doorAt = (tx, ty) => B.doors.find(d => d.x === tx && d.y === ty);
  function solidTile(tx, ty, forBullet) {
    const t = B.T[ty] && B.T[ty][tx]; if (t === undefined) return true; if (t === T_WALL) return true;
    if (t === T_DOOR) { const d = doorAt(tx, ty); return !d.open; }
    if (t === T_FLOOR && occ[ty][tx] >= 0) return forBullet ? FURN[F[occ[ty][tx]].type].tall : true;
    return false;
  }
  function blocked(x, y, r = 3) { for (const [dx, dy] of [[-r, -r], [r, -r], [-r, 0], [r, 0]]) if (solidTile(Math.floor((x + dx) / TS), Math.floor((y + dy) / TS))) return true; return false; }
  function opaque(tx, ty) { const t = B.T[ty] && B.T[ty][tx]; if (t === undefined || t === T_WALL) return true; if (t === T_DOOR) return !doorAt(tx, ty).open; return false; }
  function los(x0, y0, x1, y1) { const d = dist(x0, y0, x1, y1), n = Math.ceil(d / 3); for (let i = 1; i < n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; if (opaque(Math.floor(x / TS), Math.floor(y / TS))) return false; } return true; }
  function roomOf(x, y) { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return B.R[ty] ? B.R[ty][tx] : -1; }
  function moveEnt(e, vx, vy, dt) { const nx = e.x + vx * dt, ny = e.y + vy * dt; if (!blocked(nx, e.y)) e.x = nx; else openDoorNear(e, nx, e.y); if (!blocked(e.x, ny)) e.y = ny; else openDoorNear(e, e.x, ny); }
  function openDoorNear(e, x, y) { if (e === max) return; for (const [dx, dy] of [[-3, -3], [3, -3], [-3, 0], [3, 0]]) { const tx = Math.floor((x + dx) / TS), ty = Math.floor((y + dy) / TS); const d = doorAt(tx, ty); if (d && !d.open && (!d.locked || e.kind === 'guard')) { d.open = true; staticDirty = true; } } }
  function pathTo(sx, sy, gx, gy) { // BFS over tiles, returns list of tile centres
    const s = [Math.floor(sx / TS), Math.floor(sy / TS)], goal = [Math.floor(gx / TS), Math.floor(gy / TS)];
    const key = (x, y) => y * B.MW + x; const prev = new Map([[key(...s), -1]]); const q = [s]; let found = false, n = 0;
    while (q.length && n++ < 4000) { const [x, y] = q.shift(); if (x === goal[0] && y === goal[1]) { found = true; break; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = key(nx, ny); if (prev.has(k)) continue; const t = B.T[ny] && B.T[ny][nx]; if (t === undefined || t === T_WALL || (t === T_FLOOR && occ[ny][nx] >= 0)) continue; prev.set(k, key(x, y)); q.push([nx, ny]); } }
    if (!found) return null; const out = []; let k = key(...goal); while (k !== -1 && k !== undefined) { out.unshift([(k % B.MW) * TS + 4, Math.floor(k / B.MW) * TS + 5]); k = prev.get(k); } return out;
  }
  function noise(x, y, r) { for (const p of people) { if (p.state === 'dead' || p.stun > 0 || p.tied) continue; if (dist(p.x, p.y, x, y) < r) { if (p.kind === 'guard' && p.state !== 'attack' && p.state !== 'hunt') { p.state = 'investigate'; p.target = [x, y]; p.path = null; } else if (p.kind === 'civ' && !p.surrender) p.state = 'flee'; } } }
  function raiseAlarm(why) { if (alarm) return; alarm = true; alarmT = 0; police = 75; say(why + ' The alarm is sounding!', 4); sfx.alarm(); for (const p of people) if (p.kind === 'guard' && p.state !== 'dead') { p.state = 'hunt'; p.path = null; } }
  function canSee(p, x, y, range = 95) { const d = dist(p.x, p.y - 5, x, y); if (d > range) return false; if (d > 14) { let a = Math.atan2(y - p.y, x - p.x) - p.dir; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) > 1.05) return false; } return los(p.x, p.y - 5, x, y); }
  function shoot(from, ang, w, friendly) {
    const n = w.pellets || 1; for (let i = 0; i < n; i++) { const a = ang + (rnd() - 0.5) * w.spread * 2; bullets.push({ x: from.x + Math.cos(ang) * 5, y: from.y - 5 + Math.sin(ang) * 5, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, dmg: w.dmg, friendly, life: 0.8 }); }
    fx.push({ k: 'flash', x: from.x + Math.cos(ang) * 6, y: from.y - 5 + Math.sin(ang) * 6, t: 0.06 }); sfx.shot(); noise(from.x, from.y, w.noise);
  }
  function hurtPerson(p, dmg) {
    if (p.state === 'dead') return; p.hp -= dmg;
    if (p.hp <= 0) { p.state = 'dead'; p.stun = 0; if (p.kind === 'guard') kills.guard++; else { kills.civ++; if (p.vip) say(p.vip.code + ' is dead. No interrogation now.', 4); else say('You shot an unarmed civilian. The Agency will not be pleased.', 4); } if (max.captive === p) max.captive = null; }
    else if (p.kind === 'guard') { p.state = 'attack'; }
    else { p.state = 'flee'; }
  }
  function stunPerson(p, s) { if (p.state === 'dead') return; p.stun = Math.max(p.stun, s); p.path = null; }
  function explode(gr) {
    const r = gr.type === 'frag' ? 22 : gr.type === 'stun' ? 30 : 0;
    if (gr.type === 'gas') { clouds.push({ x: gr.x, y: gr.y, r: 4, t: 9 }); sfx.hiss(); noise(gr.x, gr.y, 50); return; }
    fx.push({ k: 'boom', x: gr.x, y: gr.y, t: 0.5, r, type: gr.type }); sfx.boom(); noise(gr.x, gr.y, 200);
    for (const p of people) { const d = dist(p.x, p.y - 4, gr.x, gr.y); if (d > r * 1.6 || !los(gr.x, gr.y, p.x, p.y - 4)) continue; if (gr.type === 'frag' && d < r) hurtPerson(p, 3); else stunPerson(p, gr.type === 'stun' ? 12 : 6); }
    const d = dist(max.x, max.y - 4, gr.x, gr.y); if (d < r && los(gr.x, gr.y, max.x, max.y - 4)) { if (gr.type === 'frag') hurtMax(2); else { max.stun = 3; say('You are caught in your own blast!'); } }
  }
  function hurtMax(n) { if (over) return; max.hp -= n; max.hitFlash = 0.3; sfx.tone(120, 0.2, 'sawtooth', 0.08, -60); if (max.hp <= 0) { max.hp = 0; finish('dead'); } }
  function nearestSearchable() {
    let best = null, bd = 14;
    for (const f of F) { if (!FURN[f.type].search) continue; const cx = Math.max(f.x * TS, Math.min(max.x, (f.x + f.w) * TS)), cy = Math.max(f.y * TS, Math.min(max.y - 3, (f.y + f.h) * TS)); const d = dist(max.x, max.y - 3, cx, cy); if (d < bd) { bd = d; best = f; } }
    return best;
  }
  function nearestPerson(r = 12) { let best = null, bd = r; for (const p of people) { if (p.state === 'dead') continue; const d = dist(max.x, max.y, p.x, p.y); if (d < bd) { bd = d; best = p; } } return best; }
  function nearestDoor() { const fx_ = max.x + Math.cos(max.dir) * 7, fy = max.y - 3 + Math.sin(max.dir) * 7; let best = null, bd = 12; for (const d of B.doors) { if (d.entrance) continue; const dd = dist(fx_, fy, d.x * TS + 4, d.y * TS + 4); if (dd < bd) { bd = dd; best = d; } } return best; }

  function action() {
    if (max.search) return;
    const p = nearestPerson();
    if (p && p !== max.captive) {
      if (p.stun > 0 && !p.tied) { if (p.vip && !max.captive) { max.captive = p; p.tied = true; p.surrender = true; say('You drag ' + p.vip.code + ' along with you. Get to the exit!'); sfx.select(); return; } p.tied = true; p.stun = 9999; say('Tied and gagged.'); sfx.blip(); return; }
      if (p.kind === 'civ' && !p.surrender) { p.surrender = true; p.state = 'surrender'; p.stun = 0; if (p.vip && !max.captive) { max.captive = p; say('"Don\'t shoot!" ' + p.vip.code + ' surrenders. Take them out of the building.', 4); } else { p.tied = true; p.stun = 9999; say('"Please... I have a family." You tie them up.'); } sfx.select(); return; }
      if (p.kind === 'guard' && p.state !== 'attack' && p.state !== 'hunt' && !canSee(p, max.x, max.y - 5)) { stunPerson(p, 9999); p.tied = true; say('You knock the guard out from behind.'); sfx.noise(0.1, 0.1, 300); return; }
    }
    const d = nearestDoor();
    if (d) {
      if (d.locked) { if (max.keys > 0) { max.keys--; d.locked = false; d.open = true; staticDirty = true; say('The key card opens the door.'); sfx.select(); } else { max.search = { door: d, t: 0, need: 5 - Math.min(2, (sk.electronics || 2) - 2) }; say('Picking the lock...'); } return; }
      d.open = !d.open; staticDirty = true; sfx.tone(d.open ? 220 : 180, 0.06); return;
    }
    const f = nearestSearchable();
    if (f) { if (f.searched) { say('Already searched.'); return; } max.search = { f, t: 0, need: FURN[f.type].search }; say('Searching the ' + ({ filecab: 'filing cabinet', bigdesk: 'desk', computer: 'computer files', bench: 'workbench' }[f.type] || f.type) + '...'); return; }
    say('Nothing here.', 1.2);
  }
  function finishSearch(s) {
    if (s.door) { s.door.locked = false; s.door.open = true; staticDirty = true; say('Click. The lock gives.'); sfx.select(); return; }
    const f = s.f; f.searched = true; staticDirty = true;
    if (!f.loot) { say(pick(['Old invoices. Nothing useful.', 'Just stationery.', 'Empty.', 'Personal letters. Nothing useful.', 'Tax records. Boring.'])); sfx.blip(); return; }
    const L = f.loot;
    if (L.kind === 'clue') { const c = occupant ? clueFrom(occupant, 0.4) : null; if (c) { clues.push(c); say('CLUE: ' + c, 5); sfx.success(); } else { clues.push('Documents of no value'); say('Documents... but nothing you do not already know.'); } }
    else if (L.kind === 'ammo') { max.ammo += Math.ceil(max.weapon.ammo / 2); say('Found ammunition.'); sfx.select(); }
    else if (L.kind === 'grenade') { const k = pick(['stun', 'gas', 'frag']); max.gren[k]++; say('Found a ' + GREN[k].name.toLowerCase() + ' grenade.'); sfx.select(); }
    else if (L.kind === 'medkit') { max.hp = Math.min(max.maxHp, max.hp + 1); say('A first-aid kit. You patch yourself up.'); sfx.select(); }
    else if (L.kind === 'key') { max.keys++; say('A security key card!'); sfx.select(); }
  }
  function throwGrenade() {
    if (max.gren[max.gtype] <= 0) { say('No ' + GREN[max.gtype].name.toLowerCase() + ' grenades left.'); sfx.deny(); return; }
    max.gren[max.gtype]--; const d = 60; grenades.push({ x: max.x, y: max.y - 5, sx: max.x, sy: max.y - 5, tx: max.x + Math.cos(max.dir) * d, ty: max.y - 5 + Math.sin(max.dir) * d, t: 0, type: max.gtype }); sfx.tone(500, 0.1, 'triangle', 0.05, -200);
  }
  function finish(kind) {
    if (over) return; over = { kind, t: 0 };
    if (kind === 'escaped') { sfx.success(); } else sfx.fail();
  }

  // ---------- static layer (floors, walls, furniture) ----------
  let staticCv = document.createElement('canvas'); staticCv.width = MWpx; staticCv.height = MHpx; let staticDirty = true;
  function renderStatic() {
    drawTo(staticCv.getContext('2d'), () => {
      for (let y = 0; y < B.MH; y++) for (let x = 0; x < B.MW; x++) drawTile(x, y);
      for (const f of F) drawFurn(f);
      for (const d of B.doors) drawDoor(d);
      // wall front faces for depth
      for (let y = 0; y < B.MH - 1; y++) for (let x = 0; x < B.MW; x++) if (B.T[y][x] === T_WALL && B.T[y + 1][x] !== T_WALL) { rect(x * TS, y * TS + 5, TS, 3, P.G2); rect(x * TS, y * TS + 7, TS, 1, P.G1); }
    });
    staticDirty = false;
  }
  function drawTile(x, y) {
    const t = B.T[y][x], X = x * TS, Y = y * TS;
    if (t === T_GRASS) { rect(X, Y, TS, TS, P.GR); if ((x * 7 + y * 13) % 5 === 0) px(X + 3, Y + 4, P.GR2); if ((x * 3 + y * 5) % 7 === 0) px(X + 6, Y + 1, P.DG); return; }
    if (t === T_ROAD) { rect(X, Y, TS, TS, P.D2); if (y === B.MH - 2 && x % 3 === 0) rect(X, Y + 3, 5, 1, P.YE2); return; }
    if (t === T_OUT) { rect(X, Y, TS, TS, P.G3); rect(X, Y, TS, 1, P.G4); rect(X, Y, 1, TS, P.G4); return; }
    if (t === T_WALL) { rect(X, Y, TS, TS, P.G4); rect(X, Y, TS, 1, P.G5); if ((x + y) % 2) px(X + 3, Y + 3, P.G3); return; }
    if (t === T_DOOR) { rect(X, Y, TS, TS, P.G2); return; }
    const room = B.rooms[B.R[y][x]], fl = ROOM_KINDS[room.kind].floor;
    switch (fl) {
      case 'marble': rect(X, Y, TS, TS, (x + y) % 2 ? P.CR : P.G5); break;
      case 'carpet': dither(X, Y, TS, TS, P.BL, P.G2, 5); break;
      case 'carpet2': dither(X, Y, TS, TS, P.RD, P.BR, 7); break;
      case 'wood': rect(X, Y, TS, TS, P.BR2); rect(X, Y + ((x & 1) ? 3 : 7), TS, 1, P.BR); px(X + ((y * 5) % 8), Y + 1, P.BR3); break;
      case 'tile': rect(X, Y, TS, TS, P.G4); rect(X, Y, TS, 1, P.G3); rect(X, Y, 1, TS, P.G3); break;
      case 'lino': rect(X, Y, TS, TS, P.TN); if ((x + y) % 2 === 0) rect(X, Y, TS, TS, P.BR3); break;
      case 'concrete': dither(X, Y, TS, TS, P.G3, P.G2, 3); break;
    }
  }
  function drawDoor(d) {
    const X = d.x * TS, Y = d.y * TS;
    if (d.entrance) { rect(X, Y, TS, TS, P.G2); rect(X - 1, Y + 6, TS + 2, 2, P.YE2); return; }
    if (d.open) { rect(X, Y, TS, TS, P.G2); if (d.o === 'v') { rect(X, Y, 1, 2, P.BR); } else { rect(X, Y, 2, 1, P.BR); } return; }
    rect(X, Y, TS, TS, d.locked ? P.BR : P.BR2); rect(X + 1, Y + 1, TS - 2, TS - 2, d.locked ? P.BR2 : P.BR3);
    if (d.o === 'v') rect(X + 3, Y + 1, 2, TS - 2, P.BR); else rect(X + 1, Y + 3, TS - 2, 2, P.BR);
    px(X + 6, Y + 4, d.locked ? P.RD2 : P.YE);
  }
  function drawFurn(f) {
    const X = f.x * TS, Y = f.y * TS, w = f.w * TS, h = f.h * TS;
    switch (f.type) {
      case 'desk': case 'bigdesk': rect(X, Y + 1, w, h - 1, P.BR); rect(X, Y, w, h - 3, P.BR3); rect(X + 1, Y + 1, w - 2, 1, P.TN); if (!f.searched) { rect(X + 2, Y + 2, 4, 3, P.W); rect(X + 3, Y + 3, 3, 1, P.G3); } else { rect(X + 2, Y + 2, 5, 3, P.W); rect(X + w - 7, Y + 3, 4, 2, P.CR); } rect(X + w - 4, Y + 1, 2, 3, P.YE); if (f.type === 'bigdesk') { rect(X + 6, Y + 6, 6, 4, P.K); rect(X + 7, Y + 7, 4, 2, P.G1); } break;
      case 'filecab': rect(X, Y, w, h, P.G2); rect(X, Y, w, 2, P.G4); rect(X + 1, Y + 3, w - 2, 1, P.G1); rect(X + 1, Y + 6, w - 2, 1, P.G1); px(X + 3, Y + 2, P.W); if (f.searched) rect(X + 1, Y + 4, w - 2, 2, P.W); break;
      case 'safe': rect(X, Y, w, h, P.D2); rect(X, Y, w, 2, P.G2); disc(X + 4, Y + 4, 2, P.G3); px(X + 4, Y + 4, P.K); if (f.searched) rect(X, Y + 2, 2, 6, P.G4); break;
      case 'shelf': rect(X, Y, w, h, P.BR); for (let i = 0; i < w - 2; i += 2) rect(X + 1 + i, Y + 1, 1, h - 3, [P.RD, P.BL2, P.GR, P.YE2, P.CR][(i / 2 + f.x) % 5]); rect(X, Y + h - 2, w, 2, P.BR2); break;
      case 'computer': rect(X, Y + 1, w, h - 1, P.G3); rect(X, Y, w, h - 3, P.G4); rect(X + 2, Y + 1, 7, 5, P.CR); rect(X + 3, Y + 2, 5, 3, f.searched ? P.K : P.DG); if (!f.searched) { px(X + 4, Y + 3, P.GR2); px(X + 6, Y + 3, P.GR2); } rect(X + 10, Y + 3, 5, 2, P.CR); break;
      case 'sofa': rect(X, Y, w, h, P.RD); rect(X, Y, w, 3, P.BR); rect(X, Y, 2, h, P.BR); rect(X + w - 2, Y, 2, h, P.BR); break;
      case 'plant': disc(X + 4, Y + 5, 2, P.BR2); disc(X + 4, Y + 3, 3, P.GR); px(X + 3, Y + 2, P.GR2); px(X + 5, Y + 4, P.DG); break;
      case 'table': rect(X + 1, Y + 1, w - 2, h - 2, P.BR3); rect(X + 1, Y + h - 3, w - 2, 2, P.BR2); rect(X + 5, Y + 5, 3, 2, P.W); break;
      case 'crate': case 'bigcrate': rect(X, Y, w, h, P.BR3); frame(X, Y, w, h, P.BR); line(X, Y, X + w - 1, Y + h - 1, P.BR2); line(X + w - 1, Y, X, Y + h - 1, P.BR2); break;
      case 'cooler': rect(X + 1, Y + 3, 6, 5, P.W); rect(X + 2, Y, 4, 3, P.CY); break;
      case 'locker': rect(X, Y, w, h, P.OL); rect(X, Y, w, 1, P.GR3); rect(X + 3, Y + 1, 1, h - 1, P.DG); px(X + 5, Y + 4, P.G4); break;
      case 'bench': rect(X, Y + 1, w, h - 1, P.G2); rect(X, Y, w, h - 3, P.G4); for (let i = 2; i < w - 2; i += 5) { rect(X + i, Y + 1, 3, 2, [P.RD2, P.GR2, P.YE][i % 3]); } break;
      case 'copier': rect(X, Y, w, h, P.CR); rect(X + 1, Y + 1, w - 2, 3, P.G3); rect(X + 1, Y + 5, 2, 1, P.GR2); break;
    }
  }

  // ---------- people drawing ----------
  function drawPerson(p, X, Y) {
    const x = Math.round(X), y = Math.round(Y);
    if (p.state === 'dead' || p.stun > 0) {
      rect(x - 6, y - 3, 12, 4, p.torso); rect(x + 4, y - 3, 3, 4, p.skin); rect(x + 5, y - 3, 2, 1, p.hair); rect(x - 9, y - 2, 3, 2, p.legs);
      if (p.state === 'dead') { rect(x - 3, y + 1, 7, 1, P.RD); px(x + 1, y + 2, P.RD); }
      else if (p.tied) { rect(x - 2, y - 3, 1, 4, P.TN); rect(x + 1, y - 3, 1, 4, P.TN); }
      else if ((t * 3 | 0) % 2) { px(x + 3, y - 7, P.YE); px(x + 6, y - 9, P.YE); }
      return;
    }
    const d = p.face !== undefined ? p.face : faceIdx(p.dir); const ph = (p.walk * 8 | 0) % 2;
    const ox = x - 4, oy = y - 12;
    // legs
    if (d === 0 || d === 2) { rect(ox + 2, oy + 9 - (ph ? 1 : 0), 2, 3 + (ph ? 1 : 0), p.legs); rect(ox + 4, oy + 9 - (ph ? 0 : 1), 2, 3 + (ph ? 0 : 1), p.legs); }
    else { rect(ox + 3 - ph, oy + 9, 2, 3, p.legs); rect(ox + 3 + ph, oy + 9, 2, 3, p.legs); }
    // torso & arms
    if (d === 0 || d === 2) { rect(ox + 1, oy + 4, 6, 5, p.torso); rect(ox, oy + 5, 1, 4, p.torso); rect(ox + 7, oy + 5, 1, 4, p.torso); px(ox, oy + 9, p.skin); px(ox + 7, oy + 9, p.skin); if (d === 0 && p.kind !== 'guard' && p !== max) rect(ox + 3, oy + 4, 2, 3, p.vip ? P.RD : P.G1); }
    else { rect(ox + 2, oy + 4, 4, 5, p.torso); rect(ox + (d === 1 ? 3 : 4), oy + 5, 1, 4, shade(p.torso)); }
    if (p.surrender) { rect(ox - 1, oy + 1, 1, 4, p.torso); rect(ox + 8, oy + 1, 1, 4, p.torso); px(ox - 1, oy, p.skin); px(ox + 8, oy, p.skin); }
    // head
    rect(ox + 2, oy, 4, 4, d === 2 ? p.hair : p.skin);
    if (d !== 2) { rect(ox + 2, oy, 4, 1, p.hair); if (d === 1) rect(ox + 4, oy, 2, 3, p.hair); if (d === 3) rect(ox + 2, oy, 2, 3, p.hair); if (d === 0) { px(ox + 3, oy + 2, P.K); px(ox + 4, oy + 2, P.K); } }
    if (p.kind === 'guard') { rect(ox + 1, oy - 1, 6, 2, shade(p.torso)); if (d === 0) rect(ox + 2, oy + 1, 4, 1, P.K); }
    if (p === max) { rect(ox + 2, oy - 1, 4, 1, P.K); }
    // gun
    if (p.kind === 'guard' || p === max) { const gx = x + Math.cos(p.dir) * 5, gy = y - 6 + Math.sin(p.dir) * 4; line(x + Math.cos(p.dir) * 2, y - 6, gx, gy, P.K); }
  }
  const faceIdx = a => { const s = Math.sin(a), c = Math.cos(a); return Math.abs(s) > Math.abs(c) ? (s > 0 ? 0 : 2) : (c > 0 ? 3 : 1); };
  const shade = c => ({ [P.RD]: P.BR, [P.G2]: P.G1, [P.TN]: P.BR2, [P.D2]: P.K, [P.YE2]: P.BR, [P.OL]: P.DG, [P.BL]: P.NV, [P.W]: P.G4, [P.G4]: P.G3, [P.BL3]: P.BL2, [P.CR]: P.TN, [P.PK]: P.MG, [P.G1]: P.K })[c] || P.K;
  max.kind = 'max'; max.torso = P.G1; max.legs = P.K; max.skin = P.SK; max.hair = game.agent && game.agent.sex === 'f' ? P.BR2 : P.BR; max.state = 'ok'; max.stun = 0;

  // ---------- update ----------
  const scene = {
    t: 0, pauseMenu: null,
    update(dt) {
      if (this.pauseMenu) return;
      t += dt;
      if (over) { over.t += dt; return; }
      if (msgT > 0) msgT -= dt;
      // Max
      if (max.stun > 0) max.stun -= dt;
      max.hitFlash = Math.max(0, max.hitFlash - dt);
      const ax = input.axis();
      if (max.search) {
        if (ax.x || ax.y) { max.search = null; say('Interrupted.', 1); }
        else { max.search.t += dt; if ((max.search.t * 6 | 0) !== ((max.search.t - dt) * 6 | 0)) sfx.tick(); if (max.search.t >= max.search.need) { const s = max.search; max.search = null; finishSearch(s); } }
      } else if (max.stun <= 0 && (ax.x || ax.y)) {
        const l = Math.hypot(ax.x, ax.y); const sp = max.speed * (max.captive ? 0.75 : 1);
        max.dir = Math.atan2(ax.y, ax.x); moveEnt(max, ax.x / l * sp, ax.y / l * sp, dt); max.walk += dt;
      }
      max.cool -= dt;
      if (input.held('fire') && max.cool <= 0 && max.stun <= 0 && !max.search) {
        if (max.ammo > 0) { max.ammo--; max.cool = max.weapon.rate; shoot(max, max.dir, Object.assign({}, max.weapon, { spread: max.weapon.spread * (sk.combat >= 4 ? 0.5 : 1) }), true); }
        else { max.cool = 0.4; sfx.tick(); say('Out of ammunition!', 1.5); }
      }
      // captive follows
      if (max.captive) { const c = max.captive; const d = dist(c.x, c.y, max.x, max.y); if (d > 10) { const a = Math.atan2(max.y - c.y, max.x - c.x); c.dir = a; c.stun = 0; c.state = 'captive'; moveEnt(c, Math.cos(a) * 44, Math.sin(a) * 44, dt); c.walk += dt; if (d > 40) { c.x = max.x - Math.cos(max.dir) * 8; c.y = max.y - Math.sin(max.dir) * 8; } } }
      // rooms seen
      const rid = roomOf(max.x, max.y - 3); if (rid >= 0) { max.inside = true; if (!B.rooms[rid].seen) B.rooms[rid].seen = true; }
      // exit
      if (max.inside && max.y > (B.by + B.bh) * TS + 4) {
        finish('escaped');
      }
      // grenades
      for (const gr of grenades) { gr.t += dt / 0.7; const k = Math.min(1, gr.t); const nx = gr.sx + (gr.tx - gr.sx) * k, ny = gr.sy + (gr.ty - gr.sy) * k; if (opaque(Math.floor(nx / TS), Math.floor(ny / TS))) { gr.t = 1; } else { gr.x = nx; gr.y = ny; } gr.z = Math.sin(k * Math.PI) * 14; if (gr.t >= 1.3) { gr.done = true; explode(gr); } }
      for (let i = grenades.length - 1; i >= 0; i--) if (grenades[i].done) grenades.splice(i, 1);
      for (const c of clouds) { c.t -= dt; c.r = Math.min(26, c.r + dt * 20); for (const p of people) if (dist(p.x, p.y, c.x, c.y) < c.r) stunPerson(p, 8); if (dist(max.x, max.y, c.x, c.y) < c.r * 0.8 && max.stun <= 0) { max.stun = 1.5; say('Gas! Get clear!', 1.5); } }
      for (let i = clouds.length - 1; i >= 0; i--) if (clouds[i].t <= 0) clouds.splice(i, 1);
      // bullets
      for (const b of bullets) {
        for (let s = 0; s < 4 && !b.dead; s++) {
          b.x += b.vx * dt / 4; b.y += b.vy * dt / 4;
          if (solidTile(Math.floor(b.x / TS), Math.floor(b.y / TS), true)) { b.dead = true; fx.push({ k: 'spark', x: b.x, y: b.y, t: 0.12 }); break; }
          if (b.friendly) { for (const p of people) { if (p.state === 'dead' || (p.stun > 0 && rnd() < 0.5)) continue; if (Math.abs(p.x - b.x) < 4 && b.y > p.y - 12 && b.y < p.y) { b.dead = true; hurtPerson(p, b.dmg); fx.push({ k: 'hit', x: b.x, y: b.y, t: 0.15 }); break; } } }
          else if (Math.abs(max.x - b.x) < 4 && b.y > max.y - 12 && b.y < max.y) { b.dead = true; hurtMax(1); fx.push({ k: 'hit', x: b.x, y: b.y, t: 0.15 }); }
        }
        b.life -= dt; if (b.life <= 0) b.dead = true;
      }
      for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].dead) bullets.splice(i, 1);
      for (const f of fx) f.t -= dt; for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t <= 0) fx.splice(i, 1);
      // people AI
      for (const p of people) ai(p, dt);
      // alarm clock
      if (alarm) {
        alarmT += dt; police -= dt; if ((alarmT % 2.4) < dt) sfx.alarm();
        reinf -= dt; if (reinf <= 0 && reinfLeft > 0) { reinf = 10; reinfLeft--; const g2 = addPerson('guard', B.lobby, { state: 'hunt' }); g2.x = B.entrance.x * TS + 4; g2.y = (B.entrance.y + 1) * TS + 4; say('Reinforcements at the entrance!', 2); }
        if (police <= 0) finish('police');
      }
      if (staticDirty) renderStatic();
    },
  };
  function ai(p, dt) {
    if (p.state === 'dead' || p.tied || p === max.captive) return;
    if (p.stun > 0) { p.stun -= dt; if (p.stun <= 0 && p.kind === 'guard') { p.state = alarm ? 'hunt' : 'investigate'; p.target = [max.x, max.y]; } return; }
    const seesMax = max.hp > 0 && canSee(p, max.x, max.y - 5, p.kind === 'guard' ? 95 : 70);
    const walkTo = (tx, ty, sp) => {
      p.pathT -= dt; if (!p.path || p.pathT <= 0) { p.path = pathTo(p.x, p.y, tx, ty); p.pathT = 0.6; }
      if (!p.path || !p.path.length) return true;
      const [nx, ny] = p.path[0]; const d = dist(p.x, p.y, nx, ny); if (d < 2) { p.path.shift(); return !p.path.length; }
      const a = Math.atan2(ny - p.y, nx - p.x); p.dir = a; moveEnt(p, Math.cos(a) * sp, Math.sin(a) * sp, dt); p.walk += dt; return false;
    };
    if (p.kind === 'civ') {
      if (p.surrender) return;
      if (seesMax && p.state !== 'flee') { p.state = 'flee'; p.alertT = 0; sfx.tone(1200, 0.25, 'triangle', 0.04, 400); noise(p.x, p.y, 90); }
      if (p.state === 'flee') {
        p.alertT += dt; if (p.alertT > 4 && !p.vip) raiseAlarm('A civilian reached a panic button.'); if (p.vip && p.alertT > 6) raiseAlarm(p.vip.code + ' triggered the alarm.');
        const a = Math.atan2(p.y - max.y, p.x - max.x) + Math.sin(t * 2 + p.x) * 0.6; p.dir = a; moveEnt(p, Math.cos(a) * 30, Math.sin(a) * 30, dt); p.walk += dt;
      } else { p.turnT -= dt; if (p.turnT <= 0) { p.turnT = 2 + rnd() * 4; p.dir = rnd() * Math.PI * 2; } }
      return;
    }
    // guards
    if (seesMax) {
      p.seeT += dt; p.lastSeen = [max.x, max.y];
      if (p.seeT > (alarm ? 0 : 0.45)) { if (p.state !== 'attack') { p.state = 'attack'; p.alertT = 0; sfx.tone(700, 0.08, 'square', 0.05); } }
    } else p.seeT = Math.max(0, p.seeT - dt);
    switch (p.state) {
      case 'idle': if (p.idleT !== undefined) { p.idleT -= dt; if (p.idleT <= 0) { p.idleT = undefined; p.state = 'patrol'; } } p.turnT -= dt; if (p.turnT <= 0) { p.turnT = 2 + rnd() * 3; p.dir += (rnd() < 0.5 ? -1 : 1) * Math.PI / 2; } break;
      case 'patrol': {
        if (!p.wp) { const r = rnd() < 0.7 ? B.rooms[p.home] : pick(B.rooms); p.wp = spot(r); p.path = null; }
        if (walkTo(p.wp[0], p.wp[1], 20)) { p.wp = null; p.state = rnd() < 0.3 ? 'idle' : 'patrol'; p.turnT = 2; p.idleT = 4; }
        break; }
      case 'investigate': if (!p.target || walkTo(p.target[0], p.target[1], 30)) { p.state = 'patrol'; p.target = null; p.wp = null; } break;
      case 'hunt': if (walkTo(max.x, max.y, 34)) { if (!alarm) p.state = 'patrol'; else p.path = null; } break;
      case 'attack': {
        p.alertT += dt; if (p.alertT > 2.2 && !alarm) raiseAlarm('A guard has spotted you.');
        if (seesMax) {
          p.dir = Math.atan2(max.y - p.y, max.x - p.x); p.cool -= dt;
          const d = dist(p.x, p.y, max.x, max.y);
          if (d > 45) moveEnt(p, Math.cos(p.dir) * 22, Math.sin(p.dir) * 22, dt), p.walk += dt;
          if (p.cool <= 0) { p.cool = Math.max(0.5, 1.4 - level * 0.12) + rnd() * 0.6; shoot(p, p.dir, { speed: 200, spread: Math.max(0.04, 0.16 - level * 0.015 + (sk.combat >= 4 ? 0.04 : 0)), dmg: 1, noise: 150 }, false); }
        } else if (p.lastSeen) { if (walkTo(p.lastSeen[0], p.lastSeen[1], 34)) { p.state = alarm ? 'hunt' : 'investigate'; p.target = [max.x, max.y]; } }
        break; }
    }
  }

  // ---------- draw ----------
  scene.draw = function () {
    if (staticDirty) renderStatic();
    const camX = clamp(max.x - W / 2, 0, Math.max(0, MWpx - W)), camY = clamp(max.y - VIEW_H / 2 - 6, 0, Math.max(0, MHpx - VIEW_H));
    rect(0, 0, W, H, P.K);
    g.save(); g.beginPath(); g.rect(0, 0, W, VIEW_H); g.clip(); g.translate(-Math.round(camX), -Math.round(camY));
    g.drawImage(staticCv, 0, 0);
    // fog over unseen rooms
    for (const r of B.rooms) if (!r.seen) { rect(r.x * TS, r.y * TS, r.w * TS, r.h * TS, P.K); dither(r.x * TS, r.y * TS, r.w * TS, r.h * TS, P.K, P.D2, 2); }
    // search highlight
    const f = !max.search && nearestSearchable(); if (f && !f.searched && (t * 3 | 0) % 2) frame(f.x * TS - 1, f.y * TS - 1, f.w * TS + 2, f.h * TS + 2, P.YE);
    // clouds under people
    for (const c of clouds) { g.save(); g.globalAlpha = Math.min(1, c.t / 2) * 0.8; dither(c.x - c.r, c.y - c.r * 0.7, c.r * 2, c.r * 1.4, 'rgba(0,0,0,0)', P.GR2, 5 + ((t * 8 | 0) % 3)); g.restore(); }
    // people, sorted by y
    const vis = people.filter(p => p.state === 'dead' || p === max.captive || roomOf(p.x, p.y - 3) === roomOf(max.x, max.y - 3) || los(max.x, max.y - 5, p.x, p.y - 5) || dist(p.x, p.y, max.x, max.y) < 20);
    const all = vis.concat([max]).sort((a, b) => a.y - b.y);
    for (const p of all) {
      if (p !== max && p.kind === 'guard' && (p.state === 'attack' || p.state === 'hunt') && p.stun <= 0 && p.state !== 'dead') { rect(p.x - 1, p.y - 18, 2, 3, P.RD2); px(p.x - 1 + 0.5, p.y - 14, P.RD2); }
      if (p.vip && p.state !== 'dead') { const b = (t * 2 | 0) % 2; if (b) { rect(p.x - 3, p.y - 19, 7, 5, P.YE); text('!', p.x - 0.5, p.y - 20, P.K); } }
      if (p === max && max.hitFlash > 0 && (t * 20 | 0) % 2) continue;
      drawPerson(p, p.x, p.y);
    }
    for (const b of bullets) { rect(b.x, b.y, 1, 1, P.YE); px(b.x - b.vx * 0.008, b.y - b.vy * 0.008, P.OR); }
    for (const gr of grenades) { px(gr.x, gr.y + 3, P.K); rect(gr.x - 1, gr.y - gr.z - 1, 3, 3, GREN[gr.type].col); }
    for (const e of fx) {
      if (e.k === 'flash') { rect(e.x - 1, e.y - 1, 3, 3, P.YE); px(e.x, e.y, P.W); }
      else if (e.k === 'spark') { px(e.x, e.y, P.W); px(e.x + 1, e.y - 1, P.YE); }
      else if (e.k === 'hit') { px(e.x, e.y, P.RD2); px(e.x - 1, e.y + 1, P.RD); }
      else if (e.k === 'boom') { const k = 1 - e.t / 0.5; const r = e.r * (0.4 + k); disc(e.x, e.y, r, e.type === 'frag' ? P.OR : P.W); disc(e.x, e.y, r * 0.6, P.YE); if (k > 0.5) dither(e.x - r, e.y - r, r * 2, r * 2, 'rgba(0,0,0,0)', P.G3, 6); }
    }
    // search progress
    if (max.search) { const k = max.search.t / max.search.need; rect(max.x - 8, max.y - 20, 16, 3, P.K); rect(max.x - 8, max.y - 20, 16 * k, 3, P.GR2); }
    g.restore();
    if (max.stun > 0) dither(0, 0, W, VIEW_H, 'rgba(0,0,0,0)', P.W, 3);
    drawStatus();
    if (msgT > 0 || over) { const m = over ? '' : msg; if (m) { const ls = wrap(m, 300); rect(0, VIEW_H - 2 - ls.length * 9, W, ls.length * 9 + 2, 'rgba(0,0,0,0.7)'); ls.forEach((l, i) => text(l, 10, VIEW_H - ls.length * 9 + i * 9, P.YE)); } }
    if (over) drawOver();
    if (this.pauseMenu) { rect(90, 50, 140, 70, P.K); panel(90, 50, 140, 70); textC('MISSION PAUSED', W / 2, 60, P.YE); this.pauseMenu.draw(); }
  };
  function drawStatus() {
    const y = VIEW_H; rect(0, y, W, H - y, P.K); bevel(0, y, W, H - y, P.G2, P.G4, P.G1); rect(3, y + 3, W - 6, H - y - 6, P.D2);
    // health
    text('HEALTH', 7, y + 5, P.G4); for (let i = 0; i < max.maxHp; i++) rect(7 + i * 7, y + 14, 5, 5, i < max.hp ? P.RD2 : P.G1);
    text(max.weapon.name, 58, y + 5, P.W); text('Ammo ' + max.ammo, 58, y + 14, max.ammo ? P.CY : P.RD2);
    const gs = Object.keys(GREN); let gx = 124; gs.forEach(k => { const sel = k === max.gtype; rect(gx, y + 5, 36, 18, sel ? P.BL : P.D2); if (sel) frame(gx, y + 5, 36, 18, P.YE); rect(gx + 3, y + 9, 3, 3, GREN[k].col); text(GREN[k].name, gx + 8, y + 7, sel ? P.YE : P.G4); text('x' + max.gren[k], gx + 8, y + 15, max.gren[k] ? P.W : P.G2); gx += 38; });
    text('Clues ' + clues.length, 7, y + 22, P.YE2); if (max.keys) text('Key', 40, y + 22, P.YE);
    if (max.captive) text('Captive!', 58, y + 22, P.GR2);
    // minimap
    const mx = 244, my = y + 4, sc = Math.min(72 / B.bw, 24 / B.bh);
    rect(mx - 1, my - 1, B.bw * sc + 2, B.bh * sc + 2, P.K);
    for (const r of B.rooms) if (r.seen) rect(mx + (r.x - B.bx) * sc, my + (r.y - B.by) * sc, r.w * sc, r.h * sc, r === B.exec ? P.BR2 : P.G2);
    px(mx + (B.entrance.x - B.bx) * sc, my + (B.entrance.y - B.by) * sc, P.GR2);
    if ((t * 4 | 0) % 2) rect(mx + (max.x / TS - B.bx) * sc - 1, my + (max.y / TS - B.by) * sc - 1, 2, 2, P.YE);
    if (alarm) { const on = (t * 3 | 0) % 2; rect(160, y - 11, 80, 10, on ? P.RD : P.K); textC('ALARM  ' + Math.max(0, Math.ceil(police)), 200, y - 10, on ? P.W : P.RD2); }
  }
  function drawOver() {
    const k = over.kind, lines = { escaped: ['YOU GOT OUT', P.GR2], dead: ['YOU WERE OVERPOWERED', P.RD2], police: ['THE POLICE HAVE ARRIVED', P.RD2], abort: ['MISSION ABORTED', P.YE] }[k];
    panel(40, 30, W - 80, 110); textC(lines[0], W / 2, 40, lines[1]);
    let yy = 54; text('Clues found: ' + clues.filter(c => c !== 'Documents of no value').length, 54, yy, P.W); yy += 10;
    text(target ? (max.captive && k === 'escaped' ? 'Captured: ' + target.vip.code : target.state === 'dead' ? target.vip.code + ' was killed' : target.vip.code + ' was not taken') : 'No suspect in the building', 54, yy, P.W); yy += 10;
    text('Guards down: ' + kills.guard + '   Civilians killed: ' + kills.civ, 54, yy, kills.civ ? P.RD2 : P.W); yy += 12;
    para(k === 'escaped' ? 'Clean getaway.' : k === 'dead' ? 'You wake up in a hospital two days later. Whatever you carried is gone.' : k === 'police' ? 'You are held for questioning until the embassy gets you out. It costs you a day.' : 'You slip away before anyone notices.', 54, yy, W - 110, P.G4);
    if (over.t > 1 && (over.t * 2 | 0) % 2) textC('Press OK', W / 2, 128, P.G4);
  }
  function end() {
    const k = over.kind;
    const res = { kind: k, success: k === 'escaped', clues: k === 'dead' ? [] : clues, captured: k === 'escaped' && max.captive ? max.captive.vip : null, killedTarget: target && target.state === 'dead' ? target.vip : null, kills };
    done(res);
  }
  scene.onKey = function (k) {
    if (over) { if (over.t > 0.8 && (k === 'select' || k === 'fire' || k === 'action' || k === 'menu')) end(); return; }
    if (this.pauseMenu) { if (k === 'menu') this.pauseMenu = null; else this.pauseMenu.key(k); return; }
    if (k === 'menu') { this.pauseMenu = Menu([{ label: 'Continue', go: () => { this.pauseMenu = null; } }, { label: 'Sound on / off', go: () => sfx.toggle() }, { label: 'Abort mission', go: () => { this.pauseMenu = null; finish('abort'); } }], 110, 76, 100, 12); return; }
    if (max.stun > 0) return;
    if (k === 'action' || k === 'select') action();
    if (k === 'alt') throwGrenade();
    if (k === 'alt2') { const ks = Object.keys(GREN); max.gtype = ks[(ks.indexOf(max.gtype) + 1) % ks.length]; sfx.blip(); }
  };
  scene.onTap = function (x, y) {
    if (over) { if (over.t > 0.8) end(); return; }
    if (this.pauseMenu) { this.pauseMenu.tap(x, y); return; }
    if (y > VIEW_H && x > 122 && x < 238) { const ks = Object.keys(GREN); const i = Math.floor((x - 124) / 38); if (ks[i]) { max.gtype = ks[i]; sfx.blip(); } return; }
    // tap in the world: face that way
    const camX = clamp(max.x - W / 2, 0, Math.max(0, MWpx - W)), camY = clamp(max.y - VIEW_H / 2 - 6, 0, Math.max(0, MHpx - VIEW_H));
    if (y < VIEW_H) max.dir = Math.atan2(y + camY - (max.y - 5), x + camX - max.x);
  };
  renderStatic();
  scene.dbg = { max, people, B, F, raiseAlarm };
  return scene;
}

// ---------- equipment selection ----------
function loadoutScene(brief, start, back) {
  const sk = game.agent ? game.agent.skills : { combat: 2 };
  const wk = ['pistol', 'smg', 'shotgun'], gk = [['Stun pack', { stun: 3, gas: 0, frag: 0 }], ['Gas pack', { stun: 1, gas: 2, frag: 0 }], ['Assault pack', { stun: 1, gas: 0, frag: 2 }], ['Mixed pack', { stun: 1, gas: 1, frag: 1 }]];
  let wi = 0, gi = 3, armor = sk.combat >= 4, row = 0;
  const rows = 4;
  function change(d) {
    if (row === 0) wi = (wi + d + 3) % 3; else if (row === 1) gi = (gi + d + 4) % 4; else if (row === 2) armor = !armor;
    sfx.blip();
  }
  const go_ = () => start({ weapon: wk[wi], grenades: Object.assign({}, gk[gi][1]), armor });
  return {
    t: 0, update(dt) { this.t += dt; },
    onKey(k) { if (k === 'up') { row = (row + rows - 1) % rows; sfx.blip(); } else if (k === 'down') { row = (row + 1) % rows; sfx.blip(); } else if (k === 'left') change(-1); else if (k === 'right') change(1); else if (k === 'select' || k === 'fire') { if (row === 3) { sfx.select(); go_(); } else change(1); } else if (k === 'menu') back(); },
    onTap(x, y) { const r = Math.floor((y - 104) / 16); if (r >= 0 && r < 3) { row = r; change(x < 160 ? -1 : 1); } else if (y > 160 && y < 180) { if (x > 160) go_(); else back(); } },
    draw() {
      rect(0, 0, W, H, P.K); dither(0, 0, W, H, P.K, P.D2, 4);
      panel(6, 6, W - 12, 88); text('MISSION BRIEFING', 16, 14, P.YE); para(brief, 16, 25, W - 32, P.G5, 9);
      panel(6, 96, W - 12, 98);
      const W0 = WEAPONS[wk[wi]];
      const lines = [['Weapon', W0.name, W0 === WEAPONS.pistol ? 'quiet, accurate' : W0 === WEAPONS.smg ? 'rapid fire, loud' : 'spread shot, very loud'], ['Grenades', gk[gi][0], Object.entries(gk[gi][1]).filter(([, n]) => n).map(([k, n]) => n + ' ' + k).join(', ')], ['Body armour', armor ? 'Yes' : 'No', armor ? '+2 hits, slower' : 'faster on your feet']];
      lines.forEach(([k, v, d], i) => { const y = 106 + i * 16; if (row === i) rect(12, y - 2, W - 24, 14, P.BL); text(k, 18, y + 2, P.G4); text('◀ ' + v + ' ▶', 100, y + 2, row === i ? P.YE : P.W); text(d, 200, y + 2, P.G3); });
      bevel(18, 164, 90, 14, P.G2, P.G4, P.G1); textC('Back out', 63, 167, P.W);
      bevel(W - 128, 164, 110, 14, row === 3 ? P.BL2 : P.BL, P.BL3, P.NV); textC('Go in  ▶', W - 73, 167, P.YE);
      text('Up/down choose, left/right change, OK to enter.', 18, 182, P.G3);
    },
  };
}
