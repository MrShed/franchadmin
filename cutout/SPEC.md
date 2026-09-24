# CUTOUT — technical spec, Milestone 1 ("the paper game")

Design brief (player-facing): see the published design page. This file is the build contract.

## Constraints
- One self-contained HTML file. Vanilla JS, no libraries. Built by `cutout/build.sh` from `cutout/src/`
  (`00-head.html`, `*.js` in filename order, `99-tail.html`) into `showcase/cutout.html`. Single global scope:
  every top-level identifier in the engine files starts with `CX` or lives inside the `CX` namespace object.
- Must work on a phone first (touch, ~390px wide portrait), and on desktop with mouse/keyboard.
- Deterministic: everything generated from a seed (`CX.rng(seed)`), so a case can be replayed and tested.
- Setting: Europe, autumn 1989 (the case starts on a date between 2 Oct and 20 Oct 1989). Grounded, le Carré
  tone, dry humour in the documents. No real living people as characters; real cities, plausible fictional
  hotels, streets, companies, banks.
- Case length target: 45-60 min of play; ~10-14 in-game days; ~6-10 network members + 3-6 innocents/herrings.

## Files (M1)
- `src/01-rng.js`      seeded RNG + helpers (pick, shuffle, int, chance, weighted).
- `src/02-data.js`     name pools per nationality, cities (with hotels, cafés, streets, border crossings, airports,
                       banks, landmarks, event venues), companies, items, operation templates, text templates.
- `src/03-world.js`    the generator: world + network + operation + timeline.
- `src/04-traces.js`   turns every timeline event into records in the record systems (+ initial tip + morning traffic).
- `src/05-records.js`  the record systems and the query API the player uses.
- `src/06-truth.js`    ground truth, proposition checking, batch confirmation, warrant checking, outcome resolution.
- `src/07-solver.js`   headless "ideal analyst" that proves solvability; generator retries until solvable.
- `src/10-*.js ...`    UI (separate step).
- `tests/` node scripts: `node tests/gen.js <seed>` dumps a case; `node tests/solve.js 1..200` checks solvability
  rate and stats. Engine files must run in node (no DOM access at load time) — tests `vm`-load them in order.

## World model
All entities have string ids.
- **City** {id, name, country, currency, lang, hotels[], cafes[], streets[], crossings[] (land borders to
  neighbours), airport, banks[], landmarks[], venues[] (conference hall, embassy, opera, ministry, hotel ballroom)}.
  Case uses 3-5 cities from: Vienna, West Berlin, East Berlin, Budapest, Prague, Munich, Zurich, Geneva, Rome,
  Paris, Marseille, Lisbon, Istanbul. Player's desk sits in Vienna (flavour; no gameplay effect in M1).
- **Person** {id, realName, sex, nationality, dob, role, cell, homeCity, address (street+no, flat), realPassport,
  aliases[] ({id, name, nationality, passport, dob}), phones[] (line numbers they use), vehicle (plate) optional,
  bank accounts[], traits (for later portraits), handwriting id (for later)}.
  Roles: `principal`, `cutout` (1-2), `operative` (the one who does the act), `specialist:armourer|forger|driver|
  financier|inside-man|chemist|lookout`, `courier`, plus non-network: `innocent` (people who brush against the plot
  by bad luck: a hotel neighbour, a car-rental clerk, a lover), `herring` (members of an unrelated smuggling ring
  whose traces overlap the case: shared hotel, same bank, similar alias).
- **Phone** {number, kind: flat|hotel-room|office|public, registeredTo (person id or company id or place)}.
  Numbers formatted per country (e.g. Vienna `+43 1 522 3091`).
- **Account** {number (IBAN-ish local format of the era, e.g. `CH 0019 4471-22`), bank, holderName (may be an
  alias or a cover company), city}.
- **Company** {id, name ("Danubia Import-Export GmbH"), city, address, directors[] (names — may be aliases), accounts[]}.
- **Vehicle** {plate (country format), make/model/colour, owner (person|rental company), rentals[]}.
- **Place** {id, kind: safehouse|deaddrop|venue|hotel|cafe|..., city, address}.

