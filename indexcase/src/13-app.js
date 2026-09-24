/* INDEX CASE UI — 13-app.js: UI state, frame (top bar, tabs), sheet, popover,
 * toast, reference links, the day cycle, act cards, autosave. */
var UIS = null; // UI state, saved alongside the engine save
var UI = {
  views: {},
  listeners: [],
  freshState: function () {
    return { v: 1, tab: 'brief', read: {}, seen: {}, map: { view: null, layers: { cases: true, clusters: true, venues: true, ww: false }, recency: 14 },
      cases: { sub: 'list', sort: 'recent', filter: 'all', q: '' }, lab: {}, brief: { sub: 'inbox', open: null, filter: 'all' },
      est: { draft: {} }, coach: null, mentor: [], dayOpen: {}, pendingActs: [], log: [] };
  },
  save: function () { if (UIA.g && UIS) UIA.writeSave(UIS); },
  /** re-render whatever depends on game state */
  refresh: function () {
    UI.topbar(); UI.badges();
    var v = UI.views[UIS.tab];
    if (v && v.built && v.refresh) v.refresh();
    UI.emit('refresh');
  },
  on: function (f) { UI.listeners.push(f); },
  emit: function (ev, data) { UI.listeners.slice().forEach(function (f) { try { f(ev, data); } catch (e) { /* ignore */ } }); }
};

// ------------------------------------------------------------ toast
function UItoast(msg, o) {
  o = o || {};
  var t = UI$('#toast');
  t.textContent = msg;
  t.classList.toggle('err', !!o.err);
  t.classList.add('on');
  clearTimeout(UItoast._t);
  UItoast._t = setTimeout(function () { t.classList.remove('on'); }, o.ms || 2400);
}

