# INDEX CASE engine API (src/01-09)

All engine code lives on the global `IX` (every top-level identifier is `var IX`). The engine files run in
node (no DOM at load) — `tests/load.js` concatenates `src/0*.js` in filename order (as the built page does) and
evaluates them in one function scope. Everything is deterministic from the seed (counter-based hashing; the only
`Math.random` is choosing a seed when none is given).

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
     // default grade 'consultant'; seed null/undefined = random. tutorial: a fixed, gentle airborne outbreak
     // with a tell (loss of taste and smell), probationer grade (seed ignored).
     // Generation tries pathogen draws until the acceptance check passes (g.attempt); 0.5-1.2 s in node.
IX.newGameAsync(seed, opts, onProgress) -> Promise<g>   // same game; yields to the browser between attempts
                                                        // onProgress({tries, fraction})
var s = g.save()               // compressed string ('IXZ1:...', UTF-16 safe for localStorage), ~0.1-0.2 s
var g2 = IX.load(s)            // identical game, continues deterministically (also accepts plain JSON saves)
IX.GRADES                      // [{id, label, blurb, ...}]
     // grade knobs: staff, trust (start offset), comply (order compliance multiplier), beds (hospital capacity
     // multiplier), fund (funding multiplier), orderLag (extra days before orders bite; director +2),
     // pcrStart/pcrGrow/pcrMax (lab capacity), seq, funding, vaccineBase (cure clock base days: 42/75/105),
     // mentorCost. Probationer is deliberately forgiving (more staff, better compliance, more beds, faster vaccine).
```

## Game state (read-only props)

| prop | meaning |
|---|---|
| `g.seed`, `g.attempt`, `g.grade` | seed string, generation attempt, grade id |
| `g.day` | current day index (0 = the morning of the alert). Days before 0 exist in data (onsets before the alert). **Player-facing day numbers are `g.day + 1`** (the alert morning is "Day 1"); engine text uses dates or day+1, never raw indices. All `day` fields in data are indices. |
| `g.actNo` | 1 Detect, 2 Characterise, 3 Contain  (**`g.act(id, target, params)` is the action method**, see Actions) |
| `g.actLabel` | `'Detect'` / `'Characterise'` / `'Contain'` |
| `g.over`, `g.outcome` | finished? `{kind:'contained'|'burnout'|'vaccine'|'timeout'|'collapse'|'resigned', day, title, text}` (`burnout`: it died out only after infecting most of the city) |
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
g.contacts() -> [{pid, name, of:[pid], exposure:day (last), days:{sourcePid:[day...]} (every exposure day to each source), setting, place?:ref,
                  followUntil, status:'monitoring'|'ill'|'well'|'lost', onset?:day, tested?}]
```

## Surveillance data

```js
g.epiCurve() -> {
  from: -21,                     // day of index 0 (arrays are aligned to it, up to g.day-1)
  byOnset: [n], byReport: [n],   // known cases (probable+confirmed) by onset day / by report day
  nowcast: [null | {lo, hi}],    // aligned to byOnset: 80% band for cases with that onset once all reported
  admissions: [n], deaths: [n],  // hospital admissions / deaths of known cases, by day reported
  ili: [n],                      // GP consultations for influenza-like illness (includes ordinary flu)
  tests: [n], positive: [n],     // tests processed per day, and positive results by result day
  allDeaths: [n],                // all-cause deaths (excess mortality shows here before anyone counts it)
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
| `interview` | case | exposures in the 14 days before onset (places with days, people, travel, animals, funerals), symptoms, onset, people they knew who were ill first (tracers 1.5h). Some refuse; some omit or lie about venues that were meant to be shut. |
| `trace` | case (params daysBefore 2\|5) | finds contacts from N days before onset: household, friends seen, small teams/classes, venue attendees only if a site visit got the list; followed up 14 days, ill ones reported and tested (tracers 3h). With a `quarantine` order they quarantine, and tracers also do routine tracing of new cases with their spare hours each evening. |
| `timing_study` | case (traced) | diaries, daily tests and sequencing of the case's contacts: infected before or after the case's onset (field 3h, tracers 2h, seq 1; 15 days) |
| `household` | case | PCR for every household member at day 0/7/14, antibodies at day 14, symptom diary: report on day 15 of who was infected and who never felt ill (field 3h + tests) |
| `test` | person | a PCR (after the agent is confirmed) or the extended panel (before); result after 1-2 days |
| `site_visit` | place | attendance lists (last 14 days), ventilation (CO2), layout, observations (field 4h) |
| `questionnaire` | place | the cluster event (a one-off party/wedding/wake there if any, else the day most known cases were there): attack rates by closeness, food, indoors/outdoors, singing; onset days after the event (analysts 3h, field 2h; 2 days) |
| `record_review` | none | hospital admissions by age/ICU/death & symptoms, earliest admission, ward-acquired cases; adds missed cases (analysts 4h) |
| `animal_sampling` | place (market, farm, meat_plant) | swabs animals/surfaces (field 4h + tests) |
| `sequence` | case | sequences a stored positive sample; result in 3-5 days (seq 1, analysts 1h) |
| `declare_novel` | none | asks the lab to run metagenomics; needs ≥3 people with panel-negative results. Confirms (act 2) in 2 days if ≥2 are real; otherwise a false alarm (-8 credibility) |
| `serosurvey` | none (params n) | antibody survey of a random sample; prevalence with CI after 4 days |
| `trial` | none (params n) | randomised treatment trial among admitted patients (enrolment up to 28 days); risk ratio with CI 21 days after enrolment closes |
| `publish_sequence` | none | share the genome; the cure clock starts once it is published and ≥2 key traits are published (better estimates = earlier vaccine) |
| `briefing` | none | press briefing (analysts 2h) — trust, rumours |
| `counter_rumour` | none (params rumour) | targeted rebuttal of a rumour |
| `request_funding` | none (params) | a request to the next council meeting (money, staff) |
| `hire` | none (params kind, n) | recruit staff from the budget (arrive after 3 days) |

Orders (`order: true`) are issued with `g.order(id, params)` (or `g.act(id, target, params)`). They are never
blocked by money: running costs come out of the budget each day, and overspending is a matter for the council
(credibility). The economy cost is tallied separately in £m.

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

`g.resign()` -> {ok, msgs, outcome}: stand down (ends the game; `debrief()` still works).

```js
g.endDay() -> {day, newMsgs:[msg], events:[{kind, text, day, ref?}], over, outcome}
g.advance(n) -> same, for n days (stops early on urgent messages, act changes or the end)
```

## Mentor

```js
IX.MENTOR -> {name, title, bio}
g.mentorStatus() -> {nudge:{ok, why}, pointer:{ok, why}, answer:{ok, why}, used:{nudge, pointer, answer},
                    costs:{nudge:0, pointer:{analysts:n}, answer:{credibility:n}}}   // n by grade
