/* DEPTH UI — 13-app.js: UI state, the frame (top bar with the LED clock,
 * tabs), bottom sheet / dialog, toast, tappable references, the shift cycle,
 * first-time explanations and autosave. */
var UIS = null; // UI state, saved alongside the engine save
var UI = {
  views: {},
  listeners: [],
  freshState: function () {
    return { v: 1, tab: 'receiver', rx: { freq: 6.0, mode: 'voice', fine: 0, span: 'band', read: 'line' }, explained: {}, seenInbox: {}, seenMsgs: {}, seenLog: {},
      bench: { a: null, b: null, sel: null, kid: null, tech: 'msgs', side: 'A', crib: '', offset: 0, frags: {}, per: {}, drafts: {} },
      traffic: { pos: {}, mode: 'link', sub: 'diagram' }, map: { view: null, trace: true, sel: null }, desk: { sub: 'inbox', open: null },
      op: { what: '', where: '', when: '', who: '' }, coach: null, mentorFree: -1, pinned: [] };
  },
  save: function () { if (UIA.g && UIS && !UI.noSave) UIA.writeSave(UIS); },
  refresh: function () {
    if (!UIA.g) return;
    UI.topbar(); UI.badges();
    var v = UI.views[UIS.tab];
    if (v && v.built && v.refresh) v.refresh();
    UI.emit('refresh');
  },
  on: function (f) { UI.listeners.push(f); },
  emit: function (ev, data) { UI.listeners.slice().forEach(function (f) { try { f(ev, data); } catch (e) { console.error(e); } }); }
};

// ------------------------------------------------------------ toast
function UItoast(msg, o) {
  o = o || {};
  var t = UI$('#toast');
  t.innerHTML = (o.icon ? UIICON[o.icon] : '') + '<span>' + UIesc(msg) + '</span>';
  t.className = 'on' + (o.err ? ' err' : '') + (o.good ? ' good' : '');
  clearTimeout(UItoast._t);
  UItoast._t = setTimeout(function () { t.className = ''; }, o.ms || 2800);
}

