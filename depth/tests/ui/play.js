// Plays whole cases in the built page on a phone (touch) with a simple competent strategy, mixing real
// UI actions (bench depth strip + crib, write-up sheet, warrant form, shift report) with adapter calls
// for the listening. Checks for page errors, the debrief, and Continue after a reload mid-case.
// usage: NODE_PATH=$(npm root -g) node tests/ui/play.js <page.html> [outdir] [seeds=101,202] [grades=cadet,analyst,chief]
var pw = require('playwright'), path = require('path'), fs = require('fs');
var PAGE = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3] || '/tmp/claude-0/depth-ui'), SEEDS = (process.argv[4] || '101,202').split(','), GRADES = (process.argv[5] || 'cadet,analyst,chief').split(',');
fs.mkdirSync(OUT, { recursive: true });
(async function () {
  var browser = await pw.chromium.launch(), errs = [], results = [];
  for (var grade of GRADES) for (var seed of SEEDS) {
    var ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true });
    var page = await ctx.newPage();
    page.on('pageerror', function (e) { errs.push(grade + '/' + seed + ' pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1]); });
    page.on('console', function (m) { if (m.type() === 'error') errs.push(grade + '/' + seed + ' console: ' + m.text()); });
    await page.goto('file://' + PAGE);
    await page.evaluate(function () { try { localStorage.clear(); } catch (e) {} });
    await page.reload(); await page.waitForTimeout(400);
    await page.fill('#t-seed', seed);
    await page.locator('.t-grade[data-g="' + grade + '"]').tap();
    var t0 = Date.now();
    await page.locator('#t-new').tap();
    await page.waitForSelector('#nc-go', { timeout: 30000 });
    var genMs = Date.now() - t0;
    await page.locator('#nc-go').tap(); await page.waitForTimeout(300);
    await page.evaluate(function () { Object.keys(UIExplain.T).forEach(function (k) { UIS.explained[k] = 1; }); });
    var ex = await page.$('#ex-ok'); if (ex) await ex.click();
    var nights = 0, reloaded = false;
    for (var night = 0; night < 6; night++) {
      if (await page.evaluate(function () { return UIA.over(); })) break;
      nights++;
      // listen all night (DF on the Morse sets)
      await page.evaluate(function () {
        var done = {}, guard = 0;
        while (UIA.clock().minute < 440 && guard++ < 300 && !UIA.over()) {
          var s = UIA.band().now.filter(function (x) { return !x.bcast && !done[x.id]; })[0];
          if (s) { done[s.id] = 1; if (s.mode !== 'voice') UIA.df(s.id, null); UIA.tune(s.id, { freqErr: 0.15, modeOk: true, driftHeld: 0.85 }); }
          else UIA.wait(5);
        }
        UI.refresh();
      });
      // bench: the first depth pair through the real strip (crib GREETINGS at the first likely mark), then a write-up
      var pair = await page.evaluate(function () { var p = UIA.depthPairs().filter(function (q) { var a = UIA.message(q[0]); return !(a.decrypted && a.decrypted.verdict === 'right'); })[0]; if (p) UIBench.depth(p[0], p[1]); return p; });
      if (pair && await page.$('#dp-crib')) {
        await page.waitForTimeout(300);
        await page.fill('#dp-crib', 'GREETINGS');
        await page.waitForTimeout(200);
        await page.evaluate(function () { var m = UI$('#dp-marks i'); if (m) { UIS.bench.offset = Math.round(parseFloat(m.style.left) / 26); UI$('#dp-crib').dispatchEvent(new Event('input')); } var b = UI$('#dp-pin'); if (b && !b.disabled) b.click(); });
        await page.waitForTimeout(250);
        await page.evaluate(function () { var b = UI$('[data-wr]'); if (b) b.click(); });
        await page.waitForTimeout(400);
        await page.evaluate(function () { var b = UI$('#wu-go'); if (b) b.click(); }); await page.waitForTimeout(300);
        await page.evaluate(function () { UIsheet.close(); });
      }
      // stuck? ask the supervisor to do it (tier 3) once a night after night 1
      if (night >= 1) await page.evaluate(function () { UI.go('desk'); UIDesk.sub('mentor'); var b = UI$('[data-tier="3"]'); if (b) b.click(); });
      await page.waitForTimeout(200);
      // act: a stake-out when the card says where (and when), through the warrant form
      var stake = await page.evaluate(function () { var c = UIA.opCard(); if (!(c.where.known && c.where.place)) return false; if (UIA.warrants().used.some(function (w) { return w.kind === 'stakeout' && w.target === c.where.place; })) return false; UIDesk.warrantForm('stakeout', c.where.place, c.when.night !== null ? c.when.night : null); return true; });
      if (stake) { await page.waitForTimeout(400); await page.evaluate(function () { var b = UI$('#wf-go'); if (b) b.click(); }); await page.waitForTimeout(300); }
      // mid-case: reload and Continue once
      if (night === 1 && !reloaded) {
        reloaded = true;
        await page.evaluate(function () { UI.save(); });
        await page.reload(); await page.waitForTimeout(600);
        var cont = await page.$('#t-cont'); if (!cont) errs.push(grade + '/' + seed + ': no Continue after reload');
        else { await cont.click(); await page.waitForTimeout(500); }
      }
      if (await page.evaluate(function () { return UIA.over(); })) break;
      // end the night through the menu flow
      await page.evaluate(function () { UIsheet.close(); UI.endShift(); });
      await page.waitForTimeout(500);
      var go = await page.$('#nc-go'); if (go) { await go.click(); await page.waitForTimeout(500); }
    }
    await page.waitForTimeout(800);
    var info = await page.evaluate(function () { var d = UIA.debrief(); return { over: UIA.over(), outcome: d.outcome && (d.outcome.kind + (d.outcome.win ? ' (win)' : '')), score: d.score.total, grade: d.score.grade, debriefShown: !UI$('#debrief').hidden, decrypts: UIA.messages().filter(function (m) { return m.decrypted; }).length }; });
    if (info.over && !info.debriefShown) { await page.evaluate(function () { UIDebrief.show(); }); await page.waitForTimeout(600); }
    await page.screenshot({ path: path.join(OUT, 'play-' + grade + '-' + seed + '-end.png') });
    results.push(Object.assign({ gradeId: grade, seed: seed, genMs: genMs, nights: nights }, info));
    await ctx.close();
  }
  await browser.close();
  results.forEach(function (r) { console.log(JSON.stringify(r)); });
  console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 30).join('\n') : 'no page errors');
})().catch(function (e) { console.error('FAILED', e); process.exit(1); });
