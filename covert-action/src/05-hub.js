// ===================================================================
// HUB: title, game options, training, briefing, city locations,
// CIA headquarters, airport, hotel, data screens, case end
// ===================================================================

// ---------- menu widget: yellow highlight bar, like the original ----------
function Menu(items, x, y, w, lh = 9) {
  return {
    items, x, y, w, lh, sel: Math.max(0, items.findIndex(i => !i.off)),
    move(d) { const n = this.items.length; for (let k = 0; k < n; k++) { this.sel = (this.sel + d + n) % n; if (!this.items[this.sel].off) break; } sfx.blip(); },
    key(k) {
      if (k === 'up') this.move(-1); else if (k === 'down') this.move(1);
      else if (k === 'select' || k === 'fire') { const it = this.items[this.sel]; if (it && !it.off) { sfx.select(); it.go(); } else sfx.deny(); return true; }
      return false;
    },
    hit(tx, ty) { for (let i = 0; i < this.items.length; i++) { const iy = this.y + i * this.lh; if (tx >= this.x - 3 && tx < this.x + this.w && ty >= iy - 1 && ty < iy + this.lh - 1) return i; } return -1; },
    tap(tx, ty) { const i = this.hit(tx, ty); if (i < 0) return false; this.sel = i; const it = this.items[i]; if (it.off) sfx.deny(); else { sfx.select(); it.go(); } return true; },
    hover(tx, ty) { const i = this.hit(tx, ty); if (i >= 0 && !this.items[i].off) this.sel = i; },
    draw(fg = P.W) {
      this.items.forEach((it, i) => {
        const iy = this.y + i * this.lh;
        if (i === this.sel) rect(this.x - 3, iy - 1, this.w, this.lh, P.YE);
        text(it.label, this.x, iy, it.off ? P.G1 : i === this.sel ? P.G1 : fg);
        if (it.right) textR(it.right, this.x + this.w - 6, iy, i === this.sel ? P.G1 : P.CY);
      });
    },
  };
}
function menuScene(opts) {
  return Object.assign({
    t: 0, update(dt) { this.t += dt; },
    onKey(k) { if (k === 'menu' && this.back) { sfx.blip(); this.back(); return; } this.menu.key(k); },
    onTap(x, y) { if (!this.menu.tap(x, y) && this.tapElse) this.tapElse(x, y); }, onHover(x, y) { this.menu.hover(x, y); },
  }, opts);
}
function pageScene(drawFn, next, opts = {}) {
  return {
    t: 0, update(dt) { this.t += dt; }, draw() { drawFn(this.t); },
    onKey(k) { if (this.t > 0.3 && (k === 'select' || k === 'fire' || k === 'menu' || k === 'action')) { sfx.blip(); next(); } }, onTap() { if (this.t > 0.3) { sfx.blip(); next(); } },
  };
}
// white-bordered black text box, as used for every message
function msgBox(x, y, w, h) { rect(x, y, w, h, P.K); frame(x, y, w, h, P.W); frame(x + 2, y + 2, w - 4, h - 4, P.G3); }
// the location plate: city and time, double border, green text
function locPlate(cityName) {
  rect(8, 4, 150, 24, P.G1); frame(8, 4, 150, 24, P.G3); frame(10, 6, 146, 20, P.K); frame(11, 7, 144, 18, P.G3);
  textC(cityName, 83, 9, P.GR2); textC(clockStr(), 83, 17, P.GR2);
}
// generic "you are at ..." screen with menu on the left and a picture on the right
function locationScreen({ lines, items, art, back, cityName }) {
  let s;
  s = menuScene({
    menu: null, back,
    enter() { const y = 34 + lines.length * 9 + 4; s.menu = Menu(items, 14, y, 128, 9); },
    draw() {
      rect(0, 0, W, H, P.K);
      art && art(150, 30, 170, 170, this.t);
      locPlate(cityName || (cityById(game.city).name + ', ' + cityById(game.city).country));
      lines.forEach((l, i) => text(l, 10, 34 + i * 9, P.W));
      this.menu && this.menu.draw();
    },
  });
  return s;
}

