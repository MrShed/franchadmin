#!/usr/bin/env node
// Exercises the night analyst (08-analyst.js): every pointer names a key the player
// holds and a record that exists; every direct hint is true; nudges point at
// documents the player has; hints replay identically from a save.
// Usage: node tests/hints.js [N=12] [--level=probationer|officer|head]
var CX = require('./load.js')();
var assert = require('assert');
var args = process.argv.slice(2);
var N = +(args.filter(function (a) { return a.charAt(0) !== '-'; })[0] || 12);
var lArg = args.filter(function (a) { return /^--level=/.test(a); })[0];
var level = lArg ? lArg.split('=')[1] : undefined;
var stats = { cases: 0, pointers: 0, directs: 0, nudges: 0, empty: 0, prevented: 0, tiers: {} };
for (var i = 1; i <= N; i++) {
  var cs = CX.newCase('h' + i, { level: level });
  var W = cs._w;
  stats.cases++;
  // a player who does nothing but follow the night analyst
  while (!cs.over && cs.day < W.D) {
    var n = cs.hint('nudge');
    if (n.ok) {
      stats.nudges++;
      n.refs.docs.forEach(function (id) { assert(cs.doc(id), 'nudge doc exists ' + id); });
    }
    for (var k = 0; k < 20; k++) {
      var st = cs.hintStatus();
      if (!st.pointer.ok) break;
      var h0 = cs.hoursLeft;
      var p = cs.hint('pointer');
      if (!p.ok) { if (p.empty) stats.empty++; break; }
      stats.pointers++;
      assert.strictEqual(cs.hoursLeft, h0 - 2, 'pointer costs 2h');
      var pull = p.refs.pull;
      assert(pull, 'pointer names a pull');
      if (!pull.today) break;
      assert(pull.key.t !== 'hotel+date' || pull.key.date < cs.day, 'register of a night that is over');
      var err = cs.canQuery(pull.sys, pull.key);
      assert(!err, 'pointer pull must be allowed: ' + err + ' ' + JSON.stringify(pull));
      var before = Object.keys(cs._s.seen).length;
      var r = cs.query(pull.sys, pull.key);
      assert(!r.error);
      assert(Object.keys(cs._s.seen).length >= before, 'pull returns something');
    }
    // file what she can prove, while credibility lasts (sparingly early, freely late)
    for (var j = 0; j < (W.D - cs.day <= 3 ? 4 : cs.day % 4 === 1 ? 1 : 0) && cs.credibility > 20; j++) {
      var d = cs.hint('direct');
      if (!d.ok) break;
      stats.directs++;
      var pr = d.refs.prop;
      if (pr.type === 'plot') assert.strictEqual(String(pr.value), String(pr.field === 'method' ? W.T.method : pr.field === 'target' ? W.realEvent.subject.name : pr.field === 'place' ? W.realEvent.venue : W.D), 'plot hint true');
      else assert(CX.propCorrect(W, pr), 'direct hint must be true: ' + JSON.stringify(pr));
      cs.file(pr.type === 'plot' ? { type: 'plot', field: pr.field, value: pr.value } : pr);
    }
    if (W.D - cs.day <= 1) break;
    cs.endDay();
  }
  var st2 = cs.hintStatus();
  // replay
  var cs2 = CX.load(cs.save());
  assert.deepStrictEqual(cs2.hintStatus().used, st2.used, 'hint counters replay');
  assert.strictEqual(cs2.hoursLeft, cs.hoursLeft, 'hours replay');
  assert.strictEqual(cs2.credibility, cs.credibility, 'credibility replay');
  assert.strictEqual(cs2.hintStatus().log.map(function (x) { return x.text; }).join('|'), st2.log.map(function (x) { return x.text; }).join('|'), 'hint texts replay');
  // try to finish with a trap from the plot she gave us
  var plot = {}; cs.props().filter(function (p) { return p.type === 'plot'; }).forEach(function (p) { plot[p.field] = p.value; });
  if (!cs.over && plot.place && plot.date !== undefined) {
    var o = cs.respond({ type: 'trap', method: plot.method || W.T.method, target: plot.target, place: plot.place, date: plot.date });
    if (o.prevented) stats.prevented++;
    assert(o.scoreLines.some(function (l) { return /night desk/.test(l.label); }), 'hint score line');
  }
  console.log('h' + i, W.templateKey, 'D', W.D, 'hints', JSON.stringify(st2.used), 'cred', cs.credibility, cs.over ? (cs.outcome.prevented ? 'PREVENTED' : 'failed') + ' ' + cs.outcome.score : 'open');
}
console.log('\nlevel ' + CX.level(level).label + ': ' + JSON.stringify(stats));
console.log('HINTS OK');
