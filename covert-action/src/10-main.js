// ===================================================================
// MAIN: glue between the city hub and the minigames
// ===================================================================
let practiceMode = false;
function afterMission(hours, next) { advanceTime(hours); if (practiceMode) { go(titleScene()); return; } if (!checkCaseEnd()) next(); }

// who is the break-in / wiretap / tail target in this city?
function localTarget(preferMobile) {
  const here = peopleIn(game.city); if (!here.length) return null;
  const pool = preferMobile ? here.filter(p => p.role.mobile) : here;
  return pick(pool.length ? pool : here);
}
const FRONTS = ['Import-Export', 'Travel Agency', 'Shipping Co.', 'Trading House', 'Consulting', 'Holdings', 'Freight Services'];

function startBreakin() {
  const p = localTarget(false);
  const org = p ? p.org : pick(ORGS);
  const front = (p ? p.name.split(' ')[1] : pick(NAMES[cityById(game.city).names][2])) + ' ' + pick(FRONTS);
  const brief = p
    ? 'Target: the offices of "' + front + '", ' + cityById(game.city).name + '. Local sources say the building is used by ' + (p.known.org ? 'the ' + p.org.name : 'a hostile group') + '. The occupant' + (p.known.name || p.known.photo ? ' is believed to be ' + p.code : '') + ' works on the top floor.\n\nSearch desks, files and safes. Bring the occupant out alive if you can. Leave by the door you came in.'
    : 'Target: "' + front + '", ' + cityById(game.city).name + '. Our informants have seen nothing here lately, but it is the best lead we have. It may be a dry hole.\n\nSearch what you can and get out.';
  go(loadoutScene(brief, kit => {
    go(breakinScene(Object.assign({ level: game.level, occupant: p, org }, kit), res => {
      let hours = 5;
      if (res.kind === 'dead') { hours = 48; game.agent.health = Math.max(1, game.agent.health - 1); }
      if (res.kind === 'police') hours = 24;
      if (res.kills.civ) game.score -= 15 * res.kills.civ;
      game.score += res.clues.length * 3;
      if (p) p.seen = true;
      if (res.killedTarget) { res.killedTarget.status = 'dead'; FACETS.forEach(f => res.killedTarget.known[f] = true); game.score -= 10; }
      if (res.captured) { const c = res.captured; c.status = 'arrested'; const pts = c.role.tier === 3 ? 60 : c.role.tier === 2 ? 25 : 10; game.score += pts; FACETS.forEach(f => c.known[f] = true); afterMission(hours, () => go(interrogationScene(c, 'capture', pts))); return; }
      afterMission(hours, () => go(missionReport('BREAK-IN', res.clues.length ? res.clues : ['Nothing of value was recovered.'])));
    }));
  }, () => go(hubScene())));
}
function startWiretap() {
  const p = localTarget(false);
  go(wiretapScene({ level: game.level, label: p ? (p.known.name ? p.name : 'suspect') + "'s line" : 'Front company line' }, res => {
    const out = [];
    if (res.success) {
      game.score += 5;
      if (p) { p.seen = true; if (!game.bugs.some(b => b.pid === p.id)) game.bugs.push({ pid: p.id }); const c = clueFrom(p, 0.2); if (c) out.push('Phone company records: ' + c); queueMessage(p); out.push('A message has already been recorded. Decode it from the city menu.'); }
      else out.push('The line is live but carries nothing but family gossip. No one in the ring uses it.');
    } else out.push('The tap was not installed.');
    afterMission(4, () => go(missionReport('WIRETAP', out)));
  }));
}
function startChase() {
  const p = localTarget(true);
  const label = p ? (p.known.name || p.known.photo ? p.code : 'a suspect') + "'s car" : 'a delivery van';
  go(chaseScene({ level: game.level, label }, res => {
    const out = [];
    if (p) {
      p.seen = true;
      if (res.how === 'captured') { p.status = 'arrested'; FACETS.forEach(f => p.known[f] = true); const pts = p.role.tier === 3 ? 60 : p.role.tier === 2 ? 25 : 10; game.score += pts; afterMission(4, () => go(interrogationScene(p, 'capture', pts))); return; }
      if (res.success) {
        game.score += 8; out.push(reveal(p, 'photo') || 'You get a clear look at the driver: ' + p.code + '.');
        const contact = game.plot.people[pick(p.links)]; if (contact) { contact.seen = true; const a = reveal(contact, 'photo'); const b = reveal(contact, 'city'); if (a) out.push(a); if (b) out.push(b); if (!a && !b) out.push('The driver met ' + contact.code + ' - someone you already know about.'); }
      } else out.push(res.how === 'abort' ? 'You called off the tail.' : 'The car got away.');
    } else out.push(res.success ? 'The van delivers vegetables to a restaurant. A waste of an afternoon.' : 'You lose the van. Probably just as well.');
    afterMission(4, () => go(missionReport('CAR TAIL', out)));
  }));
}
function startCrypto(i) {
  const m = game.messages[i]; if (!m) { go(hubScene()); return; }
  go(cryptoScene(m.text, { source: m.src + ', day ' + m.day }, res => {
    const out = [];
    if (res.success) {
      game.messages.splice(i, 1); game.score += 4;
      const from = game.plot.people[m.from], to = game.plot.people[m.to]; from.seen = to.seen = true;
      const a = reveal(from, 'city'); if (a) out.push(a); const b = reveal(to); if (b) out.push(b);
      if (!out.length) out.push('The message confirms what you already knew about ' + from.code + ' and ' + to.code + '.');
    } else { out.push('The message remains unreadable. It is dropped from the queue.'); game.messages.splice(i, 1); }
    afterMission(2, () => go(missionReport('CODEBREAKING', out)));
  }));
}
function missionReport(title, lines) {
  return pageScene(() => {
    rect(0, 0, W, H, P.K); dither(0, 0, W, H, P.K, P.NV, 5); panel(16, 20, W - 32, H - 50);
    text(title + ' REPORT', 28, 30, P.YE); textR(timeStr(), W - 28, 30, P.CY); rect(28, 40, W - 56, 1, P.G2);
    let y = 46; for (const l of lines) { y = para('- ' + l, 28, y, W - 56, P.G5, 9) + 3; if (y > 160) break; }
  }, () => go(hubScene()));
}
function practice(kind) {
  practiceMode = true;
  if (!game.agent) game.agent = newAgent('m', null);
  const saved = game.plot; game.plot = newPlot(1); game.level = 1;
  const back = () => { practiceMode = false; game.plot = saved; go(titleScene()); };
  const occ = game.plot.people.find(p => p.role.tier === 1);
  if (kind === 'breakin') go(loadoutScene('PRACTICE: A training building at the Farm. Guards carry live ammunition anyway. Find the occupant, search the files, get out.', kit => go(breakinScene(Object.assign({ level: 1, occupant: occ, org: occ.org }, kit), back)), back));
  if (kind === 'crypto') go(cryptoScene('FROM ' + occ.code + ' TO RAVEN. ' + pick(MSG_BODIES), { source: 'Training exercise', practice: true }, back));
  if (kind === 'wiretap') go(wiretapScene({ level: 1, label: 'Training board' }, back));
  if (kind === 'chase') go(chaseScene({ level: 1, label: 'the instructor' }, back));
}
// boot
fit();
go(titleScene());
requestAnimationFrame(t => { last = t; requestAnimationFrame(frameLoop); });
