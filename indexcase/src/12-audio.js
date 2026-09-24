/* INDEX CASE UI — 12-audio.js: quiet WebAudio room tone and cues. Starts on the
 * first user gesture; mute persists per viewer. */
var UIAudio = (function () {
  var A = { ctx: null, master: null, amb: null, muted: UIPREF.get('muted', false), started: false };
  function ctx() {
    if (A.ctx) return A.ctx;
    var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    try { A.ctx = new C(); } catch (e) { return null; }
    A.master = A.ctx.createGain(); A.master.gain.value = A.muted ? 0 : 0.9; A.master.connect(A.ctx.destination);
    return A.ctx;
  }
  function noiseBuf(c, secs) {
    var b = c.createBuffer(1, c.sampleRate * secs, c.sampleRate), d = b.getChannelData(0), last = 0;
    for (var i = 0; i < d.length; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    return b;
  }
  A.start = function () {
    var c = ctx(); if (!c) return;
    if (c.state === 'suspended') c.resume();
    if (A.started) return; A.started = true;
    // room tone: brown noise through a low-pass, a faint mains hum, a slow pad breathing
    var g = c.createGain(); g.gain.value = 0; g.connect(A.master); A.amb = g;
    var n = c.createBufferSource(); n.buffer = noiseBuf(c, 4); n.loop = true;
    var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
    var ng = c.createGain(); ng.gain.value = 0.05; n.connect(lp); lp.connect(ng); ng.connect(g); n.start();
    [55, 110.4].forEach(function (f, i) { var o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; var og = c.createGain(); og.gain.value = i ? 0.004 : 0.009; o.connect(og); og.connect(g); o.start(); });
    [[146.8, 0], [220, 3], [277.2, 7]].forEach(function (p) {
      var o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = p[0];
      var og = c.createGain(); og.gain.value = 0; o.connect(og); og.connect(g); o.start();
      var lfo = c.createOscillator(); lfo.frequency.value = 0.035 + p[1] * 0.004; var lg = c.createGain(); lg.gain.value = 0.004; lfo.connect(lg); lg.connect(og.gain); lfo.start();
    });
    g.gain.setTargetAtTime(0.7, c.currentTime, 3);
  };
  A.setMuted = function (m) {
    A.muted = !!m; UIPREF.set('muted', A.muted);
    var c = ctx(); if (!c) return;
    A.master.gain.setTargetAtTime(A.muted ? 0 : 0.9, c.currentTime, 0.08);
    if (!A.muted) A.start();
  };
  function tone(f, t0, dur, type, vol, glide) {
    var c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if (glide) o.frequency.exponentialRampToValueAtTime(glide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(A.master); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  A.cue = function (name) {
    if (A.muted) return;
    var c = ctx(); if (!c || c.state !== 'running') return;
    var t = c.currentTime + 0.01;
    switch (name) {
      case 'tap': tone(1800, t, 0.035, 'sine', 0.018); break;
      case 'open': tone(620, t, 0.09, 'sine', 0.03, 880); break;
      case 'close': tone(700, t, 0.08, 'sine', 0.022, 480); break;
      case 'ok': tone(660, t, 0.12, 'sine', 0.05); tone(990, t + 0.07, 0.2, 'sine', 0.04); break;
      case 'err': tone(220, t, 0.16, 'triangle', 0.05); tone(196, t + 0.09, 0.2, 'triangle', 0.045); break;
      case 'msg': tone(1174.7, t, 0.5, 'sine', 0.03); tone(1568, t + 0.09, 0.6, 'sine', 0.022); break;
      case 'lab': tone(2093, t, 0.6, 'sine', 0.02); tone(2637, t + 0.05, 0.8, 'sine', 0.012); break;
      case 'phone': for (var i = 0; i < 2; i++) for (var j = 0; j < 8; j++) { tone(440, t + i * 0.55 + j * 0.05, 0.045, 'square', 0.012); tone(480, t + i * 0.55 + j * 0.05, 0.045, 'square', 0.01); } break;
      case 'night': tone(98, t, 1.6, 'sine', 0.07, 73.4); tone(146.8, t + 0.1, 1.4, 'triangle', 0.02, 110); break;
      case 'morning': tone(392, t, 0.7, 'sine', 0.03); tone(587.3, t + 0.12, 0.9, 'sine', 0.025); tone(784, t + 0.24, 1.2, 'sine', 0.018); break;
      case 'act': tone(65.4, t, 2.8, 'sine', 0.12, 61); tone(196, t + 0.05, 2.2, 'triangle', 0.03); tone(233.1, t + 0.4, 2, 'triangle', 0.025); tone(293.7, t + 0.8, 1.8, 'sine', 0.02); break;
      case 'publish': tone(523.3, t, 0.25, 'sine', 0.04); tone(659.3, t + 0.1, 0.3, 'sine', 0.035); tone(784, t + 0.2, 0.5, 'sine', 0.03); break;
      case 'toll': tone(174.6, t, 3, 'sine', 0.05); tone(349.2, t, 2.2, 'sine', 0.012); break;
    }
  };
  function first() { A.start(); document.removeEventListener('pointerdown', first, true); document.removeEventListener('keydown', first, true); }
  document.addEventListener('pointerdown', first, true);
  document.addEventListener('keydown', first, true);
  return A;
})();
