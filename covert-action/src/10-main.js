// ===================================================================
// MAIN: enemy buildings, watching, and the glue to the action sequences
// ===================================================================
let practiceMode = false;
function occupantOf(b) { if (!b || b.suspect === null || b.suspect === undefined) return null; const p = game.crime.people[b.suspect]; return p && p.status === 'free' ? p : null; }
function guardWords(b) { const a = (b.alert || 0) + game.diff; return a <= 0 ? 'The building looks quiet.' : a <= 2 ? 'There are a few guards around.' : 'The building is swarming with guards.'; }
function buildingName(b) { return b.agency ? 'the ' + b.agency + ' office' : b.orgKnown ? 'the ' + b.org.name + ' hideout' : 'the unknown building'; }

function buildingScene(b) {
  const back = () => go(buildingScene(b));
  const items = [{ label: 'Place wiretap', go: () => startWiretap(b) }];
  if (!b.agency) items.push({ label: 'Break into building', go: () => startBreakin(b) }, { label: 'Watch the building', go: () => go(watchScene(b)) });
  items.push({ label: 'Check Data', go: () => go(dataSection(back)) }, { label: 'Leave', go: () => go(cityScene()) });
  const who_ = b.agency ? b.agency + ' ' + b.type : (b.orgKnown ? b.org.name : 'unknown') + ' ' + (b.orgKnown ? b.type : 'building');
  const header = ['You are at the', who_, guardWords(b), 'Do you ...'].flatMap(l => wrap(l, 118));
  return menuScene({ menu: Menu(items, 13, 38 + header.length * 8, 108), back: () => go(cityScene()),
    draw() { rect(0, 0, W, H, P.K); buildingArt(130, 35, 190, 165, b); statusBox(4); header.forEach((l, i) => text(l, 7, 38 + i * 8, P.W)); this.menu.draw(); } });
}

// ---------- WATCH THE BUILDING (binoculars) ----------
function watchScene(b) {
  let face = null, target = null, s;
  const next = () => {
    advance(ri(30, 90)); const p = occupantOf(b);
    if (p && rnd() < 0.35 + (b.watchT = (b.watchT || 0) + 0.1)) { target = p; face = p.face; b.watchT = 0; }
    else { target = null; face = makeFace(rnd() < 0.3 ? 'f' : 'm', cityById(b.city).lang); }
    sfx.tone(300, 0.06); s.menu = mk();
  };
  const mk = () => Menu([
    { label: 'Wait', go: next },
    { label: 'Follow car.', off: !face, go: () => startChase(b, target, face) },
    { label: 'Trace car.', off: !face, go: () => startTracer(b, target) },
    { label: 'Check Data', go: () => go(dataSection(() => go(s))) },
  ], 16, 44, 96);
  s = menuScene({ menu: null, back: () => go(buildingScene(b)), enter() { if (!s.menu) s.menu = mk(); },
    draw() {
      rect(0, 0, W, H, P.K); binocularArt(120, 0, 200, 200, b, face);
      msgBox(3, 20, 116, 62); const hd = face ? ['You notice someone', 'leaving the building.', 'Do you ...'] : ['You watch the', 'building. Do you ...'];
      hd.forEach((l, i) => text(l, 8, 23 + i * 8 - (face ? 0 : 0), P.W)); s.menu.y = 23 + hd.length * 8; s.menu.draw();
      statusBox(174);
    } });
  return s;
}

