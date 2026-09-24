# INDEX CASE engine API (src/01-09)

All engine code lives on the global `IX` (every top-level identifier is `var IX`). The engine files run in
node (no DOM at load) — `tests/load.js` vm-loads `src/0*.js` in filename order, exactly as the built page does.
Everything is deterministic from the seed (counter-based hashing, no `Math.random`).

| file | contents |
|---|---|
| `01-rng.js` | `IX.hash`, `IX.rng(seed)` (int, chance, pick, shuffle, weighted, normal, gamma, poisson, fork), counter RNG `IX.u(key, a, b, c)`, calendar |
| `02-data.js` | `IX.DATA`: names (UK-diverse), district/street/venue name parts, symptoms, trait tables, text templates |
| `03-pathogen.js` | `IX.makePathogen(seed, opts)` — correlated trait draws, archetype label (tests only) |
| `04-city.js` | `IX.makeCity(seed, opts)` — districts, households, ~8,000 agents, places, routines |
| `05-sim.js` | `IX.Sim` — agent-based spread (S E P I A H C D R), genomes, hospitals, background noise, ghost runs |
| `06-surveillance.js` | what the player can see: care seeking, tests, reports, wastewater, investigations, sequencing |
| `07-policy.js` | staff, funding, orders, trust, council/mayor/press/rumours, estimates, cure clock, vaccination |
| `08-acts.js` | `IX.Game` — acts, grades, mentor, score, debrief, save/load, `IX.newGame` |
| `09-solver.js` | the ideal epidemiologist (headless player through this API) and generation acceptance |

## Scale

The city has a nominal population (`g.city.population`, ~250,000) simulated as `g.city.agents` (~8,000)
residents. **Every count the engine returns is in simulated residents** (a case is a person with a name).
`g.city.scale` (~31) converts to city-wide equivalents if the UI wants a headline figure
("≈ 1,900 infections city-wide"). Beds/ICU are also in resident units.

## Creating / loading a game

```js
var g = IX.newGame(seed, {grade: 'probationer'|'consultant'|'director', tutorial?: bool})
     // default grade 'consultant'. tutorial: a fixed, gentle scripted first outbreak (seed ignored).
     // Generation retries seed, seed#1, ... until the solver accepts the game (g.attempt).
var json = g.save()            // snapshot string (dynamic state only; city+pathogen rebuilt from seed)
var g2 = IX.load(json)         // identical game, continues deterministically
IX.GRADES                      // [{id, label, blurb}]
```

## Game state (read-only props)

| prop | meaning |
|---|---|
| `g.seed`, `g.attempt`, `g.grade` | seed string, generation attempt, grade id |
| `g.day` | current day (0 = the morning of the alert). Days before 0 exist in data (onsets before the alert). |
| `g.actNo` | 1 Detect, 2 Characterise, 3 Contain  (**`g.act(id, target, params)` is the action method**, see Actions) |
| `g.actLabel` | `'Detect'` / `'Characterise'` / `'Contain'` |
| `g.over`, `g.outcome` | finished? `{kind:'contained'|'vaccine'|'timeout'|'collapse', day, title, text}` |
| `g.agentName` | `null` until the lab confirms a novel agent, then e.g. `'Agent SA-3'` |
| `g.credibility` | 0..100, your personal standing with council/lab/press |
| `g.dateLabel(d)` | `"Tue 14 Oct"`; `g.dateLong(d)` → `"Tuesday 14 October 2025"` |

## The city

