// ===================================================================
// CORE: screen, palette, input, sound, rng, drawing primitives, scenes
// ===================================================================
const W = 320, H = 200;
const cv = document.getElementById('screen');
// the layout is 320x200 as in 1990, but the screen is rendered at RES x that, so art can use finer pixels
const RES = 2; cv.width = W * RES; cv.height = H * RES;
let g = cv.getContext('2d', { alpha: false });
const SCREEN = g;
g.setTransform(RES, 0, 0, RES, 0, 0); g.imageSmoothingEnabled = false;

// MCGA-era palette, picked by hand to sit in the 6-bit-per-channel VGA DAC range
// The 16-colour EGA palette the original ran in, under descriptive names.
const EGA = { black: '#000000', blue: '#0000AA', green: '#00AA00', cyan: '#00AAAA', red: '#AA0000', magenta: '#AA00AA', brown: '#AA5500', lgray: '#AAAAAA',
  dgray: '#555555', lblue: '#5555FF', lgreen: '#55FF55', lcyan: '#55FFFF', lred: '#FF5555', lmagenta: '#FF55FF', yellow: '#FFFF55', white: '#FFFFFF' };
const P = {
  K: EGA.black, DK: EGA.black, D2: EGA.black, G1: EGA.dgray, G2: EGA.dgray, G3: EGA.lgray, G4: EGA.lgray, G5: EGA.white, W: EGA.white,
  NV: EGA.blue, BL: EGA.blue, BL2: EGA.lblue, BL3: EGA.lblue, CY: EGA.lcyan, TL: EGA.cyan,
  YE: EGA.yellow, YE2: EGA.brown, OR: EGA.lred, RD: EGA.red, RD2: EGA.lred, PK: EGA.lmagenta,
  GR: EGA.green, GR2: EGA.lgreen, GR3: EGA.lgreen, DG: EGA.black, OL: EGA.brown,
  BR: EGA.brown, BR2: EGA.brown, BR3: EGA.lgray, TN: EGA.lgray, CR: EGA.white,
  SK: EGA.lred, SK2: EGA.brown, SK3: EGA.red, PU: EGA.magenta, PU2: EGA.lmagenta, MG: EGA.magenta,
};