// ---------- WIRETAP & CAR TRACER ----------
function startWiretap(b) {
  advance(30);
  go(wiretapScene({ level: game.diff, mode: 'tap', alert: (b.alert || 0) + leak(b.city), label: b.address }, res => {
    const out = [];
    if (res.alarm) { b.alert = (b.alert || 0) + 1; addHeat(b.city, 1); out.push('An alarm went off. The building\'s guards are on alert now.'); }
    if (res.tapped > 0) {
      game.taps.push({ key: b.key, until: dayOf(game.t) + 2 + res.tapped });
      out.push(res.tapped + ' phone' + (res.tapped > 1 ? 's' : '') + ' tapped.');
      if (!b.agency) {
        if (!b.orgKnown) { b.orgKnown = true; out.push('The line belongs to the ' + b.org.name + '.'); }
        const p = occupantOf(b); if (p) { const c = clueAbout(p, 'Telephone Tap'); if (c) out.push(c.text); }
        if (res.tapped > 1) { const other = Object.values(game.buildings).find(o => o.org === b.org && !o.known && o.suspect !== null && o.suspect !== undefined); if (other) { other.known = true; other.orgKnown = true; out.push('Calls go to another ' + b.org.name + ' office at ' + other.address + ', ' + cityById(other.city).name + '.'); } }
      } else { const p = game.crime.people.find(q => q.city === b.city && q.status === 'free'); if (p) { const c = clueAbout(p, b.agency + ' Tap'); if (c) out.push(c.text); } else out.push('The ' + b.agency + ' line carries nothing about the case.'); }
    } else if (!res.alarm) out.push('No phones were tapped.');
    afterMission(60, () => go(report('Wiretap', out, () => go(buildingScene(b)))));
  }));
}
function startTracer(b, target) {
  go(wiretapScene({ level: game.diff, mode: 'tracer', alert: (b.alert || 0) + leak(b.city), label: 'car tracer' }, res => {
    if (!res.success) { if (res.alarm) b.alert = (b.alert || 0) + 1; afterMission(20, () => go(report('Car Tracer', [res.alarm ? 'The alarm spooks the driver. The car roars off.' : 'The car pulls away before the tracer is ready.'], () => go(watchScene(b))))); return; }
    afterMission(60, () => go(report('Car Tracer', followResult(target), () => go(buildingScene(b)))));
  }));
}
// where does a followed car go?
function followResult(p) {
  if (!p) return ['The car goes to an apartment block and the driver goes to bed. A civilian.'];
  const cr = game.crime, out = [];
  const contacts = cr.steps.filter(s => s.to !== undefined && (s.from === p.id || s.to === p.id)).map(s => cr.people[s.from === p.id ? s.to : s.from]).filter(q => q.status === 'free');
  const q = contacts.length ? pick(contacts) : p; const qb = game.buildings[q.building];
  const newLoc = !qb.known; learn(q, 'hideout'); learn(p, 'face');
  out.push('The car stops at ' + qb.address + ', ' + cityById(qb.city).name + '.' + (newLoc ? ' A new location for your files.' : ''));
  if (q !== p) { const c = clueAbout(q, 'Covert Surveillance', q.known.face ? undefined : 'face'); if (c) out.push(c.text); }
  return out;
}

// ---------- CAR CHASE ----------
function startChase(b, target, face) {
  go(carSelectScene(cars => go(chaseScene({ level: game.diff, cars, night: isNight(), target, label: target ? who(target) : 'the driver', start: b }, res => {
    if (res.arrest && target) { afterMission(90, () => go(arrestResult(target, 'car'))); return; }
    if (res.arrest && !target) { afterMission(90, () => go(report('Car Chase', ['You run the car off the road. The driver is a frightened accountant. Sorry, sir.'], () => go(cityScene())))); return; }
    const out = res.success ? followResult(target) : [res.how === 'abort' ? 'You break off the chase.' : 'You lost the car in traffic.'];
    if (res.spotted && target) { b.alert = (b.alert || 0) + 1; addHeat(b.city, 1); }
    afterMission(90, () => go(report('Car Chase', out, () => go(cityScene()))));
  }))));
}

