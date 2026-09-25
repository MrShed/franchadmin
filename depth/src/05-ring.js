/* DEPTH engine — 05-ring.js
 * The hidden truth of a case:
 *   DX.makeRing(seed, city, G)        -> ring {controller, resident, members, security, keyword, board, codeword}
 *   DX.makeOperation(R, ring, city, G) -> op {type, what, place, night, minute, executor, codeword, items}
 *   DX.makePlan(seed, ring, op, city, G) -> plan {msgs:[...], txs:[...], pages, drops}
 * Message plaintexts come from templates (1977 tradecraft: dead drops, chalk signals, meetings, recognition
 * signs); the operation's WHAT/WHERE/WHEN/WHO are spread over several messages on different crypto paths.
 * DX.corpus() is the language sample used by the plausibility scorer; DX.vocab() the station's dictionary.
 */
(function () {
  'use strict';
  var D = DX.DATA;

  // ---------------------------------------------------------------- templates
  var T = {
    ctlOpen: ['NR{NR} FOR {TO}.', '{TO} FROM {FROM} NR{NR}.', 'NR{NR} TO {TO} MOST SECRET.'],
    ctlSign: ['{FROM} ENDS', 'GREETINGS {FROM}', 'END OF MESSAGE {FROM}', 'REGARDS {FROM}'],
    agOpen: ['{TO} DE {FROM} NR{NR}.', 'NR{NR} FROM {FROM}.', 'FOR {TO} NR{NR}.'],
    agSign: ['ENDS', '{FROM} OUT', 'NOTHING FURTHER', 'END {FROM}'],
    OP_WHAT: ['CENTRE APPROVES OPERATION {CW}. OBJECT IS TO {WHAT}. ALL OTHER TASKS SUSPENDED.',
      'OPERATION {CW} IS CONFIRMED BY CENTRE. THE OBJECT IS TO {WHAT}. SELECT YOUR BEST MAN.'],
    OP_WHERE: ['TARGET FOR {CW} IS {OPPLACE}. STUDY THE GUARD ROUTINE AND REPORT.',
      '{CW} WILL BE AT {OPPLACE}. KEEP ALL PEOPLE AWAY FROM THE AREA UNTIL THEN.'],
    OP_WHEN: ['{CW} WILL TAKE PLACE NIGHT OF {OPDAY} AT {OPTIME}. CONFIRM READINESS.',
      'DATE FOR {CW} IS NIGHT OF {OPDAY}. HOUR {OPTIME}. NO CHANGES.'],
    OP_WHO: ['{CW} TO BE CARRIED OUT BY {EXEC}. {EXEC} TO COLLECT {ITEM} FROM {SPOT}.',
      'CENTRE AGREES {EXEC} FOR {CW}. PAY {EXEC} {N} KRONER AFTER SUCCESS.'],
    ORDER_DROP: ['LOAD {SPOT} FOR {AG} NIGHT OF {DAY} AFTER {TIME}. SIGNAL CHALK MARK ON {SIGNAL}.'],
    MEET: ['MEET {AG} AT {CAFE} {DAY} AT {TIME}. RECOGNITION NEWSPAPER UNDER LEFT ARM.',
      'MEETING WITH {AG} {DAY} {TIME} AT {CAFE}. {AG} WILL ASK FOR MATCHES.'],
    MONEY: ['SENDING {N} KRONER THROUGH {SPOT}. ACKNOWLEDGE BY CHALK MARK ON {SIGNAL}.'],
    SECURE: ['POLICE ACTIVE NEAR {PLACE}. REDUCE TRAFFIC. NO MEETINGS AT {CAFE}.'],
    PROCEED: ['PROCEED WITH {CW} AS PLANNED. CENTRE WISHES YOU SUCCESS.', 'NO CHANGE TO {CW}. PROCEED. DESTROY ALL NOTES AFTERWARDS.'],
    FILL: ['NOTHING NEW FOR YOU TONIGHT. LISTEN AGAIN TOMORROW.', 'YOUR NR{N2} RECEIVED. CENTRE IS PLEASED WITH YOUR WORK.',
      'WEATHER WILL DELAY THE FERRY. NO CHANGE TO PLANS.'],
    SCHED: ['FROM {DAY} YOUR NEW TIME IS {TIME} ON {F}. OLD SCHEDULE CANCELLED.'],
    R_ACK: ['YOUR NR{N2} RECEIVED AND UNDERSTOOD. {AG} REPORTS NOTHING NEW.', 'ALL MESSAGES RECEIVED. {AG} WAITING FOR ORDERS.'],
    R_WHO: ['{EXEC} ACCEPTS {CW}. {PH} HAS SEEN {OPPLACE} AND SAYS IT CAN BE DONE.', '{EXEC} WILL DO {CW}. {PH} KNOWS {OPPLACE} WELL.'],
    R_READY: ['{CW} READY. {EXEC} WILL BE IN POSITION NIGHT OF {OPDAY}.', 'ALL READY FOR {CW}. {EXEC} HAS THE {ITEM}. NIGHT OF {OPDAY} CONFIRMED.'],
    R_MEET: ['MET {AG} AT {CAFE}. ALL WELL. {AG} ASKS FOR MORE MONEY.'],
    R_WORRY: ['POLICE CAR SEEN NEAR {PLACE} TWICE. I AM CAREFUL.', 'A VAN WITH AN AERIAL WAS SEEN NEAR {PLACE}. REQUEST NEW TIMES.'],
    E_RECON: ['RECONNAISSANCE OF {OPPLACE} COMPLETE. GUARDS CHANGE AT {TIME}. FENCE WEAK ON EAST SIDE.',
      'I HAVE WATCHED {OPPLACE} THREE NIGHTS. ONE GUARD ONLY AFTER {TIME}.'],
    E_READY: ['{ITEM} RECEIVED. I WILL BE IN POSITION NIGHT OF {OPDAY} AT {OPTIME}.', 'READY FOR {CW}. {OPDAY} AT {OPTIME} IS GOOD.'],
    A_FILL: ['NOTHING NEW. {PLACE} QUIET. WAITING FOR ORDERS.', 'SHIP ARRIVED AT {PLACE}. THREE MEN ON WATCH.', 'I NEED MONEY FOR RENT. SEND BY {SPOT}.'],
    RA_ORDER: ['WATCH {PLACE} NIGHT OF {DAY} AND REPORT.', 'CLEAR {SPOT} AFTER {TIME} {DAY}. BURN THE PAPER.'],
    C_DROP: ['{SPOT} LOADED NIGHT OF {DAY} AFTER {TIME} FOR {AG}. MARK ON {SIGNAL}. PACKAGE CONTAINS {ITEM}.'],
    C_EXEC: ['PACKAGE FOR {EXEC} IS IN {SPOT} FROM {DAY} AFTER {TIME}. {EXEC} MUST CLEAR IT BEFORE NIGHT OF {OPDAY}.'],
    C_FILL: ['ALL DROPS CLEAR. NO SURVEILLANCE SEEN AT {SPOT}. NEXT CONTACT {DAY} AT {TIME}.', 'MARK SEEN ON {SIGNAL}. {SPOT} EMPTIED. NOTHING FOR YOU.'],
    DROP_EXEC: ['FOR {EXEC}. {CW} AT {OPPLACE} NIGHT OF {OPDAY} AT {OPTIME}. {ITEM} ENCLOSED. BURN THIS.'],
    DROP_OTHER: ['FOR {AG}. {N} KRONER. NEW SIGNAL SITE {SIGNAL}. BURN THIS.']
  };
  DX.TEMPLATES = T;

  var OPS = [
    { type: 'fuel', what: 'DESTROY FUEL STOCKS', label: 'sabotage the fuel stocks', places: ['FUEL DEPOT', 'QUAY 7', 'QUAY 8', 'QUAY 9'], items: ['DETONATORS', 'TIMERS'] },
    { type: 'power', what: 'CUT POWER TO THE YARD', label: 'black out the naval dockyard', places: ['POWER STATION', 'RAIL BRIDGE', 'GASWORKS'], items: ['DETONATORS', 'TOOLS'] },
    { type: 'photo', what: 'PHOTOGRAPH THE NEW FRIGATE', label: 'photograph the new frigate', places: ['DRY DOCK 2', 'QUAY 8', 'QUAY 9', 'YARD MAIN GATE'], items: ['CAMERA AND FILM', 'PASSES'] },
    { type: 'theft', what: 'REMOVE THE SONAR DRAWINGS', label: 'steal the sonar drawings', places: ['DRAWING OFFICE', 'YARD MAIN GATE', 'CUSTOMS HOUSE'], items: ['KEYS', 'CAMERA AND FILM'] },
    { type: 'exfil', what: 'BRING OUT A DEFECTOR BY BOAT', label: 'smuggle a defector out by boat', places: ['QUAY 1', 'QUAY 2', 'QUAY 3', 'FERRY TERMINAL', 'LIGHTHOUSE'], items: ['PAPERS', 'SIGNAL LAMP'] },
    { type: 'handover', what: 'RECEIVE RADIO EQUIPMENT FROM A SHIP', label: 'land radio equipment from a ship', places: ['QUAY 4', 'QUAY 5', 'QUAY 6', 'FISH MARKET'], items: ['SIGNAL LAMP', 'MONEY'] },
    { type: 'radar', what: 'DISABLE THE COASTGUARD RADAR', label: 'disable the coastguard radar', places: ['RADAR MAST', 'LIGHTHOUSE'], items: ['TOOLS', 'DETONATORS'] }
  ];
  DX.OPS = OPS;
  var ITEMS = ['DETONATORS', 'TIMERS', 'TOOLS', 'CAMERA AND FILM', 'PASSES', 'KEYS', 'PAPERS', 'SIGNAL LAMP', 'MONEY'];

  // ---------------------------------------------------------------- template filling with fact spans
  /** fill(tpl, vars) -> {text, facts:[{fact, span:[i0,i1]}]} ; spans index the normalised text */
  function fill(tpl, vars) {
    var parts = tpl.split(/(\{[A-Z0-9]+\})/), text = '', norm = 0, facts = [];
    parts.forEach(function (p) {
      var m = /^\{([A-Z0-9]+)\}$/.exec(p);
      if (!m) { text += p; norm += DX.norm(p).length; return; }
      var key = m[1], val = vars[key];
      if (val === undefined) val = key;
      val = String(val);
      var n = DX.norm(val).length;
      var fact = { OPPLACE: 'where', OPDAY: 'when', OPTIME: 'when', EXEC: 'who', WHAT: 'what', CW: 'codeword' }[key];
      if (fact) facts.push({ fact: fact, key: key, value: val, span: [norm, norm + n] });
      text += val; norm += n;
    });
    return { text: text, facts: facts };
  }
  DX._fill = fill;

  // ---------------------------------------------------------------- the ring
  function callsign(R, used) {
    for (var k = 0; k < 100; k++) {
      var L = D.CALL_LETTERS, s;
      var shape = R.int(0, 2);
      if (shape === 0) s = R.pick(L.split('')) + R.pick(L.split('')) + R.int(2, 9);
      else if (shape === 1) s = R.pick(L.split('')) + R.int(2, 9) + R.pick(L.split(''));
      else s = R.pick(L.split('')) + R.pick('AEIOU'.split('')) + R.pick(L.split(''));
      if (!used[s]) { used[s] = 1; return s; }
    }
    return 'ZZ' + R.int(2, 9);
  }

  DX.makeRing = function (seed, city, G) {
    var R = DX.rng(seed + '/ring');
    var ctl = R.pick(D.CONTROLLERS);
    var used = {};
    var nAg = G.id === 'cadet' ? R.int(3, 4) : G.id === 'analyst' ? R.int(3, 5) : R.int(4, 6);
    var usedNames = {};
    function person() {
      for (var k = 0; k < 50; k++) {
        var f = R.chance(0.35), first = R.pick(f ? D.FIRST_F : D.FIRST_M), last = R.pick(D.SURNAMES);
        if (!usedNames[last]) { usedNames[last] = 1; return { first: first, last: last, name: first + ' ' + last, sex: f ? 'F' : 'M' }; }
      }
      return { first: 'Jens', last: 'Nielsen', name: 'Jens Nielsen', sex: 'M' };
    }
    var covers = R.shuffle(D.COVERS);
    var districts = R.shuffle(city.districts.map(function (d) { return d.id; }));
    var members = [];
    for (var i = 0; i <= nAg; i++) {
      var p = person(), role = i === 0 ? 'resident' : 'agent';
      var did = districts[i % districts.length];
      var home = DX.address(city, R, did);
      var m = {
        id: 'r' + i, call: callsign(R, used), role: role, name: p.name, first: p.first, last: p.last, sex: p.sex,
        cover: covers[i % covers.length], home: home, district: did,
        txFrom: i === 0 ? R.pick(['home', 'home', 'room']) : R.pick(['home', 'home', 'room', 'mobile']),
        fist: { wpm: R.int(10, 19), dah: DX.round(R.range(2.6, 3.6), 2), charGap: DX.round(R.range(1, 1.8), 2), wordGap: DX.round(R.range(5, 9), 1),
          jitter: DX.round(R.range(0.03, 0.12), 3), swing: DX.round(R.range(0, 0.25), 2),
          quirk: R.pick(['long zeros', 'clipped dits', 'hesitates before each group', 'sends VVV twice before the callup', 'drags the last dah', 'a heavy, even hand']) },
        careful: DX.round(R.range(0.2, 0.9), 2), executor: false, courier: false, arrested: false
      };
      m.spell = m.call;
      if (m.txFrom === 'room') {
        var rd = R.pick(city.districts.filter(function (d) { return d.id !== did; })).id;
        m.room = DX.address(city, R, rd);
      }
      members.push(m);
    }
    // couriers: the last one (two on larger rings) use a periodic additive key
    var agents = members.slice(1);
    var nCour = agents.length >= 5 ? 2 : 1;
    agents.slice(-nCour).forEach(function (a) {
      a.courier = true; a.role = 'courier';
      var L = R.int(G.period[0], G.period[1]);
      a.periodKey = R.digits(L).split('').map(Number);
      if (a.txFrom === 'mobile') a.txFrom = 'home';
    });
    var keyword = R.pick(D.KEYWORDS);
    var ring = {
      controller: { id: 'ctl', call: ctl[0], spell: ctl[1], role: 'controller', voice: R.pick(['female', 'male']),
        interval: R.shuffle([0, 2, 4, 5, 7, 9, 11, 12]).slice(0, 5), pos: [0.5 + R.range(-0.3, 0.3), -4] },
      resident: members[0], members: members, security: { name: R.pick(D.SECURITY) }, keyword: keyword,
      openCtl: R.int(0, T.ctlOpen.length - 1), signCtl: R.int(0, T.ctlSign.length - 1)
    };
    members.forEach(function (mm) { mm.open = R.int(0, T.agOpen.length - 1); mm.sign = R.int(0, T.agSign.length - 1); });
    ring.board = DX.boardCache(keyword);
    return ring;
  };

  DX.makeOperation = function (seed, ring, city, G) {
    var R = DX.rng(seed + '/op');
    var spec = R.pick(OPS);
    var code = R.pick(spec.places);
    var place = city.places.filter(function (p) { return p.code === code; })[0];
    var night = R.pick(G.opNights.filter(function (n) { return n < G.shifts; }));
    var minute = R.int(22, 44) * 10;  // 21:40 .. 01:20
    var cands = ring.members.filter(function (m) { return m.role === 'agent'; });
    var ex = R.pick(cands);
    ex.executor = true;
    return { type: spec.type, what: spec.what, label: spec.label, place: place.id, placeCode: place.code, night: night, minute: minute,
      executor: ex.id, codeword: R.pick(D.CODEWORDS), item: R.pick(spec.items), kroner: R.int(2, 9) * 1000 };
  };

  // ---------------------------------------------------------------- traffic plan
  function freq(R, lo, hi, avoid) {
    for (var k = 0; k < 60; k++) {
      var f = DX.round(Math.round(R.range(lo, hi) * 200) / 200, 3), ok = true;
      avoid.forEach(function (a) { if (Math.abs(a - f) < 0.03) ok = false; });
      if (ok) { avoid.push(f); return f; }
    }
    return DX.round(R.range(lo, hi), 3);
  }

  DX.makePlan = function (seed, ring, op, city, G) {
    var R = DX.rng(seed + '/plan');
    var N = G.shifts, o = op.night, board = ring.board;
    var members = ring.members, res = ring.resident, ex = members.filter(function (m) { return m.executor; })[0];
    var couriers = members.filter(function (m) { return m.courier; });
    var plainAgents = members.filter(function (m) { return m.role === 'agent'; });
    var otherAgents = plainAgents.filter(function (m) { return !m.executor; });
    var cafes = city.places.filter(function (p) { return p.kind === 'cafe'; });
    var spots = R.shuffle(city.places.filter(function (p) { return p.kind === 'spot'; }));
    var signals = city.places.filter(function (p) { return p.kind === 'signal'; });
    var landmarks = city.places.filter(function (p) { return ['quay', 'naval_yard', 'station', 'ferry', 'customs', 'market', 'hotel', 'church', 'bridge', 'power', 'post', 'cinema', 'tram'].indexOf(p.kind) >= 0 && p.id !== op.place; });
    var opPlace = city.places.filter(function (p) { return p.id === op.place; })[0];
    var bcast = D.BCAST.map(function (b) { return b[1]; });
    var avoid = bcast.slice();
    var nr = {};
    function nextNr(m) { if (!nr[m]) nr[m] = R.int(11, 40); return nr[m]++; }
    var ctlCall = ring.controller.spell;

    var msgs = [], drops = [];
    var execSpot = spots[0], otherSpot = spots[1], spareSpots = spots.slice(2);
    // the executor's package is loaded the night before the operation (or on night 0 if the op is on night 1)
    var dropNight = Math.max(0, o - 1);
    var dropTime = R.int(14, 26) * 10;
    var execItem = op.item;
    drops.push({ id: 'drop0', place: execSpot.id, night: dropNight, after: dropTime, forId: ex.id, contents: 'exec', item: execItem });
    // a second drop, ordered by the controller the night before it is loaded
    var odrop = { id: 'drop1', place: otherSpot.id, night: R.int(1, Math.max(1, o)), after: R.int(12, 30) * 10, forId: (otherAgents[0] || ex).id, contents: 'other' };
    drops.push(odrop);
    // a meeting between the resident and an agent, arranged by broadcast the night before
    var meetAgent = R.chance(0.6) ? ex : (otherAgents[0] || ex);
    var meet = { cafe: R.pick(cafes).id, night: R.int(1, Math.max(1, o)), minute: R.int(6, 20) * 10, agent: meetAgent.id, resident: res.id };
    if (meet.night === o) meet.minute = Math.min(meet.minute, op.minute - 90);
    drops.forEach(function (d) { d.collect = { night: d.night + 1, minute: R.int(3, 9) * 10 }; });

    function V(extra) {
      var v = {
        CW: op.codeword, WHAT: op.what, OPPLACE: opPlace.code, OPDAY: DX.nightName(o), OPTIME: DX.hhmm4(op.minute), EXEC: ex.spell,
        ITEM: execItem, PH: ex.sex === 'F' ? 'SHE' : 'HE', N: op.kroner, SPOT: execSpot.code, SIGNAL: R.pick(signals).code,
        CAFE: R.pick(cafes).code, PLACE: R.pick(landmarks).code, AG: (R.pick(otherAgents.length ? otherAgents : plainAgents)).spell,
        DAY: DX.nightName(R.int(0, N - 1)), TIME: DX.hhmm4(R.int(10, 40) * 10), N2: R.int(10, 40), F: String(R.int(3000, 9000))
      };
      for (var k in extra) v[k] = extra[k];
      return v;
    }
    function compose(from, to, beat, night, extra, opts) {
      opts = opts || {};
      var tpl = R.pick(T[beat]);
      var isCtl = from === 'ctl';
      var fromM = isCtl ? null : members.filter(function (m) { return m.id === from; })[0];
      var toSpell = to === 'ctl' ? ctlCall : members.filter(function (m) { return m.id === to; })[0].spell;
      var fromSpell = isCtl ? ctlCall : fromM.spell;
      var open = isCtl ? T.ctlOpen[ring.openCtl] : T.agOpen[fromM.open];
      var sign = isCtl ? T.ctlSign[ring.signCtl] : T.agSign[fromM.sign];
      var vars = V(extra);
      vars.TO = toSpell; vars.FROM = fromSpell; vars.NR = nextNr(from);
      if (opts.more) tpl = tpl + ' ' + R.pick(T[opts.more]);
      var a = fill(open + ' ', vars), b = fill(tpl + ' ', vars), c = fill(sign, vars);
      var off1 = DX.norm(a.text).length, off2 = off1 + DX.norm(b.text).length;
      var facts = a.facts.concat(b.facts.map(function (f) { return { fact: f.fact, key: f.key, value: f.value, span: [f.span[0] + off1, f.span[1] + off1] }; }))
        .concat(c.facts.map(function (f) { return { fact: f.fact, key: f.key, value: f.value, span: [f.span[0] + off2, f.span[1] + off2] }; }));
      var text = (a.text + b.text + c.text).replace(/\s+/g, ' ').trim();
      var m = { id: 'x' + msgs.length, from: from, to: to, beat: beat, night: night, text: text, norm: DX.norm(text), facts: facts,
        opening: DX.norm(a.text), signoff: DX.norm(c.text), cipher: opts.cipher || 'pad', link: opts.link || (isCtl || to === 'ctl' ? 'ctl' : (from === res.id ? to : from)) };
      msgs.push(m);
      return m;
    }

    // --- controller -> resident: two broadcasts a night up to the op night
    var ctlBeats = [];
    for (var n = 0; n < N; n++) ctlBeats.push([]);
    ctlBeats[0].push('OP_WHAT');
    ctlBeats[0].push(o >= 2 ? 'OP_WHO' : 'OP_WHERE');
    if (o >= 2) { ctlBeats[1].push('OP_WHERE'); ctlBeats[Math.min(o - 1, 2)].push('OP_WHEN'); }
    else { ctlBeats[0].push('OP_WHEN'); ctlBeats[1].push('OP_WHO'); }
    ctlBeats[meet.night - 1].push('MEET');
    ctlBeats[odrop.night - 1].push('ORDER_DROP');
    for (n = 0; n <= o && n < N; n++) {
      if (n === o) ctlBeats[n].push('PROCEED');
      while (ctlBeats[n].length < 2) ctlBeats[n].push(R.pick(['FILL', 'MONEY', 'SECURE']));
    }
    for (n = 0; n <= o && n < N; n++) {
      ctlBeats[n].slice(0, 3).forEach(function (beat, k) {
        var extra = {};
        if (beat === 'MEET') { extra = { AG: meetAgent.spell, CAFE: city.places.filter(function (p) { return p.id === meet.cafe; })[0].code, DAY: DX.nightName(meet.night), TIME: DX.hhmm4(meet.minute) }; }
        if (beat === 'ORDER_DROP') { extra = { SPOT: otherSpot.code, AG: members.filter(function (m) { return m.id === odrop.forId; })[0].spell, DAY: DX.nightName(odrop.night), TIME: DX.hhmm4(odrop.after) }; }
        var m = compose('ctl', res.id, beat, n, extra);
        m.slot = k;
      });
    }
    // --- resident -> controller, nightly
    for (n = 0; n <= o && n < N; n++) {
      var rb = n === 0 ? 'R_ACK' : n === 1 ? (o >= 2 ? 'R_WHO' : 'R_READY') : n === o - 1 ? 'R_READY' : n === o ? 'R_ACK' : (n === meet.night + 1 ? 'R_MEET' : 'R_WORRY');
      var ex2 = rb === 'R_MEET' ? { AG: meetAgent.spell, CAFE: city.places.filter(function (p) { return p.id === meet.cafe; })[0].code } : {};
      compose(res.id, 'ctl', rb, n, ex2);
    }
    // --- executor -> resident
    compose(ex.id, res.id, 'E_RECON', Math.min(1, Math.max(0, o - 1)), {});
    if (o >= 1) compose(ex.id, res.id, 'E_READY', o - 1, {});
    // --- resident -> other agents, and their chatter
    otherAgents.forEach(function (a, k) {
      var n1 = R.int(0, Math.max(0, o - 1));
      compose(res.id, a.id, 'RA_ORDER', n1, {});
      compose(a.id, res.id, 'A_FILL', Math.min(o, n1 + R.int(0, 1)), {});
    });
    // --- couriers: periodic key, longer messages (drop reports), several nights
    couriers.forEach(function (cm, k) {
      var nMsg = G.courierMsgs + (k === 0 ? 1 : 0);
      for (var j = 0; j < nMsg; j++) {
        var beat = (k === 0 && j === 1) || (k === 1 && j === 0) ? 'C_EXEC' : (j === 0 ? 'C_DROP' : 'C_FILL');
        var cn = beat === 'C_EXEC' ? Math.max(0, dropNight - R.int(0, 1)) : beat === 'C_DROP' ? Math.max(0, odrop.night - 1) : R.int(0, o);
        var ce = beat === 'C_EXEC' ? { SPOT: execSpot.code, DAY: DX.nightName(dropNight), TIME: DX.hhmm4(dropTime) } :
          beat === 'C_DROP' ? { SPOT: otherSpot.code, DAY: DX.nightName(odrop.night), TIME: DX.hhmm4(odrop.after), AG: members.filter(function (m) { return m.id === odrop.forId; })[0].spell } : {};
        // courier traffic is chattier: a second sentence gives the period finder enough material
        compose(cm.id, res.id, beat, cn, ce, { cipher: 'periodic', more: R.pick(['C_FILL', 'A_FILL']) });
      }
    });
    // facts in drop contents (clear text, for LIFT)
    drops.forEach(function (d) {
      var ag = members.filter(function (m) { return m.id === d.forId; })[0];
      var f = fill(d.contents === 'exec' ? T.DROP_EXEC[0] : T.DROP_OTHER[0], V({ AG: ag.spell, ITEM: execItem }));
      d.text = f.text; d.norm = DX.norm(f.text); d.facts = f.facts;
    });

    // ---------------------------------------------------------------- encipherment
    var pages = {};  // page indicator -> [msgIds]
    var pageBase = {}; var pageCount = 0;
    function newPage(link) {
      if (!pageBase[link]) pageBase[link] = R.int(1, 9) * 10000 + R.int(10, 80) * 10;
      pageCount++;
      return DX.pad(pageBase[link] + (pageCount * 7 + R.int(0, 5)) % 9000, 5);
    }
    msgs.forEach(function (m) {
      var digits = DX.encode(board, m.norm);
      // pad to whole groups: STOP codes, then an 'E' if one digit is left
      while (digits.length % 5 !== 0) {
        if ((5 - digits.length % 5) >= 2) digits += board.stopCode; else digits += board.enc.E;
      }
      m.plain = digits;
      if (m.cipher === 'pad') m.page = newPage(m.link);
    });
    // page reuse -> depth. Pairs within the same link, grade-controlled count.
    var padMsgs = msgs.filter(function (m) { return m.cipher === 'pad'; });
    var byLink = {};
    padMsgs.forEach(function (m) { (byLink[m.link] = byLink[m.link] || []).push(m); });
    var candPairs = [];
    Object.keys(byLink).forEach(function (l) {
      var arr = byLink[l];
      for (var i = 0; i < arr.length; i++) for (var j = i + 1; j < arr.length; j++) {
        var a = arr[i], b = arr[j];
        if (a.night > b.night) { var t = a; a = b; b = t; }
        // the reused page is used again within two nights
        if (b.night - a.night > 2) continue;
        var w = 1;
        var fa = a.facts.filter(function (f) { return f.fact !== 'codeword'; }).length + b.facts.filter(function (f) { return f.fact !== 'codeword'; }).length;
        w += fa * (G.id === 'cadet' ? 1.5 : G.id === 'analyst' ? 0.6 : 0.25);
        if (b.night >= o) w *= 0.3;
        if (l === 'ctl') w *= 1.5;
        candPairs.push({ a: a, b: b, w: w });
      }
    });
    var reused = {}, pairs = [];
    for (var pk = 0; pk < G.reusePairs && candPairs.length; pk++) {
      var pick = R.weighted(candPairs, function (c) { return c.w; });
      pairs.push({ a: pick.a.id, b: pick.b.id });
      pick.b.page = pick.a.page;
      reused[pick.a.id] = reused[pick.b.id] = 1;
      candPairs = candPairs.filter(function (c) { return !reused[c.a.id] && !reused[c.b.id]; });
    }
    // pad pages: deterministic random digits per page
    function pageDigits(ind, len) { var PR = DX.rng(seed + '/page/' + ind); return PR.digits(len); }
    msgs.forEach(function (m) {
      var cipherDigits;
      if (m.cipher === 'pad') {
        m.indicator = m.page;
        cipherDigits = DX.digitStr(DX.addKey(m.plain, pageDigits(m.page, 400).slice(0, m.plain.length)));
        m.groups = [m.indicator].concat(DX.groupsOf(cipherDigits));
      } else {
        var cm = members.filter(function (x) { return x.id === m.from; })[0];
        m.indicator = null;
        m.key = cm.periodKey.slice();
        cipherDigits = DX.digitStr(DX.addKey(m.plain, m.key));
        m.groups = DX.groupsOf(cipherDigits);
      }
      (pages[m.page] = pages[m.page] || []).push(m.id);
    });

    // ---------------------------------------------------------------- schedule: slots and transmissions
    var sched = {};
    var cA = R.int(7, 13) * 10, cB = R.int(20, 26) * 10;
    sched.ctl = [{ minute: cA, freq: freq(R, 4.0, 5.6, avoid), mode: 'VOICE' }, { minute: cB, freq: freq(R, 6.4, 8.4, avoid), mode: 'VOICE' }];
    var busy = [];  // [night, from, to] minute intervals
    function free(night, t0, dur) {
      for (var i = 0; i < busy.length; i++) { var b = busy[i]; if (b[0] === night && t0 < b[2] + 3 && t0 + dur + 3 > b[1]) return false; }
      return true;
    }
    function book(night, t0, dur) { busy.push([night, t0, t0 + dur]); }
    members.forEach(function (m) {
      var base = m.role === 'resident' ? R.int(29, 36) * 10 : R.int(9, 43) * 10 + 5 * R.int(0, 1);
      m.slot = { minute: base, freq: freq(R, m.courier ? 6.0 : 3.5, m.courier ? 10.5 : 9.5, avoid), mode: 'CW' };
    });
    var txs = [];
    function pos(m, night) {
      if (m.txFrom === 'room') return m.room.pos;
      if (m.txFrom === 'mobile') {
        var PR = DX.rng(seed + '/mob/' + m.id + '/' + night);
        var near = city.districts[PR.int(0, city.districts.length - 1)].centre;
        return [DX.round(DX.clamp(near[0] + PR.range(-0.05, 0.05), 0.03, 0.97), 4), DX.round(DX.clamp(near[1] + PR.range(-0.04, 0.04), 0.3, 0.97), 4)];
      }
      return m.home.pos;
    }
    function durOf(mode, groups, fist) {
      if (mode === 'VOICE') return Math.min(13, Math.round(2.5 + groups * 0.3));
      if (mode === 'BURST') return 1;
      var wpm = fist ? fist.wpm : 15;
      return Math.max(3, Math.round(1.2 + groups * (4.2 / wpm)));
    }
    function addTx(t) { t.id = 'T' + (txs.length + 1); txs.push(t); return t; }
    msgs.forEach(function (m) {
      var n0 = m.night;
      if (m.from === 'ctl') {
        var sl = sched.ctl[m.slot % 2];
        var t0 = sl.minute + (m.slot >= 2 ? 30 : 0);
        var d = durOf('VOICE', m.groups.length);
        var tx = addTx({ night: n0, minute: t0, dur: d, freq: sl.freq, mode: 'VOICE', from: ctlCall, fromId: 'ctl', to: res.spell, toId: res.id, msg: m.id, repeat: false, slot: 'ctl' + (m.slot % 2), pos: ring.controller.pos });
        book(n0, t0, d);
        m.txs = [tx.id];
        // repeated the next night, 15 minutes after the slot
        if (n0 + 1 < N) {
          var tr = addTx({ night: n0 + 1, minute: t0 + 15, dur: d, freq: sl.freq, mode: 'VOICE', from: ctlCall, fromId: 'ctl', to: res.spell, toId: res.id, msg: m.id, repeat: true, slot: 'ctl' + (m.slot % 2) + 'r', pos: ring.controller.pos });
          book(n0 + 1, t0 + 15, d);
          m.txs.push(tr.id);
        }
      }
    });
    msgs.forEach(function (m) {
      if (m.from === 'ctl') return;
      var fm = members.filter(function (x) { return x.id === m.from; })[0];
      var d = durOf('CW', m.groups.length, fm.fist);
      var t0 = fm.slot.minute;
      // same sender twice in a night (resident's orders to agents): later
      var k = 0;
      while (!free(m.night, t0, d) && k < 40) { t0 += 10; k++; if (t0 + d > 470) t0 = 40 + (t0 % 60); }
      book(m.night, t0, d);
      var toSpell = m.to === 'ctl' ? ctlCall : members.filter(function (x) { return x.id === m.to; })[0].spell;
      var tx = addTx({ night: m.night, minute: t0, dur: d, freq: fm.slot.freq, mode: 'CW', from: fm.spell, fromId: fm.id, to: toSpell, toId: m.to, msg: m.id, repeat: false, slot: fm.id, pos: pos(fm, m.night) });
      m.txs = [tx.id];
    });
    // test transmitter (VVV) and background oddities
    for (n = 0; n < N; n++) {
      if (R.chance(0.5)) addTx({ night: n, minute: R.int(5, 45) * 10, dur: 2, freq: freq(R, 3.2, 11.5, avoid.slice()), mode: 'CW', from: 'VVV', fromId: 'test', to: '', toId: null, msg: null, test: true, repeat: false, slot: 'test', pos: [R.range(0.1, 0.9), R.range(0.3, 0.9)] });
    }
    txs.sort(function (a, b) { return a.night - b.night || a.minute - b.minute; });
    return { msgs: msgs, txs: txs, pages: pages, pairs: pairs, drops: drops, meet: meet, sched: sched, bcast: D.BCAST.map(function (b, i) { return { id: 'B' + i, label: b[0], freq: b[1] }; }) };
  };

  // ---------------------------------------------------------------- corpus & vocabulary (the station's dictionary)
  var CORPUS = null, VOCAB = null;
  DX.corpus = function () {
    if (CORPUS) return CORPUS;
    var R = DX.rng('corpus-1977');
    var placeCodes = [];
    D.CAFES.forEach(function (c) { placeCodes.push(c[1]); }); D.SPOTS.forEach(function (c) { placeCodes.push(c[1]); });
    D.SIGNALS.forEach(function (c) { placeCodes.push(c[1]); }); D.LANDMARKS.forEach(function (c) { placeCodes.push(c[2]); });
    for (var q = 1; q <= D.QUAYS; q++) placeCodes.push('QUAY ' + q);
    var out = [];
    var beats = Object.keys(T).filter(function (k) { return !/Open|Sign/.test(k); });
    var used = {};
    for (var i = 0; i < 700; i++) {
      var spec = R.pick(OPS), rc = callsign(R, used);
      var v = { CW: R.pick(D.CODEWORDS), WHAT: spec.what, OPPLACE: R.pick(spec.places), OPDAY: R.pick(DX.CAL.DAY_NAMES), OPTIME: DX.pad(R.int(0, 23), 2) + DX.pad(R.int(0, 5) * 10, 2),
        EXEC: rc, ITEM: R.pick(ITEMS), PH: R.pick(['HE', 'SHE']), N: R.int(2, 9) * 1000, SPOT: R.pick(placeCodes), SIGNAL: R.pick(placeCodes), CAFE: R.pick(placeCodes),
        PLACE: R.pick(placeCodes), AG: callsign(R, used), DAY: R.pick(DX.CAL.DAY_NAMES), TIME: '2140', N2: R.int(10, 40), F: '6915', TO: callsign(R, used), FROM: R.pick(D.CONTROLLERS)[1], NR: R.int(11, 60) };
      var line = fill(R.pick(T[beats[i % beats.length]]), v).text;
      if (i % 3 === 0) line = fill(R.pick(T.ctlOpen), v).text + ' ' + line + ' ' + fill(R.pick(T.ctlSign), v).text;
      else if (i % 3 === 1) line = fill(R.pick(T.agOpen), v).text + ' ' + line + ' ' + fill(R.pick(T.agSign), v).text;
      out.push(line);
    }
    CORPUS = out;
    return out;
  };
  /** the station's dictionary: [{w, n}] every letter-word the ring's traffic can contain (callsigns excluded;
   *  the players' own log supplies those) */
  DX.vocab = function () {
    if (VOCAB) return VOCAB;
    var counts = {};
    function add(s, n) { String(s).toUpperCase().split(/[^A-Z]+/).forEach(function (w) { if (w) counts[w] = (counts[w] || 0) + (n || 1); }); }
    Object.keys(T).forEach(function (k) { T[k].forEach(function (tpl) { add(tpl.replace(/\{[A-Z0-9]+\}/g, ' '), /Open|Sign/.test(k) ? 6 : 2); }); });
    D.CODEWORDS.forEach(function (w) { add(w, 1); });
    DX.CAL.DAY_NAMES.forEach(function (w) { add(w, 3); });
    D.CONTROLLERS.forEach(function (c) { add(c[1], 2); });
    D.LANDMARKS.forEach(function (c) { add(c[2], 1); }); D.CAFES.forEach(function (c) { add(c[1], 1); });
    D.SPOTS.forEach(function (c) { add(c[1], 1); }); D.SIGNALS.forEach(function (c) { add(c[1], 1); });
    add('QUAY', 3); add('KRONER', 1);
    ITEMS.forEach(function (c) { add(c, 1); }); OPS.forEach(function (o) { add(o.what, 1); });
    VOCAB = Object.keys(counts).sort().map(function (w) { return { w: w, n: counts[w] }; });
    return VOCAB;
  };
})();
