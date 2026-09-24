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
      if (e.target.closest('#br-readall')) { UIA.inbox().forEach(function (x) { UIS.read[x.id] = 1; UIA.markRead(x.id); }); UIA.bump(); UI.badges(); self.render(); UI.save(); }
    });
    UI$('#br-back').addEventListener('click', function () { self.closeMsg(); });
  },
  show: function (o) { this.render(); if (o && o.open) this.openMsg(o.open); },
  refresh: function () { this.render(); },
  render: function () {
    var sub = UIS.brief.sub;
    UI$$('#br-sub button').forEach(function (b) { b.classList.toggle('on', b.dataset.s === sub); });
    var unread = UIA.inbox().filter(function (m) { return !UIS.read[m.id] && !m.read; }).length;
    var ib = UI$('#br-sub [data-s=inbox]'); ib.innerHTML = 'Inbox' + (unread ? ' <b class="cnt">' + unread + '</b>' : '');
    if (sub === 'est') UIEst.render(UI$('#br-body'));
    else if (sub === 'mentor') UIMentor.render(UI$('#br-body'));
    else this.renderInbox();
    var reading = !!UIS.brief.open && sub === 'inbox', doc = UI$('#br-doc');
    UI$('.br').classList.toggle('reading', reading);
    if (!reading) { doc.innerHTML = ''; doc.dataset.id = ''; UI$('#br-rt').innerHTML = ''; }
    else if (doc.dataset.id !== UIS.brief.open && !this._opening) { var m = UIA.msg(UIS.brief.open); if (m) this.fillDoc(m); }
  },
  renderInbox: function () {
    var st = UIS.brief, all = UIA.inbox().map(function (m, i) { return { m: m, i: i }; }).sort(function (a, b) { return b.m.day - a.m.day || (b.m.urgent ? 1 : 0) - (a.m.urgent ? 1 : 0) || b.i - a.i; }).map(function (x) { return x.m; }), kinds = {};
    all.forEach(function (m) { kinds[m.kind] = (kinds[m.kind] || 0) + 1; });
    var list = all.filter(function (m) { return st.filter === 'all' || m.kind === st.filter; });
    var html = '<div class="chips" style="margin-bottom:6px"><button class="chip' + (st.filter === 'all' ? ' on' : '') + '" data-kf="all">All</button>' + Object.keys(UIKINDS).filter(function (k) { return kinds[k]; }).map(function (k) { return '<button class="chip' + (st.filter === k ? ' on' : '') + '" data-kf="' + k + '"><span class="sw k-' + k + '"></span>' + UIKINDS[k].l + '</button>'; }).join('') + '</div>';
    if (!list.length) html += '<div class="empty"><b>Nothing here</b>Messages arrive overnight and when your team finishes a task.</div>';
    var lastDay = null, today = UIA.day();
    html += '<div class="ib">';
    list.forEach(function (m) {
      if (m.day !== lastDay) { lastDay = m.day; html += '<div class="ib-day">' + (m.day === today ? 'Today · ' : '') + UIesc(UIA.dateLabel(m.day)) + '</div>'; }
      var K = UIKINDS[m.kind] || UIKINDS.report, snip = UIA.bodyText(m).slice(0, 110);
      var rd = UIS.read[m.id] || m.read;
      html += '<button class="ib-it' + (rd ? ' read' : '') + (m.urgent ? ' urgent' : '') + (m.choices && !m.answered ? ' ask' : '') + (UIS.brief.open === m.id ? ' sel' : '') + '" data-msg="' + UIesc(m.id) + '"><span class="ib-ic k-' + m.kind + '">' + UIICON[K.ic] + '</span><span class="ib-tx"><span class="ib-from">' + UIesc(m.from || K.l) + '</span><b>' + UIesc(m.title) + '</b><span class="ib-sn">' + UIesc(snip) + '</span></span>' + (UIS.read[m.id] ? '' : '<i class="ib-dot"></i>') + '</button>';
    });
    html += '</div>';
    if (list.some(function (m) { return !UIS.read[m.id] && !m.read; })) html += '<button class="btn sm ghost block" id="br-readall" style="margin-top:10px">Mark all read</button>';
    UI$('#br-body').innerHTML = html;
  },
  openMsg: function (id) {
    var m = UIA.msg(id); if (!m) return;
    if (UIS.tab !== 'brief') UI.go('brief');
    if (UIS.brief.sub !== 'inbox') { UIS.brief.sub = 'inbox'; }
    UIS.brief.open = id; UIS.read[id] = 1; UIA.markRead(id);
    this._opening = true; this.fillDoc(m); this._opening = false;
    this.render();
    UI.badges();
    if (window.innerWidth < 900 && !UIhist.stack.some(function (l) { return l.name === 'reader'; })) UIhist.push('reader', function () { UIS.brief.open = null; UIBrief.render(); });
    if (m.kind === 'mayor') UIAudio.cue('phone');
    UI.emit('msg', m);
    UI.save();
  },
  fillDoc: function (m) {
    var K = UIKINDS[m.kind] || UIKINDS.report;
    UI$('#br-doc').dataset.id = m.id;
    UI$('#br-rt').innerHTML = '<div class="eyebrow">' + UIesc(K.l) + ' · ' + UIesc(UIA.dateShort(m.day)) + '</div><b>' + UIesc(m.title) + '</b>';
    UI$('#br-doc').innerHTML = this.doc(m) + this.choices(m);
    var self = this;
    UI$$('#br-doc [data-choice]').forEach(function (b) { b.addEventListener('click', function () {
      if (!b.classList.contains('armed')) { UI$$('#br-doc [data-choice]').forEach(function (x) { x.classList.remove('armed'); }); b.classList.add('armed'); b.querySelector('.ch-go').textContent = 'Tap again to answer'; return; }
      var r = UIA.answer(m.id, b.dataset.choice);
      if (!r.ok) { UItoast(r.err || 'Could not answer', { err: true }); return; }
      UIAudio.cue('ok'); UItoast('Answer given'); UI.save(); UI.refresh(); self.openMsg(m.id);
    }); });
    UI$('#br-rs').scrollTop = 0;
  },
  choices: function (m) {
    if (!m.choices || !m.choices.length) return '';
    if (m.answered) { var c = m.choices.filter(function (x) { return String(x.id) === String(m.answered); })[0]; return '<div class="chs done"><div class="eyebrow">Your answer</div><p>' + UIesc(c ? c.label : m.answered) + '</p></div>'; }
    return '<div class="chs"><div class="eyebrow em">' + (m.kind === 'mayor' ? 'What do you tell the Mayor?' : 'Your response') + '</div>' + m.choices.map(function (c) { return '<button class="ch" data-choice="' + UIesc(c.id) + '"><b>' + UIesc(c.label) + '</b>' + (c.hint ? '<small>' + UIesc(c.hint) + '</small>' : '') + '<span class="ch-go"></span></button>'; }).join('') + '</div>';
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
        var pos = /posit|confirm|novel|new agent/i.test(m.title), neg = /negat/i.test(m.title), flu = /influenza|flu /i.test(m.title);
        if (pos && /novel|new agent/i.test(m.title)) return '<article class="d-lab novel"><div class="nv-hero">' + UIvirion(m.id) + '<div class="nv-stamp"><span>Novel agent</span><b>Confirmed</b></div></div><div class="lb-h"><span class="eyebrow">' + UIesc(m.from || 'Public Health Laboratory') + '</span><span class="lb-d">' + UIesc(d) + '</span></div><h1>' + UIesc(m.title) + '</h1>' + b + '</article>';
        return '<article class="d-lab"><div class="lb-h"><span class="eyebrow">' + UIesc(m.from || 'Public Health Laboratory') + '</span><span class="lb-d">' + UIesc(d) + '</span></div><h1>' + UIesc(m.title) + '</h1>' + (pos || neg || flu ? '<div class="lb-stamp ' + (pos ? 'pos' : flu ? 'flu' : 'neg') + '">' + (pos ? (/novel|agent/i.test(m.title) ? 'Novel agent' : 'Positive') : flu ? 'Known virus' : 'Negative') + '</div>' : '') + b + '</article>';
      case 'alert':
        return '<article class="d-memo d-alert"><div class="al-band">' + UIICON.warn + '<span>Alert</span></div><div class="mm-h"><div><span class="eyebrow">From</span><b>' + UIesc(m.from || 'Surveillance') + '</b></div><div><span class="eyebrow">Date</span><b>' + UIesc(d) + '</b></div></div><h1>' + UIesc(m.title) + '</h1>' + b + '</article>';
      case 'interview':
        var who = m.refs.filter(function (r) { return typeof r === 'object' && r.ref === 'person'; })[0];
        return '<article class="d-iv">' + (who ? '<div class="iv-h"><div class="cl-face">' + UIPortrait.svg(UIA.caseOf(who.id) || { pid: who.id }) + '</div><div><div class="eyebrow">Interview · ' + UIesc(d) + '</div><b class="lnk p" data-ref="person" data-id="' + UIesc(who.id) + '">' + UIesc(who.text) + '</b><span>' + UIesc(m.from || 'Contact tracing team') + '</span></div></div>' : '<h1>' + UIesc(m.title) + '</h1>') + '<div class="iv">' + b + '</div></article>';
      case 'death':
        return '<article class="d-death"><div class="dt-rule"></div><h1>' + UIesc(m.title) + '</h1><div class="dt-d">' + UIesc(UIA.dateLong(m.day)) + '</div>' + b + '<div class="dt-rule"></div></article>';
      case 'result':
        return '<article class="d-memo d-result"><div class="mm-h"><div><span class="eyebrow">From</span><b>' + UIesc(m.from || 'Field team') + '</b></div><div><span class="eyebrow">Date</span><b>' + UIesc(d) + '</b></div></div><h1>' + UIesc(m.title) + '</h1>' + b + '</article>';
      case 'mentor':
        return '<article class="d-mentor"><div class="mt-h"><div class="cl-face">' + UIMentor.face() + '</div><div><b>' + UIesc(UIA.mentorInfo().name) + '</b><span>' + UIesc(d) + '</span></div></div>' + b + '</article>';
      default:
        return '<article class="d-memo"><div class="mm-h"><div><span class="eyebrow">From</span><b>' + UIesc(m.from || 'Surveillance') + '</b></div><div><span class="eyebrow">Date</span><b>' + UIesc(d) + '</b></div></div><h1>' + UIesc(m.title) + '</h1>' + b + '</article>';
    }
  }
};

