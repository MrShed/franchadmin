// FACET — launch film. 25 s at 96 BPM (one bar = 2.5 s). Everything is drawn from the time t,
// so the same code plays live in the page and renders frame-exact to video.
'use strict';
const W = 1920, H = 1080, DUR = 25, BAR = 2.5;
const C = {
  ink: '#0d0b12', ink2: '#15121d', bone: '#efeae2', dim: '#8d8699', faint: '#3a3446',
  // the light through a cut facet: a narrow spectrum
  s1: '#5fe3d7', s2: '#7aa8ff', s3: '#b58cff', s4: '#ff9ec2', s5: '#ffc877',
};
const SPEC = [C.s1, C.s2, C.s3, C.s4, C.s5];
const DISPLAY = '"Bricolage Grotesque", "Helvetica Neue", Arial, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';

// ---------- maths ----------
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eOut = t => 1 - Math.pow(1 - t, 3);
const eIn = t => t * t * t;
const eIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const eBack = t => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const eExpo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
function hexPts(cx, cy, r, rot = 0) { const p = []; for (let i = 0; i < 6; i++) { const a = rot + i * Math.PI / 3 + Math.PI / 6; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; }

// ---------- canvas ----------
let cv, g;
function poly(pts) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); }
function specGrad(x0, y0, x1, y1, a = 1, shift = 0) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  const k = Math.round(((shift % 1) + 1) % 1 * SPEC.length);
  SPEC.forEach((c, i) => gr.addColorStop(i / (SPEC.length - 1), SPEC[(i + k) % SPEC.length]));
  return gr;
}
function text(s, x, y, o = {}) {
  g.save();
  g.font = (o.weight || 700) + ' ' + (o.size || 64) + 'px ' + (o.mono ? MONO : DISPLAY);
  g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic';
  if (o.ls !== undefined) g.letterSpacing = o.ls + 'px';
  g.globalAlpha *= o.alpha === undefined ? 1 : o.alpha;
  g.fillStyle = o.fill || C.bone;
  if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = o.blur || 24; }
  g.fillText(s, x, y);
  g.restore();
}
function measure(s, o) { g.save(); g.font = (o.weight || 700) + ' ' + (o.size || 64) + 'px ' + (o.mono ? MONO : DISPLAY); if (o.ls !== undefined) g.letterSpacing = o.ls + 'px'; const w = g.measureText(s).width; g.restore(); return w; }
// a headline that rises in word by word and leaves by fading up
function headline(lines, x, y, t, t0, t1, o = {}) {
  const size = o.size || 76, lh = size * 1.08;
  lines.forEach((line, li) => {
    const words = line.split(' '); let cx = x;
    const total = measure(line, { size, weight: 800, ls: -2 });
    if (o.align === 'center') cx = x - total / 2;
    words.forEach((w, wi) => {
      const k = li * 4 + wi;
      const pin = eOut(prog(t, t0 + k * 0.06, t0 + k * 0.06 + 0.55));
      const pout = eIn(prog(t, t1 - 0.4, t1));
      const a = pin * (1 - pout);
      if (a > 0.001) {
        const dy = (1 - pin) * 34 - pout * 18;
        const fill = o.accent && o.accent.includes(w) ? specGrad(cx, 0, cx + 400, 0) : C.bone;
        text(w, cx, y + li * lh + dy, { size, weight: 800, ls: -2, alpha: a, fill });
      }
      cx += measure(w + ' ', { size, weight: 800, ls: -2 });
    });
  });
}
function kicker(s, x, y, t, t0, t1, o = {}) {
  const a = eOut(prog(t, t0, t0 + 0.5)) * (1 - prog(t, t1 - 0.35, t1));
  if (a <= 0) return;
  text(s, x, y, { size: o.size || 24, weight: 500, mono: true, ls: 4, fill: o.fill || C.dim, alpha: a, align: o.align });
}

// ---------- the world: background, light, grain ----------
let grain;
function makeGrain() {
  grain = document.createElement('canvas'); grain.width = grain.height = 512;
  const q = grain.getContext('2d'), im = q.createImageData(512, 512), r = rng(7);
  for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 18; }
  q.putImageData(im, 0, 0);
}
function background(t) {
  g.fillStyle = C.ink; g.fillRect(0, 0, W, H);
  // slow caustic light: two coloured pools drifting
  const pools = [[0.22, 0.28, C.s2, 0.10], [0.78, 0.72, C.s4, 0.07], [0.6, 0.18, C.s1, 0.05]];
  pools.forEach(([px, py, c, a], i) => {
    const x = W * (px + 0.05 * Math.sin(t * 0.21 + i * 2)), y = H * (py + 0.05 * Math.cos(t * 0.17 + i));
    const r = 900;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, hexA(c, a)); gr.addColorStop(1, hexA(c, 0));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  // a fine facet lattice, barely there
  g.save(); g.globalAlpha = 0.05; g.strokeStyle = C.bone; g.lineWidth = 1;
  const s = 96, off = (t * 6) % (s * 1.732);
  for (let y = -s; y < H + s; y += s * 0.866) for (let x = -s; x < W + s; x += s * 1.5) { }
  g.beginPath();
  for (let i = -20; i < 40; i++) { const x = i * s * 1.2 - off; g.moveTo(x, 0); g.lineTo(x + H * 0.577, H); g.moveTo(x, H); g.lineTo(x + H * 0.577, 0); }
  g.stroke(); g.restore();
}
function finish(t) {
  // vignette
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.0);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  // film grain, moving each frame
  const f = Math.floor(t * 24), r = rng(f + 1);
  g.drawImage(grain, -r() * 512, -r() * 512, W + 1024, H + 1024);
  // fade in and out of black
  const a = Math.max(1 - prog(t, 0, 0.6), prog(t, DUR - 0.5, DUR));
  if (a > 0) { g.fillStyle = 'rgba(0,0,0,' + a + ')'; g.fillRect(0, 0, W, H); }
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }

// a cut gem: a hexagon with an inner table and bevels, lit by the spectrum
function gem(cx, cy, r, o = {}) {
  const a = o.alpha === undefined ? 1 : o.alpha; if (a <= 0 || r <= 0) return;
  const rot = o.rot || 0, outer = hexPts(cx, cy, r, rot), inner = hexPts(cx, cy, r * 0.55, rot);
  g.save(); g.globalAlpha *= a;
  if (o.glow) { g.shadowColor = hexA(C.s3, 0.55 * o.glow); g.shadowBlur = 50 * o.glow; }
  poly(outer); g.fillStyle = o.fill || C.ink2; g.fill(); g.shadowBlur = 0;
  // bevels: six trapezoids, each lit a different spectral tint
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6;
    poly([outer[i], outer[j], inner[j], inner[i]]);
    const lit = 0.10 + 0.10 * Math.sin(i * 1.7 + (o.shine || 0));
    g.fillStyle = hexA(SPEC[(i + (o.hue || 0)) % 5], lit * (o.lit || 1)); g.fill();
  }
  poly(inner); g.fillStyle = hexA(SPEC[(o.hue || 0) % 5], 0.10 * (o.lit || 1)); g.fill();
  poly(outer); g.lineWidth = o.lw || 2; g.strokeStyle = specGrad(cx - r, cy - r, cx + r, cy + r, 1, (o.shine || 0) * 0.05 % 1); g.stroke();
  poly(inner); g.lineWidth = 1; g.strokeStyle = hexA(C.bone, 0.18); g.stroke();
  for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(outer[i][0], outer[i][1]); g.lineTo(inner[i][0], inner[i][1]); g.strokeStyle = hexA(C.bone, 0.12); g.stroke(); }
  // a travelling glint
  if (o.glint !== undefined) {
    const gx = cx - r + ((o.glint % 1) * 2.4 - 0.2) * r;
    g.save(); poly(outer); g.clip();
    const gr = g.createLinearGradient(gx - r * 0.3, cy - r, gx + r * 0.3, cy + r);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2); g.restore();
  }
  g.restore();
}

