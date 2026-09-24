// ===================================================================
// ART 04d: city pictures (a landmark for every city), the hotel lobby,
// enemy building exteriors and the binocular stake-out view.
// Everything is EGA-16, hand-placed rects/pixels + ordered dither.
// ===================================================================
const ctX_T = 'rgba(0,0,0,0)';
const ctX_now = () => performance.now() / 1000;
function ctX_rng(s) { let x = 7; for (const ch of String(s)) x = (Math.imul(x, 31) + ch.charCodeAt(0)) | 0; x = ((x >>> 0) % 2147483646) + 1; return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }
// transparent dither (only lays the second colour)
function ctX_td(x, y, w, h, c, lvl) { dither(x, y, w, h, ctX_T, c, lvl); }
// symmetric triangle: apex at (cx, top), h rows, half-base hb
function ctX_tri(cx, top, h, hb, c) { for (let i = 0; i < h; i++) { const hw = Math.round(hb * (i + 1) / h); rect(cx - hw, top + i, hw * 2 + 1, 1, c); } }
// upper half-ellipse sitting on row by (dome)
function ctX_dome(cx, by, r, c, rx, shade, ribs) {
  rx = rx || r;
  for (let i = 0; i <= r; i++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (i / (r + 0.6)) ** 2)));
    rect(cx - w, by - i, w * 2 + 1, 1, c);
    if (ribs && i < r - 1) for (const d of ribs) if (Math.abs(d) < w - 1) px(cx + Math.round(d * w / rx), by - i, ribs.col);
    if (shade) { const s = Math.ceil(w * 0.35); rect(cx + s, by - i, w - s + 1, 1, shade); if (w > 2) px(cx + s - 1, by - i, (i & 1) ? shade : c); }
  }
}
function ctX_ell(cx, cy, rx, ry, c) { for (let i = -ry; i <= ry; i++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (i / (ry + 0.5)) ** 2))); rect(cx - w, cy + i, w * 2 + 1, 1, c); } }
// dithered ellipse (for foliage highlights / clouds)
function ctX_ellD(cx, cy, rx, ry, c, lvl) {
  g.fillStyle = c;
  for (let i = -ry; i <= ry; i++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (i / (ry + 0.5)) ** 2))); const yy = cy + i; for (let xx = cx - w; xx <= cx + w; xx++) if (BAYER[(yy & 3) * 4 + (xx & 3)] < lvl) g.fillRect(xx, yy, 1, 1); }
}
// filled columns x0..x1 of height hfn(x) (ground at y=0), optionally dithered with c2 inside the shape only
function ctX_cols(x0, x1, hfn, c, c2, lvl) {
  for (let xx = x0; xx < x1; xx++) { const hh = Math.round(hfn(xx)); if (hh <= 0) continue; rect(xx, -hh, 1, hh, c); if (c2) { g.fillStyle = c2; for (let yy = -hh; yy < 0; yy++) if (BAYER[(yy & 3) * 4 + (xx & 3)] < lvl) g.fillRect(xx, yy, 1, 1); } }
}
// string sprites: rows of chars mapped to colours ('.' = transparent), cached
function ctX_spr(key, rows, map) {
  return sprite('ctXs' + key, rows[0].length, rows.length, () => {
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const c = map[r[x]]; if (c) px(x, y, c); } });
  });
}
function ctX_blit(c, x, y, flip) { if (flip) { g.save(); g.translate(x + c.width, y); g.scale(-1, 1); g.drawImage(c, 0, 0); g.restore(); } else g.drawImage(c, x | 0, y | 0); }

// ---------------------------------------------------------------
// CITY PICTURES
// ---------------------------------------------------------------
function ctX_pal(n) {
  return n ? { n, st: P.G3, sm: P.G1, sd: P.BL, dk: P.K, win: P.YE, gold: P.YE, roof: P.G1, glass: P.BL, sky: P.K, lit: P.YE }
           : { n, st: P.W, sm: P.G3, sd: P.G1, dk: P.K, win: P.G1, gold: P.YE, roof: P.RD, glass: P.TL, sky: P.BL2, lit: P.W };
}
function ctX_sky(w, h, night, kind) {
  if (night) {
    vgrad(0, 0, w, h, [P.K, P.K, P.K, P.BL]);
    const r = ctX_rng('stars' + w + h); for (let i = 0; i < w * h / 90; i++) px(r() * w | 0, r() * h * 0.6 | 0, r() < 0.25 ? P.W : r() < 0.5 ? P.G3 : P.G1);
    const mx = Math.round(w * 0.82), my = Math.round(h * 0.16), mr = h > 100 ? 7 : 4;
    disc(mx, my, mr, P.W); disc(mx + 2, my - 1, mr - 1, P.K); px(mx - mr + 1, my + 1, P.G3);
  } else if (kind === 'gray') vgrad(0, 0, w, h, [P.G1, P.G3, P.G3, P.W]);
  else if (kind === 'hazy') vgrad(0, 0, w, h, [P.BL2, P.CY, P.W]);
  else vgrad(0, 0, w, h, [P.BL, P.BL2, P.CY]);
}
// distant mountains: peaks = [[xFrac, height, halfWidth], ...]
function ctX_mtn(DW, base, peaks, col, top, snow, seed, dk) {
  const r = ctX_rng(seed || 'm');
  let j = 0;
  for (let xx = 0; xx < DW; xx++) {
    if (r() < 0.4) j = clamp(j + (r() < 0.5 ? -1 : 1), -1, 1);
    let hh = 0, ph = 1;
    for (const [fx, pk, hw] of peaks) { const d = Math.abs(xx - fx * DW); const v = pk * (1 - d / hw); if (v > hh) { hh = v; ph = pk; } }
    hh = Math.round(hh) + (hh > 2 ? j : 0); if (hh <= 0) continue;
    rect(xx, base - hh, 1, hh, col);
    if (dk) { g.fillStyle = dk; for (let yy = base - hh; yy < base; yy++) if (BAYER[(yy & 3) * 4 + (xx & 3)] < 9) g.fillRect(xx, yy, 1, 1); }
    if (top) { const lit = xx % 2 ? 2 : 1; rect(xx, base - hh, 1, Math.min(lit, hh), top); }
    if (snow && hh > ph * 0.72) rect(xx, base - hh, 1, Math.max(1, Math.round((hh - ph * 0.72) * 0.9)), snow);
  }
}
// background town, one of several regional styles
function ctX_skyline(DW, base, S, night, seed) {
  const r = ctX_rng(seed), style = S.style || 'euro', mx = S.skyH || 14;
  const DAY = { euro: [P.G3, P.G3, P.W], paris: [P.W, P.W, P.G3], arab: [P.W, P.G3, P.G3], modern: [P.G3, P.TL, P.W, P.BL2], colonial: [P.PK, P.CY, P.W, P.YE, P.GR2, P.W], us: [P.G3, P.W, P.TL, P.G3] };
  let x = -2 - (r() * 5 | 0);
  while (x < DW) {
    let kind = style;
    if (style === 'mix') kind = r() < 0.45 ? 'modern' : 'colonial';
    if (style === 'us') kind = r() < 0.6 ? 'modern' : 'us';
    const tall = kind === 'modern';
    const bw = tall ? 5 + (r() * 7 | 0) : 6 + (r() * 9 | 0);
    const bh = Math.max(3, tall ? Math.round(mx * (0.55 + r() * 0.9)) : Math.round(mx * (0.35 + r() * 0.6)));
    const top = base - bh, cols = DAY[kind] || DAY.euro;
    const face = night ? (r() < 0.55 ? P.G1 : P.BL) : cols[r() * cols.length | 0];
    const shade = night ? P.K : face === P.W ? P.G3 : face === P.TL ? P.BL : P.G1;
    // roofs first (so the facade overlaps their foot)
    if (kind === 'euro' || kind === 'colonial') { const rc = night ? P.K : kind === 'colonial' ? P.RD : [P.RD, P.BR, P.G1][r() * 3 | 0]; if (r() < 0.7) ctX_tri(x + (bw >> 1), top - 3, 3, bw >> 1, rc); else rect(x, top - 1, bw, 1, rc); if (r() < 0.5) rect(x + 1 + (r() * (bw - 3) | 0), top - 5, 1, 3, night ? P.K : P.BR); }
    if (kind === 'paris') { rect(x, top - 3, bw, 3, night ? P.K : P.G1); for (let d = x + 1; d < x + bw - 1; d += 3) px(d, top - 2, night ? P.YE : P.W); rect(x + 1, top - 5, 2, 2, night ? P.K : P.BR); }
    if (kind === 'arab') { if (r() < 0.25) ctX_dome(x + (bw >> 1), top - 1, 3, night ? P.G1 : P.W, 3, night ? P.K : P.G3); else if (r() < 0.25) { rect(x + 1, top - 12, 2, 12, face); px(x + 1, top - 13, face); rect(x, top - 8, 4, 1, shade); } else if (r() < 0.4) rect(x + 2, top - 2, 3, 2, night ? P.K : P.G1); }
    if (kind === 'modern' && r() < 0.35) { rect(x + (bw >> 1), top - 4, 1, 4, night ? P.G1 : P.G1); }
    rect(x, top, bw, bh, face); rect(x + bw - 1, top, 1, bh, shade);
    const sx = 2, sy = tall ? 2 : 3;
    for (let wy = top + 2; wy < base - 1; wy += sy) for (let wx = x + 1; wx < x + bw - 1; wx += sx) {
      if (night) { if (r() < 0.32) px(wx, wy, r() < 0.8 ? P.YE : P.W); }
      else px(wx, wy, face === P.TL ? P.CY : face === P.BL2 ? P.BL : face === P.W ? P.G3 : P.G1);
    }
    x += bw + (r() < 0.25 ? 1 : 0) - (r() < 0.35 ? 2 : 0);
  }
}
// ---- trees ----
function ctX_tree(x, b, kind, n, s = 1) {
  if (kind === 'palm') {
    const hgt = 11 + s * 3;
    for (let i = 0; i < hgt; i++) px(x + (i > hgt * 0.5 ? 1 : 0) + (i > hgt * 0.85 ? 1 : 0), b - 1 - i, i % 2 ? P.BR : n ? P.G1 : P.YE);
    const tx = x + 2, ty = b - hgt - 1, leaf = n ? P.GR : P.GR, hl = n ? P.G1 : P.GR2;
    for (const [dx, len] of [[-1, 6], [1, 6], [-1, 4], [1, 4], [0, 3]]) {
      for (let j = 1; j <= len + s; j++) { const yy = ty + (len === 4 ? -Math.round(j * 0.6) + Math.round(j * j / 10) : Math.round(j * j / 9) - 1); px(tx + dx * j, yy, j % 2 ? leaf : hl); if (len === 6 && j > 2) px(tx + dx * j, yy + 1, leaf); }
    }
    px(tx, ty - 3, leaf); px(tx, ty - 2, hl); px(tx - 1, ty, P.BR); px(tx + 1, ty, P.BR);
  } else if (kind === 'pine') { // Roman umbrella pine
    line(x, b - 1, x + 2, b - 12 - s, P.BR); px(x + 1, b - 8, P.BR); line(x + 2, b - 9, x - 2, b - 12 - s, P.BR);
    ctX_ell(x + 1, b - 14 - s, 8 + s, 2, P.GR); ctX_ellD(x, b - 15 - s, 7 + s, 1, n ? P.G1 : P.GR2, 7); rect(x - 5, b - 12 - s, 12, 1, n ? P.K : P.GR);
  } else if (kind === 'cypress') {
    rect(x, b - 2, 1, 2, P.BR); for (let i = 0; i < 14 + s * 2; i++) { const w = i < 3 ? 1 : i > 11 ? 0 : 1; rect(x - w, b - 2 - i, w * 2 + 1, 1, P.GR); } px(x - 1, b - 10, n ? P.K : P.GR2); px(x, b - 6, n ? P.K : P.GR2);
  } else {
    rect(x, b - 4, 1, 4, P.BR); px(x + 1, b - 3, P.BR);
    ctX_ell(x, b - 8, 4 + s, 4, n ? P.GR : P.GR); ctX_ellD(x - 1, b - 9, 3 + s, 3, n ? P.K : P.GR2, n ? 6 : 7); ctX_ellD(x + 2, b - 6, 3, 2, P.K, 4);
  }
}
function ctX_trees(S, DW, base, n) {
  if (!S.trees) return;
  const kinds = [].concat(S.trees), xs = S.treeX || [5, DW - 6];
  xs.forEach((fx, i) => ctX_tree(Math.round(fx < 1 && fx > 0 ? fx * DW : fx < 0 ? DW + fx : fx), base, kinds[i % kinds.length], n, DW > 100 ? 1 : 1));
}
// ---- foreground strips ----
function ctX_fg(S, DW, DH, base, n, sb) {
  const kind = S.fg || 'street';
  if (kind === 'street' && sb > base) { // a lawn / plaza between the landmark and the street (large pictures)
    rect(0, base, DW, sb - base, n ? P.K : P.GR); ctX_td(0, base, DW, sb - base, n ? P.GR : P.GR2, n ? 3 : 5);
    rect(0, base, DW, 1, n ? P.G1 : P.G3); rect(0, sb - 3, DW, 2, n ? P.G1 : P.G3); ctX_td(0, sb - 3, DW, 2, n ? P.K : P.W, 5);
    for (let xx = 3; xx < DW; xx += 7) { rect(xx, sb - 6, 4, 3, n ? P.K : P.GR); px(xx + 1, sb - 6, n ? P.GR : P.GR2); }
    base = sb;
  }
  if (kind === 'water') {
    rect(0, base, DW, DH - base, n ? P.K : P.BL);
    const r = ctX_rng('w' + DW);
    for (let yy = base + 1; yy < DH; yy++) for (let i = 0; i < DW / 6; i++) { const xx = r() * DW | 0, l = 1 + (r() * 3 | 0); rect(xx, yy, l, 1, n ? (r() < 0.15 ? P.YE : P.BL) : (r() < 0.5 ? P.BL2 : P.CY)); }
    rect(0, base, DW, 1, n ? P.BL : P.BL2);
  } else if (kind === 'sand') {
    dither(0, base, DW, DH - base, n ? P.BR : P.YE, n ? P.G1 : P.BR, n ? 6 : 4);
    const r = ctX_rng('s' + DW); for (let i = 0; i < DW / 4; i++) px(r() * DW | 0, base + (r() * (DH - base) | 0), n ? P.K : P.W);
  } else {
    rect(0, base, DW, 1, n ? P.G1 : P.G3); rect(0, base + 1, DW, 1, n ? P.K : P.G1);
    rect(0, base + 2, DW, DH - base - 2, n ? P.K : P.G1); ctX_td(0, base + 2, DW, DH - base - 2, n ? P.G1 : P.K, 3);
    for (let xx = 2; xx < DW; xx += 8) rect(xx, base + 5, 4, 1, n ? P.G3 : P.W);
    if (S.wall) { rect(0, base, DW, 1, n ? P.G3 : P.W); }
  }
}

