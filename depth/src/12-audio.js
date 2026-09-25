/* DEPTH UI — 12-audio.js: everything you hear, synthesised with WebAudio.
 * Room tone (mains hum), the receiver chain (breathing static and crackle,
 * heterodyne whistle, keyed CW tone with each operator's fist, AM voice
 * mumble and broadcast music), the numbers voice (SpeechSynthesis when the
 * browser has a voice, otherwise tone pips with the digits on screen), the
 * interval-signal tune, the burst chirp, the van's DF beeper and small
 * tactile cues. Starts on the first tap; mute persists per viewer. */
var UIAudio = (function () {
  var A = { ctx: null, master: null, muted: UIPREF.get('muted', false), started: false, rxOn: false };
  var MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.', 'Æ': '.-.-', 'Ø': '---.', 'Å': '.--.-', '?': '..--..', '/': '-..-.', '=': '-...-' };
  A.MORSE = MORSE;
  function ctx() {
    if (A.ctx) return A.ctx;
    var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    try { A.ctx = new C(); } catch (e) { return null; }
    var c = A.ctx;
    A.master = c.createGain(); A.master.gain.value = A.muted ? 0 : 1;
    var comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2;
    A.master.connect(comp); comp.connect(c.destination);
    A.ui = c.createGain(); A.ui.gain.value = 0.9; A.ui.connect(A.master);
    return c;
  }
  function noiseBuf(c, secs, kind) {
    var b = c.createBuffer(1, Math.floor(c.sampleRate * secs), c.sampleRate), d = b.getChannelData(0), last = 0;
    for (var i = 0; i < d.length; i++) { var w = Math.random() * 2 - 1; if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    return b;
  }
  function loopNoise(c, kind) { var n = c.createBufferSource(); n.buffer = kind === 'brown' ? A._brown : A._white; n.loop = true; n.start(0, Math.random() * 2); return n; }
  function gainNode(v, to) { var g = A.ctx.createGain(); g.gain.value = v; if (to) g.connect(to); return g; }
  function filt(type, f, q, to) { var b = A.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q !== undefined) b.Q.value = q; if (to) b.connect(to); return b; }
  function osc(type, f, to) { var o = A.ctx.createOscillator(); o.type = type; o.frequency.value = f; if (to) o.connect(to); o.start(); return o; }

  A.start = function () {
    var c = ctx(); if (!c) return;
    if (c.state === 'suspended') { try { c.resume(); } catch (e) { /* ignore */ } }
    if (A.started) return; A.started = true;
    A._white = noiseBuf(c, 3, 'white'); A._brown = noiseBuf(c, 4, 'brown');
    // room: mains hum and the ventilation
    var room = gainNode(0, A.master); A.room = room;
    var n = loopNoise(c, 'brown'); n.connect(filt('lowpass', 300, 0.7, gainNode(0.05, room)));
    osc('sine', 50, gainNode(0.006, room)); osc('sine', 100, gainNode(0.0035, room)); osc('sine', 150, gainNode(0.0012, room));
    room.gain.setTargetAtTime(1, c.currentTime, 2);
    // receiver chain -> radio passband -> rx gain
    var rx = gainNode(0, A.master); A.rx = rx;
    var lp = filt('lowpass', 3100, 0.8, rx), hp = filt('highpass', 240, 0.7, lp); A.rxIn = hp;
    // static: white noise through a wide band-pass, breathing on two slow LFOs
    var sN = loopNoise(c, 'white'), sBp = filt('bandpass', 1400, 0.45); sN.connect(sBp);
    var sG = gainNode(0.0, hp); sBp.connect(sG); A.staticG = sG;
    var breath = gainNode(1, hp); sBp.connect(breath); breath.gain.value = 0; A.breath = breath;
    var l1 = osc('sine', 0.13), l1g = gainNode(0.025); l1.connect(l1g); l1g.connect(breath.gain);
    var l2 = osc('sine', 0.047), l2g = gainNode(0.02); l2.connect(l2g); l2g.connect(breath.gain);
    // heterodyne whistle
    A.beatO = osc('sine', 1000); A.beatG = gainNode(0, hp); A.beatO.connect(A.beatG);
    // CW tone: oscillator -> key (gated) -> level
    A.cwO = osc('sine', 700); A.cwKey = gainNode(0); A.cwG = gainNode(0, hp); A.cwO.connect(A.cwKey); A.cwKey.connect(A.cwG);
    var cwO2 = osc('sine', 1400); var cw2 = gainNode(0.08, A.cwKey); cwO2.connect(cw2); A.cwO2 = cwO2;
    // AM voice mumble: noise through two moving formants, syllable envelope
    var mN = loopNoise(c, 'white'), f1 = filt('bandpass', 600, 5), f2 = filt('bandpass', 1500, 7);
    mN.connect(f1); mN.connect(f2); A.mSyl = gainNode(0); f1.connect(A.mSyl); f2.connect(gainNode(0.6, A.mSyl));
    A.mumG = gainNode(0, hp); A.mSyl.connect(A.mumG); A.f1 = f1; A.f2 = f2;
    // broadcast music: a slow modal pad plus a plucked line
    A.musG = gainNode(0, hp);
    [146.8, 220, 293.7, 349.2].forEach(function (f, i) { var o = osc(i % 2 ? 'triangle' : 'sine', f), g = gainNode(0.08 / (i + 1), A.musG); o.connect(g); var lf = osc('sine', 0.2 + i * 0.07), lg = gainNode(0.03); lf.connect(lg); lg.connect(g.gain); });
    // interval signal and pips go into their own bus (also through the radio)
    A.tuneG = gainNode(0.0, hp);
    A.pipG = gainNode(0.0, hp);
    // tick the syllables, crackles and the musical line
    A._iv = setInterval(tick, 90);
    A.setRx(null);
  };
  var syl = 0, crackAt = 0;
  function tick() {
    var c = A.ctx; if (!c || !A.rxOn) return;
    var t = c.currentTime;
    // voice syllables
    syl -= 90;
    if (syl <= 0) {
      var on = Math.random() < 0.72, dur = 90 + Math.random() * 260; syl = dur;
      A.mSyl.gain.setTargetAtTime(on ? 0.5 + Math.random() * 0.5 : 0.02, t, 0.03);
      A.f1.frequency.setTargetAtTime(350 + Math.random() * 500, t, 0.05); A.f2.frequency.setTargetAtTime(1000 + Math.random() * 1400, t, 0.05);
    }
    // crackle
    if (t > crackAt && A.lastNoise > 0.05) {
      crackAt = t + 0.1 + Math.random() * 1.6 / (0.3 + A.lastNoise);
      var b = c.createBufferSource(); b.buffer = A._white; var g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08 + Math.random() * 0.25 * A.lastNoise, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.006 + Math.random() * 0.02);
      b.connect(g); g.connect(A.rxIn); b.start(t, Math.random() * 2, 0.04);
    }
  }
  /** o: null (receiver off) or {noise 0..1, beatHz, beatVol, cwHz, cwVol, mumble, music, level} */
  A.lastNoise = 0;
  A.setRx = function (o) {
    var c = A.ctx; if (!c || !A.started) return;
    var t = c.currentTime, k = 0.06;
    A.rxOn = !!o;
    if (!o) { A.rx.gain.setTargetAtTime(0, t, 0.25); return; }
    A.rx.gain.setTargetAtTime(o.level === undefined ? 1 : o.level, t, 0.2);
    A.lastNoise = o.noise || 0;
    A.staticG.gain.setTargetAtTime(0.05 + 0.12 * (o.noise || 0), t, k);
    A.breath.gain.setTargetAtTime(0.02 + 0.05 * (o.noise || 0), t, 0.3);
    A.beatO.frequency.setTargetAtTime(UIclamp(o.beatHz || 1000, 40, 5000), t, 0.03);
    A.beatG.gain.setTargetAtTime(o.beatVol || 0, t, k);
    A.cwO.frequency.setTargetAtTime(UIclamp(o.cwHz || 700, 200, 2600), t, 0.03); A.cwO2.frequency.setTargetAtTime(UIclamp((o.cwHz || 700) * 2, 200, 5000), t, 0.03);
    A.cwG.gain.setTargetAtTime(o.cwVol || 0, t, k);
    A.mumG.gain.setTargetAtTime(o.mumble || 0, t, k);
    A.musG.gain.setTargetAtTime(o.music || 0, t, k);
    A.tuneG.gain.setTargetAtTime(o.tune || 0, t, k);
    A.pipG.gain.setTargetAtTime(o.pips === undefined ? 0.7 : o.pips, t, k);
  };

  // ------------------------------------------------------------------ Morse keyer
  /** fist: {wpm, dah (dah/dit ratio), jitter, gap (letter-gap stretch), swing} */
  A.fistFor = function (cs, f) {
    if (f && f.wpm) return f;
    var r = UIrand('fist:' + cs);
    return { wpm: 13 + Math.floor(r() * 9), dah: 2.6 + r() * 1.1, jitter: 0.04 + r() * 0.16, gap: 1 + r() * 0.7, swing: r() * 0.25 };
  };
  /** schedule text on the CW key from time t0; returns {end, marks:[{t, i}]} (marks = start time of each character) */
  A.keyText = function (text, fist, t0, gainNodeParam) {
    var c = A.ctx; if (!c || !A.started) return { end: 0, marks: [] };
    var p = gainNodeParam || A.cwKey.gain, u = 1.2 / (fist.wpm || 16), t = Math.max(t0 || 0, c.currentTime + 0.02), r = UIrand(text + (fist.wpm || 0) + t), marks = [];
    String(text).toUpperCase().split('').forEach(function (ch, i) {
      if (ch === ' ') { t += u * 4 * (fist.gap || 1); return; }
      var code = MORSE[ch]; if (!code) return;
      marks.push({ t: t, i: i, ch: ch });
      code.split('').forEach(function (el, j) {
        var len = (el === '.' ? u : u * (fist.dah || 3)) * (1 + (r() - 0.5) * 2 * (fist.jitter || 0.08)) * (j % 2 ? 1 - (fist.swing || 0) * 0.5 : 1 + (fist.swing || 0) * 0.5);
        p.setTargetAtTime(1, t, 0.004); p.setTargetAtTime(0, t + len, 0.005);
        t += len + u * (1 + (r() - 0.5) * (fist.jitter || 0.08));
      });
      t += u * 2 * (fist.gap || 1);
    });
    return { end: t, marks: marks };
  };
  A.stopKey = function () { if (!A.ctx || !A.started) return; var p = A.cwKey.gain; try { p.cancelScheduledValues(A.ctx.currentTime); } catch (e) { /* ignore */ } p.setTargetAtTime(0, A.ctx.currentTime, 0.005); };
  /** loop a call-up ("VVV DE KX7") until stopLoop() */
  A.loopKey = function (text, fist) {
    A.stopLoop();
    var go = function () { if (!A.ctx || !A.started) return; var r = A.keyText(text + '  ', fist, A.ctx.currentTime + 0.05); A._loopT = setTimeout(go, Math.max(300, (r.end - A.ctx.currentTime) * 1000 - 80)); };
    A._loopKey = text; go();
  };
  A.stopLoop = function () { clearTimeout(A._loopT); A._loopKey = null; A.stopKey(); };
  /** play a callsign's fist as a demo (traffic sheet) — straight into the ui bus, no static */
  A.demoFist = function (cs, fist) {
    var c = ctx(); if (!c || A.muted) return 0; A.start();
    var o = c.createOscillator(), key = c.createGain(), lvl = c.createGain(); o.type = 'sine'; o.frequency.value = 680; key.gain.value = 0; lvl.gain.value = 0.18;
    o.connect(key); key.connect(lvl); lvl.connect(A.ui); o.start();
    var r = A.keyText('VVV DE ' + cs + ' ' + cs, fist, c.currentTime + 0.1, key.gain);
    o.stop(r.end + 0.2);
    return r.end - c.currentTime;
  };

  // ------------------------------------------------------------------ numbers voice
  var voice = null;
  function pickVoice() {
    try {
      var vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
      if (!vs || !vs.length) return null;
      var pref = vs.filter(function (v) { return /en[-_]GB/i.test(v.lang) && /female|susan|serena|kate|hazel|fiona|moira/i.test(v.name); })[0] || vs.filter(function (v) { return /^en/i.test(v.lang); })[0] || vs[0];
      return pref;
    } catch (e) { return null; }
  }
  try { if (window.speechSynthesis) { voice = pickVoice(); speechSynthesis.onvoiceschanged = function () { voice = pickVoice(); }; } } catch (e) { /* ignore */ }
  A.canSpeak = function () { return !!(voice && window.speechSynthesis && !A.muted && UIPREF.get('speech', true)); };
  var WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  /** read one five-figure group. onDigit(i) is called as each digit is read; done() after. '?' digits are lost in a burst of static. */
  A.readGroup = function (group, onDigit, done, opts) {
    opts = opts || {};
    var digits = String(group).split(''), i = 0, finished = false;
    function fin() { if (finished) return; finished = true; clearTimeout(A._rgT); if (done) done(); }
    if (A.canSpeak() && !opts.pips) {
      // speak digit by digit so '?' can become static and the screen can follow
      var next = function () {
        if (finished) return;
        if (i >= digits.length) { A._rgT = setTimeout(fin, 380); return; }
        var d = digits[i], k = i; i++;
        if (onDigit) onDigit(k);
        if (d === '?' || !/\d/.test(d)) { A.crackle(0.35); A._rgT = setTimeout(next, 420); return; }
        try {
          var u = new SpeechSynthesisUtterance(WORDS[+d]); u.voice = voice; u.rate = 0.82; u.pitch = 0.55; u.volume = 0.9;
          var guard = setTimeout(next, 900);
          u.onend = function () { clearTimeout(guard); A._rgT = setTimeout(next, 160); };
          u.onerror = function () { clearTimeout(guard); A._rgT = setTimeout(next, 160); };
          speechSynthesis.speak(u);
        } catch (e) { A._rgT = setTimeout(next, 400); }
      };
      next();
      return { stop: function () { try { speechSynthesis.cancel(); } catch (e) { /* ignore */ } fin(); } };
    }
    // pips: one tone per digit, pitch coded; lost digits are static
    var step = opts.fast ? 150 : 330;
    var nx = function () {
      if (finished) return;
      if (i >= digits.length) { A._rgT = setTimeout(fin, opts.fast ? 120 : 420); return; }
      var d = digits[i], k = i; i++;
      if (onDigit) onDigit(k);
      if (d === '?' || !/\d/.test(d)) A.crackle(0.3); else A.pip(+d, opts.fast);
      A._rgT = setTimeout(nx, step);
    };
    nx();
    return { stop: fin };
  };
  A.pip = function (d, fast) {
    var c = A.ctx; if (!c || !A.started || A.muted) return;
    var t = c.currentTime + 0.01, f = 480 * Math.pow(2, d / 12), dur = fast ? 0.07 : 0.16;
    var o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01); g.gain.setValueAtTime(0.5, t + dur - 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.pipG); o.start(t); o.stop(t + dur + 0.05);
  };
  A.crackle = function (v) {
    var c = A.ctx; if (!c || !A.started) return;
    var t = c.currentTime, b = c.createBufferSource(), g = c.createGain(); b.buffer = A._white;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v || 0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    b.connect(g); g.connect(A.rxIn); b.start(t, Math.random(), 0.35);
  };
  A.stopVoice = function () { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ } clearTimeout(A._rgT); };

  // ------------------------------------------------------------------ interval signal
  // a music-box phrase, the station's identity; looped while the preamble runs
  var TUNE = [[74, 1], [77, 1], [81, 2], [79, 1], [77, 1], [76, 2], [74, 1], [69, 1], [72, 1], [74, 3]];
  A.intervalLoop = function (on) {
    clearTimeout(A._tuneT);
    if (!on) return;
    var c = A.ctx; if (!c || !A.started) return;
    var t = c.currentTime + 0.05, beat = 0.27;
    TUNE.forEach(function (n) {
      var f = 440 * Math.pow(2, (n[0] - 69) / 12);
      [1, 2.76, 5.4].forEach(function (h, k) {
        var o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f * h;
        var v = [0.5, 0.12, 0.05][k];
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + beat * n[1] + 0.35);
        o.connect(g); g.connect(A.tuneG); o.start(t); o.stop(t + beat * n[1] + 0.4);
      });
      t += beat * n[1];
    });
    A._tuneT = setTimeout(function () { A.intervalLoop(true); }, (t - c.currentTime + 0.9) * 1000);
  };

  // ------------------------------------------------------------------ burst
  A.burst = function (vol) {
    var c = A.ctx; if (!c || !A.started) return;
    var t = c.currentTime + 0.02, g = c.createGain(); g.gain.value = vol || 0.35; g.connect(A.rxIn);
    var o = c.createOscillator(); o.type = 'square';
    var tones = [1100, 1500, 1900, 2300, 2700];
    for (var i = 0; i < 110; i++) o.frequency.setValueAtTime(tones[Math.floor(Math.random() * tones.length)], t + i * 0.0075);
    var env = c.createGain(); env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(1, t + 0.02); env.gain.setValueAtTime(1, t + 0.8); env.gain.exponentialRampToValueAtTime(0.0001, t + 0.86);
    o.connect(env); env.connect(g); o.start(t); o.stop(t + 0.9);
  };

  // ------------------------------------------------------------------ cues
  function tone(f, t0, dur, type, vol, glide, bus) {
    var c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if (glide) o.frequency.exponentialRampToValueAtTime(glide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bus || A.ui); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function nz(t0, dur, f, q, vol, type) {
    var c = A.ctx, b = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    b.buffer = A._white; fl.type = type || 'bandpass'; fl.frequency.value = f; fl.Q.value = q || 1;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    b.connect(fl); fl.connect(g); g.connect(A.ui); b.start(t0, Math.random() * 2, dur + 0.05);
    return g;
  }
  A.cue = function (name) {
    if (A.muted) return;
    var c = ctx(); if (!c || c.state !== 'running' || !A.started) return;
    var t = c.currentTime + 0.005;
    switch (name) {
      case 'tap': nz(t, 0.025, 3200, 1.2, 0.08); tone(1900, t, 0.02, 'sine', 0.02); break;
      case 'switch': nz(t, 0.03, 2400, 0.8, 0.25); tone(140, t, 0.06, 'sine', 0.12); nz(t + 0.035, 0.02, 4000, 1, 0.1); break;
      case 'detent': nz(t, 0.012, 5200, 2, 0.05); break;
      case 'paper': nz(t, 0.22, 2600, 0.5, 0.05); nz(t + 0.08, 0.2, 5200, 0.7, 0.035); break;
      case 'pencil': for (var i = 0; i < 6; i++) nz(t + i * 0.055 + Math.random() * 0.02, 0.05, 4200 + Math.random() * 1600, 3, 0.03 + Math.random() * 0.03); break;
      case 'stamp': tone(92, t, 0.22, 'sine', 0.5, 55); nz(t, 0.06, 900, 0.7, 0.3); nz(t + 0.01, 0.05, 3000, 1, 0.08); break;
      case 'type': nz(t, 0.02, 3000, 1.5, 0.12); tone(180, t, 0.03, 'square', 0.02); break;
      case 'bell': tone(2093, t, 0.9, 'sine', 0.08); tone(2637, t, 0.6, 'sine', 0.03); break;
      case 'phone': for (var r = 0; r < 2; r++) for (var j = 0; j < 12; j++) { tone(900, t + r * 0.5 + j * 0.03, 0.028, 'triangle', 0.04); tone(1100, t + r * 0.5 + j * 0.03, 0.028, 'triangle', 0.03); } break;
      case 'ok': tone(660, t, 0.12, 'sine', 0.06); tone(990, t + 0.08, 0.22, 'sine', 0.05); break;
      case 'err': tone(196, t, 0.2, 'triangle', 0.08); tone(185, t + 0.1, 0.25, 'triangle', 0.07); break;
      case 'open': nz(t, 0.16, 1800, 0.6, 0.05); break;
      case 'close': nz(t, 0.12, 1300, 0.6, 0.04); break;
      case 'shift': tone(98, t, 1.6, 'sine', 0.12, 73.4); tone(146.8, t + 0.1, 1.4, 'triangle', 0.03, 110); break;
      case 'win': [523.3, 659.3, 784, 1046.5].forEach(function (f, k) { tone(f, t + k * 0.12, 0.8, 'sine', 0.06); }); break;
      case 'lose': [392, 349.2, 311.1, 261.6].forEach(function (f, k) { tone(f, t + k * 0.22, 1, 'triangle', 0.05); }); break;
      case 'beep': tone(1250, t, 0.07, 'sine', 0.12); break;
      case 'beephi': tone(1650, t, 0.05, 'sine', 0.14); break;
      case 'engine': nz(t, 0.4, 120, 0.8, 0.2, 'lowpass'); break;
    }
  };
  A.setMuted = function (m) {
    A.muted = !!m; UIPREF.set('muted', A.muted);
    var c = ctx(); if (!c) return;
    A.master.gain.setTargetAtTime(A.muted ? 0 : 1, c.currentTime, 0.08);
    if (A.muted) A.stopVoice(); else A.start();
  };
  function first() { A.start(); document.removeEventListener('pointerdown', first, true); document.removeEventListener('keydown', first, true); }
  document.addEventListener('pointerdown', first, true);
  document.addEventListener('keydown', first, true);
  return A;
})();
