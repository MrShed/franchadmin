// ===================================================================
// FONT: hand-drawn proportional bitmap face (cap height 7, descender 2)
// ===================================================================
const GLYPHS = {
  'A': '.xxx. x...x x...x xxxxx x...x x...x x...x', 'B': 'xxxx. x...x x...x xxxx. x...x x...x xxxx.',
  'C': '.xxx. x...x x.... x.... x.... x...x .xxx.', 'D': 'xxxx. x...x x...x x...x x...x x...x xxxx.',
  'E': 'xxxxx x.... x.... xxxx. x.... x.... xxxxx', 'F': 'xxxxx x.... x.... xxxx. x.... x.... x....',
  'G': '.xxx. x...x x.... x.xxx x...x x...x .xxxx', 'H': 'x...x x...x x...x xxxxx x...x x...x x...x',
  'I': 'xxx .x. .x. .x. .x. .x. xxx', 'J': '..xxx ...x. ...x. ...x. x..x. x..x. .xx..',
  'K': 'x...x x..x. x.x.. xx... x.x.. x..x. x...x', 'L': 'x.... x.... x.... x.... x.... x.... xxxxx',
  'M': 'x...x xx.xx x.x.x x.x.x x...x x...x x...x', 'N': 'x...x xx..x x.x.x x..xx x...x x...x x...x',
  'O': '.xxx. x...x x...x x...x x...x x...x .xxx.', 'P': 'xxxx. x...x x...x xxxx. x.... x.... x....',
  'Q': '.xxx. x...x x...x x...x x.x.x x..x. .xx.x', 'R': 'xxxx. x...x x...x xxxx. x.x.. x..x. x...x',
  'S': '.xxxx x.... x.... .xxx. ....x ....x xxxx.', 'T': 'xxxxx ..x.. ..x.. ..x.. ..x.. ..x.. ..x..',
  'U': 'x...x x...x x...x x...x x...x x...x .xxx.', 'V': 'x...x x...x x...x x...x x...x .x.x. ..x..',
  'W': 'x...x x...x x...x x.x.x x.x.x xx.xx x...x', 'X': 'x...x x...x .x.x. ..x.. .x.x. x...x x...x',
  'Y': 'x...x x...x .x.x. ..x.. ..x.. ..x.. ..x..', 'Z': 'xxxxx ....x ...x. ..x.. .x... x.... xxxxx',
  'a': '..... ..... .xxx. ....x .xxxx x...x .xxxx', 'b': 'x.... x.... xxxx. x...x x...x x...x xxxx.',
  'c': '.... .... .xxx x... x... x... .xxx', 'd': '....x ....x .xxxx x...x x...x x...x .xxxx',
  'e': '..... ..... .xxx. x...x xxxxx x.... .xxx.', 'f': '..xx .x.. xxx. .x.. .x.. .x.. .x..',
  'g': '..... ..... .xxxx x...x x...x x...x .xxxx ....x .xxx.', 'h': 'x.... x.... xxxx. x...x x...x x...x x...x',
  'i': '.x. ... xx. .x. .x. .x. xxx', 'j': '..x ... .xx ..x ..x ..x ..x x.x .x.',
  'k': 'x... x... x..x x.x. xx.. x.x. x..x', 'l': 'xx. .x. .x. .x. .x. .x. xxx',
  'm': '..... ..... xx.x. x.x.x x.x.x x.x.x x...x', 'n': '..... ..... xxxx. x...x x...x x...x x...x',
  'o': '..... ..... .xxx. x...x x...x x...x .xxx.', 'p': '..... ..... xxxx. x...x x...x x...x xxxx. x.... x....',
  'q': '..... ..... .xxxx x...x x...x x...x .xxxx ....x ....x', 'r': '.... .... x.xx xx.. x... x... x...',
  's': '.... .... .xxx x... .xx. ...x xxx.', 't': '.x.. .x.. xxxx .x.. .x.. .x.x ..x.',
  'u': '..... ..... x...x x...x x...x x..xx .xx.x', 'v': '..... ..... x...x x...x x...x .x.x. ..x..',
  'w': '..... ..... x...x x...x x.x.x x.x.x .x.x.', 'x': '..... ..... x...x .x.x. ..x.. .x.x. x...x',
  'y': '..... ..... x...x x...x x...x x...x .xxxx ....x .xxx.', 'z': '..... ..... xxxxx ...x. ..x.. .x... xxxxx',
  '0': '.xxx. x...x x..xx x.x.x xx..x x...x .xxx.', '1': '.x. xx. .x. .x. .x. .x. xxx',
  '2': '.xxx. x...x ....x ...x. ..x.. .x... xxxxx', '3': 'xxxx. ....x ....x .xxx. ....x ....x xxxx.',
  '4': '...x. ..xx. .x.x. x..x. xxxxx ...x. ...x.', '5': 'xxxxx x.... xxxx. ....x ....x x...x .xxx.',
  '6': '.xxx. x.... x.... xxxx. x...x x...x .xxx.', '7': 'xxxxx ....x ...x. ..x.. .x... .x... .x...',
  '8': '.xxx. x...x x...x .xxx. x...x x...x .xxx.', '9': '.xxx. x...x x...x .xxxx ....x ....x .xxx.',
  ' ': '... ... ... ... ... ... ...', '.': '. . . . . . x', ',': '. . . . . . x x', '!': 'x x x x x . x',
  '?': '.xxx. x...x ....x ...x. ..x.. ..... ..x..', "'": 'x x . . . . .', '"': 'x.x x.x ... ... ... ... ...',
  '-': '.... .... .... xxxx .... .... ....', '+': '..... ..x.. ..x.. xxxxx ..x.. ..x.. .....',
  ':': '. . x . . x .', ';': '. . x . . x x', '/': '....x ...x. ...x. ..x.. .x... .x... x....',
  '(': '.x x. x. x. x. x. .x', ')': 'x. .x .x .x .x .x x.', '#': '.x.x. xxxxx .x.x. .x.x. .x.x. xxxxx .x.x.',
  '%': 'xx..x xx..x ...x. ..x.. .x... x..xx x..xx', '&': '.xx.. x..x. x.x.. .x... x.x.x x..x. .xx.x',
  '*': '..... x.x.x .xxx. xxxxx .xxx. x.x.x .....', '=': '..... ..... xxxxx ..... xxxxx ..... .....',
  '<': '...x ..x. .x.. x... .x.. ..x. ...x', '>': 'x... .x.. ..x. ...x ..x. .x.. x...',
  '[': 'xx x. x. x. x. x. xx', ']': 'xx .x .x .x .x .x xx', '_': '..... ..... ..... ..... ..... ..... ..... xxxxx',
  '$': '..x.. .xxxx x.x.. .xxx. ..x.x xxxx. ..x..', '@': '.xxx. x...x x.xxx x.x.x x.xxx x.... .xxx.',
  '£': '..xx. .x..x .x... xxx.. .x... .x... xxxxx', '—': '...... ...... ...... xxxxxx ...... ...... ......',
  '·': '. . . x . . .', '▶': 'x... xx.. xxx. xxxx xxx. xx.. x...', '◀': '...x ..xx .xxx xxxx .xxx ..xx ...x',
  '▲': '....... ....... ...x... ..xxx.. .xxxxx. xxxxxxx .......', '▼': '....... xxxxxxx .xxxxx. ..xxx.. ...x... ....... .......',
  '█': 'xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx',
};
const FONT = {};
for (const ch in GLYPHS) { const rows = GLYPHS[ch].split(' '); FONT[ch] = { w: rows[0].length, rows }; }
const glyphCache = new Map();
function glyphImg(ch, col) {
  const k = ch + col; let c = glyphCache.get(k); if (c) return c;
  const gl = FONT[ch] || FONT['?']; c = document.createElement('canvas'); c.width = gl.w; c.height = 9;
  const x = c.getContext('2d'); x.fillStyle = col;
  gl.rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) if (r[i] === 'x') x.fillRect(i, y, 1, 1); });
  glyphCache.set(k, c); return c;
}
function textW(s) { let w = 0; for (const ch of s) w += (FONT[ch] || FONT['?']).w + 1; return Math.max(0, w - 1); }
function text(s, x, y, col = P.W, shadow = null) {
  s = String(s); x = Math.round(x); y = Math.round(y);
  if (shadow) { let xx = x + 1; for (const ch of s) { g.drawImage(glyphImg(ch, shadow), xx, y + 1); xx += (FONT[ch] || FONT['?']).w + 1; } }
  for (const ch of s) { g.drawImage(glyphImg(ch, col), x, y); x += (FONT[ch] || FONT['?']).w + 1; }
  return x;
}
function textC(s, cx, y, col, shadow) { return text(s, cx - textW(String(s)) / 2, y, col, shadow); }
function textR(s, rx, y, col, shadow) { return text(s, rx - textW(String(s)), y, col, shadow); }
// scaled text for logos and headlines
function bigText(s, x, y, scale, col, shadow) {
  s = String(s); let xx = Math.round(x);
  for (const ch of s) {
    const gl = FONT[ch] || FONT['?'];
    if (shadow) g.drawImage(glyphImg(ch, shadow), 0, 0, gl.w, 9, xx + scale, y + scale, gl.w * scale, 9 * scale);
    g.drawImage(glyphImg(ch, col), 0, 0, gl.w, 9, xx, y, gl.w * scale, 9 * scale);
    xx += (gl.w + 1) * scale;
  }
  return xx;
}
function bigW(s, scale) { return textW(String(s)) * scale + (scale - 1); }
function wrap(s, maxW) {
  const out = []; for (const para of String(s).split('\n')) {
    let lineS = ''; for (const word of para.split(' ')) {
      const t = lineS ? lineS + ' ' + word : word;
      if (textW(t) > maxW && lineS) { out.push(lineS); lineS = word; } else lineS = t;
    } out.push(lineS);
  } return out;
}
function fitText(s, w) { s = String(s); if (textW(s) <= w) return s; while (s.length > 1 && textW(s + '.') > w) s = s.slice(0, -1); return s + '.'; }
function para(s, x, y, maxW, col = P.W, lh = 10, shadow = null) { const ls = wrap(s, maxW); ls.forEach((l, i) => text(l, x, y + i * lh, col, shadow)); return y + ls.length * lh; }
