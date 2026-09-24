/* CUTOUT UI — 19-boot.js: title screen, new case / continue, boot. */
var UIBoot = {
  title: function () {
    var root = UI$('#title');
    UI$('#game').hidden = true; UI$('#debrief').hidden = true; root.hidden = false;
    var sv = UIA.readSave();
    var seed = String(10000 + Math.floor(Math.random() * 89999));
    root.innerHTML = '<div class="t-wrap"><div class="t-folder"><div class="t-classif">SECRET</div>' +
      '<div class="lbl" style="color:#5a4526">Liaison desk · Vienna · autumn 1989</div><div class="t-title">CUTOUT</div>' +
      '<p class="t-sub">A partner service passes you a fragment. Somewhere in Europe a small network is preparing something. You have a desk, a telephone, sixteen team-hours a day and about two weeks.</p>' +
      '<div class="t-label"><b>File no.</b><input id="t-seed" inputmode="numeric" value="' + seed + '" aria-label="Case seed" maxlength="12"></div>' +
      '<div class="t-label"><b>Handling</b><span>Pull records on every name, number and plate you read. Pin what matters to the board. File what you believe; three right answers get stamped. Stop them before the day.</span></div>' +
      '<div class="t-actions">' + (sv ? '<button class="btn primary" id="t-cont">Continue — ' + UIesc(sv.label || '') + '</button>' : '') +
      '<button class="btn ' + (sv ? '' : 'primary') + '" id="t-new">Open the case</button></div>' +
      '<p class="t-brief" id="t-msg"></p></div><div class="t-foot">No real persons. All hotels, firms and banks invented.</div></div>';
    var go = UI$('#t-new');
    go.addEventListener('click', function () {
      if (sv && !UIBoot._armed) { UIBoot._armed = true; go.textContent = 'Discard saved case and open file ' + UI$('#t-seed').value.trim() + '?'; go.classList.add('danger'); return; }
      UIBoot._armed = false;
      UIBoot.start(UI$('#t-seed').value.trim() || seed);
    });
    UI$('#t-seed').addEventListener('input', function () { if (UIBoot._armed) { go.textContent = 'Discard saved case and open file ' + UI$('#t-seed').value.trim() + '?'; } });
    var c = UI$('#t-cont');
    if (c) c.addEventListener('click', function () { UIBoot.cont(sv); });
  },
  start: function (seed) {
    var msg = UI$('#t-msg');
    msg.textContent = 'Fetching file ' + seed + ' from registry…';
    UI$$('#title button').forEach(function (b) { b.disabled = true; });
    setTimeout(function () {
      try {
        UIA.create(seed);
      } catch (e) {
        msg.textContent = 'The registry could not produce this file (' + e.message + '). Try another number.';
        UI$$('#title button').forEach(function (b) { b.disabled = false; });
        return;
      }
      UIS = UI.freshState();
      UIA.clearSave();
      UIBoot.enter();
      var first = UIA.docs().filter(function (d) { return d.kind === 'tip'; })[0] || UIA.docs()[0];
      UI.go('desk', first && window.innerWidth >= 900 ? { open: first.id } : {});
      UI.save();
    }, 30);
  },
  cont: function (sv) {
    try { UIA.loadSaved(sv); }
    catch (e) { UI$('#t-msg').textContent = 'The saved case could not be restored (' + e.message + ').'; return; }
    UIS = sv.ui || UI.freshState();
    var fr = UI.freshState(); for (var k in fr) if (UIS[k] === undefined) UIS[k] = fr[k];
    UIBoot.enter();
    if (UIA.over()) { UIDebrief.show(); return; }
    UI.go(UIS.tab || 'desk');
  },
  enter: function () {
    UI$('#title').hidden = true; UI$('#debrief').hidden = true; UI$('#game').hidden = false;
    UI.views.desk.built = UI.views.records.built = UI.views.board.built = UI.views['case'].built = false;
    UIBoard.sel = UIBoard.linkFrom = UIBoard.selLink = null;
    if (!UI.framed) { UI.buildFrame(); UI.framed = true; }
    UIDoc.setHighlights(UIS.hl);
    UI.topbar(); UI.badges();
  },
  boot: function () {
    if (!UIA.ready()) { UI$('#title').hidden = false; UI$('#title').innerHTML = '<p style="padding:24px">Engine missing.</p>'; return; }
    UIBoot.title();
  }
};
window.addEventListener('beforeunload', function () { if (UIS && UIA.cs) UI.save(); });
document.addEventListener('visibilitychange', function () { if (document.hidden && UIS && UIA.cs) UI.save(); });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', UIBoot.boot); else UIBoot.boot();
