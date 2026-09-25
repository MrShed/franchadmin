/* DEPTH UI — 21-coach.js: coach marks for the guided first case. A spotlight
 * on the thing to touch, a short card, and it waits for you to do it (or
 * Next). It never blocks the rest of the screen. */
var UICoach = (function () {
  var C = {};
  function vis(sel) { return UI$$(sel).filter(function (el) { return el.getClientRects().length && el.offsetParent !== null; })[0] || null; }
  function tab(t) { return function () { return vis('.tab[data-tab=' + t + ']'); }; }
  function mentor() { return UIA.mentorInfo().short; }
  var SCRIPTS = {
    tutorial: [
      { title: 'Station Kestrel', text: 'A spy ring in Haldmar talks by radio. Tonight you learn the loop: listen, fix, break, chart, act. Follow the lit spots; you can leave the guide any time.', next: 'Begin', go: 'receiver' },
      { el: function () { return UI$('#tb-clock'); }, title: 'Station time', text: 'Time only moves when you act: copying a transmission takes its length, bench work a few minutes, waiting what you choose. The watch ends at 02:00.' },
      { el: function () { return vis('#rx-timebar .next') || vis('.sb-btns .next') || vis('.sb-strip'); }, go: 'receiver', title: 'The first broadcast', text: 'The case file gives the controller’s schedule. Wait for it — the dial will be set close to its frequency.', wait: 'waited' },
      { el: function () { return vis('.crt'); }, title: 'Centre it', text: 'Drag the green trace onto the red hairline (or turn FINE, below). The whistle falls away when you are dead on. Voice needs the lever on AM.', wait: 'copyready', place: 'bottom' },
      { el: function () { return vis('#rx-copy'); }, title: 'Copy', text: 'Press COPY. While the interval tune plays, keep the drifting trace on the line.', wait: 'copystart', place: 'top' },
      { el: function () { return vis('.crt'); }, title: 'Hold it', text: 'Steady hands mean fewer lost digits. Then the numbers come in on the green tape and into the log.', wait: 'copied' },
      { el: function () { return vis('#rx-log'); }, title: 'The log sheet', text: 'Every copy goes here: time, frequency, callsign, the groups. The first group is the pad page. Lost digits are ringed in red.' },
      { el: tab('bench'), title: 'The workbench', text: 'Every message lands on the bench as a card. When two cards start with the same page number, the pad clerk was lazy — that is a depth, and it can be read.', wait: 'tab:bench' },
      { el: tab('desk'), title: 'The desk', text: 'Briefs, Special Branch reports, warrants, the operation card and ' + 'your supervisor’s hints live here.', wait: 'tab:desk' },
      { el: tab('map'), title: 'The map', text: 'Ask for DF bearings while a set is on the air and the cones cross here. A good fix can be searched street by street with the van.', wait: 'tab:map' },
      { el: tab('traffic'), title: 'Traffic', text: 'Draw who talks to whom. The station inks a link when the log backs it.', wait: 'tab:traffic' },
      { el: tab('receiver'), title: 'Back to the set', text: 'The agents answer in Morse at times you have to learn.', wait: 'tab:receiver' },
      { el: function () { return vis('.sb-btns [data-w=watch]'); }, title: 'Watch the band', text: 'This waits in five-minute steps until something new comes up, and marks it on the display. Copy it on CW, and press DF while it is on the air.' },
      { title: 'Your case', text: 'Copy, fix, break, act. When the night is spent, End shift. If you are stuck, ask ' + 'the night supervisor on the Desk — the first nudge each night is free. Good hunting.', next: 'Got it' }
    ]
  };
  var st = null, box, spot, card;
  C.active = function () { return !!st; };
  C.start = function (name, step) {
    st = { name: name, i: step || 0 };
    UIS.coach = { name: name, i: st.i }; UI.save();
    box = UI$('#coach'); box.hidden = false;
    box.innerHTML = '<div class="co-spot" id="co-spot"></div><div class="co-card" id="co-card"></div>';
    spot = UI$('#co-spot'); card = UI$('#co-card');
    card.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; UIAudio.cue('tap'); if (b.dataset.c === 'skip') C.stop(); else C.next(); });
    C.show();
  };
  C.resume = function () { if (UIS.coach && UIS.coach.name) C.start(UIS.coach.name, UIS.coach.i); };
  C.stop = function () { st = null; if (box) { box.hidden = true; box.innerHTML = ''; } if (UIS) { UIS.coach = null; UI.save(); } clearInterval(C._t); };
  C.next = function () { if (!st) return; st.i++; UIS.coach = { name: st.name, i: st.i }; UI.save(); C.show(); };
  C.step = function () { return st ? SCRIPTS[st.name][st.i] : null; };
  C.show = function () {
    var s = C.step(); if (!s) { C.stop(); return; }
    if (s.go && UIS.tab !== s.go) UI.go(s.go);
    var total = SCRIPTS[st.name].length;
    var text = s.text.replace('the night supervisor', mentor());
    card.innerHTML = '<div class="co-k">First case · ' + (st.i + 1) + ' of ' + total + '</div><b>' + UIesc(s.title) + '</b><p>' + UIesc(text) + '</p><div class="co-row"><button class="btn xs ghost" data-c="skip">Leave the guide</button>' + (s.wait ? '<span class="co-wait">' + UIICON.chev + 'Your move</span>' : '<button class="btn sm pri" data-c="next">' + UIesc(s.next || 'Next') + '</button>') + '</div>';
    C.place();
    clearInterval(C._t); C._t = setInterval(C.place, 350);
  };
  C.place = function () {
    var s = C.step(); if (!s || !box) return;
    var el = s.el ? s.el() : null, W = window.innerWidth, H = window.innerHeight;
    if (el) {
      var r = el.getBoundingClientRect(), p = 6;
      if (r.width && (r.bottom > H - 60 || r.top < 50) && C._scrolled !== st.i) { C._scrolled = st.i; try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { el.scrollIntoView(); } setTimeout(C.place, 450); }
      if (!r.width && !r.height) el = null;
      else {
        spot.style.cssText = 'left:' + (r.left - p) + 'px;top:' + (r.top - p) + 'px;width:' + (r.width + p * 2) + 'px;height:' + (r.height + p * 2) + 'px;opacity:1';
        var cw = Math.min(340, W - 24), ch = card.offsetHeight, below = s.place === 'bottom' || (s.place !== 'top' && r.bottom + 12 + ch < H);
        if (s.place === 'top' && r.top - ch - 20 < 0) below = true;
        card.style.width = cw + 'px';
        card.style.left = UIclamp(r.left + r.width / 2 - cw / 2, 12, W - cw - 12) + 'px';
        card.style.top = (below ? Math.min(H - ch - 12, r.bottom + p + 12) : Math.max(12, r.top - p - 12 - ch)) + 'px';
        box.classList.add('has-el');
      }
    }
    if (!el) {
      spot.style.cssText = 'left:50%;top:40%;width:0;height:0;opacity:' + (s.el ? 0 : 1);
      var cw2 = Math.min(360, W - 32); card.style.width = cw2 + 'px'; card.style.left = (W - cw2) / 2 + 'px'; card.style.top = Math.max(20, H * 0.36 - card.offsetHeight / 2) + 'px';
      box.classList.remove('has-el');
    }
  };
  UI.on(function (ev, data) {
    if (!st) return;
    var s = C.step(); if (!s || !s.wait) { setTimeout(C.place, 30); return; }
    var w = s.wait.split(':'), ok = false;
    if (w[0] === 'tab' && ev === 'tab' && data === w[1]) ok = true;
    else if (w[0] === ev) ok = true;
    if (ok) setTimeout(C.next, 150); else setTimeout(C.place, 30);
  });
  window.addEventListener('resize', function () { if (st) C.place(); });
  return C;
})();
