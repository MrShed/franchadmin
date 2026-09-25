/* INDEX CASE engine — 03-pathogen.js
 * The pathogen generator. Every trait is drawn together with the others so the
 * result is biologically plausible: a latent "virulence" draw pushes the death
 * rate up and silent/hidden spread down; the route sets the ranges for the rest.
 * Transmissibility (beta) is tuned later against the city's contact structure
 * (IX.calibrate in 05-sim) so that the realised R matches the drawn target.
 *
 *   IX.makePathogen(seed, {grade, route?, fixed?}) -> P
 */
var IX = (typeof IX !== 'undefined' && IX) ? IX : {};

(function () {
  'use strict';
  var D = IX.DATA;
  var clamp = IX.clamp;

  var ROUTE_W = {
    probationer: [['airborne', 0.5], ['droplet', 0.5]],
    consultant: [['airborne', 0.34], ['droplet', 0.31], ['contact', 0.11], ['gut', 0.12], ['animal', 0.12]],
    director: [['airborne', 0.28], ['droplet', 0.27], ['contact', 0.14], ['gut', 0.15], ['animal', 0.16]]
  };

  function family(route) { return route === 'gut' ? 'gut' : route === 'contact' ? 'contact' : 'resp'; }

  IX.makePathogen = function (seed, opts) {
    opts = opts || {};
    var grade = opts.grade || 'consultant';
    var R = IX.rng(String(seed) + '/pathogen');
    var P = { seed: String(seed) };
    var fx = opts.fixed || {};

    P.route = fx.route || opts.route || R.weighted(ROUTE_W[grade] || ROUTE_W.consultant);
    // animal sources: spillover continues from a site; people then pass it on by a human route
    P.humanRoute = P.route === 'animal' ? (fx.humanRoute || R.weighted([['droplet', 0.5], ['contact', 0.3], ['airborne', 0.2]])) : P.route;
    P.family = family(P.humanRoute);
    var v = clamp(R.normal(0, 1), -2.2, 2.4);   // latent virulence
    P.virulence = v;

    // incubation (days, gamma)
    var hr = P.humanRoute;
    var inc = hr === 'airborne' ? R.logu(2.5, 8.5) : hr === 'droplet' ? R.logu(2.5, 12.5) : hr === 'contact' ? R.range(5, 13) : R.range(2, 5.5);
    if (P.route === 'animal') inc = R.range(3, 12);
    P.incMean = IX.round(fx.incMean || inc, 1);
    P.incSd = IX.round(P.incMean * R.range(0.25, 0.42), 2);

    // death rate (log-scale draw, pushed by virulence)
    var lo = { airborne: 0.001, droplet: 0.002, contact: 0.02, gut: 0.001 }[hr], hi = { airborne: 0.03, droplet: 0.05, contact: 0.12, gut: 0.015 }[hr];
    if (P.route === 'animal') { lo = 0.01; hi = 0.12; }
    var ifr = R.logu(lo, hi) * Math.exp(0.45 * v);
    if (grade === 'probationer') ifr = clamp(ifr, 0.003, 0.04);
    P.ifr = IX.round(clamp(fx.ifr || ifr, 0.001, 0.12), 4);

    // silent spread before symptoms (share of transmission from symptomatic cases before onset)
    var ps = hr === 'airborne' ? R.range(0.15, 0.6) : hr === 'droplet' ? R.range(0.05, 0.55) : hr === 'contact' ? R.range(0, 0.07) : R.range(0, 0.25);
    if (P.route === 'animal') ps *= 0.6;
    ps -= 0.07 * v;
    // hidden cases (never symptomatic)
    var as = hr === 'airborne' ? R.range(0.1, 0.6) : hr === 'droplet' ? R.range(0.05, 0.5) : hr === 'contact' ? R.range(0, 0.15) : R.range(0.2, 0.7);
    if (P.route === 'animal') as = R.range(0.05, 0.35);
    as -= 0.08 * v;
    // plausibility: a disease that kills many does not also spread silently
    if (P.ifr > 0.05) { ps = Math.min(ps, 0.12); as = Math.min(as, 0.15); }
    else if (P.ifr > 0.02) { ps = Math.min(ps, 0.35); as = Math.min(as, 0.4); }
    P.presym = IX.round(clamp(fx.presym !== undefined ? fx.presym : ps, 0, 0.6), 2);
    P.asym = IX.round(clamp(fx.asym !== undefined ? fx.asym : as, 0, 0.7), 2);

    // spread rate
    var r0 = hr === 'airborne' ? 1.8 + 3.1 * Math.pow(R.next(), 1.3) : hr === 'droplet' ? R.range(1.3, 3.4) : hr === 'contact' ? R.range(1.25, 2.1) : R.range(1.35, 2.6);
    if (P.route === 'animal') r0 = R.range(1.25, 2.0);
    r0 *= Math.exp(-0.06 * v);
    if (grade === 'probationer') r0 = clamp(r0 * 0.8, 1.3, 2.3);
    if (grade === 'director') r0 *= 1.12;   // wider and nastier: the director's diseases spread a little faster
    P.R = IX.round(clamp(fx.R || r0, 1.2, 5), 2);

    // who it hits
    var shapeW = P.family === 'gut' ? [['children', 0.35], ['elderly', 0.35], ['even', 0.2], ['young-adult', 0.1]]
      : P.family === 'contact' ? [['even', 0.45], ['elderly', 0.35], ['young-adult', 0.12], ['children', 0.08]]
        : [['elderly', 0.55], ['even', 0.15], ['young-adult', 0.15], ['children', 0.15]];
    P.ageRisk = fx.ageRisk || R.weighted(shapeW);
    P.sevScale = clamp(Math.pow(P.ifr / 0.01, 0.35), 0.6, 2.4);   // scales fatality among the hospitalised

    // children's susceptibility relative to adults (many respiratory viruses spare them; gut bugs do not)
    P.childSusc = IX.round(P.family === 'gut' ? R.range(0.9, 1.3) : P.ageRisk === 'children' ? R.range(0.8, 1.2) : R.range(0.45, 1.05), 2);
    // clinical course
    P.hospDelay = IX.round(P.family === 'gut' ? R.range(2, 4) : P.family === 'contact' ? R.range(3.5, 6) : R.range(4.5, 8), 1);   // onset -> admission
    P.deathDelay = IX.round(R.range(5, 12), 1);    // admission -> death
    P.los = IX.round(R.range(6, 12), 1);           // survivors' stay
    P.icuShare = IX.round(R.range(0.15, 0.3), 2);
    P.symDays = P.family === 'contact' ? R.int(7, 10) : P.family === 'gut' ? R.int(5, 9) : R.int(5, 8);
    P.asymRel = IX.round(R.range(0.35, 0.7), 2);

    // symptoms
    var prof = D.SYM_PROFILE[P.family];
    var nSym = R.int(4, 7);
    var syms = prof.slice(0, 3).concat(R.sample(prof.slice(3), nSym - 3));
    P.symptoms = syms.map(function (s) { return { id: s[0], p: IX.round(R.range(s[1][0], s[1][1]), 2) }; });
    var tellP = grade === 'probationer' ? 0.7 : grade === 'director' ? 0.3 : 0.45;
    P.tell = null;
    if (fx.tell !== undefined ? fx.tell : R.chance(tellP)) {
      var tid = fx.tell || R.weighted(D.TELLS[P.family]);
      var ex = P.symptoms.filter(function (s) { return s.id === tid; })[0];
      if (!ex) { ex = { id: tid, p: 0 }; P.symptoms.push(ex); }
      ex.p = IX.round(R.range(0.35, 0.75), 2);
      P.tell = tid;
    }
    P.symptoms.sort(function (a, b) { return b.p - a.p; });

    // testability: PCR detects from detFrom days (relative to onset) to detTo
    P.detFrom = P.presym > 0.3 ? -2 : P.presym > 0.1 ? -1 : 0;
    P.detTo = P.family === 'gut' ? R.int(10, 14) : P.family === 'contact' ? R.int(9, 14) : R.int(7, 11);
    P.sens = IX.round(R.range(0.85, 0.96), 2);
    P.shed = P.family === 'gut' ? R.range(15, 30) : P.family === 'contact' ? R.range(1.5, 3) : R.range(0.8, 1.5);

    // genome
    P.mutRate = IX.round(R.logu(0.06, 1.6), 3);
    P.mutLabel = P.mutRate < 0.2 ? 'slow' : P.mutRate < 0.6 ? 'moderate' : 'fast';
    P.genomeLen = R.int(9000, 31000);

    // variant (0-1 per game, from week 4)
    var varP = grade === 'probationer' ? 0.25 : grade === 'director' ? 0.6 : 0.45;
    P.variant = null;
    if (fx.variant !== undefined ? fx.variant : R.chance(varP)) {
      P.variant = {
        day: R.int(28, 63), beta: IX.round(R.range(1.25, 1.65), 2),
        ifr: IX.round(R.chance(0.4) ? R.range(1.2, 1.8) : R.range(0.75, 1.1), 2),
        escape: IX.round(R.range(0, 0.5), 2)
      };
    }

    // source
    if (P.route === 'animal') P.source = fx.source || R.weighted([['market', 0.45], ['farm', 0.55]]);
    else P.source = fx.source || R.weighted([['traveller', 0.42], ['hospital', 0.14], ['lab', 0.12], ['market', 0.14], ['farm', 0.18]]);
    P.spillRate = P.route === 'animal' ? IX.round(R.range(0.08, 0.22), 3) : 0;

    // treatment (existing drug, found by a trial)
    P.treatment = fx.treatment || R.weighted([['none', 0.45], ['partial', 0.35], ['good', 0.2]]);
    P.treatEffect = P.treatment === 'none' ? 0 : P.treatment === 'partial' ? IX.round(R.range(0.2, 0.35), 2) : IX.round(R.range(0.45, 0.6), 2);

    // presymptomatic infectious days
    var pre = P.presym < 0.03 ? 0 : P.presym < 0.15 ? 1 : P.presym < 0.35 ? 2 : 3;
    P.preDays = Math.min(pre, Math.max(0, Math.floor(P.incMean) - 1));
    if (P.presym > 0.02 && P.preDays === 0) P.preDays = 1;
    // infectiousness over the symptomatic days
    P.symW = [];
    for (var k = 0; k < P.symDays; k++) {
      P.symW.push(P.family === 'contact' ? IX.round(0.6 + 0.18 * k, 3) : IX.round(Math.pow(0.8, k), 3));
    }
    P.preW = 1;       // calibrated in IX.calibrate to hit the presymptomatic share
    P.beta = 0.05;    // calibrated in IX.calibrate to hit R

    P.archetype = archetype(P);
    return P;
  };

  function archetype(P) {
    if (P.route === 'animal') return 'Spillover';
    if (P.ifr >= 0.04) return 'Burner';
    if (P.route === 'gut') return 'Stomach bug';
    if (P.route === 'airborne' && P.R >= 3) return 'Choir';
    if (P.incMean >= 8 && P.presym >= 0.25) return 'Slow fuse';
    if (P.asym >= 0.45 || P.presym >= 0.45) return 'Stealth';
    if (P.route === 'contact') return 'Close-contact';
    return 'Flu-like';
  }
  IX.archetypeOf = archetype;

  /** plain card of the true traits (debrief, tests) */
  IX.pathogenCard = function (P) {
    return {
      route: P.route, humanRoute: P.humanRoute, incubation: P.incMean, presym: IX.round(100 * (P.presymRealised !== undefined ? P.presymRealised : P.presym), 0),
      asym: IX.round(100 * P.asym, 0), R: P.Rrealised || P.R, ifr: IX.round(100 * P.ifr, 2), ihr: IX.round(100 * (P.ihr || 0), 1), ageRisk: P.ageRisk,
      symptoms: P.symptoms.map(function (s) { return { id: s.id, label: D.SYM[s.id].label, p: s.p }; }), tell: P.tell,
      detFrom: P.detFrom, detTo: P.detTo, mutRate: P.mutRate, mutLabel: P.mutLabel, variant: P.variant, source: P.source,
      treatment: P.treatment, treatEffect: P.treatEffect, archetype: P.archetype
    };
  };
})();
