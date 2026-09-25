/* DEPTH engine — 01-rng.js
 * Seeded randomness, calendar and small helpers. Two kinds of randomness:
 *  - DX.rng(seed): a sequential stream (generation: city, ring, traffic plan).
 *  - DX.u(key, a, b, c): counter-based uniform in [0,1) — a pure function of its
 *    arguments. Copy quality, DF errors, warrant outcomes and security-officer
 *    reactions draw from it, so a save is a plain snapshot with no generator state.
 * Loads in node (vm) and in the browser: no DOM access at load time.
 */
var DX = (typeof DX !== 'undefined' && DX) ? DX : {};

(function () {
  'use strict';

  function hashStr(s) {
    s = String(s);
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  }
  DX.hash = hashStr;

  /** counter-based uniform [0,1): key (uint32) + up to three integers */
  function u(key, a, b, c) {
    var h = key ^ Math.imul((a | 0) + 0x632BE5AB, 0x9E3779B1);
    var hb = Math.imul((b | 0) + 0x5BD1E995, 0x85EBCA77);
    h ^= (hb << 16) | (hb >>> 16);
    h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
    h ^= Math.imul((c | 0) + 0x27D4EB2F, 0xC2B2AE3D);
    h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  DX.u = u;
  /** standard normal from the counter RNG */
  DX.un = function (key, a, b, c) {
    var u1 = u(key, a, b, c), u2 = u(key ^ 0x5bd1e995, a, b, c);
    return Math.sqrt(-2 * Math.log(u1 < 1e-12 ? 1e-12 : u1)) * Math.cos(2 * Math.PI * u2);
  };

  function mulberry32(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** DX.rng(seed) -> R: sequential generator with helpers. R.fork(label) = independent sub-stream. */
  DX.rng = function (seed) {
    var seedStr = String(seed);
    var f = mulberry32(hashStr(seedStr));
    var R = {
      seed: seedStr,
      next: f,
      int: function (a, b) { return a + Math.floor(f() * (b - a + 1)); },
      range: function (a, b) { return a + f() * (b - a); },
      chance: function (p) { return f() < p; },
      pick: function (arr) { return arr[Math.floor(f() * arr.length)]; },
      shuffle: function (arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(f() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
      },
      sample: function (arr, n) { return R.shuffle(arr).slice(0, Math.min(n, arr.length)); },
      weighted: function (items, wf) {
        var tot = 0, i, ws = [];
        for (i = 0; i < items.length; i++) { var w = wf ? wf(items[i]) : items[i][1]; ws.push(w); tot += w; }
        var x = f() * tot;
        for (i = 0; i < items.length; i++) { x -= ws[i]; if (x < 0) return wf ? items[i] : items[i][0]; }
        return wf ? items[items.length - 1] : items[items.length - 1][0];
      },
      normal: function (m, sd) {
        var u1 = f(), u2 = f();
        return (m || 0) + (sd === undefined ? 1 : sd) * Math.sqrt(-2 * Math.log(u1 < 1e-12 ? 1e-12 : u1)) * Math.cos(2 * Math.PI * u2);
      },
      digits: function (n) { var s = ''; for (var i = 0; i < n; i++) s += Math.floor(f() * 10); return s; },
      fork: function (label) { return DX.rng(seedStr + '/' + label); }
    };
    return R;
  };

  // ------------------------------------------------------------- calendar
  // Case nights start on Monday 10 October 1977 (shift 0). A shift runs 18:00 -> 02:00.
  var DAY_NAMES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  var DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  DX.CAL = { startDate: 10, month: 'Oct', year: 1977, startHour: 18, shiftLen: 480, DAY_NAMES: DAY_NAMES, DAY_SHORT: DAY_SHORT };
  /** shift index -> day name used in messages (the evening the shift starts) */
  DX.nightName = function (shift, dayOffset) { return DAY_NAMES[((shift + (dayOffset || 0)) % 7 + 7) % 7]; };
  DX.nightShort = function (shift, dayOffset) { return DAY_SHORT[((shift + (dayOffset || 0)) % 7 + 7) % 7]; };
  /** minute within shift -> 'HH:MM' (24h) */
  DX.hhmm = function (minute) {
    var m = Math.round(minute) + DX.CAL.startHour * 60;
    var h = Math.floor(m / 60) % 24, mm = ((m % 60) + 60) % 60;
    return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
  };
  /** minute within shift -> 'HHMM' (four figures, as written in messages) */
  DX.hhmm4 = function (minute) { return DX.hhmm(minute).replace(':', ''); };
  /** 'HHMM' or 'HH:MM' -> minute within the shift (18:00 = 0; hours before 12 count as after midnight) */
  DX.minuteOf = function (s) {
    s = String(s).replace(':', '');
    if (!/^\d{4}$/.test(s)) return null;
    var h = +s.slice(0, 2), m = +s.slice(2);
    if (h > 23 || m > 59) return null;
    if (h < 12) h += 24;
    return (h - DX.CAL.startHour) * 60 + m;
  };
  DX.dateLabel = function (shift, dayOffset) {
    var d = DX.CAL.startDate + shift + (dayOffset || 0);
    return DX.nightShort(shift, dayOffset) + ' ' + d + ' ' + DX.CAL.month;
  };

  // ------------------------------------------------------------- small helpers
  DX.clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  DX.dist = function (a, b) { var dx = a[0] - b[0], dy = a[1] - b[1]; return Math.sqrt(dx * dx + dy * dy); };
  DX.round = function (x, n) { var p = Math.pow(10, n || 0); return Math.round(x * p) / p; };
  DX.pad = function (n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; };
  DX.copy = function (o) { return JSON.parse(JSON.stringify(o)); };
  DX.uniq = function (arr) { var seen = {}, out = []; arr.forEach(function (x) { var k = typeof x === 'object' ? JSON.stringify(x) : String(x); if (!seen[k]) { seen[k] = 1; out.push(x); } }); return out; };
  DX.now = function () { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); };

  /** point in polygon (ray casting); poly = [[x,y]..] */
  DX.inPoly = function (p, poly) {
    var x = p[0], y = p[1], inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  };
  DX.polyArea = function (poly) {
    var a = 0;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
    return Math.abs(a / 2);
  };
  DX.centroid = function (poly) {
    var cx = 0, cy = 0, a = 0;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var f = poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
      cx += (poly[j][0] + poly[i][0]) * f; cy += (poly[j][1] + poly[i][1]) * f; a += f;
    }
    if (Math.abs(a) < 1e-12) return poly[0].slice();
    return [cx / (3 * a), cy / (3 * a)];
  };
  /** clip convex polygon by half-plane n·p <= c */
  DX.clipHalf = function (poly, nx, ny, c) {
    var out = [];
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i], q = poly[(i + 1) % poly.length];
      var dp = nx * p[0] + ny * p[1] - c, dq = nx * q[0] + ny * q[1] - c;
      if (dp <= 0) out.push(p);
      if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
        var t = dp / (dp - dq);
        out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    }
    return out;
  };

  // ------------------------------------------------------------- compact save strings (LZW over UTF-16 safe chars)
  DX.pack = function (str) {
    var dict = {}, data = (str + '').split(''), out = [], phrase = data[0], code = 256, i;
    if (!str) return '';
    for (i = 1; i < data.length; i++) {
      var cur = data[i];
      if (dict[phrase + cur] != null) phrase += cur;
      else {
        out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
        if (code < 60000) dict[phrase + cur] = code++;
        phrase = cur;
      }
    }
    out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
    // shift codes into a safe range (avoid surrogates 0xD800-0xDFFF and control chars)
    return out.map(function (c) { var v = c + 32; if (v >= 0xD800) v += 2048; return String.fromCharCode(v); }).join('');
  };
  DX.unpack = function (s) {
    if (!s) return '';
    var codes = s.split('').map(function (ch) { var v = ch.charCodeAt(0); if (v >= 0xD800 + 2048) v -= 2048; return v - 32; });
    var dict = {}, cur = String.fromCharCode(codes[0]), old = cur, out = [cur], code = 256, phrase;
    for (var i = 1; i < codes.length; i++) {
      var c = codes[i];
      if (c < 256) phrase = String.fromCharCode(c);
      else phrase = dict[c] !== undefined ? dict[c] : (old + cur);
      out.push(phrase);
      cur = phrase.charAt(0);
      if (code < 60000) dict[code++] = old + cur;
      old = phrase;
    }
    return out.join('');
  };
})();
