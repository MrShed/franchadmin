// ===================================================================
// MODEL: cities, organizations, the plot, participants and clues
// ===================================================================
const CITIES = [
  { id: 'WAS', name: 'Washington', country: 'USA', lon: -77, lat: 38.9, look: 'capitol', names: 'us' },
  { id: 'NYC', name: 'New York', country: 'USA', lon: -74, lat: 40.7, look: 'towers', names: 'us' },
  { id: 'MEX', name: 'Mexico City', country: 'Mexico', lon: -99.1, lat: 19.4, look: 'pyramid', names: 'es' },
  { id: 'HAV', name: 'Havana', country: 'Cuba', lon: -82.4, lat: 23.1, look: 'fort', names: 'es' },
  { id: 'BOG', name: 'Bogota', country: 'Colombia', lon: -74.1, lat: 4.7, look: 'andes', names: 'es' },
  { id: 'RIO', name: 'Rio de Janeiro', country: 'Brazil', lon: -43.2, lat: -22.9, look: 'sugarloaf', names: 'pt' },
  { id: 'LON', name: 'London', country: 'Britain', lon: -0.1, lat: 51.5, look: 'clock', names: 'uk' },
  { id: 'PAR', name: 'Paris', country: 'France', lon: 2.35, lat: 48.9, look: 'eiffel', names: 'fr' },
  { id: 'ROM', name: 'Rome', country: 'Italy', lon: 12.5, lat: 41.9, look: 'colosseum', names: 'it' },
  { id: 'VIE', name: 'Vienna', country: 'Austria', lon: 16.4, lat: 48.2, look: 'spire', names: 'de' },
  { id: 'BER', name: 'East Berlin', country: 'E. Germany', lon: 13.4, lat: 52.5, look: 'tvtower', names: 'de' },
  { id: 'MOS', name: 'Moscow', country: 'USSR', lon: 37.6, lat: 55.8, look: 'onion', names: 'ru' },
  { id: 'IST', name: 'Istanbul', country: 'Turkey', lon: 29, lat: 41, look: 'minaret', names: 'tr' },
  { id: 'CAI', name: 'Cairo', country: 'Egypt', lon: 31.2, lat: 30, look: 'pyramids', names: 'ar' },
  { id: 'HKG', name: 'Hong Kong', country: 'Hong Kong', lon: 114.2, lat: 22.3, look: 'harbour', names: 'zh' },
  { id: 'TYO', name: 'Tokyo', country: 'Japan', lon: 139.7, lat: 35.7, look: 'tokyotower', names: 'ja' },
];
const cityById = id => CITIES.find(c => c.id === id);

const NAMES = {
  us: [['Frank', 'Walter', 'Gene', 'Harold', 'Lou', 'Carl', 'Ray'], ['Doris', 'Joan', 'Peggy', 'Lynn'], ['Kessler', 'Dawson', 'Mercer', 'Tully', 'Barrow', 'Hale', 'Pruitt', 'Crane']],
  es: [['Luis', 'Ramon', 'Hector', 'Esteban', 'Rafael', 'Tomas'], ['Elena', 'Marisol', 'Ines', 'Rosa'], ['Ortega', 'Vargas', 'Salcedo', 'Ibarra', 'Mendoza', 'Quiroga', 'Duarte']],
  pt: [['Paulo', 'Joao', 'Tiago', 'Rui'], ['Ana', 'Beatriz', 'Leticia'], ['Barbosa', 'Tavares', 'Moreira', 'Pinto', 'Nogueira']],
  uk: [['Nigel', 'Colin', 'Alistair', 'Rupert', 'Desmond'], ['Fiona', 'Hilary', 'Margot'], ['Ashworth', 'Pym', 'Fairley', 'Stroud', 'Beck', 'Holloway']],
  fr: [['Henri', 'Marcel', 'Didier', 'Luc', 'Gaston'], ['Colette', 'Simone', 'Odile'], ['Rousseau', 'Delorme', 'Garnier', 'Lefevre', 'Marchand']],
  it: [['Enzo', 'Carlo', 'Sergio', 'Vito', 'Aldo'], ['Lucia', 'Gina', 'Paola'], ['Conti', 'Russo', 'Moretti', 'Galli', 'Ferrante', 'Bruno']],
  de: [['Klaus', 'Dieter', 'Jurgen', 'Horst', 'Rainer'], ['Ursula', 'Heike', 'Greta'], ['Brandt', 'Vogel', 'Kranz', 'Heller', 'Adler', 'Lenz']],
  ru: [['Yuri', 'Oleg', 'Viktor', 'Boris', 'Anatoly'], ['Irina', 'Tatiana', 'Olga'], ['Volkov', 'Petrov', 'Zhukov', 'Orlov', 'Karpov', 'Sokolov']],
  tr: [['Mehmet', 'Emre', 'Kemal', 'Orhan'], ['Leyla', 'Selin'], ['Yilmaz', 'Demir', 'Aksoy', 'Kaya']],
  ar: [['Karim', 'Tarek', 'Samir', 'Nabil', 'Omar'], ['Layla', 'Nadia', 'Yasmin'], ['Haddad', 'Mansour', 'Nasser', 'Khalil', 'Farouk']],
  zh: [['Wei', 'Chen', 'Ming', 'Jun', 'Tao'], ['Mei', 'Lin', 'Xiu'], ['Lau', 'Wong', 'Cheung', 'Ho', 'Fong']],
  ja: [['Kenji', 'Hiro', 'Takeshi', 'Akira'], ['Yuki', 'Keiko', 'Emi'], ['Sato', 'Mori', 'Kuroda', 'Tanaka', 'Ishida']],
};
const CODENAMES = ['VIPER', 'RAVEN', 'JACKAL', 'MAGPIE', 'FALCON', 'COBRA', 'SPHINX', 'MANTIS', 'OSPREY', 'BADGER', 'CONDOR', 'LYNX', 'SCORPION', 'HERON', 'WOLF', 'PYTHON', 'KESTREL', 'MARTEN', 'IBIS', 'CAIMAN', 'SHRIKE', 'TIGER', 'OTTER', 'VULTURE', 'BISHOP', 'ROOK', 'KNIGHT', 'PAWN'];

