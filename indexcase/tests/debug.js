#!/usr/bin/env node
// Plays the headless solver on one game and prints its estimates against the truth every few days.
// Usage: node tests/debug.js <seed> [--grade=x] [--until=70]
var IX = require('./load.js')();
var args = process.argv.slice(2);
var seed = args.filter(function (a) { return a[0] !== '-'; })[0] || '1';
var gA = args.filter(function (a) { return /^--grade=/.test(a); })[0], uA = args.filter(function (a) { return /^--until=/.test(a); })[0];
var g = IX.newGame(seed, { grade: gA ? gA.split('=')[1] : 'consultant' });
var until = uA ? +uA.split('=')[1] : 70;
console.log(g.P.archetype, g.P.route, 'truth', JSON.stringify(g.truthCard(), ['route', 'incubation', 'presym', 'asym', 'R', 'ifr', 'ihr', 'ageRisk', 'source']));
var solve = IX.solve, est = IX.estimate;
IX.estimate = function (gg) {
  var E = est(gg);
  if (gg.S.day % 5 === 0 && gg._lastPrint !== gg.S.day) {
    gg._lastPrint = gg.S.day;
    var T = gg.truthCard();
    console.log('day', gg.S.day, 'act', gg.S.act, 'cases', gg.S.caseOrder.length, IX.KEY_TRAITS.map(function (k) { return k + '=' + JSON.stringify(E[k]) + '(' + (E.n[k] !== undefined ? 'n' + E.n[k] : '') + ')/' + JSON.stringify(T[k]); }).join('  '), 'serial', E.serial, 'Rtrace', E.Rtrace, 'growth', E.growth && E.growth.toFixed(3));
  }
  return E;
};
var rep = solve(g, { until: until });
console.log('confirmed', rep.confirmed, 'community', rep.community, 'traitDay', JSON.stringify(rep.traitDay));
