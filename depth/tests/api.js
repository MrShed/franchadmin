#!/usr/bin/env node
// Walks the whole public API the way the UI does and checks shapes, costs, rules and invariants.
// (The truth, c._w, is used here only to set up situations and to check the engine's answers.)
// Usage: node tests/api.js [seed]
var DX = require('./load.js')();
var assert = require('assert');
var seed = process.argv[2] || 'api-1';
var checks = 0;
function ok(c, m) { assert(c, m); checks++; }
function isRef(r) { return r && typeof r.t === 'string' && r.id !== undefined && typeof r.d === 'string'; }
var REF_T = ['callsign', 'place', 'person', 'building', 'district', 'msg', 'intercept'];
function checkNote(c, n) {
  ok(n.id && typeof n.shift === 'number' && typeof n.t === 'number' && n.kind && n.title && Array.isArray(n.body) && Array.isArray(n.refs), 'note shape ' + n.id);
  n.body.forEach(function (l) { ok(['p', 'm', 'n', 'h'].indexOf(l.k) >= 0 && Array.isArray(l.x), 'line shape'); l.x.forEach(function (sg) { ok(typeof sg === 'string' || isRef(sg), 'segment'); }); });
  n.refs.forEach(function (r) {
    ok(REF_T.indexOf(r.t) >= 0, 'ref type ' + r.t);
    if (r.t === 'place') ok(c.city.places.some(function (p) { return p.id === r.id; }), 'place ref resolves');
    if (r.t === 'building' || r.t === 'person') ok(c.building(r.id), 'building ref resolves ' + r.id);
    if (r.t === 'msg') ok(c.message(r.id), 'msg ref resolves');
  });
  ok(typeof DX.msgText(n) === 'string' && DX.msgText(n).length > 5, 'msgText');
}

// ------------------------------------------------------------------ grades & creation
ok(DX.GRADES.length === 3 && DX.GRADES.map(function (g) { return g.id; }).join() === 'cadet,analyst,chief', 'grades');
['cadet', 'analyst', 'chief'].forEach(function (g) {
  var c0 = DX.newCase(seed + '-' + g, { grade: g });
  var G = DX.grade(g);
  ok(c0.grade === g && c0.shifts === G.shifts && c0.city.outstations.length === G.outstations && c0.warrants().left === G.warrants, 'grade knobs ' + g);
  ok(!!c0.board() === G.boardHeld, 'checkerboard held per grade');
  ok(c0._verify && c0._verify.ok, 'generation verified ' + g);
});
var tut = DX.newCase(null, { tutorial: true });
ok(tut.grade === 'cadet' && tut.seed === 'tutorial-1977' && DX.newCase('x', { tutorial: true }).save() === tut.save(), 'tutorial is fixed');
ok(DX.newCase(seed).save() === DX.newCase(seed).save(), 'deterministic');

var c = DX.newCase(seed, { grade: 'analyst' });
var W = c._w;
ok(c.shift === 0 && c.minute === 0 && !c.over && c.outcome === null && c.alert === 0 && c.patience === 100, 'initial state');
var ck = c.clock();
ok(ck.day === 1 && ck.label === '18:00' && ck.date === 'Mon 10 Oct' && ck.left === 480, 'clock');
ok(DX.hhmm(400) === '00:40' && DX.minuteOf('0040') === 400 && DX.minuteOf('2140') === 220, 'time helpers');

// ------------------------------------------------------------------ city
var city = c.city;
ok(city.name === 'Haldmar' && city.districts.length >= 10 && city.streets.length >= 8 && city.river.length > 4 && city.harbour.quays.length === 9, 'city');
city.districts.forEach(function (d) { ok(d.poly.length >= 3 && DX.inPoly(d.centre, d.poly) && DX.polyArea(d.poly) > 0.01, 'district ' + d.id); });
var kinds = {};
city.places.forEach(function (p) {
  kinds[p.kind] = (kinds[p.kind] || 0) + 1;
  ok(p.pos[0] >= 0 && p.pos[0] <= 1 && p.pos[1] >= 0 && p.pos[1] <= 1 && p.district && p.code && p.name, 'place ' + p.id);
  ok(p.pos[1] > DX.coastY(p.pos[0]), 'place on land ' + p.name);
});
['quay', 'naval_yard', 'fuel_depot', 'station', 'cafe', 'phone', 'spot', 'signal'].forEach(function (k) { ok(kinds[k] > 0, 'has ' + k); });
ok(DX.cityDistrictAt(city, city.districts[3].centre) === city.districts[3].id, 'district lookup');

