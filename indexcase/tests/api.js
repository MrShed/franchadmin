#!/usr/bin/env node
// Walks the public API the way the UI does and checks invariants:
// shapes, costs, every action, orders, estimates, mentor, save/load, and that the ghost city
// reproduces the player's city exactly until the first order.
// Usage: node tests/api.js [seed] [--grade=x]
var IX = require('./load.js')();
var assert = require('assert');
var args = process.argv.slice(2);
var seed = args.filter(function (a) { return a[0] !== '-'; })[0] || 'api-1';
var gA = args.filter(function (a) { return /^--grade=/.test(a); })[0];
var grade = gA ? gA.split('=')[1] : 'consultant';
var checks = 0;
function ok(c, m) { assert(c, m); checks++; }
var g = IX.newGame(seed, { grade: grade });
console.log('game', g.seed, 'attempt', g.attempt, g.P.archetype, 'day', g.day, 'act', g.actNo, g.actLabel, g.dateLabel(0));
ok(g.day === 0 && g.actNo === 1 && !g.over && typeof g.act === 'function', 'initial state');
// city
var city = g.city;
ok(city.districts.length >= 10 && city.places.length > 50 && city.boundary.length > 5 && city.roads.length > 3, 'city');
city.districts.forEach(function (d) { ok(d.poly.length >= 3 && d.pop > 0, 'district ' + d.id); });
city.places.forEach(function (p) { ok(p.pos.length === 2 && p.pos[0] >= 0 && p.pos[0] <= 1 && IX.DATA.PLACE_KINDS.indexOf(p.kind) >= 0, 'place ' + p.id + ' ' + p.kind); });
// inbox & refs
var inbox = g.inbox();
ok(inbox.length >= 2 && inbox.some(function (m) { return m.kind === 'alert'; }), 'alert in inbox');
function checkMsg(m) {
  ok(m.id && typeof m.day === 'number' && m.kind && m.title && Array.isArray(m.body) && Array.isArray(m.refs), 'msg shape ' + m.id);
  m.body.forEach(function (l) { ok(l.k === 'table' ? (Array.isArray(l.head) && Array.isArray(l.rows)) : Array.isArray(l.x), 'line shape in ' + m.title); });
  m.refs.forEach(function (r) {
    ok(['person', 'place', 'district', 'sample', 'order', 'trait', 'msg', 'rumour'].indexOf(r.t) >= 0 && r.d, 'ref ' + JSON.stringify(r));
    if (r.t === 'person') ok(g.person(r.id) && g.person(r.id).name === r.d, 'person ref resolves');
    if (r.t === 'place') ok(city.places.some(function (p) { return p.id === r.id; }), 'place ref resolves');
  });
  ok(typeof IX.msgText(m) === 'string', 'msgText');
}
inbox.forEach(checkMsg);
// line list & person
var ll = g.lineList();
ok(ll.length >= 3, 'line list');
ll.forEach(function (c) { ok(c.pid >= 0 && c.name && c.status && c.pos && typeof c.pos.x === 'number' && Array.isArray(c.tests) && Array.isArray(c.cluster), 'case shape'); });
var p0 = g.person(ll[0].pid);
ok(p0 && p0.case && p0.address && typeof p0.portrait === 'number', 'person');
// resources & actions
var res = g.resources();
ok(res.staffHours.tracers > 0 && res.testsLeft > 0 && res.beds.cap > 0 && res.trust.overall > 0, 'resources');
var cat = g.actions();
ok(cat.length > 30, 'catalogue');
cat.forEach(function (a) { ok(a.id && a.label && a.area && a.costs && typeof a.available === 'boolean' && a.why !== undefined, 'action ' + a.id); });
ok(!g.act('nope').ok, 'unknown action refused');
ok(!g.act('interview', 999999).ok, 'bad target refused');
ok(!g.act('sequence', ll[0].pid).ok, 'sequencing before identification refused');
// act 1: test, interview, record review, declare
ll.forEach(function (c) { var r = g.act('test', c.pid); ok(r.ok || /capacity/.test(r.err), 'test ' + r.err); });
var r1 = g.act('interview', ll[0].pid); ok(r1.ok && r1.msgs.length === 1, 'interview'); r1.msgs.forEach(checkMsg);
var h0 = g.resources().staffHours.tracers; ok(h0 === res.staffHours.tracers - 1.5, 'interview cost 1.5h');
var r2 = g.act('record_review'); ok(r2.ok, 'record review'); r2.msgs.forEach(checkMsg);
var r3 = g.act('site_visit', g.S.alert.place); ok(r3.ok, 'site visit ' + r3.err); r3.msgs.forEach(checkMsg);
ok(!g.act('declare_novel').ok, 'declare needs negatives');
// mentor
var ms = g.mentorStatus(); ok(ms.nudge.ok, 'nudge available');
var mn = g.mentor('nudge'); ok(mn.ok && mn.text, 'nudge'); ok(!g.mentor('nudge').ok, 'one nudge a day');
// ghost equality: advance with investigations only
var truthBefore = [];
for (var d = 0; d < 12 && !g.S.recognized; d++) {
  g.lineList().forEach(function (c) { if (!c.tests.length) g.act('test', c.pid); });
  g.act('declare_novel');
  var e = g.endDay(); ok(e.day === g.day && Array.isArray(e.newMsgs), 'endDay'); e.newMsgs.forEach(checkMsg);
}
ok(g.S.recognized, 'agent identified by day ' + g.day);
ok(g.actNo === 2 && /^Agent /.test(g.agentName), 'act 2 with a named agent');
for (d = 0; d < 6; d++) { g.lineList().slice(-5).forEach(function (c) { g.act('interview', c.pid); g.act('trace', c.pid, { daysBefore: 5 }); }); g.endDay(); }
var gh = g.ghost(g.sim.sd).sim;
var same = gh.n >= g.sim.n && (gh.n === g.sim.n || gh.xday[g.sim.n] >= g.sim.sd);
for (var x = 0; same && x < g.sim.n; x++) same = gh.xwho[x] === g.sim.xwho[x] && gh.xday[x] === g.sim.xday[x] && gh.xby[x] === g.sim.xby[x] && gh.xdeath[x] === g.sim.xdeath[x];
ok(same, 'ghost city reproduces the untouched trajectory exactly (' + g.sim.n + ' infections)');
console.log('ghost identical through day', g.day, 'with', g.sim.n, 'infections');
// orders
var o1 = g.order('isolate'); ok(o1.ok && o1.order.id, 'order isolate'); o1.msgs.forEach(checkMsg);
ok(!g.order('isolate').ok, 'duplicate order refused');
var o2 = g.order('gatherings', { max: 6 }); ok(o2.ok, 'gatherings');
var pub = city.places.filter(function (p) { return p.kind === 'pub'; })[0];
var o3 = g.act('close_place', pub.id); ok(o3.ok, 'close place via act ' + o3.err);
ok(g.orders().length === 3, 'three orders');
g.orders().forEach(function (o) { ok(o.id && o.type && typeof o.costPerDay === 'number' && o.effectFrom >= o.since, 'order view'); });
ok(g.revoke(o2.order.id).ok && g.orders().length === 2, 'revoke');
// estimates & publish
var est = g.estimates(); ok(est.traits.length >= 7, 'traits');
g.setDraft('R', 2.1); ok(g.estimates().draft.R === 2.1, 'draft');
var pb = g.publish({ R: 2.1, route: 'droplet', incubation: 5 }); ok(pb.ok && pb.msgs.length, 'publish'); pb.msgs.forEach(checkMsg);
ok(!g.publish({ R: 2.1 }).ok, 'republishing the same value refused');
// the rest of the actions
var c1 = g.lineList().filter(function (c) { return c.status === 'confirmed'; })[0];
ok(c1, 'a confirmed case');
var hh = g.lineList().filter(function (c) { return c.status === 'confirmed' && g.canAct('household', c.pid) === null; })[0];
if (hh) { var rh = g.act('household', hh.pid); ok(rh.ok, 'household ' + rh.err); }
var rs = g.act('sequence', c1.pid); ok(rs.ok || /sample|sequenced/.test(rs.err), 'sequence ' + rs.err);
var rq = g.act('questionnaire', g.S.alert.place); ok(rq.ok || /hours/.test(rq.err), 'questionnaire ' + rq.err);
['briefing', 'request_funding', 'hire'].forEach(function (id) { var r = g.act(id, null, id === 'hire' ? { kind: 'tracers', n: 1 } : { money: 100, staff: 2 }); ok(r.ok || /hours|money/.test(r.err), id + ' ' + r.err); });
// advance a fortnight
for (d = 0; d < 14; d++) g.endDay();
var ec = g.epiCurve(); ok(ec.byOnset.length === g.day - ec.from && ec.nowcast.length === ec.byOnset.length, 'epi curve aligned');
var ww = g.wastewater(); ok(ww.byDistrict[city.districts[0].id].length === g.day - ww.from, 'wastewater aligned');
var tr = g.tree(); ok(tr.nodes[0].id === 'root', 'tree');
tr.nodes.forEach(function (n) { ok(n.parent === null || tr.nodes.some(function (m) { return m.id === n.parent; }), 'tree parent exists'); });
g.clusters().forEach(function (k) { ok(k.id && k.cases.length >= 2, 'cluster'); });
g.contacts().forEach(function (c) { ok(c.pid >= 0 && Array.isArray(c.of) && c.days, 'contact'); });
// messages with choices
g.inbox().filter(function (m) { return m.choices && !m.answered; }).slice(0, 2).forEach(function (m) { var r = g.answer(m.id, m.choices[0].id); ok(r.ok, 'answer ' + r.err); });
// mentor tiers
['pointer', 'answer'].forEach(function (t) { var st = g.mentorStatus()[t]; var r = g.mentor(t); ok(!st.ok || r.ok || /doing what she would do/.test(r.text), 'mentor ' + t + ' ' + r.text); });
// save / load continue identically
var s = g.save(); ok(typeof s === 'string' && s.indexOf('IXZ1:') === 0, 'save');
var g2 = IX.load(s);
ok(JSON.stringify(g2.lineList()) === JSON.stringify(g.lineList()), 'load: line list');
for (d = 0; d < 5; d++) { g.endDay(); g2.endDay(); }
ok(JSON.stringify(g2.lineList()) === JSON.stringify(g.lineList()) && g2.sim.n === g.sim.n && JSON.stringify(g2.resources()) === JSON.stringify(g.resources()), 'loaded game continues identically');
// advance and resign
var a = g.advance(7); ok(a.day > 0, 'advance');
var rg = g.resign(); ok(rg.ok && g.over && g.outcome.kind === 'resigned', 'resign');
ok(!g.endDay().newMsgs.length, 'no days after the end');
var db = g.debrief();
ok(db.truth.card && db.estimates.length === IX.TRAITS.length && db.curves.actual.infections.length && db.curves.ghost.infections.length >= db.curves.actual.infections.length, 'debrief');
ok(db.deaths.named.every(function (n) { return n.name && n.note !== undefined; }) && db.frames.length && db.tree.nodes.length === g.sim.n && db.score.lines.length, 'debrief details');
console.log('score', db.score.total, db.score.grade, '| deaths', db.deaths.actual, 'ghost', db.deaths.ghost);
console.log('OK: ' + checks + ' checks');
