#!/usr/bin/env node
// Estimator accuracy: plays the headless solver on many games and compares its estimates with the truth
// at community spread + K days. Usage: node tests/bias.js [from..to] [--k=14] [--grade=x]
var IX = require('./load.js')();
var args = process.argv.slice(2);
var range = (args.filter(function (a) { return a[0] !== '-'; })[0] || '1..20').split('..');
function opt(k, d) { var a = args.filter(function (x) { return x.indexOf('--' + k + '=') === 0; })[0]; return a ? a.split('=')[1] : d; }
var K = +opt('k', 14), grade = opt('grade', 'consultant');
var acc = {};
for (var s = +range[0]; s <= +range[1]; s++) {
  var g = IX.newGame(String(s), { grade: grade });
  var rep = IX.solve(g, { until: 75, history: true });
  var day = (rep.community !== null ? rep.community : 40) + K;
  var h = rep.hist && (rep.hist[day] || rep.hist[Object.keys(rep.hist).map(Number).filter(function (d) { return d <= day; }).pop()]);
  if (!h) continue;
  var row = [s, g.P.archetype.padEnd(12), g.P.route.padEnd(8)];
  IX.KEY_TRAITS.forEach(function (k) {
    var e = h.E[k], t = h.T[k];
    var a = acc[k] = acc[k] || { n: 0, got: 0, ok: 0, err: [], bias: [] };
    a.n++;
    if (e !== undefined) { a.got++; var er = g.estimateError(k, e); if (er <= 0.5) a.ok++; if (typeof e === 'number') { a.bias.push(e - t); a.err.push(Math.abs(e - t)); } }
    row.push(k + ' ' + (e === undefined ? '-' : e) + '/' + t);
  });
  console.log(row.join('  ') + '  ev ' + JSON.stringify(h.E.routeEv) + ' si ' + h.E.serial + ' presymDirect ' + h.E.presymDirect + ' nQ ' + g.S.quests.length + ' qpool ' + JSON.stringify(h.E.qPool));
}
console.log('\ntrait        estimated  within tol   mean bias   mean |err|');
Object.keys(acc).forEach(function (k) { var a = acc[k]; console.log(k.padEnd(12), (a.got + '/' + a.n).padEnd(10), (a.ok + '/' + a.n).padEnd(12), (a.bias.length ? IX.mean(a.bias).toFixed(2) : '-').padEnd(11), a.err.length ? IX.mean(a.err).toFixed(2) : '-'); });
