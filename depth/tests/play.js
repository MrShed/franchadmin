#!/usr/bin/env node
// Balance: play whole cases headlessly and report win rates per grade.
// Usage: node tests/play.js [from..to] [--policy=competent|none|listener] [--grade=all|cadet|analyst|chief] [--v]
var DX = require('./load.js')();
var POL = require('./policy.js')(DX);
var args = process.argv.slice(2);
var range = (args.filter(function (a) { return a[0] !== '-'; })[0] || '1..20').split('..');
function opt(k, d) { var a = args.filter(function (x) { return x.indexOf('--' + k + '=') === 0; })[0]; return a ? a.split('=')[1] : d; }
var policy = opt('policy', 'competent'), gradeOpt = opt('grade', 'all'), verbose = args.indexOf('--v') >= 0;
var grades = gradeOpt === 'all' ? ['cadet', 'analyst', 'chief'] : [gradeOpt];
var targets = { cadet: 90, analyst: 70, chief: 40 };
var summary = [];
grades.forEach(function (grade) {
  var n = 0, win = 0, out = {}, ms = 0, facts = { where: 0, when: 0, who: 0 };
  for (var s = +range[0]; s <= +range[1]; s++) {
    var t0 = Date.now();
    var c = DX.newCase('play-' + s, { grade: grade });
    var r = POL.play(c, policy, { seed: s });
    var d = c.debrief(), o = c.outcome ? c.outcome.kind : 'running';
    n++; if (c.outcome && c.outcome.win) win++; out[o] = (out[o] || 0) + 1; ms += Date.now() - t0;
    var op = d.truth.operation;
    var fw = r.facts && r.facts.where && r.facts.where.place === op.place, fn = r.facts && r.facts.when && r.facts.when.night === op.night;
    var fh = r.facts && r.facts.who && r.facts.who.call === op.executor;
    facts.where += fw ? 1 : 0; facts.when += fn ? 1 : 0; facts.who += fh ? 1 : 0;
    console.log(grade.slice(0, 4), String(s).padStart(3), o.padEnd(9), 'night', d.outcome ? d.outcome.shift + 1 : '-', '/', c.shifts, 'op night', op.night + 1,
      'facts W' + (fw ? '+' : '-') + 'N' + (fn ? '+' : '-') + 'H' + (fh ? '+' : '-'), 'dec', d.stats.decryptedRight + '+' + d.stats.decryptedPartial + 'p/' + d.stats.messages,
      'warrants', d.stats.warrantsUsed + '(' + d.stats.warrantsWasted + ' wasted)', 'arrests', d.stats.arrests, 'alert', d.stats.alert, 'score', d.score.total, (Date.now() - t0) + 'ms');
    if (verbose && r.log) r.log.forEach(function (l) { console.log('      ' + l); });
  }
  var pct = Math.round(100 * win / n);
  summary.push(grade + ' / ' + policy + ': ' + win + '/' + n + ' = ' + pct + '%' + (policy === 'competent' ? ' (target ~' + targets[grade] + '%)' : '') + '  ' + JSON.stringify(out) + '  facts read W' + facts.where + ' N' + facts.when + ' H' + facts.who + '  avg ' + Math.round(ms / n) + ' ms/case');
});
console.log('\n== ' + summary.join('\n== '));
