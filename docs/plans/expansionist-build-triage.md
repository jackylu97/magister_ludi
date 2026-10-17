# Batch E triage: the Expansionist `add` and `modify` cards

**Done (2026-10-17).** Batches E0 to E6 have built every card on the sheet that needs no new control and no choice when it fires. What is left:
- **Cards still deferred, and the four questions for the user** (the details are under "Borderline: the calls"):
  1. **The Marl Pits and The Deep Workings** (not built): a worker's build always replaces what stands on the hex. Should a worker marl or deepen with a new order that keeps the improvement, or should the bonus come by itself?
  2. **The Two Harvests** (deferred): how does a player add a tended work beside a farm, mine or lumber mill without replacing it, and how does the hex look on the map?
  3. **The Beating of the Bounds** (built, with the game picking the hex): should the player pick the extra hex on the map, or should the text drop "of your choice"?
  4. **Public Works** (deferred): fold it into The Raising of the Land and cut it, or give the great engineer two new acts, which needs a way to choose between them?
  - Also: The Hydraulic Commonwealth is a deferred row in `common.json` that no sheet lists. The sheet recommends retiring it.
- **Open rulings:**
  - **The Common Domain:** should a town of ten citizens also grow its borders one ring further (reading 60)?
  - **The Prospectors:** the vein layer is shelved, so no seam surfaces and the card pays nothing until the layer comes back (reading 57).
  - **Migration:** reading 36 ("at its happiness limit" read as your empire's spare happiness at zero or below) waits for the user to confirm.
  - **The Floating Gardens:** whether it stays an improvement that any empire may build after Irrigation (`docs/flags.md` (wwwwww)).
  - **The Breadbasket and the Avoid growth tick** (reading 78): for the user to confirm.
  - The sheet's "Still open" list, at the end of the readings, is unchanged.
- **Bot follow-ups:**
  - Bots never levy, so the levy cards (E1) do nothing for a bot, and the bot prices a levy's marks at nothing.
  - Bots price a grant scaled by its occasion at its multiplier alone, so they undervalue The Tax Rolls and The Opening of the Roads (E2).
  - Bots do not plant outposts or tended works, and they do not price a founding claim radius (`claimRadius`) or The Beating of the Bounds' claim (E4).
  - E4's new kinds (`unlocksImprovement`, `worksBeyond`, `encroach`, `migration`) and E5's `writUncapped` have stand-in prices.
  - Bots never tell a town to stop growing, so The Breadbasket never pays a bot. Bots disband only to clear arrears, and they forecast no disbanding, so they price Veteran Colonies at nothing (E6).
  - Units left on water and paths blocked by a unit are ruled and not built yet (`docs/flags.md` (xxxxxx)). The lake fix found them.
- **UI follow-ups:**
  - No notice reports a hex or a citizen that the ten-turn phases move, or the ground an outpost claims (E4).
  - A combat line never says which side it applies to, so The Stationes does not say "when defending" (E0).
  - The Avoid growth note on the focus pane does not say that a card moves the surplus into production (E6). The city panel's step 14 line shows the moved food.

**Status:** written 2026-10-16 by a read-only triage agent, before any E batch. It is the plan for the user's ruling of 2026-10-16 (*"let's implement the expansionist deck, deferring any that require a new UX/user interaction"*, recorded at the end of `docs/plans/expansionist-builds.md`). The readings in "Rule ambiguities" are the ones the build will use unless the user changes them here. Mark any you disagree with, as on the deck sheets.

**Built:** E0 (the types and the 37 data-only cards, `39cfb0ba`), E1 (the twelve levy cards, `cd48080b`), E2 (ten cards about moments, records and counts, `b4e582af`), E3 (the ten land cards, `6ecdf59d`), E4 (the ten cards about works, claims and borders, `bcc872cd`, schema 141) E5 (eight cards about meters, commissions and the shared The Frontier Militia, `3876114e`) and E6 (The Breadbasket and Veteran Colonies, schema 145). The merge that brought Dominion's D5 and D6 under E2 and E3 renumbered E2 to schema 139 and E3 to 140. Dominion batch D7 landed first at schema 142, so the merge after it renumbered E5 to schema 143 and the lake fix (L1) to 144. The readings each batch applied are below; a reading a batch added is marked with the batch. The Frontier Militia moved from E2 to E5: it needs the best-melee unit grant, which Dominion batch D5 built. E5 left out three cards that need Dominion batch D7: The Farming Garrisons, which D7 built (`825a98cc`), and The Breadbasket and Veteran Colonies, which a last batch, E6, built on D7's shapes.

Source: `docs/decks/expansionist.md` as of commit `96681fb4` (branch `decks`), which holds the user's three passes of 2026-10-16 and the Keep ruling. Shapes were checked against `src/sim/statecraftData.ts` and `src/sim/statecraft/evaluator.ts` as D3 left them (branch `d2-work`, merged into `decks` as `e9fed7be`), the sim modules they read (`levies.ts`, `cities.ts`, `improvements.ts`, `commissions.ts`, `census.ts`, `meters.ts`, `pathfind.ts`, `terrainData.ts`, `buildingData.ts`), and `src/ai/bot.ts` and `src/ai/value.ts` for the seating.

**Groups:**
- **1, data only:** the text can be written with shapes that exist today. The cell names the shape.
- **2, new shape, no UX decision:** the behaviour is automatic, or uses UI that exists (the levy menu, the worker's build list, the city screen's tile locks, the avoid-growth focus, the disband button, the commission rail). The cell names what is missing.
- **3, deferred:** needs a decision about UI or player interaction. The cell points to the question for the user.

Facts the cells rely on:
- **Grants.** A windfall's food and production land in the town nearest the moment's hex, or in the capital when there is no hex. D3 adds `toCapital`, `toEveryTown` and `toNearest` (a town scope) to a grant. A commission reward pays through the same helper with no hex, so its food, production and units land in the capital.
- **Counts.** `tilesInBorders` counts owned hexes that pass a tile test, for the empire or `within: 'city'`, and it passes the turn, so `standingSince` works. A `pays` count with a `stage` pays percentage points in every town at that stage (`explainCardPercentYields`). The Veterans' Roll is the model.
- **Tile tests.** `improved` is any improvement except a tended work. `unimproved` is every other hex: bare land, water, mountains, town centres and tended works. On the sheet, "wild" maps to `unimproved` and "improved" maps to `improved`.
- **Levies.** The levy menu shows one line for each use a held card grants. The uses are production, muster, opus and conscript. A new use needs a case in `planLevy` and `labelFor` (`levies.ts`) and in `sourceWords` (`src/ui/levyMenu.ts`). The figure "the food it took to grow that citizen" is `levyHammers`.
- **Records.** `Player.citiesFounded` exists, with no count. There is no record of citizens levied, of a town's largest size, or of who surfaced a seam (`Tile.surveyed` is a bare flag).
- **Workers.** A worker builds only inside your borders (`improvementErrorAt`), and a new improvement replaces what stands on the hex. Improvement rows are data. A charter opens one on draft (`charter.unlocks.improvement`). A seated card can open a building (`unlocksBuilding`) but not an improvement.
- **Land.** Mountains are refused in one place (`isWorkableTile`, one caller). The work radius is one constant (`CITIES.workRadius`), read in `cities.ts` and drawn by `workRadiusCells` in `src/ui/controls.ts`. A lake is "water nobody crosses at all" (`terrainData.ts`), so no unit can enter one. **Changed by the lake fix (L1):** since the user's ruling of 2026-10-16 (`docs/flags.md` (wwwwww)), a lake is water like the coast, so an embarked unit may cross one and a ship may enter one.
- **Meters.** Happiness and authority are empire meters (`meters.ts`). A town has no happiness of its own. The tier ladder stops at its top rung (`tierClamp`).
- **Moments.** Growth passes the new population. Completion passes `wonder`, `building` and `firsts`, and no population. The census pays only its leader, through a Triumph (`runCensus`).
- **Other.** `cityStat` counts read the town's own count (Siegecraft's walls). A town's avoid-growth mark exists (`City.avoidGrowth`, set by `setCitizenFocus`). Combat conditions read the contested hex: in defence that is the unit's own hex, in attack it is the target's.