// ---------- BREAK-IN ----------
function startBreakin(b) {
  const p = occupantOf(b);
  const words = ['Guards are lax.', 'Guards are alert.', 'Guards are very alert.', 'Guards expect trouble.'][Math.min(3, (b.alert || 0) + (game.diff > 1 ? 1 : 0))];
  go(pageScene(() => { rect(0, 0, W, H, P.K); buildingArt(150, 30, 170, 170, b); msgBox(8, 60, 136, 60); text('Breaking in...', 16, 68, P.YE); para(words + ' You will have to find your own way around.', 16, 80, 120, P.W); }, () => go(armoryScene(kit => {
    if (!b.seed) b.seed = (rnd() * 1e9) >>> 0;
    go(breakinScene(Object.assign({ level: game.diff, occupant: p, building: b, org: b.org, alert: (b.alert || 0) + leak(b.city) }, kit), res => {
      const out = res.clues.slice(); addHeat(b.city, res.alarm ? 2 : 1);
      b.alert = (b.alert || 0) + (res.alarm ? 1 : 0);
      if (res.evidence) { game.crime.delay += 2; game.crime.evidenceTaken++; out.push('You made off with the ' + res.evidence + '. That will set their plans back.'); }
      if (res.plan) { game.inside.push(masterPlan()); out.push('A master plan of the whole operation! See Inside Information.'); }
      if (res.personnel) { game.inside.push(personnelFile(b.org)); out.push('A personnel file of the ' + b.org.name + '. See Inside Information.'); }
      if (res.messages) for (let i = 0; i < res.messages; i++) { const st = pick(game.crime.steps.filter(s => s.kind !== 'item' && p && (s.from === p.id || s.to === p.id))) || pick(game.crime.steps.filter(s => s.kind !== 'item')); if (st) { game.messages.push(Object.assign(makeMessage(st), { src: 'Wall safe, ' + b.address })); out.push('A coded message from the safe - take it to the Crypto Branch.'); } }
      const mins = 45 + Math.round(res.seconds / 2);
      if (res.kind === 'captured') { afterMission(mins + 6 * 60, () => go(capturedScene(out))); return; }
      if (res.prisoner) { afterMission(mins, () => go(arrestResult(res.prisoner, 'breakin'))); return; }
      if (!out.length) out.push('You found nothing of value.');
      afterMission(mins, () => go(report('Break-In', out, () => go(cityScene()))));
    }));
  }))));
}
function masterPlan() {
  const cr = game.crime; cr.people.forEach(p => { p.exists = true; learn(p, 'face'); });
  const pos = i => [14 + (i % 5) * 60, 26 + Math.floor(i / 5) * 78];
  return { label: 'Master plan: ' + cr.object, draw() {
    // red string between everyone who meets or messages
    cr.steps.forEach(s => { if (s.to === undefined) return; const [ax, ay] = pos(s.from), [bx, by] = pos(s.to); line(ax + 20, ay + 20, bx + 20, by + 20, P.RD2); line(ax + 21, ay + 20, bx + 21, by + 20, P.RD2); });
    cr.people.forEach((p, i) => { const [x, y] = pos(i); rect(x, y, 44, 54, P.G1); rect(x - 2, y - 2, 44, 54, P.W); frame(x - 2, y - 2, 44, 54, P.G3); drawFace(p.face, x, y, 40, 50); rect(x - 2, y + 52, 44, 9, P.W); text(fitText(p.role, 56), x, y + 52, P.K); disc(x + 20, y - 2, 2, P.RD); px(x + 19, y - 3, P.W); px(x + 21, y, P.K); });
    cr.people.forEach((p, i) => { if (p.status !== 'arrested') return; const [x, y] = pos(i); uiX_stamp('ARRESTED', x + 20 - uiX_stampW('ARRESTED') / 2, y + 30, P.RD, true); });
  } };
}
function personnelFile(org) {
  const ps = game.crime.people.filter(p => p.org === org); ps.forEach(p => learn(p, 'name'));
  return { label: 'Personnel file: ' + org.name, draw() {
    text('NAME', 20, 19, P.G1); text('LOCATION', 180, 19, P.G1); rect(16, 27, 290, 1, P.K);
    ps.forEach((p, i) => { const y = 30 + i * 10; text(p.name, 20, y, P.K); g.fillStyle = P.G3; for (let x = 24 + textW(p.name); x < 176; x += 3) g.fillRect(x, y + 6, 1, 1); text(cityById(p.city).name, 180, y, P.BL); });
  } };
}

