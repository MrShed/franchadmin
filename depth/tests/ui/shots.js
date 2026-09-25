// Screenshot tour of every screen with real content, at phone (390x844 touch, DPR 2),
// phone landscape (844x390) and desktop (1280x800). Drives the title and the receiver
// by touch, then plays the rest of the night through the UI adapter (UIA) so the map,
// bench, traffic, desk, van and debrief have material on them.
// usage: NODE_PATH=$(npm root -g) node tests/ui/shots.js <page.html> [outdir] [seed] [grade]
var pw = require('playwright'), path = require('path'), fs = require('fs');
var PAGE = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3] || '/tmp/claude-0/depth-ui'), SEED = process.argv[4] || '4471', GRADE = process.argv[5] || 'analyst';
var MODES = (process.env.MODES || 'phone,land,desk').split(',');
fs.mkdirSync(OUT, { recursive: true });
var AUTO = function () {
  // copy everything on the air tonight (DF on the Morse sets first), band-watching in 5-minute steps
  window.__done = window.__done || {};
  var guard = 0, n = 0;
  while (UIA.clock().minute < 430 && guard++ < 300 && !UIA.over()) {
    var s = UIA.band().now.filter(function (x) { return !x.bcast && !window.__done[x.id]; })[0];
    if (s) { window.__done[s.id] = 1; if (s.mode !== 'voice') { var d = UIA.df(s.id, null); if (d.ok) UIRx.liveDf[s.id] = { bearings: d.bearings, fix: d.fix, callsign: s.label, t: UIA.clock().abs, freq: s.freq }; } UIA.tune(s.id, { freqErr: 0.25, modeOk: true, driftHeld: 0.9 }); n++; }
    else UIA.wait(5);
  }
  UI.refresh(); UI.save();
  return n;
};
(async function () {
  var browser = await pw.chromium.launch(), errs = [];
  for (var mode of MODES) {
    var opt = mode === 'phone' ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : mode === 'land' ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 };
    var ctx = await browser.newContext(opt), page = await ctx.newPage();
    page.on('pageerror', function (e) { errs.push(mode + ' pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')); });
    page.on('console', function (m) { if (m.type() === 'error' || m.type() === 'warning') errs.push(mode + ' console.' + m.type() + ': ' + m.text()); });
    var n = 0;
    async function shot(name, o) { n++; await page.waitForTimeout((o && o.wait) || 450); await page.screenshot({ path: path.join(OUT, mode + '-' + String(n).padStart(2, '0') + '-' + name + '.png'), fullPage: !!(o && o.full) }); }
    async function tap(sel) { var el = page.locator(sel).first(); if (mode === 'desk') await el.click(); else await el.tap(); await page.waitForTimeout(260); }
    async function closeExplain() { for (var i = 0; i < 3; i++) { var ex = await page.$('#ex-ok'); if (!ex) return; await ex.click(); await page.waitForTimeout(300); } }
    async function ev(f, a) { return page.evaluate(f, a); }
    await page.goto('file://' + PAGE);
    await ev(function () { try { localStorage.clear(); } catch (e) {} });
    await page.reload(); await page.waitForTimeout(900);
    await shot('title');
    await page.fill('#t-seed', SEED);
    await tap('.t-grade[data-g="' + GRADE + '"]');
    await tap('#t-new');
    await page.waitForSelector('#nc-go', { timeout: 20000 });
    await shot('nightcard', { wait: 700 });
    await tap('#nc-go'); await page.waitForTimeout(500);
    await shot('explain-receiver');
    await closeExplain();
    await shot('receiver');
    // wait for the first broadcast from the schedule strip, then copy it by touch
    await tap('[data-w=next]:visible'); await page.waitForTimeout(900);
    await shot('receiver-tuned');
    // centre it with the fine knob programmatically (what a player does by turning)
    await ev(function () { var s = UIA.band().now.filter(function (x) { return !x.bcast; })[0]; if (s) { UIS.rx.freq = s.freq; UIS.rx.mode = s.mode === 'voice' ? 'voice' : 'cw'; UIRx.refresh(); } });
    await page.waitForTimeout(500);
    await tap('#rx-copy'); await page.waitForTimeout(400);
    await closeExplain();
    await page.waitForTimeout(3500);
    await shot('receiver-holding');
    await page.waitForTimeout(12000);
    await shot('receiver-copying', { wait: 1800 });
    await tap('#rx-copy'); // skip the rest
    await page.waitForTimeout(3500);
    await shot('receiver-copied');
    if (mode === 'phone') { await ev(function () { UI$('#v-receiver').scrollTop = 900; }); await shot('receiver-log'); await ev(function () { UI$('#v-receiver').scrollTop = 0; }); }
    // the rest of night one, then night two, through the adapter
    var got = await ev(AUTO);
    await ev(function () { UI.endShift(); }); await page.waitForTimeout(800);
    await shot('shift-report');
    await tap('#nc-go'); await page.waitForTimeout(600);
    got += await ev(AUTO);
    // keep going until the bench has a depth pair (or night 3)
    for (var nn = 0; nn < 2; nn++) {
      var ok = await ev(function () { return UIA.depthPairs().length > 0 || UIA.over(); });
      if (ok) break;
      await ev(function () { UIA.endShift(); UI.refresh(); });
      got += await ev(AUTO);
    }
    // map with fixes
    await ev(function () { UI.go('map'); }); await page.waitForTimeout(600); await closeExplain();
    await shot('map', { wait: 800 });
    var hasFix = await ev(function () { var e = UIA.log().filter(function (x) { return x.df && x.df.fix; })[0]; if (e) { UIMap.focusLog(e.id); return e.id; } return null; });
    if (hasFix) { await page.waitForTimeout(500); await shot('map-fix'); await ev(function (id) { var e = UIA.logEntry(id); UIMap.fixSheet({ key: e.id, log: e.id, cs: e.callsign, bearings: e.df.bearings, fix: e.df.fix, shift: e.shift, label: e.label }); }, hasFix); await shot('map-fixsheet', { wait: 600 }); await ev(function () { UIsheet.close(); }); }
    await ev(function () { var p = UIA.city().places.filter(function (x) { return x.kind === 'spot'; })[0] || UIA.city().places[0]; UIMap.placeSheet(p.id); }); await shot('map-place', { wait: 600 }); await ev(function () { UIsheet.close(); });
    // bench
    await ev(function () { UI.go('bench'); }); await page.waitForTimeout(400); await closeExplain();
    await shot('bench');
    var pair = await ev(function () { var p = UIA.depthPairs()[0]; if (p) UIBench.depth(p[0], p[1]); return p; });
    await page.waitForTimeout(500); await closeExplain(); await closeExplain();
    if (pair) {
      await shot('depth');
      await ev(function () { var inp = UI$('#dp-crib'); inp.value = 'GREETINGS'; inp.dispatchEvent(new Event('input')); });
      await shot('depth-crib');
      // slide to the first likely mark (or the end-of-message greeting)
      await ev(function () { var m = UI$('#dp-marks i'); var off = m ? Math.round(parseFloat(m.style.left) / 26) : 0; UIS.bench.offset = off; UI$('#dp-crib').dispatchEvent(new Event('input')); var sl = UI$('#dp-slide'); if (sl) sl.scrollIntoView({ block: 'center', inline: 'center' }); });
      await shot('depth-slid');
      await ev(function () { var b = UI$('#dp-pin'); if (b && !b.disabled) b.click(); });
      await page.waitForTimeout(400);
      await ev(function () { var w = UI$('#dp-work'); if (w) w.scrollIntoView({ block: 'center' }); });
      await shot('depth-pinned');
    }
    var per = await ev(function () { var m = UIA.messages().filter(function (x) { return x.kind === 'periodic'; })[0]; if (m) UIBench.key(m.id); return m && m.id; });
    await page.waitForTimeout(400); await closeExplain();
    if (per) {
      await ev(function () { var b = UI$('[data-k-act=period]'); if (b) b.click(); }); await page.waitForTimeout(300);
      await shot('key-period');
      await ev(function () { var b = UI$('[data-k-act=cols]'); if (b) b.click(); }); await page.waitForTimeout(300); await closeExplain();
      await ev(function () { var c = UI$('.cols'); if (c) c.scrollIntoView({ block: 'start' }); });
      await shot('key-columns');
    }
    await ev(function () { UIS.bench.tech = 'board'; UIBench.render(); }); await page.waitForTimeout(300); await closeExplain();
    await shot('board');
    // traffic: draw every observed link
    await ev(function () { UIA.traffic().forEach(function (t, i) { UIA.link(t.from, t.to, i % 2 ? 'talks' : 'controls'); }); var cs = UIA.callsigns(); if (cs.length > 2) UIA.link(cs[0].id, cs[cs.length - 1].id, 'talks'); UI.go('traffic'); });
    await page.waitForTimeout(500); await closeExplain();
    await shot('traffic');
    await ev(function () { UIS.traffic.sub = 'timeline'; UITraffic.refresh(); }); await shot('timeline');
    await ev(function () { UIS.traffic.sub = 'diagram'; var c = UIA.callsigns()[0]; if (c) UITraffic.nodeSheet(c.id); }); await shot('callsign-sheet', { wait: 600 }); await ev(function () { UIsheet.close(); });
    // desk
    await ev(function () { UI.go('desk'); UIDesk.sub('inbox'); }); await shot('desk-inbox');
    await ev(function () { var m = UIA.inbox().filter(function (x) { return x.kind === 'super'; }).slice(-1)[0]; UIS.desk.open = m.id; UIDesk.refresh(); }); await shot('desk-memo');
    await ev(function () { UIDesk.sub('op'); }); await shot('desk-op');
    await ev(function () { UIDesk.sub('warrants'); }); await page.waitForTimeout(300); await closeExplain(); await shot('desk-warrants');
    await ev(function () { UIDesk.warrantForm('stakeout'); }); await shot('warrant-form', { wait: 600 }); await ev(function () { UIsheet.close(); });
    await ev(function () { UIDesk.sub('mentor'); var b = UI$('[data-tier="1"]'); if (b) b.click(); }); await shot('desk-mentor');
    await ev(function () { UIDesk.sub('file'); }); await shot('desk-file');
    await ev(function () { UIDesk.sub('notes'); UI$('#np-t').value = 'KX7 — always 20:15?\nULV repeats at 19:55.'; }); await shot('desk-notes');
    // the van: find a Morse set on the air with a fix
    var van = await ev(function () {
      if (UIA.clock().minute > 300) { UIA.endShift(); UI.refresh(); }
      for (var g = 0; g < 100 && UIA.clock().minute < 470; g++) {
        var s = UIA.band().now.filter(function (x) { return !x.bcast && x.mode !== 'voice'; })[0];
        if (s) { var d = UIA.df(s.id, null); if (d.ok && d.fix) { UIRx.liveDf[s.id] = { bearings: d.bearings, fix: d.fix, callsign: s.label, t: 0, freq: s.freq }; UIS.explained.van = 1; UI.go('map'); UIMap.sendVan(s); return s.id; } }
        UIA.wait(5);
      }
      return null;
    });
    if (van) {
      await page.waitForTimeout(1200);
      await shot('van');
      var box = await page.locator('#van-cv').boundingBox();
      if (mode === 'desk') await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.4); else await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.4);
      await page.waitForTimeout(2500);
      await shot('van-driving');
      await ev(function () { var b = UI$('#van-quit'); if (b) b.click(); });
      await page.waitForTimeout(700);
      await shot('van-result');
      await ev(function () { var b = UI$('#van-close'); if (b) b.click(); });
    }
    // menu, alert and help sheets
    await ev(function () { UI.go('receiver'); UI.menu(); }); await shot('menu', { wait: 600 }); await ev(function () { UIsheet.close(); });
    // debrief
    await ev(function () { UIDebrief.show(); }); await page.waitForTimeout(900);
    for (var k = 0; k < 4; k++) { await ev(function (k) { var d = UI$('#debrief'); d.scrollTop = k * d.clientHeight * 0.85; }, k); await shot('debrief' + k); }
    // continue from the save
    await page.reload(); await page.waitForTimeout(900);
    await shot('title-continue');
    console.log(mode + ': copied ' + got + ' transmissions in the run');
    await ctx.close();
  }
  await browser.close();
  console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 40).join('\n') : 'no page errors');
})().catch(function (e) { console.error('FAILED', e); process.exit(1); });
