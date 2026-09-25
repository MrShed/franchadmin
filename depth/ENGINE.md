# DEPTH engine API (src/01-09)

All engine code lives on the global `DX` (every file starts from `var DX`). The files are plain scripts,
concatenated in filename order into one scope by `build.sh`; nothing touches the DOM at load. Node tests load
them the same way (`tests/load.js`). Everything is deterministic from the seed: generation uses `DX.rng(seed)`
streams, per-event draws (copy corruption, DF error, warrant luck) use the counter RNG `DX.u(key, a, b, c)`.
The only `Math.random` is choosing a seed when none is given.

| file | contents |
|---|---|
| `01-rng.js` | `DX.hash`, `DX.u`, `DX.rng(seed)`, calendar (`DX.hhmm`, `DX.dateLabel`, `DX.nightName`), geometry helpers, `DX.pack/unpack` (save compression) |
| `02-data.js` | `DX.DATA` (names, districts, streets, places, callsigns, covers, codewords, keyword pool), `DX.GRADES`, `DX.MENTOR_INFO` |
| `03-city.js` | `DX.makeCity(seed, opts)` — Haldmar on the unit square |
| `04-crypto.js` | straddling checkerboard, pad/periodic arithmetic, plausibility scoring, crib drag, IC/period/columns/alignment, keyword search, grading |
| `05-ring.js` | ring, operation, message templates and traffic plan (the hidden truth); `DX.corpus()`, `DX.vocab()`, `DX.wordLM()` |
| `06-air.js` | propagation, noise, copy quality, DF bearings + fix ellipse, the van scene and meter |
| `07-case.js` | `DX.newCase`, `DX.load`, the Case object: time, receiver, log, bench, DF/van, links, warrants, security officer, inbox, debrief, save |
| `08-mentor.js` | the night supervisor's hints (3 tiers, solver-driven) |
| `09-solver.js` | depth solver (beam search over the station dictionary), periodic solver, generation acceptance `DX.verifyWorld` |

## Conventions

* **Time.** A case has `c.shifts` night shifts (Cadet 5, else 4). `c.shift` is **0-based** (0 = Monday 10 Oct 1977).
  A shift runs 18:00 → 02:00; `c.minute` is 0..480 within the shift. Player-facing day = `c.clock().day` (= shift+1).
  All `t`/`minute` fields in data are minutes within their `shift`.
* **Coordinates.** Unit square, x right, y down; the sea is to the north (small y). Positions are `[x, y]` arrays.
  Bearings are degrees clockwise from north (up the map).
* **Frequencies** in MHz (3–12). Tuning error `freqErr` is in **kHz**.
* **Groups** are 5-character strings of digits; an unreadable digit is `'?'`.
* **Ids.** transmissions `T12`, intercepts (log entries) `I7`, workbench messages `M114` (`no: 114`), buildings `b3`,
  van areas `A1`, warrants `W2`, inbox notes `N5`, places `p17`, districts `d4`, outstations `DF1..DF4`.
  Callsigns are strings (`'KX7'`, `'SÆL'`). Truth ids (`x3`, `r1`) appear only in `debrief()`.
* Every action returns `{ok:true, ..., events?}` or `{ok:false, err:'reason for the player'}`. Actions that spend
  station time return the `events` that happened meanwhile (see `wait`).

## Creating, saving, loading

```js
var c = DX.newCase(seed, {grade: 'cadet'|'analyst'|'chief', tutorial?: bool})
   // default grade 'analyst'; seed null = random. tutorial: fixed seed, cadet grade.
   // Generation retries (c.attempt) until DX.verifyWorld accepts: 5-340 ms in node.
var s = c.save()      // 'DX1:...' compact string (LZW, UTF-16 safe for localStorage), ~2-6 KB
var c2 = DX.load(s)   // identical case (the world is regenerated from seed+attempt; reactions and arrests replayed)
DX.GRADES             // [{id, label, blurb, shifts, warrants, outstations, ...knobs}]
c.seed, c.grade, c.gradeInfo, c.attempt
```

## State

