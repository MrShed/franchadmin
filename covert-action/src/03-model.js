// ===================================================================
// MODEL: regions, cities, the 26 organizations, crimes, participants,
// clues and the calendar - following the 1990 manual.
// ===================================================================
const REGIONS = {
  europe: { name: 'Europe', lon: [-11, 32], lat: [34, 58] },
  mideast: { name: 'Middle East', lon: [10, 58], lat: [20, 44] },
  americas: { name: 'the Americas', lon: [-112, -38], lat: [-36, 40] },
};
const CITIES = [
  { id: 'WAS', name: 'Washington', country: 'USA', lon: -77, lat: 38.9, region: 'americas', lang: 'us', hq: true },
  { id: 'MIA', name: 'Miami', country: 'USA', lon: -80.2, lat: 25.8, region: 'americas', lang: 'us' },
  { id: 'MEX', name: 'Mexico City', country: 'Mexico', lon: -99.1, lat: 19.4, region: 'americas', lang: 'es' },
  { id: 'HAV', name: 'Havana', country: 'Cuba', lon: -82.4, lat: 23.1, region: 'americas', lang: 'es' },
  { id: 'PAN', name: 'Panama', country: 'Panama', lon: -79.5, lat: 9, region: 'americas', lang: 'es' },
  { id: 'BOG', name: 'Bogota', country: 'Colombia', lon: -74.1, lat: 4.7, region: 'americas', lang: 'es' },
  { id: 'MED', name: 'Medellin', country: 'Colombia', lon: -75.6, lat: 6.2, region: 'americas', lang: 'es' },
  { id: 'LIM', name: 'Lima', country: 'Peru', lon: -77, lat: -12, region: 'americas', lang: 'es' },
  { id: 'MVD', name: 'Montevideo', country: 'Uruguay', lon: -56.2, lat: -34.9, region: 'americas', lang: 'es' },
  { id: 'LON', name: 'London', country: 'England', lon: -0.1, lat: 51.5, region: 'europe', lang: 'uk' },
  { id: 'PAR', name: 'Paris', country: 'France', lon: 2.35, lat: 48.9, region: 'europe', lang: 'fr' },
  { id: 'MRS', name: 'Marseilles', country: 'France', lon: 5.4, lat: 43.3, region: 'europe', lang: 'fr' },
  { id: 'MAD', name: 'Madrid', country: 'Spain', lon: -3.7, lat: 40.4, region: 'europe', lang: 'es' },
  { id: 'ROM', name: 'Rome', country: 'Italy', lon: 12.5, lat: 41.9, region: 'europe', lang: 'it' },
  { id: 'BON', name: 'Bonn', country: 'W. Germany', lon: 7.1, lat: 50.7, region: 'europe', lang: 'de' },
  { id: 'BER', name: 'East Berlin', country: 'E. Germany', lon: 13.4, lat: 52.5, region: 'europe', lang: 'de' },
  { id: 'VIE', name: 'Vienna', country: 'Austria', lon: 16.4, lat: 48.2, region: 'europe', lang: 'de' },
  { id: 'BEG', name: 'Belgrade', country: 'Yugoslavia', lon: 20.5, lat: 44.8, region: 'europe', lang: 'sl' },
  { id: 'IST', name: 'Istanbul', country: 'Turkey', lon: 29, lat: 41, region: 'mideast', lang: 'tr' },
  { id: 'CAI', name: 'Cairo', country: 'Egypt', lon: 31.2, lat: 30, region: 'mideast', lang: 'ar' },
  { id: 'BEY', name: 'Beirut', country: 'Lebanon', lon: 35.5, lat: 33.9, region: 'mideast', lang: 'ar' },
  { id: 'AMM', name: 'Amman', country: 'Jordan', lon: 35.9, lat: 31.9, region: 'mideast', lang: 'ar' },
  { id: 'TLV', name: 'Tel Aviv', country: 'Israel', lon: 34.8, lat: 32.1, region: 'mideast', lang: 'he' },
  { id: 'DAM', name: 'Damascus', country: 'Syria', lon: 36.3, lat: 33.5, region: 'mideast', lang: 'ar' },
  { id: 'BGW', name: 'Baghdad', country: 'Iraq', lon: 44.4, lat: 33.3, region: 'mideast', lang: 'ar' },
  { id: 'TRP', name: 'Tripoli', country: 'Libya', lon: 13.2, lat: 32.9, region: 'mideast', lang: 'ar' },
  { id: 'THR', name: 'Tehran', country: 'Iran', lon: 51.4, lat: 35.7, region: 'mideast', lang: 'fa' },
];
const cityById = id => CITIES.find(c => c.id === id);
const regionCities = r => CITIES.filter(c => c.region === r && !c.hq);

