# INDEX CASE — build contract (all milestones)

Player-facing design: `indexcase/DESIGN-BRIEF.html` (read it). This file is the technical contract between
the engine (`IX` namespace, `src/01..09-*.js`) and the interface (`UI` prefix, `src/00-head.html`,
`src/10..29-*.js`, `src/99-tail.html`). Build: `indexcase/build.sh` -> `showcase/index-case.html`.

## Constraints
- One self-contained HTML file; vanilla JS; no libraries, no network. Phone-first (390x844 portrait, touch),
  great on desktop too. Deterministic from a seed. Engine runs in node (no DOM at load) for tests.
- Fictional British city (generated name, e.g. "Wexmoor", ~250,000 people) in the present day. Fictional
  pathogens, fictional officials. Serious, humane tone (Contagion, not Plague Inc). Deaths are people with names.
- Turn-based days. Target: act 1-2 in ~45-60 min; a full game to vaccine 2h+ across sittings (autosave).
- Performance: a day advance < 150 ms on a mid phone for ~8,000 agents; full ghost-city rerun < 3 s.

## Engine files
- `01-rng.js` seeded RNG + helpers.  `02-data.js` names (UK-diverse), street/district/venue name parts,
  symptom list, pathogen trait tables, text templates (reports, press, council, rumours, interviews).
- `03-pathogen.js` pathogen generator (see brief section 02): route {airborne, droplet, contact, gut,
  animal(spillover continues)}; incubation mean/sd (2-14 d); infectious profile incl. presymptomatic share
  (0-60%); asymptomatic fraction (0-70%); per-contact transmissibility tuned to a target R (1.2-5) given
  the city's contact structure; IFR 0.1-12% with an age-risk shape {elderly, young-adult, children, even};
  hospitalisation ratio; symptom profile (4-7 symptoms with frequencies from ~20; optional "tell");
  test detectability window; mutation rate; optional variant (from week 4) with trait deltas; source type
  {market, farm, lab, traveller, hospital}; treatment {none, partial, good}. Correlated draws for
  plausibility. Weighted towards respiratory. Named archetype label for tests only.
- `04-city.js` city generator: ~12 districts (names, map polygons/centres on a unit square, deprivation,
  age mix), households (sizes by district), ~8,000 agents (age, sex, name, household, district, job/school,
  habits: pub, gym, faith, choir, sport, care-home resident/worker, healthcare worker, commuter), places
  (schools, workplaces incl. St Anne's Hospital + 1-2 others, care homes, pubs, gyms, churches/mosques/
  temples, choir, football ground, market, meat/animal site, lab, transport hubs, venues for events) with
  size, crowding, ventilation. Weekly routine produces daily contact sets per setting.
- `05-sim.js` agent-based spread per day: states S, E, P(presym), I(sym), A(asym), H(hospital), ICU, D, R
  (+ vaccinated, + variant tag). Transmission per contact by setting x route x ventilation x masks x
  compliance-adjusted policy multipliers. Hospital capacity (beds, ICU): overflow raises death risk.
  Records every infection event {infector, infectee, setting, place, day}, and a genome per infection:
  parent genome + Poisson(mutation rate) new mutations (ids). Background noise: seasonal flu/other ILI
  producing similar symptoms, and unrelated deaths. Spillover events for animal source. Variant birth.
  Ghost-city: re-run from the same seed with no player actions for comparison (debrief) — must reproduce
  the pre-intervention trajectory exactly.
- `06-surveillance.js` what the player can see: care seeking by severity; GP/hospital reports with delays
  and misclassification (before recognition: "unexplained pneumonia"/flu); test capacity per day (grows,
  can be funded); test sensitivity by day since infection; result delays; admissions/deaths reporting
  delays; wastewater by district (shedding sum + noise, rises before cases); interviews (exposure recall
  with errors, omissions, some refuse or lie about venues); contact tracing (named contacts found with
  probability; unnamed contacts at venues need site lists); household studies; site visits (attendance,
  ventilation measurement); questionnaires for a cluster venue (attack rates by activity/area);
  sequencing (returns genome mutation sets for samples; tree built from them); hospital record review
  (admissions by age, symptoms); treatment trial (randomised, n chosen, result with CI).
- `07-policy.js` staff (tracers, field team, analysts) with daily hours; funding; orders with lags, costs
  (£/day economy), per-setting contact multipliers, compliance by trust; trust per district x age group;
  council weekly meeting with requests/decisions; mayor calls; press stories from events; rumours spreading
  on the social graph (fraction believing) changing compliance; briefings/counter-messaging; published
  estimates (player's numbers) affect trust when later shown right/wrong; cure clock (needs a published
  sequence + characterisation; time to vaccine/treatment shortens with estimate accuracy); vaccination
  rollout with player-chosen priority order and daily capacity; shielding advice; care home rules; surge.
