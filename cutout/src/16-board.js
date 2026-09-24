/* CUTOUT UI — 16-board.js: the evidence wall.
 * Cards: subject (engine subjects: label + names), doc (pinned document),
 * note (free text), tok (a pinned identifier). Strings join cards.
 * Pointer Events: one finger drags a card or pans; two fingers pinch-zoom;
 * wheel zooms on desktop. Tap a card, "Link", tap another card.
 */
var UIBoard = UI.views.board = {
  sel: null, selLink: null, linkFrom: null,
  B: function () { return UIS.board; },
  build: function (root) {
    root.innerHTML = '<div class="bd" id="bd"><div class="bd-world" id="bd-world"><svg class="bd-svg" id="bd-svg" width="1" height="1"></svg></div>' +
      '<div class="bd-empty" id="bd-empty">The wall is bare.<br>Pin documents, names and numbers from the desk, then string together what belongs together.</div>' +
      '<div class="bd-hint" id="bd-hint" hidden></div>' +
      '<div class="bd-zoom"><button data-z="in" aria-label="Zoom in">+</button><button data-z="out" aria-label="Zoom out">−</button><button data-z="fit" aria-label="Fit all" style="font-size:12px;font-weight:700">FIT</button></div>' +
      '<div class="bd-sel" id="bd-sel" hidden></div>' +
      '<div class="bd-tools"><button class="btn small" id="bd-add-subj">+ Subject</button><button class="btn small" id="bd-add-note">+ Note</button></div></div>';
    var self = this;
    UI$('#bd-add-subj').addEventListener('click', function () { self.editSubject(null); });
    UI$('#bd-add-note').addEventListener('click', function () { self.editNote(null); });
    UI$('.bd-zoom').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.z === 'fit') self.fit(); else { var r = UI$('#bd').getBoundingClientRect(); self.zoomAt(r.width / 2, r.height / 2, b.dataset.z === 'in' ? 1.25 : 0.8); } });
    UI$('#bd-sel').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) self.selAction(b.dataset.a); });
    this.bindPointer(UI$('#bd'));
  },
  show: function () {
    if (!this.B().view) { var w = window.innerWidth; this.B().view = { x: 24, y: 30, k: w < 600 ? 0.85 : 1 }; }
    this.render();
    if (this.pendingFocus) { var id = this.pendingFocus; this.pendingFocus = null; this.focusCard(id); }
  },
  refresh: function () { this.render(); },

  // ------------------------------------------------------------ model helpers
  card: function (id) { return this.B().cards.filter(function (c) { return c.id === id; })[0]; },
  nextId: function () { this.B().n = (this.B().n || 0) + 1; return 'c' + this.B().n; },
  placeNew: function () {
    var v = this.B().view || { x: 24, y: 30, k: 1 };
    var el = UI$('#bd');
    var W = el && el.clientWidth ? el.clientWidth : window.innerWidth, H = el && el.clientHeight ? el.clientHeight : window.innerHeight - 120;
    var cx = (W / 2 - v.x) / v.k - 88, cy = (H / 2 - v.y) / v.k - 60;
    var cards = this.B().cards;
    for (var i = 0; i < 40; i++) {
      var a = i * 2.4, r = 30 * Math.sqrt(i);
      var x = cx + Math.cos(a) * r * 2.2, y = cy + Math.sin(a) * r * 1.6;
      if (!cards.some(function (c) { return Math.abs(c.x - x) < 150 && Math.abs(c.y - y) < 110; })) return { x: Math.round(x), y: Math.round(y) };
    }
    return { x: Math.round(cx + (Math.random() * 80 - 40)), y: Math.round(cy + (Math.random() * 80 - 40)) };
  },
  addCard: function (o) {
    var p = this.placeNew();
    var c = { id: this.nextId(), kind: o.kind, ref: o.ref || null, t: o.t, v: o.v, d: o.d, text: o.text || '', x: p.x, y: p.y };
    this.B().cards.push(c);
    UI.save();
    return c;
  },
  subjectCardFor: function (sid) { return this.B().cards.filter(function (c) { return c.kind === 'subject' && c.ref === sid; })[0]; },
  subjectOfName: function (name) { return UIA.subjects().filter(function (s) { return s.names.indexOf(name) >= 0; })[0]; },
  goFocus: function (id, msg) { this.pendingFocus = id; if (msg) UItoast(msg); if (UIS.tab === 'board') { this.render(); this.focusCard(id); this.pendingFocus = null; } else UI.go('board'); },

  // ------------------------------------------------------------ public actions (from other views)
  addSubjectFor: function (name) {
    var ex = this.subjectOfName(name);
    if (ex) { var ec = this.subjectCardFor(ex.id) || this.addCard({ kind: 'subject', ref: ex.id }); this.goFocus(ec.id, 'Already on the board'); return; }
    var s = UIA.addSubject({ label: '', names: [name] });
    var c = this.addCard({ kind: 'subject', ref: s.id });
    UI.save();
    this.goFocus(c.id, 'Subject pinned');
  },
  pickSubjectFor: function (name) {
    var subs = UIA.subjects().filter(function (s) { return s.names.indexOf(name) < 0; });
    var self = this;
    UIsheet.open({ title: 'Add name to subject', sub: UIesc(name), html: '<div class="sh-list">' + subs.map(function (s) { return UIitem({ act: 'pick', data: s.id, ic: '◧', label: s.label || s.names[0] || 'Unnamed', small: s.names.join(' · ') }); }).join('') + '</div>',
      mount: function (body) { body.addEventListener('click', function (e) { var b = e.target.closest('.sh-item'); if (!b) return; var s = UIA.subjects().filter(function (x) { return x.id === b.dataset.x; })[0]; UIA.updateSubject(s.id, { names: s.names.concat([name]) }); UIsheet.close(); var c = self.subjectCardFor(s.id) || self.addCard({ kind: 'subject', ref: s.id }); UI.save(); self.goFocus(c.id, 'Name added to ' + (s.label || s.names[0])); }); } });
  },
  addDoc: function (docId) {
    var ex = this.B().cards.filter(function (c) { return c.kind === 'doc' && c.ref === docId; })[0];
    if (ex) { this.goFocus(ex.id, 'Already pinned'); return; }
    var c = this.addCard({ kind: 'doc', ref: docId });
    UItoast('Pinned to the board');
    var b = UI$('#vw-pin'); if (b) b.textContent = 'On the board';
    this.lastPinned = c.id;
  },
  addToken: function (t, v, d) {
    var ex = this.B().cards.filter(function (c) { return c.kind === 'tok' && c.t === t && c.v === v; })[0];
    if (ex) { this.goFocus(ex.id, 'Already pinned'); return; }
    var c = this.addCard({ kind: 'tok', t: t, v: v, d: d });
    this.goFocus(c.id, 'Pinned to the board');
  },

  // ------------------------------------------------------------ rendering
  render: function () {
    var world = UI$('#bd-world'); if (!world) return;
    var B = this.B(), self = this;
    var subs = {}; UIA.subjects().forEach(function (s) { subs[s.id] = s; });
    // drop cards whose subject vanished
    B.cards = B.cards.filter(function (c) { return c.kind !== 'subject' || subs[c.ref]; });
    var ids = {}; B.cards.forEach(function (c) { ids[c.id] = 1; });
    B.links = B.links.filter(function (l) { return ids[l.a] && ids[l.b]; });
    var props = UIA.props();
    UI$$('.card', world).forEach(function (el) { el.remove(); });
    B.cards.forEach(function (c) { world.appendChild(self.cardEl(c, subs, props)); });
    UI$('#bd-empty').hidden = B.cards.length > 0;
    this.applyView();
    this.drawLinks();
    this.updateSel();
  },
  cardEl: function (c, subs, props) {
    var html = '';
    if (c.kind === 'subject') {
      var s = subs[c.ref];
      var roles = props.filter(function (p) { return p.type === 'role' && s.names.indexOf(p.name) >= 0; });
      html = '<div class="card c-subj" data-id="' + c.id + '"><span class="pinhead"></span>' + (s.label ? '<div class="cl">' + UIesc(s.label) + '</div>' : '<div class="cl anon">Subject ' + UIesc(s.id.replace(/\D/g, '')) + '</div>') + '<div class="cn">' + s.names.map(function (n) { return UIesc(n); }).join('<br>') + '</div>' +
        roles.map(function (p) { return '<span class="cr" style="' + (p.status === 'confirmed' ? '' : 'opacity:.5;border-style:dashed') + '">' + UIesc(UIROLE[p.role] || p.role) + (p.status === 'confirmed' ? ' ✓' : '?') + '</span> '; }).join('') + '</div>';
    } else if (c.kind === 'doc') {
      var d = UIA.doc(c.ref);
      html = '<div class="card c-doc" data-id="' + c.id + '" style="transform:rotate(' + (UIjit(c.id) * 2).toFixed(1) + 'deg)"><span class="pinhead"></span><div class="cs">' + UIesc(d ? UIDoc.sourceLabel(d) : 'Document') + ' · ' + UIesc(c.ref) + '</div><div class="ct">' + UIesc(d ? d.title : '(missing)') + '</div><div class="lines"><i></i><i style="width:70%"></i><i></i></div></div>';
    } else if (c.kind === 'note') {
      html = '<div class="card c-note" data-id="' + c.id + '" style="transform:rotate(' + (UIjit(c.id) * 3).toFixed(1) + 'deg)"><span class="pinhead"></span>' + UIesc(c.text || '…') + '</div>';
    } else {
      html = '<div class="card c-tok" data-id="' + c.id + '"><span class="pinhead"></span><div class="ct1">' + UIesc(UITYPE[c.t] || c.t) + '</div><div class="ct2">' + UIesc(c.d || c.v) + '</div></div>';
    }
    var el = UIel(html);
    el.style.left = c.x + 'px'; el.style.top = c.y + 'px';
    if (this.sel === c.id) el.classList.add('sel');
    if (this.linkFrom === c.id) el.classList.add('linksrc');
    return el;
  },
  applyView: function () {
    var v = this.B().view; if (!v) return;
    UI$('#bd-world').style.transform = 'translate(' + v.x + 'px,' + v.y + 'px) scale(' + v.k + ')';
    var bd = UI$('#bd');
    bd.style.backgroundPosition = (v.x % 160) + 'px ' + (v.y % 160) + 'px,0 0,0 0,0 0';
  },
  pinPos: function (id) {
    var c = this.card(id); var el = UI$('#bd-world .card[data-id="' + id + '"]');
    var w = el ? el.offsetWidth : 170;
    var left = c.kind === 'tok' ? 14 : w / 2;
    return { x: c.x + left, y: c.y };
  },
  drawLinks: function () {
    var self = this, svg = UI$('#bd-svg');
    svg.innerHTML = this.B().links.map(function (l) {
      var a = self.pinPos(l.a), b = self.pinPos(l.b);
      var dx = b.x - a.x, dy = b.y - a.y, dist = Math.sqrt(dx * dx + dy * dy);
      var sag = Math.min(70, dist * 0.14);
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + sag;
      var d = 'M' + a.x + ',' + a.y + ' Q' + mx + ',' + my + ' ' + b.x + ',' + b.y;
      return '<path class="str' + (self.selLink === l.id ? ' sel' : '') + '" d="' + d + '"/><path class="hit" data-link="' + l.id + '" d="' + d + '"/>';
    }).join('');
  },
  updateSel: function () {
    var bar = UI$('#bd-sel'), hint = UI$('#bd-hint');
    UI$('#bd').classList.toggle('hasSel', !!(this.sel || this.selLink || this.linkFrom));
    UI$$('#bd-world .card').forEach(function (el) { el.classList.toggle('sel', el.dataset.id === UIBoard.sel); el.classList.toggle('linksrc', el.dataset.id === UIBoard.linkFrom); });
    if (this.linkFrom) {
      hint.hidden = false; hint.textContent = 'Tap the card to string it to';
      bar.hidden = false; bar.innerHTML = '<button data-a="cancel-link">Cancel</button>';
      return;
    }
    hint.hidden = true;
    if (this.selLink) { bar.hidden = false; bar.innerHTML = '<button data-a="unlink" class="warn">Cut string</button><button data-a="deselect">Done</button>'; return; }
    var c = this.sel && this.card(this.sel);
    if (!c) { bar.hidden = true; return; }
    var b = '<button data-a="link" class="hot">Link</button>';
    if (c.kind === 'subject') b += '<button data-a="edit">Edit</button><button data-a="file">File…</button>';
    else if (c.kind === 'doc') b += '<button data-a="open">Open</button>';
    else if (c.kind === 'note') b += '<button data-a="edit">Edit</button>';
    else b += '<button data-a="tok">Actions</button>';
    b += '<button data-a="remove" class="warn">Remove</button>';
    bar.hidden = false; bar.innerHTML = b;
  },
  selAction: function (a) {
    var c = this.sel && this.card(this.sel);
    if (a === 'cancel-link') { this.linkFrom = null; this.updateSel(); return; }
    if (a === 'deselect') { this.selLink = null; this.drawLinks(); this.updateSel(); return; }
    if (a === 'unlink') { var id = this.selLink; this.B().links = this.B().links.filter(function (l) { return l.id !== id; }); this.selLink = null; this.drawLinks(); this.updateSel(); UI.save(); return; }
    if (!c) return;
    if (a === 'link') { this.linkFrom = c.id; this.sel = null; this.updateSel(); }
    else if (a === 'edit') { if (c.kind === 'subject') this.editSubject(c); else this.editNote(c); }
    else if (a === 'open') UI.go('desk', { open: c.ref });
    else if (a === 'tok') UI.tokenSheet(c.t, c.v, c.d);
    else if (a === 'file') this.fileFor(c);
    else if (a === 'remove') this.removeCard(c);
  },
  removeCard: function (c) {
    var self = this;
    var label = c.kind === 'subject' ? 'Remove this subject from the board? Its names stay in your documents.' : 'Take this card off the board?';
    UIsheet.open({ title: 'Remove card', html: '<p class="muted" style="margin:4px 0 14px">' + label + '</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" data-x="no">Keep</button><button class="btn danger" data-x="yes">Remove</button></div>',
      mount: function (body) { body.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; UIsheet.close(); if (b.dataset.x !== 'yes') return;
        self.B().cards = self.B().cards.filter(function (x) { return x.id !== c.id; });
        if (c.kind === 'subject') UIA.removeSubject(c.ref);
        self.sel = null; self.render(); UI.save(); }); } });
  },
  focusCard: function (id) {
    var c = this.card(id); if (!c) return;
    var el = UI$('#bd'); var v = this.B().view;
    v.x = el.clientWidth / 2 - (c.x + 85) * v.k; v.y = el.clientHeight / 2.4 - (c.y + 50) * v.k;
    this.sel = id; this.applyView(); this.updateSel();
    var ce = UI$('#bd-world .card[data-id="' + id + '"]'); if (ce) ce.classList.add('sel');
    UI.save();
  },
  fit: function () {
    var cards = this.B().cards; if (!cards.length) return;
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    cards.forEach(function (c) { var el = UI$('#bd-world .card[data-id="' + c.id + '"]'); var w = el ? el.offsetWidth : 170, h = el ? el.offsetHeight : 110; x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x + w); y1 = Math.max(y1, c.y + h); });
    var el = UI$('#bd'), W = el.clientWidth, H = el.clientHeight - 70;
    var k = Math.max(0.3, Math.min(1.4, Math.min((W - 40) / (x1 - x0), (H - 40) / (y1 - y0))));
    var v = this.B().view; v.k = k; v.x = (W - (x1 - x0) * k) / 2 - x0 * k; v.y = (H - (y1 - y0) * k) / 2 - y0 * k + 10;
    this.applyView(); UI.save();
  },
  zoomAt: function (sx, sy, f) {
    var v = this.B().view; var k2 = Math.max(0.3, Math.min(2.5, v.k * f)); f = k2 / v.k;
    v.x = sx - (sx - v.x) * f; v.y = sy - (sy - v.y) * f; v.k = k2;
    this.applyView();
    clearTimeout(this._zs); this._zs = setTimeout(UI.save, 300);
  },

  // ------------------------------------------------------------ pointer handling
  bindPointer: function (bd) {
    var self = this, P = {}, g = null, lastTap = { id: null, t: 0 };
    function pts() { return Object.keys(P).map(function (k) { return P[k]; }); }
    function rel(e) { var r = bd.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    bd.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.bd-tools,.bd-zoom,.bd-sel,.bd-hint')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      P[e.pointerId] = rel(e);
      try { bd.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      var ps = pts(), v = self.B().view;
      if (ps.length === 2) {
        var a = ps[0], b = ps[1];
        g = { mode: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, v0: { x: v.x, y: v.y, k: v.k }, moved: true };
        return;
      }
      if (ps.length > 2) return;
      var cardEl = e.target.closest('.card');
      var hit = e.target.closest('path.hit');
      var p = ps[0];
      if (cardEl) { var c = self.card(cardEl.dataset.id); g = { mode: 'card', c: c, el: cardEl, s: p, o: { x: c.x, y: c.y }, moved: false }; }
      else g = { mode: 'pan', s: p, v0: { x: v.x, y: v.y }, moved: false, link: hit ? hit.dataset.link : null };
      bd.classList.add('dragging');
    });
    bd.addEventListener('pointermove', function (e) {
      if (!P[e.pointerId] || !g) return;
      P[e.pointerId] = rel(e);
      var ps = pts(), v = self.B().view;
      if (g.mode === 'pinch' && ps.length >= 2) {
        var a = ps[0], b = ps[1];
        var d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        var k = Math.max(0.3, Math.min(2.5, g.v0.k * d / g.d0));
        var wx = (g.m0.x - g.v0.x) / g.v0.k, wy = (g.m0.y - g.v0.y) / g.v0.k;
        v.k = k; v.x = m.x - wx * k; v.y = m.y - wy * k;
        self.applyView();
        return;
      }
      var p = ps[0]; var dx = p.x - g.s.x, dy = p.y - g.s.y;
      if (!g.moved && Math.hypot(dx, dy) < 7) return;
      g.moved = true;
      if (g.mode === 'card') {
        g.c.x = Math.round(g.o.x + dx / v.k); g.c.y = Math.round(g.o.y + dy / v.k);
        g.el.style.left = g.c.x + 'px'; g.el.style.top = g.c.y + 'px';
        g.el.style.zIndex = 4;
        self.drawLinks();
      } else if (g.mode === 'pan') { v.x = g.v0.x + dx; v.y = g.v0.y + dy; self.applyView(); }
    });
    function end(e) {
      if (!P[e.pointerId]) return;
      delete P[e.pointerId];
      if (!g) return;
      var ps = pts();
      if (g.mode === 'pinch') { if (ps.length === 1) { var v = self.B().view; g = { mode: 'pan', s: ps[0], v0: { x: v.x, y: v.y }, moved: true }; } else if (!ps.length) { g = null; bd.classList.remove('dragging'); UI.save(); } return; }
      if (ps.length) return;
      bd.classList.remove('dragging');
      var G = g; g = null;
      if (e.type === 'pointercancel') { UI.save(); return; }
      if (G.mode === 'card') {
        G.el.style.zIndex = '';
        if (G.moved) { var B = self.B(); B.cards = B.cards.filter(function (x) { return x !== G.c; }).concat([G.c]); G.el.parentNode.appendChild(G.el); self.afterDrop(G.c); UI.save(); return; }
        var now = Date.now();
        if (lastTap.id === G.c.id && now - lastTap.t < 350) { lastTap = { id: null, t: 0 }; self.openCard(G.c); return; }
        lastTap = { id: G.c.id, t: now };
        self.tapCard(G.c);
      } else if (G.mode === 'pan') {
        if (G.moved) { UI.save(); return; }
        if (G.link) { self.selLink = G.link; self.sel = null; self.linkFrom = null; self.drawLinks(); self.updateSel(); return; }
        self.sel = null; self.selLink = null; self.linkFrom = null; self.drawLinks(); self.updateSel();
      }
    }
    bd.addEventListener('pointerup', end);
    bd.addEventListener('pointercancel', end);
    bd.addEventListener('wheel', function (e) {
      e.preventDefault();
      var p = rel(e);
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) self.zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
      else { var v = self.B().view; v.x -= e.deltaX; self.applyView(); }
    }, { passive: false });
  },
  tapCard: function (c) {
    if (this.linkFrom) {
      if (this.linkFrom !== c.id) {
        var a = this.linkFrom, b = c.id, B = this.B();
        var ex = B.links.filter(function (l) { return (l.a === a && l.b === b) || (l.a === b && l.b === a); })[0];
        if (ex) UItoast('Already strung together');
        else { B.links.push({ id: 'l' + (++B.n), a: a, b: b }); UIvibe(12); UItoast('Strung together'); }
        UI.save();
      }
      this.linkFrom = null; this.sel = c.id; this.drawLinks(); this.updateSel();
      return;
    }
    this.selLink = null;
    this.sel = this.sel === c.id ? null : c.id;
    this.drawLinks(); this.updateSel();
  },
  openCard: function (c) {
    if (c.kind === 'doc') UI.go('desk', { open: c.ref });
    else if (c.kind === 'subject') this.editSubject(c);
    else if (c.kind === 'note') this.editNote(c);
    else UI.tokenSheet(c.t, c.v, c.d);
  },
  afterDrop: function (c) {
    if (c.kind !== 'subject') return;
    var self = this;
    var el = UI$('#bd-world .card[data-id="' + c.id + '"]');
    var cx = c.x + el.offsetWidth / 2, cy = c.y + el.offsetHeight / 2;
    var target = this.B().cards.filter(function (o) {
      if (o.id === c.id || o.kind !== 'subject') return false;
      var oe = UI$('#bd-world .card[data-id="' + o.id + '"]');
      return cx > o.x && cx < o.x + oe.offsetWidth && cy > o.y && cy < o.y + oe.offsetHeight;
    })[0];
    if (target) this.mergeAsk(c, target);
  },
  mergeAsk: function (c, target) {
    var self = this;
    var subs = {}; UIA.subjects().forEach(function (s) { subs[s.id] = s; });
    var A = subs[c.ref], T = subs[target.ref];
    UIsheet.open({ title: 'Merge subjects?', html: '<p style="margin:4px 0 12px;color:var(--ui2)">You think <b>' + UIesc(A.label || A.names[0]) + '</b> and <b>' + UIesc(T.label || T.names[0]) + '</b> are one person. Their names go onto one card; strings are kept.</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" data-x="no">No, move it</button><button class="btn primary" data-x="yes">Merge</button></div>',
      mount: function (body) { body.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; UIsheet.close(); if (b.dataset.x === 'yes') self.merge(c, target); else { c.x += 60; c.y += 60; self.render(); UI.save(); } }); } });
  },
  merge: function (c, target) {
    var subs = {}; UIA.subjects().forEach(function (s) { subs[s.id] = s; });
    var A = subs[c.ref], T = subs[target.ref];
    var names = T.names.slice(); A.names.forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); });
    UIA.updateSubject(T.id, { names: names, label: T.label || A.label });
    var B = this.B();
    B.links.forEach(function (l) { if (l.a === c.id) l.a = target.id; if (l.b === c.id) l.b = target.id; });
    B.links = B.links.filter(function (l) { return l.a !== l.b; });
    B.cards = B.cards.filter(function (x) { return x.id !== c.id; });
    UIA.removeSubject(A.id);
    this.sel = target.id;
    this.render(); UI.save();
    UItoast('Merged — consider filing “same person”');
  },

  // ------------------------------------------------------------ sheets
  editSubject: function (c) {
    var self = this;
    var s = c ? UIA.subjects().filter(function (x) { return x.id === c.ref; })[0] : { label: '', names: [] };
    var names = s.names.slice();
    function namesHTML() { return names.length ? names.map(function (n, i) { return '<div class="sh-item" style="min-height:44px"><span class="tx"><b style="font-family:var(--f-type);font-weight:400">' + UIesc(n) + '</b></span><button class="btn small ghost" data-rm="' + i + '" aria-label="Remove name">✕</button></div>'; }).join('') : '<div class="ac-empty">No names yet.</div>'; }
    var others = UIA.subjects().filter(function (x) { return x.id !== s.id; });
    var html = '<div class="field"><span class="lbl">Card label</span><input type="text" id="sj-label" maxlength="40" placeholder="e.g. “The Frenchman”" value="' + UIesc(s.label) + '"></div>' +
      '<div class="lbl">Names on this card</div><div class="sh-list" id="sj-names">' + namesHTML() + '</div>' +
      '<div class="ac" id="sj-ac"><input type="text" placeholder="Add a name you have seen…" autocomplete="off" spellcheck="false"><div class="ac-list"></div></div>' +
      (c && others.length ? '<div class="lbl sh-sec">Merge another subject into this one</div><div class="opts" id="sj-merge">' + others.map(function (o) { return '<button class="chip" data-m="' + o.id + '">' + UIesc(o.label || o.names[0] || 'Unnamed') + '</button>'; }).join('') + '</div>' : '') +
      '<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">' + (c ? '<button class="btn" id="sj-same" style="flex:1">File “same person”</button><button class="btn" id="sj-role" style="flex:1">File a role</button>' : '') + '<button class="btn primary" id="sj-save" style="flex:1 0 100%">' + (c ? 'Save card' : 'Pin subject') + '</button></div>';
    UIsheet.open({ title: c ? 'Subject' : 'New subject', html: html, mount: function (body) {
      var ac = UIautocomplete(UI$('#sj-ac', body), { items: function () { return UIA.known().filter(function (k) { return k.t === 'name' && names.indexOf(k.v) < 0; }).map(function (k) { return { v: k.v, d: k.v }; }); }, empty: 'No names in your documents yet.', max: 8, lazy: true,
        onPick: function (it) { names.push(it.v); UI$('#sj-names', body).innerHTML = namesHTML(); UI$('#sj-ac input', body).value = ''; ac.render(); } });
      UI$('#sj-names', body).addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (!b) return; names.splice(+b.dataset.rm, 1); UI$('#sj-names', body).innerHTML = namesHTML(); ac.render(); });
      var mg = UI$('#sj-merge', body);
      if (mg) mg.addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (!b) return; var o = UIA.subjects().filter(function (x) { return x.id === b.dataset.m; })[0]; o.names.forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); }); b.classList.add('on'); b.dataset.merged = '1'; UI$('#sj-names', body).innerHTML = namesHTML(); });
      function save() {
        var label = UI$('#sj-label', body).value.trim();
        if (!c) {
          if (!names.length && !label) { UIsheet.close(); return null; }
          var ns = UIA.addSubject({ label: label, names: names });
          var nc = self.addCard({ kind: 'subject', ref: ns.id });
          self.sel = nc.id;
        } else {
          UIA.updateSubject(s.id, { label: label, names: names });
          UI$$('#sj-merge [data-merged]', body).forEach(function (b) {
            var oc = self.subjectCardFor(b.dataset.m);
            if (oc) { self.B().links.forEach(function (l) { if (l.a === oc.id) l.a = c.id; if (l.b === oc.id) l.b = c.id; }); self.B().links = self.B().links.filter(function (l) { return l.a !== l.b; }); self.B().cards = self.B().cards.filter(function (x) { return x.id !== oc.id; }); }
            UIA.removeSubject(b.dataset.m);
          });
        }
        UI.save(); self.render();
        return true;
      }
      UI$('#sj-save', body).addEventListener('click', function () { save(); UIsheet.close(); });
      var sm = UI$('#sj-same', body);
      if (sm) sm.addEventListener('click', function () { save(); UIsheet.close(); UICase.fileSameFor(names); });
      var rl = UI$('#sj-role', body);
      if (rl) rl.addEventListener('click', function () { save(); UIsheet.close(); UICase.proposeSheet({ type: 'role', name: names[0] }); });
    } });
  },
  fileFor: function (c) {
    var s = UIA.subjects().filter(function (x) { return x.id === c.ref; })[0];
    if (!s) return;
    UIsheet.open({ title: 'File for ' + (s.label || s.names[0]), html: '<div class="sh-list">' +
      UIitem({ act: 'same', ic: '=', label: 'Same person', small: s.names.length > 1 ? 'File that all ' + s.names.length + ' names are one person' : 'Needs two names on the card', dis: s.names.length < 2 }) +
      UIitem({ act: 'role', ic: 'R', label: 'Role', small: 'The person behind these names is…' }) +
      UIitem({ act: 'warrant', ic: 'W', label: 'Request a warrant', small: 'Cite documents; arrest if approved' }) + '</div>',
      mount: function (body) { body.addEventListener('click', function (e) { var b = e.target.closest('.sh-item'); if (!b || b.disabled) return; UIsheet.close();
        if (b.dataset.act === 'same') UICase.fileSameFor(s.names);
        else if (b.dataset.act === 'role') UICase.proposeSheet({ type: 'role', name: s.names[0] });
        else UICase.warrantSheet({ name: s.names[0] }); }); } });
  },
  editNote: function (c) {
    var self = this;
    UIsheet.open({ title: c ? 'Note' : 'New note', html: '<div class="field"><textarea id="nt-text" maxlength="400" placeholder="A thought, a question, a hunch…">' + UIesc(c ? c.text : '') + '</textarea></div><button class="btn primary block" id="nt-save">' + (c ? 'Save' : 'Pin note') + '</button>',
      mount: function (body) {
        setTimeout(function () { UI$('#nt-text', body).focus(); }, 250);
        UI$('#nt-save', body).addEventListener('click', function () {
          var t = UI$('#nt-text', body).value.trim();
          UIsheet.close();
          if (!t) return;
          if (c) c.text = t; else { var n = self.addCard({ kind: 'note', text: t }); self.sel = n.id; }
          UI.save(); self.render();
        });
      } });
  }
};