const NAMES = {
  us: [['Frank', 'Walter', 'Gene', 'Harold', 'Lou', 'Carl', 'Ray', 'Vince'], ['Doris', 'Joan', 'Peggy', 'Lynn'], ['Kessler', 'Dawson', 'Mercer', 'Tully', 'Barrow', 'Hale', 'Pruitt', 'Crane', 'Malone']],
  es: [['Luis', 'Ramon', 'Hector', 'Esteban', 'Rafael', 'Tomas', 'Carlos', 'Jorge'], ['Elena', 'Marisol', 'Ines', 'Rosa'], ['Ortega', 'Vargas', 'Salcedo', 'Ibarra', 'Mendoza', 'Quiroga', 'Duarte', 'Alvarez', 'Lopez']],
  uk: [['Nigel', 'Colin', 'Alistair', 'Rupert', 'Desmond', 'Liam', 'Sean'], ['Fiona', 'Hilary', 'Margot'], ['Ashworth', 'Pym', 'Fairley', 'Stroud', 'Beck', 'Holloway', 'Doyle', 'Keane']],
  fr: [['Henri', 'Marcel', 'Didier', 'Luc', 'Gaston', 'Andre'], ['Colette', 'Simone', 'Odile'], ['Rousseau', 'Delorme', 'Garnier', 'Lefevre', 'Marchand', 'Santini']],
  it: [['Enzo', 'Carlo', 'Sergio', 'Vito', 'Aldo', 'Franco'], ['Lucia', 'Gina', 'Paola'], ['Conti', 'Russo', 'Moretti', 'Galli', 'Ferrante', 'Bruno']],
  de: [['Klaus', 'Dieter', 'Jurgen', 'Horst', 'Rainer', 'Andreas'], ['Ursula', 'Heike', 'Greta'], ['Brandt', 'Vogel', 'Kranz', 'Heller', 'Adler', 'Lenz', 'Baader']],
  sl: [['Dragan', 'Milan', 'Zoran', 'Goran'], ['Vesna', 'Jelena'], ['Petrovic', 'Jovanovic', 'Markovic', 'Nikolic']],
  tr: [['Mehmet', 'Emre', 'Kemal', 'Orhan'], ['Leyla', 'Selin'], ['Yilmaz', 'Demir', 'Aksoy', 'Kaya']],
  ar: [['Karim', 'Tarek', 'Samir', 'Nabil', 'Omar', 'Abdul', 'Yusuf'], ['Layla', 'Nadia', 'Yasmin'], ['Haddad', 'Mansour', 'Nasser', 'Khalil', 'Farouk', 'Nidal', 'Saleh']],
  he: [['David', 'Avi', 'Moshe', 'Eli'], ['Miriam', 'Ruth'], ['Levy', 'Cohen', 'Mizrahi', 'Peretz']],
  fa: [['Reza', 'Hassan', 'Ali', 'Mehdi'], ['Shirin', 'Parisa'], ['Tehrani', 'Ahmadi', 'Karimi', 'Rahimi']],
};
const STREETS = {
  us: ['Flagler St', 'Collins Ave', 'K Street', 'Biscayne Blvd'], es: ['Calle Mayor', 'Avenida Bolivar', 'Calle Obispo', 'Paseo del Prado', 'Carrera Septima'],
  uk: ['Bayswater Rd', 'Old Kent Rd', 'Wapping Lane', 'Mile End Rd'], fr: ['Rue Oberkampf', 'Rue de la Paix', 'Quai du Port', 'Rue Paradis'],
  it: ['Via Condotti', 'Via Appia', 'Via Nazionale', 'Via Tiburtina'], de: ['ObensGrabbe', 'Kantstrasse', 'Friedrichstrasse', 'Ringstrasse'],
  sl: ['Knez Mihailova', 'Bulevar Revolucije'], tr: ['Istiklal Cad.', 'Divan Yolu'], ar: ['Sharia Talaat', 'Hamra St', 'Rashid St', 'Souk al-Hamidiya'],
  he: ['Dizengoff St', 'Allenby St'], fa: ['Ferdowsi Ave', 'Enghelab St'],
};

