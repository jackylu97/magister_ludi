# Batch E triage: the Expansionist `add` and `modify` cards

**Status:** written 2026-10-16 by a read-only triage agent, before any E batch. It is the plan for the user's ruling of 2026-10-16 (*"let's implement the expansionist deck, deferring any that require a new UX/user interaction"*, recorded at the end of `docs/plans/expansionist-builds.md`). The readings in "Rule ambiguities" are the ones the build will use unless the user changes them here. Mark any you disagree with, as on the deck sheets.

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
- **Land.** Mountains are refused in one place (`isWorkableTile`, one caller). The work radius is one constant (`CITIES.workRadius`), read in `cities.ts` and drawn by `workRadiusCells` in `src/ui/controls.ts`. A lake is "water nobody crosses at all" (`terrainData.ts`), so no unit can enter one.
- **Meters.** Happiness and authority are empire meters (`meters.ts`). A town has no happiness of its own. The tier ladder stops at its top rung (`tierClamp`).
- **Moments.** Growth passes the new population. Completion passes `wonder`, `building` and `firsts`, and no population. The census pays only its leader, through a Triumph (`runCensus`).
- **Other.** `cityStat` counts read the town's own count (Siegecraft's walls). A town's avoid-growth mark exists (`City.avoidGrowth`, set by `setCitizenFocus`). Combat conditions read the contested hex: in defence that is the unit's own hex, in attack it is the target's.

## Tier 0

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Forest Gardens | modify: cut | 1 | Retire the row (`retired: true`). Hexes already tended keep their gardens. |
| The Fish Traps | modify: as built | 2 | A move rule that lets a worker of a seat holding the charter enter a lake hex as if embarked. The coast half is built. |
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
| The Frontier Militia | add (Dominion) | 2 | A unit grant on `foundingRider` (best melee). D5's unit grants are the same family. The row goes in `common.json`. |
| The Farming Garrisons | add (Dominion) | 2 | Dominion's D7 shape: a tile test "a fortified military unit of yours stands here", and its yields-lens fingerprint. The +2 is `combatLine` `fortified`. The row goes in `common.json`. |
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

**Where the Dominion batches stand.** D0 to D3 and C1 to C3 are on `decks`. D2 (`a4f52a0f`) and D3 (`a9819193`) were built on `d2-work` and merged with C3 in `e9fed7be` and `8dd634d1`. D4 to D7 are not built. The E batches edit the same statecraft files as the D batches, so the two series cannot run side by side.

**Built shapes the E batches use:**
- **D1:** the levy's town `scope` (The Terraces of Moray) and `unitStamp` `rank` (The Trained Bands).
- **D3:** grant delivery. The Domesday Survey pays every town, each from its own figure. The Builders' Levy finds its town with D3's reading of "nearest" (ties go to the earlier town).
- **C3:** nothing new. The deck has no Doctrines yet.

