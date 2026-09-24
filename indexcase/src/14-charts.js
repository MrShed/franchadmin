/* INDEX CASE UI — 14-charts.js: SVG charts drawn to scale at the host's real
 * width (so type stays 11-12px on any screen), with a scrub-to-read tooltip. */
var UIChart = (function () {
  var C = {};
  var NS = 'http://www.w3.org/2000/svg';
  C.nice = function (max, n) {
    n = n || 4; if (!(max > 0)) return { max: 1, step: 1, ticks: [0, 1] };
    var raw = max / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    var step = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
    if (step < 1 && max >= 1) step = 1;
    var top = Math.ceil(max / step) * step, t = [];
    for (var v = 0; v <= top + 1e-9; v += step) t.push(+v.toFixed(6));
    return { max: top, step: step, ticks: t };
  };
  function fmtTick(v) { return v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'k' : String(+v.toFixed(2)); }
  C.width = function (host) { return Math.max(240, Math.round(host.clientWidth || host.getBoundingClientRect().width || 340)); };

  /** time axis labels: dates every ~week */
  function xTicks(n, start, x, bw, H, every) {
    var out = '', last = -99;
    every = every || (n > 90 ? 28 : n > 45 ? 14 : n > 20 ? 7 : n > 10 ? 3 : 2);
    for (var i = 0; i < n; i++) {
      var d = start + i;
      if (((d % every) + every) % every !== 0) continue;
      var cx = x(i) + bw / 2;
      if (cx - last < 46) continue; last = cx;
      out += '<line x1="' + cx.toFixed(1) + '" x2="' + cx.toFixed(1) + '" y1="' + H + '" y2="' + (H + 4) + '" class="ax"/><text x="' + cx.toFixed(1) + '" y="' + (H + 16) + '" text-anchor="middle" class="tk">' + UIesc(UIA.dateShort(d)) + '</text>';
    }
    return out;
  }
  function yGrid(sc, y, L, R, lbl) {
    return sc.ticks.map(function (t) { var yy = y(t).toFixed(1); return '<line x1="' + L + '" x2="' + R + '" y1="' + yy + '" y2="' + yy + '" class="' + (t === 0 ? 'base' : 'grid') + '"/>' + (lbl !== false ? '<text x="' + (L - 6) + '" y="' + (+yy + 4) + '" text-anchor="end" class="tk">' + fmtTick(t) + '</text>' : ''); }).join('');
  }
  function hatch(id, col) { return '<pattern id="' + id + '" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="' + col + '" fill-opacity=".07"/><line x1="0" y1="0" x2="0" y2="4" stroke="' + col + '" stroke-width="1" stroke-opacity=".7"/></pattern>'; }
  function barPath(x, y, w, h, r) { r = Math.min(r, w / 2, h); if (h <= 0) return ''; return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z'; }

  /** attach scrub tooltip: cols = number of columns, geom(i)->{x}, text(i)->html */
  C.scrub = function (host, svg, o) {
    var tip = host.querySelector('.ch-tip'); if (!tip) { tip = document.createElement('div'); tip.className = 'ch-tip'; host.appendChild(tip); }
    var cur = svg.querySelector('.cursor');
    function at(e) {
      var r = svg.getBoundingClientRect(), px = e.clientX - r.left;
      var i = UIclamp(Math.floor((px - o.L) / o.bw), 0, o.n - 1);
      var html = o.text(i); if (!html) { hide(); return; }
      tip.innerHTML = html; tip.classList.add('on');
      var cx = o.L + i * o.bw + o.bw / 2;
      if (cur) { cur.setAttribute('x', (o.L + i * o.bw).toFixed(1)); cur.setAttribute('width', Math.max(2, o.bw).toFixed(1)); cur.style.opacity = 1; }
      var tw = tip.offsetWidth, hw = host.clientWidth;
      tip.style.left = UIclamp(cx - tw / 2, 0, hw - tw) + 'px';
    }
    function hide() { tip.classList.remove('on'); if (cur) cur.style.opacity = 0; }
    svg.addEventListener('pointerdown', function (e) { at(e); });
    svg.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' || e.buttons) at(e); });
    svg.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hide(); });
    return { hide: hide };
  };

  /** epidemic curve: bars by onset (confirmed + probable), suspected cases stacked pale on top,
   * nowcast band, 7-day average, optional reported line, and orders/events as labelled markers.
   * o: {from, sus: [], marks: [{day, label, kind}], showReport, today, h} */
  C.epi = function (host, cv, o) {
    o = o || {};
    var W = C.width(host), Hh = o.h || 210, L = 30, R = W - 6, T = 16, B = Hh - 24;
    var from = o.from || 0, n = cv.n - from;
    if (n <= 0) { host.innerHTML = '<div class="empty">No cases yet.</div>'; return; }
    var on = cv.byOnset.slice(from), rep = cv.byReport.slice(from), nc = cv.nowcast.slice(from), sus = (o.sus || []).slice(from);
    var tot = on.map(function (v, i) { return v + (sus[i] || 0); });
    var mx = 1; for (var i = 0; i < n; i++) mx = Math.max(mx, tot[i], nc[i] ? nc[i].hi + (sus[i] || 0) : 0, o.showReport ? rep[i] : 0);
    var sc = C.nice(mx * 1.08, 4), bw = (R - L) / n, gap = bw > 6 ? 2 : bw > 3 ? 1 : 0;
    var x = function (i) { return L + i * bw; }, y = function (v) { return B - (v / sc.max) * (B - T); };
    var s = '<svg width="' + W + '" height="' + Hh + '" viewBox="0 0 ' + W + ' ' + Hh + '" class="chart" role="img" aria-label="' + UIesc(o.label || 'Epidemic curve') + '"><defs>' + hatch('hn', '#ff8a57') +
      '<linearGradient id="gb" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffb088"/><stop offset=".35" stop-color="#ff7a45"/><stop offset="1" stop-color="#c9431b"/></linearGradient>' +
      '<linearGradient id="gw" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ff7a45" stop-opacity=".16"/><stop offset="1" stop-color="#ff7a45" stop-opacity="0"/></linearGradient></defs>';
    s += yGrid(sc, y, L, R);
    // annotations: orders and key decisions as hairlines with vertical labels
    var marks = (o.marks || []).filter(function (m) { return m.day - cv.start - from >= 0 && m.day - cv.start - from <= n; }), lastX = -99;
    marks.sort(function (a, b) { return a.day - b.day; }).forEach(function (m) {
      var mx0 = x(m.day - cv.start - from), col = m.kind === 'event' ? '#c5e4ff' : '#8ce8cf';
      s += '<line x1="' + mx0.toFixed(1) + '" x2="' + mx0.toFixed(1) + '" y1="' + T + '" y2="' + B + '" stroke="' + col + '" stroke-opacity=".35" stroke-dasharray="1 3"/>';
      s += '<circle cx="' + mx0.toFixed(1) + '" cy="' + B + '" r="2.5" fill="' + col + '"/>';
      if (mx0 - lastX > 11) { s += '<text transform="translate(' + (mx0 + 3.5).toFixed(1) + ' ' + (T + 2) + ') rotate(90)" class="tk mk" fill="' + col + '">' + UIesc(String(m.label).toUpperCase().slice(0, 24)) + '</text>'; lastX = mx0; }
    });
    s += '<rect class="cursor" x="0" y="' + T + '" width="0" height="' + (B - T) + '"/>';
    s += '<g class="bars">';
    for (i = 0; i < n; i++) {
      var bx = x(i) + gap / 2, w = Math.max(1, bw - gap), dl = 'animation-delay:' + Math.min(600, i * 8) + 'ms';
      if (nc[i] && nc[i].hi > on[i]) {
        var yt = y(nc[i].hi + (sus[i] || 0)), yb = y(tot[i]);
        s += '<rect x="' + bx.toFixed(1) + '" y="' + yt.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(0, yb - yt).toFixed(1) + '" fill="url(#hn)" rx="' + Math.min(2, w / 2) + '"/>';
        if (nc[i].lo > on[i]) s += '<line x1="' + bx.toFixed(1) + '" x2="' + (bx + w).toFixed(1) + '" y1="' + y(nc[i].lo + (sus[i] || 0)).toFixed(1) + '" y2="' + y(nc[i].lo + (sus[i] || 0)).toFixed(1) + '" stroke="#ffa477" stroke-width="1" stroke-dasharray="2 2"/>';
      }
      if (on[i] > 0) s += '<path d="' + barPath(bx, y(on[i]), w, B - y(on[i]), 2) + '" fill="url(#gb)" style="' + dl + '"/>';
      if (sus[i] > 0) { var sy = y(tot[i]), sh = y(on[i]) - sy; s += '<path d="' + barPath(bx + .5, sy + .5, Math.max(.5, w - 1), Math.max(.5, sh - 1), 2) + '" fill="rgba(217,211,199,.14)" stroke="rgba(233,226,212,.7)" stroke-width="1" style="' + dl + '"/>'; }
    }
    s += '</g>';
    // 7-day average of all cases by onset
    if (n >= 10 && UIsum(tot) >= 20) {
      var avg = '', started = false;
      for (i = 0; i < n; i++) { var a0 = Math.max(0, i - 6), sm = 0; for (var j = a0; j <= i; j++) sm += tot[j]; var v = sm / (i - a0 + 1); if (!started && !sm) continue; avg += (started ? 'L' : 'M') + (x(i) + bw / 2).toFixed(1) + ',' + y(v).toFixed(1); started = true; }
      if (avg) s += '<path d="' + avg + '" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round" class="draw"/>';
    }
    if (o.showReport) {
      var d = ''; for (i = 0; i < n; i++) d += (i ? 'L' : 'M') + (x(i) + bw / 2).toFixed(1) + ',' + y(rep[i]).toFixed(1);
      s += '<path d="' + d + '" fill="none" stroke="#8fcbff" stroke-width="1.8" stroke-linejoin="round" class="draw"/>';
    }
    if (o.today !== undefined) { var tx = x(n - 1) + bw; s += '<line x1="' + tx + '" x2="' + tx + '" y1="' + (T - 6) + '" y2="' + B + '" class="today"/><text x="' + (tx - 4) + '" y="' + (T - 1) + '" text-anchor="end" class="tk today-l">TODAY</text>'; }
    s += xTicks(n, cv.start + from, x, bw, B) + '</svg>';
    host.innerHTML = s;
    var svg = host.querySelector('svg');
    C.scrub(host, svg, { L: L, bw: bw, n: n, text: function (i) {
      var d = cv.start + from + i;
      return '<b>' + UIesc(UIA.dateLabel(d)) + '</b><span><i style="background:#ff8a57"></i>Confirmed or probable <em>' + on[i] + '</em></span>' + (sus[i] ? '<span><i class="su"></i>Suspected <em>' + sus[i] + '</em></span>' : '') + (nc[i] ? '<span><i class="hz"></i>Not yet reported <em>' + Math.max(0, nc[i].lo - on[i]) + '–' + Math.max(0, nc[i].hi - on[i]) + '</em></span>' : '') + (o.showReport ? '<span><i style="background:#8fcbff"></i>Reported <em>' + rep[i] + '</em></span>' : '');
    } });
  };

  /** small single-series bars (admissions / deaths) sharing the epi x axis */
  C.mini = function (host, vals, start, o) {
    var W = C.width(host), Hh = o.h || 96, L = 34, R = W - 8, T = 10, B = Hh - 20, n = vals.length;
    var mx = Math.max(1, Math.max.apply(null, vals.concat([0]))), sc = C.nice(mx, 2), bw = (R - L) / Math.max(1, n), gap = bw > 6 ? 2 : bw > 3 ? 1 : 0;
    var x = function (i) { return L + i * bw; }, y = function (v) { return B - (v / sc.max) * (B - T); };
    var s = '<svg width="' + W + '" height="' + Hh + '" class="chart" role="img" aria-label="' + UIesc(o.label) + '">' + yGrid(sc, y, L, R) + '<rect class="cursor" x="0" y="' + T + '" width="0" height="' + (B - T) + '"/><g class="bars">';
    for (var i = 0; i < n; i++) if (vals[i] > 0) s += '<path d="' + barPath(x(i) + gap / 2, y(vals[i]), Math.max(1, bw - gap), B - y(vals[i]), 2) + '" fill="' + o.color + '"/>';
    s += '</g>' + xTicks(n, start, x, bw, B) + '</svg>';
    host.innerHTML = s;
    C.scrub(host, host.querySelector('svg'), { L: L, bw: bw, n: n, text: function (i) { return '<b>' + UIesc(UIA.dateLabel(start + i)) + '</b><span><i style="background:' + o.color + '"></i>' + UIesc(o.label) + ' <em>' + vals[i] + '</em></span>'; } });
  };

  /** lines over time (debrief: you vs ghost). series: [{vals, color, dash, label, fill}] */
  C.lines = function (host, series, start, o) {
    o = o || {};
    var W = C.width(host), Hh = o.h || 200, L = 40, R = W - 10, T = 14, B = Hh - 24;
    var n = 0, mx = 1; series.forEach(function (s) { n = Math.max(n, s.vals.length); s.vals.forEach(function (v) { mx = Math.max(mx, v || 0); }); });
    var sc = C.nice(mx, 4), bw = (R - L) / Math.max(1, n - 1);
    var x = function (i) { return L + i * bw; }, y = function (v) { return B - ((v || 0) / sc.max) * (B - T); };
    var s = '<svg width="' + W + '" height="' + Hh + '" class="chart" role="img" aria-label="' + UIesc(o.label || '') + '"><defs>' + series.map(function (se, k) { return '<linearGradient id="lg' + k + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + se.color + '" stop-opacity=".32"/><stop offset="1" stop-color="' + se.color + '" stop-opacity="0"/></linearGradient>'; }).join('') + '</defs>' + yGrid(sc, y, L, R);
    s += '<rect class="cursor" x="0" y="' + T + '" width="0" height="' + (B - T) + '"/>';
    series.forEach(function (se, k) {
      var d = ''; se.vals.forEach(function (v, i) { d += (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1); });
      if (se.fill) s += '<path d="' + d + 'L' + x(se.vals.length - 1).toFixed(1) + ',' + B + 'L' + L + ',' + B + 'Z" fill="url(#lg' + k + ')"/>';
      if (se.dash) s += '<path d="' + d + '" fill="none" stroke="' + se.color + '" stroke-opacity=".18" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="' + se.color + '" stroke-opacity=".85" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="1 3.5" class="ghost"/>';
      else s += '<path d="' + d + '" fill="none" stroke="' + se.color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" class="draw"/>';
      var li = se.vals.length - 1; if (li >= 0 && se.label) { s += '<circle cx="' + x(li).toFixed(1) + '" cy="' + y(se.vals[li]).toFixed(1) + '" r="3.5" fill="' + se.color + '" stroke="#0b1219" stroke-width="2"/>'; if (o.endLabels) s += '<text x="' + (x(li) - 6).toFixed(1) + '" y="' + (y(se.vals[li]) - 8).toFixed(1) + '" text-anchor="end" class="tk el" fill="' + se.color + '">' + UIesc(se.label) + '</text>'; }
    });
    s += xTicks(n, start, function (i) { return x(i) - bw / 2; }, bw, B, o.every) + '</svg>';
    host.innerHTML = s;
    C.scrub(host, host.querySelector('svg'), { L: L - bw / 2, bw: bw, n: n, text: function (i) {
      return '<b>' + UIesc(UIA.dateLabel(start + i)) + '</b>' + series.map(function (se) { return '<span><i style="background:' + se.color + '"></i>' + UIesc(se.label) + ' <em>' + UIfmt.n(se.vals[i]) + '</em></span>'; }).join('');
    } });
  };

  /** horizontal paired bars by age band: rows [{label, a, b}] a = share of cases (filled), b = share of population (outline tick) */
  C.ageBars = function (host, rows, o) {
    var W = C.width(host), rh = 26, T = 4, L = 54, R = W - 44, Hh = T + rows.length * rh + 4;
    var mx = 0.01; rows.forEach(function (r) { mx = Math.max(mx, r.a || 0, r.b || 0); });
    var sx = function (v) { return L + (v / mx) * (R - L); };
    var gid = 'ag' + UIh(o.color + o.label);
    var s = '<svg width="' + W + '" height="' + Hh + '" class="chart" role="img" aria-label="' + UIesc(o.label) + '"><defs><linearGradient id="' + gid + '" x1="0" x2="1"><stop offset="0" stop-color="' + o.color + '" stop-opacity=".35"/><stop offset="1" stop-color="' + o.color + '"/></linearGradient></defs>';
    rows.forEach(function (r, i) {
      var yy = T + i * rh;
      s += '<text x="' + (L - 8) + '" y="' + (yy + 16) + '" text-anchor="end" class="tk">' + UIesc(r.label) + '</text>';
      s += '<rect x="' + L + '" y="' + (yy + 6) + '" width="' + (R - L) + '" height="12" rx="6" fill="rgba(255,255,255,.035)"/>';
      if (r.a > 0) s += '<rect x="' + L + '" y="' + (yy + 6) + '" width="' + Math.max(3, sx(r.a) - L).toFixed(1) + '" height="12" rx="6" fill="url(#' + gid + ')" class="grow" style="animation-delay:' + (i * 50) + 'ms"/><circle cx="' + Math.max(L + 6, sx(r.a) - 6).toFixed(1) + '" cy="' + (yy + 12) + '" r="3" fill="#fff" fill-opacity=".55" class="grow" style="animation-delay:' + (i * 50) + 'ms"/>';
      if (r.b !== undefined) s += '<line x1="' + sx(r.b).toFixed(1) + '" x2="' + sx(r.b).toFixed(1) + '" y1="' + (yy + 2) + '" y2="' + (yy + 22) + '" stroke="#e9eff4" stroke-width="2" stroke-linecap="round" opacity=".75"/>';
      s += '<text x="' + (R + 6) + '" y="' + (yy + 16) + '" class="tk v">' + (o.fmt ? o.fmt(r) : UIfmt.pct(r.a)) + '</text>';
    });
    host.innerHTML = s + '</svg>';
  };

  /** sparkline with area; returns svg string */
  C.spark = function (vals, w, h, color, o) {
    o = o || {};
    var n = vals.length; if (!n) return '<svg width="' + w + '" height="' + h + '"></svg>';
    var mx = o.max || Math.max.apply(null, vals.map(function (v) { return v || 0; }).concat([1]));
    var x = function (i) { return n === 1 ? w / 2 : 1 + i * (w - 2) / (n - 1); }, y = function (v) { return h - 2 - ((v || 0) / mx) * (h - 5); };
    var d = ''; vals.forEach(function (v, i) { d += (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1); });
    var id = 'sp' + UIh(color + w + h + n + (o.id || ''));
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" class="spark"><defs><linearGradient id="' + id + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity=".45"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + d + 'L' + x(n - 1).toFixed(1) + ',' + h + 'L' + x(0).toFixed(1) + ',' + h + 'Z" fill="url(#' + id + ')"/><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<circle cx="' + x(n - 1).toFixed(1) + '" cy="' + y(vals[n - 1]).toFixed(1) + '" r="2.6" fill="' + color + '"/></svg>';
  };

  /** effect estimate with confidence interval on a ratio scale */
  C.ci = function (host, est, lo, hi, o) {
    o = o || {};
    var W = C.width(host), Hh = 86, L = 16, R = W - 16, a = o.min || 0.25, b = o.max || 2;
    var sx = function (v) { return L + (Math.log(UIclamp(v, a, b)) - Math.log(a)) / (Math.log(b) - Math.log(a)) * (R - L); };
    var s = '<svg width="' + W + '" height="' + Hh + '" class="chart"><rect x="' + L + '" y="18" width="' + (sx(1) - L) + '" height="34" fill="rgba(63,208,170,.07)"/>';
    [0.25, 0.5, 1, 2].forEach(function (t) { if (t < a || t > b) return; s += '<line x1="' + sx(t) + '" x2="' + sx(t) + '" y1="16" y2="56" class="' + (t === 1 ? 'base' : 'grid') + '"/><text x="' + sx(t) + '" y="70" text-anchor="middle" class="tk">' + t + '×</text>'; });
    s += '<text x="' + (L + 4) + '" y="13" class="tk" fill="#3fd0aa">helps</text><text x="' + (R - 4) + '" y="13" class="tk" text-anchor="end">harms</text>';
    s += '<line x1="' + sx(lo) + '" x2="' + sx(hi) + '" y1="35" y2="35" stroke="#e9eff4" stroke-width="2.5" stroke-linecap="round"/><line x1="' + sx(lo) + '" x2="' + sx(lo) + '" y1="28" y2="42" stroke="#e9eff4" stroke-width="2"/><line x1="' + sx(hi) + '" x2="' + sx(hi) + '" y1="28" y2="42" stroke="#e9eff4" stroke-width="2"/>';
    s += '<rect x="' + (sx(est) - 6) + '" y="29" width="12" height="12" transform="rotate(45 ' + sx(est) + ' 35)" fill="#ff7a45" stroke="#0b1219" stroke-width="2"/></svg>';
    host.innerHTML = s + '<div class="note" style="text-align:center">' + UIesc(o.label || '') + '</div>';
  };
  return C;
})();
