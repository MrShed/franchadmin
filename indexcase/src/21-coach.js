/* INDEX CASE UI — 21-coach.js: coach marks for the guided first outbreak.
 * A spotlight on the thing to touch, a short card, and it waits for you to do
 * it (or Next). Never blocks the rest of the screen. */
var UICoach = (function () {
  var C = {};
  function vis(sel) { return UI$$(sel).filter(function (el) { return el.offsetParent !== null || el.getClientRects().length; })[0] || null; }
  function tab(t) { return function () { return vis('.tab[data-tab=' + t + ']'); }; }
  function ta(re) { return function () { return UI$$('#sheet [data-ta]').filter(function (b) { return re.test(b.dataset.ta); })[0] || null; }; }
  var SCRIPTS = {
    tutorial: [
      { title: 'The incident room', text: 'You lead the public health response for the city. Something is making people ill at St Anne\'s Hospital. Nobody knows what it is yet — that is your job.', next: 'Begin' },
      { el: function () { return UI$('#tb-day'); }, title: 'One day at a time', text: 'Each turn is a day. The act tells you the phase: first you detect, then characterise, then contain.' },
      { el: function () { return UI$('#tb-res'); }, title: 'Your resources', text: 'Staff hours (tracers, field team, analysts), tests, hospital beds, public trust and budget. Hours refill every morning. Tap here any time for detail.' },
      { el: tab('brief'), go: 'brief', title: 'The briefing', text: 'Reports, lab results, the council, the press and the mayor all land here.', wait: 'tab:brief', skipIf: function () { return UIS.tab === 'brief'; } },
      { el: function () { return vis('.ib-it'); }, before: function () { UIS.brief.sub = 'inbox'; UIS.brief.filter = 'all'; UIBrief.render(); }, title: 'The first report', text: 'Open the report from the hospital.', wait: 'msg' },
      { el: function () { return vis('#br-doc .lnk.p'); }, title: 'Everything is a lead', text: 'Names, places and districts in any document are links. Tap a patient.', wait: 'sheet:person' },
      { el: ta(/interview/), title: 'Interview them', text: 'An interview tells you their symptoms, when they fell ill and where they have been. It costs tracer hours.', wait: 'act:interview', place: 'top' },
      { el: ta(/^test|test$/), title: 'Test them', text: 'Tests are scarce. A sample negative for every known pathogen is what gets the reference lab interested.', wait: 'act:test', place: 'top' },
      { el: function () { return UI$('#sheet [data-sh=close]'); }, title: 'Close the card', text: 'Interview and test the other patients in the report too — the pattern matters more than any one case.', wait: 'sheetclose' },
      { el: tab('map'), title: 'The map', text: 'Cases glow where people live — brightest for the most recent. Tap a district, a venue or a case.', wait: 'tab:map' },
      { el: function () { return UI$('#mp-layers'); }, title: 'Layers', text: 'Switch on clusters, venues and the wastewater signal, which rises before cases do.' },
      { el: tab('cases'), title: 'The line list', text: 'Every known case, with what you have done for each. The Curve and Ages views are where you will read the disease.', wait: 'tab:cases' },
      { el: tab('lab'), title: 'The lab', text: 'Results, the genome tree, wastewater by district — and the novel-agent screen that ends act one.', wait: 'tab:lab' },
      { el: function () { return UI$('#tb-end'); }, title: 'End the day', text: 'When you have spent what you can, end the day. Results and reports come in overnight.', wait: 'endpop' },
      { el: function () { return UI$('#pop-end'); }, title: 'Sleep on it', text: 'Unused hours are lost, so spend them first when you can.', wait: 'morning', place: 'bottom' },
      { title: 'Morning', text: 'Check the briefing for results. When samples come back negative for known pathogens, send them for the novel-agent screen in the Lab tab. Dr Okonjo (Briefing → Mentor) will nudge you if you are stuck. Good luck.', next: 'Got it' }
    ],
    tips: [
      { el: function () { return UI$('#tb-day'); }, title: 'The day', text: 'Each turn is a day; the act shows the phase of the outbreak.' },
      { el: function () { return UI$('#tb-res'); }, title: 'Resources', text: 'Staff hours, tests, beds, trust and budget. Tap for detail.' },
      { el: function () { return vis('#tabbar') || vis('.tb-tabs'); }, title: 'Five rooms', text: 'Map, Cases, Lab, Actions and Briefing. Names and places anywhere are tappable.' },
      { el: function () { return UI$('#tb-end'); }, title: 'End day', text: 'Results, reports and the disease move overnight.' }
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
    card.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.c === 'skip') C.stop(); else C.next(); });
    C.show();
  };
  C.resume = function () { if (UIS.coach && UIS.coach.name) C.start(UIS.coach.name, UIS.coach.i); };
  C.stop = function () { st = null; if (box) { box.hidden = true; box.innerHTML = ''; } if (UIS) { UIS.coach = null; UI.save(); } clearInterval(C._t); };
  C.next = function () { if (!st) return; st.i++; UIS.coach = { name: st.name, i: st.i }; UI.save(); C.show(); };
  C.step = function () { return st ? SCRIPTS[st.name][st.i] : null; };
  C.show = function () {
    var s = C.step(); if (!s) { C.stop(); return; }
    if (s.skipIf && s.skipIf()) { C.next(); return; }
    if (s.go && UIS.tab !== s.go && !s.wait) UI.go(s.go);
    if (s.before) s.before();
    var total = SCRIPTS[st.name].length;
    card.innerHTML = '<div class="co-k">' + (st.name === 'tutorial' ? 'First outbreak · ' : '') + (st.i + 1) + ' / ' + total + '</div><b>' + UIesc(s.title) + '</b><p>' + UIesc(s.text) + '</p><div class="co-row"><button class="btn xs ghost" data-c="skip">' + (st.name === 'tutorial' ? 'Skip tutorial' : 'Close') + '</button>' + (s.wait ? '<span class="co-wait">' + UIICON.chev + 'Your move</span>' : '<button class="btn sm ice" data-c="next">' + UIesc(s.next || 'Next') + '</button>') + '</div>';
    C.place();
    clearInterval(C._t); C._t = setInterval(C.place, 350);
  };
  C.place = function () {
    var s = C.step(); if (!s || !box) return;
    var el = s.el ? s.el() : null, W = window.innerWidth, H = window.innerHeight;
    if (el) {
      var r = el.getBoundingClientRect(), p = 6;
      if (r.width === 0 && r.height === 0) el = null;
      else {
        spot.style.cssText = 'left:' + (r.left - p) + 'px;top:' + (r.top - p) + 'px;width:' + (r.width + p * 2) + 'px;height:' + (r.height + p * 2) + 'px;opacity:1';
        var cw = Math.min(340, W - 24), below = s.place === 'bottom' || (s.place !== 'top' && r.bottom + 12 + 170 < H);
        card.style.width = cw + 'px';
        card.style.left = UIclamp(r.left + r.width / 2 - cw / 2, 12, W - cw - 12) + 'px';
        if (below) { card.style.top = Math.min(H - card.offsetHeight - 12, r.bottom + p + 12) + 'px'; }
        else card.style.top = Math.max(12, r.top - p - 12 - card.offsetHeight) + 'px';
        box.classList.add('has-el');
      }
    }
    if (!el) {
      spot.style.cssText = 'left:50%;top:40%;width:0;height:0;opacity:' + (s.el ? 0 : 1);
      var cw2 = Math.min(360, W - 32); card.style.width = cw2 + 'px'; card.style.left = (W - cw2) / 2 + 'px'; card.style.top = Math.max(20, H * 0.36 - card.offsetHeight / 2) + 'px';
      box.classList.toggle('has-el', false);
    }
  };
  UI.on(function (ev, data) {
    if (!st) return;
    var s = C.step(); if (!s || !s.wait) { if (ev === 'refresh' || ev === 'sheet' || ev === 'tab') setTimeout(C.place, 30); return; }
    var w = s.wait.split(':'), ok = false;
    if (w[0] === 'morning' && ev === 'endpopclose' && !UI.busy) { st.i--; C.show(); return; }
    if (w[0] === 'tab' && ev === 'tab' && data === w[1]) ok = true;
    else if (w[0] === 'msg' && ev === 'msg') ok = true;
    else if (w[0] === 'sheet' && ev === 'sheet' && (!w[1] || String(data).indexOf(w[1]) === 0)) ok = true;
    else if (w[0] === 'sheetclose' && ev === 'sheetclose') ok = true;
    else if (w[0] === 'act' && ev === 'act' && new RegExp(w[1]).test(data.id)) ok = true;
    else if (w[0] === 'endpop' && ev === 'endpop') ok = true;
    else if (w[0] === 'morning' && (ev === 'morning' || ev === 'actcard')) ok = true;
    if (ok) setTimeout(C.next, ev === 'sheet' || ev === 'endpop' ? 380 : 120);
    else setTimeout(C.place, 30);
  });
  window.addEventListener('resize', function () { if (st) C.place(); });
  return C;
})();