## The operation
Template types (M1 needs at least 4): `assassination` (target: a person at an event), `bombing` (target: venue
during an event), `theft` (target: documents/prototype from a building), `exfiltration` (smuggle a defector or
kidnap a scientist across a border). Each template defines:
- **What** (method) with a method family and required acquisitions: e.g. assassination-by-rifle needs a rifle
  (armourer), a room overlooking the route (recon), papers (forger), a car (driver); bombing needs explosive
  (stolen from a quarry / bought), a vehicle (van hire), a detonator (chemist), timing.
- **Target** (a named person or place/event) with a public schedule (published in newspapers, diplomatic
  bulletins): e.g. "Trade minister Hollmann of the FRG speaks at the Hofburg conference centre on Fri 20 Oct".
  Each case also schedules 2-3 decoy events (other dignitaries, other venues/dates) so "when/where" must be deduced.
- **Where** (city + venue/place) and **When** (date, time of day).
The four answers are the plot solution: {method, target, place, date}.

## Timeline (steps)
The network executes the operation as dated steps over the case (day 0 = case start; act on day D ≈ 10-14).
Phases: planning (principal→cutout instructions, money moves), logistics (acquisitions, forged papers, vehicle
hire, travel of specialists), reconnaissance (operative visits the site, books rooms, collects schedules),
rehearsal (dry run, final meeting), the act. Step kinds and the traces each leaves (see traces):
- `travel` {person, alias used, from, to, mode: car|train|air, day, time}
- `stay` {person, alias, hotel, nights, room}
- `call` {fromNumber, toNumber, day, time, duration, content template}
- `meet` {persons[], place, day, time, cover story}
- `pay` {fromAccount, toAccount, amount, currency, day, reference}
- `acquire` {buyer (alias), item, supplier (specialist or theft), place, day}
- `hire` {vehicle, renter alias, agency, days}
- `recon` {person, alias, place, day, kind: photographs|asks-porter|books-view-room|buys-schedule}
- `drop` {deaddrop, from, to, day, content: code phrase}
- `forge` {forger, for person, new alias, day}
- `act` {operative(s), method, target, place, day, time}
Communication discipline: the principal only talks to cutouts; cutouts to cell members; cells don't know each
other. The principal is always reachable by following money (financier/accounts) or by a cutout's calls.

## Traces and record systems (the heart of M1)
Every step writes records into one or more systems. Records are the ONLY way information reaches the player.
Each system is queried by a **key**; a record contains further keys (tokens). The player must hold a key (seen
in any document) to query it. Systems:

| System | Query key | Returns | Hours |
|---|---|---|---|
| `hotels` (police guest registration) | name, or passport, or hotel+date | stays: guest name, passport, nationality, arrival/departure, room, room-phone calls out (number, time) | 1 |
| `border` (crossing + airport immigration) | name, passport, or plate | crossings: date/time, point, direction, name, passport, vehicle plate, companions | 1 |
| `airline` (manifests) | name or flight no. | passenger lists with seat, booking agent, paid-by | 1 |
| `phones` (call detail records, Post & Telegraph) | number | subscriber, address, calls in/out (numbers, day/time, duration) for the case window | 2 |
| `bank` (requires court order) | account no., or company name | holder, address, transactions (date, amount, counterparty account, reference) | 4 |
| `vehicles` (registry + rental agencies) | plate | owner / rental agreement: renter name, passport, licence, dates, deposit paid from account | 1 |
| `residents` (Meldeamt / residence registry) | name, or address | who is registered where, since when, previous address | 1 |
| `companies` (commercial register) | company name | directors, registered address, bank, filing notes | 1 |
| `archive` (own service files) | name | old file cards: known associates, previous aliases (for some network members and herrings), photos (flag: photo exists) | 2 |

Plus **pushed** documents (arrive without a query): `tip` (the case opener: a partner service passes a fragment,
e.g. a defector's warning or an intercepted telegram), `traffic` (each morning: 1-3 items — partner-service
intercepts of some calls with transcript, police reports of thefts/break-ins, a newspaper page with the public
schedules of dignitaries (decoys and the real target), informant notes (sometimes wrong), consular reports),
and `newspaper`.

Document text is rendered from the record data with templates per system (typewriter forms, telex, CDR
printouts, bank statements, handwritten notes...). Every identifier inside a document is a **token** with
type (name, passport, number, plate, account, address, company, hotel, flight, place, date) so the UI can make it
tappable ("pull records on this", "add to board").

