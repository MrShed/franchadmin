/* CUTOUT engine — 05-records.js
 * The record systems and the query API the player uses.
 *
 * ---------------------------------------------------------------- API (short)
 *  var cs = CX.newCase(seed, opts)    // solver-verified case (07-solver.js)
 *  CX.load(json) / cs.save()          // replay-based save
 *  cs.day, cs.hoursLeft, cs.over, cs.outcome, cs.credibility
 *  cs.inbox() -> [doc]; cs.doc(id); CX.docText(doc)
 *  cs.knownTokens() -> [{t,v,d,doc}]; cs.keysFor(system)
 *  cs.query(system, key) -> {doc, hoursSpent} | {error, hoursSpent:0}
 *  cs.endDay() -> {day, newDocs, outcome}
 *  cs.file(prop) -> {id, confirmed:[...]}; cs.props(); cs.unfile(id); cs.plotOptions()
 *  cs.warrant({name, role, citedDocIds}) -> {approved, reason?, statement?}
 *  cs.respond({type, ...}) -> outcome; cs.debrief(); cs.timeline()
 *  Full reference: cutout/ENGINE.md
 * ----------------------------------------------------------------------------
 * Document: {id, sys, kind, style, title, from, day, time, hours, query, body:[{k, x:[seg]}], tokens, recs}
 * seg = string | token {t, v, d?}
 */
var CX = (typeof CX !== 'undefined' && CX) ? CX : {};

