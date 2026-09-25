/* DEPTH UI — 22-debrief.js: the end-of-case debrief. The outcome stamped on
 * the file, the true ring drawn out with who was caught, the operation card
 * revealed, the numbers, and every message in clear. */
var UIDebrief = (function () {
  var D = {};
  D.show = function () {
    UIRx.stopAll(); UIsheet.close(); if (UICoach.active()) UICoach.stop();
    var d = UIA.debrief(), o = d.outcome || {}, win = o.win !== undefined ? !!o.win : o.kind === 'stopped';
    UI.save();
    var root = UI$('#debrief');
    UI$('#game').hidden = true; root.hidden = false;
    UIAudio.cue(win ? 'win' : 'lose');
    var st = d.stats || {}, sc = d.score || {};
    var mem = d.ring.members, ctl = d.ring.controller;
    root.innerHTML = '<div class="db"><div class="db-doc paper">' +
      '<header class="db-h"><span class="eyebrow">Station Kestrel · case report · ' + UIesc(UIA.gradeId()) + ' grade</span><h1>' + UIesc(o.title || (win ? 'Operation stopped' : 'The operation went ahead')) + '</h1>' +
      '<span class="db-stamp ' + (win ? 'ok' : 'bad') + '">' + (win ? 'Case closed' : 'Case lost') + '</span><p class="db-lede">' + UIesc(o.text || '') + '</p>' +
      (sc.total !== null && sc.total !== undefined ? '<div class="db-score"><b>' + Math.round(sc.total) + '</b><span>' + UIesc(sc.grade || 'points') + '</span></div>' : '') + '</header>' +
      '<section class="db-sec"><h2>The operation</h2><div class="db-op">' +
        '<div><span>Codeword</span><b>' + UIesc(d.op.codeword || '—') + '</b></div><div><span>What</span><b>' + UIesc(d.op.what) + '</b></div><div><span>Where</span><b>' + UIesc(d.op.whereName) + '</b></div><div><span>When</span><b>' + UIesc(d.op.when) + '</b></div><div><span>Who</span><b>' + UIesc(d.op.who) + (d.op.whoName ? ' · ' + UIesc(d.op.whoName) : '') + '</b></div></div></section>' +
      '<section class="db-sec"><h2>The ring</h2>' + ringSvg(d) +
        '<div class="db-mem">' + mem.map(function (m) { return '<div class="dm' + (m.arrested ? ' caught' : '') + '"><b>' + UIesc(m.callsign) + '</b><span>' + UIesc(m.name) + '</span><small>' + UIesc(UIcap(m.role)) + (m.job ? ' · ' + UIesc(m.job) : '') + '</small><small>' + UIesc(m.address) + (m.how ? ' · sends ' + UIesc({ home: 'from home', room: 'from a rented room', mobile: 'from a vehicle', van: 'from a vehicle' }[m.how] || 'from ' + m.how) : '') + '</small>' + (m.executor ? '<em>was to carry it out</em>' : '') + (m.arrested ? '<i class="dm-st">Arrested</i>' : '') + '</div>'; }).join('') + '</div></section>' +
      '<section class="db-sec"><h2>The night’s work</h2><div class="db-stats">' +
        stat(st.copied, 'transmissions copied') + stat(st.decryptedRight !== undefined ? st.decryptedRight : st.decrypts, 'messages read') + stat(st.arrests !== undefined ? st.arrests : st.caught, 'arrests') + stat(st.warrantsUsed, 'warrants used') + stat(st.warrantsWasted, 'warrants wasted') + stat(st.dfs, 'DF requests') + '</div></section>' +
      '<section class="db-sec"><h2>The traffic, in clear</h2><div class="db-pt">' + d.plaintexts.map(function (p) {
        var s = p.decrypted === 'right' ? '<span class="vstamp ok">Read</span>' : p.decrypted === 'partial' ? '<span class="vstamp part">Partly</span>' : p.heard ? '<span class="vstamp">Copied</span>' : '<span class="vstamp dim">Not heard</span>';
        return '<div class="pt"><div class="pt-h"><b>' + UIesc(p.from) + ' → ' + UIesc(p.to) + '</b>' + (p.night !== null ? '<small>night ' + (p.night + 1) + '</small>' : '') + (p.kind ? '<small>' + UIesc(p.kind) + '</small>' : '') + (p.depthWith.length ? '<small class="dw">depth</small>' : '') + s + '</div><p>' + UIesc(p.text) + '</p></div>';
      }).join('') + '</div></section>' +
      '<footer class="db-f"><button class="btn pri" id="db-new">' + UIICON.play + 'Another case</button><button class="btn" id="db-title">Title screen</button></footer>' +
      '</div></div>';
    UI$('#db-new').addEventListener('click', function () { UIA.clearSave(); UIBoot.title(); });
    UI$('#db-title').addEventListener('click', function () { UIBoot.title(); });
    root.scrollTop = 0;
    UI.emit('debrief', o.kind);
  };
  function stat(v, l) { return v === undefined || v === null ? '' : '<div><b>' + v + '</b><span>' + l + '</span></div>'; }
  function ringSvg(d) {
    var nar = window.innerWidth < 600, W = nar ? 380 : 720, H = nar ? 300 : 300, mem = d.ring.members, ctl = d.ring.controller, pos = {}, bw = nar ? 76 : 120;
    var res = mem.filter(function (m) { return /resident/i.test(m.role); }), rest = mem.filter(function (m) { return !/resident/i.test(m.role); });
    if (ctl) pos[ctl.callsign] = [W / 2, 40];
    res.forEach(function (m, i) { pos[m.callsign] = [W / 2 + (i - (res.length - 1) / 2) * 160, 140]; });
    rest.forEach(function (m, i) { var n = rest.length, row = nar && n > 3 ? i % 2 : 0; pos[m.callsign] = [bw / 2 + 6 + (W - bw - 12) * (n === 1 ? 0.5 : i / (n - 1)), 236 + row * 50]; });
    var s = '<svg class="db-ring" viewBox="0 0 ' + W + ' ' + H + '">';
    d.ring.links.forEach(function (l) { var a = pos[l.a], b = pos[l.b]; if (!a || !b) return; s += '<line x1="' + a[0] + '" y1="' + (a[1] + 16) + '" x2="' + b[0] + '" y2="' + (b[1] - 16) + '"/>'; });
    Object.keys(pos).forEach(function (cs) {
      var p = pos[cs], m = mem.filter(function (x) { return x.callsign === cs; })[0];
      s += '<g transform="translate(' + p[0] + ',' + p[1] + ')" class="' + (m && m.arrested ? 'caught' : '') + (m && m.executor ? ' exec' : '') + '"><rect x="' + (-bw / 2) + '" y="-20" width="' + bw + '" height="40" rx="2"/><text y="' + (m ? 1 : 6) + '">' + UIesc(cs) + '</text>' + (m ? '<text class="nm" y="15">' + UIesc(m.name.split(' ').slice(-1)[0]) + '</text>' : '') + (m && m.arrested ? '<path class="x" d="M' + (-bw / 2 + 4) + ' -16L' + (bw / 2 - 4) + ' 16M' + (bw / 2 - 4) + ' -16L' + (-bw / 2 + 4) + ' 16"/>' : '') + '</g>';
    });
    return s + '</svg>';
  }
  return D;
})();
