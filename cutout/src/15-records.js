/* CUTOUT UI — 15-records.js: the query terminal. */
var UIRecords = UI.views.records = {
  sel: null, // {sys, type, key, hotel, date}
  build: function (root) {
    root.innerHTML = '<div class="rq-wrap" style="position:absolute;inset:0"><div class="rq-left" style="flex:1;position:relative"><div class="scroll"><div class="pad">' +
      '<div class="lbl">Record systems</div><div class="rq-sys" id="rq-sys"></div>' +
      '<div class="term" id="rq-term"></div>' +
      '<div class="rq-log"><div class="lbl">Requests</div><div id="rq-log"></div></div>' +
      '</div></div></div><div class="rq-prev"><div class="scroll"><div class="vw-inner" id="rq-prev"></div></div></div></div>';
    UI$('#rq-sys').addEventListener('click', function (e) { var b = e.target.closest('.sys'); if (!b) return; UIS.recSys = b.dataset.s; UIS.recType = null; UIRecords.sel = null; UIRecords.render(); UI.save(); });
    UI$('#rq-log').addEventListener('click', function (e) { var b = e.target.closest('.it'); if (!b) return; UIRecords.preview(b.dataset.doc, true); });
    UI.bindTokens(UI$('#rq-prev'));
  },
  show: function () {
    this.render();
    var pv = UI$('#rq-prev');
    if (pv && !pv.dataset.doc) pv.innerHTML = '<div class="vw-empty" style="min-height:70vh">' + UIICON.file + '<div>Results arrive here as documents<br>and are filed on your desk.</div></div>';
  },
  refresh: function () { this.render(); },
  types: function (S) { return S.keys; },
  render: function () {
    var sysList = UIA.systems();
    var cur = UIS.recSys || 'hotels';
    var S = UIA.system(cur) || sysList[0];
    UI$('#rq-sys').innerHTML = sysList.map(function (s) {
      var n = UIA.keysFor(s.id).length;
      return '<button class="sys' + (s.id === S.id ? ' on' : '') + '" data-s="' + s.id + '"><span class="h">' + s.hours + 'h</span><b>' + UIesc(s.label.replace(' (court order)', '')) + '</b><small>' + UIesc(UISYSHINT[s.id]) + '</small><small style="color:' + (n ? 'var(--brass2)' : 'var(--faint)') + '">' + n + ' key' + (n === 1 ? '' : 's') + ' held</small></button>';
    }).join('');
    var types = S.keys;
    var ty = UIS.recType && types.indexOf(UIS.recType) >= 0 ? UIS.recType : types[0];
    var tLabel = function (t) { return t === 'hotel+date' ? 'Hotel & night' : (UITYPE[t] || t); };
    var html = '<div class="scr"><span class="lbl" style="color:#5fa56a">' + UIesc(S.label.toUpperCase()) + '</span>\nSEARCH BY ' + UIesc(tLabel(ty).toUpperCase()) + ' — COST ' + S.hours + ' TEAM-HOUR' + (S.hours > 1 ? 'S' : '') + (S.id === 'bank' ? '\nA JUDGE WILL SIGN THE ORDER. HE IS NOT HAPPY ABOUT IT.' : '') + '</div>';
    if (types.length > 1) html += '<div class="seg" style="margin:10px 0">' + types.map(function (t) { return '<button data-ty="' + t + '" class="' + (t === ty ? 'on' : '') + '">' + UIesc(tLabel(t)) + '</button>'; }).join('') + '</div>';
    else html += '<div style="height:10px"></div>';
    if (ty === 'hotel+date') {
      html += '<div class="ac" id="rq-ac-h"><input type="text" placeholder="Hotel…" autocomplete="off" spellcheck="false" aria-label="Hotel"><div class="ac-list"></div></div>';
      html += '<div class="ac" id="rq-ac-d" style="margin-top:8px"><input type="text" placeholder="Night of…" autocomplete="off" spellcheck="false" aria-label="Night"><div class="ac-list"></div></div>';
    } else html += '<div class="ac" id="rq-ac"><input type="text" placeholder="Type or choose a ' + UIesc(tLabel(ty).toLowerCase()) + ' you hold…" autocomplete="off" spellcheck="false" aria-label="Key"><div class="ac-list"></div></div>';
    html += '<div class="go"><button class="btn" id="rq-go" disabled>Send request</button><span class="cost" id="rq-msg"></span></div>';
    var term = UI$('#rq-term');
    term.innerHTML = html;
    var self = this;
    self.sel = { sys: S.id, type: ty };
    UI$$('.seg button', term).forEach(function (b) { b.addEventListener('click', function () { UIS.recType = b.dataset.ty; self.render(); }); });
    var keys = UIA.keysFor(S.id);
    function upd() {
      var ok = false, msg = '';
      var s = self.sel;
      if (ty === 'hotel+date') ok = !!(s.hotel && s.date !== undefined);
      else ok = !!s.key;
      if (UIA.over()) { ok = false; msg = 'Case closed'; }
      else if (UIA.hoursLeft() < S.hours) { ok = false; msg = 'Not enough hours today'; }
      else msg = ok ? S.hours + 'h of ' + UIA.hoursLeft() + 'h left' : '';
      UI$('#rq-go').disabled = !ok;
      UI$('#rq-msg').textContent = msg;
      UI$('#rq-msg').className = 'cost' + (UIA.hoursLeft() < S.hours ? ' err' : '');
    }
    if (ty === 'hotel+date') {
      UIautocomplete(UI$('#rq-ac-h'), { items: function () { return keys.filter(function (k) { return k.t === 'hotel'; }).map(function (k) { return { v: k.v, d: k.v, tag: '' }; }); }, empty: 'No hotel names in your documents yet.', onPick: function (it) { self.sel.hotel = it.v; UI$('#rq-ac-h input').value = it.v; UI$('#rq-ac-h .ac-list').innerHTML = ''; upd(); }, onInput: function () { self.sel.hotel = null; upd(); } });
      UIautocomplete(UI$('#rq-ac-d'), { items: function () { return UIA.known().filter(function (k) { return k.t === 'date' && +k.v < UIA.day(); }).sort(function (a, b) { return b.v - a.v; }).map(function (k) { return { v: k.v, d: UIA.dateLabel(+k.v), tag: 'night' }; }); }, empty: 'No past dates in your documents yet.', onPick: function (it) { self.sel.date = +it.v; UI$('#rq-ac-d input').value = it.d; UI$('#rq-ac-d .ac-list').innerHTML = ''; upd(); }, onInput: function () { self.sel.date = undefined; upd(); } });
    } else {
      UIautocomplete(UI$('#rq-ac'), {
        items: function () { return keys.filter(function (k) { return k.t === ty; }).map(function (k) { return { v: k.v, d: k.d || k.v, tag: UIS.queries.some(function (q) { return q.sys === S.id && q.k === ty + ':' + k.v; }) ? 'pulled' : '' }; }); },
        empty: 'You hold no ' + tLabel(ty).toLowerCase() + ' yet. Keys come from documents.',
        onPick: function (it) { self.sel.key = { t: ty, v: it.v, d: it.d }; UI$('#rq-ac input').value = it.d; UI$('#rq-ac .ac-list').innerHTML = ''; upd(); },
        onInput: function () {
          var v = UI$('#rq-ac input').value.trim().toLowerCase();
          var m = keys.filter(function (k) { return k.t === ty && ((k.d || k.v).toLowerCase() === v || k.v.toLowerCase() === v); })[0];
          self.sel.key = m ? { t: ty, v: m.v, d: m.d } : null; upd();
        }
      });
    }
    UI$('#rq-go').addEventListener('click', function () { self.send(); });
    upd();
    this.renderLog();
  },
  send: function () {
    var s = this.sel, self = this;
    var key = s.type === 'hotel+date' ? { t: 'hotel+date', hotel: s.hotel, date: s.date } : { t: s.key.t, v: s.key.v, d: s.key.d };
    var scr = UI$('#rq-term .scr');
    UI$('#rq-go').disabled = true;
    scr.innerHTML += '\n&gt; REQUEST SENT<span class="blink">▌</span>';
    setTimeout(function () {
      var wide = window.innerWidth >= 900;
      var doc = UI.runQuery(s.sys, key, { stay: wide });
      if (doc && wide) { self.render(); self.preview(doc.id); }
      else if (!doc) self.render();
    }, 650);
  },
  preview: function (id, fromLog) {
    if (window.innerWidth < 900) { UI.go('desk', { open: id }); return; }
    var d = UIA.doc(id); if (!d) return;
    UIS.read[id] = 1; UI.badges();
    var el = UI$('#rq-prev');
    el.dataset.doc = id;
    UIDoc.setHighlights(UIS.hl);
    el.innerHTML = UIDoc.render(d);
  },
  renderLog: function () {
    var q = UIS.queries.slice().reverse().slice(0, 40);
    UI$('#rq-log').innerHTML = q.length ? q.map(function (x) {
      return '<button class="it" data-doc="' + x.doc + '"><span class="ic" style="font:700 11px var(--f-type);color:var(--brass2);width:34px">' + UISYSABBR[x.sys] + '</span><b>' + UIesc(x.label) + '</b><small>' + UIesc(UIA.dateLabel(x.day)) + '</small></button>';
    }).join('') : '<p class="muted" style="font-size:13px">No requests yet. Every name, number and plate you pull must first appear in a document.</p>';
  }
};
