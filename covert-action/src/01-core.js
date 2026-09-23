// ===================================================================
// CORE: screen, palette, input, sound, rng, drawing primitives, scenes
// ===================================================================
const W = 320, H = 200;
const cv = document.getElementById('screen');
let g = cv.getContext('2d', { alpha: false });
const SCREEN = g;
g.imageSmoothingEnabled = false;

// MCGA-era palette, picked by hand to sit in the 6-bit-per-channel VGA DAC range
const P = {
  K: '#000000', DK: '#141418', D2: '#24242c', G1: '#383844', G2: '#545464', G3: '#7c7c8c', G4: '#a8a8b8', G5: '#cccccc', W: '#fcfcfc',
  NV: '#000c38', BL: '#1c2c9c', BL2: '#3450d0', BL3: '#6c8cfc', CY: '#54d8fc', TL: '#1c7c7c',
  YE: '#fce03c', YE2: '#b89c1c', OR: '#f47c18', RD: '#b40c0c', RD2: '#f04040', PK: '#fc9cb4',
  GR: '#107c1c', GR2: '#3cb838', GR3: '#90e070', DG: '#0c3c10', OL: '#5c6824',
  BR: '#5c3814', BR2: '#8c5c2c', BR3: '#b8844c', TN: '#dcb884', CR: '#ece0bc',
  SK: '#f0b088', SK2: '#b87850', SK3: '#6c4028', PU: '#6c2c9c', PU2: '#a860dc', MG: '#c02c8c',
};

// ---------- fit canvas ----------
function fit() {
  const touch = document.body.classList.contains('touch');
  const vw = window.innerWidth, vh = window.innerHeight - (touch ? 190 : 0);
  // original ran 320x200 on a 4:3 monitor: pixels were 1.2x taller than wide
  let w = Math.min(vw, vh * 4 / 3), h = w * 3 / 4;
  if (w >= 640 && !touch) { const s = Math.floor(w / 320); w = 320 * s; h = w * 3 / 4; }
  cv.style.width = Math.floor(w) + 'px'; cv.style.height = Math.floor(h) + 'px';
}
window.addEventListener('resize', fit);

// ---------- rng ----------
let seed = (Date.now() ^ 0x5eed) >>> 0;
function rnd() { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = a => a[Math.floor(rnd() * a.length)];
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

// ---------- drawing primitives ----------
function rect(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); }
function px(x, y, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, 1, 1); }
function frame(x, y, w, h, c) { rect(x, y, w, 1, c); rect(x, y + h - 1, w, 1, c); rect(x, y, 1, h, c); rect(x + w - 1, y, 1, h, c); }
function line(x0, y0, x1, y1, c) {
  x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; g.fillStyle = c;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
  for (let n = 0; n < 2000; n++) { g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
function disc(cx, cy, r, c) { g.fillStyle = c; for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.8)); g.fillRect(cx - w | 0, cy + y | 0, w * 2 + 1, 1); } }
// 4x4 ordered (Bayer) dither: the signature look of 1990 gradients
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function dither(x, y, w, h, c1, c2, level) { // level 0..16 = amount of c2
  rect(x, y, w, h, c1); if (level <= 0) return; g.fillStyle = c2;
  if (level >= 16) { g.fillRect(x, y, w, h); return; }
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (BAYER[((y + yy) & 3) * 4 + ((x + xx) & 3)] < level) g.fillRect(x + xx, y + yy, 1, 1);
}
function vgrad(x, y, w, h, cols) { // banded + dithered vertical gradient through a list of colours
  const seg = h / (cols.length - 1);
  for (let yy = 0; yy < h; yy++) {
    const t = yy / seg, i = Math.min(cols.length - 2, Math.floor(t)), f = t - i;
    const lvl = Math.round(f * 16);
    g.fillStyle = cols[i]; g.fillRect(x, y + yy, w, 1);
    if (lvl > 0) { g.fillStyle = cols[i + 1]; for (let xx = 0; xx < w; xx++) if (BAYER[((y + yy) & 3) * 4 + ((x + xx) & 3)] < lvl) g.fillRect(x + xx, y + yy, 1, 1); }
  }
}
// raised / sunken bevel boxes, MicroProse-menu style
function bevel(x, y, w, h, face, hi, lo) { rect(x, y, w, h, face); rect(x, y, w, 1, hi); rect(x, y, 1, h, hi); rect(x, y + h - 1, w, 1, lo); rect(x + w - 1, y, 1, h, lo); }
function panel(x, y, w, h) { rect(x, y, w, h, P.K); bevel(x + 1, y + 1, w - 2, h - 2, P.G3, P.G5, P.G1); rect(x + 4, y + 4, w - 8, h - 8, P.G1); rect(x + 5, y + 5, w - 10, h - 10, P.NV); }

// cached offscreen sprites
const spriteCache = new Map();
function sprite(key, w, h, drawFn) {
  let c = spriteCache.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; drawTo(c.getContext('2d'), drawFn); spriteCache.set(key, c); }
  return c;
}
let gStack = [];
function drawTo(ctx, fn) { gStack.push(g); g = ctx; try { fn(); } finally { g = gStack.pop(); } }