// ---------- TITLE ----------
let serifCache = null;
function serifLogo() { // "Covert Action" in a big serif face, thresholded to 1-bit like the original bitmap
  if (serifCache) return serifCache;
  const c = document.createElement('canvas'); c.width = 320; c.height = 110; const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  x.font = 'bold 50px "Times New Roman", Times, "Liberation Serif", Georgia, serif'; x.fillText('Covert', 160, 58);
  x.fillText('Action', 170, 104);
  x.font = 'bold italic 17px "Times New Roman", Times, Georgia, serif'; x.fillStyle = '#f55'; x.fillText("Sid Meier's", 118, 15);
  const d = x.getImageData(0, 0, 320, 110); for (let i = 0; i < d.data.length; i += 4) { const a = d.data[i + 3]; d.data[i + 3] = a > 110 ? 255 : 0; }
  x.putImageData(d, 0, 0); serifCache = c; return c;
}
function stripedSilhouettes(y0, h, flip) { // blue scanlines with dark figures, top and bottom of the title
  for (let y = 0; y < h; y += 2) rect(0, y0 + y, W, 1, P.BL);
  const figs = [[40, 0.9], [95, 1.1], [150, 1], [210, 1.15], [268, 0.95]];
  for (const [fx, sc] of figs) { g.fillStyle = P.K; const top = flip ? y0 - 8 : y0 + 2; g.beginPath(); g.ellipse(fx, top + 10 * sc, 9 * sc, 11 * sc, 0, 0, 7); g.fill(); g.fillRect(fx - 20 * sc, top + 20 * sc, 40 * sc, 60); }
  for (let y = 0; y < h; y += 2) rect(0, y0 + y + 1, W, 1, P.K);
}
function titleScene() {
  return {
    t: 0, enter() { sfx.jingle(); },
    update(dt) { this.t += dt; },
    draw() {
      rect(0, 0, W, H, P.K);
      g.save(); g.beginPath(); g.rect(0, 0, W, 44); g.clip(); stripedSilhouettes(0, 44, true); g.restore();
      g.save(); g.beginPath(); g.rect(0, 156, W, 44); g.clip(); stripedSilhouettes(156, 44, false); g.restore();
      rect(0, 44, W, 1, P.RD); rect(0, 155, W, 1, P.RD);
      g.drawImage(serifLogo(), 0, 46);
      text('TM', 262, 90, P.G1);
      if (this.t > 1.2 && (this.t * 1.5 | 0) % 2) textC('Press a key', W / 2, 146, P.G3);
      textC('A from-memory recreation. Not affiliated with MicroProse.', W / 2, 192, P.G3);
    },
    onKey() { sfx.select(); go(optionsScene()); }, onTap() { sfx.select(); go(optionsScene()); },
  };
}
function optionsScene() {
  const saved = loadSave();
  return menuScene({
    menu: Menu([
      { label: 'Create A New Character', go: () => go(sexScene()) },
      { label: 'Load A Saved Game', off: !saved, go: () => { restoreSave(saved); go(cityScene()); } },
      { label: 'Practice A Skill', go: () => go(practiceScene()) },
      { label: 'How To Play', go: () => go(helpScene(() => go(optionsScene()))) },
    ], 100, 92, 130, 11),
    back: () => go(titleScene()),
    draw() { rect(0, 0, W, H, P.K); textC('Game Options', W / 2, 70, P.W); rect(W / 2 - 34, 79, 68, 1, P.W); this.menu.draw(); textC('Arrows or keypad, Enter selects, Esc goes back.  M: sound', W / 2, 186, P.G1); },
  });
}
function practiceScene() {
  let diff = 0;
  const m2 = () => Menu(['Combat', 'Driving', 'Cryptography', 'Electronics'].map((l, i) => ({ label: l, go: () => practice(['breakin', 'chase', 'crypto', 'wiretap'][i], diff) })), 110, 92, 110, 11);
  let s; s = menuScene({
    menu: Menu(DIFFICULTY.map((d, i) => ({ label: d.name, go: () => { diff = i; s.menu = m2(); s.step = 1; } })), 100, 92, 130, 11), step: 0,
    back: () => { if (s.step) { s.step = 0; s.menu = Menu(DIFFICULTY.map((d, i) => ({ label: d.name, go: () => { diff = i; s.menu = m2(); s.step = 1; } })), 100, 92, 130, 11); } else go(optionsScene()); },
    draw() { rect(0, 0, W, H, P.K); textC(this.step ? 'Practice which skill?' : 'Practice at which level?', W / 2, 70, P.W); this.menu.draw(); },
  });
  return s;
}
function helpScene(back) {
  const pages = [
    ['THE JOB', 'You are Max Remington, the only freelance secret agent in the western world. Each case is a crime being planned by a conspiracy of 6 to 10 people from several organizations. Find them, prove their roles, and arrest them before the crime happens.\n\nArrests only stick if you know the suspect\'s ROLE. Decoded messages reveal the roles of sender and recipient.'],
    ['GETTING AROUND', 'Each city has locations: CIA Headquarters (Data, Intelligence and Crypto), the Airport, the Hotel, and any enemy hideouts you have found.\n\nAt a building you can Place Wiretap, Break Into The Building, or Watch The Building to follow people who come out.\n\nSuspects can only be arrested in their car or inside their own organization\'s building.'],
    ['CONTROLS', 'Menus: arrows + Enter, Esc to leave.\nBuilding: arrows move, Space fires, E examines/opens (F1), P photographs (F2), B bugs (F3), G throws (F5-F7), Tab changes grenade (F10), C crouches. Terminals each show one letter of the password; type it at the mainframe (F4), then search names, cities, groups, addresses or evidence.\nCar: arrows order the next turn, + and - change speed, Tab swaps cars, F resumes follow, E arrests when prompted.\nCrypto: pick a code letter, type the plain letter.\nElectronics: move the highlight, Enter swaps with the spare chip.'],
  ];
  let i = 0;
  return pageScene(() => {
    rect(0, 0, W, H, P.K); msgBox(6, 6, W - 12, H - 12);
    const [h, b] = pages[i]; text(h, 16, 14, P.YE); textR((i + 1) + '/' + pages.length, W - 16, 14, P.G3);
    para(b, 16, 28, W - 32, P.W, 9);
    textC('Press a key', W / 2, 184, P.G3);
  }, () => { i++; if (i >= pages.length) back(); });
}

