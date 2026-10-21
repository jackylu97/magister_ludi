# Batch D triage, second round: the Dominion themes pass

**Status:** written 2026-10-21 by a read-only triage agent, before any batch in this plan. It is the plan to build the Dominion deck as `docs/plans/dominion-themes.md` and `docs/plans/dominion-list-proposed.md` now stand: the themes pass, the recommendations of its section 10, and your comments of its section 11 (*"ok i've commented on the dominion pass, lets begin working on it."*). The readings below are the ones the build uses unless you change them here. Mark any you disagree with, as on the deck sheets.

Source: the two plan docs above. Facts were checked against the code at commit `36cafa70` (branch `decks`, after Scientific batch S0), with your uncommitted removal of The Servian Reforms in `docs/decks/dominion.md`. The first round of Dominion batches, D0 to D8, is `docs/plans/dominion-build-triage.md`. This plan continues its numbering at D9.

**Groups:**
- **1, data only:** the text can be written with shapes that exist today. The cell names the shape.
- **2, new shape, no new player decision:** the behaviour is automatic, or uses UI that exists. The cell names what is missing.
- **3, waits on you:** The Longships, The Relay Stations and Circumvallation. The themes pass drafted versions with no new input, and section 10 recommended you use them as drafts for your own rework. If you take the drafts as written, they are group 2 work (batch D14). Question 2 asks.

Each cell starts with the batch that builds the row.

## Facts the cells rely on

**Commissions and institutions.**
- A commission is an Order row with `commission: CommissionSpec` (`src/sim/statecraftData.ts`): goals and rewards.
  - A goal is `counted` (a `TallyOccasion` counted while the card is seated, with an optional `GoalFloor`: `minPopulation`, `minTownsTaken`) or `reached` (a `CommissionFigure`, read at the end of the turn).
  - A reward (`CommissionReward`) has `yield` and `amount`, `fromFigure`, `greatPerson`, `unit`, `timed`, `fromGoal`, `citizens`, `building`, `wildcardChairs`, `eachTown`, `markTown` and `lasting`.
- Goals are checked once a turn, in the commissions phase (`runCommissions`, `src/sim/commissions.ts`, after `periodicBoons`). A met card is written to `PlayerStatecraft.commissionsFulfilled`, leaves its chair, and is then paid (`payCommission`). Nothing fires a moment there, and no `CountKind` reads the record. That is feature C's gap.
- `lasting` effects are `liveEffects`' thirteenth source (`src/sim/statecraft/evaluator.ts`), pushed with the commission's id and the Order class word. So an institution is read as an Order's effect in every ledger. Vae Victis's amplifier (`boostFor` in `windfallPayout`) skips only Doctrines, so it reaches an institution's capture rider.
- A counted goal's tally is the card's own (`PlayerStatecraft.tallies`, `recordScalingOccasion` in `src/sim/statecraft/draft.ts`). `goalFloorMet` reads `TallyFacts` (`cityId`, `population`, `wonders`, `townsTaken`).
  - The `rankEarned` tally is raised once with the number of ranks and no facts (`settleRanksEarned`, `src/sim/cities.ts`).
  - The `greatPersonSpent` tally is raised with no facts (`src/sim/greatPeople.ts`).
- `CommissionFigure` has twelve members. None counts towns with a garrison.
- `eachTown` pays each town from its own figure, and only `improvedTilesWorked` and `improvedOnlyTilesWorked` have a town reading. It takes no scope and no flat amount. Scientific's The Lynx-Eyed Academy needs the same scope (the Scientific triage, S8, reading 53).
- The commission rail (`src/ui/commissionRail.ts`) shows the seated commissions, and a met commission for the one turn after it is met. Nothing lists the institutions a seat holds.
- The bots (`src/ai/value.ts`) price a card by its effects. A commission row has no effects, and nothing in `src/ai/` reads `commission`, so a bot gives every commission nothing (the D6 follow-up in the first triage).

**Windfalls and riders.**
- `windfallPayout` (`statecraft/evaluator.ts`) composes one moment: the base figure, the riders' `percent` summed and applied once, and each rider's grant.
- `perAge` on a rider multiplies its grant and the moment's own figure by the seat's age (`highestAge`, which skips charter technologies since S0). The capture moment's base is 0 (`combat.ts`), so a `perAge` capture rider multiplies only its own grant. Take the City needs no new shape.
- The `pillage` moment carries `{ actor, strength }` (`pillageAt`, `src/sim/improvements.ts`), and its base is `IMPROVEMENTS.pillageGold`. A rider's `percent` scales only that base, not the other riders' grants.
- `effectAmplifier` has the targets `captureRewards` (Vae Victis) and `generalAura` (The Strategoi), with `percent`, a flat `amount` and `family`. It has no unit filter. `generalAuraLines` (`src/sim/combat.ts`) reads only the percentage: the rule book's 3, times (100 + the share) / 100, floored, within two hexes of the first general in `state.units` order.
- Grants deliver `toCapital`, `toEveryTown`, `toNearest`, and renown with `renownFamily`, scaled by `fromOccasion` (`strength` on `kill`, `death`, `rankEarned` and `unitCompletion`).
- The `unitGained` tally is raised for every unit `realiseItem` makes (`cities.ts`), conscripts and civilians included. Only The Gathering Host reads it. The completion facts carry the unit's type (`actor`).

**Tiles, towns and counts.**
- `TileCondition` `hasResource` answers `tile.resource !== undefined`. `resourceKind` and `resource` read the row the same way. `tileConditionHolds` is not given the reader's technologies, so a card's hex line and a `tilesInBorders` count answer for a resource the owner cannot see. The hex fold gates the resource's own yield by `resourceIsVisibleTo` (`src/sim/yields/hex.ts`), and CLAUDE.md says a resource pays only an empire that can name it.
- `TileCondition` has `any` and `all`. `tilesInBorders` takes a `tile` test and `within: 'city'`, and counts owned hexes, worked or not.
- `CityScope` has `captured`, `hasWonder` (pay follows the stones), `garrisoned`, `capital`, `connected`, `any` and `all`. No scope reads `City.originalCapitalOf` (written at founding, D6). `percentYields` takes a `scope`.
- `CountKind` has `puppetPopulation`, `greatPeopleGained` (with `family`), `garrison`, `tilesInBorders`, `citiesCaptured`, `ranksEarned` and `tally`. `cardAuthority` sums a `pays` count to authority over an empire count.

