// Screenshot tour of every screen at phone (390x844, touch) and desktop (1280x800).
// usage: NODE_PATH=$(npm root -g) node tests/ui/shots.js <page.html> <outdir> [seed] [grade]
var pw = require('playwright'), path = require('path'), fs = require('fs');
var PAGE = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3] || 'shots'), SEED = process.argv[4] || '4471', GRADE = process.argv[5] || 'consultant';
fs.mkdirSync(OUT, { recursive: true });
(async function () {
  var browser = await pw.chromium.launch();
  var errs = [];
  for (var mode of ['phone', 'desk']) {
    var ctx = await browser.newContext(mode === 'phone' ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    var page = await ctx.newPage();
    page.on('pageerror', function (e) { errs.push(mode + ' pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')); });
    page.on('console', function (m) { if (m.type() === 'error') errs.push(mode + ' console: ' + m.text()); });
    var n = 0;
    async function shot(name, full) { n++; await page.waitForTimeout(350); await page.screenshot({ path: path.join(OUT, mode + '-' + String(n).padStart(2, '0') + '-' + name + '.png'), fullPage: !!full }); }
    async function tap(sel) { var el = page.locator(sel).first(); if (mode === 'phone') await el.tap(); else await el.click(); await page.waitForTimeout(250); }
    await page.goto('file://' + PAGE);
    await page.evaluate(function () { try { localStorage.clear(); } catch (e) {} });
    await page.reload();
    await page.waitForTimeout(700);
    await shot('title');
    await page.fill('#t-seed', SEED);
    await tap('.t-grade[data-g="' + GRADE + '"]');
    await tap('#t-new');
    await page.waitForSelector('#actcard.on #act-go', { timeout: 180000 });
    await page.waitForTimeout(2600);
    await shot('actcard');
    await tap('#act-go');
    await page.waitForTimeout(400);
    await shot('brief');
    await tap('.ib-it.urgent');
    await shot('reader');
    await tap('#br-doc .lnk.p');
    await page.waitForTimeout(400);
    await shot('person');
    var iv = page.locator('#sheet [data-ta="interview"]');
    if (await iv.count()) { await tap('#sheet [data-ta="interview"]'); await page.waitForTimeout(500); }
    var ts = page.locator('#sheet [data-ta="test"]');
    if (await ts.count() && await ts.isEnabled()) { await tap('#sheet [data-ta="test"]'); await page.waitForTimeout(500); }
    await shot('person-after');
    await page.evaluate(function () { UIsheet.close(); });
    // interview + test all first cases
    await page.evaluate(function () { UIA.cases().forEach(function (c) { UIA.doAct('interview', c.pid); UIA.doAct('test', c.pid); }); UI.refresh(); });
    await tap('.tab[data-tab=map]:visible');
    await page.waitForTimeout(800);
    await shot('map');
    await tap('#mp-layers [data-l=ww]');
    await shot('map-ww');
    await tap('.tab[data-tab=cases]:visible');
    await shot('cases-list');
    await tap('#cs-sub [data-s=curve]');
    await shot('cases-curve', true);
    await tap('#cs-sub [data-s=ages]');
    await shot('cases-ages');
    await tap('.tab[data-tab=lab]:visible');
    await shot('lab', true);
    await tap('.tab[data-tab=actions]:visible');
    await shot('actions', true);
    await tap('.ac-card[data-a="masks"]');
    await shot('confirm');
    await page.evaluate(function () { UIsheet.close(); });
    await page.waitForTimeout(300);
    await tap('#tb-end');
    await shot('endpop');
    await tap('#pop-end');
    await page.waitForTimeout(1500);
    await shot('night');
    await page.waitForTimeout(2200);
    // play some days headlessly through the adapter
    for (var d = 0; d < 6; d++) {
      await page.evaluate(function () {
        UIA.cases().forEach(function (c) { if (!c.interviewed) UIA.doAct('interview', c.pid); if (UIA.testState(c) === 'none') UIA.doAct('test', c.pid); if (UIA.testState(c) === 'pos' && !c.seqId) UIA.doAct('sequence', c.pid); });
        var dec = UIA.action('declare_novel'); if (dec && dec.available) UIA.doAct('declare_novel', null);
        UIA.endDay(); UI.refresh();
      });
    }
    await page.evaluate(function () { UI.go('brief'); });
    await shot('brief-later');
    await page.evaluate(function () { var m = UIA.inbox().filter(function (x) { return x.kind === 'mayor'; })[0]; if (m) UIBrief.openMsg(m.id); });
    await shot('mayor');
    await page.evaluate(function () { var m = UIA.inbox().filter(function (x) { return x.kind === 'press'; })[0]; if (m) UIBrief.openMsg(m.id); });
    await shot('press');
    await page.evaluate(function () { UIBrief.closeMsg(); UIS.brief.sub = 'est'; UIBrief.render(); });
    await shot('estimates', true);
    await page.evaluate(function () { UIS.brief.sub = 'mentor'; UIBrief.render(); });
    await tap('[data-tier="0"]');
    await shot('mentor');
    await page.evaluate(function () { UI.go('lab'); });
    await shot('lab-later', true);
    var hasTree = await page.locator('[data-tree-open]').count();
    if (hasTree) { await tap('[data-tree-open]'); await page.waitForTimeout(500); await shot('tree'); await page.evaluate(function () { var x = document.querySelector('.tv [data-x]'); if (x) x.click(); }); }
    await page.evaluate(function () { UI.go('map'); });
    await page.waitForTimeout(600);
    await shot('map-later');
    await page.evaluate(function () { UI.resourceSheet(); });
    await shot('resources');
    await page.evaluate(function () { UIsheet.close(); UIA.standDown(); UIDebrief.show(); });
    await page.waitForTimeout(1500);
    await page.evaluate(function () { document.querySelectorAll('.db-sec,#pc').forEach(function (e) { e.classList.add('in'); }); });
    await page.waitForTimeout(1200);
    for (var k = 0; k < 7; k++) { await page.evaluate(function (k) { var d = document.getElementById('debrief'); d.scrollTop = k * d.clientHeight * 0.9; }, k); await shot('debrief' + k); }
    await ctx.close();
  }
  await browser.close();
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no page errors');
})().catch(function (e) { console.error('FAILED', e); process.exit(1); });