## Tier 0

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Forest Gardens | modify: cut | 1 | Retire the row (`retired: true`). Hexes already tended keep their gardens. |
| The Fish Traps | modify: as built | 2 | A move rule that lets a worker of a seat holding the charter enter a lake hex as if embarked. The coast half is built. **Replaced by the lake fix (L1):** a worker reaches a lake embarked, with Sailing, as it reaches the coast. |
| The Ambarvalia | modify: revised | 1 | Rename the row and keep its id. Keep the capital's faith 1. Replace the worked-wild line with `pays` city count `tilesInBorders`, `within: 'city'`, tile `improved`, faith 1, `per: 2`. |
| The Rope Stretchers | modify: revised | 1 | `pays` hex production 1 on `anyImprovement` [mine, quarry, lumbermill]. Drop the `deferred` note. |
| The Beating of the Bounds | modify: as built | 3 | Choosing the hex (see Borderline, item 6). |
| The Pyramid Builders | add | 1 | `productionBonus` category `wonder`, 25, scope `capital`. |
| The Road Home | add | 1 | `foundingRider` `roads: true`. It lays a free road to the nearest town by path, at any age. |
| The Work Gangs | add | 2 | A levy use that raises a worker, `minPopulation: 3`. |
| The Woodland Bands | add | 2 | A move rule: forest and jungle cost what open ground costs. It goes through the `MoveProfile`, so `stepCost` and its four readers agree (`ignoresHillCost` is the model). The strength is two `combatLine` +2, `onFeature` forest and jungle. |