// Organizations are fictional. Uniform colour paints their guards in break-ins.
const ORGS = [
  { name: 'Crimson Brigade', short: 'CRIMSON', type: 'terrorist', home: ['ROM', 'PAR', 'BER', 'IST'], uni: P.RD, uni2: P.BR },
  { name: 'Directorate K', short: 'DIR. K', type: 'intelligence', home: ['MOS', 'BER', 'VIE', 'HAV'], uni: P.G2, uni2: P.OL },
  { name: 'Cartel del Sol', short: 'CARTEL', type: 'narcotics', home: ['BOG', 'MEX', 'HAV', 'RIO'], uni: P.TN, uni2: P.BR2 },
  { name: 'The Consortium', short: 'CONSORT.', type: 'mafia', home: ['NYC', 'ROM', 'LON', 'WAS'], uni: P.D2, uni2: P.G1 },
  { name: 'Golden Dragon', short: 'DRAGON', type: 'triad', home: ['HKG', 'TYO', 'NYC', 'LON'], uni: P.YE2, uni2: P.BR },
  { name: 'Nile Front', short: 'NILE FR.', type: 'terrorist', home: ['CAI', 'IST', 'PAR', 'ROM'], uni: P.OL, uni2: P.DG },
  { name: 'Obsidian Group', short: 'OBSIDIAN', type: 'mercenary', home: ['VIE', 'LON', 'RIO', 'HKG'], uni: P.BL, uni2: P.NV },
];

const CRIMES = [
  { name: 'Assassination', verb: 'assassinate a visiting head of state', target: 'the summit' },
  { name: 'Kidnapping', verb: 'kidnap an American diplomat', target: 'the embassy' },
  { name: 'Bombing', verb: 'bomb a NATO communications centre', target: 'the relay station' },
  { name: 'Hijacking', verb: 'hijack a nuclear fuel shipment', target: 'the convoy' },
  { name: 'Theft of Secrets', verb: 'steal the plans for a stealth guidance system', target: 'the laboratory' },
  { name: 'Counterfeiting', verb: 'flood Europe with counterfeit dollars', target: 'the mint' },
];

// tier 3 = mastermind, 2 = lieutenants, 1 = operatives
const ROLES = [
  { name: 'Mastermind', tier: 3, w: 30 },
  { name: 'Planner', tier: 2, w: 12 }, { name: 'Financier', tier: 2, w: 12 }, { name: 'Recruiter', tier: 2, w: 10 },
  { name: 'Courier', tier: 1, w: 6, mobile: true }, { name: 'Assassin', tier: 1, w: 9 }, { name: 'Safecracker', tier: 1, w: 7 },
  { name: 'Forger', tier: 1, w: 6 }, { name: 'Driver', tier: 1, w: 5, mobile: true }, { name: 'Demolitions', tier: 1, w: 9 },
  { name: 'Informant', tier: 1, w: 5 }, { name: 'Pilot', tier: 1, w: 6, mobile: true },
];
const FACETS = ['photo', 'name', 'city', 'org', 'role'];
const FACET_LABEL = { photo: 'photograph', name: 'real name', city: 'location', org: 'organization', role: 'role' };

