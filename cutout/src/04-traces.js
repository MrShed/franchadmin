/* CUTOUT engine — 04-traces.js
 * Turns every timeline step into records ("entries") in the record systems,
 * plus pushed traffic (tip, intercepts, police reports, newspapers, informant
 * notes, press-office and porter reports) and background noise.
 *
 * Entry fields: public fields are shown to the player; fields starting with
 * '_' are private (truth bookkeeping) and are stripped before a record is
 * handed out:
 *   _id, _sys, _step (step id), _pids (persons involved), _day (visible when
 *   _day < today), _push (traffic: arrives the morning of that day), _keys.
 *
 * Traffic entries carry pre-rendered `body` lines (arrays of text segments and
 * tokens {t, v, d}) plus structured fields the analyst (and the solver) read.
 */
var CX = (typeof CX !== 'undefined' && CX) ? CX : {};

(function () {
  'use strict';
  var DATA = CX.DATA;

  /** token: t type, v canonical value (query key), d display text */
  CX.tok = function (t, v, d) { var o = { t: t, v: String(v) }; if (d !== undefined && d !== null && String(d) !== String(v)) o.d = String(d); return o; };
  var tk = CX.tok;

  CX.makeTraces = function (W) {
    var R = CX.rng('traces:' + W.seed);
    var cal = W.cal, D = W.D;
    var E = [];
    var nE = 0;
    function add(sys, e) { e._id = 'n' + (++nE); e._sys = sys; if (e._day === undefined) e._day = -9999; E.push(e); return e; }
    function cityName(c) { return DATA.CITIES[c].name; }
    function ccOf(c) { return DATA.CITIES[c].cc; }
    function identOf(pid, name) {
      var p = W.P[pid]; if (!p) return null;
      for (var i = 0; i < p.idents.length; i++) if (p.idents[i].name === name) return p.idents[i];
      return p.idents[0];
    }
    function natAdj(n) { return DATA.NAT[n] ? DATA.NAT[n].adj : n; }
    function dateTok(day, fmt) { return tk('date', day, fmt ? fmt(day) : cal.dmy(day)); }
    function L() { return Array.prototype.slice.call(arguments); }
    function G(pid) { var p = W.P[pid]; var f = p && p.sex === 'f'; return { man: f ? 'woman' : 'man', he: f ? 'she' : 'he', He: f ? 'She' : 'He', him: f ? 'her' : 'him', his: f ? 'her' : 'his', self: f ? 'herself' : 'himself' }; }
    function isNet(step) { return step.parts.some(function (x) { return W.P[x.pid] && W.P[x.pid].net; }); }
    function pidsOf(step) { return step.parts.map(function (x) { return x.pid; }); }

    var traffic = [];
    function push(day, e) { e._push = Math.max(0, day); e._sys = 'traffic'; e._id = 'n' + (++nE); traffic.push(e); E.push(e); return e; }

    // ------------------------------------------------------ static records
    // residents registry: every case person has a registration
    W.persons.forEach(function (p) {
      var sinceY = 1989 - R.int(1, 14);
      add('residents', { r: 'res', name: p.real, dob: p.dob, nat: natAdj(p.nat), address: p.address, city: cityName(p.homeCity), since: CX.pad(R.int(1, 28)) + '.' + CX.pad(R.int(1, 12)) + '.' + sinceY, prev: p.prevAddress, occupation: p.occupation, employer: p.employer, _pids: [p.id] });
      if (p.prevAddress && R.chance(0.5)) {
        // the previous address has a new tenant (dead-end realism)
      }
    });
    // phones
    Object.keys(W.phones).forEach(function (n) {
      var ph = W.phones[n];
      add('phones', { r: 'line', number: n, kind: ph.kind, subscriber: ph.subscriber, hotel: ph.hotel || null, address: ph.address, city: cityName(ph.city), _pids: ph.pid ? [ph.pid] : [], _hub: !!ph.hub });
    });
    // accounts
    Object.keys(W.accounts).forEach(function (a) {
      var ac = W.accounts[a];
      add('bank', { r: 'acct', account: a, bank: ac.bank, city: cityName(ac.city), holder: ac.holder, holderKind: ac.holderKind, address: ac.address, signatory: ac.signatory || null, company: ac.company || null, _pids: ac.pid ? [ac.pid] : [], _hub: !!ac.hub });
    });
    // companies
    Object.keys(W.companies).forEach(function (k) {
      var c = W.companies[k];
      add('companies', { r: 'co', company: c.name, regNo: c.regNo, city: cityName(c.city), address: c.address, founded: c.founded, directors: c.directors.slice(), accounts: c.accounts.slice(), notes: c.notes, _pids: c.pids || [] });
    });
    // vehicles
    Object.keys(W.vehicles).forEach(function (pl) {
      var v = W.vehicles[pl];
      add('vehicles', { r: 'veh', plate: pl, make: v.make, colour: v.colour, owner: v.owner, ownerKind: v.ownerKind, ownerAddr: v.ownerAddr, _pids: v.pid ? [v.pid] : [] });
    });
    // archive cards
    W.persons.forEach(function (p) {
      if (!p.card) return;
      add('archive', { r: 'card', name: p.real, fileNo: R.pick(['P', 'K', 'AE', 'V']) + '-' + R.num(4) + '/' + R.int(70, 88), dob: p.dob, nat: natAdj(p.nat), summary: p.card.summary, aliases: p.card.aliases.slice(), associates: p.card.associates.slice(), photo: p.card.photo, opened: 1970 + R.int(0, 18), _pids: [p.id] });
    });

    // ------------------------------------------------------ noise statics
    var noiseLines = {};
    W.cities.forEach(function (c) {
      noiseLines[c] = DATA.FLAVOUR.callNoise.map(function (nz) {
        var num; do { num = CX.pat(DATA.CITIES[c].phone, R); } while (W.phones[num] || W.used.number[num]);
        W.used.number[num] = 1;
        var sub = nz[0] === 'Radio-Taxi' ? { VIE: 'Radio-Taxi 31300', WBE: 'Funk-Taxi Berlin', EBE: 'VEB Taxi Berlin', BUD: 'Főtaxi', PRG: 'Taxi Praha', MUC: 'Taxi-Zentrale München', ZRH: 'Taxi 444', GVA: 'Taxiphone', ROM: 'Radio Taxi 3570', PAR: 'Taxis G7', MRS: 'Taxi Radio Marseille', LIS: 'Rádio Táxis', IST: 'Taksi Durağı Taksim' }[c] : nz[0];
        W.phones[num] = { number: num, kind: 'business', subscriber: sub, address: DATA.CITIES[c].landmarks[0] + ' area, ' + DATA.CITIES[c].name, city: c, hub: true };
        add('phones', { r: 'line', number: num, kind: 'business', subscriber: sub, address: W.phones[num].address, city: DATA.CITIES[c].name, _pids: [], _hub: true });
        return num;
      });
    });
    var LOC = {
      de: { rent: 'Miete', office: 'Büromiete', tel: 'Fernmeldegebühren', power: 'Strom/Gas Abschlag', m: ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'] },
      fr: { rent: 'Loyer', office: 'Loyer bureaux', tel: 'Télécom, facture', power: 'EDF-GDF, mensualité', m: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'] },
      it: { rent: 'Affitto', office: 'Affitto ufficio', tel: 'Bolletta SIP', power: 'Luce e gas', m: ['gen.', 'feb.', 'mar.', 'apr.', 'mag.', 'giu.', 'lug.', 'ago.', 'set.', 'ott.', 'nov.', 'dic.'] },
      pt: { rent: 'Renda', office: 'Renda escritório', tel: 'Telefone', power: 'Electricidade', m: ['Jan.', 'Fev.', 'Mar.', 'Abr.', 'Maio', 'Jun.', 'Jul.', 'Ago.', 'Set.', 'Out.', 'Nov.', 'Dez.'] },
      tr: { rent: 'Kira', office: 'Büro kirası', tel: 'Telefon faturası', power: 'Elektrik', m: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'] },
      hu: { rent: 'Lakbér', office: 'Irodabérlet', tel: 'Telefondíj', power: 'Villany/gáz', m: ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'] },
      cs: { rent: 'Nájemné', office: 'Nájem kanceláře', tel: 'Telefon', power: 'Elektřina/plyn', m: ['leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec'] }
    };
    function loc(cid, k) { var l = LOC[DATA.COUNTRY[ccOf(cid)].lang] || LOC.de; return l[k]; }
    function locMonth(cid, m) { var l = LOC[DATA.COUNTRY[ccOf(cid)].lang] || LOC.de; return l.m[m - 1]; }
    var utilAcc = {};
    W.cities.forEach(function (c) {
      utilAcc[c] = ['utility', 'landlord', 'telecom'].map(function (kind, i) {
        var C = DATA.CITIES[c]; var b = C.banks[i % C.banks.length];
        var no; do { no = b.c + ' ' + CX.pat(b.f, R); } while (W.accounts[no]);
        var landlord = { de: 'Hausverwaltung ', fr: 'Régie immobilière ', it: 'Amministrazione stabili ', pt: 'Administração de prédios ', tr: 'Emlak ', hu: 'Ingatlankezelő ', cs: 'Bytový podnik ' }[C.cc === 'DD' ? 'dd' : DATA.COUNTRY[C.cc].lang];
        if (C.cc === 'DD') landlord = 'KWV Berlin-';
        var holder = kind === 'utility' ? { VIE: 'Wiener Stadtwerke', WBE: 'BEWAG / GASAG', EBE: 'VEB Energiekombinat Berlin', BUD: 'ELMŰ', PRG: 'Pražská energetika', MUC: 'Stadtwerke München', ZRH: 'EWZ Elektrizitätswerk', GVA: 'Services Industriels de Genève', ROM: 'ACEA', PAR: 'EDF-GDF Paris', MRS: 'EDF-GDF Marseille', LIS: 'EDP', IST: 'İETT / TEK' }[c] : kind === 'telecom' ? { AT: 'Post- und Telegraphenverwaltung', DE: 'Deutsche Bundespost', WB: 'Deutsche Bundespost', DD: 'Deutsche Post', HU: 'Magyar Posta', CS: 'Správa radiokomunikací', CH: 'PTT', IT: 'SIP', FR: 'France Télécom', PT: 'CTT/TLP', TR: 'PTT' }[C.cc] : landlord + (C.cc === 'DD' ? R.pick(['Mitte', 'Prenzlauer Berg', 'Friedrichshain']) : C.cc === 'CS' ? R.pick(['Praha 1', 'Praha 2', 'Praha 3']) : C.cc === 'HU' ? R.pick(['VI. kerület', 'VII. kerület', 'IX. kerület']) : R.pick(DATA.NAT[DATA.COUNTRY[C.cc].nat].sur));
        W.accounts[no] = { account: no, bank: b.n, city: c, holder: holder, holderKind: 'utility', address: C.name, hub: true };
        add('bank', { r: 'acct', account: no, bank: b.n, city: C.name, holder: holder, holderKind: 'utility', address: C.name, signatory: null, company: null, _pids: [], _hub: true });
        return no;
      });
    });
    function homeCityOfPhone(n) { var ph = W.phones[n]; return ph && ph.city && noiseLines[ph.city] ? ph.city : W.cities[0]; }
    // noise calls from each personal/office line
    Object.keys(W.phones).forEach(function (n) {
      var ph = W.phones[n];
      if (ph.hub || !(ph.kind === 'flat' || ph.kind === 'office')) return;
      var k = R.int(2, 5);
      var nl = noiseLines[homeCityOfPhone(n)];
      for (var i = 0; i < k; i++) {
        var other = R.pick(nl);
        var out = R.chance(0.75);
        add('phones', { r: 'call', from: out ? n : other, to: out ? other : n, day: R.int(-12, D + 1), time: R.int(7 * 60, 22 * 60), dur: R.int(15, 240), _day: 0, _pids: ph.pid ? [ph.pid] : [], _noise: true });
      }
    });
    E.forEach(function (e) { if (e.r === 'call' && e._noise) e._day = e.day; });
    // noise transactions on personal and company accounts
    Object.keys(W.accounts).forEach(function (a) {
      var ac = W.accounts[a];
      if (ac.hub || !(ac.holderKind === 'personal' || ac.holderKind === 'company')) return;
      var uc = utilAcc[ac.city] || utilAcc[W.cities[0]];
      var cur = DATA.COUNTRY[ccOf(ac.city)].cur;
      var fx = { 'öS': 7, 'DM': 1, 'M': 1, 'Ft': 40, 'Kčs': 10, 'sFr.': 0.85, 'Lit.': 730, 'FF': 3.4, 'Esc.': 85, 'TL': 1100 }[cur] || 1;
      var firsts = [];
      for (var d = -20; d <= D + 2; d++) { if (cal.get(d).d === 1) firsts.push(d); }
      firsts.forEach(function (d) {
        add('bank', { r: 'tx', from: a, to: uc[1], day: d, amount: Math.round((ac.holderKind === 'company' ? 1800 : 700) * fx * (0.8 + R.next() * 0.6) / 10) * 10, cur: cur, ref: loc(ac.city, ac.holderKind === 'company' ? 'office' : 'rent') + ' ' + locMonth(ac.city, cal.get(d).m), _day: d, _pids: ac.pid ? [ac.pid] : [] });
      });
      var nn = R.int(1, 3);
      for (var i = 0; i < nn; i++) {
        var dd = R.int(-15, D);
        var tel = R.chance(0.5);
        add('bank', { r: 'tx', from: a, to: tel ? uc[2] : uc[0], day: dd, amount: Math.round((tel ? 90 : 140) * fx * (0.7 + R.next()) / 10) * 10, cur: cur, ref: loc(ac.city, tel ? 'tel' : 'power'), _day: dd, _pids: ac.pid ? [ac.pid] : [] });
      }
    });

    // ------------------------------------------------------ steps -> entries
    var stayEntry = {};
    W.steps.forEach(function (s) {
      var net = isNet(s);
      var pids = pidsOf(s);
      var base = function (o) { o._step = s.id; o._pids = o._pids || pids; o._net = net; return o; };
      switch (s.kind) {
        case 'travel': {
          if (s.local) break;
          var rt = s.route;
          var names = s.parts.map(function (x) { return x.name; });
          s.parts.forEach(function (x, i) {
            var id = identOf(x.pid, x.name);
            if (!rt.domestic) {
              var role = rt.mode === 'car' ? (i === 0 ? 'driver' : 'passenger') : rt.mode === 'train' ? 'rail passenger' : 'air passenger';
              var veh = s.plate && W.vehicles[s.plate] ? W.vehicles[s.plate].colour + ' ' + W.vehicles[s.plate].make : null;
              add('border', base({ r: 'cross', point: rt.point, mode: rt.mode, entering: DATA.COUNTRY[rt.entering].name, day: s.day, time: rt.mode === 'air' ? rt.arr : s.time, name: x.name, nat: natAdj(id.nat), passport: id.passport, dob: id.dob, plate: s.plate || null, vehicle: veh, role: role, train: rt.train || null, flight: rt.flight || null, companions: names.filter(function (n) { return n !== x.name; }), customs: s.customs && i === 0 ? CX.money(s.customs.amount, ' ') + ' ' + s.customs.cur + ' in cash, declared' : null, _day: s.day, _pids: [x.pid] }));
            }
            if (rt.mode === 'air') {
              var pb = s.paidBy;
              add('airline', base({ r: 'pax', flight: rt.flight, airline: rt.airline, day: s.day, from: DATA.CITIES[rt.from].airport.c, to: DATA.CITIES[rt.to].airport.c, fromCity: cityName(rt.from), toCity: cityName(rt.to), dep: rt.dep, name: x.name, seat: R.int(3, 28) + R.pick(['A', 'B', 'C', 'D', 'E', 'F']), agent: R.pick(DATA.TRAVEL_AGENTS), paidBy: pb ? (W.accounts[pb] ? 'account ' + pb : pb === 'cash' ? 'cash' : 'invoice ' + pb) : 'cash', paidAcc: pb && W.accounts[pb] ? pb : null, paidCo: pb && W.companies[pb] ? pb : null, booked: s.bookedDay, _day: Math.min(s.bookedDay, s.day - 1), _pids: [x.pid] }));
            }
          });
          break;
        }
        case 'booking': {
          var r2 = s.route; var x2 = s.parts[0];
          add('airline', base({ r: 'pax', flight: r2.flight, airline: r2.airline, day: s.flightDay, from: DATA.CITIES[r2.from].airport.c, to: DATA.CITIES[r2.to].airport.c, fromCity: cityName(r2.from), toCity: cityName(r2.to), dep: r2.dep, name: x2.name, seat: R.int(3, 28) + R.pick(['A', 'C', 'D', 'F']), agent: R.pick(DATA.TRAVEL_AGENTS), paidBy: W.accounts[s.paidBy] ? 'account ' + s.paidBy : s.paidBy === 'cash' ? 'cash' : 'invoice ' + s.paidBy, paidAcc: W.accounts[s.paidBy] ? s.paidBy : null, paidCo: W.companies[s.paidBy] ? s.paidBy : null, booked: s.day, _day: s.day }));
          break;
        }
        case 'stay': {
          var x3 = s.parts[0]; var id3 = identOf(x3.pid, x3.name);
          var h = W.hotels[s.hotel];
          var e3 = add('hotels', base({ r: 'stay', hotel: s.hotel, city: cityName(h.city), name: x3.name, nat: natAdj(id3.nat), passport: id3.passport, dob: id3.dob, home: id3.home, arr: s.from, arrTime: s.time % 1440, dep: s.to, room: s.room, viewOf: s.viewOf || null, note: s.viewOf ? null : (s.note || (R.chance(0.35) ? R.pick(DATA.FLAVOUR.hotelNotes) : null)), paid: s.paidBy ? (W.accounts[s.paidBy] ? 'transfer from account ' + s.paidBy : s.paidBy) : R.pick(['cash', 'cash', 'traveller\'s cheques', 'Eurocheque', 'Diners Club']), paidAcc: s.paidBy && W.accounts[s.paidBy] ? s.paidBy : null, paidCo: s.paidBy && W.companies[s.paidBy] ? s.paidBy : null, _day: s.from }));
          stayEntry[s.id] = e3;
          break;
        }
        case 'resv': {
          var x4 = s.parts[0];
          add('hotels', base({ r: 'resv', hotel: s.hotel, city: cityName(W.hotels[s.hotel].city), name: x4.name, from: s.from, to: s.to, made: s.day, byNum: s.inPerson ? null : s.byNum, inPerson: s.inPerson, viewOf: s.viewOf || null, note: s.note, _day: s.day, _pids: [x4.pid] }));
          break;
        }
        case 'call': {
          add('phones', base({ r: 'call', from: s.fromNum, to: s.toNum, day: s.day, time: s.time, dur: s.dur, _day: s.day, _stay: s.fromStay, _toStay: s.toStay }));
          if (s.intercept) {
            var ic = s.intercept;
            var subA = W.phones[s.fromNum] ? W.phones[s.fromNum].subscriber : 'unknown';
            push(s.day + (ic.lag || 1), base({ r: 'intercept', sexA: s.parts[0] && W.P[s.parts[0].pid] ? W.P[s.parts[0].pid].sex : 'm', service: ic.service, day: s.day, time: s.time, from: s.fromNum, to: s.toNum, dur: s.dur, lines: ic.lines.map(function (l) { return { spk: l.spk, text: l.text, clue: l.clue || null }; }), subA: subA }));
          }
          break;
        }
        case 'pay': {
          add('bank', base({ r: 'tx', from: s.fromAcc, to: s.toAcc, day: s.day, amount: s.amount, cur: s.cur || '', ref: s.ref, plate: s.purpose === 'deposit' ? (s.ref.match(/Kaution (.*?) \//) || [])[1] || null : null, _day: s.day }));
          break;
        }
        case 'hire': {
          var x5 = s.parts[0]; var id5 = identOf(x5.pid, x5.name);
          add('vehicles', base({ r: 'rental', plate: s.plate, agency: s.agency, branch: cityName(s.city), clerk: s.clerk, renter: x5.name, nat: natAdj(id5.nat), passport: id5.passport, dob: id5.dob, home: id5.home, licence: s.licence, from: s.from, to: s.to, deposit: s.deposit, depositCur: s.depositCur, depositFrom: s.depositFrom, _day: s.day, _pids: [x5.pid, s.clerkPid] }));
          break;
        }
        case 'acquire': traceAcquire(s, base); break;
        case 'parking': {
          var pv = W.venues[s.venue]; var veh = W.vehicles[s.plate];
          push(s.day + 1, base({ r: 'police', kind: 'parking', city: cityName(pv.city), day: s.day, plate: s.plate, venue: s.venue, body: [
            L({ t: 'txt', v: DATA.COUNTRY[ccOf(pv.city)].police }, ' ', cityName(pv.city), ' — daily summary (extract)'),
            L('Traffic warden: ', veh ? veh.colour + ' ' + veh.make + ', ' : '', tk('plate', s.plate), ' ticketed at ', CX.hm(s.time), ' on ', dateTok(s.day), ' in the no-waiting zone beside the ', { t: 'place', v: s.venue, d: pv.name }, R.pick(['. Driver returned, paid on the spot, asked about parking "on the day of the conference".', '. Second time this week, says the warden, who remembers the dent in the rear door.', '. Driver said he was only looking at the building.'])),
            L(R.pick(['Also: a bicycle stolen from the university; a drunk in a fountain.', 'No other incidents of note.', 'Also: two pickpockets detained at the station.']))
          ] }));
          break;
        }
        case 'recon': traceRecon(s, base); break;
        case 'seizure': {
          var g = s.goods; var hx = s.parts[0];
          push(s.day + 1, base({ r: 'police', kind: 'seizure', city: cityName(s.city), day: s.day, name: hx.name, plate: s.plate, goods: g.d, body: [
            L('CUSTOMS / ', { t: 'txt', v: DATA.COUNTRY[ccOf(s.city)].police }, ' — report of seizure'),
            L('On ', dateTok(s.day), ' officers stopped ', s.plate ? tk('plate', s.plate) : 'a vehicle', ' and found ', g.d, '.'),
            L('Driver: ', tk('name', hx.name), '. Released pending proceedings; goods confiscated.'),
            L(R.pick(['He described the goods as "a present for my aunt".', 'He asked whether he could keep the cigarette he was smoking.', 'He was not surprised to see us.']))
          ] }));
          break;
        }
        case 'meet': {
          if (net && R.chance(0.18) && s.day >= -3) {
            var who = s.parts[R.int(0, s.parts.length - 1)];
            var other = s.parts.filter(function (q) { return q !== who; })[0];
            push(s.day + R.int(1, 2), base({ r: 'informant', kind: 'meet', day: s.day, source: R.pick(DATA.FLAVOUR.informants), name: who.name, body: [
              L('Informant note — source ', { t: 'txt', v: R.pick(DATA.FLAVOUR.informants) }, ' (reliability: ', R.pick(['B', 'C', 'C']), ')'),
              L('Source saw a ', G(who.pid).man, ' known to him as ', tk('name', who.name), ' at ', { t: 'place', v: s.place }, ' on ', dateTok(s.day), ', around ', CX.hm(s.time), '.'),
              L('He was with ', other ? 'a ' + R.pick(['heavy-set', 'thin', 'well-dressed', 'nervous']) + ' man source did not know' : 'nobody', '. They ', R.pick(['talked for twenty minutes and left separately.', 'did not order anything.', 'looked at a street map.', 'argued about money, source thinks.']))
            ] }));
          }
          break;
        }
      }
    });
    // bank movements show the counterparty's name and kind (as a statement does)
    E.forEach(function (e) {
      if (e.r !== 'tx') return;
      var a = W.accounts[e.from], b = W.accounts[e.to];
      e.fromHolder = a ? a.holder : null; e.fromKind = a ? a.holderKind : null;
      e.toHolder = b ? b.holder : null; e.toKind = b ? b.holderKind : null;
    });
    // room calls hang off their stay
    E.forEach(function (e) { if (e.r === 'call' && e._stay && stayEntry[e._stay]) { (stayEntry[e._stay]._calls = stayEntry[e._stay]._calls || []).push(e._id); } });

    function traceAcquire(s, base) {
      var I = DATA.ITEMS[s.item];
      var buyer = s.parts[0];
      if (s.mode === 'supplier') {
        var sup = s.parts[1];
        if (s.informant) {
          var src = R.pick(DATA.FLAVOUR.informants);
          var cityN = cityName(s.city);
          push(s.day + R.int(1, 3), base({ r: 'informant', kind: 'supply', day: s.day, source: src, supplier: sup.name, item: s.item, itemCat: I.cat, method: I.method, buyer: s.namesBuyer ? buyer.name : null, body: [
            L('Informant note — source ', { t: 'txt', v: src }, ' (reliability: ', R.pick(['B', 'B', 'C']), ')'),
            L('Source reports that ', tk('name', sup.name), ' of ', cityN, ' has recently supplied ', I.street, ' (', s.itemName, ')',
              s.namesBuyer ? [' to a ', G(buyer.pid).man, ' calling ', G(buyer.pid).self, ' ', tk('name', buyer.name)] : ' to "a foreigner who paid without haggling"', '.'),
            L(R.pick(({ weapon: ['Source believes the buyer was no hunter: "held it like a tool, not like a gun."', 'Source says the price was well above the usual, and paid in Deutschmarks.'], optics: ['The buyer wanted the mounting fitted there and then.', 'Source says the buyer asked about the range at which the reticle is zeroed.'], explosive: ['Source says the buyer asked how long the material keeps "in a warm room".', 'Delivery was made in a car park, in two suitcases.'], chemical: ['Source says the buyer wore gloves throughout, "which is not usual in October".', 'The buyer asked how much would be enough "for a large dog".'], device: ['Source says the buyer asked for "something that fits in a pocket".', 'The buyer wanted it tested in front of him.'], tools: ['Source says the buyer knew exactly which blanks he wanted.', 'The buyer paid cash and took no receipt.'], 'vehicle-work': ['The buyer wanted the work finished in three days.'] }[I.cat] || ['Source does not know where the item went.']).concat(['Delivery was made in a car park, not at the shop.', 'Source does not know where the item went.'])))
          ] }));
        }
      } else if (s.mode === 'theft') {
        var cn = cityName(s.city);
        push(s.day + 1, base({ r: 'police', kind: 'theft', city: cn, day: s.day, item: s.item, itemCat: I.cat, method: I.method, plate: s.plate || null, name: s.witnessName || null, body: [
          L({ t: 'txt', v: DATA.COUNTRY[ccOf(s.city)].police }, ' ', cn, ' — incident report'),
          L('Theft from ', s.from, ' near ', cn, ', night of ', dateTok(s.day), '. Missing: ', s.itemName, '.'),
          s.plate ? L('A night watchman noted a ', W.vehicles[s.plate] ? W.vehicles[s.plate].colour + ' ' + W.vehicles[s.plate].make : 'vehicle', ', registration ', tk('plate', s.plate), ', parked by the gate at about ', CX.hm(s.time), '.')
            : L('A ', G(buyer.pid).man, ' who gave ', G(buyer.pid).his, ' name as ', tk('name', s.witnessName), ' had asked about the premises the week before, "for a school project".'),
          L(R.pick(['The padlock was cut, not forced.', 'Whoever it was knew where the key cabinet was.', 'Nothing else was taken, which the manager found insulting.', 'The dog did not bark. The dog is fourteen.']))
        ] }));
      }
      // purchases leave only the bank trace (see pay step)
    }

    function traceRecon(s, base) {
      var v = W.venues[s.venue];
      var who = s.parts[0];
      if (s.rk === 'photographs') {
        push(s.day + 1, base({ r: 'police', kind: 'photo', city: cityName(v.city), day: s.day, venue: s.venue, plate: s.plate || null, name: s.showedName || null, passport: s.showedPassport || null, body: [
          L({ t: 'txt', v: DATA.COUNTRY[ccOf(v.city)].police }, ' — security note, ', { t: 'place', v: s.venue, d: v.name }),
          L('On ', dateTok(s.day), ' at ', CX.hm(s.time), ' a ', G(who.pid).man, ' was seen photographing ', R.pick(['the side entrance of the ' + v.name, 'the underground car-park ramp of the ' + v.name, 'the delivery yard of the ' + v.name, 'the VIP entrance of the ' + v.name + ' and the balcony above it', 'the roof line of the ' + v.name + ' and the windows opposite']), '.'),
          s.plate ? L('Left in a ', W.vehicles[s.plate] ? W.vehicles[s.plate].colour + ' ' + W.vehicles[s.plate].make : 'car', ', registration ', tk('plate', s.plate), ', before the guard could ask questions.')
            : L('When asked, produced a passport in the name ', tk('name', s.showedName), ' (', tk('passport', s.showedPassport), ') and said the building was "in all the guidebooks".'),
          L(R.pick(['No further action taken.', 'The guard notes the film was colour, "which is expensive for a tourist".', 'Forwarded for information only.']))
        ] }));
      } else if (s.rk === 'buys-schedule') {
        push(s.day + R.int(1, 2), base({ r: 'press', day: s.day, subject: s.subject, venue: s.venue, name: s.asName, number: s.byNum, paper: s.asPaper, body: [
          L('Press office note, forwarded by ', { t: 'txt', v: DATA.COUNTRY[ccOf(v.city)].service }),
          L('On ', dateTok(s.day), ' a caller introducing ', G(who.pid).self, ' as ', tk('name', s.asName), ' of "', s.asPaper, '" asked for accreditation and the full programme ', W.target.kind === 'object' ? ['of the presentation of ', tk('target', s.subject), ', including delivery and collection times.'] : ['of the visit of ', tk('target', s.subject), ', including arrival times.']),
          L(G(who.pid).He, ' left a call-back number: ', tk('number', s.byNum), '. The publication is not on our lists.'),
          L(R.pick(['The programme was sent, as it is to anyone who asks.', G(who.pid).He + ' was told ' + (W.target.kind === 'object' ? 'delivery' : 'arrival') + ' times are not published, and asked twice more.', G(who.pid).He + ' spelled the name without being asked.']))
        ] }));
      } else if (s.rk === 'asks-porter' && W.target.kind === 'object') {
        push(s.day + 1, base({ r: 'porter', day: s.day, subject: s.subject, hotel: null, room: null, name: s.asName, body: [
          L({ t: 'txt', v: DATA.COUNTRY[ccOf(v.city)].police }, ' — note from the night porter, ', { t: 'place', v: s.venue, d: v.name }),
          L('On ', dateTok(s.day), ' a visitor who signed the book as ', tk('name', s.asName), ' asked when ', tk('target', s.subject), ' would be delivered, where it would be kept overnight and how many guards there would be.'),
          L(R.pick(['The porter told ' + G(who.pid).him + ' to ask the exhibitor. ' + G(who.pid).He + ' did not.', 'The porter thought the questions "very thorough for a trade visitor".', 'The visitor left a box of chocolates. The porter has eaten them and now feels bad.']))
        ] }));
      } else if (s.rk === 'asks-porter') {
        var hotel = W.hotels[s.hotel];
        push(s.day + 1, base({ r: 'porter', day: s.day, subject: s.subject, hotel: s.hotel, room: s.room, name: s.asName, body: [
          L({ t: 'txt', v: DATA.COUNTRY[ccOf(hotel.city)].police }, ' — report from a hotel contact'),
          L('The head porter of ', tk('hotel', s.hotel, hotel.name), ' reports that a guest', s.room ? ' (room ' + s.room + ')' : '', ' registered as ', tk('name', s.asName), ' asked on ', dateTok(s.day), ' at what time ', tk('target', s.subject), ' was expected and by which entrance.'),
          L(R.pick(['The porter gave him the answer he gives everybody: he does not know.', 'The guest tipped him fifty and asked again the next morning.', 'The porter thought him "too polite to be a journalist".']))
        ] }));
      }
      // view-room leaves its trace in the hotel register note
    }

    // ------------------------------------------------------ newspapers
    var evs = W.events.slice().sort(function (a, b) { return a.day - b.day; });
    var halves = [evs.filter(function (e, i) { return i % 2 === 0; }), evs.filter(function (e, i) { return i % 2 === 1; })];
    var papers = [];
    var westPapers = ['International Herald Tribune', 'Neue Zürcher Zeitung', 'Die Presse', 'Süddeutsche Zeitung', 'Le Monde', 'Corriere della Sera'];
    var usedPapers = {};
    halves.forEach(function (list, i) {
      if (!list.length) return;
      var c = list[0].city;
      var paper = DATA.COUNTRY[ccOf(c)].east ? R.pick(westPapers) : R.pick(DATA.CITIES[c].papers);
      if (usedPapers[paper]) paper = R.pick(westPapers.filter(function (p) { return !usedPapers[p]; }));
      usedPapers[paper] = 1;
      var body = [L(paper, ' — ', cal.long(i), ' — ', R.pick(['"Diplomatic and official calendar"', '"Visitors this month"', '"The week ahead: official engagements"']))];
      var items = [];
      list.forEach(function (ev) {
        var s = ev.subject; var v = W.venues[ev.venue];
        var intro = s.kind === 'object' ? tk('target', s.name) : [tk('target', s.name), ', ', s.title, ','];
        body.push(L('• ', dateTok(ev.day, cal.nice), ', ', CX.hm(ev.time), ', ', cityName(ev.city), ': ', intro, ' ', ev.what.replace(v.name, ''), tk('place', ev.venue, v.name), '.'));
        if (s.kind === 'object') body.push(L('  ', R.pick(['The device, ', 'The exhibit, ']), s.title, ', ', R.pick(['will be shown under guard.', 'returns to the factory the same evening.', 'is insured, we are told, for an undisclosed sum.'])));
        else {
          var fem = s.sex === 'f';
          var trait = fem ? s.trait.text.replace(/\bhis\b/g, 'her').replace(/\bhim\b/g, 'her') : s.trait.text;
          var close = R.pick(['is expected to speak briefly.', 'will be accompanied by a delegation of twelve.', 'travels with a small staff.', 'declined to be interviewed.', 'is making a first visit since 1985.', 'is said to dislike long dinners.']);
          body.push(L('  ', s.plain ? s.plain.split(' ').slice(-1)[0] : 'The guest', ', who', R.pick([' ', ', colleagues say, ', ', we are told, ']), trait, ', ', close));
        }
        items.push({ event: ev.id, subject: s.name, kind: s.kind, title: s.title, trait: s.trait.text, traitCat: s.trait.cat, objectCode: s.kind === 'object' ? s.trait.code : null, venue: ev.venue, city: cityName(ev.city), day: ev.day, time: ev.time, what: ev.what });
      });
      if (R.chance(0.6)) body.push(L('• ', R.pick(['The Vienna Boys\' Choir leaves for its Japan tour on Sunday.', 'The postponed chess match will now be played in the spring.', 'Road works on the ring road continue into November.', 'The zoo reports the birth of a Bactrian camel.', 'The Philharmonic has cancelled its Thursday concert; the conductor has a cold.'])));
      papers.push(push(i, { r: 'news', paper: paper, items: items, body: body, _pids: [] }));
    });
    // object targets: the trade press gives the code-able feature
    W.events.forEach(function (ev) {
      if (ev.subject.kind !== 'object') return;
      var feat = { optics: 'sees in the dark', navigation: 'always knows where north is', cipher: 'types messages nobody else can read', radio: 'talks across a hundred kilometres without being overheard', chip: 'is made of glass plates finer than a cathedral window' }[ev.subject.trait.cat];
      var last = papers[papers.length - 1];
      last.body.push(L('  Trade note: ', tk('target', ev.subject.name), ' — "a device that ', feat, '", in the words of the manufacturer\'s brochure.'));
      last.items.forEach(function (it) { if (it.event === ev.id) it.feature = feat; });
    });

    // ------------------------------------------------------ the tip
    var A = W.aliases; var net = W.net;
    var tipBody = [], tipSeeds = [];
    var frame = { assassination: 'an attack on a Western official', bombing: 'an attack on a public building or those inside it', theft: 'an operation to obtain Western technology', exfiltration: 'an operation to remove a person to the East' }[W.T.family];
    var vague = R.pick(['a "serious job" in Central Europe before the end of the month', 'an operation somewhere in Western Europe this autumn', frame + ', no place or date given', 'something planned "for the season of conferences"']);
    var svc = R.pick(['BfV Cologne', 'BND Pullach', 'DST Paris', 'SISDE Rome', 'Swiss BuPo', 'SIS liaison, Vienna station']);
    var kind = W.tipKind;
    var c1Stay = W.steps.filter(function (s) { return s.kind === 'stay' && s.parts[0].name === A.c1.name && s.day < 0; })[0];
    if (kind === 'cutout-alias' && !c1Stay) kind = 'cutout-phone';
    if (kind === 'forger' && !net.forger) kind = 'cutout-phone';
    if (kind === 'courier' && !net.courier) kind = 'cutout-phone';
    if (['cutout-alias', 'cutout-phone', 'courier', 'forger'].indexOf(kind) < 0) kind = 'cutout-phone';
    tipBody.push(L('TELEX — PRIORITY — FROM ', { t: 'txt', v: svc }, ' TO LIAISON DESK VIENNA — ', cal.telex(0)));
    if (kind === 'cutout-alias') {
      tipBody.push(L('A source close to ', R.pick(['an arms broker', 'a Lebanese trading house', 'an Eastern trade mission']), ' reports ', vague, '.'));
      tipBody.push(L('The go-between is said to travel as ', tk('name', A.c1.name), '. ', G(W.net.cutout.id).He, ' stayed at ', tk('hotel', c1Stay.hotel, W.hotels[c1Stay.hotel].name), ' in ', cityName(W.hotels[c1Stay.hotel].city), ' around ', dateTok(c1Stay.from), '.'));
      tipSeeds.push(A.c1.name, c1Stay.hotel);
    } else if (kind === 'cutout-phone') {
      tipBody.push(L('An address book taken from a man detained at ', R.pick(['Frankfurt airport', 'the Brenner', 'Schwechat', 'Orly']), ' contains, under the letter V, the number ', tk('number', W.net.cutout.phone), ' and the word "Vermittler" (go-between).'));
      tipBody.push(L('The detainee has said nothing useful except that it concerns ', vague, '.'));
      tipSeeds.push(W.net.cutout.phone);
    } else if (kind === 'courier') {
      var cx = W.steps.filter(function (s) { return s.kind === 'travel' && s.parts[0].pid === net.courier.id; })[0];
      tipBody.push(L('Customs note that ', tk('name', A.Cr.name), ' has declared large sums in cash at border crossings three times this year.'));
      tipBody.push(L('A source believes the money pays for ', vague, '. The source is ', R.pick(['usually right about money and wrong about everything else.', 'new and unproven.', 'a bank clerk with a grudge.'])));
      tipSeeds.push(A.Cr.name);
      if (!cx) tipSeeds.push(W.net.courier.phone);
    } else if (kind === 'forger') {
      tipBody.push(L('A source reports that the printer ', tk('name', net.forger.real), ' of ', cityName(net.forger.homeCity), ' has taken "a rush order" for identity papers from a foreigner.'));
      tipBody.push(L('Source links it, without evidence, to ', vague, '.'));
      tipSeeds.push(net.forger.real);
    }
    tipBody.push(L('No further details. Please advise on any trace. ENDS'));
    push(0, { r: 'tip', kind: kind, body: tipBody, seeds: tipSeeds, _pids: [] });
    W.tipSeeds = tipSeeds;

    // ------------------------------------------------------ herring traffic
    W.herringLinks.forEach(function (hl) {
      if (hl.type === 'informant') {
        var src = R.pick(DATA.FLAVOUR.informants);
        push(hl.day, { r: 'informant', kind: 'claim', day: hl.day, source: src, name: hl.herring, alias: hl.bait, body: [
          L('Informant note — source ', { t: 'txt', v: src }, ' (reliability: C — ', R.pick(['paid by the item', 'sometimes embroiders', 'recently divorced, needs money']), ')'),
          L('Source is "certain" that the man using the name ', tk('name', hl.bait), ' is in fact ', tk('name', hl.herring), ', whom he knows from the ', W.herringGoods.k, ' trade.'),
          L('Source was not able to say how he knows.')
        ], _pids: [hl.herringPid], _herring: true });
      }
    });
    var hr = W.herrings[0];
    var hrCafe = R.pick(DATA.CITIES[hr.homeCity].cafes);
    push(R.int(1, 4), { r: 'informant', kind: 'herring', day: 0, source: R.pick(DATA.FLAVOUR.informants), name: hr.real, body: [
      L('Informant note — source ', { t: 'txt', v: R.pick(DATA.FLAVOUR.informants) }, ' (reliability: B)'),
      L(tk('name', hr.real), ' is moving ', W.herringGoods.d, ' again and has "a new partner with a car". Meeting place: ', { t: 'place', v: hrCafe + ', ' + cityName(hr.homeCity), d: hrCafe }, '.'),
      L(R.pick(['Source asks to be paid in Deutschmarks this time.', 'Source adds that it is "a big one this month".', 'Source thinks there may be "political people" in it. Source always thinks that.']))
    ], _pids: [hr.id], _herring: true });

    // ------------------------------------------------------ noise traffic
    function pol(c) { return DATA.COUNTRY[ccOf(c)].police + ' ' + cityName(c); }
    var noiseT = [
      function (d) { var c = R.pick(W.cities); return { r: 'police', kind: 'theft', city: cityName(c), day: d - 1, item: 'noise', itemCat: 'noise', method: null, body: [L(pol(c), ' — incident report'), L('Theft of a hunting rifle and 40 rounds from a gamekeeper\'s lodge outside ', cityName(c), ', reported ', dateTok(d - 1), '.'), L('The gamekeeper suspects his brother-in-law. The brother-in-law has an alibi and a grievance.')] }; },
      function (d) { var c = R.pick(W.cities); return { r: 'police', kind: 'theft', city: cityName(c), day: d - 1, item: 'noise', itemCat: 'noise', method: null, body: [L(pol(c), ' — incident report'), L('Break-in at a chemist\'s shop, night of ', dateTok(d - 1), ': cough syrup, sleeping tablets and the till taken.'), L('Juveniles suspected. The till was found in the canal; the sleeping tablets were not.')] }; },
      function (d) { var c = R.pick(W.cities); return { r: 'police', kind: 'theft', city: cityName(c), day: d - 1, item: 'noise', itemCat: 'noise', method: null, body: [L(pol(c), ' — incident report'), L('Two boxes of blasting caps missing from a demolition contractor\'s store, discovered ', dateTok(d - 1), '.'), L('Stock records have not been kept since June. The foreman "thinks" they were used on the bridge job.')] }; },
      function (d) { var c = R.pick(W.cities); return { r: 'consular', day: d - 1, body: [L('Consular note — ', cityName(c)), L('A ', R.pick(['Dutch', 'Swedish', 'Belgian', 'Canadian']), ' tourist reports his passport stolen from a café table. He was reading a guidebook to ', R.pick(['Salzburg', 'Florence', 'Prague']), ' at the time.'), L('Routine; for information.')] }; },
      function (d) { var c = R.pick(W.cities); return { r: 'police', kind: 'noise', city: cityName(c), day: d - 1, body: [L(pol(c), ' — daily summary (extract)'), L('A delivery van reported stolen and found the same afternoon, two streets away, with the keys in it.'), L('No connection to current enquiries established.')] }; },
      function (d) { var c = R.pick(W.cities); return { r: 'police', kind: 'noise', city: cityName(c), day: d - 1, body: [L(pol(c), ' — daily summary (extract)'), L('Anonymous bomb threat against a department store. Nothing found. Third this month; the caller has a lisp.'), L('No connection to current enquiries established.')] }; },
      function (d) { var c = R.pick(W.cities); return { r: 'police', kind: 'noise', city: cityName(c), day: d - 1, body: [L(pol(c), ' — daily summary (extract)'), L('Two Yugoslav nationals detained for selling watches at the station; released with a warning and most of the watches.'), L('No connection to current enquiries established.')] }; },
      function (d) { return { r: 'consular', day: d - 1, body: [L('Desk memo'), L('Reminder: overtime claims for September must reach Accounts by Friday. Claims in pencil will be returned.')] }; },
      function (d) { return { r: 'consular', day: d - 1, body: [L('Desk memo'), L('The coffee machine on the third floor is again out of order. Please do not attempt repairs. This means you, Hofbauer.')] }; },
      function (d) { return { r: 'consular', day: d - 1, body: [L('Desk memo'), L('Liaison meeting with the Italians moved to Thursday. Bring the file, not the gossip.')] }; },
      function (d) { return { r: 'consular', day: d - 1, body: [L('Desk memo'), L('Headquarters asks whether the desk still needs the second telex machine. It does.')] }; },
      function (d) { var c = R.pick(W.cities); return { r: 'informant', kind: 'noise', day: d - 1, body: [L('Informant note — source ', { t: 'txt', v: R.pick(DATA.FLAVOUR.informants) }, ' (reliability: D)'), L('Source reports "a lot of Arabs" at a hotel in ', cityName(c), ' and believes "something is being prepared". Source reports this every autumn.'), L('No names, no dates. Filed.')] }; },
      function (d) { var c = R.pick(W.cities); return { r: 'consular', day: d - 1, body: [L('Consular note — ', cityName(c)), L('An East German family has asked for asylum at the West German mission; the head of mission asks for extra chairs. Not our business, but noted.')] }; },
      function (d) { var c = R.pick(W.cities); return { r: 'police', kind: 'noise', city: cityName(c), day: d - 1, body: [L(pol(c), ' — daily summary (extract)'), L('A man was found asleep in the cloakroom of the opera after the performance. He had a ticket and, he says, a long day.'), L('No connection to current enquiries established.')] }; }
    ];
    var noiseOrder = R.shuffle(noiseT.map(function (f, i) { return i; })), nIdx = 0;
    for (var day = 1; day <= D; day++) {
      var today = traffic.filter(function (t) { return t._push === day; }).length;
      var want = R.int(1, 2);
      while (today < want && nIdx < noiseOrder.length) { var nt = noiseT[noiseOrder[nIdx++]](day); nt._pids = []; push(day, nt); today++; }
    }

    W.entries = E;
    W.traffic = traffic;
    return W;
  };
})();
