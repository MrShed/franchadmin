/* CUTOUT engine — 06-truth.js
 * Ground truth, proposition checking, batch confirmation (Obra Dinn rule),
 * warrant checking and arrests, outcome resolution, debrief.
 * The engine never exposes truth except via documents, confirmation stamps,
 * warrant results and the debrief.
 */
var CX = (typeof CX !== 'undefined' && CX) ? CX : {};

(function () {
  'use strict';
  var DATA = CX.DATA;
  var CP = CX.Case.prototype;
  var tk = CX.tok;

  function pidOf(W, name) { return name && W.nameOwner[name] ? W.nameOwner[name] : null; }
  function trueRole(W, pid) { var p = W.P[pid]; return p ? p.role : null; }
  CX.truthPid = pidOf;

  // Which step kinds implicate which role (for warrants)
  var ROLE_STEPS = {
    principal: ['pay', 'call', 'meet'],
    cutout: ['call', 'meet', 'pay', 'travel', 'stay', 'drop', 'resv'],
    operative: ['travel', 'stay', 'recon', 'acquire', 'meet', 'resv', 'forge', 'call', 'booking', 'act'],
    armourer: ['acquire', 'pay', 'call', 'meet'],
    forger: ['forge', 'pay', 'call', 'meet'],
    driver: ['hire', 'travel', 'stay', 'meet', 'call', 'acquire', 'pay'],
    financier: ['pay', 'call', 'meet'],
    'inside-man': ['call', 'meet', 'inside', 'pay', 'acquire'],
    chemist: ['acquire', 'pay', 'call', 'meet', 'travel', 'stay'],
    lookout: ['recon', 'travel', 'stay', 'meet', 'call', 'pay'],
    courier: ['travel', 'drop', 'call', 'stay', 'pay']
  };
  CX.ROLE_STEPS = ROLE_STEPS;

  // ------------------------------------------------------------ propositions
  function propCorrect(W, p) {
    if (p.type === 'same') { var a = pidOf(W, p.a), b = pidOf(W, p.b); return !!(a && b && a === b && p.a !== p.b); }
    if (p.type === 'role') { var x = pidOf(W, p.name); return !!(x && trueRole(W, x) === p.role); }
    return false;
  }
  CX.propCorrect = propCorrect;
  CP.file = function (prop) {
    var s = this._s, W = this._w;
    if (!prop || !prop.type) return { error: 'bad proposition' };
    var p = { id: 'P' + (++s.propN), type: prop.type, status: 'filed', filedDay: this.day };
    if (prop.type === 'same') { p.a = prop.a; p.b = prop.b; }
    else if (prop.type === 'role') { p.name = prop.name; p.role = prop.role; }
    else if (prop.type === 'plot') {
      p.field = prop.field; p.value = prop.value;
      // one live value per plot field
      s.props = s.props.filter(function (q) { return !(q.type === 'plot' && q.field === prop.field); });
    } else return { error: 'bad proposition type' };
    s.props.push(p);
    s.log.push(['f', CX.clone(prop)]);
    var confirmed = [];
    for (;;) {
      var good = s.props.filter(function (q) { return q.status === 'filed' && (q.type === 'same' || q.type === 'role') && propCorrect(W, q); });
      if (good.length < 3) break;
      good.slice(0, 3).forEach(function (q) { q.status = 'confirmed'; q.confirmedDay = this.day; confirmed.push(q.id); }, this);
    }
    return { id: p.id, confirmed: confirmed };
  };
  CP.unfile = function (id) {
    var s = this._s, n = s.props.length;
    s.props = s.props.filter(function (q) { return !(q.id === id && q.status !== 'confirmed'); });
    if (s.props.length < n) { s.log.push(['u', id]); return true; }
    return false;
  };
  CP.props = function () { return this._s.props.map(function (p) { return CX.clone(p); }); };
  CP.plotOptions = function () {
    var s = this._s, W = this._w;
    var targets = [], places = [], dates = [], seenT = {}, seenP = {}, seenD = {};
    s.docs.forEach(function (d) {
      (d.recs || []).forEach(function (r) {
        if (r.r !== 'news') return;
        r.items.forEach(function (it) {
          if (!seenT[it.subject]) { seenT[it.subject] = 1; targets.push({ v: it.subject, d: it.subject }); }
          if (!seenP[it.venue]) { seenP[it.venue] = 1; places.push({ v: it.venue, d: W.venues[it.venue].name + ', ' + it.city }); }
          if (!seenD[it.day]) { seenD[it.day] = 1; dates.push({ v: String(it.day), d: W.cal.nice(it.day) }); }
        });
      });
    });
    dates.sort(function (a, b) { return a.v - b.v; });
    return { methods: DATA.METHODS.slice(), targets: targets, places: places, dates: dates };
  };

  // ------------------------------------------------------------ warrants
  /** dry-run check. returns {approved, reason, pid, wrongful} */
  CX.checkWarrant = function (cs, w) {
    var W = cs._w, s = cs._s;
    var pid = pidOf(W, w.name);
    var docs = (w.citedDocIds || []).slice(0, 4).map(function (id) { return s.docById[id]; }).filter(Boolean);
    if (docs.length < 2) return { approved: false, reason: 'insufficient evidence', pid: pid };
    var p = pid ? W.P[pid] : null;
    if (!p || !p.net) return { approved: false, reason: 'evidence doesn\'t connect this name to the operation', pid: pid, wrongful: true };
    if (s.arrests[pid] !== undefined) return { approved: false, reason: 'already in custody', pid: pid };
    // traces of this person in network steps, per doc
    var anyTrace = false, qual = {};
    docs.forEach(function (d) {
      d._entries.forEach(function (eid) {
        var e = s.entryById[eid]; if (!e || !e._step || !e._net) return;
        if (!e._pids || e._pids.indexOf(pid) < 0) return;
        var st = W.byStep[e._step]; if (!st) return;
        if (!st.parts.some(function (x) { return x.pid === pid; })) return;
        anyTrace = true;
        if (ROLE_STEPS[p.role] && ROLE_STEPS[p.role].indexOf(st.kind) >= 0) qual[d.sys] = true;
      });
    });
    if (w.role !== p.role) return { approved: false, reason: anyTrace ? 'wrong role for the evidence' : 'evidence doesn\'t connect this name to the operation', pid: pid };
    if (!anyTrace) return { approved: false, reason: 'evidence doesn\'t connect this name to the operation', pid: pid };
    if (Object.keys(qual).length < 2) return { approved: false, reason: 'insufficient evidence', pid: pid };
    return { approved: true, pid: pid };
  };
  CP.warrant = function (w) {
    if (this.over) return { approved: false, reason: 'the case is closed' };
    var s = this._s, W = this._w;
    s.log.push(['w', CX.clone(w)]);
    var r = CX.checkWarrant(this, w);
    s.warrants.push({ name: w.name, role: w.role, day: this.day, approved: r.approved });
    if (!r.approved) {
      var lost = 0;
      if (r.wrongful) { lost = 20; this.credibility -= 20; s.wrongful++; }
      return { approved: false, reason: r.reason, credibilityLost: lost };
    }
    s.arrests[r.pid] = this.day;
    s.arrestNames = s.arrestNames || [];
    s.arrestNames.push({ name: w.name, role: w.role, day: this.day, pid: r.pid });
    var st = statementDoc(this, W.P[r.pid], w.name);
    return { approved: true, statement: st };
  };
  CP.arrested = function () { return (this._s.arrestNames || []).map(function (a) { return { name: a.name, role: a.role, day: a.day }; }); };

  function statementDoc(cs, p, asName) {
    var W = cs._w;
    var R = CX.rng(W.seed + '/stmt/' + p.id + '/' + cs.day);
    var lines = [];
    function L() { return { k: 'p', x: Array.prototype.slice.call(arguments).reduce(function (a, s) { return a.concat(Array.isArray(s) ? s : [s]); }, []) }; }
    lines.push({ k: 'h', x: ['Statement of ', tk('name', asName), ', taken ', tk('date', cs.day, W.cal.dmy(cs.day))] });
    lines.push(L(R.pick(['"I want a lawyer. And a coffee. In that order."', '"I am a businessman. I travel. Is that a crime now?"', '"You have made a mistake, but I will help you, because I am a reasonable man."', 'Subject declined to answer for two hours, then asked about football results.'])));
    var others = p.idents.filter(function (x) { return x.name !== asName; });
    if (others.length && R.chance(0.7)) lines.push(L('Shown the passports found on him, admitted to having used the name ', tk('name', R.pick(others).name), '.'));
    // one contact
    var contact = null;
    var net = W.net;
    if (p.role === 'cutout') contact = { p: net.principal, num: net.principal.officePhone, how: 'He gave me instructions from ' + DATA.CITIES[net.principal.homeCity].name + '. I called an office number' };
    else if (p.role === 'principal' || p.role === 'financier') contact = { p: net.cutout, num: net.cutout.phone, how: 'The man who arranged things on the ground could be reached at' };
    else if (p.role !== 'principal') { var h = p.cell === 'B' && net.cutout2 ? net.cutout2 : net.cutout; contact = { p: h, num: h.phone, how: 'I only knew my contact by a first name. He telephoned me; once he gave me a number' }; }
    if (contact && R.chance(0.8)) lines.push(L(contact.how, ': ', tk('number', contact.num), '.'));
    if (p.role === 'operative' && R.chance(0.4)) lines.push(L('Asked about the purpose of his journey, said only: "I was told it would be a ', CX.WEEKDAYS[W.cal.weekday(W.D)], '."'));
    lines.push({ k: 'n', x: [R.pick(['Interviewing officer: partly truthful, in my view.', 'Interviewing officer: will say more when he understands nobody is coming for him.', 'Interviewing officer: rehearsed.'])] });
    var res = { sys: 'traffic', lines: lines, title: 'Interrogation statement — ' + asName, from: 'Interrogation section', style: 'report', entries: [] };
    return cs._makeDoc(res, { kind: 'statement' });
  }

  // ------------------------------------------------------------ resolution
  function operativesDown(cs) {
    var W = cs._w, a = cs._s.arrests;
    var ops = W.network.filter(function (p) { return p.role === 'operative'; });
    return ops.every(function (p) { return a[p.id] !== undefined; });
  }
  CP.respond = function (resp) {
    if (this.over) return this.outcome;
    this._s.log.push(['r', CX.clone(resp)]);
    return CX.resolveCase(this, resp);
  };
  CX.resolveCase = function (cs, resp) {
    var W = cs._w, s = cs._s, D = W.D;
    var ev = W.realEvent;
    var out = { response: resp.type, prevented: false, how: '', caught: [], principalCaught: false, wrongful: s.wrongful, daysToSpare: Math.max(0, D - cs.day), score: 0, scoreLines: [], summary: '' };
    var opsDown = operativesDown(cs);
    var caughtPids = Object.keys(s.arrests);
    var trapQuality = 0;
    if (resp.type === 'protect') {
      if (resp.target === ev.subject.name) { out.prevented = true; out.how = 'Protection was tightened around ' + ev.subject.name + '. The network saw it and called the operation off.'; }
      else if (opsDown) { out.prevented = true; out.how = 'You protected the wrong target, but the operative was already in custody.'; }
      else out.how = 'Protection went to ' + (resp.target || 'nobody in particular') + '. ' + ev.subject.name + ' was not protected.';
    } else if (resp.type === 'trap') {
      var placeOk = resp.place === ev.venue, dateOk = String(resp.date) === String(ev.day);
      if (placeOk && dateOk && !opsDown) {
        out.prevented = true;
        out.how = 'The team was taken at the ' + W.venues[ev.venue].name + ' on ' + W.cal.long(ev.day) + '.';
        // every network member with any seen trace
        W.network.forEach(function (p) {
          if (p.role === 'principal') return;
          var seen = Object.keys(s.seen).some(function (id) { var e = s.entryById[id]; return e && e._net && e._pids && e._pids.indexOf(p.id) >= 0; });
          if (seen && caughtPids.indexOf(p.id) < 0) caughtPids.push(p.id);
        });
        // principal via the money trail
        var P = W.net.principal;
        var pn = P.idents.map(function (x) { return x.name; });
        var trail = s.props.some(function (q) { return propCorrect(W, q) && ((q.type === 'role' && q.role === 'principal') || (q.type === 'same' && (pn.indexOf(q.a) >= 0 || pn.indexOf(q.b) >= 0))); });
        if (trail && caughtPids.indexOf(P.id) < 0) caughtPids.push(P.id);
        if (resp.method === W.T.method) trapQuality += 10;
        if (resp.target === ev.subject.name) trapQuality += 10;
      } else if (opsDown) { out.prevented = true; out.how = 'The trap was set in the wrong place or on the wrong day, but the operative was already in custody.'; }
      else out.how = 'The trap waited at ' + (W.venues[resp.place] ? W.venues[resp.place].name : 'the wrong place') + ' on ' + (resp.date !== undefined ? W.cal.nice(+resp.date) : 'the wrong day') + '.';
    } else {
      if (opsDown) { out.prevented = true; out.how = 'With the operative in custody the operation could not go ahead.'; }
      else out.how = resp.type === 'arrest-only' ? 'Arrests alone did not stop the operation.' : 'Nobody intervened.';
    }
    if (!out.prevented) {
      out.how += ' ' + actText(W);
    }
    out.caught = caughtPids.map(function (pid) { return W.P[pid].real; });
    out.principalCaught = caughtPids.indexOf(W.net.principal.id) >= 0;
    var pts = [];
    if (out.prevented) pts.push({ label: 'Operation prevented', pts: 100 }); else pts.push({ label: 'Operation went ahead', pts: -50 });
    caughtPids.forEach(function (pid) { var p = W.P[pid]; pts.push({ label: 'In custody: ' + p.real + ' (' + p.role + ')', pts: p.role === 'principal' ? 40 : 15 }); });
    if (s.wrongful) pts.push({ label: 'Wrongful warrant requests (' + s.wrongful + ')', pts: -20 * s.wrongful });
    if (out.prevented && out.daysToSpare) pts.push({ label: 'Days to spare (' + out.daysToSpare + ')', pts: 5 * out.daysToSpare });
    if (trapQuality) pts.push({ label: 'Trap well briefed (method/target)', pts: trapQuality });
    var hu = s.hints && s.hints.used;
    if (hu && (hu.nudge + hu.pointer + hu.direct)) {
      var pen = CX.ANALYST ? CX.ANALYST.penalty : { nudge: 2, pointer: 5, direct: 10 };
      var parts = []; ['nudge', 'pointer', 'direct'].forEach(function (k) { if (hu[k]) parts.push(hu[k] + ' ' + k + (hu[k] > 1 ? 's' : '')); });
      pts.push({ label: 'Help from the night desk (' + parts.join(', ') + ')', pts: -(hu.nudge * pen.nudge + hu.pointer * pen.pointer + hu.direct * pen.direct) });
    }
    out.scoreLines = pts;
    out.score = pts.reduce(function (a, b) { return a + b.pts; }, 0);
    out.summary = (out.prevented ? 'Prevented. ' : 'Not prevented. ') + out.how;
    cs.over = true; cs.outcome = out;
    return out;
  };
  function actText(W) {
    var ev = W.realEvent, v = W.venues[ev.venue];
    var t = {
      'sniper rifle': 'At ' + CX.hm(W.actStep.time) + ' a shot from a hotel window opposite the ' + v.name + ' struck ' + ev.subject.name + '.',
      pistol: ev.subject.name + ' was shot at close range at the ' + v.name + ' at ' + CX.hm(W.actStep.time) + '.',
      poison: ev.subject.name + ' collapsed at the ' + v.name + ' after the second course. The doctors spoke of a heart attack for a day.',
      'explosive device': 'A device exploded at the ' + v.name + ' at ' + CX.hm(W.actStep.time) + '.',
      burglary: ev.subject.name + ' was gone from the ' + v.name + ' the next morning. The lock had been opened with a key.',
      abduction: ev.subject.name + ' did not return to the hotel after the lecture at the ' + v.name + '. A van crossed the border that night.'
    }[W.T.method];
    return t || 'The operation went ahead.';
  }

  // ------------------------------------------------------------ debrief
  CX.stepText = function (W, s) {
    var n = function (i) { return s.parts[i] ? s.parts[i].name : '?'; };
    var cn = function (c) { return DATA.CITIES[c] ? DATA.CITIES[c].name : c; };
    switch (s.kind) {
      case 'parking': return 'The vehicle ' + s.plate + ' was ticketed beside the ' + W.venues[s.venue].name + ' while ' + n(0) + ' looked at the approaches.';
      case 'travel': if (s.local) return n(0) + ' drove ' + (s.plate || '') + ' around ' + cn(s.from) + ', rehearsing the route.';
        return n(0) + ' travelled ' + cn(s.from) + ' → ' + cn(s.to) + ' (' + (s.route.mode === 'air' ? 'flight ' + s.route.flight : s.route.mode === 'car' ? 'car ' + (s.plate || '') : s.route.mode) + ')' + (s.parts.length > 1 ? ' with ' + s.parts.slice(1).map(function (x) { return x.name; }).join(', ') : '') + (s.customs ? ', declaring cash' : '') + '.';
      case 'stay': return n(0) + ' stayed at ' + W.hotels[s.hotel].name + ', ' + cn(W.hotels[s.hotel].city) + ', room ' + s.room + ' (' + (s.to - s.from) + ' nights).';
      case 'resv': return 'A room at ' + W.hotels[s.hotel].name + ' was reserved for ' + n(0) + ' for ' + W.cal.nice(s.from) + '–' + W.cal.nice(s.to) + '.';
      case 'call': return (s.parts[0] ? n(0) : s.fromNum) + ' telephoned ' + (s.parts[1] ? n(1) : s.toNum) + (s.intercept ? ' (intercepted)' : '') + '.';
      case 'meet': return s.parts.map(function (x) { return x.name; }).join(', ') + ' met at ' + s.place + '.';
      case 'pay': return 'Payment of ' + CX.money(s.amount, ' ') + ' ' + (s.cur || '') + ' from ' + s.fromAcc + ' to ' + s.toAcc + ' ("' + s.ref + '").';
      case 'acquire': return s.mode === 'supplier' ? n(1) + ' supplied ' + s.itemName + ' to ' + n(0) + '.' : s.mode === 'theft' ? n(0) + ' stole ' + s.itemName + '.' : 'The cover company bought ' + s.itemName + ' from ' + s.merchant + '.';
      case 'hire': return n(0) + ' hired ' + s.plate + ' from ' + s.agency + ' until ' + W.cal.nice(s.to) + '.';
      case 'recon': return n(0) + ' reconnoitred the ' + W.venues[s.venue].name + ' (' + s.rk + ').';
      case 'forge': return n(0) + ' produced papers in the name ' + s.newName + ' for ' + n(1) + '.';
      case 'drop': return n(0) + ' handed over ' + s.content + ' to ' + n(1) + ' at ' + s.place + '.';
      case 'booking': return 'A flight out (' + s.route.flight + ', ' + W.cal.nice(s.flightDay) + ') was booked for ' + n(0) + '.';
      case 'inside': return n(0) + ' ' + s.what + '.';
      case 'seizure': return 'Customs seized ' + s.goods.d + ' from ' + n(0) + '.';
      case 'act': return 'The act: ' + s.method + ' against ' + s.target + ' at the ' + W.venues[s.venue].name + '.';
    }
    return s.kind;
  };
  CP.debrief = function () {
    var W = this._w, s = this._s, cs = this;
    var entriesByStep = {};
    W.entries.forEach(function (e) { if (e._step) (entriesByStep[e._step] = entriesByStep[e._step] || []).push(e); });
    var seenNames = {};
    s.tokenList.forEach(function (t) { if (t.t === 'name') seenNames[t.v] = true; });
    return {
      outcome: this.outcome,
      plot: { method: W.T.method, target: W.realEvent.subject.name, place: W.realEvent.venue, placeLabel: W.venues[W.realEvent.venue].name + ', ' + DATA.CITIES[W.actCity].name, date: W.D, dateLabel: W.cal.long(W.D), template: W.templateKey, label: W.T.label },
      network: W.network.map(function (p) {
        return { realName: p.real, role: p.role + (p.backup ? ' (backup)' : ''), aliases: p.idents.filter(function (x) { return !x.real; }).map(function (x) { return x.name; }), arrested: s.arrests[p.id] !== undefined, seenNames: p.idents.map(function (x) { return x.name; }).filter(function (n) { return seenNames[n]; }) };
      }),
      innocents: W.innocents.map(function (p) { return { name: p.real, kind: p.innocentKind || 'bystander' }; }),
      herrings: W.herrings.map(function (p) {
        var l = W.herringLinks.filter(function (h) { return h.herringPid === p.id; })[0];
        return { name: p.real, link: l ? ({ surname: 'same surname as ' + l.bait + ', same hotel, same night', company: 'company name like ' + l.bait, informant: 'informant claimed he was ' + l.bait }[l.type]) : 'smuggling ring (' + W.herringGoods.d + ')' };
      }),
      timeline: W.steps.filter(function (st) { return W.P[st.parts[0] && st.parts[0].pid] ? W.P[st.parts[0].pid].net || st.kind === 'pay' : false; }).map(function (st) {
        var tr = (entriesByStep[st.id] || []).map(function (e) { return { sys: e._sys, seen: !!s.seen[e._id] }; });
        return { day: st.day, dateLabel: W.cal.nice(st.day), phase: st.phase, kind: st.kind, text: CX.stepText(W, st), traces: tr, seen: tr.some(function (t) { return t.seen; }), blocked: cs._blocked(st.id) };
      }),
      stats: { docs: s.docs.length, queries: s.queries, hoursUsed: s.hoursUsed },
      level: { id: this.level, label: this.levelLabel },
      hints: s.hints ? { used: CX.clone(s.hints.used), total: s.hints.used.nudge + s.hints.used.pointer + s.hints.used.direct, log: CX.clone(s.hints.log) } : { used: { nudge: 0, pointer: 0, direct: 0 }, total: 0, log: [] }
    };
  };
})();
