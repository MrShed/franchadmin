// ===================================================================
// HUB: every menu-driven screen, laid out after the 1990 EGA original
// ===================================================================

// ---------- UI ART KIT (uiX_): one lamp-lit desk world, drawn on the fine grid ----------
// Plan: a warm key light from the upper left (desk lamp), a cool fill from the right. Every plate,
// sheet and folder is lit the same way: bright top/left edge, shade on the right/bottom, a soft cast
// shadow to the lower right. Materials are clean clusters and banded gradients - no dither, no speckle.
// Ramps run dark -> light; shadows drift to violet/blue, highlights to yellow.
const uiX_WOOD = ['#170b0d', '#261210', '#381b13', '#4b2517', '#5f301c', '#763d22', '#8f4f2c', '#ae6c3e', '#c98a55'];
const uiX_STEEL = ['#0e1118', '#181d26', '#252c37', '#363f4c', '#4c5764', '#66727f', '#8894a0', '#adb8c1', '#d3dbe1', '#f0f4f6'];
const uiX_BRASS = ['#35200a', '#5e3c10', '#8a611b', '#b58a2c', '#d8b24f', '#f0d686', '#fff2c9'];
const uiX_PAPER = { hi: '#fdf9ec', lt: '#f7f0dc', base: '#f0e6cc', sh: '#e2d4b2', dk: '#c9b58f', edge: '#a38f6b' };
// inks on paper, and text on the dark screens
const uiX_I = { k: '#1c2030', g: '#6c6557', l: '#9a917d', b: '#24488f', r: '#ab2b21', gr: '#2c6a2c' };
function uiX_ink(c) { return c === P.K ? uiX_I.k : c === P.G1 ? uiX_I.g : c === P.G3 ? uiX_I.l : c === P.BL ? uiX_I.b : c === P.RD ? uiX_I.r : c === P.GR ? uiX_I.gr : c; }
const uiX_T = { hd: '#f4f0e6', opt: '#b3bac4', off: '#555c67', sel: '#2a1806', lcd: '#a4f28e', amber: '#ffbb4d', cyan: '#86e0ee' };
// folder card stock, one ramp per drawer colour: deep, dark, shade, base, light, highlight
const uiX_FOLD = {
  [P.YE]: ['#573816', '#86602f', '#b58b4e', '#d0aa68', '#e3c485', '#f4dea9'],
  [P.G3]: ['#262e2c', '#434f4a', '#63706a', '#828f87', '#a0aca2', '#c7d1c5'],
  [P.RD2]: ['#38110f', '#5f1d18', '#872f24', '#a44634', '#c0654b', '#dc9277'],
  [P.GR]: ['#1a2812', '#2f431c', '#465f29', '#5e7b37', '#7d994b', '#a9c079'],
  [P.TL]: ['#0c252f', '#163e4a', '#235866', '#327483', '#4e919e', '#85bbc1'],
  [P.BL]: ['#0b1230', '#15214a', '#21356b', '#2e488a', '#4662a8', '#7891ca'],
  [P.BL2]: ['#193050', '#294d74', '#3d6b99', '#5487b7', '#76a7d0', '#add0e9'],
};
const uiX_fr = c => uiX_FOLD[c] || uiX_FOLD[P.YE];
function uiX_hash(x, y, s = 0) { let n = Math.imul(x + 101 * s, 374761393) + Math.imul(y + 57 * s, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }

// --- fine-grid primitives (they draw on whatever g is: an art() canvas or the screen inside fine()) ---
function uiX_poly(pts, c) { g.fillStyle = c; g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fill(); }
function uiX_lg(x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; }
function uiX_rg(x, y, r0, r1, stops) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; }
// banded vertical gradient through a ramp: n clean steps, retro-style
function uiX_band(x, y, w, h, cols, n) {
  for (let i = 0; i < n; i++) {
    const y0 = y + Math.round(i * h / n), y1 = y + Math.round((i + 1) * h / n), t = n > 1 ? i / (n - 1) * (cols.length - 1) : 0, k = Math.min(cols.length - 2, Math.floor(t));
    rect(x, y0, w, y1 - y0, cols.length > 1 ? mix(cols[k], cols[k + 1], Math.round((t - k) * 8) / 8) : cols[0]);
  }
}
// a soft cast shadow: a core and a lighter penumbra, both offset to the lower right
function uiX_cast(x, y, w, h, a = 0.34, s = 3) { g.fillStyle = 'rgba(14,6,12,' + (a * 0.55).toFixed(3) + ')'; g.fillRect(x + s + 1, y + s + 1, w, h); g.fillStyle = 'rgba(14,6,12,' + a.toFixed(3) + ')'; g.fillRect(x + s, y + s, w - 1, h - 1); }
// a lit bevel: 1 fine pixel of highlight on top/left, shade on bottom/right
function uiX_bev(x, y, w, h, hi, lo, t = 1) { rect(x, y, w, t, hi); rect(x, y, t, h, hi); rect(x, y + h - t, w, t, lo); rect(x + w - t, y, t, h, lo); }
function uiX_circ(cx, cy, r, c) { g.fillStyle = c; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); }
// brushed-steel plate: a banded body, crisp bevel, hairline
function uiX_steelF(x, y, w, h, lvl = 0) {
  const S = uiX_STEEL, o = lvl;
  uiX_band(x, y, w, h, [S[6 + o], S[5 + o], S[4 + o], S[4 + o], S[3 + o]], Math.max(2, Math.min(10, h / 3 | 0)));
  for (let yy = y + 3; yy < y + h - 3; yy += 5) rect(x + 2, yy, w - 4, 1, 'rgba(255,255,255,0.045)');
  rect(x, y, w, 1, S[8 + Math.min(1, o)]); rect(x, y, 1, h, S[7 + o]); rect(x, y + h - 1, w, 1, S[1]); rect(x + w - 1, y, 1, h, S[2]);
}
// recessed glass well (for LCDs and screens): shadowed top/left lip, lit bottom/right lip
function uiX_wellF(x, y, w, h, glass) {
  const S = uiX_STEEL;
  rect(x - 2, y - 2, w + 4, h + 4, S[1]); rect(x - 2, y - 2, w + 4, 1, S[2]); rect(x - 2, y + h + 1, w + 4, 1, S[7]); rect(x + w + 1, y - 2, 1, h + 4, S[6]);
  rect(x - 1, y - 1, w + 2, h + 2, S[0]);
  if (glass) { uiX_band(x, y, w, h, glass, Math.max(2, h / 2 | 0)); g.fillStyle = 'rgba(255,255,255,0.05)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * 0.55, y); g.lineTo(x + w * 0.4, y + h * 0.5); g.lineTo(x, y + h * 0.5); g.fill(); }
}
// a slotted screw head, 8 fine pixels across
function uiX_screwF(cx, cy, r = 3.5) {
  uiX_circ(cx + 0.8, cy + 0.8, r + 0.6, 'rgba(0,0,0,0.45)');
  g.fillStyle = uiX_rg(cx - r * 0.4, cy - r * 0.4, 0, r * 1.5, [uiX_STEEL[9], uiX_STEEL[6], uiX_STEEL[3]]); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = uiX_STEEL[1]; g.lineWidth = 1.1; g.beginPath(); g.moveTo(cx - r * 0.7, cy + r * 0.45); g.lineTo(cx + r * 0.7, cy - r * 0.45); g.stroke();
}
// an LED with a soft glow
function uiX_ledF(cx, cy, on, c = '#ff5a3c', off = '#3a1510') {
  if (on) { g.fillStyle = uiX_rg(cx, cy, 0, 7, [c.length === 7 ? c + '66' : c, c.length === 7 ? c + '00' : 'rgba(0,0,0,0)']); g.fillRect(cx - 7, cy - 7, 14, 14); }
  uiX_circ(cx, cy, 2.4, '#0b0d12'); uiX_circ(cx, cy, 1.7, on ? c : off); if (on) rect(cx - 1, cy - 1, 1, 1, '#ffffff');
}

// --- desk, paper and stationery ---
// walnut desk top: planks lit by the lamp, long clean grain lines, a warm pool of light, darker edges
function uiX_woodF(x, y, w, h, seed = 1) {
  const Wd = uiX_WOOD, ph = 62;
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (let k = 0, py = y - ((seed * 23) % ph); py < y + h; py += ph, k++) {
    const tone = uiX_hash(k, seed, 3) < 0.5 ? 0 : 1;
    uiX_band(x, py, w, ph, [Wd[5 + tone], Wd[5], Wd[4 + tone], Wd[4]], 5);
    // grain: long waving lines in the plank's shadow colour, a few highlights between them
    for (let i = 0; i < 9; i++) {
      const gy = py + 5 + i * 6.2 + uiX_hash(k, i, 7) * 3, ph1 = uiX_hash(k, i, 8) * 6, ph2 = uiX_hash(k, i, 9) * 6, amp = 1.2 + uiX_hash(k, i, 10) * 2.2;
      const dark = i % 3 !== 1, c = dark ? mix(Wd[3], Wd[4], 0.35) : Wd[6 + tone];
      let on = uiX_hash(k, i, 11) < 0.7, run = 30 + uiX_hash(k, i, 12) * 160;
      for (let xx = x; xx < x + w; xx += 2) {
        if (--run < 0) { on = !on; run = on ? 40 + uiX_hash(xx, i + k * 9, 13) * 200 : 10 + uiX_hash(xx, i + k * 9, 14) * (dark ? 40 : 120); }
        if (!on) continue;
        const yy = gy + Math.sin(xx / (70 + i * 9) + ph1) * amp + Math.sin(xx / 23 + ph2) * 0.6;
        rect(xx, Math.round(yy), 2, 1, c);
      }
    }
    // a knot now and then
    if (uiX_hash(k, seed, 15) < 0.45) { const kx = x + uiX_hash(k, seed, 16) * w, ky = py + 18 + uiX_hash(k, seed, 17) * 26; for (let r = 7; r >= 2; r -= 2.5) { g.strokeStyle = r > 5 ? Wd[3] : Wd[2]; g.lineWidth = 1; g.beginPath(); g.ellipse(kx, ky, r * 2.4, r * 0.8, 0, 0, Math.PI * 2); g.stroke(); } uiX_circ(kx, ky, 1.5, Wd[1]); }
    // plank seam: a dark gap with a lit lip under it, and one butt joint per plank
    rect(x, py, w, 1, Wd[1]); rect(x, py + 1, w, 1, Wd[7]);
    const jx = x + uiX_hash(k, seed, 18) * w | 0; rect(jx, py, 1, ph, Wd[1]); rect(jx + 1, py, 1, ph, Wd[6]);
  }
  // lamp light from the upper left, falloff into the corners
  g.fillStyle = uiX_rg(x + w * 0.22, y + h * 0.18, 0, Math.max(w, h) * 0.75, ['rgba(255,196,120,0.20)', 'rgba(255,170,90,0.07)', 'rgba(0,0,0,0)']); g.fillRect(x, y, w, h);
  g.fillStyle = uiX_rg(x + w * 0.45, y + h * 0.4, Math.max(w, h) * 0.35, Math.max(w, h) * 0.85, ['rgba(12,4,16,0)', 'rgba(12,4,16,0.42)']); g.fillRect(x, y, w, h);
  g.restore();
}
// a sheet of paper: cast shadow, lit top-left edge, faint warm gradient
function uiX_paperF(x, y, w, h, shadow = true, tone = uiX_PAPER) {
  if (shadow) uiX_cast(x, y, w, h, 0.3, 3);
  g.fillStyle = uiX_lg(x, y, x + w * 0.35, y + h, [tone.hi, tone.lt, tone.base]); g.fillRect(x, y, w, h);
  rect(x, y, w, 1, '#fffdf4'); rect(x, y, 1, h, '#fffdf4'); rect(x + w - 1, y + 1, 1, h - 1, tone.sh); rect(x + 1, y + h - 1, w - 1, 1, tone.sh);
}
// wire paper clip, 8x17 layout
function uiX_clipArt() {
  return art('uiX_clip2', 9, 18, () => {
    const path = () => { g.beginPath(); g.moveTo(8, 12); g.lineTo(8, 26); g.arc(10.5, 26, 2.5, Math.PI, 0, true); g.lineTo(13, 6.5); g.arc(8.75, 6.5, 4.25, 0, Math.PI, true); g.lineTo(4.5, 28.5); g.arc(8.5, 28.5, 4, Math.PI, 0, true); g.lineTo(12.5, 15); };
    g.lineCap = 'round'; g.save(); g.translate(1.6, 1.8); path(); g.strokeStyle = 'rgba(40,20,10,0.32)'; g.lineWidth = 1.9; g.stroke(); g.restore();
    path(); g.strokeStyle = uiX_STEEL[5]; g.lineWidth = 1.8; g.stroke();
    g.save(); g.translate(-0.45, -0.45); path(); g.strokeStyle = uiX_STEEL[9]; g.lineWidth = 0.7; g.stroke(); g.restore();
  });
}
function uiX_clip(x, y) { blit(uiX_clipArt(), x, y); }
// black photo-album corners
function uiX_corners(x, y, w, h) {
  fine(() => {
    const X = x * 2, Y = y * 2, R = X + w * 2, B = Y + h * 2, s = 11;
    for (const [cx, cy, dx, dy] of [[X - 2, Y - 2, 1, 1], [R + 2, Y - 2, -1, 1], [X - 2, B + 2, 1, -1], [R + 2, B + 2, -1, -1]]) {
      uiX_poly([[cx, cy], [cx + dx * s, cy], [cx, cy + dy * s]], '#211c22');
      g.strokeStyle = '#5a5058'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + dx * (s - 1), cy + dy * 0.5); g.lineTo(cx + dx * 0.5, cy + dy * (s - 1)); g.stroke();
    }
  });
}
// a photographic print: white border, cast shadow
function uiX_print(x, y, w, h) { fine(() => { const X = x * 2, Y = y * 2, Wd = w * 2, Hh = h * 2; uiX_cast(X, Y, Wd, Hh, 0.32, 3); rect(X, Y, Wd, Hh, '#fbfaf3'); rect(X, Y, Wd, 1, '#ffffff'); rect(X + Wd - 1, Y, 1, Hh, '#d6cfbd'); rect(X, Y + Hh - 1, Wd, 1, '#cfc7b3'); }); }
// yellow highlighter stroke: chisel ends, multiplied onto the paper so the ruling shows through
function uiX_marker(x, y, w, h) {
  fine(() => {
    const X = x * 2, Y = y * 2, Wd = w * 2, Hh = h * 2; g.globalCompositeOperation = 'multiply';
    uiX_poly([[X + 1, Y + Hh - 1], [X + 5, Y + 1], [X + Wd - 1, Y + 1], [X + Wd - 5, Y + Hh - 1]], '#ffe765');
    rect(X + 6, Y + Hh - 3, Wd - 12, 1, '#f3d24a'); g.globalCompositeOperation = 'source-over';
  });
}
function uiX_lamp(x, y, on, c = P.YE) { const col = c === P.RD2 ? '#ff5a3c' : c === P.GR2 ? '#6dff6a' : c === P.YE ? '#ffcf4a' : c; fine(() => uiX_ledF(x * 2 + 3, y * 2 + 3, on, col, mix(col, '#10121a', 0.8))); }
// the rubber stamp: heavy outer rule, fine inner rule, worn ink; multiplied onto the page
function uiX_stampArt(txt, col, solid) {
  const tw = textW(txt), w = tw + 14, h = 17, ink = col === P.RD ? '#b3322a' : uiX_ink(col), W2 = w * 2, H2 = h * 2;
  return art('uiX_stamp|' + txt + '|' + ink + '|' + !!solid, w, h, () => {
    g.fillStyle = ink; const fr = (a, t) => { g.fillRect(a, a, W2 - 2 * a, t); g.fillRect(a, H2 - a - t, W2 - 2 * a, t); g.fillRect(a, a, t, H2 - 2 * a); g.fillRect(W2 - a - t, a, t, H2 - 2 * a); };
    fr(0, 3); fr(5, 1);
    g.save(); g.scale(2, 2); text(txt, 7, 5, ink); g.restore();
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = uiX_lg(0, 0, W2, H2, ['rgba(0,0,0,0)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.42)']); g.fillRect(0, 0, W2, H2);
    g.fillStyle = 'rgba(0,0,0,0.3)'; for (const k of [0.34, 0.77]) { const sx = W2 * k; g.beginPath(); g.moveTo(sx, 0); g.lineTo(sx + 1, 0); g.lineTo(sx - 7, H2); g.lineTo(sx - 8, H2); g.fill(); }
    g.globalCompositeOperation = 'destination-over';
    if (solid) { rect(2, 2, W2 - 4, H2 - 4, uiX_PAPER.hi); }
    g.globalCompositeOperation = 'source-over';
  });
}
function uiX_stampW(txt) { return textW(txt) + 14; }
function uiX_stamp(txt, x, y, col = P.RD, solid) { g.save(); if (!solid) g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.92; blit(uiX_stampArt(txt, col, solid), x | 0, y | 0); g.restore(); }