// ---------- NEW CHARACTER ----------
function sexScene() {
  return menuScene({
    menu: Menu([{ label: 'Maximillian Remington', go: () => go(nameScene('m')) }, { label: 'Maxine Remington', go: () => go(nameScene('f')) }], 90, 96, 150, 11),
    back: () => go(optionsScene()),
    draw() { rect(0, 0, W, H, P.K); textC('Who will you be?', W / 2, 70, P.W); drawAgent(this.menu.sel === 1 ? 'f' : 'm', 24, 70); this.menu.draw(); },
  });
}
function nameScene(sex) {
  let name = ''; const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const done = () => { game.agent = newAgent(sex, name.trim() || (sex === 'f' ? 'Nightshade' : 'Lone Wolf')); go(difficultyScene()); };
  return {
    typing: true, t: 0, update(dt) { this.t += dt; },
    onChar(ch) { if (ch === '') name = name.slice(0, -1); else if (name.length < 14) name += name.length ? ch.toLowerCase() : ch; sfx.tick(); },
    onKey(k) { if (k === 'select') done(); if (k === 'fire' && name.length < 14) name += ' '; if (k === 'menu') go(sexScene()); },
    onTap(x, y) {
      const c = Math.floor((x - 22) / 21), r = Math.floor((y - 120) / 15);
      if (r >= 0 && r < 2 && c >= 0 && c < 13) { this.onChar(A[r * 13 + c]); return; }
      if (y >= 152 && y < 166) { if (x < 110) name = name.slice(0, -1); else if (x < 210) { if (name.length < 14) name += ' '; } else done(); }
    },
    draw() {
      rect(0, 0, W, H, P.K); textC('Character Name', W / 2, 40, P.W); rect(W / 2 - 38, 49, 76, 1, P.W);
      textC('Type in a code name for Max Remington:', W / 2, 64, P.G3);
      msgBox(80, 80, 160, 18); text(name + ((this.t * 2 | 0) % 2 ? '_' : ''), 88, 86, P.YE);
      for (let i = 0; i < 26; i++) { const x = 22 + (i % 13) * 21, y = 120 + Math.floor(i / 13) * 15; rect(x, y, 19, 13, P.G1); textC(A[i], x + 9, y + 3, P.W); }
      rect(22, 152, 86, 13, P.G1); textC('Rub out', 65, 155, P.W); rect(112, 152, 96, 13, P.G1); textC('Space', 160, 155, P.W); rect(212, 152, 86, 13, P.BL); textC('Done', 255, 155, P.YE);
    },
  };
}
function difficultyScene() {
  return menuScene({
    menu: Menu(DIFFICULTY.map((d, i) => ({ label: d.name, go: () => { game.diff = i; go(trainingScene()); } })), 104, 92, 120, 11),
    back: () => go(sexScene()),
    draw() {
      rect(0, 0, W, H, P.K); textC('Difficulty Level', W / 2, 70, P.W); rect(W / 2 - 38, 79, 76, 1, P.W); this.menu.draw();
      para(['Introductory. Extra help, more clues, sleepy guards.', 'More participants, fewer clues.', 'Alert guards, harder wiretaps and codes.', 'Red herrings, no spaces in codes, deadly guards.'][this.menu.sel], 60, 150, 200, P.G3);
    },
  });
}
function trainingScene() {
  let picks = 4; const keys = ['combat', 'driving', 'crypto', 'electronics'];
  const cols = [P.RD, P.BL2, P.G1, P.GR]; const labels = ['Combat', 'Driving', 'Crypto', 'Electronics'];
  let s; s = menuScene({
    menu: Menu(['Combat training', 'Driving training', 'Cryptography training', 'Electronics training'].map((l, i) => ({ label: l, go: () => { if (picks > 0 && game.agent.skills[keys[i]] < 3) { game.agent.skills[keys[i]]++; picks--; sfx.select(); if (!picks) setTimeout(() => go(chiefScene()), 700); } else sfx.deny(); } })), 100, 18, 124, 10),
    back: () => go(difficultyScene()),
    draw() {
      rect(0, 0, W, H, P.K); textC('Preparation for Field Work', W / 2, 4, P.W); rect(W / 2 - 64, 12, 128, 1, P.W);
      this.menu.draw(); textC(picks ? picks + ' training period' + (picks === 1 ? '' : 's') + ' left' : 'Training complete', W / 2, 52, picks ? P.G3 : P.YE);
      for (let i = 0; i < 4; i++) {
        const x = 16 + i * 74, y = 62, w = 68, h = 134;
        frame(x, y, w, h, P.W); rect(x + 1, y + 1, w - 2, h - 2, P.K);
        trainingArt(i, x + 3, y + 3, w - 6, 100, this.t);
        rect(x + 3, y + 104, w - 6, 27, cols[i]); textC(labels[i], x + w / 2, y + 107, P.W); textC(SKILL_NAMES[game.agent.skills[keys[i]]], x + w / 2, y + 117, P.YE);
      }
    },
  });
  return s;
}

// ---------- THE CHIEF ----------
function chiefScene() {
  newCase();
  const cr = game.crime;
  const txt = 'Welcome back, ' + game.agent.short + '. It looks like the bad guys are preparing for action and the President is worried. He insists that you\'re the agent for this job. Things seem to be heating up in ' + REGIONS[cr.region].name + '. We have picked up a few clues. Check them at any CIA office. Good luck ' + game.agent.short + ', you are our best hope.';
  const lines = wrap(txt, 290);
  let page = 0; const per = 5;
  return pageScene(t => {
    chiefArt(t);
    rect(0, 146, W, 54, P.K); frame(4, 147, W - 8, 51, P.W);
    lines.slice(page * per, page * per + per).forEach((l, i) => text(l, 12, 152 + i * 9, P.W));
  }, () => { page++; if (page * per >= lines.length) { game.city = 'WAS'; go(cityScene()); } });
}
function newCase() {
  Object.assign(game, { t: 0, clues: [], messages: [], news: [], taps: [], activity: {}, inside: [], caseStart: Date.now() });
  const y = 1990 + game.cases.length; game.startDate = new Date(y, ri(0, 11), ri(1, 25), 8, 0, 0);
  newCrime();
  const cr = game.crime, D = DIFFICULTY[game.diff];
  // opening clues: a few leads, more at the easy levels
  const people = shuffle(cr.people.filter(p => p.role !== 'Mastermind'));
  for (let i = 0; i < 4 - game.diff + 1; i++) clueAbout(people[i % people.length], 'Covert Surveillance');
  clueAbout(people[0], 'Informant', 'hideout');
  if (game.diff === 0) game.messages.push(Object.assign(makeMessage(cr.steps[0]), { src: 'NSA intercept' }));
}

