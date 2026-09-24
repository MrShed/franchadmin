/* CUTOUT UI — 13-app.js: state, frame (top bar, tabs), sheet, toast, token actions, day cycle. */
var UIS = null; // UI state saved alongside the engine save
var UI = {
  views: {},
  freshState: function () {
    return { v: 1, tab: 'desk', read: {}, hl: {}, openDoc: null, filter: 'all', board: { cards: [], links: [], view: null, n: 0 }, warrants: [], stamped: {}, recSys: 'hotels', recType: null, queries: [] };
  },
  save: function () { if (UIA.cs) UIA.writeSave(UIS); },
  /** re-render whatever depends on case state */
  refresh: function () {
    UI.topbar();
    UI.badges();
    var v = UI.views[UIS.tab];
    if (v && v.refresh) v.refresh();
  }
};

// ------------------------------------------------------------ toast
function UItoast(msg, ms) {
  var t = UI$('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(UItoast._t);
  UItoast._t = setTimeout(function () { t.classList.remove('on'); }, ms || 2200);
}

// ------------------------------------------------------------ back button (phones): layers pushed on history
var UIhist = {
  stack: [], ignore: 0, armed: false, t: null,
  push: function (name, close) { UIhist.stack.push({ name: name, close: close }); UIhist.sync(); },
  /** a layer closed by the UI itself */
  drop: function (name) { UIhist.stack = UIhist.stack.filter(function (l) { return l.name !== name; }); UIhist.sync(); },
  has: function (name) { return UIhist.stack.some(function (l) { return l.name === name; }); },
  // keep exactly one extra history entry while any layer is open (settled on the next tick)
  sync: function () {
    clearTimeout(UIhist.t);
    UIhist.t = setTimeout(function () {
      try {
        if (UIhist.stack.length && !UIhist.armed) { history.pushState({ cutout: 1 }, ''); UIhist.armed = true; }
        else if (!UIhist.stack.length && UIhist.armed) { UIhist.armed = false; UIhist.ignore++; history.back(); }
      } catch (e) { /* ignore */ }
    }, 0);
  }
};
window.addEventListener('popstate', function () {
  if (UIhist.ignore) { UIhist.ignore--; return; }
  UIhist.armed = false;
  var top = UIhist.stack.pop();
  if (top) top.close(true);
  UIhist.sync();
});

// ------------------------------------------------------------ sheet (bottom sheet on phone, dialog on desktop)
var UIsheet = {
  stack: [],
  open: function (o) {
    var sh = UI$('#sheet'), sc = UI$('#scrim');
    sh.innerHTML = '<div class="sh-grip"></div><div class="sh-head"><h3>' + UIesc(o.title || '') + '</h3>' + (o.sub ? '<div class="sub">' + o.sub + '</div>' : '') + '</div><div class="sh-body">' + (o.html || '') + '</div>';
    sc.hidden = false;
    if (!UIsheet.cur) UIhist.push('sheet', function () { UIsheet.close(true); });
    UIsheet.cur = o;
    requestAnimationFrame(function () { sc.classList.add('on'); sh.classList.add('on'); });
    if (o.mount) o.mount(sh.querySelector('.sh-body'), sh);
    UIsheet.lastFocus = document.activeElement;
    setTimeout(function () { var f = sh.querySelector('[autofocus]'); if (f && !('ontouchstart' in window)) f.focus(); }, 60);
  },
  close: function (fromPop) {
    var sh = UI$('#sheet'), sc = UI$('#scrim');
    if (!sh.classList.contains('on')) return;
    if (fromPop !== true) UIhist.drop('sheet');
    sh.classList.remove('on'); sc.classList.remove('on');
    var cur = UIsheet.cur; UIsheet.cur = null;
    setTimeout(function () { if (!UIsheet.cur) { sc.hidden = true; sh.innerHTML = ''; } }, 230);
    if (cur && cur.onClose) cur.onClose();
  },
  isOpen: function () { return !!UIsheet.cur; }
};

/** a list item button for sheets */
function UIitem(o) {
  return '<button class="sh-item' + (o.dis ? ' dis' : '') + '" data-act="' + UIesc(o.act || '') + '"' + (o.data ? ' data-x="' + UIesc(o.data) + '"' : '') + (o.dis ? ' disabled' : '') + '>' +
    (o.ic ? '<span class="ic">' + o.ic + '</span>' : '') + '<span class="tx"><b>' + UIesc(o.label) + '</b>' + (o.small ? '<small>' + UIesc(o.small) + '</small>' : '') + '</span>' + (o.cost ? '<span class="cost">' + UIesc(o.cost) + '</span>' : '') + '</button>';
}

/** autocomplete field over a list of {v,d,t?}; calls onPick(item) */
function UIautocomplete(root, o) {
  var inp = root.querySelector('input'), list = root.querySelector('.ac-list');
  var sel = 0, items = [], focused = false;
  inp.addEventListener('focus', function () { focused = true; render(); });
  inp.addEventListener('blur', function () { setTimeout(function () { focused = false; if (o.lazy) render(); }, 180); });
  function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function render() {
    if (o.lazy && !focused && !inp.value.trim()) { list.innerHTML = ''; return; }
    var q = norm(inp.value.trim());
    var src = o.items();
    items = src.filter(function (it) { return !q || norm(it.d || it.v).indexOf(q) >= 0 || norm(it.v).indexOf(q) >= 0; }).slice(0, o.max || 40);
    if (sel >= items.length) sel = 0;
    list.innerHTML = items.length ? items.map(function (it, i) { return '<button type="button" data-i="' + i + '" class="' + (i === sel ? 'sel' : '') + '"><span>' + UIesc(it.d || it.v) + '</span>' + (it.tag ? '<small>' + UIesc(it.tag) + '</small>' : '') + '</button>'; }).join('')
      : '<div class="ac-empty">' + UIesc(src.length ? 'No match among the keys you hold.' : (o.empty || 'Nothing known yet.')) + '</div>';
  }
  inp.addEventListener('input', function () { sel = 0; render(); if (o.onInput) o.onInput(); });
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); render(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); render(); e.preventDefault(); }
    else if (e.key === 'Enter') { if (items[sel]) { o.onPick(items[sel]); } e.preventDefault(); }
  });
  list.addEventListener('click', function (e) { var b = e.target.closest('button[data-i]'); if (b) o.onPick(items[+b.dataset.i]); });
  render();
  return { render: render, set: function (s) { inp.value = s; render(); } };
}

