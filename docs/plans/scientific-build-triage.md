# Batch S triage: the Scientific deck

**Status:** written 2026-10-21 by a read-only triage agent, before any S batch. It is the plan to build the Scientific deck as `docs/plans/scientific-themes.md` and `docs/plans/scientific-list-proposed.md` now stand: the themes pass, the rulings of sections 11 to 13, and the user's review comments of section 14 (*"ok i've made comments, let's implement."*). The readings below are the ones the build uses unless the user changes them here. Mark any you disagree with, as on the deck sheets.

Source: the two plan docs above, and the approved charter UX prototype, `docs/plans/mockups/charter-ux.html` (its decisions list and its two open questions). Facts were checked against the code at commit `2f1cd0a3` (branch `decks`). The deck sheet `docs/decks/scientific.md` is older than both plan docs, so it is not the source; batch S11 rewrites it.

**Groups:**
- **1, data only:** the text can be written with shapes that exist today. The cell names the shape.
- **2, new shape, no new player decision:** the behaviour is automatic, or uses UI that exists or that the approved prototype designs. The cell names what is missing.
- **3, needs a UX or player-decision call.** No card falls here. The charter UX is designed and approved, so building it is group 2 work (batch S10).

Every charter also needs S0, the charter technologies. A charter's group counts only what it needs beyond S0. Each cell starts with the batch that builds the row.

## Facts the cells rely on

**Charters today.**
- A charter is an Order row with `charter: CharterSpec` (`src/sim/statecraftData.ts`). `CharterSpec.unlocks` may name a `tech`, a `building`, `rites`, an `improvement` or a `unit`.
- The pick acts once: `applyCharter(player, id)` (`src/sim/statecraft/draft.ts`, called only by `settleOrderChoice`) writes `Player.charteredTechs`, `charteredBuildings` and `charteredRites`. A charter never takes a chair (`slotOrderError` refuses it), so a charter's card effects are never live. Everything "knowing it gives" must sit on the technology row.
- `charteredTechIds()` and `techIsChartered()` (`statecraftData.ts`) derive the charter technologies from the card rows. They walk every row, retired ones too.
- `researchError` (`src/sim/tech.ts`) refuses a charter technology to a seat that has not drafted it. `availableTechs` (`tech.ts`) does not: it filters by `prereqsMet` only. The bot's research loop (`src/ai/bot.ts`, the goal search) walks every `TECH_IDS`. Today no charter technology exists, so neither gap shows.
- `orderIsDealt` deals a charter with no effects, unless the row carries `deferred`.
- Ruling (qqqqqq) 10 (`docs/flags.md`): a charter technology costs its column's price × 1.5, "one figure in `data/rules.json`". The figure is not there yet: `rules.research` holds only `startingTechs` and `retoolCost`.
- Ruling (qqqqqq) 11: no card depends on a charter technology.
- A seat's draft pool is its own (ruling (qqqqqq) 13), so two seats may each draft the same charter.

**The tree and its price.**
- `data/techs.json` holds 50 rows (pinned in `test/sim/tech.test.ts`). `TechDef` (`src/sim/techData.ts`) has `name`, `glyph`, `age`, `row` (lane), `cost`, `prereqs`, `columnShift`, `unlocks`, `effects`, `paysBead`, `deferred`, `note`. `TechId` is a literal union.
- Display names differ from ids. Examples this plan uses: `philosophy` is Rhetoric, `physics` is Natural Philosophy, `letters` is Writing, `earthenware` is Pottery, `theLongCount` is Chronology, `prospecting` is Geomancy, `feudalism` is Castellany.
- `techDepth` is the longest prerequisite chain. `techColumn` bands the depths by age (`computeAgeColumnStarts`), so ages hold disjoint columns: age 1 is columns 0 to 3, age 2 is 4 and 5, age 3 is 6 to 8, age 4 is 9 to 12. `techColumnCount()` is 13 (pinned). `techChartLayout`, `chartCrossings` and `chartFalseChains` draw and pin the sky (`test/ui/techChart.test.ts`). `techDataProblems` refuses a lane at or past `TECH_LANE_LIMIT` (8) and a second technology that unlocks the same row.
- A column is a price, but the price is data: each row's `cost` is pinned to `COLUMN_COSTS = [5, 11, 24, 50, 100, 190, 360, 650, 1150, 1960, 3250, 5150, 8000]` by its column (`test/sim/tech.test.ts`). Nothing computes a cost at runtime.
- The readers of a technology's price: in the sim, `planResearch`, `turnsToTech` and `queueTurns` (`tech.ts`), `cities.ts` (the missing-science figure) and `statecraft/evaluator.ts` (Copying the Enemy's 10%); in the bots, `chain.ts` (2), `plan.ts` (2) and `bot.ts` (the cheapest fallback); in the UI, `techTree.ts` (5), `empireDrawer.ts` and `compendium.ts`.
- `highestAge(techs)` (`techData.ts`) is the one reading of an empire's age: 28 call sites in 18 files go through it, among them `settleResearch` (the age-entry bead), `score.ts`, `meters.ts`, `beads.ts`, `resourceEffects.ts` and the top bar. `columnReached` (`tech.ts`, a unique's arrival) and `lastAgeTechCount` (The Great Enquiry) read the known technologies' columns and ages too.
- `docs/tech-tree.md` Part 2 is generated from the rows (`TECH_DOC_WRITE=1 npx vitest run test/sim/techDocSync.test.ts`).

**A technology as a card source.**
- `TechDef.effects` is `liveEffects`' tenth source, walked in `techsResearched` order. `pushEffects` labels each line "<class word> · <technology name>", once per card.
- Steel carries `unitStat` movement +1, `class: { modelClass: 'melee' }`. Castellany carries a `combatLine`. The Golden Roads (`theSilkRoad`) carries `routeRider` `extra: 1`, the shape of the Printers' "+1 trade route".
- `settleResearch` (`tech.ts`) is the one completion routine. It marks `techWorld` firsts (`markFirst`), pays the `tech` windfall occasion with facts `{ firsts, tech }`, and runs `upgradeUnits`. `researchSince` reports `UnitUpgradeTally` rows by comparing snapshots; `describeUpgrade` prints them.

**Upgrades.**
- `upgradeUnits` runs on every completion and every turn (`advanceResearch`). `upgradeTargetFor` and `upgradeTargetForType` walk `UnitDef.upgradesTo` and stop at `isUnlocked`, at `awaitsTech`, and at a strategic copy (`canSpareAnyOf`, `controlsAnyOf`). `applyUpgrade` keeps the id, the tile, the health fraction and the experience. The type reading is also the build list's obsolescence test.
- Chains in `data/units.json`: spearman → phalanx → spearWall → pikeman; chariot → horseman → knight; archer → bowman → compositeBowman → crossbowman; catapult → trebuchet (Natural Philosophy); warrior → swordsman → legionary → longswordsman; fireShip → gunGalley → frigate (`awaitsTech`). Uniques join partway: fubing and ponticPeltast at spearWall, slinger at compositeBowman, khopesh at legionary, eagleWarrior at longswordsman, tangCavalry, numidianCavalry and mandekalu at knight.
- `UnitFilter` has `type`, `modelClass`, `category`, `ranged`, `ageAtMost` and others, and no line. `unitMatches(type, filter)` takes no state and no player.

**The two unit flags.**
- `UnitDef.hitAndRun` (the light hulls) is read in `applyCombat` beside `cardBehaviorRule(state, owner, 'moveAfterAttack', type)`. That behaviour rule (The Swift Riders, Dominion D2) already gives a card's units the same price: an attack costs one point of movement and the rest is kept. `applyCombat` resolves ranged and melee attacks in one path.
- `UnitDef.blockades` (the heavy hulls) is read only through `blockades(def)` (`src/sim/blockade.ts`), at four places: `blockade.ts` and three in `combat.ts`. It takes a row, not a piece, so no card can grant it today.

