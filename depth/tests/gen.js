#!/usr/bin/env node
// Dump a generated case: ring, operation, drops/meeting, every plaintext with cipher and depth partner, schedule.
// Usage: node tests/gen.js <seed> [--grade=analyst]
var DX = require('./load.js')();
var args = process.argv.slice(2);
var seed = args.filter(function (a) { return a[0] !== '-'; })[0] || 'gen-1';
var gA = args.filter(function (a) { return /^--grade=/.test(a); })[0];
var grade = gA ? gA.split('=')[1] : 'analyst';
var t0 = Date.now();
var c = DX.newCase(seed, { grade: grade });
var ms = Date.now() - t0;
var W = c._w, ring = W.ring, op = W.op, plan = W.plan, G = W.G;
function P(s) { console.log(s === undefined ? '' : s); }
function place(id) { return W.place[id].name; }
function call(id) { return id === 'ctl' ? ring.controller.call : W.mem[id].call; }

P('DEPTH case "' + seed + '"  grade ' + G.label + '  attempt ' + c.attempt + '  generated in ' + ms + ' ms  verify: ' + c._verify.why.join(', ') + '  (' + c._verify.routes.join(' ') + ')');
P('Nights: ' + G.shifts + ' (' + DX.dateLabel(0) + ' .. ' + DX.dateLabel(G.shifts - 1) + ')   warrants ' + G.warrants + '   outstations ' + W.city.outstations.map(function (o) { return o.id + ' ' + o.name; }).join(', '));
P();
P('THE CITY: ' + W.city.name + ' — ' + W.city.districts.length + ' districts (' + W.city.districts.map(function (d) { return d.name; }).join(', ') + '), ' + W.city.streets.length + ' streets, ' + W.city.places.length + ' places');
P();
P('THE RING');
P('  controller ' + ring.controller.call + ' (abroad, voice numbers, ' + ring.controller.voice + ' voice)   keyword ' + ring.keyword + '   security officer ' + ring.security.name);
ring.members.forEach(function (m) {
  P('  ' + m.call.padEnd(4) + ' ' + m.role.padEnd(8) + (m.executor ? ' EXECUTOR ' : '          ') + m.name.padEnd(22) + m.cover);
  P('         home ' + m.home.text + ' (' + W.city.districts.filter(function (d) { return d.id === m.district; })[0].name + ')' + (m.room ? ', room ' + m.room.text : '') + '   transmits from ' + m.txFrom +
    '   slot ' + DX.hhmm(m.slot.minute) + ' ' + m.slot.freq + ' MHz   ' + (m.courier ? 'periodic key ' + m.periodKey.join('') : 'one-time pad') +
    '   fist ' + m.fist.wpm + ' wpm, dah ' + m.fist.dah + ', "' + m.fist.quirk + '"   careful ' + m.careful);
});
P();
var sch = plan.sched.ctl;
P('CONTROLLER SCHEDULE: ' + sch.map(function (s) { return DX.hhmm(s.minute) + ' on ' + s.freq + ' MHz'; }).join(', ') + ' (repeat next night +15 min)');
P();
P('THE OPERATION  "' + op.codeword + '": ' + op.label + ' (' + op.what + ')');
P('  WHERE ' + place(op.place) + '   WHEN night of ' + DX.dateLabel(op.night) + ' at ' + DX.hhmm(op.minute) + '   WHO ' + W.mem[op.executor].call + ' (' + W.mem[op.executor].name + ')   item: ' + op.item);
plan.drops.forEach(function (d) { P('  drop ' + d.id + ': ' + place(d.place) + ' loaded ' + DX.dateLabel(d.night) + ' after ' + DX.hhmm(d.after) + ' for ' + call(d.forId) + ', cleared ' + DX.dateLabel(d.collect.night) + ' ' + DX.hhmm(d.collect.minute) + ' — "' + d.text + '"'); });
P('  meeting: ' + place(plan.meet.cafe) + ' ' + DX.dateLabel(plan.meet.night) + ' ' + DX.hhmm(plan.meet.minute) + ' between ' + call(plan.meet.resident) + ' and ' + call(plan.meet.agent));
P();
P('DEPTHS (reused pad pages): ' + plan.pairs.map(function (p) { return p.a + '+' + p.b + ' page ' + W.msg[p.a].page; }).join(', '));
P();
P('MESSAGES (plaintext; facts; cipher)');
plan.msgs.slice().sort(function (a, b) { return a.night - b.night || (W.tx[a.txs[0]].minute - W.tx[b.txs[0]].minute); }).forEach(function (m) {
  var tx = W.tx[m.txs[0]];
  var partner = (plan.pages[m.page] || []).filter(function (x) { return x !== m.id; });
  var facts = m.facts.map(function (f) { return f.fact; }).filter(function (f, i, a) { return f !== 'codeword' && a.indexOf(f) === i; });
  P('  ' + m.id.padEnd(4) + DX.dateLabel(m.night) + ' ' + DX.hhmm(tx.minute) + ' ' + call(m.from).padEnd(4) + '> ' + call(m.to).padEnd(4) + ' ' + (m.cipher === 'pad' ? 'pad ' + m.page + (partner.length ? ' DEPTH with ' + partner.join(',') : '') : 'periodic') + (facts.length ? '  [' + facts.join(' ') + ']' : ''));
  P('        ' + m.text);
});
P();
P('TRANSMISSIONS');
plan.txs.forEach(function (t) {
  P('  ' + t.id.padEnd(4) + DX.dateLabel(t.night) + ' ' + DX.hhmm(t.minute) + '-' + DX.hhmm(t.minute + t.dur) + ' ' + String(t.freq).padEnd(6) + ' ' + t.mode.padEnd(5) + ' ' + (t.from + ' > ' + (t.to || '')).padEnd(12) + (t.msg ? t.msg + (t.repeat ? ' (repeat)' : '') : t.test ? 'test VVV' : ''));
});
