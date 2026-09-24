// Autosave/continue: play a few days, reload, Continue, check the game resumes where it was.
var pw = require('playwright'), path = require('path');
var PAGE = path.resolve(process.argv[2]);
(async function () {
  var b = await pw.chromium.launch(), errs = [];
  var ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  var p = await ctx.newPage();
  p.on('pageerror', function (e) { errs.push(e.message); });
  await p.goto('file://' + PAGE); await p.evaluate(function () { localStorage.clear(); }); await p.reload();
  await p.fill('#t-seed', '314'); await p.locator('#t-new').tap();
  await p.waitForSelector('#actcard.on #act-go', { timeout: 300000 }); await p.locator('#act-go').tap();
  var before = await p.evaluate(function () { UIA.cases().forEach(function (c) { UIA.doAct('interview', c.pid); UIA.doAct('test', c.pid); }); for (var i = 0; i < 4; i++) UIA.endDay(); UI.refresh(); UI.go('cases'); UI.save(); return { day: UIA.day(), cases: UIA.cases().length, msgs: UIA.inbox().length }; });
  await p.reload(); await p.waitForTimeout(600);
  var cont = await p.locator('#t-cont').count();
  await p.locator('#t-cont').tap(); await p.waitForTimeout(800);
  var after = await p.evaluate(function () { return { day: UIA.day(), cases: UIA.cases().length, msgs: UIA.inbox().length, tab: UIS.tab }; });
  console.log('continue button:', !!cont, 'before', JSON.stringify(before), 'after', JSON.stringify(after), errs.length ? 'ERR ' + errs.join(' | ') : 'no page errors');
  await b.close();
})();
