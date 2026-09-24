/* INDEX CASE UI — 20-brief.js: the briefing — inbox and reader (reports, lab,
 * council minutes, press cuttings, mayor calls, rumours), the estimates
 * whiteboard with publish, and the mentor's three tiers of help. */
var UIBrief = UI.views.brief = {
  build: function (root) {
    var self = this;
    root.innerHTML = '<div class="br"><div class="br-list scroll" id="br-list-sc"><div class="pad"><div class="vhead"><div style="flex:1"><div class="eyebrow">Incident room</div><h2>Briefing</h2></div></div>' +
      '<div class="seg" id="br-sub" style="margin-bottom:14px"><button data-s="inbox">Inbox</button><button data-s="est">Estimates</button><button data-s="mentor">Mentor</button></div><div id="br-body"></div></div></div>' +
      '<div class="br-read" id="br-read"><div class="vw-bar"><button class="ibtn" id="br-back" aria-label="Back to inbox">' + UIICON.back + '</button><div class="t" id="br-rt"></div></div><div class="scroll" id="br-rs" style="top:56px"><div id="br-doc"></div></div></div></div>';
    UI$('#br-sub').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; UIAudio.cue('tap'); UIS.brief.sub = b.dataset.s; self.render(); UI.emit('brief-sub', b.dataset.s); UI.save(); });
    UI$('#br-body').addEventListener('click', function (e) {
      var m = e.target.closest('[data-msg]'); if (m) { UIAudio.cue('tap'); self.openMsg(m.dataset.msg); return; }
      var f = e.target.closest('[data-kf]'); if (f) { UIS.brief.filter = f.dataset.kf; self.render(); return; }
      if (e.target.closest('#br-readall')) { UIA.inbox().forEach(function (x) { UIS.read[x.id] = 1; }); UI.badges(); self.render(); UI.save(); }
    });
    UI$('#br-back').addEventListener('click', function () { self.closeMsg(); });
  },
  show: function (o) { this.render(); if (o && o.open) this.openMsg(o.open); },
  refresh: function () { this.render(); },
  render: function () {
    var sub = UIS.brief.sub;
    UI$$('#br-sub button').forEach(function (b) { b.classList.toggle('on', b.dataset.s === sub); });
    var unread = UIA.inbox().filter(function (m) { return !UIS.read[m.id]; }).length;
    var ib = UI$('#br-sub [data-s=inbox]'); ib.innerHTML = 'Inbox' + (unread ? ' <b class="cnt">' + unread + '</b>' : '');
    if (sub === 'est') UIEst.render(UI$('#br-body'));
    else if (sub === 'mentor') UIMentor.render(UI$('#br-body'));
    else this.renderInbox();
    UI$('.br').classList.toggle('reading', !!UIS.brief.open && sub === 'inbox');
  },
  renderInbox: function () {
    var st = UIS.brief, all = UIA.inbox().slice().reverse(), kinds = {};
    all.forEach(function (m) { kinds[m.kind] = (kinds[m.kind] || 0) + 1; });
    var list = all.filter(function (m) { return st.filter === 'all' || m.kind === st.filter; });
    var html = '<div class="chips" style="margin-bottom:6px"><button class="chip' + (st.filter === 'all' ? ' on' : '') + '" data-kf="all">All</button>' + Object.keys(UIKINDS).filter(function (k) { return kinds[k]; }).map(function (k) { return '<button class="chip' + (st.filter === k ? ' on' : '') + '" data-kf="' + k + '"><span class="sw k-' + k + '"></span>' + UIKINDS[k].l + '</button>'; }).join('') + '</div>';
    if (!list.length) html += '<div class="empty"><b>Nothing here</b>Messages arrive overnight and when your team finishes a task.</div>';
    var lastDay = null, today = UIA.day();
    html += '<div class="ib">';
    list.forEach(function (m) {
      if (m.day !== lastDay) { lastDay = m.day; html += '<div class="ib-day">' + (m.day === today ? 'Today · ' : '') + UIesc(UIA.dateLabel(m.day)) + '</div>'; }
      var K = UIKINDS[m.kind] || UIKINDS.report, snip = UIA.bodyText(m).slice(0, 110);
      html += '<button class="ib-it' + (UIS.read[m.id] ? ' read' : '') + (UIS.brief.open === m.id ? ' sel' : '') + '" data-msg="' + UIesc(m.id) + '"><span class="ib-ic k-' + m.kind + '">' + UIICON[K.ic] + '</span><span class="ib-tx"><span class="ib-from">' + UIesc(m.from || K.l) + '</span><b>' + UIesc(m.title) + '</b><span class="ib-sn">' + UIesc(snip) + '</span></span>' + (UIS.read[m.id] ? '' : '<i class="ib-dot"></i>') + '</button>';
    });
    html += '</div>';
    if (list.some(function (m) { return !UIS.read[m.id]; })) html += '<button class="btn sm ghost block" id="br-readall" style="margin-top:10px">Mark all read</button>';
    UI$('#br-body').innerHTML = html;
  },
  openMsg: function (id) {
    var m = UIA.msg(id); if (!m) return;
    if (UIS.tab !== 'brief') UI.go('brief');
    if (UIS.brief.sub !== 'inbox') { UIS.brief.sub = 'inbox'; }
    UIS.brief.open = id; UIS.read[id] = 1;
    var K = UIKINDS[m.kind] || UIKINDS.report;
    UI$('#br-rt').innerHTML = '<div class="eyebrow">' + UIesc(K.l) + ' · ' + UIesc(UIA.dateShort(m.day)) + '</div><b>' + UIesc(m.title) + '</b>';
    UI$('#br-doc').innerHTML = this.doc(m);
    UI$('#br-rs').scrollTop = 0;
    this.render();
    UI.badges();
    if (window.innerWidth < 900) UIhist.push('reader', function () { UIS.brief.open = null; UIBrief.render(); });
    if (m.kind === 'mayor') UIAudio.cue('phone');
    UI.emit('msg', m);
    UI.save();
  },
  closeMsg: function () { UIS.brief.open = null; UIhist.drop('reader'); this.render(); UI.save(); },
  doc: function (m) {
    var b = UIbody(m.body), d = UIA.dateLabel(m.day), city = UIA.city().name;
    switch (m.kind) {
      case 'press':
        return '<article class="d-press"><div class="pr-mast"><span>' + UIesc(m.from || ('The ' + city + ' Courier')) + '</span><em>' + UIesc(d) + '</em></div><h1>' + UIesc(m.title) + '</h1><div class="pr-body">' + b + '</div></article>';
      case 'mayor':
        return '<article class="d-call"><div class="cl-card"><div class="cl-face">' + UIPortrait.svg({ pid: 'mayor-' + city, age: 58, sex: 'M' }) + '</div><div><div class="eyebrow em">Incoming call · ' + UIesc(d) + '</div><b>' + UIesc(m.from || 'The Mayor') + '</b><span class="cl-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div></div><div class="cl-body">' + b + '</div></article>';
      case 'rumour':
        return '<article class="d-rumour"><div class="ru-post"><div class="ru-h"><span class="ru-av"></span><div><b>' + UIesc(m.from || 'Shared post') + '</b><span>' + UIesc(d) + '</span></div></div><h4>' + UIesc(m.title) + '</h4>' + b + '</div><p class="note">Rumours spread through the same social network as the disease. Answering them costs little; ignoring them can cost compliance in whole districts.</p></article>';
      case 'council':
        return '<article class="d-minutes"><div class="mn-h"><span class="eyebrow">' + UIesc(m.from || (city + ' City Council')) + '</span><h1>' + UIesc(m.title) + '</h1><span class="mn-d">' + UIesc(d) + '</span></div>' + b + '</article>';
      case 'lab':
        var pos = /posit|confirm|novel|new agent/i.test(m.title), neg = /negat/i.test(m.title);
        return '<article class="d-lab"><div class="lb-h"><span class="eyebrow">' + UIesc(m.from || 'Public Health Laboratory') + '</span><span class="lb-d">' + UIesc(d) + '</span></div><h1>' + UIesc(m.title) + '</h1>' + (pos || neg ? '<div class="lb-stamp ' + (pos ? 'pos' : 'neg') + '">' + (pos ? 'Positive' : 'Negative') + '</div>' : '') + b + '</article>';
      case 'mentor':
        return '<article class="d-mentor"><div class="mt-h"><div class="cl-face">' + UIMentor.face() + '</div><div><b>' + UIesc(UIA.mentorInfo().name) + '</b><span>' + UIesc(d) + '</span></div></div>' + b + '</article>';
      default:
        return '<article class="d-memo"><div class="mm-h"><div><span class="eyebrow">From</span><b>' + UIesc(m.from || 'Surveillance') + '</b></div><div><span class="eyebrow">Date</span><b>' + UIesc(d) + '</b></div></div><h1>' + UIesc(m.title) + '</h1>' + b + '</article>';
    }
  }
};

