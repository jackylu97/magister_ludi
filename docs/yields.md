# Yields — the sequence of record

What this is: **the order every yield in the game is computed in**, step by
step, with what each step reads, what may land there, and whether it adds or
multiplies. Current state; the history is `docs/design-history.md` (Entries XVII
and XVIII) and `docs/audit/evaluations.md` §2. The ruling behind this document
is `docs/flags.md` (pp).

The sequence is **one sequence**, run per town and then once per empire, and it
is pinned two ways: `test/sim/yieldsDocSync.test.ts` walks `cityQuote`'s and
`explainEmpireLines`'s own source and asserts the steps below appear in this
order, and `test/sim/yieldOrder.test.ts` asserts the boundaries by the numbers
on a real board.

Two doctrines govern the whole of it:

- **Rule 5** — a total is the fold of a labelled list, never computed beside
  it. Every step below is an `explain…` returning a list; its `…Yield(s)` twin
  is that list's fold and nothing else.
- **Entry XVII** — percentages compound across two stages, never inside one:
  `(base + flats) × (1 + Σ city%) × (1 + Σ empire%)`, additive within a stage,
  multiplied across the pair, floored nowhere (batch X: yields are exact
  decimals; the rounding is the surface's).

---

## The town — `cityQuote` → `cityYields`

Twelve steps. Steps 1–11 are `cityQuote`, which returns **flats** and a
**percent list** and applies neither to the other; step 12 is `cityYields`,
which is the only place in the simulation a yield meets a percentage.

| # | Step | Reads | Add / mult | Stage |
|---|---|---|---|---|
| 1 | **The centre** — `centreYield` (`explainCentreYield`) | the base city yield, plus the town hex's own reading as an *excess* over it | additive | — |
| 2 | **Each worked hex** — `tileYieldOf` (`explainTileYield`) | `city.workedTiles`, each priced through the owner's `cityContext` | additive (with two shares inside it — see below) | — |
| 3 | **The cards' city lines** — `cardCityYields` | the law reaching this town | additive | — |
| 4 | **The luxuries' city lines** — `cityResourceYields` | the empire's improved seams | additive | — |
| 5 | **The specialists** — `citySpecialistYields` | the town's guilds (a substitution for a hex left, never a bonus) | additive | — |
| 6 | **The routes arriving** — `cityRouteYields` | each caravan's *origin* buildings; five voices, never faith | additive | — |
| 7 | **The palace** — `explainPalaceYield` | the seat of government; empty in every town but one | additive | — |
| 8 | **The buildings** — `explainCityBuildings` | `city.buildings` in build order, plus each row's per-citizen science | additive | — |
| 9 | **The cards' building shares** — `cardBuildingYields` | the block above, **plus what the law put on each building by name** (`cardLinesOnBuilding`) | multiplicative *within the step*, lands as a flat | — |
| 10 | **The conversions** — `cardYieldConversions` | the **running flats** of one voice, paid again as another | multiplicative *within the step*, lands as a flat | — |
| 11 | **The percent list** — `cityYieldPercents` (+ `productionModifiers` via `cityStageSums`) | the meter tiers, the luxuries', the cards', the arrears | gathered, never applied | city and empire |
| 12 | **The two stages** — `applyStages` (`cityYields`) | step 11's list, folded per voice by `stageSumsFor` | multiplicative | city, then empire |

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

| kind | steps | additive or multiplicative |
|---|---|---|
| `tileYield` | 2 | additive; `percent`/`basePercent` are the hex's two shares |
| `cityYields` | 3 | additive |
| `countScaled` | 3, 16 | additive (city/capital scope at 3, `where: 'empire'` at 16) |
| `mirrorYield` | 3 | additive — a voice paid again off one category's buildings |
| `cardYieldAmplifier` | 2, 3, 16 | additive flat and a percentage, over the *card lines* of the fold it reads |
| `routeYield` | 6, 14 | additive (arrivals at 6, the caravans abroad at 14) |
| `buildingYieldPercent` | 9 | multiplicative within the step; lands as a flat |
| `yieldConversion` | 10 | multiplicative within the step; lands as a flat |
| `percentYields` | 11 | multiplicative, at whichever stage the row names |
| `productionBonus` | 11 | multiplicative, city stage, production only |
| `empireYields` | 16 | additive |
| `rateConversion` | 16 | additive, off this turn's own rates |

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

| layer | module |
|---|---|
| the hex | `explainTileYield` · `src/sim/cities.ts` |
| the town's list | `cityQuote` · `src/sim/cities.ts` |
| the town's total | `cityYields` → `applyStages` · `src/sim/cities.ts`, `src/sim/modifiers.ts` |
| the empire's list | `explainEmpireLines` · `src/sim/cities.ts` |
| the banks | `collectYields` · `src/sim/cities.ts` |
| the card vocabulary | `statecraft.ts` — the one module switching on `CardEffect.kind` |
| the luxuries' vocabulary | `resourceEffects.ts` — the one evaluator of a signature |
