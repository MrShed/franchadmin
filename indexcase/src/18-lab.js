/* INDEX CASE UI — 18-lab.js: test capacity & queue, the genome tree viewer,
 * wastewater by district, the novel-agent screen and the treatment trial. */
var UITree = (function () {
  var T = {};
  /** build a laminar mutation tree from sequenced samples. returns {root, leaves, maxX} */
  T.layout = function (nodes) {
    var samples = nodes.filter(function (n) { return n.pid; });
    if (!samples.length) return null;
    var byParent = nodes.some(function (n) { return n.parent; });
    var root;
    if (byParent) {
      // engine supplied the topology
      var byId = {}; nodes.forEach(function (n) { byId[n.id] = n; });
      var map = {}; nodes.forEach(function (n) {
        var par = n.parent ? byId[n.parent] : null, len = n.muts.length;
        if (par) { var ps = {}; par.muts.forEach(function (m) { ps[m] = 1; }); var cum = par.muts.length && par.muts.every(function (m) { return n.muts.indexOf(m) >= 0; }); if (cum) len = n.muts.length - par.muts.length; }
        map[n.id] = { id: n.id, pid: n.pid, len: Math.max(0, len), kids: [], variant: n.variant || (n.lineage && n.lineage !== 'A' ? n.lineage : null), day: n.day };
      });
      root = { id: 'root', kids: [], len: 0 };
      nodes.forEach(function (n) { var m = map[n.id]; (n.parent && map[n.parent] ? map[n.parent].kids : root.kids).push(m); });
    } else {
      var carriers = {};
      samples.forEach(function (s, i) { s.muts.forEach(function (m) { (carriers[m] = carriers[m] || []).push(i); }); });
      var groups = {};
      Object.keys(carriers).forEach(function (m) { var k = carriers[m].join(','); (groups[k] = groups[k] || { set: carriers[m], n: 0 }).n++; });
      var br = Object.keys(groups).map(function (k) { return { key: k, set: groups[k].set, len: groups[k].n, kids: [], samples: [] }; }).sort(function (a, b) { return b.set.length - a.set.length || a.key.localeCompare(b.key); });
      root = { id: 'root', kids: [], len: 0, samples: [] };
      function sup(a, b) { if (a.length < b.length) return false; var s = {}; a.forEach(function (x) { s[x] = 1; }); return b.every(function (x) { return s[x]; }); }
      br.forEach(function (b, i) { var p = root; for (var j = i - 1; j >= 0; j--) if (sup(br[j].set, b.set) && (p === root || br[j].set.length <= p.set.length)) { p = br[j]; break; } b.parent = p; p.kids.push(b); });
      samples.forEach(function (s, i) { var best = root; br.forEach(function (b) { if (b.set.indexOf(i) >= 0 && (best === root || b.set.length < best.set.length)) best = b; }); best.samples.push({ id: s.id, pid: s.pid, len: 0, kids: [], variant: s.variant, day: s.day }); });
      (function fold(n) { n.kids.forEach(fold); n.kids = n.kids.concat(n.samples || []); })(root);
    }
    // positions
    var leaves = [], y = 0, maxX = 0;
    (function place(n, x) {
      n.x = x + (n.len || 0); maxX = Math.max(maxX, n.x);
      n.kids.sort(function (a, b) { return size(b) - size(a); });
      if (!n.kids.length) { n.y = y++; leaves.push(n); return; }
      n.kids.forEach(function (k) { place(k, n.x); });
      n.y = (n.kids[0].y + n.kids[n.kids.length - 1].y) / 2;
    })(root, 0);
    function size(n) { return n.kids.length ? n.kids.reduce(function (s, k) { return s + size(k); }, 0) : 1; }
    return { root: root, leaves: leaves, maxX: Math.max(1, maxX) };
  };
  T.COL = ['#ff9d6e', '#8ce8cf', '#8fcbff', '#f2c25a', '#c5a3ff', '#ff8fa3', '#6fd6ff', '#b8e986', '#ffd9a0', '#5fe0b0', '#e6a8ff', '#a9c1ff', '#ffb35c', '#9ee7f5'];
  /** draw into ctx. o: {view:{x,y,k}, w, h, labels, sel, grow (0..1 reveal from the root)} */
  T.draw = function (ctx, w, h, L, o) {
    var v = o.view || { x: 0, y: 0, k: 1 }, padL = 20, padR = o.labels ? Math.min(170, w * .42) : 18, padT = o.labels ? 22 : 14;
    var rowH = Math.max(o.labels ? 22 : 6, (h - padT * 2) / Math.max(1, L.leaves.length));
    var sx = (w - padL - padR) / L.maxX, grow = o.grow === undefined ? 1 : o.grow;
    function X(n) { return v.x + (padL + n.x * sx) * v.k; }
    function Y(n) { return v.y + (padT + n.y * rowH + rowH / 2) * v.k; }
    function X0(xx) { return v.x + (padL + xx * sx) * v.k; }
    var fb = getComputedStyle(document.body).getPropertyValue('--f-body'), fm = getComputedStyle(document.body).getPropertyValue('--f-mono');
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    var cases = {}; UIA.cases().forEach(function (c) { cases[c.pid] = c; });
    var dcol = {}; UIA.city().districts.forEach(function (d, i) { dcol[d.id] = T.COL[i % T.COL.length]; });
    var reveal = grow >= 1 ? w + 400 : X0(0) + (X0(L.maxX) - X0(0) + 60) * grow;
    ctx.save(); ctx.beginPath(); ctx.rect(-10, -10, reveal + 10, h + 20); ctx.clip();
    // branches: a soft glow pass then a fine core, elbows rounded
    var segs = [];
    (function edges(n, variant) {
      var vv = variant || n.variant;
      n.kids.forEach(function (k) { segs.push([X(n), Y(n), X(k), Y(k), vv || k.variant]); edges(k, vv || k.variant); });
    })(L.root, false);
    var rr = Math.max(2, Math.min(6, rowH * v.k * .3));
    function path(sg) { var x0 = sg[0], y0 = sg[1], x1 = sg[2], y1 = sg[3], r = Math.min(rr, Math.abs(y1 - y0), Math.abs(x1 - x0)); ctx.moveTo(x0, y0); if (r > .5 && y1 !== y0) { ctx.lineTo(x0, y1 - Math.sign(y1 - y0) * r); ctx.quadraticCurveTo(x0, y1, x0 + r, y1); } else ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); }
    [[false, 'rgba(120,220,200,'], [true, 'rgba(255,122,69,']].forEach(function (pass) {
      var list = segs.filter(function (sg) { return !!sg[4] === pass[0]; }); if (!list.length) return;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = pass[1] + '.1)'; ctx.lineWidth = Math.max(3, 4.5 * Math.sqrt(v.k)); ctx.beginPath(); list.forEach(path); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = pass[1] + '.8)'; ctx.lineWidth = Math.max(1, 1.25 * Math.sqrt(v.k)); ctx.beginPath(); list.forEach(path); ctx.stroke();
    });
    // branch points
    (function nodes(n) { if (n.kids.length > 1 && n.id !== 'root') { ctx.fillStyle = n.variant ? '#ffb48d' : 'rgba(220,245,238,.85)'; ctx.beginPath(); ctx.arc(X(n), Y(n), 2.2, 0, Math.PI * 2); ctx.fill(); } n.kids.forEach(nodes); })(L.root);
    // root: the index sequence
    var rx = X(L.root), ry = Y(L.root), rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, 14); rg.addColorStop(0, 'rgba(255,255,255,.5)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(rx - 14, ry - 14, 28, 28); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(rx, ry, 3, 0, Math.PI * 2); ctx.fill();
    // tips: glowing, coloured by district
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    var tipR = o.labels ? 4 : UIclamp(rowH * .42, 2.2, 4);
    L.leaves.forEach(function (n) {
      var c = cases[n.pid], x = X(n), y = Y(n);
      n.sx = x; n.sy = y;
      if (y < -20 || y > h + 20 || x > reveal) return;
      var col = c ? dcol[c.district] || '#8ce8cf' : '#8ce8cf';
      var g = ctx.createRadialGradient(x, y, 0, x, y, tipR * 3.2); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = .45; ctx.fillStyle = g; ctx.fillRect(x - tipR * 3.2, y - tipR * 3.2, tipR * 6.4, tipR * 6.4); ctx.globalAlpha = 1;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, o.sel === n.pid ? tipR + 1.8 : tipR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(x - tipR * .3, y - tipR * .3, tipR * .35, 0, Math.PI * 2); ctx.fill();
      if (c && c.status === 'died') { ctx.strokeStyle = 'rgba(217,211,199,.9)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, tipR + 3, 0, Math.PI * 2); ctx.stroke(); }
      if (o.sel === n.pid) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, tipR + 6, 0, Math.PI * 2); ctx.stroke(); }
      if (o.labels && rowH * v.k >= 13) {
        var d = c ? UIA.district(c.district) : null, two = rowH * v.k > 30;
        ctx.font = '600 13px ' + fb; ctx.fillStyle = '#eef4f9';
        ctx.fillText(c ? c.name : (n.pid || ''), x + 11, y - (two ? 7 : 0));
        if (two) { ctx.font = '500 10px ' + fm; ctx.fillStyle = col; ctx.globalAlpha = .9; ctx.fillText((d ? d.name.toUpperCase() : '') + (c && c.onset !== null ? '  ·  ' + UIA.dateShort(c.onset) : ''), x + 11, y + 8); ctx.globalAlpha = 1; }
      }
    });
    ctx.restore();
    // scale bar
    if (o.labels) {
      var one = sx * v.k, units = one < 12 ? 5 : 1, bx = 16, by = h - 16;
      ctx.fillStyle = 'rgba(5,9,14,.85)'; ctx.fillRect(bx - 8, by - 12, one * units + 96, 24);
      ctx.strokeStyle = 'rgba(233,239,244,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bx, by - 3); ctx.lineTo(bx, by); ctx.lineTo(bx + one * units, by); ctx.lineTo(bx + one * units, by - 3); ctx.stroke();
      ctx.font = '500 10px ' + fm; ctx.fillStyle = 'rgba(164,179,192,.95)'; ctx.textBaseline = 'middle'; ctx.fillText(units + ' mutation' + (units > 1 ? 's' : ''), bx + 8 + one * units, by - 1);
    }
  };
  /** run a growth animation: draw(grow) is called each frame until 1 */
  T.grow = function (draw, ms) {
    if (!UImotion()) { draw(1); return; }
    var t0 = performance.now(); ms = ms || 1000;
    (function step() { var f = Math.min(1, (performance.now() - t0) / ms); draw(1 - Math.pow(1 - f, 3)); if (f < 1) requestAnimationFrame(step); })();
  };
  return T;
})();

