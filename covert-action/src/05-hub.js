// ===================================================================
// HUB: every menu-driven screen, laid out after the 1990 EGA original
// ===================================================================

// ---------- the menu idiom: white header, light gray options, yellow bar, white flash ----------
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
        if (on && !this.cyan) rect(this.x - 8, iy - 1, this.w, 9, this.flash ? P.W : P.YE);
        text(it.label, this.x, iy, it.off ? P.G1 : on && this.cyan ? P.CY : P.G3);
        if (it.right) textR(it.right, this.x + this.w - 12, iy, on && !this.cyan ? P.G1 : P.CY);
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
// popup box: black with a 1-px light gray frame
function msgBox(x, y, w, h) { rect(x, y, w, h, P.K); frame(x, y, w, h, P.G3); }
function popup(lines, x = 40, y = 60, w = 240) { const ls = lines.flatMap(l => wrap(l, w - 16)); msgBox(x, y, w, ls.length * 8 + 12); ls.forEach((l, i) => text(l, x + 8, y + 6 + i * 8, P.W)); }
// the location/time status box, 164x26
function statusBox(y, cityName) {
  cityName = cityName || (cityById(game.city).name + (game.city === 'WAS' ? ', D.C.' : ''));
  rect(0, y, 164, 26, P.G1); rect(0, y, 164, 1, P.G3); rect(0, y, 1, 26, P.G3); frame(0, y, 164, 26, P.G1); rect(163, y, 1, 26, P.K); rect(0, y + 25, 164, 1, P.K);
  rect(4, y + 2, 156, 10, P.K); textC(cityName, 82, y + 3, P.GR2);
  rect(15, y + 13, 134, 11, P.K); rect(15, y + 13, 134, 1, P.G1); rect(15, y + 13, 1, 11, P.G1); rect(15, y + 23, 134, 1, P.G3); rect(148, y + 13, 1, 11, P.G3);
  textC(clockStr(), 82, y + 15, P.GR2);
  for (const x of [3, 5, 157, 159]) rect(x, y + 14, 1, 9, P.G3);
}
// city menu: black screen, menu top-left, framed city picture bottom-right, status box bottom-left
function cityLayout({ header, items, pic, caption, back }) {
  const s = menuScene({ menu: Menu(items, 27, 14 + header.length * 8, 128), back,
    draw() { rect(0, 0, W, H, P.K); header.forEach((l, i) => text(l, 21, 14 + i * 8, P.W)); this.menu.draw();
      if (pic) { textC(caption, 240, 106, P.W); frame(174, 115, 132, 50, P.W); g.save(); g.beginPath(); g.rect(175, 116, 130, 48); g.clip(); pic(175, 116, 130, 48, this.t); g.restore(); }
      statusBox(174); } });
  return s;
}
// split screen: text and menu on the black left half, a painted scene on the right, status box bottom-left
function splitLayout({ header, items, art, back, floor, text: body }) {
  return menuScene({ menu: items ? Menu(items, 23, 20 + header.length * 8 + (body ? wrap(body, 140).length * 8 + 4 : 0), 136) : null, back,
    draw() { rect(0, 0, W, H, P.K); g.save(); g.beginPath(); g.rect(170, 0, 150, 200); g.clip(); art(170, 0, 150, 200, this.t); g.restore();
      if (floor !== undefined) { rect(170, 0, 150, 11, P.G1); ['L', '1', '2', '3'].forEach((c, i) => text(c, 186 + i * 36, 2, i === floor ? P.YE : P.GR)); }
      header.forEach((l, i) => text(l, 15, 20 + i * 8, P.W)); if (body) para(body, 15, 20 + header.length * 8 + 2, 140, P.W, 8);
      this.menu && this.menu.draw(); statusBox(174); } });
}
// full-screen picture with a boxed menu over it
function boxLayout({ header, items, art, back, box = [16, 40, 122] }) {
  const [bx, by, bw] = box;
  return menuScene({ menu: Menu(items, bx + 14, by + 6 + header.length * 8, bw - 12), back,
    draw() { art(0, 0, W, H, this.t); msgBox(bx, by, bw, header.length * 8 + items.length * 8 + 12); header.forEach((l, i) => text(l, bx + 6, by + 5 + i * 8, P.W)); this.menu.draw(); } });
}

