/* DEPTH UI — 15-receiver.js: the RECEIVER. Backlit dial glass, phosphor
 * waterfall (whole band / ±50 kHz / ±5 kHz), coarse and fine knobs, AM/CW
 * lever, S-meter and magic eye, the COPY mini-game (hold the drifting trace on
 * the hairline while the preamble plays; the measured error, mode and
 * steadiness go to c.tune), the phosphor tape where the groups come in, the
 * schedule strip with wait controls, and the grey log sheet. */
var UIRx = (function () {
  var R = {};
  var el = {}, wf = null, ov = null, glass = null, meter = null, eye = null, knob = null, fine = null;
  var sigs = [], drift = {}, L = null, running = false, lastT = 0, t0 = performance.now(), sMeter = 0, eyeV = 0;
  var hist = null, histCtx = null, rowImg = null, lastSpanKey = '';
  R.liveDf = {};
  var SPANS = { band: 9000, wide: 100, narrow: 10 };

  function kHz() { return UIS.rx.freq * 1000; }
  function helps() { return UIA.helps(); }
  function gradeK() { var g = UIA.gradeId(); return g === 'cadet' ? 0.7 : g === 'chief' ? 1.3 : 1; }
  function sigF(s) { return s.freq * 1000 + (drift[s.id] ? drift[s.id].d : 0); }
  function nearest(maxK) {
    var best = null, bd = maxK || 6;
    sigs.forEach(function (s) { var e = Math.abs(kHz() - sigF(s)); if (e < bd) { bd = e; best = s; } });
    return best;
  }
  function needMode(s) { return s.mode === 'voice' ? 'voice' : 'cw'; }
  function modeOk(s) { return UIS.rx.mode === needMode(s); }
  function resp(err, bw) { return Math.exp(-(err * err) / (bw * bw)); }
  function readability(q) { return q === null || q === undefined ? '–' : 'R' + UIclamp(Math.round(1 + q * 4), 1, 5); }

  // ------------------------------------------------------------------ build
  R.build = function (root) {
    root.innerHTML =
      '<div class="rx-wrap">' +
      '<section class="rx-set panel" aria-label="Receiver">' +
        '<i class="screw a"></i><i class="screw b"></i><i class="screw c"></i><i class="screw d"></i>' +
        '<div class="rx-head"><div class="plate"><span class="engr big">KESTREL</span><span class="engr sm">RX-2 · HF receiver</span></div>' +
        '<div class="vfd" id="rx-vfd"></div></div>' +
        '<div class="rx-glass" id="rx-glass" aria-label="Dial glass: drag to tune"></div>' +
        '<div class="crt"><div class="crt-in" id="rx-wf"></div><div class="crt-ov" id="rx-ov"></div><div class="crt-glass"></div>' +
          '<div class="crt-span" id="rx-span" data-nogesture><button data-span="band">Band</button><button data-span="wide">±50k</button><button data-span="narrow">±5k</button></div></div>' +
        '<div class="tape" id="rx-tape" aria-live="polite"></div>' +
        '<div class="rx-ctl">' +
          '<div class="rx-col l"><div class="meter" id="rx-meter"></div>' +
            '<div class="lever" id="rx-mode" role="radiogroup" aria-label="Mode"><button data-m="voice" role="radio">AM</button><span class="lv-slot"><i class="lv-bat"></i></span><button data-m="cw" role="radio">CW</button></div><span class="engr xs">Mode</span></div>' +
          '<div class="rx-main" id="rx-knob"><span class="engr xs k-lbl">Tuning</span></div>' +
          '<div class="rx-col r"><div id="rx-fine"></div><span class="engr xs">Fine</span><div class="eye-wrap"><div class="eye" id="rx-eye"></div><span class="engr xs">Tune</span></div></div>' +
        '</div>' +
        '<div class="rx-btns">' +
          '<button class="pbtn copy" id="rx-copy"><span class="pb-lamp"></span><span class="pb-t"><b>Copy</b><small id="rx-copy-s">tune to a signal</small></span><svg class="pb-ring" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17"/></svg></button>' +
          '<button class="pbtn sq" id="rx-df" aria-label="Direction finding">' + UIICON.df + '<b>DF</b></button>' +
          '<button class="pbtn sq" id="rx-van" aria-label="Van search">' + UIICON.van + '<b>Van</b></button>' +
        '</div>' +
      '</section>' +
      '<div class="rx-side">' +
        '<section class="sched" id="rx-sched" aria-label="Schedule and time"></section>' +
        '<section class="logsheet paper" id="rx-log" aria-label="Intercept log"></section>' +
      '</div></div>';
    el.root = root; el.vfd = UI$('#rx-vfd'); el.tape = UI$('#rx-tape'); el.copy = UI$('#rx-copy'); el.copyS = UI$('#rx-copy-s'); el.df = UI$('#rx-df'); el.van = UI$('#rx-van');
    el.sched = UI$('#rx-sched'); el.log = UI$('#rx-log');
    // canvases
    glass = UIcanvas(UI$('#rx-glass'), function (x, w, h) { UIPaint.glass(x, w, h, UIS.rx.freq, { marks: sigs }); });
    wf = UIcanvas(UI$('#rx-wf'), function () { /* drawn by the loop */ });
    wf.onResize = function () { hist = null; };
    ov = UIcanvas(UI$('#rx-ov'), drawOverlay);
    meter = UIcanvas(UI$('#rx-meter'), function (x, w, h) { UIPaint.meter(x, w, h, sMeter); });
    eye = UIcanvas(UI$('#rx-eye'), function (x, w, h) { UIPaint.eye(x, w, h, eyeV, true); });
    // knobs
    var sz = UIland() ? 104 : UIwide() ? 150 : 132;
    var lastTurn = 0;
    knob = UIPaint.knob(UI$('#rx-knob'), { size: sz, label: 'Tuning', ticks: 48, dimple: true, detent: 7, cls: 'big',
      onTurn: function (d) {
        var now = performance.now(), dt = Math.max(8, now - lastTurn); lastTurn = now;
        var speed = Math.abs(d) / dt * 16, sp = UIS.rx.span, base = sp === 'band' ? 6 : sp === 'wide' ? 0.35 : 0.04;
        var acc = 1 + Math.min(sp === 'band' ? 10 : 20, speed * speed * 0.6);
        setFreq(kHz() + d * base * acc);
      } });
    fine = UIPaint.knob(UI$('#rx-fine'), { size: UIland() ? 62 : 74, label: 'Fine tuning', ticks: 24, detent: 10, cls: 'fine',
      onTurn: function (d) { setFreq(kHz() + d * 0.012); } });
    // dial glass drag
    UIdrag(UI$('#rx-glass'), { start: function (p) { setFreq(UIPaint.glassF(p.w, p.x) * 1000); }, move: function (p) { setFreq(UIPaint.glassF(p.w, p.x) * 1000); }, end: function () { UIAudio.cue('detent'); } });
    // waterfall: tap to tune, drag to pan / fine-tune
    var dragF = null;
    UIdrag(UI$('#rx-ov'), {
      filter: function (e) { return !e.target.closest('[data-nogesture]'); },
      start: function (p) { dragF = kHz(); },
      move: function (p, d) { if (UIS.rx.span === 'band') return; var kpp = SPANS[UIS.rx.span] / p.w; setFreq(dragF - d.x * kpp); },
      end: function (p, moved) { if (!moved) tapWaterfall(p.x, p.w); dragF = null; }
    });
    UI$('#rx-span').addEventListener('click', function (e) { var b = e.target.closest('[data-span]'); if (!b) return; UIAudio.cue('switch'); setSpan(b.dataset.span, true); });
    UI$('#rx-mode').addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); var m = b ? b.dataset.m : (UIS.rx.mode === 'voice' ? 'cw' : 'voice'); setMode(m); });
    el.copy.addEventListener('click', onCopy);
    el.df.addEventListener('click', onDf);
    el.van.addEventListener('click', onVan);
    el.log.addEventListener('click', function (e) { var r = e.target.closest('[data-log]'); if (r) { UIAudio.cue('paper'); R.logSheet(r.dataset.log); } });
    el.sched.addEventListener('click', onSched);
    R.refresh();
    UIExplain.once('receiver');
  };
  function setFreq(k) {
    k = UIclamp(k, 3000, 12000);
    var old = kHz();
    UIS.rx.freq = Math.round(k * 100) / 100000;
    if (hist && UIS.rx.span !== 'band') shiftHist(old - kHz());
    autoSpan();
    glass.frame(); vfd();
    UI.emit('tuned', UIS.rx.freq);
  }
  function setSpan(sp, manual) { if (UIS.rx.span === sp) return; UIS.rx.span = sp; R._manualSpan = manual ? performance.now() : 0; hist = null; spanBtns(); }
  function autoSpan() {
    if (R._manualSpan && performance.now() - R._manualSpan < 1500) return;
    var n = nearest(60), e = n ? Math.abs(kHz() - sigF(n)) : 99;
    if (UIS.rx.span === 'wide' && e < 3.5) setSpan('narrow');
    else if (UIS.rx.span === 'narrow' && e > 6 && !L) setSpan('wide');
  }
  function setMode(m) { if (UIS.rx.mode === m) return; UIS.rx.mode = m; UIAudio.cue('switch'); UIAudio.stopLoop(); modeUi(); vfd(); UI.emit('mode', m); UI.save(); }
  function tapWaterfall(x, w) {
    var sp = UIS.rx.span;
    if (sp === 'band') {
      var f = (3000 + x / w * 9000);
      // snap to the nearest trace within reach (the watch officer's fingertip): a little off, so the fine knob still matters
      var best = null, bd = helps() ? 90 : 45;
      sigs.forEach(function (s) { var e = Math.abs(f - s.freq * 1000); if (e < bd) { bd = e; best = s; } });
      if (best) f = sigF(best) + (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 1.6);
      UIAudio.cue('detent');
      setFreq(f); setSpan(best ? 'narrow' : 'wide');
      if (best && helps() && needMode(best) !== UIS.rx.mode && UIA.cadet()) setMode(needMode(best));
      return;
    }
    var kpp = SPANS[sp] / w, tf = kHz() + (x - w / 2) * kpp;
    if (sp === 'wide') { var n = null, nd = 6; sigs.forEach(function (s) { var e = Math.abs(tf - sigF(s)); if (e < nd) { nd = e; n = s; } }); if (n) tf = sigF(n) + (Math.random() - 0.5) * 2.4; }
    setFreq(tf);
  }
  function shiftHist(dk) {
    if (!hist) return;
    var px = dk / SPANS[UIS.rx.span] * hist.width;
    if (Math.abs(px) < 0.5) return;
    histCtx.globalCompositeOperation = 'copy'; histCtx.drawImage(hist, px, 0); histCtx.globalCompositeOperation = 'source-over';
  }
  function spanBtns() { UI$$('#rx-span [data-span]').forEach(function (b) { b.classList.toggle('on', b.dataset.span === UIS.rx.span); }); }
  function modeUi() { var l = UI$('#rx-mode'); l.classList.toggle('cw', UIS.rx.mode === 'cw'); UI$$('#rx-mode [data-m]').forEach(function (b) { b.setAttribute('aria-checked', String(b.dataset.m === UIS.rx.mode)); b.classList.toggle('on', b.dataset.m === UIS.rx.mode); }); }
  function vfd() { el.vfd.innerHTML = '<b>' + (UIS.rx.freq < 10 ? '0' : '') + UIS.rx.freq.toFixed(3) + '</b><small>MHz</small><span class="vm">' + (UIS.rx.mode === 'cw' ? 'CW' : 'AM') + '</span>'; }

  // ------------------------------------------------------------------ band + refresh
  R.refresh = function () {
    if (!el.root) return;
    var b = UIA.band();
    sigs = b.now.slice();
    sigs.forEach(function (s) {
      if (drift[s.id]) return;
      var r = UIrand(s.id), sg = s.bcast ? null : UIA.signal(s.id);
      drift[s.id] = { d: (r() - 0.5) * 1.5 * s.drift, v: 0, ph: r() * 6.28, fist: (sg && sg.fist) || UIAudio.fistFor(s.callsign || s.label || s.id, s.fist), callup: sg && sg.callup ? sg.callup : null, tune: sg && sg.voice ? sg.voice.interval : null, sex: sg && sg.voice ? sg.voice.sex : null };
    });
    vfd(); spanBtns(); modeUi(); glass.frame();
    R.renderSched(); R.renderLog(); R.status(); R.buttons();
  };
  R.reset = function () { stop(); el = {}; hist = null; drift = {}; L = null; R._stKey = ''; };
  R.show = function () { start(); if (glass) glass.frame(); };
  R.hide = function () { if (L && L.phase === 'hold') abortListen('You left the receiver; the copy was abandoned.'); stop(); UIAudio.setRx(null); UIAudio.stopLoop(); UIAudio.intervalLoop(false); };
  R.stopAll = function () { if (L) abortListen(); stop(); UIAudio.setRx(null); UIAudio.stopLoop(); UIAudio.intervalLoop(false); UIAudio.stopVoice(); };
  R.newShift = function () { R.liveDf = {}; drift = {}; };
  function start() { if (running) return; running = true; lastT = performance.now(); requestAnimationFrame(loop); }
  function stop() { running = false; }

  // ------------------------------------------------------------------ the loop: drift, waterfall, meter, eye, audio
  function loop(now) {
    if (!running) return;
    if (UIS.tab !== 'receiver' || UI$('#game').hidden) { running = false; UIAudio.setRx(null); return; }
    var dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    var T = (now - t0) / 1000;
    stepDrift(dt, T);
    if (L) stepListen(dt, T);
    drawWaterfall(T);
    ov.paint();
    // S-meter and eye
    var tuned = kHz(), sum = 0, near = null, ne = 99;
    sigs.forEach(function (s) {
      var e = tuned - sigF(s), fade = 0.78 + 0.22 * Math.sin(T * 0.35 + drift[s.id].ph);
      sum += s.strength * fade * resp(e, UIS.rx.mode === 'cw' ? 0.6 : 3.2) * (s.mode === 'burst' && !(L && L.phase === 'copy' && L.sig === s) ? 0.15 : 1);
      if (Math.abs(e) < ne) { ne = Math.abs(e); near = s; }
    });
    var target = UIclamp(0.06 + Math.random() * 0.04 + sum * 0.8, 0, 1.02);
    sMeter += (target - sMeter) * Math.min(1, dt * 7);
    eyeV += ((near ? resp(ne, 1.1) * near.strength * 1.1 : 0) - eyeV) * Math.min(1, dt * 8);
    meter.paint(); eye.paint();
    audio(near, ne, tuned, T);
    if (!L) { R.status(near, ne); }
    requestAnimationFrame(loop);
  }
  function stepDrift(dt, T) {
    var k = gradeK();
    sigs.forEach(function (s) {
      var d = drift[s.id], hot = L && L.sig === s && L.phase === 'hold', maxD = (s.mode === 'cw' ? 1.3 : 1.9) * (0.4 + s.drift) * (hot ? 1.6 : 1);
      var push = (Math.random() - 0.5) * (hot ? 2.4 : 0.5) * k + (hot ? Math.sin(T * 0.45 + d.ph) * 0.55 * k : 0);
      d.v += push * dt - d.v * 0.6 * dt;
      d.d += d.v * dt * (hot ? 1.3 : 0.6);
      if (Math.abs(d.d) > maxD) { d.d = Math.sign(d.d) * maxD; d.v *= -0.4; }
    });
  }

  // ------------------------------------------------------------------ waterfall
  function drawWaterfall(T) {
    var cv = wf.cv, W = cv.width, H = cv.height;
    if (W < 4 || H < 4) { wf.resize(); return; }
    var key = UIS.rx.span + W + 'x' + H;
    if (!hist || lastSpanKey !== key) {
      hist = document.createElement('canvas'); hist.width = W; hist.height = H; histCtx = hist.getContext('2d');
      rowImg = histCtx.createImageData(W, 1); lastSpanKey = key;
      for (var i = 0; i < Math.min(H, 260); i += 1) scrollRow(T - (H - i) * 0.02, true);
    }
    var rows = Math.max(1, Math.round(wf.dpr));
    for (var r = 0; r < rows; r++) scrollRow(T, false);
    var ctx = wf.ctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(hist, 0, 0);
  }
  var rowN = 0;
  function scrollRow(T, prefill) {
    var W = hist.width, H = hist.height;
    histCtx.globalCompositeOperation = 'copy'; histCtx.drawImage(hist, 0, 1); histCtx.globalCompositeOperation = 'source-over';
    var d = rowImg.data, lut = UIPaint.LUT, sp = UIS.rx.span, span = SPANS[sp], f0 = sp === 'band' ? 3000 : kHz() - span / 2, kpp = span / W;
    var minW = kpp * 1.6;
    rowN++;
    var n = (Math.sin(T * 0.07) * 0.5 + 0.5) * 8;
    var S = sigs.map(function (s) {
      var dd = drift[s.id], f = sigF(s), on = 1, key = 1;
      var burstNow = s.mode === 'burst' && L && L.sig === s && L.phase === 'copy' && L.burstT && T - L.burstT < 0.9;
      if (s.mode === 'cw') { var ph = (T * (dd.fist.wpm / 6) + dd.ph * 10); key = (Math.sin(ph * 3.1) + Math.sin(ph * 1.7 + 1) > -0.2) ? 1 : 0.08; }
      if (s.mode === 'burst') key = burstNow ? 1.6 : (Math.random() < 0.02 ? 0.4 : 0.06);
      var fade = 0.72 + 0.28 * Math.sin(T * 0.35 + dd.ph);
      return { f: f, a: s.strength * fade * 150 * key, m: s.mode, b: s.bcast, sb: Math.random(), burst: burstNow };
    });
    for (var x = 0; x < W; x++) {
      var f = f0 + x * kpp, v = 10 + Math.random() * 30 + n + 6 * Math.sin(x * 0.02 + T * 0.3);
      for (var i = 0; i < S.length; i++) {
        var s = S[i], df = f - s.f, adf = Math.abs(df);
        if (adf > 7 + minW * 3) continue;
        if (s.m === 'cw') { var w = Math.max(0.12, minW); v += s.a * Math.exp(-(df * df) / (w * w)); }
        else if (s.m === 'burst') { var wb = s.burst ? 4 : Math.max(0.3, minW); v += s.a * Math.exp(-(df * df) / (wb * wb)) * (s.burst ? 0.6 + Math.random() * 0.4 : 1); }
        else {
          var wc = Math.max(0.1, minW); v += s.a * 1.1 * Math.exp(-(df * df) / (wc * wc));
          var sbw = s.b ? 4.5 : 3.2;
          if (adf < Math.max(sbw, minW * 2)) v += s.a * 0.55 * (1 - adf / Math.max(sbw, minW * 2)) * (s.b ? 0.5 + Math.random() * 0.5 : s.sb * (0.35 + Math.random() * 0.65));
        }
      }
      var iv = UIclamp(v | 0, 0, 255), p = x * 4;
      d[p] = lut[iv * 3]; d[p + 1] = lut[iv * 3 + 1]; d[p + 2] = lut[iv * 3 + 2]; d[p + 3] = 255;
    }
    histCtx.putImageData(rowImg, 0, 0);
  }
  function drawOverlay(x, w, h) {
    x.clearRect(0, 0, w, h);
    var sp = UIS.rx.span, span = SPANS[sp], f0 = sp === 'band' ? 3000 : kHz() - span / 2;
    function X(f) { return (f - f0) / span * w; }
    x.font = '600 10px "DX Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'bottom';
    // scale along the bottom
    x.strokeStyle = 'rgba(140,255,190,.35)'; x.fillStyle = 'rgba(160,255,200,.6)'; x.lineWidth = 1;
    var step = sp === 'band' ? 1000 : sp === 'wide' ? 10 : 1, lab = sp === 'band' ? 1000 : sp === 'wide' ? 20 : 2;
    for (var f = Math.ceil(f0 / step) * step; f <= f0 + span; f += step) {
      var xx = Math.round(X(f)) + 0.5, major = Math.abs(f / lab - Math.round(f / lab)) < 1e-6;
      x.beginPath(); x.moveTo(xx, h); x.lineTo(xx, h - (major ? 7 : 4)); x.stroke();
      if (major && xx > 16 && xx < w - 16) x.fillText(sp === 'band' ? String(f / 1000) : (f - kHz() > 0 ? '+' : f - kHz() < 0 ? '−' : '') + Math.abs(Math.round(f - kHz())), xx, h - 8);
    }
    // labels for known transmitters
    x.textBaseline = 'top';
    var labs = sigs.map(function (s) {
      var xx = X(sigF(s)), isNew = R._newId === s.id;
      if (xx < -20 || xx > w + 20 || (!s.label && !isNew)) return null;
      var t = isNew && !s.label ? 'NEW' : (s.label || '').toUpperCase();
      if (s.bcast && sp === 'band') t = t.split(/[ ,(]/)[0];
      return { s: s, xx: xx, t: t, isNew: isNew, pri: s.bcast ? 0 : isNew ? 2 : 1 };
    }).filter(Boolean).sort(function (a, b) { return b.pri - a.pri; });
    var placed = [];
    labs.forEach(function (L) {
      x.font = (L.s.bcast ? '500 ' : '700 ') + '10px "DX Mono", monospace';
      var tw = x.measureText(L.t).width, lx = UIclamp(L.xx, tw / 2 + 3, w - tw / 2 - 3), row = 0;
      while (row < 2 && placed.some(function (p) { return p.row === row && Math.abs(p.x - lx) < (p.w + tw) / 2 + 6; })) row++;
      if (row >= 2 || (L.s.bcast && row > 0)) return;
      placed.push({ x: lx, w: tw, row: row });
      var y = 5 + row * 13;
      x.fillStyle = L.s.bcast ? 'rgba(130,220,170,.5)' : L.isNew ? 'rgba(255,210,120,.95)' : 'rgba(200,255,220,.92)';
      x.fillText(L.t, lx, y);
      if (!L.s.bcast) { x.strokeStyle = x.fillStyle; x.beginPath(); x.moveTo(L.xx, y + 12); x.lineTo(L.xx, y + 17); x.stroke(); }
    });
    // tuning: hairline (zoomed) or needle (band)
    var tx = sp === 'band' ? X(kHz()) : w / 2;
    x.save();
    x.shadowColor = 'rgba(255,90,60,.8)'; x.shadowBlur = 6;
    x.strokeStyle = 'rgba(255,110,80,.9)'; x.lineWidth = sp === 'band' ? 1.5 : 1;
    x.beginPath(); x.moveTo(tx, sp === 'band' ? 0 : 20); x.lineTo(tx, h - 14); x.stroke();
    x.restore();
    if (L && L.phase === 'hold') {
      // tolerance band on the hairline while holding
      var tol = L.tol / span * w;
      x.fillStyle = 'rgba(255,140,90,.10)'; x.fillRect(w / 2 - tol, 20, tol * 2, h - 34);
    }
    // bandwidth bracket in zoomed views
    if (sp !== 'band') { var bw = (UIS.rx.mode === 'cw' ? 0.5 : 3) / span * w; x.strokeStyle = 'rgba(255,150,110,.45)'; x.beginPath(); x.moveTo(w / 2 - bw, h - 14); x.lineTo(w / 2 - bw, h - 18); x.lineTo(w / 2 + bw, h - 18); x.lineTo(w / 2 + bw, h - 14); x.stroke(); }
  }

  // ------------------------------------------------------------------ audio mapping
  function audio(near, ne, tuned, T) {
    if (!UIAudio.started) return;
    var o = { noise: 0.75, beatHz: 1000, beatVol: 0, cwHz: 700, cwVol: 0, mumble: 0, music: 0, tune: 0, pips: 0.8, level: 1 };
    var listening = L && L.sig;
    if (near && ne < 9) {
      var s = near, err = tuned - sigF(s), st = s.strength, am = UIS.rx.mode === 'voice';
      o.noise = UIclamp(0.8 - st * resp(err, 3) * 0.55, 0.15, 0.85);
      if (s.mode === 'voice') {
        var zb = Math.min(1, Math.abs(err) / 0.3);
        o.beatHz = 60 + Math.abs(err) * 850; o.beatVol = 0.1 * st * zb * resp(err, 7) * (am ? 1 : 1.4);
        if (!listening || L.phase === 'done') { o.mumble = (am ? 0.4 : 0.14) * st * resp(err, 3.2); if (s.bcast) o.music = (am ? 0.3 : 0.1) * st * resp(err, 4); }
        if (listening && L.sig === s && L.phase === 'hold') o.tune = (am ? 0.4 : 0.15) * resp(err, 2.8);
        if (listening && L.sig === s && L.phase === 'copy') o.pips = (am ? 0.8 : 0.35) * resp(err, 3.5);
        UIAudio.stopLoop();
      } else if (s.mode === 'cw' || s.mode === 'burst') {
        if (UIS.rx.mode === 'cw') { o.cwHz = 700 + err * 380; o.cwVol = 0.2 * st * resp(err, 2.2); }
        else { o.cwHz = 90 + Math.abs(err) * 40; o.cwVol = 0.12 * st * resp(err, 3); }
        if (s.mode === 'cw' && !(listening && L.phase === 'copy')) {
          var txt = drift[s.id].callup ? drift[s.id].callup.toUpperCase() : s.label ? 'VVV DE ' + s.label.toUpperCase().replace(/[^A-Z0-9ÆØÅ]/g, '') : 'VVV VVV';
          if (UIAudio._loopKey !== txt) UIAudio.loopKey(txt, drift[s.id].fist);
        }
      }
    } else { UIAudio.stopLoop(); }
    UIAudio.setRx(o);
  }

  // ------------------------------------------------------------------ status line (phosphor tape) and buttons
  R.status = function (near, ne) {
    if (!el.tape || L) return;
    if (near === undefined) { near = nearest(9); ne = near ? Math.abs(kHz() - sigF(near)) : 99; }
    var key = (near ? near.id : '-') + (ne < 0.6 ? 'c' : ne < 3 ? 'n' : 'f') + UIS.rx.mode + UIS.rx.span;
    if (R._stKey === key) return; R._stKey = key;
    var h;
    if (!near) h = '<span class="dim">' + (sigs.filter(function (s) { return !s.bcast; }).length ? 'Nothing here. Tap a bright trace on the display to tune to it.' : 'Only broadcasters on the air. Wait for the next schedule, or watch the band.') + '</span>';
    else {
      var nm = near.bcast ? near.label : near.label ? near.label.toUpperCase() : 'Unknown';
      var how = near.mode === 'voice' ? 'voice' : near.mode === 'cw' ? 'Morse' : 'burst', hint = '';
      if (!modeOk(near)) hint = '<em>' + (needMode(near) === 'voice' ? 'lever to AM' : 'lever to CW') + '</em>';
      else if (ne > 0.6) hint = '<em>' + (kHz() > sigF(near) ? '◂ FINE left' : 'FINE right ▸') + '</em>';
      else hint = near.bcast ? '<em>broadcaster</em>' : '<em>centred · COPY</em>';
      h = '<b>' + UIesc(nm) + '</b> · <span>' + how + '</span> · ' + hint;
    }
    el.tape.innerHTML = '<div class="tp-st">' + h + '</div>';
    R.buttons(near, ne);
  };
  R.buttons = function (near, ne) {
    if (!el.copy) return;
    if (near === undefined) { near = nearest(6); ne = near ? Math.abs(kHz() - sigF(near)) : 99; }
    var can = !!near && ne < 6 && !L;
    el.copy.disabled = !can && !L;
    el.copy.classList.toggle('ready', can && modeOk(near) && ne < 1.5);
    if (!L) el.copyS.textContent = !near || ne >= 6 ? 'tune to a signal' : near.bcast ? 'a broadcaster' : !modeOk(near) ? 'wrong mode' : ne < 1.5 ? 'ready' : 'nearly';
    var onAir = near && !near.bcast && ne < 6;
    el.df.disabled = !onAir || (L && L.phase !== 'hold');
    el.df.classList.toggle('lit', !!(onAir && R.liveDf[near.id]));
    el.van.disabled = !onAir || !vanOk(near) || !!L;
  };
  function vanOk(s) {
    if (!s || s.bcast || s.mode === 'voice') return false;
    if (R.liveDf[s.id] && R.liveDf[s.id].fix) return true;
    return !!(s.label && UIA.callsigns().some(function (c) { return c.id === s.label && c.fixes.length; }));
  }

  // ------------------------------------------------------------------ copying
  function onCopy() {
    if (L) { if (L.phase === 'copy') L.skip = true; return; }
    var s = nearest(6); if (!s) return;
    UIAudio.start();
    if (s.bcast) { UI.act(function () { var r = UIA.tune(s.id, { freqErr: 0, modeOk: true, driftHeld: 1 }); UItoast(r.text || (s.label + ': an ordinary programme.')); }); return; }
    UIExplain.once('hold', function () { beginHold(s); });
  }
  function beginHold(s) {
    if (L) return;
    var dur = s.mode === 'burst' ? 3.2 : s.mode === 'cw' ? 11 : 13;
    if (UIA.cadet()) dur *= 0.85;
    L = { sig: s, phase: 'hold', t: 0, dur: dur, n: 0, sum: 0, held: 0, mOk: 0, tol: UIA.cadet() ? 0.6 : UIA.gradeId() === 'chief' ? 0.35 : 0.45 };
    setSpan('narrow');
    el.copy.classList.add('busy'); el.copyS.textContent = 'hold it centred';
    el.root.classList.add('holding');
    if (s.mode === 'voice') UIAudio.intervalLoop(true, drift[s.id] && drift[s.id].tune);
    renderHold();
    UI.emit('copystart', s.id);
  }
  function stepListen(dt) {
    if (L.phase !== 'hold') return;
    var s = L.sig, err = kHz() - sigF(s);
    L.t += dt; L.n++; L.sum += Math.abs(err); if (Math.abs(err) < L.tol) L.held++; if (modeOk(s)) L.mOk++;
    var ring = el.copy.querySelector('.pb-ring circle'); ring.style.strokeDashoffset = String(107 * (1 - L.t / L.dur));
    if (L.n % 4 === 0) renderHold(err);
    if (L.t >= L.dur) finishHold();
  }
  function qEst() { var m = L.sum / Math.max(1, L.n), h = L.held / Math.max(1, L.n); return UIclamp((1 - m / 2.2) * (0.55 + 0.45 * h) * (L.mOk / Math.max(1, L.n) > 0.5 ? 1 : 0.3), 0, 1); }
  function renderHold(err) {
    var q = qEst(), ok = modeOk(L.sig), e = err === undefined ? 0 : err;
    el.tape.innerHTML = '<div class="tp-hold"><span class="tp-k">' + (L.sig.mode === 'voice' ? 'Interval signal' : L.sig.mode === 'burst' ? 'Waiting for the burst' : 'Call-up: VVV') + '</span>' +
      '<span class="tp-q">' + readability(q) + '</span>' +
      '<span class="tp-bar"><i style="width:' + Math.round(q * 100) + '%"></i></span>' +
      '<span class="tp-hint">' + (!ok ? 'Wrong mode: ' + (needMode(L.sig) === 'voice' ? 'AM' : 'CW') + '!' : Math.abs(e) < L.tol ? 'On the line — hold it' : e > 0 ? '◂ turn FINE left' : 'turn FINE right ▸') + '</span></div>';
  }
  function finishHold() {
    var s = L.sig, q = { freqErr: Math.round(L.sum / Math.max(1, L.n) * 100) / 100, modeOk: L.mOk / Math.max(1, L.n) > 0.5, driftHeld: Math.round(L.held / Math.max(1, L.n) * 100) / 100 };
    UIAudio.intervalLoop(false); UIAudio.stopLoop();
    L.phase = 'copy';
    var res = UIA.tune(s.id, q);
    if (!res.ok) { UItoast(res.err || 'Lost it.', { err: true }); endListen(); return; }
    L.res = res; L.q = q; L.shown = 0; L.digit = -1; L.skip = false;
    el.copyS.textContent = 'copying · tap to skip';
    el.root.classList.remove('holding'); el.root.classList.add('copying');
    R.renderLog();
    UI.topbar();
    copyNext();
  }
  function copyNext() {
    if (!L) return;
    var g = L.res.groups, s = L.sig;
    var audible = UIS.rx.read === 'all' ? g.length : UIS.rx.read === 'none' ? 0 : Math.min(g.length, s.mode === 'burst' ? 0 : 4);
    if (L.shown >= g.length) { UIlater(500, doneCopy); return; }
    var k = L.shown;
    if (s.mode === 'burst' && k === 0) { UIAudio.burst(); L.burstT = (performance.now() - t0) / 1000; }
    if (L.skip || k >= audible) {
      L.digit = 5; L.shown++; UIAudio.cue('type'); renderCopy(); R.liveRow();
      UIlater(L.skip ? 25 : s.mode === 'burst' ? 60 : 110, copyNext); return;
    }
    L.digit = -1; renderCopy();
    if (s.mode === 'voice') {
      L.rg = UIAudio.readGroup(g[k], function (i) { L.digit = i; renderCopy(); }, function () { L.digit = 5; L.shown++; renderCopy(); R.liveRow(); UIlater(L.skip ? 20 : 350, copyNext); }, { pips: !UIAudio.canSpeak() });
    } else {
      var fist = drift[s.id].fist, f2 = { wpm: fist.wpm * 1.5, dah: fist.dah, jitter: fist.jitter, gap: fist.gap, swing: fist.swing };
      var r = UIAudio.started ? UIAudio.keyText(g[k].replace(/\?/g, 'E'), f2) : { end: 0, marks: [] };
      var c0 = UIAudio.ctx ? UIAudio.ctx.currentTime : 0;
      var total = r.marks.length ? (r.end - c0) * 1000 : 900;
      for (var i = 0; i < 5; i++) (function (i) { var at = r.marks[i] ? (r.marks[i].t - c0) * 1000 : i * total / 5; UIlater(at, function () { if (L && L.shown === k) { L.digit = i; if (g[k][i] === '?') UIAudio.crackle(0.25); renderCopy(); } }); })(i);
      UIlater(total + 250, function () { if (!L || L.shown !== k) return; L.digit = 5; L.shown++; renderCopy(); R.liveRow(); copyNext(); });
    }
  }
  function renderCopy() {
    if (!L || !L.res) return;
    var g = L.res.groups, from = Math.max(0, L.shown - (UIwide() ? 5 : 3)), h = '';
    for (var i = from; i <= Math.min(g.length - 1, L.shown); i++) {
      var s = g[i], cur = i === L.shown, vis = cur ? Math.max(0, L.digit + 1) : 5;
      h += '<span class="tg' + (cur ? ' cur' : '') + (i === 0 ? ' ind' : '') + '">' + s.split('').map(function (d, j) { return j < vis ? (d === '?' ? '<i class="lost">?</i>' : d) : '<i class="un">·</i>'; }).join('') + '</span>';
    }
    el.tape.innerHTML = '<div class="tp-copy"><span class="tp-n">' + Math.min(L.shown + 1, g.length) + '/' + g.length + '</span>' + h + '</div>';
  }
  function doneCopy() {
    if (!L) return;
    var res = L.res, lost = res.groups.join('').split('').filter(function (d) { return d === '?'; }).length;
    var msg = res.msg ? UIA.message(res.msg) : null;
    var extra = '';
    if (msg && UIA.helps()) {
      var twin = UIA.messages().filter(function (m) { return m.id !== msg.id && m.indicator && m.indicator === msg.indicator && m.kind === 'pad'; })[0];
      if (twin) extra = ' Same first group as ' + twin.id + ' — a depth!';
    }
    UItoast('Copied ' + res.groups.length + ' groups · ' + readability(res.quality) + (lost ? ' · ' + lost + ' digit' + (lost > 1 ? 's' : '') + ' lost' : ' · clean') + (msg ? ' · on the bench as ' + msg.id : '') + '.' + extra, { ms: 5200, good: !lost });
    UIAudio.cue('bell');
    endListen();
    UI.act(function () { });
    UI.emit('copied', res);
  }
  function abortListen(msg) { if (msg) UItoast(msg, { err: true }); UIAudio.intervalLoop(false); UIAudio.stopVoice(); if (L && L.rg) L.rg.stop(); endListen(); }
  function endListen() {
    L = null; R._stKey = '';
    el.copy.classList.remove('busy'); el.root.classList.remove('holding', 'copying');
    var ring = el.copy.querySelector('.pb-ring circle'); if (ring) ring.style.strokeDashoffset = '107';
    UIAudio.stopLoop();
    R.refresh();
  }
  R.listening = function () { return !!L; };

  // ------------------------------------------------------------------ DF and van
  function onDf() {
    var s = nearest(6); if (!s || s.bcast) return;
    var outs = UIA.city().outstations;
    function go(ids) {
      UIAudio.cue('phone');
      var r = UIA.df(s.id, ids);
      if (!r.ok) { UItoast(r.err, { err: true }); UI.refresh(); return; }
      R.liveDf[s.id] = { bearings: r.bearings, fix: r.fix, callsign: s.label, t: UIA.clock().abs, freq: s.freq };
      var d = r.fix ? UIA.districtAt(r.fix.x, r.fix.y) : null;
      UItoast(r.bearings.length + ' bearings' + (d ? ' · they cross in ' + d.name : '') + '. See the map.', { ms: 4200, icon: 'df' });
      UI.act(function () { });
      UI.emit('df', s.id);
      UIExplain.once('df');
    }
    if (L) { go(outs.map(function (o) { return o.id; })); return; }
    UIsheet.open({ title: 'Ask for bearings', eyebrow: UImhz(s.freq) + ' MHz · ' + UImodeLong(s.mode), tag: 'df', html:
      '<p>Each outstation turns its loop until the signal peaks and telephones the bearing. More stations make a tighter fix. About 3 minutes.</p>' +
      '<div class="chk">' + outs.map(function (o) { return '<label><input type="checkbox" checked value="' + UIesc(o.id) + '"><span>' + UIesc(o.name) + '</span></label>'; }).join('') + '</div>' +
      '<div class="row gap"><button class="btn pri" id="df-go">' + UIICON.df + 'Take bearings</button></div>',
      mount: function (b) { UI$('#df-go', b).addEventListener('click', function () { var ids = UI$$('input:checked', b).map(function (i) { return i.value; }); if (!ids.length) { UItoast('Pick at least one outstation.'); return; } UIsheet.close(); go(ids); }); } });
  }
  function onVan() {
    var s = nearest(6); if (!s || !vanOk(s)) return;
    UIVan.start(s.id, s.label);
  }

  // ------------------------------------------------------------------ schedule strip + waiting
  R.renderSched = function () {
    var c = UIA.clock(), up = UIA.upcoming(480), m = c.minute;
    var log = UIA.log().filter(function (e) { return e.shift === c.shift; });
    var lanes = [];
    var blocks = up.map(function (u) {
      var l = u.at / 480 * 100, w = Math.max(1.6, u.dur / 480 * 100), lane = 0;
      while (lanes[lane] !== undefined && lanes[lane] > u.at - 34) lane++;
      lanes[lane] = u.at + u.dur;
      return '<button class="sb-blk m-' + u.mode + (u.at <= m ? ' now' : '') + ' ln' + Math.min(lane, 1) + '" style="left:' + l + '%;width:' + w + '%" data-up="' + UIesc(u.id || '') + '" data-at="' + u.at + '" aria-label="' + UIesc(u.label + ' at ' + UIA.hhmm(u.at)) + '"><span>' + UIesc(u.callsign || u.label) + (u.repeat ? '<i>R</i>' : '') + '</span></button>';
    }).join('');
    var ticks = ''; for (var hh = 0; hh <= 8; hh++) ticks += '<i style="left:' + (hh * 12.5) + '%"><b>' + String((18 + hh) % 24).padStart(2, '0') + '</b></i>';
    var past = log.map(function (e) { return '<u class="' + (e.faint ? 'f' : '') + '" style="left:' + (e.minute / 480 * 100) + '%"></u>'; }).join('');
    var next = up.filter(function (u) { return u.at + u.dur > m; })[0];
    el.sched.innerHTML =
      '<div class="sb-head"><span class="engr xs">Tonight’s schedule</span><span class="sb-sub">' + (up.length ? UIplural(up.length, 'known transmission') + ' to come' : 'nothing more known tonight') + '</span></div>' +
      '<div class="sb-strip"><div class="sb-ticks">' + ticks + '</div><div class="sb-past">' + past + '</div>' + blocks + '<span class="sb-now" style="left:' + (m / 480 * 100) + '%"></span></div>' +
      '<div class="sb-btns">' +
        (next ? '<button class="btn next" data-w="next"><span>' + UIICON.wait + 'Wait for</span><b>' + UIA.hhmm(next.at) + ' ' + UIesc(next.callsign || next.label) + '</b></button>' : '') +
        '<button class="btn" data-w="10">+10 min</button><button class="btn" data-w="30">+30 min</button>' +
        '<button class="btn" data-w="watch">' + UIICON.eye + 'Watch the band</button>' +
        '<button class="btn ghost" data-w="end">' + UIICON.moon + 'End shift</button>' +
      '</div>';
  };
  function onSched(e) {
    var b = e.target.closest('[data-w],[data-at]'); if (!b || L) return;
    UIAudio.cue('tap');
    if (b.dataset.at !== undefined && b.dataset.w === undefined) { schedSheet(+b.dataset.at); return; }
    var w = b.dataset.w;
    if (w === 'end') { UI.confirmEnd(); return; }
    if (w === 'next') { var up = UIA.upcoming(480).filter(function (u) { return u.at + u.dur > UIA.clock().minute; })[0]; if (up) waitFor(up); return; }
    if (w === 'watch') { watchBand(); return; }
    var evs = UI.act(function () { return UIA.wait(+w); });
    UI.showEvents(evs);
  }
  function schedSheet(at) {
    var u = UIA.upcoming(480).filter(function (x) { return x.at === at; })[0]; if (!u) return;
    UIsheet.open({ title: UIA.hhmm(u.at) + ' · ' + (u.callsign || u.label), eyebrow: 'Known schedule', tag: 'sched', html:
      '<dl class="kv"><dt>Frequency</dt><dd>' + UImhz(u.freq) + ' MHz</dd><dt>Mode</dt><dd>' + UImodeLong(u.mode) + '</dd><dt>Length</dt><dd>about ' + u.dur + ' min</dd></dl>' +
      '<p class="note">' + (u.mode === 'voice' ? 'Set the lever to AM. ' : 'Set the lever to CW. ') + 'The dial will be set close; centre it yourself with FINE.</p>' +
      '<div class="row gap"><button class="btn pri" id="sc-go">' + UIICON.wait + 'Wait until ' + UIA.hhmm(u.at) + ' and tune</button></div>',
      mount: function (b) { UI$('#sc-go', b).addEventListener('click', function () { UIsheet.close(); waitFor(u); }); } });
  }
  function waitFor(u) {
    var evs = UI.act(function () { return u.at > UIA.clock().minute ? UIA.advanceTo(u.at) : []; });
    UI.showEvents(evs);
    // set the dial near it (the station log has the frequency); the last kHz is the player's job
    setSpan('narrow');
    setFreq(u.freq * 1000 + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 1.5));
    if (UIA.cadet() && UIS.rx.mode !== (u.mode === 'voice' ? 'voice' : 'cw')) setMode(u.mode === 'voice' ? 'voice' : 'cw');
    R.refresh();
    UI.emit('waited', u.id);
  }
  function watchBand() {
    var seen = {}; UIA.band().now.forEach(function (s) { seen[s.id] = 1; });
    var evs = [], found = null, guard = 0;
    UI.act(function () {
      while (UIA.clock().minute < 480 && guard++ < 100) {
        evs = evs.concat(UIA.wait(5));
        found = UIA.band().now.filter(function (s) { return !s.bcast && !seen[s.id]; })[0];
        if (found) break;
      }
    });
    if (found) {
      R._newId = found.id;
      setSpan('band');
      UIAudio.cue('beephi');
      UItoast('At ' + UIA.clock().label + ' something came up on ' + UImhz(found.freq) + ' MHz ' + UImodeName(found.mode) + (found.label ? ' — ' + found.label : '') + '. It is marked NEW on the display.', { ms: 5200 });
      if (UIA.cadet()) { setFreq(found.freq * 1000 + (Math.random() < 0.5 ? -1.6 : 1.6)); setSpan('narrow'); }
    } else UI.showEvents(evs.length ? evs : [{ text: 'Nothing new came up.' }]);
    R.refresh();
  }

  // ------------------------------------------------------------------ the log sheet
  function qStamp(q) { return q === null ? '' : '<span class="qs q' + UIclamp(Math.round(1 + q * 4), 1, 5) + '">' + readability(q) + '</span>'; }
  function groupsHtml(gs, limit) {
    var g = limit ? gs.slice(0, limit) : gs;
    return g.map(function (s, i) { return '<span class="g' + (i === 0 ? ' ind' : '') + '">' + UIesc(s).replace(/\?/g, '<i class="lost">?</i>') + '</span>'; }).join('') + (limit && gs.length > limit ? '<span class="more">+' + (gs.length - limit) + '</span>' : '');
  }
  R.renderLog = function () {
    var c = UIA.clock(), log = UIA.log().slice().sort(function (a, b) { return b.t - a.t; });
    var byShift = {}; log.forEach(function (e) { (byShift[e.shift] = byShift[e.shift] || []).push(e); });
    var h = '<div class="ls-head"><div><span class="ls-org">Station Kestrel · intercept log</span><h3>Log sheet</h3></div><span class="ls-form">Form K/7</span></div>';
    if (!log.length) h += '<p class="ls-empty">Nothing copied yet tonight. Wait for the first transmission on the schedule, or tap a trace on the display.</p>';
    Object.keys(byShift).sort(function (a, b) { return b - a; }).forEach(function (sh) {
      h += '<div class="ls-night">Night ' + (+sh + 1) + (+sh === c.shift ? ' · tonight' : '') + '</div><div class="ls-rows">';
      byShift[sh].forEach(function (e) {
        var live = L && L.res && L.res.logId === e.id;
        var gs = live ? e.groups.map(function (g, i) { return i < L.shown ? g : i === L.shown ? g.slice(0, Math.max(0, L.digit + 1)) + '_' : ''; }).filter(Boolean) : e.groups;
        h += '<button class="ls-row' + (e.faint ? ' faint' : '') + (live ? ' live' : '') + '" data-log="' + UIesc(e.id) + '" id="lr-' + UIesc(e.id) + '">' +
          '<span class="ls-t">' + e.label + '</span><span class="ls-f">' + UImhz(e.freq) + '</span><span class="ls-m">' + UImodeName(e.mode) + '</span>' +
          '<span class="ls-cs">' + (e.callsign ? UIesc(e.callsign) + (e.to ? '<small>→' + UIesc(e.to) + '</small>' : '') : '<em>?</em>') + '</span>' +
          '<span class="ls-q">' + (e.faint ? '' : qStamp(e.quality)) + (e.df ? '<span class="dfm" title="bearings taken">DF</span>' : '') + '</span>' +
          '<span class="ls-g">' + (e.faint ? '<em class="pencil">heard faintly — not copied</em>' : e.decoy ? '<em class="pencil">test transmission — VVV only</em>' : groupsHtml(gs, live ? 0 : UIwide() ? 12 : 6)) + '</span></button>';
      });
      h += '</div>';
    });
    el.log.innerHTML = h;
  };
  R.liveRow = function () { R.renderLog(); };
  R.logSheet = function (id, o) {
    var e = UIA.logEntry(id); if (!e) return;
    var msg = e.msg ? UIA.message(e.msg) : null;
    var outs = UIA.city().oById;
    UIsheet.open({ push: o && o.push, title: e.label + ' · ' + (e.callsign || 'unknown station'), eyebrow: 'Night ' + (e.shift + 1) + ' · ' + UImhz(e.freq) + ' MHz · ' + UImodeLong(e.mode), tag: 'log', html:
      (e.faint ? '<p class="pencil-note">Heard faintly on the band watch. Nothing was copied.</p>' :
        '<dl class="kv"><dt>Callsign</dt><dd>' + (e.callsign ? '<span class="lnk" data-ref="callsign" data-id="' + UIesc(e.callsign) + '">' + UIesc(e.callsign) + '</span>' : '—') + (e.to ? ' → <span class="lnk" data-ref="callsign" data-id="' + UIesc(e.to) + '">' + UIesc(e.to) + '</span>' : '') + '</dd>' +
        '<dt>Groups</dt><dd>' + e.groups.length + '</dd><dt>Copy</dt><dd>' + readability(e.quality) + (e.quality !== null ? ' (' + Math.round(e.quality * 100) + '%)' : '') + '</dd>' +
        '<dt>Indicator</dt><dd class="mono">' + UIesc(e.indicator || '—') + '</dd>' + (e.repeat ? '<dt>Note</dt><dd>A repeat of last night’s broadcast — missing digits were filled in.</dd>' : '') + '</dl>' +
        '<div class="groups-grid">' + groupsHtml(e.groups) + '</div>') +
      (e.df ? '<h4>Bearings</h4><ul class="brg">' + e.df.bearings.map(function (b) { return '<li><b>' + UIesc((outs[b.station] || { name: b.station }).name) + '</b> ' + b.deg.toFixed(1) + '° ± ' + b.sd.toFixed(1) + '°</li>'; }).join('') + '</ul>' : '') +
      '<div class="row gap">' + (msg ? '<button class="btn pri" data-go="bench">' + UIICON.bench + 'Open ' + UIesc(msg.id) + ' on the bench</button>' : '') + (e.df ? '<button class="btn" data-go="map">' + UIICON.map + 'Show on the map</button>' : '') + '</div>',
      mount: function (b) { b.addEventListener('click', function (ev) { var x = ev.target.closest('[data-go]'); if (!x) return; UIsheet.close(); if (x.dataset.go === 'bench') UIBench.openMsg(msg.id); else { UI.go('map'); UIMap.focusLog(e.id); } }); } });
  };
  UI.views.receiver = R;
  return R;
})();