// ------------------------------------------------------------ frame
UI.tabs = [['desk', 'Desk'], ['records', 'Records'], ['board', 'Board'], ['case', 'Case']];
UI.buildFrame = function () {
  var tabsHTML = UI.tabs.map(function (t) { return '<button class="tab" data-tab="' + t[0] + '" aria-label="' + t[1] + '">' + UIICON[t[0]] + '<span>' + t[1].toUpperCase() + '</span></button>'; }).join('');
  UI$('#tabbar').innerHTML = tabsHTML;
  UI$('#topbar').innerHTML = '<div class="tb-date"><b id="tb-date"></b><span id="tb-sub"></span></div><div class="tb-tabs">' + tabsHTML + '</div>' +
    '<div class="tb-hours" title="Team-hours left today"><div class="pips" id="tb-pips"></div><div class="tb-hnum" id="tb-h"></div></div><button class="tb-end" id="tb-end">End day</button>';
  UI$$('.tab').forEach(function (b) { b.addEventListener('click', function () { UI.go(b.dataset.tab); }); });
  UI$('#tb-end').addEventListener('click', UI.confirmEndDay);
};
UI.topbar = function () {
  if (!UIA.cs) return;
  var d = UIA.day();
  UI$('#tb-date').textContent = UIA.topDate(d);
  UI$('#tb-sub').textContent = 'Day ' + (d + 1) + ' · ' + UIA.clock() + ' · Vienna desk';
  var h = UIA.hoursLeft(), H = UIA.dayHours();
  var p = ''; for (var i = 0; i < H; i++) p += '<i class="pip' + (i < h ? ' on' : '') + '"></i>';
  UI$('#tb-pips').innerHTML = p;
  UI$('#tb-h').innerHTML = h + '<small>HRS</small>';
  UI$('#tb-end').disabled = UIA.over();
};
UI.badges = function () {
  var unread = UIA.docs().filter(function (d) { return !UIS.read[d.id]; }).length;
  UI$$('.tab[data-tab=desk]').forEach(function (b) {
    var x = b.querySelector('.badge');
    if (!unread) { if (x) x.remove(); return; }
    if (!x) { x = document.createElement('span'); x.className = 'badge'; b.appendChild(x); }
    x.textContent = unread > 99 ? '99+' : unread;
  });
};
UI.go = function (tab, opts) {
  if (!UI.views[tab]) return;
  var prev = UIS.tab;
  if (prev === 'desk' && tab !== 'desk') UIhist.drop('viewer');
  UIS.tab = tab;
  UI$$('.tab').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
  UI$$('.view').forEach(function (v) { v.classList.toggle('on', v.id === 'v-' + tab); });
  var v = UI.views[tab];
  if (!v.built) { v.build(UI$('#v-' + tab)); v.built = true; }
  if (v.show) v.show(opts || {}, prev);
  UI.save();
};