// ---------- file folders on a brown desk ----------
const FOLDER = { clue: P.YE, newclue: P.BL2, docs: P.G3, news: P.YE, org: P.RD2, city: P.GR, suspect: P.TL, career: P.BL, report: P.YE };
function folder(col, tab, sheet = true) {
  rect(0, 0, W, H, P.BR); rect(1, 11, 318, 189, col);
  // tab: angled ends
  rect(160, 1, 158, 10, col); for (let i = 0; i < 10; i++) { px(160 - 10 + i, 11 - i, P.K); px(318 + 10 - i - 10, 1 + i, P.G1); }
  g.fillStyle = col; g.beginPath(); g.moveTo(150, 11); g.lineTo(160, 1); g.lineTo(318, 1); g.lineTo(318, 11); g.fill(); line(150, 11, 160, 1, P.K); rect(160, 1, 158, 1, P.K);
  const tw = textW(tab) + 8; rect(318 - 18 - tw, 3, tw, 8, P.G3); text(tab, 318 - 14 - tw, 3, P.K);
  if (sheet) { rect(6, 16, 307, 184, P.W); rect(6, 16, 307, 1, P.G3); rect(6, 16, 1, 184, P.G3); rect(312, 16, 1, 184, P.G1); }
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
      folder(col, tab);
      if (!rows.length) text(opts.empty || '...none', 14, 22, P.G1);
      rows.slice(top, top + vis).forEach((r, i) => { const y = 22 + i * 8, on = top + i === sel; if (on && rows.some(q => q.open)) rect(10, y - 1, 298, 9, P.YE); text(fitText(r.label, 230), 14, y, r.col || P.K); if (r.right) textR(fitText(r.right, 70), 304, y, r.rcol || P.BL); });
      if (rows.length > vis) textR((top + 1) + '-' + Math.min(rows.length, top + vis) + ' of ' + rows.length, 304, 190, P.G1);
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
    draw() { rect(0, 0, W, H, P.K); text(s.step ? 'Practice which skill?' : 'Which difficulty level?', 110, 78, P.W); this.menu.draw(); } });
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
      rect(15, 0, 56, 200, P.BL); rect(15, 0, 1, 200, P.W); rect(70, 0, 1, 200, P.W); drawMaxFigure(43, 190, 'm', sex === 'm' || step === 0);
      rect(245, 0, 56, 200, P.RD); rect(245, 0, 1, 200, P.W); rect(300, 0, 1, 200, P.W); drawMaxFigure(273, 190, 'f', sex === 'f' || step === 0);
      if (step === 0) { text('Select one...', 104, 62, P.W); this.menu.draw(); }
      if (step === 1) {
        rect(84, 70, 152, 40, P.G1); frame(84, 70, 152, 40, P.G3); textC((sex === 'f' ? 'Maxine' : 'Max') + "'s code name is:", 160, 74, P.GR2);
        rect(94, 86, 132, 14, P.K); text(name, 98, 89, P.GR2); if ((this.t * 3 | 0) % 2) rect(98 + textW(name) + (name ? 1 : 0), 89, 5, 7, P.GR);
        for (let i = 0; i < 26; i++) { const x = 82 + (i % 13) * 12, y = 124 + Math.floor(i / 13) * 12; rect(x, y, 11, 11, P.G1); textC(A[i], x + 5, y + 2, P.W); }
        rect(82, 150, 74, 11, P.G1); textC('Rub out', 119, 152, P.W); rect(164, 150, 74, 11, P.BL); textC('Done', 201, 152, P.YE);
      }
      if (step === 2) { text('Which difficulty level?', 104, 62, P.W); this.menu.draw(); para(['Special help for first-time agents.', 'More suspects, fewer clues.', 'Alert guards, harder codes and circuits.', 'Red herrings, no word spaces, deadly guards.'][this.menu.sel], 90, 110, 140, P.G3, 8); }
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
    back, draw() { rect(0, 0, W, H, P.K); msgBox(100, 60, 124, 60); text('Do you want to...', 106, 64, P.W); this.menu.draw(); },
  });
}