| prop / call | meaning |
|---|---|
| `c.shift`, `c.shifts`, `c.minute` | see Conventions |
| `c.clock()` | `{shift, day, dayName:'Tue', date:'Tue 11 Oct', minute, hh, mm, label:'21:40', left}` |
| `c.over`, `c.outcome` | `null` or `{kind, win, title, text, shift, t}`; kind: `stakeout`, `arrest`, `collapse` (wins), `failed`, `sacked` (losses) |
| `c.alert`, `c.alertLevel()` | security officer's alarm 0..100; `{value, level 0..4, label:'calm'|'wary'|'nervous'|'alarmed'|'running scared'}` |
| `c.patience` | superintendent's patience (starts 120/100/80); at 0 the case is taken away (`sacked`) |
| `c.controller` | the controller's callsign |
| `c.notes` | free-form player pencil notes (string, saved) |
| `c.costs()` | station minutes per action `{depth, crib, place, period, columns, align, setKey, suggest, boardSolve (30), warrant (10), van (after the transmission: 5/10/15), df (0)}` |

## The city

```js
c.city -> {
  name: 'Haldmar', coast: [[0,y0],[1,y1]], sea: poly, land: poly,
  harbour: {poly, quays:[placeId...]}, river: [[x,y]...],
  districts: [{id:'d0', name, poly, centre:[x,y], blurb, coastal}],
  streets: [{id:'s0', name, line:[[x,y]...]}],
  places: [{id:'p0', kind, name, code, district, pos:[x,y], blurb}],
  outstations: [{id:'DF1', name, pos:[x,y], quality}]   // 3 (Cadet 4)
}
```
Place kinds: `quay` (Quay 1..9), `naval_yard` (3 places: main gate, dry dock 2, drawing office), `fuel_depot`,
`station`, `ferry`, `lighthouse`, `power`, `bridge`, `customs`, `radar`, `hotel`, `church`, `market`, `cinema`,
`post`, `tram`, `park`, `gasworks`, `hospital`, `cafe` (8), `spot` (10 quiet corners: possible dead-drop sites),
`signal` (5 chalk-mark sites), `phone` (6 phone boxes). `code` is how the ring writes the place in a message
(e.g. `'QUAY 7'`, `'OLAI WALL'`) — use it to highlight place names in decrypts.
`DX.cityDistrictAt(city, [x,y])` → district id.

## The air

```js
c.band() -> {
  now: [{id:'T12', freq, mode:'VOICE'|'CW'|'BURST'|'BCAST', strength 0..1, drift (kHz/min), t0, t1,
         label: 'SÆL → KX7' | null (unknown source) | broadcast name, callsign|null, remaining (min)}],
  schedule: [slot], noise: 0..1, minute, range:[3,12]
}
slot = {callsign, to, freq, minute, label:'21:40', mode, nights:[shift...], last, source:'casefile'|'heard'|'copied', repeat?}
c.schedule()               -> [slot]  (what the station has learnt; the case file gives the controller's slots)
c.upcoming(minutesAhead)   -> [slot + {expected:true, inMin}]  known slots projected onto tonight (not yet seen tonight).
                              Predictions only: a changed schedule simply fails to show up.
c.signal(txId) -> audio parameters for the receiver:
   {id, mode, freq, drift, strength, noise, t0, dur, groups:[true cipher groups for synthesis], callup:'KX7 DE R3M',
    fist:{wpm, dah, charGap, wordGap, jitter, swing, quirk}, voice:{voice:'female'|'male', interval:[semitones]}|null}
   (the audio may play the true groups; what the player COPIES comes from tune)
```
Broadcast stations (`mode:'BCAST'`, ids `B0..`) are always on and cannot be tuned for groups.
Transmissions with `mode:'BURST'` last one minute: you must already be tuned (call `tune` up to 15 minutes before `t0`).

### Time
```js
c.wait(minutes) / c.advanceTo(minute) -> {events, clock}
c.waitForSignal(max?) -> {events, tx: band view of what just keyed up | null, clock}
     // the operator sits at the set: time runs until the next transmission starts (or max minutes / 02:00)
event = {kind:'heard', t, tx, intercept, freq, mode, callsign}      // band watch logged a transmission (faint)
      | {kind:'warrant', t, warrant, wkind, result, inbox:[noteIds]}
      | {kind:'op', t, stopped}                                     // the operation hour came
```
Time never passes 480 on its own; call `c.endShift()` to go to the next night.
Advancing (advanceTo / wait / waitForSignal) to exactly a transmission's start leaves it on air and untouched:
it is not auto-logged as faint (it is logged faint only if the clock moves past its start without a `tune`).
Every transmission that starts while time passes is logged as a **faint** intercept (time, freq, mode, callsigns
from the call-up, no groups) and teaches the schedule. Copying needs `tune`.