// ------------------------------------------------------------------
const game = {
  agent: null, level: 1, day: 1, hour: 8, city: 'WAS', score: 0, careerScore: 0, cases: [],
  plot: null, messages: [], log: [], bugs: [],
};
function timeStr() { return 'Day ' + game.day + ', ' + String(game.hour).padStart(2, '0') + ':00'; }

function newAgent(sex, focus) {
  const sk = { combat: 2, driving: 2, crypto: 2, electronics: 2 };
  if (focus) sk[focus] = 4;
  return { first: sex === 'f' ? 'Maxine' : 'Max', last: 'Remington', sex, skills: sk, health: 3, maxHealth: 3 };
}

function makeFace(sex, ethnic) {
  const skinBy = { us: [P.SK, P.SK, P.SK2, P.SK3], es: [P.SK, P.SK2], pt: [P.SK, P.SK2, P.SK3], uk: [P.SK], fr: [P.SK, P.SK2], it: [P.SK, P.SK2], de: [P.SK], ru: [P.SK], tr: [P.SK, P.SK2], ar: [P.SK2, P.SK2, P.SK], zh: [P.SK, P.TN], ja: [P.SK, P.TN] };
  const hairs = ethnic === 'uk' || ethnic === 'de' || ethnic === 'ru' ? [P.K, P.BR, P.TN, P.BR2, P.G3] : [P.K, P.K, P.BR, P.G3];
  return {
    sex, skin: pick(skinBy[ethnic] || [P.SK]), hair: pick(hairs), hairStyle: sex === 'f' ? ri(3, 5) : ri(0, 3),
    beard: sex === 'm' && rnd() < 0.35 ? ri(1, 2) : 0, glasses: rnd() < 0.25 ? ri(1, 2) : 0, hat: rnd() < 0.12, jacket: pick([P.G2, P.BR, P.NV, P.D2, P.OL, P.G3]),
    tie: pick([P.RD, P.BL, P.YE2, P.K]), eyes: rnd() < 0.5 ? 0 : 1, bg: pick([P.BL, P.TL, P.G2, P.BR2]), jaw: ri(0, 2),
  };
}

function newPlot(level) {
  const nOrgs = Math.min(3, 1 + Math.floor((level + 1) / 2));
  const orgs = shuffle(ORGS.slice()).slice(0, nOrgs);
  const crime = pick(CRIMES);
  const nPeople = Math.min(16, 7 + level * 2);
  const codes = shuffle(CODENAMES.slice());
  const lieutenants = shuffle(ROLES.filter(r => r.tier === 2)).slice(0, Math.min(3, 1 + Math.ceil(level / 2)));
  const ops = ROLES.filter(r => r.tier === 1);
  const people = [];
  const used = new Set();
  function mk(role, org) {
    const cid = rnd() < 0.7 ? pick(org.home) : pick(CITIES).id;
    const city = cityById(cid); const nm = NAMES[city.names]; const sex = rnd() < 0.2 ? 'f' : 'm';
    let full; do { full = pick(sex === 'f' ? nm[1] : nm[0]) + ' ' + pick(nm[2]); } while (used.has(full)); used.add(full);
    const p = { id: people.length, code: codes.pop(), name: full, role, org, city: cid, home: cid, face: makeFace(sex, city.names),
      known: { photo: false, name: false, city: false, org: false, role: false }, status: 'free', links: [], cityDay: 0, seen: false };
    people.push(p); return p;
  }
  const mastermind = mk(ROLES[0], orgs[0]);
  // the mastermind never sits in Washington
  if (mastermind.city === 'WAS') { mastermind.city = mastermind.home = pick(orgs[0].home.filter(c => c !== 'WAS')); }
  const lts = lieutenants.map((r, i) => { const p = mk(r, orgs[i % orgs.length]); p.links.push(mastermind.id); mastermind.links.push(p.id); return p; });
  while (people.length < nPeople) {
    const boss = pick(lts); const p = mk(pick(ops), rnd() < 0.6 ? boss.org : pick(orgs));
    p.links.push(boss.id); boss.links.push(p.id);
  }
  // a few sideways contacts between operatives
  const opsP = people.filter(p => p.role.tier === 1);
  for (let i = 0; i < Math.floor(opsP.length / 3); i++) { const a = pick(opsP), b = pick(opsP); if (a !== b && !a.links.includes(b.id)) { a.links.push(b.id); b.links.push(a.id); } }
  const deadline = 18 + Math.max(0, 6 - level) + Math.floor(nPeople / 2);
  const total = people.reduce((s, p) => s + p.role.w, 0);
  return { crime, orgs, people, deadline, total, mastermind: mastermind.id, targetCity: pick(CITIES.filter(c => c.id !== 'WAS')).id, foiled: false, over: false, started: game.day };
}