// ------------------------------------------------------------ phone back button closes layers
var UIhist = {
  stack: [], ignore: 0, armed: false, t: null,
  push: function (name, close) { UIhist.stack.push({ name: name, close: close }); UIhist.sync(); },
  drop: function (name) { UIhist.stack = UIhist.stack.filter(function (l) { return l.name !== name; }); UIhist.sync(); },
  sync: function () {
    clearTimeout(UIhist.t);
    UIhist.t = setTimeout(function () {
      try {
        if (UIhist.stack.length && !UIhist.armed) { history.pushState({ dx: 1 }, ''); UIhist.armed = true; }
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

// ------------------------------------------------------------ sheet: paper on a clipboard (bottom sheet on phone, dialog on desktop)
var UIsheet = {
  cur: null, stack: [],
  /** o: {title, eyebrow, sub, html, mount(body, sheet), wide, onClose, push, tag, paper:'memo'|'card'|'plain'} */
  open: function (o) {
    var sh = UI$('#sheet'), sc = UI$('#scrim');
    var wasOpen = !!UIsheet.cur;
    if (wasOpen && o.push) UIsheet.stack.push(UIsheet.cur);
    else if (!wasOpen) UIsheet.stack = [];
    UIsheet.cur = o;
    UIsheet.render(o);
    sc.hidden = false;
    if (!wasOpen) { UIhist.push('sheet', function () { UIsheet.close(true); }); UIAudio.cue('paper'); }
    sh.classList.toggle('wide', !!o.wide);
    requestAnimationFrame(function () { if (UIsheet.cur !== o) return; sc.classList.add('on'); sh.classList.add('on'); });
    UI.emit('sheet', o.tag || o.title);
  },
  render: function (o) {
    var sh = UI$('#sheet');
    sh.innerHTML = '<div class="sh-clip" aria-hidden="true"><i></i></div><div class="sh-paper"><div class="sh-head">' + (UIsheet.stack.length ? '<button class="ib" data-sh="back" aria-label="Back">' + UIICON.back + '</button>' : '') +
      '<div class="t">' + (o.eyebrow ? '<div class="eyebrow">' + o.eyebrow + '</div>' : '') + '<h3>' + UIesc(o.title || '') + '</h3>' + (o.sub ? '<div class="sub">' + o.sub + '</div>' : '') + '</div>' +
      '<button class="ib" data-sh="close" aria-label="Close">' + UIICON.close + '</button></div><div class="sh-body">' + (o.html || '') + '</div></div>';
    sh.querySelector('[data-sh=close]').addEventListener('click', function () { UIsheet.close(); });
    var bk = sh.querySelector('[data-sh=back]'); if (bk) bk.addEventListener('click', UIsheet.back);
    UIsheet.bindDrag(sh);
    if (o.mount) o.mount(sh.querySelector('.sh-body'), sh);
  },
  back: function () { var p = UIsheet.stack.pop(); if (!p) { UIsheet.close(); return; } UIsheet.cur = p; if (p.reopen) p.reopen(); else UIsheet.render(p); },
  reload: function () { var o = UIsheet.cur; if (!o) return; if (o.reopen) o.reopen(true); else UIsheet.render(o); },
  close: function (fromPop) {
    var sh = UI$('#sheet'), sc = UI$('#scrim');
    if (!UIsheet.cur) return;
    if (fromPop !== true) UIhist.drop('sheet');
    sh.classList.remove('on'); sc.classList.remove('on'); sh.style.transform = '';
    var cur = UIsheet.cur; UIsheet.cur = null; UIsheet.stack = [];
    setTimeout(function () { if (!UIsheet.cur) { sc.hidden = true; sh.innerHTML = ''; } }, 300);
    if (cur && cur.onClose) cur.onClose();
    UI.emit('sheetclose', cur && (cur.tag || cur.title));
  },
  isOpen: function () { return !!UIsheet.cur; },
  bindDrag: function (sh) {
    if (UIwide()) return;
    var y0 = null, dy = 0;
    function down(e) { y0 = e.clientY; dy = 0; sh.classList.add('drag'); try { e.target.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } }
    function move(e) { if (y0 === null) return; dy = Math.max(0, e.clientY - y0); sh.style.transform = 'translateY(' + dy + 'px)'; }
    function up() { if (y0 === null) return; y0 = null; sh.classList.remove('drag'); if (dy > 90) UIsheet.close(); else sh.style.transform = ''; }
    [sh.querySelector('.sh-clip'), sh.querySelector('.sh-head')].forEach(function (el) {
      el.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; down(e); });
      el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    });
  }
};
UI$('#scrim') && UI$('#scrim').addEventListener('click', function () { UIsheet.close(); });

// ------------------------------------------------------------ references in text
function UIparts(x) {
  return (x || []).map(function (p) {
    if (typeof p === 'string') return UIesc(p).replace(/\n/g, '<br>');
    return '<span class="lnk r-' + UIesc(p.ref) + '" role="link" tabindex="0" data-ref="' + UIesc(p.ref) + '" data-id="' + UIesc(p.id) + '">' + UIesc(p.text) + '</span>';
  }).join('');
}
UI.openRef = function (t, id) {
  UIAudio.cue('tap');
  var push = UIsheet.isOpen();
  if (t === 'place' || t === 'address') UIMap.placeSheet(id, { push: push });
  else if (t === 'building') UIMap.buildingSheet(id, { push: push });
  else if (t === 'district') { UIsheet.close(); UI.go('map'); UIMap.focusDistrict(id); }
  else if (t === 'person') { if (UIA.building(id)) UIMap.buildingSheet(id, { push: push }); else UIDesk.personSheet(id, { push: push }); }
  else if (t === 'callsign' || t === 'cs') UITraffic.nodeSheet(id, { push: push });
  else if (t === 'msg' || t === 'message') { UIsheet.close(); UIBench.openMsg(id); }
  else if (t === 'log' || t === 'intercept') UIRx.logSheet(id, { push: push });
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
UI.TABS = [['receiver', 'Receiver', 'receiver'], ['map', 'Map', 'map'], ['bench', 'Bench', 'bench'], ['traffic', 'Traffic', 'traffic'], ['desk', 'Desk', 'desk']];
UI.buildFrame = function () {
  var tabs = UI.TABS.map(function (t) { return '<button class="tab" data-tab="' + t[0] + '" aria-label="' + t[1] + '"><span class="tab-lamp"></span>' + UIICON[t[2]] + '<span class="tab-l">' + t[1] + '</span><i class="badge" hidden></i></button>'; }).join('');
  UI$('#tabbar').innerHTML = '<div class="tabs">' + tabs + '</div>';
  UI$('#topbar').innerHTML = '<div class="tb-plate"><div class="tb-clock" id="tb-clock" role="button" tabindex="0" aria-label="Clock and schedule"></div><div class="tb-night" id="tb-night"></div>' +
    '<div class="tb-tabs tabs">' + tabs + '</div>' +
    '<div class="tb-right"><div class="tb-war" id="tb-war" role="button" tabindex="0" aria-label="Warrants"></div><div class="tb-alert" id="tb-alert" role="button" tabindex="0" aria-label="Ring alert"></div>' +
    '<button class="ib tb-snd" id="tb-snd" aria-label="Sound">' + (UIAudio.muted ? UIICON.mute : UIICON.sound) + '</button><button class="ib" id="tb-menu" aria-label="Menu">' + UIICON.menu + '</button></div></div>';
  UI$$('.tab').forEach(function (b) { b.addEventListener('click', function () { UIAudio.cue('switch'); UI.go(b.dataset.tab); }); });
  UI$('#tb-menu').addEventListener('click', UI.menu);
  UI$('#tb-snd').addEventListener('click', function () { UIAudio.setMuted(!UIAudio.muted); UI$('#tb-snd').innerHTML = UIAudio.muted ? UIICON.mute : UIICON.sound; UItoast(UIAudio.muted ? 'Sound off' : 'Sound on — headphones recommended'); });
  UI$('#tb-war').addEventListener('click', function () { UI.go('desk'); UIDesk.sub('warrants'); });
  UI$('#tb-alert').addEventListener('click', UI.alertSheet);
  UI$('#tb-clock').addEventListener('click', function () { UI.go('receiver'); });
};
UI.ALERTS = [['Calm', 'The ring behaves as if nobody is listening.'], ['Wary', 'Something has made them careful. Expect small changes.'], ['Nervous', 'They suspect they are watched: schedules and frequencies may change, pad pages stop being reused.'], ['Alarmed', 'The security officer is moving sets, switching to bursts and sending decoys.'], ['Running scared', 'They may go silent or change everything. Act on what you have.']];
UI.topbar = function () {
  if (!UIA.g) return;
  var c = UIA.clock();
  UI$('#tb-clock').innerHTML = '<span class="led">' + UISeg.html(c.label) + '</span>';
  UI$('#tb-night').innerHTML = '<b>Night ' + (c.shift + 1) + '<small>/' + c.shifts + '</small></b><span>' + UIesc(c.night || c.day) + '</span>';
  var w = UIA.warrants(), h = '';
  for (var i = 0; i < w.max; i++) h += '<i class="' + (i < w.left ? 'on' : '') + '"></i>';
  UI$('#tb-war').innerHTML = '<span class="k">Warrants</span><span class="toks">' + h + '</span>';
  var a = UIA.alert().level;
  UI$('#tb-alert').innerHTML = '<span class="k">Ring</span><span class="lamp a' + a + '"></span><span class="v">' + UI.ALERTS[a][0] + '</span>';
};
UI.badges = function () {
  if (!UIA.g) return;
  var unread = UIA.inbox().filter(function (m) { return !m.read && !UIS.seenInbox[m.id]; }).length;
  var newMsgs = UIA.messages().filter(function (m) { return !UIS.seenMsgs[m.id]; }).length;
  function set(tab, n) { UI$$('.tab[data-tab=' + tab + '] .badge').forEach(function (b) { b.hidden = !n; b.textContent = n > 9 ? '9+' : n; }); }
  set('desk', unread); set('bench', newMsgs);
};
UI.go = function (tab) {
  if (!UI.views[tab]) return;
  var prev = UIS.tab;
  UIS.tab = tab;
  UI$$('.tab').forEach(function (b) { var on = b.dataset.tab === tab; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false'); });
  UI$$('.view').forEach(function (v) { v.classList.toggle('on', v.id === 'v-' + tab); });
  var v = UI.views[tab];
  if (!v.built) { v.build(UI$('#v-' + tab)); v.built = true; }
  else if (v.refresh) v.refresh();
  if (prev !== tab && UI.views[prev] && UI.views[prev].hide) UI.views[prev].hide();
  if (v.show) v.show();
  UI.emit('tab', tab);
  UI.save();
};
UI.menu = function () {
  var c = UIA.clock();
  UIsheet.open({ title: 'Station Kestrel', eyebrow: 'Night ' + (c.shift + 1) + ' of ' + c.shifts + ' · ' + UIesc(c.label), tag: 'menu', html:
    '<div class="menu">' +
    '<button class="li" data-m="end">' + UIICON.moon + '<span><b>End the shift</b><small>Special Branch act on warrants overnight; the next night begins.</small></span></button>' +
    '<button class="li" data-m="mentor">' + UIICON.mentor + '<span><b>Ask ' + UIesc(UIA.mentorInfo().short) + '</b><small>Hints in three tiers.</small></span></button>' +
    '<button class="li" data-m="speech">' + UIICON.ear + '<span><b>Numbers voice: ' + (UIPREF.get('speech', true) ? 'spoken' : 'tone pips') + '</b><small>' + (UIAudio.canSpeak() || !UIPREF.get('speech', true) ? 'Switch between the synthetic voice and tone pips.' : 'No speech voice on this device; tone pips and on-screen digits are used.') + '</small></span></button>' +
    '<button class="li" data-m="help">' + UIICON.help + '<span><b>How to play</b><small>The loop, the instruments, the warrants.</small></span></button>' +
    '<button class="li" data-m="title">' + UIICON.back + '<span><b>Title screen</b><small>The case is saved; Continue from the title.</small></span></button>' +
    '</div>',
    mount: function (b) {
      b.addEventListener('click', function (e) {
        var x = e.target.closest('[data-m]'); if (!x) return;
        var m = x.dataset.m;
        if (m === 'end') { UIsheet.close(); UI.confirmEnd(); }
        else if (m === 'mentor') { UIsheet.close(); UI.go('desk'); UIDesk.sub('mentor'); }
        else if (m === 'speech') { UIPREF.set('speech', !UIPREF.get('speech', true)); UIsheet.close(); UI.menu(); }
        else if (m === 'help') { UIsheet.close(); UI.help(); }
        else if (m === 'title') { UIsheet.close(); UI.save(); UIRx.stopAll(); UIBoot.title(); }
      });
    } });
};
UI.alertSheet = function () {
  var a = UIA.alert().level;
  UIsheet.open({ title: 'The ring’s alert', eyebrow: 'How nervous they are', tag: 'alert', html:
    '<div class="alert-scale">' + UI.ALERTS.map(function (x, i) { return '<div class="as-row' + (i === a ? ' on' : '') + '"><span class="lamp a' + i + '"></span><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div>' +
    '<p class="note">Arrests, wrong raids, a van seen in the street and watchers who are spotted all raise it. It never falls far.</p>' +
    (function () { var p = UIA.patience(); if (!p) return ''; var f = UIclamp(p.value / p.max, 0, 1); return '<h4>The superintendent’s patience</h4><div class="pat"><i><b style="width:' + Math.round(f * 100) + '%;background:' + (f < 0.35 ? 'var(--red)' : f < 0.6 ? '#c9a53a' : '#2d8a4a') + '"></b></i><span>' + p.value + ' / ' + p.max + '</span></div><p class="note">Wrong raids and empty nights wear it down. At nothing, Copenhagen takes the case.</p>'; })() });
};
UI.help = function () {
  UIsheet.open({ title: 'How a night works', eyebrow: 'Station Kestrel · standing orders', tag: 'help', wide: true, html:
    '<div class="help">' +
    '<p><b>Listen.</b> On the <em>Receiver</em>, tap a trace on the green display to tune to it, set AM for voice or CW for Morse, and press <em>Copy</em>. Keep the drifting signal on the hairline with the FINE knob — the whistle drops away when you are dead on. Clean copy means fewer lost digits.</p>' +
    '<p><b>Fix.</b> While a set is on the air, ask the outstations for bearings (<em>DF</em>). The cones cross on the <em>Map</em> where the set probably is. A fix you trust can be searched on foot by the van.</p>' +
    '<p><b>Break.</b> Every copied message lands on the <em>Bench</em>. Two messages with the same first group used the same pad page: put them in depth and drag a likely word along the strip. Courier traffic with a repeating key falls to the period finder.</p>' +
    '<p><b>Chart.</b> On <em>Traffic</em>, draw who talks to whom. The station marks each link by how much evidence backs it.</p>' +
    '<p><b>Act.</b> From the <em>Desk</em> or the map: watch an address, lift a dead drop, raid a building, or stake out the target on the right night. Warrants are few; a wrong raid warns the ring.</p>' +
    '<p class="note">Time only passes when you act: copying costs the transmission’s length, bench work a few minutes, waiting what you choose. At 02:00 the shift ends.</p></div>' });
};

// ------------------------------------------------------------ actions and time
/** run a state-changing action: refresh, autosave, and offer the end of the shift at 02:00 */
UI.act = function (f) {
  var r = f();
  UI.refresh();
  UI.save();
  if (UIA.over()) { UIlater(600, function () { UIDebrief.show(); }); return r; }
  if (UIA.clock().minute >= 480) UIlater(400, function () { UI.shiftOver(); });
  return r;
};
UI.showEvents = function (evs) {
  var air = {}; UIA.band().now.forEach(function (s) { air[s.id] = 1; });
  evs = (evs || []).filter(function (e) { return e.text && !(e.kind === 'heard' && e.tx && air[e.tx]); });
  if (!evs.length) return;
  if (evs.length === 1) UItoast(evs[0].text, { ms: 4200 });
  else UItoast(evs.length + ' things happened while you waited — see the log.', { ms: 3600 });
};
UI.confirmEnd = function () {
  var c = UIA.clock(), left = 480 - c.minute, up = UIA.upcoming(480);
  UIsheet.open({ title: 'End the shift?', eyebrow: c.label + ' · ' + Math.floor(left / 60) + 'h ' + (left % 60) + 'm left', tag: 'endshift', html:
    '<p>' + (up.length ? 'Still to come tonight: ' + up.map(function (u) { return '<b>' + UIA.hhmm(u.at) + ' ' + UIesc(u.label) + '</b>'; }).join(', ') + '. ' : 'Nothing else is on your schedule tonight. ') + 'Anything that transmits before 02:00 will go unheard.</p>' +
    '<div class="row gap"><button class="btn" data-x="no">Keep listening</button><button class="btn pri" data-x="yes">' + UIICON.moon + 'End the shift</button></div>',
    mount: function (b) { b.addEventListener('click', function (e) { var x = e.target.closest('[data-x]'); if (!x) return; UIsheet.close(); if (x.dataset.x === 'yes') UI.endShift(); }); } });
};
UI.shiftOver = function () {
  if (UI._shiftPrompt || UIA.over()) return;
  UI._shiftPrompt = true;
  UIsheet.open({ title: '02:00 — the shift is over', eyebrow: 'Station Kestrel', tag: 'shiftover', html: '<p>The day watch takes the receivers. Special Branch act on your warrants overnight.</p><div class="row gap"><button class="btn pri" data-x="yes">' + UIICON.moon + 'Hand over</button></div>',
    onClose: function () { UI._shiftPrompt = false; },
    mount: function (b) { b.addEventListener('click', function (e) { if (!e.target.closest('[data-x]')) return; UIsheet.close(); UI.endShift(); }); } });
};
UI.endShift = function () {
  if (!UIA.g || UIA.over()) return;
  if (UI.busy) return;
  UI.busy = true;
  UIRx.stopAll();
  var before = UIA.clock();
  var r = UIA.endShift();
  UI.save();
  UIAudio.cue('shift');
  var ov = UI$('#night');
  var c = UIA.clock(), over = UIA.over();
  ov.innerHTML = '<div class="nc"><div class="nc-memo paper"><div class="nc-h"><span class="eyebrow">Station Kestrel · shift report</span><h2>' + UIesc(r.report.title) + '</h2><span class="nc-stamp">Night ' + (before.shift + 1) + '</span></div>' +
    '<ul>' + r.report.lines.map(function (l) { return '<li>' + UIesc(l) + '</li>'; }).join('') + r.events.slice(0, 5).map(function (e) { return '<li class="ev">' + UIesc(e.text) + '</li>'; }).join('') + '</ul>' +
    (over ? '<p class="nc-next">The case is closed.</p>' : '<p class="nc-next">Next: <b>Night ' + (c.shift + 1) + ' of ' + c.shifts + '</b> · ' + UIesc(c.night || c.day) + ' · 18:00</p>') +
    '<button class="btn pri" id="nc-go">' + (over ? 'Read the debrief' : 'Begin the night') + '</button></div></div>';
  ov.hidden = false;
  requestAnimationFrame(function () { ov.classList.add('on'); });
  UI$('#nc-go').addEventListener('click', function () {
    ov.classList.remove('on'); UIAudio.cue('paper');
    setTimeout(function () { ov.hidden = true; ov.innerHTML = ''; UI.busy = false; if (over) UIDebrief.show(); else { UI.refresh(); UI.emit('newshift'); UIRx.newShift && UIRx.newShift(); } }, 400);
  });
  UI.emit('endshift');
};

// ------------------------------------------------------------ first-time explanations (a note from the night supervisor)
var UIExplain = {
  T: {
    receiver: ['The receiver', 'The green display is a waterfall: the band scrolls down like a curtain, and each transmission is a bright trace. <b>Tap a trace</b> to tune to it. The needle on the dial glass above shows where you are. Voice numbers need <b>AM</b>; Morse needs <b>CW</b>.'],
    hold: ['Holding a signal', 'Old transmitters drift. While the preamble plays, keep the trace on the <b>hairline</b> with the <b>FINE</b> knob. You can hear it too: the whistle falls to nothing when you are exactly on. The steadier you hold it, the fewer digits are lost.'],
    df: ['Direction finding', 'Each outstation turns its aerial until the signal is loudest and phones in a bearing. One bearing is a line; two cross; three make a small triangle. The <b>shaded cone</b> is how sure they are. It only works while the set is on the air.'],
    depth: ['Depth', 'A one-time pad is unbreakable — if every page is used once. Two messages with the <b>same first group</b> used the same page. Subtract one from the other, digit by digit (the tool does it) and the key cancels out: what is left depends only on the two plaintexts. Guess a word in one and the other appears.'],
    crib: ['Dragging a crib', 'A crib is a word you think is in one message — an opening like <b>TO KX7</b>, a callsign, <b>STOP</b>. Drag it along the strip. At the right place the other message turns into letters that make sense. Pencil it in and guess the next word.'],
    periodic: ['A repeating key', 'Couriers use a short key, written on a scrap of paper and added over and over. Every <b>n</b>th digit shares a key digit. The period finder measures how uneven the digits are when you split the message into <b>n</b> columns — at the true period they suddenly look like language.'],
    columns: ['Finding the key digits', 'Each column is plain language shifted by one key digit. The grey silhouette is what plain language looks like on this checkerboard. Slide each column until the bars match the silhouette; that shift is the key digit.'],
    board: ['The checkerboard', 'The ring turns letters into digits with a straddling checkerboard. The eight commonest letters get one digit; the rest get two, starting with one of the two blank columns. That is why two digits turn up far more than the others.'],
    traffic: ['Traffic analysis', 'You can always see who transmits, when and to whom — even when you cannot read a word. Drag from one callsign to another to draw a link. Solid ink means the log backs it up; a dashed pencil line is still a hunch.'],
    warrants: ['Warrants', '<b>Watch</b> an address to learn who lives there. <b>Lift</b> a dead drop named in a decrypt. <b>Raid</b> a building to arrest — only with evidence. <b>Stake out</b> the target on the night of the operation. A wrong raid wastes the warrant and warns the ring.'],
    van: ['The van', 'The crew drive towards the signal. Tap a street to steer. The needle and the beeping rise as you close in. When the needle is pinned, stop outside the building and mark it — before the set goes off the air.'],
    map: ['The map', 'Your tracing sheet lies over the city plan. Bearings are drawn in red pencil from each outstation; where they cross, a dashed ellipse marks the fix. Tap a place for warrants.']
  },
  once: function (k, after) {
    if (!UIS || UIS.explained[k] || UICoach.active()) { if (after) after(); return false; }
    UIS.explained[k] = 1; UI.save();
    UIExplain.show(k, after);
    return true;
  },
  show: function (k, after) {
    var t = UIExplain.T[k]; if (!t) return;
    var box = UI$('#explain');
    box.innerHTML = '<div class="ex-card paper"><div class="ex-pin" aria-hidden="true"></div><div class="ex-from">From the night supervisor</div><h4>' + t[0] + '</h4><p>' + t[1] + '</p><div class="ex-sig">— ' + UIesc(UIA.mentorInfo().short) + '</div><button class="btn pri sm" id="ex-ok">Understood</button></div>';
    box.hidden = false; requestAnimationFrame(function () { box.classList.add('on'); });
    UIAudio.cue('paper');
    UI$('#ex-ok').addEventListener('click', function () { box.classList.remove('on'); setTimeout(function () { box.hidden = true; box.innerHTML = ''; if (after) after(); }, 250); });
  },
  btn: function (k) { return '<button class="qbtn" data-explain="' + k + '" aria-label="What is this?">?</button>'; }
};
document.addEventListener('click', function (e) { var b = e.target.closest('[data-explain]'); if (!b) return; e.preventDefault(); UIExplain.show(b.dataset.explain); });