// ---------- CRYPTO ----------
function startCrypto(m) {
  go(cryptoScene(m.text, { msgNo: m.id, level: game.diff }, res => {
    const cr = game.crime, from = cr.people[m.from], to = cr.people[m.to];
    advance(Math.max(30, Math.round(res.seconds || 60)) * 2 + (res.hints || 0) * 120);
    if (!res.success) { go(report('Crypto Branch', ['The message is still unreadable. It stays in the pile.'], () => go(cryptoBranch(() => go(ciaFloors()))))); return; }
    m.decoded = true; const st = cr.steps.find(s => s.from === m.from && s.to === m.to); if (st) st.known = true;
    [from, to].forEach(p => { learn(p, 'role'); learn(p, 'org'); learn(p, 'city'); p.exists = true; });
    const R = (k, v) => [k, v];
    const rows = [R('Message Source', who(from)), R("Source's Organization", from.org.name), R('Evidence Against Source', from.role), R('Message Recipient', who(to)), R("Recipient's Organization", to.org.name), R('Location of Recipient', cityById(to.city).name), R('Evidence Against Recipient', to.role)];
    go(pageScene(() => {
      folder(P.G3, 'Message Decode', true, 'DECODED'); text('Msg# ' + m.id, 14, 20, P.G1);
      rows.forEach(([k, v], i) => { const y = 30 + i * 10; text(k, 14, y, P.K); g.fillStyle = P.G3; for (let x = 17 + textW(k); x < 155; x += 2) g.fillRect(x, y + 6, 1, 1); text(fitText(v, 146), 158, y, k.startsWith('Evidence') ? P.RD : P.BL); });
      const plain = m.text.split('. ').slice(1).join('. ').toLowerCase().replace(/(^|\. )([a-z])/g, (a, b, c) => b + c.toUpperCase()), nl = wrap(plain, W - 28).length;
      const ch = Math.min(176, 118 + nl * 8 + 4) - 104; rect(12, 106, 300, ch, P.G1); rect(10, 104, 300, ch, P.W); frame(10, 104, 300, ch, P.G3); rect(11, 117, 298, 1, P.RD2);
      g.fillStyle = P.CY; for (let y = 125; y < 104 + ch - 1; y += 8) for (let x = 12; x < 308; x += 2) g.fillRect(x, y, 1, 1);
      text('Paraphrased Decoded Message:', 14, 108, P.K); para(plain, 14, 118, W - 28, P.BL, 8);
    }, () => go(cryptoBranch(() => go(ciaFloors())))));
  }));
}

// ---------- shared ----------
function afterMission(minutes, next) { if (practiceMode) { practiceMode = false; go(practiceScene()); return; } advance(minutes); if (!checkCaseEnd()) next(); }
function report(title, lines, next) {
  return pageScene(t => {
    rect(0, 0, W, H, P.K); g.drawImage(uiX_reportBg(), 0, 0);
    const on = (t * 3 | 0) % 2; uiX_lamp(296, 13, on, P.RD2); uiX_lamp(302, 13, !on, P.GR2);
    text(title, 15, 12, P.YE, P.K);
    let y = 24; for (const l of lines) { y = para(l, 15, y, 290, P.W, 8) + 4; if (y > 160) break; }
    statusBox(174);
  }, next);
}
function capturedScene(out) {
  const held = game.crime.people.filter(p => p.status === 'arrested' && p.role !== 'Mastermind');
  const escape = () => go(pageScene(t => { rect(0, 0, W, H, P.K); uiX_escapeArt(225, 0, 95, 200, t); para('After hours of effort, you manage to work your hands free of the cuffs. You slip out past a sleeping guard and make your way back to the CIA office.', 15, 20, 200, P.W, 8); statusBox(174); }, () => go(report('Break-in', out.length ? out : ['You lost everything you were carrying.'], () => go(cityScene())))));
  return menuScene({
    menu: Menu([{ label: 'No thanks, Squinty.', go: () => { advance(18 * 60); escape(); } }, { label: 'Agree to exchange.', go: () => {
      if (held.length) { const p = pick(held); p.status = 'free'; p.jailCity = null; go(report('Exchange', ['You are traded for ' + p.name + ', who walks free and rejoins the plot.'], () => go(ciaFloors()))); return; }
      // nobody of theirs to trade: the price is a mole inside the Agency
      const cr = game.crime; if (!cr.double || cr.double.caught) cr.double = { city: pick(regionCities(game.region)).id, caught: false };
      go(report('Exchange', ['We hold none of their people, so the price of your release is paid quietly: somebody at the Agency now works for them.', 'Watch your clues. One CIA station may no longer be telling the truth.'], () => go(cityScene())));
    } }], 23, 120, 200),
    draw() { rect(0, 0, W, H, P.K); captureArt(225, 0, 95, 200); para('Your captors question you, but you refuse to talk. "So you are the famous CIA agent Max Remington." "We have lots of time, soon you will tell us what you know." "Perhaps we should exchange you for one of our agents?"', 15, 20, 200, P.W, 8); this.menu.draw(); statusBox(174); },
  });
}
// ---------- PRISON BREAK: defend the jail room against a rescue team ----------
function prisonBreakScene() {
  const cr = game.crime, pb = cr.prisonBreak, p = cr.people[pb.pid], city = cityById(pb.city), far = pb.city !== game.city;
  const lose = (lines, mins) => { p.status = 'free'; p.escaped = true; p.jailCity = null; afterMission(mins, () => go(report('Prison Break', lines.concat([p.name + ' is back at large and rejoins the plot.']), () => go(cityScene())))); };
  const defend = () => {
    pb.handled = true;
    if (far) { const here = cityById(game.city); advance(Math.round(2 + dist(here.lon, here.lat, city.lon, city.lat) / 8) * 60); game.city = pb.city; }
    const kit = { uzi: false, camera: false, bugs: 0, gasmask: false, detector: true, kevlar: false, safekit: false, frag: 2, stun: 3, gas: 0 };
    go(breakinScene({ mode: 'defend', level: game.diff, kit, maxHits: 4, org: p.org }, res => {
      const mins = 30 + Math.round(res.seconds / 2);
      if (res.kind === 'held') {
        const out = ['The rescue team is down. ' + p.name + ' stays behind bars.'];
        const q = cr.people.filter(o => o.org === p.org && o.status === 'free'); if (q.length) { const c = clueAbout(pick(q), 'Interrogation'); if (c) out.push('One of the raiders talks: ' + c.text); }
        afterMission(mins, () => go(report('Prison Break', out, () => go(cityScene())))); return;
      }
      lose(res.kind === 'captured' ? ['You wake up in the prison infirmary. The raiders got what they came for.'] : ['The raiders reach the cell and get away with their man.'], res.kind === 'captured' ? mins + 8 * 60 : mins);
    }));
  };
  const police = () => { pb.handled = true; advance(60); if (rnd() < 0.5) afterMission(0, () => go(report('Prison Break', ['The local police beat off the attack. ' + p.name + ' stays in custody.'], () => go(cityScene())))); else lose(['The police were outgunned.'], 0); };
  return menuScene({
    menu: Menu([{ label: far ? 'Fly to ' + city.name + ' and defend' : 'Rush to the jail', go: defend }, { label: 'Leave it to the police', go: police }], 23, 120, 200),
    draw() {
      rect(0, 0, W, H, P.K); captureArt(225, 0, 95, 200); uiX_urgent(0, 0, 222, 12, this.t); textC('URGENT', 111, 2, P.W, P.K);
      para('Our people in ' + city.name + ' report that the ' + p.org.name + ' are planning to break ' + p.name + ' (' + p.role + ') out of jail. The attack could come at any moment.', 15, 22, 200, P.W, 8);
      para('Defend the cell yourself: nobody may reach the prisoner. You will have a pistol, a few grenades and a motion detector.', 15, 70, 200, P.G3, 8);
      this.menu.draw(); statusBox(174);
    },
  });
}