// ------------------------------------------------------------ token action sheet
UI.tokenSheet = function (t, v, d, ctx) {
  ctx = ctx || {};
  var key = t + ':' + v;
  var sys = UIA.systemsFor(t);
  var html = '';
  var h = UIA.hoursLeft();
  if (sys.length && t !== 'hotel') {
    html += '<div class="lbl sh-sec">Pull records</div><div class="sh-list">' + sys.map(function (s) {
      var prev = UIS.queries.filter(function (q) { return q.sys === s.id && q.k === key; }).pop();
      var small = prev ? 'Pulled ' + UIA.dateLabel(prev.day) + ' — records can grow' : UISYSHINT[s.id];
      var dis = UIA.over() || s.hours > h;
      return UIitem({ act: 'pull', data: s.id, ic: UISYSABBR[s.id], label: s.label, small: dis && !UIA.over() ? 'Not enough hours today' : small, cost: s.hours + 'h', dis: dis });
    }).join('') + '</div>';
  }
  if (t === 'hotel' || t === 'date') {
    var S = UIA.system('hotels');
    var others = UIA.known().filter(function (k) { return k.t === (t === 'hotel' ? 'date' : 'hotel'); });
    if (t === 'hotel') others = others.filter(function (k) { return +k.v < UIA.day(); }).sort(function (a, b) { return b.v - a.v; });
    if (t === 'date' && +v >= UIA.day()) others = [];
    html += '<div class="lbl sh-sec">Hotel register — who stayed that night (' + S.hours + 'h)</div>';
    if (others.length) html += '<div class="sh-list">' + others.slice(0, 14).map(function (k) {
      var hotel = t === 'hotel' ? v : k.v, date = t === 'hotel' ? k.v : v;
      return UIitem({ act: 'night', data: hotel + '|' + date, ic: 'HTL', label: t === 'hotel' ? 'Night of ' + UIA.dateLabel(+k.v) : (k.d || k.v), small: t === 'hotel' ? (k.d || '') : 'night of ' + (d || UIA.dateLabel(+v)), cost: S.hours + 'h', dis: UIA.over() || S.hours > h });
    }).join('') + '</div>';
    else html += '<p class="muted" style="font-size:13px;margin:6px 0 10px">' + (t === 'date' && +v >= UIA.day() ? 'That night has not happened yet.' : 'You need a ' + (t === 'hotel' ? 'past date' : 'hotel') + ' from a document to pair with this.') + '</p>';
  }
  html += '<div class="lbl sh-sec">Desk</div><div class="sh-list">';
  if (t === 'name') {
    html += UIitem({ act: 'board-subj', ic: '+', label: 'Add to board as a new subject', small: 'A card for the person behind this name' });
    var subs = UIA.subjects().filter(function (s) { return s.names.indexOf(v) < 0; });
    if (subs.length) html += UIitem({ act: 'board-merge', ic: '⇢', label: 'Add this name to a subject…', small: subs.length + ' subject' + (subs.length > 1 ? 's' : '') + ' on the board' });
    html += UIitem({ act: 'prop', ic: '§', label: 'File a proposition about this name', small: 'Same person as… / plays the role of…' });
  } else if (t === 'target' || t === 'place' || t === 'date') {
    var field = t === 'target' ? 'target' : t === 'place' ? 'place' : 'date';
    html += UIitem({ act: 'plot', data: field, ic: '§', label: 'File as the plot ' + field, small: 'Your hypothesis — never confirmed until the act' });
    html += UIitem({ act: 'board-tok', ic: '+', label: 'Pin to the board' });
  } else html += UIitem({ act: 'board-tok', ic: '+', label: 'Pin to the board', small: 'A tag card you can string to subjects' });
  html += UIitem({ act: 'hl', ic: UIS.hl[key] ? '×' : '▮', label: UIS.hl[key] ? 'Remove highlight' : 'Highlight everywhere', small: 'Marks every occurrence in every document' });
  html += '</div>';
  UIsheet.open({
    title: UITYPE[t] || t, sub: UIesc(d || v), html: html,
    mount: function (body) {
      body.addEventListener('click', function (e) {
        var b = e.target.closest('.sh-item'); if (!b || b.disabled) return;
        var a = b.dataset.act, x = b.dataset.x;
        if (a === 'pull') { UIsheet.close(); UI.runQuery(x, { t: t, v: v }); }
        else if (a === 'night') { var p = x.split('|'); UIsheet.close(); UI.runQuery('hotels', { t: 'hotel+date', hotel: p[0], date: +p[1] }); }
        else if (a === 'board-subj') { UIsheet.close(); UIBoard.addSubjectFor(v); }
        else if (a === 'board-merge') { UIBoard.pickSubjectFor(v); }
        else if (a === 'board-tok') { UIsheet.close(); UIBoard.addToken(t, v, d); }
        else if (a === 'prop') { UIsheet.close(); UICase.proposeSheet({ type: 'same', a: v }); }
        else if (a === 'plot') { UIsheet.close(); UICase.filePlot(x, v, d); }
        else if (a === 'hl') { if (UIS.hl[key]) delete UIS.hl[key]; else UIS.hl[key] = 1; UIsheet.close(); UIDoc.setHighlights(UIS.hl); UI$$('.tk').forEach(function (el) { if (el.dataset.t + ':' + el.dataset.v === key) el.classList.toggle('hl', !!UIS.hl[key]); }); UI.save(); }
      });
    }
  });
};
/** delegate taps on tokens anywhere */
UI.bindTokens = function (root) {
  root.addEventListener('click', function (e) {
    var el = e.target.closest('.tk'); if (!el) return;
    e.preventDefault();
    UI.tokenSheet(el.dataset.t, el.dataset.v, el.textContent, { doc: root.dataset.doc });
  });
  root.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('tk')) { e.preventDefault(); e.target.click(); }
  });
};

