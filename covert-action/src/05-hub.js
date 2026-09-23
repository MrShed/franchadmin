// ===================================================================
// HUB: title, agent setup, briefing, city screen, travel, case file,
// messages, arrests, interrogation, headlines
// ===================================================================

// ---------- reusable menu ----------
function Menu(items, x, y, w, lh = 10) {
  return {
    items, x, y, w, lh, sel: Math.max(0, items.findIndex(i => !i.off)),
    move(d) { const n = this.items.length; for (let k = 0; k < n; k++) { this.sel = (this.sel + d + n) % n; if (!this.items[this.sel].off) break; } sfx.blip(); },
    key(k) {
      if (k === 'up') this.move(-1); else if (k === 'down') this.move(1);
      else if (k === 'select' || k === 'fire') { const it = this.items[this.sel]; if (it && !it.off) { sfx.select(); it.go(); } else sfx.deny(); return true; }
      return false;
    },
    tap(tx, ty) {
      for (let i = 0; i < this.items.length; i++) { const iy = this.y + i * this.lh; if (tx >= this.x - 4 && tx < this.x + this.w && ty >= iy - 1 && ty < iy + this.lh - 1) { this.sel = i; const it = this.items[i]; if (it.off) sfx.deny(); else { sfx.select(); it.go(); } return true; } }
      return false;
    },
    hover(tx, ty) { for (let i = 0; i < this.items.length; i++) { const iy = this.y + i * this.lh; if (tx >= this.x - 4 && tx < this.x + this.w && ty >= iy - 1 && ty < iy + this.lh - 1 && !this.items[i].off) this.sel = i; } },
    draw() {
      this.items.forEach((it, i) => {
        const iy = this.y + i * this.lh;
        if (i === this.sel) { rect(this.x - 4, iy - 1, this.w, this.lh - 1, P.BL2); rect(this.x - 4, iy - 1, 2, this.lh - 1, P.YE); }
        text(it.label, this.x, iy, it.off ? P.G2 : i === this.sel ? P.YE : P.G5);
        if (it.right) textR(it.right, this.x + this.w - 8, iy, it.off ? P.G2 : P.CY);
      });
    },
  };
}
// a scene that is just a menu over some art
function menuScene(opts) {
  return Object.assign({
    t: 0, update(dt) { this.t += dt; },
    onKey(k) { if (k === 'menu' && this.back) { sfx.blip(); this.back(); return; } this.menu.key(k); },
    onTap(x, y) { this.menu.tap(x, y); }, onHover(x, y) { this.menu.hover(x, y); },
  }, opts);
}
// full-screen message page: "press any key"
function pageScene(drawFn, next, opts = {}) {
  return {
    t: 0, update(dt) { this.t += dt; }, draw() { drawFn(this.t); if (this.t > 0.6) { const blink = (this.t * 2 | 0) % 2; if (blink) textC(opts.prompt || 'Press OK to continue', W / 2, H - 10, P.G4); } },
    onKey(k) { if (this.t > 0.4 && (k === 'select' || k === 'fire' || k === 'menu' || k === 'action')) { sfx.blip(); next(); } }, onTap() { if (this.t > 0.4) { sfx.blip(); next(); } },
  };
}