function plotStrength() { const pl = game.plot; const free = pl.people.filter(p => p.status === 'free').reduce((s, p) => s + p.role.w, 0); return free / pl.total; }
function isSuspect(p) { return FACETS.some(f => p.known[f]); }
function knownCount(p) { return FACETS.filter(f => p.known[f]).length; }
function label(p) { return p.known.name ? p.name : p.code; }
function canArrest(p) { return p.status === 'free' && (p.known.name || p.known.photo) && p.known.city && p.city === game.city; }
function peopleIn(cid) { return game.plot.people.filter(p => p.city === cid && p.status === 'free'); }

// reveal one unknown facet of p (preferring the given facet). Returns a sentence or null.
function reveal(p, prefer) {
  if (!p) return null;
  const opts = FACETS.filter(f => !p.known[f]); if (!opts.length) return null;
  const f = prefer && !p.known[prefer] ? prefer : pick(opts);
  p.known[f] = true; if (f === 'city') p.cityDay = game.day;
  const who = p.code;
  const txt = {
    photo: 'A photograph of ' + who + '.',
    name: who + ' is really ' + p.name + '.',
    city: who + ' is operating in ' + cityById(p.city).name + '.',
    org: who + ' works for the ' + p.org.name + '.',
    role: who + ' is the ' + p.role.name + ' of the plot.',
  }[f];
  game.log.unshift({ day: game.day, t: txt }); if (game.log.length > 60) game.log.pop();
  return txt;
}
// a clue about someone connected to p (or p itself)
function clueFrom(p, preferSelf = 0.35) {
  const pool = [p, ...p.links.map(i => game.plot.people[i])].filter(q => q && q.status !== 'dead');
  const cand = rnd() < preferSelf ? [p] : shuffle(pool.slice());
  for (const q of cand.concat(pool)) { const r = reveal(q); if (r) return r; }
  return null;
}

// the plot moves on each day: mobile people relocate, messages get sent
function advanceTime(hours) {
  const before = game.day;
  game.hour += hours; while (game.hour >= 24) { game.hour -= 24; game.day++; }
  for (let d = before; d < game.day; d++) dailyTick();
}
function dailyTick() {
  const pl = game.plot; if (!pl || pl.over) return;
  for (const p of pl.people) {
    if (p.status !== 'free' || !p.role.mobile) continue;
    if (rnd() < 0.25) { const linked = p.links.map(i => pl.people[i]).filter(q => q.status === 'free'); const dest = linked.length ? pick(linked).city : pick(CITIES).id; if (dest !== p.city) { p.city = dest; p.known.city = false; } }
  }
  // bugged buildings leak messages
  for (const b of game.bugs) {
    const p = pl.people[b.pid]; if (!p || p.status !== 'free') continue;
    if (rnd() < 0.8) queueMessage(p);
  }
  if (rnd() < 0.35) { const free = pl.people.filter(p => p.status === 'free'); if (free.length) queueMessage(pick(free), true); }
}
const MSG_BODIES = [
  'FUNDS TRANSFERRED FROM ZURICH ACCOUNT. PROCEED AS PLANNED.', 'THE PACKAGE ARRIVES BY NIGHT TRAIN. BE AT THE STATION.', 'SAFEHOUSE IS COMPROMISED. MOVE THE DOCUMENTS TONIGHT.',
  'PASSPORTS ARE READY. COLLECT FROM THE USUAL PLACE.', 'TARGET SCHEDULE CONFIRMED. WAIT FOR MY SIGNAL.', 'TRUST NO ONE. THE AMERICANS ARE WATCHING THE AIRPORT.',
  'DELIVER THE CASE TO OUR FRIEND AND BURN THIS MESSAGE.', 'THE MONEY IS SHORT. TELL THE BANKER TO PAY IN FULL.', 'MEET ME AT THE CAFE NEAR THE CATHEDRAL AT NOON.',
];
function queueMessage(from, intercepted) {
  const pl = game.plot; const to = pl.people[pick(from.links)]; if (!to) return;
  const body = pick(MSG_BODIES);
  const txt = 'FROM ' + from.code + ' IN ' + cityById(from.city).name.toUpperCase() + ' TO ' + to.code + '. ' + body;
  game.messages.push({ from: from.id, to: to.id, text: txt, day: game.day, src: intercepted ? 'NSA intercept' : 'Wiretap' });
  if (game.messages.length > 8) game.messages.shift();
}
