# DEPTH — build contract

Player-facing design: `depth/DESIGN-BRIEF.html` (read it first). This file is the technical contract between
the engine (`DX` namespace, `src/01..09-*.js`) and the interface (`UI` prefix, `src/00-head.html`,
`src/10..29-*.js`, `src/99-tail.html`). Build: `depth/build.sh` -> `showcase/depth.html`.

## Decisions (from the user)
- Setting: Baltic, autumn 1977. Station Kestrel watches the fictional port city of Haldmar (~12 districts, harbour,
  naval yard, river). Fictional people, fictional ring. Serious tone, a little wry.
- Codebreaking uses REAL techniques (straddling checkerboard, one-time-pad addition mod 10, depth + cribs,
  periodic additive keys, operator habits), with generous tooling on easier grades.
- The DF van search stays (the one real-time moment).
- SHORT cases: 4 shifts per case (Cadet 5), ~30-40 min total. A shift is 8 in-game hours (e.g. 18:00-02:00),
  about 8-10 real minutes.
- NOT TOO HARD. The user finds my original games too hard. Three grades: **Cadet** (forgiving: ~90% win for a
  competent player), **Analyst** (default: ~70%), **Chief** (~40%). Verify with a headless competent player.
  Hints available (mentor = the night supervisor, Mrs Ansgar Holm... any fictional name) in 3 tiers like Cutout.
- Phone first (390x844 portrait and landscape), great on desktop. Visually stunning: painted instrument panels,
  paper, pencil. Audio is central (all synthesised, WebAudio).

## Constraints
- One self-contained HTML file; vanilla JS; no libraries, no network. Deterministic from a seed.
  Engine runs in node (no DOM at load) for tests. Autosave at the end of every shift and on every action
  (localStorage, compact string). New case < 1 s.

## The world model (engine)
- **Ring**: controller abroad (voice numbers station, callsign e.g. "SÆL") -> resident (KX7) -> 3-6 agents/couriers
  (callsigns), each a person in the city with a name, cover job, home address, district, habits
  (transmits from home / from a van / from a rented room; days and times; Morse "fist" = timing quirks; how careful:
  reuses pad pages? uses a periodic hand cipher? fixed openings?). One security officer who reacts.
- **Operation**: generated plot with a place, date and time (e.g. "sabotage the fuel depot at Quay 9 during the
  NATO exercise, night of shift 4"). Traffic builds towards it. Key facts the player can learn: WHAT, WHERE, WHEN,
  WHO (which agent executes). Win = stop it: arrest the executor before, or be at the right place/time (stake-out
  order on the right quay for the right night), or arrest the resident + enough agents that it collapses.
- **Messages**: plaintext generated from templates (orders, confirmations, meeting arrangements, dead-drop
  locations, schedule changes, the operation details spread across several messages). Letters -> digits via the
  ring's straddling checkerboard (a keyword board; common letters ETAONRIS one digit, others two digits; include
  figures-shift and a stop code). Encryption:
  - controller voice broadcasts & most agent traffic: one-time pad, digit-wise addition mod 10 without carry.
    Messages start with an indicator group naming the pad page. **Weakness: some pages are reused** (same
    indicator appears twice) -> depth. Grade controls how many reuses.
  - low-level couriers: periodic additive key (length 4-7) on the same checkerboard -> breakable by period
    finding (index of coincidence / repeated-sequence spacing) + per-column frequency against checkerboard stats.
  - operator habits: fixed openings ("NR" + number, "TO KX7", date), fixed sign-off -> cribs.
  - The ring's checkerboard: on Cadet/Analyst the station already holds it (captured earlier - in the case file);
    on Chief it must be recovered from a solved periodic message (still with tool help).
  Correctly-used pad traffic is unbreakable: only traffic analysis and DF help there.
- **Air & propagation**: a band 3-12 MHz. Transmissions have frequency, mode (VOICE AM numbers / CW Morse / BURST),
  start time, duration, strength, drift; propagation varies by time of night and district; plus background noise,
  broadcast stations, a decoy/test transmitter, harmonics. Controller broadcasts repeat the next night (so a garbled
  copy can be fixed). Schedules are regular (learnable) until the security officer changes them.
- **Copy quality**: when the player is tuned to a transmission for its duration, the engine yields groups with
  per-group corruption probability from a quality 0..1 (tuning error, mode set right, drift held, strength,
  noise). Corrupt groups show as '?' digits. Quality is what the receiver mini-game produces.
- **DF**: outstations (3; Cadet 4) give bearings only while a transmission is on air; each bearing has error
  sd depending on duration heard, strength and station quality. The engine returns bearings; the fix (overlap
  ellipse) is computed by the engine from the bearings the player chose to request; the player can adjust.
  **Van search**: real-time scene seeded by engine: a district street grid, the transmitter at a true position,
  signal meter strength by distance + noise; transmission lasts N seconds; the van moves along streets.
  Result: exact building (if found) or narrowed area.
- **Traffic log**: every intercepted transmission logged with time, freq, mode, callsign(s), length, indicator
  group, DF result. Player draws links between callsigns (diagram); engine scores each link as supported / not.
- **Station & time**: shift clock in minutes; actions cost time (tuning a scheduled transmission = its duration;
  workbench work costs minutes per operation, generously; requesting DF costs little; van search = real time
  + 30 min; warrants are resolved between shifts or with a delay). Warrants per case: grade-dependent
  (Cadet 6, Analyst 4, Chief 3): WATCH an address/area (identifies who lives there / who visits, photo),
  LIFT a dead drop (needs a location from a decrypt; yields a message in the clear or a pad page!),
  RAID (arrest; needs a located building + evidence tying that person to the ring), STAKE-OUT (a place + a night;
  catches the operation if right).