// ---------- the menu idiom: white header, soft grey options, an amber bar with an ink pointer ----------
function uiX_bar(x, y, w, h, flash) {
  fine(() => {
    const X = x * 2, Y = y * 2, Wd = w * 2, Hh = h * 2;
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(X + 2, Y + 2, Wd, Hh);
    g.fillStyle = flash ? uiX_lg(0, Y, 0, Y + Hh, ['#ffffff', '#fff3d0']) : uiX_lg(0, Y, 0, Y + Hh, ['#ffe7a0', '#f7c95a', '#e8a93a', '#cf8a26']); g.fillRect(X, Y, Wd, Hh);
    rect(X, Y, Wd, 1, flash ? '#ffffff' : '#fff5cf'); rect(X, Y + Hh - 1, Wd, 1, '#8f5714'); rect(X + Wd - 1, Y, 1, Hh, '#a8661a');
    uiX_poly([[X + 5, Y + 4], [X + 11, Y + Hh / 2], [X + 5, Y + Hh - 4]], '#3a2208');
  });
}
function uiX_caret(x, y, col) { fine(() => uiX_poly([[x * 2 + 1, y * 2 + 1], [x * 2 + 8, y * 2 + 7], [x * 2 + 1, y * 2 + 13]], col)); }
function Menu(items, x, y, w, lh = 8, opts = {}) {
  return {
    items, x, y, w, lh, sel: Math.max(0, items.findIndex(i => !i.off)), flash: 0, busy: false, cyan: !!opts.cyan,
    move(d) { if (this.busy) return; const n = this.items.length; for (let k = 0; k < n; k++) { this.sel = (this.sel + d + n) % n; if (!this.items[this.sel].off) break; } sfx.blip(); },
    fire(i) { const it = this.items[i]; if (!it || it.off) { sfx.deny(); return; } if (this.busy) return; this.busy = true; this.flash = 1; sfx.select(); setTimeout(() => { this.busy = false; this.flash = 0; it.go(); }, 110); },
    key(k) { if (k === 'up') this.move(-1); else if (k === 'down') this.move(1); else if (k === 'select' || k === 'fire') { this.fire(this.sel); return true; } return false; },
    hit(tx, ty) { for (let i = 0; i < this.items.length; i++) { const iy = this.y + i * this.lh; if (tx >= this.x - 8 && tx < this.x + this.w && ty >= iy - 1 && ty < iy + this.lh) return i; } return -1; },
    tap(tx, ty) { const i = this.hit(tx, ty); if (i < 0) return false; this.sel = i; this.fire(i); return true; },
    hover(tx, ty) { const i = this.hit(tx, ty); if (i >= 0 && !this.items[i].off) this.sel = i; },
    draw() {
      this.items.forEach((it, i) => {
        const iy = this.y + i * this.lh, on = i === this.sel;
        if (on && !this.cyan) uiX_bar(this.x - 8, iy - 1, this.w, 9, this.flash);
        if (on && this.cyan) uiX_caret(this.x - 7, iy, this.flash ? '#ffffff' : uiX_T.cyan);
        text(it.label, this.x, iy, it.off ? uiX_T.off : on ? (this.cyan ? (this.flash ? P.W : uiX_T.cyan) : uiX_T.sel) : uiX_T.opt);
        if (it.right) textR(it.right, this.x + this.w - 12, iy, on && !this.cyan ? '#8a2a12' : uiX_T.cyan);
      });
    },
  };
}
function menuScene(opts) {
  return Object.assign({
    t: 0, update(dt) { this.t += dt; },
    onKey(k) { if (k === 'menu' && this.back) { sfx.blip(); this.back(); return; } this.menu && this.menu.key(k); },
    onTap(x, y) { if (!(this.menu && this.menu.tap(x, y)) && this.tapElse) this.tapElse(x, y); }, onHover(x, y) { this.menu && this.menu.hover(x, y); },
  }, opts);
}
function pageScene(drawFn, next, opts = {}) {
  return {
    t: 0, update(dt) { this.t += dt; }, draw() { drawFn(this.t); },
    onKey(k) { if (this.t > 0.3 && (k === 'select' || k === 'fire' || k === 'menu' || k === 'action')) { sfx.blip(); next(); } }, onTap() { if (this.t > 0.3) { sfx.blip(); next(); } },
  };
}
// popup box: a smoked-glass panel in a thin steel frame, a soft drop shadow, four tiny rivets
function msgBox(x, y, w, h) {
  x |= 0; y |= 0; w |= 0; h |= 0;
  fine(() => {
    const X = x * 2, Y = y * 2, Wd = w * 2, Hh = h * 2, S = uiX_STEEL;
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(X + 4, Y + 4, Wd, Hh); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(X + 6, Y + 6, Wd, Hh);
    rect(X, Y, Wd, Hh, S[0]);
    rect(X + 1, Y + 1, Wd - 2, 1, S[8]); rect(X + 1, Y + 1, 1, Hh - 2, S[7]); rect(X + 1, Y + Hh - 2, Wd - 2, 1, S[3]); rect(X + Wd - 2, Y + 1, 1, Hh - 2, S[4]);
    rect(X + 2, Y + 2, Wd - 4, 1, S[6]); rect(X + 2, Y + 2, 1, Hh - 4, S[5]); rect(X + 2, Y + Hh - 3, Wd - 4, 1, S[2]); rect(X + Wd - 3, Y + 2, 1, Hh - 4, S[3]);
    rect(X + 3, Y + 3, Wd - 6, Hh - 6, S[0]);
    g.fillStyle = uiX_lg(0, Y + 4, 0, Y + Hh - 4, ['#1d2638', '#141b29', '#0e131d']); g.fillRect(X + 4, Y + 4, Wd - 8, Hh - 8);
    g.fillStyle = 'rgba(160,190,230,0.05)'; g.beginPath(); g.moveTo(X + 4, Y + 4); g.lineTo(X + Wd * 0.45, Y + 4); g.lineTo(X + Wd * 0.3, Y + Hh - 4); g.lineTo(X + 4, Y + Hh - 4); g.fill();
    for (const [a, b] of [[X + 2, Y + 2], [X + Wd - 4, Y + 2], [X + 2, Y + Hh - 4], [X + Wd - 4, Y + Hh - 4]]) { rect(a, b, 2, 2, S[8]); rect(a + 1, b + 1, 1, 1, S[3]); }
  });
}
function popup(lines, x = 40, y = 60, w = 240) { const ls = lines.flatMap(l => wrap(l, w - 16)); msgBox(x, y, w, ls.length * 8 + 12); ls.forEach((l, i) => text(l, x + 8, y + 6 + i * 8, uiX_T.hd)); }
// the location/time status box, 164x26: a brushed-steel plate with two green LCD windows
function uiX_statusPlate() {
  return art('uiX_status2', 164, 26, () => {
    const S = uiX_STEEL;
    rect(0, 0, 328, 52, S[0]); uiX_steelF(1, 1, 326, 50, 0);
    const lcd = ['#1d3a20', '#142b17', '#0d1f10', '#0a180c'];
    uiX_wellF(9, 5, 310, 18, lcd); uiX_wellF(31, 29, 266, 16, lcd);
    uiX_screwF(12, 37); uiX_screwF(316, 37);
    for (let i = 0; i < 3; i++) { rect(20 + i * 3, 31, 1, 12, S[1]); rect(21 + i * 3, 31, 1, 12, S[7]); }
    for (let i = 0; i < 3; i++) { rect(302 + i * 3, 31, 1, 12, S[1]); rect(303 + i * 3, 31, 1, 12, S[7]); }
  });
}
function statusBox(y, cityName) {
  cityName = cityName || (cityById(game.city).name + (game.city === 'WAS' ? ', D.C.' : ''));
  blit(uiX_statusPlate(), 0, y);
  textC(cityName, 82, y + 3, uiX_T.lcd); textC(clockStr(), 82, y + 15, uiX_T.lcd);
  const on = (performance.now() / 700 | 0) % 2; fine(() => uiX_ledF(308, y * 2 + 16, on, '#7dff6a', '#18351a'));
}
// the city picture's frame: mitred walnut moulding with a gilt lip, and a little brass caption plate
function uiX_picFrame(x, y, w, h) { // (x,y,w,h) = the picture itself
  fine(() => {
    const X = x * 2, Y = y * 2, Wd = w * 2, Hh = h * 2, f = 9, Wo = uiX_WOOD, L = X - f, T = Y - f, R = X + Wd + f, B = Y + Hh + f;
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(L + 4, T + 4, R - L, B - T);
    uiX_poly([[L, T], [R, T], [X + Wd, Y], [X, Y]], Wo[6]); uiX_poly([[L, T], [X, Y], [X, Y + Hh], [L, B]], Wo[5]);
    uiX_poly([[R, T], [R, B], [X + Wd, Y + Hh], [X + Wd, Y]], Wo[3]); uiX_poly([[L, B], [X, Y + Hh], [X + Wd, Y + Hh], [R, B]], Wo[2]);
    rect(L, T, R - L, 1, Wo[8]); rect(L, T, 1, B - T, Wo[7]); rect(L, B - 1, R - L, 1, Wo[0]); rect(R - 1, T, 1, B - T, Wo[1]);
    rect(L + 4, T + 4, R - L - 8, 1, Wo[7]); rect(L + 4, B - 5, R - L - 8, 1, Wo[2]);
    // gilt lip
    rect(X - 3, Y - 3, Wd + 6, 2, uiX_BRASS[5]); rect(X - 3, Y - 3, 2, Hh + 6, uiX_BRASS[4]); rect(X - 3, Y + Hh + 1, Wd + 6, 2, uiX_BRASS[2]); rect(X + Wd + 1, Y - 3, 2, Hh + 6, uiX_BRASS[3]);
    rect(X - 1, Y - 1, Wd + 2, Hh + 2, '#0c0806');
  });
}
function uiX_picShade(x, y, w, h) { fine(() => { const X = x * 2, Y = y * 2; g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(X, Y, w * 2, 2); g.fillRect(X, Y + 2, 2, h * 2 - 2); }); }
function uiX_plate(cx, y, s) {
  const w = textW(s) + 14, x = Math.round(cx - w / 2);
  fine(() => {
    const X = x * 2, Y = y * 2, Wd = w * 2, Hh = 22, Br = uiX_BRASS;
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(X + 3, Y + 3, Wd, Hh);
    uiX_band(X, Y, Wd, Hh, [Br[5], Br[4], Br[3], Br[3], Br[2]], 6);
    rect(X, Y, Wd, 1, Br[6]); rect(X, Y, 1, Hh, Br[5]); rect(X, Y + Hh - 1, Wd, 1, Br[1]); rect(X + Wd - 1, Y, 1, Hh, Br[1]);
    rect(X + 2, Y + 2, Wd - 4, 1, Br[2]); rect(X + 2, Y + Hh - 3, Wd - 4, 1, Br[5]);
    for (const sx of [X + 6, X + Wd - 6]) { uiX_circ(sx, Y + 11, 2.2, Br[1]); uiX_circ(sx - 0.5, Y + 10.5, 1.4, Br[5]); }
  });
  textC(s, cx, y + 2, '#3b2208');
}
// city menu: black screen, menu top-left, framed city picture bottom-right, status box bottom-left
function cityLayout({ header, items, pic, caption, back }) {
  const s = menuScene({ menu: Menu(items, 27, 14 + header.length * 8, 128), back,
    draw() { rect(0, 0, W, H, P.K); uiX_backdrop(); uiX_miniMap(184, 12, 122, 72, this.t);
      header.forEach((l, i) => text(l, 21, 14 + i * 8, uiX_T.hd)); this.menu.draw();
      if (pic) { uiX_picFrame(175, 116, 130, 48); g.save(); g.beginPath(); g.rect(175, 116, 130, 48); g.clip(); pic(175, 116, 130, 48, this.t); g.restore(); uiX_picShade(175, 116, 130, 48); uiX_plate(240, 101, caption); }
      statusBox(174); } });
  return s;
}
// the black screens get a faint blue-black vignette so the panels float on something
function uiX_backdrop() { blit(art('uiX_backdrop', W, H, () => { g.fillStyle = uiX_rg(260, 160, 40, 520, ['#10151f', '#0a0d14', '#040508']); g.fillRect(0, 0, 640, 400); }), 0, 0); }
// the city screen's "you are here" monitor: the travel map around this city, a sweeping locator
function uiX_miniMap(x, y, w, h, t) {
  const here = cityById(game.city), region = here.hq ? 'americas' : here.region || game.region;
  const V = TRAVEL_VIEW[region] || TRAVEL_VIEW.europe, span = region === 'americas' ? 0.42 : 0.62;
  const lw = (V.lon[1] - V.lon[0]) * span, lh = lw * h / w * 0.78;
  const lon0 = clamp(here.lon - lw / 2, V.lon[0] - 40, V.lon[1] + 40 - lw), lat1 = here.lat + lh / 2;
  const c = art('uiX_mini' + game.city + w + 'x' + h, w, h, () => uiX_mapRender(w * 2, h * 2, (lon, lat) => [(lon - lon0) / lw * w * 2, (lat1 - lat) / lh * h * 2], (px_, py_) => [lon0 + px_ / (w * 2) * lw, lat1 - py_ / (h * 2) * lh], true));
  // bezel: a dark steel monitor with a chin
  blit(art('uiX_bezel' + w + 'x' + h, w + 14, h + 22, () => {
    const S = uiX_STEEL, Wd = (w + 14) * 2, Hh = (h + 22) * 2;
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(6, 6, Wd - 6, Hh - 6);
    rect(0, 0, Wd - 4, Hh - 4, S[0]); uiX_steelF(1, 1, Wd - 6, Hh - 6, 0);
    uiX_band(3, 3, Wd - 10, Hh - 10, [S[5], S[4], S[3], S[3], S[2]], 8); uiX_bev(3, 3, Wd - 10, Hh - 10, S[7], S[1]);
    uiX_wellF(10, 10, w * 2, h * 2, ['#081018']);
    for (let i = 0; i < 7; i++) { rect(Wd - 68 + i * 8, h * 2 + 24, 5, 10, S[1]); rect(Wd - 68 + i * 8, h * 2 + 33, 5, 1, S[6]); }
  }), x - 5, y - 5);
  blit(c, x, y);
  const proj = (lon, lat) => [x + (lon - lon0) / lw * w, y + (lat1 - lat) / lh * h];
  const [hx, hy] = proj(here.lon, here.lat), on = (t * 3 | 0) % 2;
  fine(() => {
    g.save(); g.beginPath(); g.rect(x * 2, y * 2, w * 2, h * 2); g.clip();
    for (const ct of CITIES) { if (ct === here) continue; const [cx, cy] = proj(ct.lon, ct.lat); if (cx > x && cx < x + w && cy > y && cy < y + h) { uiX_circ(cx * 2, cy * 2, 2.6, '#0b1520'); uiX_circ(cx * 2, cy * 2, 1.6, '#e8e4d6'); } }
    g.fillStyle = 'rgba(120,255,140,0.28)'; g.fillRect(x * 2, hy * 2 | 0, w * 2, 1); g.fillRect(hx * 2 | 0, y * 2, 1, h * 2);
    const k = (t * 0.9) % 1; g.strokeStyle = 'rgba(140,255,150,' + (0.9 * (1 - k)).toFixed(2) + ')'; g.lineWidth = 1.2; g.beginPath(); g.arc(hx * 2, hy * 2, 4 + k * 18, 0, Math.PI * 2); g.stroke();
    uiX_circ(hx * 2, hy * 2, 3.6, '#10150c'); uiX_circ(hx * 2, hy * 2, 2.6, on ? '#ffd04d' : '#fff6d8');
    // glass: a soft reflection across the upper left
    g.fillStyle = 'rgba(200,225,255,0.07)'; g.beginPath(); g.moveTo(x * 2, y * 2); g.lineTo(x * 2 + w * 1.1, y * 2); g.lineTo(x * 2 + w * 0.6, y * 2 + h * 2); g.lineTo(x * 2, y * 2 + h * 2); g.fill();
    g.restore();
    uiX_ledF(x * 2 + 5, (y + h) * 2 + 15, on, '#7dff6a', '#18351a'); uiX_ledF(x * 2 + 15, (y + h) * 2 + 15, 1, '#ff5a3c');
  });
  text(fitText(here.name.toUpperCase(), w - 60), x + 14, y + h + 4, '#c9d2da', '#12161d');
}
// the CIA floor indicator: a steel strip with four lamp windows, the current floor lit amber
function uiX_floorBar(floor) {
  blit(art('uiX_floorbar', 150, 11, () => {
    const S = uiX_STEEL; rect(0, 0, 300, 22, S[0]); uiX_steelF(0, 0, 300, 21, 0); rect(0, 21, 300, 1, S[0]);
    for (let i = 0; i < 4; i++) { uiX_wellF(22 + i * 72, 4, 30, 14, ['#10161c', '#0a0e13']); }
  }), 170, 0);
  ['L', '1', '2', '3'].forEach((c, i) => {
    const x = 181 + i * 36, on = i === floor;
    if (on) fine(() => { const X = x * 2 + 2, Y = 4; g.fillStyle = uiX_lg(0, Y, 0, Y + 14, ['#ffd98a', '#f39a2c', '#b8580f']); g.fillRect(X, Y, 30, 14); rect(X, Y, 30, 1, '#fff0c8'); g.fillStyle = uiX_rg(X + 15, Y + 7, 0, 22, ['rgba(255,190,90,0.35)', 'rgba(255,160,60,0)']); g.fillRect(X - 10, 0, 50, 22); });
    text(c, 186 + i * 36, 2, on ? '#3a1804' : '#3f7a46');
  });
}
// the black half's divider: a slim steel mullion
function uiX_mullion(x) { fine(() => { rect(x * 2 - 1, 0, 1, 400, uiX_STEEL[1]); rect(x * 2, 0, 1, 400, uiX_STEEL[6]); rect(x * 2 + 1, 0, 1, 400, uiX_STEEL[3]); rect(x * 2 + 2, 0, 1, 400, uiX_STEEL[0]); }); }
// a screwed steel panel
function uiX_panel(x, y, w, h) { blit(art('uiX_panel' + [w, h], w + 2, h + 2, () => { const Wd = w * 2, Hh = h * 2; g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(4, 4, Wd, Hh); rect(0, 0, Wd, Hh, uiX_STEEL[0]); uiX_steelF(1, 1, Wd - 2, Hh - 2, 0); for (const [a, b] of [[7, 7], [Wd - 7, 7], [7, Hh - 7], [Wd - 7, Hh - 7]]) uiX_screwF(a, b, 3); }), x, y); }
// a keycap: sculpted top face, darker skirt, lit from the upper left
const uiX_KEYS = { ivory: ['#5d5647', '#a9a08a', '#d3caaf', '#ece5d0', '#fbf7ea'], amber: ['#6b4210', '#c07d22', '#eaa93c', '#ffd27a', '#fff0c8'], red: ['#3a0c0c', '#7a1c18', '#a83028', '#cc4a3c', '#f08a78'], blue: ['#0c1638', '#1c2e6e', '#2c46a0', '#4466c4', '#8aa4ea'] };
function uiX_key(x, y, w, h, kind) {
  blit(art('uiX_key' + [w, h, kind], w + 1, h + 1, () => { const K = uiX_KEYS[kind], Wd = w * 2, Hh = h * 2; g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(2, 2, Wd, Hh); uiX_rr(0, 0, Wd, Hh, 3, K[0]); uiX_rr(1, 1, Wd - 2, Hh - 2, 3, K[1]); g.fillStyle = uiX_lg(0, 2, 0, Hh - 4, [K[4], K[3], K[2]]); uiX_rr(3, 2, Wd - 6, Hh - 6, 2, g.fillStyle); rect(4, 2, Wd - 8, 1, '#ffffff'); }), x, y);
}
// the training screen's four display cases: steel frames with an enamel name plate
function uiX_trainFrame(x, y, w, h, i) {
  const E = [['#d8584a', '#a83028', '#6e1a18'], ['#6a9ee8', '#3a66c0', '#1c3a7a'], ['#8c96a2', '#5a6470', '#343c46'], ['#5cc06a', '#2f8a3e', '#1a5424']][i];
  blit(art('uiX_train' + [w, h, i], w, h, () => { const Wd = w * 2, Hh = h * 2, S = uiX_STEEL; rect(0, 0, Wd, Hh, S[0]); uiX_steelF(0, 0, Wd, Hh, 0); rect(3, 3, Wd - 6, 254, '#05060a'); g.fillStyle = uiX_lg(0, 260, 0, 296, E); g.fillRect(3, 260, Wd - 6, 36); rect(3, 260, Wd - 6, 1, mix(E[0], '#ffffff', 0.5)); rect(3, 295, Wd - 6, 1, '#05060a'); uiX_screwF(9, 278, 2.6); uiX_screwF(Wd - 9, 278, 2.6); }), x, y);
}
// split screen: text and menu on the black left half, a painted scene on the right, status box bottom-left
function splitLayout({ header, items, art: artFn, back, floor, text: body }) {
  return menuScene({ menu: items ? Menu(items, 23, 20 + header.length * 8 + (body ? wrap(body, 140).length * 8 + 4 : 0), 136) : null, back,
    draw() { rect(0, 0, W, H, P.K); uiX_backdrop(); g.save(); g.beginPath(); g.rect(170, 0, 150, 200); g.clip(); artFn(170, 0, 150, 200, this.t); g.restore();
      uiX_mullion(169);
      if (floor !== undefined) uiX_floorBar(floor);
      header.forEach((l, i) => text(l, 15, 20 + i * 8, uiX_T.hd)); if (body) para(body, 15, 20 + header.length * 8 + 2, 140, uiX_T.hd, 8);
      this.menu && this.menu.draw(); statusBox(174); } });
}
// full-screen picture with a boxed menu over it
function boxLayout({ header, items, art: artFn, back, box = [16, 40, 122] }) {
  const [bx, by, bw] = box;
  return menuScene({ menu: Menu(items, bx + 14, by + 6 + header.length * 8, bw - 12), back,
    draw() { artFn(0, 0, W, H, this.t); msgBox(bx, by, bw, header.length * 8 + items.length * 8 + 12); header.forEach((l, i) => text(l, bx + 6, by + 5 + i * 8, uiX_T.hd)); this.menu.draw(); } });
}