// ---------- AMBUSHES: gunmen on the street, or a hit squad on your tail ----------
function ambush(next) {
  const city = cityById(game.city), locals = game.crime.people.filter(p => p.status === 'free' && p.city === game.city);
  const org = (pick(locals) || game.crime.people[0]).org, street = rnd() < 0.5;
  go(pageScene(t => {
    rect(0, 0, W, H, P.K); cityPic(150, 20, 160, 150, city); if ((t * 4 | 0) % 2) frame(148, 18, 164, 154, P.RD2);
    text(street ? 'AMBUSH!' : 'HIT SQUAD!', 15, 20, P.RD2);
    para(street ? 'As you step out onto the street in ' + city.name + ', a car screeches to a halt. Men with guns pile out. You have been asking too many questions here.' : 'A black sedan has been following you since the hotel. When you speed up, so do they. It is a hit squad.', 15, 34, 128, P.W, 8);
    statusBox(174);
  }, () => street ? streetFight(org, next) : hitSquad(org, next)));
}
function streetFight(org, next) {
  const kit = { uzi: false, camera: false, bugs: 0, gasmask: false, detector: false, kevlar: false, safekit: false, frag: 1, stun: 1, gas: 0 };
  go(breakinScene({ mode: 'street', level: game.diff, kit, maxHits: 3, org }, res => {
    if (res.kind === 'captured') { afterMission(6 * 60, () => go(capturedScene([]))); return; }
    const out = [];
    if (res.kind === 'won') { out.push('You search the gunmen. They carry ' + org.name + ' papers.'); const q = game.crime.people.filter(p => p.org === org && p.status === 'free'); if (q.length) { const c = clueAbout(pick(q), 'Documents on the gunmen'); if (c) out.push(c.text); } }
    else out.push('You got away from the gunmen.');
    afterMission(30 + Math.round(res.seconds / 2), () => go(report('Ambush', out, next)));
  }));
}
function hitSquad(org, next) {
  go(chaseScene({ mode: 'evade', level: game.diff, cars: [CARS[1]], night: isNight(), label: 'the hit squad' }, res => {
    if (res.how === 'caught' || res.how === 'abort') { streetFight(org, next); return; }
    if (res.how === 'safe') { afterMission(40, () => go(report('Hit Squad', ['You wait in the CIA garage until the ' + org.name + ' car gives up and drives away.'], () => goLocation2({ kind: 'cia' })))); return; }
    afterMission(30, () => go(report('Hit Squad', ['You lose the ' + org.name + ' hit squad in traffic.'], next)));
  }));
}

