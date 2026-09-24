/* CUTOUT engine — 03-world.js
 * The generator: world (cities, hotels, venues), people (network, innocents,
 * herrings), identifiers (names, passports, phones, plates, accounts,
 * companies), the operation (target, decoy events, clue plan) and the
 * timeline of dated steps the network executes.
 *
 * CX.buildWorld(seed, opts) -> W   (pure data; traces are made in 04-traces.js)
 *   opts.template: force one of CX.DATA.TEMPLATES keys
 */
var CX = (typeof CX !== 'undefined' && CX) ? CX : {};

(function () {
  'use strict';
  var DATA = CX.DATA;

  CX.buildWorld = function (seed, opts) {
    opts = opts || {};
    var R = CX.rng('cutout:' + seed);
    var W = {
      seed: String(seed), opts: opts, R: R,
      persons: [], P: {}, nameOwner: {}, oldAliases: {},
      phones: {}, accounts: {}, companies: {}, vehicles: {}, hotels: {}, venues: {},
      events: [], steps: [], herringLinks: [], clues: [], tipSeeds: [],
      innocents: [], herrings: [], network: []
    };
    var used = { name: {}, passport: {}, number: {}, plate: {}, account: {}, address: {}, company: {} };
    W.used = used;

    // ------------------------------------------------------------ basics
    W.startDom = opts.startDom || R.int(2, 20);
    W.cal = CX.Calendar(W.startDom);
    W.D = opts.D || R.int(10, 14);
    var D = W.D;
    var tKeys = Object.keys(DATA.TEMPLATES);
    W.templateKey = opts.template && DATA.TEMPLATES[opts.template] ? opts.template : R.pick(tKeys);
    var T = W.T = DATA.TEMPLATES[W.templateKey];

    function city(c) { return DATA.CITIES[c]; }
    function cc(c) { return DATA.CITIES[c].cc; }
    function natOfCity(c) { var k = cc(c); return k === 'WB' ? 'DE' : k; }

    // hotels and venues get global keys "Name, City"
    Object.keys(DATA.CITIES).forEach(function (cid) {
      var C = DATA.CITIES[cid];
      C.venues.forEach(function (v) {
        var key = v.n + ', ' + C.name;
        W.venues[key] = { key: key, name: v.n, kind: v.k, city: cid, addr: v.a, overlookedBy: null };
      });
      C.hotels.forEach(function (h) {
        var key = h.n + ', ' + C.name;
        var vk = h.o >= 0 ? C.venues[h.o].n + ', ' + C.name : null;
        W.hotels[key] = { key: key, name: h.n, city: cid, stars: h.s, addr: h.a, overlooks: vk, phone: null };
        if (vk) W.venues[vk].overlookedBy = key;
      });
    });

    // --------------------------------------------------------- generators
    function uniq(kind, fn) {
      for (var i = 0; i < 200; i++) { var v = fn(); if (!used[kind][v]) { used[kind][v] = 1; return v; } }
      throw new Error('cannot make unique ' + kind);
    }
    function mkName(nat, sex, surname) {
      var N = DATA.NAT[nat] || DATA.NAT.DE;
      return uniq('name', function () {
        var g = R.pick(sex === 'f' ? N.female : N.male);
        var s = surname || R.pick(N.sur);
        if (sex === 'f') s = DATA.fem(nat, s);
        return g + ' ' + s;
      });
    }
    function mkDob(y0, y1) { return CX.pad(R.int(1, 28)) + '.' + CX.pad(R.int(1, 12)) + '.' + R.int(y0, y1); }
    function mkPassport(nat) { var N = DATA.NAT[nat] || DATA.NAT.DE; return uniq('passport', function () { return CX.pat(N.pass, R); }); }
    function mkAddress(cid) {
      var C = city(cid);
      return uniq('address', function () {
        return C.addr.replace('{s}', R.pick(C.streets)).replace('{n}', String(R.int(2, 140)))
          .replace('{f}', String(R.int(1, 24))).replace('{z}', R.pick(C.zip)).replace('{d}', C.dist ? R.pick(C.dist) : '');
      });
    }
    function mkNumber(cid) { return uniq('number', function () { return CX.pat(city(cid).phone, R); }); }
    function mkPlate(cid) { return uniq('plate', function () { return CX.pat(city(cid).plate, R); }); }
    function mkAccountNo(cid, bankIdx) {
      var C = city(cid); var b = bankIdx === undefined ? R.pick(C.banks) : C.banks[bankIdx % C.banks.length];
      return { no: uniq('account', function () { return b.c + ' ' + CX.pat(b.f, R); }), bank: b.n, city: cid };
    }
    function addPhone(number, o) { o.number = number; W.phones[number] = o; return o; }
    function addAccount(acc, o) { o.account = acc.no; o.bank = acc.bank; o.city = acc.city; W.accounts[acc.no] = o; return o; }

    // hotel switchboards (all cities, cheap)
    Object.keys(W.hotels).forEach(function (hk) {
      var h = W.hotels[hk]; h.phone = mkNumber(h.city);
      addPhone(h.phone, { kind: 'hotel', subscriber: h.name + ' (switchboard)', address: h.addr + ', ' + city(h.city).name, city: h.city, hotel: hk, hub: true });
    });

    // ------------------------------------------------------- choose cities
    var actCandidates = [];
    Object.keys(W.venues).forEach(function (vk) {
      var v = W.venues[vk];
      if (T.venueKinds.indexOf(v.kind) < 0) return;
      if (!v.overlookedBy) return; // every act venue has a hotel with a view (recon needs one)
      var w = /EBE|PRG|BUD/.test(v.city) ? 0.35 : 1;
      actCandidates.push([vk, w]);
    });
    var actVenue = W.venues[R.weighted(actCandidates)];
    var actCity = actVenue.city;
    W.actCity = actCity;

    var principalPool = ['EBE', 'PRG', 'BUD', 'IST', 'ZRH', 'GVA', 'PAR', 'ROM', 'LIS', 'VIE', 'EBE', 'PRG'].filter(function (c) { return c !== actCity; });
    var principalCity = R.pick(principalPool);
    var nCities = R.int(3, 5);
    var others = R.shuffle(Object.keys(DATA.CITIES).filter(function (c) { return c !== actCity && c !== principalCity; }));
    // prefer land neighbours of the act city so drivers can drive in
    others.sort(function (a, b) { return landLink(b, actCity) - landLink(a, actCity); });
    var extra = [];
    if (R.chance(0.7)) extra.push(others.shift());
    others = R.shuffle(others);
    while (extra.length < nCities - 2) extra.push(others.shift());
    W.cities = [actCity, principalCity].concat(extra);
    function landLink(a, b) {
      if (cc(a) === cc(b)) return 1;
      return DATA.CROSS[[cc(a), cc(b)].sort().join('-')] ? 1 : 0;
    }
    function nonAct() { return R.pick(W.cities.filter(function (c) { return c !== actCity; })); }
    function anyCase() { return R.pick(W.cities); }

    // ------------------------------------------------------------ people
    var pidN = 0;
    function mkPerson(role, nat, home, o) {
      o = o || {};
      var sex = o.sex || (R.chance(role === 'lookout' || role === 'innocent' ? 0.55 : 0.15) ? 'f' : 'm');
      var real = o.name || mkName(nat, sex, o.surname);
      var yr = role === 'principal' || role === 'financier' ? [1928, 1945] : role === 'lookout' ? [1958, 1968] : [1935, 1962];
      var p = {
        id: 'p' + (++pidN), role: role, nat: nat, sex: sex, real: real, dob: mkDob(yr[0], yr[1]),
        homeCity: home, address: o.address || mkAddress(home), prevAddress: null,
        occupation: o.occupation || R.pick(DATA.FLAVOUR.occupations[role] || DATA.FLAVOUR.occupations.innocent),
        employer: o.employer || null,
        realPassport: mkPassport(nat), idents: [], phone: null, account: null, car: null, card: null,
        net: DATA.NETWORK_ROLES.indexOf(role) >= 0, cell: null, backup: false, handwriting: 'h' + R.int(1, 40),
        traits: { build: R.pick(['slight', 'stocky', 'tall', 'medium', 'heavy']), hair: R.pick(['dark', 'fair', 'grey', 'balding', 'red', 'black']), glasses: R.chance(0.3), moustache: sex === 'm' && R.chance(0.3) }
      };
      p.idents.push({ name: real, nat: nat, passport: p.realPassport, dob: p.dob, home: p.address, real: true, pid: p.id, links: [] });
      if (R.chance(0.35)) p.prevAddress = mkAddress(home);
      W.persons.push(p); W.P[p.id] = p; W.nameOwner[real] = p.id;
      if (p.net) W.network.push(p);
      return p;
    }
    function addAlias(p, nat, o) {
      o = o || {};
      nat = nat || p.nat;
      var id = {
        name: mkName(nat, p.sex), nat: nat, passport: o.passport || mkPassport(nat), dob: o.dob || (R.chance(0.5) ? p.dob : mkDob(1935, 1962)),
        home: o.home || fakeHome(nat), real: false, pid: p.id, links: []
      };
      p.idents.push(id); W.nameOwner[id.name] = p.id;
      return id;
    }
    function fakeHome(nat) {
      var cands = Object.keys(DATA.CITIES).filter(function (c) { return natOfCity(c) === nat; });
      return mkAddress(cands.length ? R.pick(cands) : R.pick(Object.keys(DATA.CITIES)));
    }
    function giveFlatPhone(p) {
      p.phone = mkNumber(p.homeCity);
      addPhone(p.phone, { kind: 'flat', subscriber: p.real, address: p.address, city: p.homeCity, pid: p.id });
    }
    function givePersonalAccount(p, cid) {
      var acc = mkAccountNo(cid || p.homeCity);
      p.account = acc.no;
      addAccount(acc, { holder: p.real, holderKind: 'personal', address: p.address, pid: p.id });
    }
    function giveCar(p) {
      var plate = mkPlate(p.homeCity);
      p.car = plate;
      W.vehicles[plate] = { plate: plate, make: R.pick(['Opel Rekord', 'Volkswagen Passat', 'Mercedes 230E', 'Ford Sierra', 'Audi 80', 'Peugeot 505', 'Fiat Regata', 'Volvo 240', 'BMW 318i', 'Renault 21']), colour: R.pick(['dark blue', 'grey', 'white', 'beige', 'maroon', 'green', 'silver']), ownerKind: 'private', owner: p.real, ownerAddr: p.address, pid: p.id, rentals: [] };
    }

    // network roles
    var roles = ['principal', 'cutout', 'operative'].concat(T.roles);
    var opt = R.shuffle(T.opt);
    var nOpt = R.weighted([[0, 2], [1, 4], [2, 3]]);
    roles = roles.concat(opt.slice(0, nOpt));
    if (roles.length >= 7 && R.chance(0.6)) roles.push('cutout');
    var backup = R.chance(0.3);
    if (backup) roles.push('operative');

    var homeFor = {
      principal: function () { return principalCity; },
      cutout: function () { return R.chance(0.5) ? actCity : nonAct(); },
      operative: function () { return nonAct(); },
      armourer: function () { return nonAct(); },
      forger: function () { return R.pick(W.cities.filter(function (c) { return c !== actCity; })); },
      driver: function () { var n = W.cities.filter(function (c) { return landLink(c, actCity); }); return R.pick(n.length ? n : [actCity]); },
      financier: function () { var f = W.cities.filter(function (c) { return /ZRH|GVA|VIE|LIS/.test(c); }); return f.length ? R.pick(f) : nonAct(); },
      'inside-man': function () { return actCity; },
      chemist: function () { return anyCase(); },
      lookout: function () { return actCity; },
      courier: function () { return R.chance(0.5) ? principalCity : anyCase(); }
    };
    var foreignNats = ['LB', 'YU', 'TR', 'GB', 'NL', 'SU', 'PL', 'IT', 'FR', 'CS', 'HU', 'DD'];
    var net = {};
    roles.forEach(function (role) {
      var home = homeFor[role]();
      var nat = natOfCity(home);
      if (role === 'operative' || (role === 'courier' && R.chance(0.5))) nat = R.pick(foreignNats);
      if (role === 'principal' && R.chance(0.2)) nat = R.pick(['SU', 'LB', 'DD']);
      var p = mkPerson(role, nat, home);
      if (role === 'operative' && net.operative) { p.backup = true; net.backup = p; }
      else if (role === 'cutout' && net.cutout) net.cutout2 = p;
      else net[role] = p;
    });
    var P = net.principal, C1 = net.cutout, C2 = net.cutout2 || null, O = net.operative;
    W.net = net;
    W.hasBackup = !!net.backup;

    // cells: C1 runs the action cell; C2 (if any) the supply cell
    var actionRoles = ['operative', 'driver', 'lookout', 'inside-man'];
    W.network.forEach(function (p) {
      if (p.role === 'principal' || p.role === 'financier') p.cell = 'top';
      else if (p.role === 'cutout') p.cell = p === C1 ? 'A' : 'B';
      else p.cell = (!C2 || actionRoles.indexOf(p.role) >= 0) ? 'A' : 'B';
    });
    function handlerOf(p) { return p.cell === 'B' && C2 ? C2 : C1; }

    // employer for inside-man: the act venue (or the hotel hosting the ballroom)
    if (net['inside-man']) {
      net['inside-man'].employer = actVenue.name;
      var im = net['inside-man'];
      im.occupation = { opera: 'Stagehand', hall: 'Technician (building services)', ministry: 'Security guard (contract)', embassy: 'Driver and handyman', ballroom: 'Waiter (banqueting)', fair: 'Night security guard', museum: 'Night security guard', institute: 'Laboratory technician', university: 'Porter' }[actVenue.kind] || im.occupation;
    }

    // phones, accounts, cars for the network
    W.network.forEach(function (p) {
      giveFlatPhone(p);
      if (['principal', 'operative'].indexOf(p.role) < 0 || R.chance(0.5)) givePersonalAccount(p);
      if (['driver', 'lookout', 'chemist', 'cutout', 'courier'].indexOf(p.role) >= 0 && R.chance(p.role === 'driver' ? 0.8 : 0.5)) giveCar(p);
    });
    // forger and armourer have a shop line (office) as well
    ['forger', 'armourer'].forEach(function (r) {
      var p = net[r]; if (!p) return;
      var shop = (r === 'forger' ? R.pick(['Druckerei ', 'Offsetdruck ', 'Buchbinderei ', 'Stempel & Druck ']) : R.pick(['Waffen ', 'Büchsenmacherei ', 'Jagd & Sport '])) + p.real.split(' ').slice(-1)[0];
      p.shop = shop; p.shopPhone = mkNumber(p.homeCity);
      addPhone(p.shopPhone, { kind: 'office', subscriber: shop, address: mkAddress(p.homeCity), city: p.homeCity, pid: p.id });
    });

    // principal: office line of a front organisation + root account
    var frontName = (city(principalCity).cc === 'DD' ? 'AHB ' : city(principalCity).cc === 'CS' ? 'PZO ' : city(principalCity).cc === 'HU' ? '' : '') +
      R.pick(DATA.FLAVOUR.coverRoots) + ' ' + R.pick(['Intertrade', 'Technoexport', 'Holding', 'Finanz', 'Trust', 'Handels-Kontor']) + (city(principalCity).cc === 'HU' ? ' Kft.' : city(principalCity).cc === 'CH' ? ' AG' : '');
    used.company[frontName] = 1;
    var frontAddr = mkAddress(principalCity);
    P.officePhone = mkNumber(principalCity);
    addPhone(P.officePhone, { kind: 'office', subscriber: frontName, address: frontAddr, city: principalCity, company: frontName });
    var rootAcc = mkAccountNo(principalCity);
    var principalAlias = null;
    if (R.chance(0.5)) principalAlias = addAlias(P, P.nat);
    addAccount(rootAcc, { holder: frontName, holderKind: 'company', address: frontAddr, signatory: (principalAlias || P.idents[0]).name, company: frontName, pid: P.id, root: true });
    W.companies[frontName] = { name: frontName, city: principalCity, address: frontAddr, regNo: regNo(principalCity), founded: -R.int(900, 4000), directors: [(principalAlias || P.idents[0]).name], accounts: [rootAcc.no], notes: 'Foreign-trade enterprise; accounts abroad under licence.', pids: [P.id], front: true };
    W.rootAccount = rootAcc.no;
    function regNo(cid) { return { AT: 'HRB ' + R.num(5), DE: 'HRB ' + R.num(5), WB: 'HRB ' + R.num(5) + ' Nz', CH: 'CH-020.' + R.digits(1) + '.' + R.num(6) + '-' + R.digits(1), FR: 'RCS ' + R.num(3) + ' ' + R.num(3) + ' ' + R.num(3), IT: 'n. ' + R.num(6), PT: 'n.º ' + R.num(5), TR: 'Sicil ' + R.num(6), DD: 'Reg.-Nr. ' + R.num(4), CS: 'č. ' + R.num(5), HU: 'Cg. 01-09-' + R.num(6) }[cc(cid)] || R.num(6); }

    // cover company paying for the operation
    var fin = net.financier || null;
    var coCity = fin ? fin.homeCity : C1.homeCity;
    var form = DATA.FLAVOUR.companyForms[cc(coCity)] || 'GmbH';
    var coName = uniq('company', function () { return R.pick(DATA.FLAVOUR.coverCompanies).replace('{a}', R.pick(DATA.FLAVOUR.coverRoots)).replace('{f}', form).replace('Handels' + form, 'Handels' + (form === 'GmbH' || form === 'Ges.m.b.H.' ? '-' + form : ' ' + form)); });
    var coAddr = mkAddress(coCity);
    var coAcc = mkAccountNo(coCity);
    var c1Alias = addAlias(C1, R.chance(0.6) ? C1.nat : R.pick(['AT', 'DE', 'CH', 'NL', 'IT', 'FR']));
    var coDirector = fin ? fin.idents[0] : (R.chance(0.5) ? c1Alias : C1.idents[0]);
    var nominee = null;
    if (R.chance(0.75)) {
      nominee = mkPerson('innocent', natOfCity(coCity), coCity, { occupation: R.pick(['Lawyer (Rechtsanwalt)', 'Notary', 'Fiduciary']), sex: 'm' });
      nominee.innocentKind = 'nominee'; W.innocents.push(nominee);
      giveFlatPhone(nominee);
      if (R.chance(0.7)) nominee.card = { summary: 'Company-formation lawyer. Appears as nominee director of some 40 firms. No adverse record; considered careless rather than corrupt.', aliases: [], associates: [], photo: false };
    }
    addAccount(coAcc, { holder: coName, holderKind: 'company', address: coAddr, signatory: coDirector.name, company: coName, pid: (fin || C1).id });
    W.coverCompany = coName; W.coverAccount = coAcc.no;
    W.companies[coName] = { name: coName, city: coCity, address: coAddr, regNo: regNo(coCity), founded: -R.int(60, 700),
      directors: [coDirector.name].concat(nominee ? [nominee.real] : []), accounts: [coAcc.no],
      notes: R.pick(['Share capital paid in cash.', 'Annual accounts filed late (1987, 1988).', 'Registered office c/o a fiduciary.', 'Object: "trade in goods of all kinds, consultancy".', 'Change of director recorded ' + R.int(1, 12) + '/1989.']),
      pids: [(fin || C1).id].concat(nominee ? [nominee.id] : []) };
    var coPhone = mkNumber(coCity);
    addPhone(coPhone, { kind: 'office', subscriber: coName, address: coAddr, city: coCity, company: coName, pid: (fin || C1).id });
    W.coverPhone = coPhone;
    // whoever runs the cover company is registered as working for it
    if (fin) { fin.employer = coName; fin.occupation = R.pick(['Fiduciary (Treuhänder)', 'Managing director', 'Accountant']); }
    else if (coDirector === C1.idents[0]) { C1.employer = coName; C1.occupation = 'Managing director'; }

    // aliases for the rest of the network
    var O1 = addAlias(O, R.pick(['AT', 'DE', 'CH', 'NL', 'IT', 'FR', 'GB', 'YU', 'TR', 'PT']));
    var O2 = null;
    if (net.forger || R.chance(0.6)) O2 = addAlias(O, R.pick(['AT', 'DE', 'CH', 'NL', 'IT', 'FR', 'GB', 'PT']));
    var Ob = net.backup ? addAlias(net.backup, R.pick(['AT', 'DE', 'CH', 'IT', 'FR'])) : null;
    var Dr = net.driver ? (R.chance(0.65) ? addAlias(net.driver, net.driver.nat) : net.driver.idents[0]) : null;
    var Cr = net.courier ? (R.chance(0.6) ? addAlias(net.courier, R.pick(['AT', 'DE', 'CH', 'NL', net.courier.nat])) : net.courier.idents[0]) : null;
    var Lk = net.lookout ? (R.chance(0.3) ? addAlias(net.lookout, net.lookout.nat) : net.lookout.idents[0]) : null;
    var Ch = net.chemist ? (R.chance(0.35) ? addAlias(net.chemist, net.chemist.nat) : net.chemist.idents[0]) : null;
    var c2Alias = C2 ? (R.chance(0.6) ? addAlias(C2, C2.nat) : C2.idents[0]) : null;
    W.opIdents = { O1: O1, O2: O2 };

    // --------------------------------------------------- identity links
    // For every alias, choose how it leaks: passport reuse (L1), dob+home
    // address on a hotel form (L2), archive card (L3), own car (L4), own
    // personal account paying (L5). Realisation happens in the timeline.
    function planLinks(p) {
      var als = p.idents.filter(function (x) { return !x.real; });
      als.forEach(function (a, i) {
        var opts2 = [];
        if (i > 0) opts2.push(['L1', 3]);
        opts2.push(['L2', 3]);
        if (!a.fresh) opts2.push(['L3', p.role === 'principal' ? 10 : 2]);
        if (p.car) opts2.push(['L4', 3]);
        if (p.account) opts2.push(['L5', 2]);
        var n = p.role === 'principal' ? 1 : R.weighted([[1, 5], [2, 4]]);
        var chosen = [];
        while (chosen.length < n && opts2.length) {
          var c = R.weighted(opts2);
          chosen.push(c);
          opts2 = opts2.filter(function (o) { return o[0] !== c; });
        }
        if (p.role === 'principal') chosen = ['L3'];
        a.links = chosen;
        if (chosen.indexOf('L1') >= 0) a.passport = als[i - 1].passport;
        if (chosen.indexOf('L2') >= 0) { a.home = p.address; a.dob = p.dob; }
      });
    }
    W.network.forEach(planLinks);

    // archive cards
    function oldAlias(p) {
      var n = mkName(R.pick(['AT', 'DE', 'CH', 'FR', 'IT', 'NL', p.nat]), p.sex);
      W.nameOwner[n] = p.id; W.oldAliases[n] = p.id;
      return n;
    }
    W.network.forEach(function (p) {
      var als = p.idents.filter(function (x) { return !x.real; });
      var needs = als.some(function (a) { return a.links.indexOf('L3') >= 0; });
      var prob = { principal: 0.5, cutout: 0.4, operative: 0.5, armourer: 0.7, forger: 0.75, courier: 0.35, chemist: 0.3, driver: 0.25 }[p.role] || 0;
      if (!needs && !R.chance(prob)) return;
      var cardAliases = als.filter(function (a) { return a.links.indexOf('L3') >= 0; }).map(function (a) { return a.name; });
      if (R.chance(0.5)) cardAliases.push(oldAlias(p));
      var summ = {
        principal: 'Believed to be an officer of a hostile service under trade cover. Travels rarely; prefers to be visited.',
        cutout: 'Commercial traveller with an unusual number of border crossings. Suspected go-between for ' + R.pick(['a Middle Eastern group', 'an Eastern service', 'arms brokers']) + '.',
        operative: 'Trained abroad (' + R.pick(['Libya', 'South Yemen', 'the GDR', 'Bulgaria']) + ', c. 198' + R.int(0, 6) + '). Suspected in an unsolved shooting, ' + R.pick(['Athens 1985', 'Brussels 1986', 'Madrid 1984', 'Nicosia 1987']) + '. No conviction.',
        armourer: 'Licensed gunsmith. Investigated 198' + R.int(2, 8) + ' for sale of rifles without permits; proceedings dropped.',
        forger: 'Suspected document forger. Printing equipment seized 198' + R.int(1, 7) + '; returned on appeal.',
        courier: 'Frequent traveller carrying large sums in cash, always declared. Customs describe him as "polite, unhelpful".',
        chemist: 'Dismissed from a pharmaceutical laboratory 198' + R.int(3, 8) + ' after stock discrepancies. No charges.',
        driver: 'Convicted 198' + R.int(0, 6) + ' of smuggling cigarettes (fine). Excellent driver, according to the arresting officer.'
      }[p.role] || 'Known to the service.';
      var assoc = [];
      if (p.role !== 'principal' && handlerOf(p) !== p && R.chance(0.3)) assoc.push(handlerOf(p).real);
      p.card = { summary: summ, aliases: cardAliases, associates: assoc, photo: R.chance(0.6) };
    });

    // ----------------------------------------------------------- targets
    function mkDignitary() {
      var t = R.pick(DATA.DIGNITARY_TITLES);
      var nat = t[0], name;
      if (nat === 'US') name = uniq('name', function () { return R.pick(DATA.US_NAMES.male) + ' ' + R.pick(DATA.US_NAMES.sur); });
      else name = mkName(nat, R.chance(0.15) ? 'f' : 'm');
      var pre = R.chance(0.5) ? 'Dr ' : '';
      var fem = nat !== 'US' && (DATA.NAT[nat].female.indexOf(name.split(' ')[0]) >= 0);
      return { kind: 'dignitary', name: pre + name, plain: name, title: t[1], nat: nat, sex: fem ? 'f' : 'm' };
    }
    function mkScientist() {
      var nat = R.pick(['AT', 'DE', 'CS', 'HU', 'DD', 'FR', 'IT', 'CH', 'SU', 'PL']);
      var sx = R.chance(0.25) ? 'f' : 'm';
      var name = mkName(nat, sx);
      return { kind: 'scientist', name: 'Prof. ' + name, plain: name, title: DATA.NAT[nat].adj + ' ' + R.pick(DATA.SCIENTIST_FIELDS), nat: nat, sex: sx };
    }
    function mkObject(cat) {
      var O_ = cat ? DATA.OBJECTS.filter(function (o) { return o.cat === cat; })[0] : R.pick(DATA.OBJECTS);
      var owner = R.pick(DATA.OBJECT_OWNERS);
      return { kind: 'object', name: R.pick(O_.names), plain: null, title: 'property of ' + owner, trait: { cat: O_.cat, code: O_.code, text: '' } };
    }
    var usedSubjects = {};
    function mkSubject(kind, cat) {
      for (var i = 0; i < 30; i++) {
        var s = kind === 'object' ? mkObject(cat) : kind === 'scientist' ? mkScientist() : mkDignitary();
        if (usedSubjects[s.name]) continue;
        if (kind !== 'object') {
          var tr = cat ? DATA.TRAITS.filter(function (x) { return x.cat === cat; })[0] : R.pick(DATA.TRAITS);
          s.trait = { cat: tr.cat, code: tr.code, text: R.pick(tr.t) };
        } else if (cat && s.trait.cat !== cat) continue;
        usedSubjects[s.name] = 1;
        return s;
      }
      return null;
    }
    function eventWhat(venue, subj) {
      var ek = R.pick(DATA.EVENT_KINDS[venue.kind]);
      var w = ek.w.replace('{venue}', venue.name).replace('{opera}', R.pick(DATA.OPERAS)).replace('{conf}', venue.kind === 'fair' ? R.pick(DATA.FAIRS) : R.pick(DATA.CONFS));
      if (subj.kind === 'object') {
        w = { fair: 'is shown to trade visitors at the ' + venue.name, museum: 'goes on display for one day at the ' + venue.name, institute: 'is demonstrated to a closed audience at the ' + venue.name }[venue.kind] || ('is exhibited at the ' + venue.name);
      }
      return { type: ek.t, what: w, time: R.pick(ek.time) };
    }
    var evN = 0;
    function mkEvent(subj, venueKey, day, real) {
      if (!subj) return null;
      var v = W.venues[venueKey];
      var ew = eventWhat(v, subj);
      var ev = { id: 'e' + (++evN), subject: subj, venue: venueKey, city: v.city, day: day, time: ew.time, type: ew.type, what: ew.what, real: !!real };
      W.events.push(ev);
      return ev;
    }
    var subjKind = T.target;
    var targetSubj = mkSubject(subjKind);
    var realEvent = mkEvent(targetSubj, actVenue.key, D, true);
    W.realEvent = realEvent;
    W.target = targetSubj;

    // ------------------------------------------------------- clue plan
    // Recon kinds (>=2), code call; decoys are then built so that no single
    // clue identifies the event but the conjunction does.
    var recon = R.sample(T.recon, R.int(2, Math.min(3, T.recon.length)));
    if (recon.indexOf('view-room') < 0 && recon.indexOf('photographs') < 0) recon[recon.length - 1] = T.recon.indexOf('photographs') >= 0 ? 'photographs' : 'view-room';
    if (net.lookout && recon.indexOf('photographs') < 0) recon.push('photographs');
    W.recon = recon;
    var codeName = R.chance(0.75);
    var codeDay = R.chance(0.85) || !codeName;
    W.codePlan = { name: codeName, day: codeDay };
    var planned = [];
    if (recon.indexOf('view-room') >= 0 || recon.indexOf('photographs') >= 0 || net.driver) planned.push({ k: 'venue', venue: actVenue.key });
    planned.push({ k: 'window', city: actCity, from: D - 1, to: D + 1 });
    if (codeDay) planned.push({ k: 'weekday', wd: W.cal.weekday(D) });
    if (codeName) planned.push({ k: 'code', cat: targetSubj.trait.cat });
    if (recon.indexOf('buys-schedule') >= 0 || recon.indexOf('asks-porter') >= 0 || net.backup) planned.push({ k: 'subject', subject: targetSubj.name });
    W.plannedClues = planned;

    function venuesIn(cid, kinds, except) {
      return Object.keys(W.venues).filter(function (k) { var v = W.venues[k]; return v.city === cid && k !== except && (!kinds || kinds.indexOf(v.kind) >= 0); });
    }
    function kindsFor(kind) { return kind === 'object' ? ['fair', 'museum', 'institute'] : kind === 'scientist' ? ['university', 'institute', 'hall'] : ['opera', 'hall', 'ministry', 'embassy', 'ballroom']; }
    function otherCat(cat) { var pool = (subjKind === 'object' ? DATA.OBJECTS : DATA.TRAITS).map(function (x) { return x.cat; }).filter(function (c) { return c !== cat; }); return R.pick(pool); }
    function dayOutsideWindow() { var c = [D - 6, D - 5, D - 4, D - 3, D - 2, D + 2].filter(function (d) { return d >= 2; }); return R.pick(c); }
    var has = {}; planned.forEach(function (c) { has[c.k] = true; });
    // decoy A: subject elsewhere (same subject; act city other venue on D+-1, or other city)
    if (has.subject) {
      var vA = venuesIn(actCity, kindsFor(subjKind), actVenue.key);
      if (has.window && vA.length && R.chance(0.6)) mkEvent(targetSubj, R.pick(vA), R.pick([D - 1, D + 1]), false);
      else { var oc = R.pick(W.cities.filter(function (c) { return c !== actCity; })); var vv = venuesIn(oc, kindsFor(subjKind)); if (vv.length) mkEvent(targetSubj, R.pick(vv), R.pick([D - 2, D - 1, D + 1, D - 3]), false); }
    }
    // decoy B: same venue, other day, other subject
    if (has.venue) mkEvent(mkSubject(subjKind, otherCat(targetSubj.trait.cat)), actVenue.key, dayOutsideWindow(), false);
    // decoy C: same day elsewhere (weekday) and/or same code category
    if (has.weekday || has.code) {
      var cities2 = W.cities.filter(function (c) { return c !== actCity && venuesIn(c, kindsFor(subjKind)).length; });
      var cC = cities2.length ? R.pick(cities2) : actCity;
      var vC = venuesIn(cC, kindsFor(subjKind), actVenue.key);
      var dayC = has.weekday ? D : dayOutsideWindow();
      var catC = has.code ? targetSubj.trait.cat : otherCat(targetSubj.trait.cat);
      if (vC.length) mkEvent(mkSubject(subjKind, catC), R.pick(vC), dayC, false);
      // if both weekday and code exist, one more that only shares the code
      if (has.weekday && has.code && R.chance(0.5)) {
        var cD = R.pick(W.cities); var vD = venuesIn(cD, kindsFor(subjKind), actVenue.key);
        if (vD.length) mkEvent(mkSubject(subjKind, targetSubj.trait.cat), R.pick(vD), dayOutsideWindow(), false);
      }
    }
    // decoy D: in the act city inside the window, other venue (window clue)
    if (has.window && W.events.filter(function (e) { return !e.real && e.city === actCity && e.day >= D - 1 && e.day <= D + 1; }).length === 0) {
      var vW = venuesIn(actCity, kindsFor(subjKind), actVenue.key);
      if (vW.length) mkEvent(mkSubject(subjKind, otherCat(targetSubj.trait.cat)), R.pick(vW), R.pick([D - 1, D, D + 1]), false);
      else {
        // no venue of the same kind: any other public event in the act city
        var vAny = venuesIn(actCity, null, actVenue.key);
        var vk2 = R.pick(vAny), kind2 = W.venues[vk2].kind;
        var sk2 = /fair|museum/.test(kind2) ? 'object' : /university/.test(kind2) ? 'scientist' : 'dignitary';
        var sub2 = mkSubject(sk2);
        if (sub2 && sub2.trait.cat === targetSubj.trait.cat) sub2 = mkSubject(sk2, sk2 === 'object' ? null : otherCat(targetSubj.trait.cat));
        mkEvent(sub2, vk2, R.pick([D - 1, D, D + 1]), false);
      }
    }
    while (W.events.length < 3) {
      var cx = R.pick(W.cities); var vx = venuesIn(cx, kindsFor(subjKind), actVenue.key);
      if (vx.length) mkEvent(mkSubject(subjKind, otherCat(targetSubj.trait.cat)), R.pick(vx), R.int(Math.max(2, D - 6), D + 2), false);
    }
    // conjunction check: the planned clues must single out the real event
    W.eventMatches = function (ev, clue) {
      switch (clue.k) {
        case 'venue': return ev.venue === clue.venue;
        case 'window': return ev.city === clue.city && ev.day >= clue.from && ev.day <= clue.to;
        case 'weekday': return W.cal.weekday(ev.day) === clue.wd;
        case 'code': return ev.subject.trait.cat === clue.cat;
        case 'subject': return ev.subject.name === clue.subject;
      }
      return true;
    };
    var survivors = W.events.filter(function (ev) { return planned.every(function (c) { return W.eventMatches(ev, c); }); });
    if (survivors.length !== 1) throw new Error('decoys not separable');
    W.events = R.shuffle(W.events);

    // ------------------------------------------------------------ timeline
    var sN = 0;
    function step(kind, day, time, phase, data) {
      var s = { id: 's' + (++sN), kind: kind, day: day, time: time, phase: phase, parts: [] };
      for (var k in data) s[k] = data[k];
      W.steps.push(s);
      return s;
    }
    function part(p, ident, role) { return { pid: p.id, name: ident ? ident.name : p.real, role: role || p.role }; }
    function T_(a, b) { return R.int(a, b); } // minutes

    // routes
    function route(from, to, pref, plate) {
      var a = cc(from), b = cc(to);
      if (a === b) return { mode: plate ? 'car' : 'train', domestic: true };
      var cr = DATA.CROSS[[a, b].sort().join('-')];
      if (cr && pref !== 'air') {
        var mode = plate ? 'car' : (pref === 'train' || R.chance(0.6) ? 'train' : 'air');
        if (mode === 'car') return { mode: 'car', point: cr.road, entering: b };
        if (mode === 'train') return { mode: 'train', point: cr.rail, entering: b, train: R.pick(['D', 'EC', 'IC', 'Ex']) + ' ' + (100 + (CX.hash(from + to) % 800)) };
      }
      var al = DATA.AIRLINE[a] || DATA.AIRLINE.AT;
      var fno = al.c + ' ' + (100 + (CX.hash(from + '>' + to) % 800));
      var dep = 420 + (CX.hash(to + '>' + from) % 13) * 60 + (CX.hash(from) % 4) * 15;
      return { mode: 'air', point: city(to).airport.n + ' airport', airport: city(to).airport.c, entering: b, flight: fno, airline: al.n, dep: dep, arr: dep + 75 + (CX.hash(from + to + 'x') % 5) * 20, from: from, to: to };
    }
    W.route = route;

    function pickHotel(cid, o) {
      o = o || {};
      var hs = Object.keys(W.hotels).filter(function (k) { var h = W.hotels[k]; return h.city === cid && (!o.noView || !h.overlooks); });
      return R.pick(hs);
    }
    function roomNo(h) { return String(R.int(1, W.hotels[h].stars >= 4 ? 6 : 4)) + CX.pad(R.int(1, 24)); }

    /** a journey: travel step (+ optional stay). Returns {travel, stay}. */
    function busyAt(p, a, b, dest) {
      return W.steps.some(function (s) {
        if (s.kind === 'stay') return s.parts[0].pid === p.id && s.from < b && a < s.to;
        // appointments elsewhere (hand-overs, meetings) also pin a person down
        if (dest && s.city && s.city !== dest && /acquire|forge|meet|drop/.test(s.kind) && s.day >= a && s.day < b) return s.parts.some(function (x) { return x.pid === p.id; });
        return false;
      });
    }
    function trip(p, ident, from, to, day, o) {
      o = o || {};
      if (o.nights !== 0 && !o.noStay) {
        // nobody sleeps in two hotels at once: move the journey to the first free slot
        var n0 = o.nights || R.int(1, 3); o.nights = n0;
        if (busyAt(p, day, day + n0, to)) {
          var cand = [1, 2, 3, 4, 5, 6, -1, -2, -3, -4].map(function (k) { return day + k; }).filter(function (d) { return !busyAt(p, d, d + n0, to); })[0];
          if (cand !== undefined) { if (o.bookedDay !== undefined && o.bookedDay >= cand) o.bookedDay = cand - 1; day = cand; }
        }
      }
      var rt = route(from, to, o.pref, o.plate);
      if (rt.mode !== 'car') o.plate = null;
      var time = rt.mode === 'air' ? rt.arr : T_(8 * 60, 21 * 60);
      var parts = [part(p, ident, o.role)];
      (o.companions || []).forEach(function (c) { parts.push(part(c.p, c.ident, c.role)); });
      var tr = step('travel', day, time, o.phase || 'logistics', { from: from, to: to, route: rt, plate: o.plate || null, driverPid: o.plate ? p.id : null, customs: o.customs || null, paidBy: o.paidBy || null, bookedDay: o.bookedDay === undefined ? day - R.int(1, 5) : o.bookedDay });
      tr.parts = parts;
      var st = null;
      if (o.nights !== 0 && !o.noStay) {
        var nights = o.nights || R.int(1, 3);
        var hk = o.hotel || pickHotel(to, { noView: true });
        st = step('stay', day, Math.min(23 * 60 + 50, time + T_(20, 90)), o.phase || 'logistics', { hotel: hk, from: day, to: day + nights, room: o.room || roomNo(hk), note: o.note || null, viewOf: o.viewOf || null, paidBy: o.hotelPaidBy || null });
        st.parts = [part(p, ident, o.role)];
        (o.companions || []).forEach(function (c) {
          if (c.sameRoom) return;
          var s2 = step('stay', day, Math.min(23 * 60 + 50, time + T_(20, 90)), o.phase || 'logistics', { hotel: hk, from: day, to: day + nights, room: roomNo(hk), note: null });
          s2.parts = [part(c.p, c.ident, c.role)];
        });
      }
      return { travel: tr, stay: st };
    }
    /** telephone call. from/to: {num, pid, stay?} */
    function call(day, from, to, o) {
      o = o || {};
      var tm = o.time || T_(8 * 60, 22 * 60);
      if (from.stay) {
        // a call from a hotel room happens while the guest is there
        if (day < from.stay.from) day = from.stay.from;
        if (day === from.stay.from && tm <= from.stay.time + 15) {
          tm = from.stay.time + R.int(20, 150);
          if (tm > 23 * 60 + 40) { if (from.stay.to > day + 1) { day++; tm = R.int(7 * 60 + 30, 10 * 60); } else tm = Math.min(23 * 60 + 58, from.stay.time + 5); }
        }
        if (day >= from.stay.to) { day = from.stay.to; tm = R.int(7 * 60, 9 * 60); }
      }
      var s = step('call', day, tm, o.phase || 'logistics', { fromNum: from.num, toNum: to.num, fromStay: from.stay ? from.stay.id : null, toStay: to.stay ? to.stay.id : null, dur: o.dur || R.int(40, 600), intercept: o.intercept || null, reservation: o.reservation || null });
      if (from.p) s.parts.push(part(from.p, from.ident));
      if (to.p) s.parts.push(part(to.p, to.ident));
      return s;
    }
    function hotelLine(stay) { return W.hotels[stay.hotel].phone; }
    function pay(day, fromAcc, toAcc, amount, ref, parts, o) {
      o = o || {};
      var s = step('pay', day, T_(9 * 60, 16 * 60), o.phase || 'logistics', { fromAcc: fromAcc, toAcc: toAcc, amount: amount, ref: ref, item: o.item || null, purpose: o.purpose || null });
      s.parts = parts;
      return s;
    }
    function curOf(acc) { var A = W.accounts[acc]; var k = cc(A.city); if ((k === 'DD' || k === 'CS' || k === 'HU') && A.holderKind === 'company') { if (!A.cur) A.cur = R.chance(0.5) ? 'US$' : 'DM'; return A.cur; } return DATA.COUNTRY[k].cur; }
    function amt(base) { return Math.round(base * (0.8 + R.next() * 0.5) / 100) * 100; }
    var fx = { 'US$': 0.55, 'öS': 7, 'DM': 1, 'M': 1, 'Ft': 40, 'Kčs': 10, 'sFr.': 0.85, 'Lit.': 730, 'FF': 3.4, 'Esc.': 85, 'TL': 1100 };
    function money(acc, dm) { var c = curOf(acc); return { amount: amt(dm * (fx[c] || 1)), cur: c }; }

    var coPayer = fin || C1;
    function coPay(day, toAcc, dm, ref, recipient, o) {
      var m = money(W.coverAccount, dm);
      var parts = [part(coPayer, coPayer.idents[0], coPayer.role)];
      if (recipient) parts.push(part(recipient, recipient.idents[0]));
      var s = pay(day, W.coverAccount, toAcc, m.amount, ref, parts, o);
      s.cur = m.cur;
      return s;
    }

    // ---- planning: money from the top
    var m1 = money(W.rootAccount, R.int(150, 400) * 1000);
    var ps1 = pay(-R.int(13, 16), W.rootAccount, W.coverAccount, m1.amount, R.pick(['Beratungshonorar lt. Vertrag', 'Vorauszahlung Lieferung', 'Kommission Q4', 'Consultancy agreement 17/89']), [part(P, principalAlias || P.idents[0]), part(coPayer, coPayer.idents[0], coPayer.role)], { phase: 'planning' });
    ps1.cur = m1.cur;
    if (R.chance(0.6)) { var m2 = money(W.rootAccount, R.int(40, 120) * 1000); var ps2 = pay(R.int(1, D - 7), W.rootAccount, W.coverAccount, m2.amount, 'Nachzahlung / Spesen', [part(P, principalAlias || P.idents[0]), part(coPayer, coPayer.idents[0], coPayer.role)], { phase: 'logistics' }); ps2.cur = m2.cur; }

    // principal <-> cutout(s): calls from the office, one visit
    [C1].concat(C2 ? [C2] : []).forEach(function (c, ci) {
      var cAl = ci === 0 ? c1Alias : c2Alias;
      call(-R.int(12, 15), { num: P.officePhone, p: P, ident: P.idents[0] }, { num: c.phone, p: c, ident: c.idents[0] }, { phase: 'planning', dur: R.int(120, 400) });
      var d0 = -R.int(8, 11);
      if (c.homeCity !== principalCity) {
        var t1 = trip(c, cAl, c.homeCity, principalCity, d0, { nights: R.int(1, 2), phase: 'planning', role: 'cutout', plate: (c.car && cAl.links.indexOf('L4') >= 0) && landLink(c.homeCity, principalCity) && cc(c.homeCity) !== cc(principalCity) ? c.car : null, paidBy: cAl.links.indexOf('L5') >= 0 && c.account ? c.account : null });
        if (t1.stay) call(t1.stay.from, { num: hotelLine(t1.stay), p: c, ident: cAl, stay: t1.stay }, { num: P.officePhone, p: P, ident: P.idents[0] }, { phase: 'planning' });
        step('meet', t1.stay ? Math.max(t1.stay.from, t1.stay.to - 1) : d0 + 1, T_(10 * 60, 20 * 60), 'planning', { place: R.pick(city(principalCity).cafes) + ', ' + city(principalCity).name, city: principalCity }).parts = [part(P, P.idents[0]), part(c, cAl)];
        if (R.chance(0.6) && t1.stay) trip(c, cAl, principalCity, c.homeCity, t1.stay.to, { noStay: true, phase: 'planning', role: 'cutout', plate: t1.travel.plate, bookedDay: t1.stay.to - 1 });
      }
      call(R.int(1, 3), { num: c.phone, p: c, ident: c.idents[0] }, { num: P.officePhone, p: P, ident: P.idents[0] }, { phase: 'logistics', dur: R.int(60, 300) });
      if (R.chance(0.6)) call(R.int(D - 7, D - 4), { num: P.officePhone, p: P, ident: P.idents[0] }, { num: c.phone, p: c, ident: c.idents[0] }, { phase: 'rehearsal', dur: R.int(30, 200) });
      if (c.account) coPay(-R.int(6, 9), c.account, R.int(15, 35) * 1000, R.pick(['Provision lt. Vereinbarung', 'Honorar Vermittlung', 'Reisespesen pauschal']), c, { phase: 'planning' });
    });
    if (fin) {
      step('meet', -R.int(14, 18), T_(11 * 60, 15 * 60), 'planning', { place: 'offices of ' + W.coverCompany, city: fin.homeCity }).parts = [part(P, P.idents[0]), part(fin, fin.idents[0])];
      if (P.homeCity !== fin.homeCity && R.chance(0.7)) call(-R.int(10, 12), { num: P.officePhone, p: P, ident: P.idents[0] }, { num: W.coverPhone, p: fin, ident: fin.idents[0] }, { phase: 'planning' });
      call(-R.int(5, 8), { num: fin.phone, p: fin, ident: fin.idents[0] }, { num: C1.phone, p: C1, ident: C1.idents[0] }, { phase: 'planning' });
    }

    // ---- cutouts meet their cells
    var stays = {}; // pid -> list of stays (for room calls)
    function remember(p, t) { if (t && t.stay) (stays[p.id] = stays[p.id] || []).push(t.stay); return t; }
    var cellMembers = W.network.filter(function (p) { return ['principal', 'financier', 'cutout'].indexOf(p.role) < 0; });
    var visitDays = {};
    cellMembers.forEach(function (m) {
      var c = handlerOf(m); var cAl = c === C1 ? c1Alias : c2Alias;
      var d = R.int(-7, 1);
      // flat-to-flat call to set up
      call(d - R.int(1, 2), { num: c.phone, p: c, ident: c.idents[0] }, { num: m.phone, p: m, ident: m.idents[0] }, { phase: 'planning', dur: R.int(40, 180) });
      if (m.homeCity !== c.homeCity) {
        var key = c.id + m.homeCity;
        var t = visitDays[key];
        if (!t) {
          t = trip(c, cAl, c.homeCity, m.homeCity, d, { nights: R.int(1, 2), phase: 'logistics', role: 'cutout', paidBy: cAl.links.indexOf('L5') >= 0 && c.account ? c.account : null, plate: c.car && cAl.links.indexOf('L4') >= 0 && cc(c.homeCity) !== cc(m.homeCity) && landLink(c.homeCity, m.homeCity) ? c.car : null });
          visitDays[key] = t; remember(c, t);
          if (R.chance(0.5) && t.stay) trip(c, cAl, m.homeCity, c.homeCity, t.stay.to, { noStay: true, role: 'cutout', plate: t.travel.plate, bookedDay: t.stay.to - 1 });
        }
        if (t.stay) call(t.stay.from, { num: hotelLine(t.stay), p: c, ident: cAl, stay: t.stay }, { num: m.shopPhone || m.phone, p: m, ident: m.idents[0] }, { phase: 'logistics' });
        step('meet', t.travel.day + (t.stay ? 1 : 0), T_(10 * 60, 21 * 60), 'logistics', { place: R.pick(city(m.homeCity).cafes) + ', ' + city(m.homeCity).name, city: m.homeCity }).parts = [part(c, cAl), part(m, m.idents[0])];
      } else {
        step('meet', d, T_(10 * 60, 21 * 60), 'logistics', { place: R.pick(city(m.homeCity).cafes) + ', ' + city(m.homeCity).name, city: m.homeCity }).parts = [part(c, c.idents[0]), part(m, m.idents[0])];
      }
    });

    // ---- forger makes O's new identity
    var forgeDay = R.int(-4, 1);
    var opHome = O.homeCity;
    var O1link = O1.links;
    function opTripPaid(ident) { return ident.links.indexOf('L5') >= 0 && O.account ? O.account : null; }
    if (net.forger) {
      var F = net.forger;
      var tf = { stay: null };
      if (F.homeCity !== opHome) tf = remember(O, trip(O, O1, opHome, F.homeCity, forgeDay - 1, { nights: 2, phase: 'logistics', role: 'operative', paidBy: opTripPaid(O1) }));
      if (tf.stay) forgeDay = tf.stay.from + 1;
      if (tf.stay) call(forgeDay - 1, { num: hotelLine(tf.stay), p: O, ident: O1, stay: tf.stay }, { num: F.shopPhone, p: F, ident: F.idents[0] }, { dur: R.int(40, 120) });
      step('forge', forgeDay, T_(10 * 60, 18 * 60), 'logistics', { newName: O2 ? O2.name : O1.name, place: F.shop, city: F.homeCity }).parts = [part(F, F.idents[0]), part(O, O1)];
      coPay(forgeDay + 1, F.account, R.int(5, 12) * 1000, R.pick(['Satzarbeiten lt. Auftrag', 'Druckkosten Prospekte', 'Lithographie Rg. ' + R.num(4)]), F, { purpose: 'forge' });
      // a second job for the backup or driver
      if (net.backup && R.chance(0.5)) step('forge', forgeDay + 1, T_(10 * 60, 18 * 60), 'logistics', { newName: Ob.name, place: F.shop }).parts = [part(F, F.idents[0]), part(net.backup, Ob)];
    }
    var OA = O2 || O1; // the identity used for recon and the act
    if (O2) O2.fresh = true;
    if (Ob) Ob.fresh = true;

    // ---- operative calls home (innocent partner)
    var lover = null;
    if (R.chance(0.8)) {
      lover = mkPerson('innocent', R.chance(0.6) ? natOfCity(opHome) : O.nat, opHome, { sex: O.sex === 'm' ? 'f' : 'm', address: O.address });
      lover.innocentKind = 'partner'; W.innocents.push(lover);
      lover.phone = mkNumber(opHome);
      addPhone(lover.phone, { kind: 'flat', subscriber: lover.real, address: O.address, city: opHome, pid: lover.id });
      // the operative's own flat line is the one in her name
      delete W.phones[O.phone]; used.number[O.phone] = 1; O.phone = lover.phone; O.sharesPhone = true;
      if (lover.dob === O.dob) lover.dob = mkDob(1950, 1965);
    }

    // ---- items / acquisitions
    var itemsPlan = T.items.map(function (it) {
      var key = it[0], modes = it[1].slice();
      var I = DATA.ITEMS[key];
      var supRole = DATA.SUPPLIER_ROLE[I.cat];
      var mode;
      if (supRole && net[supRole] && modes.indexOf('supplier') >= 0) mode = 'supplier';
      else mode = R.pick(modes.filter(function (m) { return m !== 'supplier'; }).concat(modes.indexOf('supplier') >= 0 && !modes.filter(function (m) { return m !== 'supplier'; }).length ? ['purchase'] : []));
      if (!mode) mode = 'purchase';
      return { key: key, name: R.pick(I.names), mode: mode, supplier: mode === 'supplier' ? net[supRole] : null, method: I.method, cat: I.cat };
    });
    // every supplier specialist present must supply something
    ['armourer', 'chemist'].forEach(function (r) {
      if (!net[r]) return;
      if (itemsPlan.some(function (x) { return x.supplier === net[r]; })) return;
      var it = itemsPlan.filter(function (x) { return !x.supplier; })[0] || itemsPlan[1];
      it.mode = 'supplier'; it.supplier = net[r];
    });
    W.items = itemsPlan;
    var acqDays = [R.int(Math.max(forgeDay + 1, 0), D - 8), R.int(Math.max(forgeDay + 1, 1), D - 6)];
    var theftVehicle = null;
    function driverVehicle() { return W.rentalPlate || (net.driver && net.driver.car) || null; }
    var merchants = { optics: ['Optik Brenner KG', 'Foto-Optik Lindner', 'Jagd-Optik Steiner'], weapon: ['Feinmechanik Holzer', 'Dreherei Kogler'], device: ['Elektronik Rausch', 'Uhren-Bestandteile Moser', 'Modellbau Adler'], chemical: ['Laborbedarf Frei AG', 'Chemikalienhandel Wendt'], 'vehicle-work': ['Karosseriebau Pichler', 'Carrosserie Rochat', 'Autowerkstatt Kovač'], tools: ['Werkzeug-Verleih Brunner', 'Baumaschinen Gerber', 'Schlüsseldienst Eder'], explosive: ['Baustoffe Leitner'] };
    itemsPlan.forEach(function (it, i) {
      var d = acqDays[i];
      it.day = d;
      if (it.mode === 'supplier') {
        var S = it.supplier;
        var buyer = S.role === 'inside-man' ? O : (S.role === 'driver' ? S : O);
        var bIdent = buyer === O ? OA : buyer.idents[0];
        var t;
        if (buyer.homeCity !== S.homeCity && buyer === O) {
          t = remember(O, trip(O, OA, opHome, S.homeCity, d - 1, { nights: R.int(1, 2), phase: 'logistics', role: 'operative', paidBy: opTripPaid(OA) }));
          if (t.stay) { d = t.stay.to - 1; it.day = d; call(t.stay.from, { num: hotelLine(t.stay), p: O, ident: OA, stay: t.stay }, { num: S.shopPhone || S.phone, p: S, ident: S.idents[0] }); }
        }
        else if (busyAt(buyer, d, d + 1)) {
          // the buyer is away: the hand-over happens on the first day he is back home
          for (var dd = d + 1; dd < D - 3 && busyAt(buyer, dd, dd + 1); dd++);
          d = dd; it.day = d;
        }
        var acqTime = T_(10 * 60, 19 * 60);
        if (t && t.stay && d === t.stay.from) acqTime = Math.min(22 * 60, t.stay.time + R.int(60, 180));
        it.buyer = buyer; it.buyerName = bIdent.name;
        it.step = step('acquire', d, acqTime, 'logistics', { item: it.key, itemName: it.name, mode: 'supplier', city: S.homeCity, informant: R.chance(0.8), namesBuyer: R.chance(0.5) });
        it.step.parts = [part(buyer, bIdent, buyer.role), part(S, S.idents[0], S.role)];
        coPay(d + R.int(0, 1), S.account, { weapon: 12, optics: 4, chemical: 8, device: 5, explosive: 15, tools: 3, 'vehicle-work': 6 }[it.cat] * 1000, R.pick(DATA.ITEMS[it.key].ref).replace('{n}', R.num(4)), S, { item: it.key, purpose: 'supply' });
      } else if (it.mode === 'theft') {
        var thief = net.chemist && it.cat === 'chemical' ? net.chemist : (net.driver || O);
        var tIdent = thief === O ? OA : thief.idents[0];
        var plate = thief.car || null;
        it.buyer = thief; it.buyerName = tIdent.name;
        it.step = step('acquire', d, T_(22 * 60, 26 * 60) % 1440, 'logistics', { item: it.key, itemName: it.name, mode: 'theft', city: R.pick(W.cities), plate: plate, witnessName: plate ? null : tIdent.name, from: { explosive: R.pick(['a limestone quarry', 'a road-construction site', 'a quarry magazine']), chemical: R.pick(['a university chemistry institute', 'a veterinary practice', 'a hospital pharmacy', 'a pharmaceutical wholesaler']), tools: R.pick(['a construction site', 'a tool-hire depot']), device: 'an electronics wholesaler' }[it.cat] || 'a warehouse' });
        it.step.parts = [part(thief, tIdent, thief.role)];
        if (!plate) theftVehicle = it.step; // may be patched with the rental plate
      } else {
        var mc = R.pick(merchants[it.cat] || merchants.tools);
        var mcity = R.pick(W.cities);
        var mAcc = mkAccountNo(mcity);
        addAccount(mAcc, { holder: mc, holderKind: 'merchant', address: mkAddress(mcity), hub: true });
        it.buyer = null; it.merchant = mc;
        it.step = step('acquire', d, T_(10 * 60, 17 * 60), 'logistics', { item: it.key, itemName: it.name, mode: 'purchase', city: mcity, merchant: mc });
        it.step.parts = [part(coPayer, coPayer.idents[0], coPayer.role)];
        coPay(d, mAcc.no, { weapon: 3, optics: 3, chemical: 1, device: 2, explosive: 2, tools: 2, 'vehicle-work': 5 }[it.cat] * 1000, R.pick(DATA.ITEMS[it.key].ref).replace('{n}', R.num(4)), null, { item: it.key, purpose: 'purchase' });
      }
    });

    // ---- driver hires the vehicle
    var needVan = /bomb|abduction|burglary/.test(W.templateKey);
    var Dv = net.driver;
    if (Dv) {
      var hireDay = R.int(D - 8, D - 5);
      var hireCity = Dv.homeCity;
      var plate = mkPlate(hireCity);
      var agency = R.pick(city(hireCity).rental);
      var clerk = mkPerson('innocent', natOfCity(hireCity), hireCity, { occupation: 'Rental clerk, ' + agency });
      clerk.innocentKind = 'clerk'; W.innocents.push(clerk);
      var agencyOwner = agency + ' (fleet)';
      W.vehicles[plate] = { plate: plate, make: needVan ? R.pick(['Ford Transit', 'Mercedes 207 D', 'VW LT 28', 'Fiat Ducato']) : R.pick(['Opel Kadett', 'VW Golf', 'Ford Escort', 'Peugeot 309', 'Audi 80']), colour: R.pick(['white', 'dark blue', 'grey', 'red']), ownerKind: 'rental', owner: agencyOwner, ownerAddr: city(hireCity).station + ' branch, ' + city(hireCity).name, rentals: [] };
      W.rentalPlate = plate;
      var dep = Dr.links.indexOf('L5') >= 0 && Dv.account ? Dv.account : W.coverAccount;
      var hs = step('hire', hireDay, T_(8 * 60, 17 * 60), 'logistics', { plate: plate, agency: agency, city: hireCity, clerk: clerk.real, clerkPid: clerk.id, from: hireDay, to: D + 1, deposit: amt(1500), depositCur: DATA.COUNTRY[cc(hireCity)].cur, depositFrom: dep, licence: CX.pat('###### / ##', R) });
      hs.parts = [part(Dv, Dr, 'driver')];
      if (dep !== 'cash') {
        var agAcc = mkAccountNo(hireCity);
        addAccount(agAcc, { holder: agency, holderKind: 'merchant', address: city(hireCity).station + ' branch, ' + city(hireCity).name, hub: true });
        var dparts = dep === W.coverAccount ? [part(coPayer, coPayer.idents[0], coPayer.role), part(Dv, Dr, 'driver')] : [part(Dv, Dr, 'driver')];
        var ds = pay(hireDay, dep, agAcc.no, hs.deposit, 'Kaution ' + plate + ' / Vertrag ' + R.num(5), dparts, { purpose: 'deposit' });
        ds.cur = hs.depositCur;
      }
      if (theftVehicle && !theftVehicle.plate) {
        // theft happens after the hire when the driver is the thief: use the rental
        if (theftVehicle.day <= hireDay) theftVehicle.day = Math.min(D - 3, hireDay + R.int(1, 2));
        theftVehicle.plate = plate; theftVehicle.witnessName = null;
      }
      coPay(hireDay - R.int(1, 3), Dv.account, R.int(6, 10) * 1000, R.pick(['Fahrerhonorar', 'Transportauftrag ' + R.num(3), 'Überführung Fahrzeug']), Dv, { purpose: 'fee' });
    }
    if (theftVehicle && !theftVehicle.plate && !theftVehicle.witnessName) theftVehicle.witnessName = theftVehicle.parts[0].name;

    // ---- recon trip(s) to the act city
    var reconDay = R.int(D - 8, D - 5);
    var viewHotel = actVenue.overlookedBy;
    var useView = recon.indexOf('view-room') >= 0;
    var reconHotel = useView ? viewHotel : pickHotel(actCity, { noView: true });
    var tr = null;
    if (opHome !== actCity) tr = remember(O, trip(O, OA, opHome, actCity, reconDay, { nights: R.int(2, 3), hotel: reconHotel, phase: 'recon', role: 'operative', paidBy: opTripPaid(OA), hotelPaidBy: OA.links.indexOf('L5') >= 0 && O.account ? O.account : null, viewOf: useView ? actVenue.key : null }));
    else {
      var sOnly = step('stay', reconDay, T_(14 * 60, 20 * 60), 'recon', { hotel: reconHotel, from: reconDay, to: reconDay + 2, room: roomNo(reconHotel), note: 'Local address given.', viewOf: useView ? actVenue.key : null });
      sOnly.parts = [part(O, OA, 'operative')];
      tr = { stay: sOnly };
    }
    var reconStay = tr.stay;
    if (reconStay) reconDay = reconStay.from;
    W.reconStay = reconStay;
    if (lover && reconStay) call(reconDay, { num: hotelLine(reconStay), p: O, ident: OA, stay: reconStay }, { num: lover.phone, p: lover, ident: lover.idents[0] }, { phase: 'recon', dur: R.int(200, 900), time: T_(21 * 60, 23 * 60) });
    // hotel neighbour (innocent)
    if (R.chance(0.6) && reconStay) {
      var nbHomes = Object.keys(DATA.CITIES).filter(function (c) { return natOfCity(c) === OA.nat; });
      var nb = mkPerson('innocent', OA.nat, nbHomes.length ? R.pick(nbHomes) : anyCase(), { surname: R.pick(DATA.NAT[OA.nat].sur.filter(function (x) { return OA.name.indexOf(x) < 0; })) });
      nb.innocentKind = 'neighbour'; W.innocents.push(nb);
      var nr = String(parseInt(reconStay.room, 10) + (R.chance(0.5) ? 1 : -1));
      step('stay', reconDay, reconStay.time + R.int(-40, 40), 'recon', { hotel: reconStay.hotel, from: reconDay, to: reconDay + R.int(1, 3), room: nr, note: R.pick(DATA.FLAVOUR.innocentHotelNotes) }).parts = [part(nb, nb.idents[0], 'innocent')];
      if (R.chance(0.5)) givePersonalAccount(nb);
    }
    var reconSteps = [];
    recon.forEach(function (k, i) {
      var d = k === 'view-room' ? reconDay : reconDay + 1 + (i % 2);
      if (reconStay && d >= reconStay.to) d = reconStay.to - 1;
      var s;
      if (k === 'view-room') {
        s = step('recon', d, reconStay ? reconStay.time + 5 : T_(9 * 60, 11 * 60), 'recon', { rk: 'view-room', venue: actVenue.key, stay: reconStay ? reconStay.id : null });
        s.parts = [part(O, OA, 'operative')];
      } else if (k === 'photographs') {
        var who = net.lookout || O;
        var wIdent = who === O ? OA : Lk;
        var plate2 = who.car || (who === O ? null : null);
        s = step('recon', R.int(D - 7, D - 3), T_(9 * 60, 17 * 60), 'recon', { rk: 'photographs', venue: actVenue.key, plate: plate2, showedName: plate2 ? null : wIdent.name, showedPassport: plate2 ? null : wIdent.passport });
        s.parts = [part(who, wIdent, who.role)];
      } else if (k === 'buys-schedule') {
        var byNum = reconStay && R.chance(0.6) ? hotelLine(reconStay) : C1.phone;
        s = step('recon', d, T_(10 * 60, 16 * 60), 'recon', { rk: 'buys-schedule', venue: actVenue.key, subject: targetSubj.name, event: realEvent.id, asName: OA.name, asPaper: R.pick(['Neue Kronen-Revue', 'Wirtschafts-Kurier Ausland', 'Continental Press Agency', 'Europa-Dienst', 'Radio Adria']), byNum: byNum });
        s.parts = [part(O, OA, 'operative')];
      } else if (k === 'asks-porter') {
        var who2 = net.backup && R.chance(0.6) ? net.backup : O;
        var id2 = who2 === O ? OA : Ob;
        var subjHotel = pickHotel(actCity, {});
        var ps = null;
        if (who2 !== O) {
          if (who2.homeCity !== actCity) ps = trip(who2, id2, who2.homeCity, actCity, d - 1, { nights: 2, hotel: subjHotel, phase: 'recon', role: 'operative', note: 'Asked a great many questions for a man on a two-night stay.' }).stay;
          else { ps = step('stay', d - 1, T_(14 * 60, 20 * 60), 'recon', { hotel: subjHotel, from: d - 1, to: d + 1, room: roomNo(subjHotel), note: 'Local address given. Asked a great many questions for a man on a two-night stay.' }); ps.parts = [part(who2, id2, 'operative')]; }
        }
        s = step('recon', d, T_(8 * 60, 22 * 60), 'recon', { rk: 'asks-porter', venue: actVenue.key, subject: targetSubj.name, hotel: ps ? subjHotel : (reconStay ? reconStay.hotel : subjHotel), room: ps ? ps.room : (reconStay ? reconStay.room : null), asName: id2.name });
        s.parts = [part(who2, id2, 'operative')];
      }
      reconSteps.push(s);
    });
    W.reconSteps = reconSteps;
    // backup operative accompanies the recon
    if (net.backup && !reconSteps.some(function (s) { return s.parts[0].pid === net.backup.id; })) {
      var bh = net.backup.homeCity === actCity ? null : trip(net.backup, Ob, net.backup.homeCity, actCity, reconDay + 1, { nights: 1, phase: 'recon', role: 'operative' });
      var bs = step('recon', reconDay + 1, T_(10 * 60, 16 * 60), 'recon', { rk: 'asks-porter', venue: actVenue.key, subject: targetSubj.name, hotel: bh && bh.stay ? bh.stay.hotel : reconHotel, room: bh && bh.stay ? bh.stay.room : null, asName: Ob.name });
      bs.parts = [part(net.backup, Ob, 'operative')];
    }
    // inside-man: calls with the operative during the recon trip
    if (net['inside-man'] && reconStay) {
      var imP = net['inside-man'];
      call(reconDay, { num: hotelLine(reconStay), p: O, ident: OA, stay: reconStay }, { num: imP.phone, p: imP, ident: imP.idents[0] }, { phase: 'recon', dur: R.int(60, 240) });
      step('meet', reconDay + 1, T_(18 * 60, 22 * 60), 'recon', { place: R.pick(city(actCity).cafes) + ', ' + city(actCity).name, city: actCity }).parts = [part(O, OA), part(imP, imP.idents[0])];
      if (W.templateKey === 'burglary' || W.templateKey === 'poison') {
        var shiftS = step('inside', R.int(D - 6, D - 3), T_(8 * 60, 18 * 60), 'recon', { venue: actVenue.key, what: W.templateKey === 'burglary' ? 'swapped onto the night shift for ' + W.cal.nice(D) : 'asked to be put on the banquet rota for ' + W.cal.nice(D) });
        shiftS.parts = [part(imP, imP.idents[0], 'inside-man')];
      }
    }

    // ---- reservation for the act
    var actHotel = useView ? viewHotel : (reconStay ? reconStay.hotel : pickHotel(actCity, {}));
    var resvDay = reconStay ? reconStay.from + 1 : R.int(D - 6, D - 4);
    var resvByNum = R.chance(0.5) ? C1.phone : (reconStay ? hotelLine(reconStay) : C1.phone);
    var resv = step('resv', resvDay, T_(9 * 60, 19 * 60), 'recon', { hotel: actHotel, from: D - 1, to: D + 1, byNum: resvByNum, inPerson: !!(reconStay && reconStay.hotel === actHotel && resvByNum !== C1.phone), viewOf: useView ? actVenue.key : null, note: useView ? null : R.pick(['Quiet room requested.', 'Late arrival expected.', 'Garage space requested.']) });
    resv.parts = [part(O, OA, 'operative')];
    if (resvByNum === C1.phone) { resv.inPerson = false; resv.parts.push(part(C1, C1.idents[0])); call(resvDay, { num: C1.phone, p: C1, ident: C1.idents[0] }, { num: W.hotels[actHotel].phone }, { phase: 'recon', dur: R.int(60, 180), reservation: resv.id }); }
    W.actHotel = actHotel;

    // ---- courier cash runs
    if (net.courier) {
      var Cu = net.courier;
      var runs = R.int(1, 2);
      for (var ri = 0; ri < runs; ri++) {
        var rd = R.int(-5, D - 5);
        var dest = C1.homeCity !== Cu.homeCity ? C1.homeCity : (C2 && C2.homeCity !== Cu.homeCity ? C2.homeCity : actCity);
        if (dest === Cu.homeCity) dest = nonAct() === Cu.homeCity ? actCity : dest;
        var cur = DATA.COUNTRY[cc(dest)].cur;
        var ct = remember(Cu, trip(Cu, Cr, Cu.homeCity, dest, rd, { nights: 1, phase: 'logistics', role: 'courier', customs: { amount: amt(40000 * (fx[cur] || 1)), cur: cur }, pref: R.chance(0.5) ? 'air' : null, plate: Cu.car && Cr.links.indexOf('L4') >= 0 && landLink(Cu.homeCity, dest) && cc(Cu.homeCity) !== cc(dest) ? Cu.car : null }));
        if (ct.stay) call(rd, { num: hotelLine(ct.stay), p: Cu, ident: Cr, stay: ct.stay }, { num: C1.phone, p: C1, ident: C1.idents[0] }, { dur: R.int(30, 120) });
        if (ct.stay) rd = ct.stay.from;
        step('drop', rd + 1, T_(8 * 60, 20 * 60), 'logistics', { place: R.pick(city(dest).landmarks) + ', ' + city(dest).name, city: dest, content: 'cash' }).parts = [part(Cu, Cr, 'courier'), part(C1, c1Alias)];
        if (!ct.travel.route.domestic && !ct.travel.customs) ct.travel.customs = { amount: amt(40000), cur: cur };
      }
    }

    // ---- code call(s): intercepted
    var codeDayN = R.int(D - 5, D - 3);
    var opAtCode = null;
    // where is the operative on code day? use the latest stay covering it, else his home line
    (stays[O.id] || []).forEach(function (s) { if (s.from <= codeDayN && s.to > codeDayN) opAtCode = s; });
    var toO = opAtCode ? { num: hotelLine(opAtCode), p: O, ident: OA, stay: opAtCode } : { num: O.phone, p: O, ident: O.idents[0] };
    var lines = [];
    var wdName = CX.WEEKDAYS[W.cal.weekday(D)];
    if (codeDay) lines.push({ spk: 'A', text: R.pick(DATA.FLAVOUR.codePhrases.date).replace('{wd}', wdName), clue: { k: 'weekday', wd: W.cal.weekday(D) } });
    if (codeName) lines.push({ spk: 'A', text: R.pick(DATA.FLAVOUR.codePhrases.target).replace('{code}', targetSubj.trait.code), clue: { k: 'code', cat: targetSubj.trait.cat, code: targetSubj.trait.code } });
    lines.splice(R.int(0, lines.length), 0, { spk: 'B', text: R.pick(DATA.FLAVOUR.codePhrases.go) });
    lines.push({ spk: 'B', text: R.pick(DATA.FLAVOUR.codePhrases.noise) });
    var codeCall = call(codeDayN, { num: C1.phone, p: C1, ident: C1.idents[0] }, toO, { phase: 'rehearsal', dur: R.int(45, 110), intercept: { service: R.pick(['BfV', 'Staatspolizei', 'BuPo', 'DST', 'SISDE']), lines: lines, lag: 1 } });
    W.codeCall = codeCall;
    // an early intercept on the principal's line, often less informative
    var pc = W.steps.filter(function (s) { return s.kind === 'call' && s.fromNum === P.officePhone && s.day >= 0; })[0] || W.steps.filter(function (s) { return s.kind === 'call' && s.toNum === P.officePhone && s.day >= 0; })[0];
    if (pc && R.chance(0.6)) {
      var fromP = pc.fromNum === P.officePhone;
      pc.intercept = { service: R.pick(['BND', 'BfV', 'SIS liaison']), lag: 2, lines: fromP
        ? [{ spk: 'A', text: R.pick(['the bank has confirmed', 'the second instalment is on its way', 'our friends in the south are ready']) }, { spk: 'B', text: R.pick(['understood', 'then we can begin', 'good, the people here are asking']) }, { spk: 'A', text: R.pick(['do not use this number again', 'next time through the usual channel', 'I will call from the office']) }]
        : [{ spk: 'A', text: R.pick(['has the second instalment gone off', 'the people here want to know about the money', 'I need an answer about the bank']) }, { spk: 'B', text: R.pick(['it is on its way', 'you worry too much', 'not on this line']) }, { spk: 'A', text: R.pick(['then I will call from the usual place', 'I will tell them', 'my regards to your wife']) }] };
    }

    // ---- final approach
    var appDay = D - R.int(1, 2);
    var arriveIdent = OA;
    var companions = [];
    if (Dv && W.rentalPlate) {
      var vehCity = W.steps.filter(function (s) { return s.kind === 'hire'; })[0].city;
      if (vehCity !== actCity) {
        // driver drives the vehicle to the act city; operative rides along if from same city
        var comp = (opHome === vehCity) ? [{ p: O, ident: OA, role: 'operative' }] : [];
        if (net.lookout && net.lookout.homeCity === vehCity) comp.push({ p: net.lookout, ident: Lk, role: 'lookout' });
        var ap = trip(Dv, Dr, vehCity, actCity, appDay, { plate: W.rentalPlate, companions: comp, nights: D + 1 - appDay, phase: 'rehearsal', role: 'driver', hotel: comp.length ? actHotel : pickHotel(actCity, { noView: true }) });
        companions = comp;
        if (comp.length && ap.stay) {
          // O's reserved room: patch the stay created for companions to be the reserved room
          W.steps.forEach(function (s) { if (s.kind === 'stay' && s.day === appDay && s.parts[0].pid === O.id) { s.hotel = actHotel; s.from = D - 1 < appDay ? appDay : appDay; s.resv = resv.id; } });
        }
      } else {
        step('travel', appDay, T_(9 * 60, 18 * 60), 'rehearsal', { from: actCity, to: actCity, route: { mode: 'car', domestic: true }, plate: W.rentalPlate, local: true }).parts = [part(Dv, Dr, 'driver')];
      }
    }
    if (!companions.some(function (c) { return c.p === O; }) && opHome !== actCity) {
      var fa = trip(O, OA, opHome, actCity, D - 1, { nights: 2, hotel: actHotel, phase: 'rehearsal', role: 'operative', pref: 'air', paidBy: opTripPaid(OA) || (R.chance(0.5) ? W.coverCompany : 'cash'), bookedDay: resvDay });
      if (fa.stay) fa.stay.resv = resv.id;
    } else if (opHome === actCity) {
      var ls2 = step('stay', D - 1, T_(15 * 60, 21 * 60), 'rehearsal', { hotel: actHotel, from: D - 1, to: D + 1, room: reconStay ? reconStay.room : roomNo(actHotel), note: 'Arrived without luggage. Local address given.', resv: resv.id });
      ls2.parts = [part(O, OA, 'operative')];
    }
    // flight out booked in advance (visible in airline bookings)
    var outCity = opHome !== actCity ? opHome : nonAct();
    var rOut = route(actCity, outCity, 'air');
    if (rOut.mode === 'air') {
      var fo = step('booking', resvDay + R.int(0, 2), T_(10 * 60, 17 * 60), 'rehearsal', { route: rOut, flightDay: D + 1, paidBy: opTripPaid(OA) || (R.chance(0.5) ? 'cash' : W.coverCompany) });
      fo.parts = [part(O, OA, 'operative')];
    }
    // rehearsal: final meeting in the act city
    var fm = step('meet', D - 1, T_(19 * 60, 22 * 60), 'rehearsal', { place: R.pick(city(actCity).cafes) + ', ' + city(actCity).name, city: actCity });
    fm.parts = [part(O, OA)].concat(Dv ? [part(Dv, Dr)] : []).concat(net.lookout ? [part(net.lookout, Lk)] : []).concat(net['inside-man'] ? [part(net['inside-man'], net['inside-man'].idents[0])] : []);
    var finalStay = W.steps.filter(function (s) { return s.kind === 'stay' && s.parts[0].pid === O.id && s.hotel === actHotel && s.from <= D - 1 && s.to > D - 1; })[0] || null;
    W.finalStay = finalStay;
    call(D - 1, { num: W.hotels[actHotel].phone, p: O, ident: OA, stay: finalStay }, { num: C1.phone, p: C1, ident: C1.idents[0] }, { phase: 'rehearsal', dur: R.int(20, 60) });

    // ---- the vehicle is ticketed near the venue during the rehearsal
    if (Dv && W.rentalPlate) {
      var pk = step('parking', R.int(D - 5, D - 3), T_(8 * 60, 18 * 60), 'rehearsal', { plate: W.rentalPlate, venue: actVenue.key, street: R.pick(city(actCity).streets) });
      pk.parts = [part(Dv, Dr, 'driver')];
    }
    // the cover company's office line is used by the people who run it
    call(R.int(-6, 2), { num: (fin || C1).phone, p: fin || C1, ident: (fin || C1).idents[0] }, { num: W.coverPhone }, { phase: 'logistics', dur: R.int(60, 300) });
    if (fin) call(R.int(0, D - 5), { num: W.coverPhone, p: fin, ident: fin.idents[0] }, { num: C1.phone, p: C1, ident: C1.idents[0] }, { phase: 'logistics', dur: R.int(60, 300) });
    // some of the cutout's hotel bills go to the company
    W.steps.forEach(function (s) { if (s.kind === 'stay' && s.parts[0].pid === C1.id && !s.paidBy && R.chance(0.5)) s.paidBy = W.coverCompany; });

    // ---- the act
    var actors = [O].concat(Dv ? [Dv] : []).concat(net.lookout ? [net.lookout] : []).concat(net['inside-man'] ? [net['inside-man']] : []);
    var act = step('act', D, realEvent.time + R.int(-30, 30), 'act', { method: T.method, event: realEvent.id, venue: actVenue.key, target: targetSubj.name });
    act.parts = actors.map(function (p) { return part(p, p === O ? OA : p === Dv ? Dr : p === net.lookout ? Lk : p.idents[0]); });
    W.actStep = act;

    // ---- meetings happen where everybody actually is
    function locAt(pid, day) {
      var st = W.steps.filter(function (s) { return s.kind === 'stay' && s.parts[0].pid === pid && s.from <= day && day < s.to; })[0];
      return st ? W.hotels[st.hotel].city : W.P[pid].homeCity;
    }
    W.steps = W.steps.filter(function (s) {
      if (s.kind !== 'meet' || s.phase === 'rehearsal') return true;
      var ok = function (d) { return s.parts.every(function (x) { return locAt(x.pid, d) === s.city; }); };
      if (ok(s.day)) return true;
      var alt = [1, -1, 2, -2].map(function (k) { return s.day + k; }).filter(ok)[0];
      if (alt === undefined) return false;
      s.day = alt; return true;
    });

    // ---- identity-link realisation guarantees
    // L4 (own car under alias): ensure a car crossing exists
    W.network.forEach(function (p) {
      p.idents.forEach(function (a) {
        if (a.real || a.links.indexOf('L4') < 0 || !p.car) return;
        var usedA = W.steps.some(function (s) { return s.parts.some(function (x) { return x.name === a.name; }); });
        if (!usedA) { a.links = a.links.filter(function (l) { return l !== 'L4'; }); return; }
        var has4 = W.steps.some(function (s) { return s.kind === 'travel' && s.plate === p.car && s.parts[0].name === a.name && !s.route.domestic; });
        if (!has4) {
          var dest = W.cities.filter(function (c) { return c !== p.homeCity && landLink(c, p.homeCity) && cc(c) !== cc(p.homeCity); })[0];
          if (dest) {
            var d4 = R.int(-6, D - 5);
            var t4 = trip(p, a, p.homeCity, dest, d4, { plate: p.car, nights: 1, role: p.role, phase: 'logistics' });
            trip(p, a, dest, p.homeCity, d4 + 1, { plate: p.car, noStay: true, role: p.role, bookedDay: d4 });
            var hnd = p.role === 'cutout' ? P : handlerOf(p);
            if (t4.stay) call(d4, { num: hotelLine(t4.stay), p: p, ident: a, stay: t4.stay }, { num: hnd === P ? P.officePhone : hnd.phone, p: hnd, ident: hnd.idents[0] }, { phase: 'logistics' });
          }
          else a.links = a.links.filter(function (l) { return l !== 'L4'; });
        }
      });
    });
    // L5 (own account pays): ensure some paid item exists for that alias
    W.network.forEach(function (p) {
      p.idents.forEach(function (a) {
        if (a.real || a.links.indexOf('L5') < 0 || !p.account) return;
        var has5 = W.steps.some(function (s) { return (s.paidBy === p.account || s.depositFrom === p.account) && s.parts[0].name === a.name; });
        if (!has5) {
          var tt = W.steps.filter(function (s) { return s.kind === 'travel' && s.parts[0].name === a.name && s.route.mode === 'air'; })[0];
          if (tt) tt.paidBy = p.account;
          else {
            var st2 = W.steps.filter(function (s) { return s.kind === 'stay' && s.parts[0].name === a.name; })[0];
            if (st2) st2.paidBy = p.account; else a.links = a.links.filter(function (l) { return l !== 'L5'; });
          }
        }
      });
    });

    // ---- final realisation check: every alias used must be connected to the
    // real identity through leaks that actually appear in records
    W.network.forEach(function (p) {
      var als = p.idents.filter(function (x) { return !x.real; });
      if (!als.length) return;
      function usedIn(name, kinds) { return W.steps.some(function (s) { return kinds.indexOf(s.kind) >= 0 && s.parts.some(function (x) { return x.name === name && (s.kind !== 'travel' || !s.route.domestic || x === s.parts[0]); }); }); }
      function passportUse(name) { return W.steps.some(function (s) { return (s.kind === 'stay' || s.kind === 'hire' || (s.kind === 'travel' && !s.route.domestic)) && s.parts.some(function (x) { return x.name === name; }); }); }
      var real = {};
      als.forEach(function (a) {
        a.links = a.links.filter(function (l) {
          if (l === 'L2') return usedIn(a.name, ['stay', 'hire']);
          if (l === 'L1') { var prev = als.filter(function (b) { return b !== a && b.passport === a.passport; })[0]; return !!prev && passportUse(a.name) && passportUse(prev.name); }
          return true;
        });
        if (a.links.some(function (l) { return l !== 'L1'; })) real[a.name] = true;
      });
      // propagate through L1 pairs
      for (var it = 0; it < 3; it++) als.forEach(function (a) { if (a.links.indexOf('L1') >= 0) als.forEach(function (b) { if (b !== a && b.passport === a.passport && (real[b.name] || real[a.name])) { real[a.name] = real[b.name] = true; } }); });
      als.forEach(function (a) {
        if (real[a.name]) return;
        var used = W.steps.some(function (s) { return s.parts.some(function (x) { return x.name === a.name; }); });
        if (!used) return;
        // a freshly forged identity: the forger recycled the number of an earlier passport
        var prevA = als.filter(function (b) { return b !== a && real[b.name] && passportUse(b.name); })[0];
        if (a.fresh && prevA && passportUse(a.name)) { a.passport = prevA.passport; a.links.push('L1'); real[a.name] = true; return; }
        // a slip on a registration form: real home address and date of birth
        if ((a.fresh || R.chance(0.5)) && usedIn(a.name, ['stay', 'hire'])) { a.home = p.address; a.dob = p.dob; a.links.push('L2'); real[a.name] = true; return; }
        // fall back to an archive card that lists this alias
        if (!p.card) p.card = { summary: { operative: 'Believed to have used several identities in the Middle East and Central Europe.', cutout: 'Commercial traveller; cross-referenced from a 1986 enquiry into travel documents.', driver: 'Cross-referenced from a customs enquiry into rental cars taken abroad.', courier: 'Cash courier; cross-referenced from customs declarations.' }[p.role] || 'Cross-referenced from an earlier enquiry.', aliases: [], associates: [], photo: R.chance(0.5) };
        if (p.card.aliases.indexOf(a.name) < 0) p.card.aliases.push(a.name);
        a.links.push('L3');
        real[a.name] = true;
      });
    });

    // ------------------------------------------------------------ herrings
    var goods = R.pick(DATA.FLAVOUR.herringGoods);
    W.herringGoods = goods;
    var hN = R.int(2, 3);
    var hCities = R.shuffle(W.cities);
    var ring = [];
    for (var hi = 0; hi < hN; hi++) {
      var hc = hCities[hi % hCities.length];
      var hp = mkPerson('herring', natOfCity(hc), hc);
      giveFlatPhone(hp); givePersonalAccount(hp); if (R.chance(0.6)) giveCar(hp);
      hp.card = { summary: 'Known smuggler (' + goods.d + '). ' + R.pick(['Two convictions, both fines.', 'Customs file open since 1986.', 'Informant reports him "harmless but busy".', 'Acquitted 1987 for lack of evidence.']), aliases: [], associates: [], photo: R.chance(0.7) };
      ring.push(hp); W.herrings.push(hp);
    }
    ring.forEach(function (h, i) { if (i > 0) h.card.associates.push(ring[0].real); else h.card.associates = ring.slice(1).map(function (x) { return x.real; }); });
    // herring travel & business
    ring.forEach(function (h, i) {
      var dest = ring[(i + 1) % ring.length].homeCity;
      if (dest === h.homeCity) dest = R.pick(W.cities.filter(function (c) { return c !== h.homeCity; }));
      var hd = R.int(-6, D - 3);
      var ht = trip(h, h.idents[0], h.homeCity, dest, hd, { nights: R.int(1, 2), role: 'herring', phase: 'herring', plate: h.car && landLink(h.homeCity, dest) && cc(h.homeCity) !== cc(dest) ? h.car : null });
      if (ht.stay) call(hd, { num: hotelLine(ht.stay), p: h, ident: h.idents[0], stay: ht.stay }, { num: ring[(i + 1) % ring.length].phone, p: ring[(i + 1) % ring.length], ident: ring[(i + 1) % ring.length].idents[0] }, { phase: 'herring' });
      if (i === 0) {
        call(R.int(0, D - 4), { num: h.phone, p: h, ident: h.idents[0] }, { num: ring[1].phone, p: ring[1], ident: ring[1].idents[0] }, { phase: 'herring', intercept: { service: R.pick(['BfV', 'Staatspolizei', 'Zollfahndung']), lines: [{ spk: 'A', text: goods.code + ' arrive ' + CX.WEEKDAYS[R.int(0, 6)] }, { spk: 'B', text: 'same place as last time?' }, { spk: 'A', text: R.pick(['not on the phone', 'the usual price', 'bring the van, not the car']) }], lag: 1 } });
        var hp2 = pay(R.int(-4, D - 4), h.account, ring[1].account, amt(8000), R.pick([goods.ref.replace('{n}', R.num(4)), 'Darlehen', 'Rückzahlung']), [part(h, h.idents[0], 'herring'), part(ring[1], ring[1].idents[0], 'herring')], { phase: 'herring' });
        hp2.cur = curOf(h.account);
      }
    });
    step('seizure', R.int(0, D - 4), T_(6 * 60, 23 * 60), 'herring', { goods: goods, city: ring[1].homeCity, plate: ring[1].car || null }).parts = [part(ring[1], ring[1].idents[0], 'herring')];

    // tempting false link 1: same surname, same hotel, overlapping night
    var bait = OA;
    var baitStay = reconStay && reconStay.parts[0].name === OA.name ? reconStay : W.steps.filter(function (s) { return s.kind === 'stay' && s.parts[0].name === bait.name; })[0];
    if (!baitStay) { bait = c1Alias; baitStay = W.steps.filter(function (s) { return s.kind === 'stay' && s.parts[0].name === c1Alias.name; })[0]; }
    if (baitStay) {
      var surname = bait.name.split(' ').slice(1).join(' ');
      var hs0 = ring[0];
      var twin = mkPerson('herring', bait.nat, R.pick(W.cities), { surname: surname.replace(/ová$|á$/, ''), sex: 'm' });
      giveFlatPhone(twin);
      twin.card = { summary: 'Courier for ' + hs0.real + ' (' + goods.d + '). ' + R.pick(['Lives on commission and nerves.', 'One conviction, suspended.']), aliases: [], associates: [hs0.real], photo: false };
      W.herrings.push(twin);
      var tw = step('stay', baitStay.from, Math.min(23 * 60 + 50, baitStay.time + R.int(60, 300)), 'herring', { hotel: baitStay.hotel, from: baitStay.from, to: baitStay.from + 1, room: roomNo(baitStay.hotel), note: R.pick(DATA.FLAVOUR.hotelNotes) });
      tw.parts = [part(twin, twin.idents[0], 'herring')];
      call(baitStay.from, { num: W.hotels[baitStay.hotel].phone, p: twin, ident: twin.idents[0], stay: tw }, { num: hs0.phone, p: hs0, ident: hs0.idents[0] }, { phase: 'herring' });
      while (twin.dob === bait.dob || twin.idents[0].dob === bait.dob) { twin.dob = mkDob(1935, 1965); twin.idents[0].dob = twin.dob; }
      W.herringLinks.push({ type: 'surname', herring: twin.real, herringPid: twin.id, bait: bait.name, baitPid: bait.pid, hotel: baitStay.hotel, night: baitStay.from, stayId: tw.id });
    }
    // tempting false link 2: similar company name at the same bank / or wrong informant
    if (R.chance(0.5)) {
      var cov = W.companies[W.coverCompany];
      var hCo = cov.name.replace(/^(\S+)/, function (m) { return m; }).replace(/Import-Export|Handels|Maschinen-Handel|Consulting|Transport|Trading|Technik-Vertrieb/, function (m) { return R.pick(['Handel', 'Export', 'Spedition', 'Warenhandel', 'Vertrieb'].filter(function (x) { return x !== m; })); });
      if (!used.company[hCo]) {
        used.company[hCo] = 1;
        var bankIdx = DATA.CITIES[cov.city].banks.map(function (b) { return b.n; }).indexOf(W.accounts[W.coverAccount].bank);
        var hAcc = mkAccountNo(cov.city, bankIdx);
        var owner = ring[0];
        addAccount(hAcc, { holder: hCo, holderKind: 'company', address: mkAddress(cov.city), signatory: owner.real, company: hCo, pid: owner.id });
        W.companies[hCo] = { name: hCo, city: cov.city, address: W.accounts[hAcc.no].address, regNo: regNo(cov.city), founded: -R.int(300, 3000), directors: [owner.real], accounts: [hAcc.no], notes: 'Trade in ' + goods.d.replace(/^(untaxed|smuggled|black-market) /, '') + ' (declared object: "general trading").', pids: [owner.id] };
        var hp3 = pay(R.int(-3, D - 4), hAcc.no, owner.account, amt(6000), 'Privatentnahme', [part(owner, owner.idents[0], 'herring')], { phase: 'herring' }); hp3.cur = curOf(hAcc.no);
        W.herringLinks.push({ type: 'company', herring: owner.real, herringPid: owner.id, company: hCo, bait: W.coverCompany });
      }
    } else {
      var wrongTarget = ring[R.int(0, ring.length - 1)];
      while (wrongTarget.dob === c1Alias.dob) { wrongTarget.dob = mkDob(1935, 1965); wrongTarget.idents[0].dob = wrongTarget.dob; }
      W.herringLinks.push({ type: 'informant', herring: wrongTarget.real, herringPid: wrongTarget.id, bait: c1Alias.name, day: R.int(2, D - 4) });
    }

    // ---- tip seeds (not the operative, not the principal)
    var tipKinds = [];
    tipKinds.push(['cutout-alias', 3]);
    tipKinds.push(['cutout-phone', 2]);
    if (net.courier) tipKinds.push(['courier', 2]);
    if (net.forger) tipKinds.push(['forger', 1]);
    W.tipKind = R.weighted(tipKinds);
    W.aliases = { c1: c1Alias, c2: c2Alias, O1: O1, O2: O2, OA: OA, Ob: Ob, Dr: Dr, Cr: Cr, Lk: Lk, Ch: Ch, principal: principalAlias };
    W.clueCall = codeCall;
    W.lover = lover; W.nominee = nominee;
    W.innocents.forEach(function (p) { if (!p.phone && R.chance(0.3)) giveFlatPhone(p); });

    // sort steps chronologically (ids stay stable)
    W.steps.sort(function (a, b) { return a.day - b.day || a.time - b.time; });
    W.byStep = {}; W.steps.forEach(function (s) { W.byStep[s.id] = s; });
    return W;
  };
})();