### Receiver
```js
c.tune(txId, {freqErr: kHz, modeOk: bool, driftHeld: 0..1})
  -> {ok, intercept, msg:'M114', groups:[...], quality 0..1, lost, corrupt, events, clock}
```
The VVV test transmitter can be tuned but carries no groups (`msg:null, groups:[]`).
Call while the transmission is on air (or up to 15 min before; the clock advances to its start). The engine
advances the clock to the END of the transmission (you listen to the rest of it). Joining late loses the first
groups (`'?????'`). Quality = tuning × mode × drift × signal/noise; each group is garbled with probability
`garble × 0.6 × (1-q)^1.25 + 0.012` (grade `garble` 0.55/1.0/1.3), losing 1–5 digits. A competent operator
(freqErr ≈ 0.15, driftHeld ≈ 0.85) gets q ≈ 0.8. **Controller messages are repeated the next night 15 minutes
after their slot; copies of the same message merge automatically** on the workbench (per digit, `'?'` filled from
the other copy).

### Log
```js
c.log() -> [{id:'I7', tx:'T12', shift, t, clock:'21:40', freq, mode, callsign, to, dur, length (groups)|null,
             indicator|null, groups|null, quality, faint:bool, df|null, msg:'M114'|null, repeat:bool, test:bool}]
```
`test:true` = the VVV test transmitter.

## Workbench

```js
c.messages() -> [msg] ; c.message(id) -> msg
msg = {id:'M114', no:114, from, to, kind:'pad'|'periodic'|'clear', copies, intercepts:[...], first:{shift,t},
       groups:[merged], indicator|null, holes (count of '?'), length,
       sameIndicator:[other message ids with the same indicator group]   // = a depth!
       likelyIndicator:[ids whose indicator agrees except for garbled figures (≤2 '?')]
       decrypted?: {text, grade:'right'|'partial'|'wrong', score, by:'player'|'seized'|'mentor', shift, t},
       text?, source?  (kind 'clear': drop contents)}
c.board() -> null (Chief until recovered) | {key, blanks:[p1,p2], cols:[0..9],
       rows:[{prefix:'', cells:[10]}, {prefix:'p1', cells}, {prefix:'p2', cells}], fig:'78', stop:'79', codes:{A:'3',...}}
```
Pad messages: first group = indicator (the pad page) in clear; digits = the rest. Periodic (courier) messages
have no indicator. Plaintext alphabet: A–Z, `.` (stop) and figures (between FIG signs, each figure written twice).
Word spaces are not sent.

`c.bench` — each call costs station minutes (`c.costs()`), returns `events`:
```js
c.bench.depth(a, b)                 -> {diff:[digits,-1=unknown], diffStr, len, sameIndicator, kinds}
c.bench.crib(a, b, word, offset, side='A')
     -> {other, otherDigits, cribDigits, plaus 0..1, words:[dictionary words seen], skip, alts:[{skip,text,plaus}], fits}
        places `word` at digit `offset` in message `side` and shows what the other message reads there.
c.bench.place(a, b, side, word, offset) -> workspace   (commit a crib; free)
c.bench.unplace(a, b, index?)         -> workspace   (remove one / all)
c.bench.work(a, b) -> {a:{text, digits, runs, plaus}, b:{...}, placed:[{side,text,offset}], diff}
     both texts as far as the placed cribs determine them ('?' for unknown stretches, ~1 per 1.4 digits)
c.bench.suggest(a, b, offset, side)  -> {list:[{word, other, plaus}]}   (Cadet/Analyst only: likely dictionary words)
c.bench.period(ids)                  -> {ic:[{period, ic}] 1..12, repeats:[{seq, spacing, at}], best, via:'ic'|'crib', cribPeriods}
     best: the smallest period whose IC is within 70% of the strongest (never a multiple like 10 for 5); with the
     checkerboard, the courier's habitual opening (callsigns from the log) exposes key digits that must repeat,
     which pins the period even on one message (via:'crib').
c.bench.columns(ids, period)         -> {cols:[{col, n, freq:[10], fit?:[{shift, score}] best first, via:'crib'|'freq'}],
                                         bestKey:[digits]|null, crib, expect:[10]|null}
     fit ranks all ten shifts per column: where the opening crib covers the column consistently it is first
     (via:'crib'); otherwise by log-likelihood of the column's digits against the board's expected digit
     frequencies (the multinomial fit; chi-squared ranks the same way). bestKey = every column's fit[0]. On
     Cadet/Analyst this reads single courier messages (tests: 29/29 with period+columns+setKey).
c.bench.align(ids, period)           -> {rel:[key digits relative to column 0], conf:[...]}   (Chief: no board needed)
c.bench.setKey(ids, keyDigits)       -> {texts:[{id, text, plaus}], text, plaus}   trial decrypt
c.bench.keyFromCrib(ids, crib, period) -> {key:[digits, -1 unknown], keyStr, known, conflict}
     known plaintext: the crib (e.g. 'FORKX7NR#2.' — '#2' = a two-figure number) is assumed at the start of each
     message (every courier message restarts the key and couriers always open the same way)
c.bench.boardSolve(ids, period|relKey, crib?) -> {ok, keyword, key, plaus, board} | {ok:false, err}
     Chief: "time on the big computer" (30 min of station time; answers at once, also posted to the inbox).
     It tries every keyword in DX.DATA.KEYWORDS: from your crib (or the ring's usual openings with the logged
     callsigns), column frequencies and aligned columns; sets the checkerboard when one reads.
c.bench.decode(digits) / c.bench.encode(text)
c.bench.accept(id, text) -> {grade:'right'|'partial'|'wrong', score, card}   record a decrypt; graded against the truth
```
`ids` may be one id or an array (same courier, same key: the tools pool them; each message starts at key position 0).
Grading is alignment-tolerant (longest common subsequence; holes never match): right ≥ 0.95, partial ≥ 0.4.

