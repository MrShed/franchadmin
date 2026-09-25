/* DEPTH UI — 19-traffic.js: TRAFFIC. The callsign diagram on drafting paper:
 * drag from one callsign to another to draw a link (the station marks each
 * one by the evidence behind it: ink when backed, pencil when a hunch), move
 * boxes in Arrange mode; and the intercept timeline, night by night. */
var UITraffic = (function () {
  var T = {}, root = null, NS = 'http://www.w3.org/2000/svg', drag = null;
  function helps() { return UIA.helps(); }
  function nodes() {
    var list = UIA.callsigns().map(function (c) { return c.id; }), ctl = UIA.controller();
    if (ctl && list.indexOf(ctl) < 0 && UIA.log().some(function (e) { return e.to === ctl || e.callsign === ctl; })) list.push(ctl);
    return list;
  }
  function layout(ids) {
    var pos = UIS.traffic.pos, ctl = UIA.controller(), tr = UIA.traffic();
    var fromCtl = tr.filter(function (t) { return t.from === ctl; }).map(function (t) { return t.to; });
    var rows = [[], [], []];
    ids.forEach(function (id) { if (pos[id]) return; if (id === ctl) rows[0].push(id); else if (fromCtl.indexOf(id) >= 0) rows[1].push(id); else rows[2].push(id); });
    rows.forEach(function (r, ri) {
      var taken = ids.filter(function (id) { return pos[id] && Math.abs(pos[id][1] - [0.14, 0.42, 0.74][ri]) < 0.05; }).length;
      r.forEach(function (id, i) { var n = r.length + taken, k = i + taken; pos[id] = [n === 1 ? 0.5 : 0.14 + 0.72 * k / Math.max(1, n - 1), [0.14, 0.42, 0.74][ri] + (ri === 2 && n > 3 ? (k % 2) * 0.12 : 0)]; });
    });
  }
  T.build = function (r) {
    root = r;
    root.innerHTML = '<div class="traffic"><div class="tf-bar"><div class="seg" id="tf-sub"><button data-s="diagram">' + UIICON.traffic + 'Diagram</button><button data-s="timeline">' + UIICON.clock + 'Timeline</button></div>' +
      '<div class="seg" id="tf-mode"><button data-m="link">' + UIICON.link + 'Draw links</button><button data-m="move">' + UIICON.move + 'Arrange</button></div>' + UIExplain.btn('traffic') + '</div>' +
      '<div class="tf-sheet paper" id="tf-sheet"></div></div>';
    UI$('#tf-sub').addEventListener('click', function (e) { var b = e.target.closest('[data-s]'); if (!b) return; UIAudio.cue('switch'); UIS.traffic.sub = b.dataset.s; T.refresh(); });
    UI$('#tf-mode').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (!b) return; UIAudio.cue('switch'); UIS.traffic.mode = b.dataset.m; T.refresh(); });
    T.refresh();
    UIExplain.once('traffic');
  };
  T.reset = function () { root = null; };
  T.refresh = function () {
    if (!root) return;
    UI$$('#tf-sub [data-s]').forEach(function (b) { b.classList.toggle('on', b.dataset.s === UIS.traffic.sub); });
    UI$$('#tf-mode [data-m]').forEach(function (b) { b.classList.toggle('on', b.dataset.m === UIS.traffic.mode); });
    UI$('#tf-mode').hidden = UIS.traffic.sub !== 'diagram';
    if (UIS.traffic.sub === 'timeline') timeline(); else diagram();
  };

  // ------------------------------------------------------------------ diagram
  function diagram() {
    var sheet = UI$('#tf-sheet'), ids = nodes();
    if (!ids.length) { sheet.innerHTML = '<div class="tf-empty"><p class="pencil-note">No callsigns yet.</p><p class="note">Every transmission you copy puts its callsign — and who it was sent to — in the traffic book. Draw the ring here as it appears.</p></div>'; return; }
    layout(ids);
    var W = 1000, H = 720, pos = UIS.traffic.pos, links = UIA.links(), tr = UIA.traffic(), cs = {};
    UIA.callsigns().forEach(function (c) { cs[c.id] = c; });
    var ctl = UIA.controller();
    function P(id) { return [pos[id][0] * W, pos[id][1] * H]; }
    var svg = '<svg id="tf-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet"><defs>' +
      '<marker id="ar-ink" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#1d2024"/></marker>' +
      '<marker id="ar-pen" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#6a6f74"/></marker>' +
      '<filter id="rough"><feTurbulence baseFrequency=".04" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="2.4"/></filter></defs>';
    // observed traffic (a hint on Cadet/Analyst): faint dotted blue
    if (helps()) tr.forEach(function (t) { if (!pos[t.from] || !pos[t.to]) return; if (links.some(function (l) { return (l.a === t.from && l.b === t.to) || (l.a === t.to && l.b === t.from); })) return; var a = P(t.from), b = P(t.to); svg += '<line class="obs" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/><text class="obs-t" x="' + ((a[0] + b[0]) / 2 + 8) + '" y="' + ((a[1] + b[1]) / 2) + '">' + t.n + '× in the log</text>'; });
    links.forEach(function (l) {
      if (!pos[l.a] || !pos[l.b]) return;
      var a = P(l.a), b = P(l.b), dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, r = 62;
      var x1 = a[0] + ux * r, y1 = a[1] + uy * 34, x2 = b[0] - ux * r, y2 = b[1] - uy * 34;
      var cls = l.support === 'strong' ? 'lk ink' : l.support === 'some' ? 'lk pen' : 'lk hunch';
      svg += '<g class="lkg" data-la="' + UIesc(l.a) + '" data-lb="' + UIesc(l.b) + '"><line class="lk-hit" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/><line class="' + cls + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' + (l.kind === 'controls' ? ' marker-end="url(#' + (l.support === 'strong' ? 'ar-ink' : 'ar-pen') + ')"' : '') + (l.kind === 'same' ? ' stroke-dasharray="2 6"' : '') + '/>' +
        '<text class="lk-t ' + (l.support === 'strong' ? 'ok' : '') + '" x="' + ((x1 + x2) / 2 + 10) + '" y="' + ((y1 + y2) / 2 - 6) + '">' + (l.kind === 'controls' ? 'orders' : l.kind === 'same' ? 'same hand' : 'talks') + (l.support === 'strong' ? ' ✓' : l.support === 'none' ? ' ?' : '') + '</text></g>';
    });
    ids.forEach(function (id) {
      var p = P(id), c = cs[id] || { n: 0, sent: 0 }, isCtl = id === ctl, bld = UIA.buildings().filter(function (b) { return b.callsigns.indexOf(id) >= 0; })[0];
      svg += '<g class="nd' + (isCtl ? ' ctl' : '') + '" data-n="' + UIesc(id) + '" transform="translate(' + p[0] + ',' + p[1] + ')"><rect class="nd-sh" x="-64" y="-32" width="128" height="64" rx="3"/><rect class="nd-b" x="-62" y="-34" width="124" height="64" rx="3"/>' +
        '<text class="nd-t" y="-4">' + UIesc(id) + '</text><text class="nd-s" y="17">' + (isCtl ? 'voice · abroad' : c.sent + ' sent · ' + (c.got || 0) + ' rec’d') + '</text>' + (bld ? '<text class="nd-a" y="46">' + UIesc(bld.address) + '</text>' : '') + '</g>';
    });
    svg += '<line id="tf-rub" class="rub" x1="0" y1="0" x2="0" y2="0" visibility="hidden"/></svg>';
    sheet.innerHTML = '<div class="tf-legend"><span><i class="l-ink"></i>backed by the log</span><span><i class="l-pen"></i>some evidence</span><span><i class="l-hunch"></i>hunch</span>' + (helps() ? '<span><i class="l-obs"></i>seen in the log</span>' : '') + '</div>' + svg +
      '<p class="tf-tip">' + (UIS.traffic.mode === 'link' ? 'Drag from one box to another to draw a link. Tap a line to see its evidence.' : 'Drag the boxes to arrange the sheet.') + '</p>';
    bindSvg(UI$('#tf-svg'), W, H);
  }
  function bindSvg(svg, W, H) {
    function pt(e) { var r = svg.getBoundingClientRect(), s = Math.min(r.width / W, r.height / H), ox = (r.width - W * s) / 2, oy = (r.height - H * s) / 2; return [(e.clientX - r.left - ox) / s, (e.clientY - r.top - oy) / s]; }
    function nodeAt(p) { var hit = null; Object.keys(UIS.traffic.pos).forEach(function (id) { var q = UIS.traffic.pos[id]; if (Math.abs(q[0] * W - p[0]) < 66 && Math.abs(q[1] * H - p[1]) < 36) hit = id; }); return nodes().indexOf(hit) >= 0 ? hit : null; }
    svg.addEventListener('pointerdown', function (e) {
      var p = pt(e), n = nodeAt(p);
      if (!n) return;
      drag = { n: n, p0: p, moved: false, id: e.pointerId };
      try { svg.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      e.preventDefault();
    });
    svg.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var p = pt(e); if (Math.hypot(p[0] - drag.p0[0], p[1] - drag.p0[1]) > 8) drag.moved = true;
      if (!drag.moved) return;
      if (UIS.traffic.mode === 'move') { UIS.traffic.pos[drag.n] = [UIclamp(p[0] / W, 0.07, 0.93), UIclamp(p[1] / H, 0.07, 0.93)]; var g = svg.querySelector('[data-n="' + drag.n + '"]'); if (g) g.setAttribute('transform', 'translate(' + p[0] + ',' + p[1] + ')'); }
      else { var rub = UI$('#tf-rub'), q = UIS.traffic.pos[drag.n]; rub.setAttribute('x1', q[0] * W); rub.setAttribute('y1', q[1] * H); rub.setAttribute('x2', p[0]); rub.setAttribute('y2', p[1]); rub.setAttribute('visibility', 'visible'); var t = nodeAt(p); UI$$('.nd', svg).forEach(function (g) { g.classList.toggle('tgt', g.dataset.n === t && t !== drag.n); }); }
    });
    function up(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag; drag = null;
      var rub = UI$('#tf-rub'); if (rub) rub.setAttribute('visibility', 'hidden');
      if (!d.moved) { T.nodeSheet(d.n); return; }
      if (UIS.traffic.mode === 'move') { UI.save(); diagram(); return; }
      var t = nodeAt(pt(e));
      if (t && t !== d.n) kindSheet(d.n, t); else diagram();
    }
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    svg.addEventListener('click', function (e) { var g = e.target.closest('.lkg'); if (g && !drag) linkSheet(g.dataset.la, g.dataset.lb); });
  }
  function kindSheet(a, b) {
    UIsheet.open({ title: a + ' — ' + b, eyebrow: 'Draw a link', tag: 'link', html: '<div class="plist">' + UIA.LINK_KINDS.map(function (k) { return '<button class="li" data-k="' + k[0] + '"><span><b>' + UIesc(k[1]) + '</b><small>' + UIesc(k[2]) + '</small></span></button>'; }).join('') + '</div>',
      mount: function (bd) { bd.addEventListener('click', function (e) { var x = e.target.closest('[data-k]'); if (!x) return; UIsheet.close(); UIA.link(a, b, x.dataset.k); UIAudio.cue('pencil'); var l = UIA.links().filter(function (q) { return (q.a === a && q.b === b) || (q.a === b && q.b === a); })[0]; UItoast(l && l.support === 'strong' ? 'Inked in: the log backs it.' : l && l.support === 'some' ? 'Drawn — some evidence behind it.' : 'Pencilled as a hunch. Nothing in the log backs it yet.', { good: !!(l && l.support === 'strong') }); UI.act(function () { }); UI.emit('link', a + '|' + b); }); } });
  }
  function linkSheet(a, b) {
    var l = UIA.links().filter(function (q) { return (q.a === a && q.b === b) || (q.a === b && q.b === a); })[0]; if (!l) return;
    var tr = UIA.traffic().filter(function (t) { return (t.from === a && t.to === b) || (t.from === b && t.to === a); });
    UIsheet.open({ title: a + ' — ' + b, eyebrow: (UIA.LINK_KINDS.filter(function (k) { return k[0] === l.kind; })[0] || ['', 'Link'])[1], tag: 'linkinfo', html:
      '<p>' + (l.support === 'strong' ? '<b>Backed by the log.</b> ' : l.support === 'some' ? '<b>Some evidence.</b> ' : '<b>A hunch.</b> ') + UIesc(l.why || '') + '</p>' +
      (tr.length ? '<ul class="brg">' + tr.map(function (t) { return '<li>' + UIesc(t.from) + ' → ' + UIesc(t.to) + ': ' + t.n + '×</li>'; }).join('') + '</ul>' : '') +
      '<div class="row gap"><button class="btn" id="lk-del">' + UIICON.trash + 'Rub it out</button></div>',
      mount: function (bd) { UI$('#lk-del', bd).addEventListener('click', function () { UIA.unlink(a, b); UIAudio.cue('paper'); UIsheet.close(); UI.act(function () { }); }); } });
  }
  T.nodeSheet = function (id, o) {
    var c = UIA.callsigns().filter(function (x) { return x.id === id; })[0], log = UIA.log().filter(function (e) { return e.callsign === id || e.to === id; });
    var sent = log.filter(function (e) { return e.callsign === id; }), blds = UIA.buildings().filter(function (b) { return b.callsigns.indexOf(id) >= 0; });
    var lastTx = sent.filter(function (e) { return e.tx; }).slice(-1)[0], sig = lastTx ? UIA.signal(lastTx.tx) : null, fist = sig && sig.fist;
    var times = sent.map(function (e) { return e.label; }).filter(function (t, i, a) { return a.indexOf(t) === i; });
    UIsheet.open({ push: o && o.push, title: id, eyebrow: id === UIA.controller() ? 'The controller · voice numbers from abroad' : 'Callsign', tag: 'callsign:' + id, html:
      '<dl class="kv"><dt>Heard</dt><dd>' + (c ? c.sent + ' sent, ' + c.got + ' received' : '—') + '</dd>' +
      (times.length ? '<dt>Times</dt><dd>' + UIesc(times.join(', ')) + '</dd>' : '') +
      (c && Object.keys(c.freqs).length ? '<dt>Freq.</dt><dd>' + Object.keys(c.freqs).join(', ') + ' MHz</dd>' : '') +
      (c && c.fixes.length ? '<dt>Fixes</dt><dd>' + UIplural(c.fixes.length, 'fix', 'fixes') + ' on the map</dd>' : '') +
      (blds.length ? '<dt>Traced to</dt><dd>' + blds.map(function (b) { return '<span class="lnk" data-ref="building" data-id="' + UIesc(b.id) + '">' + UIesc(b.address) + '</span>'; }).join(', ') + '</dd>' : '') + '</dl>' +
      (fist ? '<h4>The fist</h4><p class="note">' + fist.wpm + ' words a minute' + (fist.quirk ? '; ' + UIesc(fist.quirk) : '') + '. Operators are recognised by their hand on the key as much as by their callsign.</p><button class="btn sm" id="fist-play">' + UIICON.play + 'Play the hand</button>' : '') +
      '<h4>Traffic</h4><div class="plist">' + log.slice(-8).reverse().map(function (e) { return '<button class="li" data-ref="log" data-id="' + UIesc(e.id) + '"><span><b>Night ' + (e.shift + 1) + ' · ' + e.label + ' · ' + UIesc(e.callsign || '?') + ' → ' + UIesc(e.to || '?') + '</b><small>' + UImhz(e.freq) + ' MHz ' + UImodeName(e.mode) + (e.faint ? ' · not copied' : ' · ' + e.groups.length + ' groups') + '</small></span></button>'; }).join('') + '</div>',
      mount: function (bd) { var p = UI$('#fist-play', bd); if (p) p.addEventListener('click', function () { UIAudio.start(); UIAudio.demoFist(id, fist); }); } });
  };

  // ------------------------------------------------------------------ timeline
  function timeline() {
    var sheet = UI$('#tf-sheet'), log = UIA.log().filter(function (e) { return e.callsign && !e.decoy; }), c = UIA.clock();
    if (!log.length) { sheet.innerHTML = '<div class="tf-empty"><p class="pencil-note">The timeline fills as the band watch hears things.</p></div>'; return; }
    var rows = []; log.forEach(function (e) { if (rows.indexOf(e.callsign) < 0) rows.push(e.callsign); });
    var nights = c.shift + 1, h = '<div class="tl"><div class="tl-head"><span></span>' + Array.apply(null, Array(nights)).map(function (_, i) { return '<span>Night ' + (i + 1) + '</span>'; }).join('') + '</div>';
    rows.forEach(function (cs) {
      h += '<div class="tl-row"><span class="tl-cs lnk r-callsign" data-ref="callsign" data-id="' + UIesc(cs) + '">' + UIesc(cs) + '</span>';
      for (var n = 0; n < nights; n++) {
        h += '<span class="tl-n">' + log.filter(function (e) { return e.callsign === cs && e.shift === n; }).map(function (e) { return '<i class="m-' + e.mode + (e.faint ? ' f' : '') + '" style="left:' + (e.minute / 480 * 100) + '%" data-ref="log" data-id="' + UIesc(e.id) + '" title="' + e.label + '"></i>'; }).join('') + '</span>';
      }
      h += '</div>';
    });
    h += '<div class="tl-foot"><span></span>' + Array.apply(null, Array(nights)).map(function () { return '<span><b>18</b><b>22</b><b>02</b></span>'; }).join('') + '</div></div>' +
      '<p class="tf-tip">Dots are transmissions (red voice, blue Morse, violet burst; hollow = heard, not copied). A set that keeps the same time every night is a set you can wait for.</p>';
    sheet.innerHTML = h;
  }
  UI.views.traffic = T;
  return T;
})();
