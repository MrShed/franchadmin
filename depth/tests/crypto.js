#!/usr/bin/env node
// Crypto round trips and attacks:
//  - checkerboard encode/decode for every keyword, all letters, stops and figures
//  - pad encrypt/decrypt, periodic encrypt/decrypt
//  - depth + crib: placing a true word in one message reveals the true text of the other
//  - depth solver recovers the true plaintexts (clean copies) and the operation facts
//  - period finder + column fit recovers periodic keys; the keyword search recovers the board (Chief)
//  - grading, plausibility separates language from noise
var DX = require('./load.js')();
var assert = require('assert');
var checks = 0;
function ok(c, m) { assert(c, m); checks++; }

// ---- checkerboards
var ALL = 'THEQUICKBROWNFOXJUMPSOVERTHELAZYDOG.0123456789.NR14KX7QUAY9AT2140';
DX.DATA.KEYWORDS.forEach(function (kw) {
  var b = DX.makeBoard(kw);
  ok(b.blanks[0] !== b.blanks[1], 'two blank columns ' + kw);
  var letters = {};
  b.top.forEach(function (x) { if (x) letters[x] = 1; });
  b.rows[b.blanks[0]].concat(b.rows[b.blanks[1]]).forEach(function (x) { letters[x] = 1; });
  ok(Object.keys(letters).length === 28, 'board has 26 letters + FIG + STOP ' + kw);
  'ETAONRIS'.split('').forEach(function (L) { ok(b.enc[L].length === 1, 'ESTONIA-R single digit ' + L + ' ' + kw); });
  ok(b.figCode[0] !== b.figCode[1], 'FIG code is not a doubled figure ' + kw);
  var d = DX.encode(b, ALL);
  ok(/^[0-9]+$/.test(d), 'digits only');
  ok(DX.decode(b, d).text === DX.norm(ALL), 'round trip ' + kw + ': ' + DX.decode(b, d).text);
});
// the view the UI draws
var bv = DX.boardView(DX.makeBoard('BALTIC'));
ok(bv.rows.length === 3 && bv.rows[0].cells.length === 10 && bv.rows[1].prefix !== '' && bv.fig && bv.stop, 'board view');

// ---- additive keys
var b0 = DX.makeBoard('HARBOUR');
var plain = DX.encode(b0, 'MEETR3MATCAFELILJATUESDAYAT2140.');
var pad = DX.rng('pad').digits(plain.length);
var ct = DX.addKey(plain, pad);
ok(DX.digitStr(DX.subKey(ct, pad)) === plain, 'pad round trip');
ct.forEach(function (x, i) { ok(x === (+plain[i] + +pad[i]) % 10, 'addition mod 10 without carry at ' + i); });
var key = [3, 0, 7, 1, 9];
var pc = DX.addKey(plain, key);
ok(DX.digitStr(DX.subKey(pc, key)) === plain, 'periodic round trip');
ok(DX.diff([5, 2, -1], [7, 2, 3]).join(',') === '8,0,-1', 'diff with unknowns');

