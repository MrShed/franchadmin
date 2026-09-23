// ===================================================================
// WIRETAP: route current to the phone line, keep it off the alarms
// ===================================================================
// tile openings as bitmask: 1=N 2=E 4=S 8=W
const rotMask = (m, r) => { for (let i = 0; i < r; i++) m = ((m << 1) | (m >> 3)) & 15; return m; };
const DIRS = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]]; // dx, dy, myBit, theirBit
function wiretapScene(opts, done) {
  const sk = game.agent ? game.agent.skills.electronics : 2, level = opts.level || 1;
  const CO = Math.min(9, 7 + Math.floor(level / 2)), RO = 6, TW = 24, TH = 20, OX = 48, OY = 26;
  const grid = [];
  for (let y = 0; y < RO; y++) { grid.push([]); for (let x = 0; x < CO; x++) grid[y].push({ base: 0, rot: 0, fixed: false, path: false }); }
  // choose inputs/outputs
  const srcRow = ri(0, RO - 1);
  const rows = shuffle([...Array(RO).keys()]);
  const phoneRow = rows.find(r => Math.abs(r - srcRow) >= 2) ?? rows[0];
  const alarmRows = rows.filter(r => r !== phoneRow).slice(0, 2 + Math.min(2, Math.floor(level / 2)));
  // random self-avoiding walk from (0,srcRow) entering from W to (CO-1, phoneRow) exiting E
  function walk() {
    const seen = new Set(); const path = [[0, srcRow]]; seen.add('0,' + srcRow);
    function step(x, y) {
      if (x === CO - 1 && y === phoneRow) return true;
      const opts2 = shuffle(DIRS.slice()).sort((a, b) => (b[0] - a[0]) * (rnd() < 0.6 ? 1 : 0));
      for (const [dx, dy] of opts2) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= CO || ny >= RO || seen.has(nx + ',' + ny)) continue; if (path.length > CO * 2.4) continue; seen.add(nx + ',' + ny); path.push([nx, ny]); if (step(nx, ny)) return true; path.pop(); seen.delete(nx + ',' + ny); }
      return false;
    }
    return step(0, srcRow) ? path : null;
  }
  let path = null; for (let i = 0; i < 20 && !path; i++) path = walk();
  if (!path) { path = []; const mid = ri(1, CO - 2); for (let x = 0; x <= mid; x++) path.push([x, srcRow]); const sy = Math.sign(phoneRow - srcRow); for (let y = srcRow + sy; y !== phoneRow; y += sy) path.push([mid, y]); for (let x = mid; x < CO; x++) path.push([x, phoneRow]); }
  // set path tiles to the exact connecting shape
  path.forEach(([x, y], i) => {
    const prev = i === 0 ? [x - 1, y] : path[i - 1], next = i === path.length - 1 ? [x + 1, y] : path[i + 1];
    let m = 0; for (const [px_, py] of [prev, next]) { const dx = px_ - x, dy = py - y; m |= dx === 1 ? 2 : dx === -1 ? 8 : dy === 1 ? 4 : 1; }
    const c = grid[y][x]; c.path = true; c.sol = m;
  });
  // shapes: straight 5 (N+S), elbow 3 (N+E), tee 7, cross 15
  const shapes = [5, 3, 7, 15, 3, 5];
  for (let y = 0; y < RO; y++) for (let x = 0; x < CO; x++) {
    const c = grid[y][x];
    if (c.path) { c.base = (c.sol === 5 || c.sol === 10) ? 5 : 3; const need = c.sol; c.solRot = [0, 1, 2, 3].find(r => rotMask(c.base, r) === need); c.rot = ri(0, 3); if (rnd() < 0.15) { c.fixed = true; c.rot = c.solRot; } }
    else { c.base = pick(shapes); c.rot = ri(0, 3); if (rnd() < 0.12) c.fixed = true; }
  }
  let time = 80 + sk * 15 - level * 3, strikes = 0, cur = [0, srcRow], powered = null, pulse = 0, over = null, t = 0, flash = 0;
  function flow() { // BFS from the source through matching openings
    const on = grid.map(r => r.map(() => false)); const q = [];
    const s = grid[srcRow][0]; if (rotMask(s.base, s.rot) & 8) { on[srcRow][0] = true; q.push([0, srcRow]); }
    const hits = { phone: false, alarm: [] };
    while (q.length) {
      const [x, y] = q.shift(); const m = rotMask(grid[y][x].base, grid[y][x].rot);
      for (const [dx, dy, my, their] of DIRS) {
        if (!(m & my)) continue; const nx = x + dx, ny = y + dy;
        if (nx === CO) { if (ny === phoneRow) hits.phone = true; if (alarmRows.includes(ny)) hits.alarm.push(ny); continue; }
        if (nx < 0 || ny < 0 || ny >= RO) continue;
        if (on[ny][nx]) continue; if (!(rotMask(grid[ny][nx].base, grid[ny][nx].rot) & their)) continue;
        on[ny][nx] = true; q.push([nx, ny]);
      }
    }
    return { on, hits };
  }
  function powerOn() {
    if (powered || over) return; const f = flow(); powered = { f, t: 0 }; sfx.tone(60, 1.2, 'sawtooth', 0.05, 40);
  }
  function resolvePower() {
    const { hits } = powered.f;
    if (hits.alarm.length) { strikes++; flash = 1; sfx.alarm(); if (strikes >= 2) { over = { win: false, t: 0, why: 'The second alarm brings security running. You pull out.' }; sfx.fail(); } else { time -= 15; } }
    else if (hits.phone) { over = { win: true, t: 0 }; sfx.success(); }
    else { sfx.deny(); }
    powered = null;
  }
  function rotate(x, y) { const c = grid[y][x]; if (c.fixed) { sfx.deny(); return; } c.rot = (c.rot + 1) % 4; sfx.tone(1000, 0.02); }
  return {
    update(dt) {
      t += dt; flash = Math.max(0, flash - dt);
      if (over) { over.t += dt; return; }
      if (powered) { powered.t += dt; if (powered.t > 1.4) resolvePower(); return; }
      time -= dt; if (time <= 0) { time = 0; over = { win: false, t: 0, why: 'The phone company engineer is coming back. Time is up.' }; sfx.fail(); }
      pulse += dt;
    },
    onKey(k) {
      if (over) { if (over.t > 0.6 && (k === 'select' || k === 'fire' || k === 'menu')) done({ success: over.win }); return; }
      if (powered) return;
      if (k === 'left') cur[0] = Math.max(0, cur[0] - 1); else if (k === 'right') cur[0] = Math.min(CO - 1, cur[0] + 1);
      else if (k === 'up') cur[1] = Math.max(0, cur[1] - 1); else if (k === 'down') cur[1] = Math.min(RO - 1, cur[1] + 1);
      else if (k === 'select' || k === 'fire' || k === 'action') rotate(cur[0], cur[1]);
      else if (k === 'alt2' || k === 'alt') powerOn();
      else if (k === 'menu') { over = { win: false, t: 1, why: 'You pack up your tools and leave.' }; }
      if (['left', 'right', 'up', 'down'].includes(k)) sfx.blip();
    },
    onTap(x, y) {
      if (over) { if (over.t > 0.6) done({ success: over.win }); return; }
      if (powered) return;
      const gx = Math.floor((x - OX) / TW), gy = Math.floor((y - OY) / TH);
      if (gx >= 0 && gy >= 0 && gx < CO && gy < RO) { cur = [gx, gy]; rotate(gx, gy); return; }
      if (y > 160 && x > 200) powerOn(); else if (y > 160 && x < 90) { over = { win: false, t: 1, why: 'You pack up your tools and leave.' }; }
    },
    draw() {
      rect(0, 0, W, H, P.K);
      // junction box housing
      bevel(2, 2, W - 4, 154, P.G3, P.G5, P.G1); rect(8, 8, W - 16, 142, P.G1);
      text('TELEPHONE JUNCTION BOX  -  ' + (opts.label || 'Suspect line'), 12, 11, P.W);
      const k = time / (80 + sk * 15); textR(Math.ceil(time) + 's', W - 12, 11, k > 0.3 ? P.CY : P.RD2);
      // circuit board
      rect(OX - 4, OY - 4, CO * TW + 8, RO * TH + 8, P.DG); dither(OX - 4, OY - 4, CO * TW + 8, RO * TH + 8, P.DG, P.GR, 2);
      const on = powered ? powered.f.on : null; const prog = powered ? Math.min(1, powered.t / 1.1) : 0;
      // source
      rect(10, OY + srcRow * TH + 3, 30, 14, P.K); frame(10, OY + srcRow * TH + 3, 30, 14, P.YE); text('LINE', 14, OY + srcRow * TH + 6, P.YE);
      rect(40, OY + srcRow * TH + 9, 8, 2, powered ? P.YE : P.BR3);
      for (let y = 0; y < RO; y++) for (let x = 0; x < CO; x++) {
        const c = grid[y][x], X = OX + x * TW, Y = OY + y * TH, m = rotMask(c.base, c.rot);
        rect(X + 1, Y + 1, TW - 2, TH - 2, c.fixed ? P.G1 : P.D2); frame(X + 1, Y + 1, TW - 2, TH - 2, c.fixed ? P.G2 : P.K);
        if (c.fixed) { px(X + 3, Y + 3, P.G4); px(X + TW - 4, Y + 3, P.G4); px(X + 3, Y + TH - 4, P.G4); px(X + TW - 4, Y + TH - 4, P.G4); }
        const lit = on && on[y][x] && (Math.abs(x - 0) + Math.abs(y - srcRow)) / (CO + RO) < prog + 0.1;
        const col = lit ? ((t * 12 | 0) % 2 ? P.W : P.YE) : P.BR3;
        const cx = X + TW / 2, cy = Y + TH / 2;
        if (m & 1) rect(cx - 1, Y, 3, TH / 2 + 1, col); if (m & 4) rect(cx - 1, cy, 3, TH / 2, col);
        if (m & 8) rect(X, cy - 1, TW / 2 + 1, 3, col); if (m & 2) rect(cx, cy - 1, TW / 2, 3, col);
        rect(cx - 2, cy - 2, 5, 5, lit ? P.YE : P.G2); px(cx, cy, P.K);
      }
      // outputs
      for (let y = 0; y < RO; y++) {
        const Y = OY + y * TH, X = OX + CO * TW + 6;
        if (y === phoneRow) { rect(X, Y + 3, 40, 14, P.BL); frame(X, Y + 3, 40, 14, P.CY); text('PHONE', X + 4, Y + 6, P.W); }
        else if (alarmRows.includes(y)) { const a = flash > 0 && (t * 10 | 0) % 2; rect(X, Y + 3, 40, 14, a ? P.RD2 : P.RD); frame(X, Y + 3, 40, 14, P.OR); text('ALARM', X + 4, Y + 6, P.W); }
        else { rect(X, Y + 7, 12, 6, P.G2); px(X + 3, Y + 9, P.K); }
        rect(OX + CO * TW, Y + 9, 6, 2, P.BR3);
      }
      // cursor
      if (!over) { const X = OX + cur[0] * TW, Y = OY + cur[1] * TH; if ((t * 4 | 0) % 2) frame(X, Y, TW, TH, P.YE); frame(X - 1, Y - 1, TW + 2, TH + 2, P.K); }
      // footer
      rect(0, 156, W, 44, P.K); panel(0, 156, W, 44);
      bevel(12, 168, 70, 14, P.G2, P.G4, P.G1); textC('Give up', 47, 171, P.W);
      bevel(W - 118, 168, 106, 14, P.RD, P.RD2, P.BR); textC(powered ? 'CURRENT ON' : 'Switch on current', W - 65, 171, P.YE);
      text('Alarms tripped: ' + strikes + '/2', 96, 164, strikes ? P.RD2 : P.G4);
      text('Feed the PHONE, not an ALARM.', 96, 176, P.G3);
      if (over) {
        panel(40, 50, W - 80, 64);
        textC(over.win ? 'TAP INSTALLED' : 'NO TAP', W / 2, 60, over.win ? P.GR2 : P.RD2);
        para(over.win ? 'The bug is live. Anything said on this line will now reach the Agency.' : over.why, 54, 74, W - 108, P.G5, 9);
        if (over.t > 0.6) textC('Press OK', W / 2, 104, P.G3);
      }
    },
  };
}