**Units and the board.**
- Stacking is one piece of each category on a hex (`rules.stacking.perCategoryPerTile`, `hasStackingRoom` in `src/sim/units.ts`), and `naval` is its own category. So a town's hex holds at most one land soldier and one ship. `garrisonOf` (`statecraft/evaluator.ts`) counts every combat piece of the owner on the town's hex, ships included.
- `chooseCitizens` (`cities.ts`) seats `population − specialists` citizens. `assignCitizens` has two sim callers, pinned by source in `test/sim/cities.test.ts`; `test/sim/slateRegister.test.ts` pins how it announces a change. Food upkeep is per citizen. The `workedTilesInCity` count and the city panel (`src/ui/cityPanel.ts`) read `workedTiles.length`.
- A gained unit is placed on the hex `spawnTileFor` chooses (`cities.ts`) and made by `createUnit` in `realiseItem`. `arriveOnTile` (`src/sim/arrival.ts`) is called by the movers, the melee advance, `startRoute` and the peace refuge, and not by a birth.
- The zone-of-control exemption is resolved once for each piece in `moveProfile` (`src/sim/pathfind.ts`), through `cardZocIgnored(state, owner, unit.type)`, which takes a type. `CardRuleEffect.rank` exists (The Varangian Guard) and is read only where a whole piece is in hand.
- `unitStat` `where` has `ownTerritory`, `foreignTerritory`, `embarked`, `fortified` and `grassOrPlains`. The allowance refills in `resetMovement` (`src/sim/turn.ts`).
- `pillageAt(state, unit, tile)` takes the hex to burn. The drill phase runs `drillUnits` and `harvestEnemyHexes` (War Feeds Itself). `underSiege` and `siegeField` live in `combat.ts`. A town's production lines are `productionModifiers` (`src/sim/yields/town.ts`).

**The sheet, the data and the tests.**
- `data/decks/dominion.json` holds 176 Order rows: 123 live, of which two are deferred (The Relay Stations, Circumvallation), and 16 Doctrines. The sheet's 124 rows are the 123 live rows and Rally to the Standard, which has no data row. The Longships' row (`marineDrill`) still plays Marine Drill.
- The ten cut rows are live: `musterRites`, `theFuneralGames`, `theArmourersSecret`, `dominionTheMarshals`, `dominionMarchDiscipline` (The Marching Camps), `theOpenMuster`, `theCleruchy`, `theValetudinaria`, `theStateForges`, `theKeshik`.
- `test/sim/decks/dominion.test.ts` reads the sheet:
  - an `implemented` row's rarity, tier and text equal the data row's; a `modify` row has a data row and an `add` row has none; every live row is listed once; the Type column matches the data;
  - every Doctrine row in the data must be on the sheet and not retired ("matches every Doctrine with a data row to its sheet row"). **So the check fails while your removal of The Servian Reforms stands and its data row is live.**
- `test/sim/decks/sortedSheets.ts` lists `SORTED_DECKS = ['dominion', 'expansionist']`. Scientific batch S1b adds Scientific.
- `SCHEMA_VERSION` is 152 (S0), pinned in `test/sim/state.test.ts`.
- `docs/orders-and-doctrines.md` mirrors the data by hand (no write mode): the Dominion shelf, and the Doctrines table, which still lists The Servian Reforms. `test/fixtures/cardText.json` is rewritten with `CARD_TEXT_WRITE=1 npx vitest run test/sim/cardTextSnapshot.test.ts`.
- The Servian Reforms is pinned in `test/sim/doctrineOffer.test.ts`, `test/sim/offers.test.ts`, `test/sim/decks.test.ts`, `test/sim/statecraft.test.ts` and `test/sim/decks/dominionDoctrines.test.ts`. The cut rows are seated by `test/sim/levies.test.ts`, `test/sim/decks/dominionUnits.test.ts` and `test/sim/decks/dominionCombat.test.ts`.

## Tier 0

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| Commission: Clear the Frontier | implemented; revised (section 11) | 1 | D9. Reward `greatPerson: 'general'` in place of `citizens: 2` and `unit: 'bestMelee'`. The goal stays `counted` `campCleared` 2 (reading 1). |
| Battle Honours | implemented; revised (section 11) | 1 | D9. Goal `counted` `unitKilled` 6, not 10. Reward `citizens: 2` and `unit: 'bestMelee'`, Clear the Frontier's old reward (readings 1, 9). |
| The Camp Chaplains | implemented; reworked | 1 | D9. A second `windfallRider` on `death`, faith 1 × `fromOccasion: 'strength'`: The Funeral Games' row, which D9 retires. |
| The Bards' Praise | implemented; revised (section 11) | 1 | D9. The `camp` rider's culture 15 → 30. |
| The Gathering Host | implemented; revised (section 11) | 2 | D12. A `TallyOccasion` `militaryGained`, raised in `realiseItem` beside `unitGained` for a unit of `category: 'military'` (reading 20). Its two `pays` count `tally` rows read it. |
| The Champion's Portion | new | 1 | D9. `windfallRider` `kill`, grant `renown: 1`, `fromOccasion: 'strength'`, `renownFamily: 'general'`. A renown grant scaled by the moment exists since D6 (reading 26). |
| Commission: Man the Walls | new | 2 | D11. A `CommissionFigure` `garrisonedTowns` (towns whose hex holds a combat unit of yours), goal `reached` 3. A reward `eachTown` with a `scope` (`garrisoned`) and a flat `amount`: production 30, settled in each town (reading 17). S8 reuses the scope. |
| Blood Brothers, Blooded Spears, The Horse Herds, Sword and Plough, The Standing Army, The King's Levy, The Grain Tribute, The Drill Grounds, The Scaling Ladders, The Cattle Raid, The Garrison Captains, The Spear Makers, The Armed Colony, The Outriders, The Captured Arms, The Defiant Kingdom, The Hunting Grounds, The Campaign Annals | implemented | – | Built (18). |

## Tier I

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Soldier-Farmers | implemented; revised (section 11) | 2 | D12. Data: drop the `atPeace` `conditionRule`; `pays` `where: 'hex'` production 1 gold 1, `on` `hasResource`, scope `garrisoned`. Missing: the sight gate, so an unseen resource does not count (readings 4, 21). |
| The Acropolis | implemented; reworked | 1 | D10. `pays` hex culture 2 on `improvement` citadel; `pays` empire count `tilesInBorders`, tile `improvement` citadel, to authority 1. Drop the `buildingsInCity` row (reading 27). |
| The Ovation | new | 2 | D11. Feature C: a `WindfallOccasion` `commissionMet`, fired in `runCommissions` after `payCommission`. Then Hegemony's shape: `windfallRider` `commissionMet`, grant `timed` 10 turns with `renews`, `percentYields` production 30 (reading 18). |
| The Spartan Discipline | new | 1 | D10. `productionBonus` unit, class `category: 'military'`, +30; `productionBonus` building −15 (reading 32). |
| Commission: The Ranks of Merit | new; revised (section 11) | 1 | D10. Goal `counted` `rankEarned` 3. Reward `lasting`: two `windfallRider` `rankEarned`, science 1 and production 1 × `fromOccasion: 'strength'`, `toCapital` (reading 12). |
| Commission: Harry the Border | new; revised (section 11) | 2 | D12. Goal `counted` `hexPillaged` 4. Reward `lasting`: `effectAmplifier` on a new target `pillageRewards`, percent 50, with a new `class` field (`modelClass: 'mounted'`), read in `windfallPayout` on the `pillage` moment against `facts.actor` (reading 2). |
| The Upstarts | new | 2 | D15, after S3. A `CombatCondition` `vsMoreTechs`, the mirror of S3's `vsFewerTechs`, read through S3's `src/sim/rivals.ts` (reading 25). `combatLine` +3, `side: 'both'`, class military. |
| Commission: The First Province | new; revised (section 11) | 1 | D10. Goal `counted` `cityCaptured` 1. Reward `lasting`: `pays` city food 5 gold 5, scope `captured` (reading 13). |
| The Castle Demesne | new | 1 | D10. `pays` hex food 3 production 3 on `improvement` citadel. |
| The Quartermasters, War Foundries, Horse Lords, Martial Law, The General Staff, The Training Cadre, The Soldiers' Purse, Honours of the Legion, The Pacified Marches, The Art of War, Songs of the Fallen, Walled Towns, The Swift Riders, The Captive Craftsmen, The Satraps, The Sack | implemented | – | Built (16). The Quartermasters gains D12's sight gate with every resource line (reading 21). |