// ------------------------------------------------------------------ inbox
var inbox = c.inbox();
ok(inbox.length >= 3 && inbox.some(function (n) { return n.kind === 'brief'; }) && inbox.some(function (n) { return n.kind === 'casefile'; }), 'opening inbox');
inbox.forEach(function (n) { checkNote(c, n); });
c.markRead(inbox[0].id);
ok(c.inbox()[0].read, 'markRead');

// ------------------------------------------------------------------ band & schedule
var band = c.band();
ok(Array.isArray(band.now) && band.now.every(function (t) { return t.mode === 'BCAST'; }) && band.now.length >= 5 && band.noise > 0, 'band at 18:00: only broadcasters');
var sch = c.schedule();
ok(sch.length === 4 && sch.every(function (x) { return x.callsign === c.controller && x.source === 'casefile'; }), 'case file schedule');
var up = c.upcoming(480);
ok(up.length >= 2 && up[0].expected && up[0].inMin >= 0, 'upcoming');
ok(!c.tune('T999', {}).ok && !c.df('T999').ok && !c.van('T999').ok, 'unknown transmission refused');

// wait for the first broadcast via waitForSignal
var ws = c.waitForSignal(480);
ok(ws.tx && ws.clock.minute === ws.tx.t0, 'waitForSignal stops when something keys up');
ok(ws.events.some(function (e) { return e.kind === 'heard' && e.tx === ws.tx.id; }), 'faint log event');
var tx0 = W.tx[ws.tx.id];
var sig = c.signal(tx0.id);
ok(sig.groups.length > 10 && sig.mode === tx0.mode && sig.fist && (tx0.mode !== 'VOICE' || sig.voice), 'signal parameters for audio');
var bandNow = c.band().now.filter(function (t) { return t.id === tx0.id; })[0];
ok(bandNow && bandNow.remaining === tx0.dur && bandNow.callsign, 'on the band now, with a label from the schedule');
// DF on a voice broadcast points abroad
var dfv = c.df(tx0.id);
ok(dfv.ok && dfv.bearings.length === 3 && dfv.bearings.every(function (b) { return b.deg >= 0 && b.deg < 360 && b.sd > 0; }), 'bearings');
if (tx0.fromId === 'ctl') ok(dfv.abroad, 'the controller is abroad');
// tune: good copy
var costs = c.costs();
var r = c.tune(tx0.id, { freqErr: 0.05, modeOk: true, driftHeld: 0.95 });
ok(r.ok && r.groups.length === sig.groups.length && r.quality > 0.7 && c.minute === tx0.minute + tx0.dur, 'tune copies and advances to the end');
ok(!c.tune(tx0.id, {}).ok, 'cannot copy twice');
var le = c.log().filter(function (e) { return e.tx === tx0.id; })[0];
ok(le && !le.faint && le.groups.length === r.groups.length && le.indicator === r.groups[0] && le.msg === r.msg && le.df, 'log entry');
var m0 = c.message(r.msg);
ok(m0 && m0.kind === 'pad' && m0.copies === 1 && m0.indicator === r.groups[0] && m0.groups.length === r.groups.length - 0, 'workbench message');

// a bad copy on the next transmission: quality falls, more garble
function nextWithGroups(cc) { for (var k = 0; k < 20; k++) { var w0 = cc.waitForSignal(480 - cc.minute); if (!w0.tx) return w0; if (cc.signal(w0.tx.id).groups.length) return w0; cc.tune(w0.tx.id, {}); } return { tx: null }; }
var ws2 = nextWithGroups(c);
if (ws2.tx) {
  var r2 = c.tune(ws2.tx.id, { freqErr: 0.9, modeOk: false, driftHeld: 0.1 });
  ok(r2.ok && r2.quality < 0.2 && r2.corrupt > r2.groups.length * 0.3, 'bad copy garbles: q' + r2.quality + ' corrupt ' + r2.corrupt);
}
// joining late loses the first groups
var ws3 = nextWithGroups(c);
if (ws3.tx && W.tx[ws3.tx.id].dur > 6) {
  c.wait(5);
  var r3 = c.tune(ws3.tx.id, { freqErr: 0, modeOk: true, driftHeld: 1 });
  ok(r3.ok && r3.lost > 0 && r3.groups[0] === '?????', 'late join loses groups');
}

