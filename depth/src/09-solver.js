/* DEPTH engine — 09-solver.js
 * The ideal analyst's tools, working ONLY from observable material (copied groups, the checkerboard if
 * held, the station's dictionary DX.vocab() and callsigns heard in the log):
 *   DX.solveDepth(board, ca, cb, opts) -> {a, b, score, placements:[{side, offset, text}], digitsA, digitsB}
 *       beam search: extend the lagging message word by word; every word placed in one message fixes the
 *       digits of the other through the depth difference, which must decode to the beginning of real words.
 *   DX.solvePeriodic(streams, board, opts) -> {period, key, texts, plaus} (board null: relative key + keyword search)
 *   DX.verifyWorld(W) -> {ok, routes, why}  generation acceptance: a competent analyst can stop the operation
 *       in time using the material the ring actually puts on the air (grade-aware).
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------- token tables per board
  function buildTokens(board, extraCalls) {
    var V = DX.vocab(), tot = 0;
    V.forEach(function (v) { tot += v.n; });
    var toks = [];
    V.forEach(function (v) {
      if (v.w.length === 1 && v.w !== 'I' && v.w !== 'A') return;
      toks.push({ t: v.w, c: v.w, d: DX.toDigits(DX.encode(board, v.w)), lp: 0 });
    });
    (extraCalls || []).forEach(function (cs) { toks.push({ t: cs, c: 'CALL', d: DX.toDigits(DX.encode(board, cs)), lp: -Math.log(Math.max(2, extraCalls.length)), call: true }); });
    toks.push({ t: '.', c: '.', d: DX.toDigits(board.stopCode), lp: 0 });
    // numbers: FIG, n doubled figures (unknown), FIG. -2 marks a figure digit that must equal its pair.
    [1, 2, 4].forEach(function (n) {
      var d = DX.toDigits(board.figCode);
      for (var i = 0; i < n; i++) d.push(-2, -3);
      d = d.concat(DX.toDigits(board.figCode));
      // each figure's value is a free choice: log(1/10) per figure
      toks.push({ t: '#' + n, c: '#', d: d, lp: Math.log(n === 4 ? 0.5 : n === 2 ? 0.35 : 0.15) - n * Math.log(10), num: n });
    });
    // single letters as a last resort (heavily penalised) so the beam can cross gaps
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(function (L) { toks.push({ t: L, c: null, d: DX.toDigits(board.enc[L]), lp: -11, letter: true }); });
    // trie over word letters for prefix checks
    var trie = {};
    toks.forEach(function (tk) { if (tk.num || tk.t === '.' || tk.letter) return; var n = trie; for (var i = 0; i < tk.t.length; i++) n = n[tk.t[i]] || (n[tk.t[i]] = {}); n.$ = 1; });
    var byFirst = [[], [], [], [], [], [], [], [], [], []];
    toks.forEach(function (tk) { var f = tk.d[0]; if (f >= 0) byFirst[f].push(tk); else for (var i = 0; i < 10; i++) byFirst[i].push(tk); });
    return { toks: toks, trie: trie, byFirst: byFirst };
  }
  var TCACHE = {};
  function tokensFor(board, calls) {
    var k = board.key + '|' + (calls || []).join(',');
    if (!TCACHE[k]) { TCACHE[k] = buildTokens(board, calls); var ks = Object.keys(TCACHE); if (ks.length > 30) delete TCACHE[ks[0]]; }
    return TCACHE[k];
  }
  DX._tokensFor = tokensFor;

  /** can `s` (letters, digits, '.', '?') be the beginning of a sequence of dictionary tokens? */
  function validPrefix(trie, s) {
    var memo = {};
    function go(i, node, atRoot) {
      if (i >= s.length) return true;
      var key = i + (atRoot ? 'r' : '') + (node === trie ? '' : ':' + nodeId(node));
      if (memo[key] !== undefined) return memo[key];
      var ch = s[i], ok = false;
      if (atRoot && (ch === '.' || (ch >= '0' && ch <= '9'))) ok = go(i + 1, trie, true);
      if (!ok && ch === '?') {
        if (atRoot) ok = go(i + 1, trie, true); // unknown: be generous
        else { for (var k in node) { if (k === '$' || k === '#id') continue; if (go(i + 1, node[k], false)) { ok = true; break; } } if (!ok && node.$) ok = go(i, trie, true); }
      } else if (!ok) {
        var nx = node[ch];
        if (nx && go(i + 1, nx, false)) ok = true;
        if (!ok && !atRoot && node.$) ok = go(i, trie, true);
      }
      memo[key] = ok;
      return ok;
    }
    return go(0, trie, true);
  }
  var NID = 1;
  function nodeId(n) { if (!n['#id']) Object.defineProperty(n, '#id', { value: NID++, enumerable: false }); return n['#id']; }
  DX._validPrefix = validPrefix;

  // ---------------------------------------------------------------- depth solver
  DX.solveDepth = function (board, ca, cb, opts) {
    opts = opts || {};
    var beamW = opts.beam || 40, calls = opts.calls || [];
    var LMW = DX.wordLM();
    var TK = tokensFor(board, calls), toks = TK.toks;
    var L = Math.min(ca.length, cb.length);
    var diff = new Int8Array(L);
    for (var i = 0; i < L; i++) diff[i] = ca[i] < 0 || cb[i] < 0 ? -1 : ((ca[i] - cb[i]) % 10 + 10) % 10;
    var init = { A: new Int8Array(L).fill(-1), B: new Int8Array(L).fill(-1), f: [0, 0], score: 0, tk: [[], []], prev: [['^', '^'], ['^', '^']], force: [null, null] };
    // cribs: candidate openings per side (token lists); every combination seeds the beam, plus a free start
    var oa = opts.openA && opts.openA.length ? opts.openA : [null], ob = opts.openB && opts.openB.length ? opts.openB : [null];
    var beam = [], done = [];
    oa.forEach(function (x) { ob.forEach(function (y) { var s0 = Object.assign({}, init); s0.force = [x, y]; beam.push(s0); }); });
    var byText = {};
    toks.forEach(function (tk) { byText[tk.t] = tk; });
    var maxSteps = opts.maxSteps || 140;
    for (var step = 0; step < maxSteps && beam.length; step++) {
      var next = [];
      beam.forEach(function (st) {
        var side = st.f[0] <= st.f[1] ? 0 : 1, fS = st.f[side], fO = st.f[1 - side];
        if (fS >= L - 1) { done.push(st); return; }
        var S = side === 0 ? st.A : st.B, O = side === 0 ? st.B : st.A;
        var any = false, cand = S[fS] >= 0 ? TK.byFirst[S[fS]] : toks;
        var fz = st.force[side];
        if (fz && st.tk[side].length < fz.length) { var ft = byText[fz[st.tk[side].length]]; cand = ft ? [ft] : []; }
        for (var ti = 0; ti < cand.length; ti++) {
          var tk = cand[ti], d = tk.d;
          if (fS + d.length > L + 4) continue;
          // match against digits already fixed on this side (derived from the other message)
          var ok = true, pairV = -1;
          for (var j = 0; j < d.length; j++) {
            var pos = fS + j; if (pos >= L) break;
            var have = S[pos], want = d[j];
            if (want === -2) { pairV = have; continue; }
            if (want === -3) { if (have >= 0 && pairV >= 0 && have !== pairV) { ok = false; break; } pairV = -1; continue; }
            if (have >= 0 && have !== want) { ok = false; break; }
          }
          if (!ok) continue;
          var nf = Math.min(L, fS + d.length);
          // new digits beyond the other side's frontier fix the other message: check it reads as words
          var newS = null;
          if (nf > fO) {
            newS = [];
            var otherTail = [];
            for (var q = fO; q < nf; q++) {
              var sd = q - fS >= 0 && q - fS < d.length ? d[q - fS] : -1;
              if (sd < 0) sd = S[q];
              var od = sd >= 0 && diff[q] >= 0 ? (side === 0 ? ((sd - diff[q]) % 10 + 10) % 10 : (sd + diff[q]) % 10) : -1;
              otherTail.push(od);
            }
            // decode other side from its frontier: its known digits [fO, nf)
            // only the stretch before the first unknown digit can be checked (after a gap the code alignment is lost)
            var dec = DX.decode(board, otherTail).text, qm = dec.indexOf('?');
            if (qm >= 0) dec = dec.slice(0, qm);
            if (dec && !validPrefix(TK.trie, dec)) continue;
          }
          any = true;
          var pv = st.prev[side];
          var ns = { A: st.A, B: st.B, f: st.f.slice(), score: st.score + tk.lp + (tk.c ? LMW.lp(pv[0], pv[1], tk.c) : -2), tk: [st.tk[0], st.tk[1]], prev: st.prev.slice(), force: st.force };
          ns.prev[side] = tk.c ? [pv[1], tk.c] : pv;
          var nS = new Int8Array(S), nO = O;
          for (var j2 = 0; j2 < d.length && fS + j2 < L; j2++) { var w = d[j2]; if (w >= 0) nS[fS + j2] = w; }
          if (nf > fO) {
            nO = new Int8Array(O);
            for (var q2 = fO; q2 < nf; q2++) { var sd2 = nS[q2]; nO[q2] = sd2 >= 0 && diff[q2] >= 0 ? (side === 0 ? ((sd2 - diff[q2]) % 10 + 10) % 10 : (sd2 + diff[q2]) % 10) : -1; }
          }
          if (side === 0) { ns.A = nS; ns.B = nO; } else { ns.B = nS; ns.A = nO; }
          ns.f[side] = nf;
          ns.tk[side] = st.tk[side].concat([{ t: tk.t, at: fS, num: tk.num || 0 }]);
          next.push(ns);
        }
        if (!any) done.push(st);
      });
      // rank: log-probability per digit covered; keep diversity by frontier pair
      next.forEach(function (s2) { s2.rank = s2.score / Math.max(1, s2.f[0] + s2.f[1]); });
      next.sort(function (x, y) { return y.rank - x.rank; });
      var seen = {}, nb = [];
      for (var k = 0; k < next.length && nb.length < beamW; k++) {
        var s3 = next[k], key = s3.f[0] + ',' + s3.f[1] + ',' + (s3.force[0] && s3.tk[0].length < s3.force[0].length ? 'F' + oa.indexOf(s3.force[0]) : '') + (s3.force[1] && s3.tk[1].length < s3.force[1].length ? 'G' + ob.indexOf(s3.force[1]) : '') + ',' + s3.tk[0].map(function (x) { return x.t; }).slice(-2).join('') + '/' + s3.tk[1].map(function (x) { return x.t; }).slice(-2).join('');
        if (seen[key]) continue; seen[key] = 1; nb.push(s3);
      }
      beam = nb;
    }
    done = done.concat(beam);
    if (!done.length) return null;
    // prefer states that read further; among those, the more probable text
    done.forEach(function (s4) { var cov = s4.f[0] + s4.f[1]; s4.rank2 = s4.score / Math.max(1, cov) - 3 * (1 - cov / (2 * L)); });
    done.sort(function (x, y) { return y.rank2 - x.rank2; });
    var best = done[0];
    var ta = DX.decode(board, Array.from(best.A)).text, tb = DX.decode(board, Array.from(best.B)).text;
    var placements = [];
    [0, 1].forEach(function (sd3) { best.tk[sd3].forEach(function (t) { if (!t.num && t.t !== '.') placements.push({ side: sd3 ? 'B' : 'A', offset: t.at, text: t.t }); }); });
    return { a: ta, b: tb, score: best.score, rank: DX.round(best.rank2, 3), placements: placements, digitsA: DX.digitStr(Array.from(best.A)), digitsB: DX.digitStr(Array.from(best.B)), len: L,
      covered: [best.f[0], best.f[1]], tokensA: best.tk[0].map(function (x) { return x.t; }), tokensB: best.tk[1].map(function (x) { return x.t; }) };
  };

  /** the ring's opening habits as crib token lists, for a message from `from` to `to` (callsigns as heard).
   *  ctlSpell: how the controller's callsign is spelt in text (e.g. SAEL). */
  DX.openingCribs = function (from, to, ctlSpell, ctlCall) {
    var T = DX.TEMPLATES, out = [];
    var isCtl = from === ctlCall, sp = function (x) { return x === ctlCall ? ctlSpell : x; };
    (isCtl ? T.ctlOpen : T.agOpen).forEach(function (tpl) {
      var line = tpl.replace('{TO}', sp(to)).replace('{FROM}', sp(from)).replace('{NR}', '#2');
      var toks = [];
      line.replace(/\./g, ' . ').split(/\s+/).forEach(function (w) {
        if (!w) return;
        if (w === sp(to) || w === sp(from)) { toks.push(w); return; }
        w.replace(/#2|[A-Z]+|\./g, function (x) { toks.push(x); return x; });
      });
      out.push(toks);
    });
    return out;
  };

  // ---------------------------------------------------------------- periodic solver
  /** streams: digit arrays (same key, each starting at key position 0). board may be null (then keyword search). */
  DX.solvePeriodic = function (streams, board, opts) {
    opts = opts || {};
    var ic = DX.icByPeriod(streams, 12), reps = DX.repeats(streams, 5);
    var p = opts.period || DX.bestPeriod(ic, reps);
    var keyword = board ? board.key : null, key, plaus;
    if (!board) {
      var sb = DX.searchBoard(streams, p);
      if (!sb || sb.plaus < 0.55) return { ok: false, period: p, plaus: sb ? sb.plaus : 0 };
      board = DX.boardCache(sb.keyword); keyword = sb.keyword; key = sb.key; plaus = sb.plaus;
    } else {
      key = DX.columnFreq(streams, p, board).map(function (col) { return col.fit[0].shift; });
      var r = DX.refineKey(streams, board, key);
      key = r.key; plaus = r.plaus;
    }
    return { ok: plaus >= 0.5, period: p, key: key, keyword: keyword, plaus: plaus, texts: streams.map(function (s) { return DX.decode(board, DX.subKey(s, key)).text; }) };
  };

  // ---------------------------------------------------------------- generation acceptance
  /** what a competent analyst can read, and when. Uses the true ciphertext (clean copies: the repeat broadcasts
   *  and a decent receiver make that realistic) but only observable tools. */
  DX.verifyWorld = function (W) {
    var G = W.G, plan = W.plan, op = W.op, board = W.ring.board, SH = 480;
    var calls = W.ring.members.map(function (m) { return m.call; });
    function abs(tx) { return tx.night * SH + tx.minute + tx.dur; }
    function firstHeard(m) { var ts = (m.txs || []).map(function (id) { return W.tx[id]; }).filter(Boolean); return ts.length ? Math.min.apply(null, ts.map(abs)) : Infinity; }
    function cipherDigits(m) { return DX.toDigits((m.cipher === 'pad' ? m.groups.slice(1) : m.groups).join('')); }
    var known = {};   // fact -> abs minute when readable
    function learn(fact, t) { if (known[fact] === undefined || t < known[fact]) known[fact] = t; }
    function learnFrom(m, text, t) {
      var nt = DX.norm(text);
      m.facts.forEach(function (f) { if (f.fact !== 'codeword' && nt.indexOf(DX.norm(f.value)) >= 0) learn(f.fact + ':' + f.key, t); });
    }
    // board availability (Chief: from the courier traffic)
    var boardAt = G.boardHeld ? 0 : Infinity;
    var couriers = W.ring.members.filter(function (m) { return m.courier; });
    var routes = [];
    couriers.forEach(function (cm) {
      var ms = plan.msgs.filter(function (m) { return m.from === cm.id; }).sort(function (a, b) { return firstHeard(a) - firstHeard(b); });
      // try with the first k messages as they arrive
      for (var k = 2; k <= ms.length; k++) {
        var sub = ms.slice(0, k);
        var r = DX.solvePeriodic(sub.map(cipherDigits), G.boardHeld ? board : null);
        if (r.ok) {
          var t = Math.max.apply(null, sub.map(firstHeard)) + (G.boardHeld ? 30 : 90);
          if (!G.boardHeld) boardAt = Math.min(boardAt, t);
          ms.forEach(function (m) { var tm = Math.max(t, firstHeard(m) + 20); var dd = DX.decode(board, DX.subKey(cipherDigits(m), r.key)).text; learnFrom(m, dd, tm); });
          routes.push('periodic:' + cm.call + '@' + t);
          break;
        }
      }
    });
    // depth pairs
    plan.pairs.forEach(function (p) {
      var a = W.msg[p.a], b = W.msg[p.b];
      var t = Math.max(firstHeard(a), firstHeard(b), boardAt) + 40;
      if (!isFinite(t)) return;
      var r = DX.solveDepth(board, cipherDigits(a), cipherDigits(b), { calls: calls });
      if (!r) return;
      var ga = DX.gradeText2(a.norm, r.a), gb = DX.gradeText2(b.norm, r.b);
      learnFrom(a, r.a, t); learnFrom(b, r.b, t);
      routes.push('depth:' + p.a + '/' + p.b + ' ' + ga.score + '/' + gb.score);
    });
    // lifts: the executor's drop, if its site and night have been read in time
    var dropX = plan.drops[0], spotCode = DX.norm(W.place[dropX.place].code);
    var dropKnownAt = Infinity;
    plan.msgs.forEach(function (m) {
      if (m.norm.indexOf(spotCode) >= 0 && m.norm.indexOf('PACKAGEFOR') >= 0) {
        // read through the periodic route?
        if (m.cipher === 'periodic' && routes.some(function (r) { return r.indexOf('periodic:' + W.mem[m.from].call) === 0; })) dropKnownAt = Math.min(dropKnownAt, firstHeard(m) + 60);
      }
    });
    var dropEnd = dropX.collect.night * SH + dropX.collect.minute;
    if (dropKnownAt < dropEnd - 70) { learn('lift', Math.max(dropKnownAt, dropX.night * SH + dropX.after) + 60); routes.push('lift'); }
    // decide
    var opAbs = op.night * SH + op.minute;
    var where = known['where:OPPLACE'], when = known['when:OPDAY'], who = known['who:EXEC'];
    var lift = known.lift;
    var stake = Math.max(where === undefined ? Infinity : where, when === undefined ? Infinity : when);
    if (lift !== undefined) stake = Math.min(stake, lift);
    var ok = false, why = [];
    if (stake < opAbs - 60) { ok = true; why.push('stake-out'); }
    // arrest: WHO known, then DF + van on a later transmission of the executor that lasts >= 4 minutes
    if (who !== undefined) {
      var ex = W.mem[op.executor];
      var exTx = plan.txs.filter(function (t) { return t.fromId === ex.id && t.night * SH + t.minute > who && t.dur >= 4 && t.night * SH + t.minute + WDELAY(G) < opAbs - 10; });
      if (exTx.length) { ok = true; why.push('arrest'); }
    }
    // meeting watch -> executor located
    var mt = plan.meet;
    if (mt.agent === op.executor) {
      var meetMsg = plan.msgs.filter(function (m) { return m.beat === 'MEET'; })[0];
      if (meetMsg && plan.pairs.some(function (p) { return p.a === meetMsg.id || p.b === meetMsg.id; })) { ok = true; why.push('meeting'); }
    }
    // not too easy on the harder grades: something must need breaking (no fact is in clear anyway)
    return { ok: ok, why: why, routes: routes, known: known };
  };
  function WDELAY(G) { return G.id === 'cadet' ? 60 : G.id === 'analyst' ? 90 : 120; }
})();