// ---- depth + crib on generated cases
var periodic = { n: 0, ok: 0 };
var nPairs = 0, sumScore = 0, factsOk = 0, factsN = 0, cribHits = 0, cribN = 0;
for (var i = 1; i <= 8; i++) ['cadet', 'analyst', 'chief'].forEach(function (g) {
  var W = DX.makeWorld('crypto-' + i, g, 0), ring = W.ring, bd = ring.board, ctl = ring.controller;
  // every message decrypts with its own key
  W.plan.msgs.forEach(function (m) {
    var dg = DX.toDigits((m.cipher === 'pad' ? m.groups.slice(1) : m.groups).join(''));
    var k = m.cipher === 'pad' ? DX.toDigits(DX._padDigits(W, m)) : m.key;
    var txt = DX.decode(bd, DX.subKey(dg, k)).text;
    ok(txt.indexOf(m.norm) === 0, 'message decrypts ' + m.id + ' ' + g);
    if (m.cipher === 'pad') ok(m.groups[0] === m.page && /^[0-9]{5}$/.test(m.page), 'indicator group = page');
    m.groups.forEach(function (gr) { ok(/^[0-9]{5}$/.test(gr), 'group shape'); });
  });
  W.plan.pairs.forEach(function (p) {
    var a = W.msg[p.a], b = W.msg[p.b];
    ok(a.page === b.page, 'pair shares a page');
    var ca = DX.toDigits(a.groups.slice(1).join('')), cb = DX.toDigits(b.groups.slice(1).join(''));
    var d = DX.diff(ca, cb);
    // the depth difference equals the difference of the plaintext digit streams (the pad cancels)
    var pa = DX.toDigits(a.plain), pb = DX.toDigits(b.plain);
    for (var k = 0; k < d.length; k++) ok(d[k] === ((pa[k] - pb[k]) % 10 + 10) % 10, 'pad cancels in depth');
    // crib: a true word of A placed at its true offset shows the true text of B at that place
    var words = a.text.replace(/\./g, ' ').split(/\s+/).filter(function (w) { return w.length >= 5 && /^[A-Z]+$/.test(w); });
    words.slice(0, 3).forEach(function (w) {
      var pos = a.norm.indexOf(w), off = DX.encode(bd, a.norm.slice(0, pos)).length;
      if (off + DX.encode(bd, w).length > d.length) return;
      var r = DX.cribDrag(bd, d, w, off, 'A');
      cribN++;
      var bDigits = DX.digitStr(pb.slice(off, off + r.otherDigits.length));
      ok(r.otherDigits === bDigits, 'crib gives the other message\'s true digits');
      if (r.plaus >= 0.4) cribHits++;
    });
    // the dictionary solver reads both messages
    function fr(m) { return m.from === 'ctl' ? ctl.call : W.mem[m.from].call; }
    function to(m) { return m.to === 'ctl' ? ctl.call : W.mem[m.to].call; }
    var r2 = DX.solveDepth(bd, ca, cb, { calls: ring.members.map(function (m) { return m.call; }).concat([ctl.spell]),
      openA: DX.openingCribs(fr(a), to(a), ctl.spell, ctl.call), openB: DX.openingCribs(fr(b), to(b), ctl.spell, ctl.call) });
    ok(r2 && typeof r2.a === 'string', 'solver returns');
    var ga = DX.gradeText2(a.norm, r2.a), gb = DX.gradeText2(b.norm, r2.b);
    nPairs++; sumScore += (ga.score + gb.score) / 2;
    [[a, r2.a], [b, r2.b]].forEach(function (x) { x[0].facts.forEach(function (f) { if (f.fact === 'codeword') return; factsN++; if (DX.norm(x[1]).indexOf(DX.norm(f.value)) >= 0) factsOk++; }); });
  });
  // periodic: period finder + column fit (board held) / keyword search (no board)
  ring.members.filter(function (m) { return m.courier; }).forEach(function (cm) {
    var ms = W.plan.msgs.filter(function (m) { return m.from === cm.id; });
    var st = ms.map(function (m) { return DX.toDigits(m.groups.join('')); });
    var r = DX.solvePeriodic(st, g === 'chief' ? null : bd, { cribs: DX.openingTexts(cm.call, ring.resident.call, ctl.spell, ctl.call) });
    if (r.ok) {
      ok(r.key.length % cm.periodKey.length === 0, 'period is the key length or a multiple');
      var plains = st.map(function (s2) { return DX.decode(DX.boardCache(r.keyword), DX.subKey(s2, r.key)).text; });
      var good = plains.filter(function (t, k) { return DX.gradeText2(ms[k].norm, t).score > 0.9; }).length;
      ok(good >= ms.length - 1, 'periodic decrypt reads ' + g + ' ' + cm.call);
      if (g === 'chief') ok(r.keyword === ring.keyword, 'keyword search finds the board');
    }
    periodic.n++; if (r.ok) periodic.ok++;
  });
});
ok(sumScore / nPairs > 0.7, 'depth solver mean read ' + (sumScore / nPairs).toFixed(2));
ok(factsOk / factsN > 0.7, 'depth solver reads the operation facts ' + factsOk + '/' + factsN);
ok(cribHits / cribN > 0.6, 'true cribs read as plausible language ' + cribHits + '/' + cribN);

// ---- plausibility and grading
var lang = DX.plaus('TARGETFORLANTERNISQUAY7.STUDYTHEGUARDROUTINEANDREPORT.').score;
var junk = DX.plaus('QXZVKJWPQMZXLKQJWVZXQPLKJZXCVBNMQWERTYZX').score;
ok(lang > 0.7 && junk < 0.35, 'plausibility separates the ring\'s language (' + lang + ') from noise (' + junk + ')');
ok(DX.gradeText2('ABCDEFGHIJ', 'ABCDEFGHIJ').grade === 'right' && DX.gradeText2('ABCDEFGHIJ', 'ABC??FGH??').grade === 'partial' && DX.gradeText2('ABCDEFGHIJ', 'ZZZZ').grade === 'wrong', 'grading');
// IC: periodic stream shows its period
var b1 = DX.makeBoard('NORDLYS'), lines = DX.corpus().slice(0, 12).join(' ');
var s1 = DX.addKey(DX.encode(b1, lines), [4, 8, 1, 6, 2, 7]);
var icl = DX.icByPeriod([s1], 12);
ok(DX.bestPeriod(icl, DX.repeats([s1], 5)) % 6 === 0, 'period finder sees 6: ' + DX.bestPeriod(icl, DX.repeats([s1], 5)));
var cols = DX.columnFreq([s1], 6, b1);
ok(cols.map(function (c0) { return c0.fit[0].shift; }).join('') === '481627', 'column fit recovers the key');
var al = DX.alignColumns([s1], 6);
ok(al.rel.map(function (r, k) { return (r + 4) % 10; }).join('') === '481627', 'relative key alignment');
var sb = DX.searchBoard([s1.slice(0, 400)], 6);
ok(sb.keyword === 'NORDLYS' && sb.key.join('') === '481627', 'keyword search');

console.log('crypto: ' + checks + ' checks passed; depth solver mean read ' + (sumScore / nPairs).toFixed(3) + ' over ' + nPairs + ' pairs, facts ' + factsOk + '/' + factsN + '; periodic solved ' + periodic.ok + '/' + periodic.n);