// ---------- TITLE ----------
function titleScene() {
  const items = [
    { label: 'Begin a new career', go: () => go(setupScene()) },
    { label: 'Practice: Break into a building', go: () => practice('breakin') },
    { label: 'Practice: Codebreaking', go: () => practice('crypto') },
    { label: 'Practice: Wiretapping', go: () => practice('wiretap') },
    { label: 'Practice: Tailing a car', go: () => practice('chase') },
    { label: 'How to play', go: () => go(helpScene(() => go(titleScene()))) },
  ];
  return menuScene({
    menu: Menu(items, 76, 124, 176),
    enter() { sfx.jingle(); },
    draw() {
      vgrad(0, 0, W, 112, [P.K, P.NV, P.BL, P.PU]);
      // searchlight beams over a night city
      const t = this.t;
      for (const [bx, sp] of [[70, 0.5], [250, -0.4]]) { const a = Math.sin(t * sp) * 0.5 - Math.PI / 2; for (let r = 10; r < 120; r += 2) { const w = r * 0.12; const xx = bx + Math.cos(a) * r, yy = 104 + Math.sin(a) * r; dither(xx - w, yy, w * 2, 2, 'rgba(0,0,0,0)', P.BL3, 3); } }
      drawCityScene(cityById('WAS'), 0, 60, W, 52, 23);
      drawLogo(W / 2, 22, t);
      textC("A recreation of Sid Meier's 1990 espionage classic", W / 2, 52, P.CY, P.K);
      rect(0, 112, W, 88, P.K); panel(62, 114, 196, 70);
      this.menu.draw();
      textC('Arrows/WASD + Enter, or tap.  M toggles sound.', W / 2, 190, P.G3);
    },
  });
}
function helpScene(back) {
  const pages = [
    ['THE JOB', 'You are Max (or Maxine) Remington, a freelance agent on contract to the CIA. Each case is a plot by a ring of criminals, spies and terrorists spread across a dozen cities. Identify them, find them and arrest them before the crime takes place.\n\nThe ring is a chain of command: operatives answer to lieutenants, who answer to the Mastermind. Every clue about one member points toward the people they work with.'],
    ['GATHERING CLUES', 'BREAK-INS: search desks, files and safes for documents and photos. Grab the occupant to interrogate them. Get out through the door you came in.\nWIRETAPS: route current to the phone line without tripping an alarm. A bugged line keeps leaking messages.\nCODEBREAKING: crack substitution ciphers on intercepted messages.\nCAR TAILS: follow a car to its destination without being spotted.'],
    ['CONTROLS', 'Move: arrows or WASD (or the pad).  OK: Enter.\nBreak-in: Space fires, E searches / opens / grabs, G throws a grenade, Tab changes grenade type.\nCodebreaking: pick a code letter, then type (or tap) your guess.\nWiretap: move the cursor, OK rotates a chip, Tab switches the current on.\nCar tail: steer with arrows; Tab changes car.\nEsc: back / pause.  M: sound on or off.'],
  ];
  let i = 0;
  const s = pageScene(() => {
    rect(0, 0, W, H, P.K); panel(8, 8, W - 16, H - 28);
    const [h, b] = pages[i]; text(h, 20, 18, P.YE); textR((i + 1) + '/' + pages.length, W - 20, 18, P.G3); rect(20, 28, W - 40, 1, P.G2);
    para(b, 20, 34, W - 40, P.G5, 10);
  }, () => { i++; if (i >= pages.length) back(); });
  return s;
}

// ---------- AGENT SETUP ----------
function setupScene() {
  let sex = 'm', step = 0;
  const skills = [['combat', 'Combat', 'Better aim, more body armour'], ['driving', 'Driving', 'Faster, harder-to-spot cars'], ['crypto', 'Cryptography', 'More letters decoded for you'], ['electronics', 'Electronics', 'More time on circuits']];
  let s;
  const m1 = Menu([{ label: 'Max Remington', go: () => { sex = 'm'; step = 1; s.menu = m2; } }, { label: 'Maxine Remington', go: () => { sex = 'f'; step = 1; s.menu = m2; } }], 150, 70, 150, 12);
  const m2 = Menu(skills.map(([k, n]) => ({ label: n, go: () => { game.agent = newAgent(sex, k); startCareer(); } })), 150, 70, 150, 12);
  s = menuScene({
    menu: m1, back: () => { if (step) { step = 0; s.menu = m1; } else go(titleScene()); },
    draw() {
      rect(0, 0, W, H, P.K); dither(0, 0, W, H, P.NV, P.K, 8); panel(8, 8, W - 16, H - 16);
      text('CENTRAL INTELLIGENCE AGENCY', 20, 18, P.YE); text('Contract agent file', 20, 28, P.G4); rect(20, 38, W - 40, 1, P.G2);
      const cur = step === 0 ? (this.menu.sel === 1 ? 'f' : 'm') : sex;
      rect(28, 50, 56, 68, P.G4); drawAgent(cur, 30, 52); text('REMINGTON', 30, 122, P.G5); text(cur === 'f' ? 'Maxine' : 'Max', 30, 131, P.G4);
      text(step === 0 ? 'Select your agent:' : 'Choose a specialty:', 150, 54, P.CY);
      this.menu.draw();
      if (step === 1) { const d = skills[this.menu.sel][2]; para(d, 150, 130, 150, P.G4); para('Your other skills are average. Each specialty makes one kind of mission easier.', 150, 150, 150, P.G3); }
      else para('Both agents are equal in the field. The choice is yours.', 150, 130, 150, P.G3);
    },
  });
  return s;
}
function startCareer() { game.level = 1; game.careerScore = 0; game.cases = []; newCase(); }
function newCase() {
  Object.assign(game, { day: 1, hour: 8, city: 'WAS', score: 0, messages: [], log: [], bugs: [] });
  game.agent.health = game.agent.maxHealth;
  game.plot = newPlot(game.level);
  // opening intelligence: two leads
  const pl = game.plot; const ops = shuffle(pl.people.filter(p => p.role.tier === 1));
  ops[0].seen = true; reveal(ops[0], 'city'); reveal(ops[0], 'photo');
  if (ops[1]) { ops[1].seen = true; reveal(ops[1], 'org'); }
  go(briefingScene());
}

