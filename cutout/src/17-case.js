/* CUTOUT UI — 17-case.js: timeline, propositions (with stamping), plot hypothesis, warrants, response. */
var UICase = UI.views['case'] = {
  build: function (root) {
    root.innerHTML = '<div class="scroll" id="cs-scroll"><div class="pad" id="cs-pad"></div></div>';
    var self = this;
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]'); if (!b) return;
      var a = b.dataset.c, x = b.dataset.x;
      if (a === 'same') self.proposeSheet({ type: 'same' });
      else if (a === 'role') self.proposeSheet({ type: 'role' });
      else if (a === 'plot') self.plotSheet(x);
      else if (a === 'unfile') { if (UIA.unfile(x)) { UI.save(); self.render(); UItoast('Withdrawn'); } }
      else if (a === 'warrant') self.warrantSheet({});
      else if (a === 'resp') self.respondSheet(x);
      else if (a === 'debrief') UIDebrief.show();
      else if (a === 'night') UINight.open();
      else if (a === 'xref') { UIS.xref = !UI.xrefOn(); UI.save(); self.render(); UItoast('Cross-reference marks ' + (UIS.xref ? 'on' : 'off')); if (UI.views.desk.built) UI.views.desk._n = -1; }
    });
  },
  show: function () { this.render(); },
  refresh: function () { this.render(); },

  render: function (fresh) {
    var pad = UI$('#cs-pad'); if (!pad) return;
    fresh = fresh || [];
    var props = UIA.props();
    var html = '';
    // --- timeline
    html += '<div class="case-sec wide"><h3>The operation</h3>' + this.timelineHTML() + '</div>';
    // --- the night desk
    var N = UIA.analyst(), hs = UIA.hintStatus();
    var lastN = hs.log[hs.log.length - 1];
    html += '<div class="case-sec"><h3>The night desk</h3><div class="na-mini"><div class="na-mini-hd">' + UINight.portrait() + '<div><b>' + UIesc(N.name) + '</b><small>' + UIesc(N.title) + ' · ' + (hs.total ? 'consulted ' + hs.total + ' time' + (hs.total > 1 ? 's' : '') : 'not yet consulted') + '</small></div></div>' +
      (lastN ? '<p class="hand na-last">' + UIesc(lastN.text) + '</p>' : '<p class="na-last muted">Stuck? She has read everything on your desk and will say so, for a price: a nudge is free once a night, a pointer costs two team-hours, a straight answer costs credibility.</p>') +
      (UIA.over() ? '' : '<button class="btn small block" data-c="night">' + UIICON.lamp + ' Ask the night desk' + (hs.nudge.ok ? ' · tonight’s nudge unused' : '') + '</button>') + '</div></div>';
    // --- propositions
    var sr = props.filter(function (p) { return p.type === 'same' || p.type === 'role'; });
    var nConf = sr.filter(function (p) { return p.status === 'confirmed'; }).length;
    html += '<div class="case-sec"><h3>Propositions <span class="muted" style="letter-spacing:0;text-transform:none;font-weight:400">' + nConf + '/' + sr.length + ' confirmed</span></h3>' +
      '<p class="muted" style="font-size:12.5px;margin:-4px 0 10px">Whenever three of your filings are right, the three oldest right ones are stamped. Wrong ones are never marked.</p>' +
      '<div style="display:flex;gap:8px;margin-bottom:12px"><button class="btn small" data-c="same" style="flex:1">+ Same person</button><button class="btn small" data-c="role" style="flex:1">+ Role</button></div><div class="props">' +
      (sr.length ? sr.slice().reverse().map(function (p) { return UICase.slipHTML(p, fresh.indexOf(p.id)); }).join('') : '<p class="muted" style="font-size:13px">Nothing filed yet.</p>') + '</div></div>';
    // --- plot
    var plot = {}; props.filter(function (p) { return p.type === 'plot'; }).forEach(function (p) { plot[p.field] = p; });
    var po = UIA.plotOptions();
    function disp(field, v) {
      if (v === undefined || v === null) return null;
      var list = field === 'method' ? [] : po[field + 's'] || [];
      var m = list.filter(function (o) { return String(o.v) === String(v); })[0];
      if (field === 'date') return UIA.dateLabel(+v);
      return m ? (m.d || m.v) : String(v);
    }
    html += '<div class="case-sec"><h3>Plot hypothesis</h3><p class="muted" style="font-size:12.5px;margin:-4px 0 10px">Never confirmed. You find out on the day.</p><div class="plot">' +
      [['method', 'Method'], ['target', 'Target'], ['place', 'Place'], ['date', 'Date']].map(function (f) {
        var v = plot[f[0]] ? disp(f[0], plot[f[0]].value) : null;
        return '<button class="pv" data-c="plot" data-x="' + f[0] + '"><span class="lbl">' + f[1] + '</span><b class="' + (v ? '' : 'q') + '">' + UIesc(v || '? ? ?') + '</b></button>';
      }).join('') + '</div></div>';
    // --- warrants
    var arr = UIA.arrested();
    html += '<div class="case-sec"><h3>Warrants</h3>' + (UIA.over() ? '' : '<button class="btn small block" data-c="warrant" style="margin-bottom:12px">Request a warrant</button>') +
      (UIS.warrants.length ? UIS.warrants.slice().reverse().map(function (w) {
        return '<div class="wr"><div class="tx"><b>' + UIesc(w.name) + '</b><small>' + UIesc(UIROLE[w.role] || w.role) + ' · ' + UIesc(UIA.dateLabel(w.day)) + (w.reason ? ' · ' + UIesc(w.reason) : '') + '</small></div><span class="st ' + (w.approved ? 'ok' : 'no') + '">' + (w.approved ? 'ARRESTED' : 'REFUSED') + '</span></div>';
      }).join('') : '<p class="muted" style="font-size:13px">Cite at least two documents from different record systems that put the person in the operation. Wrong arrests cost credibility (' + UIA.credibility() + '/100).</p>') +
      (arr.length ? '<p class="muted" style="font-size:12px">In custody: ' + arr.map(function (a) { return UIesc(a.name); }).join(', ') + '</p>' : '') + '</div>';
    // --- response
    if (UIA.over()) html += '<div class="case-sec"><h3>Response</h3><p>The case is closed.</p><button class="btn primary block" data-c="debrief">Read the debrief</button></div>';
    else html += '<div class="case-sec"><h3>Response</h3><p class="muted" style="font-size:12.5px;margin:-4px 0 10px">Choosing a response ends the case. If you do nothing, the network acts on its day.</p><div class="resp">' +
      '<button class="opt" data-c="resp" data-x="arrest-only"><b>Arrest only</b><small>Execute your warrants and stand back. The act is stopped only if the operative is in a cell.</small></button>' +
      '<button class="opt" data-c="resp" data-x="protect"><b>Protect the target</b><small>Warn and move the person or object. Stops the act if you chose the right target — and lets everyone walk.</small></button>' +
      '<button class="opt" data-c="resp" data-x="trap"><b>Set a trap</b><small>Let them come, and be waiting. Right place and date catches the team in the act; the money trail decides whether the principal falls too.</small></button></div></div>';
    // --- settings
    var on = UI.xrefOn();
    html += '<div class="case-sec"><h3>Desk settings</h3><div class="set-row"><div><b>Grade</b><small>' + UIesc(UIA.level().label) + ' · ' + UIA.dayHours() + ' team-hours a day. Chosen when the file was opened.</small></div></div>' +
      '<button class="set-row" data-c="xref" role="switch" aria-checked="' + on + '"><div><b>Cross-reference marks</b><small>Mark passports, numbers, plates, accounts, firms and addresses that already appear in another of your documents.</small></div><span class="sw' + (on ? ' on' : '') + '"><i></i></span></button></div>';
    pad.innerHTML = html;
    if (fresh.length) this.stampAnim(fresh);
  },
  slipHTML: function (p, freshIdx) {
    var txt;
    if (p.type === 'same') txt = '<span class="k">Same person</span>' + UIesc(p.a) + '<br>= ' + UIesc(p.b);
    else txt = '<span class="k">Role</span>' + UIesc(p.name) + '<br>is the ' + UIesc((UIROLE[p.role] || p.role).toLowerCase());
    var conf = p.status === 'confirmed';
    var stamped = UIS.stamped[p.id];
    return '<div class="slip' + (conf ? ' conf' : '') + '" data-p="' + p.id + '" style="transform:rotate(' + (UIjit(p.id) * 0.6).toFixed(2) + 'deg)">' + txt +
      '<span class="d">' + UIesc(p.id) + ' · ' + UIesc(UIA.dateLabel(p.filedDay || 0)) + '</span>' +
      (conf ? '<span class="stamp' + (freshIdx >= 0 || !stamped ? ' new' : '') + '" style="' + (freshIdx >= 0 ? 'opacity:0' : '') + '">Confirmed</span>' : (UIA.over() ? '' : '<button class="wd" data-c="unfile" data-x="' + p.id + '">withdraw</button>')) + '</div>';
  },
  stampAnim: function (ids) {
    var pad = UI$('#cs-pad');
    ids.forEach(function (id, i) {
      var slip = pad.querySelector('.slip[data-p="' + id + '"]');
      if (!slip) return;
      var st = slip.querySelector('.stamp');
      setTimeout(function () {
        if (i === 0) slip.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 0);
      setTimeout(function () {
        st.style.opacity = ''; st.classList.remove('new'); void st.offsetWidth; st.classList.add('new');
        setTimeout(function () { slip.classList.add('shake'); UIvibe(25); setTimeout(function () { slip.classList.remove('shake'); }, 260); }, 280);
        UIS.stamped[id] = 1;
      }, 450 + i * 520);
    });
    UI.save();
  },
  /** file and, if stamps happen, show them on the CASE tab */
  fileProps: function (list) {
    var conf = [], ids = [];
    list.forEach(function (p) { var r = UIA.file(p); if (r && r.id) ids.push(r.id); if (r && r.confirmed) conf = conf.concat(r.confirmed); });
    UI.save();
    if (conf.length) {
      UItoast(conf.length + ' propositions CONFIRMED');
      if (UIS.tab !== 'case') UI.go('case');
      this.render(conf);
    } else {
      UItoast(ids.length > 1 ? ids.length + ' propositions filed' : 'Filed — no stamp yet');
      if (UIS.tab === 'case') this.render();
      if (UIS.tab === 'board') UIBoard.render();
    }
    return conf;
  },
  fileSameFor: function (names) {
    if (names.length < 2) { UItoast('Put two or more names on the card first'); return; }
    var have = UIA.props().filter(function (p) { return p.type === 'same'; });
    function filed(a, b) { return have.some(function (p) { return (p.a === a && p.b === b) || (p.a === b && p.b === a); }); }
    var list = [];
    for (var i = 1; i < names.length; i++) if (!filed(names[0], names[i])) list.push({ type: 'same', a: names[0], b: names[i] });
    if (!list.length) { UItoast('Already filed'); return; }
    this.fileProps(list);
  },
  filePlot: function (field, v, d) {
    UIA.file({ type: 'plot', field: field, value: field === 'date' ? +v : v });
    UI.save();
    UItoast('Hypothesis: ' + field + ' = ' + (field === 'date' ? UIA.dateLabel(+v) : (d || v)));
    if (UIS.tab === 'case') this.render();
  },

  nameItems: function () { return UIA.known().filter(function (k) { return k.t === 'name'; }).map(function (k) { return { v: k.v, d: k.v }; }); },

  proposeSheet: function (pre) {
    var self = this;
    var st = { type: pre.type || 'same', a: pre.a || pre.name || null, b: pre.b || null, role: pre.role || null };
    function body() {
      var h = '<div class="seg" style="margin-top:6px"><button data-t="same" class="' + (st.type === 'same' ? 'on' : '') + '">Same person</button><button data-t="role" class="' + (st.type === 'role' ? 'on' : '') + '">Role</button></div>';
      h += '<div class="field"><span class="lbl">' + (st.type === 'same' ? 'This name…' : 'The person using the name…') + '</span><div class="ac" id="pp-a"><input type="text" value="' + UIesc(st.a || '') + '" placeholder="Choose a name" autocomplete="off" spellcheck="false"><div class="ac-list"></div></div></div>';
      if (st.type === 'same') h += '<div class="field"><span class="lbl">…is the same person as</span><div class="ac" id="pp-b"><input type="text" value="' + UIesc(st.b || '') + '" placeholder="Choose a name" autocomplete="off" spellcheck="false"><div class="ac-list"></div></div></div>';
      else h += '<div class="field"><span class="lbl">…is the</span><div class="opts" id="pp-roles">' + UIA.roles().map(function (r) { return '<button class="chip' + (st.role === r ? ' on' : '') + '" data-r="' + r + '">' + UIesc(UIROLE[r] || r) + '</button>'; }).join('') + '</div></div>';
      h += '<button class="btn primary block" id="pp-go" style="margin-top:8px">File proposition</button>';
      return h;
    }
    function mount(el) {
      function valid() { return st.type === 'same' ? (st.a && st.b && st.a !== st.b) : (st.a && st.role); }
      function upd() { UI$('#pp-go', el).disabled = !valid(); }
      UI$$('.seg button', el).forEach(function (b) { b.addEventListener('click', function () { st.type = b.dataset.t; el.innerHTML = body(); mount(el); }); });
      function ac(id, key) {
        var box = UI$(id, el); if (!box) return;
        var list = box.querySelector('.ac-list');
        if (st[key]) list.hidden = true;
        UIautocomplete(box, { items: self.nameItems, max: 8, lazy: true, empty: 'No names in your documents yet.', onPick: function (it) { st[key] = it.v; box.querySelector('input').value = it.v; list.hidden = true; upd(); }, onInput: function () { list.hidden = false; st[key] = null; var v = box.querySelector('input').value.trim(); if (self.nameItems().some(function (n) { return n.v === v; })) st[key] = v; upd(); } });
        box.querySelector('input').addEventListener('focus', function () { list.hidden = false; });
      }
      ac('#pp-a', 'a'); ac('#pp-b', 'b');
      var rl = UI$('#pp-roles', el);
      if (rl) rl.addEventListener('click', function (e) { var b = e.target.closest('[data-r]'); if (!b) return; st.role = b.dataset.r; UI$$('.chip', rl).forEach(function (c) { c.classList.toggle('on', c === b); }); upd(); });
      UI$('#pp-go', el).addEventListener('click', function () {
        if (!valid()) return;
        UIsheet.close();
        self.fileProps([st.type === 'same' ? { type: 'same', a: st.a, b: st.b } : { type: 'role', name: st.a, role: st.role }]);
      });
      upd();
    }
    UIsheet.open({ title: 'File a proposition', html: body(), mount: mount });
  },

  plotSheet: function (field) {
    var self = this;
    var po = UIA.plotOptions();
    var opts = field === 'method' ? po.methods.map(function (m) { return { v: m, d: UIcap(m) }; }) : (po[field + 's'] || []).map(function (o) { return { v: o.v, d: field === 'date' ? UIA.dateLabel(+o.v) + (o.d && o.d !== UIA.dateLabel(+o.v) ? '' : '') : (o.d || o.v) }; });
    if (field === 'date') {
      var seen = {}; opts = opts.filter(function (o) { if (seen[o.v]) return false; seen[o.v] = 1; return +o.v >= UIA.day(); }).sort(function (a, b) { return a.v - b.v; });
    }
    var html = opts.length ? '<div class="sh-list">' + opts.map(function (o) { return UIitem({ act: 'pick', data: String(o.v), label: o.d }); }).join('') + '</div>' : '<p class="muted">Nothing to choose from yet — ' + (field === 'date' ? 'dates' : field + 's') + ' come from what you have read (newspaper calendars, reports).</p>';
    UIsheet.open({ title: 'Plot: ' + field, sub: field === 'date' ? 'Dates still ahead that appear in your documents' : '', html: html, mount: function (body) {
      body.addEventListener('click', function (e) { var b = e.target.closest('.sh-item'); if (!b) return; UIsheet.close(); var o = opts.filter(function (x) { return String(x.v) === b.dataset.x; })[0]; self.filePlot(field, o.v, o.d); });
    } });
  },

  warrantSheet: function (pre) {
    var self = this;
    var st = { name: pre.name || null, role: pre.role || null, docs: {} };
    function docsHTML() {
      var ds = UIA.docs().slice().reverse();
      if (st.name) ds.sort(function (a, b) { return (UIDoc.mentions(b, 'name', st.name) ? 1 : 0) - (UIDoc.mentions(a, 'name', st.name) ? 1 : 0); });
      return ds.map(function (d) {
        var m = st.name && UIDoc.mentions(d, 'name', st.name);
        return '<label><input type="checkbox" value="' + d.id + '"' + (st.docs[d.id] ? ' checked' : '') + '><span><span class="' + (m ? 'has' : '') + '">' + UIesc(d.title) + '</span><small>' + UIesc(UIDoc.sourceLabel(d)) + ' · ' + UIesc(UIA.dateLabel(d.day)) + ' · ' + UIesc(d.id) + (m ? ' · mentions the name' : '') + '</small></span></label>';
      }).join('');
    }
    var html = '<div class="field"><span class="lbl">Name</span><div class="ac" id="wr-a"><input type="text" value="' + UIesc(st.name || '') + '" placeholder="Choose a name" autocomplete="off" spellcheck="false"><div class="ac-list"' + (st.name ? ' hidden' : '') + '></div></div></div>' +
      '<div class="field"><span class="lbl">Role in the operation</span><div class="opts" id="wr-roles">' + UIA.roles().filter(function (r) { return r !== 'innocent' && r !== 'herring'; }).map(function (r) { return '<button class="chip' + (st.role === r ? ' on' : '') + '" data-r="' + r + '">' + UIesc(UIROLE[r] || r) + '</button>'; }).join('') + '</div></div>' +
      '<div class="field"><span class="lbl">Cite documents (2–4, from different systems)</span><div class="doclist" id="wr-docs">' + docsHTML() + '</div></div>' +
      '<button class="btn primary block" id="wr-go">Put it before the judge</button>';
    UIsheet.open({ title: 'Request a warrant', html: html, mount: function (el) {
      function n() { return Object.keys(st.docs).length; }
      function upd() { var b = UI$('#wr-go', el); b.disabled = !(st.name && st.role && n() >= 2); b.textContent = n() ? 'Put it before the judge (' + n() + ' cited)' : 'Put it before the judge'; }
      var box = UI$('#wr-a', el);
      UIautocomplete(box, { items: self.nameItems, max: 8, lazy: true, onPick: function (it) { st.name = it.v; box.querySelector('input').value = it.v; box.querySelector('.ac-list').hidden = true; UI$('#wr-docs', el).innerHTML = docsHTML(); upd(); }, onInput: function () { box.querySelector('.ac-list').hidden = false; st.name = null; upd(); } });
      box.querySelector('input').addEventListener('focus', function () { box.querySelector('.ac-list').hidden = false; });
      UI$('#wr-roles', el).addEventListener('click', function (e) { var b = e.target.closest('[data-r]'); if (!b) return; st.role = b.dataset.r; UI$$('#wr-roles .chip', el).forEach(function (c) { c.classList.toggle('on', c === b); }); upd(); });
      UI$('#wr-docs', el).addEventListener('change', function (e) {
        var c = e.target; if (c.checked) { if (n() >= 4) { c.checked = false; UItoast('Four documents at most'); return; } st.docs[c.value] = 1; } else delete st.docs[c.value]; upd();
      });
      UI$('#wr-go', el).addEventListener('click', function () {
        var cited = Object.keys(st.docs);
        var r = UIA.warrant({ name: st.name, role: st.role, citedDocIds: cited });
        UIS.warrants.push({ name: st.name, role: st.role, cited: cited, approved: !!r.approved, reason: r.reason || null, day: UIA.day() });
        UI.save();
        self.warrantResult(r, st);
      });
      upd();
    } });
  },
  warrantResult: function (r, st) {
    var html = '<div class="paper d-memo" style="margin:6px 0 14px;min-height:130px"><div class="mh"><b>Examining magistrate</b><span class="classif">Order</span></div><p class="typed">Application for arrest of <b>' + UIesc(st.name) + '</b> as ' + UIesc((UIROLE[st.role] || st.role).toLowerCase()) + '.</p><p class="typed">' + (r.approved ? 'Granted. The subject has been detained.' : 'Refused: ' + UIesc(r.reason || 'no reason given') + '.' + (r.credibilityLost ? ' The magistrate has made a note of your name.' : '')) + '</p><div class="stamp' + (r.approved ? ' green' : '') + ' new" style="right:14px;top:auto;bottom:14px;animation:stampdown .5s cubic-bezier(.3,1.6,.5,1) both">' + (r.approved ? 'Granted' : 'Refused') + '</div></div>' +
      (r.approved && r.statement ? '<button class="btn primary block" id="wr-st">Read the statement</button>' : '<button class="btn block" id="wr-ok">Back to the case</button>');
    UIsheet.open({ title: r.approved ? 'Warrant granted' : 'Warrant refused', html: html, mount: function (el) {
      UIvibe(30);
      var b = UI$('#wr-st', el); if (b) b.addEventListener('click', function () { UIsheet.close(); UI.go('desk', { open: r.statement.id }); });
      var o = UI$('#wr-ok', el); if (o) o.addEventListener('click', function () { UIsheet.close(); });
    }, onClose: function () { UI.refresh(); } });
    UI.badges();
  },

  respondSheet: function (type) {
    var self = this;
    var po = UIA.plotOptions();
    var plot = {}; UIA.props().filter(function (p) { return p.type === 'plot'; }).forEach(function (p) { plot[p.field] = p.value; });
    var st = { type: type, method: plot.method || null, target: plot.target || null, place: plot.place || null, date: plot.date !== undefined ? plot.date : null };
    function sel(field, list, disp) {
      return '<div class="field"><span class="lbl">' + UIcap(field) + '</span><select data-f="' + field + '"><option value="">— choose —</option>' + list.map(function (o) { var v = typeof o === 'string' ? o : o.v; return '<option value="' + UIesc(v) + '"' + (String(st[field]) === String(v) ? ' selected' : '') + '>' + UIesc(disp ? disp(o) : (o.d || o.v || o)) + '</option>'; }).join('') + '</select></div>';
    }
    var html = '', title = '';
    var dates = (po.dates || []).filter(function (o) { return +o.v >= UIA.day(); });
    var seen = {}; dates = dates.filter(function (o) { if (seen[o.v]) return false; seen[o.v] = 1; return true; }).sort(function (a, b) { return a.v - b.v; });
    if (type === 'arrest-only') { title = 'Arrest only'; html = '<p style="color:var(--ui2)">' + UIA.arrested().length + ' in custody. Nobody else is touched; the network does what it does.</p>'; }
    else if (type === 'protect') { title = 'Protect the target'; html = sel('target', po.targets || []); }
    else { title = 'Set a trap'; html = sel('method', po.methods || [], function (m) { return UIcap(m); }) + sel('target', po.targets || []) + sel('place', po.places || []) + sel('date', dates, function (o) { return UIA.dateLabel(+o.v); }); }
    html += '<p class="muted" style="font-size:12.5px">This closes the case. There is no second chance.</p><button class="btn danger block" id="rs-go">Commit — close the case</button>';
    UIsheet.open({ title: title, html: html, mount: function (el) {
      function upd() {
        var ok = type === 'arrest-only' || (type === 'protect' ? !!st.target : (st.method && st.target && st.place && st.date !== null && st.date !== ''));
        UI$('#rs-go', el).disabled = !ok;
      }
      UI$$('select', el).forEach(function (s) { s.addEventListener('change', function () { st[s.dataset.f] = s.value || null; upd(); }); });
      UI$('#rs-go', el).addEventListener('click', function () {
        var r = type === 'arrest-only' ? { type: type } : type === 'protect' ? { type: type, target: st.target } : { type: type, method: st.method, target: st.target, place: st.place, date: +st.date };
        UIA.respond(r);
        UI.save();
        UIsheet.close();
        UIDebrief.show();
      });
      upd();
    } });
  },

  timelineHTML: function () {
    var tl = UIA.timeline();
    var today = UIA.day();
    var all = []; tl.forEach(function (p) { all = all.concat(p.days); });
    var lo = Math.min.apply(null, all.concat([today - 6, -3])), hi = Math.max.apply(null, all.concat([today + 6]));
    var span = hi - lo + 1;
    var dw = 'calc(100% / ' + span + ')';
    var pct = function (d) { return ((d - lo) / span * 100).toFixed(2) + '%'; };
    var h = '<div class="tl">';
    tl.forEach(function (p) {
      var known = p.known && p.days.length;
      var range = known ? (p.days.length > 1 ? UIA.dateLabel(p.days[0]).replace(/^\w+ /, '') + ' – ' + UIA.dateLabel(p.days[p.days.length - 1]).replace(/^\w+ /, '') : UIA.dateLabel(p.days[0])) : 'dates unknown';
      h += '<div class="tl-row"><div class="ph">' + UIesc(p.label) + '<small>' + UIesc(range) + '</small></div><div class="tl-track" style="--dw:' + dw + '">';
      if (known) {
        var a = p.days[0], b = p.days[p.days.length - 1];
        h += '<div class="tl-bar" style="left:' + pct(a) + ';width:calc(' + ((b - a + 1) / span * 100).toFixed(2) + '% - 2px)"></div>';
        p.days.forEach(function (d) { h += '<i style="position:absolute;top:0;bottom:0;left:calc(' + pct(d) + ' + ' + (50 / span).toFixed(2) + '%);width:2px;background:rgba(40,30,10,.6)"></i>'; });
      } else h += '<div class="tl-q">' + (p.phase === 'act' ? 'D-DAY ?' : '? ? ?') + '</div>';
      h += '<div class="tl-today" style="left:calc(' + pct(today) + ' + ' + (50 / span).toFixed(2) + '%)"></div></div></div>';
    });
    h += '<div class="tl-axis"><div></div><div><span>' + UIesc(UIA.dateLabel(lo).replace(/^\w+ /, '')) + '</span><span class="td" style="left:calc(' + pct(today) + ' + ' + (50 / span).toFixed(2) + '%)">today</span><span>' + UIesc(UIA.dateLabel(hi).replace(/^\w+ /, '')) + '</span></div></div></div>';
    return h;
  }
};
