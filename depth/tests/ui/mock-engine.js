/* DEPTH — UI development mock of the DX engine API (NOT shipped).
 * Implements depth/SPEC.md's API with plausible fake data and REAL arithmetic
 * (straddling checkerboard, one-time pad mod 10, page reuse, periodic keys) so
 * the workbench can be developed against honest material. Loaded only by
 * tests/ui/build-dev.sh, and only fills in when the real engine is absent
 * (or DX._mockWanted is set). */
var DX = typeof DX !== 'undefined' ? DX : {};
(function () {
  'use strict';
  if (DX.newCase && !DX._mockWanted) return;
  DX._isMock = true;

  // ------------------------------------------------------------------ rng
  function hs(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function R(seed) { var a = hs(seed); return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pick(r, a) { return a[Math.floor(r() * a.length)]; }
  function shuffle(r, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function mod10(x) { return ((x % 10) + 10) % 10; }

  var GRADES = {
    cadet: { shifts: 5, warrants: 6, outstations: 4, reuse: 3, agents: 3, van: 95, sd: 0.7, noise: 0.22, board: true },
    analyst: { shifts: 4, warrants: 4, outstations: 3, reuse: 2, agents: 4, van: 75, sd: 1, noise: 0.3, board: true },
    chief: { shifts: 4, warrants: 3, outstations: 3, reuse: 1, agents: 5, van: 60, sd: 1.3, noise: 0.38, board: false }
  };
  DX.GRADES = [
    { id: 'cadet', label: 'Cadet', blurb: 'Five nights, six warrants, the checkerboard already on file and plenty of help on the bench.' },
    { id: 'analyst', label: 'Analyst', blurb: 'The standard case: four nights, four warrants, a careful ring and a supervisor who helps if asked.' },
    { id: 'chief', label: 'Chief', blurb: 'Three warrants, a jumpy security officer and no checkerboard: you must recover it yourself.' }
  ];

  // ------------------------------------------------------------------ city
  var DNAMES = ['Nordhavn', 'Kastellet', 'Gamle By', 'Vestre Kaj', 'Mølleby', 'Sankt Jørgen', 'Ravnsborg', 'Østerport', 'Fiskerleje', 'Bryggen', 'Holmen', 'Lindholm'];
  var STREETS = ['Vestergade', 'Kornstræde', 'Havnegade', 'Smedegade', 'Toldbodvej', 'Reberbane', 'Klostergade', 'Brogade', 'Møllevej', 'Kirkestræde', 'Skippergade', 'Lindealle', 'Fiskertorv', 'Ankerstræde', 'Voldgade', 'Pilestræde', 'Bådsmandsgade', 'Tømrervej', 'Sejlgade', 'Østre Allé', 'Nørrevej', 'Strandvej', 'Jernbanegade', 'Rosengade'];
  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
  function makeCity(r, grade) {
    // jittered 5x4 lattice over the land; west edge is the sea
    var L = [], cols = 5, rows = 4;
    for (var j = 0; j < rows; j++) { L.push([]); for (var i = 0; i < cols; i++) {
      var x = 0.14 + i * 0.205 + (i > 0 && i < cols - 1 ? (r() - 0.5) * 0.07 : 0), y = 0.1 + j * 0.27 + (j > 0 && j < rows - 1 ? (r() - 0.5) * 0.07 : 0);
      if (i === 0) x = 0.14 + (r() - 0.5) * 0.03;
      L[j].push([x, y]);
    } }
    var ds = [], k = 0;
    for (var jj = 0; jj < rows - 1; jj++) for (var ii = 0; ii < cols - 1; ii++) {
      var poly = [L[jj][ii], L[jj][ii + 1], L[jj + 1][ii + 1], L[jj + 1][ii]];
      var cx = (poly[0][0] + poly[1][0] + poly[2][0] + poly[3][0]) / 4, cy = (poly[0][1] + poly[1][1] + poly[2][1] + poly[3][1]) / 4;
      ds.push({ id: 'd' + k, name: DNAMES[k], poly: poly, centre: [cx, cy], q: [ii, jj] }); k++;
    }
    // streets: lattice edges are arterials, plus a local grid inside each district
    var streets = [], sn = shuffle(r, STREETS), si = 0;
    function nm() { return sn[si++ % sn.length]; }
    for (var a = 0; a < rows; a++) streets.push({ name: nm(), line: L[a].slice(), major: true });
    for (var b = 0; b < cols; b++) streets.push({ name: nm(), line: L.map(function (rw) { return rw[b]; }), major: true });
    ds.forEach(function (d) {
      var p = d.poly, n = 3;
      for (var u = 1; u < n; u++) { var t = u / n; streets.push({ name: nm(), line: [lerp(p[0], p[1], t), lerp(p[3], p[2], t)] }); streets.push({ name: nm(), line: [lerp(p[0], p[3], t), lerp(p[1], p[2], t)] }); }
    });
    // river: from the east edge to the harbour
    var river = [], ry = 0.38 + r() * 0.08;
    for (var q = 0; q <= 14; q++) { var tx = 1.02 - q * 0.064; river.push([tx, ry + Math.sin(q * 0.8 + r()) * 0.03 + (q > 10 ? (q - 10) * 0.025 : 0)]); }
    var harbour = { poly: [[0, 0.46], [0.14, 0.47], [0.19, 0.52], [0.2, 0.6], [0.15, 0.66], [0.0, 0.68]], coast: [[0.12, 0], [0.13, 0.2], [0.11, 0.35], [0.14, 0.46], [0.14, 0.7], [0.1, 0.85], [0.12, 1]] };
    function inD(d) { var p = d.poly, u = 0.25 + r() * 0.5, v = 0.25 + r() * 0.5; return lerp(lerp(p[0], p[1], u), lerp(p[3], p[2], u), v); }
    function dAt(x, y) { var best = ds[0], bd = 9; ds.forEach(function (d) { var e = Math.hypot(d.centre[0] - x, d.centre[1] - y); if (e < bd) { bd = e; best = d; } }); return best; }
    var places = [], pid = 0;
    function place(kind, name, pos, extra) { var d = dAt(pos[0], pos[1]); var p = { id: 'p' + (pid++), kind: kind, name: name, district: d.id, pos: pos }; for (var k2 in extra || {}) p[k2] = extra[k2]; places.push(p); return p; }
    place('quay', 'Quay 3', [0.19, 0.5]); place('quay', 'Quay 7', [0.205, 0.575]); place('quay', 'Quay 9', [0.175, 0.64]);
    place('depot', 'Fuel depot', [0.23, 0.69]); place('yard', 'Naval yard', [0.2, 0.28]); place('station', 'Central station', [0.55, 0.52]);
    place('cafe', 'Café Merkur', inD(ds[5])); place('phone', 'Phone box, Fiskertorv', inD(ds[4])); place('church', 'St Olai churchyard', inD(ds[2]));
    place('park', 'Lindholm park', inD(ds[11])); place('bridge', 'Brovej bridge', [river[6][0], river[6][1]]); place('hotel', 'Hotel Nordstjernen', inD(ds[6]));
    place('office', "Harbour master's office", [0.22, 0.45]); place('club', 'Seamen\'s club', inD(ds[8])); place('market', 'Fish market', inD(ds[4]));
    var outs = [
      { id: 'o1', name: 'Kappel Head', pos: [-0.18, 0.12] }, { id: 'o2', name: 'Nordholm', pos: [1.18, -0.08] },
      { id: 'o3', name: 'Sønderby', pos: [0.62, 1.22] }, { id: 'o4', name: 'Vik lighthouse', pos: [1.2, 1.05] }
    ].slice(0, GRADES[grade].outstations);
    return { name: 'Haldmar', districts: ds.map(function (d) { return { id: d.id, name: d.name, poly: d.poly, centre: d.centre }; }), streets: streets, river: river, harbour: harbour,
      places: places, outstations: outs, _inD: inD, _dAt: dAt, _ds: ds };
  }

  // ------------------------------------------------------------------ checkerboard
  var ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function makeBoard(r) {
    var keys = ['BALTIC', 'HALDMAR', 'NORDWIND', 'LIGHTHOUSE', 'SEPTEMBER', 'KINGFISHER'], key = pick(r, keys);
    var order = []; (key + ALPHA).split('').forEach(function (c) { if (order.indexOf(c) < 0) order.push(c); });
    var top = order.filter(function (c) { return 'ETAONRIS'.indexOf(c) >= 0; }), rest = order.filter(function (c) { return 'ETAONRIS'.indexOf(c) < 0; }).concat(['.', '/']);
    var b1 = 2 + Math.floor(r() * 3), b2 = 6 + Math.floor(r() * 3);
    var row0 = [], t = 0; for (var i = 0; i < 10; i++) row0.push(i === b1 || i === b2 ? null : top[t++]);
    return { key: key, blanks: [b1, b2], rows: [{ prefix: '', cells: row0 }, { prefix: String(b1), cells: rest.slice(0, 10) }, { prefix: String(b2), cells: rest.slice(10, 20) }] };
  }
  function enc(board, text) {
    var map = {}; board.rows.forEach(function (rw) { rw.cells.forEach(function (c, i) { if (c) map[c] = rw.prefix + i; }); });
    var out = '', fig = false;
    String(text).toUpperCase().split('').forEach(function (ch) {
      if (ch >= '0' && ch <= '9') { if (!fig) { out += map['.']; fig = true; } out += ch; return; }
      if (fig) { out += map['.']; fig = false; }
      if (map[ch]) out += map[ch];
    });
    if (fig) out += map['.'];
    return out;
  }
  function dec(board, digits) {
    var out = '', i = 0, fig = false, b = board.blanks.map(String);
    while (i < digits.length) {
      var d = digits[i];
      if (d === '?') { out += '?'; i++; continue; }
      if (fig) { if (b.indexOf(d) >= 0 && digits[i + 1] !== undefined && board.rows[b.indexOf(d) + 1].cells[+digits[i + 1]] === '.') { fig = false; i += 2; continue; } out += d; i++; continue; }
      if (b.indexOf(d) >= 0) { var n = digits[i + 1]; if (n === undefined) { out += '?'; break; } if (n === '?') { out += '?'; i += 2; continue; } var c = board.rows[b.indexOf(d) + 1].cells[+n]; if (c === '.') fig = true; else if (c === '/') out += ' '; else out += c; i += 2; }
      else { out += board.rows[0].cells[+d] || '?'; i++; }
    }
    return out;
  }

  // ------------------------------------------------------------------ the case
  var FIRST = ['Pieter', 'Ingrid', 'Arne', 'Karin', 'Holger', 'Birte', 'Jens', 'Lise', 'Oskar', 'Marta', 'Evald', 'Signe', 'Tore', 'Hanne', 'Nils'];
  var LAST = ['Lund', 'Brandt', 'Sørensen', 'Kalm', 'Weiss', 'Ahlgren', 'Dahl', 'Rask', 'Voss', 'Holt', 'Mørk', 'Falk', 'Berg', 'Lind'];
  var JOBS = ['dock clerk', 'crane driver', 'schoolteacher', 'tram conductor', 'radio repairman', 'nurse at the seamen\'s hospital', 'ship chandler', 'night porter', 'photographer', 'draughtsman at the naval yard'];
  var OPS = [
    { what: 'sabotage of the fuel depot', verb: 'CHARGES AT', where: 'depot' },
    { what: 'photographing the new minesweeper at the naval yard', verb: 'CAMERA AT', where: 'yard' },
    { what: 'planting a listening device in the harbour master\'s office', verb: 'DEVICE AT', where: 'office' },
    { what: 'getting a defector out by boat from Quay 9', verb: 'BOAT AT', where: 'quay' }
  ];
  var WD = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  var NUMW = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];

  function Case(seed, opts) {
    opts = opts || {};
    var grade = GRADES[opts.grade] ? opts.grade : 'analyst';
    this.seed = String(seed); this.grade = grade; this.tutorial = !!opts.tutorial;
    this.G = GRADES[grade]; this.shifts = this.G.shifts;
    this.shift = 0; this.minute = 0; this.over = false; this.outcome = null; this.alert = 0; this.notes = '';
    this._gen();
    this._st = { log: [], heard: {}, df: {}, msgs: {}, links: [], warrants: [], inbox: [], known: {}, facts: {}, people: {}, addresses: {}, arrested: {}, score: 0, mentorUsed: {}, decrypts: {}, events: [], nid: 1, readIds: {}, pageHeld: {} };
    this._intro();
  }
  var C = Case.prototype;

  C._gen = function () {
    var r = R('depth-mock:' + (this.tutorial ? 'tutorial' : this.seed) + ':' + this.grade), G = this.G, self = this;
    this.r = R('play:' + this.seed);
    var city = this._city = makeCity(r, this.grade);
    this.city = { name: city.name, districts: city.districts, streets: city.streets, river: city.river, harbour: city.harbour, places: city.places, outstations: city.outstations };
    this.board0 = makeBoard(r);
    // ring
    var cs = shuffle(r, ['R3M', 'ANO', 'V2T', 'L8K', 'Q4F', 'M9S', 'T6B']), fn = shuffle(r, FIRST), ln = shuffle(r, LAST), jb = shuffle(r, JOBS), di = shuffle(r, city._ds.slice(1));
    function person(i, role, callsign, how) {
      var d = di[i % di.length], pos = city._inD(d), street = pick(r, STREETS), num = 2 + Math.floor(r() * 40);
      var home = { id: 'p' + city.places.length, kind: 'address', name: num + ' ' + street, district: d.id, pos: pos };
      city.places.push(home);
      return { id: 'h' + i, name: fn[i] + ' ' + ln[i], job: jb[i], role: role, callsign: callsign, home: home.id, district: d.id, how: how, pos: pos,
        fist: { wpm: 13 + Math.floor(r() * 9), dah: 2.6 + r() * 1.1, jitter: 0.04 + r() * 0.16, gap: 1 + r() * 0.7, swing: r() * 0.25 } };
    }
    var ring = { controller: { callsign: pick(r, ['SÆL', 'ORM', 'TRANE']), name: 'Controller (abroad)', role: 'controller' }, members: [] };
    ring.members.push(person(0, 'resident', 'KX7', 'home'));
    for (var i = 1; i <= G.agents; i++) ring.members.push(person(i, i === G.agents ? 'courier' : 'agent', cs[i], i === 2 ? 'van' : i === 3 ? 'room' : 'home'));
    // decoy addresses
    for (var z = 0; z < 8; z++) { var dd = pick(r, city._ds), pp = city._inD(dd); city.places.push({ id: 'p' + city.places.length, kind: 'address', name: (2 + Math.floor(r() * 60)) + ' ' + pick(r, STREETS), district: dd.id, pos: pp }); }
    this.ring = ring;
    var exec = ring.members[1 + Math.floor(r() * (G.agents - 1))];
    var op = OPS[Math.floor(r() * OPS.length)];
    var where = city.places.filter(function (p) { return p.kind === op.where; })[0] || city.places[0];
    var night = this.shifts - 1, hhmm = pick(r, ['2330', '0015', '0140', '2245']);
    this.op = { what: op.what, verb: op.verb, where: where.id, whereName: where.name, night: night, time: hhmm.slice(0, 2) + ':' + hhmm.slice(2), who: exec.id, whoCs: exec.callsign };
    var drop = city.places.filter(function (p) { return p.kind === 'church' || p.kind === 'park'; })[Math.floor(r() * 2)];
    this.drop = drop.id;
    // frequencies
    function f(lo, hi) { return Math.round((lo + r() * (hi - lo)) * 1000) / 1000; }
    var ctrlF = f(5.7, 7.2), resF = f(7.2, 8.4);
    ring.members.forEach(function (m) { m.freq = m.role === 'resident' ? resF : f(3.6, 11.5); m.slot = 60 + Math.floor(r() * 36) * 10; });
    // transmissions + messages
    var tx = [], msgs = [], nm = 1, pageNo = 100 + Math.floor(r() * 400);
    function page() { return String(10000 + Math.floor(r() * 89999)); }
    function nr() { return 10 + Math.floor(r() * 80); }
    function mkMsg(from, to, text, kind) {
      var m = { id: 'M' + (100 + nm++), from: from, to: to, text: text, kind: kind };
      msgs.push(m); return m;
    }
    var fact = function (k) { return k; };
    var W = WD, startDay = 0; // shift 0 is Monday night
    var nightName = W[(startDay + night) % 7];
    var plan = [];
    for (var s = 0; s < this.shifts; s++) {
      var ctrlText;
      if (s === 0) ctrlText = 'TO KX7 NR ' + nr() + ' CENTRE APPROVES ' + op.verb.split(' ')[0] + ' OPERATION STOP PREPARE ' + exec.callsign + ' STOP';
      else if (s === 1) ctrlText = 'TO KX7 NR ' + nr() + ' TARGET IS ' + where.name.toUpperCase() + ' STOP NEW DROP ' + drop.name.toUpperCase() + ' STOP';
      else if (s === 2) ctrlText = 'TO KX7 NR ' + nr() + ' OPERATION NIGHT OF ' + nightName + ' AT ' + hhmm + ' STOP CONFIRM';
      else ctrlText = 'TO KX7 NR ' + nr() + ' GOOD LUCK STOP DESTROY PADS AFTER STOP';
      plan.push({ s: s, m: 220, who: 'ctrl', freq: ctrlF, mode: 'voice', dur: 7, text: ctrlText, to: 'KX7' });
      if (s > 0) plan.push({ s: s, m: 40, who: 'ctrl', freq: ctrlF, mode: 'voice', dur: 7, repeatOf: s - 1, to: 'KX7' });
      plan.push({ s: s, m: 135, who: 'KX7', freq: resF, mode: 'cw', dur: 4, to: ring.members[1].callsign, text: 'TO ' + ring.members[1].callsign + ' NR ' + nr() + ' MEET CAFE MERKUR ' + W[(s + 1) % 7] + ' STOP' });
      ring.members.slice(1).forEach(function (m, k) {
        if ((s + k) % 2 === 1 && m.role !== 'courier' && s < 3) return;
        var txt = m === exec && s >= 1 ? 'TO KX7 NR ' + nr() + ' ' + m.callsign + ' READY FOR ' + op.verb + ' TARGET STOP' : 'TO KX7 NR ' + nr() + ' ALL QUIET STOP ' + m.callsign;
        if (m.role === 'courier') txt = s === 1 ? 'TO KX7 DROP AT ' + drop.name.toUpperCase() + ' FULL STOP ' + m.callsign : 'TO KX7 NR ' + nr() + ' WHO EXECUTES IS ' + exec.callsign + ' STOP';
        plan.push({ s: s, m: m.slot + (s % 2) * 10, who: m.callsign, freq: m.freq, mode: m.how === 'van' && s >= 2 ? 'burst' : 'cw', dur: m.how === 'van' && s >= 2 ? 1 : 3 + (k % 3), to: 'KX7', text: txt, cipher: m.role === 'courier' ? 'periodic' : 'pad' });
      });
      plan.push({ s: s, m: 430, who: 'KX7', freq: resF, mode: 'cw', dur: 4, to: pick(r, ring.members.slice(1)).callsign, text: 'NR ' + nr() + ' ' + (s === 1 ? exec.callsign + ' WILL EXECUTE STOP' : 'NO CHANGE STOP') });
      if (s === 0) plan.push({ s: s, m: 95, who: 'TST', freq: f(8, 9), mode: 'cw', dur: 3, text: null, decoy: true });
    }
    // encrypt
    var board = this.board0, pages = {};
    var reuseLeft = G.reuse;
    var byWho = {};
    plan.sort(function (a, b) { return a.s - b.s || a.m - b.m; });
    var ctrlMsgs = {};
    plan.forEach(function (p, i) {
      var t = { id: 'T' + (1000 + i), shift: p.s, start: p.m, dur: p.dur, freq: p.freq, mode: p.mode, callsign: p.who === 'ctrl' ? ring.controller.callsign : p.who, to: p.to || null, drift: 0.2 + r() * 0.8, strength: 0.45 + r() * 0.5, decoy: !!p.decoy };
      if (p.repeatOf !== undefined) { var o = ctrlMsgs[p.repeatOf]; t.msg = o ? o.id : null; t.repeat = true; tx.push(t); return; }
      if (p.text) {
        var m = mkMsg(t.callsign, t.to, p.text, p.cipher || 'pad');
        var digits = enc(board, p.text.replace(/ /g, '/'));
        while (digits.length % 5) digits += '0';
        if (m.kind === 'periodic') {
          var klen = 4 + Math.floor(r() * 4), key = []; for (var q = 0; q < klen; q++) key.push(Math.floor(r() * 10));
          m.key = key.join(''); m.indicator = String(10000 + Math.floor(r() * 89999));
          m.cipher = digits.split('').map(function (d, j) { return String(mod10(+d + key[j % klen])); }).join('');
        } else {
          // one-time pad; some pages are reused (depth)
          var pg = null;
          if (reuseLeft > 0 && p.who !== 'ctrl' && byWho.reusable && r() < 0.8) { pg = byWho.reusable; byWho.reusable = null; reuseLeft--; }
          if (!pg) { pg = page(); pages[pg] = []; for (var q2 = 0; q2 < 400; q2++) pages[pg].push(Math.floor(r() * 10)); if (p.who === 'ctrl' || p.s === 0) byWho.reusable = pg; }
          m.indicator = pg; m.page = pg;
          m.cipher = digits.split('').map(function (d, j) { return String(mod10(+d + pages[pg][j])); }).join('');
        }
        m.digits = digits;
        t.msg = m.id;
        if (p.who === 'ctrl') ctrlMsgs[p.s] = m;
      }
      tx.push(t);
    });
    this.tx = tx; this.msgs = msgs; this.pages = pages;
    // broadcast stations: always on air
    this.bcast = [
      { id: 'B1', freq: 5.98, mode: 'voice', label: 'Radio Nordwelle', strength: 0.85, bcast: true },
      { id: 'B2', freq: 7.265, mode: 'voice', label: 'Baltic Service', strength: 0.7, bcast: true },
      { id: 'B3', freq: 9.996, mode: 'cw', label: 'Time signal', strength: 0.55, bcast: true },
      { id: 'B4', freq: 4.415, mode: 'voice', label: 'Fleet weather', strength: 0.5, bcast: true },
      { id: 'B5', freq: 11.72, mode: 'voice', label: 'Overseas service', strength: 0.4, bcast: true }
    ];
    // what the station knows at the start: the controller's broadcast slot
    this._knownSlots = {}; this._knownSlots[ring.controller.callsign] = true;
  };

  C._msgTo = function (kind, from, title, body, extra) {
    var st = this._st, m = { id: 'I' + (st.nid++), t: this.shift * 480 + this.minute, shift: this.shift, kind: kind, from: from, title: title, body: body, read: false };
    for (var k in extra || {}) m[k] = extra[k];
    st.inbox.unshift(m); return m;
  };
  function P(id, name) { return { t: 'place', id: id, d: name }; }
  function CS(c) { return { t: 'callsign', id: c, d: c }; }
  C._intro = function () {
    var ctrl = this.ring.controller.callsign, t = this.tx.filter(function (x) { return x.callsign === ctrl && x.shift === 0; })[0];
    this._msgTo('super', 'Supt. E. Norlander', 'Operation brief: a ring in Haldmar', [
      'Special Branch believe an illegal network is preparing something in Haldmar within the week. We have heard its controller for a month — the numbers broadcasts under callsign ', CS(ctrl), '. We cannot read them. Find the people, read what you can, and stop whatever they are planning.\n\nYou have ' + this.G.warrants + ' warrants. Spend them carefully: a bad raid warns the ring.'
    ]);
    this._msgTo('mentor', 'Mrs I. Holm', 'From the night supervisor', [
      'Evening. ', CS(ctrl), ' reads its groups at ' + String(18 + Math.floor(t.start / 60)).padStart(2, '0') + ':' + String(t.start % 60).padStart(2, '0') + ' on ' + t.freq.toFixed(3) + ' MHz — it is on your schedule strip. Copy it cleanly, then sweep the band for the agents who answer in Morse. Ask the outstations for bearings while anything is on air.'
    ]);
    if (this.G.board) this._msgTo('file', 'Registry', 'Case file: the ring\'s checkerboard', ['A straddling checkerboard recovered from a courier arrested in Kiel in 1975 is on file. It is believed to be current. See the case file.']);
  };

  // ------------------------------------------------------------------ clock
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  C.clock = function (m) {
    m = m === undefined ? this.minute : m;
    var tot = 18 * 60 + m, hh = Math.floor(tot / 60) % 24, mm = tot % 60, dayN = 17 + this.shift + (tot >= 24 * 60 ? 1 : 0);
    var wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][(this.shift + (tot >= 1440 ? 1 : 0)) % 7];
    return { day: wd + ' ' + dayN + ' Oct 1977', hh: hh, mm: mm, label: String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'), night: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][this.shift % 7] + ' ' + (17 + this.shift) + '/' + (18 + this.shift) + ' Oct' };
  };
  C._onAir = function (m) { var s = this.shift; m = m === undefined ? this.minute : m; return this.tx.filter(function (t) { return t.shift === s && t.start <= m && m < t.start + t.dur; }); };
  C.band = function () {
    var self = this, st = this._st;
    var now = this._onAir().filter(function (t) { return !st.heard[t.id]; }).map(function (t) {
      return { id: t.id, freq: t.freq, mode: t.mode, strength: t.strength * (0.8 + 0.2 * Math.sin(self.minute / 17 + t.freq)), drift: t.drift, label: self._knownSlots[t.callsign] ? t.callsign : null, ends: t.start + t.dur, started: t.start };
    }).concat(this.bcast.map(function (b) { return { id: b.id, freq: b.freq, mode: b.mode, strength: b.strength, label: b.label, bcast: true }; }));
    return { now: now, schedule: this.upcoming(480) };
  };
  C.upcoming = function (ahead) {
    var self = this, s = this.shift, m = this.minute, st = this._st;
    return this.tx.filter(function (t) { return t.shift === s && t.start + t.dur > m && t.start <= m + ahead && self._knownSlots[t.callsign] && !st.heard[t.id]; })
      .map(function (t) { return { id: t.id, at: t.start, dur: t.dur, freq: t.freq, mode: t.mode, callsign: t.callsign, label: t.callsign + (t.repeat ? ' (repeat)' : '') }; });
  };
  C._advance = function (to) {
    to = clamp(to, this.minute, 480);
    var self = this, st = this._st, ev = [], s = this.shift, from = this.minute;
    this.tx.forEach(function (t) {
      if (t.shift !== s || st.heard[t.id]) return;
      if (t.start >= from && t.start + t.dur <= to && !t.decoy) {
        st.heard[t.id] = 'missed';
        var e = { id: 'L' + (st.nid++), tx: t.id, t: s * 480 + t.start, shift: s, minute: t.start, freq: t.freq, mode: t.mode, callsign: self._knownSlots[t.callsign] ? t.callsign : null, to: null, length: null, indicator: null, groups: [], quality: 0, faint: true };
        st.log.push(e); ev.push({ kind: 'missed', text: 'Heard faintly at ' + self.clock(t.start).label + ': ' + t.freq.toFixed(3) + ' MHz ' + t.mode.toUpperCase() + (e.callsign ? ' (' + e.callsign + ')' : '') + ' — not copied.', t: t.start });
      }
    });
    this.minute = to;
    return ev;
  };
  C.wait = function (min) { return this._advance(this.minute + min); };
  C.advanceTo = function (m) { return this._advance(m); };

  // ------------------------------------------------------------------ copy
  C.tune = function (txId, q) {
    q = q || {};
    var t = this.tx.filter(function (x) { return x.id === txId; })[0];
    var b = this.bcast.filter(function (x) { return x.id === txId; })[0];
    if (b) { this._advance(this.minute + 5); return { ok: true, groups: [], quality: 1, text: b.label + ': ordinary broadcast programme.', broadcast: true }; }
    if (!t) return { ok: false, err: 'Nothing on that frequency now.' };
    var st = this._st, self = this;
    var err = Math.abs(+q.freqErr || 0), qual = (q.modeOk === false ? 0.3 : 1) * clamp(1 - err / 2.2, 0, 1) * (0.55 + 0.45 * clamp(q.driftHeld === undefined ? 1 : +q.driftHeld, 0, 1)) * (0.7 + 0.3 * t.strength);
    qual = clamp(qual + (this.grade === 'cadet' ? 0.12 : this.grade === 'analyst' ? 0.06 : 0), 0, 1);
    var m = t.msg ? this.msgs.filter(function (x) { return x.id === t.msg; })[0] : null;
    var groups = [], ind = null;
    var pc = Math.pow(1 - qual, 1.6) * 0.5;
    if (m) {
      ind = m.indicator;
      var all = (m.indicator + m.cipher).match(/.{5}/g);
      groups = all.map(function (g) { return g.split('').map(function (d) { return self.r() < pc ? '?' : d; }).join(''); });
    } else if (t.decoy) {
      groups = ['VVVVV', 'VVVVV', 'TEST', 'TEST'];
    }
    st.heard[t.id] = 'copied';
    this._knownSlots[t.callsign] = true;
    var e = { id: 'L' + (st.nid++), tx: t.id, t: this.shift * 480 + t.start, shift: this.shift, minute: t.start, freq: t.freq, mode: t.mode, callsign: t.callsign, to: t.to, length: groups.length, indicator: groups[0] || null, groups: groups, quality: qual, msg: m ? m.id : null, repeat: !!t.repeat, decoy: t.decoy };
    if (st.df[t.id]) e.df = st.df[t.id];
    st.log.push(e);
    if (m) {
      var w = st.msgs[m.id];
      if (!w) st.msgs[m.id] = { groups: groups.slice(1), copies: 1, logs: [e.id], first: e.t };
      else { w.groups = w.groups.map(function (g, i) { var n = groups[i + 1] || ''; return g.split('').map(function (d, j) { return d === '?' && n[j] && n[j] !== '?' ? n[j] : d; }).join(''); }); w.copies++; w.logs.push(e.id); }
    }
    this._advance(Math.max(this.minute, t.start + t.dur));
    return { ok: true, groups: groups, quality: qual, logId: e.id, msg: m ? m.id : null, indicator: ind, callsign: t.callsign, to: t.to, repeat: !!t.repeat };
  };

  // ------------------------------------------------------------------ DF
  function bearing(from, to) { return (Math.atan2(to[0] - from[0], -(to[1] - from[1])) * 180 / Math.PI + 360) % 360; }
  C._txPos = function (t) {
    var mem = this.ring.members.filter(function (m) { return m.callsign === t.callsign; })[0];
    if (mem) {
      if (mem.how === 'van') { var rr = R(t.id); var d = this._city._ds[Math.floor(rr() * this._city._ds.length)]; return this._city._inD.call(null, d); }
      return mem.pos;
    }
    if (t.callsign === 'TST') return [0.62, 0.2];
    return null;
  };
  C.df = function (txId, stationIds) {
    var t = this.tx.filter(function (x) { return x.id === txId; })[0];
    if (!t) return { err: 'Nothing to take a bearing on.' };
    var pos = this._txPos(t);
    if (!pos) return { err: 'The outstations report a skywave signal from abroad — no useful bearing.', bearings: [], abroad: true };
    var self = this, G = this.G;
    var outs = this.city.outstations.filter(function (o) { return !stationIds || !stationIds.length || stationIds.indexOf(o.id) >= 0; });
    var rr = R(txId + ':' + outs.map(function (o) { return o.id; }).join(''));
    var bs = outs.map(function (o) { var sd = (2.2 + (1 - t.strength) * 3 + (t.dur < 3 ? 2.5 : 0)) * G.sd; return { station: o.id, deg: (bearing(o.pos, pos) + gauss(rr) * sd + 360) % 360, sd: sd }; });
    var fix = this._fix(bs);
    var res = { bearings: bs, fix: fix };
    this._st.df[txId] = res;
    this._st.log.forEach(function (e) { if (e.tx === txId) e.df = res; });
    this._advance(this.minute + 3);
    return res;
  };
  C._fix = function (bs) {
    if (bs.length < 2) return null;
    var self = this, pts = [];
    for (var i = 0; i < bs.length; i++) for (var j = i + 1; j < bs.length; j++) {
      var A = self.city.outstations.filter(function (o) { return o.id === bs[i].station; })[0].pos, B = self.city.outstations.filter(function (o) { return o.id === bs[j].station; })[0].pos;
      var a = bs[i].deg * Math.PI / 180, b = bs[j].deg * Math.PI / 180, da = [Math.sin(a), -Math.cos(a)], db = [Math.sin(b), -Math.cos(b)];
      var den = da[0] * db[1] - da[1] * db[0]; if (Math.abs(den) < 1e-3) continue;
      var tt = ((B[0] - A[0]) * db[1] - (B[1] - A[1]) * db[0]) / den;
      pts.push([A[0] + da[0] * tt, A[1] + da[1] * tt]);
    }
    if (!pts.length) return null;
    var x = 0, y = 0; pts.forEach(function (p) { x += p[0]; y += p[1]; }); x /= pts.length; y /= pts.length;
    var sd = bs.reduce(function (s, b) { return s + b.sd; }, 0) / bs.length;
    var rx = 0.012 + sd * 0.009 + (bs.length < 3 ? 0.03 : 0), ry = rx * (0.55 + (bs.length > 3 ? 0.2 : 0));
    return { x: x, y: y, rx: rx, ry: ry, rot: (bs[0].deg % 180) - 90 };
  };

  // ------------------------------------------------------------------ van
  C.van = function (txId) {
    var t = this.tx.filter(function (x) { return x.id === txId; })[0];
    if (!t) return { err: 'That set is not on the air.' };
    var pos = this._txPos(t); if (!pos) return { err: 'That signal comes from abroad.' };
    var d = this._city._dAt(pos[0], pos[1]), sz = 0.16;
    var x0 = clamp(pos[0] - sz / 2 + (R(txId)() - 0.5) * 0.06, 0, 1 - sz), y0 = clamp(pos[1] - sz / 2 + (R(txId + 'y')() - 0.5) * 0.06, 0, 1 - sz);
    this._van = { tx: txId, pos: pos };
    return { tx: txId, district: d.id, grid: { x0: x0, y0: y0, x1: x0 + sz, y1: y0 + sz, cols: 6, rows: 6, seed: txId }, target: { x: pos[0], y: pos[1] }, seconds: this.G.van, start: { x: x0 + sz / 2, y: y0 + sz } };
  };
  C.vanResult = function (found) {
    var v = this._van; if (!v) return { ok: false };
    this._van = null;
    var t = this.tx.filter(function (x) { return x.id === v.tx; })[0];
    var mem = this.ring.members.filter(function (m) { return m.callsign === t.callsign; })[0];
    this._advance(Math.max(this.minute + 30, t.start + t.dur));
    var st = this._st;
    if (found && Math.hypot(found.x - v.pos[0], found.y - v.pos[1]) < 0.016 && mem && mem.how !== 'van') {
      var home = this.city.places.filter(function (p) { return p.id === mem.home; })[0];
      st.addresses[t.callsign] = home.id;
      this._msgTo('van', 'DF van Kestrel-2', 'Van search: set located', ['The van crew pinned the transmitter to ', P(home.id, home.name), ' in ' + this._dname(home.district) + '. The aerial is on the roof. Callsign ', CS(t.callsign), '.']);
      return { ok: true, exact: true, place: home.id, text: 'Transmitter located: ' + home.name };
    }
    var d = this._city._dAt(v.pos[0], v.pos[1]);
    this._msgTo('van', 'DF van Kestrel-2', 'Van search: area narrowed', ['The signal was strongest in ' + d.name + ' but the crew could not pin a building before it went off air.' + (mem && mem.how === 'van' ? ' They think it was moving — a set in a vehicle.' : '')]);
    return { ok: true, exact: false, district: d.id, text: 'Narrowed to ' + d.name };
  };
  C._dname = function (id) { var d = this.city.districts.filter(function (x) { return x.id === id; })[0]; return d ? d.name : id; };

  // ------------------------------------------------------------------ log / messages
  C.log = function () { return this._st.log.slice(); };
  C.messages = function () {
    var st = this._st, self = this;
    return this.msgs.filter(function (m) { return st.msgs[m.id] || st.decrypts[m.id] && st.decrypts[m.id].clear; }).map(function (m) {
      var w = st.msgs[m.id] || { groups: m.cipher.match(/.{5}/g), copies: 0 };
      var d = st.decrypts[m.id];
      return { id: m.id, from: m.from, to: m.to, groups: w.groups.slice(), indicator: m.indicator, kind: d && d.clear ? 'clear' : m.kind, copies: w.copies, t: w.first, decrypted: d ? { text: d.text, holes: d.holes, verdict: d.verdict } : null };
    });
  };
  C.board = function () { return this.G.board || this._st.boardRecovered ? JSON.parse(JSON.stringify(this.board0)) : null; };
  C._m = function (id) { return this.msgs.filter(function (m) { return m.id === id; })[0]; };
  C._stream = function (id) { var w = this._st.msgs[id]; if (!w) return ''; return w.groups.join(''); };
  var self0 = null;
  C._bench = function () {
    var c = this;
    return {
      depth: function (a, b) {
        var A = c._stream(a), B = c._stream(b), n = Math.min(A.length, B.length), diff = [];
        for (var i = 0; i < n; i++) diff.push(A[i] === '?' || B[i] === '?' ? '?' : String(mod10(+A[i] - +B[i])));
        c._advance(c.minute + 2);
        var ma = c._m(a), mb = c._m(b);
        return { diff: diff, sameIndicator: ma.indicator === mb.indicator };
      },
      crib: function (a, b, crib, offset) {
        var board = c.board0; var cd = enc(board, String(crib).toUpperCase().replace(/ /g, '/'));
        var A = c._stream(a), B = c._stream(b), out = [];
        for (var i = 0; i < cd.length; i++) { var j = offset + i; if (j >= A.length || j >= B.length) break; if (A[j] === '?' || B[j] === '?') { out.push('?'); continue; } out.push(String(mod10(+cd[i] - (+A[j] - +B[j])))); }
        var other = dec(board, out.join(''));
        var mb = c._m(b), ma = c._m(a), plaus = false;
        if (ma.indicator === mb.indicator && mb.digits) { var truth = mb.digits.slice(offset, offset + out.length); plaus = truth === out.join('') && ma.digits.slice(offset, offset + cd.length) === cd; }
        var score = plaus ? 1 : (other.replace(/[^AEIOU]/g, '').length / Math.max(1, other.length) > 0.25 && other.indexOf('?') < 0 ? 0.3 : 0);
        return { other: other, digits: out.join(''), plausible: plaus, score: score, cribDigits: cd };
      },
      period: function (id) {
        var s = c._stream(id), ic = [], rep = [];
        for (var p = 1; p <= 10; p++) {
          var tot = 0, cols = 0;
          for (var k = 0; k < p; k++) { var f = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], n = 0; for (var i = k; i < s.length; i += p) { if (s[i] === '?') continue; f[+s[i]]++; n++; } if (n > 1) { var sm = 0; f.forEach(function (x) { sm += x * (x - 1); }); tot += sm / (n * (n - 1)) * 10; cols++; } }
          ic.push({ period: p, ic: cols ? tot / cols : 1 });
        }
        var seen = {};
        for (var L = 3; L <= 4; L++) for (var i2 = 0; i2 + L <= s.length; i2++) { var sq = s.substr(i2, L); if (sq.indexOf('?') >= 0) continue; if (seen[sq] !== undefined && i2 - seen[sq] >= L) rep.push({ seq: sq, spacing: i2 - seen[sq], at: [seen[sq], i2] }); else if (seen[sq] === undefined) seen[sq] = i2; }
        c._advance(c.minute + 5);
        return { ic: ic, repeats: rep.slice(0, 12) };
      },
      columns: function (id, period) {
        var s = c._stream(id), out = [];
        for (var k = 0; k < period; k++) { var f = {}; for (var d = 0; d < 10; d++) f[d] = 0; for (var i = k; i < s.length; i += period) if (s[i] !== '?') f[s[i]]++; out.push({ col: k, freq: f }); }
        c._advance(c.minute + 3);
        return out;
      },
      setKey: function (id, key) {
        var s = c._stream(id), k = String(key).split('').map(Number), out = '';
        for (var i = 0; i < s.length; i++) out += s[i] === '?' ? '?' : String(mod10(+s[i] - k[i % k.length]));
        return { text: dec(c.board0, out), digits: out };
      },
      accept: function (id, text) {
        var m = c._m(id); if (!m) return { ok: false, err: 'No such message.' };
        var norm = function (x) { return String(x).toUpperCase().replace(/[^A-Z0-9]/g, ''); };
        var T = norm(m.text), U = norm(text), hit = 0;
        for (var i = 0; i < T.length; i++) if (U[i] === T[i]) hit++;
        // also accept shifted partials: count known words
        var words = m.text.split(' ').filter(function (w) { return w.length > 2 && norm(text).indexOf(w) >= 0; }).length / Math.max(1, m.text.split(' ').filter(function (w) { return w.length > 2; }).length);
        var ratio = Math.max(hit / T.length, words);
        var verdict = ratio > 0.85 ? 'right' : ratio > 0.3 ? 'partial' : 'wrong';
        c._st.decrypts[id] = { text: verdict === 'right' ? m.text : String(text), holes: verdict !== 'right', verdict: verdict };
        if (verdict !== 'wrong') c._learn(m, verdict);
        if (m.kind === 'periodic' && verdict === 'right' && !c.G.board && !c._st.boardRecovered) { c._st.boardRecovered = true; c._msgTo('mentor', 'Mrs I. Holm', 'We have their checkerboard', ['With a clean periodic break we can rebuild the ring\'s checkerboard. It is now in the case file.']); }
        c._advance(c.minute + 10);
        return { ok: true, verdict: verdict, text: c._st.decrypts[id].text };
      }
    };
  };
  Object.defineProperty(C, 'bench', { get: function () { if (!this.__bench) this.__bench = this._bench(); return this.__bench; } });
  C._learn = function (m, verdict) {
    var f = this._st.facts, op = this.op;
    if (m.text.indexOf('APPROVES') >= 0) f.what = true;
    if (m.text.indexOf('TARGET IS') >= 0) f.where = true;
    if (m.text.indexOf('NIGHT OF') >= 0) f.when = true;
    if (m.text.indexOf('EXECUTE') >= 0 || m.text.indexOf('READY FOR') >= 0) f.who = true;
    if (m.text.indexOf('DROP') >= 0) f.drop = true;
    this._msgTo('bench', 'Workbench', 'Decrypt filed: ' + m.id + (verdict === 'partial' ? ' (partial)' : ''), [m.from + ' to ' + (m.to || '?') + ': "' + (verdict === 'right' ? m.text : '…') + '"'], { msg: m.id });
  };

  // ------------------------------------------------------------------ links
  C.links = function () {
    var st = this._st, self = this, ringCs = [this.ring.controller.callsign].concat(this.ring.members.map(function (m) { return m.callsign; }));
    var edges = {}; this.tx.forEach(function (t) { if (t.to && t.callsign) edges[[t.callsign, t.to].sort().join('|')] = true; });
    var heardCs = {}; st.log.forEach(function (e) { if (e.callsign) heardCs[e.callsign] = (heardCs[e.callsign] || 0) + 1; });
    return st.links.map(function (l) {
      var k = [l.a, l.b].sort().join('|'), ev = st.log.filter(function (e) { return (e.callsign === l.a && e.to === l.b) || (e.callsign === l.b && e.to === l.a); }).length;
      var sup = edges[k] ? (ev > 1 ? 'strong' : ev === 1 ? 'some' : 'hunch') : 'none';
      return { a: l.a, b: l.b, kind: l.kind, support: sup, score: edges[k] ? Math.min(1, 0.3 + ev * 0.35) : 0, evidence: ev };
    });
  };
  C.link = function (a, b, kind) { var st = this._st; if (a === b) return { ok: false }; this.unlink(a, b); st.links.push({ a: a, b: b, kind: kind || 'talks' }); return { ok: true }; };
  C.unlink = function (a, b) { var st = this._st; st.links = st.links.filter(function (l) { return !((l.a === a && l.b === b) || (l.a === b && l.b === a)); }); return { ok: true }; };

  // ------------------------------------------------------------------ warrants
  C.warrants = function () { var st = this._st; return { left: this.G.warrants - st.warrants.length, max: this.G.warrants, used: st.warrants.slice() }; };
  C.warrant = function (kind, target, params) {
    var st = this._st, self = this;
    if (st.warrants.length >= this.G.warrants) return { ok: false, err: 'No warrants left.' };
    var pl = this.city.places.filter(function (p) { return p.id === target; })[0];
    if (!pl) return { ok: false, err: 'Pick a place.' };
    if (kind === 'lift' && !(pl.kind === 'church' || pl.kind === 'park' || pl.kind === 'phone')) return { ok: false, err: 'A lift needs a dead-drop site named in a decrypt.' };
    if (kind === 'raid' && pl.kind !== 'address') return { ok: false, err: 'A raid needs a building where someone lives.' };
    var w = { id: 'W' + (st.warrants.length + 1), kind: kind, target: target, targetName: pl.name, params: params || {}, shift: this.shift, status: 'pending' };
    st.warrants.push(w);
    this._advance(this.minute + 10);
    if (kind === 'raid') this._resolve(w);
    return { ok: true, msgs: ['Special Branch acknowledge: ' + kind.toUpperCase() + ' on ' + pl.name + (kind === 'stakeout' ? ' for the night of ' + this.clock().night : '') + '.'], warrant: w };
  };
  C._resolve = function (w) {
    var self = this, st = this._st, pl = this.city.places.filter(function (p) { return p.id === w.target; })[0];
    var mem = this.ring.members.filter(function (m) { return m.home === w.target; })[0];
    if (w.kind === 'watch') {
      var person = mem ? mem : { id: 'x' + w.target, name: pick(this.r, FIRST) + ' ' + pick(this.r, LAST), job: pick(this.r, JOBS) };
      st.people[person.id] = { id: person.id, name: person.name, job: person.job, home: w.target };
      w.status = 'done'; w.result = person.name + ' lives here.';
      this._msgTo('sb', 'Special Branch', 'Watch report: ' + pl.name, ['Observed for a night. Resident: ', { t: 'person', id: person.id, d: person.name }, ', ' + person.job + '. ' + (mem ? 'Unusual: a long wire aerial along the roof ridge; lights on late.' : 'Nothing out of the ordinary.')]);
    } else if (w.kind === 'lift') {
      w.status = 'done';
      if (w.target === this.drop) {
        var cand = this.msgs.filter(function (m) { return m.kind === 'pad' && !st.decrypts[m.id]; })[0];
        w.result = 'Dead drop contents photographed.';
        if (cand) { st.decrypts[cand.id] = { text: cand.text, holes: false, verdict: 'right', clear: true }; this._learn(cand, 'right'); }
        this._msgTo('sb', 'Special Branch', 'Dead drop lifted: ' + pl.name, ['Inside a hollow brick: a used pad page and a note in clear. Photographed and replaced. The note is on your bench.']);
      } else { w.result = 'Nothing there.'; this._msgTo('sb', 'Special Branch', 'Lift: nothing found', ['We searched ', P(pl.id, pl.name), ' and found nothing.']); }
    } else if (w.kind === 'raid') {
      if (mem) {
        st.arrested[mem.id] = true; w.status = 'done'; w.result = mem.name + ' arrested.';
        this.alert = Math.min(3, this.alert + 1);
        this._msgTo('sb', 'Special Branch', 'Raid: arrest made', ['At ', P(pl.id, pl.name), ' we arrested ', { t: 'person', id: mem.id, d: mem.name }, ', ' + mem.job + '. A transmitter was found under the floor. Callsign ', CS(mem.callsign), '.']);
        if (mem.id === this.op.who) { this.over = true; this.outcome = { kind: 'stopped', how: 'arrest', text: 'The executor was arrested before the operation.' }; }
      } else { w.status = 'failed'; w.result = 'Wrong address.'; this.alert = Math.min(3, this.alert + 1); this._msgTo('sb', 'Special Branch', 'Raid: nothing found', ['The occupants of ', P(pl.id, pl.name), ' are furious and innocent. The ring will hear of this.']); }
    } else if (w.kind === 'stakeout') {
      if (w.params.night === this.op.night && this.shift === this.op.night) {
        w.status = w.target === this.op.where ? 'done' : 'failed';
        if (w.target === this.op.where) { this.over = true; this.outcome = { kind: 'stopped', how: 'stakeout', text: 'Special Branch were waiting at ' + pl.name + '.' }; }
      }
    }
  };
  C.inbox = function () { return this._st.inbox.slice(); };
  C.markRead = function (id) { this._st.inbox.forEach(function (m) { if (m.id === id) m.read = true; }); };
  C.people = function () { var st = this._st; return Object.keys(st.people).map(function (k) { var p = st.people[k]; return { id: p.id, name: p.name, job: p.job, home: p.home, arrested: !!st.arrested[k] }; }); };

  C.endShift = function () {
    var st = this._st, self = this, events = this._advance(480);
    st.warrants.forEach(function (w) { if (w.status === 'pending' && w.kind !== 'stakeout') self._resolve(w); });
    st.warrants.forEach(function (w) { if (w.status === 'pending' && w.kind === 'stakeout' && w.params.night === self.shift) self._resolve(w); });
    if (this.shift === this.op.night && !this.over) { this.over = true; this.outcome = { kind: 'failed', how: null, text: 'The operation went ahead: ' + this.op.what + ' at ' + this.op.whereName + '.' }; }
    var report = { title: 'End of shift ' + (this.shift + 1), lines: [st.log.filter(function (e) { return e.shift === self.shift && !e.faint; }).length + ' transmissions copied, ' + st.log.filter(function (e) { return e.shift === self.shift && e.faint; }).length + ' missed.', 'Warrants left: ' + this.warrants().left + '.'] };
    if (!this.over) { this.shift++; this.minute = 0; if (this.shift >= this.shifts) { this.over = true; this.outcome = { kind: 'failed', text: 'Time ran out.' }; } }
    if (!this.over) this._msgTo('super', 'Supt. E. Norlander', 'Night ' + (this.shift + 1) + ' of ' + this.shifts, ['Another night. ' + (this.alert > 1 ? 'The ring is nervous — expect changes.' : 'Keep at it.')]);
    return { events: events, report: report };
  };
  C.mentor = function (tier) {
    var st = this._st, ring = this.ring;
    var copied = st.log.filter(function (e) { return !e.faint; }).length;
    var pairs = [], ms = this.messages(); for (var i = 0; i < ms.length; i++) for (var j = i + 1; j < ms.length; j++) if (ms[i].indicator === ms[j].indicator) pairs.push([ms[i].id, ms[j].id]);
    if (tier === 1) return { text: copied === 0 ? 'Start with the controller\'s broadcast on the schedule strip. Voice numbers need AM.' : pairs.length ? 'Look at the first group of each message. Pad pages are supposed to be used once.' : 'Sweep the band while the resident is on the air — agents often answer within the hour.' };
    this._advance(this.minute + 20);
    if (tier === 2) return { text: pairs.length ? 'Messages ' + pairs[0][0] + ' and ' + pairs[0][1] + ' share an indicator. Put them in depth and drag "TO KX7" along the strip.' : 'KX7 transmits at ' + this.clock(this.tx.filter(function (t) { return t.callsign === 'KX7'; })[0].start).label + ' on ' + ring.members[0].freq.toFixed(3) + ' MHz.', action: pairs.length ? { tab: 'bench', a: pairs[0][0], b: pairs[0][1] } : null };
    st.score -= 10;
    if (pairs.length) { var m = this._m(pairs[0][1]); st.decrypts[m.id] = { text: m.text, holes: false, verdict: 'right' }; this._learn(m, 'right'); return { text: 'I worked the depth myself: ' + m.id + ' reads "' + m.text + '".', action: { tab: 'bench', a: m.id } }; }
    return { text: 'The resident lives in ' + this._dname(ring.members[0].district) + '.' };
  };
  C.debrief = function () {
    var st = this._st, self = this, op = this.op, pl = function (id) { return self.city.places.filter(function (p) { return p.id === id; })[0]; };
    var caught = this.ring.members.filter(function (m) { return st.arrested[m.id]; }).length;
    var edges = {}; this.tx.forEach(function (t) { if (t.to && t.callsign && t.callsign !== 'TST') edges[[t.callsign, t.to].join('>')] = { a: t.callsign, b: t.to }; });
    return {
      outcome: this.outcome || { kind: 'open' },
      truth: {
        ring: { controller: this.ring.controller, members: this.ring.members.map(function (m) { return { id: m.id, name: m.name, job: m.job, role: m.role, callsign: m.callsign, home: m.home, homeName: pl(m.home).name, district: m.district, how: m.how, arrested: !!st.arrested[m.id], executor: m.id === op.who }; }), links: Object.keys(edges).map(function (k) { return edges[k]; }) },
        operation: { what: op.what, where: op.where, whereName: op.whereName, when: self.clock(0).day.replace(/\w+ (\d+)/, function () { return ''; }) && ('night ' + (op.night + 1) + ', ' + op.time), who: op.who, whoName: this.ring.members.filter(function (m) { return m.id === op.who; })[0].name },
        plaintexts: this.msgs.map(function (m) { return { id: m.id, from: m.from, to: m.to, kind: m.kind, text: m.text, decrypted: st.decrypts[m.id] ? st.decrypts[m.id].verdict : null, heard: !!st.msgs[m.id] }; })
      },
      stats: { copied: st.log.filter(function (e) { return !e.faint; }).length, missed: st.log.filter(function (e) { return e.faint; }).length, decrypts: Object.keys(st.decrypts).length, warrantsUsed: st.warrants.length, warrantsWasted: st.warrants.filter(function (w) { return w.status === 'failed'; }).length, caught: caught, ringSize: this.ring.members.length },
      score: Math.max(0, (this.outcome && this.outcome.kind === 'stopped' ? 60 : 0) + caught * 8 + Object.keys(st.decrypts).length * 4 - st.warrants.filter(function (w) { return w.status === 'failed'; }).length * 8 + st.score)
    };
  };
  C.save = function () { return JSON.stringify({ v: 'mock1', seed: this.seed, grade: this.grade, tutorial: this.tutorial, shift: this.shift, minute: this.minute, over: this.over, outcome: this.outcome, alert: this.alert, notes: this.notes, st: this._st, ks: this._knownSlots }); };
  DX.newCase = function (seed, opts) { return new Case(seed, opts); };
  DX.load = function (s) {
    var o = typeof s === 'string' ? JSON.parse(s) : s;
    var c = new Case(o.seed, { grade: o.grade, tutorial: o.tutorial });
    c.shift = o.shift; c.minute = o.minute; c.over = o.over; c.outcome = o.outcome; c.alert = o.alert; c.notes = o.notes || ''; c._st = o.st; c._knownSlots = o.ks || c._knownSlots;
    return c;
  };
  DX._enc = enc; DX._dec = dec;
})();
