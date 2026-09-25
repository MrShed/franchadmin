/* DEPTH engine — 04-crypto.js
 * Real hand-cipher machinery, all pure functions on strings of digits.
 *
 *  Straddling checkerboard (DX.makeBoard(keyword)): a keyword-mixed alphabet; the eight letters of ESTONIA-R
 *  ('ETAONRIS') take one digit, the other 18 letters plus FIG (figure shift, '/') and STOP ('.') take two digits
 *  (row prefix = one of the two blank columns of the top row). Figures: FIG, each figure written twice, FIG.
 *  One-time pad: digit-wise addition mod 10 without carry; a message starts with an indicator group (page no).
 *  Periodic additive key: the same digits added cyclically (couriers).
 *
 *  Analysis: depth difference, crib drag with plausibility, index of coincidence per period, repeated sequences,
 *  column frequencies against the checkerboard's expected digit frequencies, relative key alignment (mutual IC),
 *  keyword search for the board (Chief: "time on the big computer").
 * Digit arrays use -1 for an unknown digit ('?').
 */
(function () {
  'use strict';

  var ESTONIAR = 'ETAONRIS';
  var FIG = '/', STOP = '.';

  /** normalise any text to the cipher alphabet: A-Z, 0-9 and '.' (Æ->AE, Ø->OE, Å->AA, ...), spaces dropped */
  DX.norm = function (t) {
    t = String(t || '').toUpperCase().replace(/Æ/g, 'AE').replace(/Ø/g, 'OE').replace(/Å/g, 'AA').replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE');
    return t.replace(/[^A-Z0-9.?]/g, '');
  };

  /** keyword -> board {key, blanks:[p1,p2], top:[10 chars|null], rows:{p1:[10], p2:[10]}, enc:{ch:code}, figCode, stopCode} */
  DX.makeBoard = function (keyword) {
    keyword = DX.norm(keyword).replace(/[^A-Z]/g, '');
    var seen = {}, seq = [];
    (keyword + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ').split('').forEach(function (ch) { if (!seen[ch]) { seen[ch] = 1; seq.push(ch); } });
    var top = seq.filter(function (ch) { return ESTONIAR.indexOf(ch) >= 0; });
    var rest = seq.filter(function (ch) { return ESTONIAR.indexOf(ch) < 0; });
    var h = DX.hash('board:' + keyword);
    var p1 = h % 10, p2 = (p1 + 1 + (Math.floor(h / 10) % 9)) % 10;
    if (p2 < p1) { var tt = p1; p1 = p2; p2 = tt; }
    var topRow = [], k = 0, c;
    for (c = 0; c < 10; c++) topRow.push(c === p1 || c === p2 ? null : top[k++]);
    var r1 = rest.slice(0, 10), r2 = rest.slice(10, 18);
    // FIG and STOP in the last two cells of the second row; FIG's column must differ from its row digit
    if (p2 === 8) { r2.push(STOP); r2.push(FIG); } else { r2.push(FIG); r2.push(STOP); }
    var rows = {}; rows[p1] = r1; rows[p2] = r2;
    var enc = {};
    topRow.forEach(function (ch, col) { if (ch) enc[ch] = String(col); });
    r1.forEach(function (ch, col) { enc[ch] = '' + p1 + col; });
    r2.forEach(function (ch, col) { enc[ch] = '' + p2 + col; });
    return { key: keyword, blanks: [p1, p2], top: topRow, rows: rows, enc: enc, figCode: enc[FIG], stopCode: enc[STOP] };
  };

  /** a plain, UI-friendly view of the board */
  DX.boardView = function (b) {
    if (!b) return null;
    return { key: b.key, blanks: b.blanks.slice(), cols: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      rows: [{ prefix: '', cells: b.top.map(function (x) { return x || ''; }) }, { prefix: String(b.blanks[0]), cells: b.rows[b.blanks[0]].slice() }, { prefix: String(b.blanks[1]), cells: b.rows[b.blanks[1]].slice() }],
      fig: b.figCode, stop: b.stopCode, codes: DX.copy(b.enc) };
  };

  /** text -> digit string (letters, '.', figures doubled between FIG codes) */
  DX.encode = function (b, text) {
    text = DX.norm(text).replace(/\?/g, '');
    var out = '', fig = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch >= '0' && ch <= '9') {
        if (!fig) { out += b.figCode; fig = true; }
        out += ch + ch;
      } else {
        if (fig) { out += b.figCode; fig = false; }
        out += b.enc[ch];
      }
    }
    if (fig) out += b.figCode;
    return out;
  };

  /** digits (string or array with -1 for unknown) -> {text, map:[digitIndex per char], bad:n}
   *  Unknown digits produce '?'. skip = digits to skip at the start (alignment). */
  DX.decode = function (b, digits, skip) {
    var d = typeof digits === 'string' ? digits.split('').map(function (x) { return x === '?' ? -1 : +x; }) : digits;
    var i = skip || 0, text = '', map = [], bad = 0, fig = false;
    var p1 = b.blanks[0], p2 = b.blanks[1], fc = b.figCode;
    while (i < d.length) {
      var x = d[i];
      if (fig) {
        if (i + 1 >= d.length) break;
        var y = d[i + 1];
        if (x < 0 || y < 0) { text += '?'; map.push(i); i += 2; continue; }
        if ('' + x + y === fc) { fig = false; i += 2; continue; }
        if (x === y) { text += String(x); map.push(i); i += 2; continue; }
        // not a figure pair: drop out of figures (resync)
        fig = false; bad++; continue;
      }
      if (x < 0) { text += '?'; map.push(i); i += 1; continue; }
      if (x === p1 || x === p2) {
        if (i + 1 >= d.length) { text += '?'; map.push(i); break; }
        var y2 = d[i + 1];
        if (y2 < 0) { text += '?'; map.push(i); i += 2; continue; }
        var ch = b.rows[x][y2];
        if (ch === FIG) { fig = true; i += 2; continue; }
        text += ch; map.push(i); i += 2; continue;
      }
      text += b.top[x]; map.push(i); i += 1;
    }
    return { text: text, map: map, bad: bad };
  };

  DX.toDigits = function (s) {
    if (Array.isArray(s)) return s.slice();
    return String(s).replace(/\s+/g, '').split('').map(function (x) { return x === '?' ? -1 : +x; });
  };
  DX.digitStr = function (arr) { return arr.map(function (x) { return x < 0 ? '?' : String(x); }).join(''); };
  DX.groupsOf = function (digitStr) { var g = []; for (var i = 0; i < digitStr.length; i += 5) g.push(digitStr.slice(i, i + 5)); return g; };

  // ---------------------------------------------------------------- additive keys
  /** add key (array/string, cycled if periodic) to plain digits, mod 10, no carry */
  DX.addKey = function (plain, key, sign) {
    var p = DX.toDigits(plain), k = DX.toDigits(key), out = [];
    sign = sign || 1;
    for (var i = 0; i < p.length; i++) {
      var kk = k[i % k.length];
      if (p[i] < 0 || kk === undefined || kk < 0) { out.push(-1); continue; }
      out.push(((p[i] + sign * kk) % 10 + 10) % 10);
    }
    return out;
  };
  DX.subKey = function (cipher, key) { return DX.addKey(cipher, key, -1); };
  /** a minus b, digit-wise mod 10; -1 where either unknown */
  DX.diff = function (a, b) {
    a = DX.toDigits(a); b = DX.toDigits(b);
    var n = Math.min(a.length, b.length), out = [];
    for (var i = 0; i < n; i++) out.push(a[i] < 0 || b[i] < 0 ? -1 : ((a[i] - b[i]) % 10 + 10) % 10);
    return out;
  };

  // ---------------------------------------------------------------- language model (lazy; built from the ring's corpus)
  var LM = null;
  DX.lang = function () {
    if (LM) return LM;
    var corpus = DX.corpus ? DX.corpus() : ['THE QUICK BROWN FOX'];
    var uni = {}, bi = {}, nu = 0, nb = 0, words = {};
    corpus.forEach(function (line) {
      line.split(/\s+/).forEach(function (w) { w = DX.norm(w); if (w && /[A-Z]/.test(w)) words[w] = (words[w] || 0) + 1; });
      var t = DX.norm(line).replace(/[0-9]+/g, '#');
      for (var i = 0; i < t.length; i++) {
        uni[t[i]] = (uni[t[i]] || 0) + 1; nu++;
        if (i > 0) { var bg = t[i - 1] + t[i]; bi[bg] = (bi[bg] || 0) + 1; nb++; }
      }
    });
    var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ.#';
    var luni = {}, lbi = {};
    alpha.split('').forEach(function (a) {
      luni[a] = Math.log(((uni[a] || 0) + 0.5) / (nu + 14));
      alpha.split('').forEach(function (b) {
        var ca = uni[a] || 0;
        lbi[a + b] = Math.log(((bi[a + b] || 0) + 0.2) / (ca + 0.2 * alpha.length));
      });
    });
    // trie of vocabulary words for coverage
    var trie = {};
    Object.keys(words).forEach(function (w) { var n = trie; for (var i = 0; i < w.length; i++) { n = n[w[i]] || (n[w[i]] = {}); } n.$ = 1; });
    var freq = {};
    alpha.split('').forEach(function (a) { freq[a] = (uni[a] || 0) / nu; });
    LM = { luni: luni, lbi: lbi, trie: trie, words: words, freq: freq };
    return LM;
  };
  DX._resetLang = function () { LM = null; };

  /** plausibility of a decoded fragment as the ring's language: {score 0..1, bigram, cover, words:[...]} */
  DX.plaus = function (text) {
    var L = DX.lang();
    var t = String(text || '').replace(/[0-9]+/g, '#');
    if (!t.length) return { score: 0, bigram: 0, cover: 0, words: [] };
    var s = 0, n = 0;
    for (var i = 1; i < t.length; i++) {
      var bg = t[i - 1] + t[i];
      if (t[i] === '?' || t[i - 1] === '?') continue;
      if (L.lbi[bg] !== undefined) { s += L.lbi[bg]; n++; }
    }
    var avg = n ? s / n : -3.3;
    // random letters ~ -3.6 per bigram, the ring's prose ~ -2.2
    var bigram = DX.clamp((avg + 3.6) / 1.4, 0, 1);
    // dictionary coverage: greedy longest word match (words of length >= 3), digits and stops count as covered
    var covered = 0, found = [], j = 0;
    while (j < t.length) {
      if (t[j] === '#' || t[j] === '.') { covered++; j++; continue; }
      var node = L.trie, best = 0;
      for (var k = j; k < t.length && node; k++) { node = node[t[k]]; if (node && node.$ && k - j + 1 >= 2) best = k - j + 1; }
      if (best >= 3 || (best === 2 && j + 2 <= t.length)) { found.push(t.slice(j, j + best)); covered += best; j += best; }
      else j++;
    }
    var known = t.replace(/\?/g, '').length || 1;
    var cover = DX.clamp(covered / known, 0, 1);
    var score = DX.clamp(0.45 * bigram + 0.55 * cover, 0, 1);
    return { score: DX.round(score, 3), bigram: DX.round(bigram, 3), cover: DX.round(cover, 3), words: found.filter(function (w) { return w.length >= 3; }) };
  };

  /** expected digit frequencies of the board applied to the ring's language (array of 10, sums to 1) */
  DX.boardExpect = function (b) {
    if (b._expect) return b._expect;
    var L = DX.lang(), f = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], tot = 0;
    Object.keys(L.freq).forEach(function (ch) {
      var w = L.freq[ch]; if (!w) return;
      var code = ch === '#' ? b.figCode + '11' + b.figCode : b.enc[ch];
      if (!code) return;
      for (var i = 0; i < code.length; i++) { f[+code[i]] += w; tot += w; }
    });
    b._expect = f.map(function (x) { return (x + 1e-3) / (tot + 1e-2); });
    return b._expect;
  };

  // ---------------------------------------------------------------- crib drag on a depth
  /** diff = A - B. Place crib text on `side` ('A' or 'B') at digit offset; returns the other side's digits and decode. */
  DX.cribDrag = function (b, diff, crib, offset, side) {
    var cd = DX.toDigits(DX.encode(b, crib)), other = [];
    for (var i = 0; i < cd.length; i++) {
      var dd = diff[offset + i];
      if (dd === undefined) break;
      if (dd < 0) { other.push(-1); continue; }
      other.push(side === 'B' ? (cd[i] + dd) % 10 : ((cd[i] - dd) % 10 + 10) % 10);
    }
    var alts = [0, 1].map(function (skip) {
      var dec = DX.decode(b, other, skip), pl = DX.plaus(dec.text);
      return { skip: skip, text: dec.text, plaus: pl.score, words: pl.words };
    });
    alts.sort(function (x, y) { return y.plaus - x.plaus; });
    return { cribDigits: DX.digitStr(cd), otherDigits: DX.digitStr(other), other: alts[0].text, plaus: alts[0].plaus, words: alts[0].words, skip: alts[0].skip, alts: alts, fits: cd.length === other.length };
  };

  // ---------------------------------------------------------------- periodic analysis
  function icOf(counts) {
    var n = 0, s = 0;
    for (var d = 0; d < 10; d++) { n += counts[d]; s += counts[d] * (counts[d] - 1); }
    return n > 1 ? s / (n * (n - 1)) : 0;
  }
  DX.ic = icOf;
  /** streams: array of digit arrays (each starts at key position 0). -> [{period, ic}] for 1..maxP */
  DX.icByPeriod = function (streams, maxP) {
    maxP = maxP || 12;
    var out = [];
    for (var p = 1; p <= maxP; p++) {
      var tot = 0, w = 0;
      for (var col = 0; col < p; col++) {
        var cnt = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], n = 0;
        streams.forEach(function (s) { for (var i = col; i < s.length; i += p) if (s[i] >= 0) { cnt[s[i]]++; n++; } });
        if (n > 1) { tot += icOf(cnt) * n; w += n; }
      }
      out.push({ period: p, ic: DX.round(w ? tot / w : 0, 4) });
    }
    return out;
  };
  /** repeated digit sequences (length >= minLen) and their spacings */
  DX.repeats = function (streams, minLen) {
    minLen = minLen || 5;
    var seen = {}, out = [];
    streams.forEach(function (s, si) {
      for (var i = 0; i + minLen <= s.length; i++) {
        var ok = true, key = '';
        for (var k = 0; k < minLen; k++) { if (s[i + k] < 0) { ok = false; break; } key += s[i + k]; }
        if (!ok) continue;
        (seen[key] = seen[key] || []).push([si, i]);
      }
    });
    Object.keys(seen).forEach(function (k) {
      var at = seen[k];
      if (at.length < 2) return;
      for (var a = 1; a < at.length; a++) {
        out.push({ seq: k, spacing: Math.abs(at[a][1] - at[0][1]), at: at.map(function (x) { return { msg: x[0], pos: x[1] }; }) });
      }
    });
    out = out.filter(function (r) { return r.spacing > 0; });
    out.sort(function (x, y) { return x.spacing - y.spacing; });
    return out.slice(0, 24);
  };
  /** the period suggested by IC and spacings (tool help): the smallest period whose IC excess over random
   *  is close to the best (multiples of the true period score as well), nudged by long repeats */
  DX.bestPeriod = function (icList, reps) {
    // score each candidate by the IC excess averaged over its multiples (the true period and all its multiples
    // are high; a chance peak is alone), plus long repeats whose spacing it divides
    var ic = {}, base = 0.1;
    icList.forEach(function (r) { ic[r.period] = r.ic - base; });
    var maxP = icList.length, best = 2, bestS = -1e9;
    for (var p = 2; p <= maxP; p++) {
      var sum = 0, n = 0;
      for (var k = p; k <= maxP; k += p) { sum += ic[k]; n++; }
      var sc = sum / n - 0.0004 * p;
      (reps || []).forEach(function (x) { if (x.seq.length >= 6 && x.spacing % p === 0) sc += 0.0006; });
      if (sc > bestS) { bestS = sc; best = p; }
    }
    return best;
  };
  /** per-column digit counts; with a board, a ranked shift fit per column */
  DX.columnFreq = function (streams, period, b) {
    var exp = b ? DX.boardExpect(b) : null, out = [];
    for (var col = 0; col < period; col++) {
      var cnt = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], n = 0;
      streams.forEach(function (s) { for (var i = col; i < s.length; i += period) if (s[i] >= 0) { cnt[s[i]]++; n++; } });
      var r = { col: col, n: n, freq: cnt };
      if (exp) {
        var fit = [];
        for (var sh = 0; sh < 10; sh++) {
          var sc = 0;
          for (var d = 0; d < 10; d++) sc += cnt[(d + sh) % 10] * Math.log(exp[d]);
          fit.push({ shift: sh, score: DX.round(sc, 2) });
        }
        fit.sort(function (x, y) { return y.score - x.score; });
        r.fit = fit;
      }
      out.push(r);
    }
    return out;
  };
  /** relative key by mutual IC: column j's shift relative to column 0 */
  DX.alignColumns = function (streams, period) {
    var cols = DX.columnFreq(streams, period, null);
    var rel = [0], conf = [1];
    for (var j = 1; j < period; j++) {
      var best = 0, bs = -1, second = -1;
      for (var s = 0; s < 10; s++) {
        var sc = 0;
        // pool against every already-aligned column (more robust than column 0 alone)
        for (var k = 0; k < j; k++) for (var d = 0; d < 10; d++) sc += cols[k].freq[(d + rel[k]) % 10] * cols[j].freq[(d + s) % 10];
        if (sc > bs) { second = bs; bs = sc; best = s; } else if (sc > second) second = sc;
      }
      rel.push(best); conf.push(DX.round(bs > 0 ? (bs - second) / bs : 0, 3));
    }
    return { rel: rel, conf: conf };
  };

  /** keyword search (the big computer): for every keyword in the pool build the board, fit each column of the
   *  period against that board's expected digit frequencies, and score the decrypt. If rel (a relative key) is
   *  given, the 10 constants on top of it are tried as well. -> best {keyword, key, plaus} */
  /** crib text -> digit array; '#n' stands for an n-figure number (figures unknown: -1) */
  DX.cribDigits = function (b, crib) {
    var out = [];
    String(crib).split(/(#[0-9])/).forEach(function (part) {
      var m = /^#([0-9])$/.exec(part);
      if (m) { out = out.concat(DX.toDigits(b.figCode)); for (var i = 0; i < 2 * +m[1]; i++) out.push(-1); out = out.concat(DX.toDigits(b.figCode)); return; }
      if (part) out = out.concat(DX.toDigits(DX.encode(b, part)));
    });
    return out;
  };
  /** known plaintext at the start of each stream -> periodic key digits (-1 where no crib covers a column).
   *  cribs: one digit array per stream (or null). Returns null when the cribs contradict each other. */
  DX.keyFromCribs = function (streams, cribs, period) {
    var key = [], i;
    for (i = 0; i < period; i++) key.push(-1);
    for (var s = 0; s < streams.length; s++) {
      var cr = cribs[s];
      if (!cr) continue;
      for (i = 0; i < cr.length && i < streams[s].length; i++) {
        if (cr[i] < 0 || streams[s][i] < 0) continue;
        var k = ((streams[s][i] - cr[i]) % 10 + 10) % 10, col = i % period;
        if (key[col] >= 0 && key[col] !== k) return null;
        key[col] = k;
      }
    }
    return key;
  };
  /** keyword search (the big computer): for every keyword in the pool build the board and derive a key three
   *  ways — known openings (cribs, a list of candidate opening texts), column frequencies, and the columns aligned
   *  on each other plus one constant — then score the decrypt. -> best {keyword, key, plaus} */
  DX.searchBoard = function (streams, periodOrRel, pool, cribs) {
    pool = pool || DX.DATA.KEYWORDS;
    var rel = Array.isArray(periodOrRel) ? periodOrRel : null, period = rel ? rel.length : periodOrRel;
    if (!rel) rel = DX.alignColumns(streams, period).rel;
    var sample = streams.map(function (s) { return s.slice(0, 110); });
    var pooled = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    streams.forEach(function (s) { for (var i = 0; i < s.length; i++) if (s[i] >= 0) pooled[((s[i] - rel[i % period]) % 10 + 10) % 10]++; });
    var cands = [];
    function score(kw, b, key) { var txt = sample.map(function (p) { return DX.decode(b, DX.subKey(p, key)).text; }).join(''); cands.push({ keyword: kw, key: key, plaus: DX.plaus(txt).score }); }
    // 1. known openings: consistent across every message, or not at all
    if (cribs && cribs.length) {
      pool.forEach(function (kw) {
        var b = DX.boardCache(kw), colfit = null;
        cribs.forEach(function (ct) {
          var cd = DX.cribDigits(b, ct);
          var kk = DX.keyFromCribs(streams, streams.map(function () { return cd; }), period);
          if (!kk) return;
          if (kk.indexOf(-1) >= 0 && !colfit) colfit = DX.columnFreq(streams, period, b).map(function (c) { return c.fit[0].shift; });
          score(kw, b, kk.map(function (x, i) { return x >= 0 ? x : colfit[i]; }));
        });
      });
      cands.sort(function (x, y) { return y.plaus - x.plaus; });
    }
    // 2. statistics only (no crib fits): column fit, and aligned columns + one constant
    if (!cands.length || cands[0].plaus < 0.6) {
      for (var k = 0; k < pool.length; k++) {
        var b = DX.boardCache(pool[k]), exp = DX.boardExpect(b);
        score(pool[k], b, DX.columnFreq(streams, period, b).map(function (c) { return c.fit[0].shift; }));
        var bestC = 0, bestSc = -1e18;
        for (var c = 0; c < 10; c++) { var sc = 0; for (var d = 0; d < 10; d++) sc += pooled[(d + c) % 10] * Math.log(exp[d]); if (sc > bestSc) { bestSc = sc; bestC = c; } }
        score(pool[k], b, rel.map(function (r) { return (r + bestC) % 10; }));
      }
    }
    cands.sort(function (x, y) { return y.plaus - x.plaus; });
    var cd0 = cands[0], r = DX.refineKey(streams, DX.boardCache(cd0.keyword), cd0.key, 2);
    return { keyword: cd0.keyword, key: r.key, plaus: r.plaus };
  };
  /** coordinate ascent on a periodic key: each column tries all ten shifts, keeping what reads best */
  DX.refineKey = function (streams, b, key, passes) {
    key = key.slice();
    var sample = streams.map(function (s) { return s.slice(0, 160); });
    function score(k) { return DX.plaus(sample.map(function (s) { return DX.decode(b, DX.subKey(s, k)).text; }).join('')).score; }
    var best = score(key), evals = 1;
    for (var pass = 0; pass < (passes || 3); pass++) {
      var changed = false;
      for (var c = 0; c < key.length; c++) {
        var bestS = key[c];
        for (var sh = 0; sh < 10; sh++) {
          if (sh === key[c]) continue;
          var k2 = key.slice(); k2[c] = sh; evals++;
          var sc = score(k2);
          if (sc > best + 0.004) { best = sc; bestS = sh; }
        }
        if (bestS !== key[c]) { key[c] = bestS; changed = true; }
      }
      if (!changed) break;
    }
    return { key: key, plaus: best, evals: evals };
  };
  var BC = {};
  DX.boardCache = function (kw) { return BC[kw] || (BC[kw] = DX.makeBoard(kw)); };

  // ---------------------------------------------------------------- grading
  /** compare a player's decrypt to the true normalised plaintext: {score 0..1, grade} */
  DX.gradeText = function (truth, text) {
    var t = DX.norm(truth), p = DX.norm(text), ok = 0;
    for (var i = 0; i < t.length; i++) if (p[i] === t[i]) ok++;
    // a trailing stretch of padding garbage beyond the true end does not count against
    var score = t.length ? ok / t.length : 0;
    return { score: DX.round(score, 3), grade: score >= 0.97 ? 'right' : score >= 0.4 ? 'partial' : 'wrong' };
  };
})();
