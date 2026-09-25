// Walks the guided first case by touch on a phone: every coach step, a real COPY with the
// fine tuning done by dragging the trace on the display, the tabs, the end. Screenshots each step.
// usage: NODE_PATH=$(npm root -g) node tests/ui/tutorial.js <page.html> [outdir]
var pw = require('playwright'), path = require('path'), fs = require('fs');
var PAGE = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3] || '/tmp/claude-0/depth-ui');
fs.mkdirSync(OUT, { recursive: true });
(async function () {
  var browser = await pw.chromium.launch(), errs = [];
  var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  var page = await ctx.newPage();
  page.on('pageerror', function (e) { errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1]); });
  page.on('console', function (m) { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto('file://' + PAGE);
  await page.evaluate(function () { try { localStorage.clear(); } catch (e) {} });
  await page.reload(); await page.waitForTimeout(600);
  await page.locator('#t-tut').tap();
  await page.waitForSelector('#nc-go'); await page.locator('#nc-go').tap(); await page.waitForTimeout(700);
  var n = 0;
  async function shot(nm) { n++; await page.screenshot({ path: path.join(OUT, 'tut-' + String(n).padStart(2, '0') + '-' + nm + '.png') }); }
  async function step() { return page.evaluate(function () { var s = UICoach.step(); return s ? { i: UIS.coach && UIS.coach.i, title: s.title, wait: s.wait || null } : null; }); }
  for (var guard = 0; guard < 30; guard++) {
    var s = await step();
    if (!s) break;
    await page.waitForTimeout(500);
    await shot(s.title.replace(/\W+/g, '-').toLowerCase());
    if (!s.wait) { await page.locator('#co-card [data-c=next]').tap(); continue; }
    if (s.wait === 'waited') await page.locator('.sb-btns .next').tap();
    else if (s.wait === 'copyready') {
      // drag the trace onto the hairline (narrow span: drag = fine tuning)
      for (var k = 0; k < 6; k++) {
        var err = await page.evaluate(function () { var sg = UIA.band().now.filter(function (x) { return !x.bcast; })[0]; if (UIS.rx.mode !== (sg.mode === 'voice' ? 'voice' : 'cw')) UI$('#rx-mode [data-m=' + (sg.mode === 'voice' ? 'voice' : 'cw') + ']').click(); return UIS.rx.freq * 1000 - sg.freq * 1000; });
        if (Math.abs(err) < 0.25) break;
        var box = await page.locator('#rx-ov').boundingBox(), kpp = 6 / box.width, dx = err / kpp;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + dx / 2, box.y + box.height / 2, { steps: 4 }); await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2, { steps: 4 }); await page.mouse.up();
        await page.waitForTimeout(250);
      }
    }
    else if (s.wait === 'copystart') await page.locator('#rx-copy').tap();
    else if (s.wait === 'copied') {
      // hold it: keep correcting the drift by dragging the trace back onto the line
      for (var t = 0; t < 60; t++) {
        var e2 = await page.evaluate(function () { return UIRx.err(); });
        if (e2 !== null && Math.abs(e2) > 0.12) {
          var bx = await page.locator('#rx-ov').boundingBox(), px = e2 / (6 / bx.width);
          await page.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await page.mouse.down();
          await page.mouse.move(bx.x + bx.width / 2 + px, bx.y + bx.height / 2, { steps: 3 }); await page.mouse.up();
        }
        await page.waitForTimeout(350);
        var done = await page.evaluate(function () { return !UIRx.listening(); });
        if (done) break;
        if (t === 40) await page.locator('#rx-copy').tap();
      }
      await page.waitForTimeout(1500);
    }
    else if (/^tab:/.test(s.wait)) await page.locator('#tabbar .tab[data-tab=' + s.wait.slice(4) + ']').tap();
    await page.waitForTimeout(700);
    for (var q = 0; q < 3; q++) { var ex = await page.$('#ex-ok'); if (ex) { await ex.click(); await page.waitForTimeout(300); } }
    var s2 = await step();
    if (s2 && s2.i === s.i) { console.log('stuck at step', s.i, s.title, s.wait); await shot('stuck'); break; }
  }
  var fin = await page.evaluate(function () { return { coach: UICoach.active(), log: UIA.log().filter(function (e) { return !e.faint; }).length, q: (UIA.log().filter(function (e) { return !e.faint; })[0] || {}).quality }; });
  console.log('tutorial finished: coach active=' + fin.coach + ', copied=' + fin.log + ', first copy quality=' + fin.q);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
  await browser.close();
})().catch(function (e) { console.error('FAILED', e); process.exit(1); });
