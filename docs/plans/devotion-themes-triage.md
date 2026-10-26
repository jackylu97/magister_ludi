# Batch DV triage: the Devotion themes pass

**Status:** written 2026-10-25 by a triage agent that changed no code and no data, before any batch in this plan. It is the plan to build the Devotion deck as `docs/plans/devotion-themes.md` and `docs/plans/devotion-list-proposed.md` now stand: the themes pass and your answers of 2026-10-25 (section 12). Section 12 outranks sections 2 to 11. You asked to begin the build, so every recommendation of sections 10 and 11 is taken as a reading. The readings below are the ones the build uses unless you change them here. Mark any you disagree with, as on the deck sheets.

Source: the two plan docs above, `docs/decks/devotion.md` (the sheet of 2026-10-12, in the old format), `data/decks/devotion.json`, the rows of `data/decks/common.json` that name Devotion, `docs/plans/review-revisions-2026-10-25.md` (batch R1) and sections 11 and 12 of `docs/plans/magisterial-themes.md`. Facts were checked against the code at commit `155106c9` (branch `decks`). Batch R1 was not yet in the tree, and this plan treats it as done: R1 changes The Fast and The Rites Commonwealth, and no DV batch changes them again. This plan's batches are DV1 to DV9. The Magisterial build uses MG1 and on.

**Groups:**
- **1, data only:** the text can be written with shapes that exist today. The cell names the shape.
- **2, new shape, no new player decision:** the behaviour is automatic, or uses UI that exists. The cell names what is missing.
- **3, waits on you:** no card. Question 1 is about one shared card, and it does not block its batch.
- **MG:** built by the Magisterial plan (Sacred Patronage).

Each cell starts with the batch that builds the row. "Devout" in a cell means the town scope `{ test: 'ownersFaith', keeps: true }` (feature E, reading 2).

## Facts the cells rely on