## Tier II

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Longships (was Marine Drill) | modify: reworked; draft proposed | 3 | Question 2. If you take the draft: D14, a pillage at the end of the turn by each naval combat unit beside an enemy improvement on the shore, through `pillageAt` with the shore hex (reading 35). The row `marineDrill` keeps its id and takes the new text. |
| The Relay Stations | modify: deferred; draft proposed | 3 | Question 2. If you take the draft: D14, a `unitStat` movement +2 with a new `where: 'connectedTown'`, read where the allowance refills (reading 36). |
| Commission: Take the City | implemented; revised (section 11) | 1 | D10. Goal `minPopulation` 5 → 8. Reward only `lasting`: `windfallRider` `capture`, `perAge: true`, science 250 and culture 250. Drop the one-time payout and the Barracks (readings 3, 10, 11). |
| The Res Gestae | new | 2 | D11. Feature C: a `CountKind` `commissionsMet` over `commissionsFulfilled`. Two `pays` empire count, `percent: 4`, `stage: 'empire'`, `max: 7`: production and culture (reading 19, question 5). |
| Commission: The Border Fortress | new; revised (section 11) | 2 | D11. Goal `counted` `greatPersonSpent` 1 with a new `GoalFloor.work: 'citadel'`, read off a new `TallyFacts.improvement` that the spend passes (reading 15). Reward `lasting`: `pays` hex food 2 production 2 on `improvement` citadel. |
| The Naadam | new | 1 | D10. Two `pays` city count `tilesInBorders`, `within: 'city'`, tile `anyImprovement` [pasture, camp]: culture 2, and happiness 1 (reading 28). |
| The Taker of Cities | new | 1 | D10. `combatLine` +5, `side: 'attack'`, `when` `all` [`vsCity`, `besideGreatGeneral`], class military (reading 31). |
| The Roll of Triumphs | new | 1 | D10. Two `pays` empire count `greatPeopleGained`, `family: 'general'`, `percent: 5`, `stage: 'empire'`, `max: 6`: production and gold (reading 33). |
| Siege Works, Conquered Archives, Stockpiles, Triumphs, The Citadel Works, Riders of the Steppe, Spoils of War, Hegemony, Master Bowyers, Armoury Guilds, War Reparations, The Fabricae, Living off the Land, The Longbowmen, The Serried Ranks, The Veterans' Roll, The Conscription Rolls, The Hall of the Slain, The Funeral Oration, The Sagas, The Provincial Census, Spear-won Land, The Castra, The Tactica, Double Time, War Feeds Itself | implemented | – | Built (26). |

## Tier III

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| Rally to the Standard | add: rule-breaker; reworked (automatic, rare) | 2 | D12. A new row. An `ActionRuleId` `rallyToGeneral` with a range of ten hexes, read in `spawnTileFor`: a free hex beside the great general nearest the town (reading 23). |
| The Limitanei | new | 2 | D13. A `CityRuleId` `garrisonWorks` with a cap of 2, read by `chooseCitizens` through `cardCityRuleAt`: the seats become `population − specialists` plus the town's garrison, up to the cap (reading 24, question 3). |
| Commission: The Chosen Men | new | 2 | D11. Goal `counted` `rankEarned` 3 with a new `GoalFloor.rank: 'elite'`; `settleRanksEarned` raises the tally once for each rank, with `TallyFacts.rank` (reading 16). Reward `lasting`: `rule` `ignored` (zone of control) with the existing `rank: 'elite'`, so `cardZocIgnored` takes the piece, not its type. |
| The March Revenues | new | 1 | D10. `pays` empire count `tilesInBorders`, tile `any` [`anyImprovement` [pasture, camp], `resourceKind` strategic], `percent: 3`, `stage: 'empire'`, `max: 10`: production (reading 29). |
| The Tributary Kings | new | 1 | D10. Two `pays` capital count `puppetPopulation`: production 1 and gold 1 (reading 30). |
| Standing Garrisons, The Siege Train, Reserve Officers, Total War, Commission: A Victor's Peace, The Drill Masters, The Plunder Trains, The Yam, The Tagmata, Up Through the Ranks, The Arrière-ban, The Mural Crown, The Victory Mint, The Bakufu, Interior Lines, Valhalla, The Chevauchée, Danegeld, The Devshirme, Pax Romana, The Regimental Schools, The Board of Ordnance | implemented | – | Built (22). |

## Tier IV

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Marshalate | implemented; reworked | 2 | D12. `effectAmplifier` `generalAura` with a flat `amount: 1` scaled by a count (`greatPeopleGained`, family general, at most 5): a new `scaled` field on the amplifier, and `generalAuraLines` reads the flat step before the share (reading 22). Drop the army-wide `combatLine` and the citadel `pays`. |
| Circumvallation | modify: deferred; draft proposed | 3 | Question 2. If you take the draft: D14, a labelled line on a besieged rival town's production toward an Opus at the front of its queue, while one of the holder's units is among the besiegers (reading 37). |
| Commission: The Captured Marvel | implemented; revised (section 11) | 2 | D11. A `CityScope` `rivalCapital`: the town was another empire's original capital (`City.originalCapitalOf` is set and is not the holder). Reward only `lasting`: `percentYields` science 30 and culture 30, scope `all` [`captured`, `any` [`hasWonder`, `rivalCapital`]]. Drop the one-time payout. The goal is unchanged (reading 14). |
| Imperium, The Praetorian Guard, The Grand Army, The Annexed Provinces, The Military Frontier, The Grand Coalition, The Proconsuls, Commission: The Grand Campaign, Commission: Hold the Capitals, Spolia, The Legions' Labour, The Nation in Arms, The Horde, Vae Victis, The Varangian Guard, The Glorious Dead, The Harrying, The Great Bombards | implemented | – | Built (18). |