### Operation card
```js
c.opCard() -> {what, where, when, who: {known, value, from:[msgIds], note, place? (where), night? (when), callsign? (who)}}
c.card(field, note)   // player's pencil note on a field
```
A field becomes `known` when an accepted decrypt (or drop contents) correctly contains that fact.

## Direction finding and the van

```js
c.df(txId, stationIds?) -> {ok, tx, bearings:[{station, deg, sd}], fix:{x, y, rx, ry, rot}|null, district, abroad}
     only while the transmission is on air; costs no time. sd grows for short signals, weak signals and bursts.
     fix: least-squares intersection, 2-sigma ellipse (rx, ry in map units, rot in degrees). abroad: the controller.
c.fix(bearings) -> fix       recompute from (possibly adjusted / subset) bearings
DX.inFix(fix, [x,y])
c.van(txId, centre?:[x,y]) -> {ok, scene}   while on air with >= 3 min left; centre defaults to the last fix.
     The hunt happens WHILE the set is on air: the UI runs the scene, may still call tune for the same
     transmission (the tape kept running; pass a lower driftHeld, the operator was busy), then vanResult.
scene = {id:'V0', tx, centre, origin:[x,y], size (map units, 0.16), district, cols:6, rows:6,
         streets:[{name, a:[x,y], b:[x,y]}] (scene coords 0..1), blocks:[{x,y,w,h, buildings:[{id,x,y}]}],
         start:[0.5,0.5] (the van arrives at the fix), seconds (real-time budget), noise, k (hidden target, do not read)}
         scene coords: x = (mapX - origin[0]) / size
DX.vanMeter(scene, x, y, sec) -> 0..1   signal meter at a scene point (noisy)
c.vanResult({x, y}|null, sceneId?) -> {found, kind:'exact'|'area'|'none', building?, area?, msgs, events}
     exact: within ~half a block of the set -> building located (evidence 'transmitter'); area: within ~1.5 blocks
     -> area circle. The clock goes to the end of the transmission + 5/10/15 min (crew debrief, by grade).
     The van may be noticed (raises alert). A mobile set is found in a parked vehicle: the registration gives the
     owner's home (how:'vehicle').
c.buildings() -> [{id, address, pos, district, how:'home'|'room'|'vehicle'|'van', occupant:{name,cover,photo}|null,
                   evidence:[{kind:'transmitter'|'meeting'|'drop'|'seen', detail, callsign?, shift, t}], callsigns, raided, strong}]
c.building(id), c.areas() -> [{id, tx, callsign, centre, r, shift}]
```

## Traffic analysis

