# Batch E triage, second round: the Expansionist themes pass

**Status:** written 2026-10-21 by a triage agent that changed no code and no data, before any batch in this plan. It is the plan to build the Expansionist deck as `docs/plans/expansionist-themes.md` and `docs/plans/expansionist-list-proposed.md` now stand: the themes pass, the recommendations of its section 10, your comments of its section 11 (*"fold those into the expansionist doc, queue up the changes."*), and your answers to section 11's two questions (*"let's cut common domain. cut one of veteran colonies and home for harvest."*). The readings below are the ones the build uses unless you change them here. Mark any you disagree with, as on the deck sheets.

Source: the two plan docs above, as revised on 2026-10-21. Facts were checked against the code at commit `6efbbc5e` (branch `decks`, after Scientific batches S2 and S3, and Dominion batches D9 and D10). The first round of Expansionist batches, E0 to E6, is `docs/plans/expansionist-build-triage.md`. This plan continues its numbering at E7.

**Groups:**
- **1, data only:** the text can be written with shapes that exist today. The cell names the shape.
- **2, new shape, no new player decision:** the behaviour is automatic, or uses UI that exists. The cell names what is missing.
- **3, waits on you:** no card. Your answers of 2026-10-21 closed both of section 11's questions.

Each cell starts with the batch that builds the row.

## Facts the cells rely on

**The sheet, the data and the tests.**
- `data/decks/expansionist.json` holds 151 Order rows: 116 live, 2 deferred (Public Works, The Two Harvests) and 33 retired. The deck has no Doctrine rows. The Ambarvalia's id is still `theSpiritsOfPlace`.
- `docs/decks/expansionist.md` lists 120 rows (114 `implemented`, 4 `modify`, 2 `add`), 16 shared rows, and 32 proposed Doctrines that are not built. It still describes the builds of 2026-10-16, not the themes.
- `test/sim/decks/expansionist.test.ts` reads the sheet:
  - the statuses are `implemented`, `modify` and `add`. An `implemented` row's rarity, tier and text equal the data row's. A `modify` row has a data row. An `add` row has none, and its name may not be any row's name in this file (retired rows included) or in `common.json`;
  - **every listed row carries the sheet's type in the data, `modify` rows included.** So a row whose type changes must change it in the data in the same batch as the sheet;
  - a retired row is off the tables, is not dealt, and **carries no type**. The retired count is pinned at 33;
  - the two counts tables count the rows by status and by type, the shared table's included.
- `test/sim/decks/sortedSheets.ts` lists `SORTED_DECKS = ['dominion', 'expansionist', 'scientific']`. `dominion.test.ts` fails a typed row that no sorted sheet lists.
- `test/sim/decks.test.ts` pins the number of live Orders, with a running note for each batch. `docs/orders-and-doctrines.md` has an Expansionist shelf and a notes section, mirrored strictly by `test/sim/statecraftDocSync.test.ts`. `test/fixtures/cardText.json` is rewritten with `CARD_TEXT_WRITE=1 npx vitest run test/sim/cardTextSnapshot.test.ts`.
- `SCHEMA_VERSION` is 156 (`src/sim/state.ts`), pinned in `test/sim/state.test.ts`.
- Tests that seat a row this plan retires: `expansionistCards.test.ts` (The Pyramid Builders, The Polis, The Assay Office), `expansionistLand.test.ts` (The Prospectors, The Landscape Garden, The Manors, The Common Domain), `expansionistMoments.test.ts` (The Land's Great Work), `expansionistLevies.test.ts` (The Builders' Levy), `expansionistWorks.test.ts` (The Garden Frontier), `occasionRiders.test.ts` (The Woodwrights) and `expansionist.test.ts` (The Beating of the Bounds, The Prospectors). Their `slot` helpers write the chairs directly, so a retired row can still be seated there.