// ---------- CITY: choose a location ----------
function locationsHere() {
  const out = [{ kind: 'cia', label: 'CIA Headquarters' }, { kind: 'airport', label: 'Airport' }, { kind: 'hotel', label: 'Hotel' }];
  for (const b of Object.values(game.buildings)) if (b.city === game.city && b.known) out.push({ kind: b.agency ? 'agency' : 'org', b, label: b.agency ? b.agency + ' office' : (b.orgKnown ? b.org.name : 'Unknown building') + ', ' + b.address });
  return out;
}
function cityScene() {
  if (game.crime && game.crime.over && !game.crime.reported) return synopsisScene();
  const city = cityById(game.city);
  const items = locationsHere().map(l => ({ label: fitText(l.label, 132), go: () => goLocation(l) }));
  items.push({ label: 'Check Data', go: () => go(dataSection(() => go(cityScene()))) });
  return locationScreen({ lines: ['You are in ' + city.name + '.', 'Where do you want to go?'], items, art: (x, y, w, h) => streetArt(x, y, w, h, city), back: () => go(pauseScene(() => go(cityScene()))) });
}
function goLocation(l) {
  advance(20);
  if (l.kind === 'cia') go(ciaScene()); else if (l.kind === 'airport') go(airportScene()); else if (l.kind === 'hotel') go(hotelScene()); else go(buildingScene(l.b));
}
function pauseScene(back) {
  return menuScene({
    menu: Menu([{ label: 'Continue', go: back }, { label: 'Sound On / Off', go: () => sfx.toggle() }, { label: 'How To Play', go: () => go(helpScene(() => go(pauseScene(back)))) }, { label: 'Save Game', go: () => { writeSave(); toast('Game saved'); } }, { label: 'Quit To Title', go: () => go(titleScene()) }], 110, 80, 110, 11),
    back,
    draw() { rect(0, 0, W, H, P.K); msgBox(96, 60, 128, 76); textC('PAUSED', W / 2, 66, P.YE); this.menu.draw(); },
  });
}

