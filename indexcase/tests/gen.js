#!/usr/bin/env node
// Dump a generated game: pathogen card, city, the alert, ghost-city curve, and (optionally) a scripted playthrough's inbox.
// Usage: node tests/gen.js <seed> [--grade=x] [--play=N] [--truth-only] [--out=file]
var IX = require('./load.js')();
var fs = require('fs');
var args = process.argv.slice(2);
var seed = args.filter(function (a) { return a[0] !== '-'; })[0] || '1';
function opt(k, d) { var a = args.filter(function (x) { return x.indexOf('--' + k + '=') === 0; })[0]; return a ? a.split('=')[1] : d; }
var grade = opt('grade', 'consultant'), play = +opt('play', 0), out = [];
function p(s) { out.push(s === undefined ? '' : String(s)); }
var t0 = Date.now();
var g = IX.newGame(seed, { grade: grade });
var P = g.P, C = g.C, card = g.truthCard();
p('INDEX CASE — seed ' + seed + ' (attempt ' + g.attempt + ', grade ' + grade + ', generated in ' + (Date.now() - t0) + ' ms)');
p('verify: ' + JSON.stringify(g._verify, ['ok', 'fails', 'infAtAlert', 'realAtAlert', 'ghost', 'infections', 'deaths', 'hosp', 'peakDay', 'attack', 'proxy', 'single', 'nonHH', 'hh', 'adm', 'bigEvents', 'food', 'spill', 'infW', 'window', 'missing']));
p();
p('== PATHOGEN (' + P.archetype + ')');
p('route ' + P.route + (P.route === 'animal' ? ' (person to person: ' + P.humanRoute + ', spill rate ' + P.spillRate + '/day)' : '') + ', source ' + P.source);
p('incubation ' + P.incMean + ' d (sd ' + P.incSd + '), presymptomatic days ' + P.preDays + ', target presym ' + P.presym + ' asym ' + P.asym + ' R ' + P.R + ' IFR ' + (100 * P.ifr).toFixed(2) + '% (' + P.ageRisk + '), IHR ' + (100 * P.ihr).toFixed(1) + '%');
p('symptoms: ' + P.symptoms.map(function (s) { return s.id + ' ' + Math.round(100 * s.p) + '%'; }).join(', ') + (P.tell ? '  TELL: ' + P.tell : '  (no tell)'));
p('PCR window ' + P.detFrom + '..+' + P.detTo + ' d from onset, sens ' + P.sens + '; mutation ' + P.mutRate + '/transmission (' + P.mutLabel + '); variant ' + JSON.stringify(P.variant) + '; treatment ' + P.treatment + ' (' + P.treatEffect + ')');
p('calibration: beta ' + P.beta + ', preW ' + P.preW + ', ' + JSON.stringify(P.calib));
p('realised (card): ' + JSON.stringify(card, ['route', 'incubation', 'presym', 'asym', 'R', 'ifr', 'ifrExpected', 'ihr', 'ageRisk', 'originCase']));
p();
p('== CITY ' + C.name + ' (' + IX.fmt(C.population) + ' people as ' + C.N + ' residents; x' + C.scale + ')');
C.districts.forEach(function (d) { p('  ' + d.id + ' ' + d.name.padEnd(20) + d.type.padEnd(9) + ' pop ' + String(d.pop).padStart(4) + '  deprivation ' + d.deprivation); });
var kinds = {}; C.places.forEach(function (q) { kinds[q.kind] = (kinds[q.kind] || 0) + 1; });
p('  places: ' + Object.keys(kinds).map(function (k) { return k + ' ' + kinds[k]; }).join(', '));
p('  primary case: ' + g.name(g.sim.primary) + ' (' + C.age[g.sim.primary] + ', ' + g.occLabel(g.sim.primary) + '), infected sim day 0; alert sim day ' + g.S.alertSd + ' with ' + g.sim.n + ' infected');
p();
if (args.indexOf('--truth-only') < 0) {
  p('== INBOX, DAY 1 (' + g.dateLong(0) + ')');
  g.inbox().forEach(function (m) { try { p(IX.msgText(m)); } catch (e) { console.error('BAD', m.title, JSON.stringify(m.body).slice(0, 400)); throw e; } p(); });
}
// ghost curve
var gh = g.ghost().sim;
var wk = [], wd = [], wh = [];
for (var d = 0; d < IX.DAY_LIMIT; d += 7) { var a = 0, b = 0, h = 0; gh.daily.forEach(function (q) { var gd = g.gd(q.sd); if (gd >= d && gd < d + 7) { a += q.newInf; b += q.deaths; h = Math.max(h, q.hosp); } }); wk.push(a); wd.push(b); wh.push(h); }
p('== GHOST CITY (nobody acts), weekly from the alert');
p('  infections ' + wk.join(' '));
p('  deaths     ' + wd.join(' '));
p('  peak beds  ' + wh.join(' ') + '   (beds ' + g.sim.baseBeds + ', ICU ' + g.sim.baseIcu + ')');
p('  total: ' + gh.n + ' infections (' + Math.round(100 * gh.n / C.N) + '%), ' + gh.daily.reduce(function (s, q) { return s + q.deaths; }, 0) + ' deaths');
if (play) {
  p();
  p('== PLAYTHROUGH (headless solver, ' + play + ' days)');
  var before = g.S.msgs.length;
  var rep = IX.solve(g, { until: play });
  g.S.msgs.slice(before).forEach(function (m) { p('[' + g.dateLabel(m.day) + ' / day ' + (m.day + 1) + '] ' + IX.msgText(m)); p(); });
  p('solver: ' + JSON.stringify(rep, ['confirmed', 'community', 'traitDay', 'route', 'incubation', 'presym', 'asym', 'R', 'ifr', 'ageRisk']));
  p('estimates: ' + JSON.stringify(rep.estimates));
}
var text = out.join('\n');
var file = opt('out', null);
if (file) { fs.writeFileSync(file, text); console.log('wrote ' + file + ' (' + text.length + ' chars)'); } else console.log(text);