// ---------- file folders on a walnut desk ----------
const FOLDER = { clue: P.YE, newclue: P.BL2, docs: P.G3, news: P.YE, org: P.RD2, city: P.GR, suspect: P.TL, career: P.BL, report: P.YE };
function uiX_folderArt(col, tab, sheet) {
  const R = uiX_fr(col);
  uiX_woodF(0, 0, 640, 400, 3);
  // the next file in the drawer, its tab peeking out behind this one
  const Bk = uiX_fr(col === P.YE ? P.G3 : P.YE);
  uiX_poly([[48, 30], [58, 12], [212, 12], [222, 30]], 'rgba(10,4,8,0.45)');
  uiX_poly([[44, 26], [55, 7], [207, 7], [218, 26]], Bk[3]);
  rect(56, 7, 151, 1, Bk[5]); g.strokeStyle = Bk[4]; g.lineWidth = 1; g.beginPath(); g.moveTo(44.5, 26); g.lineTo(55.5, 7.5); g.stroke();
  g.fillStyle = uiX_lg(0, 7, 0, 26, ['rgba(0,0,0,0)', 'rgba(0,0,0,0.18)']); g.fillRect(44, 7, 174, 19);
  rect(80, 11, 88, 12, '#f1ecdc'); rect(80, 22, 88, 1, '#bfb49a'); rect(86, 15, 42, 1, '#8d8574'); rect(132, 15, 26, 1, '#8d8574'); rect(86, 18, 30, 1, '#b3aa96');
  // cast shadow of this folder on the desk and the other file
  uiX_poly([[8, 30], [306, 30], [326, 10], [640, 10], [640, 400], [8, 400]], 'rgba(10,4,8,0.4)');
  // the folder: card stock, lit from the upper left
  const body = [[0, 22], [300, 22], [320, 2], [630, 2], [636, 8], [636, 400], [0, 400]];
  g.fillStyle = uiX_lg(0, 0, 200, 420, [R[4], R[3], R[3]]); g.beginPath(); body.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.fill();
  g.fillStyle = uiX_lg(560, 0, 636, 0, ['rgba(0,0,0,0)', 'rgba(20,8,30,0.16)']); g.fillRect(560, 2, 76, 398);
  // edges: highlight on top/left, shade on the right; a deep outline
  rect(0, 22, 300, 1, R[0]); rect(0, 23, 300, 2, R[5]); rect(0, 23, 2, 377, R[5]);
  g.strokeStyle = R[0]; g.lineWidth = 1; g.beginPath(); g.moveTo(300, 22.5); g.lineTo(320.5, 1.5); g.lineTo(630, 1.5); g.lineTo(636.5, 8); g.lineTo(636.5, 400); g.stroke();
  g.strokeStyle = R[5]; g.lineWidth = 2; g.beginPath(); g.moveTo(302, 23); g.lineTo(321, 3.5); g.lineTo(629, 3.5); g.stroke();
  rect(634, 9, 2, 391, R[1]); rect(637, 8, 3, 392, 'rgba(10,4,8,0.35)');
  // a score line across the fold, and the cardboard's scuffed corner
  rect(2, 395, 632, 1, R[2]); rect(2, 396, 632, 1, R[5]);
  // typed label on a white sticker
  const tw = textW(tab) + 10, lx = 299 - textW(tab);
  rect(lx * 2 + 2, 6, tw * 2, 18, 'rgba(10,4,8,0.3)'); rect(lx * 2, 4, tw * 2, 18, '#f8f4e6'); rect(lx * 2, 4, tw * 2, 1, '#ffffff'); rect(lx * 2, 21, tw * 2, 1, '#d4ccb8'); rect(lx * 2, 19, tw * 2, 1, '#dc7b6b');
  if (sheet) {
    // a second page underneath, then the page itself; hole punches down the left
    uiX_paperF(22, 27, 606, 380, true, { hi: '#ece3cb', lt: '#e8dec4', base: '#e2d6ba', sh: '#cbbb98', dk: '#b4a07c' });
    uiX_paperF(12, 32, 612, 372, true);
    for (const hy of [121, 281]) { uiX_circ(19, hy, 4.5, uiX_PAPER.dk); uiX_circ(19, hy + 0.8, 4, R[2]); g.save(); g.beginPath(); g.arc(19, hy + 0.8, 4, 0, Math.PI * 2); g.clip(); rect(14, hy - 4, 10, 3, R[0]); g.restore(); }
    // a faint fold shadow across the middle of the page
    g.fillStyle = uiX_lg(0, 196, 0, 214, ['rgba(120,90,50,0)', 'rgba(120,90,50,0.06)', 'rgba(255,255,255,0.08)', 'rgba(120,90,50,0)']); g.fillRect(13, 196, 610, 18);
  }
}
function folder(col, tab, sheet = true, stamp) {
  blit(art('uiX_fold' + col + '|' + tab + '|' + sheet, W, H, () => uiX_folderArt(col, tab, sheet)), 0, 0);
  const tw = textW(tab); text(tab, 318 - 14 - tw, 3, uiX_I.k);
  if (stamp === undefined) stamp = sheet ? 'CONFIDENTIAL' : false;
  if (stamp) uiX_stamp(stamp, 306 - uiX_stampW(stamp), 180);
}
// ruled index paper: a red margin and pale blue hairlines under every typed row
function uiX_ruled(y0, n, x0 = 12, x1 = 309) {
  blit(art('uiX_ruled' + y0 + '|' + n, W, H, () => {
    rect(22, 33, 1, 370, '#e39486'); rect(25, 33, 1, 370, '#efc0b4');
    for (let i = 0; i < n; i++) { const y = (y0 + i * 8 + 7) * 2 + 1; rect(x0 * 2 + 2, y, (x1 - x0) * 2 - 2, 1, '#a9c4dc'); }
  }), 0, 0);
}
function folderList(tab, col, rows, back, opts = {}) {
  let sel = 0, top = 0; const vis = 20;
  return {
    t: 0, update(dt) { this.t += dt; },
    onKey(k) {
      if (k === 'menu') { back(); return; }
      if (!rows.length) { if (k === 'select' || k === 'fire') back(); return; }
      if (k === 'up') sel = Math.max(0, sel - 1); if (k === 'down') sel = Math.min(rows.length - 1, sel + 1);
      if (sel < top) top = sel; if (sel >= top + vis) top = sel - vis + 1;
      if ((k === 'select' || k === 'fire')) { if (rows[sel].open) { sfx.select(); rows[sel].open(); } else back(); }
    },
    onTap(x, y) { const i = top + Math.floor((y - 22) / 8); if (i >= 0 && i < rows.length) { if (i === sel && rows[i].open) rows[i].open(); sel = i; } else back(); },
    draw() {
      folder(col, tab, true, rows.length > vis ? false : undefined);
      uiX_ruled(22, vis);
      if (!rows.length) text(opts.empty || '...none', 14, 22, uiX_I.g);
      rows.slice(top, top + vis).forEach((r, i) => { const y = 22 + i * 8, on = top + i === sel; if (on && rows.some(q => q.open)) uiX_marker(10, y - 1, 298, 9); text(fitText(r.label, 230), 14, y, uiX_ink(r.col || P.K)); if (r.right) textR(fitText(r.right, 70), 304, y, uiX_ink(r.rcol || P.BL)); });
      if (rows.length > vis) { const s = (top + 1) + '-' + Math.min(rows.length, top + vis) + ' of ' + rows.length; rect(300 - textW(s), 188, textW(s) + 8, 11, uiX_PAPER.lt); textR(s, 304, 190, uiX_I.g); }
    },
  };
}

// ---------- TITLE ----------
let serifCache = null;
function serifLogo() {
  if (serifCache) return serifCache;
  const c = document.createElement('canvas'); c.width = 320; c.height = 124; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.textBaseline = 'alphabetic';
  x.font = 'bold 54px "Times New Roman", Times, "Liberation Serif", Georgia, serif'; x.fillText('Covert', 40, 67); x.fillText('Action', 40, 115);
  x.font = 'bold 12px Arial, Helvetica, sans-serif'; x.fillText('TM', 222, 101);
  x.font = 'italic bold 15px "Times New Roman", Times, Georgia, serif'; x.fillStyle = '#a00'; x.textAlign = 'center'; x.fillText("Sid Meier's", 160, 18);
  const d = x.getImageData(0, 0, 320, 124); for (let i = 0; i < d.data.length; i += 4) d.data[i + 3] = d.data[i + 3] > 110 ? 255 : 0;
  x.putImageData(d, 0, 0); serifCache = c; return c;
}
function titleScene() {
  let menuOpen = false; let s;
  const items = () => [
    ...(hasCase() ? [{ label: 'Continue case', go: () => { if (loadCase()) go(cityScene()); else { toast('Case file damaged'); menuOpen = false; } } }] : []),
    { label: 'Create a New Character', go: () => go(charScene()) },
    { label: 'Load a Saved Game', off: !loadSave(), go: () => { restoreSave(loadSave()); go(cityScene()); } },
    { label: 'Practice a skill', go: () => go(practiceScene()) },
    { label: 'Review Hall of Fame', go: () => go(hallOfFame(() => go(titleScene()))) },
    { label: 'How to play', go: () => go(helpScene(() => go(titleScene()))) },
  ];
  s = {
    t: 0, menu: null, enter() { sfx.jingle(); }, update(dt) { this.t += dt; },
    draw() {
      titleBackdrop(this.t);
      if (this.t > 1.2) { rect(0, 38, W, 125, P.K); rect(0, 38, W, 1, P.RD); rect(0, 162, W, 1, P.RD); g.drawImage(serifLogo(), 0, 40); }
      if (this.t > 1.8) { rect(40, 168, 240, 24, P.K); textC('A Techno-Thriller', W / 2, 170, P.YE); textC('from the Case Files of Max Remington', W / 2, 180, P.YE); }
      if (menuOpen) { msgBox(65, 58, 170, 18 + this.menu.items.length * 8); text('Do you want to...', 71, 62, uiX_T.hd); this.menu.draw(); }
    },
    onKey(k) { if (!menuOpen) { menuOpen = true; this.t = Math.max(this.t, 2.1); this.menu = Menu(items(), 79, 70, 150); sfx.select(); return; } if (k === 'menu') { menuOpen = false; return; } this.menu.key(k); },
    onTap(x, y) { if (!menuOpen) { this.onKey('select'); return; } this.menu.tap(x, y); }, onHover(x, y) { this.menu && this.menu.hover(x, y); },
  };
  return s;
}
function practiceScene() {
  let s, diff = 0;
  const m1 = () => Menu(DIFFICULTY.map((d, i) => ({ label: d.name, go: () => { diff = i; s.menu = m2(); s.step = 1; } })), 118, 90, 130);
  const m2 = () => Menu(['Combat', 'Driving', 'Cryptography', 'Electronics', 'Street ambush', 'Hit squad', 'Jail defence'].map((l, i) => ({ label: l, go: () => practice(['breakin', 'chase', 'crypto', 'wiretap', 'street', 'evade', 'defend'][i], diff) })), 118, 90, 130);
  s = menuScene({ menu: m1(), step: 0, back: () => { if (s.step) { s.step = 0; s.menu = m1(); } else go(titleScene()); },
    draw() { blit(uiX_rangeArt(), 0, 0); uiX_target(34, 44, this.t); msgBox(102, 72, 152, s.step ? 80 : 54); text(s.step ? 'Practice which skill?' : 'Which difficulty level?', 110, 78, uiX_T.hd); this.menu.draw(); } });
  return s;
}
function helpScene(back) {
  const pages = [
    ['THE JOB', 'You are Max Remington, the only freelance secret agent in the western world. Each case is a crime being planned by 6 to 10 people from several organizations. Identify them, prove their roles, and arrest them before the crime is committed.\n\nArrests only stick if you know the suspect\'s ROLE: decoded messages, enemy computers and interrogations reveal roles.'],
    ['GETTING AROUND', 'Each city has the Airport, your Hotel, the CIA office (Data, Intelligence and Crypto floors) and any hideouts you have found. At an enemy building you can Place Wiretap, Break into building or Watch the building to follow people who leave.\n\nSuspects can only be arrested in their car or inside their own organization\'s building. Masterminds never leave their building.'],
    ['CONTROLS', 'Menus: arrows + Enter, Esc to leave.\nBuilding: arrows move, Space fires, E examines/opens (F1), P photographs (F2), B bugs (F3), G throws (F5-F7), Tab changes grenade (F10), C crouches, T sets a booby or remote trap (F9), R detonates remotes (F8). Terminals show password letters; type the password at the mainframe (F4) and search.\nCar: arrows order the next turn, + and - speed, Tab swaps cars, F follows, F1/E arrests when prompted.\nCrypto: pick a code letter and type the plain letter. Electronics: Enter swaps chips.'],
  ];
  let i = 0;
  return pageScene(() => { folder(P.G3, 'Manual'); const [h, b] = pages[i]; text(h, 16, 22, uiX_I.r); textR((i + 1) + '/' + pages.length, 300, 22, uiX_I.g); para(b, 16, 36, 288, uiX_I.k, 8); textC('Press a key', W / 2, 188, uiX_I.g); }, () => { i++; if (i >= pages.length) back(); });
}

// ---------- NEW CHARACTER ----------
function charScene() {
  let s, step = 0, sex = 'm', name = '';
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const m1 = Menu([{ label: 'Maximillian Remington', go: () => { sex = 'm'; step = 1; s.typing = true; typing = true; } }, { label: 'Maxine Remington', go: () => { sex = 'f'; step = 1; typing = true; } }], 110, 70, 118);
  const m3 = () => Menu(DIFFICULTY.map((d, i) => ({ label: d.name, go: () => { game.diff = i; game.agent = newAgent(sex, name.trim() || (sex === 'f' ? 'Fox' : 'Fox')); clearCase(); game.cases = []; game.rank = 0; game.careerPoints = 0; ORGS.forEach(o => o.mastermindFree = true); go(trainingScene()); } })), 110, 70, 118);
  const doneName = () => { step = 2; typing = false; s.menu = m3(); };
  s = menuScene({
    menu: m1,
    back: () => { if (step) { step = 0; typing = false; s.menu = m1; } else go(titleScene()); },
    onChar(ch) { if (step !== 1) return; if (ch === '') name = name.slice(0, -1); else if (name.length < 10) name += name.length ? ch.toLowerCase() : ch; sfx.tick(); },
    onKey(k) { if (k === 'menu') { this.back(); return; } if (step === 1) { if (k === 'select') doneName(); if (k === 'fire' && name.length < 10) name += ' '; return; } this.menu.key(k); },
    tapElse(x, y) { if (step !== 1) return; const c = Math.floor((x - 82) / 12), r = Math.floor((y - 124) / 12); if (r >= 0 && r < 2 && c >= 0 && c < 13) this.onChar(A[r * 13 + c]); else if (y >= 150 && y < 162) { if (x < 160) name = name.slice(0, -1); else doneName(); } },
    onTap(x, y) { if (step === 1) { this.tapElse(x, y); return; } this.menu.tap(x, y); },
    draw() {
      rect(0, 0, W, H, P.K); uiX_backdrop();
      blit(uiX_curtain('m'), 15, 0); drawMaxFigure(43, 190, 'm', sex === 'm' || step === 0);
      blit(uiX_curtain('f'), 245, 0); drawMaxFigure(273, 190, 'f', sex === 'f' || step === 0);
      if (step === 0) { text('Select one...', 104, 62, uiX_T.hd); this.menu.draw(); }
      if (step === 1) {
        uiX_panel(84, 70, 152, 40); textC((sex === 'f' ? 'Maxine' : 'Max') + "'s code name is:", 160, 74, '#1c2129');
        fine(() => { uiX_wellF(188, 172, 264, 28, ['#1d3a20', '#142b17', '#0d1f10']); for (let x = 196; x < 448; x += 4) rect(x, 195, 2, 1, '#2f6a33'); });
        text(name, 98, 89, uiX_T.lcd); if ((this.t * 3 | 0) % 2) fine(() => rect((98 + textW(name) + (name ? 1 : 0)) * 2, 178, 10, 14, '#6fd86a'));
        uiX_panel(78, 120, 164, 45);
        for (let i = 0; i < 26; i++) { const x = 82 + (i % 13) * 12, y = 124 + Math.floor(i / 13) * 12, hv = mouse.x >= x && mouse.x < x + 11 && mouse.y >= y && mouse.y < y + 11; uiX_key(x, y, 11, 11, hv ? 'amber' : 'ivory'); textC(A[i], x + 5, y + 2, '#2a2418'); }
        uiX_key(82, 150, 74, 11, 'red'); textC('Rub out', 119, 152, '#fff2ea'); uiX_key(164, 150, 74, 11, 'blue'); textC('Done', 201, 152, '#fff2c0');
      }
      if (step === 2) { text('Which difficulty level?', 104, 62, uiX_T.hd); this.menu.draw(); fine(() => { for (let i = 0; i < 4; i++) { const on = i <= this.menu.sel, x = (90 + i * 9) * 2, y = (144 - i * 3) * 2, h = (8 + i * 3) * 2, c = ['#5fd06a', '#e8c440', '#f07a3a', '#e0322a'][i]; g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + 2, y + 2, 14, h); g.fillStyle = on ? uiX_lg(x, 0, x + 14, 0, [mix(c, '#ffffff', 0.4), c, mix(c, '#000000', 0.3)]) : '#262b33'; g.fillRect(x, y, 14, h); rect(x, y, 14, 1, on ? '#ffffff' : '#3c434e'); if (on) { g.fillStyle = uiX_rg(x + 7, y + h / 2, 0, 20, [c + '44', c + '00']); g.fillRect(x - 13, y - 10, 40, h + 20); } } }); para(['Special help for first-time agents.', 'More suspects, fewer clues.', 'Alert guards, harder codes and circuits.', 'Red herrings, no word spaces, deadly guards.'][this.menu.sel], 90, 110, 140, uiX_T.opt, 8); }
    },
  });
  return s;
}
function trainingScene() {
  let picks = 4; const keys = ['combat', 'driving', 'crypto', 'electronics'];
  const cols = [P.RD, P.BL2, P.G1, P.GR], labels = ['Combat', 'Driving', 'Crypto', 'Electronics'];
  const s = menuScene({
    menu: Menu(['Combat training', 'Driving training', 'Cryptography training', 'Electronics training'].map((l, i) => ({ label: l, go: () => { if (picks > 0 && game.agent.skills[keys[i]] < 3) { game.agent.skills[keys[i]]++; picks--; if (!picks) setTimeout(() => go(chiefScene()), 800); } else sfx.deny(); } })), 132, 17, 132),
    draw() {
      rect(0, 0, W, H, P.K); uiX_backdrop(); textC('Preparation for Field Work', W / 2, 4, uiX_T.hd); fine(() => { rect(192, 25, 256, 1, uiX_BRASS[4]); rect(192, 26, 256, 1, uiX_BRASS[1]); });
      this.menu.draw();
      for (let i = 0; i < 4; i++) {
        const x = i * 81, y = 50, w = 77, h = 150;
        uiX_trainFrame(x, y, w, h, i); trainingArt(i, x + 2, y + 2, w - 4, 126, this.t);
        textC(labels[i], x + w / 2, y + 131, '#fff6e6'); textC(SKILL_NAMES[game.agent.skills[keys[i]]], x + w / 2, y + 140, '#ffd66a');
      }
    },
  });
  return s;
}

// ---------- THE CHIEF ----------
function chiefTalk(txt, next) {
  const lines = wrap(txt, 292); let page = 0;
  return pageScene(t => { chiefArt(t); lines.slice(page * 5, page * 5 + 5).forEach((l, i) => text(l, 13, 154 + i * 8, P.W)); }, () => { page++; if (page * 5 >= lines.length) next(); });
}
function chiefScene() {
  newCase();
  const cr = game.crime;
  return chiefTalk('Welcome back, ' + game.agent.short + '. It looks like the bad guys are preparing for action and the President is worried. He insists that you\'re the agent for this job. Things seem to be heating up in ' + REGIONS[cr.region].name + '. We\'ve picked up a few clues already - check them at any CIA office. Good luck ' + game.agent.short + ', you are our best hope.', () => { game.city = 'WAS'; go(cityScene()); });
}
function newCase() {
  clearCase();
  Object.assign(game, { t: 0, clues: [], messages: [], news: [], taps: [], activity: {}, inside: [], caseStart: Date.now(), ciaVisited: {}, heatBy: {}, ciaBlocked: {} });
  game.startDate = new Date(1990 + Math.floor(game.cases.length / 4), ri(0, 11), ri(1, 25), 8, 0, 0);
  newCrime();
  const cr = game.crime;
  const people = shuffle(cr.people.filter(p => p.role !== 'Mastermind'));
  for (let i = 0; i < 5 - game.diff; i++) clueAbout(people[i % people.length], 'Covert Surveillance');
  clueAbout(people[0], 'Informant', 'hideout');
  if (game.diff === 0) game.messages.push(Object.assign(makeMessage(cr.steps[0]), { src: 'Satellite Intercept' }));
}