// ---------------- landmarks (origin = centre of the ground line; y up is negative) ----------------
const ctX_LM = {
  WAS(p) {
    // Washington Monument behind, then the Capitol
    rect(-33, -36, 3, 36, p.sm); rect(-33, -36, 2, 36, p.st); px(-32, -37, p.st); px(-33, -34, p.sm);
    rect(-38, -11, 76, 11, p.st); rect(-38, -12, 76, 1, p.sm); rect(-38, -2, 76, 2, p.sm);
    for (let i = -36; i < 37; i += 3) { rect(i, -10, 1, 8, p.sm); if (p.n) px(i + 1, -7, p.win); }
    ctX_tri(-26, -15, 3, 7, p.st); ctX_tri(26, -15, 3, 7, p.st);
    rect(-12, -17, 25, 17, p.st); for (let i = -11; i < 13; i += 3) rect(i, -15, 1, 11, p.sm);
    ctX_tri(0, -22, 5, 13, p.st); rect(-13, -17, 27, 1, p.sm);
    rect(-10, -27, 21, 5, p.st); for (let i = -9; i < 11; i += 2) rect(i, -26, 1, 4, p.sm); rect(-11, -28, 23, 1, p.sm);
    ctX_dome(0, -29, 8, p.st, 9, p.sm); rect(-9, -30, 19, 1, p.sm); for (let i = -6; i < 6; i += 2) px(i, -32, p.sm);
    rect(-2, -38, 5, 2, p.st); px(0, -39, p.sm); px(0, -40, p.sm);
    rect(-9, -2, 19, 2, p.st);
  },
  LON(p) {
    const g1 = p.n ? P.BR : P.BR, g2 = P.YE;
    // Parliament
    rect(-20, -13, 52, 13, g1); ctX_td(-20, -13, 52, 13, g2, p.n ? 7 : 5);
    rect(-20, -15, 52, 2, p.n ? P.G1 : P.G1);
    for (let i = -20; i < 32; i += 3) { rect(i, -17, 1, 4, g1); px(i, -18, g2); }
    for (let i = -18; i < 31; i += 2) { rect(i, -11, 1, 3, p.n ? P.YE : P.K); rect(i, -6, 1, 3, p.n ? (i % 4 ? P.YE : P.BR) : P.K); }
    // central spire and Victoria Tower
    ctX_tri(6, -26, 10, 1, P.G1);
    rect(24, -26, 9, 26, g1); ctX_td(24, -26, 9, 26, g2, 6); rect(32, -26, 1, 26, P.BR);
    for (const cx of [24, 32]) rect(cx, -29, 1, 3, g1); rect(24, -27, 9, 1, P.BR);
    for (let yy = -23; yy < -2; yy += 4) rect(26, yy, 1, 2, P.K), rect(29, yy, 1, 2, P.K);
    rect(28, -34, 1, 5, P.G1); rect(29, -34, 3, 2, P.RD); px(30, -33, P.W);
    // Elizabeth Tower (Big Ben)
    rect(-30, -24, 8, 24, g1); ctX_td(-30, -24, 8, 24, g2, 6); rect(-23, -24, 1, 24, P.BR);
    for (let yy = -22; yy < 0; yy += 3) px(-28, yy, P.BR), px(-25, yy, P.BR);
    rect(-31, -31, 10, 8, g2); rect(-31, -31, 10, 1, P.BR); rect(-31, -23, 10, 1, P.BR);
    disc(-26, -27, 3, p.n ? P.YE : P.W); px(-26, -28, P.K); px(-26, -29, P.K); px(-25, -27, P.K);
    rect(-30, -35, 8, 4, g1); rect(-29, -34, 1, 2, P.K); rect(-27, -34, 2, 2, P.K); rect(-24, -34, 1, 2, P.K);
    ctX_tri(-26, -41, 6, 4, P.G1); ctX_td(-30, -40, 9, 5, g2, 3); px(-26, -42, g2);
  },
  PAR(p) {
    const c = p.n ? P.YE : P.BR, s = p.n ? P.BR : P.G1;
    for (let yy = 0; yy < 39; yy++) {
      const y = -1 - yy;
      let hw = yy < 10 ? 13 - yy * 0.8 : yy < 22 ? 5 - (yy - 10) * 0.25 : 2 - (yy - 22) * 0.1; hw = Math.max(0, Math.round(hw));
      const gap = yy < 8 ? Math.round(Math.sqrt(Math.max(0, 1 - (yy / 8.5) ** 2)) * (hw - 3)) : -1;
      for (let xx = -hw; xx <= hw; xx++) {
        if (gap >= 0 && Math.abs(xx) <= gap) continue;
        const edge = xx === -hw || xx === hw || (gap >= 0 && Math.abs(xx) === gap + 1);
        if (!edge && hw > 1 && BAYER[(y & 3) * 4 + (xx & 3)] < (yy < 22 ? 6 : 3)) continue;
        px(xx, y, xx > 0 && (edge || xx >= hw - 1) ? s : c);
      }
    }
    rect(-8, -10, 17, 1, s); rect(-7, -11, 15, 1, c); rect(-5, -23, 11, 1, s); rect(-4, -24, 9, 1, c); rect(0, -42, 1, 4, c); px(0, -43, P.W);
  },
  ROM(p) {
    const st = p.n ? P.YE : P.W, sm = p.n ? P.BR : P.G3, arch = p.n ? P.K : P.BR, deep = p.n ? P.RD : P.G1;
    const top = xx => xx < 10 ? 30 : xx < 16 ? 26 - ((xx * 7) % 3) : xx < 24 ? 19 - ((xx * 5) % 3) : 13 - ((xx * 3) % 2);
    ctX_cols(-32, 33, xx => top(xx) - Math.round(((xx / 32) ** 2) * 3), st, p.n ? P.BR : P.YE, 3); ctX_cols(19, 33, xx => top(xx) - Math.round(((xx / 32) ** 2) * 3), sm, p.n ? P.RD : P.W, 2); ctX_cols(-32, -26, xx => top(xx) - 3, sm, null);
    for (let tier = 0; tier < 3; tier++) {
      const y0 = -8 * tier - 7;
      for (let xx = -30; xx < 31; xx += 5) {
        const bend = Math.round(((xx / 32) ** 2) * 3); if (-y0 + 1 > top(xx) - bend - 1) continue;
        rect(xx, y0 + 1, 3, 5, arch); px(xx, y0 + 1, xx > 18 ? sm : st); px(xx + 2, y0 + 1, xx > 18 ? sm : st); rect(xx + 1, y0 + 3, 1, 3, deep);
      }
      rect(-32, y0 - 1, 51, 1, sm);
    }
    for (let xx = -30; xx < 8; xx += 7) rect(xx, -28, 2, 2, arch);
    rect(-32, -1, 65, 1, sm);
  },
  CAI(p) {
    const lit = p.n ? P.G3 : P.YE, sh = p.n ? P.G1 : P.BR, ln = p.n ? P.G1 : P.BR;
    const pyr = (cx, hgt, hb) => { for (let i = 0; i < hgt; i++) { const hw = Math.round(hb * (i + 1) / hgt); rect(cx - hw, -hgt + i, hw, 1, lit); rect(cx, -hgt + i, hw + 1, 1, sh); if (i % 3 === 2) for (let xx = cx - hw + 1; xx < cx; xx += 2) px(xx, -hgt + i, ln); } px(cx, -hgt - 1, lit); };
    pyr(38, 12, 10); pyr(18, 20, 17); pyr(-10, 28, 25);
    // the Sphinx
    rect(-40, -4, 12, 4, sh); ctX_td(-40, -4, 12, 4, lit, 8); rect(-31, -8, 3, 4, lit); rect(-32, -7, 2, 5, sh); px(-29, -7, P.K); rect(-42, -2, 3, 2, lit);
  },
  IST(p) {
    const st = p.st, sm = p.sm, lead = p.n ? P.G1 : P.G3, lsh = p.n ? P.BL : P.G1, cap = p.n ? P.G1 : P.G3;
    const minaret = (x, h) => { rect(x, -h, 2, h, st); px(x + 1, -h, sm); for (const f of [0.45, 0.65, 0.8]) rect(x - 1, -Math.round(h * f), 4, 1, sm); ctX_tri(x, -h - 6, 5, 1, cap); rect(x + 1, -h - 5, 1, 5, cap); px(x, -h - 7, p.gold); };
    minaret(-38, 22); minaret(36, 22);
    rect(-28, -10, 56, 10, st); ctX_td(-28, -10, 56, 10, sm, 3);
    for (let i = -25; i < 26; i += 5) { rect(i, -7, 2, 3, P.K); px(i, -7, st); }
    for (const [cx, by, r, rx] of [[-21, -10, 3, 4], [21, -10, 3, 4], [-14, -14, 4, 6], [14, -14, 4, 6], [-7, -16, 4, 6], [7, -16, 4, 6]]) { rect(cx - rx, by, rx * 2 + 1, -by - 10 || 1, st); ctX_dome(cx, by, r, lead, rx, lsh); px(cx, by - r - 1, p.gold); }
    rect(-11, -21, 23, 4, st); for (let i = -10; i < 11; i += 2) px(i, -19, P.K);
    ctX_dome(0, -22, 8, lead, 11, lsh); rect(0, -34, 1, 3, p.gold); px(-1, -33, p.gold);
    minaret(-30, 31); minaret(28, 31);
  },
  BER(p) {
    const st = p.st, sm = p.sm;
    // TV tower
    rect(20, -14, 4, 14, p.n ? P.G1 : P.G3); rect(21, -30, 2, 16, p.n ? P.G1 : P.G3); rect(23, -30, 1, 30, p.n ? P.BL : P.G1);
    ctX_ell(22, -31, 4, 4, p.n ? P.G1 : P.G3); ctX_ellD(23, -31, 3, 3, p.n ? P.BL : P.W, 6); rect(18, -31, 9, 1, p.n ? P.YE : P.G1); px(21, -33, P.W);
    for (let yy = -41; yy < -35; yy++) px(22, yy, yy % 2 ? P.RD : P.W);
    // the Wall
    for (let xx = 2; xx < 60; xx++) { rect(xx, -5, 1, 5, xx % 4 === 0 ? P.G3 : p.n ? P.G1 : P.W); px(xx, -6, p.n ? P.G3 : P.W); }
    rect(38, -13, 3, 8, P.G3); rect(37, -16, 5, 3, P.G1); rect(37, -15, 5, 1, p.n ? P.YE : P.CY);
    // Brandenburg Gate
    rect(-35, -10, 5, 10, st); rect(3, -10, 5, 10, st);
    rect(-30, -3, 33, 3, sm);
    for (let i = 0; i < 6; i++) { rect(-29 + i * 6, -15, 2, 12, st); px(-28 + i * 6, -15, sm); }
    for (let i = 0; i < 5; i++) rect(-27 + i * 6, -15, 4, 12, p.n ? P.K : P.G1);
    rect(-31, -18, 35, 3, st); rect(-31, -16, 35, 1, sm); rect(-22, -21, 17, 3, st); rect(-22, -19, 17, 1, sm);
    const cu = p.n ? P.TL : P.GR;
    rect(-17, -23, 7, 2, cu); for (const hx of [-18, -16, -12, -10]) { px(hx, -24, cu); px(hx, -21, cu); } px(-14, -26, cu); rect(-14, -25, 1, 2, cu); px(-13, -26, cu);
  },
  VIE(p) {
    const st = p.n ? P.G3 : P.G3, sm = P.G1;
    // Riesenrad (the rim; cabins turn in the live layer)
    const hx = -26, hy = -16, R = 12;
    line(hx, hy, hx - 7, -1, P.G1); line(hx, hy, hx + 7, -1, P.G1); line(hx - 1, hy, hx - 8, -1, P.G1); line(hx + 1, hy, hx + 8, -1, P.G1);
    for (let a = 0; a < 64; a++) { const an = a / 64 * Math.PI * 2; px(Math.round(hx + Math.cos(an) * R), Math.round(hy + Math.sin(an) * R), p.n ? P.RD2 : P.RD); }
    // Stephansdom: nave and its patterned roof
    rect(-4, -10, 36, 10, st); ctX_td(-4, -10, 36, 10, sm, 3);
    for (let i = -2; i < 31; i += 4) { rect(i, -8, 1, 5, P.K); px(i, -8, st); }
    for (let r = 0; r < 9; r++) { const y = -11 - r; rect(-3 + r, y, 34 - r * 2, 1, p.n ? P.G1 : P.K); for (let xx = -3 + r; xx < 31 - r; xx++) { const z = ((xx + r * 2) % 8 + 8) % 8; if (z === 0 || z === 1) px(xx, y, P.YE); else if (z === 4 || z === 5) px(xx, y, p.n ? P.TL : P.GR); else if (z === 2) px(xx, y, P.W); } }
    // the Steffl spire
    rect(-10, -20, 7, 20, st); rect(-4, -20, 1, 20, sm); for (let yy = -18; yy < -2; yy += 5) rect(-8, yy, 1, 3, P.K), rect(-6, yy, 1, 3, P.K);
    for (let i = 0; i < 19; i++) { const hw = Math.round(3.5 * (1 - i / 19)); rect(-7 - hw, -21 - i, hw * 2 + 1, 1, i % 3 ? st : sm); if (i % 3 === 0 && hw > 0) { px(-8 - hw, -21 - i, st); px(-6 + hw, -21 - i, st); } }
    px(-7, -41, P.YE);
  },
  MAD(p) {
    const st = p.st, sm = p.sm;
    // Metropolis building behind
    rect(20, -24, 13, 24, st); rect(31, -24, 2, 24, sm); for (let yy = -21; yy < -2; yy += 4) for (let xx = 22; xx < 31; xx += 3) rect(xx, yy, 1, 2, p.n ? P.YE : P.G1);
    ctX_dome(26, -25, 5, P.K, 6); for (const dx of [-3, 0, 3]) px(26 + dx, -27 + (dx ? 0 : -2), P.YE); rect(26, -34, 1, 4, P.YE); px(24, -33, P.YE); px(25, -32, P.YE); px(27, -32, P.YE); px(28, -33, P.YE);
    // Puerta de Alcala
    rect(-28, -16, 44, 16, st); rect(-29, -17, 46, 1, sm); rect(-28, -1, 44, 1, sm);
    for (const cx of [-14, -6, 2]) { rect(cx - 2, -10, 5, 10, p.n ? P.K : P.G1); ctX_dome(cx, -10, 2, p.n ? P.K : P.G1, 2); rect(cx - 2, -11, 5, 1, sm); }
    for (const cx of [-23, 11]) rect(cx - 1, -9, 4, 9, p.n ? P.K : P.G1);
    for (const cx of [-26, -18, -10, -2, 6, 14]) rect(cx, -15, 1, 14, sm);
    rect(-13, -21, 14, 4, st); rect(-13, -21, 14, 1, sm); rect(-9, -24, 6, 3, p.n ? P.G1 : P.G3); px(-6, -25, p.gold); px(-7, -25, p.gold);
    for (const cx of [-26, 13]) rect(cx, -20, 2, 3, p.n ? P.G1 : P.G3);
  },
  MRS(p) {
    const hill = p.n ? P.G1 : P.GR, rock = p.n ? P.K : P.BR;
    ctX_cols(-50, 14, xx => 16 - ((xx + 18) ** 2) / 70, hill, rock, 5); ctX_cols(-50, 14, xx => 13 - ((xx + 18) ** 2) / 60, hill, p.n ? P.G1 : P.GR2, 2);
    // Notre-Dame de la Garde, striped stone
    rect(-27, -22, 16, 6, p.st); for (let yy = -22; yy < -16; yy += 2) rect(-27, yy, 16, 1, p.sm);
    ctX_dome(-23, -22, 2, p.sm, 3); ctX_dome(-16, -22, 2, p.sm, 2);
    rect(-14, -32, 5, 16, p.st); for (let yy = -31; yy < -16; yy += 2) rect(-14, yy, 5, 1, p.sm); rect(-13, -29, 1, 2, P.K); rect(-11, -29, 1, 2, P.K);
    rect(-12, -36, 1, 4, P.YE); px(-13, -35, P.YE); px(-11, -35, P.YE); px(-12, -37, P.YE);
    // masts in the Vieux-Port
    for (const mx of [-6, -2, 3, 8, 14, 19, 26, 31, 37]) { rect(mx, -14 + (mx * 3) % 5, 1, 14 - (mx * 3) % 5, p.n ? P.G1 : P.G3); }
  },
  BON(p) {
    const st = p.n ? P.G3 : P.G3, sl = P.G1;
    // Langer Eugen
    rect(20, -34, 12, 34, p.n ? P.G1 : P.G3); for (let yy = -32; yy < -1; yy += 2) { rect(20, yy, 12, 1, p.n ? P.K : P.BL); if (p.n) for (let xx = 21; xx < 31; xx += 2) if ((xx * 13 + yy * 7) % 5 < 2) px(xx, yy, P.YE); } rect(31, -34, 1, 34, p.n ? P.K : P.G1);
    // Minster
    rect(-24, -10, 36, 10, st); ctX_td(-24, -10, 36, 10, P.W, p.n ? 0 : 6);
    for (let i = -22; i < 11; i += 4) { rect(i, -8, 2, 5, P.K); px(i, -8, st); px(i + 1, -8, st); }
    for (let r = 0; r < 5; r++) rect(-24 + r, -11 - r, 36 - r * 2, 1, sl);
    rect(-10, -26, 9, 16, st); rect(-2, -26, 1, 16, P.G1); for (const yy of [-24, -18]) for (const xx of [-9, -6, -4]) rect(xx, yy, 1, 3, P.K);
    ctX_tri(-6, -38, 12, 4, sl); px(-6, -39, P.YE);
    for (const [tx, th] of [[-22, 16], [6, 18]]) { rect(tx, -th, 4, th - 8, st); ctX_tri(tx + 1, -th - 6, 6, 2, sl); px(tx + 1, -th - 1, P.K); }
  },
  BEG(p) {
    const hill = p.n ? P.G1 : P.GR, wall = p.n ? P.G1 : P.G3, wd = p.n ? P.K : P.BR;
    ctX_cols(-50, 4, xx => 9 - ((xx + 22) ** 2) / 90, hill, p.n ? P.K : P.GR2, 3);
    rect(-40, -14, 34, 6, wall); ctX_td(-40, -14, 34, 6, wd, 5); for (let xx = -40; xx < -6; xx += 2) px(xx, -15, wall);
    rect(-28, -19, 7, 11, wall); ctX_td(-28, -19, 7, 11, wd, 4); for (let xx = -28; xx < -21; xx += 2) px(xx, -20, wall); rect(-26, -12, 3, 4, P.K);
    // the Pobednik on its column
    rect(-12, -12, 6, 4, p.st); rect(-11, -31, 4, 19, p.st); rect(-8, -31, 1, 19, p.sm); rect(-12, -32, 6, 1, p.sm);
    const br = p.n ? P.TL : P.GR; rect(-10, -37, 2, 5, br); px(-9, -38, br); px(-7, -37, br); px(-6, -38, br); px(-11, -35, br); px(-12, -36, P.G3);
    // Genex tower
    const cn = p.n ? P.G1 : P.G3; rect(16, -28, 6, 28, cn); rect(27, -34, 6, 34, cn);
    for (let yy = -26; yy < -1; yy += 2) { px(18, yy, p.n && yy % 3 ? P.YE : P.K); px(20, yy, P.K); px(29, yy, P.K); px(31, yy, p.n && yy % 5 ? P.YE : P.K); }
    rect(21, -29, 7, 3, cn); rect(21, -27, 7, 1, P.K); ctX_ell(30, -36, 4, 1, p.n ? P.G3 : P.G1); rect(30, -40, 1, 3, P.G1);
  },
  MIA(p) {
    const n = p.n, pal = n ? [P.MG, P.TL, P.BR] : [P.PK, P.CY, P.YE], tr = n ? P.G3 : P.W;
    const hotel = (x0, w, h, c, neon) => {
      rect(x0, -h, w, h, c); rect(x0 + w - 1, -h, 1, h, n ? P.K : P.G3);
      for (let yy = -h + 4; yy < -2; yy += 4) { rect(x0, yy - 1, w, 1, tr); for (let xx = x0 + 2; xx < x0 + w - 2; xx += 3) rect(xx, yy, 2, 2, n ? ((xx + yy) % 3 ? P.YE : P.K) : P.BL); }
      const cx = x0 + (w >> 1); rect(cx - 3, -h - 5, 7, 5, c); rect(cx - 1, -h - 9, 3, 4, c); rect(cx - 3, -h - 1, 7, 1, tr); rect(cx, -h - 11, 1, 2, tr);
      rect(x0 + 2, -h - 1, w - 4, 1, n ? neon : tr);
      if (n) { rect(x0, -h, 1, h, neon); rect(cx, -h - 9, 1, 7, neon); }
      rect(cx - 2, -3, 5, 3, n ? P.YE : P.K);
    };
    hotel(-38, 22, 18, pal[0], P.PK); hotel(-14, 26, 22, n ? P.G3 : P.W, P.CY); hotel(14, 22, 16, pal[2], P.PK);
    rect(-14, -22, 26, 1, pal[1]); rect(-14, -14, 26, 1, pal[1]);
  },
  MEX(p) {
    // Torre Latinoamericana
    rect(20, -30, 10, 30, p.n ? P.BL : P.TL); for (let yy = -29; yy < -1; yy += 2) for (let xx = 21; xx < 29; xx += 2) px(xx, yy, p.n ? ((xx + yy * 3) % 4 ? P.K : P.YE) : P.CY);
    rect(29, -30, 1, 30, p.n ? P.K : P.BL); rect(21, -33, 8, 3, p.n ? P.BL : P.TL); rect(23, -35, 4, 2, p.n ? P.G1 : P.G3); rect(24, -40, 2, 5, P.G1); px(24, -41, P.G1);
    // El Angel
    rect(-16, -6, 14, 6, p.st); rect(-16, -6, 14, 1, p.sm); for (const cx of [-15, -4]) rect(cx, -9, 2, 3, p.n ? P.G1 : P.G1);
    rect(-11, -30, 4, 24, p.st); rect(-8, -30, 1, 24, p.sm); for (let yy = -26; yy < -8; yy += 5) rect(-11, yy, 4, 1, p.sm); rect(-12, -31, 6, 1, p.sm);
    const au = P.YE; rect(-10, -35, 2, 4, au); px(-9, -36, au); px(-9, -37, au); for (let i = 1; i < 4; i++) { px(-10 - i, -35 + (i >> 1), au); px(-7 + i, -35 + (i >> 1), au); } px(-8, -38, au);
  },
  HAV(p) {
    // the sea to the right, El Morro on its rock
    rect(4, -9, 80, 9, p.n ? P.K : P.BL); for (let xx = 6; xx < 80; xx += 5) px(xx, -6 + (xx % 3), p.n ? P.BL : P.BL2);
    rect(22, -4, 40, 4, p.n ? P.K : P.BR); ctX_td(22, -4, 40, 4, P.G1, 6);
    rect(24, -9, 20, 5, p.n ? P.BR : P.YE); ctX_td(24, -9, 20, 5, P.BR, 6); for (let xx = 24; xx < 44; xx += 2) px(xx, -10, p.n ? P.BR : P.YE);
    rect(36, -26, 4, 17, p.st); rect(39, -26, 1, 17, p.sm); rect(35, -29, 6, 3, P.G1); rect(36, -28, 4, 1, p.n ? P.YE : P.CY); px(37, -30, P.G1); px(38, -30, P.G1);
    // colonial Havana & the Capitolio
    const cols = p.n ? [P.MG, P.TL, P.BR, P.G1] : [P.PK, P.CY, P.YE, P.GR2];
    for (let i = 0; i < 6; i++) { const x0 = -44 + i * 8, hh = 7 + (i * 5) % 5; rect(x0, -hh, 8, hh, cols[i % 4]); rect(x0, -hh - 1, 8, 1, P.RD); for (let xx = x0 + 1; xx < x0 + 7; xx += 3) { rect(xx, -hh + 2, 2, 3, p.n ? P.YE : P.G1); rect(xx - 1, -hh + 5, 4, 1, P.K); } }
    rect(-34, -12, 26, 12, p.st); rect(-34, -13, 26, 1, p.sm); for (let i = -33; i < -8; i += 2) rect(i, -11, 1, 8, p.sm); ctX_tri(-21, -16, 3, 6, p.st);
    rect(-25, -21, 9, 5, p.st); for (let i = -24; i < -16; i += 2) rect(i, -20, 1, 4, p.sm); ctX_dome(-21, -22, 7, p.st, 5, p.sm, Object.assign([-2, 2], { col: p.sm })); rect(-22, -32, 3, 3, p.st); px(-21, -33, p.gold);
  },
  PAN(p) {
    const steel = p.n ? P.G1 : P.G3, dk = p.n ? P.BL : P.G1;
    for (let xx = -40; xx <= 40; xx++) { const y = Math.round(-12 - 17 * (1 - (xx / 36) ** 2)); if (Math.abs(xx) <= 36) { rect(xx, y, 1, 2, steel); if (xx % 3 === 0) rect(xx, y + 2, 1, -12 - (y + 2), dk); } }
    rect(-40, -12, 80, 2, steel); rect(-40, -10, 80, 1, dk);
    for (const px_ of [-36, 36, -24, 24]) rect(px_ - 1, -10, 2, 10, dk);
    if (p.n) for (let xx = -38; xx < 40; xx += 6) px(xx, -13, P.YE);
  },
  BOG(p) {
    // Monserrate with its church
    const m = p.n ? P.K : P.GR;
    const mh = xx => 34 - Math.abs(xx + 14) * 0.9 - (((xx * 7) % 3) + 3) % 3; ctX_cols(-70, 40, mh, m, p.n ? P.BL : P.GR2, 3); ctX_cols(-70, 40, xx => Math.min(mh(xx) - 4, 20), m, p.n ? P.K : P.K, 5);
    rect(-17, -36, 6, 3, P.W); rect(-16, -39, 1, 3, P.W); rect(-12, -39, 1, 3, P.W); line(-11, -35, 10, -12, P.G1);
    // Catedral Primada
    const cr = p.n ? P.G3 : P.W; rect(-22, -15, 24, 15, cr); ctX_td(-22, -15, 24, 15, p.n ? P.G1 : P.YE, 3);
    for (const tx of [-23, -3]) { rect(tx, -23, 6, 8, cr); rect(tx + 2, -21, 2, 3, P.K); ctX_dome(tx + 3, -23, 2, p.n ? P.G1 : P.TL, 3); px(tx + 3, -26, P.YE); }
    ctX_tri(-10, -19, 4, 8, cr); rect(-12, -8, 5, 8, P.K); rect(-11, -9, 3, 1, P.K); rect(-19, -12, 2, 3, P.K); rect(-3, -12, 2, 3, P.K);
    // Colpatria tower
    rect(20, -36, 8, 36, p.n ? P.G1 : P.RD); for (let yy = -35; yy < -1; yy += 2) rect(21, yy, 6, 1, p.n ? ((yy * 3) % 5 ? P.K : P.YE) : P.TL); rect(27, -36, 1, 36, P.K);
  },
  MED(p) {
    const m = p.n ? P.K : P.GR;
    // valley walls covered in brick barrios
    for (let xx = -70; xx < 70; xx++) { const hh = Math.round(10 + Math.abs(xx) * 0.35 + Math.sin(xx * 0.3) * 2); rect(xx, -hh, 1, hh, m); }
    const r = ctX_rng('med'); for (let i = 0; i < 90; i++) { const xx = -70 + (r() * 140 | 0), hh = Math.round(10 + Math.abs(xx) * 0.35); const yy = -1 - (r() * (hh - 1) | 0); rect(xx, yy, 2, 1, p.n ? (r() < 0.5 ? P.YE : P.K) : (r() < 0.6 ? P.RD : P.BR)); }
    // Coltejer building
    rect(0, -26, 11, 26, p.n ? P.G1 : P.W); rect(9, -26, 2, 26, p.n ? P.K : P.G3); for (let xx = 1; xx < 9; xx += 2) rect(xx, -24, 1, 22, p.n ? P.BL : P.G1);
    if (p.n) for (let yy = -23; yy < -2; yy += 3) px(3 + (yy & 2), yy, P.YE);
    for (let i = 0; i < 12; i++) { const hw = Math.round(5 * (1 - i / 12)); rect(5 - hw, -27 - i, hw * 2 + 1, 1, p.n ? P.G1 : P.W); px(5 + hw, -27 - i, p.n ? P.K : P.G3); }
    rect(5, -41, 1, 3, P.G1);
    rect(-24, -18, 9, 18, p.n ? P.BL : P.G3); rect(18, -14, 10, 14, p.n ? P.BL : P.TL);
  },
  LIM(p) {
    const cr = p.n ? P.BR : P.YE, cd = p.n ? P.K : P.BR;
    // Palacio de Gobierno
    rect(12, -10, 30, 10, p.n ? P.G3 : P.YE); ctX_td(12, -10, 30, 10, p.n ? P.G1 : P.W, 7); rect(12, -11, 30, 1, cd); for (let xx = 14; xx < 41; xx += 3) rect(xx, -8, 1, 3, P.K);
    rect(27, -20, 1, 9, P.G1); rect(28, -20, 1, 3, P.RD); rect(29, -20, 1, 3, P.W); rect(30, -20, 1, 3, P.RD);
    // Cathedral
    rect(-20, -14, 28, 14, cr); ctX_td(-20, -14, 28, 14, p.n ? P.G1 : P.W, 5);
    for (const tx of [-24, 6]) { rect(tx, -26, 7, 26, cr); ctX_td(tx, -26, 7, 26, p.n ? P.G1 : P.W, 5); rect(tx + 2, -22, 3, 4, P.K); rect(tx - 1, -18, 9, 1, cd); ctX_dome(tx + 3, -27, 3, P.G1, 3); rect(tx + 3, -33, 1, 3, P.G1); }
    rect(-11, -18, 10, 18, cd); ctX_td(-11, -18, 10, 18, cr, 6); rect(-8, -8, 4, 8, P.K); ctX_dome(-6, -8, 2, P.K, 2); ctX_tri(-6, -21, 3, 5, cd);
    // enclosed wooden balconies
    for (const bx of [-38, -30]) { rect(bx, -12, 7, 12, p.n ? P.G3 : P.W); rect(bx + 1, -9, 5, 4, P.BR); for (let xx = bx + 1; xx < bx + 6; xx += 2) px(xx, -8, P.K); }
  },
  MVD(p) {
    // the brown Rio de la Plata on the right
    rect(6, -6, 80, 6, p.n ? P.K : P.BR); for (let xx = 8; xx < 80; xx += 4) px(xx, -4 + (xx % 3), p.n ? P.BL : P.YE);
    // Palacio Salvo
    const st = p.st, sm = p.sm;
    rect(-20, -18, 26, 18, st); rect(4, -18, 2, 18, sm); for (let yy = -16; yy < -1; yy += 3) for (let xx = -18; xx < 4; xx += 2) px(xx, yy, p.n ? ((xx * yy) % 4 ? P.K : P.YE) : P.G1);
    rect(-14, -27, 14, 9, st); rect(-2, -27, 2, 9, sm); for (let yy = -25; yy < -18; yy += 3) for (let xx = -13; xx < -2; xx += 2) px(xx, yy, P.K);
    rect(-11, -32, 8, 5, st); rect(-4, -32, 1, 5, sm); rect(-10, -30, 1, 2, P.K); rect(-7, -30, 1, 2, P.K);
    ctX_dome(-7, -32, 2, sm, 3); rect(-7, -38, 1, 4, sm); rect(-21, -19, 28, 1, sm);
    for (const bx of [-38, -30]) { rect(bx, -10, 7, 10, p.n ? P.G1 : P.G3); for (let yy = -8; yy < -1; yy += 3) px(bx + 3, yy, P.K); }
  },
  BEY(p) {
    // sea & the Pigeon Rocks
    rect(-70, -8, 36, 8, p.n ? P.K : P.BL); for (let xx = -68; xx < -34; xx += 4) px(xx, -5 + (xx & 1), p.n ? P.BL : P.CY);
    const rk = p.n ? P.G1 : P.YE, rs = p.n ? P.K : P.BR;
    rect(-44, -20, 11, 13, rk); ctX_td(-44, -20, 11, 13, rs, 6); rect(-41, -12, 5, 5, p.n ? P.K : P.BL); ctX_dome(-39, -12, 2, p.n ? P.K : P.BL2, 3); rect(-45, -18, 1, 10, rs);
    // shelled towers
    const cn = p.n ? P.G1 : P.G3;
    rect(2, -34, 13, 34, cn); ctX_td(2, -34, 13, 34, P.G1, 4);
    for (let yy = -32; yy < -1; yy += 3) for (let xx = 3; xx < 14; xx += 2) px(xx, yy, P.K);
    for (const [hx, hy, hw, hh] of [[9, -30, 3, 3], [4, -22, 3, 2], [11, -15, 2, 3], [6, -9, 2, 2]]) rect(hx, hy, hw, hh, P.K);
    rect(12, -34, 3, 4, p.n ? P.K : P.BL2); px(11, -34, p.n ? P.K : P.BL2);
    rect(18, -22, 10, 22, p.n ? P.G1 : P.W); ctX_td(18, -22, 10, 22, P.G1, 5); for (let yy = -20; yy < -1; yy += 3) for (let xx = 19; xx < 27; xx += 3) rect(xx, yy, 2, 1, P.K); rect(24, -22, 4, 5, p.n ? P.K : P.BL2); rect(20, -12, 3, 3, P.K);
    rect(31, -15, 9, 15, cn); ctX_td(31, -15, 9, 15, P.K, 4); rect(35, -15, 5, 3, p.n ? P.K : P.BL2);
    if (p.n) { px(20, -8, P.YE); px(5, -18, P.YE); }
    for (let xx = -20; xx < 44; xx += 3) px(xx, -1, P.G1);
  },
  AMM(p) {
    const h1 = p.n ? P.G1 : P.YE, h2 = p.n ? P.K : P.BR;
    ctX_cols(-60, 18, xx => 18 - ((xx + 16) ** 2) / 70, h1, h2, 6); ctX_cols(10, 70, xx => 4 + (xx - 10) * 0.28, h1, h2, 6);
    // Temple of Hercules
    const cl = p.n ? P.G3 : P.W;
    rect(-24, -19, 18, 2, cl); for (const cx of [-22, -18, -14]) { rect(cx, -30, 2, 11, cl); px(cx + 1, -30, p.sm); } rect(-23, -31, 11, 1, cl); rect(-10, -22, 2, 3, cl); rect(-8, -21, 3, 2, p.sm);
    // white houses stepping up the jebels
    const r = ctX_rng('amm');
    for (let i = 0; i < 46; i++) { const xx = (r() < 0.5 ? -60 : 10) + (r() * 60 | 0), top = xx < 10 ? Math.round(18 - ((xx + 16) ** 2) / 70) : Math.round(4 + (xx - 10) * 0.28); if (top < 3) continue; const yy = -(r() * (top - 2) | 0) - 3; if (xx > -30 && xx < -4 && yy < -14) continue; rect(xx, yy, 4, 3, p.n ? P.G1 : P.W); px(xx + 1, yy + 1, p.n ? (r() < 0.4 ? P.YE : P.K) : P.G1); rect(xx + 3, yy, 1, 3, p.n ? P.K : P.G3); }
  },
  TLV(p) {
    rect(-70, -6, 40, 6, p.n ? P.K : P.BL); for (let xx = -68; xx < -30; xx += 4) px(xx, -4, p.n ? P.BL : P.CY); rect(-70, -1, 40, 1, p.n ? P.BR : P.YE);
    // Shalom Meir tower
    rect(6, -35, 13, 35, p.n ? P.G1 : P.G3); rect(17, -35, 2, 35, p.n ? P.K : P.G1);
    for (let yy = -33; yy < -1; yy += 2) for (let xx = 7; xx < 17; xx += 2) px(xx, yy, p.n ? ((xx * 7 + yy) % 5 < 2 ? P.YE : P.K) : P.BL);
    rect(7, -37, 11, 2, P.G1); rect(12, -40, 1, 3, P.G1);
    // white Bauhaus blocks with ribbon balconies
    for (const [x0, w, h] of [[-28, 14, 12], [-12, 15, 16], [22, 16, 13]]) {
      rect(x0, -h, w, h, p.n ? P.G3 : P.W); px(x0, -h, P.K); px(x0 + w - 1, -h, P.K);
      for (let yy = -h + 3; yy < -1; yy += 4) { rect(x0 + 1, yy, w - 2, 1, p.n ? P.YE : P.K); rect(x0, yy + 1, w, 1, p.n ? P.G1 : P.G3); }
      rect(x0 + w - 2, -h, 2, h, p.n ? P.G1 : P.G3);
    }
  },
  DAM(p) {
    const st = p.st, sm = p.sm, ld = p.n ? P.G1 : P.G3;
    const minaret = (x, h, sq) => { rect(x, -h, sq ? 4 : 3, h, st); rect(x + (sq ? 3 : 2), -h, 1, h, sm); rect(x - 1, -Math.round(h * 0.7), sq ? 6 : 5, 1, sm); rect(x - 1, -h - 1, sq ? 6 : 5, 1, sm); ctX_tri(x + (sq ? 1 : 1), -h - 7, 6, sq ? 2 : 1, ld); px(x + 1, -h - 8, p.gold); };
    minaret(-34, 22, false); minaret(24, 26, true); minaret(-16, 18, true);
    rect(-30, -10, 56, 10, st); ctX_td(-30, -10, 56, 10, sm, 4); for (let i = -28; i < 25; i += 4) { rect(i, -7, 2, 5, P.K); px(i, -7, st); px(i + 1, -7, st); }
    for (let r = 0; r < 3; r++) rect(-30 + r * 2, -11 - r, 56 - r * 4, 1, ld);
    rect(-9, -19, 10, 6, st); rect(-9, -19, 10, 1, sm); ctX_dome(-4, -20, 7, ld, 6, p.n ? P.BL : P.G1); ctX_tri(-4, -30, 3, 1, ld); px(-4, -31, p.gold);
  },
  BGW(p) {
    // Al-Shaheed monument, the split turquoise dome
    rect(-36, -3, 72, 3, p.n ? P.G1 : P.G3); rect(-36, -3, 72, 1, p.n ? P.G3 : P.W);
    const tl = p.n ? P.BL : P.TL, hi = p.n ? P.TL : P.CY, H = 27;
    for (let i = 0; i < H; i++) {
      const u = i / H, w = Math.round(u <= 0.35 ? 12 + 3 * u / 0.35 : 15 * Math.sqrt(Math.max(0, 1 - ((u - 0.35) / 0.66) ** 2)));
      const y = -4 - i; if (w <= 0) continue;
      rect(-3 - w, y, w, 1, tl); px(-3 - w, y, hi); px(-4, y, p.n ? P.G1 : P.G3);
      rect(4, y + 1, w, 1, tl); px(4 + w - 1, y + 1, P.BL); px(4, y + 1, p.n ? P.G1 : P.W);
      for (let xx = -3 - w + 1; xx < -4; xx++) if (BAYER[(y & 3) * 4 + (xx & 3)] < 4) px(xx, y, hi);
      for (let xx = 5; xx < 4 + w - 1; xx++) if (BAYER[((y + 1) & 3) * 4 + (xx & 3)] < 2) px(xx, y + 1, hi);
    }
    rect(-1, -10, 2, 7, p.n ? P.G1 : P.G3);
  },
  TRP(p) {
    // Assaraya al-Hamra (Red Castle) over the harbour
    const rc = p.n ? P.RD : P.RD, rh = p.n ? P.BR : P.BR2;
    rect(-38, -16, 40, 16, rc); ctX_td(-38, -16, 40, 16, P.BR, 7); for (let xx = -38; xx < 2; xx += 2) px(xx, -17, rc);
    for (let yy = -13; yy < -2; yy += 4) for (let xx = -35; xx < 0; xx += 5) px(xx, yy, P.K);
    rect(-30, -22, 18, 6, rc); ctX_td(-30, -22, 18, 6, P.YE, p.n ? 0 : 2); for (let xx = -30; xx < -12; xx += 2) px(xx, -23, rc); rect(-24, -26, 5, 4, p.n ? P.G3 : P.W);
    rect(2, -1, 30, 1, rh);
    // Ottoman clock tower & a minaret
    rect(12, -26, 5, 26, p.n ? P.G3 : P.W); rect(16, -26, 1, 26, p.sm); disc(14, -21, 1, P.K); rect(11, -27, 7, 1, p.sm); ctX_tri(14, -32, 5, 2, p.n ? P.G1 : P.G3); px(14, -33, P.YE);
    rect(28, -24, 2, 24, p.n ? P.G3 : P.W); rect(27, -18, 4, 1, p.sm); ctX_tri(28, -29, 5, 1, P.G1); px(28, -30, P.YE);
  },
  THR(p) {
    const st = p.n ? P.G3 : P.W, sm = p.n ? P.G1 : P.G3, tq = p.n ? P.TL : P.BL2;
    for (let yy = 0; yy < 30; yy++) {
      const y = -1 - yy, hw = Math.round(yy < 26 ? 17 - 11 * Math.pow(yy / 26, 0.55) : 6);
      const gap = yy < 20 ? Math.round(5 * Math.pow(1 - yy / 20, 0.5)) : -1;
      for (let xx = -hw; xx <= hw; xx++) {
        if (gap >= 0 && Math.abs(xx) <= gap) continue;
        const lat = (((xx + yy) % 6) + 6) % 6 === 0 || (((xx - yy) % 6) + 6) % 6 === 0;
        px(xx, y, xx >= hw - 1 || (gap >= 0 && xx === -gap - 1) ? sm : lat ? sm : st);
      }
    }
    rect(-7, -35, 15, 5, st); rect(-7, -35, 15, 1, sm); rect(-6, -33, 13, 1, tq); for (let xx = -5; xx < 7; xx += 3) rect(xx, -34, 1, 3, tq); rect(6, -35, 2, 5, sm);
    for (let yy = -29; yy < -22; yy++) px(0, yy, tq); px(-1, -24, tq); px(1, -24, tq);
  },
  _(p, n, DW) {},
};
// per-city settings: sky, mountains, skyline, trees, ground, lights
const ctX_CITY = {
  WAS: { style: 'us', skyH: 10, trees: 'tree', treeX: [6, 15, -7, -16], beacon: [[-32, -37]] },
  MIA: { style: 'modern', skyH: 20, trees: 'palm', treeX: [4, 20, -20, -5], sky: 'clear' },
  MEX: { style: 'mix', skyH: 12, trees: 'tree', mtn: [[[0.78, 22, 26], [0.9, 16, 18]], P.BL2, P.G3, P.W], beacon: [[24, -41]] },
  HAV: { style: 'colonial', skyH: 8, trees: 'palm', treeX: [4, 34], wall: 1, carCols: [P.RD, P.CY, P.PK, P.GR2, P.YE] },
  PAN: { style: 'modern', skyH: 16, fg: 'water', trees: 'palm', treeX: [4, -5], boat: 'ship' },
  BOG: { style: 'mix', skyH: 10, trees: 'tree', beacon: [[24, -37]] },
  MED: { style: 'mix', skyH: 8, trees: 'tree', treeX: [5, -6], mtn: [[[0.2, 30, 40], [0.7, 32, 44]], P.G1, P.GR, null], beacon: [[5, -42]] },
  LIM: { style: 'colonial', skyH: 8, sky: 'gray', trees: 'palm', treeX: [-5] },
  MVD: { style: 'euro', skyH: 10, trees: 'tree', treeX: [-18, -6], beacon: [[-7, -39]] },
  LON: { style: 'euro', skyH: 12, trees: 'tree', treeX: [6, -6], bus: 1, sky: 'clear' },
  PAR: { style: 'paris', skyH: 10, trees: 'tree', treeX: [6, 16, -7, -17], beacon: [[0, -43]] },
  MRS: { style: 'colonial', skyH: 7, fg: 'water', trees: null, boat: 'yacht' },
  MAD: { style: 'euro', skyH: 10, trees: 'tree', treeX: [6, -6] },
  ROM: { style: 'euro', skyH: 9, trees: 'pine', treeX: [8, -9] },
  BON: { style: 'euro', skyH: 9, trees: 'tree', treeX: [6, -6], beacon: [[26, -35]] },
  BER: { style: 'modern', skyH: 14, trees: 'tree', treeX: [5], beacon: [[22, -42]] },
  VIE: { style: 'euro', skyH: 10, trees: 'tree', treeX: [-6] },
  BEG: { style: 'modern', skyH: 10, fg: 'water', boat: 'barge', beacon: [[30, -41]] },
  IST: { style: 'arab', skyH: 9, fg: 'water', trees: 'cypress', treeX: [4, -5], boat: 'ferry' },
  CAI: { style: 'arab', skyH: 7, sky: 'hazy', fg: 'sand', trees: 'palm', treeX: [4, -5] },
  BEY: { style: 'arab', skyH: 10, trees: 'palm', treeX: [-6], smoke: [8, -34] },
  AMM: { style: 'arab', skyH: 6, sky: 'hazy', trees: null },
  TLV: { style: 'modern', skyH: 10, trees: 'palm', treeX: [-5, -24], beacon: [[12, -41]] },
  DAM: { style: 'arab', skyH: 8, trees: 'cypress', treeX: [-6], mtn: [[[0.3, 24, 60], [0.75, 20, 50]], P.BR, P.G1, null] },
  BGW: { style: 'arab', skyH: 9, sky: 'hazy', trees: 'palm', treeX: [5, 14, -6, -15], flame: 1 },
  TRP: { style: 'arab', skyH: 8, fg: 'water', trees: 'palm', treeX: [-18, -6], boat: 'dhow' },
  THR: { style: 'arab', skyH: 8, trees: 'tree', treeX: [6, -6], mtn: [[[0.15, 30, 36], [0.5, 34, 40], [0.9, 28, 36]], P.G1, P.BL2, P.W] },
  _: { style: 'euro', skyH: 12, trees: 'tree' },
};
function ctX_cityStatic(c, S, n, w, h, k, DW, DH, base, sb) {
  const p = ctX_pal(n);
  g.save(); g.scale(k, k);
  if (S.mtn) { const [peaks, col, top, snow] = S.mtn; ctX_mtn(DW, base, peaks, n ? P.BL : col, n ? null : top, n ? (snow ? P.G1 : null) : snow, c.id, n ? P.K : null); }
  ctX_skyline(DW, base, S, n, c.id + 'sky');
  g.save(); g.translate(Math.round(DW / 2 + (S.dx || 0)), base); (ctX_LM[c.id] || ctX_LM._)(p, n, DW); g.restore();
  ctX_fg(S, DW, DH, base, n, sb);
  ctX_trees(S, DW, base, n);
  if (sb > base && (S.fg || 'street') === 'street') for (let xx = 10; xx < DW; xx += 26) { rect(xx, sb - 9, 1, 9, P.G1); rect(xx - 1, sb - 10, 3, 1, P.G1); px(xx, sb - 9, n ? P.YE : P.W); if (n) { px(xx - 1, sb - 9, P.YE); px(xx + 1, sb - 9, P.YE); } }
  g.restore();
}
// small cached sprites for the live layer
function ctX_cloud(i) {
  return sprite('ctXcloud' + i, 26, 9, () => {
    const r = ctX_rng('cl' + i), puffs = [[6, 5, 4, 2], [11, 4, 4, 3], [16, 4, 4, 3], [20, 5, 4, 2]];
    for (const [cx, cy, rx, ry] of puffs) ctX_ell(cx + (r() * 2 | 0), cy, rx, ry, P.W);
    rect(3, 7, 21, 1, P.G3); ctX_ellD(13, 7, 10, 1, P.W, 6); for (const [cx, cy, rx] of puffs) ctX_ellD(cx + 1, cy + 1, rx - 1, 1, P.G3, 4);
  });
}
function ctX_car(x, y, col, dir, n, kind) {
  x = Math.round(x);
  if (kind === 'bus') {
    rect(x, y - 2, 11, 5, P.RD); rect(x + 1, y - 1, 9, 1, n ? P.YE : P.CY); rect(x + 1, y + 1, 9, 1, n ? P.YE : P.CY); rect(x, y, 11, 1, P.RD2); px(x + 2, y + 3, P.K); px(x + 8, y + 3, P.K);
    if (n) px(dir > 0 ? x + 10 : x, y + 2, P.YE); return;
  }
  rect(x, y + 1, 7, 2, col); rect(x + 2, y, 3, 1, col); px(dir > 0 ? x + 4 : x + 2, y, n ? P.K : P.CY); px(x + 1, y + 2, P.K); px(x + 5, y + 2, P.K);
  if (n) { px(dir > 0 ? x + 6 : x, y + 1, P.YE); px(dir > 0 ? x : x + 6, y + 1, P.RD2); }
}
function ctX_cityLive(c, S, n, DW, DH, base, t, sb) {
  const ox = Math.round(DW / 2 + (S.dx || 0));
  if (!n) {
    for (let i = 0; i < 2; i++) { const span = DW + 20, bx = Math.round(((t * (5 + i * 2) + i * 40) % span) - 10), by = 8 + i * 4 + Math.round(Math.sin(t * 1.3 + i * 2) * 2), up = ((t * 5 + i) | 0) % 2; px(bx, by, P.K); px(bx - 1, by - up, P.K); px(bx + 1, by - up, P.K); if (up) { px(bx - 2, by - 1, P.K); px(bx + 2, by - 1, P.K); } else { px(bx - 2, by, P.K); px(bx + 2, by, P.K); } }
  }
  if (n && S.beacon && ((t * 1.4) | 0) % 2) for (const [bx, by] of S.beacon) { px(ox + bx, base + by, P.RD2); }
  // traffic
  const fg = S.fg || 'street';
  if (fg === 'street') {
    const cols = S.carCols || [P.RD, P.W, P.BL, P.YE, P.G3, P.BR];
    for (let i = 0; i < 3; i++) {
      const dir = i === 1 ? -1 : 1, span = DW + 30, sp = 9 + i * 4, pos = ((t * sp + i * 47) % span) - 15;
      const x = dir > 0 ? pos : DW - pos; const bus = S.bus && i === 0;
      ctX_car(x, dir > 0 ? sb + 5 : sb + 2, cols[(i + ((t * sp + i * 47) / span | 0)) % cols.length], dir, n, bus ? 'bus' : null);
    }
    // a pedestrian on the pavement
    const pxp = Math.round(((t * 3) % (DW + 10)) - 5), step = (t * 4 | 0) % 2;
    const pb = sb > base ? sb - 1 : base; rect(pxp, pb - 4, 1, 2, n ? P.G1 : P.K); px(pxp, pb - 5, n ? P.G1 : P.SK); px(pxp - step, pb - 1, n ? P.G1 : P.K); px(pxp + step, pb - 1, n ? P.G1 : P.K); px(pxp, pb - 2, n ? P.G1 : P.BL);
  } else if (fg === 'water') {
    const span = DW + 50, bx = Math.round(((t * 4) % span) - 30), by = base + 3;
    const hl = n ? P.G1 : P.W;
    if (S.boat === 'ship') { rect(bx, by - 1, 28, 3, P.RD); rect(bx, by + 1, 28, 1, P.K); for (let i = 0; i < 6; i++) rect(bx + 3 + i * 3, by - 3, 3, 2, [P.BL, P.RD, P.GR, P.YE, P.BR, P.TL][i]); rect(bx + 22, by - 6, 4, 5, hl); px(bx + 23, by - 5, n ? P.YE : P.K); rect(bx + 23, by - 8, 2, 2, P.K); }
    else if (S.boat === 'ferry') { rect(bx, by, 16, 2, hl); rect(bx + 2, by - 2, 11, 2, hl); for (let i = 0; i < 5; i++) px(bx + 3 + i * 2, by - 1, n ? P.YE : P.K); rect(bx + 7, by - 5, 2, 3, P.K); px(bx + 7, by - 5, P.RD); rect(bx + 1, by + 1, 14, 1, P.K); }
    else if (S.boat === 'barge') { rect(bx, by, 20, 2, P.K); rect(bx + 2, by - 1, 12, 1, P.BR); rect(bx + 15, by - 3, 4, 3, hl); px(bx + 16, by - 2, n ? P.YE : P.K); }
    else if (S.boat === 'dhow') { rect(bx, by, 9, 2, P.BR); px(bx - 1, by, P.BR); line(bx + 4, by - 1, bx + 4, by - 9, P.BR); ctX_tri(bx + 4, by - 9, 7, 3, hl); }
    else { rect(bx + 1, by, 7, 2, hl); px(bx, by, hl); rect(bx + 2, by - 1, 3, 1, P.BL); rect(bx + 4, by - 9, 1, 8, P.G1); ctX_tri(bx + 4, by - 8, 6, 2, P.W); }
    for (let i = 0; i < 4; i++) px(bx - 2 - i * 3, by + 2, (t * 6 + i | 0) % 2 ? P.W : P.BL2);
  } else if (fg === 'sand') {
    const span = DW + 30, cx = Math.round(DW + 10 - ((t * 3) % span)), cy = base + 6, st = (t * 3 | 0) % 2, cm = n ? P.K : P.BR;
    rect(cx, cy - 5, 7, 3, cm); px(cx + 3, cy - 6, cm); rect(cx - 2, cy - 7, 2, 4, cm); rect(cx - 3, cy - 7, 1, 1, cm);
    px(cx + 1 - st, cy - 2, cm); px(cx + 1 + st, cy - 1, cm); px(cx + 5 + st, cy - 2, cm); px(cx + 5 - st, cy - 1, cm);
    rect(cx + 3, cy - 9, 2, 3, n ? P.G1 : P.W); px(cx + 3, cy - 10, n ? P.G1 : P.RD);
  }
  // city specials
  if (c.id === 'VIE') { // the Riesenrad turns
    const hx = ox - 26, hy = base - 16, R = 12, a0 = t * 0.25;
    for (let i = 0; i < 8; i++) { const an = a0 + i / 8 * Math.PI * 2; line(hx, hy, Math.round(hx + Math.cos(an) * (R - 1)), Math.round(hy + Math.sin(an) * (R - 1)), n ? P.G1 : P.G1); }
    for (let i = 0; i < 12; i++) { const an = -a0 + i / 12 * Math.PI * 2 + a0 * 2; const cx = Math.round(hx + Math.cos(an) * R), cy = Math.round(hy + Math.sin(an) * R); rect(cx - 1, cy, 2, 2, n ? (i % 2 ? P.YE : P.RD2) : P.RD); }
    px(hx, hy, P.W);
  }
  if (S.flame) { const fx = ox, fy = base - 11, f = (t * 8 | 0) % 3; px(fx, fy - 1 - f, P.YE); px(fx - 1 + (f & 1), fy - 1, P.RD2); px(fx, fy, P.YE); }
  if (S.smoke) { const [sx, sy] = S.smoke; for (let i = 0; i < 5; i++) { const ph = (t * 0.6 + i / 5) % 1, yy = Math.round(base + sy - ph * 22), xx = Math.round(ox + sx + ph * 10 + Math.sin(t + i) * 1.5), r = 1 + Math.round(ph * 3); ctX_ellD(xx, yy, r + 1, r, n ? P.G1 : P.G1, 10 - ph * 6 | 0); } if (n && ((t * 0.5) | 0) % 5 === 0 && (t * 8 | 0) % 2) px(ox + 30, base - 20, P.YE); }
  if (c.id === 'HAV' && n) { const a = t * 1.2, lx = ox + 37, ly = base - 28; for (let j = 3; j < 18; j++) px(Math.round(lx + Math.cos(a) * j), Math.round(ly + Math.sin(a) * j * 0.3), j < 10 ? P.YE : P.W); }
}
function cityPic(x, y, w, h, c) {
  if (!c) return;
  const n = isNight(), k = h >= 100 && w >= 120 ? 2 : 1, DW = Math.ceil(w / k), DH = Math.ceil(h / k), sb = DH - 8, S = ctX_CITY[c.id] || ctX_CITY._, base = sb - (k === 2 ? ((S.fg || 'street') === 'street' ? 14 : 8) : 0);
  const key = c.id + (n ? 'n' : 'd') + w + 'x' + h, t = ctX_now();
  const skyS = sprite('ctXsky' + (n ? 'n' : 'd') + (S.sky || '') + w + 'x' + h, w, h, () => ctX_sky(w, h, n, S.sky));
  const spr = sprite('ctXcity' + key, w, h, () => ctX_cityStatic(c, S, n, w, h, k, DW, DH, base, sb));
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.drawImage(skyS, x, y);
  if (!n) { g.save(); g.translate(x, y); g.scale(k, k); for (let i = 0; i < 3; i++) { const sp = 1.2 + i * 0.5, span = DW + 30; ctX_blit(ctX_cloud(i), ((t * sp + i * 53) % span) - 26, 1 + i * 4 + (i === 2 ? -3 : 0)); } g.restore(); }
  g.drawImage(spr, x, y);
  g.translate(x, y); g.scale(k, k);
  ctX_cityLive(c, S, n, DW, DH, base, t, sb);
  g.restore();
}