// ---------- scene 1+2: the monolith that shatters into facets (0 – 7.5 s) ----------
const MONO_RECT = { x: 760, y: 250, w: 400, h: 580 };
const JOBS = ['Reconcile invoices', 'Chase approvals', 'Check contract terms', 'Draft variance notes', 'Match remittances', 'Flag duplicates', 'Summarise month-end'];
let SHARDS;
function makeShards() {
  // a jittered 3×4 mesh over the monolith, each cell split into two triangles
  const r = rng(42), cols = 3, rows = 4, P = [];
  for (let j = 0; j <= rows; j++) { P[j] = []; for (let i = 0; i <= cols; i++) {
    const edgeX = i === 0 || i === cols, edgeY = j === 0 || j === rows;
    P[j][i] = [MONO_RECT.x + MONO_RECT.w * i / cols + (edgeX ? 0 : (r() - .5) * 90), MONO_RECT.y + MONO_RECT.h * j / rows + (edgeY ? 0 : (r() - .5) * 90)];
  } }
  const out = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = P[j][i], b = P[j][i + 1], c = P[j + 1][i + 1], d = P[j + 1][i];
    out.push([a, b, c], [a, c, d]);
  }
  // where each shard lands: seven take the honeycomb, the rest drift out and fade
  const HX = 1180, HY = 600, dx = 230, dy = 133; const honey = [[HX, HY], [HX - dx, HY - dy], [HX + dx, HY - dy], [HX - dx, HY + dy], [HX + dx, HY + dy], [HX, HY - 2 * dy], [HX, HY + 2 * dy]];
  return out.map((tri, k) => {
    const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
    const home = k < 7 ? honey[k] : null;
    const ang = Math.atan2(cy - 540, cx - 960) + (r() - .5), dist = 700 + r() * 500;
    return { tri, cx, cy, home, job: JOBS[k] || null, far: [cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist], spin: (r() - .5) * 3, delay: r() * 0.25, hue: k % 5 };
  });
}
const CRACK = 3.75;
function sceneMonolith(t) {
  if (t > 7.6) return;
  const grow = eIO(prog(t, 0.2, CRACK)), shake = t > CRACK - 0.8 && t < CRACK ? (t - CRACK + 0.8) * 7 : 0;
  // the scale-up agent: a swelling slab crammed with every task at once
  if (t < CRACK) {
    const s = 0.72 + grow * 0.34, sx = Math.sin(t * 90) * shake, sy = Math.cos(t * 77) * shake;
    g.save(); g.translate(960 + sx, 540 + sy); g.scale(s, s); g.translate(-960, -540);
    const R = MONO_RECT;
    g.shadowColor = hexA(C.s3, 0.35); g.shadowBlur = 80;
    g.fillStyle = C.ink2; g.beginPath(); g.roundRect(R.x, R.y, R.w, R.h, 26); g.fill(); g.shadowBlur = 0;
    g.lineWidth = 2; g.strokeStyle = specGrad(R.x, R.y, R.x + R.w, R.y + R.h); g.stroke();
    text('AGENT', R.x + 34, R.y + 62, { size: 26, mono: true, weight: 600, ls: 6, fill: C.dim });
    // the tasks it has swallowed, scrolling and piling up
    g.save(); g.beginPath(); g.roundRect(R.x + 20, R.y + 88, R.w - 40, R.h - 110, 12); g.clip();
    const all = JOBS.concat(['Answer supplier queries', 'Update the ledger', 'Book accruals', 'Write the board pack', 'Everything else']);
    for (let i = 0; i < 26; i++) {
      const y = R.y + 120 + i * 40 - (t * 70) % 40 - Math.floor(t * 70 / 40) * 0 ;
      const k = (i + Math.floor(t * 70 / 40)) % all.length;
      text('· ' + all[k], R.x + 34, y, { size: 22, mono: true, weight: 400, fill: C.bone, alpha: 0.55 });
    }
    g.restore();
    // hairline cracks, just before it goes
    if (shake > 0) {
      g.strokeStyle = hexA(C.bone, Math.min(1, shake / 5)); g.lineWidth = 1.5;
      SHARDS.forEach(sh => { poly(sh.tri); g.stroke(); });
    }
    g.restore();
    headline(['Everyone is building', 'bigger agents.'], 150, 190, t, 0.5, CRACK, { size: 72 });
    kicker('THE SCALE-UP HABIT', 152, 110, t, 0.3, CRACK);
    return;
  }
  // the break: shards fly out, seven settle into a honeycomb and become facets
  const tt = t - CRACK;
  // flash
  const fl = 1 - prog(tt, 0, 0.35);
  if (fl > 0) { g.fillStyle = hexA(C.bone, 0.18 * fl); g.fillRect(0, 0, W, H); }
  SHARDS.forEach((sh, k) => {
    const p = eOut(prog(tt, sh.delay * 0.4, 0.9 + sh.delay));
    const s = 1.06;
    const c0x = 960 + (sh.cx - 960) * s, c0y = 540 + (sh.cy - 540) * s;
    if (!sh.home) {
      const x = lerp(c0x, sh.far[0], p), y = lerp(c0y, sh.far[1], p), a = 1 - prog(tt, 0.2, 1.1);
      if (a <= 0) return;
      g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(sh.spin * p);
      poly(sh.tri.map(q => [(q[0] - sh.cx) * s, (q[1] - sh.cy) * s])); g.fillStyle = C.ink2; g.fill();
      g.strokeStyle = specGrad(-60, -60, 60, 60); g.lineWidth = 1.5; g.stroke(); g.restore();
      return;
    }
    // triangle -> gem
    const m = eBack(prog(tt, 0.25 + k * 0.05, 1.25 + k * 0.05));
    const out = prog(t, 7.0, 7.5);
    const hx = sh.home[0], hy = sh.home[1];
    if (m < 0.35) {
      const x = lerp(c0x, hx, eOut(prog(tt, 0, 1.1))), y = lerp(c0y, hy, eOut(prog(tt, 0, 1.1)));
      g.save(); g.translate(x, y); g.rotate(sh.spin * 0.3 * (1 - m));
      poly(sh.tri.map(q => [(q[0] - sh.cx) * s, (q[1] - sh.cy) * s])); g.fillStyle = C.ink2; g.fill();
      g.strokeStyle = specGrad(-60, -60, 60, 60); g.lineWidth = 2; g.stroke(); g.restore();
    }
    const r = 118 * clamp((m - 0.2) / 0.8, 0, 1.2) * (1 - eIn(out) * 0.2);
    const hxx = lerp(hx, k === 2 ? 480 : hx, eIO(prog(t, 7.0, 7.5))), hyy = lerp(hy, k === 2 ? 520 : hy, eIO(prog(t, 7.0, 7.5)));
    gem(hxx, hyy, r, { hue: sh.hue, shine: t * 2 + k, glint: (t - 4.6 - k * 0.12) * 0.8, glow: k === 2 ? prog(t, 6.2, 7) : 0.25, alpha: k === 2 ? (t < 7.5 ? 1 : 0) : 1 - eIn(out) });
    if (sh.job && m > 0.6) {
      const a = prog(m, 0.6, 1) * (k === 2 ? (t < 7.5 ? 1 : 0) : 1 - eIn(out));
      const lines = wrapJob(sh.job);
      lines.forEach((ln, i) => text(ln, hxx, hyy - 6 + (i - (lines.length - 1) / 2) * 30, { size: 24, weight: 700, align: 'center', base: 'middle', alpha: a }));
    }
  });
  headline(['Work isn’t one job.', 'It’s facets.'], 150, 190, t, CRACK + 0.9, 7.35, { size: 72, accent: ['facets.'] });
  kicker('A FACET · BIGGER THAN A TASK, SMALLER THAN A ROLE', 152, 110, t, CRACK + 0.7, 7.35);
}
function wrapJob(s) { const w = s.split(' '); if (w.length < 2) return [s]; const h = Math.ceil(w.length / 2); return [w.slice(0, h).join(' '), w.slice(h).join(' ')]; }