// ---------- CITY ----------
function locationsHere() {
  const out = [{ kind: 'airport', label: 'The Airport.' }, { kind: 'hotel', label: 'Your Hotel.' }, { kind: 'cia', label: 'CIA office' }];
  for (const b of Object.values(game.buildings)) if (b.city === game.city && b.known) out.push({ kind: 'bld', b, label: b.agency ? b.agency + ' ' + b.type : b.orgKnown ? b.org.name + ' ' + b.type : b.address });
  return out;
}
function cityScene() {
  if (game.crime && game.crime.over && !game.crime.reported) return synopsisScene();
  if (game.crime && game.crime.prisonBreak && !game.crime.prisonBreak.handled && !practiceMode) return prisonBreakScene();
  if (game.crime && game.crime.foiled != null && !game.crime.foiledShown) { game.crime.foiledShown = true; const cr = game.crime, mmIn = cr.people[cr.mastermind].status === 'arrested';
    return report('Plot Foiled', [mmIn ? 'With the Mastermind in custody, the ' + cr.kind.toLowerCase() + ' plot is dead. Nobody is left to give the orders.' : 'Word from every station: the ' + cr.kind.toLowerCase() + ' plot has collapsed. Without its key people it cannot go ahead.', 'The rest of the ring will start going into hiding over the next few days' + (mmIn ? '' : ', the Mastermind last of all') + '. Round up whoever you can while they are still in place. The case closes when they are gone.'], () => go(cityScene())); }
  writeCase(); const city = cityById(game.city);
  const items = locationsHere().map(l => ({ label: fitText(l.label, 120), go: () => goLocation(l) }));
  items.push({ label: 'Check Data', go: () => go(dataSection(() => go(cityScene()))) });
  return cityLayout({ header: ['You are in ' + city.name, 'Do you go to ...'], items, pic: (x, y, w, h, t) => cityPic(x, y, w, h, city), caption: city.name + ', ' + (city.hq ? 'D.C.' : city.country), back: () => go(pauseScene(() => go(cityScene()))) });
}
function goLocation(l) {
  advance(20); if (checkCaseEnd()) return;
  const arrive = () => goLocation2(l);
  // word gets around: the more noise Max makes in a city, the likelier an ambush on the street
  const heat = (game.heatBy && game.heatBy[game.city]) || 0, locals = game.crime.people.some(p => p.status === 'free' && p.city === game.city);
  if (locals && heat > 0 && l.kind !== 'airport' && rnd() < Math.min(0.45, heat * 0.07)) { game.heatBy[game.city] = Math.max(0, heat - 2); ambush(arrive); return; }
  arrive();
}
function goLocation2(l) { if (l.kind === 'cia') go(game.ciaBlocked[game.city] ? pageScene(() => { rect(0, 0, W, H, P.K); uiX_backdrop(); ciaLobbyArt(170, 0, 150, 200, 0); uiX_mullion(169); para('The station chief meets you at the door. After your accusation, nobody in this office will work with you. Try the CIA in another city.', 15, 20, 140, uiX_T.hd, 8); statusBox(174); }, () => go(cityScene())) : ciaArrive()); else if (l.kind === 'airport') go(airportScene()); else if (l.kind === 'hotel') go(hotelScene()); else go(buildingScene(l.b)); }
function pauseScene(back) {
  return menuScene({
    menu: Menu([{ label: 'Continue', go: back }, { label: 'Sound on / off', go: () => { sfx.toggle(); } }, { label: 'How to play', go: () => go(helpScene(() => go(pauseScene(back)))) }, { label: 'Save Game', go: () => { writeSave(); writeCase(); toast('Game saved'); } }, { label: 'Quit to title', go: () => go(titleScene()) }], 118, 76, 110),
    back, draw() { blit(uiX_deskArt(), 0, 0); uiX_deskLive(this.t); msgBox(100, 60, 124, 60); text('Do you want to...', 106, 64, uiX_T.hd); this.menu.draw(); },
  });
}

