// ===================================================================
// CAR CHASE: City Map (left), Windshield + dashboard (top right),
// City Close-Up (bottom right). Tail the suspect, or ram him head-on.
// ===================================================================
const CARS = [
  { name: 'Sedan', speed: 60, handling: 'Fair', consp: 'Moderate', tracking: false, col: P.G3 },
  { name: 'Sports car', speed: 80, handling: 'Fair', consp: 'High', tracking: true, col: P.RD2 },
  { name: 'Old truck', speed: 40, handling: 'Fair', consp: 'Low', tracking: false, col: P.BR },
  { name: 'Van', speed: 40, handling: 'Excellent', consp: 'Moderate', tracking: true, col: P.W },
  { name: 'Coupe', speed: 80, handling: 'Excellent', consp: 'Extreme', tracking: false, col: P.YE },
];
const CONSP = { Low: 0.6, Moderate: 1, High: 1.5, Extreme: 2.2 };
function carSelectScene(start) {
  const picks = []; let sel = 0;
  const choose = () => { if (picks.includes(sel)) { picks.splice(picks.indexOf(sel), 1); sfx.blip(); return; } picks.push(sel); sfx.select(); if (picks.length === 2) start(picks.map(i => CARS[i])); };
  return {
    t: 0, update(dt) { this.t += dt; },
    onKey(k) { if (k === 'left' || k === 'up') { sel = (sel + CARS.length - 1) % CARS.length; sfx.blip(); } else if (k === 'right' || k === 'down') { sel = (sel + 1) % CARS.length; sfx.blip(); } else if (k === 'select' || k === 'fire') choose(); },
    onTap(x, y) { const i = Math.floor((x - 4) / 63); if (y > 30 && y < 170 && i >= 0 && i < CARS.length) { sel = i; choose(); } },
    draw() {
      rect(0, 0, W, H, P.K); textC('Chase Cars', W / 2, 6, P.W); rect(W / 2 - 26, 15, 52, 1, P.W); textC('Choose two cars. The suspect is pulling away...', W / 2, 20, P.G3);
      CARS.forEach((c, i) => {
        const x = 4 + i * 63, y = 32, on = i === sel, taken = picks.includes(i);
        rect(x, y, 60, 136, on ? P.BL2 : P.BL); frame(x, y, 60, 136, taken ? P.YE : P.W);
        // the car, side view
        rect(x + 8, y + 26, 44, 10, c.col); rect(x + 16, y + 18, 24, 9, c.col); rect(x + 18, y + 20, 9, 6, P.CY); rect(x + 29, y + 20, 9, 6, P.CY); disc(x + 17, y + 37, 4, P.K); disc(x + 43, y + 37, 4, P.K); disc(x + 17, y + 37, 1, P.G3); disc(x + 43, y + 37, 1, P.G3);
        if (c.name === 'Old truck') { rect(x + 30, y + 16, 22, 10, P.BR); } if (c.name === 'Van') { rect(x + 12, y + 14, 38, 13, c.col); rect(x + 40, y + 16, 8, 7, P.CY); }
        textC(c.name, x + 30, y + 48, P.W);
        text('Max. Speed', x + 4, y + 62, P.G3); text(c.speed + ' mph', x + 8, y + 71, P.YE);
        text('Handling', x + 4, y + 83, P.G3); text(c.handling, x + 8, y + 92, P.YE);
        text('Conspicuous', x + 4, y + 104, P.G3); text(c.consp, x + 8, y + 113, P.YE);
        text(c.tracking ? '(Tracking)' : '', x + 4, y + 125, P.CY);
        if (taken) textC('#' + (picks.indexOf(i) + 1), x + 30, y + 4, P.YE);
      });
      text('Arrows choose, Enter picks.', 8, 184, P.G1);
    },
  };
}

