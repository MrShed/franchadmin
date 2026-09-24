/* CUTOUT UI — 17-night.js: the night desk (hint system). The analyst's
 * knowledge comes from the engine (08-analyst.js) via UIA.hint(); this file
 * only presents it and turns her references into buttons. */
var UINight = {
  armed: null,
  /** a portrait sketch in pencil, in keeping with the file cards */
  portrait: function () {
    return '<svg class="na-face" viewBox="0 0 64 72" fill="none" stroke="#4a4439" stroke-width="1.4" stroke-linecap="round"><path d="M18 30c0-11 6-18 14-18s14 7 14 18c0 10-6 19-14 19s-14-9-14-19z"/><path d="M17 28c2-12 9-19 17-18 7 1 12 6 13 13-5-3-10-8-12-12-3 6-10 11-18 17z" fill="#6e695f" stroke="none" opacity=".55"/>' +
      '<circle cx="26" cy="31" r="4"/><circle cx="38" cy="31" r="4"/><path d="M30 31h4M22 31l-4-1M42 31l4-1"/><path d="M29 41c2 1 4 1 6 0"/><path d="M10 72c1-12 10-18 22-18s21 6 22 18"/><path d="M40 43l12 3" stroke-width="2"/><path d="M53 45c2-3 0-6 2-9M55 44c3-4 1-8 4-11" stroke="#8a8474" stroke-width="1"/></svg>';
  },
  tierHTML: function () {
    var st = UIA.hintStatus();
    var N = UIA.analyst();
    var arm = this.armed;
    function item(tier, ic, label, small, cost) {
      var s = st[tier];
      var dis = !s.ok;
      var armed = arm === tier;
      return '<button class="sh-item na-tier' + (dis ? ' dis' : '') + (armed ? ' armed' : '') + '" data-tier="' + tier + '"' + (dis ? ' disabled' : '') + '><span class="ic">' + ic + '</span><span class="tx"><b>' + UIesc(armed ? 'Tap again to ask — ' + label.toLowerCase() : label) + '</b><small>' + UIesc(dis ? s.why : small) + '</small></span><span class="cost">' + UIesc(cost) + '</span></button>';
    }
    return '<div class="sh-list">' +
      item('nudge', '?', 'A nudge', 'She points at a paper worth reading again. One a night.', st.nudge.ok ? 'free' : 'used') +
      item('pointer', '→', 'A pointer', 'She names the next record worth pulling, from a key you already hold.', N.costs.pointer + 'h') +
      item('direct', '!', 'A straight answer', 'One true deduction you have not filed yet. The magistrate hears about it.', '−' + N.costs.direct + ' cred') +
      '</div>';
  },
  noteHTML: function (e, fresh) {
    var r = e.refs || {};
    var btns = '';
    (r.docs || []).forEach(function (id) { var d = UIA.doc(id); if (d) btns += '<button class="btn small" data-na="doc" data-x="' + UIesc(id) + '">Open ' + UIesc(d.title.length > 34 ? d.title.slice(0, 32) + '…' : d.title) + '</button>'; });
    if (r.pull && !UIA.over()) {
      var q = UIS.queries.some(function (x) { return x.sys === r.pull.sys && x.day === UIA.day() && x.k === (r.pull.key.t === 'hotel+date' ? 'hotel+date:' + r.pull.key.hotel + '|' + r.pull.key.date : r.pull.key.t + ':' + r.pull.key.v); });
      if (!q && e.day === UIA.day()) btns += '<button class="btn small primary" data-na="pull" data-x="' + e.n + '"' + (UIA.hoursLeft() < r.pull.cost ? ' disabled' : '') + '>Pull it now — ' + r.pull.cost + 'h</button>';
    }
    if (r.prop && !UIA.over() && !this.propFiled(r.prop)) btns += '<button class="btn small primary" data-na="file" data-x="' + e.n + '">File it</button>';
    return '<div class="na-note' + (fresh ? ' fresh' : '') + '" style="transform:rotate(' + (UIjit('na' + e.n) * 0.7).toFixed(2) + 'deg)"><div class="na-meta">' + UIesc(UIA.dateLabel(e.day)) + ' · ' + UIesc(e.time || '') + ' · ' + UIesc({ nudge: 'nudge', pointer: 'pointer', direct: 'straight answer' }[e.tier] || e.tier) + '</div><p class="hand">' + UIesc(e.text) + '</p><span class="na-sig">— I.K.</span>' + (btns ? '<div class="na-btns">' + btns + '</div>' : '') + '</div>';
  },
  propFiled: function (p) {
    return UIA.props().some(function (q) {
      if (p.type === 'same') return q.type === 'same' && ((q.a === p.a && q.b === p.b) || (q.a === p.b && q.b === p.a));
      if (p.type === 'role') return q.type === 'role' && q.name === p.name && q.role === p.role;
      return q.type === 'plot' && q.field === p.field && String(q.value) === String(p.value);
    });
  },
  body: function (reply) {
    var N = UIA.analyst();
    var st = UIA.hintStatus();
    var h = '<div class="na-card">' + this.portrait() + '<div><b>' + UIesc(N.name) + '</b><small>' + UIesc(N.title) + '</small><p>' + UIesc(N.bio) + '</p></div></div>';
    if (reply) h += reply.ok ? this.noteHTML(reply.entry, true) : '<div class="na-note na-no"><p class="hand">' + UIesc(reply.text) + '</p><span class="na-sig">— I.K.</span>' + (reply.empty && !UIA.over() ? '<div class="na-btns"><button class="btn small primary" data-na="end">End the day</button></div>' : '') + '</div>';
    h += '<div class="lbl sh-sec">Ask her for</div><div class="na-tiers">' + this.tierHTML() + '</div>';
    var log = st.log.slice().reverse().filter(function (e) { return !reply || !reply.ok || e.n !== reply.entry.n; });
    var self = this;
    if (log.length) h += '<div class="lbl sh-sec">Her earlier notes · ' + st.total + ' in all</div>' + log.slice(0, 12).map(function (e) { return self.noteHTML(e, false); }).join('');
    else if (!reply) h += '<p class="muted" style="font-size:12.5px;margin:10px 2px 0">Every note she writes goes in the file, and in your debrief. Nudges cost 2 points at the end, pointers 5, straight answers 10.</p>';
    return h;
  },
  open: function (reply) {
    if (!UIA.cs) return;
    var self = this;
    this.armed = null;
    UIsheet.open({ title: 'The night desk', sub: UIA.over() ? 'Case closed' : UIA.hoursLeft() + ' team-hours left · credibility ' + UIA.credibility(), html: this.body(reply), mount: function (el) { self.bind(el); } });
  },
  rerender: function (el, reply) {
    el.innerHTML = this.body(reply);
    var sub = UI$('#sheet .sh-head .sub'); if (sub) sub.textContent = UIA.over() ? 'Case closed' : UIA.hoursLeft() + ' team-hours left · credibility ' + UIA.credibility();
    el.scrollTop = 0;
  },
  entry: function (n) { return UIA.hintStatus().log.filter(function (e) { return String(e.n) === String(n); })[0]; },
  bind: function (el) {
    var self = this;
    el.addEventListener('click', function (e) {
      var t = e.target.closest('.na-tier');
      if (t && !t.disabled) {
        var tier = t.dataset.tier;
        // a straight answer costs credibility: ask twice
        if (tier === 'direct' && self.armed !== 'direct') { self.armed = 'direct'; var tl = el.querySelector('.na-tiers'); if (tl) tl.innerHTML = self.tierHTML(); return; }
        self.armed = null;
        var r = UIA.hint(tier);
        UI.save(); UI.topbar();
        if (r.ok) UIvibe(12);
        self.rerender(el, r);
        if (UIS.tab === 'case') UICase.render();
        return;
      }
      var b = e.target.closest('[data-na]'); if (!b || b.disabled) return;
      var a = b.dataset.na, x = b.dataset.x;
      if (a === 'doc') { UIsheet.close(); UI.go('desk', { open: x }); }
      else if (a === 'end') { UIsheet.close(); UI.confirmEndDay(); }
      else if (a === 'pull') { var en = self.entry(x); if (!en) return; UIsheet.close(); UI.runQuery(en.refs.pull.sys, en.refs.pull.key); }
      else if (a === 'file') {
        var en2 = self.entry(x); if (!en2) return;
        var p = en2.refs.prop;
        UIsheet.close();
        if (p.type === 'plot') UICase.filePlot(p.field, p.value, p.label);
        else UICase.fileProps([p]);
      }
    });
  }
};