// ---------- CIA BUILDING ----------
function ciaArrive() {
  game.ciaFloor = 0;
  if (game.ciaVisited[game.city]) return ciaFloors();
  game.ciaVisited[game.city] = true;
  return pageScene(t => { rect(0, 0, W, H, P.K); uiX_backdrop(); ciaLobbyArt(170, 0, 150, 200, t); uiX_mullion(169); uiX_floorBar(0); para('You arrive at the CIA building and check with your contact.', 15, 20, 140, uiX_T.hd, 8); statusBox(174); }, () => go(ciaFloors()));
}
// the lift: doors shut, the indicator steps floor by floor, ding, doors open
function ride(floor, next) { const from = game.ciaFloor || 0; game.ciaFloor = floor; go(liftScene(from, floor, next)); }
function ciaFloors() {
  return menuScene({
    menu: Menu([{ label: '1. Data Section', go: () => ride(1, () => go(dataSection(() => go(ciaFloors())))) }, { label: '2. Intelligence Section', go: () => ride(2, () => go(intelSection(() => go(ciaFloors())))) }, { label: '3. Crypto Branch', go: () => ride(3, () => go(cryptoBranch(() => go(ciaFloors())))) }, { label: 'Leave building', go: () => ride(0, () => go(cityScene())) }], 27, 30, 146),
    back: () => go(cityScene()),
    draw() { rect(0, 0, W, H, P.K); ciaFloorsArt(170, 0, 150, 200, this.t, game.ciaFloor || 0, [1, 2, 3, 0][this.menu.sel]); text('You are in the CIA building.', 21, 14, uiX_T.hd); text('Which floor ?', 21, 22, uiX_T.hd); this.menu.draw(); statusBox(174); },
  });
}
function dataSection(back) {
  const me = () => go(dataSection(back));
  return splitLayout({ header: ['Data Section...'], floor: 1, back, art: (x, y, w, h, t) => dataRoomArt(x, y, w, h, t), items: [
    { label: 'Review Clues', go: () => go(reviewClues(me)) },
    { label: 'Review Suspects', go: () => go(reviewSuspects(me)) },
    { label: 'Case Board', go: () => go(caseBoard(me)) },
    { label: 'Inside Information', go: () => go(insideInfo(me)) },
    { label: 'News Bulletins', go: () => go(folderList('News', FOLDER.news, game.news.slice().reverse().map(n => ({ label: dayStr(n.t) + '  ' + n.text })), me, { empty: '...no news' })) },
    { label: 'Organization Summary', go: () => go(orgSummary(me)) },
    { label: 'City Summary', go: () => go(citySummary(me)) },
    { label: 'Activity Reports', go: () => go(activityReports(me)) },
  ] });
}
function reviewClues(back) {
  const rows = game.clues.slice().reverse().map(c => ({ label: c.heading, right: dayStr(c.t), open: () => go(clueScreen(c, () => go(reviewClues(back)))) }));
  return folderList('Clues', FOLDER.clue, rows, back, { empty: '...no clues yet' });
}
// ---------- clue-method pictures: little photographs, 26x22 layout (52x44 fine) ----------
// Each is a tiny lit scene with its own 5-8 colour mini palette and one focal object.
function uiX_rr(x, y, w, h, r, c) { g.fillStyle = c; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill(); }
function uiX_ell(cx, cy, rx, ry, c) { g.fillStyle = c; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill(); }
const uiX_ICON = {
  binoc() { // dusk over the rooftops, a pair of field glasses in the foreground
    uiX_band(0, 0, 52, 44, ['#1b1d44', '#3b2d62', '#78466c', '#c46f58', '#eea55c'], 8);
    uiX_poly([[0, 44], [0, 33], [6, 33], [6, 29], [12, 29], [12, 34], [19, 34], [19, 26], [24, 26], [24, 31], [33, 31], [33, 27], [40, 27], [40, 32], [46, 32], [46, 30], [52, 30], [52, 44]], '#181628');
    for (const [a, b] of [[8, 31], [21, 29], [36, 29], [42, 34], [15, 36]]) rect(a, b, 1, 1, '#ffd27a');
    const barrel = x => {
      uiX_rr(x, 5, 15, 30, 4, '#0d0e13'); uiX_rr(x + 1, 6, 13, 28, 3, '#262933'); rect(x + 2, 8, 3, 24, '#3d414e'); rect(x + 2, 8, 1, 22, '#5d6273'); rect(x + 11, 8, 2, 24, '#15171d');
      rect(x + 2, 12, 11, 1, '#15171d'); rect(x + 2, 25, 11, 1, '#15171d');
      uiX_rr(x + 3, 1, 9, 6, 2, '#0d0e13'); rect(x + 4, 2, 3, 2, '#4a4e5c');
      uiX_ell(x + 7.5, 36, 7.5, 4.5, '#0b0c10'); uiX_ell(x + 7.5, 36, 6, 3.4, '#6e7482'); uiX_ell(x + 7.5, 36.3, 4.8, 2.6, '#1c3c6e'); uiX_ell(x + 7, 35.6, 3, 1.4, '#6fa6dc'); rect(x + 5, 34.6, 2, 1, '#ffffff');
    };
    barrel(6); barrel(31); rect(21, 12, 10, 9, '#0d0e13'); rect(22, 13, 8, 7, '#2b2e38'); rect(22, 13, 8, 1, '#4d5160'); uiX_circ(26, 9, 3, '#0d0e13'); uiX_circ(26, 9, 2, '#3d414e');
  },
  tap() { // a red rotary telephone on the desk, tapped with a green clip lead and a bug
    uiX_band(0, 0, 52, 44, ['#26304a', '#1b2338', '#121829'], 5); rect(0, 36, 52, 8, '#3b2a22'); rect(0, 36, 52, 1, '#5a4031');
    uiX_ell(24, 38, 20, 3, 'rgba(0,0,0,0.45)');
    uiX_poly([[9, 21], [39, 21], [43, 37], [5, 37]], '#7e1a15'); uiX_poly([[10, 21], [38, 21], [40, 30], [8, 30]], '#b3302a'); uiX_poly([[11, 21], [23, 21], [21, 30], [9, 30]], '#d44c3e'); rect(10, 21, 28, 1, '#ff8a74');
    rect(5, 36, 38, 1, '#4a0e0c');
    // handset
    uiX_rr(6, 13, 36, 6, 3, '#5a1210'); uiX_rr(7, 13, 34, 4, 2, '#c23a31'); rect(9, 13, 28, 1, '#ff9a86'); uiX_rr(3, 15, 11, 7, 3, '#8a1e18'); uiX_rr(34, 15, 11, 7, 3, '#8a1e18'); rect(5, 16, 7, 1, '#e0584a'); rect(36, 16, 7, 1, '#e0584a');
    // dial
    uiX_circ(24, 29, 6.5, '#5a1210'); uiX_circ(24, 29, 5.8, '#efe8d6'); for (let i = 0; i < 9; i++) { const a = -2.2 + i * 0.55; uiX_circ(24 + Math.cos(a) * 3.9, 29 + Math.sin(a) * 3.9, 0.9, '#8a1e18'); } uiX_circ(24, 29, 1.8, '#c9c0aa'); rect(22, 27, 2, 1, '#ffffff');
    // the tap
    g.strokeStyle = '#3fae52'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(42, 31); g.bezierCurveTo(48, 30, 45, 16, 47, 10); g.stroke();
    uiX_rr(42, 3, 9, 7, 1.5, '#1a1c22'); rect(43, 4, 7, 1, '#50545f'); uiX_ledF(46.5, 7, 1, '#ff4a3a');
  },
  informant() { // a man in a trench coat under a street lamp, a whisper in a bubble
    uiX_band(0, 0, 52, 44, ['#0d111d', '#151b2b', '#1f2638'], 5); rect(0, 38, 52, 6, '#191c24'); rect(0, 38, 52, 1, '#2d3240');
    g.fillStyle = uiX_rg(40, 6, 0, 34, ['rgba(255,214,140,0.55)', 'rgba(255,190,110,0.18)', 'rgba(0,0,0,0)']); g.fillRect(0, 0, 52, 44);
    rect(44, 4, 2, 36, '#2a2c33'); rect(44, 4, 1, 36, '#4a4d57'); uiX_rr(38, 2, 10, 4, 1.5, '#2a2c33'); rect(40, 6, 6, 1, '#ffe6a8');
    uiX_ell(26, 40, 11, 2, 'rgba(0,0,0,0.5)');
    // figure: coat lit from the lamp on his left (our right)
    uiX_poly([[18, 40], [20, 21], [24, 17], [30, 17], [34, 21], [36, 40]], '#4e4230'); uiX_poly([[27, 17], [30, 17], [34, 21], [36, 40], [29, 40]], '#8a7550'); rect(34, 22, 1, 17, '#b39866');
    uiX_poly([[24, 17], [27, 24], [30, 17]], '#1d1a16'); rect(26, 22, 1, 17, '#2a241c');
    uiX_ell(27, 13, 3.6, 4.2, '#9a6f55'); uiX_ell(28.3, 13.2, 2, 3.6, '#d7a47f'); rect(24, 14, 6, 2, '#3b2a22');
    uiX_ell(27, 9.8, 7.5, 1.6, '#1c1916'); uiX_rr(23, 5, 8, 5, 2, '#2c2723'); rect(23, 8, 8, 1, '#4a3a2c'); rect(29, 5, 2, 4, '#4a4036');
    rect(30, 15, 3, 1, '#e8e2d0'); uiX_ledF(33.5, 15.5, 1, '#ff8a3a');
    // speech bubble
    uiX_rr(2, 3, 16, 9, 3, '#f4f0e4'); uiX_poly([[10, 11], [15, 11], [18, 15]], '#f4f0e4'); for (const dx of [6, 10, 14]) uiX_circ(dx - 0.5, 7.5, 1, '#3a3d48');
  },
  computer() { // an office terminal: beige casing, green phosphor text, a keyboard
    uiX_band(0, 0, 52, 44, ['#2f3746', '#3a4353', '#454f60'], 4); rect(0, 32, 52, 12, '#5a3d27'); rect(0, 32, 52, 1, '#8a5f3c');
    uiX_cast(7, 3, 36, 27, 0.4, 2);
    uiX_rr(7, 3, 36, 27, 2, '#8d826c'); uiX_rr(7, 3, 35, 26, 2, '#cfc5ab'); rect(8, 4, 33, 1, '#efe7d0'); rect(8, 4, 1, 24, '#e6dcc2');
    rect(11, 7, 28, 18, '#0b1a10'); rect(11, 7, 28, 1, '#050b07');
    g.fillStyle = uiX_rg(25, 16, 2, 18, ['rgba(80,255,140,0.18)', 'rgba(80,255,140,0)']); g.fillRect(11, 7, 28, 18);
    for (const [ly, lw] of [[9, 14], [12, 22], [15, 9], [18, 18], [21, 6]]) rect(13, ly, lw, 1, '#6dff8a');
    rect(20, 21, 2, 2, '#b8ffc8');
    rect(21, 30, 8, 2, '#8d826c');
    uiX_poly([[5, 34], [45, 34], [48, 42], [2, 42]], '#b8ad93'); rect(5, 34, 40, 1, '#e6dcc2'); rect(2, 41, 46, 1, '#6d6453');
    for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) rect(6 + r + i * 3.3, 36 + r * 2, 2, 1, '#6d6453');
    rect(38, 25, 2, 1, '#ff5a3c');
  },
  camera() { // a black 35mm reflex with a chrome top and a coated lens
    uiX_band(0, 0, 52, 44, ['#1d5560', '#174650', '#113840'], 5);
    uiX_ell(26, 40, 22, 3, 'rgba(0,0,0,0.4)');
    uiX_rr(3, 12, 46, 26, 3, '#101115'); uiX_rr(4, 13, 44, 24, 2, '#23252c'); rect(5, 13, 42, 1, '#3c3f49');
    rect(4, 12, 44, 6, '#7c858f'); rect(4, 12, 44, 2, '#c9d0d6'); rect(4, 12, 44, 1, '#ffffff'); rect(4, 17, 44, 1, '#454b53');
    uiX_poly([[17, 12], [20, 5], [32, 5], [35, 12]], '#6b747e'); uiX_poly([[18, 12], [21, 6], [26, 6], [24, 12]], '#c9d0d6'); rect(21, 5, 11, 1, '#ffffff');
    rect(7, 8, 7, 4, '#2a2d34'); rect(8, 8, 5, 1, '#8a929c'); rect(39, 8, 6, 4, '#2a2d34'); uiX_circ(42, 9.5, 1.2, '#c9d0d6');
    uiX_circ(26, 27, 11, '#0b0c0f'); uiX_circ(26, 27, 10, '#3b3f48'); uiX_circ(26, 27, 8.6, '#15171c'); for (let a = 0; a < 6.28; a += 0.35) rect(26 + Math.cos(a) * 9.3, 27 + Math.sin(a) * 9.3, 1, 1, '#5b606b');
    uiX_circ(26, 27, 6.5, '#241a3a'); g.fillStyle = uiX_rg(24, 25, 0, 7, ['#6a4aa0', '#2a3d6a', '#0e1424']); g.beginPath(); g.arc(26, 27, 6, 0, 7); g.fill();
    uiX_ell(23.5, 24.5, 2.4, 1.4, '#a8e0c8'); rect(22, 24, 1, 1, '#ffffff'); uiX_circ(29, 30, 1, '#7a5ab8');
    rect(8, 20, 5, 3, '#c9d0d6'); rect(8, 20, 5, 1, '#ffffff');
  },
  docs() { // a manila file on the desk, the papers sliding out, a red TOP SECRET band
    uiX_woodF(0, 0, 52, 44, 5);
    uiX_cast(4, 8, 34, 32, 0.45, 2); uiX_poly([[4, 8], [12, 8], [14, 5], [24, 5], [26, 8], [38, 8], [38, 40], [4, 40]], '#c49a55'); rect(4, 8, 34, 1, '#ecd08e'); rect(14, 5, 10, 1, '#ecd08e');
    uiX_cast(13, 3, 30, 36, 0.35, 2); rect(13, 3, 30, 36, '#f6f0de'); rect(13, 3, 30, 1, '#ffffff'); rect(42, 3, 1, 36, '#d9cca8');
    for (const [ly, lw] of [[8, 20], [11, 24], [14, 16], [17, 22], [29, 18], [32, 22], [35, 12]]) rect(16, ly, lw, 1, '#8d8676');
    rect(16, 20, 24, 6, '#b3342b'); rect(16, 20, 24, 1, '#d4574a'); for (let i = 0; i < 6; i++) rect(18 + i * 3.6, 22, 2, 2, '#f6e8d8');
    rect(38, 1, 2, 9, '#adb8c1'); rect(38, 1, 1, 9, '#f0f4f6'); rect(40, 2, 1, 6, '#6d7883');
  },
  police() { // a gold police shield pinned to a blue uniform
    uiX_band(0, 0, 52, 44, ['#1f2a52', '#18214a', '#121a3b'], 5); for (let x = 3; x < 52; x += 6) rect(x, 0, 1, 44, 'rgba(255,255,255,0.03)');
    rect(0, 36, 52, 1, '#0c1128');
    const sh = [[26, 3], [35, 7], [41, 6], [40, 20], [36, 30], [26, 38], [16, 30], [12, 20], [11, 6], [17, 7]];
    uiX_poly(sh.map(([a, b]) => [a + 1.5, b + 2]), 'rgba(0,0,0,0.45)'); uiX_poly(sh, '#7a5412'); uiX_poly(sh.map(([a, b]) => [26 + (a - 26) * 0.88, 20 + (b - 20) * 0.88]), '#d7a93c');
    uiX_poly([[26, 5], [34, 9], [39, 8.5], [38, 20], [26, 20]], '#b8892a'); uiX_poly([[26, 5], [18, 9], [13, 8.5], [14, 16], [26, 13]], '#f4d57a'); rect(17, 9, 6, 1, '#fff4c8');
    uiX_circ(26, 21, 6.5, '#7a5412'); uiX_circ(26, 21, 5.6, '#1f3b86'); uiX_circ(25, 20, 3.5, '#3a5cb4');
    const st = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 1.6 : 4, a = -Math.PI / 2 + i * Math.PI / 5; st.push([26 + Math.cos(a) * r, 21 + Math.sin(a) * r]); } uiX_poly(st, '#f7e08c');
    rect(18, 30, 16, 3, '#b8892a'); rect(18, 30, 16, 1, '#f4d57a');
  },
  interro() { // the interrogation room: one hanging lamp, an empty chair in its light
    rect(0, 0, 52, 44, '#08090d'); rect(0, 34, 52, 10, '#111217');
    uiX_poly([[21, 9], [31, 9], [48, 44], [4, 44]], 'rgba(255,228,160,0.10)'); uiX_poly([[22, 9], [30, 9], [40, 44], [12, 44]], 'rgba(255,228,160,0.12)');
    uiX_ell(26, 39, 17, 4, 'rgba(255,226,160,0.22)'); uiX_ell(26, 39, 11, 2.6, 'rgba(255,230,170,0.25)');
    rect(25.5, 0, 1, 5, '#3a3d45');
    uiX_poly([[20, 10], [23, 4], [29, 4], [32, 10]], '#2f5a3a'); uiX_poly([[23, 4], [26, 4], [24, 10], [20, 10]], '#4f8a5c'); rect(20, 10, 12, 1, '#1a2a1e'); uiX_ell(26, 10.5, 4, 1.2, '#fff4cf');
    // chair: seat, back, legs; lit from above
    uiX_ell(26, 40, 8, 1.6, 'rgba(0,0,0,0.6)');
    rect(20, 21, 2, 19, '#4a3424'); rect(20, 21, 1, 12, '#8a6444'); rect(20, 21, 10, 2, '#c8955e'); rect(20, 25, 10, 2, '#8a6444');
    rect(19, 30, 15, 3, '#6b4a30'); rect(19, 30, 15, 1, '#d8a56c'); rect(32, 33, 2, 7, '#3a281c'); rect(21, 33, 2, 7, '#4a3424'); rect(28, 33, 1, 5, '#2a1d14');
  },
};
function methodIcon(m, x, y) {
  const k = /Tap/.test(m) ? 'tap' : /Photograph/.test(m) ? 'camera' : /Document/.test(m) ? 'docs' : /Computer|INTERPOL|Scan/.test(m) ? 'computer' : /Police/.test(m) ? 'police' : /Interrog/.test(m) ? 'interro' : /Informant|Gossip/.test(m) ? 'informant' : 'binoc';
  // a small print with a white border, clipped to the page
  uiX_print(x - 3, y - 3, 32, 30);
  blit(art('uiX_icon' + k, 26, 22, () => { uiX_ICON[k](); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 52, 1); g.fillRect(0, 0, 1, 44); }), x, y);
  uiX_clip(x - 6, y - 7);
}
// an index card: soft shadow, red header rule, pale blue lines
function uiX_card(x, y, w, h, rule = 10, first = 18) {
  fine(() => {
    const X = x * 2, Y = y * 2, Wd = w * 2, Hh = h * 2;
    uiX_paperF(X, Y, Wd, Hh, true, { hi: '#fffdf6', lt: '#fcf9ef', base: '#f7f2e4', sh: '#ddd4be', dk: '#c9bda0' });
    rect(X + 2, Y + rule * 2, Wd - 4, 1, '#e08a7c');
    for (let yy = y + first; yy < y + h - 2; yy += 8) rect(X + 2, yy * 2 + 1, Wd - 4, 1, '#b5cde2');
  });
}
// the address a clue names, as 'street no, City' (the same street number can turn up in two cities)
function clueAddr(c) {
  const full = b => b.address + ', ' + cityById(b.city).name;
  if (c.addr && game.buildings[c.addr]) return full(game.buildings[c.addr]);
  const b = Object.values(game.buildings).find(b => c.text.includes(full(b))); return b ? full(b) : null;
}
function addressClues(addr, c, back) {
  const me = () => go(addressClues(addr, c, back));
  return folderList(fitText(addr.split(',')[0], 130), FOLDER.clue, game.clues.filter(o => o !== c && o.text.includes(addr)).reverse().map(o => ({ label: o.text.split(addr)[0].replace(/\s+(at|to)\s*$/, '') + '...', right: dayStr(o.t), open: () => go(clueScreen(o, me)) })), back);
}
function clueScreen(c, back) {
  const p = game.crime.people[c.pid];
  const related = game.clues.filter(o => o !== c && (c.pid != null ? o.pid === c.pid : o.addr === c.addr)).slice(-2);
  // other clues naming the same address: only clues already in our files
  const addr = clueAddr(c), same = addr ? game.clues.filter(o => o !== c && o.text.includes(addr)) : [];
  const link = same.length ? 'Also at this address (' + same.length + ')' : '', lw = textW(link) + 16, lx = 306 - lw;
  const s = pageScene(() => {
    folder(FOLDER.clue, 'Clue');
    text('Source: ' + c.source, 12, 20, uiX_I.g);
    const y = para(c.text, 12, 28, c.face ? 240 : 260, uiX_I.k, 8);
    text('Method: ' + c.method, 12, y + 1, uiX_I.g);
    if (c.face) { uiX_print(262, 18, 40, 46); drawFace(p.face, 266, 22, 32, 38); uiX_corners(266, 22, 32, 38); uiX_clip(290, 11); } else methodIcon(c.method, 274, 20);
    text('Related Clues:', 12, 92, uiX_I.r);
    if (!related.length) text('...none', 12, 100, uiX_I.k);
    related.forEach((r, i) => { const yy = 102 + i * 36; uiX_card(10, yy, 298, 34); text('Source: ' + r.source, 14, yy + 3, uiX_I.g); para(r.text, 14, yy + 11, 288, uiX_I.k, 8); });
    // a cross-reference slip tucked into the file
    if (link) { fine(() => { const X = lx * 2, Y = 170; uiX_cast(X, Y, lw * 2, 22, 0.3, 3); rect(X, Y, lw * 2, 22, '#fdf3c8'); rect(X, Y, lw * 2, 1, '#ffffff'); rect(X, Y + 21, lw * 2, 1, '#d8c690'); rect(X, Y, 4, 22, '#c9433a'); }); text(link, lx + 6, 88, uiX_I.b); fine(() => { rect((lx + 6) * 2, 193, textW(link) * 2, 1, uiX_I.b); uiX_poly([[(lx + lw - 7) * 2, 180], [(lx + lw - 3) * 2, 184], [(lx + lw - 7) * 2, 188]], uiX_I.b); }); }
    if (c.lie && game.crime.double && game.crime.double.caught) uiX_stamp('DISINFORMATION', 200 - uiX_stampW('DISINFORMATION') / 2, 63);
  }, back);
  if (link) {
    const cross = () => { sfx.select(); go(addressClues(addr, c, () => go(clueScreen(c, back)))); }, pk = s.onKey, pt = s.onTap;
    s.onKey = function (k) { if (this.t > 0.3 && (k === 'right' || k === 'action' || k === 'alt')) cross(); else pk.call(this, k); };
    s.onTap = function (x, y) { if (this.t > 0.3 && x >= lx && x < 308 && y >= 83 && y < 98) cross(); else pt.call(this, x, y); };
  }
  return s;
}
function reviewSuspects(back) {
  const ps = game.crime.people.filter(isSuspect);
  return folderList('Suspect Files', FOLDER.docs, ps.map(p => ({ label: p.known.name ? p.name : 'Agent ' + String.fromCharCode(65 + p.id), right: p.status !== 'free' ? p.status : p.known.city ? shownCity(p).name : '', rcol: p.status !== 'free' ? P.RD : P.BL, open: () => go(suspectFile(p, () => go(reviewSuspects(back)))) })), back, { empty: '...no suspects identified' });
}
// tractor-feed printout: sprocket margins, perforations and pale green bars, one bar every other row
function uiX_printout(x, y, w, h, row0) {
  blit(art('uiX_printout' + [x, y, w, h, row0], W, H, () => {
    const X = x * 2, Y = y * 2, Wd = w * 2, Hh = h * 2;
    uiX_paperF(X, Y, Wd, Hh, true, { hi: '#fbfaf2', lt: '#f7f6ec', base: '#f2f0e2', sh: '#d8d4c0', dk: '#c0bba2' });
    for (let yy = row0 + 7; yy < y + h - 1; yy += 16) rect(X + 14, Math.max(Y + 1, yy * 2), Wd - 28, Math.min(16, (y + h - 1 - yy) * 2), '#dcebd2');
    for (const sx of [X + 2, X + Wd - 12]) {
      for (let yy = Y + 7; yy < Y + Hh - 5; yy += 12) { uiX_circ(sx + 5, yy, 2.6, '#c9c3ad'); uiX_circ(sx + 5, yy + 0.6, 2.1, '#6d6a60'); }
      for (let yy = Y + 1; yy < Y + Hh - 1; yy += 4) rect(sx + (sx === X + 2 ? 11 : -1), yy, 1, 2, '#cfcab6');
    }
  }), 0, 0);
}
// a line of dotted leaders on a form
function uiX_leader(x0, x1, y, c = '#b7ab90') { fine(() => { g.fillStyle = c; for (let x = x0 * 2; x < x1 * 2; x += 4) g.fillRect(x, y * 2, 2, 1); }); }
function suspectFile(p, back) {
  const steps = game.crime.steps.filter(s => (s.from === p.id || s.to === p.id) && s.known);
  return pageScene(() => {
    folder(FOLDER.suspect, 'Suspect File');
    uiX_print(14, 22, 52, 62); if (p.known.face) drawFace(p.face, 18, 26, 44, 54); else { rect(18, 26, 44, 54, '#2f5d66'); g.save(); g.translate(18, 26); g.scale(44 / 26, 54 / 32); drawUnknownFace(0, 0); g.restore(); }
    uiX_corners(18, 26, 44, 54); uiX_clip(52, 15);
    const rows = [['Name:', p.known.name ? p.name : 'Agent ' + String.fromCharCode(65 + p.id)], ['Org:', p.known.org ? p.org.name : 'unknown'], ['City:', p.known.city ? shownCity(p).name : 'unknown'], ['Hideout:', p.known.hideout ? game.buildings[p.building].address : 'unknown'], ['Rank:', p.known.org ? RANKS[p.rank] : 'unknown'], ['Role:', p.known.role ? p.role : 'unknown']];
    rows.forEach(([k, v], i) => { text(k, 74, 22 + i * 10, uiX_I.k); uiX_leader(120, 300, 30 + i * 10); text(v, 120, 22 + i * 10, v === 'unknown' ? uiX_I.l : i === 5 ? uiX_I.r : uiX_I.b); });
    uiX_printout(16, 100, 264, 60, 114);
    text('MESSAGES AND MEETINGS', 22, 104, uiX_I.k); rect(22, 111, textW('MESSAGES AND MEETINGS'), 1, uiX_I.k);
    if (!steps.length) text('...none known', 22, 114, uiX_I.g);
    steps.slice(0, 5).forEach((s, i) => { const o = game.crime.people[s.from === p.id ? s.to : s.from]; text(fitText((s.from === p.id ? 'to ' : 'from ') + (o.known.name ? o.name : 'Agent ' + String.fromCharCode(65 + o.id)) + ' (' + s.kind + ')', 250), 22, 114 + i * 8, '#2b3a2e'); });
    if (p.status !== 'free') { const s = p.status.toUpperCase(); uiX_stamp(s, 250 - uiX_stampW(s) / 2, 83); }
    if (!p.known.role) text('No evidence of involvement - an arrest will not stick.', 16, 168, uiX_I.r);
  }, back);
}
// ---------- CASE BOARD: every suspect we know of, pinned to cork, yarn only where we have proof of contact ----------
function uiX_corkArt() {
  return art('uiX_cork', W, H, () => {
    uiX_woodF(0, 0, 640, 400, 5);
    rect(10, 10, 620, 380, '#3a2412'); g.fillStyle = uiX_lg(0, 12, 0, 388, ['#b88a58', '#a8784a', '#976a3f']); g.fillRect(12, 12, 616, 376);
    for (let i = 0; i < 5200; i++) { const x = 12 + uiX_hash(i, 1, 41) * 614, y = 12 + uiX_hash(i, 2, 41) * 374, k = uiX_hash(i, 3, 41); rect(x, y, k < 0.5 ? 2 : 1, 1 + (k * 4 | 0) % 2, k < 0.3 ? '#6e4a28' : k < 0.6 ? '#86582f' : k < 0.85 ? '#c99a66' : '#d9b07c'); }
    g.fillStyle = uiX_rg(200, 120, 20, 520, ['rgba(255,220,160,0.12)', 'rgba(0,0,0,0)', 'rgba(20,8,0,0.35)']); g.fillRect(12, 12, 616, 376);
    rect(12, 12, 616, 2, 'rgba(0,0,0,0.35)'); rect(12, 12, 2, 376, 'rgba(0,0,0,0.3)'); rect(12, 386, 616, 2, 'rgba(255,230,190,0.18)');
  });
}
function uiX_pin(x, y) { fine(() => { const X = x * 2, Y = y * 2; uiX_circ(X + 2, Y + 3, 4, 'rgba(40,10,0,0.35)'); uiX_circ(X, Y, 4.4, '#7a1612'); uiX_circ(X, Y, 3.6, '#c42c22'); uiX_circ(X - 1.2, Y - 1.2, 1.4, '#ff9a8a'); }); }
const boardName = p => p.known.name ? fitText(textW(p.name) > 56 ? p.name[0] + '. ' + p.name.split(' ').slice(1).join(' ') : p.name, 56) : 'Agent ' + String.fromCharCode(65 + p.id);
function boardStatus(p) {
  if (p.status !== 'free') return [p.status === 'arrested' ? 'in custody' : p.status, uiX_I.g];
  if (p.known.role && p.known.hideout) return ['ready to arrest', uiX_I.gr];
  return ['needs ' + [!p.known.role && 'role', !p.known.hideout && 'hideout'].filter(Boolean).join(', '), uiX_I.r];
}
function caseBoard(back, page = 0, sel = 0) {
  const cr = game.crime, ps = cr.people.filter(isSuspect), per = 10, pages = Math.max(1, Math.ceil(ps.length / per));
  page = Math.min(page, pages - 1);
  const on = () => ps.slice(page * per, page * per + per), pos = i => [33 + (i % 5) * 63, 22 + Math.floor(i / 5) * 86];
  const open = i => { const p = on()[i]; if (p) { sfx.select(); go(suspectFile(p, () => go(caseBoard(back, page, i)))); } };
  const flip = d => { if (page + d < 0 || page + d >= pages) return; page += d; sel = 0; sfx.blip(); };
  return {
    t: 0, update(dt) { this.t += dt; },
    onKey(k) {
      const n = on().length;
      if (k === 'menu') { sfx.blip(); back(); return; }
      if (!n) { if (k === 'select' || k === 'fire') back(); return; }
      if (k === 'left') { if (sel % 5 === 0 && page > 0) { flip(-1); sel = Math.min(on().length - 1, 4); } else sel = Math.max(0, sel - 1); }
      if (k === 'right') { if ((sel % 5 === 4 || sel === n - 1) && page < pages - 1) flip(1); else sel = Math.min(n - 1, sel + 1); }
      if (k === 'up') sel = sel >= 5 ? sel - 5 : sel; if (k === 'down') sel = Math.min(n - 1, sel + 5);
      if (k === 'select' || k === 'fire') open(sel);
    },
    onTap(x, y) {
      if (pages > 1 && y >= 184) { flip(x < 160 ? -1 : 1); return; }
      const i = on().findIndex((p, k) => { const [cx, cy] = pos(k); return x >= cx - 31 && x < cx + 31 && y >= cy - 4 && y < cy + 80; });
      if (i >= 0) { sel = i; open(i); } else { sfx.blip(); back(); }
    },
    onHover(x, y) { const i = on().findIndex((p, k) => { const [cx, cy] = pos(k); return x >= cx - 31 && x < cx + 31 && y >= cy - 4 && y < cy + 80; }); if (i >= 0) sel = i; },
    draw() {
      blit(uiX_corkArt(), 0, 0);
      // a typed label tacked to the top of the board
      fine(() => { uiX_cast(16, 12, 148, 22, 0.3, 3); rect(16, 12, 148, 22, '#f4eedd'); rect(16, 12, 148, 1, '#ffffff'); rect(16, 31, 148, 1, '#dc7b6b'); });
      text('CASE BOARD', 13, 8, uiX_I.k);
      const note = ps.length ? ps.length + ' suspect' + (ps.length > 1 ? 's' : '') + ' on file' : '';
      if (note) { fine(() => { const w = textW(note) * 2 + 16; uiX_cast(620 - w, 12, w, 22, 0.3, 3); rect(620 - w, 12, w, 22, '#f4eedd'); rect(620 - w, 12, w, 1, '#ffffff'); }); textR(note, 306, 8, uiX_I.g); }
      const cards = on();
      if (!cards.length) { uiX_card(90, 80, 140, 34); uiX_pin(160, 81); textC('No suspects on file yet.', 160, 94, uiX_I.k); textC('Check the clues.', 160, 103, uiX_I.g); return; }
      cards.forEach((p, i) => {
        const [cx, y] = pos(i);
        uiX_print(cx - 21, y, 42, 50);
        if (p.known.face) drawFace(p.face, cx - 19, y + 2, 38, 46); else { rect(cx - 19, y + 2, 38, 46, '#2f5d66'); g.save(); g.translate(cx - 19, y + 2); g.scale(38 / 26, 46 / 32); drawUnknownFace(0, 0); g.restore(); }
      });
      // red yarn between suspects we know were in touch (decoded traffic, interrogations); it runs under the typed labels
      const idx = new Map(cards.map((p, i) => [p.id, i]));
      const links = cr.steps.filter(s => s.known && s.to !== undefined && idx.has(s.from) && idx.has(s.to));
      fine(() => {
        const yarn = (lw, c, o) => { g.strokeStyle = c; g.lineWidth = lw; g.lineCap = 'round'; links.forEach(s => { const [ax, ay] = pos(idx.get(s.from)), [bx, by] = pos(idx.get(s.to)); const x0 = ax * 2 + o, y0 = (ay - 1) * 2 + o, x1 = bx * 2 + o, y1 = (by - 1) * 2 + o, sag = 16 + Math.hypot(x1 - x0, y1 - y0) * 0.12; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag, x1, y1); g.stroke(); }); };
        yarn(2.4, 'rgba(40,10,0,0.28)', 3); yarn(2.2, '#7a1612', 0); yarn(1, '#e0493c', -0.5);
      });
      cards.forEach((p, i) => {
        const [cx, y] = pos(i), mm = p.known.role && p.role === 'Mastermind', nm = boardName(p);
        fine(() => { const X = (cx - 30) * 2, Y = (y + 52) * 2; g.fillStyle = 'rgba(40,20,0,0.35)'; g.fillRect(X + 3, Y + 3, 120, 56); rect(X, Y, 120, 56, mm ? '#fbe9c4' : '#fbf8ee'); rect(X, Y, 120, 1, '#ffffff'); rect(X, Y + 18, 120, 1, '#e08a7c'); rect(X, Y + 55, 120, 1, '#d6ccb4'); });
        textC(nm, cx, y + 53, mm ? uiX_I.r : uiX_I.k);
        const [st, col] = boardStatus(p); wrap(st, 58).slice(0, 2).forEach((l, k) => textC(l, cx, y + 63 + k * 8, col));
        if (p.status !== 'free') { const w = p.status.toUpperCase(); uiX_stamp(w, cx - uiX_stampW(w) / 2, y + 26, P.RD, true); }
        if (i === sel) fine(() => { const X = (cx - 31) * 2, Y = (y - 3) * 2; g.strokeStyle = 'rgba(255,196,60,0.9)'; g.lineWidth = 2; g.strokeRect(X, Y, 124, 168); });
      });
      cards.forEach((p, i) => { const [cx, y] = pos(i); uiX_pin(cx, y - 1); });
      if (pages > 1) { fine(() => { uiX_cast(236, 370, 168, 22, 0.3, 3); rect(236, 370, 168, 22, '#f4eedd'); }); textC((page > 0 ? '< ' : '  ') + 'page ' + (page + 1) + '/' + pages + (page < pages - 1 ? ' >' : '  '), 160, 187, uiX_I.k); }
    },
  };
}
function insideInfo(back) { return folderList('Documents', FOLDER.docs, (game.inside || []).map(x => ({ label: x.label, open: () => go(pageScene(() => { folder(P.G3, x.tab || 'Documents', true, 'TOP SECRET'); x.draw(); }, () => go(insideInfo(back)))) })), back, { empty: '...no master plans or personnel files' }); }
// a double red rule under a centred typed title
function uiX_title(s, y) { const w = textW(s); textC(s, 160, y, uiX_I.k); fine(() => { rect(320 - w, (y + 8) * 2, w * 2, 2, uiX_I.r); rect(320 - w, (y + 8) * 2 + 3, w * 2, 1, uiX_I.r); }); }
function orgSummary(back) {
  const orgs = ORGS.filter(o => game.crime.people.some(p => p.org === o && p.known.org) || Object.values(game.buildings).some(b => b.org === o && b.orgKnown));
  return folderList('Organizations', FOLDER.org, orgs.map(o => ({ label: o.name, open: () => go(pageScene(() => {
    folder(FOLDER.org, o.short); uiX_title(o.name, 22);
    const allies = game.crime.orgs.includes(o) ? game.crime.orgs.filter(x => x !== o).map(x => x.short) : [];
    const assoc = ORGS.filter(x => x !== o && x.focus === o.focus && x.regions.some(r => o.regions.includes(r))).slice(0, 4).map(x => x.short);
    text('Allies:', 16, 40, uiX_I.k); text(allies.join(', ') || 'none known', 100, 40, allies.length ? uiX_I.r : uiX_I.l);
    text('Associates:', 16, 50, uiX_I.k); text(assoc.join(', ') || 'none', 100, 50, uiX_I.b);
    text('Known Locations:', 16, 64, uiX_I.k);
    const locs = Object.values(game.buildings).filter(b => b.org === o && b.known); locs.forEach((b, i) => text('- ' + b.type + ' in ' + cityById(b.city).name, 100, 64 + i * 8, uiX_I.b));
    if (!locs.length) text('none', 100, 64, uiX_I.l);
  }, () => go(orgSummary(back)))) })), back, { empty: '...no organizations identified' });
}
function citySummary(back) {
  return folderList('Cities', FOLDER.city, regionCities(game.region).map(c => ({ label: c.name, open: () => go(pageScene(t => {
    folder(FOLDER.city, c.name); uiX_title(c.name + ', ' + c.country, 22);
    const orgs = [...new Set(Object.values(game.buildings).filter(b => b.city === c.id && b.known && (b.orgKnown || b.agency)).map(b => b.agency || b.org.name))];
    const sus = game.crime.people.filter(p => p.known.city && shownCity(p) === c);
    text('Organizations:', 16, 40, uiX_I.k); para(orgs.join(', ') || 'none known', 110, 40, 190, orgs.length ? uiX_I.b : uiX_I.l, 8);
    text('Suspects:', 16, 76, uiX_I.k); para(sus.map(p => p.known.name ? p.name : 'Agent ' + String.fromCharCode(65 + p.id)).join(', ') || 'none known', 110, 76, 190, sus.length ? uiX_I.r : uiX_I.l, 8);
    text('Clues:', 16, 112, uiX_I.k); text(String(game.clues.filter(k => k.source.includes(c.name)).length), 110, 112, uiX_I.b);
    // a snapshot of the city, taped into the file
    uiX_print(36, 128, 116, 46);
    g.save(); g.beginPath(); g.rect(40, 132, 108, 38); g.clip(); cityPic(40, 132, 108, 38, c, t); g.restore(); uiX_corners(40, 132, 108, 38);
  }, () => go(citySummary(back)))) })), back);
}
// the Data Section's chart terminal: glowing bars on a gridded navy screen under a steel title bar
function uiX_bar3(x, y, len, ramp) {
  len = Math.max(2, len | 0);
  fine(() => { const X = x * 2, Y = y * 2, L = len * 2; rect(X + 2, Y + 2, L, 10, 'rgba(0,0,0,0.45)'); g.fillStyle = uiX_lg(0, Y, 0, Y + 10, ramp); g.fillRect(X, Y, L, 10); rect(X, Y, L, 1, '#ffffff'); rect(X + L - 2, Y, 2, 10, ramp[ramp.length - 1]); rect(X, Y + 9, L, 1, ramp[ramp.length - 1]); });
}
function activityReports(back) {
  return pageScene(() => {
    blit(art('uiX_actbg2', W, H, () => {
      const S = uiX_STEEL;
      g.fillStyle = uiX_rg(320, 210, 30, 420, ['#13254a', '#0c1834', '#070e20']); g.fillRect(0, 28, 640, 372);
      for (const bx of [82, 242]) { rect(bx * 2 - 2, 32, 1, 344, 'rgba(140,190,255,0.35)'); for (let k = 1; k <= 4; k++) rect(Math.round((bx + k * 17.5) * 2), 32, 1, 344, 'rgba(140,190,255,0.10)'); }
      for (let i = 0; i < 21; i++) rect(4, (17 + i * 8) * 2 + 16, 632, 1, 'rgba(140,190,255,0.06)');
      rect(316, 28, 2, 372, S[1]); rect(318, 28, 1, 372, S[5]);
      rect(0, 0, 640, 28, S[0]); uiX_steelF(0, 0, 640, 27, 0); rect(0, 27, 640, 1, S[0]);
      uiX_screwF(10, 13); uiX_screwF(630, 13);
      g.fillStyle = uiX_lg(0, 28, 0, 44, ['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)']); g.fillRect(0, 28, 640, 16);
    }), 0, 0);
    textC('Activity Report Summary', W / 2, 4, '#eef2f5', '#20262f');
    const a = game.activity; const cities = regionCities(game.region).concat([cityById('WAS')]);
    const mx = Math.max(1, ...Object.values(a));
    cities.slice(0, 21).forEach((c, i) => { text(c.name, 3, 17 + i * 8, '#8fdcf0'); uiX_bar3(82, 18 + i * 8, 70 * (a[c.id] || 0) / mx, ['#c6f6ff', '#5fd0ea', '#2a8fb8', '#17597e']); });
    const orgs = ['CIA', 'MI6', 'Mossad', 'KGB'].map(n => ({ short: n.replace('Mossad', 'Mossd'), name: n })).concat(ORGS.filter(o => o.regions.includes(game.region)).map(o => ({ short: o.short, name: o.name })));
    orgs.slice(0, 21).forEach((o, i) => { text(o.short, 162, 17 + i * 8, '#ffa08a'); uiX_bar3(242, 18 + i * 8, 70 * (a[o.name] || 0) / mx, ['#fff0bc', '#ffc54d', '#d98a1c', '#8f5210']); });
  }, back);
}
function intelSection(back) {
  const me = () => go(intelSection(back));
  const scan = (hours, local) => { advance(hours * 60); const pool = game.crime.people.filter(p => p.status === 'free' && (!local || p.city === game.city)); let c = null; if (pool.length && rnd() < (local ? 0.55 : 0.75)) c = clueAbout(pick(pool), local ? 'Local Police Report' : 'INTERPOL Data Base'); go(c ? clueScreen(c, me) : pageScene(t => { rect(0, 0, W, H, P.K); uiX_backdrop(); g.save(); g.beginPath(); g.rect(170, 0, 150, 200); g.clip(); intelArt(170, 0, 150, 200, t); g.restore(); uiX_mullion(169); uiX_floorBar(2); popup([(local ? 'Local Scan' : 'International Scan') + ' complete.', 'Nothing new turned up.']); statusBox(174); }, me)); };
  return splitLayout({ header: ['Intelligence Section...'], floor: 2, back, art: (x, y, w, h, t) => intelArt(x, y, w, h, t), items: [
    { label: 'Local Scan', go: () => scan(2, true) },
    { label: 'International Scan', go: () => scan(6, false) },
    { label: 'Active Wire Taps', go: () => go(folderList('Wire Taps', FOLDER.docs, game.taps.filter(tp => tp.until >= dayOf(game.t)).map(tp => { const b = game.buildings[tp.key]; return { label: cityById(b.city).name + ': ' + (b.agency || (b.orgKnown ? b.org.name : 'unknown building')) + ', ' + b.address }; }), me, { empty: '...no active taps' })) },
    { label: 'Accuse Double Agent', off: !!(game.crime.double && game.crime.double.caught), go: () => go(accuseScene(me)) },
    { label: 'Check with Sam', go: () => { const hint = samHint(); go(pageScene(() => { rect(0, 0, W, H, P.K); uiX_backdrop(); intelArt(170, 0, 150, 200, 0); uiX_mullion(169); text('Sam says:', 15, 20, uiX_T.amber); para(hint, 15, 30, 140, uiX_T.hd, 8); statusBox(174); }, me)); } },
  ] });
}
function accuseScene(back) {
  const city = cityById(game.city);
  return menuScene({
    menu: Menu([{ label: 'No, not yet.', go: back }, { label: 'Yes. Arrest the mole.', go: () => {
      const d = game.crime.double; advance(120);
      if (d && d.city === game.city) {
        d.caught = true; game.crime.people.forEach(p => { if (p.shownCity) p.shownCity = null; });
        go(report('Double Agent', ['Security takes the station\'s senior analyst into custody. Under questioning he admits he has been feeding false locations to Langley for the ' + game.crime.orgs[0].name + '.', 'Clues from ' + city.name + ' are now marked as disinformation, and our files show the true locations again.'], back));
      } else { game.ciaBlocked[game.city] = true; go(report('Double Agent', ['The accusation is false. Internal Security clears everyone in the ' + city.name + ' station, and the staff are furious.', 'The CIA office in ' + city.name + ' will not work with you for the rest of this case.'], () => go(cityScene()))); }
    } }], 23, 90, 200),
    back,
    draw() { rect(0, 0, W, H, P.K); uiX_backdrop(); intelArt(170, 0, 150, 200, 0); uiX_mullion(169); text('Accuse Double Agent', 15, 14, uiX_T.amber); para('Do you accuse someone in the ' + city.name + ' station of working for the other side? If you are wrong, this office will refuse to deal with you.', 15, 30, 150, uiX_T.hd, 8); this.menu.draw(); statusBox(174); },
  });
}
function samHint() {
  const cr = game.crime;
  if (cr.double && !cr.double.caught && game.clues.some(c => c.lie) && rnd() < 0.6) return 'Some of our reports put the same suspect in two cities. Look at where the bad ones come from - if one CIA station keeps getting it wrong, we have a mole there. Accuse him from the Intelligence Section of that station.';
  const arrestable = cr.people.find(p => p.status === 'free' && p.known.role && p.known.hideout);
  if (arrestable) return 'We have the goods on ' + who(arrestable) + '. The ' + arrestable.org.name + ' building at ' + game.buildings[arrestable.building].address + ', ' + cityById(arrestable.city).name + ' is where to grab him - or catch him in his car.';
  if (game.messages.some(m => !m.decoded)) return 'There are coded messages waiting up in the Crypto Branch. Decoded messages give us the roles we need for arrests.';
  const hid = cr.people.find(p => p.status === 'free' && p.known.hideout);
  if (hid) return 'Try a wiretap or a break-in at ' + game.buildings[hid.building].address + ' in ' + cityById(hid.city).name + '. Their computers could give us roles.';
  const busy = Object.entries(game.activity).filter(([k]) => cityById(k)).sort((a, b) => b[1] - a[1])[0];
  return busy ? 'The Activity Reports point at ' + cityById(busy[0]).name + '. I would start there.' : 'Run an International Scan. We need a lead.';
}
function cryptoBranch(back) {
  const me = () => go(cryptoBranch(back));
  return splitLayout({ header: ['Crypto Branch...'], floor: 3, back, art: (x, y, w, h, t) => cryptoLabArt(x, y, w, h, t), items: [
    { label: 'Coded Messages', right: String(game.messages.filter(m => !m.decoded).length), go: () => go(folderList('Coded Messages', FOLDER.docs, game.messages.filter(m => !m.decoded).map(m => ({ label: 'Msg# ' + m.id + '  ' + dayStr(m.t), right: m.src, open: () => startCrypto(m) })), me, { empty: '...no coded messages' })) },
    { label: 'Crime Chronology', go: () => go(folderList('Chronology', FOLDER.news, game.crime.steps.filter(s => s.known).sort((a, b) => a.day - b.day).map(s => { const a = game.crime.people[s.from], b = s.to !== undefined ? game.crime.people[s.to] : null; const nm = q => q.known.name ? q.name : 'Agent ' + String.fromCharCode(65 + q.id); return { label: dayStr(dayToT(s.day)) + '  ' + nm(a) + (s.kind === 'item' ? ' obtained ' + s.item : (s.kind === 'meeting' ? ' met ' : ' messaged ') + nm(b)) }; }), me, { empty: '...nothing established' })) },
  ] });
}

