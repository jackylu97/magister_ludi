# The evaluations — the orchestrator's audit and a proposal (2026-09-07)

The user: *"clean up the evaluations in the game so that our day-one design
decisions are held true/simple, the yields that a certain effect will have
are easily discernible and calculated in a deterministic sequence."* This
is my own reading of the pipeline, end to end, after the H batches. User
marginalia are rulings; nothing in §4 moves until marked.

## 1. The day-one decisions, and whether they hold

| Decision | Where it lives | Holds? |
|---|---|---|
| **Rule 5** — a total is the fold of a labelled list, never computed beside it | every `explain…` | **In the sim, yes.** In the *readers*, no — four surfaces rebuild the town's list their own way (§3a). |
| **Entry XVII** — percentages compound across two stages, never inside one: `(base + flats) × (1 + Σcity%) × (1 + Σglobal%)`, floored once | `applyStages`, `cityYieldPercents`, `foldCityStages` | **Yes**, and it is the only place a yield meets a stage. But five *other* percentage-like operations now run before the stages (§3g). |
| **One evaluator** — `statecraft.ts` is the only module switching on `CardEffect.kind` | `liveEffects`, `cityEffectsOfKind` | **Yes** (H6 brought the luxuries' vocabulary in). The file is 9,025 lines, 124 exports, 239 case arms, 45 kinds. |
| **Data rows, code holds algorithms** | `data/*.json` | Yes. 65 rows carry `deferred`, 15 carry empty effects (§3e). |
| **Determinism by array order** | everywhere | Yes. Every fold walks `state.cities`, `ctx.lines`, `city.buildings` in their own order; the one `Map` in the hot path (`liveReading`'s memo) is read by lookup only. |
| **Windfalls are modifier-immune, composed once** | `windfallPayout` | Yes. |

The sim's arithmetic is sound and ordered. What eroded is *legibility*: the
order is written across three files and nine functions, and the readers
(the panel, the Ledger, the ghost-diff, the bot) each re-derive the list.

## 2. The sequence, as it runs today

Per town (`explainCity` → `foldCity`), in this order:

1. **The centre** (`foldCentre`: the base city yield, plus the hex's own science and culture as an *excess*).
2. **Each worked hex** (`explainTileYield`): terrain → hill/canopy → the seam → the works and their renewals → the law's `tileYield` lines in **two passes** (the lines that ask nothing of the fold, then the lines that pay on what the hex already pays — kk) with Ea-nāṣir's clamp on taking-back lines and same-source merging → the works percent (a share of the works' entries) → the ground percent (a share of the entries before the works).
3. **The cards' city lines** (`explainCardCityYields`: `cityYields`, `countScaled` paying a yield, `mirrorYield`, then the deck modifier lines — the amplifiers over the lines above).
4. **The luxuries' city lines** (`cityResourceYields`).
5. **The specialists** (a substitution for a hex left).
6. **The routes arriving** (five voices).
7. **The palace.**
8. **The buildings** (row flats + per-citizen science).
9. **The cards' building shares** (`explainCardBuildingYields`): ordinary shares over row + what the law put on the building (ll), then the `appliedLast` shares over that.
10. **The conversions** (`cardYieldConversions`: a share of the running flats of one voice, paid as another).
11. **The percent list** (`cityYieldPercents`: luxuries', cards', the two meter tiers, arrears) plus, for production only, `productionModifiers` folded into the city stage.
12. **`applyStages`** — the two multiplications, floored once.

Then per empire (`collectYields`, after every town is priced), as one list —
`explainEmpireLines`, batch H19: the luxuries' empire signatures → the caravans
abroad → `explainEmpireGold`'s lines → the empire card lines → **the empire
stage** over the additive fold of them (the meter tiers and the arrears, one
reconciliation line per voice) → the banks. Occasions pay through
`windfallPayout` outside all of this.

Twelve town steps, one empire list, two stages at each scale. **It is
deterministic and it is one sequence** — but no document states it, and no test
pins the order as an order.

### 2b. The flow, layer by layer, and where it stops being one-way

The user's ideal (2026-09-07): *information flows one way; downstream
subscribers never publish upwards and subscribe to a single source of
truth rather than recalculating; variables are cached and updated with the
user's actions, so yields that have not changed are not recalculated.*

| Layer | Source of truth | Computed when | Cached? |
|---|---|---|---|
| 0. **Rows** | `data/*.json` | load | constants |
| 1. **The law** — every effect reaching a seat | `liveEffects(state, seat)` | on ask | yes, per seat — but keyed on a **print** of the seat rebuilt per ask (§3c) |
| 2. **The hex** | `explainTileYield(tile, ctx)` | on ask, per hex | no; `yieldContextFor` is hoisted once per sweep |
| 3. **The town's list** | `explainCity` (flats + percents) | on ask | no; `refreshCityDerived` only re-seats citizens (`assignCitizens`) — the yields are "computed on read" by its own docblock |
| 4. **The town's total** | `foldCity` = `applyStages(quote)` | on ask | no |
| 5. **The empire's lines** | `explainEmpireLines` (luxuries, routes abroad, `explainEmpireGold`, `explainEmpireCardYields`, then the empire stage) | on ask | no (`foldEmpireRates` sweeps every town for a `rateConversion`) |
| 6. **The banks** | `collectYields` (once a turn) | end of turn | the state itself |
| 7. **Readers** | top bar `civYields`, panel, Ledger, card impact, lens, bot | on every accepted command (`updatePanel`) | H18: one shared sheet per screen draw; the Reliquary's figure by `(state, log.length, seat)` |

Where it is one-way: rows → law → hex → town → empire → banks is a strict
chain; nothing below writes above it, and the banks are written by one
phase. Where it is not:

- **The readers recompute** (§3a). Each surface walks layers 2–5 itself
  rather than subscribing to a list the town published — the panel, the
  Ledger, the ghost-diff and the bot are four private recomputations of
  layer 3.
- **Invalidation is manual and upward.** The register of twenty-two
  mid-turn yield mutations (`refreshCityDerived`'s docblock) is a list of
  *writers* that must remember to call the refresh — a windfall, a tile
  bought, a citizen focus, a route started. That is a downstream cache
  being poked by every publisher, which is the shape the ideal forbids. It
  works because the register is pinned by source tests; it is not
  one-way.
- **The law's memo keys on a walk**, not on the action (§3c): the print is
  taken on every ask because the sim mutates mid-turn without a command
  and there is no revision to key on.
- **The interface's revision is `game.log.length`** (`main.ts`,
  `getRevision`), the right idea — but the sim's own phases move the
  state without moving the log, so it is an interface fact, not a state
  fact, and nothing in `src/sim` can key on it.

The target, in the same terms: **one revision on the state** (bumped by
`applyCommand` and once per turn phase; deterministic and replayed), every
derived reading a memo keyed `(revision, seat | town)` in a leaf, the town
publishing its labelled **list** once per revision and every reader —
panel, Ledger, lens, card impact, bot — reading that list and never
walking layers 2–5 themselves. The twenty-two-entry register then goes:
a writer moves the state, the revision moves with it, and the caches
follow without being told. That is §4 steps 2 and 4, and it is the whole
of the answer to "don't recalculate yields that haven't changed".

### 2c. Which layer each effect kind lands in — verified

The user's convention: *each layer takes its additive bonuses, then its
multiplicative ones, then hands its figure to the next layer; the failure
mode is a town bonus applied before a hex bonus.* Probed on one worked
hill hex (seed 905), 2026-09-07:

| Layer | Additive | Multiplicative (within the layer) | Measured |
|---|---|---|---|
| **Hex** | terrain, hill/canopy, seam, works; the law's `tileYield` lines (two passes); the `cardYieldAmplifier` *flat* on those lines | works percent (a share of the works' entries); ground percent (`basePercent`, a share of the entries before the works); the amplifier's *percent* on card tile lines | Hills override the grassland to 0 food; Terraced Hillsides +2 and The Harvest Home's +1 land **on the hex** (`Order · The Harvest Home · hill hex`); the hex folds to 3 before the town sees it |
| **Town list** | centre, the hexes' folds, `cityYields`, `countScaled` (city), `mirrorYield`, the amplifier's flat on card lines, luxuries, specialists, routes in, palace, buildings, `routeYield` (arrivals) | the amplifier's percent on card lines; the building shares (ordinary, then `appliedLast`) over row + the law's lines on the building; the conversions, a share of the **running flats** of a voice | flats food 6 = centre 3 + hex 3; The Harvest Songs' 15% is 0.9 culture, taken of the flats, before any stage; the Synod's half is 1 faith over the temple's 2 and 1.5 culture over The Choir's 3 |
| **Town total** | — | `percentYields` (city stage), `productionModifiers` (city stage, production), the meter tiers and arrears (empire stage): `(flats) × (1+Σcity) × (1+Σempire)`, floored once | the happiness tier's +10% culture lands last: 1.9 → 2.09 |
| **Empire** | `empireYields`, `countScaled` (empire), `rateConversion`, luxury signatures, caravans abroad, the treasury's **income** lines (connections and a luxury's share of them); the **bills** — maintenance, the levy's surcharge, the charter's rebate, the treaties — are costs and stand outside the multiplication | the **meter tiers and the arrears**, once, over the additive fold: `(Σ empire lines) × (1 + Σ empire%)`, exact (batch H19, ruling oo) | an Order paying the realm +3🔬 into a seat a contentment tier up banks 3.3; the tier's own line reads `Empire stage · ×1.10` |

The order is structural, not incidental: `explainTileYield` is
self-contained and `explainCity` consumes its fold, so a town bonus cannot
reach a hex; `explainCity` returns flats and a percent list and `foldCity`
is the only place they meet. Two conventions worth stating in
`docs/yields.md` because a reader would not guess them: the hex's two
percentages are over *subsets* of the hex (the works; the ground), never
the hex's total, so two cards cannot pay each other interest; and the empire's
lines take the empire stage **once, over their own fold** — never the city
stage, which has no town to be a fact about, and never a town's percentages.

Two cuts inside that second convention, both stated rather than incidental:
the stage is `empirePercents` — the meter tiers and the arrears — and **not**
a card's `stage: 'empire'` percentage, which is written about a *town* and
reaches the empire only through the towns it names; and the treasury's bills
are outside it, because a contented empire earns more from its roads without
paying its soldiers less. Today no meter tier touches gold at all (contentment
pays science and culture, the writ pays hammers), so the bill/income split is a
rule stated ahead of the first percentage that would test it — which is why
every treasury line declares its own `TradeGoldKind` rather than leaving a
reader to infer one from a sign.

## 3. Findings

### 3a. The list is built four times (redundant, and the root of the Ledger bugs)

`explainCity` folds the twelve steps into a *total* and keeps only the flats
and the percent list. The labelled list a player reads is rebuilt by each
reader:

- the city panel walks the same sources itself to print lines;
- `cityFlatsByClass` (the Ledger) walks all twelve again to class them, then
  shares the bank back — the mirror that hid tile cards under the land and
  percent cards under nobody until yesterday (jj), and is pinned to
  `explainCity` only by a test that compares totals;
- `explainCardImpact` ghost-diffs the empire twice per card because it
  cannot read a card's own lines out of a total;
- the bot's `explainBuildingRow`/margin re-price rows from the row.

**This is rule 5 kept in the sim and broken in the readers.** Every
Ledger bug of the last two days was a reader disagreeing with the fold.

### 3b. The ghost-diff is the slow call

`explainCardImpact` = two full empire folds (every town, every hex) per
card. The Statecraft screen asks it for every card in the hand and every
slotted card on every draw; the Reliquary asked it for every legacy on
every accepted command (H18 is fixing the frequency). With a labelled list
(§3a) a card's flats are *read*, not diffed; only its percentages,
conversions and meter knock-ons need a ghost, and one baseline fold serves
every card on a screen.

### 3c. The effect memo's key is a walk

`liveReading` remembers the effect list per seat, but its key is a *print*
of the seat (every slot, belief, building, legacy, timed effect, bead,
tech, held religion) rebuilt on **every ask**, and there are 54
`effectsOfKind` sites asking. The print is cheaper than the build, but it
is O(everything the seat holds) per call, thousands of calls a turn. The
house key is `(game.log.length, playerId)` plus the turn phase; the print
was chosen because phases mutate mid-turn without a command. A
`state.revision` counter, incremented in `applyCommand` and once per phase,
is deterministic (it replays identically) and makes every memo in the game
a two-integer compare.

### 3d. Eight ways to say "pays a yield" (vocabulary sprawl)

`cityYields` · `tileYield` · `empireYields` · `routeYield` · `mirrorYield` ·
`countScaled` (paying a yield) · `rateConversion` · `yieldConversion` are
one idea — *pay a voice* — with different **where** (town, hex, empire,
route) and different **basis** (flat, per count, a share of a voice, a
mirror of a category). Each has its own reader, its own describer, its own
bot arm. H6 merged the four flag-rule kinds the same way; the yield family
is the larger case, and the harder one, since data rows must migrate and
byte-identity is the gate.

### 3e. Declared, not built — 65 deferred rows, 15 empty

| File | Rows |
|---|---|
| statecraft.json (26 + 8 empty) | The Curia, Mountain Hold, The Burning Way, Religious Mandate, Blitz, The Levée en Masse, The Gentle Yoke, The Closed Realm, The Horse-Tribes, Triumphs, Sanctuary, The Escorted Roads, The Dry Docks, The Wolf-Standard, The Far Charts, The King's Road, The Siege Train, Patrons, Court Astronomers, Forced March, Admiralty, The Silk Exchange, The Guild Compact, Manufactories, The Magister's Court, The Jubilee; Chiefdom (empty) |
| buildings.json (11) | Terracotta Army, Statue of Zeus, Notre-Dame, Forbidden City, Alhambra, Shipyard, Printing House, Observatory, Bank, Magnum Opus, Cistern |
| beads.json (9) | The Encyclopaedia, The Mint, Three of the Age, The Scholar's Wager, The Surveyor, The Patron, The Long Reign, The Builder, The Legacy |
| techs.json (6) | Epic Poetry, Code of Laws, Paper Money, Satrapies, Daughter Cities, Castellany |
| religion.json (5 + 5 empty) | The Vigil, Holy Order, Theocratic Mandate, The Promised Land, Blessing of Arms |
| greatPeople.json (3) | Dinocrates, Mimar Sinan, Yi Sun-sin |
| triumphs.json (3) | The Fallen Become Verse, The Long Road, The First Keel |
| improvements / resources (1 each) | Floating Gardens; Ivory |

Most are a *clause* deferred on a row that otherwise works (the Compendium
labels each). Every one is a row a player can draft or build that promises
something the game does not do. They want a ruling each: build, cut, or
keep with the label.

### 3f. Where the logic is hard to follow

- `explainTileYield` — ~250 lines: the clamp, the same-source merge, the
  two passes, the works percent, the ground percent. Each rider is
  justified in its docblock; together they are the hardest function in the
  sim to predict. A hex's answer wants a *stated* order (§4.1).
- `explainCardBuildingYields` — two passes (ordinary, `appliedLast`) over a base
  that now includes the law's lines (ll).
- The Ledger's share-back — two shares (flats by earner, gain by
  percent-supplier, same-sign rule) reconstructing what §3a would simply
  read.
- `foldCityStages` folding `productionModifiers` into the city stage for
  production alone — a special case the Ledger had to mirror.
- `foldCentre`'s inheritance "as an excess over the base city yield" —
  the one line no list can share out.
- `liveReading`'s `asked` conditions — a memo that re-asks every empire
  condition it consulted before trusting itself (§3c makes it unnecessary).

### 3g. Percentages outside Entry XVII

Five percentage-like operations run *before* the two stages: the works
percent on a hex, the ground percent on a hex, the building shares
(ordinary then last), the amplifier's percent on card lines, the
conversions' share of a voice. Each is deliberate and each is exact; but
"what does +50% do" now has six answers depending on the kind. Not a bug —
a discoverability cost, cured by naming them in one place (§4.1).

### 3h. Slow calls (H18 is measuring; the shape is known)

The ghost-diff per card (§3b); the per-ask print (§3c); `explainTileYield`
asked millions of times a turn with `yieldContextFor` hoisted per sweep in
the sim but per *hex* on some UI paths; the Ledger's three walks per town
per read; `snapshotState` on every autosave.

## 4. The proposal — the list is the artefact

Each step is its own batch, byte-identity its gate (the H6 discipline:
hashes over four boards at t30/t60/t150 before and after).

1. **`docs/yields.md` — the sequence of record.** §2 written as a numbered
   reference with one row per step (what it reads, what it may contain,
   its stage), the five pre-stage percentages named, and a **sync test**
   that walks `explainCity`'s source and asserts the steps appear in that
   order. Cheap, and it is the document the user asked for.
2. **`explainCity` returns the list.** One `CityYieldLine[]` — `source`,
   `card?`, `building?`, `resource?`, `class`, the six voices, `step` —
   and `flats` is its fold. The panel prints it, the Ledger classes it by
   the `class` it already carries (`cityFlatsByClass` and the mirror pins
   go), the bot reads it, `snapshotState` never sees it. The percent list
   gains `card?`/`building?` (H17 did this) so the gain share needs no
   second walk.
3. **`explainCardImpact` reads, then ghosts once.** A card's flat lines
   are its own lines out of (2); one baseline fold per screen; a ghost only
   for the stage, conversion and meter differences. The Statecraft screen
   and the Reliquary fall out of the slow list.
4. **`state.revision`** — a counter bumped in `applyCommand` and per phase,
   the key of every memo (`liveReading`, `tileOwnerField`, `zocField`, the
   yields lens). Deterministic, serialised, replay-identical. Kills the
   print.
5. **The yield family collapsed** — `pays { where, basis, voice… }` with
   eight rows' worth of `kind`s migrated in data; describers and bot arms
   merge. H6-shaped, high risk, last; only if (1)–(4) leave the appetite.
6. **The deferred rows ruled** — the table in §3e, one line each: build /
   cut / keep. The Compendium keeps labelling whatever stays.

### 4b. Organisation, for cleanliness going forward (the user, 2026-09-07:
"keep it as simple as possible")