## Tier I

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Burhs | add | 2 | A defensive-building filter on `productionBonus`: no building category means "defensive", and the `defensiveBuildings` count holds the test. The defence is `cityStat` defense 3, count `defensiveBuildings`. |
| The Burning Season | modify: wording | 1 | Text only. |
| Outposts | modify: deferred | 2 | An `outpost` improvement row, opened while the card is seated. A rule that lets workers build it up to three hexes beyond your borders. A claim of its hex and ring for the nearest town (`claimsNeighbours` is the citadel's flag). A town founded on it keeps the land. |
| The Prospectors | modify: as built | 2 | A record of which empire surfaced a seam. The first clause is already true: prospecting costs no charge. |
| Daughter Towns | modify: cut | 1 | Retire the row. |
| Six Gardens | modify: reworked | 1 | Reward `{ yield: culture, amount: 15, fromFigure: tendedTiles }`. Drop the timed food and the worker. The goal and the gate stay. |
| The Marl Pits | add | 3 | Raising a hex (see Borderline, item 1). |
| The Forest Keepers | add | 1 | `pays` hex culture 2 on `all` [improvement lumbermill, `standingSince` 20]. |
| The Plough Teams | add: proposed | 1 | `pays` city count `tilesInBorders`, `within: 'city'`, tile `improved`, food 1, `per: 2`. |
| Commission: Break the Sod | add: proposed | 2 | A commission figure for worked hexes that pass `improved` (`improvedTilesWorked` also counts tended works). Goal `reached` 12. Reward: `timed` 20 turns of `pays` city food 3, and `unit: worker` (it lands in the capital). |
| The Grain Census | add | 2 | A town's largest size, and a tally of the moment it rises. Then a flat +2 and a tally +1: gold in the empire, production in the capital (The Captive Craftsmen's form). |
| The Polis | add | 1 | `conditionRule` `cityCountAtMost` 4: `percentYields` food 25. |
| The Public Fountains | add | 1 | `pays` city count `population`, `within: 'city'`, to happiness 1, `per: 4`, `max: 3`, scope `freshwater` (The Waterworks' form). |
| The Builders' Levy | add | 2 | A levy use that sends the levy figure to a world wonder at the front of another town's queue. The target town is chosen by a rule. |
| The Labour Feasts | add | 2 | The "Needs a levy" gate. The rest is data: `levy` `after` { 10 turns, every 10, `pays` city count `workedUnimprovedTiles` culture 1 }. |
| The Gleaners | add: proposed | 2 | The gate. The rest is `levy` `after` { 10 turns, every 10, `pays` city food 3 }. |
| The Wild Marches | add | 1 | `pays` empire count `tilesInBorders`, tile `unimproved`, culture 1, `per: 4`. |
| The Quiet Provinces | add | 1 | `pays` city count `authoritySurplus`, production 1, `per: 3`, `max: 3`. |
| The Road Towns | add | 1 | `pays` city production 2, scope `connected`. |
| The Garden Frontier | add | 2 | A rule that lets workers build tended works on unowned hexes up to two hexes beyond your borders, and a claim of the hex for the nearest town when the work is finished. Gate: `needsTendedWork`. |

## Tier II

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Watercourses | modify: as built | 2 | Water passed from a farm beside a river to the farms beside it (one step, river only), so they count as on fresh water. One shape with The Water Courts. The +2 production stays a hex line. |
| The Highlands | modify: wording | 1 | Text only: the capital letter. |
| The Breadbasket | modify: reworked | 2 | A transfer of a town's food surplus into its production while the town avoids growth. Dominion's The Laws of Lord Shang needs the same transfer (D7). |
| Migration | modify: deferred | 2 | A phase every ten turns that moves a citizen between your towns. Its trigger needs a reading (see ambiguities). |
| Veteran Colonies | modify: deferred | 2 | A disband moment that pays the town food equal to the unit's cost. The disband button exists. Dominion's The Legions' Labour needs the same moment (D7). |
| The Landscape Garden | modify: as built | 2 | A tile test "beside the centre of a town that holds a world wonder", and its yields-lens fingerprint (a finished wonder changes the hexes around its town). |
| The Tended Country | modify: revised | 1 | Drop the farm line (The Hedgerows takes it). |
| The Old Fields | add | 1 | Two `pays` empire count `tilesInBorders`, tile `standingSince` 30, `per: 3`, `percent: 1`, `stage: empire`, `max: 30`: food and production. |
| The Hedgerows | add: proposed | 1 | `pays` hex food 2 on `all` [improvement farm, `beside` tended]. `needsTendedWork`. |
| The Great Households | add: proposed | 1 | `pays` city count `population`, `within: 'city'`, production `percent: 2`, `stage: city`, `max: 15`. |
| The Harbour Cities | add | 1 | `pays` city count `population`, `within: 'city'`, culture 1, `per: 2`, scope `coastal`. |
| The Labour Rolls | add | 2 | The gate, and a lifetime record of citizens levied with a `CountKind`. Then two empire percentage `pays` (production, food), `per: 2`, `max: 30`. |
| The Terraces of Moray | add | 2 | A levy use that pays the levy figure as science. The town scope is D1's levy `scope`, `mountainAdjacent`. |
| The Book of Settlements | add | 2 | A `CountKind` over `Player.citiesFounded` (the record exists). Then two empire percentage `pays` (production, gold), `percent: 3`, `max: 10`. |
| The Milestones | add | 1 | Two `pays` empire count `roadHexes`, `per: 3`, `percent: 1`, `stage: empire`, `max: 30`: production and gold. Founding roads count, because `layRoad` marks them as yours. |
| The Colonists | add | 2 | A levy use that raises a settler, `minPopulation: 6`. |
| The Teeming Realm | add | 1 | Two `pays` empire count `population`, `per: 10`, `percent: 1`, `stage: empire`, `max: 30`: production and food. |

## Tier III

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Common Domain | modify: deferred | 2 | A work radius for each town (one more ring at ten citizens), read wherever `CITIES.workRadius` is read in `cities.ts`, and by `workRadiusCells`. |
| Seasonal Levies | modify: revised | 2 | The gate only. The effect is built. |
| The Polders | modify: reworked | 2 | A `polder` improvement row on coast (`chargeCost: 2`), opened while the card is seated. A placement rule: three of your land hexes beside it. A hex that yields as grassland with a farm. |
| Public Works | modify: deferred | 3 | Two acts for one great engineer (see Borderline, item 6). |
| The Wide Country | modify: as built | 2 | A tally of hexes claimed while the card is seated (by outposts, camps and buying), and a reward of two citizens in each of the three smallest towns. The +2 happiness for 30 turns is built. |
| The Raising of the Land | modify: revised | 2 | A rider on `greatPersonAct` (engineer) that puts a lasting +1 food +1 production mark on every improved or tended hex in the town's borders. The hex fold and the yields lens read the mark. The data band moves from 4 to 3. |
| The Age of Improvement | add | 2 | A `cardYieldAmplifier` with a tile test (`improved`), on Orders' hex lines only. |
| The Deep Workings | add | 3 | Raising a hex (see Borderline, item 1). |
| Old Workings | add: proposed | 1 | `pays` hex production 3 on `all` [`anyImprovement` mine, quarry, lumbermill; `standingSince` 20]. |
| The Manors | add | 1 | `pays` city count `tilesInBorders`, `within: 'city'`, tile `improved`, production 1, `per: 2`. |
| The Royal Forests | add | 1 | `percentYields` culture 25, scope `workingImprovement` [lumbermill], `atLeast: 3`. |
| The Megalopolis | add | 1 | Two `pays` city count `population`, `within: 'city'` (science 1, production 1), scope `populationAtLeast` 10. |
| The Freedom of the City | add | 2 | The largest-size moment (with The Grain Census) as a windfall occasion. Two riders, at 15 and 20: production 40 × `population`. |
| Plenty | add: proposed | 1 | `windfallRider` `growth`, production 8 × `fromOccasion: population`. |
| The Water Courts | add | 2 | Water passed along chains of your farms from a farm on fresh water. Every fresh-water question reads it (the Irrigation upgrade, farm placement, cards). One field for each sweep. |
| The Coming of the Water | add | 2 | A rider on the Aqueduct's completion that puts a lasting +1 food mark on every farm in the town's borders (The Raising of the Land's mark). |
| The Mill Wheels | add | 1 | `percentYields` production 15, scope `hasBuilding` watermill. |
| The Topping Out | add | 2 | The town's population on the completion facts (one field). Then `windfallRider` `completion`, `wonder: true`, production 20 × `population`. |
| The Mit'a | add | 2 | The gate. A return turn written on the town when a levy is spent (an absolute turn), and a phase step that returns the citizen. |
| The Slack Season | add | 2 | The gate. A levy rule that lifts the wait on every twentieth turn. |
| The Trained Bands | add | 2 | The gate. A mark on units a levy raises, and `unitStamp` `rank: veteran` (D1) narrowed to them. |
| The Staked Claims | add | 2 | A claim radius on `foundingRider`. `claims` takes the next-best hexes one at a time, which can reach the third ring before the second is full. |
| The Quitrents | add: proposed | 1 | `pays` empire count `tilesInBorders`, tile `any` [improved, unimproved] (every hex), gold 1, `per: 2`. |
| The Hallowed Woods | add | 1 | `percentYields` culture 25, scope `workingTiles` on `unimproved`, `atLeast: 5`. |
| The Mountain Terraces | add | 2 | A rule that makes mountains workable for the seat, read in `isWorkableTile` (which then needs the owner). `pays` hex science 2 production 1 on terrain mountain. |
| The Assay Office | add | 1 | `windfallRider` `veinFound`, science 60. |
| The Sovereign Writ | add | 2 | A meter rule that removes the top of the authority ladder: +10% for every five points, for production and border growth. |
| The Tax Rolls | add | 2 | A census `WindfallOccasion`, fired for every real empire with its citizens as `population`. Then gold 5 × `population`. |
| The Imperial Roads | add | 2 | A scoped meter rule that sets a town's cost to zero (`cityCost` is a delta floored at one), scope `connected`. Dominion's The Proconsuls needs the same rule (D4). |
| The Opening of the Roads | add | 2 | A moment for "first joined to the capital", with a stamp on the town and its population. Then production 20 × `population`. |
| The Stationes | add | 1 | `combatLine` +3 `defend`, `withinOfCity` `hexes: 0`, scope `connected`, class `category: military`. |
| The Great Colonies | add | 2 | A founding population read from your largest town (a third, rounded down). |
| The Managed Wild | add: proposed | 1 | `pays` city count `tilesInBorders`, `within: 'city'`, tile `tended`, food `percent: 5`, `stage: city`, `max: 5`. `needsTendedWork`. |

## Tier IV

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Land's Great Work | modify: as built | 2 | A count of your towns that a scope admits (`populationAtLeast` 8), readable by `productionBonus`. One shape with The Great Aqueducts and The Imperial Highways. |
| The Heartland | modify: deferred | 2 | A goal that one town meets, a lasting mark on that town, and the zero-cost meter rule (with The Imperial Roads). The +3 happiness and +20% food read the mark. |
| The Master of Works | modify: as built | 2 | A rider on the engineer's act in the Opus town that adds the production per turn of each of your towns with a manufactory. Drop the +50% amplifier. |
| The General Levy | modify: as built | 2 | The levy mark (with The Trained Bands), and `upkeepRebate` `free`, `where: 'ownTerritory'`, narrowed to units its levy raised. |
| The Great Migration | modify: deferred | 2 | A phase every ten turns that moves a citizen from a foreign town to your nearest town. "Happier" needs a reading (see ambiguities). |
| The Encroaching Fields | modify: deferred | 2 | A phase every ten turns that moves one hex from a foreign town's borders into your town's. |
| The Domesday Survey | modify: as built | 2 | A commission reward paid to every town, each from its own figure (D3's every-town delivery, with the figure read for each town). |
| The Two Harvests | modify: deferred | 3 | A tended work beside an improvement (see Borderline, item 6). |
| The Great Aqueducts | add | 2 | The towns-a-scope-admits count (`hasBuilding` aqueduct) on `productionBonus`, `building: theMagnumOpus`, `percent: 5`, `max: 8`. |
| The Imperial Highways | add | 2 | The same count with scope `connected`, `percent: 3`, `max: 15`. |
| The Keeps | add | 2 | A `townKeep` improvement row, opened while the card is seated. A refusal for a second Keep in a town, a hex line that copies the yields of the hexes around it, and a +5 defence line for units on it (see Borderline, item 5). |
| The Theodosian Walls | add | 1 | `cityStat` defense 1, count `population`, `per: 2`. |

## Shared with another deck

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Frontier Militia | add (Dominion) | 2 | A unit grant on `foundingRider` (best melee). D5's unit grants are the same family. The row goes in `common.json`. Moved to E5, after D5. |
| The Farming Garrisons | add (Dominion) | 2 | Dominion's D7 shape: a tile test "a fortified military unit of yours stands here", and its yields-lens fingerprint. The +2 is `combatLine` `fortified`. The row goes in `common.json`. **Built by Dominion batch D7**, not by an E batch. |
| Hydraulic Schools | modify: revised | 1 | `productionBonus` building, category science, 20, scope `hasBuilding` aqueduct. `pays` city count `population`, `within: 'city'`, science 1, `per: 3`, scope `all` [`hasBuilding` aqueduct, `mountainAdjacent`]. The Scientific sheet already carries this text. |
| Garden Cities | modify: deferred | 1 | `pays` city count `workedUnimprovedTiles`, culture 1, `per: 3`, `max: 3`, scope `hasBuilding` monument. `happiness` 1 per town, scope `all` [`populationAtLeast` 8, `hasBuilding` aqueduct]. Drop `deferred`. The Magisterial sheet already carries this text. |

## Borderline: the calls

1. **Raising a hex (The Marl Pits, The Deep Workings): deferred.**
   - A worker's build always replaces what stands on the hex (`buildImprovementAt`). A marl keeps the farm and adds to it, so it cannot be an improvement row.
   - It needs a new worker order (a new command, and a new line in the worker's panel with a new meaning) and a lasting record on the hex that stacks to two. That is a new action under the user's rule.
   - **Question:** "Should a worker marl a farm or pasture, and deepen a mine, quarry or lumber mill, with a new order in its panel that spends a charge and keeps the improvement? Or should the bonus come by itself, for example after the improvement has stood for some turns?" The second answer makes both cards automatic, close to Old Workings and The Forest Keepers.
2. **Workable mountains (The Mountain Terraces): automatic, group 2.**
   - The text names no worker and no improvement. Mountains are refused in one place (`isWorkableTile`, one caller), and a rule there makes them workable for the seat.
   - The player places citizens with the city screen's tile locks, which exist. The citizen governor also places them.
   - The yield is the card's hex line, because a mountain yields nothing of its own.
3. **New levy uses (The Work Gangs, The Colonists, The Builders' Levy, The Terraces of Moray): group 2.**
   - The levy menu shows one line for each use a held card grants. A new use adds a line beside the others, with the card's name under it. The player does the same thing as today: press a line, and a citizen leaves.
   - The code needs new words in an existing menu (`labelFor`, `sourceWords`), not a new control.
   - The Builders' Levy needs a target town. If a rule picks it and the line names it, there is no new choice (ambiguity 9). If the user wants the player to pick among several towns, the card is deferred.
4. **"Needs a levy" and a town's largest size: automatic, group 2.**
   - The gate is a deal rule, the twin of `needsTendedWork`, read in `eligibleFor`. The player sees nothing new: a card is not dealt until the seat holds a levy.
   - The largest size is a record on the town and a moment when it rises. Nothing asks the player anything.
5. **The Keeps: group 2.**
   - The worker's panel lists every improvement row the seat may build, and the tended-work charters already add rows to it. A Keep is one more row.
   - "One in each town" is a refusal sentence in `improvementErrorAt`, shown the way every refusal is shown. It is not a new control.
   - The copied yield and the +5 line are automatic.
   - One shape is new: a seated card that opens an improvement row (the tended works open on draft). The Polders and Outposts need it too.
   - Map art: a Keep, a polder and an outpost each need a placeholder piece, and each joins the flair gallery in the batch that ships it (CLAUDE.md). That is art work, not a UX decision.
6. **The other calls:**
   - **The Polders, Outposts and The Garden Frontier:** group 2, for The Keeps' reason. They are rows in the worker's panel, or wider rules for rows already there.
   - **The Fish Traps' lake half:** group 2. It needs a move rule, not a new control.
   - **Veteran Colonies:** group 2. "Retire" is the existing disband button ("Let this unit go"), used inside a town.
   - **The Breadbasket:** group 2. "Told to stop growing" is the existing avoid-growth focus.
   - **The Two Harvests: deferred.** The existing build line replaces an improvement, and this card makes a tended work go beside one, so the same line would do two different things. **Question:** "How does a player add a tended work to a farm, mine or lumber mill without replacing it: a separate line in the worker's panel, or the same line with a warning while the card is held? And how does a hex with both works look on the map?"
   - **The Beating of the Bounds: deferred.** "Of your choice" is a choice when the card fires. **Question:** "Should the player pick the extra hex on the map after founding (a new prompt), or should the game keep picking it (the hex the borders would grow into next) and the text drop 'of your choice'?" The second answer needs only a text change.
   - **Public Works: deferred.** A great engineer has one act today, Rush the Works. **Question:** "Should Public Works fold into The Raising of the Land and be cut (the sheet's recommendation), or does the engineer get two new acts, which needs a way to choose between them when the act is spent?"

## Plan for the types

**What E0 writes.**
- `type` on every row of `data/decks/expansionist.json` that the sheet lists, from the sheet's Type column. Retired rows stay untyped. Each new row takes its type when it is built.
- `type` on the nine shared rows in `data/decks/common.json` that have none yet: Market Gardens (Economic), Sacred Groves (Civic), The Flood Festival (Civic), Hydraulic Schools (Civic), Garden Cities (Civic), The Grain Exchange (Economic), The Provincial Fair (Economic), Garden Provinces (Civic) and The Sculpted Landscape (Civic). The user made these final (*"we can confirm any shared cards now yes"*). The five rows shared with Dominion already carry the same types.

**What changes in play.**
- An Expansionist card fits only a chair of its own type or a Wildcard chair. A Wildcard card fits only a Wildcard chair. No unsorted card is left in the deck.
- The deck is mostly Economic (82 of 122 cards), so it suits councils with two or more Economic chairs: Council of Elders, Republic, Merchant League and Estates.
- The nine shared rows also fit only their own type in Commerce, Devotion, Scientific and Magisterial seats. No test of those decks reads these rows' types, and their sheets already carry the texts.

**Tests that assume unsorted Expansionist cards.**
- `test/sim/decks/expansionist.test.ts`: it checks a type only where the data row carries one. After E0 it checks every listed row. Its header comment and the sheet's header line ("In play the deck is still unsorted") change. Its retired count goes from 31 to 33.
- `test/sim/decks/dominion.test.ts`, "types only the rows its sheet lists, and leaves every other row unsorted": it fails as soon as an Expansionist row or one of the nine shared rows carries a type. Change it to "a row carries a type only if a sorted sheet lists it" (Dominion's and Expansionist's), and drop `expansionist` from its loop over the other deck files.
- `test/sim/typedChairs.test.ts`, `test/sim/statecraft.test.ts`, `test/sim/cardImpact.test.ts`, `test/sim/aiWar.test.ts`, `test/sim/growingOrders.test.ts` and `test/ui/statecraftStaging.test.ts` pick unsorted rows from the generic table or other decks, or name generic rows. They should still pass. E0 runs the core tier to confirm.
- Helpers that write `sc.slots` directly (for example `test/ui/levyMenu.test.ts`) do not check fit, so they are not affected.

**The bots.** No code change is needed.
- The bot seats cards through `slotOrderError`, which refuses a chair that does not fit.
- It scores each government by how many held cards fit its chairs (`adoptionTable`), and it values a card through the chair it would take (`chairFor` in `value.ts`). An Expansionist bot will move toward Economic councils by itself.
- Bot games that seat Expansionist cards change, so the explore digest (`test/sim/explore.test.ts`) and the bot digests (`test/sim/aiDigest.slow.test.ts`) move. Re-pin them with the D batches' control-run method: run with the types alone first, then add the cards.

**Saves.** Types now decide which seat commands are legal, so an old log can replay differently. The retirement of the old Keep building is a schema bump of its own (the `BuildingDef.retired` docblock). E0 bumps the schema once for both.

## Shapes from Dominion's batches

**Where the Dominion batches stand.** D0 to D6 and C1 to C3 are on `decks`. D2 (`a4f52a0f`) and D3 (`a9819193`) were built on `d2-work` and merged with C3 in `e9fed7be` and `8dd634d1`. D4 was merged into E1 (`8a826225`), and D5 and D6 into E2 and E3. D7 is not built. The E batches edit the same statecraft files as the D batches, so the two series cannot run side by side.

**Built shapes the E batches use:**
- **D1:** the levy's town `scope` (The Terraces of Moray) and `unitStamp` `rank` (The Trained Bands).
- **D3:** grant delivery. The Domesday Survey pays every town, each from its own figure. The Builders' Levy finds its town with D3's reading of "nearest" (ties go to the earlier town).
- **C3:** nothing new. The deck has no Doctrines yet.
- **D4:** the scoped zero-cost meter rule (The Proconsuls): a `meterRule` of `rule: 'cityCost'` with `value: 0` and a town `scope`. Used by The Imperial Roads and The Heartland.
- **D5:** the best-melee unit grant: `unit: 'bestMelee'` on a grant, raised by `raiseFreeUnit(state, city, 'bestMelee')` (`cities.ts`). Used by The Frontier Militia.
- **D6:** the citizens reward (`CommissionReward.citizens` with `citizensTo`; `{ smallest: 3 }` sends them to the three smallest towns, as The Wide Country needs). The town that met a goal is `commissionGoalTown` (`commissions.ts`), the one reading of "that town" for a reward. `CommissionReward.building` builds there, and `fromGoal` scales a reward by what the goal kept (`commissionGoalMeasure`). The Heartland's goal, which one town meets by a figure, names its town through `commissionGoalTown` too.

**Dominion shapes not built yet (D7) that Expansionist cards need:**
- **D7:** the disband moment (The Legions' Labour), used by Veteran Colonies. The food-to-hammers transfer (The Laws of Lord Shang), used by The Breadbasket. The fortified-unit hex test, used by The Farming Garrisons, which is now shared. D7 has landed (`825a98cc`) and built The Farming Garrisons. E6 built The Breadbasket and Veteran Colonies on D7's shapes.

**The rule:** build each shape once. If D4 to D7 run first, the E batches reuse their shapes. If an E batch runs first, it builds the shape and the D batch reuses it. The batch that builds a shared shape names it in its report.

## Proposed build batches

Every batch edits `src/sim/statecraftData.ts`, `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts`, `data/decks/expansionist.json`, `docs/decks/expansionist.md` and `test/sim/decks/expansionist.test.ts`. Most also touch `test/fixtures/cardText.json`, `docs/orders-and-doctrines.md` (it lists every live Order) and the digests. The batches cannot run side by side: land each one before the next starts.

**E0, the types and the data (37 cards):**
- **Built, 2026-10-16** (schema 134). Beyond the plan, four describers changed so that the new cards read correctly: a distance of zero prints as "while standing in" (The Stationes), an age with no work named prints "with a work that has stood" (The Old Fields, and The Inheritance of Fields with it), a count over every hex drops the "improved or unimproved" words (The Quitrents), and a retired building prints as a plain name with no link.
- **Types:** as in "Plan for the types".
- **Retirements:** The Forest Gardens and Daughter Towns (`modify: cut`).
- **The old Keep building, ruled by the user** (*"yup, retire the old building"*): set `retired: true` on `keep` in `data/buildings.json`. What it touches:
  - **The Compendium** hides a retired building, so the old Keep's page goes. Only the retired The Vigil Charter opens the building, so no live card loses anything.
  - **Saves:** the row stays in the table, because `buildingDef('keep')` must resolve for a town that already holds one. That town keeps its +25 hit points and its +5 healing.
  - **Tests that name the building** read its effects directly, so they should still pass: `test/sim/charters.test.ts` (the Keep test), `test/sim/aiAppraisal.test.ts` (the mending price), `test/sim/statecraft.test.ts` (`words("keep")`) and `test/fixtures/cardText.json` (the `keep` entry). `healsAdjacent` then has no live row. Nothing pins it, but `test/sim/aiAppraisal.test.ts` is its only test.
  - **The new improvement's id** is not `keep` (see E4).
- **Data-only cards:**
  - Tier 0 (5): The Forest Gardens, The Ambarvalia, The Rope Stretchers, The Pyramid Builders, The Road Home.
  - Tier I (10): The Burning Season, Daughter Towns, Six Gardens, The Forest Keepers, The Plough Teams, The Polis, The Public Fountains, The Wild Marches, The Quiet Provinces, The Road Towns.
  - Tier II (8): The Highlands, The Tended Country, The Old Fields, The Hedgerows, The Great Households, The Harbour Cities, The Milestones, The Teeming Realm.
  - Tier III (11): Old Workings, The Manors, The Royal Forests, The Megalopolis, Plenty, The Mill Wheels, The Quitrents, The Hallowed Woods, The Assay Office, The Stationes, The Managed Wild.
  - Tier IV (1): The Theodosian Walls.
  - Shared (2): Hydraulic Schools, Garden Cities.
- **Files beyond the shared six:** `data/decks/common.json`, `data/buildings.json`, `SCHEMA_VERSION` and the tests that pin it (fourteen in D3), `test/sim/decks/dominion.test.ts`, `test/sim/decks.test.ts` if it pins row counts, and the two digests.
- **Optional:** deferred data rows for The Marl Pits and The Deep Workings, as Dominion's plan gives Rally to the Standard, so the Compendium shows them with their reason. Otherwise they stay `add` on the sheet.

**Shape batches (group 2, 53 cards), in the suggested order:**

| Batch | Cards | New shapes | Files beyond the shared six |
|---|---|---|---|
| **E1, levies (12)** | The Labour Feasts, The Gleaners, Seasonal Levies, The Labour Rolls, The Mit'a, The Slack Season, The Trained Bands, The General Levy, The Work Gangs, The Colonists, The Terraces of Moray, The Builders' Levy | the "Needs a levy" gate; four levy uses (a worker, a settler, science, a wonder in another town); a lifetime record of citizens levied and its count; a mark on units a levy raises (a Veteran stamp, free upkeep in your territory); a return turn on the town and its phase step; a slack-turn rule | `levies.ts`, `src/ui/levyMenu.ts` and its test, `statecraft/draft.ts` (`eligibleFor`), `state.ts`, `turn.ts`, `cities.ts` (the unit stamp), `upkeep.ts` |
| **E2, moments, records and counts (10)**: built | The Grain Census, The Freedom of the City, The Great Colonies, The Topping Out, The Tax Rolls, The Opening of the Roads, The Imperial Highways, The Land's Great Work, The Great Aqueducts, The Book of Settlements | a town's largest size and its moment (tally and occasion); a founding population from the largest town; population on the completion facts; a census occasion for every empire; a "first joined to the capital" moment and stamp; a count of towns a scope admits, readable by `productionBonus`; a count over `citiesFounded` | `cities.ts` (growth, `foundCityAt`, completion), `census.ts`, a new `roadJoinings.ts` (the phase, over `connectedCities`), `turn.ts`, `state.ts` |
| **E3, the land (10)**: built | The Coming of the Water, The Raising of the Land, The Watercourses, The Water Courts, The Landscape Garden, The Prospectors, The Age of Improvement, The Mountain Terraces, The Common Domain, The Woodland Bands | a lasting hex mark; water passed along farms (one step from a river; chains from fresh water); a "beside a wonder town" tile test; a record of who surfaced a seam; an Order hex-line amplifier with a tile test; workable mountains; a work radius for each town; a woods move rule | `yields/hex.ts`, `map.ts` (a new mutable tile field, or a field changed; CLAUDE.md's list of them grows), `improvements.ts` (prospect, the Irrigation renewal), `cities.ts` (`isWorkableTile`, the radius), `pathfind.ts` (`tileMoveCost`), `src/ui/controls.ts` (`workRadiusCells`), the yields-lens fingerprints in `src/render3d/` |
| **E4, works, claims and borders (10)**: built | The Keeps, The Polders, Outposts, The Garden Frontier, The Fish Traps, The Staked Claims, The Wide Country, The Encroaching Fields, Migration, The Great Migration | a seated card that opens an improvement row; three rows (Keep, polder, outpost) with placement rules; building beyond your borders, and the claim on completion; the Keep's copied yield and defence line; the polder's grassland-farm yield; workers on lakes; a claim radius at founding; a hexes-claimed tally and a citizens reward to the smallest towns; three phases every ten turns that move hexes or citizens | `improvements.ts`, `improvementData.ts`, `data/improvements.json`, `yields/hex.ts`, `combat.ts` (`planCombat`), `pathfind.ts`, `cities.ts` (claims), `commissions.ts`, `turn.ts`, `src/render3d/` (three pieces), `src/flairGallery/` |
| **E5, meters, commissions and Dominion's shapes (8)**: built | The Sovereign Writ, The Imperial Roads, The Heartland, Commission: Break the Sod, The Domesday Survey, The Master of Works, The Burhs, The Frontier Militia (moved from E2) | a founding unit grant (D5's best-melee unit); an authority ladder with no top; the scoped zero-cost meter rule (D4); a goal one town meets and a lasting mark on it; an improved-only commission figure; a reward for every town from its own figure; a rider on the engineer's act that sums the manufactory towns' production; a defensive-building production filter | `meters.ts`, `commissions.ts`, `greatPeople.ts` (the act), `cities.ts` (`foundCityAt`), `state.ts`, `common.json`, and Dominion's sheet and test (The Frontier Militia is shared) |
| **E6, after Dominion batch D7 (2)**: built | The Breadbasket, Veteran Colonies | the food-to-hammers transfer (D7's, for The Laws of Lord Shang); the disband moment (D7's, for The Legions' Labour) | `cities.ts` (the growth channel), `commands.ts` (disband). The Farming Garrisons, the third card that needed D7, was built by D7 |

**Overlaps and order:**
- `cities.ts`: E1, E2, E3, E4, E5. `turn.ts`: E1, E2, E4. `yields/hex.ts`: E3, E4, E5. `improvements.ts` and `pathfind.ts`: E3, E4. `commissions.ts`: E4, E5. `combat.ts`: E4, E5. `state.ts`: E1, E2, E3, E4.
- E0 goes first. D2 and D3 are already merged, so no E batch waits on them.
- E1's returned citizen goes through `settlePopulationWindfall`. E2's largest-size record hooks that seam, so the record sees the return whichever batch lands first.
- E3 goes before E4: the Keep copies hex yields, and E3 changes the hex fold (marks and water).
- E4's The Wide Country counts outposts, which E4 builds in the same batch.
- E5 holds the cards that need D4, D5 or D6 shapes. The same holds for E4's The Wide Country (D6). The Frontier Militia was in E2 and moved to E5, because Dominion batch D5 builds its unit grant and was being built when E2 ran. The two cards that need D7's shapes moved to E6, which runs after D7 lands.
- The Frontier Militia and The Farming Garrisons live in `common.json` and on both sheets, so their batches also edit `docs/decks/dominion.md` and `test/sim/decks/dominion.test.ts`.
- The five group-3 cards keep their sheet rows. Public Works and The Two Harvests already have deferred data rows. The Beating of the Bounds stays as built until the user answers.

## Rule ambiguities, with a recommended reading

1. **Wild hexes** (The Wild Marches, The Hallowed Woods, The Labour Feasts, Garden Cities). **Recommend:** the `unimproved` test, as The Old Songs reads "wild" today: bare land, water, mountains, town centres and tended works. A land-only reading needs a new tile test.
2. **Improved hexes** (The Ambarvalia, The Plough Teams, The Manors, The Age of Improvement, Break the Sod). **Recommend:** the `improved` test: any improvement except a tended work, great-person works included. So Break the Sod needs its own figure.
3. **Works** (The Old Fields). **Recommend:** every improvement in your borders, tended works and great-person works included, aged from `Tile.improvedOn`.
4. **Farms** (The Hedgerows, The Watercourses, The Water Courts, The Coming of the Water). **Recommend:** the farm row only, as the deck's built rows read it. Smallholdings also reads terraces and pastures; say if terraces should count here.
5. **"Needs a levy".** **Recommend:** the seat owns, seated or not, a card with a `levy` effect that names a use: Levy of the Land, The Corvée, The General Levy, The Muster of the Fields, Dominion's The Devshirme, and the four new uses. The gate is checked when the card is dealt, as the tended-land gate is.
6. **A town's largest size.** **Recommend:** the record starts at the founding size. It rises with any gain: growth, a population grant or a returned levy. A captured town keeps its record. The moment fires when the record rises, not on every growth.
7. **The Freedom of the City.** **Recommend:** each size pays once, when the record first reaches it. A town captured above a size pays nothing for that size.
8. **The Grain Census.** **Recommend:** the production lands in the capital, as The Captive Craftsmen pays it. The gold goes to the treasury.
9. **The Builders' Levy: which wonder.** **Recommend:** the nearest other town of yours whose front row is a world wonder (ties go to the earlier town). The line names that town. If no other town is building one, the line does not show.
10. **The Work Gangs and The Colonists.** **Recommend:** both share the town's one levy wait, as every use does. The unit appears in the town, as a mustered unit does.
11. **The Slack Season.** **Recommend:** the world calendar (every turn divisible by twenty), as the periodic musters use. On that turn the wait is lifted for every use, but a town-size floor still applies. A levy taken then starts the normal wait again.
12. **The Mit'a.** **Recommend:** a levy spent while the card is seated writes the return turn on the town. The citizen returns even if the card has left by then. It returns as a population windfall: no growth riders, but it counts for the largest size. It is lost if the town changes hands.
13. **Units raised by a levy** (The Trained Bands, The General Levy). **Recommend:** the mark records the use that raised the unit. The Trained Bands makes military units Veterans, from any levy. The General Levy's free upkeep covers only units its own levy raised, and only inside your borders.
14. **The Great Colonies.** **Recommend:** the new town starts with the greater of its usual size and a third of your largest town's citizens, rounded down. The Seed Grain's citizen adds on top. "Largest" means the largest town now, not the record.
15. **The Staked Claims.** **Recommend:** every unowned hex within two hexes of the new town's centre. A hex another empire owns is left alone.
16. **The Topping Out.** **Recommend:** world wonders only.
17. **The Tax Rolls.** **Recommend:** each empire holding the card gains gold equal to five times its citizens on the census turn, as a windfall, so no gold percentages apply.
18. **The Opening of the Roads.** **Recommend:** a town is first joined on the first turn `connectedCities` reaches it while you own it. The stamp records the owner, so a captured town can pay its new owner once. A town joined at its founding (The Road Home) pays at once.
19. **The Opus counts** (The Land's Great Work, The Great Aqueducts, The Imperial Highways). **Recommend:** count your towns, the capital included for the first two. The capital never counts for The Imperial Highways, because the `connected` scope never admits it.
20. **The Mountain Terraces.** **Recommend:** while the card is seated, citizens may work the mountains in their town's borders. When the card leaves, they move at the next citizen assignment.
21. **The Common Domain.** **Recommend:** a town of ten or more citizens may work owned hexes one ring beyond the work radius. When it falls below ten, it releases them at the next assignment.
22. **Water along farms.** **Recommend:** one reading of "watered farms" for each empire, built once for each sweep (as `zocField` is).
    - The Water Courts: a farm joined by an unbroken chain of your farms to a farm on fresh water counts as on fresh water for every question (the Irrigation upgrade, farm placement, cards).
    - The Watercourses: a farm beside a river farm counts as on fresh water and gains +2 production (river only, one step). The river farm gains the +2 too, as built.
23. **Lasting marks** (The Coming of the Water, The Raising of the Land). **Recommend:** the mark is on the hex and pays whoever works it. It pays while the hex holds a farm (The Coming of the Water) or any improvement or tended work (The Raising of the Land). A hex is raised once, so a second act in the same town raises only hexes not yet raised. The Coming of the Water marks the farms that stand when the Aqueduct is finished, not later ones.
24. **The Age of Improvement.** **Recommend:** it doubles the hex lines your Orders pay on improved hexes (not tended works, not the town centre). Town lines that count improved hexes (The Manors, The Plough Teams) are not doubled, and neither are charters or Doctrines.
25. **The Landscape Garden.** **Recommend:** "beside a wonder" means beside the centre hex of a town that holds a world wonder.
26. **The Prospectors.** **Recommend:** the bonus pays on a seam your empire surfaced, wherever the hex now lies inside your borders.
27. **The Fish Traps.** **Recommend:** a worker of a seat that holds the charter may enter a lake hex as if embarked. No other unit may. The Floating Gardens' lake half stays as it is. **Replaced by the lake fix (L1)**, the user's ruling of 2026-10-16 (`docs/flags.md` (wwwwww)): a lake is water like the coast for every unit. A worker reaches a lake embarked, with Sailing, as it reaches the coast, and the charter only opens the row. E4's rule (`MoveProfile.wades`, the row field `workersWade`) is removed.
28. **The Woodland Bands.** **Recommend:** all your land units, civilians included, pay the open-ground cost in forest and jungle. The +2 strength is a defence line, because combat conditions read the contested hex. An attack from the woods needs a new condition that reads the attacker's hex.
29. **The Stationes.** **Recommend:** a defence line, for the same reason. The capital does not count, because the `connected` scope never admits it.
30. **The Burhs.** **Recommend:** "defensive buildings" are the ones the `defensiveBuildings` count reads (a building that raises a town's defence or hit points). The defence counts everything that count counts. The production bonus applies to buildings, not to wonders.
31. **The Keeps.**
    - **Seated or charter.** **Recommend:** seated, as the text reads (it has no "Once drafted" and no "No chair required"). While the card is seated, workers may build Keeps. A Keep already built keeps its yield and strength when the card leaves. The Polders and Outposts work the same way.
    - **"One in each town".** **Recommend:** at most one Keep inside each town's borders, checked when a worker builds. A town that gains a second Keep through a border change keeps both.
    - **The copied yield.** **Recommend:** the six hexes around the Keep, each as your empire reads it (improvements and Order lines included). Count only hexes inside your borders, and never a town centre or another Keep. The Keep pays only while a citizen works it, like any hex.
    - **The +5.** **Ruled** (see reading 63): a defence line for any unit that defends the Keep's hex, the owner's or an enemy's, beside the citadel's and read by the same line.
    - **The id.** **Recommend:** `townKeep`, shown as "Keep". The retired `keep` building must keep resolving, so the two ids must differ.
32. **The Polders.** **Recommend:** "touches at least three of your land tiles" means at least three of its six neighbours are land hexes inside your borders. The hex yields grassland's base yield plus the farm row's, with renewals only where they need no fresh water. Cards that name farms do not read a polder. The hex stays water.
33. **Outposts.** **Recommend:** built on an unowned hex with no improvement, up to three hexes beyond your borders. It claims its hex and the six around it that nobody owns, for your nearest town. "Costs no authority" needs no code, because hexes cost no authority. A town founded on the outpost takes those hexes.
34. **The Garden Frontier.** **Recommend:** tended works may go on unowned hexes up to two hexes beyond your borders. The hex joins your nearest town when the work is finished. A hex a rival owns is never taken.
35. **The Wide Country.** **Recommend:** the tally counts hexes your empire claims while the card is seated, by an outpost, by clearing a camp (The Barbarian Frontier's claim, the `campClaimsGround` rule) or by buying. The reward gives two citizens to each of your three smallest towns (ties go to the earlier town).
36. **Migration.** A town has no happiness of its own, so "at its happiness limit" has no meaning in the game. **Recommend this reading, for the user to confirm:** every ten turns, while your spare happiness is zero or below, your largest town sends one citizen to your smallest town joined to the capital. If the user wants another meaning, the text needs a rewrite first.
37. **The Great Migration.** **Recommend:** "happier" means your spare happiness is higher than the other empire's, and "room to grow" means your spare happiness is above zero. Every ten turns, each town of a real empire within three hexes of your border, with at least two citizens, loses one to your town nearest it.
38. **The Encroaching Fields.** **Recommend:** "next to it" means the two towns' borders touch. The hex taken is the unworked foreign hex beside your town's borders that is nearest your town's centre (ties go to the lower hex index), never a town centre. It changes hands with whatever stands on it.
39. **The Sovereign Writ.** **Recommend:** +10% for every five points of spare authority, for production and border growth, with no top rung. Deficits do not change.
40. **The Heartland.** **Recommend:** the goal is checked at the end of each turn. "Yield 5 or more in total" is the hex's six yields added together as worked. If several towns qualify on the same turn, the one with the most such hexes wins (ties go to the earlier town). The reward is a lasting mark on the town, lost if the town changes hands.
41. **The Breadbasket.** **Recommend:** while a town avoids growth, its food surplus, as the growth channel computes it, is added one for one to its production as its own labelled line, after the percentages. Its food basket gains nothing that turn. This is Dominion's reading 18 for The Laws of Lord Shang.
42. **Veteran Colonies.** **Recommend:** disbanding a military unit on one of your town hexes pays that town food equal to the unit's production cost, as a growth windfall. A free unit (`freeUpkeep`) pays nothing, as Dominion reads The Legions' Labour.
43. **The Master of Works.** **Recommend:** each of your other towns with a manufactory inside its borders adds its production per turn, as the city panel shows it, to the Opus as one lump.
44. **The Domesday Survey.** **Recommend:** each town gains five times the improved or tended hexes it works, into its own front row. The great engineer stays as built.
45. **The Frontier Militia.** **Recommend:** Dominion's reading 2. A unit a card raises for free costs no upkeep, and the text says so ("It costs no upkeep").
46. **The Farming Garrisons.** **Recommend:** Dominion's reading 25 (a fortified garrison counts for the town's centre hex). The +2 applies in attack and defence while the unit is fortified.
47. **The Work Gangs and The Colonists: trained or not, and which row.** (E1) **Applied:** a worker or settler a levy raises is gained, not trained, like The General Levy's conscript: it pays the cards for a unit gained, but it does not climb the escalation ladder or count toward the trained tally. Only The Muster of the Fields' unit counts as trained, because its text says so. The row raised is the first worker or settler row the empire can build, read by its model class, so a leader's own worker would be the one raised.
48. **The Builders' Levy: the Magnum Opus.** (E1) **Applied:** the Opus is not a world wonder (its row has no wonder mark), so this levy never sends hammers there; The Corvée does. "Nearest" is by hex distance from the levying town, and a tie goes to the town founded first, as D3 reads "nearest".
49. **The Terraces of Moray: how the science lands.** (E1) **Applied:** banked at once into the empire's research, as a one-time grant, so no science percentages apply.
50. **A town's largest size: one moment for each citizen.** (E2) **Applied:** when a gain takes a town more than one citizen past its record, the moment fires once for each new size, in rising order. So The Grain Census counts each citizen past the record, and The Freedom of the City still pays at fifteen when a grant takes a town from fourteen to sixteen. A town founded at a larger size (The Great Colonies, The Seed Grain) starts its record there, and nothing pays for it.
51. **The Grain Census: what "starts at +2" pays.** (E2) **Applied:** +2 gold to the empire and +2 production in the capital, the way The Campaign Annals and The Captive Craftsmen pay, with the counted +1 of each on top.
52. **The Topping Out: which population.** (E2) **Applied:** the town's size at the moment the wonder is finished. The hammers land in that town.
53. **The Opening of the Roads: when the check runs.** (E2) **Applied:** once a turn, in a new end-of-turn phase before `collectYields`, over every real empire still in the game. A town joined during a turn is paid at the end of that turn, a town founded with a road home included. The record of joinings is written whether or not the owner holds the card, so a card seated later pays nothing for towns joined before it. The record keeps every owner it has paid, so a town that comes back to an owner it already paid pays nothing again.
54. **The Tax Rolls: whose citizens.** (E2) **Applied:** every town's citizens summed, the census's own figure. The occasion pays every empire still in the game, so another card that pays food or production on a census would land it in the capital.
55. **A rider narrowed to a town's size says the size.** (E2) **Applied:** "a city reaching 15 citizens for the first time". Before E2 the words left the size out, so the retired First Fruits printed "a city growing" and now prints "a city growing to 2 citizens".
56. **The Woodland Bands: one line, read off the hex the piece stands on.** (E3) **Applied:** the strength is one `combatLine` with a new condition, `standingIn` (forest, jungle), which reads the hex the piece stands on: the contested hex for a defender, the piece's own hex for an attacker. With `side: 'defend'` it is the defence line of reading 28. If the user wants attacks from the woods too, the row's `side` becomes `both` and nothing else changes. The move rule removes a feature's own movement price, which only forest and jungle carry, so a hill keeps its climb.
57. **The Prospectors: a new record.** (E3) **Applied:** `Tile.surfacedBy`, the empire whose survey struck the seam, written once when the vein turns into a resource. A barren survey writes nothing. The vein layer is shelved (`veins.share` is 0), so no seam surfaces on any board today, and the card pays nothing until the layer comes back.
58. **Farm water: where it starts and what reads it.** (E3) **Applied:** "your farms" are the farm hexes inside your borders, of any of your towns. The Watercourses' water starts at your farms with a river edge (a lake or an oasis gives fresh water but is not a river) and reaches the farms beside them; The Water Courts' water starts at your farms on any fresh water. The Irrigation renewal, the farm's placement on dry ground (desert, tundra, snow, a hill) and the cards' own fresh-water test read it. A town's fresh water and a fight's still read the map, because neither is a question about a farm.
59. **The Landscape Garden: whose wonder.** (E3) **Applied:** any town that holds a world wonder, whoever owns it. The Magnum Opus is not a world wonder.
60. **The Common Domain: what the reach covers.** (E3) **Applied:** the town's reach bounds the hexes it works and the hexes it may buy, so a town of ten may buy and work a fourth-ring hex, priced as the third ring's. Its borders still grow by culture only to the third ring (`cities.claimRadius` is 3, the same as the work radius), so without buying, a fourth-ring hex is the town's only through a claim (a cleared camp, a great person's work). The town-scoped counts of hexes in its borders still stop at the third ring, as they do for those claims today. **Question for the user:** should a town of ten also grow its borders one ring further?
61. **The Raising of the Land: which town.** (E3) **Applied:** the town where the engineer acted (the town it stands in, or the nearest one). Every rider on a great person's act now lands in the town where the act landed; before E3 they landed in the capital, and no live card paid food or hammers on an act.
62. **The Coming of the Water: bought or built.** (E3) **Applied:** an Aqueduct bought counts as finished, because a bought building is completed by the same routine.
63. **The Keeps: whose reading the copy takes, and the +5.** (E4) **Applied:** each hex around the Keep is read with the same context as the Keep's own hex, which is the town working the Keep. So that town's own lines (a Lighthouse's food on water) reach a copied coast hex. **The +5 is ruled** (the user, 2026-10-16: *"currently, do citadels work with enemy units? they should be consistent. We may want to change their behavior in the future, but for now just make them consistent"*):
    - the Keep and the citadel both help any unit that defends the hex, the owner's or an enemy's, and never an attacker;
    - they share one line (`ImprovementDef.defense`, read in `planCombat`), so a later change to one changes both.
64. **The Fish Traps and the floating gardens.** (E4) **Applied:** the lake rule is about movement, not the ground. A worker standing on a lake may lay any row the lake takes, so a seat holding The Fish Traps and Irrigation may also lay floating gardens there. Every other seat still cannot reach a lake, so the gardens' deferred half stands for them. **Ruled as built** (the user, 2026-10-16: *"floating gardens are different than fish traps, no? i'm confused by the question, but it seems fine to me"*). **Widened by the lake fix (L1):** a worker of any seat with Sailing may now stand on a lake, so any seat with Irrigation may lay floating gardens there. The gardens' deferred note is removed.
65. **Outposts: the founding, and the outpost's own worth.** (E4) **Applied:** a town founded on an outpost takes every hex within the outpost's claim that the town holding the outpost hex still holds, and the outpost goes: the town stands in its place. The outpost pays no yield of its own, because its worth is the ground it claims, and it counts as improved for the cards' tile tests.
66. **Migration: a smaller town, and no growth riders.** (E4) **Applied:** the largest town sends a citizen only when the smallest town joined to the capital has fewer citizens, so two towns of one size never pass a citizen back and forth. The citizen arrives with no growth riders, as a levied citizen comes home (reading 12), and it counts for the town's largest size. The sheet keeps Migration at "modify: as built", with a note on the row, until the user confirms reading 36.
67. **The ten-turn moves: the order.** (E4) **Applied:** every empire's happiness is read once, before anybody moves. Foreign towns are walked in founding order, and a town of one citizen gives nothing. "Within three hexes of your border" is measured from the foreign town's centre to the nearest hex you own. The Encroaching Fields walks a town's hexes over the whole owner array, so a hex claimed beyond the work radius is border too.
68. **The Garden Frontier: which works, and which hexes.** (E4) **Applied:** the tended works only, on unowned hexes with no work on them. The hex alone joins the nearest town, not the ring around it, and it does not count toward The Wide Country, whose goal names outposts, camps and buying (reading 35).
69. **The bots and the new rows.** (E4) **Applied:** the Keep and the polder join the bot's worker roster (`data/ai.json`), so a bot whose seated card opens one prices it through the simulation's own fold, as it prices a farm. Outposts and tended works stay off the roster, because their worth is a claim and the improvement plan does not price one.
70. **The Sovereign Writ: which rung.** (E5) **Applied:** the ladder's first bonus rung, read off the rule book (`rules.meters.tiers`: +10% at five points), is paid once for every step of its size, so fifteen spare points pay +30% and nineteen pay +30% too. Below the first rung nothing is paid, as before. The card face prints the rung's own figures, so a retuned ladder re-words the card.
71. **The Heartland: the floor, the town and the mark.** (E5) **Applied:**
    - "Yield 5 or more in total" is the hex's six yields added together as its town works it: the hex fold with the town's own context, before the town's percentages.
    - The town that met the goal is the one with the most such hexes at the end of the turn the goal is met, ties going to the earlier town (reading 40).
    - The mark answers only to the empire that set it. A town that changes hands loses the effects for its new owner, and it has them again if the marking empire takes it back.
    - The three effects are the fulfilled commission's lasting effects (`CommissionReward.lasting`), read for the rest of the game while the card stays out of its chair.
72. **Commission: Break the Sod: the reward.** (E5) **Applied:** the +3 food is a timed effect on the empire, in every town, for twenty turns. The free worker is trained in the capital free of upkeep, as every commission's unit is.
73. **The Domesday Survey: each town.** (E5) **Applied:** every town's figure is read before any town is paid. Each town's production lands in its own basket and settles at once, so it may finish the town's front row. A town that works no improved or tended tile gets nothing.
74. **The Master of Works: which towns, and how much.** (E5) **Applied:** "a town with a manufactory" is a town with a manufactory on a hex inside its borders (the `hasImprovement` town scope, read over the town's own hexes). "One turn of its own production" is the town's production per turn as its panel shows it, toward its own front row, rounded down. The act must happen in the town raising the Magnum Opus, and that town is left out of the sum.
75. **The Burhs: what counts.** (E5) **Applied:** a fortification is a building that raises a town's defence or its hit points (the palisade, the walls, the castle, the bastion), the one reading `isFortification` gives the count and the production bonus alike. The +100% reaches a fortification being built and never a wonder.
76. **The Frontier Militia: when the unit arrives.** (E5) **Applied:** the unit is raised once the town is finished, after the founding bounty and The Armed Colony's rank, standing in the town or on a hex beside it when the town's own hex has no room. It costs no upkeep (reading 45) and counts as gained (Dominion batch D5).
77. **The Breadbasket: which towns.** (E6) **Applied:** "a town told to stop growing" is a town whose Avoid growth tick is on (`City.avoidGrowth`), read by a new town scope, `avoidsGrowth`. A town that stops growing for another reason (unrest, the meters) does not count. The row names no category, so the surplus moves whatever the town builds. This is reading 41, through D7's `surplusToProduction` as D7 left it.
78. **The Breadbasket and the Avoid growth cap.** (E6) **Applied, for the user to confirm:** without a card, the tick moves the town's citizens off food until the basket gains nothing, so the town has no surplus left to move. That was the reason the card was deferred. So while a card moves a town's surplus into production, the tick does not move its citizens:
    - they stay where the town's focus puts them, the whole surplus becomes production, and the basket still gains nothing, so the town does not grow;
    - in a town whose other hexes pay much production, working them can pay more than the surplus does. The Production focus still puts the citizens there, so the player keeps the choice;
    - this reaches The Laws of Lord Shang too, in a town told to stop growing while it builds a military unit;
    - the bots never tick the box, so no bot game changes because of this rule.
79. **Veteran Colonies: retiring.** (E6) **Applied:** "retire" is the existing disband order (the unit panel's "Let this unit go" button), given to a military unit on the hex of one of your towns. The town gains food equal to what the unit costs your empire to build now (`unitCost`, the figure The Legions' Labour reads), as a growth windfall, so the town may grow at once. A unit raised for free pays nothing, and a unit a levy raised pays (Dominion's reading for The Legions' Labour). This is reading 42.

**Not yet ruled** (the sheet's "Still open" list, not ambiguities): the gap rule (the user builds the cards as written and reviews the rule later); the one-effect trims of 2026-10-13; the retirement of The Hydraulic Commonwealth's row; and Granary Levies' missing full stop. No batch touches them until the user rules.

## Counts

| | Group 1 | Group 2 | Group 3 | All |
|---|---|---|---|---|
| Tier 0 | 5 | 3 | 1 | 9 |
| Tier I | 10 | 9 | 1 | 20 |
| Tier II | 8 | 9 | 0 | 17 |
| Tier III | 11 | 20 | 2 | 33 |
| Tier IV | 1 | 10 | 1 | 12 |
| Shared | 2 | 2 | 0 | 4 |
| **All** | **37** | **53** | **5** | **95** |

The 95 are the sheet's 31 `modify` rows (two of them cuts) and 60 `add` rows, and the shared table's 2 `modify` and 2 `add` rows. The deck has no Doctrines yet. No card is left out: the user's later passes brought all four Military cards back into the build.
