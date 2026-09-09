# Yields — the sequence of record

What this is: **the order every yield in the game is computed in**, step by
step, with what each step reads, what may land there, and whether it adds or
multiplies. Current state; the history is `docs/design-history.md` (Entries XVII
and XVIII) and `docs/audit/evaluations.md` §2. The ruling behind this document
is `docs/flags.md` (pp).

The sequence is **one sequence**, run per town and then once per empire, and it
is pinned two ways: `test/sim/yieldsDocSync.test.ts` walks `explainCity`'s and
`explainEmpireLines`'s own source and asserts the steps below appear in this
order, and `test/sim/yieldOrder.test.ts` asserts the boundaries by the numbers
on a real board.

Two doctrines govern the whole of it:

- **Rule 5** — a total is the fold of a labelled list, never computed beside
  it. Every step below is an `explain…` returning a list; its `fold…` twin is
  that list's sum and nothing else.
- **Entry XVII** — percentages compound across two stages, never inside one:
  `(base + flats) × (1 + Σ city%) × (1 + Σ empire%)`, additive within a stage,
  multiplied across the pair, floored nowhere (batch X: yields are exact
  decimals; the rounding is the surface's).

---

## The three verbs

Every exported reading of a yield is **one of three**, and nothing else
(`docs/audit/evaluations.md` §4b step 7; batch E3b). The vocabulary is stated on
`src/sim/readings.ts` and pinned by `test/sim/verbs.test.ts`.

| verb | shape | means |
|---|---|---|
| `explainX(…)` | a labelled **list** | rule 5's list; never a bare number |
| `foldX(…)` | the **one sum** of such a list | taken fresh, every time it is asked |
| `readX(state, …)` | the **memo** | `explain` + `fold`, keyed on `state.revision`, and it lives in `src/sim/readings.ts` alone |

Two stated shapes inside those rules, each because the layer is what it is:

- **`explainCity` returns a record around its list** — the lines, their fold
  (`flats`) and the percent list that is *not* applied to them — because steps
  1–11 produce two artefacts and every caller wants both. Every other `explain…`
  is an array.
- **`foldCity` is the town's total, stages included.** A town's total is staged
  by definition (step 12), so the fold of a town is the flats plus the two
  multiplications; a fourth verb for the multiplication would be a second place
  a total could be computed. The bare sum of the list, with no stage on it, is
  `foldCityFlats`, which is what `explainCity` fills `flats` with.

### The slate, and the two tenants beneath the verb (batch M1)

The **machinery** the third verb sits on lives in `src/sim/slate.ts`: one
`WeakMap` on the state, one slate keyed on `GameState.revision`, thrown away
whole when it moves. `readings.ts` is a tenant of it; so are two readings that
are **not** `read…` verbs and cannot be:

| reading | where | why it is not a `read…` |
|---|---|---|
| `meterEffects` | `meters.ts` | asked from *inside* the pipeline — `empirePercents`, `borderGrowth`, `explainGrowthPercent`, `tilePurchaseError` — by modules that would make a runtime cycle out of importing `readings.ts` |
| `controlledHoldings` | `cities.ts` | the same, and `readings.ts` imports `cities.ts` |

The verb rule is unchanged — every `read…` is still in `readings.ts` and nowhere
else (`test/sim/verbs.test.ts`) — and the memos are still **one** cache with one
lifetime, because they are on the same slate rather than in a second `WeakMap`.

**The slate is suspended while a writer holds the world open.** `GameState
.revision` is raised *after* a command's handler and *after* each end-of-turn
phase, so a reading taken inside one is a reading of a world halfway moved, and
`expandBorders` and `collectYields` take several. `applyCommand` and the phase
loop announce themselves (`beginWrite`/`endWrite`); inside the window every
tenant computes fresh, which is byte for byte the tree before the slate existed.
A bench that pokes the state by hand is a writer and calls `bumpRevision`.

### What was renamed (E3b)

| was | is | why |
|---|---|---|
| `cityQuote` | `explainCity` | it returns the town's labelled list |
| `CityQuote` / `CityQuoteLine` | `CityReading` / `CityYieldLine` | the nouns follow the verb |
| `foldQuoteLines` | `foldCityFlats` | the sum of that list (`foldCityLines` was taken by `combat.ts`) |
| `cityYields` | `foldCity` | the town's total — the fold plus step 12 |
| `cityStageSums` | `foldCityStages` | the percent list folded into Entry XVII's two stages, per voice |
| `stageSumsFor` | `foldStageSums` | the same for one voice |
| `centreYield` | `foldCentre` | the fold of `explainCentreYield` |
| `tileYieldOf` | `foldTile` | the fold of `explainTileYield` |
| `foldTileYield` | `foldTileLines` | it takes the list, so it says so |
| `cardCityYields` · `cardBuildingYields` · `cardEmpireYields` · `cardPercentYields` | `explainCard…` | each returns a list |
| `empireRateReading` + private `empireRates` | `foldEmpireRates` | two spellings of one fold; the wrapper is gone |
| `RateReading` | `EmpireRates` | `…Reading` is the memo's word |
| `civYields` (`topBar.ts`) | **deleted** → `readEmpire(state, seat).totals` | it was `readEmpire`'s own fold with a second name |
| `ledgerReading` | `explainLedger` | it returns the six voices as a list |
| `deckAggregate` · `deckAggregateLine` · `DECK_AGGREGATE_LABEL` | `foldDeck` · `deckCaption` · `DECK_LABEL` | the deck's slice of that list, folded |

Two exports keep a retired suffix, each for a stated reason, and
`test/sim/verbs.test.ts` carries both as exceptions: **`emptyCityYields`** is a
constructor of the six-voice bag rather than a reading of anything, and
**`collectYields`** is the turn phase that *banks* — a mutation, not a reading.
Types are nouns and are out of the rule (`CityYields`, `EmpireYieldLine`,
`TileYieldContribution`, …) — what the three verbs govern is the functions.

---

## The town — `explainCity` → `foldCity`

Twelve steps. Steps 1–11 are `explainCity`, which returns **flats** and a
**percent list** and applies neither to the other; step 12 is `foldCity`,
which is the only place in the simulation a yield meets a percentage.

| # | Step | Reads | Add / mult | Stage |
|---|---|---|---|---|
| 1 | **The centre** — `foldCentre` (`explainCentreYield`) | the base city yield, plus the town hex's own reading as an *excess* over it | additive | — |
| 2 | **Each worked hex** — `foldTile` (`explainTileYield`) | `city.workedTiles`, each priced through the owner's `cityContext` | additive (with two shares inside it — see below) | — |
| 3 | **The cards' city lines** — `explainCardCityYields` | the law reaching this town | additive | — |
| 4 | **The luxuries' city lines** — `cityResourceYields` | the empire's improved seams | additive | — |
| 5 | **The specialists** — `citySpecialistYields` | the town's guilds (a substitution for a hex left, never a bonus) | additive | — |
| 6 | **The routes arriving** — `cityRouteYields` | each caravan's *origin* buildings; five voices, never faith | additive | — |
| 7 | **The palace** — `explainPalaceYield` | the seat of government — its coin, and since 2026-09-08 a beaker and a note; empty in every town but one | additive | — |
| 8 | **The buildings** — `explainCityBuildings` | `city.buildings` in build order, plus each row's per-citizen science | additive | — |
| 9 | **The cards' building shares** — `explainCardBuildingYields` | the block above, **plus what the law put on each building by name** (`cardLinesOnBuilding`) | multiplicative *within the step*, lands as a flat | — |
| 10 | **The conversions** — `cardYieldConversions` | the **running flats** of one voice, paid again as another | multiplicative *within the step*, lands as a flat | — |
| 11 | **The percent list** — `cityYieldPercents` (+ `productionModifiers` via `foldCityStages`) | the meter tiers, the luxuries', the cards', the arrears | gathered, never applied | city and empire |
| 12 | **The two stages** — `applyStages` (`foldCity`) | step 11's list, folded per voice by `foldStageSums` | multiplicative | city, then empire |

### Inside step 2 — the hex

`explainTileYield` is self-contained: a town bonus cannot reach it, which is
what makes the order structural rather than incidental. Its own order is

1. the terrain (`base`);
2. the hill (`override`), then the canopy over it (`override`) — the canopy
   wins because it is the more specific fact;
3. the seam, for an empire that can name it (`resourceIsVisibleTo`);
4. the improvement and its renewals — the **works**, whose entries are bracketed
   so a share can be taken of exactly them;
5. the law's `tileYield` lines, in **two passes**: the lines that ask nothing of
   the fold first, then the memo of "what this hex pays" is taken *again*, then
   the lines that pay on what the hex already pays. Both passes walk `ctx.lines`
   in the context's own order; lines sharing a `source` merge at the first
   appearance; a negative voice is clamped against what the **works** still have
   (Ea-nāṣir's rule — the hill and the seam are never taken back);
6. the **works percent** — a share of the entries in (4) alone;
7. the **ground percent** (`basePercent`) — a share of the entries before (4).

### Inside step 9 — the building shares

Two passes, in `cardBuildingPercents`' own order: the **ordinary** shares, each
over the building's row plus the law's lines on that building; then the
**`appliedLast`** shares, each over that base *plus what the ordinary shares
just added*. So a doubler doubles what the Vestry raised rather than racing it.
The result is a **flat**, staged at step 12 like the library's own beaker.

---

## The empire — `explainEmpireLines`

Run once per seat by `collectYields`, **after** every town has been priced.
Additive lines first, in the order the phase has always banked them, then the
stage over their fold, then the banks.

| # | Step | Reads | Add / mult | Stage |
|---|---|---|---|---|
| 13 | **The luxuries' empire signatures** — `empireResourceYields` | the empire's holdings | additive | — |
| 14 | **The caravans abroad** — `senderRouteYields` | routes this seat sent to another empire | additive | — |
| 15 | **The treasury's ledger** — `explainEmpireGold` | connections, maintenance, the levy's surcharge, the charter's rebate, the treaties; every line declares itself **income** or **bill** (`TradeGoldKind`) | additive | — |
| 16 | **The cards' empire payouts** — `explainEmpireCardYields` | the empire-scale card lines; **last**, because a rate conversion reads the rates 13–15 produced | additive | — |
| 17 | **The empire stage** — `stageEmpireFold`, one reconciliation line a voice | the additive fold of 13–16 **minus the bills** | multiplicative | empire |
| 18 | **The banks** — `foldEmpireLines`, in `collectYields` | the fold of 13–17, plus every town's step-12 total | — | — |

Occasions (`windfallPayout`) pay **outside** all of this: a one-time grant is
modifier-immune, composed base + every rider into one printed figure before
banking (Entry XVIII.5).

---

## Conventions a reader would not guess

- **The hex's two percentages are over subsets, never the hex's total.** The
  works percent reads the improvement and its renewals; the ground percent reads
  the terrain, the hill or canopy, and the seam. The two never overlap and
  neither reaches a card's own line — so two cards cannot pay each other
  interest.
- **The empire's bills stay outside the empire stage.** Maintenance, the levy's
  surcharge, the charter's rebate and the treaties are costs rather than yields:
  a contented empire earns more from its roads without paying its soldiers less.
  A tribute is what two empires agreed, so a stage would pay one side more than
  the other was charged.
- **The empire stage is `empirePercents` — the meter tiers and the arrears —
  and not a card's `stage: 'empire'` percentage**, which is written about a
  *town* and reaches the empire only through the towns it names. The city stage
  is nought at empire scale by construction: there is no town there to carry
  one.
- **The conversions read the running flats.** Step 10 takes its share of steps
  1–9 folded — after the building shares, before either stage — and pays it as
  an ordinary flat. It reads the whole harvest, not the surplus: a surplus is
  decided after every percentage, and a card reading it would be reading a
  figure that reads the card back.
- **`appliedLast` shares are taken over the ordinary shares**, and only within
  step 9. It is the one place a share in this pipeline is taken of another
  share's output, and it is stated on the row (`appliedLast`) rather than
  implied by walk order.
- **The tile lines land in two passes** because a line that pays on what the hex
  *already* pays must see the lines that ask nothing of the fold. One pass left
  the Desert Fathers' faith invisible to The Sacred Ground standing beside it.
  An asking line never sees another asking line's bag, so two of them cannot pay
  each other interest either.
- **Five percentage-like operations run before the two stages** — the works
  percent, the ground percent, the ordinary building shares, the `appliedLast`
  building shares, and the conversions' share of a voice — plus the amplifier's
  percentage on card lines. Each is exact, each is over a named subset, and none
  of them is Entry XVII's staging.
- **Two shares of the same kind sum before one multiplication.** Two cards that
  each say +50% are +100%, never ×2.25 — Entry XVII's discipline read at the
  scale of a hex, a building and a town alike.
- **`toward` is a fact about the pair (town, item).** `productionBonus` joins
  the **city** stage at step 11 for production alone, because a barracks pays a
  share of the hammers behind *a unit* and nothing toward a monument.
- **The centre inherits as an excess.** Step 1 is the base city yield plus
  whatever the town hex's own reading beats it by, per voice — the one line no
  list can share out.

---

## The register — every kind that pays a yield, and where it lands

One row per `CardEffect` kind that can move one of the six voices, and the
step(s) it lands in. A **new kind that pays a yield joins this table or the sync
test fails** — which is the whole point of writing it down.

Since batch **E5** (`docs/audit/e5-yield-shape.md`) eight of those kinds are one:
`pays`, with a `where` (the town · the capital · the hex · the empire · the
route) and a `basis` (a flat bag · per count · a mirror of one shelf · a share of
a voice · a conversion of a rate). So `pays` has **one row per (`where`,
`basis`) pair it is written in**, and the pair is what says where the figure
lands. The `where · basis` cell is blank for the kinds that are still one thing.

| kind | where · basis | steps | additive or multiplicative |
|---|---|---|---|
| `pays` | hex · flat | 2 | additive; `percent`/`basePercent` are the hex's two shares |
| `pays` | city · flat | 3 | additive |
| `pays` | city · count | 3, 11 | additive at 3; a helping's percentage (a row with `stage`) is gathered at 11 |
| `pays` | capital · count | 3 | additive — once, in one town, because an empire line has no basket for a hammer |
| `pays` | city · mirror | 3 | additive — a voice paid again off one category's buildings |
| `cardYieldAmplifier` | | 2, 3, 16 | additive flat and a percentage, over the *card lines* of the fold it reads |
| `pays` | route · flat | 6, 14 | additive (arrivals at 6, the caravans abroad at 14) |
| `buildingYieldPercent` | | 9 | multiplicative within the step; lands as a flat |
| `pays` | city · share | 10 | multiplicative within the step; lands as a flat |
| `percentYields` | | 11 | multiplicative, at whichever stage the row names |
| `productionBonus` | | 11 | multiplicative, city stage, production only |
| `pays` | empire · flat | 16 | additive — the luxuries' signature, and no card row today |
| `pays` | empire · count | 16 | additive |
| `pays` | empire · rate | 16 | additive, off this turn's own rates |

### Kinds that move a voice but not through this sequence

Occasions and the treasury's riders. They are named here so that *every* kind
that can move one of the six voices is accounted for in exactly one of the two
lists — the sync test reads both and refuses a kind that is in neither.

`windfallRider` · `periodic` · `foundingRider` · `offerRider` · `projectRider` ·
`purchaseRider` · `routeRider` · `upkeepRebate` · `upkeepSurcharge` ·
`beadPerOccasion` · `renown` · `cityRenownPercent`

The first ten pay through `windfallPayout` or through a cost fold — a one-time
grant is modifier-immune and composed once (Entry XVIII.5), and a keep is a bill
rather than a yield. The last two pay **renown**, which is not one of the six
voices and banks through `settleRenownWindfall`.

Every other `CardEffect` kind moves no voice at all: it is a rule, a stat, a
meter, a stamp, an unlock or an offer.

---

## Where each layer's source lives

**One file a layer since batch E3b** (`docs/audit/evaluations.md` §4b step 9).
`cities.ts` keeps what a city *is* apart from its arithmetic — territory,
ownership, the resource clauses, founding, citizens, growth, the costs,
production, borders, the purchase of a tile — and the sequence lives under
`src/sim/yields/`.

| layer | module |
|---|---|
| the hex | `explainTileYield` · `src/sim/yields/hex.ts` |
| the town's list | `explainCity` · `src/sim/yields/town.ts` |
| the town's total | `foldCity` → `applyStages` · `src/sim/yields/town.ts`, `src/sim/yields/stages.ts` |
| the empire's list | `explainEmpireLines` · `src/sim/yields/empire.ts` |
| the banks | `collectYields` · `src/sim/yields/empire.ts` |
| the two stages | `applyStages`, `foldStageSums` · `src/sim/yields/stages.ts` (the old `modifiers.ts`) |
| the card vocabulary | `statecraft/evaluator.ts` — the one module switching on `CardEffect.kind` |
| the luxuries' vocabulary | `resourceEffects.ts` — the one evaluator of a signature |

`yields/` is a **one-way chain**: hex → town → empire, with `stages.ts` beneath
all three and nothing in the folder importing `readings.ts` (the memos sit above
the layer, never inside it). The edge back to `cities.ts` — for a town's
territory and citizens — is function-level, the documented kind, and
`test/mapgen/moduleCycles.test.ts` loads every file under `src/sim/**` first in
turn to prove it. `collectYields` lives with the empire's list rather than in
`turn.ts` because step 18 *is* the banks; `turn.ts` stays the fixed order of
phases.