var UIEst = {
  HOW: {
    route: 'Which settings produce clusters: stuffy indoor gatherings (airborne), households and close contact (droplet or contact), shared food (gut), cases with no human contact at all (animal).',
    incubation: 'People with a single known exposure and a known onset date — the wedding guest, the delivery driver.',
    presym: 'Contacts who fell ill before the person who infected them, and serial intervals shorter than the incubation period.',
    asym: 'Household studies: test everyone at home, ill or not, and count the positives who stay well.',
    R: 'How fast the curve doubles, and how many people each case infects in fully traced chains.',
    ifr: 'Deaths against infections — correct your confirmed cases for the ones you never find (serosurveys help).',
    ihr: 'Admissions against infections, from the record review and your line list.',
    ageRisk: 'Admissions by age compared with cases by age (Cases → Ages).',
    source: 'The earliest cases, the root of the genome tree, and anyone with animal contact or travel.',
    originCase: 'The earliest onset you can link to the rest, sitting at the root of the tree.',
    treatment: 'Only a randomised trial can tell you — read its interval honestly.',
    caseDef: 'Symptoms that are common in confirmed cases and rare in people who test negative.'
  },
  traits: function () {
    var t = UIA.estimates().traits, how = this.HOW;
    return t.map(function (x) { var o = {}; Object.keys(x).forEach(function (k) { o[k] = x[k]; }); o.how = how[x.id] || ''; if (x.id === 'ifr' || (x.type === 'pct' && x.max && x.min > 0 && x.max / x.min > 40)) { o.log = true; if (!(o.min > 0)) o.min = 0.0005; } if (o.type === 'number' && !o.step) o.step = (o.max - o.min) > 20 ? 1 : (o.max - o.min) > 5 ? 0.5 : 0.1; if (o.type === 'pct' && !o.step) o.step = 0.01; return o; });
  },
  optLabel: function (t, v) { var o = (t.options || []).filter(function (x) { return String(x.id) === String(v); })[0]; return o ? o.label : UIcap(String(v)); },
  fmt: function (t, v) {
    if (v === undefined || v === null || v === '') return '—';
    if (t.type === 'pct') return UIfmt.pct(+v, +v < 0.01 ? 2 : +v < 0.1 ? 1 : 0);
    if (t.type === 'number') { var sv = (+v).toFixed(t.step && t.step < 1 ? (t.step < 0.1 ? 2 : 1) : 0).replace(/\.0+$/, ''); return sv + (t.unit ? ' ' + (sv === '1' ? t.unit.replace(/s$/, '') : t.unit) : ''); }
    if (t.type === 'person') { var c = UIA.caseOf(v); return c ? c.name : String(v); }
    if (t.type === 'multi') return (Array.isArray(v) ? v : [v]).map(function (x) { return UIEst.optLabel(t, x); }).join(', ') || '—';
    return this.optLabel(t, v);
  },
  same: function (a, b) { return JSON.stringify(a) === JSON.stringify(b); },
  pubVal: function (id) { var p = UIA.estimates().published[id]; return p === undefined || p === null ? null : p; },
  draft: function () {
    var e = UIA.estimates();
    if (e.engineDraft) return e.draft;
    return UIS.est.draft;
  },
  setDraft: function (id, v) {
    if (UIA.estimates().engineDraft) UIA.setDraft(id, v);
    else { if (v === undefined || v === null) delete UIS.est.draft[id]; else UIS.est.draft[id] = v; }
    UI.save();
  },
  changed: function () {
    var self = this, d = this.draft();
    return this.traits().filter(function (t) { var p = self.pubVal(t.id); return d[t.id] !== undefined && d[t.id] !== null && (!p || !self.same(p.value, d[t.id])); });
  },
  render: function (host) {
    var self = this, draft = this.draft(), traits = this.traits(), changed = this.changed();
    var pubN = traits.filter(function (t) { return self.pubVal(t.id); }).length, keys = traits.filter(function (t) { return t.key; }), keyPub = keys.filter(function (t) { return self.pubVal(t.id); }).length;
    var html = '<div class="wb"><div class="wb-h"><div><div class="eyebrow">Your working estimates</div><h3>The whiteboard</h3></div><span class="wb-n">' + pubN + '/' + traits.length + ' published</span></div>' +
      (keys.length ? '<div class="wb-keys"><span class="bar"><i style="width:' + Math.round(keyPub / keys.length * 100) + '%;background:var(--ember)"></i></span><span>' + keyPub + ' of ' + keys.length + ' key traits published' + (UIA.actNo() === 2 ? ' — all of them ends act two' : '') + '</span></div>' : '') +
      '<p class="note" style="margin:0 0 12px">Set what you currently believe. Nothing is checked against the truth until the debrief — but the public, the council and the vaccine clock react to what you publish. Revising costs a little trust; being wrong for long costs more.</p>';
    traits.forEach(function (t) {
      var p = self.pubVal(t.id), v = draft[t.id] !== undefined && draft[t.id] !== null ? draft[t.id] : p ? p.value : undefined, dirty = draft[t.id] !== undefined && draft[t.id] !== null && (!p || !self.same(p.value, draft[t.id]));
      html += '<div class="wb-r' + (dirty ? ' dirty' : '') + (p ? ' pub' : '') + '" data-t="' + UIesc(t.id) + '"><div class="wb-top"><b class="wb-l">' + UIesc(t.label) + (t.key ? '<i class="wb-key" title="Key trait">KEY</i>' : '') + '</b><span class="wb-v">' + UIesc(self.fmt(t, v)) + '</span></div>';
      if (t.type === 'choice') html += '<div class="wb-opts">' + t.options.map(function (o) { return '<button data-v="' + UIesc(o.id) + '" class="' + (String(v) === String(o.id) ? 'on' : '') + '">' + UIesc(UIcap(o.label)) + '</button>'; }).join('') + '</div>';
      else if (t.type === 'multi') { var sel = Array.isArray(v) ? v.map(String) : []; html += '<div class="wb-opts multi">' + (t.options || []).map(function (o) { return '<button data-m="' + UIesc(o.id) + '" class="' + (sel.indexOf(String(o.id)) >= 0 ? 'on' : '') + '">' + UIesc(UIcap(o.label)) + '</button>'; }).join('') + '</div>'; }
      else if (t.type === 'person') html += '<button class="btn sm block" data-pick>' + UIICON.person + (v ? 'Change: ' + UIesc(self.fmt(t, v)) : 'Choose from the line list') + '</button>';
      else {
        var mn = t.min, mx = t.max, pos = v === undefined ? 0.5 : t.log ? (Math.log(Math.max(v, mn)) - Math.log(mn)) / (Math.log(mx) - Math.log(mn)) : (v - mn) / (mx - mn);
        html += '<input type="range" class="wb-rng" min="0" max="1000" value="' + Math.round(UIclamp(pos, 0, 1) * 1000) + '" aria-label="' + UIesc(t.label) + '"><div class="wb-scale"><span>' + UIesc(self.fmt(t, mn)) + '</span><span>' + UIesc(self.fmt(t, mx)) + '</span></div>';
      }
      html += '<div class="wb-f">' + (p ? '<span class="wb-pub">' + UIICON.check + 'Published ' + UIesc(self.fmt(t, p.value)) + (p.day !== null ? ' · ' + UIesc(UIA.dateShort(p.day)) : '') + (p.revisions ? ' · revised ' + p.revisions + '×' : '') + '</span>' : '<span class="wb-unpub">Not published</span>') + (t.how ? '<button class="wb-how" data-how aria-label="How to estimate">How?</button>' : '') + '</div><p class="wb-howt" hidden>' + UIesc(t.how || '') + '</p></div>';
    });
    html += changed.length ? '<div class="wb-go"><button class="btn pri block" id="wb-pub"' + (UIA.over() ? ' disabled' : '') + '>' + UIICON.mic + 'Publish ' + UIfmt.plural(changed.length, 'estimate') + '</button><button class="btn xs ghost block" id="wb-reset" style="margin-top:4px">Discard changes</button></div></div>' : '<p class="wb-none">Change a value above to prepare it for publication.</p></div>';
    host.innerHTML = html;
    host.onclick = function (e) {
      var r = e.target.closest('.wb-r'); var id = r && r.dataset.t, t = id && traits.filter(function (x) { return x.id === id; })[0];
      var ob = e.target.closest('.wb-opts button');
      if (ob && t) {
        if (t.type === 'multi') { var cur = Array.isArray(draft[id]) ? draft[id].slice() : (self.pubVal(id) && Array.isArray(self.pubVal(id).value) ? self.pubVal(id).value.slice() : []); var k = cur.map(String).indexOf(ob.dataset.m); if (k >= 0) cur.splice(k, 1); else cur.push(ob.dataset.m); self.setDraft(id, cur); }
        else self.setDraft(id, ob.dataset.v);
        UIAudio.cue('tap'); self.render(host); return;
      }
      if (e.target.closest('[data-pick]') && t) { self.pickPerson(host, t); return; }
      if (e.target.closest('[data-how]')) { var ht = r.querySelector('.wb-howt'); ht.hidden = !ht.hidden; return; }
      if (e.target.closest('#wb-reset')) { changed.forEach(function (x) { self.setDraft(x.id, null); }); self.render(host); return; }
      if (e.target.closest('#wb-pub')) self.confirm(host, changed);
    };
    UI$$('.wb-rng', host).forEach(function (rg) {
      var r = rg.closest('.wb-r'), t = traits.filter(function (x) { return x.id === r.dataset.t; })[0];
      function val() { var f = rg.value / 1000, v = t.log ? Math.exp(Math.log(t.min) + f * (Math.log(t.max) - Math.log(t.min))) : t.min + f * (t.max - t.min); if (t.log) { var mag = Math.pow(10, Math.floor(Math.log10(v)) - 1); v = Math.round(v / mag) * mag; } else { var st = t.step || 0.01; v = Math.round(v / st) * st; } return +v.toFixed(5); }
      rg.addEventListener('input', function () { r.querySelector('.wb-v').textContent = self.fmt(t, val()); r.classList.add('dirty'); });
      rg.addEventListener('change', function () { self.setDraft(t.id, val()); self.render(host); });
    });
  },
  pickPerson: function (host, t) {
    var self = this, cs = UIA.cases().filter(function (c) { return c.onset !== null; }).sort(function (a, b) { return a.onset - b.onset; }).slice(0, 60);
    UIsheet.open({ eyebrow: 'Estimate', title: t.label, html: '<p class="note">Earliest onsets first.</p><div class="list">' + cs.map(function (c) { return UIli({ attrs: 'data-pc="' + UIesc(c.pid) + '"', ic: '<span class="mini-face">' + UIPortrait.svg(c) + '</span>', icStyle: 'background:none;padding:0;overflow:hidden', label: UIesc(c.name), small: 'Onset ' + UIesc(UIA.dateShort(c.onset)) + ' · ' + UIesc((UIA.district(c.district) || { name: '' }).name) }); }).join('') + '</div>',
      mount: function (b) { b.addEventListener('click', function (e) { var x = e.target.closest('[data-pc]'); if (!x) return; self.setDraft(t.id, x.dataset.pc); UIsheet.close(); self.render(host); }); } });
  },
  confirm: function (host, changed) {
    var self = this, draft = this.draft();
    var revs = changed.filter(function (t) { return self.pubVal(t.id); }).length;
    UIsheet.open({ eyebrow: 'Press briefing', title: 'Publish estimates', tag: 'publish', html: '<div class="list">' + changed.map(function (t) { var p = self.pubVal(t.id); return '<div class="li"><span class="tx"><b>' + UIesc(t.label) + '</b><small>' + (p ? 'Revising from ' + UIesc(self.fmt(t, p.value)) : 'First estimate') + '</small></span><span class="cost" style="font:600 15px var(--f-mono);max-width:50%;text-align:right">' + UIesc(self.fmt(t, draft[t.id])) + '</span></div>'; }).join('') + '</div>' +
      (revs ? '<p class="cf-why" style="color:var(--amber)">' + UIICON.warn + 'Revising ' + UIfmt.plural(revs, 'published estimate') + ' costs a little public trust.</p>' : '<p class="note" style="margin-top:10px">The Courier and the council will read these tomorrow morning.</p>') +
      '<button class="btn pri block" id="pb-go" style="margin-top:14px">' + UIICON.mic + 'Publish</button>',
      mount: function (b) {
        UI$('#pb-go', b).addEventListener('click', function () {
          var vals = {}; changed.forEach(function (t) { vals[t.id] = draft[t.id]; });
          var r = UIA.publish(vals);
          if (!r.ok) { UItoast(r.err || 'Could not publish', { err: true }); return; }
          if (!UIA.estimates().engineDraft) UIS.est.draft = {};
          UIsheet.close(); UIAudio.cue('publish'); UItoast('Estimates published');
          UI.save(); UI.refresh(); self.render(host); UI.emit('publish', vals);
          if (UIA.actNo() === 3 && !UIS.act3shown) { UIS.act3shown = true; UI.actCard(3); }
        });
      } });
  }
};

