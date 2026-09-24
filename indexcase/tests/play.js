#!/usr/bin/env node
// Balance: play whole games headlessly with a policy and report outcomes per grade.
// Usage: node tests/play.js [from..to] [--policy=competent|none|naive] [--grade=all|probationer|consultant|director]
var IX = require('./load.js')();
var args = process.argv.slice(2);
var range = (args.filter(function (a) { return a[0] !== '-'; })[0] || '1..10').split('..');
function opt(k, d) { var a = args.filter(function (x) { return x.indexOf('--' + k + '=') === 0; })[0]; return a ? a.split('=')[1] : d; }
var policy = opt('policy', 'competent'), gradeOpt = opt('grade', 'all');
var grades = gradeOpt === 'all' ? ['probationer', 'consultant', 'director'] : [gradeOpt];
grades.forEach(function (grade) {
  var res = { n: 0, win: 0, held: 0, controlled: 0, out: {}, deaths: 0, ghost: 0, inf: 0, ginf: 0, trust: 0, econ: 0, score: 0, days: 0 };
  for (var s = +range[0]; s <= +range[1]; s++) {
    var t0 = Date.now();
    var g = IX.newGame(String(s), { grade: grade });
    IX.playPolicy(g, policy);
    var d = g.debrief();
    var o = g.outcome ? g.outcome.kind : 'running';
    res.n++; res.out[o] = (res.out[o] || 0) + 1; if (o === 'contained' || (o === 'vaccine' && d.infections.actual < 0.5 * d.infections.ghost)) res.held++; if (['Sound', 'Commended', 'Exemplary'].indexOf(d.score.grade) >= 0 && o !== 'collapse' && o !== 'resigned') res.win++; if (d.infections.actual < 0.5 * d.infections.ghost) res.controlled++; res.deaths += d.deaths.actual; res.ghost += d.deaths.ghost; res.inf += d.infections.actual; res.ginf += d.infections.ghost; res.trust += d.trust.end; res.econ += d.costs.economy; res.score += d.score.total; res.days += g.day;
    console.log(grade.slice(0, 4), s, g.P.archetype.padEnd(12), g.P.route.padEnd(8), 'R', g.P.R, 'ifr', (100 * g.P.ifr).toFixed(1) + '%', '->', o.padEnd(9), 'day', String(g.day).padStart(3), 'deaths', d.deaths.actual + '/' + d.deaths.ghost, 'inf', d.infections.actual + '/' + d.infections.ghost, 'trust', d.trust.end, 'cred', g.credibility, '£' + d.costs.economy + 'm', 'score', d.score.total, d.score.grade, (Date.now() - t0) + 'ms');
  }
  console.log('== ' + grade + ' / ' + policy + ': WINS (verdict Sound or better) ' + res.win + '/' + res.n + ' (' + Math.round(100 * res.win / res.n) + '%), outbreak held (contained, or vaccinated with under half the ghost city\'s infections) ' + res.held + '/' + res.n + ', infections held under half the ghost city in ' + res.controlled + '/' + res.n + '; ' + JSON.stringify(res.out) + '  deaths ' + res.deaths + ' vs ghost ' + res.ghost + ' (' + Math.round(100 * (1 - res.deaths / Math.max(1, res.ghost))) + '% averted), infections ' + Math.round(100 * res.inf / Math.max(1, res.ginf)) + '% of ghost, mean trust ' + Math.round(res.trust / res.n) + ', mean £' + (res.econ / res.n).toFixed(1) + 'm, mean score ' + Math.round(res.score / res.n) + ', mean end day ' + Math.round(res.days / res.n));
});
