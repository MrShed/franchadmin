/* DEPTH UI — 14-paint.js: painted instruments drawn on canvas — the backlit
 * dial glass, the S-meter, the magic-eye tuning indicator, the phosphor
 * colour map — and the DOM knob (bakelite cap, knurled edge, fixed light). */
var UIPaint = (function () {
  var P = {};
  // phosphor P31-ish: black -> deep green -> bright green -> white hot
  P.LUT = (function () {
    var lut = new Uint8ClampedArray(256 * 3);
    var stops = [[0, 2, 8, 5], [40, 4, 32, 18], [90, 16, 96, 52], [150, 60, 190, 110], [200, 140, 240, 170], [235, 210, 255, 225], [255, 250, 255, 245]];
    for (var i = 0; i < 256; i++) {
      var k = 0; while (k < stops.length - 2 && i > stops[k + 1][0]) k++;
      var a = stops[k], b = stops[k + 1], t = (i - a[0]) / Math.max(1, b[0] - a[0]);
      for (var c = 0; c < 3; c++) lut[i * 3 + c] = a[c + 1] + (b[c + 1] - a[c + 1]) * UIclamp(t, 0, 1);
    }
    return lut;
  })();

  function rr(x, y, w, h, r) { var c = new Path2D(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); return c; }
  P.rr = rr;

  /** backlit dial glass: frequency scale 3..12 MHz with a red needle */
  var BANDS = [[3.9, 4.0, '75m'], [4.75, 5.06, '60m'], [5.9, 6.2, '49m'], [7.2, 7.45, '41m'], [9.4, 9.9, '31m'], [11.6, 12.0, '25m']];
  P.glass = function (x, w, h, f, o) {
    o = o || {};
    var lo = 3, hi = 12, pad = 14;
    function X(mhz) { return pad + (mhz - lo) / (hi - lo) * (w - pad * 2); }
    // warm backlight
    var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#e9d7a8'); g.addColorStop(0.5, '#f4e6bf'); g.addColorStop(1, '#d8c28c');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    var hot = x.createRadialGradient(X(f), h * 0.5, 2, X(f), h * 0.5, w * 0.35); hot.addColorStop(0, 'rgba(255,236,190,.55)'); hot.addColorStop(1, 'rgba(255,236,190,0)');
    x.fillStyle = hot; x.fillRect(0, 0, w, h);
    // broadcast bands
    BANDS.forEach(function (b) { x.fillStyle = 'rgba(120,70,20,.13)'; x.fillRect(X(b[0]), h * 0.62, X(b[1]) - X(b[0]), h * 0.26); x.fillStyle = 'rgba(90,55,20,.75)'; x.font = '600 ' + Math.max(8, h * 0.2) + 'px "DX Mono", monospace'; x.textAlign = 'center'; x.fillText(b[2], (X(b[0]) + X(b[1])) / 2, h * 0.84); });
    // ticks
    x.strokeStyle = 'rgba(40,28,12,.8)'; x.fillStyle = 'rgba(40,28,12,.92)';
    for (var m = lo * 10; m <= hi * 10; m++) {
      var xx = Math.round(X(m / 10)) + 0.5, major = m % 10 === 0, mid = m % 5 === 0;
      x.lineWidth = major ? 1.4 : 0.8; x.beginPath(); x.moveTo(xx, 3); x.lineTo(xx, 3 + (major ? h * 0.32 : mid ? h * 0.22 : h * 0.13)); x.stroke();
      if (major) { x.font = '800 ' + Math.max(10, h * 0.34) + 'px "DX Stencil", sans-serif'; x.textAlign = 'center'; x.fillText(String(m / 10), xx, h * 0.62); }
    }
    x.font = '600 ' + Math.max(7, h * 0.18) + 'px "DX Mono", monospace'; x.textAlign = 'left'; x.fillStyle = 'rgba(60,40,15,.7)'; x.fillText('MHz', 4, h - 4);
    // activity marks (optional): little lit dots where something is on air
    (o.marks || []).forEach(function (s) { var xx = X(s.freq); x.fillStyle = s.bcast ? 'rgba(90,60,20,.35)' : 'rgba(170,40,20,.55)'; x.beginPath(); x.arc(xx, h - 5, s.bcast ? 1.6 : 2.2, 0, 7); x.fill(); });
    // needle
    var nx = X(UIclamp(f, lo, hi));
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(nx + 1.5, 0, 2, h);
    var ng = x.createLinearGradient(nx - 1.5, 0, nx + 1.5, 0); ng.addColorStop(0, '#8a1208'); ng.addColorStop(0.5, '#ff4a2a'); ng.addColorStop(1, '#8a1208');
    x.fillStyle = ng; x.fillRect(nx - 1.2, 0, 2.4, h);
    // glass sheen and inner shadow
    var sh = x.createLinearGradient(0, 0, 0, h); sh.addColorStop(0, 'rgba(255,255,255,.35)'); sh.addColorStop(0.18, 'rgba(255,255,255,.05)'); sh.addColorStop(0.8, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.18)');
    x.fillStyle = sh; x.fillRect(0, 0, w, h);
    return X;
  };
  P.glassX = function (w, f) { var pad = 14; return pad + (f - 3) / 9 * (w - pad * 2); };
  P.glassF = function (w, px) { var pad = 14; return 3 + (px - pad) / (w - pad * 2) * 9; };

  /** S-meter: value 0..1 (0 = S0, 0.75 = S9, 1 = +40 dB) */
  P.meter = function (x, w, h, v, o) {
    o = o || {};
    var cx = w / 2, cy = h * 1.34, R = h * 1.16;
    var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f6ecd0'); g.addColorStop(1, '#e2d2a6');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    var lamp = x.createRadialGradient(cx, h * 0.85, 4, cx, h * 0.85, w * 0.7); lamp.addColorStop(0, 'rgba(255,214,140,.45)'); lamp.addColorStop(1, 'rgba(255,214,140,0)');
    x.fillStyle = lamp; x.fillRect(0, 0, w, h);
    var a0 = -0.83, a1 = 0.83;
    function ang(t) { return -Math.PI / 2 + a0 + (a1 - a0) * t; }
    // red arc beyond S9
    x.lineWidth = Math.max(3, h * 0.07); x.strokeStyle = 'rgba(190,40,25,.85)'; x.beginPath(); x.arc(cx, cy, R * 0.86, ang(0.75), ang(1)); x.stroke();
    x.lineWidth = 1; x.strokeStyle = 'rgba(30,24,16,.85)'; x.beginPath(); x.arc(cx, cy, R * 0.86 - h * 0.05, ang(0), ang(1)); x.stroke();
    x.fillStyle = '#1e1810'; x.textAlign = 'center'; x.textBaseline = 'middle';
    var labels = [[0, ''], [1 / 12, '1'], [3 / 12, '3'], [5 / 12, '5'], [7 / 12, '7'], [0.75, '9'], [0.875, '+20'], [1, '+40']];
    for (var i = 0; i <= 24; i++) {
      var t = i / 24, a = ang(t), r1 = R * 0.86 - h * 0.05, r2 = r1 - (i % 2 ? h * 0.06 : h * 0.12);
      x.strokeStyle = t > 0.75 ? 'rgba(170,30,20,.9)' : 'rgba(30,24,16,.85)'; x.lineWidth = i % 2 ? 0.8 : 1.3;
      x.beginPath(); x.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); x.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); x.stroke();
    }
    x.font = '800 ' + Math.max(9, h * 0.15) + 'px "DX Stencil", sans-serif';
    labels.forEach(function (l) { if (!l[1]) return; var a = ang(l[0]), r = R * 0.86 - h * 0.24; x.fillStyle = l[0] > 0.75 ? '#a8241a' : '#1e1810'; x.fillText(l[1], cx + Math.cos(a) * r, cy + Math.sin(a) * r); });
    x.font = '600 ' + Math.max(7, h * 0.11) + 'px "DX Mono", monospace'; x.fillStyle = 'rgba(30,24,16,.6)'; x.textAlign = 'left'; x.fillText(o.label || 'S', 6, h - 8); x.textAlign = 'right'; x.fillText('dB', w - 6, h - 8); x.textAlign = 'center';
    // needle with shadow
    var na = ang(UIclamp(v, 0, 1.02));
    x.save(); x.lineCap = 'round';
    x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(cx + 3, cy + 2); x.lineTo(cx + 3 + Math.cos(na) * R * 0.9, cy + 2 + Math.sin(na) * R * 0.9); x.stroke();
    x.strokeStyle = '#141008'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(na) * R * 0.92, cy + Math.sin(na) * R * 0.92); x.stroke();
    x.restore();
    // pivot cover plate
    var pc = x.createLinearGradient(0, h * 0.78, 0, h); pc.addColorStop(0, '#2b2622'); pc.addColorStop(1, '#0f0c0a');
    x.fillStyle = pc; x.beginPath(); x.moveTo(cx - w * 0.22, h); x.quadraticCurveTo(cx, h * 0.72, cx + w * 0.22, h); x.closePath(); x.fill();
    // glass
    var gl = x.createLinearGradient(0, 0, w, h); gl.addColorStop(0, 'rgba(255,255,255,.35)'); gl.addColorStop(0.35, 'rgba(255,255,255,.04)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gl; x.fillRect(0, 0, w, h);
  };

  /** magic eye (6E5-style): close 0..1 (1 = shadow closed = perfectly tuned) */
  P.eye = function (x, w, h, close, on) {
    var cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 1;
    x.fillStyle = '#060806'; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill();
    if (on !== false) {
      var sh = (1 - UIclamp(close, 0, 1)) * Math.PI * 0.5 + 0.04;
      var g = x.createRadialGradient(cx, cy, R * 0.18, cx, cy, R * 0.95); g.addColorStop(0, 'rgba(120,255,170,.95)'); g.addColorStop(0.6, 'rgba(40,210,120,.85)'); g.addColorStop(1, 'rgba(10,90,50,.6)');
      x.fillStyle = g; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R * 0.92, -Math.PI / 2 + sh, -Math.PI / 2 - sh + Math.PI * 2); x.closePath(); x.fill();
      x.save(); x.globalCompositeOperation = 'lighter'; var gg = x.createRadialGradient(cx, cy, 0, cx, cy, R); gg.addColorStop(0, 'rgba(90,255,150,.25)'); gg.addColorStop(1, 'rgba(90,255,150,0)'); x.fillStyle = gg; x.fillRect(0, 0, w, h); x.restore();
    }
    x.fillStyle = '#0b0d0b'; x.beginPath(); x.arc(cx, cy, R * 0.22, 0, 7); x.fill();
    var gl = x.createLinearGradient(0, 0, 0, h); gl.addColorStop(0, 'rgba(255,255,255,.28)'); gl.addColorStop(0.45, 'rgba(255,255,255,0)'); x.fillStyle = gl; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill();
  };

  /** a bakelite knob element. o: {size, label, ticks, onTurn(deltaDeg, e), detent} */
  P.knob = function (host, o) {
    var sz = o.size || 120;
    var el = UIel('<div class="knob' + (o.cls ? ' ' + o.cls : '') + '" style="--sz:' + sz + 'px" role="slider" tabindex="0" aria-label="' + UIesc(o.label || 'Knob') + '">' +
      '<svg class="k-scale" viewBox="-60 -60 120 120" aria-hidden="true">' + (function () { var s = ''; for (var i = 0; i < (o.ticks || 36); i++) { var a = i / (o.ticks || 36) * Math.PI * 2, r1 = 57, r2 = i % 3 ? 53.5 : 51; s += '<line x1="' + (Math.sin(a) * r1).toFixed(2) + '" y1="' + (-Math.cos(a) * r1).toFixed(2) + '" x2="' + (Math.sin(a) * r2).toFixed(2) + '" y2="' + (-Math.cos(a) * r2).toFixed(2) + '"/>'; } return s; })() + '</svg>' +
      '<div class="k-skirt"></div><div class="k-cap"><i class="k-mark"></i>' + (o.dimple ? '<i class="k-dimple"></i>' : '') + '</div><div class="k-light"></div></div>');
    host.appendChild(el);
    var cap = el.querySelector('.k-cap'), ang = 0, last = null, acc = 0;
    function angleAt(e) { var r = el.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; }
    el.setAngle = function (a) { ang = a; cap.style.transform = 'rotate(' + a + 'deg)'; };
    el.addEventListener('pointerdown', function (e) { last = angleAt(e); el.classList.add('grab'); try { el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } e.preventDefault(); if (o.onStart) o.onStart(); });
    el.addEventListener('pointermove', function (e) {
      if (last === null) return;
      var a = angleAt(e), d = a - last; if (d > 180) d -= 360; if (d < -180) d += 360; last = a;
      ang += d; cap.style.transform = 'rotate(' + ang + 'deg)';
      acc += d; var step = o.detent || 12; while (Math.abs(acc) >= step) { acc -= step * Math.sign(acc); UIAudio.cue('detent'); }
      if (o.onTurn) o.onTurn(d, e);
    });
    function up() { if (last === null) return; last = null; el.classList.remove('grab'); if (o.onEnd) o.onEnd(); }
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', function (e) { e.preventDefault(); var d = e.deltaY > 0 ? -6 : 6; ang += d; cap.style.transform = 'rotate(' + ang + 'deg)'; UIAudio.cue('detent'); if (o.onTurn) o.onTurn(d, e); if (o.onEnd) o.onEnd(); }, { passive: false });
    el.addEventListener('keydown', function (e) { var d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 6 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -6 : 0; if (!d) return; e.preventDefault(); ang += d; cap.style.transform = 'rotate(' + ang + 'deg)'; if (o.onTurn) o.onTurn(d, e); if (o.onEnd) o.onEnd(); });
    return el;
  };
  return P;
})();
