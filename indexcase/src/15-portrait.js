/* INDEX CASE UI — 15-portrait.js: illustrated portraits, generated from the
 * person's id, age, sex and heritage. Painted in soft gradients (no SVG filters,
 * so a long line list stays cheap): a cool key light from the upper left, a warm
 * rim from the incident room's lamps on the right, a dark jewel-toned backdrop. */
var UIPortrait = (function () {
  // skin: base, shade, light
  var SKIN = [['#f4d7c3', '#dcb094', '#fff0e3'], ['#edc9aa', '#cf9f7b', '#fbe1cb'], ['#dfae88', '#bb835d', '#f1c9a7'], ['#c7916a', '#9f6a45', '#dcae88'],
    ['#a8714b', '#7c4d2f', '#c38c63'], ['#8a5737', '#613a22', '#a6714d'], ['#6b4129', '#482917', '#87573a'], ['#f0cdb2', '#d3a483', '#fce5d2']];
  var HAIR = ['#1a1411', '#2c1f17', '#47301f', '#6a472b', '#8d6841', '#b58a57', '#caa46a', '#3b2a21', '#0e0d0d', '#743c20', '#9a4a26'];
  var CLOTH = ['#2f4a63', '#5a3a4f', '#3d5a4b', '#6b5236', '#2c3548', '#7b3d33', '#465470', '#4f6c72', '#3a3e59', '#6c6a5c', '#8a6a3a', '#1f2a36', '#5b6b3f', '#7a2f3f'];
  var BG = [['#274257', '#0b1620'], ['#3a3050', '#110f1c'], ['#284440', '#0b1716'], ['#43332d', '#150f0d'], ['#2c3a57', '#0c1220'], ['#3d4636', '#11140f'], ['#472f3a', '#170d12']];
  var IRIS = ['#3b2616', '#4d321c', '#2a1b12', '#5a6b3a', '#4b6a8a', '#6b7f95', '#6a4b2a'];
  function hex(c) { c = c.replace('#', ''); return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; }
  function mix(a, b, t) { var x = hex(a), y = hex(b); return '#' + [0, 1, 2].map(function (i) { return Math.round(x[i] + (y[i] - x[i]) * t).toString(16).padStart(2, '0'); }).join(''); }
  function f(n) { return (+n).toFixed(1); }
  function P(o) {
    var r = UIrand('face:' + o.pid), id = 'q' + UIh(o.pid).toString(36);
    var age = o.age === null || o.age === undefined ? 40 : o.age, fem = /^f/i.test(o.sex || '') ? 1 : /^m/i.test(o.sex || '') ? 0 : (r() < .5 ? 1 : 0);
    var her = o.heritage || (typeof UIA !== 'undefined' && UIA.heritageOf ? UIA.heritageOf(o.pid) : null);
    var SK = { light: [0, 1, 7, 1], south: [2, 3, 3, 4], dark: [4, 5, 6, 5], east: [0, 7, 1, 7] };
    var grp = !her ? null : /british|irish|polish|romanian/.test(her) ? 'light' : /pakistani|bangladeshi|indian|sikh|southern/.test(her) ? 'south' : /caribbean|african|somali/.test(her) ? 'dark' : /chinese/.test(her) ? 'east' : null;
    var sk = SKIN[grp ? SK[grp][Math.floor(r() * 4)] : Math.floor(r() * SKIN.length)];
    var darkSkin = SKIN.indexOf(sk) >= 4 && SKIN.indexOf(sk) <= 6;
    var hairC = grp && grp !== 'light' ? HAIR[[0, 1, 8, 7][Math.floor(r() * 4)]] : HAIR[Math.floor(r() * HAIR.length)];
    var cl = CLOTH[Math.floor(r() * CLOTH.length)], bg = BG[Math.floor(r() * BG.length)];
    var iris = grp && grp !== 'light' ? IRIS[Math.floor(r() * 3)] : IRIS[Math.floor(r() * IRIS.length)];
    if (age > 64) hairC = r() < .55 ? '#d2cec8' : '#a29c93'; else if (age > 50 && r() < .45) hairC = mix(hairC, '#b9b3aa', .55);
    var kid = age < 13, teen = age >= 13 && age < 20, old = age > 62;
    var cx = 60, cy = kid ? 58 : 54, fw = kid ? 21.5 : (fem ? 19.5 : 21) + r() * 2.2, fh = kid ? 25 : (fem ? 26 : 27.5) + r() * 2.2;
    var jaw = fem || kid ? .66 : .76 + r() * .08;
    var style = Math.floor(r() * 6);
    var covered = fem && !kid && r() < (her === 'somali' ? .8 : /pakistani|bangladeshi/.test(her || '') ? .45 : her ? .03 : .1);
    var turban = !fem && !kid && her === 'sikh' && r() < .6;
    var bald = !fem && age > 42 && r() < (age > 60 ? .45 : .3);
    var glasses = age > 44 ? r() < .5 : r() < .14, beard = !fem && !kid && !teen && r() < (turban ? .9 : .32), stub = !fem && !kid && !beard && age > 17 && r() < .3;
    var skD = sk[1], skL = sk[2], lip = mix(sk[1], darkSkin ? '#5a2a26' : '#b0514c', .45);
    var hairD = mix(hairC, '#000000', .35), hairL = mix(hairC, '#ffffff', hairC === '#0e0d0d' || hairC === '#1a1411' ? .16 : .24);
    var s = '<svg viewBox="0 0 120 120" class="portrait" aria-hidden="true"><defs>' +
      '<radialGradient id="' + id + 'b" cx=".3" cy=".25" r="1"><stop offset="0" stop-color="' + bg[0] + '"/><stop offset=".75" stop-color="' + bg[1] + '"/></radialGradient>' +
      '<radialGradient id="' + id + 'k" cx=".36" cy=".32" r=".78"><stop offset="0" stop-color="' + skL + '"/><stop offset=".45" stop-color="' + sk[0] + '"/><stop offset="1" stop-color="' + skD + '"/></radialGradient>' +
      '<linearGradient id="' + id + 'n" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + mix(skD, '#000000', .25) + '"/><stop offset=".5" stop-color="' + skD + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'h" x1=".2" x2=".8" y1="0" y2="1"><stop offset="0" stop-color="' + hairL + '"/><stop offset=".35" stop-color="' + hairC + '"/><stop offset="1" stop-color="' + hairD + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'c" x1="0" x2="1" y1="0" y2=".4"><stop offset="0" stop-color="' + mix(cl, '#ffffff', .18) + '"/><stop offset=".6" stop-color="' + cl + '"/><stop offset="1" stop-color="' + mix(cl, '#000000', .45) + '"/></linearGradient>' +
      '<radialGradient id="' + id + 'r" cx="1.05" cy=".45" r=".7"><stop offset="0" stop-color="#ff9a5c" stop-opacity=".5"/><stop offset="1" stop-color="#ff9a5c" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="' + id + 'v" cx=".5" cy=".45" r=".72"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>' +
      '<clipPath id="' + id + 'x"><rect width="120" height="120" rx="18"/></clipPath></defs><g clip-path="url(#' + id + 'x)">' +
      '<rect width="120" height="120" fill="url(#' + id + 'b)"/>' +
      '<circle cx="' + f(18 + r() * 30) + '" cy="' + f(16 + r() * 24) + '" r="' + f(22 + r() * 16) + '" fill="#cfe4ff" opacity=".06"/><circle cx="' + f(92 + r() * 16) + '" cy="' + f(22 + r() * 30) + '" r="' + f(6 + r() * 8) + '" fill="#ffd2b0" opacity=".07"/><g transform="translate(60 ' + (kid ? 63 : 67) + ') scale(' + (kid ? 1.2 : 1.3) + ') translate(-60 -60)">';
    var top = cy - fh, chin = cy + fh;
    // hair behind the head
    var longHair = !covered && !turban && fem && (style <= 2 || (teen && style < 4));
    var ln = style === 1 ? 44 : style === 2 ? 30 : 52, wv = style === 1 ? 5 : 0;
    if (longHair) {
      s += '<path d="M' + f(cx - fw - 6) + ',' + f(cy - 8) + 'C' + f(cx - fw - 10) + ',' + f(cy + ln * .5) + ' ' + f(cx - fw - 9 - wv) + ',' + f(cy + ln * .85) + ' ' + f(cx - fw) + ',' + f(cy + ln) + 'Q' + cx + ',' + f(cy + ln + 5) + ' ' + f(cx + fw) + ',' + f(cy + ln) + 'C' + f(cx + fw + 9 + wv) + ',' + f(cy + ln * .85) + ' ' + f(cx + fw + 10) + ',' + f(cy + ln * .5) + ' ' + f(cx + fw + 6) + ',' + f(cy - 8) + 'Z" fill="url(#' + id + 'h)"/>';
      s += '<path d="M' + f(cx - fw + 2) + ',' + f(cy + ln) + 'Q' + cx + ',' + f(cy + ln + 4) + ' ' + f(cx + fw - 2) + ',' + f(cy + ln) + 'L' + f(cx + fw - 4) + ',' + f(cy + 6) + 'L' + f(cx - fw + 4) + ',' + f(cy + 6) + 'Z" fill="#000" opacity=".35"/>';
    }
    if (covered) {
      var sc = mix(CLOTH[(CLOTH.indexOf(cl) + 5) % CLOTH.length], '#ffffff', .08);
      s += '<path d="M' + f(cx - fw - 10) + ',' + f(cy + 6) + 'C' + f(cx - fw - 12) + ',' + f(top - 16) + ' ' + f(cx + fw + 12) + ',' + f(top - 16) + ' ' + f(cx + fw + 10) + ',' + f(cy + 6) + 'C' + f(cx + fw + 14) + ',' + f(chin + 14) + ' ' + f(cx + fw + 26) + ',' + 118 + ' ' + f(cx + fw + 30) + ',124L' + f(cx - fw - 30) + ',124C' + f(cx - fw - 26) + ',118 ' + f(cx - fw - 14) + ',' + f(chin + 14) + ' ' + f(cx - fw - 10) + ',' + f(cy + 6) + 'Z" fill="' + sc + '"/>';
      s += '<path d="M' + f(cx - fw - 10) + ',' + f(cy + 6) + 'C' + f(cx - fw - 12) + ',' + f(top - 16) + ' ' + f(cx + fw + 12) + ',' + f(top - 16) + ' ' + f(cx + fw + 10) + ',' + f(cy + 6) + '" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="2"/>';
    }
    // shoulders and clothing
    var sw = kid ? 36 : fem ? 44 + r() * 4 : 48 + r() * 5, nb = chin + (kid ? 5 : 7), cut = Math.floor(r() * 5);
    if (!covered) {
      s += '<path d="M' + f(cx - sw) + ',124C' + f(cx - sw) + ',' + f(nb + 16) + ' ' + f(cx - sw * .55) + ',' + f(nb + 3) + ' ' + f(cx - 11) + ',' + f(nb) + 'L' + f(cx + 11) + ',' + f(nb) + 'C' + f(cx + sw * .55) + ',' + f(nb + 3) + ' ' + f(cx + sw) + ',' + f(nb + 16) + ' ' + f(cx + sw) + ',124Z" fill="url(#' + id + 'c)"/>';
    } else {
      s += '<path d="M' + f(cx - sw) + ',124C' + f(cx - sw) + ',' + f(nb + 18) + ' ' + f(cx - sw * .5) + ',' + f(nb + 8) + ' ' + f(cx - 16) + ',' + f(nb + 8) + 'L' + f(cx + 16) + ',' + f(nb + 8) + 'C' + f(cx + sw * .5) + ',' + f(nb + 8) + ' ' + f(cx + sw) + ',' + f(nb + 18) + ' ' + f(cx + sw) + ',124Z" fill="url(#' + id + 'c)" opacity=".9"/>';
    }
    // neck
    if (!covered) {
      s += '<path d="M' + f(cx - 8.5) + ',' + f(chin - 10) + 'L' + f(cx - 9.5) + ',' + f(nb + 2) + 'C' + f(cx - 4) + ',' + f(nb + 7) + ' ' + f(cx + 4) + ',' + f(nb + 7) + ' ' + f(cx + 9.5) + ',' + f(nb + 2) + 'L' + f(cx + 8.5) + ',' + f(chin - 10) + 'Z" fill="url(#' + id + 'n)"/>';
      // necklines
      if (kid || cut === 0) s += '<path d="M' + f(cx - 12) + ',' + f(nb) + 'C' + f(cx - 6) + ',' + f(nb + 7) + ' ' + f(cx + 6) + ',' + f(nb + 7) + ' ' + f(cx + 12) + ',' + f(nb) + '" fill="none" stroke="' + mix(cl, '#000000', .35) + '" stroke-width="2.4"/>';
      else if (cut === 1) s += '<path d="M' + f(cx - 12) + ',' + f(nb - 1) + 'L' + f(cx - 3) + ',' + f(nb + 11) + 'L' + f(cx - 7) + ',' + f(nb + 13) + 'Z M' + f(cx + 12) + ',' + f(nb - 1) + 'L' + f(cx + 3) + ',' + f(nb + 11) + 'L' + f(cx + 7) + ',' + f(nb + 13) + 'Z" fill="#e9e4dc"/>';
      else if (cut === 2) s += '<path d="M' + f(cx - 11) + ',' + f(nb) + 'L' + cx + ',' + f(nb + 16) + 'L' + f(cx + 11) + ',' + f(nb) + '" fill="' + mix(sk[0], skD, .5) + '"/><path d="M' + f(cx - 14) + ',' + f(nb - 1) + 'L' + cx + ',' + f(nb + 18) + 'L' + f(cx + 14) + ',' + f(nb - 1) + '" fill="none" stroke="' + mix(cl, '#000000', .3) + '" stroke-width="2.2"/>';
      else if (cut === 3) s += '<path d="M' + f(cx - 10) + ',' + f(nb) + 'L' + cx + ',' + f(nb + 20) + 'L' + f(cx + 10) + ',' + f(nb) + 'Z" fill="#dcd6cc"/><path d="M' + f(cx - 20) + ',' + f(nb + 1) + 'L' + f(cx - 3) + ',' + f(nb + 26) + 'L' + f(cx - 10) + ',124M' + f(cx + 20) + ',' + f(nb + 1) + 'L' + f(cx + 3) + ',' + f(nb + 26) + 'L' + f(cx + 10) + ',124" fill="none" stroke="' + mix(cl, '#000000', .45) + '" stroke-width="1.6"/>';
      else s += '<path d="M' + f(cx - 16) + ',' + f(nb - 1) + 'C' + f(cx - 12) + ',' + f(nb + 9) + ' ' + f(cx + 12) + ',' + f(nb + 9) + ' ' + f(cx + 16) + ',' + f(nb - 1) + 'C' + f(cx + 10) + ',' + f(nb + 4) + ' ' + f(cx - 10) + ',' + f(nb + 4) + ' ' + f(cx - 16) + ',' + f(nb - 1) + 'Z" fill="' + mix(cl, '#000000', .35) + '"/>';
    }
    if (longHair) [-1, 1].forEach(function (sd) {
      var e = ln * (sd < 0 ? .95 : .85);
      s += '<path d="M' + f(cx + sd * (fw - 1)) + ',' + f(cy - 8) + 'C' + f(cx + sd * (fw + 6)) + ',' + f(cy + 4) + ' ' + f(cx + sd * (fw + 8 + wv)) + ',' + f(cy + e * .6) + ' ' + f(cx + sd * (fw + 5 + wv)) + ',' + f(cy + e) + 'Q' + f(cx + sd * (fw + 1)) + ',' + f(cy + e - 1) + ' ' + f(cx + sd * (fw - 3)) + ',' + f(cy + e * .88) + 'C' + f(cx + sd * (fw - 1)) + ',' + f(cy + e * .5) + ' ' + f(cx + sd * (fw - 2)) + ',' + f(cy + 10) + ' ' + f(cx + sd * (fw - 5)) + ',' + f(cy) + 'Z" fill="url(#' + id + 'h)"/>';
      s += '<path d="M' + f(cx + sd * (fw + 1)) + ',' + f(cy - 2) + 'C' + f(cx + sd * (fw + 5)) + ',' + f(cy + 8) + ' ' + f(cx + sd * (fw + 5 + wv)) + ',' + f(cy + e * .55) + ' ' + f(cx + sd * (fw + 3 + wv)) + ',' + f(cy + e * .9) + '" fill="none" stroke="' + hairL + '" stroke-opacity=".3" stroke-width="1.1"/>';
    });
    // ears
    if (!covered) {
      s += '<ellipse cx="' + f(cx - fw + .5) + '" cy="' + f(cy + 3) + '" rx="3.6" ry="6.2" fill="' + sk[0] + '"/><ellipse cx="' + f(cx + fw - .5) + '" cy="' + f(cy + 3) + '" rx="3.6" ry="6.2" fill="' + skD + '"/>';
      s += '<path d="M' + f(cx - fw - 1) + ',' + f(cy) + 'q1.6,3 .4,6" fill="none" stroke="' + skD + '" stroke-width="1" opacity=".7"/>';
    }
    // head
    var head = 'M' + f(cx - fw) + ',' + f(cy - 3) + 'C' + f(cx - fw) + ',' + f(top - 1) + ' ' + f(cx + fw) + ',' + f(top - 1) + ' ' + f(cx + fw) + ',' + f(cy - 3) +
      'C' + f(cx + fw) + ',' + f(cy + fh * .42) + ' ' + f(cx + fw * jaw) + ',' + f(chin - 3) + ' ' + cx + ',' + f(chin) + 'C' + f(cx - fw * jaw) + ',' + f(chin - 3) + ' ' + f(cx - fw) + ',' + f(cy + fh * .42) + ' ' + f(cx - fw) + ',' + f(cy - 3) + 'Z';
    s += '<path d="' + head + '" fill="url(#' + id + 'k)"/>';
    var crown = cy - 1.5 - .75 * fh;
    // form shadow down the right cheek, warm rim light on its edge
    s += '<path d="M' + f(cx + fw * .45) + ',' + f(top + 3) + 'C' + f(cx + fw * 1.05) + ',' + f(cy - 6) + ' ' + f(cx + fw * .9) + ',' + f(cy + fh * .6) + ' ' + f(cx + 2) + ',' + f(chin - .5) + 'C' + f(cx + fw * .62) + ',' + f(cy + fh * .45) + ' ' + f(cx + fw * .72) + ',' + f(cy) + ' ' + f(cx + fw * .45) + ',' + f(top + 3) + 'Z" fill="' + skD + '" opacity=".45"/>';
    s += '<path d="M' + f(cx + fw - .6) + ',' + f(cy - 8) + 'C' + f(cx + fw - .4) + ',' + f(cy + fh * .35) + ' ' + f(cx + fw * .8) + ',' + f(cy + fh * .72) + ' ' + f(cx + fw * .42) + ',' + f(chin - 5) + '" fill="none" stroke="#ffb489" stroke-opacity=".55" stroke-width="1.4" stroke-linecap="round"/>';
    // cheeks, chin light
    s += '<ellipse cx="' + f(cx - fw * .55) + '" cy="' + f(cy + 9) + '" rx="5.5" ry="3.4" fill="#e0706a" opacity="' + (darkSkin ? .1 : .17) + '"/><ellipse cx="' + f(cx + fw * .55) + '" cy="' + f(cy + 9) + '" rx="5" ry="3" fill="#e0706a" opacity="' + (darkSkin ? .06 : .1) + '"/>';
    s += '<ellipse cx="' + f(cx - 2) + '" cy="' + f(chin - 5) + '" rx="4.5" ry="2" fill="' + skL + '" opacity=".35"/>';
    // age
    if (age > 48) s += '<path d="M' + f(cx - 7) + ',' + f(cy + 9) + 'c-2.2,3 -2.6,6 -1,9M' + f(cx + 7) + ',' + f(cy + 9) + 'c2.2,3 2.6,6 1,9" stroke="' + skD + '" stroke-width="1" fill="none" opacity=".75" stroke-linecap="round"/>';
    if (old) s += '<path d="M' + f(cx - 9) + ',' + f(top + 8) + 'q9,-2.5 18,0M' + f(cx - 7) + ',' + f(top + 11.5) + 'q7,-2 14,0" stroke="' + skD + '" stroke-width=".9" fill="none" opacity=".6"/>';
    // stubble / beard / moustache
    var bpath = 'M' + f(cx - fw + 1.5) + ',' + f(cy + 1) + 'C' + f(cx - fw + 1) + ',' + f(cy + fh * .6) + ' ' + f(cx - fw * .5) + ',' + f(chin + 3) + ' ' + cx + ',' + f(chin + 3.5) + 'C' + f(cx + fw * .5) + ',' + f(chin + 3) + ' ' + f(cx + fw - 1) + ',' + f(cy + fh * .6) + ' ' + f(cx + fw - 1.5) + ',' + f(cy + 1) + 'C' + f(cx + fw * .6) + ',' + f(cy + 9) + ' ' + f(cx + 6) + ',' + f(cy + 12) + ' ' + cx + ',' + f(cy + 11.5) + 'C' + f(cx - 6) + ',' + f(cy + 12) + ' ' + f(cx - fw * .6) + ',' + f(cy + 9) + ' ' + f(cx - fw + 1.5) + ',' + f(cy + 1) + 'Z';
    if (beard) s += '<path d="' + bpath + '" fill="url(#' + id + 'h)" opacity=".95"/><path d="M' + f(cx - 4.6) + ',' + f(cy + 17.2) + 'Q' + cx + ',' + f(cy + 16) + ' ' + f(cx + 4.6) + ',' + f(cy + 17.2) + 'Q' + cx + ',' + f(cy + 19.4) + ' ' + f(cx - 4.6) + ',' + f(cy + 17.2) + 'Z" fill="' + lip + '" opacity=".85"/>';
    else if (stub) s += '<path d="' + bpath + '" fill="' + hairC + '" opacity=".22"/>';
    // eyes
    var ey = cy + 1.5, ex = kid ? 8.2 : 8.4, ew = kid ? 3.6 : 3.3, eh = kid ? 2.3 : old ? 1.5 : 1.9;
    [-1, 1].forEach(function (sd) {
      var x = cx + sd * ex;
      s += '<path d="M' + f(x - ew) + ',' + f(ey) + 'Q' + f(x) + ',' + f(ey - eh * 1.5) + ' ' + f(x + ew) + ',' + f(ey) + 'Q' + f(x) + ',' + f(ey + eh * 1.15) + ' ' + f(x - ew) + ',' + f(ey) + 'Z" fill="#f1ebe4" opacity=".92"/>';
      s += '<circle cx="' + f(x + .3) + '" cy="' + f(ey - .1) + '" r="' + f(kid ? 2 : 1.75) + '" fill="' + iris + '"/><circle cx="' + f(x + .3) + '" cy="' + f(ey - .1) + '" r=".85" fill="#0c0806"/><circle cx="' + f(x - .3) + '" cy="' + f(ey - .8) + '" r=".55" fill="#fff"/>';
      s += '<path d="M' + f(x - ew - .4) + ',' + f(ey + .2) + 'Q' + f(x) + ',' + f(ey - eh * 1.6) + ' ' + f(x + ew + .3) + ',' + f(ey - .2) + '" fill="none" stroke="#21150f" stroke-width="' + (fem ? 1.3 : 1.05) + '" stroke-linecap="round"/>';
      s += '<path d="M' + f(x - ew + .4) + ',' + f(ey - eh * 1.6 - 1.2) + 'Q' + f(x) + ',' + f(ey - eh * 2.3 - 1.2) + ' ' + f(x + ew - .2) + ',' + f(ey - eh * 1.4 - 1) + '" fill="none" stroke="' + skD + '" stroke-width=".8" opacity=".7"/>';
      if (age > 40) s += '<path d="M' + f(x - ew * .8) + ',' + f(ey + eh + 1.2) + 'q' + f(ew * .8) + ',1.2 ' + f(ew * 1.6) + ',0" fill="none" stroke="' + skD + '" stroke-width=".7" opacity=".65"/>';
    });
    // brows
    var bc = covered || bald ? mix(hairC === '#d2cec8' || hairC === '#a29c93' ? '#8a847c' : hairC, '#2a1f18', .3) : mix(hairC, '#1d1510', .25), bt = (r() - .5) * 1.6, bth = fem ? 1.3 : 2;
    [-1, 1].forEach(function (sd) {
      var x = cx + sd * ex, y = ey - 5.6 + (sd < 0 ? bt : -bt * .4);
      s += '<path d="M' + f(x - sd * 4.6) + ',' + f(y + 1.1) + 'Q' + f(x - sd * .5) + ',' + f(y - 1.6) + ' ' + f(x + sd * 4.4) + ',' + f(y + .3) + 'Q' + f(x) + ',' + f(y - 1.6 + bth) + ' ' + f(x - sd * 4.6) + ',' + f(y + 1.1) + 'Z" fill="' + bc + '"/>';
    });
    // nose: shadow plane and tip light rather than a line
    var nl = kid ? 6 : 8.5 + r() * 1.5, nw = kid ? 2.4 : fem ? 2.9 : 3.5;
    s += '<path d="M' + f(cx + .6) + ',' + f(ey + 1) + 'C' + f(cx + 2) + ',' + f(ey + nl * .5) + ' ' + f(cx + nw + .6) + ',' + f(ey + nl - 1) + ' ' + f(cx + nw * .5) + ',' + f(ey + nl + .6) + 'L' + f(cx + .5) + ',' + f(ey + nl) + 'Z" fill="' + skD + '" opacity=".55"/>';
    s += '<path d="M' + f(cx - nw) + ',' + f(ey + nl) + 'Q' + f(cx) + ',' + f(ey + nl + 2.4) + ' ' + f(cx + nw) + ',' + f(ey + nl) + '" fill="none" stroke="' + mix(skD, '#3a1f14', .35) + '" stroke-width="1.05" stroke-linecap="round" opacity=".85"/>';
    s += '<ellipse cx="' + f(cx - .6) + '" cy="' + f(ey + nl - 1.4) + '" rx="1.4" ry="1" fill="' + skL + '" opacity=".55"/>';
    // mouth
    var my = ey + nl + (kid ? 5.2 : 6.6), mw = (kid ? 4.2 : fem ? 5.4 : 5.8) + r() * 1.2, mood = r(), up = mood < .4 ? 1.2 : mood < .8 ? .2 : -.5;
    if (!beard) {
      s += '<path d="M' + f(cx - mw) + ',' + f(my) + 'Q' + f(cx - mw * .45) + ',' + f(my - 1.7) + ' ' + cx + ',' + f(my - .9) + 'Q' + f(cx + mw * .45) + ',' + f(my - 1.7) + ' ' + f(cx + mw) + ',' + f(my) + 'Q' + cx + ',' + f(my + up * .6) + ' ' + f(cx - mw) + ',' + f(my) + 'Z" fill="' + mix(lip, '#000000', .12) + '"/>';
      s += '<path d="M' + f(cx - mw + .6) + ',' + f(my + .1) + 'Q' + cx + ',' + f(my + (fem ? 3.6 : 2.8) + up * .5) + ' ' + f(cx + mw - .6) + ',' + f(my + .1) + 'Q' + cx + ',' + f(my + up * .6 + .3) + ' ' + f(cx - mw + .6) + ',' + f(my + .1) + 'Z" fill="' + mix(lip, '#ffffff', fem ? .12 : .05) + '"/>';
      s += '<path d="M' + f(cx - mw) + ',' + f(my) + 'Q' + cx + ',' + f(my + up * .6) + ' ' + f(cx + mw) + ',' + f(my) + '" fill="none" stroke="' + mix(lip, '#200a06', .55) + '" stroke-width=".9" stroke-linecap="round"/>';
      s += '<ellipse cx="' + f(cx - 1) + '" cy="' + f(my + 2) + '" rx="1.8" ry=".6" fill="#fff" opacity=".18"/>';
    }
    if (!beard && !fem && !kid && r() < .12) s += '<path d="M' + f(cx - mw - .5) + ',' + f(my - 1.2) + 'Q' + cx + ',' + f(my - 5) + ' ' + f(cx + mw + .5) + ',' + f(my - 1.2) + 'Q' + cx + ',' + f(my - 2.4) + ' ' + f(cx - mw - .5) + ',' + f(my - 1.2) + 'Z" fill="' + hairC + '"/>';
    // glasses
    if (glasses) {
      var gc = ['#141414', '#5a3a22', '#b8a27a', '#2b3440'][Math.floor(r() * 4)], gr = r() < .5 ? 3.2 : 1.2;
      s += '<g fill="none" stroke="' + gc + '" stroke-width="1.25"><rect x="' + f(cx - ex - 5.6) + '" y="' + f(ey - 4.2) + '" width="11.2" height="8.4" rx="' + gr + '"/><rect x="' + f(cx + ex - 5.6) + '" y="' + f(ey - 4.2) + '" width="11.2" height="8.4" rx="' + gr + '"/><path d="M' + f(cx - ex + 5.6) + ',' + f(ey - 1) + 'q' + f(ex - 5.6) + ',-1.6 ' + f(2 * (ex - 5.6)) + ',0M' + f(cx - ex - 5.6) + ',' + f(ey - 1.5) + 'L' + f(cx - fw + .5) + ',' + f(ey - 2.5) + 'M' + f(cx + ex + 5.6) + ',' + f(ey - 1.5) + 'L' + f(cx + fw - .5) + ',' + f(ey - 2.5) + '"/></g>';
      s += '<path d="M' + f(cx - ex - 3.5) + ',' + f(ey + 3) + 'l5,-6M' + f(cx + ex - 3.5) + ',' + f(ey + 3) + 'l5,-6" stroke="#fff" stroke-width="1.2" opacity=".16"/>';
    }
    // hair in front / headwear
    if (turban) {
      var tc = ['#1f3f7a', '#7a1f2b', '#d99a22', '#efe9dd', '#2d5b3a', '#1c1c24', '#c2562c'][Math.floor(r() * 7)];
      s += '<path d="M' + f(cx - fw - 3.5) + ',' + f(cy - 2) + 'C' + f(cx - fw - 6) + ',' + f(top - 20) + ' ' + f(cx + fw + 6) + ',' + f(top - 20) + ' ' + f(cx + fw + 3.5) + ',' + f(cy - 2) + 'C' + f(cx + fw * .5) + ',' + f(top + 8) + ' ' + f(cx - fw * .5) + ',' + f(top + 8) + ' ' + f(cx - fw - 3.5) + ',' + f(cy - 2) + 'Z" fill="' + tc + '"/>';
      s += '<path d="M' + f(cx - fw - 2) + ',' + f(top + 6) + 'C' + f(cx - 6) + ',' + f(top - 10) + ' ' + f(cx + 10) + ',' + f(top - 8) + ' ' + f(cx + fw + 2) + ',' + f(top + 3) + 'M' + f(cx - fw - 1) + ',' + f(top - 1) + 'C' + f(cx) + ',' + f(top - 14) + ' ' + f(cx + 8) + ',' + f(top - 12) + ' ' + f(cx + fw + 1) + ',' + f(top - 4) + '" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="1.6"/>';
      s += '<path d="M' + f(cx - fw - 3) + ',' + f(cy - 4) + 'C' + f(cx - fw - 5) + ',' + f(top - 16) + ' ' + f(cx - 4) + ',' + f(top - 18) + ' ' + f(cx + 4) + ',' + f(top - 17) + '" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>';
    } else if (covered) {
      var sc2 = mix(CLOTH[(CLOTH.indexOf(cl) + 5) % CLOTH.length], '#ffffff', .12);
      s += '<path d="M' + f(cx - fw - 5) + ',' + f(cy + 4) + 'C' + f(cx - fw - 6) + ',' + f(top - 10) + ' ' + f(cx + fw + 6) + ',' + f(top - 10) + ' ' + f(cx + fw + 5) + ',' + f(cy + 4) + 'C' + f(cx + fw + 2) + ',' + f(top + 4) + ' ' + f(cx - fw - 2) + ',' + f(top + 4) + ' ' + f(cx - fw - 5) + ',' + f(cy + 4) + 'Z" fill="' + sc2 + '"/>';
      s += '<path d="M' + f(cx - fw - 3) + ',' + f(cy + 4) + 'C' + f(cx - fw - 2) + ',' + f(top + 2) + ' ' + f(cx + fw + 2) + ',' + f(top + 2) + ' ' + f(cx + fw + 3) + ',' + f(cy + 4) + '" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="1.5"/>';
    } else if (bald) {
      s += '<path d="M' + f(cx - fw - .8) + ',' + f(cy + 2) + 'C' + f(cx - fw - 1.5) + ',' + f(cy - 8) + ' ' + f(cx - fw + 1) + ',' + f(cy - 14) + ' ' + f(cx - fw + 4) + ',' + f(cy - 16) + 'L' + f(cx - fw + 3) + ',' + f(cy - 2) + 'Z M' + f(cx + fw + .8) + ',' + f(cy + 2) + 'C' + f(cx + fw + 1.5) + ',' + f(cy - 8) + ' ' + f(cx + fw - 1) + ',' + f(cy - 14) + ' ' + f(cx + fw - 4) + ',' + f(cy - 16) + 'L' + f(cx + fw - 3) + ',' + f(cy - 2) + 'Z" fill="url(#' + id + 'h)"/>';
      s += '<ellipse cx="' + f(cx - 5) + '" cy="' + f(top + 6) + '" rx="8" ry="3.5" fill="#fff" opacity=".13"/>';
    } else {
      var H = 'url(#' + id + 'h)';
      var curly = (fem && style === 5) || (!fem && style === 4) || (grp === 'dark' && r() < .55);
      function dome(th) { return (cy - 2) + (crown - th - (cy - 2)) / .75; }
      if (curly) {
        var n = fem ? 14 : 12, cr = fem ? 7.5 : 4.6, rxx = fw + (fem ? 4.5 : 1.5), ryy = cy - 3 - (crown - (fem ? 5 : 2.5)), a0 = fem ? .9 : 1.02, a1 = fem ? 1.2 : .96;
        var g = ''; for (var k = 0; k <= n; k++) { var a = Math.PI * (a0 + k / n * a1); g += '<circle cx="' + f(cx + Math.cos(a) * rxx) + '" cy="' + f(cy - 3 + Math.sin(a) * ryy) + '" r="' + f(cr + r() * (fem ? 2 : 1.4)) + '"/>'; }
        var dc = dome(fem ? 6 : 4), hl = crown + (fem ? 5 : 4.5);
        s += '<g fill="' + H + '">' + g + '<path d="M' + f(cx - fw - 1.5) + ',' + f(cy - 2) + 'C' + f(cx - fw - 2) + ',' + f(dc) + ' ' + f(cx + fw + 2) + ',' + f(dc) + ' ' + f(cx + fw + 1.5) + ',' + f(cy - 2) + 'L' + f(cx + fw - 1) + ',' + f(cy - 5) + 'C' + f(cx + fw - 3) + ',' + f(hl + 2) + ' ' + f(cx + 6) + ',' + f(hl) + ' ' + cx + ',' + f(hl) + 'C' + f(cx - 6) + ',' + f(hl) + ' ' + f(cx - fw + 3) + ',' + f(hl + 2) + ' ' + f(cx - fw + 1) + ',' + f(cy - 5) + 'Z"/></g>';
        s += '<path d="M' + f(cx - fw * .6) + ',' + f(crown - 1) + 'Q' + f(cx) + ',' + f(crown - (fem ? 6 : 4.5)) + ' ' + f(cx + fw * .5) + ',' + f(crown - 1.5) + '" fill="none" stroke="' + hairL + '" stroke-opacity=".45" stroke-width="1.4" stroke-dasharray="1.6 2.2" stroke-linecap="round"/>';
      } else if (fem && style === 3) { // bun, hair drawn back
        var dcb = dome(3.5), hlb = crown + 4;
        s += '<circle cx="' + f(cx + 2) + '" cy="' + f(crown - 7) + '" r="' + f(7.5 + r() * 2) + '" fill="' + H + '"/>';
        s += '<path d="M' + f(cx - fw - 1.2) + ',' + f(cy - 1) + 'C' + f(cx - fw - 2) + ',' + f(dcb) + ' ' + f(cx + fw + 2) + ',' + f(dcb) + ' ' + f(cx + fw + 1.2) + ',' + f(cy - 1) + 'C' + f(cx + fw - 2) + ',' + f(hlb + 4) + ' ' + f(cx + 8) + ',' + f(hlb) + ' ' + cx + ',' + f(hlb) + 'C' + f(cx - 8) + ',' + f(hlb) + ' ' + f(cx - fw + 2) + ',' + f(hlb + 4) + ' ' + f(cx - fw - 1.2) + ',' + f(cy - 1) + 'Z" fill="' + H + '"/>';
        s += '<path d="M' + f(cx - fw * .5) + ',' + f(crown - .5) + 'Q' + f(cx) + ',' + f(crown - 3.5) + ' ' + f(cx + fw * .45) + ',' + f(crown - 1) + '" fill="none" stroke="' + hairL + '" stroke-opacity=".5" stroke-width="1.2"/>';
      } else if (fem) { // parted, framing the face
        var side = r() < .5 ? -1 : 1, px = cx + side * 5, yb = cy + (longHair ? 14 : 7), dcf = dome(5.5), pt = crown + 3;
        s += '<path d="M' + f(cx - fw - 3) + ',' + f(yb) + 'C' + f(cx - fw - 5) + ',' + f(cy - 14) + ' ' + f(cx - fw - 3) + ',' + f(dcf + 6) + ' ' + cx + ',' + f(dcf + 5.5) + 'C' + f(cx + fw + 3) + ',' + f(dcf + 6) + ' ' + f(cx + fw + 5) + ',' + f(cy - 14) + ' ' + f(cx + fw + 3) + ',' + f(yb) +
          'C' + f(cx + fw + 1) + ',' + f(cy + 2) + ' ' + f(cx + fw - (side > 0 ? 1 : 3)) + ',' + f(pt + 8) + ' ' + f(px) + ',' + f(pt) + 'C' + f(cx - fw * (side > 0 ? .4 : .2)) + ',' + f(pt + (side > 0 ? 8 : 5)) + ' ' + f(cx - fw + (side > 0 ? 3 : 1)) + ',' + f(cy - 8) + ' ' + f(cx - fw + .5) + ',' + f(cy + 2) + 'L' + f(cx - fw - 3) + ',' + f(yb) + 'Z" fill="' + H + '"/>';
        s += '<path d="M' + f(px) + ',' + f(pt + .5) + 'C' + f(px - side * 5) + ',' + f(crown - 2) + ' ' + f(cx - side * (fw - 1)) + ',' + f(crown + 2) + ' ' + f(cx - side * (fw + 1.5)) + ',' + f(cy - 5) + '" fill="none" stroke="' + hairL + '" stroke-opacity=".5" stroke-width="1.3" stroke-linecap="round"/>';
        s += '<path d="M' + f(px) + ',' + f(pt + .5) + 'C' + f(px + side * 4) + ',' + f(crown) + ' ' + f(cx + side * (fw - 2)) + ',' + f(crown + 4) + ' ' + f(cx + side * (fw + 1)) + ',' + f(cy - 2) + '" fill="none" stroke="' + hairD + '" stroke-opacity=".5" stroke-width="1"/>';
      } else { // short: crop, side part, quiff, buzz
        var th = style === 0 ? 3.8 : style === 1 ? 4.6 : style === 2 ? 7 : style === 3 ? 2.2 : 4.2, sp = r() < .5 ? -1 : 1, yh = crown + (style === 3 ? 3.5 : 5 + r() * 2.5);
        if (style === 5 || (teen && r() < .5)) { th = 6; yh = crown + 8.5; }
        var dcs = dome(th);
        s += '<path d="M' + f(cx - fw - 1.3) + ',' + f(cy - 1) + 'C' + f(cx - fw - 2) + ',' + f(dcs) + ' ' + f(cx + fw + 2) + ',' + f(dcs) + ' ' + f(cx + fw + 1.3) + ',' + f(cy - 1) +
          'L' + f(cx + fw - 1.2) + ',' + f(cy - 3) + 'C' + f(cx + fw - 2.5) + ',' + f(yh + 4) + ' ' + f(cx + fw * .5) + ',' + f(yh - (style === 1 ? sp * 1.5 : 0)) + ' ' + f(cx + sp * 3) + ',' + f(yh) + 'C' + f(cx - fw * .5) + ',' + f(yh + .5) + ' ' + f(cx - fw + 2.5) + ',' + f(yh + 4) + ' ' + f(cx - fw + 1.2) + ',' + f(cy - 3) + 'Z" fill="' + H + '"' + (style === 3 ? ' opacity=".8"' : '') + '/>';
        if (style === 2) s += '<path d="M' + f(cx - fw * .5) + ',' + f(yh + .5) + 'C' + f(cx - fw * .3) + ',' + f(crown - th - 4) + ' ' + f(cx + fw * .5) + ',' + f(crown - th - 3) + ' ' + f(cx + fw * .6) + ',' + f(yh) + 'Z" fill="' + H + '"/>';
        s += '<path d="M' + f(cx - fw * .55) + ',' + f(crown - th * .15) + 'Q' + f(cx) + ',' + f(crown - th * .95) + ' ' + f(cx + fw * .5) + ',' + f(crown - th * .2) + '" fill="none" stroke="' + hairL + '" stroke-opacity=".45" stroke-width="1.3" stroke-linecap="round"/>';
      }
    }
    // light: warm rim from the right, vignette, bevel
    s += '</g><rect width="120" height="120" fill="url(#' + id + 'r)"/><rect width="120" height="120" fill="url(#' + id + 'v)"/>';
    s += '<rect x="1" y="1" width="118" height="118" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="2" rx="17"/></g></svg>';
    return s;
  }
  return { svg: P };
})();