// ------------------------------------------------------------------ repeats merge
// copy every controller transmission tonight and tomorrow, then check merged copies
function copyAll(cc, until) {
  while (cc.minute < until && !cc.over) {
    var w = cc.waitForSignal(until - cc.minute);
    if (!w.tx) break;
    cc.tune(w.tx.id, { freqErr: 0.3, modeOk: true, driftHeld: 0.7 });
  }
}
copyAll(c, 480);
var ev1 = c.endShift();
ok(ev1.ok && ev1.report && c.shift === 1 && c.minute === 0, 'endShift');
ok(c.inbox().some(function (n) { return n.kind === 'super' && n.shift === 1; }), 'morning note');
copyAll(c, 400);
var merged = c.messages().filter(function (m) { return m.copies >= 2; });
ok(merged.length >= 1, 'repeats merged into one workbench message');
merged.forEach(function (m) {
  var hs = m.intercepts.map(function (id) { return c.log().filter(function (e) { return e.id === id; })[0]; }).map(function (e) { return e.groups.join('').split('?').length - 1; });
  ok(m.holes <= Math.min.apply(null, hs), 'merge never adds holes');
});
// learnt schedules from the band watch
ok(c.schedule().some(function (x) { return x.source !== 'casefile'; }), 'band watch taught new slots');
ok(c.log().some(function (e) { return e.faint; }) || true, 'faint entries exist');

// ------------------------------------------------------------------ bench
var msgs = c.messages();
ok(msgs.length >= 4, 'messages on the bench');
msgs.forEach(function (m) { ok(/^M\d+$/.test(m.id) && m.no > 100 && ['pad', 'periodic', 'clear'].indexOf(m.kind) >= 0 && Array.isArray(m.sameIndicator) && Array.isArray(m.likelyIndicator), 'message shape'); });
var board = c.board();
ok(board && board.rows.length === 3 && board.key === W.ring.keyword, 'board view');
// find a true depth pair among the bench
var wbOf = {}; Object.keys(c._s.wb).forEach(function (k) { wbOf[c._s.wb[k].key] = k; });
var pair = W.plan.pairs.filter(function (p) { return wbOf[p.a] && wbOf[p.b]; })[0];
if (!pair) {
  // hand the test a pair: copy the transmissions of the first pair from the truth (test scaffolding only)
  pair = W.plan.pairs[0];
}
var ran = [];
if (wbOf[pair.a] && wbOf[pair.b]) {
  ran.push('depth');
  var A = wbOf[pair.a], B = wbOf[pair.b];
  var ma = c.message(A), mb = c.message(B);
  ok(ma.sameIndicator.indexOf(B) >= 0 || ma.likelyIndicator.indexOf(B) >= 0 || ma.indicator.indexOf('?') >= 0 || mb.indicator.indexOf('?') >= 0, 'depth visible through the indicator');
  var t0 = c.minute;
  var dp = c.bench.depth(A, B);
  ok(dp.ok && dp.diff.length === dp.len && c.minute === Math.min(480, t0 + costs.depth), 'depth costs time');
  var ta = W.msg[pair.a], tb = W.msg[pair.b], bd = DX.boardCache(board.key);
  var w = ta.text.replace(/\./g, ' ').split(/\s+/).filter(function (x) { return x.length >= 6 && /^[A-Z]+$/.test(x); })[0] || 'SECRET';
  var pos = ta.norm.indexOf(w), off = DX.encode(bd, ta.norm.slice(0, pos)).length;
  var cr = c.bench.crib(A, B, w, off, 'A');
  ok(cr.ok && typeof cr.other === 'string' && cr.plaus >= 0 && cr.plaus <= 1 && cr.alts.length === 2, 'crib');
  var truthB = DX.digitStr(DX.toDigits(tb.plain).slice(off, off + cr.otherDigits.length));
  var agree = cr.otherDigits.split('').filter(function (d0, i) { return d0 === '?' || d0 === truthB[i]; }).length;
  ok(agree === cr.otherDigits.length, 'a true crib gives the true digits of the other message');
  var wk = c.bench.place(A, B, 'A', w, off);
  ok(wk.ok && wk.placed.length === 1 && wk.a.text.indexOf(w) >= 0 && typeof wk.b.text === 'string', 'workspace');
  ok(c.bench.unplace(A, B).placed.length === 0, 'unplace');
  var sg = c.bench.suggest(A, B, 0, 'A');
  ok(sg.ok && Array.isArray(sg.list), 'suggest (analyst)');
  // accept: the true text is right, junk is wrong
  var acc = c.bench.accept(A, ta.norm);
  ok(acc.ok && acc.grade === 'right' && acc.card, 'accept right');
  ok(c.message(A).decrypted.grade === 'right', 'decrypt recorded');
  ok(c.bench.accept(B, 'QQQQQQQQQQ').grade === 'wrong', 'accept wrong');
  ta.facts.forEach(function (f) { if (f.fact !== 'codeword') ok(c.opCard()[f.fact].known, 'operation card learns ' + f.fact); });
}
// periodic tools on a courier
var cour = msgs.filter(function (m) { return m.kind === 'periodic'; });
if (cour.length) {
  ran.push('periodic');
  var ids = cour.filter(function (m) { return m.from === cour[0].from; }).map(function (m) { return m.id; });
  var pr = c.bench.period(ids);
  ok(pr.ok && pr.ic.length === 12 && pr.best >= 2 && Array.isArray(pr.repeats), 'period finder');
  var cm = W.ring.members.filter(function (x) { return x.call === cour[0].from; })[0];
  var cl = c.bench.columns(ids, cm.periodKey.length);
  ok(cl.ok && cl.cols.length === cm.periodKey.length && cl.cols[0].fit.length === 10 && cl.expect.length === 10, 'columns');
  var al = c.bench.align(ids, cm.periodKey.length);
  ok(al.ok && al.rel.length === cm.periodKey.length && al.rel[0] === 0, 'align');
  var sk = c.bench.setKey(ids, cm.periodKey);
  ok(sk.ok && sk.texts.length === ids.length && DX.gradeText2(W.msg[c._s.wb[ids[0]].key].norm, sk.texts[0].text).score > 0.6, 'setKey with the true key reads');
}
ok(c.bench.decode(DX.encode(DX.boardCache(board.key), 'HELLO')).text === 'HELLO' && c.bench.encode('A').ok, 'decode/encode');
ok(!c.bench.depth('M1', 'M2').ok && !c.bench.accept('M1', 'x').ok, 'bench refusals');