function briefingScene() {
  const pl = game.plot, ops = pl.people.filter(p => p.seen);
  const txt = 'Intelligence sources report that a hostile group is planning to ' + pl.crime.verb + ' in ' + cityById(pl.targetCity).name + '. We believe the ' + pl.orgs.map(o => o.name).join(' and the ') + (pl.orgs.length > 1 ? ' are' : ' is') + ' involved. The operation is expected to take place in about ' + (pl.deadline - game.day) + ' days.\n\nOur only leads: an operative codenamed ' + ops[0].code + ', seen in ' + cityById(ops[0].city).name + (ops[1] ? ', and a contact called ' + ops[1].code + ' who works for the ' + ops[1].org.name : '') + '.\n\nFind the Mastermind. Good luck, ' + game.agent.first + '.';
  return pageScene(t => {
    rect(0, 0, W, H, P.K);
    // a manila folder on a desk
    dither(0, 0, W, H, P.BR, P.BR2, 5);
    rect(14, 10, W - 28, H - 24, P.TN); rect(14, 10, 70, 6, P.BR3); rect(18, 16, W - 36, H - 34, P.CR);
    rect(W - 90, 20, 64, 12, P.RD); text('TOP SECRET', W - 86, 22, P.W);
    text('CASE ' + game.level + ':  OPERATION ' + ['NIGHTFALL', 'SILENT GATE', 'IRON VEIL', 'BLACK TIDE', 'COLD HARBOR', 'RED LANTERN', 'GLASS KEY'][(game.level - 1) % 7], 26, 22, P.K);
    text('Subject: ' + pl.crime.name, 26, 34, P.BR);
    rect(26, 44, W - 52, 1, P.BR3);
    para(txt, 26, 49, W - 60, P.D2, 9);
  }, () => go(hubScene()));
}

// ---------- CITY HUB ----------
function activityWord(cid) { const n = peopleIn(cid).length; return n === 0 ? ['Quiet', P.G3] : n === 1 ? ['Some activity', P.YE] : ['Heavy activity', P.OR]; }
function hubScene() {
  const city = cityById(game.city);
  let s;
  const items = () => [
    { label: 'Break into a suspect building', go: () => startBreakin() },
    { label: 'Tap a telephone line', go: () => startWiretap() },
    { label: 'Stake out and tail a car', go: () => startChase() },
    { label: 'Decode intercepted messages', right: game.messages.length ? String(game.messages.length) : '', off: !game.messages.length, go: () => go(messagesScene()) },
    { label: 'Review the case file', go: () => go(caseFileScene(() => go(hubScene()))) },
    { label: 'Arrest a suspect', off: !game.plot.people.some(p => p.status === 'free' && (p.known.name || p.known.photo) && p.known.city && p.city === game.city) && !game.plot.people.some(p => p.status === 'free' && (p.known.name || p.known.photo)), go: () => go(arrestScene()) },
    { label: 'Travel to another city', go: () => go(travelScene()) },
    { label: 'Contact CIA headquarters', go: () => go(hqScene()) },
  ];
  s = menuScene({
    menu: Menu(items(), 14, 117, 190, 9),
    enter() { if (checkCaseEnd()) return; },
    back() { go(pauseScene(() => go(hubScene()))); },
    draw() {
      drawCityScene(city, 0, 0, W, 110, game.hour);
      // caption plate
      const cap = city.name + ', ' + city.country; const cw = textW(cap) + 12;
      rect(4, 4, cw, 21, P.K); frame(4, 4, cw, 21, P.G3); text(cap, 10, 7, P.W); text(timeStr(), 10, 16, P.CY);
      rect(0, 110, W, 90, P.K); panel(0, 110, 212, 90); panel(212, 110, 108, 90);
      this.menu.draw();
      // status
      const pl = game.plot, left = pl.deadline - game.day;
      text('CASE ' + game.level, 220, 117, P.YE); textR('Score ' + game.score, 312, 117, P.G4);
      text('Days left', 220, 128, P.G4); textR(String(Math.max(0, left)), 312, 128, left <= 3 ? P.RD2 : P.W);
      text('Plot', 220, 139, P.G4); const st = plotStrength(); rect(250, 140, 62, 5, P.K); rect(250, 140, 62 * st, 5, st > 0.6 ? P.RD2 : st > 0.35 ? P.OR : P.GR2);
      text('Health', 220, 150, P.G4); for (let i = 0; i < game.agent.maxHealth; i++) rect(262 + i * 9, 151, 7, 5, i < game.agent.health ? P.RD2 : P.G1);
      text('Suspects', 220, 161, P.G4); textR(pl.people.filter(p => isSuspect(p)).length + '/' + pl.people.length, 312, 161, P.W);
      const [aw, ac] = activityWord(game.city); text('Local', 220, 175, P.G4); textR(aw, 312, 175, ac);
    },
  });
  return s;
}
function pauseScene(back) {
  return menuScene({
    menu: Menu([
      { label: 'Resume', go: back },
      { label: () => 0, go: () => { sfx.toggle(); } },
      { label: 'How to play', go: () => go(helpScene(() => go(pauseScene(back)))) },
      { label: 'Abandon career', go: () => go(titleScene()) },
    ].map(i => typeof i.label === 'function' ? Object.assign(i, { label: 'Sound on / off' }) : i), 110, 80, 110, 12),
    back,
    draw() { rect(0, 0, W, H, P.K); dither(0, 0, W, H, P.K, P.NV, 6); panel(96, 56, 128, 80); textC('PAUSED', W / 2, 66, P.YE); this.menu.draw(); },
  });
}

