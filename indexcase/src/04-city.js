/* INDEX CASE engine — 04-city.js
 * The city: ~12 districts (Voronoi cells on the unit square), households,
 * ~8,000 residents with jobs, schools and habits, places with size, crowding and
 * ventilation, and the weekly routine as group memberships. The disease spreads
 * through these contacts, so the clusters the player finds are real.
 *
 *   IX.makeCity(seed, {grade, agents}) -> C
 * Contact model: every setting is a GROUP (a class, a ward, a team, a pub's
 * regulars, a choir). Each group has: setting code, close contacts per day (k),
 * close-contact weight (dur), a shared-air dose factor (room), and members with
 * a weekday mask. Households are separate (everyone at home meets everyone).
 */
var IX = (typeof IX !== 'undefined' && IX) ? IX : {};

(function () {
  'use strict';
  var D = IX.DATA;

  // ---------------------------------------------------------------- settings
  var SET = IX.SET = {
    HOME: 0, CARE: 1, WORK: 2, SCHOOL: 3, NURSERY: 4, UNI: 5, HOSP: 6, PATIENT: 7, PUB: 8, RESTAURANT: 9, GYM: 10, FAITH: 11,
    CHOIR: 12, STADIUM: 13, MARKET: 14, TRANSPORT: 15, VISIT: 16, EVENT: 17, SHOP: 18, DOORSTEP: 19, GP: 20, ANIMAL: 21, FOOD: 22,
    EXTERNAL: 23, FUNERAL: 24, LAB: 25
  };
  IX.SET_NAMES = ['household', 'care home', 'workplace', 'school', 'nursery', 'university', 'hospital (staff)', 'hospital ward', 'pub', 'restaurant', 'gym',
    'place of worship', 'choir', 'football ground', 'market', 'bus/train', 'social visit', 'celebration', 'shop', 'doorstep delivery', 'GP waiting room',
    'animals', 'food', 'outside the city', 'funeral', 'laboratory'];
  // per setting: hours, air changes/h, m3 per person, activity (emission), close contacts/day, close weight
  var SP = IX.SET_PARAMS = {};
  function sp(code, hours, ach, m3, act, k, dur) { SP[code] = { hours: hours, ach: ach, m3: m3, act: act, k: k, dur: dur }; }
  sp(SET.HOME, 10, 1, 40, 1, 0, 1.0);
  sp(SET.CARE, 10, 2, 30, 1, 5, 0.5);
  sp(SET.WORK, 8, 3, 30, 1, 3, 0.22);
  sp(SET.SCHOOL, 6, 2, 7, 1, 5, 0.25);
  sp(SET.NURSERY, 8, 2.5, 8, 1.5, 6, 0.45);
  sp(SET.UNI, 3, 3, 6, 0.7, 2, 0.15);
  sp(SET.HOSP, 8, 6, 40, 1, 4, 0.3);
  sp(SET.PATIENT, 12, 6, 40, 1.5, 5, 0.4);
  sp(SET.PUB, 3, 2.5, 5, 2, 3, 0.35);
  sp(SET.RESTAURANT, 1.5, 3, 8, 1.2, 2, 0.4);
  sp(SET.GYM, 1, 4, 15, 3, 1, 0.1);
  sp(SET.FAITH, 1.5, 1.5, 12, 1.2, 3, 0.2);
  sp(SET.CHOIR, 2.5, 1, 10, 5, 4, 0.3);
  sp(SET.STADIUM, 2, 30, 5, 2, 3, 0.2);
  sp(SET.MARKET, 1, 10, 10, 1, 2, 0.12);
  sp(SET.TRANSPORT, 0.6, 5, 2, 0.5, 1, 0.1);
  sp(SET.VISIT, 3, 1.5, 20, 1, 0, 0.5);
  sp(SET.EVENT, 6, 2, 8, 2, 6, 0.4);
  sp(SET.SHOP, 0.5, 4, 20, 0.5, 1, 0.05);
  sp(SET.DOORSTEP, 0.05, 30, 50, 1, 0, 0.05);
  sp(SET.GP, 0.6, 3, 5, 1.5, 1, 0.1);
  sp(SET.ANIMAL, 4, 10, 30, 1, 2, 0.2);
  sp(SET.FUNERAL, 2, 1.5, 10, 1.2, 5, 0.35);
  sp(SET.LAB, 8, 10, 40, 0.8, 2, 0.15);
  IX.roomFactor = function (code, ach, m3) { var p = SP[code]; return p.act * p.hours / ((ach || p.ach) * (m3 || p.m3)); };

  var OCC = IX.OCC = { NONE: 0, OFFICE: 1, FACTORY: 2, HCW: 3, HOSP_SUPPORT: 4, CARE: 5, TEACHER: 6, NURSERY_WORKER: 7, RETAIL: 8, HOSPITALITY: 9, TRANSPORT: 10,
      DELIVERY: 11, TRADES: 12, LAB: 13, MARKET: 14, FARM: 15, MEAT: 16, STUDENT: 17, PUPIL: 18, NURSERY_CHILD: 19, CARE_RES: 20, HOME: 21, RETIRED: 22, GP_STAFF: 23, UNEMPLOYED: 24, OUT: 25, UNI_STAFF: 26, HOTEL: 27, CHILD_HOME: 28 };

  // ---------------------------------------------------------------- district types
  var DT = {
    centre: { pop: 0.07, dep: [0.35, 0.55], hh: { single: 0.33, sharers: 0.25, couple: 0.2, oldsingle: 0.1, family: 0.1, students: 0.02 }, her: { british: 0.55, polish: 0.08, chinese: 0.06, southern: 0.08, african: 0.08, indian: 0.05, pakistani: 0.05, irish: 0.05 } },
    student: { pop: 0.07, dep: [0.35, 0.5], hh: { students: 0.42, sharers: 0.2, single: 0.1, family: 0.12, couple: 0.1, oldsingle: 0.06 }, her: { british: 0.6, chinese: 0.1, indian: 0.08, african: 0.07, southern: 0.05, pakistani: 0.05, polish: 0.05 } },
    inner: { pop: 0.1, dep: [0.6, 0.8], hh: { family: 0.3, multigen: 0.15, couple: 0.1, single: 0.12, lone: 0.1, oldsingle: 0.08, oldcouple: 0.06, sharers: 0.09 }, her: { pakistani: 0.24, bangladeshi: 0.08, british: 0.3, indian: 0.1, sikh: 0.05, caribbean: 0.06, african: 0.06, somali: 0.04, polish: 0.06 } },
    estate: { pop: 0.09, dep: [0.75, 0.95], hh: { lone: 0.18, family: 0.25, single: 0.18, oldsingle: 0.14, oldcouple: 0.08, couple: 0.1, multigen: 0.04, sharers: 0.03 }, her: { british: 0.64, caribbean: 0.08, african: 0.07, polish: 0.07, romanian: 0.05, somali: 0.04, irish: 0.05 } },
    suburb: { pop: 0.09, dep: [0.25, 0.45], hh: { family: 0.38, couple: 0.2, oldcouple: 0.15, oldsingle: 0.1, single: 0.1, lone: 0.05, multigen: 0.02 }, her: { british: 0.72, indian: 0.08, irish: 0.05, polish: 0.04, pakistani: 0.04, caribbean: 0.03, chinese: 0.02, sikh: 0.02 } },
    affluent: { pop: 0.07, dep: [0.05, 0.2], hh: { family: 0.35, couple: 0.25, oldcouple: 0.2, oldsingle: 0.1, single: 0.1 }, her: { british: 0.78, indian: 0.07, chinese: 0.04, irish: 0.05, southern: 0.03, african: 0.03 } },
    older: { pop: 0.07, dep: [0.3, 0.5], hh: { oldcouple: 0.3, oldsingle: 0.3, couple: 0.15, family: 0.12, single: 0.1, lone: 0.03 }, her: { british: 0.85, irish: 0.06, caribbean: 0.04, polish: 0.03, indian: 0.02 } },
    rural: { pop: 0.05, dep: [0.2, 0.4], hh: { family: 0.3, couple: 0.2, oldcouple: 0.2, oldsingle: 0.12, single: 0.1, multigen: 0.05, lone: 0.03 }, her: { british: 0.9, polish: 0.06, irish: 0.04 } }
  };
  var DT_BLURB = {
    centre: 'Shops, offices, the market hall and flats above them; busy by day, busier on a Saturday night.',
    student: 'Terraces turned into student houses, takeaways and the university campus.',
    inner: 'Victorian terraces, big families, corner shops and places of worship on every other street.',
    estate: 'Post-war council estate: tower blocks, a parade of shops and a lot of people on zero-hours contracts.',
    suburb: 'Semis with drives, primary schools and a retail park.',
    affluent: 'Detached houses, a golf club and people who work from home when it suits them.',
    older: 'Bungalows, bowls club, care homes and a doctor\'s surgery with a long waiting list.',
    rural: 'The edge of town where it becomes fields: farms, a livestock market and commuter villages.'
  };

  // ---------------------------------------------------------------- geometry
  function clipHalf(poly, a, b, c) { // keep points with a*x+b*y <= c
    var out = [];
    for (var i = 0; i < poly.length; i++) {
      var P = poly[i], Q = poly[(i + 1) % poly.length];
      var fp = a * P[0] + b * P[1] - c, fq = a * Q[0] + b * Q[1] - c;
      if (fp <= 0) out.push(P);
      if ((fp <= 0) !== (fq <= 0)) { var t = fp / (fp - fq); out.push([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]); }
    }
    return out;
  }
  function inPoly(pt, poly) {
    var x = pt[0], y = pt[1], ins = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) ins = !ins;
    }
    return ins;
  }
  IX.inPoly = inPoly;
  function centroid(poly) {
    var a = 0, cx = 0, cy = 0;
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i], q = poly[(i + 1) % poly.length], cr = p[0] * q[1] - q[0] * p[1];
      a += cr; cx += (p[0] + q[0]) * cr; cy += (p[1] + q[1]) * cr;
    }
    a /= 2; return [cx / (6 * a), cy / (6 * a)];
  }
  function r3(p) { return [IX.round(p[0], 3), IX.round(p[1], 3)]; }

  // ---------------------------------------------------------------- builder
  IX.makeCity = function (seed, opts) {
    opts = opts || {};
    var R = IX.rng(String(seed) + '/city');
    var NT = opts.agents || 8000;
    var C = { seed: String(seed), N: 0 };
    C.name = R.pick(D.CITY_A) + R.pick(D.CITY_B);
    C.population = Math.round(R.range(235, 265)) * 1000;
    C.wd0 = R.int(0, 6);   // weekday (0 = Sunday) of sim day 0

    // --- boundary and districts
    var bound = [];
    for (var i = 0; i < 20; i++) { var an = i / 20 * Math.PI * 2, rr = 0.44 + R.range(-0.035, 0.035); bound.push([0.5 + rr * Math.cos(an), 0.5 + rr * Math.sin(an) * 0.92]); }
    var cents = [[0.5 + R.range(-0.02, 0.02), 0.5 + R.range(-0.02, 0.02)]];
    var a0 = R.range(0, Math.PI * 2);
    for (i = 0; i < 5; i++) { var an1 = a0 + i / 5 * Math.PI * 2 + R.range(-0.2, 0.2), r1 = R.range(0.17, 0.22); cents.push([0.5 + r1 * Math.cos(an1), 0.5 + r1 * Math.sin(an1)]); }
    var a1 = a0 + Math.PI / 6;
    for (i = 0; i < 6; i++) { var an2 = a1 + i / 6 * Math.PI * 2 + R.range(-0.15, 0.15), r2 = R.range(0.33, 0.37); cents.push([0.5 + r2 * Math.cos(an2), 0.5 + r2 * Math.sin(an2)]); }
    var innerTypes = R.shuffle(['student', 'inner', 'inner', 'inner', 'estate']);
    var outerTypes = R.shuffle(['estate', 'suburb', 'suburb', 'affluent', 'older', 'rural']);
    var types = ['centre'].concat(innerTypes, outerTypes);
    var usedNames = {};
    function distName(type) {
      var nm;
      for (var tries = 0; tries < 50; tries++) {
        if (type === 'centre') nm = R.pick(D.DIST_FIXED.centre);
        else if (type === 'student' && R.chance(0.6)) nm = R.pick(D.DIST_FIXED.student);
        else {
          var base = R.pick(D.DIST_A) + R.pick(D.DIST_B);
          var form = R.next();
          nm = form < 0.55 ? base : form < 0.7 ? base + (type === 'estate' ? ' Estate' : ' Park') : form < 0.8 ? 'Upper ' + base : form < 0.88 ? base + ' Vale' : form < 0.94 ? base + ' Heath' : 'Lower ' + base;
          if (type === 'rural' && R.chance(0.5)) nm = base + ' Moor';
        }
        if (!usedNames[nm] && nm.indexOf(C.name) < 0) break;
      }
      usedNames[nm] = 1; return nm;
    }
    C.districts = cents.map(function (c, di) {
      var poly = bound.slice();
      cents.forEach(function (o, oj) {
        if (oj === di) return;
        var a = o[0] - c[0], b = o[1] - c[1], cc = (o[0] * o[0] - c[0] * c[0] + o[1] * o[1] - c[1] * c[1]) / 2;
        poly = clipHalf(poly, a, b, cc);
      });
      var t = types[di], T = DT[t];
      return {
        id: 'd' + di, i: di, name: distName(t), type: t, poly: poly.map(r3), centre: r3(centroid(poly)),
        deprivation: IX.round(R.range(T.dep[0], T.dep[1]), 2), pop: 0, blurb: DT_BLURB[t]
      };
    });
    // river: a gentle curve west->east through the centre
    var ry = 0.5 + R.range(-0.08, 0.08), rp = [];
    for (i = 0; i <= 12; i++) { var x = 0.02 + i / 12 * 0.96; rp.push(r3([x, ry + 0.06 * Math.sin(i / 12 * Math.PI * 2 + a0) + R.range(-0.012, 0.012)])); }
    C.river = rp; C.boundary = bound.map(r3);

    function randIn(dist, near) {
      var poly = dist.poly, minx = 1, miny = 1, maxx = 0, maxy = 0;
      poly.forEach(function (p) { minx = Math.min(minx, p[0]); miny = Math.min(miny, p[1]); maxx = Math.max(maxx, p[0]); maxy = Math.max(maxy, p[1]); });
      for (var t = 0; t < 60; t++) {
        var p = near ? [dist.centre[0] + R.normal(0, 0.03), dist.centre[1] + R.normal(0, 0.03)] : [R.range(minx, maxx), R.range(miny, maxy)];
        if (inPoly(p, poly)) return r3(p);
      }
      return dist.centre.slice();
    }

    // --- households and people
    var totW = 0; C.districts.forEach(function (d) { totW += DT[d.type].pop; });
    var A = { age: [], sex: [], hh: [], dist: [], her: [], first: [], last: [], occ: [], work: [], flags: [] };
    var H = { mem: [], dist: [], addr: [], kind: [], pos: [], her: [] };
    var streetsByDist = C.districts.map(function (d) {
      var s = []; for (var k = 0; k < 6; k++) s.push(R.pick(D.STREET_A) + ' ' + R.pick(D.STREETS));
      return s;
    });
    var BIRTH_YEAR_NOW = 2026;
    function firstName(her, sex, age) {
      var yr = BIRTH_YEAR_NOW - age;
      if (her === 'british' || (her !== 'polish' && her !== 'romanian' && age < 30 && R.chance(her === 'irish' ? 0.5 : 0.18))) {
        var tab = sex ? D.BRIT_M : D.BRIT_F, key = yr < 1947 ? 1935 : yr < 1967 ? 1955 : yr < 1987 ? 1975 : yr < 2007 ? 1995 : 2013;
        if (R.chance(0.2)) { var keys = [1935, 1955, 1975, 1995, 2013], ix = keys.indexOf(key); key = keys[Math.max(0, Math.min(4, ix + (R.chance(0.5) ? 1 : -1)))]; }
        return R.pick(tab[key]);
      }
      var h = D.HER[her]; return R.pick(sex ? h.m : h.f);
    }
    function surname(her) {
      if (her === 'british') return R.pick(D.BRIT_S);
      var s = R.pick(D.HER[her].s); return s;
    }
    function gendered(s, sex, her) {
      if (her === 'sikh') return (sex ? 'Singh ' : 'Kaur ') + s;
      if (her === 'bangladeshi' && s === 'Begum' && sex) return 'Miah';
      if (Array.isArray(s)) return sex ? s[0] : s[1];
      return s;
    }
    var FLAG = IX.FLAG = { CARE_RES: 1, HCW: 2, CARE_WORKER: 4, FOOD: 8, DELIVERY: 16, COMMUTER: 32, VULNERABLE: 64, TRAVELLER: 128, STUDENT: 256, TEACHER: 512, SHIELD: 1024, ANIMAL: 2048, LAB: 4096, WFH: 8192 };

    function addPerson(hid, di, her, sex, age, last) {
      var i = A.age.length;
      A.age.push(Math.max(0, Math.min(104, Math.round(age)))); A.sex.push(sex); A.hh.push(hid); A.dist.push(di); A.her.push(D.HERITAGES.indexOf(her));
      A.first.push(firstName(her, sex, age)); A.last.push(gendered(last, sex, her)); A.occ.push(0); A.work.push(-1);
      var f = 0;
      var vulnP = age < 18 ? 0.01 : age < 50 ? 0.04 : age < 65 ? 0.1 : age < 80 ? 0.2 : 0.3;
      if (R.chance(vulnP)) f |= FLAG.VULNERABLE;
      A.flags.push(f);
      H.mem[hid].push(i);
      return i;
    }
    function newHH(di, kind, her) {
      var hid = H.mem.length; H.mem.push([]); H.dist.push(di); H.kind.push(kind); H.her.push(her);
      H.addr.push((1 + R.int(0, 140)) + ' ' + R.pick(streetsByDist[di]));
      H.pos.push(randIn(C.districts[di]));
      return hid;
    }
    function kids(hid, di, her, last, n, parentAge) {
      var maxA = Math.min(17, parentAge - 19), a = R.int(0, Math.max(0, maxA));
      for (var k = 0; k < n; k++) { addPerson(hid, di, her, R.int(0, 1), Math.max(0, a), last); a -= R.int(1, 4); if (a < 0) break; }
    }
    var quota = C.districts.map(function (d) { return Math.round(NT * 0.985 * DT[d.type].pop / totW); });
    C.districts.forEach(function (d, di) {
      var T = DT[d.type], hhw = Object.keys(T.hh).map(function (k) { return [k, T.hh[k]]; }), herw = Object.keys(T.her).map(function (k) { return [k, T.her[k]]; });
      var start = A.age.length;
      while (A.age.length - start < quota[di]) {
        var kind = R.weighted(hhw), her = R.weighted(herw), last = surname(her), hid = newHH(di, kind, her), a;
        if ((her === 'pakistani' || her === 'bangladeshi' || her === 'sikh' || her === 'indian' || her === 'somali') && kind === 'family' && R.chance(0.35)) kind = H.kind[hid] = 'multigen';
        switch (kind) {
          case 'single': addPerson(hid, di, her, R.int(0, 1), R.int(22, 64), last); break;
          case 'oldsingle': addPerson(hid, di, her, R.chance(0.65) ? 0 : 1, R.int(68, 96), last); break;
          case 'oldcouple': a = R.int(65, 90); addPerson(hid, di, her, 1, a + R.int(0, 4), last); addPerson(hid, di, her, 0, a - R.int(0, 3), last); break;
          case 'couple': a = R.int(24, 64); addPerson(hid, di, her, 1, a + R.int(-2, 4), last); addPerson(hid, di, her, 0, a, R.chance(0.2) ? surname(her) : last); break;
          case 'family': a = R.int(27, 50); addPerson(hid, di, her, 1, a + R.int(0, 4), last); addPerson(hid, di, her, 0, a, last); kids(hid, di, her, last, R.weighted([[1, 0.35], [2, 0.42], [3, 0.18], [4, 0.05]]), a); break;
          case 'lone': a = R.int(21, 48); addPerson(hid, di, her, R.chance(0.88) ? 0 : 1, a, last); kids(hid, di, her, last, R.weighted([[1, 0.45], [2, 0.38], [3, 0.17]]), a); break;
          case 'multigen':
            a = R.int(30, 46);
            var gp = R.int(60, 84); addPerson(hid, di, her, R.chance(0.6) ? 0 : 1, gp, last); if (R.chance(0.55)) addPerson(hid, di, her, 1, gp + R.int(0, 4), last);
            addPerson(hid, di, her, 1, a + R.int(0, 4), last); addPerson(hid, di, her, 0, a, last); kids(hid, di, her, last, R.int(2, 4), a);
            if (R.chance(0.3)) addPerson(hid, di, her, R.int(0, 1), R.int(18, 26), last); break;
          case 'sharers': var n = R.int(2, 4); for (var k = 0; k < n; k++) addPerson(hid, di, her = R.weighted(herw), R.int(0, 1), R.int(21, 36), surname(her)); break;
          case 'students': var ns = R.int(3, 6); for (k = 0; k < ns; k++) { var hs = R.chance(0.7) ? 'british' : R.weighted(herw); addPerson(hid, di, hs, R.int(0, 1), R.int(18, 23), surname(hs)); A.flags[A.age.length - 1] |= FLAG.STUDENT; } break;
        }
      }
    });
    // care home residents (live in the home; household = themselves)
    var careDists = C.districts.filter(function (d) { return d.type === 'older' || d.type === 'suburb' || d.type === 'inner' || d.type === 'estate' || d.type === 'affluent'; });
    var nCare = 4, careHomes = [];
    var careNames = R.sample(D.VENUES.care_home, nCare);
    for (i = 0; i < nCare; i++) {
      var cd = careDists[i % careDists.length];
      careHomes.push({ name: careNames[i], dist: cd.i, residents: [], size: R.int(16, 24) });
    }
    careHomes.forEach(function (ch) {
      var addr = ch.name + ', ' + C.districts[ch.dist].name;
      for (var k = 0; k < ch.size; k++) {
        var her = R.chance(0.92) ? 'british' : R.pick(['irish', 'caribbean', 'polish', 'indian']);
        var hid = newHH(ch.dist, 'carehome', her); H.addr[hid] = addr;
        var pi = addPerson(hid, ch.dist, her, R.chance(0.7) ? 0 : 1, R.int(76, 101), surname(her));
        A.flags[pi] |= FLAG.CARE_RES | FLAG.VULNERABLE; ch.residents.push(pi);
      }
    });
    var N = C.N = A.age.length;
    C.districts.forEach(function (d) { d.pop = 0; });
    for (i = 0; i < N; i++) C.districts[A.dist[i]].pop++;

    // --- places and groups
    var places = C.places = [];
    var G = { place: [], set: [], k: [], dur: [], room: [], day: [], mem: [], label: [], alt: [] };
    function addPlace(kind, name, di, o) {
      o = o || {};
      var p = { id: 'p' + places.length, i: places.length, kind: kind, name: name.replace('{city}', C.name).replace('{dist}', C.districts[di].name), district: 'd' + di, di: di,
        pos: o.pos || randIn(C.districts[di], o.central), size: 0, indoor: o.indoor !== false, ach: o.ach || 3, m3: o.m3 || 20, groups: [], food: !!o.food, animal: !!o.animal, sub: o.sub || null };
      places.push(p); return p;
    }
    function addGroup(p, set, o) {
      o = o || {};
      var gi = G.place.length, par = SP[set];
      G.place.push(p ? p.i : -1); G.set.push(set); G.k.push(o.k !== undefined ? o.k : par.k); G.dur.push(o.dur || par.dur);
      G.room.push(IX.roomFactor(set, o.ach || (p && p.ach), o.m3 || (p && p.m3)) * (o.roomMul || 1));
      G.day.push(o.day === undefined ? -9999 : o.day); G.mem.push([]); G.label.push(o.label || ''); G.alt.push(o.alt ? 1 : 0);
      if (p) p.groups.push(gi);
      return gi;
    }
    var MS = [];   // memberships: [agent, group, mask]
    var ALL = 127, WEEKDAYS = 62, SAT = 64, SUN = 1;
    function join(a, gi, mask) { G.mem[gi].push(a); MS.push([a, gi, mask === undefined ? ALL : mask]); }
    function dayMask(days) { var m = 0; days.forEach(function (d) { m |= 1 << d; }); return m; }
    function pickDists(pred) { return C.districts.filter(function (d) { return pred(d.type); }); }
    function distPick(pred) { var L = pickDists(pred); return L.length ? R.pick(L) : R.pick(C.districts); }

    // hospital (St Anne's) — wards
    var hosp = addPlace('hospital', "St Anne's Hospital", distPick(function (t) { return t === 'inner' || t === 'centre' || t === 'suburb'; }).i, { ach: 6, m3: 40 });
    C.hospitalId = hosp.id; C.hospital = hosp.i;
    var WARDS = ['Ward 4 (acute medicine)', 'Ward 7 (elderly care)', 'Ward 2 (surgery)', 'Intensive care unit', 'Emergency department'];
    C.wards = WARDS.map(function (w) { return addGroup(hosp, SET.HOSP, { label: w }); });
    C.wardNames = WARDS;
    var hospSupport = addGroup(hosp, SET.WORK, { label: 'porters, cleaners and kitchen', k: 3 });
    // GP practices (2 per 3 districts)
    var gps = [];
    C.districts.forEach(function (d, di) { if (di % 3 !== 2 || d.type === 'centre') gps.push(addPlace('gp', R.pick(D.VENUES.gp), di, { central: true, ach: 3, m3: 12 })); });
    gps.forEach(function (p) { p.waitGroup = addGroup(p, SET.GP, { label: 'waiting room' }); p.staffGroup = addGroup(p, SET.WORK, { label: 'practice staff', k: 3 }); });
    C.gpOfDist = C.districts.map(function (d) { var best = null, bd = 9; gps.forEach(function (p) { var dd = Math.hypot(p.pos[0] - d.centre[0], p.pos[1] - d.centre[1]); if (dd < bd) { bd = dd; best = p.i; } }); return best; });
    // care homes
    careHomes.forEach(function (ch) {
      var p = addPlace('care_home', ch.name, ch.dist, { ach: 2, m3: 30, food: true });
      ch.place = p.i; ch.group = addGroup(p, SET.CARE, { label: 'residents and staff' });
      ch.residents.forEach(function (a) { join(a, ch.group, ALL); A.work[a] = p.i; A.occ[a] = OCC.CARE_RES; });
    });
    // schools, nurseries, university
    careHomes.forEach(function (ch) { ch.residents.forEach(function (a) { A.occ[a] = OCC.CARE_RES; }); });
    var prim = [], sec = [];
    var nPrim = 5, nSec = 2;
    var primNames = R.sample(D.VENUES.school_p, nPrim), secNames = R.sample(D.VENUES.school_s, nSec);
    var famDists = pickDists(function (t) { return t !== 'centre' && t !== 'student'; });
    for (i = 0; i < nPrim; i++) prim.push(addPlace('school', primNames[i], famDists[i % famDists.length].i, { ach: 2, m3: 7, food: true, sub: 'primary' }));
    for (i = 0; i < nSec; i++) sec.push(addPlace('school', secNames[i], famDists[(i * 3 + 1) % famDists.length].i, { ach: 2, m3: 7, food: true, sub: 'secondary' }));
    var nurseries = [], nursNames = R.sample(D.VENUES.nursery, 6);
    for (i = 0; i < 6; i++) nurseries.push(addPlace('nursery', nursNames[i], famDists[(i * 2 + 1) % famDists.length].i, { ach: 2.5, m3: 8 }));
    var studDist = pickDists(function (t) { return t === 'student'; })[0] || C.districts[1];
    var uni = addPlace('university', R.pick(D.VENUES.university), studDist.i, { ach: 3, m3: 6 });
    function nearest(list, di) { var d = C.districts[di], best = list[0], bd = 9; list.forEach(function (p) { var dd = Math.hypot(p.pos[0] - d.centre[0], p.pos[1] - d.centre[1]) + R.range(0, 0.08); if (dd < bd) { bd = dd; best = p; } }); return best; }
    // classes by school & year
    var classOf = {};
    function classGroup(school, yr) {
      var key = school.i + ':' + yr;
      if (!classOf[key]) classOf[key] = [];
      var L = classOf[key];
      var cur = L[L.length - 1];
      if (!cur || G.mem[cur].length >= 26) { cur = addGroup(school, SET.SCHOOL, { label: (school.sub === 'primary' ? (yr === 0 ? 'Reception' : 'Year ' + yr) : 'Year ' + yr) + ' ' + 'ABCDEFG'.charAt(L.length) }); L.push(cur); }
      return cur;
    }
    var nurseryRooms = {};
    function nurseryGroup(n) { var L = nurseryRooms[n.i] = nurseryRooms[n.i] || []; var cur = L[L.length - 1]; if (!cur || G.mem[cur].length >= 12) { cur = addGroup(n, SET.NURSERY, { label: ['Tadpoles room', 'Caterpillars room', 'Butterflies room', 'Owls room'][L.length % 4] }); L.push(cur); } return cur; }
    var uniGroups = [];
    for (i = 0; i < 10; i++) uniGroups.push(addGroup(uni, SET.UNI, { label: ['Nursing', 'Law', 'Computing', 'Business', 'Engineering', 'History', 'Biomedical science', 'Psychology', 'Sport science', 'Fine art'][i] + ' students' }));
    for (var a = 0; a < N; a++) {
      var age = A.age[a], di = A.dist[a];
      if (A.flags[a] & FLAG.CARE_RES) continue;
      if (age >= 5 && age <= 17) {
        var sch = age <= 11 ? nearest(prim, di) : nearest(sec, di);
        var yr = age <= 11 ? age - 4 : age - 4;
        join(a, classGroup(sch, Math.max(0, Math.min(13, yr))), WEEKDAYS); A.occ[a] = OCC.PUPIL; A.work[a] = sch.i;
      } else if (age >= 1 && age <= 4 && R.chance(age <= 2 ? 0.35 : 0.6)) {
        var nu = nearest(nurseries, di); join(a, nurseryGroup(nu), R.chance(0.5) ? WEEKDAYS : dayMask(R.sample([1, 2, 3, 4, 5], 3))); A.occ[a] = OCC.NURSERY_CHILD; A.work[a] = nu.i;
      } else if (age <= 4) A.occ[a] = OCC.CHILD_HOME;
      else if (age >= 18 && age <= 23 && (A.flags[a] & FLAG.STUDENT || (R.chance(0.12) && H.kind[A.hh[a]] !== 'oldcouple'))) {
        A.flags[a] |= FLAG.STUDENT; join(a, R.pick(uniGroups), dayMask(R.sample([1, 2, 3, 4, 5], R.int(3, 5)))); A.occ[a] = OCC.STUDENT; A.work[a] = uni.i;
      }
    }

    // workplaces
    var officeNames = R.sample(D.VENUES.office, 10), factNames = R.sample(D.VENUES.factory, 5);
    var workDists = pickDists(function (t) { return t === 'centre' || t === 'inner' || t === 'estate' || t === 'suburb' || t === 'student'; });
    var offices = officeNames.map(function (n, k) { return addPlace('office', n, (k < 4 ? C.districts[0] : R.pick(workDists)).i, { ach: R.pick([1.5, 2, 3, 4, 6]), m3: 25, central: k < 4 }); });
    var factories = factNames.map(function (n) { return addPlace('factory', n, R.pick(workDists).i, { ach: R.pick([2, 3, 4, 6]), m3: 70 }); });
    var ruralD = pickDists(function (t) { return t === 'rural'; })[0] || C.districts[C.districts.length - 1];
    var meat = addPlace('meat_plant', D.VENUES.meat_plant[0], (R.chance(0.6) ? ruralD : R.pick(workDists)).i, { ach: 1.5, m3: 25, animal: true });
    var farmNames = R.sample(D.VENUES.farm, 2);
    var farms = farmNames.map(function (n) { return addPlace('farm', n, ruralD.i, { ach: 10, m3: 60, animal: true, indoor: false }); });
    var livestock = addPlace('market', D.VENUES.livestock[0], ruralD.i, { ach: 8, m3: 30, animal: true, sub: 'livestock' });
    var labs = D.VENUES.lab.map(function (n, k) { return addPlace('lab', n, k === 0 ? uni.di : R.pick(workDists).i, { ach: 10, m3: 40 }); });
    var marketHall = addPlace('market', D.VENUES.market[0], 0, { ach: 6, m3: 12, food: true, central: true, sub: 'hall' });
    var supers = C.districts.map(function (d, di) { return addPlace('supermarket', di === 0 ? 'Market Street shops' : D.VENUES.supermarket[di % D.VENUES.supermarket.length] + ', ' + d.name, di, { ach: 4, m3: 20, central: true }); });
    var hotelNames = D.VENUES.hotel;
    var hotels = hotelNames.map(function (n, k) { return addPlace('hotel', n, k === 0 ? 0 : R.pick(C.districts).i, { ach: 2, m3: 10, food: true, central: k === 0 }); });
    var station = addPlace('station', D.VENUES.station[0], 0, { ach: 5, m3: 4 });
    var busDepot = addPlace('office', C.name + ' Bus Depot', R.pick(workDists).i, { ach: 4, m3: 40 });
    // hospitality venues
    var pubs = [], rests = [], pubNames = R.shuffle(D.VENUES.pub), restNames = R.shuffle(D.VENUES.restaurant);
    C.districts.forEach(function (d, di) {
      var np = d.type === 'centre' ? 4 : d.type === 'student' ? 2 : (d.type === 'inner' && R.chance(0.5)) ? 0 : 1;
      for (var k = 0; k < np && pubNames.length; k++) pubs.push(addPlace('pub', pubNames.pop(), di, { ach: R.pick([1.5, 2, 2.5, 3, 4]), m3: 5, food: true }));
      var nr = d.type === 'centre' ? 4 : (d.type === 'inner' || d.type === 'student') ? 2 : d.type === 'rural' ? 0 : 1;
      for (k = 0; k < nr && restNames.length; k++) rests.push(addPlace('restaurant', restNames.pop(), di, { ach: R.pick([2, 3, 4]), m3: 8, food: true }));
    });
    var gyms = R.sample(D.VENUES.gym, 4).map(function (n) { return addPlace('gym', n, R.pick(workDists).i, { ach: R.pick([2, 3, 5]), m3: 15 }); });
    var stadium = addPlace('stadium', D.VENUES.stadium[0], R.pick(workDists).i, { indoor: false, ach: 30, m3: 5 });
    var halls = D.VENUES.community_hall.map(function (n) { return addPlace('community_hall', n, R.pick(C.districts).i, { ach: 2, m3: 10, food: true }); });

    // workforce allocation
    var workers = [];
    for (a = 0; a < N; a++) {
      if (A.occ[a] !== 0) continue;
      var ag = A.age[a];
      if (ag >= 18 && ag <= 66) {
        var dep = C.districts[A.dist[a]].deprivation;
        var er = (ag >= 60 ? 0.55 : 0.8) - 0.2 * dep;
        if (R.chance(er)) workers.push(a); else A.occ[a] = ag >= 60 ? OCC.RETIRED : (R.chance(0.5) ? OCC.HOME : OCC.UNEMPLOYED);
      } else if (ag > 66) A.occ[a] = OCC.RETIRED;
    }
    workers = R.shuffle(workers);
    var wi = 0;
    function take(n, pred) {
      var out = [];
      for (var t = wi; t < workers.length && out.length < n; t++) {
        var w = workers[t];
        if (w < 0) continue;
        if (pred && !pred(w)) continue;
        out.push(w); workers[t] = -1;
      }
      while (wi < workers.length && workers[wi] < 0) wi++;
      return out;
    }
    function teams(p, set, members, size, occ, mask, label) {
      var gs = [], nT = Math.max(1, Math.round(members.length / size));
      for (var t = 0; t < nT; t++) gs.push(addGroup(p, set, { label: (label || 'team') + (nT > 1 ? ' ' + (t + 1) : '') }));
      members.forEach(function (m, j) {
        var g = gs[j % nT];
        join(m, g, typeof mask === 'function' ? mask(m) : mask); A.occ[m] = occ; A.work[m] = p.i;
      });
      p.size += members.length;
      return gs;
    }
    function shifts() { var d = R.shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, R.int(4, 5)); return dayMask(d); }
    function adult(minA, maxA) { return function (w) { return A.age[w] >= (minA || 18) && A.age[w] <= (maxA || 66); }; }
    var scaleW = N / 8000;
    function nW(x) { return Math.max(1, Math.round(x * scaleW)); }
    // healthcare
    var hcw = take(nW(170), adult(21, 66));
    hcw.forEach(function (m, j) { var g = C.wards[j % C.wards.length]; join(m, g, shifts()); A.occ[m] = OCC.HCW; A.work[m] = hosp.i; A.flags[m] |= FLAG.HCW; });
    var sup = take(nW(60)); sup.forEach(function (m, j) { join(m, hospSupport, shifts()); A.occ[m] = OCC.HOSP_SUPPORT; A.work[m] = hosp.i; if (j % 4 === 0) A.flags[m] |= FLAG.FOOD; });
    hosp.size = hcw.length + sup.length;
    // porters link wards: a few support staff also visit wards
    sup.slice(0, Math.round(sup.length / 3)).forEach(function (m) { MS.push([m, R.pick(C.wards), dayMask([R.int(1, 5)])]); G.mem[MS[MS.length - 1][1]].push(m); });
    gps.forEach(function (p) { var st = take(nW(8), adult(22, 66)); st.forEach(function (m) { join(m, p.staffGroup, WEEKDAYS); join(m, p.waitGroup, WEEKDAYS); A.occ[m] = OCC.GP_STAFF; A.work[m] = p.i; A.flags[m] |= FLAG.HCW; }); p.size = st.length; });
    careHomes.forEach(function (ch) {
      var st = take(nW(Math.round(ch.size * 0.9)), adult(18, 66));
      st.forEach(function (m, j) { join(m, ch.group, shifts()); A.occ[m] = OCC.CARE; A.work[m] = ch.place; A.flags[m] |= FLAG.CARE_WORKER; if (j === 0) A.flags[m] |= FLAG.FOOD; });
      places[ch.place].size = ch.size + st.length;
    });
    // teachers & school kitchens
    prim.concat(sec).forEach(function (sch) {
      var cls = sch.groups.slice();
      var t = take(cls.length + 2, adult(23, 66));
      var staffRoom = addGroup(sch, SET.WORK, { label: 'staff room', k: 3 });
      t.forEach(function (m, j) { if (j < cls.length) join(m, cls[j], WEEKDAYS); join(m, staffRoom, WEEKDAYS); A.occ[m] = OCC.TEACHER; A.work[m] = sch.i; A.flags[m] |= FLAG.TEACHER; });
      var k2 = take(2, adult(18, 66)); k2.forEach(function (m) { join(m, staffRoom, WEEKDAYS); A.occ[m] = OCC.HOSPITALITY; A.work[m] = sch.i; A.flags[m] |= FLAG.FOOD; });
      sch.size = cls.reduce(function (s, g) { return s + G.mem[g].length; }, 0) + t.length + 2;
    });
    nurseries.forEach(function (n) {
      var rooms = n.groups.slice(); if (!rooms.length) return;
      var st = take(rooms.length * 2 + 1, adult(18, 64));
      st.forEach(function (m, j) { join(m, rooms[j % rooms.length], WEEKDAYS); A.occ[m] = OCC.NURSERY_WORKER; A.work[m] = n.i; if (j === st.length - 1) A.flags[m] |= FLAG.FOOD; });
      n.size = rooms.reduce(function (s, g) { return s + G.mem[g].length; }, 0);
    });
    var ust = take(nW(40), adult(23, 66)); ust.forEach(function (m, j) { join(m, uniGroups[j % uniGroups.length], WEEKDAYS); A.occ[m] = OCC.UNI_STAFF; A.work[m] = uni.i; });
    uni.size = uniGroups.reduce(function (s, g) { return s + G.mem[g].length; }, 0);
    // labs, farms, meat, markets
    labs.forEach(function (p) { teams(p, SET.LAB, take(nW(10), adult(22, 64)), 10, OCC.LAB, WEEKDAYS, 'lab staff').forEach(function () { }); });
    labs.forEach(function (p) { p.groups.forEach(function (g) { G.mem[g].forEach(function (m) { A.flags[m] |= FLAG.LAB; }); }); });
    farms.forEach(function (p) { teams(p, SET.ANIMAL, take(nW(7), adult(16, 70)), 8, OCC.FARM, shifts, 'farm hands'); });
    teams(meat, SET.WORK, take(nW(110), adult(18, 64)), 14, OCC.MEAT, WEEKDAYS | SAT, 'line');
    [meat].concat(farms).forEach(function (p) { p.groups.forEach(function (g) { G.mem[g].forEach(function (m) { A.flags[m] |= FLAG.ANIMAL; }); }); });
    var lsTraders = take(nW(14), adult(20, 70));
    var lsGroup = addGroup(livestock, SET.ANIMAL, { label: 'Monday sale: traders, farmers and visitors' });
    lsTraders.forEach(function (m) { join(m, lsGroup, dayMask([1, 3])); A.occ[m] = OCC.MARKET; A.work[m] = livestock.i; A.flags[m] |= FLAG.ANIMAL; });
    livestock.size = lsTraders.length;
    var traders = take(nW(30), adult(20, 70));
    var mhTraders = addGroup(marketHall, SET.MARKET, { label: 'stallholders', k: 3 });
    var mhShop = addGroup(marketHall, SET.MARKET, { label: 'shoppers' });
    traders.forEach(function (m, j) { join(m, mhTraders, dayMask([2, 3, 4, 5, 6])); join(m, mhShop, dayMask([2, 3, 4, 5, 6])); A.occ[m] = OCC.MARKET; A.work[m] = marketHall.i; if (j % 5 === 0) A.flags[m] |= FLAG.FOOD; });
    // offices & factories
    offices.forEach(function (p) { teams(p, SET.WORK, take(nW(R.int(35, 80)), adult()), R.int(8, 14), OCC.OFFICE, function () { return R.chance(0.3) ? dayMask(R.sample([1, 2, 3, 4, 5], 3)) : WEEKDAYS; }, 'team'); });
    factories.forEach(function (p) { teams(p, SET.WORK, take(nW(R.int(60, 110)), adult()), R.int(10, 16), OCC.FACTORY, function () { return R.chance(0.3) ? shifts() : WEEKDAYS; }, 'shift'); });
    teams(busDepot, SET.WORK, take(nW(40), adult(21, 66)), 12, OCC.TRANSPORT, shifts, 'drivers');
    hotels.forEach(function (p) { teams(p, SET.WORK, take(nW(12), adult()), 12, OCC.HOTEL, shifts, 'staff'); });
    // retail
    supers.forEach(function (p) { teams(p, SET.WORK, take(nW(R.int(12, 22)), adult(16, 70)), 10, OCC.RETAIL, shifts, 'shop floor'); });
    // hospitality (food handlers)
    pubs.forEach(function (p) { var st = take(nW(R.int(3, 6)), adult(18, 60)); teams(p, SET.WORK, st, 8, OCC.HOSPITALITY, shifts, 'bar and kitchen'); st.forEach(function (m) { A.flags[m] |= FLAG.FOOD; }); });
    rests.forEach(function (p) { var st = take(nW(R.int(4, 8)), adult(17, 64)); teams(p, SET.WORK, st, 8, OCC.HOSPITALITY, shifts, 'kitchen and floor'); st.forEach(function (m) { A.flags[m] |= FLAG.FOOD; }); });
    // delivery drivers (roaming doorstep contacts) & trades & out-of-town
    var drivers = take(nW(35), adult(20, 64));
    var depot = factories[factories.length - 1];
    var drvGroup = addGroup(depot, SET.WORK, { label: 'delivery drivers', k: 2 });
    drivers.forEach(function (m) { join(m, drvGroup, dayMask(R.sample([1, 2, 3, 4, 5, 6], 5))); A.occ[m] = OCC.DELIVERY; A.work[m] = depot.i; A.flags[m] |= FLAG.DELIVERY; });
    var rest = take(workers.length);
    var trades = rest.slice(0, Math.round(rest.length * 0.35)), outs = rest.slice(trades.length);
    var tradeTeams = [];
    trades.forEach(function (m, j) { if (j % 4 === 0) tradeTeams.push(addGroup(null, SET.WORK, { label: 'building/trades crew', k: 2 })); join(m, tradeTeams[tradeTeams.length - 1], WEEKDAYS); A.occ[m] = OCC.TRADES; });
    var outTeams = [];
    outs.forEach(function (m, j) { if (j % 10 === 0) outTeams.push(addGroup(null, SET.WORK, { label: 'works out of town / from home', k: 1, dur: 0.1 })); if (R.chance(0.5)) { join(m, outTeams[outTeams.length - 1], dayMask(R.sample([1, 2, 3, 4, 5], 2))); A.occ[m] = OCC.OUT; } else { A.occ[m] = OCC.OUT; A.flags[m] |= FLAG.WFH; } });

    // --- habits
    var herName = function (a) { return D.HERITAGES[A.her[a]]; };
    // faith
    var faithPlaces = { church: [], mosque: [], temple: [], gurdwara: [] };
    var churchNames = R.shuffle(D.VENUES.church), mosqueNames = R.shuffle(D.VENUES.mosque);
    C.districts.forEach(function (d, di) {
      if (d.type !== 'student' && (di % 2 === 0 || d.type === 'estate' || d.type === 'older')) faithPlaces.church.push(addPlace('church', churchNames.pop(), di, { ach: 1.5, m3: 14 }));
      if (d.type === 'inner' && mosqueNames.length) faithPlaces.mosque.push(addPlace('mosque', mosqueNames.pop(), di, { ach: 2, m3: 8 }));
    });
    if (!faithPlaces.mosque.length) faithPlaces.mosque.push(addPlace('mosque', mosqueNames.pop(), 0, { ach: 2, m3: 8 }));
    faithPlaces.temple.push(addPlace('temple', D.VENUES.temple[0], R.pick(pickDists(function (t) { return t === 'inner' || t === 'suburb'; })).i, { ach: 2, m3: 10 }));
    faithPlaces.gurdwara.push(addPlace('gurdwara', D.VENUES.gurdwara[0], R.pick(pickDists(function (t) { return t === 'inner'; }).concat([C.districts[0]])).i, { ach: 2, m3: 10, food: true }));
    var polishChurch = null, africanChurch = null, caribChurch = null, somaliMosque = null;
    faithPlaces.church.forEach(function (p) { if (/Polish/.test(p.name)) polishChurch = p; if (/RCCG/.test(p.name)) africanChurch = p; if (/New Testament|Elim/.test(p.name)) caribChurch = p; });
    faithPlaces.mosque.forEach(function (p) { if (/Somali/.test(p.name)) somaliMosque = p; });
    var worship = {};
    function worshipGroup(p) { if (worship[p.i] === undefined) worship[p.i] = addGroup(p, SET.FAITH, { label: p.kind === 'mosque' ? 'Friday prayers' : p.kind === 'church' ? 'Sunday service' : 'weekly worship' }); return worship[p.i]; }
    for (a = 0; a < N; a++) {
      if (A.flags[a] & FLAG.CARE_RES) continue;
      var hn = herName(a), fz = D.FAITH[hn];
      var agef = A.age[a];
      var pAttend = fz[1] * (agef > 60 ? 1.6 : agef < 30 ? 0.7 : 1);
      if (!R.chance(pAttend)) continue;
      var place = null, mask = SUN;
      if (fz[0] === 'mosque') { place = hn === 'somali' && somaliMosque ? somaliMosque : nearest(faithPlaces.mosque, A.dist[a]); mask = A.sex[a] ? (R.chance(0.2) ? ALL : 32) : (R.chance(0.3) ? 32 : 0); if (!mask) continue; }
      else if (fz[0] === 'temple') { place = faithPlaces.temple[0]; mask = dayMask([0, 2]); }
      else if (fz[0] === 'gurdwara') { place = faithPlaces.gurdwara[0]; mask = SUN; }
      else {
        place = (hn === 'polish' && polishChurch) ? polishChurch : (hn === 'african' && africanChurch) ? africanChurch : (hn === 'caribbean' && caribChurch) ? caribChurch : nearest(faithPlaces.church, A.dist[a]);
        mask = R.chance(0.2) ? (SUN | 8) : SUN;
      }
      join(a, worshipGroup(place), mask);
    }
    // choirs
    var choirHosts = R.sample(faithPlaces.church.concat(halls), 3);
    var choirs = choirHosts.map(function (host, k) {
      var p = addPlace('choir', D.VENUES.choir[k], host.di, { ach: 1, m3: 10, pos: host.pos.slice() });
      p.host = host.i; p.blurb = 'Rehearses in ' + host.name + '.';
      p.choirGroup = addGroup(p, SET.CHOIR, { label: 'rehearsal', day: -9999 });
      p.rehearsal = [2, 4, 3][k];
      return p;
    });
    for (a = 0; a < N; a++) {
      var ca = A.age[a]; if (ca < 25 || ca > 84 || (A.flags[a] & FLAG.CARE_RES)) continue;
      if (R.chance(ca > 55 ? 0.028 : 0.012)) { var ch2 = R.pick(choirs); join(a, ch2.choirGroup, 1 << ch2.rehearsal); }
    }
    choirs.forEach(function (p) { p.size = G.mem[p.choirGroup].length; });
    // pubs, restaurants, gyms, football, shops, market, commuting
    var sections = [];
    for (i = 0; i < 8; i++) sections.push(addGroup(stadium, SET.STADIUM, { label: ['North Stand', 'South Stand', 'East Terrace', 'West Stand', 'Family Stand', 'Away end', 'Main Stand', 'Corner'][i], alt: true }));
    var busGroups = C.districts.map(function (d) { return addGroup(station, SET.TRANSPORT, { label: 'buses from ' + d.name }); });
    var pubGroup = {}, restGroup = {}, gymGroup = {};
    pubs.forEach(function (p) { pubGroup[p.i] = addGroup(p, SET.PUB, { label: 'drinkers' }); });
    rests.forEach(function (p) { restGroup[p.i] = addGroup(p, SET.RESTAURANT, { label: 'diners' }); });
    gyms.forEach(function (p) { gymGroup[p.i] = addGroup(p, SET.GYM, { label: 'members' }); });
    var shopGroups = supers.map(function (p) { return addGroup(p, SET.SHOP, { label: 'shoppers' }); });
    // rebind pub/restaurant staff into the customer groups on shift days (they serve the customers)
    function nearPlaces(list, di, n) {
      var d = C.districts[di];
      return list.slice().sort(function (x, y) { return Math.hypot(x.pos[0] - d.centre[0], x.pos[1] - d.centre[1]) - Math.hypot(y.pos[0] - d.centre[0], y.pos[1] - d.centre[1]); }).slice(0, n);
    }
    for (a = 0; a < N; a++) {
      var ag2 = A.age[a], fl = A.flags[a], hn2 = herName(a), dd = A.dist[a];
      if (fl & FLAG.CARE_RES) continue;
      var muslim = hn2 === 'pakistani' || hn2 === 'bangladeshi' || hn2 === 'somali';
      if (ag2 >= 18) {
        var pp = (ag2 < 30 ? 0.5 : ag2 < 50 ? 0.38 : ag2 < 70 ? 0.3 : 0.18) * (A.sex[a] ? 1.15 : 0.85) * (muslim ? 0.08 : 1) * (fl & FLAG.STUDENT ? 1.3 : 1);
        if (R.chance(pp)) {
          var cand = nearPlaces(pubs, dd, 3), pub = R.chance(0.3) ? R.pick(pubs.filter(function (p) { return p.di === 0; }).concat(cand)) : cand[0];
          var nights = R.weighted([[1, 0.5], [2, 0.35], [3, 0.15]]);
          var dm = dayMask(R.shuffle([5, 6, 5, 6, 4, 0, 3, 2, 1]).filter(function (v, ix, arr) { return arr.indexOf(v) === ix; }).slice(0, nights));
          join(a, pubGroup[pub.i], dm);
        }
        if (rests.length && R.chance(ag2 < 70 ? 0.35 : 0.2)) { var rr2 = R.chance(0.5) ? nearPlaces(rests, dd, 2)[R.int(0, 1)] || rests[0] : R.pick(rests); join(a, restGroup[rr2.i], dayMask([R.pick([5, 6, 6, 0, 4, 3])])); }
        if (ag2 <= 65 && R.chance(ag2 < 35 ? 0.28 : 0.15)) { var gm = nearPlaces(gyms, dd, 2)[R.int(0, 1)] || gyms[0]; join(a, gymGroup[gm.i], dayMask(R.sample([1, 2, 3, 4, 5, 6, 0], R.int(2, 4)))); }
        join(a, shopGroups[dd], dayMask(R.sample([0, 1, 2, 3, 4, 5, 6], R.int(1, 3))));
        if (R.chance(0.1)) join(a, mhShop, dayMask([6]));
      } else if (ag2 >= 8 && R.chance(0.05)) join(a, shopGroups[dd], dayMask([6]));
      // football
      if (ag2 >= 10 && ag2 <= 80 && R.chance((A.sex[a] ? 0.1 : 0.03) * (ag2 < 18 ? 0.6 : 1))) join(a, sections[R.int(0, 7)], SAT);
      // commuting by bus
      var wk = A.work[a];
      if (wk >= 0 && places[wk].di !== dd && ag2 >= 11 && R.chance(0.28 + 0.3 * C.districts[dd].deprivation)) { A.flags[a] |= FLAG.COMMUTER; join(a, busGroups[dd], WEEKDAYS); }
    }
    // hospitality staff serve their customers (joins the customer group on their shift days)
    pubs.concat(rests).forEach(function (p) {
      var cg = pubGroup[p.i] !== undefined ? pubGroup[p.i] : restGroup[p.i];
      p.groups.forEach(function (g) { if (G.set[g] !== SET.WORK) return; G.mem[g].forEach(function (m) { join(m, cg, dayMask([4, 5, 6])); }); });
      p.size = G.mem[cg].length;
    });
    gyms.forEach(function (p) { p.size = G.mem[gymGroup[p.i]].length; });
    supers.forEach(function (p, di) { p.size = G.mem[shopGroups[di]].length; });
    stadium.size = sections.reduce(function (s, g) { return s + G.mem[g].length; }, 0);
    station.size = busGroups.reduce(function (s, g) { return s + G.mem[g].length; }, 0);
    marketHall.size = G.mem[mhShop].length;
    Object.keys(worship).forEach(function (pi) { places[pi].size = G.mem[worship[pi]].length; });
    // livestock market visitors: farmers, some rural residents
    for (a = 0; a < N; a++) if (A.dist[a] === ruralD.i && A.age[a] >= 18 && A.age[a] < 80 && !(A.flags[a] & FLAG.CARE_RES) && R.chance(0.06)) { join(a, lsGroup, dayMask([1])); A.flags[a] |= FLAG.ANIMAL; }
    farms.forEach(function (p) { G.mem[p.groups[0]].forEach(function (m) { if (R.chance(0.6)) { join(m, lsGroup, dayMask([1])); } }); });
    livestock.size = G.mem[lsGroup].length;

    // --- friends (social graph for visits, events and rumours)
    var byDistAge = {};
    for (a = 0; a < N; a++) { var key = A.dist[a] + ':' + Math.min(8, Math.floor(A.age[a] / 10)); (byDistAge[key] = byDistAge[key] || []).push(a); }
    var FR = []; for (a = 0; a < N; a++) FR.push([]);
    function link(x, y) { if (x === y || FR[x].indexOf(y) >= 0 || A.hh[x] === A.hh[y]) return; FR[x].push(y); FR[y].push(x); }
    for (a = 0; a < N; a++) {
      if (A.flags[a] & FLAG.CARE_RES) continue;
      var want = A.age[a] < 5 ? 1 : A.age[a] > 80 ? 2 : R.int(3, 5);
      var tries2 = 0;
      while (FR[a].length < want && tries2++ < 12) {
        var sameD = R.chance(0.7), dec = Math.min(8, Math.floor(A.age[a] / 10) + (R.chance(0.2) ? R.int(-1, 1) : 0));
        var kd = (sameD ? A.dist[a] : R.int(0, C.districts.length - 1)) + ':' + Math.max(0, dec);
        var L2 = byDistAge[kd]; if (!L2 || !L2.length) continue;
        var b = L2[R.int(0, L2.length - 1)];
        if (A.flags[b] & FLAG.CARE_RES) continue;
        link(a, b);
      }
      // workmates and classmates become friends too
    }
    for (var gi2 = 0; gi2 < G.mem.length; gi2++) {
      var s2 = G.set[gi2]; if (s2 !== SET.WORK && s2 !== SET.SCHOOL && s2 !== SET.CHOIR && s2 !== SET.UNI) continue;
      var M = G.mem[gi2]; if (M.length < 2) continue;
      for (var t2 = 0; t2 < Math.ceil(M.length / 4); t2++) link(M[R.int(0, M.length - 1)], M[R.int(0, M.length - 1)]);
    }
    // relatives in other households (same surname & heritage in the city)
    var bySurname = {};
    for (a = 0; a < N; a++) if (A.age[a] >= 18) (bySurname[A.last[a]] = bySurname[A.last[a]] || []).push(a);
    Object.keys(bySurname).forEach(function (s) { var L3 = bySurname[s]; if (L3.length < 2 || L3.length > 40) return; for (var t = 0; t < Math.min(3, L3.length / 3); t++) link(L3[R.int(0, L3.length - 1)], L3[R.int(0, L3.length - 1)]); });

    // travellers (recently abroad) — a small pool, used for imported cases
    for (a = 0; a < N; a++) if (A.age[a] >= 18 && A.age[a] < 75 && !(A.flags[a] & FLAG.CARE_RES) && R.chance(0.03)) A.flags[a] |= FLAG.TRAVELLER;

    // --- events: weddings, parties, community gatherings (sim days 0..420)
    C.events = [];
    function hostGuests(host, n) {
      var set = {}, out = [];
      function add(x) { if (!set[x] && !(A.flags[x] & FLAG.CARE_RES)) { set[x] = 1; out.push(x); } }
      H.mem[A.hh[host]].forEach(add);
      FR[host].forEach(function (f) { add(f); H.mem[A.hh[f]].forEach(function (y) { if (R.chance(0.6)) add(y); }); });
      var fr2 = FR[host].slice();
      for (var t = 0; t < 200 && out.length < n; t++) {
        var f2 = fr2.length ? R.pick(fr2) : host;
        var ff = FR[f2]; if (ff.length) { var z = R.pick(ff); add(z); if (R.chance(0.3)) fr2.push(z); }
      }
      return out.slice(0, n);
    }
    var adults = []; for (a = 0; a < N; a++) if (A.age[a] >= 22 && A.age[a] <= 60 && !(A.flags[a] & FLAG.CARE_RES)) adults.push(a);
    for (var sd = 0; sd < 420; sd++) {
      var wd = (sd + C.wd0) % 7;
      if (wd === 6 && R.chance(0.75)) {
        var h1 = R.pick(adults), venue = R.chance(0.5) ? hotels[0] : R.chance(0.5) ? R.pick(halls) : R.pick(hotels);
        C.events.push({ kind: 'wedding', sdOffset: sd, host: h1, place: venue.i, n: R.int(40, 90) });
      }
      if (R.chance(wd === 5 || wd === 6 ? 0.55 : wd === 0 ? 0.35 : 0.12)) {
        var h2 = R.pick(adults), kindE = R.weighted([['birthday party', 3], ['christening', wd === 0 ? 2 : 0], ['engagement party', 1], ['retirement do', 1], ['Eid party', 0.5], ['quiz night', wd >= 2 && wd <= 4 ? 3 : 0], ['wake', 0.8]]);
        var pl = kindE === 'quiz night' || kindE === 'retirement do' || kindE === 'wake' ? R.pick(pubs.concat(halls)) : kindE === 'christening' ? R.pick(faithPlaces.church) : R.chance(0.5) ? R.pick(halls) : null;
        C.events.push({ kind: kindE, sdOffset: sd, host: h2, place: pl ? pl.i : -1, n: R.int(12, 35) });
      }
    }
    C.events.forEach(function (e, ei) {
      var p = e.place >= 0 ? places[e.place] : null;
      var g = addGroup(p, SET.EVENT, { day: e.sdOffset, label: e.kind });
      e.group = g; e.id = ei;
      hostGuests(e.host, e.n).forEach(function (x) { G.mem[g].push(x); MS.push([x, g, ALL]); });
      if (p && p.food) {   // venue staff serve the event
        p.groups.forEach(function (sg) { if (G.set[sg] === SET.WORK) G.mem[sg].forEach(function (m) { if (A.flags[m] & FLAG.FOOD) { G.mem[g].push(m); MS.push([m, g, ALL]); } }); });
      }
    });

    // --- pack into typed arrays
    C.age = Uint8Array.from(A.age); C.sex = Uint8Array.from(A.sex); C.hh = Int32Array.from(A.hh); C.dist = Uint8Array.from(A.dist);
    C.her = Uint8Array.from(A.her); C.occ = Uint8Array.from(A.occ); C.work = Int32Array.from(A.work); C.flags = Uint16Array.from(A.flags);
    C.first = A.first; C.last = A.last;
    // households CSR
    var nH = H.mem.length;
    C.nH = nH; C.hStart = new Int32Array(nH + 1); var hm = [];
    for (i = 0; i < nH; i++) { C.hStart[i] = hm.length; H.mem[i].forEach(function (x) { hm.push(x); }); }
    C.hStart[nH] = hm.length; C.hMem = Int32Array.from(hm);
    C.hDist = Uint8Array.from(H.dist); C.hAddr = H.addr; C.hKind = H.kind; C.hPos = H.pos;
    // groups
    var nG = G.place.length;
    C.nG = nG; C.gPlace = Int32Array.from(G.place); C.gSet = Uint8Array.from(G.set); C.gK = Uint8Array.from(G.k); C.gDur = Float32Array.from(G.dur);
    C.gRoom = Float32Array.from(G.room); C.gDay = Int32Array.from(G.day); C.gLabel = G.label; C.gAlt = Uint8Array.from(G.alt);
    C.gStart = new Int32Array(nG + 1); var gm = [];
    for (i = 0; i < nG; i++) { C.gStart[i] = gm.length; G.mem[i].forEach(function (x) { gm.push(x); }); }
    C.gStart[nG] = gm.length; C.gMem = Int32Array.from(gm);
    // memberships CSR by agent
    MS.sort(function (x, y) { return x[0] - y[0] || x[1] - y[1]; });
    C.mStart = new Int32Array(N + 1); C.mGroup = new Int32Array(MS.length); C.mMask = new Uint8Array(MS.length);
    var cur = 0;
    for (i = 0; i < MS.length; i++) { while (cur <= MS[i][0]) C.mStart[cur++] = i; C.mGroup[i] = MS[i][1]; C.mMask[i] = MS[i][2]; }
    while (cur <= N) C.mStart[cur++] = MS.length;
    // friends CSR
    C.fStart = new Int32Array(N + 1); var fl2 = [];
    for (a = 0; a < N; a++) { C.fStart[a] = fl2.length; FR[a].forEach(function (x) { fl2.push(x); }); }
    C.fStart[N] = fl2.length; C.fList = Int32Array.from(fl2);
    // choir groups are weekly on their rehearsal night (mask already per member)
    C.careHomes = careHomes.map(function (ch) { return { place: ch.place, group: ch.group, residents: ch.residents }; });
    C.hospitalWards = C.wards;
    C.prim = prim.map(function (p) { return p.i; }); C.sec = sec.map(function (p) { return p.i; });
    C.animalSites = [livestock.i, meat.i].concat(farms.map(function (p) { return p.i; }));
    C.marketHall = marketHall.i; C.livestock = livestock.i; C.labs = labs.map(function (p) { return p.i; }); C.stadium = stadium.i;
    C.gps = gps.map(function (p) { return p.i; });
    C.scale = IX.round(C.population / N, 2);
    places.forEach(function (p) {
      if (!p.size) p.size = p.groups.reduce(function (s, g) { return s + (C.gStart[g + 1] - C.gStart[g]); }, 0);
      delete p.groups_; p.blurb = p.blurb || placeBlurb(p);
    });
    C.placeGroups = places.map(function (p) { return p.groups.slice(); });
    return C;
  };

  function placeBlurb(p) {
    var v = p.ach <= 1.5 ? 'poorly ventilated' : p.ach >= 5 ? 'well ventilated' : 'average ventilation';
    var k = { hospital: 'The city\'s acute hospital.', gp: 'GP surgery.', care_home: 'Residential care home.', school: p.sub === 'primary' ? 'Primary school.' : 'Secondary school.',
      nursery: 'Day nursery.', university: 'Campus, lecture theatres and halls.', office: 'Offices.', factory: 'Industrial site.', supermarket: 'Supermarket.', pub: 'Pub with food.',
      restaurant: 'Restaurant.', gym: 'Gym.', church: 'Church.', mosque: 'Mosque.', temple: 'Hindu temple.', gurdwara: 'Gurdwara with a community kitchen (langar).', choir: 'Choir.',
      stadium: 'Football ground (home games alternate Saturdays).', market: p.sub === 'livestock' ? 'Livestock and poultry market, Mondays and Wednesdays.' : 'Indoor market hall, Tuesday to Saturday.',
      meat_plant: 'Meat processing plant: cold, loud, crowded lines.', farm: 'Working farm.', lab: 'Research laboratory.', station: 'Rail and bus interchange.', hotel: 'Hotel and function rooms.',
      community_hall: 'Community centre with a function room.' }[p.kind] || '';
    return k + (p.indoor ? ' ' + v.charAt(0).toUpperCase() + v.slice(1) + '.' : '');
  }
})();
