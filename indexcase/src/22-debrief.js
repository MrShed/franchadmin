/* INDEX CASE UI — 22-debrief.js: the end. The true disease card against your
 * estimates, you versus the ghost city, the outbreak replayed on the map, the
 * transmission tree, the origin, the costs — and the people who died. */
var UIDebrief = {
  show: function () {
    UIsheet.close(); UICoach.stop();
    var root = UI$('#debrief'), D = UIA.debriefN();
    UI$('#game').hidden = true; UI$('#title').hidden = true; root.hidden = false;
    var city = UIA.city(), day = UIA.day();
    var OUT = { contained: ['Contained', 'The chains of transmission broke. The city never knew how close it came.'], vaccine: ['The vaccine arrived', 'You held on until the city could be protected.'], timeout: ['Six months on', 'The outbreak outlasted the emergency. Here is what it cost.'], collapse: ['Overwhelmed', 'The hospital could not hold. What follows is what happened.'], resigned: ['Stood down', 'You stepped away before the end. Here is what happened.'] };
    var oc = D.outcome || { kind: 'resigned' }, o = OUT[oc.kind] || [UIcap(oc.kind || 'The end'), ''];
    if (oc.title) o = [oc.title, oc.text || o[1]];
    var sc = Math.round(D.scale || 1);
    var html = '<div class="db"><canvas class="db-bg" id="db-bg"></canvas><div class="db-in">' +
      '<header class="db-hero"><div class="eyebrow em">' + UIesc(city.name) + ' · ' + (day + 1) + ' days · ' + UIesc((UIA.grades().filter(function (g) { return g.id === UIA.grade; })[0] || { label: '' }).label) + '</div><h1>' + UIesc(o[0]) + '</h1><p>' + UIesc(o[1]) + '</p>' +
      '<div class="db-big"><div><b style="color:var(--bone)">' + UIfmt.n(D.totals.deaths) + '</b><span>died</span></div><div><b style="color:var(--ghost)">' + UIfmt.n(D.totals.ghostDeaths) + '</b><span>would have died in the ghost city</span></div><div><b style="color:var(--ember)">' + UIfmt.n(D.totals.infections) + '</b><span>infected · ≈' + UIfmt.n(D.totals.infections * sc) + ' city-wide</span></div>' + (D.score && (D.score.total !== null || D.score.grade) ? (function () { var gr = D.score.grade && String(D.score.grade).length <= 3 ? D.score.grade : null; return '<div><b>' + UIesc(gr || UIfmt.n(D.score.total)) + '</b><span>' + (gr && D.score.total !== null ? UIfmt.n(D.score.total) + ' points' : 'points') + '</span></div>'; })() : '') + '</div>' +
      (D.totals.ghostDeaths > D.totals.deaths ? '<p class="db-saved">' + UIfmt.n(D.totals.ghostDeaths - D.totals.deaths) + ' fewer deaths than if nobody had acted.</p>' : '') +
      (D.score && D.score.lines && D.score.lines.length ? '<div class="db-score">' + D.score.lines.map(function (l) { return '<div><span>' + UIesc(l.label) + '</span><b>' + UIesc(l.pts !== undefined ? l.pts : l.value) + '</b></div>'; }).join('') + '</div>' : '') + '</header>';
    // pathogen card
    html += '<section class="db-sec"><div class="eyebrow">The truth</div><h2>' + UIesc(D.agentName) + '</h2><div class="pc" id="pc"><div class="pc-hero">' + UIvirion(D.agentName) + '<div class="pc-id"><span>Specimen · revealed</span><b>' + UIesc(D.agentName) + '</b><em>' + UIesc(city.name) + ' · day ' + (day + 1) + '</em></div></div><div class="pc-head"><span>The truth</span><span>You published</span><span></span></div>' + D.traits.map(function (t, i) {
      var v = t.verdict;
      return '<div class="pc-r" style="--i:' + i + '"><span class="pc-l">' + UIesc(t.label) + '</span><span class="pc-t">' + UIesc(t.truth) + '</span><span class="pc-y ' + v + '">' + (t.yours !== null ? UIesc(t.yours) + (t.day !== null ? '<small>' + UIesc(UIA.dateShort(t.day)) + '</small>' : '') : '<em>not published</em>') + '</span><span class="pc-m ' + v + '">' + (v === 'good' ? UIICON.check : v === 'near' ? '~' : v === 'off' ? UIICON.close : '—') + '</span></div>';
    }).join('') + '</div>' + (D.symptoms.length ? '<div class="pc-sym"><span class="eyebrow">Symptoms' + (D.tell ? ' · the tell: ' + UIesc(String(D.tell).replace(/_/g, ' ')) : '') + '</span>' + D.symptoms.map(function (s) { return '<span>' + UIesc(String(s[0]).replace(/_/g, ' ')) + (s[1] !== undefined && s[1] !== null ? ' <b>' + UIfmt.pct(s[1] > 1 ? s[1] / 100 : s[1]) + '</b>' : '') + '</span>'; }).join('') + '</div>' : '') + '</section>';
    // curves
    html += '<section class="db-sec"><div class="eyebrow">Lives</div><h2>You and the ghost city</h2><p class="dim">The ghost city is the same city, the same disease, the same first infections — and nobody acting at all.</p>' +
      '<div class="card chart-card"><div class="card-h"><div class="t"><div class="eyebrow">New infections per day</div><h3>Infections</h3></div></div><div class="card-b"><div class="ch-host" id="db-c1"></div><div class="legend"><span><i style="background:#ff7a45"></i>Your city</span><span><i style="background:#7d93aa"></i>Ghost city</span></div></div></div>' +
      '<div class="card chart-card"><div class="card-h"><div class="t"><div class="eyebrow">Cumulative</div><h3>Deaths</h3></div></div><div class="card-b"><div class="ch-host" id="db-c2"></div><div class="legend"><span><i style="background:#d9d3c7"></i>Your city</span><span><i style="background:#7d93aa"></i>Ghost city</span></div></div></div></section>';
    // replay
    html += '<section class="db-sec"><div class="eyebrow">Replay</div><h2>How it moved</h2><div class="rp"><div class="rp-cv" id="rp-cv"></div><div class="rp-day" id="rp-day"></div></div><div class="rp-ctl"><button class="ibtn rp-play" id="rp-play" aria-label="Play">' + UIICON.play + '</button><input type="range" id="rp-s" min="0" max="1" value="0" aria-label="Day"><span class="rp-n" id="rp-n"></span></div><p class="note">Every infection, true and hidden. Lines show who infected whom in the last few days.</p></section>';
    // tree
    html += '<section class="db-sec"><div class="eyebrow">Every link</div><h2>The transmission tree</h2><div class="tt"><div class="tt-cv" id="tt-cv"></div><div class="tt-info" id="tt-info">Pinch to zoom · tap a person</div></div><div class="legend" id="tt-leg"></div></section>';
    // origin
    if (D.origin) html += '<section class="db-sec"><div class="eyebrow">Origin</div><h2>Where it began</h2><div class="card pad"><dl class="kv"><dt>Source</dt><dd>' + UIesc(UIcap(D.origin.source || '—')) + (D.origin.yourSource ? ' <span class="muted">· you said ' + UIesc(D.origin.yourSource) + '</span>' : '') + '</dd>' + (D.origin.name ? '<dt>First infected</dt><dd>' + UIesc(D.origin.name) + (D.origin.day !== null ? ' · ' + UIesc(UIA.dateLabel(D.origin.day)) : '') + '</dd>' : '') + (D.origin.place ? '<dt>Place</dt><dd>' + UIesc(D.origin.place) + '</dd>' : '') + '<dt>Found</dt><dd>' + (D.origin.found ? '<span style="color:var(--teal)">Yes — you traced it to its source.</span>' : '<span class="muted">Not identified.</span>') + '</dd></dl></div></section>';
    // costs
    html += '<section class="db-sec"><div class="eyebrow">Cost</div><h2>What it took</h2><div class="db-costs"><div class="stat"><b>' + UIfmt.money(D.totals.cost) + '</b><span>spent</span></div><div class="stat"><b>' + UIfmt.n(D.totals.closureDays) + '</b><span>days of closures</span></div><div class="stat"><b>' + (D.trust.start !== null ? Math.round(D.trust.start * 100) + ' → ' : '') + Math.round((D.trust.end || 0) * 100) + '</b><span>public trust</span></div>' + (D.totals.hospital ? '<div class="stat"><b>' + UIfmt.n(D.totals.hospital) + '</b><span>admitted to hospital</span></div>' : '') + '</div></section>';
    // the dead
    html += '<section class="db-sec db-mem"><div class="mem-h"><span></span><div class="eyebrow">In memory</div><span></span></div>' + (D.deaths.length ? '<p class="mem-d">' + UIfmt.plural(D.deaths.length, 'person', 'people') + ' in ' + UIesc(city.name) + ' died of the disease.</p><div class="mem">' + D.deaths.map(function (p) {
      var dd = UIA.district(p.district);
      var who = (p.pid && UIA.caseOf(p.pid)) || { pid: p.pid || p.name, age: p.age };
      return '<div class="mem-p"><span class="mem-f">' + UIPortrait.svg(who) + '</span><div><b>' + UIesc(p.name) + '</b><span>' + (p.age !== null && p.age !== undefined ? UIesc(p.age) : '') + (p.note ? ', ' + UIesc(p.note) : '') + (dd ? ' · ' + UIesc(dd.name) : '') + (p.day !== null && p.day !== undefined ? ' · ' + UIesc(UIA.dateShort(p.day)) : '') + '</span></div></div>';
    }).join('') + '</div>' : '<p class="mem-d">No one in ' + UIesc(city.name) + ' died of the disease.</p>') + '</section>';
    html += '<footer class="db-foot"><button class="btn pri" id="db-new">A new outbreak</button><button class="btn" id="db-again">Replay this city</button><p class="note">Seed ' + UIesc(UIA.seed) + '</p></footer></div></div>';
    root.innerHTML = html;
    root.scrollTop = 0;
    UIAudio.cue('toll');
    UI$('#db-new').addEventListener('click', function () { UIA.clearSave(); UIBoot.title(); });
    UI$('#db-again').addEventListener('click', function () { var s = UIA.seed, g = UIA.grade; UIA.clearSave(); UIBoot.start(s, g, false); });
    // charts
    var cs = D.curves;
    if (cs.actual.length) UIChart.lines(UI$('#db-c1'), [{ vals: cs.ghost, color: '#b9cadc', dash: true, label: 'Ghost city' }, { vals: cs.actual, color: '#ff7a45', fill: true, label: 'Your city' }], cs.start, { h: 240, endLabels: true, label: 'Infections, you vs ghost city' });
    function cum(a) { var s = 0; return a.map(function (v) { s += v || 0; return s; }); }
    if (cs.deaths.length) UIChart.lines(UI$('#db-c2'), [{ vals: cum(cs.ghostDeaths), color: '#b9cadc', dash: true, label: 'Ghost city' }, { vals: cum(cs.deaths), color: '#d9d3c7', fill: true, label: 'Your city' }], cs.start, { h: 200, endLabels: true, label: 'Deaths, you vs ghost city' });
    this.replay(D); this.tree(D);
    // reveal card rows on scroll
    try {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.2 });
      UI$$('#pc, .db-sec', root).forEach(function (el) { io.observe(el); });
    } catch (e) { UI$$('#pc, .db-sec', root).forEach(function (el) { el.classList.add('in'); }); }
    // backdrop glow canvas
    var bg = UI$('#db-bg'); bg.width = 10; bg.height = 10;
    UI.save();
  },
  replay: function (D) {
    var city = UIA.city(), fr = D.frames, host = UI$('#rp-cv');
    if (!fr.length) { host.parentNode.innerHTML = '<div class="empty">No replay data.</div>'; return; }
    var d0 = Math.min.apply(null, fr.map(function (f) { return f.day; })), d1 = Math.max(UIA.day(), Math.max.apply(null, fr.map(function (f) { return f.day; })));
    var pos = {}; fr.forEach(function (f) { pos[f.pid] = f.pos || UIMapR.homePos(city, f.pid, f.district, null); });
    var view = { x: 0, y: 0, k: 1 }, cur = d0, sl = UI$('#rp-s'); sl.min = d0; sl.max = d1; sl.value = d0;
    var cv = UIcanvas(host, function (ctx, w, h) {
      var T = UIMapR.base(ctx, w, h, { city: city, view: view });
      UIMapR.labels(ctx, T, city, {});
      var pts = [], arcs = [], nOn = 0;
      fr.forEach(function (f) { if (f.day <= cur && cur - f.day <= 21) nOn++; });
      var base = UIclamp(Math.sqrt(220 / Math.max(1, nOn)), 0.14, 1);
      fr.forEach(function (f) { if (f.day > cur) return; var age = cur - f.day; pts.push({ p: pos[f.pid], b: UIMapR.bucket(age), a: base * (age > 21 ? .25 : 1) }); if (age <= 3 && f.by && pos[f.by] && arcs.length < 400) arcs.push([pos[f.by], pos[f.pid], age]); });
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      arcs.forEach(function (a) { var p = UIMapR.toScreen(T, a[0]), q = UIMapR.toScreen(T, a[1]); var mx = (p[0] + q[0]) / 2 - (q[1] - p[1]) * .2, my = (p[1] + q[1]) / 2 + (q[0] - p[0]) * .2; ctx.strokeStyle = 'rgba(255,150,90,' + ((0.5 - a[2] * .11) * Math.max(.3, base)).toFixed(3) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo(mx, my, q[0], q[1]); ctx.stroke(); });
      ctx.restore();
      UIMapR.dots(ctx, T, pts, { scale: .8 });
    });
    UIgesture(host, view, { min: 0.8, max: 8, onChange: function () { cv.frame(); } });
    function set(d) { cur = d; sl.value = d; UI$('#rp-day').innerHTML = '<b>' + (d >= 0 ? 'Day ' + (d + 1) : (-d) + (d === -1 ? ' day' : ' days') + ' before') + '</b><span>' + UIesc(UIA.dateLabel(d)) + (d < 0 ? ' · before the alert' : '') + '</span>'; var n = fr.filter(function (f) { return f.day <= d; }).length; UI$('#rp-n').textContent = UIfmt.n(n); cv.frame(); }
    sl.addEventListener('input', function () { stop(); set(+sl.value); });
    var timer = null, btn = UI$('#rp-play');
    function stop() { clearInterval(timer); timer = null; btn.innerHTML = UIICON.play; }
    btn.addEventListener('click', function () {
      if (timer) { stop(); return; }
      if (cur >= d1) set(d0);
      btn.innerHTML = UIICON.pause;
      timer = setInterval(function () { if (cur >= d1) { stop(); return; } set(cur + 1); }, Math.max(60, 5000 / Math.max(1, d1 - d0)));
    });
    set(d0); setTimeout(function () { cv.resize(); set(Math.round(d0 + (d1 - d0) * .35)); }, 60);
  },
  tree: function (D) {
    var nodes = D.tree, host = UI$('#tt-cv');
    if (!nodes.length) { host.parentNode.innerHTML = '<div class="empty">No tree data.</div>'; return; }
    var by = {}, kids = {}, roots = [];
    nodes.forEach(function (n) { by[n.id] = n; });
    nodes.forEach(function (n) { if (n.parent && by[n.parent]) (kids[n.parent] = kids[n.parent] || []).push(n); else roots.push(n); });
    var y = 0, d0 = Infinity, d1 = -Infinity;
    function place(n, depth) { if (depth > 2000) return; d0 = Math.min(d0, n.day); d1 = Math.max(d1, n.day); var ks = (kids[n.id] || []).sort(function (a, b) { return a.day - b.day; }); if (!ks.length) { n.y = y++; return; } ks.forEach(function (k) { place(k, depth + 1); }); n.y = (ks[0].y + ks[ks.length - 1].y) / 2; }
    roots.sort(function (a, b) { return a.day - b.day; }).forEach(function (r) { place(r, 0); y += 1; });
    var SET = { home: '#8fcbff', household: '#8fcbff', school: '#f2b640', work: '#a592ff', workplace: '#a592ff', hospital: '#ff5a4f', care: '#d9d3c7', carehome: '#d9d3c7', community: '#6e8091', venue: '#3fd0aa', pub: '#3fd0aa', market: '#ff7a45', animal: '#ff7a45' };
    function col(n) { var k = n.setting || (UIA.place(n.place) || {}).kind || n.place; return SET[k] || '#8ce8cf'; }
    var used = {}; nodes.forEach(function (n) { used[col(n)] = n.setting || (UIA.place(n.place) || {}).kind || n.place || 'other'; });
    UI$('#tt-leg').innerHTML = Object.keys(used).slice(0, 8).map(function (c) { return '<span><i style="background:' + c + '"></i>' + UIesc(UIcap(UIplaceKind(used[c])[0])) + '</span>'; }).join('');
    var view = { x: 0, y: 0, k: 1 }, sel = null, ny = Math.max(1, y);
    var cv = UIcanvas(host, function (ctx, w, h) {
      ctx.fillStyle = '#060a0f'; ctx.fillRect(0, 0, w, h);
      var L = 14, R = w - 14, T = 12, B = h - 22;
      var X = function (d) { return view.x + (L + (d - d0) / Math.max(1, d1 - d0) * (R - L)) * view.k; }, Y = function (v) { return view.y + (T + v / ny * (B - T)) * view.k; };
      ctx.lineWidth = Math.max(0.5, 0.8 * Math.sqrt(view.k) * (nodes.length > 1500 ? .7 : 1));
      var la = nodes.length > 1500 ? UIclamp(.25 * Math.sqrt(view.k), .2, .6) : .55;
      nodes.forEach(function (n) { var p = n.parent && by[n.parent]; if (!p) return; ctx.strokeStyle = col(n); ctx.globalAlpha = la; ctx.beginPath(); ctx.moveTo(X(p.day), Y(p.y)); ctx.lineTo(X(p.day), Y(n.y)); ctx.lineTo(X(n.day), Y(n.y)); ctx.stroke(); });
      ctx.globalAlpha = 1;
      var r = UIclamp((nodes.length > 1500 ? .7 : 1.2) * Math.sqrt(view.k) + (nodes.length < 300 ? 1.2 : 0), .8, 5);
      nodes.forEach(function (n) { ctx.fillStyle = n.died ? '#d9d3c7' : col(n); ctx.beginPath(); ctx.arc(X(n.day), Y(n.y), n === sel ? r + 3 : r, 0, Math.PI * 2); ctx.fill(); n.sx = X(n.day); n.sy = Y(n.y); });
      roots.forEach(function (n) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(n.day), Y(n.y), r + 4, 0, Math.PI * 2); ctx.stroke(); });
      ctx.fillStyle = 'rgba(164,179,192,.8)'; ctx.font = '11px ' + getComputedStyle(document.body).getPropertyValue('--f-mono'); ctx.textAlign = 'left'; ctx.fillText(UIA.dateShort(d0), L, h - 7); ctx.textAlign = 'right'; ctx.fillText(UIA.dateShort(d1), R, h - 7);
    });
    UIgesture(host, view, { min: 1, max: 30, onChange: function () { cv.frame(); }, onTap: function (x, yy) {
      var best = null, bd = 18; nodes.forEach(function (n) { var d = Math.hypot(n.sx - x, n.sy - yy); if (d < bd) { bd = d; best = n; } });
      sel = best; cv.frame();
      var info = UI$('#tt-info');
      if (!best) { info.textContent = 'Pinch to zoom · tap a person'; return; }
      var par = best.parent && by[best.parent], k = (kids[best.id] || []).length;
      info.innerHTML = '<b>' + UIesc(best.name || best.id) + '</b> · infected ' + UIesc(UIA.dateShort(best.day)) + (best.placeName ? ' at ' + UIesc(best.placeName) : '') + (par ? ' by ' + UIesc(par.name || par.id) : ' · <span style="color:var(--ember)">first infection</span>') + ' · passed it to ' + k;
    } });
  }
};
