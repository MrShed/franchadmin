#!/usr/bin/env node
// Run the headless solver over many seeds.
// Usage: node tests/solve.js [from..to | N] [--raw] [--template=rifle] [--level=probationer|officer|head] [--verbose]
//   default: seeds 1..200 through CX.newCase (with generation retries).
//   --raw: evaluate only generation attempt 0 of each seed (no retries) to see the raw rate.
var CX = require('./load.js')();
var args = process.argv.slice(2);
var range = (args.filter(function (a) { return a.charAt(0) !== '-'; })[0] || '1..200').split('..');
var from = +range[0], to = range.length > 1 ? +range[1] : +range[0];
if (range.length === 1) { from = 1; to = +range[0]; }
var raw = args.indexOf('--raw') >= 0, verbose = args.indexOf('--verbose') >= 0;
var tArg = args.filter(function (a) { return /^--template=/.test(a); })[0];
var template = tArg ? tArg.split('=')[1] : undefined;
var lArg = args.filter(function (a) { return /^--level=/.test(a); })[0];
var level = lArg ? lArg.split('=')[1] : undefined;
var LV = CX.level(level);
var gopts = { template: template, level: level };

var n = 0, ok = 0, attempts = 0, t0 = Date.now();
var sum = { mh: 0, ratio: 0, hours: 0, queries: 0, docs: 0, day: 0, D: 0, net: 0, aliases: 0, cities: 0, events: 0, minClues: 0, warrants: 0, methodLead: 0, eventLead: 0, entries: 0, innocents: 0, herrings: 0 };
var byT = {}, failReasons = {}, clueKinds = {}, ratios = [], minH = [];
for (var s = from; s <= to; s++) {
  n++;
  var rep, W, attempt = 0;
  if (raw) {
    try { W = CX.buildWorld(String(s), gopts); CX.makeTraces(W); } catch (e) { console.log(s, 'GEN ERROR', e.message); failReasons['gen: ' + e.message] = (failReasons['gen: ' + e.message] || 0) + 1; continue; }
    rep = CX.solveWorld(W);
  } else {
    var cs = CX.newCase(String(s), gopts);
    W = cs._w; rep = cs._verify; attempt = cs.attempt;
    rep = rep || { solved: false, fails: ['no report'] };
  }
  // effort: the smallest daily budget with which the ideal analyst solves the case
  var mh = rep.solved ? CX.minDailyHours(W) : { hours: null };
  if (mh.hours) { rep = mh.rep; rep.solved = true; minH.push(mh.hours); }
  attempts += attempt + 1;
  var t = W.templateKey;
  byT[t] = byT[t] || { n: 0, ok: 0, ratio: 0 };
  byT[t].n++;
  if (rep.solved) {
    ok++; byT[t].ok++;
    var ratio = mh.hours / W.dayHours; ratios.push(ratio);
    byT[t].ratio += ratio;
    sum.mh += mh.hours; sum.ratio += ratio; sum.hours += rep.hours; sum.queries += rep.queries; sum.docs += rep.docs; sum.day += rep.day; sum.D += W.D;
    sum.minClues += rep.minClues; sum.warrants += rep.warrants.length;
    sum.methodLead += (rep.methodDay === null ? rep.day : rep.methodDay); sum.eventLead += (rep.eventDay === null ? rep.day : rep.eventDay);
    rep.clues.forEach(function (k) { clueKinds[k] = (clueKinds[k] || 0) + 1; });
  } else {
    (rep.fails || []).forEach(function (f) { var k = f.replace(/ [A-ZÀ-Ž][^()]*\(/, ' X (').replace(/\d+/g, '#'); failReasons[k] = (failReasons[k] || 0) + 1; });
    if (!rep.linkOK) failReasons['[links]'] = (failReasons['[links]'] || 0) + 1;
    if (!rep.methodOK) failReasons['[method]'] = (failReasons['[method]'] || 0) + 1;
    if (!rep.eventOK) failReasons['[event]'] = (failReasons['[event]'] || 0) + 1;
    if (!rep.warrantOK) failReasons['[warrants]'] = (failReasons['[warrants]'] || 0) + 1;
    if (rep.solved === false && rep.linkOK && rep.methodOK && rep.eventOK && rep.warrantOK) failReasons['[minClues<2 or ratio]'] = (failReasons['[minClues<2 or ratio]'] || 0) + 1;
  }
  sum.net += W.network.length; sum.aliases += W.persons.reduce(function (a, p) { return a + (p.net ? p.idents.length - 1 : 0); }, 0);
  sum.cities += W.cities.length; sum.events += W.events.length; sum.entries += W.entries.length;
  sum.innocents += W.innocents.length; sum.herrings += W.herrings.length;
  if (verbose || !rep.solved) console.log(s, t, rep.solved ? 'OK' : 'FAIL', 'att', attempt, 'minH', mh.hours, 'day', rep.day, '/', W.D, 'h', rep.hours, '/', rep.available, 'q', rep.queries, 'clues', (rep.clues || []).join(','), 'min', rep.minClues, 'war', (rep.warrants || []).join(','), rep.solved ? '' : JSON.stringify(rep.fails), (rep.roleWrong && rep.roleWrong.length ? 'ROLEWRONG ' + rep.roleWrong.join('; ') : ''));
}
function avg(x) { return ok ? (x / ok).toFixed(2) : '-'; }
function avgN(x) { return (x / n).toFixed(2); }
ratios.sort(function (a, b) { return a - b; });
console.log('\n==== ' + n + ' seeds' + (raw ? ' (raw attempt 0)' : ' (with retries)') + ' grade ' + LV.label + ' (' + LV.dayHours + 'h/day, accept at ' + LV.acceptCap + 'h' + (LV.easyCap ? ', not at ' + LV.easyCap + 'h' : '') + ')' + (template ? ' template ' + template : '') + ' in ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
console.log('solvable: ' + ok + '/' + n + ' = ' + (100 * ok / n).toFixed(1) + '%   generation attempts per case: ' + (attempts / n).toFixed(2));
console.log('ideal analyst needs min daily team-hours: mean ' + avg(sum.mh) + ' of ' + LV.dayHours + ';  as a share of the day: mean ' + avg(sum.ratio) + '  min ' + (ratios[0] || 0).toFixed(2) + '  median ' + (ratios[Math.floor(ratios.length / 2)] || 0).toFixed(2) + '  max ' + (ratios[ratios.length - 1] || 0).toFixed(2));
var hist = {}; minH.forEach(function (h) { hist[h] = (hist[h] || 0) + 1; });
console.log('  histogram of min daily hours: ' + Object.keys(hist).sort(function (a, b) { return a - b; }).map(function (h) { return h + 'h:' + hist[h]; }).join('  '));
console.log('at that budget — solver: hours ' + avg(sum.hours) + ', queries ' + avg(sum.queries) + ', docs ' + avg(sum.docs) + ', solved on day ' + avg(sum.day) + ' of D=' + avg(sum.D) + ' (method known day ' + avg(sum.methodLead) + ', event day ' + avg(sum.eventLead) + ')');
console.log('plot clues used ' + JSON.stringify(clueKinds) + '; min clues needed ' + avg(sum.minClues) + '; warrantable members ' + avg(sum.warrants));
console.log('world: network ' + avgN(sum.net) + ', network aliases ' + avgN(sum.aliases) + ', innocents ' + avgN(sum.innocents) + ', herrings ' + avgN(sum.herrings) + ', cities ' + avgN(sum.cities) + ', events ' + avgN(sum.events) + ', records ' + avgN(sum.entries));
console.log('by template: ' + Object.keys(byT).map(function (k) { return k + ' ' + byT[k].ok + '/' + byT[k].n + (byT[k].ok ? ' r=' + (byT[k].ratio / byT[k].ok).toFixed(2) : ''); }).join(', '));
if (Object.keys(failReasons).length) console.log('fail reasons: ' + JSON.stringify(failReasons, null, 1));
