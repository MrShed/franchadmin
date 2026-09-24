/* CUTOUT engine — 01-rng.js
 * Seeded RNG, date helpers and tiny utilities. Everything in the engine is
 * derived from CX.rng(seed) so a case can be replayed exactly.
 * Loads in node (vm) and in the browser: no DOM access at load time.
 */
var CX = (typeof CX !== 'undefined' && CX) ? CX : {};

(function () {
  'use strict';

  // FNV-1a string hash -> uint32
  function hashStr(s) {
    s = String(s);
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    // final avalanche
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  }
  CX.hash = hashStr;

  function mulberry32(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** CX.rng(seed) -> R. seed may be number or string. R.fork(label) gives an
   *  independent, reproducible sub-stream (used for lazily generated noise). */
  CX.rng = function (seed) {
    var seedStr = String(seed);
    var f = mulberry32(hashStr(seedStr));
    var R = {
      seed: seedStr,
      next: f,
      /** integer in [a, b] inclusive */
      int: function (a, b) { return a + Math.floor(f() * (b - a + 1)); },
      chance: function (p) { return f() < p; },
      pick: function (arr) { return arr[Math.floor(f() * arr.length)]; },
      /** shuffled copy */
      shuffle: function (arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
          var j = Math.floor(f() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
      },
      sample: function (arr, n) { return R.shuffle(arr).slice(0, Math.min(n, arr.length)); },
      /** weighted([[value, weight], ...]) or weighted(items, weightFn) */
      weighted: function (items, wf) {
        var tot = 0, i, ws = [];
        for (i = 0; i < items.length; i++) {
          var w = wf ? wf(items[i]) : items[i][1];
          ws.push(w); tot += w;
        }
        var x = f() * tot;
        for (i = 0; i < items.length; i++) {
          x -= ws[i];
          if (x < 0) return wf ? items[i] : items[i][0];
        }
        return wf ? items[items.length - 1] : items[items.length - 1][0];
      },
      digits: function (n) { var s = ''; for (var i = 0; i < n; i++) s += Math.floor(f() * 10); return s; },
      /** n digits, first non-zero */
      num: function (n) { return String(1 + Math.floor(f() * 9)) + R.digits(n - 1); },
      letter: function (set) { set = set || 'ABCDEFGHJKLMNPRSTUVWXYZ'; return set.charAt(Math.floor(f() * set.length)); },
      letters: function (n, set) { var s = ''; for (var i = 0; i < n; i++) s += R.letter(set); return s; },
      fork: function (label) { return CX.rng(seedStr + '/' + label); }
    };
    return R;
  };

  // ---------------------------------------------------------------- dates
  var WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }
  CX.pad = pad;

  /** Case calendar. startDom = day of October 1989 of day 0. */
  CX.Calendar = function (startDom) {
    var base = Date.UTC(1989, 9, startDom);
    function get(day) {
      var dt = new Date(base + day * 86400000);
      return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), wd: dt.getUTCDay() };
    }
    return {
      startDom: startDom,
      get: get,
      /** 13.10.1989 */
      dmy: function (day) { var g = get(day); return pad(g.d) + '.' + pad(g.m) + '.' + g.y; },
      /** 13.10.89 */
      dmyShort: function (day) { var g = get(day); return pad(g.d) + '.' + pad(g.m) + '.' + String(g.y).slice(2); },
      /** Fri 13 Oct */
      nice: function (day) { var g = get(day); return WD[g.wd] + ' ' + g.d + ' ' + MON[g.m - 1]; },
      /** Friday 13 October 1989 */
      long: function (day) { var g = get(day); return WD_LONG[g.wd] + ' ' + g.d + ' ' + MON_LONG[g.m - 1] + ' ' + g.y; },
      /** 13 OCT 89 (telex) */
      telex: function (day) { var g = get(day); return pad(g.d) + ' ' + MON[g.m - 1].toUpperCase() + ' ' + String(g.y).slice(2); },
      /** 13OCT (airline) */
      air: function (day) { var g = get(day); return pad(g.d) + MON[g.m - 1].toUpperCase(); },
      weekday: function (day) { return get(day).wd; },
      weekdayName: function (day) { return WD_LONG[get(day).wd]; }
    };
  };
  CX.WEEKDAYS = WD_LONG;
  CX.MONTHS = MON_LONG;

  /** minutes since midnight -> "14:05" */
  CX.hm = function (min) { min = ((min % 1440) + 1440) % 1440; return pad(Math.floor(min / 60)) + ':' + pad(min % 60); };

  /** format a number with thin separators: 45000 -> "45 000" (sep configurable) */
  CX.money = function (n, sep) {
    sep = sep === undefined ? ' ' : sep;
    var s = String(Math.round(n)), out = '';
    while (s.length > 3) { out = sep + s.slice(-3) + out; s = s.slice(0, -3); }
    return s + out;
  };

  CX.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  CX.uniq = function (arr) { var seen = {}, out = []; arr.forEach(function (x) { if (!seen[x]) { seen[x] = 1; out.push(x); } }); return out; };
})();
