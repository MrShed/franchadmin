/* INDEX CASE UI — 11-util.js: DOM helpers, formatting, icons, prefs. */
function UI$(sel, root) { return (root || document).querySelector(sel); }
function UI$$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function UIesc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function UIh(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function UIrand(seed) { var a = UIh(seed); return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function UIel(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function UIcap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
function UIvibe(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) { /* ignore */ } }
function UIclamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function UIsum(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i] || 0; return s; }

var UIfmt = {
  n: function (x) { if (x === null || x === undefined || !isFinite(x)) return '—'; return Math.round(x).toLocaleString('en-GB'); },
  money: function (x) { if (!isFinite(x)) return '—'; var a = Math.abs(x); return (x < 0 ? '−' : '') + '£' + (a >= 1e6 ? (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'm' : a >= 1e3 ? Math.round(a / 1e3) + 'k' : Math.round(a)); },
  pct: function (x, d) { if (x === null || x === undefined || !isFinite(x)) return '—'; var v = x * 100; if (d === undefined) d = v < 1 ? 1 : 0; return v.toFixed(d) + '%'; },
  signed: function (x) { return (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(Math.round(x)); },
  age: function (c) { return (c.age !== null && c.age !== undefined ? c.age : '?') + (c.sex ? ' ' + c.sex.charAt(0).toUpperCase() : ''); },
  plural: function (n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
};

var UISTATUS = {
  suspected: { l: 'Suspected', c: 'st-sus' }, probable: { l: 'Probable', c: 'st-prob' }, confirmed: { l: 'Confirmed', c: 'st-conf' },
  hospital: { l: 'In hospital', c: 'st-hosp' }, icu: { l: 'Intensive care', c: 'st-icu' }, died: { l: 'Died', c: 'st-died' },
  recovered: { l: 'Recovered', c: 'st-rec' }, contact: { l: 'Contact', c: 'st-con' }, negative: { l: 'Ruled out', c: 'st-neg' }
};
function UIstatus(s) { return UISTATUS[s] || { l: UIcap(s), c: 'st-sus' }; }

var UIKINDS = {
  report: { l: 'Report', ic: 'report' }, lab: { l: 'Laboratory', ic: 'flask' }, council: { l: 'Council', ic: 'gavel' }, press: { l: 'Press', ic: 'paper' },
  mayor: { l: 'Mayor', ic: 'phone' }, rumour: { l: 'Rumour', ic: 'rumour' }, mentor: { l: 'Dr Okonjo', ic: 'mentor' }, system: { l: 'Incident room', ic: 'bell' }
};
var UIPLACEKIND = {
  hospital: ['Hospital', 'H'], carehome: ['Care home', 'C'], care: ['Care home', 'C'], school: ['School', 'S'], pub: ['Pub', 'P'], bar: ['Bar', 'P'], gym: ['Gym', 'G'],
  church: ['Church', '†'], mosque: ['Mosque', 'M'], temple: ['Temple', 'T'], faith: ['Place of worship', 'W'], choir: ['Choir', '♪'], stadium: ['Football ground', 'F'], football: ['Football ground', 'F'],
  market: ['Market', 'Mk'], farm: ['Farm', 'Fa'], meat: ['Meat plant', 'Mp'], lab: ['Laboratory', 'L'], hub: ['Transport hub', 'Tr'], station: ['Station', 'Tr'], transport: ['Transport hub', 'Tr'],
  work: ['Workplace', 'W'], workplace: ['Workplace', 'W'], office: ['Office', 'O'], venue: ['Venue', 'V'], event: ['Event venue', 'V'], shop: ['Shop', 'Sh'], home: ['Household', 'h'], household: ['Household', 'h']
};
function UIplaceKind(k) { return (UIPLACEKIND[k] || [UIcap(k || 'Place'), (k || 'P').charAt(0).toUpperCase()]); }

var UIAREAS = [
  { id: 'investigate', l: 'Investigate', sub: 'Interviews, tracing, site visits, questionnaires', ic: 'search' },
  { id: 'lab', l: 'Laboratory', sub: 'Tests, sequencing, the novel-agent screen, trials', ic: 'flask' },
  { id: 'contain', l: 'Contain', sub: 'Isolation, closures, limits, masks, lockdown', ic: 'shield' },
  { id: 'protect', l: 'Protect', sub: 'Hospital surge, shielding, care homes, vaccines', ic: 'heart' },
  { id: 'communicate', l: 'Communicate', sub: 'Briefings, guidance, answering rumours', ic: 'mic' }
];

/* stroke icons, 24px grid */
var UIICON = (function () {
  function s(p) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>'; }
  return {
    map: s('<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>'),
    cases: s('<path d="M4 20V10M9 20V5M14 20v-7M19 20V8"/><path d="M2.5 20.5h19"/>'),
    lab: s('<path d="M9 3h6M10 3v6.5L4.8 18.2A1.8 1.8 0 006.3 21h11.4a1.8 1.8 0 001.5-2.8L14 9.5V3"/><path d="M7.5 14.5h9"/>'),
    actions: s('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
    brief: s('<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12.5h5"/>'),
    flask: s('<path d="M9 3h6M10 3v6.5L4.8 18.2A1.8 1.8 0 006.3 21h11.4a1.8 1.8 0 001.5-2.8L14 9.5V3"/>'),
    report: s('<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 11h7M9 14.5h7M9 18h4"/>'),
    gavel: s('<path d="M13 4l6 6M10.5 6.5l6 6M12 5.5l-3.5 3.5 6 6L18 11.5"/><path d="M11.2 12.3L4 19.5M3 21h9"/>'),
    paper: s('<path d="M4 5h13v14a2 2 0 002 2H6a2 2 0 01-2-2z"/><path d="M17 9h3v10a2 2 0 01-2 2"/><path d="M7 8.5h7M7 12h7M7 15.5h4"/>'),
    phone: s('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>'),
    rumour: s('<path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2h-7l-4 4v-4H6a2 2 0 01-2-2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>'),
    mentor: s('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6"/>'),
    bell: s('<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 20a2 2 0 004 0"/>'),
    search: s('<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/>'),
    shield: s('<path d="M12 3l7.5 3v6c0 4.5-3.2 7.8-7.5 9-4.3-1.2-7.5-4.5-7.5-9V6z"/>'),
    heart: s('<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0112 7.6 4.3 4.3 0 0119.5 10c0 5.4-7.5 10-7.5 10z"/><path d="M8 12h2.2l1.2-2.4 1.8 4.4 1.2-2h1.6"/>'),
    mic: s('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/>'),
    clock: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    person: s('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6"/>'),
    people: s('<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5"/><circle cx="16.5" cy="7.5" r="2.5"/><path d="M15.5 12.6c2.6-.3 4.6 1.3 5 4.4"/>'),
    test: s('<path d="M9 3h6M10 3v15a2 2 0 004 0V3"/><path d="M10 11h4"/>'),
    dna: s('<path d="M7 3c0 6 10 6 10 12s-10 3-10 6M17 3c0 6-10 6-10 12"/><path d="M8.5 6.5h7M8.5 17.5h7M10 12h4"/>'),
    home: s('<path d="M4 11l8-6.5 8 6.5V20H4z"/><path d="M10 20v-5h4v5"/>'),
    pin: s('<path d="M12 21s-6.5-6.2-6.5-11A6.5 6.5 0 0112 3.5 6.5 6.5 0 0118.5 10c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.2"/>'),
    close: s('<path d="M6 6l12 12M18 6L6 18"/>'),
    back: s('<path d="M15 5l-7 7 7 7"/>'),
    chev: s('<path d="M9 5l7 7-7 7"/>'),
    plus: s('<path d="M12 5v14M5 12h14"/>'),
    minus: s('<path d="M5 12h14"/>'),
    fit: s('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    layers: s('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
    sound: s('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.5 4.5 0 010 6M18 6.5a8 8 0 010 11"/>'),
    mute: s('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
    menu: s('<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>'),
    play: s('<path d="M7 4.5l12 7.5-12 7.5z"/>'),
    pause: s('<path d="M8 5v14M16 5v14"/>'),
    check: s('<path d="M4.5 12.5l4.5 4.5L19.5 6.5"/>'),
    warn: s('<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.2v.3"/>'),
    moon: s('<path d="M19 14.5A7.5 7.5 0 019.5 5a7.5 7.5 0 109.5 9.5z"/>'),
    filter: s('<path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/>'),
    sort: s('<path d="M7 4v16M4 17l3 3 3-3M17 20V4M14 7l3-3 3 3"/>'),
    trust: s('<path d="M4 13l4 4 4-4 4 4 4-4"/><path d="M4 8l4-4 4 4 4-4 4 4"/>'),
    bed: s('<path d="M3 18V7M3 14h18v4M21 14v-2.5a2.5 2.5 0 00-2.5-2.5H11v5"/><circle cx="7" cy="11" r="1.8"/>'),
    coin: s('<circle cx="12" cy="12" r="8.5"/><path d="M14.5 8.5c-.5-1-1.5-1.5-2.8-1.5-1.6 0-2.7 1-2.7 2.3 0 3 5.8 1.7 5.8 4.8 0 1.3-1.2 2.4-3 2.4-1.4 0-2.5-.6-3-1.7M12 5.5V7M12 17v1.5"/>'),
    spark: s('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>'),
    ww: s('<path d="M3 9c3 0 3-2.5 6-2.5S12 9 15 9s3-2.5 6-2.5M3 15c3 0 3-2.5 6-2.5s3 2.5 6 2.5 3-2.5 6-2.5"/>')
  };
})();

var UIPREF = {
  get: function (k, d) { try { var v = localStorage.getItem('indexcase.pref.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem('indexcase.pref.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
};

/* canvas that tracks its element size and device pixel ratio */
function UIcanvas(host, draw) {
  var cv = document.createElement('canvas');
  host.appendChild(cv);
  var o = { cv: cv, ctx: cv.getContext('2d'), w: 0, h: 0, dpr: 1, draw: draw, dirty: true };
  o.resize = function () {
    var r = host.getBoundingClientRect(), dpr = Math.min(2.5, window.devicePixelRatio || 1);
    var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (w === o.w && h === o.h && dpr === o.dpr) return false;
    o.w = w; o.h = h; o.dpr = dpr;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    return true;
  };
  o.frame = function () { if (o.raf) return; o.raf = requestAnimationFrame(function () { o.raf = 0; o.resize(); o.ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0); o.draw(o.ctx, o.w, o.h); }); };
  if (typeof ResizeObserver !== 'undefined') { o.ro = new ResizeObserver(function () { if (o.resize()) o.frame(); }); o.ro.observe(host); }
  return o;
}

/* pan / pinch / wheel / tap on an element; view = {x,y,k} in CSS px.
 * opts: {min,max, onChange(view), onTap(x,y,e), onLong(x,y)} */
function UIgesture(el, view, opts) {
  var P = {}, g = null, lastTap = 0;
  function rel(e) { var r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function pts() { return Object.keys(P).map(function (k) { return P[k]; }); }
  function clampK(k) { return UIclamp(k, opts.min || 0.5, opts.max || 12); }
  function zoomAt(px, py, f) {
    var k = clampK(view.k * f), wx = (px - view.x) / view.k, wy = (py - view.y) / view.k;
    view.k = k; view.x = px - wx * k; view.y = py - wy * k; opts.onChange(view);
  }
  el.addEventListener('pointerdown', function (e) {
    if (e.target.closest('[data-nogesture]')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    P[e.pointerId] = rel(e);
    try { el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    var ps = pts();
    if (ps.length === 2) { var a = ps[0], b = ps[1]; g = { mode: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, v0: { x: view.x, y: view.y, k: view.k }, moved: true }; }
    else if (ps.length === 1) g = { mode: 'pan', s: ps[0], v0: { x: view.x, y: view.y }, moved: false, t: Date.now() };
  });
  el.addEventListener('pointermove', function (e) {
    if (!P[e.pointerId] || !g) return;
    P[e.pointerId] = rel(e);
    var ps = pts();
    if (g.mode === 'pinch' && ps.length >= 2) {
      var a = ps[0], b = ps[1], d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      var k = clampK(g.v0.k * d / g.d0), wx = (g.m0.x - g.v0.x) / g.v0.k, wy = (g.m0.y - g.v0.y) / g.v0.k;
      view.k = k; view.x = m.x - wx * k; view.y = m.y - wy * k; opts.onChange(view); return;
    }
    if (g.mode !== 'pan') return;
    var p = ps[0], dx = p.x - g.s.x, dy = p.y - g.s.y;
    if (!g.moved && Math.hypot(dx, dy) < 8) return;
    g.moved = true; view.x = g.v0.x + dx; view.y = g.v0.y + dy; opts.onChange(view);
  });
  function up(e) {
    if (!P[e.pointerId]) return;
    var p = P[e.pointerId]; delete P[e.pointerId];
    if (g && g.mode === 'pan' && !g.moved && Object.keys(P).length === 0) {
      var now = Date.now();
      if (opts.onDouble && now - lastTap < 300) { opts.onDouble(p.x, p.y); lastTap = 0; }
      else { lastTap = now; if (opts.onTap) opts.onTap(p.x, p.y, e); }
    }
    if (Object.keys(P).length === 0) g = null;
    else if (g && g.mode === 'pinch') { var q = pts()[0]; g = { mode: 'pan', s: q, v0: { x: view.x, y: view.y }, moved: true }; }
  }
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', function (e) { delete P[e.pointerId]; g = null; });
  el.addEventListener('wheel', function (e) { e.preventDefault(); var p = rel(e); zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022))); }, { passive: false });
  return { zoomAt: zoomAt };
}