## Shared with another deck

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Soldier-Scholars (Scientific) | new | 2 | Scientific batch S9 builds it, typed Military (reading 6), and adds its row to the shared table of `docs/decks/dominion.md`. No D batch touches it. |
| Mercenary Contracts (Commerce) | modify: deferred | 3 | Commerce's to rework. |
| Military Colonies (Expansionist) | implemented | – | Built. Its fate is the Expansionist pass's. |
| The Imperial Examinations, Triumphal Arches (Magisterial) | not on the sheet | – | The Magisterial pass. |
| The other 25 shared rows | implemented | – | Built. |

## Doctrines

| Doctrine | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Servian Reforms | removed from the sheet by you (uncommitted) | 1 | D9. `retired: true` on `theServianReforms` (reading 7, question 1). The sheet test's Doctrine check skips a retired row. The row leaves the Doctrines table of `docs/orders-and-doctrines.md` and C3's Doctrine pins. |
| The other fifteen | implemented | – | Built. Not in this pass. |

## Cut and retired rows

| Rows | In the data now | Action |
|---|---|---|
| Muster Rites, The Funeral Games, The Armourers' Secret, The Marshals, The Marching Camps, The Open Muster, The Cleruchy, The Valetudinaria, The State Forges, The Keshik | live | D9: `retired: true`, and their rows leave the sheet and the Dominion shelf (reading 8). A shape that only a retired row uses stays, because a save may hold the row. |
| The Servian Reforms | a live Doctrine | D9 (above). |
| Rally to the Standard's old text ("may appear beside any of your great generals") | no data row | None. D12 writes the new row. |

## Readings

The first six are the "to confirm" items of section 11. The rest are new. Each gives the reading the build uses, then the alternative.

1. **(Section 11)** Clear the Frontier and Battle Honours trade rewards. Their names and data ids stay. Alternative: the two cards trade names, which renames two live rows a save may hold.
2. **(Section 11)** Harry the Border: +50% on every yield a pillage pays the raider, the base plunder and the yields of every card's rider, Doctrines included (The Plunder Economy). It is applied once to each yield figure, after the riders' own percentages. Renown, faith pressed, heals, strikes and the spread are not yields and do not change. The hexes The Horde spreads to count, because the raider is the same. Alternative: the base plunder only, through the existing rider `percent`, which needs no new shape.
3. **(Section 11)** Take the City pays 250 science and 250 culture times the seat's age (`highestAge`), through `perAge`: 750 of each in age 3, 1,000 in age 4.
4. **(Section 11)** The Soldier-Farmers counts a worked hex with a resource the seat can see, in a town with a garrison.
5. **(Section 11)** Every recommendation of the themes doc's section 10 stands, feature C included. Section 10 recommended the three drafts as drafts for your rework, so they wait on question 2.
6. **(Section 11)** The Soldier-Scholars is Military. S9 builds it.
7. The Servian Reforms: your removal from the sheet means its data row retires. Alternative: put it back on the sheet. The sheet test fails while the row is live and off the sheet.
8. The ten cut rows retire in D9, before any card that replaces them lands. A save that holds one keeps it, with its effects. A test that seats a retired row directly stays; a test that deals one from a pool changes.
9. Battle Honours counts kills of the wild's units, because the `unitKilled` tally counts them.
10. Take the City's institution pays from the first capture after the goal is met. Goals are checked at the end of the turn, after the capture's riders have paid. Alternative: also pay once for the capture that met the goal.
11. Vae Victis doubles an institution's capture rider (Take the City), because `liveEffects` reads an institution as an Order's effect. Alternative: leave institutions out, as a commission's one-time reward is left out (the first triage's reading 6).
12. The Ranks of Merit reads the unit's strength as Honours of the Legion does: the roster figure plus the unit's stamp. The production lands in the capital and settles at once. With no capital, the production is lost and the science still banks.
13. The First Province: "towns you captured" is the `captured` scope (taken by force, puppets included). It pays in unrest, because unrest stops neither food nor gold.
14. The Captured Marvel pays a town you hold that was taken by force and either holds a world wonder now (pay follows the stones) or was another empire's original capital. A town that loses its wonder and was never a capital stops paying. Alternative: the town as it stood when taken.
15. The Border Fortress: "plant a citadel" is a great general spent on a citadel while the card is seated. A citadel planted earlier does not count. The institution pays every citadel inside your borders while it is worked (a hex line), a captured citadel included.
16. The Chosen Men counts each Elite rank earned while the card is seated. A Veteran rank does not count. The zone-of-control rule applies to a piece that is Elite when its path is priced, so a unit that becomes Elite in the middle of a turn gains it at its next path search.
17. Man the Walls: "military units standing in three of your towns at the same time" is the `garrison` reading (a combat unit of yours on the town's hex, ships included), checked at the end of the turn. The 30 production goes to each town with a garrison at that moment and settles at once (`settleProductionWindfall`). Alternative: land units only.
18. The Ovation: any commission this seat meets, from either of its decks, starts or restarts the ten turns. The moment fires in the commissions phase at the end of a turn, so the +30% runs for the next ten turns (an absolute `expiresTurn`).
19. The Res Gestae counts every commission this seat has met this game, before the card was seated too. A count's `max` is in steps, so seven commissions give +28% and the eighth adds nothing. The text becomes "at most +28%". Alternative: +5% for each, at most +30% (question 5).
20. The Gathering Host: "a military unit" is the land military category (`category: 'military'`), as Rites of Passage reads it, so a ship does not count. A conscript counts (your ruling of 2026-10-16). The tally is a new member, so `unitGained` keeps its meaning for a later card. Alternative: narrow `unitGained` itself, which only this card reads today.
21. The sight gate: the three resource tile tests (`hasResource`, `resourceKind`, `resource`) answer only for a resource the hex's owner can see (`resourceIsVisibleTo`), in hex lines and in `tilesInBorders`. This also stops The Quartermasters, The March Revenues and every card of any deck from paying on an unseen resource, which is CLAUDE.md's rule. Alternative: the gate on The Soldier-Farmers alone.
22. The Marshalate's steps are added to the aura's base before The Strategoi's share, so with both a general's aura is (3 + 5) × 2 = 16. Alternative: after the share, 3 × 2 + 5 = 11.
23. Rally to the Standard moves a military unit gained (the land military category). It appears on a free hex beside the great general nearest its town, if that general stands within ten hexes of the town. A free hex is one the unit could stop on (`canStopOn`) with no discovery and no camp, so the birth claims nothing and needs no `arriveOnTile` call. With no such hex, the unit appears in its town. The text becomes "A military unit you gain appears beside…". Alternative: every unit gained, civilians included (question 6).
24. The Limitanei: a military unit in a town is a combat unit on the town's hex (`garrisonOf`), ships included. A hex holds one land soldier and one ship, so only a coastal town with a ship reaches the second hex (question 3). The extra hexes are chosen by the same assigner after the citizens, eat no food, and count as worked hexes for every card. They are seated at the next assignment (the end of the turn, or any refresh), not when a unit walks in, and they go at the next assignment after it leaves. The themes doc's "ten towns with two soldiers each" holds only for coastal towns.
25. The Upstarts: the other piece's owner is a real empire that knows more technologies than you, charter technologies included (the Scientific triage's reading 17). It never applies against the wild. It applies in attack and in defence.
26. The Champion's Portion pays renown equal to the fallen unit's strength, the wild's units included, favouring great generals.
27. The Acropolis: the culture is a hex line on the citadel, so it pays while the citadel is worked, as The Citadel Works' science does. The authority counts every citadel inside your borders, worked or not.
28. The Naadam counts pastures and camps (the improvements, not barbarian camps) inside each town's borders, worked or not.
29. The March Revenues counts a pasture or camp on a strategic resource once. It counts only resources the seat can see once D12 adds the sight gate.
30. The Tributary Kings counts the citizens of every puppet town you hold, and pays the capital.
31. The Taker of Cities: "beside" is one of the six hexes around the unit (`besideGreatGeneral`). It applies in attack, on every beat of an assault on a town.
32. The Spartan Discipline: "buildings" is the building category, the Magnum Opus included. Wonders are their own category and are not slowed. "Military units" is the land military category. Alternative: the Opus is spared.
33. The Roll of Triumphs counts the great generals gained this game (`greatPeopleGained`), six steps for +30%.
34. Feature C: the moment fires once for each commission met, after its reward is paid. The count reads `commissionsFulfilled`. Both count commissions of every deck, so the Scientific commissions (The Royal Charter Commission, The Great Instrument, The Lynx-Eyed Academy) feed The Ovation and The Res Gestae with no S work.
35. The Longships (if you take the draft): at the end of the owner's turn (the drill phase, beside War Feeds Itself's harvest), each naval combat unit of yours pillages one improved land hex beside it that an empire at war with you owns. It takes the first such hex in neighbour order, never a tended work, one hex for each ship each turn. It is a full pillage: salvage, riders, tally and record.
36. The Relay Stations (if you take the draft): +2 movement when the allowance refills at the start of the turn, for a land military unit standing in one of your towns with a road to the capital (the `connected` scope).
37. Circumvallation (if you take the draft): a rival town that is under siege (`underSiege`), with at least one of the holder's units among the besiegers, adds no production toward an Opus at the front of its queue. The town's own breakdown shows the line and names the card (rule 5). The hammers are not banked anywhere else.
38. (D9) The sheet uses this triage's text for The Res Gestae ("at most +28%", reading 19) and Rally to the Standard ("A military unit you gain…", reading 23), not the list doc's.
39. (D9) A retired row carries no type, so a save that holds one reads it as unsorted, as the D0 cuts already do.
40. (D10) The Ranks of Merit's production lands in the capital's basket at once but completes a build only at the turn's production step, because `settleRanksEarned` settles towns only through `settleGrowthWindfall`. D11 adds `settleProductionWindfall` there.
41. (D11) A unit gained already holding a rank earns it inside a completion (`realiseItem`). There its hammers still wait for the production step, because `settleProduction` allows one item per town per call. The Ranks of Merit's science banks without settling research at once.
42. (D12) Every unit placed through `spawnTileFor` rallies: built, bought, levied or gifted, and a bought unit rallies even when its town's hex is taken.
43. (D12) The `unitGained` tally stays hooked with no reader; the register test lists it as an exception.
44. (D12) The Marshalate counts `greatPeopleGained` with the general family, the count The Roll of Triumphs reads.
45. (D13) A `garrisonWorks` row with no `max` lets every soldier count; of several rows, the largest cap wins.
46. (D13) A town keeps pins up to its citizens' seats plus its soldiers' seats, so a town with specialists can keep more pins than it has citizens on the land.

