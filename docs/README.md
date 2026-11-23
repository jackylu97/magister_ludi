# Magister Ludi — the briefing

**Read this first.** It is the whole game in current-state terms: what each rule
*is* today, which doc is its reference, which module is its home, and what is
still open. No history — where a rule came from lives in `docs/history/`, and you
should open that only when you need the *why*.

The engine's hard rules and traps are `CLAUDE.md` (auto-loaded; not repeated
here). The condensed design state is `docs/design-notes.md`. Open rulings are
`docs/flags.md`. The interface's design language is `docs/design-specimen.html`.

---

## The game

A browser Civ V-style 4X. TypeScript + Vite, deterministic simulation, a
procedural toon-shaded 3D diorama, and every balance number in `data/*.json`.

Four ages are built — **I Omens · II Heroes · III Empire · IV Cathedrals** — and
**Æra V Magister** exists as a deliberately unbuilt shelf. Theme: the magister's
study; hermetic, renaissance-punk, "vaguely alternate history". Names are
mythologised, never historically over-specific.

Single-player against bots is the product; hot-seat is the dev harness; netcode
comes after a playable core and a good AI.

Camps unlock with Husbandry. Their resource requirements, yields and charge cost are unchanged.

## Beta difficulty

A game's optional `GameConfig.tier` selects the cumulative rules in
`data/difficulty.json`. A missing tier and zero both use the standard rules.
`Player.isHuman` identifies each human seat. The other real seats are rivals.
Every seat in an Arena or spectator game counts as a rival.

Growth modifiers apply to the food surplus. Production modifiers apply at the
empire percentage stage. Build prices use the same breakdown for the queue and
for purchases priced from production. Order rarity changes the initial weights
before skip pity and rare-card modifiers.

An age-close wave uses the opening camp sweep's count, spacing, visibility
and world cap. Each new camp needs room for its band. Existing camps remain.
New units first act on the next turn.

## The loop and the turn

- **Turns are simultaneous.** Each player has `turnEnded`; resolution runs when
  all of them have. There is no `currentPlayerIndex`. The UI gates input to
  `localPlayerId`, which is a UI concept and not a rule.
- **Every mutation flows through `applyCommand`** (`src/sim/commands.ts`) or the
  end-of-turn phases it invokes (`src/sim/turn.ts`, a fixed order). Commands are
  plain JSON, carry `playerId`, and validate FULLY before mutating — a rejected
  command leaves the state byte-identical.
- **Determinism is sacred.** Same config + command log ⇒ bit-identical state. A
  save is `{config, log}` and replays; `SCHEMA_VERSION` gates it. Iterate arrays,
  never Map/Set order. Contention resolves by log or sweep order.
- **Phase order** (`turn.ts`) leads with `settleDiplomacy` and runs through
  religion, yields, production, research, renown, `worldClock`, `wagers`,
  `census`. `collectYields` prices every city before any bank is touched.
- **Timed effects are comparisons, never countdowns.** `TimedEffect` carries an
  absolute `expiresTurn`; `pruneTimedEffects` is a broom. Seals, stamps and
  purchase marks all work the same way — nothing ticks.
- End Turn is three beats in the UI (marches → turn card → camera), timed by the
  renderer's `pendingAnimationMs()`. `firstBlocker` (`turnBlockers.ts`) is what
  raises a prompt before the turn can end; the HUD bullet below lists the
  passable ones (an idle trader, "Renew rites").

## The map and the starts

Reference: **`docs/mapgen.md`** · data: `data/mapgen.json` · code:
`src/sim/mapgen.ts` and `src/sim/mapgen/`.

- `generateMap(seed, sizeName, overrides?)` is a **pure function of its three
  arguments**. The map is not stored in a save; it is regenerated, so anything
  that made the map is in the config.
- **Nothing may regenerate a tile mid-game.** Features and resources are placed
  once, in `newGame`. The only mutable tile fields include `improvement`, `improvedOn`, `damagedImprovement`, `feature`,
  `discovery`, `road`, `vein`, `surveyed`.
- A pillaged work stops providing yields, resource access and bonuses. Orders
  count the tile as unimproved. Damaged models and ash mark the site. Land
  improvements also show embers on the turn of the raid. Crossed spears mark
  the site on the map. The
  tile panel names the damaged work. A worker
  in its own territory can repair it, including a great person's work or a
  fishing boat. Repair uses the worker's remaining movement and costs no
  charge. It restores the original construction turn. It gives no build
  rewards and restores no road. A new improvement replaces the damaged work.
- Generation is two noise fields plus ordered passes: the pangaea mask and its
  island belt, terrain and hills, forest/jungle and the clearings punched through
  them, lakes, coast, the shelf chains, rivers, floodplains, freshwater, then
  resources. Only rivers and resources roll the map's dice; the woodland pass
  keeps seed-keyed streams of its own so it disturbs neither.
- **Start positions are not a generation pass.** `chooseStartPositions`
  (`startPositions.ts`) derives them from the finished map and rolls nothing.
  Spacing is `spacingFactor × √land`, clamped between a floor and a ceiling; four
  fairness guarantees hold, and a leader's start bias runs in three stages.
- `mapgen.html` is the experimental loop — every tunable, live, with an override
  seam. The doc's tunable tables are sync-tested against the data
  (`test/mapgen/mapgenDocSync.test.ts`).

## Yields — the sequence

Reference: **`docs/yields.md`**, the sequence of record · code: `src/sim/yields/`
(`hex.ts` · `town.ts` · `empire.ts` · `stages.ts`, a one-way chain).

- **Rule 5: a total is the fold of a labelled list**, never computed beside it.
  Three verbs and only three — `explainX` returns the list, `foldX` is its one
  sum, `readX` is the memo and lives in `src/sim/readings.ts` alone
  (`test/sim/verbs.test.ts` is the register).
- **Percentages compound across two stages, never inside one**:
  `(base + flats) × (1 + Σ city%) × (1 + Σ empire%)`. Yields are exact decimals;
  rounding is the surface's.
- Twenty steps: fourteen per town (the centre, the worked hexes, the cards' city
  lines, the luxuries, the specialists, the arriving routes, the palace, the
  buildings, the cards' building shares, the conversions, the percent list, the
  two stages, the unrest gate, then the moves: the food surplus a card moves
  into production, and the production a rite moves into culture) and six per
  empire (the luxuries' empire
  signatures, the caravans abroad, the treasury's ledger, the cards' empire
  payouts, the empire stage, the banks). The order is pinned against the source
  by `test/sim/yieldsDocSync.test.ts`.
- **The unrest gate** (step 13) holds a town in unrest at nothing in production,
  science and culture (`rules.war.unrest.halts`). It runs after both stages,
  because percentages sum inside a stage and could not zero a voice; the city
  panel prints it as one line under the stages.
- **A building's package** (batch R2b, `explainBuildingPackage`): its row,
  its own lines (flat or counted, batch R2d), plus every line a card or a
  luxury puts on it in the town (a line whose scope names it, a line counted
  by its kind, its category or its public-work marker in the town, a luxury's
  helping on its category).
  Every live source counts but a rite.
  - The building shares of step 9 are taken over the package, so a doubler
    on temples doubles "+2 science on temples", and a doubler on the
    Cathedral School doubles its counted science.
  - A building **supplies** a voice when its category is that voice or its
    package pays it (`buildingSupplies`). Every reader of "a building that
    pays X" asks this (batch R2d): the `hasBuildingYielding` scope, the
    `buildingsSupplying` count, a building share's `pays` selector and
    al-Khwārizmī's faith purchase. The old `scienceBuildings` count is
    retired. The bots price a share over the package.
  - "Supplies" is a game term: the describers mark it (`[[concept:supplies|…]]`)
    and the Compendium's Concepts shelf defines it (`concept:supplies`).
- **One-time grants are modifier-immune.** Everything pays through a
  `settle…Windfall`; `windfallPayout` composes base + every rider into one
  printed figure before banking.
- The register at the foot of `docs/yields.md` says where every card kind that
  pays a yield lands. A new kind joins it or the sync test fails.
- **The land cards' ground** (Expansionist batch E3).
  - A hex can carry **lasting marks** (`Tile.marks`, written only by `markHex`).
    What a mark pays, and while what stands on the hex, is
    `rules.improvements.hexMarks`; the hex fold adds it after the works. The
    Raising of the Land and The Coming of the Water write marks through a
    windfall rider's `mark` grant and `markTownLand` (`cities.ts`).
  - A farm can **count as having fresh water** by its empire's law or a work
    beside it (`farmWaterOf`: The Water Courts, along a chain of farms; a
    Qanat, on the hexes beside it). The Irrigation renewal, the farm's
    placement on dry ground and the cards' `freshwater` test read it. The
    Watercourses' one-step relay from a river farm went in batch DS3; the
    card now pays a farm on fresh water.
  - A hex question can ask what the tile alone cannot (`GroundFacts`: the
    empire asking, its farm water, which town centres hold a wonder, and since
    Dominion batch D7 where its fortified military units stand), so three
    tile tests are new: `river`, `wonderTown` and `surfaced` (the empire that
    struck a seam, `Tile.surfacedBy`).
  - Since Magisterial batch MG15 a tile test can ask whether a hex's
    great-person work stands on a straight line of works (`workLine`, with a
    `length`): along one hex axis, with no gap, every work in the asking
    empire's borders. `workLinesOf` finds the lines once for the board, in
    tile index order, and remembers them on the economy clock; the test reads
    them through `GroundFacts.workLine`, so the hex fold asks a lookup and
    never a walk (The Processional Way).
  - The Gilded Country adds gold to each tile that already makes at least one gold.
    Its threshold reads the other additive tile lines, including lines from
    cards. Tile percentages apply after the bonus.
  - An Order amplifier with a tile test (`CardYieldAmplifierEffect.on`, The Age
    of Improvement) raises the Orders' hex lines on those hexes only. Since
    Magisterial batch MG10 an amplifier's share of a hex line keeps the line's
    own multipliers (`hexMultipliers`), so a line paid for each neighbour that
    passes a test is raised for each such neighbour (The Divine Proportion on
    The Siting Masters).
- **The works a seated card opens** (Expansionist batch E4).
  - A row marked `unlockedByCard` is open to a seat's workers while a seated
    card names it (`unlocksImprovement`, read by `cardUnlocksImprovement`). A
    work built stays when the card leaves. Three rows: the Keep (`townKeep`,
    The Keeps), the polder (The Polders) and the outpost (Outposts).
  - The Keep is one in each town (`onePerTown`), pays what the hexes around it
    pay (`copiesNeighbours`; `GroundFacts.copiedHexes` finds them: your hexes,
    never a town centre or another Keep), and gives whoever defends its hex
    +5, the citadel's line (`defense`).
  - The polder goes on coast beside three of your land hexes (`landBeside`) and
    yields as a farm on grassland (`yieldsAs`): the hex fold replaces the
    ground's yield and takes the farm's dry renewals. The hex stays water.
  - The outpost goes only on unowned wild ground within three hexes of the
    borders (`beyondBorders`). When it is built, it claims its hex and the
    unowned ring around it for the nearest town (`claimsUnowned`,
    `claimGroundForWork` in `improvements.ts`). A town founded on it takes that
    land (`foundCityAt`), and the outpost goes.
  - The Garden Frontier (`worksBeyond`) lets tended works go on unowned ground
    up to two hexes beyond the borders, and the hex joins the nearest town.
  - The Wide Country's tally is `hexClaimed`: hexes claimed by an outpost, a
    cleared camp or buying. Its reward is D6's citizens to the smallest towns.
- **The ten-turn moves** (Expansionist batch E4, `frontiers.ts`). Two phases
  after `expandBorders`: `encroachment` (The Encroaching Fields, `encroach`)
  takes an unworked hex from a smaller foreign town beside a large town, and
  `migration` (Migration and The Great Migration, `migration`) moves citizens
  on the empires' happiness. Each fires when `turn % every === 0`. Batch DS1
  retired The Encroaching Fields and Migration, so The Great Migration is the
  one dealt card that uses these phases.
- **What a hex is worth as a place to put a town** is one reading in the same
  three verbs: `explainSite` / `foldSite` (`src/sim/sites.ts`) over the ring's
  hexes through the seat's own eyes, the water, the seams, the coast, the hills
  and how crowded it is, with `readSites` in `readings.ts` the memo that ranks
  the seat's charted, foundable ground. The settler lens's markers, the hover
  card's words and the bot's own settler all read it (`rules.sites` holds the
  ring and the weights; `site.ringRadius` and `site.yieldWeights` left
  `data/ai.json` when it landed, so there is no second weight table).

## Cities, production and purchases

- A city's non-arithmetic self lives in `src/sim/cities.ts` — territory,
  ownership, founding, citizens, growth, borders, the resource clauses, the tile
  purchase. Its arithmetic is `src/sim/yields/`.
- **Production costs are one standard** (**`docs/production-costs.md`**):
  `sizeHammers[size] × columnRate ^ (column − 1)`, floored once, then the
  once-per-empire line and a unit's escalation ladder. A row carries a **size**
  (small/medium/large/wonder; light/line/heavy/engine/settler) and **never a
  figure** — a row with `cost` on it fails a register test. The column reads the
  unlocking tech, or the row's own `column` where the tree names nothing.
  `columnRate` is 1.31. Projects keep a flat `cost`.
- **Beakers and hammers are committed to the thing they were spent on.** Progress
  is per technology (`Player.techProgress`) and per queue row
  (`City.itemProgress`); switching starts the new thing at nought and the old
  thing is still standing when you come back. Overflow is the opposite rule and
  follows the *queue*.
- **A lost wonder race** pays back, as gold, what each losing town banked
  toward the wonder, at any position of its queue (`refundBeatenWonders`).
  Since Magisterial batch MG9 a town whose owner holds `wonderHammersMoveOn`
  (The Envious Eye) and lost to a rival keeps the hammers toward its new front
  row instead, and settles through `settleProductionWindfall`. A town with an
  empty queue still takes the gold.
- **Purchases** (`purchase.ts`): `purchaseItem {cityId, item, currency}`, gated by
  `explainPurchaseCost` + `purchaseError`. A row naming its own bank sells only
  there; everything else sells for gold at `goldPerHammer` × the full production
  cost. **A city buys one unit per class per turn** (military-gold, civilian-gold,
  faith), by absolute stamp. Buildings are uncounted.
  - A purchased unit takes its free city slot. If that slot is full, the
    city needs a legal adjacent tile and must be free of siege. The game
    checks in map neighbour order before payment and applies arrival effects.
  - **A wonder is not for sale** unless one of four lifts opens a bank for it,
    each a clause of the one refusal in `purchaseError`: the Valley of Kings
    in its own town and The Pious Masons for a wonder at least half built
    (faith), The Gilded Scaffold (gold), and since Magisterial batch MG11
    Magnificence (culture, `cultureBuysWonders`). Every other gate still runs.
    The Magnum Opus is not a wonder and is never bought.
  - **Culture is the third bank** (`PurchaseCurrency`, Magisterial batch MG11).
    It buys only the world wonder at the front of a town's queue, under
    Magnificence, and it is the one price that is not the full cost: one
    culture (`production.culturePerHammer`) for each hammer the wonder still
    needs. The banked hammers are used, not passed to the next item. The
    culture comes from the draft pool (`spendCulture`), so it never opens a
    draft. It is not gold or faith spent: no spending record or gold tally
    moves, and the purchase moment fires with no gold on it. The purchase
    riders apply to it as to the other banks. The city panel's price column
    shows a culture cell on that one row (`PRICE_BANKS`, `priceCell.ts`).
- **Projects** are queue rows that never leave; the payout is deliberately not a
  windfall. A project-headed town never re-decides (a known edge the bot works
  around).
