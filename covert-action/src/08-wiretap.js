// ===================================================================
// ELECTRONICS: the junction-box puzzle. Current flows left to right
// through two-lane chips. Swap chips with the one in hand until no
// phone has power - without ever powering an alarm.
// ===================================================================
// chip types: route maps (top,bottom) inputs to outputs; inv flips a lane
const CHIPS = {
  S: { route: 'straight', inv: [0, 0] },   // =  two straight lanes
  X: { route: 'cross', inv: [0, 0] },      // X  lanes swap
  D: { route: 'down', inv: [0, 0] },       // top feeds the bottom output
  U: { route: 'up', inv: [0, 0] },         // bottom feeds the top output
  T: { route: 'straight', inv: [1, 0] },   // top lane is a terminator
  B: { route: 'straight', inv: [0, 1] },   // bottom lane is a terminator
  I: { route: 'straight', inv: [1, 1] },   // both lanes are terminators
};
function chipOut(type, a, b) {
  const c = CHIPS[type]; let o;
  if (c.route === 'straight') o = [a, b]; else if (c.route === 'cross') o = [b, a];
  else if (c.route === 'down') o = [0, a]; else o = [b, 0];
  return [c.inv[0] ? (o[0] ? 0 : 1) : o[0], c.inv[1] ? (o[1] ? 0 : 1) : o[1]];
}
function wiretapScene(opts, done) {
  const sk = game.agent ? game.agent.skills.electronics : 2, level = opts.level || 1;
  const COLS = 7, ROWS = 5, LANES = ROWS * 2;
  const tracer = opts.mode === 'tracer';
  const eff = Math.max(0, level - Math.max(0, sk - 1)); // skill above Good makes it easier
  const pool = eff >= 1 ? 'SSXXDUTBI' : 'SSSXXXDU'; // inverters from National Threat up
  const unknownRate = [0, 0.1, 0.2, 0.3][Math.min(3, eff)], hardRate = [0.08, 0.12, 0.16, 0.2][Math.min(3, eff)];
  let grid, links, inputs, ends, hand, fixed, hidden;
  function build() {
    grid = []; fixed = []; hidden = [];
    for (let c = 0; c < COLS; c++) { grid.push([]); fixed.push([]); for (let r = 0; r < ROWS; r++) { grid[c].push(pick(pool.split(''))); fixed[c].push(c === COLS - 1 || rnd() < hardRate); }
      hidden.push([]); for (let r = 0; r < ROWS; r++) hidden[c].push(!fixed[c][r] && rnd() < unknownRate); }
    // wiring between columns: mostly straight, with crossings between neighbouring chips
    links = []; for (let c = 0; c < COLS - 1; c++) { const m = [...Array(LANES).keys()]; for (let l = 1; l < LANES - 1; l += 2) if (rnd() < 0.35) { [m[l], m[l + 1]] = [m[l + 1], m[l]]; } for (let l = 0; l < LANES; l += 2) if (rnd() < 0.2) { [m[l], m[l + 1]] = [m[l + 1], m[l]]; } links.push(m); }
    // 5 volts enter at the bottom left and feed the lanes; some lanes are grounded
    inputs = [...Array(LANES)].map(() => rnd() < 0.55 ? 1 : 0); inputs[LANES - 1] = 1;
    hand = pick(pool.split(''));
  }
  function simulate(g, h) { // returns lane power per column output, and final outputs
    const cols = []; let lanes = inputs.slice();
    for (let c = 0; c < COLS; c++) {
      const out = []; for (let r = 0; r < ROWS; r++) { const [a, b] = chipOut(g[c][r], lanes[r * 2], lanes[r * 2 + 1]); out.push(a, b); }
      cols.push({ in: lanes, out }); if (c < COLS - 1) { const nx = []; links[c].forEach((to, from) => nx[to] = out[from]); lanes = nx; } else lanes = out;
    }
    return { cols, final: lanes };
  }
  // generate a board whose starting state powers every phone and no alarm, and that can be solved
  let tries = 0;
  for (; tries < 200; tries++) {
    build(); const f = simulate(grid).final;
    const nOn = f.filter(Boolean).length; if (nOn < 3 || nOn > 7) continue;
    ends = f.map(v => v ? (tracer ? 'setting' : 'phone') : 'alarm');
    if (solvable()) break;
  }
  function score(g) { const f = simulate(g).final; let s = 0; f.forEach((v, i) => { if (v) s += ends[i] === 'alarm' ? 3 : 1; }); return s; }
  function solvable() { // random-restart hill climb over swaps with the hand chip
    for (let restart = 0; restart < 6; restart++) {
      const g = grid.map(c => c.slice()); let h = hand, cur = score(g);
      for (let it = 0; it < 400; it++) {
        const c = ri(0, COLS - 2), r = ri(0, ROWS - 1); if (fixed[c][r]) continue;
        const old = g[c][r]; g[c][r] = h; const s = score(g);
        if (s <= cur || rnd() < 0.05) { h = old; cur = s; if (cur === 0) return true; } else g[c][r] = old;
      }
    }
    return false;
  }
  const time0 = (tracer ? 60 : 150) + sk * 20 - level * 10 - (opts.alert || 0) * 15; let time = time0, cur = [0, 0], over = null, t = 0, flash = 0;
  // briefing card before the clock starts; a live alarm gives you a moment to swap back before it trips
  let intro = !opts.noIntro, arming = 0; const grace = [2, 1.6, 1.3, 1][Math.min(3, eff)], preview = eff <= 1;
  const need = tracer ? Math.min(5, ends.filter(e => e === 'setting').length) : 0;
  const cutCount = () => simulate(grid).final.filter((v, i) => !v && ends[i] !== 'alarm').length;
  const X0 = 34, Y0 = 12, DXc = 32, DYr = 31, CW = 16, CH = 16;
  const chipXY = (c, r) => [X0 + c * DXc, Y0 + r * DYr];
  const laneY = (r, l) => Y0 + r * DYr + 4 + l * 8;
  const alarmLive = () => simulate(grid).final.some((v, i) => v && ends[i] === 'alarm');
  function check() {
    const f = simulate(grid).final;
    if (f.some((v, i) => v && ends[i] === 'alarm')) { if (!arming) { arming = grace; sfx.tone(1200, 0.08, 'square', 0.05); } return; }
    arming = 0;
    const n = cutCount();
    if (tracer ? n >= need : !f.some((v, i) => v && ends[i] === 'phone')) { over = { win: true, t: 0 }; sfx.success(); }
  }
  function swap() { const [c, r] = cur; if (fixed[c][r]) { sfx.deny(); return; } [grid[c][r], hand] = [hand, grid[c][r]]; hidden[c][r] = false; sfx.tone(900, 0.03); sfx.tone(600, 0.04, 'square', 0.04, 0, 0.04); check(); }
  function result() { const n = over.alarm ? 0 : cutCount(); return { success: over.win || (!tracer && n > 0 && !over.alarm), tapped: tracer ? 0 : n, alarm: !!over.alarm }; }
  function moveCur(dc, dr) { let [c, r] = cur; for (let k = 0; k < COLS * ROWS; k++) { c = (c + dc + COLS) % COLS; r = (r + dr + ROWS) % ROWS; if (!fixed[c][r]) break; if (!dc && !dr) break; } cur = [c, r]; sfx.blip(); }
  if (fixed[0][0]) moveCur(1, 0);
  function drawChip(type, x, y, isFixed, sel) {
    if (isFixed) { rect(x - 2, y - 2, CW + 4, CH + 4, P.K); rect(x - 1, y - 1, CW + 2, CH + 2, P.G1); }
    if (sel) { const on = (t * 4 | 0) % 2; rect(x - 3, y - 3, CW + 6, CH + 6, on ? P.YE : P.W); rect(x - 2, y - 2, CW + 4, CH + 4, P.K); }
    rect(x, y, CW, CH, sel ? P.BL : P.G1); rect(x, y, CW, 1, P.G3); rect(x, y, 1, CH, P.G3);
    // pins
    for (const yy of [4, 12]) { px(x - 1, y + yy, P.W); px(x + CW, y + yy, P.W); }
    if (type === '?') { textC('?', x + CW / 2, y + 4, P.YE); return; }
    const c = CHIPS[type], L = x + 3, R = x + CW - 4, T = y + 4, Bm = y + 12, col = sel ? P.W : P.CY;
    const lane = (yy, inv) => { if (inv) { rect(L, yy, 3, 1, col); rect(L + 3, yy - 1, 1, 3, col); rect(R - 3, yy - 1, 1, 3, col); rect(R - 2, yy, 3, 1, col); } else rect(L, yy, R - L + 1, 1, col); };
    if (c.route === 'straight') { lane(T, c.inv[0]); lane(Bm, c.inv[1]); }
    else if (c.route === 'cross') { line(L, T, R, Bm, col); line(L, Bm, R, T, col); px(R - 1, Bm - 1, col); px(R - 1, T + 1, col); }
    else if (c.route === 'down') { line(L, T, R, Bm, col); rect(R - 2, Bm, 2, 1, col); rect(R, Bm - 2, 1, 2, col); }
    else { line(L, Bm, R, T, col); rect(R - 2, T, 2, 1, col); rect(R, T + 1, 1, 2, col); }
  }
  return {
    update(dt) {
      t += dt; flash = Math.max(0, flash - dt); if (over) { over.t += dt; return; } if (intro) return;
      if (arming) { const a0 = arming; arming = Math.max(0, arming - dt); if ((a0 * 4 | 0) !== (arming * 4 | 0)) sfx.tone(1200, 0.06, 'square', 0.05); if (!arming && alarmLive()) { over = { win: false, alarm: true, t: 0, why: 'An alarm is live! Somewhere a light is blinking on a security desk.' }; flash = 2; sfx.alarm(); return; } }
      time -= dt; if (time <= 0) { time = 0; over = { win: false, t: 0, why: tracer ? 'The car pulls away before your tracer is ready.' : 'Guards are coming. You pack up and keep whatever lines you have cut.' }; sfx.fail(); } },
    onKey(k) {
      if (over) { if (over.t > 0.6 && (k === 'select' || k === 'fire' || k === 'menu')) done(result()); return; }
      if (intro) { if (k === 'menu') over = { win: false, t: 1, why: tracer ? 'You give up on the tracer.' : 'You close the junction box and walk away.' }; else { intro = false; sfx.select(); } return; }
      if (k === 'left') moveCur(-1, 0); else if (k === 'right') moveCur(1, 0); else if (k === 'up') moveCur(0, -1); else if (k === 'down') moveCur(0, 1);
      else if (k === 'select' || k === 'fire' || k === 'action') swap();
      else if (k === 'menu') over = { win: false, t: 1, why: tracer ? 'You give up on the tracer.' : 'You close the junction box and walk away.' };
    },
    onTap(x, y) {
      if (over) { if (over.t > 0.6) done(result()); return; }
      if (intro) { intro = false; sfx.select(); return; }
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) { const [cx, cy] = chipXY(c, r); if (x >= cx - 4 && x < cx + CW + 4 && y >= cy - 4 && y < cy + CH + 4) { if (fixed[c][r]) { sfx.deny(); return; } if (cur[0] === c && cur[1] === r) swap(); else { cur = [c, r]; sfx.blip(); } return; } }
      if (y > 186 && x < 60) over = { win: false, t: 1, why: tracer ? 'You give up on the tracer.' : 'You close the junction box and walk away.' };
    },
    draw() {
      rect(0, 0, W, H, P.K);
      rect(0, 0, W, 168, P.BL);
      // board with a cyan grid every 8 px
      rect(2, 1, W - 4, 166, P.GR);
      for (let x = 2; x < W - 2; x += 8) rect(x, 1, 1, 166, P.TL); for (let y = 1; y < 167; y += 8) rect(2, y, W - 4, 1, P.TL);
      const sim = simulate(grid); const dash = (t * 8 | 0) % 2;
      const wire = (x0, y0, x1, y1, on) => { if (!on) { line(x0, y0, x1, y1, P.GR2); return; } const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) { const xx = Math.round(x0 + (x1 - x0) * i / n), yy = Math.round(y0 + (y1 - y0) * i / n); px(xx, yy, ((i >> 1) + dash) % 2 ? P.RD2 : P.W); } };
      // inputs from the +5V bus up the left side
      for (let l = 0; l < LANES; l++) { const r = l >> 1, y = laneY(r, l & 1), on = inputs[l]; const bx = 6 + (l % 5) * 3; wire(bx, 167, bx, y, on); wire(bx, y, X0 - 2, y, on); }
      // chip-to-chip wiring
      for (let c = 0; c < COLS - 1; c++) for (let l = 0; l < LANES; l++) {
        const to = links[c][l]; const [x0] = chipXY(c, 0), [x1] = chipXY(c + 1, 0);
        const y0 = laneY(l >> 1, l & 1), y1 = laneY(to >> 1, to & 1), on = sim.cols[c].out[l];
        const xa = x0 + CW + 1, xb = x1 - 2; if (y0 === y1) wire(xa, y0, xb, y1, on); else { wire(xa, y0, xa + 4, y0, on); wire(xa + 4, y0, xb - 4, y1, on); wire(xb - 4, y1, xb, y1, on); }
      }
      // to the phones and alarms
      for (let l = 0; l < LANES; l++) {
        const [x0] = chipXY(COLS - 1, 0); const y = laneY(l >> 1, l & 1), on = sim.final[l];
        const ex = l % 2 ? 294 : 266, ey = 6 + l * 15.6 | 0;
        wire(x0 + CW + 1, y, ex - 12, y, on); wire(ex - 12, y, ex - 12, ey + 7, on); wire(ex - 12, ey + 7, ex - 1, ey + 7, on);
        rect(ex, ey, 16, 15, P.G1); rect(ex, ey, 16, 1, P.G3); rect(ex, ey, 1, 15, P.G3); rect(ex - 1, ey + 3, 1, 1, P.W); rect(ex - 1, ey + 11, 1, 1, P.W);
        if (ends[l] === 'setting') { rect(ex + 4, ey + 4, 8, 7, on ? P.W : P.G3); text(String(1 + (l >> 1)), ex + 6, ey + 4, P.K); }
        else if (ends[l] === 'phone') { rect(ex + 6, ey + 3, 2, 9, on ? P.W : P.G3); rect(ex + 8, ey + 2, 2, 2, on ? P.W : P.G3); rect(ex + 8, ey + 11, 2, 2, on ? P.W : P.G3); }
        else { const lit = on || (flash > 0 && (t * 10 | 0) % 2); rect(ex + 5, ey + 3, 6, 7, lit ? P.RD2 : P.YE); rect(ex + 4, ey + 9, 8, 2, lit ? P.RD2 : P.YE); px(ex + 7, ey + 11, P.YE); rect(ex + 7, ey + 2, 2, 1, P.YE); }
      }
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) { const [x, y] = chipXY(c, r); drawChip(hidden[c][r] ? '?' : grid[c][r], x, y, fixed[c][r], !over && !intro && cur[0] === c && cur[1] === r); }
      // what the swap would do (easier levels): green = a phone goes dead, red = an alarm goes live
      if (preview && !over && !intro && !fixed[cur[0]][cur[1]]) {
        const g2 = grid.map(col => col.slice()); g2[cur[0]][cur[1]] = hand; const f2 = simulate(g2).final;
        for (let l = 0; l < LANES; l++) { if (f2[l] === sim.final[l]) continue; const ex = l % 2 ? 294 : 266, ey = 6 + l * 15.6 | 0; const alarmOn = ends[l] === 'alarm' && f2[l]; const col = alarmOn ? P.RD2 : ends[l] === 'alarm' ? P.GR2 : f2[l] ? P.YE : P.GR2; if (!alarmOn || (t * 3 | 0) % 2) { frame(ex - 2, ey - 1, 20, 17, col); frame(ex - 3, ey - 2, 22, 19, col); } }
      }
      if (arming && !over) { const on = (t * 8 | 0) % 2; frame(1, 0, W - 2, 168, on ? P.RD2 : P.YE); frame(2, 1, W - 4, 166, on ? P.RD2 : P.YE); msgBox(70, 70, 150, 24); textC('ALARM ARMING - SWAP BACK!', 145, 74, on ? P.RD2 : P.YE); textC(arming.toFixed(1) + ' s', 145, 83, P.W); }
      // bottom bar: bus strip, +5V / GND, chip in hand, clock
      rect(0, 168, W, 32, P.BL); for (let x = 36; x < 284; x += 4) { rect(x, 168, 2, 4, P.YE); rect(x + 2, 168, 2, 4, P.GR); }
      rect(4, 172, W - 8, 27, P.G1); rect(4, 172, W - 8, 1, P.G3); rect(4, 172, 1, 27, P.G3);
      rect(57, 173, 7, 26, P.BL2); rect(65, 173, 7, 26, P.BL2);
      g.save(); g.translate(63, 197); g.rotate(-Math.PI / 2); text('+5V.', 0, -6, P.CY); text('GND.', 0, 2, P.CY); g.restore();
      rect(190, 173, 50, 26, P.K); text('IN', 194, 177, P.YE); text('HAND', 194, 186, P.YE); drawChip(hand, 220, 178, false, false);
      rect(250, 178, 62, 13, P.K); frame(250, 178, 62, 13, P.G3);
      const mm = Math.floor(time / 60), ss = Math.floor(time % 60); text('00:' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0'), 256, 181, P.G3);
      text(tracer ? 'Tracer: cut ' + need + ' settings  ' + cutCount() + '/' + need : 'Phones cut ' + cutCount() + '/' + ends.filter(e => e === 'phone').length, 80, 176, P.W); text('Enter/tap: swap', 80, 186, P.G3);
      if (intro && !over) {
        msgBox(18, 14, W - 36, 160); frame(20, 16, W - 40, 156, P.G1);
        textC(tracer ? 'CAR TRACER' : 'WIRETAP: THE JUNCTION BOX', W / 2, 20, P.YE);
        const lines = tracer ? ['Power flows left to right through the chips.', 'Cut the power to ' + need + ' of the numbered tracer settings.'] : ['Power flows left to right through the chips.', 'Kill the power to every PHONE (right-hand side).', 'A dead phone line is a tapped phone line.'];
        lines.push('Never let power reach an ALARM (the bells).', 'Move with the arrows, Enter swaps the chip under the', 'cursor with the one in your HAND. On touch: tap a chip,', 'then tap it again to swap.', 'Framed chips are soldered in. ? chips are unknown.', 'If an alarm lights up, swap straight back!');
        lines.forEach((l, i) => text(l, 28, 30 + i * 9, i < (tracer ? 2 : 3) ? P.W : P.G3));
        const ly = 113; [['S', 'straight'], ['X', 'cross'], ['D', 'down'], ['U', 'up'], ['T', 'flip']].forEach(([k2, lab], i) => { const lx = 40 + i * 52; drawChip(k2, lx, ly, false, false); textC(lab, lx + 8, ly + 19, P.CY); });
        if (eff >= 1) text('T, B and I chips flip lanes: live becomes dead, dead live.', 28, 144, P.G3);
        if (preview) text('Frames on the right preview a swap: green cut, red alarm.', 28, eff >= 1 ? 153 : 144, P.GR2);
        if ((t * 2 | 0) % 2) textC('Press a key to start the clock', W / 2, 162, P.YE);
      }
      if (over) {
        rect(40, 56, W - 80, 58, P.K); frame(40, 56, W - 80, 58, P.W); frame(42, 58, W - 84, 54, P.G3);
        textC(over.win ? (tracer ? 'TRACER SET' : 'ALL PHONES TAPPED') : over.alarm ? 'ALARM!' : (!tracer && cutCount() ? cutCount() + ' PHONES TAPPED' : 'NO TAP'), W / 2, 64, over.win || (!tracer && !over.alarm && cutCount()) ? P.GR2 : P.RD2);
        para(over.win ? (tracer ? 'The tracer is live. You can follow the car at a safe distance.' : 'Every phone is dead and nobody noticed. Your bugs are on the lines.') : over.why, 52, 78, W - 104, P.W, 9);
        if (over.t > 0.6) textC('Press a key', W / 2, 102, P.G3);
      }
    },
  };
}
