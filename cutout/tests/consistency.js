#!/usr/bin/env node
// Checks generated timelines for contradictions a careful player could spot.
// Usage: node tests/consistency.js [N]
var CX = require('./load.js')();
var N = +(process.argv[2] || 100);
var issues = {}, examples = {};
function flag(k, msg) { issues[k] = (issues[k] || 0) + 1; if (!examples[k]) examples[k] = msg; }
for (var i = 1; i <= N; i++) {
  var W;
  try { W = CX.buildWorld(String(i), {}); CX.makeTraces(W); } catch (e) { flag('gen error', e.message); continue; }
  var stays = W.steps.filter(function (s) { return s.kind === 'stay'; });
  function whereAt(pid, day) {
    var st = stays.filter(function (s) { return s.parts[0].pid === pid && s.from <= day && day < s.to; })[0];
    return st ? W.hotels[st.hotel].city : null;
  }
  W.persons.forEach(function (p) {
    var st = stays.filter(function (s) { return s.parts[0].pid === p.id; });
    st.forEach(function (a, ai) { st.forEach(function (b, bi) { if (ai < bi && a.from < b.to && b.from < a.to && a.hotel !== b.hotel) flag('double stay', i + ' ' + p.real); }); });
  });
  W.steps.forEach(function (s) {
    if (s.kind === 'meet') s.parts.forEach(function (x) { var c = whereAt(x.pid, s.day); if (c && c !== s.city) flag('meet elsewhere', i + ' ' + x.name + ' meets in ' + s.city + ' while staying in ' + c + ' d' + s.day); });
    if (s.kind === 'call' && s.fromStay) { var st = W.byStep[s.fromStay]; if (s.day < st.from || s.day >= st.to + 0 && s.day > st.to) flag('room call outside stay', i + ' ' + s.id); if (s.day === st.from && s.time < st.time) flag('room call before arrival', i + ' ' + s.id); }
    if (s.kind === 'travel' && !s.local) { var c2 = whereAt(s.parts[0].pid, s.day - 1); if (c2 && c2 !== s.from && W.byStep && !stays.some(function (x) { return x.parts[0].pid === s.parts[0].pid && x.to === s.day; })) flag('travels from wrong city', i + ' ' + s.parts[0].name + ' from ' + s.from + ' but stayed in ' + c2); }
    if (s.kind === 'acquire' && s.mode === 'supplier') { var c3 = whereAt(s.parts[0].pid, s.day); var c4 = W.P[s.parts[1].pid].homeCity; if (c3 && c3 !== c4) flag('acquire elsewhere', i + ' buyer in ' + c3 + ' supplier in ' + c4); }
  });
  var act = W.actStep;
  act.parts.forEach(function (x) { var c = whereAt(x.pid, W.D) || W.P[x.pid].homeCity; if (c !== W.actCity) flag('actor not in act city', i + ' ' + x.name + ' (' + W.P[x.pid].role + ') in ' + c); });
}
console.log(JSON.stringify(issues, null, 1));
console.log(JSON.stringify(examples, null, 1));