// The 26 organizations of the manual (p.83-89). short = the map label.
const ORGS = [
  ['Colombian Cartel', 'ColCt', ['americas'], 'crime'], ['Death Squad', 'DthSq', ['americas'], 'terror'], ['Dignity Battalion', 'DigBt', ['americas'], 'crime'],
  ['Direct Action', 'DirAc', ['europe'], 'terror'], ['FLN', 'FLN', ['americas'], 'terror'], ['Haitian Junta', 'HaiJt', ['americas'], 'crime'],
  ['Iraqi SP', 'IraqSP', ['mideast', 'europe'], 'espionage'], ['Jamaican Gang', 'JamGg', ['americas'], 'crime'], ['Libyan Embassy', 'LibEb', ['mideast', 'europe'], 'terror'],
  ['M-18', 'M-18', ['americas'], 'terror'], ['Mafia', 'Mafia', ['americas', 'europe'], 'crime'], ['Marxists', 'Mrxst', ['mideast'], 'terror'],
  ['Mercenaries', 'Mercs', ['mideast', 'americas'], 'crime'], ['Muslim Jihad', 'MJihd', ['mideast'], 'terror'], ['PRC', 'PRC', ['mideast'], 'terror'],
  ['PFO', 'PFO', ['mideast', 'europe'], 'terror'], ['PIFA', 'PIFA', ['europe', 'americas'], 'terror'], ['Red Army Faction', 'RAF', ['europe'], 'terror'],
  ['Red Battalion', 'RedBt', ['europe'], 'terror'], ['Red September', 'RedSp', ['mideast'], 'terror'], ['Revolutionary Guards', 'RevGd', ['mideast'], 'terror'],
  ['Shining Way', 'ShnWy', ['americas'], 'terror'], ['Amazon Cartel', 'AmzCt', ['americas'], 'crime'], ['Stassi', 'Stasi', ['europe'], 'espionage'],
  ['Tupamaros', 'Tupam', ['americas'], 'crime'], ['Unione Corsique', 'UnCor', ['europe'], 'crime'],
].map(([name, short, regions, focus], i) => ({ id: i, name, short, regions, focus, uni: [EGA.brown, EGA.dgray, EGA.green, EGA.blue, EGA.red, EGA.magenta, EGA.cyan][i % 7], mastermindFree: true }));
const AGENCIES = ['KGB', 'MI6', 'Mossad'];

const RANKS = ['Recruit', 'Operative', 'Technician', 'Agent', 'Organizer', 'Special Agent', 'Group Leader', 'Mastermind'];
const DIFFICULTY = [
  { name: 'Local Disturbance', people: [6, 7], clueRate: 0.9, guards: 0, days: 16 },
  { name: 'National Threat', people: [7, 8], clueRate: 0.75, guards: 1, days: 14 },
  { name: 'Regional Conflict', people: [8, 9], clueRate: 0.6, guards: 2, days: 13 },
  { name: 'Global Crisis', people: [9, 10], clueRate: 0.5, guards: 3, days: 12 },
];
const SKILL_NAMES = ['Average', 'Good', 'Excellent', 'Awesome', 'Awesome'];