- Buildings' non-yield facts are read in one place, `buildingEffects.ts`.
- **Levies** (`levies.ts`, batch L): `levyCitizen {cityId, use}` spends one of a
  town's citizens. What it buys comes only from held cards (the `levy` effect
  kind, read in `evaluator.ts`): `production` (hammers equal to the food the
  citizen took to grow), `muster` (best melee unit, trained), `opus` (the same
  hammers sent to the town with the Magnum Opus at the front of its queue),
  `conscript` (best melee unit, not trained), and since Expansionist batch E1
  `worker` and `settler` (not trained) and `wonder` (that food as hammers, sent
  to the nearest other town with a world wonder at the front of its queue). A
  `science` use (beakers equal to that food) went in batch R1, when The Terraces
  of Moray became a rider on the `levy` moment. Since batch DT19 there is also `rite`
  (Human Sacrifice, in the capital): the command names a rite (`rite`), and
  `sayRiteOverRealm` starts it in every town the seat holds, as a prophet's rite
  does, for the citizen alone, with no faith and no prophet. A rite that acts at
  once is refused (`realmRiteError`, shared with the prophet's gate), and each
  town reached raises the rite price. A card's `after` hangs timed effects
  on the town (Seasonal Levies); `returnsAfter` sends the citizen home later
  (The Mit'a: `CityLevyRecord.returns`, given back by the `levyReturns` phase
  with no growth riders); `noWaitEvery` lifts the wait on some turns of the
  world's calendar (The Slack Season). One levy per town per
  `rules.cities.levy.everyTurns`, shared by every use, from the absolute stamp
  `City.levy.turn`; a card may shorten it for every use (`every`, Human Sacrifice:
  `levyStandingWait`) or for its own use at war, and the shorter applies. The citizen
  leaves through `loseCitizen` (the famine's routine), and `recordLevy` counts
  it (`Player.citizensLevied`, The Labour Rolls). A piece a levy raises carries
  the use as `Unit.levied`, which a stamp or a combat line can narrow to (The
  Trained Bands, Watch and Ward). Cards marked "Needs a levy"
  (`OrderDef.needsLevy`) are dealt only to a seat holding a card that grants a
  levy, Order or Doctrine. Refusals are `levyError`, and `levyLineError` is its
  half with no rite named; the city panel's levy buttons and their confirm are
  `src/ui/levyMenu.ts`, and the rite line's confirm lists the rites. Bots
  levy too: see **The bots**.
- **A town's reach and its mountains** (Expansionist batch E3). How far a
  town's citizens reach is `workRadiusOf`: the rule book's work radius, and one
  ring more under The Common Domain's `widerReach` city rule (towns of ten). It
  bounds the hexes a town works and the hexes it may buy. The Mountain
  Terraces' `workMountains` city rule lets citizens work mountains
  (`isWorkableTile`). A great person's act pays its riders in the town where
  the act landed.
- **How a town places its citizens** (`assignCitizens`): honoured pins first,
  then the best hexes by a sheet, ties to the lower tile index.
  - A town with no focus uses the default sheet, `rules.cities.citizenWeights`,
    read at the owner's age by `citizenWeightsFor`. It weighs all six yields,
    and food counts for less in each later age (the user's ruling of
    2026-11-22; the figures are the bots' `weights` of that day, times five).
  - A focus (food, production, gold) uses its sheet in
    `rules.cities.citizenFocusWeights`, and is refused if it leaves the town
    short of food.
  - A town the default placement leaves short of food swaps hexes toward food
    until it is fed (`feedTown`). Then Avoid growth trims the surplus
    (`capFoodSurplus`). Neither trim moves a pinned hex.
  - Details: `docs/city-screen.md`, "Citizen focus pane".
- **Each hex belongs to one town** (`state.tileOwner`), and a town's citizens
  work only its own hexes inside its reach (`assignableTiles`).
  - **A pin may take a hex** from another town of the same empire (the user's
    ruling of 2026-10-17, `docs/flags.md` (aaaaaaa)). `takeableTiles` is the
    one list: inside the town's reach, owned by another town of the empire,
    workable, not a town's centre, and not a second "at most one per town" work
    for this town (`doubledWork`; The Keeps).
  - `setLockedTiles` checks every pin first. Then `takeTile` moves the hex,
    the losing town drops its pin there, and both towns are re-seated in the
    same command (entry 1 of the mid-turn register).
  - The hex stays with the town that took it when the pin is lifted. The
    automatic assignment, and so the bots, never take a hex.
  - The city screen pins a takeable hex like an own one, and the hover readout
    says "Take from" and the town's name (`takeHint`).
  - Three writers give a hex to a town: `claimTile` (a hex nobody owns),
    `takeTile` (a hex of another town of the same empire) and, since
    Magisterial batch MG16, `seizeTile` (a hex of a rival's town; that town
    drops its pin there). Since tidy batch Z1 the citadel's claim
    (`greatPeople.ts`) and The Encroaching Fields (`runEncroachment`,
    `frontiers.ts`) move hexes through these three writers too.
  - Since Magisterial batch MG16, `expandBorders` ends with
    `pullRivalHexesToWorks` (The Pull of the Masters, the action rule
    `worksPullRivalHexes`). Each holder in `realPlayers` order walks its
    great-person works in tile order, and each work takes the first hex
    beside it, in ring order, that a rival's town owns and does not work,
    that is not a town centre and carries no great-person work, and that lies
    within `cities.claimRadius` of the holder's nearest town, which takes it.
    A hex moves at most once a sweep, so the first holder in that order wins
    a hex two holders reach for. Both towns are re-seated after each take
    (entry 33 of the mid-turn register) and both empires' sight is redrawn.
- **A town's largest size, and three moments** (Expansionist batch E2).
  - `City.largestSize` is the most citizens a town has ever had. It is written
    at the founding and raised by `settleSizeRecord` (`cities.ts`), which
    `settleGrowth` and `settlePopulationWindfall` call after any gain. It never
    falls. Each new size writes the `sizeRecord` tally (The Grain Census) and
    pays the `sizeRecord` windfall occasion with that size (The Freedom of the
    City).
  - The `roadJoinings` phase (`roadJoinings.ts`, before `collectYields`)
    records the first time an owner's capital reaches a town by road
    (`City.joinedBy`, written with or without a card) and pays the
    `joinedToCapital` occasion (The Opening of the Roads).
  - The census pays the `census` occasion to every empire still in the game,
    with its citizens (The Tax Rolls). A completion now carries the town's
    population (Scientific's The Dedications). The Topping Out pays each town
    by its own citizens instead (`fromTownPopulation`, Scientific batch S6).
  - A founding rider's `fromLargest` starts a new town at a share of the
    largest town (The Great Colonies). Two counts: `citiesFounded` (The Book
    of Settlements) and `citiesAdmitted`, the towns a scope admits, which a
    production bonus can read (The Land's Great Work, The Great Aqueducts,
    The Imperial Highways).
  - A founding rider's `claimRadius` claims every unowned hex within that
    many hexes of the new town (The Staked Claims, Expansionist batch E4).
  - A founding rider's `unit` raises a unit in the new town, free of upkeep,
    through `raiseFreeUnit` (the shared The Frontier Militia, Expansionist
    batch E5).
- **Other Expansionist batch E5 shapes.** The meter rule `writUncapped` (The
  Sovereign Writ) pays the writ's first bonus rung once for every step of its
  size, with no ceiling (`uncappedTierPercent`, `meters.ts`). The
  `defensiveBuildings` count reads fortifications through `isFortification`
  (`buildingData.ts`; The Burhs). A production bonus marked `defensive` went in
  batch DS3 with The Burhs' second clause. A windfall rider's `inTown` (the town filter of Dominion batch
  D7's disband moment) also reads a great person's act, and a grant's
  `fromTowns` reads the production per turn of the empire's other towns a
  scope admits (The Master of Works); a great person's act carries its town
  as `WindfallOccasionFacts.townId`, the same fact the disband moment fills.
- **Expansionist batch E6 uses Dominion batch D7's shapes.**
  - The Breadbasket is D7's `surplusToProduction` with a new town scope,
    `avoidsGrowth`, which reads the town's Avoid growth tick
    (`City.avoidGrowth`).
  - While a card moves a town's food surplus into production
    (`surplusMoverFor`), `assignCitizens` does not run the avoid-growth cap
    (`capFoodSurplus`), so the town keeps its citizens on its food and the card
    has a surplus to move. This reaches The Laws of Lord Shang too.
  - Veteran Colonies is a rider on D7's `disband` moment (`inTown: true`, a
    military unit). Since batch E10 it grants the town one citizen (the
    `citizens` grant, with no growth riders). It does not read `unitCost`, so
    a unit raised for free gives a citizen too (the user, 2026-10-23).

## Units, movement, combat, siege

Reference: **`docs/units.md`** (the roster; generated) and
**`docs/war-diplomacy.md`** §5b (the waterline and the taking of a town).

- **`stepCost(from, to)` is the ONE price of a step.** Four readers — `findPath`,
  `reachableTiles`, `advanceAlongPath`, `pathTurns`. Movement is in fifteenths;
  a road step costs a third by default, and a fifth under the Interior Lines
  Order (`roadStepCost`). Horses take a share off it too. Zone of control
  is a toll, never a lock. Shore crossing is a pair-of-hexes rule; ships are
  exempt. The Woodland Bands' `woodsWalk` rule (Expansionist batch E3) prices
  forest and jungle at the open-ground cost, through `MoveProfile.ignoresWoods`
  in `tileMoveCost`.
- City centers count as paved for movement. A step between a city and a road,
  or between adjacent cities, uses the road price. No road mark is added, and
  city centers have no road maintenance. Foreign-city entry rules still apply.
- A rested unit heals ten health outside its own territory, twenty on an owned
  tile, and thirty in its own city. A besieged city gives only the territory
  bonus. Cards, nearby Keeps and healing rites keep their own lines. The
  unit panel and turn resolution use the same capped list in `healing.ts`.
- **A lake is water like the coast** (the user's ruling of 2026-10-16,
  `docs/flags.md` (wwwwww)). The lake's terrain row is `embarkable`, and
  `openWater` reads that flag in `tileMoveCost`, so all four readers agree:
  - a land piece that may embark (Sailing; soldiers at Wayfinding) may cross a
    lake, and a hull may enter one from a port beside it;
  - a worker lays fish traps (and floating gardens) on a lake as on the coast,
    standing on the hex, embarked;
  - whether a town is coastal is a separate question, and the ruling leaves
    it alone: `isCoastal` asks for a `coast` hex beside the town. A town beside
    only a lake builds no ship and no harbour, and its hex is no port.
- **Three rules about who is in the way** (`docs/flags.md` (ooooo), 2026-09-15),
  all of them inside `stepCost`'s discipline:
  1. **A piece at peace is not a wall.** A hex holding a piece of a seat this
     empire is not at war with — its own included — may be *passed through* with
     the movement to reach a hex beyond it; `canTransit` admits it, `canStopOn`
     refuses it, and the pass costs the ground and nothing more. A hostile piece
     blocks as it always did, and the wild is at war with everybody.
  2. **Zone of control** adds a movement cost near hostile units and cities. The Great Wall reduces an enemy’s movement allowance when it starts a turn in the owner’s territory.
  3. **The swap.** A military piece ordered onto a hex holding one of its own
     seat's military pieces trades places with it: the mover walks its route, the
     sitter walks the reverse, and the order is accepted only if **both** walks
     fit this turn (`planSwap` — never a civilian, never another seat's, both
     landings priced through `stepCost`). It is a `moveUnit` with the friend's
     hex as its target, so the highlight and the reducer agree hex for hex, and
     both pieces spend their movement, break their trench and wake.
- **Landings and detours** (`docs/flags.md` (xxxxxx), 2026-10-17):
  1. A shore step (onto or off the coast or a lake) that spends the whole
     allowance ends the march on the hex it lands on (`endsTheMarch`). So
     `findPath` plans such a step only onto a hex where the piece may stop
     (`canStopOn`). A free landing (Admiralty) does not end the march and is
     not asked.
  2. If the hex a march has to rest on holds a piece that leaves it no room, the
     walk plans a way round to the same goal (`findPathAround`, round every hex
     it has met blocked during that walk) and walks it. A route on dry land goes
     round on dry land. If there is no way round, or the blocked hex is the goal,
     the piece waits with its order, as before. A hostile soldier is still a
     wall, and the walk clears the order.
  3. The result names the cells a detour walked (`CommandResult.reroutes`, from
     a `moveUnit` and from the resolution), and the board slides the piece along
     them. The order left on the unit is the detour's remainder, so the drawn
     route follows it.
  4. The bots step a garrison aside only onto land, bring an idle land piece on
     the water ashore instead of standing it down there (`comeAshore`), and
     never dig in to mend on the water.
- **`arriveOnTile`** (`arrival.ts`) is the one "came to rest here" seam — ruins
  claimed, camps burnt, civilians captured, a march refilled under The King's
  Road. Any new way to move a unit calls it — the swap walks both its pieces
  through `advanceAlongPath`, so both arrivals land there.
- **Combat is flat points on one ledger** (`planCombat`). Terrain, fortification,
  the general's aura, a wall, a melee attack across a river and a land piece's
  shot at a ship all add labelled strength lines. Cards use the same sum.
  Damage is an exponential in the *difference* of two effective strengths, so an
  edge is worth the same multiplier at any rung.
- **A town is attacked in three beats** — walls → garrison → capture, off the
  plan. A **melee** kill on the garrison beat takes the town in the same blow; a
  ranged kill leaves it to be walked into. City strength is the best unit its
  owner could train now; `underSiege` is derived, never stored.
- **A town taken by force enters unrest** (batch WC1, `src/sim/unrest.ts`;
  reference `docs/war-diplomacy.md` §5c). `captureCity` writes `City.unrest`
  (presence is the state) whether the town is kept as a puppet or annexed, and
  for a founder retaking its own town; a town taken again while in unrest starts
  over for its new owner; a town handed over at a treaty table enters none. In
  unrest a town makes no production, science or culture (the unrest gate, yield
  step 13) and its borders do not grow; food, gold, faith and purchases are
  untouched. **Pacification** fills a basket toward `2 × the population when
  taken`, at a rate that is a labelled list (`explainPacification`): every turn,
  a soldier of the owner's inside, a great general in or beside the town, and
  each building with the `easesUnrest` marker (the Courthouse). The `unrest`
  phase, after `resetMovement` and before `wakeSleepers`, fills it and ends the
  unrest at the target; a town still in unrest with no soldier inside counts the
  turn, and every third such turn a **rebel** rises on a free hex beside it — a
  barbarian of the kind a camp there would raise, ordinary from then on. A town
  in unrest raises no production blocker. Every figure is `rules.war.unrest`.
  The town panel shows the bar, the reasons and the turns left; the banner and
  the flag fly a torch (`CityLook.unrest`). Bots keep a soldier in such a town
  (`military.unrestGarrison`), weigh a target's unrest in a declaration
  (`war.unrestDrag`) and raze one they cannot hold (`war.razeUnrestTurns`).
  - **Cards that touch unrest** (Dominion batches D3 and D4):
    - The Harrying's pillage puts an ungarrisoned enemy town into unrest
      (`startUnrest`'s second caller).
    - A card can add a line to pacification (`CardRule` `pacificationRate`, The
      Satraps).
    - A card can end the unrest at once: in the `unrest` phase for a town its
      scope admits (`CityRuleId` `pacified`, The Bakufu and The Consular Roads),
      or at the moment of capture (`ActionRuleId` `pacifyOnCapture`, Pax
      Romana).
    - Every way unrest ends goes through `endUnrest`, which pays the `pacified`
      windfall occasion with the town's population (The Provincial Census).
- **Losing a war costs happiness** (batch WC2, `src/sim/weariness.ts`;
  reference `docs/war-diplomacy.md` §6a). Every unit an empire loses to another
  empire (killed, captured, or a caravan plundered) and every town taken from it
  by force is recorded on `Player.warLosses` with the turn and the empire that
  caused it. `recordWarLoss` is the one writer; its callers are `applyCombat`,
  `captureCity` and `arriveOnTile`, pinned by `test/sim/weariness.test.ts`. War
  weariness against one enemy is your losses to it minus its losses to you over
  the last `windowTurns` (20) turns, never below zero, with a town worth
  `townLoss` (8) units. The barbarians never count, a town ceded in a peace deal
  is not a loss, and peace erases nothing: losses age out. Each enemy with
  weariness is one cost line in the happiness list (`explainHappiness`), at
  `happinessPerPoint` (1) a point, and weariness touches nothing else. The
  `settleDiplomacy` phase prunes losses that have left the window. Every figure
  is `rules.war.weariness`. The foreign courts screen shows the line in that
  court's "Standing and deals" drawer, and the Compendium has a concept entry.
- **Units earn ranks in combat** (batch WC3, `src/sim/ranks.ts`; reference
  `docs/war-diplomacy.md` §6b). A blow is a fight when it is struck at a unit
  that is not a civilian or at a town whose walls still stand; each side that
  lives through one earns `survive` (1), or `kill` (2) in its place for
  destroying the unit it fought, attacking or defending, and a ranged attacker
  with no counter-blow still survived. `Unit.experience` (presence is the
  state) has one writer, `writeExperience` (`ranks.ts`), behind three callers:
  `awardExperience` at the end of `applyCombat`, `grantExperience` for cards
  (the drill phase, for example) and `raiseToRank` for a starting rank. Each
  returns the ranks reached, and `settleRanksEarned` (`cities.ts`) pays the
  "rank earned" moment and counts `Player.ranksEarned` (batch D1, 2026-10-16).
  Cards read a rank in four places (Dominion batch D2): a combat condition
  (`hasRank`), a `rank` narrowing on a unit stat and on a flag rule, a town
  scope (`garrisonRank`), and an upkeep rebate for each rank (`perRank`). An
  Elite under The Varangian Guard may attack twice a turn, and
  `Unit.firstAttackTurn` holds the turn of its first attack. The rank is derived (`rankOf`), never stored: Veteran from 4,
  Elite from 10, each **one flat strength line** on the ledger on both sides
  ("Veteran +3", "Elite +6", the Elite figure a total) and nothing else.
  Barbarian fights raise experience up to Veteran and no further (a card's grant ignores that cap), barbarian
  units earn none, and a town earns none. Experience stays through an automatic
  upgrade and a change of owner. A card's birth stamp of strength now prints as
  "Training", so "Veteran" means only the rank. Every figure is
  `rules.combat.ranks`. The badge carries a boss at its upper-left corner (one
  chevron or two, `src/art/rankMarks.ts`, the rank a member of `signUnits`), the
  garrison row a chip, the unit panel the rank and an Experience figure, the
  forecast the line, and the Compendium a concept entry.
- **The waterline**: a land piece that closes may not strike a water hex; an
  embarked piece may not strike a ship; a land bow shooting a ship takes a flat
  loss of strength and land siege a flat gain (`rules.naval`); a ship that
  attacks an embarked unit takes no counter-blow.
- Auto-upgrade (`upgradesTo`) is gated on the strategic resource. A unit whose
  successor the empire could field today is refused by `buildError` and hidden
  from the build list, but a row already queued builds out.
- **The wild never captures.** Barbarian roles derive per turn, never stored; a
  camp's mount follows the age's tier.
- A melee blow on a **laden trader plunders** (bounty to the nearest city), never
  captures.
- **Each war keeps a record** (Dominion batch D6, `wars.ts`): the towns each
  side took by force (`WarState.taken`, written by `captureCity`) and the other
  side's hexes each side pillaged (`WarState.pillaged`, written by
  `payPillage`). `warSpoils` reads what one side won: the towns it still holds,
  their citizens, and its hexes. A signed peace pays each side's `peace`
  riders with it (`settlePeacePair`, after the terms and the close), and the
  end of a war, by peace or by the other empire's destruction
  (`updateElimination`), is the `warEnded` tally.
- **A capture** carries the town's works and wonders (`worksAndWonders`), and
  an Order's capture riders can be scaled (`captureRewards`, Vae Victis).
  Production a capture sends to the Magnum Opus with no town raising it is
  kept on `Player.opusBank` and moved into the Opus town at the start of the
  production phase (`releaseOpusBanks`). `City.originalCapitalOf` says whose
  first town a town is.

## The tech tree and the ages

Reference: **`docs/tech-tree.md`** (Part 2 generated; `TECH_DOC_WRITE=1`) · code:
`src/sim/tech.ts`, `techData.ts`.

- Forty-nine nodes, thirteen columns, ages 12/9/14/14. **A column IS a price** — one
  table, 5 · 11 · 24 · 50 · 100 · 190 · 360 · 650 · 1150 · 1960 · 3250 · 5150 ·
  8000. Every figure is one fitted curve (`ln cost(n) = ln 5 + 0.8084n −
  0.01613n²`, friendly-rounded); retuning is re-fitting two constants, never
  editing a row. It is a taper, not an exponential.
- **Adding a tech is placement, not archaeology**: prereqs choose the column
  (chaining *inside* the age — a cross-age parent buys no depth), and the column
  prices it. **The lanes are the user's drawing** (`row`, `columnShift`); the
  annealer only advises on new nodes.
- Ages follow columns: columns 9–12 are Æra IV. Alchemy takes all five closing
  lines as parents — the sanctioned exception to ≤2 parents.
- `techsGrant` abilities (embark, siege, the great-person gate, the rites); a
  `TechDef` may carry card effects and `paysBead`.
- **Few passive bonuses on technologies** (batch TT1, `docs/flags.md`
  (iiiiiii)). The user ruled that an unlock is obvious and a passive bonus is
  easy to miss, and cut most of them. Five ordinary nodes still carry a rule:
  Code of Laws (+3 authority), The Wheel and State Workforce (each gives
  workers an extra charge), Daughter Cities (a founded town starts with a Town
  Charter) and The Golden Roads (an extra trade route). Four improvement
  renewals stay in `data/improvements.json`: Irrigation, Currency, The Saddle
  and Geomancy. The charter technologies keep their own rules.
- **Batch TT2** (`docs/flags.md` (jjjjjjj)). Divine Right left the tree with
  its bonus, and Castellany takes Guildhalls as its parent, so it sits in
  column 9 and costs 1960. The Military Engineers' charter row follows it to
  column 10. The Courthouse moved from Iron Working to The Civil Service, and
  The Civil Service lost its great-person works bonus. The second worker charge
  moved from Bronze Panoply to The Wheel.
- **A kept bonus is the node's headline.** `techGifts` lists the renewals and
  the node's own rules first, so the star chart's hover card, the Compendium
  and `docs/tech-tree.md` lead with them. The node's face in the chart prints
  them first too, above its units and buildings (`techHeadlines`,
  `src/ui/techTree.ts`), worded by `renewalNote` and `techRuleClauses`.
- **Every line the tree prints has one short form** (batch TT3, `docs/flags.md`
  (kkkkkkk)): the subject first, then the figure, with no "gain", "may", "now"
  or full stop ("Workers +1 charge", "Rite: town +10 defence").
  - Rules: `describeTechRules` (`statecraft/describers.ts`) words a node's
    rules through `effectLine`. An Order with the same effect keeps its
    sentence (`describeCard`). Line traits: `describeTraitLines`.
  - Abilities: the row's `summary` in `data/techs.json`. A verb with a
    `concept` field prints its name alone, as a keyword to that Compendium
    page (Siege).
  - The words for renewals and abilities live in `src/ui/techRuleWords.ts`
    (`renewalNote`, `abilityNote`), so the node face, the hover card and the
    Compendium print the same words. `test/ui/techLines.test.ts` holds them.
  - An effect that opens a building or a unit for every town
    (`techUnlockEffects`, Surveying's Aqueduct) is listed by `liveUnlocks` as
    an ordinary unlock, and `techRuleEffects` leaves it out of the rules.
- **The world's age follows the empires** (`worldAge`, `worldClock.ts`). The
  countdown that closes age N starts when any living seat has reached age N + 2,
  or at least half of the living seats have reached age N + 1
  (`rules.wager.leadAges`, `rules.wager.shareOfSeats`). The world moves one age
  a close, each with a full public countdown (`docs/wager.md`, "Rules").
- `researchPlan(player)` = `researching` + `researchQueue` (presence is state),
  written only by `writeResearchPlan` and `promoteResearchQueue`.

## Statecraft — governments, doctrines, orders, wagers, malices

Reference: **`docs/orders-and-doctrines.md`** (the master list, sync-tested) ·
code: `src/sim/statecraft/` (`evaluator.ts` · `describers.ts` · `draft.ts` ·
`council.ts`, the chairs and the slots).

- Culture fills **one** pool (`Player.culturePool` IS the draft basket); border
  culture (`City.culture`) is a separate channel. The draft meter is
  `12 + 5n + n^2.2` (B1, measured — `docs/orders-and-doctrines.md` "The draft pass").
  The faith reroll's count (`rerollsTaken`) is zeroed by adopting a government.
  Offers are drawn once and spent by a command; a pick names
  an index. Adopting a government re-seats the council: a card keeps its chair if that chair still fits it, the rest move to free chairs that fit, and a card that fits nowhere returns to the collection with its progress. Seals are absolute turns.
  - **Chairs a Doctrine opens** (batch DT9): `applyChooseDoctrine` calls
    `refitSlots`, so a `slotRider` Doctrine (The Council of Ten) adds its Wildcard
    chairs at once and moves no card. A government's offer card and the bots'
    `adoptionTable` read the chairs the adoption would lay out (`chairLayoutUnder`),
    so they count what the seat's own law adds or closes.
  - **The Forbidden City's chair** (bot batch BP7, schema 243): the wonder's row
    carries a `slotRider`, so whoever holds its town has one more Wildcard chair.
    `realiseItem`, `handOverCity` and `razeCityAt` call `refitSlots` for a town
    holding such a row (`buildingOpensChairs`). A seat that loses the chair is
    seated again by `reseatOrders` (`refitSlots` with `'reseat'`), as an adoption
    seats it; Scutage's closing still returns the card in the closed chair.
  - **A chair that counts twice** (batch DT9, The Arthashastra): a `slotPosition`
    row with `whole: true`. `position: -1` is the last chair of the flavour that no
    malice holds, so the chair moves when another chair opens or a malice takes it.
    `buildLiveEffects` pushes the seated
    card's effects again, right after the seated Orders, under a label of their
    own. `slotRider`, `slotPosition` and `metaRule` are read once.
    `runPeriodicBoons` reads a periodic row off the chair itself, so it multiplies
    by `chairReadingsAt`.
  - **Reading a source again** (batch DT9): the meta rule `godsCountTwice` (The
    Serapeum) pushes each pantheon god again, less its offers. `governmentsOfTier`
    (The Union of Lublin) pushes the other governments of the seat's tier, less
    any `slotRider`, so chairs stay the held government's.
  - **Orders off their chairs** (batch DT11, Scutage): the rule `collectionPays`
    makes `buildLiveEffects` push a labelled copy of each flat or counted line an
    unseated Order pays, at the rule's share (`offTheChairRows`). A share, a meter, a
    cost and a line paid to another empire stay behind, and a charter pays nothing.
    So the collection is law, and `settleCardTaken` announces a card taken. A negative
    `slotRider` closes the last chairs: `chairCount` stops at the government's typed
    chairs, and `refitSlots` returns the card in a chair that closes.
  - **The fit a council grants** (Magisterial batch MG12): `orderFitsSlot` is
    the plain rule, and every reader of a seat's chairs asks `chairFitFor`
    (`statecraft/council.ts`) instead: the slot refusal, the re-seating, the
    council screen, the bots and the card stamp. While a card holding
    `cardsFitAnyChair` sits in a chair (The Mixed Constitution), every card of
    its holder fits every chair, and an adoption re-seats by the fit the old
    council granted. When the fit narrows, the council is re-seated at once by
    the plain rule (`settleCouncilFit`): a card that fits its chair keeps it and
    its seal, the rest move with their seals lifted, and a card that fits no
    free chair returns to the collection. Every writer that can empty a chair
    asks it: the unslot command, a malice taking a chair, a commission leaving,
    an adoption and a council that shrinks. The council screen sends its batch
    so the card goes in first and comes out last (`councilDiff`,
    `statecraftStaging.ts`), and that ordering and the flair gallery are the
    only readers of the plain rule outside the fit's own modules.
- **No levels**: an Order is what its row prints, held once. A draft is take one
  or **pass** — a skip spends the hand and raises `orderSkips`, and each banked
  skip adds pity to the uncommon and rare weights of the next draw. Rarity
  (● common ◆ uncommon ○ rare) is weighed 4/2/1 inside each sub-bag of the
  guaranteed military/economic/wildcard spread.
- Pools: Chiefdom → Government I/II/III (tier 18 is the last new pool).
  Since 2026-10-17 the ladder's rungs are the government tiers, 4 · 10 · 18 ·
  26 (`docs/flags.md` (ccccccc) and (ddddddd)): an Order tier opens at the
  same draft count as its government, and the old rung at 38 is gone. The
  draft count alone opens a tier; the research age plays no part since
  2026-10-17 (`docs/flags.md` (eeeeeee), `currentBandOf`). Chairs by tier are the
  doc's Governments table, sync-tested: 3, 5, 6, 8 and 11 since batch G1.
- **The twelve governments** (batch G1, 2026-11-10, `docs/flags.md` (hhhhhhh)):
  three at each of tiers 4, 10, 18 and 26, each with a one- or two-clause
  signature (the master list's Governments table). The Aristocracy replaced
  Theocracy, which is retired and kept as it was. Two shapes are new:
  - **`cardTypeAmplifier`** (the tier-26 governments): every number a seated
    card of the named type gives is 30% larger, rounded to the nearest whole
    number and at least one larger where the number is one or more
    (`cardTypeRaise`). `cardTypeRaises` says which seated cards it raises, by
    `countedTypeOf`. Each reader takes the rise of each line it prints and adds
    a labelled line of its own: the town and empire yield folds (off the
    snapshot the engines read, so no engine line is raised), the hex lines (not
    the ones paid per neighbour or peak, nor a hex's share), the route lines and
    shares (not one counted by the road's length), the town's percentages on
    yields and production, the combat strength lines, a town's defence, and the
    yield grants and percentages of `windfallPayout` and a periodic boon.
    `CARD_TYPE_RAISED_KINDS` names these kinds; the bots price the rise over
    the same list.
  - **`greatPersonCost`** (the Aristocracy): a card rule on the renown price of
    the next great person, read by `renownThreshold` beside The Peregrini's
    discount.
- **Batch DS1** (2026-11-10, `docs/plans/deck-simplification-2026-11-10.md`)
  retired 146 Order rows and moved 14 to another tier. A retired row keeps its
  effects, so a save that holds one still plays it, and every shape it uses
  still runs. So some cards this briefing names as the user of a shape are
  retired; each deck sheet's "Retired rows" lists them.
- **Batch DS4** (Commerce's rows of the same spec) changed four readings:
  - three cards read the empire's **gold income** through the `empireYield`
    count (`voice: 'gold'`, the `goldPerTurn` line of `foldEmpireRates`): The
    Nest Egg at the capital, Money at Work in every town, and Bills of
    Exchange as a city percentage. The count is the gold the towns and the
    empire's standing lines make after upkeep, without the cards' empire
    lines, and it answers nothing while the books are being folded
    (`rateDepth`);
  - `monopolyLuxuries` counts a luxury the empire holds that no other empire
    holds, with no number of copies (The Monopoly);
  - a route row no longer pays its host: the route reading of
    `CardPaysEffect.payee` and the route fold's `hostGrants` are gone, and a
    town scope `queueHolds` no longer takes `empireBuilding`;
  - `rules.trade.importedLuxuryPercent` is 100, so The Capitulations' loan pays
    as one copy does.
- **Batch DS5** (Devotion's rows of the same spec):
  - removed the empire condition `noReligionFounded`, because The Calling now
    pays +3 faith in the capital with no condition;
  - removed `queueHolds` as an empire condition, because The Tithe of Nations
    lost its Magnum Opus gate. The town scope of the same name stays;
  - dealt two new Tier 0 cards: The Household Gods, and The First Offering,
    the first on-draft grant of faith (`onDraft` `windfall`, `yield: 'faith'`);
  - held The Votive Lamp and The Pilgrim Staff: the game kept no count of
    every building a town finishes, and had no moment at which faith is spent.
    Batch R1 dropped the first and built the second.
- **Batch DS6** (Scientific's rows of the same spec):
  - removed the `buildingCost` card rule and its line in `explainBuildingCost`,
    because The Almanac no longer makes Libraries cheaper;
  - removed the `townCitizensHere` combat count and the bots'
    `score.scientific.inOwnTown` knob, because Casting's Hoplite is a plain +2
    strength. The Maryannu is a plain +2 too, and the Grenadier is +1 for each
    charter technology known, with no flat point;
  - removed the `families` field of the `nearLearning` combat condition, so
    The Strategikon counts only an Academy, and the `standingTurns` field of
    the `hasEmpireBuilding` town scope, with `oldestEmpireBuildingAge`;
  - removed Niter Beds and the two improvement fields only they used,
    `besideImprovement` and `suppliesResource`, with the copies they supplied
    in `cities.ts`. Niter now comes only from a mined seam, and Chemistry opens
    no work;
  - the Bimaristan no longer heals units, and the Aldine Press no longer pays
    its trade routes. Printing still gives +1 trade route;
  - dealt two new Tier 0 cards: The Scribes (+1 science in every town) and The
    Apprentices, a `buildingCompletion` rider of 5 science. That occasion fires
    in `realiseItem` for every building a town gains through it: built,
    bought, granted by a completion or a commission. Since batch R1 the card's
    rider leaves out wonders and the Magnum Opus (`exceptWonders`). The science banks at once and settles at the next research
    step, as The Consecration Feast's does.
- **Batch DS7** (Magisterial's rows of the same spec):
  - removed the town scope `notHasWonder`, because The Cornerstone and The
    Wonder Commonwealth no longer ask for a town with no wonder. A negation
    is still a named member and never a `not` composite (the `CityScope`
    docblock);
  - removed the cap that `max` put on a `pays` row with `basis: 'share'`,
    because The Learned Patron no longer caps its science. `max` still caps
    the helpings of a counted row;
  - Master Masons is one `buildingCompletion` rider of 30 production on a
    culture building, with no `first` ledger, so a culture building built,
    bought or granted pays its town. The `buildingInCity` ledger stays: the
    retired Master Workshops still asks it.
- **Batch DS8** (the four card keywords of the same spec):
  - **Which keyword:** `orderKeyword` (`statecraftData.ts`) reads it off the
    row's data, never its name or text: **Commission** (a `commission` field),
    **Charter** (a `charter` field), **Boon** (`onDraft` grants and no effects)
    and **Scaler** (a `pays` line with `count: 'tally'`, the old "growing
    card"). Doctrines and governments carry none.
  - **On the card:** `describeCard` prints the keyword as the first clause,
    the mark `[[concept:<keyword>|Name]]` (`keywordMark`,
    `CARD_KEYWORD_WORDS`), with `CardClause.keyword` set. The clauses after it
    drop the standing rule: a commission reads "Goal: … Reward: …", a charter
    says what it opens, a Boon reads "On draft: …", and a Scaler reads "Gains …
    each time …" (`scalerWords`, `SCALER_MOMENT_WORDS`). A lasting reward says
    no "for the rest of the game". Every surface prints `describeCard`, so the
    offer hand, the collection, the commission rail's popover and the
    Compendium all show it. The charter's chip ("Charter — takes no chair") is
    gone.
  - **The tooltip:** the keyword's Concepts page (`compendiumText.ts`, anchors
    `concept:commission`, `concept:charter`, `concept:scaler`, `concept:boon`);
    its first paragraph is the rule the hover card shows, on hover every time.
    Keyboard focus on a control that holds a card keyword (a card face is a
    button, so the keyword has no tab stop) shows the keyword's card too
    (`cardKeywordOf` in `keywordCards.ts`, `CARD_KEYWORD_ENTRIES` in
    `keywords.ts`), as does a control's `aria-describedby` target (the rail).
  - **A Scaler's value:** `scalerShape` reads the counted lines and the flat
    lines that are only their starting values; `scalerFigures` (the evaluator)
    is the start plus one gain a helping of the card's tally. The face prints
    it in tabular mono (`scalerFigure.ts`, read by `scalerValue.ts`): the offer
    hand, the collection, and the Compendium's "Value" row (the start).
  - The Long Memory is dealt to seats that own a Scaler. While seated, it doubles
    new tally gains for Scalers in chairs. Counted commissions still gain at
    their usual rate.
  - **A Boon takes no chair** (schema 238): `slotOrderError` refuses it as it
    refuses a charter (`isBoon`), so the council screen, the bots and the End
    Turn pause never offer one a chair.
  - **A strength line says its side:** `combatSideWords` adds "when
    defending" or "when attacking" (The Siege Train's +5 is on defence). The
    luxuries' describer uses it too.
- **Batch R1** (2026-11-11, `docs/flags.md` (jjjjjjj); schema 239) built the
  held cards and three new moments. Each moment is announced in one place and
  read by the one evaluator:
  - **A levy** is the `levy` windfall occasion, paid by `levyAt` through
    `payOccasionRiders` for every use, after the levy has paid. It carries the
    town (`townId`) and the production the levy paid (`production`, a new fact
    and measure): a levy for production here, for the Magnum Opus or for a
    world wonder pays it; a unit, worker, settler or rite pays none. The
    Terraces of Moray grants science equal to half of it (marked "Needs a
    levy"). The `science` levy use lost its last row and is gone.
  - **A purchase with gold** is the `goldPurchase` tally, written once for
    each purchase by `buyWithGold` (`state.ts`): a unit or building at the
    counter, a hex, a trade route hire and a great-person draft. Gold given
    toward a build (`contributeAt`) still calls `spendGold` alone and is not a
    purchase. The Strongbox counts it; the `treasuryHeld` tally, its writer
    `recordTreasuryHeld`, the `minTreasury` field and the bots' forecast row
    are gone.
  - **Faith spent** is the `faithSpent` windfall occasion, paid by
    `spendFaith` (the one subtraction from the faith bank, at all seven places
    faith is spent) with what left the bank (`faith`, a new fact and measure).
    The Pilgrim Staff (Devotion, Tier I) grants culture equal to a fourth of it.
  - **Letters of Credit** also lifts the loss of science and culture down to
    its floor: the arrears line starts below `arrearsFloor` (`upkeep.ts`, the
    card's `cardSpendFloor`), read by `treasuryInArrears`. The bots' debt
    charge on a purchase on credit had nothing left to charge and is gone.
  - **The Apprentices'** rider carries `exceptWonders`: a world wonder and the
    Magnum Opus pay it nothing. **The Scholars' Roads** costs no route
    capacity. **Market Gardens** is Tier II, and **The Country Fair** (shared
    by Expansionist and Commerce, Tier 0: +1 gold on every luxury hex a town
    works) is the pair's early card.
  - **The tier-26 rises** reach happiness (`cardHappiness`,
    `cardBuildingHappiness`), authority (`cardAuthority`), the renown trickle
    (`cardRenownLines`), the renown shares (`cardCityRenownShares`,
    `cardEmpireRenownShares`) and the renown a one-time reward grants
    (`windfallPayout`). Each rise is its own labelled line, and a negative
    figure is not raised. `CARD_TYPE_RAISED_KINDS` adds `happiness`,
    `authority`, `renown` and `cityRenownPercent`.
- **Batch DS9** (the same schema): the Chiefdom's three chairs are all Wildcard
  chairs; a charter technology costs its column's price, as an ordinary one
  does (`rules.research.charterPremiumPercent` and the premium line are gone,
  so the retired The Patent Office's `charterPremium` rule reads nothing); and
  The Second Reading is dealt in Tiers 0 and I (`lastBand`).
- **Doctrines** (`docs/orders-and-doctrines.md` "Doctrines"): cards held for the
  whole game. A Doctrine takes no chair and is `liveEffects`' second source. 98 are
  live and all are dealt: Dominion 13, Expansionist 24, Commerce 14, Scientific 15,
  Magisterial 16 and Devotion 16. The rows live in the deck files' `doctrines` maps
  with `decks` and `band` (the sheet tier). The pre-rework rows in
  `data/statecraft.json` stay retired. Each deck's sheet lists its rows, and
  `expectSheetDoctrinesMatchData` (`test/sim/decks/sortedSheets.ts`) fails on a live
  row that is off the sheet or a sheet row with no live row.
  - **The offer:** adopting a government opens a Doctrine offer of its tier. Tier 4
    offers the Tier I Doctrines, 10 Tier II, 18 Tier III and 26 Tier IV
    (`governmentTierForDoctrineBand`). The offer is one Doctrine from each of the
    seat's two decks, then a third from either (`drawDoctrineOffer`; interim until
    the user rules the mix), never one already held. An empty bag opens nothing. An
    adoption brings only this offer, with no reward hand of Orders.
  - **Gates:** a row may carry a gate on the offer. `needsTendedWork` asks for a
    tended-work charter (`holdsTendedUnlock`), and `needsReligion` asks for a
    religion held when the offer opens (`heldReligions`, so a captured holy city
    counts). `doctrineBagFor` reads both, so the offer, `doctrineOfferCanOpen` and
    the bots agree. The gate binds the offer only, and the Compendium prints a
    "Needs" row off the field. A redraw is refused when a gate has emptied the bag
    (`rerollError`), because a seat can lose its holy city while an offer waits.
  - **The answer:** the seat takes one (`chooseDoctrine`) or passes
    (`skipDoctrineOffer`), and a waiting offer must be answered before another
    adoption.
  - **Moments and other offers:** an adoption is also a moment the cards pay on
    (`governmentAdopted`, paid by `payOccasionRiders` after the re-seating and the
    Triumph, before the Doctrine draw). A Doctrine offer outside an adoption (a
    wonder's grant, a commission's reward) opens through one helper,
    `openDoctrineOffer` (`cities.ts`), at the current government's tier.
- **`statecraft/evaluator.ts` is the ONLY module switching on `CardEffect.kind`.**
  A new card is a JSON row; a new *shape* is a design decision, and a shape
  declared but never read fails a register test. The eight ways to pay a voice
  are **one `pays` kind** with `where` (city · capital · hex · empire · route) ×
  `basis` (flat · count · mirror · share · rate). The four flag-rule kinds are one
  `rule` kind.
- **Commissions** (`src/sim/commissions.ts`, batch C of
  `docs/plans/deck-implementation.md`): an Order row with a `commission` field —
  a goal and a reward, usually no effects. A goal part is `counted` (a
  `TallyOccasion`, counted in the card's own `tallies` entry, so it grows only
  while seated and survives unseating and adoption) or `reached` (a
  `CommissionFigure` about the seat's own empire). The `commissions` phase, right
  after `periodicBoons`, pays a met seated commission through
  `payWindfallGrants` / the great-person draw, unseats it and records it in
  `PlayerStatecraft.commissionsFulfilled`; a fulfilled card stays held and can
  never be seated again. Private: nothing reads another empire. UI: the counter
  on the card face (`ui/goalCounter.ts`) and the chips under the empire panel
  (`ui/commissionRail.ts`).
  - The Brick Kilns and The Building Programme count a building when a town
    finishes it from its queue or buys it. Only seated cards count it. Wonders,
    the Magnum Opus and free building grants give no progress.
  - Since Dominion batch D6 a counted goal may have a floor (`minPopulation`,
    `minTownsTaken`, read off the moment's `TallyFacts`) and keeps the towns it
    counted on its tally row (`OrderTally.people`, `.wonders`, `.town`).
  - A reward may read what the goal counted (`fromGoal`), raise a building in
    the town that met it (`building`; the town is `commissionGoalTown`), grant
    citizens (`citizens`, to the capital or the smallest towns), or add
    Wildcard chairs for the rest of the game (`wildcardChairs`, kept on
    `PlayerStatecraft.chairsWon` and counted by `chairCount`).
  - Since Expansionist batch E5 a reward may also pay each town from its own
    figure (`eachTown`, `townFigure`; The Domesday Survey), mark the town that
    met the goal (`markTown`, written on `City.markedBy` by `markGoalTown`, read
    by the `markedBy` town scope; The Heartland), and hand over effects for
    the rest of the game (`lasting`, read by `liveEffects` from the fulfilled
    commissions, its thirteenth source). A reached goal may set a floor on each
    hex it counts (`hexYieldAtLeast`), and a goal one town meets names its town
    in `commissionGoalTown` (`oneTownWorkedHexes`, `bestTownFor`).
  - Since Dominion batch D11 a commission met is a moment (the
    `commissionMet` windfall occasion, paid after the reward through
    `payOccasionRiders`) and a count (`commissionsMet`, the length of
    `commissionsFulfilled`). Both count commissions of every deck. A counted
    goal may also floor the rank reached (`GoalFloor.rank`) or the work a great
    person laid (`GoalFloor.work`), read off `TallyFacts.rank` and
    `.improvement`. An `eachTown` reward with no `fromFigure` pays its `amount`
    flat to each town its `scope` admits. The `garrisonedTowns` figure counts
    the towns the `garrisoned` scope admits.
  - Since Devotion batch DV5 a `citiesAdmitted` goal may set `every`: it
    counts the admitted towns only while the scope admits every town the
    empire holds (Commission: The State Church).
  - Since Magisterial batch MG7 a goal may ask for a council in order (the
    `councilInOrder` figure: every Military, Economic and Civic chair holds a
    card that counts as its type, a malice's chair left out), and a reward may
    open a Doctrine offer (`doctrineOffer`). While no such offer can open, the
    commission waits in its chair (`commissionRewardWaits`).
  - Since Magisterial batch MG8 a goal may count the families of the
    great-person works on hexes the empire owns (the `workFamilies` figure,
    `workFamiliesHeld`): a Holy Site is the prophet's family, and who laid the
    work does not matter.
  - Since Magisterial batch MG9 a goal may count the great-person works one
    town works, among the towns that hold at least `wondersAtLeast` world
    wonders (the `oneTownWorksWorked` figure). `commissionGoalTown` names the
    first town in founding order that meets both floors (`worksTownFor`), so
    a `markTown` reward marks that town (Commission: The Ideal City).
  - Since Magisterial batch MG15 a goal may count the hexes beside one
    great-person work in the borders that carry a work or a tended work (the
    `worksBesideWork` figure). `commissionGoalHex` names the first such work
    in map order (`gardenWorkFor`), and a reward may give every unowned hex
    within a radius of it to the nearest town (`claimWithin`). The claim goes
    through `claimUnownedBeside` (`cities.ts`), The Landmark Bounds' routine,
    which now takes a radius (Commission: The Paradise Garden).
- **Units a card raises, and the moments it pays on** (Dominion batch D5):
  - A grant can raise the best melee unit (`bestMeleeFor`) or each military
    unit a technology unlocks, in the capital or in each town a scope admits.
    Every such unit is free of upkeep and comes through `realiseItem`, so it
    counts for the `unitGained` tally and pays the riders on gaining a unit.
  - An Order can raise units when it is drafted (`OrderDef.onDraft`,
    `raiseOnDraft`). `raiseFreeUnit` (`cities.ts`) is the one helper, and a
    founding rider can use it too. Since Magisterial batch MG6 an Order can
    also hand over a great person when it is drafted, through
    `grantGreatPersonOffer`: an offer, or the renown for the next one.
  - Since Magisterial batch MG14 an Order can pay yields when it is drafted
    (the `windfall` arm, The Grand Retrospective). Its windfall arms are
    composed once (`onDraftPayout`) and paid through `payWindfallGrants`. The
    Liturgies banks production in every owned town based on its own population
    before any town settles. The Learned Embassy reads the current empire
    science rate before the payment, then settles research as a windfall.
    A grant's count may name the hexes it counts (`GrantCount.tile`). An
    Order can also hand over a random card from a deck the seat does not
    hold (the `foreignCard` arm, The Cabinet of Curiosities;
    `drawForeignCard`, rarity first from `state.rng`, with no pity).
  - Drafting The Great Raising completes the front unit or ordinary building
    in each owned town. It skips puppets and permits towns in unrest. Units use
    purchase placement. Existing progress on the finished item is spent, and
    normal completion riders apply.
  - Every way a card enters the collection ends in `settleCardTaken`
    (`cities.ts`): what drafting it hands over, the law dropped for a
    charter, and the `cardDrafted` moment last. The pick of an Order hand
    and The Cabinet of Curiosities' card are its two callers.
  - Three moments with no figure of their own are paid by `payOccasionRiders`
    (`cities.ts`): an Order draft passed (`settleOrderSkip`), a town taken by
    force and razed (`razeCityAt`), and a great person gained
    (`settleGreatPersonChoice`). An attack from range was a fourth until
    batch DS2 removed it with the one card that paid on it. Batch R1 added a
    levy (`levyAt`) and faith spent (`spendFaith`), each with a fact the
    riders can scale by.
  - A grant can be paid once for each item a count finds (`perCount`), bank
    science toward the technology of a unit killed (`towardFallenTech`,
    `bankTowardTech`), or open a free Order draft (`freeDraft`,
    `openFreeDraft`) that moves neither the draft count nor the culture. A
    rider can fire at most once in a number of turns (`oncePerTurns`).
    Since Magisterial batch MG10 a rider can fire only when the Order hand on
    the moment cost culture (`paidHand`, read off the `handPrice` fact; The
    Second Sitting).
- **Economy rules and Double Time** (Dominion batch D7):
  - **The surplus moved** is step 14 of a town's yields (`explainSurplusMoved`,
    `yields/town.ts`): a card may move the town's food surplus, as the growth
    channel computes it (`channelSurplus`, `cities.ts`), into production while
    the town builds a row the card names, and `growthSurplus` then banks none
    of it. A deficit is never moved, and a town in unrest moves nothing.
  - A production percentage can join the **empire stage** (`stage: 'empire'`),
    so it multiplies what the town's own bonuses made (The Marian Reforms'
    25% reduction).
  - A hex test asks whether a **fortified military unit** of the empire stands
    on the hex (`fortifiedUnit`), answered through the context's `GroundFacts`;
    the `fortifiedUnits` count counts those units inside a town's borders. A write
    of `Unit.fortifiedTurns` moves the economy clock, in the writer or in its caller
    (`test/sim/slateRegister.test.ts`). An order to fortify and a step out of a
    trench move it only when the owner's law can read a trench (`lawReadsTrenches`).
  - **Disbanding a unit is a moment** (`disband`, paid in `applyDisbandUnit`):
    it carries the town the unit stood in and the unit's production cost, which
    a unit raised for free does not carry, and a rider can ask for that town
    (`inTown`).
  - **The harvest** (`harvestEnemyHexes`, run in the drill phase): a unit on a
    hex of an empire its owner is at war with yields its owner that hex's
    yields, through `payWindfallGrants`.
  - A camp near the towns of an empire whose law speeds it musters sooner
    (`campMuster`, `musterCamps`), and an empire's law can count its own war
    losses for less (`unitLossWeariness`, `townLossWeariness`, read in
    `wearinessBetween`).
  - **Double Time** (`turnEffectRepeats`): an Order's periodic boons, musters,
    drills and harvests happen twice; a Doctrine's do not (the user's ruling of
    2026-10-16). It was dealt in bands 2 and 3 (`OrderDef.lastBand`) until
    batch DS1 retired it. Since batch DS9 The Second Reading is the one dealt
    card with a last band (bands 0 and 1), and the deal
    still reads the field.
- **Shapes that came with Dominion's Doctrines.** `healWithin`, `rankWithin` and
  `noFounding` still work, but no dealt row uses them now.
  - A grant can heal every unit within some hexes of the moment's hex
    (`healWithin`) and raise each fighting unit one rank (`rankWithin`,
    through `raiseToRank`; an Elite gains nothing, and the rank pays
    `settleRanksEarned`). `rallyAround` in the evaluator does both.
  - A grant can hang timed effects on the unit that acted (`actorTimed`,
    written to `Unit.timed`); `pillageAt` is the one seam that does it today.
    A pillage carries the raider's own strength (`pieceStrength`, `combat.ts`).
  - Three behaviour rules: `noFounding` (refused in `foundingError`, and in
    `buildError` for any unit that founds cities, so buying follows),
    `noExperience` (asked in `ranks.ts` by the fight's award and by
    `canEarn`), and `siegeScreened` (refused by `screenError`, `combat.ts`,
    which the tint, the forecast and the reducer all ask).
  - The rule `unitCost` with a unit `class` is a line of `explainUnitCost`, so
    a purchase follows it.
  - A strength line can count the Elites beside a unit (`CombatScale.rank`)
    or the attacks the empire's units have already made this turn on the same
    target (`attacksOnTarget`, read off `Player.strikesThisTurn`, which
    `recordStrike` writes only for an empire whose law counts them). A town is
    one target whatever beat of the assault strikes it.
  - An upkeep surcharge can name a rank (`rank`), and a unit a `free` rebate
    covers pays no surcharge at all (`freeByLaw`).
  - An amplifier can raise a great general's aura (`generalAura`, read in
    `generalAuraLines`), and a hex row can take a share of everything the hex
    pays (`wholePercent`, the hex's last line; see `docs/yields.md`).
- **Five small automatic rules** (Dominion batch D12):
  - **The sight gate.** The three resource tile tests (`hasResource`,
    `resourceKind`, `resource`) answer only for a resource the asking empire
    can see. `GroundFacts.techs` carries the empire's technologies, so a card
    line on a hex, a count of hexes in borders and a scope over worked hexes
    never pay on copper, horses, camels, iron or niter before the technology
    that reveals it. A test with no ground facts reads the tile alone.
  - An amplifier can raise what a pillage pays (`pillageRewards`), narrowed to
    the raider's `class`: every yield of the raid, once, after the riders'
    percentages. A flat amplifier step can be paid once for each item a count
    finds (`perCount`, `max`, read by `cardAmplifierFlat`); the general's aura
    adds it before the share.
  - The `militaryGained` tally counts land military units gained, beside
    `unitGained`, which no card reads now.
  - The `rallyToGeneral` rule (`CardRuleEffect.range`, `cardRallyRange`) puts
    a unit gained beside the owner's great general nearest the town, if he
    stands within the range. `spawnTileFor` asks it first, so a built, bought
    or gifted unit rallies alike, on a hex that claims nothing.
- **Soldiers work hexes** (Dominion batch D13, The Limitanei): the
  `garrisonWorks` city rule (`CardRuleEffect.max`, `cardGarrisonSeats`) adds
  one seat to a town for each combat unit of its owner on the town's hex,
  ships included, up to the cap. `chooseCitizens` adds the seats to the
  citizens' seats, so the soldiers take the hexes after the citizens'. The
  extra hexes eat no food and count as worked hexes for every card. No new
  caller of `assignCitizens`: the seats change at the next assignment.
- **The three drafts and The Upstarts** (Dominion batches D14 and D15):
  - The `shoreRaid` behaviour rule (The Longships): in the `drill` phase,
    after the harvest, `raidFromTheSea` (`improvements.ts`) has each naval
    combat unit of a holder pillage the first enemy improvement on land beside
    it, through `pillageAt`. `cardShoreRaids` says how many hexes: one, or two
    under Double Time. The raids join `TurnReport.pillages`, so the victim's
    toast needs no new code.
  - A `unitStat` line can name `where: 'connectedTown'` (The Relay Stations):
    the unit stands in one of its owner's towns that the `connected` scope
    admits. `fullMovement` reads it, so the allowance refilled in
    `resetMovement` carries it.
  - The `opusSiege` behaviour rule (Circumvallation) is read in the *rival's*
    town: `explainOpusGate` (`yields/town.ts`), the second gate of step 13 in
    `docs/yields.md`, stops production while
    the town is `underSiege` and a holder that can lay a siege has a
    combat unit beside it (`cardOpusSiegeBy`). The town takes double siege damage. The line names the card, and
    the city panel prints it.
  - The `vsMoreTechs` combat condition (The Upstarts) mirrors `vsFewerTechs`
    through `knowsMoreTechs` (`rivals.ts`), and never holds against the wild.
- **Defer, never bend**: a card whose text needs a missing shape ships deferred
  and annotated, in player-plain prose. This rule repeats across beliefs,
  legacies, wonders and leaders.
- **The wager** (**`docs/wager.md`**, the live deck, sync-tested): three cards on
  the turn an age opens, drawn from three different lines, the same three for
  every seat. Each seat stakes one privately; all three bars are public on the
  Abacus. A bar is claimed the turn a seat first meets it — a wager is a bar, not
  a race. At the age's close a seat that staked and missed takes a **malice**: an
  Order with a bad face that takes the last chair of its own flavour, cannot be
  unslotted and survives adoption. Æra I deals nothing; the wager runs in II, III
  and IV.

## Religion and the clergy

Reference: **`docs/religion-v2.md`** (the machinery) and **`docs/beliefs.md`**
(every row, sync-tested) · code: `src/sim/religion.ts`.

- **Religion is a tide, not a verb.** A city's religion is derived (the faith
  more than half its citizens follow), never stored. `spreadReligion` measures
  every town against one board, then moves every town; `bankPressure` has exactly
  two callers, the tide and `pressLump`. `pressLump` has exactly four, pinned
  by source in `test/sim/religion.test.ts`: a proclamation (`proclaimAt`), a
  battle rider's lump (`payBattleRiders`, `combat.ts`; The Crusader Orders), a
  founding's lump (`foundCityAt`, `cities.ts`; The Parishes) and a conversion
  moment's lump (`drainConversions`, `religion.ts`; Pentecost). The last three
  hand a presser down to `payWindfallGrants`, because the evaluator may not
  import `religion.ts`.
- A founding draws one unused name. It prefers the pantheon’s axes, then uses
  the rest of the roster. The cap is ⌈2/3 × real players⌉.
- **The clergy**: the prophet (two charges; founding, a further holy site, or a
  belief takes both; a proclamation or an empire rite takes one), the apostle
  (two charges; proclaim, heal, place a relic), the inquisitor (purge, plus a
  standing adjacency aura). The **augur is retired** — a rite is a city's verb
  now. Charge prices are read in one place (`chargeCostOf(state, playerId,
  verb)`), spent in one, refused in one, printed by one. The price takes the
  empire because a card may set it (the `chargePrice` rule, read through
  `cardChargePrice`; Devotion batch DV7): under The Anchorites a further holy
  site costs one charge. Under The Abbeys (`apostlesPlantHolySites`) an
  apostle may raise a further holy site at the same price, for an empire that
  has founded a religion, and the unit sheet shows it the row while the rule
  holds.
- **Rites** are town actions paid for with faith. Each town has one place, or two with The Double Feast. Every live rite lasts ten base turns. The Octave adds 100%, the Chapel in the starting town adds 50%, and Chichen Itza adds 50%. These bonuses add before the game calculates the duration. A prophet can start a rite over the realm. The Rites Commonwealth also lets the capital start a realm rite. All towns use the capital’s duration. Each town credits the start and each subsequent tenth turn while the rite remains active. Only actual starts raise the faith price.
- The Votive Offering adds production equal to the town’s faith each turn. The Restoring of the Host heals friendly units within three hexes of its town each turn. The Vigil of Arms gives strength to friendly units in range when it starts. Consecration of the Bounds adds culture on resource hexes and speeds up border growth. The Rite of Plenty gives gold per citizen. The Night Watch gives science per citizen, the Rite of Naming gives food per citizen, and Hallowing adds faith on improved hexes.

- **The rite price** (batch R2a). A rite costs `rite.costBase` plus
  `rite.costPerRiteStarted` for each rite the empire has started
  (`Player.ritesStarted`, absent until the first). The research age does not
  set it. Only the initial start in each town raises the price. A realm rite
  charges the current price once and records one start in each town it reaches.
  `riteCostAhead` and `ritesAffordable` quote the rising price in the faith
  sheet. Every active rite credits its town and population again on each
  tenth turn it remains active. These later credits pay card riders and
  advance tallies without changing the price.
- **The faith's reach** (Devotion batch DV5).
  - The `found` occasion carries the citizens the new town is founded with,
    and a grant's `pressure` can be a share of the moment (`fromOccasion`).
    The Parishes presses one convert's price for each citizen, for each
    religion the founder is paid by, so the town follows from its first turn.
  - The behaviour rule `followersShareSight` (The Confessors) makes every town
    of another empire that follows your religion a sight source for you in
    `sightSources` (`visibility.ts`), at the base city sight. It is read
    whenever your visibility is recomputed.
- **A conversion as a moment** (Devotion batch DV6, feature F).
  - The windfall moment `townConverted` is paid to the empire a religion pays
    (`religionFounder`) each time a town it does not hold turns its majority
    to that religion. It carries the town (`townId`), its citizens
    (`population`), and `firsts` with `conversion` the first time the town
    turns to that empire's faith.
  - The moment is queued where the town turns (`noteFirstConversion`) and
    paid when the pressing ends (`drainConversions`): after the tide's sweep,
    or at the end of a lump that is a pressing of its own. The queue is paid
    in the order the towns turned. A lump paid at a moment (Pentecost) joins
    the same queue, so a town it turns is paid in its turn.
  - A town queues the moment at most once a turn for each religion, by an
    absolute turn stamp (`City.convertedOn`), so a chain always ends.
- **The interdict** (Devotion batch DV7). The behaviour rule `opusInterdict`
  (The Interdict) is `opusSiege`'s sibling at the same gate,
  `explainOpusGate`: a rival's town that follows a religion the holder is
  paid by makes no production while it builds a Magnum Opus
  (`cardOpusInterdictBy`). The siege names the line when both hold.
- **The two largest rule-breakers** (Devotion batch DV8).
  - The action rule `twoRites` (The Double Feast) gives each town of its
    holder two places for rites (`ritePlacesFor`, the one reading).
    `cityRites` lists the rites a town keeps, oldest first; `cityRite` stays
    the reading for "keeps any rite", so the `keepingRite` scope, the
    `citiesKeepingRite` count and The Festival Calendar do not pay twice.
    The rite gate refuses a rite the town already keeps, or a town with no
    free place. A prophet's rite over the realm takes a free place, or the
    place of the town's older rite (`ritesDisplacedBy`, which the rite
    preview reads too). With one place every rite is placed as before.
  - The behaviour rule `faithfulKillsConvert` (The Turning of Swords) is read
    in `applyCombat` beside Blood Brothers' `barbarianKillsConvert`. An
    enemy land soldier the holder's attack kills on land that a following
    town owns, outside a town, changes sides through `captureUnit` at full
    health (`cardTurningSides`). It is a capture: no kill or death riders and
    no kill or loss tallies, but the loser's war record counts it. At most
    once a turn for each card (`PlayerStatecraft.sidesTurned`, an absolute
    stamp).
- Who is paid: the pantheon pays the empire that consecrated it; **follower**
  beliefs pay city-locally to whoever owns each following city (a rival's faith
  in your town is a gift); **founder-side** pay follows the holy site's stones;
  **enhancers** bend the tide itself.
- Four follower beliefs open a **faith house** — bought with faith, never built,
  only in a city that follows. They carry the belief keyword **Faith house**
  (batch B1): `beliefKeyword` (`religionData.ts`) reads it off the belief's
  data (an effect unlocking a row `isFaithHouse` answers yes for, read off
  `purchaseOnly`, `purchase.currency` and `followingOnly`), `describeCard`
  prints it first, `CARD_KEYWORD_ENTRIES` gives it the Order keywords' tooltip
  on hover and focus, and `concept:faithHouse` is its Concepts page. The
  belief's own sentence then says only what it opens and what the house gives.
- **The belief update** (batch B1, schema 241,
  `docs/plans/belief-update-2026-11-10.md`). Fourteen gods, four follower and
  four enhancer beliefs pay something new, and the Gurdwara and the Dar-e Mehr
  changed; Patron of Merchants, The Muses and The Alms Box joined. Theocratic Mandate and the consecration The Green Cathedral are
  withdrawn (`retired`, rows kept; the cathedral rolls from
  `LIVE_CONSECRATION_IDS`). Feast Days is held: no shape adds a flat number of
  rite turns in one town. The `periodicOffer` shape and the `founderTrickle`
  amplifier target lost their last rows and are removed, so the religion phase
  is the faith ladder alone (`openFaithLadder`). A purchase rider on a town's
  own cards (The Alms Box) is read when the price is asked in that town
  (`cardPurchaseRiders`). The game prints a belief through `describeCard`,
  never through its `text`; the rites' texts are printed on the city screen's
  rite rows.
- A **reroll** is one verb over four hands and two ladders: an Order hand costs
  faith on a rising ladder, a Doctrine or great-person hand costs twice that on
  the same ladder, and a belief hand is free the first time. `rerollError` is
  the one refusal. A card may forbid the reroll of an Order hand
  (`noOrderReroll`, Magisterial batch MG6).

## Great people, renown, legacies, Triumphs

Reference: **`docs/great-people.md`** (generated roster, sync-tested).

- **Called, never built or bought.** Renown is one pool, banked in exactly one
  place (`settleRenownWindfall`) and explained as one list. The ladder is
  `floor(75 + 58n + n^2.65)` — the draft ladder's arithmetic, one currency over.
  The linear term is 58 since batch GP1 of 2026-11-12 (it was 180).
- The draw is **weighted and never restricted**: every name of the age is in the
  bag, each family weighted by its share of where the empire's renown came from.
  Names are world-shared and consumed on the pick. The draw spills
  `[age, previous…, next…]`. A spent roster banks rather than blocks.
- **The Renown tab** (batch GP1 of 2026-11-12): the renown figure's hover card
  and the Reliquary show each family's chance for the next offer
  (`greatPersonOdds`, worked out from `greatPersonBag`, the bag the draw reads)
  and the ages in the bag. The renown ledger prints one line for each town
  (`explainRenownByTown`, `src/ui/renownTab.ts`); on the Reliquary the line
  opens to the town's sources.
- A person arrives with **one charge** and two verbs: the **act** pays now
  (aged by `actPerTech`, or quoted in turns of the empire's own rate), the
  **work** plants an improvement for good and **opens the seam it covers**.
  Either spends the piece and leaves the **legacy**.
- Legacies are ordinary card effects, `liveEffects`' sixth source. **Revocation
  is marking, never deleting.** Since Magisterial batch MG8 the meta rule
  `legaciesCountTwice` (The Immortals) pushes each live legacy a second time at
  that source, read off the effects already walked (`metaReadings`). The
  counts of people and families do not change.
- Since Magisterial batch MG8, spending a person is a moment the cards pay on
  (`greatPersonSpent`). `spendGreatPerson` pays it once for each person, for
  an act or a work, at the capital, with the work as a fact, after the legacy,
  the tally and the piece's removal. A rider can pay only while one of the
  empire's towns raises the Magnum Opus (`whileRaisingOpus`, The Last
  Commission).
- Since Magisterial batch MG9 the work-laid moment (`improvementBuilt`, paid by
  `payWorkLaidRiders` for a worker's build and a great person's work) carries
  its hex when the row now stands on it, so a rider's tile test can ask for a
  great-person work there. A grant can give the unowned hexes beside the
  moment's hex to the nearest town (`claimBeside`, `claimUnownedBeside` in
  `cities.ts`, entry 32 of the register of mid-turn yield changes; The
  Landmark Bounds). A combat line can ask for a piece standing on a
  great-person work, whoever owns it (`standingOnWork`; The Custodians).
- Since Magisterial batch MG13 the action rule `actThenWork` (The Universal
  Genius) is read in `greatPersonActAt` as the person acts. While it holds,
  the act pays and the piece stays on the board, marked `Unit.acted`.
  `greatPersonActError` refuses a marked piece a second act, and the work
  spends it, even after the card has left its chair. So the legacy, the
  `greatPersonSpent` tally and the moment still come once, at the work.
- Three card clauses buy a great person (`OFFER_PURCHASES`), all issued from the
  Reliquary's rail.
- **Triumphs**: `Player.triumphs` is append-only and turn-stamped, read by
  diffing. `triumphs.ts` owns the only trigger switch — announced occasions
  against standing counts. `state.contested` keys `(id, age)`, first by log order.

## Trade routes and luxuries

Reference: **`docs/trade.md`** and **`docs/luxuries.md`**.

- A trader is its own stacking-free category, **neither built nor bought**: a
  caravan is hired with the route (`buyRoute`), and `Unit.trade` presence IS the
  route — there is no route register. A cart survives its route and is re-sent
  before a new one is hired. A cart is never asked for orders.
- **The hire price** is `rules.trade.routePriceBase` (75 gold) plus
  `rules.trade.routePricePerRunningRoute` (15 gold) for each route the seat has
  running, then a card's rider (The Turnpike Trusts) as its own line
  (`explainRoutePrice`, batch TR2). An idle cart is not a running route. The
  price no longer follows the Trader row's production cost.
- **A route has no term** (batch TR2). It runs until its owner cancels it, or
  a war, a plunder, a lost town or a ban ends it. There is no renewal and no
  auto-resend. **A cancel waits for the first arrival**: `cancelRouteError`
  refuses it until the caravan has reached its destination once
  (`TradeRoute.reached`, written by `marchOneTrader`; `routeReached` reads it).
  A cancelled route leaves its cart idle. Adopting The Sea Ban or The Inward
  Roads ends the seat's routes abroad at once (`endRoutesBannedAbroad`).
  Commercial posts keep their twenty turns under `rules.trade.postEstablishTurns`.
- A route is **entirely land or entirely sea**, never mixed; the mode narrows the
  survey. A sea route pays a premium and lays no road.
- What a route pays is read off the **origin's** buildings and paid to the
  **destination**, derived fresh each turn. International routes pay the sender
  flats and the host a gold line; a card's route row may name the **crossing**
  (domestic or international). Route slots fold over building `routeSlots`.
  The figures are flat: the Market and the Lighthouse give 1 each and the
  Caravanserai gives 3, and no building's slots grow with its town.
- **Roads**: `Tile.road = builderId`, written only by `layRoad`. Maintenance is
  charged only on roads this empire's traders laid, excluding city centers. City connections are a road
  path from centre to capital.
- **A luxury's signature is a list** on its row read by ONE evaluator
  (`resourceEffects.ts`). A luxury counts once per kind, not per tile — silver
  and gold break this deliberately in Æra III. Most luxuries have two tiers, the
  second gated on `fromAge: 3`; a locked tier is still shown.
- **Access is `openedResource`**, four clauses in precedence: the reveal tech
  (which binds improvement, city AND yield), a great person's work, the
  improvement, then a city on the seam. A resource pays only an empire that can
  name it.
- **A road abroad lends no luxury** since batch TT1. The Silk Road's loan, its
  gold on foreign routes, and the Trade screen's loan lines and "New luxuries"
  group are gone with the `routesImportLuxuries` rule. The one loan left is The
  Capitulations' (`postsLendLuxuries`): each foreign town holding the seat's
  paying post lends one kind it holds improved, at
  `rules.trade.importedLuxuryPercent` of a dug seam's pay (`luxuryLoans`,
  `resourceEffects.ts`). The figure is 100 since batch DS4, so a loan pays as
  one copy does.
- **The meters after batch TT1.** Every founded town costs 3 authority, on the
  coast or inland (`rules.meters.authority.coastalCity` is gone). The Civil
  Service, the Assize Court, The Examination Court and The Post Station give no
  authority, and Gracia Mendes Nasi gives 3 (5 after TT1, 3 since batch GP1
  of 2026-11-12). Satrapies and The Civil Service
  give no happiness, and the Public Bath gives 1 in its town while the town is
  joined to the capital. Each different luxury still gives 4 happiness, and
  both reward steps for spare happiness stay.

## Leaders

The sixteen leaders and their deck pairs are listed in `docs/leaders.md`. Each
leader has two abilities, one unique unit and one unique building or improvement.
Pachacuti has the Terraces and Cyrus has the Paradise Garden. Eight retired
leaders remain available to load from an older game configuration. The
abilities are ordinary card
effects, live for the seat from the turn it sits down and for the rest of the
game — `liveEffects`' twelfth source, folded and described by the machinery that
folds a doctrine's. The uniques are ordinary roster rows carrying
`unlockedByLeader`, opened by `isUnlocked` for the one seat whose sheet names
them and only once the row's **own technology** has arrived; a row nobody names
is a bench. An improvement unique is the same two questions asked one table over
(`leaderOpensImprovement` + the row's `requiresTech`, through
`improvementLeaderError`), since a work of the ground is not a queue row; a
variant improvement may carry `countsAs`, which is what makes a terrace a farm
wherever the rules read a farm. There is no draft, no offer and no age machinery — the first cut's
deck of twelve cards a figure retired in batch L6a. Leaders also carry **start
biases** (three stages, `startPositions.ts`), a list of **city names**, a pair of
**colours** the board wears and a **people** word ("Inca", "French") for the
sentences that want a nation; all four are tables in `docs/leaders.md`, mirrored
in `data/leaders.json` and held together by sync tests. A seat is **called by its
figure everywhere** — see the surfaces section's `seatName` / `seatPeople` note.

## Barbarians

The wild is a real seat, appended **last** (`seatBarbarians` extends all three
parallel arrays); `realPlayers(state)` is the register of "who counts" for
victory, elimination, meters, blockers and rosters. Camps live in
`GameState.camps`, not on the map. Roles derive per turn. The wild never captures
a city and never captures a unit, and it wears the war-red rim like any enemy.

Camps (batch BR1, `src/sim/barbarians.ts`; the numbers are `rules.barbarians`):

- Camps are founded from `firstCampTurn` (6), `campsPerSpawn` (3) at a time,
  every `campEveryTurns` (3) turns, up to `maxCamps` (24). So the first four
  founding turns are 6, 9, 12 and 15. The cadence was every two turns until
  2026-11-22 (the user: "oh i didn't realize camp sapwns were so quick", then
  "let's make it every 3 turns").
- A new camp starts with one unit (`campStartUnitsMin` and
  `campStartUnitsMax` are both 1 since 2026-11-22; a wider range is a roll on
  `state.rng` made right after `foundCamps` places it). The first unit stands on the camp and digs in. The band does not
  move on the turn it appears: `barbarianTurn` takes its list of units that may
  act before it founds camps.
- Each soldier has one of five jobs, derived each turn by `barbarianRoles` and
  never stored, in this order: escort, warden, guard, thief, raider.
- A camp keeps `maxUnitsPerCamp` (2) guards: the warden on the camp hex and a
  guard, the next nearest soldier within `campUnitRadius`. A guard fights what
  comes near and patrols, and never goes farther from the camp than
  `campUnitRadius`.
- Every other soldier is a raider. It fights an adjacent soldier first.
  Before attacking a city, it selects the visible enemy improvement that it
  can reach this turn for the least movement. The lower tile index breaks a
  tie. If the march uses its last movement, it can pillage on a later turn.
  Otherwise it closes on a visible target within `aggressionRadius`, or
  marches on the nearest town it can reach over land (`raidGoal`).
  The wild leaves a seat with `barbariansPassive` out of its target list.
- **A camp's reach** (the user's ruling of 2026-11-22: "Lets give camps a
  maximum radius of 8 that it will attack"). A raider or a thief chooses a
  town, an improvement or a unit only if it stands within `campAttackRadius`
  (8) of the soldier's camp, and its walks stay inside that circle
  (`campReach`). An adjacent soldier must be inside the circle too. A raider
  with nothing in reach drifts round its camp, within `wanderRadius`. The
  warden and the guards stay closer than that already, so the radius is the
  outer limit of a camp's attacks.
  - A unit's camp is derived each turn, never stored: the nearest camp, if it
    stands within `campAttackRadius` of the unit.
  - A unit with no camp that near (a rebel raised by unrest, or a raider whose
    camp was burnt with no other camp near) has its circle centred on itself.
    It attacks only what is within `campAttackRadius` of where it stands, walks
    without a circle, and with nothing in reach drifts toward the nearest camp.
- A camp musters every `unitEveryTurns` (5) turns, counted from its own
  `foundedTurn`. A camp short of guards musters a guard. A camp with all its
  guards musters a raider, but only while the world holds fewer than
  `raidersPerCamp` raiders for each camp (thieves and escorts count). The
  counts come from the roles (`campCensus`).
- **The muster is a coin** (the user's ruling of 2026-11-22: "spawn a new unit
  with 50% likelihood"). A camp that would train a unit at its muster trains it
  only if `nextInt(state.rng, 0, 100)` is below `musterChancePercent` (50). The
  die is thrown last, after the camp is found due, not full, able to field a
  unit type, and not boxed in, so a camp that would train nothing throws no
  die. At 100 or 0 no die is thrown. A camp gains a unit about every ten turns.
- Difficulty tier 3's wave (`foundAgeCloseCamps`) still raises two units a
  camp. The coin does not touch a new camp's band, and the wave's camps then
  muster and raid by the rules above.

## The endgame

Reference: **`docs/beads.md`** (the model) and **`docs/wager.md`** (how a bead is
earned).

- **A bead comes from a wager kept or from a grant, and from nothing else.** The
  old deeds — feats, endeavours, quests, reckonings — are retired rows with their
  bodies kept for the Compendium.
- Beads are the **door**: `rules.threshold` (7) is what an empire must hold before
  `buildError` lets it begin the **Magnum Opus**. `opusOpen(state)` is derived
  (any real player holds Alchemy) — no stored flag.
- The Opus's completion mints the **golden bead**, closes the age, and
  `winnerId` = **the empire that raised it**. Beads gate the door; the finished
  work decides the game.
- **The Opus close** (`src/ui/opusClose.ts`) is what every seat sees then. It
  opens on the **ending page**: one painting over the whole window
  (`endings/win.jpg` for the seat that closed the work, `endings/loss.jpg` for
  the others; `src/ui/endingPaintings.ts`), with the sun or the moon, "The
  Great Work is closed", the winner's name with "wins", and one sentence (the
  standings' own line, `victoryHead`, with the verb "closed"). If the painting
  does not load, the page shows deep lapis (a win) or the dark cloth (a loss)
  behind the same words. The page waits for one of three doors:
  - "See the Abacus" (Enter or Space): the Abacus page, where the golden bead
    lights on the winner's rod and slides home; then the standings rise.
  - "Look at the board" (Escape): the close comes down and the game goes on.
  - "Back to the title": the standings' own path to the landing.

## The bots

Reference: **`docs/bot-priorities.md`** — the spec of record. Code: `src/ai/`.

The combat experiments are on `codex/bot-combat-262` and
`codex/bot-combat-target-262`. The
[combat comparison](audit/bot-combat-results-2026-11-22.md) and
[counter-risk review](audit/bot-counter-risk-2026-11-22.md) record its games,
checks and limits. The [planned-attack review](audit/bot-combat-targets-2026-11-22.md)
checks attacks whose defender, health or strength changed before execution.
Combat quality includes defense, safe positions and
civilian protection. Capture totals alone do not decide whether it is better.
The experimental combat policy has not been put on port 5199.

The next design is a shared tactical evaluator for attack, movement and holding.
The [combat research and plan](audit/bot-combat-research-2026-11-23.md) compares
primary sources with the current code and specifies bounded group planning.
It is not yet an enabled policy.

The bot prices things before it picks them. Each turn it builds a **want book**
(`wants.ts`): one entry per thing a currency could be spent on, each carrying its
cost, its worth (the fold of the simulation's own explainers) and its delay. From
that book it derives a **shadow price** per currency and per constraint, clamped
to a band around the age-banded prior in `data/ai.json`. Long-term goals are
**chains** priced as `payoff_rate × max(0, H − delay) + lumps − Σ invest × price`;
a chain is kept greedily and a challenger must beat it by a switching margin, so
commitment emerges from sunk-cost exclusion and **no goal state is stored**.
Short-term arms keep local scoring and feel the system only through prices.
**Personas** are sparse overrides of the same sheet. Everything prints: every
chain, price and term lands in the candidates' folds, and the fold IS the
computation. **The bot is not a balance instrument** — playtest is the judge; the
arena is for regressions and floors.

**War is its own policy** (`diplomacy.ts` + `campaign.ts`, spec
`docs/war-diplomacy.md` §13–14): a declaration weighs the **fielded** army ratio
— what is spare of the garrisons — against a persona bar, a town in reach, a
strike force, a road, and what the expedition would cost at the walls; a second
war costs a higher bar and a target everybody is already fighting is read at the
army it raised. A war is then fought by a column that masses at a muster before
it pushes, blows that must be favourable (a melee piece never walks into a wall
at a loss — the bows go first), and hurt pieces that walk home. It ends on the
warscore or on **this war's own exchange** — what it has cost against what it has
taken. `warLedger.ts` reads recent, opponent-specific unit and town losses
from the saved weariness records. Every
peace decision also weighs the seat's own **war weariness** (batch WC2,
`explainPeaceScore`: the warscore less `war.wearinessWeight` a point of
happiness it costs, and `war.unhappyWearinessWeight` more for the part below
nought), so a weary seat sues sooner, signs sooner and pays more to stop. The
enemy's weariness never counts, so a winner is never harder to make peace with,
and the warscore itself (which also decides whether a seat campaigns) is
unchanged. A **wounded veteran** (batch WC3: a ranked piece below
`military.veteranCautionBelow` of its health) refuses a blow that is not
decisive when the counter could kill it or the blow deals no more than it
takes, whatever the seat's appetite or the siege appetite says.

**The citizen levy** (the bot levy batch, 2026-10-23). A seat whose seated
cards grant a levy spends a citizen when the levy is worth more than the
citizen (`levyDecision`, `bot.ts`). One reading prices a levy for the decision
and for the cards (`explainCitizenLevy`, `value.ts`):

- what the citizen buys: hammers or beakers, the hammers of a piece the seat
  wants now (a soldier while the army or a garrison is short, a worker while a
  town is raising one, a settler while the next town waits on one), or a rite
  (`bestLevyRite`: one town's blessing times the towns with a free place for it,
  less what the rise in the rite price costs the next rite);
- less the citizen: the food it took to grow it, a small town's premium and,
  taken off, the contentment it stops demanding while the town grows it back;
- plus what the seated cards add to a levy.

The levy cards are priced on the levy rate the seat expects (`levyOutlook`,
knobs `score.citizenLevy`). A seat holding Veteran Colonies retires a soldier
in one of its towns for the citizen, but only while its army stands over what
it wants by a whole soldier and it is at peace (`retireCommand`).

**Routes** (batch TR2, 2026-11-10). A route has no term, so the bot's renewal
arm (Commerce batch T8) and its knob `score.routeLapseMultiple` are gone. The
bot hires a route at the simulation's price (`routePrice`, through `reachOf`),
re-sends an idle cart through the `idleTrader` blocker, and never cancels a
route.

**The apostle's holy sites** (Devotion batch DV9). Under The Abbeys
(`apostlesPlantHolySites`), a bot apostle that cannot leave its relic plants a
further holy site where `plantHolySiteError` allows it, in a town that has no
site yet (`apostleCommand`, `bot.ts`).

## The surfaces

Eight root pages, all named in `vite.config.ts` inputs:

| page | what it is |
|---|---|
| `index.html` | the game |
| `spectate.html` | the bot spectator — every decision with the appraisal's own terms |
| `arena.html` | five headless games, a worker each, averaged per seat; the whole of `data/ai.json` as a **generated** panel (a new knob appears with no page edit, and nothing on that page may name a knob) |
| `compendium.html` | every entry generated from data rows and the sim's own describers; stable `kind:id` anchors; also mounts as the in-game "?" |
| `mapgen.html` | the generator's experimental loop, every tunable live |
| `pieces.html` · `flair.html` | the piece gallery and every drawn mark with live sliders (**a new visual asset joins `flair.html` in the pass that ships it**) |
| `abacus.html` | the bead rods; `?stage=bead`, `screen` or `close` mounts the game's bead page, Abacus screen or Opus close (`&ending=loss` for the loss, `&painting=missing` for the page without its painting, `&hold=1` for the Abacus page held after the bead lands), and `?abacusPlaces=8` cuts 8 places on a rod (look-dev only) |

- `src/render3d/` is the default renderer (Three.js ortho toon diorama,
  procedural primitives only; tunables in `data/view3d.json`). `src/render/` is
  FROZEN 2D — it must keep compiling and gains no features.
- **Fog under the painted look is three pictures, never three opacities**
  (`docs/plans/painted-fog-study.md`, `docs/flags.md` (zzzz)): uncharted ground
  is the chart table — a lit paper plane at the ground datum that takes the
  explored relief's cast shadows and rules its own hexes, and takes the sun's
  shadow but **not its colour**; remembered ground keeps full pigment and full
  geometry and sits in shadow; watched ground is untouched. Ink is discrete (the
  discard reads the nearest-filtered vision channel, so the frontier is a whole
  hex), light is continuous (a second, linearly filtered field, doubled in x so
  the filter blends hexes that are actually neighbours). A register change is
  therefore a **light-texture write** — no geometry, no rebake — and the reveal
  eases over `painted.fog.revealMs` off an absolute stamp, never a countdown.
- **The land has two meshes, switched by zoom** (the ground paint texture,
  `src/render3d/groundPaint.js`; `docs/plans/ground-paint-texture-2026-11-18.md`).
  The cut land has every brush patch cut into its triangles; it is drawn at the
  closer zooms, picked by the pointer and cast into the static sun's shadow. The
  plain land is the same hex grid and hill mounds with no patch cut in; it reads
  its paint from one texture over the map, baked on the page from the cut land's
  colours a little each frame after the board's first frame, and is drawn below
  `painted.groundTexture.nearPixels` pixels a hex (kept up to `farPixels`). It
  takes the place of the old far land. The texture holds only paint that never
  changes, so play bakes nothing again: towns, works, borders, roads, rivers and
  fog are geometry, vertex colour or their own layers on both lands. The density
  falls to fit the GPU and `budgetMiB`, and the band falls with it; if the band
  could not cover the far detail band (`painted.lod`), the board keeps the old
  far land. `painted.groundTexture.enabled: false` puts the old far land back.
- **The tile pick reads the ground** (`docs/flags.md` (hhhhhh), R5): the hex
  under the cursor is the hex whose *ground* the cursor points at.
  `installPaintedSurface` (`src/render3d/paintedSurface.ts`) registers the
  board's ground meshes alone and refuses every `paintedPickOnly` prop — a
  summit, a saddle, a foothill's shoulder or talus — so nothing standing on a
  plate can answer for the hex behind it or for the hill it stands on. Units
  keep their own pick (`unitModelPicking.ts`), where a peak still occludes a
  piece hidden behind it and a piece whose head shows is a target. Pinned in
  `test/render/tilePickGround.test.ts` on the shipped sculpts: the
  six-neighbour table at both zooms, the face coverage, the source.
- `src/ui/` is the DOM UI; `controls.ts` drives renderers only through the
  `MapView` interface. A full-screen sheet builds on `modalShell.ts`. Per-game
  screens push their window listeners into `gameDisposers`. Restart and loading
  another game reuse the booted UI: close its screens and clear pending dialogs
  and turn timers, but keep their listeners. Dispose only before replacing the
  screen instances. Statecraft's × and Escape must still work on the first visit
  after Restart, including when leaving commits an Order.
- **The screen registry** (`src/ui/screenRegistry.ts`, batch UX2) decides what
  closes when something opens. Every surface registers once in `main.ts` as a
  card (the HUD's small cards), a screen (anything that covers the window) or
  news (an offer, a Triumph or a bead, the confirm card, the spend ceremony), and
  its open hook calls `screens.opening(name)`. Opening a card or a screen closes
  every other card and screen; raising news closes only the cards; `closeAll` is
  Escape's first layer and the sweep for the title screen and a loaded game; and
  an open screen or news blocks the board's keys. A new surface joins by
  registering, and `test/ui/screenRegistry.test.ts` fails a module built on the
  sheet frame that `main.ts` builds without registering it.
- **The HUD** (batches UX1 and UX3, `docs/plans/hud-empire-panel-spec.md` §2
  to §7). The top bar, left to right: the six yields (each opens the Ledger on
  its own yield, culture included); one meters chip, happiness and authority,
  each half its own button and breakdown card; the turn line in the middle ("Turn 91 ·
  Æra II · 9 left", the age card on hover); the seat strip in hot-seat play
  only; three labelled tabs — Diplomacy (`W`), Trade with the routes figure
  (`E`), and Standings, whose renown figure opens the Reliquary and bead figure
  the Bead Race; then ? and ☰. Below about 1200 px the tabs keep their marks and
  figures and drop their printed names. The Compendium opens from ☰ and the ?
  card, the Abacus from the standings sheet and `A`. The Lens and the chronicle
  (❧) are two small buttons left of End Turn, their cards opening above them.
  End Turn (batch UX4, `ui/endTurnList.ts`) keeps one width and names the first
  thing the turn is waiting on; a vermilion badge counts the rest, and hovering
  or focusing it lists everything (`allBlockers` in `ui/turnBlockers.ts`, which
  walks `firstBlocker`'s clauses in its order), each row going where a press
  would. The last blocker is **"Renew rites"** (batch RT1, `docs/flags.md`
  (jjjjjjj)): a rite in one of the seat's towns ended at the last turn change
  (`ritesEndedAt` in `religion.ts`; a rite that acts at once never counts, nor
  a town that has started another rite). A press opens the faith screen on its
  Rites tab with that town in view (`openRitesFor`). Closing the faith screen
  answers it for the rest of the turn, whether or not a rite was started:
  `controls.noteFaithScreenClosed` keeps the turn per seat, as view state, and
  passes it as `faithClosedOnTurn`. It is true only on the turn after the rite
  ends, so it never comes back for the same expiry. The bot passes it
  (`answerBlocker` answers `null`), and no rite renews by itself.
  Top-left, the **empire panel** (`ui/empireDrawer.ts`): one button with the
  seat's banner, a research bar and a draft-meter bar with their turns, and a red
  dot on the banner while a card, a charter, a belief or a strategic resource
  with none spare is waiting. Its **drawer** opens to the right. Resting the
  pointer on the panel for 200 ms, or tabbing onto it, opens depth one: the
  research section (opens the star chart; it keeps the old research card's ids,
  which `techTree.ts` still writes) and the culture section (opens Statecraft).
  A click, a tap, Enter or `Q` pins depth two, which adds Faith (`H`), Leader
  (`L`), the age wager and the Supply counts (spare of held, vermilion when none
  is spare; each opens its Compendium entry). A pinned drawer is a card in the
  screen registry; a peek tells the registry nothing. The commission chips sit
  under the panel, at most four (three on a window under 720 px tall) and then
  "+N more". The dock, the research card and the always-visible resources card
  are gone. `topBar.ts` fills the bar; the comment at the head of the HUD in
  `index.html` lists every surface.
- **The build stamp and Report a problem** (beta checklist row 10). The game
  menu (☰) prints the build under the map and the seed: Build is the short git
  commit, which `vite.config.ts` reads once per build into `__APP_COMMIT__`
  ("dev" when git cannot be asked), and Saves is `SCHEMA_VERSION`
  (`src/ui/buildStamp.ts`). The menu's "Report a problem…" opens a sheet on
  the modal shell (`src/ui/problemReport.ts`) with one note field and two
  buttons. Nothing is sent anywhere.
  - **Save report file** gives one file,
    `magister-ludi-report-<date>-turn<N>.json`: the note, the stamp, the time,
    the user agent and window size, the turn, seat, leader and decks, what was
    on screen (the open surfaces, the last surfaces opened from the screen
    registry's `recent`, the open city, the selected unit, the lens), the last
    uncaught errors (`src/ui/errorLog.ts`: the window's `error` and
    `unhandledrejection` events, never a `console` wrapper) and the save in
    Export's own form. The moment is taken when the sheet opens; the save is
    turned into text in an idle callback, and the button then shows the size.
  - **Copy summary** puts a few plain lines on the clipboard, and selects them
    in a text box where the browser refuses.
  - **A report opens like a save**: `readSaveEnvelope` (`saves.ts`) reads a
    file whose `kind` is `magister-ludi-report` as the save inside it, so Load,
    then Import a file, replays it. No keyboard shortcut: the board's letter
    keys are blocked while a sheet is up, and no free key was obvious.
- **The landing is three screens and one element** (batch L7, `docs/flags.md`
  (yyyy); the mockup is `mockups/new-game-flow.html`): `data-step` on `#landing`
  is the whole of the screen state: **title**, **world** (the mode switch, the
  map card, a mono summary strip) and **civ** (the roster of figures and the
  detail card, with Begin). Nothing routes and no field is rebuilt between
  steps, which is what keeps `currentConfig` byte-identical for the same
  choices. The step walk, the breadcrumbs, the summary and the keys are
  `src/ui/landingFlow.ts`.
- **The difficulty tier on the interface** (`src/ui/difficultyTier.ts`,
  2026-11-22; the rules are "Beta difficulty" at the top of this file):
  - **The chooser** is on the world step, under the two columns. It is a radio
    group with one numbered step for each tier, from 0 to the top tier in
    `data/difficulty.json` (`TOP_TIER`). Tier 0 is the default and is named
    "Normal". The arrow keys move the tier, and Home and End go to the ends.
  - **The rule list** under the steps shows every rule in force, one line
    each, lowest tier first. The chosen tier's own rule is marked "new". The
    list has a fixed height and scrolls inside itself, so the card keeps its
    size. At tier 0 it holds one line, "No added rules."
  - **The words** are `RULE_WORDS`: one sentence for each data row, with every
    number read from the row. The data has no player-facing line. A row with
    no sentence shows its key in plain words, and the test fails until it has
    one.
  - **The config.** `currentConfig` spreads `tierConfig(tier)`. Tier 0 writes
    no key, so the default game's config did not change.
  - **The memory.** `readTier`/`writeTier` keep the last tier under the key
    `magisterludi:tier:v1`, in the save storage handle the tutorial uses.
    Restart and "Back to the title" show the same landing, so the chooser
    keeps its tier.
  - **In a game**, every surface reads the state (`tierOf(state)`, where a
    missing tier is 0): the game menu's Difficulty row and its rule list, the
    line "played on" on the Standings and on the Opus close's ending page
    (`playedOnLine`, no line at tier 0), and the problem report (`game.tier`
    in the file, "Difficulty:" in the summary). The menu's list uses the short
    form of each rule (`RULE_SHORT`), one line each, and a press on a row
    opens the full sentence. A row of the Load sheet adds
    "tier N" above tier 0 (`slotSummary`), from the save's label.
  - `test/ui/difficultyTier.test.ts` holds the list against the data.
- **The title step** is frame a8 of the Quiet Table boards (approved
  2026-11-19, `docs/plans/ui-critique-2026-10-16.md`):
  - the painting across the full width of the window, with "Magister Ludi" on
    its sky, a small ornament and the tag line "a game for the ages";
  - the lapis ribbon as the seam (`plateRibbonNode('seam')`, the thin form of
    the plates' ribbon in `src/ui/plateRibbon.ts`);
  - on the paper: one row of plain buttons (New game is the primary, then
    Continue, Load a game, Compendium), the line "Multiplayer and settings
    come later", and the panel of recent worlds (`recentWorlds`, the newest
    four saves, each a leader and a turn; a row loads that world).
  - Its keys are Enter (Continue), N, L and ?. The buttons print N, L and ?.
  - `src/ui/titlePainting.ts` chooses the picture and owns the step's
    stylesheet (`src/ui/titleScreen.css`). The title painting is
    `public/art/splash/title/title.jpg`, listed in `TITLE_PAINTINGS` and
    synced to the folder by a test. Until it exists, the page shows a
    stand-in, the painted town of the earlier banner (`TITLE_STAND_IN`). If no
    picture loads, `data-title-art` on `#landing` becomes `banner` and the
    page shows the earlier banner (`.marquee-poster`) over the same buttons.
  - The flair gallery shows it (`flair.html#title-screen`).
- **A seat is called by its figure** (`docs/flags.md` (ppppp)): `seatName(state,
  id)` and `seatPeople(state, id)` (`src/sim/leaderData.ts`) are the one reading
  — the figure's name where a seat sits under one, the ink's name where it does
  not, and the country word (`LeaderDef.people`) for the sentences that want a
  nation ("at war with the Inca"). Every surface asks the reading and nothing
  prints `Player.name`, which stays what the config wrote — the two stated
  exceptions, both deliberate, are the setup screen's colour swatches and the
  save shelf's own label. Pinned by a source sweep,
  `test/ui/seatNames.test.ts`.
- **The settler lens recommends sites.** With a settler in hand — and in no
  other lens — the top `ui.recommendedSites` hexes of `readSites` wear a staked
  pennant from the tile atlas (`src/art/settleMarks.ts`), never on ground the
  rules refuse a city on and never on a hex the fog view has not charted; the
  sticky info card's Recommended row says why in plain words, out of the same
  reading. Clicking one does nothing a click on the hex would not.
- **The Order card's emblem face** (batch SS10, part 1; the user approved
  "Face 1, the emblem" on 2026-11-17, `docs/plans/ui-critique-2026-10-16.md`;
  the board is `docs/plans/mockups/scholars-study/order-card-faces.html`).
  `src/ui/orderFace.ts` builds the face of an Order or a Doctrine from its row
  and a state object (`where` hand or played, `sealedTurns`, `staged`,
  `liveLine`, `unmet`); `emptyChairFace` draws an empty chair at the same size.
  The flair gallery shows it (`flair.html#order-face`, or
  `flair.html?review=order-face` alone). The orders screen uses it (below).
  - The name is the motto, in IM Fell English small capitals. The deck's suit
    is an engraved device in the type's ink (gilt for a Doctrine). The effect
    is `describeCard`'s clauses in EB Garamond, printed through
    `setDescriptorText`; the keyword clause is a label in the picture's lower
    left corner. The tier is a numeral on a plate at the head.
  - Three readings come from the effect's own structure, as pure functions:
    the **red ink** (`rubricRuns`: a figure as the describers print one, and
    the six yield keys of `CITY_YIELD_KEYS` as words), the **tablet**
    (`firstFigure`: the first figure, with the yield word after it) and the
    **initial** (`effectInitial`: the first letter, none when the effect starts
    with a figure). A card with no figure has no tablet.
  - The rarity is the border: a plain double rule, a hatched band with corner
    flourishes, a gilt band with the sun, the moon and stars; a Doctrine has
    the heaviest gilt frame. The frames are CSS (`src/ui/orderFace.css`) and
    the corner marks are drawn once (`src/art/orderFaceMarks.ts`).
  - One custom property, `--order-face-width`, sizes the face (210px by
    default; the board's 210 × 258 is `21em × 25.8em`). The effect starts at
    13 px on up to five lines and steps down to 11 px, then the picture
    shortens (`fitOrderFace` measures on the page; `estimateOrderFaceFit` is
    the first guess; its measures were set against the page's fit of all 577
    live cards, so it is never larger than the page and calls no live card
    too long). A card that still does not fit is marked `data-overflow`: its
    text is cut with a fade and scrolls inside the card when the card is
    lifted or focused, and nothing spills outside the card. Every live card
    fits today; `test/ui/orderFace.test.ts` keeps the list of those that do
    not, which is empty.
  - The two card faces load with the card's stylesheet (`src/cardFaces.css`,
    imported by `orderFace.css`), from Google's files, under the tokens
    `--face-card-text` and `--face-card-title`. No page head changes.
- **The orders screen** (Statecraft; batch SS10, part 2). The user approved
  the final board on 2026-11-17; the board of record is
  `docs/plans/mockups/scholars-study/orders-screen-final-board.html`, and its
  last section is the build spec. `src/ui/statecraftScreen.ts` builds the
  screen on `modalShell.ts`; its styles are `src/ui/statecraftScreen.css`.
  - The head: the title, the hint, what your cards pay (`foldDeck`, the
    Ledger's deck figure, never a sum of the cards' lines), the count of
    unconfirmed changes, Revert, Confirm and the close button. A refusal
    prints the reducer's own sentence in place of the hint for four seconds,
    in `.wanting`.
  - The cloth holds three parts. The gilt register: the government and each
    Doctrine, laid wide (`registerFaceNode`), each with a live plate. The
    table: one emblem face or empty chair for each chair, six to a row, with
    the chair's tab on its foot (`chairTabNode`); the full face at 7 chairs or
    more, the large face at 6 or fewer. The hand: side by side when it has 12
    cards or fewer and the table is one row, otherwise a rail of card tops.
  - Seating is click then click, or the keyboard: the arrows move, Enter
    picks a card up or puts it down, 1 to 9 play the held card into that
    chair, and Esc puts it back where it came from. The chairs the held card
    fits are ringed "seat here" or "swap"; the rest fade, and their title is
    the reducer's sentence. A swap is a removal and a placement in the same
    chair.
  - The staging is `statecraftStaging.ts`, unchanged: nothing is sent until
    Confirm or until the screen closes, Revert throws the arrangement away,
    and a seat change throws it away. Confirm counts the new cards' figures
    and the head's total up; with less motion they are simply there.
  - What a card says it pays is `src/ui/orderLive.ts`. A card played this
    visit: "awaits your seal: on Confirm", and no figure. A commission: its
    counter. A Scaler: its value. A card that pays each turn or on an
    occasion: its stamp, the occasion with what it has paid so far. A card
    that pays yields but pays nothing now: "+0 now" and the reason. A rule:
    "in force". The figure tablet shows the same live figure
    (`OrderFaceState.tablet`); the hand and the flair gallery fall back to
    `firstFigure`.
  - The reason is `cardIdleReason` (`statecraft/evaluator.ts`): a closed
    empire condition, a kind of town the empire has none of, no trade route
    of the clause's crossing, or no route that starts, ends or touches the
    kind of town the clause names. `idleReasonWords` (`describers.ts`) says
    it, and gives no words when they would carry a figure. The reading gives
    nothing when a paying clause is open or is shut for a reason it cannot
    name. `cardCanPay` tells a card that pays from a rule.
  - Text that does not fit a card never spills outside it: it is cut with a
    fade at the foot, and it scrolls inside the card when the card is lifted
    or has the keyboard's focus.
  - The hand label says what the hand holds by type, "H opens it", and how
    many Orders the deck holds, "D opens the binder" (part B). Both layers
    are drawn by `src/ui/ordersLayers.ts` inside the cloth, and Esc closes a
    layer before the sheet. H shows the whole hand in ranks of up to fifteen;
    a click picks a card up and closes the view. D shows every Order as a
    full face, six to a row, with filters by chair type, deck, rarity and
    seat, and a box that finds a card by its words (`binderAdmits`); a seated
    card carries its chair's number, and a click picks the card up.
  - The six moments are `src/ui/ordersMotion.ts`, with the board's timings
    (`ORDERS_MOTION`): a hand card rises 16 px and its full face opens beside
    it; a card picked up with the pointer follows it, tilted 5 degrees; it
    lands in 180 ms on a short arc and widens over the last 80 ms; Confirm
    settles the edge and the art in 120 ms while the figures count up; a
    sealed card shakes; a swapped card slides back to the hand in 180 ms. With
    less motion each has the board's quiet form: no rise and no tilt, a
    cross-fade in place, and no slide.
  - A card whose text is cut lifts on hover or focus after 300 ms: a played
    card at full size lets its text scroll, and a register card opens its
    full Doctrine face under it. The compact forms use the same lift.
  - **Full screen** (part C1; the user, after playing part A: "lets have it
    be full screen like the tech tree screen, the white modal bezels look
    bad"). The overlay covers the whole window, top bar and corner panel
    included, as the star chart's does; the sheet is the cloth, lampblack
    with a gilt rule just inside the window's edge; the head sits on it in
    parchment and gilt. It stays on `modalShell.ts`: the frame sets no size,
    so a full-window sheet keeps `hidden` as the whole state, one `close`,
    the keyboard's return and `dispose`. The H and D layers fill the window
    under the head. The screen draws again when the window changes size.
  - **The layout is the window's** (`ordersLayout`, pure and tested over a
    sweep of window sizes). It picks the largest card form whose table fits
    beside the register and the least hand: the large face (244 by 299) for
    a table of one row, the full face (210 by 258), the compact form (187 by
    180, the picture band 44), then the narrow compact form (145 by 206).
    The height left over goes to the hand: named cards side by side in as
    many ranks as fit, with the name at 11 px or more; else an indexed rank,
    every card in view and its name set down its edge; else the rail of
    card tops. The register and a two-row table share one width, centred on
    the cloth; the hand takes the cloth's width, at most 1640 px.
  - What each window gets, with 11 chairs and 30 in the hand: 1440 by 900,
    the full face and an indexed rank 144 px tall; 1280 by 720, the compact
    form and an indexed rank 136 px tall; 1024 by 768, the narrow form and an
    indexed rank 132 px tall; 1920 by 1080, the full face and two ranks of
    fifteen named cards. With 5 chairs and 2 in the hand at 1440 by 900, the
    large face and the hand side by side at 130 by 202.
  - A compact card has the full face's text sizes; only the card is smaller.
    It lifts to its full face after 300 ms on hover or focus. On a tight
    window the register's government is 200 wide with a 56 px picture, and
    under 1240 wide it is 180 with no picture. A seat can hold six Doctrines
    at most (one at each of the four government tiers, one from a wonder and
    one from a commission); above four they give up their pictures to their
    words.
- **In play** (stage 3 of the Council and In play board,
  `docs/plans/mockups/scholars-study/council-and-in-play/`). A read-only
  full-screen sheet of everything in force for the seat.
  `src/ui/inPlayScreen.ts` builds it on `modalShell.ts`; the pieces and their
  figures are `src/ui/inPlayPieces.ts`; the forms are `src/ui/inPlayForms.ts`.
  - Five stacks: The council (one edge a chair), Wonders, Beliefs, Legacies
    and Temporary. The government and its Doctrines sit in the left column
    under the leader's crest, as on the Council screen. Each stack has its
    name, count and total. The top piece wears its own form; every other
    piece is one tucked edge of one width; past eight edges a "more" edge
    ends the stack. Every figure shows at its one size: the bottom of a
    piece is its figures', they wrap between whole figures, and a piece with
    more of them grows taller (the user's comments on stage 3). The stack
    heads share one row's height, and the cloth scrolls when a stack runs
    past the window's foot. A wonder's picture window is 2:1 on its piece.
    A click on a stack opens it as a tray of full pieces, and a click on a
    piece in the tray goes to the screen that owns it. The tray scrolls when
    a piece is taller than it.
  - The pieces are read off the records the rules' walk (`liveEffects`)
    reads. Technologies and resources are never pieces. A follower belief
    pays the towns that follow it and is not a piece. `test/ui/inPlayPieces`
    holds every entry of the walk to a piece or a technology.
  - Every figure is the card stamp's reading (`cardImpact.ts`, the `pieces`
    subject), taken on the books of its two boards. The totals line is the
    books with everything on the screen less the books with none of it. A
    piece's plate rounds against its stack's total; the council's cards
    round against the Council screen's own line.
  - **Renown each turn** is the ninth figure on both screens (stage 7; the
    user, 2026-11-19: "cards should show additional renown that they
    generate"): on the totals lines, after happiness and authority, and on
    every plate that moves it. It is `renownPerTurn` (the fold of
    `explainRenown`'s recurring half, summed over every family) with the
    card or piece, less without it. The impact list carries it as its own
    `renown` line, which pays in no yield. A one-time grant (a Triumph, a
    completion) is not a rate and is not on it.
  - A total clicked lights the pieces that pay it and opens a sheet of every
    source, ending in what does not come from In play (the Ledger's classes,
    the meter's own lines, or for renown `explainRenown`'s recurring lines by
    the family they favour), so it adds up to the empire's figure. The renown
    sheet ends with the whole figure split by family, not added in again.
  - Its doors: the corner panel's fifth mark with the count, the link in the
    Council screen's head, and the I key. A wonder finished or a belief
    chosen since the seat last looked puts a dot on the door and sits on top
    of its stack with a glow until the screen closes; a chosen belief flies
    to the door from the card it was chosen on.
  - **The wonder plate** (`src/ui/wonderPlate.ts`, frame A1): a wonder the
    seat's own town finishes is a full-screen page in the news queue, on the
    age plate's lapis with its gilt frame. Its picture window is exactly
    16:9, the shape of its painting (`docs/splash-art.md`, row 3), filled by
    `wonderWindowNode` from `wonderPicture`. Under it are the name, the town,
    the turn and what it pays each turn; its text stays on In play, so the
    picture keeps its height. The Triumph the wonder earned is one line on
    the plate, its name and its renown, and its own Triumph page does not
    open (`wonderTriumphPairs`); every other Triumph keeps its page, and the
    record, the chronicle line and the renown are unchanged. If the plate
    cannot be shown, the Triumph gets its page. Continue flies the wonder to the
    In play door, and the door's count and dot land with it. The chronicle
    keeps the line; another seat's wonder keeps its toast. A wonder with a
    painting is not on the lapis page: it stands on the ribbon plate (below).
  - **The ribbon plate** (`src/ui/plateRibbon.ts` and `plateRibbon.css`): a
    painting over the dimmed board on a lapis ribbon from edge to edge, with
    a sun and a moon on the band and the words on the painting's foot over a
    dark fade. The arrival is slow (about 1.8 seconds); reduced motion shows
    it at once. The painted wonder plate and the age plate both use it
    through `placeOnRibbon`, so its markup and rules exist once.
  - **The age plate** (`src/ui/agePlate.ts`, frame A7 of the Quiet Table
    boards): news when the world's age turns over, in front of the wager
    sheet. It stands on the ribbon with the age's painting
    (`public/art/splash/ages/<set><age>.jpg`). The set (`form`, `still` or
    `abstract`) is one for the whole game, picked by `agePaintingSet` from a
    hash of the game's seed in the UI, never from the sim's random numbers,
    so a loaded game shows the same set (`src/ui/agePaintings.ts`). On the
    foot: the numeral, the name and the line (`agePlateLine`) at the left;
    the seat's deeds in at most two rows and Continue at the right, all inside
    the painting's lower third. A deed that does not fit is not drawn. A
    missing painting, or one that does not load, gives the full-screen lapis
    page. A new game opens on the age I plate once, before the pamphlet and
    the tutorial (`openNewGame` in `main.ts`); a loaded game never shows it.
- **The Council screen's heights** (the user's comments on stage 3): the head
  is taller, the hand shows at most `COUNCIL_FRAME.fanMax` of each card, and
  the height left goes round the government and its chairs
  (`CouncilLayout.spare`). Six chairs or fewer sit in a cluster, three to a
  row, centred in the room right of the government (`COUNCIL_FRAME.cluster`),
  so the cluster sits right of the page's centre. Both sheets close with the
  star chart's "×" (`.tech-close`).
- **A card that acts on another chair** (stage 8; the user, 2026-11-19, on The
  Grand Vizier): the Council screen marks the chair it acts on with an open
  gilt lozenge on the chair's label, and the acting card with a filled one.
  The pair lights while the pointer or the keyboard is on either. A card held
  over the council marks its target with a dashed lozenge. The chairs come
  from `chairsActedOn` (`statecraft/evaluator.ts`), the card's own
  `slotPosition` rows resolved by `chairIndexAtPosition`, as the walk reads
  them; a card's own chair, and a chair the government does not have, are
  never marked.
- **Renown on a card's printed face** (stage 8): the stamp prints renown each
  turn after the yields and the meters, as `RENOWN_FIGURE_GLYPH`
  (`figures.ts`), a private-use character the yield printer draws as the
  laurel. Nothing else in the game prints that character.
- **Quiet Table, build stage 1** (`docs/plans/ui-critique-2026-10-16.md`;
  the board is `docs/plans/mockups/scholars-study/quiet-table-third-pass/`):
  - every parchment sheet's head (`.statecraft-head`) is ruled with ink over
    a gilt hairline, and its × (`.statecraft-close`) is the technology
    screen's control in ink. The Council and In play keep their own dark head;
  - buttons: plain (`.btn`, an ink edge), primary (`.btn-primary`, cinnabar
    with a hard ink shadow), quiet (`.btn-quiet`, the paper's edge);
  - a toast about a held thing leads with a plain seal, a ring and a dot at
    thirteen pixels (`HELD_MARK`, mark kind `held`);
  - the hex card names who holds the hex (`describeOwner`), and says nothing
    of free ground;
  - the caravans' four tabs are filter chips with today's words;
  - Declare war is a solid war red button with the blade, and its confirm
    card names what follows (`warConsequences`); Enter does not confirm it;
  - the technology hint is the user's own words, "click a technology to
    research it · shift-click to queue";
  - the corner panel is at least 272 px wide and grows when a figure in its
    row of marks is long (fourth pass, frame 7). Only that row sizes it; the
    open card keeps its closed width, and the commission chips read the drawn
    width (`--empire-corner-w`, written by `empireDrawer.ts`).
- **Empire buildings** (the user, 2026-11-19: "lets label these as empire
  buildings everywhere in the game"). The buildings an empire may normally
  hold only one of are "empire buildings"; "great house" was the old name.
  Which rows count is the row's own mark (`BuildingDef.empireBuilding`,
  `isEmpireBuilding`). The words are `EMPIRE_BUILDING_WORDS` in
  `statecraft/describers.ts`: the technology chart's hover card prints the
  label under the name (a keyword to the Concepts page
  `concept:empireBuilding`) and the node's face fills the building's block;
  each one's Compendium page and the buildings shelf's lead say what one is;
  its In play piece says "Empire building, with" its town, and its row in the
  city screen's build list carries the small-caps word, as a wonder's does.
- **A unit refused only for want of supply stays in the build list, greyed**
  (the user, 2026-11-19), with the requirement and its counts under it, the
  same counts as the corner panel's Supply section. Every other refusal folds
  into "Not yet" as before. "Only supply" is the sim's answer: `buildError`
  asked again with `ignoreResourceRequirement` (`unitRowGate`), and a town too
  small for the unit is a second bar (`greyedForSupply`, `cityPanel.ts`).
- **Quiet Table, build stage 2: the offers** (`docs/plans/ui-critique-2026-10-16.md`,
  "Quiet Table: build stage 2, the offers"):
  - every offer is one quiet sheet (`offerCard.ts`): the title and the
    offer's facts in a ruled head, "The offer waits. Nothing is spent." and
    the × (View map, Escape too); the reroll at the foot's left with what the
    bank holds, Pass and Take at its right. **A click chooses a card and Take
    takes it**; a number key chooses, Enter on a card takes it;
  - the cards are revealed one by one after a hold on their backs
    (`OFFER_REVEAL` in `cardDeal.ts`: a hold of 300 ms, 260 ms between cards,
    each turn 420 ms). A press or a key during the reveal turns every card up
    and does nothing else; reduced motion shows them face up. The Order draft's
    cards lie on the draft pile's back, the great person offer's on the laurel,
    the government's on the crown (`offerBackNode`);
  - the Order draft draws the Council's engraved face (`orderOfferFace` in
    `offerFaces.ts`), with the stamp's seat at its foot, and no text under it;
  - a great person is drawn as the great person card (`greatPersonCard.ts`)
    on the offer and in the Reliquary: the family's tab, an arched picture
    window of 5:6 (`greatPersonPicture`: a portrait from
    `greatPersonPaintings.ts`, none yet, or the family's emblem), the name, the
    legacy, what the person does when spent (on the offer), the flavour and
    the tier mark. The Reliquary's fan shows the same card as thumbnails, and
    the deed stands under the desk with the count;
  - the Ledger's page heads are ruled the kit's way, and its × is the kit's.
- **Quiet Table, build stage 3** (`docs/plans/ui-critique-2026-10-16.md`,
  "Quiet Table: build stage 3"):
  - **one size of great person card.** Every card on the offer and in the
    Reliquary has one width and one height. The height is measured once from
    the whole live roster, with each family's longest "When spent" line
    (`greatPersonCardHeightEm`, published as `--gp-height`). The name
    wraps, and steps down one size only if it would take a third line
    (`fitGreatPersonCard`). Nothing else shrinks. The Reliquary's desk uses
    the offer card's size;
  - **a quieter great person card** (2026-11-19, after the first portraits):
    one frame, no rules beside the name, no engraving behind the picture, and
    the window a round arch, 5:6, across nearly the full inner width, with one
    thin line in the family's ink. The fallback is the family emblem on a plain
    disc in the same arch. The sun and the moon stay. The flavour line has no
    visible "Flavour" label on this card only; the word stays in the markup,
    hidden from sight, for a screen reader;
  - **one text size in an Order draft.** `fitOrderHand` (`offerFaces.ts`,
    the offer's `fitHand`) gives every card in the hand the smallest step
    any one card needs, so the cards match;
  - **the setup's leader step** is "Choose your leader": a plain list (the
    seat's charge, the leader's name, the civilisation under it) and, beside
    it, a 3:4 portrait window (`leaderPortraitNode`; a portrait from
    `leaderPortraits.ts`, none yet, or the seat's charge on its ink) with
    the name, the decks, the two rules and the unit and building or
    improvement only that leader may raise. "No leader" and "Random" stay at
    the foot of the list;
  - **the faith sheet's head** is the religion's name, with its holy city and
    the number of towns following on one fine line (`faithHeadWords`). The
    tabs are Rites, Religion and followers, Bonuses;
  - **Rites** is a plain table with a head row (`RITES_COLUMN_WORDS`);
  - **Bonuses** has one fine line in place of the two headline boxes, and the
    gods, the beliefs and the holy city are tablets with a round 1:1 window
    (`beliefPicture`, `beliefPictures.ts`, none yet, or the drawn belief
    mark). An empty place is a dashed tablet;
  - **Religion and followers** is tables: one summary line, your towns (who
    follows, your pressure, rival pressure), foreign towns, the religions in
    the world (founder, holy city, towns), and the clergy as rows. A rival's
    holy city is named only if the seat has seen it, and a rival's towns are
    counted only among the towns the seat can see; the table says so. The
    pantheon wheel is cut;
  - **the combat forecast** in the hex card labels its sides "You" and
    "Them", with the unit's name under each, and each side's health bar
    under its unit with the health after the blow. The card is wider while
    it shows a forecast, and the strength lines wrap rather than cut.
- **The government banners** (`docs/plans/ui-critique-2026-10-16.md`, "Quiet
  Table, second pass", row 7: "Great, love it"; frames `frame-7-proposed` and
  `frame-7-fallback`, drawn by `gov()` and `gov_fallback()` in
  `docs/plans/mockups/scholars-study/quiet-table-fourth-pass/base.py`; the
  user's comments on the build, 2026-11-20).
  `src/ui/governmentBanner.ts` and `.css` draw a government in two forms:
  - **the row** on the government offer: a 3:1 window (330 by 110), the rules
    through the describers with the figures in mono, and a column with the
    chairs and, under them, the stamp's seat with no label. The seat shows
    nothing until the pick, when the figure lands in it. The offer
    stands the three rows one under another (`Offer.stacked`, laid out by
    `stackedSpread` in `offerCard.ts`; the board's 856 by 130 at 1280 by 720
    and up). Every row in the hand is the tallest one's height
    (`fitGovernmentHand`, `--gov-row-h`), and the rules are one size that
    wraps. The deal, the crown back, choose and Swear, the stamp and the
    `adoptGovernment` command are unchanged; a row turns over about its long
    axis. The foot says in one short line what adopting does;
  - **the seat** on the Council screen: the same window heading a narrow card
    the column's width (200, or 145 on a small window), then the rules, the
    chairs the council has (`slotTypesOf`) and the pay plate
    (`governmentLive`). It is as tall as its content. Its lift shows the same
    card larger. The Doctrines stacked under it are all one size (the user,
    2026-11-20: "keep the cards lower in the stack the same size"): each strip
    is the full width of the column and as tall as the tallest, tucked 4 px
    under the one above, here and on the In play screen. On the Council the
    column never reaches the band over the hand: the room from the card's foot
    to the band's top (`CouncilLayout.bandTop`) sets the step between strips
    (`doctrineStackStep`, `fitDoctrineStack`), and a stack that does not fit
    at 4 px tucks each strip further by one even amount, never past its name
    line, and shows only the names. In the compact column (145) the seat's
    chair words and their label are for a screen reader only, and each strip
    is one fixed 46 px: its name on one line and its figures on one line at
    12 px;
  - **the window** (`governmentPicture`): the government's painting from
    `governmentPaintings.ts` (`public/art/splash/governments/`),
    with the name and the tier on a dark fade at its foot, or the drawn mark:
    the engraved seal with the crown, the name and the tier. Both keep the
    window's size;
  - **the chairs**: one small card shape a chair in its type's ink with the
    type's own mark, grouped by type, and the mix in words.
  The In play screen draws the held government on the same banner, in the
  seat form, and lifts it on hover as the Council does. The Compendium has no
  government entry.
- **The diplomacy screen: layout B with the strip of courts**
  (`docs/plans/ui-critique-2026-10-16.md`, fourth pass; frames
  `frame-2-strip` and `frame-2-drawer` in
  `docs/plans/mockups/scholars-study/quiet-table-fourth-pass/`;
  `src/ui/diplomacyScreen.ts` and `.css`). One sheet on the modal shell, with
  the kit's head ("Foreign courts", the turn and how many courts are met) and
  three parts, left to right:
  - **the strip of courts** (`courtStrip`): one 48 px square, framed on the
    head of the leader's portrait, for every other real player at the table (`diplomaticSeats`: never the barbarians,
    never the fallen), in seat order. A met court shows its picture, a war
    red dot at war, a deep gilt dot in a truce, and a cinnabar dot while an
    offer of theirs waits; the chosen court is ringed in ink. A court not yet
    met is a blank, faded mark that cannot be chosen and says only "Not met
    yet" (the met ruling of 2026-09-03). The strip is a list box: the chosen
    court holds the tab stop, the arrow keys move between met courts
    (`stripStep`), Enter or a click chooses, and a hover label names the
    court. It scrolls when the courts do not fit, so eleven fit at any size;
  - **the chosen court**: the setup step's 3:4 portrait window
    (`leaderPortraitNode`; a portrait from `leaderPortraits.ts`, none yet,
    or the seat's charge on its ink), as tall as the sheet allows. The name,
    the people and where you stand sit over its foot, with the slip of the
    court's last words under them (the envoy's answer, a counter, or "Here
    is what I propose." while their offer is open);
  - **the desk**: the act tabs (Exchange, Peace terms), one tray a side with
    the gold in hand and the chips (gold, open borders, the luxuries, then the
    strategic resources in their own group, then towns in a peace; see the
    strategic bullet below), "On the table" (the deal, one column a
    side, each clause with a ×, and "Clear the table"), the two questions,
    and the foot: Declare war (the kit's solid war red, not at war), then
    "Standing and deals" with the count of deals in force and a dot when an
    offer waits, and Propose (cinnabar). Their offer opens on the table with
    Accept, Decline, "Change the terms" and "Back to your paper" in place of
    the questions.
  - **"Standing and deals"** opens a drawer over the desk
    (`standingAndDeals`): the relation, both borders and the war weariness
    line, the deals in force with their turns left, the offers waiting for
    your answer (Read opens one on the table) and your own offers (Withdraw).
    Its × and Escape close it back to the trays. Every command the screen
    sends is the same as before.
  - **Strategic resources in an offer** (`strategicChoices`, beta checklist
    row 14; the ruling in `docs/flags.md`, "Three rulings from the Compendium
    review"). Each tray lists the strategic resources its side holds, in a
    group after the luxuries with no heading, and the other side's list shows
    only the resources this seat can name. A chip's figure is the free copies
    (`lendableCopies`, the reading `dealSideError` asks). A chip with no free
    copy is struck through, with the sim's refusal on hover. A chip the
    receiver cannot use yet (no reveal technology) can still be offered, and
    its hover says so. "last free" marks the last copy free to build with, and
    the paper warns when it is offered. Unlike a luxury, no strategic row is
    hidden when both sides hold it. The paper, the drawer, the peace terms and
    the offers list name a strategic loan as they name a luxury (`termItems`).
- **The simpler city screen** (`docs/plans/ui-critique-2026-10-16.md`,
  "City screen: simpler"; the fourth-pass frame is `city4` in
  `docs/plans/mockups/scholars-study/quiet-table-fourth-pass/build.py`). The
  user, on the third pass: "this is too cluttered, could you make it a bit
  simpler and less overwhelming for new players?" The user's comments on the
  built screen (2026-11-20, "The city screen as built") and on its second step
  (2026-11-20, "The city screen, second step") are in it too. All of it is
  `src/ui/cityPanel.ts`:
  - **the panels** are the frame's widths: the town panel 286 px and the work
    panel 400 px. `data/view3d.json`'s `cityFrameBiasPx` (57, half their
    difference) and `cityFrameInsetPx` (742, both widths and the four 14 px
    gutters) keep the framed town centred between them, pinned by
    `test/ui/cityScreen.test.ts`;
  - **the head** is ruled like a sheet head (ink over a gilt hairline): the
    name between ‹ and ›, then Health and Defence, each a small-caps word and
    a larger mono figure in the middle of the head's height (the defence
    ledger is that figure's hover card), what the town is short of (only when
    it is short of something: unrest, siege, starving, unhappy, authority
    overdrawn; no Idle chip), the six yields as a mark and a figure each, and
    the × that leaves the town (Escape too). The banks, the belief badge and
    Size are no longer in the head;
  - **the left panel** keeps growth, borders and the citizens' focus in view.
    The next citizen and the next tile are each meter's hover; where the
    citizens are ("8 on land · 2 specialists · 1 idle") is the Citizens line's
    hover, and an idle citizen also shows beside the count. The four focus
    chips start at the left with a 4 px gap and wrap to a second line rather
    than run past the panel;
  - **the levies** stand under the focus chips whenever the seat's cards grant
    one (`renderLevy`); a town with no levy shows nothing there. There is one
    button a levy line. A press opens a confirm under the buttons
    (`renderLevyConfirm` in `src/ui/levyMenu.ts`) with what the levy gives and
    what it costs in citizens; "Levy" sends the same `levyCitizen` command the
    old menu sent, and the rite line lists the rites instead. Cancel, Escape or
    a press anywhere else shuts the confirm. A line that cannot be chosen is a
    button that does nothing, with the reason as its note, and when no line can
    be chosen the reason is also a line under the buttons;
  - **the fold rows** under them hold the rest: Buildings, Empire buildings,
    Wonders, Specialists, Faith and Trade routes. A town shows a row only when
    it has something in it (`cityFoldRows`); a shut row says one fact ("6",
    "1 ready", "a rite, 9 turns"); one row is open at a time, and the open row
    is the panel's own state, kept when the next town has the same row
    (`keptFold`). In the Buildings, Empire buildings, Wonders and Specialists
    rows each thing is a chip. A building's chip shows its row card
    (`buildingCard` with `standing`: what it pays and its clauses, without the
    "would add" lines) on hover or keyboard focus; a consecration is its own
    chip with the belief's clauses; a family of specialists is a chip with its
    guild bar as the hover, and its Dismiss beside it. The Trade routes row is
    a table: the trading post's chip, the route count and "All routes" on one
    line, then one row a route, where it goes on the left and what it pays on
    the right (`cityRouteRows`' `figures`, the trade sheet's reading), in a
    list that scrolls past 220 px. The Faith row opens on the faith the seat
    holds, what the town follows (the seat's own faith is "your religion"),
    then "Religious followers": every religion in the town with its share,
    yours first, and the ✶ beside your religion's name is the only mark that
    it is yours. The rite the town keeps, the rites it may start and the link
    to the Faith sheet stand under a thin rule and a "Rite" label, and the
    rites fold behind one line when none can be started here;
  - **the work panel** is one panel: what is being built, the queue, the tabs,
    and directly under them the build list (the gear on each row, no
    pictures). Over each price column is its bank's mark and what the seat
    holds; every row has one cell in each column. A price is one chip, its
    figure and mark on one line, centred on its row (`priceCellElement`'s
    `chip` option); a price the bank cannot pay yet is the same chip with its
    figure in red and no "need" line; a dash where the bank does not sell the
    row. There is no "Buy outright" line, no caravans line, no Supply strip and
    no "No Iron spare" chip (a unit with no supply is greyed in the list);
  - **the foot** carries Buy tiles, its own button at the bottom centre
    (`renderBuyDock`); while it is on, the board caption over it says what the
    treasury holds and why a hex's plate is a dash.
- **A named thing in a describer is a keyword ref** — `[[kind:id|Name]]` via
  `ref()`; a raw `[[` on any surface fails the sweep.
- Player-facing words are plain, numbers never appear in written prose, and
  flavour is always labelled Flavour.

## Test discipline

- `npm run dev` · `npm run typecheck` · `npm run test` (core) · `npm run build`.
- Two tiers: **core** or **slow**; slow lives in `<concern>.slow.test.ts` beside
  its core file, and `test/stress/` is slow wholesale. Slow means slow *by kind*.
  A source-reading register test is always core.
- **Subagents run narrow tests only** — `npx vitest run <your files>`. The
  batch-gate (typecheck + core + build) is the orchestrator's; `npm run test:all`
  is the push-gate.
- Check exit codes, never grep a summary line.
- **A doc table that mirrors data carries a sync test.** The ones that exist
  today: `mapgen.md` · `tech-tree.md` · `units.md` · `orders-and-doctrines.md` ·
  `beliefs.md` · `great-people.md` · `wager.md` · `yields.md` ·
  `production-costs.md` · `religion-v2.md` · `leaders.md`. A row edited in one
  place and not the other fails core.
- Three docs are **generated**: `units.md` (`UNITS_DOC_WRITE=1`),
  `tech-tree.md` Part 2 (`TECH_DOC_WRITE=1`) and `codex.md` (`npm run codex`).
  Never hand-edit a generated region — except a Notes column, which is carried
  through regeneration.

---

## The shelf

**Reference docs** — current state, bulleted, data-pointing:

| doc | what |
|---|---|
| `design-notes.md` | the design ledger, condensed — current state and the standing doctrines |
| `flags.md` | every OPEN ruling, deferred half and live thread |
| `design-specimen.html` | the interface's design language (ink/parchment, the four faces) |
| `yields.md` | the sequence of record — the order every yield is computed in |
| `production-costs.md` | what anything costs to build, in one rule |
| `tech-tree.md` | the tree — determinations plus the generated as-built tables |
| `units.md` | the roster and how a strength is folded (generated) |
| `orders-and-doctrines.md` | the Statecraft master list |
| `wager.md` | the wager deck and the malice deck, and the rules they are dealt under |
| `beads.md` | the Bead Race model and the Opus door |
| `religion-v2.md` · `beliefs.md` | the machinery, and every belief/rite/consecration as a row |
| `great-people.md` | renown, legacies, Triumphs, and the full roster |
| `trade.md` · `luxuries.md` | caravans, roads, connections; the resource table and its vocabulary |
| `wonders.md` | the wonder framework (rows live in data and the Compendium) |
| `mapgen.md` | the generator, pass by pass, every tunable |
| `bot-priorities.md` | the bot's spec of record |
| `codex.md` | the generated card-pool grid (`npm run codex`; never hand-edit) |

**Live worksheets** — open questions, not yet rules:

| doc | what |
|---|---|
| `war-diplomacy.md` | war and diplomacy; substantially built, still taking rulings |
| `leaders.md` | the six figures and their decks; every figure still the user's |
| `playstyles.md` | wide and tall, every lever, with ▢ for the balance pass |
| `late-game.md` | Æra IV and V — nothing in it is built |
| `themes.md` + `themes/` | the nineteen gameplay themes; the only home for theme rationale |
| `city-screen.md` · `pamphlet.md` | two shipped specs of record, each with a tail still open |
| `art-pass.md` · `splash-art.md` | art direction: a live backlog and the standing refusals |
| `playtest_notes.md` | the user's running playtest diary |
| `decks/` | the six decks: `deck-design.md` (the goals, the rules and the dated rulings) and one sheet per deck, the spec of record for its cards. Every card of all six is built on branch `decks` (2026-10-26), so each sheet row says `implemented`, or `modify` with the reason. Every Doctrine on a sheet is built and dealt too. `common.md` is the user's proposal of 2026-10-12 for the cards that belong to no deck; the game still deals the older 13. The card-design skill (`.claude/skills/card-design/`) reads them |
| `plans/` | work in progress: the tutorial plan (`tutorial.md`, with `tutorial-research.md`), the interface rework (`hud-ux-decisions.md`, `hud-empire-panel-spec.md`, the city and faith screen plans), the deck measurements and research, each deck's themes pass (`<deck>-themes.md`), build plan with "Built" notes (`<deck>-themes-triage.md`, Scientific's `scientific-build-triage.md`) and first proposal for its Doctrines (`<deck>-doctrines.md`), the Doctrine build plan (`doctrines-build-triage.md`), the tidy-up after the builds (`tidy-2026-10-26.md`), and the plans the code still cites |

**The drawers** — open only for the *why*:

- `history/` — working docs whose rulings are now code: `design-history.md` (the
  unabridged entry ledger, where cited entry numbers resolve), `flags-log.md`
  (every ruling made, item letters kept), `bot-priorities-log.md`,
  `schema-changelog.md`, the batch docs, and `painted-renderer/` (the painted
  renderer's checkpoints).
- `deprecated/` — docs a *later doc* superseded, with the master named beside each.
- `audit/` — finished read-only passes, cited by path from docblocks across the
  tree. History, not current state.

---

## Reading order — what to open for what

| if you are… | read |
|---|---|
| **starting anything** | this file, then `CLAUDE.md` |
| touching a **yield, a cost, a fold** | `yields.md` → `production-costs.md` → `src/sim/yields/` |
| adding or retuning a **card, order, doctrine** | `orders-and-doctrines.md` → `src/sim/statecraft/evaluator.ts` (the one switch) |
| touching **religion** | `religion-v2.md` → `beliefs.md` |
| touching **units or combat** | `units.md` → `war-diplomacy.md` §5b → `src/sim/combat.ts` |
| touching the **tree** | `tech-tree.md` → `src/sim/techData.ts`'s placement docblock |
| touching the **map** | `mapgen.md` → `data/mapgen.json` |
| touching **trade or a resource** | `trade.md` → `luxuries.md` |
| touching **great people or renown** | `great-people.md` |
| touching the **endgame** | `wager.md` → `beads.md` |
| touching the **bot** | `bot-priorities.md` → `src/ai/wants.ts` |
| touching a **screen** | `design-specimen.html` → the page's own entry above |
| asked "**is this open?**" | `flags.md` (A for questions, B for deferred rows, C for threads) |
| asked "**why is it like this?**" | `history/` — and only then |

A doc table that mirrors data is the spec of record for that data: edit the
figure in both places, run the sync test, and the pair stays honest.