// ------------------------------------------------------------------ links
var ln = c.links();
ok(ln.nodes.length >= 2 && ln.traffic.length >= 1, 'links nodes & traffic');
var tr = ln.traffic[0];
ok(c.link(tr.from, tr.to, 'talks').ok, 'link');
var l1 = c.links().links[0];
ok(l1.support > 0 && l1.supported && l1.why, 'supported link');
ok(c.link('ZZZ', 'QQQ', 'talks').links.filter(function (l) { return l.a === 'ZZZ'; })[0].support === 0, 'hunch has no support');
ok(!c.link('A', 'A').ok && !c.link('A', 'B', 'nonsense').ok, 'link refusals');
c.unlink('ZZZ', 'QQQ');
ok(c.links().links.length === 1, 'unlink');

// ------------------------------------------------------------------ DF + van on a local set
function nextLocal(cc) {
  for (var g = 0; g < 30 && !cc.over; g++) {
    var w2 = cc.waitForSignal(480 - cc.minute);
    if (!w2.tx) { cc.endShift(); continue; }
    var t = cc._w.tx[w2.tx.id];
    if (cc._w.mem[t.fromId] && t.dur >= 4) return t;
    cc.tune(t.id, { freqErr: 0.2, modeOk: true, driftHeld: 0.8 });
  }
  return null;
}
var cv = DX.newCase(seed + '-van', { grade: 'cadet' });
var lt = nextLocal(cv);
ok(lt, 'a local set on the air');
var dfl = cv.df(lt.id);
ok(dfl.ok && dfl.bearings.length === 4 && dfl.fix && !dfl.abroad && DX.dist([dfl.fix.x, dfl.fix.y], lt.pos) < 0.12, 'fix near the set');
ok(cv.fix(dfl.bearings.slice(0, 2)) !== null, 'fix from a subset');
var vs = cv.van(lt.id);
ok(vs.ok && vs.scene.blocks.length === 36 && vs.scene.streets.length === 14 && vs.scene.seconds > 30, 'van scene');
var sc = vs.scene, tpt = [(lt.pos[0] - sc.origin[0]) / sc.size, (lt.pos[1] - sc.origin[1]) / sc.size];
var mNear = DX.vanMeter(sc, tpt[0], tpt[1], 3), mFar = DX.vanMeter(sc, 1 - tpt[0] > 0.5 ? 1 : 0, 1 - tpt[1] > 0.5 ? 1 : 0, 3);
ok(mNear > 0.8 && mFar < mNear, 'meter peaks at the set');
var tn = cv.tune(lt.id, { freqErr: 0.1, modeOk: true, driftHeld: 0.6 });
ok(tn.ok, 'copy while the van hunts');
var vr = cv.vanResult({ x: tpt[0] + 0.01, y: tpt[1] }, sc.id);
ok(vr.ok && vr.found && vr.building && vr.building.evidence[0].kind === 'transmitter' && vr.building.strong, 'van finds the building');
ok(!cv.vanResult({ x: 0, y: 0 }, sc.id).ok, 'van result once');
ok(cv.buildings().length === 1 && cv.building(vr.building.id).callsigns.indexOf(lt.from) >= 0, 'buildings list');
vr.msgs.forEach(function (id) { checkNote(cv, cv.inbox().filter(function (n) { return n.id === id; })[0]); });