7. **Three verbs, and only three.** `explainX(…)` returns a labelled list
   and never a number; `foldX(list)` is the one sum of it; `readX(state, …)`
   is the memo — `explain` + `fold`, keyed on the revision. Anything else
   named `…Yield(s)`, `…Total`, `…Rate`, `…Reading` is renamed to one of the
   three or deleted. Today `cityQuote`/`cityYields`/`civYields`/
   `empireRateReading`/`ledgerReading`/`explainCardImpact` are six spellings
   of two ideas.
8. **The readings are the subscription model.** There is no event bus and
   there should not be one: a reader is a pure function of `(state)` and
   the revision is the subscription. `readCity(state, city)` → the town's
   list, flats, percents, total; `readEmpire(state, seat)` → the towns'
   readings, the empire lines with their stage line, the banks-to-be. The
   interface's `updatePanel` becomes "the revision moved — re-read", and
   `getRevision` moves from `main.ts` onto the state.
9. **Files by layer, not by topic.** `cities.ts` (6.4k lines) and
   `statecraft.ts` (9k) split along the layers of §2b: `yields/hex.ts`,
   `yields/town.ts`, `yields/empire.ts`, `yields/stages.ts` (the two
   multiplications and nothing else), `statecraft/evaluator.ts` (the one
   switch), `statecraft/describers.ts` (the words), `statecraft/draft.ts`
   (pools, offers, rerolls). Leaves stay leaves; `moduleCycles.test.ts` is
   the gate. Mechanical, after (2) so the split moves settled code.