// crime templates: the object that names the case, and the roles that make it happen
const CRIMES = [
  { kind: 'Kidnapping', object: 'Prison Warden', verb: 'kidnap the warden of a maximum security prison', roles: ['Kidnap Planner', 'Driver', 'Safe-House Keeper', 'Money Man', 'Courier', 'Kidnapper', 'Lookout'], items: ['stolen Volkswagen', 'safe house lease', 'payoff money', 'chloroform'] },
  { kind: 'Bombing', object: 'Election Commission HQ', verb: 'bomb the election commission headquarters', roles: ['Bomb Specialist', 'Driver', 'Money Man', 'Courier', 'Explosives Smuggler', 'Surveillance', 'Forger'], items: ['plastic explosives', 'building blueprints', 'forged ID cards', 'delivery van'] },
  { kind: 'Assassination', object: 'Summit IDs', verb: 'assassinate a delegate at the peace summit', roles: ['Assassin', 'Driver', 'Forger', 'Money Man', 'Courier', 'Surveillance', 'Arms Dealer'], items: ['sniper rifle', 'summit ID badges', 'airline ticket', 'payoff money'] },
  { kind: 'Theft', object: 'Train Blueprints', verb: 'steal the blueprints of a new high-speed train', roles: ['Safecracker', 'Driver', 'Inside Man', 'Money Man', 'Courier', 'Fence', 'Surveillance'], items: ['train blueprints', 'security passes', 'getaway car', 'payoff money'] },
  { kind: 'Drug Buy', object: 'Metal Foundry', verb: 'move a ton of raw drugs through a metal foundry', roles: ['Drug Supplier', 'Pilot', 'Chemist', 'Money Man', 'Courier', 'Enforcer', 'Driver'], items: ['raw drugs', 'foundry keys', 'light aircraft', 'large money withdrawal'] },
  { kind: 'Hijacking', object: 'Helicopter Pilot', verb: 'hijack a helicopter carrying a defence minister', roles: ['Hijacker', 'Pilot', 'Arms Dealer', 'Money Man', 'Courier', 'Forger', 'Surveillance'], items: ['machine pistols', 'flight plan', 'forged passports', 'payoff money'] },
  { kind: 'Espionage', object: 'Airbase Passwords', verb: 'steal the passwords of a NATO airbase', roles: ['Recruiter', 'Mole', 'Photographer', 'Money Man', 'Courier', 'Driver', 'Forger'], items: ['airbase passwords', 'microfilm', 'camera', 'payoff money'] },
];