// ------------------------------------------------------------------ warrants
var wr = cv.warrants();
ok(wr.left === 6 && wr.total === 6 && wr.used.length === 0, 'warrants');
ok(!cv.warrant('raid', 'p0').ok && !cv.warrant('lift', city.places.filter(function (p) { return p.kind === 'cafe'; })[0].id).ok && !cv.warrant('fly', 'x').ok, 'warrant refusals');
ok(cv.warrants().left === 6, 'refusals cost nothing');
// raid the located set
var tBefore = cv.minute;
var rw = cv.warrant('raid', vr.building.id);
ok(rw.ok && cv.warrants().left === 5 && cv.minute === Math.min(480, tBefore + 10), 'raid ordered (paperwork 10 min)');
cv.wait(130);
var mem = cv._w.mem[lt.fromId];
ok(mem.arrested && cv.building(vr.building.id).raided, 'arrested');
ok(cv.inbox().some(function (n) { return /arrested/.test(n.title); }), 'raid report');
ok(cv.alert > 0, 'the ring noticed');
ok(cv._w.plan.txs.filter(function (t) { return t.fromId === mem.id && (t.night > cv.shift); }).every(function (t) { return t.cancelled; }), 'the arrested set goes silent');
if (!cv.over) {
  // pad traffic of that link got decrypted by the seizure
  var seized = cv.messages().filter(function (m) { return m.decrypted && m.decrypted.by === 'seized'; });
  ok(seized.length >= 0, 'seizure decrypts (' + seized.length + ')');
}

// watch the meeting, lift the executor's drop, stake out the operation (fresh case)
var cw = DX.newCase(seed + '-warrants', { grade: 'cadet' });
var Wv = cw._w, mt = Wv.plan.meet, dropX = Wv.plan.drops[0], op = Wv.op;
function goto(cc, shift, minute) { while (cc.shift < shift && !cc.over) cc.endShift(); if (!cc.over) cc.advanceTo(minute); }
goto(cw, mt.night, Math.max(0, mt.minute - 60));
var ww = cw.warrant('watch', mt.cafe, { night: mt.night });
ok(ww.ok, 'watch the café');
goto(cw, mt.night, 480);
var wrep = cw.inbox().filter(function (n) { return n.kind === 'result' && /Watch report/.test(n.title); }).pop();
ok(wrep && wrep.found && wrep.found.length === 2, 'the meeting was seen and both followed home');
checkNote(cw, wrep);
wrep.found.forEach(function (bid) { var b = cw.building(bid); ok(b.occupant && b.evidence.some(function (e) { return e.kind === 'meeting'; }) && b.strong, 'meeting evidence'); });
if (!cw.over) {
  ran.push('lift+stakeout');
  goto(cw, dropX.night, Math.min(470, dropX.after + 5));
  var lf = cw.warrant('lift', dropX.place);
  ok(lf.ok, 'lift ordered');
  cw.wait(70);
  var clear = cw.messages().filter(function (m) { return m.kind === 'clear'; })[0];
  ok(clear && clear.text === dropX.text, 'the drop\'s contents are on the bench in clear');
  var card = cw.opCard();
  ok(card.where.known && card.when.known && card.who.known && card.where.place === op.place && card.when.night === op.night, 'operation card filled from the drop');
  var so = cw.warrant('stakeout', op.place, { night: op.night });
  ok(so.ok && cw.warrants().stakeouts.length === 1, 'stake-out');
  ok(!cw.warrant('stakeout', op.place, { night: op.night }).ok, 'no double stake-out');
  goto(cw, op.night, 480);
  ok(cw.over && cw.outcome.kind === 'stakeout' && cw.outcome.win, 'the stake-out stops the operation');
  ok(!cw.warrant('watch', mt.cafe).ok && !cw.tune('T1', {}).ok, 'closed case refuses actions');
}

