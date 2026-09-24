/* INDEX CASE UI — 23-boot.js: the title screen (grade, continue, guided first
 * outbreak), starting / restoring a game, and boot. */
var UIBoot = {
  title: function () {
    var root = UI$('#title');
    UI$('#game').hidden = true; UI$('#debrief').hidden = true; root.hidden = false;
    UIsheet.close(); if (UICoach.active()) UICoach.stop();
    var sv = UIA.readSave(), grades = UIA.grades();
    var gr = UIPREF.get('grade', grades[0].id); if (!grades.some(function (g) { return g.id === gr; })) gr = grades[0].id;
    var seed = String(1000 + Math.floor(Math.random() * 8999));
    var played = UIPREF.get('played', 0);
    root.innerHTML = '<div id="t-cv" style="position:absolute;inset:0"></div><div class="t-shade"></div><div class="t-frame" aria-hidden="true"><i></i><i></i><i></i><i></i><span class="t-coord a">52°28′N · 1°53′W · grid 07</span><span class="t-coord b">Surveillance feed · live</span></div><div class="t-wrap">' +
      '<div class="t-top"><span class="eyebrow" style="color:var(--ink3)">Outbreak response · a deduction game</span><button class="ibtn" id="t-snd" aria-label="Sound">' + (UIAudio.muted ? UIICON.mute : UIICON.sound) + '</button></div>' +
      '<div class="t-brand"><div class="t-eyebrow"><span>Unknown aetiology</span><span>Pop. 250,000</span></div><h1 class="t-title"><span>Index</span><span>Case</span></h1>' +
      '<p class="t-dek">A disease nobody has seen before appears in a British city. You lead the public health response. Work out what it is while it spreads — and decide what to do before you are sure.</p>' +
      '<div class="t-unk" aria-hidden="true"><span>Route<b>unknown</b></span><span>Incubation<b>unknown</b></span><span>R₀<b>unknown</b></span></div></div>' +
      '<div class="t-panel">' +
      (sv && !sv.over ? '<button class="btn pri t-cont" id="t-cont"><span>Continue · ' + UIesc(sv.city || '') + '</span><small>Day ' + ((sv.day || 0) + 1) + ' · ' + UIesc((UIA.ACTS[sv.act] || ['', ''])[1]) + ' · ' + UIesc((grades.filter(function (g) { return g.id === sv.grade; })[0] || { label: '' }).label) + (sv.tutorial ? ' · guided' : '') + '</small></button>' : '') +
      '<div class="t-grades" role="radiogroup" aria-label="Grade">' + grades.map(function (g, i) { return '<button class="t-grade' + (g.id === gr ? ' on' : '') + '" role="radio" aria-checked="' + (g.id === gr) + '" data-g="' + UIesc(g.id) + '"><i>Grade ' + (i + 1) + '</i><b>' + UIesc(g.label) + '</b><span class="lv">' + [0, 1, 2].map(function (k) { return '<u class="' + (k <= i ? 'f' : '') + '"></u>'; }).join('') + '</span></button>'; }).join('') + '</div>' +
      '<p class="t-blurb" id="t-blurb">' + UIesc((grades.filter(function (g) { return g.id === gr; })[0] || {}).blurb || '') + '</p>' +
      '<div class="t-row"><button class="btn ' + (sv && !sv.over ? '' : played ? 'pri' : '') + '" id="t-new">' + UIICON.play + 'New outbreak</button><button class="btn ' + (!played && !(sv && !sv.over) ? 'pri' : '') + '" id="t-tut">' + UIICON.mentor + 'Guided case</button></div>' +
      '<div class="t-seed"><label for="t-seed">City seed</label><input id="t-seed" inputmode="numeric" value="' + seed + '" maxlength="10" aria-label="City seed"><span id="t-msg" class="t-msg"></span></div>' +
      '<p class="t-foot">A fictional city, fictional diseases and fictional officials. The dead in this game have names; it is meant to be played seriously.</p></div></div>';
    this.backdrop();
    UI$('.t-grades').addEventListener('click', function (e) {
      var b = e.target.closest('[data-g]'); if (!b) return; gr = b.dataset.g; UIPREF.set('grade', gr); UIAudio.cue('tap');
      UI$$('.t-grade').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
      UI$('#t-blurb').textContent = (grades.filter(function (g) { return g.id === gr; })[0] || {}).blurb || '';
    });
    UI$('#t-snd').addEventListener('click', function () { UIAudio.setMuted(!UIAudio.muted); UI$('#t-snd').innerHTML = UIAudio.muted ? UIICON.mute : UIICON.sound; });
    var armed = false;
    function go(tut) {
      var b = UI$(tut ? '#t-tut' : '#t-new');
      if (sv && !sv.over && !armed) { armed = true; b.innerHTML = 'Replace saved game?'; b.classList.add('danger'); setTimeout(function () { armed = false; if (b.isConnected) { b.classList.remove('danger'); b.innerHTML = tut ? UIICON.mentor + 'Guided case' : UIICON.play + 'New outbreak'; } }, 3500); return; }
      UIBoot.start(UI$('#t-seed').value.trim() || seed, tut ? (grades[0].id) : gr, tut);
    }
    UI$('#t-new').addEventListener('click', function () { go(false); });
    UI$('#t-tut').addEventListener('click', function () { go(true); });
    var c = UI$('#t-cont'); if (c) c.addEventListener('click', function () { UIBoot.cont(sv); });
  },
  backdrop: function () {
    var city = UIMapR.fakeCity(7), host = UI$('#t-cv'), t0 = performance.now(), store = {}, motion = UImotion();
    var r = UIrand('title-dots'), dots = [], idx = [0.46 + r() * .08, 0.5 + r() * .06];
    for (var i = 0; i < 420; i++) { var a = r() * Math.PI * 2, d = Math.pow(r(), .7) * .4, p = [idx[0] + Math.cos(a) * d * (0.6 + r() * .6), idx[1] + Math.sin(a) * d * .85]; var inside = city.districts.some(function (dd) { return UIMapR.inPoly(p[0], p[1], dd.poly); }); if (inside) dots.push({ p: p, t: d * 40 + r() * 6, by: null }); }
    dots.sort(function (a, b) { return a.t - b.t; });
    dots.forEach(function (d, i) { if (i) { var best = 0, bd = 9; for (var j = 0; j < i; j++) { var e = Math.hypot(dots[j].p[0] - d.p[0], dots[j].p[1] - d.p[1]); if (e < bd && dots[j].t < d.t) { bd = e; best = j; } } d.by = dots[best]; } });
    var view = { x: 0, y: 0, k: 1 };
    var cv = UIcanvas(host, function (ctx, w, h) {
      var k = w < 600 ? 1.55 : 1.05; view.k = k;
      var T0 = UIMapR.xf(w, h, { x: 0, y: 0, k: k }); view.x = w / 2 - (T0.x + idx[0] * T0.s); view.y = h * (w < 600 ? .3 : .42) - (T0.y + idx[1] * T0.s);
      var sec = (performance.now() - t0) / 1000, el = motion ? sec % 26 : 14, pts = [];
      // slow camera drift over the cached map
      var z = motion ? 1.03 + .03 * Math.sin(sec / 9) : 1.03, dx = motion ? Math.sin(sec / 13) * 8 : 0, dy = motion ? Math.cos(sec / 11) * 6 : 0;
      ctx.fillStyle = '#03060a'; ctx.fillRect(0, 0, w, h);
      ctx.save(); ctx.translate(w / 2 + dx, h * .35 + dy); ctx.scale(z, z); ctx.translate(-w / 2, -h * .35);
      var T = UIMapR.cached(store, ctx, w, h, { city: city, view: view, noVignette: true }, view.x.toFixed(1) + ',' + view.y.toFixed(1) + ',' + k);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      dots.forEach(function (d) { if (d.t > el) return; var age = el - d.t; pts.push({ p: d.p, b: age < 1.2 ? 0 : age < 4 ? 1 : age < 9 ? 2 : 3 });
        if (d.by && age < 1.6) { var p = UIMapR.toScreen(T, d.by.p), q = UIMapR.toScreen(T, d.p); ctx.strokeStyle = 'rgba(255,150,90,' + (0.5 * (1 - age / 1.6)).toFixed(2) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.quadraticCurveTo((p[0] + q[0]) / 2 - (q[1] - p[1]) * .25, (p[1] + q[1]) / 2 + (q[0] - p[0]) * .25, q[0], q[1]); ctx.stroke(); } });
      ctx.restore();
      UIMapR.bloom(ctx, T, pts.filter(function (q) { return q.b < 2; }), { scale: .8 });
      UIMapR.dots(ctx, T, pts, { scale: 1.1 });
      var c = UIMapR.toScreen(T, idx), ph = (el % 2.4) / 2.4;
      ctx.strokeStyle = 'rgba(255,224,194,' + (0.7 * (1 - ph)).toFixed(2) + ')'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(c[0], c[1], 6 + ph * 40, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      UIMapR.vignette(ctx, w, h);
    });
    function loop() { if (UI$('#title').hidden || !host.isConnected) { if (cv.ro) cv.ro.disconnect(); return; } cv.frame(); if (motion) UIBoot._raf = setTimeout(function () { requestAnimationFrame(loop); }, 33); }
    clearTimeout(UIBoot._raf); loop();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { store.key = null; cv.frame(); });
  },
  start: function (seed, grade, tutorial) {
    var msg = UI$('#t-msg');
    if (msg) msg.textContent = 'Generating the city…';
    UI$$('#title button').forEach(function (b) { b.disabled = true; });
    setTimeout(function () {
      try { UIA.create(seed, grade, { tutorial: tutorial }); }
      catch (e) {
        console.error(e);
        if (msg) msg.textContent = 'Could not generate this city (' + e.message + '). Try another seed.';
        UI$$('#title button').forEach(function (b) { b.disabled = false; });
        return;
      }
      UIS = UI.freshState();
      UIA.clearSave();
      UIPREF.set('played', UIPREF.get('played', 0) + 1);
      UIBoot.enter();
      UI.go('brief');
      UI.save();
      UI.actCard(UIA.actNo(), function () { if (tutorial) UICoach.start('tutorial'); });
    }, 40);
  },
  cont: function (sv) {
    try { UIA.loadSaved(sv); }
    catch (e) { console.error(e); var m = UI$('#t-msg'); if (m) m.textContent = 'The saved game could not be restored (' + e.message + ').'; return; }
    UIS = sv.ui || UI.freshState();
    var fr = UI.freshState(); for (var k in fr) if (UIS[k] === undefined) UIS[k] = fr[k];
    UIBoot.enter();
    if (UIA.over()) { UIDebrief.show(); return; }
    UI.go(UIS.tab || 'brief');
    if (UIS.coach) UICoach.resume();
  },
  enter: function () {
    UI$('#title').hidden = true; UI$('#debrief').hidden = true; UI$('#game').hidden = false;
    Object.keys(UI.views).forEach(function (k) { UI.views[k].built = false; });
    if (UIMap.cv && UIMap.cv.ro) UIMap.cv.ro.disconnect();
    if (!UI.framed) { UI.buildFrame(); UI.framed = true; }
    UI.topbar(); UI.badges();
  },
  boot: function () {
    if (!UIA.ready()) { var t = UI$('#title'); t.hidden = false; t.innerHTML = '<div class="empty" style="padding-top:30vh"><b>Engine missing</b>This build has no simulation engine.</div>'; return; }
    UIBoot.title();
  }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', UIBoot.boot); else UIBoot.boot();
