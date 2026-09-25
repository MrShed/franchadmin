/* DEPTH UI — 23-boot.js: the title screen (grade, seed, Continue, guided first
 * case) over a slow phosphor waterfall, starting / restoring a case, boot. */
var UIBoot = {
  title: function () {
    var root = UI$('#title');
    UI$('#game').hidden = true; UI$('#debrief').hidden = true; UI$('#van').hidden = true; root.hidden = false;
    UIsheet.close(); if (UICoach.active()) UICoach.stop();
    UIAudio.setRx(null);
    var sv = UIA.readSave(), grades = UIA.grades();
    var gr = UIPREF.get('grade', 'analyst'); if (!grades.some(function (g) { return g.id === gr; })) gr = grades[Math.min(1, grades.length - 1)].id;
    var seed = String(1000 + Math.floor(Math.random() * 8999));
    var played = UIPREF.get('played', 0), live = sv && !sv.over;
    root.innerHTML = '<div class="t-bg" id="t-bg"></div><div class="t-shade"></div>' +
      '<div class="t-wrap"><div class="t-top"><span class="t-eyebrow">Station Kestrel · Baltic coast · autumn 1977</span><button class="ib" id="t-snd" aria-label="Sound">' + (UIAudio.muted ? UIICON.mute : UIICON.sound) + '</button></div>' +
      '<div class="t-brand"><span class="t-stamp">Restricted</span><h1 class="t-title">Depth</h1>' +
      '<p class="t-dek">A spy ring is talking over the air. You can hear every word and understand none of it. Find them, read them, stop them.</p>' +
      '<div class="t-groups" id="t-groups" aria-hidden="true"></div></div>' +
      '<div class="t-folder"><div class="t-tab">Case file</div><div class="t-card">' +
      (live ? '<button class="btn pri t-cont" id="t-cont"><span>Continue the case</span><small>Night ' + ((sv.shift || 0) + 1) + ' of ' + (sv.shifts || 4) + ' · ' + UIesc(sv.label || '') + ' · ' + UIesc((grades.filter(function (g) { return g.id === sv.grade; })[0] || { label: '' }).label) + (sv.tutorial ? ' · guided' : '') + '</small></button>' : '') +
      '<div class="t-lbl">Grade</div><div class="t-grades" role="radiogroup" aria-label="Grade">' + grades.map(function (g, i) { return '<button class="t-grade' + (g.id === gr ? ' on' : '') + '" role="radio" aria-checked="' + (g.id === gr) + '" data-g="' + UIesc(g.id) + '"><b>' + UIesc(g.label) + '</b><span class="lv">' + [0, 1, 2].map(function (k) { return '<u class="' + (k <= i ? 'f' : '') + '"></u>'; }).join('') + '</span></button>'; }).join('') + '</div>' +
      '<p class="t-blurb" id="t-blurb">' + UIesc((grades.filter(function (g) { return g.id === gr; })[0] || {}).blurb || '') + '</p>' +
      '<div class="t-row"><button class="btn ' + (live ? '' : played ? 'pri' : '') + '" id="t-new">' + UIICON.play + 'New case</button><button class="btn ' + (!played && !live ? 'pri' : '') + '" id="t-tut">' + UIICON.mentor + 'Guided first case</button></div>' +
      '<div class="t-seed"><label for="t-seed">Case no.</label><input id="t-seed" inputmode="numeric" value="' + seed + '" maxlength="10" aria-label="Case seed" autocomplete="off"><span id="t-msg" class="t-msg"></span></div>' +
      '</div></div>' +
      '<p class="t-foot">A fictional city, a fictional ring. The codebreaking is real. Best with headphones.</p></div>';
    this.backdrop();
    UI$('.t-grades').addEventListener('click', function (e) {
      var b = e.target.closest('[data-g]'); if (!b) return; gr = b.dataset.g; UIPREF.set('grade', gr); UIAudio.cue('switch');
      UI$$('.t-grade').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
      UI$('#t-blurb').textContent = (grades.filter(function (g) { return g.id === gr; })[0] || {}).blurb || '';
    });
    UI$('#t-snd').addEventListener('click', function () { UIAudio.setMuted(!UIAudio.muted); UI$('#t-snd').innerHTML = UIAudio.muted ? UIICON.mute : UIICON.sound; });
    var armed = false;
    function go(tut) {
      var b = UI$(tut ? '#t-tut' : '#t-new');
      if (live && !armed) { armed = true; b.textContent = 'Replace the saved case?'; b.classList.add('danger'); setTimeout(function () { armed = false; if (b.isConnected) { b.classList.remove('danger'); b.innerHTML = tut ? UIICON.mentor + 'Guided first case' : UIICON.play + 'New case'; } }, 3500); return; }
      UIAudio.cue('stamp');
      UIBoot.start(tut ? 'tutorial' : (UI$('#t-seed').value.trim() || seed), tut ? 'cadet' : gr, tut);
    }
    UI$('#t-new').addEventListener('click', function () { go(false); });
    UI$('#t-tut').addEventListener('click', function () { go(true); });
    var c = UI$('#t-cont'); if (c) c.addEventListener('click', function () { UIAudio.cue('paper'); UIBoot.cont(sv); });
  },
  backdrop: function () {
    var host = UI$('#t-bg'), motion = UImotion(), t0 = performance.now();
    var cv = document.createElement('canvas'); host.appendChild(cv);
    var W = 240, H = 180; cv.width = W; cv.height = H;
    var x = cv.getContext('2d'), img = x.createImageData(W, 1), lut = UIPaint.LUT, r = UIrand('title');
    var tr = [{ f: 0.32, w: 3, a: 150, k: 'v' }, { f: 0.61, w: 1, a: 170, k: 'c' }, { f: 0.83, w: 1, a: 80, k: 's' }, { f: 0.12, w: 2, a: 60, k: 'b' }, { f: 0.47, w: 1, a: 110, k: 'c2' }];
    function row(t) {
      var d = img.data;
      var key = Math.floor(t / 3) % 7 < 4 && Math.floor(t / 11) % 3 !== 0, key2 = Math.floor(t / 2.3) % 5 < 2;
      for (var i = 0; i < W; i++) {
        var v = 8 + Math.random() * 26 + 8 * Math.sin(i * 0.05 + t * 0.01);
        tr.forEach(function (s) {
          var dx = Math.abs(i - (s.f * W + Math.sin(t * 0.004 + s.f * 9) * 3));
          if (s.k === 'v') { if (dx < 1) v += 180; else if (dx < 9) v += (9 - dx) * 9 * Math.random(); }
          else if (s.k === 'c') { if (key && dx < 1) v += s.a; }
          else if (s.k === 'c2') { if (key2 && dx < 1) v += s.a; }
          else if (dx < s.w) v += s.a * (0.6 + 0.4 * Math.sin(t * 0.05));
        });
        var iv = UIclamp(v | 0, 0, 255), p = i * 4;
        d[p] = lut[iv * 3]; d[p + 1] = lut[iv * 3 + 1]; d[p + 2] = lut[iv * 3 + 2]; d[p + 3] = 255;
      }
    }
    var t = 0;
    function step() { x.globalCompositeOperation = 'copy'; x.drawImage(cv, 0, 1); x.globalCompositeOperation = 'source-over'; row(t++); x.putImageData(img, 0, 0); }
    for (var i = 0; i < H; i++) step();
    var groups = [], rg = UIrand('tg'); for (var k = 0; k < 40; k++) groups.push(String(10000 + Math.floor(rg() * 89999)));
    var gi = 0, gEl = UI$('#t-groups');
    function show() { if (!gEl.isConnected) return; gEl.innerHTML = groups.slice(gi, gi + 5).map(function (g, j) { return '<span' + (j === 2 ? ' class="cur"' : '') + '>' + g + '</span>'; }).join(''); }
    show();
    clearInterval(UIBoot._gi); if (motion) UIBoot._gi = setInterval(function () { if (!gEl.isConnected) { clearInterval(UIBoot._gi); return; } gi = (gi + 1) % 35; show(); }, 1500);
    var last = 0;
    function frame(now) { if (UI$('#title').hidden || !cv.isConnected) return; if (now - last > 50) { step(); last = now; } requestAnimationFrame(frame); }
    if (motion) requestAnimationFrame(frame);
  },
  start: function (seed, grade, tutorial) {
    var msg = UI$('#t-msg');
    if (msg) msg.textContent = 'Opening the case file…';
    UI$$('#title button').forEach(function (b) { b.disabled = true; });
    setTimeout(function () {
      try { UIA.create(seed, grade, { tutorial: tutorial }); }
      catch (e) {
        console.error(e);
        if (msg) msg.textContent = 'Could not open this case (' + e.message + '). Try another number.';
        UI$$('#title button').forEach(function (b) { b.disabled = false; });
        return;
      }
      UIS = UI.freshState();
      if (tutorial) UIS.explained = { receiver: 1, hold: 1, df: 1, map: 1 };
      UIA.clearSave();
      UIPREF.set('played', UIPREF.get('played', 0) + 1);
      UIBoot.enter();
      UI.go('receiver');
      UI.save();
      UIBoot.nightCard(function () { if (tutorial) UICoach.start('tutorial'); });
    }, 30);
  },
  nightCard: function (after) {
    var c = UIA.clock(), ov = UI$('#night');
    ov.innerHTML = '<div class="nc"><div class="nc-memo paper"><div class="nc-h"><span class="eyebrow">Station Kestrel · night duty</span><h2>Night ' + (c.shift + 1) + ' of ' + c.shifts + '</h2><span class="nc-stamp">On watch</span></div>' +
      '<p style="font:400 15px/1.5 var(--type)">' + UIesc(c.night || c.day) + '. The watch runs 18:00 to 02:00. ' + UIA.warrants().left + ' warrants in the safe.</p>' +
      '<p class="nc-next">Supt. Norlander’s brief and Mrs Holm’s note are on the Desk.</p><button class="btn pri" id="nc-go">Take the headphones</button></div></div>';
    ov.hidden = false; requestAnimationFrame(function () { ov.classList.add('on'); });
    UI$('#nc-go').addEventListener('click', function () { UIAudio.start(); UIAudio.cue('switch'); ov.classList.remove('on'); setTimeout(function () { ov.hidden = true; ov.innerHTML = ''; if (after) after(); }, 400); });
  },
  cont: function (sv) {
    try { UIA.loadSaved(sv); }
    catch (e) { console.error(e); var m = UI$('#t-msg'); if (m) m.textContent = 'The saved case could not be restored (' + e.message + ').'; return; }
    UIS = sv.ui || UI.freshState();
    var fr = UI.freshState(); for (var k in fr) if (UIS[k] === undefined) UIS[k] = fr[k];
    ['rx', 'bench', 'traffic', 'map', 'desk', 'op'].forEach(function (k) { for (var j in fr[k]) if (UIS[k][j] === undefined) UIS[k][j] = fr[k][j]; });
    UIBoot.enter();
    if (UIA.over()) { UIDebrief.show(); return; }
    UI.go(UIS.tab || 'receiver');
    if (UIS.coach) UICoach.resume();
  },
  enter: function () {
    UI$('#title').hidden = true; UI$('#debrief').hidden = true; UI$('#game').hidden = false;
    clearInterval(UIBoot._gi);
    Object.keys(UI.views).forEach(function (k) { var v = UI.views[k]; v.built = false; if (v.reset) v.reset(); });
    UI$$('.view').forEach(function (v) { v.innerHTML = ''; });
    if (!UI.framed) { UI.buildFrame(); UI.framed = true; }
    UI.topbar(); UI.badges();
  },
  boot: function () {
    UITex.make();
    if (!UIA.ready()) { var t = UI$('#title'); t.hidden = false; t.innerHTML = '<div class="t-wrap"><h1 class="t-title">Depth</h1><p class="t-dek">This build has no engine.</p></div>'; return; }
    UIBoot.title();
  }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', UIBoot.boot); else UIBoot.boot();
