# Batch DT triage: every Doctrine in the game

**Status:** written 2026-11-05 by a triage agent that changed no code and no data, before any batch in this plan. It is the plan to build all 98 Doctrines as `docs/plans/doctrine-review-2026-11-05.md` leaves them. The user said: *"ok i've gone through the doctrines, please fold these comments in and implement. let me knkow if anything is unclear"*. The readings below are the ones the build uses unless the user changes them here. Mark any you disagree with, as on the deck sheets.

**Sources, in order of authority:**
1. `docs/plans/doctrine-review-2026-11-05.md`: the user's comments, each quoted. The user answered its three questions on 2026-11-05, each with the recommended reading (readings 1 to 3).
2. The rows of record: the Doctrine tables of `docs/decks/expansionist.md` and the tier tables of `docs/plans/{commerce,scientific,magisterial,devotion}-doctrines.md`. A script copied every text in the table below from these files. `docs/plans/expansionist-builds.md` ("Doctrines, proposed 2026-10-17" to the end) gives Expansionist's reasons and readings. The recommendations in each proposal's "Questions for the user" stand as readings, except where the spec overrides them.
3. Dominion's live rows: `data/decks/dominion.json`, under `doctrines`.

Facts were checked against the code at commit `d6ec1c0c` (branch `decks`, schema 205). The notes under each proposal's tier tables, and their sections 7 to 11, describe the first proposals and are not used where the spec revised a row. Section "Where the code differs" says which of their facts are stale.

**Groups:**
- **1, data only:** the text can be written with shapes that exist today. The cell names the shape.
- **2, new shape, no new player decision:** the behaviour is automatic, or uses UI that exists. The cell names what is missing and points at section "The new shapes".
- **3, needs a new player action or UI:** one row, Human Sacrifice. The user's own comment asks for it.

A row marked "No change" is live today and needs no work. It is in the table because the plan covers all 98.

**Shorthand in the cells:**
- "Town line" is `pays` with `where:'city'`. "Hex line" is `pays` with `where:'hex'`.
- "Sn" points at a shape in section "The new shapes".
- `needsReligion` and `needsTendedWork` are fields on the Doctrine row (S4).

## Facts the cells rely on