// ------------------------------------------------------------------
const game = {
  agent: null, diff: 0, rank: 0, careerPoints: 0, cases: [], masterminds: 0,
  region: 'europe', city: 'WAS', t: 0, // t = minutes since the case began
  startDate: null, crime: null, clues: [], messages: [], news: [], taps: [], chronology: [], activity: {}, buildings: {}, log: [],
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dateOf(t) { const d = new Date(game.startDate.getTime() + t * 60000); return d; }
function clockStr(t = game.t) { const d = dateOf(t); let h = d.getHours(), ap = h < 12 ? 'AM' : 'PM'; h = h % 12 || 12; return String(h).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + ap + ' ' + MONTHS[d.getMonth()] + ' ' + String(d.getDate()).padStart(2, '0'); }
function dayStr(t) { const d = dateOf(t); return MONTHS[d.getMonth()] + ' ' + String(d.getDate()).padStart(2, '0'); }
const dayOf = t => Math.floor((t + 8 * 60) / 1440); // day 0 is the first day; cases start at 08:00
const hourOf = t => dateOf(t).getHours();

function newAgent(sex, codename) { return { first: sex === 'f' ? 'Maxine' : 'Maximillian', short: 'Max', sex, codename: codename || 'Lone Wolf', skills: { combat: 0, driving: 0, crypto: 0, electronics: 0 } }; }
function skillLevel(k) { return game.agent ? game.agent.skills[k] : 0; }

function makeFace(sex, lang) {
  const dark = { es: 0.5, ar: 0.6, fa: 0.5, tr: 0.4, he: 0.3, us: 0.25, it: 0.3 }[lang] || 0.1;
  return {
    sex, skin: rnd() < dark ? EGA.brown : EGA.lred, hair: pick(lang === 'uk' || lang === 'de' ? [EGA.black, EGA.brown, EGA.yellow, EGA.lgray] : [EGA.black, EGA.black, EGA.brown, EGA.dgray]),
    hairStyle: sex === 'f' ? ri(4, 5) : ri(0, 3), beard: sex === 'm' && rnd() < 0.4 ? ri(1, 2) : 0, glasses: rnd() < 0.25 ? ri(1, 2) : 0, hat: rnd() < 0.1,
    jacket: pick([EGA.dgray, EGA.brown, EGA.blue, EGA.black, EGA.lgray, EGA.green]), tie: pick([EGA.red, EGA.blue, EGA.brown, EGA.black]), eyes: ri(0, 1), bg: pick([EGA.blue, EGA.cyan, EGA.dgray]), jaw: ri(0, 2),
  };
}
function mkName(lang, sex, used) { const nm = NAMES[lang] || NAMES.us; let n, k = 0; do { n = pick(sex === 'f' ? nm[1] : nm[0]) + ' ' + pick(nm[2]); } while (used.has(n) && k++ < 50); used.add(n); return n; }
function mkAddress(lang) { return pick(STREETS[lang] || STREETS.us) + ' ' + ri(2, 88); }

// ------------------------------------------------------------------
// a new case: pick a region, a mastermind org, allied orgs, participants and a schedule
function newCrime() {
  const D = DIFFICULTY[game.diff];
  const region = pick(Object.keys(REGIONS)); game.region = region;
  const cities = regionCities(region);
  const orgPool = ORGS.filter(o => o.regions.includes(region));
  const mmOrg = pick(orgPool.filter(o => o.mastermindFree).length ? orgPool.filter(o => o.mastermindFree) : orgPool);
  const allies = shuffle(orgPool.filter(o => o !== mmOrg)).slice(0, 1 + Math.min(3, game.diff + ri(0, 1)));
  const orgs = [mmOrg, ...allies];
  // each org keeps a hideout in 2-4 cities of the region
  const buildings = {};
  for (const o of orgPool) { for (const c of shuffle(cities.slice()).slice(0, ri(2, 4))) { const key = o.id + '@' + c.id; buildings[key] = { key, org: o, city: c.id, address: mkAddress(c.lang), type: pick(['hideout', 'hideout', 'office', 'active cel', 'agent']), known: false, orgKnown: false, alert: 0, suspect: null, layout: null }; } }
  for (const c of cities) for (const a of AGENCIES) if (rnd() < (a === 'Mossad' ? 0.5 : 0.8)) { const key = a + '@' + c.id; buildings[key] = { key, agency: a, city: c.id, address: mkAddress(c.lang), type: a === 'Mossad' ? 'active cel' : 'office', known: true, orgKnown: true, alert: 0 }; }
  const crime = CRIMES[Math.floor(rnd() * CRIMES.length)];
  const n = ri(D.people[0], D.people[1]);
  const used = new Set(); const people = [];
  const hideoutsOf = o => Object.values(buildings).filter(b => b.org === o);
  function mk(org, role, rank, parent) {
    // one suspect per organization per city
    const free = hideoutsOf(org).filter(b => !b.suspect);
    let b = free.length ? pick(free) : null;
    if (!b) { const c = pick(cities.filter(c => !buildings[org.id + '@' + c.id])) || pick(cities); const key = org.id + '@' + c.id; b = buildings[key] = buildings[key] || { key, org, city: c.id, address: mkAddress(c.lang), type: 'hideout', known: false, orgKnown: false, alert: 0, suspect: null }; if (b.suspect) return null; }
    const city = cityById(b.city), sex = rnd() < 0.15 ? 'f' : 'm';
    const p = { id: people.length, name: mkName(city.lang, sex, used), sex, org, role, rank, city: b.city, building: b.key, face: makeFace(sex, city.lang), parent: parent ? parent.id : null, kids: [],
      known: { face: false, name: false, org: false, city: false, hideout: false, role: false }, status: 'free', exists: false, tasks: 0 };
    b.suspect = p.id; people.push(p); if (parent) parent.kids.push(p.id); return p;
  }
  const mm = mk(mmOrg, 'Mastermind', 7, null);
  const org1 = mk(pick(orgs), 'Organizer', 5, mm) || mk(mmOrg, 'Organizer', 5, mm);
  const roles = shuffle(crime.roles.slice());
  const specialists = [];
  while (people.length < n && roles.length) {
    const parent = specialists.length < 2 || rnd() < 0.5 ? org1 : pick(specialists);
    const p = mk(pick(orgs), roles.shift(), parent === org1 ? ri(3, 4) : ri(0, 2), parent); if (p) specialists.push(p);
  }
  // schedule: each link is a message or meeting; each specialist obtains an item; the executor commits the crime
  const steps = []; let day = 0;
  const order = people.slice(1).sort((a, b) => (a.parent === mm.id ? -1 : 0) - (b.parent === mm.id ? -1 : 0) || a.rank < b.rank);
  const bfs = [mm.id]; const seen = new Set(bfs);
  while (bfs.length) { const id = bfs.shift(); for (const k of people[id].kids) if (!seen.has(k)) { seen.add(k); bfs.push(k); day += rnd() < 0.6 ? 1 : 0; steps.push({ day: Math.max(1, day), kind: rnd() < 0.65 ? 'message' : 'meeting', from: id, to: k, done: false }); } }
  crime.items.forEach((it, i) => { const p = specialists[i % Math.max(1, specialists.length)] || org1; day += rnd() < 0.5 ? 1 : 0; steps.push({ day: Math.max(2, day), kind: 'item', from: p.id, item: it, done: false }); });
  const exec = specialists[0] || org1;
  steps.forEach(s => { people[s.from].tasks++; if (s.to !== undefined) people[s.to].tasks++; });
  const crimeDay = D.days - ri(0, 2) + Math.floor(n / 4);
  // spread the plan across the days before the crime, keeping its order
  const maxDay = Math.max(1, ...steps.map(s => s.day)); steps.forEach(s => { s.day = 1 + Math.round((s.day - 1) / Math.max(1, maxDay - 1) * (crimeDay - 3)); });
  // a double agent inside one CIA station feeds us false locations (manual p.40)
  const double = rnd() < [0.3, 0.6, 0.8, 1][game.diff] ? { city: pick(cities).id, caught: false } : null;
  game.crime = { ...crime, region, orgs, mastermind: mm.id, organizer: org1.id, executor: exec.id, people, steps, crimeDay, buildings, over: false, prevented: false, delay: 0, target: pick(cities).id, evidenceTaken: 0, double };
  game.buildings = buildings;
  return game.crime;
}

// ---------- knowledge ----------
const FACET_ORDER = ['face', 'name', 'org', 'city', 'hideout', 'role'];
function isSuspect(p) { return p.exists || FACET_ORDER.some(f => p.known[f]); }
function knowledge(p) { return FACET_ORDER.filter(f => p.known[f]).length; }
function learn(p, f) {
  if (!p || p.known[f]) return false; p.known[f] = true; p.exists = true;
  if (f === 'hideout') { const b = game.buildings[p.building]; b.known = true; b.orgKnown = b.orgKnown || p.known.org; p.known.city = true; }
  if (f === 'org') { const b = game.buildings[p.building]; if (b.known) b.orgKnown = true; }
  bumpActivity(p.city, p.org.name);
  return true;
}
function bumpActivity(cityId, orgName) { const a = game.activity; a[cityId] = (a[cityId] || 0) + 1; a[orgName] = (a[orgName] || 0) + 1; }
function who(p) { return p.known.name ? p.name : p.known.face ? 'Agent X (face known)' : 'an unidentified ' + (p.known.org ? p.org.name + ' member' : 'suspect'); }
const SOURCES = ['CIA', 'CIA', 'CIA', 'Interpol', 'MI-6', 'Mossad', 'FBI', 'NSA'];
// add a clue in the manual's format and apply what it reveals
function addClue(p, heading, text, method, facets, extra = {}) {
  const c = cityById(p.city); const src = pick(SOURCES); const source = src === 'CIA' ? 'CIA/' + pick(regionCities(game.region)).name : src;
  const clue = { id: game.clues.length, pid: p.id, heading, text, method, source, t: game.t, facets, face: facets.includes('face'), ...extra };
  facets.forEach(f => learn(p, f)); p.exists = true; game.clues.push(clue); bumpActivity(c.id, p.org.name);
  return clue;
}
// a clue about participant p, revealing something new if possible
function clueAbout(p, method = 'Covert Surveillance', forceFacet) {
  const b = game.buildings[p.building], c = cityById(p.city), o = p.org;
  const opts = FACET_ORDER.filter(f => !p.known[f] && f !== 'role');
  const f = forceFacet || (opts.length ? pick(opts) : pick(['face', 'name', 'org', 'city', 'hideout']));
  const he = p.sex === 'f' ? 'This woman' : 'This man';
  // the double agent's station reports the suspect somewhere else
  const dbl = game.crime && game.crime.double;
  if (dbl && !dbl.caught && f === 'city' && !forceFacet && rnd() < 0.5) {
    const fake = pick(regionCities(game.region).filter(x => x.id !== p.city)); p.shownCity = fake.id;
    return addClue(p, fake.name, (p.known.name ? p.name : 'A suspect known to the ' + o.name) + ' is active in ' + fake.name + '.', method, ['city'], { source: 'CIA/' + cityById(dbl.city).name, cityClaim: fake.id, lie: true });
  }
  if (f === 'city' || f === 'name' || f === 'hideout') p.shownCity = null;
  switch (f) {
    case 'face': return addClue(p, b.address, he + ' was identified by tenants at ' + b.address + '.', method, ['face']);
    case 'name': return addClue(p, p.name, p.name + ' was seen ' + pick(['boarding a flight to ' + c.name, 'meeting known criminals in ' + c.name, 'renting a car in ' + c.name, 'withdrawing large sums in ' + c.name]) + '.', method, ['name', 'city']);
    case 'org': return addClue(p, o.name, 'An informant says the ' + o.name + ' has brought in ' + (p.known.name ? p.name : 'a ' + RANKS[p.rank].toLowerCase()) + ' for a special job.', method, ['org']);
    case 'city': return addClue(p, c.name, (p.known.name ? p.name : 'A suspect known to the ' + o.name) + ' is active in ' + c.name + '.', method, ['city'], { cityClaim: c.id });
    case 'hideout': return addClue(p, b.address, 'The ' + o.name + ' is using a building at ' + b.address + ', ' + c.name + '.', method, ['hideout', 'org']);
    case 'role': return addClue(p, p.role, (p.known.name ? p.name : 'A ' + o.name + ' member') + ' is the ' + p.role + ' in this operation.', method, ['role']);
  }
}
function canArrestHere(p) { return p.status === 'free'; }
// the city our files show: the double agent's lie, until a true report corrects it
const shownCity = p => cityById(p.shownCity || p.city);
// the double agent tips off his friends in his own town: guards are readier there
function leak(city) { const d = game.crime && game.crime.double; return d && !d.caught && d.city === city ? 1 : 0; }
function addHeat(city, n) { game.heatBy = game.heatBy || {}; game.heatBy[city] = (game.heatBy[city] || 0) + n; }

// ---------- messages (coded traffic) ----------
const MSG_TEXT = {
  message: ['PROCEED WITH THE PLAN. THE {ITEM} WILL BE READY. WAIT FOR MY SIGNAL.', 'YOU ARE TO RECRUIT A RELIABLE {ROLE}. MONEY IS NO OBJECT.', 'THE AMERICANS ARE WATCHING THE AIRPORT. USE THE SAFE HOUSE.', 'CONFIRM YOU HAVE THE {ITEM}. TRUST NO ONE IN {CITY}.'],
  meeting: ['MEET ME AT THE CAFE NEAR THE CATHEDRAL IN {CITY} AT NOON.', 'COME TO {CITY}. WE MUST DISCUSS THE {ITEM} FACE TO FACE.'],
};
function makeMessage(step) {
  const cr = game.crime, from = cr.people[step.from], to = cr.people[step.to] || from;
  const body = pick(MSG_TEXT[step.kind === 'meeting' ? 'meeting' : 'message']).replace('{ITEM}', pick(cr.items).toUpperCase()).replace('{ROLE}', to.role.toUpperCase()).replace('{CITY}', cityById(to.city).name.toUpperCase());
  const text = 'FROM ' + from.org.name.toUpperCase() + ' IN ' + cityById(from.city).name.toUpperCase() + ' TO ' + to.org.name.toUpperCase() + ' IN ' + cityById(to.city).name.toUpperCase() + '. ' + body;
  return { id: 'M' + (100 + ri(0, 299)), from: from.id, to: to.id, text, t: game.t, stepDay: step.day, decoded: false };
}

// ---------- time passes: the plot advances and agencies pick up clues ----------
function advance(minutes) {
  const d0 = dayOf(game.t); game.t += minutes; const d1 = dayOf(game.t);
  for (let d = d0 + 1; d <= d1; d++) plotDay(d);
}
function plotDay(d) {
  const cr = game.crime; if (!cr || cr.over) return;
  const D = DIFFICULTY[game.diff];
  for (const s of cr.steps) {
    if (s.done || s.blocked || s.day + cr.delay > d) continue;
    const a = cr.people[s.from], b = s.to !== undefined ? cr.people[s.to] : null;
    if (a.status !== 'free' || (b && b.status !== 'free')) { s.blocked = true; continue; }
    s.done = true; a.tasks--; if (b) b.tasks--;
    cr.chronologyAll = cr.chronologyAll || []; cr.chronologyAll.push({ day: d, s });
    // the world notices
    if (rnd() < D.clueRate) clueAbout(rnd() < 0.5 || !b ? a : b, pick(['Covert Surveillance', 'Telephone Tap', 'Informant', 'Airport Surveillance']));
    if (s.kind !== 'item' && rnd() < D.clueRate * 0.5) game.messages.push(Object.assign(makeMessage(s), { src: 'NSA intercept' }));
    if (s.kind === 'item') game.news.push({ t: dayToT(d), text: 'Police in ' + cityById(a.city).name + ' report ' + (s.item.includes('money') || s.item.includes('withdrawal') ? 'a large money withdrawal.' : 'the theft of ' + s.item + '.') });
  }
  // active taps leak messages
  for (const tap of game.taps) {
    const b = game.buildings[tap.key]; if (!b || tap.until < d) continue;
    const p = b.suspect !== null && b.suspect !== undefined ? cr.people[b.suspect] : null;
    if (p && p.status === 'free' && rnd() < 0.7) { const st = cr.steps.find(s => (s.from === p.id || s.to === p.id) && s.kind !== 'item' && !s.tapped); if (st) { st.tapped = true; game.messages.push(Object.assign(makeMessage(st), { src: 'Wiretap, ' + b.address })); } else if (rnd() < 0.5) clueAbout(p, 'Telephone Tap'); }
  }
  // jailed lieutenants: their friends may try to break them out
  if (!cr.prisonBreak || cr.prisonBreak.handled) for (const p of cr.people) {
    if (p.status !== 'arrested' || p.breakTried || p.rank < 3 || p.role === 'Mastermind') continue;
    if (!cr.people.some(q => q.org === p.org && q.status === 'free')) continue;
    if (rnd() < 0.2) { p.breakTried = true; cr.prisonBreak = { pid: p.id, city: p.jailCity || game.city, day: d }; break; }
  }
  // blocked plans: critical links broken means the conspiracy falls apart
  const blocked = cr.steps.filter(s => s.blocked).length, total = cr.steps.length;
  if (blocked / total > 0.34 || cr.people[cr.mastermind].status !== 'free' || cr.people[cr.organizer].status !== 'free' && blocked > 0) { cr.over = true; cr.prevented = true; cr.endDay = d; }
  else if (d >= cr.crimeDay + cr.delay) { cr.over = true; cr.prevented = false; cr.endDay = d; }
}
const dayToT = d => d * 1440 - 8 * 60 + 9 * 60;

// ---------- scoring: Efficiency Points, as on the original report ----------
function epMax(p) { return p.role === 'Mastermind' ? 200 : p.rank >= 5 ? 35 : 25 + (p.rank % 4) * 5; }
function efficiency() {
  const cr = game.crime, rows = []; let got = 0, max = 0;
  for (const p of cr.people) {
    const m = epMax(p); let e = Math.round(m * ['name', 'org', 'city', 'hideout'].filter(f => p.known[f]).length / 8);
    if (p.status === 'arrested') e = m; rows.push({ status: p.status === 'arrested' ? 'Arrested' : p.status === 'turned' ? 'Turned' : 'At Large', label: p.role, ep: e, max: m, p }); got += e; max += m;
  }
  cr.items.forEach((it, i) => { const ok = i < cr.evidenceTaken; rows.push({ status: ok ? 'Captured' : 'Not Found', label: it.replace(/\b\w/g, c => c.toUpperCase()), ep: ok ? 50 : 0, max: 50 }); got += ok ? 50 : 0; max += 50; });
  if (cr.double) { const ok = cr.double.caught; rows.push({ status: ok ? 'Exposed' : 'Undetected', label: 'Double Agent', ep: ok ? 100 : 0, max: 100 }); got += ok ? 100 : 0; max += 100; }
  rows.push({ status: '', label: cr.kind, ep: cr.prevented ? 120 : 0, max: 120, crime: true }); got += cr.prevented ? 120 : 0; max += 120;
  return { rows, got, max, pts: Math.round(got / max * 1000) };
}