// ---------- CIA BUILDING ----------
function ciaArrive() {
  game.ciaFloor = 0;
  if (game.ciaVisited[game.city]) return ciaFloors();
  game.ciaVisited[game.city] = true;
  return pageScene(t => { rect(0, 0, W, H, P.K); ciaLobbyArt(170, 0, 150, 200, t); rect(170, 0, 150, 11, P.G1); ['L', '1', '2', '3'].forEach((c, i) => text(c, 186 + i * 36, 2, i === 0 ? P.YE : P.GR)); para('You arrive at the CIA building and check with your contact.', 15, 20, 140, P.W, 8); statusBox(174); }, () => go(ciaFloors()));
}
// the lift: doors shut, the indicator steps floor by floor, ding, doors open
function ride(floor, next) { const from = game.ciaFloor || 0; game.ciaFloor = floor; go(liftScene(from, floor, next)); }
function ciaFloors() {
  return menuScene({
    menu: Menu([{ label: '1. Data Section', go: () => ride(1, () => go(dataSection(() => go(ciaFloors())))) }, { label: '2. Intelligence Section', go: () => ride(2, () => go(intelSection(() => go(ciaFloors())))) }, { label: '3. Crypto Branch', go: () => ride(3, () => go(cryptoBranch(() => go(ciaFloors())))) }, { label: 'Leave building', go: () => ride(0, () => go(cityScene())) }], 27, 30, 146),
    back: () => go(cityScene()),
    draw() { rect(0, 0, W, H, P.K); g.save(); g.beginPath(); g.rect(170, 0, 150, 200); g.clip(); g.translate(170, 0); liftArt(0, 0, 150, 200, this.t, game.ciaFloor || 0, 1, 0, [1, 2, 3, 0][this.menu.sel]); g.restore(); text('You are in the CIA building.', 21, 14, P.W); text('Which floor ?', 21, 22, P.W); this.menu.draw(); statusBox(174); },
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
function methodIcon(m, x, y) {
  frame(x, y, 26, 22, P.K);
  if (/Computer|INTERPOL|Scan/.test(m)) { rect(x + 1, y + 1, 24, 20, P.BL); rect(x + 5, y + 4, 16, 10, P.G3); rect(x + 7, y + 6, 12, 6, P.TL); rect(x + 4, y + 16, 18, 3, P.G3); }
  else if (/Photograph|Document|Tap/.test(m)) { rect(x + 1, y + 1, 24, 20, P.TL); rect(x + 7, y + 3, 12, 16, P.G3); rect(x + 9, y + 6, 8, 1, P.K); rect(x + 9, y + 12, 8, 1, P.K); }
  else { rect(x + 1, y + 1, 24, 20, P.K); disc(x + 8, y + 11, 4, P.G1); disc(x + 18, y + 11, 4, P.G1); disc(x + 8, y + 11, 2, P.BL2); disc(x + 18, y + 11, 2, P.BL2); }
}
function clueScreen(c, back) {
  const p = game.crime.people[c.pid];
  const related = game.clues.filter(o => o !== c && o.pid === c.pid).slice(-2);
  return pageScene(() => {
    folder(FOLDER.clue, 'Clue');
    text('Source: ' + c.source, 12, 20, P.G3);
    const y = para(c.text, 12, 28, c.face ? 240 : 260, P.K, 8);
    text('Method: ' + c.method, 12, y + 1, P.G3);
    if (c.face) { rect(262, 18, 40, 46, P.W); frame(262, 18, 40, 46, P.G3); drawFace(p.face, 266, 22, 32, 38); rect(300, 16, 3, 14, P.G3); rect(301, 17, 1, 12, P.W); } else methodIcon(c.method, 274, 20);
    text('Related Clues:', 12, 92, P.RD2);
    if (!related.length) text('...none', 12, 100, P.K);
    if (c.lie && game.crime.double && game.crime.double.caught) { g.save(); g.translate(200, 70); g.rotate(-0.2); frame(-50, -8, 100, 16, P.RD); textC('DISINFORMATION', 0, -4, P.RD); g.restore(); }
    related.forEach((r, i) => { const yy = 102 + i * 36; rect(10, yy, 298, 34, P.W); frame(10, yy, 298, 34, P.G3); text('Source: ' + r.source, 14, yy + 3, P.G3); para(r.text, 14, yy + 11, 288, P.K, 8); });
  }, back);
}
function reviewSuspects(back) {
  const ps = game.crime.people.filter(isSuspect);
  return folderList('Suspect Files', FOLDER.docs, ps.map(p => ({ label: p.known.name ? p.name : 'Agent ' + String.fromCharCode(65 + p.id), right: p.status !== 'free' ? p.status : p.known.city ? shownCity(p).name : '', rcol: p.status !== 'free' ? P.RD : P.BL, open: () => go(suspectFile(p, () => go(reviewSuspects(back)))) })), back, { empty: '...no suspects identified' });
}
function suspectFile(p, back) {
  const steps = game.crime.steps.filter(s => (s.from === p.id || s.to === p.id) && s.known);
  return pageScene(() => {
    folder(FOLDER.suspect, 'Suspect File');
    rect(14, 22, 52, 62, P.W); frame(14, 22, 52, 62, P.G3); if (p.known.face) drawFace(p.face, 18, 26, 44, 54); else { rect(18, 26, 44, 54, P.TL); g.save(); g.translate(18, 26); g.scale(44 / 26, 54 / 32); drawUnknownFace(0, 0); g.restore(); }
    const rows = [['Name:', p.known.name ? p.name : 'Agent ' + String.fromCharCode(65 + p.id)], ['Org:', p.known.org ? p.org.name : 'unknown'], ['City:', p.known.city ? shownCity(p).name : 'unknown'], ['Hideout:', p.known.hideout ? game.buildings[p.building].address : 'unknown'], ['Rank:', p.known.org ? RANKS[p.rank] : 'unknown'], ['Role:', p.known.role ? p.role : 'unknown']];
    rows.forEach(([k, v], i) => { text(k, 74, 22 + i * 10, P.K); text(v, 120, 22 + i * 10, v === 'unknown' ? P.G1 : P.K); rect(120, 30 + i * 10, 180, 1, P.RD2); });
    if (p.status !== 'free') { rect(200, 84, 100, 12, P.RD); textC(p.status.toUpperCase(), 250, 86, P.W); }
    rect(16, 100, 264, 60, P.TL); frame(16, 100, 264, 60, P.CY);
    text('MESSAGES AND MEETINGS', 22, 104, P.CY);
    if (!steps.length) text('...none known', 22, 114, P.W);
    steps.slice(0, 5).forEach((s, i) => { const o = game.crime.people[s.from === p.id ? s.to : s.from]; text(fitText((s.from === p.id ? 'to ' : 'from ') + (o.known.name ? o.name : 'Agent ' + String.fromCharCode(65 + o.id)) + ' (' + s.kind + ')', 250), 22, 114 + i * 8, P.W); });
    if (!p.known.role) text('No evidence of involvement - an arrest will not stick.', 16, 168, P.RD);
  }, back);
}
function insideInfo(back) { return folderList('Documents', FOLDER.docs, (game.inside || []).map(x => ({ label: x.label, open: () => go(pageScene(() => { folder(P.G3, x.tab || 'Documents'); x.draw(); }, () => go(insideInfo(back)))) })), back, { empty: '...no master plans or personnel files' }); }
function orgSummary(back) {
  const orgs = ORGS.filter(o => game.crime.people.some(p => p.org === o && p.known.org) || Object.values(game.buildings).some(b => b.org === o && b.orgKnown));
  return folderList('Organizations', FOLDER.org, orgs.map(o => ({ label: o.name, open: () => go(pageScene(() => {
    folder(FOLDER.org, o.short); textC(o.name, 160, 22, P.K); rect(160 - textW(o.name) / 2, 30, textW(o.name), 1, P.RD);
    const allies = game.crime.orgs.includes(o) ? game.crime.orgs.filter(x => x !== o).map(x => x.short) : [];
    const assoc = ORGS.filter(x => x !== o && x.focus === o.focus && x.regions.some(r => o.regions.includes(r))).slice(0, 4).map(x => x.short);
    text('Allies:', 16, 40, P.K); text(allies.join(', ') || 'none known', 100, 40, P.G1);
    text('Associates:', 16, 50, P.K); text(assoc.join(', ') || 'none', 100, 50, P.G1);
    text('Known Locations:', 16, 64, P.K);
    const locs = Object.values(game.buildings).filter(b => b.org === o && b.known); locs.forEach((b, i) => text('- ' + b.type + ' in ' + cityById(b.city).name, 100, 64 + i * 8, P.G1));
    if (!locs.length) text('none', 100, 64, P.G1);
  }, () => go(orgSummary(back)))) })), back, { empty: '...no organizations identified' });
}
function citySummary(back) {
  return folderList('Cities', FOLDER.city, regionCities(game.region).map(c => ({ label: c.name, open: () => go(pageScene(() => {
    folder(FOLDER.city, c.name); textC(c.name + ', ' + c.country, 160, 22, P.K);
    const orgs = [...new Set(Object.values(game.buildings).filter(b => b.city === c.id && b.known && (b.orgKnown || b.agency)).map(b => b.agency || b.org.name))];
    const sus = game.crime.people.filter(p => p.known.city && shownCity(p) === c);
    text('Organizations:', 16, 40, P.K); para(orgs.join(', ') || 'none known', 110, 40, 190, P.G1, 8);
    text('Suspects:', 16, 76, P.K); para(sus.map(p => p.known.name ? p.name : 'Agent ' + String.fromCharCode(65 + p.id)).join(', ') || 'none known', 110, 76, 190, P.G1, 8);
    text('Clues:', 16, 112, P.K); text(String(game.clues.filter(k => k.source.includes(c.name)).length), 110, 112, P.G1);
  }, () => go(citySummary(back)))) })), back);
}
function activityReports(back) {
  return pageScene(() => {
    rect(0, 0, W, H, P.BL); frame(0, 0, W, H, P.BL2); textC('Activity Report Summary', W / 2, 5, P.W);
    const a = game.activity; const cities = regionCities(game.region).concat([cityById('WAS')]);
    const mx = Math.max(1, ...Object.values(a));
    cities.slice(0, 21).forEach((c, i) => { text(c.name, 3, 17 + i * 8, P.TL); rect(82, 18 + i * 8, Math.max(2, 70 * (a[c.id] || 0) / mx), 5, P.CY); });
    const orgs = ['CIA', 'MI6', 'Mossad', 'KGB'].map(n => ({ short: n.replace('Mossad', 'Mossd'), name: n })).concat(ORGS.filter(o => o.regions.includes(game.region)).map(o => ({ short: o.short, name: o.name })));
    orgs.slice(0, 21).forEach((o, i) => { text(o.short, 162, 17 + i * 8, P.RD2); rect(242, 18 + i * 8, Math.max(2, 70 * (a[o.name] || 0) / mx), 5, P.YE); });
  }, back);
}
function intelSection(back) {
  const me = () => go(intelSection(back));
  const scan = (hours, local) => { advance(hours * 60); const pool = game.crime.people.filter(p => p.status === 'free' && (!local || p.city === game.city)); let c = null; if (pool.length && rnd() < (local ? 0.55 : 0.75)) c = clueAbout(pick(pool), local ? 'Local Police Report' : 'INTERPOL Data Base'); go(c ? clueScreen(c, me) : pageScene(() => { rect(0, 0, W, H, P.K); popup([(local ? 'Local Scan' : 'International Scan') + ' complete.', 'Nothing new turned up.']); }, me)); };
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
      drawRegionMap(game.region, 1, 0, 188, 200, here, dests, this.menu.items[this.menu.sel].city, flying, this.t);
      rect(0, 0, 1, H, P.W); rect(190, 0, 2, H, P.W);
      text("You're in " + here.name, 196, 4, P.W); text('Do you travel to ...', 196, 12, P.W);
      this.menu.draw();
    },
  });
  return s;
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
    folder(P.BL, 'Hall of Fame'); textC('COVERT ACTION', 160, 20, P.K); textC('HALL OF FAME', 160, 28, P.K); rect(110, 36, 100, 1, P.YE);
    for (let i = 0; i < 5; i++) { const y = 42 + i * 30, e = h[i]; rect(10 + i, y, 298 - i, 28, e && i === 0 ? P.YE : P.W); frame(10 + i, y, 298 - i, 28, P.G3); if (e) { text((i + 1) + '. Max \'' + e.name.toUpperCase() + '\' Remington,  Case #' + e.cases + ' ' + e.date, 14 + i, y + 3, P.K); text(e.crime, 14 + i, y + 11, P.BL2); text('EP: ' + e.ep + '   ---  SCORE: ' + e.score + ' ---', 14 + i, y + 19, P.K); } else text('---', 16 + i, y + 10, P.K); }
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
    rect(0, 0, W, H, P.BL);
    cards.forEach((p, k) => { const x = (k % 5) * 64, y = Math.floor(k / 5) * 40; const s = steps[i]; const active = s && (s.from === p.id || s.to === p.id); rect(x, y, 62, 38, k % 2 ? P.BL : P.BL2); text(fitText(p.role, 40), x + 2, y + 1, active ? P.PK : P.K); if (isSuspect(p) || cr.over) drawFace(p.face, x + 34, y + 6, 26, 32); if (p.status === 'arrested') { rect(x + 2, y + 28, 30, 7, P.RD); text('JAIL', x + 5, y + 28, P.W); } });
    if (cards.length < 10) rect((cards.length % 5) * 64, Math.floor(cards.length / 5) * 40, W, 40, P.G3);
    rect(6, 88, 228, 64, P.BL2); frame(6, 88, 228, 64, P.BL);
    if (i < steps.length) {
      const s = steps[i], a = cr.people[s.from], b = s.to !== undefined ? cr.people[s.to] : null;
      textC(dayStr(dayToT(s.day)), 120, 91, P.G3);
      const l1 = nm(a), l2 = s.kind === 'item' ? 'obtained the ' + s.item : s.kind === 'meeting' ? 'met with' : 'sent message to';
      textC(fitText(l1, 220), 120, 100, P.W); textC(l2, 120, 108, P.W); if (b) textC(fitText(nm(b), 220), 120, 116, P.W);
      rect(12, 126, 216, 1, P.G3); if (s.blocked) textC('- stopped by your arrests -', 120, 130, P.YE); else if (s.kind !== 'item') textC('"' + fitText(pick(['Proceed as planned.', 'The package is ready.', 'Wait for my signal.', 'Trust no one.']), 200) + '"', 120, 130, P.YE);
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
    E.rows.forEach((r, k) => { const y = 14 + k * 9; if (y > 170) return; rect(8 + (k % 3), y, 304 - (k % 3), 9, P.W); frame(8 + (k % 3), y, 304 - (k % 3), 9, P.G3); text(r.status, 16, y + 1, P.RD2); text(fitText(r.label, 110), 118, y + 1, r.crime ? P.RD : P.K); textR('EP:' + r.ep + '/' + r.max, 306, y + 1, r.crime ? P.RD : P.BL); });
    const y = Math.min(178, 16 + E.rows.length * 9); rect(8, y, 304, 20, P.W); frame(8, y, 304, 20, P.G3); text('Efficiency Rating', 118, y + 2, P.K); textR('EP:' + E.got + '/' + E.max, 306, y + 2, P.BL); textC('--- ' + pts + ' ---', 160, y + 11, P.K);
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
      game.cases.slice(-6).forEach((c, i) => { const y = 42 + i * 14; text('Case #' + (game.cases.length - Math.min(6, game.cases.length) + i + 1) + '.  Arrests: ' + c.arrests + '  EP: ' + c.pts, 14, y, P.K); text((c.prevented ? '... stopped ' : "... couldn't stop ") + c.kind + '/' + c.object, 14, y + 7, P.G3); });
      rect(14, 128, 290, 1, P.G1); text('Arrested:  MasterMinds: ' + done + ' of 26', 14, 132, P.K);
      msgBox(104, 138, 124, 36); text('Do you want to...', 110, 141, P.W); this.menu.draw();
    },
  });
  return s;
}