var UIMentor = {
  face: function () { return UIPortrait.svg({ pid: 'okonjo-mentor', age: 68, sex: 'F' }); },
  TIERS: [
    { t: 0, l: 'A nudge', d: 'A question to point you somewhere useful.' },
    { t: 1, l: 'A pointer', d: 'Where to look and what to do next.' },
    { t: 2, l: 'The straight answer', d: 'She tells you what she thinks is going on.' }
  ],
  render: function (host) {
    var self = this, info = UIA.mentorInfo(), st = UIA.mentorStatus(), log = UIS.mentor || [];
    var html = '<div class="card mentor"><div class="mt-card"><div class="cl-face big">' + this.face() + '</div><div><div class="eyebrow">Your mentor</div><h3>' + UIesc(info.name) + '</h3><p class="dim" style="margin:2px 0 0;font-size:13.5px">' + UIesc(info.title) + '</p></div></div>' + (info.bio ? '<p class="mt-bio">' + UIesc(info.bio) + '</p>' : '') +
      '<div class="mt-tiers">' + this.TIERS.map(function (T) { var s = st[T.t] || { ok: true }, dis = UIA.over() || !s.ok; return '<button class="mt-t t' + T.t + '" data-tier="' + T.t + '"' + (dis ? ' disabled' : '') + '><span class="mt-n">' + (T.t + 1) + '</span><span class="tx"><b>' + T.l + '</b><small>' + UIesc(T.d) + '</small></span><span class="mt-c">' + UIesc(!s.ok && s.why ? s.why : info.costs[T.t]) + '</span></button>'; }).join('') + '</div></div>';
    if (log.length) html += '<div class="eyebrow" style="margin:18px 2px 10px">Conversation</div><div class="mt-log">' + log.slice().reverse().map(function (x, i) {
      return '<div class="mt-msg t' + x.tier + '"><div class="mt-meta">' + UIesc(UIA.dateShort(x.day)) + ' · ' + UIesc(self.TIERS[x.tier] ? self.TIERS[x.tier].l : '') + '</div><p>' + UIesc(x.text) + '</p>' + (x.action && i === 0 ? '<button class="btn sm ice" data-mact>' + UIICON.check + 'Do that</button>' : '') + '</div>';
    }).join('') + '</div>';
    host.innerHTML = html;
    host.onclick = function (e) {
      var b = e.target.closest('[data-tier]');
      if (b && !b.disabled) {
        var t = +b.dataset.tier;
        if (t > 0 && !b.dataset.armed) { b.dataset.armed = 1; b.querySelector('.mt-c').textContent = 'Tap again — ' + info.costs[t]; b.classList.add('armed'); return; }
        var r = UIA.mentor(t);
        if (!r.ok && !r.text) { UItoast('Not now', { err: true }); return; }
        UIS.mentor = UIS.mentor || []; UIS.mentor.push({ day: UIA.day(), tier: t, text: r.text, action: r.action });
        UIAudio.cue('msg'); UI.save(); UI.refresh(); self.render(host); UI.emit('mentor', t);
        return;
      }
      if (e.target.closest('[data-mact]')) {
        var last = UIS.mentor[UIS.mentor.length - 1], a = last && last.action && UIA.action(last.action.id || last.action);
        if (a) { if (last.action.target) UIActions.confirm(a, last.action.target, {}); else UIActions.start(a); }
      }
    };
  }
};