```js
g.city -> {
  name: 'Wexmoor', population: 250000, agents: 8000, scale: 31.25,
  boundary: [[x,y],...],                 // city edge polygon
  river: [[x,y],...], rivers: [[[x,y],...]],   // polyline(s)
  roads: [{kind:'ring'|'radial', name, line:[[x,y],...]}],
  districts: [{id:'d0', name:'Eastgate', poly:[[x,y],...], centre:[x,y], pop, deprivation:0..1, blurb}],
  places: [{id:'p12', kind, name, district:'d3', pos:[x,y], size, indoor:bool, blurb}],
  hospitalId: 'p0'
}
```
Coordinates are on the unit square (0..1, y down). Places and polygons use `[x, y]` arrays; person/case
positions (`pos`) are `{x, y}` objects. `pop` in residents. Person ids (`pid`) are integers; place ids `'p12'`; district ids `'d3'`. Place kinds:
`hospital, gp, care_home, school, nursery, university, office, factory, shop, supermarket, pub,
restaurant, gym, church, mosque, temple, gurdwara, choir, stadium, market, meat_plant, farm, lab,
station, hotel, community_hall`. Households are not places (a person's home is their district).

## Messages (inbox)

```js
g.inbox()        -> [msg]  oldest first (all received)
g.msg(id)        -> msg
g.markRead(id)
msg = {
  id: 'M17', day, kind, title, from, urgent?: bool, read: bool,
  body: [line],                 // see below
  refs: [ref],                  // every ref in the body, unique, in order
  choices?: [{id, label, hint}] // mayor calls, council requests: answer with g.answer(msg.id, choiceId)
  answered?: choiceId
}
kind = 'alert' | 'report' (GP/hospital/surveillance) | 'lab' | 'result' (investigation results) |
       'interview' | 'council' | 'mayor' | 'press' | 'rumour' | 'mentor' | 'system' | 'death'
line = {k:'h', x:[seg]}   heading
     | {k:'p', x:[seg]}   paragraph
     | {k:'q', x:[seg], who?: ref}  quoted speech (interviews, mayor)
     | {k:'m', x:[seg]}   monospace / data line
     | {k:'n', x:[seg]}   annotation / aside
     | {k:'table', head:[text], rows:[[seg...]]}   each cell is a seg
seg  = 'plain text' | ref
ref  = {t:'person'|'place'|'district'|'sample'|'order'|'trait'|'msg'|'rumour', id, d: displayText}
```
Show `ref.d`; tapping a `person` opens `g.person(id)`, a `place` opens the place, etc.
`IX.msgText(msg)` gives a plain-text rendering (tests, accessibility).

## Cases and people

```js
g.lineList() -> [case]   // every person on the line list (suspected, probable, confirmed, discarded)
case = {
  pid, name, age, sex:'F'|'M', district, pos: {x, y},   // home position on the unit square (same space as district polys)
  status: 'suspected'|'probable'|'confirmed'|'discarded',
  onset: day|null,       // reported symptom onset (may be off by a day or two; null = no symptoms reported)
  reported: day,         // day added to the line list
  outcome: 'unwell'|'well'|'hospital'|'icu'|'recovered'|'died'|'unknown',
  admitted?: day, died?: day,
  tests: [{day, kind:'panel'|'pcr'|'sero', result:'pending'|'pos'|'neg'|'flu'|'other', resultDay?, sample?:id}],
  interviewed: bool, traced: bool, household: bool,   // investigations done
  symptoms?: [symptomId],                              // from the interview (IX.DATA.SYM[id].label)
  exposures?: [{kind:'place'|'person'|'travel'|'animal', place?: ref, persons?: [pid], days:[day...], setting, group?, note}],
  illContacts?: [{person: ref, onset: day, relation:'household'|'friend'|'colleague'|'classmate'|'care home'}],
  contacts?: [pid],      // traced contacts
  infectorGuess?: pid,   // a likely source (tracing / household link)
  cluster: [clusterId],
  sample?: sampleId, seqId?: sampleId,   // stored sample; sequenced sample (node id in g.tree())
  via: 'alert'|'hospital'|'gp'|'tracing'|'household'|'testing'|'review'|'questionnaire'
}
g.person(pid) -> {
  pid, name, first, last, age, sex, district, address, pos: {x, y}, heritage, portrait (int seed for the illustrated face),
  known: {occupation?, workplace?:ref, school?:ref, habits?:[text], household?:[pid]},   // grows with interviews
  case?: case, contactOf?: [pid], followUp?: {from, to, symptomatic?: day},
  notes: [text]
}
g.contacts() -> [{pid, name, of:[pid], exposure:day, setting, followUntil, status:'monitoring'|'ill'|'well'|'lost', tested?}]
```

## Surveillance data

```js
g.epiCurve() -> {
  from: -21,                     // day of index 0 (arrays are aligned to it, up to g.day-1)
  byOnset: [n], byReport: [n],   // known cases (probable+confirmed) by onset day / by report day
  nowcast: [null | {lo, hi}],    // aligned to byOnset: 80% band for cases with that onset once all reported
  admissions: [n], deaths: [n],  // hospital admissions / deaths of known cases, by day reported
  ili: [n],                      // GP consultations for influenza-like illness (includes ordinary flu)
  tests: [n], positive: [n],     // tests resulted per day and positives
  byAge: {bands:['0-4','5-17','18-34','35-49','50-64','65-79','80+'], cases:[n], admitted:[n], died:[n]}
}
g.wastewater() -> {from, sampling: bool, unit:'copies/L (norm.)', byDistrict: {d0:[value|null]}, flag:{d0:'rising'|'high'|null}}
g.tree() -> {root, nodes:[{id, sampleOf:pid|null, parent:id|null, mutations:['C4521T',...], day?, lineage?:'A'|'B'|..}]}
           // built only from sequenced samples; internal nodes are inferred ancestors (sampleOf null)
g.clusters() -> [{id, place: ref, kind, cases:[pid], firstOnset, lastOnset, size, note}]
```

## Resources

```js
g.resources() -> {
  staffHours: {tracers, field, analysts},     // hours left today
  staffMax:   {tracers, field, analysts},     // hours per day
  staff:      {tracers, field, analysts},     // headcount (7.5 h each)
  testsLeft, testsCap, testQueue, seqLeft, seqCap,
  funding,          // £k left in the public-health budget
  spent,            // £k spent so far
  economy,          // £m cumulative cost to the local economy of your orders
  beds: {used, cap}, icu: {used, cap},        // St Anne's, residents with this disease
  trust: {overall: 0..100, byDistrict: {d0: 0..100}, byAge: {'18-34': ..}},
  credibility: 0..100,
  vaccine: null | {status:'developing'|'rollout'|'done', eta?: day, done, eligible, perDay}
}
```

## Actions

```js
g.actions() -> [{
  id, label, area: 'investigate'|'lab'|'contain'|'protect'|'communicate'|'admin',
  order: bool,                  // true = a standing order (see orders); false = one-off action
  costs: {hours: {tracers?, field?, analysts?}, tests?, seq?, money?},   // money £k (one-off) / £k per day for orders
  economy?: number,             // orders: £m per day to the local economy
  target: 'case'|'person'|'place'|'district'|'none',
  targetKinds?: [placeKind],    // for place targets
  params?: [{id, label, type:'int'|'choice'|'order'|'bool', min?, max?, options?:[{id,label}], default}],
  lag?: days,                   // orders: days before full effect
  available: bool, why: string, // why not available (or a one-line description when available)
  desc: string
}]
g.canAct(id, target, params) -> null | reason
g.act(id, target, params) -> {ok, msgs:[msg], err?}   // target = pid / placeId / districtId / null
```
One-off action ids:

| id | target | what it does |
|---|---|---|
| `interview` | case | exposures in the 14 days before onset, symptoms, onset date, named contacts (tracers 2h) |
| `trace` | case | finds contacts (household always, others with probability); they are followed up for 14 days (tracers 3h) |
| `household` | case | tests every household member now and at day 7/14 and records who stays well (field 3h + tests) |
| `test` | person | a PCR (after the agent is confirmed) or the extended panel (before); result after 1-2 days |
| `site_visit` | place | attendance lists (last 14 days), ventilation (CO2), layout, observations (field 4h) |
| `questionnaire` | place | attack rates by exposure/activity among attendees of the place's cluster (analysts 4h, field 2h) |
| `record_review` | none | hospital admissions by age & symptoms, and a retrospective search for missed cases (analysts 4h) |
| `animal_sampling` | place (market, farm, meat_plant) | swabs animals/surfaces (field 4h + tests) |
| `sequence` | case | sequences a stored positive sample; result in 3-5 days (seq 1, analysts 1h) |
| `declare_novel` | none | asks the lab to confirm a novel agent; needs panel-negative samples from ≥3 linked cases |
| `serosurvey` | none (params n) | antibody survey of a random sample; prevalence with CI after 4 days |
| `trial` | none (params n) | randomised treatment trial among admitted patients; result with CI after 21 days |
| `publish_sequence` | none | share the genome internationally (starts the cure clock with a characterisation) |
| `briefing` | none | press briefing (analysts 2h) — trust, rumours |
| `counter_rumour` | none (params rumour) | targeted rebuttal of a rumour |
| `request_funding` | none (params) | a request to the next council meeting (money, staff) |
| `hire` | none (params kind, n) | recruit staff from the budget (arrive after 3 days) |

Orders (`order: true`) are issued with `g.order(id, params)` (or `g.act(id, target, params)`):

| id | target | effect (applies from lag, scaled by compliance) |
|---|---|---|
| `isolate` | none | confirmed & symptomatic cases isolate (support payments) |
| `quarantine` | none | traced contacts quarantine for 10 days |
| `close_place` | place | closes one venue/school/workplace |
| `close_schools` | none | schools, nurseries, university close |
| `close_hospitality` | none | pubs, restaurants, gyms close |
| `gatherings` | none (params max 30/6) | limits gatherings (faith, choir, stadium, events, visits) |
| `masks` | none | masks indoors (droplet/airborne) |
| `ventilation` | none | ventilation guidance (slow; airborne) |
| `hygiene` | none | handwashing & surface cleaning campaign (contact/gut) |
| `food_safety` | none | kitchen inspections, exclusion of ill food handlers (gut) |
| `wfh` | none | work from home where possible |
| `travel` | none | travel advice (fewer importations/commutes) |
| `lockdown` | none | stay at home except essentials |
| `close_animal` | place | shuts an animal site/market (stops spillover) |
| `mass_testing` | none | community testing sites (+capacity, walk-in testing) |
| `wastewater` | none | wastewater sampling in all districts |
| `surge` | none | hospital surge beds/ICU (lag 7 days) |
| `shielding` | none (params group) | advice for the vulnerable group |
| `care_homes` | none | visiting rules, staff testing & PPE |
| `hospital_ipc` | none | infection control: PPE, cohorting |
| `treatment` | none | adopt the trialled treatment protocol |
| `vaccinate` | none (params priority: ordered list of group ids) | vaccine rollout (once available) |

```js
g.orders() -> [{id (instance id 'O3'), type, label, target?, params, since, lag, effectFrom, compliance:0..1, costPerDay, economyPerDay}]
g.order(typeId, params) -> {ok, order, msgs, err?}      // params.target for place orders
g.revoke(orderId) -> {ok, msgs}
g.answer(msgId, choiceId) -> {ok, msgs}               // mayor calls / council requests
```

## Estimates

```js
g.estimates() -> {
  traits: [{id, label, type:'choice'|'number'|'percent', options?, unit?, min?, max?, key: bool}],
  draft:     {traitId: value},             // whiteboard (unpublished) — g.setDraft(traitId, value)
  published: {traitId: {value, day, revisions}},
  history:   [{day, trait, value}]
}
g.setDraft(traitId, value)
g.publish({traitId: value, ...}) -> {ok, msgs, trust}   // press/council reactions; act 2 ends when every key trait is published
```
Traits (`key` ones end act 2): `route` (airborne/droplet/contact/gut/animal) key, `incubation` (days) key,
`presym` (% of transmission before symptoms) key, `asym` (% infections never symptomatic) key, `R` key,
`ifr` (% of infections that die) key, `ageRisk` (elderly/young-adult/children/even) key, `ihr` (% hospitalised),
`source` (market/farm/lab/traveller/hospital), `originCase` (pid), `treatment` (none/partial/good),
`caseDef` (array of symptom ids). Percent values are given as numbers 0..100.

## Clock

```js
g.endDay() -> {day, newMsgs:[msg], events:[{kind, text, day, ref?}], over, outcome}
g.advance(n) -> same, for n days (stops early on urgent messages, act changes or the end)
```

## Mentor

```js
IX.MENTOR -> {name, title, bio, costs:{nudge:0, pointer:{analysts:3}, answer:{credibility:10}}}
g.mentorStatus() -> {nudge:{ok, why}, pointer:{ok, why}, answer:{ok, why}, used:{nudge, pointer, answer}}
g.mentor('nudge'|'pointer'|'answer') -> {ok, tier, text, action?: {id, target, params}, trait?, charged}
```

## Debrief

```js
g.debrief() -> {             // available any time (spoilers!), intended once g.over
  truth: {card},             // the real pathogen card (same fields as estimates' traits + extras)
  estimates: [{trait, label, truth, published, day, error, grade:'good'|'close'|'wrong'|'none'}],
  curves: {from, actual:{infections, deaths, hospital}, ghost:{infections, deaths, hospital}},
  deaths: {actual, ghost, named:[{pid, name, age, district, day, note}]},
  costs: {spent, economy, closureDays, orders:[...]},
  trust: {start, end, byDistrict},
  origin: {primary: pid, primaryName, source, place?, day, found: bool, indexCase: pid},
  frames: [{day, infections:[[pid, x, y, placeKind]], byDistrict:{}}],   // replay map
  tree: {nodes:[{pid, infector, day, setting, place}]},                  // the true transmission tree
  score: {total, lines:[{label, pts}]}, grade
}
```

## Test hooks (never use in the UI)
`g._sim` (truth), `g._path` (pathogen), `IX.solve(g)`, `IX.makePathogen`, `IX.makeCity`.