// ------------------------------------------------------------ queries
UI.runQuery = function (sys, key, opts) {
  opts = opts || {};
  var err = UIA.canQuery(sys, key);
  if (err) { UItoast(err); return null; }
  var r = UIA.query(sys, key);
  if (r.error) { UItoast(r.error); return null; }
  var k = key.t === 'hotel+date' ? 'hotel+date:' + key.hotel + '|' + key.date : key.t + ':' + key.v;
  UIS.queries.push({ sys: sys, k: k, day: UIA.day(), doc: r.doc.id, label: key.t === 'hotel+date' ? (key.hotel.split(',')[0] + ', ' + UIA.dateLabel(key.date)) : (key.d || key.v) });
  UI.save();
  UI.topbar(); UI.badges();
  UItoast(r.hoursSpent + 'h — ' + (r.doc.recs && r.doc.recs.length === 0 ? 'no trace' : 'records received'));
  if (!opts.stay) UI.go('desk', { open: r.doc.id });
  return r.doc;
};

// ------------------------------------------------------------ day cycle
UI.confirmEndDay = function () {
  if (UIA.over()) return;
  var ex = UI$('.pop'); if (ex) { ex.remove(); return; }
  var h = UIA.hoursLeft();
  var d = UIA.day();
  var pop = UIel('<div class="pop" role="dialog"><h4>End ' + UIesc(UIA.dateLong(d).split(' ')[0]) + '?</h4><p>' + (h ? h + ' team-hour' + (h > 1 ? 's' : '') + ' unused will be lost. ' : 'The team is spent. ') + 'Overnight the network moves and the morning traffic arrives.</p><div class="row"><button class="btn small ghost" data-x="no">Keep working</button><button class="btn small primary" data-x="yes">End day</button></div></div>');
  document.body.appendChild(pop);
  pop.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    pop.remove();
    if (b.dataset.x === 'yes') UI.endDay();
  });
  setTimeout(function () {
    document.addEventListener('pointerdown', function off(e) { if (!pop.contains(e.target) && e.target.id !== 'tb-end') { pop.remove(); } document.removeEventListener('pointerdown', off, true); }, true);
  }, 0);
};
UI.endDay = function () {
  var n = UI$('#night');
  var next = UIA.day() + 1;
  n.innerHTML = '<svg viewBox="0 0 100 100" fill="none" stroke="#b9b19e" stroke-width="2"><circle cx="50" cy="50" r="44"/>' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (i) { var a = i * Math.PI / 6; return '<line x1="' + (50 + Math.sin(a) * 36).toFixed(1) + '" y1="' + (50 - Math.cos(a) * 36).toFixed(1) + '" x2="' + (50 + Math.sin(a) * 40).toFixed(1) + '" y2="' + (50 - Math.cos(a) * 40).toFixed(1) + '"/>'; }).join('') + '<line class="hh" x1="50" y1="50" x2="50" y2="28" stroke-width="3" style="transform:rotate(180deg)"/><line class="mh" x1="50" y1="50" x2="50" y2="16" style="transform:rotate(0deg)"/><circle cx="50" cy="50" r="2.5" fill="#b9b19e"/></svg><div class="n-clock">NIGHT</div><div class="n-date">' + UIesc(UIA.dateLong(next)) + '</div><div class="n-sub">&nbsp;</div>';
  n.classList.add('on');
  setTimeout(function () { var hh = n.querySelector('.hh'), mh = n.querySelector('.mh'); if (hh) { hh.style.transform = 'rotate(' + (360 + 210) + 'deg)'; mh.style.transform = 'rotate(' + (13 * 360) + 'deg)'; } }, 60);
  setTimeout(function () {
    var r = UIA.endDay();
    UI.save();
    if (r.outcome || UIA.over()) {
      n.querySelector('.n-clock').textContent = 'THE DAY OF THE ACT';
      n.querySelector('.n-date').textContent = UIA.dateLong(UIA.day());
      n.querySelector('.n-sub').textContent = 'The case is closed.';
      setTimeout(function () { n.classList.remove('on'); UIDebrief.show(); }, 1500);
      return;
    }
    var nd = r.newDocs || [];
    n.querySelector('.n-clock').textContent = 'MORNING · 07:00';
    n.querySelector('.n-sub').textContent = nd.length ? nd.length + ' new document' + (nd.length > 1 ? 's' : '') + ' on the desk' : 'Nothing overnight.';
    UI.refresh();
    setTimeout(function () { n.classList.remove('on'); if (UIS.tab !== 'desk') UI.go('desk'); else UI.views.desk.refresh(); }, 1300);
  }, 520);
};

// ------------------------------------------------------------ keyboard
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    if (UIsheet.isOpen()) { UIsheet.close(); return; }
    var p = UI$('.pop'); if (p) { p.remove(); return; }
    if (UIS && UIS.tab === 'desk' && UI.views.desk.back) UI.views.desk.back();
  }
});
document.addEventListener('click', function (e) { if (e.target.id === 'scrim') UIsheet.close(); });
document.addEventListener('keydown', function (e) {
  if (!UIS || UIS.tab !== 'desk' || UIsheet.isOpen() || /INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ''))) return;
  if (e.key !== 'j' && e.key !== 'k' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  var ids = UI$$('#ib-list .ib-item').map(function (b) { return b.dataset.id; });
  if (!ids.length) return;
  var i = ids.indexOf(UIS.openDoc);
  i = (e.key === 'j' || e.key === 'ArrowDown') ? Math.min(ids.length - 1, i + 1) : Math.max(0, i - 1);
  e.preventDefault();
  UIDesk.open(ids[i]);
  var el = UI$('#ib-list .ib-item[data-id="' + ids[i] + '"]'); if (el) el.scrollIntoView({ block: 'nearest' });
});
