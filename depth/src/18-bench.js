/* DEPTH UI — 18-bench.js: the WORKBENCH. A tray of message cards; the depth
 * strip (A − B) with a celluloid crib slide you drag along it while the other
 * message appears in red pencil; the period finder and per-column frequency
 * bars against the checkerboard's expected silhouette; the checkerboard card;
 * writing up a decrypt. The tools do all the arithmetic; on Cadet/Analyst the
 * bench also marks likely crib positions and best-fit key digits. */
var UIBench = (function () {
  var B = {}, root = null, CW = 26;
  function helps() { return UIA.helps(); }
  function S() { return UIS.bench; }
  function cost(k) { var c = UIA.costs()[k]; return c ? c + ' min' : 'free'; }
  function msgKindName(k) { return k === 'pad' ? 'One-time pad' : k === 'periodic' ? 'Repeating key' : k === 'clear' ? 'In clear' : UIcap(k); }
  function verdictStamp(v) { return v === 'right' ? '<span class="vstamp ok">Read</span>' : v === 'partial' ? '<span class="vstamp part">Partly read</span>' : v === 'wrong' ? '<span class="vstamp bad">Does not read</span>' : ''; }

  // ------------------------------------------------------------------ build
  B.build = function (r) {
    root = r;
    root.innerHTML = '<div class="bench"><div class="bn-tray" id="bn-tray" aria-label="Messages"></div>' +
      '<div class="bn-main"><div class="bn-tabs" id="bn-tabs" role="tablist"><button data-t="msgs">' + UIICON.bench + 'Messages</button><button data-t="depth">' + UIICON.swap + 'Depth</button><button data-t="key">' + UIICON.key + 'Key</button><button data-t="board">' + UIICON.grid + 'Checkerboard</button></div>' +
      '<div class="bn-hint" id="bn-hint"></div><div class="bn-work" id="bn-work"></div></div></div>';
    UI$('#bn-tray').addEventListener('click', function (e) { var c = e.target.closest('[data-m]'); if (!c) return; UIAudio.cue('paper'); B.openMsg(c.dataset.m); });
    UI$('#bn-tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (!b) return; UIAudio.cue('switch'); S().tech = b.dataset.t; B.render(); });
    UI$('#bn-hint').addEventListener('click', function (e) { var b = e.target.closest('[data-hint]'); if (!b) return; var p = b.dataset.hint.split(','); UIAudio.cue('paper'); if (p[0] === 'depth') B.depth(p[1], p[2]); else if (p[0] === 'key') B.key(p[1]); });
    B.refresh();
  };
  B.reset = function () { root = null; };
  B.refresh = function () { if (!root) return; tray(); hint(); B.render(); };
  B.show = function () { UIA.messages().forEach(function (m) { UIS.seenMsgs[m.id] = 1; }); UI.badges(); };

  function tray() {
    var ms = UIA.messages(), pairs = helps() ? UIA.depthPairs() : [];
    var inPair = {}; pairs.forEach(function (p) { inPair[p[0]] = p[1]; inPair[p[1]] = p[0]; });
    var box = UI$('#bn-tray');
    if (!ms.length) { box.innerHTML = '<div class="bn-empty">No messages on the bench yet. Every transmission you copy lands here.</div>'; return; }
    box.innerHTML = ms.map(function (m, i) {
      var sel = S().sel === m.id || S().a === m.id || S().b === m.id;
      return '<button class="mcard' + (sel ? ' on' : '') + (UIS.seenMsgs[m.id] ? '' : ' new') + '" data-m="' + UIesc(m.id) + '" style="--r:' + ((i % 3) - 1) * 0.8 + 'deg">' +
        '<span class="mc-top"><b>' + UIesc(m.id) + '</b><span class="mc-k k-' + m.kind + '">' + (m.kind === 'pad' ? 'PAD' : m.kind === 'periodic' ? 'KEY' : 'CLEAR') + '</span></span>' +
        '<span class="mc-rt">' + UIesc(m.from) + ' → ' + UIesc(m.to) + '</span>' +
        '<span class="mc-ind">' + (m.indicator ? 'page <u' + (inPair[m.id] ? ' class="twin"' : '') + '>' + UIesc(m.indicator) + '</u>' : m.kind === 'periodic' ? UIplural(m.body.length, 'group') : '&nbsp;') + '</span>' +
        (m.decrypted ? verdictStamp(m.decrypted.verdict) : inPair[m.id] ? '<span class="mc-twin">same page as ' + UIesc(inPair[m.id]) + '</span>' : m.holes ? '<span class="mc-holes">' + m.holes + ' lost digits</span>' : '') + '</button>';
    }).join('');
  }
  function hint() {
    var box = UI$('#bn-hint'), h = '';
    var busy = (S().tech === 'depth' && S().a && S().b) || (S().tech === 'key' && S().kid && S().per[S().kid] && S().per[S().kid].pres) || S().tech === 'board';
    if (helps() && !busy) {
      var pairs = UIA.depthPairs().filter(function (p) { var a = UIA.message(p[0]), b = UIA.message(p[1]); return !(a.decrypted && b.decrypted && a.decrypted.verdict === 'right' && b.decrypted.verdict === 'right'); });
      var per = UIA.messages().filter(function (m) { return m.kind === 'periodic' && !(m.decrypted && m.decrypted.verdict === 'right'); })[0];
      if (pairs.length && !(S().tech === 'depth' && S().a === pairs[0][0] && S().b === pairs[0][1])) {
        var m = UIA.message(pairs[0][0]);
        h = '<div class="hint-card"><span class="hc-pin"></span><p><b>' + pairs[0][0] + '</b> and <b>' + pairs[0][1] + '</b> both start with <b class="mono">' + UIesc(m.indicator) + '</b> — the same pad page used twice. That is a depth.</p><button class="btn sm pri" data-hint="depth,' + pairs[0][0] + ',' + pairs[0][1] + '">Put them in depth</button></div>';
      } else if (per && !(S().tech === 'key' && S().kid === per.id)) {
        h = '<div class="hint-card"><span class="hc-pin"></span><p><b>' + per.id + '</b> has no page number: a courier’s repeating key. The period finder will show how long it is.</p><button class="btn sm pri" data-hint="key,' + per.id + '">Find its key</button></div>';
      }
    }
    box.innerHTML = h; box.hidden = !h;
  }
  B.render = function () {
    if (!root) return;
    UI$$('#bn-tabs [data-t]').forEach(function (b) { b.classList.toggle('on', b.dataset.t === S().tech); b.setAttribute('aria-selected', String(b.dataset.t === S().tech)); });
    var w = UI$('#bn-work'), t = S().tech;
    if (t === 'depth') renderDepth(w);
    else if (t === 'key') renderKey(w);
    else if (t === 'board') renderBoard(w);
    else renderMsg(w);
  };
  B.openMsg = function (id) { UI.go('bench'); S().sel = id; S().tech = 'msgs'; tray(); hint(); B.render(); var w = UI$('#bn-work'); if (w && w.scrollIntoView && !UIwide()) { var v = UI$('#v-bench'); v.scrollTop = Math.max(0, w.offsetTop - 60); } UI.emit('benchmsg', id); };
  B.depth = function (a, b) { UI.go('bench'); S().a = a; S().b = b; S().tech = 'depth'; S().offset = 0; tray(); hint(); B.render(); UIExplain.once('depth', function () { UIExplain.once('crib'); }); UI.emit('depthopen', a + '|' + b); };
  B.key = function (id) { UI.go('bench'); S().kid = id; S().tech = 'key'; tray(); hint(); B.render(); UIExplain.once('periodic'); };

  // ------------------------------------------------------------------ message detail
  function groupsGrid(gs, ind) { return '<div class="groups-grid">' + gs.map(function (g, i) { return '<span class="g' + (i === 0 && ind ? ' ind' : '') + '">' + UIesc(g).replace(/\?/g, '<i class="lost">?</i>') + '</span>'; }).join('') + '</div>'; }
  function renderMsg(w) {
    var m = S().sel ? UIA.message(S().sel) : null;
    if (!m) { w.innerHTML = '<div class="bn-blank"><p class="pencil-note">Pick a message from the tray.</p><p class="note">Every copied transmission becomes a card. Two cards with the same page number can be read against each other; courier cards without one hide a short repeating key.</p></div>'; return; }
    var twins = UIA.messages().filter(function (x) { return x.id !== m.id && x.kind === 'pad' && m.kind === 'pad'; });
    var same = twins.filter(function (x) { return x.indicator && x.indicator === m.indicator; });
    var log = UIA.log().filter(function (e) { return e.msg === m.id; });
    w.innerHTML = '<article class="msg-card paper"><header><div><span class="eyebrow">' + msgKindName(m.kind) + (m.copies > 1 ? ' · ' + m.copies + ' copies merged' : '') + '</span><h3>' + UIesc(m.id) + ' <small>' + UIesc(m.from) + ' → ' + UIesc(m.to) + '</small></h3></div>' + (m.decrypted ? verdictStamp(m.decrypted.verdict) : '') + '</header>' +
      (m.kind === 'clear' ? '<p class="clear-text">' + UIesc(m.text || (m.decrypted && m.decrypted.text) || '') + '</p>' : groupsGrid(m.groups, m.kind === 'pad')) +
      (m.decrypted && m.kind !== 'clear' ? '<div class="dec"><span class="eyebrow">Filed decrypt</span><p class="dec-t">' + UIesc(m.decrypted.text) + '</p></div>' : '') +
      '<p class="note">' + (m.kind === 'pad' ? 'The first group names the pad page. A page used once cannot be broken' + (same.length ? '; this one was used again.' : '.') : m.kind === 'periodic' ? 'No page number: the courier adds the same short key over and over.' : 'Received in clear.') + (m.holes ? ' ' + m.holes + ' digits were lost in copying' + (m.copies < 2 ? ' — a repeat broadcast would fill them in.' : '.') : '') + '</p>' +
      '<div class="msg-acts">' +
      (m.kind === 'pad' ? (same.length ? same.map(function (x) { return '<button class="btn pri" data-act="depth" data-b="' + UIesc(x.id) + '">' + UIICON.swap + 'Depth with ' + UIesc(x.id) + '</button>'; }).join('') : '') + (twins.length > same.length ? '<button class="btn" data-act="pick">' + UIICON.swap + 'Put in depth with…</button>' : '') : '') +
      (m.kind === 'periodic' ? '<button class="btn pri" data-act="key">' + UIICON.key + 'Find its key</button>' : '') +
      (m.kind !== 'clear' ? '<button class="btn" data-act="write">' + UIICON.pencil + 'Write up a decrypt</button>' : '') + '</div>' +
      (log.length ? '<p class="heard">Heard: ' + log.map(function (e) { return '<span class="lnk" data-ref="log" data-id="' + UIesc(e.id) + '">night ' + (e.shift + 1) + ' ' + e.label + '</span>'; }).join(', ') + '</p>' : '') + '</article>';
    w.querySelector('.msg-acts').addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var a = b.dataset.act;
      if (a === 'depth') B.depth(m.id, b.dataset.b);
      else if (a === 'key') B.key(m.id);
      else if (a === 'write') writeUp(m.id, m.decrypted ? m.decrypted.text : '');
      else if (a === 'pick') UIsheet.open({ title: 'Depth with…', eyebrow: m.id + ' · page ' + (m.indicator || '?'), tag: 'pick', html: '<p class="note">Only messages sent on the same page are in depth. Others will give nonsense — which is also worth knowing.</p><div class="plist">' + twins.map(function (x) { return '<button class="li" data-pk="' + UIesc(x.id) + '"><span><b>' + UIesc(x.id) + ' · page ' + UIesc(x.indicator || '?') + '</b><small>' + UIesc(x.from) + ' → ' + UIesc(x.to) + (x.indicator === m.indicator ? ' · same page!' : '') + '</small></span></button>'; }).join('') + '</div>',
        mount: function (bd) { bd.addEventListener('click', function (ev) { var p = ev.target.closest('[data-pk]'); if (!p) return; UIsheet.close(); B.depth(m.id, p.dataset.pk); }); } });
    });
  }

  // ------------------------------------------------------------------ depth
  var D = { a: null, b: null, diff: '', work: null, drag: null };
  function localWork(a, b) {
    var ma = UIA.message(a), mb = UIA.message(b), da = ma.digits, db = mb.digits, n = Math.max(da.length, db.length);
    var A = [], Bd = [];
    for (var i = 0; i < n; i++) { A.push('?'); Bd.push('?'); }
    var frags = S().frags[a + '|' + b] || [];
    frags.forEach(function (p) {
      var cd = UIA.encode(p.text) || '';
      for (var i = 0; i < cd.length; i++) {
        var j = p.offset + i, dd = D.diff[j]; if (j >= n) break;
        if (p.side === 'A') { A[j] = cd[i]; if (dd !== undefined && dd !== '?') Bd[j] = String(((+cd[i] - +dd) % 10 + 10) % 10); }
        else { Bd[j] = cd[i]; if (dd !== undefined && dd !== '?') A[j] = String((+cd[i] + +dd) % 10); }
      }
    });
    return { a: { digits: A.join('') }, b: { digits: Bd.join('') }, placed: frags.map(function (f) { return { side: f.side, text: f.text, offset: f.offset }; }) };
  }
  function loadWork() { var w = UIA.bench.work(D.a, D.b); D.work = w || localWork(D.a, D.b); }
  /** letters with digit positions for the known runs of a side */
  function known(digits) {
    var out = [], i = 0;
    while (i < digits.length) {
      if (digits[i] === '?') { i++; continue; }
      var j = i; while (j < digits.length && digits[j] !== '?') j++;
      var seg = digits.slice(i, j), best = null;
      [0, 1].forEach(function (sk) { var c = UIA.decodeCells(seg, sk) || []; var t = c.map(function (x) { return x.ch; }).join(''); var p = UIA.plaus(t) + (sk === 0 ? 0.05 : 0); if (!best || p > best.p) best = { c: c, p: p }; });
      best.c.forEach(function (c) { out.push({ ch: c.ch, i: i + c.i, n: c.n }); });
      i = j;
    }
    return out;
  }
  function renderDepth(w) {
    var a = S().a, b = S().b, ma = a && UIA.message(a), mb = b && UIA.message(b);
    if (!ma || !mb) {
      var pairs = UIA.depthPairs();
      w.innerHTML = '<div class="bn-blank"><p class="pencil-note">Choose two messages sent on the same pad page.</p><p class="note">Open a pad message from the tray and use “Depth with…”.' + (helps() && pairs.length ? ' Or start with ' + pairs[0][0] + ' and ' + pairs[0][1] + '.' : '') + '</p>' + (helps() && pairs.length ? '<button class="btn pri" id="dp-start">' + UIICON.swap + pairs[0][0] + ' + ' + pairs[0][1] + '</button>' : '') + '</div>';
      var st = UI$('#dp-start', w); if (st) st.addEventListener('click', function () { B.depth(pairs[0][0], pairs[0][1]); });
      return;
    }
    if (!UIA.board()) { w.innerHTML = '<div class="bn-blank"><p class="pencil-note">No checkerboard yet.</p><p class="note">A crib is a guess in letters; without the ring’s checkerboard we cannot turn it into digits. Recover the board from courier traffic first (Key tab).</p></div>'; return; }
    if (D.a !== a || D.b !== b) {
      D.a = a; D.b = b;
      var r = UIA.bench.depth(a, b);
      D.diff = r ? r.diff : '';
      UI.refresh();
    }
    loadWork();
    var n = Math.max(ma.digits.length, mb.digits.length);
    var cols = '';
    for (var i = 0; i < n; i++) cols += '<i style="left:' + (i * CW) + 'px"' + (i % 5 === 0 ? ' class="g5"' : '') + '></i>';
    var dig = function (s, cls) { var h = ''; for (var i = 0; i < n; i++) { var d = s[i] === undefined ? '' : s[i]; h += '<span class="' + (d === '?' ? 'q' : '') + '" style="left:' + (i * CW) + 'px">' + d + '</span>'; } return '<div class="dp-row ' + cls + '">' + h + '</div>'; };
    var side = S().side || 'A';
    w.innerHTML = '<section class="depth">' +
      '<header class="dp-head"><div><span class="eyebrow">Depth · page ' + UIesc(ma.indicator || '?') + (ma.indicator !== mb.indicator ? ' / ' + UIesc(mb.indicator || '?') : '') + '</span><h3>' + UIesc(a) + ' <span>and</span> ' + UIesc(b) + '</h3></div>' +
      '<div class="dp-hb">' + UIExplain.btn('depth') + '<button class="btn xs" id="dp-swap">' + UIICON.swap + 'Swap</button></div></header>' +
      (helps() && /000/.test(D.diff) ? '<p class="zeroline"><b>0 0 0</b> Runs of noughts mean both messages say the same thing there — often the same opening.</p>' : '') +
      (ma.indicator !== mb.indicator ? '<p class="warnline">' + UIICON.warn + 'These two were not sent on the same page. The difference strip will be noise.</p>' : '') +
      '<div class="dp-scroll" id="dp-scroll"><div class="dp-strip" id="dp-strip" style="width:' + (n * CW + 8) + 'px">' +
        '<div class="dp-cols">' + cols + '</div>' +
        '<div class="dp-lab la">' + UIesc(a) + '</div>' +
        '<div class="dp-row plain pa" id="dp-pa"></div>' +
        dig(ma.digits, 'ciph ca') +
        '<div class="dp-row diff" id="dp-diff">' + (function () { var h = ''; for (var i = 0; i < n; i++) { var d = D.diff[i] === undefined ? '' : D.diff[i]; h += '<span class="' + (d === '?' ? 'q' : d === '0' && (D.diff[i - 1] === '0' || D.diff[i + 1] === '0') ? 'z' : '') + '" style="left:' + (i * CW) + 'px" data-off="' + i + '">' + d + '</span>'; } return h; })() + '<div class="dp-marks" id="dp-marks"></div></div>' +
        dig(mb.digits, 'ciph cb') +
        '<div class="dp-row plain pb" id="dp-pb"></div>' +
        '<div class="dp-lab lb">' + UIesc(b) + '</div>' +
        '<div class="dp-slide" id="dp-slide" role="slider" aria-label="Crib position" tabindex="0"></div>' +
      '</div></div>' +
      '<div class="dp-ctl"><div class="seg" id="dp-side"><button data-s="A"' + (side === 'A' ? ' class="on"' : '') + '>Guess in ' + UIesc(a) + '</button><button data-s="B"' + (side === 'B' ? ' class="on"' : '') + '>Guess in ' + UIesc(b) + '</button></div>' +
        '<div class="dp-step"><button class="ib big" data-st="-1" aria-label="Move left">' + UIICON.back + '</button><span id="dp-off">0</span><button class="ib big" data-st="1" aria-label="Move right">' + UIICON.chev + '</button></div></div>' +
      '<div class="dp-cribin"><label class="eyebrow" for="dp-crib">Crib — a word you expect</label><input id="dp-crib" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="24" value="' + UIesc(S().crib || '') + '" placeholder="e.g. GREETINGS">' +
        '<div class="chips" id="dp-chips"></div></div>' +
      '<div class="dp-read" id="dp-read"></div>' +
      '<div class="dp-work" id="dp-work"></div>' +
      '</section>';
    chips();
    UI$('#dp-swap').addEventListener('click', function () { UIAudio.cue('paper'); B.depth(b, a); });
    UI$('#dp-side').addEventListener('click', function (e) { var x = e.target.closest('[data-s]'); if (!x) return; S().side = x.dataset.s; UIAudio.cue('switch'); UI$$('#dp-side [data-s]').forEach(function (q) { q.classList.toggle('on', q === x); }); update(); });
    UI$('.dp-step', w).addEventListener('click', function (e) { var x = e.target.closest('[data-st]'); if (!x) return; move(S().offset + +x.dataset.st); UIAudio.cue('detent'); });
    var inp = UI$('#dp-crib');
    inp.addEventListener('input', function () { var v = inp.value.toUpperCase().replace(/[^A-Z0-9 .ÆØÅ]/g, ''); if (v !== inp.value) inp.value = v; S().crib = v; update(); });
    UI$('#dp-diff').addEventListener('click', function (e) { var x = e.target.closest('[data-off]'); if (x) { move(+x.dataset.off); UIAudio.cue('detent'); } });
    UI$('#dp-chips').addEventListener('click', function (e) { var x = e.target.closest('[data-c]'); if (!x) return; UIAudio.cue('tap'); inp.value = x.dataset.c; S().crib = x.dataset.c; update(); });
    // dragging the celluloid slide
    var sl = UI$('#dp-slide'), o0 = 0;
    UIdrag(sl, { start: function () { o0 = S().offset; sl.classList.add('drag'); }, move: function (p, d) { var o = UIclamp(Math.round(o0 + d.x / CW), 0, Math.max(0, n - 1)); if (o !== S().offset) { S().offset = o; UIAudio.cue('detent'); update(true); } }, end: function () { sl.classList.remove('drag'); UI.emit('cribmove', S().offset); } });
    sl.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { move(S().offset + 1); e.preventDefault(); } if (e.key === 'ArrowLeft') { move(S().offset - 1); e.preventDefault(); } });
    update();
    UI.emit('depth', a + '|' + b);
  }
  function chips() {
    var box = UI$('#dp-chips'); if (!box) return;
    var ms = [UIA.message(S().a), UIA.message(S().b)], cs = [];
    ms.forEach(function (m) { if (!m) return; [m.from, m.to].forEach(function (c) { if (c && c !== '?' && cs.indexOf(c) < 0) cs.push(c); }); });
    var voc = UIA.vocab(), habits = ['FOR ' + (ms[0] ? ms[0].to : ''), 'GREETINGS ' + (ms[0] ? ms[0].from : ''), 'NR', 'OUT', 'RECEIVED', 'OPERATION', 'CENTRE', 'MEETING', 'NIGHT', 'TARGET'];
    var list = habits.concat(cs).filter(function (w) { return w && !/ $/.test(w); }).filter(function (w, i, arr) { return arr.indexOf(w) === i; });
    if (voc.length && !UIA.isMock()) list = list.filter(function (w) { return w.split(' ').every(function (x) { return /\d/.test(x) || voc.indexOf(x) >= 0 || cs.indexOf(x) >= 0 || x === 'NR'; }); });
    box.innerHTML = list.slice(0, 12).map(function (w) { return '<button class="chip c" data-c="' + UIesc(w) + '">' + UIesc(w) + '</button>'; }).join('') + (UIA.bench.has('suggest') && helps() ? '<button class="chip sug" id="dp-sug">' + UIICON.help + 'Suggest words here · ' + cost('suggest') + '</button>' : '');
    var sg = UI$('#dp-sug'); if (sg) sg.addEventListener('click', function (e) { e.stopPropagation(); suggest(); });
  }
  function move(o) { var n = D.diff.length; S().offset = UIclamp(o, 0, Math.max(0, n - 1)); update(true); UI.emit('cribmove', S().offset); }
  function update(fromDrag) {
    var crib = (S().crib || '').trim(), side = S().side || 'A', off = S().offset || 0;
    var slide = UI$('#dp-slide'); if (!slide) return;
    UI$('#dp-off').textContent = 'digit ' + (off + 1);
    // known plaintext (placed cribs) on both rows
    var ka = known(D.work.a.digits), kb = known(D.work.b.digits);
    var pv = crib ? UIA.bench.preview(D.diff, crib, off, side) : null;
    function row(list, prev) {
      var h = list.map(function (c) { return '<b style="left:' + (c.i * CW) + 'px;width:' + (c.n * CW) + 'px">' + UIesc(c.ch === ' ' ? '·' : c.ch) + '</b>'; }).join('');
      if (prev) h += prev.cells.map(function (c) { return '<em class="' + (prev.plaus >= 0.55 ? 'good' : '') + '" style="left:' + ((off + c.i) * CW) + 'px;width:' + (c.n * CW) + 'px">' + UIesc(c.ch === ' ' ? '·' : c.ch) + '</em>'; }).join('');
      return h;
    }
    UI$('#dp-pa').innerHTML = row(ka, side === 'B' ? pv : null);
    UI$('#dp-pb').innerHTML = row(kb, side === 'A' ? pv : null);
    // the celluloid slide sits on the guessing side's plain row
    if (pv && pv.cribDigits) {
      var letters = [], at = 0;
      crib.toUpperCase().split('').forEach(function (ch) { if (ch === ' ') return; var code = UIA.encode(ch) || ''; letters.push({ ch: ch, i: at, n: code.length || 1 }); at += code.length || 1; });
      slide.hidden = false;
      slide.className = 'dp-slide ' + (side === 'A' ? 'sa' : 'sb') + (pv.plaus >= 0.55 ? ' good' : '');
      slide.style.left = (off * CW) + 'px'; slide.style.width = (pv.cribDigits.length * CW) + 'px';
      slide.innerHTML = letters.map(function (l) { return '<b style="left:' + (l.i * CW) + 'px;width:' + (l.n * CW) + 'px">' + UIesc(l.ch) + '</b>'; }).join('') + '<i class="grip"></i>';
    } else { slide.hidden = !crib; slide.innerHTML = ''; }
    // likely positions (Cadet / Analyst): scan every offset locally
    var marks = '';
    if (crib && helps() && !fromDrag) R_marks = scan(crib, side);
    if (crib && helps()) marks = (R_marks || []).map(function (o) { return '<i style="left:' + (o * CW) + 'px" title="likely"></i>'; }).join('');
    UI$('#dp-marks').innerHTML = marks;
    // readout
    var other = side === 'A' ? S().b : S().a, rd = UI$('#dp-read');
    if (!crib) rd.innerHTML = '<p class="pencil-note">Type a word you expect in ' + UIesc(side === 'A' ? S().a : S().b) + ', or pick one. Every message from this ring starts “NR…” and ends with a greeting and the sender’s callsign.</p>';
    else rd.innerHTML = '<div class="rd-line"><span class="eyebrow">' + UIesc(other) + ' would read</span><span class="rd-t' + (pv && pv.plaus >= 0.55 ? ' good' : '') + '">' + UIesc(pv ? pv.other.replace(/ /g, '·') || '—' : '—') + '</span></div>' +
      '<div class="rd-meter"><span>Looks like language</span><i><b style="width:' + Math.round((pv ? pv.plaus : 0) * 100) + '%"></b></i><span>' + Math.round((pv ? pv.plaus : 0) * 100) + '%</span></div>' +
      (helps() && R_marks && R_marks.length ? '<p class="note">Marked ▼ on the strip: ' + UIplural(R_marks.length, 'place') + ' where this word gives sense.</p>' : helps() ? '<p class="note">Nowhere on the strip does this word give sense. Try another, or the other message.</p>' : '') +
      '<div class="row gap"><button class="btn pri" id="dp-pin"' + (pv && pv.fits ? '' : ' disabled') + '>' + UIICON.pencil + 'Pencil it in</button></div>';
    var pin = UI$('#dp-pin'); if (pin) pin.addEventListener('click', function () { pinIt(crib, off, side); });
    renderWork();
  }
  var R_marks = null;
  function scan(crib, side) {
    var out = [], n = D.diff.length;
    for (var o = 0; o < n; o++) { var p = UIA.bench.preview(D.diff, crib, o, side); if (!p || !p.fits) break; if (p.plaus >= 0.62 && p.other.indexOf('?') < 0) out.push(o); }
    return out.slice(0, 12);
  }
  function pinIt(crib, off, side) {
    var r = UIA.bench.crib(S().a, S().b, crib, off, side); // authoritative check (costs the engine's crib minute)
    if (UIA.bench.has('place')) { UIA.bench.place(S().a, S().b, side, crib, off); }
    else { var k = S().a + '|' + S().b; (S().frags[k] = S().frags[k] || []).push({ side: side, text: crib, offset: off }); }
    UIAudio.cue('pencil');
    UItoast(r && r.plausible ? 'Pencilled in. The other message reads “' + r.other + '”. Now guess what comes next.' : 'Pencilled in — but it does not read well. You can rub it out below.', { ms: 4200, good: !!(r && r.plausible) });
    S().crib = ''; var inp = UI$('#dp-crib'); if (inp) inp.value = '';
    UI.act(function () { });
    loadWork(); update();
    UI.emit('pinned', crib);
  }
  function unpin(i) {
    if (UIA.bench.has('unplace')) UIA.bench.unplace(S().a, S().b, i);
    else { var k = S().a + '|' + S().b; (S().frags[k] || []).splice(i, 1); }
    UIAudio.cue('paper'); loadWork(); update(); UI.save();
  }
  function sideText(digits) { var k = known(digits), t = '', last = -1; k.forEach(function (c) { if (last >= 0 && c.i > last) t += '…'; t += c.ch; last = c.i + c.n; }); return t.replace(/…+/g, '…'); }
  function renderWork() {
    var box = UI$('#dp-work'); if (!box) return;
    var w = D.work, a = S().a, b = S().b;
    var ta = sideText(w.a.digits), tb = sideText(w.b.digits);
    var ma = UIA.message(a), mb = UIA.message(b);
    box.innerHTML = '<h4>Worksheet</h4>' +
      (w.placed.length ? '<div class="placed">' + w.placed.map(function (p, i) { return '<span class="pl">' + UIesc(p.text) + ' <small>in ' + UIesc(p.side === 'A' ? a : b) + ' @' + (p.offset + 1) + '</small><button data-un="' + i + '" aria-label="Rub out">' + UIICON.close + '</button></span>'; }).join('') + '</div>' : '<p class="note">Nothing pencilled in yet.</p>') +
      [[a, ta, ma], [b, tb, mb]].map(function (x) { return '<div class="wk"><div class="wk-h"><b>' + UIesc(x[0]) + '</b>' + (x[2] && x[2].decrypted ? verdictStamp(x[2].decrypted.verdict) : '') + '<button class="btn xs" data-wr="' + UIesc(x[0]) + '">' + UIICON.pencil + 'Write up</button></div><p class="wk-t">' + (x[1] ? UIesc(x[1]) : '<span class="note">—</span>') + '</p></div>'; }).join('');
    box.onclick = function (e) {
      var u = e.target.closest('[data-un]'); if (u) { unpin(+u.dataset.un); return; }
      var wr = e.target.closest('[data-wr]'); if (wr) writeUp(wr.dataset.wr, wr.dataset.wr === a ? ta : tb);
    };
  }
  function suggest() {
    var side = S().side || 'A', list = UIA.bench.suggest(S().a, S().b, S().offset, side);
    UI.act(function () { });
    if (!list || !list.length) { UItoast('Nothing in the ring’s usual vocabulary fits here.'); return; }
    UIsheet.open({ title: 'Words that fit here', eyebrow: 'Digit ' + (S().offset + 1) + ' · guessing in ' + (side === 'A' ? S().a : S().b), tag: 'suggest', html: '<div class="plist">' + list.map(function (x) { return '<button class="li" data-w="' + UIesc(x.word) + '"><span><b>' + UIesc(x.word) + '</b><small>the other reads “' + UIesc(x.other) + '” · ' + Math.round(x.plaus * 100) + '%</small></span></button>'; }).join('') + '</div>',
      mount: function (bd) { bd.addEventListener('click', function (e) { var x = e.target.closest('[data-w]'); if (!x) return; UIsheet.close(); S().crib = x.dataset.w; var inp = UI$('#dp-crib'); if (inp) inp.value = x.dataset.w; update(); }); } });
  }

  // ------------------------------------------------------------------ write up / accept
  function writeUp(id, text) {
    var m = UIA.message(id); if (!m) return;
    var draft = S().drafts[id] || text || '';
    UIsheet.open({ title: 'Write up ' + id, eyebrow: UIesc(m.from) + ' → ' + UIesc(m.to) + ' · ' + msgKindName(m.kind), tag: 'writeup', html:
      '<p class="note">Type what the message says. Keep what you read; fill a gap only when the sense is obvious; leave “?” for the rest. The registry checks it against what Special Branch can confirm.</p>' +
      '<textarea class="wu" id="wu-t" rows="6" spellcheck="false" autocapitalize="characters">' + UIesc(draft) + '</textarea>' +
      '<div class="row gap"><button class="btn pri" id="wu-go">' + UIICON.stamp + 'File the decrypt</button></div>',
      mount: function (b) {
        var t = UI$('#wu-t', b);
        t.addEventListener('input', function () { S().drafts[id] = t.value; });
        UI$('#wu-go', b).addEventListener('click', function () {
          var v = t.value.trim(); if (!v) { UItoast('Nothing written.'); return; }
          var before = UIA.opCard();
          var r = UIA.bench.accept(id, v);
          if (!r.ok) { UItoast(r.err || 'Not accepted.', { err: true }); return; }
          UIAudio.cue('stamp'); UIsheet.close();
          var after = UIA.opCard(), learnt = ['what', 'where', 'when', 'who'].filter(function (k) { return after[k].known && !before[k].known; });
          UItoast((r.verdict === 'right' ? 'Filed: it reads.' : r.verdict === 'partial' ? 'Filed as a partial read.' : 'Filed — but the registry cannot confirm it.') + (learnt.length ? ' The operation card now shows ' + learnt.map(function (k) { return k.toUpperCase(); }).join(', ') + '.' : ''), { ms: 5200, good: r.verdict === 'right' });
          UI.act(function () { });
          UI.emit('accepted', { id: id, verdict: r.verdict, learnt: learnt });
        });
      } });
  }
  B.writeUp = writeUp;

  // ------------------------------------------------------------------ periodic key
  function renderKey(w) {
    var pers = UIA.messages().filter(function (m) { return m.kind === 'periodic'; });
    var id = S().kid && UIA.message(S().kid) ? S().kid : (pers[0] && pers[0].id);
    if (!id) { w.innerHTML = '<div class="bn-blank"><p class="pencil-note">No courier traffic yet.</p><p class="note">Couriers send short Morse messages without a page number. Their key repeats every few digits, which is their weakness.</p></div>'; return; }
    S().kid = id;
    var m = UIA.message(id), P = S().per[id] || (S().per[id] = { period: null, pres: null, cols: null, key: [], rel: null });
    var bd = UIA.board();
    var h = '<section class="keyws"><header class="dp-head"><div><span class="eyebrow">Repeating key · ' + UIplural(m.body.length, 'group') + '</span><h3>' + UIesc(id) + ' <span>' + UIesc(m.from) + ' → ' + UIesc(m.to) + '</span></h3></div><div class="dp-hb">' + UIExplain.btn('periodic') + '</div></header>' +
      (pers.length > 1 ? '<div class="chips">' + pers.map(function (x) { return '<button class="chip' + (x.id === id ? ' on' : '') + '" data-k="' + UIesc(x.id) + '">' + UIesc(x.id) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="step"><div class="st-h"><b>1</b><span>Find the period</span></div>';
    if (!P.pres) h += '<p class="note">Split the message into columns of every 2nd, 3rd, 4th… digit. At the true period each column is plain language shifted by one key digit, so its digits are lumpy instead of flat.</p><button class="btn pri" data-k-act="period">' + UIICON.chart + 'Run the period finder · ' + cost('period') + '</button>';
    else h += periodChart(P) + '<p class="note">' + (P.period ? 'Period <b>' + P.period + '</b> chosen.' : 'Tap a bar to choose the period.') + (helps() ? ' The finder suggests <b>' + bestP(P) + '</b>' + (P.pres.best && bestP(P) !== P.pres.best ? ' (' + P.pres.best + ' is a multiple of it)' : '') + '.' : '') + '</p>' + repeatsList(P);
    h += '</div>';
    if (P.period) {
      h += '<div class="step"><div class="st-h"><b>2</b><span>Line up each column</span>' + UIExplain.btn('columns') + '</div>';
      if (!P.cols) h += '<p class="note">Count the digits in each of the ' + P.period + ' columns and compare them with how plain text looks on the checkerboard.</p><button class="btn pri" data-k-act="cols">' + UIICON.chart + 'Count the columns · ' + cost('columns') + '</button>';
      else h += colCards(P, bd);
      h += '</div>';
    }
    if (P.cols) {
      var pv = keyPreview(m, P);
      h += '<div class="step"><div class="st-h"><b>3</b><span>Read it</span></div>' +
        (bd ? '<p class="key-line">Key <b class="mono">' + P.key.map(function (k) { return k === null || k === undefined ? '?' : k; }).join('') + '</b></p><p class="trial' + (pv.plaus >= 0.55 ? ' good' : '') + '">' + UIesc(pv.text || '—') + '</p><div class="rd-meter"><span>Looks like language</span><i><b style="width:' + Math.round(pv.plaus * 100) + '%"></b></i><span>' + Math.round(pv.plaus * 100) + '%</span></div>' +
          '<div class="row gap"><button class="btn pri" data-k-act="write">' + UIICON.pencil + 'Write up ' + UIesc(id) + '</button></div>'
          : '<p class="note">Without the ring’s checkerboard the digits cannot be read yet. With the columns lined up against each other, the station computer can try every keyword in its list.</p>' +
          (P.rel ? '<p class="key-line">Relative key <b class="mono">' + P.rel.join('') + '</b></p><button class="btn pri" data-k-act="solve">' + UIICON.grid + 'Book the big computer · ' + cost('boardSolve') + '</button>' : '<button class="btn pri" data-k-act="align">' + UIICON.swap + 'Align columns against each other · ' + cost('align') + '</button>')) +
        '</div>';
    }
    h += '</section>';
    w.innerHTML = h;
    w.onclick = function (e) {
      var ch = e.target.closest('[data-k]'); if (ch) { S().kid = ch.dataset.k; B.render(); return; }
      var pb = e.target.closest('[data-p]'); if (pb) { P.period = +pb.dataset.p; P.cols = null; P.key = []; UIAudio.cue('pencil'); B.render(); UI.save(); return; }
      var st = e.target.closest('[data-kd]'); if (st) { var c = +st.dataset.c; P.key[c] = (((P.key[c] || 0) + +st.dataset.kd) % 10 + 10) % 10; UIAudio.cue('detent'); B.render(); UI.save(); return; }
      var ac = e.target.closest('[data-k-act]'); if (!ac) return;
      var a = ac.dataset.kAct;
      if (a === 'period') { var r = UIA.bench.period(id); if (!r) { UItoast('The period finder jammed.', { err: true }); return; } P.pres = r; if (helps()) P.period = bestP(P); UIAudio.cue('type'); UI.act(function () { }); B.render(); UI.emit('period', id); }
      else if (a === 'cols') { var c2 = UIA.bench.columns(id, P.period); if (!c2) return; P.cols = c2; P.key = c2.cols.map(function (c) { return helps() && c.fit ? c.fit[0].shift : 0; }); UIAudio.cue('type'); UI.act(function () { }); B.render(); UIExplain.once('columns'); UI.emit('columns', id); }
      else if (a === 'best') { P.key = P.cols.cols.map(function (c, i) { return c.fit ? c.fit[0].shift : bestShift(c.freq, P.cols.expect); }); UIAudio.cue('pencil'); B.render(); }
      else if (a === 'align') { var al = UIA.bench.align(id, P.period); if (!al) { UItoast('Alignment is not available.', { err: true }); return; } P.rel = al.rel; UI.act(function () { }); B.render(); }
      else if (a === 'solve') { var sv = UIA.bench.boardSolve(id, P.rel); UI.act(function () { }); if (sv.ok) { UIAudio.cue('win'); UItoast('The computer found the keyword ' + sv.keyword + '. The checkerboard is on your bench.', { ms: 5000, good: true }); S().per[id] = { period: P.period, pres: P.pres, cols: null, key: [], rel: null }; } else UItoast(sv.err || 'No keyword in the list reads.', { err: true, ms: 4200 }); B.render(); }
      else if (a === 'write') writeUp(id, keyPreview(m, P).text);
    };
  }
  function bestShift(freq, exp) { if (!exp) return 0; var best = 0, bs = -1e9; for (var sh = 0; sh < 10; sh++) { var sc = 0; for (var d = 0; d < 10; d++) sc += freq[(d + sh) % 10] * Math.log(exp[d] + 1e-3); if (sc > bs) { bs = sc; best = sh; } } return best; }
  /** the smallest period that explains the peak: multiples of the true period score as well */
  function bestP(P) {
    var ic = P.pres.ic, base = Math.min.apply(null, ic.map(function (x) { return x.ic; })) * 0.97, best = P.pres.best || ic.slice(1).sort(function (a, b) { return b.ic - a.ic; })[0].period;
    var ex = function (p) { var r = ic.filter(function (x) { return x.period === p; })[0]; return r ? r.ic - base : 0; };
    for (var d = 2; d < best; d++) if (best % d === 0 && ex(d) >= 0.7 * ex(best)) return d;
    return best;
  }
  function periodChart(P) {
    var ic = P.pres.ic.filter(function (x) { return x.period >= 1; }), lo = Math.min.apply(null, ic.map(function (x) { return x.ic; })) * 0.97, mx = Math.max.apply(null, ic.map(function (x) { return x.ic; }));
    var sug = helps() ? bestP(P) : null;
    return '<div class="pchart">' + ic.map(function (x) {
      var hgt = Math.round(8 + (x.ic - lo) / Math.max(1e-6, mx - lo) * 92);
      return '<button class="pbar' + (P.period === x.period ? ' on' : '') + (sug === x.period ? ' best' : '') + '" data-p="' + x.period + '" aria-label="Period ' + x.period + '"><i style="height:' + hgt + '%"></i><span>' + x.period + '</span></button>';
    }).join('') + '</div><p class="pc-cap">Taller = lumpier columns = more like language. Multiples of the true period stand tall too.</p>';
  }
  function repeatsList(P) {
    var reps = P.pres.repeats.slice(0, 4); if (!reps.length) return '';
    return '<div class="reps"><span class="eyebrow">Repeated runs</span>' + reps.map(function (r) { var f = []; for (var k = 2; k <= 12; k++) if (r.spacing % k === 0) f.push(k); return '<span><b class="mono">' + UIesc(r.seq) + '</b> again ' + r.spacing + ' digits on' + (helps() && f.length ? ' <small>(divides by ' + f.slice(-3).join(', ') + ')</small>' : '') + '</span>'; }).join('') + '</div>';
  }
  function colCards(P, bd) {
    var exp = P.cols.expect, h = '<div class="cols">';
    P.cols.cols.forEach(function (c, i) {
      var k = P.key[i] || 0, tot = c.freq.reduce(function (s, x) { return s + x; }, 0) || 1, mx = Math.max.apply(null, c.freq.map(function (x) { return x / tot; }).concat(exp ? exp : [0.2])) || 1;
      var bars = ''; for (var d = 0; d < 10; d++) { var o = c.freq[(d + k) % 10] / tot, e = exp ? exp[d] : 0; bars += '<span><i class="ex" style="height:' + Math.round(e / mx * 100) + '%"></i><i class="ob" style="height:' + Math.round(o / mx * 100) + '%"></i><small>' + d + '</small></span>'; }
      var best = c.fit ? c.fit[0].shift : exp ? bestShift(c.freq, exp) : null;
      h += '<div class="colc"><div class="cc-h">Column ' + (i + 1) + (helps() && best !== null ? '<span class="cc-best' + (best === k ? ' ok' : '') + '">best fit ' + best + '</span>' : '') + '</div><div class="cc-bars">' + bars + '</div>' +
        '<div class="cc-k"><button class="ib" data-kd="-1" data-c="' + i + '" aria-label="Key digit down">' + UIICON.minus + '</button><b>' + k + '</b><button class="ib" data-kd="1" data-c="' + i + '" aria-label="Key digit up">' + UIICON.plus + '</button></div></div>';
    });
    h += '</div>' + (exp ? '<p class="note">Grey: how plain text looks on this checkerboard. Ink: this column, shifted back by the key digit. When they match, the digit is right.</p>' : '<p class="note">No checkerboard to compare against: line the columns up against each other instead.</p>') +
      (helps() && exp ? '<button class="btn sm" data-k-act="best">' + UIICON.check + 'Use every best fit</button>' : '');
    return h;
  }
  function keyPreview(m, P) {
    var bd = UIA.board(); if (!bd || !P.key.length) return { text: '', plaus: 0 };
    var s = m.digits, k = P.key, out = '';
    for (var i = 0; i < s.length; i++) out += s[i] === '?' ? '?' : String(((+s[i] - (k[i % k.length] || 0)) % 10 + 10) % 10);
    var c = UIA.decodeCells(out) || [], t = c.map(function (x) { return x.ch; }).join('');
    return { text: t, plaus: UIA.plaus(t.slice(0, 80)) };
  }

  // ------------------------------------------------------------------ the checkerboard card
  function renderBoard(w) {
    var bd = UIA.board();
    if (!bd) { w.innerHTML = '<div class="bn-blank"><p class="pencil-note">The station does not hold this ring’s checkerboard.</p><p class="note">Break a courier message with the Key tools and book the station computer to try its keyword list. ' + UIExplain.btn('board') + '</p></div>'; return; }
    var figOn = function (c) { return c === bd.figSym ? 'FIG' : c === bd.stopSym ? 'STOP' : c; };
    w.innerHTML = '<section class="boardcard paper"><header><span class="eyebrow">Straddling checkerboard · keyword</span><h3>' + UIesc(bd.key || '—') + '</h3>' + UIExplain.btn('board') + '</header>' +
      '<table class="cb"><thead><tr><th></th>' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (i) { return '<th>' + i + '</th>'; }).join('') + '</tr></thead><tbody>' +
      bd.rows.map(function (r) { return '<tr><th>' + (r.prefix || '') + '</th>' + r.cells.map(function (c) { return '<td class="' + (!c ? 'blank' : c === bd.figSym || c === bd.stopSym ? 'sym' : '') + '">' + (c ? UIesc(figOn(c)) : '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>' +
      '<p class="note">Letters in the top row are one digit; the rest are two, starting with the row number (' + bd.blanks.join(' or ') + '). Figures are written ' + (bd.doubleFigs ? 'twice each ' : '') + 'between FIG signs.</p>' +
      '<div class="enc"><label class="eyebrow" for="cb-in">Try it</label><input id="cb-in" autocapitalize="characters" spellcheck="false" placeholder="type a word" maxlength="30"><div class="cb-out mono" id="cb-out">—</div></div></section>';
    var inp = UI$('#cb-in'); inp.addEventListener('input', function () { var v = inp.value.toUpperCase(); var d = UIA.encode(v); UI$('#cb-out').textContent = d ? d.replace(/(.{5})/g, '$1 ') : '—'; });
    UIExplain.once('board');
  }
  UI.views.bench = B;
  return B;
})();
