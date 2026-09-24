# CUTOUT engine API (src/01-07)

All engine code lives on the global `CX` (every top-level identifier is `var CX`). The engine files run in
node (no DOM at load) — `tests/load.js` vm-loads them in filename order, exactly as the built page does.
Everything is deterministic from the seed.

| file | contents |
|---|---|
| `01-rng.js` | `CX.rng(seed)` (int, chance, pick, shuffle, sample, weighted, fork), `CX.Calendar`, `CX.hm`, `CX.money` |
| `02-data.js` | `CX.DATA`: nationalities + name pools + passport formats, 13 cities (hotels, venues, cafés, banks, phone/plate/address formats), border crossings, airlines, items, 6 operation templates, target traits/code names, flavour text |
| `03-world.js` | `CX.buildWorld(seed, opts)` — people, identifiers, operation, decoy events, clue plan, dated timeline |
| `04-traces.js` | `CX.makeTraces(W)` — steps → records in the 9 systems + pushed traffic + noise |
| `05-records.js` | `CX.Case` — query API, document rendering, clock, save/load |
| `06-truth.js` | propositions + batch confirmation, warrants/arrests, resolution, debrief |
| `07-solver.js` | headless ideal analyst, `CX.newCase` (generation retries until solver-verified) |
| `08-analyst.js` | the night analyst: hints computed by the solver from the player's current holdings |

## Creating / loading a case

```js
var cs = CX.newCase(seed, opts)   // seed: number|string; opts: {template?: 'rifle'|'pistol'|'poison'|'bomb'|'burglary'|'abduction',
                                  //                              level?: 'probationer'|'officer'|'head'}
cs.save()                         // -> JSON string {v, seed, attempt, opts, log:[actions]} (~1 KB; replayed on load)
var cs2 = CX.load(json)           // rebuilds the same case and replays the log (fast, no re-verification)
```
`newCase` builds generation attempts `seed`, `seed#1`, ... until the headless solver proves the case solvable
with 9 of the 16 daily team-hours and NOT solvable with 3 (≈1.2 attempts, ~300 ms each in node).

### Difficulty grades (`opts.level`, `CX.DATA.LEVELS`, `CX.level(id)`, `CX.LEVELS`)
Saved in `opts` (so `cs.save()` carries it; saves without it are the standard grade). `cs.level`, `cs.levelLabel`.

| grade | generator | day | acceptance (ideal solver by D-2) |
|---|---|---|---|
| `probationer` | 5-member network (one specialist fewer, no optional roles/2nd cutout/backup), ≤1 alias each (no archive "old" aliases), 1 herring and no false-link traps, 2 decoy events (the pair that keeps clues combined), supply informant notes always, name the buyer 85% | 20 team-hours, D + 2 | solved with 5 h/day; no floor; ≥1 plot clue |
| `officer` (default) | the original generator — byte-identical cases | 16 | solved with 9 h/day, not with 3; ≥2 plot clues |
| `head` | +2–3 optional roles, likely 2nd cutout and backup, more aliases, 3-member ring + both false-link traps, +2 decoy events, a planted disinformation telex (`kind:'liaison'`, points at a decoy and a smuggler) | 16 | solved with 12 h/day, not with 5; ≥2 plot clues |

## Case state (read-only)

| prop | meaning |
|---|---|
| `cs.seed`, `cs.attempt` | seed string, generation attempt used |
| `cs.day` | current day index (0 = case start morning) |
| `cs.hoursLeft` / `cs.dayHours` | team-hours left today / per day (16; 20 for Probationer) |
| `cs.over`, `cs.outcome` | resolved? and the outcome object (see respond) |
| `cs.credibility` | starts 100; each wrongful warrant request costs 20 |
| `cs.startLabel` | e.g. `"Monday 9 October 1989"` |

Helpers: `cs.dateLabel(day)` → `"Fri 13 Oct"`, `cs.dateLong(day)` → `"Friday 13 October 1989"`,
`cs.dmy(day)` → `"13.10.1989"`, `cs.clock()` → desk time: 08:00 + hours used today, scaled so the whole day
fits 08:00–23:59 (one hour per team-hour at 16/day; never wraps to 00:00).
The act day is never exposed (only via `cs.timeline()` hints and the debrief).

## Documents

```js
cs.inbox()        // -> [doc] every document received (pushed traffic + query results), oldest first
cs.doc(id)        // -> doc
cs.newSince(n)    // -> inbox().slice(n)
CX.docText(doc)   // -> plain-text rendering (tokens shown as their display text)
```

