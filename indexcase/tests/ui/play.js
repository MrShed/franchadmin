// Plays whole games in the built page (phone, touch) with a simple strategy through the UI's
// adapter, driving the real End Day flow by touch every few days. Checks for page errors,
// screenshots the debrief. usage: NODE_PATH=$(npm root -g) node tests/ui/play.js <page.html> <outdir> <seed> <grade> [maxDays]
var pw = require('playwright'), path = require('path'), fs = require('fs');
var PAGE = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3] || 'play'), SEED = process.argv[4] || '101', GRADE = process.argv[5] || 'consultant', MAXD = +(process.argv[6] || 200);
fs.mkdirSync(OUT, { recursive: true });
(async function () {
  var browser = await pw.chromium.launch(), errs = [];
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
  var page = await ctx.newPage();
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1]); });
  page.on('console', function (m) { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto('file://' + PAGE);
  await page.evaluate(function () { try { localStorage.clear(); } catch (e) {} });
  await page.reload(); await page.waitForTimeout(400);
  await page.fill('#t-seed', SEED);
  await page.locator('.t-grade[data-g="' + GRADE + '"]').tap();
  var t0 = Date.now();
  await page.locator('#t-new').tap();
  await page.waitForSelector('#actcard.on #act-go', { timeout: 300000 });
  var gen = Date.now() - t0;
  await page.locator('#act-go').tap();
  var stats = [];
  for (var day = 0; day < MAXD; day++) {
    var over = await page.evaluate(function () { return UIA.over(); });
    if (over) break;
    var r = await page.evaluate(function () {
      var t = performance.now(), did = 0;
      function tryA(id, tg, p) { var a = UIA.action(id); if (!a) return; var w = UIA.canAct(id, tg, p); if (w) return; var r = UIA.doAct(id, tg, p); if (r.ok) did++; }
      var cs = UIA.cases().slice().sort(function (a, b) { return (b.reported || 0) - (a.reported || 0); });
      cs.slice(0, 12).forEach(function (c) { if (!c.interviewed && c.status !== 'died') tryA('interview', c.pid); });
      cs.slice(0, 20).forEach(function (c) { if (UIA.testState(c) === 'none') tryA('test', c.pid); });
      cs.forEach(function (c) { if (UIA.testState(c) === 'pos' && !c.seqId) tryA('sequence', c.pid); });
      cs.slice(0, 6).forEach(function (c) { if (UIA.testState(c) === 'pos' && !c.traced) tryA('trace', c.pid); });
      cs.slice(0, 2).forEach(function (c) { if (UIA.testState(c) === 'pos' && !c.household) tryA('household', c.pid); });
      tryA('declare_novel', null, {});
      UIA.clusters().slice(0, 2).forEach(function (k) { if (k.place) tryA('site_visit', k.place); });
      // messages needing an answer
      UIA.inbox().forEach(function (m) { if (m.choices && !m.answered) UIA.answer(m.id, m.choices[m.choices.length - 1].id); });
      var act = UIA.actNo(), day = UIA.day();
      if (act >= 2 && day % 4 === 0) {
        var e = UIA.estimates(), vals = {};
        e.traits.forEach(function (t) { if (!t.key) return; if (t.type === 'choice') vals[t.id] = t.options[0].id; else if (t.type === 'pct') vals[t.id] = (t.min + t.max) / 3; else if (t.type === 'number') vals[t.id] = (t.min + t.max) / 3; });
        UIA.publish(vals);
      }
      if (act >= 2) ['isolate', 'quarantine'].forEach(function (o) { tryA(o, null, {}); });
      if (act >= 3) ['masks', 'surge', 'care_homes', 'wastewater'].forEach(function (o) { tryA(o, null, {}); });
      UI.refresh();
      return { day: day, act: act, cases: UIA.cases().length, did: did, ms: Math.round(performance.now() - t) };
    });
    var te = Date.now();
    if (day % 5 === 0) {
      await page.locator('#tb-end').tap(); await page.waitForTimeout(200);
      await page.locator('#pop-end').tap(); await page.waitForTimeout(3300);
      var ac = await page.locator('#actcard.on #act-go').count(); if (ac) { await page.screenshot({ path: path.join(OUT, 'act-' + day + '.png') }); await page.locator('#act-go').tap(); await page.waitForTimeout(400); }
    } else {
      await page.evaluate(function () { var r = UIA.endDay(); UI.save(); UI.refresh(); if (UIA.over()) UIDebrief.show(); });
    }
    r.endMs = Date.now() - te;
    stats.push(r);
    if (day % 10 === 0) { var tabs = ['map', 'cases', 'lab', 'actions', 'brief']; await page.evaluate(function (t) { if (!UIA.over()) UI.go(t); }, tabs[(day / 10) % 5]); await page.waitForTimeout(300); await page.screenshot({ path: path.join(OUT, 'day' + String(day).padStart(3, '0') + '.png') }); }
  }
  await page.evaluate(function () { if (!UIA.over()) { UIA.standDown(); } UIDebrief.show(); });
  await page.waitForTimeout(1200);
  var info = await page.evaluate(function () { var D = UIA.debriefN(); return { outcome: D.outcome, deaths: D.totals.deaths, ghost: D.totals.ghostDeaths, inf: D.totals.infections, day: UIA.day(), act: UIA.actNo(), score: D.score }; });
  for (var k = 0; k < 4; k++) { await page.evaluate(function (k) { var d = document.getElementById('debrief'); document.querySelectorAll('.db-sec,#pc').forEach(function (e) { e.classList.add('in'); }); d.scrollTop = k * d.clientHeight * 1.2; }, k); await page.waitForTimeout(500); await page.screenshot({ path: path.join(OUT, 'debrief' + k + '.png') }); }
  // reload and continue from save
  await page.reload(); await page.waitForTimeout(800);
  var cont = await page.locator('#t-cont').count();
  var slow = stats.filter(function (s) { return s.endMs > 3000; }).length;
  console.log(JSON.stringify({ seed: SEED, grade: GRADE, genMs: gen, days: stats.length, lastAct: info.act, outcome: info.outcome && info.outcome.kind, deaths: info.deaths, ghost: info.ghost, infections: info.inf, score: info.score && info.score.total, avgEndMs: Math.round(stats.reduce(function (s, x) { return s + x.endMs; }, 0) / Math.max(1, stats.length)), slowDays: slow, continueShownAfterEnd: !!cont }));
  console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 20).join('\n') : 'no page errors');
  await browser.close();
})().catch(function (e) { console.error('FAILED', e); process.exit(1); });