function practice(kind, diff) {
  practiceMode = true; game.diff = diff;
  if (!game.agent) game.agent = newAgent('m', 'Trainee');
  Object.assign(game, { t: 0, clues: [], messages: [], news: [], taps: [], activity: {}, inside: [] }); game.startDate = new Date(1990, 5, 1, 8, 0, 0); newCrime();
  const back = () => { practiceMode = false; go(practiceScene()); };
  const cr = game.crime, p = cr.people[1], b = game.buildings[p.building];
  if (kind === 'breakin') go(armoryScene(kit => go(breakinScene(Object.assign({ level: diff, occupant: p, building: b, org: b.org, alert: 0 }, kit), back))));
  const bare = { uzi: false, camera: false, bugs: 0, gasmask: false, detector: kind === 'defend', kevlar: false, safekit: false, frag: kind === 'defend' ? 2 : 1, stun: kind === 'defend' ? 3 : 1, gas: 0 };
  if (kind === 'street' || kind === 'defend') go(breakinScene({ mode: kind, level: diff, kit: bare, maxHits: kind === 'defend' ? 4 : 3, org: p.org }, back));
  if (kind === 'evade') go(chaseScene({ mode: 'evade', level: diff, cars: [CARS[1]], night: false, label: 'the instructors' }, back));
  if (kind === 'crypto') go(cryptoScene(makeMessage(cr.steps[0]).text, { msgNo: 'M001', level: diff }, back));
  if (kind === 'wiretap') go(wiretapScene({ level: diff, mode: 'tap', alert: 0, label: 'training board' }, back));
  if (kind === 'chase') go(carSelectScene(cars => go(chaseScene({ level: diff, cars, night: false, target: p, label: 'the instructor', start: b }, back))));
}

// boot
fit();
go(titleScene());
requestAnimationFrame(t => { last = t; requestAnimationFrame(frameLoop); });