// ---------------------------------------------------------------
// PEOPLE SPRITES (string art)
// ---------------------------------------------------------------
const ctX_MAN = [
  '...HHHHH...',
  '..HHHHHHH..',
  '..HSSSSSH..',
  '..SESSESs..',
  '..SSSsSSs..',
  '...SRRSs...',
  '....SSs....',
  '..JJWTWJJ..',
  '.JJJWTWJJJ.',
  '.JJjWWWjJJ.',
  'JJJjJWJjJJj',
  'JJ.jJJJj.Jj',
  'JJ.jJJJj.Jj',
  'JJ.JJJJJ.Jj',
  'JJ.JJJJJ.Jj',
  'SS.JJJJJ.Ss',
  '...JJJJJ...',
  '...PPPPP...',
  '...PPPPp...',
  '...PP.Pp...',
  '...PP.Pp...',
  '...PP.Pp...',
  '...PP.Pp...',
  '...PP.Pp...',
  '...PP.Pp...',
  '...PP.Pp...',
  '...PP.Pp...',
  '..BBB.BBB..',
];
const ctX_MAN_ARM = [ // same, right hand raised mid-sentence
  '...HHHHH...',
  '..HHHHHHH..',
  '..HSSSSSH..',
  '..SESSESs..',
  '..SSSsSSs..',
  '...SRRSs...',
  '....SSs...S',
  '..JJWTWJJ.J',
  '.JJJWTWJJJJ',
  '.JJjWWWjJJ.',
  'JJJjJWJjJ..',
  'JJ.jJJJj...',
  'JJ.jJJJj...',
  'JJ.JJJJJ...',
  'JJ.JJJJJ...',
  'SS.JJJJJ...',
  '...JJJJJ...',
  '...PPPPP...',
  '...PPPPp...',
  '...PP.Pp...',
  '...PP.Pp...',
  '...PP.Pp...',
  '...PP.Pp...',
  '...PP.Pp...',
  '...PP.Pp...',
  '...PP.Pp...',
  '...PP.Pp...',
  '..BBB.BBB..',
];
const ctX_WOMAN = [
  '...HHHH....',
  '..HHHHHH...',
  '.HHSSSSHH..',
  '.HSESSESH..',
  '.HSSSsSSH..',
  '.HHSRRSHH..',
  '.HH.SSsHH..',
  '..H.SSs.H..',
  '..SSSSSSs..',
  '.SSDDDDDSs.',
  '.S.DDDDDd.S',
  '.S.DDDDDd.S',
  '.S.DDDDDd.s',
  '.s..DDDd..s',
  '.W..DDDd..W',
  '....DDDd...',
  '...DDDDDd..',
  '...DDDDDd..',
  '...DDDDDd..',
  '..DDDDDDDd.',
  '..DDDdDDDd.',
  '..DDDdDDDd.',
  '..DDDdDDDd.',
  '.DDDDdDDDdd',
  '.DDDDdDDDdd',
  '.DDDDdDDDdd',
  'DDDDDdDDDDd',
  'DDDDDdDDDDd',
];
const ctX_BELL = [ // bellboy pushing (facing left)
  '...RRRR...',
  '...YYYY...',
  '...HHHH...',
  '..SSSSH...',
  '.SESSSH...',
  'SSSSSsH...',
  '..SRSs....',
  '...Ss.....',
  '..RRRRR...',
  'SRRRYRRR..',
  '.RRRYRRRR.',
  '..RRYRRRR.',
  '...RRRRR..',
  '...RRRRR..',
  '...KKKKK..',
  '...KK.KK..',
  '...KK.KK..',
  '...KK.KK..',
  '...KK.KK..',
  '...KK.KK..',
  '...KK.KK..',
  '..BBB.BB..',
];
const ctX_BELL2 = [
  '...RRRR...',
  '...YYYY...',
  '...HHHH...',
  '..SSSSH...',
  '.SESSSH...',
  'SSSSSsH...',
  '..SRSs....',
  '...Ss.....',
  '..RRRRR...',
  'SRRRYRRR..',
  '.RRRYRRRR.',
  '..RRYRRRR.',
  '...RRRRR..',
  '...RRRRR..',
  '...KKKKK..',
  '..KK..KK..',
  '..KK..KK..',
  '.KK....KK.',
  '.KK....KK.',
  '.KK....KK.',
  'KK......KK',
  'BB......BB',
];
const ctX_CLERK = [
  '....HHHHH....',
  '...HHHHHHH...',
  '...HHSSSSHH..',
  '...HSSSSSSs..',
  '...SEESEESs..',
  '...SSSSSSSs..',
  '....SSSsSs...',
  '....SSSSSs...',
  '.....SRRs....',
  '......Ss.....',
  '...JWWKWWJ...',
  '..JJJWKWJJj..',
  '.JJJJJWWJJJj.',
  '.JJJJJWWJJJj.',
  '.JJjJJWWJjJj.',
  '.JJjJJJJJjJj.',
  '.JJjJJJJJjJj.',
  '.JJjJJJJJjJj.',
  'SSSjJJJJJjSSs',
];
const ctX_PIANIST = [ // profile, facing left, seated
  '....HHHH...',
  '...HHHHHH..',
  '..SSSHHHH..',
  '.SESSSHHH..',
  'SSSSSSSH...',
  '..SRSSS....',
  '...SSs.....',
  '..WJJJJJ...',
  '.WJJJJJJJ..',
  '.JJJJJJJJ..',
  'JJJJJJJJJ..',
  'S.JJJJJJJ..',
  '...JJJJJJ..',
  '...JJJJJJ..',
  'PPPPPPPPP..',
  'PPPPPPPPp..',
  'PP......p..',
  'PP.........',
  'PP.........',
  'PP.........',
  'BBB........',
];
const ctX_PIANIST2 = [
  '....HHHH...',
  '...HHHHHH..',
  '..SSSHHHH..',
  '.SESSSHHH..',
  'SSSSSSSH...',
  '..SRSSS....',
  '...SSs.....',
  '..WJJJJJ...',
  '.WJJJJJJJ..',
  'JJJJJJJJJ..',
  'S.JJJJJJJ..',
  '..JJJJJJJ..',
  '...JJJJJJ..',
  '...JJJJJJ..',
  'PPPPPPPPP..',
  'PPPPPPPPp..',
  'PP......p..',
  'PP.........',
  'PP.........',
  'PP.........',
  'BBB........',
];
function ctX_people(key, rows, o) {
  const m = { H: o.hair || P.BR, S: o.skin || P.SK, s: P.RD, E: P.K, R: P.RD, J: o.jacket || P.K, j: o.fold || P.G1, W: P.W, T: o.tie || P.K, P: o.pants || P.K, p: o.pfold || P.G1, B: P.K, D: o.dress || P.MG, d: o.dfold || P.PU, Y: P.YE, K: P.K, A: o.jacket || P.K };
  if (o.eye) m.E = o.eye;
  return ctX_spr(key, rows, m);
}

