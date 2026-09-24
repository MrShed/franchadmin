// Walks the guided first case by touch, following the coach marks. Screenshots each step.
// usage: NODE_PATH=$(npm root -g) node tests/ui/tutorial.js <page.html> <outdir>
var pw = require('playwright'), path = require('path'), fs = require('fs');
var PAGE = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3] || 'tut');
fs.mkdirSync(OUT, { recursive: true });
(async function () {
  var browser = await pw.chromium.launch(), errs = [];
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  var page = await ctx.newPage();
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto('file://' + PAGE);
  await page.evaluate(function () { try { localStorage.clear(); } catch (e) {} });
  await page.reload(); await page.waitForTimeout(500);
  await page.locator('#t-tut').tap(); await page.waitForSelector('#actcard.on #act-go', { timeout: 300000 }); await page.waitForTimeout(2600);
  await page.locator('#act-go').tap(); await page.waitForTimeout(600);
  var n = 0;
  async function shot(name) { n++; await page.waitForTimeout(450); await page.screenshot({ path: path.join(OUT, String(n).padStart(2, '0') + '-' + name + '.png') }); }
  for (var guard = 0; guard < 40; guard++) {
    var st = await page.evaluate(function () { var s = UICoach.step(); return s ? { i: UIS.coach.i, title: s.title, wait: s.wait || null } : null; });
    if (!st) break;
    await shot('step' + st.i);
    if (!st.wait) { await page.locator('#co-card [data-c=next]').tap(); continue; }
    // do what the spotlight asks: tap the element under the spotlight
    var box = await page.evaluate(function () { var s = document.getElementById('co-spot').getBoundingClientRect(); return { x: s.left + s.width / 2, y: s.top + s.height / 2, w: s.width }; });
    if (!box.w) { console.log('no target for', st.title); break; }
    await page.touchscreen.tap(box.x, box.y);
    await page.waitForTimeout(900);
    if (st.wait === 'morning') await page.waitForTimeout(3500);
  }
  await shot('end');
  console.log('coach steps walked:', n, errs.length ? '\nERRORS:\n' + errs.join('\n') : 'no page errors');
  await browser.close();
})().catch(function (e) { console.error('FAILED', e); process.exit(1); });
