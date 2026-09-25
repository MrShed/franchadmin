/* DEPTH engine — 08-mentor.js
 * The night supervisor (DX.MENTOR_INFO). Hints are driven by what the PLAYER holds: the log, the bench, the
 * operation card, located buildings, warrants. She never mentions a message that has not been copied or a fact
 * that has not been read; everything she says is true.
 *   c.mentorStatus() -> {1:{ok, cost, why}, 2:{...}, 3:{...}, used}
 *   c.mentor(tier) -> {ok, tier, text, refs, action?, cost}
 *     tier 1 (nudge): free, one per shift, a general direction.
 *     tier 2 (pointer): costs station minutes (grade), names the exact thing.
 *     tier 3 (direct): costs score (grade), does it where it can (reads a depth pair or a courier's traffic,
 *                      files the obvious stake-out) or gives the precise instruction.
 */
(function () {
  'use strict';
  var CP = DX.Case.prototype;
  function ref(t, id, d) { return { t: t, id: id, d: d }; }

  /** ranked advice from the player's holdings */
  CP._advice = function () {
    var c = this, s = this._s, W = this._w, out = [];
    var msgs = this.messages(), card = this.opCard(), wr = this.warrants();
    var ctl = W.ring.controller.call;
    var undec = function (m) { return !m.decrypted || m.decrypted.grade === 'wrong'; };
    // 1. the operation card is complete enough to act
    var so = s.stakeouts.map(function (x) { return x.place + '@' + x.night; });
    if (card.where.known && card.when.known && card.where.place && card.when.night !== null && so.indexOf(card.where.place + '@' + card.when.night) < 0 && wr.left > 0 && card.when.night >= s.shift) {
      var pl = W.place[card.where.place];
      out.push({ pri: 100, key: 'stake', nudge: 'You know where and when. Special Branch can be waiting.',
        pointer: ['Put a stake-out on ', ref('place', pl.id, pl.name), ' for the night of ' + DX.dateLabel(card.when.night) + '.'],
        act: function () { var r = c.warrant('stakeout', pl.id, { night: card.when.night }); return r.ok ? 'Filed: stake-out at ' + pl.name + ', ' + DX.dateLabel(card.when.night) + '.' : null; } });
    }
    // 2. the executor's callsign is known: locate and raid
    if (card.who.known) {
      var call = card.who.callsign;
      var b = this.buildings().filter(function (x) { return x.callsigns.indexOf(call) >= 0 && !x.raided; })[0];
      if (b && wr.left > 0) out.push({ pri: 95, key: 'raid', nudge: 'You have found the one who will do it. Why is he still at home?',
        pointer: ['Raid ', ref('building', b.id, b.address), ': ', ref('callsign', call, call), ' was traced there.'],
        act: function () { var r = c.warrant('raid', b.id); return r.ok ? 'Raid requested on ' + b.address + '.' : null; } });
      else if (!b) {
        var sl = this.schedule().filter(function (x) { return x.callsign === call; })[0];
        out.push({ pri: 80, key: 'locate', nudge: 'A name without an address is no use to Special Branch.',
          pointer: sl ? ['Wait for ', ref('callsign', call, call), ' on ' + sl.freq.toFixed(3) + ' MHz at ' + sl.label + ': bearings first, then the van.'] : ['Keep the band watch on until ', ref('callsign', call, call), ' comes up, then take bearings and send the van.'] });
      }
    }
    // 3. depth pairs on the bench
    var seenPair = {};
    msgs.forEach(function (m) {
      (m.sameIndicator || []).forEach(function (o) {
        var k = [m.id, o].sort().join('|');
        if (seenPair[k]) return; seenPair[k] = 1;
        var om = c.message(o);
        if (!undec(m) && !undec(om)) return;
        out.push({ pri: 70, key: 'depth:' + k, nudge: 'Look at the indicator groups on your bench. Two of them are the same.',
          pointer: ['Messages ', ref('msg', m.id, String(m.no)), ' and ', ref('msg', o, String(om.no)), ' share indicator ' + m.indicator + '. Put them in depth and drag the usual opening along: they all start the same way.'],
          act: s.board ? function () { c._mentorRead(m.id); c._mentorRead(o); return 'Read messages ' + m.no + ' and ' + om.no + ' for you.'; } : null });
      });
    });
    // 4. courier traffic
    var byFrom = {};
    msgs.filter(function (m) { return m.kind === 'periodic' && undec(m); }).forEach(function (m) { (byFrom[m.from] = byFrom[m.from] || []).push(m); });
    Object.keys(byFrom).forEach(function (f) {
      var list = byFrom[f];
      var cm = W.ring.members.filter(function (x) { return x.call === f; })[0];
      var period = cm && cm.periodKey ? cm.periodKey.length : null;
      if (list.length < 2 && !(list.length && list[0].length > 40)) return;
      if (!s.board) out.push({ pri: 75, key: 'board:' + f, nudge: 'Without the checkerboard nothing reads. The courier\'s hand cipher is the way in.',
        pointer: ['Pool ', ref('callsign', f, f), '\'s messages, find the period (it is ' + period + '), and book the big computer with it.'],
        act: function () { var r = c.bench.boardSolve(list.map(function (x) { return x.id; }), period); return r.ok ? 'The computer found keyword ' + r.keyword + '.' : null; } });
      else out.push({ pri: 60, key: 'periodic:' + f, nudge: 'The courier traffic has no indicator group. That means a short repeating key, and those break.',
        pointer: [ref('callsign', f, f), ' uses a key of period ' + period + '. Pool his messages, count each column against the checkerboard.'],
        act: function () { list.forEach(function (m) { c._mentorRead(m.id); }); return 'Read ' + list.length + ' courier message' + (list.length > 1 ? 's' : '') + ' for you.'; } });
    });
    // 5. drops and meetings read but not acted on
    msgs.forEach(function (m) {
      if (!m.decrypted || m.decrypted.grade === 'wrong') return;
      var tm = W.msg[s.wb[m.id].key];
      if (!tm) return;
      if (tm.beat === 'MEET') {
        var mt = W.plan.meet, cafe = W.place[mt.cafe];
        if (mt.night >= s.shift && !s.warrants.some(function (w) { return w.target === cafe.id && w.night === mt.night; }) && wr.left > 0)
          out.push({ pri: 85, key: 'meet', nudge: 'Somebody is meeting somebody. Be there.', pointer: ['Watch ', ref('place', cafe.id, cafe.name), ' on the night of ' + DX.dateLabel(mt.night) + ': message ', ref('msg', m.id, String(m.no)), ' arranges a meeting there.'],
            act: function () { var r = c.warrant('watch', cafe.id, { night: mt.night }); return r.ok ? 'Watch filed on ' + cafe.name + '.' : null; } });
      }
      W.plan.drops.forEach(function (d) {
        var sp = W.place[d.place];
        if (tm.norm.indexOf(DX.norm(sp.code)) < 0 || d.lifted) return;
        var endAbs = d.collect.night * 480 + d.collect.minute, nowAbs = s.shift * 480 + s.minute;
        if (nowAbs >= endAbs || wr.left <= 0) return;
        out.push({ pri: d.contents === 'exec' ? 90 : 50, key: 'drop:' + d.id, nudge: 'A dead drop is a letter you can read before it is collected.',
          pointer: [ref('place', sp.id, sp.name), ' is loaded on the night of ' + DX.dateLabel(d.night) + ' after ' + DX.hhmm(d.after) + ' and cleared the next evening. Lift it in between, or watch it on the evening it is cleared.'] });
      });
    });
    // 6. garbled controller copies whose repeat is still to come
    msgs.forEach(function (m) {
      if (m.kind !== 'pad' || m.holes === 0 || m.copies > 1 || m.from !== ctl) return;
      var first = m.first, slot = first.t + 15;
      if (first.shift + 1 >= W.G.shifts || first.shift < s.shift - 0) return;
      out.push({ pri: 40, key: 'repeat:' + m.id, nudge: 'The controller repeats himself. Garbled groups can be mended.',
        pointer: ['Message ', ref('msg', m.id, String(m.no)), ' has ' + m.holes + ' lost figures. It is repeated on ' + DX.dateLabel(first.shift + 1) + ' at ' + DX.hhmm(slot) + '.'] });
    });
    // 7. something due soon
    var up = this.upcoming(60).filter(function (x) { return x.inMin >= 0; })[0];
    if (up) out.push({ pri: 20, key: 'up', nudge: 'Something is due on the band within the hour.', pointer: [ref('callsign', up.callsign, up.callsign) , ' is due at ' + up.label + ' on ' + up.freq.toFixed(3) + ' MHz.'] });
    out.push({ pri: 1, key: 'listen', nudge: 'Listen and log. The shape of the ring shows up in the log before you can read a word.', pointer: ['Keep the band watch running: every transmission you log teaches you a schedule.'] });
    out.sort(function (a, b) { return b.pri - a.pri; });
    return out;
  };

  /** the mentor reads a message for you: the true text where your copy is sound, holes where it is not */
  CP._mentorRead = function (wid) {
    var s = this._s, W = this._w, wb = s.wb[wid];
    var m = W.msg[wb.key];
    if (!m) { this._accept(wid, '', 'mentor'); return; }
    var dg = this._digitsOf(wid);
    var key = m.cipher === 'pad' ? DX.toDigits(DX._padDigits(W, m)) : m.key;
    var txt = DX.decode(W.ring.board, DX.subKey(dg, key)).text;
    this._accept(wid, txt, 'mentor');
  };

  CP.mentorStatus = function () {
    var s = this._s, G = this._w.G;
    return { 1: { ok: !s.nudged, cost: 0, why: s.nudged ? 'one nudge a night' : '' }, 2: { ok: true, cost: G.mentorCost[2], unit: 'minutes' }, 3: { ok: true, cost: G.mentorCost[3], unit: 'score' }, used: DX.copy(s.mentorUsed) };
  };

  CP.mentor = function (tier) {
    var s = this._s, G = this._w.G;
    tier = tier === 'nudge' ? 1 : tier === 'pointer' ? 2 : tier === 'direct' ? 3 : +tier;
    if ([1, 2, 3].indexOf(tier) < 0) return { ok: false, err: 'tier 1, 2 or 3' };
    if (s.outcome) return { ok: false, err: 'the case is closed' };
    if (tier === 1 && s.nudged) return { ok: false, tier: 1, err: 'She has already given you tonight\'s nudge.' };
    var adv = this._advice();
    var top = adv[0], text, refs = [], action = null, cost = 0;
    if (tier === 1) { text = top.nudge; s.nudged = true; }
    else if (tier === 2) {
      text = top.pointer.map(function (x) { return typeof x === 'string' ? x : x.d; }).join('');
      refs = top.pointer.filter(function (x) { return typeof x !== 'string'; });
      cost = G.mentorCost[2];
    } else {
      // direct: do the first thing she can do; otherwise the precise pointer
      var doable = adv.filter(function (a) { return a.act; })[0];
      if (doable && doable.pri >= top.pri - 30) {
        var done = doable.act();
        if (done) { text = done; action = doable.key; refs = doable.pointer.filter(function (x) { return typeof x !== 'string'; }); }
      }
      if (!text) { text = top.pointer.map(function (x) { return typeof x === 'string' ? x : x.d; }).join(''); refs = top.pointer.filter(function (x) { return typeof x !== 'string'; }); }
      cost = G.mentorCost[3];
      s.mentorPenalty += cost;
    }
    s.mentorUsed[tier]++;
    s.mentorLog.push({ tier: tier, shift: s.shift, t: s.minute, key: top.key, text: text });
    var events = tier === 2 ? this._spend(cost) : [];
    this._post('mentor', tier === 1 ? 'A word from ' + DX.MENTOR_INFO.name : tier === 2 ? DX.MENTOR_INFO.name + ' points' : DX.MENTOR_INFO.name + ' takes over', DX.MENTOR_INFO.name,
      [{ k: 'p', x: tier === 1 ? ['"' + text + '"'] : (tier === 2 ? ['"'].concat(top.pointer).concat(['"']) : ['"' + text + '"']) }]);
    return { ok: true, tier: tier, text: text, refs: refs, action: action, cost: cost, events: events };
  };
})();