// ---------- CIA HEADQUARTERS ----------
function ciaScene() {
  const back = () => go(ciaScene());
  return locationScreen({
    lines: ['You are at CIA Headquarters.', game.city === 'WAS' ? 'Langley sends its regards.' : 'The station chief nods.', 'Do you want ...'],
    items: [
      { label: 'Data Section', go: () => go(dataSection(back)) },
      { label: 'Intelligence Section', go: () => go(intelSection(back)) },
      { label: 'Crypto Branch', go: () => go(cryptoBranch(back)) },
      { label: 'Leave', go: () => go(cityScene()) },
    ],
    art: (x, y, w, h) => embassyArt(x, y, w, h), back: () => go(cityScene()),
  });
}
function listScreen(title, rows, back, opts = {}) { // generic scrolling list of text rows with optional open action
  let sel = 0, top = 0; const vis = 18;
  return {
    t: 0, update(dt) { this.t += dt; },
    onKey(k) {
      if (k === 'menu') { back(); return; }
      if (!rows.length) { if (k === 'select' || k === 'fire') back(); return; }
      if (k === 'up') sel = Math.max(0, sel - 1); if (k === 'down') sel = Math.min(rows.length - 1, sel + 1);
      if (sel < top) top = sel; if (sel >= top + vis) top = sel - vis + 1;
      if ((k === 'select' || k === 'fire') && rows[sel].open) { sfx.select(); rows[sel].open(); }
    },
    onTap(x, y) { if (y > 188) { back(); return; } const i = top + Math.floor((y - 18) / 9); if (i >= 0 && i < rows.length) { if (i === sel && rows[i].open) rows[i].open(); sel = i; } },
    draw() {
      rect(0, 0, W, H, P.K); text(title, 8, 4, P.YE); rect(8, 12, textW(title), 1, P.YE);
      if (!rows.length) text(opts.empty || '...none', 12, 22, P.G3);
      rows.slice(top, top + vis).forEach((r, i) => { const y = 18 + i * 9, on = top + i === sel; if (on && r.open) rect(6, y - 1, W - 12, 9, P.YE); text(fitText(r.label, 250), 10, y, on && r.open ? P.G1 : r.col || P.W); if (r.right) textR(r.right, W - 10, y, on && r.open ? P.G1 : P.CY); });
      text('Esc: leave' + (rows.some(r => r.open) ? '   Enter: open' : ''), 8, 190, P.G1);
    },
  };
}
function dataSection(back) {
  const me = () => go(dataSection(back));
  return locationScreen({
    lines: ['Data Section', 'Select a file:'],
    items: [
      { label: 'Review Clues', go: () => go(reviewClues(me)) },
      { label: 'Review Suspects', go: () => go(reviewSuspects(me)) },
      { label: 'Inside Information', go: () => go(insideInfo(me)) },
      { label: 'News Bulletins', go: () => go(listScreen('News Bulletins', game.news.slice().reverse().map(n => ({ label: dayStr(n.t) + '  ' + n.text })), me, { empty: '...no news' })) },
      { label: 'Organization Summary', go: () => go(orgSummary(me)) },
      { label: 'City Summary', go: () => go(citySummary(me)) },
      { label: 'Activity Reports', go: () => go(activityReports(me)) },
      { label: 'Leave', go: back },
    ],
    art: (x, y, w, h) => terminalArt(x, y, w, h), back,
  });
}
function reviewClues(back) {
  const rows = game.clues.slice().reverse().map(c => ({ label: dayStr(c.t) + '  ' + c.heading, open: () => go(clueScreen(c, () => go(reviewClues(back)))) }));
  return listScreen('Review Clues', rows, back, { empty: '...no clues yet' });
}
function clueScreen(c, back) {
  const p = game.crime.people[c.pid];
  const related = game.clues.filter(o => o !== c && o.heading === c.heading);
  return pageScene(() => {
    rect(0, 0, W, H, P.K); msgBox(4, 4, W - 8, H - 8);
    text(c.heading, 14, 12, P.YE); rect(14, 20, textW(c.heading), 1, P.YE);
    text('Related Clues:', 14, 26, P.G3); text(related.length ? related.map(r => r.heading).slice(0, 2).join(', ') : '...none', 90, 26, P.W);
    text('Source: ' + c.source, 14, 40, P.CY); text(dayStr(c.t), 250, 40, P.G3);
    para(c.text, 14, 52, c.face ? 200 : W - 32, P.W, 9);
    text('Method: ' + c.method, 14, 150, P.G3);
    if (c.face) { frame(229, 51, 58, 70, P.G3); drawFace(p.face, 230, 52, 56, 68); }
    textC('Press a key', W / 2, 182, P.G1);
  }, back);
}
function reviewSuspects(back) {
  const ps = game.crime.people.filter(isSuspect);
  return listScreen('Review Suspects', ps.map(p => ({ label: (p.known.name ? p.name : 'Agent X') + (p.known.org ? '  (' + p.org.short + ')' : ''), right: p.status !== 'free' ? p.status.toUpperCase() : p.known.city ? cityById(p.city).name : '?', open: () => go(suspectFile(p, () => go(reviewSuspects(back)))) })), back, { empty: '...no suspects identified' });
}
function suspectFile(p, back) {
  const steps = game.crime.steps.filter(s => (s.from === p.id || s.to === p.id) && s.known);
  return pageScene(() => {
    rect(0, 0, W, H, P.K); msgBox(4, 4, W - 8, H - 8);
    frame(15, 13, 58, 70, P.G3); if (p.known.face) drawFace(p.face, 16, 14, 56, 68); else { g.save(); g.translate(16, 14); g.scale(56 / 26, 68 / 32); drawUnknownFace(0, 0); g.restore(); }
    const rows = [['Name', p.known.name ? p.name : 'unknown'], ['Organization', p.known.org ? p.org.name : 'unknown'], ['City', p.known.city ? cityById(p.city).name : 'unknown'], ['Hideout', p.known.hideout ? game.buildings[p.building].address : 'unknown'], ['Rank', p.known.org ? RANKS[p.rank] : 'unknown'], ['Role', p.known.role ? p.role : 'unknown']];
    rows.forEach(([k, v], i) => { text(k, 82, 14 + i * 10, P.G3); text(v, 150, 14 + i * 10, v === 'unknown' ? P.G1 : P.W); });
    text('Status:', 82, 76, P.G3); text(p.status === 'free' ? 'at large' : p.status, 150, 76, p.status === 'free' ? P.W : P.RD2);
    text('Messages and meetings:', 14, 92, P.YE);
    let y = 102; if (!steps.length) text('...none known', 20, y, P.G1);
    for (const s of steps.slice(0, 8)) { const o = game.crime.people[s.from === p.id ? s.to : s.from]; text((s.from === p.id ? 'to ' : 'from ') + (o.known.name ? o.name : 'Agent X') + ' (' + s.kind + ')', 20, y, P.W); y += 9; }
    if (!p.known.role) para('No evidence of involvement. An arrest will not stick.', 14, 170, W - 28, P.RD2);
  }, back);
}
function insideInfo(back) { return listScreen('Inside Information', (game.inside || []).map(x => ({ label: x.label, open: () => go(pageScene(() => { rect(0, 0, W, H, P.K); msgBox(4, 4, W - 8, H - 8); text(x.label, 14, 12, P.YE); x.draw(); }, () => go(insideInfo(back)))) })), back, { empty: '...no master plans or personnel files' }); }
function orgSummary(back) {
  const orgs = ORGS.filter(o => game.crime.people.some(p => p.org === o && p.known.org) || Object.values(game.buildings).some(b => b.org === o && b.orgKnown));
  return listScreen('Organization Summary', orgs.map(o => ({ label: o.name, open: () => go(pageScene(() => {
    rect(0, 0, W, H, P.K); msgBox(4, 4, W - 8, H - 8); text(o.name, 14, 12, P.YE);
    const allies = game.crime.orgs.filter(x => x !== o && game.crime.orgs.includes(o)).map(x => x.short);
    text('Allies:', 14, 30, P.G3); text(allies.length ? allies.join(', ') : 'none known', 110, 30, P.W);
    text('Known Locations:', 14, 44, P.G3);
    const locs = Object.values(game.buildings).filter(b => b.org === o && b.known); locs.forEach((b, i) => text('- ' + ['hideout in ', 'office in ', 'active cel in '][i % 3] + cityById(b.city).name, 110, 44 + i * 9, P.W));
    if (!locs.length) text('none', 110, 44, P.G1);
    text('Focus: ' + { crime: 'international crime', terror: 'terrorism', espionage: 'espionage' }[o.focus], 14, 150, P.G3);
  }, () => go(orgSummary(back)))) })), back, { empty: '...no organizations identified' });
}
function citySummary(back) {
  return listScreen('City Summary', regionCities(game.region).map(c => ({ label: c.name, open: () => go(pageScene(() => {
    rect(0, 0, W, H, P.K); msgBox(4, 4, W - 8, H - 8); text(c.name + ', ' + c.country, 14, 12, P.YE);
    const orgs = [...new Set(Object.values(game.buildings).filter(b => b.city === c.id && b.known && b.orgKnown && b.org).map(b => b.org.name))];
    const sus = game.crime.people.filter(p => p.known.city && p.city === c.id);
    text('Organizations:', 14, 28, P.G3); para(orgs.join(', ') || 'none known', 110, 28, 190, P.W);
    text('Suspects:', 14, 60, P.G3); para(sus.map(p => p.known.name ? p.name : 'Agent X').join(', ') || 'none known', 110, 60, 190, P.W);
    text('Clues from here:', 14, 100, P.G3); text(String(game.clues.filter(k => k.source.includes(c.name)).length), 110, 100, P.W);
  }, () => go(citySummary(back)))) })), back);
}
function activityReports(back) {
  return pageScene(() => {
    rect(0, 0, W, H, P.K); text('Activity Reports', 8, 4, P.YE); rect(8, 12, 88, 1, P.YE);
    const a = game.activity; const cities = regionCities(game.region).map(c => [c.name, a[c.id] || 0]).sort((x, y) => y[1] - x[1]).slice(0, 8);
    const orgs = ORGS.map(o => [o.name, a[o.name] || 0]).filter(x => x[1] > 0).sort((x, y) => y[1] - x[1]).slice(0, 8);
    const mx = Math.max(1, ...cities.map(c => c[1]), ...orgs.map(o => o[1]));
    text('Cities', 8, 20, P.CY); cities.forEach(([n, v], i) => { text(fitText(n, 60), 8, 30 + i * 9, P.W); rect(70, 31 + i * 9, 80 * v / mx, 6, P.RD2); });
    text('Organizations', 164, 20, P.CY); orgs.forEach(([n, v], i) => { text(fitText(n, 70), 164, 30 + i * 9, P.W); rect(238, 31 + i * 9, 76 * v / mx, 6, P.YE); });
    textC('Press a key', W / 2, 186, P.G1);
  }, back);
}
function intelSection(back) {
  const me = () => go(intelSection(back));
  const scan = (hours, local) => { advance(hours * 60); const pool = game.crime.people.filter(p => p.status === 'free' && (!local || p.city === game.city)); let c = null; if (pool.length && rnd() < (local ? 0.55 : 0.75)) c = clueAbout(pick(pool), local ? 'Local Police Report' : 'International Scan'); go(pageScene(() => { rect(0, 0, W, H, P.K); msgBox(20, 50, W - 40, 90); text(local ? 'Local Scan' : 'International Scan', 30, 58, P.YE); para(c ? c.text : 'The scan turns up nothing new.', 30, 72, W - 60, P.W); }, me)); };
  return locationScreen({
    lines: ['Intelligence Section', 'Do you want ...'],
    items: [
      { label: 'Local Scan', go: () => scan(2, true) },
      { label: 'International Scan', go: () => scan(6, false) },
      { label: 'Active Wire Taps', go: () => go(listScreen('Active Wire Taps', game.taps.filter(tp => tp.until >= dayOf(game.t)).map(tp => { const b = game.buildings[tp.key]; return { label: cityById(b.city).name + ': ' + (b.orgKnown ? (b.org ? b.org.name : b.agency) : 'unknown building') + ', ' + b.address }; }), me, { empty: '...no active taps' })) },
      { label: 'Check With Sam', go: () => go(pageScene(() => { rect(0, 0, W, H, P.K); msgBox(20, 50, W - 40, 90); text('Sam says:', 30, 58, P.YE); para(samHint(), 30, 72, W - 60, P.W); }, me)) },
      { label: 'Leave', go: back },
    ],
    art: (x, y, w, h) => terminalArt(x, y, w, h), back,
  });
}
function samHint() {
  const cr = game.crime;
  const arrestable = cr.people.find(p => p.status === 'free' && p.known.role && p.known.hideout);
  if (arrestable) return 'We have the goods on ' + who(arrestable) + '. The ' + arrestable.org.name + ' building at ' + game.buildings[arrestable.building].address + ', ' + cityById(arrestable.city).name + ' is where to grab him.';
  if (game.messages.length) return 'There are coded messages waiting in the Crypto Branch. Decoded messages give us the roles we need for arrests.';
  const hid = cr.people.find(p => p.status === 'free' && p.known.hideout);
  if (hid) return 'Try a wiretap or a break-in at ' + game.buildings[hid.building].address + ' in ' + cityById(hid.city).name + '.';
  const busy = Object.entries(game.activity).filter(([k]) => cityById(k)).sort((a, b) => b[1] - a[1])[0];
  return busy ? 'The Activity Reports point at ' + cityById(busy[0]).name + '. I would start there.' : 'Run an International Scan. We need a lead.';
}
function cryptoBranch(back) {
  const me = () => go(cryptoBranch(back));
  return locationScreen({
    lines: ['Crypto Branch', 'Do you want ...'],
    items: [
      { label: 'Coded Messages', right: String(game.messages.filter(m => !m.decoded).length), go: () => go(listScreen('Coded Messages', game.messages.filter(m => !m.decoded).map(m => ({ label: 'Msg# ' + m.id + '  ' + dayStr(m.t), right: m.src, open: () => startCrypto(m) })), me, { empty: '...no coded messages' })) },
      { label: 'Crime Chronology', go: () => go(listScreen('Crime Chronology', game.crime.steps.filter(s => s.known).sort((a, b) => a.day - b.day).map(s => { const a = game.crime.people[s.from], b = s.to !== undefined ? game.crime.people[s.to] : null; return { label: dayStr(dayToT(s.day)) + '  ' + (a.known.name ? a.name : 'Agent X') + (s.kind === 'item' ? ' obtained ' + s.item : (s.kind === 'meeting' ? ' met ' : ' messaged ') + (b.known.name ? b.name : 'Agent X')) }; }), me, { empty: '...nothing established' })) },
      { label: 'Leave', go: back },
    ],
    art: (x, y, w, h) => terminalArt(x, y, w, h), back,
  });
}