## The batches

**The second track.** The Scientific batches S1 to S13 run one at a time in the main tree. The D batches run in a git worktree of their own:
- Branch the worktree from `decks`. A new worktree branches from `main` by default, so fast-forward it to `decks` first.
- Run one D batch at a time. When its gate is green, merge it into `decks`, then bring the worktree up to `decks` before the next D batch.
- The orchestrator runs the batch-gate on `decks` after each merge, as for any batch.

**Keep each D batch small and additive in the files the two tracks share:**
- Put a new union member beside the Dominion members already in that union, not at its end, so an S append and a D insert touch different lines. Do the same for register lists (`TALLY_OCCASIONS`, `COMMISSION_FIGURES`) and word tables.
- Put a new switch arm beside the Dominion arms in the evaluator and the describers.
- In `docs/orders-and-doctrines.md`, edit only the Dominion shelf, the Doctrines table and their notes. The S track edits the Scientific shelf.
- In `test/fixtures/cardText.json`, on a conflict take either side and rewrite the file with `CARD_TEXT_WRITE=1 npx vitest run test/sim/cardTextSnapshot.test.ts`.
- `SCHEMA_VERSION` (`src/sim/state.ts`): each card batch bumps it once. The merge takes the next free number and updates the pin in `test/sim/state.test.ts`.

**Shared work belongs to one track:**
- Feature B (reading rivals) is S3's. D15 (The Upstarts) waits for S3 and reuses `src/sim/rivals.ts`.
- The Soldier-Scholars is S9's. No D batch touches it.
- Feature C (a moment when a commission is met, and a count of met commissions) is D11's. The S batches can read both later.
- A scope and a flat amount on `CommissionReward.eachTown` is D11's (Man the Walls). S8's The Lynx-Eyed Academy reuses it, so S8 depends on D11. D11 is third on the D track and S8 ninth on the S track, so D11 lands first.
- A commission's price for the bots is D16's. S13 reuses it for the Scientific commissions.

**The sheet.** Dominion's sheet is sorted and typed. D9 writes every row of the two plan docs onto it. Each later D batch sets its own rows to `implemented`, with the Ability cell equal to the data row's text and the Type column equal to the row's `type`, and recomputes the counts tables. A row is `implemented` only when its data text equals the sheet's Ability cell.

### D9: the sheet of record, the retirements and the Tier 0 data cards

