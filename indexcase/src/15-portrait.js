/* INDEX CASE UI — 15-portrait.js: illustrated portraits, generated from the
 * person's id, age and sex. Flat-shaded with a cool key light and warm rim —
 * the incident-room file photo. */
var UIPortrait = (function () {
  var SKIN = [['#f3d3bd', '#d9ab8f'], ['#eac2a2', '#c99772'], ['#d9a57f', '#b57c56'], ['#c28a62', '#9a6541'], ['#a86f4a', '#7f4f31'], ['#8a5635', '#643a22'], ['#6b3f25', '#4a2a17'], ['#f0c8a8', '#cf9f7d']];
  var HAIR = ['#1b1512', '#2e2119', '#4a3222', '#6b4a2f', '#8c6a43', '#b48a5a', '#c9a36b', '#3a2a22', '#101010', '#6e3b22'];
  var CLOTH = ['#2f4a63', '#5b3b4e', '#3f5a4a', '#6a5236', '#2d3748', '#7a3d33', '#44516b', '#556b72', '#383d57', '#6b6b5e'];
  var BG = [['#1f3346', '#0e1a25'], ['#2a2f45', '#12141f'], ['#23383a', '#0e1b1c'], ['#3a2d2a', '#1a1311']];
  function P(o) {
    var r = UIrand('face:' + o.pid), age = o.age === null || o.age === undefined ? 40 : o.age, f = /^f/i.test(o.sex || '') ? 1 : /^m/i.test(o.sex || '') ? 0 : (r() < .5 ? 1 : 0);
    var sk = SKIN[Math.floor(r() * SKIN.length)], hairC = HAIR[Math.floor(r() * HAIR.length)], cl = CLOTH[Math.floor(r() * CLOTH.length)], bg = BG[Math.floor(r() * BG.length)];
    if (age > 62) hairC = r() < .6 ? '#c9c5bf' : '#9b958c'; else if (age > 48 && r() < .4) hairC = '#7d7770';
    var kid = age < 13, faceW = kid ? 25 : 23 + r() * 3, faceH = kid ? 28 : 30 + r() * 3, cx = 60, cy = kid ? 60 : 56;
    var style = f ? Math.floor(r() * 5) : Math.floor(r() * 5); // hair style index
    var covered = f && r() < .12 && !kid; // headscarf
    var bald = !f && age > 45 && r() < .35;
    var glasses = age > 40 ? r() < .45 : r() < .15, beard = !f && !kid && age > 17 && r() < .3;
    var s = '<svg viewBox="0 0 120 120" class="portrait" aria-hidden="true"><defs>' +
      '<radialGradient id="pb' + o.pid + '" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="' + bg[0] + '"/><stop offset="1" stop-color="' + bg[1] + '"/></radialGradient>' +
      '<linearGradient id="pk' + o.pid + '" x1="0" x2="1"><stop offset="0" stop-color="' + sk[0] + '"/><stop offset=".62" stop-color="' + sk[0] + '"/><stop offset="1" stop-color="' + sk[1] + '"/></linearGradient>' +
      '<clipPath id="pc' + o.pid + '"><rect width="120" height="120" rx="16"/></clipPath></defs><g clip-path="url(#pc' + o.pid + ')">' +
      '<rect width="120" height="120" fill="url(#pb' + o.pid + ')"/>' +
      '<circle cx="' + (22 + r() * 70) + '" cy="' + (14 + r() * 30) + '" r="' + (18 + r() * 20) + '" fill="#fff" opacity=".035"/>';
    // back hair (long styles)
    if (!covered && f && (style === 1 || style === 3)) s += '<path d="M' + (cx - faceW - 6) + ',' + (cy - 6) + 'Q' + (cx - faceW - 10) + ',' + (cy + 40) + ' ' + (cx - faceW + 2) + ',' + (cy + 44) + 'L' + (cx + faceW - 2) + ',' + (cy + 44) + 'Q' + (cx + faceW + 10) + ',' + (cy + 40) + ' ' + (cx + faceW + 6) + ',' + (cy - 6) + 'Z" fill="' + hairC + '"/>';
    if (covered) s += '<path d="M' + (cx - faceW - 9) + ',' + (cy + 4) + 'Q' + (cx - faceW - 10) + ',' + (cy - faceH - 12) + ' ' + cx + ',' + (cy - faceH - 12) + 'Q' + (cx + faceW + 10) + ',' + (cy - faceH - 12) + ' ' + (cx + faceW + 9) + ',' + (cy + 4) + 'L' + (cx + faceW + 22) + ',' + 122 + 'L' + (cx - faceW - 22) + ',122Z" fill="' + CLOTH[(CLOTH.indexOf(cl) + 3) % CLOTH.length] + '"/>';
    // shoulders
    var sw = kid ? 34 : 44 + r() * 6;
    s += '<path d="M' + (cx - sw) + ',122 Q' + (cx - sw + 2) + ',' + (cy + faceH + 14) + ' ' + (cx - 12) + ',' + (cy + faceH + 8) + 'L' + (cx + 12) + ',' + (cy + faceH + 8) + 'Q' + (cx + sw - 2) + ',' + (cy + faceH + 14) + ' ' + (cx + sw) + ',122Z" fill="' + cl + '"/>';
    s += '<path d="M' + (cx + 12) + ',' + (cy + faceH + 8) + 'Q' + (cx + sw - 2) + ',' + (cy + faceH + 14) + ' ' + (cx + sw) + ',122L' + (cx + sw - 14) + ',122Q' + (cx + 20) + ',' + (cy + faceH + 20) + ' ' + (cx + 8) + ',' + (cy + faceH + 10) + 'Z" fill="#000" opacity=".18"/>';
    // neck
    s += '<path d="M' + (cx - 9) + ',' + (cy + faceH - 8) + 'L' + (cx - 9) + ',' + (cy + faceH + 10) + 'Q' + cx + ',' + (cy + faceH + 16) + ' ' + (cx + 9) + ',' + (cy + faceH + 10) + 'L' + (cx + 9) + ',' + (cy + faceH - 8) + 'Z" fill="' + sk[1] + '"/>';
    // collar
    if (!covered) s += '<path d="M' + (cx - 12) + ',' + (cy + faceH + 8) + 'L' + cx + ',' + (cy + faceH + 20) + 'L' + (cx + 12) + ',' + (cy + faceH + 8) + '" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>';
    // ears + head
    s += '<ellipse cx="' + (cx - faceW + 1) + '" cy="' + (cy + 2) + '" rx="4" ry="6" fill="' + sk[0] + '"/><ellipse cx="' + (cx + faceW - 1) + '" cy="' + (cy + 2) + '" rx="4" ry="6" fill="' + sk[1] + '"/>';
    var jaw = f ? 0.82 : 0.9;
    s += '<path d="M' + (cx - faceW) + ',' + (cy - 4) + 'Q' + (cx - faceW) + ',' + (cy - faceH) + ' ' + cx + ',' + (cy - faceH) + 'Q' + (cx + faceW) + ',' + (cy - faceH) + ' ' + (cx + faceW) + ',' + (cy - 4) + 'Q' + (cx + faceW * jaw) + ',' + (cy + faceH * .8) + ' ' + cx + ',' + (cy + faceH * .92) + 'Q' + (cx - faceW * jaw) + ',' + (cy + faceH * .8) + ' ' + (cx - faceW) + ',' + (cy - 4) + 'Z" fill="url(#pk' + o.pid + ')"/>';
    // age lines
    if (age > 55) s += '<path d="M' + (cx - 14) + ',' + (cy + 14) + 'q3,5 7,6M' + (cx + 14) + ',' + (cy + 14) + 'q-3,5 -7,6M' + (cx - 10) + ',' + (cy - faceH + 12) + 'h20" stroke="' + sk[1] + '" stroke-width="1.2" fill="none" opacity=".8"/>';
    // beard
    if (beard) s += '<path d="M' + (cx - faceW + 2) + ',' + (cy + 2) + 'Q' + (cx - faceW * .8) + ',' + (cy + faceH * .95) + ' ' + cx + ',' + (cy + faceH * .98) + 'Q' + (cx + faceW * .8) + ',' + (cy + faceH * .95) + ' ' + (cx + faceW - 2) + ',' + (cy + 2) + 'Q' + (cx + 10) + ',' + (cy + 12) + ' ' + cx + ',' + (cy + 11) + 'Q' + (cx - 10) + ',' + (cy + 12) + ' ' + (cx - faceW + 2) + ',' + (cy + 2) + 'Z" fill="' + hairC + '" opacity=".9"/>';
    // eyes, brows, nose, mouth
    var ey = cy + 1, ex = kid ? 9 : 9.5;
    s += '<ellipse cx="' + (cx - ex) + '" cy="' + ey + '" rx="2.3" ry="' + (age > 70 ? 1.5 : 2.2) + '" fill="#1a1411"/><ellipse cx="' + (cx + ex) + '" cy="' + ey + '" rx="2.3" ry="' + (age > 70 ? 1.5 : 2.2) + '" fill="#1a1411"/>';
    s += '<circle cx="' + (cx - ex + .8) + '" cy="' + (ey - .8) + '" r=".7" fill="#fff" opacity=".8"/><circle cx="' + (cx + ex + .8) + '" cy="' + (ey - .8) + '" r=".7" fill="#fff" opacity=".8"/>';
    var bt = r() * 2 - 1;
    s += '<path d="M' + (cx - ex - 5) + ',' + (ey - 6 + bt) + 'q5,-3 9,0M' + (cx + ex - 4) + ',' + (ey - 6 - bt * .3) + 'q5,-3 9,0" stroke="' + (covered || bald ? '#2a1f18' : hairC) + '" stroke-width="' + (f ? 1.6 : 2.4) + '" fill="none" stroke-linecap="round"/>';
    s += '<path d="M' + (cx + 1) + ',' + (ey + 3) + 'q2.5,7 -1,9" stroke="' + sk[1] + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
    var mw = 6 + r() * 3, mood = r() < .5 ? 1.2 : -0.4;
    s += '<path d="M' + (cx - mw) + ',' + (cy + 17) + 'q' + mw + ',' + (mood * 2) + ' ' + (mw * 2) + ',0" stroke="#7a3b30" stroke-width="2" fill="none" stroke-linecap="round"/>';
    if (glasses) s += '<g fill="none" stroke="#0d0d0d" stroke-width="1.6" opacity=".85"><rect x="' + (cx - ex - 6) + '" y="' + (ey - 5) + '" width="12" height="9" rx="3"/><rect x="' + (cx + ex - 6) + '" y="' + (ey - 5) + '" width="12" height="9" rx="3"/><path d="M' + (cx - ex + 6) + ',' + (ey - 1) + 'h' + (2 * ex - 12) + '"/></g>';
    // hair front
    if (!covered && !bald) {
      var top = cy - faceH;
      if (f && style === 4 || (!f && style === 3)) { // curly / afro
        for (var k = 0; k < 13; k++) { var a = Math.PI + k / 12 * Math.PI; s += '<circle cx="' + (cx + Math.cos(a) * (faceW + 3)).toFixed(1) + '" cy="' + (cy - 6 + Math.sin(a) * (faceH + 2)).toFixed(1) + '" r="' + (7 + r() * 3).toFixed(1) + '" fill="' + hairC + '"/>'; }
      } else if (f && style === 2) { // bun
        s += '<circle cx="' + cx + '" cy="' + (top - 5) + '" r="9" fill="' + hairC + '"/><path d="M' + (cx - faceW - 1) + ',' + (cy - 2) + 'Q' + (cx - faceW) + ',' + (top - 3) + ' ' + cx + ',' + (top - 2) + 'Q' + (cx + faceW) + ',' + (top - 3) + ' ' + (cx + faceW + 1) + ',' + (cy - 2) + 'Q' + (cx + 12) + ',' + (top + 8) + ' ' + cx + ',' + (top + 7) + 'Q' + (cx - 12) + ',' + (top + 8) + ' ' + (cx - faceW - 1) + ',' + (cy - 2) + 'Z" fill="' + hairC + '"/>';
      } else {
        var fr = f ? 12 + r() * 6 : 7 + r() * 5, side = r() < .5 ? -1 : 1;
        s += '<path d="M' + (cx - faceW - 2) + ',' + (cy - (f ? -4 : 4)) + 'Q' + (cx - faceW - 2) + ',' + (top - 6) + ' ' + cx + ',' + (top - 5) + 'Q' + (cx + faceW + 2) + ',' + (top - 6) + ' ' + (cx + faceW + 2) + ',' + (cy - (f ? -4 : 4)) + 'Q' + (cx + faceW - 2) + ',' + (top + fr) + ' ' + (cx + side * 6) + ',' + (top + fr - 2) + 'Q' + (cx - faceW + 4) + ',' + (top + fr + 3) + ' ' + (cx - faceW - 2) + ',' + (cy - (f ? -4 : 4)) + 'Z" fill="' + hairC + '"/>';
      }
    } else if (bald) s += '<path d="M' + (cx - faceW) + ',' + (cy - 2) + 'q-1,-9 3,-12M' + (cx + faceW) + ',' + (cy - 2) + 'q1,-9 -3,-12" stroke="' + hairC + '" stroke-width="4" fill="none" stroke-linecap="round"/>';
    // rim light + vignette
    s += '<path d="M' + (cx + faceW) + ',' + (cy - 8) + 'Q' + (cx + faceW) + ',' + (cy + faceH * .5) + ' ' + (cx + faceW * .6) + ',' + (cy + faceH * .7) + '" stroke="#ffb48a" stroke-opacity=".35" stroke-width="1.5" fill="none"/>';
    s += '<rect width="120" height="120" fill="none" stroke="#fff" stroke-opacity=".06" stroke-width="2" rx="16"/></g></svg>';
    return s;
  }
  return { svg: P };
})();