// ---------- AIRPORT ----------
function airportScene() {
  const here = cityById(game.city);
  const dests = (game.city === 'WAS' ? regionCities(game.region) : [cityById('WAS'), ...regionCities(game.region)]).filter(c => c.id !== game.city);
  let flying = null;
  const items = dests.map(c => ({ label: c.name, go: () => { flying = { to: c, t: 0 }; sfx.tone(300, 1.4, 'sawtooth', 0.03, 200); } }));
  items.push({ label: 'Stay here', go: () => go(cityScene()) }, { label: 'Check Data', go: () => go(dataSection(() => go(airportScene()))) });
  const s = menuScene({
    menu: Menu(items, 12, 64, 100, 9), back: () => go(cityScene()),
    update(dt) { this.t += dt; if (flying) { flying.t += dt / 2; if (flying.t >= 1) { const h = Math.round(2 + dist(here.lon, here.lat, flying.to.lon, flying.to.lat) / 8); advance(h * 60); game.city = flying.to.id; go(cityScene()); } } },
    onKey(k) { if (flying) return; if (k === 'menu') go(cityScene()); else this.menu.key(k); },
    draw() {
      rect(0, 0, W, H, P.K);
      const reg = game.city === 'WAS' ? 'americas' : game.region; drawRegionMap(game.city === 'WAS' ? game.region : game.region, 120, 30, 196, 164, here, dests, this.menu.items[this.menu.sel], flying, this.t);
      locPlate(here.name + ', ' + here.country);
      text('You are at the airport.', 10, 34, P.W); text('Fly to ...', 10, 44, P.W);
      this.menu.draw();
      textC(REGIONS[game.region].name.replace('the ', '') + ' World Map', 218, 20, P.G3);
    },
  });
  return s;
}

