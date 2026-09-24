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
  IX.estimate = function (g) {
    var S = g.S, ll = g.lineList(), byPid = {};
    ll.forEach(function (c) { byPid[c.pid] = c; });
    var cons = g.contacts();
    var E = { n: {} };
    var live = ll.filter(function (c) { return c.status === 'confirmed' || c.status === 'probable'; });

    // --- incubation: ill contacts with a single-day exposure (events, visits, venues)
    var inc = [];
    cons.forEach(function (c) {
      if (c.onset === undefined || !SINGLE_DAY[c.setting]) return;
      var cs = byPid[c.pid]; if (!cs || cs.status === 'discarded') return;
      var d = c.onset - c.exposure;
      if (d >= 1 && d <= 21) inc.push(d);
    });
    // interviewed cases whose only link to a known earlier case is one event day
    ll.forEach(function (c) {
      if (!c.exposures || c.onset === null || c.status === 'discarded') return;
      if ((c.illContacts || []).some(function (i) { return i.relation === 'household'; })) return;
      var evDays = [];
      c.exposures.forEach(function (e) { if (e.kind === 'place' && e.setting === 'celebration' && e.days.length === 1) evDays.push(e.days[0]); });
      if (evDays.length === 1) { var d = c.onset - evDays[0]; if (d >= 1 && d <= 21) inc.push(d); }
    });
    E.n.incubation = inc.length;
    if (inc.length >= 4) E.incubation = IX.round(IX.mean(inc), 1);

    // --- presymptomatic transmission: when were ill contacts exposed, relative to their source's onset?
    var pre = 0, post = 0, si = [];
    cons.forEach(function (c) {
      if (c.onset === undefined || c.setting === 'household') return;
      var cs = byPid[c.pid]; if (!cs || cs.status === 'discarded') return;
      c.of.forEach(function (src) {
        var s = byPid[src]; if (!s || s.onset === null || s.status === 'discarded') return;
        if (c.onset < s.onset) return;   // probably not infected by them
        if (c.exposure < s.onset) pre++; else post++;
        si.push(c.onset - s.onset);
      });
    });
    ll.forEach(function (c) {
      if (c.infectorGuess === undefined || c.onset === null) return;
      var s = byPid[c.infectorGuess]; if (s && s.onset !== null && c.onset >= s.onset) si.push(c.onset - s.onset);
    });
    E.n.presym = pre + post;
    if (pre + post >= 6) E.presym = Math.round(100 * pre / (pre + post));
    E.n.si = si.length;
    if (si.length >= 5) E.serial = IX.round(IX.mean(si), 1);

    // --- hidden (never symptomatic) infections: household studies
    var hi = 0, ha = 0;
    S.hhStudies.forEach(function (st) { if (st.result) { hi += st.result.infected; ha += st.result.asym; } });
    E.n.asym = hi;
    if (hi >= 8) E.asym = Math.round(100 * ha / hi);

    // --- R: growth of admissions+cases, and the serial interval
    var ec = g.epiCurve();
    var n = ec.byOnset.length, lag = 7;
    var series = [];
    for (var i = 0; i < n; i++) series.push(ec.byOnset[i] + 0);
    var r = growth(series, n - lag - 21, n - lag);
    var Tg = E.serial || E.incubation || 5;
    E.growth = r;
    if (r !== null && live.length >= 25) E.R = IX.round(Math.max(0.5, Math.exp(r * Tg)), 2);
    // offspring counts in fully traced chains (early, before restrictions)
    var off = [], asymF = E.asym !== undefined ? E.asym / 100 : 0.2;
    ll.forEach(function (c) {
      if (!c.traced || c.onset === null) return;
      var kids = cons.filter(function (q) { return q.of.indexOf(c.pid) >= 0 && q.onset !== undefined && q.onset >= c.onset && q.status === 'ill'; }).length;
      if (S.day - c.onset >= 20) off.push(kids / Math.max(0.3, 1 - asymF));
    });
    E.n.traceR = off.length;
    if (off.length >= 12) E.Rtrace = IX.round(IX.mean(off) * 1.25, 2);
    if (E.R === undefined && E.Rtrace !== undefined) E.R = E.Rtrace;

    // --- severity: serosurvey (infections) against deaths
    var sero = S.seroResults.filter(function (q) { return q.pos >= 5; });
    var deaths = 0; ec.deaths.forEach(function (d2) { deaths += d2; });
    if (sero.length) {
      var q = sero[sero.length - 1];
      var infections = q.pos / q.n / 0.9 * g.C.N;
      // deaths lag infections by ~3-4 weeks: count deaths reported up to 14 days after the survey
      var dUpTo = 0; for (var k = 0; k < ec.deaths.length && ec.from + k <= q.day + 21; k++) dUpTo += ec.deaths[k];
      if (infections > 0 && S.day >= q.day + 10) E.ifr = IX.round(100 * dUpTo / infections, 2);
      var adm = 0; for (k = 0; k < ec.admissions.length && ec.from + k <= q.day + 10; k++) adm += ec.admissions[k];
      if (infections > 0) E.ihr = IX.round(100 * adm / infections, 1);
    }
    E.n.ifr = sero.length;
    E.deaths = deaths;

    // --- who it hits: admissions and deaths per case, by age
    var ba = ec.byAge, rate = [];
    for (var b = 0; b < 7; b++) rate.push((ba.admitted[b] + 2 * ba.died[b] + 0.5) / (ba.cases[b] + 3));
    var totAdm = ba.admitted.reduce(function (s, v) { return s + v; }, 0) + ba.died.reduce(function (s, v) { return s + v; }, 0);
    S.reviews.forEach(function () { });
    E.n.ageRisk = totAdm;
    if (totAdm >= 8) {
      var kids = (rate[0] + rate[1]) / 2, young = rate[2], mid = (rate[3] + rate[4]) / 2, old = (rate[5] + rate[6]) / 2;
      if (old > 3 * mid && old > 3 * young) E.ageRisk = 'elderly';
      else if (kids > 1.5 * mid && kids > young) E.ageRisk = 'children';
      else if (young > 1.4 * mid && young > kids) E.ageRisk = 'young-adult';
      else E.ageRisk = 'even';
    }

    // --- route
    E.route = routeGuess(g, ll, E);

    // --- case definition from confirmed cases' symptoms
    var symN = {}, nSym = 0;
    ll.forEach(function (c) { if (c.status === 'confirmed' && c.symptoms && c.symptoms.length) { nSym++; c.symptoms.forEach(function (s) { symN[s] = (symN[s] || 0) + 1; }); } });
    if (nSym >= 6) E.caseDef = Object.keys(symN).filter(function (s) { return symN[s] / nSym >= 0.35; }).sort(function (a, b) { return symN[b] - symN[a]; }).slice(0, 5);

    // --- source & first case: earliest known onsets, animal exposure, travel
    var early = ll.filter(function (c) { return c.status !== 'discarded' && c.onset !== null; }).sort(function (a, b) { return a.onset - b.onset; });
    if (early.length) {
      var first = early[0];
      E.originCase = first.pid;
      var ex = first.exposures || [];
      if (ex.some(function (e) { return e.kind === 'travel'; })) E.source = 'traveller';
      else if (ex.some(function (e) { return e.kind === 'animal'; })) { var pl = ex.filter(function (e) { return e.kind === 'animal'; })[0].place; E.source = pl && g.C.places[g.placeIdx(pl.id)].kind === 'market' ? 'market' : 'farm'; }
    }
    if (S.animalFound !== undefined) E.source = g.C.places[S.animalFound].kind === 'market' ? 'market' : 'farm';
    if (S.trial && S.trial.result) { var T = S.trial.result; E.treatment = T.hi < 1 ? (T.rr < 0.6 ? 'good' : 'partial') : 'none'; }
    return E;
  };

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
    // symptoms: faecal-oral bugs look like it
    var nC = 0, gutS = 0, bleed = 0;
    ll.forEach(function (c) { if (c.status === 'confirmed' && c.symptoms) { nC++; if (c.symptoms.indexOf('diarrhoea') >= 0 || c.symptoms.indexOf('vomiting') >= 0) gutS++; if (c.symptoms.indexOf('bleeding_gums') >= 0 || c.symptoms.indexOf('nosebleeds') >= 0) bleed++; } });
    if (nC >= 5 && gutS / nC > 0.6) ev.gut += 2;
    if (nC >= 5 && bleed / nC > 0.2) ev.contact += 1;
    // questionnaires
    S.quests.forEach(function (q) {
      var cats = q.cats, close = cats['Close contact (<2 m, 15 min+) with someone who fell ill'], room = cats['Same room, not close to anyone ill'];
      var ate = cats['Ate food prepared on site'], nate = cats['Did not eat'];
      if (ate && nate && ate.n >= 5 && nate.n >= 3) { var ra = ate.ill / ate.n, rn = (nate.ill + 0.5) / (nate.n + 1); if (ra > 2.5 * rn && ra > 0.15) ev.gut += 2; }
      if (close && room && close.n >= 3 && room.n >= 8 && q.ill >= 3) {
        var rc = close.ill / close.n, rr = room.ill / room.n;
        if (rr >= 0.08 && rr > 0.25 * rc) ev.airborne += 2;
        else if (rc > 0.2 && rr < 0.05) { ev.droplet += 1; ev.contact += 0.6; }
      }
    });
    // cluster settings
    var cl = g.clusters(), venue = 0, hh = 0, care = 0;
    cl.forEach(function (c) { if (c.kind === 'household') hh++; else if (c.kind === 'care_home' || c.kind === 'hospital') care += c.size; else venue += c.size >= 3 ? 1 : 0; });
    if (venue === 0 && hh + care >= 4 && E.presym !== undefined && E.presym < 10) ev.contact += 1.5;
    if (E.presym !== undefined && E.presym < 8) ev.contact += 0.7;
    if (E.presym !== undefined && E.presym > 20) { ev.airborne += 0.4; ev.droplet += 0.4; }
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
          if (k.size >= 3 && !done.quest[pi] && act('questionnaire', pi)) done.quest[pi] = 1;
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
      }
    }
    rep.day = S.day;
    return rep;
  };

  // ================================================================ acceptance
  IX.ACCEPT = { detectBy: { probationer: 10, consultant: 10, director: 12 }, charSlack: 21, needTraits: 5, minGhostDeaths: 6, minGhostHosp: 20, minPeakDay: 14, maxAlertInf: 0.06 };
  /** is this game fair? Runs the ghost city and (on a copy) the ideal epidemiologist. */
  IX.accept = function (g, opts) {
    opts = opts || {};
    var A = IX.ACCEPT, v = { ok: false, fails: [] };
    var sim = g.sim, C = g.C;
    // detectable early: the alert comes before it is everywhere
    var infAtAlert = sim.n;
    v.infAtAlert = infAtAlert;
    if (infAtAlert > A.maxAlertInf * C.N) v.fails.push('alert late (' + infAtAlert + ' infected)');
    // dangerous but not hopeless: the ghost city
    var gh = g.ghost(g.sdOf(IX.DAY_LIMIT)).sim;
    var deaths = 0, hosp = 0, peak = 0, peakSd = 0;
    for (var x = 0; x < gh.n; x++) { if (gh.xdeath[x] >= 0) deaths++; if (gh.xhosp[x] >= 0) hosp++; }
    gh.daily.forEach(function (d) { if (d.newInf > peak) { peak = d.newInf; peakSd = d.sd; } });
    v.ghost = { infections: gh.n, deaths: deaths, hosp: hosp, peakDay: g.gd(peakSd), attack: IX.round(gh.n / C.N, 2) };
    if (deaths < A.minGhostDeaths && hosp < A.minGhostHosp) v.fails.push('not dangerous (' + deaths + ' deaths, ' + hosp + ' admissions)');
    if (gh.n < 0.08 * C.N) v.fails.push('fizzles (' + gh.n + ' infections)');
    if (g.gd(peakSd) < A.minPeakDay) v.fails.push('peaks too soon (day ' + g.gd(peakSd) + ')');
    if (v.fails.length && !opts.full) return v;
    // characterisable: the ideal epidemiologist on a copy of the game
    if (opts.skipSolver) { v.ok = !v.fails.length; return v; }
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
    v.ok = !v.fails.length;
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