**The rows.**
- `data/decks/dominion.json` holds 16 Doctrine rows: 15 live and 1 retired (`theServianReforms`). After DT1 it holds 13 live and 3 retired. The other five deck files and `common.json` have no `doctrines` map. `data/statecraft.json` holds 48 retired rows. Checked.
- A deck row carries `name`, `decks`, `band`, `line: "none"`, `flavor`, `text` and `effects`. `tier` is derived from `band` (`governmentTierForDoctrineBand`). `DoctrineId` is the keys of all the files' maps (`statecraftData.ts`), so a new row needs no type edit. `foldDoctrines` throws on an id written twice. Checked.
- The 85 proposed ids and names below collide with no Order or Doctrine in `data/`. A script checked them. Checked.
- A retired row stays in the data. `poolDoctrines` leaves it out, and `liveEffects` still reads it for a seat that holds it. A new game never holds one. Checked.
- **No logic names Weight of Numbers or Total Mobilisation** (the spec's check). The names appear in comments only: `src/ai/value.ts`, `src/sim/state.ts`, `combat.ts`, `cities.ts`, `statecraftData.ts`, `statecraft/evaluator.ts`. Tests that hold them by id still work, because the rows stay. Checked.

**The sheets and their tests.**
- `test/sim/decks/dominion.test.ts` reads Dominion's Doctrine tables through `docDoctrines()`, under the heading `**Doctrines,** offered with the tier-N governments:`. A data row must match its sheet row in name, tier and text. A retired row must be off the sheet. Every live row must have effects, a flavour line and clauses with no raw `[[`. Checked.
- The heading differs on each other sheet. Expansionist: `**Doctrines,** proposed 2026-10-17, revised 2026-10-23, for the tier-N governments (not built):`, with all 24 rows already there. Commerce, Magisterial and Devotion: `**Doctrines:** none yet.` above an empty three-column table. **Scientific has no Doctrine tables at all,** only the header line "Doctrines: none built". Checked.
- Every sheet reader (`scientific.test.ts`, `expansionist.test.ts`, `commerce.test.ts`, `devotion.test.ts`, `magisterial.test.ts`) skips a row with fewer than 5 cells, so a three-column Doctrine table does not disturb the card tables. Checked.
- `test/sim/decks/magisterial.test.ts` lines 822 to 834 pin the words "none yet" and that no Doctrine names Magisterial. No other deck test pins this. Checked.
- `test/sim/decks/sortedSheets.ts` is the non-test module the deck tests share. `SORTED_DECKS` already lists all six decks. Checked.
- The counts tables have a Doctrines column on the Dominion and Expansionist sheets only. The Commerce, Scientific and Devotion tables end in Charters, and Magisterial's ends in All. Each deck test reads its table, so those four state their Doctrine count in the header line, with no new column. Checked.

**The doc mirror, the fixture and the schema.**
- `docs/orders-and-doctrines.md`, section "## Doctrines", has one row per live Doctrine with the columns Doctrine, Decks, Tier, Offered with and Effect. `test/sim/statecraftDocSync.test.ts` holds it to the data in both directions: a live row needs a doc row and each doc row needs a live row. A retired row has no doc row. Checked.
- `test/fixtures/cardText.json` is rewritten with `CARD_TEXT_WRITE=1 npx vitest run test/sim/cardTextSnapshot.test.ts`. It covers every Doctrine. Checked.
- `SCHEMA_VERSION` is 205 (`src/sim/state.ts`). **Fifteen test files pin it with `toBe(205)`:** `test/sim/beads.test.ts`, `census`, `cities`, `decks`, `improvements`, `meters`, `purchase`, `religion.slow`, `state`, `statecraft`, `sunkProgress`, `tech`, `visibility`, `war` and `worldClock`. `game`, `sleep`, `wonders`, `trade` and `test/ui/saves` and `saveCheckpoints` read the constant and follow it. The digests in `test/sim/explore.test.ts` (`RANGED_BOARDS`) move with the version. The digests in `test/sim/aiDigest.slow.test.ts` move at the push gate. Checked.

**Tests that pin Dominion's Doctrine pools.** DT1 changes these so later batches do not break them:
- `test/sim/doctrineOffer.test.ts`: `fromDecks` equals Dominion's list, `TIER_ONE` to `TIER_FOUR`, `poolDoctrines(n)`, `doctrineBagFor(pachacuti, 4)` empty, and the Steppe Confederacy's exact effects and end-to-end test. Checked.
- `test/sim/statecraft.test.ts` lines 438 to 456: the four pools by id. Checked.
- `test/sim/decks.test.ts` line 1823: "Ada (Expansionist and Commerce) is offered nothing at tier 4". It breaks with the first Tier I Expansionist Doctrine, in DT2. Line 1843 lists Tier I by id. Checked.
- `test/sim/decks/dominionDoctrines.test.ts` (lines 140 to 240, 419 to 480), `dominionUnits`, `dominionEconomy`, `dominionRules`, `dominionUnrest`, `dominionWars`, `commercePairs`, `test/sim/offers.test.ts` and `test/ui/cardFace.test.ts` name the changed rows. Checked.
- `ORDERS_USING_A_SHAPE` (`test/sim/statecraft.test.ts`, line 9022) lists every row with a `cityRenownPercent`, `buildingYieldPercent`, `slotPosition`, `cardYieldAmplifier` or `periodic` effect, or a route/flat `pays`. The Doctrines come before the Orders. New entries: The Muda, The Sea Ban, The Peace of Lodi, The Universitas (two), The Peripatetic School, The Arthashastra. Checked.

**The Doctrine offer** (`statecraft/draft.ts`).
- `drawDoctrineOffer` deals one Doctrine from each of the seat's decks, then a third from either, through `drawDoctrinePositions`. A position whose deck has nothing left falls back to the whole bag. Checked.
- `doctrineBagFor(player, tier)` takes no state. It has four callers outside tests: `drawDoctrineOffer`, `doctrineOfferCanOpen` (`cities.ts`, which also takes no state and is read by the commissions phase for The Golden Bull), and `src/ai/value.ts` (two). Checked.
- `OrderDef.needsTendedWork` and `needsLevy` are read once, in `dealGateFor`, through `holdsTendedUnlock` and `holdsLevyGrant`. `DoctrineDef` has no gate fields. Checked.
- A waiting offer blocks End Turn (`statecraftBlocker`). Today only Dominion seats ever see one. After DT2 to DT4 every seat does. Bots answer through `doctrineDecision` (`src/ai/bot.ts`), which uses `pickCard` and `scoreCard`, and pass when no card scores above nothing. Checked.

**The council** (`statecraft/draft.ts`, `statecraft/evaluator.ts`).
- `settleDoctrineChoice(player, optionIndex)` pushes the id and takes no state and no turn. `applyChooseDoctrine` (`commands.ts`) bumps the economy clock and calls `forgetTheLaw`. **It does not refit the council,** so a Doctrine's `slotRider` would add no chair until the next adoption. Checked.
- `refitSlots` resizes the council to `chairCount` and keeps every seated card that still has a chair. New chairs are appended and are Wildcard. Checked.
- `cardExtraChairs` clamps the sum of `slotRider` figures at nought, and `slotTypesOf` pads the layout but never trims it. A negative `extra` does nothing today. Checked.
- Every live government at tier 18 or 26 has at least two Wildcard chairs. Checked in `data/statecraft.json`.
- `slotPosition` is read in `deckModifierLines`. It multiplies a seated card's flat lines in a town's fold and in the empire's fold, and nothing else: no hex line, no percentage, no combat line. `orderAtSlotPosition` takes a position counted from one. The Grand Vizier is the one live row. Checked.
- `legacyReadings` and the `legaciesCountTwice` block in `buildLiveEffects` are the working example of pushing a source's effects again with a label of their own. The Immortals uses it. Checked.
- `deckReadsSlotPosition` (`src/ui/statecraftScreen.ts`) walks seated Orders only. It decides whether the council screen prints chair positions. Checked.

**Hands** (`statecraft/draft.ts`).
- `HandPosition` is `deck`, `generic` or `cross`, written on the offer so a redraw keeps it. `positionBag` switches on it exhaustively. `expectedHandBags` is the bots' reading of the next hand. Checked.
- `foreignCardBag(state, player)` already exists (Magisterial batch MG14). It is every dealable row of the decks the seat does not hold. A rainbow seat's bag is empty. Checked.
- `rarityOdds(skips)`, `rarityFirstOdds(bag, skips)` and `drawRarityFirst(state, bag, skips)` take no seat. Callers: `src/main.ts` (`rarityDrawWeight`, twice), `src/ai/wants.ts`, `src/ai/value.ts` (the foreign bag), and `draft.ts` (three). Checked.

**Hexes and yields** (`yields/hex.ts`, `statecraft/evaluator.ts`, `docs/yields.md`).
- **`wholePercent` is already the step the user asked for.** It is step 8 of the hex fold, a share of everything above it: the terrain, the seam, the works, every card line and the two other shares. Nothing is added to the hex after it. The Strategoi's citadels use it. So The Pandidakterion and The Two Sanctuaries are data, and they need no new step. Checked.
- A hex row needs an `on` (`hexRows` drops one without). `perNeighbour` counts neighbours that pass a test. `perAdjacentMountain` reads the baked `Tile.mountainsBeside`. Checked.
- `cardTileLines` builds the unscoped lines per empire. `scopedCardTileLines(state, city)` builds the scoped ones with the town in hand, called from `cityContext`. A line that needs a fact about the town working the hex belongs there. Checked.
- `tileConditionHolds` reads `GroundFacts`, built by `groundFactsFor`. `improved` excludes a tended work and `unimproved` includes it. `standingSince` reads `age + ground.workAgeBonus`. `wonderCentre` is a closure over `cityAt`. Checked.
- `countOf` answers `wonders` and `publicWorks` with `within:'city'`, and `tilesInBorders` from `effect.tile`. Checked.
- `docs/yields.md` has one register row per (`where`, `basis`) pair. `PAYS_PAIRS` in `test/sim/yieldsDocSync.test.ts` and the expected list in `test/sim/statecraft.test.ts` (line 677) pin them. hex/count is not a pair today. Checked.
- A town's package (`explainBuildingPackage`): a flat town line whose scope names a building, or a town line counted by building category `within:'city'`, is on the building. So The Pythagorean Brotherhood's Shrine line and The Choregia's culture line reach a building share, each with one home. Checked.
- `growthSurplus` (`cities.ts`) is `channelSurplus` less a mover's take. `collectYields` prices every town first, then banks. `cities.ts` never imports `trade.ts` (pinned); `routes.ts` is the leaf. Checked.

**Authority** (`meters.ts`).
- `explainAuthority` prices each town with the ladder, then a set price (`cardCityCostValue`), else a percentage (`cardCityCostPercent`), then a delta (`cardCityCostDelta`). The delta's floor is `max(min(cost, 1), cost + delta)`. **So a positive delta charges a capital that was free.** A capital costs nought today. Checked.
- `City.captured` is sticky. `cedeCityAt` sets it too, so `notCaptured` means "the founder still holds it, and it never changed hands". Checked.
- `prospectAuthorityCost`, the founding preview, reads `cityCosts` only. **It does not read `cityCost` rows,** so it understates a founded town under The Universal Monarchy, Synoecism or The Mandarinate. This gap exists today for the Orders. Checked.
- **`City.foundedTurn` does not exist.** Only `BarbarianCamp` and `Religion` have a `foundedTurn`. `createCity` (`state.ts`) is the one place a town comes into being. Checked.

**Combat and units** (`statecraft/evaluator.ts`, `state.ts`, `tech.ts`).
- `combatConditionHolds` holds `targetBelowHalf` at line 7326. `CombatSituation` carries `targetHp`, `targetMaxHp` and `vsCity`. Checked.
- `CombatScaleCount` lacks `wonders` and `beliefsHeld`. Both are `CountKind` members. `value.ts` has two switches on the scale count (lines 7353 and 7434). Checked.
- `rebateReaches` reads `class`, `levied`, `perRank` and `where`, and no `rank`. Checked.
- `unitStamp` with `strength` exists (Professional Soldiers). `Unit.stamp` travels through an upgrade (`applyUpgrade`). `cardUnitStamp` asks a scoped row about the town at the **birth hex**. A unit that `spawnTileFor` or a rally puts beside the town has no town there, and a scoped stamp is silent. `realiseItem` has the town in hand. Checked.
- `createUnit` is called the one writer of `Unit.stamp`, but `realiseItem` (`cities.ts`, line 5578) also adds to it for a mirrored row. So a second writer has a precedent. Checked.
- `upgradeUnits` (`tech.ts`) reads `upgradeHeals` once per piece after `applyUpgrade`. Checked.
- `cardBehaviorRule`, `cardActionRule`, `cardActionRuleAt` and `cardCityRuleAt` read the `rule` kind. `CardRuleEffect` already carries `class`, `building`, `scope`, `rank`, `max`, `percent` and `value`. Checked.

**Trade** (`trade.ts`, `routes.ts`, `combat.ts`, `arrival.ts`).
- `tradersUnplunderable` is read in two places: `tradeIsShielded` (`combat.ts`) and `arriveOnTile` (`arrival.ts`). It has no narrowing by crossing. Checked.
- `gateRoute` holds the clauses behind `routeStartable`. The foreign half asks war and meeting. Nothing refuses a foreign destination as such. Checked.
- `holdsPost` reads `cityPostPays` for the town's owner, the post The Factors' Houses reads. Checked.
- A route `pays` row takes `crossing` and `share: [{yield, percent}]` (The Neutral Flag). No live row has a negative `share`. Checked.
- `dealSideError` (`diplomacy.ts`) is the deal gate. `isLendableResource` is its luxury clause. The bots ask `proposeDealError` first. Checked.

**Purchases and prices** (`purchase.ts`, `cities.ts`, `tech.ts`).
- `cardPurchaseRiders` reads `currency`, `on`, `class`, `scope`, `buildingCategory` and `empireBuilding`. `on:'route'` is the caravan's price (`explainRoutePrice`). Checked.
- `explainTilePurchase` holds the cell, and applies `tilePurchase` rows without a tile test. `CardRulePercentEffect` has no `tile`. Checked.
- `contributionRate` changes only faith, by `faithContribution`, and takes no item. The Cathedral and the Opus both accept contributions. `CardRulePercentEffect.building` exists. Checked.
- `explainTechCost` has the column, the charter premium, and one card line (`charterTechCost` or `gapTechCost`). Checked.
- `riteCostAhead` is `riteCost(started + ahead)`: a base of 20 and 5 more for each rite started (`data/religion.json`). The Devotion proposal's "40 to 90 by age" is stale. Its docblock says a card that changes the price applies here. Checked.
- `cardLimitLifts` reads `buildsEverywhere`. With `empireBuilding:true`, a `scope` and no `max`, `oneToARealmError` already allows a copy in each admitted town and none elsewhere. It excludes `endsTheGame`. The Observatory's three works (`chartTheStars`, `theTurningHeavens`, `theAlchemicalCodex`) are empire buildings and not `endsTheGame`. Each grants a bead, once per empire (`awardBead`). The Turning Heavens also grants a great scholar. Checked.
- `productionBonus` with `empireBuilding:true` reaches the Magnum Opus today, because `isEmpireBuilding` is true of it (The Many Hands, Learned Commissions). Checked.

**Religion and rites** (`religion.ts`).
- `pressLump` has four pinned callers: `proclaimAt`, `drainConversions`, `payBattleRiders` (`combat.ts`) and `foundCityAt` (`cities.ts`). `bankPressure` has two: `spreadReligion` and `pressLump`. `test/sim/religion.test.ts` (line 2906) counts the calls. Checked.
- `lumpTargets` runs the lump through `templeShare`, so a rival Temple can reduce it to nothing. `cityReligion` is a strict majority of `City.followers`, derived. Checked.
- `payBattleRiders` pays `capture` on both capture paths (`combat.ts` lines 2861 and 3150), and presses each of `heldReligions`. `theCrusaderOrders` is the live example. Checked.
- `poolSlots(pool)` and `nextBeliefPool(religion)` take no state. Callers: `religion.ts` (three), `src/ui/faithReading.ts`, `src/ui/bonusesTab.ts`, `src/ai/wants.ts`. Checked.
- `purchaseError`'s `followingOnly` clause asks `cityBeliefUnlocksBuilding` only. `cardUnlocksBuilding` already reads a scoped `unlocksBuilding` row (The Forward Plans). Checked.
- `explainCardEmpireYields` has an arm per `pays` basis. `docs/yields.md` allows a `rule` that pays a voice if its id is pinned by the sync test. Checked.
- `foundReligionError` refuses a founding when the world's religions are full, and `plantHolySiteError` asks it for a seat's first site. So a seat with no religion has no holy sites unless it captures one. Checked.
- `declareWarError` (`diplomacy.ts`) is read by the Diplomacy screen, the bot planner (`ai/diplomacy.ts`, line 1638) and the reducer. Checked.

**Great people** (`greatPeople.ts`, `renown.ts`).
- `spendGreatPerson` is the one place a person is spent, and it pays `greatPersonSpent` riders. The moment is live (The Last Commission). Checked.
- `workOf(unit)` takes no state. Callers: `greatPeople.ts` (three), `src/ui/controls.ts`, `src/ai/bot.ts` (two). Checked.
- `greatPersonWorkAt` calls `refreshTileDerived` for the hex and `payWorkLaidRiders`. Six improvements carry `greatPerson`, the holy site among them. A prophet's site goes through `plantHolySiteAt`, not this function. Checked.
- `renownThreshold(state, player)` is the ladder's price. `settleGreatPersonChoice` is the one place `greatPeopleRecruited` rises. Checked.
- `explainCityRenown` takes shares over the fold of the town's building lines, with no filter by row. Checked.

**Levies** (`levies.ts`, `src/ui/levyMenu.ts`).
- `waitFor` reads `LEVY.everyTurns` (5) and a grant's `everyAtWar`. A `levy` row with no `use` is legal (`noWaitEvery`, The Slack Season). `LevyUse` has eight members and `planLevy` switches on it exhaustively. The `levyCitizen` command carries `cityId` and `use`. `empireRiteAt(state, player, unit, rite)` needs a unit. Checked.
- The levy menu prints a line's wait when it differs from the rule's (`levyMenuModel`). Checked.

**Tallies.** `recordScalingOccasion` (`statecraft/draft.ts`) writes tallies only for **seated Orders**. So a Doctrine cannot read `count:'tally'`. Checked.

**The bots** (`src/ai/value.ts`, `data/ai.json`).
- `value.ts` switches exhaustively on the effect kind. `ruleRewriteValue` is exhaustive over `CardRule`, so a new member fails the typecheck until it has a case. The empire condition switch (line 5215) is exhaustive too. A `rule` with no arm returns `score.unknownEffect` (2). A `metaRule` with no case returns the same. Checked.
- `score` already has groups for all six decks in `data/ai.json`. The arena page generates its panel from the file, so a new knob needs no page edit. Checked.

**What the surfaces read.**
- The Doctrine offer card (`src/main.ts`, `showStatecraftOffer`) prints `describeCard(id)`, `doctrineDef(id).flavor` and `doctrineFaceOf`. The council screen prints `drawDeckDoctrineFace`. The Compendium (`doctrineEntry`, `src/ui/compendium.ts`) walks `DOCTRINE_IDS` and prints `cardClauses`. **So the player reads the describers, not `text`.** `text` is what the sheet and the doc mirror compare. Every new shape needs words in `statecraft/describers.ts`. Checked.
- `deckBadges.ts` reads the deck's suit from `decks[0]`, so all six decks already have a Doctrine face. Checked.

**Where the code differs from the spec and the proposals.**
- **`City.foundedTurn` does not exist** (the spec's reading on The Universal Monarchy). DT1 adds it, and a stamp for when a seat took a Doctrine.
- **The doubled hex needs no new step.** `wholePercent` is that step.
- **A permanent strength needs no new field.** `unitStamp` and `Unit.stamp` hold it. What is missing is the birth town, and the write at the upgrade.
- **The Külliye is almost data.** `buildsEverywhere` already takes `empireBuilding`, `scope` and no `max`.
- **Many "near existing" shapes now exist:** `faithSpent` and `beliefsHeld` (DV3), `greatPersonSpent` as a moment (MG), `workMountains`, `holdsPost`, `foreignCardBag`, `faithContribution`, `techCountsTwice` and `legaciesCountTwice`. So The Saint Peter's Indulgence, The Kitabkhana and The High Towns are data.
- **"Needs a levy" has no row.** Human Sacrifice was the one Doctrine that said it, and the spec removes it. S4 builds the two gates that have rows.
- **The Scientific sheet has no empty tables to fill.** DT3 adds them.
- **The proposals' note that `score` has no Devotion group is stale.** `score` has Devotion and Magisterial groups now.
- **`docs/yields.md`'s list of rules that pay a voice is at three ids.** The Apostolic Camera adds a fourth.

## All 98 Doctrines

| Deck | Tier | Doctrine | Id | Text | Group | Shape | Batch | Bots |
|---|---|---|---|---|---|---|---|---|
| Dominion | I | The Steppe Confederacy | `theSteppeConfederacy` | +50% production toward mounted units. Mounted units gain +3 strength when attacking a wounded unit. | 2 | `productionBonus` `category:'unit'`, `percent:50`, `modelClass:'mounted'`, no condition. `combatLine` `amount:3`, `side:'attack'`, `when:{test:'targetWounded'}`, `class:{modelClass:'mounted'}`. **New:** S1. | DT1 | Existing `productionBonus`, `combatLine`. The new condition takes the full price, as `targetBelowHalf` does. |
| Dominion | I | The Marian Reforms | `theMarianReforms` | Your military units cost no upkeep, but your towns build them at half speed. Buying them is unaffected. | 1 | No change. | none | Existing. |
| Dominion | I | The Soldiers' Share | `theSoldiersShare` | Melee units gain +1 movement and +3 strength. | 1 | `unitStat` `stat:'movement'`, `amount:1`, `class:{modelClass:'melee'}`. `combatLine` `amount:3`, `side:'both'`, `when:{test:'always'}`, `class:{modelClass:'melee'}`. The old rider and `noFounding` leave the row. | DT1 | Existing `unitStat`, `combatLine`. |
| Dominion | II | The Consular Roads | `theConsularRoads` | Cities connected to your capital by road and holding a garrison gain +5 science and +5 culture, and are pacified at once. | 1 | `band` 1 to 2. Effects do not change. | DT1 | Existing. |
| Dominion | II | The Laws of Lord Shang | `theLawsOfLordShang` | While a town builds a military unit, its surplus food goes into the unit instead of into growth. | 1 | No change. | none | Existing. |
| Dominion | II | Centurions | `centurions` | Each Elite unit gives +3 strength to your units beside it, and costs 1 less upkeep. | 2 | The `combatLine` stays. `upkeepRebate` `amount:1`, `rank:'elite'` replaces the `upkeepSurcharge` row. **New:** S2. | DT1 | `upkeepRebate` arm learns `rank`, as the surcharge arm counts it. |
| Dominion | II | The Plunder Economy | `thePlunderEconomy` | Pillaging a hex yields production equal to 50% of your unit's strength in every city. Your units lose 4 strength when attacking cities. | 1 | No change. | none | Existing. |
| Dominion | III | The Strategoi | `theStrategoi` | +30% renown. Citadel yields and your great generals' strength aura are doubled. | 1 | `band` 2 to 3. Effects do not change. | DT1 | Existing. |
| Dominion | III | The Universal Monarchy | `theUniversalMonarchy` | Towns you capture cost no authority, including those you already hold. Towns you found from now on cost twice as much authority. | 2 | `meterRule` `rule:'cityCost'`, `value:0`, `scope:{test:'captured'}` (no change). `meterRule` `rule:'cityCost'`, `percent:100`, `scope:{test:'all',of:[{test:'notCaptured'},{test:'foundedSince',doctrine:'theUniversalMonarchy'}]}`. **New:** S3. | DT1 | Existing `meterRule` `cityCost` arm. It reads the scope through `cityScopeAdmits`. |
| Dominion | III | Combined Arms | `combinedArms` | Your units gain +3 strength, doubled beside one of your siege units. Siege units beside one of your melee units cannot be attacked in melee. | 1 | No change. | none | Existing. |
| Dominion | IV | The Landsturm | `theLandsturm` | After you pass a draft, each city of five or more citizens raises the best melee unit you can build. It costs no upkeep. Melee units gain +3 strength, doubled beside a great general. | 1 | No change. | none | Existing. |
| Dominion | IV | The Fortress Empire | `theFortressEmpire` | Units gain +5 strength when fortified. Each city gains +5% science and production for each fortified military unit inside its borders, at most +30%. | 1 | No change. | none | Existing. |
| Dominion | IV | The Scourge of God | `theScourgeOfGod` | Units that have pillaged in the last five turns gain +6 strength. Pillaging gives your capital +100% production for five turns, which does not stack. | 1 | No change. | none | Existing. |
| Expansionist | I | Bound to the Soil | `boundToTheSoil` | Workers gain +1 charge. Tended tiles gain +1 food. | 1 | `unitStat` `stat:'charges'`, `amount:1`, `class:{type:'worker'}` (Tinkers' Guild's form). Hex line `on:{test:'tended'}`, `food:1`. | DT2 | Existing `unitStat`, `pays`. |
| Expansionist | I | The Gift of the River | `theGiftOfTheRiver` | Worked tiles beside a river gain +1 food and +1 production. Towns away from fresh water cost 3 more happiness. | 1 | Hex line `on:{test:'river'}`, `food:1`, `production:1`. `happiness` `amount:-3`, `per:'city'`, `scope:{test:'notFreshwater'}` (Total War's form). | DT2 | Existing `pays`, `happiness`. |
| Expansionist | I | The Highland Clans | `theHighlandClans` | Towns on hills cost 1 less authority. Hills beside a town gain +1 food. | 2 | `meterRule` `rule:'hillCityCost'`, `delta:-1`. Hex line `on:{test:'all',of:[{test:'hills'},{test:'beside',of:{test:'townCentre'}}]}`, `food:1`. **New:** tile test `townCentre` (S6). | DT6 | Existing `meterRule`, `pays`. |
| Expansionist | I | The Commanderies | `theCommanderies` | Each of your towns costs 1 less authority, minimum one. Your borders grow 30% more slowly. | 1 | `meterRule` `rule:'cityCost'`, `delta:-1`. `rulePercent` `rule:'borderCulture'`, `percent:-30`. | DT2 | Existing `meterRule`, `rulePercent`. |
| Expansionist | II | The Georgics | `theGeorgics` | Your works count as having stood twice as long. Improvements that have stood for twenty turns gain +1 production. | 2 | `workAge` `factor:2`. Hex line `on:{test:'all',of:[{test:'improved'},{test:'standingSince',turns:20}]}`, `production:1`. **New:** `factor` (S13). | DT12 | `workAge` arm learns `factor`. |
| Expansionist | II | Synoecism | `synoecism` | Your towns of six or more citizens grow 30% faster. Towns you founded cost 1 more authority, including those you already hold. | 1 | `rulePercent` `rule:'growthSurplus'`, `percent:30`, `scope:{test:'populationAtLeast',value:6}`. `meterRule` `rule:'cityCost'`, `delta:1`, `scope:{test:'all',of:[{test:'notCaptured'},{test:'notCapital'}]}`. | DT2 | Existing `rulePercent`, `meterRule`. |
| Expansionist | II | The Curator of Waters | `theCuratorOfWaters` | Public works give +2 happiness and are built 50% faster. | 2 | Town line `basis:'count'`, `count:'publicWorks'`, `within:'city'`, `to:'happiness'`, `amount:2` (The Curators of Works' form). `productionBonus` `category:'building'`, `publicWork:true`, `percent:50`. **New:** `publicWork` (S6). | DT6 | `productionBonus` arm reads `publicWork`. |
| Expansionist | II | Human Sacrifice | `humanSacrifice` | Your towns may levy every two turns instead of every five. Your capital may levy a citizen to perform a rite across your empire. | 3 | `levy` `every:2`. `levy` `use:'rite'`, `scope:{test:'capital'}`. **New:** `every`, the use `rite`, a `rite` field on the `levyCitizen` command, and a rite picker in the levy menu (S22). | DT19 | `explainLevyGain` arm for `rite`, priced by the existing rite appraisal. |
| Expansionist | II | The Censors | `theCensors` | When the world takes a census, each of your towns gains a citizen. If you lead the census, each of your towns also gains +1 happiness for the rest of the game. | 2 | `windfallRider` `occasion:'census'`, `grant:{citizens:1,toEveryTown:true}`. Town line `basis:'count'`, `count:'censusesLed'`, `to:'happiness'`, `amount:1`. **New:** S15. | DT13 | Existing `census` rate in `occasionRate`. The `citizens` grant learns `toEveryTown`. `countOf` answers the count. |
| Expansionist | II | The Wildwood Compact | `theWildwoodCompact` | Needs tended land. Tended works cost your workers no charge. Workers you gain from now on have one less charge. | 2 | `needsTendedWork:true`. `rule` `tendedWorksFree`. `unitStat` `stat:'charges'`, `amount:-1`, `class:{type:'worker'}`. **New:** S4, S13. | DT12 | New `tendedWorksFree` arm: the charges saved at the seat's tended-work rate. |
| Expansionist | III | Crop Rotation | `cropRotation` | Worked improvements yield twice their own bonus. Worked unimproved tiles yield nothing. | 1 | Hex line `on:{test:'improved'}`, `percent:100`. Hex line `on:{test:'unimproved'}`, `wholePercent:-100`. | DT2 | Existing `pays`. Its hex arm prices the worked hexes. |
| Expansionist | III | The Contented City | `theContentedCity` | Your citizens ask 20% less happiness. Your gold income is halved. | 1 | `rulePercent` `rule:'happinessDemand'`, `percent:-20`. `percentYields` `yield:'gold'`, `percent:-50`, `stage:'empire'`. | DT2 | Existing `rulePercent`, `percentYields`. |
| Expansionist | III | The Builder Kings | `theBuilderKings` | +25% production toward wonders. Manufactories gain +2 production for each wonder in the town working them. | 2 | `productionBonus` `category:'wonder'`, `percent:25`. Hex line `basis:'count'`, `count:'wonders'`, `within:'city'`, `on:{test:'improvement',improvement:'manufactory'}`, `production:2`. **New:** the pair hex/count (S14). | DT13 | `pays` arm learns hex/count. |
| Expansionist | III | Empire Without End | `empireWithoutEnd` | +1 authority for each town you hold. | 1 | `authority` `amount:1`, `per:'city'`. | DT2 | Existing `authority`. |
| Expansionist | III | All Roads Lead to Rome | `allRoadsLeadToRome` | Your capital gains +3% production and gold for each town joined to it by road, at most +45%. Each town not joined to it costs 2 more authority. | 2 | Two town lines `basis:'count'`, `count:'citiesAdmitted'`, `admits:{test:'connected'}`, `percent:3`, `stage:'city'`, `max:15`, `scope:{test:'capital'}`: `to:'production'`, `to:'gold'` (The Mother City's form). `meterRule` `rule:'cityCost'`, `delta:2`, `scope:{test:'notConnected'}`. **New:** `notConnected` (S6). | DT6 | Existing `pays`, `meterRule`. |
| Expansionist | III | The Planted Towns | `thePlantedTowns` | Towns you found start with four citizens and a Monument. Training a settler also costs its town a citizen. | 2 | `foundingRider` `population:3`, `building:'monument'`. `rule` `trainedSettlerCostsCitizen`. **New:** S13. | DT12 | Existing `foundingRider`. New arm for the rule, priced as a citizen a settler. |
| Expansionist | III | The Garden Peoples | `theGardenPeoples` | Needs tended land. Tended tiles gain +1 food, +1 production and +1 culture. | 2 | `needsTendedWork:true`. Hex line `on:{test:'tended'}`, `food:1`, `production:1`, `culture:1`. **New:** the gate (S4); the effects exist. | DT5 | Existing `pays`. |
| Expansionist | IV | The Physiocrats | `thePhysiocrats` | Every improved tile gains +2 food, +2 production and +2 gold. | 1 | Hex line `on:{test:'improved'}`, `food:2`, `production:2`, `gold:2`. | DT2 | Existing `pays`. |
| Expansionist | IV | The Hydraulic Empire | `theHydraulicEmpire` | Worked tiles with fresh water gain +1 food and +1 production for each public work in their town. | 2 | Hex line `basis:'count'`, `count:'publicWorks'`, `within:'city'`, `on:{test:'freshwater'}`, `food:1`, `production:1`. **New:** the pair hex/count (S14). | DT13 | `pays` arm learns hex/count. |
| Expansionist | IV | The Cathedral Lodges | `theCathedralLodges` | Manufactories yield twice as much. Towns with a Manufactory gain +30% production toward wonders and the Magnum Opus. | 1 | Hex line `on:{test:'improvement',improvement:'manufactory'}`, `wholePercent:100`. `productionBonus` `category:'wonder'`, `percent:30`, and `category:'building'`, `building:'theMagnumOpus'`, `percent:30`, each `scope:{test:'hasImprovement',improvement:'manufactory'}`. | DT2 | Existing `pays`, `productionBonus`. |
| Expansionist | IV | The High Towns | `theHighTowns` | Your towns may work mountains. Mountains gain +4 production, and each gives +1 production to the hexes beside it. | 1 | `rule` `workMountains` (The Mountain Terraces' rule). Hex line `on:{test:'terrain',terrain:'mountain'}`, `production:4`. Hex line `on:{test:'adjacentMountain'}`, `perAdjacentMountain:true`, `production:1`. | DT2 | Existing `pays`. `workMountains` takes the stand-in, as it does today. |
| Expansionist | IV | The Mandarinate | `theMandarinate` | Each point of spare authority gives +1% science and culture, at most +30%. Each of your towns costs 1 more authority. | 1 | Two `pays` `where:'empire'`, `basis:'count'`, `count:'authoritySurplus'`, `percent:1`, `stage:'empire'`, `max:30`: `to:'science'`, `to:'culture'` (The Public Good's form). `meterRule` `rule:'cityCost'`, `delta:1`, `scope:{test:'notCapital'}`. | DT2 | Existing `pays`, `meterRule`. |
| Expansionist | IV | The Inward Roads | `theInwardRoads` | Towns joined to your capital by road gain +20% science and culture. Your caravans may not travel to other empires. | 2 | Two `percentYields` `percent:20`, `scope:{test:'connected'}`: science, culture. `rule` `noForeignRoutes`. **New:** S7. | DT7 | New `noForeignRoutes` arm: the foreign route income lost. |
| Expansionist | IV | Arcadia | `arcadia` | Needs tended land. Your tended tiles also count as improved for every card. | 2 | `needsTendedWork:true`. `rule` `tendedCountsImproved`. **New:** S4, S13. | DT12 | New arm: the seat's `improved` hex lines, read over its tended hexes. |
| Commerce | I | The Apoikia | `theApoikia` | Settlers and workers cost half as much gold to buy. | 1 | Two `purchaseRider` `on:'unit'`, `currency:'gold'`, `percent:-50`: `class:{type:'settler'}`, `class:{type:'worker'}`. | DT3 | Existing `purchaseRider`. |
| Commerce | I | The Laurion Leases | `theLaurionLeases` | Hexes with a resource cost half as much gold to buy. | 2 | `rulePercent` `rule:'tilePurchase'`, `percent:-50`, `tile:{test:'hasResource'}`. **New:** `tile` on `rulePercent` (S6). | DT6 | `tilePurchase` arm counts only the share of hexes with a resource. |
| Commerce | I | The Delian League | `theDelianLeague` | Your coastal towns cost 1 less authority and gain +3 production. | 1 | `meterRule` `rule:'coastalCityCost'`, `delta:-1`. Town line `production:3`, `scope:{test:'coastal'}`. | DT3 | Existing `meterRule`, `pays`. |
| Commerce | II | The Grand Canal | `theGrandCanal` | Each of your domestic routes carries half of its origin's surplus food to its destination. | 2 | `rule` `routesCarrySurplus`, `percent:50`. **New:** S21. | DT18 | New arm: food moved toward the town the seat wants large. Also read in the route planner. |
| Commerce | II | The Sogdian Colonies | `theSogdianColonies` | Each of your towns holding your trading post gains +3 culture and +3 renown, favouring merchants. | 1 | Town line `culture:3`, `scope:{test:'holdsPost'}`. `renown` `amount:3`, `per:'city'`, `scope:{test:'holdsPost'}`, `family:'merchant'`. | DT3 | Existing `pays`, `renown`. |
| Commerce | II | The Forbidden Silks | `theForbiddenSilks` | Your luxuries give twice their happiness. You cannot lend luxuries in deals. | 2 | `effectAmplifier` `target:'luxuryHappiness'`, `percent:100`. `rule` `noLuxuryLending`. **New:** S7. | DT7 | Existing `effectAmplifier`. New arm: the seat's lent luxury income lost. |
| Commerce | II | The Flying Money | `theFlyingMoney` | Your towns with a gold building buy units and buildings 20% cheaper. Your other towns cannot buy them. | 2 | Two `purchaseRider` `class:{}`, `currency:'gold'`, `percent:-20`, `scope:{test:'buildingsOfCategory',category:'gold',atLeast:1}`: `on:'unit'`, `on:'building'`. `rule` `buysOnlyInScope`, same scope. **New:** S7. | DT7 | Existing `purchaseRider`. New arm: the share of towns the rule shuts. |
| Commerce | III | The Year and a Day | `theYearAndADay` | Your towns that a domestic route reaches grow 25% faster. Your other towns grow 25% more slowly. | 1 | `rulePercent` `rule:'growthSurplus'`, `percent:25`, `scope:{test:'routeEndsHere',crossing:'domestic',direction:'arriving'}`. `percent:-25`, the same scope with `atMost:0`. | DT3 | Existing `rulePercent`, through `scopeShare`. |
| Commerce | III | The Muda | `theMuda` | Your trade routes to other empires pay +3 science and +3 culture, and cannot be plundered. | 2 | `pays` `where:'route'`, `crossing:'international'`, `science:3`, `culture:3`. `rule` `foreignTradersUnplunderable`. **New:** S6. | DT6 | Existing `pays`. The rule takes the stand-in, as `tradersUnplunderable` does. |
| Commerce | III | The Turnpike Trusts | `theTurnpikeTrusts` | Caravans cost half as much gold to buy. Hexes with a road gain +1 gold. | 1 | `purchaseRider` `on:'route'`, `class:{}`, `percent:-50`. Hex line `on:{test:'road'}`, `gold:1`. | DT3 | Existing `purchaseRider`, `pays`. |
| Commerce | IV | The Sea Ban | `theSeaBan` | Your domestic routes pay twice as much. You cannot send trade routes to other empires. | 2 | `pays` `where:'route'`, `crossing:'domestic'`, `share:[{yield:'all',percent:100}]`. `rule` `noForeignRoutes`. **New:** S7. | DT7 | Existing `pays`. New `noForeignRoutes` arm. |
| Commerce | IV | The Peace of Lodi | `thePeaceOfLodi` | While you are at peace, your trade routes pay 50% more. While you are at war, they pay 25% less. | 1 | `conditionRule` `when:{test:'atPeace'}`, `then:[pays route share:[{yield:'all',percent:50}]]`. `conditionRule` `when:{test:'atWar'}`, the same with `percent:-25`. | DT3 | Existing `conditionRule`, `pays`. |
| Commerce | IV | The Opera del Duomo | `theOperaDelDuomo` | Gold you pour into the Magnum Opus buys twice as many hammers. Your towns build the Magnum Opus 25% more slowly. | 2 | `rulePercent` `rule:'goldContribution'`, `percent:100`, `building:'theMagnumOpus'`. `productionBonus` `category:'building'`, `building:'theMagnumOpus'`, `percent:-25`. **New:** S8. | DT8 | New `goldContribution` case in `ruleRewriteValue` (the switch is exhaustive). |
| Commerce | IV | The Monte di Pietà | `theMonteDiPieta` | Every 200 gold in your treasury gives +1 happiness, at most +20. Your towns make 10% less gold. | 1 | `pays` `where:'empire'`, `basis:'count'`, `count:'bankedGold'`, `per:200`, `to:'happiness'`, `amount:1`, `max:20`. `percentYields` `yield:'gold'`, `percent:-10`. | DT3 | Existing `pays`, `percentYields`. |
| Scientific | I | The Pythagorean Brotherhood | `thePythagoreanBrotherhood` | +2 science in every city, doubled in cities with a Shrine. | 1 | Town line `science:2`. Town line `science:2`, `scope:{test:'hasBuilding',building:'shrine'}`. | DT3 | Existing `pays`. |
| Scientific | I | The Removal to Xianyang | `theRemovalToXianyang` | Your towns grow 30% faster. Settlers cost twice as much. | 1 | `rulePercent` `rule:'growthSurplus'`, `percent:30`. `rulePercent` `rule:'settlerCost'`, `percent:100`. | DT3 | Existing `rulePercent`. |
| Scientific | I | The Workshops of Syracuse | `theWorkshopsOfSyracuse` | Your military units gain +5 combat strength. They cost 50% more to build and to buy. | 1 | `combatLine` `amount:5`, `side:'both'`, `when:{test:'always'}`, `class:{category:'military'}`. `rulePercent` `rule:'unitCost'`, `percent:50`, `class:{category:'military'}`. | DT3 | Existing `combatLine`, `rulePercent`. |
| Scientific | I | The Peripatetic School | `thePeripateticSchool` | Academies gain +2 science and +2 production. Science buildings and wonders give +30% renown. | 2 | Hex line `on:{test:'improvement',improvement:'academy'}`, `science:2`, `production:2`. `cityRenownPercent` `percent:30`, `of:{category:'science',wonder:true}`. **New:** `of` (S6). | DT6 | `cityRenownPercent` arm reads `of`. |
| Scientific | II | The Jixian Academy | `theJixianAcademy` | Completing a technology grants culture equal to a fifth of its cost. Your towns make 25% less culture. | 1 | `windfallRider` `occasion:'tech'`, `grant:{yield:'culture',amount:0.2,fromOccasion:'techCost'}`. `percentYields` `yield:'culture'`, `percent:-25`. | DT3 | Existing `windfallRider`, `percentYields`. |
| Scientific | II | The Academy of Gondishapur | `theAcademyOfGondishapur` | Towns with an empire building gain +15% science. +20% production toward empire buildings. | 1 | `percentYields` `yield:'science'`, `percent:15`, `scope:{test:'hasEmpireBuilding'}`. `productionBonus` `category:'building'`, `empireBuilding:true`, `percent:20`, `skipsBeadRows:true` (reading 24). **New:** `skipsBeadRows` on `productionBonus` (S6). | DT3 | Existing `percentYields`, `productionBonus`. |
| Scientific | II | The Pandidakterion | `thePandidakterion` | Hexes with an Academy have double yields, applied after every other change to the hex. | 1 | Hex line `on:{test:'improvement',improvement:'academy'}`, `wholePercent:100` (The Strategoi's form). | DT3 | Existing `pays`. |
| Scientific | III | The Directorate of Arms | `theDirectorateOfArms` | While no empire you have met knows more technologies than you, your units gain +3 combat strength. | 2 | `conditionRule` `when:{test:'noMetEmpireAhead'}`, `then:[combatLine amount:3, side:'both', when:{test:'always'}]`. **New:** the condition (S6). | DT6 | New case in the condition switch (`value.ts`, exhaustive): the share of turns the seat leads. |
| Scientific | III | The Universitas | `theUniversitas` | Science buildings in your towns of twelve or more citizens produce twice their yields. In your smaller towns they produce half. | 1 | `buildingYieldPercent` `category:'science'`, `percent:100`, `scope:{test:'populationAtLeast',value:12}`. `percent:-50`, `scope:{test:'populationAtMost',value:11}`. | DT3 | Existing `buildingYieldPercent`. |
| Scientific | III | The Volley Fire | `theVolleyFire` | Your archer line (Archer to Crossbowman) may attack twice a turn. Your melee units fight at −10% strength. | 1 | `rule` `secondAttack`, `class:{modelClass:'ranged'}`. `unitStat` `stat:'combatPercent'`, `amount:-10`, `class:{modelClass:'melee'}`. | DT3 | Existing `unitStat`. `secondAttack` takes the stand-in, as it does today. |
| Scientific | III | The Külliye | `theKulliye` | Towns with an Academy may build their own copy of each empire building. +50% production toward empire buildings. | 2 | `rule` `buildsEverywhere`, `empireBuilding:true`, `scope:{test:'hasImprovement',improvement:'academy'}`, `skipsBeadRows:true`. `productionBonus` `category:'building'`, `empireBuilding:true`, `percent:50`, `skipsBeadRows:true` (reading 24). **New:** `skipsBeadRows` on the rule (S6). | DT6 | Existing `productionBonus`. `buildsEverywhere` takes the stand-in. |
| Scientific | IV | The Court of Rudolf II | `theCourtOfRudolf` | Alchemy, and the fourth-age technologies that lead to it, cost you 20% less research. Your other fourth-age technologies cost you 25% more. | 2 | `rulePercent` `rule:'techPrice'`, `percent:-20`, `techChain:'alchemy'`. `rulePercent` `rule:'techPrice'`, `percent:25`, `techAge:4`, `notChain:'alchemy'`. **New:** S8. | DT8 | New `techPrice` case in `ruleRewriteValue`: the chain's cost left against the rest of the age. |
| Scientific | IV | The Platonic Academy | `thePlatonicAcademy` | Your great people of every family found an Academy as their work, in place of their own. | 2 | `rule` `everyWorkIsAcademy`. **New:** S19. | DT16 | `workOf` takes the state, so the bot's work choice follows. New arm: Academy worth against the works given up. |
| Scientific | IV | The Nassau Reforms | `theNassauReforms` | Each time research upgrades one of your units, it gains +2 strength for good. Your towns build military units 25% more slowly. | 2 | `rule` `upgradeStrength`, `value:2`. `productionBonus` `category:'unit'`, `class:{category:'military'}`, `percent:-25`, `stage:'empire'` (The Marian Reforms' form). **New:** S16. | DT14 | Existing `productionBonus`. New arm: upgrades this seat expects, times the line. |
| Scientific | IV | The Two Capitals | `theTwoCapitals` | Your largest town besides your capital also counts as your capital for your cards. Your other towns grow 25% more slowly. | 2 | `rule` `secondCapital`. `rulePercent` `rule:'growthSurplus'`, `percent:-25`, `scope:{test:'notCapital'}`. **New:** S20. | DT17 | Existing `rulePercent`. New arm: the seat's capital lines, read once more at the second town. |
| Magisterial | I | The Arthashastra | `theArthashastra` | You have one more Wildcard chair. The card seated in it counts twice. | 2 | `slotRider` `extra:1`. `slotPosition` `slot:'wildcard'`, `position:-1`, `factor:2`, `whole:true`. **New:** `position:-1`, `whole` (S9). | DT9 | `slotPosition` arm prices the seated card. `slotRider` keeps its stand-in. The seating logic puts the best card in that chair. |
| Magisterial | I | The Hospitium | `theHospitium` | The third card in each of your Order hands comes from a deck you do not hold. | 2 | `rule` `thirdCardForeign`. **New:** S11. | DT10 | `expectedHandBags` learns the position. New arm: the value of the wider bag. |
| Magisterial | I | The Choregia | `theChoregia` | Culture buildings give +3 culture and +2 renown each. | 1 | Town line `basis:'count'`, `count:'buildingsOfCategory'`, `category:'culture'`, `within:'city'`, `to:'culture'`, `amount:3`. `renown` `amount:2`, `per:'buildingOfCategory'`, `category:'culture'`. | DT4 | Existing `pays`, `renown`. |
| Magisterial | I | The Periclean Works | `thePericleanWorks` | Each wonder you hold gives +2 production in every town. | 1 | Town line `basis:'count'`, `count:'wonders'`, `to:'production'`, `amount:2`. | DT4 | Existing `pays`. |
| Magisterial | II | The Magnaura | `theMagnaura` | Each town gains +1 science for each Civic card you have seated. | 1 | Town line `basis:'count'`, `count:'slottedOrdersOfSlot'`, `slot:'civic'`, `to:'science'`, `amount:1`. | DT4 | Existing `pays`. |
| Magisterial | II | The Jinshi | `theJinshi` | Rare cards come up twice as often in your Order hands. | 2 | `rule` `rareWeight`, `percent:100`. **New:** S11. | DT10 | `expectedBestOrder` reads the weight. New arm from `offerRiderWorth`. |
| Magisterial | II | The Barmakids | `theBarmakids` | Each great person you have gained gives every town +1 food and +1 production. | 1 | Two town lines `basis:'count'`, `count:'greatPeopleGained'`, `amount:1`: `to:'food'`, `to:'production'`. | DT4 | Existing `pays`. |
| Magisterial | II | The Peregrini | `thePeregrini` | Great-person works give +1 food and +1 production to every hex beside them. Laying a great-person work makes your next great person cost 20% less. | 2 | Hex line `on:{test:'beside',of:{test:'greatWork'}}`, `perNeighbour:{test:'greatWork'}`, `food:1`, `production:1`. `rule` `workCheapensPerson`, `percent:20`. **New:** the rule and a field on `Player` (S19). | DT16 | Existing `pays`. New arm: renown saved at this seat's works per game. |
| Magisterial | III | The Council of Ten | `theCouncilOfTen` | You have two more Wildcard chairs. | 2 | `slotRider` `extra:2`. **New:** the refit when a Doctrine is taken (S9). | DT9 | Existing `slotRider`, twice the stand-in. |
| Magisterial | III | Scutage | `scutage` | Orders you hold but have not seated pay half their yields. You have one fewer Wildcard chair. | 2 | `rule` `collectionPays`, `percent:50`. `slotRider` `extra:-1`. **New:** S9, S12. | DT11 | New arm: half the flat lines of the bench, less one Wildcard chair. `slotRider` learns a negative `extra`. |
| Magisterial | III | The Bourgs | `theBourgs` | Towns working a great-person work grow 25% faster. | 1 | `rulePercent` `rule:'growthSurplus'`, `percent:25`, `scope:{test:'workingGreatWork'}`. | DT4 | Existing `rulePercent`. |
| Magisterial | III | The Carroccio | `theCarroccio` | Your units gain +1 strength for each wonder you hold, at most +8. | 2 | `combatLine` `amount:1`, `side:'both'`, `when:{test:'always'}`, `scaled:{count:'wonders',per:1,max:8}`. **New:** the scale count (S5). | DT6 | Two scale switches in `value.ts` learn `wonders`. |
| Magisterial | IV | The Union of Lublin | `theUnionOfLublin` | You also gain the abilities of the other two governments of your tier. | 2 | `metaRule` `rule:'governmentsOfTier'`, `value:1`. **New:** S10. | DT9 | New case in the `metaRule` arm: the effects of the two other governments, as `immortalsWorth` reads legacies. |
| Magisterial | IV | The Kitabkhana | `theKitabkhana` | Spending a great person grants 200 renown for each age you have reached. | 1 | `windfallRider` `occasion:'greatPersonSpent'`, `perAge:true`, `grant:{renown:200}`. | DT4 | Existing `windfallRider` (`greatPersonSpent` rate). |
| Magisterial | IV | The Gobelins | `theGobelins` | Each great-person work in your borders gives +4% production toward the Magnum Opus, at most +40%. | 2 | `productionBonus` `category:'building'`, `building:'theMagnumOpus'`, `percent:4`, `count:'tilesInBorders'`, `tile:{test:'greatWork'}`, `max:10`. **New:** `tile` on `productionBonus` (S6). | DT6 | `productionBonus` arm passes `tile` to the count probe. |
| Magisterial | IV | The Escorial | `theEscorial` | Completing a wonder gives you a free great-person draft. | 1 | `windfallRider` `occasion:'completion'`, `wonder:true`, `grant:{greatPerson:'any'}`. | DT4 | Existing `windfallRider`. |
| Devotion | I | The Theoric Fund | `theTheoricFund` | +1 culture for every 3 faith your empire makes. | 1 | `pays` `where:'empire'`, `basis:'rate'`, `fromRate:'faithPerTurn'`, `per:3`, `to:'culture'`, `amount:1` (The Learned Clergy's form). | DT4 | Existing `pays` (rate). |
| Devotion | I | The Rites of Zhou | `theRitesOfZhou` | Each town holding a rite gains +2 food and +2 happiness. | 1 | Town line `food:2`, `scope:{test:'keepingRite'}`. `happiness` `amount:2`, `per:'city'`, `scope:{test:'keepingRite'}`. | DT4 | Existing `pays`, `happiness`. |
| Devotion | I | The Serapeum | `theSerapeum` | Each of your gods gives twice its effects. | 2 | `metaRule` `rule:'godsCountTwice'`, `value:2`. **New:** S10. | DT9 | New case in the `metaRule` arm: the seat's gods, read again. |
| Devotion | I | The Paean | `thePaean` | Your military units gain +1 strength for every god and belief you hold. | 2 | `combatLine` `amount:1`, `side:'both'`, `when:{test:'always'}`, `class:{category:'military'}`, `scaled:{count:'beliefsHeld',per:1}`. **New:** the scale count (S5). | DT6 | Two scale switches in `value.ts` learn `beliefsHeld`. |
| Devotion | II | The Capitulary of Herstal | `theCapitularyOfHerstal` | Rites cost half as much. | 2 | `rulePercent` `rule:'riteCost'`, `percent:-50`. **New:** S8. | DT8 | New `riteCost` case in `ruleRewriteValue`. `riteCostFor` then prices the rites themselves. |
| Devotion | II | The Seven Councils | `theSevenCouncils` | Your religion may hold one more follower belief and one more enhancer belief. | 2 | `needsReligion:true`. Two `pantheonSlots` `amount:1`: `pool:'follower'`, `pool:'enhancer'`. **New:** S4, S18. | DT15 | `pantheonSlots` arm reads `pool`. `wants.ts` asks the new `nextBeliefPool`. |
| Devotion | II | The Patrimony of Peter | `thePatrimonyOfPeter` | Your holy city's citizens demand no happiness. | 2 | `needsReligion:true`. `rulePercent` `rule:'happinessDemand'`, `percent:-100`, `scope:{test:'holyCity'}`. **New:** the gate (S4); the effects exist. | DT5 | Existing `rulePercent`. |
| Devotion | II | The Ribats | `theRibats` | Military units created in a town following your religion gain +3 strength for good. Conquering a town converts it to your religion. | 2 | `needsReligion:true`. `unitStamp` `strength:3`, `class:{category:'military'}`, `scope:{test:'ownersFaith',keeps:true}`. `windfallRider` `occasion:'capture'`, `grant:{pressure:{amount:1,range:0,majority:true}}`. **New:** S4, S16, S17. | DT14 | Existing `unitStamp`, `windfallRider`. The `pressure` grant learns `majority`. |
| Devotion | III | The Imarets | `theImarets` | Your devout towns grow 25% faster. | 2 | `needsReligion:true`. `rulePercent` `rule:'growthSurplus'`, `percent:25`, `scope:{test:'ownersFaith',keeps:true}`. **New:** the gate (S4); the effects exist. | DT5 | Existing `rulePercent`. |
| Devotion | III | Canossa | `canossa` | You and an empire whose capital follows your religion cannot declare war on each other. | 2 | `needsReligion:true`. `rule` `faithfulPeace`. **New:** S4, S7. | DT7 | The war planner already asks `declareWarError` (`ai/diplomacy.ts`). New arm: the wars refused, a share of threat. |
| Devotion | III | The Canons of the Holy Sepulchre | `theCanonsOfTheHolySepulchre` | Towns with a holy site buy with faith at 30% less. | 2 | `needsReligion:true`. `purchaseRider` `class:{}`, `on:'all'`, `currency:'faith'`, `percent:-30`, `scope:{test:'hasImprovement',improvement:'holySite'}`. **New:** the gate (S4); the effects exist. | DT5 | Existing `purchaseRider`. |
| Devotion | III | The Martyr's Crown | `theMartyrsCrown` | Each of your units that dies in battle presses your religion on every town within three hexes. | 2 | `needsReligion:true`. `windfallRider` `occasion:'death'`, `grant:{pressure:{amount:30,range:3}}`. **New:** the gate (S4); the effects exist. | DT5 | Existing `windfallRider`. |
| Devotion | IV | The Saint Peter's Indulgence | `theSaintPetersIndulgence` | +1% production toward the Magnum Opus for every 150 faith you have spent this game. | 1 | `productionBonus` `category:'building'`, `building:'theMagnumOpus'`, `percent:1`, `count:'faithSpent'`, `per:150`. | DT4 | Existing `productionBonus`. |
| Devotion | IV | The House of Worship | `theHouseOfWorship` | Your devout towns may buy the Mosque, the Wat, the Gurdwara and the Dar-e Mehr, whatever beliefs your religion holds. | 2 | `needsReligion:true`. Four `unlocksBuilding` `scope:{test:'ownersFaith',keeps:true}`: `mosque`, `wat`, `gurdwara`, `darEMehr`. **New:** S4, the gate in S18. | DT15 | Existing `unlocksBuilding`. |
| Devotion | IV | The Apostolic Camera | `theApostolicCamera` | Your follower beliefs also pay you in every foreign town that follows your religion. | 2 | `needsReligion:true`. `rule` `followerBeliefsPayAbroad`. **New:** S4, S18. | DT15 | New arm: the belief lines of the foreign towns that follow. |
| Devotion | IV | The Two Sanctuaries | `theTwoSanctuaries` | Hexes with a holy site have double yields, applied after every other change to the hex. | 2 | `needsReligion:true`. Hex line `on:{test:'improvement',improvement:'holySite'}`, `wholePercent:100`. **New:** the gate (S4); the effects exist. | DT5 | Existing `pays`. |

**Retired by DT1, not counted in the 98:** Weight of Numbers (`weightOfNumbers`, band 2) and Total Mobilisation (`totalMobilisation`, band 3) gain `retired: true`.

## The new shapes

Prefer one shape that several Doctrines share. Each shape below names its reader, and says whether it needs a state field, a `refreshCityDerived` register entry, a `docs/yields.md` line, a describer and a bot reading. "State" means a new field in saved state. Every batch bumps the schema once anyway, because it changes what seats are dealt.

**Shapes named in the brief that already exist, and need no new code:**
- **Double a hex's yields after every line** (The Pandidakterion, The Two Sanctuaries, The Cathedral Lodges): `pays` `where:'hex'`, `wholePercent:100`. Two whole shares on one hex sum before one multiplication (`docs/yields.md`, "Two shares of the same kind"), so they never pay each other.
- **A permanent strength on a unit, at its birth:** `unitStamp` `strength`. S16 adds what is missing.

### S1: the combat condition `targetWounded` (The Steppe Confederacy)

- **Reader:** `combatConditionHolds`, beside `targetBelowHalf`: `!vsCity && targetMaxHp > 0 && targetHp < targetMaxHp`.
- **State:** no. **Register:** no. **`docs/yields.md`:** no.
- **Describer:** the combat condition words.
- **Bots:** the `combatLine` arm gives it the full price, as `targetBelowHalf` has.

### S2: `rank` on `upkeepRebate` (Centurions)

- **Reader:** `rebateReaches` (`statecraft/evaluator.ts`): `if (effect.rank !== undefined && !holdsRank(unit, effect.rank)) return 0`. `upkeep.ts` already folds the rebate lines, so rule 5 holds.
- **State:** no. **Register:** no. **`docs/yields.md`:** no; `upkeepRebate` is in the outside list.
- **Describer:** the rebate clause prints the rank.
- **Bots:** the `upkeepRebate` arm counts the seat's pieces holding the rank, as the `upkeepSurcharge` arm does.

### S3: when a town was founded, and when a Doctrine was taken (The Universal Monarchy; read again by The Censors)

- **State, yes.**
  - `City.foundedTurn: number`, written once in `createCity` from `state.turn`.
  - `PlayerStatecraft.doctrineTurns?: Partial<Record<DoctrineId, number>>`, written in `settleDoctrineChoice`, which gains a `turn` argument. Absent reads as nought, so a test that pushes a Doctrine by hand holds it from the start of the game.
  - Both are absolute turns, compared and never ticked (CLAUDE.md, "Timed effects are comparisons").
- **Reader:** a new scope `{ test: 'foundedSince'; doctrine: DoctrineId }` in `cityScopeAdmits`: `city.foundedTurn >= (doctrineTurns?.[doctrine] ?? 0)`, asked of the town's owner. And the small helper `doctrineTakenTurn(state, playerId, id)` for S15.
- **Register:** no. **`docs/yields.md`:** no.
- **Describer:** `cityScopeWords` and the short scope note: "founded since".
- **Bots:** generic, through `cityScopeAdmits` and `scopeShare`.
- **The founding preview:** see reading 8.

### S4: gates on the Doctrine offer (rows carrying `needsTendedWork` or `needsReligion`)

- **Rows:** `needsTendedWork`: The Wildwood Compact, The Garden Peoples, Arcadia. `needsReligion`: The Seven Councils, The Patrimony of Peter, The Ribats, The Imarets, Canossa, The Canons of the Holy Sepulchre, The Martyr's Crown, The House of Worship, The Apostolic Camera, The Two Sanctuaries. `needsLevy` is not added, because no row asks for it.
- **Reader:** `doctrineBagFor` gains `state` and reads each field once per bag, as `dealGateFor` does: `holdsTendedUnlock(state, player.id)` and `heldReligions(state, player.id).length > 0`. The signature change moves `drawDoctrineOffer`, `doctrineOfferCanOpen` (and its callers in `cities.ts` and `commissions.ts`), `src/ai/value.ts` (two) and the tests.
- **State:** no. **Register:** no. **`docs/yields.md`:** no.
- **Describer:** none. The gate is on the deal. The Compendium adds a "Needs" row in `doctrineEntry`, read off the field.
- **Bots:** generic, because the bag is the sim's.

### S5: two more combat scale counts (The Carroccio, The Paean)

- **Reader:** `CombatScaleCount` gains `wonders` and `beliefsHeld`. The strength line's switch (`statecraft/evaluator.ts`, near line 7783) answers them through `wondersHeldBy` and the `beliefsHeld` count. The two switches in `value.ts` gain arms.
- **State:** no. **Register:** no. **`docs/yields.md`:** no; `combatLine` is silent.
- **Describer:** the scale words.

### S6: small narrowings, one field or one test each

Each is read in one place. None needs state, a register entry or a yields line.
- **`tile` on `CardProductionBonusEffect`** (The Gobelins). `countOf` already reads `effect.tile`; the bonus reader passes it on. The describer names the test.
- **`tile` on `CardRulePercentEffect`** (The Laurion Leases). `explainTilePurchase` holds the cell, so it reads the tile and filters the `tilePurchase` rows with `tileConditionHolds(tile, row.tile, ..., groundFactsFor(state, playerId))`. The price stays a labelled list. The sight gate of `hasResource` applies (reading 18).
- **`publicWork` on `CardProductionBonusEffect`** (The Curator of Waters). Read beside `empireBuilding` in the production bonus reader (evaluator line 6375), through `isPublicWork`.
- **The tile test `townCentre`** (The Highland Clans). `GroundFacts.townCentre`, a closure over `cityAt` like `wonderCentre`. It travels through `beside`.
- **The scope `notConnected`** (All Roads Lead to Rome). True for a town that is neither the capital nor in `connectedCities`, so the capital is not charged (reading 7).
- **`of` on `CardCityRenownPercentEffect`** (The Peripatetic School). `{ category?: BuildingCategory; wonder?: true }`. `cardCityRenownShares` carries it. `explainCityRenown` takes that share over only the lines of matching rows, each share still over the buildings' own lines. The guild bar passes no shares and is unchanged.
- **`skipsBeadRows` on `CardRuleEffect`** (The Külliye). `cardLimitLifts` skips a row whose `onComplete` grants a bead. No Order sets it, so The Second Seat does not change.
- **`skipsBeadRows` on `CardProductionBonusEffect`** (The Academy of Gondishapur, The Külliye; DT3 adds it, reading 24). The production bonus reader skips a row whose `onComplete` grants a bead: the Magnum Opus and its three works. No Order sets it, so The Many Hands and Learned Commissions do not change. The describer says nothing extra on the card, and the Compendium's row says "not the Magnum Opus or its works".
- **The behaviour rule `foreignTradersUnplunderable`** (The Muda). One reader in `statecraft/evaluator.ts`, `cardTraderShielded(state, unit)`, answers both rules: `tradersUnplunderable`, or this rule and the route is international (`routeCities`, `routeIsInternational`). `routes.ts` is a leaf, so the reader does not live there. `tradeIsShielded` and `arriveOnTile` both call it.
- **The empire condition `noMetEmpireAhead`** (The Directorate of Arms). `empireConditionHolds`: no rival in `metRivals` satisfies `knowsMoreTechs`. It reads the same `metSeats` register as `rivalHoldsMoreTowns`, which `test/sim/slateRegister.test.ts` already covers. The `value.ts` condition switch gains an arm. The describer words go in the condition table.

### S7: refusals (The Inward Roads, The Sea Ban, The Forbidden Silks, The Flying Money, Canossa)

- **`noForeignRoutes`** (action rule). One clause in `gateRoute`'s foreign half, before war and meeting. `routeStartable` and the Trade screen then say why. The clause's docblock updates the count of clauses. Routes already abroad run out their term (reading 16).
- **`noLuxuryLending`** (behaviour rule). One clause in `dealSideError`, asked of the giver, beside `isLendableResource`.
- **`buysOnlyInScope`** (action rule, with `scope`). One clause in `clausesBeforeTheBank` (`purchase.ts`), asked after the route return and only for a gold purchase of a unit or a building: refuse when the seat holds the rule and the town's scope does not admit it. A new reader, `cardPurchaseScopeRefuses(state, city)`, in the evaluator.
- **`faithfulPeace`** (behaviour rule). One clause in `declareWarError`, asked in both directions: the holder's `heldReligions` includes `cityReligion` of the other seat's capital. The Diplomacy screen and the bot planner ask this function already.
- **State:** no. **Register:** no. **`docs/yields.md`:** no.
- **Describers:** one line each in the rule word table.
- **Bots:** a new `doctrineRuleWorth(effect, ctx)` beside the five deck functions in the `rule` arm. Knobs go in `score.commerce` and `score.devotion`.

### S8: three price lines (The Opera del Duomo, The Court of Rudolf II, The Capitulary of Herstal)

- **`goldContribution`** (`CardRule`). `contributionRate` gains the item, so a row's `building` narrows it. The faith arm's formula: rate `base × 100 / (100 + percent)`, so `percent:100` halves the coins a hammer costs. A Cathedral contribution is not touched.
- **`techPrice`** (`CardRule`), with new fields `techChain`, `notChain` and `techAge` on `CardRulePercentEffect`. A leaf helper in `tech.ts`, `techChainOf(id)`, walks prerequisites once at load and keeps the rows of the age of `id`. A new reader, `cardTechPriceLines(state, playerId, tech)`, gives `explainTechCost` the matching rows for an ordinary technology. They join its card lines, with the same one sum and one multiplication. Charter technologies are left out.
- **`riteCost`** (`CardRule`). `riteCostAhead`: `Math.floor(riteCost(started + ahead) * (100 + percent) / 100)`, using `cardRulePercent`. Every surface already reads that function.
- **State:** no. **Register:** no. **`docs/yields.md`:** no. `ruleRewriteValue` needs one case each, or the typecheck fails.
- **Describers:** the `rulePercent` word table.

### S9: chairs (The Arthashastra, The Council of Ten, Scutage)

- **Refit on taking:** `applyChooseDoctrine` calls `refitSlots(state, actor)` after `forgetTheLaw`. Its docblock's register of seams gains the entry.
- **A negative `slotRider`:** `cardExtraChairs` returns the sum with no clamp. `chairCount` never goes below the government's typed chairs, so a council never loses a typed chair. `slotTypesOf` slices its layout to `sc.slots.length`. Adoption builds to `chairCount` as today. The docblock on `cardExtraChairs` changes: it says no card takes a chair.
- **The chair that counts twice:**
  - `CardSlotPositionEffect` gains `whole?: true`, and `position: -1` means the last chair of the flavour. `orderAtSlotPosition` reads it.
  - `deckModifierLines` skips a `whole` row. `buildLiveEffects` reads it instead: right after the seated Orders, it pushes the chair's card's effects a second time, labelled "Order · X · The Arthashastra". Kinds `slotRider`, `slotPosition` and `metaRule` are left out of the second reading, so a chair count cannot depend on itself and an engine cannot read an engine.
  - A rule with no number holds once, because a flag rule is a yes or a no.
- **State:** no; the chairs are `PlayerStatecraft.slots`. **Register:** no. **`docs/yields.md`:** no; the second reading lands wherever the row's own lines land.
- **Surface:** `deckReadsSlotPosition` also walks `sc.doctrines`, so the screen prints chair positions. The last chair's plate prints "counts twice". No new asset.
- **Describer:** "Your last Wildcard chair counts twice", in the `slotPosition` arm.
- **Bots:** the `slotPosition` arm reads `whole` and leaves `slotRider` out. `reslotDecision` already re-seats by score; it reads the chair's factor.

### S10: read a source again (The Serapeum, The Union of Lublin)

The same family as `legaciesCountTwice`.
- **`godsCountTwice`** (`MetaRuleId`). In `buildLiveEffects`' fourth source, each god's effects are pushed `value` times, labelled "Belief · X · The Serapeum". `periodicOffer` and `offerRider` are left out of the second reading (reading 28).
- **`governmentsOfTier`** (`MetaRuleId`). In the first source, after the held government: `governmentsAtTier(governmentDef(sc.government).tier)`, less the held one, each pushed under its own name with the label "Government · X · The Union of Lublin".
- **One helper:** `legacyReadings`' scan is generalised to `metaReadings(list, rule)`. Note the walk order: the government comes before the Doctrines, so `governmentsOfTier` must be read off `sc.doctrines` directly at that point, and not off the `list` being built.
- **State:** no. **Register:** no. **`docs/yields.md`:** no.
- **Describers:** the `metaRule` arm, as `legaciesCountTwice` has.
- **Bots:** two cases in the `metaRule` arm. The adoption appraisal (`scoreCard` on a government) needs no change, because the Doctrine reads all three governments whichever is adopted.

### S11: the Order hand (The Hospitium, The Jinshi)

- **`thirdCardForeign`** (action rule). `HandPosition` gains `{ kind: 'foreign' }`. `drawHandPositions` writes it in place of the cadence's third position while the rule holds. `drawOrderOptions` gains the foreign bag as an argument and draws that position from it, with the fallback rule 5 keeps. `positionBag`'s switch gains the arm. A rainbow seat's bag is empty, so its third card is the ordinary one. A redraw keeps the position (`OrderOffer.positions`).
- **`rareWeight`** (action rule, `percent:100`). `rarityOdds(skips, rarePercent = 0)` multiplies the rare rung before the spread. `rarityFirstOdds`, `rarityDrawWeight` and `drawRarityFirst` pass it down. `cardRareWeight(state, playerId)` reads the sum. `drawForeignCard` and `value.ts`'s reading of it stay at nought.
- **State:** no; the position is on the offer, in an existing field. **Register:** no. **`docs/yields.md`:** no.
- **Describers:** the rule word table.
- **Bots:** `expectedHandBags` learns `foreign`, and `wants.ts` and `src/main.ts` pass the weight. New arms from `offerRiderWorth`.

### S12: the collection pays (Scutage)

- **`collectionPays`** (behaviour rule, `percent:50`).
- **Reader:** a new source in `buildLiveEffects`, after the Orders and the malices: for each Order in `sc.orders` that holds no chair and is not a charter, push a **halved copy** of each `pays` row with `basis` flat or count, a bag or a `to` in the six voices, and no `percent`, `basePercent`, `wholePercent`, `share` or `stage`. A `conditionRule`'s inner rows follow the same test. `factor` is `percent / 100`, applied to the bag and `amount`.
- **Reading the rule inside the walk:** the Doctrines come before this source, so `buildLiveEffects` scans the list built so far, as `legacyReadings` does. Calling `cardBehaviorRule` there would recurse. The same goes for S9's chair.
- **Why a copy:** every reader of `pays` then works unchanged, the line is labelled ("Order off its chair · X"), and rule 5 holds. Yields are exact decimals (batch X).
- **State:** no. **Register:** `orders` joins `WRITES` in `test/sim/slateRegister.test.ts`, because `liveEffects` now reads it. Its writer, `addToCollection`, takes no state, so `applyChooseOrder` and the other callers announce. A card drafted under Scutage pays from the next fold. `assignCitizens` re-seats at `collectYields`, so no new `refreshCityDerived` entry.
- **`docs/yields.md`:** the convention list gains a bullet: the halved lines land at steps 2, 3, 6, 16 and 18, as the row's own lines would. An amplifier reads them (reading 26).
- **Describer:** one line in the rule word table.
- **Bots:** a new `scutageWorth`: half of what `scoreEffects` gives the same filtered rows, over the seat's bench. The seat logic then has less reason to fill a chair with a flat card.
- **`cardImpact.ts`:** the ghost diff for a seated card under Scutage compares against the benched half, which is correct and needs a test.

### S13: the land (The Georgics, The Wildwood Compact, The Planted Towns, Arcadia)

- **`factor` on `CardWorkAgeEffect`.** `cardWorkAgeFactor` joins `cardWorkAgeBonus`. `GroundFacts.workAgeFactor` joins `workAgeBonus`. `standingSince` becomes `age * factor + bonus`. The town scopes that say `standingTurns` over works already go through this test.
- **`tendedWorksFree`** (action rule). `spendBuilderCharge` and the charge check in the improvement gate (`improvements.ts`, lines 891 and 978) read a price of nought for a row marked `tended`. The improvement panel's charge figure reads the same helper, `workChargeCost(state, unit, id)`.
- **`trainedSettlerCostsCitizen`** (behaviour rule). In `realiseItem`, for a trained unit with `foundsCity` (`!options.free && options.bought === undefined && options.untrained !== true`): `loseCitizen`, then `refreshCityDerived`. **Register:** a new entry, because a production completion can land mid-turn through `settleProductionWindfall`.
- **`tendedCountsImproved`** (behaviour rule). `GroundFacts.tendedImproved: true`. In `tileConditionHolds`, `improved` is true for a tended work and `unimproved` is false. The `workedUnimprovedTiles` count (evaluator line 3155) passes no ground facts today and must start to.
- **State:** no. **`docs/yields.md`:** no; these change what a test answers, and the lines stay.
- **Describers:** the rule word table, and the `workAge` arm.
- **Bots:** `workAge` arm reads `factor`. The rest are new cases in `expansionistRuleWorth`.

### S14: the pair hex/count (The Hydraulic Empire, The Builder Kings)

- **Reader:** `hexRows` passes these rows. `cardTileLines` skips a row with `basis:'count'`, and `scopedCardTileLines(state, city)` takes it: `countOf(state, city.ownerId, card, effect, city)` helpings multiply the bag, as `perEndpointLuxury` does on a road. Nought helpings make no line. So the fact about the town stays in the context built for that town.
- **State:** no. **Register:** no, because the count moves only when a building or wonder is raised, and those already re-seat the town.
- **`docs/yields.md`:** a new register row, `pays` · hex · count · step 2 · additive. `PAYS_PAIRS` in `yieldsDocSync.test.ts` and the expected list in `statecraft.test.ts` gain it.
- **Describer:** the hex arm prints "for each public work in its town", and "for each wonder in its town".
- **Bots:** the `pays` arm prices it as a hex line times the mean count per town.

### S15: the census (The Censors)

- **`citizens` with `toEveryTown`.** The `citizens` grant in `windfallPayout` (evaluator line 9304) gains a branch: with `toEveryTown` it pushes one `payout.citizens` entry per admitted town. `payCensusRiders` then pays them through `settlePopulationWindfall`, which is on the register (entry 13).
- **The count `censusesLed`.** `countOf` reads `state.census.taken`, counting `leaderId === playerId` and `turn >= doctrineTakenTurn(...)`. `recordScalingOccasion` tallies seated Orders only, so a tally cannot serve. Derived, so no state beyond S3.
- **`docs/yields.md`:** no; a `pays` city · count row.
- **Describer:** the count words.
- **Bots:** generic through `countOf`, and the `census` occasion rate.

### S16: a permanent strength (The Ribats, The Nassau Reforms)

- **The birth town.** `createUnit` and `cardUnitStamp` gain an optional `bornIn?: City`, which `realiseItem` passes. A scoped stamp reads `bornIn ?? cityAt(col, row)`. So a unit raised while the town's own hex is full is still "created in" that town. This also corrects the scoped stamps of Drill Manuals and the Tophane, a small live change the schema bump covers.
- **`upgradeStrength`** (behaviour rule, `value:2`). In `upgradeUnits`, beside `upgradeHeals`: add the value to `unit.stamp.strength`. A new reader, `cardUpgradeStrength(state, unit)`, sums the rows that reach the piece.
- **State:** no new field; `Unit.stamp` exists. Its "one writer" docblock gains this second exception. **Register:** no. **`docs/yields.md`:** no.
- **Describer:** "gains +2 strength for good each time research upgrades it".
- **Bots:** `upgradeHeals`' neighbour at `value.ts` line 7506.

### S17: a town converted when it falls (The Ribats)

- **Grant:** `pressure` gains `majority?: true`. `windfallPayout` carries it on the lump, and `payWindfallGrants` hands it to `press`.
- **Reader:** `payBattleRiders`' closure passes it through. `pressLump` gains a last argument. When it is set, the lump reaches the one town at `at` with no `templeShare`, sized as `perConvert × (floor(population / 2) + 1 − followers) − banked`, and `bankPressure` does the converting. `pressLump`'s pinned call counts do not move, and `bankPressure` keeps its two callers.
- **Which religion:** only the first of `heldReligions`, so a seat with two holy cities does not press the town twice against itself. A seat with none presses nothing.
- **Register:** `pressLump` already calls `refreshCityDerived` (entry 14). **State:** no; a town's religion stays derived.
- **`docs/yields.md`:** no.
- **Bots:** existing, as The Crusader Orders' lump is.

### S18: the religion's limits (The Seven Councils, The House of Worship, The Apostolic Camera)

- **`pool` on `CardPantheonSlotsEffect`.** `cardPantheonSlots` skips a row with a `pool`. `poolSlotsFor(state, religion, pool)` adds the rows of `religionFounder`'s law to `poolSlots`. `nextBeliefPool` takes the state. The UI callers and `src/ai/wants.ts` move with it.
- **The faith houses' gate.** `purchaseError`'s `followingOnly` clause also passes when `cardUnlocksBuilding(state, playerId, id, city)` answers yes through a scoped row. The buildings stay `purchaseOnly` with faith.
- **`followerBeliefsPayAbroad`** (behaviour rule). A new loop in `explainCardEmpireYields`: for each town the holder does not own whose `cityReligion` is one of `heldReligions`, read `followerBeliefEffects(state, town)` and push the flat and counted town lines (asked with that town), one labelled line per belief, "The Apostolic Camera · Belief · Town". The owner's fold does not change.
- **`docs/yields.md`:** step 18 gains a clause, and the "rules that pay a voice" paragraph and its pinned ids in `yieldsDocSync.test.ts` gain a fourth id.
- **State:** no. **Register:** no.
- **Describers:** the `pantheonSlots` arm, and the rule word table.
- **Bots:** `pantheonSlots` arm reads `pool`. A new arm for the Camera, from `followingForeign`.

### S19: great people (The Platonic Academy, The Peregrini)

- **`everyWorkIsAcademy`** (action rule). `workOf(state, unit)` answers `academy` for any family with a work while the rule holds. Its six callers pass the state. The Academy still goes through `improvementErrorAt`. A prophet's holy site is a different verb and is not touched.
- **`workCheapensPerson`** (behaviour rule, `percent:20`), and **state, yes:** `Player.personDiscount?: number`, a percent. `greatPersonWorkAt` writes it when the rule holds, and overwrites, so it does not stack. `renownThreshold` applies it after the ladder's arithmetic, floored once. `settleGreatPersonChoice` deletes it, beside `greatPeopleRecruited += 1`. Presence is the state.
- **The hex clause reaches other towns.** `greatPersonWorkAt` calls `refreshTileDerived` for the work's hex only. While the Doctrine is held, a work changes what its six neighbours pay, and another town may work one. So a new helper, `refreshRingDerived(state, tile)`, re-seats each town owning a ring hex while such a line is live. `greatPersonWorkAt`, `removeImprovementAt`, `pillageAt` and `plantHolySiteAt` call it. The register in the `refreshCityDerived` docblock gains the entry.
- **`docs/yields.md`:** no; the line is an ordinary hex line with `perNeighbour`.
- **Describers:** the rule word table.
- **Bots:** `value.ts` reads `workOf`. New arms in `scientificRuleWorth` and `magisterialRuleWorth`.

### S20: a second capital for your cards (The Two Capitals)

- **`secondCapital`** (behaviour rule).
- **Reader:** one function, `cardCapitalIds(state, playerId)` in `statecraft/evaluator.ts`: the seat's `capitalCityOf`, and under the rule its largest other town by citizens, the first in `state.cities` order on a tie. Derived on every ask, and kept on the slate on the economy clock (`loseCitizen` and growth announce). No state. The walk's condition cut (`conditionDepth`) stops a scope asked inside a condition from recursing, and a test holds this.
- **What reads it:** the `capital` and `notCapital` arms of `cityScopeAdmits`, both `where:'capital'` checks (lines 4301 and 4955), the `capitalPopulation` count, the `capitalGreatWorks` scale and `capitalTerritory`. **What does not:** `toCapital` grants (line 10601), a `periodicMuster` (line 9954), the `queueHolds` condition's `where:'capital'` (line 1700), the palace, `explainAuthority`, and `capitalCityOf` itself. The docblock lists both sets.
- **`docs/yields.md`:** no; the lines land where the rows' lines land.
- **Register:** no; the scope is read fresh at each fold.
- **Describer:** one line, and the scope note reads "your capital".
- **Bots:** a new arm: `scoreEffects` over the seat's `capital` rows, once more.

### S21: food along a route (The Grand Canal)

- **`routesCarrySurplus`** (behaviour rule, `percent:50`).
- **Reader:** `explainFoodCarried(state, city, yieldsOf)` in `cities.ts`, a labelled list with one line per route. For an origin, a negative line; for a destination, a positive one. The carried amount is `percent / 100` of the origin's `channelSurplus`, shared evenly over the origin's live domestic routes (`liveRouteCities`, `routes.ts`), and only while the surplus is positive and no mover takes it (`explainSurplusMoved` is empty).
- **`growthSurplus`** becomes `channelSurplus` plus the fold of that list, unless a mover took it. The list never reads a town's fold through a carried line, so a chain does not compound: A to B and B to A each carry half of what the other grew by itself.
- **`collectYields`** passes the first loop's prices, so a town's fold is not read twice. The UI callers (`cityPanel.ts`, `cityBanners.ts`, `tradeScreen.ts`) pass `readCity`.
- **`docs/yields.md`:** a convention bullet: the food carried is outside `foldCity`, on the growth channel. No step changes, and `yieldsDocSync` is not touched.
- **State:** no. **Register:** no; `startRoute` and `cancelRoute` are entries already.
- **Surface:** the growth tooltip (`src/ui/cityPanel.ts`, line 3299) prints the lines beside `explainGrowthPercent`.
- **Bots:** a new arm. `value.ts` reads the surplus moved to the seat's largest towns.

### S22: a levy for a rite (Human Sacrifice, group 3)

- **`every` on `CardLevyEffect`.** `waitFor` reads the smallest `every` in the law. `everyAtWar`, where it is shorter, still wins. The menu prints the wait already.
- **The use `rite`.** `LEVY_USES` gains it, and `planLevy`, `labelFor` and `explainLevyGain` gain arms. `levyOptions` lists one line, "Perform a rite across your empire".
- **The command:** `LevyCitizenCommand` gains `rite?: RiteId`, required and validated when `use` is `rite`, and refused otherwise. `levyError` gains the rite's gate.
- **The act:** `empireRiteAt` is split. `sayRiteOverRealm(state, player, rite)` holds the sweep. `empireRiteAt` is the price, the sweep and the charge. `levyAt` calls the sweep alone, with `loseCitizen`, `recordLevy` and the rest of its own steps. The gate shares `empireRiteGate`'s clauses except the prophet and the bank.
- **UI:** `src/ui/levyMenu.ts` opens a small list of rites under the line, with `riteOfferText` for each, reusing the rite rows' refusals. No new screen.
- **State:** no. **Register:** entry 23 (`levyAt`), and the sweep refreshes each town.
- **`docs/yields.md`:** no.
- **Describer:** one clause for each half. The Compendium prints them.
- **Bots:** `levyDecision` already walks `levyOptions`. `explainLevyGain` picks the best rite by the appraisal `wants.ts` uses for a town rite, times the towns. The bot's command names the rite.

## The batches

**Batches run one at a time in the main tree.** Each lands, passes the batch gate and commits before the next starts.

**The standing fence.** Every batch may also touch these, in addition to its own list:
- `data/decks/<deck>.json`, its `doctrines` map;
- the deck's sheet, `docs/decks/<deck>.md`: the Doctrine rows, the header line and "Open for your pass";
- `docs/orders-and-doctrines.md`, section "## Doctrines": one row for each row built, and none for a row not built;
- `test/fixtures/cardText.json`, rewritten with `CARD_TEXT_WRITE=1`;
- `src/sim/state.ts`: `SCHEMA_VERSION` and its docblock, and the 15 test pins of "Facts", and `test/sim/explore.test.ts`'s digests;
- `test/sim/statecraft.test.ts`: `ORDERS_USING_A_SHAPE`, and the pools if a tier changes;
- `data/ai.json`: knobs in `score.<deck>`.

**The schema rule.** One bump for each batch that changes state or rules. Every batch from DT1 to DT19 does, because a new row changes what a seat is dealt and a log no longer replays: DT1 is 206, and DT19 is 224. DT20 changes no rule and does not bump. The branch migrates nothing, as under v119.

**The standing done-gate for an agent:** its own files typecheck, and `npx vitest run test/sim/doctrineOffer.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/statecraft.test.ts test/sim/decks.test.ts test/sim/decks/<deck>.test.ts test/sim/decks/<deck>Doctrines.test.ts` is green, plus the batch's own tests. The orchestrator runs the batch gate (typecheck, `npm run test`, build). `npm run test:all`, with the `aiDigest` digests moved, is the push gate.

**One new test file per deck,** on the model of `dominionDoctrines.test.ts`: `test/sim/decks/expansionistDoctrines.test.ts`, `commerceDoctrines`, `scientificDoctrines`, `magisterialDoctrines` and `devotionDoctrines`. Each row gets a test that it pays what its text says, in a real fold, and a test for each drawback.

**Which batches are independent:** DT1 comes first, because it moves the test pins and adds the shared sheet reader. DT5 comes before DT12, DT14, DT15 and DT7's Canossa. DT9 comes before DT11. DT20 comes last. Every other order is free. DT2, DT3 and DT4 can swap. DT6, DT8, DT10, DT13, DT16, DT17, DT18 and DT19 share no shape with each other, and any may slip without holding up another.

### DT1: Dominion's changes

- **Rows:** The Steppe Confederacy, The Soldiers' Share, Centurions, The Universal Monarchy, The Consular Roads (to Tier II), The Strategoi (to Tier III), Weight of Numbers and Total Mobilisation (`retired: true`). The two retired rows keep their effects and tier.
- **Shapes:** S1, S2, S3.
- **Fence:** `src/sim/statecraftData.ts` (types), `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts`, `src/sim/statecraft/draft.ts` (`settleDoctrineChoice`), `src/sim/commands.ts`, `src/sim/meters.ts` (the preview, reading 8), `src/sim/state.ts` (`createCity`, the fields), `src/ai/value.ts`, `data/decks/dominion.json`, `docs/decks/dominion.md`, and the tests below. Grep in `src/` for the changed rows' ids before starting; the only hits should be comments.
- **Tests:**
  - **The pins move to rules.** `doctrineOffer.test.ts` filters to Dominion before comparing, and reads its fixtures from the data. `statecraft.test.ts` pools do the same. `decks.test.ts` line 1823 no longer assumes an empty offer for Ada: it lends her a tier with no rows, or asserts the bag by rule.
  - **A shared sheet reader.** `docDoctrines()` moves from `dominion.test.ts` to `test/sim/decks/sortedSheets.ts` as `sheetDoctrines(deck)`. It reads the heading `**Doctrines,** offered with the tier-N governments:`. A new function, `expectSheetDoctrinesMatchData(deck)`, holds the data rows to the sheet in name, tier, text and flavour, with clauses and no `[[`. **A sheet row with no data row passes until DT20,** so a sheet can carry its whole table while batches fill it.
  - **Coverage does not drop.** The old tests of `healWithin`, `rankWithin`, `noFounding`, `borderFreezeExempt` and `upkeepSurcharge` move onto a lent row, through a helper beside `stockDoctrines` (`lendDoctrineEffects(id, effects)`, restored after each test). The shapes stay in the engine (reading 9).
  - New tests in `dominionDoctrines.test.ts`: the mounted line on a wounded unit, not on a whole unit and not on a town. A melee unit's +1 movement and +3 strength. An Elite's rebate down to nought. A town founded before the Doctrine, on the turn of it and after it. A captured town held before the Doctrine costs nothing. The offer's tiers.
- **Bot work:** `upkeepRebate` reads `rank`. No new knob.
- **Sheets and docs:** Dominion's Doctrine tables and counts (3, 4, 3, 3; 13). The header note. The two retired rows leave the mirror.
- **Schema:** 206. State: `City.foundedTurn`, `PlayerStatecraft.doctrineTurns`.

### DT2: Expansionist, data only

- **Rows (11):** Bound to the Soil, The Gift of the River, The Commanderies, Synoecism, Crop Rotation, The Contented City, Empire Without End, The Physiocrats, The Cathedral Lodges, The High Towns, The Mandarinate.
- **Shapes:** none new.
- **Fence:** the standing fence, and `test/sim/decks/expansionistDoctrines.test.ts`, `test/sim/decks/expansionist.test.ts`.
- **Tests:** one per row. Crop Rotation against a tended tile and the town's own hex. The High Towns' neighbour line beside two mountains. The Mandarinate's cap and a capital that stays free.
- **Bot work:** none.
- **Sheets and docs:** the sheet's four headings become `**Doctrines,** offered with the tier-N governments:`. Each Doctrine's text on the sheet is already current. The "Open for your pass" entry on The Builder Kings closes. `expansionist.test.ts` calls `expectSheetDoctrinesMatchData`.
- **Schema:** 207.

### DT3: Commerce and Scientific, data only

- **New field:** `skipsBeadRows` on `productionBonus` (S6, reading 24), for The Academy of Gondishapur. This batch is data only apart from it.
- **Rows (15):** The Apoikia, The Delian League, The Sogdian Colonies, The Year and a Day, The Turnpike Trusts, The Peace of Lodi, The Monte di Pietà; The Pythagorean Brotherhood, The Removal to Xianyang, The Workshops of Syracuse, The Jixian Academy, The Academy of Gondishapur, The Pandidakterion, The Universitas, The Volley Fire.
- **Shapes:** none new.
- **Fence:** the standing fence, and `test/sim/decks/commerceDoctrines.test.ts`, `scientificDoctrines.test.ts`, `commerce.test.ts`, `scientific.test.ts`.
- **Tests:** one per row. The Pandidakterion doubles a hex with a card line on it, and two whole shares on one hex sum. The Universitas' negative share in a small town (no live row has one). The Peace of Lodi's negative route share. The Volley Fire on a Crossbowman and not on a Catapult. The Turnpike Trusts on `explainRoutePrice`. The Pythagorean Brotherhood's Shrine line is in the Shrine's package and not twice in the town.
- **Bot work:** the hex arm of `src/ai/value.ts` learns `wholePercent` (found by DT2). It reads the bag and `percent` and never `wholePercent`, so a bot prices Crop Rotation's drawback at nothing (+201.6 on a test board of mostly farms), and prices nothing for The Cathedral Lodges' doubling, The Strategoi, The Nizamiyya or this batch's The Pandidakterion. Price the share over what the hex pays, for both signs. Add a test: Crop Rotation scores below the same board with the drawback lent away. The Two Sanctuaries reads the same arm.
- **Sheets and docs:** **Scientific gains four Doctrine tables,** one under each of Tiers I to IV, with `**Orders:**` labels on the card tables, and its header line. Commerce's four headings change. Each sheet carries all its Doctrines from here (14 and 15), so its later rows are present with no data row until they are built.
- **Schema:** 208.

### DT4: Magisterial and Devotion, data only

- **Rows (10):** The Choregia, The Periclean Works, The Magnaura, The Barmakids, The Bourgs, The Kitabkhana, The Escorial; The Theoric Fund, The Rites of Zhou, The Saint Peter's Indulgence.
- **Shapes:** none new.
- **Fence:** the standing fence, and `test/sim/decks/magisterialDoctrines.test.ts`, `devotionDoctrines.test.ts`, `magisterial.test.ts`, `devotion.test.ts`.
- **Tests:** one per row. The Choregia's line in a culture building's package. The Kitabkhana by both verbs, through `spendGreatPerson`, at each age. The Theoric Fund at a rate below three and at nine. The Golden Bull's "no Doctrine to offer" test moves to a tier with no rows left, because a Magisterial seat now has some.
- **Bot work:** none.
- **Sheets and docs:** the two sheets carry all their rows. `magisterial.test.ts` lines 822 to 834 are replaced.
- **Schema:** 209.

### DT5: the offer gates, and the rows that need only them

- **Rows (6):** The Garden Peoples, The Patrimony of Peter, The Imarets, The Canons of the Holy Sepulchre, The Martyr's Crown, The Two Sanctuaries.
- **Shapes:** S4.
- **Fence:** `src/sim/statecraftData.ts`, `src/sim/statecraft/draft.ts`, `src/sim/cities.ts` (`doctrineOfferCanOpen`), `src/sim/commissions.ts` (its caller), `src/ai/value.ts`, `src/ui/compendium.ts` (the "Needs" row), and the tests.
- **Tests:** a seat with no held religion is not offered a gated row, and a captured holy city admits it. A tended-work charter admits The Garden Peoples whether seated or not. `doctrineOfferCanOpen` agrees with the draw. The Martyr's Crown presses on a death, and pays nothing with no religion. `pressLump`'s pins do not move.
- **Bot work:** none. The bag is the sim's.
- **Sheets and docs:** `docs/README.md`'s Doctrine paragraph gains the gates (the deck sheets' Gates note covers the words).
- **Schema:** 210.

### DT6: small narrowings

- **Rows (11):** The Highland Clans, The Curator of Waters, All Roads Lead to Rome, The Laurion Leases, The Muda, The Peripatetic School, The Directorate of Arms, The Külliye, The Carroccio, The Gobelins, The Paean.
- **Shapes:** S5, S6.
- **Fence:** `src/sim/statecraftData.ts`, `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts`, `src/sim/cities.ts` (`explainTilePurchase`), `src/sim/renown.ts`, `src/sim/routes.ts`, `src/sim/combat.ts` (`tradeIsShielded`), `src/sim/arrival.ts`, `src/ai/value.ts`, and the tests.
- **Tests:** one per row. The Külliye: a copy in a town with an Academy, none elsewhere, none of the Magnum Opus and none of the three Observatory works. The Muda: a domestic caravan can be plundered, a foreign one cannot, at both seams. The Directorate: a tie holds, a met rival ahead ends it, and an unmet rival ahead does not count. The Laurion Leases: an unseen seam pays the full price. The Peripatetic School: a Library's share, and none on a Market. All Roads: the capital is not charged.
- **Bot work:** the `value.ts` arms named in the table. Scale counts need two arms each.
- **Sheets and docs:** none beyond the standing fence.
- **Schema:** 211.

### DT7: refusals

- **Rows (5):** The Inward Roads, The Sea Ban, The Forbidden Silks, The Flying Money, Canossa.
- **Shapes:** S7.
- **Fence:** `src/sim/trade.ts` (`gateRoute`), `src/sim/diplomacy.ts` (`dealSideError`, `declareWarError`), `src/sim/purchase.ts` (`clausesBeforeTheBank`), the three statecraft files, `src/ai/value.ts`, and the tests. No UI file: each surface prints the refusal it is given.
- **Tests:** each refusal leaves the state byte-identical (hard rule 1). A foreign route already running runs out. A luxury lent before the Doctrine runs out. A town with no gold building is refused a gold unit, not a caravan, not a hex and not a faith purchase. Canossa in both directions, a running war goes on, a capital that turns away lifts it. The bots propose no refused command.
- **Bot work:** `doctrineRuleWorth`.
- **Sheets and docs:** none beyond the standing fence.
- **Schema:** 212.

### DT8: price lines

- **Rows (3):** The Opera del Duomo, The Court of Rudolf II, The Capitulary of Herstal.
- **Shapes:** S8.
- **Fence:** `src/sim/purchase.ts` (`contributionRate`, its two callers), `src/sim/tech.ts` (`explainTechCost`, `techChainOf`), `src/sim/religion.ts` (`riteCostAhead`), the three statecraft files, `src/ai/value.ts`, and the tests.
- **Tests:** the rate on the Opus, and not on a Cathedral. The chain includes Alchemy and its fourth-age parents and no third-age row. A charter technology is untouched. The rite price at an odd rung is floored once. `ritesAffordable` and the Rites tab's "another" figure follow.
- **Bot work:** three `ruleRewriteValue` cases.
- **Sheets and docs:** none beyond the standing fence.
- **Schema:** 213.

### DT9: chairs, and reading a source again

- **Rows (4):** The Council of Ten, The Arthashastra, The Serapeum, The Union of Lublin.
- **Shapes:** S9 (without the negative rider's use), S10.
- **Fence:** the three statecraft files, `src/sim/statecraft/draft.ts`, `src/sim/commands.ts` (`applyChooseDoctrine`), `src/ui/statecraftScreen.ts`, `src/sim/cardImpact.ts`, `src/ai/value.ts`, `src/ai/bot.ts`, and the tests.
- **Tests:**
  - Taking The Council of Ten opens two chairs at once and moves no seated card.
  - The Arthashastra's chair: a card there pays twice in a hex line, a town line and a combat line. A second Doctrine that adds chairs moves "the last chair". A seated `slotRider` card does not change the chair count by being there. A flag rule holds once.
  - The Serapeum: a flat, a percent and a kill rider each count twice. An offer does not.
  - The Union of Lublin: three governments' lines, one government's chairs, one label each.
  - A replay of the log matches (the slate must see the refit). `test/sim/typedChairs.test.ts` stays green.
- **Bot work:** two `metaRule` cases, the `slotPosition` arm's `whole`, and the seat logic.
- **Sheets and docs:** none beyond the standing fence.
- **Schema:** 214.

### DT10: the Order hand

- **Rows (2):** The Hospitium, The Jinshi.
- **Shapes:** S11.
- **Fence:** `src/sim/statecraft/draft.ts`, the three statecraft files, `src/ai/wants.ts`, `src/ai/value.ts`, `src/main.ts` (`passFigure`), and the tests.
- **Tests:** the third card is foreign over a thousand seeds' hands. A redraw keeps the position. A rainbow seat is unchanged. The rare odds are about 55 / 27 / 18 and the pity still moves points. The Cabinet of Curiosities' draw does not change. `rarityFirstOdds` agrees with the draw.
- **Bot work:** `expectedHandBags`, `expectedBestOrder`.
- **Sheets and docs:** none beyond the standing fence.
- **Schema:** 215.

### DT11: Scutage

- **Rows (1):** Scutage.
- **Shapes:** S12, S9's negative rider.
- **Fence:** `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/draft.ts` (`cardExtraChairs`' caller, `slotTypesOf`), `src/sim/statecraft/describers.ts`, `src/sim/cardImpact.ts`, `docs/yields.md`, `test/sim/slateRegister.test.ts`, `src/ai/value.ts`, `src/ai/bot.ts`, and the tests.
- **Tests:** a flat and a counted line pay half off the chair, and full on it. A percentage, a combat line, a rider and a commission pay nothing off it. A charter pays nothing. The Wildcard chair goes, and its card returns to the collection. An amplifier reads the halved line. A hex line pays half, in a real fold. The memo sees a draft (slate shadow on).
- **Bot work:** `scutageWorth`.
- **Sheets and docs:** `docs/yields.md`'s bullet.
- **Schema:** 216.

### DT12: the land

- **Rows (4):** The Georgics, The Wildwood Compact, The Planted Towns, Arcadia.
- **Shapes:** S13.
- **Fence:** the three statecraft files, `src/sim/improvements.ts`, `src/sim/cities.ts` (`realiseItem`, the register docblock), `src/ui` (only the charge figure's reader, if it does not already ask the helper), `src/ai/value.ts`, and the tests.
- **Tests:** a work twenty real turns old and one ten turns old under The Georgics, and Break the Sod's bonus beside it. A tended work spends no charge and a farm does. A new worker has one charge less and an old worker does not. A trained settler takes a citizen, a bought one and a levied one do not, and the town is re-seated. Arcadia: a tended hex answers `improved` for a card line, a count and Crop Rotation.
- **Bot work:** `expansionistRuleWorth` cases.
- **Sheets and docs:** none beyond the standing fence.
- **Schema:** 217.

### DT13: town counts on a hex, and the census

- **Rows (3):** The Hydraulic Empire, The Builder Kings, The Censors.
- **Shapes:** S14, S15.
- **Fence:** the three statecraft files, `src/sim/census.ts` (no change expected; the grant path is in the evaluator), `docs/yields.md`, `test/sim/yieldsDocSync.test.ts`, `src/ai/value.ts`, and the tests.
- **Tests:** hexes of two towns with different public works pay differently. A Manufactory's line with two wonders in the town working it. A census in which the seat leads and one in which it does not. A census led before the Doctrine does not count. Puppet towns gain the citizen. The city panel's hex tooltip prints the line.
- **Bot work:** the `pays` arm's hex/count.
- **Sheets and docs:** `docs/yields.md`'s register row.
- **Schema:** 218.

### DT14: a permanent strength

- **Rows (2):** The Nassau Reforms, The Ribats.
- **Shapes:** S16, S17.
- **Fence:** `src/sim/state.ts` (`createUnit`), `src/sim/cities.ts` (`realiseItem`), `src/sim/tech.ts` (`upgradeUnits`), `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts`, `src/sim/religion.ts` (`pressLump`), `src/sim/combat.ts` (`payBattleRiders`), `src/ai/value.ts`, and the tests.
- **Tests:** +3 for a unit trained, bought and granted in a devout town, and for one pushed off the town's own hex. Not for one raised in a town that follows nothing. The stamp survives an upgrade. +2 once for a two-rung climb. A conquest under a rival's Temple turns the majority on the same turn, and each of the two capture paths does it. A seat with no religion presses nothing. `religion.test.ts`'s pins do not move. A scoped stamp's existing rows still pass.
- **Bot work:** the arm beside `upgradeHeals`.
- **Sheets and docs:** none beyond the standing fence.
- **Schema:** 219.

### DT15: the religion's limits

- **Rows (3):** The Seven Councils, The House of Worship, The Apostolic Camera.
- **Shapes:** S18.
- **Fence:** `src/sim/religion.ts`, `src/sim/purchase.ts`, the three statecraft files, `src/ui/faithReading.ts`, `src/ui/bonusesTab.ts`, `src/ai/wants.ts`, `src/ai/value.ts`, `docs/yields.md`, `test/sim/yieldsDocSync.test.ts`, and the tests.
- **Tests:** a founder's fourth follower belief and third enhancer, in order, and a seat holding two religions gains them in each. A Mosque in a devout town with no such belief, and not in a town that follows nothing. A Camera line for each foreign town and belief, the owner's fold unchanged, none for a town of your own, none for hex lines.
- **Bot work:** the `pantheonSlots` arm, and the Camera arm.
- **Sheets and docs:** `docs/yields.md`, step 18 and the rule list.
- **Schema:** 220.

### DT16: great people

- **Rows (2):** The Platonic Academy, The Peregrini.
- **Shapes:** S19.
- **Fence:** `src/sim/greatPeople.ts`, `src/sim/renown.ts`, `src/sim/state.ts` (`Player`), `src/sim/improvements.ts`, `src/sim/religion.ts` (the ring's re-seat), `src/sim/cities.ts` (register docblock), `src/ui/controls.ts`, `src/ai/bot.ts`, `src/ai/value.ts`, the three statecraft files, and the tests.
- **Tests:** each family lays an Academy, and the citadel's claim does not fire. Hexes beside one work and beside two. A town working a ring hex re-seats when another town's person lays the work. Two works do not stack the discount. The next person spends it, however called. The threshold floors once. A prophet's holy site gives no discount.
- **Bot work:** arms named in the table.
- **Sheets and docs:** none beyond the standing fence.
- **Schema:** 221. State: `Player.personDiscount`.

### DT17: The Two Capitals

- **Rows (1):** The Two Capitals.
- **Shapes:** S20.
- **Fence:** `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts`, `src/sim/slate.ts` (the tenant, if one is used), `src/ai/value.ts`, and the tests.
- **Tests:** a capital card pays both towns. The second town changes when another overtakes it, on a tie by `state.cities` order, and never at a stale reading (slate shadow on). A `toCapital` grant goes to the true capital. The growth line skips both. Rows that name `notCapital` (Synoecism, The Mandarinate) skip both. The palace's yield stays in one town.
- **Bot work:** the new arm.
- **Sheets and docs:** none beyond the standing fence.
- **Schema:** 222.

### DT18: The Grand Canal

- **Rows (1):** The Grand Canal.
- **Shapes:** S21.
- **Fence:** `src/sim/cities.ts`, `src/sim/yields/empire.ts`, `src/sim/routes.ts`, `src/ui/cityPanel.ts`, `src/ui/cityBanners.ts`, `src/ui/tradeScreen.ts`, the three statecraft files, `docs/yields.md`, `src/ai/value.ts`, and the tests.
- **Tests:** half moves, and the sum across the realm does not change. Two routes share the half. A to B and B to A carry each other's own surplus and do not chain. A deficit carries nothing. A foreign route carries nothing. Under The Laws of Lord Shang the mover wins. The panel's figure equals what the basket gains. `moduleCycles` stays green (`cities.ts` does not import `trade.ts`).
- **Bot work:** the new arm.
- **Sheets and docs:** `docs/yields.md`'s bullet.
- **Schema:** 223.

### DT19: Human Sacrifice

- **Rows (1):** Human Sacrifice.
- **Shapes:** S22. Group 3: a new choice in the levy menu.
- **Fence:** `src/sim/levies.ts`, `src/sim/religion.ts` (the split), `src/sim/commands.ts` (`LevyCitizenCommand`, `applyLevyCitizen`), `src/ui/levyMenu.ts`, the three statecraft files, `src/ai/value.ts`, `src/ai/bot.ts`, and the tests.
- **Tests:** the capital may, another town may not. A refused rite leaves the state byte-identical. Every town keeps the rite, the citizen goes, no faith leaves and no prophet is needed. The rite price rises by the towns reached. A rite that acts at once is refused. Every levy's wait is two, and a shorter `everyAtWar` wins. The menu's rite list. A bot takes the levy when it is worth more than the citizen. A replay matches.
- **Bot work:** `explainLevyGain`.
- **Sheets and docs:** `docs/README.md`, the levy section.
- **Schema:** 224.

### DT19b: bot prices

Added 2026-11-05 by the orchestrator, from what DT3 and DT4 found. Each of these is old code that prices existing Orders too, so one batch re-prices them together, before the closing sweep. The batch re-reads `value.ts` and fixes the root of each. The review's `aiDigest` digests move at the push gate as usual.

- **`scorePayout` counts towns twice.** `realizedCount` sums the towns' counts, then `scorePayout` multiplies by `townsAdmitting`. With three towns of one Monument each, The Choregia's town line scores 405, and the right figure is 135. DT4 read 42 live lines on the same path (`where:'city'`, `within:'city'`, a flat amount), including The Repertory and The Temple of the Muses. This is the largest of the three.
- **`occasionRate('completion')` ignores `wonder: true`.** It counts every building and unit, so The Escorial, The Unveiling, Sacred Commissions and The Golden Age are priced as if each completion were a wonder.
- **The hex arm's `percent` half uses a nominal yield.** It reads 33.6 per improved hex, whatever the work pays, so Crop Rotation stays positive on most boards. A wild hex costs only 11.2.
- **The Canons of the Holy Sepulchre (0.6) and The Martyr's Crown (0.1)** price near nothing on a built board (found by DT5), so a bot takes them only when nothing better is offered. See whether a small honest reading fits; a bot passing a narrow card is not a bug.
- **The Curator of Waters and The Gobelins** (found by DT6). The Curator's town line is on the `scorePayout` path above, and reads 884 for a 17-town seat at turn 120. The Gobelins prices its Opus bonus as if every town's hammers go to the Opus. The Laurion Leases scores 0 for a seat that has never bought a hex, because the arm's rate is purchases per turn.
- **The Opera del Duomo, The Court of Rudolf II and The Capitulary of Herstal** (found by DT8). The Opera scores -50: its rate is 0 until a town raises the Opus, and its -25% is read as if every town's hammers go to the Opus, the same fault as The Gobelins. The Court scores 3128 (chain +3275, the rest -147) against -173 to +13 for other Tier IV rows, through `gapSavingWorth`'s lump reading. The Capitulary scores 0.2 on a board keeping no seasons.
- **The Hospitium and The Jinshi** (found by DT10). In one probe game (seed 77, standard map, six seats, 130 turns) nobody took either row. The arms read about -15 to +11, and rows beside them read in the hundreds or thousands by turn 70. The chain matches `offerRiderWorth`, so look at that scale. The first reading of The Hospitium also took 0.5 s at turn 110, because the foreign bag is priced card by card; a holder's draft plan prices that bag each sitting too, and nobody has measured that.
- **The land rows** (found by DT12). The Georgics' own hex line prices at nought, because `groundOfHexLine` passes no clock; a fix would re-price every age line. `unitRoleValue` in `bot.ts` charges "the citizen it costs this town" on every settler, though a settler costs a citizen only under The Planted Towns, so without the Doctrine that charge is stale. `src/ai/plan.ts` line 1002 reads `chargeCost` directly; no tended row reaches it today. A bot lays no tended works, so The Wildwood Compact reads about -25 to -60 and Arcadia reads 0.
- **Tests:** a test for each on a built board, with the right figure stated. Report the five rows that moved most in a seeded six-seat game, as DT3 did.
- **Fence:** `src/ai/value.ts`, `src/ai/bot.ts`, `src/ai/plan.ts`, `data/ai.json`, and the bot tests.
- **Schema:** none. This changes no rule, though the bots' choices change, so `aiDigest` moves.

### DT20: closing

- **Rows:** none.
- **Builds:**
  - `expectSheetDoctrinesMatchData` becomes strict: a sheet row must have a data row, in all six tests.
  - `docs/README.md`: the Doctrines paragraph and the "all sixteen" line.
  - `docs/design-notes.md`, and the flags entry that says the build is done.
  - Each `docs/plans/*-doctrines.md` status line, and the sheet headers.
  - The bots' stand-ins left at `score.unknownEffect` are listed in this plan's follow-ups.
  - `docs/orders-and-doctrines.md`, "The draw is rarity-first": a clause for The Hospitium and The Jinshi.
  - A government offer prints the chairs the seat would have: `slotWords`, `offerChairsOf` and the bots' offices add the Doctrines' riders (see Follow-ups).
- **Measure:** a turn-100 and a game-length bot sweep, because every seat now answers Doctrine offers. Report it to the user as the usual row. Look at offers passed by bots, and at a stuck End Turn.
- **Fence:** docs and the six deck tests, plus `src/main.ts`, `src/ai/bot.ts` and their tests for the offer's chairs.
- **Schema:** none.

## Readings

Each gives the reading the build uses, then the alternative where it matters. Readings 1 to 3 are the user's answers.

1. **The Arthashastra's "it"** (the user's answer, 2026-11-05). The card seated in the extra Wildcard chair counts twice.
2. **Human Sacrifice's price** (the user's answer, 2026-11-05). The citizen is the whole price, with no faith and no prophet, and the rite reaches every town the seat holds.
3. **The Turnpike Trusts' tier** (the user's answer, 2026-11-05). Tier III.
4. **"Counts twice" means every effect, except what cannot be doubled.** The Arthashastra's card is read a second time, as `legaciesCountTwice` reads a legacy: flats, percentages, combat lines, riders and counts. A flag rule holds once. `slotRider`, `slotPosition` and `metaRule` are not read again. The alternative is The Grand Vizier's `slotPosition` as it stands, which doubles flat town and empire lines only. That would make "counts twice" mean "pays its yields twice", which the user did not write.
5. **"The chair" is the last Wildcard chair of the council.** Extra chairs are appended, and the screen marks it. If a seat holds The Council of Ten as well, the mark sits on the last of them. Scutage's lost chair moves it back one. So the card can move if a Doctrine is taken, and the screen shows that.
6. **The Universal Monarchy's stamps** (spec). A town founded on or after the turn the seat took the Doctrine doubles. `foundedTurn` is new (S3). A town the seat founded, lost and retook is `captured` and costs nothing, as any captured town does.
7. **A positive `cityCost` delta does not charge the capital.** Synoecism, The Mandarinate and All Roads Lead to Rome keep the capital free, as it is today. So their scopes say `notCapital` or `notConnected`. The alternative charges a capital 1 or 2, which the floor would allow and no text asks for.
8. **The founding preview.** `prospectAuthorityCost` reads no `cityCost` row today, so a founded town's preview understates its price under The Universal Monarchy, Synoecism, The Commanderies and The Mandarinate. A preview that disagrees with the meter is a lie the code's docblock says it never tells. **DT1 adds `cardProspectCityCost(state, playerId)`** (`statecraft/evaluator.ts`, read in `prospectAuthorityCost`): it applies the rows with no scope, and the rows whose scope a town not yet founded can answer: `notCaptured`, `foundedSince` and `notCapital`, inside an `all`. A row with any other scope stays out, because it needs a town, and the preview says so by leaving the line out, as it does today.
9. **Shapes with no live row stay in the engine.** After DT1, `healWithin`, `rankWithin`, `noFounding` and `borderFreezeExempt` have no dealt row. `upkeepSurcharge` keeps retired rows, so the kind register passes. Deleting them is a tidy job for later. Their tests stay, on a lent row. The user rewrote these cards, and may want the shapes back.
10. **The Steppe Confederacy's whole text is replaced.** The comment says "revise", and gives the full new card. Its border freeze rule goes. "Wounded" is below full health, and a town is not a wounded unit.
11. **Centurions costs 1 less, floored at nought for each piece** (`Math.min(off, cost)`, `cardUpkeepRebateLines`).
12. **The Consular Roads and The Strategoi keep their effects and flavour.** So does The Universal Monarchy's flavour.
13. **The sheet's Build column** for the four proposal decks is the proposal's Theme cell.
14. **A gate prints no words on the row's text.** The rows of record carry "Needs tended land." where the user wrote it, and the Devotion rows do not say "Needs a religion." The text stays the user's. The Compendium prints a "Needs" row off the field. The offer never shows a gated card to a seat that fails it.
15. **"Needs a religion" means the seat holds one at the offer**, through `heldReligions`, so a captured holy city counts (Devotion proposal, question 3). It reaches ten rows, not eleven, because The Capitulary of Herstal no longer needs one. A seat that later loses its religion keeps the Doctrine.
16. **Bans bind new acts only.** The Sea Ban and The Inward Roads refuse a new foreign route, and one already abroad runs out its term. A renewal counts as a new act (DT7): a route with renewal on would otherwise never end. The Forbidden Silks refuses a new loan, and a standing deal runs out (Commerce proposal, question 2; Expansionist proposal, question 6).
17. **The Flying Money concerns gold.** A faith purchase is a different bank and stays open, and its discount is gold only. A caravan and a hex stay open everywhere, as the proposal says. The text says "buy" and does not name a bank, so the alternative is to refuse faith too.
18. **The Laurion Leases and the sight gate.** A hex with a resource the seat cannot see costs the full price, or a cheap price would reveal the seam. `hasResource` already answers this way.
19. **The Muda** (spec). Melee and shot alike, at both seams, on a route that ends abroad. A war still ends the route.
20. **The Sogdian Colonies** (spec). Your own post in your own town, by the existing `holdsPost` scope, so a town pays once. The scope follows `cityPostPays`, so a blockaded town pays nothing that turn.
21. **The Grand Canal's half.** A town sends half its surplus in all, shared evenly over its live domestic routes. A town with five routes does not send more. A mover (The Laws of Lord Shang, The Breadbasket) wins, and such a town carries nothing. The destination banks the food whatever its own queue holds. If its own surplus is negative, the food offsets the deficit. It is one list and one fold. (Commerce proposal, question 3: keep it beside The Grain Barges.)
22. **The Opera del Duomo** applies to the Magnum Opus only, not a Cathedral contribution, because the text names it.
23. **The Peripatetic School.** The share is of the recurring lines of science-category buildings and of every wonder, per town, and names no family, as a share never does. A wonder's one-time renown is not touched. A science wonder counts once.
24. **Empire buildings and the Magnum Opus** (the orchestrator's change to this plan, to report to the user). "+20%" and "+50% production toward empire buildings" (The Academy of Gondishapur, The Külliye) do not reach the Magnum Opus or its three works, through `skipsBeadRows` on `productionBonus`. Reaching them would give a Scientific seat +70% toward the Opus, which changes the race for the win, and the comments do not ask for it. The Many Hands and Learned Commissions still reach them, as they do today. If the user wants it, remove the field from the two rows.
25. **The Külliye's limit.** It does not lift the limit on the Magnum Opus or the three Observatory works, the spec's "its works", marked by their bead grant. The Second Seat does not change. A town still holds one copy. Each copy of a town-scoped building pays in its own town, and a row read at the empire's scale (the Bourse, the Imperial Throne) still pays once, as `buildLiveEffects` reads one per row.
26. **Scutage** (Magisterial proposal, question 2). Half of the flat and counted lines that pay food, production, gold, science, culture or faith. Not happiness, authority, renown, percentages, combat lines, riders, rules or commissions. An unseated card counts what it counts as if seated. A grower pays half of what it has banked. An amplifier reads the halved line, because it is an Order's line.
27. **The Hospitium** takes the third position in every hand, whatever the cadence says (Magisterial proposal, question 3). A card taken this way fits the chair of its type.
28. **The Serapeum** does not double an offer (the proposal's reading). So `periodicOffer` and `offerRider` are read once.
29. **The Union of Lublin** adds abilities and no chairs. Under The Arthashastra's other reading, the held government would count twice and the others once.
30. **The Peregrini** (spec). Two works give +2 food and +2 production, by `perNeighbour`. The hex clause reads `greatWork`, so a holy site counts, as `The Bourgs` and The Gobelins count it. The discount needs `greatPersonWorkAt`, so a prophet's holy site gives none, as it pays no work-laid riders today. Any next person spends the discount, however called.
31. **The Platonic Academy** (Scientific proposal, question 7). Acts do not change. A general's Academy claims no hexes. Works already laid stay. Holy sites stay.
32. **The Nassau Reforms** gives +2 for each `upgradeUnits` climb, so a piece that climbs two rungs in one step gains +2 once. The text says "each time research upgrades one of your units".
33. **The Two Capitals.** The second town is the largest by citizens, the first in `state.cities` on a tie, read fresh each time. "For your cards" covers the `capital` and `notCapital` scopes, `where:'capital'` rows, the capital's citizens count and `capitalTerritory`. A one-time `toCapital` grant stays at the true capital, because one grant has one place to land. The palace, the authority ladder and the government rules do not change (Scientific proposal, question 2).
34. **The Ribats** (spec). "Created" is `realiseItem`'s every path. A piece from `createUnit` with no town (a ruin's escort) gets nothing. "Converts" presses only the first religion of `heldReligions`. It overrides a Temple's share, because the user's "however much pressure others held" is the point. A town ceded in a treaty is not conquered, and does not convert.
35. **Canossa** (Devotion proposal, question 1). Both directions, "your religion" through `heldReligions`, and a running war goes on. Barbarians do not count. It is asked at each declaration, so a capital that turns away lifts it at once.
36. **The Apostolic Camera** (Devotion proposal, question 2). The town lines only, flat and counted, with no hex lines and no percentages, one labelled line per belief and town. The owner keeps its pay.
37. **The Seven Councils.** The ladder stays one: follower first, then enhancer. A seat holding two religions gains the slots in each (the proposal's reading).
38. **The Capitulary** (spec). Halves the price `riteCostAhead` shows, floored once. It includes rites that act at once, because the text says "rites".
39. **The Theoric Fund** reads this turn's `faithPerTurn`, as The Learned Clergy does, in whole helpings of three.
40. **The Rites of Zhou** (spec). Pays in the town. Any rite counts, and an empire rite is one in every town.
41. **Bound to the Soil and The Wildwood Compact.** A worker's charges are set at birth (`cardExtraCharges`), so existing workers do not change. "Tended works cost no charge" means the rows marked `tended`, not The Two Harvests' fields. The sum of the two Doctrines cancels, as intended. `chargesLeft` floors at one, a guard no row reaches today.
42. **The Georgics.** The factor doubles real age before Break the Sod's bonus. So its own twenty-turn clause is reached after ten real turns.
43. **The Hydraulic Empire** (Expansionist reading 5) and **The High Towns** (reading 6). A hex with fresh water gains per public work in the town working it, six at most. A hex beside two mountains gains +2. Farms the law waters count, through `GroundFacts.watered`.
44. **The Builder Kings.** "In the town working them" is the context's town. A wonder counts, not the Magnum Opus, through `isWonder`.
45. **The Highland Clans** (spec). A hill hex beside any town's centre, worked by the town that works it. It loses its old +2 production.
46. **The Gift of the River** (spec). `river` is a river on an edge of the hex. A lake's shore is not.
47. **The Planted Towns.** Only a trained settler takes the citizen. A bought one, a levied one and a free one do not. The town keeps at least one citizen, and `minCityPop` is two.
48. **The Censors** (Expansionist reading 2). "Lead" is `censusLeaderOf`. The citizen comes with no growth riders, and counts toward the town's largest size. Every town gains, puppets too. The happiness counts censuses led after the Doctrine is taken, and one happiness a town for each.
49. **Human Sacrifice's wait** reads the shortest rule in the law, and applies to every levy use, as the text says "your towns". The rite is a season: a rite that acts at once is refused, as it is for a prophet. The capital must still have two citizens. The rite price rises by the towns reached, as a prophet's does.
50. **The Mandarinate** (Expansionist question 2). It keeps paying science and culture from the meter.
51. **Doctrine flavour lines** are this plan's, in Appendix A, in the decks' voice. The Steppe Confederacy and The Soldiers' Share gain new ones, because their rules changed. Numbers do not appear in them (hard rule 7).

## Questions for the user

None. The user answered the spec's three questions (readings 1 to 3).

## Follow-ups

- **Crop Rotation is still overpriced by the bots** (found by DT3). Its upside is the `percent` half of the hex arm, which uses a nominal yield: 33.6 per improved hex, whatever the work pays. A wild hex costs only 11.2. So the card stays positive on most boards. A fix would move every row with a hex `percent`, so it belongs to a bot batch that re-prices that arm.
- **A spade with no other job walks on to a dug hex** (found by DT2). `reaskTheMarch` drops a stand-down by its clause "A stand-down never cancels a march", so a re-asked worker with truly nothing else to do keeps a route that ends on a hex another spade has improved. It is old behaviour and small. A later bot batch can drop such a route.
- **Bots left on stand-ins.** `workMountains`, `secondAttack`, `buildsEverywhere` and `foreignTradersUnplunderable` price at `score.unknownEffect` today, as their Order versions do. DT20 lists them, and a later bot batch can price them.
- **Government offers ignore Doctrine chairs** (found by DT11). `slotWords` and `offerChairsOf` in `src/main.ts`, and the offices in `bot.ts`, read the government's own chairs. Under The Council of Ten they understate the chairs, and under Scutage they overstate them by one. DT20 fixes this.
- **Dead shapes.** After DT1, `healWithin`, `rankWithin`, `noFounding` and `borderFreezeExempt` have no dealt row (reading 9).
- **The offer's mix.** The offer's "one from each deck, then a third from either" is still the interim rule of `docs/plans/chairs-build.md`. With 98 rows the bag is full, and the user may rule on it after a playtest.
- **The review page.** The Doctrines tab of the review page shows these rows. It needs a refresh when DT20 lands, with the three readings marked.

## Counts

**By group and deck:**

| Deck | Group 1, no change | Group 1, to build | Group 2 | Group 3 | All |
|---|---|---|---|---|---|
| Dominion | 7 | 3 | 3 | 0 | 13 |
| Expansionist | 0 | 11 | 12 | 1 | 24 |
| Commerce | 0 | 7 | 7 | 0 | 14 |
| Scientific | 0 | 8 | 7 | 0 | 15 |
| Magisterial | 0 | 7 | 9 | 0 | 16 |
| Devotion | 0 | 3 | 13 | 0 | 16 |
| **All** | **7** | **39** | **51** | **1** | **98** |

**By batch:**

| Batch | Rows | What | Schema |
|---|---|---|---|
| DT1 | 6 | Dominion's changes (6 rows, and 2 retired) | 206 |
| DT2 | 11 | Expansionist, data only | 207 |
| DT3 | 15 | Commerce and Scientific, data only | 208 |
| DT4 | 10 | Magisterial and Devotion, data only | 209 |
| DT5 | 6 | The offer gates | 210 |
| DT6 | 11 | Small narrowings | 211 |
| DT7 | 5 | Refusals | 212 |
| DT8 | 3 | Price lines | 213 |
| DT9 | 4 | Chairs, and reading a source again | 214 |
| DT10 | 2 | The Order hand | 215 |
| DT11 | 1 | Scutage | 216 |
| DT12 | 4 | The land | 217 |
| DT13 | 3 | Town counts on a hex, and the census | 218 |
| DT14 | 2 | A permanent strength | 219 |
| DT15 | 3 | The religion's limits | 220 |
| DT16 | 2 | Great people | 221 |
| DT17 | 1 | The Two Capitals | 222 |
| DT18 | 1 | The Grand Canal | 223 |
| DT19 | 1 | Human Sacrifice | 224 |
| DT20 | 0 | Closing: strict sheets, docs, a bot sweep | none |
| No work | 7 | Dominion rows with no change | |
| **All** | **98** | | |

**The chain of new shapes:** 22 families (S1 to S22). State changes in three: `City.foundedTurn`, `PlayerStatecraft.doctrineTurns` and `Player.personDiscount`.

## Appendix A: flavour lines

The `flavor` field of each row, in the deck's voice. The other eleven Dominion rows keep the flavour they have.

| Deck | Doctrine | Flavour |
|---|---|---|
| Dominion | The Steppe Confederacy | The riders go first to whatever has already begun to bleed. |
| Dominion | The Soldiers' Share | The spear carries the empire, so the spear eats first. |
| Expansionist | Bound to the Soil | The serf goes with the field, and the field goes on. |
| Expansionist | The Gift of the River | The river gives the valley, and the desert keeps the rest. |
| Expansionist | The Highland Clans | Every glen has its chief, and every chief has a hill. |
| Expansionist | The Commanderies | Write the county on the map first. The settlers can catch up. |
| Expansionist | The Georgics | An old field remembers every season it has been given. |
| Expansionist | Synoecism | Many villages walked down the hill and woke as one city. |
| Expansionist | The Curator of Waters | He counted every pipe in the city, and found who had been stealing. |
| Expansionist | Human Sacrifice | The gods ask for the best the city has, and the city keeps count. |
| Expansionist | The Censors | Stand up and be counted. The state will remember that you did. |
| Expansionist | The Wildwood Compact | Take only what the wood can spare, and it will spare a little more. |
| Expansionist | Crop Rotation | Wheat, then beans, then rest. The field keeps its own calendar. |
| Expansionist | The Contented City | A full granary quiets a crowd. An empty treasury pays for it. |
| Expansionist | The Builder Kings | The king's name is on the stones. The masons' town is under them. |
| Expansionist | Empire Without End | To these I set no bounds of place or time. |
| Expansionist | All Roads Lead to Rome | Every milestone on the road counts the distance home. |
| Expansionist | The Planted Towns | The lord draws the streets on parchment, and the people arrive by autumn. |
| Expansionist | The Garden Peoples | What looks like wild forest to a stranger is someone's grandmother's orchard. |
| Expansionist | The Physiocrats | All wealth comes from the land, said the men who owned it. |
| Expansionist | The Hydraulic Empire | Whoever holds the sluice gate holds the province. |
| Expansionist | The Cathedral Lodges | The masons' lodge outlives the mason, and sometimes the bishop. |
| Expansionist | The High Towns | Terraces climb where the map says nothing can grow. |
| Expansionist | The Mandarinate | A quiet province leaves the examiner time to read. |
| Expansionist | The Inward Roads | The king's runners carry everything on these roads except a merchant. |
| Expansionist | Arcadia | The shepherds never called it a garden. They only kept it. |
| Commerce | The Apoikia | The mother city pays for the ship and forgets the rest. |
| Commerce | The Laurion Leases | The city sold the right to dig, and never the hill. |
| Commerce | The Delian League | Every island pays in ships or in silver, and the fleet collects both. |
| Commerce | The Grand Canal | The south grows the rice, the north eats it, and the barges do the rest. |
| Commerce | The Sogdian Colonies | In every town on the road there is a cousin who keeps the books. |
| Commerce | The Forbidden Silks | The customs men searched the envoy's baggage and kept the purple. |
| Commerce | The Flying Money | Leave your coin at the capital and draw it at the frontier. Paper flies lighter. |
| Commerce | The Year and a Day | Stay a year and a day, and the lord's bailiff no longer knows your name. |
| Commerce | The Muda | The galleys sail in convoy, and the state insures the pepper. |
| Commerce | The Turnpike Trusts | Pay at the pike, and the road will still be there next winter. |
| Commerce | The Sea Ban | Not a plank may put to sea, and the canal has never been busier. |
| Commerce | The Peace of Lodi | The captains went home, and the bankers opened their books. |
| Commerce | The Opera del Duomo | The wool guild pays for the dome, and the wool guild checks the bill. |
| Commerce | The Monte di Pietà | A city that lends to its poor sleeps better than one that does not. |
| Scientific | The Pythagorean Brotherhood | All is number, and the numbers are kept inside the temple walls. |
| Scientific | The Removal to Xianyang | Bring the great families to the capital, and the provinces will stay quiet. |
| Scientific | The Workshops of Syracuse | The tyrant paid the best wage in Greece, and got the first catapult. |
| Scientific | The Peripatetic School | The master walked, the pupils followed, and the argument never sat down. |
| Scientific | The Jixian Academy | The scholars copy the old books, and the court reads the new ones first. |
| Scientific | The Academy of Gondishapur | Athens closed its schools, and Persia opened its doors. |
| Scientific | The Pandidakterion | The emperor pays for the chairs and expects to hear the truth from them. |
| Scientific | The Directorate of Arms | New arsenals, new recipes, and a small army that stays ahead. |
| Scientific | The Universitas | Masters and students make a guild, and the guild needs a great city around it. |
| Scientific | The Volley Fire | One rank shoots, one rank draws, one rank steps up. The rain does not stop. |
| Scientific | The Külliye | The mosque, the school, the hospital and the kitchen share one wall. |
| Scientific | The Court of Rudolf II | The emperor's alchemists work late in the castle, and the empire waits. |
| Scientific | The Platonic Academy | Merchant, painter and soldier sit down together, and all of them are students. |
| Scientific | The Nassau Reforms | Drill the regiment, refit the regiment, and keep the men who have learned. |
| Scientific | The Two Capitals | One court in the north and one in the south, and a ministry for each. |
| Magisterial | The Arthashastra | A king has no friends, only offices, and the manual lists them all. |
| Magisterial | The Hospitium | Each house keeps half a bronze token, and the stranger brings the other half. |
| Magisterial | The Choregia | The rich man pays for the chorus, and the city remembers the name on the monument. |
| Magisterial | The Periclean Works | The marble needs a mason, the mason needs a smith, and all of Athens is at work. |
| Magisterial | The Magnaura | The palace pays the masters, and the masters train the palace. |
| Magisterial | The Jinshi | Thousands sit the examination, and a handful are presented. |
| Magisterial | The Barmakids | The vizier's house fed poets, physicians and the first paper mill. |
| Magisterial | The Peregrini | The monk walks out past the last farm, and the farms follow him. |
| Magisterial | The Council of Ten | Set up for one emergency, and never once dismissed. |
| Magisterial | Scutage | Those who stayed at home still paid the crown. |
| Magisterial | The Bourgs | Build an abbey, and in a generation there is a street outside its gate. |
| Magisterial | The Carroccio | The city's altar rolls into battle on an ox cart, and no one may retreat past it. |
| Magisterial | The Union of Lublin | A king, a senate and a chamber of envoys, and each was sure it ruled. |
| Magisterial | The Kitabkhana | The old master goes blind, and his pupils paint with his hand for a hundred years. |
| Magisterial | The Gobelins | Every trade in the kingdom under one roof, working for one palace. |
| Magisterial | The Escorial | A king builds a monastery, and the painters of Italy pack their brushes. |
| Devotion | The Theoric Fund | The state pays for your seat at the festival. It has found this cheaper than a riot. |
| Devotion | The Rites of Zhou | Ritual holds a realm together better than punishment does. |
| Devotion | The Serapeum | The same god, under two names, with two congregations. |
| Devotion | The Paean | They sang to Apollo as the oars came down. |
| Devotion | The Capitulary of Herstal | The tithe became a law, and the parish stopped passing the plate. |
| Devotion | The Seven Councils | Each council settled one question and left the next one open. |
| Devotion | The Patrimony of Peter | The bishop's farms fed Rome when the emperor's could not. |
| Devotion | The Ribats | Monks in the morning, sentries at night, and the same wall around both. |
| Devotion | The Imarets | Students, travellers and the poor of the town eat from one kitchen. |
| Devotion | Canossa | He stood three days in the snow, and the ban was lifted. |
| Devotion | The Canons of the Holy Sepulchre | The canons keep the door, and the door is never shut. |
| Devotion | The Martyr's Crown | They killed him on the altar steps, and the pilgrims have not stopped coming. |
| Devotion | The Saint Peter's Indulgence | A coin in the chest, a stone in the dome. |
| Devotion | The House of Worship | The emperor seats them all in one hall and asks them to begin. |
| Devotion | The Apostolic Camera | The dues of every parish know the way to Rome. |
| Devotion | The Two Sanctuaries | Two holy cities, one title, and every caravan guarded. |

## Built

- **DT1 (2026-11-05, schema 206):** as planned. The gate passed: the type check, 10,205 core tests and the build.
  - **Rows:** The Steppe Confederacy, The Soldiers' Share, Centurions and The Universal Monarchy are rewritten. The Consular Roads moves to Tier II and The Strategoi to Tier III. Weight of Numbers and Total Mobilisation are retired. Dominion holds 13 live rows (3, 4, 3, 3).
  - **Shapes:** `targetWounded` (`combatConditionHolds`), `rank` on `upkeepRebate` (`rebateReaches`), `City.foundedTurn`, `PlayerStatecraft.doctrineTurns`, the scope `foundedSince` with `doctrineTakenTurn`, `cardProspectCityCost` and `withCityCostRows` (`meters.ts`).
  - **For later batches:** `sheetDoctrines(deck)` and `expectSheetDoctrinesMatchData(deck)` are in `test/sim/decks/sortedSheets.ts`, and `lendDoctrineEffects(id, effects)` is in `test/sim/statecraftHelpers.ts`. `dominion.test.ts` runs the sheet check over all six decks, so a row built for another deck must be on that deck's table in the same batch. DT5 must teach `bagByRule` (`doctrineOffer.test.ts`) its gates when `doctrineBagFor` gains `state`.
  - **Where the plan was wrong:** "absent reads as nought" would make a seat without The Universal Monarchy read every founded town as doubled, which misprices the offer and the card's impact stamp. `doctrineTakenTurn` answers this turn for a seat that does not hold the Doctrine, and the two ghost seats (`deckPair` in `value.ts`, `ghostPair` in `cardImpact.ts`) stamp this turn. Two more pins moved: `statecraft.test.ts` (`pool.length` at tier 18) and `decks.test.ts` (`RETIRED_DECK_DOCTRINES`).
  - **Reading:** a bot prices The Universal Monarchy's doubling only on towns that exist and were founded since. At an offer that part usually costs nothing, because no future founding is priced. A seat with no captured towns scores the card 0.
- **DT2 (2026-11-05, schema 207):** as planned. The gate passed: the type check, 10,242 core tests and the build. Eleven Expansionist Doctrines are in the data, with `test/sim/decks/expansionistDoctrines.test.ts`.
  - **Outside the fence:** two wording fixes in `describers.ts`, for clauses no live row had printed: "every unimproved hex yields nothing" (`wholePercent: -100`), and "each city but your capital" on a `cityCost` scope.
  - **The first gate failed** on `aiBot.test.ts`'s re-asked spade. The new rows shifted its seeded game: at turn 36 the worker's one free row had a barbarian on it. It is not a bot fault. The test now builds its own board, keeps its assertions and adds its precondition, so later batches cannot shift it. With the re-ask arm off, it still fails.
  - **Readings:** The Contented City halves the gold in each town's fold, not the empire's city-connection gold or maintenance. The Commanderies takes 30 points off the border meter's percentage. On Crop Rotation, the town's own hex keeps its floor and loses anything the ground added above it. The High Towns gives a mountain beside a mountain both lines, so +5 production. The Mandarinate's +1 reaches every town but the capital, captured towns included.
  - **Moved to DT3:** the bots' reading of `wholePercent`.
- **DT3 (2026-11-05, schema 208):** as planned. The gate passed: the type check, 10,306 core tests and the build. Seven Commerce and eight Scientific Doctrines are in the data. The Commerce sheet holds all 14 of its Doctrines and the Scientific sheet all 15, with four new tables on the Scientific sheet.
  - **Shapes:** `skipsBeadRows` on `productionBonus` (`cardProduction`), with `grantsABead(id)` in `buildingData.ts`, which DT6 can reuse for The Külliye. The Academy of Gondishapur's `note` says the bonus misses the Magnum Opus and its works, and the Compendium prints it.
  - **The bots:** `wholeShareOf` in `value.ts` prices `wholePercent` for both signs. On a built board The Nizamiyya goes 0 to 43.8, Crop Rotation 504 to 436.8, The Cathedral Lodges 181.4 to 366.2 and The Pandidakterion 0 to 87.6. In a seeded six-seat game at turn 130, Crop Rotation falls most: from 129 to -296 for one seat, and from 608 to 182 for another. The Strategoi does not move, because it already read its citadels through the fold.
  - **A bug found:** `applyBuyRoute` called `routePrice` with no town, so a rider on a route's price passed the purse check and never reached the treasury. No live row had one until The Turnpike Trusts. `commands.ts` now charges the origin's price, and `purchase.ts` applies unscoped riders when no town is named, so the Trade screen quotes what is charged.
  - **Outside the fence:** `magisterialCouncil.test.ts` assumed Scientific has no Doctrines at imperium's tier. It now uses a seat with no decks, with the same assertion.
  - **Readings:** The Peace of Lodi's share floors per voice: +50% adds nothing on a voice paying 1, and -25% takes 1 to 0, 3 to 2 and 10 to 7. The Volley Fire reaches any `modelClass:'ranged'` piece, so also a leader's Slinger, but not ships or siege. The Workshops of Syracuse leaves ships out. The Turnpike Trusts pays on any seat's road on a worked hex. The Jixian Academy's -25% and The Monte di Pietà's -10% sit at the city stage.
- **DT4 (2026-11-05, schema 209):** as planned. The gate passed: the type check, 10,369 core tests and the build. Seven Magisterial and three Devotion Doctrines are in the data. Both sheets carry all 16 of their Doctrines; the rows not built yet are on the tables but not dealt.
  - **The bots:** `scientificGrantWorth` priced a flat renown grant at nothing, so The Kitabkhana scored 0 and bots would always pass it. It now reads as a lump. The Court Painter and Up Through the Ranks gain a price on their renown clause too.
  - **Found, for DT19b:** `scorePayout` counts towns twice on The Choregia's town line, and `occasionRate('completion')` ignores `wonder: true`.
  - **Readings:** The Choregia counts a wonder on the culture shelf, as The Repertory does. The Kitabkhana's age is `highestAge`, which a charter technology does not move; under The Universal Genius an act pays nothing and the later work pays once. The Escorial's "free" adds no renown of its own; if an offer is already waiting or the rites are unknown, `grantGreatPersonOffer` gives the renown that fills the ladder to the next rung. The Barmakids counts `greatPeopleRecruited`, so a person keeps counting after being spent.
- **DT5 (2026-11-05, schema 210):** as planned. The gate passed: the type check, 10,417 core tests and the build. The Garden Peoples, The Patrimony of Peter, The Imarets, The Canons of the Holy Sepulchre, The Martyr's Crown and The Two Sanctuaries are in the data.
  - **Shapes:** `needsTendedWork` and `needsReligion` on `DoctrineDef`, read once per bag in `doctrineBagFor(state, player, tier)`. `doctrineOfferCanOpen` and `commissionRewardWaits` take `state`. The Compendium prints a "Needs" row (`doctrineNeeds`).
  - **Where the plan was incomplete:** turns are simultaneous, so a seat can lose its holy city with a religion's Doctrines on its offer, and a faith redraw would then charge it for an empty hand. `rerollError` now refuses that redraw; the seat can still take a card or pass. The Devotion sheet gained a "Gates on Doctrines" note.
  - **Readings:** The Martyr's Crown presses within three hexes of the hex fought over, so an attacker that dies on the counter-blow presses from the target's hex, and a plundered caravan counts as a death.
- **DT6 (2026-11-05, schema 211):** as planned. The gate passed: the type check, 10,484 core tests and the build. The Highland Clans, The Curator of Waters, All Roads Lead to Rome, The Laurion Leases, The Muda, The Peripatetic School, The Directorate of Arms, The Külliye, The Carroccio, The Gobelins and The Paean are in the data.
  - **Shapes:** the combat scale counts `wonders` and `beliefsHeld` (`beliefsHeldBy`). `tile` and `publicWork` on `productionBonus`. `tile` on `rulePercent`, passed only by `explainTilePurchase`. The tile test `townCentre`. The scope `notConnected`. `of` on `cityRenownPercent` (`RenownShareRows`). `skipsBeadRows` on the rule. The rule `foreignTradersUnplunderable` (`cardTraderShielded`). The condition `noMetEmpireAhead`.
  - **A bot bug fixed:** `groundOfHexLine` passed no ring of neighbours, so every hex line asking `beside` priced at 0. One line passes the ring. On a seeded standard map at turn 120 this raised `marketGardens` for seat A from 392 to 683, and `templeEstates` for seat D from 14 to 206.
  - **Where the plan differed:** "two scale switches" is one, because an arm in `scientificCountAhead` would reprice every `pays` row counting wonders or beliefs. `conditionIsLive` returns a boolean, so the bots read The Directorate at full price while it holds and 0 while behind.
  - **Reading 25 is only partly true:** a row's card effects pay once however many copies stand, but the Imperial Throne's own `authorityCapacity` pays per copy, so two copies give +6 authority. A test pins this. To report to the user.
  - **The first gate failed** on the register in `expansionistCura.test.ts`: a helper in `renown.ts` walked the shelf a second time. `explainCityRenown` now records the row behind each line as it builds them, and a share is the fold of the matching lines. The register did not change. A new test shows the share reaches a Library a card grants.
  - **Outside the fence:** `tech.ts`'s refusal says "your Doctrine" when only a Doctrine lifts the limit, and `docs/trade.md` has a bullet for The Muda.
  - **Readings:** a war with the destination's owner ends The Muda's cover at once, and the wild is refused the blow too. All Roads' founding preview leaves out the +2, because a town not yet founded cannot answer `notConnected`.
- **DT7 (2026-11-05, schema 212):** as planned. The gate passed: the type check, 10,544 core tests and the build. The Inward Roads, The Sea Ban, The Forbidden Silks, The Flying Money and Canossa are in the data.
  - **Shapes:** `noForeignRoutes` (`foreignRouteBan`, `routeRenewalBan`, `trade.ts`), `noLuxuryLending` (`luxuryLendingBan`, `diplomacy.ts`), `buysOnlyInScope` (`cardPurchaseScopeRefuses`), `faithfulPeace` (`cardFaithfulPeace`, asked both ways round in `declareWarError`). `cardHoldingRule` names the card, so each refusal prints it. Bots: `doctrineRuleWorth`, with the stand-in knobs `score.commerce.foreignRouteOption`, `score.commerce.shutTownBuys` and `score.devotion.faithfulPeace`.
  - **Where the plan was wrong:** a route with renewal on never expires, so a route abroad would have run for ever under a ban. A renewal now counts as a new act (`marchOneTrader`, `setAutoResend`, `routeRenewalDecision`), and a far town that comes into the seat's own hands makes the route domestic again. `pricedPairs` drops foreign pairs under a ban, or refusals could use up all 24 asks. `hasSendablePair` knows the ban, or End Turn would prompt for a partner the seat may not send to. The Trade screen and the deal panel needed small edits to print the bans. `counterTerms` counters in coin alone for a seat under The Forbidden Silks.
  - **The Flying Money** is one `purchaseRider` with `on:'all'`, not two rows, or the bots would read a 40% discount.
  - **A wording side effect:** a scope count of 1 now prints "with a gold building", which also changes The Cosmopolitan Court's two clauses to match its row text.
  - **Readings:** The Forbidden Silks binds the seat that gives, whoever wrote the paper, and also binds a peace paper. The Flying Money means a shut town cannot buy its first Market with gold. Canossa's bot price counts met rivals only.
- **DT8 (2026-11-06, schema 213):** as planned. The gate passed: the type check, 10,579 core tests and the build. The Opera del Duomo, The Court of Rudolf II and The Capitulary of Herstal are in the data.
  - **Shapes:** `goldContribution` (`cardGoldContributionLines`; `contributionRate` in `purchase.ts` now takes the item, and `goldPerHammer` is 4, so the Opus rate goes from 4 to 2). `techPrice` (`techChainOf` in `tech.ts`, walked on first ask because of import cycles; `techPriceRowReaches`; `cardTechPriceLines`). `riteCost`, read in `riteCostAhead`, with one floor on the whole rung. New fields `techChain`, `notChain` and `techAge` on `CardRulePercentEffect`. New words `techPriceSubject` and `buildingAsGiven`. Bots: `goldContributionWorth`, `techPriceWorth`, `riteDiscountWorth`. `test/sim/doctrinePriceLines.test.ts` pins each price to one reader.
  - **Where the docs were wrong:** `docs/religion-v2.md` said "No card changes the price". It is corrected.
  - **Readings:** The Court of Rudolf II has a `note`: "Neither price reaches a charter technology." The Votive Offering costs half and gives half the hammers.
  - **To report to the user:** The Court's drawback barely bites. Alchemy's chain holds 14 of the 15 ordinary fourth-age rows, so the +25% reaches only Prospecting; the other four fourth-age rows are charters. To make it bite, let the +25% row reach charter technologies: one clause in `techPriceRowReaches`, the `note`, and the charter test.
- **DT9 (2026-11-06, schema 214):** as planned. The gate passed: the type check, 10,612 core tests and the build. The Arthashastra, The Council of Ten, The Union of Lublin and The Serapeum are in the data.
  - **Shapes:** `applyChooseDoctrine` calls `refitSlots`. `whole` and `position: -1` on `CardSlotPositionEffect`, with `chairIndexAtPosition` in `draft.ts` and `chairReadingsAt`, the one reading of how many times a chair counts, in `evaluator.ts`. `godsCountTwice` and `governmentsOfTier` join `MetaRuleId`; `legacyReadings` became `metaReadings(list, rule)`. `ghostSlotsUnderDoctrine` is read by `ghostPair` and `deckPair`. Bots: `orderReadAgain`, `countedChairWorth`, `godsAgainWorth`, `otherGovernmentsWorth`, `moveToCountedChair`.
  - **Where the plan was wrong:** `runPeriodicBoons` reads a seated card's row off the chair and skips the live list's second reading, so a boon would have paid once. It now multiplies by `chairReadingsAt`. Without a refit in the ghost, the stamp at the offer claimed to double the card in today's last chair. `reslotDecision` only trades a bench card for a seated one, so a seat with no bench left the new chair empty; `moveToCountedChair` handles it, and never moves a card into an occupied chair.
  - **Wording:** the clause "every government opens one more free chair" now reads "you have one more wildcard chair". Ibn Battuta and Guest at Every Court print the new words too.
  - **Readings:** commission rewards and one-time grants pay once in the counted chair, and a once-a-turn rider pays double in its one payout. A bot prices a `whole` row by the best Order the seat holds. A seat with no god prices The Serapeum at 0.
  - **To report to the user:** a Wildcard malice seats itself in the last Wildcard chair, so a malice can take The Arthashastra's chair, and nothing doubles until it leaves. The card's `note` says so and a test pins it. The alternative is to double the last chair no malice holds, a small change to how the chair is found.
- **DT10 (2026-11-06, schema 215):** as planned. The gate passed: the type check, 10,641 core tests and the build. The Hospitium and The Jinshi are in the data.
  - **Shapes:** `thirdCardForeign` (`drawHandPositions` writes `{ kind: 'foreign' }`; `positionBag` gains the arm; `foreignCardBag` takes `drafts`; an empty foreign bag falls back to the eligible union). `rareWeight` (`cardRareWeight`; `rarityOdds`, `rarityDrawWeight`, `rarityFirstOdds` and `drawRarityFirst` take `rarePercent`; `drawForeignCard` stays at nought). Bots: `handRuleWorth`, `handCardPrice`, `hospitiumWorth`, `jinshiWorth`.
  - **Where the plan differed:** `expectedBestOrder` moved to `value.ts`, and `wants.ts` re-exports it by name. `skipCandidate` in `bot.ts` passes the weight, or a pass would read different odds from the deal. `passFigure` passes it too, but its output cannot change, because doubling keeps the pity comparison the same.
  - **A recursion the plan did not name:** The Golden Bull is priced by the Doctrine offer it grants, and that offer can hold these two rows, whose prices walk the hand. `handRuleWorth` sets its memo to 0 first, and a test pins that.
  - **Readings:** the rare rise applies after the pity, so The Jinshi with one pass reads 45 / 40 / 30. A two-deck row of two foreign decks can be dealt, as S11 says. A holder whose own pool is empty still gets no hand. A hand on the table when the Doctrine is taken keeps its old positions through a redraw. The Jinshi reaches The Hospitium's third card. A bot's price can be negative.
- **DT11 (2026-11-06, schema 216):** as planned. The gate passed: the type check, 10,676 core tests and the build. Scutage is in the data.
  - **Shapes:** `collectionPays` on `BehaviorRuleId`, read by a new source in `buildLiveEffects` right after the malices (`offTheChairRows`, `offTheChairLine`, `collectionShareIn`; `cardCollectionShare` is the same reading for the bots). The lines are labelled "Order off its chair". A negative `slotRider`: `cardExtraChairs` no longer clamps, `chairCount` stops at the typed chairs, `slotTypesOf` trims to the council. Bots: `scutageWorth`, `orderOffItsChair`, `orderPaysOffItsChair`; `slotPairTerms` subtracts what a card already pays with no chair.
  - **Where the plan was wrong:** a malice in the chair that closes moves back onto a seated card, so `refitSlots` now returns that card to the collection. `settleCardTaken` now calls `bumpEconomy` on its first line, or a memo warmed before the command could part from a replay. Its comment said an ordinary card "changes nothing until it is seated", which is no longer true. Two fixtures read a government's whole layout from `slotTypesOf`; they now use `slotLayout`.
  - **Readings:** a cost is not a yield, so a figure below nought stays behind, or an unseated Financed Industry would charge food in every town and the seat could not discard it. The Mineral Trade therefore pays +1 gold and loses no production. A `payee` row stays behind, because it pays another empire. Two `collectionPays` rows read the largest. A commission card has no `pays` row today, so it pays nothing off the chair, and a charter pays nothing.
  - **To report to the user:** The Privy Council pays a whole +1 production on a halved line, because its `amount` is a flat helping per line. Reading 26 says so and a test pins it, but it could be strong with a large bench. A probe at turn 101 priced Scutage at 22 and 143 for two seats, so a bot takes it on some boards and passes on others.
- **DT12 (2026-11-06, schema 217):** as planned. The gate passed: the type check, 10,709 core tests and the build. The Georgics, The Wildwood Compact, The Planted Towns and Arcadia are in the data.
  - **Shapes:** `factor` on `CardWorkAgeEffect` (`cardWorkAgeFactor`, `GroundFacts.workAgeFactor`; `standingSince` compares `age * factor + bonus`; two rows read the larger, so a second reading cannot square it). `tendedWorksFree` (`workChargeCost` in `improvements.ts`, asked by `improvementError` and `spendBuilderCharge`). `trainedSettlerCostsCitizen`, in `realiseItem`, register entry 34. `tendedCountsImproved` (`GroundFacts.tendedImproved`, read by the tests `improved` and `unimproved`). Bots: `tendedWorksFreeWorth`, `settlerCitizenCost`, `tendedImprovedWorth`, and the knob `score.expansionist.tendedCharge`.
  - **Where the plan was incomplete:** `unitPanel.ts` hard-coded "Spend a charge:" in the build hint, which would be false under the Compact. `ImprovementOption` gains `charges`, and `workChargeWords` prints it. The Polder's hint now says "Spend 2 charges", which is correct. `commissions.ts` read `isTendedWork` directly, so Break the Sod's goal now counts tended hexes under Arcadia. `loseCitizen` can set aside a further settler, and it runs after `settleProduction` spliced the finished row, so the wrong row is never removed; a test pins this.
  - **Readings:** Arcadia does not reach what is a fact about the hex: a hex mark's `while`, `markInsteadOf`, and pillage stay as they were. A burn that only writes a mark is still the Burned Country row, so it is free under the Compact. Bought Swords does not make a bought settler cost a citizen (reading 47).
- **DT13 (2026-11-06, schema 218):** as planned. The gate passed: the type check, 10,736 core tests and the build. The Hydraulic Empire, The Builder Kings and The Censors are in the data.
  - **Shapes:** the pair hex/count (`countedHexRows`, read only by `scopedCardTileLines`; `hexRows` leaves counted rows out, so no other producer or amplifier can pay one as a flat row). The count `censusesLed` with `sinceDoctrine`, reading `state.census.taken`. `citizens` with `toEveryTown` in `windfallPayout`, one payout entry per town, paid by `payCensusRiders`. Bots: `explainHexCounted`, `censusLeadOutlook`.
  - **Where the plan was wrong:** S15's row needed `within: 'city'`, or the happiness would have paid +1 in all, not +1 per town. `runCensus` now calls `bumpEconomy` after its push, because a new count kind is a new row of the slate register. `cityContext`'s build preview would have missed these lines, so `hypothetical` now reaches `countedHexRows` through a small edit in `yields/hex.ts`, with a register row for its one `.buildings` read. "Six at most" is a fact about the data, not a cap, so the row has no `max`.
  - **Readings:** bots walk each worked hex with its own town's count, where the plan said "mean count per town". The Censors' happiness gets a forecast at the offer, because the count is nought then. The happiness is derived, so a town founded or captured after a census also reads the earlier censuses, and a lost town stops. A town's own hex inherits what rises above its floor, so a town on grassland with two public works gains +2 food and no production. The clause says "standing in its town", from `TOWN_COUNT_WORDS`.
