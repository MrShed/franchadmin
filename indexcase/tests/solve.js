#!/usr/bin/env node
// Run generation + the solver over many seeds.
// Usage: node tests/solve.js [from..to | N] [--grade=consultant] [--raw] [--verbose]
//   default: seeds 1..100 through IX.newGame (generation retries until the solver accepts).
//   --raw: attempt 0 only (raw acceptance rate and why games fail).
//   --full: also run the full headless solver (IX.acceptFull) on the accepted game and report agreement.
var IX = require('./load.js')();
var args = process.argv.slice(2);
var range = (args.filter(function (a) { return a.charAt(0) !== '-'; })[0] || '1..100').split('..');
var from = +range[0], to = range.length > 1 ? +range[1] : +range[0];
if (range.length === 1) { from = 1; to = +range[0]; }
var raw = args.indexOf('--raw') >= 0, full = args.indexOf('--full') >= 0, verbose = args.indexOf('--verbose') >= 0;
var gArg = args.filter(function (a) { return /^--grade=/.test(a); })[0];
var grade = gArg ? gArg.split('=')[1] : 'consultant';
var everN = 0, everC = 0, solverDisagree = 0, n = 0, ok = 0, attempts = 0, t0 = Date.now(), byA = {}, fails = {}, traitDays = {}, times = [];
for (var s = from; s <= to; s++) {
  n++;
  var t1 = Date.now(), g, v;
  if (raw) {
    g = IX.buildAttemptCached(String(s), { grade: grade }, 0);
    if (!g) { fails['no alert / fizzled'] = (fails['no alert / fizzled'] || 0) + 1; console.log(s, 'FIZZLE'); continue; }
    v = full ? IX.acceptFull(g) : IX.accept(g);
  } else {
    g = IX.newGame(String(s), { grade: grade });
    v = g._verify || { ok: false, fails: ['none'] };
    if (full && v.ok) { var vf = IX.acceptFull(g); v.solver = vf.solver; v.charRef = vf.charRef; v.solverOk = vf.solverOk; if (!vf.solverOk) { v.solverFails = vf.fails; solverDisagree++; } }
  }
  times.push(Date.now() - t1);
  attempts += g.attempt + 1;
  var a = g.P.archetype;
  byA[a] = byA[a] || { n: 0, ok: 0 };
  byA[a].n++;
  if (v.ok) { ok++; byA[a].ok++; }
  else (v.fails || []).forEach(function (f) { var k = f.replace(/\(.*\)/, '').replace(/\d+/g, '#').trim(); fails[k] = (fails[k] || 0) + 1; });
  if (v.solver) IX.KEY_TRAITS.forEach(function (k) { var d = v.solver.traitDay[k]; (traitDays[k] = traitDays[k] || []).push(d === undefined ? null : d - (v.charRef || 0)); });
  if (v.solver) { everN += (v.everTraits || []).length; everC++; }
  if (verbose || !v.ok || v.solverFails) console.log(s, 'att', g.attempt, a, g.P.route, 'R', g.P.R, 'ifr', g.P.ifr, v.ok ? 'OK' + (v.solverFails ? ' but solver: ' + JSON.stringify(v.solverFails) : '') : 'FAIL ' + JSON.stringify(v.fails), 'ghost', JSON.stringify(v.ghost), 'alertInf', v.infAtAlert, 'proxy', JSON.stringify(v.proxy),
    v.solver ? 'conf ' + v.solver.confirmed + ' comm ' + v.solver.community + ' traits ' + JSON.stringify(v.solver.traitDay) : '', (Date.now() - t1) + 'ms');
}
console.log('\n==== ' + n + ' seeds, grade ' + grade + (raw ? ' (raw attempt 0)' : ' (with retries)') + ' in ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
console.log('accepted: ' + ok + '/' + n + ' = ' + (100 * ok / n).toFixed(1) + '%   attempts per game: ' + (attempts / n).toFixed(2) + '   time per game: median ' + IX.median(times) + 'ms, max ' + Math.max.apply(null, times) + 'ms');
if (full) console.log('full solver disagrees with the fast check on ' + solverDisagree + ' accepted games');
console.log('by archetype: ' + Object.keys(byA).map(function (k) { return k + ' ' + byA[k].ok + '/' + byA[k].n; }).join(', '));
if (everC) console.log('key traits the ideal epidemiologist could estimate by day 90: mean ' + (everN / everC).toFixed(2) + ' of 7');
if (Object.keys(traitDays).length) console.log('trait estimable (days after community spread; null = never): ' + Object.keys(traitDays).map(function (k) { var L = traitDays[k], got = L.filter(function (x) { return x !== null; }); return k + ' ' + got.length + '/' + L.length + (got.length ? ' med ' + IX.median(got) : ''); }).join('; '));
if (Object.keys(fails).length) console.log('fail reasons: ' + JSON.stringify(fails, null, 1));
