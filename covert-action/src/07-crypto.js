// ===================================================================
// CRYPTO WORKSTATION: letter-substitution cipher against the clock
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
  // text layout: 6px cells, lines broken at spaces, hyphenated like the original if a word won't fit
  const CW = 6, X0 = 45, maxCols = 44, LH = 16, LY = 16;
  const lines = []; { let cur = ''; for (const word of cipher.split(' ')) { const cand = cur ? cur + ' ' + word : word; if (cand.length > maxCols) { lines.push(cur); cur = word; } else cur = cand; } if (cur) lines.push(cur); }
  for (let i = 0; i < lines.length; i++) if (lines[i].length > maxCols) lines.splice(i, 1, lines[i].slice(0, maxCols), lines[i].slice(maxCols));
  const cells = []; lines.forEach((l, r) => { for (let i = 0; i < l.length; i++) cells.push({ ch: l[i], r, c: i }); });
  const letterCells = cells.filter(c => A.includes(c.ch));
  let cur = letterCells.findIndex(c => !given.has(c.ch)); if (cur < 0) cur = 0;
  const solved = () => used.every(c => guess[c] === A[key.indexOf(c)]);
  // once enough is right the computer fills in the rest, as in the original
  const nearlySolved = () => used.filter(c => guess[c] === A[key.indexOf(c)]).length >= Math.ceil(used.length * 0.8);
  function hint() { const c = used.find(c => guess[c] !== A[key.indexOf(c)]); if (!c) return; guess[c] = A[key.indexOf(c)]; given.add(c); hints++; time += 120; sfx.select(); if (solved() || nearlySolved()) finishSolve(); }
  function finishSolve() { used.forEach(c => { guess[c] = A[key.indexOf(c)]; }); over = { win: true, t: 0 }; sfx.success(); }
  function setGuess(p) {
    const c = letterCells[cur].ch; if (given.has(c)) { sfx.deny(); return; }
    if (p) { for (const k in guess) if (guess[k] === p && k !== c && !given.has(k)) delete guess[k]; guess[c] = p; } else delete guess[c];
    sfx.tone(500 + A.indexOf(p || 'A') * 25, 0.03);
    if (p) for (let i = 1; i <= letterCells.length; i++) { const j = (cur + i) % letterCells.length; if (!guess[letterCells[j].ch]) { cur = j; break; } }
    if (solved() || nearlySolved()) finishSolve();
  }
  function move(dx, dy) {
    const c = letterCells[cur];
    if (dy) { let best = -1, bd = 1e9; letterCells.forEach((o, i) => { if (o.r === c.r + dy) { const d = Math.abs(o.c - c.c); if (d < bd) { bd = d; best = i; } } }); if (best >= 0) cur = best; }
    else cur = (cur + dx + letterCells.length) % letterCells.length;
    sfx.tick();
  }
  // on-screen letter picker for touch players
  const PX = 60, PY = 124, PW = 18, PH = 13;
  const pickAt = (x, y) => { const c = Math.floor((x - PX) / PW), r = Math.floor((y - PY) / PH); if (c < 0 || c > 12 || r < 0 || r > 1) return null; return A[r * 13 + c]; };
  const clock = s => { const m = Math.floor(s / 60), ss = Math.floor(s % 60); return '00:' + String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0'); };
  return {
    typing: true,
    update(dt) { t += dt; if (over) { over.t += dt; return; } time += dt; },
    onChar(ch) { if (over) return; picker = false; setGuess(ch); },
    onKey(k) {
      if (over) { if (over.t > 0.6 && (k === 'select' || k === 'fire' || k === 'menu')) done({ success: over.win, seconds: time, hints }); return; }
      if (k === 'left') move(-1, 0); else if (k === 'right') move(1, 0); else if (k === 'up') move(0, -1); else if (k === 'down') move(0, 1);
      else if (k === 'select' || k === 'fire') picker = !picker;
      else if (k === 'action' || k === 'alt') hint();
      else if (k === 'menu') { if (picker) picker = false; else over = { win: false, t: 1, gaveUp: true }; }
    },
    onTap(x, y) {
      if (over) { if (over.t > 0.6) done({ success: over.win, seconds: time, hints }); return; }
      if (picker) { const p = pickAt(x, y); if (p) { picker = false; setGuess(p); return; } if (y >= PY + 2 * PH && y < PY + 2 * PH + 12 && x >= PX && x < PX + 13 * PW) { picker = false; setGuess(''); return; } picker = false; return; }
      if (y > 188 && x > 260) { over = { win: false, t: 1, gaveUp: true }; return; }
      letterCells.forEach((c, i) => { const cx = X0 + c.c * CW, cy = LY + c.r * LH; if (x >= cx - 1 && x < cx + CW && y >= cy - 2 && y < cy + LH - 2) { cur = i; picker = true; sfx.tick(); } });
    },
    draw() {
      rect(0, 0, W, H, P.K);
      // title bar
      rect(34, 0, 286, 9, P.GR2); text('CRYPTO WORKSTATION, Msg#' + msgNo, 40, 1, P.K); textR(clock(time), W - 4, 1, P.W);
      // frequency column
      rect(0, 0, 33, 200, P.GR); rect(2, 2, 29, 196, P.K);
      A.split('').forEach((c, i) => {
        const y = 5 + i * 7.4; const n = freq[c] || 0;
        if (guess[c]) text(guess[c], 4, y - 1, P.CY);
        text(c, 12, y - 1, n ? P.GR2 : P.GR); if (n) textR(String(n), 30, y - 1, P.GR2);
      });
      const selC = letterCells[cur] && letterCells[cur].ch;
      cells.forEach((c, i) => {
        const x = X0 + c.c * CW, y = LY + c.r * LH;
        if (!A.includes(c.ch)) { text(c.ch, x + 1, y, P.GR2); return; }
        const isCur = letterCells[cur] === c;
        if (c.ch === selC && !over) rect(x - 1, y - 1, CW, 8, isCur ? ((t * 3 | 0) % 2 ? P.YE : P.BR) : P.BL);
        text(c.ch, x + 1, y, c.ch === selC && !over ? P.K : P.GR2);
        const gch = guess[c.ch];
        if (gch) text(gch, x + 1, y + 8, given.has(c.ch) ? P.W : over && !over.win && gch !== A[key.indexOf(c.ch)] ? P.RD2 : P.CY);
      });
      text('Type letters. E: hint (costs time). Esc: quit', X0, 189, P.GR);
      if (picker && !over) {
        rect(PX - 4, PY - 12, 13 * PW + 8, 2 * PH + 30, P.K); frame(PX - 4, PY - 12, 13 * PW + 8, 2 * PH + 30, P.GR2);
        text('Code letter ' + selC + ' stands for...', PX, PY - 9, P.GR2);
        for (let i = 0; i < 26; i++) { const x = PX + (i % 13) * PW, y = PY + Math.floor(i / 13) * PH; const taken = Object.values(guess).includes(A[i]); rect(x, y, PW - 2, PH - 2, taken ? P.G1 : P.GR); textC(A[i], x + (PW - 2) / 2, y + 2, taken ? P.G3 : P.K); }
        rect(PX, PY + 2 * PH, 13 * PW - 2, 11, P.RD); textC('clear this letter', PX + 13 * PW / 2, PY + 2 * PH + 2, P.W);
      }
      if (over) {
        rect(30, 50, W - 60, 90, P.K); frame(30, 50, W - 60, 90, P.GR2);
        textC(over.win ? 'MESSAGE DECODED' : 'DECODING ABANDONED', W / 2, 58, over.win ? P.GR2 : P.RD2);
        para(over.win ? plain : 'The message goes back in the pile for the analysts at Langley.', 42, 72, W - 84, P.CY, 9);
        if (over.t > 0.6) textC('Press a key', W / 2, 128, P.GR);
      }
    },
  };
}
