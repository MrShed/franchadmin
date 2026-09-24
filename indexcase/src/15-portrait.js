/* INDEX CASE UI — 15-portrait.js: illustrated portraits, painted once per person on a
 * canvas and cached as an image. Soft form shading (shadows are blurred with the
 * canvas shadow trick, which every browser supports), a cool key light from the upper
 * left and a warm rim from the incident room's lamps on the right.
 * Age, sex and heritage come from the engine (UIA.basicsOf) when the caller has not
 * supplied them. UIPortrait.svg(o) returns an <img>; painting happens a few at a time
 * on animation frames so a long line list never stalls. */
var UIPortrait = (function () {
  var PX = 200, U = PX / 100, OFF = 500;
  var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  var cache = {}, order = [], queue = [], queued = {}, pumping = false;

  function hex(c) { c = c.replace('#', ''); return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; }
  function mix(a, b, t) { var x = hex(a), y = hex(b); return '#' + [0, 1, 2].map(function (i) { return Math.round(x[i] + (y[i] - x[i]) * t).toString(16).padStart(2, '0'); }).join(''); }
  function rgba(c, a) { var x = hex(c); return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + a + ')'; }

  var SKIN = {
    light: ['#f3d5c0', '#eec7ab', '#e7bc9c', '#f6dccb', '#ecc2a3', '#f0cdb4'],
    south: ['#d8a37b', '#c98f66', '#b97d55', '#dfae88', '#c48a5f'],
    dark: ['#a86f4a', '#8c5a3a', '#71452b', '#5b3521', '#9a6340', '#7f4f32'],
    east: ['#f1d2b3', '#e9c4a1', '#eccaa8', '#e3b994'],
    southern: ['#e5ba95', '#dcad86', '#d2a07a', '#e9c3a1']
  };
  var GROUP = { british: 'light', irish: 'light', polish: 'light', romanian: 'light', pakistani: 'south', bangladeshi: 'south', indian: 'south', sikh: 'south', caribbean: 'dark', african: 'dark', somali: 'dark', chinese: 'east', southern: 'southern' };
  var HAIR = {
    light: ['#2a1d15', '#4a3121', '#6d4a2c', '#8e6a44', '#b58c5a', '#d2b07a', '#7a3a1c', '#9c4f25', '#1c1612', '#5b3d27'],
    south: ['#141110', '#1c1613', '#2a1d16', '#0f0d0c'], dark: ['#120f0e', '#1a1512', '#241b16'], east: ['#121010', '#1b1716', '#241d19'], southern: ['#1d1612', '#2e2119', '#43301f', '#140f0d']
  };
  var CLOTH = ['#2f4a63', '#5a3a4f', '#3d5a4b', '#6b5236', '#2c3548', '#7b3d33', '#465470', '#4f6c72', '#3a3e59', '#6c6a5c', '#8a6a3a', '#1f2a36', '#5b6b3f', '#7a2f3f', '#8c8577', '#35454f'];
  var BG = [['#2c4a63', '#0a1520'], ['#3d3357', '#100e1b'], ['#2b4a45', '#0a1716'], ['#4a3a30', '#150f0c'], ['#2f3d5e', '#0b111f'], ['#43503c', '#11140e'], ['#503242', '#160c12'], ['#394b57', '#0c1216']];
  var IRIS = { light: ['#4a6f93', '#5b7f5a', '#6b4a2c', '#3e2a1a', '#7a8fa3', '#556b3a'], south: ['#2e1d12', '#3b2716', '#4a3220'], dark: ['#24170f', '#2e1d12'], east: ['#24170f', '#2e1f14'], southern: ['#3e2a1a', '#4f3a22', '#5b6b3a'] };

  function info(o) {
    var b = null;
    if ((o.age === undefined || o.age === null || !o.sex || !o.heritage) && typeof UIA !== 'undefined' && UIA.basicsOf) { try { b = UIA.basicsOf(o.pid); } catch (e) { b = null; } }
    var her = o.heritage || (b && b.heritage) || (typeof UIA !== 'undefined' && UIA.heritageOf ? UIA.heritageOf(o.pid) : null);
    var age = o.age !== undefined && o.age !== null ? o.age : b && b.age !== null ? b.age : null, sex = o.sex || (b && b.sex) || '';
    return { age: age, sex: sex, her: her };
  }
  function keyOf(o) { var i = info(o); return [o.pid, i.age === null ? '' : i.age, i.sex, i.her || ''].join('|'); }

  /** paint one portrait; returns a JPEG data URL */
  function paint(o) {
    var I = info(o), r = UIrand('face2:' + o.pid);
    var age = I.age === null ? 25 + Math.floor(r() * 45) : I.age, fem = /^f/i.test(I.sex) ? 1 : /^m/i.test(I.sex) ? 0 : (r() < .5 ? 1 : 0);
    var grp = GROUP[I.her] || ['light', 'light', 'light', 'south', 'dark', 'east', 'southern'][Math.floor(r() * 7)];
    var kid = age < 13, teen = age >= 13 && age < 20, old = age >= 62, mid = age >= 42;
    var pick = function (a) { return a[Math.floor(r() * a.length)]; };
    var skin = pick(SKIN[grp]), dark = grp === 'dark';
    var sk = { base: skin, light: mix(skin, '#fff6ee', dark ? .22 : .38), shade: mix(skin, dark ? '#2a130a' : '#6a2f1c', dark ? .3 : .3), deep: mix(skin, '#1e0b05', dark ? .5 : .52), blush: mix(skin, '#d2524a', dark ? .18 : .32) };
    if (old) { sk.base = mix(sk.base, '#d8c8bc', .12); sk.blush = mix(sk.blush, sk.base, .4); }
    var hair = pick(HAIR[grp]);
    if (grp === 'light' && I.her === 'irish' && r() < .25) hair = pick(['#8a3a18', '#a4502a']);
    if (age > 66) hair = r() < .6 ? '#d6d2cc' : '#aaa39a'; else if (age > 54) hair = mix(hair, '#b9b3ab', r() < .5 ? .6 : .35); else if (age > 44 && r() < .35) hair = mix(hair, '#a8a198', .3);
    var hl = { base: hair, light: mix(hair, '#ffffff', hair === '#d6d2cc' ? .4 : .28), dark: mix(hair, '#000000', .5) };
    var iris = pick(IRIS[grp]), bg = pick(BG), cloth = pick(CLOTH);
    var cv = document.createElement('canvas'); cv.width = cv.height = PX;
    var x = cv.getContext('2d'); x.scale(U, U); x.lineCap = 'round'; x.lineJoin = 'round';
    // --- soft painting helpers: blurred shapes via an offset shadow
    function soft(blur, col, build, how) { var k = x.getTransform ? x.getTransform().a : U; x.save(); x.shadowColor = col; x.shadowBlur = blur * k; x.shadowOffsetX = OFF * k; x.translate(-OFF, 0); x.fillStyle = '#000'; x.strokeStyle = '#000'; x.beginPath(); build(); if (how === 'stroke') x.stroke(); else x.fill(); x.restore(); }
    function ell(cx, cy, rx, ry) { x.moveTo(cx + rx, cy); x.ellipse(cx, cy, Math.max(.01, rx), Math.max(.01, ry), 0, 0, Math.PI * 2); }
    function softEll(blur, col, cx, cy, rx, ry) { soft(blur, col, function () { ell(cx, cy, rx, ry); }); }
    function softLine(blur, col, w, pts) { x.save(); x.lineWidth = w; soft(blur, col, function () { x.moveTo(pts[0], pts[1]); if (pts.length === 4) x.lineTo(pts[2], pts[3]); else if (pts.length === 6) x.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); else x.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]); }, 'stroke'); x.restore(); }
    function strands(n, col, alpha, w, gen) { x.save(); x.strokeStyle = col; x.globalAlpha = alpha; x.lineWidth = w; x.beginPath(); for (var i = 0; i < n; i++) gen(i); x.stroke(); x.restore(); }

    // --- geometry (design units, 100 x 100)
    var faceShape = r(), cx = 50;
    var cy = kid ? 50 : 46.5 + r() * 1.5;
    var fw = kid ? 16.5 : (fem ? 14.6 : 15.6) + r() * 1.8 + (faceShape < .2 ? 1.2 : 0);
    var top = cy - (kid ? 24 : 25.5 + r() * 1.5);
    var chin = cy + (kid ? 21 : (fem ? 22 : 23.5) + r() * 2 + (faceShape > .8 ? 1.8 : 0));
    var jawW = fw * (kid ? .84 : fem ? .7 + r() * .08 : .8 + r() * .1) * (faceShape < .2 ? 1.08 : faceShape > .8 ? .92 : 1);
    var chinW = kid ? 6 : fem ? 3.6 + r() * 1.5 : 4.6 + r() * 2;
    var ex = fw * (kid ? .44 : .43), ew = kid ? 4.4 : 3.9 + r() * .4, eh = (kid ? 2.3 : 1.85) * (grp === 'east' ? .82 : 1) * (old ? .88 : 1);
    var nl = kid ? 6.8 : 9 + r() * 1.8, nw = kid ? 2.6 : (fem ? 3 : 3.6) + r() * .8 + (dark ? .6 : 0);
    var my = cy + nl + (kid ? 4.4 : 5.2), mw = (kid ? 4.4 : fem ? 5.3 : 5.8) + r() * 1;
    var mood = r(), smile = mood < .35 ? 1 : mood < .8 ? .3 : -.4;
    var neckW = fw * (fem || kid ? .56 : .68), sw = kid ? 34 : fem ? 40 + r() * 3 : 44 + r() * 4;
    function headPath() {
      x.moveTo(cx, top);
      x.bezierCurveTo(cx + fw * .78, top, cx + fw * 1.03, top + 8.5, cx + fw * 1.02, cy - 3.5);
      x.bezierCurveTo(cx + fw * 1.01, cy + 5.5, cx + jawW + 1.2, cy + 11, cx + jawW, cy + 14.5);
      x.bezierCurveTo(cx + jawW - 2.4, chin - 3.4, cx + chinW + 2.2, chin, cx, chin);
      x.bezierCurveTo(cx - chinW - 2.2, chin, cx - jawW + 2.4, chin - 3.4, cx - jawW, cy + 14.5);
      x.bezierCurveTo(cx - jawW - 1.2, cy + 11, cx - fw * 1.01, cy + 5.5, cx - fw * 1.02, cy - 3.5);
      x.bezierCurveTo(cx - fw * 1.03, top + 8.5, cx - fw * .78, top, cx, top);
      x.closePath();
    }
    // --- choose hair / headwear
    var covered = fem && !kid && r() < (I.her === 'somali' ? .8 : /pakistani|bangladeshi/.test(I.her || '') ? .45 : I.her ? .03 : .06);
    var turban = !fem && I.her === 'sikh' && r() < (kid ? .5 : .65);
    var styleF = dark ? pick(['afro', 'braids', 'bun', 'curly', 'bob', 'long']) : grp === 'east' ? pick(['long', 'bob', 'pony', 'bun', 'pixie']) : pick(['long', 'wavy', 'bob', 'bun', 'pony', 'pixie', 'curly', 'long']);
    var styleM = dark ? pick(['coils', 'coils', 'fade', 'afro', 'crop']) : pick(['crop', 'side', 'quiff', 'buzz', 'side', 'curlyS', 'crop']);
    if (!fem && age > 40 && !dark && r() < (age > 58 ? .5 : .28)) styleM = r() < .5 ? 'bald' : 'recede';
    if (!fem && dark && age > 50 && r() < .35) styleM = 'bald';
    if (kid && fem && styleF === 'pixie') styleF = 'pony';
    if (old && fem && (styleF === 'long' || styleF === 'wavy' || styleF === 'braids')) styleF = pick(['bob', 'curly', 'bun', 'short']);
    var hjColor = mix(pick(CLOTH), '#ffffff', .1);
    var style = covered ? 'hijab' : turban ? 'turban' : fem ? styleF : styleM;
    var longH = style === 'long' || style === 'wavy' || style === 'braids' || (style === 'curly' && fem);
    var ln = style === 'wavy' ? 44 : style === 'braids' ? 50 : style === 'curly' ? 34 : 48;
    var glasses = age > 44 ? r() < .5 : age > 12 ? r() < .16 : r() < .06;
    var beard = !fem && !kid && !teen && (turban ? r() < .85 : r() < .22), stub = !fem && !kid && !beard && age > 17 && r() < .35, tache = !fem && !beard && age > 30 && r() < .1;
    var clothKind = kid ? pick(['crew', 'school', 'hoodie']) : teen ? pick(['hoodie', 'crew', 'crew']) : old ? pick(['cardigan', 'shirt', 'crew', 'coat']) : pick(['crew', 'shirt', 'vneck', 'blazer', 'coat', 'hoodie', 'shirt']);

    // --- background: a dark jewel tone, soft bokeh, a warm lamp to the right
    var g = x.createLinearGradient(0, 0, 100, 100); g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]); x.fillStyle = g; x.fillRect(0, 0, 100, 100);
    for (var b = 0; b < 4; b++) { var bx = r() * 100, by = r() * 55, br = 6 + r() * 14, gb = x.createRadialGradient(bx, by, 0, bx, by, br); gb.addColorStop(0, 'rgba(220,235,255,' + (0.05 + r() * .06).toFixed(3) + ')'); gb.addColorStop(1, 'rgba(220,235,255,0)'); x.fillStyle = gb; x.fillRect(bx - br, by - br, br * 2, br * 2); }
    var gl = x.createRadialGradient(108, 40, 0, 108, 40, 60); gl.addColorStop(0, 'rgba(255,150,90,.22)'); gl.addColorStop(1, 'rgba(255,150,90,0)'); x.fillStyle = gl; x.fillRect(0, 0, 100, 100);
    // frame head and shoulders tightly
    var zoom = kid ? 1.24 : 1.32; x.save(); x.translate(50, 62); x.scale(zoom, zoom); x.translate(-50, -62);

    // --- hair behind the head
    function hairFill(build, gx0, gy0, gx1, gy1) { var hg = x.createLinearGradient(gx0, gy0, gx1, gy1); hg.addColorStop(0, hl.light); hg.addColorStop(.35, hl.base); hg.addColorStop(1, hl.dark); x.fillStyle = hg; x.beginPath(); build(); x.fill(); }
    if (longH) {
      var wv = style === 'wavy' ? 3 : 0;
      var backP = function () { x.moveTo(cx - fw - 3, cy - 10); x.bezierCurveTo(cx - fw - 8 - wv, cy + ln * .35, cx - fw - 9, cy + ln * .75, cx - fw - 4, cy + ln); x.quadraticCurveTo(cx, cy + ln + 4, cx + fw + 4, cy + ln); x.bezierCurveTo(cx + fw + 9, cy + ln * .75, cx + fw + 8 + wv, cy + ln * .35, cx + fw + 3, cy - 10); x.closePath(); };
      hairFill(backP, cx - 20, cy, cx + 20, cy + ln); x.save(); x.beginPath(); backP(); x.clip(); softEll(6, 'rgba(0,0,0,.55)', cx, cy + ln * .55, fw * .9, ln * .5); x.restore();
    }
    if (style === 'afro' || (style === 'curly' && !longH) || style === 'coils') {
      var ar = style === 'afro' ? (fem ? 9 : 6.5) : style === 'curly' ? 5.5 : 2.8, ay = cy - 7 - (style === 'afro' ? 3 : 0);
      var afroP = function () { ell(cx, ay, fw + ar, (cy - top) + ar - 1); };
      hairFill(afroP, cx - 10, top - ar, cx + 12, cy + 8);
      coilTex(afroP, style === 'coils' ? 160 : 260, style === 'coils' ? .6 : 1);
    }
    if (style === 'pony') { var ps = r() < .5 ? -1 : 1; hairFill(function () { x.moveTo(cx + ps * (fw - 2), cy - 6); x.bezierCurveTo(cx + ps * (fw + 9), cy, cx + ps * (fw + 7), cy + 22, cx + ps * (fw + 2), cy + 30); x.bezierCurveTo(cx + ps * (fw + 3), cy + 18, cx + ps * (fw + 1), cy + 6, cx + ps * (fw - 4), cy - 2); x.closePath(); }, cx, cy, cx + ps * 20, cy + 30); }
    if (style === 'hijab') {
      var sc = hjColor;
      var dr = function () { x.moveTo(cx - fw - 7, cy + 2); x.bezierCurveTo(cx - fw - 9, top - 14, cx + fw + 9, top - 14, cx + fw + 7, cy + 2); x.bezierCurveTo(cx + fw + 10, chin + 10, cx + sw * .8, 92, cx + sw + 6, 102); x.lineTo(cx - sw - 6, 102); x.bezierCurveTo(cx - sw * .8, 92, cx - fw - 10, chin + 10, cx - fw - 7, cy + 2); x.closePath(); };
      var hg2 = x.createLinearGradient(cx - 30, top, cx + 30, 100); hg2.addColorStop(0, mix(sc, '#ffffff', .18)); hg2.addColorStop(.5, sc); hg2.addColorStop(1, mix(sc, '#000000', .45));
      x.fillStyle = hg2; x.beginPath(); dr(); x.fill();
      x.save(); x.beginPath(); dr(); x.clip();
      for (var f = 0; f < 5; f++) { var fx = cx - 22 + f * 11 + r() * 4; softLine(1.6, 'rgba(0,0,0,.35)', 1.4, [fx, chin + 2, fx + (r() - .5) * 10, chin + 16, fx + (r() - .5) * 16, 100]); softLine(1.4, 'rgba(255,255,255,.14)', 1, [fx + 3, chin + 4, fx + 3 + (r() - .5) * 8, chin + 16, fx + 3 + (r() - .5) * 12, 100]); }
      x.restore();
    }

    // --- shoulders and clothing
    var nb = chin + (kid ? 6 : 8);
    var body = function () { x.moveTo(cx - neckW - 3, nb - 2); x.bezierCurveTo(cx - neckW - 14, nb + .5, cx - sw + 3, nb + 3, cx - sw - 2, nb + 16); x.lineTo(cx - sw - 2, 104); x.lineTo(cx + sw + 2, 104); x.lineTo(cx + sw + 2, nb + 16); x.bezierCurveTo(cx + sw - 3, nb + 3, cx + neckW + 14, nb + .5, cx + neckW + 3, nb - 2); x.closePath(); };
    if (style !== 'hijab') {
      var cg = x.createLinearGradient(cx - sw, nb, cx + sw, 104); cg.addColorStop(0, mix(cloth, '#ffffff', .2)); cg.addColorStop(.55, cloth); cg.addColorStop(1, mix(cloth, '#000000', .5));
      x.fillStyle = cg; x.beginPath(); body(); x.fill();
      x.save(); x.beginPath(); body(); x.clip();
      // folds and the fall of light across the chest
      softLine(2.2, 'rgba(0,0,0,.4)', 1.6, [cx - sw * .55, 104, cx - sw * .5, nb + 12, cx - neckW - 6, nb + 3]);
      softLine(2.2, 'rgba(0,0,0,.45)', 1.8, [cx + sw * .5, 104, cx + sw * .45, nb + 12, cx + neckW + 6, nb + 3]);
      softLine(1.5, 'rgba(255,255,255,.12)', 1.2, [cx - sw * .72, 104, cx - sw * .65, nb + 9, cx - neckW - 9, nb + 1]);
      softEll(5, 'rgba(0,0,0,.35)', cx, nb + 3, neckW + 6, 4);
      var dk = mix(cloth, '#000000', .38), lt = mix(cloth, '#ffffff', .25);
      if (clothKind === 'crew' || clothKind === 'school') {
        x.strokeStyle = dk; x.lineWidth = 2.2; x.beginPath(); x.moveTo(cx - neckW - 2.5, nb - 1); x.quadraticCurveTo(cx, nb + 6.5, cx + neckW + 2.5, nb - 1); x.stroke();
        x.strokeStyle = rgba(lt, .5); x.lineWidth = .6; x.beginPath(); x.moveTo(cx - neckW - 2.5, nb - 2.2); x.quadraticCurveTo(cx, nb + 5, cx + neckW + 2.5, nb - 2.2); x.stroke();
        if (clothKind === 'school') { x.fillStyle = '#eef0f2'; x.beginPath(); x.moveTo(cx - neckW - 1, nb - 1.5); x.lineTo(cx - 1.5, nb + 5); x.lineTo(cx - 6, nb + 5.5); x.closePath(); x.moveTo(cx + neckW + 1, nb - 1.5); x.lineTo(cx + 1.5, nb + 5); x.lineTo(cx + 6, nb + 5.5); x.closePath(); x.fill(); }
      } else if (clothKind === 'shirt' || clothKind === 'blazer' || clothKind === 'coat') {
        var shirtC = clothKind === 'shirt' ? mix(cloth, '#ffffff', .15) : pick(['#e9e6e0', '#dce6ee', '#f1ece2', '#c9d6e3']);
        if (clothKind !== 'shirt') { x.fillStyle = shirtC; x.beginPath(); x.moveTo(cx - neckW - 1, nb - 1); x.lineTo(cx, nb + 16); x.lineTo(cx + neckW + 1, nb - 1); x.closePath(); x.fill(); softLine(1.2, 'rgba(0,0,0,.35)', 1, [cx, nb + 2, cx, nb + 16]); if (!fem && clothKind === 'blazer' && r() < .5) { x.fillStyle = pick(['#6b2233', '#23344f', '#3e4a2b', '#5b4a2a']); x.beginPath(); x.moveTo(cx - 1.4, nb + 3); x.lineTo(cx + 1.4, nb + 3); x.lineTo(cx + 2.2, nb + 16); x.lineTo(cx, nb + 19); x.lineTo(cx - 2.2, nb + 16); x.closePath(); x.fill(); } }
        var colC = clothKind === 'shirt' ? mix(cloth, '#ffffff', .25) : shirtC;
        x.fillStyle = colC; x.beginPath(); x.moveTo(cx - neckW - 2.5, nb - 3); x.lineTo(cx - 1.5, nb + 5); x.lineTo(cx - neckW - 5, nb + 6.5); x.closePath(); x.moveTo(cx + neckW + 2.5, nb - 3); x.lineTo(cx + 1.5, nb + 5); x.lineTo(cx + neckW + 5, nb + 6.5); x.closePath(); x.fill();
        softLine(1, 'rgba(0,0,0,.4)', .8, [cx + neckW + 5, nb + 6.5, cx + 1.5, nb + 5]);
        if (clothKind === 'shirt') { x.strokeStyle = rgba(dk, .8); x.lineWidth = .5; x.beginPath(); x.moveTo(cx, nb + 5); x.lineTo(cx, 104); x.stroke(); x.fillStyle = rgba(lt, .9); [nb + 9, nb + 15].forEach(function (yy) { x.beginPath(); ell(cx + .8, yy, .6, .6); x.fill(); }); }
        else { x.fillStyle = dk; x.beginPath(); x.moveTo(cx - neckW - 3, nb - 1); x.lineTo(cx - 1, nb + 18); x.lineTo(cx - 7, nb + 26); x.lineTo(cx - neckW - 9, nb + 6); x.closePath(); x.moveTo(cx + neckW + 3, nb - 1); x.lineTo(cx + 1, nb + 18); x.lineTo(cx + 7, nb + 26); x.lineTo(cx + neckW + 9, nb + 6); x.closePath(); x.fill(); softLine(1.2, rgba(lt, .35), .7, [cx - neckW - 3.5, nb - .5, cx - 1.5, nb + 17.5]); }
        if (clothKind === 'coat' && r() < .6) { var scf = pick(['#8a2f2f', '#2f4f6a', '#6a5a2f', '#3f5a3f', '#b8a88a']); x.fillStyle = scf; x.beginPath(); x.moveTo(cx - neckW - 5, nb - 4); x.quadraticCurveTo(cx, nb + 5, cx + neckW + 5, nb - 4); x.lineTo(cx + neckW + 6, nb + 1); x.quadraticCurveTo(cx, nb + 10, cx - neckW - 6, nb + 1); x.closePath(); x.fill(); x.fillRect(cx + 2, nb + 3, 5, 14); softLine(1, 'rgba(0,0,0,.35)', .8, [cx - neckW - 5, nb + 1, cx, nb + 7.5, cx + neckW + 5, nb + 1]); }
      } else if (clothKind === 'vneck' || clothKind === 'cardigan') {
        x.fillStyle = mix(sk.base, sk.shade, .3); x.beginPath(); x.moveTo(cx - neckW - 1.5, nb - 1); x.lineTo(cx, nb + 12); x.lineTo(cx + neckW + 1.5, nb - 1); x.closePath(); x.fill();
        if (clothKind === 'cardigan') { x.fillStyle = pick(['#efeae2', '#d7dde4', '#e8dccb']); x.beginPath(); x.moveTo(cx - neckW, nb); x.quadraticCurveTo(cx, nb + 6, cx + neckW, nb); x.lineTo(cx, nb + 12); x.closePath(); x.fill(); x.fillStyle = rgba(lt, .9); [nb + 16, nb + 22].forEach(function (yy) { x.beginPath(); ell(cx + 1, yy, .8, .8); x.fill(); }); }
        x.strokeStyle = dk; x.lineWidth = 1.8; x.beginPath(); x.moveTo(cx - neckW - 2.5, nb - 1.5); x.lineTo(cx, nb + 13); x.lineTo(cx + neckW + 2.5, nb - 1.5); x.stroke();
      } else if (clothKind === 'hoodie') {
        x.fillStyle = mix(cloth, '#000000', .15); x.beginPath(); ell(cx, nb + 1, neckW + 8, 5.5); x.fill();
        softEll(1.5, 'rgba(0,0,0,.45)', cx, nb + 1.5, neckW + 3, 2.6);
        x.strokeStyle = rgba(lt, .8); x.lineWidth = .7; x.beginPath(); x.moveTo(cx - 3, nb + 5); x.lineTo(cx - 3.6, nb + 16); x.moveTo(cx + 3, nb + 5); x.lineTo(cx + 3.4, nb + 14); x.stroke();
      }
      x.restore();
    }

    // --- neck, with the shadow the jaw throws on it
    if (style !== 'hijab') {
      var neck = function () { x.moveTo(cx - neckW, cy + 10); x.lineTo(cx - neckW - 1.2, nb + 1); x.quadraticCurveTo(cx, nb + 6, cx + neckW + 1.2, nb + 1); x.lineTo(cx + neckW, cy + 10); x.closePath(); };
      x.fillStyle = mix(sk.base, sk.shade, .35); x.beginPath(); neck(); x.fill();
      x.save(); x.beginPath(); neck(); x.clip();
      softEll(3, rgba(sk.deep, .75), cx + 1, chin + 1, jawW * .95, 5);
      softEll(2.5, rgba(sk.deep, .5), cx + neckW, (cy + nb) / 2 + 4, 2.5, 10);
      softLine(1.5, rgba(sk.light, .35), 1, [cx - neckW + 1.5, chin + 3, cx - neckW + .5, nb - 1]);
      x.restore();
    }
    // --- ears
    if (style !== 'hijab' && style !== 'turban' || style === 'turban') {
      [-1, 1].forEach(function (sd) {
        var ex0 = cx + sd * (fw * 1.01), ey0 = cy + 3.2;
        x.fillStyle = sd < 0 ? sk.base : mix(sk.base, sk.shade, .5); x.beginPath(); x.moveTo(ex0, ey0 - 5); x.bezierCurveTo(ex0 + sd * 4.2, ey0 - 7, ex0 + sd * 4.4, ey0 + 3, ex0 + sd * 1, ey0 + 6); x.lineTo(ex0 - sd * .5, ey0 + 4); x.closePath(); x.fill();
        softLine(.8, rgba(sk.deep, .6), .8, [ex0 + sd * .8, ey0 - 3, ex0 + sd * 2.8, ey0 - 3, ex0 + sd * 2.2, ey0 + 2]);
        softEll(1.2, rgba(sk.blush, .45), ex0 + sd * 2, ey0 - 1, 1.4, 2.4);
      });
    }
    // --- the head: base, then form shadow, highlights, warmth
    var kg = x.createRadialGradient(cx - 6, cy - 6, 2, cx, cy + 2, fw * 1.9);
    kg.addColorStop(0, sk.light); kg.addColorStop(.42, sk.base); kg.addColorStop(1, sk.shade);
    x.fillStyle = kg; x.beginPath(); headPath(); x.fill();
    x.save(); x.beginPath(); headPath(); x.clip();
    softEll(4.5, rgba(sk.shade, .75), cx + fw * 1.02, cy + 4, fw * .5, 30);
    softEll(3, rgba(sk.deep, .35), cx + fw * .95, cy + 12, fw * .28, 10);
    softEll(3.5, rgba(sk.deep, .3), cx, chin + 1, chinW + 4, 2.2);
    [-1, 1].forEach(function (sd) { softEll(2.2, rgba(sk.shade, sd < 0 ? .45 : .6), cx + sd * ex, cy - 1, ew + 1.4, eh + 1.4); });
    softEll(4, rgba(sk.light, .7), cx - 4, top + 9, 8, 4);
    softEll(3, rgba(sk.light, .5), cx - fw * .52, cy + 5.5, 4.2, 2.6);
    softEll(3.2, rgba(sk.blush, kid ? .55 : dark ? .22 : .35), cx - fw * .55, cy + 8.5, 4.6, 3);
    softEll(3.2, rgba(sk.blush, kid ? .45 : dark ? .16 : .25), cx + fw * .55, cy + 8.5, 4.2, 2.8);
    softEll(2, rgba(sk.light, .45), cx - 1.2, chin - 3.5, 3.2, 1.6);
    // age: folds, bags, lines
    if (mid) { [-1, 1].forEach(function (sd) { softLine(1, rgba(sk.deep, age > 58 ? .5 : .32), .8, [cx + sd * (nw + .2), cy + nl - .2, cx + sd * (nw + 3.2), cy + nl + 3, cx + sd * (mw + 1.2), my + 2.8]); }); }
    if (age > 52) [-1, 1].forEach(function (sd) { softLine(.9, rgba(sk.deep, .35), .6, [cx + sd * (ex - ew * .7), cy + eh + 2.2, cx + sd * ex, cy + eh + 3.2, cx + sd * (ex + ew * .6), cy + eh + 2]); });
    if (old) {
      [0, 1, 2].forEach(function (i) { softLine(.9, rgba(sk.deep, .3), .5, [cx - 7 + i * .5, top + 9 + i * 2.6, cx, top + 8 + i * 2.6, cx + 7, top + 9.4 + i * 2.6]); });
      [-1, 1].forEach(function (sd) { [0, 1].forEach(function (i) { softLine(.6, rgba(sk.deep, .35), .45, [cx + sd * (ex + ew + .4), cy - .5 + i * 1.8, cx + sd * (ex + ew + 2.6), cy - 1 + i * 2.6]); }); softEll(2.5, rgba(sk.shade, .45), cx + sd * (jawW - 1.5), cy + 17, 2.5, 3.5); });
    }
    // stubble
    if (stub || beard) {
      x.fillStyle = rgba(hl.base, stub ? .22 : .35);
      for (var q = 0; q < 900; q++) { var sx = cx - fw + r() * fw * 2, sy = cy + 6 + r() * (chin - cy); var inJaw = (sy > my - 3.2 && Math.abs(sx - cx) < mw + 2) || (sy > cy + 9 && Math.abs(sx - cx) > fw * .52) || sy > my + 3; if (!inJaw || (sy > my - 1 && sy < my + 2.6 && Math.abs(sx - cx) < mw)) continue; x.fillRect(sx, sy, .38, .38); }
    }
    x.restore();
    // hairline shadow on the forehead
    if (style !== 'bald') softEll(3, rgba(sk.deep, style === 'hijab' || style === 'turban' ? .5 : .32), cx, top + (fem ? 5 : 6), fw * .95, 3.5);
    // warm rim light down the right side of face and neck
    x.save(); x.globalCompositeOperation = 'lighter'; x.beginPath(); x.rect(cx + fw * .5, 0, 60, 100); x.clip(); x.beginPath(); headPath(); x.clip(); x.lineWidth = 2.6;
    soft(2.6, 'rgba(255,150,95,.42)', function () { headPath(); }, 'stroke'); x.restore();

    // --- eyes
    var brow = style === 'bald' || style === 'hijab' ? mix(hair === '#d6d2cc' || hair === '#aaa39a' ? '#7d766e' : hl.base, '#2a1d15', .3) : mix(hl.base, '#1b120c', hair === '#d6d2cc' ? .1 : .25);
    [-1, 1].forEach(function (sd) {
      var ex1 = cx + sd * ex, ey1 = cy;
      var eye = function () { x.moveTo(ex1 - sd * ew, ey1 + .25); x.bezierCurveTo(ex1 - sd * ew * .5, ey1 - eh * 1.35, ex1 + sd * ew * .55, ey1 - eh * 1.3, ex1 + sd * ew, ey1 - .35); x.bezierCurveTo(ex1 + sd * ew * .5, ey1 + eh * 1.05, ex1 - sd * ew * .45, ey1 + eh * 1.1, ex1 - sd * ew, ey1 + .25); x.closePath(); };
      x.fillStyle = mix('#efe7e0', sk.shade, dark ? .12 : .06); x.beginPath(); eye(); x.fill();
      x.save(); x.beginPath(); eye(); x.clip();
      var ir = kid ? 2.05 : 1.8, ix = ex1 + sd * .15, iy = ey1 - .15;
      var ig = x.createRadialGradient(ix - .3, iy - .3, .2, ix, iy, ir); ig.addColorStop(0, mix(iris, '#ffffff', .28)); ig.addColorStop(.7, iris); ig.addColorStop(1, mix(iris, '#000000', .55));
      x.fillStyle = ig; x.beginPath(); ell(ix, iy, ir, ir); x.fill();
      x.fillStyle = '#0b0705'; x.beginPath(); ell(ix, iy, ir * .45, ir * .45); x.fill();
      softEll(1, 'rgba(40,20,10,.55)', ex1, ey1 - eh * 1.1, ew * 1.1, eh * .7);
      x.fillStyle = 'rgba(255,255,255,.92)'; x.beginPath(); ell(ix - .55, iy - .6, .42, .42); x.fill(); x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); ell(ix + .6, iy + .5, .2, .2); x.fill();
      x.restore();
      // lids and lashes
      x.strokeStyle = '#24160f'; x.lineWidth = fem ? 1 : .8; x.beginPath(); x.moveTo(ex1 - sd * (ew + .2), ey1 + .35); x.bezierCurveTo(ex1 - sd * ew * .5, ey1 - eh * 1.42, ex1 + sd * ew * .55, ey1 - eh * 1.38, ex1 + sd * (ew + .3), ey1 - .45); x.stroke();
      if (fem && !kid) { x.lineWidth = .5; x.beginPath(); x.moveTo(ex1 + sd * (ew + .2), ey1 - .45); x.lineTo(ex1 + sd * (ew + 1.1), ey1 - 1.1); x.stroke(); }
      softLine(.6, rgba(sk.deep, .45), .45, [ex1 - sd * ew * .6, ey1 + eh * 1.05, ex1, ey1 + eh * 1.25, ex1 + sd * ew * .8, ey1 + eh * .8]);
      if (grp !== 'east' || r() < .3) softLine(.7, rgba(sk.deep, old ? .7 : .5), .55, [ex1 - sd * ew * .7, ey1 - eh * 1.55 - .7, ex1, ey1 - eh * 2.2 - .9, ex1 + sd * ew * .85, ey1 - eh * 1.35 - .6]);
      // brow: a soft mass then hair strokes
      var byy = ey1 - 5.4 - (fem ? .5 : 0) + (sd < 0 ? 0 : (r() - .5) * .6), bth = fem ? 1.1 : kid ? 1.1 : 1.7;
      soft(.7, rgba(brow, .8), function () { x.moveTo(ex1 - sd * 4.8, byy + 1.2); x.quadraticCurveTo(ex1 - sd * .8, byy - 1.5, ex1 + sd * 4.6, byy + .4); x.quadraticCurveTo(ex1, byy - 1.5 + bth, ex1 - sd * 4.8, byy + 1.2 + bth * .3); x.closePath(); });
      strands(14, brow, .45, .3, function (i) { var t = i / 13, px = ex1 - sd * 4.4 + sd * t * 8.6, py = byy + .9 - Math.sin(t * 3.1) * 1.3 * (1 - t * .3) + bth * .35; x.moveTo(px, py + .3); x.lineTo(px + sd * 1.6, py - .35 + t * .3); });
    });
    // --- nose: form, not an outline
    softLine(1.2, rgba(sk.shade, .6), 1.5, [cx + 1.6, cy + 1, cx + 2.2, cy + nl * .5, cx + nw * .8, cy + nl - 1.2]);
    softLine(1, rgba(sk.light, .75), 1.1, [cx - .6, cy + 1.5, cx - .9, cy + nl * .55, cx - .6, cy + nl - 2.2]);
    softEll(1.2, rgba(sk.shade, .55), cx, cy + nl + 1.1, nw * .95, 1);
    [-1, 1].forEach(function (sd) { softEll(.7, rgba(sk.deep, .6), cx + sd * nw * .5, cy + nl + .2, 1, .55); softLine(.5, rgba(sk.deep, .45), .45, [cx + sd * (nw - .2), cy + nl - 2.2, cx + sd * (nw + .6), cy + nl - .4, cx + sd * (nw * .55), cy + nl + .6]); });
    softEll(1, rgba(sk.light, .8), cx - .5, cy + nl - 1.5, 1.3, .9);
    softEll(1.8, rgba(sk.blush, .35), cx, cy + nl - 1, 2.2, 1.4);
    // --- mouth
    var lip = dark ? mix(sk.base, '#4a1c18', .35) : mix(sk.base, '#b04a46', old ? .32 : .5), lipD = mix(lip, '#2a0a06', .35);
    if (!beard) {
      softLine(.9, rgba(sk.shade, .45), .7, [cx - .9, cy + nl + 1.5, cx - .8, my - 1.6]); softLine(.9, rgba(sk.shade, .35), .7, [cx + .9, cy + nl + 1.5, cx + .8, my - 1.6]);
      var uy = my - .2 * smile;
      x.fillStyle = lipD; x.beginPath(); x.moveTo(cx - mw, uy - smile * .6); x.bezierCurveTo(cx - mw * .6, my - 1.3, cx - 1.4, my - (fem ? 2.3 : 1.9), cx, my - 1.3); x.bezierCurveTo(cx + 1.4, my - (fem ? 2.3 : 1.9), cx + mw * .6, my - 1.3, cx + mw, uy - smile * .6); x.bezierCurveTo(cx + mw * .4, my + .1, cx - mw * .4, my + .1, cx - mw, uy - smile * .6); x.closePath(); x.fill();
      var lg = x.createLinearGradient(0, my, 0, my + 3); lg.addColorStop(0, lip); lg.addColorStop(1, mix(lip, sk.base, .35));
      x.fillStyle = lg; x.beginPath(); x.moveTo(cx - mw * .88, my); x.bezierCurveTo(cx - mw * .5, my + (fem ? 3.1 : 2.4), cx + mw * .5, my + (fem ? 3.1 : 2.4), cx + mw * .88, my); x.bezierCurveTo(cx + mw * .4, my + .45, cx - mw * .4, my + .45, cx - mw * .88, my); x.closePath(); x.fill();
      x.strokeStyle = mix(lipD, '#1a0604', .5); x.lineWidth = .55; x.beginPath(); x.moveTo(cx - mw, uy - smile * .6); x.bezierCurveTo(cx - mw * .4, my + .5 + smile * .2, cx + mw * .4, my + .5 + smile * .2, cx + mw, uy - smile * .6); x.stroke();
      softEll(.9, 'rgba(255,255,255,.35)', cx - 1, my + 1.5, 1.8, .5);
      softEll(1.6, rgba(sk.shade, .5), cx, my + 4.2, 3, 1.1);
      if (smile > .5) [-1, 1].forEach(function (sd) { softLine(.7, rgba(sk.deep, .4), .5, [cx + sd * (mw + .3), my - .9, cx + sd * (mw + 1.1), my + .3]); });
    }
    // --- facial hair
    if (beard) {
      var bd = function () { x.moveTo(cx - fw * 1.0, cy + 1); x.bezierCurveTo(cx - fw * 1.02, cy + 12, cx - jawW - 1, chin - 2, cx - chinW, chin + 3.5); x.quadraticCurveTo(cx, chin + 6, cx + chinW, chin + 3.5); x.bezierCurveTo(cx + jawW + 1, chin - 2, cx + fw * 1.02, cy + 12, cx + fw * 1.0, cy + 1); x.lineTo(cx + fw * .82, cy + 5); x.bezierCurveTo(cx + fw * .6, cy + 11, cx + mw + 1.5, my - 3.5, cx, my - 2.6); x.bezierCurveTo(cx - mw - 1.5, my - 3.5, cx - fw * .6, cy + 11, cx - fw * .82, cy + 5); x.closePath(); };
      hairFill(bd, cx - 10, cy, cx + 12, chin + 6);
      x.save(); x.beginPath(); bd(); x.clip();
      strands(70, hl.light, .3, .35, function () { var sx = cx - fw + r() * fw * 2, sy = cy + 4 + r() * (chin - cy + 2); x.moveTo(sx, sy); x.lineTo(sx + (sx - cx) * .06, sy + 1.6); });
      strands(60, hl.dark, .35, .35, function () { var sx = cx - fw + r() * fw * 2, sy = cy + 4 + r() * (chin - cy + 2); x.moveTo(sx, sy); x.lineTo(sx + (sx - cx) * .05, sy + 1.4); });
      softEll(3, 'rgba(0,0,0,.35)', cx + fw * .7, cy + 14, 4, 10);
      x.restore();
      x.fillStyle = lip; x.beginPath(); x.moveTo(cx - 3.6, my + .2); x.quadraticCurveTo(cx, my + 2.6, cx + 3.6, my + .2); x.quadraticCurveTo(cx, my + .9, cx - 3.6, my + .2); x.fill();
      x.strokeStyle = 'rgba(20,8,4,.8)'; x.lineWidth = .5; x.beginPath(); x.moveTo(cx - 3.8, my); x.quadraticCurveTo(cx, my + .7, cx + 3.8, my); x.stroke();
    }
    if (tache || beard) { hairFill(function () { x.moveTo(cx - mw - 1.6, my + .1); x.bezierCurveTo(cx - mw - .6, my - 2.9, cx - 1.4, my - 3.6, cx, my - 3); x.bezierCurveTo(cx + 1.4, my - 3.6, cx + mw + .6, my - 2.9, cx + mw + 1.6, my + .1); x.bezierCurveTo(cx + mw * .6, my - 1.8, cx - mw * .6, my - 1.8, cx - mw - 1.6, my + .1); x.closePath(); }, cx - 6, my - 4, cx + 6, my); }

    // --- hair in front / headwear
    function dome(th) { return (cy - 3) + (top - th - (cy - 3)) / .75; }
    function flow(pathFn, n, len, fromX, fromY, spread) {
      x.save(); x.beginPath(); pathFn(); x.clip();
      strands(n, hl.light, .32, .45, function (i) { var a = (i / n - .5) * spread, sx = fromX + (r() - .5) * 3, sy = fromY + r() * 2; x.moveTo(sx, sy); x.quadraticCurveTo(sx + Math.sin(a) * len * .5, sy + Math.cos(a) * len * .3, sx + Math.sin(a) * len, sy + Math.cos(a) * len); });
      strands(n, hl.dark, .38, .4, function (i) { var a = ((i + .5) / n - .5) * spread, sx = fromX + (r() - .5) * 3, sy = fromY + r() * 2; x.moveTo(sx, sy); x.quadraticCurveTo(sx + Math.sin(a) * len * .5, sy + Math.cos(a) * len * .3, sx + Math.sin(a) * len, sy + Math.cos(a) * len); });
      softEll(3, 'rgba(255,245,235,.14)', cx - fw * .3, top + 1, fw * .5, 2.5);
      x.restore();
    }
    function coilTex(pathFn, n, rad) { x.save(); x.beginPath(); pathFn(); x.clip(); x.lineWidth = .4; for (var i = 0; i < n; i++) { var px = cx - fw - 10 + r() * (fw * 2 + 20), py = top - 12 + r() * (cy - top + 16); x.strokeStyle = r() < .5 ? rgba(hl.light, .35) : rgba(hl.dark, .45); x.beginPath(); x.arc(px, py, rad * (.6 + r() * .8), r() * 6, r() * 6 + 3.5); x.stroke(); } softEll(4, 'rgba(255,240,230,.1)', cx - 4, top - 2, fw * .7, 4); x.restore(); }
    var sp = r() < .5 ? -1 : 1;
    if (style === 'turban' || style === 'hijab') {
      if (style === 'turban') {
        var tc = pick(['#1f3f7a', '#7a1f2b', '#d99a22', '#efe9dd', '#2d5b3a', '#1c1c24', '#c2562c', '#4a2f5e']);
        var tb = function () { x.moveTo(cx - fw - 2, cy - 1); x.bezierCurveTo(cx - fw - 5, top - (kid ? 10 : 17), cx + fw + 5, top - (kid ? 10 : 17), cx + fw + 2, cy - 1); x.bezierCurveTo(cx + fw * .7, top + 10, cx + 4, top + 7, cx, top + 9.5); x.bezierCurveTo(cx - 4, top + 7, cx - fw * .7, top + 10, cx - fw - 2, cy - 1); x.closePath(); };
        var tg = x.createLinearGradient(cx - 20, top - 16, cx + 20, cy); tg.addColorStop(0, mix(tc, '#ffffff', .22)); tg.addColorStop(.5, tc); tg.addColorStop(1, mix(tc, '#000000', .45));
        x.fillStyle = tg; x.beginPath(); tb(); x.fill();
        x.save(); x.beginPath(); tb(); x.clip();
        softLine(1.2, 'rgba(0,0,0,.45)', 1.2, [cx, top + 9, cx - 3, top - 2, cx - fw - 3, top - 8]); softLine(1.2, 'rgba(0,0,0,.4)', 1.1, [cx, top + 9, cx + 3, top - 2, cx + fw + 3, top - 8]);
        for (var tf = 0; tf < 4; tf++) { var yy = top - 12 + tf * 5; softLine(1.2, 'rgba(0,0,0,.4)', 1.1, [cx - fw - 4, yy + 12 - tf * 1.5, cx - 2, yy - 2, cx + fw + 4, yy + 4 + tf * 2]); softLine(1, 'rgba(255,255,255,.2)', .8, [cx - fw - 4, yy + 10.5 - tf * 1.5, cx - 2, yy - 3.4, cx + fw + 4, yy + 2.6 + tf * 2]); }
        x.restore();
      } else {
        var sc2 = x.fillStyle;
        var band = function () { ell(cx, (top + chin) / 2 - 1, fw + 6, (chin - top) / 2 + 7); ell(cx, (top + 7 + chin - 1) / 2, fw - .6, (chin - 1 - top - 7) / 2); };
        var hjc = mix(hjColor, '#ffffff', .06);
        var hg3 = x.createLinearGradient(cx - 22, top, cx + 22, chin); hg3.addColorStop(0, mix(hjc, '#ffffff', .2)); hg3.addColorStop(.5, hjc); hg3.addColorStop(1, mix(hjc, '#000000', .45));
        x.fillStyle = hg3; x.beginPath(); band(); x.fill('evenodd');
        x.save(); x.beginPath(); band(); x.clip('evenodd');
        softLine(1.5, 'rgba(0,0,0,.4)', 1.2, [cx - fw - 1, top + 12, cx - fw + 1, cy + 8, cx - jawW, chin + 1]);
        softLine(1.5, 'rgba(0,0,0,.45)', 1.2, [cx + fw + 1, top + 12, cx + fw - 1, cy + 8, cx + jawW, chin + 1]);
        softLine(1.4, 'rgba(255,255,255,.18)', 1, [cx - fw + 2, top + 2, cx, top - 1.5, cx + fw - 2, top + 2]);
        x.restore();
        void sc2;
      }
    } else if (style === 'bald' || style === 'recede') {
      var side = function (sd) { x.moveTo(cx + sd * fw * 1.03, cy + 3); x.bezierCurveTo(cx + sd * fw * 1.08, cy - 6, cx + sd * fw * .98, top + 10, cx + sd * fw * .7, top + (style === 'recede' ? 5 : 9)); x.lineTo(cx + sd * fw * .78, top + (style === 'recede' ? 9 : 12)); x.bezierCurveTo(cx + sd * fw * .9, cy - 8, cx + sd * fw * .92, cy - 3, cx + sd * fw * .86, cy + 2); x.closePath(); };
      hairFill(function () { side(-1); side(1); }, cx - 20, top, cx + 20, cy);
      if (style === 'recede') { var rec = function () { x.moveTo(cx - fw * .75, top + 7); x.bezierCurveTo(cx - fw * .6, top - 1.5, cx + fw * .6, top - 1.5, cx + fw * .75, top + 7); x.bezierCurveTo(cx + fw * .35, top + 3.5, cx - fw * .35, top + 3.5, cx - fw * .75, top + 7); x.closePath(); }; hairFill(rec, cx, top, cx, top + 6); x.save(); x.globalAlpha = .6; x.restore(); }
      softEll(2.5, 'rgba(255,248,240,.35)', cx - 3, top + 4, 7, 2.6);
    } else if (style === 'afro' || style === 'coils' || (style === 'curly' && !longH)) {
      var ar2 = style === 'afro' ? (fem ? 9 : 6.5) : style === 'curly' ? 5.5 : 2.8, ay2 = cy - 7 - (style === 'afro' ? 3 : 0);
      var hlY = top + (style === 'coils' ? 5.5 : 4.5);
      var mass = function () { x.moveTo(cx - fw - .8, cy - 1); x.bezierCurveTo(cx - fw - ar2 * 1.3, ay2 - 10, cx - fw * .8, top - ar2 * 1.6, cx, top - ar2 * .95); x.bezierCurveTo(cx + fw * .8, top - ar2 * 1.6, cx + fw + ar2 * 1.3, ay2 - 10, cx + fw + .8, cy - 1); x.lineTo(cx + fw - .6, cy - 4); x.bezierCurveTo(cx + fw - 2, hlY + 3, cx + 6, hlY, cx, hlY); x.bezierCurveTo(cx - 6, hlY, cx - fw + 2, hlY + 3, cx - fw + .6, cy - 4); x.closePath(); };
      if (style === 'coils' || style === 'afro' || style === 'curly') { hairFill(mass, cx - 10, top - 10, cx + 12, cy); coilTex(mass, style === 'coils' ? 160 : 220, style === 'coils' ? .6 : 1); }
      if (style === 'fade') { /* handled below */ }
    } else if (style === 'fade') {
      var fd = function () { x.moveTo(cx - fw - .6, cy - 2); x.bezierCurveTo(cx - fw - 2, dome(4.5), cx + fw + 2, dome(4.5), cx + fw + .6, cy - 2); x.lineTo(cx + fw - .6, cy - 4); x.bezierCurveTo(cx + fw - 2, top + 8, cx + 6, top + 5, cx, top + 5); x.bezierCurveTo(cx - 6, top + 5, cx - fw + 2, top + 8, cx - fw + .6, cy - 4); x.closePath(); };
      hairFill(fd, cx, top - 4, cx, cy); x.save(); x.beginPath(); fd(); x.clip(); softEll(3, rgba(sk.base, .55), cx - fw, cy - 5, 4, 7); softEll(3, rgba(sk.shade, .55), cx + fw, cy - 5, 4, 7); x.restore(); coilTex(fd, 160, .5);
    } else if (fem && (style === 'bun' || style === 'pony')) {
      var hlb = top + 4.5, dc2 = dome(3.2);
      var cap = function () { x.moveTo(cx - fw - 1.2, cy - 1); x.bezierCurveTo(cx - fw - 2, dc2, cx + fw + 2, dc2, cx + fw + 1.2, cy - 1); x.bezierCurveTo(cx + fw - 2, hlb + 5, cx + 7, hlb, cx, hlb); x.bezierCurveTo(cx - 7, hlb, cx - fw + 2, hlb + 5, cx - fw - 1.2, cy - 1); x.closePath(); };
      if (style === 'bun') hairFill(function () { ell(cx + 1, top - 6.5, 7.5, 6.5); }, cx - 6, top - 13, cx + 7, top);
      hairFill(cap, cx - 14, top - 4, cx + 14, cy);
      flow(cap, 18, 16, cx + sp * 3, top - 2, 3.6);
      if (style === 'bun') { x.save(); x.beginPath(); ell(cx + 1, top - 6.5, 7.5, 6.5); x.clip(); x.strokeStyle = rgba(hl.dark, .5); x.lineWidth = .5; for (var k = 0; k < 6; k++) { x.beginPath(); x.arc(cx + 1, top - 6.5, 2 + k, 3.5, 5.8); x.stroke(); } x.restore(); }
    } else if (fem || style === 'long') {
      // parted hair framing the face; long styles continue over the shoulders
      var px = cx + sp * 4.5, pt = top + 3.2, dcf = dome(5), yb = longH ? cy + ln * .82 : style === 'bob' ? chin + 1 : style === 'pixie' || style === 'short' ? cy + 2 : cy + 10;
      var inset = style === 'pixie' || style === 'short' ? 0 : 1;
      var front = function () {
        x.moveTo(cx - fw - 3.5, yb);
        x.bezierCurveTo(cx - fw - 6.5, cy - 4, cx - fw - 4, dcf + 5, cx, dcf + 4.2);
        x.bezierCurveTo(cx + fw + 4, dcf + 5, cx + fw + 6.5, cy - 4, cx + fw + 3.5, yb);
        if (longH) x.lineTo(cx + fw - 1.5, yb - 2); else x.lineTo(cx + fw - .2, yb);
        x.bezierCurveTo(cx + fw * (inset ? .98 : 1.01), cy + 2, cx + fw - (sp > 0 ? 1 : 3), pt + 8, px, pt);
        x.bezierCurveTo(cx - fw * (sp > 0 ? .35 : .15), pt + (sp > 0 ? 8.5 : 5), cx - fw + (sp > 0 ? 3 : .5), cy - 9, cx - fw * (inset ? .98 : 1.01), cy + 2);
        if (longH) x.lineTo(cx - fw + 1.5, yb - 2); else x.lineTo(cx - fw + .2, yb);
        x.closePath();
      };
      if (style === 'pixie' || style === 'short') { var frg = function () { x.moveTo(px, pt); x.bezierCurveTo(cx - sp * 3, pt + 2, cx - sp * (fw - 3), top + 9, cx - sp * (fw + 1), cy - 5); x.lineTo(cx - sp * (fw - 1), cy - 7); x.bezierCurveTo(cx - sp * (fw - 5), top + 6, cx, top + 2, px, pt); x.closePath(); }; hairFill(front, cx - 16, top - 5, cx + 16, yb); hairFill(frg, cx - 10, top, cx + 10, cy); }
      else hairFill(front, cx - 16, top - 5, cx + 16, yb);
      flow(front, longH ? 34 : 22, longH ? ln * .9 : 22, px, pt - 1, 3);
      if (style === 'braids') { x.save(); x.beginPath(); front(); x.clip(); x.strokeStyle = rgba(hl.light, .4); x.lineWidth = .5; for (var bI = -3; bI <= 3; bI++) { if (!bI) continue; var bxx = cx + bI * (fw / 3.2); for (var bj = 0; bj < 14; bj++) { var yy2 = cy - 2 + bj * 3; if (Math.abs(bxx - cx) < fw - 1 && yy2 < chin) continue; x.beginPath(); x.moveTo(bxx - 1, yy2); x.lineTo(bxx + 1, yy2 + 1.5); x.stroke(); } } x.restore(); }
    } else {
      // short male cuts: crop, side part, quiff, buzz, short curls
      var th = style === 'buzz' ? 1.8 : style === 'crop' ? 3.4 : style === 'quiff' ? 6.5 : style === 'curlyS' ? 5 : 4.2, yh = top + (style === 'buzz' ? 4 : 5 + r() * 2.2);
      if (teen && style === 'side') { th = 5.5; yh = top + 8.5; }
      if (kid) { th = 4.2; yh = top + 7; }
      var dcs = dome(th);
      var cut = function () { x.moveTo(cx - fw - 1.3, cy - 1); x.bezierCurveTo(cx - fw - 2.2, dcs, cx + fw + 2.2, dcs, cx + fw + 1.3, cy - 1); x.lineTo(cx + fw - .9, cy - 3); x.bezierCurveTo(cx + fw - 2.4, yh + 4, cx + fw * .5, yh - (style === 'side' ? sp * 1.2 : 0), cx + sp * 3, yh); x.bezierCurveTo(cx - fw * .5, yh + .5, cx - fw + 2.4, yh + 4, cx - fw + .9, cy - 3); x.closePath(); };
      hairFill(cut, cx - 14, top - th, cx + 14, cy);
      if (style === 'quiff') hairFill(function () { x.moveTo(cx - fw * .55, yh + .5); x.bezierCurveTo(cx - fw * .35, top - th - 3.5, cx + fw * .55, top - th - 2.5, cx + fw * .6, yh); x.closePath(); }, cx, top - th - 3, cx, yh);
      if (style === 'curlyS') coilTex(cut, 150, .9); else if (style === 'buzz') { x.save(); x.beginPath(); cut(); x.clip(); x.fillStyle = rgba(sk.base, .35); x.fillRect(0, 0, 100, 100); x.restore(); }
      else flow(cut, 20, 12, cx + sp * 3, top - th + 1, 3.4);
    }
    // --- glasses
    if (glasses) {
      var gc = pick(['#151515', '#5a3a22', '#b8a27a', '#2b3440', '#7a2230']), rnd = r() < .5, gw = ew + 2.1, gh = eh + 3;
      [-1, 1].forEach(function (sd) {
        var gx = cx + sd * ex;
        softEll(1.2, 'rgba(0,0,0,.25)', gx, cy + gh * .9, gw * .8, .8);
        x.fillStyle = 'rgba(200,225,255,.07)'; x.strokeStyle = gc; x.lineWidth = .75;
        x.beginPath(); if (rnd) ell(gx, cy + .2, gw, gh * .78); else if (x.roundRect) x.roundRect(gx - gw, cy - gh * .7, gw * 2, gh * 1.5, 1.4); else x.rect(gx - gw, cy - gh * .7, gw * 2, gh * 1.5); x.fill(); x.stroke();
        x.save(); x.beginPath(); if (rnd) ell(gx, cy + .2, gw, gh * .78); else x.rect(gx - gw, cy - gh * .7, gw * 2, gh * 1.5); x.clip(); x.strokeStyle = 'rgba(255,255,255,.28)'; x.lineWidth = 1; x.beginPath(); x.moveTo(gx - gw * .7, cy + gh * .6); x.lineTo(gx + gw * .1, cy - gh); x.stroke(); x.restore();
        x.strokeStyle = gc; x.beginPath(); x.moveTo(gx + sd * gw, cy - .8); x.lineTo(cx + sd * fw * 1.01, cy - 1.5); x.stroke();
      });
      x.beginPath(); x.moveTo(cx - ex + gw, cy - .6); x.quadraticCurveTo(cx, cy - 2, cx + ex - gw, cy - .6); x.stroke();
    }
    x.restore();
    // --- light: a cool key from the upper left, lamp warmth from the right, vignette
    x.save(); x.globalCompositeOperation = 'soft-light';
    var kl = x.createLinearGradient(0, 0, 100, 100); kl.addColorStop(0, 'rgba(210,230,255,.35)'); kl.addColorStop(.55, 'rgba(128,128,128,0)'); kl.addColorStop(1, 'rgba(0,0,0,.35)');
    x.fillStyle = kl; x.fillRect(0, 0, 100, 100); x.restore();
    var vg = x.createRadialGradient(50, 46, 30, 50, 50, 74); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); x.fillStyle = vg; x.fillRect(0, 0, 100, 100);
    try { return cv.toDataURL('image/jpeg', .9); } catch (e) { return BLANK; }
  }

  function remember(k, url) { cache[k] = url; order.push(k); if (order.length > 700) delete cache[order.shift()]; }
  function pump() {
    pumping = true;
    requestAnimationFrame(function () {
      var t0 = performance.now();
      while (queue.length && performance.now() - t0 < 12) {
        var job = queue.shift(); delete queued[job.k];
        var url = cache[job.k] || paint(job.o); if (!cache[job.k]) remember(job.k, url);
        var els = document.querySelectorAll('img[data-pk="' + job.k.replace(/"/g, '') + '"]');
        for (var i = 0; i < els.length; i++) { els[i].src = url; els[i].removeAttribute('data-pk'); }
      }
      if (queue.length) pump(); else pumping = false;
    });
  }
  /** markup for a portrait (an <img>); painted now if cached, else on the next frames */
  function svg(o) {
    o = o || {}; if (o.pid === undefined || o.pid === null) o = Object.assign({}, o, { pid: 'anon' });
    var k = keyOf(o);
    if (cache[k]) return '<img class="portrait" alt="" src="' + cache[k] + '">';
    if (!queued[k]) { queued[k] = 1; queue.push({ k: k, o: o }); if (!pumping) pump(); }
    return '<img class="portrait pending" alt="" data-pk="' + UIesc(k).replace(/"/g, '') + '" src="' + BLANK + '">';
  }
  return { svg: svg, paint: paint };
})();
