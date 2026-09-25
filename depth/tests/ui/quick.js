// Quick look: title + first screens at phone / landscape / desktop. Usage:
// NODE_PATH=$(npm root -g) node tests/ui/quick.js <page.html> <outdir> [tabs,comma,separated]
var pw = require('playwright'), path = require('path'), fs = require('fs');
var PAGE = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3] || '/tmp/claude-0/depth-ui'), TABS = (process.argv[4] || 'receiver').split(',');
var MODES = (process.env.MODES || 'phone,land,desk').split(',');
fs.mkdirSync(OUT, { recursive: true });
(async function () {
  var browser = await pw.chromium.launch(), errs = [];
  for (var mode of MODES) {
    var opt = mode === 'phone' ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : mode === 'land' ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } };
    var ctx = await browser.newContext(opt), page = await ctx.newPage();
    page.on('pageerror', function (e) { errs.push(mode + ' pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')); });
    page.on('console', function (m) { if (m.type() === 'error' || m.type() === 'warning') errs.push(mode + ' console.' + m.type() + ': ' + m.text()); });
    await page.goto('file://' + PAGE);
    await page.evaluate(function () { try { localStorage.clear(); } catch (e) {} });
    await page.reload(); await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, 'q-' + mode + '-title.png') });
    await page.evaluate(function () { UIBoot.start(process_seed(), 'analyst', false); function process_seed() { return '4471'; } });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, 'q-' + mode + '-nightcard.png') });
    await page.click('#nc-go'); await page.waitForTimeout(400);
    var ex = await page.$('#ex-ok'); if (ex) { await page.screenshot({ path: path.join(OUT, 'q-' + mode + '-explain.png') }); await ex.click(); await page.waitForTimeout(300); }
    if (process.env.SETUP) await page.evaluate(process.env.SETUP);
    for (var t of TABS) {
      await page.evaluate(function (t) { UI.go(t); }, t); await page.waitForTimeout(900);
      var ex2 = await page.$('#ex-ok'); if (ex2) { await ex2.click(); await page.waitForTimeout(300); }
      await page.screenshot({ path: path.join(OUT, 'q-' + mode + '-' + t + '.png') });
      if (mode === 'phone') await page.screenshot({ path: path.join(OUT, 'q-' + mode + '-' + t + '-full.png'), fullPage: false, clip: undefined });
    }
    await ctx.close();
  }
  await browser.close();
  console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 30).join('\n') : 'no page errors');
})().catch(function (e) { console.error('FAILED', e); process.exit(1); });