**Dominion shapes not built yet (D4 to D7) that Expansionist cards need:**
- **D4:** the scoped zero-cost meter rule (The Proconsuls). Used by The Imperial Roads and The Heartland.
- **D5:** best-melee unit grants. Used by The Frontier Militia.
- **D6:** a citizens reward (Commission: Clear the Frontier), used by The Wide Country. A figure and a reward for the one town that met a goal (The Captured Marvel, Take the City), used by The Heartland.
- **D7:** the disband moment (The Legions' Labour), used by Veteran Colonies. The food-to-hammers transfer (The Laws of Lord Shang), used by The Breadbasket. The fortified-unit hex test, used by The Farming Garrisons, which is now shared and still on D7's list.

**The rule:** build each shape once. If D4 to D7 run first, the E batches reuse their shapes. If an E batch runs first, it builds the shape and the D batch reuses it. The batch that builds a shared shape names it in its report.

## Proposed build batches

Every batch edits `src/sim/statecraftData.ts`, `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts`, `data/decks/expansionist.json`, `docs/decks/expansionist.md` and `test/sim/decks/expansionist.test.ts`. Most also touch `test/fixtures/cardText.json`, `docs/orders-and-doctrines.md` (it lists every live Order) and the digests. The batches cannot run side by side: land each one before the next starts.

**E0, the types and the data (37 cards):**
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
| **E2, moments, records and counts (11)** | The Grain Census, The Freedom of the City, The Great Colonies, The Frontier Militia, The Topping Out, The Tax Rolls, The Opening of the Roads, The Imperial Highways, The Land's Great Work, The Great Aqueducts, The Book of Settlements | a town's largest size and its moment (tally and occasion); a founding population from the largest town; a founding unit grant; population on the completion facts; a census occasion for every empire; a "first joined to the capital" moment and stamp; a count of towns a scope admits, readable by `productionBonus`; a count over `citiesFounded` | `cities.ts` (growth, `foundCityAt`, completion), `census.ts`, `roads.ts` (`connectedCities`), `turn.ts`, `state.ts`, `common.json`, and Dominion's sheet and test (The Frontier Militia is shared) |
| **E3, the land (10)** | The Coming of the Water, The Raising of the Land, The Watercourses, The Water Courts, The Landscape Garden, The Prospectors, The Age of Improvement, The Mountain Terraces, The Common Domain, The Woodland Bands | a lasting hex mark; water passed along farms (one step from a river; chains from fresh water); a "beside a wonder town" tile test; a record of who surfaced a seam; an Order hex-line amplifier with a tile test; workable mountains; a work radius for each town; a woods move rule | `yields/hex.ts`, `map.ts` (a new mutable tile field, or a field changed; CLAUDE.md's list of them grows), `improvements.ts` (prospect, the Irrigation renewal), `cities.ts` (`isWorkableTile`, the radius), `pathfind.ts` (`tileMoveCost`), `src/ui/controls.ts` (`workRadiusCells`), the yields-lens fingerprints in `src/render3d/` |
| **E4, works, claims and borders (10)** | The Keeps, The Polders, Outposts, The Garden Frontier, The Fish Traps, The Staked Claims, The Wide Country, The Encroaching Fields, Migration, The Great Migration | a seated card that opens an improvement row; three rows (Keep, polder, outpost) with placement rules; building beyond your borders, and the claim on completion; the Keep's copied yield and defence line; the polder's grassland-farm yield; workers on lakes; a claim radius at founding; a hexes-claimed tally and a citizens reward to the smallest towns; three phases every ten turns that move hexes or citizens | `improvements.ts`, `improvementData.ts`, `data/improvements.json`, `yields/hex.ts`, `combat.ts` (`planCombat`), `pathfind.ts`, `cities.ts` (claims), `commissions.ts`, `turn.ts`, `src/render3d/` (three pieces), `src/flairGallery/` |
| **E5, meters, commissions and Dominion's shapes (10)** | The Sovereign Writ, The Imperial Roads, The Heartland, Commission: Break the Sod, The Domesday Survey, The Master of Works, The Breadbasket, Veteran Colonies, The Burhs, The Farming Garrisons | an authority ladder with no top; the scoped zero-cost meter rule (D4); a goal one town meets and a lasting mark on it; an improved-only commission figure; a reward for every town from its own figure; a rider on the engineer's act that sums the manufactory towns' production; the food-to-hammers transfer (D7); the disband moment (D7); a defensive-building production filter; the fortified-unit hex test (D7) | `meters.ts`, `commissions.ts`, `greatPeople.ts` (the act), `cities.ts` (the growth channel, `productionModifiers`), `commands.ts` (disband), `yields/hex.ts` and its lens fingerprint, `combat.ts`, `common.json`, and Dominion's sheet and test (The Farming Garrisons is shared) |

**Overlaps and order:**
- `cities.ts`: E1, E2, E3, E4, E5. `turn.ts`: E1, E2, E4. `yields/hex.ts`: E3, E4, E5. `improvements.ts` and `pathfind.ts`: E3, E4. `commissions.ts`: E4, E5. `combat.ts`: E4, E5. `state.ts`: E1, E2, E3, E4.
- E0 goes first. D2 and D3 are already merged, so no E batch waits on them.
- E1's returned citizen goes through `settlePopulationWindfall`. E2's largest-size record hooks that seam, so the record sees the return whichever batch lands first.
- E3 goes before E4: the Keep copies hex yields, and E3 changes the hex fold (marks and water).
- E4's The Wide Country counts outposts, which E4 builds in the same batch.
- E5 holds the cards that need D4, D6 or D7 shapes. Run it after those D batches, or let it build the shapes (see "The rule" above). The same holds for E2's The Frontier Militia (D5) and E4's The Wide Country (D6).
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
27. **The Fish Traps.** **Recommend:** a worker of a seat that holds the charter may enter a lake hex as if embarked. No other unit may. The Floating Gardens' lake half stays as it is.
28. **The Woodland Bands.** **Recommend:** all your land units, civilians included, pay the open-ground cost in forest and jungle. The +2 strength is a defence line, because combat conditions read the contested hex. An attack from the woods needs a new condition that reads the attacker's hex.
29. **The Stationes.** **Recommend:** a defence line, for the same reason. The capital does not count, because the `connected` scope never admits it.
30. **The Burhs.** **Recommend:** "defensive buildings" are the ones the `defensiveBuildings` count reads (a building that raises a town's defence or hit points). The defence counts everything that count counts. The production bonus applies to buildings, not to wonders.
31. **The Keeps.**
    - **Seated or charter.** **Recommend:** seated, as the text reads (it has no "Once drafted" and no "No chair required"). While the card is seated, workers may build Keeps. A Keep already built keeps its yield and strength when the card leaves. The Polders and Outposts work the same way.
    - **"One in each town".** **Recommend:** at most one Keep inside each town's borders, checked when a worker builds. A town that gains a second Keep through a border change keeps both.
    - **The copied yield.** **Recommend:** the six hexes around the Keep, each as your empire reads it (improvements and Order lines included). Count only hexes inside your borders, and never a town centre or another Keep. The Keep pays only while a citizen works it, like any hex.
    - **The +5.** **Recommend:** a defence line for your own units on the Keep's hex, beside the citadel's.
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
