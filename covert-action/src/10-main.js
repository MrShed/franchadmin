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
  const who_ = b.agency ? b.agency + ' ' + b.type : b.orgKnown ? b.org.name + ' ' + b.type : 'Unknown building';
  // who lives here, as far as our files go
  const occ = b.suspect != null ? game.crime.people[b.suspect] : null, mine = occ && occ.known.hideout;
  const occLine = b.agency ? '' : mine ? 'Occupant: ' + (occ.known.name ? occ.name : 'Agent ' + String.fromCharCode(65 + occ.id)) + (occ.status !== 'free' ? ' (' + occ.status + ')' : occ.known.role ? ' (' + occ.role + ')' : ' (role unknown)') : 'Occupant: unknown';
  const header = [who_ + (b.agency ? '' : ','), b.agency ? '' : b.address + '.', occLine, guardWords(b), 'Do you ...'].filter(Boolean).flatMap(l => wrap(l, 118));
  return menuScene({ menu: Menu(items, 13, 38 + header.length * 8, 108), back: () => go(cityScene()),
    draw() { rect(0, 0, W, H, P.K); uiX_backdrop(); buildingArt(130, 35, 190, 165, b); statusBox(4); header.forEach((l, i) => text(l, 7, 38 + i * 8, uiX_T.hd)); this.menu.draw(); } });
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
      hd.forEach((l, i) => text(l, 8, 23 + i * 8, uiX_T.hd)); s.menu.y = 23 + hd.length * 8; s.menu.draw();
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
  go(pageScene(() => { rect(0, 0, W, H, P.K); uiX_backdrop(); buildingArt(150, 30, 170, 170, b); msgBox(8, 60, 136, 60); text('Breaking in...', 16, 68, uiX_T.amber); para(words + ' You will have to find your own way around.', 16, 80, 120, uiX_T.hd); }, () => go(armoryScene(kit => {
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
    // pinned photographs, typed role labels
    cr.people.forEach((p, i) => { const [x, y] = pos(i); uiX_print(x - 2, y - 2, 44, 54); drawFace(p.face, x, y, 40, 50); fine(() => { const X = (x - 2) * 2, Y = (y + 53) * 2; g.fillStyle = 'rgba(40,20,0,0.3)'; g.fillRect(X + 2, Y + 2, 88, 16); rect(X, Y, 88, 16, '#fbf8ee'); rect(X, Y, 88, 1, '#ffffff'); rect(X, Y + 15, 88, 1, '#d6ccb4'); }); text(fitText(p.role, 56), x, y + 53, uiX_I.k); });
    // red yarn from pin to pin between everyone who meets or messages, sagging a little
    fine(() => {
      const yarn = (lw, c, o) => { g.strokeStyle = c; g.lineWidth = lw; g.lineCap = 'round'; cr.steps.forEach(s => { if (s.to === undefined) return; const [ax, ay] = pos(s.from), [bx, by] = pos(s.to); const x0 = (ax + 20) * 2 + o, y0 = (ay - 2) * 2 + o, x1 = (bx + 20) * 2 + o, y1 = (by - 2) * 2 + o, sag = 10 + Math.hypot(x1 - x0, y1 - y0) * 0.08; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag, x1, y1); g.stroke(); }); };
      yarn(2.4, 'rgba(40,10,0,0.28)', 3); yarn(2.2, '#7a1612', 0); yarn(1, '#e0493c', -0.5);
      cr.people.forEach((p, i) => { const [x, y] = pos(i), X = (x + 20) * 2, Y = (y - 2) * 2; uiX_circ(X + 2, Y + 3, 4, 'rgba(40,10,0,0.35)'); uiX_circ(X, Y, 4.4, '#7a1612'); uiX_circ(X, Y, 3.6, '#c42c22'); uiX_circ(X - 1.2, Y - 1.2, 1.4, '#ff9a8a'); });
    });
    cr.people.forEach((p, i) => { if (p.status !== 'arrested') return; const [x, y] = pos(i); uiX_stamp('ARRESTED', x + 20 - uiX_stampW('ARRESTED') / 2, y + 30, P.RD, true); });
  } };
}
function personnelFile(org) {
  const ps = game.crime.people.filter(p => p.org === org); ps.forEach(p => learn(p, 'name'));
  return { label: 'Personnel file: ' + org.name, draw() {
    text('NAME', 20, 19, uiX_I.g); text('LOCATION', 180, 19, uiX_I.g); fine(() => { rect(32, 54, 580, 2, uiX_I.k); rect(32, 58, 580, 1, uiX_I.k); });
    ps.forEach((p, i) => { const y = 30 + i * 10; text(p.name, 20, y, uiX_I.k); uiX_leader(24 + textW(p.name), 176, y + 6); text(cityById(p.city).name, 180, y, uiX_I.b); });
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
      folder(P.G3, 'Message Decode', true, 'DECODED'); text('Msg# ' + m.id, 14, 20, uiX_I.g);
      rows.forEach(([k, v], i) => { const y = 30 + i * 10; text(k, 14, y, uiX_I.k); uiX_leader(17 + textW(k), 155, y + 6); text(fitText(v, 146), 158, y, k.startsWith('Evidence') ? uiX_I.r : uiX_I.b); });
      const plain = m.text.split('. ').slice(1).join('. ').toLowerCase().replace(/(^|\. )([a-z])/g, (a, b, c) => b + c.toUpperCase()), nl = wrap(plain, W - 28).length;
      const ch = Math.min(176, 118 + nl * 8 + 4) - 104; uiX_card(10, 104, 300, ch, 13, 21);
      text('Paraphrased Decoded Message:', 14, 108, uiX_I.k); para(plain, 14, 118, W - 28, uiX_I.b, 8);
    }, () => go(cryptoBranch(() => go(ciaFloors())))));
  }));
}

