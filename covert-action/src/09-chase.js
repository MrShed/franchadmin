// ===================================================================
// CAR TAIL: follow the suspect across the city without being made
// ===================================================================
function chaseScene(opts, done) {
  const sk = game.agent ? game.agent.skills.driving : 2, level = opts.level || 1;
  const VH = 168, NX = 8, NY = 6, X0 = 12, Y0 = 10, DX = 42, DY = 30;
  const nodeXY = (i, j) => [X0 + i * DX, Y0 + j * DY];
  // edges: key "i,j,d" d:0=E 1=S ; remove some to make the grid irregular
  const edge = new Set();
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { if (i < NX - 1) edge.add(i + ',' + j + ',0'); if (j < NY - 1) edge.add(i + ',' + j + ',1'); }
  const nodes = []; for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) nodes.push([i, j]);
  function connected() { const seen = new Set(['0,0']); const q = [[0, 0]]; while (q.length) { const [i, j] = q.shift(); for (const [ni, nj] of nbrs(i, j)) { const k = ni + ',' + nj; if (!seen.has(k)) { seen.add(k); q.push([ni, nj]); } } } return seen.size === NX * NY; }
  function hasEdge(i, j, ni, nj) { if (ni < 0 || nj < 0 || ni >= NX || nj >= NY) return false; if (nj === j) return edge.has(Math.min(i, ni) + ',' + j + ',0'); return edge.has(i + ',' + Math.min(j, nj) + ',1'); }
  function nbrs(i, j) { return [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([ni, nj]) => hasEdge(i, j, ni, nj)); }
  const ek = shuffle([...edge]);
  for (const k of ek.slice(0, Math.floor(ek.length * 0.16))) { edge.delete(k); if (!connected()) edge.add(k); }
  // parks: a couple of blocks
  const parks = new Set([ri(0, NX - 2) + ',' + ri(0, NY - 2), ri(0, NX - 2) + ',' + ri(0, NY - 2)]);
  const night = game.hour < 6 || game.hour >= 20;
  // ---- static city ----
  const city = document.createElement('canvas'); city.width = W; city.height = VH;
  drawTo(city.getContext('2d'), () => {
    rect(0, 0, W, VH, P.G3);
    // blocks
    for (let j = -1; j < NY; j++) for (let i = -1; i < NX; i++) {
      const [x0, y0] = nodeXY(i, j); const bx = x0 + 5, by = y0 + 5, bw = DX - 10, bh = DY - 10;
      if (parks.has(i + ',' + j)) { rect(bx, by, bw, bh, P.GR); dither(bx, by, bw, bh, P.GR, P.DG, 3); rect(bx, by + bh / 2 - 1, bw, 2, P.TN); for (let k = 0; k < 7; k++) disc(bx + 4 + ((k * 13 + i * 7) % (bw - 8)), by + 4 + ((k * 7 + j * 5) % (bh - 8)), 2, P.DG); continue; }
      let s = (i + 3) * 97 + (j + 3) * 31;
      for (let yy = by; yy < by + bh - 2;) {
        s = (s * 16807) % 2147483647; const h = Math.min(by + bh - yy, 7 + s % 6);
        for (let xx = bx; xx < bx + bw - 2;) {
          s = (s * 16807) % 2147483647; const w = Math.min(bx + bw - xx, 8 + s % 12);
          const roof = [P.G4, P.BR2, P.RD, P.G2, P.TN, P.BR3][s % 6];
          rect(xx, yy, w - 1, h - 1, roof); rect(xx + w - 2, yy + 1, 1, h - 1, P.K); rect(xx + 1, yy + h - 2, w - 2, 1, P.D2);
          if (s % 3 === 0) rect(xx + 2, yy + 2, 2, 2, P.G5);
          xx += w;
        }
        yy += h;
      }
    }
    // roads
    for (const k of edge) {
      const [i, j, d] = k.split(',').map(Number); const [x, y] = nodeXY(i, j);
      if (d === 0) { rect(x - 4, y - 4, DX + 8, 8, P.G1); rect(x - 4, y - 5, DX + 8, 1, P.G3); rect(x - 4, y + 4, DX + 8, 1, P.G3); for (let xx = x + 5; xx < x + DX - 4; xx += 4) rect(xx, y, 2, 1, P.YE2); }
      else { rect(x - 4, y - 4, 8, DY + 8, P.G1); rect(x - 5, y - 4, 1, DY + 8, P.G3); rect(x + 4, y - 4, 1, DY + 8, P.G3); for (let yy = y + 5; yy < y + DY - 4; yy += 4) rect(x, yy, 1, 2, P.YE2); }
    }
    for (const [i, j] of nodes) { const [x, y] = nodeXY(i, j); if (nbrs(i, j).length) rect(x - 4, y - 4, 8, 8, P.G1); }
    if (night) { dither(0, 0, W, VH, 'rgba(0,0,0,0)', P.K, 9); for (let n = 0; n < 160; n++) px((n * 73) % W, (n * 151) % VH, n % 3 ? P.YE2 : P.YE); }
  });
  // ---- cars ----
  const cars = [];
  function mkCar(i, j, kind, col, speed) { const nb = nbrs(i, j); const [ni, nj] = pick(nb); const c = { a: [i, j], b: [ni, nj], s: rnd() * 10, v: speed, vmax: speed, kind, col, route: null, wait: 0 }; cars.push(c); return c; }
  const len = () => 0;
  function edgeLen(c) { return c.a[0] === c.b[0] ? DY : DX; }
  function carPos(c) { const [ax, ay] = nodeXY(...c.a), [bx, by] = nodeXY(...c.b); const L = edgeLen(c), k = c.s / L; const dx = Math.sign(bx - ax), dy = Math.sign(by - ay); return [ax + (bx - ax) * k - dy * 2, ay + (by - ay) * k + dx * 2, dx, dy]; }
  function route(from, to, noise = 0.5) { // Dijkstra with jittered weights
    const key = n => n[0] + ',' + n[1]; const D = new Map([[key(from), 0]]), prev = new Map(); const q = [[0, from]];
    while (q.length) { q.sort((a, b) => a[0] - b[0]); const [d, n] = q.shift(); if (key(n) === key(to)) break; for (const m of nbrs(...n)) { const nd = d + 1 + rnd() * noise; if (nd < (D.get(key(m)) ?? 1e9)) { D.set(key(m), nd); prev.set(key(m), n); q.push([nd, m]); } } }
    const out = []; let n = to; while (n && key(n) !== key(from)) { out.unshift(n); n = prev.get(key(n)); } return out;
  }
  const start = [ri(0, 2), ri(0, NY - 1)];
  let dest; do { dest = [ri(NX - 3, NX - 1), ri(0, NY - 1)]; } while (Math.abs(dest[0] - start[0]) + Math.abs(dest[1] - start[1]) < 6);
  if (rnd() < 0.5) { start[0] = NX - 1 - start[0]; dest[0] = NX - 1 - dest[0]; }
  const sus = mkCar(start[0], start[1], 'suspect', P.RD2, 22 + level);
  sus.route = route(start, dest, 1.2); sus.b = sus.route.shift(); sus.s = 0; sus.a = start.slice();
  const agentsN = sk >= 4 ? 3 : 2; const agents = [];
  for (let n = 0; n < agentsN; n++) {
    let st; do { st = [clamp(start[0] + ri(-2, 2), 0, NX - 1), clamp(start[1] + ri(-2, 2), 0, NY - 1)]; } while ((st[0] === start[0] && st[1] === start[1]) || !nbrs(...st).length);
    const c = mkCar(st[0], st[1], 'agent', n === 0 ? P.CY : P.BL3, 30 + sk * 1.5); c.s = 0; c.fam = 0; c.idx = n; agents.push(c);
  }
  for (let n = 0; n < 12 + level * 2; n++) mkCar(ri(0, NX - 1), ri(0, NY - 1), 'civ', pick([P.W, P.YE, P.G4, P.BR3, P.PU2, P.GR3, P.TN]), 16 + rnd() * 10);
  let ctrl = 0, susp = 0, made = false, lostT = 0, t = 0, over = null, arrived = false, rams = 0, ramCool = 0, want = null, msg = 'Tail the red car. Keep close enough to follow, far enough not to be seen.', msgT = 5;
  const say = (m, d = 3) => { msg = m; msgT = d; };
  const me = () => agents[ctrl];

  function atNode(c) {
    const here = c.b; const opts2 = nbrs(...here); const back = c.a;
    let next = null;
    if (c.kind === 'suspect') {
      if (made) { const ahead = opts2.filter(n => !(n[0] === back[0] && n[1] === back[1])); next = pick(ahead.length ? ahead : opts2); }
      else if (c.route && c.route.length) next = c.route.shift();
      else { arrived = true; c.v = 0; c.parked = true; return; }
    } else if (c.kind === 'civ') { const ahead = opts2.filter(n => !(n[0] === back[0] && n[1] === back[1])); next = pick(ahead.length ? ahead : opts2); }
    else {
      if (agents[ctrl] !== c) { c.v = 0; c.parked = true; return; }
      const dx = here[0] - back[0], dy = here[1] - back[1];
      const w = want || [dx, dy];
      const cand = [[here[0] + w[0], here[1] + w[1]], [here[0] + dx, here[1] + dy]];
      next = cand.find(n => opts2.some(o => o[0] === n[0] && o[1] === n[1]));
      if (!next) { c.s = edgeLen(c); c.v = 0; c.stopped = true; return; }
    }
    c.a = here; c.b = next; c.s = 0; c.stopped = false;
  }
  function ahead(c) { // nearest car in front on the same edge
    let best = null, bd = 1e9; for (const o of cars) { if (o === c) continue; if (o.a[0] === c.a[0] && o.a[1] === c.a[1] && o.b[0] === c.b[0] && o.b[1] === c.b[1] && o.s > c.s) { const d = o.s - c.s; if (d < bd) { bd = d; best = o; } } } return best ? [best, bd] : null;
  }
  function finish(win, why) { if (over) return; over = { win, why, t: 0 }; win ? sfx.success() : sfx.fail(); }
  const scene = {
    update(dt) {
      t += dt; if (msgT > 0) msgT -= dt; ramCool -= dt;
      if (over) { over.t += dt; return; }
      const ax = input.axis(); if (ax.x || ax.y) want = ax.x ? [ax.x, 0] : [0, ax.y];
      const c0 = me();
      // reversing on the spot
      if (want && !c0.stopped) { const dx = c0.b[0] - c0.a[0], dy = c0.b[1] - c0.a[1]; if (want[0] === -dx && want[1] === -dy && (dx || dy)) { const L = edgeLen(c0); [c0.a, c0.b] = [c0.b, c0.a]; c0.s = L - c0.s; want = null; } }
      if (c0.stopped && want) { c0.stopped = false; atNode(c0); }
      if (c0.parked) { c0.parked = false; c0.v = c0.vmax * 0.5; }
      for (const c of cars) {
        if (c.parked) continue; if (c.stopped) continue;
        let target = c.vmax * (c === c0 && input.held('fire') ? 0.35 : 1) * (c.kind === 'suspect' && made ? 1.45 : 1);
        if (c.kind === 'agent' && c !== c0) target = 0;
        const a = ahead(c); if (a) { const [o, d] = a; if (d < 12) target = Math.min(target, o.v * 0.9); if (d < 7) target = 0; if (d < 6 && c === c0 && o === sus && ramCool <= 0) { rams++; ramCool = 1; sfx.noise(0.15, 0.2, 200); susp = 100; if (!made) { made = true; say('You rammed them! They know they are being followed.'); } if (rams >= 3) { finish(true, 'captured'); } } }
        c.v += (target - c.v) * Math.min(1, dt * 3);
        c.s += c.v * dt; if (c.s >= edgeLen(c)) { c.s = edgeLen(c); atNode(c); }
      }
      // suspicion and range
      const [sx, sy] = carPos(sus); const [mx, my] = carPos(c0); const d = dist(sx, sy, mx, my);
      let nearest = 1e9; for (const a2 of agents) { const [ax2, ay2] = carPos(a2); nearest = Math.min(nearest, dist(sx, sy, ax2, ay2)); }
      if (!made) {
        if (d < 36) { const rate = (36 - d) * (1.6 - sk * 0.15) * (1 + c0.fam / 40); susp = Math.min(100, susp + rate * dt); c0.fam = Math.min(100, c0.fam + dt * 8); }
        else susp = Math.max(0, susp - dt * 4);
        if (susp >= 100) { made = true; say('They have spotted you! Stop them or lose them.', 4); sfx.alarm(); }
      }
      if (nearest > 100) { lostT += dt; if (lostT > 6) finish(false, 'lost'); } else lostT = 0;
      if (arrived && !over) { if (nearest < 90) finish(true, 'followed'); else finish(false, 'late'); }
      if (made && t > 0 && lostT > 3 && nearest > 140) finish(false, 'lost');
    },
    onKey(k) {
      if (over) { if (over.t > 0.6 && (k === 'select' || k === 'fire' || k === 'menu')) done({ success: over.win, how: over.why }); return; }
      if (k === 'alt2' || k === 'alt') { ctrl = (ctrl + 1) % agents.length; want = null; sfx.select(); say('Now driving car ' + (ctrl + 1) + '.', 1.5); }
      if (k === 'menu') finish(false, 'abort');
    },
    onTap(x, y) {
      if (over) { if (over.t > 0.6) done({ success: over.win, how: over.why }); return; }
      if (y > VH) { if (x > 250) { ctrl = (ctrl + 1) % agents.length; want = null; sfx.select(); } return; }
      // tap on the map: steer toward it
      const [mx, my] = carPos(me()); const dx = x - mx, dy = y - my; want = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
    },
    draw() {
      rect(0, 0, W, H, P.K); g.drawImage(city, 0, 0);
      if (arrived || over) { const [x, y] = nodeXY(...dest); frame(x - 8, y - 8, 16, 16, P.YE); text('X', x - 2, y - 3, P.YE); }
      for (const c of cars) {
        const [x, y, dx, dy] = carPos(c); const hor = dx !== 0;
        const w = hor ? 6 : 3, h = hor ? 3 : 6; const X = Math.round(x - w / 2), Y = Math.round(y - h / 2);
        rect(X, Y, w, h, c.col); if (hor) rect(X + (dx > 0 ? 3 : 1), Y, 2, h, P.G1); else rect(X, Y + (dy > 0 ? 3 : 1), w, 2, P.G1);
        if (night) px(x + dx * 4, y + dy * 4, P.YE);
        if (c === me() && (t * 4 | 0) % 2) frame(X - 1, Y - 1, w + 2, h + 2, P.W);
        if (c.kind === 'agent' && c !== me()) text(String(c.idx + 1), X + w, Y - 7, P.BL3);
      }
      const [sx, sy] = carPos(sus); if ((t * 3 | 0) % 2) { px(sx, sy - 5, P.RD2); rect(sx - 1, sy - 7, 3, 1, P.RD2); }
      // status
      const y = VH; rect(0, y, W, H - y, P.K); bevel(0, y, W, H - y, P.G2, P.G4, P.G1); rect(3, y + 3, W - 6, H - y - 6, P.D2);
      text('Tailing ' + (opts.label || 'the courier'), 8, y + 5, P.W);
      text('Suspicion', 8, y + 15, P.G4); rect(56, y + 16, 80, 5, P.K); rect(56, y + 16, 80 * susp / 100, 5, susp > 70 ? P.RD2 : susp > 35 ? P.OR : P.GR2);
      const [mx, my] = carPos(me()); const d = dist(sx, sy, mx, my);
      text('Range', 146, y + 15, P.G4); text(d < 36 ? 'TOO CLOSE' : d < 90 ? 'Good' : 'Losing them', 180, y + 15, d < 36 ? P.OR : d < 90 ? P.GR2 : P.RD2);
      bevel(250, y + 5, 64, 20, P.BL, P.BL3, P.NV); textC('Car ' + (ctrl + 1) + '/' + agents.length, 282, y + 8, P.YE); textC('Tab: swap', 282, y + 16, P.G4);
      if (msgT > 0 && !over) { const ls = wrap(msg, 300); rect(0, 0, W, ls.length * 9 + 3, 'rgba(0,0,0,0.75)'); ls.forEach((l, i) => text(l, 8, 2 + i * 9, P.YE)); }
      if (over) {
        panel(40, 46, W - 80, 70);
        const [h, c] = { followed: ['DESTINATION FOUND', P.GR2], captured: ['CAR STOPPED', P.GR2], lost: ['YOU LOST THEM', P.RD2], late: ['TOO FAR BEHIND', P.RD2], abort: ['TAIL ABANDONED', P.YE] }[over.why];
        textC(h, W / 2, 56, c);
        para({ followed: 'The car pulls up and the driver meets someone. Your camera catches everything.', captured: 'You force the car to the kerb and drag the driver out.', lost: 'The car disappears into the traffic.', late: 'By the time you arrive the meeting is over.', abort: 'You give up the tail.' }[over.why], 54, 70, W - 108, P.G5, 9);
        if (over.t > 0.6) textC('Press OK', W / 2, 104, P.G3);
      }
    },
  };
  return scene;
}
