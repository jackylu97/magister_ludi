# Yields — the sequence of record

What this is: **the order every yield in the game is computed in**, step by
step, with what each step reads, what may land there, and whether it adds or
multiplies. Current state; the history is `docs/history/design-history.md` (Entries XVII
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
  multiplications, then the unrest gate (step 13), then the moves of step 14
  (the food surplus moved into production, then the production a rite moves
  into culture); a fourth verb for the
  multiplication would be a second place a total could be computed. The bare sum
  of the list, with no stage on it, is `foldCityFlats`, which is what
  `explainCity` fills `flats` with.

### The slate, and the two tenants beneath the verb

The **machinery** the third verb sits on lives in `src/sim/slate.ts`: one
`WeakMap` on the state, one slate in two halves, each thrown away whole when its
own clock moves. `readings.ts` is a tenant of it; so are two readings that
are **not** `read…` verbs and cannot be:

| reading | where | why it is not a `read…` |
|---|---|---|
| `meterEffects` | `meters.ts` | asked from *inside* the pipeline — `empirePercents`, `borderGrowth`, `explainGrowthPercent`, `tilePurchaseError` — by modules that would make a runtime cycle out of importing `readings.ts` |
| `controlledHoldings` | `cities.ts` | the same, and `readings.ts` imports `cities.ts` |

The verb rule is unchanged — every `read…` is still in `readings.ts` and nowhere
else (`test/sim/verbs.test.ts`) — and the memos are still **one** cache with one
lifetime, because they are on the same slate rather than in a second `WeakMap`.

**Nothing is suspended: a write announces itself at the write.** Every mutation
in the reducer and in the phases that changes what a tenant folds calls
`bumpEconomy(state)` on the line it happens.
`test/sim/slateRegister.test.ts` is the register — it sweeps `src/sim` for every
write to such a field and fails unless the enclosing function announces or is
excused by name with the reason — and `setSlateShadow` is the proof: with it on,
every **hit** recomputes and asserts deep equality, naming the bucket, key,
clock, turn and phase when it does not. A bench that pokes the state by hand is a
writer and calls `bumpRevision`, exactly as before.

### The two clocks

`GameState.revision` moves on **every** accepted command, and a seat sends dozens
a turn that move a piece and nothing else. So a tenant now names the clock it is
a reading *of*, and the slate keeps a half per clock:

| tenant | clock | why |
|---|---|---|
| `meterEffects` | economy | walks towns, buildings, luxuries and law — and, through the card evaluator, the garrisons standing in them and the banks behind them |
| `controlledHoldings` | economy | walks the ground |
| `readEmpirePercents` | economy | those, plus the treasury |
| `readCity` | revision | step 6 is the caravans arriving, and a caravan is cut by a hull in the harbour mouth (`cityBlockaded`) — a **unit position** |
| `readEmpire` | revision | that reading summed |

The split is a claim about what each walk can *see*, not a taxonomy of yields.

**An economy walk sees pieces and banks too.** `meters.ts` never opens
`state.units`, but the card evaluator it folds does: The Long Watch pays "+1
happiness for each unit standing in one of your cities" (`count: 'garrison'`) and
Pilgrim Roads "+1 happiness for each 50 banked faith" (`count: 'bankedFaith'`,
with `bankedGold` beside it). So a piece created, killed, taken or **moved**, and
a bank paid into, are writes the empire walks fold; every such seam announces,
and the register lists them. What the economy clock still buys is the four orders
that move nobody — a fortification, a sleep, an auto-explore, a cancellation —
and the phases that write nothing a walk reads.

- **The economy clock is not a field of `GameState`.** The state is
  `JSON.stringify`d into every save hash, so a second counter on it would be a
  schema change and a different byte in every snapshot for a key no rule reads.
  It is a `WeakMap` beside the slate — per board, gone with the board. A board
  restored from a save starts at nought against an empty slate: a miss, never a
  stale answer.
- **The register of record is `COMMAND_CLOCKS` in `commands.ts`** — one row per
  `Command['type']`, typed as a `Record` so a new kind fails the typecheck, and
  read out of the source beside the reducer's own switch by
  `test/sim/readings.test.ts`. Five rows are `movement` (`moveUnit`,
  `cancelOrder`, `fortify`, `sleepUnit`, `setAutoExplore`); every other row is
  `economy`, and every end-of-turn phase moves both clocks.
- **`moveUnit` is decided from its result, not from its kind.** A march ends in
  `arriveOnTile` on every step, and arriving is how a ruin is claimed, a camp
  burnt out, a civilian taken and a caravan plundered — each reported in
  `CommandResult`. The rule is the report: a movement command whose result says
  anything beyond `ok` is an economy command. The five `movement` rows are a
  **floor** rather than a promise — a march announces itself where the piece
  moves, so a `moveUnit` that walked anywhere has already moved the economy clock
  by the time the result is classified.
- **`bumpRevision` moves both clocks** and is what every writer outside
  `applyCommand` calls, benches included. The narrow door (`bumpPiecesOnly`) has
  one caller, holding a command and its result. Wrong in the broad direction is a
  miss; wrong in the narrow one is a stale reading.

---

## The town — `explainCity` → `foldCity`

Fourteen steps. Steps 1–11 are `explainCity`, which returns **flats** and a
**percent list** and applies neither to the other; steps 12 to 14 are
`foldCity`: the two stages, which are the only place in the simulation a yield
meets a percentage, then the gates (unrest, and a siege on the Magnum Opus),
then the food surplus a card moves into production, then the production a rite
moves into culture.

| # | Step | Reads | Add / mult | Stage |
|---|---|---|---|---|
| 1 | **The centre** — `foldCentre` (`explainCentreYield`) | the base city yield, plus the town hex's own reading as an *excess* over it | additive | — |
| 2 | **Each worked hex** — `foldTile` (`explainTileYield`) | `city.workedTiles`, each priced through the owner's `cityContext` | additive (with three shares inside it — see below) | — |
| 3 | **The cards' city lines** — `explainCardCityYields` | the law reaching this town | additive | — |
| 4 | **The luxuries' city lines** — `cityResourceYields` | the empire's improved seams | additive | — |
| 5 | **The specialists** — `citySpecialistYields` | the town's guilds (a substitution for a hex left, never a bonus) | additive | — |
| 6 | **The routes arriving** — `cityRouteYields` | each caravan's *origin* buildings; five voices, never faith; a route run **by sea** carries `rules.trade.seaYieldPercent` as a line of its own fold, after the cards' shares and before their amplifiers. Then, under The Return Leg's rule (`homeRoutesPayOrigin`), a copy of what each domestic route leaving the town pays its destination (`cityReturnLegYields`), line for line, filed under the card | additive | — |
| 7 | **The palace** — `explainPalaceYield` | the seat of government — its coin, and since 2026-09-08 a beaker and a note; empty in every town but one | additive | — |
| 8 | **The buildings** — `explainCityBuildings` | the town's buildings (`townBuildings`: what it built, in build order, then any a card says it holds), plus each row's per-citizen science | additive | — |
| 9 | **The cards' building shares** — `explainCardBuildingYields` | the block above, **plus what the law put on each building by name** (`cardLinesOnBuilding`) | multiplicative *within the step*, lands as a flat | — |
| 10 | **The conversions** — `cardYieldConversions` | the **running flats** of one voice, paid again as another | multiplicative *within the step*, lands as a flat | — |
| 11 | **The percent list** — `cityYieldPercents` (+ `productionModifiers` via `foldCityStages`) | the meter tiers, the luxuries', the cards', the arrears | gathered, never applied | city and empire |
| 12 | **The two stages** — `applyStages` (`foldCity`) | step 11's list, folded per voice by `foldStageSums` | multiplicative | city, then empire |
| 13 | **The gates** — `explainUnrestGate`, then `explainOpusGate` (`foldCity`) | `City.unrest`: a town in unrest makes none of the voices `rules.war.unrest.halts` names (production, science, culture), one labelled line a voice. Then the gate on the Opus: a town building a Magnum Opus makes no production while it is under siege (`underSiege`) and a rival whose law holds the `opusSiege` rule has a combat unit beside it (Circumvallation, Dominion batch D14), or while it follows a religion a rival is paid by and that rival's law holds the `opusInterdict` rule (`cardOpusInterdictBy`; The Interdict, Devotion batch DV7). One line that names the rival's card; the siege names it when both hold | holds the voice at nothing | — |
| 14 | **The surplus moved** — `explainSurplusMoved`, then **the production moved** — `explainProductionMoved` (`foldCity`) | a card that moves the town's food surplus into production while it builds a row the card names (The Laws of Lord Shang, Dominion batch D7), or while its owner has told it to stop growing (The Breadbasket, Expansionist batch E6): the surplus as the growth channel computes it (`channelSurplus`), one labelled line; the food basket gains none of it. A deficit is never moved, and a town whose production a gate of step 13 stops moves nothing. Then the production moved (Devotion batch DV4): while the town keeps a rite that moves its production into culture (the Rite of the Sabbath, `productionMoverFor`), all of its production after the lines above becomes culture, one labelled line, and the basket gains none of it | additive; the surplus moved adds to production, and the production moved takes it all and adds it to culture | — |

### Inside step 2 — the hex

`explainTileYield` is self-contained: a town bonus cannot reach it, which is
what makes the order structural rather than incidental. Its own order is

1. the terrain (`base`);
2. the hill (`override`), then the canopy over it (`override`) — the canopy
   wins because it is the more specific fact;
   - then, under a work that **yields as other ground** (The Polders,
     Expansionist batch E4: `ImprovementDef.yieldsAs`), that ground's yield
     (`override`). The hex stays water for every other rule;
3. the seam, for an empire that can name it (`resourceIsVisibleTo`);
4. the improvement and its renewals — the **works**, whose entries are bracketed
   so a share can be taken of exactly them. A renewal that needs fresh water
   also counts a farm the empire's law waters (`GroundFacts.watered`,
   Expansionist batch E3). A work that yields as another row pays that row's
   yield and its dry renewals only. A work that **copies the hexes around it**
   (The Keeps, Expansionist batch E4: `ImprovementDef.copiesNeighbours`) adds
   to its own line what each hex `GroundFacts.copiedHexes` names pays, read
   with the same context;
   - then the hex's **lasting marks** (`Tile.marks`, Expansionist batch E3),
     outside the works' bracket: each pays the rule book's figure
     (`rules.improvements.hexMarks`) while its own condition holds, whoever
     works the hex;
