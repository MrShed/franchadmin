/* INDEX CASE UI — 19-actions.js: investigations and orders by area, active
 * orders with revoke, target pickers and the confirm sheet (with params). */
var UIActions = UI.views.actions = {
  build: function (root) {
    var self = this;
    root.innerHTML = '<div class="scroll"><div class="pad"><div class="vhead"><div style="flex:1"><div class="eyebrow">What you can do today</div><h2>Actions</h2></div></div><div id="ac-body"></div></div></div>';
    UI$('#ac-body').addEventListener('click', function (e) {
      var rv = e.target.closest('[data-revoke]');
      if (rv) {
        if (!rv.classList.contains('armed')) { rv.classList.add('armed'); rv.textContent = 'Tap to confirm'; setTimeout(function () { if (rv.isConnected) { rv.classList.remove('armed'); rv.textContent = 'Revoke'; } }, 3000); return; }
        UIA.revoke(rv.dataset.revoke); UIAudio.cue('close'); UItoast('Order revoked'); UI.save(); UI.refresh(); return;
      }
      var a = e.target.closest('[data-a]'); if (a) { UIAudio.cue('tap'); self.start(UIA.action(a.dataset.a)); return; }
      var s = e.target.closest('[data-area]'); if (s) { UIS.acOpen = UIS.acOpen || {}; UIS.acOpen[s.dataset.area] = !self.isOpen(s.dataset.area); self.render(); }
    });
  },
  show: function () { this.render(); },
  refresh: function () { this.render(); },
  isOpen: function (area) { var o = UIS.acOpen || {}; return o[area] === undefined ? true : o[area]; },
  render: function () {
    var self = this, acts = UIA.actions(), ords = UIA.orders(), day = UIA.day();
    var html = '';
    if (ords.length) {
      html += '<div class="card"><div class="card-h"><div class="t"><div class="eyebrow">' + UIfmt.plural(ords.length, 'order') + ' in force</div><h3>Active orders</h3></div><div class="aside">' + UIfmt.money(UIsum(ords.map(function (o) { return o.costPerDay; }))) + '/day</div></div><div class="card-b"><div class="ords">' + ords.map(function (o) {
        var live = day - o.since, lag = Math.max(0, o.effectFrom - o.since), f = lag ? UIclamp(live / lag, 0, 1) : 1, tgt = o.target ? (UIA.place(o.target) || UIA.district(o.target) || { name: o.target }).name : '';
        return '<div class="ord"><div class="ord-t"><b>' + UIesc(o.label) + '</b>' + (tgt ? '<span>' + UIesc(tgt) + '</span>' : '') + '</div>' +
          '<div class="ord-m"><span class="bar"><i style="width:' + (f * 100).toFixed(0) + '%;background:' + (f >= 1 ? 'var(--teal)' : 'var(--ice)') + '"></i></span><em>' + (f >= 1 ? 'In effect' : 'Takes hold in ~' + Math.max(1, o.effectFrom - day) + 'd') + '</em></div>' +
          '<div class="ord-f"><span>Since ' + UIesc(UIA.dateShort(o.since)) + '</span>' + (o.compliance !== null ? '<span>Compliance <b>' + Math.round(o.compliance * 100) + '%</b></span>' : '') + (o.costPerDay ? '<span>' + UIfmt.money(o.costPerDay) + '/day</span>' : '') + (o.economyPerDay ? '<span class="eco">Economy ' + UIfmt.money(o.economyPerDay) + '/day</span>' : '') + '<button class="btn xs danger" data-revoke="' + UIesc(o.id) + '">Revoke</button></div></div>';
      }).join('') + '</div></div></div>';
    }
    UIAREAS.forEach(function (ar) {
      var list = acts.filter(function (a) { return a.area === ar.id; });
      if (!list.length) return;
      var open = self.isOpen(ar.id);
      html += '<section class="ac-sec' + (open ? ' open' : '') + '"><button class="ac-h" data-area="' + ar.id + '"><span class="ac-ic">' + UIICON[ar.ic] + '</span><span class="t"><b>' + ar.l + '</b><small>' + ar.sub + '</small></span><span class="n">' + list.length + '</span><svg class="chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>' +
        (open ? '<div class="ac-list">' + list.map(function (a) { return self.card(a); }).join('') + '</div>' : '') + '</section>';
    });
    if (!acts.length) html += '<div class="empty"><b>No actions</b>The engine offered nothing today.</div>';
    UI$('#ac-body').innerHTML = '<div class="stack">' + html + '</div>';
  },
  TGT: { 'case': 'Choose a case', person: 'Choose a person', place: 'Choose a place', venue: 'Choose a place', district: 'Choose a district', none: '' },
  card: function (a) {
    var isOrder = a.kind === 'order' || a.area === 'contain' || a.area === 'protect';
    return '<button class="ac-card' + (a.available ? '' : ' dis') + '" data-a="' + UIesc(a.id) + '"><span class="ac-t"><b>' + UIesc(a.label) + '</b>' + (a.target !== 'none' ? '<em>' + UIesc(this.TGT[a.target] || a.target) + '</em>' : isOrder ? '<em>City-wide</em>' : '') + '</span>' +
      (a.desc ? '<span class="ac-d">' + UIesc(a.desc) + '</span>' : '') + (a.effect ? '<span class="ac-e">' + UIICON.spark + UIesc(a.effect) + '</span>' : '') +
      '<span class="ac-c">' + UIcosts(a, { lag: true }) + (a.available ? '' : '<span class="ac-why">' + UIesc(a.why) + '</span>') + '</span></button>';
  },

  /** begin an action: pick a target if needed, else confirm */
  start: function (a) {
    if (!a) return;
    if (a.target === 'none' || !a.target) { this.confirm(a, null); return; }
    this.picker(a);
  },
  picker: function (a) {
    var self = this, t = a.target, items = [];
    if (t === 'case' || t === 'person') {
      var cs = UIA.cases().filter(function (c) { return c.status !== 'died' || /seq|record/.test(a.id); }).sort(function (x, y) { return (y.reported || 0) - (x.reported || 0); });
      items = cs.map(function (c) {
        var done = (/interview/.test(a.id) && c.interviewed) || (/trace/.test(a.id) && c.traced) || (/seq/.test(a.id) && c.seq);
        return { id: c.pid, label: c.name, small: UIfmt.age(c) + ' · ' + (UIA.district(c.district) || { name: '' }).name + ' · ' + UIstatus(c.status).l + (done ? ' · done' : ''), face: c, done: done, q: c.name + ' ' + (UIA.district(c.district) || { name: '' }).name };
      });
      items.sort(function (x, y) { return (x.done ? 1 : 0) - (y.done ? 1 : 0); });
    } else if (t === 'place' || t === 'venue') {
      var cl = {}; UIA.clusters().forEach(function (c) { if (c.place) cl[c.place] = c.size; });
      items = UIA.city().places.filter(function (p) { return !a.targetKinds || a.targetKinds.indexOf(p.kind) >= 0; }).map(function (p) { return { id: p.id, label: p.name, small: UIplaceKind(p.kind)[0] + ' · ' + (UIA.district(p.district) || { name: '' }).name + (cl[p.id] ? ' · cluster of ' + cl[p.id] : ''), glyph: UIplaceKind(p.kind)[1], hot: cl[p.id] || 0, q: p.name + ' ' + p.kind }; }).sort(function (x, y) { return y.hot - x.hot || x.label.localeCompare(y.label); });
    } else if (t === 'district') {
      var cnt = {}; UIA.cases().forEach(function (c) { cnt[c.district] = (cnt[c.district] || 0) + 1; });
      items = UIA.city().districts.map(function (d) { return { id: d.id, label: d.name, small: UIfmt.n(d.pop) + ' people · ' + (cnt[d.id] || 0) + ' cases', hot: cnt[d.id] || 0, q: d.name }; }).sort(function (x, y) { return y.hot - x.hot; });
    }
    function rowsHTML(q) {
      q = (q || '').toLowerCase();
      var f = items.filter(function (it) { return !q || it.q.toLowerCase().indexOf(q) >= 0; }).slice(0, 80);
      if (!f.length) return '<div class="empty">' + (items.length ? 'No match.' : 'Nothing to choose from yet.') + '</div>';
      return '<div class="list">' + f.map(function (it) {
        var ic = it.face ? '<span class="mini-face">' + UIPortrait.svg(it.face) + '</span>' : it.glyph ? '<b style="font:700 13px var(--f-mono)">' + UIesc(it.glyph) + '</b>' : UIICON.map;
        var why = UIA.canAct(a.id, it.id);
        return UIli({ attrs: 'data-pick="' + UIesc(it.id) + '"', ic: ic, icStyle: it.face ? 'background:none;padding:0;overflow:hidden' : it.glyph ? 'color:var(--teal2);background:rgba(63,208,170,.1)' : '', label: UIesc(it.label), small: UIesc(it.small) + (why ? ' · <span style="color:var(--amber)">' + UIesc(why) + '</span>' : ''), dis: !!why });
      }).join('') + '</div>';
    }
    UIsheet.open({ eyebrow: UIesc(a.label), title: this.TGT[t] || 'Choose', tag: 'picker', html: '<div style="margin-bottom:6px">' + UIcosts(a, { lag: true }) + '</div>' + (items.length > 6 ? '<div class="cs-search" style="margin:10px 0">' + UIICON.search + '<input id="pk-q" type="search" placeholder="Search" autocomplete="off"></div>' : '') + '<div id="pk-list">' + rowsHTML('') + '</div>',
      mount: function (b) {
        var q = UI$('#pk-q', b); if (q) q.addEventListener('input', function () { UI$('#pk-list', b).innerHTML = rowsHTML(q.value); });
        b.addEventListener('click', function (e) { var r = e.target.closest('[data-pick]'); if (!r) return; self.confirm(a, r.dataset.pick, { push: true }); });
      } });
  },
  paramHTML: function (p, i) {
    var id = 'prm-' + i, lab = '<label class="eyebrow" for="' + id + '">' + UIesc(p.label || p.id) + '</label>';
    if (p.type === 'choice' || p.options) return '<div class="field">' + lab + '<div class="seg wrap" data-prm="' + UIesc(p.id) + '">' + p.options.map(function (o, k) { var v = typeof o === 'object' ? o.id : o, l = typeof o === 'object' ? o.label : o; return '<button type="button" data-v="' + UIesc(v) + '" class="' + ((p.value !== undefined ? p.value === v : k === 0) ? 'on' : '') + '">' + UIesc(l) + '</button>'; }).join('') + '</div></div>';
    if (p.type === 'bool') return '<div class="field"><label class="chk"><input type="checkbox" data-prm="' + UIesc(p.id) + '"' + (p.value ? ' checked' : '') + '> ' + UIesc(p.label || p.id) + '</label></div>';
    if (p.type === 'order' && p.items) return '<div class="field">' + lab + '<div class="ordl" data-prm="' + UIesc(p.id) + '">' + p.items.map(function (it) { var v = typeof it === 'object' ? it.id : it, l = typeof it === 'object' ? it.label : it; return '<div class="ordl-i" data-v="' + UIesc(v) + '"><span class="n"></span><span class="l">' + UIesc(l) + '</span><button type="button" class="ibtn" data-up aria-label="Move up">▲</button><button type="button" class="ibtn" data-dn aria-label="Move down">▼</button></div>'; }).join('') + '</div></div>';
    var min = p.min !== undefined ? p.min : 0, max = p.max !== undefined ? p.max : 100, val = p.value !== undefined ? p.value : p.default !== undefined ? p.default : min;
    return '<div class="field"><label class="eyebrow" for="' + id + '">' + UIesc(p.label || p.id) + ': <b data-rv style="color:var(--ink)">' + val + '</b>' + (p.unit ? ' ' + UIesc(p.unit) : '') + '</label><input type="range" id="' + id + '" data-prm="' + UIesc(p.id) + '" min="' + min + '" max="' + max + '" step="' + (p.step || 1) + '" value="' + val + '"></div>';
  },
  readParams: function (b) {
    var out = {};
    UI$$('[data-prm]', b).forEach(function (el) {
      var k = el.dataset.prm;
      if (el.classList.contains('seg')) { var on = el.querySelector('.on'); out[k] = on ? (/^-?\d+(\.\d+)?$/.test(on.dataset.v) ? +on.dataset.v : on.dataset.v) : null; }
      else if (el.classList.contains('ordl')) out[k] = UI$$('.ordl-i', el).map(function (x) { return x.dataset.v; });
      else if (el.type === 'checkbox') out[k] = el.checked;
      else out[k] = +el.value;
    });
    return out;
  },
  confirm: function (a, target, o) {
    o = o || {};
    var self = this, isOrder = a.kind === 'order' || a.area === 'contain' || a.area === 'protect';
    var tname = target ? (UIA.caseOf(target) || UIA.place(target) || UIA.district(target) || { name: target }).name : null;
    var html = (tname ? '<div class="cf-tgt">' + (UIA.caseOf(target) ? '<span class="mini-face" style="width:38px;height:38px">' + UIPortrait.svg(UIA.caseOf(target)) + '</span>' : '<span class="ac-ic" style="width:38px;height:38px">' + UIICON.pin + '</span>') + '<b>' + UIesc(tname) + '</b></div>' : '') +
      (a.desc ? '<p class="dim" style="margin:10px 0">' + UIesc(a.desc) + '</p>' : '') +
      (a.effect ? '<div class="cf-row"><span class="eyebrow">Expected effect</span><p>' + UIesc(a.effect) + '</p></div>' : '') +
      (a.lag ? '<div class="cf-row"><span class="eyebrow">Lag</span><p>About ' + a.lag + ' day' + (a.lag > 1 ? 's' : '') + ' before it shows' + (isOrder ? ' in who gets infected — and a week or more after that in the curve.' : '.') + '</p></div>' : '') +
      '<div class="cf-row"><span class="eyebrow">Cost</span><div style="margin-top:4px">' + UIcosts(a) + '</div></div>' +
      (a.params ? (Array.isArray(a.params) ? a.params : Object.keys(a.params).map(function (k) { var p = a.params[k]; p.id = p.id || k; return p; })).map(function (p, i) { return self.paramHTML(p, i); }).join('') : '') +
      (!a.available ? '<p class="cf-why">' + UIICON.warn + UIesc(a.why || 'Not available') + '</p>' : '') +
      '<button class="btn ' + (isOrder ? 'pri' : 'ice') + ' block" id="cf-go" style="margin-top:14px"' + (a.available ? '' : ' disabled') + '>' + (isOrder ? UIICON.shield + 'Issue the order' : UIICON.check + UIesc(a.label)) + '</button>';
    UIsheet.open({ eyebrow: isOrder ? 'Order' : UIesc((UIAREAS.filter(function (x) { return x.id === a.area; })[0] || { l: '' }).l), title: a.label, push: o.push, tag: 'confirm:' + a.id, html: html,
      mount: function (b) {
        b.addEventListener('click', function (e) {
          var sb = e.target.closest('.seg button'); if (sb && sb.closest('[data-prm]')) { UI$$('button', sb.parentNode).forEach(function (x) { x.classList.toggle('on', x === sb); }); return; }
          var up = e.target.closest('[data-up],[data-dn]'); if (up) { var it = up.closest('.ordl-i'); if (up.hasAttribute('data-up') && it.previousElementSibling) it.parentNode.insertBefore(it, it.previousElementSibling); else if (up.hasAttribute('data-dn') && it.nextElementSibling) it.parentNode.insertBefore(it.nextElementSibling, it); return; }
        });
        UI$$('input[type=range]', b).forEach(function (r) { r.addEventListener('input', function () { var l = r.parentNode.querySelector('[data-rv]'); if (l) l.textContent = r.value; }); });
        UI$('#cf-go', b).addEventListener('click', function () {
          var r = UI.run(a.id, target, self.readParams(b));
          if (r.ok) { var back = UIsheet.stack.length && UIsheet.stack[UIsheet.stack.length - 1]; if (back && back.tag === 'picker') UIsheet.close(); else if (UIsheet.stack.length) UIsheet.back(); else UIsheet.close(); }
        });
      } });
  },
  /** action rows inside a person / place / district sheet */
  targetActionsHTML: function (acts, target, title) {
    if (!acts.length) return '';
    return '<div class="eyebrow sh-sec">' + UIesc(title || 'Actions here') + '</div><div class="list">' + acts.map(function (a) {
      var why = a.available ? UIA.canAct(a.id, target) : a.why; if (why) a = Object.assign({}, a, { available: false, why: why });
      var ic = /timing/.test(a.id) ? UIICON.clock : /interview/.test(a.id) ? UIICON.mic : /trace|house/.test(a.id) ? UIICON.people : /seq/.test(a.id) ? UIICON.dna : /test/.test(a.id) ? UIICON.test : /visit|site/.test(a.id) ? UIICON.pin : /question/.test(a.id) ? UIICON.report : /close|shut/.test(a.id) ? UIICON.shield : UIICON.spark;
      return UIli({ attrs: 'data-ta="' + UIesc(a.id) + '"', ic: ic, label: UIesc(a.label), small: a.available ? UIesc(a.desc || '') : '<span style="color:var(--amber)">' + UIesc(a.why) + '</span>', right: UIcosts(a), dis: !a.available });
    }).join('') + '</div>';
  },
  bindTargetActions: function (b, target) {
    var self = this;
    b.addEventListener('click', function (e) {
      var r = e.target.closest('[data-ta]'); if (!r || r.disabled) return;
      var a = UIA.action(r.dataset.ta); if (!a) return;
      var isOrder = a.kind === 'order' || a.area === 'contain' || a.area === 'protect';
      if (isOrder || a.params) self.confirm(a, target, { push: true });
      else { r.disabled = true; UI.run(a.id, target); }
    });
  }
};