**Riders, grants and marks.**
- `windfallRider` takes `occasion`, `grant`, `class`, `inTown`, `improvement` (one row), `buildingCategory`, `empireBuilding`, `wonder` and others. A rider on `improvementBuilt` names one improvement, so a mine and a quarry need two riders (Scientific's The Prospectors' Notes does the same in S5).
- `WindfallGrantSpec` has `yield` and `amount`, `fromOccasion`, `fromRate`, `perCount` (a `GrantCount`: `count`, `building`, `family`, `per`), `toCapital`, `toEveryTown`, `toNearest`, `toOpus`, `unit`, `timed`, `renown` and `mark`. It has **no citizens field**. A grant scaled by each town's own population is Scientific batch S6's (`fromTownPopulation`, The Journeymen); it is not built yet.
- The `found` moment is paid last in `foundCityAt` (`cities.ts`), after the town, its borders and its citizens exist. So a `perCount` of `cities` counts the new town.
- The `disband` moment (`applyDisbandUnit`, `src/sim/commands.ts`) carries `actor`, `townId` (your town on the unit's hex) and `unitCost`. It leaves `unitCost` out for a unit raised for free, so a rider scaled by the cost pays nothing for one.
- **Hex marks** (batch E3): `Tile.marks`, written only by `markHex` (`map.ts`), once for each mark id. The ids are `HexMarkId` = `raised` | `aqueductWater` (`rulesData.ts`), and each row of `rules.improvements.hexMarks` (`data/rules.json`) holds its yields and a `while` tile test. A `mark` grant lands through `markTownLand` (`cities.ts`): every hex in the town's borders where the mark's test holds. The yields lens fingerprint walks `HEX_MARK_IDS` (`src/render3d/improvements3d.ts`), so a new id joins it with no render edit. No mark is drawn on the map.

**Tiles, ages and tended land.**
- `tileConditionHolds(tile, on, paid, beside, turn, ground)` (`statecraft/evaluator.ts`) holds a tile and no state. `ground` is the `GroundFacts` built by `groundFactsFor(state, playerId)`, the one builder: the empire asking, its farm water, wonder centres, copied hexes and fortified units. Dominion batch D12 adds the reader's technologies (the sight gate) to the same inputs.
- A work's age is `improvementAge(tile, turn)` (`map.ts`), read in one place, the `standingSince` arm. The `workingGreatWork` scope composes `standingSince`. A building's age (`buildingAge`) is a separate reading.
- `improved` is any improvement except a tended work. `unimproved` is everything else. `tended` is a tended work (`isTendedWork`). The commission figures `tendedTiles` and `improvedTilesWorked` call `isTendedWork` directly in `commissions.ts`.
- A worker's build replaces what stands on the hex (`buildImprovementAt`, `improvements.ts`). The `burnedCountry` row is tended, grassland or plains, no feature, one charge, +1 food. The Flood Festival (shared with Devotion) is a `windfallRider` on `improvementBuilt` for `burnedCountry`: 8 faith.

**Counts, scopes and conditions.**
- `CountKind` has `cities`, `citiesFounded`, `citiesAdmitted`, `buildingsOfKind` (with `building`), `empireBuildings`, `tilesInBorders`, `tally`, `guildsmen` (S2) and others. It has no count of public works.
- `TallyOccasion` has `sizeRecord` (The Grain Census) and others. It has no tally of a building completed.
- `pays` at `where: 'city'` with `basis: 'count'` and a `stage` pays a percentage (The Great Households). `docs/yields.md` registers the pair (steps 3 and 11). A count with no `within` reads the empire's figure in each town (The Measure of the Land).
- `pays` to `authority` over an empire count exists (The Garrison Captains).
- `productionBonus` takes `empireBuilding`, `class`, `scope`, `count`, `admits`, `per` and `max` (in helpings).
- `conditionRule` `rivalHoldsMoreTowns` (The Defiant Kingdom) reads only met empires. Its `then` is any effects, flattened in `liveEffects`, so a `unitStat` inside it is read like any other.
- The town scope `terrainInBorders` (a terrain inside the town's own borders) has no count. `workingTiles` has `atLeast`, but counts worked hexes only.
- `rulePercent` has a rule `borderCulture` (how fast the border basket fills) and takes a `scope`.
- `CommissionReward.lasting` exists (E5). An institution is pushed as an Order's effect. Feature C (Dominion D11) counts met commissions of every deck, so Expansionist's five commissions feed Dominion's The Ovation and The Res Gestae with no E work.

**Buildings, guilds and units.**
- `BuildingDef.empireBuilding` marks the great houses, read by `isEmpireBuilding`. No row carries a public-works marker. The six public works are `granary`, `aqueduct`, `watermill`, `harbour`, `publicBath` and `cistern`. The Aqueduct row carries `waters: true` and a `rulePercent` `growthSurplus` +15.
- The code reads a town's `buildings` list in 105 places across 27 files (the sim, the bots and the UI). There is no one helper for "this town holds this building".
- The guild bar fills from `explainGuildInflow(state, city)` (`guilds.ts`), a labelled list folded by `foldGuildInflow`. The share cap (a quarter of the town) gates conversion only.
- `combatLine` takes `amount`, `when`, `side`, `scaled`, `class` and `vsClass`. It has **no `levied` field**: `UnitFilter` reads a unit type, and the levy mark is on the piece (`Unit.levied`). `unitStamp` and `upkeepRebate` have `levied`. A line is priced in `combatLineAmount` (`statecraft/evaluator.ts`).
- `unitStat` movement with a `class` exists (Steel's +1 for melee). Military Colonies filters settlers and workers with `modelClasses`.

**The bots.**
- `src/ai/value.ts` prices a `levy` card at 0 (bots never levy) and the `disband` moment at 0 (bots disband only to clear arrears). So Watch and Ward, Veteran Colonies and every "Needs a levy" card are worth nothing to a bot.
- A commission row has no effects, so a bot gives every commission nothing until Dominion's D16 prices commissions.
- `value.ts` switches exhaustively on `CardEffect` kinds (`unreadEffect`), `WindfallOccasion` (`unreadOccasion`), `rulePercent` rules (`unreadRule`), amplifier targets, meter rules and conditions. A new member of any of these does not compile until it has an arm.

## Tier 0

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Rope Stretchers | implemented; reworked | 1 | E7. `pays` `where: 'city'`, `basis: 'count'`, `count: 'tilesInBorders'`, `within: 'city'`, tile `improved`, science 1, `per: 3` (The Ambarvalia's count). Type economic → civic (readings 8, 34). |
| The Founding Furrow | new | 1 | E8. `windfallRider` `found`, grant culture 5 with `perCount: { count: 'cities' }` (Valhalla's form, Dominion D5). The themes doc lists a new shape; it exists (reading 16). |
| The Horrea | new | 1 | E8. `pays` `where: 'empire'`, `basis: 'count'`, `count: 'buildingsOfKind'`, `building: 'granary'`, `to: 'authority'`, 1 (reading 17). |
| Smallholdings, Granary Levies, The Naturalists, The Patient Harvest, The Fish Traps (charter), Sweet Water, The Seed Grain, The Ambarvalia, The Road Home, The Work Gangs, The Woodland Bands | implemented | – | Built (11). |

## Tier I

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Burning Season (charter) | implemented; revised (section 11) | 2 | E9. A mark row `burned` (food 1, while `improved`) in `rules.improvements.hexMarks`, and a field on the `burnedCountry` row (for example `marksImproved: 'burned'`). On a hex that holds an improvement, the build writes the mark through `markHex` and keeps the improvement and its age stamp. On bare ground it lays the tended work, as today. `improvementErrorAt` refuses a hex that already carries the mark, with a sentence. `improvementBuilt` fires either way (readings 1, 9 to 11). |
| Six Gardens | implemented; reworked | 1 | E7. Reward `lasting`: `pays` `where: 'hex'` culture 1 on `tended`. Drop the culture lump. The goal and the gate stay (reading 22). |
| The Marl Pits | add; reworked | 2 | E9. A new row. Two `windfallRider` `improvementBuilt` (mine, quarry) with a new grant field `markBeside`: the six hexes around the moment's hex, inside the builder's borders, where the mark's test holds. Two mark rows, `marl` and `marlSecond` (food 1 each, while farm or pasture); the second is written only on a hex that carries the first, so "a mark is written once" still holds (reading 12). |
| Commission: Break the Sod | implemented; reworked | 2 | E9. Reward `lasting`: a new effect, an age offset on works (for example `workAge` with `turns: 10`). `groundFactsFor` reads it into a new `GroundFacts` field, and the `standingSince` arm adds it to `improvementAge`. Drop the timed food and the worker. The goal is unchanged (reading 13). |
| The Aediles | new | 2 | E11. The `publicWork` marker and a `TallyOccasion` `publicWorkCompleted`. Then The Grain Census's form: flat production 2 in the capital and culture 2, and `pays` count `tally` 1 of each (readings 29, 30). |
| The Land Hunger | new; revised (section 11) | 1 | E8. `conditionRule` `rivalHoldsMoreTowns` (The Defiant Kingdom's): `productionBonus` unit 25, class `modelClass: 'settler'`; `unitStat` movement 1, class `modelClass: 'settler'` (readings 2, 18). |
| The Burhs, Levy of the Land, Tinkers' Guild, The Old Songs, The Local Census, The Wild Orchards (charter), Dark Earth, The Three Sisters, The Commons, The Hard Country, The Master Builders, Outposts, The Forest Keepers, The Grain Census, The Public Fountains, The Labour Feasts, The Gleaners, The Wild Marches, The Quiet Provinces, The Road Towns | implemented | – | Built (20). |

## Tier II

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| Veteran Colonies | implemented; revised (section 11) | 2 | E10. A grant field `citizens` on `WindfallGrantSpec`, settled through `settlePopulationWindfall` in the town the moment names (`facts.townId`), and paid only when the moment carries `unitCost`. Drop the food grant (readings 25, 26). |
| The Milestones | implemented; reworked | 1 | E7. The two `pays` empire count `roadHexes` rows pay gold and culture in place of production and gold. Type economic → civic. |
| The Teeming Realm | implemented; reworked | 1 | E7. The two `pays` empire count `population` rows pay science and culture in place of production and food. Type economic → civic. |
| The Staked Claims | implemented; moved | 1 | E7. Band 3 → 2 (reading 35). |
| The Many Hands | new | 1 | E8. `productionBonus` category building, `empireBuilding: true`, percent 3, `count: 'cities'`, `max: 12` (reading 19). The themes doc calls it near existing; both pieces are on `productionBonus` already. |
| The Burghers | new | 2 | E10. Feature A: a `rulePercent` rule `guildInflow` (+50) with scope `populationAtLeast` 12, read as one labelled line in `explainGuildInflow` (reading 28). S2's count is not needed. |
| Watch and Ward | new | 2 | E10. A `levied` field on `combatLine` (the field `unitStamp` and `upkeepRebate` already have), read in `combatLineAmount` off the piece's `Unit.levied`. `combatLine` +5, `when` `ownTerritory`, `side: 'both'`, `needsLevy` (reading 27). The themes doc lists it as existing; `combatLine` has no field that reads the mark. |
| Migration | modify: as built | – | Plays as built. The first triage's reading 36 still waits for you. |
| The Watercourses, The Highlands, The Coast, Provincial Councils, The Grain Dole, The Waterworks, The Breadbasket, The Engineers' Yards, The Tended Country, The Old Fields, The Hedgerows, The Great Households, The Harbour Cities, The Labour Rolls, The Terraces of Moray, The Book of Settlements, The Colonists | implemented | – | Built (17). |

## Tier III

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Mountain Schools | implemented; revised (section 11) | 2 | E9. An `atLeast` field on the `terrainInBorders` town scope, read in `cityScopeAdmits` and its words. `percentYields` science 15, scope `terrainInBorders` mountain `atLeast: 2`. The hex line is unchanged (readings 3, 15). A data-only form exists (a count with `per: 2`, `max: 1`), but its words would say "for every two mountains, at most +15%", a near-fit that CLAUDE.md forbids. |
| Plenty | implemented; revised (section 11) | 1 | E7. The rider's amount 8 → 5. |
| The Wide Country | implemented; reworked | 1 | E7. Reward `lasting`: `rulePercent` `borderCulture` 25. Drop the citizens and the timed happiness. The goal is unchanged (reading 24). |
| The Capitolia | new | 1 | E8. `pays` `where: 'city'`, `basis: 'count'`, `count: 'empireBuildings'` (empire-wide), culture 1 (reading 20). |
| The Topping Out | implemented; reworked | 2 | E11, after S6. `windfallRider` `buildingCompletion` `empireBuilding: true`, grant production 5 `toEveryTown` with S6's `fromTownPopulation`. Drop the `completion` `wonder: true` rider. Once S6 has merged it is data only (reading 32). |
| The Cura Aquarum | new | 2 | E12. A city rule (for example `holdsBuilding` with `building: 'aqueduct'`), scope `connected`. One reading of "this town holds this building" (for example `townHoldsBuilding`) that answers yes for the rule, and every reader of the building's effect moves to it (reading 33). |
| Seasonal Levies, The Long Tending, The Polders, A Court of Engineers, The Raising of the Land, The Age of Improvement, Old Workings, The Royal Forests, The Megalopolis, The Freedom of the City, The Water Courts, The Coming of the Water, The Mill Wheels, The Mit'a, The Slack Season, The Trained Bands, The Quitrents, The Hallowed Woods, The Mountain Terraces, The Sovereign Writ, The Tax Rolls, The Imperial Roads, The Opening of the Roads, The Stationes, The Great Colonies | implemented | – | Built (25). |

## Tier IV

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Measure of the Land | implemented; reworked; revised (section 11) | 1 | E7. Science in place of production, `max` 6 → 10. Type economic → civic. |
| The Mother City | implemented; reworked; revised (section 11) | 1 | E7. Two `pays` `where: 'city'`, `basis: 'count'`, `count: 'citiesFounded'`, `percent: 5`, `stage: 'city'`, scope `capital`, no `max`: production and culture. Drop the `capitalPopulation` row. Type economic → civic (readings 4, 21). |
| The Domesday Survey | implemented; reworked | 1 | E7. Goals 150 → 120 hexes and 50 → 40 tiles. Reward `lasting`: `pays` `where: 'hex'` science 1 on `any` [`improved`, `tended`]. Drop the production and the great engineer (reading 23). |
| The Two Harvests | modify: deferred; reworked | 2 | E7 types the row wildcard and writes its new text on the sheet. E9 builds it: an empire rule (for example `fieldsTended`) that `groundFactsFor` reads into a `GroundFacts` field, so the `tended` arm admits a farm, mine or lumber mill for that seat. `unimproved` is unchanged. The commission figures in `commissions.ts` read the same rule and count a hex once. Drop `deferred` (reading 14). |
| The Public Good | new | 2 | E11. A `CountKind` `publicWorks` over the `publicWork` marker. Two `pays` empire count, `percent: 1`, `stage: 'empire'`, `max: 25`: science and culture (readings 30, 31). |
| The Keeps, The Garden of the World, The Heartland, The Corvée, The Master of Works, The Philosophers' Peaks, The Inheritance of Fields, The General Levy, The Great Migration, The Encroaching Fields, The Great Aqueducts, The Imperial Highways, The Theodosian Walls | implemented | – | Built (13). |

## Shared with another deck

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Assay (Scientific) | new on this sheet | 1 | Scientific batch S5 moves the row to `common.json`, types it civic and adds it to this sheet's shared table. No E batch touches it. |
| Military Colonies (Dominion) | implemented | – | Built. The themes pass keeps it, as a bridge from the militia to the frontier. |
| The other 15 shared rows | implemented | – | Built. |

## Cut and retired rows

| Rows | In the data now | Action |
|---|---|---|
| The Pyramid Builders, The Prospectors, The Plough Teams, The Polis, The Landscape Garden, The Woodwrights, The Manors, The Assay Office, The Managed Wild, The Land's Great Work (the themes pass) | live | E7: `retired: true`, the `type` removed, off the sheet and the Expansionist shelf (reading 7). |
| The Beating of the Bounds, The Garden Frontier, The Builders' Levy, The Common Domain (section 11 and its answers) | live | E7, the same. |
| Public Works | deferred | E7, the same. |
| The Deep Workings | no row (an `add` row on the sheet) | E7 takes it off the sheet. |
| Home for the Harvest | no row (new in the themes pass) | None. It never reaches the sheet. |
| The Hydraulic Commonwealth | retired by Scientific S1b | None. |

E7 retires 15 rows (14 live and 1 deferred), so the pinned retired count goes from 33 to 48.

## Readings

The first six come from section 11 of the themes doc and its answers. The rest are new. Each gives the reading the build uses, then the alternative.

1. **(Section 11)** The Burning Season: on a hex that holds an improvement, the burn keeps the improvement and adds +1 food as a lasting hex mark (`burned`). On bare ground it is the tended work it is today.
2. **(Section 11)** The Land Hunger keeps its condition (another empire holds more towns). Only the pay changes.
3. **(Section 11)** The Mountain Schools' second half (mines and quarries beside a mountain gain +2 science) is unchanged.
4. **(Section 11)** The Mother City: still the capital, still for each town founded, with no cap. The alternative is a cap such as +50%.
5. **(Section 11)** Every recommendation of the themes doc's section 10 stands, except where section 11 and its answers changed it.
6. **(Section 11, answered)** The Common Domain is cut. Home for the Harvest is cut and Veteran Colonies stays, the orchestrator's choice: Veteran Colonies is built, broader, and carries your own revision.
7. The 15 rows retire in E7, before any card that replaces them lands. A save that holds one keeps it, with its effects. A shape that only a retired row uses stays in the code, because a save may hold the row: the levy use `wonder`, `worksBeyond`, the founding rider's `claims`, the city rule `widerReach` and the work radius it widens. A test that seats a retired row directly stays; a test that deals one from a pool changes.
8. A row whose type changes (The Rope Stretchers, The Milestones, The Teeming Realm, The Measure of the Land and The Mother City to civic, The Two Harvests to wildcard) changes its type and its text in the same batch, E7, because the sheet test checks the type of every listed row. A retired row loses its type.
9. The Burning Season burns grassland or plains with no feature, the row's own rule: forest, jungle, marsh and floodplain are refused. "An improvement" is any work except a tended work (the `improved` test): farms, pastures, plantations, camps, great-person works, outposts and Keeps. Alternative: farms and pastures only.
10. The burned mark is written once on a hex and pays +1 food while the hex holds an improvement, whoever works it. It stays when the hex changes hands. The improvement's age stamp (`improvedOn`) does not change. A burned farm counts as improved, not tended, for every card and goal. Alternative: it also counts as tended.
11. The Flood Festival pays its 8 faith for a burn on an improved hex too, because the burn fires `improvementBuilt` with burned country, as a burn on bare ground does. The card is shared with Devotion. Alternative: only a burn on bare ground pays.
12. The Marl Pits: a mine or quarry your worker finishes (the `improvementBuilt` moment). It marks the farms and pastures on the six hexes around it that are inside your borders at that moment. A farm built later beside an old mine gains nothing, as The Coming of the Water reads (the first triage's reading 23). A farm takes two marl marks at most. A mine built again after its hex was razed marks again, up to that cap. The mark pays while the hex holds a farm or pasture, whoever works it.
13. Break the Sod's institution adds ten turns to the age of every work the seat's cards read: improvements, tended works and great-person works (the first triage's reading 3 for "works"), in hex lines, counts and town scopes, through the ground facts. A building's age is not changed. Alternative: improvements only, not tended works.
14. The Two Harvests: for the seat that holds it, the `tended` test admits farms, mines and lumber mills (not quarries, pastures or plantations) wherever a card asks, the commission figures included. A hex counts once in "improved or tended". The `unimproved` test is unchanged, and the "Needs tended land" gate still reads the charters. The old text's culture exclusion is gone, so Six Gardens' institution, The Garden of the World and The Inheritance of Fields pay their culture on these fields. Alternative: keep the exclusion.
15. The Mountain Schools counts mountains inside the town's own borders, worked or not (`terrainInBorders`'s reading).
16. The Founding Furrow counts the towns you hold after the founding, captured towns included, so the second town pays 10 culture. Alternative: towns founded this game (`citiesFounded`).
17. The Horrea counts every Granary in your towns and pays the empire's authority.
18. The Land Hunger reads only empires you have met (The Defiant Kingdom's reading). The +1 movement reaches each of your settlers while the condition holds, read when the allowance refills.
19. The Many Hands counts every town you hold, the capital included: twelve steps, +36% at most.
20. The Capitolia counts every empire building you hold (the `empireBuildings` count, the Valley of Kings included), and each town gains +1 culture for each.
21. The Mother City counts towns founded this game (`citiesFounded`, The Book of Settlements' count), so a town you later lose still counts. It is a city-stage percentage in the capital.
22. Six Gardens' institution is a hex line: +1 culture on each tended hex while it is worked.
23. The Domesday Survey's institution is a hex line: +1 science on each worked improved or tended hex. The Age of Improvement doubles it on improved hexes, because an institution is an Order's effect. Alternative: a town count, which the amplifier does not reach.
24. The Wide Country's institution: every town's border basket fills 25% faster (`borderCulture`).
25. Veteran Colonies: one citizen to the town where the unit retires, through `settlePopulationWindfall` (no growth riders; it counts toward the town's largest size). A unit raised for free gives nothing (the first triage's reading 79). A unit a levy raised gives one. The unit's cost does not matter, so a cheap unit trained and retired turns its hammers into a citizen (question 1).
26. Veteran Colonies and The Mit'a both return a citizen for a levied soldier who retires: one when it retires, one twenty turns after the levy (question 1).
27. Watch and Ward: every unit with the levy mark, whatever use raised it, in attack and in defence, while the fight's hex is inside your borders (`ownTerritory`).
28. The Burghers: +50% on the town's guild inflow, one labelled line, for a town of twelve citizens or more. The share cap and the renown-building gate stay.
29. The Aediles counts a public work when it is finished in one of your towns, built or bought (the first triage's reading 62), while the card is seated. A captured town's public works add nothing.
30. Public works are the six rows that carry the `publicWork` marker. The Lighthouse and the Workshop are not among them (question 3 of the themes doc, as recommended).
31. The Public Good counts every public work standing in your towns, captured towns included, because pay follows the stones.
32. The Topping Out pays when any of your towns finishes an empire building, built or bought. Each of your towns gains five times its own population, into its own basket, settled at once. The Magnum Opus ends the game, so it never pays.
33. The Cura Aquarum: one reading of "this town holds a building" for the building's effects: the Aqueduct's growth line, its water (`waters`), and the card scopes and counts (`hasBuilding`, `citiesAdmitted`, `buildingsOfKind`), so The Great Aqueducts, The Waterworks, Hydraulic Schools and Garden Cities see it. It is not read for what was built: score, maintenance, triumphs, wagers, purchase, the build list and the completion moment, so The Coming of the Water does not fire. The town may still build a real Aqueduct. The capital never counts, because the `connected` scope never admits it. Alternative: every reader of a town's buildings.
34. The Rope Stretchers counts improved tiles inside each town's borders, worked or not, tended works left out (The Ambarvalia's count).
35. The Staked Claims moves from band 3 to band 2, so it is dealt from Tier II.
36. (E7) The sheet takes each row's text from the list doc as revised on 2026-10-21. The 32 proposed Doctrines stay as they are.
37. (E7) E7 also wrote The Two Harvests' new text, its deferred sentence, its note and its `needsTendedWork` gate on its data row, so the Compendium shows the target card while it waits for E9.
38. (E7) Two reward shapes lost their only card: the citizens to the smallest towns (The Wide Country) and each town paid from its own figure (The Domesday Survey). Both stay in the code; their tests run on a stand-in reward.
39. (E8) The Land Hunger narrows to `class: { type: 'settler' }`, not the settler's model class, because the great person shares that model.
40. (E9) The Two Harvests counts every farm, mine and lumber mill you own, worked or not, because a hex's yield cannot depend on whether it is worked. Hex lines still pay worked hexes only.
41. (E9) A hex that carries the burned mark is refused after its work is gone, so bare land burned once cannot take burned country.
42. (E9) A farm on a seam may be burned, because the farm stays.
43. (E10) The Burghers' line is a share of all four kinds of guild line, the idle line included, and it is not rounded.
44. (E10) The `citizens` grant takes the era and council multipliers as renown does, rounded down; no live row uses them.
45. (E10) Watch and Ward reads the fight's hex: an attacker gains it only when the hex it attacks is inside its borders; a defender when it stands inside them.
46. (E11) A public work granted by a completion or a commission counts for The Aediles; a founding rider's free Granary does not, because it does not pass through `realiseItem`.
47. (E11) The Topping Out's hammers go into each basket at once but are settled at the production step, not during the completion; `payCompletionRiders` settles growth only.
48. (E11) The Topping Out also pays for a granted empire building.
49. (E12) The one reading of what a town holds lives in `statecraft/evaluator.ts`, not `cities.ts`: every reader may import the evaluator, but `yields/hex.ts`, `visibility.ts`, `renown.ts` and `routeYields.ts` may not import `cities.ts`.
50. (E12) Every scope and count that asks what a town holds moves to it, not only the three the triage named, so The Public Good counts a held Aqueduct.
51. (E12) Every reader of a building's effect moves to it; the readers of what was built stay on `City.buildings`.
52. (E12) A card never grants a wonder or an empire building this way.
53. (E12) A held building's lines print "Building · Aqueduct" without the card's name. A UI follow-up could name the card.

## The batches

**The second track.** The Scientific batches S4 to S13 run one at a time in the main tree. The E batches run on the second track, after the Dominion batches (D11 to D16), in the same way:
- Use the second track's git worktree. Bring it up to `decks` before E7. A new worktree branches from `main` by default, so fast-forward it to `decks` first.
- Run one E batch at a time. When its gate is green, merge it into `decks`, then bring the worktree up to `decks` before the next E batch.
- The orchestrator runs the batch-gate on `decks` after each merge, as for any batch.

**Keep each E batch small and additive in the files the two tracks share:**
- Put a new union member beside the Expansionist members already in that union, not at its end, so an S append and an E insert touch different lines. Do the same for register lists (`HEX_MARK_IDS`, `TALLY_OCCASIONS`) and word tables.
- Put a new switch arm beside the Expansionist arms in the evaluator, the describers and `src/ai/value.ts`.
- A batch that adds a member to a union `value.ts` switches on exhaustively (a `CardEffect` kind, a `rulePercent` rule) adds a stand-in arm (`ctx.ai.score.unknownEffect`, or 0 where bots never use it) in the same batch, so the tree typechecks. E13 prices it.
- In `docs/orders-and-doctrines.md`, edit only the Expansionist shelf and its notes. In `data/buildings.json` and `data/improvements.json`, add a field to a row on its own line.
- In `test/fixtures/cardText.json`, on a conflict take either side and rewrite the file with `CARD_TEXT_WRITE=1 npx vitest run test/sim/cardTextSnapshot.test.ts`.
- `SCHEMA_VERSION` (`src/sim/state.ts`): each card batch bumps it once. The merge takes the next free number and updates the pin in `test/sim/state.test.ts`.

**Shared work belongs to one track:**
- The Assay's move to `common.json` and its row on this sheet are S5's. No E batch touches them.
- Feature C (a moment when a commission is met, and a count of met commissions) is Dominion's D11. No Expansionist card reads it; the deck's five commissions feed Dominion's cards with no E work.
- The grant scaled by each town's own population is S6's (`fromTownPopulation`, The Journeymen). The Topping Out reuses it, so it waits for S6.
- The hex mark is batch E3's. E9 adds three mark ids (`burned`, `marl`, `marlSecond`) and one delivery (`markBeside`) and builds nothing twice.
- `GroundFacts` gains D12's sight gate first. E9 adds its two facts (the work-age offset, the fields counted as tended) beside it.
- A commission's price for the bots is D16's. E13 reuses it for the five Expansionist commissions.

**The sheet.** Expansionist's sheet is sorted and typed. E7 writes every card of the two plan docs onto it. Each later E batch sets its own rows to `implemented`, with the Ability cell equal to the data row's text and the Type column equal to the row's `type`, and recomputes the counts tables. A row is `implemented` only when its data text equals the sheet's Ability cell.

### E7: the sheet of record, the retirements and the cards changed in place

**Built 2026-10-21** on `exp-work` (`971b174c`), merged into `decks` with E8. Readings 37 and 38 came from it.

- **Builds:**
  - **The sheet.** Rewrite the five tier tables of `docs/decks/expansionist.md` from the list doc as revised on 2026-10-21:
    - the ten cards E7 builds, as `implemented`;
    - every other changed live row as `modify: revised` (The Burning Season, Veteran Colonies, The Mountain Schools) or `modify: reworked` (Commission: Break the Sod, The Topping Out), with the target text;
    - The Two Harvests as `modify: deferred`, with its new text and type Wildcard;
    - every new card as `add`, and The Marl Pits as `add` with its new text;
    - the 16 cut sheet cards off the tables;
    - the Type column on every row, and both counts tables;
    - the header: "Why each card is here" names `docs/plans/expansionist-themes.md`, and the build names this triage;
    - "Open for your pass": a "Ruled 2026-10-21" list pointing at section 11 of the themes doc, and The Hydraulic Commonwealth's line marked done (S1b).
    - Leave the shared table's rows as they are, The Assay included if S5 has landed, and the 32 proposed Doctrines.
  - **The retirements.** `retired: true` on the 15 rows, and their `type` removed (reading 7). `test/sim/decks/expansionist.test.ts`: the retired count 33 → 48, and the header comment. The Expansionist shelf of `docs/orders-and-doctrines.md` drops the 14 live rows.
  - **Cards (10), each with its new text:** The Rope Stretchers, Six Gardens, The Milestones, The Teeming Realm, The Staked Claims, Plenty, The Wide Country, The Measure of the Land, The Mother City, The Domesday Survey. The five retyped rows and The Two Harvests take their new types (reading 8).
- **Fence:** `data/decks/expansionist.json`, `docs/decks/expansionist.md`, the Expansionist shelf of `docs/orders-and-doctrines.md`, `test/fixtures/cardText.json`, `src/sim/state.ts` (the schema line) and `test/sim/state.test.ts`, `test/sim/decks.test.ts` (the live count; Expansionist's live rows go from 116 to 102), `test/sim/decks/expansionist.test.ts`, the tests that seat a retired or changed row (`expansionistCards`, `expansionistLand`, `expansionistMoments`, `expansionistLevies`, `expansionistWorks`, `expansionistMeters`, `test/sim/occasionRiders.test.ts`), a new `test/sim/decks/expansionistThemeCards.test.ts`. `src/sim/statecraft/describers.ts` only if a sentence reads badly.
- **Shares with the S track:** `docs/orders-and-doctrines.md` and `test/fixtures/cardText.json` (S4 to S9, S11), `src/sim/state.ts` (every S card batch), `test/sim/decks.test.ts` (every S batch that changes the live count), and `docs/decks/expansionist.md`, `test/sim/decks/expansionist.test.ts` and `test/sim/decks/expansionistLand.test.ts` (S5).
- **Shares with the D track:** the same shared files (D11 to D15 edit them earlier on this track).
- **Depends on:** D16 merged (the queue). Nothing in E7 needs a D or S shape.
- **Schema:** one bump (fifteen rows leave the pools; six rows change type).
- **Done-gate:** `npx vitest run test/sim/decks/expansionist.test.ts test/sim/decks/expansionistThemeCards.test.ts test/sim/decks/expansionistCards.test.ts test/sim/decks/expansionistLand.test.ts test/sim/decks/expansionistMoments.test.ts test/sim/decks/expansionistLevies.test.ts test/sim/decks/expansionistWorks.test.ts test/sim/decks/expansionistMeters.test.ts test/sim/occasionRiders.test.ts test/sim/decks/dominion.test.ts test/sim/decks.test.ts test/sim/commissions.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`, and the fence's files typecheck.

### E8: the new data-only cards

**Built 2026-10-21** on `exp-work` (`452e0ed5`), merged into `decks` with E7. Reading 39 came from it.

- **Builds:** five group-1 rows: The Founding Furrow, The Horrea, The Land Hunger, The Many Hands, The Capitolia.
- **Fence:** `data/decks/expansionist.json`, `docs/decks/expansionist.md`, the Expansionist shelf of `docs/orders-and-doctrines.md`, `test/fixtures/cardText.json`, `src/sim/state.ts` (the schema line) and `test/sim/state.test.ts`, `test/sim/decks.test.ts` (Expansionist's live rows 102 → 107), `test/sim/decks/expansionistThemeCards.test.ts`. The describers only if a sentence reads badly.
- **Shares with the S track:** as E7, without S5's files.
- **Shares with the D track:** the shared files only.
- **Depends on:** E7.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/expansionistThemeCards.test.ts test/sim/decks/expansionist.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.
- **After E8 a playtest can start:** 102 of the 114 cards and charters play as written.

### E9: the land (marks, ages and tended fields)

**Built 2026-10-21** on `exp-work` (`8e0344a3`), merged into `decks` with E10. Readings 40 to 42 came from it.

- **Builds:**
  - Three mark rows in `rules.improvements.hexMarks` and `HexMarkId`: `burned` (food 1, while `improved`), `marl` and `marlSecond` (food 1 each, while farm or pasture).
  - A field on the `burnedCountry` row, read in `improvementErrorAt` and `buildImprovementAt`: on an improved hex the build writes the mark and keeps the improvement, and a hex already burned is refused with a sentence (readings 9 to 11). Card: The Burning Season.
  - A grant field `markBeside`, delivered by a sibling of `markTownLand` in `cities.ts` (the six hexes around the moment's hex, inside the builder's borders), writing `marlSecond` where `marl` stands. The towns touched are refreshed, and the routine joins the register of mid-turn yield mutations beside `markTownLand` (reading 12). Card: The Marl Pits, a new row.
  - A new effect, the age offset on works, read by `groundFactsFor` into `GroundFacts` and added in the `standingSince` arm. Every caller that asks `standingSince` must hand in the ground facts; the batch lists the callers that do not and pins the list (reading 13). Card: Commission: Break the Sod.
  - An empire rule, the fields counted as tended, read by `groundFactsFor` into `GroundFacts` and by the `tended` arm; the commission figures `tendedTiles` and `improvedTilesWorked` read it too (reading 14). Card: The Two Harvests, freed from `deferred`.
  - `atLeast` on the `terrainInBorders` town scope (reading 15). Card: The Mountain Schools.
- **Fence:** the shared six (Expansionist parts: `statecraftData.ts`, `statecraft/evaluator.ts`, `statecraft/describers.ts`, `data/decks/expansionist.json`, the Expansionist shelf, the fixture), `docs/decks/expansionist.md`, `data/rules.json` (`improvements.hexMarks`), `src/sim/rulesData.ts`, `data/improvements.json` (the `burnedCountry` row), `src/sim/improvementData.ts`, `src/sim/improvements.ts` (`improvementErrorAt`, `buildImprovementAt`), `src/sim/cities.ts` (`markTownLand`'s sibling and the register docblock), `src/sim/commissions.ts` (the two figures), `src/sim/state.ts` (the schema line) and `test/sim/state.test.ts`, `test/sim/decks.test.ts` (Expansionist's live rows 107 → 109), `src/ai/value.ts` (stand-in arms only), a new `test/sim/decks/expansionistThemeLand.test.ts`.
- **Shares with the S track:** the shared six (S4 to S9), `data/improvements.json`, `improvementData.ts` and `improvements.ts` (S4, S5), `cities.ts` (S5, S9), `commissions.ts` (S6, S8), `value.ts` (S13).
- **Shares with the D track:** `tileConditionHolds` and `GroundFacts` (D12's sight gate), `commissions.ts` (D11), `cities.ts` (D11 to D13), `improvements.ts` (D14).
- **Depends on:** E7 (the sheet), and D12 merged (its sight gate changes the tile test's inputs first).
- **Note:** a new mark joins the yields lens through `HEX_MARK_IDS` with no render edit. No mark is drawn on the map (a UI follow-up).
- **Schema:** one bump (new mark ids on `Tile.marks`, a new row, and a row leaves `deferred`).
- **Done-gate:** `npx vitest run test/sim/decks/expansionistThemeLand.test.ts test/sim/decks/expansionistLand.test.ts test/sim/decks/expansionistWorks.test.ts test/sim/decks/expansionistMeters.test.ts test/sim/decks/expansionist.test.ts test/sim/improvements.test.ts test/sim/commissions.test.ts test/sim/cities.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/statecraft.test.ts test/mapgen/moduleCycles.test.ts`.

### E10: the militia and the trades

**Built 2026-10-21** on `exp-work` (`d7347a61`), merged into `decks` with E9. Readings 43 to 45 came from it. Bots price a levied combat line at 0, as they price levied stamps.

- **Builds:**
  - A grant field `citizens` on `WindfallGrantSpec`, settled through `settlePopulationWindfall`, paid only when the moment carries `unitCost` (readings 25, 26). Card: Veteran Colonies, changed in place.
  - A `levied` field on `combatLine`, read in `combatLineAmount` off the piece's levy mark. If the combat situation does not carry the piece, `combat.ts` hands it in (reading 27). Card: Watch and Ward.
  - A `rulePercent` rule `guildInflow` with a town scope, one labelled line in `explainGuildInflow` (reading 28). Card: The Burghers.
- **Fence:** the shared six (Expansionist parts), `docs/decks/expansionist.md`, `src/sim/guilds.ts` (`explainGuildInflow`), `src/sim/combat.ts` (only if the situation must carry the piece), `src/sim/state.ts` (the schema line) and `test/sim/state.test.ts`, `test/sim/decks.test.ts` (Expansionist's live rows 109 → 111), `src/ai/value.ts` (the stand-in arm for `guildInflow`), `test/sim/decks/expansionistSurplus.test.ts` (Veteran Colonies), `test/sim/guilds.test.ts` and `test/sim/disband.test.ts` (read; their pins must not move), a new `test/sim/decks/expansionistMilitia.test.ts`.
- **Shares with the S track:** the shared six (S4 to S9), `combat.ts` (S9), `value.ts` (S13).
- **Shares with the D track:** `combat.ts` (D12, D15), `value.ts` (D16).
- **Depends on:** E8. It does not need E9.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/expansionistMilitia.test.ts test/sim/decks/expansionistSurplus.test.ts test/sim/guilds.test.ts test/sim/disband.test.ts test/sim/combat.test.ts test/sim/decks/expansionistLevies.test.ts test/sim/decks/expansionist.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/statecraft.test.ts`.

### E11: public works and empire buildings

**Built 2026-10-21** on `exp-work` (`d280d797`), The Topping Out included (S6's grant was on the branch). Readings 46 to 48 came from it. Follow-ups: the Compendium does not name a public work (markers are labelled in `src/ui/compendium.ts`); `docs/README.md` still names The Topping Out as the card that reads a completion's population.

- **Builds:**
  - A marker `BuildingDef.publicWork` on six rows of `data/buildings.json` (the Granary, Aqueduct, Watermill, Harbour, Public Bath and Cistern), read by an `isPublicWork` beside `isEmpireBuilding`, and a register test that the marked rows are exactly those six (reading 30).
  - A `TallyOccasion` `publicWorkCompleted`, raised where a building is completed or bought, beside the tallies `realiseItem` raises (reading 29). Card: The Aediles.
  - A `CountKind` `publicWorks`, for the empire or `within: 'city'` (reading 31). Card: The Public Good.
  - The Topping Out, as data on S6's per-town grant (reading 32). If S6 has not merged when E11 starts, E11 lands the other two cards and The Topping Out waits for a one-card follow-up after S6. E11 does not build the grant a second time.
- **Fence:** the shared six (Expansionist parts), `docs/decks/expansionist.md`, `data/buildings.json` (one field on six rows), `src/sim/buildingData.ts`, `src/sim/cities.ts` (the tally line only), `src/sim/state.ts` (the schema line) and `test/sim/state.test.ts`, `test/sim/decks.test.ts` (Expansionist's live rows 111 → 113), `test/sim/decks/expansionistMoments.test.ts` (The Topping Out), a new `test/sim/decks/expansionistPublicWorks.test.ts`.
- **Shares with the S track:** the shared six (S4 to S9), `data/buildings.json` and `buildingData.ts` (S4's new rows, S5's `unlockedByCard` on the Aqueduct row), `cities.ts` (S5, S9). S6 owns the per-town grant.
- **Shares with the D track:** `cities.ts` (`realiseItem`, where D12 adds the `militaryGained` tally).
- **Depends on:** E8, and S6 merged for The Topping Out.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/expansionistPublicWorks.test.ts test/sim/decks/expansionistMoments.test.ts test/sim/decks/expansionist.test.ts test/sim/productionCosts.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/statecraft.test.ts`.

### E12: The Cura Aquarum

**Built 2026-10-21** on `exp-work` (`3e375290`), merged into `decks` with E11 as `57a10a9a` (schema 168). Readings 49 to 53 came from it. Cost: a seat holding the card about doubles its town fold sweep (0.5 to 1.0 ms for eight towns), because the road fill is not cached and roads do not move the economy clock; a follow-up can cache it. Follow-ups: the city panel's Built list and its defence, hit points, queue floor and rite pay still read what was built (they agree today, because the Aqueduct has none of those facts); bots read what was built until E13.

- **Builds:** a city rule with a `building` field (for example `holdsBuilding`), scope `connected`, and one reading of "this town holds this building" (for example `townHoldsBuilding(state, city, id)`) that answers yes for a real building or for the rule. The readers of the building's effect move to it: `buildingEffects.ts` (`waters`, its lists), the building's own effects as a `liveEffects` source, the building lines of the town fold (`yields/town.ts`), and the scopes and counts (`hasBuilding`, `citiesAdmitted`, `buildingsOfKind`). The readers of what was built keep reading `City.buildings` (reading 33). The batch lists every reader it moved and every reader it left, with the reason for each. Card: The Cura Aquarum.
- **Fence:** the shared six (Expansionist parts), `docs/decks/expansionist.md`, `src/sim/cities.ts` (the helper), `src/sim/buildingEffects.ts`, `src/sim/yields/town.ts` (the building lines), `src/sim/state.ts` (the schema line) and `test/sim/state.test.ts`, `test/sim/decks.test.ts` (Expansionist's live rows 113 → 114), `test/sim/yieldsDocSync.test.ts` (read; the order of the folds must not move), `test/mapgen/moduleCycles.test.ts` (read: a helper `buildingEffects.ts` and the evaluator both need lives in a leaf), a new `test/sim/decks/expansionistCura.test.ts`.
- **Shares with the S track:** the shared six (S4 to S9), `cities.ts` (S5, S9).
- **Shares with the D track:** `yields/town.ts` (D14's `productionModifiers`), `cities.ts` (D11 to D13).
- **Depends on:** E11. It is the largest piece of work, so it runs last of the card batches.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/expansionistCura.test.ts test/sim/cities.test.ts test/sim/yieldsDocSync.test.ts test/sim/decks/expansionistMoments.test.ts test/sim/decks/expansionist.test.ts test/mapgen/moduleCycles.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/statecraft.test.ts`.

### E13: bot pricing

**Built 2026-10-21** (`c0a9d014`). Knobs under `score.expansionist` and `score.tallyForecast.publicWorkCompleted`. Bots read what a town holds for a building's effect in `value.ts` and `bot.ts`; `chain.ts`, `wants.ts` and `diplomacy.ts` still read what was built (a follow-up). The levy and disband cards stay at 0 for bots until the user rules on teaching bots to levy (question 2). **The Expansionist build plan is complete.**

- **Builds:**
  - Prices in `data/ai.json` and `src/ai/value.ts` for every new kind of E9 to E12: the three marks (through the worker plan's own fold where it can see them), `markBeside`, the age offset, the fields counted as tended, `atLeast` on `terrainInBorders`, the `citizens` grant, the `levied` combat line, `guildInflow`, the `publicWork` count and tally, and the city rule of E12 (priced as the Aqueduct's worth in each joined town, through `scoreUnlockedBuilding`). The arena page shows each new knob with no page edit.
  - **Bots never levy**, and they forecast no disbanding. So Watch and Ward and every "Needs a levy" card stay at 0, and so do Veteran Colonies' citizens. E13 says so in the arms. It does not teach bots to levy (question 2).
  - The five Expansionist commissions are priced by D16's commission price. Check that their institutions price as their effects.
  - Re-pin the explore digest and the bot digests with the control-run method of the D batches.
- **Fence:** `src/ai/value.ts`, `data/ai.json`, `test/sim/aiAppraisal.test.ts`, `test/sim/explore.test.ts`, and the digests.
- **Shares with the S track:** S13 edits the same files (and `bot.ts`, `chain.ts`, `plan.ts`). Put new knobs beside the Expansionist knobs. E13 and S13 do not run at the same time.
- **Shares with the D track:** D16 edits the same files, before E13 on this track.
- **Depends on:** E12, and D16 (the commission price). It touches no sim file.
- **Schema:** none.
- **Done-gate:** `npx vitest run test/sim/aiAppraisal.test.ts test/sim/explore.test.ts`. The digest re-pin is the orchestrator's push-gate work (`npm run test:all`).

### Order and overlaps

- The E track: E7 → E8 → E9 → E10 → E11 → E12 → E13, one at a time, after D16. E10 does not need E9, so the two may swap. E11 waits for S6 for The Topping Out only.
- Cards and charters that play as written, after each batch: 97 after E7, 102 after E8, 107 after E9, 110 after E10, 113 after E11, and 114 after E12.
- The files both tracks touch:

| File | E batches | S batches | D batches (earlier on this track) |
|---|---|---|---|
| `src/sim/statecraftData.ts`, `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts` | E9 to E12 (E7, E8 only if a sentence reads badly) | S4 to S9 | D11 to D15 |
| `docs/orders-and-doctrines.md`, `test/fixtures/cardText.json` | E7 to E12 | S4 to S9, S11 | D11 to D15 |
| `src/sim/state.ts` (the schema line) | E7 to E12 | S4 to S9, S11 | D11 to D15 |
| `test/sim/decks.test.ts` (the live count) | E7 to E12 | each S batch that changes it | each D batch that changes it |
| `data/decks/expansionist.json` | E7 to E12 | none | none |
| `docs/decks/expansionist.md`, `test/sim/decks/expansionist.test.ts` | E7 to E12 | S5 (The Assay's row) | none |
| `test/sim/decks/expansionistLand.test.ts` | E7, E9 | S5 | D12 (in its gate) |
| `data/decks/common.json` | none | S5, S9, S11 | none |
| `data/improvements.json`, `src/sim/improvementData.ts`, `src/sim/improvements.ts` | E9 | S4, S5 | D14 (`improvements.ts`) |
| `data/buildings.json`, `src/sim/buildingData.ts` | E11 | S4, S5 | none |
| `src/sim/cities.ts` | E9, E11, E12 | S5, S9 | D11, D12, D13 |
| `src/sim/commissions.ts` | E9 | S6, S8 | D11 |
| `src/sim/combat.ts` | E10 (if needed) | S9 | D12, D14 (read), D15 |
| `src/sim/yields/town.ts` | E12 | none | D14 |
| `src/sim/guilds.ts`, `src/sim/buildingEffects.ts`, `data/rules.json` (`hexMarks`) | E9, E10, E12 | none | none |
| `src/ai/value.ts`, `data/ai.json` | E9, E10 (stand-in arms), E13 | S13 | D16 |

## Counts

| | Built | Group 1 | Group 2 | Group 3 | All |
|---|---|---|---|---|---|
| Tier 0 | 11 | 3 | 0 | 0 | 14 |
| Tier I | 20 | 2 | 4 | 0 | 26 |
| Tier II | 18 | 4 | 3 | 0 | 25 |
| Tier III | 25 | 3 | 3 | 0 | 31 |
| Tier IV | 13 | 3 | 2 | 0 | 18 |
| **All** | **87** | **15** | **12** | **0** | **114** |
| Shared | 16 | 1 | 0 | 0 | 17 |

The 114 are the 111 seatable cards and the 3 charters of the list doc. Migration is counted as built (it plays as built). Beside them, E7 retires 15 rows. Of the shared rows, The Assay is S5's.

## Follow-ups

**The UI track** (`src/ui/`):
- A burned farm and a marled farm show no mark on the map. The yields lens shows their food.
- The worker's panel shows one "Burned Country" line. On an improved hex it should say that the improvement stays.
- The city panel should show an Aqueduct The Cura Aquarum counts, and say where it comes from.
- No notice reports the citizen Veteran Colonies gives, or the marks The Marl Pits writes.
- The five Expansionist institutions join the read-only list under the council's chairs (Dominion's question 4, answered).
- The Compendium's building entries could name a public work. It is generated from the rows, so this is a word in the describers.

**The bot track:**
- Bots never levy (the first triage's bot follow-up). The engine cannot be measured in the arena until they do (question 2).
- Bots never tell a town to stop growing, never retire a soldier for a citizen, and never burn an improved hex.

**Not on the list:** feature C is accepted (D11), and the themes doc said The Harvest Feast (a met commission feeds every town) could then come back as glue. It is not on the list. Say if you want it.

## Questions for the user

1. **Veteran Colonies and the citizens it makes.** Two readings follow from your new text. A levied soldier who retires gives its citizen back, and The Mit'a gives it back again twenty turns later, so each levy nets a citizen while both are seated (reading 26). And any soldier that was not free counts, whatever it cost, so a cheap unit trained and retired turns its hammers into a citizen (reading 25). Recommended: keep both as written for the playtest, and add a guard later if the loop shows. The alternatives are a citizen that comes home once, and a floor on the unit's cost.
2. **Bots and the levy.** Should a bot-track batch teach the bots to levy, so the arena can measure the engine? Recommended: yes, after E10, as a bot-track batch outside this plan.
3. **The readings.** May the build use readings 1 to 36 until you mark one?
