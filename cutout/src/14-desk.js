/* CUTOUT UI — 14-desk.js: inbox + document viewer. */
var UIDesk = UI.views.desk = {
  build: function (root) {
    root.innerHTML = '<div class="desk"><div class="inbox"><div class="scroll" id="ib-scroll"><div class="ib-search"><input type="search" id="ib-q" placeholder="Search documents — a name, a number…" autocomplete="off" spellcheck="false" aria-label="Search documents"></div><div class="ib-head" id="ib-chips"></div><div id="ib-list"></div></div></div>' +
      '<div class="viewer" id="viewer"><div class="vw-bar"><button class="back" aria-label="Back to inbox">‹</button><div class="ttl"><b id="vw-title"></b><span id="vw-sub"></span></div><button class="act" id="vw-pin">Pin to board</button></div>' +
      '<div class="vw-body"><div class="scroll" id="vw-scroll"><div class="vw-inner" id="vw-inner"></div></div></div></div></div>';
    UI$('#ib-list').addEventListener('click', function (e) { var b = e.target.closest('.ib-item'); if (b) UIDesk.open(b.dataset.id); });
    UI$('#ib-chips').addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      if (b.dataset.f === 'markall') { UIA.docs().forEach(function (d) { UIS.read[d.id] = 1; }); UI.badges(); UIDesk.refresh(); UI.save(); return; }
      UIS.filter = b.dataset.f; UIDesk.refresh(); UI.save();
    });
    var qt; UI$('#ib-q').addEventListener('input', function () { clearTimeout(qt); qt = setTimeout(function () { UIDesk.refresh(); }, 120); });
    UI$('#viewer .back').addEventListener('click', function () { UIDesk.back(); });
    UI$('#vw-pin').addEventListener('click', function () { if (UIS.openDoc) UIBoard.addDoc(UIS.openDoc); });
    UI.bindTokens(UI$('#vw-inner'));
  },
  show: function (o) {
    this.refresh();
    if (o.open) this.open(o.open);
    else if (UIS.openDoc && UIA.doc(UIS.openDoc)) this.open(UIS.openDoc, true);
    else if (window.innerWidth >= 900) { var d = UIA.docs(); if (d.length) this.open(d[d.length - 1].id, true); }
    else this.renderViewer(null);
  },
  refresh: function () {
    var f = UIS.filter || 'all';
    var docs = UIA.docs();
    var nUnread = docs.filter(function (d) { return !UIS.read[d.id]; }).length;
    var chips = [['all', 'All ' + docs.length], ['unread', 'Unread ' + nUnread], ['traffic', 'Traffic'], ['records', 'Records'], ['hl', 'Highlighted']];
    if (nUnread > 3) chips.push(['markall', 'Mark all read']);
    var q = (UI$('#ib-q') && UI$('#ib-q').value || '').trim().toLowerCase();
    UI$('#ib-chips').innerHTML = chips.map(function (c) { return '<button class="chip' + (c[0] === f ? ' on' : '') + '" data-f="' + c[0] + '">' + c[1] + '</button>'; }).join('');
    var list = docs.filter(function (d) {
      if (q && (d.title + ' ' + (d.from || '') + ' ' + (d.tokens || []).map(function (t) { return (t.d || '') + ' ' + t.v; }).join(' ')).toLowerCase().indexOf(q) < 0) return false;
      if (f === 'unread') return !UIS.read[d.id];
      if (f === 'traffic') return d.sys === 'traffic';
      if (f === 'records') return d.sys !== 'traffic';
      if (f === 'hl') return (d.tokens || []).some(function (t) { return UIS.hl[t.t + ':' + t.v]; });
      return true;
    }).slice().reverse();
    var html = '', lastDay = null;
    list.forEach(function (d) {
      if (d.day !== lastDay) { html += '<div class="ib-day">' + UIesc(UIA.dateLong(d.day).replace(/ 1989$/, '')) + '</div>'; lastDay = d.day; }
      var k = UIDoc.thumbKind(d);
      var nores = d.kind === 'query' && d.recs && d.recs.length === 0;
      html += '<button class="ib-item' + (UIS.read[d.id] ? ' read' : '') + (UIS.openDoc === d.id ? ' sel' : '') + '" data-id="' + d.id + '">' +
        '<span class="ib-thumb k-' + k + '"><i style="top:8px"></i><i style="top:14px;right:12px"></i><i style="top:20px"></i><i style="top:26px;right:16px"></i>' + (nores ? '<b>NIL</b>' : '') + '</span>' +
        '<span class="ib-txt"><b>' + UIesc(d.title) + '</b><span>' + UIesc(UIDoc.sourceLabel(d)) + (d.hours ? ' · ' + d.hours + 'h' : '') + (nores ? ' · no trace' : '') + '</span></span>' +
        '<span class="ib-meta">' + UIesc(d.time || '') + (UIS.read[d.id] ? '' : '<span class="dot"></span>') + '</span></button>';
    });
    if (!list.length) html = '<div class="ib-empty">' + (f === 'all' ? 'The desk is empty.' : 'Nothing here.') + '</div>';
    if (f === 'all' && !UIS.queries.length && UIA.day() === 0) html += '<div class="ib-hint">Start with the <b>telex</b>. Every underlined name, number, plate or hotel is a key: tap it to pull records. Each request costs team-hours; you have <b>' + UIA.dayHours() + '</b> a day. The newspaper tells you who will be where — keep it in mind.</div>';
    UI$('#ib-list').innerHTML = html;
  },
  open: function (id, quiet) {
    var d = UIA.doc(id); if (!d) return;
    UIS.openDoc = id;
    if (!UIS.read[id]) { UIS.read[id] = 1; UI.badges(); }
    this.renderViewer(d);
    if (window.innerWidth < 900 && !UIhist.has('viewer')) UIhist.push('viewer', function () { UIDesk.back(true); });
    UI$('#viewer').classList.add('on');
    UI$$('#ib-list .ib-item').forEach(function (b) { b.classList.toggle('sel', b.dataset.id === id); if (b.dataset.id === id) { b.classList.add('read'); var dt = b.querySelector('.dot'); if (dt) dt.remove(); } });
    if (!quiet) UI$('#vw-scroll').scrollTop = 0;
    var ch = UI$('#ib-chips .chip[data-f=unread]'); if (ch) ch.textContent = 'Unread ' + UIA.docs().filter(function (x) { return !UIS.read[x.id]; }).length;
    UI.save();
  },
  back: function (fromPop) {
    if (window.innerWidth >= 900) return;
    if (fromPop !== true) UIhist.drop('viewer');
    UI$('#viewer').classList.remove('on');
    UIS.openDoc = null;
    UI.save();
  },
  renderViewer: function (d) {
    var inner = UI$('#vw-inner');
    if (!d) {
      UI$('#vw-title').textContent = ''; UI$('#vw-sub').textContent = '';
      UI$('#vw-pin').hidden = true;
      inner.innerHTML = '<div class="vw-empty" style="min-height:60vh">' + UIICON.file + '<div>Choose a document from the inbox.<br>Tap any underlined name, number or plate to pull records on it.</div></div>';
      return;
    }
    UI$('#vw-pin').hidden = false;
    var pinned = UIS.board.cards.some(function (c) { return c.kind === 'doc' && c.ref === d.id; });
    UI$('#vw-pin').textContent = pinned ? 'On the board' : 'Pin to board';
    UI$('#vw-title').textContent = d.title;
    UI$('#vw-sub').textContent = UIDoc.sourceLabel(d) + ' · ' + UIA.dateLabel(d.day) + ' ' + (d.time || '') + (d.hours ? ' · cost ' + d.hours + 'h' : '');
    UIDoc.setHighlights(UIS.hl);
    inner.dataset.doc = d.id;
    inner.innerHTML = UIDoc.render(d);
  }
};