var UILab = UI.views.lab = {
  build: function (root) {
    var self = this;
    root.innerHTML = '<div class="scroll"><div class="pad"><div class="vhead"><div style="flex:1"><div class="eyebrow">Public Health Laboratory</div><h2>Lab</h2></div></div><div id="lb-body" class="lab-grid"></div></div></div>';
    UI$('#lb-body').addEventListener('click', function (e) {
      var t = e.target.closest('[data-tree-open]'); if (t) { self.openTree(); return; }
      var r = e.target.closest('[data-pid]'); if (r) { UICases.personSheet(r.dataset.pid); return; }
      var d = e.target.closest('[data-ww]'); if (d) { UIMap.districtSheet(d.dataset.ww); return; }
      var a = e.target.closest('[data-run]'); if (a) { self.runAction(a.dataset.run); return; }
      var m = e.target.closest('[data-msg]'); if (m) { UIBrief.openMsg(m.dataset.msg); return; }
      var wo = e.target.closest('[data-wwstart]'); if (wo) { var wa = UIA.action('wastewater'); if (wa) UIActions.confirm(wa, null); return; }
    });
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (UIS && UIS.tab === 'lab') self.render(); }, 150); });
  },
  show: function () { this.render(); },
  refresh: function () { this.render(); },
  runAction: function (id) {
    var a = UIA.action(id); if (!a) return;
    if (a.target === 'none' || !a.target) { UIActions.confirm(a, null); return; }
    UIActions.start(a);
  },
  render: function () {
    var r = UIA.res(), cases = UIA.cases(), act = UIA.actNo();
    var pend = cases.filter(function (c) { return UIA.testState(c) === 'pending'; });
    var seqq = cases.filter(function (c) { return c.seq === 'pending'; });
    var html = '';
    // novel agent screen (act 1)
    var dec = UIA.actions().filter(function (a) { return /declare|novel|screen|reference/i.test(a.id); })[0];
    if (dec && act === 1) {
      var negKnown = cases.filter(function (c) { return c.tests.some(function (t) { return /known|neg/i.test(t.result || ''); }); }).length;
      html += '<div class="card lab-hero"><div class="card-h"><div class="t"><div class="eyebrow em">Act one · the question</div><h3>Is this something new?</h3></div></div><div class="card-b"><p class="dim" style="margin:0 0 10px">Samples that test negative for every known pathogen can go to the reference laboratory for a novel-agent screen. A confirmed new agent opens act two.</p>' +
        '<div class="grid2" style="margin-bottom:12px"><div class="stat"><b>' + negKnown + '</b><span>samples negative for known pathogens</span></div><div class="stat"><b>' + pend.length + '</b><span>results awaited</span></div></div>' +
        '<button class="btn pri block" data-run="' + UIesc(dec.id) + '"' + (dec.available ? '' : ' disabled') + '>' + UIICON.flask + UIesc(dec.label) + '</button>' + (dec.available ? '' : '<p class="note" style="margin-top:8px">' + UIesc(dec.why) + '</p>') + '<div style="margin-top:8px">' + UIcosts(dec) + '</div></div></div>';
    }
    // capacity
    function ring(frac, col) { var C = 2 * Math.PI * 26, off = (C * (1 - UIclamp(frac, 0, 1))).toFixed(1); return '<svg viewBox="0 0 64 64" class="ring" style="overflow:visible"><circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="4"/><circle cx="32" cy="32" r="26" fill="none" stroke="' + col + '" stroke-opacity=".22" stroke-width="10" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off + '" transform="rotate(-90 32 32)"/><circle cx="32" cy="32" r="26" fill="none" stroke="' + col + '" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off + '" transform="rotate(-90 32 32)"/>' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (i) { var a = i / 12 * Math.PI * 2; return '<line x1="' + (32 + Math.sin(a) * 18).toFixed(1) + '" y1="' + (32 - Math.cos(a) * 18).toFixed(1) + '" x2="' + (32 + Math.sin(a) * 20.5).toFixed(1) + '" y2="' + (32 - Math.cos(a) * 20.5).toFixed(1) + '" stroke="rgba(255,255,255,.18)" stroke-width="1"/>'; }).join('') + '</svg>'; }
    html += '<div class="card"><div class="card-h"><div class="t"><div class="eyebrow">Today</div><h3>Capacity</h3></div></div><div class="card-b"><div class="cap">' +
      '<div class="cap-i">' + ring(r.tests.max ? r.tests.left / r.tests.max : 0, '#3fd0aa') + '<div><b>' + r.tests.left + '<small> / ' + r.tests.max + '</small></b><span>PCR tests left</span></div></div>' +
      '<div class="cap-i">' + ring(r.seq.max ? r.seq.left / r.seq.max : 0, '#a592ff') + '<div><b>' + r.seq.left + '<small> / ' + r.seq.max + '</small></b><span>sequencing slots</span></div></div></div>' +
      '<div class="eyebrow" style="margin:14px 0 8px">Awaiting results · ' + pend.length + '</div>' + (pend.length ? '<div class="q-list">' + pend.slice(0, 12).map(function (c) { var t = c.tests[c.tests.length - 1]; return '<button class="q-it" data-pid="' + UIesc(c.pid) + '"><i class="spin"></i><b>' + UIesc(c.name) + '</b><span>' + (t && t.due !== undefined ? 'due ' + UIesc(UIA.dateShort(t.due)) : 'sampled ' + UIesc(UIA.dateShort(t ? t.day : UIA.day()))) + '</span></button>'; }).join('') + (pend.length > 12 ? '<div class="note">and ' + (pend.length - 12) + ' more</div>' : '') + '</div>' : '<p class="note" style="margin:0">Nothing in the queue. Test people from the Cases tab or a person\'s card.</p>') +
      (seqq.length ? '<div class="eyebrow" style="margin:14px 0 8px">On the sequencer · ' + seqq.length + '</div><div class="q-list">' + seqq.map(function (c) { return '<button class="q-it" data-pid="' + UIesc(c.pid) + '"><i class="spin v"></i><b>' + UIesc(c.name) + '</b><span>genome in a few days</span></button>'; }).join('') + '</div>' : '') +
      '</div></div>';
    // tree
    var tree = UIA.tree(), L = UITree.layout(tree.nodes);
    html += '<div class="card"><div class="card-h"><div class="t"><div class="eyebrow">Sequenced samples · ' + tree.nodes.filter(function (n) { return n.pid; }).length + '</div><h3>Genome tree</h3></div>' + (L ? '<button class="btn sm" data-tree-open>Open</button>' : '') + '</div><div class="card-b">' +
      (L ? '<button class="tree-prev" data-tree-open aria-label="Open the genome tree"><canvas id="tree-prev"></canvas></button><p class="note">Each branch point is a mutation. Samples on the same twig are closely linked; separate branches mean separate introductions.</p>' : '<div class="empty" style="padding:18px 8px"><b>No genomes yet</b>Send samples from confirmed cases for sequencing. The tree grows as genomes come back, usually in about three days.</div>') + '</div></div>';
    // wastewater
    var ww = UIA.ww(), ds = UIA.city().districts, keys = Object.keys(ww.byDistrict).filter(function (k) { return ww.byDistrict[k].some(function (v) { return v !== null; }); });
    if (!keys.length) {
      var wa = UIA.action('wastewater');
      html += '<div class="card"><div class="card-h"><div class="t"><div class="eyebrow">Sewage sampling</div><h3>Wastewater</h3></div></div><div class="card-b"><p class="dim" style="margin:0 0 12px">Not sampling yet. Virus in sewage rises days before people come forward, district by district — an early warning you do not have to test anyone for.</p>' + (wa ? '<button class="btn block" data-wwstart' + (wa.available ? '' : ' disabled') + '>' + UIICON.ww + 'Start wastewater sampling</button><div style="margin-top:8px">' + UIcosts(wa, { lag: true }) + '</div>' : '') + '</div></div>';
    }
    if (keys.length) {
      var gmx = 1; keys.forEach(function (k) { ww.byDistrict[k].slice(-21).forEach(function (v) { gmx = Math.max(gmx, v || 0); }); });
      var rows = ds.filter(function (d) { return ww.byDistrict[d.id]; }).map(function (d) {
        var a = ww.byDistrict[d.id].slice(-21).map(function (v) { return v || 0; }), last = a[a.length - 1], prev = a.length > 7 ? a[a.length - 8] : a[0];
        var ch = prev > 0 ? (last - prev) / prev : 0;
        return { d: d, a: a, last: last, ch: ch };
      }).sort(function (a, b) { return b.last - a.last; });
      html += '<div class="card"><div class="card-h"><div class="t"><div class="eyebrow">Last 3 weeks · same scale</div><h3>Wastewater by district</h3></div></div><div class="card-b"><div class="ww-grid">' + rows.map(function (x) {
        return '<button class="ww-c" data-ww="' + UIesc(x.d.id) + '"><span class="ww-n">' + UIesc(x.d.name) + '</span>' + UIChart.spark(x.a, 140, 34, '#a592ff', { max: gmx, id: x.d.id }) + '<span class="ww-v"><b>' + UIfmt.n(x.last) + '</b><em class="' + (x.ch > .25 ? 'up' : x.ch < -.2 ? 'dn' : '') + '">' + (x.ch > .25 ? '▲' : x.ch < -.2 ? '▼' : '•') + ' ' + (isFinite(x.ch) ? Math.round(x.ch * 100) + '%' : '') + '</em></span></button>';
      }).join('') + '</div><p class="note">The virus is shed into sewage before people feel ill, so a district that rises here usually shows cases a few days later.</p></div></div>';
    }
    // studies: trial, serosurvey, animal sampling and friends
    var studies = UIA.actions().filter(function (a) { return a.area === 'lab' && !a.order && a.target === 'none' && !/declare|novel/.test(a.id); });
    if (studies.length) {
      var res = UIA.inbox().filter(function (m) { return /trial|serosurvey|antibod|animal|swab/i.test(m.title); }).slice(-3).reverse();
      html += '<div class="card"><div class="card-h"><div class="t"><div class="eyebrow">Randomised trials · surveys · sampling</div><h3>Studies</h3></div></div><div class="card-b">' +
        (res.length ? '<div class="list" style="margin-bottom:12px">' + res.map(function (m) { return UIli({ attrs: 'data-msg="' + UIesc(m.id) + '"', ic: UIICON.report, label: UIesc(m.title), small: UIesc(UIA.dateShort(m.day)) }); }).join('') + '</div>' : '') +
        '<div class="list">' + studies.map(function (a) { return UIli({ attrs: 'data-run="' + UIesc(a.id) + '"', ic: /trial/.test(a.id) ? UIICON.heart : /sero/.test(a.id) ? UIICON.people : UIICON.flask, label: UIesc(a.label), small: UIesc(a.available ? a.desc : a.why), right: UIcosts(a), dis: !a.available }); }).join('') + '</div></div></div>';
    }
    UI$('#lb-body').innerHTML = html;
    if (L) {
      var cv = UI$('#tree-prev'), host = cv.parentNode, w = host.clientWidth || 320, h = Math.min(220, Math.max(120, L.leaves.length * 9)), dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px';
      var ctx = cv.getContext('2d'), n0 = UILab._treeN || 0; UILab._treeN = L.leaves.length;
      var pd = function (g) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); var bg = ctx.createRadialGradient(w * .1, h * .5, 0, w * .1, h * .5, w * .9); bg.addColorStop(0, '#0d1a22'); bg.addColorStop(1, '#05090e'); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); UITree.draw(ctx, w, h, L, { labels: false, grow: g }); };
      if (L.leaves.length !== n0) UITree.grow(pd, 1100); else pd(1);
    }
  },
  /** full-screen tree viewer */
  openTree: function (focusPid) {
    var L = UITree.layout(UIA.tree().nodes);
    if (!L) { UItoast('No genomes sequenced yet'); return; }
    var el = UIel('<div class="tv" role="dialog" aria-label="Genome tree"><div class="tv-bar"><button class="ibtn" data-x aria-label="Close">' + UIICON.back + '</button><div class="t"><div class="eyebrow">' + UIfmt.plural(L.leaves.length, 'genome') + '</div><b>Genome tree</b></div><button class="ibtn" data-fit aria-label="Fit">' + UIICON.fit + '</button></div><div class="tv-cv" id="tv-cv"></div><div class="tv-foot">Pinch or scroll to zoom · drag to pan · tap a sample to open the person</div></div>');
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('on'); });
    var view = { x: 0, y: 0, k: 1 }, sel = focusPid || null;
    var grow = 0;
    var cv = UIcanvas(UI$('#tv-cv', el), function (ctx, w, h) { var bg = ctx.createRadialGradient(w * .15, h * .55, 0, w * .15, h * .55, Math.max(w, h)); bg.addColorStop(0, '#0c1820'); bg.addColorStop(1, '#04070b'); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); UITree.draw(ctx, w, h, L, { view: view, labels: true, sel: sel, grow: grow }); });
    setTimeout(function () { UITree.grow(function (g) { grow = g; cv.frame(); }, 1200); }, 120);
    function fit() {
      view.x = 0; view.y = 0; view.k = 1;
      var rowH = Math.max(22, (cv.h - 32) / L.leaves.length);
      if (rowH * L.leaves.length > cv.h && focusPid) {
        var leaf = L.leaves.filter(function (n) { return n.pid === focusPid; })[0];
        if (leaf) view.y = -(16 + leaf.y * rowH) + cv.h / 2;
      }
      cv.frame();
    }
    UIgesture(UI$('#tv-cv', el), view, { min: 0.5, max: 8, onChange: function () { cv.frame(); }, onTap: function (x, y) {
      var best = null, bd = 22; L.leaves.forEach(function (n) { if (n.sx === undefined) return; var d = Math.hypot(n.sx - x, n.sy - y); if (d < bd) { bd = d; best = n; } });
      if (!best) { var bl = null, bdl = 16; L.leaves.forEach(function (n) { if (n.sx !== undefined && Math.abs(n.sy - y) < bdl && x > n.sx) { bdl = Math.abs(n.sy - y); bl = n; } }); best = bl; }
      if (best && best.pid) { sel = best.pid; cv.frame(); UICases.personSheet(best.pid); }
    } });
    function close() { el.classList.remove('on'); setTimeout(function () { el.remove(); }, 250); UIhist.drop('tree'); if (cv.ro) cv.ro.disconnect(); }
    UIhist.push('tree', function () { el.classList.remove('on'); setTimeout(function () { el.remove(); }, 250); });
    el.querySelector('[data-x]').addEventListener('click', close);
    el.querySelector('[data-fit]').addEventListener('click', fit);
    setTimeout(function () { cv.resize(); fit(); }, 30);
    UI.emit('tree');
  }
};
