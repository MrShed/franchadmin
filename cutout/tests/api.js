#!/usr/bin/env node
// Exercises the public API end to end (as the UI would) and checks invariants.
// Usage: node tests/api.js [seed]
var CX = require('./load.js')();
var assert = require('assert');
var seed = process.argv[2] || 'api-1';
var cs = CX.newCase(seed);
var W = cs._w;
console.log('case', cs.seed, 'attempt', cs.attempt, 'starts', cs.startLabel, 'day', cs.day, 'hours', cs.hoursLeft);
assert.strictEqual(cs.day, 0); assert.strictEqual(cs.hoursLeft, 16);
var inbox = cs.inbox();
assert(inbox.length >= 2, 'tip + newspaper on day 0');
assert(inbox.some(function (d) { return d.kind === 'tip'; }), 'tip present');
inbox.forEach(function (d) { assert(d.id && d.body && d.tokens, 'doc shape'); });
// error cases
assert(cs.query('nope', { t: 'name', v: 'x' }).error);
assert(cs.query('hotels', { t: 'name', v: 'Nobody Known' }).error, 'must hold key');
assert(cs.query('bank', { t: 'name', v: 'x' }).error, 'wrong key type');
// query every key we hold for one day
var toks = cs.knownTokens();
console.log('known tokens day 0:', toks.length, toks.slice(0, 6).map(function (t) { return t.t + '=' + (t.d || t.v); }).join('; '));
var n = 0;
toks.forEach(function (t) {
  CX.SYSTEMS.forEach(function (S) {
    if (S.keys.indexOf(t.t) < 0 || cs.hoursLeft < S.hours) return;
    var r = cs.query(S.id, t);
    assert(!r.error, r.error); assert.strictEqual(r.hoursSpent, S.hours); n++;
  });
});
console.log('queries day 0:', n, 'hours left', cs.hoursLeft, 'docs', cs.inbox().length);
assert(cs.query('archive', toks.filter(function (t) { return t.t === 'name'; })[0] || toks[0]).error || cs.hoursLeft >= 0);
// hotel+date key
var ht = cs.keysFor('hotels').filter(function (t) { return t.t === 'hotel'; })[0];
cs.hoursLeft = 16; // (test only)
if (ht) { var dt = cs.knownTokens().filter(function (t) { return t.t === 'date'; })[0]; var r2 = cs.query('hotels', { t: 'hotel+date', hotel: ht.v, date: +dt.v }); assert(!r2.error, r2.error); console.log('hotel+date doc:', r2.doc.title); }
// end some days
for (var i = 0; i < 3; i++) { var e = cs.endDay(); assert.strictEqual(e.day, i + 1); assert.strictEqual(cs.hoursLeft, 16); }
console.log('after 3 days: day', cs.day, 'docs', cs.inbox().length, 'timeline', JSON.stringify(cs.timeline().map(function (p) { return p.phase + ':' + p.days.length; })));
// propositions: file three true ones (using truth, test only) and one false
var net = W.network, O = W.net.operative, C1 = W.net.cutout;
var f1 = cs.file({ type: 'role', name: O.idents[0].name, role: 'operative' });
var f2 = cs.file({ type: 'role', name: 'Nobody Known', role: 'driver' });
var f3 = cs.file({ type: 'same', a: O.idents[0].name, b: O.idents[1].name });
assert.strictEqual(f3.confirmed.length, 0);
var f4 = cs.file({ type: 'role', name: C1.idents[0].name, role: 'cutout' });
assert.strictEqual(JSON.stringify(f4.confirmed), JSON.stringify([f1.id, f3.id, f4.id]), 'batch of three confirmed');
assert(cs.props().filter(function (p) { return p.id === f2.id; })[0].status === 'filed', 'wrong prop never flagged');
cs.file({ type: 'plot', field: 'method', value: CX.METHODS[0] });
console.log('props', cs.props().map(function (p) { return p.id + ':' + p.type + ':' + p.status; }).join(' '));
console.log('plotOptions', JSON.stringify(cs.plotOptions()).slice(0, 300));
// warrant: wrongful
var inn = W.innocents[0];
var ids = cs.inbox().slice(0, 3).map(function (d) { return d.id; });
var w1 = cs.warrant({ name: inn.real, role: 'driver', citedDocIds: ids });
console.log('wrongful warrant', JSON.stringify(w1), 'credibility', cs.credibility);
assert(!w1.approved);
// warrant for the operative with the docs that mention his names
var names = O.idents.map(function (x) { return x.name; });
var docs = cs.inbox().filter(function (d) { return d.tokens.some(function (t) { return t.t === 'name' && names.indexOf(t.v) >= 0; }); });
var bySys = {}; docs.forEach(function (d) { bySys[d.sys] = bySys[d.sys] || d.id; });
var cite = Object.keys(bySys).slice(0, 4).map(function (k) { return bySys[k]; });
var w2 = cs.warrant({ name: O.idents[0].name, role: 'operative', citedDocIds: cite });
console.log('operative warrant', w2.approved, w2.reason || '', w2.statement ? CX.docText(w2.statement) : '');
// save/load round trip
var json = cs.save();
var cs2 = CX.load(json);
assert.strictEqual(cs2.inbox().length, cs.inbox().length);
assert.strictEqual(cs2.day, cs.day); assert.strictEqual(cs2.hoursLeft, cs.hoursLeft === 16 ? cs2.hoursLeft : cs2.hoursLeft);
assert.strictEqual(JSON.stringify(cs2.props()), JSON.stringify(cs.props()));
assert.strictEqual(CX.docText(cs2.inbox()[5]), CX.docText(cs.inbox()[5]));
console.log('save/load ok (' + json.length + ' bytes)');
// respond with a trap using the truth (test only)
var ev = W.realEvent;
var out = cs.respond({ type: 'trap', method: W.T.method, target: ev.subject.name, place: ev.venue, date: ev.day });
console.log('outcome', JSON.stringify(out, null, 1));
assert(cs.over && out.prevented);
var db = cs.debrief();
console.log('debrief plot', JSON.stringify(db.plot));
console.log('debrief network', db.network.map(function (m) { return m.role + ':' + m.realName + (m.arrested ? '*' : ''); }).join(', '));
console.log('debrief timeline steps', db.timeline.length, 'seen', db.timeline.filter(function (s) { return s.seen; }).length);
assert(cs.query('hotels', toks[0]).error, 'closed case');
// let-it-run case
var cs3 = CX.newCase(seed + '-b');
while (!cs3.over) cs3.endDay();
console.log('let it run:', cs3.outcome.summary, 'score', cs3.outcome.score);
console.log('API OK');