function chaseScene(opts, done) {
  const sk = skillLevel('driving'), level = opts.level || 0;
  const N = 16, SP = 12, MX = 4, MY = 4; // 16x16 intersections, 12px blocks
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
  const mph2px = v => v * 0.16;
  function mk(i, j, kind, col, speed) { const nb = nbrs(i, j); const [a, b] = pick(nb); const c = { a: [i, j], b: [a, b], s: 0, v: 0, target: mph2px(speed), kind, col, order: null, stopped: false, seen: false, susp: 0 }; cars.push(c); return c; }
  const len = () => SP;
  const pos = c => { const [ax, ay] = nodeXY(...c.a), [bx, by] = nodeXY(...c.b); const k = c.s / SP; const dx = Math.sign(bx - ax), dy = Math.sign(by - ay); return [ax + (bx - ax) * k - dy, ay + (by - ay) * k + dx, dx, dy]; };
  function route(from, to) { const key = n => n[0] + ',' + n[1]; const D = new Map([[key(from), 0]]), prev = new Map(); const q = [[0, from]]; while (q.length) { q.sort((a, b) => a[0] - b[0]); const [d, n] = q.shift(); if (key(n) === key(to)) break; for (const m of nbrs(...n)) { const nd = d + 1 + rnd() * 0.6; if (nd < (D.get(key(m)) ?? 1e9)) { D.set(key(m), nd); prev.set(key(m), n); q.push([nd, m]); } } } const out = []; let n = to; while (n && key(n) !== key(from)) { out.unshift(n); n = prev.get(key(n)); } return out; }
  const start = [ri(4, N - 5), ri(4, N - 5)];
  let dest; do { dest = [ri(0, N - 1), ri(0, N - 1)]; } while (Math.abs(dest[0] - start[0]) + Math.abs(dest[1] - start[1]) < 12);
  labels.push({ name: '', i: dest[0], j: dest[1], dest: true });
  const sus = mk(start[0], start[1], 'suspect', P.GR2, 40 + level * 5); sus.route = route(start, dest); sus.b = sus.route.shift(); sus.a = start.slice(); sus.path = [start.slice()];
  const mine = opts.cars.map((cd, n) => { const c = mk(start[0], start[1], 'agent', n ? P.MG : P.CY, cd.speed); c.def = cd; c.n = n + 1; c.follow = true; c.a = start.slice(); c.b = sus.b.slice(); c.s = -8 - n * 10; c.wait = 2 + n * 2; c.target = mph2px(40); return c; });
  for (let n = 0; n < 14; n++) mk(ri(0, N - 1), ri(0, N - 1), 'civ', pick([P.G3, P.W, P.BR, P.YE, P.RD, P.BL2]), 30 + rnd() * 20).target = mph2px(25 + rnd() * 20);
  let ctrl = 0, t = 0, over = null, aware = false, arrivedT = -1, lostT = 0, prompt = 0, msg = 'The suspect pulls away. Both your cars are following (F).', msgT = 4, lastSeen = null;
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
    } else if (c.kind === 'civ') { const ahead = opts2.filter(n => !(n[0] === back[0] && n[1] === back[1])); next = pick(ahead.length ? ahead : opts2); }
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
  function finish(kind) { if (over) return; over = { kind, t: 0 }; (kind === 'followed' || kind === 'arrest') ? sfx.success() : sfx.fail(); }
  const scene = {
    update(dt) {
      t += dt; if (msgT > 0) msgT -= dt; if (over) { over.t += dt; return; }
      for (const c of cars) {
        if (c.wait) { c.wait -= dt; if (c.wait <= 0) c.wait = 0; else continue; }
        if (c.stopped) { if (c.kind === 'agent' && (c.order || c.follow)) atNode(c); continue; }
        let tg = c.target; if (c === sus && aware) tg = mph2px(70);
        const a = ahead(c); if (a) { const [o, d] = a; if (d < 6) tg = Math.min(tg, o.v); if (d < 3.5) tg = 0; }
        c.v += (tg - c.v) * Math.min(1, dt * 2.5); c.s += c.v * dt; if (c.s >= SP) { c.s = SP; atNode(c); }
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
      if (k === 'action' || k === 'select') { if (prompt > 0 && headOn(c)) finish('arrest'); else if (prompt > 0 && mine.some(headOn)) finish('arrest'); else { aware = aware || rnd() < 0.5; msg = 'Nothing to grab. That probably tipped him off.'; msgT = 2; } }
      if (k === 'alt') { c.follow = true; c.order = null; msg = 'Car #' + c.n + ' resumes following.'; msgT = 1.5; sfx.tick(); }
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
      // ---- city map ----
      rect(0, 0, 198, 200, P.BL); rect(1, 1, 196, 196, P.G1);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const [x, y] = nodeXY(i, j); if (i < N - 1 && !has(i, j, i + 1, j)) rect(x + 1, y - 1, SP - 2, 3, P.G1); }
      for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) { const [x, y] = nodeXY(i, j); rect(x + 2, y + 2, SP - 3, SP - 3, P.K); }
      // streets are the lighter channels
      for (const k of edge) { const [i, j, d] = k.split(',').map(Number); const [x, y] = nodeXY(i, j); if (d === 0) rect(x - 1, y - 1, SP + 3, 3, P.G3); else rect(x - 1, y - 1, 3, SP + 3, P.G3); }
      for (const l of labels) { if (l.dest && !over && arrivedT < 0) continue; const [x, y] = nodeXY(l.i, l.j); rect(x - 1, y - 1, 3, 3, l.dest ? P.YE : P.W); if (l.name) text(l.name, x + 3, y - 4, P.W, P.K); }
      for (const c of cars) {
        if (c === sus) continue; if (c.wait) continue; const [x, y] = pos(c);
        if (c.kind === 'agent') { const on = c === me(); if (!on || (t * 4 | 0) % 2) rect(x - 1, y - 1, 3, 3, c.col); text(String(c.n), x + 3, y - 3, c.col); }
        else rect(x - 1, y - 1, 2, 2, c.col);
      }
      const seenNow = mine.some(m => m.seen);
      if (seenNow) { const [x, y] = pos(sus); rect(x - 1, y - 1, 3, 3, (t * 6 | 0) % 2 ? P.GR2 : P.W); } else if (lastSeen) rect(lastSeen[0] - 1, lastSeen[1] - 1, 3, 3, P.GR);
      // ---- windshield ----
      drawWindshield(200, 0, 120, 98);
      // ---- close-up ----
      drawCloseUp(200, 100, 120, 100);
      if (msgT > 0 && !over) { const ls = wrap(msg, 190); rect(0, 0, 198, ls.length * 9 + 2, P.K); ls.forEach((l, i) => text(l, 4, 1 + i * 9, P.YE)); }
      if (prompt > 0 && !over && (t * 6 | 0) % 2) { msgBox(10, 86, 180, 18); textC('Press F1 now to make arrest', 100, 91, P.YE); }
      if (over) { msgBox(12, 60, 176, 70); const [h, c] = { followed: ['DESTINATION FOUND', P.GR2], arrest: ['ARREST!', P.GR2], lost: ['YOU LOST HIM', P.RD2], late: ['TOO LATE', P.RD2], abort: ['CHASE ABANDONED', P.YE] }[over.kind]; textC(h, 100, 68, c); para({ followed: 'He parks and goes inside. You note the address.', arrest: 'You cut him off head-on and drag him out of the car.', lost: 'The car disappears into the city.', late: 'By the time you get there the car is empty.', abort: 'You give up the chase.' }[over.kind], 22, 82, 156, P.W, 9); if (over.t > 0.6) textC('Press a key', 100, 118, P.G3); }
    },
  };
  function drawWindshield(x, y, w, h) {
    const c = me(); const [mx, my, dx, dy] = pos(c);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    rect(x, y, w, 56, night ? P.K : P.CY); rect(x, y + 30, w, 26, night ? P.K : P.BL2);
    // buildings along the street, receding
    for (let k = 5; k >= 0; k--) { const f = 1 / (1 + k * 0.7); const bw = 40 * f, top = y + 34 - 34 * f, bot = y + 34 + 18 * f; const cols = [P.RD, P.G3, P.BR, P.BL, P.W, P.RD2]; const cl = cols[(Math.floor(mx / SP) * 3 + Math.floor(my / SP) * 5 + k) % 6]; rect(x + w / 2 - 12 * f - bw, top, bw, bot - top, cl); rect(x + w / 2 + 12 * f, top, bw, bot - top, cols[(k * 7 + Math.floor(mx)) % 6]); for (let wy = top + 3; wy < bot - 3; wy += 5 * f + 2) { rect(x + w / 2 - 12 * f - bw + 2, wy, bw - 4, Math.max(1, 2 * f), night ? P.YE : P.K); rect(x + w / 2 + 12 * f + 2, wy, bw - 4, Math.max(1, 2 * f), night ? P.YE : P.K); } }
    g.fillStyle = P.G1; g.beginPath(); g.moveTo(x + w / 2 - 4, y + 34); g.lineTo(x + w / 2 + 4, y + 34); g.lineTo(x + w - 6, y + 56); g.lineTo(x + 6, y + 56); g.fill();
    for (let k = 0; k < 5; k++) { const yy = y + 36 + k * 4 + ((t * c.v) % 4); rect(x + w / 2 - 1, yy, 2, 2, P.YE); }
    // the suspect's car, if he is ahead of us in this street
    if (c.seen) { const [sx, sy] = pos(sus); const d = dist(sx, sy, mx, my); const ahead_ = (sx - mx) * dx + (sy - my) * dy > 0; if (ahead_) { const f = Math.max(0.25, 1 - d / (sight * SP)); const cw = 30 * f, ch = 14 * f, cy = y + 34 + 18 * f; rect(x + w / 2 - cw / 2, cy - ch, cw, ch, P.GR2); rect(x + w / 2 - cw / 2 + 2, cy - ch * 0.6, cw - 4, ch * 0.3, P.W); rect(x + w / 2 - cw / 2, cy - ch * 0.3, cw * 0.2, ch * 0.2, P.RD2); rect(x + w / 2 + cw * 0.3, cy - ch * 0.3, cw * 0.2, ch * 0.2, P.RD2); } }
    // dashboard
    rect(x, y + 56, w, 42, P.BL); g.fillStyle = P.K; g.beginPath(); g.ellipse(x + 40, y + 76, 26, 18, 0, Math.PI, 0); g.fill();
    textC(String(Math.round(c.v / 0.16 / 5) * 5), x + 40, y + 65, P.W);
    frame(x + 16, y + 80, 48, 16, P.K); rect(x + 32, y + 84, 16, 8, P.G1); // wheel
    const susLights = Math.min(5, Math.floor(c.susp / 20)); for (let i = 0; i < 5; i++) rect(x + 72 + i * 8, y + 60, 6, 4, i < susLights ? ((c.susp > 80 && (t * 6 | 0) % 2) ? P.K : P.RD2) : P.G1);
    if (c.follow && (t * 2 | 0) % 2) text('F', x + 72, y + 68, P.YE);
    if (c.order) text({ '0,-1': '▲', '0,1': '▼', '-1,0': '◀', '1,0': '▶' }[c.order.join(',')], x + 84, y + 68, P.GR2);
    if (c.def.tracking) { const [sx, sy] = pos(sus); const a = Math.atan2(sy - my, sx - mx); if ((t * 3 | 0) % 2) text(Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? (Math.cos(a) > 0 ? '▶' : '◀') : (Math.sin(a) > 0 ? '▼' : '▲'), x + 96, y + 68, P.YE); }
    const hh = hourOf(game.t || 0); rect(x + 72, y + 80, 44, 11, P.K); text((hh % 12 || 12) + ':' + String(Math.floor(t / 60 * 5) % 60).padStart(2, '0') + ':' + String(Math.floor(t * 5) % 60).padStart(2, '0'), x + 74, y + 82, P.G3);
    text('#' + c.n, x + 2, y + 58, P.W); text('- +', x + 44, y + 58, P.G3);
    g.restore(); frame(x, y, w, h, P.W);
  }
  function drawCloseUp(x, y, w, h) {
    const c = me(); const [mx, my] = pos(c); const Z = 4;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    rect(x, y, w, h, P.G1);
    const ox = x + w / 2 - mx * Z, oy = y + h / 2 - my * Z;
    for (let j = -1; j < N; j++) for (let i = -1; i < N; i++) {
      const [bx, by] = nodeXY(i, j); const X = ox + (bx + 2) * Z, Y = oy + (by + 2) * Z, S = (SP - 3) * Z; if (X > x + w || Y > y + h || X + S < x || Y + S < y) continue;
      const s = ((i + 3) * 31 + (j + 5) * 17) % 7;
      const roof = [P.RD, P.G3, P.BL2, P.W, P.GR, P.MG, P.BR][s]; rect(X, Y, S, S, roof); frame(X + 3, Y + 3, S - 6, S - 6, P.K); frame(X + 6, Y + 6, S - 12, S - 12, [P.YE, P.CY, P.W, P.PK][s % 4]); rect(X + S / 2 - 3, Y + S / 2 - 3, 6, 6, P.K);
    }
    for (const k of edge) { const [i, j, d] = k.split(',').map(Number); const [bx, by] = nodeXY(i, j); if (d === 0) { rect(ox + (bx - 1) * Z, oy + (by - 1) * Z, (SP + 3) * Z, 3 * Z, P.G1); for (let q = 0; q < SP * Z; q += 6) rect(ox + bx * Z + q, oy + by * Z + 1, 3, 1, P.YE); } else { rect(ox + (bx - 1) * Z, oy + (by - 1) * Z, 3 * Z, (SP + 3) * Z, P.G1); for (let q = 0; q < SP * Z; q += 6) rect(ox + bx * Z + 1, oy + by * Z + q, 1, 3, P.YE); } }
    for (const o of cars) { if (o.wait) continue; if (o === sus && !mine.some(m => m.seen)) continue; const [px_, py, dx, dy] = pos(o); const X = ox + px_ * Z, Y = oy + py * Z; const hor = dx !== 0; rect(X - (hor ? 4 : 2), Y - (hor ? 2 : 4), hor ? 8 : 4, hor ? 4 : 8, o === sus ? P.GR2 : o.col); if (o === c && (t * 4 | 0) % 2) frame(X - 6, Y - 6, 12, 12, P.W); }
    g.restore(); frame(x, y, w, h, P.W);
  }
  return scene;
}