// ---------- scene 3: define a facet once (7.5 – 11.25) ----------
const SPEC_LINES = [
  ['facet', 'check-contract-terms', 'k'],
  ['purpose', 'Confirm invoice terms match the contract', 'v'],
  ['context', 'contracts/, supplier-master', 'v'],
  ['inputs', '', 'k'],
  ['  invoice', 'trust: verified', 't'],
  ['  contract', 'trust: verified', 't'],
  ['outputs', '', 'k'],
  ['  terms-check', 'trust: draft', 'd'],
  ['model', 'small · fast', 'v'],
];
function sceneDefine(t) {
  if (t < 7.0 || t > 11.4) return;
  const out = eIn(prog(t, 10.9, 11.35));
  // the chosen facet sits left, the spec unfolds from it
  const gx = 480, gy = 520;
  if (t >= 7.5) gem(gx - out * 200, gy, 118 * (1 - out), { hue: 2, shine: t * 2, glint: (t - 8) * 0.7, glow: 1, alpha: 1 - out });
  if (out < 1 && t >= 7.5) { const a = 1 - out; ['Check', 'contract terms'].forEach((ln, i) => text(ln, gx - out * 200, gy - 6 + (i - 0.5) * 30, { size: 24, weight: 700, align: 'center', base: 'middle', alpha: a })); }
  // connector
  const cp = eOut(prog(t, 7.6, 8.1));
  g.save(); g.globalAlpha = 1 - out; g.strokeStyle = specGrad(610, 0, 820, 0); g.lineWidth = 2;
  g.beginPath(); g.moveTo(610, gy); g.lineTo(lerp(610, 820, cp), gy); g.stroke(); g.restore();
  // the card
  const cardIn = eOut(prog(t, 7.8, 8.5)), X = 820, Y = 250, CW = 900, CH = 560;
  if (cardIn > 0) {
    g.save(); g.globalAlpha = cardIn * (1 - out); g.translate((1 - cardIn) * 60 + out * 120, 0);
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 60; g.fillStyle = 'rgba(21,18,29,0.92)';
    g.beginPath(); g.roundRect(X, Y, CW, CH, 22); g.fill(); g.shadowBlur = 0;
    g.lineWidth = 1.5; g.strokeStyle = hexA(C.bone, 0.14); g.stroke();
    g.fillStyle = specGrad(X, 0, X + CW, 0); g.fillRect(X + 22, Y, CW - 44, 3);
    text('check-contract-terms.facet.yaml', X + 36, Y + 52, { size: 20, mono: true, weight: 500, fill: C.dim });
    // lines type in, one after another
    SPEC_LINES.forEach((ln, i) => {
      const t0 = 8.1 + i * 0.27, p = prog(t, t0, t0 + 0.25); if (p <= 0) return;
      const y = Y + 110 + i * 46, full = ln[0] + ':' + (ln[1] ? ' ' + ln[1] : '');
      const n = Math.floor(full.length * p), shown = full.slice(0, n);
      const key = shown.slice(0, Math.min(shown.length, ln[0].length + 1)), val = shown.slice(key.length);
      text(key, X + 36, y, { size: 27, mono: true, weight: 500, fill: C.s2 });
      const kw = measure(key, { size: 27, mono: true, weight: 500 });
      const vfill = ln[2] === 't' ? C.s1 : ln[2] === 'd' ? C.s5 : C.bone;
      text(val, X + 36 + kw, y, { size: 27, mono: true, weight: 400, fill: vfill });
      if (ln[2] === 't' || ln[2] === 'd') if (p >= 1) { // trust chips
        const cx = X + CW - 190, a = prog(t, t0 + 0.25, t0 + 0.5);
        g.save(); g.globalAlpha *= a; g.fillStyle = hexA(ln[2] === 't' ? C.s1 : C.s5, 0.14); g.beginPath(); g.roundRect(cx, y - 26, 150, 36, 18); g.fill();
        text(ln[2] === 't' ? '✓ VERIFIED' : '· DRAFT', cx + 75, y - 2, { size: 17, mono: true, weight: 600, ls: 2, align: 'center', fill: ln[2] === 't' ? C.s1 : C.s5 }); g.restore();
      }
      if (p < 1 && shown.trim()) { const cw = measure(shown, { size: 27, mono: true, weight: 400 }); g.fillStyle = C.bone; g.fillRect(X + 36 + cw + 2, y - 24, 3, 30); }
    });
    g.restore();
  }
  headline(['Define a responsibility', 'once.'], 150, 190, t, 7.55, 11.1, { size: 64, accent: ['once.'] });
  kicker('PURPOSE · CONTEXT · INPUTS & OUTPUTS WITH TRUST · MODEL', 152, 110, t, 7.4, 11.1);
}

// ---------- scene 4: processes are thin manifests; swap human ↔ agent in one line (11.25 – 15) ----------
const STAGES = ['Intake', 'Match PO', 'Check terms', 'Approve', 'Post'];
function stageX(i) { return 250 + i * 355; }
function sceneSwap(t) {
  if (t < 11.0 || t > 15.2) return;
  const a = eOut(prog(t, 11.1, 11.6)) * (1 - eIn(prog(t, 14.75, 15.15)));
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  const Y = 560;
  // rails
  g.strokeStyle = hexA(C.bone, 0.16); g.lineWidth = 2; g.setLineDash([6, 10]);
  g.beginPath(); g.moveTo(stageX(0), Y); g.lineTo(stageX(4), Y); g.stroke(); g.setLineDash([]);
  // kickoff messages travelling stage to stage: same envelope whoever sends it
  for (let k = 0; k < 6; k++) {
    const u = ((t - 11.5) * 0.55 + k / 6) % 1; if (t < 11.5) break;
    const x = lerp(stageX(0), stageX(4), u);
    g.fillStyle = specGrad(x - 20, Y - 10, x + 20, Y + 10); g.beginPath(); g.roundRect(x - 16, Y - 11, 32, 22, 4); g.fill();
    g.strokeStyle = C.ink; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 16, Y - 11); g.lineTo(x, Y + 2); g.lineTo(x + 16, Y - 11); g.stroke();
  }
  // stages
  const flip = eIO(prog(t, 13.35, 13.85));
  STAGES.forEach((s, i) => {
    const x = stageX(i), pin = eBack(prog(t, 11.2 + i * 0.08, 11.7 + i * 0.08));
    g.save(); g.translate(x, Y); g.scale(pin, pin);
    if (i === 2) {
      // the stage whose performer changes: a card that turns over
      const sx = Math.cos(flip * Math.PI);
      g.scale(Math.abs(sx) < 0.02 ? 0.02 : Math.abs(sx), 1);
      const human = flip < 0.5;
      g.fillStyle = human ? '#231f2c' : C.ink2; g.beginPath(); g.roundRect(-120, -95, 240, 190, 20); g.fill();
      g.lineWidth = 2; g.strokeStyle = human ? hexA(C.bone, 0.35) : specGrad(-120, -95, 120, 95); g.stroke();
      if (human) {
        g.fillStyle = hexA(C.bone, 0.85); g.beginPath(); g.arc(0, -28, 22, 0, 7); g.fill();
        g.beginPath(); g.ellipse(0, 22, 40, 26, 0, Math.PI, 0); g.fill();
        text('PERSON', 0, 72, { size: 16, mono: true, weight: 600, ls: 3, align: 'center', fill: C.dim });
      } else {
        g.restore(); g.save(); g.translate(x, Y); g.scale(pin * Math.max(0.02, Math.abs(sx)), pin);
        gem(0, -10, 54, { hue: 2, shine: t * 3, glint: (t - 13.8) * 0.9, glow: 1 });
        text('FACET', 0, 72, { size: 16, mono: true, weight: 600, ls: 3, align: 'center', fill: C.s1 });
      }
    } else {
      g.fillStyle = C.ink2; g.beginPath(); g.roundRect(-110, -70, 220, 140, 18); g.fill();
      g.lineWidth = 1.5; g.strokeStyle = hexA(C.bone, 0.18); g.stroke();
      text('STAGE ' + (i + 1), 0, 6, { size: 17, mono: true, weight: 600, ls: 4, align: 'center', base: 'middle', fill: C.dim });
    }
    g.restore();
    text(s, x, Y + (i === 2 ? 140 : 118), { size: 28, weight: 700, align: 'center', alpha: pin });
  });
  // the one line
  const LX = 560, LY = 870;
  g.fillStyle = 'rgba(21,18,29,0.9)'; g.beginPath(); g.roundRect(LX - 40, LY - 50, 880, 76, 14); g.fill();
  g.strokeStyle = hexA(C.bone, 0.12); g.lineWidth = 1.5; g.stroke();
  text('stage: check-terms', LX, LY - 60 - 8, { size: 18, mono: true, weight: 500, fill: C.dim });
  const before = 'performer: person/a.khan', after = 'performer: facet/check-contract-terms';
  const del = prog(t, 12.6, 13.05), typ = prog(t, 13.1, 13.6);
  let s;
  if (t < 12.6) s = before; else if (typ <= 0) s = before.slice(0, Math.max(11, Math.round(before.length - (before.length - 11) * del))); else s = after.slice(0, Math.round(11 + (after.length - 11) * typ));
  text(s.slice(0, 10), LX, LY, { size: 30, mono: true, weight: 500, fill: C.s2 });
  const kw = measure(s.slice(0, 10), { size: 30, mono: true, weight: 500 });
  text(s.slice(10), LX + kw, LY, { size: 30, mono: true, weight: 500, fill: t > 13.1 ? C.s1 : C.bone });
  if (Math.floor(t * 8) % 2 === 0 || (t > 12.55 && t < 13.65)) { const cw = measure(s, { size: 30, mono: true, weight: 500 }); g.fillStyle = C.bone; g.fillRect(LX + cw + 3, LY - 26, 3, 34); }
  if (t > 13.7) text('✓ same kickoff message, same stage', LX + 440 + 100, LY - 60 - 8, { size: 18, mono: true, weight: 500, fill: C.s1, alpha: prog(t, 13.7, 14) });
  g.restore();
  headline(['Swap a person for an agent.', 'One line.'], 150, 190, t, 11.3, 14.95, { size: 64, accent: ['One', 'line.'] });
  kicker('PROCESSES ARE THIN MANIFESTS OF STAGES', 152, 110, t, 11.2, 14.95);
}