g.mentor('nudge'|'pointer'|'answer') -> {ok, tier, text, action?: {id, target, params}, trait?, charged, msg}
   // nudge: free, once a day, general direction; pointer: a specific action + target; answer: a true value
   // (act 1: which cases are real). Each call also adds a 'mentor' message to the inbox.
```

## Debrief

```js
g.debrief() -> {             // available any time (spoilers!), intended once g.over
  truth: {card, archetype, pathogen},   // card: realised trait values in this outbreak (what the data could show)
  estimates: [{trait, label, truth, published, day, error, grade:'good'|'close'|'wrong'|'none'}],
  curves: {from, actual:{infections, deaths, hospital}, ghost:{infections, deaths, hospital}},
  deaths: {actual, ghost, named:[{pid, name, age, district, day, known, note}]},   // note: a short humane line
  infections: {actual, ghost},
  costs: {spent, economy, closureDays, orders:[...]},
  trust: {start, end, byDistrict},
  origin: {primary, primaryName, source, place?: ref, infectedDay, indexCase, found, sourceFound, spillovers, knownToYou},
  frames: [{day, infections:[[pid, x, y, settingName]], byDistrict:{d0: n}}],   // replay map, one per day from curves.from
  tree: {nodes:[{pid, infector, day, setting, place, variant, known}]},            // the true transmission tree
  score: {total, lines:[{label, pts}], grade},   // grade: 'Exemplary'|'Commended'|'Sound'|'Lessons to be learned'|'Public inquiry'
  outcome, grade, mentor: {nudge, pointer, answer}
}
```

## Test hooks (never use in the UI)
`g.sim` (truth), `g.P` (pathogen), `g.C` (full city), `g.S` (state), `g.truthCard()`, `g.ghost()`, `IX.estimate(g)`
(the ideal epidemiologist's reading of the player's data), `IX.solve(g)`, `IX.accept(g)`, `IX.acceptFull(g)`,
`IX.playPolicy(g, 'none'|'naive'|'competent')`, `IX.makePathogen`, `IX.makeCity`.

## Tests
```
node tests/gen.js <seed> [--grade=x] [--play=N] [--out=file]   # dump: pathogen card, city, alert, ghost curve, playthrough inbox
node tests/solve.js 1..100 [--full] [--raw] [--grade=x]           # acceptance %, archetypes, full-solver agreement
node tests/bias.js 1..20 [--k=14]                                 # estimator accuracy vs truth at community spread + k
node tests/play.js 1..10 [--policy=competent|none|naive] [--grade=all|x]   # balance: outcomes per grade
node tests/perf.js [seed] [days]                                  # timing: generation, endDay, save/load, ghost
node tests/api.js [seed]                                          # API walk-through + invariants (ghost identity, save/load)
node tests/debug.js <seed>                                        # the solver's estimates against the truth over time
```
