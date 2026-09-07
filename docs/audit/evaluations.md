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
| **Entry XVII** — percentages compound across two stages, never inside one: `(base + flats) × (1 + Σcity%) × (1 + Σglobal%)`, floored once | `applyStages`, `cityYieldPercents`, `cityStageSums` | **Yes**, and it is the only place a yield meets a stage. But five *other* percentage-like operations now run before the stages (§3g). |
| **One evaluator** — `statecraft.ts` is the only module switching on `CardEffect.kind` | `liveEffects`, `cityEffectsOfKind` | **Yes** (H6 brought the luxuries' vocabulary in). The file is 9,025 lines, 124 exports, 239 case arms, 45 kinds. |
| **Data rows, code holds algorithms** | `data/*.json` | Yes. 65 rows carry `deferred`, 15 carry empty effects (§3e). |
| **Determinism by array order** | everywhere | Yes. Every fold walks `state.cities`, `ctx.lines`, `city.buildings` in their own order; the one `Map` in the hot path (`liveReading`'s memo) is read by lookup only. |
| **Windfalls are modifier-immune, composed once** | `windfallPayout` | Yes. |

The sim's arithmetic is sound and ordered. What eroded is *legibility*: the
order is written across three files and nine functions, and the readers
(the panel, the Ledger, the ghost-diff, the bot) each re-derive the list.

## 2. The sequence, as it runs today

Per town (`cityQuote` → `cityYields`), in this order:

1. **The centre** (`centreYield`: the base city yield, plus the hex's own science and culture as an *excess*).
2. **Each worked hex** (`explainTileYield`): terrain → hill/canopy → the seam → the works and their renewals → the law's `tileYield` lines in **two passes** (the lines that ask nothing of the fold, then the lines that pay on what the hex already pays — kk) with Ea-nāṣir's clamp on taking-back lines and same-source merging → the works percent (a share of the works' entries) → the ground percent (a share of the entries before the works).
3. **The cards' city lines** (`cardCityYields`: `cityYields`, `countScaled` paying a yield, `mirrorYield`, then the deck modifier lines — the amplifiers over the lines above).
4. **The luxuries' city lines** (`cityResourceYields`).
5. **The specialists** (a substitution for a hex left).
6. **The routes arriving** (five voices).
7. **The palace.**
8. **The buildings** (row flats + per-citizen science).
9. **The cards' building shares** (`cardBuildingYields`): ordinary shares over row + what the law put on the building (ll), then the `appliedLast` shares over that.
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
| 3. **The town's list** | `cityQuote` (flats + percents) | on ask | no; `refreshCityDerived` only re-seats citizens (`assignCitizens`) — the yields are "computed on read" by its own docblock |
| 4. **The town's total** | `cityYields` = `applyStages(quote)` | on ask | no |
| 5. **The empire's lines** | `explainEmpireLines` (luxuries, routes abroad, `explainEmpireGold`, `explainEmpireCardYields`, then the empire stage) | on ask | no (`empireRates` sweeps every town for a `rateConversion`) |
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
self-contained and `cityQuote` consumes its fold, so a town bonus cannot
reach a hex; `cityQuote` returns flats and a percent list and `cityYields`
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

`cityQuote` folds the twelve steps into a *total* and keeps only the flats
and the percent list. The labelled list a player reads is rebuilt by each
reader:

- the city panel walks the same sources itself to print lines;
- `cityFlatsByClass` (the Ledger) walks all twelve again to class them, then
  shares the bank back — the mirror that hid tile cards under the land and
  percent cards under nobody until yesterday (jj), and is pinned to
  `cityQuote` only by a test that compares totals;
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
- `cardBuildingYields` — two passes (ordinary, `appliedLast`) over a base
  that now includes the law's lines (ll).
- The Ledger's share-back — two shares (flats by earner, gain by
  percent-supplier, same-sign rule) reconstructing what §3a would simply
  read.
- `cityStageSums` folding `productionModifiers` into the city stage for
  production alone — a special case the Ledger had to mirror.
- `centreYield`'s inheritance "as an excess over the base city yield" —
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
   that walks `cityQuote`'s source and asserts the steps appear in that
   order. Cheap, and it is the document the user asked for.
2. **`cityQuote` returns the list.** One `CityQuoteLine[]` — `source`,
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

## 5. What I think

The day-one decisions are intact where they were made: the folds are
lists, the stages are two, the order is fixed and array-walked. The drift
is in the *readers*, which grew four private copies of the town's list and
pinned each other with total-equality tests — so every reader bug of the
last two days was real arithmetic disagreeing with itself about
attribution, not about sums. Making the labelled list the thing
`cityQuote` returns (step 2) removes the copies, most of the Ledger, and
half the ghost-diff, and it is the single change that makes "what will this
effect yield" a question answered by reading one list. Steps 1 and 4 are
cheap and I'd take them first; step 5 is the real simplification and the
one to weigh against how much the vocabulary is still moving.