- `08-acts.js` game flow: Act 1 Detect (starts with an alert: a cluster at one setting; ends when the
  player declares a novel agent and the lab confirms — requires sending samples that test negative for known
  pathogens), Act 2 Characterise (ends when estimates published for all key traits or community spread
  forces act 3), Act 3 Contain (ends: extinction for 21 days, vaccine rollout complete, day limit 180, or
  collapse). Difficulty grades (Probationer / Consultant / Director) altering noise, capacity, pathogen
  range, delays. The mentor hint character (solver-driven, 3 tiers like Cutout's night analyst): nudge
  free/day, pointer costs staff hours, straight answer costs credibility. Score + debrief data (true
  pathogen card vs your estimates with timing, deaths vs ghost city, costs, trust, origin, replay frames:
  per-day infections by district/place, transmission tree).
- `09-solver.js` ideal epidemiologist: from what's observable, checks each generated game can be
  detected by ~day 10, characterised (every key trait estimable within tolerance) by the time community
  spread starts, and that the ghost city is dangerous enough to matter but not hopeless. Generator retries.
  `tests/`: `gen.js <seed>` dumps a game (pathogen card, city stats, ghost curve), `solve.js 1..100`
  (acceptance %, stats by archetype), `perf.js` (day-advance timing), `api.js` (walk the API).

## Engine API (IX namespace) — the UI codes against this; the engine may extend but not rename
```
IX.newGame(seed, {grade}) -> g
g.day, g.act, g.over, g.outcome, g.dateLabel(d)
g.city            -> {name, districts:[{id,name,poly,centre,pop}], places:[{id,kind,name,district,pos}]}
g.resources()     -> {staffHours:{tracers,field,analysts}, testsLeft, seqLeft, funding, beds, icu, trust:{overall, byDistrict}}
g.inbox()         -> [msg]   // reports, lab results, council, press, mayor, rumours, mentor; {id, day, kind, title, body:[{k,x:[text|ref]}], refs}
g.lineList()      -> [case]  // known cases: {pid, name, age, sex, district, onset, reported, status, tests:[...], exposures?, contacts?, seqId?}
g.person(pid)     -> what the player knows about a person
g.epiCurve()      -> {byOnset:[..], byReport:[..], nowcast:[{lo,hi}], admissions:[..], deaths:[..]}
g.wastewater()    -> {byDistrict:{id:[..]}}
g.tree()          -> {nodes:[{id, sampleOf:pid, parent, mutations:[..]}]}   // from sequenced samples only
g.clusters()      -> player-visible clusters (by place, from interviews/site visits)
g.actions()       -> catalogue: [{id, label, area, costs:{hours:{..}, tests, seq, money}, target:'case|person|place|district|none', available, why}]
g.act(id, target, params) -> {ok, msgs:[..], err}
g.orders()        -> active orders with lag/cost/compliance
g.order(id, params) / g.revoke(orderId)
g.estimates()     / g.publish({trait: value, ...}) -> reaction msgs
g.endDay()        -> {newMsgs, events}
g.mentor(tier)    -> {text, action?}
g.debrief()       -> {truth, estimates, curves:{actual, ghost}, deaths, costs, trust, origin, frames, tree}
g.save() -> json ; IX.load(json) -> g
```
Messages and person/place references inside text are typed refs so the UI can make them tappable.

## UI brief
Tabs: MAP (districts, case dots by onset recency, clusters, venue pins, wastewater heat layer, filters;
pinch/zoom), CASES (line list with filters/sort; person sheet with interview/trace/test actions; epidemic
curve with nowcast band, admissions/deaths, age chart), LAB (test capacity & queue, sequencing -> genome
tree viewer (pinch/zoom, tap node -> person), wastewater charts, trial), ACTIONS (investigations and orders
grouped by area with costs, lags and effects; active orders), BRIEFING (inbox: reports, council, press,
mayor calls, rumours; estimates whiteboard + publish; mentor). Top bar: day/date, act, staff hours, tests,
beds, trust, End Day. Title screen with grade; tutorial outbreak (scripted first game); debrief with
replay map scrubber, curves (you vs ghost city), pathogen card reveal vs your estimates, named dead.
Visual: modern incident room — clean clinical data design (the design brief's palette/typography is a good
start), illustrated portraits for interviewed people. WebAudio ambience/cues (subtle, mute toggle).