// ---------- HQ ----------
function hqScene() {
  const pl = game.plot;
  advanceTime(1);
  // intelligence: which cities are busy, plus one fresh fact
  const busy = CITIES.filter(c => peopleIn(c.id).length > 0).sort((a, b) => peopleIn(b.id).length - peopleIn(a.id).length).slice(0, 3);
  const unk = pl.people.filter(p => p.status === 'free' && isSuspect(p) && knownCount(p) < 5);
  let fact = null; if (unk.length && rnd() < 0.5) fact = reveal(pick(unk));
  const arrested = pl.people.filter(p => p.status === 'arrested').length;
  const lines = [
    'Station reports list unusual activity in: ' + busy.map(c => c.name).join(', ') + '.',
    fact ? 'Analysts have turned up something new: ' + fact : 'Analysts have nothing new for you today.',
    arrested ? arrested + ' of the ring are in custody.' : 'No arrests yet. The Director is getting impatient.',
    'Estimated ' + Math.max(0, pl.deadline - game.day) + ' days before the ' + pl.crime.name.toLowerCase() + '.',
  ];
  return pageScene(() => {
    rect(0, 0, W, H, P.K); rect(0, 0, W, 40, P.NV); disc(28, 20, 14, P.G4); disc(28, 20, 11, P.BL); textC('CIA', 28, 16, P.W);
    text('CIA HEADQUARTERS', 50, 10, P.W); text('Langley, Virginia  -  secure line', 50, 20, P.G4); text(timeStr(), 50, 29, P.CY);
    panel(8, 46, W - 16, H - 62);
    let y = 58; for (const l of lines) { y = para(l, 20, y, W - 40, P.G5, 10) + 5; }
  }, () => go(hubScene()));
}

