/* INDEX CASE engine — 09-solver.js
 * The ideal epidemiologist. IX.estimate(g) reads ONLY what the player can see
 * (line list, contacts, curves, study and questionnaire results, the tree) and
 * turns it into estimates of every trait, the way a good field epidemiologist
 * would. IX.solve(g) plays a game headlessly through the public API with the
 * grade's staff hours; IX.accept(g) uses it to check the game is fair:
 * detectable early, characterisable by the time community spread starts, and
 * dangerous enough to matter but not hopeless. The mentor uses the same machinery.
 */
var IX = (typeof IX !== 'undefined' && IX) ? IX : {};

(function () {
  'use strict';
  var D = IX.DATA, SET = IX.SET;
  var SINGLE_DAY = { 'celebration': 1, 'social visit': 1, 'choir': 1, 'pub': 1, 'restaurant': 1, 'place of worship': 1, 'football ground': 1, 'gym': 1, 'funeral': 1, 'doorstep delivery': 1, 'market': 1 };

  // ================================================================ estimators (observable data only)
  function erf(x) { var t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
  IX.erf = erf;
  /** gamma(mean, cv) + uniform(1..21) mixture fitted by grid search; returns {mean, sd, share} */
  function incubationFit(L) {
    var best = null, bestLL = -Infinity;
    function lgamma(z) { var c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; var x = z, y = z, t = x + 5.5; t -= (x + 0.5) * Math.log(t); var ser = 1.000000000190015; for (var j = 0; j < 6; j++) ser += c[j] / ++y; return -t + Math.log(2.5066282746310005 * ser / x); }
    for (var mu = 1.5; mu <= 16; mu += 0.25) for (var cv = 0.25; cv <= 0.55; cv += 0.1) for (var pi = 0.3; pi <= 1.0001; pi += 0.1) {
      var k = 1 / (cv * cv), th = mu / k, ll = 0, lk = lgamma(k);
      for (var i = 0; i < L.length; i++) {
        var x = Math.max(0.5, L[i]);
        var g = Math.exp((k - 1) * Math.log(x) - x / th - lk - k * Math.log(th));
        ll += Math.log(pi * g + (1 - pi) / 21 + 1e-12);
      }
      if (ll > bestLL) { bestLL = ll; best = { mean: IX.round(mu, 1), sd: IX.round(mu * cv, 2), share: IX.round(pi, 1) }; }
    }
    return best;
  }
  IX.incubationFit = incubationFit;
  function robustMean(L) {
    if (!L.length) return NaN;
    var m = IX.median(L), keep = L.filter(function (v) { return v <= 2 * m + 2; });
    return IX.mean(keep.length ? keep : L);
  }
  IX.robustMean = robustMean;
  /** R from a growth rate r and a gamma generation interval (mean mu, sd 0.45 mu) */
  function rFromGrowth(r, mu) { var sd = 0.45 * mu, k = mu * mu / (sd * sd), th = sd * sd / mu; return Math.pow(1 + r * th, k); }
  IX.rFromGrowth = rFromGrowth;

  IX.estimate = function (g) {
    var S = g.S, ll = g.lineList(), byPid = {}, C = g.C;
    ll.forEach(function (c) { byPid[c.pid] = c; });
    var cons = g.contacts();
    var E = { n: {} };
    var live = ll.filter(function (c) { return c.status === 'confirmed' || c.status === 'probable'; });

    // --- source-contact pairs with a single known exposure day. A pair counts only if the contact names no other
    //     ill person they knew (from their own interview) and nobody at home fell ill first.
    var pairs = [], early0 = (S.recognizedDay || 0) + 14;
    function otherSources(c, src) {
      var oc = byPid[c];
      if (!oc || !oc.interviewed) return false;
      return (oc.illContacts || []).some(function (i) { return i.person.id !== src && i.onset <= oc.onset; });
    }
    cons.forEach(function (c) {
      if (c.onset === undefined || c.setting === 'household') return;
      var cs = byPid[c.pid]; if (!cs || cs.status === 'discarded' || cs.status === 'suspected') return;
      c.of.forEach(function (src) {
        var s = byPid[src]; if (!s || s.onset === null || s.status === 'discarded' || s.status === 'suspected') return;
        var days = (c.days && c.days[src]) || [c.exposure];
        if (days.length !== 1 || days[0] > early0) return;
        var inc = c.onset - days[0];
        if (inc < 1 || inc > 21 || otherSources(c.pid, src)) return;
        pairs.push({ day: days[0], inc: inc, si: c.onset - s.onset, pre: days[0] < s.onset });
      });
    });
    // interviews: a case whose only link to a known earlier case is one day at one place
    ll.forEach(function (c) {
      if (!c.interviewed || !c.exposures || c.onset === null || c.status !== 'confirmed' || c.onset > early0) return;
      if ((c.illContacts || []).length) return;
      var links = [];
      c.exposures.forEach(function (e) {
        if (e.kind !== 'place' || !e.place || e.days.length > 2) return;
        var pi = g.placeIdx(e.place.id);
        e.days.forEach(function (d0) {
          ll.forEach(function (o) {
            if (o.pid === c.pid || o.onset === null || o.status !== 'confirmed' || o.onset > c.onset - 1) return;
            var there = (o.exposures || []).some(function (e2) { return e2.place && g.placeIdx(e2.place.id) === pi && e2.days.indexOf(d0) >= 0; });
            if (there && d0 >= o.onset - 3 && d0 <= o.onset + 7) links.push({ day: d0, src: o });
          });
        });
      });
      var ds = links.map(function (l) { return l.day; });
      if (links.length && Math.max.apply(null, ds) - Math.min.apply(null, ds) <= 1) { var l0 = links[0]; var inc2 = c.onset - l0.day; if (inc2 >= 1 && inc2 <= 21) pairs.push({ day: l0.day, inc: inc2, si: c.onset - l0.src.onset, pre: l0.day < l0.src.onset, interview: true }); }
    });
    // incubation: onset curves of point-source events (questionnaires at gatherings) and single-exposure pairs
    var EVENT_KINDS = { pub: 1, restaurant: 1, choir: 1, church: 1, mosque: 1, temple: 1, gurdwara: 1, hotel: 1, community_hall: 1, gym: 1, stadium: 1 };
    var inc = [];
    S.quests.forEach(function (q) { if (!EVENT_KINDS[q.kind] || (q.onsets || []).length < 3) return; q.onsets.forEach(function (v) { if (v >= 1 && v <= 21) inc.push(v); }); });
    pairs.forEach(function (p) { inc.push(p.inc); });
    E.n.incubation = inc.length;
    // onsets after a single exposure are a mixture: the incubation distribution, plus illness caught elsewhere
    // (roughly flat over the three-week window). Fit both by maximum likelihood.
    var fit = inc.length >= 8 ? incubationFit(inc) : null;
    if (fit) { E.incubation = fit.mean; E.incFit = fit; }
    // serial interval: households and pairs
    var si = [];
    S.hhStudies.forEach(function (st) { if (st.result && st.result.si) st.result.si.forEach(function (v) { if (v >= -5 && v <= 25) si.push(v); }); });
    pairs.forEach(function (p) { if (p.si >= -5 && p.si <= 25) si.push(p.si); });
    E.n.si = si.length;
    if (si.length >= 6) E.serial = IX.round(IX.mean(si), 1);
    // presymptomatic transmission: directly, from pairs where we know the exposure day; or from the serial
    // interval minus the incubation period (He et al. / Ganyani et al.)
    var pre = 0, post = 0;
    pairs.forEach(function (p) { if (p.si >= -3) { if (p.pre) pre++; else post++; } });
    E.n.presym = pre + post;
    if (si.length >= 10 && fit) {
      var mSi = IX.median(si), madSi = IX.median(si.map(function (v) { return Math.abs(v - mSi); })) * 1.4826;
      var vSi = Math.pow(Math.max(1, madSi), 2), mIn = fit.mean, vIn = Math.pow(fit.sd, 2);
      var mt = mSi - mIn, sdt = Math.sqrt(Math.max(1, vSi - vIn));
      E.presymModel = Math.round(100 * 0.5 * (1 + erf(-mt / sdt / Math.SQRT2)));
    }
    // venue pairs over-represent transmission before symptoms (the ill stay home), so the serial-interval
    // method, which includes households, leads; the direct count is only a fallback
    if (E.presymModel !== undefined) E.presym = E.presymModel;
    else if (pre + post >= 12) E.presym = Math.round(100 * pre / (pre + post));
    E.presymDirect = pre + post ? Math.round(100 * pre / (pre + post)) : undefined;

    // --- hidden infections: household studies
    var hi = 0, ha = 0, hs = 0;
    S.hhStudies.forEach(function (st) { if (st.result) { hi += st.result.infected; ha += st.result.asym; hs++; } });
    E.n.asym = hi;
    if (hi >= 10) E.asym = Math.round(100 * ha / hi);

    // --- R: early growth (wastewater if we have it: it does not depend on testing), and the generation time
    var ec = g.epiCurve(), ww = g.wastewater();
    var mu = E.serial || E.incubation || 5;
    var rW = wwGrowth(ww), rC = null;
    var rd = (S.recognizedDay || 0) - ec.from;
    rC = growth(ec.byOnset, rd - 3, Math.min(ec.byOnset.length - 7, rd + 21));
    E.growth = rW !== null ? rW : rC;
    E.growthFrom = rW !== null ? 'wastewater' : 'cases';
    if (E.growth !== null && (rW !== null || live.length >= 30)) E.R = IX.round(Math.max(0.5, rFromGrowth(E.growth, mu)), 2);

    // --- severity: antibodies (all infections) against deaths
    var deathsTot = 0; ec.deaths.forEach(function (d2) { deathsTot += d2; });
    E.deaths = deathsTot;
    var best = null;
    S.seroResults.forEach(function (q) { if (S.day >= q.day + 7 && q.pos >= 4 && (!best || q.pos > best.pos)) best = q; });
    E.n.ifr = best ? best.pos : 0;
    if (best) {
      var prev = Math.max(0.0005, (best.pos / best.n - 0.005) / 0.895);
      var infections = prev * C.N;
      var dUpTo = 0, admUpTo = 0;
      for (var k = 0; k < ec.deaths.length && ec.from + k <= best.day + 7; k++) dUpTo += ec.deaths[k];
      for (k = 0; k < ec.admissions.length && ec.from + k <= best.day; k++) admUpTo += ec.admissions[k];
      if (dUpTo >= 3) E.ifr = IX.round(100 * dUpTo / infections, 2);
      E.ihr = IX.round(100 * admUpTo / infections, 1);
    }

    // --- who it hits: which age shape explains admissions (and deaths) by age best
    E.ageRisk = ageShape(g, ec, best);
    E.n.ageRisk = ec.byAge.admitted.reduce(function (s2, v) { return s2 + v; }, 0);

    // --- route
    E.route = routeGuess(g, ll, E);

    // --- case definition from confirmed cases' symptoms
    var symN = {}, nSym = 0;
    ll.forEach(function (c) { if (c.status === 'confirmed' && c.symptoms && c.symptoms.length) { nSym++; c.symptoms.forEach(function (sy) { symN[sy] = (symN[sy] || 0) + 1; }); } });
    if (nSym >= 6) E.caseDef = Object.keys(symN).filter(function (sy) { return symN[sy] / nSym >= 0.35; }).sort(function (a2, b2) { return symN[b2] - symN[a2]; }).slice(0, 5);

    // --- source & first case: earliest known onsets, animal exposure, travel
    var early = ll.filter(function (c) { return c.status !== 'discarded' && c.onset !== null; }).sort(function (a2, b2) { return a2.onset - b2.onset; });
    if (early.length) {
      var first = early[0];
      E.originCase = first.pid;
      var ex = first.exposures || [];
      if (ex.some(function (e) { return e.kind === 'travel'; })) E.source = 'traveller';
      else if (ex.some(function (e) { return e.kind === 'animal'; })) { var pl = ex.filter(function (e) { return e.kind === 'animal'; })[0].place; E.source = pl && C.places[g.placeIdx(pl.id)].kind === 'market' ? 'market' : 'farm'; }
    }
    if (S.animalFound !== undefined) E.source = C.places[S.animalFound].kind === 'market' ? 'market' : 'farm';
    if (S.trial && S.trial.result) { var T = S.trial.result; E.treatment = T.hi < 1 ? (T.rr < 0.6 ? 'good' : 'partial') : 'none'; }
    return E;
  };

  /** growth rate of total wastewater signal over its first three weeks of samples */
  function wwGrowth(ww) {
    var ids = Object.keys(ww.byDistrict); if (!ids.length) return null;
    var n = ww.byDistrict[ids[0]].length, pts = [];
    for (var i = 0; i < n; i++) {
      var tot = 0, any = false;
      ids.forEach(function (d) { var v = ww.byDistrict[d][i]; if (v !== null) { any = true; tot += v; } });
      if (any) pts.push([i, Math.log(tot + 50)]);
    }
    if (pts.length < 6) return null;
    pts = pts.slice(0, 10);
    if (pts[pts.length - 1][0] - pts[0][0] < 10) return null;
    var sx = 0, sy = 0, sxx = 0, sxy = 0, m = pts.length;
    pts.forEach(function (p) { sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; sxy += p[0] * p[1]; });
    return (m * sxy - sx * sy) / (m * sxx - sx * sx);
  }

  /** age shape by Poisson likelihood: admissions (and deaths) per band against infections per band */
  function ageShape(g, ec, sero) {
    var ba = ec.byAge, C = g.C;
    var adm = ba.admitted, died = ba.died, nA = 0, nD = 0, b;
    for (b = 0; b < 7; b++) { nA += adm[b]; nD += died[b]; }
    if (nA < 8) return undefined;
    // exposure: infections by band from the antibody survey if we have one, else confirmed cases (which under-count children)
    var pop = [0, 0, 0, 0, 0, 0, 0]; for (var a = 0; a < C.N; a++) pop[D.ageBand(C.age[a])]++;
    var ex = [];
    for (b = 0; b < 7; b++) ex.push(sero && sero.byAge ? pop[b] * (sero.byAge[b][1] + 0.5) / (sero.byAge[b][0] + 1) : ba.cases[b] + 1);
    var bestS = null, bestL = -Infinity;
    D.AGE_SHAPES.forEach(function (sh) {
      var ifr = D.AGE_RISK[sh], ihr = ifr.map(function (f, i) { return f / D.FH_BASE[i]; });
      var L = pois(adm, ex, ihr) + (nD >= 5 ? pois(died, ex, ifr) : 0);
      if (L > bestL) { bestL = L; bestS = sh; }
    });
    return bestS;
  }
  function pois(obs, ex, rel) {
    var so = 0, se = 0, i;
    for (i = 0; i < obs.length; i++) { so += obs[i]; se += ex[i] * rel[i]; }
    var k = so / se, L = 0;
    for (i = 0; i < obs.length; i++) { var mu = Math.max(1e-9, k * ex[i] * rel[i]); L += obs[i] * Math.log(mu) - mu; }
    return L;
  }

  /** exponential growth rate by least squares on log(counts+1) over [a, b) */
  function growth(y, a, b) {
    a = Math.max(0, a); if (b - a < 8) return null;
    var sx = 0, sy = 0, sxx = 0, sxy = 0, m = 0, tot = 0;
    // smooth by 7-day sums to kill weekday effects
    for (var i = a; i < b; i++) {
      var w = 0; for (var k = Math.max(0, i - 6); k <= i; k++) w += y[k] || 0;
      tot += y[i] || 0;
      var v = Math.log(w + 1);
      sx += i; sy += v; sxx += i * i; sxy += i * v; m++;
    }
    if (tot < 12) return null;
    var den = m * sxx - sx * sx; if (!den) return null;
    return (m * sxy - sx * sy) / den;
  }
  IX.growthRate = growth;

  function routeGuess(g, ll, E) {
    var S = g.S;
    var ev = { airborne: 0, droplet: 0, contact: 0, gut: 0, animal: 0 };
    E.routeEv = ev;
    // symptoms: faecal-oral bugs look like it
    var nC = 0, gutS = 0, bleed = 0;
    ll.forEach(function (c) { if (c.status === 'confirmed' && c.symptoms) { nC++; if (c.symptoms.indexOf('diarrhoea') >= 0 || c.symptoms.indexOf('vomiting') >= 0) gutS++; if (c.symptoms.indexOf('bleeding_gums') >= 0 || c.symptoms.indexOf('nosebleeds') >= 0) bleed++; } });
    if (nC >= 5 && gutS / nC > 0.6) ev.gut += 2;
    if (nC >= 5 && bleed / nC > 0.2) ev.contact += 1;
    // questionnaires
    var pc = { n: 0, ill: 0 }, pf = { n: 0, ill: 0 }, foodQ = 0;
    S.quests.forEach(function (q) {
      var cats = q.cats, close = cats[IX.QCAT.close], far = cats[IX.QCAT.far];
      var ate = cats[IX.QCAT.ate], nate = cats[IX.QCAT.nate];
      if (ate && nate && ate.n >= 5 && nate.n >= 3) { var ra = ate.ill / ate.n, rn = (nate.ill + 0.5) / (nate.n + 1); if (ra > 2.5 * rn && ra > 0.12) { ev.gut += 2.5; foodQ++; return; } }
      if (q.ill < 3 || !close || !far) return;
      pc.n += close.n; pc.ill += close.ill; pf.n += far.n; pf.ill += far.ill;
    });
    if (pc.n >= 8 && pf.n >= 15 && pc.ill >= 3) {
      var rc = pc.ill / pc.n, rf = pf.ill / pf.n;
      if (rf >= 0.35 * rc && rf >= 0.06) ev.airborne += 2.2;
      else if (rf < 0.2 * rc) { ev.droplet += 1.2; ev.contact += 0.8; }
    }
    // cluster settings
    var cl = g.clusters(), venue = 0, hh = 0, care = 0;
    cl.forEach(function (c) { if (c.kind === 'household') hh++; else if (c.kind === 'care_home' || c.kind === 'hospital') care += c.size; else venue += c.size >= 3 ? 1 : 0; });
    if (venue <= 1 && hh + care >= 4 && E.presym !== undefined && E.presym < 10) ev.contact += 1.5;
    if (E.presym !== undefined && E.presym < 8) ev.contact += 1;
    if (E.presym !== undefined && E.presym > 15) { ev.droplet += 0.8; ev.contact -= 1; }
    if (E.serial !== undefined && E.incubation !== undefined && E.serial > E.incubation + 1.5) ev.contact += 0.6;
    if (nC >= 5 && gutS / nC > 0.6) ev.airborne -= 1;
    // animal: positive animal samples, or early cases with animal exposure and no human source
    if (S.animalFound !== undefined) ev.animal += 3;
    var an = 0; ll.forEach(function (c) { if ((c.exposures || []).some(function (e) { return e.kind === 'animal'; }) && !(c.illContacts || []).length) an++; });
    if (an >= 3) ev.animal += 1.5;
    var best = null, bv = 0.9;
    Object.keys(ev).forEach(function (k) { if (ev[k] > bv) { bv = ev[k]; best = k; } });
    if (!best && E.presym !== undefined) best = E.presym < 8 ? 'contact' : null;
    return best || undefined;
  }

  // ================================================================ tolerance
  IX.withinTolerance = function (g, trait, value) {
    if (value === undefined || value === null) return false;
    var e = g.estimateError(trait, value);
    return e !== null && e <= 0.5;
  };

  // ================================================================ the headless player
  /** plays through the public API: investigations only (no orders), so its city stays the ghost city.
   *  opts: {until: day, hoursMult}. Returns a report. */
  IX.solve = function (g, opts) {
    opts = opts || {};
    var S = g.S, until = opts.until || 70, hm = opts.hoursMult || 1;
    var rep = { declared: null, confirmed: null, community: null, traitDay: {}, estimates: {}, fails: [] };
    var done = { interview: {}, trace: {}, household: {}, site: {}, quest: {}, seq: {} };
    var lastReview = -99, lastSero = -99;
    var tol = {};
    function act(id, t, p) { var r = g.act(id, t, p); return r.ok; }
    var addHours = function () { if (hm !== 1) { S.used.tracers -= S.staff.tracers * 7.5 * (hm - 1); S.used.field -= S.staff.field * 7.5 * (hm - 1); S.used.analysts -= S.staff.analysts * 7.5 * (hm - 1); } };
    while (!g.over && S.day < until) {
      addHours();
      var ll = g.lineList();
      if (!S.recognized) {
        // act 1: panel-test the ill, interview them, visit the alert place, declare
        ll.forEach(function (c) { if (c.status === 'suspected' && !c.tests.length) act('test', c.pid); });
        ll.forEach(function (c) { if (c.status !== 'discarded' && !done.interview[c.pid] && act('interview', c.pid)) done.interview[c.pid] = 1; });
        if (S.alert && !done.site[S.alert.place]) { if (act('site_visit', S.alert.place)) done.site[S.alert.place] = 1; }
        if (!S.declared && act('declare_novel')) rep.declaredDay = S.day;
        if (S.day - lastReview >= 5 && act('record_review')) lastReview = S.day;
      } else {
        if (!g.ordersOf('wastewater').length) g.order('wastewater');
        var live = ll.filter(function (c) { return c.status === 'confirmed' || c.status === 'probable'; });
        live.sort(function (a, b) { return (b.onset === null ? -99 : b.onset) - (a.onset === null ? -99 : a.onset); });
        // household studies are the only way to count hidden cases
        var hhDone = Object.keys(done.household).length;
        live.forEach(function (c) { if (hhDone < 12 && !done.household[c.pid] && c.status === 'confirmed' && g.canAct('household', c.pid) === null && act('household', c.pid)) { done.household[c.pid] = 1; hhDone++; } });
        live.forEach(function (c) { if (!done.interview[c.pid] && act('interview', c.pid)) done.interview[c.pid] = 1; });
        live.forEach(function (c) { if (!done.trace[c.pid] && c.onset !== null && act('trace', c.pid, { daysBefore: 5 })) done.trace[c.pid] = 1; });
        g.clusters().forEach(function (k) {
          if (!k.place) return;
          var pi = g.placeIdx(k.place.id);
          if (!done.site[pi] && act('site_visit', pi)) done.site[pi] = 1;
          var ek = g.C.places[pi].kind;
          if (k.size >= 3 && !done.quest[pi] && (['pub', 'restaurant', 'choir', 'church', 'mosque', 'temple', 'gurdwara', 'hotel', 'community_hall', 'gym', 'stadium'].indexOf(ek) >= 0 || k.size >= 6) && act('questionnaire', pi)) done.quest[pi] = 1;
        });
        if (S.day - lastReview >= 7 && act('record_review')) lastReview = S.day;
        live.slice(0, 3).forEach(function (c) { if (!done.seq[c.pid] && g.canAct('sequence', c.pid) === null && act('sequence', c.pid)) done.seq[c.pid] = 1; });
        if (S.day - lastSero >= 14 && live.length >= 25 && g.canAct('serosurvey', null, { n: 600 }) === null && act('serosurvey', null, { n: 600 })) lastSero = S.day;
        // animals
        g.C.places.forEach(function (p) { if ((p.kind === 'market' || p.kind === 'farm' || p.kind === 'meat_plant') && !done.site['a' + p.i] && live.some(function (c) { return (c.exposures || []).some(function (e) { return e.kind === 'animal' && e.place && e.place.id === p.id; }); })) { if (act('animal_sampling', p.i)) done.site['a' + p.i] = 1; } });
      }
      var r = g.endDay();
      if (S.recognized && rep.confirmed === null) rep.confirmed = S.recognizedDay;
      if (rep.community === null && g.communitySpread()) rep.community = S.day;
      // track when each trait first becomes (and stays) estimable within tolerance
      if (S.recognized) {
        var E = IX.estimate(g);
        IX.KEY_TRAITS.forEach(function (k) {
          var ok = IX.withinTolerance(g, k, E[k]);
          if (ok && rep.traitDay[k] === undefined) rep.traitDay[k] = S.day;
          if (!ok && rep.traitDay[k] !== undefined && S.day - rep.traitDay[k] < 5) delete rep.traitDay[k];
        });
        rep.estimates = E;
        if (opts.history) (rep.hist = rep.hist || {})[S.day] = { E: E, T: IX.clone(g.truthCard()) };
      }
    }
    rep.day = S.day;
    return rep;
  };

  // ================================================================ acceptance
  IX.ACCEPT = { detectBy: { probationer: 10, consultant: 10, director: 12 }, charSlack: 21, needTraits: 5, minGhostDeaths: 6, minGhostHosp: 20, minPeakDay: 14, maxAlertInf: 0.06, maxAlertInfBy: { probationer: 0.03, consultant: 0.05, director: 0.07 } };
  var SINGLE_SET = {}; [SET.EVENT, SET.VISIT, SET.PUB, SET.RESTAURANT, SET.CHOIR, SET.FAITH, SET.STADIUM, SET.GYM, SET.MARKET, SET.DOORSTEP, SET.FUNERAL].forEach(function (s) { SINGLE_SET[s] = 1; });

  /** Fast acceptance (used by IX.newGame): the alert, the ghost city, and truth-side proxies for
   *  what an ideal epidemiologist could observe in time. tests/solve.js --full checks these
   *  proxies against the full headless solver (IX.acceptFull).
   *  Returns {ok, fails, level:'pathogen'|'draw'} — level says whether to change the pathogen or just the draws. */
  IX.accept = function (g, opts) {
    opts = opts || {};
    var A = IX.ACCEPT, v = { ok: false, fails: [], level: 'draw' };
    var sim = g.sim, C = g.C, S = g.S, P = g.P;
    // detectable: the alert comes early, and it contains enough real cases to declare
    v.infAtAlert = sim.n;
    if (sim.n > (A.maxAlertInfBy[g.grade] || A.maxAlertInf) * C.N) v.fails.push('alert late (' + sim.n + ' infected)');
    var sdA = g.sdOf(0) - 1, real = 0;
    S.caseOrder.forEach(function (pid) { if (g.infBy(pid, sdA) >= 0) real++; });
    v.realAtAlert = real;
    if (real < 3) v.fails.push('alert has ' + real + ' real cases');
    if (v.fails.length) return v;
    // the ghost city (runs to the day limit; reused by the debrief)
    var gh = g.ghost(g.sdOf(IX.DAY_LIMIT)).sim;
    var deaths = 0, hosp = 0, peak = 0, peakSd = 0, x;
    for (x = 0; x < gh.n; x++) { if (gh.xdeath[x] >= 0) deaths++; if (gh.xhosp[x] >= 0) hosp++; }
    gh.daily.forEach(function (d) { var w = 0; if (d.newInf > peak) { peak = d.newInf; peakSd = d.sd; } });
    v.ghost = { infections: gh.n, deaths: deaths, hosp: hosp, peakDay: g.gd(peakSd), attack: IX.round(gh.n / C.N, 2) };
    if (deaths < A.minGhostDeaths && hosp < A.minGhostHosp) { v.fails.push('not dangerous (' + deaths + ' deaths, ' + hosp + ' admissions)'); v.level = 'pathogen'; }
    if (gh.n < 0.08 * C.N) v.fails.push('fizzles (' + gh.n + ' infections)');
    if (g.gd(peakSd) < A.minPeakDay) { v.fails.push('peaks too soon (day ' + g.gd(peakSd) + ')'); }
    if (v.fails.length) return v;
    // observability proxies over the characterisation window: from the alert to ~3 weeks after community spread
    var cum = 0, commSd = -1;
    for (x = 0; x < gh.n; x++) { if (gh.xday[x] >= g.sdOf(0) && ++cum >= 0.03 * C.N) { commSd = gh.xday[x]; break; } }
    if (commSd < 0) commSd = g.sdOf(40);
    var w0 = g.sdOf(0) - 7, w1 = Math.min(commSd + A.charSlack, g.sdOf(70));
    var single = 0, nonHH = 0, adm = 0, dth = 0, venue = {}, food = 0, spill = 0, hhIdx = 0, infW = 0;
    for (x = 0; x < gh.n; x++) {
      var d = gh.xday[x];
      if (gh.xhosp[x] >= w0 && gh.xhosp[x] <= w1) adm++;
      if (gh.xdeath[x] >= w0 && gh.xdeath[x] <= w1 + 21) dth++;
      if (d < w0 || d > w1) continue;
      infW++;
      var set = gh.xset[x], sym = gh.xonset[x] >= 0;
      if (sym && SINGLE_SET[set]) single++;
      var b = gh.xby[x];
      if (b >= 0 && set !== SET.HOME && gh.xonset[b] >= 0 && sym) nonHH++;
      if (set === SET.HOME) hhIdx++;
      if (gh.xmode[x] === 2) food++;
      if (gh.xset[x] === SET.ANIMAL) spill++;
      if (gh.xplace[x] >= 0 && set !== SET.HOME && set !== SET.WORK) { var k2 = gh.xplace[x] + ':' + d; venue[k2] = (venue[k2] || 0) + 1; }
    }
    var bigEvent = 0; Object.keys(venue).forEach(function (k) { if (venue[k] >= 4) bigEvent++; });
    v.proxy = { single: single, nonHH: nonHH, hh: hhIdx, adm: adm, deaths: dth, bigEvents: bigEvent, food: food, spill: spill, infW: infW, window: [g.gd(w0), g.gd(w1)] };
    var miss = [];
    if (single < 10) miss.push('incubation');
    if (nonHH < 12) miss.push('presym');
    if (hhIdx < 10) miss.push('asym');
    if (adm < 8) miss.push('ageRisk');
    if (dth < 3 || infW < 0.01 * C.N) miss.push('ifr');
    var rt = P.humanRoute;
    if ((rt === 'airborne' || rt === 'droplet') && bigEvent < 1) miss.push('route');
    if (rt === 'gut' && food < 3 && bigEvent < 1) miss.push('route');
    v.missing = miss;
    if (IX.KEY_TRAITS.length - miss.length < A.needTraits + 1) v.fails.push('hard to characterise (missing ' + miss.join(',') + ')');
    v.ok = !v.fails.length;
    return v;
  };

  /** Full acceptance: the fast checks plus the ideal epidemiologist playing a copy of the game. */
  IX.acceptFull = function (g, opts) {
    opts = opts || {};
    var A = IX.ACCEPT;
    var v = IX.accept(g);
    if (!v.ghost) return v;
    var copy = IX.load(g.save());
    copy._ghost = g._ghost;
    var rep = IX.solve(copy, { until: opts.until || 75 });
    v.solver = rep;
    var dBy = A.detectBy[g.grade] || 10;
    if (rep.confirmed === null || rep.confirmed > dBy + 2) v.fails.push('not detected by day ' + dBy + ' (confirmed ' + rep.confirmed + ')');
    var ref = rep.community !== null ? rep.community : 40;
    var inTime = IX.KEY_TRAITS.filter(function (k) { return rep.traitDay[k] !== undefined && rep.traitDay[k] <= ref + A.charSlack; });
    v.charTraits = inTime;
    v.charRef = ref;
    if (inTime.length < A.needTraits) v.fails.push('characterised ' + inTime.length + '/' + IX.KEY_TRAITS.length + ' by day ' + (ref + A.charSlack) + ' (missing ' + IX.KEY_TRAITS.filter(function (k) { return inTime.indexOf(k) < 0; }).join(',') + ')');
    v.solverOk = !v.fails.length;
    v.ok = v.solverOk;
    return v;
  };

  // ================================================================ the mentor's advice
  IX.mentorAdvice = function (g, tier) {
    var S = g.S, C = g.C, sim = g.sim, P = g.P;
    var ll = g.lineList();
    var name = function (pid) { return g.name(pid); };
    // --- act 1
    if (!S.recognized) {
      var untested = ll.filter(function (c) { return c.status === 'suspected' && !c.tests.length; });
      var negs = ll.filter(function (c) { return c.tests.some(function (t) { return t.kind === 'panel' && t.result === 'neg'; }); });
      var real = ll.filter(function (c) { return g.infBy(c.pid, g.sdOf(S.day)) >= 0; });
      if (tier === 'nudge') {
        if (S.declared) return { text: 'The lab has your samples. While they work, talk to the patients: what do they share? A ward, a wedding, a choir. That is where the next cases are.' };
        if (negs.length >= 3) return { text: 'You have ' + negs.length + ' people who are negative for everything we can test for. At some point "we are not sure" becomes a decision. Ask the lab to look.' };
        if (untested.length) return { text: 'Until you know what they don\'t have, you can\'t say what they do. Get the ill ones tested against the full panel. Flu in winter explains a lot, but not everything.' };
        return { text: 'Look for more of them. A hospital record review often finds the ones nobody thought to ring you about.' };
      }
      if (tier === 'pointer') {
        var t = untested.filter(function (c) { return S.hospSamples[c.pid] !== undefined; })[0] || untested[0];
        if (negs.length >= 3 && !S.declared) return { text: 'Three clean negatives is enough. Declare it: LAB → Declare a novel agent.', action: { id: 'declare_novel', target: null } };
        if (t) return { segs: ['Test ', g.pref(t.pid), '. There is a sample in the fridge at St Anne\'s' + (S.hospSamples[t.pid] !== undefined ? '' : ' (or will be)') + '.'], text: 'Test ' + name(t.pid) + '.', action: { id: 'test', target: t.pid } };
        return { text: 'Run a hospital record review.', action: { id: 'record_review', target: null } };
      }
      if (tier === 'answer') {
        var r3 = real.slice(0, 3);
        if (!r3.length) return { text: 'Honestly? I don\'t think anything on your list is it yet. Look at the hospital.' };
        var segs = ['These are the same new thing, and it isn\'t flu: '];
        r3.forEach(function (c, i) { if (i) segs.push(', '); segs.push(g.pref(c.pid)); });
        segs.push('. Get them tested against the panel and declare it.');
        return { segs: segs, text: 'Real cases: ' + r3.map(function (c) { return name(c.pid); }).join(', ') };
      }
    }
    // --- acts 2 and 3: the weakest key trait
    var E = IX.estimate(g), T = g.truthCard();
    var weakest = null;
    var order = ['route', 'incubation', 'presym', 'asym', 'R', 'ageRisk', 'ifr'];
    for (var i = 0; i < order.length; i++) { var k = order[i]; var p = S.published[k]; if (!p || g.estimateError(k, p.value) > 0.5) { weakest = k; break; } }
    // act 3 practicalities first
    if (S.act === 3 && tier === 'nudge') {
      if (sim.hospNow > 0.75 * g.bedCap() && !g.ordersOf('surge').length) return { text: 'St Anne\'s is filling. Surge beds take a week to open. The time to order them was yesterday; the next best time is today.' };
      if (!g.ordersOf('isolate').length) return { text: 'Whatever else you do, people who have it need to stay home, and be paid to. Isolation is the cheapest order you will ever sign.' };
    }
    if (!weakest) {
      if (!S.published.source) return { text: 'You know the disease. Do you know where it came from? The earliest cases, the root of the tree, anyone with animals or travel.' };
      return { text: 'Your numbers are sound. Now it is about nerve: act on them, explain them, and don\'t let the council talk you out of the orders that work.' };
    }
    var HOW = {
      route: ['Where are the clusters? A stuffy room full of people who never touched each other means the air. Households only means close contact. A shared meal means the gut. A questionnaire at a cluster will show you.', 'questionnaire'],
      incubation: ['People with one exposure and a known onset: a wedding guest, a friend met once. Trace contacts at events and visits and watch when they fall ill.', 'trace'],
      presym: ['When did people catch it: before or after the person they caught it from felt ill? Trace back five days before onset, not two, or you\'ll never see the early ones.', 'trace'],
      asym: ['Test every member of a household, well or not, and keep testing. The ones who are positive and never feel ill are your hidden cases.', 'household'],
      R: ['How fast is the curve doubling, and how many does each case infect in chains you have traced completely? Either will do if you have enough.', 'trace'],
      ageRisk: ['Who ends up in hospital, compared with who gets infected? A hospital record review gives you admissions by age.', 'record_review'],
      ifr: ['Deaths over confirmed cases overstates it: you miss the mild ones. You need a count of everyone infected. Antibodies.', 'serosurvey']
    };
    var h = HOW[weakest];
    if (tier === 'nudge') return { text: h[0], trait: weakest };
    if (tier === 'pointer') {
      var act = h[1], target = null, params = {};
      var live = ll.filter(function (c) { return (c.status === 'confirmed' || c.status === 'probable') && c.onset !== null; });
      if (act === 'trace') { var c1 = live.filter(function (c) { return !c.traced; }).sort(function (a, b) { return b.onset - a.onset; })[0]; if (c1) { target = c1.pid; params = { daysBefore: 5 }; } }
      if (act === 'household') { var c2 = live.filter(function (c) { if (c.household) return false; var hh = C.hh[c.pid]; return C.hStart[hh + 1] - C.hStart[hh] >= 3; })[0]; if (c2) target = c2.pid; }
      if (act === 'questionnaire') { var cl = g.clusters().filter(function (k) { return k.place && S.quests.every(function (q) { return q.place !== g.placeIdx(k.place.id); }); })[0]; if (cl) target = g.placeIdx(cl.place.id); }
      if (act === 'serosurvey') params = { n: 600 };
      var lab = { trace: 'Trace the contacts of', household: 'Run a household study on', questionnaire: 'Send a questionnaire to everyone at', record_review: 'Run a hospital record review.', serosurvey: 'Run a serosurvey of 600 people.' }[act];
      var segs2 = [lab];
      if (target !== null && act !== 'questionnaire') segs2.push(' ', g.pref(target), act === 'trace' ? ', five days back from onset.' : '.');
      if (target !== null && act === 'questionnaire') segs2.push(' ', g.plref(target), '.');
      return { segs: segs2, text: lab + (target !== null ? ' ' + (act === 'questionnaire' ? C.places[target].name : name(target)) : ''), action: { id: act, target: target, params: params }, trait: weakest };
    }
    // answer: the truth about the weakest trait
    var v = T[weakest], txt;
    switch (weakest) {
      case 'route': txt = 'It spreads by ' + D.ROUTE_LABEL[T.route] + (T.route === 'animal' ? ', and person to person by ' + D.ROUTE_LABEL[T.humanRoute] : '') + '.'; break;
      case 'incubation': txt = 'Incubation is about ' + Math.round(v) + ' days, on average.'; break;
      case 'presym': txt = 'About ' + (Math.round(v / 5) * 5) + '% of transmission happens before symptoms.'; break;
      case 'asym': txt = 'About ' + (Math.round(v / 5) * 5) + '% of infections never cause symptoms.'; break;
      case 'R': txt = 'Left alone, each case infects about ' + IX.round(v, 1) + ' others.'; break;
      case 'ageRisk': txt = 'It hits ' + ({ elderly: 'the elderly', 'young-adult': 'young adults', children: 'children', even: 'all ages about equally' }[v]) + ' hardest.'; break;
      case 'ifr': txt = 'Roughly ' + (v >= 1 ? IX.round(v, 1) : IX.round(v, 2)) + '% of the people it infects die.'; break;
    }
    return { text: txt + ' I\'d stake my bees on it.', trait: weakest };
  };
})();

/* ------------------------------------------------------------------------------------------
 * A competent player (for balancing): the ideal epidemiologist's investigations plus a
 * sensible, proportionate response. IX.playPolicy(g, 'none'|'competent'|'naive', {until})
 * ------------------------------------------------------------------------------------------ */
(function () {
  'use strict';
  IX.playPolicy = function (g, policy, opts) {
    opts = opts || {};
    var S = g.S, until = opts.until || IX.DAY_LIMIT + 1;
    var done = { interview: {}, trace: {}, household: {}, site: {}, quest: {}, seq: {} }, lastSero = -99, lastBrief = -99, lastReview = -99, lastFund = -99;
    var restrictSince = {};
    function act(id, t, p) { var r = g.act(id, t, p); return r.ok; }
    function ord(id, p) { if (g.ordersOf(id).length) return false; var r = g.order(id, p || {}); return r.ok; }
    function lift(id) { g.ordersOf(id).forEach(function (o) { g.revoke(o.id); }); }
    while (!g.over && S.day < until) {
      if (policy === 'none') { g.endDay(); continue; }
      var ll = g.lineList();
      // answer the phone sensibly
      S.msgs.forEach(function (m) {
        if (!m.choices || m.answered) return;
        var pick = m.choices[0].id;
        if (m.meta && m.meta.ask === 'lift') pick = g.sim.hospNow < 0.5 * g.bedCap() ? 'lift' : 'hold';
        if (m.meta && m.meta.ask === 'schools') pick = 'reopen';
        if (m.meta && m.meta.ask === 'mayor') pick = { firstDeath: 'straight', lockdown: 'data', schools: 'depends', press: 'sorry', beds: 'surge' }[m.meta.topic] || pick;
        g.answer(m.id, pick);
      });
      if (!S.recognized) {
        ll.forEach(function (c) { if (c.status === 'suspected' && !c.tests.length) act('test', c.pid); });
        ll.forEach(function (c) { if (c.status !== 'discarded' && !done.interview[c.pid] && act('interview', c.pid)) done.interview[c.pid] = 1; });
        if (!S.declared) act('declare_novel');
        if (S.day - lastReview >= 4 && act('record_review')) lastReview = S.day;
      } else {
        var E = IX.estimate(g);
        var live = ll.filter(function (c) { return c.status === 'confirmed' || c.status === 'probable'; });
        live.sort(function (a, b) { return (b.onset === null ? -99 : b.onset) - (a.onset === null ? -99 : a.onset); });
        // the basics, straight away
        ord('isolate'); ord('quarantine'); ord('hospital_ipc'); ord('care_homes'); ord('wastewater');
        if (policy === 'competent') {
          // investigations
          var hh = 0;
          live.forEach(function (c) { if (hh < 1 && !done.household[c.pid] && Object.keys(done.household).length < 10 && c.status === 'confirmed' && g.canAct('household', c.pid) === null && act('household', c.pid)) { done.household[c.pid] = 1; hh++; } });
          live.forEach(function (c) { if (!done.interview[c.pid] && act('interview', c.pid)) done.interview[c.pid] = 1; });
          live.forEach(function (c) { if (!done.trace[c.pid] && c.onset !== null && act('trace', c.pid, { daysBefore: 3 })) done.trace[c.pid] = 1; });
          g.clusters().slice(0, 6).forEach(function (k) {
            if (!k.place) return; var pi = g.placeIdx(k.place.id);
            if (!done.site[pi] && act('site_visit', pi)) done.site[pi] = 1;
            var ek = g.C.places[pi].kind;
            if (k.size >= 3 && !done.quest[pi] && ['pub', 'restaurant', 'choir', 'church', 'mosque', 'temple', 'gurdwara', 'hotel', 'community_hall', 'gym'].indexOf(ek) >= 0 && act('questionnaire', pi)) done.quest[pi] = 1;
            // shut venues that keep producing cases
            if (k.size >= 5 && ['pub', 'restaurant', 'choir', 'gym', 'meat_plant', 'hotel', 'community_hall'].indexOf(ek) >= 0 && k.lastOnset !== null && S.day - k.lastOnset < 10) ord2('close_place', pi);
          });
          live.slice(0, 2).forEach(function (c) { if (!done.seq[c.pid] && g.canAct('sequence', c.pid) === null && act('sequence', c.pid)) done.seq[c.pid] = 1; });
          if (S.day - lastSero >= 21 && live.length >= 30 && act('serosurvey', null, { n: 500 })) lastSero = S.day;
          if (S.day - lastReview >= 10 && act('record_review')) lastReview = S.day;
          if (S.seqPublished === undefined && g.canAct('publish_sequence') === null) act('publish_sequence');
          // publish what we know
          var pub = {};
          IX.KEY_TRAITS.concat(['caseDef']).forEach(function (k) {
            var v = E[k]; if (v === undefined) return;
            var p = S.published[k];
            if (!p || (typeof v === 'number' && Math.abs(v - p.value) > 0.25 * Math.max(1, Math.abs(p.value)) && S.day - p.day >= 7) || (typeof v === 'string' && v !== p.value && S.day - p.day >= 7)) pub[k] = v;
          });
          if (Object.keys(pub).length) g.publish(pub);
          // proportionate orders by route and growth
          var route = (S.published.route && S.published.route.value) || E.route;
          if (route === 'airborne' || route === 'droplet') { ord('masks'); if (route === 'airborne') ord('ventilation'); }
          if (route === 'contact' || route === 'gut') ord('hygiene');
          if (route === 'gut') ord('food_safety');
          if (route === 'animal' && S.animalFound !== undefined) ord2('close_animal', S.animalFound);
          g.C.places.forEach(function (p) { if ((p.kind === 'market' || p.kind === 'farm' || p.kind === 'meat_plant') && !done.site['a' + p.i] && live.some(function (c) { return (c.exposures || []).some(function (e) { return e.kind === 'animal' && e.place && e.place.id === p.id; }); })) { if (act('animal_sampling', p.i)) done.site['a' + p.i] = 1; } });
          if (live.length > 20) ord('mass_testing');
          if ((E.ageRisk === 'elderly' || (S.published.ageRisk && S.published.ageRisk.value === 'elderly')) && live.length > 20) ord('shielding', { group: 'both' });
          var beds = g.sim.hospNow, cap = g.bedCap();
          if (beds > 0.6 * cap) ord('surge');
          var wk = g.weekStats();
          var rising = wk.cases > 1.15 * wk.casesPrev && wk.cases >= 8;
          var basics = g.ordersOf('isolate')[0], since = basics ? S.day - basics.since : 0;
          var Rest = (S.published.R && S.published.R.value) || E.R || 2;
          // escalate in steps while cases keep rising despite isolation and tracing
          if (rising && (since >= 7 || Rest > 2.2)) ord('gatherings', { max: 30 });
          if (rising && (since >= 14 || Rest > 2.5)) { ord('close_hospitality'); ord('wfh'); }
          if (rising && ((since >= 21 && beds > 0.4 * cap) || Rest > 3)) ord('close_schools');
          if (beds > 0.7 * cap) ord('gatherings', { max: 30 });
          if (beds > 1.05 * cap && rising) ord('lockdown');
          // stand down when it is falling and the hospital is fine
          if (!rising && wk.cases < 0.8 * wk.casesPrev && beds < 0.5 * cap) {
            ['lockdown'].forEach(function (id) { if (g.ordersOf(id).length && S.day - g.ordersOf(id)[0].since >= 14) lift(id); });
            if (!g.ordersOf('lockdown').length) ['close_hospitality', 'wfh'].forEach(function (id) { if (g.ordersOf(id).length && S.day - g.ordersOf(id)[0].since >= 21) lift(id); });
            if (wk.cases < 5) ['gatherings', 'close_schools'].forEach(function (id) { if (g.ordersOf(id).length && S.day - g.ordersOf(id)[0].since >= 21) lift(id); });
          }
          // communication and money
          if (S.day - lastBrief >= 7 && act('briefing')) lastBrief = S.day;
          S.rumours.forEach(function (r) { if (r.reported && r.countered === undefined) act('counter_rumour', null, { rumour: r.id }); });
          if (S.day - lastFund >= 7 && S.funding < 250) { act('request_funding', null, { money: 400, staff: 4 }); lastFund = S.day; }
          if (S.funding > 150 && g.resources().staffHours.tracers < 3 && S.staff.tracers < 14) act('hire', null, { kind: 'tracers', n: 2 });
          if (!S.trial && E.n && live.filter(function (c) { return c.admitted !== undefined; }).length >= 15) act('trial', null, { n: 80 });
          if (S.trial && S.trial.result && S.trial.result.hi < 1) ord('treatment');
          if (S.vaccine && S.vaccine.status === 'rollout') ord('vaccinate', {});
        } else if (policy === 'naive') {
          live.slice(0, 6).forEach(function (c) { if (!done.interview[c.pid] && act('interview', c.pid)) done.interview[c.pid] = 1; });
          if (live.length > 40) ord('lockdown');
          if (S.vaccine && S.vaccine.status === 'rollout') ord('vaccinate', {});
        }
      }
      g.endDay();
    }
    function ord2(id, target) { if (g.ordersActive().some(function (o) { return o.type === id && o.target === target; })) return false; return g.order(id, { target: target }).ok; }
    return g;
  };
})();