**The sheet, the data and the tests.**
- `data/decks/devotion.json` holds 77 Order rows: 50 live, 2 deferred (Consecrated Ground, The Interdict) and 25 retired. No row carries a `type`. The deck has no Doctrine rows. Checked.
- `data/decks/common.json` holds 19 rows that name Devotion: 16 live, 2 deferred (Sacred Patronage, The Monastery Libraries) and 1 retired (Harvest Offerings). 16 carry a type; Sacred Commissions and Sacred Patronage carry none. The Shrine Guards, The Blessed Forges, The Rising Nave and The Schoolmen's Charter have no row. Checked.
- The Ambarvalia is the row `theSpiritsOfPlace` in `data/decks/expansionist.json` (band 0, common, civic). `test/sim/decks/expansionistCards.test.ts` seats it by that id. Checked.
- `docs/decks/devotion.md` is in the old format: statuses built, revised, new and deferred, no Type column, no Doctrine tables. **No test reads it as a sheet.** `test/sim/decks/devotion.test.ts` pins the data by hand: 52 standing rows in bands `[8, 14, 11, 5, 14]`, the two deferred rows, the four commissions and the one charter, a list of the shapes in use (`KINDS_USED`), and a Tier 0 gate (no band 0 row names a prophet, a Temple, an apostle, an inquisitor, a Cathedral or a foreign town). Checked.
- `test/sim/decks/sortedSheets.ts` lists `SORTED_DECKS = ['dominion', 'expansionist', 'scientific', 'commerce']`. `dominion.test.ts` fails a typed row that no sorted sheet lists. Each sorted deck's test mirrors its shared table onto `common.json` and fails a shared row that names its deck and is not listed. The "sheet of record" block of `test/sim/decks/commerce.test.ts` is the model. Checked.
- The sorted partner sheets list 18 Devotion rows: Dominion 6, Expansionist 2, Commerce 5 and Scientific 5. Three of the Scientific five are left to this build by `docs/plans/scientific-build-triage.md` (its reading 55 and its "Done" note): The Monastery Libraries (`modify: deferred; revised`), The Schoolmen's Charter (`add`) and The Blessed Forges (`add`). The Magisterial sheet is in the old format, and `docs/plans/magisterial-themes-triage.md` does not exist yet. Checked.
- Tests that seat or pin a row this plan retires or moves: `devotion.test.ts` (Consecrated Ground among the deferred rows; The Mission, The Conversion of Kings, The Great Commission, The Pious Masons, The Interdict, The Founding Vows, The Penitents' Roll), `test/sim/statecraft.test.ts` (the fold registry names `theAlmsRoads · routeYield` and two `thePenitentsRoll` rows), `test/sim/ritePreview.test.ts` and `test/ui/ritesTab.test.ts` (they seat The Priest-Astronomers by id), `expansionistCards.test.ts` (The Ambarvalia by id), and `test/fixtures/cardText.json`. Checked.
- `SCHEMA_VERSION` is 175 (`src/sim/state.ts`). Seventeen test files pin it (Commerce batch T1 found 14 more pins than its plan named). Checked.

**Faith and what it buys** (`purchase.ts`, `state.ts`, `religion.ts`, `greatPeople.ts`).
- Faith leaves the bank at seven places: `openFaithLadder` (the gods), `settleReroll`, `performRiteAt` and `empireRiteAt` (`religion.ts`), `chargeBank` (`greatPeople.ts`, a great-person draft bought with faith), and `purchaseItemAt` and `contributeAt` (`purchase.ts`). None keeps a record. Gold has one: `spendGold` (`state.ts`) raises `Player.goldSpent`, which the count `goldSpent` reads. `settleReroll` clamps the bank at zero. Checked.
- `faithBankOpen` (`purchase.ts`) asks `cardActionRuleAt(state, city, 'faithBuysBuildings')` for every ordinary building, and never for the Magnum Opus. A wonder takes its own branch first. `CardRuleEffect` has `class`, `building`, `scope` and other fields, and no building category. `cardActionRuleAt` takes a unit type and no building. Checked.
- `faithBuysUnits` asks the row's `class` of the unit (Consecrated Labor: `class: { type: 'worker' }`, scope `hasBuilding` shrine). Melee units carry `modelClass: 'melee'`. Checked.
- `CardPurchaseRiderEffect` has `class`, `on`, `percent`, `scope`, `buildingCategory` and `empireBuilding`, and no currency. Checked.
- The faith building category holds the Shrine, the Temple, the Monastery, the Cathedral, the High Temple, the faith houses, the leaders' faith buildings and seven wonders. Checked.

**Rites** (`religion.ts`, `data/religion.json`).
- `performRiteAt` raises the `riteStarted` tally and pays the `rite` moment for every rite, the Votive Offering and the Restoring of the Host (both `RiteDef.atOnce`) included. `empireRiteAt` stamps every town and raises and pays neither. Checked.
- `payRiteRiders` calls `windfallPayout(state, player.id, 'rite')` with no facts, though it holds the town. No card rides the `rite` moment today. Checked.
- A town keeps one rite. `cityRite` answers the first live rite, `riteGate` refuses a town that "is already keeping" one, and `clearCityRite` takes it off for an empire rite. `src/ui/ritesTab.ts`, `cityPanel.ts`, `religionScreen.ts`, `bonusesTab.ts` and `src/ai/value.ts` read `cityRite`. Checked.
- A rite row is data: `RiteId` is the keys of `data/religion.json`'s rites. The Rite of Fasting is `byCard`, taught by Divination, and opened by The Fast's charter (`charter.unlocks.rites`). Checked.
- Step 14 of `docs/yields.md` (`explainSurplusMoved`) moves a town's food surplus into production after the gates, as one labelled line. `surplusToProduction` is its card shape. No shape moves production into another voice. Checked.
- The count `citiesKeepingRite` and the scopes `keepingRite` and `notKeepingRite` ask whether a town keeps any rite. Checked.

**The religion** (`religion.ts`, `statecraft/evaluator.ts`, `cities.ts`, `visibility.ts`, `commissions.ts`).
- `beliefsHeld` sums the pantheon, follower and enhancer beliefs of the religions the empire is paid by (`heldReligions`). It is zero before a religion is held, because the gods live in `Player.pantheon.beliefs`. The Creed is its only reader. Checked.
- The scope `ownersFaith` with `keeps: true` is "a town that follows a religion its owner is paid by". The describers print it "that follows your religion". Convert It or Tax It uses it. Checked.
- `noteFirstConversion` runs after each pressing, from `bankPressure`'s two callers. For a foreign town whose majority has just turned, it raises `foreignCityConverted` and marks the `conversion` first, both for the religion's founder (`religionFounder`). Nothing pays there. Checked.
- `pressLump` has two callers, pinned in `test/sim/religion.test.ts`: `proclaimAt` (`religion.ts`) and the presser that `payBattleRiders` (`combat.ts`) hands to `payWindfallGrants`, so a grant's `pressure` can press. `CLAUDE.md` and `docs/README.md` state the pair. Checked.
- The `found` moment is paid at the end of `foundCityAt` (`cities.ts`), through `payWindfallGrants` with no presser. `cities.ts` already imports from `religion.ts`. Checked.
- `sightSources` (`visibility.ts`) lists the empire's own units and towns. No card adds a source. Checked.
- `CommissionFigure` has `citiesAdmitted` (read with the goal's `admits`), `followingCityShare` and `rivalCapitalsFollowing`. A goal is "at least `count`". Nothing asks that every town is admitted. `CommissionReward.lasting` exists. Checked.
- The counts `firstConversions`, `followingCities`, `followingForeign`, `turnsSinceFounded` and `tally` exist. Checked.

**Holy sites and clergy.**
- `chargeCostOf(verb)` is the one reader of `rules.religion.prophetCosts` (found 2, plant 2, belief 2, proclaim 1, empire rite 1). It takes no state and no player. Checked.
- A holy site is planted by the `plantHolySite` command. `plantHolySiteError` asks `prophetProblem`, which refuses every piece but a prophet. The unit sheet (`src/ui/controls.ts`) offers the row to a prophet only. The bot's `prophetCommand` plants; its `apostleCommand` does not. `plantingHandOf` (`improvements.ts`) serves the worker's build command, not this one. Checked.

**War and the Opus** (`combat.ts`, `yields/town.ts`).
- Blood Brothers' rule `barbarianKillsConvert` is read in `applyCombat`: a barbarian defender killed by the holder's attack is captured through `captureUnit` at full health, with no kill or death riders and no tallies. `captureUnit` sets `freeUpkeep`. Checked.
- `explainOpusGate` (step 13 of `docs/yields.md`) halts a town's Opus production when `cardOpusSiegeBy` finds a rival that holds `opusSiege` and has a combat unit beside the town. `test/sim/yieldsDocSync.test.ts` pins the register line. Checked.
- `cardCityStat` passes a count through `cityStatProbe`, which sets `within: 'city'` and no `category`. Checked.
- A unit a card grants is realised with `free`, so it costs no upkeep. The Landsturm's text says so. Checked.
- The town scope `queueHolds` asks the front row's category (and `empireBuilding`). Only the empire condition of the same name has a `building` field. No count reads how far the front row has come. Checked.

**The tree** (The Schoolmen's Charter).
- Theology (age 3, column 8) opens the Cathedral and the Apostle. Charter technologies are rows with `charter: true` and a shelf lane (`row`): Medicine sits at column 6, lane 0, under The High Temple. `TechId` is a literal union (`techData.ts`), and `data/techs.json` holds 63 rows. A technology's `unlocksBuilding` and `unlocksUnit` effects open a row marked `unlockedByCard` early, and the tree still opens it in its own age (`unlockedFor`, `tech.ts`; Surveying's Aqueduct is the precedent). Checked.

**The bots** (`src/ai/value.ts`, `data/ai.json`).
- `value.ts` switches exhaustively on `CardEffect` kinds, `WindfallOccasion`, `TallyOccasion` and rule ids. It prices the `rite` moment through `occasionRate`, and `opusSiege` through `opusSiegeWorth`. `score` has groups for dominion, scientific, expansionist and commerce, and none for devotion. Checked.

**Where the code differs from the pass.**
- **The Abbeys' seam is not `plantingHandOf`** (section 7 names it). It is `plantHolySiteError` and `prophetProblem` (`religion.ts`), and the unit sheet's row.
- **The Anchorites changes every reader of a charge price.** `chargeCostOf` must take the empire, so `agentProblem`, `spendCharge`, `chargeCostWords`, the unit sheet and the bots pass it.
- **Rites count differently today.** The Votive Offering and the Restoring of the Host raise `riteStarted`, and an empire rite raises nothing. Section 12, item 10 changes both.
- **The Sacred Precincts needs only `category`** on `cityStat`. The probe already counts within the town.
- **The Double Feast does not double The Festival Calendar or The Work of God.** Section 4.1 says it does. Both ask whether a town keeps a rite, or how many towns do, so a second rite changes nothing for them. The Rogations, The Psalter and The Founding Vows count each rite started, so they do pay twice.
- **The Rising Nave needs a new count and a scope field.** The pass did not list a shape for it.
- **Three shared Scientific rows are this build's:** The Monastery Libraries, The Schoolmen's Charter and The Blessed Forges. Section 8 counts them; section 7 does not.
- **The Holy Summons' units cost no upkeep**, because a granted unit is free. The text does not say so.
- **Feature F's seam is inside the pressure walk.** A lump pressed there would change towns later in the same sweep, so the moment must be queued (reading 4).

## Tier 0

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| Lay Offerings | implemented; reworked (takes in Pastoral Shrines) | 1 | DV1. One hex line, `on: { test: 'anyImprovement', improvements: ['pasture', 'camp', 'plantation'] }`, faith 1, food 1, and the text (reading 36). |
| The Rogations | new (10-17) | 1 | DV4. `pays` `where: 'empire'`, faith 2, culture 2, and two `pays` `basis: 'count'`, `count: 'tally'`, `tally: 'riteStarted'`, amount 1, to faith and to culture (The Gathering Host's form). It lands with the season rule, so a Votive Offering does not grow it (reading 9). |
| The Founding Vows | implemented; counts seasons only (section 12, item 10) | 2 | DV4. The row does not change. The tally it counts is raised for a season only, and once in each town an empire rite reaches (reading 9). |
| The Gifts of the Faithful | new (10-17) | 2 | DV3. Missing: a building category on the `faithBuysBuildings` rule, asked by `faithBankOpen` with the building in hand. Then `rule` `faithBuysBuildings`, `buildingCategory: 'faith'`, no scope (reading 14). |
| First Rites, The Wayside Shrines, The Calling, The Old Gods Remain | implemented | – | Built (4). |

Pastoral Shrines retires (DV1). The Holy Spring moves to the shared table (DV1).

## Tier I

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Creed | implemented; reworked | 2 | DV3. Missing: `beliefsHeld` counts nothing before a religion is held. It becomes the empire's own gods (`Player.pantheon.beliefs`) and the follower and enhancer beliefs of the religions it is paid by. Text: "Your capital gains +3 faith and +3 culture for every god and belief you hold." The row keeps its old text until DV3 (readings 12, 16). |
| The Sacred Precincts | new (10-17, was The Fortified Churches) | 2 | DV3. Missing: `category` on `cityStat`, passed into `cityStatProbe`. Then `cityStat` `defense` 3, `count: 'buildingsOfCategory'`, `category: 'faith'` (reading 17). |
| The Rites Commonwealth, The Fast (charter) | implemented; revised 2026-10-25 | – | Built by batch R1 (reading 11). |
| The Octave, Consecrated Labor, The Monastic Builders | implemented | – | Built (3). |

The Consolation, The Alms Roads and Consecrated Ground retire (DV1). The Priest-Astronomers and The Painted Chapels move to the shared table (DV1). The Living Hymnal, The Mission and The Second Prophet move to Tier II.

## Tier II

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Second Prophet | implemented; moved | 1 | DV1. Band 1 → 2 (reading 1). |
| The Living Hymnal | implemented; moved | 1 | DV1. Band 1 → 2 (reading 1). |
| The Mission | implemented; moved; revised | 1 | DV1. Band 1 → 2, the reward's culture 150 → 300, and the text (reading 6). |
| The Settled Faith | modify: as built; reworked | 1 | DV1. Two `percentYields`, science 15 and culture 15, scope devout. The happiness line and the Temple-and-rite scope go. The `pressureRule` `bombLump` `delta: -15` stays (readings 2, 38). |
| The Deaconries | new | 1 | DV2. `pays` `where: 'city'`, `basis: 'count'`, `count: 'population'`, `within: 'city'`, `per: 4`, to happiness, amount 1, scope devout, no `max` (The Public Fountains' form; reading 34). |
| The Lives of the Saints | new (10-17, was The Golden Legend) | 1 | DV2. Two `pays` `where: 'city'`, `count: 'firstConversions'`, `percent: 2`, `stage: 'city'`, `max: 15`: science and culture (reading 33). |
| The Martyrology | new | 1 | DV2. Two `pays` `basis: 'count'`, `count: 'tally'`, `tally: 'unitLost'`, amount 2, to faith and to culture. |
| The Book of Life | new (the 10-17 name, new text) | 2 | DV3. Missing: a record of faith spent. `Player.faithSpent`, raised by one seam (`spendFaith`, beside `spendGold` in `state.ts`) at the seven places faith leaves the bank, and a `CountKind` `faithSpent`. Then Names in Stone's form: two `pays` `where: 'city'`, `count: 'faithSpent'`, `percent: 1`, `per: 150`, `stage: 'city'`, `max: 30` (readings 13, 33). |
| The Sabbath Laws (charter) | new (10-17) | 2 | DV4. Missing: a shape at step 14 that moves the town's production into culture after the gates, as `explainSurplusMoved` moves food. Then the Rite of the Sabbath row (`data/religion.json`, `byCard`, ten turns) and the charter row, `charter: { unlocks: { rites: ['riteOfTheSabbath'] } }` (reading 20). |
| The Parishes | new | 2 | DV5. Missing: the founding seam (`foundCityAt`) hands `payWindfallGrants` a presser, as `payBattleRiders` does. Then `windfallRider` `found`, grant `pressure: { amount, range: 0 }`. `pressLump` gains a caller (reading 21). |
| Commission: The State Church | new | 2 | DV5. Missing: an `every` switch on the goal's towns, so `citiesAdmitted` answers its count only while every town you hold is admitted. Goal `reached` `citiesAdmitted` 6, `admits` devout, `every`. Reward `lasting`: `meterRule` `cityCost` `delta: -1`, scope devout (Convert It or Tax It's line) (reading 23). |
| The Confessors | new | 2 | DV5. Missing: towns that follow your religion as sight sources in `sightSources`, through a rule, for example `followersShareSight` (reading 22). |
| The Anchorites | new (10-17) | 2 | DV7. Missing: a card's price on a prophet's act. `chargeCostOf` takes the empire, and a rule with a value sets the further site's price (`plantHolySite` 2 → 1) (reading 27). |
| Temple Estates, The Saints' Fields, The Old Holy Places, The Cathedral Works, The Spiritual Host, The Lay Brothers, The Votive Gifts | implemented | – | Built (7). |
| Mission Houses | modify: as built | – | Plays as built (a flat +18 on the lump). |

The Festival Calendar and The Penitents' Roll move to the shared table (DV1).

## Tier III

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Conversion of Kings | implemented; moved; revised | 1 | DV1. Band 4 → 3, the reward's culture 300 → 500, and the text (reading 6). |
| The Pious Masons | modify: as built; moved | 1 | DV1. Band 4 → 3. It stays as built: faith pays the wonder's full price and the banked hammers are refunded (reading 5). |
| The Consecration Feast | new (10-17) | 1 | DV2. Two `windfallRider` `buildingCompletion`, `building: 'cathedral'`, grant science and culture, `amount: 20`, `fromOccasion: 'population'` (The Dedications' form). A bought Cathedral pays too, because a purchase realises through the same routine. |
| The Pilgrim Towns | new (10-17) | 1 | DV2. `percentYields` culture 20, scope `{ test: 'workingImprovement', improvements: ['holySite'] }`. |
| The Holy Summons | new (10-17) | 1 | DV2. `windfallRider` `declareWar`, `oncePerTurns: 20`, grant `unit: 'bestMelee'`, `toEveryTown` devout (The Landsturm's form). The text adds "They cost no upkeep." (reading 32). |
| The Caliphate | new | 1 | DV7. `meterRule` `cityCost` `value: 0`, scope devout (The Proconsuls' form). It is data only, but it waits for DV7 because it is the rule-breaker most likely to change (reading 5). |
| The Offering Chests | new (10-17) | 2 | DV3. Missing: a `currency` field on `purchaseRider`. Then `purchaseRider` `on: 'unit'`, `class: { category: 'military' }`, `currency: 'faith'`, `percent: -30` (reading 15). |
| The Psalter | new (10-17, reworked) | 2 | DV4. Missing: the `rite` moment carries no facts. It gains `townId` and `population`. Then two `windfallRider` `rite`, `inTown` devout, grant science and culture, `amount: 5`, `fromOccasion: 'population'` (readings 9, 19). |
| Pentecost | new (10-17) | 2 | DV6. Feature F. `windfallRider` `townConverted`, grant `pressure: { amount: 60, range: 4 }`, and the moment's seam hands a presser (readings 3, 4, 25). |
| The Mass Baptisms | new (10-17) | 2 | DV6. Feature F. Two `windfallRider` `townConverted`, `first: 'conversion'`, grant science and culture, `amount: 20`, `fromOccasion: 'population'` (readings 3, 26). |
| The Abbeys | new (10-17) | 2 | DV7. Missing: an apostle may not plant (`prophetProblem`). A rule, for example `apostlesPlantHolySites`, lets an apostle raise a further site, and the unit sheet shows the row to an apostle (reading 28). |
| The Turning of Swords | new (10-17) | 2 | DV8. Missing: Blood Brothers' capture asks for a barbarian. A behaviour rule, for example `faithfulKillsConvert`, widens it to an enemy empire's land unit killed on ground that follows your religion (the `followingTerritory` reading), once a turn by an absolute stamp (reading 30). |
| The Doctors of the Church | modify: as built | – | Plays as built. |
| The Holy Inquisition, The Offered Stones, The Learned Clergy | implemented | – | Built (3). |

The Monastic University moves to the shared table (DV1).

## Tier IV

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Great Commission | implemented; reworked (an institution) | 1 | DV1. The reward's 500 faith and timed effect go. Reward `lasting`: `pays` `where: 'city'`, faith 3, culture 3, scope devout. The goal is unchanged (`followingCityShare` 51) (readings 6, 35). |
| The Work of God | new (10-17) | 1 | DV2. `productionBonus` `category: 'building'`, `building: 'theMagnumOpus'`, `percent: 4`, `count: 'citiesKeepingRite'`, `max: 10` (The Great Consecration's form; reading 37). |
| The Interdict | modify: deferred; reworked | 2 | DV7. DV1 writes the target text and keeps the row deferred. Missing: a sibling of `opusSiege` read by `explainOpusGate`, for example `opusInterdict`: a town that follows a religion the holder is paid by, and is not the holder's, makes no production while it builds the Magnum Opus (readings 12, 29). |
| The Double Feast | new (10-17; was Tier III) | 2 | DV8. Missing: `cityRite` answers one rite, and `riteGate` refuses a town keeping one. A rule, for example `twoRites`, lets its holder's towns keep two different rites. The readers that must see both (the rite panel, the faith screen, `clearCityRite`, the empire rite, the bots) read a list (reading 31). |
| The Chapter Houses, The Seven Pilgrimages, The Apostolic Succession, The Great Consecration, The Tithe of Nations, The Last Crusade, The Host Restored, The Peace of God, The Last Offering, The Treasury of Merit | implemented | – | Built (10). |

## Shared with another deck

Every Devotion seat draws all 29. A shared card is also dealt to a seat that holds only the partner deck, so each must pay a seat with no faith engine. DV1 lists all 29 in the sheet's shared table, with the types of the list doc.

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| Rites of Passage, The Sacred Host, The Oriflamme, The Crusader Orders, Convert It or Tax It, The Holy Army (Dominion) | implemented | – | Built (6). After DV2, Convert It or Tax It's printed clause says "devout" (reading 2). |
| The Shrine Guards (Dominion) | add | 1 | DV2. A new row in `common.json`, `decks: ['dominion', 'devotion']`, Tier 0, common, Military: `rule` `faithBuysUnits`, `class: { modelClass: 'melee' }`, scope `hasBuilding` shrine (Consecrated Labor's form). The Dominion sheet's shared table lists it. |
| Sacred Groves, The Flood Festival (Expansionist) | implemented | – | Built (2). |
| The Ambarvalia (Expansionist) | implemented; moved to the shared cards | 1 | DV1. The row `theSpiritsOfPlace` moves from `expansionist.json` to `common.json`, `decks: ['expansionist', 'devotion']`, with its id, text, band and type (Civic). The Expansionist sheet moves it from its Tier 0 table to its shared table (reading 8). |
| The Holy Spring (Expansionist) | implemented; moved to the shared cards | 1 | DV1. The row moves from `devotion.json` to `common.json`, `decks: ['expansionist', 'devotion']`, unchanged, Civic. The Expansionist sheet lists it (reading 8). |
| The Merchant Shrines, Pilgrim Markets, The Tithe, The Waqf (Commerce) | implemented | – | Built (4). Commerce batch T1 moved them. |
| The Silk Road Monks (Commerce) | modify: as built | – | Plays as built. |
| Cloister Schools, The Cloister (Scientific) | implemented | – | Built (2). |
| The Priest-Astronomers, The Monastic University (Scientific) | implemented; moved to the shared cards | 1 | DV1. The rows move to `common.json`, `decks: ['devotion', 'scientific']`, unchanged, Civic. The Scientific sheet lists both (reading 8). |
| The Monastery Libraries (Scientific) | modify: deferred; revised | 1 | DV2. Two `pays` `where: 'city'`: faith 2, scope `hasBuilding` library, and science 2, scope `hasBuilding` temple (the Scientific plan's cell). The row leaves `deferred` with its new text. The Scientific sheet's row becomes `implemented`. |
| The Blessed Forges (Scientific) | add | 1 | DV2. A new row, `decks: ['devotion', 'scientific']`, Tier II, uncommon, Civic: `pays` `where: 'hex'`, faith 1, production 1, `on: { test: 'all', of: [{ test: 'improved' }, { test: 'resourceKind', kind: 'strategic' }] }` (The Emporia's form); `pays` `where: 'city'`, faith 2, production 2, scope `hasBuilding` temple. The Scientific sheet's row becomes `implemented`. |
| The Schoolmen's Charter (Scientific) | add | 1 | DV2. A placeholder charter technology `scholasticism`, the charter row, and `unlockedByCard` on the Cathedral and the Apostle (reading 24, question 1). The Scientific sheet's row becomes `implemented`. |
| The Painted Chapels, The Festival Calendar, The Penitents' Roll (Magisterial) | implemented; moved to the shared cards | 1 | DV1. The rows move to `common.json`, `decks: ['devotion', 'magisterial']`, unchanged, Civic. The Painted Chapels becomes the pair's early card (reading 8). |
| Sacred Commissions (Magisterial) | implemented; moved | 1 | DV1. Band 1 → 2, typed Economic (reading 8). |
| The Rising Nave (Magisterial) | add | 2 | DV3. Missing: a `CountKind` of the tenths of the front row's cost already in the town's basket, and a `building` field on the town scope `queueHolds`. Then two `pays` `where: 'city'`, `basis: 'count'`, amount 1, to faith and to culture, scope `any` of `queueHolds` wonder and `queueHolds` building cathedral. A new row, Tier III, rare, Civic (reading 18). |
| Sacred Patronage (Magisterial) | modify: deferred | MG | Built by the Magisterial plan, in the batch that builds the moment a great person is spent (for The Last Commission). Section 12 keeps its second clause. DV1 lists it with its full text and types the row Civic (reading 10). |

**Each pair's early shared card** (ruling (qqqqqq) 14):
- Dominion: Rites of Passage, and The Shrine Guards from DV2.
- Expansionist: Sacred Groves, The Ambarvalia and The Holy Spring.
- Commerce: The Merchant Shrines.
- Scientific: Cloister Schools, The Monastery Libraries, The Priest-Astronomers, and The Schoolmen's Charter from DV2.
- Magisterial: The Painted Chapels, once Sacred Commissions moves to Tier II in DV1.

**Where this plan meets the Magisterial plan:**
- **The shared cards.** This plan builds five of the six: the three moves and Sacred Commissions' tier in DV1, and The Rising Nave in DV3. The MG plan builds Sacred Patronage.
- **The two sheets.** Both sorted sheets mirror the same `common.json` rows (tier, rarity, text, type), so they must agree. The plan whose sheet is sorted second matches the first. If MG1 has not yet rewritten `docs/decks/magisterial.md` when DV1 runs, DV1 adds one line to its shared section naming the moves, as Commerce batch T1 did. If MG1 is rewriting it at the same time, DV1 leaves the file alone and MG1 lists the six rows as DV1 types them.
- **The features.** Features E and F are this plan's; feature G (a government adopted) is the MG plan's. Feature F is a `WindfallOccasion` member and does not touch `src/sim/occasions.ts`.
- **Rerolls** are the Devotion pair's (both passes agree). The Penitents' Roll moves to the shared file; nothing else is built.

## Devotion's commissions: the mix

Section 12, item 6: two institutions and three one-time rewards.

| Commission | Tier | Becomes | Reward | Shape |
|---|---|---|---|---|
| The Founding Vows | 0 | one-time | 100 faith and 40 food in the capital | Exists. DV4 narrows what it counts. |
| The Mission | II | one-time | an Apostle and 300 culture | Exists (DV1 changes the figure and the band). |
| Commission: The State Church | II | institution | devout towns cost one less authority, minimum one | Reward exists; the goal's `every` switch is new (DV5). |
| The Conversion of Kings | III | one-time | a Prophet and 500 culture | Exists (DV1 changes the figure and the band). |
| The Great Commission | IV | institution | devout towns gain +3 faith and +3 culture | `lasting` exists (DV1). |

- The Caliphate makes The State Church's institution do nothing (devout towns already cost no authority). That is the upgrade the pass intends.
- Feature C (Dominion D11) counts met commissions of every deck, so these five feed The Ovation and The Res Gestae in a Dominion seat with no DV work.

## Feature E: "devout towns" as a card word

- **What it is:** "devout town" means one of your towns that follows a religion you are paid by. It is the scope `ownersFaith` with `keeps: true`. No engine work.
- **What DV2 builds:** the describers print that scope as "devout" (`describers.ts`, the `ownersFaith` arm), and one Compendium line says what a devout town is.
- **The texts** (reading 2). Eight Devotion cards say it, each written in its own batch:
  - The Settled Faith (DV1): "Devout towns gain +15% science and culture. Your proclamations press 25% less."
  - The Great Commission (DV1): "Commission. Have more than half of the world's cities follow your religion. Then, for the rest of the game, devout towns gain +3 faith and +3 culture. The card leaves its chair."
  - The Deaconries (DV2): "Devout towns gain +1 happiness for every four citizens."
  - The Holy Summons (DV2): "Declaring war gives every devout town the best melee unit you can build, at most once every twenty turns. They cost no upkeep."
  - The Psalter (DV4): "Each rite started in a devout town grants science and culture equal to five times the town's population."
  - The Parishes (DV5): "Each town you found starts out devout."
  - Commission: The State Church (DV5): "Commission. Hold at least six towns, all of them devout, at the same time. Then, for the rest of the game, devout towns cost one less authority, minimum one. The card leaves its chair."
  - The Caliphate (DV7): "Devout towns cost no authority."
- **Not devout:** a foreign town is never devout. Cards about every following town keep "follows your religion": The Living Hymnal, The Confessors, The Turning of Swords' ground, The Silk Road Monks.

## Feature F: a conversion as a moment

- **What it is:** a `WindfallOccasion` member, for example `townConverted`, paid to the empire a religion pays (`religionFounder`) when a foreign town's majority turns to that religion. Facts: `townId`, `population`, and `firsts` with `conversion` the first time the town turns (reading 3).
- **Where it fires:** at the seam `noteFirstConversion` already uses, but queued, and paid when the pressing that turned the town ends (reading 4).
- **What it costs:** the member, the queue and its drain, its words, a stand-in arm in `src/ai/value.ts`, and a presser at the drain for Pentecost's lump. `pressLump` gains a caller.
- **Cards:** Pentecost and The Mass Baptisms. The Lives of the Saints reads the same towns as a count (`firstConversions`) and needs no moment.

## Doctrines

- Devotion has no Doctrine rows and none designed. Section 12 names the next step: `docs/plans/devotion-doctrines.md`, then a triage of its own.
- **What the sheet needs (DV1):** an empty Doctrine table (Doctrine | Build | Text) under each of Tiers I to IV, and the header line "Doctrines: none yet." The sheet test skips Doctrine tables, and the counts tables count Orders only.
- Until then a Devotion seat's Doctrine offer comes only from its partner, as for Commerce.

## Cut and retired rows

| Rows | In the data now | Action |
|---|---|---|
| Pastoral Shrines (merged into Lay Offerings), The Consolation, The Alms Roads | live | DV1: `retired: true`, off the sheet and the Devotion shelf (reading 7). |
| Consecrated Ground | deferred | DV1, the same. |
| The cards of the 10-17 pass the themes pass did not take | no row | None. They never reach the sheet. |

DV1 retires 4 rows and moves 6 rows to `common.json`, so `devotion.json` goes from 77 rows to 71: 41 live, 1 deferred (The Interdict) and 29 retired. It moves one Expansionist row too. After DV8 the file holds 95 rows: 66 live and 29 retired.

## Readings

The first eleven come from section 12, from R1 and from section 11. The rest are new. Each gives the reading the build uses, then the alternative where there is one. A reading is how the build interprets a text that could mean two things. "To confirm" marks a reading that is this plan's interpretation of your words.

1. **(Section 12, item 2)** No Devotion card that waits on The High Temple or a founded religion is dealt before Tier II. The Living Hymnal, The Mission and The Second Prophet move to Tier II. DV1's test widens the age gate to Tiers 0 and I for Devotion's own rows: no such row names or reads a prophet, a Temple, an apostle, an inquisitor, a Cathedral, a holy site or a following town. Shared rows are left out of the gate: The Sacred Host, Cloister Schools, The Oriflamme, The Monastery Libraries and The Schoolmen's Charter stay at Tier I, as their partner passes kept them.
2. **(Section 12, item 3; to confirm)** Feature E. "Devout town" is the `ownersFaith` scope with `keeps: true`. The eight texts in the feature E section use the word, so they differ in wording from the texts you saw on the list. A foreign town is never devout. The shared Convert It or Tax It keeps its Dominion text; only its printed clause changes.
3. **(Section 12, item 4)** Feature F's moment is paid to the empire the religion pays, for a foreign town only, each time its majority turns. A town of your own that turns does not fire it. A town turned by a capture's lump or a founding's lump is your own by then, so it fires nothing.
4. **(Section 12, item 4; to confirm)** The moments are queued in the order the towns turned. They are paid when the pressing that turned them ends: the tide's phase, a proclamation, a capture's lump or a founding's lump, before the phase or the command returns. A lump paid at a moment can turn more towns, which join the queue. A town fires the moment at most once a turn for each religion, so the chain always ends. Alternative: no limit but the one the pass names (a town that already follows cannot turn again), which two empires holding Pentecost could make loop.
5. **(Section 12, item 5)** The rule-breakers as written: The Caliphate (devout towns cost no authority), The Abbeys, The Turning of Swords, The Double Feast, The Interdict, and The Pious Masons at Tier III. The Pious Masons stays as built.
6. **(Section 12, item 6)** Two institutions (The State Church, The Great Commission) and three one-time rewards (The Founding Vows, The Mission at 300 culture, The Conversion of Kings at 500 culture).
7. **(Section 12, item 8)** The four cut rows retire in DV1, before any card that replaces them lands. A save that holds one keeps it, with its effects. A shape only a retired row uses stays in the code. A test that seats a retired row directly stays; a test that deals one from a pool changes.
8. **(Section 12, item 9)** The 29 shared cards. The seven rows moved to `common.json` keep their ids, texts, bands and rarities, and The Ambarvalia keeps the id `theSpiritsOfPlace`. Sacred Commissions moves to Tier II. The types are the list doc's: 4 Military, 3 Economic, 22 Civic.
9. **(Section 12, item 10)** A rite started is a season: a rite with no `atOnce`. The Votive Offering and the Restoring of the Host do not raise `riteStarted` and do not pay the `rite` moment. A prophet's empire rite raises the tally and pays the moment once in each town it reaches, in `state.cities` order. So one empire rite grows The Rogations by one a town, counts toward The Founding Vows once a town, and pays The Psalter in each devout town.
10. **(Section 12 and section 11)** Sacred Patronage keeps its second clause. The MG plan builds it. Until then the Devotion sheet lists it as `modify: deferred` with the full text: "Faith may purchase great-person drafts at the escalating conversion price. Spending a great person grants 30 faith, at most once per turn."
11. **(Batch R1)** The Fast's rite pays science and culture equal to the town's population each turn, and The Rites Commonwealth loses its −1 happiness. DV1's sheet carries R1's texts as `implemented`.
12. A live row whose new text needs a new shape keeps its old text until its batch: The Creed (DV3). The deferred The Interdict takes its target text in DV1 and stays `deferred`, with no effects and a plain sentence, until DV7 (Commerce readings 41 and 44).
13. **(To confirm)** The Book of Life counts the faith that leaves the bank at all seven places: purchases, great-person drafts, contributions to a build or the Opus, city rites, empire rites, rerolls and the gods the ladder buys. The record takes what actually left: a reroll clamped at zero counts what was paid. Alternative: purchases only.
14. **(To confirm)** The Gifts of the Faithful opens every building of the faith category that is not a wonder: Shrines, Temples, Monasteries, Cathedrals, the faith houses and the great houses of that category, at the faith rate, in every town. Wonders keep their own rules (The Pious Masons).
15. The Offering Chests takes 30% off the faith price of a military unit, by land or sea. A unit bought with gold pays the full price. The discount sums with other purchase riders before it applies, as riders do now.
16. **(To confirm)** The Creed counts the empire's own gods as they stand (`Player.pantheon.beliefs`), and the follower and enhancer beliefs of the religions it is paid by. A captured holy city adds its religion's follower and enhancer beliefs, not its founder's gods. Two gods before founding pay +6 of each. Alternative: before founding, the gods; after it, the religion's own count as today.
17. The Sacred Precincts counts the town's faith buildings as The Painted Chapels counts them, so a faith wonder in the town counts too.
18. **(To confirm)** The Rising Nave pays while the front row of the town's queue is a Cathedral or a wonder, the Magnum Opus included. The count is the tenths of the row's cost already in the basket, floored, at most ten. Alternative: the Opus left out.
19. The Psalter pays in the town the rite was started in, if that town is devout at that moment: five times its citizens, in science and in culture.
20. **(To confirm)** The Sabbath Laws. Divination teaches the Rite of the Sabbath, as it teaches the Rite of Fasting; the charter is dealt from Tier II. While a town keeps it, step 14 moves the town's production for the turn, as the fold computes it after the gates, into culture as one labelled line, and the basket gains none of it. A purchase or a production windfall still lands in the basket. A town whose production a gate stops moves nothing.
21. **(To confirm)** The Parishes. When you found a town, a lump of your religion is pressed on it at range 0, for each religion you are paid by, large enough to turn the citizens a town is founded with. The figure is on the row. An empire with no religion presses nothing. The lump comes last in `foundCityAt`, so the town follows from its first turn.
22. **(To confirm)** The Confessors. Every town of any empire that follows your religion (the `follows` reading, with you as the reader) is a sight source for you, at the base city sight (`VIS.citySight`), without its owner's card or building bonuses. It is read whenever your visibility is recomputed. Ground seen this way can meet its owner, as any sight does.
23. The State Church's goal counts devout towns, and counts them only while every town you hold is devout. Six are needed. The reward is the lasting `cityCost` line Convert It or Tax It uses, minimum one.
24. **(To confirm; question 1)** The Schoolmen's Charter opens a placeholder charter technology, Scholasticism (`scholasticism`): age 3, parent The High Temple, column 6, lane 1 (Medicine holds lane 0), priced as the other charter technologies are. Its effects open the Cathedral (`unlocksBuilding`) and the Apostle (`unlocksUnit`), and both rows gain `unlockedByCard`, so Theology still opens them for everybody. Your ruling of 2026-10-21 ("don't open units early") is read as a ruling about soldiers, whose strength jumps between ages; an apostle is clergy. The placement waits for your chart, as the other charter technologies do.
25. Pentecost presses a proclamation's base lump (60, `rules.religion.bombLump`) within four hexes of the town that turned, for each religion its holder is paid by, on every turning. Cards that change a proclamation (Mission Houses, The Settled Faith) do not change it, because it is not a proclamation.
26. The Mass Baptisms pays the first time a town turns to your religion (`first: 'conversion'`), so a town lost and won back pays once.
27. **(To confirm)** The Anchorites makes a further holy site cost one charge. Founding a religion still costs two. Under The Abbeys an apostle pays what a prophet pays.
28. The Abbeys lets an apostle raise a further holy site where a prophet could, only for an empire that already holds a religion, so an apostle never founds one. It pays the planting price in charges. The unit sheet shows the row to an apostle while the card is seated.
29. The Interdict: a town that follows a religion its holder is paid by, and does not belong to the holder, makes no production while it builds the Magnum Opus. The first holder in `realPlayers` order names the line, as Circumvallation's does. Other rows are not affected. It is one more line at step 13 of `docs/yields.md`.
30. **(To confirm)** The Turning of Swords. Your attack kills a land military unit of an empire you are at war with, on a land hex owned by a town that follows your religion. The unit then changes sides at full health, through `captureUnit`, so it costs you no upkeep. Once a turn, by an absolute stamp per card. Not a barbarian (Blood Brothers' case), not a civilian and not a town's garrison. As with Blood Brothers it is a capture, not a kill: no kill or death riders and no kill or loss tallies, so the loser's The Martyrology does not count it. The loser's war record (`recordWarLoss`) does count it, because an empire lost a soldier.
31. **(To confirm)** The Double Feast. A town may keep two different rites; the same rite cannot be kept twice. The Votive Offering and the Restoring of the Host take a place while they run. A prophet's empire rite takes a free place, or the place of the older rite when both are full. `keepingRite`, `citiesKeepingRite` and The Festival Calendar ask whether a town keeps at least one rite, so they do not pay twice. The Rogations, The Psalter and The Founding Vows count each rite started.
32. **(To confirm)** The Holy Summons' units are raised free of upkeep, as every unit a card grants is, so the text adds "They cost no upkeep.", as The Landsturm's does.
33. The percentages on a count (The Book of Life, The Lives of the Saints) are city-stage lines at `where: 'city'`, as Commerce's reading 30 made Names in Stone.
34. The Deaconries has no cap; the text names none. The Public Fountains' cap of +3 does not carry over.
35. The Great Commission's institution pays in devout towns. The old timed reward read `follows` (any town following the reader's religion, foreign towns included).
36. Lay Offerings is one hex line on pastures, camps and plantations. Pastoral Shrines' happiness clause goes with its row.
37. The Work of God counts your towns keeping any rite (`citiesKeepingRite`), the Votive Offering and the Restoring of the Host included while they run.
38. The Settled Faith's proclamation half stays a flat −15, which is 25% of the base lump. The row stays `modify: as built`.

## The batches

**One track.** The DV batches run one at a time. A Magisterial build may run in another worktree at the same time. The files both tracks are likely to touch are marked **(shared with MG)** in each fence, and listed in the table at the end of this section.

**Keep each batch additive in the shared files:**
- Put a new union member beside the Devotion members already there, and a new switch arm beside the Devotion arms in the evaluator, the describers and `src/ai/value.ts`.
- A batch that adds a member to a union `value.ts` switches on exhaustively (a `CardEffect` kind, a `WindfallOccasion`, a rule id) adds a stand-in arm in the same batch, so the tree typechecks. DV9 prices it.
- In `docs/orders-and-doctrines.md`, edit only the Devotion shelf, the Cross-type table, their notes, and a shelf a moved row leaves.
- Rewrite `test/fixtures/cardText.json` with `CARD_TEXT_WRITE=1 npx vitest run test/sim/cardTextSnapshot.test.ts`.
- Each card batch bumps `SCHEMA_VERSION` once and updates every pin (`grep -rn` the old number in `test/`). If an MG batch landed since the last DV batch, take the next free number; the two tracks never reuse one.

**The sheet.** DV1 writes the sheet in the sorted format. Each later batch sets its own rows to `implemented`, with the Ability cell equal to the data row's text and the Type column equal to its `type`, and recomputes the counts tables.

### DV1: the sheet of record, the sort, the retirements, the moves and the changes in place

- **Builds:**
  - **The sheet.** Rewrite `docs/decks/devotion.md` in the format of `docs/decks/commerce.md`:
    - a header: what the sheet is; "Why each card is here" names the themes pass (section 12 holds your answers) and the list doc; "The build plan" names this triage; "Doctrines: none yet"; the old sheet is `git show 155106c9:docs/decks/devotion.md`;
    - the status list (`implemented`; `modify` with `deferred`, `revised`, `reworked`, `moved`, `shared` and `as built`; `add`), and the Type note;
    - two counts tables (by status, by type), five tier tables (Card | Rarity | Status | Ability | Type), an empty Doctrine table under each of Tiers I to IV, the shared table (Card | Rarity | Also in | Tier | Status | Ability | Type) with all 29 rows, and "Open for your pass" with a "Ruled 2026-10-25" list pointing at section 12 of the themes pass and this plan;
    - every card of this plan's tier tables, with its target text, rarity and type from the list doc. The devout texts follow reading 2. The cut rows are off the tables.
  - **The sort.** `devotion` joins `SORTED_DECKS`. Every row the sheet lists carries its type in the data: the 42 Devotion rows with data, and the shared rows that name Devotion (Sacred Commissions and Sacred Patronage gain one). A retired row carries none.
  - **The sync test,** a "sheet of record" block in `test/sim/decks/devotion.test.ts`, on the model of `commerce.test.ts`: statuses, types, counts tables, every live row listed once, the shared table mirrored onto `common.json`, every shared row naming Devotion listed. The file's own pins move: 77 → 71 rows, 25 → 29 retired, 50 → 41 live, 2 → 1 deferred, the band spread, `KINDS_USED`, the deferred list and the commission list. The age gate widens (reading 1).
  - **The retirements:** 4 rows (reading 7).
  - **The moves to `common.json`:** The Holy Spring, The Priest-Astronomers, The Monastic University, The Painted Chapels, The Festival Calendar and The Penitents' Roll from `devotion.json`, and The Ambarvalia from `expansionist.json` (reading 8).
  - **The tier moves:** The Second Prophet, The Living Hymnal and The Mission (1 → 2); The Conversion of Kings and The Pious Masons (4 → 3); Sacred Commissions (1 → 2).
  - **Cards changed in place (5):** Lay Offerings, The Settled Faith, The Mission, The Conversion of Kings, The Great Commission. The Interdict takes its target text and stays deferred (reading 12).
  - **The partner sheets:** the Expansionist sheet moves The Ambarvalia from its Tier 0 table to its shared table and lists The Holy Spring; the Scientific sheet lists The Priest-Astronomers and The Monastic University; both recompute their counts. The Magisterial sheet gains one line, as "Where this plan meets the Magisterial plan" says.
- **Fence:** `data/decks/devotion.json`, `data/decks/common.json` **(shared with MG)**, `data/decks/expansionist.json` (one row leaves), `docs/decks/devotion.md`, the shared tables and counts of `docs/decks/expansionist.md` and `docs/decks/scientific.md`, a line in `docs/decks/magisterial.md` **(shared with MG)**, the Devotion and Expansionist shelves and the Cross-type table of `docs/orders-and-doctrines.md` **(shared with MG)**, `test/fixtures/cardText.json` **(shared with MG)**, `src/sim/state.ts` (the schema line) **(shared with MG)** and its pins, `test/sim/decks/sortedSheets.ts`, `test/sim/decks/devotion.test.ts`, `test/sim/decks/expansionist.test.ts` and `test/sim/decks/scientific.test.ts` (their counts), `test/sim/decks.test.ts` (the dealt total falls by the 3 live rows retired), `test/sim/statecraft.test.ts` (the fold registry), a new `test/sim/decks/devotionThemeCards.test.ts`. `src/sim/statecraft/describers.ts` only if a sentence reads badly.
- **Depends on:** batch R1, which edits `devotion.json`, `common.json`, `data/religion.json` and the sheets DV1 rewrites.
- **Schema:** one bump (4 rows leave the pools, 7 rows change files, every listed row gains a type).
- **Done-gate:** `npx vitest run test/sim/decks/devotion.test.ts test/sim/decks/devotionThemeCards.test.ts test/sim/decks/common.test.ts test/sim/decks/shared.test.ts test/sim/decks/dominion.test.ts test/sim/decks/expansionist.test.ts test/sim/decks/expansionistCards.test.ts test/sim/decks/scientific.test.ts test/sim/decks/commerce.test.ts test/sim/decks/magisterial.test.ts test/sim/decks.test.ts test/sim/statecraft.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts test/sim/ritePreview.test.ts test/ui/ritesTab.test.ts`, every schema pin, and the fence's files typecheck.

- **Built (2026-10-25):** as planned, except the line in `docs/decks/magisterial.md`, which the Magisterial track writes. The gate passed: the type check, 9,562 core tests and the build. Schema 176. Readings added: The Founding Vows is `modify: as built` until DV4; The Interdict is `modify: deferred` with its target text; The Creed is `modify: reworked` until DV3; the Charters column counts "No chair required."; the age gate also forbids "foreign" and "follower". `notKeepingRite` has no reader and stays in the code. Not done: Lay Offerings prints "a Pasture or Camp or Plantation"; two texts say "every city that follows your religion" until DV2's word; old notes for retired rows stay in the "Notes and deferred halves" section of `docs/orders-and-doctrines.md`.

### DV2: the new data-only cards, feature E's word and the shared Scientific rows

- **Builds:**
  - Seven Devotion rows: The Deaconries, The Lives of the Saints, The Martyrology, The Consecration Feast, The Pilgrim Towns, The Holy Summons, The Work of God.
  - The shared The Shrine Guards (a new row; the Dominion sheet lists it).
  - The three shared rows the Scientific plan left: The Monastery Libraries leaves `deferred`; The Blessed Forges is a new row; The Schoolmen's Charter is a new charter row with the placeholder technology `scholasticism` (`data/techs.json`, `TechId`), `unlocksBuilding` cathedral and `unlocksUnit` apostle on the technology, and `unlockedByCard` on the two rows (reading 24). If you answer question 1 with the alternative, the `unlocksUnit` line and the Apostle's marker are left out.
  - Feature E's word: the `ownersFaith` phrase for `keeps: true` becomes "devout" in the describers, and one Compendium line says what a devout town is.
- **Fence:** `data/decks/devotion.json`, `data/decks/common.json` **(shared with MG)**, `docs/decks/devotion.md`, the shared rows of `docs/decks/dominion.md` and `docs/decks/scientific.md`, `src/sim/statecraft/describers.ts` (the one phrase) **(shared with MG)**, the Compendium line (`src/ui/compendium.ts` or `compendiumText.ts`), `data/techs.json`, `src/sim/techData.ts`, `data/buildings.json` and `data/units.json` (one marker each), `docs/tech-tree.md` (`TECH_DOC_WRITE=1`) and `docs/units.md` (`UNITS_DOC_WRITE=1`) if they change, the Devotion shelf and the Cross-type table, the fixture, the schema line and its pins, `test/sim/decks.test.ts`, `test/sim/tech.test.ts` (63 → 64 rows, the cost pin), `test/ui/techChart.test.ts` (the crossings), `test/sim/decks/scientificCharters.test.ts`, `test/sim/decks/devotionThemeCards.test.ts`.
- **Depends on:** DV1.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/devotionThemeCards.test.ts test/sim/decks/devotion.test.ts test/sim/decks/dominion.test.ts test/sim/decks/scientific.test.ts test/sim/decks/scientificCharters.test.ts test/sim/decks/shared.test.ts test/sim/decks/common.test.ts test/sim/tech.test.ts test/sim/techDocSync.test.ts test/ui/techChart.test.ts test/ui/compendium.test.ts test/ui/compendiumCharterTechs.test.ts test/sim/decks.test.ts test/sim/statecraft.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.
- **After DV2 a playtest can start:** 46 of the 66 Devotion cards and 27 of the 29 shared cards play as written.

- **Built (2026-10-25):** as planned. The gate passed: the type check, 9,590 core tests and the build. Schema 178. Beyond the fence: the Apostle is bought only, so `purchase.ts` lets a card that opens a unit early come before the tree's gate, and the city panel keeps the Apostle under "Not yet" for a seat without the charter. The charter's face names the early Apostle. Not done: the breakdown label `scopeNote` still says "follows your religion"; The Lives of the Saints prints "the first to convert", which can read as a world first.

### DV3: the engine's shapes

- **Builds:**
  - The Book of Life: `Player.faithSpent` (both player constructors), `spendFaith` beside `spendGold`, called at the seven places faith leaves the bank, and a `CountKind` `faithSpent` with its words (reading 13).
  - The Gifts of the Faithful: `buildingCategory` on the `faithBuysBuildings` rule, asked by `faithBankOpen` with the building in hand (a building argument on `cardActionRuleAt`, or a sibling reader) (reading 14).
  - The Offering Chests: `currency` on `purchaseRider`, read where the riders fold (`applyRiders`) (reading 15).
  - The Creed: `beliefsHeld` widened, its docblock, and the row's new text (reading 16).
  - The Sacred Precincts: `category` on `cityStat`, passed into `cityStatProbe` (reading 17).
  - The shared The Rising Nave: a `CountKind` of the front row's tenths, a `building` field on the town scope `queueHolds`, and the row (reading 18).
- **Fence:** `src/sim/statecraftData.ts`, `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts` **(all three shared with MG)**, `src/sim/state.ts` (`Player`, the two constructors, `spendFaith`, the schema line) **(shared with MG)**, `src/sim/purchase.ts` (`faithBankOpen`, `purchaseItemAt`, `contributeAt`, the riders) **(shared with MG: Magnificence)**, `src/sim/religion.ts` (the four subtractions only), `src/sim/greatPeople.ts` (`chargeBank`) **(shared with MG: Sacred Patronage)**, `data/decks/devotion.json`, `data/decks/common.json` **(shared with MG)**, `docs/decks/devotion.md`, the shelves and the fixture, `src/ai/value.ts` (stand-in arms) **(shared with MG)**, `test/sim/decks.test.ts`, a new `test/sim/decks/devotionEngine.test.ts`.
- **Depends on:** DV2.
- **Schema:** one bump (`Player` gains a field).
- **Done-gate:** `npx vitest run test/sim/decks/devotionEngine.test.ts test/sim/decks/devotion.test.ts test/sim/purchase.test.ts test/sim/religion.test.ts test/sim/faithLadder.test.ts test/sim/greatPeople.test.ts test/sim/combat.test.ts test/sim/slateRegister.test.ts test/sim/decks.test.ts test/sim/statecraft.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts test/mapgen/moduleCycles.test.ts`.

- **Built (2026-10-25):** as planned. The gate passed: the type check, 9,629 core tests and the build. Schema 180. `spendFaith` (`state.ts`) is now the one place faith leaves the bank, pinned by a source test; the slate register lists it. `beliefsHeld` no longer counts a founder's gods twice. Readings added: The Rising Nave also counts the Magnum Opus at the front row (it is not marked a wonder); a project at the front counts 0; an empire rite counts its faith once. The explore pins moved because every seat now carries `faithSpent`. Not done: the new count `frontRowTenths` is outside the slate register (no happiness or authority card reads it); two printed lines are long or repeat a word.

### DV4: rites are seasons

- **Builds:**
  - The season rule (reading 9): `performRiteAt` raises `riteStarted` and pays the `rite` moment only for a rite with no `atOnce`; `empireRiteAt` raises and pays both once in each town it reaches.
  - The `rite` moment's facts: `townId` and `population`. The docblock of the `rite` member (it still names the augur) and of `payRiteRiders` (it says no card rides the moment) are rewritten.
  - Cards: The Rogations, The Psalter, and The Founding Vows' narrower count (readings 9, 19).
  - The Sabbath Laws: the step-14 shape that moves production into culture, registered in `docs/yields.md` (its row and its register line); the Rite of the Sabbath row; the charter row (reading 20).
- **Fence:** `src/sim/religion.ts` **(shared with MG)**, `src/sim/statecraftData.ts`, `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts` **(all three shared with MG)**, `src/sim/yields/town.ts` (step 14 only) **(shared with MG)**, `docs/yields.md` **(shared with MG)**, `data/religion.json`, `data/decks/devotion.json`, `docs/decks/devotion.md`, the shelves and the fixture, the schema line and its pins, the religion lines of `docs/README.md` (eight live rites become nine), `src/ai/value.ts` (stand-in arms), `test/sim/decks.test.ts`, `test/sim/decks/devotion.test.ts` (The Founding Vows' test), a new `test/sim/decks/devotionRites.test.ts`.
- **Depends on:** DV3.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/devotionRites.test.ts test/sim/decks/devotion.test.ts test/sim/religion.test.ts test/sim/ritePreview.test.ts test/ui/ritesTab.test.ts test/ui/riteFeedback.test.ts test/sim/occasionRiders.test.ts test/sim/yieldsDocSync.test.ts test/sim/decks.test.ts test/sim/statecraft.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.

- **Built (2026-10-25):** as planned. The gate passed: the type check, 9,664 core tests and the build. Schema 182. The Sabbath is a new kind, `productionToCulture`, read at step 14 after the surplus moved, with its row and register line in `docs/yields.md`. Beyond the fence: `docs/beliefs.md` and `docs/religion-v2.md` list the new rite (and R1's Rite of Fasting); the city panel's production and culture chips show the moved line; an empire rite's command result now returns wonders and triumphs, as a town's rite does. Readings added: under The Laws of Lord Shang, food moved into production goes on into culture in a Sabbath town; the mover reads the empire's law and the town's rites only; The Psalter counts the citizens when the season starts; the `rite` occasion reads "starting a rite". Not done: the rite preview has no line for The Psalter; the bots' rite rate still assumes the old tempo (DV9).

### DV5: the faith's reach

- **Builds:**
  - The Parishes: the founding seam hands `payWindfallGrants` a presser (reading 21). `pressLump`'s pin in `test/sim/religion.test.ts` names the new caller.
  - The Confessors: the sight rule and its sources in `sightSources` (reading 22).
  - Commission: The State Church: the `every` switch on `GoalTowns`, read by the `citiesAdmitted` figure, and the row (reading 23).
- **Fence:** `src/sim/cities.ts` (`foundCityAt`) **(shared with MG)**, `src/sim/visibility.ts`, `src/sim/commissions.ts` **(shared with MG: its goal figures)**, `src/sim/statecraftData.ts`, `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts` **(all three shared with MG)**, `data/decks/devotion.json`, `docs/decks/devotion.md`, the shelves and the fixture, the schema line and its pins, `src/ai/value.ts` (stand-in arms), `test/sim/religion.test.ts` (the pin), `test/sim/decks.test.ts`, a new `test/sim/decks/devotionFaith.test.ts`.
- **Depends on:** DV4.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/devotionFaith.test.ts test/sim/cities.test.ts test/sim/visibility.test.ts test/sim/commissions.test.ts test/sim/aiCommissions.test.ts test/sim/religion.test.ts test/sim/decks.test.ts test/sim/statecraft.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts test/mapgen/moduleCycles.test.ts`.
- **For the orchestrator:** `CLAUDE.md` and `docs/README.md` say `pressLump` has exactly two callers. After DV5 it has three, and after DV6 four.

- **Built (2026-10-26):** as planned. The gate passed: the type check, 9,693 core tests and the build. Schema 184. `pressLump` has three callers now (`proclaimAt`, `payBattleRiders`, `foundCityAt`), pinned in `religion.test.ts` and named in `docs/README.md`; `CLAUDE.md` still says two and waits for the user's yes. `windfallPayout` lets `fromOccasion` scale a pressure grant. Readings added: The Parishes presses 10 for each starting citizen (one convert each), so a town founded large still turns whole; the lump is pressed inside the founding payout; an empire paid by two religions presses both; The Confessors' sight shows at the next visibility recompute.

### DV6: feature F, a conversion as a moment

- **Builds:**
  - The `WindfallOccasion` member, its facts and its words (reading 3).
  - The queue and its drain, called where each pressing ends, with a presser for a lump paid at the moment, and the once-a-turn limit for each town and religion (reading 4). The pin names the drain's `pressLump` call.
  - Cards: Pentecost and The Mass Baptisms (readings 25, 26).
- **Fence:** `src/sim/religion.ts` **(shared with MG)**, `src/sim/statecraftData.ts`, `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts` **(all three shared with MG)**, `src/sim/turn.ts` (only if the drain needs a call after the tide's phase), `src/sim/combat.ts` (only if the capture lump's presser must drain) **(shared with MG)**, `data/decks/devotion.json`, `docs/decks/devotion.md`, the shelves and the fixture, the schema line and its pins, `src/ai/value.ts` (a stand-in arm), `test/sim/religion.test.ts` (the pin), `test/sim/decks.test.ts`, a new `test/sim/decks/devotionConversions.test.ts`.
- **Depends on:** DV5.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/devotionConversions.test.ts test/sim/religion.test.ts test/sim/religionLedger.test.ts test/sim/combat.test.ts test/sim/occasionRiders.test.ts test/sim/decks.test.ts test/sim/statecraft.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts test/mapgen/moduleCycles.test.ts`. `test/sim/religion.slow.test.ts` runs at the push gate.

- **Built (2026-10-26):** as planned. The gate passed: the type check, 9,728 core tests and the build. Schema 186. The moment is `townConverted`. `noteFirstConversion` queues it; `drainConversions` pays the queue in order, re-reading its length, and its presser feeds the same queue, so a Pentecost chain resolves in one ordered pass. `pressLump` takes an optional queue and drains itself without one, so the other lumps needed no change. The once-a-turn limit is an absolute stamp, `City.convertedOn`. `pressLump` has four callers (pinned; `CLAUDE.md` still says two). A two-empire Pentecost test ends and runs the same way twice. Readings 39 to 44 (in the batch's report): the stamp limits the moment, not the tally or the first-record; facts are read when the town turns; the barbarian seat is never paid. Not done: The Mission's tally can count one town twice in a chain turn; `docs/religion-v2.md` does not describe the moment.

### DV7: the holy sites, the Opus and the authority capstone

- **Builds:**
  - The Anchorites: `chargeCostOf` takes the empire, and a rule with a value sets a verb's price. Every reader passes the empire (`agentProblem`, `spendCharge`, `chargeCostWords`, the unit sheet, `src/ai/`) (reading 27).
  - The Abbeys: the rule that lets `plantHolySiteError` admit an apostle, the planting price for it, and the apostle's row on the unit sheet (reading 28).
  - The Interdict: the rule, read by `explainOpusGate` beside `opusSiege`, step 13's row and register line in `docs/yields.md`, and the row leaves `deferred` (reading 29).
  - The Caliphate: the row (reading 5).
- **Fence:** `src/sim/religion.ts` **(shared with MG)**, `src/sim/yields/town.ts` (`explainOpusGate`) **(shared with MG)**, `docs/yields.md` **(shared with MG)**, `src/ui/controls.ts` (the apostle's row and the price words), `src/ai/bot.ts` (the `chargeCostOf` callers only), `src/sim/statecraftData.ts`, `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts` **(all three shared with MG)**, `data/decks/devotion.json`, `docs/decks/devotion.md`, the shelves and the fixture, the schema line and its pins, the clergy line of `docs/README.md`, `src/ai/value.ts` (stand-in arms), `test/sim/decks.test.ts`, a new `test/sim/decks/devotionHolySites.test.ts`.
- **Depends on:** DV6.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/devotionHolySites.test.ts test/sim/religion.test.ts test/ui/religionV2.test.ts test/ui/unitPanel.test.ts test/ui/controls.test.ts test/sim/yieldsDocSync.test.ts test/sim/aiBot.test.ts test/sim/decks.test.ts test/sim/statecraft.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.

- **Built (2026-10-26):** as planned. The gate passed: the type check, 9,772 core tests and the build. Schema 188. New rules `chargePrice` (with `verb` and `value`), `apostlesPlantHolySites` and `opusInterdict`. `chargeCostOf` and `chargeCostWords` take the empire; it is still the one read of `prophetCosts`. `explainOpusGate` asks the siege, then the interdict, and returns one line (`docs/yields.md` step 13 and its register). The unit sheet shows the apostle's planting row under The Abbeys. `src/ai/bot.ts` had no `chargeCostOf` callers. Readings 45 to 50 (in the batch's report): a card's charge price sets the price and the lowest wins; The Abbeys needs a religion the empire founded; the siege names the line when both hold; the interdict stops a town's production fold only, not faith or gold poured into the Opus. Not done: `CLAUDE.md`'s charges line is stale; the Compendium's prophet text and the followers tab describe only the base rule; the bots do not plant with apostles yet (DV9).

### DV8: the two largest rule-breakers

- **Builds:**
  - The Turning of Swords: the behaviour rule, read in `applyCombat` beside Blood Brothers' clause, with its once-a-turn stamp (reading 30).
  - The Double Feast: the rule, a list reading of the rites a town keeps for the readers that need both, `riteGate`'s refusal widened, `clearCityRite` and the empire rite placed by reading 31, and the rite panel, the city panel and the faith screen showing two rites.
- **Fence:** `src/sim/combat.ts` **(shared with MG: The Custodians)**, `src/sim/religion.ts` **(shared with MG)**, `src/ui/ritesTab.ts`, `src/ui/cityPanel.ts`, `src/ui/religionScreen.ts`, `src/ui/bonusesTab.ts` (if it prints the rite), `src/sim/statecraftData.ts`, `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts` **(all three shared with MG)**, `data/decks/devotion.json`, `docs/decks/devotion.md`, the shelves and the fixture, the schema line and its pins, the rites line of `docs/README.md` ("one at a time per town"), `src/ai/value.ts` (stand-in arms and its `cityRite` reading), `test/sim/decks.test.ts`, a new `test/sim/decks/devotionRuleBreakers.test.ts`.
- **Depends on:** DV7.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/devotionRuleBreakers.test.ts test/sim/combat.test.ts test/sim/war.test.ts test/sim/religion.test.ts test/sim/ritePreview.test.ts test/ui/ritesTab.test.ts test/ui/riteFeedback.test.ts test/ui/cityPanel.test.ts test/ui/religionScreen.test.ts test/sim/decks.test.ts test/sim/statecraft.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.
- **After DV8 every Devotion card plays as written:** 66 of 66. 28 of the 29 shared cards do; Sacred Patronage waits for the MG plan.

- **Built (2026-10-26):** as planned. The gate passed: the type check, 9,812 core tests and the build. Schema 190. **Every Devotion card now plays as written (66 of 66).** The Turning of Swords is the rule `faithfulKillsConvert`, read in Blood Brothers' clause in `applyCombat`, with one `captureUnit` call still; the stamp is `PlayerStatecraft.sidesTurned`; a turning records a war loss (registered in `weariness.test.ts`), not a capture. The Double Feast is the rule `twoRites`, read by `ritePlacesFor`; `cityRites` lists a town's rites and `cityRite` still answers "keeps any rite"; no stored shape changed. The rites tab, the city panel, the faith screen and the bonuses tab show two rites. Readings 51 to 61 (in the batch's report), among them: the older rite is the one started first; a prophet's rite renews a rite the town keeps; a ranged kill also turns a unit. Not done: no combat forecast says a kill would turn the unit; the bots already start second rites through `riteError` (DV9 checks it).

### DV9: the bots

- **Builds:**
  - A `score.devotion` group in `data/ai.json`. The arena panel shows it with no page edit.
  - Prices in `src/ai/value.ts` for every new kind of DV3 to DV8:
    - the `faithSpent` count (a forecast from the seat's faith income, as `goldSpent` is forecast);
    - the faith-category narrowing of `faithBuysBuildings` and the `currency` field on `purchaseRider` (a cheaper faith-bought unit);
    - `cityStat` with a category (defence), and the front-row count (The Rising Nave);
    - the `rite` moment with its town (The Psalter) and the season rule in the `riteStarted` forecast;
    - the Sabbath's step-14 shape, in the bot's choice of rite;
    - the founding presser (The Parishes) and the sight rule (The Confessors);
    - The State Church's goal, through D16's commission price;
    - feature F's moment (a forecast of conversions from the seat's followers abroad) and Pentecost's lump;
    - the charge-price rule, the apostle's planting, the interdict (as `opusSiegeWorth` is priced), the turning rule (as Blood Brothers' rule, scaled to war) and the two-rite rule.
  - Two small behaviours: `apostleCommand` (`src/ai/bot.ts`) plants a holy site where `plantHolySiteError` allows it (The Abbeys), and the bot's rite planner starts a second rite where `riteError` allows it (The Double Feast).
  - The two institutions are priced by D16's commission price. Check that they price as their effects.
  - Re-pin the explore digest and the bot digests with the control-run method of the D batches.
- **Fence:** `src/ai/value.ts` **(shared with MG)**, `data/ai.json` **(shared with MG)**, `src/ai/aiConfig.ts` (the group's type), `src/ai/bot.ts` (the two behaviours), `test/sim/aiAppraisal.test.ts`, `test/sim/aiCommissions.test.ts`, `test/sim/aiBot.test.ts`, `test/sim/aiWants.test.ts`, `test/sim/explore.test.ts`, a new `test/sim/aiDevotion.test.ts`, and the digests.
- **Depends on:** DV8. It touches no sim file.
- **Schema:** none.
- **Done-gate:** `npx vitest run test/sim/aiDevotion.test.ts test/sim/aiAppraisal.test.ts test/sim/aiCommissions.test.ts test/sim/aiBot.test.ts test/sim/aiWants.test.ts test/sim/explore.test.ts`. The digest re-pin is the orchestrator's push-gate work (`npm run test:all`). **The Devotion build plan is then complete.**

### Order and overlaps

- The track: R1 → DV1 → DV2 → DV3 → DV4 → DV5 → DV6 → DV7 → DV8 → DV9, one at a time.
- Devotion cards that play as written, after each batch: 39 of 66 after DV1, 46 after DV2, 51 after DV3, 55 after DV4, 58 after DV5, 60 after DV6, 64 after DV7 and 66 after DV8. Shared cards: 23 of 29 after DV1, 27 after DV2, 28 after DV3, and 29 when the MG plan builds Sacred Patronage.
- The files the DV batches share with one another:

| File | Batches |
|---|---|
| `data/decks/devotion.json`, `docs/decks/devotion.md`, the Devotion shelf, the fixture, the schema line | DV1 to DV8 |
| `src/sim/statecraftData.ts`, `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts` | DV2 (the phrase only), DV3 to DV8 |
| `data/decks/common.json` | DV1, DV2, DV3 |
| `src/sim/religion.ts` | DV3 (the subtractions), DV4, DV6, DV7, DV8 |
| `docs/yields.md`, `src/sim/yields/town.ts` | DV4, DV7 |
| `test/sim/religion.test.ts` (the `pressLump` pin) | DV5, DV6 |
| `docs/README.md`, the religion section | DV4, DV7, DV8 |
| `src/ai/value.ts` | DV3 to DV8 (stand-in arms), DV9 |

- The files a Magisterial build is likely to touch too. Each DV batch rebases onto MG work in these files before it starts, and keeps its edits additive:

| File | DV batches | Why the MG plan needs it |
|---|---|---|
| `src/sim/statecraftData.ts`, `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts` | DV2 to DV8 | 31 new shapes |
| `src/sim/state.ts` (`SCHEMA_VERSION`, `Player`) | every card batch; DV3 adds a field | its own schema bumps |
| `data/decks/common.json`, `docs/orders-and-doctrines.md`, `test/fixtures/cardText.json` | DV1 to DV3; the fixture and the shelves in every card batch | Sacred Patronage, Travelling Players, two retirements |
| `docs/decks/magisterial.md` | DV1 (one line, or none) | MG1 rewrites the sheet |
| `src/sim/commissions.ts` | DV5 | six goal figures |
| `src/sim/purchase.ts` | DV3 | Magnificence (culture buys a wonder) |
| `src/sim/greatPeople.ts` | DV3 | the moment a great person is spent |
| `src/sim/cities.ts` | DV5 | works and land |
| `src/sim/combat.ts` | DV6 (only if needed), DV8 | The Custodians |
| `src/sim/yields/town.ts`, `docs/yields.md` | DV4, DV7 | wonder and work lines |
| `src/ai/value.ts`, `data/ai.json` | DV3 to DV9 | its own stand-ins and bot batch |
| `src/sim/occasions.ts` | none | feature G |

## Counts

**By group** (the 66 rows of the tier tables, charters included):

| | Built | Group 1 | Group 2 | Group 3 | MG | All |
|---|---|---|---|---|---|---|
| Tier 0 | 4 | 2 | 2 | 0 | 0 | 8 |
| Tier I | 5 | 0 | 2 | 0 | 0 | 7 |
| Tier II | 8 | 7 | 6 | 0 | 0 | 21 |
| Tier III | 4 | 6 | 6 | 0 | 0 | 16 |
| Tier IV | 10 | 2 | 2 | 0 | 0 | 14 |
| **All** | **31** | **17** | **18** | **0** | **0** | **66** |
| Shared | 15 | 12 | 1 | 0 | 1 | 29 |

"Built" counts the rows that play as built, and The Fast and The Rites Commonwealth as R1 leaves them. Beside these, DV1 retires 4 rows.

**The deck after section 12** (from the list doc; seatable cards, the charters apart):

| Tier | Seatable | Military | Economic | Civic | Wildcard | Common / uncommon / rare | Charters |
|---|---|---|---|---|---|---|---|
| 0 | 8 | 0 | 2 | 5 | 1 | 5 / 3 / 0 | 0 |
| I | 6 | 1 | 2 | 3 | 0 | 2 / 3 / 1 | 1 (Civic) |
| II | 20 | 2 | 3 | 13 | 2 | 5 / 13 / 2 | 1 (Civic) |
| III | 16 | 3 | 2 | 10 | 1 | 1 / 8 / 7 | 0 |
| IV | 14 | 3 | 3 | 7 | 1 | 0 / 3 / 11 | 0 |
| **All** | **64** | **9** | **12** | **38** | **5** | **13 / 30 / 21** | **2** |

- **The shared table:** 29 cards: 4 Military, 3 Economic, 22 Civic, and one charter among them (The Schoolmen's Charter).
- **New shapes:** 16 for Devotion's own cards (section 7's list, feature F's moment among them), feature E's word, and two for the shared cards (The Rising Nave's count and scope field). The Schoolmen's Charter needs a technology row, not a shape.
- **Doctrines:** none.

## Follow-ups

**The UI track** (`src/ui/`):
- Devotion's two institutions join the read-only list of institutions under the council.
- No notice reports a conversion moment's pay, a Pentecost chain or a unit that changed sides.
- Nothing says where The Confessors' sight comes from.

**The bot track:**
- The bots say few rites and found religions late (section 9 of the pass), so the rite cards and the devout-town cards are hard to measure. A behaviour batch, like Commerce's T8, may follow a playtest.
- No leader points at the spreading faith (section 2 of the pass).
- New knobs need rows in `data/ai.bounds.json`, as Commerce's follow-ups say of its own.

**The sheet:**
- Five rows play as built: Mission Houses, The Settled Faith (the flat −15), The Doctors of the Church, The Pious Masons and the shared The Silk Road Monks. A later pass rewrites their text to what the game does, or builds the text.
- Devotion's Doctrines: `docs/plans/devotion-doctrines.md`, then a triage of its own.
- `CLAUDE.md` and `docs/README.md` say `pressLump` has exactly two callers. DV5 and DV6 make it four; the orchestrator updates both lines.

## Questions for the user

1. **The Schoolmen's Charter opens the Apostle before Theology.** On 2026-10-21 you ruled for the Scientific charters: *"don't open units early, replace them with better versions"*. The Schoolmen's Charter, which you approved as a shared card, says "train the Apostle before Theology". *Recommended: build it as written* (reading 24). Your ruling was about soldiers ("the jump from one age of units to the next is too high"), and an apostle is clergy that fights nothing. The alternative is that the charter opens only the Cathedral early. Either way DV2 builds it, and the change is one line.
2. **The readings.** A reading is how the build interprets a text that could mean two things. May the build use readings 1 to 38 until you mark one? Fourteen are marked "to confirm": 2, 4, 13, 14, 16, 18, 20, 21, 22, 24, 27, 30, 31 and 32.