10. **One doc per layer, sync-tested.** `docs/yields.md` (§4.1) carries the
    sequence; each layer's section lists the kinds that land there (§2c's
    table) and a test asserts every `CardEffect.kind` that pays a yield is
    named in exactly one layer — a new kind then has to say where it lands
    before it compiles.

## 4c. E2 as shipped (2026-09-07)

Schema **87**: `GameState.revision`, nought at `newGame`, raised by
`applyCommand` on every **accepted** command (after the mutation, before the
result leaves) and once by `runEndOfTurn` after **each** phase in the fixed
order. Deterministic and replayed; no rule reads it. A v86 log replays
identically — only the snapshot gains a field.

**What became a line.** `explainCity` returns `CityYieldLine[]` — `step` (1–10 of
`docs/yields.md`), `source`, `card?`, `building?`, `resource?`, `class`, the six
voices — and `flats` is `foldCityFlats(lines)`. Every summand it folded is now
a line:

| step | lines |
|---|---|
| 1 | the centre (`tiles`) **and** the town's own two terms — a citizen's beaker, a settlement's culture (`other`) |
| 2 | per worked hex: each `add` contribution naming a card, under that card's class, then the hex's fold **minus exactly those**, labelled by its own ground |
| 3 | `explainCardCityYields`, one per card line |
| 4 | `cityResourceYields`, `tiles`, carrying the seam |
| 5 | `citySpecialistYields`, `buildings` |
| 6 | `cityRouteYields`, `trade` |
| 7 | `explainPalaceYield`, `buildings` |
| 8 | `explainCityBuildings`, `wonders`/`buildings`, the per-citizen beaker folded into the line's own science |
| 9 | `explainCardBuildingYields`, the card's class (`buildings` for a line with no card) |
| 10 | `cardYieldConversions`, over `foldCityFlats` of steps 1–9 |

