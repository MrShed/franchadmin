/* CUTOUT engine — 08-analyst.js
 * The night analyst: hints driven by the headless solver's knowledge, computed
 * from the player's CURRENT holdings only (documents received, keys held,
 * propositions filed). She never mentions a record that does not exist yet or
 * a key the player does not hold; every deduction she states is true.
 *
 *  cs.hintStatus() -> {nudge:{ok, why}, pointer:{ok, cost, why}, direct:{ok, cost, why}, used, total, log}
 *  cs.hint('nudge'|'pointer'|'direct') -> {ok:true, tier, text, refs, charged} | {ok:false, tier, text}
 *    refs: {docs:[docId...], pull:{sys, key, label, cost}|null, prop:{type,...}|null}
 *  Nudge: free, one per in-game day. Pointer: 2 team-hours. Direct: 10 credibility.
 *  Nothing is charged (and nothing logged) when she has nothing useful to say.
 */
var CX = (typeof CX !== 'undefined' && CX) ? CX : {};

(function () {
  'use strict';
  var DATA = CX.DATA;
  var CP = CX.Case.prototype;

  CX.ANALYST = {
    name: 'Ilse Kranich',
    title: 'Night desk',
    bio: 'Thirty-one years in the registry, two in Berlin she will not discuss. Takes her coffee black and her theories with evidence.',
    costs: { nudge: 0, pointer: 2, direct: 10 },
    penalty: { nudge: 2, pointer: 5, direct: 10 }
  };
  var COST = CX.ANALYST.costs;
  var AREA = { hotels: 'where people slept', border: 'who crossed which border', airline: 'who flew where', phones: 'who rang whom', bank: 'the money', vehicles: 'the cars', residents: 'where people actually live', companies: 'the firms and who sits on their boards', archive: 'our own old file cards' };
  var VIA = { passport: 'passport numbers', address: 'home addresses and dates of birth', card: 'alias index', plate: 'number plates', account: 'account numbers' };
  var WHY = { passport: 'Both names travel on the same passport number', address: 'Same date of birth, same home address', card: 'Our own alias index lists both names', plate: 'The same car, and it is registered to one of them', account: 'The same bank account pays for both' };
  var ROLE_RANK = { operative: 0, principal: 1, cutout: 2, driver: 3, armourer: 4, chemist: 4, forger: 5, 'inside-man': 5, financier: 6, lookout: 6, courier: 7 };

  function hs(cs) { var s = cs._s; if (!s.hints) s.hints = { used: { nudge: 0, pointer: 0, direct: 0 }, nudgeDay: null, log: [] }; return s.hints; }

  // ------------------------------------------------------------ what the ideal analyst sees in the player's papers
  function analyse(cs) {
    var W = cs._w, s = cs._s;
    var K = CX._K0();
    CX._absorb(K, s.docs);
    var dv = CX._derive(K, W.cal);
    var pidOf = function (n) { return CX.truthPid(W, n); };

    // the player's own filings, as a union-find over names + roles + plot
    var pf = {};
    function find(x) { while (pf[x] !== undefined && pf[x] !== x) x = pf[x]; return x; }
    var filedRole = {}, plot = {};
    s.props.forEach(function (p) {
      if (p.type === 'same') { var a = find(p.a), b = find(p.b); if (a !== b) pf[a] = b; }
      else if (p.type === 'role') { var pid = pidOf(p.name); if (pid) filedRole[pid + '|' + p.role] = true; }
      else if (p.type === 'plot') plot[p.field] = String(p.value);
    });

    var ded = [];
    // alias links
    var seenPair = {};
    dv.links.forEach(function (l) {
      if (!CX.propCorrect(W, { type: 'same', a: l.a, b: l.b })) return;
      if (find(l.a) === find(l.b)) return;
      var k = [l.a, l.b].sort().join('|'); if (seenPair[k]) return; seenPair[k] = 1;
      var p = W.P[pidOf(l.a)];
      ded.push({ kind: 'same', a: l.a, b: l.b, via: l, role: p.role, rank: 10 + (ROLE_RANK[p.role] || 8) * 2 });
    });
    // roles
    var compNames = {};
    Object.keys(K.names).forEach(function (n) { var c = dv.uf.find(n); (compNames[c] = compNames[c] || []).push(n); });
    Object.keys(dv.compRole).forEach(function (c) {
      var role = dv.compRole[c];
      var names = (compNames[c] || [c]).filter(function (n) { return CX.propCorrect(W, { type: 'role', name: n, role: role }); });
      if (!names.length) return;
      var pid = pidOf(names[0]);
      if (filedRole[pid + '|' + role]) return;
      // name the one the player has met most often
      names.sort(function (a, b) { return count(b) - count(a); });
      ded.push({ kind: 'role', name: names[0], role: role, rank: 11 + (ROLE_RANK[role] || 8) * 2 });
    });
    function count(n) { return s.docs.filter(function (d) { return d.tokens.some(function (t) { return t.t === 'name' && t.v === n; }); }).length; }
    // plot
    var late = W.D - cs.day <= 3;
    var pbase = late ? 0 : 40;
    if (dv.methods.length === 1 && dv.methods[0] === W.T.method && plot.method !== W.T.method) ded.push({ kind: 'plot', field: 'method', value: W.T.method, rank: pbase + 3 });
    if (dv.surv.length === 1 && dv.surv[0].event === W.realEvent.id) {
      var ev = dv.surv[0];
      if (plot.place !== ev.venue) ded.push({ kind: 'plot', field: 'place', value: ev.venue, label: W.venues[ev.venue].name + ', ' + ev.city, rank: pbase + 1 });
      if (plot.date !== String(ev.day)) ded.push({ kind: 'plot', field: 'date', value: ev.day, label: W.cal.nice(ev.day), rank: pbase + 2 });
      if (plot.target !== ev.subject) ded.push({ kind: 'plot', field: 'target', value: ev.subject, label: ev.subject, rank: pbase });
    }
    ded.sort(function (a, b) { return a.rank - b.rank; });

    // record pulls the ideal analyst would make next
    var queried = {};
    s.log.forEach(function (a) { if (a[0] === 'q') queried[a[1] + '|' + JSON.stringify(a[2].t === 'hotel+date' ? { t: 'hotel+date', hotel: a[2].hotel, date: +a[2].date } : { t: a[2].t, v: String(a[2].v) })] = true; });
    // (the desk only asks for the register of nights that are over)
    var pulls = CX._scorePulls(cs, queried).filter(function (c) { return c.key.t !== 'hotel+date' || c.key.date < cs.day; });
    pulls.sort(function (a, b) { return b.score - a.score; });
    return { dv: dv, ded: ded, pulls: pulls, late: late };
  }
  CX._analyse = analyse;

  // ------------------------------------------------------------ wording helpers
  function docRef(cs, id) { var d = cs.doc(id); return d ? '“' + d.title + '”' : 'that file'; }
  function docsWithToken(cs, t, v) { return cs._s.docs.filter(function (d) { return d.tokens.some(function (k) { return k.t === t && k.v === String(v); }); }).map(function (d) { return d.id; }); }
  function docsWithName(cs, n) { return docsWithToken(cs, 'name', n); }
  /** the documents that show a same-link (the identifier they share) */
  function evidenceDocs(cs, d) {
    var l = d.via, out;
    if (l.t === 'card') out = cs._s.docs.filter(function (x) { return x.sys === 'archive' && x.tokens.some(function (k) { return k.t === 'name' && k.v === l.a; }) && x.tokens.some(function (k) { return k.t === 'name' && k.v === l.b; }); }).map(function (x) { return x.id; });
    else {
      var withTok = docsWithToken(cs, l.t, l.v);
      var A = withTok.filter(function (id) { return docsWithName(cs, d.a).indexOf(id) >= 0; });
      var B = withTok.filter(function (id) { return docsWithName(cs, d.b).indexOf(id) >= 0; });
      out = CX.uniq([A[0], B[0]].filter(Boolean));
      if (!out.length) out = withTok.slice(0, 2);
    }
    return out.slice(0, 2);
  }
  function keyLabel(cs, c) {
    if (c.key.t === 'hotel+date') return (cs._w.hotels[c.key.hotel] ? cs._w.hotels[c.key.hotel].name : c.key.hotel) + ', night of ' + cs.dateLabel(c.key.date);
    return c.tok.t === 'name' ? c.tok.v : (c.tok.d || c.tok.v);
  }
  function sysLabel(id) { var S = CX.SYSTEMS.filter(function (x) { return x.id === id; })[0]; return S ? S.label : id; }
  function roleName(r) { return { 'inside-man': 'inside man' }[r] || r; }
  function pick(cs, list, salt) { return list[CX.hash(cs.seed + '/' + cs.day + '/' + salt) % list.length]; }

  var DRY = {
    empty: ['You have wrung today’s paper dry. Go home; end the day. The network works nights, and so does the post.', 'Nothing on this desk is going to tell you more tonight. End the day. I’ll keep the kettle warm.'],
    noHours: ['Your team is spent. Whatever I say now keeps till morning.'],
    tomorrow: 'First thing tomorrow, then — your people are spent.'
  };

  function nudge(cs, A) {
    var best = A.pulls[0], d0 = A.ded.filter(function (d) { return d.kind === 'same'; })[0];
    var useDoc = best && (cs.hoursLeft >= Math.max(best.cost, cs.dayHours / 4) || !d0);
    if (useDoc) {
      var docId = best.tok.doc;
      return { text: 'That ' + docRef(cs, docId) + ' deserves a second read. I would want to know more about ' + AREA[best.sys] + '.', refs: { docs: [docId] } };
    }
    if (d0) {
      var ev = evidenceDocs(cs, d0);
      if (ev.length === 2) return { text: 'Lay ' + docRef(cs, ev[0]) + ' next to ' + docRef(cs, ev[1]) + '. Compare the ' + VIA[d0.via.t] + '.', refs: { docs: ev } };
      if (ev.length === 1) return { text: 'Read ' + docRef(cs, ev[0]) + ' again, slowly. Mind the ' + VIA[d0.via.t] + '.', refs: { docs: ev } };
    }
    return null;
  }
  function pointer(cs, A) {
    var budget = cs.hoursLeft - COST.pointer;
    var now = A.pulls.filter(function (c) { return c.cost <= budget; })[0];
    var c = now || A.pulls[0];
    if (!c) return null;
    var S = sysLabel(c.sys);
    var text = 'Pull ' + S.toLowerCase() + ' on ' + keyLabel(cs, c) + ' (' + c.cost + 'h). You have it in ' + docRef(cs, c.tok.doc) + '.' + (c.again ? ' Yes, again: the file has grown since.' : '') + (now ? '' : ' ' + DRY.tomorrow);
    return { text: text, refs: { docs: [c.tok.doc], pull: { sys: c.sys, key: c.key.t === 'hotel+date' ? c.key : { t: c.key.t, v: c.key.v, d: c.tok.d }, label: keyLabel(cs, c), system: S, cost: c.cost, today: !!now } } };
  }
  function direct(cs, A) {
    var d = A.ded[0];
    if (!d) return null;
    var W = cs._w;
    if (d.kind === 'same') {
      var ev = evidenceDocs(cs, d);
      return { text: d.a + ' and ' + d.b + ' are the same person. ' + WHY[d.via.t] + (ev.length ? ' — see ' + ev.map(function (id) { return docRef(cs, id); }).join(' and ') : '') + '. File it.', refs: { docs: ev, prop: { type: 'same', a: d.a, b: d.b } } };
    }
    if (d.kind === 'role') {
      var ds = docsWithName(cs, d.name).slice(-2);
      return { text: 'The person behind ' + d.name + ' is your ' + roleName(d.role) + '. The pattern is all there in your papers; I would put it in writing.', refs: { docs: ds, prop: { type: 'role', name: d.name, role: d.role } } };
    }
    var what = d.field === 'method' ? 'The method is ' + d.value + '. Look at what they have been buying.'
      : d.field === 'target' ? 'They mean ' + d.label + '. Everything else on that calendar is scenery.'
      : d.field === 'place' ? 'It happens at the ' + d.label + '. Your reconnaissance reports all point the same way.'
      : 'It happens on ' + d.label + '. The telephone told you, if you listened.';
    return { text: what, refs: { docs: [], prop: { type: 'plot', field: d.field, value: d.value, label: d.label || d.value } } };
  }

  // ------------------------------------------------------------ public API
  CP.hintStatus = function () {
    var h = hs(this);
    var nudgeUsed = h.nudgeDay === this.day;
    return {
      nudge: { ok: !this.over && !nudgeUsed, why: this.over ? 'The case is closed.' : nudgeUsed ? 'One nudge a night. She has already given you today’s.' : '' },
      pointer: { ok: !this.over && this.hoursLeft >= COST.pointer, cost: COST.pointer, why: this.over ? 'The case is closed.' : this.hoursLeft < COST.pointer ? 'Needs ' + COST.pointer + ' team-hours; you have ' + this.hoursLeft + '.' : '' },
      direct: { ok: !this.over && this.credibility >= COST.direct, cost: COST.direct, why: this.over ? 'The case is closed.' : this.credibility < COST.direct ? 'Your credibility is too low to ask.' : '' },
      used: CX.clone(h.used), total: h.used.nudge + h.used.pointer + h.used.direct,
      log: h.log.map(function (x) { return CX.clone(x); })
    };
  };
  CP.hint = function (tier) {
    var st = this.hintStatus();
    if (!st[tier]) return { ok: false, tier: tier, text: 'She only does nudges, pointers and straight answers.' };
    if (!st[tier].ok) return { ok: false, tier: tier, text: st[tier].why };
    var A = analyse(this);
    var r = tier === 'nudge' ? nudge(this, A) : tier === 'pointer' ? pointer(this, A) : direct(this, A);
    if (!r) {
      var anyLeft = A.pulls.length || A.ded.length;
      var txt = tier === 'direct' && A.pulls.length ? 'Nothing you can prove from these papers that you have not already filed. The answer is still in the records — go and pull them.'
        : tier === 'pointer' && A.ded.length ? 'No record worth the hours today. But you have not written down everything your papers already prove.'
        : anyLeft ? 'Nothing I can usefully add tonight.' : pick(this, DRY.empty, tier);
      return { ok: false, tier: tier, text: txt, empty: !anyLeft };
    }
    var h = hs(this);
    var charged = { hours: 0, credibility: 0 };
    if (tier === 'nudge') h.nudgeDay = this.day;
    if (tier === 'pointer') { this.hoursLeft -= COST.pointer; this._s.hoursUsed += COST.pointer; charged.hours = COST.pointer; }
    if (tier === 'direct') { this.credibility -= COST.direct; charged.credibility = COST.direct; }
    h.used[tier]++;
    var entry = { n: h.log.length + 1, tier: tier, day: this.day, time: this.clock(), text: r.text, refs: r.refs };
    h.log.push(entry);
    this._s.log.push(['h', tier]);
    return { ok: true, tier: tier, text: r.text, refs: CX.clone(r.refs), charged: charged, entry: CX.clone(entry) };
  };
})();
