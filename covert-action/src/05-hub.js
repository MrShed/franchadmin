// ===================================================================
// HUB: every menu-driven screen, laid out after the 1990 EGA original
// ===================================================================

// ---------- UI ART KIT (uiX_): card stock, paper, rubber stamps, clips, bezels, icons ----------
const uiX_PAL = { K: P.K, b: P.BL, g: P.GR, c: P.TL, r: P.RD, m: P.MG, n: P.BR, l: P.G3, d: P.G1, B: P.BL2, G: P.GR2, C: P.CY, R: P.RD2, M: P.PK, Y: P.YE, W: P.W };
function uiX_rows(rows, x, y, only) { rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = r[i] === '.' ? null : only || uiX_PAL[r[i]]; if (c) px(x + i, y + j, c); } }); }
function uiX_spr(key, rows, only) { return sprite('uiX_' + key + (only || ''), Math.max(...rows.map(r => r.length)), rows.length, () => uiX_rows(rows, 0, 0, only)); }
function uiX_hash(x, y, s = 0) { let n = Math.imul(x + 101 * s, 374761393) + Math.imul(y + 57 * s, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
// sparse ordered dither of one colour over whatever is already there
function uiX_speck(x, y, w, h, c, level) { g.fillStyle = c; for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (BAYER[((y + yy) & 3) * 4 + ((x + xx) & 3)] < level) g.fillRect(x + xx, y + yy, 1, 1); }
function uiX_fibres(x, y, w, h, c, p, s = 1) { g.fillStyle = c; for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (uiX_hash(x + xx, y + yy, s) < p) g.fillRect(x + xx, y + yy, 1, 1); }
const uiX_DARK = { [P.YE]: P.BR, [P.BL2]: P.BL, [P.G3]: P.G1, [P.RD2]: P.RD, [P.GR]: P.K, [P.TL]: P.BL, [P.BL]: P.K, [P.GR2]: P.GR, [P.CY]: P.TL, [P.W]: P.G3, [P.BR]: P.K, [P.RD]: P.K, [P.PK]: P.MG, [P.MG]: P.K, [P.G1]: P.K };
const uiX_LITE = { [P.YE]: P.W, [P.BL2]: P.CY, [P.G3]: P.W, [P.RD2]: P.PK, [P.GR]: P.GR2, [P.TL]: P.CY, [P.BL]: P.BL2, [P.GR2]: P.W, [P.CY]: P.W, [P.W]: P.W, [P.BR]: P.YE, [P.RD]: P.RD2, [P.PK]: P.W, [P.MG]: P.PK, [P.G1]: P.G3 };
// walnut desk top: brown with wandering dark grain and the odd warm highlight
function uiX_wood(x, y, w, h) {
  rect(x, y, w, h, P.BR);
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const X = x + xx, Y = y + yy, n = vnoise(X / 48, Y / 5) * 3 + vnoise(X / 9, Y / 2.2) * 0.35 + Y / 7.5, f = n - Math.floor(n), b = BAYER[(Y & 3) * 4 + (X & 3)];
    if (f < 0.08 || (f < 0.16 && b < 4)) px(X, Y, P.K); else if (f > 0.55 && f < 0.6 && b < 2) px(X, Y, P.YE);
  }
}
// raised plate and sunken well, 1-px bevels
function uiX_raised(x, y, w, h, face, hi = P.W, lo = P.K) { rect(x, y, w, h, face); rect(x, y, w, 1, hi); rect(x, y, 1, h, hi); rect(x, y + h - 1, w, 1, lo); rect(x + w - 1, y, 1, h, lo); }
function uiX_well(x, y, w, h, face = P.K) { rect(x - 1, y - 1, w + 2, h + 2, P.K); rect(x - 1, y + h, w + 2, 1, P.G3); rect(x + w, y - 1, 1, h + 2, P.G3); rect(x, y, w, h, face); }
const uiX_SCREW = ['.dld.', 'dlWld', 'lKKKl', 'dllld', '.ddd.'];
function uiX_screw(x, y) { g.drawImage(uiX_spr('screw', uiX_SCREW), x, y); }
// the rubber stamp: double frame, worn ink, and a staircase tilt like a stamp pressed on crooked
function uiX_stampSpr(txt, col) {
  const tw = textW(txt), w = tw + 14, h = 17, sh = 0;
  return sprite('uiX_stamp' + txt + col, w, h + sh, () => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    drawTo(c.getContext('2d'), () => {
      frame(0, 0, w, h, col); frame(1, 1, w - 2, h - 2, col); frame(3, 3, w - 6, h - 6, col);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (uiX_hash(x, y, 7) < 0.12) g.clearRect(x, y, 1, 1);
      text(txt, 7, 5, col);
    });
    g.drawImage(c, 0, 0);
  });
}
function uiX_stamp(txt, x, y, col = P.RD, solid) { if (solid) rect(x + 1, y + 1, uiX_stampW(txt) - 2, 15, P.W); g.drawImage(uiX_stampSpr(txt, col), x | 0, y | 0); }
function uiX_stampW(txt) { return textW(txt) + 14; }
// wire paper clip, 7x16, with its shadow on the paper
const uiX_CLIP = ['..WWl..', '.W...l.', 'W..W..l', 'W.W.l.l', 'W.W.l.l', 'W.W.l.l', 'W.W.l.l', 'W.W.l.l', 'W.W.l.l', 'W.W.l.l', 'W.W...l', 'W.W...l', 'W.W...l', 'W..l..l', '.l...d.', '..ldd..'];
function uiX_clip(x, y) { g.drawImage(uiX_spr('clip', uiX_CLIP, P.G3), x + 1, y + 1); g.drawImage(uiX_spr('clipS', uiX_CLIP.map(r => r.replace(/[^.]/g, 'd'))), x + 1, y + 1); g.drawImage(uiX_spr('clip', uiX_CLIP), x, y); }
// black photo-album corners over the four corners of a picture
function uiX_corners(x, y, w, h, c = P.K) { for (let i = 0; i < 4; i++) { rect(x - 1, y - 1 + i, 5 - i, 1, c); rect(x + w - 4 + i, y - 1 + i, 5 - i, 1, c); rect(x - 1, y + h - i, 5 - i, 1, c); rect(x + w - 4 + i, y + h - i, 5 - i, 1, c); } }
// a mounted photo print: white border, soft shadow, corners
function uiX_print(x, y, w, h) { rect(x + 2, y + 2, w, h, P.G1); rect(x, y, w, h, P.W); frame(x, y, w, h, P.G3); }
// yellow highlighter stroke with ragged ends
function uiX_marker(x, y, w, h) { rect(x + 2, y, w - 4, h, P.YE); for (let j = 0; j < h; j++) { if (uiX_hash(x, y + j, 3) < 0.7) px(x + 1, y + j, P.YE); if (uiX_hash(x, y + j, 4) < 0.35) px(x, y + j, P.YE); if (uiX_hash(x + w, y + j, 5) < 0.7) px(x + w - 2, y + j, P.YE); if (uiX_hash(x + w, y + j, 6) < 0.35) px(x + w - 1, y + j, P.YE); } }
// a lamp: lit = glowing yellow, unlit = dull
function uiX_lamp(x, y, on, c = P.YE) { rect(x, y, 3, 3, on ? c : P.G1); px(x, y, on ? P.W : P.G3); }