// ---------- AIRPORT / TRAVEL ----------
function airportScene() {
  const here = cityById(game.city);
  const dests = [cityById('WAS'), ...regionCities(game.region)].filter(c => c.id !== game.city);
  let flying = null;
  const items = [{ label: 'Stay here', go: () => go(cityScene()) }, ...dests.map(c => ({ label: c.name, city: c, go: () => { flying = { to: c, t: 0 }; sfx.tone(300, 1.6, 'sawtooth', 0.03, 200); } })), { label: 'Check Data', go: () => go(dataSection(() => go(airportScene()))) }];
  const s = menuScene({
    menu: Menu(items, 200, 20, 118, 8, { cyan: true }), back: () => go(cityScene()),
    update(dt) { this.t += dt; if (flying) { flying.t += dt / 2.2; if (flying.t >= 1) { const h = Math.round(2 + dist(here.lon, here.lat, flying.to.lon, flying.to.lat) / 8); advance(h * 60); game.city = flying.to.id; go(cityScene()); } } },
    onKey(k) { if (flying) return; if (k === 'menu') go(cityScene()); else this.menu.key(k); },
    draw() {
      rect(0, 0, W, H, P.K);
      drawRegionMap(game.region, 1, 0, 188, 200, here, dests, (flying && flying.to) || this.menu.items[this.menu.sel].city, flying, this.t);
      uiX_travelFrame();
      uiX_departures(this.menu, this.t, !!flying);
      text("You're in " + here.name, 196, 4, uiX_T.hd); text('Do you travel to ...', 196, 12, uiX_T.hd);
      this.menu.draw();
    },
  });
  return s;
}

// the travel screen's frame: a steel mullion between the chart and the board
function uiX_travelFrame() {
  blit(art('uiX_travelframe', W, H, () => {
    const S = uiX_STEEL; rect(0, 0, 2, 400, S[5]); rect(378, 0, 8, 400, S[0]); uiX_steelF(379, 0, 5, 400, 0); rect(384, 0, 1, 400, S[1]);
  }), 0, 0);
}
// the airport's departure board: slate rows, amber flight numbers, a split-flap sign for the pick
function uiX_departures(menu, t, flying) {
  blit(art('uiX_board2', 128, 200, () => {
    uiX_band(0, 0, 256, 400, ['#1a2029', '#141920', '#0f1318'], 10);
    rect(0, 0, 256, 44, '#0d1015'); rect(0, 42, 256, 1, uiX_STEEL[5]); rect(0, 43, 256, 1, uiX_STEEL[1]);
    for (let y = 38 + 16; y < 400; y += 32) rect(0, y, 256, 16, 'rgba(255,255,255,0.025)');
    rect(0, 0, 1, 400, '#2b323d');
  }), 192, 0);
  const n = menu.items.length, sel = menu.items[menu.sel], blink = (t * 2 | 0) % 2;
  menu.items.forEach((it, i) => { if (!it.city) return; const iy = menu.y + i * menu.lh, code = 'CA ' + (100 + (it.city.id.charCodeAt(0) * 7 + it.city.id.charCodeAt(1) * 3 + it.city.id.charCodeAt(2)) % 900); textR(code, 316, iy, i === menu.sel ? uiX_T.amber : '#9a6a2a'); });
  const by = Math.max(menu.y + n * menu.lh + 6, 128), c = sel && sel.city;
  if (by > 172) return;
  fine(() => {
    const X = 390, Y = by * 2, S = uiX_STEEL;
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(X + 3, Y + 3, 244, 24); uiX_steelF(X, Y, 244, 24, 0); rect(X + 3, Y + 3, 238, 18, '#0a0c10'); rect(X + 3, Y + 20, 238, 1, S[6]);
    g.save(); g.translate(X + 14, Y + 12); g.scale(0.62, 0.62); uiX_planeF(0, 0, -Math.PI / 2 + 0.5); g.restore();
    for (let i = 0; i < 13; i++) {
      const cx = (197 + i * 9) * 2, cy = (by + 16) * 2;
      rect(cx + 1, cy + 1, 16, 22, 'rgba(0,0,0,0.6)'); uiX_rr(cx, cy, 16, 22, 2, '#1b1f26'); rect(cx + 1, cy + 1, 14, 10, '#2a2f38'); rect(cx + 1, cy + 1, 14, 1, '#474e5a');
      rect(cx, cy + 11, 16, 1, '#050608'); rect(cx, cy + 10, 1, 3, S[4]); rect(cx + 15, cy + 10, 1, 3, S[4]);
    }
  });
  text('DEPARTURES', 212, by + 2, uiX_T.amber);
  const name = c ? c.name.toUpperCase().slice(0, 13) : flying ? '' : sel && sel.label === 'Stay here' ? 'NO FLIGHT' : '';
  for (let i = 0; i < 13; i++) { const ch = name[i] || ' '; if (ch !== ' ') textC(ch, 197 + i * 9 + 4, by + 18, '#f3efe2'); }
  if (c) { text('GATE ' + (1 + c.id.charCodeAt(1) % 9), 196, by + 32, '#9aa3ad'); if (flying || blink) textR(flying ? 'DEPARTED' : 'BOARDING', 316, by + 32, flying ? '#7dff6a' : '#ff6a4a'); }
}

// ---------- HOTEL ----------
function hotelScene() {
  return boxLayout({ header: ['You are at your', 'hotel. Do you...'], art: (x, y, w, h, t) => hotelLobbyArt(t), back: () => go(cityScene()), items: [
    { label: 'Leave Hotel', go: () => go(cityScene()) },
    { label: 'Visit the lounge', go: () => { advance(180); const pool = game.crime.people.filter(p => p.status === 'free' && p.city === game.city); const c = pool.length && rnd() < 0.6 ? clueAbout(pick(pool), 'Local Gossip') : null; addHeat(game.city, 1); go(c ? clueScreen(c, () => go(hotelScene())) : pageScene(() => { hotelLobbyArt(0); popup(['Nothing but tourists and piano music.', 'Somebody at the bar is watching you, though.']); }, () => go(hotelScene()))); } },
    { label: 'Sleep through case', go: () => go(sleepScene()) },
    { label: 'Save Game', go: () => { writeSave(); writeCase(); toast('Saved as "' + game.agent.codename + '"'); } },
    { label: 'Load Game', off: !loadSave(), go: () => { restoreSave(loadSave()); go(cityScene()); } },
    { label: 'Quit', go: () => go(titleScene()) },
  ] });
}
function sleepScene() {
  return pageScene(() => { hotelLobbyArt(0); popup(['You sleep. The investigation is over and the crime will run its course without you.', 'Press a key to wake up and hear the news.']); }, () => { const cr = game.crime; while (!cr.over) advance(1440); go(synopsisScene()); });
}