// ---------- UI art for the pages above (uiX_) ----------
// the field-report telex: a framed black sheet, blue title band and a strip of punched tape
function uiX_reportBg() {
  return sprite('uiX_report', W, 174, () => {
    rect(0, 0, W, 174, P.K);
    frame(3, 3, 314, 168, P.G1); frame(5, 5, 310, 164, P.BL); rect(5, 5, 310, 1, P.BL2);
    rect(6, 8, 308, 14, P.BL); rect(6, 8, 308, 1, P.BL2); rect(6, 21, 308, 1, P.K); uiX_speck(6, 9, 308, 12, P.K, 3);
    rect(150, 10, 136, 10, P.YE); rect(150, 10, 136, 1, P.W); rect(150, 19, 136, 1, P.BR);
    for (let x = 152; x < 284; x += 3) { px(x, 14, P.BR); for (const [yy, s] of [[11, 1], [12, 2], [16, 3], [17, 4]]) if (uiX_hash(x, yy, 21 + s) < 0.45) px(x, yy, P.K); }
    for (const [x, y] of [[3, 3], [316, 3], [3, 170], [316, 170]]) px(x, y, P.G3);
  });
}
// a hazard-striped banner with rotating beacons at each end
function uiX_urgent(x, y, w, h, t) {
  rect(x, y, w, h, P.RD); rect(x, y, w, 1, P.RD2); rect(x, y + h - 1, w, 1, P.K);
  const off = (t * 12 | 0) % 8;
  for (const [sx, sw] of [[x + 2, 60], [x + w - 62, 60]]) { g.save(); g.beginPath(); g.rect(sx, y + 2, sw, h - 4); g.clip(); rect(sx, y + 2, sw, h - 4, P.K); for (let k = -h; k < sw + h; k += 8) for (let j = 0; j < h - 4; j++) rect(sx + k + j + off, y + 2 + j, 4, 1, P.YE); g.restore(); }
  const on = (t * 4 | 0) % 2;
  for (const bx of [x + 66, x + w - 71]) { rect(bx, y + 2, 5, 8, P.K); rect(bx + 1, y + 3, 3, 6, on ? P.RD2 : P.RD); if (on) px(bx + 1, y + 3, P.W); }
}
// the cell after escape: dripping stone, a barred window's light, and the cuffs you slipped
function uiX_escapeArt(x, y, w, h, t) {
  g.drawImage(sprite('uiX_escape' + w + 'x' + h, w, h, () => {
    rect(0, 0, w, h, P.K);
    // stone blocks, moonlit in a shaft under the window
    for (let yy = 0; yy < 150; yy++) for (let xx = 0; xx < w; xx++) {
      const r = yy / 9 | 0, bx = (xx + (r % 2) * 8) % 16, by = yy % 9, b = BAYER[(yy & 3) * 4 + (xx & 3)];
      const lit = yy > 52 && xx > 24 + (yy - 53) * 0.25 && xx < 70 + (yy - 53) * 0.6, far = Math.abs(xx - 47) / 47 + (yy > 100 ? (yy - 100) / 80 : 0);
      let c;
      if (by === 8 || bx === 15) c = P.K;
      else if (by === 0) c = lit ? P.W : b < 8 ? P.G3 : P.G1;
      else if (lit) c = b < 10 - (uiX_hash((xx + (r % 2) * 8) >> 4, r, 5) * 4 | 0) ? P.G3 : P.G1;
      else c = b < 3 + far * 8 + (uiX_hash((xx + (r % 2) * 8) >> 4, r, 5) * 4 | 0) ? P.K : P.G1;
      px(xx, yy, c);
    }
    // moonlight through the bars
    rect(22, 18, 50, 34, P.K); rect(24, 20, 46, 30, P.BL); uiX_speck(24, 20, 46, 30, P.K, 5); disc(56, 30, 5, P.W); disc(58, 28, 5, P.BL); px(34, 26, P.W); px(44, 40, P.W);
    for (let i = 0; i < 5; i++) { rect(27 + i * 10, 18, 3, 34, P.G1); rect(27 + i * 10, 18, 1, 34, P.G3); }
    rect(22, 52, 50, 2, P.G3); rect(22, 53, 50, 1, P.G1);
    // floor
    rect(0, 150, w, 50, P.G1); uiX_speck(0, 150, w, 50, P.K, 8); rect(0, 150, w, 1, P.G3); for (let yy = 151; yy < 200; yy++) uiX_speck(46 + (yy - 150) * 0.2 | 0, yy, 40 + (yy - 150) * 0.4 | 0, 1, P.G3, 3);
    // the open handcuffs on the floor
    const ring = (cx, cy, gap) => { for (let yy = -9; yy <= 9; yy++) for (let xx = -9; xx <= 9; xx++) { const d = Math.hypot(xx, yy), a = Math.atan2(yy, xx); if (d < 5.5 || d > 8.6) continue; if (gap && a > -0.9 && a < 0.1) continue; const l = -(xx + yy) / d; px(cx + xx, cy + yy, l > 0.5 ? P.W : l > -0.3 ? P.G3 : P.G1); } };
    ring(24, 168, false); ring(66, 172, true); rect(18, 158, 12, 4, P.G3); rect(18, 158, 12, 1, P.W); px(23, 159, P.K); rect(60, 162, 12, 4, P.G3); rect(60, 162, 12, 1, P.W); px(65, 163, P.K);
    for (let i = 0; i < 4; i++) { const cx = 34 + i * 6, cy = 168 + i; frame(cx, cy - 1, 5, 3, i % 2 ? P.G3 : P.W); }
  }), x, y);
  // a drip from the ceiling
  const k = (t * 1.5) % 1, dy = y + 4 + k * k * 140; if (dy < y + 148) rect(x + 80, dy, 1, 2, P.CY); else rect(x + 78, y + 149, 5, 1, P.CY);
}