// ---------- the menu idiom: white header, light gray options, yellow bar, white flash ----------
function uiX_bar(x, y, w, h, flash) {
  rect(x, y, w, h, flash ? P.W : P.YE); rect(x, y + h - 1, w, 1, flash ? P.G3 : P.BR); rect(x + 1, y, w - 2, 1, P.W);
  g.drawImage(uiX_spr('ptr', ['K...', 'KK..', 'KBK.', 'KBBK', 'KBK.', 'KK..', 'K...']), x + 2, y + 1);
}
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
        if (on && this.cyan) text('▶', this.x - 7, iy, this.flash ? P.W : P.CY);
        text(it.label, this.x, iy, it.off ? P.G1 : on ? (this.cyan ? (this.flash ? P.W : P.CY) : P.BL) : P.G3);
        if (it.right) textR(it.right, this.x + this.w - 12, iy, on && !this.cyan ? P.RD : P.CY);
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
// popup box: black, a light gray rule with a lit top-left edge and a dark inner line, rivets in the corners
function msgBox(x, y, w, h) {
  x |= 0; y |= 0; w |= 0; h |= 0;
  rect(x + 2, y + h, w - 1, 1, P.K); rect(x + w, y + 2, 1, h - 1, P.K);
  rect(x, y, w, h, P.K); frame(x, y, w, h, P.G3); rect(x, y, w - 1, 1, P.W); rect(x, y, 1, h - 1, P.W);
  frame(x + 1, y + 1, w - 2, h - 2, P.G1);
  px(x + 1, y + 1, P.G3); px(x + w - 2, y + 1, P.G3); px(x + 1, y + h - 2, P.G3); px(x + w - 2, y + h - 2, P.G3);
}
function popup(lines, x = 40, y = 60, w = 240) { const ls = lines.flatMap(l => wrap(l, w - 16)); msgBox(x, y, w, ls.length * 8 + 12); ls.forEach((l, i) => text(l, x + 8, y + 6 + i * 8, P.W)); }
// the location/time status box, 164x26: a brushed-steel plate with two LCD wells
function uiX_statusPlate() {
  return sprite('uiX_status', 164, 26, () => {
    rect(0, 0, 164, 26, P.G1);
    for (let y = 1; y < 25; y++) { let run = 0; for (let x = 1; x < 163; x++) { if (run <= 0 && uiX_hash(x, y, 11) < 0.05) run = 3 + (uiX_hash(x, y, 12) * 9 | 0); if (run-- > 0 && (x + y) % 2 === 0) px(x, y, P.G3); } }
    rect(0, 0, 164, 1, P.W); rect(0, 0, 1, 26, P.G3); rect(1, 1, 162, 1, P.G3); rect(0, 25, 164, 1, P.K); rect(163, 0, 1, 26, P.K); rect(1, 24, 162, 1, P.K);
    uiX_well(4, 2, 156, 10); uiX_well(15, 14, 134, 9);
    uiX_screw(4, 15); uiX_screw(153, 15);
    for (const x of [10, 12]) { rect(x, 16, 1, 5, P.K); px(x + 1, 16, P.G3); }
  });
}
function statusBox(y, cityName) {
  cityName = cityName || (cityById(game.city).name + (game.city === 'WAS' ? ', D.C.' : ''));
  g.drawImage(uiX_statusPlate(), 0, y);
  textC(cityName, 82, y + 3, P.GR2);
  textC(clockStr(), 82, y + 15, P.GR2);
  const on = (performance.now() / 700 | 0) % 2; px(158, y + 17, on ? P.GR2 : P.GR); px(158, y + 18, P.GR);
}
// a museum-style picture frame and a little brass caption plate
function uiX_picFrame(x, y, w, h) { // (x,y,w,h) = the picture itself
  uiX_raised(x - 4, y - 4, w + 8, h + 8, P.G3, P.W, P.G1); uiX_speck(x - 3, y - 3, w + 6, h + 6, P.W, 2);
  rect(x - 4, y + h + 4, w + 8, 1, P.K); rect(x + w + 4, y - 4, 1, h + 9, P.K);
  rect(x - 2, y - 2, w + 4, h + 4, P.G1); rect(x - 1, y - 1, w + 2, h + 2, P.K);
  for (const [a, b] of [[x - 3, y - 3], [x + w + 2, y - 3], [x - 3, y + h + 2], [x + w + 2, y + h + 2]]) px(a, b, P.W);
}
function uiX_plate(cx, y, s, col = P.W) {
  const w = textW(s) + 12, x = Math.round(cx - w / 2);
  uiX_raised(x, y, w, 11, P.BR, P.YE, P.K); rect(x + 1, y + 10, w - 1, 1, P.K); px(x + 2, y + 5, P.YE); px(x + w - 3, y + 5, P.YE);
  textC(s, cx, y + 2, col, P.K);
}
// city menu: black screen, menu top-left, framed city picture bottom-right, status box bottom-left
function cityLayout({ header, items, pic, caption, back }) {
  const s = menuScene({ menu: Menu(items, 27, 14 + header.length * 8, 128), back,
    draw() { rect(0, 0, W, H, P.K); uiX_miniMap(184, 12, 122, 72, this.t);
      header.forEach((l, i) => text(l, 21, 14 + i * 8, P.W)); this.menu.draw();
      if (pic) { uiX_picFrame(175, 116, 130, 48); uiX_plate(240, 102, caption); g.save(); g.beginPath(); g.rect(175, 116, 130, 48); g.clip(); pic(175, 116, 130, 48, this.t); g.restore(); }
      statusBox(174); } });
  return s;
}
// the city screen's "you are here" monitor: the travel map around this city, a sweeping locator
function uiX_miniMap(x, y, w, h, t) {
  const here = cityById(game.city), region = here.hq ? 'americas' : here.region || game.region;
  const V = TRAVEL_VIEW[region] || TRAVEL_VIEW.europe, span = region === 'americas' ? 0.42 : 0.62;
  const lw = (V.lon[1] - V.lon[0]) * span, lh = lw * h / w * 0.78;
  const lon0 = clamp(here.lon - lw / 2, V.lon[0] - 40, V.lon[1] + 40 - lw), lat1 = here.lat + lh / 2;
  const key = 'uiX_mini' + game.city + w + 'x' + h;
  const c = sprite(key, w, h, () => uiX_mapRender(w, h, (lon, lat) => [(lon - lon0) / lw * w, (lat1 - lat) / lh * h], true));
  // bezel
  uiX_raised(x - 5, y - 5, w + 10, h + 17, P.G1, P.G3, P.K); uiX_well(x, y, w, h);
  g.drawImage(c, x, y);
  const proj = (lon, lat) => [x + (lon - lon0) / lw * w, y + (lat1 - lat) / lh * h];
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (const ct of CITIES) { if (ct === here) continue; const [cx, cy] = proj(ct.lon, ct.lat); if (cx > x && cx < x + w && cy > y && cy < y + h) { rect(cx - 1, cy - 1, 3, 3, P.K); px(cx, cy, P.G3); } }
  const [hx, hy] = proj(here.lon, here.lat), on = (t * 3 | 0) % 2;
  for (let i = x; i < x + w; i += 2) px(i, hy, P.GR); for (let j = y; j < y + h; j += 2) px(hx, j, P.GR);
  const r = 3 + ((t * 8) | 0) % 6; frame(hx - r, hy - r, r * 2 + 1, r * 2 + 1, P.GR2);
  rect(hx - 1, hy - 1, 3, 3, P.K); px(hx, hy, on ? P.YE : P.W);
  g.restore();
  // lamps and a grille on the bezel's chin
  uiX_lamp(x + 1, y + h + 5, on, P.GR2); uiX_lamp(x + 6, y + h + 5, 1, P.RD2);
  for (let i = 0; i < 6; i++) rect(x + w - 30 + i * 5, y + h + 5, 3, 3, P.K);
  const lab = here.name.toUpperCase(); text(fitText(lab, w - 60), x + 14, y + h + 3, P.G3, P.K);
}
// split screen: text and menu on the black left half, a painted scene on the right, status box bottom-left
function uiX_floorBar(floor) {
  uiX_raised(170, 0, 150, 11, P.G1, P.G3, P.K); uiX_speck(171, 1, 148, 9, P.K, 2);
  ['L', '1', '2', '3'].forEach((c, i) => { const x = 181 + i * 36, on = i === floor; rect(x, 1, 15, 9, P.K); if (on) { rect(x + 1, 2, 13, 7, P.BR); rect(x + 1, 2, 13, 1, P.RD2); } text(c, 186 + i * 36, 2, on ? P.YE : P.GR, on ? P.K : null); });
}
function splitLayout({ header, items, art, back, floor, text: body }) {
  return menuScene({ menu: items ? Menu(items, 23, 20 + header.length * 8 + (body ? wrap(body, 140).length * 8 + 4 : 0), 136) : null, back,
    draw() { rect(0, 0, W, H, P.K); g.save(); g.beginPath(); g.rect(170, 0, 150, 200); g.clip(); art(170, 0, 150, 200, this.t); g.restore();
      rect(168, 0, 1, 200, P.G1);
      if (floor !== undefined) uiX_floorBar(floor);
      header.forEach((l, i) => text(l, 15, 20 + i * 8, P.W)); if (body) para(body, 15, 20 + header.length * 8 + 2, 140, P.W, 8);
      this.menu && this.menu.draw(); statusBox(174); } });
}
// full-screen picture with a boxed menu over it
function boxLayout({ header, items, art, back, box = [16, 40, 122] }) {
  const [bx, by, bw] = box;
  return menuScene({ menu: Menu(items, bx + 14, by + 6 + header.length * 8, bw - 12), back,
    draw() { art(0, 0, W, H, this.t); msgBox(bx, by, bw, header.length * 8 + items.length * 8 + 12); header.forEach((l, i) => text(l, bx + 6, by + 5 + i * 8, P.W)); this.menu.draw(); } });
}

