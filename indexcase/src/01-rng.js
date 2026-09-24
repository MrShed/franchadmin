/* INDEX CASE engine — 01-rng.js
 * Seeded randomness and small helpers. Two kinds of randomness:
 *  - IX.rng(seed): a sequential stream (used for generation: pathogen, city).
 *  - IX.u(key, a, b, c): counter-based uniform in [0,1) — a pure function of its
 *    arguments. The simulation and surveillance use it for every per-event draw,
 *    so a draw never depends on what else happened that day. That is what lets the
 *    ghost city reproduce the untouched trajectory exactly, and lets a save be a
 *    plain snapshot with no generator state.
 * Loads in node (vm) and in the browser: no DOM access at load time.
 */
var IX = (typeof IX !== 'undefined' && IX) ? IX : {};

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
  IX.hash = hashStr;

  function mix(h) {
    h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
    h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
    h ^= h >>> 16;
    return h >>> 0;
  }
  IX.mix = mix;

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
  IX.u = u;
  /** integer hash (for ids, portraits, labels) */
  IX.h3 = function (key, a, b, c) { return Math.floor(u(key, a, b, c) * 4294967296) >>> 0; };

  // ------------------------------------------------------------- distributions (from a uniform source)
  /** standard normal from two uniforms */
  function normal2(u1, u2) { return Math.sqrt(-2 * Math.log(u1 < 1e-12 ? 1e-12 : u1)) * Math.cos(2 * Math.PI * u2); }
  IX.normal2 = normal2;
  /** gamma(mean, sd) by Wilson-Hilferty on a normal draw — smooth, cheap, good enough for delays */
  function gammaMS(mean, sd, z) {
    if (sd <= 0) return mean;
    var k = (mean * mean) / (sd * sd), th = (sd * sd) / mean;
    var c = 1 / (9 * k);
    var v = 1 - c + z * Math.sqrt(c);
    if (v < 0.02) v = 0.02;
    return k * th * v * v * v;
  }
  IX.gammaMS = gammaMS;
  /** Poisson by inversion from a uniform (small means) */
  function poissonU(lam, x) {
    if (lam <= 0) return 0;
    if (lam > 30) { var zz = Math.sqrt(-2 * Math.log(Math.max(1e-12, x))) * Math.cos(2 * Math.PI * ((x * 7919) % 1)); return Math.max(0, Math.round(lam + Math.sqrt(lam) * zz)); }
    var p = Math.exp(-lam), c = p, k = 0;
    while (x > c && k < 200) { k++; p *= lam / k; c += p; }
    return k;
  }
  IX.poissonU = poissonU;

  /** IX.rng(seed) -> sequential stream R */
  IX.rng = function (seed) {
    var seedStr = String(seed);
    var a = hashStr(seedStr);
    function f() {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    var R = {
      seed: seedStr,
      next: f,
      int: function (lo, hi) { return lo + Math.floor(f() * (hi - lo + 1)); },
      range: function (lo, hi) { return lo + f() * (hi - lo); },
      chance: function (p) { return f() < p; },
      pick: function (arr) { return arr[Math.floor(f() * arr.length)]; },
      shuffle: function (arr) {
        var b = arr.slice();
        for (var i = b.length - 1; i > 0; i--) { var j = Math.floor(f() * (i + 1)); var t = b[i]; b[i] = b[j]; b[j] = t; }
        return b;
      },
      sample: function (arr, n) { return R.shuffle(arr).slice(0, Math.min(n, arr.length)); },
      weighted: function (items, wf) {
        var tot = 0, i, ws = [];
        for (i = 0; i < items.length; i++) { var w = wf ? wf(items[i]) : items[i][1]; ws.push(w); tot += w; }
        var x = f() * tot;
        for (i = 0; i < items.length; i++) { x -= ws[i]; if (x < 0) return wf ? items[i] : items[i][0]; }
        return wf ? items[items.length - 1] : items[items.length - 1][0];
      },
      normal: function (m, s) { return (m || 0) + (s === undefined ? 1 : s) * normal2(f(), f()); },
      gamma: function (mean, sd) { return gammaMS(mean, sd, normal2(f(), f())); },
      poisson: function (lam) { return poissonU(lam, f()); },
      /** log-uniform between lo and hi */
      logu: function (lo, hi) { return Math.exp(Math.log(lo) + f() * (Math.log(hi) - Math.log(lo))); },
      fork: function (label) { return IX.rng(seedStr + '/' + label); }
    };
    return R;
  };

  // ------------------------------------------------------------- calendar (present day, autumn/winter start)
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  IX.WEEKDAYS = WDL;
  /** Calendar anchored on a UTC date (ms) for day 0. */
  IX.Calendar = function (baseMs) {
    function get(day) { var dt = new Date(baseMs + day * 86400000); return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate(), wd: dt.getUTCDay() }; }
    return {
      base: baseMs,
      get: get,
      weekday: function (day) { return get(day).wd; },
      nice: function (day) { var g = get(day); return WD[g.wd] + ' ' + g.d + ' ' + MON[g.m]; },
      short: function (day) { var g = get(day); return g.d + ' ' + MON[g.m]; },
      long: function (day) { var g = get(day); return WDL[g.wd] + ' ' + g.d + ' ' + MONL[g.m] + ' ' + g.y; },
      dayName: function (day) { return WDL[get(day).wd]; }
    };
  };

  // ------------------------------------------------------------- misc
  IX.clamp = function (x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; };
  IX.round = function (x, n) { var m = Math.pow(10, n || 0); return Math.round(x * m) / m; };
  IX.fmt = function (n) { var s = String(Math.round(n)), out = ''; var neg = s.charAt(0) === '-'; if (neg) s = s.slice(1); while (s.length > 3) { out = ',' + s.slice(-3) + out; s = s.slice(0, -3); } return (neg ? '-' : '') + s + out; };
  IX.pct = function (x, dp) { return (100 * x).toFixed(dp === undefined ? 0 : dp) + '%'; };
  IX.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  /** Wilson 95% interval for k successes of n */
  IX.wilson = function (k, n) {
    if (!n) return [0, 1];
    var z = 1.96, p = k / n, d = 1 + z * z / n;
    var c = (p + z * z / (2 * n)) / d, w = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
    return [Math.max(0, c - w), Math.min(1, c + w)];
  };
  IX.mean = function (a) { if (!a.length) return NaN; var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s / a.length; };
  IX.median = function (a) { if (!a.length) return NaN; var b = a.slice().sort(function (x, y) { return x - y; }); var m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  IX.sd = function (a) { var m = IX.mean(a), s = 0; for (var i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m); return Math.sqrt(s / Math.max(1, a.length - 1)); };
  // typed array <-> base64 (saves)
  IX.b64enc = function (ta) {
    var bytes = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength), s = '', CH = 8192;
    for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64');
  };
  IX.b64dec = function (str, Ctor) {
    var s = typeof atob === 'function' ? atob(str) : Buffer.from(str, 'base64').toString('binary');
    var bytes = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return new Ctor(bytes.buffer);
  };
})();