```js
doc = {
  id: 'D0007',
  sys: 'hotels'|'border'|'airline'|'phones'|'bank'|'vehicles'|'residents'|'companies'|'archive'|'traffic',
  kind: 'query'|'tip'|'intercept'|'police'|'news'|'informant'|'press'|'porter'|'consular'|'statement',
  style: 'register'|'manifest'|'cdr'|'bank'|'card'|'form'|'report'|'telex'|'news'|'note',   // for theming
  title: 'Hotel registrations — name Karl Huber',
  from: 'Collated from police guest registrations',      // issuing authority line
  day: 3, time: '10:40',          // when it reached the desk (pushed traffic arrives 07:00-07:59)
  hours: 1,                       // team-hours it cost (0 for pushed traffic)
  query: {system, key} | null,
  body: [ line, ... ],
  tokens: [ token, ... ],         // unique tokens in the body, in order of appearance
  recs: [...]                     // structured records for the headless solver. They include analyst hints
                                  // (item categories, trait categories) — the UI must NOT display recs.
}
line    = { k: 'h'|'p'|'m'|'n'|'s', x: [segment, ...] }
          // h heading (a record header), p paragraph, m monospace/table row, n handwritten annotation, s stamp
segment = 'plain text' | token
token   = { t: type, v: canonicalValue, d?: displayText }     // show d || v
```

Token types and what they open:

| type | example `v` | queryable in |
|---|---|---|
| `name` | `Karl Huber` (display may be `HUBER, Karl` or `HUBER/KARL`) | hotels, border, airline, residents, archive |
| `passport` | `L 0847261` | hotels, border |
| `plate` | `W 34.871` | border, vehicles |
| `number` | `+43 1 522 30 91` | phones |
| `account` | `WHB 612-448-921/00` | bank |
| `company` | `Danubia Import-Export Ges.m.b.H.` | bank, companies |
| `address` | `Gumpendorfer Straße 48/12, 1060 Wien` | residents |
| `flight` | `OS 219` | airline |
| `hotel` | `Hotel Opernring, Vienna` (display `Hotel Opernring`) | hotels (with a date) |
| `date` | `"12"` = day index (display `13.10.1989`) | hotels (with a hotel) |
| `place` | `Staatsoper, Vienna` (venues, cafés) | — (plot form: place) |
| `target` | `Dr Karl Hollmann` (scheduled dignitary/object/scientist) | — (plot form: target) |

## Queries (RECORDS terminal)

```js
CX.SYSTEMS  // [{id:'hotels', label:'Hotel registrations', hours:1, keys:['name','passport','hotel+date']}, ...]
cs.knownTokens()          // -> [{t, v, d, doc}] every token seen so far (doc = id of first doc showing it)
cs.keysFor(system)        // -> known tokens usable for that system (for hotels includes hotel tokens)
cs.canQuery(system, key)  // -> null if allowed, else a reason string
cs.query(system, key)     // -> {doc, hoursSpent} | {error, hoursSpent: 0}
```
`key` = a token `{t, v}` from knownTokens (a bare value string also works), or for a hotel register
`{t:'hotel+date', hotel:'Hotel X, City', date: 12}` (both tokens must be held).
Errors: unknown system, key type not accepted, key not held, not enough hours today, case closed.
A query with no match still returns a doc ("No registration found…") and costs its hours.

| system | hours | returns |
|---|---|---|
| hotels | 1 | stays (passport, DOB, home address, room, room-telephone charges, reception notes) + reservations; hotel+date = the night's register (with bystanders) + reservations for that night |
| border | 1 | crossings: point, entry country, passport, DOB, vehicle/train/flight, companions, customs declarations |
| airline | 1 | by name: bookings (future ones too) with who paid; by flight: full manifests |
| phones | 2 | subscriber + call detail records (in/out, time, duration) for the case window |
| bank | 4 | holder, signatory, statement with counterparties and references |
| vehicles | 1 | keeper + rental agreements (renter, passport, DOB, address, deposit source, clerk) |
| residents | 1 | registrations (DOB, address, previous address, occupation, employer); by address: everyone registered there |
| companies | 1 | register entry: directors, bankers, notes |
| archive | 2 | own-service file card (summary, known aliases, associates) — also found via the alias index |

Records exist only once their step has happened (a stay arriving on day 5 is visible from day 6);
re-querying later can return more.

## Clock

```js
cs.endDay()   // -> {day, newDocs:[doc], outcome|null}
```
Advances to the next morning (hours reset to 16); the network executes the day's steps (records appear);
overnight traffic arrives. Ending the act day without a response resolves the case (`outcome` returned).

```js
cs.timeline() // -> [{phase:'planning'|'logistics'|'recon'|'rehearsal'|'act', label, days:[d...], known:bool}]
              //    days = days of network steps of that phase the player has seen a trace of
```

## Propositions (CASE tab) and board

