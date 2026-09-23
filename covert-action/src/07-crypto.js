// ===================================================================
// CODEBREAKING: letter-substitution cipher against the clock
// ===================================================================
function cryptoScene(plain, opts, done) {
  const sk = game.agent ? game.agent.skills.crypto : 2;
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  // derangement key: no letter maps to itself
  let key; do { key = shuffle(A.split('')); } while (key.some((c, i) => c === A[i]));
  const enc = ch => A.includes(ch) ? key[A.indexOf(ch)] : ch;
  const cipher = plain.split('').map(enc).join('');
  const used = [...new Set(cipher.split('').filter(c => A.includes(c)))];
  const guess = {}; // cipher letter -> plain guess
  const given = new Set();
  // the analysts give you the most common letters
  const freq = {}; for (const c of cipher) if (A.includes(c)) freq[c] = (freq[c] || 0) + 1;
  const byFreq = used.slice().sort((a, b) => freq[b] - freq[a]);
  const nGiven = { 1: 1, 2: 3, 3: 4, 4: 6 }[sk] + (opts.practice ? 1 : 0);
  byFreq.slice(0, nGiven).forEach(c => { guess[c] = A[key.indexOf(c)]; given.add(c); });
  const time0 = 150 + sk * 25; let time = time0, over = null, t = 0;
  // layout lines of cells, breaking on spaces
  const CW = 8, maxCols = 37;
  const lines = []; { let cur = ''; for (const word of cipher.split(' ')) { if ((cur + (cur ? ' ' : '') + word).length > maxCols) { lines.push(cur); cur = word; } else cur = cur ? cur + ' ' + word : word; } if (cur) lines.push(cur); }
  const cells = []; lines.forEach((l, r) => { for (let i = 0; i < l.length; i++) cells.push({ ch: l[i], r, c: i }); });
  const letterCells = cells.filter(c => A.includes(c.ch));
  let cur = letterCells.findIndex(c => !given.has(c.ch)); if (cur < 0) cur = 0;
  const LH = 22, LY = 34 + Math.max(0, 5 - lines.length) * 10;
  const solved = () => used.every(c => guess[c] === A[key.indexOf(c)]);
  function setGuess(p) {
    const c = letterCells[cur].ch; if (given.has(c)) { sfx.deny(); return; }
    if (p) { for (const k in guess) if (guess[k] === p && k !== c && !given.has(k)) delete guess[k]; guess[c] = p; } else delete guess[c];
    sfx.tone(700 + A.indexOf(p || 'A') * 20, 0.04);
    // hop to the next unsolved letter
    if (p) { for (let i = 1; i <= letterCells.length; i++) { const j = (cur + i) % letterCells.length; if (!guess[letterCells[j].ch]) { cur = j; break; } } }
    if (solved()) { over = { win: true, t: 0 }; sfx.success(); }
  }
  function move(dx, dy) {
    const c = letterCells[cur];
    if (dy) { let best = -1, bd = 1e9; letterCells.forEach((o, i) => { if (o.r === c.r + dy) { const d = Math.abs(o.c - c.c); if (d < bd) { bd = d; best = i; } } }); if (best >= 0) cur = best; }
    else cur = (cur + dx + letterCells.length) % letterCells.length;
    sfx.blip();
  }
  const KY = 148, KW = 22, KH = 13;
  const keyAt = (x, y) => { if (y < KY || y >= KY + KH * 2 + 2) return null; const r = y < KY + KH + 1 ? 0 : 1; const i = Math.floor((x - 10) / KW); if (i < 0 || i > 12) return null; return A[r * 13 + i]; };
  return {
    typing: true,
    update(dt) { t += dt; if (over) { over.t += dt; return; } time -= dt; if (time <= 0) { time = 0; over = { win: false, t: 0 }; sfx.fail(); } else if (time < 20 && (time * 2 | 0) !== ((time + dt) * 2 | 0)) sfx.tick(); },
    onChar(ch) { if (over) return; setGuess(ch); },
    onKey(k) {
      if (over) { if (over.t > 0.6 && (k === 'select' || k === 'fire' || k === 'menu')) done({ success: over.win }); return; }
      if (k === 'left') move(-1, 0); else if (k === 'right') move(1, 0); else if (k === 'up') move(0, -1); else if (k === 'down') move(0, 1);
      else if (k === 'menu') { over = { win: false, t: 1, gaveUp: true }; }
    },
    onTap(x, y) {
      if (over) { if (over.t > 0.6) done({ success: over.win }); return; }
      const kk = keyAt(x, y); if (kk) { setGuess(kk); return; }
      if (y >= KY && y < KY + 30 && x > 10 + 13 * KW) { setGuess(''); return; }
      if (y > 186 && x > 250) { over = { win: false, t: 1, gaveUp: true }; return; }
      letterCells.forEach((c, i) => { const cx = 12 + c.c * CW, cy = LY + c.r * LH; if (x >= cx - 1 && x < cx + CW - 1 && y >= cy - 2 && y < cy + LH - 2) { cur = i; sfx.blip(); } });
    },
    draw() {
      rect(0, 0, W, H, P.K);
      // printout paper
      rect(4, 4, W - 8, 138, P.CR); for (let y = 4; y < 142; y += 20) rect(4, y + 10, W - 8, 10, '#dce8c8');
      for (let y = 8; y < 140; y += 8) { disc(9, y, 1, P.G4); disc(W - 10, y, 1, P.G4); }
      rect(4, 4, W - 8, 20, P.NV); text('CRYPTANALYSIS  -  ' + (opts.source || 'Intercepted message'), 12, 8, P.W);
      const k = time / time0; rect(12, 17, 200, 3, P.K); rect(12, 17, 200 * k, 3, k > 0.3 ? P.GR2 : P.RD2); textR(Math.ceil(time) + 's', W - 12, 12, k > 0.3 ? P.CY : P.RD2);
      const selC = letterCells[cur] && letterCells[cur].ch;
      cells.forEach(c => {
        const x = 12 + c.c * CW, y = LY + c.r * LH;
        if (!A.includes(c.ch)) { text(c.ch, x + 2, y, P.G2); return; }
        const isSel = c.ch === selC;
        if (isSel) rect(x - 1, y - 2, CW - 1, 19, (letterCells[cur] === c) ? P.YE : P.G5);
        text(c.ch, x + 1, y, P.G2);
        const gch = guess[c.ch]; rect(x, y + 15, CW - 3, 1, P.G3);
        if (gch) text(gch, x + 1, y + 8, given.has(c.ch) ? P.BL : over && !over.win && gch !== A[key.indexOf(c.ch)] ? P.RD : P.K);
      });
      // keyboard
      rect(0, 143, W, 57, P.K); bevel(4, 144, W - 8, 44, P.G2, P.G4, P.G1);
      for (let i = 0; i < 26; i++) { const r = Math.floor(i / 13), c = i % 13, x = 10 + c * KW, y = KY + r * (KH + 1); const usedBy = Object.keys(guess).find(k => guess[k] === A[i]); bevel(x, y, KW - 2, KH, usedBy ? P.G3 : P.G4, P.W, P.G2); textC(A[i], x + (KW - 2) / 2, y + 3, usedBy ? P.G2 : P.K); }
      bevel(10 + 13 * KW, KY, 20, KH * 2 + 1, P.RD, P.RD2, P.BR); textC('DEL', 10 + 13 * KW + 10, KY + 10, P.W);
      // frequency of the selected letter
      if (selC) text('Code ' + selC + ' appears ' + freq[selC] + 'x.  Most common: E T A O I N S', 8, 191, P.G4);
      if (over) {
        panel(30, 40, W - 60, 80);
        textC(over.win ? 'MESSAGE DECODED' : over.gaveUp ? 'DECODING ABANDONED' : 'OUT OF TIME', W / 2, 50, over.win ? P.GR2 : P.RD2);
        para(over.win ? plain : 'The message will be passed on to the analysts, but the trail will have gone cold.', 44, 64, W - 88, P.G5, 9);
        if (over.t > 0.6) textC('Press OK', W / 2, 110, P.G3);
      }
    },
  };
}