// ------------------------------------------------------------ history (phone back button closes layers)
var UIhist = {
  stack: [], ignore: 0, armed: false, t: null,
  push: function (name, close) { UIhist.stack.push({ name: name, close: close }); UIhist.sync(); },
  drop: function (name) { UIhist.stack = UIhist.stack.filter(function (l) { return l.name !== name; }); UIhist.sync(); },
  sync: function () {
    clearTimeout(UIhist.t);
    UIhist.t = setTimeout(function () {
      try {
        if (UIhist.stack.length && !UIhist.armed) { history.pushState({ ix: 1 }, ''); UIhist.armed = true; }
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
  cur: null, stack: [],
  /** o: {title, eyebrow, sub, html, mount(body, sheet), wide, onClose, replace} */
  open: function (o) {
    var sh = UI$('#sheet'), sc = UI$('#scrim');
    var wasOpen = !!UIsheet.cur;
    if (wasOpen && o.push) UIsheet.stack.push(UIsheet.cur);
    else if (!wasOpen) UIsheet.stack = [];
    UIsheet.render(o);
    sc.hidden = false;
    if (!wasOpen) { UIhist.push('sheet', function () { UIsheet.close(true); }); UIAudio.cue('open'); }
    UIsheet.cur = o;
    sh.classList.toggle('wide', !!o.wide);
    requestAnimationFrame(function () { if (UIsheet.cur !== o) return; sc.classList.add('on'); sh.classList.add('on'); });
    UI.emit('sheet', o.tag || o.title);
  },
  render: function (o) {
    var sh = UI$('#sheet');
    sh.innerHTML = '<div class="sh-grip"></div><div class="sh-head">' + (UIsheet.stack.length ? '<button class="ibtn x" data-sh="back" aria-label="Back" style="margin:-6px 0 0 -10px">' + UIICON.back + '</button>' : '') +
      '<div class="t">' + (o.eyebrow ? '<div class="eyebrow' + (o.em ? ' em' : '') + '">' + o.eyebrow + '</div>' : '') + '<h3>' + UIesc(o.title || '') + '</h3>' + (o.sub ? '<div class="sub">' + o.sub + '</div>' : '') + '</div>' +
      '<button class="ibtn x" data-sh="close" aria-label="Close">' + UIICON.close + '</button></div><div class="sh-body">' + (o.html || '') + '</div>';
    sh.querySelector('[data-sh=close]').addEventListener('click', function () { UIsheet.close(); });
    var bk = sh.querySelector('[data-sh=back]'); if (bk) bk.addEventListener('click', UIsheet.back);
    UIsheet.bindDrag(sh);
    if (o.mount) o.mount(sh.querySelector('.sh-body'), sh);
  },
  back: function () { var p = UIsheet.stack.pop(); if (!p) { UIsheet.close(); return; } UIsheet.cur = p; if (p.reopen) p.reopen(); else UIsheet.render(p); },
  /** re-render the current sheet (after an action changed the game) */
  reload: function () { var o = UIsheet.cur; if (o && o.reopen) o.reopen(true); },
  close: function (fromPop) {
    var sh = UI$('#sheet'), sc = UI$('#scrim');
    if (!UIsheet.cur) return;
    if (fromPop !== true) UIhist.drop('sheet');
    sh.classList.remove('on'); sc.classList.remove('on'); sh.style.transform = '';
    var cur = UIsheet.cur; UIsheet.cur = null; UIsheet.stack = [];
    UIAudio.cue('close');
    setTimeout(function () { if (!UIsheet.cur) { sc.hidden = true; sh.innerHTML = ''; } }, 300);
    if (cur && cur.onClose) cur.onClose();
    UI.emit('sheetclose');
  },
  isOpen: function () { return !!UIsheet.cur; },
  bindDrag: function (sh) {
    if (window.innerWidth >= 900) return;
    var y0 = null, dy = 0;
    function down(e) { y0 = e.clientY; dy = 0; sh.classList.add('drag'); try { e.target.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } }
    function move(e) { if (y0 === null) return; dy = Math.max(0, e.clientY - y0); sh.style.transform = 'translateY(' + dy + 'px)'; }
    function up() { if (y0 === null) return; y0 = null; sh.classList.remove('drag'); if (dy > 90) UIsheet.close(); else sh.style.transform = ''; }
    [sh.querySelector('.sh-grip'), sh.querySelector('.sh-head')].forEach(function (el) {
      el.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; down(e); });
      el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    });
  }
};

/** list row button */
function UIli(o) {
  return '<button class="li" ' + (o.attrs || '') + (o.dis ? ' disabled' : '') + '>' + (o.ic ? '<span class="ic"' + (o.icStyle ? ' style="' + o.icStyle + '"' : '') + '>' + o.ic + '</span>' : '') +
    '<span class="tx"><b>' + o.label + '</b>' + (o.small ? '<small>' + o.small + '</small>' : '') + '</span>' + (o.right !== undefined ? '<span class="cost">' + o.right + '</span>' : '<svg class="chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>') + '</button>';
}

/** cost chips for an action */
function UIcosts(a, opt) {
  opt = opt || {};
  var c = a.costs, h = '', r = UIA.res();
  var HL = { tracers: 'T', field: 'F', analysts: 'A' };
  Object.keys(c.hours || {}).forEach(function (k) { var v = c.hours[k]; if (!v) return; var no = r.hours[k] && r.hours[k].left < v; h += '<span class="cst h' + (no ? ' no' : '') + '" title="' + k + ' hours">' + v + 'h ' + (HL[k] || k.charAt(0).toUpperCase()) + '</span>'; });
  if (c.tests) h += '<span class="cst t' + (r.tests.left < c.tests ? ' no' : '') + '">' + c.tests + ' test' + (c.tests > 1 ? 's' : '') + '</span>';
  if (c.seq) h += '<span class="cst s' + (r.seq.left < c.seq ? ' no' : '') + '">' + c.seq + ' seq</span>';
  if (c.money) h += '<span class="cst m">' + UIfmt.money(c.money) + '</span>';
  if (c.perDay) h += '<span class="cst m">' + UIfmt.money(c.perDay) + '/day</span>';
  if (opt.lag && a.lag) h += '<span class="cst lag">~' + a.lag + 'd lag</span>';
  if (!h) h = '<span class="cst">free</span>';
  return '<span class="costs">' + h + '</span>';
}

// ------------------------------------------------------------ reference links in text
function UIparts(x) {
  return (x || []).map(function (p) {
    if (typeof p === 'string') return UIesc(p);
    var cls = p.ref === 'place' ? 'pl' : p.ref === 'district' ? 'dt' : 'p';
    return '<span class="lnk ' + cls + '" role="link" tabindex="0" data-ref="' + UIesc(p.ref) + '" data-id="' + UIesc(p.id) + '">' + UIesc(p.text) + '</span>';
  }).join('');
}
function UIbody(blocks) {
  return (blocks || []).map(function (b) {
    if (b.k === 'table') return '<div class="m-tbl"><table>' + (b.head ? '<thead><tr>' + b.head.map(function (h) { return '<th>' + UIesc(h) + '</th>'; }).join('') + '</tr></thead>' : '') + '<tbody>' + b.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + UIparts(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    if (b.k === 'q' || b.k === 'quote') return '<blockquote>' + (b.who ? '<cite>' + UIesc(b.who) + '</cite>' : '') + UIparts(b.x) + '</blockquote>';
    if (b.k === 'h') return '<h5>' + UIparts(b.x) + '</h5>';
    if (b.k === 'li') return '<p class="m-li">' + UIparts(b.x) + '</p>';
    if (b.k === 'say' || b.who) return '<p class="m-say"><b>' + UIesc(b.who || '') + '</b> ' + UIparts(b.x) + '</p>';
    return '<p>' + UIparts(b.x) + '</p>';
  }).join('');
}
UI.openRef = function (t, id) {
  UIAudio.cue('tap');
  if (t === 'person' || t === 'case') UICases.personSheet(id, { push: UIsheet.isOpen() });
  else if (t === 'place' || t === 'venue') UIMap.placeSheet(id, { push: UIsheet.isOpen() });
  else if (t === 'district') UIMap.districtSheet(id, { push: UIsheet.isOpen() });
  else if (t === 'msg') { UIsheet.close(); UIBrief.openMsg(id); }
  else if (t === 'cluster') UIMap.clusterSheet(id, { push: UIsheet.isOpen() });
};
document.addEventListener('click', function (e) {
  var r = e.target.closest('[data-ref]'); if (!r) return;
  e.preventDefault(); e.stopPropagation();
  UI.openRef(r.dataset.ref, r.dataset.id);
});
document.addEventListener('keydown', function (e) {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.ref) { e.preventDefault(); e.target.click(); }
});

// ------------------------------------------------------------ frame
UI.TABS = [['map', 'Map', 'map'], ['cases', 'Cases', 'cases'], ['lab', 'Lab', 'lab'], ['actions', 'Actions', 'actions'], ['brief', 'Briefing', 'brief']];
UI.buildFrame = function () {
  var tabs = UI.TABS.map(function (t) { return '<button class="tab" data-tab="' + t[0] + '" aria-label="' + t[1] + '">' + UIICON[t[2]] + '<span>' + t[1].toUpperCase() + '</span></button>'; }).join('');
  UI$('#tabbar').innerHTML = tabs;
  UI$('#topbar').innerHTML = '<div class="tb-wrap"><div class="tb-row"><div class="tb-day" id="tb-day"></div><div class="tb-tabs">' + tabs + '</div>' +
    '<button class="ibtn" id="tb-menu" aria-label="Menu">' + UIICON.menu + '</button><button class="tb-end" id="tb-end">' + UIICON.moon + '<span>End day</span></button></div>' +
    '<button class="tb-res" id="tb-res" aria-label="Resources"></button></div>';
  UI$$('.tab').forEach(function (b) { b.addEventListener('click', function () { UIAudio.cue('tap'); UI.go(b.dataset.tab); }); });
  UI$('#tb-end').addEventListener('click', UI.confirmEndDay);
  UI$('#tb-menu').addEventListener('click', UI.menu);
  UI$('#tb-res').addEventListener('click', UI.resourceSheet);
  // desktop: move resource strip into the single row
  function place() {
    var wide = window.innerWidth >= 900, row = UI$('#topbar .tb-row'), res = UI$('#tb-res');
    if (wide && res.parentNode !== row) row.insertBefore(res, UI$('#tb-menu'));
    else if (!wide && res.parentNode === row) UI$('#topbar .tb-wrap').appendChild(res);
  }
  place(); window.addEventListener('resize', place);
};
function UImeter(frac, cls) { frac = UIclamp(frac || 0, 0, 1); return '<span class="m"><i><b style="width:' + (frac * 100).toFixed(0) + '%' + (cls ? ';background:' + cls : '') + '"></b></i></span>'; }
UI.topbar = function () {
  if (!UIA.g) return;
  var d = UIA.day(), act = UIA.actNo(), A = UIA.ACTS[act] || ['Act ' + act, ''];
  UI$('#tb-day').innerHTML = '<b><small>DAY</small>' + (d + 1) + '</b><span class="sub"><i>' + UIesc(A[0] + ' · ' + A[1]) + '</i><span>' + UIesc(UIA.dateLabel(d)) + '</span></span>';
  var r = UIA.res(), H = r.hours;
  var hl = H.tracers.left + H.field.left + H.analysts.left, hm = H.tracers.max + H.field.max + H.analysts.max;
  var beds = r.beds.max ? r.beds.used / r.beds.max : 0;
  var tr = r.trust.overall;
  var staff = '<span class="rs' + (hl === 0 ? ' warn' : '') + '"><span class="l">Staff hrs</span><span class="v">' + hl + '<small>/' + hm + '</small></span><span class="m">' +
    ['tracers', 'field', 'analysts'].map(function (k) { var f = H[k].max ? H[k].left / H[k].max : 0; return '<i><b style="width:' + (f * 100).toFixed(0) + '%"></b></i>'; }).join('') + '</span></span>';
  UI$('#tb-res').innerHTML = staff +
    '<span class="rs' + (r.tests.left === 0 ? ' warn' : '') + '"><span class="l">Tests</span><span class="v">' + r.tests.left + '<small>/' + r.tests.max + '</small></span>' + UImeter(r.tests.max ? r.tests.left / r.tests.max : 0, 'var(--teal)') + '</span>' +
    '<span class="rs' + (beds > 0.95 ? ' bad' : beds > 0.8 ? ' warn' : '') + '"><span class="l">Beds</span><span class="v">' + Math.round(beds * 100) + '<small>%</small></span>' + UImeter(beds, beds > 0.8 ? 'var(--red)' : 'var(--amber)') + '</span>' +
    '<span class="rs' + (tr < 0.35 ? ' bad' : tr < 0.5 ? ' warn' : '') + '"><span class="l">Trust</span><span class="v">' + Math.round(tr * 100) + '</span>' + UImeter(tr, 'var(--ice)') + '</span>' +
    '<span class="rs' + (r.funding < 0 ? ' bad' : '') + '"><span class="l">Budget</span><span class="v">' + UIfmt.money(r.funding) + '</span>' + UImeter(1, 'rgba(242,182,64,.5)') + '</span>';
  UI$('#tb-end').disabled = UIA.over();
};
UI.badges = function () {
  var unread = UIA.inbox().filter(function (m) { return !UIS.read[m.id]; }).length;
  UI$$('.tab[data-tab=brief]').forEach(function (b) {
    var x = b.querySelector('.badge');
    if (!unread) { if (x) x.remove(); return; }
    if (!x) { x = document.createElement('span'); x.className = 'badge'; b.appendChild(x); }
    x.textContent = unread > 99 ? '99+' : unread;
  });
};
UI.go = function (tab, opts) {
  if (!UI.views[tab]) return;
  var prev = UIS.tab;
  UIS.tab = tab;
  UI$$('.tab').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
  UI$$('.view').forEach(function (v) { v.classList.toggle('on', v.id === 'v-' + tab); });
  var v = UI.views[tab];
  if (!v.built) { v.build(UI$('#v-' + tab)); v.built = true; }
  if (v.show) v.show(opts || {}, prev);
  UI.emit('tab', tab);
  UI.save();
};

// ------------------------------------------------------------ resources sheet
UI.resourceSheet = function () {
  var r = UIA.res(), H = r.hours;
  function row(l, a, b, col, note) { var f = b ? a / b : 0; return '<div class="rrow"><div class="rl"><b>' + l + '</b><span>' + note + '</span></div><div class="rv"><b>' + a + '</b><small>/ ' + b + '</small></div><div class="bar" style="grid-column:1/-1"><i style="width:' + (f * 100).toFixed(0) + '%;background:' + col + '"></i></div></div>'; }
  var trust = UIA.city().districts.map(function (d) { var t = r.trust.byDistrict[d.id]; return t === undefined ? null : { d: d, t: t }; }).filter(Boolean).sort(function (a, b) { return a.t - b.t; });
  UIsheet.open({ eyebrow: UIesc(UIA.dateLabel(UIA.day())), title: 'Resources today', tag: 'resources', html:
    '<div class="eyebrow sh-sec">Staff hours left today</div><div class="rgrid">' +
    row('Contact tracers', H.tracers.left, H.tracers.max, 'var(--ice)', 'Interviews, tracing, household studies') +
    row('Field team', H.field.left, H.field.max, 'var(--ice)', 'Site visits, sampling, questionnaires') +
    row('Analysts', H.analysts.left, H.analysts.max, 'var(--ice)', 'Record reviews, trials, briefings') + '</div>' +
    '<div class="eyebrow sh-sec">Laboratory</div><div class="rgrid">' + row('Tests', r.tests.left, r.tests.max, 'var(--teal)', 'PCR capacity left today') + row('Sequencing', r.seq.left, r.seq.max, 'var(--violet)', 'Genome slots today') + '</div>' +
    '<div class="eyebrow sh-sec">Hospitals</div><div class="rgrid">' + row('Beds occupied', r.beds.used, r.beds.max, 'var(--amber)', 'All acute sites') + row('Intensive care', r.icu.used, r.icu.max, 'var(--red)', 'Ventilated beds') + '</div>' +
    '<div class="eyebrow sh-sec">Budget</div><p style="margin:0;font:600 26px var(--f-mono)">' + UIfmt.money(r.funding) + '</p><p class="note">Hours refill each morning. Tests and sequencing grow as the council funds capacity.</p>' +
    (trust.length ? '<div class="eyebrow sh-sec">Trust by district — lowest first</div><div class="tgrid">' + trust.map(function (x) { return '<button class="trow" data-ref="district" data-id="' + UIesc(x.d.id) + '"><span>' + UIesc(x.d.name) + '</span><span class="bar"><i style="width:' + Math.round(x.t * 100) + '%;background:' + (x.t < .4 ? 'var(--red)' : x.t < .55 ? 'var(--amber)' : 'var(--ice)') + '"></i></span><b>' + Math.round(x.t * 100) + '</b></button>'; }).join('') + '</div>' : '')
  });
};

// ------------------------------------------------------------ menu
UI.menu = function () {
  var m = UIAudio.muted;
  UIsheet.open({ eyebrow: UIesc(UIA.city().name) + ' · seed ' + UIesc(UIA.seed || ''), title: 'Incident room', tag: 'menu', html:
    '<div class="list">' + UIli({ attrs: 'data-m="sound"', ic: m ? UIICON.mute : UIICON.sound, label: m ? 'Sound is off' : 'Sound is on', small: 'Room tone and quiet cues', right: '<span class="tog' + (m ? '' : ' on') + '"><i></i></span>' }) +
    UIli({ attrs: 'data-m="help"', ic: UIICON.report, label: 'How to play', small: 'The short version' }) +
    UIli({ attrs: 'data-m="coach"', ic: UIICON.mentor, label: UICoach.active() ? 'Stop the guided tour' : 'Show coach marks', small: 'Step-by-step hints on screen' }) +
    UIli({ attrs: 'data-m="title"', ic: UIICON.back, label: 'Save and leave', small: 'Back to the title screen. The game is saved.' }) + '</div>' +
    '<div class="eyebrow sh-sec">Give up</div><div class="list">' + UIli({ attrs: 'data-m="end"', ic: UIICON.warn, label: 'Stand down and see the debrief', small: 'Ends this outbreak now' }) + '</div>',
    mount: function (b) {
      b.addEventListener('click', function (e) {
        var x = e.target.closest('[data-m]'); if (!x) return;
        var k = x.dataset.m;
        if (k === 'sound') { UIAudio.setMuted(!UIAudio.muted); UI.menu(); }
        else if (k === 'help') UI.help();
        else if (k === 'coach') { UIsheet.close(); if (UICoach.active()) UICoach.stop(); else UICoach.start('tips'); }
        else if (k === 'title') { UI.save(); UIsheet.close(); UIBoot.title(); }
        else if (k === 'end') {
          if (!x.dataset.armed) { x.dataset.armed = 1; x.querySelector('.tx b').textContent = 'Tap again to stand down'; x.classList.add('armed'); return; }
          UIsheet.close(); UIA.g.over = true; if (!UIA.g.outcome) UIA.g.outcome = 'resigned'; UIA.bump(); UI.save(); UIDebrief.show();
        }
      });
    } });
};
UI.help = function () {
  UIsheet.open({ eyebrow: 'Index Case', title: 'How to play', push: true, tag: 'help', html: '<div class="prose">' +
    '<p>A disease nobody has seen before is loose in ' + UIesc(UIA.city().name) + '. You run the public health response. Each turn is a day: spend your team\'s hours and the lab\'s tests, then <b>End day</b> and see what comes in overnight.</p>' +
    '<h5>Act one — Detect</h5><p>Interview the first cases, look for what links them, and test them. When samples come back negative for everything known, send them for the novel-agent screen.</p>' +
    '<h5>Act two — Characterise</h5><p>Work out how it spreads, how long it hides, who it harms. Publish your estimates on the whiteboard (Briefing tab). The public, the council and the vaccine clock react to what you publish.</p>' +
    '<h5>Act three — Contain</h5><p>Orders cost money and trust and take days to show in the curve. Keep the hospital standing until treatment or a vaccine arrives.</p>' +
    '<h5>Reading the room</h5><p>Names, places and districts in any report are tappable. The map glows where cases are recent. Wastewater rises before cases do. The genome tree shows who is linked to whom.</p>' +
    '<p class="note">Dr Okonjo (Briefing → Mentor) will nudge you for free once a day; more direct help costs hours or credibility.</p></div>' });
};

// ------------------------------------------------------------ day cycle
UI.confirmEndDay = function () {
  if (UIA.over()) return;
  var ex = UI$('.pop'); if (ex) { ex.remove(); return; }
  var r = UIA.res(), H = r.hours, hl = H.tracers.left + H.field.left + H.analysts.left, d = UIA.day();
  var pend = UIA.cases().filter(function (c) { return UIA.testState(c) === 'pending'; }).length;
  var unread = UIA.inbox().filter(function (m) { return !UIS.read[m.id]; }).length;
  var pop = UIel('<div class="pop" role="dialog" aria-label="End the day"><div class="eyebrow em">' + UIesc(UIA.dateLabel(d)) + '</div><h4>End day ' + (d + 1) + '?</h4><ul>' +
    '<li><b>' + hl + 'h</b>' + (hl ? 'staff hours unused — they do not carry over' : 'the team is spent') + '</li>' +
    '<li><b>' + r.tests.left + '</b>' + (r.tests.left ? 'tests unused today' : 'no tests left today') + '</li>' +
    (pend ? '<li><b>' + pend + '</b>result' + (pend > 1 ? 's' : '') + ' pending at the lab</li>' : '') +
    (unread ? '<li><b>' + unread + '</b>unread in the briefing</li>' : '') +
    '</ul><div class="row"><button class="btn sm ghost" data-x="no">Keep working</button><button class="btn sm pri" data-x="yes" id="pop-end">' + UIICON.moon + 'End day</button></div></div>');
  document.body.appendChild(pop);
  UI.emit('endpop');
  pop.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    pop.remove();
    if (b.dataset.x === 'yes') UI.endDay();
    UI.emit('endpopclose');
  });
  setTimeout(function () {
    document.addEventListener('pointerdown', function off(e) { if (!pop.contains(e.target) && !e.target.closest('#tb-end') && !e.target.closest('#coach')) { pop.remove(); UI.emit('endpopclose'); } document.removeEventListener('pointerdown', off, true); }, true);
  }, 0);
};
UI.endDay = function () {
  if (UI.busy) return; UI.busy = true;
  var n = UI$('#night'), d0 = UIA.day();
  UIsheet.close();
  var ticks = ''; for (var i = 0; i < 60; i++) { var a = i / 60 * Math.PI * 2, r1 = i % 5 ? 58 : 54; ticks += '<line x1="' + (66 + Math.sin(a) * r1).toFixed(1) + '" y1="' + (66 - Math.cos(a) * r1).toFixed(1) + '" x2="' + (66 + Math.sin(a) * 61).toFixed(1) + '" y2="' + (66 - Math.cos(a) * 61).toFixed(1) + '"/>'; }
  n.innerHTML = '<svg class="n-ring" viewBox="0 0 132 132"><g stroke="#2b3d4f" stroke-width="1.2">' + ticks + '</g><circle cx="66" cy="66" r="46" fill="none" stroke="#16222e" stroke-width="3"/><circle id="n-arc" cx="66" cy="66" r="46" fill="none" stroke="#ff7a45" stroke-width="3" stroke-linecap="round" stroke-dasharray="289" stroke-dashoffset="289" transform="rotate(-90 66 66)" style="transition:stroke-dashoffset 1.3s cubic-bezier(.4,0,.2,1);filter:drop-shadow(0 0 6px rgba(255,122,69,.8))"/></svg>' +
    '<div class="n-k" id="n-k">Overnight</div><div class="n-day" id="n-day">Day ' + (d0 + 1) + '</div><div class="n-date" id="n-date">' + UIesc(UIA.dateLabel(d0)) + '</div><div class="n-sum" id="n-sum"></div>';
  n.classList.add('on');
  UIAudio.cue('night');
  setTimeout(function () { var a = UI$('#n-arc'); if (a) a.style.strokeDashoffset = '0'; }, 50);
  var before = { cases: UIA.cases().length, adm: UIsum(UIA.curve().admissions), deaths: UIsum(UIA.curve().deaths) };
  setTimeout(function () {
    var res;
    try { res = UIA.endDay(); } catch (e) { UI.busy = false; n.classList.remove('on'); UItoast('The night went wrong: ' + e.message, { err: true, ms: 5000 }); console.error(e); return; }
    UIS.dayOpen = {};
    UI.save();
    var d1 = UIA.day(), cv = UIA.curve();
    var after = { cases: UIA.cases().length, adm: UIsum(cv.admissions), deaths: UIsum(cv.deaths) };
    UI$('#n-k').textContent = 'Morning · 07:00';
    UI$('#n-day').textContent = 'Day ' + (d1 + 1);
    UI$('#n-date').textContent = UIA.dateLabel(d1);
    var nm = res.newMsgs.length;
    var tiles = [[after.cases - before.cases, 'new cases', 'var(--ember)'], [after.adm - before.adm, 'admitted', 'var(--amber)'], [after.deaths - before.deaths, after.deaths - before.deaths === 1 ? 'death' : 'deaths', 'var(--bone)'], [nm, 'messages', 'var(--ice)']];
    UI$('#n-sum').innerHTML = tiles.map(function (t) { return '<div><b style="color:' + t[2] + '">' + Math.max(0, t[0]) + '</b><span>' + t[1] + '</span></div>'; }).join('');
    UI$$('#n-sum div').forEach(function (el, i) { setTimeout(function () { el.classList.add('on'); }, 120 + i * 140); });
    UIAudio.cue('morning');
    if (after.deaths > before.deaths) setTimeout(function () { UIAudio.cue('toll'); }, 700);
    UI.refresh();
    var actEv = res.events.filter(function (e) { return e.kind === 'act'; }).pop();
    var hasMayor = res.newMsgs.some(function (m) { return /mayor|call/.test(m.kind); });
    setTimeout(function () {
      n.classList.remove('on'); UI.busy = false;
      if (UIA.over()) { UIDebrief.show(); return; }
      if (actEv) UI.actCard(actEv.act || UIA.actNo());
      else if (hasMayor) UIAudio.cue('phone');
      else if (nm) UIAudio.cue('msg');
      UI.emit('morning', res);
    }, 2300);
  }, 700);
};
UI.actCard = function (act, then) {
  var A = UIA.ACTS[act] || ['Act ' + act, ''];
  var SUB = { 1: 'Something is making people ill and nobody knows what. Find out whether it is new.', 2: 'It is new. Now learn what it is — how it spreads, how long it hides, who it harms — and say so publicly.', 3: 'It is in the community. Hold the line: slow it, protect the hospital, keep the city with you until help arrives.' };
  var c = UI$('#actcard');
  c.innerHTML = '<div class="a-k">' + UIesc(A[0]) + '</div><div class="a-t">' + UIesc(A[1]) + '</div><div class="a-line"></div><p class="a-s">' + UIesc(SUB[act] || '') + '</p><div class="a-go"><button class="btn pri" id="act-go">Continue</button></div>';
  c.classList.add('on');
  UIAudio.cue('act');
  UI$('#act-go').addEventListener('click', function () { c.classList.remove('on'); UI.emit('actcard', act); if (then) then(); });
};

// ------------------------------------------------------------ keyboard & scrim
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    if (UIsheet.isOpen()) { UIsheet.close(); return; }
    var p = UI$('.pop'); if (p) { p.remove(); return; }
  }
});
document.addEventListener('click', function (e) { if (e.target.id === 'scrim') UIsheet.close(); });
window.addEventListener('beforeunload', function () { if (UIS && UIA.g) UI.save(); });
document.addEventListener('visibilitychange', function () { if (document.hidden && UIS && UIA.g) UI.save(); });

/* run an action with in-UI feedback; returns result */
UI.run = function (id, target, params, o) {
  o = o || {};
  var r = UIA.doAct(id, target, params);
  if (!r.ok) { UIAudio.cue('err'); UItoast(r.err || 'That could not be done', { err: true }); return r; }
  UIAudio.cue('ok');
  UIS.log.push({ day: UIA.day(), id: id, target: target === undefined ? null : target });
  if (UIS.log.length > 400) UIS.log.shift();
  UItoast(o.msg || r.msgs[0] || 'Done');
  UI.save();
  UI.refresh();
  UIsheet.reload();
  UI.emit('act', { id: id, target: target, r: r });
  return r;
};