// ---------- shared ----------
function afterMission(minutes, next) { if (practiceMode) { practiceMode = false; go(practiceScene()); return; } advance(minutes); if (!checkCaseEnd()) next(); }
function report(title, lines, next) {
  return pageScene(t => {
    rect(0, 0, W, H, P.K); blit(uiX_reportBg(), 0, 0);
    const on = (t * 3 | 0) % 2; uiX_lamp(296, 13, on, P.RD2); uiX_lamp(302, 13, !on, P.GR2);
    text(title, 15, 12, uiX_T.amber);
    let y = 24; for (const l of lines) { y = para(l, 15, y, 290, uiX_T.hd, 8) + 4; if (y > 160) break; }
    statusBox(174);
  }, next);
}
function capturedScene(out) {
  const held = game.crime.people.filter(p => p.status === 'arrested' && p.role !== 'Mastermind');
  const escape = () => go(pageScene(t => { rect(0, 0, W, H, P.K); uiX_backdrop(); uiX_escapeArt(225, 0, 95, 200, t); uiX_mullion(224); para('After hours of effort, you manage to work your hands free of the cuffs. You slip out past a sleeping guard and make your way back to the CIA office.', 15, 20, 200, uiX_T.hd, 8); statusBox(174); }, () => go(report('Break-in', out.length ? out : ['You lost everything you were carrying.'], () => go(cityScene())))));
  return menuScene({
    menu: Menu([{ label: 'No thanks, Squinty.', go: () => { advance(18 * 60); escape(); } }, { label: 'Agree to exchange.', go: () => {
      if (held.length) { const p = pick(held); p.status = 'free'; p.jailCity = null; go(report('Exchange', ['You are traded for ' + p.name + ', who walks free and rejoins the plot.'], () => go(ciaFloors()))); return; }
      // nobody of theirs to trade: the price is a mole inside the Agency
      const cr = game.crime; if (!cr.double || cr.double.caught) cr.double = { city: pick(regionCities(game.region)).id, caught: false };
      go(report('Exchange', ['We hold none of their people, so the price of your release is paid quietly: somebody at the Agency now works for them.', 'Watch your clues. One CIA station may no longer be telling the truth.'], () => go(cityScene())));
    } }], 23, 120, 200),
    draw() { rect(0, 0, W, H, P.K); uiX_backdrop(); captureArt(225, 0, 95, 200); uiX_mullion(224); para('Your captors question you, but you refuse to talk. "So you are the famous CIA agent Max Remington." "We have lots of time, soon you will tell us what you know." "Perhaps we should exchange you for one of our agents?"', 15, 20, 200, uiX_T.hd, 8); this.menu.draw(); statusBox(174); },
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
      rect(0, 0, W, H, P.K); uiX_backdrop(); captureArt(225, 0, 95, 200); uiX_mullion(224); uiX_urgent(0, 0, 222, 12, this.t); textC('URGENT', 111, 2, '#fff4ea', '#5a0c08');
      para('Our people in ' + city.name + ' report that the ' + p.org.name + ' are planning to break ' + p.name + ' (' + p.role + ') out of jail. The attack could come at any moment.', 15, 22, 200, uiX_T.hd, 8);
      para('Defend the cell yourself: nobody may reach the prisoner. You will have a pistol, a few grenades and a motion detector.', 15, 70, 200, uiX_T.opt, 8);
      this.menu.draw(); statusBox(174);
    },
  });
}