// ---------- input ----------
// logical buttons: up down left right fire action alt alt2 select menu
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'fire', ControlLeft: 'fire', KeyE: 'action', KeyX: 'action', KeyG: 'alt', KeyQ: 'alt', Tab: 'alt2', Enter: 'select', NumpadEnter: 'select', Escape: 'menu',
};
const held = new Set(); const pressedQ = [];
const input = {
  held: k => held.has(k),
  axis() { return { x: (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0), y: (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0) }; },
};
let typing = false; // crypto scene wants raw letters
window.addEventListener('keydown', e => {
  if (e.code === 'KeyM' && !typing) { sfx.toggle(); e.preventDefault(); return; }
  if (typing && /^Key[A-Z]$/.test(e.code) && !e.ctrlKey && !e.metaKey) { scene.onChar && scene.onChar(e.code.slice(3)); e.preventDefault(); return; }
  if (typing && (e.code === 'Backspace' || e.code === 'Delete')) { scene.onChar && scene.onChar(''); e.preventDefault(); return; }
  const k = KEYMAP[e.code]; if (!k) return;
  e.preventDefault(); sfx.unlock();
  if (!held.has(k)) { pressedQ.push(k); }
  held.add(k);
});
window.addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) held.delete(k); });
window.addEventListener('blur', () => held.clear());

// touch pad
document.querySelectorAll('#pad button').forEach(b => {
  const k = b.dataset.k;
  const down = e => { e.preventDefault(); sfx.unlock(); if (!held.has(k)) pressedQ.push(k); held.add(k); b.classList.add('on'); };
  const up = e => { e.preventDefault(); held.delete(k); b.classList.remove('on'); };
  b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
});
function enableTouch() { if (!document.body.classList.contains('touch')) { document.body.classList.add('touch'); fit(); } }
if (matchMedia('(pointer: coarse)').matches) enableTouch();
window.addEventListener('touchstart', enableTouch, { passive: true });

// pointer on the canvas -> game coordinates
const mouse = { x: -1, y: -1, down: false };
function toGame(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.focus(); sfx.unlock(); const p = toGame(e); mouse.x = p.x; mouse.y = p.y; mouse.down = true; scene.onTap && scene.onTap(p.x, p.y); });
cv.addEventListener('pointermove', e => { const p = toGame(e); mouse.x = p.x; mouse.y = p.y; scene.onHover && scene.onHover(p.x, p.y); });
window.addEventListener('pointerup', () => { mouse.down = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());

// ---------- sound: PC-speaker / early AdLib flavoured square-wave bleeps ----------
const sfx = {
  ctx: null, muted: false,
  unlock() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; } try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; } },
  toggle() { this.muted = !this.muted; toast(this.muted ? 'SOUND OFF' : 'SOUND ON'); },
  tone(f, d = 0.08, type = 'square', vol = 0.06, slide = 0, delay = 0) {
    if (this.muted || !this.ctx) return; const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), gn = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(gn); gn.connect(c.destination); o.start(t); o.stop(t + d + 0.02);
  },
  noise(d = 0.15, vol = 0.1, hp = 800, delay = 0) {
    if (this.muted || !this.ctx) return; const c = this.ctx, t = c.currentTime + delay, n = Math.floor(c.sampleRate * d);
    const b = c.createBuffer(1, n, c.sampleRate), a = b.getChannelData(0); for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; const gn = c.createGain(); gn.gain.value = vol;
    s.connect(f); f.connect(gn); gn.connect(c.destination); s.start(t);
  },
  blip() { this.tone(880, 0.03, 'square', 0.04); },
  select() { this.tone(660, 0.05, 'square', 0.05); this.tone(990, 0.06, 'square', 0.05, 0, 0.05); },
  deny() { this.tone(160, 0.18, 'square', 0.06); },
  shot() { this.noise(0.12, 0.18, 400); this.tone(220, 0.08, 'square', 0.05, -150); },
  boom() { this.noise(0.6, 0.3, 60); this.tone(90, 0.5, 'sawtooth', 0.08, -60); },
  hiss() { this.noise(0.8, 0.06, 2500); },
  alarm() { for (let i = 0; i < 4; i++) { this.tone(900, 0.16, 'square', 0.05, 0, i * 0.34); this.tone(600, 0.16, 'square', 0.05, 0, i * 0.34 + 0.17); } },
  tick() { this.tone(1400, 0.015, 'square', 0.025); },
  success() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, 'square', 0.05, 0, i * 0.1)); },
  fail() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.16, 'square', 0.05, 0, i * 0.14)); },
  jingle() { // title sting
    const n = [196, 0, 196, 233, 262, 0, 196, 175, 196, 0, 147, 0, 156, 175, 196];
    n.forEach((f, i) => { if (f) { this.tone(f, 0.16, 'square', 0.045, 0, i * 0.13); this.tone(f / 2, 0.16, 'triangle', 0.07, 0, i * 0.13); } });
  },
};

// ---------- toast / scenes ----------
let toastMsg = '', toastT = 0;
function toast(m, t = 1.6) { toastMsg = m; toastT = t; }
let scene = { update() {}, draw() {} };
function go(s) { if (scene.leave) scene.leave(); scene = s; typing = !!s.typing; held.clear(); pressedQ.length = 0; if (s.enter) s.enter(); }

let last = performance.now(), acc = 0; const STEP = 1 / 60;
function frameLoop(now) {
  let dt = Math.min(0.1, (now - last) / 1000); last = now; acc += dt;
  while (pressedQ.length) { const k = pressedQ.shift(); scene.onKey && scene.onKey(k); }
  let n = 0; while (acc >= STEP && n < 6) { scene.update && scene.update(STEP); acc -= STEP; n++; }
  if (n === 6) acc = 0;
  g.save(); scene.draw && scene.draw(); g.restore();
  if (toastT > 0) { toastT -= dt; const w = textW(toastMsg) + 10; rect((W - w) / 2, 4, w, 12, P.K); frame((W - w) / 2, 4, w, 12, P.YE); text(toastMsg, (W - w) / 2 + 5, 7, P.YE); }
  requestAnimationFrame(frameLoop);
}
