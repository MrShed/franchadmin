/* CUTOUT UI — 10-adapter.js
 * The only place the UI touches the engine. Everything the views need goes
 * through UIA so that engine renames stay local to this file.
 * Engine reference: cutout/ENGINE.md.
 */
var UIA = (function () {
  'use strict';
  var A = { cs: null };
  var SAVE_KEY = 'cutout.save.v1';


  // ------------------------------------------------------------ lifecycle
  A.ready = function () { return typeof CX !== 'undefined' && typeof CX.newCase === 'function' && typeof CX.load === 'function'; };
  A.create = function (seed) {
    A.cs = CX.newCase(seed);
    return A.cs;
  };
  A.restore = function (json) {
    A.cs = CX.load(json);
    return A.cs;
  };
  A.serialize = function () { return A.cs.save(); };

  // storage (localStorage can throw in private windows)
  A.readSave = function () {
    try { var s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  };
  A.writeSave = function (ui) {
    if (!A.cs) return false;
    try {
      var eng = JSON.parse(A.cs.save());
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, engine: eng, ui: ui, when: Date.now(), day: A.cs.day, seed: A.cs.seed, label: A.dateLong(A.cs.day) }));
      return true;
    } catch (e) { return false; }
  };
  A.clearSave = function () { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } };
  A.loadSaved = function (obj) {
    return A.restore(JSON.stringify(obj.engine));
  };

  // ------------------------------------------------------------ clock & labels
  A.day = function () { return A.cs.day; };
  A.hoursLeft = function () { return A.cs.hoursLeft; };
  A.dayHours = function () { return A.cs.dayHours || 16; };
  A.over = function () { return !!A.cs.over; };
  A.dateLabel = function (d) { return A.cs.dateLabel(d); };
  A.dateLong = function (d) { return A.cs.dateLong(d); };
  A.topDate = function (d) { var L = A.cs.dateLong(d).split(' '); return L[0].slice(0, 3) + ' ' + L[1] + ' ' + L[2].slice(0, 3) + ' ' + L[3]; };
  A.clock = function () { var h = 8 + (A.dayHours() - A.hoursLeft()); return (h < 10 ? '0' : '') + h + ':00'; };
  A.credibility = function () { return A.cs.credibility === undefined ? 100 : A.cs.credibility; };

  // ------------------------------------------------------------ documents
  A.docs = function () { return A.cs.inbox(); };
  A.doc = function (id) { return A.cs.doc(id); };
  A.systems = function () { return CX.SYSTEMS; };
  A.system = function (id) { return CX.SYSTEMS.filter(function (s) { return s.id === id; })[0] || null; };
  A.known = function () { return A.cs.knownTokens(); };
  A.holds = function (t, v) { return A.cs.holds ? A.cs.holds(t, String(v)) : A.known().some(function (k) { return k.t === t && k.v === String(v); }); };
  A.keysFor = function (sys) { return A.cs.keysFor(sys); };
  /** systems that accept a token of this type as key */
  A.systemsFor = function (t) {
    return CX.SYSTEMS.filter(function (s) { return s.keys.indexOf(t) >= 0 || (t === 'hotel' && s.keys.indexOf('hotel+date') >= 0); });
  };
  A.canQuery = function (sys, key) { return A.cs.canQuery ? A.cs.canQuery(sys, key) : null; };
  A.query = function (sys, key) { return A.cs.query(sys, key); };
  A.endDay = function () { return A.cs.endDay(); };
  A.timeline = function () { return A.cs.timeline(); };

  // ------------------------------------------------------------ subjects (board cards; stored in the engine save)
  A.subjects = function () { return A.cs.subjects; };
  A.addSubject = function (o) { return A.cs.addSubject(o); };
  A.updateSubject = function (id, o) { return A.cs.updateSubject(id, o); };
  A.removeSubject = function (id) { return A.cs.removeSubject(id); };

  // ------------------------------------------------------------ propositions
  A.file = function (p) { return A.cs.file(p); };
  A.unfile = function (id) { return A.cs.unfile(id); };
  A.props = function () { return A.cs.props(); };
  A.plotOptions = function () { return A.cs.plotOptions(); };
  A.roles = function () { return (CX.ROLES || []).slice(); };

  // ------------------------------------------------------------ warrants / resolution
  A.warrant = function (w) { return A.cs.warrant(w); };
  A.arrested = function () { return A.cs.arrested(); };
  A.respond = function (r) { return A.cs.respond(r); };
  A.outcome = function () { return A.cs.outcome || null; };
  A.debrief = function () { return A.cs.debrief(); };
  return A;
})();