// ---------------------------------------------------------------
// HOTEL LOBBY
// ---------------------------------------------------------------
function ctX_palm(x, b, big) { // potted palm: brass urn and arching fronds
  const top = b - (big ? 26 : 22), L = big ? 24 : 19;
  for (let yy = top - 5; yy < b - 10; yy++) { px(x + (yy < top + 6 ? 0 : (yy & 4 ? 1 : 0)), yy, P.BR); if (yy > top + 3) px(x - 3 + ((yy >> 2) & 1), yy, P.BR); }
  for (let f = 0; f < 9; f++) {
    const a = -Math.PI * (0.08 + f * 0.105), ca = Math.cos(a), sa = Math.sin(a), len = L - Math.abs(f - 4);
    for (let j = 2; j < len; j++) {
      const xx = Math.round(x + ca * j), yy = Math.round(top - 5 + sa * j * 0.8 + j * j * 0.032);
      px(xx, yy, P.GR);
      if (j > 3) { const k = j % 2 ? 1 : 2; px(xx + Math.round(-sa * k), yy + Math.round(ca * k) + 1, j % 3 ? P.GR : P.GR2); px(xx - Math.round(-sa * k), yy - Math.round(ca * k) + 1, P.GR2); }
    }
  }
  rect(x - 6, b - 10, 13, 10, P.YE); rect(x - 7, b - 11, 15, 2, P.BR); rect(x + 3, b - 9, 3, 9, P.BR); ctX_td(x - 6, b - 9, 13, 9, P.BR, 3); rect(x - 4, b - 1, 9, 1, P.K); rect(x - 6, b - 6, 13, 1, P.BR);
}
function ctX_hotelStatic(n) {
  // ceiling: coffers & gilt cornice
  rect(0, 0, W, 22, P.BR);
  for (let x = -6; x < W; x += 34) { rect(x + 3, 2, 28, 13, P.K); rect(x + 5, 4, 24, 9, P.BR); ctX_td(x + 5, 4, 24, 9, P.RD, 4); rect(x + 3, 15, 28, 1, P.YE); }
  rect(0, 17, W, 2, P.YE); rect(0, 19, W, 1, P.BR); rect(0, 20, W, 2, P.W); for (let x = 0; x < W; x += 3) px(x, 21, P.G3);
  // walls: red damask above a wood wainscot
  rect(0, 22, W, 84, P.RD);
  for (let y = 26; y < 104; y += 8) for (let x = (y / 8 & 1) * 5; x < W; x += 10) { px(x, y, P.BR); px(x - 1, y + 1, P.BR); px(x + 1, y + 1, P.BR); px(x, y + 2, P.BR); px(x, y + 1, P.RD2); }
  rect(0, 104, W, 24, P.BR); rect(0, 104, W, 2, P.YE); rect(0, 126, W, 2, P.K);
  for (let x = 2; x < W; x += 22) { frame(x, 109, 18, 14, P.K); rect(x + 1, 110, 16, 1, P.YE); }
  // tall window, left
  rect(28, 30, 40, 72, P.YE); rect(30, 32, 36, 70, n ? P.K : P.CY); if (!n) vgrad(30, 32, 36, 70, [P.BL2, P.CY, P.W]); else { for (let i = 0; i < 12; i++) px(31 + (i * 13) % 34, 34 + (i * 29) % 60, P.W); }
  ctX_dome(48, 32, 10, P.RD, 20); rect(47, 32, 2, 70, P.YE); rect(30, 60, 36, 1, P.YE);
  for (const cx of [26, 70]) { rect(cx - 3, 28, 6, 80, P.RD2); ctX_td(cx - 3, 28, 6, 80, P.RD, 6); rect(cx - 3, 28, 6, 2, P.YE); }
  // wall sconces
  for (const sx of [10, 100]) { rect(sx, 58, 3, 6, P.YE); disc(sx + 1, 55, 2, P.W); px(sx + 1, 52, P.YE); }
  // marble columns
  for (const cx of [142, 228, 312]) {
    rect(cx - 7, 26, 14, 94, P.W); ctX_td(cx - 7, 26, 14, 94, P.G3, 3); rect(cx + 4, 26, 3, 94, P.G3); rect(cx - 7, 26, 1, 94, P.G3);
    for (let x = cx - 4; x < cx + 5; x += 3) rect(x, 32, 1, 84, P.G3);
    for (let y = 40; y < 116; y += 9) px(cx - 3 + (y * 7) % 7, y, P.G1);
    rect(cx - 10, 22, 20, 4, P.YE); rect(cx - 9, 26, 18, 3, P.YE); px(cx - 10, 26, P.YE); px(cx + 9, 26, P.YE); rect(cx - 9, 25, 18, 1, P.BR); px(cx - 8, 27, P.BR); px(cx + 7, 27, P.BR);
    rect(cx - 9, 118, 18, 4, P.G3); rect(cx - 10, 122, 20, 6, P.W); rect(cx - 10, 127, 20, 1, P.G1);
  }
  // elevators with brass doors and dials
  for (const ex of [162, 194]) {
    rect(ex - 3, 66, 30, 62, P.YE); rect(ex - 2, 67, 28, 60, P.BR); rect(ex, 70, 24, 58, P.K);
    ctX_dome(ex + 12, 64, 7, P.YE, 9); ctX_dome(ex + 12, 63, 5, P.W, 7); for (let i = 0; i < 5; i++) { const a = Math.PI * (1 - i / 4); px(Math.round(ex + 12 + Math.cos(a) * 5), Math.round(63 - Math.sin(a) * 4), P.K); }
  }
  // reception: key rack, plaque
  rect(248, 44, 54, 10, P.K); frame(248, 44, 54, 10, P.YE); textC('RECEPTION', 275, 45, P.YE);
  rect(250, 58, 50, 36, P.BR); frame(250, 58, 50, 36, P.K);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { const x = 252 + c * 8, y = 60 + r * 8; rect(x, y, 7, 7, P.K); if ((r * 6 + c) % 3) { px(x + 3, y + 2, P.YE); rect(x + 3, y + 3, 1, 3, P.YE); } if ((r * 6 + c) % 5 === 0) rect(x + 1, y + 4, 5, 2, P.W); }
  // floor: black & white marble in perspective
  const ys = [128, 131, 135, 140, 146, 153, 161, 170, 180, 191, 200];
  for (let i = 0; i < ys.length - 1; i++) {
    const y0 = ys[i], y1 = ys[i + 1], ym = (y0 + y1) / 2, f = (ym - 40) / 160;
    for (let j = -14; j < 14; j++) {
      const xa = Math.round(160 + (j * 34 - 17) * f), xb = Math.round(160 + ((j + 1) * 34 - 17) * f);
      const col = (i + j) & 1 ? P.W : P.G1; rect(xa, y0, xb - xa, y1 - y0, col);
      if (col === P.W) { px(xa + 2, y0 + 1, P.G3); if (y1 - y0 > 5) line(xa + 1, y1 - 2, xa + Math.min(6, xb - xa - 1), y0 + 2, P.G3); }
    }
  }
  ctX_td(0, 128, W, 8, P.G3, 4);
  // lounge rug
  for (let y = 150; y < 200; y++) { const inset = Math.round((200 - y) * 0.25); rect(0 + inset, y, 128 - inset * 2, 1, P.RD); }
  for (let y = 150; y < 200; y++) { const inset = Math.round((200 - y) * 0.25); px(inset, y, P.YE); px(127 - inset, y, P.YE); if (y % 6 === 0) for (let x = inset + 6; x < 122 - inset; x += 8) { px(x, y, P.BL); px(x + 1, y + 1, P.YE); px(x - 1, y + 1, P.YE); px(x, y + 2, P.BL); } }
  rect(inset0(), 150, 128 - 2 * inset0(), 1, P.YE);
  function inset0() { return Math.round(50 * 0.25); }
  // grand piano (keyboard at the right-hand end)
  rect(24, 170, 2, 18, P.K); rect(84, 172, 2, 16, P.K); rect(60, 176, 2, 14, P.K); px(23, 188, P.YE); px(85, 188, P.YE);
  for (let x = 14; x < 98; x++) { const tail = x < 40 ? Math.round(Math.sqrt(Math.max(0, 1 - ((x - 40) / 26) ** 2)) * 8) : 8; rect(x, 170 - tail + 8 - 8, 1, 4 + tail - (8 - tail), P.K); }
  rect(14, 164, 84, 8, P.K); rect(20, 164, 76, 1, P.G1); rect(40, 171, 56, 1, P.G1);
  line(26, 164, 70, 142, P.K); line(27, 164, 71, 142, P.G1); line(70, 142, 98, 158, P.K); line(70, 143, 97, 159, P.K); line(60, 164, 66, 150, P.YE);
  for (let x = 28; x < 96; x++) { const y0 = Math.round(164 - (x - 26) * 22 / 44); const y1 = Math.round(142 + (x - 70) * 16 / 28); const top = x < 70 ? y0 : y1; if (x > 30) rect(x, top + 1, 1, 163 - top, x < 70 ? P.K : P.K); }
  ctX_td(30, 144, 66, 20, P.G1, 2);
  rect(96, 163, 6, 3, P.W); for (let x = 96; x < 102; x += 2) px(x, 163, P.K); rect(96, 166, 6, 2, P.K);
  rect(104, 176, 12, 3, P.K); rect(105, 179, 1, 9, P.K); rect(114, 179, 1, 9, P.K);
  // palms
  ctX_palm(138, 140, true); ctX_palm(234, 146, false);
  // the reception desk
  rect(240, 112, 80, 4, P.W); rect(240, 115, 80, 1, P.G3); rect(242, 116, 78, 34, P.BR); ctX_td(242, 116, 78, 34, P.RD, 3);
  for (let x = 246; x < 320; x += 18) { frame(x, 120, 14, 24, P.YE); rect(x + 2, 122, 10, 20, P.BR); }
  rect(242, 148, 78, 2, P.K); rect(242, 116, 1, 34, P.YE);
  rect(254, 109, 12, 3, P.W); rect(260, 109, 1, 3, P.G3); ctX_dome(290, 111, 2, P.YE, 3); px(290, 108, P.YE);
  rect(304, 104, 1, 8, P.YE); rect(301, 101, 8, 4, P.GR); rect(300, 104, 10, 1, P.GR2); rect(302, 111, 6, 1, P.YE);
  // armchair (the watcher)
  rect(254, 162, 34, 22, P.GR); rect(250, 158, 6, 28, P.GR); rect(286, 158, 6, 28, P.GR); ctX_td(250, 158, 42, 28, P.K, 4); rect(250, 158, 6, 2, P.GR2); rect(286, 158, 6, 2, P.GR2); rect(254, 184, 2, 5, P.BR); rect(286, 184, 2, 5, P.BR);
  rect(256, 150, 30, 14, P.GR); ctX_td(256, 150, 30, 14, P.GR2, 2);
}
function hotelLobbyArt(t) {
  t = t || 0;
  const n = isNight(), tt = ctX_now();
  g.drawImage(sprite('ctXhotel' + (n ? 'n' : 'd'), W, H, () => ctX_hotelStatic(n)), 0, 0);
  // chandelier: gilt rings, candle bulbs and strings of crystal drops
  const cx = 196;
  rect(cx, 22, 1, 12, P.G1); for (let y = 23; y < 34; y += 3) px(cx, y, P.YE);
  ctX_ell(cx, 34, 5, 1, P.YE); rect(cx - 1, 35, 3, 18, P.YE); px(cx + 1, 36, P.BR);
  for (const [ry, rx, drop] of [[40, 13, 5], [47, 22, 7]]) {
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, dx = Math.round(Math.cos(a) * rx), dy = Math.round(Math.sin(a) * 2), front = dy >= 0; if (!front) { for (let d = 1; d < drop - 2; d++) px(cx + dx, ry + dy + d, d % 2 ? P.G3 : P.CY); } }
    ctX_ell(cx, ry, rx, 2, P.YE); ctX_ell(cx, ry, rx - 2, 1, P.BR); rect(cx - rx + 1, ry - 1, rx * 2 - 1, 1, P.BR);
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, dx = Math.round(Math.cos(a) * rx), dy = Math.round(Math.sin(a) * 2); if (dy >= 0) for (let d = 1; d < drop; d++) px(cx + dx, ry + dy + d, d % 2 ? P.W : P.CY); if (k % 2 === 0) { rect(cx + dx, ry + dy - 3, 1, 2, P.W); px(cx + dx, ry + dy - 4, P.YE); } }
  }
  for (let d = 0; d < 6; d++) px(cx, 53 + d, d % 2 ? P.CY : P.W); px(cx - 1, 57, P.W); px(cx + 1, 57, P.W);
  for (let k = 0; k < 8; k++) { const s = (tt * 3 + k * 1.7) | 0; if (s % 4 === 0) { const a = (k * 0.9 + s * 0.37), rx = k % 2 ? 22 : 13, ry = k % 2 ? 47 : 40, xx = cx + Math.round(Math.cos(a) * rx), yy = ry + 2 + (k % 3); px(xx, yy, P.W); px(xx - 1, yy, P.CY); px(xx + 1, yy, P.CY); px(xx, yy - 1, P.W); px(xx, yy + 1, P.W); } }
  // the elevators: dial needles and a door that opens now and then
  [162, 194].forEach((ex, i) => {
    const fl = (Math.sin(tt * 0.3 + i * 2) + 1) / 2, a = Math.PI * (1 - fl);
    line(ex + 12, 63, Math.round(ex + 12 + Math.cos(a) * 4), Math.round(63 - Math.sin(a) * 4), P.RD);
    const ph = (tt + i * 7) % 16, open = ph < 1 ? ph : ph < 5 ? 1 : ph < 6 ? 6 - ph : 0, gap = Math.round(open * 11);
    if (gap > 0) { rect(ex, 70, 24, 58, P.YE); ctX_td(ex, 70, 24, 58, P.W, 5); rect(ex, 124, 24, 4, P.BR); if (i === 1) ctX_blit(ctX_people('lift', ctX_MAN, { jacket: P.BL, fold: P.K, pants: P.BL, hair: P.K, tie: P.RD }), ex + 7, 98); }
    for (const side of [0, 1]) {
      const dw = 12 - Math.ceil(gap / 2), dx = side ? ex + 24 - dw : ex;
      if (dw <= 0) continue;
      rect(dx, 70, dw, 58, P.YE); ctX_td(dx, 70, dw, 58, P.BR, 5); rect(side ? dx : dx + dw - 1, 70, 1, 58, P.BR);
      for (let y = 78; y < 124; y += 12) rect(dx + 2, y, Math.max(0, dw - 4), 1, P.BR);
    }
  });
  // clerk behind the desk (blinks, glances)
  const blink = (tt % 4) < 0.15, look = ((tt / 5) | 0) % 3 === 1;
  ctX_blit(ctX_people('clerk' + blink, ctX_CLERK, { hair: P.K, jacket: P.K, fold: P.G1, eye: blink ? P.SK : P.K }), 268 + (look ? -1 : 0), 94);
  // the couple chatting
  const talk = ((tt / 1.3) | 0) % 3 === 0;
  ctX_blit(ctX_people('lady', ctX_WOMAN, { hair: P.YE, dress: P.MG, dfold: P.PU }), 168, 154);
  ctX_blit(ctX_people('tux' + talk, talk ? ctX_MAN_ARM : ctX_MAN, { hair: P.K, jacket: P.K, fold: P.G1, tie: P.K }), 182, 154, true);
  // the pianist and his notes
  const hand = ((tt * 4) | 0) % 2;
  ctX_blit(ctX_people('pn' + hand, hand ? ctX_PIANIST2 : ctX_PIANIST, { hair: P.G3, jacket: P.K, fold: P.G1, pants: P.K }), 102, 157);
  for (let k = 0; k < 3; k++) { const ph = (tt * 0.5 + k / 3) % 1, nx = Math.round(80 + k * 9 + Math.sin(tt * 2 + k) * 3), ny = Math.round(150 - ph * 30); if (ph < 0.9) { rect(nx, ny, 2, 2, P.YE); rect(nx + 1, ny - 4, 1, 4, P.YE); if (k === 1) px(nx + 2, ny - 4, P.YE); } }
  // the man behind the newspaper
  const peek = (tt % 7) > 5.2;
  rect(262, 130 + (peek ? 5 : 0), 18, 5, P.G1); rect(259, 134 + (peek ? 5 : 0), 24, 2, P.G1); rect(262, 134 + (peek ? 5 : 0), 18, 1, P.K);
  if (peek) { rect(264, 136, 14, 5, P.SK); px(267, 138, P.K); px(274, 138, P.K); px(268, 138, P.W); px(275, 138, P.W); }
  rect(257, 141, 28, 22, P.W); rect(270, 141, 1, 22, P.G3); for (let y = 144; y < 161; y += 2) { rect(259, y, 9, 1, P.G3); rect(272, y, 11, 1, P.G3); } rect(259, 143, 9, 3, P.K); rect(254, 150, 4, 3, P.SK); rect(284, 150, 4, 3, P.SK);
  rect(262, 163, 18, 3, P.G1); rect(262, 166, 3, 20, P.G1); rect(276, 166, 3, 20, P.G1); rect(261, 186, 5, 2, P.K); rect(275, 186, 5, 2, P.K);
  // bellboy with a luggage trolley crossing the lobby
  const span = 460, bx = Math.round(340 - ((tt * 16) % span)), step = ((tt * 5) | 0) % 2;
  if (bx > -40 && bx < 330) {
    const cy = 196;
    rect(bx - 24, cy - 26, 2, 26, P.YE); rect(bx - 2, cy - 26, 2, 26, P.YE); rect(bx - 24, cy - 27, 24, 2, P.YE); rect(bx - 24, cy - 4, 24, 2, P.YE);
    rect(bx - 22, cy - 14, 20, 10, P.BR); rect(bx - 22, cy - 14, 20, 1, P.YE); rect(bx - 13, cy - 16, 3, 2, P.K);
    rect(bx - 21, cy - 22, 12, 8, P.RD2); rect(bx - 21, cy - 19, 12, 1, P.RD); rect(bx - 8, cy - 24, 6, 10, P.G3); rect(bx - 8, cy - 20, 6, 1, P.G1);
    disc(bx - 21, cy - 1, 2, P.K); disc(bx - 3, cy - 1, 2, P.K);
    ctX_blit(ctX_people('bell' + step, step ? ctX_BELL2 : ctX_BELL, { hair: P.BR }), bx + 1, cy - 22);
  }
}