var UIEst = {
  DEF: [
    { id: 'route', label: 'Route', type: 'choice', options: ['airborne', 'droplet', 'contact', 'gut', 'animal'], how: 'Which settings produce clusters: stuffy indoor gatherings (airborne), households only (droplet or contact), shared food (gut), cases with no human contact (animal).' },
    { id: 'incubation', label: 'Incubation', type: 'number', unit: 'days', min: 1, max: 16, step: 0.5, how: 'People with a single known exposure and a known onset date.' },
    { id: 'presym', label: 'Spread before symptoms', type: 'pct', min: 0, max: 0.7, step: 0.05, how: 'Contacts who fell ill before the person who infected them; serial intervals shorter than incubation.' },
    { id: 'asym', label: 'Never ill', type: 'pct', min: 0, max: 0.8, step: 0.05, how: 'Test whole households, symptoms or not, and count positives who stay well.' },
    { id: 'R', label: 'R', type: 'number', min: 0.5, max: 6, step: 0.1, how: 'How fast the curve doubles, and how many each case infects in traced chains.' },
    { id: 'ifr', label: 'Infection fatality', type: 'pct', min: 0.001, max: 0.15, step: 0.001, log: true, how: 'Deaths against infections — correct confirmed cases for those you never find.' },
    { id: 'ageRisk', label: 'Who it hits', type: 'choice', options: ['elderly', 'young adults', 'children', 'even'], how: 'Admissions by age compared with cases by age (Cases → Ages).' },
    { id: 'source', label: 'Source', type: 'choice', options: ['market', 'farm', 'lab', 'traveller', 'hospital'], how: 'The earliest cases, the root of the genome tree, anyone with animal contact or travel.' }
  ],
  traits: function () {
    var e = UIA.estimates(), def = this.DEF;
    var t = e.traits.length ? e.traits.map(function (x) { var d = def.filter(function (y) { return y.id === x.id; })[0] || {}; var o = {}; Object.keys(d).forEach(function (k) { o[k] = d[k]; }); Object.keys(x).forEach(function (k) { if (x[k] !== undefined) o[k] = x[k]; }); return o; }) : def;
    return t;
  },
  fmt: function (t, v) {
    if (v === undefined || v === null || v === '') return '—';
    if (t.type === 'pct') return UIfmt.pct(+v, +v < 0.01 ? 1 : +v < 0.1 ? 1 : 0);
    if (t.type === 'number') return (+v).toFixed(t.step < 1 ? (t.step < 0.1 ? 2 : 1) : 0).replace(/\.0$/, '') + (t.unit ? ' ' + t.unit : '');
    return UIcap(v);
  },
  pubVal: function (id) { var p = UIA.estimates().published[id]; if (p === undefined || p === null) return null; return typeof p === 'object' && 'value' in p ? p : { value: p, day: null }; },
  render: function (host) {
    var self = this, draft = UIS.est.draft, traits = this.traits();
    var changed = traits.filter(function (t) { var p = self.pubVal(t.id); return draft[t.id] !== undefined && (!p || String(p.value) !== String(draft[t.id])); });
    var html = '<div class="wb"><div class="wb-h"><div><div class="eyebrow">Your working estimates</div><h3>The whiteboard</h3></div><span class="wb-n">' + Object.keys(UIA.estimates().published).length + '/' + traits.length + ' published</span></div>' +
      '<p class="note" style="margin:0 0 12px">Set what you currently believe. Nothing is checked against the truth until the debrief — but the public, the council and the vaccine clock react to what you publish. Revising costs a little trust; being wrong for long costs more.</p>';
    traits.forEach(function (t) {
      var p = self.pubVal(t.id), v = draft[t.id] !== undefined ? draft[t.id] : p ? p.value : undefined, dirty = draft[t.id] !== undefined && (!p || String(p.value) !== String(draft[t.id]));
      html += '<div class="wb-r' + (dirty ? ' dirty' : '') + (p ? ' pub' : '') + '" data-t="' + UIesc(t.id) + '"><div class="wb-top"><b class="wb-l">' + UIesc(t.label) + '</b><span class="wb-v">' + UIesc(self.fmt(t, v)) + '</span></div>';
      if (t.type === 'choice' || t.options) html += '<div class="wb-opts">' + t.options.map(function (o) { return '<button data-v="' + UIesc(o) + '" class="' + (String(v) === String(o) ? 'on' : '') + '">' + UIesc(UIcap(o)) + '</button>'; }).join('') + '</div>';
      else {
        var mn = t.min, mx = t.max, pos;
        if (t.log) pos = v === undefined ? 0.5 : (Math.log(v) - Math.log(mn)) / (Math.log(mx) - Math.log(mn)); else pos = v === undefined ? 0.5 : (v - mn) / (mx - mn);
        html += '<input type="range" class="wb-rng" min="0" max="1000" value="' + Math.round(UIclamp(pos, 0, 1) * 1000) + '" aria-label="' + UIesc(t.label) + '"' + (v === undefined ? ' data-unset="1"' : '') + '><div class="wb-scale"><span>' + UIesc(self.fmt(t, mn)) + '</span><span>' + UIesc(self.fmt(t, mx)) + '</span></div>';
      }
      html += '<div class="wb-f">' + (p ? '<span class="wb-pub">' + UIICON.check + 'Published ' + UIesc(self.fmt(t, p.value)) + (p.day !== null && p.day !== undefined ? ' · ' + UIesc(UIA.dateShort(p.day)) : '') + '</span>' : '<span class="wb-unpub">Not published</span>') + (t.how ? '<button class="wb-how" data-how aria-label="How to estimate">How?</button>' : '') + '</div><p class="wb-howt" hidden>' + UIesc(t.how || '') + '</p></div>';
    });
    html += '<div class="wb-go"><button class="btn pri block" id="wb-pub"' + (changed.length ? '' : ' disabled') + '>' + UIICON.mic + (changed.length ? 'Publish ' + UIfmt.plural(changed.length, 'estimate') : 'Nothing new to publish') + '</button>' + (changed.length ? '<button class="btn sm ghost block" id="wb-reset" style="margin-top:6px">Discard changes</button>' : '') + '</div></div>';
    host.innerHTML = html;
    host.onclick = function (e) {
      var r = e.target.closest('.wb-r'); var id = r && r.dataset.t, t = id && traits.filter(function (x) { return x.id === id; })[0];
      var ob = e.target.closest('.wb-opts button'); if (ob && t) { draft[id] = ob.dataset.v; UIAudio.cue('tap'); self.render(host); UI.save(); return; }
      if (e.target.closest('[data-how]')) { var ht = r.querySelector('.wb-howt'); ht.hidden = !ht.hidden; return; }
      if (e.target.closest('#wb-reset')) { UIS.est.draft = {}; self.render(host); UI.save(); return; }
      if (e.target.closest('#wb-pub')) self.confirm(host, changed);
    };
    UI$$('.wb-rng', host).forEach(function (rg) {
      var r = rg.closest('.wb-r'), t = traits.filter(function (x) { return x.id === r.dataset.t; })[0];
      function val() { var f = rg.value / 1000, v = t.log ? Math.exp(Math.log(t.min) + f * (Math.log(t.max) - Math.log(t.min))) : t.min + f * (t.max - t.min); var st = t.step || 0.01; v = Math.round(v / st) * st; if (t.log) { var mag = Math.pow(10, Math.floor(Math.log10(v)) - 1); v = Math.round(v / mag) * mag; } return +v.toFixed(4); }
      rg.addEventListener('input', function () { r.querySelector('.wb-v').textContent = self.fmt(t, val()); r.classList.add('dirty'); });
      rg.addEventListener('change', function () { draft[t.id] = val(); self.render(host); UI.save(); });
    });
  },
  confirm: function (host, changed) {
    var self = this, draft = UIS.est.draft;
    var revs = changed.filter(function (t) { return self.pubVal(t.id); }).length;
    UIsheet.open({ eyebrow: 'Press briefing', title: 'Publish estimates', tag: 'publish', html: '<div class="list">' + changed.map(function (t) { var p = self.pubVal(t.id); return '<div class="li"><span class="tx"><b>' + UIesc(t.label) + '</b><small>' + (p ? 'Revising from ' + UIesc(self.fmt(t, p.value)) : 'First estimate') + '</small></span><span class="cost" style="font:600 16px var(--f-mono)">' + UIesc(self.fmt(t, draft[t.id])) + '</span></div>'; }).join('') + '</div>' +
      (revs ? '<p class="cf-why" style="color:var(--amber)">' + UIICON.warn + 'Revising ' + UIfmt.plural(revs, 'published estimate') + ' costs a little public trust.</p>' : '<p class="note" style="margin-top:10px">The Courier and the council will read these tomorrow morning.</p>') +
      '<button class="btn pri block" id="pb-go" style="margin-top:14px">' + UIICON.mic + 'Publish</button>',
      mount: function (b) {
        UI$('#pb-go', b).addEventListener('click', function () {
          var vals = {}; changed.forEach(function (t) { vals[t.id] = draft[t.id]; });
          var r = UIA.publish(vals);
          if (r && r.err) { UItoast(r.err, { err: true }); return; }
          UIS.est.draft = {}; UIsheet.close(); UIAudio.cue('publish'); UItoast('Estimates published');
          UI.save(); UI.refresh(); self.render(host); UI.emit('publish', vals);
        });
      } });
  }
};