Aliases leak through **shared identifiers**: the same passport under two names (forger reusing a blank), the
same phone number called from two hotel rooms, the same car plate crossing with different drivers, a deposit
paid from one account, the same address on two registrations, companions crossing together, an archive card
listing previous aliases. The generator must ensure each alias of each network member is linked to that
person's real identity (or another alias) by >=2 independent shared identifiers where possible (>=1 minimum),
and that the herrings create at least one tempting false link (e.g. same surname, same hotel same night) that a
careful player can disprove (different passport numbers, different arrival times).

## Player knowledge and propositions (06-truth.js)
- The engine never exposes truth to the UI except through documents, confirmation results, and the debrief.
- **Subjects**: player-created cards referring to one or more names (`{id, label, names[]}`).
- **Propositions** (filed by the player; citing documents optional):
  - `same(nameA, nameB)` — two names are the same person.
  - `role(name, role)` — the person behind this name plays this role (roles list shown to player, incl. `innocent`).
  - `plot.method(value)`, `plot.target(value)`, `plot.place(value)`, `plot.date(day)` — from option lists the UI
    builds from what the player has seen (methods list, targets = scheduled dignitaries/venues from newspapers etc.).
- **Batch confirmation** (Obra Dinn rule): after each filing the engine counts correct *unconfirmed* `same`/`role`
  propositions; whenever there are >=3 correct ones, the 3 oldest correct become CONFIRMED (returned as an event
  so the UI can stamp them). Incorrect ones are never flagged. Plot propositions are never confirmed — you find out
  at the act.
- **Warrant** `{name, role, citedDocIds[]}`: approved iff the name belongs to a network member, the role is right,
  and >=2 cited documents come from different record systems and each contains a trace of that person (any alias)
  taking part in a step that implicates the role. Rejections give a reason category ("insufficient evidence",
  "evidence doesn't connect this name to the operation", "wrong role for the evidence") without revealing truth.
  A wrongful warrant (innocent/herring) costs credibility and in M2 raises heat.
- **Arrest** (approved warrant): person removed from the plot; future steps involving them are blocked or
  re-planned (M1: blocked; if the operative is arrested before the act, the act fails unless a backup operative
  exists — 30% of cases have one). Arrest yields an interrogation statement document (partial, may name a cutout).

## Clock
- Each query costs team-hours; the desk has 16 team-hours per day (M1 constant). "End day" advances to the next
  morning: new traffic arrives and the network executes that day's steps (records appear in systems only once the
  step has happened — you can't pull a future hotel stay).
- The act happens on day D at the planned place unless prevented. The UI shows the operation timeline with phase
  slots whose dates are hidden until a trace of that phase is found.

## Resolution (end of case)
Player chooses a response before/at day D (can also let it run):
- `arrest-only`: warrants executed; act prevented iff operative (and backup) arrested.
- `protect(target)`: act called off iff target is right; nobody caught (except already arrested).
- `trap(method, target, place, date)`: team caught in the act iff place+date right (method/target shift the
  quality) → every network member with any cited trace becomes arrestable; principal caught iff money trail to
  principal was established (a confirmed `role(principal)` or a same-link to the principal's alias).
- wrong guesses: the act happens.
Score: act prevented (big), members arrested, principal, wrongful arrests (minus), days to spare.
**Debrief** data: the full timeline with each step's traces and whether the player saw them.

## Solver (07-solver.js)
A headless analyst that starts from the tip + traffic, repeatedly pulls every key it holds (breadth first, per
day, respecting that records exist only after steps happen), and derives:
alias equivalences (union-find over shared passport/phone/plate/account/address/companion/archive links),
roles (from step participation patterns), and the plot (method from acquisitions, target/place/date from
recon + schedules + code words). A case is accepted iff by day D-2 the ideal solver can (a) link every network
member's aliases, (b) determine method, target, place and date uniquely among the scheduled options, and (c)
build warrants for >= operative + 2 others; and the herring false links are disprovable. Report stats: keys,
docs, days needed. Target: ideal solver needs <= 60% of available team-hours so a human has slack.

## UI (M1, next step — for reference)
Bottom tab bar: DESK (inbox of documents, unread dots; document viewer with tappable tokens), RECORDS (query
terminal: pick a system, key autocompletes from known tokens; results arrive as documents), BOARD (subjects as
cards with names/aliases, pinned documents, strings; pan/zoom; tap-two-to-link), CASE (propositions list with
stamps, plot hypothesis form, warrants, operation timeline, response/trap). Top bar: date, time, team-hours left,
"End day". Debrief screen at the end.