// ---------- scene 5: the same facet recurs across processes (15 – 18.75) ----------
const PROCS = [['Accounts payable', 1], ['Procurement', 3], ['Contract renewals', 2]];
function sceneReuse(t) {
  if (t < 14.8 || t > 19.0) return;
  const a = eOut(prog(t, 15.0, 15.4)) * (1 - eIn(prog(t, 18.45, 18.85)));
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  const pulse = prog(t, 16.4, 17.4);
  PROCS.forEach(([name, at], r) => {
    const y = 470 + r * 175, x0 = 520, n = 5, step = 250;
    const rin = eOut(prog(t, 15.05 + r * 0.12, 15.6 + r * 0.12));
    text(name, 150, y + 10, { size: 30, weight: 700, alpha: rin });
    g.strokeStyle = hexA(C.bone, 0.14); g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + (n - 1) * step * rin, y); g.stroke();
    for (let i = 0; i < n; i++) {
      const x = x0 + i * step;
      if (i === at) {
        const lit = clamp(pulse * 3 - r * 0.25);
        gem(x, y, 58 + 8 * Math.sin(Math.min(1, lit) * Math.PI), { hue: 2, shine: t * 3, glint: (t - 16.5 - r * 0.1) * 1.1, glow: 0.3 + lit, lit: 1 + lit * 1.5, alpha: rin });
        if (lit > 0.4) text('✓ automated', x, y + 92, { size: 18, mono: true, weight: 600, ls: 2, align: 'center', fill: C.s1, alpha: prog(lit, 0.4, 1) });
      } else {
        g.save(); g.globalAlpha *= rin; g.fillStyle = C.ink2; g.beginPath(); g.roundRect(x - 44, y - 30, 88, 60, 12); g.fill(); g.strokeStyle = hexA(C.bone, 0.16); g.lineWidth = 1.5; g.stroke(); g.restore();
      }
    }
  });
  // the pulse: a ring of light from the defined facet up through all three
  if (pulse > 0 && pulse < 1) {
    const x = 520 + 250 * 2, ry = 645;
    g.strokeStyle = hexA(C.s1, 0.5 * (1 - pulse)); g.lineWidth = 3;
    g.beginPath(); g.ellipse(x, ry, 60 + pulse * 700, 40 + pulse * 380, 0, 0, 7); g.stroke();
  }
  g.restore();
  headline(['Automate a facet once.', 'Free it everywhere.'], 150, 190, t, 15.1, 18.7, { size: 64, accent: ['everywhere.'] });
  kicker('A PERSON’S FACETS RECUR ACROSS PROCESSES', 152, 110, t, 15.0, 18.7);
}