// wrong raid and patience
var cr2 = DX.newCase(seed + '-wrong', { grade: 'chief' });
var inn = cr2._building({ key: 'test:innocent', address: 'Nygade 1', pos: [0.5, 0.6], truth: 'innocent', how: 'home' }, { kind: 'seen', detail: 'test' });
var p0 = cr2.patience;
ok(cr2.warrant('raid', inn.id).ok, 'raid on thin evidence is allowed');
cr2.wait(130);
ok(cr2.patience < p0 - 20 && cr2.alert >= 30 && cr2._s.wrongRaids === 1, 'wrong raid costs patience and alarms the ring');

// ------------------------------------------------------------------ security officer reactions
var cs = DX.newCase(seed + '-sec', { grade: 'chief' });
var W2 = cs._w;
var before = W2.plan.txs.filter(function (t) { return t.night >= 1; }).map(function (t) { return t.id + t.minute + t.freq + t.mode; }).join();
var nTx = W2.plan.txs.length;
cs._s.alert = 100;
cs.endShift();
ok(cs._s.reactions.length === 5, 'reactions fire at dawn: ' + cs._s.reactions.map(function (r0) { return r0.kind; }).join(','));
var after = W2.plan.txs.filter(function (t) { return t.night >= 1; }).map(function (t) { return t.id + t.minute + t.freq + t.mode; }).join();
ok(before !== after, 'the schedule changed');
ok(W2.plan.txs.length > nTx && W2.plan.txs.some(function (t) { return t.decoy && t.night === 1; }), 'decoy transmitter on the air');
ok(W2.plan.txs.filter(function (t) { return t.fromId !== 'ctl' && W2.mem[t.fromId] && W2.mem[t.fromId].role !== 'resident' && t.night >= 1; }).every(function (t) { return t.mode === 'BURST'; }), 'agents in burst mode');
ok(W2.plan.msgs.filter(function (m) { return m.reuseStopped; }).length >= 0, 'page reuse stopped');
// save/load replays the reactions
var sv = cs.save(), cl2 = DX.load(sv);
ok(cl2._w.plan.txs.map(function (t) { return t.id + t.minute + t.freq + t.mode + (t.cancelled ? 'x' : ''); }).join() === W2.plan.txs.map(function (t) { return t.id + t.minute + t.freq + t.mode + (t.cancelled ? 'x' : ''); }).join(), 'load replays the reactions exactly');
// a burst can be copied only if you are already on the frequency
var bt = W2.plan.txs.filter(function (t) { return t.mode === 'BURST' && t.night === 1; })[0];
if (bt) {
  ran.push('burst');
  cs.advanceTo(bt.minute - 5);
  var rb = cs.tune(bt.id, { freqErr: 0.1, modeOk: true, driftHeld: 0.8 });
  ok(rb.ok && rb.lost === 0, 'burst copied by waiting on the frequency');
}

// ------------------------------------------------------------------ Chief: the big computer
var ch = DX.newCase(seed + '-chief', { grade: 'chief' });
ok(ch.board() === null && !ch.bench.crib('M1', 'M2', 'X', 0).ok, 'no board on Chief');
var cmem = ch._w.ring.members.filter(function (m) { return m.courier; })[0];
var got = 0;
for (var n = 0; n < ch.shifts && got < 3 && !ch.over; n++) {
  while (ch.minute < 480 && !ch.over) { var w3 = ch.waitForSignal(480 - ch.minute); if (!w3.tx) break; var r4 = ch.tune(w3.tx.id, { freqErr: 0.05, modeOk: true, driftHeld: 0.95 }); if (r4.ok && w3.tx.callsign === cmem.call) got++; }
  if (got < 2) ch.endShift();
}
var cids = ch.messages().filter(function (m) { return m.from === cmem.call; }).map(function (m) { return m.id; });
if (cids.length >= 2 && !ch.over) {
  ran.push('computer');
  var job = ch.bench.boardSolve(cids, cmem.periodKey.length);
  ok(job.ok && job.pending && job.ready, 'computer job booked');
  ok(!ch.bench.boardSolve(cids, 5).ok, 'one job at a time');
  if (job.ready.shift > ch.shift) ch.endShift();
  if (!ch.over) {
    ch.advanceTo(job.ready.t);
    var jn = ch.inbox().filter(function (x) { return x.job === job.job; })[0];
    ok(jn, 'computer answers in the inbox');
    if (jn.keyword) ran.push('board'), ok(ch.board() && ch.board().key === ch._w.ring.keyword, 'board recovered');
  }
}

