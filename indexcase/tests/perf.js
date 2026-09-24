#!/usr/bin/env node
// Timing: city, calibration, generation (newGame), steady-state endDay with a busy player, ghost rerun, save/load.
// Usage: node tests/perf.js [seed] [days]
var IX = require('./load.js')();
var seed = process.argv[2] || '4471', days = +(process.argv[3] || 120);
function t(label, fn) { var t0 = process.hrtime.bigint(); var r = fn(); var ms = Number(process.hrtime.bigint() - t0) / 1e6; console.log(label.padEnd(34), ms.toFixed(0) + ' ms'); return r; }
var C = t('city', function () { return IX.makeCity(seed + '-perf'); });
var P = IX.makePathogen(seed + '-perf', {});
t('calibrate', function () { return IX.calibrate(P, C, 'x'); });
var g = t('newGame (incl. retries, acceptance)', function () { return IX.newGame(seed, { grade: 'consultant' }); });
console.log('  attempt', g.attempt, g.P.archetype, g.P.route, 'R', g.P.R, 'verify', JSON.stringify(g._verify && g._verify.fails));
// a busy player: tests, interviews, traces, orders
var times = [], worst = 0, worstDay = 0;
for (var d = 0; d < days && !g.over; d++) {
  var ll = g.lineList();
  ll.slice(-30).forEach(function (c) { if (!c.tests.length) g.act('test', c.pid); if (!c.interviewed) g.act('interview', c.pid); if (!c.traced && c.onset !== null) g.act('trace', c.pid, { daysBefore: 2 }); });
  if (!g.S.recognized && g.canAct('declare_novel') === null) g.act('declare_novel');
  if (d === 12) { g.order('isolate'); g.order('quarantine'); g.order('wastewater'); g.order('masks'); }
  if (d === 20) { g.order('gatherings', { max: 30 }); g.order('close_schools'); }
  var t0 = process.hrtime.bigint();
  g.endDay();
  var ms = Number(process.hrtime.bigint() - t0) / 1e6;
  times.push(ms); if (ms > worst) { worst = ms; worstDay = g.day; }
}
times.sort(function (a, b) { return a - b; });
console.log('endDay over ' + times.length + ' days: median ' + times[times.length >> 1].toFixed(1) + ' ms, p90 ' + times[Math.floor(times.length * 0.9)].toFixed(1) + ' ms, max ' + worst.toFixed(1) + ' ms (day ' + worstDay + '); infections ' + g.sim.n + ', line list ' + g.S.caseOrder.length);
t('lineList()', function () { return g.lineList(); });
t('epiCurve()', function () { return g.epiCurve(); });
t('clusters()', function () { return g.clusters(); });
t('tree()', function () { return g.tree(); });
t('actions()', function () { return g.actions(); });
var js = t('save()', function () { return g.save(); });
console.log('  save size', (js.length / 1024).toFixed(0) + ' KB');
t('load()', function () { return IX.load(js); });
g._ghost = null;
t('ghost city to day 180', function () { return g.ghost(); });
t('debrief()', function () { return g.debrief(); });
