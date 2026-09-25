#!/usr/bin/env node
// Post-mortem of policy games: what the case offered vs what the player achieved.
// Usage: node tests/why.js [from..to] [--grade=analyst] [--all]
var DX = require('./load.js')();
var POL = require('./policy.js')(DX);
var args = process.argv.slice(2);
var range = (args.filter(function (a) { return a[0] !== '-'; })[0] || '1..20').split('..');
function opt(k, d) { var a = args.filter(function (x) { return x.indexOf('--' + k + '=') === 0; })[0]; return a ? a.split('=')[1] : d; }
var grade = opt('grade', 'analyst'), all = args.indexOf('--all') >= 0;
for (var s = +range[0]; s <= +range[1]; s++) {
  var c = DX.newCase('play-' + s, { grade: grade });
  var r = POL.play(c, 'competent', { seed: s });
  if (c.outcome.win && !all) continue;
  var d = c.debrief(), W = c._w, op = d.truth.operation;
  console.log('--- seed', s, c.outcome.kind, 'op', op.placeName, 'night', op.night + 1, op.time, 'exec', op.executor, 'verify', c._verify.why.join(','), 'routes', c._verify.routes.join(' '));
  console.log('   policy facts', JSON.stringify(r.facts), 'drops', JSON.stringify(r.drops), 'meets', JSON.stringify(r.meets));
  d.truth.pairs.forEach(function (p) {
    var a = d.truth.plaintexts.filter(function (x) { return x.id === p.a; })[0], b = d.truth.plaintexts.filter(function (x) { return x.id === p.b; })[0];
    console.log('   pair', p.a, a.facts.join('+') || '-', a.heard ? (a.decrypted || 'heard') : 'MISSED', '/', p.b, b.facts.join('+') || '-', b.heard ? (b.decrypted || 'heard') : 'MISSED', 'nights', a.night + 1, b.night + 1);
  });
  d.truth.plaintexts.filter(function (x) { return x.cipher === 'periodic'; }).forEach(function (x) { console.log('   courier', x.id, x.from, 'night', x.night + 1, x.facts.join('+') || '-', x.heard ? (x.decrypted || 'heard') : 'MISSED'); });
  console.log('   reactions', d.truth.security.reactions.map(function (x) { return x.kind + '@' + (x.shift + 1); }).join(' '), 'warrants', JSON.stringify(c.warrants().used.map(function (w) { return w.kind + ':' + w.targetLabel + ':' + w.result; })));
  r.log.filter(function (l) { return !/copied/.test(l); }).forEach(function (l) { console.log('      ' + l); });
}
