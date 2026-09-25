#!/usr/bin/env node
// Timings: newCase per grade (incl. retries + acceptance), every public per-action call during a busy game,
// save/load. Budget: newCase < 1 s, any per-action call < 20 ms.
// Usage: node tests/perf.js [n]
var DX = require('./load.js')();
var POL = require('./policy.js')(DX);
var N = +(process.argv[2] || 10);
function now() { return Number(process.hrtime.bigint()) / 1e6; }
var fail = 0;
['cadet', 'analyst', 'chief'].forEach(function (g) {
  var ts = [];
  for (var i = 0; i < N; i++) { var t0 = now(); DX.newCase('perf-' + g + '-' + i, { grade: g }); ts.push(now() - t0); }
  ts.sort(function (a, b) { return a - b; });
  var max = ts[ts.length - 1];
  console.log(('newCase ' + g).padEnd(24), 'median ' + ts[ts.length >> 1].toFixed(0) + ' ms, max ' + max.toFixed(0) + ' ms' + (max > 1000 ? '  OVER BUDGET' : ''));
  if (max > 1000) fail++;
});

// instrument every public method, then play busy games with the competent policy
var stats = {};
function wrap(obj, name, label) {
  var f = obj[name];
  obj[name] = function () {
    var t0 = now(), r = f.apply(this, arguments), dt = now() - t0;
    var s = stats[label] || (stats[label] = { n: 0, tot: 0, max: 0 });
    s.n++; s.tot += dt; if (dt > s.max) s.max = dt;
    return r;
  };
}
var CP = DX.Case.prototype;
['clock', 'band', 'signal', 'schedule', 'upcoming', 'wait', 'advanceTo', 'waitForSignal', 'tune', 'log', 'messages', 'message', 'board', 'df', 'fix', 'van', 'vanResult',
  'buildings', 'building', 'areas', 'inbox', 'links', 'link', 'unlink', 'warrants', 'warrant', 'endShift', 'opCard', 'mentor', 'mentorStatus', 'debrief', 'save', 'alertLevel', 'costs']
  .forEach(function (k) { wrap(CP, k, k); });
var benchNames = ['depth', 'crib', 'place', 'unplace', 'work', 'period', 'columns', 'align', 'setKey', 'boardSolve', 'decode', 'encode', 'suggest', 'accept'];
var loads = [], saves = 0;
['cadet', 'analyst', 'chief'].forEach(function (g) {
  for (var i = 0; i < 3; i++) {
    var c = DX.newCase('perf-play-' + g + '-' + i, { grade: g });
    benchNames.forEach(function (k) { wrap(c.bench, k, 'bench.' + k); });
    // the UI asks for these often: sprinkle them through the game
    var origWait = c.waitForSignal;
    c.waitForSignal = function (m) {
      var r = origWait.call(c, m);
      c.band(); c.messages(); c.log(); c.links(); c.inbox(); c.opCard(); c.buildings(); c.upcoming(120); c.warrants(); c.mentorStatus();
      if (r.tx) c.signal(r.tx.id);
      return r;
    };
    POL.play(c, 'competent', { seed: i });
    var ms = c.messages().filter(function (m) { return m.kind === 'pad'; });
    if (ms.length >= 2 && c.board()) { c.bench.work(ms[0].id, ms[1].id); if (c.gradeInfo.suggest) c.bench.suggest(ms[0].id, ms[1].id, 10, 'A'); }
    c.mentor(2); c.mentor(3); c.debrief();
    var sv = c.save(); saves = Math.max(saves, sv.length);
    var t0 = now(); DX.load(sv); loads.push(now() - t0);
  }
});
console.log('\nper-action calls during 9 played cases (ms):');
Object.keys(stats).sort(function (a, b) { return stats[b].max - stats[a].max; }).forEach(function (k) {
  var s = stats[k];
  var over = s.max > 20 && ['endShift', 'save', 'debrief'].indexOf(k) < 0;
  if (over) fail++;
  console.log('  ' + k.padEnd(18) + ' n ' + String(s.n).padStart(5) + '  mean ' + (s.tot / s.n).toFixed(2).padStart(6) + '  max ' + s.max.toFixed(1).padStart(6) + (over ? '  OVER 20 ms' : ''));
});
loads.sort(function (a, b) { return a - b; });
console.log('\nsave: max ' + saves + ' chars; load: median ' + loads[loads.length >> 1].toFixed(0) + ' ms, max ' + loads[loads.length - 1].toFixed(0) + ' ms');
// the station-side solver used by the policy (not a per-action engine call)
var W = DX.makeWorld('perf-solver', 'analyst', 0), ctl = W.ring.controller, ts2 = [];
W.plan.pairs.forEach(function (p) {
  var a = W.msg[p.a], b = W.msg[p.b], t0 = now();
  DX.solveDepth(W.ring.board, DX.toDigits(a.groups.slice(1).join('')), DX.toDigits(b.groups.slice(1).join('')), { calls: W.ring.members.map(function (m) { return m.call; }).concat([ctl.spell]) });
  ts2.push(now() - t0);
});
console.log('DX.solveDepth (policy / tests only): ' + ts2.map(function (x) { return x.toFixed(0); }).join(', ') + ' ms per pair');
console.log(fail ? '\nPERF: ' + fail + ' over budget' : '\nPERF: all within budget');
process.exitCode = fail ? 1 : 0;