// ---------- fit canvas ----------
function fit() {
  const touch = document.body.classList.contains('touch');
  const kbUp = document.activeElement && document.activeElement.id === 'kb'; // the phone keyboard covers the pad anyway
  const land = touch && window.innerWidth > window.innerHeight; document.body.classList.toggle('land', land);
  // landscape: controls sit either side of the screen; portrait: under it
  const vw = window.innerWidth - (land ? 2 * Math.min(190, Math.max(150, window.innerWidth * 0.2)) : 0), vh = window.innerHeight - (touch && !land && !kbUp ? 190 : 0);
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
// colour mixing: the old ordered dither is now a clean blend of its two colours (no checkerboard noise)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const mixCache = new Map();
function hexRGB(c) { if (c[0] !== '#') return null; if (c.length === 4) c = '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]; const n = parseInt(c.slice(1, 7), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(c1, c2, k) { // k 0..1 towards c2
  const key = c1 + c2 + k; let r = mixCache.get(key); if (r) return r;
  const a = hexRGB(c1), b = hexRGB(c2);
  if (!a || !b) r = b ? 'rgba(' + b.join(',') + ',' + k.toFixed(3) + ')' : c2;
  else r = '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
  mixCache.set(key, r); return r;
}
function dither(x, y, w, h, c1, c2, level) { // level 0..16 = amount of c2
  if (level <= 0) { rect(x, y, w, h, c1); return; }
  if (level >= 16) { rect(x, y, w, h, c2); return; }
  if (!hexRGB(c1)) { if (c1 !== 'rgba(0,0,0,0)') rect(x, y, w, h, c1); rect(x, y, w, h, mix(c1, c2, level / 16)); return; }
  rect(x, y, w, h, mix(c1, c2, level / 16));
}
function vgrad(x, y, w, h, cols) { // smooth vertical gradient through a list of colours
  const seg = h / (cols.length - 1);
  for (let yy = 0; yy < h; yy++) { const t = yy / seg, i = Math.min(cols.length - 2, Math.floor(t)); g.fillStyle = mix(cols[i], cols[i + 1], Math.round((t - i) * 16) / 16); g.fillRect(x, y + yy, w, 1); }
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
// hi-res art: art() caches a picture drawn on the FINE grid (RES x the layout pixels);
// fine(fn) draws straight to the screen in fine-grid coordinates. blit() places an art() canvas in layout coords.
const artCache = new Map();
function art(key, w, h, drawFn) {
  let c = artCache.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = w * RES; c.height = h * RES; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; drawTo(x, drawFn); artCache.set(key, c); }
  return c;
}
function blit(c, x, y) { g.drawImage(c, x, y, c.width / RES, c.height / RES); }
function fine(fn) { g.save(); g.scale(1 / RES, 1 / RES); try { fn(); } finally { g.restore(); } }
let gStack = [];
function drawTo(ctx, fn) { gStack.push(g); g = ctx; try { fn(); } finally { g = gStack.pop(); } }

// ---------- input ----------
// logical buttons: up down left right fire action alt alt2 select menu
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'fire', ControlLeft: 'fire', KeyE: 'action', KeyX: 'action', KeyG: 'alt', KeyQ: 'alt', Tab: 'alt2', Enter: 'select', NumpadEnter: 'select', Escape: 'menu',
};
const held = new Set(); const pressedQ = [];
const stick = { on: false, x: 0, y: 0, dir: null, rep: 0 }; // the touch thumbstick, -1..1 each way
const input = {
  held: k => held.has(k),
  axis() { if (stick.on && (stick.x || stick.y)) return { x: stick.x, y: stick.y }; return { x: (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0), y: (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0) }; },
};
let typing = false; // crypto scene wants raw letters
window.addEventListener('keydown', e => {
  // letters typed into the phone keyboard field arrive through its input event instead
  if (e.target && e.target.id === 'kb' && (e.key === 'Enter' || e.key === 'Backspace' || e.key === ' ' || e.keyCode === 229 || e.key === 'Unidentified' || /^Key[A-Z]$/.test(e.code))) return;
  if (e.code === 'KeyM' && !typing) { sfx.toggle(); e.preventDefault(); return; }
  if (typing && /^Key[A-Z]$/.test(e.code) && !e.ctrlKey && !e.metaKey) { scene.onChar && scene.onChar(e.code.slice(3)); e.preventDefault(); return; }
  if (typing && (e.code === 'Backspace' || e.code === 'Delete')) { scene.onChar && scene.onChar(''); e.preventDefault(); return; }
  if (scene.rawKey && scene.rawKey(e)) { e.preventDefault(); sfx.unlock(); return; }
  const k = KEYMAP[e.code]; if (!k) return;
  e.preventDefault(); sfx.unlock();
  if (!held.has(k)) { pressedQ.push(k); }
  held.add(k);
});
window.addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) held.delete(k); });
window.addEventListener('blur', () => held.clear());