// ---------- scene 6: scale out, not up (18.75 – 21.25) ----------
let SWARM;
function makeSwarm() {
  const r = rng(9), out = [];
  const s = 46;
  for (let row = 0; row < 15; row++) for (let col = 0; col < 26; col++) {
    const x = 170 + col * s * 1.55 + (row % 2) * s * 0.78, y = 340 + row * s * 0.9;
    if (x > 1780 || y > 1000) continue;
    out.push({ x, y, d: r(), hue: Math.floor(r() * 5), ph: r() * 7 });
  }
  return out;
}
function sceneScale(t) {
  if (t < 18.5 || t > 21.6) return;
  const a = eOut(prog(t, 18.75, 19.1));
  // ...the giant fades away while the swarm switches on, tile by tile
  SWARM.forEach(p => {
    const on = eBack(prog(t, 18.85 + p.d * 1.0, 19.3 + p.d * 1.0));
    // at the end, every tile rushes to the centre to become the mark
    const gather = eIn(prog(t, 20.75 + p.d * 0.3, 21.3));
    const x = lerp(p.x, 960, gather), y = lerp(p.y, 520, gather);
    gem(x, y, 18 * on * (1 - gather * 0.7), { hue: p.hue, shine: t * 2 + p.ph, alpha: a * (1 - gather * 0.6), lit: 1 + 0.6 * Math.sin(t * 5 + p.ph), lw: 1.2 });
  });
  const hl = 1 - eIn(prog(t, 20.8, 21.2));
  g.save(); g.globalAlpha = hl;
  headline(['Scale out.', 'Not up.'], 150, 190, t, 18.85, 21.2, { size: 76, accent: ['out.'] });
  kicker('MANY SMALL, RIGHT-SIZED, GOVERNED AGENTS', 152, 110, t, 18.8, 21.2);
  g.restore();
}

// ---------- scene 7: the mark (21.25 – 25) ----------
function sceneMark(t) {
  if (t < 21.1) return;
  const p = eBack(prog(t, 21.2, 21.9)), bloom = 1 - prog(t, 21.2, 22.2);
  if (bloom > 0) { const gr = g.createRadialGradient(960, 470, 0, 960, 470, 700); gr.addColorStop(0, hexA(C.s3, 0.35 * bloom)); gr.addColorStop(1, hexA(C.s3, 0)); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
  // the mark: one large cut gem, facets catching the spectrum in turn
  gem(960, 430, 150 * p, { hue: Math.floor(t * 4) % 5, shine: t * 3, glint: (t - 21.9) * 0.55, glow: 1.2, lit: 1.4, lw: 3 });
  const wm = eOut(prog(t, 21.8, 22.5));
  text('Facet', 960, 700 + (1 - wm) * 30, { size: 150, weight: 800, ls: -5, align: 'center', alpha: wm });
  const tg = eOut(prog(t, 22.3, 23.0));
  text('Agents defined by responsibility.', 960, 785 + (1 - tg) * 16, { size: 40, weight: 500, align: 'center', alpha: tg, fill: C.bone });
  const sp = prog(t, 22.9, 23.5);
  text('AN OPEN SPECIFICATION', 960, 862, { size: 20, mono: true, weight: 600, ls: 8, align: 'center', fill: C.s1, alpha: sp });
  // a hairline spectrum under the lock-up
  const lw = 380 * eIO(prog(t, 22.6, 23.4));
  g.fillStyle = specGrad(960 - lw, 0, 960 + lw, 0); g.fillRect(960 - lw, 822, lw * 2, 2);
}

// ---------- compose ----------
function render(t) {
  g.save();
  background(t);
  // a slow push-in over the whole film
  const z = 1 + 0.03 * (t / DUR); g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2);
  sceneMonolith(t); sceneDefine(t); sceneSwap(t); sceneReuse(t); sceneScale(t); sceneMark(t);
  g.restore();
  finish(t);
}