var UIMentor = {
  face: function () { return UIPortrait.svg({ pid: 'okonjo-mentor', age: 68, sex: 'F' }); },
  TIERS: [
    { t: 0, l: 'A nudge', d: 'A question to point you somewhere useful.', cost: 'Free · once a day' },
    { t: 1, l: 'A pointer', d: 'Where to look and what to do next.', cost: 'Costs analyst hours' },
    { t: 2, l: 'The straight answer', d: 'She tells you what she thinks is going on.', cost: 'Costs your credibility' }
  ],
  render: function (host) {
    var self = this, info = UIA.mentorInfo(), log = UIS.mentor || [], day = UIA.day();
    var nudged = log.some(function (x) { return x.day === day && x.tier === 0; });
    var html = '<div class="card mentor"><div class="mt-card"><div class="cl-face big">' + this.face() + '</div><div><div class="eyebrow">Your mentor</div><h3>' + UIesc(info.name) + '</h3><p class="dim" style="margin:2px 0 0;font-size:13.5px">' + UIesc(info.role || '') + '</p></div></div>' +
      '<div class="mt-tiers">' + this.TIERS.map(function (T) { var dis = UIA.over() || (T.t === 0 && nudged); var c = info.costs && info.costs[T.t]; return '<button class="mt-t t' + T.t + '" data-tier="' + T.t + '"' + (dis ? ' disabled' : '') + '><span class="mt-n">' + (T.t + 1) + '</span><span class="tx"><b>' + T.l + '</b><small>' + UIesc(T.d) + '</small></span><span class="mt-c">' + UIesc(c || (T.t === 0 && nudged ? 'Used today' : T.cost)) + '</span></button>'; }).join('') + '</div></div>';
    if (log.length) html += '<div class="eyebrow" style="margin:18px 2px 10px">Conversation</div><div class="mt-log">' + log.slice().reverse().map(function (x, i) {
      return '<div class="mt-msg"><div class="mt-meta">' + UIesc(UIA.dateShort(x.day)) + ' · ' + UIesc(self.TIERS[x.tier] ? self.TIERS[x.tier].l : '') + '</div><p>' + UIesc(x.text) + '</p>' + (x.action && i === 0 ? '<button class="btn sm ice" data-mact>' + UIICON.check + 'Do that</button>' : '') + '</div>';
    }).join('') + '</div>';
    host.innerHTML = html;
    host.onclick = function (e) {
      var b = e.target.closest('[data-tier]');
      if (b && !b.disabled) {
        var t = +b.dataset.tier;
        if (t === 2 && !b.dataset.armed) { b.dataset.armed = 1; b.querySelector('.mt-c').textContent = 'Tap again — costs credibility'; b.classList.add('armed'); return; }
        var r = UIA.mentor(t);
        UIS.mentor = UIS.mentor || []; UIS.mentor.push({ day: UIA.day(), tier: t, text: r.text, action: r.action });
        UIAudio.cue('msg'); UI.save(); UI.refresh(); self.render(host); UI.emit('mentor', t);
        return;
      }
      if (e.target.closest('[data-mact]')) {
        var last = UIS.mentor[UIS.mentor.length - 1], a = last && last.action && UIA.action(last.action.id || last.action);
        if (a) { if (last.action.target) UIActions.confirm(a, last.action.target); else UIActions.start(a); }
      }
    };
  }
};