// ---------- HOTEL ----------
function hotelScene() {
  return locationScreen({
    lines: ['You are at the hotel.', 'Do you want to ...'],
    items: [
      { label: 'Leave', go: () => go(cityScene()) },
      { label: 'Sleep', go: () => go(sleepScene()) },
      { label: 'Hang Out In The Lounge', go: () => { advance(180); const pool = game.crime.people.filter(p => p.status === 'free' && p.city === game.city); const c = pool.length && rnd() < 0.6 ? clueAbout(pick(pool), 'Local Gossip') : null; game.heat = (game.heat || 0) + 1; go(pageScene(() => { rect(0, 0, W, H, P.K); msgBox(20, 50, W - 40, 90); text('In the lounge', 30, 58, P.YE); para(c ? 'A bartender with a long memory mentions something. ' + c.text : 'Nothing but tourists and piano music. Somebody at the bar is watching you, though.', 30, 72, W - 60, P.W); }, () => go(hotelScene()))); } },
      { label: 'Save Game', go: () => { writeSave(); toast('Game saved under "' + game.agent.codename + '"'); } },
      { label: 'Quit', go: () => go(titleScene()) },
    ],
    art: (x, y, w, h) => hotelArt(x, y, w, h), back: () => go(cityScene()),
  });
}
function sleepScene() {
  return pageScene(t => {
    rect(0, 0, W, H, P.K); msgBox(30, 60, W - 60, 70);
    para('You sleep. The investigation is over and the crime will play out without you.\n\nPress a key to wake up and hear the news.', 42, 70, W - 84, P.W);
  }, () => { const cr = game.crime; while (!cr.over) advance(1440); go(synopsisScene()); });
}

// ---------- SAVES ----------
function writeSave() { try { localStorage.setItem('covert-action-save', JSON.stringify({ agent: game.agent, diff: game.diff, rank: game.rank, careerPoints: game.careerPoints, cases: game.cases, masterminds: ORGS.map(o => o.mastermindFree) })); } catch (e) {} }
function loadSave() { try { return JSON.parse(localStorage.getItem('covert-action-save')); } catch (e) { return null; } }
function restoreSave(s) { Object.assign(game, { agent: s.agent, diff: s.diff, rank: s.rank, careerPoints: s.careerPoints, cases: s.cases || [] }); (s.masterminds || []).forEach((f, i) => ORGS[i].mastermindFree = f); newCase(); game.city = 'WAS'; }

// ---------- ARRESTS & INTERROGATION ----------
function arrestResult(p, how) {
  const cr = game.crime;
  if (!p.known.role) { p.exists = true; learn(p, 'face'); learn(p, 'name'); return pageScene(() => { rect(0, 0, W, H, P.K); drawFace(p.face, 20, 30, 52, 64); msgBox(84, 30, W - 100, 100); text('RELEASED', 94, 38, P.RD2); para(p.name + ' has been released for lack of evidence. Without proof of a role in the crime, the arrest will not stick.', 94, 52, W - 120, P.W); }, () => go(cityScene())); }
  p.status = 'arrested'; FACET_ORDER.forEach(f => learn(p, f));
  if (p.role === 'Mastermind') p.org.mastermindFree = false;
  const told = [];
  const contacts = cr.steps.filter(s => (s.from === p.id || s.to === p.id)).map(s => cr.people[s.from === p.id ? s.to : s.from]).filter(Boolean);
  for (const q of contacts) { if (isSuspect(q) && told.length < 3) { const c = clueAbout(q, 'Interrogation'); if (c) told.push(c.text); if (rnd() < 0.5 && !q.known.role) { const r = clueAbout(q, 'Interrogation', 'role'); if (r) told.push(r.text); } } }
  cr.steps.filter(s => s.from === p.id || s.to === p.id).forEach(s => s.known = true);
  return pageScene(() => {
    rect(0, 0, W, H, P.K);
    vgrad(0, 0, W, 90, [P.K, P.G1]); disc(W / 2, 8, 3, P.YE); rect(W / 2 - 60, 74, 120, 5, P.BR);
    frame(W / 2 - 14, 33, 28, 34, P.G3); drawFace(p.face, W / 2 - 13, 34, 26, 32);
    msgBox(4, 92, W - 8, 104);
    text((how === 'car' ? 'Arrested on the road: ' : 'Arrested: ') + p.name, 14, 100, P.YE); text(p.role + ', ' + p.org.name, 14, 110, P.G3);
    let y = 124; if (!told.length) para('"I know nothing." Under interrogation the suspect only confirms what you already knew.', 14, y, W - 28, P.W);
    for (const c of told) y = para('- ' + c, 14, y, W - 28, P.W, 9) + 2;
  }, () => go(cityScene()));
}