// ---------- score: synthesised, scheduled on any AudioContext (live or offline) ----------
const BPM = 96, B = 60 / BPM;
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
// Bm9 · Gmaj9 · D6/9 · A(add9) — hopeful, a little cinematic
const CHORDS = [[47, 62, 66, 69, 73], [43, 62, 66, 69, 71], [50, 62, 66, 69, 76], [45, 61, 64, 69, 71]];
function score(ctx, out) {
  const master = ctx.createGain(); master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3.5; comp.attack.value = 0.01; comp.release.value = 0.25;
  master.connect(comp); comp.connect(out);
  // reverb from a generated impulse
  const verb = ctx.createConvolver(), len = Math.floor(ctx.sampleRate * 3.2), ir = ctx.createBuffer(2, len, ctx.sampleRate), r = rng(3);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  verb.buffer = ir; const vg = ctx.createGain(); vg.gain.value = 0.42; verb.connect(vg); vg.connect(master);
  const delay = ctx.createDelay(1); delay.delayTime.value = B * 0.75; const fb = ctx.createGain(); fb.gain.value = 0.38; const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3200;
  delay.connect(dlp); dlp.connect(fb); fb.connect(delay); const dg = ctx.createGain(); dg.gain.value = 0.35; dlp.connect(dg); dg.connect(master); dg.connect(verb);
  const bus = (dry, wet) => { const gn = ctx.createGain(); gn.gain.value = dry; gn.connect(master); if (wet) { const w = ctx.createGain(); w.gain.value = wet; gn.connect(w); w.connect(verb); } return gn; };
  const padBus = bus(0.5, 0.8), pluckBus = bus(0.55, 0.5), drumBus = bus(0.9, 0.12), bassBus = bus(0.75, 0), fxBus = bus(0.7, 0.9);
  pluckBus.connect(delay);
  const noise = (() => { const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0), q = rng(11); for (let i = 0; i < d.length; i++) d[i] = q() * 2 - 1; return b; })();
  const T = s => s; // times are in seconds from the start of the film

  function pad(t0, dur, notes, level, cutoff) {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(cutoff[0], t0); f.frequency.linearRampToValueAtTime(cutoff[1], t0 + dur); f.Q.value = 0.7;
    const gn = ctx.createGain(); gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(level, t0 + Math.min(1.2, dur * 0.4)); gn.gain.setValueAtTime(level, t0 + dur - 0.3); gn.gain.linearRampToValueAtTime(0, t0 + dur + 0.6);
    f.connect(gn); gn.connect(padBus);
    notes.slice(1).forEach(n => [-7, 7].forEach(det => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = NOTE(n); o.detune.value = det; const og = ctx.createGain(); og.gain.value = 0.07; o.connect(og); og.connect(f); o.start(t0); o.stop(t0 + dur + 0.7); }));
  }
  function pluck(t0, n, level) {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = NOTE(n);
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = NOTE(n + 12);
    const gn = ctx.createGain(); gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(level, t0 + 0.004); gn.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.45);
    const g2 = ctx.createGain(); g2.gain.value = 0.35; o.connect(gn); o2.connect(g2); g2.connect(gn); gn.connect(pluckBus); o.start(t0); o2.start(t0); o.stop(t0 + 0.5); o2.stop(t0 + 0.5);
  }
  function kick(t0, level = 1) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(150, t0); o.frequency.exponentialRampToValueAtTime(44, t0 + 0.14);
    const gn = ctx.createGain(); gn.gain.setValueAtTime(0.9 * level, t0); gn.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
    o.connect(gn); gn.connect(drumBus); o.start(t0); o.stop(t0 + 0.55);
  }
  function hat(t0, level = 0.18, len = 0.05) {
    const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8000;
    const gn = ctx.createGain(); gn.gain.setValueAtTime(level, t0); gn.gain.exponentialRampToValueAtTime(0.001, t0 + len);
    s.connect(f); f.connect(gn); gn.connect(drumBus); s.start(t0, Math.random() * 1.5); s.stop(t0 + len + 0.02);
  }
  function clap(t0, level = 0.35) {
    const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.8;
    const gn = ctx.createGain(); gn.gain.setValueAtTime(0, t0); [0, 0.012, 0.024].forEach(d => { gn.gain.setValueAtTime(level, t0 + d); gn.gain.exponentialRampToValueAtTime(0.05, t0 + d + 0.01); });
    gn.gain.setValueAtTime(level * 0.8, t0 + 0.036); gn.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
    s.connect(f); f.connect(gn); gn.connect(drumBus); const w = ctx.createGain(); w.gain.value = 0.5; gn.connect(w); w.connect(verb); s.start(t0, 0.3); s.stop(t0 + 0.3);
  }
  function bass(t0, dur, n, level) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = NOTE(n - 12);
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = NOTE(n);
    const gn = ctx.createGain(); gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(level, t0 + 0.02); gn.gain.setValueAtTime(level, t0 + dur - 0.08); gn.gain.linearRampToValueAtTime(0, t0 + dur);
    const g2 = ctx.createGain(); g2.gain.value = 0.25; o.connect(gn); o2.connect(g2); g2.connect(gn); gn.connect(bassBus); o.start(t0); o2.start(t0); o.stop(t0 + dur + 0.05); o2.stop(t0 + dur + 0.05);
  }
  function boom(t0, level = 1) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(90, t0); o.frequency.exponentialRampToValueAtTime(30, t0 + 1.4);
    const gn = ctx.createGain(); gn.gain.setValueAtTime(level, t0); gn.gain.exponentialRampToValueAtTime(0.001, t0 + 2.2); o.connect(gn); gn.connect(fxBus); o.start(t0); o.stop(t0 + 2.3);
    const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(5000, t0); f.frequency.exponentialRampToValueAtTime(200, t0 + 1.2);
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.35 * level, t0); ng.gain.exponentialRampToValueAtTime(0.001, t0 + 1.4); s.connect(f); f.connect(ng); ng.connect(fxBus); s.start(t0); s.stop(t0 + 1.5);
  }
  function glass(t0) { // a shatter of tiny bells
    const q = rng(21);
    for (let i = 0; i < 22; i++) {
      const tt = t0 + q() * 0.9 * q(), n = 84 + Math.floor(q() * 20), o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = NOTE(n) * (1 + q() * 0.01);
      const gn = ctx.createGain(); gn.gain.setValueAtTime(0, tt); gn.gain.linearRampToValueAtTime(0.05 + q() * 0.05, tt + 0.003); gn.gain.exponentialRampToValueAtTime(0.0005, tt + 0.5 + q() * 0.8);
      o.connect(gn); gn.connect(fxBus); o.start(tt); o.stop(tt + 1.5);
    }
  }
  function riser(t0, dur, level = 0.3) {
    const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2.5;
    f.frequency.setValueAtTime(300, t0); f.frequency.exponentialRampToValueAtTime(7000, t0 + dur);
    const gn = ctx.createGain(); gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(level, t0 + dur); gn.gain.linearRampToValueAtTime(0, t0 + dur + 0.05);
    s.connect(f); f.connect(gn); gn.connect(fxBus); s.start(t0); s.stop(t0 + dur + 0.1);
  }
  function swell(t0, dur) { // a reversed-cymbal style swell into a hit
    const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
    const gn = ctx.createGain(); gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(0.25, t0 + dur); gn.gain.linearRampToValueAtTime(0, t0 + dur + 0.02);
    s.connect(f); f.connect(gn); gn.connect(fxBus); s.start(t0); s.stop(t0 + dur + 0.05);
  }

  // --- arrangement (bars of 2.5 s) ---
  const bars = 10;
  for (let b = 0; b < bars; b++) {
    const t0 = T(b * BAR), ch = CHORDS[b % 4];
    if (b < 8) pad(t0, BAR, ch, b < 2 ? 1.7 : b < 3 ? 1.3 : 0.62, b < 2 ? [700, 1400] : b < 6 ? [900, 1800] : [1400, 3200]);
    if (b === 8) pad(t0, 1.25, ch, 0.7, [3200, 5200]);
    // an opening motif before the break: slow chord tones on the beat
    if (b < 2) for (let i = 0; i < 4; i++) { const tt = t0 + i * B + 0.3; if (tt < CRACK - 0.2) pluck(tt, [ch[4], ch[3], ch[2], ch[3]][i] + 12, 0.24); }
    // arpeggio from bar 2 (after the break)
    if (b >= 1 && b < 8) {
      const seq = [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[4] + 12, ch[3] + 12, ch[2] + 12, ch[4] + 12, ch[3] + 12];
      for (let i = 0; i < 8; i++) { const tt = t0 + i * B / 2; if (b === 1 && tt < CRACK) continue; pluck(tt, seq[i], b < 3 ? 0.2 : 0.18); }
    }
    // a long soft bass under the opening and the break
    if (b < 3) bass(t0 + (b === 1 ? 0 : 0), BAR - 0.05, ch[0], b === 0 ? 0.18 : 0.26);
    // bass from bar 3
    if (b >= 3 && b < 8) for (let i = 0; i < 4; i++) bass(t0 + i * B, B * 0.92, ch[0], 0.32);
    // kick from bar 3, hats from bar 4, claps from bar 6
    if (b >= 3 && b < 8) for (let i = 0; i < 4; i++) {
      kick(t0 + i * B, b === 7 && i === 3 ? 0 : 1);
      if (b >= 4) { hat(t0 + i * B + B / 2); if (b >= 6) { hat(t0 + i * B + B / 4, 0.08); hat(t0 + i * B + 3 * B / 4, 0.08); } }
      if (b >= 6 && (i === 1 || i === 3) && !(b === 7 && i === 3)) clap(t0 + i * B);
    }
  }
  // the break at 3.75 s: swell, boom, glass
  swell(CRACK - 1.2, 1.2); boom(CRACK, 1); glass(CRACK);
  // the swap at 13.6 s: a bright ping
  [81, 88].forEach((n, i) => pluck(13.6 + i * 0.12, n, 0.2));
  // the reuse pulse at 16.4 s: three rising chimes
  [78, 81, 85].forEach((n, i) => pluck(16.45 + i * 0.16, n, 0.22));
  // into the mark: riser, then the big resolving chord
  riser(18.75, 2.45, 0.34);
  // a snare build into the mark: 8ths, then 16ths, rising
  for (let i = 0; i < 16; i++) { const tt = 20.0 + i * B / 4 * (i < 8 ? 1 : 0.5) + (i >= 8 ? 8 * B / 4 * 0.5 : 0); if (tt < 21.2) clap(tt, 0.1 + i * 0.018); }
  for (let i = 0; i < 4; i++) kick(20.0 + i * B / 2, 0.7);
  swell(20.25, 1.0);
  boom(21.25, 1.1);
  const fin = [38, 57, 62, 66, 69, 73, 76];
  pad(21.25, 3.2, [0].concat(fin), 0.85, [2400, 900]);
  bass(21.25, 3.0, 50, 0.4);
  [74, 78, 81, 86].forEach((n, i) => pluck(21.3 + i * 0.09, n, 0.2));
  // final shimmer
  [86, 90, 93].forEach((n, i) => pluck(23.0 + i * 0.35, n, 0.1));
  // fade the master at the very end
  master.gain.setValueAtTime(0.9, 23.6); master.gain.linearRampToValueAtTime(0, DUR);
}