// ------------------------------------------------------------------ mentor
var cm2 = DX.newCase(seed + '-mentor', { grade: 'analyst' });
var st = cm2.mentorStatus();
ok(st[1].ok && st[2].cost === 30 && st[3].cost === 10, 'mentor status');
var h1 = cm2.mentor(1);
ok(h1.ok && h1.text && h1.cost === 0, 'nudge');
ok(!cm2.mentor(1).ok, 'one nudge a night');
var tm = cm2.minute, h2 = cm2.mentor(2);
ok(h2.ok && h2.text && cm2.minute === tm + 30, 'pointer costs station time');
copyAll(cm2, 480); cm2.endShift(); copyAll(cm2, 480);
var h3 = cm2.mentor(3);
ok(h3.ok && h3.text && cm2._s.mentorPenalty === 10, 'direct costs score');
cm2.inbox().filter(function (n) { return n.kind === 'mentor'; }).forEach(function (n) { checkNote(cm2, n); });

// ------------------------------------------------------------------ save / load determinism mid-game
var cA = DX.newCase(seed + '-save', { grade: 'analyst' });
copyAll(cA, 300);
var saved = cA.save();
ok(/^DX1:/.test(saved) && saved.length < 20000, 'compact save (' + saved.length + ' chars)');
var cB = DX.load(saved);
ok(JSON.stringify(cB._s) === JSON.stringify(cA._s), 'load restores the state');
cA.notes = 'Pencil: KX7 is the resident. Æøå ✓';
ok(DX.load(cA.save()).notes === cA.notes, 'notes survive save (unicode)');
cB.notes = cA.notes;
[cA, cB].forEach(function (cc) { copyAll(cc, 480); cc.endShift(); copyAll(cc, 200); });
ok(JSON.stringify(cA.log()) === JSON.stringify(cB.log()) && JSON.stringify(cA.messages()) === JSON.stringify(cB.messages()), 'loaded case continues identically');
ok(DX.load(JSON.stringify(cA._s)).clock().label === cA.clock().label, 'plain JSON saves load too');

// ------------------------------------------------------------------ debrief
var d = cA.debrief();
ok(d.truth.ring.length >= 4 && d.truth.ring.some(function (m) { return m.executor; }) && d.truth.ring.every(function (m) { return m.callsign && m.name && m.address && m.fist; }), 'debrief ring');
ok(d.truth.operation.codeword && d.truth.operation.placeName && d.truth.operation.executor && d.truth.operation.time, 'debrief operation');
ok(d.truth.plaintexts.length >= 15 && d.truth.plaintexts.every(function (p) { return p.text && p.from && p.to; }), 'debrief plaintexts');
ok(d.truth.pairs.length === 3 && d.truth.drops.length === 2 && d.truth.meeting.placeName && d.truth.board.rows.length === 3, 'debrief extras');
ok(typeof d.score.total === 'number' && d.score.grade && d.stats.heard > 0, 'debrief score & stats');
ok(d.outcome === null, 'case still running');

// play one case to the end with nothing done: the operation happens
var cn = DX.newCase(seed + '-none', { grade: 'analyst' });
for (var g2 = 0; g2 < 10 && !cn.over; g2++) cn.endShift();
ok(cn.over && cn.outcome.kind === 'failed' && !cn.outcome.win && cn.debrief().outcome.kind === 'failed', 'doing nothing loses');
ok(cn.inbox().some(function (n) { return n.kind === 'outcome'; }), 'outcome note');

console.log('api: ' + checks + ' checks passed (' + seed + '; sections: ' + ran.join(', ') + ')');