// ---------- CASE END: synopsis, efficiency, reward ----------
function checkCaseEnd() { if (game.crime && game.crime.over && !game.crime.reported) { game.crime.reported = true; go(synopsisScene()); return true; } return false; }
function synopsisScene() {
  const cr = game.crime; cr.reported = true;
  const steps = cr.steps.slice().sort((a, b) => a.day - b.day);
  const lines = steps.map(s => { const a = cr.people[s.from], b = s.to !== undefined ? cr.people[s.to] : null; return dayStr(dayToT(s.day)) + ': ' + a.name + ' (' + a.org.short + ') ' + (s.kind === 'item' ? 'obtained the ' + s.item : (s.kind === 'meeting' ? 'met ' : 'sent a message to ') + b.name) + (s.blocked ? ' - stopped' : ''); });
  lines.push(dayStr(dayToT(cr.endDay)) + ': ' + (cr.prevented ? 'The conspiracy falls apart.' : 'The ' + cr.kind.toLowerCase() + ' goes ahead: the plan to ' + cr.verb + ' succeeds.'));
  let page = 0; const per = 8;
  return pageScene(() => {
    rect(0, 0, W, H, P.K); text('Synopsis', 8, 4, P.YE); rect(8, 12, 44, 1, P.YE); text('The Case of the ' + cr.object, 70, 4, P.W);
    let y = 20; for (const l of lines.slice(page * per, page * per + per)) { y = para(l, 10, y, 220, P.W, 9) + 3; }
    cr.people.slice(0, 10).forEach((p, i) => { const x = 238 + (i % 3) * 27, yy = 20 + Math.floor(i / 3) * 36; drawFace(p.face, x, yy, 24, 30); if (p.status === 'arrested') { rect(x, yy + 24, 24, 6, P.RD); text('JAIL', x + 2, yy + 24, P.W); } });
    textC('Press a key', W / 2, 190, P.G1);
  }, () => { page++; if (page * per >= lines.length) go(efficiencyScene()); });
}
function efficiencyScene() {
  const cr = game.crime, pts = efficiency(); const pct = Math.round(pts / 10);
  game.careerPoints += pts; const oldRank = game.rank; game.rank = Math.min(RANKS.length - 1, Math.floor(game.careerPoints / 900));
  if (!game.cases.find(c => c.t === game.caseStart)) game.cases.push({ t: game.caseStart, object: cr.object, prevented: cr.prevented, pts });
  const reward = pct < 25 ? 0 : pct < 50 ? 1 : pct < 75 || !cr.prevented ? 2 : 3;
  return pageScene(t => {
    rect(0, 0, W, H, P.K); rewardArt(reward, 0, 0, W, 120, t);
    msgBox(4, 122, W - 8, 74);
    text('Efficiency Report', 14, 128, P.YE); textR(pts + ' points  (' + pct + '%)', W - 14, 128, P.W);
    const arrested = cr.people.filter(p => p.status === 'arrested').length;
    text('Participants identified: ' + cr.people.filter(p => p.known.name).length + '/' + cr.people.length + '    Arrested: ' + arrested, 14, 140, P.W);
    text(cr.prevented ? 'Crime prevented.' : 'The crime was committed.', 14, 150, cr.prevented ? P.GR2 : P.RD2);
    if (cr.people[cr.mastermind].status === 'arrested') text('The Mastermind is behind bars!', 150, 150, P.YE);
    text('Rank: ' + RANKS[game.rank] + (game.rank > oldRank ? '  - PROMOTED!' : ''), 14, 162, P.CY);
    para(['Saturday night at the laundromat. Maybe next time.', 'Another week hanging around the office.', 'The Agency sends you to the beach for a well-earned rest.', 'A casino in Monaco, and company to match. Well done, ' + game.agent.short + '.'][reward], 14, 174, W - 28, P.G3);
  }, () => go(endOptionsScene()));
}
function endOptionsScene() {
  const done = ORGS.filter(o => !o.mastermindFree).length;
  return menuScene({
    menu: Menu([
      { label: 'Review Reports', go: () => go(dataSection(() => go(endOptionsScene()))) },
      { label: 'Continue Game', go: () => go(chiefScene()) },
      { label: 'Save Game', go: () => { writeSave(); toast('Game saved'); } },
      { label: 'End The Game', go: () => go(titleScene()) },
    ], 110, 90, 110, 11),
    draw() { rect(0, 0, W, H, P.K); textC('End Game Options', W / 2, 60, P.W); rect(W / 2 - 44, 69, 88, 1, P.W); this.menu.draw(); textC('Masterminds arrested: ' + done + ' of 26', W / 2, 150, P.CY); },
  });
}
