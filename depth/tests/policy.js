// Headless players for DEPTH. They use ONLY the public case API and the station-side tools a human has
// (the bench, the dictionary-driven crib search DX.solveDepth, the periodic tools). They never read c._w (truth).
//   competent: listens to the known schedule and to whatever shows on the waterfall, repairs with repeats,
//              breaks depths and courier traffic, reads the facts out of its own decrypts, takes bearings,
//              sends the van, and spends warrants sensibly. Receiver and van skill are emulated with human error.
//   none:      ends every shift and does nothing.
//   listener:  copies traffic but never breaks anything or asks for warrants.
// Usage from tests: require('./policy.js')(DX).play(c, 'competent', {seed})
module.exports = function (DX) {
  var SH = 480;

  function norm(t) { return DX.norm(t || ''); }

  function play(c, kind, opts) {
    opts = opts || {};
    if (kind === 'none') { var g = 0; while (!c.over && g++ < 20) c.endShift(); return { kind: kind }; }
    var R = DX.rng('policy/' + (opts.seed || c.seed) + '/' + c.grade + '/' + kind);
    var skill = opts.skill || { freqSd: 0.2, modeMiss: 0.03, drift: [0.7, 0.95], van: 1 };
    var P = {
      solvedPairs: {}, pairTries: {}, courierKey: {}, courierTried: {}, readTexts: {}, facts: { where: {}, when: {}, who: {} },
      drops: [], meets: [], cw: null, vanTried: {}, dfDone: {}, log: [], didStake: {}, lifted: {}, watched: {}, raided: {}
    };
    var boardView = c.board();
    function note(x) { P.log.push(c.clock().date + ' ' + c.clock().label + ' ' + x); }

    // ------------------------------------------------------------ the receiver (human error)
    function inputs() {
      return { freqErr: Math.abs(R.normal(0, skill.freqSd)), modeOk: !R.chance(skill.modeMiss), driftHeld: R.range(skill.drift[0], skill.drift[1]) };
    }
    function calls() {
      var set = {};
      c.log().forEach(function (e) { if (e.callsign && !e.test) set[e.callsign] = 1; if (e.to) set[e.to] = 1; });
      return Object.keys(set);
    }
    function ctlSpell() { return DX.norm(c.controller); }

    // ------------------------------------------------------------ listening
    function wantTx(t, copiedMsgs) {
      if (t.mode === 'BCAST') return false;
      var le = c.log().filter(function (e) { return e.tx === t.id; })[0];
      if (le && !le.faint) return false;
      if (t.callsign === 'VVV') return false;
      return true;
    }
    function priority(t) {
      if (!t.callsign) return 3;
      if (t.callsign === c.controller) return 5;
      if (P.facts.who.call && t.callsign === P.facts.who.call) return 6;
      return 4;
    }
    function listenNow() {
      var now = c.band().now.filter(function (t) { return wantTx(t); });
      if (!now.length) return false;
      now.sort(function (a, b) { return priority(b) - priority(a); });
      var t = now[0];
      // DF and the van first (the outstations and the van crew work while we copy)
      var vanJob = null;
      if (t.mode !== 'VOICE' && t.mode !== 'BCAST' && !P.dfDone[t.id]) {
        var d = c.df(t.id);
        P.dfDone[t.id] = d.ok ? d : true;
        if (d.ok) vanJob = maybeVan(t, d);
      }
      var inp = inputs();
      if (vanJob) inp.driftHeld = Math.min(inp.driftHeld, R.range(0.45, 0.7));   // busy on the van radio
      var r = c.tune(t.id, inp);
      if (r.ok) note('copied ' + (t.callsign || '?') + ' ' + r.msg + ' q' + r.quality);
      if (vanJob) { var vr = c.vanResult(vanJob.pt, vanJob.id); note('van on ' + t.callsign + ': ' + vr.kind); }
      return true;
    }

    // ------------------------------------------------------------ the van (human skill)
    function located(call) { return c.buildings().filter(function (b) { return b.callsigns.indexOf(call) >= 0; })[0]; }
    function vanTargets() {
      var list = [];
      if (P.facts.who.call) list.push(P.facts.who.call);
      var res = c.log().filter(function (e) { return e.callsign === c.controller && e.to; })[0];
      if (res) list.push(res.to);
      return list;
    }
    function maybeVan(t, d) {
      var call = t.callsign;
      if (!call || call === c.controller || located(call) || d.abroad || !d.fix) return null;
      var targets = vanTargets();
      var late = c.shift >= c.shifts - 2;
      var want = targets.indexOf(call) >= 0 || (late && c.warrants().left >= 2);
      if (!want) return null;
      if ((P.vanTried[call] || 0) >= 3) return null;
      if (t.remaining < 4) return null;
      P.vanTried[call] = (P.vanTried[call] || 0) + 1;
      var v = c.van(t.id, [d.fix.x, d.fix.y]);
      if (!v.ok) return null;
      return { id: v.scene.id, pt: driveVan(v.scene) };
    }
    function driveVan(sc) {
      // hill-climb along the street grid reading the meter; each block costs ~6 s of the budget
      var time = 0, budget = sc.seconds, cols = sc.cols, rows = sc.rows;
      var cur = [Math.round(sc.start[0] * cols), Math.round(sc.start[1] * rows)], best = -1, visited = {};
      function read(i, j) { time += 6; return DX.vanMeter(sc, i / cols, j / rows, time); }
      var here = read(cur[0], cur[1]);
      best = here;
      var samples = [[cur[0] / cols, cur[1] / rows, here]];
      while (time < budget) {
        visited[cur.join(',')] = 1;
        var moves = [[1, 0], [-1, 0], [0, 1], [0, -1]], bestMove = null, bestVal = here;
        for (var k = 0; k < moves.length && time < budget; k++) {
          var ni = cur[0] + moves[k][0], nj = cur[1] + moves[k][1];
          if (ni < 0 || nj < 0 || ni > cols || nj > rows || visited[ni + ',' + nj]) continue;
          // the needle is watched all the way along the block
          samples.push([(cur[0] + ni) / 2 / cols, (cur[1] + nj) / 2 / rows, DX.vanMeter(sc, (cur[0] + ni) / 2 / cols, (cur[1] + nj) / 2 / rows, time)]);
          var v = read(ni, nj);
          samples.push([ni / cols, nj / rows, v]);
          if (v > bestVal + 0.01) { bestVal = v; bestMove = [ni, nj]; }
          time += 6;   // drive back
        }
        if (!bestMove) break;
        cur = bestMove; here = bestVal;
      }
      // pinpoint: circle the blocks around the best corner, sampling mid-street points
      var cx = cur[0] / cols, cy = cur[1] / rows, h = 0.5 / cols;
      [[h, 0], [-h, 0], [0, h], [0, -h], [h, h * 2], [-h, h * 2], [h, -h * 2], [-h, -h * 2], [2 * h, h], [-2 * h, -h], [2 * h, -h], [-2 * h, h]].forEach(function (o) {
        if (time > budget + 20) return;
        var x = cx + o[0], y = cy + o[1];
        if (x < 0 || y < 0 || x > 1 || y > 1) return;
        time += 4;
        samples.push([x, y, DX.vanMeter(sc, x, y, time)]);
      });
      samples.sort(function (a, b) { return b[2] - a[2]; });
      var top = samples.slice(0, 5), sw = 0, sx = 0, sy = 0;
      top.forEach(function (s) { var w = Math.pow(s[2], 8); sw += w; sx += w * s[0]; sy += w * s[1]; });
      var ex = sx / sw, ey = sy / sw;
      // the crew's skill: extrapolate a little past the strongest reading, towards the gradient
      var jit = 0.04 / (skill.van || 1);
      return { x: DX.clamp(ex + R.normal(0, jit), 0, 1), y: DX.clamp(ey + R.normal(0, jit), 0, 1) };
    }

    // ------------------------------------------------------------ the bench
    function benchCost(k) { return c.costs()[k] || 0; }
    function timeTillNext() {
      var up = c.upcoming(SH).filter(function (x) { return x.minute >= c.minute; })[0];
      return up ? up.minute - c.minute : SH - c.minute;
    }
    function holes(m) { return (m.groups.join('').match(/\?/g) || []).length; }
    function tryDepths() {
      if (!c.board()) return false;
      var msgs = c.messages(), did = false;
      for (var i = 0; i < msgs.length; i++) {
        var m = msgs[i];
        var partners = (m.sameIndicator || []).concat(m.likelyIndicator || []);
        for (var j = 0; j < partners.length; j++) {
          var o = c.message(partners[j]);
          if (o.no < m.no) continue;
          var key = m.id + '|' + o.id, hsig = holes(m) + '/' + holes(o) + '/' + m.copies + '/' + o.copies + '/' + calls().length;
          if (P.pairTries[key] === hsig) continue;
          P.pairTries[key] = hsig;
          solvePair(m, o);
          did = true;
          if (c.over) return true;
        }
      }
      return did;
    }
    function solvePair(m, o) {
      var dep = c.bench.depth(m.id, o.id);
      if (!dep.ok) return;
      var sp = ctlSpell();
      var da = DX.toDigits(m.groups.slice(1).join('')), db = DX.toDigits(o.groups.slice(1).join(''));
      var board = DX.boardCache(c.board().key);
      var r = DX.solveDepth(board, da, db, { calls: calls().concat([sp]), openA: DX.openingCribs(m.from, m.to, sp, c.controller), openB: DX.openingCribs(o.from, o.to, sp, c.controller) });
      if (!r) return;
      // the work at the bench: one crib per word placed
      var n = Math.min(40, r.placements.length);
      c.bench.unplace(m.id, o.id);
      for (var k = 0; k < n && !c.over; k++) {
        while (!c.over && c.minute < SH && listenNow()) act();   // back to the set when a carrier appears
        var p = r.placements[k]; c.bench.crib(m.id, o.id, p.text, p.offset, p.side); c.bench.place(m.id, o.id, p.side, p.text, p.offset);
      }
      if (c.over) return;
      var ga = c.bench.accept(m.id, r.a), gb = c.bench.accept(o.id, r.b);
      P.readTexts[m.id] = { text: r.a, from: m.from, to: m.to }; P.readTexts[o.id] = { text: r.b, from: o.from, to: o.to };
      note('depth ' + m.no + '/' + o.no + ' -> ' + ga.grade + '/' + gb.grade);
      parseAll();
    }
    function tryCouriers() {
      var msgs = c.messages().filter(function (m) { return m.kind === 'periodic'; });
      var by = {};
      msgs.forEach(function (m) { (by[m.from] = by[m.from] || []).push(m); });
      var did = false;
      Object.keys(by).forEach(function (f) {
        if (c.over) return;
        var list = by[f], ids = list.map(function (m) { return m.id; });
        var digits = list.reduce(function (a, m) { return a + m.groups.length * 5; }, 0);
        var key = P.courierKey[f];
        if (key) {
          // read new messages with the known key
          list.forEach(function (m) {
            if (P.readTexts[m.id] && P.readTexts[m.id].holes === holes(m)) return;
            var r = c.bench.setKey(m.id, key.key);
            if (r.ok) { c.bench.accept(m.id, r.text); P.readTexts[m.id] = { text: r.text, from: m.from, to: m.to, holes: holes(m) }; did = true; }
          });
          if (did) parseAll();
          return;
        }
        var sig = ids.join(',') + '/' + list.map(holes).join(',');
        if (P.courierTried[f] === sig) return;
        var need = c.board() ? 150 : 200;
        if (digits < need) return;
        P.courierTried[f] = sig;
        var pr = c.bench.period(ids);
        if (!pr.ok) return;
        var p = pr.best;
        if (!c.board()) {
          // Chief: the big computer
          if (P.job) return;
          var bs = c.bench.boardSolve(ids, p);
          if (bs.ok) { P.job = { id: bs.job, f: f, p: p }; note('big computer booked on ' + f + ' p' + p); }
          return;
        } else {
          var cols = c.bench.columns(ids, p);
          var k0 = cols.cols.map(function (col) { return col.fit[0].shift; });
          var board = DX.boardCache(c.board().key);
          var streams = list.map(function (m) { return DX.toDigits(m.groups.join('')); });
          // the courier's opening habit as a crib: try each usual format with the callsigns from the log
          var starts = [k0];
          DX.openingTexts(f, list[0].to, ctlSpell(), c.controller).forEach(function (ct) {
            var kc = c.bench.keyFromCrib(ids, ct, p);
            if (kc.ok && kc.key) starts.push(kc.key.map(function (x, i) { return x >= 0 ? x : k0[i]; }));
          });
          var rf = null;
          starts.forEach(function (st0) { var r0 = DX.refineKey(streams, board, st0, 2); if (!rf || r0.plaus > rf.plaus) rf = r0; });
          var trials = Math.min(8, Math.ceil(rf.evals / 10));
          for (var t = 0; t < trials; t++) { while (!c.over && c.minute < SH && listenNow()) act(); c.bench.setKey(ids, rf.key); }
          if (rf.plaus < 0.5) { note('courier ' + f + ' did not read (p' + p + ')'); return; }
          P.courierKey[f] = { key: rf.key, period: p };
        }
        list.forEach(function (m) {
          var r = c.bench.setKey(m.id, P.courierKey[f].key);
          if (r.ok) { c.bench.accept(m.id, r.text); P.readTexts[m.id] = { text: r.text, from: m.from, to: m.to, holes: holes(m) }; }
        });
        note('courier ' + f + ' read, key ' + P.courierKey[f].key.join(''));
        did = true;
        parseAll();
      });
      return did;
    }
    function checkJob() {
      if (!P.job) return false;
      var n = c.inbox().filter(function (x) { return x.job === P.job.id; })[0];
      if (!n) return false;
      var j = P.job; P.job = null;
      note('computer: ' + (n.keyword || 'failed'));
      if (!n.keyword) { P.courierTried[j.f] = null; return false; }
      P.courierKey[j.f] = { key: n.key, period: j.p };
      return true;
    }
    function readClear() {
      c.messages().forEach(function (m) { if (m.kind === 'clear' && !P.readTexts[m.id]) { P.readTexts[m.id] = { text: m.text, clear: true }; } });
    }

    // ------------------------------------------------------------ reading the facts out of our own texts
    var places = c.city.places.map(function (p) { return { id: p.id, code: norm(p.code), kind: p.kind, name: p.name }; }).sort(function (a, b) { return b.code.length - a.code.length; });
    var DAYS = DX.CAL.DAY_NAMES;
    function vote(tbl, k, w) { tbl[k] = (tbl[k] || 0) + w; }
    function parseAll() {
      readClear();
      var F = { where: {}, when: {}, who: {} }, cw = {};
      var texts = Object.keys(P.readTexts).map(function (k) { return P.readTexts[k]; });
      // the codeword: OPERATION<CW>
      texts.forEach(function (t) { var m = /OPERATION([A-Z]{4,9}?)(\.|IS|OBJECT)/.exec(norm(t.text)); if (m) vote(cw, m[1], 2); });
      DX.DATA.CODEWORDS.forEach(function (w) { texts.forEach(function (t) { if (norm(t.text).indexOf(w) >= 0) vote(cw, w, 1); }); });
      var CW = Object.keys(cw).sort(function (a, b) { return cw[b] - cw[a]; })[0] || null;
      P.cw = CW;
      var calls2 = calls();
      texts.forEach(function (t) {
        var x = norm(t.text);
        var sentences = x.split('.');
        sentences.forEach(function (s) {
          var opish = (CW && s.indexOf(CW) >= 0) || /TARGET|RECONNAISSANCE|WATCHED|HASSEEN|KNOWS|POSITION|DATEFOR|WILLTAKEPLACE/.test(s) || t.clear;
          if (opish) {
            places.forEach(function (p) {
              if (['cafe', 'spot', 'signal', 'phone'].indexOf(p.kind) >= 0) return;
              var i = s.indexOf(p.code);
              if (i < 0) return;
              // "QUAY 1" must not match inside "QUAY 12" (there is no 12, but be careful with digits)
              if (/[0-9]$/.test(p.code) && /[0-9]/.test(s.charAt(i + p.code.length))) return;
              vote(F.where, p.id, t.clear ? 5 : /TARGETFOR|WILLBEAT|RECONNAISSANCEOF|WATCHED/.test(s) ? 3 : 1);
            });
          }
          var dm = /NIGHTOF([A-Z]+)/.exec(s) || /^([A-Z]+DAY)AT[0-9?]{4}ISGOOD/.exec(s);
          if (dm && (opish || /READY|POSITION|BEFORE/.test(s))) {
            DAYS.forEach(function (d, di) { if (dm[1].indexOf(d) === 0 && di < c.shifts) vote(F.when, di, /MUSTCLEARITBEFORE/.test(s) ? 0.5 : t.clear ? 5 : 3); });
          }
          calls2.forEach(function (cs) {
            if (cs === c.controller) return;
            var re = new RegExp('(CARRIEDOUTBY' + cs + '|' + cs + 'ACCEPTS|' + cs + 'WILLDO|AGREES' + cs + 'FOR|PACKAGEFOR' + cs + '|^FOR' + cs + '$|' + cs + 'WILLBEINPOSITION|' + cs + 'HASTHE)');
            if (re.test(s)) vote(F.who, cs, t.clear ? 5 : 3);
          });
        });
        // an agent who reports reconnaissance / readiness himself is the executor
        if (t.from && t.to && t.from !== c.controller && /RECONNAISSANCEOF|IWILLBEINPOSITION|READYFOR/.test(x) && /FOR|NR/.test(x)) vote(F.who, t.from, 1.5);
        // drops and meetings
        var dmm;
        var reDrop = /PACKAGEFOR([A-Z0-9]{3})ISIN([A-Z0-9]+?)FROM([A-Z]+DAY)AFTER([0-9]{4})/g;
        while ((dmm = reDrop.exec(x))) addDrop(dmm[2], dmm[3], dmm[4], dmm[1], true);
        var reLoad = /LOAD([A-Z0-9]+?)FOR([A-Z0-9]{3})NIGHTOF([A-Z]+DAY)AFTER([0-9]{4})/g;
        while ((dmm = reLoad.exec(x))) addDrop(dmm[1], dmm[3], dmm[4], dmm[2], false);
        var reLoaded = /([A-Z0-9]+?)LOADEDNIGHTOF([A-Z]+DAY)AFTER([0-9]{4})FOR([A-Z0-9]{3})/g;
        while ((dmm = reLoaded.exec(x))) addDrop(dmm[1], dmm[2], dmm[3], dmm[4], false);
        var reMeet = /MEET([A-Z0-9]{3})AT([A-Z]+?)([A-Z]+DAY)AT([0-9]{4})/g;
        while ((dmm = reMeet.exec(x))) addMeet(dmm[2], dmm[3], dmm[4], dmm[1]);
        var reMeet2 = /MEETINGWITH([A-Z0-9]{3})([A-Z]+DAY)([0-9]{4})AT([A-Z]+?)\./g;
        while ((dmm = reMeet2.exec(x + '.'))) addMeet(dmm[4], dmm[2], dmm[3], dmm[1]);
      });
      function best(tbl) { var k = Object.keys(tbl).sort(function (a, b) { return tbl[b] - tbl[a]; })[0]; return k === undefined ? null : { k: k, v: tbl[k] }; }
      var bw = best(F.where), bn = best(F.when), bh = best(F.who);
      P.facts.where = bw && bw.v >= 3 ? { place: bw.k, conf: bw.v } : {};
      P.facts.when = bn && bn.v >= 3 ? { night: +bn.k, conf: bn.v } : bn ? { guess: +bn.k, conf: bn.v } : {};
      P.facts.who = bh && bh.v >= 3 ? { call: bh.k, conf: bh.v } : {};
    }
    function placeByCode(code) {
      for (var i = 0; i < places.length; i++) if (code.indexOf(places[i].code) === 0 || places[i].code === code) return places[i];
      return null;
    }
    function addDrop(spot, day, time, forCall, exec) {
      var p = places.filter(function (pp) { return pp.kind === 'spot' && spot.indexOf(pp.code) === 0; })[0];
      var di = DAYS.indexOf(day);
      var mi = DX.minuteOf(time);
      if (!p || di < 0 || mi === null) return;
      if (P.drops.some(function (d) { return d.place === p.id && d.night === di; })) return;
      P.drops.push({ place: p.id, night: di, after: mi, forCall: forCall, exec: exec });
    }
    function addMeet(cafe, day, time, call) {
      var p = places.filter(function (pp) { return pp.kind === 'cafe' && cafe.indexOf(pp.code) === 0; })[0];
      var di = DAYS.indexOf(day), mi = DX.minuteOf(time);
      if (!p || di < 0) return;
      if (P.meets.some(function (m) { return m.place === p.id && m.night === di; })) return;
      P.meets.push({ place: p.id, night: di, minute: mi, call: call });
    }

    // ------------------------------------------------------------ warrants
    function act() {
      var w = c.warrants();
      if (w.left <= 0 || c.over) return;
      var F = P.facts;
      // 1. stake-out: where and when known
      if (F.where.place && F.when.night !== undefined && F.when.night >= c.shift) {
        var k = F.where.place + '@' + F.when.night;
        if (!P.didStake[k]) { var r = c.warrant('stakeout', F.where.place, { night: F.when.night }); P.didStake[k] = 1; note('stake-out ' + k + ' ' + (r.ok ? 'ok' : r.err)); if (r.ok) return; }
      }
      // 2. raid the executor if located
      if (F.who.call) {
        var b = located(F.who.call);
        if (b && !b.raided && !P.raided[b.id]) { var rr = c.warrant('raid', b.id); P.raided[b.id] = 1; note('raid executor ' + F.who.call + ' ' + (rr.ok ? 'ok' : rr.err)); if (rr.ok) return; }
      }
      w = c.warrants();
      // 3. lift the executor's drop while it is loaded
      P.drops.forEach(function (d) {
        if (w.left <= 1 || P.lifted[d.place + d.night] || c.over) return;
        var nowAbs = c.shift * SH + c.minute, from = d.night * SH + d.after, until = (d.night + 1) * SH + 30;
        if (!(d.exec || !F.where.place || F.when.night === undefined)) return;
        if (nowAbs + 60 >= from && nowAbs + 60 < until) { var r2 = c.warrant('lift', d.place); P.lifted[d.place + d.night] = 1; note('lift ' + d.place + ' ' + (r2.ok ? 'ok' : r2.err)); }
        else if (c.shift === d.night + 1 && !P.watched[d.place + '@' + c.shift] && d.exec && w.left > 1) {
          // missed the lift: watch the drop on the evening it is cleared (follows the collector home)
          var r3 = c.warrant('watch', d.place, { night: c.shift }); P.watched[d.place + '@' + c.shift] = 1; note('watch drop ' + d.place + ' ' + (r3.ok ? 'ok' : r3.err));
        }
      });
      w = c.warrants();
      // 4. watch a meeting of the executor (or of anyone, when warrants are plentiful)
      P.meets.forEach(function (m) {
        if (w.left <= 1 || m.night < c.shift || P.watched[m.place + '@' + m.night]) return;
        if (m.night === c.shift && m.minute !== null && m.minute < c.minute) return;
        if (F.who.call && m.call !== F.who.call && w.left < 3) return;
        var r4 = c.warrant('watch', m.place, { night: m.night }); P.watched[m.place + '@' + m.night] = 1; note('watch meeting ' + m.place + ' ' + (r4.ok ? 'ok' : r4.err));
        w = c.warrants();
      });
      w = c.warrants();
      // 5. buildings with strong evidence: raid people who met with / serviced drops for the executor
      c.buildings().forEach(function (b) {
        if (w.left <= 0 || b.raided || P.raided[b.id] || c.over) return;
        var ev = b.evidence.map(function (e) { return e.kind; });
        var isExec = F.who.call && b.callsigns.indexOf(F.who.call) >= 0;
        var dropCollector = ev.indexOf('drop') >= 0 && b.evidence.some(function (e) { return /cleared/.test(e.detail); }) && P.drops.some(function (d) { return d.exec && b.evidence.some(function (e) { return e.detail.indexOf(c.city.places.filter(function (p) { return p.id === d.place; })[0].name) >= 0; }); });
        var meetExec = ev.indexOf('meeting') >= 0 && P.meets.some(function (m) { return m.call === F.who.call; }) && !b.callsigns.length;
        if (isExec || dropCollector) { var r5 = c.warrant('raid', b.id); P.raided[b.id] = 1; note('raid ' + b.address + ' ' + (r5.ok ? 'ok' : r5.err)); w = c.warrants(); }
      });
      // 6. hedges near the end
      var lastNights = c.shift >= c.shifts - 2;
      w = c.warrants();
      if (lastNights && F.where.place && F.when.night === undefined && w.left >= 1) {
        for (var n = c.shift; n < c.shifts && w.left > 0; n++) {
          var k2 = F.where.place + '@' + n;
          if (P.didStake[k2]) continue;
          if (F.when.guess !== undefined && F.when.guess !== n && w.left < 2) continue;
          var r6 = c.warrant('stakeout', F.where.place, { night: n }); P.didStake[k2] = 1; note('hedge stake-out ' + k2 + ' ' + (r6.ok ? 'ok' : r6.err)); w = c.warrants();
        }
      }
      // 7. collapse: resident + agents located and the end is near
      if (c.shift >= c.shifts - 2 && !F.where.place) {
        var strong = c.buildings().filter(function (b) { return b.strong && !b.raided && !P.raided[b.id]; });
        var need = c.gradeInfo.collapseAgents + 1;
        if (strong.length >= Math.min(need, w.left) && w.left >= need) strong.slice(0, need).forEach(function (b) { var r7 = c.warrant('raid', b.id); P.raided[b.id] = 1; note('collapse raid ' + b.address + ' ' + (r7.ok ? 'ok' : r7.err)); });
      }
    }

    // ------------------------------------------------------------ the night
    var guard = 0;
    while (!c.over && guard++ < 40) {
      var steps = 0;
      while (!c.over && c.minute < SH && steps++ < 400) {
        if (kind === 'listener') { if (listenNow()) continue; c.waitForSignal(SH); continue; }
        if (listenNow()) { act(); continue; }
        checkJob();
        if (tryCouriers()) { act(); continue; }
        if (tryDepths()) { act(); continue; }
        act();
        // band watch at the set: wait until something keys up (the waterfall shows it at once)
        c.waitForSignal(SH);
      }
      if (c.over) break;
      if (kind !== 'listener') act();
      c.endShift();
    }
    return { kind: kind, facts: P.facts, log: P.log, drops: P.drops, meets: P.meets, cw: P.cw };
  }
  return { play: play };
};
