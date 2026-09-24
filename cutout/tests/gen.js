#!/usr/bin/env node
// Dump a case readably: truth summary, then every document the case can produce,
// rendered as text. Usage: node tests/gen.js <seed> [template] [--truth-only] [--no-truth]
var CX = require('./load.js')();
var args = process.argv.slice(2);
var seed = args[0] || '1';
var template = args[1] && args[1].charAt(0) !== '-' ? args[1] : undefined;
var truthOnly = args.indexOf('--truth-only') >= 0, noTruth = args.indexOf('--no-truth') >= 0;
var fast = args.indexOf('--unverified') >= 0;

var cs = fast ? CX.caseFromAttempt(seed, { template: template }, 0) : CX.newCase(seed, { template: template });
var W = cs._w;
var out = [];
function p(s) { out.push(s === undefined ? '' : s); }

if (!noTruth) {
  p('================================================================ TRUTH');
  p('seed ' + cs.seed + ' (attempt ' + cs.attempt + ')  template ' + W.templateKey + ' — ' + W.T.label);
  p('case starts ' + W.cal.long(0) + '; act on day ' + W.D + ' = ' + W.cal.long(W.D));
  p('cities: ' + W.cities.map(function (c) { return CX.DATA.CITIES[c].name; }).join(', '));
  p('PLOT: ' + W.T.method + ' / ' + W.realEvent.subject.name + ' (' + W.realEvent.subject.title + ') / ' + W.venues[W.realEvent.venue].name + ' / ' + W.cal.long(W.D) + ' ' + CX.hm(W.realEvent.time));
  p('target trait: ' + W.realEvent.subject.trait.cat + ' → code "' + W.realEvent.subject.trait.code + '"');
  p('recon: ' + W.recon.join(', ') + '; code call: ' + JSON.stringify(W.codePlan) + '; planned clues: ' + W.plannedClues.map(function (c) { return c.k; }).join(', '));
  p('items: ' + W.items.map(function (i) { return i.key + ' (' + i.mode + (i.supplier ? ' by ' + i.supplier.real : '') + ', day ' + i.day + ')'; }).join('; '));
  p('events:');
  W.events.slice().sort(function (a, b) { return a.day - b.day; }).forEach(function (e) {
    p('  ' + (e.real ? '*' : ' ') + ' d' + e.day + ' ' + W.cal.nice(e.day) + ' ' + CX.hm(e.time) + '  ' + e.subject.name + ' [' + e.subject.trait.cat + ']  @ ' + e.venue);
  });
  p('network:');
  W.network.forEach(function (x) {
    p('  ' + x.role + (x.backup ? '(backup)' : '') + ' [' + x.cell + ']  ' + x.real + ' (' + x.nat + ', b.' + x.dob + ', ' + CX.DATA.CITIES[x.homeCity].name + ')' +
      (x.idents.length > 1 ? '  aliases: ' + x.idents.slice(1).map(function (a) { return a.name + ' {' + a.links.join(',') + '} ' + a.passport; }).join('; ') : '') + (x.card ? '  [card]' : '') + (x.car ? ' car ' + x.car : ''));
  });
  p('innocents: ' + W.innocents.map(function (x) { return x.real + ' (' + x.innocentKind + ')'; }).join('; '));
  p('herrings: ' + W.herrings.map(function (x) { return x.real; }).join('; ') + '  links: ' + JSON.stringify(W.herringLinks.map(function (h) { return h.type + ':' + h.herring + '~' + h.bait; })));
  p('tip: ' + W.tipKind + ' seeds ' + JSON.stringify(W.tipSeeds));
  p('timeline:');
  W.steps.forEach(function (s) { p('  d' + s.day + ' ' + CX.hm(s.time) + ' [' + s.phase + '] ' + CX.stepText(W, s)); });
  if (cs._verify) { p('solver: ' + JSON.stringify(cs._verify)); }
}
if (!truthOnly) {
  // Pushed traffic for every day, then every query that returns case records, at the end of the case.
  cs.hoursLeft = 1e9;
  p(); p('================================================================ PUSHED TRAFFIC');
  cs.inbox().forEach(function (d) { p(); p(CX.docText(d)); });
  while (cs.day < W.D) { var r = cs.endDay(); r.newDocs.forEach(function (d) { p(); p('(day ' + cs.day + ') ' + CX.docText(d)); }); cs.hoursLeft = 1e9; }
  p(); p('================================================================ RECORD QUERIES (as of day ' + cs.day + ')');
  // every key that touches a case (non-noise) entry
  var keys = {};
  W.entries.forEach(function (e) {
    if (e._sys === 'traffic' || e._noise || e._hub) return;
    if (!e._pids || !e._pids.length) return;
    function k(sys, t, v) { if (v) keys[sys + '|' + t + '|' + v] = [sys, { t: t, v: v }]; }
    switch (e.r) {
      case 'stay': k('hotels', 'name', e.name); break;
      case 'cross': k('border', 'name', e.name); if (e.plate) k('border', 'plate', e.plate); break;
      case 'pax': k('airline', 'name', e.name); break;
      case 'line': k('phones', 'number', e.number); break;
      case 'acct': k('bank', 'account', e.account); break;
      case 'veh': k('vehicles', 'plate', e.plate); break;
      case 'res': k('residents', 'name', e.name); break;
      case 'co': k('companies', 'company', e.company); break;
      case 'card': k('archive', 'name', e.name); break;
    }
  });
  var s = cs._s;
  Object.keys(keys).sort().forEach(function (kk) {
    var q = keys[kk];
    // grant the key (dump mode)
    var tkk = q[1].t + ':' + q[1].v;
    if (!s.tokens[tkk]) { s.tokens[tkk] = { t: q[1].t, v: q[1].v, doc: 'dump' }; s.tokenList.push(s.tokens[tkk]); }
    var r = cs.query(q[0], q[1]);
    p(); p(r.error ? 'ERROR ' + r.error : CX.docText(r.doc));
  });
}
console.log(out.join('\n'));