// ---------- SAVES & HALL OF FAME ----------
function writeSave() { try { localStorage.setItem('covert-action-save', JSON.stringify({ agent: game.agent, diff: game.diff, rank: game.rank, careerPoints: game.careerPoints, cases: game.cases, masterminds: ORGS.map(o => o.mastermindFree) })); } catch (e) {} }
function loadSave() { try { return JSON.parse(localStorage.getItem('covert-action-save')); } catch (e) { return null; } }
function restoreSave(s) { Object.assign(game, { agent: s.agent, diff: s.diff, rank: s.rank, careerPoints: s.careerPoints, cases: s.cases || [] }); (s.masterminds || []).forEach((f, i) => ORGS[i].mastermindFree = f); newCase(); game.city = 'WAS'; }
// the case in progress, autosaved so a killed tab can pick up where it left off.
// Links to ORGS entries and plan steps are stored as ids ({$org}, {$step}) and rebuilt on load.
const CASE_KEY = 'covert-action-case';
function caseRefs(k, v) { if (v && typeof v === 'object') { if (ORGS[v.id] === v) return { $org: v.id }; const i = game.crime.steps.indexOf(v); if (i >= 0 && this !== game.crime.steps) return { $step: i }; } return v; }
function writeCase() {
  const cr = game.crime; if (practiceMode || !cr || cr.practice || cr.reported || !game.agent || game.buildings !== cr.buildings) return;
  const snap = { v: 1, agent: game.agent, diff: game.diff, rank: game.rank, careerPoints: game.careerPoints, cases: game.cases, masterminds: ORGS.map(o => o.mastermindFree), seed,
    crime: cr, t: game.t, startDate: game.startDate.getTime(), caseStart: game.caseStart, region: game.region, city: game.city, clues: game.clues, messages: game.messages, news: game.news, taps: game.taps,
    activity: game.activity, inside: (game.inside || []).filter(x => x.doc), ciaVisited: game.ciaVisited, heatBy: game.heatBy, ciaBlocked: game.ciaBlocked, chronology: game.chronology, log: game.log };
  try { localStorage.setItem(CASE_KEY, JSON.stringify(snap, caseRefs)); } catch (e) {}
}
function clearCase() { try { localStorage.removeItem(CASE_KEY); } catch (e) {} }
function hasCase() { try { return !!localStorage.getItem(CASE_KEY); } catch (e) { return false; } }
function caseUnref(o, steps) {
  if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) o[i] = caseUnref(o[i], steps); return o; }
  if (!o || typeof o !== 'object') return o;
  if ('$org' in o) { if (!ORGS[o.$org]) throw new Error('bad org'); return ORGS[o.$org]; }
  if ('$step' in o) { if (!steps[o.$step]) throw new Error('bad step'); return steps[o.$step]; }
  for (const k in o) o[k] = caseUnref(o[k], steps); return o;
}
// restore the saved case into game; false (and the save discarded) if it will not load cleanly
function loadCase() {
  try {
    const s = JSON.parse(localStorage.getItem(CASE_KEY)); if (!s || s.v !== 1 || !s.crime || !s.crime.people || !s.crime.steps || !s.crime.buildings) throw new Error('no case');
    caseUnref(s, s.crime.steps); const cr = s.crime;
    if (!cr.people.every(p => p.org && ORGS[p.org.id] === p.org && cr.buildings[p.building]) || !cr.orgs.every(o => ORGS.includes(o)) || !cityById(s.city)) throw new Error('bad refs');
    Object.assign(game, { agent: s.agent, diff: s.diff, rank: s.rank, careerPoints: s.careerPoints, cases: s.cases || [], t: s.t, startDate: new Date(s.startDate), caseStart: s.caseStart, region: s.region, city: s.city,
      clues: s.clues || [], messages: s.messages || [], news: s.news || [], taps: s.taps || [], activity: s.activity || {}, ciaVisited: s.ciaVisited || {}, heatBy: s.heatBy || {}, ciaBlocked: s.ciaBlocked || {},
      chronology: s.chronology || [], log: s.log || [], crime: cr, buildings: cr.buildings, ciaFloor: 0 });
    (s.masterminds || []).forEach((f, i) => ORGS[i].mastermindFree = f);
    if (s.seed != null) seed = s.seed >>> 0; practiceMode = false;
    game.inside = (s.inside || []).map(x => x.doc === 'plan' ? masterPlan() : x.doc === 'personnel' && x.org ? personnelFile(x.org) : null).filter(Boolean);
    return true;
  } catch (e) { clearCase(); return false; }
}
function hallRead() { try { return JSON.parse(localStorage.getItem('covert-action-hall')) || []; } catch (e) { return []; } }
function hallAdd(e) { const h = hallRead(); h.push(e); h.sort((a, b) => b.score - a.score); try { localStorage.setItem('covert-action-hall', JSON.stringify(h.slice(0, 5))); } catch (x) {} }
function uiX_starF(cx, cy, r, c, hi) { const st = []; for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.42 : r, a = -Math.PI / 2 + i * Math.PI / 5; st.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } uiX_poly(st, c); if (hi) uiX_poly([st[9], st[0], st[1], [cx, cy]], hi); }
// an engraved plaque: gold for the champion, nickel for the rest, blank brass-look for empty slots
function uiX_plaque(x, y, w, h, kind) {
  blit(art('uiX_plaque' + [w, h, kind], w + 2, h + 2, () => {
    const Wd = w * 2, Hh = h * 2, M = kind === 'gold' ? uiX_BRASS : kind === 'nickel' ? uiX_STEEL.slice(3) : ['#6d6552', '#8e8570', '#aaa18a', '#c4bba3', '#d8d0b9', '#ece6d4', '#f8f4e8'];
    g.fillStyle = 'rgba(20,10,20,0.35)'; g.fillRect(3, 3, Wd, Hh); g.fillStyle = 'rgba(20,10,20,0.2)'; g.fillRect(5, 5, Wd, Hh);
    uiX_rr(0, 0, Wd, Hh, 4, M[1]);
    g.fillStyle = uiX_lg(0, 0, Wd * 0.3, Hh * 1.4, [M[5], M[4], M[3], M[3], M[2]]); g.beginPath(); g.moveTo(5, 1); g.arcTo(Wd - 1, 1, Wd - 1, Hh - 1, 3); g.arcTo(Wd - 1, Hh - 1, 1, Hh - 1, 3); g.arcTo(1, Hh - 1, 1, 1, 3); g.arcTo(1, 1, Wd - 1, 1, 3); g.fill();
    rect(4, 1, Wd - 8, 1, M[6]); rect(4, Hh - 2, Wd - 8, 1, M[1]);
    // bevelled inner rule
    rect(5, 5, Wd - 10, 1, M[2]); rect(5, 5, 1, Hh - 10, M[2]); rect(5, Hh - 6, Wd - 10, 1, M[5]); rect(Wd - 6, 5, 1, Hh - 10, M[5]);
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.moveTo(Wd * 0.18, 1); g.lineTo(Wd * 0.3, 1); g.lineTo(Wd * 0.22, Hh - 1); g.lineTo(Wd * 0.1, Hh - 1); g.fill();
    for (const sy of [10, Hh - 10]) { uiX_screwF(Wd - 14, sy, 3); }
  }), x, y);
}
function hallOfFame(back) {
  const h = hallRead();
  return pageScene(() => {
    folder(P.BL, 'Hall of Fame', true, false); textC('COVERT ACTION', 160, 20, uiX_I.k); textC('HALL OF FAME', 160, 28, uiX_I.k);
    fine(() => { rect(220, 74, 200, 2, uiX_BRASS[3]); rect(226, 78, 188, 1, uiX_BRASS[4]); for (const sx of [194, 446]) { uiX_starF(sx + 1, 57, 9, 'rgba(60,30,0,0.3)'); uiX_starF(sx, 56, 9, uiX_BRASS[3], uiX_BRASS[5]); } });
    for (let i = 0; i < 5; i++) {
      const y = 42 + i * 30, e = h[i], x = 10 + i, w = 298 - i, gold = e && i === 0;
      uiX_plaque(x, y, w, 28, gold ? 'gold' : e ? 'nickel' : 'blank');
      const ink = gold ? '#3b2208' : '#1e242e', ink2 = gold ? '#7a1a0c' : '#233f7a';
      if (e) { text((i + 1) + '. Max \'' + e.name.toUpperCase() + '\' Remington,  Case #' + e.cases + ' ' + e.date, 14 + i, y + 3, ink); text(e.crime, 14 + i, y + 11, ink2); text('EP: ' + e.ep + '   ---  SCORE: ' + e.score + ' ---', 14 + i, y + 19, ink); } else text('---', 16 + i, y + 10, '#8a816c');
    }
  }, back);
}

// ---------- ARRESTS & INTERROGATION ----------
function arrestResult(p, how) {
  const cr = game.crime;
  if (!p.known.role) { p.exists = true; learn(p, 'face'); learn(p, 'name'); writeCase(); return splitLayout({ header: [], text: p.name + ' was taken to local headquarters for questioning, but had to be released for lack of evidence. Without proof of a role in the crime, an arrest will not stick.', art: (x, y, w, h) => interrogationArt(x, y, w, h, p), back: () => go(cityScene()), items: [{ label: 'Continue', go: () => go(cityScene()) }] }); }
  p.status = 'arrested'; p.jailCity = game.city; p.shownCity = null; addHeat(game.city, 2); FACET_ORDER.forEach(f => learn(p, f));
  if (p.role === 'Mastermind') { p.org.mastermindFree = false; foilPlot(dayOf(game.t), true); }
  const told = [];
  const contacts = cr.steps.filter(s => s.to !== undefined && (s.from === p.id || s.to === p.id)).map(s => cr.people[s.from === p.id ? s.to : s.from]).filter(Boolean);
  for (const q of contacts) { if (isSuspect(q) && told.length < 3) { const c = clueAbout(q, 'Interrogation'); if (c) told.push(c.text); if (rnd() < 0.5 && !q.known.role) { const r = clueAbout(q, 'Interrogation', 'role'); if (r) told.push(r.text); } } }
  cr.steps.filter(s => s.from === p.id || s.to === p.id).forEach(s => s.known = true);
  writeCase();
  const body = p.name + ' (' + p.role + ', ' + p.org.name + ') is in custody. Under interrogation: ' + (told.length ? told.join(' ') : '"I know nothing." The suspect only confirms what you already knew.');
  return splitLayout({ header: [how === 'car' ? 'Arrested on the road!' : 'Arrested!'], text: body, art: (x, y, w, h) => interrogationArt(x, y, w, h, p), back: () => go(cityScene()), items: [{ label: 'Continue', go: () => go(cityScene()) }] });
}

// ---------- END OF CASE ----------
function checkCaseEnd() { if (game.crime && game.crime.over && !game.crime.reported) { game.crime.reported = true; go(synopsisScene()); return true; } return false; }
// an ID card for the case replay: cream stock, a role band, a barcode, a photo
function uiX_idCard(x, y, band, active) {
  fine(() => {
    const X = x * 2, Y = y * 2, Wd = 124, Hh = 76;
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(X + 3, Y + 3, Wd, Hh);
    uiX_rr(X, Y, Wd, Hh, 3, '#cfc5aa'); uiX_rr(X + 1, Y + 1, Wd - 2, Hh - 2, 3, '#f4eedd'); rect(X + 3, Y + 1, Wd - 6, 1, '#ffffff');
    g.fillStyle = active ? uiX_lg(0, Y, 0, Y + 16, ['#ffe08a', '#f2b23c']) : uiX_lg(0, Y, 0, Y + 16, band); g.fillRect(X + 2, Y + 2, Wd - 4, 15); rect(X + 2, Y + 17, Wd - 4, 1, 'rgba(0,0,0,0.25)');
  });
}
function synopsisScene() {
  const cr = game.crime; cr.reported = true; clearCase();
  const steps = cr.steps.slice().sort((a, b) => a.day - b.day);
  const cards = cr.people.slice(0, 10);
  let i = 0;
  const nm = q => q.name + ' (' + q.role + ') ' + q.org.short + '/' + cityById(q.city).name;
  return pageScene(t => {
    blit(uiX_synBg(), 0, 0);
    const blink = (t * 3 | 0) % 2;
    cards.forEach((p, k) => { const x = (k % 5) * 64, y = Math.floor(k / 5) * 40; const s = steps[i]; const active = s && (s.from === p.id || s.to === p.id);
      uiX_idCard(x + 1, y + 1, k % 2 ? ['#9cc6e8', '#6d9fcc'] : ['#a9dccf', '#6fb3a2'], active);
      text(fitText(p.role, 40), x + 3, y + 2, active ? '#7a1a0c' : '#1c2030');
      blit(art('uiX_bars' + p.id, 13, 11, () => { for (let b = 0; b < 26; b++) if (uiX_hash(b, p.id, 5) < 0.55) rect(b, 0, 1, b % 3 ? 20 : 22, '#1c2030'); }), x + 4, y + 13);
      if (isSuspect(p) || cr.over) { uiX_print(x + 33, y + 5, 28, 33); drawFace(p.face, x + 34, y + 6, 26, 31); }
      if (p.status === 'arrested') uiX_stamp('JAIL', x + 1, y + 23, P.RD, true);
      if (active && blink) fine(() => { const X = (x + 1) * 2, Y = (y + 1) * 2; g.strokeStyle = '#ff5a3c'; g.lineWidth = 2; g.strokeRect(X - 1, Y - 1, 126, 78); }); });
    uiX_screen(7, 89, 226, 62);
    uiX_reels(242, 88, t, i < steps.length);
    if (i < steps.length) {
      const s = steps[i], a = cr.people[s.from], b = s.to !== undefined ? cr.people[s.to] : null;
      textC(dayStr(dayToT(s.day)), 120, 91, '#9fb0c4');
      const l1 = nm(a), l2 = s.kind === 'item' ? 'obtained the ' + s.item : s.kind === 'meeting' ? 'met with' : 'sent message to';
      textC(fitText(l1, 220), 120, 100, uiX_T.hd); textC(l2, 120, 108, uiX_T.cyan); if (b) textC(fitText(nm(b), 220), 120, 116, uiX_T.hd);
      fine(() => rect(24, 253, 432, 1, 'rgba(160,190,230,0.3)')); if (s.blocked) textC('- stopped by your arrests -', 120, 130, uiX_T.amber); else if (s.kind !== 'item') textC('"' + fitText(['Proceed as planned.', 'The package is ready.', 'Wait for my signal.', 'Trust no one.'][(i * 7 + s.day) % 4], 200) + '"', 120, 130, uiX_T.amber);
    } else { textC(dayStr(dayToT(cr.endDay || s0())), 120, 91, '#9fb0c4'); para(cr.prevented ? 'The conspiracy falls apart. Mission completed.' : 'The ' + cr.kind.toLowerCase() + ' goes ahead: the plan to ' + cr.verb + ' has succeeded.', 12, 104, 216, uiX_T.hd, 8); }
    text('The Case of the ' + cr.object, 6, 160, uiX_T.hd); text((i + 1) + ' / ' + (steps.length + 1), 6, 170, uiX_T.cyan); textC('Press a key', 160, 188, '#8a94a2');
  }, () => { i++; if (i > steps.length) go(efficiencyScene()); });
  function s0() { return 0; }
}
function efficiencyScene() {
  const cr = game.crime, E = efficiency(); const pts = E.pts;
  let top = 0;
  if (!game.cases.find(c => c.t === game.caseStart)) {
    game.cases.push({ t: game.caseStart, object: cr.object, kind: cr.kind, prevented: cr.prevented, pts, arrests: cr.people.filter(p => p.status === 'arrested').length, mm: cr.people[cr.mastermind].status === 'arrested' });
    game.careerPoints += pts; game.rank = Math.min(RANKS.length - 1, Math.floor(game.careerPoints / 700));
    hallAdd({ name: game.agent.codename, cases: game.cases.length, date: MONTHS[game.startDate.getMonth()] + ' ' + game.startDate.getFullYear(), crime: cr.kind + '/' + cr.object, ep: E.got, score: game.careerPoints });
  }
  return pageScene(() => {
    folder(FOLDER.report, 'Efficiency Report', false);
    E.rows.forEach((r, k) => { const y = 14 + k * 9; if (y > 170) return; const x = 8 + (k % 3), good = r.ep >= r.max && r.max > 0, w = 304 - (k % 3);
      fine(() => { const X = x * 2, Y = y * 2, Wd = w * 2; g.fillStyle = 'rgba(40,20,0,0.3)'; g.fillRect(X + 2, Y + 2, Wd, 18); g.fillStyle = uiX_lg(X, 0, X + Wd, 0, ['#fdf9ec', '#f4ecd6']); g.fillRect(X, Y, Wd, 18); rect(X, Y, Wd, 1, '#ffffff'); rect(X, Y + 17, Wd, 1, '#d8caa8'); rect(X + 2, Y + 2, 5, 14, good ? '#3f9a44' : r.ep > 0 ? '#e0a92c' : '#c0392b'); rect(X + 2, Y + 2, 5, 1, 'rgba(255,255,255,0.5)'); });
      text(r.status, 16, y + 1, good ? uiX_I.gr : uiX_I.r); text(fitText(r.label, 110), 118, y + 1, r.crime ? uiX_I.r : uiX_I.k); textR('EP:' + r.ep + '/' + r.max, 306, y + 1, r.crime ? uiX_I.r : uiX_I.b); });
    const y = Math.min(178, 16 + E.rows.length * 9);
    fine(() => { const X = 16, Y = y * 2; uiX_paperF(X, Y, 608, 40); rect(X + 4, Y + 4, 600, 1, uiX_BRASS[3]); rect(X + 4, Y + 35, 600, 1, uiX_BRASS[3]); rect(X + 4, Y + 4, 1, 32, uiX_BRASS[3]); rect(X + 603, Y + 4, 1, 32, uiX_BRASS[3]); });
    text('Efficiency Rating', 118, y + 2, uiX_I.k); textR('EP:' + E.got + '/' + E.max, 306, y + 2, uiX_I.b); textC('--- ' + pts + ' ---', 160, y + 11, uiX_I.k);
  }, () => go(chiefTalk(pts > 600 && cr.prevented ? 'Outstanding work, Max. The President sends his personal thanks. Take some time off - you have earned it.' : cr.prevented ? 'Good work, Max. The crime was stopped, even if some of the gang slipped away. Take a few days off.' : 'That was a difficult case, Max. They got away with it this time. Get some rest - we will need you again soon.', () => go(vacationScene(pts, cr.prevented)))));
}
function vacationScene(pts, prevented) {
  const reward = pts < 250 || !prevented ? 0 : pts < 500 ? 1 : pts < 750 ? 2 : 3;
  return pageScene(t => { rewardArt(reward, 0, 0, W, H, t); popup([['Saturday night at the laundromat.', 'Another week hanging around the office.', 'The Agency sends you to the beach.', 'A casino in Monaco, and company to match.'][reward]], 60, 176, 200); }, () => go(careerScene()));
}
function careerScene() {
  const done = ORGS.filter(o => !o.mastermindFree).length;
  let s;
  s = menuScene({
    menu: Menu([{ label: 'Continue Game', go: () => go(chiefScene()) }, { label: 'Save Game', go: () => { writeSave(); toast('Game saved'); } }, { label: 'End Game', go: () => go(titleScene()) }], 118, 150, 100),
    draw() {
      folder(P.BL, 'Career');
      textC('The Career of Max \'' + game.agent.codename.toUpperCase() + '\' Remington', 160, 20, uiX_I.k); textC('Rank: ' + RANKS[game.rank], 160, 30, uiX_I.b);
      uiX_print(250, 42, 56, 68); drawAgent(game.agent.sex || 'm', 252, 44); uiX_corners(252, 44, 52, 64); uiX_clip(292, 36);
      uiX_ribbon(262, 114, game.rank);
      game.cases.slice(-6).forEach((c, i) => { const y = 42 + i * 14; text('Case #' + (game.cases.length - Math.min(6, game.cases.length) + i + 1) + '.  Arrests: ' + c.arrests + '  EP: ' + c.pts, 14, y, uiX_I.k); text((c.prevented ? '... stopped ' : "... couldn't stop ") + c.kind + '/' + c.object, 14, y + 7, uiX_I.l); });
      fine(() => rect(28, 256, 580, 1, uiX_I.l)); text('Arrested:  MasterMinds: ' + done + ' of 26', 14, 132, uiX_I.k);
      msgBox(104, 138, 124, 36); text('Do you want to...', 110, 141, uiX_T.hd); this.menu.draw();
    },
  });
  return s;
}