// ---------- file folders on a walnut desk ----------
const FOLDER = { clue: P.YE, newclue: P.BL2, docs: P.G3, news: P.YE, org: P.RD2, city: P.GR, suspect: P.TL, career: P.BL, report: P.YE };
function uiX_folderArt(col, tab, sheet) {
  const dk = uiX_DARK[col] || P.K, lt = uiX_LITE[col] || P.W;
  uiX_wood(0, 0, W, H);
  // the next file in the drawer, its tab peeking out behind this one
  const bc = col === P.G3 ? P.YE : P.G3, bd = uiX_DARK[bc];
  g.fillStyle = bc; g.beginPath(); g.moveTo(22, 12); g.lineTo(28, 3); g.lineTo(104, 3); g.lineTo(110, 12); g.fill();
  line(22, 11, 28, 3, P.K); rect(28, 3, 76, 1, P.K); line(104, 3, 110, 11, P.K); rect(29, 4, 75, 1, uiX_LITE[bc]); uiX_fibres(26, 5, 80, 6, bd, 0.05, 2);
  rect(40, 5, 44, 6, P.W); rect(41, 10, 44, 1, bd); rect(43, 7, 22, 1, P.G1); rect(67, 7, 14, 1, P.G1);
  // the folder: card stock with fibres, a lit top edge, a dark outline
  rect(1, 11, 318, 189, col); uiX_fibres(1, 11, 318, 189, dk, 0.035);
  g.fillStyle = col; g.beginPath(); g.moveTo(150, 12); g.lineTo(160, 1); g.lineTo(315, 1); g.lineTo(318, 4); g.lineTo(318, 12); g.fill(); uiX_fibres(152, 2, 166, 10, dk, 0.035);
  line(150, 11, 160, 1, P.K); rect(160, 0, 155, 1, P.K); px(315, 1, P.K); px(316, 2, P.K); px(317, 3, P.K); rect(318, 4, 1, 196, P.K);
  rect(161, 1, 154, 1, lt); line(151, 11, 160, 2, lt);
  rect(0, 11, 1, 189, P.K); rect(1, 11, 150, 1, P.K); rect(1, 12, 149, 1, lt); rect(1, 12, 1, 188, lt); rect(317, 5, 1, 195, dk);
  // typed label on a white sticker
  const tw = textW(tab) + 8, lx = 318 - 18 - tw;
  rect(lx + 1, 3, tw, 9, dk); rect(lx, 2, tw, 9, P.W); rect(lx, 9, tw, 1, P.RD2); text(tab, 318 - 14 - tw, 3, P.K);
  if (sheet) {
    // a second page under the first, then the page itself with a soft shadow and aged edges
    rect(12, 13, 303, 187, P.G1); rect(11, 13, 302, 187, P.W); rect(11, 13, 302, 1, P.G3); rect(312, 13, 1, 187, P.G3);
    uiX_speck(313, 18, 3, 182, dk, 8); rect(313, 18, 1, 182, dk);
    rect(6, 16, 307, 184, P.W); rect(6, 16, 307, 1, P.G3); rect(6, 16, 1, 184, P.G3); rect(312, 16, 1, 184, P.G1);
    uiX_fibres(7, 17, 305, 2, P.G3, 0.12, 3); uiX_fibres(7, 17, 2, 183, P.G3, 0.12, 4); uiX_fibres(309, 17, 3, 183, P.G3, 0.12, 5);
    for (const hy of [60, 140]) { rect(8, hy, 3, 3, P.G3); px(8, hy, P.W); px(10, hy + 2, P.W); px(9, hy + 1, P.G1); }
  }
}
function folder(col, tab, sheet = true, stamp) {
  g.drawImage(sprite('uiX_fold' + col + '|' + tab + '|' + sheet, W, H, () => uiX_folderArt(col, tab, sheet)), 0, 0);
  if (stamp === undefined) stamp = sheet ? 'CONFIDENTIAL' : false;
  if (stamp) uiX_stamp(stamp, 306 - uiX_stampW(stamp), 180);
}
// ruled index paper: a red margin and pale blue lines under every typed row
function uiX_ruled(y0, n, x0 = 12, x1 = 309) {
  g.drawImage(sprite('uiX_ruled' + y0 + '|' + n, W, H, () => {
    rect(11, 17, 1, 183, P.RD2);
    g.fillStyle = P.CY; for (let i = 0; i < n; i++) { const y = y0 + i * 8 + 7; for (let x = x0 + 1; x < x1; x += 2) g.fillRect(x, y, 1, 1); }
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
      if (!rows.length) text(opts.empty || '...none', 14, 22, P.G1);
      rows.slice(top, top + vis).forEach((r, i) => { const y = 22 + i * 8, on = top + i === sel; if (on && rows.some(q => q.open)) uiX_marker(10, y - 1, 298, 9); text(fitText(r.label, 230), 14, y, r.col || P.K); if (r.right) textR(fitText(r.right, 70), 304, y, r.rcol || P.BL); });
      if (rows.length > vis) { const s = (top + 1) + '-' + Math.min(rows.length, top + vis) + ' of ' + rows.length; rect(300 - textW(s), 188, textW(s) + 8, 11, P.W); textR(s, 304, 190, P.G1); }
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
      if (menuOpen) { msgBox(65, 58, 170, 58); text('Do you want to...', 71, 62, P.W); this.menu.draw(); }
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
    draw() { g.drawImage(uiX_rangeArt(), 0, 0); uiX_target(34, 44, this.t); msgBox(102, 72, 152, s.step ? 80 : 54); text(s.step ? 'Practice which skill?' : 'Which difficulty level?', 110, 78, P.W); this.menu.draw(); } });
  return s;
}
function helpScene(back) {
  const pages = [
    ['THE JOB', 'You are Max Remington, the only freelance secret agent in the western world. Each case is a crime being planned by 6 to 10 people from several organizations. Identify them, prove their roles, and arrest them before the crime is committed.\n\nArrests only stick if you know the suspect\'s ROLE: decoded messages, enemy computers and interrogations reveal roles.'],
    ['GETTING AROUND', 'Each city has the Airport, your Hotel, the CIA office (Data, Intelligence and Crypto floors) and any hideouts you have found. At an enemy building you can Place Wiretap, Break into building or Watch the building to follow people who leave.\n\nSuspects can only be arrested in their car or inside their own organization\'s building. Masterminds never leave their building.'],
    ['CONTROLS', 'Menus: arrows + Enter, Esc to leave.\nBuilding: arrows move, Space fires, E examines/opens (F1), P photographs (F2), B bugs (F3), G throws (F5-F7), Tab changes grenade (F10), C crouches, T sets a booby or remote trap (F9), R detonates remotes (F8). Terminals show password letters; type the password at the mainframe (F4) and search.\nCar: arrows order the next turn, + and - speed, Tab swaps cars, F follows, F1/E arrests when prompted.\nCrypto: pick a code letter and type the plain letter. Electronics: Enter swaps chips.'],
  ];
  let i = 0;
  return pageScene(() => { folder(P.G3, 'Manual'); const [h, b] = pages[i]; text(h, 16, 22, P.RD); textR((i + 1) + '/' + pages.length, 300, 22, P.G1); para(b, 16, 36, 288, P.K, 8); textC('Press a key', W / 2, 188, P.G1); }, () => { i++; if (i >= pages.length) back(); });
}

// ---------- NEW CHARACTER ----------
function charScene() {
  let s, step = 0, sex = 'm', name = '';
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const m1 = Menu([{ label: 'Maximillian Remington', go: () => { sex = 'm'; step = 1; s.typing = true; typing = true; } }, { label: 'Maxine Remington', go: () => { sex = 'f'; step = 1; typing = true; } }], 110, 70, 118);
  const m3 = () => Menu(DIFFICULTY.map((d, i) => ({ label: d.name, go: () => { game.diff = i; game.agent = newAgent(sex, name.trim() || (sex === 'f' ? 'Fox' : 'Fox')); game.cases = []; game.rank = 0; game.careerPoints = 0; ORGS.forEach(o => o.mastermindFree = true); go(trainingScene()); } })), 110, 70, 118);
  const doneName = () => { step = 2; typing = false; s.menu = m3(); };
  s = menuScene({
    menu: m1,
    back: () => { if (step) { step = 0; typing = false; s.menu = m1; } else go(titleScene()); },
    onChar(ch) { if (step !== 1) return; if (ch === '') name = name.slice(0, -1); else if (name.length < 10) name += name.length ? ch.toLowerCase() : ch; sfx.tick(); },
    onKey(k) { if (k === 'menu') { this.back(); return; } if (step === 1) { if (k === 'select') doneName(); if (k === 'fire' && name.length < 10) name += ' '; return; } this.menu.key(k); },
    tapElse(x, y) { if (step !== 1) return; const c = Math.floor((x - 82) / 12), r = Math.floor((y - 124) / 12); if (r >= 0 && r < 2 && c >= 0 && c < 13) this.onChar(A[r * 13 + c]); else if (y >= 150 && y < 162) { if (x < 160) name = name.slice(0, -1); else doneName(); } },
    onTap(x, y) { if (step === 1) { this.tapElse(x, y); return; } this.menu.tap(x, y); },
    draw() {
      rect(0, 0, W, H, P.K);
      g.drawImage(uiX_curtain('m'), 15, 0); drawMaxFigure(43, 190, 'm', sex === 'm' || step === 0);
      g.drawImage(uiX_curtain('f'), 245, 0); drawMaxFigure(273, 190, 'f', sex === 'f' || step === 0);
      if (step === 0) { text('Select one...', 104, 62, P.W); this.menu.draw(); }
      if (step === 1) {
        uiX_raised(84, 70, 152, 40, P.G1, P.G3, P.K); uiX_speck(85, 71, 150, 38, P.K, 2); uiX_screw(87, 73); uiX_screw(228, 73); uiX_screw(87, 102); uiX_screw(228, 102);
        textC((sex === 'f' ? 'Maxine' : 'Max') + "'s code name is:", 160, 74, P.GR2, P.K);
        uiX_well(94, 86, 132, 14); g.fillStyle = P.GR; for (let x = 96; x < 224; x += 2) g.fillRect(x, 97, 1, 1); text(name, 98, 89, P.GR2); if ((this.t * 3 | 0) % 2) rect(98 + textW(name) + (name ? 1 : 0), 89, 5, 7, P.GR);
        uiX_raised(78, 120, 164, 45, P.G1, P.G3, P.K); rect(79, 146, 162, 1, P.K);
        for (let i = 0; i < 26; i++) { const x = 82 + (i % 13) * 12, y = 124 + Math.floor(i / 13) * 12, hv = mouse.x >= x && mouse.x < x + 11 && mouse.y >= y && mouse.y < y + 11; uiX_raised(x, y, 11, 11, hv ? P.YE : P.G3, P.W, P.G1); rect(x + 1, y + 10, 10, 1, P.K); rect(x + 10, y + 1, 1, 10, P.K); textC(A[i], x + 5, y + 2, P.K); }
        uiX_raised(82, 150, 74, 11, P.RD, P.RD2, P.K); textC('Rub out', 119, 152, P.W, P.K); uiX_raised(164, 150, 74, 11, P.BL, P.BL2, P.K); textC('Done', 201, 152, P.YE, P.K);
      }
      if (step === 2) { text('Which difficulty level?', 104, 62, P.W); this.menu.draw(); for (let i = 0; i < 4; i++) { const on = i <= this.menu.sel, x = 90 + i * 9; rect(x, 144 - i * 3, 7, 8 + i * 3, P.K); rect(x + 1, 145 - i * 3, 5, 6 + i * 3, on ? [P.GR2, P.YE, P.RD2, P.RD][i] : P.G1); if (on) px(x + 1, 145 - i * 3, P.W); } para(['Special help for first-time agents.', 'More suspects, fewer clues.', 'Alert guards, harder codes and circuits.', 'Red herrings, no word spaces, deadly guards.'][this.menu.sel], 90, 110, 140, P.G3, 8); }
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
      rect(0, 0, W, H, P.K); textC('Preparation for Field Work', W / 2, 4, P.W); rect(W / 2 - 64, 12, 128, 1, P.BL2);
      this.menu.draw();
      for (let i = 0; i < 4; i++) {
        const x = i * 81, y = 50, w = 77, h = 150;
        frame(x, y, w, h, P.W); rect(x + 1, y + 1, w - 2, h - 2, P.K); trainingArt(i, x + 2, y + 2, w - 4, 126, this.t);
        rect(x + 1, y + 130, w - 2, 19, cols[i]); textC(labels[i], x + w / 2, y + 131, P.W); textC(SKILL_NAMES[game.agent.skills[keys[i]]], x + w / 2, y + 140, P.YE);
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
  for (const b of Object.values(game.buildings)) if (b.city === game.city && b.known) out.push({ kind: 'bld', b, label: (b.agency || (b.orgKnown ? b.org.name : 'Unknown')) + ' ' + (b.agency ? b.type : b.orgKnown ? b.type : 'building') });
  return out;
}
function cityScene() {
  if (game.crime && game.crime.over && !game.crime.reported) return synopsisScene();
  if (game.crime && game.crime.prisonBreak && !game.crime.prisonBreak.handled && !practiceMode) return prisonBreakScene();
  const city = cityById(game.city);
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
function goLocation2(l) { if (l.kind === 'cia') go(game.ciaBlocked[game.city] ? pageScene(() => { rect(0, 0, W, H, P.K); ciaLobbyArt(170, 0, 150, 200, 0); para('The station chief meets you at the door. After your accusation, nobody in this office will work with you. Try the CIA in another city.', 15, 20, 140, P.W, 8); statusBox(174); }, () => go(cityScene())) : ciaArrive()); else if (l.kind === 'airport') go(airportScene()); else if (l.kind === 'hotel') go(hotelScene()); else go(buildingScene(l.b)); }
function pauseScene(back) {
  return menuScene({
    menu: Menu([{ label: 'Continue', go: back }, { label: 'Sound on / off', go: () => { sfx.toggle(); } }, { label: 'How to play', go: () => go(helpScene(() => go(pauseScene(back)))) }, { label: 'Save Game', go: () => { writeSave(); toast('Game saved'); } }, { label: 'Quit to title', go: () => go(titleScene()) }], 118, 76, 110),
    back, draw() { g.drawImage(uiX_deskArt(), 0, 0); uiX_deskLive(this.t); msgBox(100, 60, 124, 60); text('Do you want to...', 106, 64, P.W); this.menu.draw(); },
  });
}

// ---------- CIA BUILDING ----------
function ciaArrive() {
  game.ciaFloor = 0;
  if (game.ciaVisited[game.city]) return ciaFloors();
  game.ciaVisited[game.city] = true;
  return pageScene(t => { rect(0, 0, W, H, P.K); ciaLobbyArt(170, 0, 150, 200, t); uiX_floorBar(0); rect(168, 0, 1, 200, P.G1); para('You arrive at the CIA building and check with your contact.', 15, 20, 140, P.W, 8); statusBox(174); }, () => go(ciaFloors()));
}
// the lift: doors shut, the indicator steps floor by floor, ding, doors open
function ride(floor, next) { const from = game.ciaFloor || 0; game.ciaFloor = floor; go(liftScene(from, floor, next)); }
function ciaFloors() {
  return menuScene({
    menu: Menu([{ label: '1. Data Section', go: () => ride(1, () => go(dataSection(() => go(ciaFloors())))) }, { label: '2. Intelligence Section', go: () => ride(2, () => go(intelSection(() => go(ciaFloors())))) }, { label: '3. Crypto Branch', go: () => ride(3, () => go(cryptoBranch(() => go(ciaFloors())))) }, { label: 'Leave building', go: () => ride(0, () => go(cityScene())) }], 27, 30, 146),
    back: () => go(cityScene()),
    draw() { rect(0, 0, W, H, P.K); ciaFloorsArt(170, 0, 150, 200, this.t, game.ciaFloor || 0, [1, 2, 3, 0][this.menu.sel]); text('You are in the CIA building.', 21, 14, P.W); text('Which floor ?', 21, 22, P.W); this.menu.draw(); statusBox(174); },
  });
}
function dataSection(back) {
  const me = () => go(dataSection(back));
  return splitLayout({ header: ['Data Section...'], floor: 1, back, art: (x, y, w, h, t) => dataRoomArt(x, y, w, h, t), items: [
    { label: 'Review Clues', go: () => go(reviewClues(me)) },
    { label: 'Review Suspects', go: () => go(reviewSuspects(me)) },
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
// ---------- clue-method pictures, 24x20, painted into cached sprites ----------
const uiX_ICON = {
  binoc() {
    vgrad(0, 0, 24, 20, [P.CY, P.TL, P.BL]);
    rect(0, 16, 24, 4, P.K); for (const [bx, bw, bh] of [[0, 5, 3], [6, 4, 5], [15, 6, 4], [21, 3, 2]]) rect(bx, 16 - bh, bw, bh, P.K);
    for (const ox of [2, 13]) {
      rect(ox + 2, 0, 5, 3, P.K); rect(ox + 3, 1, 3, 1, P.G1);
      rect(ox, 3, 9, 10, P.K); rect(ox + 1, 3, 7, 9, P.G1); rect(ox + 1, 4, 2, 7, P.G3); px(ox + 1, 4, P.W); rect(ox + 6, 4, 1, 8, P.K);
      disc(ox + 4, 14, 4, P.K); disc(ox + 4, 14, 3, P.BL); rect(ox + 2, 12, 2, 1, P.BL2); px(ox + 2, 13, P.CY); px(ox + 3, 12, P.W); px(ox + 6, 16, P.TL);
    }
    rect(10, 5, 5, 4, P.K); rect(11, 6, 3, 2, P.G1); rect(11, 3, 3, 2, P.G3); px(11, 3, P.W); rect(11, 4, 3, 1, P.K);
  },
  tap() {
    dither(0, 0, 24, 20, P.BL, P.K, 7);
    // telephone: red body, black handset, white dial
    rect(4, 10, 15, 8, P.K); for (let i = 0; i < 6; i++) rect(5 - (i >> 2), 11 + i, 13 + (i >> 2) * 2, 1, P.RD); rect(6, 11, 11, 1, P.RD2); rect(3, 17, 17, 2, P.K); rect(4, 17, 15, 1, P.RD);
    disc(11, 14, 3, P.W); disc(11, 14, 1, P.K); px(9, 12, P.K); px(13, 12, P.K); px(8, 14, P.K); px(14, 14, P.K); px(9, 16, P.K);
    rect(3, 7, 17, 3, P.K); rect(4, 8, 15, 1, P.G1); rect(2, 6, 4, 4, P.K); rect(17, 6, 4, 4, P.K); rect(3, 7, 2, 1, P.G1); rect(18, 7, 2, 1, P.G1);
    // the tap: a green lead clipped to the line, and a little bug with a red eye
    line(20, 16, 22, 12, P.GR2); line(22, 12, 22, 5, P.GR2); rect(20, 1, 4, 4, P.G3); rect(20, 1, 4, 1, P.W); px(21, 2, P.RD2); rect(21, 4, 2, 1, P.G1);
    px(1, 2, P.CY); px(2, 1, P.CY); px(3, 2, P.CY); px(15, 1, P.CY); px(16, 2, P.CY);
  },
  informant() {
    dither(0, 0, 24, 20, P.K, P.BL, 4); dither(0, 0, 8, 6, P.K, P.YE, 2); disc(1, 0, 2, P.YE); px(1, 0, P.W);
    g.drawImage(uiX_spr('snitch', [
      '....KKKKK.....', '...KKKKKKK....', '...KrrrrrK....', '.KKKKKKKKKKK..', '....rRRRRR....', '....rRKRRRR...', '....rRRRRRRR..', '....rrRRRRR...',
      '...n.rRRRRR...', '..nnnrrRRRR...', '..nnnnnnRRR...', '.nYnnnnnnnn...', '.nYnnnnKnnn...', 'nYnnnnnKnnnn..', 'nYnnnnnKnnnn..', 'nYnnnnnKnnnn..', 'nYnnnnnKnnnn..', 'nYnnnnnKnnnn..']), 1, 2);
    rect(15, 2, 8, 7, P.W); rect(16, 1, 6, 1, P.W); rect(16, 9, 6, 1, P.W); px(14, 8, P.W); px(13, 9, P.W); px(17, 5, P.K); px(19, 5, P.K); px(21, 5, P.K);
  },
  computer() {
    rect(0, 0, 24, 20, P.G1); uiX_speck(0, 0, 24, 14, P.K, 3); rect(0, 14, 24, 6, P.BR); rect(0, 14, 24, 1, P.YE);
    uiX_raised(3, 1, 18, 12, P.G3, P.W, P.G1); rect(5, 3, 14, 8, P.K); rect(6, 3, 12, 7, P.BL);
    rect(7, 4, 6, 1, P.CY); rect(7, 6, 9, 1, P.CY); rect(7, 8, 4, 1, P.CY); rect(12, 8, 2, 1, P.GR2); px(16, 10, P.G3); px(17, 10, P.RD2);
    rect(10, 13, 4, 1, P.G1);
    rect(2, 15, 20, 4, P.G3); rect(2, 15, 20, 1, P.W); for (let i = 0; i < 9; i++) { px(3 + i * 2, 16, P.G1); px(4 + i * 2, 17, P.G1); } rect(7, 18, 10, 1, P.G1); rect(2, 19, 20, 1, P.K);
  },
  camera() {
    dither(0, 0, 24, 20, P.TL, P.BL, 5);
    rect(1, 5, 22, 13, P.K); rect(2, 6, 20, 11, P.G1); uiX_speck(2, 9, 20, 7, P.K, 6);
    rect(2, 6, 20, 3, P.G3); rect(2, 6, 20, 1, P.W); rect(8, 2, 8, 4, P.K); rect(9, 3, 6, 3, P.G3); px(9, 3, P.W);
    rect(3, 3, 4, 3, P.K); rect(4, 4, 2, 1, P.W); rect(18, 3, 3, 3, P.K); px(19, 4, P.RD2);
    disc(12, 12, 5, P.K); disc(12, 12, 4, P.G3); disc(12, 12, 3, P.K); disc(12, 12, 2, P.BL); px(11, 11, P.CY); px(10, 10, P.W); px(13, 13, P.BL2);
    rect(1, 17, 22, 1, P.K);
  },
  docs() {
    uiX_wood(0, 0, 24, 20);
    rect(3, 3, 14, 16, P.K); rect(2, 2, 14, 16, P.G3);
    rect(8, 3, 14, 16, P.G1); rect(7, 2, 14, 16, P.W); rect(7, 2, 14, 1, P.W);
    for (const yy of [5, 7, 9, 11]) rect(9, yy, yy === 11 ? 6 : 10, 1, P.G1); rect(9, 5, 5, 1, P.K);
    frame(9, 13, 9, 4, P.RD); px(10, 14, P.RD); rect(12, 14, 4, 1, P.RD);
    rect(18, 0, 2, 5, P.G3); px(18, 0, P.W); rect(18, 4, 2, 1, P.G1);
  },
  police() {
    rect(0, 0, 24, 20, P.BL); uiX_speck(0, 0, 24, 20, P.K, 4);
    g.drawImage(uiX_spr('badge', [
      '......YY......', '....YYWWYY....', '..YYYYYYYYnn..', '.YWYYYYYYYYYn.', '.YYYYYnnYYYYn.', '.YYYnnYYnnYYn.', '.YYnYYYYYYnYn.',
      '.YYYnYYYYnYYn.', '.YYYYnYYnYYYn.', '..YYYnYYnYYn..', '..YYYYnnYYYn..', '...YYYYYYYn...', '....YYYYnn....', '.....YYnn.....', '......nn......']), 5, 1);
    rect(3, 17, 18, 2, P.W); rect(4, 17, 6, 1, P.G1); rect(12, 17, 8, 1, P.G1);
  },
  interro() {
    rect(0, 0, 24, 20, P.K);
    rect(11, 0, 1, 3, P.G1);
    for (let yy = 5; yy < 20; yy++) { const hw = 2 + (yy - 5) * 0.6 | 0; dither(11 - hw, yy, hw * 2 + 1, 1, P.K, P.YE, Math.max(1, 9 - (yy - 5) * 0.5 | 0)); }
    rect(8, 3, 7, 2, P.GR); rect(7, 4, 9, 1, P.GR); rect(8, 3, 3, 1, P.GR2); rect(10, 5, 3, 1, P.YE); px(11, 5, P.W);
    // an empty chair, lit from above
    rect(8, 10, 1, 9, P.G3); rect(8, 10, 7, 1, P.G3); rect(8, 12, 7, 1, P.G1); rect(8, 15, 8, 2, P.G3); rect(8, 16, 8, 1, P.G1); rect(15, 16, 1, 3, P.G1); rect(9, 17, 1, 2, P.G1);
    rect(0, 19, 24, 1, P.G1);
  },
};
function methodIcon(m, x, y) {
  const k = /Tap/.test(m) ? 'tap' : /Photograph/.test(m) ? 'camera' : /Document/.test(m) ? 'docs' : /Computer|INTERPOL|Scan/.test(m) ? 'computer' : /Police/.test(m) ? 'police' : /Interrog/.test(m) ? 'interro' : /Informant|Gossip/.test(m) ? 'informant' : 'binoc';
  // a small print with a white border, clipped to the page
  uiX_print(x - 3, y - 3, 32, 32); rect(x, y, 26, 22, P.K);
  g.drawImage(sprite('uiX_icon' + k, 24, 20, uiX_ICON[k]), x + 1, y + 1);
  uiX_clip(x - 6, y - 7);
}
// an index card: soft shadow, red header rule, pale blue lines
function uiX_card(x, y, w, h) {
  rect(x + 2, y + 2, w, h, P.G1); rect(x, y, w, h, P.W); frame(x, y, w, h, P.G3);
  rect(x + 1, y + 10, w - 2, 1, P.RD2); g.fillStyle = P.CY; for (let yy = y + 18; yy < y + h - 2; yy += 8) for (let xx = x + 2; xx < x + w - 2; xx += 2) g.fillRect(xx, yy, 1, 1);
}
function clueScreen(c, back) {
  const p = game.crime.people[c.pid];
  const related = game.clues.filter(o => o !== c && o.pid === c.pid).slice(-2);
  return pageScene(() => {
    folder(FOLDER.clue, 'Clue');
    text('Source: ' + c.source, 12, 20, P.G1);
    const y = para(c.text, 12, 28, c.face ? 240 : 260, P.K, 8);
    text('Method: ' + c.method, 12, y + 1, P.G1);
    if (c.face) { rect(264, 20, 40, 46, P.G1); rect(262, 18, 40, 46, P.W); frame(262, 18, 40, 46, P.G3); drawFace(p.face, 266, 22, 32, 38); uiX_corners(266, 22, 32, 38); uiX_clip(290, 11); } else methodIcon(c.method, 274, 20);
    text('Related Clues:', 12, 92, P.RD);
    if (!related.length) text('...none', 12, 100, P.K);
    related.forEach((r, i) => { const yy = 102 + i * 36; uiX_card(10, yy, 298, 34); text('Source: ' + r.source, 14, yy + 3, P.G1); para(r.text, 14, yy + 11, 288, P.K, 8); });
    if (c.lie && game.crime.double && game.crime.double.caught) uiX_stamp('DISINFORMATION', 200 - uiX_stampW('DISINFORMATION') / 2, 63);
  }, back);
}
function reviewSuspects(back) {
  const ps = game.crime.people.filter(isSuspect);
  return folderList('Suspect Files', FOLDER.docs, ps.map(p => ({ label: p.known.name ? p.name : 'Agent ' + String.fromCharCode(65 + p.id), right: p.status !== 'free' ? p.status : p.known.city ? shownCity(p).name : '', rcol: p.status !== 'free' ? P.RD : P.BL, open: () => go(suspectFile(p, () => go(reviewSuspects(back)))) })), back, { empty: '...no suspects identified' });
}
// tractor-feed printout: sprocket margins and green bars, one bar every other typed row
function uiX_printout(x, y, w, h, row0) {
  rect(x + 2, y + 2, w, h, P.G1); rect(x, y, w, h, P.W);
  for (let yy = row0 + 7; yy < y + h - 1; yy += 16) rect(x + 6, Math.max(y + 1, yy), w - 12, Math.min(8, y + h - 1 - yy), P.GR2);
  for (const sx of [x + 1, x + w - 5]) { rect(sx + 3, y, 1, h, P.G3); for (let yy = y + 3; yy < y + h - 3; yy += 6) { rect(sx, yy, 3, 3, P.G3); px(sx + 1, yy + 1, P.G1); } }
  for (let xx = x; xx < x + w; xx += 2) { px(xx, y, P.G3); px(xx + 1, y + h - 1, P.G3); }
}
function suspectFile(p, back) {
  const steps = game.crime.steps.filter(s => (s.from === p.id || s.to === p.id) && s.known);
  return pageScene(() => {
    folder(FOLDER.suspect, 'Suspect File');
    rect(16, 24, 52, 62, P.G1); rect(14, 22, 52, 62, P.W); frame(14, 22, 52, 62, P.G3); if (p.known.face) drawFace(p.face, 18, 26, 44, 54); else { rect(18, 26, 44, 54, P.TL); g.save(); g.translate(18, 26); g.scale(44 / 26, 54 / 32); drawUnknownFace(0, 0); g.restore(); }
    uiX_corners(18, 26, 44, 54); uiX_clip(52, 15);
    const rows = [['Name:', p.known.name ? p.name : 'Agent ' + String.fromCharCode(65 + p.id)], ['Org:', p.known.org ? p.org.name : 'unknown'], ['City:', p.known.city ? shownCity(p).name : 'unknown'], ['Hideout:', p.known.hideout ? game.buildings[p.building].address : 'unknown'], ['Rank:', p.known.org ? RANKS[p.rank] : 'unknown'], ['Role:', p.known.role ? p.role : 'unknown']];
    rows.forEach(([k, v], i) => { text(k, 74, 22 + i * 10, P.K); text(v, 120, 22 + i * 10, v === 'unknown' ? P.G1 : i === 5 ? P.RD : P.BL); g.fillStyle = P.G1; for (let x = 120; x < 300; x += 2) g.fillRect(x, 30 + i * 10, 1, 1); });
    uiX_printout(16, 100, 264, 60, 114);
    text('MESSAGES AND MEETINGS', 22, 104, P.K); rect(22, 111, textW('MESSAGES AND MEETINGS'), 1, P.K);
    if (!steps.length) text('...none known', 22, 114, P.G1);
    steps.slice(0, 5).forEach((s, i) => { const o = game.crime.people[s.from === p.id ? s.to : s.from]; text(fitText((s.from === p.id ? 'to ' : 'from ') + (o.known.name ? o.name : 'Agent ' + String.fromCharCode(65 + o.id)) + ' (' + s.kind + ')', 250), 22, 114 + i * 8, P.K); });
    if (p.status !== 'free') { const s = p.status.toUpperCase(); uiX_stamp(s, 250 - uiX_stampW(s) / 2, 83); }
    if (!p.known.role) text('No evidence of involvement - an arrest will not stick.', 16, 168, P.RD);
  }, back);
}
function insideInfo(back) { return folderList('Documents', FOLDER.docs, (game.inside || []).map(x => ({ label: x.label, open: () => go(pageScene(() => { folder(P.G3, x.tab || 'Documents', true, 'TOP SECRET'); x.draw(); }, () => go(insideInfo(back)))) })), back, { empty: '...no master plans or personnel files' }); }
function orgSummary(back) {
  const orgs = ORGS.filter(o => game.crime.people.some(p => p.org === o && p.known.org) || Object.values(game.buildings).some(b => b.org === o && b.orgKnown));
  return folderList('Organizations', FOLDER.org, orgs.map(o => ({ label: o.name, open: () => go(pageScene(() => {
    folder(FOLDER.org, o.short); textC(o.name, 160, 22, P.K); rect(160 - textW(o.name) / 2, 30, textW(o.name), 1, P.RD); rect(160 - textW(o.name) / 2, 32, textW(o.name), 1, P.RD);
    const allies = game.crime.orgs.includes(o) ? game.crime.orgs.filter(x => x !== o).map(x => x.short) : [];
    const assoc = ORGS.filter(x => x !== o && x.focus === o.focus && x.regions.some(r => o.regions.includes(r))).slice(0, 4).map(x => x.short);
    text('Allies:', 16, 40, P.K); text(allies.join(', ') || 'none known', 100, 40, allies.length ? P.RD : P.G1);
    text('Associates:', 16, 50, P.K); text(assoc.join(', ') || 'none', 100, 50, P.BL);
    text('Known Locations:', 16, 64, P.K);
    const locs = Object.values(game.buildings).filter(b => b.org === o && b.known); locs.forEach((b, i) => text('- ' + b.type + ' in ' + cityById(b.city).name, 100, 64 + i * 8, P.BL));
    if (!locs.length) text('none', 100, 64, P.G1);
  }, () => go(orgSummary(back)))) })), back, { empty: '...no organizations identified' });
}
function citySummary(back) {
  return folderList('Cities', FOLDER.city, regionCities(game.region).map(c => ({ label: c.name, open: () => go(pageScene(t => {
    folder(FOLDER.city, c.name); textC(c.name + ', ' + c.country, 160, 22, P.K); rect(160 - textW(c.name + ', ' + c.country) / 2, 30, textW(c.name + ', ' + c.country), 1, P.RD);
    const orgs = [...new Set(Object.values(game.buildings).filter(b => b.city === c.id && b.known && (b.orgKnown || b.agency)).map(b => b.agency || b.org.name))];
    const sus = game.crime.people.filter(p => p.known.city && shownCity(p) === c);
    text('Organizations:', 16, 40, P.K); para(orgs.join(', ') || 'none known', 110, 40, 190, orgs.length ? P.BL : P.G1, 8);
    text('Suspects:', 16, 76, P.K); para(sus.map(p => p.known.name ? p.name : 'Agent ' + String.fromCharCode(65 + p.id)).join(', ') || 'none known', 110, 76, 190, sus.length ? P.RD : P.G1, 8);
    text('Clues:', 16, 112, P.K); text(String(game.clues.filter(k => k.source.includes(c.name)).length), 110, 112, P.BL);
    // a snapshot of the city, taped into the file
    rect(38, 130, 116, 46, P.G1); rect(36, 128, 116, 46, P.W); frame(36, 128, 116, 46, P.G3);
    g.save(); g.beginPath(); g.rect(40, 132, 108, 38); g.clip(); cityPic(40, 132, 108, 38, c, t); g.restore(); uiX_corners(40, 132, 108, 38);
  }, () => go(citySummary(back)))) })), back);
}
// the Data Section's teleprinter chart: 3-D bars on a gridded blue screen
function uiX_bar3(x, y, len, face, lite, dark) {
  len = Math.max(2, len | 0); rect(x + 1, y + 1, len, 5, P.K); rect(x, y, len, 5, face); rect(x, y, len, 1, lite); rect(x, y + 4, len, 1, dark); rect(x + len - 1, y, 1, 5, dark);
}
function activityReports(back) {
  return pageScene(() => {
    g.drawImage(sprite('uiX_actbg', W, H, () => {
      rect(0, 0, W, H, P.BL); uiX_speck(0, 0, W, H, P.K, 1);
      uiX_raised(0, 0, W, 14, P.G1, P.G3, P.K); uiX_raised(0, 14, W, 186, P.BL, P.BL2, P.K); frame(1, 15, W - 2, 184, P.K);
      for (const bx of [82, 242]) { rect(bx - 1, 16, 1, 172, P.BL2); for (let k = 1; k <= 4; k++) for (let yy = 17; yy < 186; yy += 2) px(bx + k * 17.5, yy, P.BL2); }
      rect(158, 16, 1, 182, P.K); rect(159, 16, 1, 182, P.BL2);
      for (const bx of [4, 312]) { rect(bx, 3, 5, 5, P.K); px(bx + 1, 4, P.RD2); }
    }), 0, 0);
    textC('Activity Report Summary', W / 2, 4, P.W, P.K);
    const a = game.activity; const cities = regionCities(game.region).concat([cityById('WAS')]);
    const mx = Math.max(1, ...Object.values(a));
    cities.slice(0, 21).forEach((c, i) => { text(c.name, 3, 17 + i * 8, P.CY); uiX_bar3(82, 18 + i * 8, 70 * (a[c.id] || 0) / mx, P.CY, P.W, P.TL); });
    const orgs = ['CIA', 'MI6', 'Mossad', 'KGB'].map(n => ({ short: n.replace('Mossad', 'Mossd'), name: n })).concat(ORGS.filter(o => o.regions.includes(game.region)).map(o => ({ short: o.short, name: o.name })));
    orgs.slice(0, 21).forEach((o, i) => { text(o.short, 162, 17 + i * 8, P.RD2); uiX_bar3(242, 18 + i * 8, 70 * (a[o.name] || 0) / mx, P.YE, P.W, P.BR); });
  }, back);
}
function intelSection(back) {
  const me = () => go(intelSection(back));
  const scan = (hours, local) => { advance(hours * 60); const pool = game.crime.people.filter(p => p.status === 'free' && (!local || p.city === game.city)); let c = null; if (pool.length && rnd() < (local ? 0.55 : 0.75)) c = clueAbout(pick(pool), local ? 'Local Police Report' : 'INTERPOL Data Base'); go(c ? clueScreen(c, me) : pageScene(t => { rect(0, 0, W, H, P.K); g.save(); g.beginPath(); g.rect(170, 0, 150, 200); g.clip(); intelArt(170, 0, 150, 200, t); g.restore(); rect(168, 0, 1, 200, P.G1); uiX_floorBar(2); popup([(local ? 'Local Scan' : 'International Scan') + ' complete.', 'Nothing new turned up.']); statusBox(174); }, me)); };
  return splitLayout({ header: ['Intelligence Section...'], floor: 2, back, art: (x, y, w, h, t) => intelArt(x, y, w, h, t), items: [
    { label: 'Local Scan', go: () => scan(2, true) },
    { label: 'International Scan', go: () => scan(6, false) },
    { label: 'Active Wire Taps', go: () => go(folderList('Wire Taps', FOLDER.docs, game.taps.filter(tp => tp.until >= dayOf(game.t)).map(tp => { const b = game.buildings[tp.key]; return { label: cityById(b.city).name + ': ' + (b.agency || (b.orgKnown ? b.org.name : 'unknown building')) + ', ' + b.address }; }), me, { empty: '...no active taps' })) },
    { label: 'Accuse Double Agent', off: !!(game.crime.double && game.crime.double.caught), go: () => go(accuseScene(me)) },
    { label: 'Check with Sam', go: () => { const hint = samHint(); go(pageScene(() => { rect(0, 0, W, H, P.K); intelArt(170, 0, 150, 200, 0); text('Sam says:', 15, 20, P.YE); para(hint, 15, 30, 140, P.W, 8); statusBox(174); }, me)); } },
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
    draw() { rect(0, 0, W, H, P.K); intelArt(170, 0, 150, 200, 0); text('Accuse Double Agent', 15, 14, P.YE); para('Do you accuse someone in the ' + city.name + ' station of working for the other side? If you are wrong, this office will refuse to deal with you.', 15, 30, 150, P.W, 8); this.menu.draw(); statusBox(174); },
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
      rect(0, 0, 1, H, P.G3); rect(189, 0, 1, H, P.G3); rect(190, 0, 1, H, P.W); rect(191, 0, 1, H, P.G1);
      uiX_departures(this.menu, this.t, !!flying);
      text("You're in " + here.name, 196, 4, P.W); text('Do you travel to ...', 196, 12, P.W);
      this.menu.draw();
    },
  });
  return s;
}

// the airport's departure board: slate rows, flight numbers, and a split-flap sign for the pick
function uiX_departures(menu, t, flying) {
  g.drawImage(sprite('uiX_board', 128, 200, () => {
    rect(0, 0, 128, 200, P.K); uiX_speck(0, 0, 128, 200, P.BL, 1);
    rect(0, 1, 128, 20, P.K); rect(0, 21, 128, 1, P.G1);
  }), 192, 0);
  const n = menu.items.length, sel = menu.items[menu.sel], blink = (t * 2 | 0) % 2;
  menu.items.forEach((it, i) => { if (!it.city) return; const iy = menu.y + i * menu.lh, code = 'CA ' + (100 + (it.city.id.charCodeAt(0) * 7 + it.city.id.charCodeAt(1) * 3 + it.city.id.charCodeAt(2)) % 900); textR(code, 316, iy, i === menu.sel ? P.YE : P.BR); });
  const by = Math.max(menu.y + n * menu.lh + 6, 128), c = sel && sel.city;
  if (by > 172) return;
  uiX_raised(195, by, 122, 12, P.G1, P.G3, P.K); g.drawImage(uiX_spr('jet1', uiX_jet(1)), 198, by + 1); text('DEPARTURES', 212, by + 2, P.YE, P.K);
  // split-flap cells
  const name = c ? c.name.toUpperCase().slice(0, 13) : flying ? '' : sel && sel.label === 'Stay here' ? 'NO FLIGHT' : '';
  for (let i = 0; i < 13; i++) {
    const cx = 197 + i * 9, cy = by + 16; rect(cx, cy, 8, 11, P.G1); rect(cx, cy, 8, 1, P.G3); rect(cx, cy + 10, 8, 1, P.K); px(cx, cy + 5, P.K); px(cx + 7, cy + 5, P.K);
    const ch = name[i] || ' '; if (ch !== ' ') textC(ch, cx + 4, cy + 2, P.W);
  }
  if (c) { text('GATE ' + (1 + c.id.charCodeAt(1) % 9), 196, by + 32, P.G3); if (flying || blink) textR(flying ? 'DEPARTED' : 'BOARDING', 316, by + 32, flying ? P.GR2 : P.RD2); }
}

// ---------- HOTEL ----------
function hotelScene() {
  return boxLayout({ header: ['You are at your', 'hotel. Do you...'], art: (x, y, w, h, t) => hotelLobbyArt(t), back: () => go(cityScene()), items: [
    { label: 'Leave Hotel', go: () => go(cityScene()) },
    { label: 'Visit the lounge', go: () => { advance(180); const pool = game.crime.people.filter(p => p.status === 'free' && p.city === game.city); const c = pool.length && rnd() < 0.6 ? clueAbout(pick(pool), 'Local Gossip') : null; addHeat(game.city, 1); go(c ? clueScreen(c, () => go(hotelScene())) : pageScene(() => { hotelLobbyArt(0); popup(['Nothing but tourists and piano music.', 'Somebody at the bar is watching you, though.']); }, () => go(hotelScene()))); } },
    { label: 'Sleep through case', go: () => go(sleepScene()) },
    { label: 'Save Game', go: () => { writeSave(); toast('Saved as "' + game.agent.codename + '"'); } },
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
function hallRead() { try { return JSON.parse(localStorage.getItem('covert-action-hall')) || []; } catch (e) { return []; } }
function hallAdd(e) { const h = hallRead(); h.push(e); h.sort((a, b) => b.score - a.score); try { localStorage.setItem('covert-action-hall', JSON.stringify(h.slice(0, 5))); } catch (x) {} }
function hallOfFame(back) {
  const h = hallRead();
  return pageScene(() => {
    folder(P.BL, 'Hall of Fame', true, false); textC('COVERT ACTION', 160, 20, P.K); textC('HALL OF FAME', 160, 28, P.K); rect(110, 36, 100, 1, P.BR); rect(112, 38, 96, 1, P.YE);
    const star = uiX_spr('star', ['....Y....', '....Y....', '...YWY...', 'YYYYWYYYn', '.YYWYYYn.', '..YYYYn..', '..YYnYY..', '.YYn.nYY.', '.Yn...nn.']); for (const sx of [90, 221]) g.drawImage(star, sx, 22);
    for (let i = 0; i < 5; i++) {
      const y = 42 + i * 30, e = h[i], x = 10 + i, w = 298 - i, gold = e && i === 0;
      rect(x + 2, y + 2, w, 28, P.G1); uiX_raised(x, y, w, 28, gold ? P.YE : e ? P.G3 : P.W, P.W, gold ? P.BR : P.G1); if (e) uiX_speck(x + 1, y + 1, w - 2, 26, P.W, 1);
      frame(x + 2, y + 2, w - 4, 24, gold ? P.BR : P.G1); uiX_screw(x + w - 9, y + 4); uiX_screw(x + w - 9, y + 19);
      if (e) { text((i + 1) + '. Max \'' + e.name.toUpperCase() + '\' Remington,  Case #' + e.cases + ' ' + e.date, 14 + i, y + 3, P.K); text(e.crime, 14 + i, y + 11, P.BL); text('EP: ' + e.ep + '   ---  SCORE: ' + e.score + ' ---', 14 + i, y + 19, P.K); } else text('---', 16 + i, y + 10, P.G1);
    }
  }, back);
}

// ---------- ARRESTS & INTERROGATION ----------
function arrestResult(p, how) {
  const cr = game.crime;
  if (!p.known.role) { p.exists = true; learn(p, 'face'); learn(p, 'name'); return splitLayout({ header: [], text: p.name + ' was taken to local headquarters for questioning, but had to be released for lack of evidence. Without proof of a role in the crime, an arrest will not stick.', art: (x, y, w, h) => interrogationArt(x, y, w, h, p), back: () => go(cityScene()), items: [{ label: 'Continue', go: () => go(cityScene()) }] }); }
  p.status = 'arrested'; p.jailCity = game.city; p.shownCity = null; addHeat(game.city, 2); FACET_ORDER.forEach(f => learn(p, f));
  if (p.role === 'Mastermind') p.org.mastermindFree = false;
  const told = [];
  const contacts = cr.steps.filter(s => s.to !== undefined && (s.from === p.id || s.to === p.id)).map(s => cr.people[s.from === p.id ? s.to : s.from]).filter(Boolean);
  for (const q of contacts) { if (isSuspect(q) && told.length < 3) { const c = clueAbout(q, 'Interrogation'); if (c) told.push(c.text); if (rnd() < 0.5 && !q.known.role) { const r = clueAbout(q, 'Interrogation', 'role'); if (r) told.push(r.text); } } }
  cr.steps.filter(s => s.from === p.id || s.to === p.id).forEach(s => s.known = true);
  const body = p.name + ' (' + p.role + ', ' + p.org.name + ') is in custody. Under interrogation: ' + (told.length ? told.join(' ') : '"I know nothing." The suspect only confirms what you already knew.');
  return splitLayout({ header: [how === 'car' ? 'Arrested on the road!' : 'Arrested!'], text: body, art: (x, y, w, h) => interrogationArt(x, y, w, h, p), back: () => go(cityScene()), items: [{ label: 'Continue', go: () => go(cityScene()) }] });
}

// ---------- END OF CASE ----------
function checkCaseEnd() { if (game.crime && game.crime.over && !game.crime.reported) { game.crime.reported = true; go(synopsisScene()); return true; } return false; }
function synopsisScene() {
  const cr = game.crime; cr.reported = true;
  const steps = cr.steps.slice().sort((a, b) => a.day - b.day);
  const cards = cr.people.slice(0, 10);
  let i = 0;
  const nm = q => q.name + ' (' + q.role + ') ' + q.org.short + '/' + cityById(q.city).name;
  return pageScene(t => {
    g.drawImage(uiX_synBg(), 0, 0);
    const blink = (t * 3 | 0) % 2;
    cards.forEach((p, k) => { const x = (k % 5) * 64, y = Math.floor(k / 5) * 40; const s = steps[i]; const active = s && (s.from === p.id || s.to === p.id);
      rect(x + 1, y + 1, 62, 38, P.K); uiX_raised(x, y, 62, 38, P.G3, P.W, P.G1); rect(x + 1, y + 1, 60, 8, active ? P.YE : k % 2 ? P.BL2 : P.CY);
      text(fitText(p.role, 40), x + 2, y + 1, active ? P.RD : P.K);
      for (let b = 0; b < 26; b++) if (uiX_hash(b, p.id, 5) < 0.55) rect(x + 4 + b, y + 13, 1, b % 3 ? 10 : 12, P.K);
      if (isSuspect(p) || cr.over) { drawFace(p.face, x + 34, y + 6, 26, 32); frame(x + 33, y + 5, 28, 33, P.K); }
      if (p.status === 'arrested') { rect(x + 2, y + 28, 30, 7, P.RD); text('JAIL', x + 5, y + 28, P.W); }
      if (active && blink) frame(x, y, 62, 38, P.RD2); });
    if (cards.length < 10) { const x0 = (cards.length % 5) * 64, y0 = Math.floor(cards.length / 5) * 40; rect(x0, y0, W - x0, 40, P.K); uiX_speck(x0, y0, W - x0, 40, P.BL, 4); }
    uiX_well(7, 89, 226, 62); frame(8, 90, 224, 60, P.BL);
    uiX_reels(242, 88, t, i < steps.length);
    if (i < steps.length) {
      const s = steps[i], a = cr.people[s.from], b = s.to !== undefined ? cr.people[s.to] : null;
      textC(dayStr(dayToT(s.day)), 120, 91, P.G3);
      const l1 = nm(a), l2 = s.kind === 'item' ? 'obtained the ' + s.item : s.kind === 'meeting' ? 'met with' : 'sent message to';
      textC(fitText(l1, 220), 120, 100, P.W); textC(l2, 120, 108, P.CY); if (b) textC(fitText(nm(b), 220), 120, 116, P.W);
      rect(12, 126, 216, 1, P.G1); if (s.blocked) textC('- stopped by your arrests -', 120, 130, P.YE); else if (s.kind !== 'item') textC('"' + fitText(['Proceed as planned.', 'The package is ready.', 'Wait for my signal.', 'Trust no one.'][(i * 7 + s.day) % 4], 200) + '"', 120, 130, P.YE);
    } else { textC(dayStr(dayToT(cr.endDay || s0())), 120, 91, P.G3); para(cr.prevented ? 'The conspiracy falls apart. Mission completed.' : 'The ' + cr.kind.toLowerCase() + ' goes ahead: the plan to ' + cr.verb + ' has succeeded.', 12, 104, 216, P.W, 8); }
    text('The Case of the ' + cr.object, 6, 160, P.W); text((i + 1) + ' / ' + (steps.length + 1), 6, 170, P.CY); textC('Press a key', 160, 188, P.G3);
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
    E.rows.forEach((r, k) => { const y = 14 + k * 9; if (y > 170) return; const x = 8 + (k % 3), good = r.ep >= r.max && r.max > 0;
      rect(x + 1, y + 1, 304 - (k % 3), 9, P.G1); rect(x, y, 304 - (k % 3), 9, P.W); frame(x, y, 304 - (k % 3), 9, P.G3); rect(x + 1, y + 1, 3, 7, good ? P.GR : r.ep > 0 ? P.YE : P.RD);
      text(r.status, 16, y + 1, good ? P.GR : P.RD); text(fitText(r.label, 110), 118, y + 1, r.crime ? P.RD : P.K); textR('EP:' + r.ep + '/' + r.max, 306, y + 1, r.crime ? P.RD : P.BL); });
    const y = Math.min(178, 16 + E.rows.length * 9); rect(10, y + 2, 304, 20, P.G1); rect(8, y, 304, 20, P.W); frame(8, y, 304, 20, P.G3); frame(10, y + 2, 300, 16, P.YE); text('Efficiency Rating', 118, y + 2, P.K); textR('EP:' + E.got + '/' + E.max, 306, y + 2, P.BL); textC('--- ' + pts + ' ---', 160, y + 11, P.K);
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
      textC('The Career of Max \'' + game.agent.codename.toUpperCase() + '\' Remington', 160, 20, P.K); textC('Rank: ' + RANKS[game.rank], 160, 30, P.BL);
      rect(252, 44, 56, 68, P.G1); rect(250, 42, 56, 68, P.W); frame(250, 42, 56, 68, P.G3); drawAgent(game.agent.sex || 'm', 252, 44); uiX_corners(252, 44, 52, 64); uiX_clip(292, 36);
      uiX_ribbon(262, 114, game.rank);
      game.cases.slice(-6).forEach((c, i) => { const y = 42 + i * 14; text('Case #' + (game.cases.length - Math.min(6, game.cases.length) + i + 1) + '.  Arrests: ' + c.arrests + '  EP: ' + c.pts, 14, y, P.K); text((c.prevented ? '... stopped ' : "... couldn't stop ") + c.kind + '/' + c.object, 14, y + 7, P.G3); });
      rect(14, 128, 290, 1, P.G1); text('Arrested:  MasterMinds: ' + done + ' of 26', 14, 132, P.K);
      msgBox(104, 138, 124, 36); text('Do you want to...', 110, 141, P.W); this.menu.draw();
    },
  });
  return s;
}

// ---------- UI art for the screens above (uiX_) ----------
function uiX_synBg() { return sprite('uiX_syn', W, H, () => { rect(0, 0, W, H, P.BL); uiX_speck(0, 0, W, H, P.K, 3); rect(0, 80, W, 1, P.BL2); rect(0, 154, W, 1, P.BL2); }); }
// a reel-to-reel tape deck replaying the case
function uiX_reels(x, y, t, run) {
  g.drawImage(sprite('uiX_deck', 74, 64, () => {
    rect(1, 1, 74, 64, P.K); uiX_raised(0, 0, 73, 63, P.G3, P.W, P.G1); uiX_speck(1, 1, 71, 61, P.W, 1);
    uiX_well(4, 4, 65, 36, P.G1);
    rect(28, 44, 17, 8, P.G1); rect(29, 45, 15, 6, P.K); rect(33, 46, 7, 4, P.G3);
    for (let i = 0; i < 5; i++) { uiX_raised(6 + i * 13, 55, 10, 6, P.G1, P.G3, P.K); } px(10, 57, P.GR2); px(11, 57, P.GR2);
  }), x, y);
  const ang = run ? (t * 5 | 0) * 0.5 : 0;
  for (const [cx, r] of [[x + 20, 14], [x + 52, 11]]) {
    const cy = y + 22; disc(cx, cy, r, P.K); disc(cx, cy, r - 1, P.BR); disc(cx, cy, 5, P.G3); disc(cx, cy, 2, P.K);
    for (let k = 0; k < 3; k++) { const a = ang + k * 2.094 + (cx > x + 40 ? 1 : 0); line(cx + Math.cos(a) * 2, cy + Math.sin(a) * 2, cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, P.K); }
  }
  line(x + 20 - 13, y + 26, x + 30, y + 46, P.BR); line(x + 52 + 10, y + 26, x + 42, y + 46, P.BR); rect(x + 30, y + 46, 13, 1, P.BR);
  uiX_lamp(x + 64, y + 44, run && (t * 2 | 0) % 2, P.RD2);
}
// the firing range behind the practice menu
function uiX_rangeArt() {
  return sprite('uiX_range', W, H, () => {
    rect(0, 0, W, H, P.K);
    for (let y = 0; y < 120; y++) { const lv = 10 - y / 12 | 0; uiX_speck(0, y, W, 1, P.BL, Math.max(0, Math.min(16, lv))); }
    for (let i = 0; i < 9; i++) { const x = 20 + i * 36; rect(x, 0, 2, 120, P.G1); rect(x, 0, 1, 120, P.G3); }
    rect(0, 120, W, 80, P.G1); uiX_speck(0, 120, W, 80, P.K, 6); rect(0, 120, W, 1, P.G3);
    for (let i = -6; i < 16; i++) line(160 + i * 12, 121, 160 + i * 40, 199, P.K);
    rect(0, 8, W, 3, P.K); for (let x = 4; x < W; x += 20) rect(x, 11, 1, 6, P.G3);
  });
}
function uiX_target(x, y, t) {
  const sway = Math.round(Math.sin(t * 1.3) * 1);
  g.drawImage(sprite('uiX_tgt', 44, 70, () => {
    rect(0, 0, 44, 70, P.W); frame(0, 0, 44, 70, P.G3);
    // the classic silhouette with scoring rings
    disc(22, 16, 8, P.K); rect(8, 26, 28, 44, P.K); disc(9, 29, 3, P.K); disc(34, 29, 3, P.K); rect(18, 23, 8, 4, P.K);
    for (const [r, c] of [[18, P.W], [17, P.K], [12, P.W], [11, P.K], [6, P.W], [5, P.K]]) { g.save(); g.beginPath(); g.rect(6, 25, 32, 44); g.clip(); disc(22, 44, r, c); g.restore(); }
    disc(22, 44, 2, P.RD);
    for (const [hx, hy] of [[20, 42], [25, 47], [22, 36], [13, 58], [30, 30], [21, 15]]) { px(hx, hy, P.G1); px(hx + 1, hy, P.W); }
  }), x + sway, y);
  rect(x + 21 + sway, y - 36, 1, 36, P.G3); rect(x + 17 + sway, y - 2, 10, 2, P.G3);
}
// the two side panels on the character screen: velvet drapes in blue and red
function uiX_curtain(sex) {
  return sprite('uiX_curtain' + sex, 56, 200, () => {
    const [c1, c2, c3] = sex === 'm' ? [P.BL, P.BL2, P.K] : [P.RD, P.RD2, P.K];
    for (let x = 0; x < 56; x++) { const f = Math.sin(x / 56 * Math.PI * 5), lv = Math.round((f + 1) * 5); for (let y = 0; y < 200; y++) { const b = BAYER[(y & 3) * 4 + (x & 3)]; px(x, y, f > 0.55 && b < (f - 0.55) * 20 ? c2 : b < 10 - lv ? c3 : c1); } }
    vgrad(0, 0, 56, 3, [P.K, c1]); rect(0, 0, 1, 200, P.W); rect(55, 0, 1, 200, P.W);
    for (let y = 180; y < 200; y++) uiX_speck(1, y, 54, 1, P.K, (y - 180) / 1.4 | 0);
  });
}
// the agent's desk behind the pause menu
function uiX_deskArt() {
  return sprite('uiX_desk', W, H, () => {
    uiX_wood(0, 0, W, H);
    // a closed case folder
    rect(18, 108, 84, 64, P.K); rect(16, 106, 84, 64, P.YE); uiX_fibres(16, 106, 84, 64, P.BR, 0.04, 9); rect(16, 106, 84, 1, P.W); rect(99, 106, 1, 64, P.BR);
    rect(60, 101, 34, 6, P.YE); rect(60, 101, 34, 1, P.W); rect(66, 103, 22, 2, P.W);
    frame(28, 128, 60, 15, P.RD); frame(30, 130, 56, 11, P.RD); textC('SECRET', 58, 132, P.RD);
    // passport
    rect(214, 132, 40, 52, P.K); rect(212, 130, 40, 52, P.BL); rect(212, 130, 40, 1, P.BL2); disc(232, 150, 8, P.YE); disc(232, 150, 6, P.BL); rect(226, 150, 13, 1, P.YE); rect(231, 144, 3, 13, P.YE); rect(222, 166, 20, 2, P.YE); rect(225, 171, 14, 1, P.YE);
    // sunglasses
    for (const gx of [32, 52]) { disc(gx, 42, 8, P.K); disc(gx - 2, 40, 2, P.G1); }
    rect(38, 38, 8, 2, P.K); line(24, 38, 12, 30, P.K); line(60, 38, 72, 30, P.K);
    // pen
    line(250, 60, 300, 90, P.K); line(250, 59, 300, 89, P.BL); line(251, 59, 299, 88, P.BL2); rect(298, 87, 4, 3, P.G3); px(249, 59, P.YE);
    // coffee cup, from above
    disc(268, 28, 13, P.K); disc(266, 26, 13, P.W); disc(266, 26, 10, P.G3); disc(266, 26, 9, P.BR); disc(263, 23, 3, P.RD); rect(279, 22, 6, 8, P.W); rect(281, 24, 3, 4, P.BR);
  });
}
function uiX_deskLive(t) { // steam off the coffee
  for (let i = 0; i < 3; i++) { const k = ((t * 0.8 + i / 3) % 1), sy = 18 - k * 16, sx = 264 + Math.sin(k * 6 + i) * 3; if (k < 0.8) { px(sx, sy, P.W); px(sx + 1, sy - 1, P.G3); } }
}
// rank ribbon: one bar per rank step, colours from green to gold
function uiX_ribbon(x, y, rank) {
  const cols = [P.GR, P.GR2, P.TL, P.BL2, P.BL, P.RD2, P.RD, P.YE];
  rect(x + 1, y + 1, 34, 9, P.G1); rect(x, y, 34, 9, P.K);
  for (let i = 0; i < 8; i++) { rect(x + 1 + i * 4, y + 1, 4, 7, i <= rank ? cols[i] : P.G3); rect(x + 1 + i * 4, y + 1, 4, 1, i <= rank ? P.W : P.W); rect(x + 4 + i * 4, y + 1, 1, 7, P.K); }
}