/** a stylised electron micrograph of the new agent: envelope, spikes, genome, drawn from a seed */
function UIvirion(seed) {
  var r = UIrand('virion:' + seed), sp = '', n = 26, R = 62, g = '';
  for (var i = 0; i < n; i++) {
    var a = i / n * Math.PI * 2 + r() * .08, l = 12 + r() * 5, x0 = 100 + Math.cos(a) * R, y0 = 100 + Math.sin(a) * R, x1 = 100 + Math.cos(a) * (R + l), y1 = 100 + Math.sin(a) * (R + l);
    sp += '<line x1="' + x0.toFixed(1) + '" y1="' + y0.toFixed(1) + '" x2="' + x1.toFixed(1) + '" y2="' + y1.toFixed(1) + '"/><circle cx="' + x1.toFixed(1) + '" cy="' + y1.toFixed(1) + '" r="' + (3.4 + r() * 1.6).toFixed(1) + '"/>';
  }
  var d = 'M100,100'; for (var k = 0; k < 40; k++) { var aa = k * .9 + r(), rr = 8 + k * 1.05; d += 'Q' + (100 + Math.cos(aa - .4) * rr * 1.1).toFixed(1) + ',' + (100 + Math.sin(aa - .4) * rr * 1.1).toFixed(1) + ' ' + (100 + Math.cos(aa) * rr).toFixed(1) + ',' + (100 + Math.sin(aa) * rr).toFixed(1); }
  for (var j = 0; j < 18; j++) { var ab = r() * Math.PI * 2, rb = Math.sqrt(r()) * 44; g += '<circle cx="' + (100 + Math.cos(ab) * rb).toFixed(1) + '" cy="' + (100 + Math.sin(ab) * rb).toFixed(1) + '" r="' + (1.5 + r() * 2.5).toFixed(1) + '"/>'; }
  return '<svg class="nv-virion" viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="nvg" cx=".38" cy=".34" r=".75"><stop offset="0" stop-color="#ffd9c2"/><stop offset=".45" stop-color="#ff8a57"/><stop offset="1" stop-color="#6a1d08"/></radialGradient><radialGradient id="nvh" cx=".5" cy=".5" r=".5"><stop offset=".55" stop-color="#ff7a45" stop-opacity=".35"/><stop offset="1" stop-color="#ff7a45" stop-opacity="0"/></radialGradient></defs>' +
    '<circle cx="100" cy="100" r="98" fill="url(#nvh)"/><g class="nv-rot"><g stroke="#ffb48d" stroke-width="2.2" fill="#ffc9a8">' + sp + '</g><circle cx="100" cy="100" r="' + R + '" fill="url(#nvg)"/><circle cx="100" cy="100" r="' + (R - 5) + '" fill="none" stroke="#ffe6d6" stroke-opacity=".35" stroke-width="1.5" stroke-dasharray="3 5"/>' +
    '<g fill="#3a0f04" opacity=".35">' + g + '</g><path d="' + d + '" fill="none" stroke="#fff3ea" stroke-opacity=".55" stroke-width="1.4" stroke-linecap="round"/></g>' +
    '<circle class="nv-scan" cx="100" cy="100" r="92" fill="none" stroke="#c5e4ff" stroke-opacity=".5" stroke-width="1" stroke-dasharray="2 6"/></svg>';
}