// touch pad
document.querySelectorAll('#pad button[data-k]').forEach(b => {
  const k = b.dataset.k;
  b.addEventListener('mousedown', e => e.preventDefault()); // keep the keyboard field focused
  const down = e => { e.preventDefault(); sfx.unlock(); if (!held.has(k)) pressedQ.push(k); held.add(k); b.classList.add('on'); kbOpen(); };
  const up = e => { e.preventDefault(); held.delete(k); b.classList.remove('on'); };
  b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
});
// ---------- the phone's own keyboard, for scenes that want letters (codebreaking, mainframe, codename) ----------
const kb = document.getElementById('kb'), KB_FILL = '  ';
let kbWanted = false;
function kbReset() { kb.value = KB_FILL; try { kb.setSelectionRange(KB_FILL.length, KB_FILL.length); } catch (e) {} }
// focusing only raises the keyboard inside a tap on iOS, so this is called from tap handlers too
function kbOpen() { if (!typing || !document.body.classList.contains('touch')) return; if (document.activeElement !== kb) { kbReset(); kb.focus({ preventScroll: true }); } }
kb.addEventListener('input', () => {
  const v = kb.value;
  if (v.length < KB_FILL.length) { if (typing && scene.onChar) scene.onChar(''); }
  else for (const ch of v.slice(KB_FILL.length).toUpperCase()) { if (ch >= 'A' && ch <= 'Z') { if (typing && scene.onChar) scene.onChar(ch); } else if (ch === ' ') pressedQ.push('fire'); }
  kbReset();
});
kb.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pressedQ.push('select'); } });
document.getElementById('k-kb').addEventListener('pointerdown', e => { e.preventDefault(); sfx.unlock(); kbReset(); kb.focus({ preventScroll: true }); });
document.getElementById('k-kb').addEventListener('mousedown', e => e.preventDefault());
// each frame: raise the keyboard when a typing scene starts (Android allows it), drop it when typing ends
function kbSync() {
  const want = typing && document.body.classList.contains('touch');
  document.body.classList.toggle('typing', want);
  if (want && !kbWanted) kbOpen();
  if (!want && document.activeElement === kb) kb.blur();
  kbWanted = want;
}
// ---------- thumbstick: analog for walking, and a press + auto-repeat for menus and grids ----------
(function () {
  const zone = document.getElementById('stick'), knob = zone.querySelector('.knob'), base = zone.querySelector('.base');
  const R = 44, DEAD = 0.28; let id = null, cx = 0, cy = 0;
  const setDirs = () => {
    const m = Math.hypot(stick.x, stick.y), dirs = [];
    if (m > DEAD) { if (stick.x > 0.38 * m) dirs.push('right'); if (stick.x < -0.38 * m) dirs.push('left'); if (stick.y > 0.38 * m) dirs.push('down'); if (stick.y < -0.38 * m) dirs.push('up'); }
    for (const k of ['up', 'down', 'left', 'right']) if (!dirs.includes(k)) held.delete(k);
    // the main direction presses once, then repeats while held, like a key
    const main = m > 0.5 ? (Math.abs(stick.x) > Math.abs(stick.y) ? (stick.x > 0 ? 'right' : 'left') : (stick.y > 0 ? 'down' : 'up')) : null;
    if (main !== stick.dir) { stick.dir = main; stick.rep = 0.45; if (main) pressedQ.push(main); }
    for (const k of dirs) held.add(k);
  };
  const place = (x, y) => { knob.style.transform = 'translate(' + x + 'px,' + y + 'px)'; };
  const move = e => { let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } place(dx, dy); const m = Math.hypot(dx, dy) / R; stick.x = m < DEAD ? 0 : dx / R; stick.y = m < DEAD ? 0 : dy / R; setDirs(); };
  zone.addEventListener('pointerdown', e => {
    e.preventDefault(); sfx.unlock(); kbOpen(); if (id !== null) return; id = e.pointerId; zone.setPointerCapture(id);
    // the stick centres where the thumb lands, inside the zone
    const r = zone.getBoundingClientRect(); cx = clamp(e.clientX, r.left + 40, r.right - 40); cy = clamp(e.clientY, r.top + 40, r.bottom - 40);
    const ox = cx - (r.left + r.width / 2), oy = cy - (r.top + r.height / 2); base.style.transform = 'translate(' + ox + 'px,' + oy + 'px)';
    knob.style.left = (49 + ox) + 'px'; knob.style.top = (49 + oy) + 'px';
    stick.on = true; zone.classList.add('on'); move(e);
  });
  zone.addEventListener('pointermove', e => { if (e.pointerId === id) move(e); });
  const up = e => { if (e.pointerId !== id) return; id = null; stick.on = false; stick.x = stick.y = 0; setDirs(); zone.classList.remove('on'); base.style.transform = ''; knob.style.left = knob.style.top = ''; place(0, 0); };
  zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', up);
  zone.addEventListener('mousedown', e => e.preventDefault());
})();
function stickTick(dt) { if (!stick.dir || scene.noRepeat) return; stick.rep -= dt; if (stick.rep <= 0) { stick.rep = 0.2; pressedQ.push(stick.dir); } }
function enableTouch() { if (!document.body.classList.contains('touch')) { document.body.classList.add('touch'); fit(); } }
if (matchMedia('(pointer: coarse)').matches) enableTouch();
window.addEventListener('touchstart', enableTouch, { passive: true });

// pointer on the canvas -> game coordinates
const mouse = { x: -1, y: -1, down: false };
function toGame(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
cv.addEventListener('mousedown', e => { if (typing) e.preventDefault(); });
cv.addEventListener('pointerdown', e => { e.preventDefault(); if (typing && document.body.classList.contains('touch')) kbOpen(); else cv.focus(); sfx.unlock(); const p = toGame(e); mouse.x = p.x; mouse.y = p.y; mouse.down = true; scene.onTap && scene.onTap(p.x, p.y); });
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
  kbSync(); stickTick(dt);
  while (pressedQ.length) { const k = pressedQ.shift(); scene.onKey && scene.onKey(k); }
  let n = 0; while (acc >= STEP && n < 6) { scene.update && scene.update(STEP); acc -= STEP; n++; }
  if (n === 6) acc = 0;
  g.save(); scene.draw && scene.draw(); g.restore();
  if (toastT > 0) { toastT -= dt; const w = textW(toastMsg) + 10; rect((W - w) / 2, 4, w, 12, P.K); frame((W - w) / 2, 4, w, 12, P.YE); text(toastMsg, (W - w) / 2 + 5, 7, P.YE); }
  requestAnimationFrame(frameLoop);
}