5. the law's `tileYield` lines, in **two passes**: the lines that ask nothing of
   the fold first, then the memo of "what this hex pays" is taken *again*, then
   the lines that pay on what the hex already pays. Both passes walk `ctx.lines`
   in the context's own order; lines sharing a `source` merge at the first
   appearance; a negative voice is clamped against what the **works** still have
   (Ea-nāṣir's rule — the hill and the seam are never taken back);
6. the **works percent** — a share of the entries in (4) alone;
7. the **ground percent** (`basePercent`) — a share of the entries before (4);
8. the **whole percent** (`wholePercent`, Dominion batch D8, The Strategoi's
   doubled citadels) — a share of the fold of everything above it, (1) to (7).
   It is the one share that reaches the lines other cards put on the hex.

**Which Ledger class the hex line lands in** (`CityYieldLine.class`) is decided
in `explainCity` off the hex itself, not off the fold: a card's line inside the
fold is lifted out under `classifyCard`'s answer, and what is left is the
**land's** — unless a **great person's work** stands on the hex, in which case
the whole line is the **people's** (`classifyImprovement`, `ledgerClass.ts`; the
user's ruling of 2026-09-10, `docs/flags.md` (eeee)). The whole line and not the
improvement's entries alone, because the hex is one fold in which a hill
*replaces* the grass under it and the improvement's share cannot be taken back
out without a second sum of the remainder. The prophet's holy site carries the
same marker and is **not** a great person's work: it stays with the land.

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
| 15 | **The luxuries' empire signatures** — `empireResourceYields` | the empire's holdings | additive | — |
| 16 | **The caravans abroad** — `senderRouteYields` | routes this seat sent to another empire; the sea premium rides this fold too | additive | — |
| 17 | **The treasury's ledger** — `explainEmpireGold` | connections, maintenance, the levy's surcharge, the charter's rebate, the treaties; every line declares itself **income** or **bill** (`TradeGoldKind`) | additive | — |
| 18 | **The cards' empire payouts** — `explainEmpireCardYields` | the empire-scale card lines; **last**, because a rate conversion reads the rates 15–17 produced | additive | — |
| 19 | **The empire stage** — `stageEmpireFold`, one reconciliation line a voice | the additive fold of 15–18 **minus the bills** | multiplicative | empire |
| 20 | **The banks** — `foldEmpireLines`, in `collectYields` | the fold of 15–19, plus every town's step-14 total | — | — |

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
- **The whole percent is the one exception, and it is taken last** (Dominion
  batch D8). It is a share of the hex's whole fold, the card lines and the two
  shares above included, because The Strategoi's "citadel yields are doubled"
  means everything the hex pays. Its riders sum before one multiplication, so
  two whole shares on one hex never pay each other.
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
- **The surplus moved comes after the gate** (step 14, Dominion batch D7). It
  reads the town's staged food, so no percentage multiplies the production it
  becomes, and the food basket gains none of it. A town in unrest moves
  nothing: its production is stopped, and its food goes on toward growth.
  While a card moves a town's surplus, the Avoid growth tick does not move the
  town's citizens off food (`assignCitizens`, Expansionist batch E6), so the
  card has a surplus to move.
- **The production moved comes last** (step 14's second line, Devotion batch
  DV4, the Rite of the Sabbath). It reads the town's production after the
  gates and after the surplus moved, so a town keeping the rite builds nothing
  at all: food a card moved into production moves on into culture with the
  rest. No percentage multiplies the culture it becomes, because the stages
  are already applied. A town whose production a gate stops has nothing to
  move. A purchase or a production windfall goes into the basket directly and
  never passes through this fold, so the town still gains it. The rule is a
  rite's row and not an Order's, so the reader (`productionMoverFor`) asks the
  empire's law and the rites the town keeps.
- **The unrest gate comes after both stages, and is not a percentage.**
  Percentages sum inside a stage, so a −100% line would only cancel the stage's
  other lines and never the voice. The gate sets the staged figure of each voice
  it names to nothing, after both stages, so that no stage and no card can bring
  the voice back: step 14 moves nothing into a town the gate has stopped. Food,
  gold and faith pass through it untouched. The town's
  list and its percentages above the gate are still its real list, and the city
  panel prints them with the gate's line under them.
- **The siege on the Opus is the second gate of step 13** (Dominion batch
  D14, Circumvallation). It holds production at nothing, after both stages and
  after the unrest gate, for the unrest gate's reason. It asks three things:
  the row the town builds (`toward`) is a Magnum Opus, a rival whose law holds
  the `opusSiege` rule has a combat unit beside the town and can lay a siege
  (`cardOpusSiegeBy`), and the town is under siege (`underSiege`, off its
  owner's `siegeField`). The line names the besieger's card, not one of the
  town owner's. The hammers are not banked anywhere else, and step 14 moves
  nothing into a town this gate has stopped. The rule is a `rule` effect, so
  the kind stays in the register's silent list: it pays no voice, it only
  stops one.
- **The interdict is the same gate's second question** (Devotion batch DV7,
  The Interdict). If the siege does not stop the town, the gate asks whether
  a rival's law holds the `opusInterdict` rule and the town follows a
  religion that rival is paid by (`cardOpusInterdictBy`, the `follows` scope
  with the rival as the reader). The first such rival in `realPlayers` order
  names the line. A town is never stopped by its own owner's card. When the
  siege and the interdict both hold, the siege names the line, and the gate
  is still one line, because production is held at nothing once.
- **The Return Leg's copy is not a route line** (Commerce batch T3). Step 6
  reads it after the routes arriving: for each domestic route leaving the
  town, the route's own list as its destination receives it (the base, every
  card line, every share, the sea premium, the amplifier and the blockade),
  each line named for the card. It is not in `cityRouteYields`, so no card
  that reads or multiplies a route reaches it and it never travels again, and
  `Player.routeYieldsThisAge` leaves it out. It is a flat like the routes
  arriving, so step 12 stages it with the town's percentages. A route to
  another empire is not copied.
