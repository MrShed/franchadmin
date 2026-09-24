/* CUTOUT UI — 18-debrief.js: outcome + step-by-step replay of the true operation. */
var UIDebrief = {
  timer: null,
  show: function () {
    UIsheet.close();
    var d = UIA.debrief();
    var o = d.outcome || UIA.outcome() || {};
    var root = UI$('#debrief');
    UI$('#game').hidden = true; root.hidden = false; UI$('#title').hidden = true;
    var plotMine = {}; UIA.props().filter(function (p) { return p.type === 'plot'; }).forEach(function (p) { plotMine[p.field] = p.value; });
    var P = d.plot || {};
    function cmp(field, truth, disp) {
      var mine = plotMine[field];
      var ok = mine !== undefined && String(mine) === String(truth);
      return '<div><small>' + field + '</small><b style="font-size:15px">' + UIesc(disp || truth) + '</b><span style="font:12px var(--f-type);color:' + (ok ? 'var(--ok)' : '#8a3a2a') + '">' + (mine === undefined ? 'you filed nothing' : ok ? '✓ your hypothesis' : '✗ you had ' + UIesc(field === 'date' ? UIA.dateLabel(+mine) : String(mine).split(',')[0])) + '</span></div>';
    }
    var html = '<div class="db-wrap">';
    html += '<div class="db-hero"><div class="lbl" style="color:#6e6453">Case closed · ' + UIesc(UIA.dateLong(UIA.day())) + '</div><h2>' + (o.prevented ? 'Operation prevented' : 'The act went ahead') + '</h2>' +
      '<div class="stamp' + (o.prevented ? ' green' : '') + '">' + (o.prevented ? 'Prevented' : 'Failed') + '</div>' +
      '<p>' + UIesc(o.summary || o.how || '') + '</p>' +
      '<div class="db-score">' + (o.scoreLines || []).map(function (s) { return '<div><small>' + UIesc(s.label) + '</small><b>' + (s.pts > 0 ? '+' : '') + s.pts + '</b></div>'; }).join('') + '<div><small>Score</small><b>' + (o.score || 0) + '</b></div></div></div>';
    html += '<div class="case-sec"><h3>What they planned</h3><div class="db-hero" style="padding:14px 16px;margin-bottom:0"><div class="db-score" style="margin:0">' +
      cmp('method', P.method, UIcap(P.method || '')) + cmp('target', P.target) + cmp('place', P.place, String(P.place || '').split(',')[0]) + cmp('date', P.date, P.dateLabel || UIA.dateLabel(P.date)) + '</div></div></div>';
    html += '<div class="case-sec"><h3>The network</h3><div class="db-cast">' + (d.network || []).map(function (p) {
      return '<div class="p"><div class="r">' + UIesc(UIROLE[p.role] || p.role) + (p.arrested ? ' · <span style="color:#8fd49b">arrested</span>' : '') + '</div><b>' + UIesc(p.realName) + '</b><small>' + (p.aliases && p.aliases.length ? 'alias ' + p.aliases.map(UIesc).join(', ') : 'no aliases') + '</small>' + (p.seenNames ? '<small>you saw: ' + (p.seenNames.length ? p.seenNames.map(UIesc).join(', ') : 'nothing') + '</small>' : '') + '</div>';
    }).join('') + '</div>';
    var bys = [].concat((d.innocents || []).map(function (x) { return x.name + ' (innocent' + (x.kind && x.kind !== 'innocent' ? ', ' + x.kind : '') + ')'; }), (d.herrings || []).map(function (x) { return x.name + ' (unrelated smuggler' + (x.link ? ' — ' + x.link : '') + ')'; }));
    if (bys.length) html += '<p class="muted" style="font-size:13px;margin-top:-10px">Bystanders: ' + bys.map(UIesc).join('; ') + '</p>';
    html += '</div>';
    var tl = d.timeline || [];
    var nSeen = tl.filter(function (s) { return s.seen; }).length;
    html += '<div class="case-sec"><h3>Replay · ' + nSeen + ' of ' + tl.length + ' steps left a trace you saw</h3><div id="db-steps">' + tl.map(function (s, i) {
      return '<div class="db-step"><div class="db-day">' + UIesc((s.dateLabel || '').replace(/^\w+ /, '')) + '<small>' + UIesc((s.dateLabel || '').split(' ')[0]) + '</small></div><div class="db-body" data-i="' + i + '"><div class="ph">' + UIesc(s.phase) + ' · ' + UIesc(s.kind) + '</div><div class="what" style="color:' + (s.seen ? 'var(--ui)' : 'var(--ui2)') + '">' + UIesc(s.text) + '</div><div class="db-tr">' +
        (s.traces && s.traces.length ? s.traces.map(function (t) { return '<span class="' + (t.seen ? 'f' : '') + '">' + UIesc(t.sys) + '</span>'; }).join('') : '<span>no trace</span>') + '</div></div></div>';
    }).join('') + '</div></div>';
    if (d.stats) html += '<p class="muted" style="font-size:12.5px">' + Object.keys(d.stats).map(function (k) { return UIesc(k) + ': ' + UIesc(d.stats[k]); }).join(' · ') + '</p>';
    html += '<div class="db-ctrl"><button class="btn" id="db-skip">Show all</button><button class="btn" id="db-files">Case files</button><button class="btn primary" id="db-new">New case</button></div></div>';
    root.innerHTML = html;
    root.scrollTop = 0;
    var bodies = UI$$('.db-body', root), i = 0;
    clearInterval(this.timer);
    var self = this;
    this.timer = setInterval(function () {
      if (i >= bodies.length) { clearInterval(self.timer); return; }
      bodies[i].classList.add('in'); i++;
    }, 260);
    UI$('#db-skip').addEventListener('click', function () { clearInterval(self.timer); bodies.forEach(function (b) { b.classList.add('in'); }); });
    UI$('#db-files').addEventListener('click', function () { clearInterval(self.timer); root.hidden = true; UI$('#game').hidden = false; UI.go('case'); UI.refresh(); });
    UI$('#db-new').addEventListener('click', function () { clearInterval(self.timer); UIA.clearSave(); UIBoot.title(); });
  }
};