// ---------- TRAVEL ----------
function travelScene() {
  if (!mapCanvas) buildMap();
  let sel = CITIES.findIndex(c => c.id !== game.city), flying = null;
  const here = cityById(game.city);
  const hoursTo = c => Math.round(3 + dist(here.lon, here.lat, c.lon, c.lat) / 9);
  const pos = c => mapXY(c.lon, c.lat);
  function nearestInDir(dx, dy) {
    const [sx, sy] = pos(CITIES[sel]); let best = -1, bd = 1e9;
    CITIES.forEach((c, i) => { if (i === sel) return; const [x, y] = pos(c); const vx = x - sx, vy = y - sy; const along = vx * dx + vy * dy; if (along <= 0) return; const d = along + Math.abs(vx * dy - vy * dx) * 2.5; if (d < bd) { bd = d; best = i; } });
    if (best >= 0) { sel = best; sfx.blip(); }
  }
  function fly() { const c = CITIES[sel]; if (c.id === game.city) { go(hubScene()); return; } flying = { from: pos(here), to: pos(c), t: 0, dest: c, h: hoursTo(c) }; sfx.tone(300, 1.2, 'sawtooth', 0.03, 200); }
  return {
    t: 0,
    update(dt) { this.t += dt; if (flying) { flying.t += dt / 1.8; if (flying.t >= 1) { advanceTime(flying.h); game.city = flying.dest.id; go(hubScene()); } } },
    onKey(k) {
      if (flying) return;
      if (k === 'left') nearestInDir(-1, 0); else if (k === 'right') nearestInDir(1, 0); else if (k === 'up') nearestInDir(0, -1); else if (k === 'down') nearestInDir(0, 1);
      else if (k === 'select' || k === 'fire') fly(); else if (k === 'menu') go(hubScene());
    },
    onTap(x, y) {
      if (flying) return;
      if (y > 150 && x > 230) { fly(); return; } if (y > 150 && x < 90) { go(hubScene()); return; }
      let best = -1, bd = 14; CITIES.forEach((c, i) => { const [cx, cy] = pos(c); const d = dist(x, y, cx, cy); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) { if (best === sel) fly(); else { sel = best; sfx.blip(); } }
    },
    draw() {
      rect(0, 0, W, H, P.K); g.drawImage(mapCanvas, 0, 0);
      text('WORLD MAP', 4, 1, P.G4); textR(timeStr(), W - 4, 1, P.CY);
      CITIES.forEach((c, i) => {
        const [x, y] = pos(c); const active = c.id === game.city, s = i === sel;
        rect(x - 1, y - 1, 3, 3, active ? P.YE : peopleIn(c.id).length && game.plot.people.some(p => p.city === c.id && p.known.city && p.status === 'free') ? P.RD2 : P.W); px(x, y, P.K);
        if (s && ((this.t * 4 | 0) % 2 || flying)) { frame(x - 4, y - 4, 9, 9, P.YE); }
      });
      if (flying) {
        const { from, to, t } = flying; const n = 30;
        for (let i = 0; i <= n * t; i++) { const f = i / n; const x = from[0] + (to[0] - from[0]) * f, y = from[1] + (to[1] - from[1]) * f - Math.sin(f * Math.PI) * 10; if (i % 2 === 0) px(x, y, P.W); }
        const x = from[0] + (to[0] - from[0]) * t, y = from[1] + (to[1] - from[1]) * t - Math.sin(t * Math.PI) * 10;
        rect(x - 3, y, 7, 1, P.W); rect(x, y - 2, 1, 5, P.W); rect(x - 1, y - 2, 3, 1, P.G4);
      }
      rect(0, 116, W, 84, P.K); panel(0, 116, W, 84);
      const c = CITIES[sel];
      text('From ' + here.name + ' to', 14, 126, P.G4); bigText(c.name, 14, 136, 2, P.YE, P.K);
      text(c.country + '   Flight time ' + hoursTo(c) + ' hours', 14, 158, P.G5);
      const known = game.plot.people.filter(p => p.city === c.id && p.known.city && p.status === 'free');
      text(known.length ? 'Suspects believed here: ' + known.map(p => p.code).join(', ') : 'No known suspects here.', 14, 168, known.length ? P.RD2 : P.G3);
      bevel(14, 180, 64, 13, P.G2, P.G4, P.G1); textC('Cancel', 46, 183, P.W);
      bevel(W - 90, 180, 76, 13, P.BL, P.BL3, P.NV); textC(flying ? 'In flight...' : 'Fly there', W - 52, 183, P.YE);
    },
  };
}

// ---------- CASE FILE ----------
function caseFileScene(back) {
  const pl = game.plot; let tab = 0, sel = 0, detail = null;
  const list = () => pl.people.filter(p => isSuspect(p));
  const COLS = 5, CW = 62, CH = 50;
  return {
    t: 0, update(dt) { this.t += dt; },
    onKey(k) {
      const L = list();
      if (detail) { if (k === 'menu' || k === 'select' || k === 'fire') { detail = null; sfx.blip(); } else if (k === 'left' || k === 'right') { const i = L.indexOf(detail); detail = L[(i + (k === 'left' ? -1 : 1) + L.length) % L.length]; sfx.blip(); } return; }
      if (k === 'menu') { back(); return; }
      if (k === 'alt2' || k === 'alt') { tab = 1 - tab; sfx.blip(); return; }
      if (tab === 0 && L.length) {
        if (k === 'left') sel = Math.max(0, sel - 1); if (k === 'right') sel = Math.min(L.length - 1, sel + 1);
        if (k === 'up') sel = Math.max(0, sel - COLS); if (k === 'down') sel = Math.min(L.length - 1, sel + COLS);
        if (k === 'select' || k === 'fire') { detail = L[sel]; sfx.select(); }
      }
    },
    onTap(x, y) {
      if (detail) { detail = null; return; }
      if (y < 16) { if (x < 110) tab = 0; else if (x < 200) tab = 1; else back(); return; }
      if (tab === 0) { const L = list(); const i = Math.floor((y - 20) / CH) * COLS + Math.floor((x - 5) / CW); if (i >= 0 && i < L.length) { sel = i; detail = L[i]; sfx.select(); } }
    },
    draw() {
      rect(0, 0, W, H, P.NV);
      rect(0, 0, W, 15, P.K);
      [['SUSPECTS', 4], ['CLUE LOG', 110]].forEach(([n, x], i) => { if (i === tab) rect(x, 1, 96, 13, P.BL); text(n, x + 6, 4, i === tab ? P.YE : P.G4); });
      bevel(262, 2, 54, 11, P.G2, P.G4, P.G1); textC('Back', 289, 4, P.W);
      if (tab === 0) {
        const L = list();
        L.slice(0, 15).forEach((p, i) => {
          const x = 5 + (i % COLS) * CW, y = 20 + Math.floor(i / COLS) * CH;
          rect(x, y, CW - 3, CH - 3, P.K); frame(x, y, CW - 3, CH - 3, i === sel ? P.YE : P.G1);
          if (p.known.photo) drawFace(p.face, x + 2, y + 2, 20, 25); else { g.save(); g.translate(x + 2, y + 2); g.scale(20 / 26, 25 / 32); drawUnknownFace(0, 0); g.restore(); }
          text(fitText(p.code, 34), x + 24, y + 3, P.YE);
          text(p.known.role ? fitText(p.role.name, 34) : '?', x + 24, y + 12, P.G4);
          text(p.known.city ? fitText(cityById(p.city).name, 34) : '?', x + 24, y + 21, P.CY);
          text(p.known.org ? p.org.short : '?', x + 3, y + 29, P.G3);
          text(p.known.name ? fitText(p.name, 54) : '', x + 3, y + 38, P.W);
          if (p.status !== 'free') { rect(x + 1, y + 16, CW - 5, 9, P.RD); textC(p.status === 'arrested' ? 'ARRESTED' : 'DEAD', x + (CW - 3) / 2, y + 17, P.W); }
        });
        if (!L.length) textC('No suspects identified yet.', W / 2, 90, P.G4);
        text('Tab: clue log   OK: open dossier', 6, 190, P.G3);
      } else {
        let y = 22; for (const e of game.log.slice(0, 16)) { text('Day ' + e.day, 8, y, P.CY); y = para(e.t, 50, y, 262, P.G5, 9) + 2; if (y > 186) break; }
        if (!game.log.length) textC('No clues yet.', W / 2, 90, P.G4);
      }
      if (detail) drawDossier(detail);
    },
  };
}
function drawDossier(p) {
  panel(20, 18, W - 40, 170);
  rect(32, 30, 56, 68, P.G1); if (p.known.photo) drawFace(p.face, 34, 32, 52, 64); else { g.save(); g.translate(34, 32); g.scale(2, 2); drawUnknownFace(0, 0); g.restore(); }
  bigText(p.code, 98, 30, 2, P.YE, P.K);
  const rows = [['Name', p.known.name ? p.name : 'Unknown'], ['Role', p.known.role ? p.role.name : 'Unknown'], ['Group', p.known.org ? p.org.name : 'Unknown'], ['Location', p.known.city ? cityById(p.city).name + ' (day ' + p.cityDay + ')' : 'Unknown'], ['Status', p.status === 'free' ? 'At large' : p.status === 'arrested' ? 'In custody' : 'Deceased']];
  rows.forEach(([k, v], i) => { text(k, 98, 52 + i * 10, P.G4); text(v, 146, 52 + i * 10, v === 'Unknown' ? P.G2 : P.W); });
  const contacts = p.links.map(i => game.plot.people[i]).filter(q => isSuspect(q));
  text('Known contacts:', 32, 108, P.G4);
  para(contacts.length ? contacts.map(q => q.code).join(', ') : 'none identified', 32, 118, W - 70, P.CY);
  const n = knownCount(p); text('File ' + (n * 20) + '% complete', 32, 150, P.G3); rect(32, 160, 120, 4, P.K); rect(32, 160, n * 24, 4, P.GR2);
  para(canArrest(p) ? 'Enough evidence to arrest - and in this city.' : (p.known.name || p.known.photo) ? (p.known.city ? 'Travel to ' + cityById(p.city).name + ' to arrest.' : 'Location needed to make an arrest.') : 'Name or photograph needed to make an arrest.', 160, 150, 130, P.G5, 9);
  text('◀ ▶ next  ·  OK close', 32, 176, P.G3);
}

// ---------- MESSAGES ----------
function messagesScene() {
  const items = game.messages.map((m, i) => ({ label: 'Day ' + m.day + '  ' + m.src, right: m.text.length + ' chars', go: () => startCrypto(i) }));
  items.push({ label: 'Back', go: () => go(hubScene()) });
  return menuScene({
    menu: Menu(items, 24, 50, 272, 12), back: () => go(hubScene()),
    draw() { rect(0, 0, W, H, P.K); panel(8, 8, W - 16, H - 16); text('INTERCEPTED MESSAGES', 20, 20, P.YE); para('Encrypted traffic from bugged lines and NSA intercepts. Decoding one takes about 2 hours.', 20, 30, W - 40, P.G4); this.menu.draw(); },
  });
}

// ---------- ARREST ----------
function arrestScene() {
  const cands = game.plot.people.filter(p => p.status === 'free' && (p.known.name || p.known.photo));
  const items = cands.map(p => ({ label: p.code + (p.known.name ? '  (' + p.name + ')' : ''), right: p.known.city ? cityById(p.city).name : 'location ?', off: !(p.known.city && p.city === game.city) && !(p.known.city === false), go: () => doArrest(p) }));
  // suspects with a known city elsewhere are shown but disabled; unknown-location ones can be tried on a hunch
  items.push({ label: 'Back', go: () => go(hubScene()) });
  return menuScene({
    menu: Menu(items, 24, 44, 272, 11), back: () => go(hubScene()),
    draw() { rect(0, 0, W, H, P.K); panel(8, 8, W - 16, H - 16); text('ARREST A SUSPECT IN ' + cityById(game.city).name.toUpperCase(), 20, 18, P.YE); para('Local police will make the arrest if you can identify the suspect. Guessing wrong costs time.', 20, 28, W - 40, P.G4); this.menu.draw(); },
  });
}
function doArrest(p) {
  advanceTime(3);
  if (p.city === game.city && p.status === 'free') {
    p.status = 'arrested'; p.seen = true; FACETS.forEach(f => p.known[f] = true);
    const pts = p.role.tier === 3 ? 60 : p.role.tier === 2 ? 25 : 10; game.score += pts; sfx.success();
    go(interrogationScene(p, 'arrest', pts));
  } else {
    if (p.known.city) p.known.city = false;
    sfx.fail(); go(pageScene(() => { rect(0, 0, W, H, P.K); panel(30, 60, W - 60, 70); textC('NO ARREST', W / 2, 72, P.RD2); para(p.code + ' was not found in ' + cityById(game.city).name + '. The trail has gone cold - the suspect may have moved on.', 44, 88, W - 88, P.G5); }, () => go(hubScene())));
  }
}
function interrogationScene(p, how, pts = 0) {
  const n = p.role.tier === 1 ? 2 : 3; const clues = [];
  for (let i = 0; i < n + (how === 'capture' ? 1 : 0); i++) { const c = clueFrom(p, 0); if (c) clues.push(c); }
  p.links.forEach(i => { game.plot.people[i].seen = true; });
  return pageScene(() => {
    rect(0, 0, W, H, P.K);
    // bare bulb interrogation room
    vgrad(0, 0, W, 90, [P.K, P.D2, P.G1]); disc(W / 2, 10, 4, P.YE); line(W / 2, 0, W / 2, 6, P.G3);
    rect(W / 2 - 60, 70, 120, 6, P.BR2); rect(W / 2 - 56, 76, 4, 14, P.BR); rect(W / 2 + 52, 76, 4, 14, P.BR);
    drawFace(p.face, W / 2 - 13, 34, 26, 32);
    panel(8, 92, W - 16, 100);
    text((how === 'arrest' ? 'ARRESTED: ' : how === 'capture' ? 'CAPTURED: ' : '') + p.name + ' (' + p.code + ')', 20, 102, P.YE);
    text(p.role.name + ', ' + p.org.name + (pts ? '   +' + pts + ' points' : ''), 20, 112, P.G4);
    let y = 124; if (!clues.length) para('Under questioning, the suspect tells you nothing you did not already know.', 20, y, W - 40, P.G5);
    for (const c of clues) y = para('- ' + c, 20, y, W - 40, P.G5, 9) + 2;
  }, () => go(hubScene()));
}

// ---------- CASE END / HEADLINES ----------
function checkCaseEnd() {
  const pl = game.plot; if (pl.over) return false;
  const mm = pl.people[pl.mastermind];
  if (mm.status !== 'free' || plotStrength() < 0.3) { pl.over = true; pl.foiled = true; go(headlineScene(true)); return true; }
  if (game.day > pl.deadline) { pl.over = true; pl.foiled = false; go(headlineScene(false)); return true; }
  return false;
}
function headlineScene(won) {
  const pl = game.plot, mm = pl.people[pl.mastermind], city = cityById(pl.targetCity);
  const caught = mm.status !== 'free';
  let bonus = 0; if (won) bonus = 50 + Math.max(0, pl.deadline - game.day) * 3 + (caught ? 40 : 0);
  game.score += bonus; game.careerScore += game.score;
  game.cases.push({ level: game.level, won, score: game.score });
  const head = won ? (caught ? 'MASTERMIND SEIZED' : 'TERROR RING SMASHED') : { Assassination: 'LEADER SLAIN', Kidnapping: 'DIPLOMAT SEIZED', Bombing: 'BLAST ROCKS', Hijacking: 'NUCLEAR CONVOY HIJACKED', 'Theft of Secrets': 'SECRETS STOLEN', Counterfeiting: 'FAKE DOLLAR FLOOD' }[pl.crime.name];
  const sub = won ? 'Plot to ' + pl.crime.verb + ' foiled; ' + pl.people.filter(p => p.status === 'arrested').length + ' held' : 'Attack in ' + city.name + ' stuns world; ringleader "' + mm.code + '" still at large';
  return pageScene(t => {
    rect(0, 0, W, H, P.K);
    // spinning-in newspaper
    const k = Math.min(1, t * 1.6); g.save(); g.translate(W / 2, H / 2); g.rotate((1 - k) * 6); g.scale(k, k); g.translate(-W / 2, -H / 2);
    rect(16, 6, W - 32, H - 22, P.CR); rect(16, 6, W - 32, 1, P.G4);
    bigText('THE WORLD TRIBUNE', W / 2 - bigW('THE WORLD TRIBUNE', 2) / 2, 10, 2, P.K);
    rect(24, 30, W - 48, 1, P.K); text('Day ' + game.day + '  ·  Late edition  ·  25 cents', 26, 33, P.G2); rect(24, 42, W - 48, 1, P.K);
    const hw = bigW(head, 2); bigText(head, Math.max(24, W / 2 - hw / 2), 48, hw > W - 48 ? 1 : 2, won ? P.K : P.RD);
    para(sub, 26, 72, W - 52, P.D2, 9);
    rect(26, 96, 60, 74, P.G4); drawFace(won && caught ? mm.face : pl.people.find(p => p.status === 'arrested')?.face || mm.face, 30, 100, 52, 64);
    para(won ? 'Sources credit a CIA contract agent, identified only as "' + game.agent.first + ' R.", with tracking the ring across ' + (n => n + (n === 1 ? ' city.' : ' cities.'))(new Set(pl.people.filter(p => p.status === 'arrested').map(p => p.city)).size) : 'Intelligence officials admit they were aware of the threat. "We were close," said one. "Not close enough."', 94, 98, W - 122, P.D2, 9);
    if (t > 1) { rect(94, 150, W - 122, 22, P.K); text('Case score ' + game.score + (bonus ? '  (bonus ' + bonus + ')' : ''), 100, 153, P.YE); text('Career total ' + game.careerScore, 100, 162, P.CY); }
    g.restore();
  }, () => go(careerScene(won)), { prompt: 'Press OK' });
}
function rankFor(s) { return [[0, 'Trainee'], [100, 'Field Agent'], [300, 'Senior Agent'], [600, 'Station Chief'], [1000, 'Deputy Director'], [1600, 'Legend of the Agency']].filter(([m]) => s >= m).pop()[1]; }
function careerScene(won) {
  const items = [
    { label: won ? 'Accept the next case (harder)' : 'Try another case at this level', go: () => { if (won) game.level++; newCase(); } },
    { label: 'Retire to the title screen', go: () => go(titleScene()) },
  ];
  return menuScene({
    menu: Menu(items, 40, 150, 240, 12),
    draw() {
      rect(0, 0, W, H, P.K); panel(8, 8, W - 16, H - 16);
      text('SERVICE RECORD: ' + game.agent.first.toUpperCase() + ' REMINGTON', 20, 18, P.YE);
      text('Rank: ' + rankFor(game.careerScore), 20, 30, P.CY); textR('Career score ' + game.careerScore, W - 20, 30, P.W);
      rect(20, 40, W - 40, 1, P.G2);
      game.cases.slice(-8).forEach((c, i) => { text('Case ' + c.level, 24, 46 + i * 11, P.G4); text(c.won ? 'Plot foiled' : 'Plot succeeded', 90, 46 + i * 11, c.won ? P.GR2 : P.RD2); textR(String(c.score), W - 24, 46 + i * 11, P.W); });
      this.menu.draw();
    },
  });
}