`class` is decided in the simulation by `classifyCard`, which moved with the
class vocabulary into the leaf `src/sim/ledgerClass.ts` so that `cities.ts` can
name a slice without importing a screen.

**The readings.** `src/sim/readings.ts` (a leaf above `cities.ts`, imported by
none of it) holds three memos, each a `WeakMap` on the state carrying one slate
per revision, thrown away whole when the revision moves and read by lookup only:
`readEmpirePercents(state, seat)` (the two meter sweeps, hoisted once for
everybody), `readCity(state, city)` → the plain quote, `readEmpire(state, seat)`
→ `{ towns, lines, stage, empire, totals }`.

**What was deleted.** `cityFlatsByClass` and its `addWorkedTile` (the Ledger's
eleven-list mirror of `explainCity` — the largest of §3a's four private copies);
the city panel's four private walks of `cityResourceYields` /
`explainCityBuildings` / `citySpecialistYields` / `cityRouteYields` and its three
near-identical figure printers, now one `quoteFigures` over the published list;
`civYields`' own town sweep and empire fold; the top bar's per-town
`empirePercents` hoist and its second `explainEmpireLines` call; the bot's four
hand-rolled `explainCity(state, city, [], empire)` hoists in `value.ts`, `bot.ts`
and `wants.ts`; `cardImpactSheet`'s private `cityCardSums` for the **real**
board (it reads step 3 of `readCity` now, and gained `revision` in its identity
guard). `main.ts`'s `getRevision` is `game.state.revision`.

**What stayed, and why.** `refreshCityDerived` is unchanged and still called by
all twenty-two: it re-seats citizens, which is stored derived state and the one
thing a counter cannot do. What its docblock no longer claims is any part in
keeping a *yield* fresh — that is the revision's, and no caller existed purely to
invalidate a reading. `collectYields` also keeps its own calls, for two reasons:
`cities.ts` importing `readings.ts` would be a runtime cycle
(`moduleCycles.test.ts` is the gate), and the phase's two loops price every town
against a **pre-banking** treasury while `explainEmpireLines` is taken after the
towns have banked — a reading taken once for both would change the arrears every
town is priced against.

**What did not ship: §3c.** Dropping `livePrint`/`printsAgree`/`gatesAgree` and
keying `liveReading` on the revision **fails 322 tests in 27 files**, including
the E1 gate `test/sim/yieldOrder.test.ts`. The cause is not the simulation: it is
that the suite's benches build a board and then mutate it by hand — slot a card,
push a building, grant a technology — without a command behind it, so the
revision never moves and the memo is permanently stale. The print is doing
invalidation work the counter cannot do until every bench announces itself
(`bumpRevision`, which is exported and which four benches now call). It wants a
ruling and a batch of its own; the memo is otherwise untouched. **E3a is that
batch** — see §4c.1.

**Memo keys, in one place**: `readings.ts` — `(state identity, revision, seat)`
and `(state identity, revision, city id)`; `cardImpactSheet` — `(state identity,
revision, seat)`; the Reliquary — `(state identity, revision, seat)`;
`liveReading` — unchanged (the print), until E3a.

**Parity**: the four boards at t30/t60/t150 compare equal on every recorded
reading. The `snapshot` field of each mark moved, and only that field was
regenerated — the schema went to 87 and the state gained `revision`, so the
canonical print of the board is a different string by construction.

## 4c.1. E3a as shipped (2026-09-07)

§3c, closed. **No number, no replay and no schema moved** (still 87): the parity
fixtures are byte-untouched and all four boards compare equal.

**The memo's key.** `liveReading` (`statecraft.ts`) is now
`(state identity, state.revision, playerId * 2 + cut)` — the same shape
`readings.ts` uses, held on a `LiveSlate` (`{ revision, bySeat }`) in the same
`WeakMap`-on-the-state, thrown away whole the moment the counter moves. The cut
stays a separate slot: an empire being *asked about* has every gated clause
closed and so has a shorter law than the same empire being paid.

**What was deleted** (~110 lines of `statecraft.ts`):

| gone | what it was |
|---|---|
| `livePrint` (50 lines) | every input the walk reads, read again as values on **every** ask — turn, government, doctrines, slots, beliefs, one-of-a-kind buildings, legacies, timed effects, beads, technologies, held religions, each list preceded by its length. A fifth of what the evaluator cost (`docs/bot-priorities.md` batch 10) |
| `printsAgree` (8) | two prints, position by position |
| `gatesAgree` (7) | every `conditionRule` the build consulted, re-asked — the case no print could cover |
| `AskedCondition` + the `asked` record (~12) | the notebook `buildLiveEffects`, `pushEffects` and `timedLive` threaded through so `gatesAgree` had something to re-ask |
| `LiveReading.print` / `.asked` | the memo's two extra fields |

`conditionRule` flattening stays where it was: that is evaluation, not
invalidation. The three walks now take one parameter fewer each.

**The one seam that needed more than a counter.** `realiseItem` (`cities.ts`)
puts a building in a town and then, three lines later, asks the law what the row
hands over — and a wonder is the fifth source of that law. A command raises the
revision when it is *finished*, so the reading inside the handler would be of the
board as it stood before the stones went up (Stonehenge's own `pantheonSlots`
line, `religion.test.ts`). It calls `forgetTheLaw(state)` — a **cache-drop**, not
a bump, because `revision` is a serialised field and raising it here would move
the canonical print of every board that ever finished a building. Its docblock is
the register of seams that read a law they have just changed, and it has one
entry.

**Two other memos re-keyed.** The tech tree's unlock prices moved off
`game.log.length` onto `game.state.revision` (the same idea one layer too high:
a phase moves the world without moving the log); the Reliquary's and `value.ts`'
docblocks stopped describing keys they no longer use.

**The benches.** **57 test files** and **4 shared helpers** now announce their
hand mutations — 656 `bumpRevision` calls in all, of which 157 are
`statecraft.test.ts`'s. Where a helper does the mutating it announces once for
everybody: `found` and `keepTheRites` (`statecraftHelpers`), `bareState` and
`woodedWorker` (`improvementHelpers`), `openEveryWar` (`warHelpers`), and the
`slot`/`seat`/`govern`/`rule`/`unslot`/`farmTown`/`putToSea` helpers inside
`statecraft.test.ts`.

**One bench was passing by accident** and was re-aimed rather than bumped:
`statecraft.test.ts`'s "folds every row it touched, in a chair, without moving
the state" snapshots the board, slots each of ~120 Orders, folds every ledger,
unslots, and asserts byte-identity. Its own hand now moves `revision`, which *is*
a byte of the snapshot — so it compares the two prints with the revision masked
out and says why. The claim it was making (a fold is a question, never a turn) is
unchanged; what moved is the bench's own signature.

The `describe('the remembered walk')` suite was rewritten around the new
contract: the rite, the legacy, the gate and the wonder cases each move the world
and then say so, and two new cases pin the key itself (one list per seat until
the revision moves; the counter moves on an accepted command and stands still on
a refused one).

**The guard.** `test/sim/benches.test.ts` — a source-reading lint over `test/sim`
and `test/ui`: a file that writes any of twenty-three patterns (the ten sources
of `liveEffects` plus the banks) must import `bumpRevision` or take its board
from a helper that calls it. Its docblock carries the pattern list. It is a lint,
not a proof: it is file-level and cannot tell a poke that matters from one taken
before any reading. One stated exception, `state.test.ts`, which writes the
counter because it is *measuring* it. `readings.test.ts`'s "no memo keys on the
log" pin gained a sibling: no memo in `src` keys on a print, and every
`WeakMap<GameState, …>` in the tree names the revision.

**The contract, now stated in one sentence on `liveReading` and on
`GameState.revision`**: *a reading is taken at rest; whoever moves the state
moves the revision.*

## 4c.2. E3b as shipped (2026-09-07)

§4b steps 7 and 9, closed, and **E3 with them**. **No number, no replay and no
schema moved** (still 87): the parity fixtures were byte-untouched and all four
boards compared equal after each of the three moves — the renames, the split,
and the ghost-diff's selector.

**The harness is retired**, as ruled (`docs/flags.md` item pp: one-time, deleted
when E3 lands). `test/sim/parity.slow.test.ts`, `test/sim/parityHelpers.ts` and
the four `test/fixtures/parity/*.json` are gone. What stands in its place is what
always did the standing work: `yieldOrder.test.ts` (the boundaries by the
numbers), `yieldsDocSync.test.ts` (the sequence against the source),
`readings.test.ts` (the memos), `benches.test.ts` (the honest benches) and, new
here, `verbs.test.ts` (the vocabulary).

### The three verbs

`explainX` returns a labelled list; `foldX` is the one sum of it; `readX` is the
memo, keyed on the revision, and lives in `src/sim/readings.ts` alone. The
vocabulary is stated at the head of that file, tabled in `docs/yields.md` ("The
three verbs") and pinned by `test/sim/verbs.test.ts`, which refuses an export
carrying a retired suffix (`…Yield(s)`, `…Total`, `…Rate(s)`, `…Reading`,
`…Quote`, `…Aggregate`, `…Sums`) without one of the three, a `read…` outside the
leaf, and an `explain…` that does not return a list.

| was | is |
|---|---|
| `cityQuote` · `CityQuote` · `CityQuoteLine` | `explainCity` · `CityReading` · `CityYieldLine` |
| `foldQuoteLines` | `foldCityFlats` (`foldCityLines` was taken by `combat.ts`) |
| `cityYields` | `foldCity` |
| `cityStageSums` · `stageSumsFor` | `foldCityStages` · `foldStageSums` |
| `centreYield` · `tileYieldOf` · `foldTileYield` | `foldCentre` · `foldTile` · `foldTileLines` |
| `cardCityYields` · `cardBuildingYields` · `cardEmpireYields` · `cardPercentYields` | `explainCard…` |
| `empireRateReading` + private `empireRates` | `foldEmpireRates` — one function; the wrapper is gone |
| `RateReading` | `EmpireRates` |
| `civYields` (`topBar.ts`) | **deleted**; every caller reads `readEmpire(state, seat).totals` |
| `ledgerReading` · `deckAggregate` · `deckAggregateLine` · `DECK_AGGREGATE_LABEL` | `explainLedger` · `foldDeck` · `deckCaption` · `DECK_LABEL` |

Two exports keep a retired suffix with a reason stated in the register:
`emptyCityYields` (a constructor of the six-voice bag) and `collectYields` (the
phase that banks — a mutation, not a reading). Types are nouns and out of the
rule; what the three verbs govern is the functions.

The effect **kind** `cityYields` is untouched — it is a data vocabulary, and
§3d's yield-family merge is still E5's question.

### Files by layer

| file | lines | holds |
|---|---|---|
| `src/sim/yields/hex.ts` | 631 | `explainTileYield`, its conditions, `foldTileLines`/`foldTile`, the two hex percentages |
| `src/sim/yields/town.ts` | 1384 | the twelve steps: the palace, the centre, the buildings and their card shares, the conversions, `cityYieldPercents`, `empirePercents`, `explainCity`, `foldCity` |
| `src/sim/yields/empire.ts` | 583 | `explainEmpireLines`, `stageEmpireFold`, `foldEmpireLines`, `foldEmpireRates`, and `collectYields` |
| `src/sim/yields/stages.ts` | 176 | `applyStages` and the stage sums — the old `modifiers.ts`, `git mv`'d, plus `foldStageSums` |
| `src/sim/cities.ts` | 4274 | what a city *is*: territory, ownership, the resource clauses, founding, citizens, growth, the costs, production, borders, the purchase of a tile, `refreshCityDerived` |
| `src/sim/statecraft/evaluator.ts` | 5199 | `liveEffects` and the one switch on `CardEffect.kind`, with every reader of its walk |
| `src/sim/statecraft/describers.ts` | 2322 | every `describe…`, the word tables, the keyword refs |
| `src/sim/statecraft/draft.ts` | 1512 | the ladder, the pools, the offers, the rerolls, the slots, the governments |
| `src/sim/statecraft.ts` | 259 | the index — every name re-exported **by name** |

**`collectYields` moved with the empire's list** rather than into `turn.ts`:
step 18 of the sequence *is* the banks, and the phase is the one reader that
must see both halves in order. `turn.ts` stays the fixed order of phases.

**`empirePercents` lives in `town.ts`**, though it sweeps the whole realm,
because it is the empire's half of *a town's* percentages —
`cityYieldPercents`' own input — and putting it there leaves `yields/` a one-way
chain, hex → town → empire, with no back edge inside the folder.

**Two different re-export decisions, and the reason is a measurement.**
`statecraft.ts` is an index and every `from './statecraft'` in the tree still
resolves; `cities.ts` is not, and the fifty-nine files that imported a yield from
it now name the layer. The first attempt made `cities.ts` a `export * from
'./yields/…'` barrel and `moduleCycles.test.ts` failed with `foldTile is not a
function`: the dev server's module runner copies a star re-export's keys
**eagerly**, so a module that imports you back gets an empty namespace and the
name is missing for the life of the process. A re-export **by name** compiles to
a getter, read when the name is used — the same deferral every function-level
cycle in this simulation already relies on. So the index is named, and CLAUDE.md
now says so.

`moduleCycles.test.ts` globs `src/sim/*.ts` **and** `src/sim/*/*.ts`, and every
one of the eight new modules survives being evaluated first. Every register test
that globbed `src/sim/*.ts` was widened the same way — a register that globbed
only the top level would have passed by vacuum on the very code that moved — and
those that name an offender name it from `sim/` (`yields/town.ts`,
`statecraft/evaluator.ts`).

### The ghost-diff selects by card

`cardImpact.ts`'s `CARD_CITY_STEP = 3` is gone. A card's own flats reach a town
at three steps — its city lines (3), its share of a building (9), its conversion
of one voice into another (10) — so the selector is `cardFlats`: *the line names
a card, at one of the steps a card's flats land in*. The step numbers stay the
doc's. Step 2 is deliberately excluded: a card's line on a hex is diffed
separately and against its own ground (the `ground` bucket, off `tileAdds`), and
counting it here as well would print every tile card twice.

Both sides of the diff are selected the same way, which is the point: the ghost
builds `explainCity(ghost, town).lines` and filters it with the same predicate
rather than asking the evaluator for step 3 alone. **For a tile card the impact
list reads exactly as before** — its lines are the ground bucket's, which this
did not touch — and for every other card parity says the figures are unchanged:
the four boards compare equal on `explainCardImpact` for every card each seat
holds.

## 4c.3. E5 as shipped (2026-09-08)

§4 step 5, closed, and §3d's finding with it. The proposal, the table of record
and the migration's own counts are **`docs/audit/e5-yield-shape.md`**; this is
what it came to. **No number, no replay and no schema moved** (still 96).

### One kind, two dimensions

`cityYields` · `tileYield` · `empireYields` · `routeYield` · `mirrorYield` ·
`countScaled` · `yieldConversion` · `rateConversion` are **`pays`**, with a
`where` (city · capital · hex · empire · route) and a `basis` (flat · count ·
mirror · share · rate). Every field they carried is a field of the one shape;
`CardPayout` is retired into five of them, and the `where` it hid is the shape's
first dimension — which was §3d's whole point, since that field *was* the answer
to "which of these eight is this". `basis` defaults to `flat`, so a flat row's
declaration is `{ kind: 'pays', where: 'city' }` and its bag.

**291 rows migrated** by `scripts/migrate-pays.mjs` (committed, idempotent,
run once) across six data files. Nothing outside an effect row moved, and the
reverse mapping of every migrated row reproduces its predecessor field for
field — which is the check that made the data half of this batch provable rather
than argued.

### The four registers that stopped having eight entries

The evaluator's eleven loops now filter on (`where`, `basis`) instead of on
eight names; `describeEffect`'s eight arms are one `describePays` with five
clauses; `scoreEffect`'s eight arms are one `scorePays`; and `docs/yields.md`'s
register carries one row per **pair** rather than one per kind — with the pairs
sync-tested against the doc and pinned against live rows in
`statecraft.test.ts`. `classifyCard` (`ledgerClass.ts`) and `CARD_FLAT_STEPS`
(`cardImpact.ts`) are untouched: the first classes by card **id** and never read
an effect kind, and the second is a claim about steps 3, 9 and 10, which did not
move.

### The gates, and the one honest wrinkle

The parity harness was restored from `8d7075a`, re-baselined on this batch's own
base commit, and given a **fifth reading** the E1 version did not take:
`explainCity`'s labelled list itself, line by line — step, source, ledger class,
handles and the six voices — because a migration that moved a label while every
total stayed put would pass a fixture of totals. All four boards compare equal at
t30/t60/t150 on every one of the five. It is **retired again** at the end of this
batch, as ruled.

The wrinkle, found by that harness and worth writing down: `TimedEffect`
(`state.ts`) carries a **copy of the card's own row**, so `snapshotState` prints
the row's field names into the board's canonical print — and a rite live at t150
on two of the four boards made the state hash move while nothing about the game
did. A full state diff at t150 proved it exactly: the *only* bytes that differ on
either board are the Omen Reading's row, spelt the new way. So the harness hashes
the print with a stamped row's own spelling taken out (`snapshotShape` — `card`
and `expiresTurn` still pinned, which is the behaviour), and the row's content is
gated twice over instead: by the migration's reverse-mapping check for what it
*means*, and by the new standing snapshot for what it *says*.

That standing snapshot is **`test/sim/cardTextSnapshot.test.ts`**, which is what
this batch leaves behind: every card of every class — governments, doctrines,
Orders, beliefs, rites, consecrations, buildings and wonders, great people,
technologies, the Bead Race's boons — plus the luxuries, both readings of every
clause (raw and `stripRefs`'d), against a committed fixture. It was written and
baselined *before* the migration and passed byte-identically after it, and it
stays: a describer change now has to regenerate it deliberately.

The one thing that is deliberately not byte-identical is not a card's words and
not a figure — it is the **bot's own appraisal feed**, which labelled each term
by the effect's bare `kind`. Eight labels would have become one word, so a term
now says `pays <where> <basis>`; the spectator reads what it read before and no
number moves.

## 5. What I think

The day-one decisions are intact where they were made: the folds are
lists, the stages are two, the order is fixed and array-walked. The drift
is in the *readers*, which grew four private copies of the town's list and
pinned each other with total-equality tests — so every reader bug of the
last two days was real arithmetic disagreeing with itself about
attribution, not about sums. Making the labelled list the thing
`explainCity` returns (step 2) removes the copies, most of the Ledger, and
half the ghost-diff, and it is the single change that makes "what will this
effect yield" a question answered by reading one list. Steps 1 and 4 are
cheap and I'd take them first; step 5 is the real simplification and the
one to weigh against how much the vocabulary is still moving.