- **The gate reaches the town and nothing else.** The empire's own lines (steps
  15–20) belong to the empire, so a card paying science to the empire still pays
  it while one of its towns is in unrest. A conversion (step 10) reads the
  running flats before the gate, so a card paying gold out of a town's
  production still pays it: gold is untouched, which is the rule.

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
| `pays` | hex · flat | 2 | additive; `percent`/`basePercent`/`wholePercent` are the hex's three shares, and `perAdjacentMountain` multiplies the **bag** into one line, as `perEndpointLuxury` does on a road |
| `pays` | city · flat | 3 | additive |
| `pays` | city · count | 3, 11 | additive at 3; a helping's percentage (a row with `stage`) is gathered at 11 |
| `pays` | capital · count | 3 | additive — once, in one town, because an empire line has no basket for a hammer |
| `pays` | city · mirror | 3 | additive — a voice paid again off one category's buildings |
| `cardYieldAmplifier` | | 2, 3, 18 | additive flat and a percentage, over the *card lines* of the fold it reads |
| `pays` | route · flat | 6, 16 | additive (arrivals at 6, the caravans abroad at 16); `crossing` narrows a row to one of the two |
| `pays` | route · count | 6, 16 | additive, at the same two steps. The helpings multiply the **bag**, as `perEndpointLuxury` does. The count is the road's own length (`routeLength`), the technologies the destination's owner knows that you do not (`techGap`), or a count read at the **origin** town with `within: 'city'`: its improved strategic resources (Strategic Exports), its citizens (The Grain Barges) or the Academies in its borders (`tilesInBorders`, Merchant Scholars) |
| `buildingYieldPercent` | | 9 | multiplicative within the step; lands as a flat |
| `pays` | city · share | 10 | multiplicative within the step; lands as a flat |
| `percentYields` | | 11 | multiplicative, at whichever stage the row names |
| `productionBonus` | | 11 | multiplicative, production only; the city stage, or the empire stage for a row that names it (The Marian Reforms) |
| `surplusToProduction` | | 14 | additive — the town's food surplus, moved into production after the gate |
| `productionToCulture` | | 14 | additive — the town's production, moved into culture after the gates and the surplus moved (the Rite of the Sabbath) |
| `pays` | empire · flat | 18 | additive — the luxuries' signature, and no card row today |
| `pays` | empire · count | 18, 11 | additive at 18; a helping's percentage (a row with `stage`) is gathered at 11, in every town, since the count is the realm's and reads the same in each |
| `pays` | empire · rate | 18 | additive, off this turn's own rates |