```js
c.links() -> {nodes:[{id:callsign, heard, copied, modes, first}], traffic:[{from, to, n}],
              links:[{a, b, kind, support 0..1, supported:bool, why}]}
c.link(a, b, kind='talks'|'controls'|'same') -> the diagram + {ok} ; c.unlink(a, b)
```
Support comes only from what was logged (transmissions between the two; for `same`, the same fist).

## Warrants

```js
c.warrants() -> {left, total, used:[{id, kind, target, targetLabel, night, orderedShift, orderedAt, status, result}], stakeouts}
c.warrant(kind, target, params={night}) -> {ok, id, msgs:[noteIds], events} | {ok:false, err}
```
| kind | target | when it happens | result |
|---|---|---|---|
| `watch` | place id (any night ≥ tonight) | report at the end of that night | meetings seen (both parties followed home: buildings located, evidence `meeting`), drops loaded/cleared (followed: `drop`), or nothing (sometimes an innocent who lingered: evidence `seen`, weak) |
| `watch` | building id | +60 min | occupant identified (name, cover, photo) |
| `lift` | `spot` place id, tonight | +60 min | drop contents photographed → a `clear` message on the bench (the executor's package holds WHAT/WHERE/WHEN) or empty |
| `raid` | located building with evidence | +60/90/120 min (grade) | arrest (seizes set, pad → pad traffic decrypted, key, board); wrong house / decoy costs patience and alarms the ring |
| `stakeout` | place id + night | the operation hour | stops the operation if place and night are right (must be ordered ≥ 45 min before on the night itself) |

Refusals (`ok:false`) do not use a warrant. Warrants: Cadet 6, Analyst 4, Chief 3. Paperwork costs 10 minutes.
Wins: the executor arrested (`arrest`), the stake-out in place (`stakeout`), or the resident + N agents arrested
(`collapse`; N = 1/2/2 by grade). Loss: the operation happens (`failed`) or patience runs out (`sacked`).

## The security officer

Alarm rises with arrests (+18), wrong raids (+25), decoy raids (+20), lifts (+3, or +12 if the drop was noticed),
watches (+2, +6 if spotted), a noticed van (+8), and every dawn after arrests; scaled by grade (0.5/1/1.5).
At dawn each 20 points triggers the next reaction (grade sequence): `reschedule` (all stations move times and
frequencies), `stopReuse` (no more pad reuse → no new depths), `decoy` (a tape-keyer transmitter with a new
callsign sends random groups, sometimes re-using an old indicator; tracing it leads to an empty room), `burst`
(agents switch to 1-minute bursts), `move` (sets move to new rooms). The player is not told which; the superintendent's
morning note says the pattern changed. `c.debrief().truth.security.reactions` lists them.

## Inbox

```js
c.inbox() -> [note] ; c.markRead(id)
note = {id:'N5', shift, t, clock, kind, title, from, body:[line], refs:[ref], read, urgent?, found?:[buildingIds]}
kind = 'brief'|'casefile'|'mentor'|'report'|'result'|'warrant'|'super'|'outcome'
line = {k:'p'|'m'|'n'|'h', x:[seg]}     paragraph | monospace | aside | heading
seg  = 'text' | ref ;  ref = {t:'callsign'|'place'|'person'|'building'|'district'|'msg'|'intercept', id, d}
```
`person` refs carry the building id of that person (tap → building card). `DX.msgText(note)` → plain text.

## Shifts, mentor, debrief

```js
c.endShift() -> {ok, events, report:{shift, heard, copied, alert, warrantsLeft, patience, reactions}, outcome}
c.mentorStatus() -> {1:{ok, cost}, 2:{...}, 3:{...}, used}
c.mentor(tier 1|2|3) -> {ok, tier, text, refs:[ref], action?, cost}   (see 08-mentor.js)
c.debrief() -> {outcome, truth:{controller, ring:[member], security, operation, plaintexts:[...], keyword, board, drops,
               meeting, pairs}, stats, score:{parts, total, grade}}
```
member = `{callsign, role:'resident'|'agent'|'courier', name, cover, address, district, room, txFrom:'home'|'room'|'mobile',
executor, arrested, fist, cipher, movedTo}`.
plaintext = `{id, wb (bench id if heard), night, from, to, text, cipher, page, depthWith:[ids], facts:[...], heard, decrypted, cancelled}`.

## Deviations from SPEC.md

* `c.shift` is 0-based (`c.clock().day` is 1-based).
* `c.tune` takes an optional third field set only via `inp`; the copy result also returns the intercept and bench id.
* Depth workspace (`place/unplace/work`), `suggest`, `align`, `boardSolve`, `decode/encode` are extensions.
* `c.bench.period/columns/setKey` accept an array of ids (pooling one courier's traffic).
* `c.van(txId, centre)` takes where to send the van; `c.vanResult(found, sceneId?)`.
* Hints: `c.mentor(tier)` plus `c.mentorStatus()`.
* `c.waitForSignal(max)` (operator at the set), `c.bench.keyFromCrib`; `period`/`columns` add `via`, `cribPeriods`, `bestKey`.
* The van: spec says "real time + 30 min"; here the hunt overlaps the transmission and costs 5/10/15 min after it
  (a 30-minute block made the van cost the next schedule every time; balanced with tests/play.js).
* `DX.warm()` builds the language tables; `newCase`/`load` call it (so no action pays for it).
* Added: `c.signal(txId)` (audio), `c.schedule()`, `c.fix(bearings)`, `c.buildings()`, `c.areas()`, `c.opCard()`,
  `c.card()`, `c.alertLevel()`, `c.patience`, `c.costs()`, `c.message(id)`, `c.markRead(id)`.

## Tests (node, no dependencies)

| file | what |
|---|---|
| `tests/load.js` | loads `src/0*.js` as the page does and returns `DX` |
| `tests/api.js [seed]` | walks the whole API (~360 checks): shapes, costs, receiver, repeats merging, bench tools, DF + van, every warrant, security reactions, Chief's computer, mentor, save/load determinism, debrief |
| `tests/crypto.js` | checkerboard round trips for every keyword, pad/periodic arithmetic, depth cancels the pad, true cribs give true digits, the depth solver reads pairs and the operation facts, period finder + column fit + keyword search recover keys and boards |
| `tests/play.js [a..b] [--policy=competent\|aided\|none\|listener] [--grade=..] [--v]` | headless players (`tests/policy.js`) and win rates per grade |
| `tests/why.js [a..b] [--grade=..]` | post-mortem of lost games: what the case offered vs what the player got |
| `tests/perf.js [n]` | newCase timings per grade, every per-action call during played games, save/load |
| `tests/gen.js <seed> [--grade=..]` | dumps a case: ring, operation, drops, meeting, all plaintexts with cipher/depth, the transmission schedule (example: `tests/sample-case.txt`) |

The competent policy plays through the public API only (never `c._w`): it listens to known schedules and to
whatever keys up on the waterfall, mends garbled copies with the repeats, spots depths by indicator (including
near-matches), breaks them with crib dragging over the station dictionary (`DX.solveDepth`, paying one crib per
word), breaks courier traffic from the opening habit + column counts (Chief: books the big computer), reads the
facts out of its own decrypts, takes bearings on every Morse set, sends the van on targets, and spends warrants on
stake-outs, lifts, meeting/drop watches and raids with evidence. Receiver and van skill carry human error.
The `aided` policy is a phone player using only the UI's aids: best-fit keys (period → columns → setKey), DF, the
van (less precise), the operation card, and the supervisor's tier-3 help once a night for depths (no crib engine).
`none` does nothing; `listener` only copies traffic. Both must always lose.

## Balance (60 seeds per grade, `node tests/play.js 1..60 [--policy=...]`)

| grade | aided (UI aids, phone precision) | competent (expert, crib engine) | none / listener |
|---|---|---|---|
| Cadet | 90% | 98% | 0% / 0% |
| Analyst | 72% | 93% | 0% / 0% |
| Chief | 37% | 53% | 0% / 0% |

Grade knobs live in `DX.GRADES` (02-data.js). What makes the grades differ: nights (5/4/4), warrants (6/4/3),
outstations (4/3/3), reused pad pages (4/3/2), copy garble (0.7/1.0/1.45), bench costs, security-officer alarm
multiplier (0.5/1/1.5) and reaction order, checkerboard on file (Chief recovers it), courier key length and traffic,
the courier's package message naming the target (Cadet/Analyst only), DF precision, van time, raid delay, the
possible operation nights (Chief: sometimes night 2), patience, and how big a roll-up counts as collapse.
On Cadet/Analyst WHERE+WHEN are readable from one courier decrypt (period → columns → best-fit key) or a
lift of the executor's drop; depths and DF/van give the other routes.