**Buildings.**
- `BuildingDef.oncePerEmpire` is the limit (`buildError`); `empireBuilding` is the class. The action rule `buildsEverywhere` (Caravanserai Cities, `cardBuildsEverywhere`) lifts the limit for one row. Nine tree rows are empire buildings, plus the Magnum Opus and the Valley of Kings; all eleven carry both fields. Counts and scopes: `empireBuildings` (`within: 'city'` narrows it), `hasEmpireBuilding` with `standingTurns`.
- `BuildingDef.effects` is read by the same evaluator (the Granary, the Forum and the Printing House carry card effects), so a new building can pay in any existing shape.
- `unlockedByCard` with a `column` marks a row no node names. `cardUnlocksBuilding` opens it (an `unlocksBuilding` effect, or `Player.charteredBuildings`). The Scriptorium is such a row (column 4, opened by the retired Scriveners' Charter). The Bastion is `awaitsTech` (column 10). `isUnlocked` keeps an arm for a row a node names and a card opens early ("a card stands in front of the tree's gate"); no row uses it today.

**Improvements.**
- `ImprovementDef` (`src/sim/improvementData.ts`) has `requiresTech`, `validTerrain`, `freshwaterTerrain` (a widening on watered ground; with `requiresHills: false` it means "flat land with fresh water"), `adjacentImprovement` (it only widens the terrain), `onePerTown` (the Keep, E4), `unlockedByCard` and `greatPerson`.
- A charter opens a row on the pick through `CharterSpec.unlocks.improvement` (`cardUnlocksImprovement`); a seated card through `unlocksImprovement` (E4). A row whose `requiresTech` is a charter technology opens only for the holder, because only the holder can research it.
- A great person lays a work through `buildImprovementAt`, which pays the `improvementBuilt` occasion with `{ improvement }`. A `windfallRider` may name one `improvement`.
- Strategic copies: `resourceCopies` → the memoised ground sweep (`sweepOwnCopies`) and the card shares outside the memo (`ownCopies`, Strategic Exports). An Academy opens the resource under it (`openedResource`).
- Farm water: `farmWaterField` (`statecraft/evaluator.ts`), E3's watered farms.

**The guilds phase.** `runGuilds` (`src/sim/guilds.ts`) is passive. The share cap is `rules.cities.guilds.maxShare` (1/4), the pay is `rules.cities.guilds.pays` (scholar 2 science, merchant 4 gold, engineer 2 production, artist 2 culture), and guildsmen live in `City.specialists` by family. `citySpecialistYields` is step 5 of the town fold. No `CountKind` reads guildsmen.

**The combat ledger.**
- `planCombat` (`src/sim/combat.ts`) is one ledger of labelled flat lines. A `combatLine` effect carries `when` (a `CombatCondition`), `side`, `class`, `vsClass` and `scaled` (a `CombatScale` with a `CombatScaleCount`). Conditions read the contested hex: a defender's own, an attacker's target.
- Existing conditions include `targetBelowHalf`, `inCity` (your town on the contested hex), `vsWiderEmpire`, `besideGreatGeneral` and `standingIn` (E3, which reads the piece's own hex when it attacks). No condition reads "the piece stands in your town" in attack. No scale reads a town's citizens or a count of technologies.
- The great general's aura is `generalAuraLines` (`combat.ts`): `rules.greatPeople.generalAuraStrength` (3) within `generalAuraRange` (2), own soldiers only, the first general in `state.units` order, never stacking. The `generalAura` amplifier target (The Strategoi) scales it.

**The effect union.** `CardEffect` (`src/sim/statecraftData.ts`); its one reader is `src/sim/statecraft/evaluator.ts` (use `grep -a`).
- Existing shapes these cards use: `pays` (`where` × `basis`; `count`, `family`, `within`, `tile`, `on`, `wholePercent`, `origin`, `stage`, `max`), `percentYields`, `productionBonus` (`empireBuilding`, `category`, `building`), `rulePercent`, `combatLine`, `unitStat` (`range`, `heal`), `unitStamp` (`strength`, `scope`, `class`), `windfallRider` (`improvement`, `first`, `family`, `buildingCategory`, `empireBuilding`, `wonder`), `renown` (`count`, `family`), `cityStat`, `conditionRule` (`cityCountAtMost`), `rule` (`moveAfterAttack`, `buildsEverywhere`), `unlocksBuilding`, `metaRule` (`turnEffectRepeats`), `routeRider`.
- Tile tests include `improvement`, `greatWork`, `resourceKind`, `beside` (`of`), `standingSince`. Town scopes include `workingImprovement` (no age), `workingGreatWork` (`standingTurns`, no family), `hasBuilding` (`standingTurns`), `populationAtLeast`, `raisingOpus`.
- Grants (`WindfallGrantSpec`) deliver `toCapital`, `toEveryTown` (or a scope), `toNearest` or `toOpus`, scaled by `fromOccasion` or `fromRate`. A grant has no great person. A commission reward (`CommissionReward`) has `greatPerson: Family`, `eachTown` and `fromFigure`.
- Missing: counts of technologies known, charters drafted, charter technologies known, guildsmen and the lead; a tally for a technology completed (the `tech` windfall occasion exists, a `tech` tally does not).

**What the data holds for Scientific today.**
- `data/decks/scientific.json`: 40 rows in bands 0 to 3 (no Tier IV row), none retired, none typed.
  - 20 live: The Almanac, The Scribes' Hall, The Long Study, The Old Academy, Learned Commissions (to become Learned Foundations), The Assay, Enduring Institutions, The Quiet Faculties, The Long Inheritance, Field Notebooks, and the ten rows the sheet cut earlier (Practical Astronomy, Working Estates, The Endowed Provinces, The Royal Society, The Learned Chancery, The Academy Quarter, The Patent Rolls, Master Artificers, The Society of Artificers, The Learned Realm).
  - 20 deferred: five charters naming technology ids the tree lacks (the Glassmakers' `optics`, the Metallurgists' `alloys`, the Naturalists' `taxonomy`, the Mechanists' `mechanics` in band 3, the Alchemists' `chemistry`); The Second Seat; The Strategic Reserves (to become The School of Mines); Discoveries through Great People; and twelve rows the sheet cut on 2026-10-06 that the plan docs do not name (The Celestial Rites, Natural Philosophy, Apprentice Engineers, The Research Annals, Patient Research, The Open Collegium, The Practical Arts, Research through Construction, The Inherited School, Husbandry Studies, Commissions of Service, The Distant Colleges).
  - Live figures older than the docs: Enduring Institutions +23% with +2 happiness; The Long Inheritance +45% and +23% on any work; The Quiet Faculties +38% and +30% on any work; Learned Commissions +38% with two riders; The Assay +3 science and +3 gold per kind.
- `data/decks/common.json`: 14 rows name Scientific. Live: Field Academies, The Engineer Corps, Hydraulic Schools, Merchant Scholars (band 1), The Exchange of Discoveries (band 3), Cloister Schools, The Cloister, Illuminated Treatises, The House of Wisdom, The Merchant Navigators, Carried-Off Scholars, Copying the Enemy. Deferred: The Hydraulic Commonwealth, The Monastery Libraries. Only rows shared with Dominion or Expansionist carry a type.

**The deck sheet and its tests.**
- `docs/decks/scientific.md` is the 2026-10-12 sheet (61 cards, 11 charters). No test reads it.
- `test/sim/decks/scientific.test.ts` pins the data instead: 40 rows, bands `[10, 10, 12, 8]`, five deferred charters naming `['optics', 'alloys', 'taxonomy', 'mechanics', 'chemistry']`, and "five nodes the tree does not hold yet". It also checks the Scientific shelf of `docs/orders-and-doctrines.md`; `test/sim/statecraftDocSync.test.ts` is the strict mirror of every live row.
- `test/sim/decks/sortedSheets.ts` lists `SORTED_DECKS = ['dominion', 'expansionist']`. `dominion.test.ts` fails a typed row that no sorted sheet lists. An unsorted card fits any chair (`orderFitsSlot`), so untyped rows can be dealt and seated.

**Other.**
- Bots price a card by its effects (`src/ai/value.ts`). A technology charter has no effects and no arm reads `CharterSpec.unlocks.tech`, so a bot gives it nothing. `scoreUnlockedBuilding` prices a building charter.
- `NotificationAction` (`src/ui/notifications.ts`) has three kinds: `pan`, `openStatecraft`, `openGreatPerson`.
- `SCHEMA_VERSION` is 151 (`src/sim/state.ts`).

## The charter technologies: a placeholder placement

The user's chart places these (section 12, item 6, open). The build uses the placeholders below, which the user can move. Each row has one ordinary parent and sits one column right of it, inside its own age's columns, so it moves no lane and no price of the sky (`CLAUDE.md`, "The tree"). The ids `optics`, `mechanics` and `chemistry` are the ones the existing charter rows already name. Shelf lanes are placeholders too: two charter rows never share a column and a lane.

| Charter | Technology (id) | Age | Parent (its column) | Column | Price: column × 1.5, floored | Shelf lane |
|---|---|---|---|---|---|---|
| The Herbalists' | Herbals (`herbals`) | 1 | Pottery (1) | 2 | 36 | 0 |
| The Bronze-Founders' | Casting (`casting`) | 1 | Bronzeworking (2) | 3 | 75 | 0 |
| The Surveyors' | Surveying (`surveying`) | 2 | The Wheel (3) | 4 | 150 | 0 |
| The Librarians' | Cataloguing (`cataloguing`) | 2 | Writing (3) | 4 | 150 | 1 |
| The Glassmakers' | Optics (`optics`) | 2 | Chronology (4) | 5 | 285 | 0 |
| The Physicians' | Medicine (`medicine`) | 3 | The High Temple (5) | 6 | 540 | 0 |
| The Paper-Makers' | Papermaking (`papermaking`) | 3 | Rhetoric (6) | 7 | 975 | 0 |
| The Printers' | Printing (`printing`) | 3 | Rhetoric (6) | 7 | 975 | 1 |
| The Mechanists' | Mechanics (`mechanics`) | 3 | Mathematics (7) | 8 | 1725 | 0 |
| The Gunfounders' | Gunfounding (`gunfounding`) | 4 | Machinery (9) | 10 | 4875 | 0 |
| The Alchemists' | Chemistry (`chemistry`) | 4 | Geomancy (9) | 10 | 4875 | 1 |
| The Military Engineers' | Military Architecture (`militaryArchitecture`) | 4 | Castellany (10) | 11 | 7725 | 0 |
| The Naval Gunners' | Naval Gunnery (`navalGunnery`) | 4 | The Astrolabe (11) | 12 | 12000 | 0 |

Naval Gunnery is the dearest. With Natural Philosophy (10) as its parent it would sit in column 11 at 7725, but the Galleass trait would then arrive before the Gun Galley does.

## Tier 0

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Herbalists' Charter | new; revised (section 14) | 1 | S4. The Physic Garden row: `requiresTech: 'herbals'`, `validTerrain: []`, `freshwaterTerrain` [grassland, plains, desert, tundra], `requiresHills: false`, `onePerTown: true`, science 2. The happiness is on Herbals: `pays` `where: 'empire'`, `basis: 'count'`, `count: 'tilesInBorders'`, `tile` improvement physicGarden, `to: 'happiness'`, 2 (reading 28). A placeholder map piece and its flair gallery entry. |
| The Bronze-Founders' Charter | new | 2 | S1. On Casting: Hoplite, `combatLine` +1 `always` and +1 scaled by a new `CombatScaleCount` `townCitizensHere` with `per: 4`, both `class: { line: 'spearman' }` (reading 26). Maryannu, `combatLine` +1 `always` and +5 `targetBelowHalf`, `class: { line: 'chariot' }`. |
| The Almanac | implemented | – | Built. |
| The Scribes' Hall | implemented | – | Built. |
| The Long Study | implemented | – | Built. |
| The Prize Essay | add | 1 | S6. Two `windfallRider` `tech` with `first: 'techWorld'`: culture 15 and production 15, `toCapital`. "Charter technologies do not count" comes from S0: a charter technology never marks `techWorld` (reading 16). |
| The Prospectors' Notes | add; reworked | 1 | S5. Two `windfallRider` `improvementBuilt`, one each for mine and quarry, production 25. The grant lands in the town nearest the hex. |
| The Sky Watchers | add | 1 | S6. `pays` `where: 'city'` faith 1 science 1, scope `hasBuilding` shrine. |
| The Royal Workshops | new | 1 | S6. `windfallRider` `tech`, production 15, `toCapital`. |
| The Royal Tutors | new | 1 | S7. `renown` 1, `count: 'scienceBuildings'`, `family: 'scholar'`. |
| The War Manuals | new | 1 | S7. `unitStamp` `strength: 2`, class `category: 'military'`, scope `hasBuilding` library. |

## Tier I

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Surveyors' Charter | add; wording | 2 | S5. The Aqueduct early: Surveying carries `unlocksBuilding: 'aqueduct'`, and the Aqueduct row gains `unlockedByCard: true`, the existing early arm of `isUnlocked` (reading 29). The Qanat row (`requiresTech: 'surveying'`, flat land) and a new improvement field `watersBeside: true`, read by `farmWaterField` as a source (reading 30). A map piece. |
| The Glassmakers' Charter | modify: deferred; wording; revised (section 14) | 1 | S4. Optics names the Specularium in `unlocks.buildings`. The row (revised by the user, themes doc section 15): food 3, effects `pays` `where: 'city'`, `basis: 'count'`, `count: 'population'`, `within: 'city'`, `per: 2`, science 1, scope `hasBuilding` specularium. Drop the charter row's `deferred`. |
| The Librarians' Charter | new; revised (section 14) | 1 | S4. Cataloguing names the Mouseion. The row (revised by the user, themes doc section 15): `oncePerEmpire`, `empireBuilding`, effects `renown` 4 `family: 'scholar'`, and `pays` city count `empireBuildings` (empire-wide) culture 2, scope `hasBuilding` mouseion. Its price is 30% above an ordinary empire building of its column: a labelled line in `explainBuildingCost` from a row field, never a figure on the row (reading 56). |
| The Old Academy | implemented | – | Built. |
| Learned Foundations (was Learned Commissions) | modify: revised; trimmed | 1 | S7. Rename, keep the id. Keep the `productionBonus` (`empireBuilding: true`, scope `hasBuilding` library) at 25. Drop the two riders. |
| The Commonplace Book | add; moved from Tier 0 | 2 | S0. A `rulePercent` rule `charterTechCost`, −15, read as a line of `explainTechCost` (reading 14). |
| The Forward Plans | add | 2 | S8. A town `scope` on `unlocksBuilding`, read by `isUnlocked` and `buildError` with the town in hand: university, scope `hasBuilding` library `standingTurns: 30`. |
| The Astronomical Diaries | new | 2 | S6. A `TallyOccasion` `techCompleted`, raised in `settleResearch`. Then The Campaign Annals' form: flat `pays` `where: 'capital'` culture 2 production 2, and `pays` count `tally` 1 of each. |
| The Secret Arts | new | 2 | S3. `pays` `where: 'city'`, count `techLead` (feature B), production 1, `max: 5`. |
| The Scholars' Fame | new | 2 | S6. An `OccasionMeasure` `techCost` on the `tech` occasion (the folded price, reading 39). `windfallRider` `tech`, grant `renown` with `renownFamily: 'scholar'` scaled by it at one twentieth. A renown grant scaled by a measure exists (Looted Art, D6). |
| The Founding Gift | new | 1 | S5. `windfallRider` `improvementBuilt`, `improvement: 'academy'`, production 150 (reading 35). The themes doc lists "a founding moment" as new; it exists, because a work is laid by `buildImprovementAt`. |
| The Royal Estates | new; revised (section 14) | 1 | S7. `pays` city count `empireBuildings`, `within: 'city'`, food 2 production 2. |
| The Common Tables | new | 1 | S7. `pays` city count `scienceBuildings` (a town count) food 2. |
| The Dedications | new | 2 | S8. `windfallRider` `buildingCompletion`, culture 10 × `population` (E2 put population on the completion facts). Two riders (`buildingCategory: 'science'`, `empireBuilding: true`) would pay Chart the Stars and The Turning Heavens twice, so the rider needs an any-of filter (reading 36). |
| The Free Cities | new | 1 | S7. `conditionRule` `cityCountAtMost` 5: `productionBonus` building 20 and wonder 20. |
| The Edge of the Sword | new; revised (section 14) | 2 | S3. A `CombatCondition` `vsFewerTechs`: the other piece's owner is a real empire that knows fewer technologies (readings 7, 17). `combatLine` +3, `side: 'both'`. |
| The Field Refits | new | 2 | S9. A behaviour rule `upgradeHeals`, read in `upgradeUnits` after `applyUpgrade` (reading 41). |

## Tier II

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Mechanists' Charter | modify: deferred; reworked; revised (section 14) | 2 | S1. It needs only S1's line filter and trait block; the two traits are then existing shapes. On Mechanics: Onager, `unitStat` `range` +1, `class: { line: 'catapult' }`; Repeating Crossbow, the existing `rule` `moveAfterAttack`, `class: { line: 'archer' }` (reading 24). Band 3 → 2. |
| The Printers' Charter | add; wording; revised (section 14) | 1 | S4. Printing carries `routeRider` `extra: 1` (The Golden Roads' shape) and names the Aldine Press. The row: culture 2, effects `pays` `where: 'route'` science 2 culture 2, `origin` scope `hasBuilding` aldinePress (the Printing House's shape, from the other end). |
| The Paper-Makers' Charter | new | 1 | S4. Papermaking names `scriptorium` in its unlocks. Drop `unlockedByCard` and `column` from the Scriptorium row, so its price reads Papermaking's column. Its yields already match the text. |
| The Physicians' Charter | new | 1 | S4. Medicine names the Bimaristan. The row: `oncePerEmpire`, `empireBuilding`, effects `percentYields` food 25 scope `hasBuilding` bimaristan, and `unitStat` `heal` 10 `where: 'ownTerritory'`. |
| Enduring Institutions | implemented; reworked | 1 | S7. Drop the `happiness` effect, and bring 23% to the docs' 25%. |
| The Quiet Faculties | modify: revised | 1 | S7. Scope `workingImprovement` [academy] in place of `workingGreatWork`. Figures to the docs: 25, 20 and −25. |
| The Charter Rolls | add; moved; reworked | 2 | S6. A `CountKind` `chartersDrafted` (charter rows in the seat's collection). `pays` capital count, production 3 culture 3. |
| The Royal Charter Commission | add | 2 | S6. A `TallyOccasion` `charterTechCompleted`. Commission goal `counted` 1; reward `greatPerson: 'scholar'` and culture 100. |
| The Translation Movement | new | 2 | S3. A `rulePercent` rule `gapTechCost`, −20, read as a line of `explainTechCost` for a technology in the gap (readings 2, 14, 15). |
| The Roll of Scholars | new | 1 | S7. Two `pays` empire count `greatPeopleGained`, `family: 'scholar'`, `percent: 4`, `stage: 'empire'`, `max: 30`: production and culture. |
| The Latin Quarter | new | 1 | S5. `pays` hex culture 2 production 1 on `all` [`greatWork`, `beside` of improvement academy]. |
| The Royal Readers | new | 2 | S8. A rule read by `renownThreshold` (`src/sim/renown.ts`), which then needs the state as well as the player (reading 38). |
| The Invitations | new | 2 | S8. A great-person grant on `WindfallGrantSpec` (`greatPerson: Family`, the commission reward's field, dealt as an offer), on `windfallRider` `buildingCompletion` `empireBuilding: true` (reading 37). |
| The Palace Schools | new | 1 | S7. `unitStamp` `strength: 4`, class military, scope `hasEmpireBuilding`. |
| The Round City | new | 1 | S7. Two `pays` empire count `capitalPopulation`, `percent: 1`, `stage: 'empire'`, `max: 30`: production and culture. |
| The Great Designs | new; revised (section 14) | 2 | S3. `productionBonus` wonder 30 with a new filter `aheadOfMet: true`: no met empire knows the technology that opens the wonder (readings 6, 46). |
| The City Architects | new | 1 | S7. `productionBonus` wonder 25, scope `populationAtLeast` 8. |
| The Scholars' Guild | new | 2 | S2. Feature A: a `CountKind` `guildsmen` with `family` and `within: 'city'`. `pays` city count guildsmen scholar, food 1 production 1. |
| The Strategikon | new; revised (section 14) | 2 | S9. A `CombatCondition` `nearLearning` with `hexes: 2`, read off the piece's own hex: your unspent great general or great scholar, or an Academy hex inside your borders (readings 11, 44). `combatLine` +4, `side: 'both'`. |
| The Armoury Patterns | new | 2 | S9. A `UnitFilter` field `newestAge: true`. `unitMatches` must then know the owner's age (reading 43). `productionBonus` unit 25. |

## Tier III

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Gunfounders' Charter | add; moved; reworked; revised (section 14) | 1 | S4. Gunfounding names the Tophane. The row: `oncePerEmpire`, `empireBuilding`, effects `unitStamp` strength 4, class military, scope `hasBuilding` tophane; `productionBonus` unit military 25, same scope. |
| The Alchemists' Charter | modify: deferred; reworked; revised (section 14) | 2 | S1 writes the Grenadier on Chemistry: `combatLine` +1 `always` and +1 scaled by a new `CombatScaleCount` `charterTechsKnown`, `class: { line: 'warrior' }` (readings 5, 27). S5 adds Niter Beds and deals the row: `requiresTech: 'chemistry'`, a placement field `besideImprovement: ['farm', 'pasture']`, and a supply field `suppliesResource: 'niter'` read in `sweepOwnCopies` (reading 31). A map piece. |
| The School of Mines (was The Strategic Reserves) | modify: deferred, revised; reworked; moved | 2 | S5. A card share in `ownCopies`, beside Strategic Exports: one more copy for each Academy on a strategic resource (reading 32). |
| The Second Seat | modify: deferred | 2 | S8. `buildsEverywhere` gains a count (one second copy) and a town `scope` (`hasBuilding` university) (reading 47). |
| The Long Inheritance | modify: revised; rarity | 2 | S5. A `standingTurns` field on the `workingImprovement` scope (reading 34). Two `productionBonus` at 30: empire buildings (the Opus row is one, `empireBuilding: true`) and wonders. |
| The Proving Ground | add; moved; reworked | 2 | S3. `combatLine` +1 scaled by a `CombatScaleCount` `techLead`, `max: 8`. |
| The Age of Reason | new | 2 | S6. A `MetaRuleId` `techCountsTwice`, read where the `tech` occasion pays Orders' riders and where a technology tally counts (Double Time's shape). |
| The Journeymen | new | 2 | S6. A grant to every town scaled by each town's own population (`toEveryTown` with a new `fromTownPopulation: true`), production 3 (reading 40). |
| The Studium Generale | new | 2 | S5. A rule read by every card reading of an Academy: the `improvement` tile test, `workingImprovement`, `hasImprovement`, and the counts of Academy hexes (reading 33). |
| The Nizamiyya | new | 1 | S5. `pays` hex `wholePercent: 50` on improvement academy (D8's whole-hex share). |
| The Doctorate | new | 1 | S8. `windfallRider` `greatPersonGained`, `family: 'scholar'`, culture `fromRate` eight turns. |
| The Royal Academies | new | 1 | S8. Two `pays` empire count `empireBuildings`, `percent: 5`, `stage: 'empire'`: production and culture. |
| The Queen of Cities | new | 1 | S8. `percentYields` food 100 and production 100, scope `populationAtLeast` 15. |
| The Humanists | new | 1 | S8. `pays` city `basis: 'share'` from science to culture, 50, scope `hasBuilding` university (The Cloister's shape). |
| The Model Army | new | 2 | S9. A behaviour rule `upgradeIgnoresResource`, read in `upgradeTargetFor` for a piece, not in the type reading the build list uses (reading 42). |
| Greek Fire | new | 2 | S3. A rider filter on `unitCompletion`: no met empire can build the type (reading 45). Grant science and culture `fromOccasion: 'strength'`. |

## Tier IV

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Military Engineers' Charter | new | 1 | S4. Military Architecture names `bastion`. Drop `awaitsTech` and `column` from the Bastion row. |
| The Naval Gunners' Charter | new | 2 | S1. On Naval Gunnery: Galleass, `combatLine` +3 (reading 4) and a behaviour rule `blockades`, both `class: { line: 'gunGalley' }` (reading 25). |
| The Great Instrument | add | 2 | S9. Commission: goal `counted` 1 of the `techCompleted` tally with a `tech` filter (Alchemy); reward production equal to a tenth of the Opus's cost (reading 51); a deal gate "not dealt to a seat that knows Alchemy", read in `eligibleFor`. |
| The Great Catalogue | add | 2 | S6. `productionBonus` building `theMagnumOpus`, 10 for each charter technology known (`CountKind` `charterTechsKnown`, S1), `max: 40`. |
| The Foundation Stone | add | 2 | S9. A rule in the Opus clause of `buildError`: the seat may begin the Opus before `opusOpen` once half of Alchemy's folded cost is banked toward it; the Opus cannot complete until the seat knows Alchemy (reading 49). |
| The Sum of Knowledge | add | 2 | S6. A `CountKind` `techsKnown` (reading 17). `pays` capital count, production 1 culture 1. |
| The Closed Book | add | 2 | S9. A record on the state: the holder and the turn it completed Alchemy first. `buildError` refuses the Opus to an empire without Alchemy for ten turns after it (reading 50). |
| The Breaching Batteries | add | 2 | S9. `combatLine` +5 `attack` `vsCity`, class siege (existing). A hit effect in `applyCombat` that removes 5% of the Opus town's banked production (reading 52). |
| The Walls of Learning | add; rarity | 1 | S8. `cityStat` defense 6, scope `hasBuilding` university; `cityStat` defense 12, scope `raisingOpus`. The themes doc lists "the town building the Opus" as new; the scope exists. |
| The Lynx-Eyed Academy | add | 2 | S8. Commission: goal `reached` a new figure, Academy hexes inside your borders, 4; reward `greatPerson: 'scholar'` and production 300 to each town a scope admits (`eachTown` with a scope) (reading 53). |
| The Patent Office | add; rarity | 2 | S0. A `rulePercent` rule `charterPremium`, −100: the premium line goes (reading 14). |
| The Prototype Works | add | 2 | S9. An arm in `isUnlocked` for the rows of `Player.researching`, wonders left out, and a ×2 line in `explainBuildingCost` and `explainUnitCost` (reading 48). |
| The Republic of Letters | new | 1 | S5. `pays` capital count `tilesInBorders`, tile improvement academy, production 4 culture 4. |

## Shared with another deck

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Assay (Expansionist) | modify: revised; moved | 1 | S5. Move the row to `common.json`, `decks: ['expansionist', 'scientific']`, `pays` hex science 2 on `resourceKind` strategic (reading 8). Type it civic and list it in the Expansionist sheet's shared table, so `dominion.test.ts`'s typed-row rule passes. |
| The Soldier-Scholars (Dominion) | new | 2 | S9. A new row in `common.json`, `decks: ['dominion', 'scientific']`, type military, listed on the Dominion sheet. A `CombatCondition` `standingInOwnTown`, read off the piece's own hex as E3's `standingIn` is (reading 9). `combatLine` +5 `both`, class military; `pays` city count `garrison` science 2. |
| Books from the Ships (Commerce) | add | 2 | S3, or the Commerce build if it lands first. Feature B's gap: `pays` route `international`, science 1 for each technology in the gap, `max: 4`. Build the gap once. |
| Merchant Scholars (Commerce) | modify: revised; reworked | 2 | The Commerce build, or S5. `pays` route `international` scaled by a count read in the origin town (Academy hexes). The route × count pair counts only a route's length today, so `docs/yields.md` registers the new count. |
| The Monastery Libraries (Devotion) | modify: deferred, revised | 1 | The Devotion build. `pays` city faith 2 scope `hasBuilding` library; `pays` city science 2 scope `hasBuilding` temple. |
| The Blessed Forges (Devotion) | add | 1 | The Devotion build. `pays` hex faith 1 production 1 on an improved strategic resource; `pays` city faith 2 production 2 scope `hasBuilding` temple. |
| The Schoolmen's Charter (Devotion) | add; moved | 2 | Waits on the Devotion pass (reading 55). |
| The Exchange of Discoveries (Commerce) | implemented; moved from Tier III | 1 | The Commerce build: band 3 → 1. |
| Illuminated Treatises, Field Academies, Copying the Enemy, Hydraulic Schools, Cloister Schools, The Cloister, The Merchant Navigators, Carried-Off Scholars, The Engineer Corps, The House of Wisdom | implemented | – | Built. |

## Cut and retired rows

| Rows | In the data now | Action |
|---|---|---|
| The Palace Archive, The Fellowships, the Hermetic Charter, the Experimenters' Charter, The Great Experiment (section 14) | no row | None. They stay in the list doc's cut table. |
| The Metallurgists' and Naturalists' Charters | deferred charters naming `alloys` and `taxonomy` | S0: `retired: true`, and `charteredTechIds` skips retired rows, so the charter list stops naming technologies the tree will never hold. No save holds them: they were never dealt. |
| Field Notebooks | live | S11: `retired: true`. |
| The ten rows the sheet cut earlier (Practical Astronomy to The Learned Realm) | live | S11: `retired: true`. Section 8 of the themes doc names them. |
| Discoveries through Great People | deferred | S11: `retired: true`. |
| The twelve deferred rows the sheet cut on 2026-10-06 (The Celestial Rites to The Distant Colleges) | deferred | S11: `retired: true` (reading 54). |
| The Hydraulic Commonwealth | deferred, `common.json` | S11: `retired: true`. Cut on both its sheets. |
| Learned Commissions, The Strategic Reserves | live; deferred | Renamed to Learned Foundations (S7) and The School of Mines (S5). The ids stay. |

## Readings

The first twelve are the "to confirm" items of sections 12 to 14. The rest are new. Each gives the reading the build uses, then the alternative.

1. **Ruled 2026-10-21: no** (themes doc section 15). A charter technology does not count toward an empire's age: `highestAge`, `columnReached` and `lastAgeTechCount` skip it. Alternative: it counts, so Gunfounding learned early moves the seat's age, the world clock and the age-entry bead.
2. A rival's charter technologies do not count in your gap (The Translation Movement, Books from the Ships). Alternative: they count, and those cards pay for technologies you can never research.
3. The Naval Gunners' Charter gives the Galleass trait to the Gun Galley line, and opens no Frigate or Corvette. Alternative: it opens those `awaitsTech` hulls, which is a unit early.
4. The Galleass bonus is +3. Alternative: no strength, as the Mechanists' traits since section 14.
5. The Grenadier is +1, and +1 for each charter technology you know. Alternative: the user's "+1" agreed with +3.
6. The Great Designs counts only the empires you have met. Alternative: every empire, which shows hidden information.
7. The Edge of the Sword never applies against barbarians. Alternative: barbarians count as an empire with no technologies, so the line always applies.
8. The Assay pays when a citizen works the hex, and only for a resource the seat can see. Alternative: every such hex in your borders, worked or not.
9. **Ruled 2026-10-21: attack and defence** (themes doc section 15). The Soldier-Scholars: a military unit on the hex of one of your own towns; the +5 applies to every fight it takes from there, attack and defence. Alternative: defence only, through the existing `inCity` condition, with no new shape.
10. The card is named The Soldier-Scholars. Alternative: keep The Companions.
11. The Strategikon counts only your own great general, great scholar and Academies. Alternative: anyone's.
12. The three new buildings are the Specularium, the Mouseion and the Aldine Press. **Ruled 2026-10-21** (themes doc section 15), with new figures for the Specularium and the Mouseion.
13. A charter technology's row stores the column price as `cost`. The premium is a labelled line of `explainTechCost`, +50% of the column price, from `rules.research.charterPremiumPercent`. The total is floored once. Alternative: the row stores 1.5 × the column price, which breaks the column pin.
14. The cost lines run: the column price, then the premium, then every card percentage added together and applied once to that sum. The Patent Office removes the premium line. Under both The Commonplace Book and The Patent Office a charter technology costs 85% of its column. Alternative: the percentages compound.
15. The Translation Movement never discounts a charter technology (reading 2).
16. A charter technology is never a world first: `settleResearch` does not mark `techWorld` for it, so The Prize Essay and every other "first" reading leave it out. Alternative: a filter on The Prize Essay's rider alone.
17. "Technologies you know" counts charter technologies (The Sum of Knowledge, The Edge of the Sword, the lead). Alternative: ordinary technologies only.
18. The lead is zero while the seat has met no empire. Alternative: the literal reading, every technology it knows, which gives an isolated seat The Secret Arts' +5 at once.
19. A charter technology has one ordinary parent, sits one column right of it, and stays inside its own age's columns. Charter rows are left out of the sky's layout, the age bands, the column count and the lane limit. Alternative: rows in the sky, which moves the user's lanes (the prototype set this aside).
20. Two seats may each draft the same charter, and both may then research its technology. Alternative: a charter one seat drafts leaves every other pool.
21. A charter row stays `deferred`, and so is not dealt, until its whole gift is built. Alternative: deal it early with part of its gift, which the "never bent" rule forbids.
22. The `line` filter names one unit and admits it and every unit its `upgradesTo` chain reaches. So the Gun Galley line admits the Gun Galley and the Frigate, not the Fire Ship, and a unique joins when it upgrades into the chain. Alternative: the whole chain, earlier units included.
23. A trait is a block on its technology (`TechDef.traits`: a name, a line, effects), and its lines are labelled "<technology> · <trait>", for example "Mechanics · Onager". A test checks that every effect in a trait names the trait's line. Alternative: a label field on each effect.
24. The Repeating Crossbow is the existing `moveAfterAttack` behaviour rule, narrowed by `line`: a shot costs one point of movement and the rest is kept. No `hitAndRun` grant is needed. Alternative: grant the row flag itself, which is the same price under a second name.
25. The Galleass's blockade is a behaviour rule `blockades`, narrowed by `line`. `blockades(def)` becomes a question about a piece (its owner and type) at its four callers. Alternative: none found.
26. The Hoplite reads the town on the hex the unit stands on, in attack and in defence, and only a town of its own empire. Alternative: defence only, through the contested hex.
27. The Grenadier counts charter technologies the seat knows, not charters drafted. Alternative: charters drafted.
28. The Physic Garden's +2 happiness counts the gardens inside your borders, worked or not, and needs Herbals. A captured garden pays its captor science, and happiness only if the captor knows Herbals. Alternative: happiness only while a citizen works it.
29. The Aqueduct comes early through Surveying's `unlocksBuilding` and the existing early arm of `isUnlocked`. Its price stays Engineering's column. Alternative: name the Aqueduct in Surveying's unlocks, which `techDataProblems` refuses.
30. The Qanat waters the farms on the six hexes around it, for every fresh-water question about a farm (E3's water field). Alternative: for the Irrigation renewal only.
31. Niter Beds need your farm or pasture beside them when they are built. They supply one niter while the hex is yours and not pillaged, with no resource on the hex. Alternative: they stop when the farm goes.
32. The School of Mines adds one copy for each Academy on a strategic resource the seat can see, outside the copies memo, as Strategic Exports does.
33. The Studium Generale: a great-person work on one of the six hexes around one of your Academies counts as an Academy for every card reading of an Academy (hex lines, counts, town scopes, commission goals), but not for the Academy's own +3 science. Alternative: hex lines only.
34. The Long Inheritance reads a town working an Academy that has stood twenty turns. Alternative: keep `workingGreatWork` and add a family filter to it.
35. The Founding Gift's production lands in the town nearest the Academy's hex. Alternative: the capital.
36. The Dedications pays once for a building that is both a science building and an empire building.
37. The Invitations offers a great scholar, as a commission reward does, when an empire building is completed, built or bought. Alternative: a scholar placed at once, with no offer.
38. The Royal Readers: while seated, each great scholar the seat has gained counts as half a step on the price ladder (`renownThreshold`). Alternative: only scholars gained while it is seated.
39. The Scholars' Fame's "a twentieth of its cost" is the price the seat paid, so a charter technology pays more. Alternative: the column price.
40. The Journeymen pays each town three times its own population, into its own basket.
41. The Field Refits heals fully on every upgrade `upgradeUnits` makes: on the turn a technology lands, or later when the resource arrives. A trait never heals. Alternative: only on the turn the technology lands.
42. The Model Army lifts the resource gate only for pieces on the board. A new unit still needs the resource, and an upgraded piece holds no copy. Alternative: the piece takes a copy when one is free.
43. The Armoury Patterns' "newest age you know" is the seat's age (`highestAge`, charter rows left out), and a unit's age is its unlocking technology's.
44. The Strategikon is one +4 line that stacks with the general's aura (+3). Alternative: it replaces the aura.
45. Greek Fire's "no empire you have met can build" means no met empire knows the technology that opens the type. A type no technology opens never pays. Alternative: a leader's unique pays too.
46. The Great Designs reads the technology that names the wonder in its `unlocks`, and the bonus stops when a met empire learns it.
47. The Second Seat allows one second copy of one row in all, in a town with a University, and the copy is an empire building for every count. Alternative: one second copy of each row.
48. The Prototype Works opens only the rows of `Player.researching`, not the queue. If the research moves on, a row already queued keeps its doubled price but cannot finish until the technology is known. Alternative: the row leaves the queue and its hammers return.
49. The Foundation Stone reads half of Alchemy's folded cost banked toward it (`bankedTowardTech`). Alternative: half of the column price.
50. The Closed Book's ten turns start on the turn the holder completes Alchemy, and the card must be seated then.
51. The Great Instrument's production goes to the town raising the Opus, or to `Player.opusBank` (Spolia's bank) when no town is.
52. The Breaching Batteries: each blow a siege unit lands on a town raising the Opus, on any beat, removes 5% of that town's banked Opus production, floored.
53. The Lynx-Eyed Academy counts Academy hexes inside your borders, and pays 300 production to each town with an Academy inside its borders.
54. S11 retires the twelve deferred rows the sheet cut on 2026-10-06, as well as the ten live rows. Alternative: leave them deferred; they are not dealt, so nothing in play changes.
56. The Mouseion's 30% is a cost line, `explainBuildingCost`'s own, read from a row field such as `costPercent: 30`, so the row still carries a size and no figure. Alternative: one size larger, which is not 30%.
55. The Schoolmen's Charter waits for the Devotion pass. Its "the Apostle before Theology" opens a unit early, which the ruling of section 12 may reach.
57. (S0) `TECH_IDS` stays the fifty sky rows. `ALL_TECH_IDS` (63) is every row and `CHARTER_TECH_IDS` (13) the charter rows, so the chart's pins do not move.
58. (S0) The Patent Office's `charterPremium` is a percentage of the premium, so −100 removes it and −50 would halve it.
59. (S0) `gameProgress` (the tile price) counts ordinary technologies only.
60. (S0) `src/ai/value.ts` prices the two new rules at 0 until S13.
61. (S1) The Galleass also counts in the line of battle (`navalLineLines`), because the line asks the same blockade question.
62. (S1) The Maryannu's +5 applies in attack only, as Decisive Blows does: on defence `targetBelowHalf` would read the Maryannu's own health. It still pays against a town below half its hit points.
63. (S1) Only ships blockade. A `blockades` rule given to a land line does nothing.
64. (S1) `townCitizensHere` reads the hex the piece stands on, in attack and in defence.

## The batches

**Every card batch (S0 to S9) edits the same six things:** `src/sim/statecraftData.ts`, `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts`, `data/decks/scientific.json`, the Scientific shelf of `docs/orders-and-doctrines.md` with `test/fixtures/cardText.json`, and the Scientific deck tests (`test/sim/decks/scientific.test.ts` and a new `test/sim/decks/scientific<Concern>.test.ts` per batch, as Dominion's and Expansionist's split). So S0 to S9 cannot run side by side: land each one before the next starts. Only S10, S12 and S13, which live in `src/ui/` and `src/ai/`, can run beside them.

**Each card batch bumps `SCHEMA_VERSION` once** (it changes what is dealt or how a rule plays), with the tests that pin it. Other decks' batches take numbers too, so the number is taken at merge.

**Card rows land untyped.** An unsorted card fits any chair, and `dominion.test.ts` fails a typed row that no sorted sheet lists. S11 writes the sheet and the types together. Question 4 asks whether to move S11 forward.

**The card batches follow the two plan docs,** which hold the user's rulings. They do not edit `docs/decks/scientific.md`; S11 rewrites it.

### S0: the charter technologies

**Built 2026-10-21** (`fa650736`, schema 152). Readings 57 to 60 came from it. Notes for later batches: the validators in `improvementData.ts` and `resourceData.ts` use `TECH_IDS.includes`, so S4 and S5 must move them to `isTechId` before a row may require a charter technology; the `n/total` status line in `techTree.ts` counts charter technologies in the first number but not the total (S10).

- **Builds:**
  - A marker `TechDef.charter?: true`, and a register test that the marked rows are exactly `charteredTechIds()`. `techData.ts` stays a leaf: it reads its own marker and imports nothing from `statecraftData.ts`.
  - Thirteen rows in `data/techs.json` and the `TechId` union (the placeholder table). Each has its age, one parent, a shelf lane, `cost` equal to its column's price, a placeholder glyph, and empty unlocks that later batches fill.
  - Layout: charter rows are left out of `computeAgeColumnStarts`, `techColumnCount`, `techChartLayout`, the crossings and false chains, and the lane limit. A `techDataProblems` check: one ordinary parent, column = parent's column + 1, inside its own age's columns (reading 19).
  - Price: `rules.research.charterPremiumPercent: 50` (ruling (qqqqqq) 10's one figure). `explainTechCost(state, player, tech)` returns labelled lines (the column price, the premium, card lines) and `foldTechCost` sums and floors them once (readings 13, 14). Every sim reader of a technology's price moves to the fold: `planResearch`, `turnsToTech`, `queueTurns`, `cities.ts` and the evaluator's Copying the Enemy figure.
  - Age: `highestAge`, `columnReached` and `lastAgeTechCount` skip charter rows (reading 1).
  - Firsts: `settleResearch` does not mark `techWorld` for a charter row (reading 16).
  - Research list: `availableTechs` leaves out a charter row the seat has not drafted.
  - Cards: The Commonplace Book (`rulePercent` `charterTechCost`) and The Patent Office (`rulePercent` `charterPremium`), with their words.
  - Charter rows: all thirteen in `scientific.json`, each with `charter.unlocks.tech`, all still `deferred` (reading 21). Keep the ids of the Glassmakers', Mechanists' (band 3 → 2) and Alchemists'; ten new ids; band 4 for the Tier IV charters. Retire the Metallurgists' and Naturalists' charters, and make `charteredTechIds` skip retired rows.
  - Regenerate `docs/tech-tree.md`.
- **Fence:** `src/sim/techData.ts`, `src/sim/tech.ts`, `src/sim/cities.ts` (one reader), the shared six, `data/techs.json`, `data/rules.json`, `src/sim/rulesData.ts`, `docs/tech-tree.md`, `test/sim/tech.test.ts` (a charter row's `cost` is pinned to its column's price like any row, because the premium is a line; the count goes from 50 to 63), `test/sim/techDocSync.test.ts`, `test/ui/techChart.test.ts` (read only: the sky's pins must not move), a new `test/sim/charterTechs.test.ts`. If `src/ui/techTree.ts` walks `TECH_IDS` outside the layout, a one-line filter there.
- **Depends on:** nothing.
- **Parallel with:** nothing.
- **Schema:** one bump (thirteen technologies join the roster, and `TECH_IDS` order breaks the bot's ties).
- **Done-gate:** `npx vitest run test/sim/charterTechs.test.ts test/sim/tech.test.ts test/sim/techDocSync.test.ts test/ui/techChart.test.ts test/ui/techTreeCost.test.ts test/sim/charters.test.ts test/sim/decks/scientific.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts`, and the fence's files typecheck.

### S1: line traits

**Built 2026-10-21** (`c7446216`, schema 153). Readings 61 to 64 came from it. The Alchemists' Charter has its Grenadier and stays deferred until S5. The slow bot digests will move, because Scientific seats are dealt three more charters.

- **Builds:**
  - `UnitFilter.line?: UnitTypeId`. `unitMatches` admits the named unit and every unit its `upgradesTo` chain reaches (reading 22), from a table built once from `data/units.json`.
  - `TechDef.traits?: { name: string; line: UnitTypeId; effects: CardEffect[] }[]`. `liveEffects`' tenth source pushes a trait's effects with the label "<technology> · <trait>" (reading 23).
  - `unitTraits(state, unit)`: the names of the traits that reach a piece, for the unit card and the hover card.
  - The trait tally: `researchSince` compares each piece's traits before and after, and reports "3 catapults gained Onager" beside `UnitUpgradeTally` (`ResearchReport.traits`).
  - Combat: a `CombatScaleCount` `townCitizensHere` (the Hoplite, reading 26); a `CombatScaleCount` `charterTechsKnown` and a `CountKind` of the same name (the Grenadier, and The Great Catalogue in S6; reading 27); a behaviour rule `blockades`, with `blockades(def)` turned into a question about a piece at its four callers (reading 25).
  - Cards: the Bronze-Founders', Mechanists' and Naval Gunners' charters, dealt. The Grenadier on Chemistry; the Alchemists' Charter stays deferred until S5 adds Niter Beds.
- **Fence:** the shared six, `src/sim/combat.ts`, `src/sim/blockade.ts`, `src/sim/tech.ts` (the tally), `src/sim/techData.ts` (the `traits` field), `data/techs.json`, `test/sim/naval.test.ts`, `test/sim/combat.test.ts`, a new `test/sim/decks/scientificTraits.test.ts`.
- **Depends on:** S0.
- **Parallel with:** none of S2 to S9. S10 may start once S1 lands.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/scientificTraits.test.ts test/sim/naval.test.ts test/sim/combat.test.ts test/sim/charterTechs.test.ts test/sim/decks/scientific.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/statecraft.test.ts`.

### S1b: the sheet of record and the types (moved forward by the user's ruling)

**Built 2026-10-21** (`7bb0ad31`, schema 154). `docs/decks/scientific.md` is the sorted sheet of record, every Scientific row and every shared row naming Scientific carries its type, and the 24 cut rows and The Hydraulic Commonwealth are retired. From here on each batch sets its own rows to `implemented` with their types. S11 keeps only the final sheet check.

### S2: feature A, the trades as a card quantity

- **Builds:** a `CountKind` `guildsmen` with `family`, for a town (`within: 'city'`) or the empire, and its words. Card: The Scholars' Guild. The share-cap rule is not built: no Scientific card needs it since The Fellowships was cut.
- **Fence:** the shared six, `test/sim/guilds.test.ts` (read only), a new `test/sim/decks/scientificGuilds.test.ts`.
- **Depends on:** nothing beyond S0's order. It is small, so the orchestrator may give S2 and S3 to one agent.
- **Parallel with:** S10 only (S10 needs S1 first).
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/scientificGuilds.test.ts test/sim/guilds.test.ts test/sim/decks/scientific.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts`.

### S3: feature B, reading rivals

- **Builds:**
  - A leaf `src/sim/rivals.ts`: over `Player.metSeats`, the barbarian seat never counted. The lead (technologies the seat knows that no met empire knows, its charter technologies included; zero with no met empire, reading 18), the gap (technologies a met empire knows that the seat does not, their charter technologies left out, reading 2), "a met empire can build this unit type" (reading 45), and "a met empire knows this technology". Computed when asked; the lists are short.
  - Kinds: `CountKind` `techLead`, `CombatScaleCount` `techLead`, `CombatCondition` `vsFewerTechs`, a `productionBonus` filter `aheadOfMet`, a rider filter `unbuildableByMet`, and the `gapTechCost` line in `explainTechCost`.
  - Cards: The Secret Arts, The Translation Movement, The Edge of the Sword, The Great Designs, Greek Fire, The Proving Ground, and the shared Books from the Ships (`common.json` and the Commerce sheet's row), unless the Commerce build has landed the gap first.
- **Fence:** the shared six, the new `src/sim/rivals.ts`, `src/sim/tech.ts` (the cost line), `src/sim/combat.ts` (the condition), `data/decks/common.json`, `docs/decks/commerce.md` (one row), `test/mapgen/moduleCycles.test.ts` (read only), a new `test/sim/decks/scientificRivals.test.ts`.
- **Depends on:** S0 (the fold, the charter rows).
- **Parallel with:** S10 only (S10 needs S1 first).
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/scientificRivals.test.ts test/mapgen/moduleCycles.test.ts test/sim/charterTechs.test.ts test/sim/decks/scientific.test.ts test/sim/decks/commerce.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts`.

### S4: the building charters

- **Builds:** eight charters dealt, all in existing shapes: the Herbalists', Glassmakers', Librarians', Paper-Makers', Physicians', Printers', Gunfounders' and Military Engineers'. Five new building rows (the Specularium, the Mouseion, the Aldine Press, the Bimaristan, the Tophane), the Scriptorium and the Bastion rewired to their technologies, and the Physic Garden improvement row. One placeholder map piece for the Physic Garden, built from an existing model, joins the flair gallery in the same batch. Buildings need no map piece.
- **Fence:** the shared six, `data/buildings.json`, `data/improvements.json`, `data/techs.json`, the `BuildingId` and `ImprovementId` unions (`src/sim/buildingData.ts`, `src/sim/improvementData.ts`), the improvement piece in `src/render3d/` (one file) and `src/flairGallery/`, `test/render/improvements3d.test.ts`, `test/sim/unitsDocSync.test.ts` and any building doc-sync test, a new `test/sim/decks/scientificCharters.test.ts`.
- **Depends on:** S0, and question 2 (the three buildings).
- **Parallel with:** S10 only (S10 needs S1 first).
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/scientificCharters.test.ts test/sim/charters.test.ts test/sim/charterTechs.test.ts test/render/improvements3d.test.ts test/sim/decks/scientific.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts`.

### S5: the learned land

- **Builds:**
  - The Surveyors' Charter: the Qanat row with `watersBeside`, read by `farmWaterField` (reading 30); the Aqueduct early (reading 29).
  - The Alchemists' Charter, now dealt: Niter Beds with `besideImprovement` and `suppliesResource`, read in `improvementErrorAt` and `sweepOwnCopies` (reading 31).
  - The School of Mines (a share in `ownCopies`), The Studium Generale (one reading of "is an Academy" for every card), The Long Inheritance (`standingTurns` on `workingImprovement`).
  - Data: The Prospectors' Notes, The Founding Gift, The Latin Quarter, The Nizamiyya, The Republic of Letters, and the shared The Assay (moved to `common.json`, typed civic, listed on the Expansionist sheet).
  - Map pieces for the Qanat and Niter Beds, in the flair gallery.
  - Optional: Merchant Scholars, if the Commerce build has not done it.
- **Fence:** the shared six, `src/sim/improvements.ts`, `src/sim/improvementData.ts`, `data/improvements.json`, `data/buildings.json` (the Aqueduct's `unlockedByCard`), `data/techs.json`, `src/sim/cities.ts` (`sweepOwnCopies`, `ownCopies`), `data/decks/common.json`, `docs/decks/expansionist.md` (one row), `test/sim/decks/expansionist.test.ts`, `test/sim/decks/expansionistLand.test.ts`, `test/sim/resourceCopies.test.ts`, the improvement pieces in `src/render3d/` and `src/flairGallery/`, a new `test/sim/decks/scientificLand.test.ts`.
- **Depends on:** S0, and S1 (the Grenadier half of the Alchemists' Charter).
- **Parallel with:** S10 only (S10 needs S1 first).
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/scientificLand.test.ts test/sim/resourceCopies.test.ts test/sim/decks/expansionistLand.test.ts test/sim/decks/expansionist.test.ts test/sim/decks/dominion.test.ts test/sim/improvements.test.ts test/render/improvements3d.test.ts test/sim/decks/scientific.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts`.

### S6: the research record

- **Builds:** a `TallyOccasion` `techCompleted` (with an optional `tech` filter for S9) and `charterTechCompleted`; an `OccasionMeasure` `techCost`; `CountKind`s `techsKnown` and `chartersDrafted`; a grant scaled by each town's own population; the `MetaRuleId` `techCountsTwice`. Cards (11): The Royal Workshops, The Prize Essay, The Sky Watchers, The Astronomical Diaries, The Scholars' Fame, The Journeymen, The Age of Reason, The Charter Rolls, The Royal Charter Commission, The Sum of Knowledge, The Great Catalogue.
- **Fence:** the shared six, `src/sim/tech.ts` (`settleResearch` raises the tallies), `src/sim/commissions.ts`, a new `test/sim/decks/scientificResearch.test.ts`.
- **Depends on:** S0 (firsts, the fold), S1 (`charterTechsKnown`).
- **Parallel with:** S10 only (S10 needs S1 first).
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/scientificResearch.test.ts test/sim/commissions.test.ts test/sim/tech.test.ts test/sim/decks/scientific.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/statecraft.test.ts`.

### S7: the data-only cards of Tiers 0 to II

- **Builds:** twelve group-1 cards: The Royal Tutors, The War Manuals, Learned Foundations, The Royal Estates, The Common Tables, The Free Cities, Enduring Institutions, The Quiet Faculties, The Roll of Scholars, The Palace Schools, The Round City, The City Architects. Learned Commissions is renamed; Enduring Institutions and The Quiet Faculties are brought to the docs' text and figures.
- **Fence:** `data/decks/scientific.json`, the Scientific shelf of `docs/orders-and-doctrines.md`, `test/fixtures/cardText.json`, a new `test/sim/decks/scientificCards.test.ts`. The describers only if a sentence reads badly.
- **Depends on:** nothing. It may run before S0 if the orchestrator wants these cards in a playtest sooner.
- **Parallel with:** S10 only. No other card batch, because they share the deck file.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/scientificCards.test.ts test/sim/decks/scientific.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts`.

### S8: great people and the great houses

- **Builds:** a great-person grant on `WindfallGrantSpec`; an any-of filter on the completion rider; a rule on `renownThreshold` (which takes the state); a count and a scope on `buildsEverywhere`; a town scope on `unlocksBuilding`; a commission figure for Academy hexes and a scope on `eachTown`. Cards (11): The Invitations, The Dedications, The Royal Readers, The Second Seat, The Forward Plans, The Lynx-Eyed Academy, and the data cards The Doctorate, The Royal Academies, The Queen of Cities, The Humanists, The Walls of Learning.
- **Fence:** the shared six, `src/sim/renown.ts` and its callers, `src/sim/tech.ts` (`buildError`, `isUnlocked`), `src/sim/commissions.ts`, `src/sim/greatPeople.ts` (the offer), `test/sim/renown.test.ts`, `test/sim/greatPeople.test.ts`, a new `test/sim/decks/scientificHouses.test.ts`.
- **Depends on:** S5 (The Lynx-Eyed Academy counts Academies as The Studium Generale reads them).
- **Parallel with:** S10 only (S10 needs S1 first).
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/scientificHouses.test.ts test/sim/renown.test.ts test/sim/greatPeople.test.ts test/sim/commissions.test.ts test/sim/decks/scientific.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts`.

### S9: the army and the Opus

- **Builds:** behaviour rules `upgradeHeals` and `upgradeIgnoresResource`; `UnitFilter.newestAge`; the `CombatCondition`s `nearLearning` and `standingInOwnTown`; the Opus hit; the Opus door for one seat; the Closed Book record; the `tech` filter on the tally and the "not knowing a technology" deal gate; the current-research arm and its ×2 cost line. Cards (10): The Field Refits, The Model Army, The Armoury Patterns, The Strategikon, The Breaching Batteries, The Foundation Stone, The Closed Book, The Great Instrument, The Prototype Works, and the shared The Soldier-Scholars (a new `common.json` row, typed military, listed on the Dominion sheet).
- **Fence:** the shared six, `src/sim/tech.ts` (`upgradeUnits`, `upgradeTargetFor`, `buildError`, `isUnlocked`), `src/sim/combat.ts`, `src/sim/cities.ts` (`explainBuildingCost`, `explainUnitCost`), `src/sim/statecraft/draft.ts` (`eligibleFor`), `src/sim/state.ts` (the Closed Book record), `data/decks/common.json`, `docs/decks/dominion.md` (one row), `test/sim/decks/dominion.test.ts`, `test/sim/ranks.test.ts`, `test/sim/combat.test.ts`, a new `test/sim/decks/scientificArmy.test.ts`.
- **Depends on:** S0 (the fold), S5 (what counts as an Academy), S6 (the `techCompleted` tally).
- **Parallel with:** S10 only (S10 needs S1 first).
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/scientificArmy.test.ts test/sim/decks/dominion.test.ts test/sim/ranks.test.ts test/sim/combat.test.ts test/sim/tech.test.ts test/sim/decks/scientific.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts`.

### S10: the charter UX (the approved prototype)

**Built 2026-10-21** (`3996dc5a`; the glow's settings moved to `data/view3d.json` in `31817db6`). The lead on the chart (`chartLead` in `src/ui/charterTech.ts`) is a stub returning nothing until S3's lead reading lands; wiring it is one line. Not matched from the prototype: no turn number on the stamp, no town name in the toast, and a rival's range line is not shown off the forecast.

- **Builds:**
  - The charter shelf at the foot of the star chart: drafted charter technologies only, and no shelf, rule or tab before the first charter. Same columns and age washes as the sky, a dotted sepia line from each parent, a small seal on the node. `packChart` packs the shelf as a second field and `fitPacked` shrinks both together.
  - The out-of-view tab: on the chart's edge toward the nearest charter node, with the count and an arrow. A click scrolls there and rings the node, as `centreOn` does.
  - The price list on the hover card and on the card's slip, from `explainTechCost`. Every UI reader of a technology's price reads the fold: `techTree.ts` (five places), `empireDrawer.ts`, `researchProgress.ts`.
  - The card slip on the charter's face (`offerCard.ts` `faceBody`) and the live charter clause in place of the struck-through one.
  - The draft beats: the "Opened" stamp (`cardStamp.ts`), one toast, and a new `NotificationAction` kind `openTech` (`{ kind: 'openTech'; tech: TechId }`) whose click opens the chart centred on the node with a ring; its handler in `controls.ts`.
  - Research: the seal in `renderPlanStrip` and `renderStatus`.
  - Completion: one eyebrow line in `announceTech` ("your charter technology"), the trait tally in the splash, a pan toast, and a one-time glow on each piece that gained a trait.
  - The unit card and the enemy-unit hover card: the trait after the unit's name ("Catapult · Onager"), and its labelled lines in the strength and range lists (`unitPanel.ts`). The piece fingerprint does not change.
  - The lead: one figure in the chart's head, and a gilt corner on each node in it.
  - One colour token, the charter sepia lifted for the night chart (`style.css`).
- **Fence:** `src/ui/techTree.ts`, `src/ui/techFit.ts`, `src/ui/offerCard.ts`, `src/ui/cardStamp.ts`, `src/ui/notifications.ts`, `src/ui/notificationsPanel.ts`, `src/ui/controls.ts` (the action handler), `src/ui/turnSplash.ts`, `src/ui/unitPanel.ts`, `src/ui/empireDrawer.ts`, `src/ui/researchProgress.ts`, `src/style.css`, the glow in the unit layer of `src/render3d/`, and their tests under `test/ui/` and `test/render/`.
- **Depends on:** S0 (the marker, the fold), S1 (`unitTraits`, the trait tally), S3 for the lead figure (it can land last, or show nothing until S3).
- **Parallel with:** S2 to S9, S11, S12 and S13. S4 and S5 also touch `src/render3d/`, but in the improvement pieces, not the unit layer.
- **Schema:** none.
- **Done-gate:** `npx vitest run test/ui/techChart.test.ts test/ui/techTreeCost.test.ts test/ui/techTreeFigures.test.ts test/ui/offerCard.test.ts test/ui/notifications.test.ts test/ui/unitPanel.test.ts` and the new tests for the shelf, the tab and the splash.

### S11: the sheet of record, the types and the retirements

- **Builds:** rewrite `docs/decks/scientific.md` from the two plan docs as built, with a Type column. Add `scientific` to `SORTED_DECKS` and write `type` on every Scientific row. Type the shared rows if question 5 allows it. Retire Field Notebooks, the ten old live rows, Discoveries through Great People, the twelve old deferred rows (reading 54) and The Hydraulic Commonwealth. Rewrite `test/sim/decks/scientific.test.ts` for the new deck: its row and band counts, thirteen live charters, and the sheet's rows ↔ the data's rows (the `statecraftDocSync.test.ts` pattern), retired rows excluded.
- **Fence:** `docs/decks/scientific.md`, `data/decks/scientific.json`, `data/decks/common.json` (types, one retirement), `test/sim/decks/sortedSheets.ts`, `test/sim/decks/scientific.test.ts`, `test/sim/decks/dominion.test.ts`, `test/sim/decks/shared.test.ts`, `test/sim/decks/common.test.ts`, `docs/orders-and-doctrines.md`, `SCHEMA_VERSION` and its pins.
- **Depends on:** S9 (every row exists).
- **Parallel with:** S10, S12, S13.
- **Schema:** one bump (types decide which seat commands are legal; retirements leave every pool).
- **Done-gate:** `npx vitest run test/sim/decks/scientific.test.ts test/sim/decks/dominion.test.ts test/sim/decks/expansionist.test.ts test/sim/decks/shared.test.ts test/sim/decks/common.test.ts test/sim/statecraftDocSync.test.ts test/sim/typedChairs.test.ts`.

### S12: the Compendium

- **Builds:** a charter technology entry generated from its row: "Opened by <charter>", the price as lines without any empire's cards, and the traits with their lines. The charter entries say what knowing the technology gives (they are generated from `CharterSpec` today). Entries for the five new buildings and three new improvements. The Physic Garden's happiness and every trait read through the describers, so no prose states a number.
- **Fence:** `src/ui/compendium.ts`, `src/ui/compendiumText.ts`, `test/ui/compendium.test.ts`, `test/ui/compendiumDecks.test.ts`.
- **Depends on:** S9 for the rows; S11 for the retired rows to drop out.
- **Parallel with:** S10, S11, S13.
- **Schema:** none.
- **Done-gate:** `npx vitest run test/ui/compendium.test.ts test/ui/compendiumDecks.test.ts`.

### S13: bot pricing

- **Builds:**
  - Drafting: a charter is priced as what knowing its technology gives (its traits as strength lines, its buildings through `scoreUnlockedBuilding`, its improvement rows), discounted for the research turns at the folded price. Today a technology charter scores nothing.
  - Research: the goal search skips a charter technology the seat has not drafted, and prices one it has at the folded cost. `chain.ts`, `plan.ts` and the cheapest fallback in `bot.ts` read `foldTechCost`.
  - Stand-in prices in `data/ai.json` for every new kind of S0 to S9. The arena page shows any new knob with no page edit.
  - Re-pin the explore digest and the bot digests with the control-run method of the D batches.
- **Fence:** `src/ai/value.ts`, `src/ai/bot.ts`, `src/ai/chain.ts`, `src/ai/plan.ts`, `data/ai.json`, `test/sim/aiAppraisal.test.ts`, `test/sim/explore.test.ts`, and the digests.
- **Depends on:** S9.
- **Parallel with:** S10, S11, S12.
- **Schema:** none.
- **Done-gate:** `npx vitest run test/sim/aiAppraisal.test.ts test/sim/explore.test.ts` and the new pricing tests. The digest re-pin is the orchestrator's push-gate work (`npm run test:all`).

### Order and overlaps

- S0 → S1 → S2 → S3 → S4 → S5 → S6 → S7 → S8 → S9 → S11, one at a time. S7 needs nothing and may move anywhere in the line.
- S10 runs beside the card batches once S1 lands. S12 and S13 run beside S11 once S9 lands.
- Files several card batches touch, beyond the shared six: `src/sim/tech.ts` (S0, S1, S3, S6, S8, S9), `src/sim/combat.ts` (S1, S3, S9), `src/sim/cities.ts` (S0, S5, S9), `data/techs.json` (S0, S1, S4, S5), `data/decks/common.json` (S3, S5, S9, S11), `src/sim/commissions.ts` (S6, S8).
- Until S10 lands, a drafted charter technology has no node on the chart. Push nothing to `main` between S1 and S10.

## Counts

| | Built | Group 1 | Group 2 | Group 3 | All |
|---|---|---|---|---|---|
| Tier 0 | 3 | 7 | 1 | 0 | 11 |
| Tier I | 1 | 7 | 9 | 0 | 17 |
| Tier II | 0 | 10 | 10 | 0 | 20 |
| Tier III | 0 | 6 | 10 | 0 | 16 |
| Tier IV | 0 | 3 | 10 | 0 | 13 |
| **All** | **4** | **33** | **40** | **0** | **77** |
| Shared | 10 | 4 | 4 | 0 | 18 |

The 77 are the 64 seatable cards and the 13 charters of the list doc. Enduring Institutions is counted in group 1, because its row needs a change. Of the shared rows, The Assay, The Soldier-Scholars and Books from the Ships are in S batches; the other five with work belong to the Commerce and Devotion builds.

## Questions for the user

**Answered 2026-10-21** (themes doc section 15): 1 no; 2 the user's figures for the Specularium and the Mouseion, the Aldine Press as proposed; 3 attack and defence; 4 type early: a batch **S1b** writes the sheet of record and the types right after S1, every later batch types its own rows as it lands, and S11 keeps only the retirements and the final sheet check; 5 approved; 6 approved.


1. **The age.** Does a charter technology count toward an empire's age? S0 is built on "no" (reading 1). A "yes" removes the skips and moves the age-entry bead.
2. **The three new buildings.** Are the Specularium, the Mouseion and the Aldine Press right (reading 12)? S4 builds them.
3. **The Soldier-Scholars in attack.** Should the +5 apply when a unit attacks out of a town (a new condition), or only when it defends there (the existing `inCity`)? Reading 9 says both. S9's shape depends on it.
4. **The order of the sheet.** Card rows land untyped until S11. Should S11 (the sheet and the types) run right after S1 instead, so a playtest seats Scientific cards by type? Then S2 to S9 type each row as it lands.
5. **Shared types.** May S11 type the rows Scientific shares with Commerce, Devotion and Magisterial (all Civic but The Engineer Corps), as you allowed for Expansionist? That also changes which chairs those cards fit in the partner decks.
6. **The placeholders and the other readings.** May the build use the placeholder placement table, which you move on your chart later, and readings 2 to 11 and 13 to 55 until you mark one?