### Kinds that move a voice but not through this sequence

Occasions and the treasury's riders. They are named here so that *every* kind
that can move one of the six voices is accounted for in exactly one of the two
lists — the sync test reads both and refuses a kind that is in neither.

`windfallRider` · `periodic` · `foundingRider` · `offerRider` · `projectRider` ·
`purchaseRider` · `routeRider` · `upkeepRebate` · `upkeepSurcharge` ·
`beadPerOccasion` · `renown` · `cityRenownPercent` · `levy` · `harvest`

The first ten pay through `windfallPayout` or through a cost fold — a one-time
grant is modifier-immune and composed once (Entry XVIII.5), and a keep is a bill
rather than a yield. `renown` and `cityRenownPercent` pay **renown**, which is
not one of the six voices and banks through `settleRenownWindfall`. `levy`
(batch L) pays hammers once, through `settleProductionWindfall`, when a town
spends a citizen; the effects it hangs on the town afterwards are ordinary card
effects that land in the sequence above. `harvest` (Dominion batch D7, War Feeds
Itself) pays the yields of the hexes a unit stands on in enemy territory at the
end of a turn, through `payWindfallGrants`, as a one-time grant does.

Every other `CardEffect` kind moves no voice at all: it is a rule, a stat, a
meter, a stamp, an unlock or an offer. Two rules stop a voice without paying
one, both read by the second gate of step 13: `opusSiege` (Circumvallation)
and `opusInterdict` (The Interdict, Devotion batch DV7).
One rule pays a voice, and it pays at step 6: `homeRoutesPayOrigin` (The
Return Leg, Commerce batch T3) copies a home route's pay to the town it left
(`cityReturnLegYields`). The `rule` kind stays in neither list, because what
a rule pays is decided by its id, and these three ids are pinned by the sync
test.

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
| the town's total | `foldCity` → `applyStages`, then `explainUnrestGate` and `explainOpusGate`, then `explainSurplusMoved` and `explainProductionMoved` · `src/sim/yields/town.ts`, `src/sim/yields/stages.ts` |
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
`turn.ts` because step 20 *is* the banks; `turn.ts` stays the fixed order of
phases.