// ---------------------------------------------------------------
// ENEMY BUILDINGS
// ---------------------------------------------------------------
const ctX_GUARD = [
  '..UUU..',
  '.uUUUU.',
  '..SSS..',
  '..SSs..',
  '...s...',
  '.UUUUU.',
  'UUUuUUU',
  'UUUuUUK',
  'SUUuUKU',
  'S.UUKUS',
  '.UUKUU.',
  '.uuuuu.',
  '.uu.uu.',
  '.uu.uu.',
  '.uu.uu.',
  '.uu.uu.',
  '.KK.KK.',
];
const ctX_GUARD2 = [
  '..UUU..',
  '.uUUUU.',
  '..SSS..',
  '..SSs..',
  '...s...',
  '.UUUUU.',
  'UUUuUUU',
  'UUUuUUK',
  'SUUuUKU',
  'S.UUKUS',
  '.UUKUU.',
  '.uuuuu.',
  '.uu.uu.',
  'uu...uu',
  'uu...uu',
  'u.....u',
  'KK...KK',
];
const ctX_CIV = [
  '..HHH..',
  '.HSSSH.',
  '..SSs..',
  '..SSs..',
  '...s...',
  '.CCCCC.',
  'CCCcCCC',
  'CCCcCCC',
  'SCCcCCS',
  '.CCcCC.',
  '.CCcCC.',
  '.CCCCC.',
  '.PP.PP.',
  '.PP.PP.',
  '.PP.PP.',
  '.PP.PP.',
  '.KK.KK.',
];
const ctX_CIV2 = ctX_CIV.slice(0, 12).concat(['.PP.PP.', 'PP...PP', 'PP...PP', 'P.....P', 'KK...KK']);
function ctX_guardSpr(col, walk) { return ctX_spr('guard' + col + walk, walk ? ctX_GUARD2 : ctX_GUARD, { U: col, u: P.K, S: P.SK, s: P.RD, K: P.K }); }
function ctX_civSpr(i, walk) { const c = [P.BR, P.G3, P.BL, P.TL][i % 4]; return ctX_spr('civ' + i + walk, walk ? ctX_CIV2 : ctX_CIV, { H: [P.K, P.BR, P.YE, P.G1][i % 4], C: c, c: P.K, S: i % 3 ? P.SK : P.BR, s: P.RD, P: P.G1, K: P.K }); }
function ctX_uniform(b) { return b.org ? b.org.uni : ({ KGB: P.GR, MI6: P.G1, Mossad: P.BL })[b.agency] || P.G1; }
// a 1980s sedan, side view, ~38x13
function ctX_sedan(x, y, col, n, flip) {
  const hi = col === P.K ? P.G1 : col === P.W ? P.G3 : P.W;
  g.save(); if (flip) { g.translate(x * 2 + 38, 0); g.scale(-1, 1); }
  rect(x + 1, y + 5, 36, 5, col); rect(x + 9, y, 18, 6, col); rect(x + 10, y + 1, 7, 4, n ? P.K : P.BL2); rect(x + 18, y + 1, 7, 4, n ? P.K : P.BL2); px(x + 11, y + 1, P.W);
  rect(x + 1, y + 5, 36, 1, hi); rect(x, y + 8, 38, 2, P.G3); rect(x + 17, y + 1, 1, 8, P.K); rect(x + 25, y + 6, 1, 3, P.K);
  px(x + 36, y + 6, n ? P.YE : P.W); px(x + 1, y + 6, P.RD);
  for (const wx of [x + 8, x + 29]) { disc(wx, y + 10, 3, P.K); disc(wx, y + 10, 1, P.G3); }
  g.restore();
}
// brick with light mortar
function ctX_brick(x, y, w, h, n) {
  rect(x, y, w, h, n ? P.BR : P.RD); ctX_td(x, y, w, h, n ? P.K : P.BR, n ? 6 : 5);
  for (let yy = 0; yy < h; yy += 4) { rect(x, y + yy, w, 1, n ? P.K : P.G1); for (let xx = ((yy >> 2) & 1) * 4; xx < w; xx += 8) px(x + xx, y + yy + 1, n ? P.K : P.G1), px(x + xx, y + yy + 2, n ? P.K : P.G1); }
}
function ctX_window(x, y, w, h, n, lit, curtain, bars) { // sash window with lintel, sill and curtains
  rect(x - 2, y - 3, w + 4, 3, n ? P.G1 : P.G3); rect(x - 2, y - 3, w + 4, 1, n ? P.G3 : P.W); rect(x - 1, y + h, w + 2, 2, n ? P.G1 : P.G3);
  rect(x, y, w, h, n ? P.G1 : P.W);
  const gx = x + 1, gy = y + 1, gw = w - 2, gh = h - 2;
  if (lit) { rect(gx, gy, gw, gh, P.YE); ctX_td(gx, gy + gh - 4, gw, 4, P.W, 4); }
  else { rect(gx, gy, gw, gh, n ? P.K : P.BL); if (!n) { line(gx + 1, gy + gh - 2, gx + gw - 3, gy + 1, P.BL2); line(gx + 3, gy + gh - 2, gx + gw - 2, gy + 3, P.CY); } }
  if (curtain) { rect(gx, gy, 3, gh, curtain); rect(gx + gw - 3, gy, 3, gh, curtain); px(gx + 1, gy + 2, P.K); px(gx + gw - 2, gy + 4, P.K); rect(gx, gy, gw, 2, curtain); }
  rect(gx, gy + (gh >> 1), gw, 1, n ? P.G1 : P.W); rect(gx + (gw >> 1), gy, 1, gh, n ? P.G1 : P.W);
  if (bars) for (let xx = gx + 1; xx < gx + gw; xx += 3) rect(xx, y - 1, 1, h + 1, P.K);
}
const ctX_bInfo = new Map();
function ctX_bldStatic(b, type, n, w, h, key) {
  const r = ctX_rng(b.key || b.address || 'b'), cx = w >> 1, base = h - 26, info = { wins: [], door: [cx, base], roofY: 20, smoke: [], beacon: null, guards: [] };
  ctX_bInfo.set(key, info);
  // sky
  if (n) { vgrad(0, 0, w, base, [P.K, P.K, P.BL]); for (let i = 0; i < 40; i++) px(r() * w | 0, r() * base * 0.6 | 0, r() < 0.3 ? P.W : P.G1); }
  else vgrad(0, 0, w, base, [P.BL, P.BL2, P.CY]);
  const city = cityById(b.city) || {};
  const warm = city.region === 'mideast' || city.region === 'americas';
  // neighbours
  const nb = (x0, ww, hh, face, win) => { rect(x0, base - hh, ww, hh, face); rect(x0, base - hh, ww, 2, n ? P.K : P.G1); for (let yy = base - hh + 8; yy < base - 8; yy += 14) for (let xx = x0 + 4; xx < x0 + ww - 6; xx += 12) { rect(xx, yy, 6, 9, win && r() < 0.35 ? P.YE : n ? P.K : P.BL); rect(xx - 1, yy - 2, 8, 1, n ? P.G1 : P.G3); } };
  const nf = n ? P.G1 : warm ? P.W : P.G3;
  // ground: sidewalk, curb, road
  const street = () => {
    rect(0, base, w, 10, n ? P.G1 : P.G3); for (let xx = (r() * 8 | 0); xx < w; xx += 16) rect(xx, base, 1, 10, n ? P.K : P.G1); rect(0, base + 4, w, 1, n ? P.K : P.G1); ctX_td(0, base, w, 10, n ? P.K : P.W, 2);
    rect(0, base + 10, w, 2, n ? P.G3 : P.W); rect(0, base + 12, w, h - base - 12, n ? P.K : P.G1); ctX_td(0, base + 12, w, h - base - 12, n ? P.G1 : P.K, 3);
    for (let xx = 4; xx < w; xx += 20) rect(xx, base + 20, 10, 1, n ? P.G3 : P.W);
  };
  const lamp = lx => { rect(lx, base - 56, 2, 56, P.K); rect(lx + 2, base - 56, 8, 2, P.K); rect(lx + 7, base - 54, 5, 3, P.G1); rect(lx + 8, base - 51, 3, 1, n ? P.YE : P.G3); rect(lx - 1, base - 3, 4, 3, P.K); if (n) { ctX_td(lx - 2, base, 22, 10, P.YE, 3); for (let yy = base - 50; yy < base; yy += 2) { const sp = Math.round((yy - (base - 50)) * 0.18); ctX_td(lx + 9 - sp, yy, sp * 2 + 1, 1, P.YE, 1); } } };
  if (type === 'hideout') {
    const L = cx - 60, R = cx + 60, top = base - 112;
    nb(0, L - 1, 100, nf, n); nb(R + 1, w - R, 84, n ? P.BL : P.BR, n);
    // roof, chimneys, antenna
    rect(L + 12, top - 16, 10, 16, P.BR); ctX_td(L + 12, top - 16, 10, 16, P.K, 5); rect(L + 11, top - 17, 12, 2, P.G1); rect(L + 13, top - 20, 3, 3, P.RD); rect(L + 18, top - 20, 3, 3, P.RD);
    rect(R - 26, top - 12, 10, 12, P.BR); ctX_td(R - 26, top - 12, 10, 12, P.K, 5); rect(R - 27, top - 13, 12, 2, P.G1);
    info.smoke.push([L + 14, top - 21], [R - 22, top - 14]);
    line(cx + 6, top - 24, cx + 6, top, P.G1); line(cx - 2, top - 20, cx + 14, top - 20, P.G1); line(cx + 1, top - 14, cx + 11, top - 14, P.G1);
    ctX_brick(L, top, 120, base - top, n);
    rect(L - 3, top - 2, 126, 6, n ? P.G3 : P.W); rect(L - 3, top + 3, 126, 1, P.G1); for (let xx = L - 2; xx < R + 2; xx += 3) px(xx, top + 2, P.G1); for (let xx = L; xx < R; xx += 16) { rect(xx, top + 4, 3, 4, n ? P.G1 : P.G3); }
    const curt = [P.RD, P.GR, P.YE, P.BL2, P.PK, P.W];
    for (let fl = 0; fl < 3; fl++) for (let c = 0; c < 3; c++) {
      const wx = L + 14 + c * 36, wy = top + 14 + fl * 26, lit = n && r() < 0.45; info.wins.push([wx + 1, wy + 1, 16, 18, lit]);
      ctX_window(wx, wy, 18, 20, n, lit, r() < 0.7 ? curt[r() * curt.length | 0] : null, false);
    }
    rect(L, base - 34, 120, 2, n ? P.G1 : P.G3);
    // door + stoop + barred ground windows
    rect(cx - 10, base - 34, 20, 28, n ? P.G1 : P.G3); rect(cx - 8, base - 28, 16, 22, n ? P.K : P.GR); ctX_dome(cx, base - 28, 5, n ? P.YE : P.BL2, 8); rect(cx - 8, base - 28, 16, 1, n ? P.G1 : P.G3);
    frame(cx - 7, base - 26, 6, 8, P.K); frame(cx + 1, base - 26, 6, 8, P.K); frame(cx - 7, base - 16, 6, 8, P.K); frame(cx + 1, base - 16, 6, 8, P.K); px(cx + 5, base - 17, P.YE); rect(cx - 1, base - 22, 2, 2, P.YE);
    for (let s = 0; s < 3; s++) rect(cx - 12 - s * 2, base - 6 + s * 2, 24 + s * 4, 2, s % 2 ? P.G3 : P.W);
    for (const sx of [cx - 18, cx + 17]) { rect(sx, base - 14, 1, 14, P.K); for (let yy = base - 14; yy < base; yy += 4) px(sx, yy, P.K); } rect(cx - 18, base - 14, 6, 1, P.K); rect(cx + 12, base - 14, 6, 1, P.K);
    for (const wx of [L + 12, R - 32]) { ctX_window(wx, base - 28, 20, 18, n, n && r() < 0.5, null, true); info.wins.push([wx + 1, base - 27, 18, 16, false]); }
    info.door = [cx, base - 6]; info.roofY = top - 2; info.guards = [[cx - 26, base + 8], [cx + 20, base + 8], [L + 4, top - 1, 'roof'], [R - 10, top - 1, 'roof']];
    street(); lamp(R + 8);
  } else if (type === 'office') {
    const L = cx - 58, R = cx + 58, top = 8;
    nb(0, L - 1, 120, nf, n); nb(R + 1, w - R, 70, n ? P.BL : P.G3, n);
    rect(L, top, 116, base - top, n ? P.K : P.TL);
    for (let yy = top + 2; yy < base - 48; yy += 12) {
      rect(L, yy, 116, 3, n ? P.G1 : P.G3); rect(L, yy + 2, 116, 1, n ? P.K : P.G1);
      for (let xx = L + 1; xx < R - 1; xx += 10) {
        const gx = xx, gy = yy + 3, lit = n && r() < 0.4;
        rect(gx, gy, 9, 9, lit ? P.YE : n ? P.BL : P.TL);
        if (lit) { rect(gx, gy + 3, 9, 1, P.W); if (r() < 0.4) rect(gx + 3, gy + 6, 3, 3, P.K); }
        else if (!n) { const d = (xx - L) + (yy - top) * 0.6; if ((d % 50) < 16) ctX_td(gx, gy, 9, 9, P.CY, 8); if ((d % 50) < 6) ctX_td(gx, gy, 9, 9, P.W, 6); }
        rect(gx + 9, gy, 1, 9, n ? P.G1 : P.G1);
        info.wins.push([gx, gy, 9, 9, lit]);
      }
    }
    rect(R - 2, top, 2, base - top, n ? P.G1 : P.BL);
    // podium & entrance
    rect(L - 4, base - 30, 124, 4, n ? P.G1 : P.G3); rect(L - 4, base - 30, 124, 1, P.W);
    rect(L, base - 26, 116, 26, n ? P.G1 : P.G3); rect(cx - 30, base - 24, 60, 24, n ? P.YE : P.G1); ctX_td(cx - 30, base - 24, 60, 24, n ? P.W : P.K, 3);
    for (let xx = cx - 30; xx < cx + 31; xx += 12) rect(xx, base - 24, 2, 24, P.K);
    rect(cx - 9, base - 20, 18, 20, P.K); ctX_ell(cx, base - 10, 8, 9, n ? P.G1 : P.G3); rect(cx - 1, base - 20, 2, 20, P.K); line(cx - 7, base - 16, cx + 7, base - 4, P.K);
    rect(L, base - 46, 116, 16, n ? P.G1 : P.G3); ctX_td(L, base - 46, 116, 16, n ? P.K : P.W, 3); rect(L, base - 46, 116, 1, P.W);
    rect(cx - 36, base - 34, 72, 5, P.K);
    const sign = b.agency || ['IMPEX', 'TRANSCO', 'INTERTRADE', 'GLOBEX'][(r() * 4) | 0];
    rect(cx - 32, base - 44, 64, 11, P.K); frame(cx - 32, base - 44, 64, 11, n ? P.YE : P.W); textC(sign, cx, base - 42, b.agency ? P.YE : P.W);
    for (const px_ of [L + 2, R - 16]) { rect(px_, base - 8, 14, 8, P.G1); rect(px_, base - 8, 14, 1, P.G3); ctX_ell(px_ + 7, base - 11, 7, 3, P.GR); ctX_ellD(px_ + 6, base - 12, 5, 2, P.GR2, 6); }
    if (b.agency) { // flags
      for (const [fx, k] of [[L - 10, 0], [R + 6, 1]]) { rect(fx, base - 70, 1, 70, P.G3); const fy = base - 69;
        if (b.agency === 'KGB') { rect(fx + 1, fy, 12, 8, P.RD); px(fx + 3, fy + 1, P.YE); px(fx + 4, fy + 2, P.YE); px(fx + 3, fy + 3, P.YE); }
        else if (b.agency === 'MI6') { rect(fx + 1, fy, 12, 8, P.BL); line(fx + 1, fy, fx + 12, fy + 7, P.W); line(fx + 1, fy + 7, fx + 12, fy, P.W); rect(fx + 1, fy + 3, 12, 2, P.RD); rect(fx + 6, fy, 2, 8, P.RD); }
        else { rect(fx + 1, fy, 12, 8, P.W); rect(fx + 1, fy + 1, 12, 1, P.BL); rect(fx + 1, fy + 6, 12, 1, P.BL); px(fx + 6, fy + 3, P.BL); px(fx + 7, fy + 4, P.BL); px(fx + 5, fy + 4, P.BL); } } }
    info.door = [cx, base]; info.roofY = top; info.guards = [[cx - 44, base + 8], [cx + 38, base + 8], [cx - 16, base + 8], [cx + 10, base + 8]];
    street();
  } else if (type === 'active cel') {
    const L = cx - 52, R = cx + 52, top = 22;
    nb(0, L - 1, 70, nf, n); nb(R + 1, w - R, 96, n ? P.BL : P.G3, n);
    rect(L, top, 104, base - top, n ? P.G1 : P.G3); ctX_td(L, top, 104, base - top, n ? P.K : P.G1, 3); rect(R - 8, top, 8, base - top, n ? P.K : P.G1); ctX_td(R - 8, top, 8, base - top, n ? P.G1 : P.G3, 4);
    // roof kit
    rect(L + 10, top - 12, 18, 12, P.G1); rect(L + 10, top - 12, 18, 2, P.G3); for (const lx of [L + 12, L + 25]) rect(lx, top - 2, 1, 2, P.K);
    rect(R - 22, top - 30, 1, 30, P.K); line(R - 22, top - 30, R - 30, top, P.K); line(R - 22, top - 30, R - 14, top, P.K); for (const yy of [top - 24, top - 16]) rect(R - 26, yy, 9, 1, P.K);
    info.beacon = [R - 22, top - 31];
    rect(L - 2, top - 2, 108, 2, P.W);
    const laundry = [P.RD, P.W, P.YE, P.BL2, P.PK, P.GR2];
    for (let fl = 0, yy = top + 4; yy < base - 34; yy += 13, fl++) {
      for (let c = 0; c < 4; c++) {
        const wx = L + 6 + c * 25, lit = n && r() < 0.4;
        rect(wx, yy, 18, 8, lit ? P.YE : n ? P.K : P.BL); if (!lit && !n) line(wx + 2, yy + 7, wx + 8, yy + 1, P.BL2); rect(wx + 9, yy, 1, 8, n ? P.G1 : P.G3);
        if (lit && r() < 0.4) rect(wx + 3, yy + 3, 3, 5, P.K);
        info.wins.push([wx, yy, 18, 8, lit]);
      }
      rect(L - 3, yy + 9, 110, 2, n ? P.G3 : P.W); ctX_td(L, yy + 11, 104, 2, P.K, 5);
      for (let xx = L - 3; xx < R + 3; xx += 2) px(xx, yy + 8, n ? P.G1 : P.G1); rect(L - 3, yy + 6, 110, 1, n ? P.G1 : P.G1);
      if (r() < 0.6) { const lx = L + (r() * 80 | 0); for (let k = 0; k < 5; k++) rect(lx + k * 4, yy + 7, 2, 3, laundry[(k + fl) % laundry.length]); }
      if (r() < 0.3) { const dx = L + 4 + (r() * 90 | 0); disc(dx, yy + 3, 3, n ? P.G3 : P.W); px(dx + 1, yy + 2, P.G1); }
      if (r() < 0.4) { const px_ = L + 4 + (r() * 90 | 0); rect(px_, yy + 5, 4, 3, P.BR); ctX_ellD(px_ + 2, yy + 4, 3, 2, P.GR, 12); }
    }
    // ground floor: steel door, graffiti, bins
    rect(L, base - 30, 104, 30, n ? P.G1 : P.G3); rect(L, base - 30, 104, 2, P.K);
    rect(cx - 8, base - 24, 16, 24, P.G1); rect(cx - 7, base - 23, 14, 23, n ? P.K : P.BL); rect(cx - 1, base - 23, 1, 23, P.G1); rect(cx + 3, base - 13, 2, 1, P.G3); rect(cx - 10, base - 27, 20, 3, P.K); rect(cx - 2, base - 30, 4, 3, n ? P.YE : P.W);
    const gcol = [P.RD, P.GR2, P.PK, P.CY, P.YE];
    for (let k = 0; k < 7; k++) { const gx = L + 6 + (k < 4 ? k * 9 : 60 + (k - 4) * 12), gy = base - 16 + ((k * 5) % 6), c = gcol[k % 5]; line(gx, gy + 6, gx + 3, gy, c); line(gx + 3, gy, gx + 5, gy + 6, c); line(gx + 5, gy + 6, gx + 8, gy + 1, c); if (k % 2) rect(gx, gy + 3, 7, 1, c); }
    rect(R - 26, base - 12, 20, 12, P.GR); rect(R - 27, base - 13, 22, 2, P.K); ctX_td(R - 26, base - 11, 20, 11, P.K, 5); px(R - 22, base - 14, P.W); px(R - 18, base - 15, P.BR);
    info.door = [cx, base]; info.roofY = top - 2; info.guards = [[cx - 20, base + 8], [cx + 14, base + 8], [L + 34, top - 2, 'roof'], [R - 40, base + 8]];
    street(); lamp(L - 18);
  } else { // 'agent': stucco safehouse / villa
    const L = cx - 58, R = cx + 58, top = base - 76;
    const st = n ? P.G3 : P.W, sd = n ? P.G1 : P.YE;
    nb(0, L - 4, 60, nf, n); nb(R + 4, w - R, 54, n ? P.BL : P.G3, n);
    // cypress & palm
    rect(L - 9, base - 16, 2, 4, P.BR); for (let i = 0; i < 46; i++) { const hw = Math.round(4.5 * Math.sin(Math.min(Math.PI, (i + 3) / 49 * Math.PI)) ** 0.7); rect(L - 8 - hw, base - 16 - i, hw * 2 + 1, 1, P.GR); if (hw > 1) { px(L - 8 - hw + 1 + (i % 3), base - 16 - i, n ? P.K : P.GR2); px(L - 8 + hw - (i % 2), base - 16 - i, P.K); } } rect(R + 8, base - 70, 2, 58, P.BR); for (let yy = base - 70; yy < base - 12; yy += 3) px(R + 8, yy, P.YE);
    for (let f = 0; f < 9; f++) { const a = -Math.PI * (0.05 + f * 0.11); for (let j = 1; j < 16; j++) { const xx = Math.round(R + 9 + Math.cos(a) * j), yy = Math.round(base - 71 + Math.sin(a) * j * 0.7 + j * j * 0.05); px(xx, yy, P.GR); if (j % 2) px(xx, yy + 1, n ? P.GR : P.GR2); } }
    // roof
    for (let i = 0; i < 16; i++) { const yy = top - 16 + i, inset = 16 - i; rect(L - 4 + inset, yy, 124 - inset * 2, 1, P.RD); if (i % 3 === 0) rect(L - 4 + inset, yy, 124 - inset * 2, 1, P.BR); }
    for (let xx = L; xx < R; xx += 4) px(xx, top - 1, P.BR); rect(L - 6, top, 128, 2, P.K);
    rect(R - 30, top - 26, 8, 12, st); rect(R - 31, top - 27, 10, 2, P.RD); info.smoke.push([R - 27, top - 28]);
    rect(L, top + 2, 116, base - top - 2, st); ctX_td(L, top + 2, 116, base - top - 2, sd, n ? 4 : 3); ctX_td(L, top + 2, 116, 4, P.G1, 4);
    // arched, shuttered windows
    for (const [wx, wy] of [[L + 10, top + 12], [L + 40, top + 12], [R - 30, top + 12], [L + 10, top + 44], [R - 30, top + 44]]) {
      const lit = n && r() < 0.5;
      rect(wx - 6, wy, 6, 20, P.GR); rect(wx + 20, wy, 6, 20, P.GR); for (let yy = wy + 1; yy < wy + 20; yy += 2) { rect(wx - 6, yy, 6, 1, P.K); rect(wx + 20, yy, 6, 1, P.K); }
      rect(wx, wy, 20, 20, lit ? P.YE : n ? P.K : P.BL); ctX_dome(wx + 10, wy, 6, lit ? P.YE : n ? P.K : P.BL, 10); rect(wx + 9, wy - 6, 2, 26, n ? P.G1 : P.W); rect(wx, wy + 8, 20, 1, n ? P.G1 : P.W);
      if (!lit && !n) line(wx + 2, wy + 18, wx + 7, wy + 2, P.BL2);
      rect(wx - 2, wy + 20, 24, 2, n ? P.G1 : P.G3);
      info.wins.push([wx, wy, 20, 20, lit]);
    }
    // balcony over the door
    rect(cx - 16, top + 36, 32, 2, P.K); for (let xx = cx - 16; xx < cx + 16; xx += 3) rect(xx, top + 28, 1, 8, P.K); rect(cx - 16, top + 28, 32, 1, P.K);
    // door
    rect(cx - 11, base - 30, 22, 30, n ? P.G1 : P.G3); rect(cx - 9, base - 26, 18, 26, P.BR); ctX_dome(cx, base - 26, 8, P.BR, 9); ctX_td(cx - 9, base - 30, 18, 30, P.K, 3); rect(cx, base - 34, 1, 34, P.K);
    for (let yy = base - 24; yy < base; yy += 5) { px(cx - 5, yy, P.YE); px(cx + 4, yy, P.YE); }
    rect(cx + 14, base - 26, 3, 5, P.K); rect(cx + 15, base - 25, 1, 3, n ? P.YE : P.G3);
    // bougainvillea
    for (let k = 0; k < 9; k++) { const bx = R - 4 - (r() * 16 | 0), by = top + 6 + k * 7 + (r() * 3 | 0); ctX_ellD(bx, by, 4, 3, P.GR, 9); ctX_ellD(bx, by, 4, 3, n ? P.PU : P.MG, 7); ctX_ellD(bx - 1, by - 1, 3, 2, n ? P.MG : P.PK, 5); }
    for (let k = 0; k < 20; k++) px(R - 4 - (k % 5), top + 64 + (k / 5 | 0) * 2, P.GR);
    // garden wall with gate
    rect(0, base - 12, w, 12, st); ctX_td(0, base - 12, w, 12, sd, 3); rect(0, base - 13, w, 2, n ? P.G1 : P.G3);
    rect(cx - 14, base - 16, 28, 16, n ? P.K : P.G1); ctX_td(cx - 14, base - 16, 28, 16, st, 3); for (let xx = cx - 13; xx < cx + 14; xx += 3) rect(xx, base - 18, 1, 18, P.K); rect(cx - 14, base - 18, 28, 1, P.K); rect(cx - 16, base - 20, 3, 20, st); rect(cx + 13, base - 20, 3, 20, st);
    info.door = [cx, base - 12]; info.roofY = top - 16; info.guards = [[cx - 24, base + 8], [cx + 18, base + 8], [cx - 46, base + 8], [cx + 40, base + 8]];
    street(); lamp(L - 22);
  }
  // parked car
  const cars = [P.K, P.RD, P.BL, P.W, P.G3, P.BR], carc = cars[(r() * cars.length) | 0];
  info.car = [type === 'office' ? cx + 20 : cx + 28, base + 11, carc];
}
function buildingArt(x, y, w, h, b) {
  const n = isNight(), type = b.agency ? (b.type || 'office') : b.type || 'hideout', t = ctX_now();
  const key = 'ctXb' + (b.key || b.address) + type + (n ? 'n' : 'd') + w + 'x' + h;
  const spr = sprite(key, w, h, () => ctX_bldStatic(b, type, n, w, h, key));
  const info = ctX_bInfo.get(key); if (!info) return;
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.translate(x, y);
  g.drawImage(spr, 0, 0);
  const base = h - 26;
  // chimney smoke
  for (const [sx, sy] of info.smoke) for (let i = 0; i < 4; i++) { const ph = (t * 0.35 + i / 4) % 1, yy = Math.round(sy - ph * 26), xx = Math.round(sx + ph * 12 + Math.sin(t * 1.5 + i) * 1.5), rr = 1 + Math.round(ph * 3); ctX_ellD(xx, yy, rr + 1, rr, n ? P.G1 : P.G3, 12 - ph * 9 | 0); }
  if (info.beacon && ((t * 1.3) | 0) % 2) { px(info.beacon[0], info.beacon[1], P.RD2); px(info.beacon[0] - 1, info.beacon[1], P.RD); px(info.beacon[0] + 1, info.beacon[1], P.RD); }
  // life in the windows: a TV flicker and a face at the curtain
  if (info.wins.length) {
    const wv = info.wins[(b.address || '').length % info.wins.length];
    if (n) { const f = (t * 7 | 0) % 5; ctX_td(wv[0] + 2, wv[1] + 2, wv[2] - 4, wv[3] - 4, f < 2 ? P.BL2 : f < 4 ? P.CY : P.W, f === 4 ? 3 : 6); }
    const pk = info.wins[((t / 6) | 0) * 7 % info.wins.length], ph = t % 6;
    if (ph > 4.2 && pk !== wv) { const fx = pk[0] + (pk[2] >> 1) - 2, fy = pk[1] + 3; rect(fx, fy, 4, 4, n ? P.K : P.SK); rect(fx - 1, fy + 4, 6, Math.max(0, pk[3] - 7), n ? P.K : ctX_uniform(b)); if (!n) { px(fx + 1, fy + 1, P.K); px(fx + 3, fy + 1, P.K); rect(fx, fy - 1, 4, 1, P.K); } }
  }
  // parked car, and now and then one passes
  ctX_sedan(info.car[0], info.car[1], info.car[2], n);
  const ph = (t + (b.address || '').length * 3) % 11;
  if (ph < 3) ctX_sedan(Math.round(-40 + (ph / 3) * (w + 80)), base + 16, [P.W, P.RD, P.BL2, P.YE][((t / 11) | 0) % 4], n);
  // guards: more of them the more alert the building is
  const uni = ctX_uniform(b), nG = Math.min(6, 1 + (b.alert || 0) + (b.suspect !== null && b.suspect !== undefined ? 1 : 0) + (b.agency ? 1 : 0));
  const slots = info.guards;
  for (let i = 0; i < nG; i++) {
    if (i < slots.length) {
      const [gx, gy, roof] = slots[i]; const turn = ((t / 2.5 + i) | 0) % 3 === 0;
      if (roof && gy < 4) continue;
      ctX_blit(ctX_guardSpr(uni, 0), gx, gy - 17, turn);
      if (!roof && i === 1 && ((t * 1.5) | 0) % 4 === 0) px(gx + 1, gy - 14, P.YE);
    } else { // patrols along the pavement
      const span = w + 30, k = i - slots.length, dir = k % 2 ? -1 : 1, pos = ((t * 9 + k * 70) % (span * 2));
      const xx = Math.round(pos < span ? pos - 15 : span * 2 - pos - 15), step = (t * 5 | 0) % 2;
      ctX_blit(ctX_guardSpr(uni, step), xx, base + 8 - 17, (pos < span) !== (dir > 0));
    }
  }
  // a passer-by
  const cp = (t * 11 + (b.address || '').length * 20) % (w + 120), cxp = Math.round(w + 20 - cp);
  if (cxp > -10 && cxp < w + 10) ctX_blit(ctX_civSpr((b.address || '').length, (t * 5 | 0) % 2), cxp, base + 9 - 17, true);
  g.restore();
}

