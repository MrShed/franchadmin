/* CUTOUT engine — 07-solver.js
 * A headless "ideal analyst". It starts from the tip and the morning traffic,
 * and each day pulls the keys it holds, choosing greedily the query that
 * returns the most new case material per team-hour (an oracle chooses WHICH
 * held key to pull; every conclusion is derived from document contents only).
 *
 * From the documents it derives:
 *  - alias equivalences (union-find over shared passport / dob+address /
 *    archive alias lists / own car / own account),
 *  - the suspect set (association graph from the tip: calls, payments,
 *    companions, rentals, company directors...),
 *  - roles (from participation patterns), method (from acquisitions),
 *  - target/place/date (recon + reservations + schedules + code words).
 * A case is accepted iff by the end of day D-2 all network aliases are linked,
 * the plot is unique among the scheduled events (and needs >= 2 clues), and
 * warrants can be built for the operative + 2 others.
 *
 * CX.newCase(seed, opts) -> verified Case (retries generation attempts)
 * CX.solveWorld(W) -> report
 */
var CX = (typeof CX !== 'undefined' && CX) ? CX : {};

(function () {
  'use strict';
  var DATA = CX.DATA;

  // ------------------------------------------------------------ union-find
  function UF() { this.p = {}; }
  UF.prototype.find = function (x) { var p = this.p; if (p[x] === undefined) p[x] = x; while (p[x] !== x) { p[x] = p[p[x]]; x = p[x]; } return x; };
  UF.prototype.union = function (a, b) { var x = this.find(a), y = this.find(b); if (x !== y) this.p[x] = y; };

  // item refs -> item key (what a reader infers from a bank reference)
  var REF_RX = [];
  Object.keys(DATA.ITEMS).forEach(function (k) {
    DATA.ITEMS[k].ref.forEach(function (r) { REF_RX.push([new RegExp('^' + r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\{n\\}', '\\d+') + '$'), k]); });
  });
  function refItem(ref) {
    for (var i = 0; i < REF_RX.length; i++) if (REF_RX[i][0].test(ref)) return REF_RX[i][1];
    if (/^(Satzarbeiten|Druckkosten|Lithographie)/.test(ref)) return 'print';
    if (/^(Fahrerhonorar|Transportauftrag|Überführung)/.test(ref)) return 'drive';
    return null;
  }
  CX.refItem = refItem;

  // ------------------------------------------------------------ knowledge
  function K0() {
    return { docsDone: 0, names: {}, passports: {}, dobAddr: {}, cards: [], owner: {}, drivers: {}, payFor: {}, acct: {}, tx: [], lines: {}, calls: [],
      edges: [], stays: [], resv: [], crosses: [], rentals: [], police: [], press: [], porter: [], informants: [], intercepts: [], news: [], residents: [], seeds: [], companies: [], hubAcc: {} };
  }
  function addTo(map, k, v) { (map[k] = map[k] || {})[v] = true; }
  function absorb(K, docs) {
    docs.forEach(function (doc) {
      (doc.recs || []).forEach(function (r) { absorbRec(K, r, doc); });
      doc.tokens.forEach(function (t) { if (t.t === 'name') K.names[t.v] = 1; });
      if (doc.kind === 'tip') doc.tokens.forEach(function (t) { if (t.t === 'name') K.seeds.push('N:' + t.v); else if (t.t === 'number') K.seeds.push('T:' + t.v); else if (t.t === 'plate') K.seeds.push('P:' + t.v); });
    });
  }
  function E(K, a, b) { K.edges.push([a, b]); }
  function absorbRec(K, r) {
    switch (r.r) {
      case 'stay':
        K.names[r.name] = 1; addTo(K.passports, r.passport, r.name); addTo(K.dobAddr, r.dob + '|' + r.home, r.name);
        K.stays.push(r);
        (r.calls || []).forEach(function (c) { E(K, 'N:' + r.name, 'T:' + c.to); });
        if (r.paidAcc) addTo(K.payFor, r.paidAcc, r.name);
        if (r.paidCo) E(K, 'N:' + r.name, 'C:' + r.paidCo);
        break;
      case 'resv': K.names[r.name] = 1; K.resv.push(r); if (r.byNum) E(K, 'N:' + r.name, 'T:' + r.byNum); break;
      case 'cross':
        K.names[r.name] = 1; addTo(K.passports, r.passport, r.name); K.crosses.push(r);
        if (r.plate) { E(K, 'N:' + r.name, 'P:' + r.plate); if (r.role === 'driver') addTo(K.drivers, r.plate, r.name); }
        (r.companions || []).forEach(function (c) { E(K, 'N:' + r.name, 'N:' + c); });
        break;
      case 'pax':
        K.names[r.name] = 1;
        if (r.paidAcc) { addTo(K.payFor, r.paidAcc, r.name); E(K, 'N:' + r.name, 'A:' + r.paidAcc); }
        if (r.paidCo) E(K, 'N:' + r.name, 'C:' + r.paidCo);
        break;
      case 'line':
        K.lines[r.number] = r;
        if (r.kind === 'flat') E(K, 'T:' + r.number, 'N:' + r.subscriber);
        else if (r.kind === 'office') E(K, 'T:' + r.number, 'C:' + r.subscriber);
        break;
      case 'call': K.calls.push(r); break;
      case 'acct':
        K.acct[r.account] = r;
        if (!r._hub && r.holderKind !== 'utility' && r.holderKind !== 'merchant') {
          E(K, 'A:' + r.account, r.holderKind === 'personal' ? 'N:' + r.holder : 'C:' + (r.company || r.holder));
          if (r.signatory) E(K, 'A:' + r.account, 'N:' + r.signatory);
        }
        break;
      case 'tx':
        K.tx.push(r);
        if (r.fromKind === 'utility' || r.fromKind === 'merchant') K.hubAcc[r.from] = 1;
        if (r.toKind === 'utility' || r.toKind === 'merchant') K.hubAcc[r.to] = 1;
        if (r.plate) E(K, 'A:' + r.from, 'P:' + r.plate);
        break;
      case 'veh': if (r.ownerKind === 'private') { K.owner[r.plate] = r.owner; E(K, 'P:' + r.plate, 'N:' + r.owner); } break;
      case 'rental':
        K.names[r.renter] = 1; K.rentals.push(r); addTo(K.passports, r.passport, r.renter); addTo(K.dobAddr, r.dob + '|' + r.home, r.renter);
        E(K, 'P:' + r.plate, 'N:' + r.renter);
        if (r.depositFrom && r.depositFrom !== 'cash') { E(K, 'N:' + r.renter, 'A:' + r.depositFrom); addTo(K.payFor, r.depositFrom, r.renter); }
        break;
      case 'res':
        K.names[r.name] = 1; K.residents.push(r);
        addTo(K.dobAddr, r.dob + '|' + r.address, r.name); if (r.prev) addTo(K.dobAddr, r.dob + '|' + r.prev, r.name);
        E(K, 'N:' + r.name, 'D:' + r.address);
        if (r.employer) E(K, 'N:' + r.name, 'C:' + r.employer);
        break;
      case 'co':
        K.companies.push(r);
        r.directors.forEach(function (d) { E(K, 'C:' + r.company, 'N:' + d); });
        r.accounts.forEach(function (a) { E(K, 'C:' + r.company, 'A:' + a); });
        break;
      case 'card':
        K.cards.push(r);
        r.associates.forEach(function (a) { E(K, 'N:' + r.name, 'N:' + a); });
        break;
      case 'intercept': K.intercepts.push(r); E(K, 'T:' + r.from, 'T:' + r.to); break;
      case 'police':
        K.police.push(r);
        if (r.kind === 'photo' && r.passport) addTo(K.passports, r.passport, r.name);
        break;
      case 'press': K.press.push(r); E(K, 'N:' + r.name, 'T:' + r.number); break;
      case 'porter': K.porter.push(r); break;
      case 'informant':
        K.informants.push(r);
        if (r.kind === 'supply' && r.buyer) E(K, 'N:' + r.supplier, 'N:' + r.buyer);
        break;
      case 'news': r.items.forEach(function (it) { K.news.push(it); }); break;
    }
  }

  // ------------------------------------------------------------ derivation
  function derive(K, cal) {
    var uf = new UF();
    Object.keys(K.passports).forEach(function (p) { var n = Object.keys(K.passports[p]); for (var i = 1; i < n.length; i++) uf.union(n[0], n[i]); });
    Object.keys(K.dobAddr).forEach(function (p) { var n = Object.keys(K.dobAddr[p]); for (var i = 1; i < n.length; i++) uf.union(n[0], n[i]); });
    K.cards.forEach(function (c) { c.aliases.forEach(function (a) { uf.union(c.name, a); }); });
    Object.keys(K.drivers).forEach(function (pl) { if (K.owner[pl]) Object.keys(K.drivers[pl]).forEach(function (d) { uf.union(K.owner[pl], d); }); });
    Object.keys(K.payFor).forEach(function (a) { var ac = K.acct[a]; if (ac && ac.holderKind === 'personal') Object.keys(K.payFor[a]).forEach(function (n) { uf.union(ac.holder, n); }); });

    // hubs known now
    function hubNum(n) { var l = K.lines[n]; return l && (l.kind === 'hotel' || l.kind === 'business'); }
    function hubAcc(a) { var ac = K.acct[a]; if (ac) return ac.holderKind === 'utility' || ac.holderKind === 'merchant'; return !!K.hubAcc[a]; }
    // graph
    var adj = {};
    function link(a, b) { (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); }
    function node(x) { return x.charAt(0) === 'N' ? 'N:' + uf.find(x.slice(2)) : x; }
    K.edges.forEach(function (e) { link(node(e[0]), node(e[1])); });
    K.calls.forEach(function (c) { if (!hubNum(c.from) && !hubNum(c.to)) link('T:' + c.from, 'T:' + c.to); });
    K.tx.forEach(function (t) { if (!hubAcc(t.from) && !hubAcc(t.to)) link('A:' + t.from, 'A:' + t.to); });
    var sus = {}, q = [];
    K.seeds.forEach(function (s) { var n = node(s); if (!sus[n]) { sus[n] = 1; q.push(n); } });
    while (q.length) {
      var x = q.shift();
      if ((x.charAt(0) === 'T' && hubNum(x.slice(2))) || (x.charAt(0) === 'A' && hubAcc(x.slice(2)))) continue;
      (adj[x] || []).forEach(function (y) { if (!sus[y]) { sus[y] = 1; q.push(y); } });
    }
    function isSus(tok) { return !!sus[node(tok)]; }
    function comp(name) { return uf.find(name); }

    // ---- roles
    var roles = {}; // comp -> {role: strength}
    function vote(name, role) { if (!name || !isSus('N:' + name)) return; var c = comp(name); (roles[c] = roles[c] || {})[role] = true; }
    // money: root and intermediate accounts
    var inc = {}, outg = {};
    K.tx.forEach(function (t) { if (hubAcc(t.from) || hubAcc(t.to)) return; (outg[t.from] = outg[t.from] || []).push(t); (inc[t.to] = inc[t.to] || []).push(t); });
    var principalComp = null, rootAcc = null;
    Object.keys(K.acct).forEach(function (a) {
      var ac = K.acct[a]; if (hubAcc(a) || !isSus('A:' + a)) return;
      if ((outg[a] || []).length && !(inc[a] || []).length) {
        var who = ac.signatory || (ac.holderKind === 'personal' ? ac.holder : null);
        if (who) { principalComp = comp(who); rootAcc = a; vote(who, 'principal'); }
      }
    });
    if (rootAcc) {
      (outg[rootAcc] || []).forEach(function (t) {
        var ac = K.acct[t.to]; if (!ac || ac.holderKind !== 'company') return;
        if ((outg[t.to] || []).length && ac.signatory && comp(ac.signatory) !== principalComp) vote(ac.signatory, 'financier?');
      });
    }
    // principal's numbers -> cutouts
    var pNums = {};
    Object.keys(K.lines).forEach(function (n) {
      var l = K.lines[n];
      if (l.kind === 'flat' && principalComp && comp(l.subscriber) === principalComp) pNums[n] = 1;
      if (l.kind === 'office' && rootAcc && K.acct[rootAcc].company === l.subscriber) pNums[n] = 1;
    });
    function usersOf(num) {
      var u = [];
      var l = K.lines[num]; if (l && l.kind === 'flat') u.push(l.subscriber);
      return u;
    }
    K.calls.forEach(function (c) {
      if (pNums[c.from]) usersOf(c.to).forEach(function (n) { vote(n, 'cutout'); });
      if (pNums[c.to]) usersOf(c.from).forEach(function (n) { vote(n, 'cutout'); });
    });
    K.stays.forEach(function (s) { (s.calls || []).forEach(function (c) { if (pNums[c.to]) vote(s.name, 'cutout'); }); });
    K.intercepts.forEach(function (ic) { if (pNums[ic.from]) usersOf(ic.to).forEach(function (n) { vote(n, 'cutout'); }); if (pNums[ic.to]) usersOf(ic.from).forEach(function (n) { vote(n, 'cutout'); }); });
    // payments by reference
    var itemsFound = [];
    K.tx.forEach(function (t) {
      var it = refItem(t.ref); if (!it) return;
      if (!isSus('A:' + t.from)) return;
      var ac = K.acct[t.to];
      if (it !== 'print' && it !== 'drive') itemsFound.push({ item: it, how: 'bank' });
      if (!ac || ac.holderKind !== 'personal') return;
      var cat = DATA.ITEMS[it] ? DATA.ITEMS[it].cat : it;
      var role = { weapon: 'armourer', optics: 'armourer', explosive: 'armourer', chemical: 'chemist', device: 'chemist', tools: 'inside-man', 'vehicle-work': 'driver', print: 'forger', drive: 'driver' }[cat];
      if (role) vote(ac.holder, role);
    });
    K.informants.forEach(function (r) {
      if (r.kind !== 'supply') return;
      if (!isSus('N:' + r.supplier) && !(r.buyer && isSus('N:' + r.buyer))) return;
      itemsFound.push({ item: r.item, how: 'informant' });
      vote(r.supplier, { weapon: 'armourer', optics: 'armourer', explosive: 'armourer', chemical: 'chemist', device: 'chemist', tools: 'inside-man', 'vehicle-work': 'driver' }[r.itemCat]);
      if (r.buyer) vote(r.buyer, 'operative');
    });
    K.police.forEach(function (r) {
      if (r.kind === 'theft' && r.method) { if ((r.plate && isSus('P:' + r.plate)) || (r.name && isSus('N:' + r.name))) itemsFound.push({ item: r.item, how: 'theft' }); }
    });
    K.cards.forEach(function (c) { if (/forger/.test(c.summary)) vote(c.name, 'forger'); });
    K.rentals.forEach(function (r) { vote(r.renter, 'driver'); });
    K.crosses.forEach(function (r) { if (r.customs) vote(r.name, 'courier'); });
    var venueNames = {}; K.news.forEach(function (it) { venueNames[it.venue.slice(0, it.venue.lastIndexOf(', '))] = true; });
    K.residents.forEach(function (r) { if (r.employer && venueNames[r.employer]) vote(r.name, 'inside-man'); });

    // ---- plot clues
    var clues = [];
    function clue(c, anchors) { if (anchors.some(function (a) { return a && isSus(a); })) clues.push(c); }
    K.stays.forEach(function (s) { if (s.viewOf) { clue({ k: 'venue', venue: s.viewOf }, ['N:' + s.name]); vote(s.name, 'operative'); } });
    K.resv.forEach(function (r) {
      clue({ k: 'window', city: r.city, from: r.from, to: r.to }, ['N:' + r.name]);
      if (r.viewOf) clue({ k: 'venue', venue: r.viewOf }, ['N:' + r.name]);
    });
    K.police.forEach(function (r) {
      if (r.kind === 'parking') { clue({ k: 'venue', venue: r.venue }, ['P:' + r.plate]); return; }
      if (r.kind !== 'photo') return;
      var anchors = [r.plate ? 'P:' + r.plate : null, r.name ? 'N:' + r.name : null];
      clue({ k: 'venue', venue: r.venue }, anchors);
      if (r.name) vote(r.name, 'lookout?');
      if (r.plate) {
        if (K.owner[r.plate]) vote(K.owner[r.plate], 'lookout?');
        K.rentals.forEach(function (x) { if (x.plate === r.plate) vote(x.renter, 'lookout?'); });
      }
    });
    K.press.forEach(function (r) { clue({ k: 'subject', subject: r.subject }, ['N:' + r.name, 'T:' + r.number]); vote(r.name, 'operative'); });
    K.porter.forEach(function (r) { clue({ k: 'subject', subject: r.subject }, ['N:' + r.name]); vote(r.name, 'operative'); });
    K.intercepts.forEach(function (ic) {
      ic.lines.forEach(function (l) { if (l.clue) clue(l.clue.k === 'code' ? { k: 'code', cat: l.clue.cat } : l.clue, ['T:' + ic.from, 'T:' + ic.to]); });
    });

    // resolve roles per component
    var PRIO = ['principal', 'cutout', 'financier?', 'armourer', 'forger', 'chemist', 'inside-man', 'driver', 'operative', 'courier', 'lookout?'];
    var compRole = {};
    Object.keys(roles).forEach(function (c) {
      var r = roles[c];
      for (var i = 0; i < PRIO.length; i++) if (r[PRIO[i]]) { compRole[c] = PRIO[i].replace('?', ''); break; }
    });

    // method
    var methods = {};
    itemsFound.forEach(function (f) { var I = DATA.ITEMS[f.item]; if (I && I.method) methods[I.method] = true; });
    var mlist = Object.keys(methods);

    // events
    var evs = {}; K.news.forEach(function (it) { evs[it.event] = it; });
    var evList = Object.keys(evs).map(function (k) { return evs[k]; });
    function match(ev, c) {
      switch (c.k) {
        case 'venue': return ev.venue === c.venue;
        case 'window': return ev.city === c.city && ev.day >= c.from && ev.day <= c.to;
        case 'weekday': return cal.weekday(ev.day) === c.wd;
        case 'code': return ev.traitCat === c.cat;
        case 'subject': return ev.subject === c.subject;
      }
      return true;
    }
    // dedupe clues
    var cseen = {}; clues = clues.filter(function (c) { var k = JSON.stringify(c); if (cseen[k]) return false; cseen[k] = 1; return true; });
    var surv = evList.filter(function (ev) { return clues.every(function (c) { return match(ev, c); }); });
    // minimal number of clues needed
    var minClues = null;
    if (surv.length === 1 && clues.length) {
      for (var size = 1; size <= clues.length && minClues === null; size++) {
        (function rec(start, chosen) {
          if (minClues !== null) return;
          if (chosen.length === size) {
            var s2 = evList.filter(function (ev) { return chosen.every(function (c) { return match(ev, c); }); });
            if (s2.length === 1) minClues = size;
            return;
          }
          for (var i = start; i < clues.length; i++) rec(i + 1, chosen.concat([clues[i]]));
        })(0, []);
      }
    }
    return { uf: uf, sus: sus, isSus: isSus, compRole: compRole, methods: mlist, events: evList, clues: clues, surv: surv, minClues: minClues, principalComp: principalComp };
  }
  CX._derive = derive;

  // ------------------------------------------------------------ checks against truth
  function relevant(W, e) {
    if (!e || e._bg || e._noise) return false;
    if (e._sys === 'traffic') return false;
    if (e._net) return true;
    if (!e._step && e._pids && e._pids.some(function (pid) { return W.P[pid] && W.P[pid].net; }) && e.r !== 'tx' && e.r !== 'call') return true;
    return false;
  }
  function evaluate(cs, K, dv, detail) {
    var W = cs._w, s = cs._s;
    var fails = [];
    // (a) aliases linked
    var usedNames = {};
    W.entries.forEach(function (e) {
      if (!e._net || !e._step || e._sys === 'traffic') return;
      if (e._day >= cs.day) return;
      var st = W.byStep[e._step];
      st.parts.forEach(function (x) { if (W.P[x.pid].net) (usedNames[x.pid] = usedNames[x.pid] || {})[x.name] = 1; });
    });
    var linkOK = true, wrongMerge = false;
    W.network.forEach(function (p) {
      var names = Object.keys(usedNames[p.id] || {});
      names.push(p.real);
      names = CX.uniq(names);
      var root = null;
      names.forEach(function (n) {
        if (!K.names[n]) { linkOK = false; if (detail) fails.push('unseen name ' + n + ' (' + p.role + ')'); return; }
        var r = dv.uf.find(n);
        if (root === null) root = r; else if (r !== root) { linkOK = false; if (detail) fails.push('unlinked ' + n + ' (' + p.role + ')'); }
      });
    });
    // false merges
    var compOwner = {};
    Object.keys(K.names).forEach(function (n) {
      var pid = W.nameOwner[n]; if (!pid) return;
      var r = dv.uf.find(n);
      if (compOwner[r] && compOwner[r] !== pid) { wrongMerge = true; fails.push('FALSE MERGE ' + n + ' with ' + W.P[compOwner[r]].real); }
      compOwner[r] = pid;
    });
    // roles (truth comparison)
    var roleOK = {}, roleWrong = [];
    Object.keys(dv.compRole).forEach(function (c) {
      var pid = compOwner[c] || W.nameOwner[c];
      if (!pid) return;
      var p = W.P[pid];
      if (dv.compRole[c] === p.role) roleOK[pid] = true;
      else roleWrong.push(c + ': guessed ' + dv.compRole[c] + ' is ' + p.role);
    });
    // (b) plot
    var methodOK = dv.methods.length === 1 && dv.methods[0] === W.T.method;
    var eventOK = dv.surv.length === 1 && dv.surv[0].event === W.realEvent.id;
    if (dv.methods.length > 1 || (dv.methods.length === 1 && !methodOK)) fails.push('METHOD WRONG ' + dv.methods.join('/'));
    if (dv.surv.length === 1 && !eventOK) fails.push('EVENT WRONG');
    if (dv.surv.length === 0 && dv.clues.length) fails.push('NO EVENT SURVIVES');
    // (c) warrants
    var warrants = [];
    if (detail || (linkOK && methodOK && eventOK)) {
      W.network.forEach(function (p) {
        if (!roleOK[p.id]) return;
        var names = p.idents.map(function (x) { return x.name; }).filter(function (n) { return K.names[n]; });
        if (!names.length) return;
        var bySys = {};
        s.docs.forEach(function (d) { if (d.tokens.some(function (t) { return t.t === 'name' && names.indexOf(t.v) >= 0; })) (bySys[d.sys] = bySys[d.sys] || []).push(d.id); });
        var systems = Object.keys(bySys);
        var ok = false;
        // try the best doc per system pair
        for (var i = 0; i < systems.length && !ok; i++) for (var j = i + 1; j < systems.length && !ok; j++) {
          var A = bySys[systems[i]], B = bySys[systems[j]];
          for (var a = 0; a < A.length && !ok; a++) for (var b = 0; b < B.length && !ok; b++) {
            if (CX.checkWarrant(cs, { name: names[0], role: p.role, citedDocIds: [A[a], B[b]] }).approved) ok = true;
          }
        }
        if (ok) warrants.push(p.role);
      });
    }
    var warrantOK = warrants.indexOf('operative') >= 0 && warrants.length >= 3;
    // herrings must stay out of the suspect set
    W.herrings.forEach(function (h) { if (dv.isSus('N:' + h.real)) fails.push('HERRING SUSPECT ' + h.real); });
    var solved = linkOK && !wrongMerge && methodOK && eventOK && warrantOK && (dv.minClues || 0) >= 2;
    return { solved: solved, linkOK: linkOK, wrongMerge: wrongMerge, methodOK: methodOK, eventOK: eventOK, warrantOK: warrantOK, warrants: warrants, minClues: dv.minClues, roleWrong: roleWrong, fails: fails, clues: dv.clues.map(function (c) { return c.k; }) };
  }

  // tokens an entry would show (for the oracle's look-ahead)
  function entryTokens(W, e) {
    var t = [];
    function a(ty, v) { if (v !== null && v !== undefined && v !== '' && v !== 'cash') t.push([ty, String(v)]); }
    switch (e.r) {
      case 'stay': a('name', e.name); a('passport', e.passport); a('address', e.home); a('hotel', e.hotel); a('date', e.arr); a('date', e.dep); a('account', e.paidAcc); a('company', e.paidCo); break;
      case 'resv': a('name', e.name); a('hotel', e.hotel); a('date', e.from); a('date', e.to); a('number', e.byNum); break;
      case 'cross': a('name', e.name); a('passport', e.passport); a('plate', e.plate); a('flight', e.flight); a('date', e.day); (e.companions || []).forEach(function (c) { a('name', c); }); break;
      case 'pax': a('name', e.name); a('flight', e.flight); a('account', e.paidAcc); a('company', e.paidCo); a('date', e.day); break;
      case 'line': a('number', e.number); a('hotel', e.hotel); if (e.kind === 'flat') a('name', e.subscriber); if (e.kind === 'office' && W.companies[e.subscriber]) a('company', e.subscriber); if (e.kind === 'flat' || e.kind === 'office') a('address', e.address); break;
      case 'call': a('number', e.from); a('number', e.to); a('date', e.day); break;
      case 'acct': a('account', e.account); if (e.holderKind === 'personal') a('name', e.holder); a('company', e.company); a('name', e.signatory); if (e.holderKind !== 'utility') a('address', e.address); break;
      case 'tx': a('account', e.from); a('account', e.to); a('plate', e.plate); a('date', e.day);
        [[e.from, e.fromKind, e.fromHolder], [e.to, e.toKind, e.toHolder]].forEach(function (x) { if (x[1] === 'personal') a('name', x[2]); else if (x[1] === 'company' && W.companies[x[2]]) a('company', x[2]); }); break;
      case 'veh': a('plate', e.plate); if (e.ownerKind === 'private') { a('name', e.owner); a('address', e.ownerAddr); } break;
      case 'rental': a('plate', e.plate); a('name', e.renter); a('passport', e.passport); a('address', e.home); a('account', e.depositFrom); a('name', e.clerk); a('date', e.from); a('date', e.to); break;
      case 'res': a('name', e.name); a('address', e.address); a('address', e.prev); if (W.companies[e.employer]) a('company', e.employer); break;
      case 'co': a('company', e.company); e.directors.forEach(function (d) { a('name', d); }); e.accounts.forEach(function (x) { a('account', x); }); a('address', e.address); break;
      case 'card': a('name', e.name); e.aliases.forEach(function (x) { a('name', x); }); e.associates.forEach(function (x) { a('name', x); }); break;
    }
    return t;
  }
  var TYPE_SYS = {}; DATA.KEYS && Object.keys(DATA.KEYS).forEach(function (sys) { DATA.KEYS[sys].forEach(function (ty) { (TYPE_SYS[ty] = TYPE_SYS[ty] || []).push(sys); }); });

  // ------------------------------------------------------------ the oracle loop
  CX.solveWorld = function (W, o) {
    o = o || {};
    var cs = new CX.Case(W, W.seed, 0);
    var K = K0();
    absorb(K, cs.inbox());
    var lastDay = W.D - 2;
    var cap = Math.min(DATA.DAY_HOURS, o.dayCap || DATA.DAY_HOURS);
    var reserve = DATA.DAY_HOURS - cap;
    var queried = {};
    var st = { queries: 0, hours: 0, solvedDay: null, hoursAtSolve: null, methodDay: null, eventDay: null, linkDay: null };
    var ev = null, dv = null;
    var tokenOrder = {};
    function candidates() {
      var toks = cs.knownTokens();
      toks.forEach(function (t, i) { var k = t.t + ':' + t.v; if (tokenOrder[k] === undefined) tokenOrder[k] = i; });
      var out = [];
      var dates = toks.filter(function (t) { return t.t === 'date'; });
      toks.forEach(function (t) {
        CX.SYSTEMS.forEach(function (S) {
          if (S.keys.indexOf(t.t) >= 0) out.push({ sys: S.id, key: { t: t.t, v: t.v }, cost: S.hours, order: tokenOrder[t.t + ':' + t.v] });
        });
        if (t.t === 'hotel') dates.forEach(function (d) { out.push({ sys: 'hotels', key: { t: 'hotel+date', hotel: t.v, date: +d.v }, cost: 1, order: tokenOrder['hotel:' + t.v] + 0.5 }); });
      });
      return out;
    }
    for (;;) {
      // spend the day
      for (;;) {
        dv = derive(K, W.cal);
        ev = evaluate(cs, K, dv, false);
        if (ev.solved) { st.solvedDay = cs.day; st.hoursAtSolve = st.hours; break; }
        if (ev.methodOK && st.methodDay === null) st.methodDay = cs.day;
        if (ev.eventOK && st.eventDay === null) st.eventDay = cs.day;
        if (ev.linkOK && st.linkDay === null) st.linkDay = cs.day;
        var best = null, bestScore = 0;
        var tokUseful = {};
        var knownDates = cs.knownTokens().filter(function (t) { return t.t === 'date'; }).map(function (t) { return +t.v; });
        var knownHotels = cs.knownTokens().filter(function (t) { return t.t === 'hotel'; }).map(function (t) { return t.v; });
        function unseenRel(list) { return (list || []).some(function (e) { return !cs._s.seen[e._id] && relevant(W, e) && !(e._day >= cs.day) && !(e._step && cs._blocked(e._step)); }); }
        function useful(ty, v) {
          var k = ty + ':' + v;
          if (tokUseful[k] !== undefined) return tokUseful[k];
          var u = false;
          if (cs.holds(ty, v)) u = false;
          else if (ty === 'hotel') u = knownDates.some(function (d) { return unseenRel(cs._s.idx['hotels|hd:' + v + '|' + d]); });
          else if (ty === 'date') u = knownHotels.some(function (h) { return unseenRel(cs._s.idx['hotels|hd:' + h + '|' + v]); });
          else u = (TYPE_SYS[ty] || []).some(function (sys) { return unseenRel(cs._s.idx[sys + '|' + ty + ':' + v]); });
          tokUseful[k] = u;
          return u;
        }
        candidates().forEach(function (c) {
          if (c.cost > cs.hoursLeft - reserve) return;
          var ents = cs._peek(c.sys, c.key);
          var g = 0, gt = 0, newT = {};
          for (var i = 0; i < ents.length; i++) {
            if (!cs._s.seen[ents[i]._id] && relevant(W, ents[i])) g++;
          }
          if (!g) {
            for (var j = 0; j < ents.length; j++) {
              if (ents[j]._bg) continue;
              entryTokens(W, ents[j]).forEach(function (t) { var k = t[0] + ':' + t[1]; if (!newT[k] && useful(t[0], t[1])) { newT[k] = 1; gt++; } });
            }
            g = gt * 0.01;
          }
          if (!g) return;
          var qk = c.sys + '|' + JSON.stringify(c.key);
          if (queried[qk]) g *= 0.25; // re-pulling a key is rarely worth it
          var score = g / c.cost - c.order * 1e-6;
          if (score > bestScore) { bestScore = score; best = c; }
        });
        if (!best) break;
        queried[best.sys + '|' + JSON.stringify(best.key)] = true;
        var r = cs.query(best.sys, best.key);
        if (r.error) break;
        st.queries++; st.hours += r.hoursSpent;
        absorb(K, [r.doc]);
      }
      if (st.solvedDay !== null) break;
      if (cs.day >= lastDay) break;
      var nd = cs.endDay();
      absorb(K, nd.newDocs);
    }
    var fin = evaluate(cs, K, dv, true);
    return {
      solved: st.solvedDay !== null, day: st.solvedDay, D: W.D, hours: st.hoursAtSolve !== null ? st.hoursAtSolve : st.hours,
      available: DATA.DAY_HOURS * (lastDay + 1), cap: cap, queries: st.queries, docs: cs.inbox().length,
      methodDay: st.methodDay, eventDay: st.eventDay, linkDay: st.linkDay,
      minClues: fin.minClues, clues: fin.clues, warrants: fin.warrants, fails: fin.fails.slice(0, 12), roleWrong: fin.roleWrong,
      linkOK: fin.linkOK, methodOK: fin.methodOK, eventOK: fin.eventOK, warrantOK: fin.warrantOK,
      _cs: o.keep ? cs : undefined, _K: o.keep ? K : undefined
    };
  };

  // ------------------------------------------------------------ verified case creation
  CX.MAX_ATTEMPTS = 25;
  CX.ACCEPT_CAP = 9;
  CX.EASY_CAP = 3; // the ideal analyst must solve it with 9 of the 16 daily team-hours (56%)
  /** smallest daily budget (team-hours) with which the ideal analyst solves the case by D-2, or null */
  CX.minDailyHours = function (W) {
    var lo = 1, hi = DATA.DAY_HOURS, best = null, rep;
    rep = CX.solveWorld(W, { dayCap: hi });
    if (!rep.solved) { hi = CX.ACCEPT_CAP; rep = CX.solveWorld(W, { dayCap: hi }); if (!rep.solved) return { hours: null, rep: rep }; }
    best = hi; var bestRep = rep;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      rep = CX.solveWorld(W, { dayCap: mid });
      if (rep.solved) { best = mid; bestRep = rep; hi = mid - 1; } else lo = mid + 1;
    }
    return { hours: best, rep: bestRep };
  };
  CX.newCase = function (seed, opts) {
    opts = opts || {};
    seed = String(seed);
    var last = null;
    for (var a = 0; a < CX.MAX_ATTEMPTS; a++) {
      var gs = a ? seed + '#' + a : seed;
      var W;
      try { W = CX.buildWorld(gs, opts); CX.makeTraces(W); }
      catch (e) { last = { error: e.message }; continue; }
      var rep = CX.solveWorld(W, { dayCap: CX.ACCEPT_CAP });
      // not too easy either: an analyst with only 3 hours a day must not be able to crack it
      if (rep.solved && CX.solveWorld(W, { dayCap: CX.EASY_CAP }).solved) { last = rep; last.tooEasy = true; continue; }
      if (rep.solved) {
        var cs = CX.caseFromAttempt(seed, opts, a);
        Object.defineProperty(cs, '_verify', { value: rep, enumerable: false });
        return cs;
      }
      last = rep;
    }
    // fall back to the last generated world (should not happen in practice)
    var cs2 = CX.caseFromAttempt(seed, opts, 0);
    Object.defineProperty(cs2, '_verify', { value: last, enumerable: false });
    return cs2;
  };
})();