// ---------- UI art for the screens above (uiX_) ----------
// case replay backdrop: a dark blue baize board, lit from the top
function uiX_synBg() { return art('uiX_syn2', W, H, () => { g.fillStyle = uiX_rg(320, 120, 40, 460, ['#1f2d4a', '#152038', '#0c1426']); g.fillRect(0, 0, 640, 400); rect(0, 161, 640, 1, '#0a0f1c'); rect(0, 162, 640, 1, '#2f4166'); rect(0, 309, 640, 1, '#0a0f1c'); rect(0, 310, 640, 1, '#2f4166'); }); }
// a recessed monitor glass for the replay text
function uiX_screen(x, y, w, h) { blit(art('uiX_scr' + [w, h], w + 4, h + 4, () => { const S = uiX_STEEL; uiX_steelF(0, 0, w * 2 + 8, h * 2 + 8, 0); uiX_wellF(4, 4, w * 2, h * 2, ['#0d1628', '#0a1120', '#070c18']); }), x - 2, y - 2); }
// a reel-to-reel tape deck replaying the case
function uiX_reels(x, y, t, run) {
  blit(art('uiX_deck2', 74, 64, () => {
    const S = uiX_STEEL; g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(4, 4, 146, 126);
    uiX_steelF(0, 0, 146, 126, 0); uiX_band(4, 4, 138, 76, [S[3], S[2]], 2); uiX_bev(4, 4, 138, 76, S[1], S[6]);
    // head block and tape path
    rect(56, 86, 34, 16, S[1]); uiX_band(58, 88, 30, 12, [S[7], S[5], S[4]], 3); rect(66, 91, 14, 6, '#2a2d34');
    for (const gx of [42, 104]) { uiX_circ(gx, 94, 4, S[1]); uiX_circ(gx, 94, 3, S[7]); }
    // transport keys
    for (let i = 0; i < 5; i++) { const kx = 12 + i * 26; rect(kx + 1, 109, 22, 12, S[0]); uiX_band(kx, 108, 22, 11, [S[8], S[6], S[5]], 3); rect(kx, 118, 22, 1, S[2]); }
    uiX_poly([[20, 111], [26, 114], [20, 117]], '#2a2d34'); rect(46, 111, 2, 6, '#2a2d34'); rect(50, 111, 2, 6, '#2a2d34'); rect(72, 111, 6, 6, '#2a2d34'); uiX_circ(101, 114, 3, '#c0392b');
  }), x, y);
  const ang = run ? t * 2.6 : 0;
  fine(() => {
    for (const [cx, r, pack, dir] of [[(x + 20) * 2, 28, 22, 1], [(x + 52) * 2, 24, 13, 1.35]]) {
      const cy = (y + 22) * 2;
      uiX_circ(cx + 2, cy + 2, r, 'rgba(0,0,0,0.45)');
      uiX_circ(cx, cy, pack, '#4a2c1c'); uiX_circ(cx, cy, pack - 1, '#6b4128'); g.strokeStyle = 'rgba(255,220,180,0.12)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, pack - 4, 3.6, 4.6); g.stroke();
      // flange: a pale aluminium disc with three windows, turning
      g.save(); g.translate(cx, cy); g.rotate(ang * dir);
      g.fillStyle = 'rgba(200,210,220,0.5)'; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.arc(0, 0, 7, 0, Math.PI * 2, true); g.fill();
      for (let k = 0; k < 3; k++) { g.save(); g.rotate(k * 2.094); g.fillStyle = 'rgba(10,12,18,0.55)'; g.beginPath(); g.arc(0, 0, r - 4, -0.55, 0.55); g.arc(0, 0, 10, 0.4, -0.4, true); g.fill(); g.restore(); }
      g.strokeStyle = '#dfe5ea'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, r - 0.5, 0, Math.PI * 2); g.stroke();
      g.restore();
      uiX_circ(cx, cy, 7, '#adb8c1'); uiX_circ(cx, cy, 4, '#3a414c'); uiX_circ(cx - 1, cy - 1, 1.5, '#e9eef2');
    }
    g.strokeStyle = '#3b2416'; g.lineWidth = 1.2; g.beginPath(); g.moveTo((x + 20) * 2 - 22, (y + 22) * 2 + 9); g.lineTo((x + 21) * 2, (y + 47) * 2); g.lineTo((x + 52) * 2 + 2, (y + 47) * 2); g.lineTo((x + 52) * 2 + 13, (y + 22) * 2 + 5); g.stroke();
    uiX_ledF((x + 66) * 2, (y + 47) * 2, run && (t * 2 | 0) % 2, '#ff4a3a');
  });
}
// the firing range behind the practice menu: lanes running to a lit back wall, a target on its carrier
function uiX_rangeArt() {
  return art('uiX_range2', W, H, () => {
    const VX = 320, VY = 124, C = ['#121419', '#1a1d23', '#23272e', '#2e333b', '#3b414a', '#4c535d', '#626a75'];
    const toVP = (x, y, k) => [VX + (x - VX) * k, VY + (y - VY) * k];
    // far wall, lit by the target lamps
    const fw = [210, 70, 430, 170]; // x0 y0 x1 y1
    // ceiling, floor, side walls
    uiX_poly([[0, 0], [640, 0], [fw[2], fw[1]], [fw[0], fw[1]]], C[1]);
    uiX_poly([[0, 400], [640, 400], [fw[2], fw[3]], [fw[0], fw[3]]], C[3]);
    uiX_poly([[0, 0], [fw[0], fw[1]], [fw[0], fw[3]], [0, 400]], C[2]); uiX_poly([[640, 0], [fw[2], fw[1]], [fw[2], fw[3]], [640, 400]], C[1]);
    g.fillStyle = uiX_lg(0, fw[1], 0, fw[3], ['#3d3a36', '#5b544a', '#4a453e']); g.fillRect(fw[0], fw[1], fw[2] - fw[0], fw[3] - fw[1]);
    g.fillStyle = uiX_rg(320, 110, 5, 120, ['rgba(255,226,160,0.35)', 'rgba(255,210,140,0.08)', 'rgba(0,0,0,0)']); g.fillRect(fw[0], fw[1], fw[2] - fw[0], fw[3] - fw[1]);
    // floor: concrete gradient toward the viewer, lane lines and a yellow firing line
    g.fillStyle = uiX_lg(0, fw[3], 0, 400, ['#4a4a4c', '#34363b', '#25282e']); uiX_poly([[0, 400], [640, 400], [fw[2], fw[3]], [fw[0], fw[3]]], g.fillStyle);
    for (let i = -4; i <= 4; i++) { const bx = 320 + i * 200, tx = 320 + i * 27.5; g.strokeStyle = 'rgba(210,210,200,0.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(tx, fw[3]); g.lineTo(bx, 400); g.stroke(); }
    uiX_poly([[0, 330], [640, 330], [640, 336], [0, 336]], '#c9962a'); rect(0, 330, 640, 1, '#f0c55a');
    // acoustic panels down the side walls, receding
    for (const side of [-1, 1]) for (let k = 0; k < 7; k++) {
      const q0 = 1 - k * 0.13, q1 = 1 - (k + 1) * 0.13, ex = side < 0 ? 0 : 640, fx0 = VX + (ex - VX) * q0, fx1 = VX + (ex - VX) * q1;
      const yt0 = VY + (40 - VY) * q0, yt1 = VY + (40 - VY) * q1, yb0 = VY + (300 - VY) * q0, yb1 = VY + (300 - VY) * q1;
      uiX_poly([[fx0, yt0], [fx1, yt1], [fx1, yb1], [fx0, yb0]], k % 2 ? (side < 0 ? C[3] : C[1]) : (side < 0 ? C[4] : C[2]));
      rect(Math.min(fx0, fx1), yt1, 1, yb1 - yt1, C[0]);
    }
    // pools of lamp light on the floor down the middle lane
    for (let k = 0; k < 5; k++) { const q = 1 - k * 0.19, y = VY + (360 - VY) * q; g.fillStyle = uiX_rg(VX, y, 2, 120 * q, ['rgba(255,230,180,0.16)', 'rgba(0,0,0,0)']); g.beginPath(); g.ellipse(VX, y, 120 * q, 30 * q, 0, 0, Math.PI * 2); g.fill(); }
    // lane dividers: panels running from the booth to the far wall
    for (const s of [-1, 1]) for (let i = 1; i <= 3; i++) {
      const nx = 320 + s * (60 + i * 170), fx = 320 + s * (8 + i * 27.5), top = 40, bot = 330;
      const pts = [[nx, bot], [fx, fw[3]], [fx, fw[1] + 22], [nx, top]];
      uiX_poly(pts, uiX_lg(0, top, 0, bot, s < 0 ? ['#59616d', '#434a55', '#2c3139'] : ['#3a4049', '#2c3139', '#1d2126']));
      g.strokeStyle = s < 0 ? '#7d8794' : '#4a515b'; g.lineWidth = 2; g.beginPath(); g.moveTo(nx, top); g.lineTo(fx, fw[1] + 22); g.stroke();
      rect(nx - (s < 0 ? 4 : 0), top, 4, bot - top, s < 0 ? '#707a86' : '#3f4650');
      const py = 150 + i * 4, pw = 16 - i * 3; rect(nx + (s < 0 ? -pw - 6 : 6), py, pw, pw * 0.8, '#e8e2d0'); rect(nx + (s < 0 ? -pw - 6 : 6), py, pw, 1, '#ffffff');
    }
    // baffles on the ceiling and a row of lamps down the middle lane
    for (let k = 0; k < 6; k++) { const q = 1 - k * 0.16, y = VY + (0 - VY) * q, x0 = VX - 330 * q, x1 = VX + 330 * q; rect(x0, y + 8 * q, x1 - x0, Math.max(2, 7 * q), C[0]); rect(x0, y + 8 * q + Math.max(2, 7 * q), x1 - x0, 1, C[3]); }
    for (let k = 0; k < 5; k++) { const q = 1 - k * 0.19, y = VY + (18 - VY) * q, w = 70 * q; rect(VX - w / 2, y, w, Math.max(1, 5 * q), '#fff3cf'); g.fillStyle = uiX_rg(VX, y + 4 * q, 0, 90 * q, ['rgba(255,236,190,0.18)', 'rgba(0,0,0,0)']); g.fillRect(VX - 90 * q, y, 180 * q, 90 * q); }
    // distant targets on the back wall
    for (const tx of [240, 293, 347, 400]) { rect(tx - 7, 104, 14, 22, '#e9e2cf'); uiX_circ(tx, 110, 3, '#1b1d22'); rect(tx - 5, 113, 10, 11, '#1b1d22'); }
    // the carrier rail across the top
    rect(0, 14, 640, 6, C[0]); rect(0, 14, 640, 1, C[5]); for (let x = 8; x < 640; x += 40) { rect(x, 20, 2, 10, C[5]); }
    // the booth counter in the foreground
    uiX_band(0, 352, 640, 48, ['#6b4a30', '#5a3d27', '#472f1e'], 4); rect(0, 350, 640, 3, '#9a6e46'); rect(0, 350, 640, 1, '#c89a68');
    // a service revolver on the counter
    uiX_ell(118, 378, 44, 5, 'rgba(0,0,0,0.45)');
    uiX_poly([[80, 368], [140, 364], [146, 366], [146, 372], [104, 374], [96, 386], [84, 388], [86, 374], [78, 374]], '#15171c');
    rect(100, 364, 46, 3, '#5d6570'); rect(100, 364, 46, 1, '#c9d2dc'); uiX_ell(96, 369, 8, 5, '#2a2e36'); rect(90, 366, 12, 1, '#8a939e'); uiX_poly([[86, 376], [96, 375], [92, 386], [84, 388]], '#4a2f1e'); rect(86, 377, 6, 1, '#7a5236');
    // ear defenders and a box of rounds on the counter
    uiX_ell(560, 372, 18, 6, 'rgba(0,0,0,0.4)'); uiX_rr(540, 356, 14, 16, 5, '#2b2e35'); uiX_rr(566, 356, 14, 16, 5, '#2b2e35'); rect(543, 358, 4, 10, '#c0392b'); rect(569, 358, 4, 10, '#c0392b'); g.strokeStyle = '#2b2e35'; g.lineWidth = 3; g.beginPath(); g.arc(560, 360, 13, Math.PI, 0); g.stroke();
    uiX_cast(470, 360, 34, 18, 0.4, 2); rect(470, 360, 34, 18, '#b83a2a'); rect(470, 360, 34, 4, '#e0d4b8'); rect(470, 360, 34, 1, '#fff4dc'); rect(474, 367, 16, 2, '#f0e6cc');
    g.fillStyle = uiX_rg(320, 400, 20, 420, ['rgba(0,0,0,0)', 'rgba(5,6,10,0.45)']); g.fillRect(0, 0, 640, 400);
  });
}
function uiX_target(x, y, t) {
  const sway = Math.sin(t * 1.3) * 1.2;
  fine(() => { g.strokeStyle = uiX_STEEL[6]; g.lineWidth = 1; g.beginPath(); g.moveTo((x + 22) * 2, 30); g.lineTo((x + 22 + sway) * 2, y * 2 - 2); g.stroke(); rect((x + 17 + sway) * 2, y * 2 - 6, 20, 5, uiX_STEEL[5]); rect((x + 17 + sway) * 2, y * 2 - 6, 20, 1, uiX_STEEL[8]); });
  blit(art('uiX_tgt2', 44, 70, () => {
    const Wd = 88, Hh = 140;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(4, 4, Wd - 4, Hh - 4);
    g.fillStyle = uiX_lg(0, 0, Wd, Hh, ['#f6f0de', '#e9e0c8', '#d8cdb0']); g.fillRect(0, 0, Wd - 4, Hh - 4); rect(0, 0, Wd - 4, 1, '#ffffff');
    // the silhouette, head and shoulders
    const K = '#1d2027'; uiX_ell(42, 30, 13, 15, K); uiX_poly([[34, 42], [50, 42], [52, 50], [76, 58], [80, 70], [80, 136], [4, 136], [4, 70], [8, 58], [32, 50]], K);
    g.save(); g.beginPath(); g.rect(6, 52, 72, 84); g.clip();
    for (const [r, lw] of [[34, 1.6], [24, 1.6], [14, 1.6]]) { g.strokeStyle = '#e9e0c8'; g.lineWidth = lw; g.beginPath(); g.arc(42, 88, r, 0, Math.PI * 2); g.stroke(); }
    g.restore(); uiX_circ(42, 88, 5, '#c0392b'); uiX_circ(41, 87, 2, '#e8604e');

    // bullet holes: dark cores with a torn pale rim
    for (const [hx, hy] of [[40, 84], [50, 96], [44, 72], [26, 116], [60, 62], [42, 28]]) { uiX_circ(hx, hy, 2.2, '#f8f3e4'); uiX_circ(hx + 0.4, hy + 0.4, 1.5, '#070709'); }
    rect(38, 0, 8, 4, uiX_STEEL[4]); rect(38, 0, 8, 1, uiX_STEEL[8]);
  }), x + sway, y);
}
// the two side panels on the character screen: velvet drapes on a brass rod, a stage glow at the foot
function uiX_curtain(sex) {
  return art('uiX_curtain3' + sex, 56, 200, () => {
    // velvet: deep shadows in the folds, a soft sheen only on the crests; key light from the stage (inner) side
    const R = sex === 'm' ? ['#04061a', '#080d2c', '#0e1742', '#16215c', '#1f2e78', '#2c3f94', '#4459ae', '#6b82cc'] : ['#150306', '#27060b', '#3f0a12', '#5a0f18', '#781720', '#98232a', '#b8393a', '#dc6a5c'];
    const Wd = 112, Hh = 400, inner = sex === 'm' ? 1 : -1;
    for (let x = 0; x < Wd; x++) {
      for (let y = 0; y < Hh; y += 2) {
        const gather = 1 + y / Hh * 0.3, u = x / Wd, ph = u * Math.PI * 2 * 2.6 * gather + (sex === 'm' ? 0.4 : 2.1);
        let v = 0.5 + 0.34 * Math.sin(ph) + 0.16 * Math.sin(ph * 2.2 + 1.3) + 0.08 * Math.sin(ph * 4.1 + y / 90);
        v = Math.pow(clamp(v, 0, 1), 1.35) + (inner > 0 ? u : 1 - u) * 0.12;
        v -= Math.max(0, (70 - y) / 200) + Math.max(0, (y - 290) / 300);
        rect(x, y, 1, 2, R[clamp(Math.round(v * 7), 0, 7)]);
      }
    }
    // a scalloped valance hanging from the rod, with a gold fringe
    for (let k = 0; k < 4; k++) {
      const cx = 14 + k * 28;
      for (let j = 0; j < 14; j++) { const r = 16 - j * 0.2; g.fillStyle = R[clamp(6 - (j >> 1), 1, 6)]; g.beginPath(); g.ellipse(cx, 8 + j, r, 14 - j * 0.6, 0, 0, Math.PI); g.fill(); }
      g.strokeStyle = uiX_BRASS[4]; g.lineWidth = 1.5; g.beginPath(); g.ellipse(cx, 12, 15, 17, 0, 0.15, Math.PI - 0.15); g.stroke();
      for (let a = 0.25; a < Math.PI - 0.2; a += 0.22) { const fx = cx + Math.cos(a) * 15, fy = 12 + Math.sin(a) * 17; rect(fx, fy, 1, 4, uiX_BRASS[3]); }
    }
    uiX_band(0, 0, Wd, 9, [uiX_BRASS[6], uiX_BRASS[4], uiX_BRASS[2], uiX_BRASS[1]], 5);
    for (const fx of [3, Wd - 7]) { uiX_circ(fx + 2, 4.5, 5, uiX_BRASS[2]); uiX_circ(fx + 1, 3.5, 3, uiX_BRASS[5]); }
    // the stage floor falls into darkness; a thin gilt edge on each side
    g.fillStyle = uiX_lg(0, 320, 0, 400, ['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']); g.fillRect(0, 320, Wd, 80);
    rect(0, 0, 1, Hh, uiX_BRASS[3]); rect(Wd - 1, 0, 1, Hh, uiX_BRASS[2]);
  });
}
// the agent's desk behind the pause menu
function uiX_deskArt() {
  return art('uiX_desk2', W, H, () => {
    uiX_woodF(0, 0, 640, 400, 7);
    // a closed case folder with a SECRET stamp
    const F = uiX_FOLD[P.YE];
    uiX_cast(32, 212, 168, 128, 0.45, 5); uiX_poly([[118, 212], [124, 202], [186, 202], [192, 212]], F[3]); rect(124, 202, 62, 1, F[5]);
    g.fillStyle = uiX_lg(32, 212, 200, 340, [F[5], F[4], F[3]]); g.fillRect(32, 212, 168, 128); rect(32, 212, 168, 1, '#fff3c8'); rect(32, 212, 1, 128, F[5]); rect(199, 212, 1, 128, F[1]); rect(32, 339, 168, 1, F[1]);
    rect(34, 216, 164, 1, F[2]);
    g.save(); g.globalCompositeOperation = 'multiply'; const ink = '#b3322a'; g.fillStyle = ink; g.fillRect(58, 256, 120, 3); g.fillRect(58, 283, 120, 3); g.fillRect(58, 256, 3, 30); g.fillRect(175, 256, 3, 30); g.fillRect(63, 261, 110, 1); g.fillRect(63, 280, 110, 1); g.fillRect(63, 261, 1, 20); g.fillRect(172, 261, 1, 20); g.save(); g.scale(2, 2); text('SECRET', 42, 135, ink); g.restore(); g.restore();
    rect(40, 205, 150, 7, '#f4eedb'); rect(40, 205, 150, 1, '#ffffff'); rect(196, 214, 3, 124, 'rgba(0,0,0,0.12)');
    // passport: navy leather, gilt crest
    uiX_cast(424, 260, 80, 104, 0.45, 5); uiX_rr(424, 260, 80, 104, 4, '#15214a'); g.fillStyle = uiX_lg(424, 260, 504, 364, ['#2e4485', '#1d2d63', '#15214a']); g.fillRect(426, 262, 76, 100); rect(426, 262, 76, 1, '#5a73b8'); rect(500, 262, 2, 100, '#0d1533');
    g.strokeStyle = uiX_BRASS[4]; g.lineWidth = 1.5; g.beginPath(); g.arc(464, 300, 15, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(449, 300); g.lineTo(479, 300); g.moveTo(464, 285); g.lineTo(464, 315); g.stroke();
    g.beginPath(); g.ellipse(464, 300, 7, 15, 0, 0, Math.PI * 2); g.stroke(); rect(444, 330, 40, 2, uiX_BRASS[4]); rect(450, 338, 28, 2, uiX_BRASS[3]);
    // aviator sunglasses from above
    g.save(); g.translate(96, 88); g.rotate(-0.12);
    for (const s of [-1, 1]) { uiX_ell(s * 22 + 2, 4, 17, 13, 'rgba(0,0,0,0.35)'); uiX_ell(s * 22, 0, 17, 13, '#c8a24a'); uiX_ell(s * 22, 0, 15, 11, '#1a2a2a'); g.fillStyle = uiX_lg(s * 22 - 12, -10, s * 22 + 8, 10, ['#5a8a86', '#1d3635', '#0e1a1a']); g.beginPath(); g.ellipse(s * 22, 0, 14, 10, 0, 0, Math.PI * 2); g.fill(); uiX_ell(s * 22 - 6, -4, 4, 2, 'rgba(255,255,255,0.35)'); }
    rect(-6, -8, 12, 2, '#c8a24a'); g.strokeStyle = '#a8842e'; g.lineWidth = 2; g.beginPath(); g.moveTo(-39, -4); g.lineTo(-70, -26); g.moveTo(39, -4); g.lineTo(70, -26); g.stroke();
    g.restore();
    // fountain pen
    g.save(); g.translate(560, 150); g.rotate(0.55); uiX_rr(-62 + 3, -5 + 4, 124, 10, 5, 'rgba(0,0,0,0.4)'); uiX_rr(-62, -5, 108, 10, 5, '#10131c'); rect(-58, -4, 100, 2, '#3c4458'); uiX_poly([[46, -5], [62, 0], [46, 5]], uiX_BRASS[4]); rect(46, -5, 2, 10, uiX_BRASS[2]); rect(-30, -6, 3, 12, uiX_BRASS[4]); rect(-30, -6, 40, 2, uiX_BRASS[5]); g.restore();
    // coffee on its saucer, seen from above
    uiX_circ(538, 60, 32, 'rgba(0,0,0,0.35)'); uiX_circ(532, 54, 31, '#e8e3d8'); uiX_circ(532, 54, 29, '#f6f2ea'); uiX_circ(532, 54, 22, '#d9d2c4');
    uiX_rr(556, 44, 16, 12, 5, '#e8e3d8'); rect(560, 48, 8, 4, '#b8af9e');
    uiX_circ(532, 54, 21, '#faf8f2'); uiX_circ(532, 54, 17, '#b8af9e'); uiX_circ(532, 54, 16, '#3a1f10'); uiX_circ(530, 52, 12, '#4d2a16'); uiX_ell(524, 47, 5, 2.5, 'rgba(255,230,200,0.35)');
    // the lamp's warm pool across the middle
    g.fillStyle = uiX_rg(330, 180, 20, 260, ['rgba(255,200,120,0.12)', 'rgba(0,0,0,0)']); g.fillRect(0, 0, 640, 400);
  });
}
function uiX_deskLive(t) { // steam curling off the coffee
  fine(() => { for (let i = 0; i < 4; i++) { const k = ((t * 0.45 + i / 4) % 1), sy = 44 - k * 44, sx = 528 + Math.sin(k * 5 + i * 1.7) * 6; g.fillStyle = 'rgba(255,255,255,' + (0.28 * (1 - k)).toFixed(3) + ')'; g.beginPath(); g.ellipse(sx, sy, 3 + k * 5, 2 + k * 2, 0, 0, Math.PI * 2); g.fill(); } });
}
// rank ribbon: one bar per rank step, green to gold, on a brass pin
function uiX_ribbon(x, y, rank) {
  const cols = ['#2f7a3a', '#5aa84a', '#2a8a8a', '#4a7ad0', '#2a3f8f', '#d05a4a', '#9a1f24', '#e0b040'];
  fine(() => {
    const X = x * 2, Y = y * 2; g.fillStyle = 'rgba(40,20,0,0.35)'; g.fillRect(X + 3, Y + 3, 68, 18); rect(X - 1, Y - 1, 70, 20, uiX_BRASS[1]); uiX_band(X, Y, 68, 18, [uiX_BRASS[5], uiX_BRASS[3]], 2);
    for (let i = 0; i < 8; i++) { const c = i <= rank ? cols[i] : '#8f8a80'; g.fillStyle = uiX_lg(0, Y + 2, 0, Y + 16, [mix(c, '#ffffff', 0.35), c, mix(c, '#000000', 0.35)]); g.fillRect(X + 2 + i * 8, Y + 2, 8, 14); rect(X + 2 + i * 8, Y + 2, 1, 14, 'rgba(255,255,255,0.25)'); }
  });
}