// ---------------------------------------------------------------
// BINOCULARS: the doorway, magnified, through two overlapping lenses
// ---------------------------------------------------------------
const ctX_faceCuts = new Map();
function ctX_faceCut(f) { // the dossier portrait with its dithered backdrop removed
  const key = JSON.stringify(f);
  let c = ctX_faceCuts.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = 26; c.height = 32;
  const cx = c.getContext('2d'); drawTo(cx, () => drawFace(f, 0, 0, 26, 32));
  try {
    const im = cx.getImageData(0, 0, 26, 32), d = im.data, hx = String(f.bg || '#000000');
    const br = parseInt(hx.slice(1, 3), 16), bgc = parseInt(hx.slice(3, 5), 16), bb = parseInt(hx.slice(5, 7), 16);
    const cand = (x, y) => { const i = (y * 26 + x) * 4; if (d[i + 3] === 0) return false; if (d[i] === br && d[i + 1] === bgc && d[i + 2] === bb) return true; return d[i] === 0 && d[i + 1] === 0 && d[i + 2] === 0 && BAYER[(y & 3) * 4 + (x & 3)] < 5; };
    const st = []; for (let x = 0; x < 26; x++) st.push([x, 0], [x, 31]); for (let y = 0; y < 32; y++) st.push([0, y], [25, y]);
    while (st.length) { const [x, y] = st.pop(); if (x < 0 || y < 0 || x > 25 || y > 31 || !cand(x, y)) continue; d[(y * 26 + x) * 4 + 3] = 0; st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
    cx.putImageData(im, 0, 0);
  } catch (e) { /* tainted canvas: keep the plain portrait */ }
  ctX_faceCuts.set(key, c); return c;
}
function ctX_binoMask(w, h, c1x, c2x, cy, r) {
  return sprite('ctXbmask' + w + 'x' + h, w, h, () => {
    const im = g.createImageData(w, h), d = im.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const e = r - Math.min(Math.hypot(x - c1x, y - cy), Math.hypot(x - c2x, y - cy)); // depth inside the lens
      let a = 0;
      if (e < 0) a = 255; else if (e < 6 && BAYER[(y & 3) * 4 + (x & 3)] < Math.round((6 - e) * 2.4)) a = 255;
      const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = a;
    }
    g.putImageData(im, 0, 0);
  });
}
let ctX_binoFace = null, ctX_binoT0 = 0;
function ctX_binoScene(b, type, n, face, t) { // design units 100x100, drawn at 2x
  g.drawImage(sprite('ctXbino' + (b.key || b.address) + type + (n ? 'n' : 'd') + (face ? 'o' : 'c'), 100, 100, () => ctX_binoBack(b, type, n, face)), 0, 0);
  if (face) ctX_binoPerson(face, t);
}
function ctX_binoBack(b, type, n, face) {
  const r = ctX_rng((b.key || b.address || 'x') + 'bino'), cols = { hideout: n ? P.BR : P.RD, office: n ? P.G1 : P.G3, 'active cel': n ? P.G1 : P.G3, agent: n ? P.G3 : P.W };
  // wall
  if (type === 'hideout') ctX_brick(0, 0, 100, 74, n);
  else if (type === 'office') { rect(0, 0, 100, 74, n ? P.BL : P.TL); for (let xx = 0; xx < 100; xx += 14) rect(xx, 0, 2, 74, n ? P.G1 : P.G3); for (let yy = 8; yy < 74; yy += 22) rect(0, yy, 100, 2, n ? P.G1 : P.G3); if (!n) ctX_td(0, 0, 30, 74, P.CY, 5); else ctX_td(70, 0, 30, 30, P.YE, 5); }
  else if (type === 'active cel') { rect(0, 0, 100, 74, cols[type]); ctX_td(0, 0, 100, 74, n ? P.K : P.G1, 4); const gc = [P.RD, P.GR2, P.PK, P.CY]; for (let k = 0; k < 4; k++) { const gx = 4 + k * 8 + (k > 1 ? 58 : 0), gy = 50 + (k * 5) % 8; line(gx, gy + 10, gx + 4, gy, gc[k]); line(gx + 4, gy, gx + 7, gy + 10, gc[k]); line(gx, gy + 5, gx + 8, gy + 4, gc[k]); } }
  else { rect(0, 0, 100, 74, cols.agent); ctX_td(0, 0, 100, 74, n ? P.G1 : P.YE, 3); }
  // doorway
  const dx = 36, dy = 12, dw = 28, dh = 58;
  rect(dx - 4, dy - 4, dw + 8, dh + 4, n ? P.G1 : P.G3); rect(dx - 4, dy - 4, dw + 8, 1, n ? P.G3 : P.W); rect(dx + dw + 3, dy - 4, 1, dh + 4, P.G1);
  const open = !!face;
  rect(dx, dy, dw, dh, open ? (n ? P.YE : P.G1) : type === 'hideout' ? P.GR : type === 'agent' ? P.BR : P.BL);
  if (open) { if (n) ctX_td(dx, dy, dw, dh, P.W, 3); else { ctX_td(dx, dy, dw, dh, P.K, 6); rect(dx + 4, dy + 30, 10, 28, P.BR); } rect(dx + dw - 5, dy, 5, dh, type === 'hideout' ? P.GR : P.BR); rect(dx + dw - 5, dy, 1, dh, P.K); }
  else { frame(dx + 3, dy + 4, 9, 20, P.K); frame(dx + 16, dy + 4, 9, 20, P.K); frame(dx + 3, dy + 30, 9, 22, P.K); frame(dx + 16, dy + 30, 9, 22, P.K); disc(dx + 22, dy + 30, 1, P.YE); }
  // lamp and house number
  rect(dx + dw + 8, 20, 6, 9, P.K); rect(dx + dw + 9, 21, 4, 7, n ? P.YE : P.G3); rect(dx + dw + 10, 29, 2, 3, P.K); if (n) ctX_td(dx + dw + 4, 14, 16, 26, P.YE, 2);
  const num = String((b.address || '').replace(/\D/g, '') || '12');
  rect(dx - 20, 21, 15, 10, P.W); frame(dx - 20, 21, 15, 10, P.K); text(num.slice(0, 2), dx - 18, 22, P.K);
  // step, pavement, kerb, road
  rect(dx - 8, 70, dw + 16, 4, n ? P.G1 : P.W); rect(dx - 8, 73, dw + 16, 1, P.G1);
  rect(0, 74, 100, 16, n ? P.G1 : P.G3); for (let xx = 6; xx < 100; xx += 20) rect(xx, 74, 1, 16, n ? P.K : P.G1); ctX_td(0, 74, 100, 16, n ? P.K : P.W, 2);
  rect(0, 90, 100, 2, n ? P.G3 : P.W); rect(0, 92, 100, 8, n ? P.K : P.G1);
  // their car waiting at the kerb
}
function ctX_binoPerson(face, t) {
  const e = clamp((t - ctX_binoT0) / 1.4, 0, 1), walk = e < 1 ? ((t * 4) | 0) % 2 : 0;
  const x0 = Math.round(37 + e * 14), y0 = 14 + (walk ? 1 : 0), jk = face.jacket || P.G1, fem = face.sex === 'f';
  // coat, sleeves, hands (the portrait supplies head and shoulders)
  const sk = face.skin || P.SK;
  rect(x0 + 2, y0 + 30, 22, 34, jk); rect(x0 + 1, y0 + 27, 4, 34, jk); rect(x0 + 21, y0 + 27, 4, 34, jk);
  ctX_td(x0 + 19, y0 + 30, 6, 34, P.K, 6); ctX_td(x0 + 1, y0 + 27, 2, 34, P.K, 4);
  rect(x0 + 5, y0 + 34, 1, 30, P.K); rect(x0 + 20, y0 + 34, 1, 30, P.K);
  if (!fem) { rect(x0 + 11, y0 + 32, 4, 3, P.W); rect(x0 + 12, y0 + 32, 2, 5, face.tie || P.RD); px(x0 + 12, y0 + 37, face.tie || P.RD); }
  else rect(x0 + 11, y0 + 32, 4, 2, sk);
  line(x0 + 10, y0 + 31, x0 + 13, y0 + 40, P.K); line(x0 + 16, y0 + 31, x0 + 14, y0 + 40, P.K); rect(x0 + 13, y0 + 40, 1, 24, P.K);
  for (const by of [y0 + 44, y0 + 52]) px(x0 + 15, by, P.G3);
  rect(x0 + 1, y0 + 61, 4, 3, sk); rect(x0 + 21, y0 + 61, 4, 3, sk);
  // briefcase in the right hand
  rect(x0 + 19, y0 + 64, 12, 9, P.BR); rect(x0 + 22, y0 + 62, 6, 2, P.K); rect(x0 + 19, y0 + 67, 12, 1, P.K); px(x0 + 25, y0 + 68, P.YE);
  ctX_blit(ctX_faceCut(face), x0, y0);
}
function binocularArt(x, y, w, h, b, face) {
  const n = isNight(), type = b.agency ? (b.type || 'office') : b.type || 'hideout', t = ctX_now();
  if (face !== ctX_binoFace) { ctX_binoFace = face; ctX_binoT0 = t; }
  const cy = Math.round(h / 2 - 8), r = Math.round(Math.min(h * 0.29, w * 0.3)), c1x = Math.round(w / 2 - r * 0.64), c2x = Math.round(w / 2 + r * 0.64);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  rect(x, y, w, h, P.K);
  // hand-held: a slow drift plus a little tremor
  const jx = Math.round(Math.sin(t * 0.9) * 1.6 + Math.sin(t * 3.1) * 0.7), jy = Math.round(Math.cos(t * 0.7) * 1.3 + Math.sin(t * 2.7) * 0.6);
  g.save(); g.translate(x + w / 2 - 100 + jx, y + cy - r - 18 + jy); g.scale(2, 2); ctX_binoScene(b, type, n, face, t); g.restore();
  g.drawImage(ctX_binoMask(w, h, c1x, c2x, cy, r), x, y);
  // faint lens glint
  px(x + c1x - Math.round(r * 0.55), y + cy - Math.round(r * 0.6), P.G1); px(x + c2x - Math.round(r * 0.55), y + cy - Math.round(r * 0.6), P.G1);
  g.restore();
}