// ---------- AMBUSHES: gunmen on the street, or a hit squad on your tail ----------
function ambush(next) {
  const city = cityById(game.city), locals = game.crime.people.filter(p => p.status === 'free' && p.city === game.city);
  const org = (pick(locals) || game.crime.people[0]).org, street = rnd() < 0.5;
  go(pageScene(t => {
    rect(0, 0, W, H, P.K); uiX_backdrop(); uiX_picFrame(150, 20, 160, 150); cityPic(150, 20, 160, 150, city); uiX_alarmFrame(150, 20, 160, 150, t);
    text(street ? 'AMBUSH!' : 'HIT SQUAD!', 15, 20, '#ff5a44');
    para(street ? 'As you step out onto the street in ' + city.name + ', a car screeches to a halt. Men with guns pile out. You have been asking too many questions here.' : 'A black sedan has been following you since the hotel. When you speed up, so do they. It is a hit squad.', 15, 34, 128, uiX_T.hd, 8);
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
// the field-report terminal: a steel bezel, a dark glass sheet, an enamel title band and a strip of punched tape
function uiX_reportBg() {
  return art('uiX_report2', W, 174, () => {
    const S = uiX_STEEL;
    rect(0, 0, 640, 348, '#05060a');
    uiX_steelF(4, 4, 632, 340, 0); uiX_band(10, 10, 620, 328, [S[4], S[3]], 2); uiX_bev(10, 10, 620, 328, S[1], S[6]);
    uiX_wellF(16, 48, 608, 284, ['#0f1624', '#0c121e', '#090d17']);
    // title band
    rect(14, 14, 612, 30, S[0]); g.fillStyle = uiX_lg(0, 16, 0, 42, ['#27407a', '#1a2e5e', '#132247']); g.fillRect(16, 16, 608, 26); rect(16, 16, 608, 1, '#5470b0'); rect(16, 41, 608, 1, '#0a1230');
    // punched paper tape: sprocket holes down the middle, data holes either side
    const tx = 300, tw = 272; rect(tx + 2, 21, tw, 18, 'rgba(0,0,0,0.4)'); rect(tx, 19, tw, 18, '#efe6c6'); rect(tx, 19, tw, 1, '#fffaea'); rect(tx, 36, tw, 1, '#c9bc96');
    for (let x = tx + 5, k = 0; x < tx + tw - 3; x += 6, k++) {
      uiX_circ(x, 28, 1, '#6d6450');
      for (const [yy, s] of [[22.5, 1], [25, 2], [31, 3], [33.5, 4]]) if (uiX_hash(k, s, 21) < 0.5) uiX_circ(x, yy, 1.4, '#1a1c24');
    }
    for (const [x, y] of [[9, 9], [631, 9], [9, 339], [631, 339]]) uiX_screwF(x, y, 3);
  });
}
// a hazard-striped banner: red enamel, two windows of marching stripes and a pair of rotating beacons
function uiX_urgent(x, y, w, h, t) {
  fine(() => {
    const X = x * 2, Y = y * 2, Wd = w * 2, Hh = h * 2;
    g.fillStyle = uiX_lg(0, Y, 0, Y + Hh, ['#e0483a', '#b02a20', '#7a1712']); g.fillRect(X, Y, Wd, Hh); rect(X, Y, Wd, 1, '#ff9a86'); rect(X, Y + Hh - 1, Wd, 1, '#3a0806');
    const off = (t * 24) % 16;
    for (const sx of [X + 4, X + Wd - 124]) {
      g.save(); g.beginPath(); g.rect(sx, Y + 4, 120, Hh - 8); g.clip(); rect(sx, Y + 4, 120, Hh - 8, '#15161a');
      for (let k = -24; k < 140; k += 16) uiX_poly([[sx + k + off, Y + 4], [sx + k + off + 8, Y + 4], [sx + k + off - 8, Y + Hh - 4], [sx + k + off - 16, Y + Hh - 4]], '#f2c22e');
      g.fillStyle = uiX_lg(0, Y + 4, 0, Y + Hh - 4, ['rgba(255,255,255,0.18)', 'rgba(0,0,0,0.25)']); g.fillRect(sx, Y + 4, 120, Hh - 8);
      g.restore(); rect(sx, Y + 3, 120, 1, '#5a0c08');
    }
    const ph = t * 5;
    for (const bx of [X + 138, X + Wd - 142]) {
      const on = (Math.sin(ph + bx) + 1) / 2;
      g.fillStyle = uiX_rg(bx, Y + 12, 0, 16, ['rgba(255,120,80,' + (0.55 * on).toFixed(2) + ')', 'rgba(255,80,40,0)']); g.fillRect(bx - 16, Y - 4, 32, 32);
      uiX_rr(bx - 5, Y + 3, 10, 18, 4, '#2a0a08'); g.fillStyle = uiX_lg(bx - 4, 0, bx + 4, 0, ['#ff9a7a', mix('#ff3a22', '#5a0c08', 1 - on), '#7a1510']); uiX_rr(bx - 4, Y + 4, 8, 16, 3, g.fillStyle); rect(bx - 2, Y + 6, 1, 5, 'rgba(255,255,255,' + (0.3 + 0.5 * on).toFixed(2) + ')');
    }
  });
}
// the blinking alarm frame around the ambush picture
function uiX_alarmFrame(x, y, w, h, t) {
  const on = (Math.sin(t * 9) + 1) / 2;
  fine(() => { const X = x * 2, Y = y * 2, Wd = w * 2, Hh = h * 2; g.strokeStyle = 'rgba(255,70,50,' + (0.25 + 0.6 * on).toFixed(2) + ')'; g.lineWidth = 3; g.strokeRect(X - 13, Y - 13, Wd + 26, Hh + 26); g.strokeStyle = 'rgba(255,120,90,' + (0.15 * on).toFixed(2) + ')'; g.lineWidth = 8; g.strokeRect(X - 13, Y - 13, Wd + 26, Hh + 26); });
}
// the cell after the escape: moonlight through a barred window across clean stone blocks, the cuffs you slipped
function uiX_escapeArt(x, y, w, h, t) {
  blit(art('uiX_escape2' + w + 'x' + h, w, h, () => {
    const Wd = w * 2, Hh = h * 2, ST = ['#101219', '#181b24', '#20242f', '#292e3a', '#333947', '#3f4656'], MOON = ['#1f2536', '#283046', '#323c57', '#3e4a69', '#56658a'];
    const inShaft = (px_, py_) => py_ > 104 && px_ > 44 + (py_ - 104) * 0.35 && px_ < 144 + (py_ - 104) * 0.62;
    // wall of stone blocks, each a flat tone with a lit top edge and a mortar shadow
    for (let row = 0, by = 0; by < 300; row++, by += 20) {
      for (let bx = -((row % 2) * 17); bx < Wd; bx += 34) {
        const k = uiX_hash(bx + 99, row, 5) < 0.5 ? 0 : 1, lit = inShaft(bx + 17, by + 10);
        const R = lit ? MOON : ST, base = 2 + k - (by > 220 ? 1 : 0);
        rect(bx, by, 34, 20, R[base]); rect(bx, by, 34, 2, R[Math.min(R.length - 1, base + 1)]); rect(bx, by, 2, 20, R[Math.min(R.length - 1, base + 1)]);
        rect(bx, by + 18, 34, 2, '#07080c'); rect(bx + 32, by, 2, 20, '#07080c');
        if (uiX_hash(bx, row, 9) < 0.25) rect(bx + 8 + uiX_hash(bx, row, 3) * 14, by + 7, 6, 1, R[Math.max(0, base - 1)]);
      }
    }
    // the shaft of moonlight itself
    g.fillStyle = uiX_lg(60, 104, 150, 300, ['rgba(170,195,255,0.16)', 'rgba(170,195,255,0.05)']); g.beginPath(); g.moveTo(44, 104); g.lineTo(144, 104); g.lineTo(144 + 196 * 0.62, 300); g.lineTo(44 + 196 * 0.35, 300); g.fill();
    // the bars' shadows thrown down the shaft
    for (let i = 0; i < 5; i++) { const u0 = (52 + i * 20 - 44) / 100, u1 = u0 + 0.06, Lx = y_ => 44 + (y_ - 104) * 0.35, Rx = y_ => 144 + (y_ - 104) * 0.62, at = (u, y_) => Lx(y_) + u * (Rx(y_) - Lx(y_)); uiX_poly([[at(u0, 104), 104], [at(u1, 104), 104], [at(u1, 300), 300], [at(u0, 300), 300]], 'rgba(8,10,18,0.55)'); }
    // barred window
    rect(40, 32, 104, 76, '#07080c'); g.fillStyle = uiX_lg(0, 36, 0, 104, ['#0c1636', '#1a2c5c', '#2c4478']); g.fillRect(44, 36, 96, 68);
    uiX_circ(112, 58, 10, '#f4f1e2'); uiX_circ(118, 54, 10, '#15254e'); for (const [sx, sy] of [[62, 46], [84, 80], [130, 88], [70, 70]]) rect(sx, sy, 1, 1, '#dfe6ff');
    for (let i = 0; i < 5; i++) { const bx = 52 + i * 20; rect(bx, 34, 6, 72, '#1c1f27'); rect(bx, 34, 2, 72, '#5a6274'); rect(bx + 5, 34, 1, 72, '#0a0b10'); }
    rect(40, 106, 104, 4, MOON[3]); rect(40, 109, 104, 2, '#07080c');
    // floor flagstones, the pool of light on them
    uiX_band(0, 300, Wd, 100, ['#20232c', '#1a1d25', '#131519'], 5); for (const fy of [316, 340, 370]) rect(0, fy, Wd, 1, '#0b0c10');
    rect(0, 300, Wd, 2, '#3a4152');
    g.fillStyle = uiX_rg(120, 332, 4, 70, ['rgba(170,195,255,0.3)', 'rgba(170,195,255,0.08)', 'rgba(0,0,0,0)']); g.beginPath(); g.ellipse(120, 332, 72, 24, 0, 0, Math.PI * 2); g.fill();
    // the open handcuffs
    const ring = (cx, cy, open) => { uiX_ell(cx + 2, cy + 5, 13, 5, 'rgba(0,0,0,0.5)'); g.lineWidth = 3.2; g.strokeStyle = '#4a5260'; g.beginPath(); g.ellipse(cx, cy, 12, 7, 0, open ? 0.6 : 0, open ? Math.PI * 2 - 0.2 : Math.PI * 2); g.stroke(); g.lineWidth = 1.2; g.strokeStyle = '#dfe6ee'; g.beginPath(); g.ellipse(cx, cy - 1, 11, 6, 0, Math.PI * 1.05, Math.PI * 1.75); g.stroke(); rect(cx + 8, cy - 4, 8, 6, '#5a6270'); rect(cx + 8, cy - 4, 8, 1, '#c9d2dc'); };
    ring(44, 336, false); ring(118, 344, true);
    for (let i = 0; i < 5; i++) { const cx = 62 + i * 9, cy = 336 + i * 2; g.strokeStyle = i % 2 ? '#6d7684' : '#aab4c0'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(cx, cy, 4, 2.5, 0, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = uiX_rg(Wd / 2, Hh / 2, 60, 260, ['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)']); g.fillRect(0, 0, Wd, Hh);
  }), x, y);
  // a drip from the ceiling, a splash on the flags
  const k = (t * 0.8) % 1;
  fine(() => { const X = (x + 80) * 2; if (k < 0.8) { const dy = y * 2 + 8 + (k / 0.8) ** 2 * 288; g.fillStyle = '#9fc4ee'; g.beginPath(); g.ellipse(X, dy, 1.3, 2.2, 0, 0, Math.PI * 2); g.fill(); } else { const q = (k - 0.8) / 0.2; g.strokeStyle = 'rgba(160,196,238,' + (1 - q).toFixed(2) + ')'; g.lineWidth = 1; g.beginPath(); g.ellipse(X, y * 2 + 298, 2 + q * 8, 1 + q * 2, 0, 0, Math.PI * 2); g.stroke(); } });
}