```js
cs.file(prop)   // -> {id, confirmed:[propId...]}   (ids stamped CONFIRMED by this filing; usually [])
  // {type:'same', a:name, b:name}
  // {type:'role', name, role}              role from CX.ROLES (incl. 'innocent', 'herring')
  // {type:'plot', field:'method'|'target'|'place'|'date', value}   (one live value per field; replaces)
cs.unfile(id)   // withdraw an unconfirmed proposition -> bool
cs.props()      // -> [{id, type, a, b, name, role, field, value, status:'filed'|'confirmed', filedDay, confirmedDay}]
cs.plotOptions()// -> {methods:[...], targets:[{v,d}], places:[{v,d}], dates:[{v,d}]}  from newspapers seen
cs.subjects     // board cards [{id, label, names[]}];  cs.addSubject({label, names}) / cs.updateSubject(id, {...}) / cs.removeSubject(id)
```
Batch rule (Obra Dinn): after each filing, while ≥3 correct unconfirmed same/role props exist, the 3 oldest
correct ones become confirmed. Wrong ones are never flagged. Plot props are never confirmed.
Names of anonymous bystanders (hotel/flight noise) never count as correct.

## Warrants

```js
cs.warrant({name, role, citedDocIds:[...]})   // at most 4 docs are considered
  // -> {approved:true, statement: doc}       arrest; an interrogation statement doc is added to the inbox
  //  | {approved:false, reason, credibilityLost: 0|20}
  //    reason: 'insufficient evidence' | "evidence doesn't connect this name to the operation"
  //            | 'wrong role for the evidence' | 'already in custody'
cs.arrested()   // -> [{name, role, day}]
```
Approved iff the name belongs to a network member, the role is right, and cited documents from ≥2 different
systems each contain a trace of that person (any alias) in a step characteristic of the role. Requests
against innocents/herrings cost 20 credibility. Arrests block that person's future steps; arresting the
operative (and the backup, if any) prevents the act.

## Resolution

```js
cs.respond({type:'arrest-only'})
cs.respond({type:'protect', target})                       // target: plotOptions().targets[i].v
cs.respond({type:'trap', method, target, place, date})     // place: venue token v; date: day index
  // resolves the case immediately -> outcome
outcome = { response, prevented, how, caught:[names], principalCaught, wrongful, daysToSpare,
            score, scoreLines:[{label, pts}], summary }
cs.debrief()  // once cs.over:
  // { outcome,
  //   plot: {method, target, place, placeLabel, date, dateLabel, template, label},
  //   network: [{realName, role, aliases[], arrested, seenNames[]}],
  //   innocents: [{name, kind}], herrings: [{name, link}],
  //   timeline: [{day, dateLabel, phase, kind, text, traces:[{sys, seen}], seen, blocked}],
  //   stats: {docs, queries, hoursUsed} }
```
Trap: caught in the act iff place and date are right; every network member with any seen trace is taken;
the principal only if a correct principal role or same-link to one of the principal's names was filed.

## The night analyst (hints)

```js
cs.hintStatus() // -> {nudge:{ok, why}, pointer:{ok, cost:2, why}, direct:{ok, cost:10, why}, used:{nudge,pointer,direct}, total, log:[entry]}
cs.hint(tier)   // tier 'nudge' | 'pointer' | 'direct'
  // -> {ok:true, tier, text, refs:{docs:[id], pull:{sys, key, label, system, cost, today}|null, prop:{type,...}|null}, charged:{hours, credibility}, entry}
  //  | {ok:false, tier, text, empty?}   (nothing charged, nothing logged)
CX.ANALYST      // {name, title, bio, costs:{nudge:0, pointer:2, direct:10}, penalty:{nudge:2, pointer:5, direct:10}}
```
Computed by the solver (`CX._derive` over the player's own documents, `CX._scorePulls` over held keys and
records that already exist): **nudge** (free, one per day) names a document to reread — where the best next key
sits, or the two documents that share an identifier the player has not linked; **pointer** (2 team-hours)
names system + held key of the best next pull (preferring one that still fits today); **direct**
(10 credibility) states the most useful true, derivable, unfiled deduction — an alias link, then a role; plot
elements rank first in the last three days. Hints are logged (`['h', tier]`) and replay from saves; the
outcome gets a score line "Help from the night desk" (−2/−5/−10 each); `cs.debrief()` adds `level` and `hints`.

## Constants and test hooks

`CX.METHODS`, `CX.ROLES`, `CX.SYSTEMS`, `CX.DATA`. Tests only: `CX.caseFromAttempt(seed, opts, attempt)`,
`CX.solveWorld(W, {dayCap})`, `CX.minDailyHours(W)`; `cs._w` (world truth — never use it in the UI).

## Tests

```
node tests/gen.js <seed> [template] [--truth-only|--no-truth|--unverified]   # dump a case as text
node tests/solve.js 1..200 [--raw] [--template=x] [--verbose]                # solvability + effort stats
node tests/api.js [seed]                                                      # API walk-through + invariants
node tests/consistency.js [N]                                                 # timeline contradiction checks
node tests/debug.js <seed> [attempt]                                          # what the solver never saw
node tests/hints.js [N] [--level=x]                                           # night-analyst hints: valid, true, replayable
# solve.js, gen.js and consistency.js also take --level=probationer|officer|head
```