**Built 2026-10-21** on `dom-work` (`aab596fd`), merged into `decks` as `e66e07d0` (schema 155, after S1b's 154). Readings 38 and 39 came from it. It also updated three tests the triage missed (`commissions.test.ts`, `decks/dominionCards.test.ts`, `decks/dominionWars.test.ts`).

- **Builds:**
  - **The sheet.** Start from the working tree's `docs/decks/dominion.md`, which holds your uncommitted removal of The Servian Reforms. **Keep that removal.** Never rebuild the file from HEAD. Then write every card of the two plan docs onto it:
    - the five cards D9 builds, as `implemented`;
    - every other changed live row as `modify: revised` or `modify: reworked`, with the target text from the list doc;
    - every new card as `add`, and Rally to the Standard as `add: rule-breaker` with its new text and rarity rare;
    - The Longships, The Relay Stations and Circumvallation unchanged, until question 2 is answered;
    - the ten cut rows off the tables, because their data rows retire in this batch;
    - the Type column on every row, and the counts tables (Tier I Doctrines 5 → 4, all Doctrines 16 → 15);
    - the header: the sixteen Doctrines become fifteen live and one retired, and "Why each card is here" names `docs/plans/dominion-themes.md`;
    - a "Ruled 2026-10-21" list in "Open for your pass", pointing at section 11 of the themes doc.
    - Leave The Soldier-Scholars to S9.
  - **The retirements.** `retired: true` on the ten cut Orders and on The Servian Reforms (readings 7, 8). The sheet test's Doctrine check skips a retired Doctrine. C3's Doctrine pins drop it. `docs/orders-and-doctrines.md` drops the eleven rows.
  - **Cards (5):** Commission: Clear the Frontier, Battle Honours, The Camp Chaplains, The Bards' Praise, The Champion's Portion.
- **Fence:** `data/decks/dominion.json`, `docs/decks/dominion.md`, `docs/orders-and-doctrines.md` (the Dominion shelf, the Doctrines table, their notes), `test/fixtures/cardText.json`, `src/sim/state.ts` (the schema line) and `test/sim/state.test.ts`, `test/sim/decks/dominion.test.ts`, `test/sim/decks/dominionDoctrines.test.ts`, `test/sim/decks/dominionUnits.test.ts`, `test/sim/decks/dominionCombat.test.ts`, `test/sim/doctrineOffer.test.ts`, `test/sim/offers.test.ts`, `test/sim/decks.test.ts`, `test/sim/statecraft.test.ts`, `test/sim/levies.test.ts`, a new `test/sim/decks/dominionThemeCards.test.ts`.
- **Shares with the S track:** `docs/orders-and-doctrines.md` and `test/fixtures/cardText.json` (every S card batch, S1b, S11), `src/sim/state.ts` (every S card batch), `test/sim/decks/dominion.test.ts` (S1b, S9, S11), the pins in `test/sim/statecraft.test.ts` and `test/sim/decks.test.ts`. No source file beyond the schema line.
- **Depends on:** nothing. It also mends the sheet test, which fails while your removal stands.
- **Schema:** one bump (eleven rows leave the pools).
- **Done-gate:** `npx vitest run test/sim/decks/dominion.test.ts test/sim/decks/dominionThemeCards.test.ts test/sim/decks/dominionDoctrines.test.ts test/sim/decks/dominionUnits.test.ts test/sim/decks/dominionCombat.test.ts test/sim/doctrineOffer.test.ts test/sim/offers.test.ts test/sim/decks.test.ts test/sim/statecraft.test.ts test/sim/levies.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`, and the fence's files typecheck.

### D10: the data-only cards of Tiers I to III

**Built 2026-10-21** on `dom-work` (`49b76f2b`), merged into `decks` as `e76f7b04` (schema 157, after S2/S3's 156). Reading 40 came from it. The describers now say "for each age you have reached" on an age-scaled grant (this also rewords Devotion's Rites of Blood).

- **Builds:** eleven group-1 cards: The Acropolis, The Castle Demesne, The Spartan Discipline, Commission: The Ranks of Merit, Commission: The First Province, Commission: Take the City, The Naadam, The Taker of Cities, The Roll of Triumphs, The March Revenues, The Tributary Kings. The March Revenues lands without the sight gate, which D12 adds (reading 29).
- **Fence:** `data/decks/dominion.json`, `docs/decks/dominion.md`, the Dominion shelf of `docs/orders-and-doctrines.md`, `test/fixtures/cardText.json`, `src/sim/state.ts` (the schema line) and `test/sim/state.test.ts`, `test/sim/decks/dominionThemeCards.test.ts`. `src/sim/statecraft/describers.ts` only if a sentence reads badly.
- **Shares with the S track:** as D9, and the describers if touched (S1 to S9).
- **Depends on:** D9 (the sheet).
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/dominionThemeCards.test.ts test/sim/decks/dominion.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.
- **After D10 a playtest can start:** 116 of the 132 seatable cards play as written.

### D11: the commissions (feature C, goals and rewards)

**Built 2026-10-21** on `dom-work` (`4137b6b2`), merged into `decks` with D12 as `5aeca9ae` (schema 159). Reading 41 came from it. `settleRanksEarned` now settles production at once (reading 40).

- **Builds:**
  - Feature C: a `WindfallOccasion` `commissionMet`, fired in `runCommissions` after `payCommission`, and a `CountKind` `commissionsMet` over `PlayerStatecraft.commissionsFulfilled`, with their words (reading 34).
  - A `CommissionFigure` `garrisonedTowns`, read in `commissionProgress`.
  - `CommissionReward.eachTown` with a `scope` and a flat `amount` (no `fromFigure`). S8 reuses it.
  - `GoalFloor.rank` and `GoalFloor.work`, read by `goalFloorMet` off new `TallyFacts.rank` and `TallyFacts.improvement`. `settleRanksEarned` raises `rankEarned` once for each rank with its rank, and the great-person spend passes the work it laid.
  - A `CityScope` `rivalCapital`, read off `City.originalCapitalOf`.
  - `cardZocIgnored` takes the piece, so a zone-of-control rule's `rank` is read (`moveProfile`).
  - **Cards (6):** The Ovation, The Res Gestae, Commission: Man the Walls, Commission: The Chosen Men, Commission: The Border Fortress, Commission: The Captured Marvel.
- **Fence:** the shared six (Dominion parts: the effect unions, the evaluator's arms, the describers' words, `data/decks/dominion.json`, the Dominion shelf, the fixture), `docs/decks/dominion.md`, `src/sim/commissions.ts`, `src/sim/statecraft/draft.ts` (`goalFloorMet`, `keepGoalFacts`), `src/sim/cities.ts` (`settleRanksEarned` only), `src/sim/greatPeople.ts` (the spend's facts), `src/sim/pathfind.ts` (`moveProfile`), `src/sim/state.ts` (the schema line) and `test/sim/state.test.ts`, `test/sim/commissions.test.ts`, `test/sim/ranks.test.ts` (its pin of the rank callers must not move), a new `test/sim/decks/dominionCommissions.test.ts`.
- **Shares with the S track:** `statecraftData.ts`, `statecraft/evaluator.ts` and `statecraft/describers.ts` (S1 to S9), `commissions.ts` (S6, S8), `statecraft/draft.ts` (S9's `eligibleFor`), `cities.ts` (S5, S9, in other functions), `greatPeople.ts` (S8), `state.ts`.
- **Depends on:** D10.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/dominionCommissions.test.ts test/sim/commissions.test.ts test/sim/ranks.test.ts test/sim/decks/dominionRanks.test.ts test/sim/decks/dominion.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/statecraft.test.ts test/mapgen/moduleCycles.test.ts`.

### D12: five small automatic rules

**Built 2026-10-21** on `dom-work` (`7225b532`), merged into `decks` with D11 as `5aeca9ae` (schema 159). Readings 42 to 44 came from it. The sight gate changes only the rows that read a strategic or any resource, because only copper, horses, camels, iron and niter have a reveal technology.

- **Builds:**
  - An `AmplifierTarget` `pillageRewards` and a `class` field on `effectAmplifier`, read in `windfallPayout` on the `pillage` moment against `facts.actor` (reading 2). Card: Commission: Harry the Border.
  - A `TallyOccasion` `militaryGained`, raised in `realiseItem` beside `unitGained` (reading 20). Card: The Gathering Host.
  - The sight gate in `tileConditionHolds` for the three resource tests, in hex lines and in `tilesInBorders` (reading 21). Card: The Soldier-Farmers.
  - A flat step on the `generalAura` amplifier, scaled by a count, read in `generalAuraLines` before the share (reading 22). Card: The Marshalate.
  - An `ActionRuleId` `rallyToGeneral` with a range, read in `spawnTileFor` (reading 23). Card: Rally to the Standard, a new row.
- **Fence:** the shared six (Dominion parts), `docs/decks/dominion.md`, `src/sim/combat.ts` (`generalAuraLines` only), `src/sim/cities.ts` (`realiseItem`'s tally line, `spawnTileFor`), `src/sim/yields/hex.ts` (the reader's technologies into the tile test), `src/sim/state.ts` (the schema line) and `test/sim/state.test.ts`, `test/sim/decks/dominionPillage.test.ts`, `test/sim/decks/dominionCombat.test.ts`, `test/sim/decks/dominionUnits.test.ts`, a new `test/sim/decks/dominionRules.test.ts`.
- **Shares with the S track:** the shared six (S1 to S9), `combat.ts` (S1, S3, S9; S9's `nearLearning` sits beside the aura), `cities.ts` (S5, S9), `state.ts`.
- **Depends on:** D10. It does not need D11.
- **Note:** the sight gate changes what resource lines pay in every deck, so the bot digests may move. The orchestrator re-pins them at the push-gate.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/dominionRules.test.ts test/sim/decks/dominionPillage.test.ts test/sim/decks/dominionCombat.test.ts test/sim/decks/dominionUnits.test.ts test/sim/decks/dominionEconomy.test.ts test/sim/decks/expansionistLand.test.ts test/sim/improvements.test.ts test/sim/decks/dominion.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/statecraft.test.ts`.

### D13: The Limitanei

**Built 2026-10-21** on `dom-work` (`31314356`), to merge into `decks` after Scientific S5. Readings 45 and 46 came from it. Follow-ups: the city panel counts a soldier's hex as land a citizen works ("Citizens 2: 4 on land"), and `src/ai/bot.ts` copies the old citizen count without the soldiers' seats (D16).

- **Builds:** a `CityRuleId` `garrisonWorks` with a cap (`max: 2`), read by `chooseCitizens` through `cardCityRuleAt` (reading 24). The seats are the citizens plus the town's garrison, up to the cap. No new caller of `assignCitizens`. Check the city panel's land count (`cityPanel.ts` reads `workedTiles.length`); a mark on a soldier's hex is a UI follow-up. Card: The Limitanei.
- **Fence:** the shared six (Dominion parts), `docs/decks/dominion.md`, `src/sim/cities.ts` (`chooseCitizens`, `workableSeats`), `src/sim/state.ts` (the schema line) and `test/sim/state.test.ts`, `test/sim/cities.test.ts` and `test/sim/slateRegister.test.ts` (read; their pins must not move), a new `test/sim/decks/dominionLimitanei.test.ts`.
- **Shares with the S track:** the shared six (S1 to S9), `cities.ts` (S5, S9, in other functions), `state.ts`.
- **Depends on:** D10, and question 3.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/dominionLimitanei.test.ts test/sim/cities.test.ts test/sim/slateRegister.test.ts test/sim/decks/dominion.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts`.

### D14: the three drafts (only if you take them)

- **Builds:** The Longships (a shore pillage at the end of the turn, beside `harvestEnemyHexes`), The Relay Stations (`unitStat` `where: 'connectedTown'`, read in `resetMovement`) and Circumvallation (a production line on a besieged rival town's Opus) (readings 35 to 37). Each row leaves `deferred`, and The Longships' row `marineDrill` takes its new text. If Circumvallation's line is a new step of the town fold, `docs/yields.md` and its sync test name it.
- **Fence:** the shared six (Dominion parts), `docs/decks/dominion.md`, `src/sim/improvements.ts` (`pillageAt` called with a shore hex), `src/sim/turn.ts` (`resetMovement`), `src/sim/yields/town.ts` (`productionModifiers`), `docs/yields.md` if needed, `src/sim/combat.ts` (read only: `underSiege`), `src/sim/state.ts` (the schema line) and `test/sim/state.test.ts`, a new `test/sim/decks/dominionDrafts.test.ts`.
- **Shares with the S track:** the shared six (S1 to S9), `improvements.ts` (S5), `combat.ts` (S1, S3, S9; read only here), `state.ts`.
- **Depends on:** D10, and question 2.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/dominionDrafts.test.ts test/sim/decks/dominionPillage.test.ts test/sim/naval.test.ts test/sim/decks/dominion.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts`, and the yields sync test if `docs/yields.md` changed.

### D15: The Upstarts (after S3)

- **Builds:** a `CombatCondition` `vsMoreTechs` beside S3's `vsFewerTechs`, read through `src/sim/rivals.ts`, and its words (reading 25). Card: The Upstarts.
- **Fence:** the shared six (Dominion parts), `docs/decks/dominion.md`, `src/sim/combat.ts` (the condition's arm, beside S3's), `src/sim/rivals.ts` (read; a helper added only if S3's does not answer "knows more"), `src/sim/state.ts` (the schema line) and `test/sim/state.test.ts`, a new `test/sim/decks/dominionRivals.test.ts`.
- **Shares with the S track:** S3 owns `rivals.ts` and `vsFewerTechs`; `combat.ts` (S1, S3, S9); the shared six; `state.ts`.
- **Depends on:** S3 merged into `decks`, and D10. It may run any time after both.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/dominionRivals.test.ts test/sim/decks/scientificRivals.test.ts test/sim/combat.test.ts test/mapgen/moduleCycles.test.ts test/sim/decks/dominion.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts`.

### D16: bot pricing

- **Builds:**
  - **A commission's price.** Today a commission scores nothing. Price it as its reward: a one-time reward as a lump, and a `lasting` reward as its effects for the rest of the game, discounted by a forecast of the turns to meet the goal from the seat's own rates. Dominion has 13 commissions, eight with an institution. S13 reuses this for the Scientific commissions.
  - Stand-in prices in `data/ai.json` for every new kind of D11 to D15: `commissionMet`, `commissionsMet`, `militaryGained`, `pillageRewards`, the aura step, `rallyToGeneral`, `garrisonWorks`, the rank on the zone-of-control rule, `vsMoreTechs`, and the draft shapes if D14 ran. The arena page shows each new knob with no page edit.
  - Re-pin the explore digest and the bot digests with the control-run method of the first D batches.
- **Fence:** `src/ai/value.ts`, `data/ai.json`, `test/sim/aiAppraisal.test.ts`, `test/sim/explore.test.ts`, and the digests.
- **Shares with the S track:** S13 edits the same files (and `src/ai/bot.ts`, `chain.ts`, `plan.ts`). Put new knobs beside the Dominion knobs. D16 and S13 do not run at the same time.
- **Depends on:** D13, and D14 and D15 if they ran. It touches no sim file, so it may run beside the S card batches.
- **Schema:** none.
- **Done-gate:** `npx vitest run test/sim/aiAppraisal.test.ts test/sim/explore.test.ts`. The digest re-pin is the orchestrator's push-gate work (`npm run test:all`).

### Order and overlaps

- The D track: D9 → D10 → D11 → D12 → D13 → D16, one at a time. D14 runs after D10 once question 2 is answered. D15 runs once S3 has merged into `decks`. D16 runs last.
- Cards that play as written, after each batch: 116 after D10, 122 after D11, 127 after D12, 128 after D13, 129 after D15, and 132 after D14.
- The files both tracks touch:

| File | D batches | S batches |
|---|---|---|
| `src/sim/statecraftData.ts`, `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts` | D11 to D15 (D10 only if a sentence reads badly) | S1 to S9 |
| `docs/orders-and-doctrines.md`, `test/fixtures/cardText.json` | D9 to D15 | S1 to S9, S1b, S11 |
| `src/sim/state.ts` | D9 to D15 (the schema line) | S1 to S9 (the schema line; S9's record), S1b, S11 |
| `data/decks/dominion.json` | D9 to D15 | none |
| `data/decks/common.json` | none | S3, S5, S9, S11 |
| `docs/decks/dominion.md` | D9 to D15 | S9 (one row) |
| `test/sim/decks/dominion.test.ts` | D9 | S1b, S9, S11 |
| `src/sim/combat.ts` | D12, D14 (read), D15 | S1, S3, S9 |
| `src/sim/tech.ts` | none | S1, S3, S6, S8, S9 |
| `src/sim/cities.ts` | D11, D12, D13 | S5, S9 |
| `src/sim/commissions.ts` | D11 | S6, S8 |
| `src/sim/statecraft/draft.ts` | D11 | S9 |
| `src/sim/greatPeople.ts` | D11 | S8 |
| `src/sim/improvements.ts` | D14 | S5 |
| `src/ai/value.ts`, `data/ai.json` | D16 | S13 |

- D9 should merge before S9, because both edit `docs/decks/dominion.md` and `test/sim/decks/dominion.test.ts`, and D9 rewrites the sheet. It will, because D9 is first.

## Counts

| | Built | Group 1 | Group 2 | Group 3 | All |
|---|---|---|---|---|---|
| Tier 0 | 18 | 5 | 2 | 0 | 25 |
| Tier I | 16 | 5 | 4 | 0 | 25 |
| Tier II | 26 | 4 | 2 | 2 | 34 |
| Tier III | 22 | 2 | 3 | 0 | 27 |
| Tier IV | 18 | 0 | 2 | 1 | 21 |
| **All** | **100** | **16** | **13** | **3** | **132** |
| Shared | 26 | 0 | 1 | 1 | 28 |

The 132 are the seatable cards of the list doc. Beside them, D9 retires ten Orders and one Doctrine. Of the shared rows, The Soldier-Scholars is S9's and Mercenary Contracts is Commerce's; Military Colonies is counted as built.

## Follow-ups

**The UI track** (`src/ui/`):
- The institutions a seat holds are shown nowhere after the turn they are met (question 4).
- The pillage notice does not say that Harry the Border paid half again.
- A unit that Rally to the Standard places arrives with no notice that names the card.
- The city panel counts a soldier's extra hex as land a citizen works (`cityPanel.ts`). A soldier's hex needs a mark.
- The Ovation's +30% shows as a timed line, and no notice names the commission that started it.
- Circumvallation, if built: the rival's breakdown names a card the rival does not hold.

**The bot track:** D16 prices commissions for the first time. Until D16, a bot seats a commission only as filler, so bot games undervalue the deck's engine.

## Questions for the user

**Answered 2026-10-21.** The user, on the six questions as listed in chat (this list's 2 to 7; question 1, The Servian Reforms, followed from their own sheet edit): *"recommendations seem fine"*. So:
- The Servian Reforms' data row retires (D9).
- D14 builds The Longships, The Relay Stations and Circumvallation as drafted; the user may rework them after a playtest.
- The Limitanei keeps "at most two", and a ship counts (reading 24).
- The institutions a seat holds get a read-only list under the council's chairs, built on the UI track after D11.
- The Res Gestae: +4% for each commission, at most +28% (reading 19).
- Rally to the Standard moves military units only, and its text says so (reading 23).
- Readings 1 to 37 stand until the user marks one.


1. **The Servian Reforms.** Retire its data row (recommended)? Your removal from the sheet fails the sheet test until the row retires or comes back. D9 retires it.
2. **The three drafts.** Build The Longships, The Relay Stations and Circumvallation as drafted, in D14 (recommended: yes, and rework them after a playtest)? Or keep them deferred for your own rework?
3. **The Limitanei's "at most two".** A town's hex holds one land soldier and one ship, so only a coastal town reaches two. Keep the text, with ships counting (recommended)? Or change it to "the town's garrison lets it work one more hex"?
4. **Showing the institutions.** Where does a seat see the institutions it holds? Recommended: a read-only list under the council's chairs, built by the UI track after D11. Today the rail shows a met commission for one turn only.
5. **The Res Gestae's cap.** "+4% for each commission, at most +28%" (recommended, seven commissions)? Or "+5% for each, at most +30%"?
6. **Rally to the Standard** moves only military units, and its text gains "military" (reading 23). Confirm? Or every unit gained, civilians included?
7. **The other readings.** May the build use readings 1 to 37 until you mark one?
