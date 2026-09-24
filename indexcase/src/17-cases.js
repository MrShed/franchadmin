/* INDEX CASE UI — 17-cases.js: the line list, epidemic curve, age breakdown and
 * the person sheet (what is known + interview / trace / test / sequence). */
var UICases = UI.views.cases = {
  limit: 120,
  build: function (root) {
    var self = this;
    root.innerHTML = '<div class="scroll" id="cs-scroll"><div class="pad"><div class="vhead"><div style="flex:1"><div class="eyebrow">Surveillance</div><h2>Cases</h2></div><div class="seg" id="cs-sub" style="flex:none;width:230px"><button data-s="list">Line list</button><button data-s="curve">Curve</button><button data-s="ages">Ages</button></div></div><div id="cs-body"></div></div></div>';
    UI$('#cs-sub').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; UIAudio.cue('tap'); UIS.cases.sub = b.dataset.s; self.limit = 120; self.render(); UI.emit('cases-sub', b.dataset.s); UI.save(); });
    UI$('#cs-body').addEventListener('click', function (e) {
      var r = e.target.closest('[data-pid]'); if (r) { UIAudio.cue('tap'); self.personSheet(r.dataset.pid); return; }
      var f = e.target.closest('[data-f]'); if (f) { UIS.cases.filter = f.dataset.f; self.limit = 120; self.render(); return; }
      var s = e.target.closest('[data-sort]'); if (s) { UIS.cases.sort = s.dataset.sort; self.render(); return; }
      if (e.target.closest('#cs-more')) { self.limit += 200; self.render(); }
      var t = e.target.closest('[data-rep]'); if (t) { UIS.cases.showReport = !UIS.cases.showReport; self.render(); }
    });
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (UIS && UIS.tab === 'cases' && UIS.cases.sub !== 'list') self.render(); }, 150); });
  },
  show: function () { this.render(); },
  refresh: function () { this.render(); },
  render: function () {
    var sub = UIS.cases.sub;
    UI$$('#cs-sub button').forEach(function (b) { b.classList.toggle('on', b.dataset.s === sub); });
    if (sub === 'curve') this.renderCurve(); else if (sub === 'ages') this.renderAges(); else this.renderList();
  },
  FILTERS: [['all', 'All'], ['new', 'New today'], ['nointerview', 'Not interviewed'], ['untested', 'Untested'], ['pos', 'Confirmed'], ['hosp', 'Hospital'], ['died', 'Died']],
  filtered: function () {
    var st = UIS.cases, day = UIA.day(), q = (st.q || '').toLowerCase().trim();
    var cs = UIA.cases().filter(function (c) {
      if (q && c.name.toLowerCase().indexOf(q) < 0 && (UIA.district(c.district) || { name: '' }).name.toLowerCase().indexOf(q) < 0) return false;
      switch (st.filter) {
        case 'new': return c.reported === day;
        case 'nointerview': return !c.interviewed && c.status !== 'died';
        case 'untested': return UIA.testState(c) === 'none';
        case 'pos': return UIA.testState(c) === 'pos' || c.status === 'confirmed';
        case 'hosp': return c.status === 'hospital' || c.status === 'icu';
        case 'died': return c.status === 'died';
      }
      return true;
    });
    var S = st.sort;
    cs.sort(function (a, b) {
      if (S === 'onset') return (b.onset === null ? -1e9 : b.onset) - (a.onset === null ? -1e9 : a.onset);
      if (S === 'age') return (b.age || 0) - (a.age || 0);
      if (S === 'district') return String((UIA.district(a.district) || {}).name).localeCompare(String((UIA.district(b.district) || {}).name));
      return (b.reported || 0) - (a.reported || 0) || (b.onset || 0) - (a.onset || 0);
    });
    return cs;
  },
  renderList: function () {
    var self = this, st = UIS.cases, all = UIA.cases(), day = UIA.day(), cs = this.filtered();
    var nToday = all.filter(function (c) { return c.reported === day; }).length;
    var html = '<div class="cs-tools"><div class="cs-search">' + UIICON.search + '<input id="cs-q" type="search" placeholder="Search name or district" value="' + UIesc(st.q || '') + '" autocomplete="off"></div>' +
      '<div class="chips">' + this.FILTERS.map(function (f) { var n = f[0] === 'new' ? nToday : null; return '<button class="chip' + (st.filter === f[0] ? ' on' : '') + '" data-f="' + f[0] + '">' + f[1] + (n ? ' <b class="cnt">' + n + '</b>' : '') + '</button>'; }).join('') + '</div>' +
      '<div class="cs-sort"><span class="eyebrow">' + UIfmt.plural(cs.length, 'case') + '</span><span class="sp"></span>' + [['recent', 'Recent'], ['onset', 'Onset'], ['age', 'Age'], ['district', 'District']].map(function (s) { return '<button data-sort="' + s[0] + '" class="' + (st.sort === s[0] ? 'on' : '') + '">' + s[1] + '</button>'; }).join('') + '</div></div>';
    if (!all.length) html += '<div class="empty"><b>No cases on the list</b>Cases appear here as doctors, hospitals and your tracing report them.</div>';
    else if (!cs.length) html += '<div class="empty"><b>Nothing matches</b>Try another filter.</div>';
    else {
      html += '<div class="ll">' + cs.slice(0, this.limit).map(function (c) { return self.row(c, day); }).join('') + '</div>';
      if (cs.length > this.limit) html += '<button class="btn block" id="cs-more" style="margin-top:12px">Show ' + Math.min(200, cs.length - this.limit) + ' more</button>';
    }
    UI$('#cs-body').innerHTML = html;
    var q = UI$('#cs-q');
    q.addEventListener('input', function () { st.q = q.value; clearTimeout(self._qt); self._qt = setTimeout(function () { var pos = q.selectionStart; self.limit = 120; self.renderList(); var nq = UI$('#cs-q'); nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } }, 180); });
  },
  row: function (c, day) {
    var S = UIstatus(c.status), d = UIA.district(c.district), ts = UIA.testState(c);
    var flags = '<span class="fl' + (c.interviewed ? ' on' : '') + '" title="Interviewed">' + UIICON.mic + '</span><span class="fl' + (c.traced ? ' on' : '') + '" title="Contacts traced">' + UIICON.people + '</span>' +
      '<span class="fl t-' + ts + '" title="Test: ' + ts + '">' + UIICON.test + '</span><span class="fl' + (c.seq ? ' on s-' + c.seq : '') + '" title="Sequenced">' + UIICON.dna + '</span>';
    return '<button class="lr' + (c.reported === day ? ' new' : '') + (c.status === 'died' ? ' died' : '') + '" data-pid="' + UIesc(c.pid) + '"><span class="face">' + UIPortrait.svg(c) + '</span><span class="lr-m"><span class="lr-t"><b>' + UIesc(c.name) + '</b><em>' + UIfmt.age(c) + '</em></span>' +
      '<span class="lr-s">' + UIesc(d ? d.name : '') + ' · onset ' + (c.onset !== null ? UIesc(UIA.dateShort(c.onset)) : '—') + '</span></span><span class="lr-r"><span class="pill ' + S.c + '">' + S.l + '</span><span class="fls">' + flags + '</span></span></button>';
  },
  renderCurve: function () {
    var cv = UIA.curve(), day = UIA.day(), all = UIA.cases();
    var rep = cv.byReport, n = rep.length, l7 = UIsum(rep.slice(Math.max(0, n - 7))), p7 = UIsum(rep.slice(Math.max(0, n - 14), Math.max(0, n - 7)));
    var growth = p7 > 2 && l7 > 2 ? Math.log(l7 / p7) / 7 : null, dbl = growth ? Math.log(2) / growth : null;
    var trend = growth === null ? '—' : dbl > 0 && dbl < 60 ? 'doubling ~' + dbl.toFixed(dbl < 10 ? 1 : 0) + 'd' : dbl < 0 && dbl > -60 ? 'halving ~' + (-dbl).toFixed(-dbl < 10 ? 1 : 0) + 'd' : 'flat';
    var from = 0; for (var i = 0; i < cv.n; i++) if (cv.byOnset[i] || cv.byReport[i]) { from = Math.max(0, i - 3); break; }
    var html = '<div class="tiles"><div class="stat"><b>' + UIfmt.n(all.length) + '</b><span>on the line list</span></div><div class="stat"><b style="color:var(--ember)">' + l7 + '</b><span>reported, last 7 days</span></div><div class="stat"><b>' + UIesc(trend) + '</b><span>last 7 vs previous 7</span></div></div>' +
      '<div class="card chart-card"><div class="card-h"><div class="t"><div class="eyebrow">Cases by date of onset</div><h3>Epidemic curve</h3></div></div><div class="card-b"><div class="ch-host" id="ch-epi"></div>' +
      '<div class="legend"><span><i style="background:linear-gradient(#ff9a66,#e5562a)"></i>Onset</span><span><i class="hz"></i>Nowcast — likely not yet reported</span><button class="chip' + (UIS.cases.showReport ? ' on' : '') + '" data-rep style="min-height:30px"><i style="background:#8fcbff;height:2px;width:14px;border-radius:1px;display:inline-block"></i>By report date</button></div>' +
      '<p class="note">Recent days always look lower than they will: people fall ill days before they are tested and reported. The hatched band is how many more are probably on their way.</p></div></div>' +
      '<div class="card chart-card"><div class="card-h"><div class="t"><div class="eyebrow">Hospital</div><h3>Admissions</h3></div><div class="aside">' + UIsum(cv.admissions) + ' total</div></div><div class="card-b"><div class="ch-host" id="ch-adm"></div></div></div>' +
      '<div class="card chart-card"><div class="card-h"><div class="t"><div class="eyebrow">Mortality</div><h3>Deaths</h3></div><div class="aside">' + UIsum(cv.deaths) + ' total</div></div><div class="card-b"><div class="ch-host" id="ch-dth"></div></div></div>';
    UI$('#cs-body').innerHTML = '<div class="stack">' + html + '</div>';
    UIChart.epi(UI$('#ch-epi'), cv, { from: from, showReport: UIS.cases.showReport, today: day, h: window.innerWidth >= 900 ? 280 : 220 });
    UIChart.mini(UI$('#ch-adm'), cv.admissions.slice(from), cv.start + from, { color: '#f2b640', label: 'Admitted', h: 100 });
    UIChart.mini(UI$('#ch-dth'), cv.deaths.slice(from), cv.start + from, { color: '#d9d3c7', label: 'Died', h: 100 });
  },
  BANDS: [[0, 9, '0–9'], [10, 19, '10–19'], [20, 29, '20–29'], [30, 39, '30–39'], [40, 49, '40–49'], [50, 59, '50–59'], [60, 69, '60–69'], [70, 79, '70–79'], [80, 200, '80+']],
  renderAges: function () {
    var cs = UIA.cases().filter(function (c) { return c.status !== 'negative' && c.status !== 'contact' && c.age !== null; });
    var rows = this.BANDS.map(function (b) {
      var inB = cs.filter(function (c) { return c.age >= b[0] && c.age <= b[1]; });
      var hosp = inB.filter(function (c) { return c.status === 'hospital' || c.status === 'icu' || c.status === 'died' || c.raw.admitted; }).length;
      var died = inB.filter(function (c) { return c.status === 'died'; }).length;
      return { label: b[2], n: inB.length, hosp: hosp, died: died };
    });
    var N = cs.length || 1, H = UIsum(rows.map(function (r) { return r.hosp; })) || 1;
    var html = cs.length ? '' : '<div class="empty"><b>No ages yet</b>The breakdown fills in as cases are reported.</div>';
    if (cs.length) html = '<div class="card chart-card"><div class="card-h"><div class="t"><div class="eyebrow">Share of ' + cs.length + ' cases</div><h3>Cases by age</h3></div></div><div class="card-b"><div class="ch-host" id="ch-age1"></div></div></div>' +
      '<div class="card chart-card"><div class="card-h"><div class="t"><div class="eyebrow">Share of ' + UIsum(rows.map(function (r) { return r.hosp; })) + ' admitted or died</div><h3>Who ends up in hospital</h3></div></div><div class="card-b"><div class="ch-host" id="ch-age2"></div><p class="note">Compare the two shapes. If the hospital bars lean further toward one age than the case bars do, the disease is harder on that age.</p></div></div>' +
      '<div class="card chart-card"><div class="card-h"><div class="t"><div class="eyebrow">Admitted or died ÷ known cases</div><h3>Severity by age</h3></div></div><div class="card-b"><div class="ch-host" id="ch-age3"></div><p class="note">Known cases only — mild and silent infections are missed, so the true risk per infection is lower.</p></div></div>';
    UI$('#cs-body').innerHTML = '<div class="stack">' + html + '</div>';
    if (!cs.length) return;
    UIChart.ageBars(UI$('#ch-age1'), rows.map(function (r) { return { label: r.label, a: r.n / N, n: r.n }; }), { color: '#ff7a45', label: 'Cases by age', fmt: function (r) { return r.n; } });
    UIChart.ageBars(UI$('#ch-age2'), rows.map(function (r) { return { label: r.label, a: r.hosp / H, n: r.hosp }; }), { color: '#f2b640', label: 'Admissions by age', fmt: function (r) { return r.n; } });
    UIChart.ageBars(UI$('#ch-age3'), rows.map(function (r) { return { label: r.label, a: r.n ? r.hosp / r.n : 0, n: r.n }; }), { color: '#d9d3c7', label: 'Severity by age', fmt: function (r) { return r.n ? UIfmt.pct(r.a) : '—'; } });
  },

  // ------------------------------------------------------------ person sheet
  VIA: { alert: 'In the first alert', hospital: 'Reported by the hospital', gp: 'Reported by a GP', tracing: 'Found by contact tracing', household: 'Found in a household study', testing: 'Found by testing', review: 'Found in the record review', serosurvey: 'Found in the serosurvey', press: 'First heard of in the press' },
  personSheet: function (pid, o) {
    o = o || {};
    var self = this, p = UIA.person(pid), c = p.c, day = UIA.day(), d = UIA.district(p.district), S = UIstatus(p.status);
    var died = p.status === 'died';
    function pref(pid2) { var cc = UIA.caseOf(pid2); var nm = cc ? cc.name : (UIA.contacts().filter(function (x) { return x.pid === pid2; })[0] || {}).name || pid2; return '<span class="lnk p" data-ref="person" data-id="' + UIesc(pid2) + '">' + UIesc(nm) + '</span>'; }
    var html = '<div class="ps-head"><div class="ps-face">' + UIPortrait.svg(p) + '</div><div class="ps-id"><div class="ps-meta">' + UIfmt.age(p) + (p.occupation ? ' · ' + UIesc(p.occupation) : '') + '</div>' +
      (d ? '<div class="ps-meta">' + (p.address ? UIesc(p.address) + ', ' : '') + '<span class="lnk dt" data-ref="district" data-id="' + UIesc(d.id) + '">' + UIesc(d.name) + '</span></div>' : '') +
      '<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><span class="pill ' + S.c + '">' + S.l + '</span>' + (c && c.caseStatus !== c.status && c.caseStatus !== 'discarded' ? '<span class="pill st-sus">' + UIesc(UIcap(c.caseStatus)) + '</span>' : '') + '</div>' +
      (c && c.via ? '<div class="ps-via">' + UIesc(this.VIA[c.via] || UIcap(c.via)) + (c.reported !== null ? ' · ' + UIesc(UIA.dateShort(c.reported)) : '') + '</div>' : '') + '</div></div>';
    html += this.timeline(p, c, day);
    if (died) html += '<div class="ps-died">' + UIesc(p.name) + ' died' + (c && c.died !== null ? ' on ' + UIesc(UIA.dateLong(c.died)) : '') + '. ' + (p.age !== null && p.age !== undefined ? UIesc(p.age) + ' years old.' : '') + '</div>';
    if (p.follow) html += '<div class="ps-follow">' + UIICON.people + '<span>Contact of ' + p.follow.of.map(pref).join(', ') + ' · ' + UIesc(p.follow.setting || '') + (p.follow.exposure !== null ? ', exposed ' + UIesc(UIA.dateShort(p.follow.exposure)) : '') + '. <b>' + UIesc(UIcap(p.follow.status)) + '</b>' + (p.follow.followUntil !== null ? ' · followed until ' + UIesc(UIA.dateShort(p.follow.followUntil)) : '') + '</span></div>';
    // what we know
    var know = '';
    var facts = [];
    if (p.workplace) facts.push(['Works at', UIparts([p.workplace])]);
    if (p.school) facts.push(['School', UIparts([p.school])]);
    if (p.habits.length) facts.push(['Habits', UIesc(p.habits.join(', '))]);
    if (p.household.length) facts.push(['Household', p.household.map(pref).join(', ')]);
    if (facts.length) know += '<dl class="kv ps-kv">' + facts.map(function (f) { return '<dt>' + f[0] + '</dt><dd>' + f[1] + '</dd>'; }).join('') + '</dl>';
    if (c && c.exposures) know += '<div class="kn"><span class="eyebrow">Exposures in the 14 days before onset</span>' + (c.exposures.length ? '<div class="list">' + c.exposures.map(function (e) {
      var pl = e.place ? (typeof e.place === 'object' ? e.place : { t: 'place', id: e.place, d: (UIA.place(e.place) || {}).name || e.place }) : null, pe = e.person && typeof e.person === 'object' ? e.person : null;
      var attrs = pl ? 'data-ref="place" data-id="' + UIesc(pl.id) + '"' : pe ? 'data-ref="person" data-id="' + UIesc(pe.id) + '"' : '';
      var lbl = pl ? (pl.d || pl.text) : pe ? (pe.d || pe.text) : UIcap(e.setting || 'Somewhere');
      return UIli({ attrs: attrs, ic: pe ? UIICON.person : UIICON.pin, icStyle: pe ? '' : 'color:var(--teal2);background:rgba(63,208,170,.1)', label: UIesc(lbl), small: (e.day !== null && e.day !== undefined ? UIesc(UIA.dateLabel(e.day)) : '') + (e.setting && (pl || pe) ? ' · ' + UIesc(UIplaceKind(e.setting)[0]) : '') + (e.note ? ' · ' + UIesc(e.note) : ''), right: attrs ? undefined : '' });
    }).join('') + '</div>' : '<p class="note">Could not recall anywhere in particular.</p>') + '</div>';
    var docs = UIA.msgsAbout(pid).slice().reverse();
    var iv = docs.filter(function (m) { return m.kind === 'interview'; })[0];
    if (iv) know += '<div class="kn"><span class="eyebrow">Interview · ' + UIesc(UIA.dateShort(iv.day)) + '</span><div class="iv">' + UIbody(iv.body) + '</div></div>';
    if (c && c.contacts) know += '<div class="kn"><span class="eyebrow">Named contacts · ' + c.contacts.length + '</span>' + (c.contacts.length ? '<div class="list">' + c.contacts.map(function (cp) {
      var cc = UIA.caseOf(cp), fl = UIA.contacts().filter(function (x) { return x.pid === cp; })[0];
      var st = cc ? UIstatus(cc.status) : { l: UIcap(fl ? fl.status : 'contact'), c: fl && fl.status === 'ill' ? 'st-prob' : 'st-con' };
      return UIli({ attrs: 'data-ref="person" data-id="' + UIesc(cp) + '"', ic: '<span class="mini-face">' + UIPortrait.svg({ pid: cp, age: cc ? cc.age : null, sex: cc ? cc.sex : '' }) + '</span>', icStyle: 'background:none;padding:0;overflow:hidden', label: UIesc(cc ? cc.name : fl ? fl.name : cp), small: (fl ? UIesc(UIcap(fl.setting)) + ' · ' : '') + '<span class="pill ' + st.c + '">' + st.l + '</span>' });
    }).join('') + '</div>' : '<p class="note">No contacts found.</p>') + '</div>';
    if (c && c.tests.length) know += '<div class="kn"><span class="eyebrow">Tests</span><div class="tests">' + c.tests.map(function (t) {
      var cls = t.result === 'pos' ? 'pos' : t.result === 'pending' ? 'pend' : t.result === 'neg' && t.kind === 'panel' ? 'pneg' : 'neg';
      return '<div class="tst ' + cls + '"><b>' + UIesc(UIA.testLabel(t)) + '</b><span>' + (t.kind ? UIesc(t.kind === 'panel' ? 'Extended panel' : t.kind.toUpperCase()) + ' · ' : '') + (t.day !== null ? 'sampled ' + UIesc(UIA.dateShort(t.day)) : '') + (t.resultDay !== null ? ' · result ' + UIesc(UIA.dateShort(t.resultDay)) : '') + '</span></div>';
    }).join('') + '</div></div>';
    if (c && c.seq) know += '<div class="kn"><span class="eyebrow">Genome</span><p style="margin:4px 0 0">' + (c.seq === 'pending' ? 'Sample is on the sequencer.' : 'Sequenced — <span class="lnk" data-tree="' + UIesc(pid) + '">show on the genome tree</span>.') + '</p></div>';
    p.notes.forEach(function (n) { know += '<p class="note">' + (typeof n === 'string' ? UIesc(n) : UIparts(n.x || [n.text])) + '</p>'; });
    if (!know) know = '<p class="note" style="margin:6px 0 0">' + (c ? 'Nothing beyond the report yet. Interview them to learn their symptoms, when they fell ill and where they have been.' : 'Not on the line list. Test them to find out whether they are infected.') + '</p>';
    html += '<div class="eyebrow sh-sec">What we know</div>' + know;
    // actions
    var acts = UIA.actions().filter(function (a) { return a.target === 'case' ? !!c : a.target === 'person'; });
    if (died) acts = acts.filter(function (a) { return /seq|record/.test(a.id); });
    html += UIActions.targetActionsHTML(acts, pid, 'Act on ' + (c ? 'this case' : 'this person'));
    var other = docs.filter(function (m) { return m !== iv; });
    if (other.length) html += '<div class="eyebrow sh-sec">In the briefing · ' + other.length + '</div><div class="list">' + other.slice(0, 8).map(function (m) { var K = UIKINDS[m.kind] || UIKINDS.report; return UIli({ attrs: 'data-openmsg="' + UIesc(m.id) + '"', ic: UIICON[K.ic], label: UIesc(m.title), small: UIesc(K.l) + ' · ' + UIesc(UIA.dateShort(m.day)) }); }).join('') + '</div>';
    html += '<div class="ps-foot"><button class="btn sm" data-mapfocus>' + UIICON.map + 'Show on map</button></div>';
    UIsheet.open({ eyebrow: c ? 'Case ' + UIesc(p.pid) : 'Person', title: p.name, push: o.push, tag: 'person', html: html, reopen: function () { self.personSheet(pid); },
      mount: function (b) {
        UIActions.bindTargetActions(b, pid, 'person');
        b.addEventListener('click', function (e) {
          if (e.target.closest('[data-mapfocus]')) { UIsheet.close(); UIMap.focus(UIMapR.homePos(UIA.city(), pid, p.district, p.pos)); }
          var t = e.target.closest('[data-tree]'); if (t) { UIsheet.close(); UI.go('lab'); UILab.openTree(pid); }
          var m = e.target.closest('[data-openmsg]'); if (m) { UIsheet.close(); UIBrief.openMsg(m.dataset.openmsg); }
        });
      } });
    UIS.seen[pid] = 1;
  },
  timeline: function (p, c, day) {
    var ev = [];
    if (!c) return '';
    if (c.onset !== null) ev.push({ d: c.onset, l: 'Onset', c: '#ff7a45' });
    if (c.reported !== null) ev.push({ d: c.reported, l: 'Reported', c: '#8fcbff' });
    c.tests.forEach(function (t) { if (t.day !== null) ev.push({ d: t.resultDay !== null ? t.resultDay : t.day, l: t.result === 'pos' ? 'Test +' : t.result === 'pending' ? 'Test …' : t.result === 'flu' ? 'Flu' : 'Test −', c: '#3fd0aa' }); });
    if (c.admitted !== null) ev.push({ d: c.admitted, l: 'Admitted', c: '#f2b640' });
    if (c.died !== null) ev.push({ d: c.died, l: 'Died', c: '#d9d3c7' });
    if (c.exposures) c.exposures.forEach(function (e) { if (e.day !== null && e.day !== undefined) ev.push({ d: e.day, l: 'Exposed?', c: '#8ce8cf', hollow: true }); });
    if (!ev.length) return '';
    var d0 = Math.min.apply(null, ev.map(function (e) { return e.d; }).concat([day - 6])), d1 = day, W = 100;
    var x = function (d) { return 4 + (d - d0) / Math.max(1, d1 - d0) * 92; };
    ev.sort(function (a, b) { return a.d - b.d; });
    var rows = [], last = {};
    ev.forEach(function (e) { var r = 0; while (last[r] !== undefined && x(e.d) - last[r] < 17) r++; last[r] = x(e.d); e.row = r; });
    var nr = Math.max.apply(null, ev.map(function (e) { return e.row; })) + 1;
    return '<div class="tl" style="height:' + (34 + nr * 17) + 'px"><div class="tl-axis"></div>' + ev.map(function (e) {
      return '<div class="tl-ev" style="left:' + x(e.d).toFixed(1) + '%;top:' + (e.row * 17) + 'px"><i style="' + (e.hollow ? 'border:2px solid ' + e.c : 'background:' + e.c + ';box-shadow:0 0 8px ' + e.c) + '"></i><span>' + UIesc(e.l) + '</span></div>';
    }).join('') + '<div class="tl-lbl" style="left:0">' + UIesc(UIA.dateShort(d0)) + '</div><div class="tl-lbl" style="right:0">Today</div></div>';
  }
};