(function () {
  'use strict';
  var DATA = CX.DATA;
  var tk = CX.tok;

  CX.SYSTEMS = [
    { id: 'hotels', label: 'Hotel registrations', hours: 1, keys: ['name', 'passport', 'hotel+date'] },
    { id: 'border', label: 'Border crossings', hours: 1, keys: ['name', 'passport', 'plate'] },
    { id: 'airline', label: 'Airline manifests', hours: 1, keys: ['name', 'flight'] },
    { id: 'phones', label: 'Telephone records', hours: 2, keys: ['number'] },
    { id: 'bank', label: 'Bank records (court order)', hours: 4, keys: ['account', 'company'] },
    { id: 'vehicles', label: 'Vehicles & rentals', hours: 1, keys: ['plate'] },
    { id: 'residents', label: 'Residence registry', hours: 1, keys: ['name', 'address'] },
    { id: 'companies', label: 'Commercial register', hours: 1, keys: ['company'] },
    { id: 'archive', label: 'Service archive', hours: 2, keys: ['name'] }
  ];
  var SYS = {}; CX.SYSTEMS.forEach(function (s) { SYS[s.id] = s; });

  // ------------------------------------------------------------ helpers
  function L(k) { return { k: k, x: Array.prototype.slice.call(arguments, 1).reduce(flat, []) }; }
  function flat(acc, s) {
    if (s === null || s === undefined || s === false) return acc;
    if (Array.isArray(s)) return s.reduce(flat, acc);
    if (typeof s === 'object' && s.t === 'txt') { acc.push(String(s.v)); return acc; }
    acc.push(typeof s === 'object' ? s : String(s));
    return acc;
  }
  function surname(n) { var i = n.indexOf(' '); return i < 0 ? n : n.slice(i + 1); }
  function given(n) { var i = n.indexOf(' '); return i < 0 ? '' : n.slice(0, i); }
  function regName(n) { return tk('name', n, surname(n).toUpperCase() + ', ' + given(n)); }
  function nameTok(n) { return tk('name', n); }
  CX.docText = function (doc) {
    var out = [];
    out.push('[' + doc.id + '] ' + doc.title + (doc.from ? '  —  ' + doc.from : ''));
    doc.body.forEach(function (line) {
      var s = line.x.map(function (seg) { return typeof seg === 'string' ? seg : (seg.d || seg.v); }).join('');
      if (line.k === 'h') s = '== ' + s;
      else if (line.k === 'n') s = '  ✎ ' + s;
      else if (line.k === 's') s = '  [' + s + ']';
      else if (line.k === 'm') s = '  ' + s;
      out.push(s);
    });
    return out.join('\n');
  };
  CX.tokenKey = function (t) { return t.t + ':' + t.v; };

  // ------------------------------------------------------------ the Case
  function Case(W, genSeed, attempt) {
    var self = this;
    Object.defineProperty(this, '_w', { value: W, enumerable: false });
    Object.defineProperty(this, '_s', { value: { idx: {}, seen: {}, tokens: {}, tokenList: [], docs: [], docById: {}, bgHotel: {}, bgFlight: {}, arrests: {}, log: [], props: [], propN: 0, subjects: [], subjN: 0, queries: 0, hoursUsed: 0, wrongful: 0, warrants: [] }, enumerable: false });
    this.seed = W.seed.replace(/#\d+$/, '');
    this.genSeed = genSeed; this.attempt = attempt || 0;
    this.opts = W.opts;
    this.day = 0;
    this.dayHours = DATA.DAY_HOURS;
    this.hoursLeft = DATA.DAY_HOURS;
    this.over = false; this.outcome = null; this.credibility = 100;
    this.startLabel = W.cal.long(0);
    buildIndex(this);
    deliverTraffic(this, 0);
  }
  CX.Case = Case;
  var CP = Case.prototype;

  CP.dateLabel = function (d) { return this._w.cal.nice(d); };
  CP.dateLong = function (d) { return this._w.cal.long(d); };
  CP.dmy = function (d) { return this._w.cal.dmy(d); };
  CP.clock = function () { return CX.hm(8 * 60 + (this.dayHours - this.hoursLeft) * 60); };
  CP.inbox = function () { return this._s.docs.slice(); };
  CP.doc = function (id) { return this._s.docById[id] || null; };
  CP.newSince = function (n) { return this._s.docs.slice(n); };
  CP.knownTokens = function () { return this._s.tokenList.slice(); };
  CP.keysFor = function (system) {
    var S = SYS[system]; if (!S) return [];
    return this._s.tokenList.filter(function (t) { return S.keys.indexOf(t.t) >= 0 || (t.t === 'hotel' && S.keys.indexOf('hotel+date') >= 0); });
  };
  CP.holds = function (t, v) { return !!this._s.tokens[t + ':' + v]; };

  // ------------------------------------------------------------ indexing
  function ix(cs, sys, key, e) { var k = sys + '|' + key; (cs._s.idx[k] = cs._s.idx[k] || []).push(e); }
  function indexEntry(cs, e) {
    var s = e._sys;
    switch (e.r) {
      case 'stay':
        ix(cs, s, 'name:' + e.name, e); ix(cs, s, 'passport:' + e.passport, e);
        for (var n = e.arr; n < e.dep; n++) ix(cs, s, 'hd:' + e.hotel + '|' + n, e);
        break;
      case 'resv':
        ix(cs, s, 'name:' + e.name, e);
        for (var n2 = e.from; n2 < e.to; n2++) ix(cs, s, 'hd:' + e.hotel + '|' + n2, e);
        break;
      case 'cross': ix(cs, s, 'name:' + e.name, e); ix(cs, s, 'passport:' + e.passport, e); if (e.plate) ix(cs, s, 'plate:' + e.plate, e); break;
      case 'pax': ix(cs, s, 'name:' + e.name, e); ix(cs, s, 'flight:' + e.flight, e); break;
      case 'line': ix(cs, s, 'number:' + e.number, e); break;
      case 'call': ix(cs, s, 'number:' + e.from, e); if (e.to !== e.from) ix(cs, s, 'number:' + e.to, e); break;
      case 'acct': ix(cs, s, 'account:' + e.account, e); if (e.company) ix(cs, s, 'company:' + e.company, e); break;
      case 'tx': ix(cs, s, 'account:' + e.from, e); ix(cs, s, 'account:' + e.to, e); break;
      case 'veh': case 'rental': ix(cs, s, 'plate:' + e.plate, e); break;
      case 'res': ix(cs, s, 'name:' + e.name, e); ix(cs, s, 'address:' + e.address, e); if (e.prev) ix(cs, s, 'address:' + e.prev, e); break;
      case 'co': ix(cs, s, 'company:' + e.company, e); break;
      case 'card': ix(cs, s, 'name:' + e.name, e); e.aliases.forEach(function (a) { ix(cs, s, 'name:' + a, e); }); break;
    }
  }
  function buildIndex(cs) {
    var W = cs._w;
    cs._s.entryById = {};
    W.entries.forEach(function (e) { cs._s.entryById[e._id] = e; if (e._sys !== 'traffic') indexEntry(cs, e); });
  }

  // ------------------------------------------------------------ visibility
  function blockedStep(cs, stepId) {
    if (!stepId) return false;
    var st = cs._w.byStep[stepId]; if (!st) return false;
    var arr = cs._s.arrests;
    for (var i = 0; i < st.parts.length; i++) {
      var a = arr[st.parts[i].pid];
      if (a !== undefined && st.day >= a) return true;
    }
    return false;
  }
  CP._blocked = function (stepId) { return blockedStep(this, stepId); };
  function visible(cs, e) {
    if (e._day !== undefined && e._day >= cs.day) return false;
    if (e._step && blockedStep(cs, e._step)) return false;
    return true;
  }

  // ------------------------------------------------------------ background noise (lazy, deterministic)
  function bgNames(R, cid, n) {
    var cc = DATA.CITIES[cid].cc; var home = cc === 'WB' ? 'DE' : cc;
    var nats = [home, home, home, 'DE', 'AT', 'IT', 'FR', 'GB', 'NL', 'CH', 'HU', 'CS', 'YU', 'TR'].filter(function (x) { return DATA.NAT[x]; });
    var out = [];
    for (var i = 0; i < n; i++) {
      var nat = R.pick(nats), N = DATA.NAT[nat], sex = R.chance(0.3) ? 'f' : 'm';
      var s = R.pick(N.sur); if (sex === 'f') s = DATA.fem(nat, s);
      out.push({ name: R.pick(sex === 'f' ? N.female : N.male) + ' ' + s, nat: nat });
    }
    return out;
  }
  function bgHotelNight(cs, hotelKey, night) {
    var k = hotelKey + '|' + night;
    if (cs._s.bgHotel[k]) return cs._s.bgHotel[k];
    var W = cs._w, h = W.hotels[hotelKey];
    var R = CX.rng(W.seed + '/bgh/' + k);
    var list = [];
    bgNames(R, h.city, R.int(3, h.stars >= 4 ? 9 : 6)).forEach(function (g) {
      if (W.nameOwner[g.name]) return;
      var N = DATA.NAT[g.nat];
      var cities = Object.keys(DATA.CITIES).filter(function (c) { var x = DATA.CITIES[c].cc; return (x === 'WB' ? 'DE' : x) === g.nat; });
      var hc = cities.length ? R.pick(cities) : R.pick(Object.keys(DATA.CITIES));
      var C = DATA.CITIES[hc];
      var home = C.addr.replace('{s}', R.pick(C.streets)).replace('{n}', String(R.int(2, 140))).replace('{f}', String(R.int(1, 24))).replace('{z}', R.pick(C.zip)).replace('{d}', C.dist ? R.pick(C.dist) : '');
      var e = { r: 'stay', hotel: hotelKey, city: DATA.CITIES[h.city].name, name: g.name, nat: N.adj, passport: CX.pat(N.pass, R), dob: CX.pad(R.int(1, 28)) + '.' + CX.pad(R.int(1, 12)) + '.' + R.int(1925, 1968), home: home, arr: night, arrTime: R.int(11 * 60, 23 * 60), dep: night + 1, room: String(R.int(1, 5)) + CX.pad(R.int(1, 24)), note: R.chance(0.2) ? R.pick(DATA.FLAVOUR.hotelNotes.concat(DATA.FLAVOUR.innocentHotelNotes)) : null, paid: R.pick(['cash', 'Eurocheque', 'American Express', 'company invoice']), _id: 'bg' + CX.hash(k + g.name), _sys: 'hotels', _day: night, _bg: true, _pids: [] };
      list.push(e);
      ix(cs, 'hotels', 'name:' + e.name, e); ix(cs, 'hotels', 'passport:' + e.passport, e);
      cs._s.entryById[e._id] = e;
    });
    cs._s.bgHotel[k] = list;
    return list;
  }
  function bgFlight(cs, flight, day, proto) {
    var k = flight + '|' + day;
    if (cs._s.bgFlight[k]) return cs._s.bgFlight[k];
    var W = cs._w;
    var R = CX.rng(W.seed + '/bgf/' + k);
    var fromCity = Object.keys(DATA.CITIES).filter(function (c) { return DATA.CITIES[c].airport.c === proto.from; })[0] || W.cities[0];
    var list = [];
    var seats = {}; (cs._s.idx['airline|flight:' + flight] || []).forEach(function (e) { if (e.day === day) seats[e.seat] = 1; });
    bgNames(R, fromCity, R.int(7, 16)).forEach(function (g) {
      if (W.nameOwner[g.name]) return;
      var seat; do { seat = R.int(3, 30) + R.pick(['A', 'B', 'C', 'D', 'E', 'F']); } while (seats[seat]); seats[seat] = 1;
      var e = { r: 'pax', flight: flight, airline: proto.airline, day: day, from: proto.from, to: proto.to, fromCity: proto.fromCity, toCity: proto.toCity, dep: proto.dep, name: g.name, seat: seat, agent: R.pick(DATA.TRAVEL_AGENTS), paidBy: R.pick(['cash', 'cash', 'company invoice', 'credit card', 'travel agency voucher']), booked: day - R.int(1, 20), _id: 'bgf' + CX.hash(k + g.name), _sys: 'airline', _day: day - 20, _bg: true, _pids: [] };
      list.push(e);
      ix(cs, 'airline', 'name:' + e.name, e);
      cs._s.entryById[e._id] = e;
    });
    cs._s.bgFlight[k] = list;
    return list;
  }

  // ------------------------------------------------------------ query
  function normKey(key) {
    if (!key) return null;
    if (typeof key === 'string') return { t: '?', v: key };
    if (key.t === 'hotel+date' || (key.hotel !== undefined && key.date !== undefined)) return { t: 'hotel+date', hotel: key.hotel, date: parseInt(key.date, 10) };
    return { t: key.t, v: String(key.v) };
  }
  CP.canQuery = function (system, key) {
    var S = SYS[system];
    if (this.over) return 'The case is closed.';
    if (!S) return 'Unknown record system.';
    key = normKey(key);
    if (!key) return 'No key given.';
    if (key.t === '?') {
      var cands = this._s.tokenList.filter(function (t) { return t.v === key.v && S.keys.indexOf(t.t) >= 0; });
      if (!cands.length) return 'You hold no such key for this system.';
      key.t = cands[0].t;
    }
    if (S.keys.indexOf(key.t) < 0) return S.label + ' cannot be searched by ' + key.t + '.';
    if (key.t === 'hotel+date') {
      if (!this.holds('hotel', key.hotel)) return 'You hold no such hotel.';
      if (!this.holds('date', key.date)) return 'You hold no such date.';
    } else if (!this.holds(key.t, key.v)) return 'You hold no such key.';
    if (this.hoursLeft < S.hours) return 'Not enough team-hours left today (' + S.hours + ' needed).';
    return null;
  };
  CP.query = function (system, key) {
    var err = this.canQuery(system, key);
    if (err) return { error: err, hoursSpent: 0 };
    key = normKey(key);
    if (key.t === '?') key.t = this._s.tokenList.filter(function (t) { return t.v === key.v && SYS[system].keys.indexOf(t.t) >= 0; })[0].t;
    var S = SYS[system];
    this.hoursLeft -= S.hours;
    this._s.hoursUsed += S.hours; this._s.queries++;
    this._s.log.push(['q', system, key]);
    var res = runQuery(this, system, key);
    var doc = makeDoc(this, res, { hours: S.hours, query: { system: system, key: key } });
    return { doc: doc, hoursSpent: S.hours };
  };
  /** entries a query would show right now (no cost, no side effects on tokens) — used by the solver's oracle */
  CP._peek = function (system, key) { return runQuery(this, system, normKey(key), true).entries; };

  function sortBy(list, f) { return list.slice().sort(function (a, b) { var x = f(a), y = f(b); return x < y ? -1 : x > y ? 1 : 0; }); }
  function get(cs, sys, k) { return (cs._s.idx[sys + '|' + k] || []).filter(function (e) { return visible(cs, e); }); }

  function roomCalls(cs, stays) {
    var out = [];
    stays.forEach(function (e) { (e._calls || []).forEach(function (id) { var c = cs._s.entryById[id]; if (c && visible(cs, c)) out.push(c); }); });
    return out;
  }
  function runQuery(cs, sys, key, noRender) {
    var W = cs._w, cal = W.cal, out = { sys: sys, key: key, entries: [], lines: [], title: '', from: '', style: 'form' };
    out.nr = !!noRender;
    return runQuery2(cs, sys, key, out, W, cal);
  }
  function runQuery2(cs, sys, key, out, W, cal) {
    var kv = key.t === 'hotel+date' ? null : key.v;
    var entries = [];
    switch (sys) {
      case 'hotels':
        if (key.t === 'hotel+date') {
          var h = W.hotels[key.hotel];
          if (h && key.date < cs.day) bgHotelNight(cs, key.hotel, key.date);
          entries = get(cs, 'hotels', 'hd:' + key.hotel + '|' + key.date);
          if (h && key.date < cs.day) entries = entries.concat(bgHotelNight(cs, key.hotel, key.date).filter(function (e) { return visible(cs, e); }));
          renderHotelNight(cs, out, key, h, entries);
        } else {
          entries = get(cs, 'hotels', key.t + ':' + kv);
          entries = entries.concat(roomCalls(cs, entries.filter(function (e) { return e.r === 'stay'; })));
          renderHotelName(cs, out, key, entries);
        }
        break;
      case 'border': entries = get(cs, 'border', key.t + ':' + kv); renderBorder(cs, out, key, entries); break;
      case 'airline':
        entries = get(cs, 'airline', key.t + ':' + kv);
        if (key.t === 'flight') {
          var days = {}; entries.forEach(function (e) { days[e.day] = e; });
          Object.keys(days).forEach(function (d) { if (+d < cs.day + 30) entries = entries.concat(bgFlight(cs, kv, +d, days[d]).filter(function (e) { return e.booked < cs.day; })); });
        }
        renderAirline(cs, out, key, entries); break;
      case 'phones': entries = get(cs, 'phones', 'number:' + kv); renderPhone(cs, out, key, entries); break;
      case 'bank': entries = get(cs, 'bank', key.t + ':' + kv);
        if (key.t === 'company') { var accs = entries.filter(function (e) { return e.r === 'acct'; }); accs.forEach(function (a) { entries = entries.concat(get(cs, 'bank', 'account:' + a.account).filter(function (e) { return e.r === 'tx'; })); }); }
        renderBank(cs, out, key, entries); break;
      case 'vehicles': entries = get(cs, 'vehicles', 'plate:' + kv); renderVehicle(cs, out, key, entries); break;
      case 'residents': entries = get(cs, 'residents', key.t + ':' + kv); renderResidents(cs, out, key, entries); break;
      case 'companies': entries = get(cs, 'companies', 'company:' + kv); renderCompany(cs, out, key, entries); break;
      case 'archive': entries = get(cs, 'archive', 'name:' + kv); renderArchive(cs, out, key, entries); break;
    }
    // unique
    var seen = {}; out.entries = entries.filter(function (e) { if (seen[e._id]) return false; seen[e._id] = 1; return true; });
    return out;
  }

  // ------------------------------------------------------------ renderers
  function cityOfName(name) { var k = Object.keys(DATA.CITIES).filter(function (c) { return DATA.CITIES[c].name === name; })[0]; return k ? DATA.CITIES[k] : null; }
  function countryOfCityName(name) { var c = cityOfName(name); return c ? DATA.COUNTRY[c.cc] : DATA.COUNTRY.AT; }
  function viaLine(country) { return country.east ? ' (copy obtained via ' + country.service + ')' : ''; }
  function dTok(cs, d, f) { return tk('date', d, f ? f(d) : cs._w.cal.dmy(d)); }
  function hotelTok(cs, hk) { return tk('hotel', hk, cs._w.hotels[hk] ? cs._w.hotels[hk].name : hk); }
  function placeTok(cs, vk) { return tk('place', vk, cs._w.venues[vk] ? cs._w.venues[vk].name : vk); }
  function acctTok(a) { return tk('account', a); }
  function numTok(n) { return tk('number', n); }
  function addrTok(a) { return tk('address', a); }

  function stayBlock(cs, out, e, compact) {
    var W = cs._w, cal = W.cal;
    var country = countryOfCityName(e.city);
    var form = country.hotelForm;
    out.lines.push(L('h', hotelTok(cs, e.hotel), ', ', e.city, ' — ', form, ' No. ', String(CX.hash(e._id) % 90000 + 10000), viaLine(country)));
    out.lines.push(L('m', 'Name: ', regName(e.name), '   Nationality: ', e.nat, '   Born: ', e.dob));
    out.lines.push(L('m', 'Passport: ', tk('passport', e.passport), '   Home address: ', addrTok(e.home)));
    var depTxt = e.dep < cs.day ? ['Departed: ', dTok(cs, e.dep)] : ['Departure expected: ', dTok(cs, e.dep)];
    out.lines.push(L('m', 'Arrived: ', dTok(cs, e.arr), ' ', CX.hm(e.arrTime), '   ', depTxt, '   Room ', e.room));
    if (!compact) out.lines.push(L('m', 'Settled: ', e.paidAcc ? ['transfer from account ', acctTok(e.paidAcc)] : e.paidCo ? ['invoice to ', tk('company', e.paidCo)] : e.paid));
    if (e.viewOf) out.lines.push(L('n', 'Reception: guest insisted on a room facing the ', placeTok(cs, e.viewOf), '; refused two rooms on the courtyard side.'));
    else if (e.note) out.lines.push(L('n', 'Reception: ', e.note));
    if (!compact && e._calls) {
      var calls = e._calls.map(function (id) { return cs._s.entryById[id]; }).filter(function (c) { return c && visible(cs, c); });
      if (calls.length) {
        out.lines.push(L('m', 'Telephone charges (room ' + e.room + '):'));
        calls.forEach(function (c) { out.lines.push(L('m', '   ', dTok(cs, c.day, cal.dmyShort), ' ', CX.hm(c.time), '  → ', numTok(c.to), '  ', Math.max(1, Math.ceil(c.dur / 60)), Math.ceil(c.dur / 60) > 1 ? ' units' : ' unit')); });
      }
    }
  }
  function resvBlock(cs, out, e) {
    var cal = cs._w.cal;
    out.lines.push(L('h', hotelTok(cs, e.hotel), ', ', e.city, ' — reservations book'));
    out.lines.push(L('m', 'Reserved for ', regName(e.name), ': nights ', dTok(cs, e.from), ' to ', dTok(cs, e.to), '.'));
    out.lines.push(L('m', 'Booked ', dTok(cs, e.made), e.inPerson ? ' in person at reception.' : [' by telephone from ', numTok(e.byNum), '.']));
    if (e.viewOf) out.lines.push(L('n', 'Same room as on last visit requested (facing the ', placeTok(cs, e.viewOf), ').'));
    else if (e.note) out.lines.push(L('n', e.note));
  }
  function renderHotelName(cs, out, key, entries) {
    if (out.nr) return;
    out.title = 'Hotel registrations — ' + (key.t === 'name' ? 'name ' : 'passport ') + key.v;
    out.from = 'Collated from police guest registrations';
    out.style = 'register';
    var stays = sortBy(entries.filter(function (e) { return e.r === 'stay'; }), function (e) { return e.arr; });
    var resv = entries.filter(function (e) { return e.r === 'resv'; });
    if (!stays.length && !resv.length) out.lines.push(L('p', 'No registration found for ', key.t === 'name' ? nameTok(key.v) : tk('passport', key.v), ' in the case period (from 1 September 1989).'));
    stays.forEach(function (e) { stayBlock(cs, out, e); });
    resv.forEach(function (e) { resvBlock(cs, out, e); });
  }
  function renderHotelNight(cs, out, key, h, entries) {
    if (out.nr) return;
    var W = cs._w, cal = W.cal;
    out.title = 'Hotel register — ' + (h ? h.name : key.hotel) + ', night of ' + cal.dmy(key.date);
    out.from = h ? countryOfCityName(DATA.CITIES[h.city].name).police + ', ' + DATA.CITIES[h.city].name : '';
    out.style = 'register';
    if (!h) { out.lines.push(L('p', 'Unknown establishment.')); return; }
    out.lines.push(L('h', hotelTok(cs, key.hotel), ' (', h.stars, '★), ', h.addr, ', ', DATA.CITIES[h.city].name, ' — guests present, night of ', dTok(cs, key.date), viaLine(countryOfCityName(DATA.CITIES[h.city].name))));
    var stays = sortBy(entries.filter(function (e) { return e.r === 'stay'; }), function (e) { return parseInt(e.room, 10); });
    if (key.date >= cs.day) out.lines.push(L('p', 'Night not yet reached: register shows reservations only.'));
    else if (!stays.length) out.lines.push(L('p', 'No guests registered.'));
    stays.forEach(function (e) {
      out.lines.push(L('m', 'Rm ', e.room, '  ', regName(e.name), '  ', e.nat, '  b. ', e.dob, '  pass. ', tk('passport', e.passport), '  arr. ', dTok(cs, e.arr, cal.dmyShort), ' ', CX.hm(e.arrTime)));
      if (e.viewOf) out.lines.push(L('n', '   wanted a room facing the ', placeTok(cs, e.viewOf)));
    });
    var resv = entries.filter(function (e) { return e.r === 'resv'; });
    if (resv.length) {
      out.lines.push(L('h', 'Reservations for this night'));
      resv.forEach(function (e) { out.lines.push(L('m', regName(e.name), '  nights ', dTok(cs, e.from, cal.dmyShort), '–', dTok(cs, e.to, cal.dmyShort), e.byNum ? ['  booked by phone from ', numTok(e.byNum)] : '  booked at reception', e.viewOf ? ['  (room facing the ', placeTok(cs, e.viewOf), ')'] : '')); });
    }
  }
  function renderBorder(cs, out, key, entries) {
    if (out.nr) return;
    var cal = cs._w.cal;
    out.title = 'Border crossings — ' + key.t + ' ' + key.v;
    out.from = 'Collated from frontier control records (entry controls)';
    out.style = 'report';
    var list = sortBy(entries, function (e) { return e.day * 1440 + e.time; });
    if (!list.length) out.lines.push(L('p', 'No crossing recorded for ', key.t === 'plate' ? tk('plate', key.v) : key.t === 'name' ? nameTok(key.v) : tk('passport', key.v), ' since 1 September 1989.'));
    list.forEach(function (e) {
      var country = DATA.COUNTRY[Object.keys(DATA.COUNTRY).filter(function (k) { return DATA.COUNTRY[k].name === e.entering; })[0]] || DATA.COUNTRY.AT;
      out.lines.push(L('h', dTok(cs, e.day), ' ', CX.hm(e.time), ' — ', e.point, ' — entry into ', e.entering, '  (', country.border, ')'));
      out.lines.push(L('m', regName(e.name), ', ', e.nat, ', b. ', e.dob, ', passport ', tk('passport', e.passport)));
      if (e.mode === 'car') out.lines.push(L('m', e.role === 'driver' ? 'Driver of ' : 'Passenger in ', tk('plate', e.plate), e.vehicle ? ' (' + e.vehicle + ')' : ''));
      else if (e.mode === 'train') out.lines.push(L('m', 'Rail passenger, train ', e.train));
      else out.lines.push(L('m', 'Arriving passenger, flight ', tk('flight', e.flight)));
      if (e.companions && e.companions.length) out.lines.push(L('m', 'Travelling with: ', e.companions.map(function (n, i) { return [i ? '; ' : '', regName(n)]; })));
      if (e.customs) out.lines.push(L('n', 'Customs: ', e.customs, '.'));
    });
  }
  function renderAirline(cs, out, key, entries) {
    if (out.nr) return;
    var cal = cs._w.cal;
    out.style = 'manifest';
    var list = sortBy(entries, function (e) { return e.day * 10000 + (e._bg ? 1 : 0); });
    if (key.t === 'name') {
      out.title = 'Airline bookings and manifests — ' + key.v;
      out.from = 'Airline reservation systems (via liaison)';
      if (!list.length) out.lines.push(L('p', 'No booking found for ', nameTok(key.v), '.'));
      list.forEach(function (e) {
        var status = e.day < cs.day ? 'flown' : 'BOOKED';
        out.lines.push(L('m', tk('flight', e.flight), ' ', dTok(cs, e.day, cal.air), ' ', e.from, '-', e.to, ' dep ', CX.hm(e.dep), '  ', tk('name', e.name, surname(e.name).toUpperCase().replace(/ /g, '') + '/' + given(e.name).toUpperCase()), '  seat ', e.seat, '  ', status));
        out.lines.push(L('m', '   booked ', dTok(cs, e.booked, cal.dmyShort), ' via ', e.agent, ' — paid: ', e.paidAcc ? ['account ', acctTok(e.paidAcc)] : e.paidCo ? ['invoice to ', tk('company', e.paidCo)] : e.paidBy));
      });
    } else {
      out.title = 'Passenger manifests — flight ' + key.v;
      out.from = list.length ? list[0].airline : 'Airline';
      if (!list.length) out.lines.push(L('p', 'No manifest held for ', tk('flight', key.v), ' in the case period.'));
      var byDay = {};
      list.forEach(function (e) { (byDay[e.day] = byDay[e.day] || []).push(e); });
      Object.keys(byDay).sort(function (a, b) { return a - b; }).forEach(function (d) {
        var l = byDay[d]; var f = l[0];
        out.lines.push(L('h', tk('flight', f.flight), ' ', f.fromCity, ' (', f.from, ') → ', f.toCity, ' (', f.to, '), ', dTok(cs, +d), ', dep ', CX.hm(f.dep), +d >= cs.day ? ' — booking list as of today' : ' — final manifest'));
        sortBy(l, function (e) { return parseInt(e.seat, 10); }).forEach(function (e) {
          out.lines.push(L('m', '  ', CX.pad(e.seat, 3), '  ', tk('name', e.name, surname(e.name).toUpperCase().replace(/ /g, '') + '/' + given(e.name).toUpperCase()), '  paid: ', e.paidAcc ? acctTok(e.paidAcc) : e.paidCo ? tk('company', e.paidCo) : e.paidBy));
        });
      });
    }
  }
  function phoneAdmin(num) {
    if (/^\+43/.test(num)) return 'Post- und Telegraphenverwaltung — Gesprächsnachweis';
    if (/^\+49/.test(num)) return 'Deutsche Bundespost — Einzelverbindungsnachweis';
    if (/^\+37/.test(num)) return 'Deutsche Post (GDR) — Fernsprechamt, via source HANSA';
    if (/^\+36/.test(num)) return 'Magyar Posta — hívásjegyzék, via source DUNA';
    if (/^\+42/.test(num)) return 'SPT Praha — výpis hovorů, via source MORAVA';
    if (/^\+41/.test(num)) return 'PTT — Gesprächsdaten (Bundesanwaltschaft order)';
    if (/^\+39/.test(num)) return 'SIP — tabulato traffico';
    if (/^\+33/.test(num)) return 'France Télécom — relevé détaillé (réquisition)';
    if (/^\+351/.test(num)) return 'TLP — registo de chamadas';
    if (/^\+90/.test(num)) return 'PTT İstanbul — görüşme dökümü';
    return 'Telephone administration';
  }
  function renderPhone(cs, out, key, entries) {
    if (out.nr) return;
    var cal = cs._w.cal;
    out.title = 'Call records — ' + key.v;
    out.from = phoneAdmin(key.v);
    out.style = 'cdr';
    var line = entries.filter(function (e) { return e.r === 'line'; })[0];
    if (line) {
      var subTok = line.kind === 'flat' ? regName(line.subscriber) : line.kind === 'office' ? (cs._w.companies[line.subscriber] ? tk('company', line.subscriber) : line.subscriber) : line.kind === 'hotel' && line.hotel ? [hotelTok(cs, line.hotel), ' (switchboard)'] : line.subscriber;
      out.lines.push(L('h', 'Line ', numTok(key.v), ' — subscriber: ', subTok));
      out.lines.push(L('m', 'Installation address: ', line.kind === 'flat' || line.kind === 'office' ? addrTok(line.address) : line.address, '   Type: ', { flat: 'private', office: 'business', hotel: 'hotel switchboard (not itemised by room)', business: 'business' }[line.kind] || line.kind));
    } else out.lines.push(L('p', 'Number ', numTok(key.v), ': no subscriber on record for the case period.'));
    var calls = sortBy(entries.filter(function (e) { return e.r === 'call'; }), function (e) { return e.day * 1440 + e.time; });
    if (line && line.kind === 'hotel') calls = calls.filter(function (c) { return !c._noise; });
    if (!calls.length) out.lines.push(L('p', 'No calls in the period.'));
    else out.lines.push(L('m', 'DATE      TIME   DIR  OTHER PARTY          DURATION'));
    calls.forEach(function (c) {
      var outb = c.from === key.v;
      var other = outb ? c.to : c.from;
      out.lines.push(L('m', dTok(cs, c.day, cal.dmyShort), '  ', CX.hm(c.time), '  ', outb ? 'OUT' : 'IN ', '  ', numTok(other), '   ', Math.floor(c.dur / 60) + "'" + CX.pad(c.dur % 60) + '"'));
    });
  }
  function renderBank(cs, out, key, entries) {
    if (out.nr) return;
    var W = cs._w, cal = W.cal;
    out.style = 'bank';
    var accs = entries.filter(function (e) { return e.r === 'acct'; });
    out.title = 'Bank records — ' + (key.t === 'company' ? 'accounts of ' : 'account ') + key.v;
    out.from = accs.length ? accs[0].bank + ', ' + accs[0].city + ' — statement extract under court order ' + (CX.hash(key.v) % 40 + 1) + ' Vr ' + (1000 + CX.hash(key.v) % 8000) + '/89' : 'Banking supervision';
    if (!accs.length) { out.lines.push(L('p', 'No account found for ', key.t === 'company' ? tk('company', key.v) : acctTok(key.v), '.')); return; }
    accs.forEach(function (a) {
      out.lines.push(L('h', 'Account ', acctTok(a.account), ' — ', a.bank, ', ', a.city));
      out.lines.push(L('m', 'Holder: ', a.holderKind === 'personal' ? regName(a.holder) : a.company ? tk('company', a.company) : a.holder, '   Address: ', a.holderKind === 'utility' ? a.address : addrTok(a.address)));
      if (a.signatory) out.lines.push(L('m', 'Authorised signatory: ', regName(a.signatory)));
      if (a._hub) { out.lines.push(L('p', 'Corporate/merchant account: transactions outside the scope of the order.')); return; }
      var txs = sortBy(entries.filter(function (e) { return e.r === 'tx' && (e.from === a.account || e.to === a.account); }), function (e) { return e.day; });
      if (!txs.length) out.lines.push(L('p', 'No movements in the period.'));
      else out.lines.push(L('m', 'DATE        DEBIT/CREDIT      COUNTERPARTY                         REFERENCE'));
      txs.forEach(function (t) {
        var outg = t.from === a.account;
        var cp = outg ? t.to : t.from;
        var cpa = W.accounts[cp];
        var cpName = cpa ? (cpa.holderKind === 'personal' ? regName(cpa.holder) : cpa.company ? tk('company', cpa.company) : cpa.holder) : '';
        var refSegs = t.plate && t.ref.indexOf(t.plate) >= 0 ? [t.ref.split(t.plate)[0], tk('plate', t.plate), t.ref.split(t.plate)[1]] : [t.ref];
        out.lines.push(L('m', dTok(cs, t.day, cal.dmy), '  ', outg ? '−' : '+', CX.money(t.amount, ' '), ' ', t.cur, '   ', outg ? 'to ' : 'from ', acctTok(cp), ' (', cpName, ')   "', refSegs, '"'));
      });
    });
  }
  function renderVehicle(cs, out, key, entries) {
    if (out.nr) return;
    var cal = cs._w.cal;
    out.title = 'Vehicle registry — ' + key.v;
    out.style = 'form';
    var v = entries.filter(function (e) { return e.r === 'veh'; })[0];
    out.from = 'Vehicle registration authority';
    if (!v) { out.lines.push(L('p', 'Registration ', tk('plate', key.v), ' not found.')); return; }
    out.lines.push(L('h', tk('plate', v.plate), ' — ', v.make, ', ', v.colour));
    out.lines.push(L('m', 'Registered keeper: ', v.ownerKind === 'private' ? regName(v.owner) : v.owner, '   Address: ', v.ownerKind === 'private' ? addrTok(v.ownerAddr) : v.ownerAddr));
    var rentals = sortBy(entries.filter(function (e) { return e.r === 'rental'; }), function (e) { return e.from; });
    if (v.ownerKind === 'rental') {
      if (!rentals.length) out.lines.push(L('p', 'Rental agreements in the period: none on file.'));
      rentals.forEach(function (r) {
        out.lines.push(L('h', 'Rental agreement No. ', String(CX.hash(r._id) % 90000 + 10000), ' — ', r.agency, ', ', r.branch));
        out.lines.push(L('m', 'Renter: ', regName(r.renter), ', ', r.nat, ', born ', r.dob, ', passport ', tk('passport', r.passport), ', driving licence ', r.licence));
        out.lines.push(L('m', 'Renter\'s address: ', addrTok(r.home)));
        out.lines.push(L('m', 'Out: ', dTok(cs, r.from), '   Return due: ', dTok(cs, r.to), '   Deposit: ', CX.money(r.deposit, ' '), ' ', r.depositCur, r.depositFrom === 'cash' ? ' cash' : [' from account ', acctTok(r.depositFrom)]));
        out.lines.push(L('n', 'Issued by: ', regName(r.clerk)));
      });
    }
  }
  function renderResidents(cs, out, key, entries) {
    if (out.nr) return;
    out.style = 'form';
    out.title = 'Residence registry — ' + key.t + ' ' + key.v;
    out.from = 'Residence registries (collated)';
    if (!entries.length) {
      out.lines.push(L('p', 'No registration found under ', key.t === 'name' ? nameTok(key.v) : addrTok(key.v), '.'));
      out.lines.push(L('n', key.t === 'name' ? 'Foreign visitors are registered only when resident for more than three days.' : 'Address may not exist or may be commercial premises.'));
      return;
    }
    entries.forEach(function (e) {
      var country = countryOfCityName(e.city);
      var current = key.t === 'name' || e.address === key.v;
      out.lines.push(L('h', country.resReg, ', ', e.city, viaLine(country)));
      out.lines.push(L('m', regName(e.name), ', born ', e.dob, ', ', e.nat));
      out.lines.push(L('m', current ? 'Registered at ' : 'Formerly registered at ', addrTok(e.address), current ? ' since ' + e.since : ''));
      if (e.prev) out.lines.push(L('m', 'Previous address: ', addrTok(e.prev)));
      out.lines.push(L('m', 'Occupation: ', e.occupation, e.employer ? ['   Employer: ', cs._w.companies[e.employer] ? tk('company', e.employer) : cs._w.venues[e.employer] ? placeTok(cs, e.employer) : e.employer] : ''));
    });
  }
  function renderCompany(cs, out, key, entries) {
    if (out.nr) return;
    var cal = cs._w.cal;
    out.style = 'form';
    out.title = 'Commercial register — ' + key.v;
    var c = entries[0];
    if (!c) { out.from = 'Commercial registers'; out.lines.push(L('p', 'No company registered under ', tk('company', key.v), '.')); return; }
    var country = countryOfCityName(c.city);
    out.from = country.coReg + ', ' + c.city;
    out.lines.push(L('h', tk('company', c.company), ' — ', c.regNo));
    out.lines.push(L('m', 'Registered office: ', addrTok(c.address)));
    out.lines.push(L('m', 'Entered: ', cal.dmy(c.founded)));
    out.lines.push(L('m', 'Directors / authorised persons: ', c.directors.map(function (n, i) { return [i ? '; ' : '', regName(n)]; })));
    out.lines.push(L('m', 'Bankers: ', c.accounts.map(function (a, i) { return [i ? '; ' : '', acctTok(a)]; })));
    out.lines.push(L('n', c.notes));
  }
  function renderArchive(cs, out, key, entries) {
    if (out.nr) return;
    out.style = 'card';
    out.title = 'Archive — ' + key.v;
    out.from = 'Registry, own service';
    if (!entries.length) { out.lines.push(L('p', 'No card under ', nameTok(key.v), ' in the main or alias index.')); out.lines.push(L('n', 'Registry clerk: "Nothing. Not even a parking ticket."')); return; }
    entries.forEach(function (c) {
      out.lines.push(L('h', 'CARD ', c.fileNo, ' — ', regName(c.name)));
      out.lines.push(L('m', 'Born ', c.dob, ', ', c.nat, '. File opened ', String(c.opened), '.'));
      out.lines.push(L('p', c.summary));
      if (c.aliases.length) out.lines.push(L('m', 'Known aliases: ', c.aliases.map(function (n, i) { return [i ? '; ' : '', regName(n)]; })));
      if (c.associates.length) out.lines.push(L('m', 'Known associates: ', c.associates.map(function (n, i) { return [i ? '; ' : '', regName(n)]; })));
      out.lines.push(L('m', 'Photograph on file: ', c.photo ? 'yes' : 'no'));
      if (key.v !== c.name) out.lines.push(L('n', 'Found via alias index (', key.v, ').'));
    });
  }

  // ------------------------------------------------------------ docs
  function strip(e, cs) {
    var o = {};
    for (var k in e) if (k.charAt(0) !== '_' && k !== 'body') o[k] = e[k];
    if (e.r === 'stay' && cs) o.calls = roomCalls(cs, [e]).map(function (c) { return { to: c.to, day: c.day, time: c.time, dur: c.dur }; });
    return o;
  }
  function makeDoc(cs, res, meta) {
    var s = cs._s;
    var id = 'D' + CX.pad(s.docs.length + 1, 4);
    var toks = [], seenT = {};
    res.lines.forEach(function (l) { l.x.forEach(function (seg) { if (typeof seg === 'object' && !seenT[seg.t + ':' + seg.v]) { seenT[seg.t + ':' + seg.v] = 1; toks.push(seg); } }); });
    var doc = {
      id: id, sys: res.sys, kind: meta.kind || 'query', style: res.style || 'form', title: res.title, from: res.from,
      day: cs.day, time: meta.time || cs.clock(), hours: meta.hours || 0, query: meta.query || null,
      body: res.lines, tokens: toks, recs: res.entries.map(function (e) { return strip(e, cs); })
    };
    Object.defineProperty(doc, '_entries', { value: res.entries.map(function (e) { return e._id; }), enumerable: false });
    s.docs.push(doc); s.docById[id] = doc;
    res.entries.forEach(function (e) { s.seen[e._id] = true; });
    toks.forEach(function (t) {
      var k = t.t + ':' + t.v;
      if (!s.tokens[k]) { s.tokens[k] = { t: t.t, v: t.v, d: t.d, doc: id }; s.tokenList.push(s.tokens[k]); }
    });
    return doc;
  }
  CP._makeDoc = function (res, meta) { return makeDoc(this, res, meta); };
  var TRAFFIC_META = {
    tip: { style: 'telex', title: 'Telex from a partner service', from: 'Liaison traffic' },
    intercept: { style: 'telex', title: 'Intercept transcript', from: 'Partner-service intercept' },
    police: { style: 'report', title: 'Police report', from: 'Police' },
    news: { style: 'news', title: 'Newspaper cutting', from: 'Press' },
    informant: { style: 'note', title: 'Informant note', from: 'Agent-running section' },
    press: { style: 'report', title: 'Press-office note', from: 'Protective security' },
    porter: { style: 'report', title: 'Hotel contact report', from: 'Police' },
    consular: { style: 'note', title: 'Consular / desk note', from: 'Desk' },
    statement: { style: 'report', title: 'Interrogation statement', from: 'Interrogation' }
  };
  function renderTraffic(cs, e) {
    var W = cs._w, cal = W.cal;
    var meta = TRAFFIC_META[e.r] || TRAFFIC_META.consular;
    var lines = [];
    if (e.r === 'intercept') {
      var subA = W.phones[e.from] ? W.phones[e.from].subscriber : '?';
      lines.push(L('h', 'INTERCEPT — ', e.service, ' — line ', numTok(e.from), ' to ', numTok(e.to)));
      lines.push(L('m', dTok(cs, e.day), ' ', CX.hm(e.time), ', duration ', Math.floor(e.dur / 60) + "'" + CX.pad(e.dur % 60) + '"', '. Language: ', R_lang(e), '. Transcript (translated):'));
      e.lines.forEach(function (l) { var t = l.text.charAt(0).toUpperCase() + l.text.slice(1); if (!/[.?!]$/.test(t)) t += '.'; lines.push(L('m', l.spk === 'A' ? 'A (caller): ' : 'B: ', '"', t, '"')); });
      lines.push(L('n', 'Voice A ', e.sexA === 'f' ? 'female' : 'male', ', ', R_voice(e), '. Voice B not identified.'));
      return { lines: lines, title: 'Intercept — ' + e.service, from: e.service + ' (partner service)', style: 'telex' };
    }
    (e.body || []).forEach(function (seg, i) { lines.push(L(i === 0 ? 'h' : 'p', seg)); });
    var title = meta.title;
    if (e.r === 'news') title = e.paper + ' — official calendar';
    if (e.r === 'police') title = e.kind === 'theft' ? 'Police report — theft' : e.kind === 'photo' ? 'Security note — photographer' : e.kind === 'seizure' ? 'Customs seizure' : 'Police daily summary';
    return { lines: lines, title: title, from: meta.from, style: meta.style };
  }
  function R_lang(e) { return ['German', 'German, accented', 'English', 'French', 'German (Viennese)'][CX.hash(e._id) % 5]; }
  function R_voice(e) { return ['40-50, smoker', 'educated, precise', 'accent not placed', 'hurried'][CX.hash(e._id + 'v') % 4]; }

  function deliverTraffic(cs, day) {
    var W = cs._w, out = [];
    W.traffic.filter(function (e) { return e._push === day; }).forEach(function (e, i) {
      if (e._step && blockedStep(cs, e._step)) return;
      var r = renderTraffic(cs, e);
      var res = { sys: 'traffic', lines: r.lines, title: r.title, from: r.from, style: r.style, entries: [e] };
      out.push(makeDoc(cs, res, { kind: e.r === 'police' || e.r === 'seizure' ? 'police' : e.r, time: CX.hm(7 * 60 + i * 11) }));
    });
    return out;
  }
  CP._deliverTraffic = function (day) { return deliverTraffic(this, day); };

  // ------------------------------------------------------------ clock
  CP.endDay = function () {
    if (this.over) return { day: this.day, newDocs: [], outcome: this.outcome };
    this._s.log.push(['e']);
    if (this.day >= this._w.D) {
      var oc = CX.resolveCase(this, { type: 'none' });
      return { day: this.day, newDocs: [], outcome: oc };
    }
    this.day++;
    this.hoursLeft = this.dayHours;
    var nd = deliverTraffic(this, this.day);
    return { day: this.day, newDocs: nd, outcome: null };
  };

  // ------------------------------------------------------------ timeline for UI
  CP.timeline = function () {
    var W = this._w, s = this._s;
    var phases = [['planning', 'Planning'], ['logistics', 'Logistics'], ['recon', 'Reconnaissance'], ['rehearsal', 'Rehearsal'], ['act', 'The act']];
    var seenSteps = {};
    Object.keys(s.seen).forEach(function (id) { var e = s.entryById[id]; if (e && e._step && e._net) seenSteps[e._step] = true; });
    return phases.map(function (ph) {
      var days = CX.uniq(W.steps.filter(function (st) { return st.phase === ph[0] && seenSteps[st.id]; }).map(function (st) { return st.day; })).sort(function (a, b) { return a - b; });
      return { phase: ph[0], label: ph[1], days: days, known: days.length > 0 };
    });
  };

  // ------------------------------------------------------------ board subjects (saved)
  CP.addSubject = function (o) { var s = this._s; var sub = { id: 'S' + (++s.subjN), label: o.label || '', names: (o.names || []).slice() }; s.subjects.push(sub); s.log.push(['sa', CX.clone(o)]); return sub; };
  CP.updateSubject = function (id, o) { var s = this._s; var sub = s.subjects.filter(function (x) { return x.id === id; })[0]; if (!sub) return null; if (o.label !== undefined) sub.label = o.label; if (o.names) sub.names = o.names.slice(); s.log.push(['su', id, CX.clone(o)]); return sub; };
  CP.removeSubject = function (id) { var s = this._s; var n = s.subjects.length; s.subjects = s.subjects.filter(function (x) { return x.id !== id; }); s.log.push(['sr', id]); return s.subjects.length < n; };
  Object.defineProperty(CP, 'subjects', { get: function () { return this._s.subjects.slice(); } });

  // ------------------------------------------------------------ save / load
  CP.save = function () { return JSON.stringify({ v: 1, seed: this.seed, attempt: this.attempt, opts: this.opts || {}, log: this._s.log }); };
  CX.load = function (json) {
    var o = typeof json === 'string' ? JSON.parse(json) : json;
    var cs = CX.caseFromAttempt(o.seed, o.opts || {}, o.attempt || 0);
    (o.log || []).forEach(function (a) {
      switch (a[0]) {
        case 'q': cs.query(a[1], a[2]); break;
        case 'e': cs.endDay(); break;
        case 'f': cs.file(a[1]); break;
        case 'u': cs.unfile(a[1]); break;
        case 'w': cs.warrant(a[1]); break;
        case 'r': cs.respond(a[1]); break;
        case 'sa': cs.addSubject(a[1]); break;
        case 'su': cs.updateSubject(a[1], a[2]); break;
        case 'sr': cs.removeSubject(a[1]); break;
      }
    });
    return cs;
  };
  /** build the case for a given generation attempt (no verification) */
  CX.caseFromAttempt = function (seed, opts, attempt) {
    var gs = attempt ? seed + '#' + attempt : String(seed);
    var W = CX.buildWorld(gs, opts || {});
    CX.makeTraces(W);
    return new Case(W, gs, attempt);
  };
})();