- **Security officer**: raises alert on raids, wrong raids, van seen, long silences after arrests; responses:
  change frequencies/schedule, switch to bursts, decoy traffic, stop page reuse, move a set. Grade scales it.
- **Hints (mentor)**: solver-driven. Tier 1 free nudge per shift ("the 21:40 broadcast repeats tomorrow"),
  tier 2 costs station time (points at the exact thing: "messages 114 and 121 share an indicator"), tier 3
  costs score (does it).
- **Solver** (tests): an ideal analyst using only observable material confirms every generated case is
  winnable within the shifts at each grade with realistic play; generator retries otherwise.
- **Scoring/debrief**: stopped or not; how (arrest/stake-out/collapse); ring members caught; warrants wasted;
  what was decrypted; the true picture revealed (full ring diagram, all plaintexts, the operation card).

## Engine API (DX namespace) — the UI codes against this; the engine may extend, not rename
```
DX.newCase(seed, {grade})      -> c   (grade: 'cadet'|'analyst'|'chief')
DX.load(str) -> c ; c.save() -> str
c.shift, c.shifts, c.minute (0..480 within shift), c.clock() -> {day, hh, mm, label}, c.over, c.outcome
c.city   -> {name, districts:[{id,name,poly,centre}], streets:[{name, line:[[x,y]..]}], river, harbour,
             places:[{id,kind,name,district,pos}], outstations:[{id,name,pos}]}   (unit square coords)
c.band() -> {now: [{id,freq,mode,strength,label?}] on air now, schedule:[known/observed regular slots]}
c.tune(txId, {freqErr, modeOk, driftHeld}) -> copy result when the player finishes listening
            (UI runs the receiver mini-game and passes the measured quality inputs; engine returns groups)
c.upcoming(minutesAhead) -> transmissions the player knows about (from observed schedules) in the next window
c.wait(minutes) / c.advanceTo(minute)  -> events that happened (missed transmissions still get LOGGED as
            'heard faintly' with time/freq only if the band watch was on - optional)
c.df(txId, stationIds) -> {bearings:[{station, deg, sd}], fix:{x,y,rx,ry,rot}}
c.van(txId) -> van scene seed {district, grid, target:{x,y} hidden in seed, seconds}; c.vanResult(found:{x,y}|null)
c.log()  -> intercepts [{id, t, freq, mode, callsign, to, length, indicator, groups:[string], quality, df?}]
c.messages() -> workbench items [{id, from, to, groups, indicator, kind:'pad'|'periodic'|'clear', decrypted?:{text, holes}}]
c.board() -> the ring's checkerboard if held {key, rows} or null
c.bench.depth(idA, idB)      -> {diff:[digits]}   (A minus B mod 10)
c.bench.crib(idA, idB, crib, offset) -> {other: string with letters/?}  (encodes crib via board, applies at digit
            offset, decodes the other; the engine also reports if the result is plausible language)
c.bench.period(id) -> {ic:[{period, ic}], repeats:[{seq, spacing}]}
c.bench.columns(id, period) -> [{col, freq:{0..9}}] ; c.bench.setKey(id, keyDigits) -> trial plaintext
c.bench.accept(id, text) -> records a decrypt (engine checks against truth: fully right / partly / wrong)
c.links() / c.link(a, b, kind) / c.unlink(a, b) -> player's diagram with engine support scores
c.warrants() -> {left, used:[...]} ; c.warrant(kind, target, params) -> {ok, msgs, err}
c.inbox() -> station messages (Special Branch reports, watch results, superintendent, mentor)
c.endShift() -> {events, report} ; c.mentor(tier) -> {text, action?}
c.debrief() -> {outcome, truth:{ring, operation, plaintexts}, stats, score}
c.notes (free-form player pencil notes store)
```
Refs inside message text are typed so the UI can make names/places/callsigns tappable.

## UI brief
- Screens (tabs along the bottom on phone): **RECEIVER** (waterfall across the band with a big drag dial,
  fine-tune knob, mode switch AM/CW, signal meter, the log sheet filling as groups are copied; schedule strip of
  upcoming known transmissions; "wait until" controls), **MAP** (Haldmar map, DF bearings as cones, fix ellipses,
  places, warrants; van search launches from here), **BENCH** (workbench: pick messages, depth view, crib drag
  by dragging a word along the difference strip, period finder chart, column frequency bars vs checkerboard
  expectations, checkerboard card; results written in pencil), **TRAFFIC** (callsign diagram you draw by
  dragging links; timeline of intercepts), **DESK** (inbox, warrants, case file incl. checkerboard, the
  operation card as you learn WHAT/WHERE/WHEN/WHO, mentor). Top bar: shift/clock, warrants left, alert level.
- Receiver mini-game (skill, but gentle): the signal drifts slowly; holding it centred with the fine knob and
  the right mode gives quality. Audio: static, carrier, voice numbers (synthesised: SpeechSynthesis if available,
  fall back to tone-coded beeps + on-screen digits), Morse with operator fist, interval signal tune, burst chirp.
- Van search: top-down street grid at night, van follows taps along streets, signal meter needle + audio
  beeping faster when closer, countdown.
- Title (grade select, seed), a guided first case (tutorial coach, scripted seed), end-of-case debrief with
  the full true ring and the operation.
- Visual direction: night shift in a 1977 listening post — painted equipment (bakelite, brushed steel, green
  phosphor), paper log sheets with pencil, a tracing-paper map. Rich and tactile; big touch targets.
