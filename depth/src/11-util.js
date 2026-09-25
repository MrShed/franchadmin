/* DEPTH UI — 11-util.js: DOM helpers, prefs, icons, canvas at devicePixelRatio,
 * gestures, geometry, generated textures (paper, hammertone paint, tracing
 * paper, baize) and the red LED seven-segment clock. */
function UI$(sel, root) { return (root || document).querySelector(sel); }
function UI$$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function UIesc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function UIh(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function UIrand(seed) { var a = UIh(seed); return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function UIel(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function UIclamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function UIcap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
function UIvibe(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) { /* ignore */ } }
function UImotion() { try { return !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return true; } }
function UIplural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
function UIwide() { return window.innerWidth >= 900; }
function UIland() { return window.innerHeight < 520 && window.innerWidth > window.innerHeight; }
function UImhz(f) { return (+f).toFixed(3); }
function UImodeName(m) { return m === 'cw' ? 'CW' : m === 'burst' ? 'BURST' : 'AM'; }
function UImodeLong(m) { return m === 'cw' ? 'Morse (CW)' : m === 'burst' ? 'Burst' : 'Voice (AM)'; }

var UIPREF = {
  get: function (k, d) { try { var v = localStorage.getItem('depth.pref.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem('depth.pref.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
};

/* stroke icons on a 24px grid */
var UIICON = (function () {
  function s(p) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>'; }
  return {
    receiver: s('<rect x="2.5" y="6" width="19" height="13" rx="1.5"/><circle cx="16" cy="12.5" r="3.2"/><path d="M5.5 10h6M5.5 13h6M5.5 16h4M7 6l7-3.5"/>'),
    map: s('<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>'),
    bench: s('<rect x="3" y="4" width="13" height="9" rx="1"/><path d="M6 7.5h7M6 10h4"/><rect x="8" y="11" width="13" height="9" rx="1"/><path d="M11 14.5h7M11 17h5"/>'),
    traffic: s('<circle cx="12" cy="4.5" r="2.2"/><circle cx="5" cy="18.5" r="2.2"/><circle cx="19" cy="18.5" r="2.2"/><circle cx="12" cy="12" r="2.2"/><path d="M12 6.7v3.1M10.4 13.6l-4 3.3M13.6 13.6l4 3.3"/>'),
    desk: s('<path d="M4 4h12l4 4v12H4z"/><path d="M16 4v4h4M7.5 10h9M7.5 13.5h9M7.5 17h5"/>'),
    menu: s('<circle cx="12" cy="5.5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="18.5" r="1.3"/>'),
    close: s('<path d="M6 6l12 12M18 6L6 18"/>'),
    back: s('<path d="M15 5l-7 7 7 7"/>'),
    chev: s('<path d="M9 5l7 7-7 7"/>'),
    sound: s('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/>'),
    mute: s('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
    clock: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    moon: s('<path d="M19.5 14.5A8 8 0 019.5 4.5a8 8 0 1010 10z"/>'),
    ear: s('<path d="M7 9.5a5 5 0 0110 0c0 3-3 3.8-3 6.5a3 3 0 01-5.5 1.5"/><path d="M10 10a2 2 0 014 0"/>'),
    df: s('<circle cx="12" cy="12" r="2"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/><circle cx="12" cy="12" r="6.5"/>'),
    van: s('<path d="M2.5 16.5V8h11l3.5 4h4v4.5z"/><circle cx="7" cy="17" r="1.8"/><circle cx="17" cy="17" r="1.8"/><path d="M8 8V4.5M8 4.5l3 2M8 4.5l-3 2"/>'),
    pencil: s('<path d="M4 20l1-4.5L16 4.5l3.5 3.5L8.5 19z"/><path d="M14 7l3.5 3.5"/>'),
    stamp: s('<path d="M9 3.5h6v4l-1.5 3h-3L9 7.5z"/><path d="M5 13.5h14v3H5zM6.5 20h11"/>'),
    eye: s('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
    lift: s('<path d="M4 10h16v10H4z"/><path d="M4 10l3-5h10l3 5M10 14h4"/>'),
    raid: s('<path d="M12 3l8 3.5v5c0 4.7-3.3 8.3-8 9.5-4.7-1.2-8-4.8-8-9.5v-5z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
    stake: s('<path d="M3 20h18M6 20V9l6-5 6 5v11"/><path d="M10 20v-5h4v5M6 9h12"/>'),
    mentor: s('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6"/>'),
    note: s('<path d="M5 3.5h14v17H5z"/><path d="M8 8h8M8 11.5h8M8 15h5"/>'),
    file: s('<path d="M3 6.5h7l2 2h9v11H3z"/>'),
    op: s('<rect x="3.5" y="4.5" width="17" height="15" rx="1"/><path d="M7 9h10M7 12.5h10M7 16h6"/><circle cx="17.5" cy="16.5" r="0"/>'),
    inbox: s('<path d="M3 13l2.5-8h13L21 13v6H3z"/><path d="M3 13h5l1.5 2.5h5L16 13h5"/>'),
    play: s('<path d="M8 5l11 7-11 7z"/>'),
    pause: s('<path d="M8 5v14M16 5v14"/>'),
    skip: s('<path d="M5 5l9 7-9 7zM18 5v14"/>'),
    wait: s('<path d="M7 3.5h10M7 20.5h10M8 3.5c0 5 8 5 8 8.5s-8 3.5-8 8.5M16 3.5c0 5-8 5-8 8.5s8 3.5 8 8.5"/>'),
    help: s('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 015 .3c0 1.7-2.5 2-2.5 3.7M12 16.8v.2"/>'),
    link: s('<path d="M10 14l4-4M8.5 11.5l-2 2a3.2 3.2 0 004.5 4.5l2-2M15.5 12.5l2-2A3.2 3.2 0 0013 6l-2 2"/>'),
    move: s('<path d="M12 3v18M3 12h18M12 3l-2.5 2.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5"/>'),
    check: s('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    warn: s('<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.2v.2"/>'),
    target: s('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6"/>'),
    home: s('<path d="M4 11l8-6.5 8 6.5V20H4z"/><path d="M10 20v-5h4v5"/>'),
    plus: s('<path d="M12 5v14M5 12h14"/>'),
    minus: s('<path d="M5 12h14"/>'),
    swap: s('<path d="M7 4L3.5 7.5 7 11M3.5 7.5H17M17 13l3.5 3.5L17 20M20.5 16.5H7"/>'),
    trash: s('<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'),
    key: s('<circle cx="7.5" cy="12" r="3.5"/><path d="M11 12h10M17 12v3.5M20 12v2.5"/>'),
    grid: s('<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>'),
    chart: s('<path d="M4 20V11M9 20V5M14 20v-8M19 20V8"/><path d="M2.5 20.5h19"/>'),
    layers: s('<path d="M12 3.5l9 4.5-9 4.5-9-4.5z"/><path d="M3 12.5l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5"/>')
  };
})();

/* canvas that keeps itself sized to its host at devicePixelRatio */
function UIcanvas(host, draw, o2) {
  var cv = document.createElement('canvas');
  host.appendChild(cv);
  var o = { cv: cv, ctx: cv.getContext('2d', o2 || undefined), w: 0, h: 0, dpr: 1, draw: draw };
  o.resize = function () {
    var r = host.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
    var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (w === o.w && h === o.h && dpr === o.dpr) return false;
    o.w = w; o.h = h; o.dpr = dpr;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    if (o.onResize) o.onResize();
    return true;
  };
  o.paint = function () { o.resize(); if (o.w < 4 || o.h < 4) return; o.ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0); o.draw(o.ctx, o.w, o.h); };
  o.frame = function () { if (o.raf) return; o.raf = requestAnimationFrame(function () { o.raf = 0; o.paint(); }); };
  if (typeof ResizeObserver !== 'undefined') { o.ro = new ResizeObserver(function () { if (o.resize()) o.frame(); }); o.ro.observe(host); }
  return o;
}

/* pointer drag helper: calls on.start(p,e) / on.move(p, d, e) / on.end(p, moved, e) with element-relative coords */
function UIdrag(el, on) {
  var st = null;
  function rel(e) { var r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height }; }
  el.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button > 0) return;
    if (on.filter && !on.filter(e)) return;
    st = { id: e.pointerId, p0: rel(e), moved: false };
    try { el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    if (on.start) on.start(st.p0, e);
    if (on.prevent !== false) e.preventDefault();
  });
  el.addEventListener('pointermove', function (e) {
    if (!st || e.pointerId !== st.id) return;
    var p = rel(e), d = { x: p.x - st.p0.x, y: p.y - st.p0.y };
    if (Math.abs(d.x) + Math.abs(d.y) > 4) st.moved = true;
    if (on.move) on.move(p, d, e);
  });
  function end(e) { if (!st || e.pointerId !== st.id) return; var s = st; st = null; if (on.end) on.end(rel(e), s.moved, e); }
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

/* pan / pinch / wheel / tap on an element; view = {x, y, k} in CSS px */
function UIgesture(el, view, opts) {
  var P = {}, g = null;
  function rel(e) { var r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function pts() { return Object.keys(P).map(function (k) { return P[k]; }); }
  function clampK(k) { return UIclamp(k, opts.min || 0.5, opts.max || 8); }
  function zoomAt(px, py, f) { var k = clampK(view.k * f), wx = (px - view.x) / view.k, wy = (py - view.y) / view.k; view.k = k; view.x = px - wx * k; view.y = py - wy * k; opts.onChange(view); }
  el.addEventListener('pointerdown', function (e) {
    if (e.target.closest('[data-nogesture]')) return;
    P[e.pointerId] = rel(e);
    try { el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    var p = pts();
    if (p.length === 1) g = { mode: 'pan', x0: p[0].x, y0: p[0].y, vx: view.x, vy: view.y, moved: false, t: Date.now() };
    else if (p.length === 2) g = { mode: 'pinch', d0: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), k0: view.k, cx: (p[0].x + p[1].x) / 2, cy: (p[0].y + p[1].y) / 2, vx: view.x, vy: view.y, moved: true };
  });
  el.addEventListener('pointermove', function (e) {
    if (!P[e.pointerId] || !g) return;
    P[e.pointerId] = rel(e);
    var p = pts();
    if (g.mode === 'pan' && p.length === 1) { var dx = p[0].x - g.x0, dy = p[0].y - g.y0; if (Math.abs(dx) + Math.abs(dy) > 6) g.moved = true; if (g.moved) { view.x = g.vx + dx; view.y = g.vy + dy; opts.onChange(view); } }
    else if (g.mode === 'pinch' && p.length === 2) {
      var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), k = clampK(g.k0 * d / Math.max(10, g.d0));
      var cx = (p[0].x + p[1].x) / 2, cy = (p[0].y + p[1].y) / 2, wx = (g.cx - g.vx) / g.k0, wy = (g.cy - g.vy) / g.k0;
      view.k = k; view.x = cx - wx * k; view.y = cy - wy * k; opts.onChange(view);
    }
  });
  function up(e) {
    if (!P[e.pointerId]) return;
    var p = P[e.pointerId]; delete P[e.pointerId];
    if (g && g.mode === 'pan' && !g.moved && opts.onTap && Date.now() - g.t < 600) opts.onTap(p.x, p.y, e);
    if (!pts().length) g = null; else if (g && g.mode === 'pinch') { var q = pts()[0]; g = { mode: 'pan', x0: q.x, y0: q.y, vx: view.x, vy: view.y, moved: true, t: 0 }; }
  }
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', function (e) { e.preventDefault(); var p = rel(e); zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0016)); }, { passive: false });
  return { zoomAt: zoomAt };
}

var UIgeo = {
  inPoly: function (x, y, poly) { var ins = false; for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) { var a = poly[i], b = poly[j]; if (((a[1] > y) !== (b[1] > y)) && (x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1] + 1e-12) + a[0])) ins = !ins; } return ins; },
  /** compass degrees (0 = north = -y, clockwise) to a unit vector in map coords */
  dir: function (deg) { var a = deg * Math.PI / 180; return [Math.sin(a), -Math.cos(a)]; },
  inEllipse: function (x, y, f, grow) { grow = grow || 1; var a = -(f.rot || 0) * Math.PI / 180, dx = x - f.x, dy = y - f.y, u = dx * Math.cos(a) - dy * Math.sin(a), v = dx * Math.sin(a) + dy * Math.cos(a); return (u * u) / Math.pow(f.rx * grow, 2) + (v * v) / Math.pow(f.ry * grow, 2) <= 1; }
};

/* ------------------------------------------------------------------ textures
 * Generated once at boot into CSS custom properties so every panel, sheet of
 * paper and the desk share the same grain without shipping images. */
var UITex = (function () {
  var T = {};
  function tile(w, h, f) { var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d'); f(x, w, h); return c; }
  function noise(x, w, h, a, b, alpha, seed) {
    var r = UIrand(seed), d = x.getImageData(0, 0, w, h), p = d.data;
    for (var i = 0; i < p.length; i += 4) { var v = a + (b - a) * r(); p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = alpha; }
    x.putImageData(d, 0, 0);
  }
  T.make = function () {
    if (T.done) return; T.done = true;
    var root = document.documentElement.style;
    // paper: fine grain plus a few long fibres
    var paper = tile(256, 256, function (x, w, h) {
      noise(x, w, h, 90, 255, 22, 'paper');
      var r = UIrand('fibres'); x.globalAlpha = 0.08; x.strokeStyle = '#5a5040'; x.lineWidth = 0.6;
      for (var i = 0; i < 60; i++) { var sx = r() * w, sy = r() * h, a = r() * Math.PI; x.beginPath(); x.moveTo(sx, sy); x.quadraticCurveTo(sx + Math.cos(a) * 8 + r() * 6, sy + Math.sin(a) * 8, sx + Math.cos(a) * 18, sy + Math.sin(a) * 18); x.stroke(); }
      x.globalAlpha = 0.05; for (var j = 0; j < 30; j++) { x.fillStyle = r() > 0.5 ? '#fff' : '#6b5d45'; x.beginPath(); x.arc(r() * w, r() * h, 1 + r() * 7, 0, 7); x.fill(); }
    });
    // hammertone paint: soft mottled cells
    var ham = tile(256, 256, function (x, w, h) {
      var r = UIrand('hammer');
      for (var i = 0; i < 520; i++) { var cx = r() * w, cy = r() * h, rad = 3 + r() * 10, g = x.createRadialGradient(cx - rad * 0.3, cy - rad * 0.3, 0, cx, cy, rad); var l = r() > 0.5; g.addColorStop(0, l ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; for (var ox = -w; ox <= w; ox += w) for (var oy = -h; oy <= h; oy += h) { x.beginPath(); x.arc(cx + ox, cy + oy, rad, 0, 7); x.fill(); } }
      var d = x.getImageData(0, 0, w, h), p = d.data, r2 = UIrand('hammer2');
      for (var k = 0; k < p.length; k += 4) { var n = (r2() - 0.5) * 18; p[k] = UIclamp(p[k] + n, 0, 255); p[k + 1] = UIclamp(p[k + 1] + n, 0, 255); p[k + 2] = UIclamp(p[k + 2] + n, 0, 255); p[k + 3] = Math.max(p[k + 3], 14); }
      x.putImageData(d, 0, 0);
    });
    // brushed aluminium
    var brush = tile(256, 64, function (x, w, h) {
      var r = UIrand('brush'); for (var y = 0; y < h; y++) { x.fillStyle = 'rgba(' + (r() > 0.5 ? '255,255,255' : '0,0,0') + ',' + (0.03 + r() * 0.07).toFixed(3) + ')'; x.fillRect(0, y, w, 1); }
      for (var i = 0; i < 90; i++) { x.fillStyle = 'rgba(255,255,255,' + (r() * 0.08).toFixed(3) + ')'; x.fillRect(r() * w, Math.floor(r() * h), 20 + r() * 120, 1); }
    });
    // desk: dark linoleum with a faint weave
    var desk = tile(200, 200, function (x, w, h) {
      noise(x, w, h, 0, 255, 10, 'desk');
      var r = UIrand('desk2'); x.globalAlpha = 0.05;
      for (var i = 0; i < 400; i++) { x.fillStyle = r() > 0.5 ? '#fff' : '#000'; x.fillRect(r() * w, r() * h, 1 + r() * 3, 1); }
    });
    // tracing paper: soft cloudy fibre
    var trace = tile(256, 256, function (x, w, h) {
      var r = UIrand('trace');
      for (var i = 0; i < 160; i++) { var cx = r() * w, cy = r() * h, rad = 10 + r() * 40, g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, 'rgba(255,255,255,' + (0.05 + r() * 0.07).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); }
      x.globalAlpha = 0.12; x.strokeStyle = '#ffffff'; x.lineWidth = 0.5;
      for (var j = 0; j < 90; j++) { var sx = r() * w, sy = r() * h, a = r() * Math.PI; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + Math.cos(a) * (6 + r() * 20), sy + Math.sin(a) * (6 + r() * 20)); x.stroke(); }
    });
    T.paper = paper; T.hammer = ham; T.brush = brush; T.desk = desk; T.trace = trace;
    root.setProperty('--tx-paper', 'url(' + paper.toDataURL() + ')');
    root.setProperty('--tx-hammer', 'url(' + ham.toDataURL() + ')');
    root.setProperty('--tx-brush', 'url(' + brush.toDataURL() + ')');
    root.setProperty('--tx-desk', 'url(' + desk.toDataURL() + ')');
    root.setProperty('--tx-trace', 'url(' + trace.toDataURL() + ')');
  };
  return T;
})();

/* red LED seven-segment digits as inline SVG (unlit segments faintly visible) */
var UISeg = (function () {
  var SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '' };
  var P = { a: 'M3 1h8l-1.6 1.6H4.6z', b: 'M11.4 1.6L12.5 2.7l-.6 6.4-1 .9-1-1 .5-6.2z', c: 'M11.9 11.2l1 .9-.6 6.4-1.1 1.1-1.3-1.3.5-5.7z', d: 'M2.4 19.4l1.4-1.4h6.4l1.5 1.4-1 .8H3.4z', e: 'M1.3 12.1l1-.9 1 1-.5 5.7-1.3 1.3-.8-.8z', f: 'M1.8 2.7L2.9 1.6l1.1 1.1-.5 6.2-1 1-1-.9z', g: 'M3 10.4l.9-.9h6.8l.9.9-.9.9H3.9z' };
  function digit(ch) { var on = SEG[ch] || ''; return '<svg class="sg7" viewBox="0 0 14 21" aria-hidden="true">' + 'abcdefg'.split('').map(function (k) { return '<path class="' + (on.indexOf(k) >= 0 ? 'on' : 'off') + '" d="' + P[k] + '"/>'; }).join('') + '</svg>'; }
  return { html: function (s) { return String(s).split('').map(function (ch) { return ch === ':' ? '<i class="sg7-colon"><b></b><b></b></i>' : digit(ch); }).join(''); } };
})();

/* A tiny event-free schedule helper for timeouts that die with a view */
function UIlater(ms, f) { return setTimeout(function () { try { f(); } catch (e) { console.error(e); } }, ms); }