// ---------- WAV export for the video render ----------
async function renderAudio(sampleRate = 48000) {
  const ctx = new OfflineAudioContext(2, Math.ceil(DUR * sampleRate), sampleRate);
  score(ctx, ctx.destination);
  const buf = await ctx.startRendering();
  const n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1);
  const out = new DataView(new ArrayBuffer(44 + n * 4));
  const w = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
  out.setUint32(24, sampleRate, true); out.setUint32(28, sampleRate * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) { out.setInt16(44 + i * 4, clamp(L[i], -1, 1) * 32767, true); out.setInt16(46 + i * 4, clamp(R[i], -1, 1) * 32767, true); }
  let bin = ''; const u8 = new Uint8Array(out.buffer); for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(bin);
}

// ---------- the player ----------
async function boot() {
  cv = document.getElementById('film'); g = cv.getContext('2d');
  makeGrain(); SHARDS = makeShards(); SWARM = makeSwarm();
  try { await Promise.all(['800 64px "Bricolage Grotesque"', '700 64px "Bricolage Grotesque"', '500 64px "Bricolage Grotesque"', '400 20px "IBM Plex Mono"', '500 20px "IBM Plex Mono"', '600 20px "IBM Plex Mono"'].map(f => document.fonts.load(f))); } catch (e) { }
  window.FILM = { render, DUR, renderAudio, ready: true };
  if (window.FILM_EXPORT) { render(0); return; }
  const btn = document.getElementById('play'), bar = document.getElementById('bar'), time = document.getElementById('time');
  let actx = null, start = performance.now() / 1000, playingSound = false;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function now() { return playingSound ? actx.currentTime - start : ((performance.now() / 1000 - start) % DUR); }
  function frame() {
    let t = now();
    if (playingSound && t >= DUR) { playingSound = false; btn.classList.remove('on'); btn.querySelector('span').textContent = 'Play with sound'; start = performance.now() / 1000; t = 0; }
    t = Math.max(0, t);
    if (reduce && !playingSound) t = 23.5;
    render(t);
    bar.style.transform = 'scaleX(' + (t / DUR) + ')';
    time.textContent = '0:' + String(Math.floor(t)).padStart(2, '0') + ' / 0:' + DUR;
    requestAnimationFrame(frame);
  }
  let scoreBuf = null;
  btn.addEventListener('click', async () => {
    if (playingSound) { await actx.close(); actx = null; playingSound = false; start = performance.now() / 1000; btn.classList.remove('on'); btn.querySelector('span').textContent = 'Play with sound'; return; }
    btn.querySelector('span').textContent = 'Tuning up…';
    actx = new AudioContext(); await actx.resume();
    if (!scoreBuf) { const off = new OfflineAudioContext(2, Math.ceil(DUR * actx.sampleRate), actx.sampleRate); score(off, off.destination); scoreBuf = await off.startRendering(); }
    const src = actx.createBufferSource(); src.buffer = scoreBuf; src.connect(actx.destination);
    start = actx.currentTime + 0.05; src.start(start);
    playingSound = true; btn.classList.add('on'); btn.querySelector('span').textContent = 'Stop';
  });
  requestAnimationFrame(frame);
}
window.addEventListener('DOMContentLoaded', boot);
