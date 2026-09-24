/* CUTOUT UI — 14-desk.js: inbox + document viewer. */
var UIDesk = UI.views.desk = {
  build: function (root) {
    root.innerHTML = '<div class="desk"><div class="inbox"><div class="scroll" id="ib-scroll"><div class="ib-search"><input type="search" id="ib-q" placeholder="Search documents — a name, a number…" autocomplete="off" spellcheck="false" aria-label="Search documents"></div><div class="ib-head" id="ib-chips"></div><div id="ib-list"></div></div></div>' +
      '<div class="viewer" id="viewer"><div class="vw-bar"><button class="back" aria-label="Back to inbox">‹</button><div class="ttl"><b id="vw-title"></b><span id="vw-sub"></span></div><button class="act" id="vw-pin">Pin to board</button></div>' +
      '<div class="vw-body"><div class="scroll" id="vw-scroll"><div class="vw-inner" id="vw-inner"></div></div></div></div></div>';
    UI$('#ib-list').addEventListener('click', function (e) {
      var x = e.target.closest('.xr-doc'); if (x) { UIDesk.open(x.dataset.id); return; }
      var t = e.target.closest('.xr-tok'); if (t) { UI.tokenSheet(t.dataset.t, t.dataset.v, t.dataset.d, {}); return; }
      var b = e.target.closest('.ib-item'); if (b) UIDesk.open(b.dataset.id);
    });
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
    var xon = UI.xrefOn();
    if (f === 'xref' && !xon) f = UIS.filter = 'all';
    var xmap = xon ? UIA.xrefs() : {};
    var chips = [['all', 'All ' + docs.length], ['unread', 'Unread ' + nUnread]].concat(xon ? [['xref', 'Cross-refs ' + Object.keys(xmap).length]] : []).concat([['traffic', 'Traffic'], ['records', 'Records'], ['hl', 'Highlighted']]);
    if (nUnread > 3) chips.push(['markall', 'Mark all read']);
    var q = (UI$('#ib-q') && UI$('#ib-q').value || '').trim().toLowerCase();
    UI$('#ib-chips').innerHTML = chips.map(function (c) { return '<button class="chip' + (c[0] === f ? ' on' : '') + '" data-f="' + c[0] + '">' + c[1] + '</button>'; }).join('');
    if (f === 'xref') { UI$('#ib-list').innerHTML = this.xrefHTML(xmap, q); this._n = docs.length; return; }
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
    // new documents can add cross-reference marks to the one on screen
    if (this._n !== undefined && this._n !== docs.length && UIS.openDoc && UIA.doc(UIS.openDoc)) this.renderViewer(UIA.doc(UIS.openDoc));
    this._n = docs.length;
  },
  /** identifiers that recur across the documents on the desk, most frequent first */
  xrefHTML: function (xmap, q) {
    var ORDER = { passport: 0, number: 1, plate: 2, account: 3, company: 4, address: 5 };
    var list = Object.keys(xmap).map(function (k) { return xmap[k]; }).filter(function (x) { return !q || (x.d + ' ' + x.v).toLowerCase().indexOf(q) >= 0; });
    // identifiers that turned up on their own (not only in your requests on them) first
    function ind(x) { return x.docs.length - x.mine.length; }
    list.sort(function (a, b) { return ind(b) - ind(a) || b.docs.length - a.docs.length || ORDER[a.t] - ORDER[b.t] || (a.d < b.d ? -1 : 1); });
    if (!list.length) return '<div class="ib-empty">' + (q ? 'No recurring identifier matches.' : 'No identifier has turned up in two documents yet.') + '</div>';
    return '<div class="ib-hint" style="margin-top:4px">Passports, telephone numbers, plates, accounts, firms and addresses that appear in more than one of your documents. The same number in two places is how a false name comes apart.</div>' +
      list.map(function (x) {
        return '<div class="xr-row"><button class="xr-tok" data-t="' + UIesc(x.t) + '" data-v="' + UIesc(x.v) + '" data-d="' + UIesc(x.d) + '"><span class="xr-ty">' + UIesc(UITYPE[x.t] || x.t) + '</span><b>' + UIesc(x.d) + '</b><span class="xr-n">' + x.docs.length + ' docs</span></button>' +
          x.docs.map(function (id) { var d = UIA.doc(id); return d ? '<button class="xr-doc' + (UIS.openDoc === id ? ' sel' : '') + '" data-id="' + id + '"><span class="xr-sys">' + UIesc(UISYSABBR[d.sys] || '') + '</span><span class="xr-tt">' + UIesc(d.title) + (x.mine.indexOf(id) >= 0 ? ' <i class="xr-mine">your request</i>' : '') + '</span><span class="xr-dt">' + UIesc(UIA.dateLabel(d.day).replace(/^\w+ /, '')) + '</span></button>' : ''; }).join('') + '</div>';
      }).join('');
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
    UIDoc.setHighlights(UIS.hl); UIDoc.setXref(UI.xrefOn() ? UIA.xrefs() : null);
    inner.dataset.doc = d.id;
    inner.innerHTML = UIDoc.render(d);
  }
};
