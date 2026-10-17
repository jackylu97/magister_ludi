# Batch D triage: the Dominion `add` and `modify` cards, and its Doctrines

**Status:** written 2026-10-16 by a read-only triage agent, before any D batch. It is the plan for batch D in `docs/plans/chairs-build.md`. The readings in "Rule ambiguities" are the ones the build will use unless the user changes them here. Mark any you disagree with, as on the deck sheets. The user removed The Fyrd after it was written, and confirmed the five deferrals (*"Defer all 5 UX cards, i'll probably rework them later"*).

Source: `docs/decks/dominion.md` as of commit `f6718f07` (branch `decks`). Rows marked `modify: cut` are left out. Shapes were checked against `src/sim/statecraftData.ts`, `src/sim/statecraft/evaluator.ts` and the sim modules they read (`ranks.ts`, `unrest.ts`, `weariness.ts`, `wars.ts`, `levies.ts`, `improvements.ts`, `combat.ts`, `commissions.ts`).

**Groups:**
- **1, data only:** the text can be written with shapes that exist today. The cell names the shape.
- **2, new shape, no UX decision:** the behaviour is automatic, or uses UI that exists (the levy menu, the commission rail, the draft hand, the great-person offer, the disband button). The cell names what is missing.
- **3, deferred:** needs a decision about UI or player interaction. The cell is the question for the user.

Facts the cells rely on:
- `unitCompletion` fires for every unit that goes through `realiseItem`: trained, bought, free (musters, gifts, commission units) and levied with `muster`. It does not fire for a `conscript` levy (`untrained` returns early), or for a unit taken from someone else.
- Windfall production and food land in the town nearest the occasion's hex, or in the capital when there is no hex (`payWindfallGrants`). A grant cannot name another town.
- `Unit.experience` has one writer, `awardExperience`, and its only caller is `applyCombat` (pinned in `test/sim/ranks.test.ts`). No moment fires when a unit earns a rank. Ranks are read with `rankOf`.
- Lifetime records that exist: `Player.unitsKilled` (excludes barbarian kills), `Player.unitsLost` (any battle loss), `Player.citiesCaptured`, `Player.campsCleared`. Only `campsCleared` has a `CountKind` (`clearedCamps`).
- `cardAuthority` does not sum a town-scoped count (`garrison`, `buildingsInCity`) over towns, so such a row pays 0. `cardHappiness` does sum them.
- The pillage occasion passes no facts (no actor, no strength).

## Tier 0

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| Commission: Clear the Frontier | modify: revised | 2 | `CommissionReward` has no citizens field for "2 population in your capital". The unit half is `unit: 'bestMelee'`. |
| Blooded Spears | modify: revised | 1 | `combatLine` +2 `always`, class military; second `combatLine` +2 `vsBarbarians`, class military. |
| Muster Rites | modify: revised | 1 | `windfallRider` `unitCompletion`, faith 8 and food 8. Text "Gaining". |
| The Horse Herds | modify: revised | 1 | `pays` `where: 'hex'` food 1 production 1 on `anyImprovement` [pasture, camp]; drop the mounted `productionBonus`. |
| Battle Honours | modify: revised | 1 | `commission`: goal `counted` `unitKilled` 10; reward `greatPerson: 'general'` (the offer is the draft). |
| Sword and Plough | modify: revised | 1 | `pays` `where: 'city'` culture 1 production 2, scope `garrisoned`. |
| The Camp Chaplains | modify: reworked | 1 | `windfallRider` `kill`, faith 1 × `fromOccasion: 'strength'`. |
| The Standing Army | modify: revised | 1 | Rarity rare to uncommon; effects unchanged. |
| The King's Levy | modify: wording | 1 | Text only (`periodicMuster` every 15, capital). |
| The Grain Tribute | add | 1 | `pays` `where: 'city'` food 1 production 1. |
| The Drill Grounds | add | 2 | An experience grant on a cadence to military units standing in your towns (experience only comes from combat today). |
| The Scaling Ladders | add | 1 | `combatLine` +4 `attack` `vsCity`, class `modelClass: 'melee'`. |
| The Funeral Games | add | 1 | `windfallRider` `death`, faith 1 × `strength`. |
| The Bards' Praise | add | 1 | `windfallRider` `kill` culture 1 × `strength`; `windfallRider` `camp` culture 15. |
| The Cattle Raid | add | 1 | `windfallRider` `camp`, grant `timed` 10 turns, `renews: true`, effect `pays` city food 3. |
| The Garrison Captains | add | 2 | `pays` count `garrison` to authority is writable but pays 0: `cardAuthority` must sum a town-scoped count over towns. |
| The Spear Makers | add | 2 | A unit-age narrowing on `UnitFilter` (age of the unit's unlocking technology) for `productionBonus`. |
| The Armed Colony | add | 2 | A founding condition (a military unit on or beside the hex) for `foundingRider` (`claims: 3` exists), and a rank grant to that unit. |
| The Outriders | add | 2 | A grant delivered to every town; `discovery` and `camp` riders pay one town today. |
| The Captured Arms | add | 2 | A `CountKind` for units killed this game; `Player.unitsKilled` skips barbarians (see ambiguities). |
| The Gathering Host | add | 2 | A "unit gained" `TallyOccasion` (`unitTrained` skips bought, free and conscripted units). The starting +2/+2 is a flat `pays`. |
| The Armourers' Secret | add | 2 | A grant of the military unit a finished technology unlocks; `WindfallGrantSpec.unit` knows only `randomMilitary`. |
| The Defiant Kingdom | add | 2 | An `EmpireCondition` "another empire holds more towns" (only the combat `vsWiderEmpire` exists); then `productionBonus` military 25. |
| The Hunting Grounds | add | 2 | A rule that speeds barbarian spawns near your cities (the clocks are world constants). The +4 is `combatLine` `ownTerritory`. |
| The Campaign Annals | add | 2 | A "rank earned" `TallyOccasion`. The starting +3 science is a flat `pays`. |

## Tier I

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| Martial Law | modify: revised | 1 | The two existing `pays` count `garrison` rows, raised to happiness 2 and food 4. |
| The General Staff | modify: revised | 1 | Keep the `renown` row; add `pays` `where: 'city'` production 3, scope `hasBuilding` barracks. |
| The Training Cadre | modify: replaced | 2 | An experience field on `unitStamp` (birth experience, scope `hasBuilding` barracks). |
| The Marching Camps | modify: reworked | 2 | A `BehaviorRuleId` "attacking keeps fortification", read where `applyCombat` calls `breakFortify`. |
| The Soldiers' Purse | modify: reworked | 2 | A per-rank amount on `upkeepRebate`, read off `rankOf`. |
| Honours of the Legion | modify: replaced | 2 | A "rank earned" `WindfallOccasion` that carries the unit's strength. |
| The Pacified Marches | modify: revised | 1 | `pays` `where: 'empire'` count `clearedCamps`: authority 1 and culture 5, each `max: 8`. |
| The Art of War | modify: revised | 1 | Text only ("Gaining"); `unitCompletion` already covers gained units. |
| Songs of the Fallen | modify: revised | 1 | Drop `defending: true` from the two `death` riders. |
| Walled Towns | add | 1 | `percentYields` food 15, scope `hasBuilding` stoneWalls (see ambiguities). |
| The Farming Garrisons | add | 2 | A `TileCondition` "a fortified military unit of yours stands here" (conditions cannot see units), and the yields-lens fingerprint for it. |
| The Swift Riders | add | 2 | A `BehaviorRuleId` "keeps its movement after attacking", class mounted (an attack zeroes `movesLeft` today). |
| The Open Muster | add | 2 | A "draft passed" `WindfallOccasion` (only a bead occasion today) and a best-melee unit grant. |
| The Captive Craftsmen | add | 2 | A pillage `TallyOccasion`; production via `pays` `where: 'capital'` (see ambiguities). |
| The Satraps | add | 2 | A card line in `explainPacification` (doubles the rate, scope `garrisoned`). |
| The Sack | add | 2 | A raze `WindfallOccasion` with `population`, for captured towns (razing exists as a command). |
| The Cleruchy | add | 2 | An on-draft unit grant (only charters act on draft; `onSlot` only grants a great person). |
| The Acropolis | add | 2 | Same gap as The Garrison Captains: `cardAuthority` must sum `buildingsInCity`, scoped to the capital. |

## Tier II

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| Armoury Guilds | modify: reworked | 2 | Delivery to "the nearest town a scope admits" (an Armoury); `death` × `strength` exists. |
| The Longships | modify: reworked | 3 | How does a player point a ship at the shore hex it pillages: a pillage button that then asks for an adjacent hex, or one button per improvement? The pillage command names no target today. |
| The Relay Stations | modify: deferred | 3 | What does the new order look like: a button on a unit in a connected city that opens a list, or a map pick, of the other connected cities? |
| War Reparations | modify: deferred | 2 | A peace `WindfallOccasion` and a per-war record of towns taken (on `WarState`). Peace itself exists (`setPeaceOffer`). |
| Commission: Take the City | modify: as built | 2 | A town-size floor on the counted capture, a figure for that town's people, and a reward building placed in that town. |
| The Fabricae | add | 2 | A `CityScope` "the garrison holds a Veteran or Elite". |
| The Valetudinaria | add | 1 | `unitStat` `heal` 15, `where: 'ownTerritory'`. |
| Living off the Land | add | 1 | `upkeepRebate` `free`, class military, `where: 'foreignTerritory'`. |
| The Longbowmen | add | 2 | An occasion for an attack made from range (only kills fire today). The strength is one `combatLine` +4 both, class ranged; it applies to the ranged stat in attack. |
| The Serried Ranks | add | 1 | `combatLine` +10 `defend`, class melee, `when: beside` class melee. |
| The Veterans' Roll | add | 2 | A lifetime record of ranks earned and a `CountKind` for it (then `pays` empire percent per helping). |
| The Conscription Rolls | add | 1 | `periodicMuster` every 10, `bestMelee`, `where: 'city'`, scope `populationAtLeast` 8. |
| The Hall of the Slain | add | 2 | A `CountKind` over `Player.unitsLost` (the record exists). |
| The Funeral Oration | add | 2 | A weariness rule: a percentage on the points your own unit losses add (`weariness.ts` has no card hook). |
| The Sagas | add | 2 | A lifetime record of hexes pillaged and a `CountKind` for it. |
| The Provincial Census | add | 2 | A `WindfallOccasion` when a town is pacified (`runUnrest` reports it, pays nothing), with `population`. |
| Spear-won Land | add | 2 | A `CountKind` over `Player.citiesCaptured` (the record exists). |
| The Castra | add | 2 | The fortified-unit `TileCondition` shared with The Farming Garrisons. Citadels: `pays` hex on `improvement` citadel. |
| The Tactica | add | 2 | An end-of-turn experience grant to units beside a great general, and the "rank earned" occasion (15 science). |
| Double Time | add | 2 | A meta rule that fires Orders' end-of-turn and every-few-turns effects twice, read in each such phase; plus the optional last-band field. |
| The State Forges | add | 2 | A best-melee unit grant on the `tech` occasion. |
| War Feeds Itself | add | 2 | An end-of-turn effect paying your units' hex yields from enemy territory. |

## Tier III

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| Total War | modify: revised | 1 | `combatLine` 8 to 5. |
| Commission: A Victor's Peace | modify: deferred | 2 | A goal "peace with, or destruction of, an empire you took two towns from in that war" (war record, peace and elimination moments), and a reward of a permanent Wildcard chair read by `chairCount`. |
| The Drill Masters | add | 2 | A starting rank on `unitStamp` (Veteran), which fires "rank earned". |
| The Plunder Trains | add | 2 | Delivery to the capital; pillage grants land in the town nearest the hex today. |
| The Yam | add | 2 | The pillage occasion carries no actor, so a `class` filter cannot ride; and a full heal of the acting unit. |
| The Tagmata | add | 2 | A `CombatCondition` on the piece's rank. |
| Up Through the Ranks | add | 2 | The "rank earned" occasion with a filter on the rank reached (Elite); `renown` with `renownFamily` exists. |
| The Arrière-ban | add | 1 | `windfallRider` `declareWar`, grant `timed` 10 turns, `percentYields` production 50. |
| The Keshik | add | 2 | A rank narrowing on `unitStat` (movement, mounted). |
| The Mural Crown | add | 2 | A "great person gained" occasion, a grant scaled by a count, and a `CountKind` for great people of one family. The +10 renown is `renown` family general. |
| The Victory Mint | add | 1 | `windfallRider` `capture`, gold 30 × `population`. |
| The Bakufu | add | 2 | A `CityScope` "a great general of yours stands here" (for `percentYields`) and a pacify-at-once rule. |
| Interior Lines | add | 2 | A `CombatCondition` "has not moved this turn". The road half is `rulePercent` `roadStepCost` −40. |
| Rally to the Standard | add: rule-breaker | 3 | When and how does a player choose where a gained unit appears: a prompt at completion, a rally setting per town, or always beside the nearest general? |
| Valhalla | add | 2 | A grant scaled by a count (`buildingsOfKind` monument) on `death`; grants scale only by the moment or a rate today. |
| The Chevauchée | add | 2 | A pillage grant that strikes enemy cities within three hexes, using the raider's strength (see ambiguities). |
| Danegeld | add | 2 | The peace occasion and a per-war record of hexes pillaged (with War Reparations). |
| The Devshirme | add | 2 | A town scope (captured) and a starting rank on `levy`; uses the levy menu. |
| Pax Romana | add | 2 | A pacify-at-once rule for towns you capture. Authority: `meterRule` `capturedCityCost` `delta: -1`. |
| The Regimental Schools | add | 2 | The per-turn experience grant (garrisoned units). Science: `pays` count `garrison` to science 2. |
| The Board of Ordnance | add | 1 | `conditionRule` `atWar`: two `pays` city count `population`, `within: 'city'`, `per: 3`, production 1 and science 1, scope `hasBuilding` barracks. |

The three `modify: cut` rows (Defensive Lines, The Captured Arsenals, The Landing Parties) are left out.

## Tier IV

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Proconsuls | modify: as built | 2 | A scoped `meterRule` that sets a town's cost to nothing; `cityCost` takes only a `delta`, floored at one. |
| Commission: The Grand Campaign | modify: as built | 2 | A figure for the people of the towns captured while the card is seated (a tally that sums population). |
| Circumvallation | modify: deferred | 3 | How is "you can see which rival cities are raising one" shown: a mark on rival city banners, a list on the foreign courts screen, or both? (The siege half is automatic.) |
| Commission: Hold the Capitals | modify: as built | 2 | A record of whose original capital a town was (`City.originalCapital` is a bare flag), so your own does not count. |
| Spolia | modify: as built | 2 | A per-empire bank of Opus hammers kept until an Opus is begun (today they go to the capital). |
| The Legions' Labour | modify: deferred | 2 | A disband occasion paying half the unit's cost into the town's wonder or Opus, skipped for `freeUpkeep` units. The disband command exists. |
| The Nation in Arms | modify: wording | 1 | Text only. |
| Commission: The Captured Marvel | modify: as built | 2 | A figure for the one town that met the goal (not every town taken that turn), and the capital-owner record. |
| The Horde | add | 2 | A pillage grant that also pillages every enemy improvement beside the hex. |
| Vae Victis | add | 2 | An `AmplifierTarget` that doubles every rider on `capture` (a rider's `percent` scales only the occasion's own payout). |
| The Varangian Guard | add: rule-breaker | 2 | A rule allowing a second attack a turn, narrowed by rank (`hasAttacked` allows one). |
| The Glorious Dead | add: rule-breaker | 2 | The weariness rule at −100% (with The Funeral Oration). |
| The Harrying | add: rule-breaker | 2 | A pillage grant that starts unrest in an adjacent ungarrisoned rival town (`startUnrest` is called only by a capture). |
| The Great Bombards | add: rule-breaker | 2 | A rule that a siege unit's blow on the walls beat takes the town to its floor. |

## Shared with another deck

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| Rites of Passage | modify: revised | 1 | Text only ("Gaining"); `unitCompletion`, class military, faith 12. |
| The Sword of State | add | 2 | The on-draft unit grant (with The Cleruchy). |
| Copying the Enemy | add | 2 | Kill facts that carry the fallen unit's type, a "you cannot build it yet" filter, and a grant into that technology's `Player.techProgress`. |
| The Muster of the Fields | modify: merged | 1 | `levy` `use: 'muster'`, add `minPopulation: 5`; move the row to `common.json` with decks expansionist and dominion. |
| The Crusader Orders | modify: as built | 1 | No effect change if the 30-pressure lump is accepted as the text's meaning (see ambiguities). |
| Carried-Off Scholars | add | 1 | `windfallRider` `capture`, science 10 × `population`. |
| Looted Art | add | 2 | A capture measure (great-person works and wonders inside the town's borders), and `renown` scaled by a measure (only yield grants scale today). |
| Mercenary Contracts | modify: deferred | 3 | How is hiring offered: a "Hire" line beside "Buy" on the purchase rail, for the melee and the mounted unit? And how does a hired unit show the turns until it leaves? |
| The New Code | add | 2 | A grant that opens an Order draft at no cost, with a ten-turn stamp (C3 removes the reward hands that could have done it). |

## Doctrines

All Doctrines also wait for C3's offer.

| Doctrine | Tier | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Marian Reforms | I | 2 | `upkeepRebate` free, military, exists. Half speed needs an empire-stage `productionBonus` (every production line is city stage today). |
| The Steppe Confederacy | I | 1 | `meterRule` `borderFreezeExempt` `value: 1`; `conditionRule` `authorityNegative`: `productionBonus` unit mounted 50. |
| The Soldiers' Share | I | 2 | A capture grant that heals units within three hexes and raises each a rank (`healAll` has no radius), and a rule that refuses founding. |
| The Consular Roads | I | 2 | Pacify-at-once for a scope (`all` of `connected`, `garrisoned`). The yields are `pays` city science 5 culture 5. |
| The Servian Reforms | I | 2 | A military unit cost percentage in `explainUnitCost` (only `settlerCost` exists; buying follows the cost), and a "units gain no experience" rule. |
| Centurions | II | 2 | A strength line per adjacent Elite (a rank-aware adjacency count), and `upkeepSurcharge` narrowed by rank. |
| The Plunder Economy | II | 2 | Pillage facts with the raider's strength, and delivery to every town. The −4 is `combatLine` `attack` `vsCity`, −4. |
| The Strategoi | II | 2 | An `AmplifierTarget` for the great general's aura. Renown: `cityRenownPercent` 30 `where: 'empire'`. Citadels: `pays` hex `percent: 100` (see ambiguities). |
| Weight of Numbers | II | 2 | A record of attacks made on a target this turn, and a `CombatScaleCount` for it. `noFortify` exists. |
| The Laws of Lord Shang | II | 2 | A transfer of a town's food surplus into the hammers of its front-row military unit. |
| Total Mobilisation | III | 2 | A `periodicMuster` that costs a citizen. The rest: `conditionRule` `atWar`, and `atPeace` with `rulePercent` `growthSurplus` 25. |
| Combined Arms | III | 2 | A rule "a siege unit beside a friendly melee unit cannot be attacked in melee". The strength is two `combatLine`s, one `when: beside` siege. |
| The Universal Monarchy | III | 2 | A cost multiplier for towns you founded (a percentage `meterRule` and a "not captured" scope). `capturedCityCost` `value: 0` exists. |
| The Fortress Empire | IV | 2 | A town-scoped `CountKind` of fortified military units inside the town's borders. The +5 is `combatLine` `when: fortified`. |
| The Scourge of God | IV | 2 | Timed effects hung on the acting unit by a pillage (no grant can do this; `landfall` does it only on a landing). The capital's +100% is a `timed` grant with `renews`. |
| The Landsturm | IV | 2 | The "draft passed" occasion with a unit in every town of five or more, and a `CombatCondition` "near a great general" (a `UnitFilter` cannot name a family). |

## Proposed build batches

Every group-2 batch edits `src/sim/statecraftData.ts`, `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts`, `data/decks/dominion.json`, `docs/decks/dominion.md` and `test/sim/decks/dominion.test.ts`. They cannot run side by side; land each before the next starts. The data batches touch only data, the sheet and its test, and can run as one agent.

**Data batches (group 1, 34 cards):**
- **D0a, Tier 0 (13):** Blooded Spears, Muster Rites, The Horse Herds, Battle Honours, Sword and Plough, The Camp Chaplains, The Standing Army, The King's Levy, The Grain Tribute, The Scaling Ladders, The Funeral Games, The Bards' Praise, The Cattle Raid.
- **D0b, Tiers I and II (10):** Martial Law, The General Staff, The Pacified Marches, The Art of War, Songs of the Fallen, Walled Towns, The Valetudinaria, Living off the Land, The Serried Ranks, The Conscription Rolls.
- **D0c, Tiers III and IV, shared, one Doctrine (10):** Total War, The Arrière-ban, The Victory Mint, The Board of Ordnance, The Nation in Arms, Rites of Passage, The Muster of the Fields, The Crusader Orders, Carried-Off Scholars, The Steppe Confederacy (after C3). D0c also edits `common.json` and `expansionist.json` (the levy row moves).

**Shape batches (group 2, 87 cards), in the suggested order:**

| Batch | Cards | New shapes | Files beyond the shared six |
|---|---|---|---|
| **D1, ranks: earning them (13)** | The Drill Grounds, The Regimental Schools, The Tactica, The Training Cadre, The Drill Masters, The Devshirme, The Armed Colony, The Soldiers' Share, The Servian Reforms, The Campaign Annals, Honours of the Legion, The Veterans' Roll, Up Through the Ranks | "rank earned" occasion and tally (with a rank filter and the unit's strength); `Player.ranksEarned` and its count; a drill effect (experience on a cadence to units in towns, in garrisons, beside a general); starting experience or rank on `unitStamp` and `levy` (plus a levy town scope); a rank grant from a founding and from a capture; capture heal within a radius; rules for no experience and no founding; a military unit cost line | `ranks.ts` and its pin test, `state.ts` (`createUnit`), `turn.ts` (drill phase), `combat.ts` (capture), `cities.ts` (`foundCityAt`, `explainUnitCost`), `commands.ts` (found refusal), `levies.ts` |
| **D2, ranks read, and combat rules (13)** | The Soldiers' Purse, The Fabricae, The Tagmata, The Keshik, The Varangian Guard, Centurions, The Marching Camps, The Swift Riders, Interior Lines, Weight of Numbers, Combined Arms, The Great Bombards, The Strategoi | rank tests (combat condition, `unitStat`, upkeep per rank, surcharge by rank, garrison-rank scope, adjacent-Elite count); rules: keep fortification, move after attacking, second attack, siege screened from melee, walls in one blow; "has not moved" condition; attacks-on-target record; general-aura amplifier | `combat.ts` (`planCombat`, `applyCombat`), `upkeep.ts`, `ranks.ts` (readers) |
| **D3, pillage and grant delivery (11)** | The Captive Craftsmen, The Sagas, The Plunder Trains, The Yam, The Chevauchée, The Horde, The Harrying, The Plunder Economy, The Scourge of God, The Outriders, Armoury Guilds | pillage facts (actor, strength); pillage tally and lifetime record; grant delivery to every town, the nearest town a scope admits, or the capital; full heal; timed effects on the acting unit; pillage grants that strike cities, spread to neighbours, or start unrest | `improvements.ts` (`pillageAt`), the windfall composition and `payWindfallGrants`, `combat.ts` (the strike), `unrest.ts`, `state.ts` |
| **D4, unrest, authority, and "this game" counts (12)** | The Satraps, The Provincial Census, The Bakufu, Pax Romana, The Consular Roads, The Proconsuls, The Universal Monarchy, The Garrison Captains, The Acropolis, The Captured Arms, The Hall of the Slain, Spear-won Land | pacification card line; "town pacified" occasion; pacify-at-once rule (on a scope, and at capture); general-present scope; zero-cost scoped meter rule; cost multiplier for founded towns; town-by-town authority counts; counts over `unitsKilled`, `unitsLost`, `citiesCaptured` | `unrest.ts`, `meters.ts`, `combat.ts` (`captureCity`) |
| **D5, units gained and new moments (14)** | The Gathering Host, The Armourers' Secret, The State Forges, The Open Muster, The Landsturm, The Cleruchy, The Sword of State, The New Code, Total Mobilisation, The Sack, The Longbowmen, Copying the Enemy, The Mural Crown, Valhalla | "unit gained" tally (conscripts included); unit grants (best melee, unlocked by a technology, one per town); occasions: draft passed, raze, ranged attack, great person gained; on-draft grant; a free-draft grant with a stamp; a muster that costs a citizen; kill facts with the fallen type and a technology-progress grant; grants scaled by a count; a per-family great-people count; "near a great general" condition | `cities.ts` (`realiseItem`), `levies.ts`, `statecraft/draft.ts` (pick, skip), `diplomacy.ts` (raze), `combat.ts`, `tech.ts`, `greatPeople.ts` |
| **D6, captures, commissions and the end of a war (11)** | Commission: Clear the Frontier, War Reparations, Danegeld, Commission: A Victor's Peace, Commission: Take the City, Commission: The Grand Campaign, Commission: The Captured Marvel, Commission: Hold the Capitals, Spolia, Vae Victis, Looted Art | per-war record on `WarState` (towns taken, hexes pillaged); peace and elimination occasions; commission goals and rewards (citizens, a building in the taken town, a permanent chair); a captured-population tally; whose original capital; an Opus bank; a capture amplifier; a works-and-wonders capture measure and scaled renown | `wars.ts`, `diplomacy.ts`, `combat.ts` (`captureCity`), `improvements.ts`, `commissions.ts`, `statecraft/draft.ts` (`chairCount`), `state.ts` |
| **D7, economy rules and Double Time (13)** | The Marian Reforms, The Laws of Lord Shang, The Spear Makers, The Defiant Kingdom, The Hunting Grounds, The Farming Garrisons, The Castra, The Fortress Empire, War Feeds Itself, The Legions' Labour, The Funeral Oration, The Glorious Dead, Double Time | empire-stage `productionBonus`; food-to-hammers transfer; unit-age filter; "rival has more towns" condition; barbarian spawn rule near cities; fortified-unit hex condition; fortified-units count; end-of-turn hex harvest; disband occasion; weariness percentage; Double Time's meta rule and last band | `yields/town.ts`, `cities.ts` (growth), `barbarians.ts`, `yields/hex.ts` and the render3d yields-lens fingerprints, `turn.ts`, `commands.ts` (disband), `weariness.ts`, `statecraft/draft.ts` (`eligibleFor`) |
| **D8, the last Doctrines (8)** | The Soldiers' Share, The Servian Reforms, Centurions, The Plunder Economy, The Strategoi, Weight of Numbers, Combined Arms, The Scourge of God | the heal and the rank around a hex; timed effects on the unit that acted; the raider's strength on a pillage; rules: no founding, no experience, siege screened from melee; a unit cost line for a class; counts of adjacent Elites and of this turn's attacks on a target; a surcharge by rank, waived for a free unit; the aura amplifier; a share of the whole hex | `combat.ts`, `ranks.ts` and its pin test, `improvements.ts` (`pillageAt`), `tech.ts` (`buildError`), `cities.ts` (`foundingError`, `explainUnitCost`), `yields/hex.ts`, `state.ts` |

**Overlaps and order:**
- `combat.ts`: D1, D2, D3, D4, D5, D6. `turn.ts`: D1, D7. `cities.ts`: D1, D5, D6, D7. `unrest.ts`: D3, D4. `improvements.ts`: D3, D6. `diplomacy.ts`: D5, D6. `statecraft/draft.ts`: D5, D6, D7. `ranks.ts`: D1, D2. `commands.ts`: D1, D7. `state.ts` (new `Player` records): D1, D3, D6.
- D5's The Landsturm uses D3's delivery field, and D6's Danegeld uses D3's pillage hook, so D3 goes before both.
- Double Time reads every end-of-turn Order effect, including D1's drill effect and D7's War Feeds Itself, so it goes last.
- Every Doctrine needs C3's offer first. Double Time also needs the last-band field. The eight Doctrines that D1 to D3 listed waited for it and were built together in D8.
- The five group-3 cards keep their sheet rows. The Relay Stations, Circumvallation and Mercenary Contracts already have deferred data rows. Rally to the Standard needs a new deferred row. The Longships' data row (`marineDrill`) still plays Marine Drill and would become a deferred row.

## Rule ambiguities, with a recommended reading

1. **What counts as gaining a unit** **Ruled by the user, 2026-10-16:** conscripts count (*"conscripts should pay cards that pay 'gaining a unit'"*). A unit raised by The General Levy pays every card that pays on gaining a unit; it still does not count as trained. The note as written: (Muster Rites, The Art of War, Rites of Passage, The Gathering Host, the rank cards). Today a conscript from The General Levy pays no completion riders, and a unit taken from someone else (Blood Brothers, a captured civilian) is not gained. **Recommend:** a conscript counts as gained (it still does not count as trained); a unit taken from someone else does not. Civilians count, as Muster Rites pays for them today. **Applied in D5:** the `unitGained` tally (The Gathering Host) counts every unit `realiseItem` brings into being: trained, bought, free and conscripted units, civilians included. Those are the units the gaining riders already paid for (Muster Rites). A unit taken from someone else does not pass through `realiseItem`, so it does not count.
2. **Upkeep on units a card raises when the text is silent** (The Conscription Rolls, The State Forges, The Open Muster, The Armourers' Secret, The Landsturm, Total Mobilisation, The Sword of State, The Cleruchy). Today every unit a card raises for free costs no upkeep. **Recommend:** keep that rule, and add "It costs no upkeep" to those texts, as The King's Levy and The Nation in Arms already say it. **Applied in D5** to The State Forges, The Open Muster, The Armourers' Secret, The Landsturm, Total Mobilisation and The Sword of State. The Cleruchy's text does not say it, because a settler never costs upkeep.
3. **Double Time: which effects repeat.** **Ruled by the user, 2026-10-16:** the smaller reading, Orders only (*"the smaller reading, it should only affect orders"*). The same pass ruled that the last tier (tier 38, the old tier 45) was meant for a fifth age and stays unimplemented (*"just leave the last tier as unimplemented"*), so Double Time is dealt in Tiers II and III only (*"lets have double time be offered in both tier 2 and tier 3 as a rare"*). The note as written: **Recommend:** periodic boons, periodic musters (The King's Levy, The Conscription Rolls, The Nation in Arms) and the new end-of-turn Order effects (The Drill Grounds, The Regimental Schools, The Tactica's experience, War Feeds Itself). Not repeated: per-turn renown trickles (The General Staff, The Mural Crown), yields, timed effects, commissions and Doctrines. A muster that triggers twice raises two units. **Applied in D7** (`MetaRuleId` `turnEffectRepeats`, read by `turnEffectRepeats`): a seated Order's periodic boon pays twice, its periodic muster raises two units in each town, its drill gives twice the experience, and its harvest pays twice. A Doctrine's muster (Total Mobilisation) happens once. The row's last band is `OrderDef.lastBand`, which `eligibleFor` reads; the Compendium prints both bands.
4. **The Chevauchée: how the damage is done.** The sheet's own reading is "a strike at half the pillaging unit's strength, with no damage back". **Recommend:** each city of an empire you are at war with, within three hexes, takes a blow through the normal combat damage sum with the raider at half strength; no counter-blow; it can wear the walls down to the floor but never takes the town. **Applied in D3** (`strikeTownsNear`, `combat.ts`): the raider's figure is its roster strength, its training and its rank, at half. One roll from `state.rng` for each town struck, in founding order; a town already on its floor is skipped and draws nothing.
5. **The Horde: do the extra hexes count as pillages?** **Recommend:** yes. Each neighbouring improvement torn out counts for the pillage tally, The Sagas and Danegeld, and pays the pillage riders, as the builds doc's "multiplies every pillage pay-off" says. The raider's movement and heal are spent and paid once. **Applied in D3:** the raider's movement and heal are spent once, and the hexes the raid spreads to do not spread again. Only works on ground an empire at war with the raider owns are burnt. **Applied in D6** for Danegeld: the war's count is written in `payPillage`, so each hex the raid spreads to counts.
6. **Vae Victis: which capture rewards double.** **Recommend:** every windfall rider on the capture (yields, renown, pressure, Spolia's hammers). Not doubled: timed effects (Hegemony's +30% would stack), commission rewards, and Doctrine effects (The Soldiers' Share). **Applied in D6** (`AmplifierTarget` `captureRewards`, read in `windfallPayout`): the yields, renown and faith pressed of every Order's capture rider. A Doctrine's rider, a timed effect, a unit, a heal, a free draft and a commission's reward are not doubled.
7. **The Captured Arms: do barbarian kills count?** `Player.unitsKilled` leaves them out. **Recommend:** count them, with a record of its own, since a Tier 0 card would otherwise pay almost nothing. The risk is farming camps with no cap. **Applied in D4:** a record of its own, `Player.enemiesKilled`, counts every kill, the wild's raiders included. The wild keeps no such record.
8. **The Hunting Grounds: what spawns faster.** New camps appearing (`campEveryTurns`, a world clock with a camp cap) or each camp raising its raiders (`unitEveryTurns`). The 2026-10-15 note reads it as more camps. **Recommend:** camps within ten hexes raise their units 50% faster. That can be done camp by camp; new-camp placement is world-wide. **Applied in D7** (`CardRule` `campMuster` with a `range`, read in `musterCamps` through `campMusterPercent`): a camp within ten hexes of a holder's town waits two thirds of the rule book's turns between musters, rounded (three turns instead of five).
9. **The Armed Colony: which unit, and where.** **Recommend:** a military unit of yours on the founding hex or one of the six around it; only the first in unit order becomes a Veteran; a unit already Veteran or Elite gains nothing.
10. **The Armourers' Secret:** a technology that unlocks two military units, or a unit needing a resource you lack. **Recommend:** one of each military unit it unlocks, granted even without the resource, in the capital. **Applied in D5** (`grantedUnitTypes`, `statecraft/evaluator.ts`): "military" is the land military category, so ships are left out, as the game's words "military units" leave them out. A unit sold only for a currency, a great person, and another leader's unique unit are left out too.
11. **The Defiant Kingdom: which empires are compared.** **Recommend:** only empires you have met, so the card does not reveal unmet empires. **Applied in D7** (`EmpireCondition` `rivalHoldsMoreTowns`): read from `Player.metSeats`.
12. **The Spear Makers: a unit's age.** **Recommend:** the age of the technology that unlocks it; a unit no technology unlocks is first-age. **Applied in D7** (`UnitFilter.ageAtMost`, read through `unitAge`).
13. **Walled Towns: is a Palisade a wall?** **Ruled by the user, 2026-10-16:** it reads every defensive building, the Palisade included (*"have it read defensive buildings (to include palisades and other defensive structures)"*). The `defensiveBuildings` count already treats a building that raises a town's defence or hit points as one. The note as written: Stone Walls needs a Palisade, and the user moved the card to Tier I because "walls unlock later". **Recommend:** Stone Walls, as Defensive Lines used.
14. **The Fyrd beside The Muster of the Fields.** Removed by the user on 2026-10-16 (*"let's remove the fyrd for now"*), so this needs no reading. The note as written: both are the same levy use; the levy menu keeps the first card's town floor, so held together the result depends on chair order, and The Fyrd adds nothing. **Recommend:** the lowest floor among held cards applies, and ask whether The Fyrd should differ (no waiting period, or a Veteran unit).
15. **The Cleruchy: does it take a chair?** **Recommend:** treat it like The Sword of State: the settler arrives on draft, and seated the card does nothing. **Applied in D5** (`OrderDef.onDraft`): the settler and The Sword of State's unit are raised in the capital when the card is drafted, through `raiseOnDraft` (`cities.ts`). With no capital, or no free hex beside it, nothing is raised.
16. **The New Code: is the free draft a draft?** `PlayerStatecraft.drafts` is the tier ladder. **Recommend:** it does not raise the draft count or the next draft's cost. If a draft is already open, it is skipped and the ten-turn stamp is not written. **Applied in D5** (`openFreeDraft`, `statecraft/draft.ts`): the draft is an Order offer of the seat's current tier. A free draft is skipped when an Order or Doctrine offer waits, or when the seat has no card left to draw.
17. **The Soldiers' Share:** settlers, Elites, and "earned". **Recommend:** settlers cannot be trained or bought while it is held; an Elite gains nothing; a rank raised this way counts as earned (it pays Honours of the Legion). **Applied in D8** (`WindfallGrantSpec.healWithin` and `rankWithin`, delivered by `rallyAround`; the rule `noFounding`, refused in `foundingError` and in `buildError` for every unit that founds cities). The distance is counted from the captured town's hex. A civilian is healed and has no rank to earn. A settler a card raises (The Cleruchy) still arrives, and cannot found while the law holds.
18. **The Laws of Lord Shang: how food becomes hammers.** **Recommend:** the town's growth surplus, as the growth channel computes it, is added one for one to the front-row unit's hammers after the production percentages, as its own labelled line; the food basket gains nothing that turn. **Applied in D7** as step 14 of `docs/yields.md` (`explainSurplusMoved`, the `surplusToProduction` effect): after both stages and the unrest gate, so the empire's steps are now 15 to 20. The surplus is `channelSurplus` (`cities.ts`), and `growthSurplus` banks none of it in a turn the move happens. A deficit is never moved (reading 65 for a town in unrest).
19. **Centurions: does the aura stack?** **Recommend:** +3 for each adjacent Elite, no cap (six neighbours at most); an Elite does not count itself. **Applied in D8** (`CombatScale.rank`, read by `adjacentFriendlies`): the line pays attacking and defending. The upkeep is `upkeepSurcharge` with `rank: 'elite'`.
20. **The Varangian Guard: movement for the second attack.** An attack zeroes movement today. **Recommend:** an Elite's first attack costs one point of movement, as a hit-and-run hull's does, so it can attack again.
21. **The Swift Riders: what an attack costs.** **Recommend:** one movement point, the rest kept, as for hit-and-run hulls.
22. **Interior Lines: "has not moved".** **Recommend:** the unit still has its full movement allowance, so no new record is kept.
23. **War Feeds Itself.** **Recommend:** your military units on hexes owned by an empire you are at war with; the hex's yield read as your empire sees it; gold, science, culture and faith to your banks, food and production to your nearest town; the owner loses nothing. **Applied in D7** (`harvest`, run by `harvestEnemyHexes` in the drill phase): delivered through `payWindfallGrants`, so food and production land in the town nearest the unit. "Military" is the land military category (`category: 'military'`), as on every Dominion row.
24. **The Funeral Oration and The Glorious Dead.** **Recommend:** both change only your own weariness reading, not the enemy's offset. The Funeral Oration halves unit losses only; The Glorious Dead removes unit and town losses ("your losses"). **Applied in D7** (`CardRule` `unitLossWeariness` and `townLossWeariness`, read in `wearinessBetween`). The scaled points are rounded down (reading 66).
25. **The Farming Garrisons and The Castra: the town's own hex.** **Recommend:** a fortified garrison in a town counts for the town's centre hex. **Applied in D7** (`TileCondition` `fortifiedUnit`, answered by `GroundFacts.fortified`): the centre's ground is read through the same hex lines (`explainCentreYield`), so a fortified garrison counts there with no extra rule.
26. **The Captive Craftsmen: where its production goes.** An empire line has no hammer basket. **Recommend:** the capital. **Applied in D3.**
27. **The Bakufu and The Consular Roads: "pacified at once".** **Recommend:** the unrest ends in the unrest phase at the end of the turn in which the condition holds, as the earlier King's Peace draft read it. Pax Romana ends it at the moment of capture, which fires The Provincial Census at once. **Applied in D4:** The Bakufu and The Consular Roads end the unrest in the unrest phase (`CityRuleId` `pacified`); Pax Romana ends it in `captureCity` (`ActionRuleId` `pacifyOnCapture`). Every way unrest ends goes through `endUnrest`, which pays The Provincial Census.
28. **The Strategoi: "citadel yields".** The existing hex percentage doubles only the citadel's own +2 production, not the lines cards put on citadels. **Recommend:** double everything the citadel hex pays, which needs a hex-wide doubler instead. **Applied in D8** (`CardPaysEffect.wholePercent`, the hex's last line, step 2's item 8 in `docs/yields.md`). "+30% renown" is the empire's recurring renown (`cityRenownPercent` with `where: 'empire'`, as Cult of Heroes reads it), and the aura is doubled through the amplifier target `generalAura`.
29. **The Drill Grounds: the cadence.** **Recommend:** the world calendar (every fourth turn, for military units standing in a town at that end of turn), like the periodic musters.
30. **Commission: Take the City: which population.** A capture halves the town. **Recommend:** the floor and the reward both read the town as it stood before the capture. **Applied in D6:** a capture does not shrink a town in this game, so the town as it stood is the town as it stands. The goal keeps the town's citizens at the capture (`OrderTally.people`), and the reward reads that figure.
31. **War Reparations, Danegeld and A Victor's Peace.** **Recommend:** "cities taken in that war" are towns of that empire you took by force during the war and still hold at the peace; "hexes pillaged" are that empire's hexes; "destroy it" means it was eliminated while you were at war with it. **Applied in D6** (`WarState.taken` and `.pillaged`, read by `warSpoils`). A town handed back at the peace table is no longer held, so it does not count.
32. **The Crusader Orders: press or convert.** Built as a 30-pressure lump. **Recommend:** keep the lump and change the status to implemented; converting the town outright would be a new grant.
33. **The Mural Crown: is the new general counted?** **Recommend:** yes, a general gained now counts toward its own payout. **Applied in D5:** `Player.greatPeopleByFamily` is raised before the riders pay.
34. **The Harrying.** **Recommend:** "beside" means next to the town's centre hex; a town already in unrest keeps its current record. **Applied in D3:** the town's owner must be at war with the raider, and "no garrison" is the unrest rule's own reading (`unrestGarrison`).
35. **The Arrière-ban: two declarations in ten turns.** **Ruled by the user, 2026-10-16:** a second declaration restarts the ten turns instead of stacking (*"just have arriere-ban refresh after declaring war twice instead of stacking"*). The note as written: **Recommend:** the window renews instead of stacking to +100%.
36. **Copying the Enemy: "cannot yet build".** **Recommend:** the technology that unlocks it is not yet researched; a unit no technology unlocks pays nothing. **Applied in D5** (`unbuiltTechFor`). A kill of a unit you can already build does not use up the turn.
37. **The Landsturm: "beside a great general".** **Recommend:** the six hexes around a great general, which is what "beside" means elsewhere on the sheet, not the aura's two-hex reach. **Applied in D5** (`CombatCondition` `besideGreatGeneral`): your own great general on one of the six hexes around the unit.

38. **The Plunder Trains: where the grant lands.** **Recommend:** the capital, as the user's text says. **Applied in D3** (`WindfallGrantSpec.toCapital`).
39. **The Garrison Captains: what a garrisoned unit is.** **Recommend:** a combat unit of the owner's standing in one of the owner's towns, the `garrison` count Martial Law reads. **Applied in D4.**
40. **The Acropolis: what a building in the capital is.** **Recommend:** every building the capital holds, the Palace and wonders included. **Applied in D4.**
41. **The Hall of the Slain and Spear-won Land: what counts.** **Recommend:** the existing records: a unit lost in battle to anyone, the wild included (`Player.unitsLost`), and a town taken by force (`Player.citiesCaptured`). A disbanded unit, a captured civilian and a town ceded at a peace do not count. **Applied in D4.**
42. **The Satraps: "twice as fast".** **Recommend:** one card line worth the town's other pacification lines, rounded down. **Applied in D4.**
43. **The Provincial Census: which population.** **Recommend:** the town's population when its unrest ends, so a town pacified at capture reads the population the capture left. **Applied in D4.**
44. **The Bakufu: "standing in a town".** **Recommend:** the general is on the town's own hex. The general's pacification reach (two hexes) does not count. **Applied in D4.**
45. **The Proconsuls and The Universal Monarchy: "cost no authority".** **Recommend:** the town's line costs nothing, whatever else the cards say: a set price replaces the percentages and the deltas. "Towns you capture" includes puppets. **Applied in D4.**
46. **The Universal Monarchy: "towns you found".** **Recommend:** towns never taken by force. The doubling applies to the ladder's price before any delta. The settler's preview does not show it, which is the stated cut for every scoped city price. **Applied in D4.**
47. **Pax Romana: "1 less authority".** **Recommend:** the captured price falls by one (`capturedCityCost`), never below one, so a puppet's price falls by one too. **Applied in D4.**
48. **The Sack: "a town you captured".** **Recommend:** a town taken by force (`City.capturedOn`), as reading 41 reads "captured". A town ceded at a peace does not count. A town taken by force and later ceded to you still counts, because the town keeps no record of a later cession. The production lands in your nearest other town. **Applied in D5.**
49. **The Longbowmen: "ranged units".** **Recommend:** every unit that attacks from range, siege units and ships included (the `ranged` filter, which the card prints as "ranged units"). The one strength line adds +4 to the figure the fight uses: the ranged strength when the unit shoots, and the strength when it is attacked. The culture is paid for every attack from range, at a unit or a town. **Applied in D5.**
50. **The Open Muster and The Landsturm: "pass a draft".** **Recommend:** passing an Order draft hand (`skipOrderOffer`). Passing on a Doctrine offer does not count. **Applied in D5.**
51. **The Landsturm and Total Mobilisation: which towns.** **Recommend:** the towns of five (or six) citizens or more when the units are raised, one unit each. A town with no free hex beside it raises nothing, and under Total Mobilisation it then keeps its citizen. A town of one citizen cannot pay. **Applied in D5.**
52. **Total Mobilisation: "while at war" and "every five turns".** **Recommend:** at war with another empire (the `atWar` condition), on the turns of the world calendar that divide by five, as the other musters (reading 29). "Grow 25% faster" is +25% to the food surplus that goes toward growth (`growthSurplus`). **Applied in D5.**
53. **Valhalla: what counts.** **Recommend:** the towns that hold a Monument when the unit dies (`buildingsOfKind`). "Dies" is the moment The Funeral Games pays on: a unit of yours lost in a fight. **Applied in D5.**
54. **The State Forges, The Open Muster, The Sword of State and The Landsturm: "the best melee unit you can build".** **Recommend:** `bestMeleeFor`, the reading The King's Levy uses. If there is none, nothing is raised. The unit is free: it costs no upkeep and does not raise the price of the next unit of its type. It counts as gained, so the cards that pay on gaining a unit (Muster Rites, The Art of War) pay on it. **Applied in D5.**
55. **Total Mobilisation beside Expansionist's levy cards: is its citizen a levy?** **Recommend:** no. The muster takes the citizen through `loseCitizen`, as a levy does, but it is not a levy. It does not count for The Labour Rolls (`Player.citizensLevied`), it does not start or share the town's levy wait, its unit carries no levy mark (The Trained Bands, The General Levy), and it hangs no levy aftermath (Seasonal Levies, The Gleaners, The Labour Feasts). **Applied in D5**, and found at the merge with Expansionist batch E1.
56. **Commission: Hold the Capitals and The Captured Marvel: "your own" original capital.** **Recommend:** the first town the empire founded, recorded at its founding (`City.originalCapitalOf`). It never counts for its founder, even taken back. Hold the Capitals counts every other empire's original capital you hold, however you came to hold it; The Captured Marvel counts only one taken by force. **Applied in D6.**
57. **Spolia: "kept until you do".** **Recommend:** the production is kept on the empire (`Player.opusBank`) and moves into the town raising the Opus at the start of the next production phase (`releaseOpusBanks`). Kept production is never lost. If two towns raise an Opus, the first in founding order gets it, which is where Spolia's production goes when one is raised already. **Applied in D6.**
58. **Commission: Clear the Frontier: "2 population in your capital".** **Recommend:** two citizens through the population windfall, which pays the growth riders for each one, as every granted citizen does. With no capital, nothing. **Applied in D6.**
59. **Commission: Take the City: "a free Barracks in that city".** **Recommend:** the Barracks goes up in the town that met the goal while the empire still holds it, even before the empire can build one. If the town is lost or razed, or already has a Barracks, nothing replaces it. **Applied in D6.**
60. **Commission: The Grand Campaign: "those cities' total population".** **Recommend:** the citizens of the three towns the goal counted, each as it stood when taken. A fourth town taken before the reward pays does not add. **Applied in D6.**
61. **Commission: A Victor's Peace: the chair.** **Recommend:** a Wildcard chair added after the government's chairs, as The King's Friends' chair is, kept through every adoption and never lost. The council screen draws it with no new control. **Applied in D6** (`PlayerStatecraft.chairsWon`, read by `chairCount`).
62. **Looted Art: "inside its borders".** **Recommend:** the great-person works on the hexes the town owns, and the world wonders in the town, read before it changes hands. **Applied in D6.**
63. **War Reparations and Danegeld: when the peace pays.** **Recommend:** when the peace is signed, after its terms are honoured and the war is closed. Food or production a peace rider pays lands in the capital. An empire that is destroyed makes no peace, so neither card pays then. **Applied in D6.**
64. **The Hunting Grounds: two holders near one camp.** **Recommend:** the camp musters at the faster of the two speeds; the two do not add. **Applied in D7** (`campMusterPercent` takes the largest percentage that reaches the camp).
65. **The Laws of Lord Shang: a town in unrest.** **Recommend:** it moves nothing. Its production is stopped (the unrest gate), so its food goes on toward growth. **Applied in D7.**
66. **The Funeral Oration: "count half".** **Recommend:** half of the unit points, rounded down, so one lost unit counts nothing and three count one. Town losses count in full. **Applied in D7.**
67. **The Farming Garrisons, The Castra and The Fortress Empire: "a fortified military unit".** **Recommend:** a unit of the empire's own of the land military category (`category: 'military'`, the word every Dominion filter uses): a scout counts, a ship and a civilian do not, and another empire's unit standing on your hex does not. **Applied in D7** (`isFortifiedSoldier`).
68. **The Marian Reforms beside other empire-stage percentages.** **Recommend:** the −50 adds with the empire's other production percentages at that stage (Entry XVII: additive inside a stage), so with +10% from the meters a town builds military units at 60% of what its own bonuses made, not 55%. **Applied in D7.**
69. **The Legions' Labour: "in a town" and "its production cost".** **Recommend:** the unit stands on the town's own hex, and the cost is what the unit costs the empire to build now (`unitProductionCost`). Half of it lands in that town's basket, toward the wonder or the Opus at the front of its queue. A unit raised by a levy is not a free unit, so it counts. **Applied in D7.**
70. **The Servian Reforms: "military units" and "never gain experience".** **Recommend:** "military units" is the land military category (`category: 'military'`), as on every Dominion row, so ships are not cheaper. The 25% is one line of `explainUnitCost`, after the escalation ladder, floored once and never below one, so a purchase follows it. No source of experience pays while the law holds: a fight, a drill, a starting grant or a raised rank. Experience a unit earned before is kept. **Applied in D8** (`CardRule` `unitCost` with a `class`; the rule `noExperience`, asked in `ranks.ts`).
71. **Centurions beside The Marian Reforms: the extra upkeep.** The user's "#3 is intentional" names this pair (`docs/plans/doctrines-governments-chairs.md`: The Marian Reforms makes Centurions' extra upkeep free). **Recommend:** a unit a `free` rebate covers pays no surcharge at all. This reaches every surcharge, The Deserters malice included, because a free unit is not a unit the empire pays for. **Applied in D8** (`freeByLaw`, read in `cardUpkeepSurchargeLines`).
72. **Weight of Numbers: "the same target" and "this turn".** **Recommend:** the target is the piece attacked on open ground, or the town when a town stands on the hex, whichever beat of the assault strikes it (walls or garrison). An attack counts once it is made, whatever its outcome, and the attack being made does not count itself. Only the attacks made while the law is held count, and only when attacking. The record is kept for the turn it was written in, so nothing counts down. **Applied in D8** (`Player.strikesThisTurn`, written by `recordStrike` in `applyCombat`; the count `attacksOnTarget`).
73. **Combined Arms: "melee units" and "in melee".** **Recommend:** a melee unit is the foot soldiers' silhouette (`modelClass: 'melee'`), so a mounted unit does not screen. "Attacked in melee" is any attack that is not from range, so an archer, a catapult and a ship that shoots may still strike the guns. The screen is asked only on open ground: a siege unit in a town is defended by the town's own beats. The +3 is for every unit of the empire, siege units included, and is doubled beside one of the empire's siege units. **Applied in D8** (the rule `siegeScreened`, refused by `screenError` in `attackTargetAt` and `planCombat`).
74. **The Plunder Economy: "your unit's strength" and "in every city".** **Recommend:** the raider's own strength: its roster figure, its training stamp and its rank (`pieceStrength`, the figure The Chevauchée strikes with), not the fight's ledger. Every town of the raider's empire is paid the whole figure, which may be a fraction of a point. "Attacking cities" is every beat of an assault on a town. **Applied in D8** (`WindfallOccasionFacts.strength` on a pillage, and a grant with `fromOccasion: 'strength'` and `toEveryTown`).
75. **The Scourge of God: the window and the capital.** **Recommend:** "in the last five turns" is a timed effect hung on the raider when it pillages, for five turns, and a second pillage restarts the five turns instead of stacking. The hexes The Horde spreads to hang nothing more. The +100% is a city-stage percentage in whichever town is the capital while it lasts, and a second pillage restarts it too ("does not stack"). **Applied in D8** (`WindfallGrantSpec.actorTimed`, hung by `pillageAt`; a `timed` grant with `renews`).

**Not yet ruled** (the sheet's "Still open" list, not ambiguities): Combined Arms' second clause; the endless host's three Doctrines (The Servian Reforms, Weight of Numbers, The Laws of Lord Shang); The Plunder Economy and The Consular Roads; The Captured Arms against The Art of War; and the Doctrine-to-government pairing (C3). Their texts may change before the build. D7 built The Laws of Lord Shang as the sheet's current text, as D4 built The Consular Roads, and D8 built Combined Arms, The Servian Reforms, Weight of Numbers and The Plunder Economy the same way.

## Counts

| | Group 1 | Group 2 | Group 3 | All |
|---|---|---|---|---|
| Tier 0 | 13 | 12 | 0 | 25 |
| Tier I | 6 | 12 | 0 | 18 |
| Tier II | 4 | 16 | 2 | 22 |
| Tier III | 4 | 16 | 1 | 21 |
| Tier IV | 1 | 12 | 1 | 14 |
| Shared | 4 | 4 | 1 | 9 |
| Doctrines | 1 | 15 | 0 | 16 |
| **All** | **33** | **87** | **5** | **125** |

The 125 are the sheet's 33 `modify` rows (cut rows excluded) and 67 `add` rows (The Fyrd was removed after the triage), the shared table's 4 `modify` and 5 `add` rows, and 16 Doctrines.

## Follow-ups

What is still open after batches D1 to D8, and who it belongs to. A batch that closes an item removes it from this list.

**The UI track** (`src/ui/`):
- The pillage notice (`pillageSentence` in `src/ui/controls.ts`) does not mention D3's extras. `PillageReport.strikes`, `.unrest` and `.spread` carry them.
- The capture notice does not say that Pax Romana pacified the town at once. The unrest phase reports a `pacified` event for The Bakufu and The Consular Roads, as for any town pacified.
- A town's writ line changes in place under a `cityCost` rule (a set price, a percentage or a delta) and does not name the card that changed it. The ledger shows the new figure with the town's own label.
- D5: a unit a card raises on a draft, a pass, a technology, a raze or a great person arrives with no notice that names the card. The payers pass no `realized` list to `payWindfallGrants`, so `CommandResult` does not report the unit.
- D6: the peace notice does not say what War Reparations and Danegeld paid, and the production Spolia keeps for the Opus (`Player.opusBank`) is shown nowhere.
- D7: the harvest (War Feeds Itself) and a disband rider (The Legions' Labour) pay with no notice. The city panel prints the moved surplus as its own production row, but its growth line shows no growth and does not say why. A camp sped up by The Hunting Grounds looks like any other camp.
- D8: the capture notice does not say that The Soldiers' Share healed and raised the units around the town, and the pillage notice does not name The Plunder Economy's production, The Scourge of God's blessing on the raider or its capital's production. A siege unit that Combined Arms screens is not tinted as a target, but nothing on the map says why. The unit panel does not show the timed strength a raider carries.

**The bot track** (`src/ai/`, `data/ai.json`):
- D1: the bot gives nothing for a unit's starting experience or rank, or for The Armed Colony's escort rank. `data/ai.json` has no forecast for the `rankEarned` tally, so The Campaign Annals' growth is unpriced. Bots do not levy.
- D4: the bot prices the new shapes with stand-ins. `pacificationRate` is a share of the stand-in at the capture rate. A set or scaled town price is read off the founded town's price. The `pacified` occasion uses the capture rate.
- D5: the bot prices a free draft and science toward a technology with the stand-in. The raze and ranged-attack occasions use the capture rate, a pass is half the seat's drafting rate, and a great person is one in `lumpTurns`. The bot never passes a draft to raise The Open Muster's or The Landsturm's units, and it does not count the citizen a Total Mobilisation town pays against growth it has not had.
- D6: the peace occasion uses the capture rate, and Vae Victis is a share of the seat's seated capture riders. A renown grant on a rider is not priced at all, so Looted Art reads as worth nothing, like every other renown rider. Commission rewards are not priced, as before.
- D7: Double Time is priced with the stand-in. The Hunting Grounds' camp rule is priced at nothing, and the bot forecasts no disbanding, so The Legions' Labour reads as worth nothing. The weariness cuts are a share of the stand-in at the capture rate. War Feeds Itself and The Laws of Lord Shang are priced off the board as it stands: the army in enemy territory now, and the towns building soldiers now.
- D8: the bot prices a grant scaled by the moment (`fromOccasion`) as its bare amount, for every card, so The Plunder Economy's production reads as half a point a town and the card scores below nothing. A strength line is priced as if every unit had it, so Centurions' Elites and Weight of Numbers' attacks are read as a flat +3; the bot does not plan focused attacks or keep its Elites together. The Soldiers' Share's ranks are priced at nothing (as every rank a card gives is), and its rule against founding costs the next town the seat would found. The rule against experience is the stand-in, as a cost. The screen and the doubled citadels are the stand-in and nothing.

**The simulation and its words** (`src/sim/`):
- D2: the generated words for a strength line leave out the side it applies to, so Interior Lines' +4 does not say "when attacking". The card's own text does.
- D4: the settler's founding preview does not show a scoped city price, such as The Universal Monarchy's doubled price. This is the stated cut in `prospectAuthorityCost` (`meters.ts`) for every scoped `cityCost` row.
- D1 and D2: `cities.ts`, `levies.ts` and `combat.ts` import a few evaluator functions from `statecraft/evaluator` directly instead of through the `statecraft.ts` index.

**Dominion cards still to build:**
- The five group-3 cards stay deferred until the user reworks them: The Longships (its data row still plays Marine Drill), The Relay Stations, Rally to the Standard (no data row yet), Circumvallation and Mercenary Contracts.
- The shared The Frontier Militia is built by Expansionist batch E5.

**The user's rulings:**
- The sheet's "Still open" list still names The Consular Roads (beside The Plunder Economy) and The Captured Arms (beside The Art of War). D4 built both as their current texts.
- The Sword of State: the Magisterial sheet's note says the unit counts as trained and pays upkeep like any other unit. D5 applied reading 2 instead: the unit costs no upkeep, and it counts as gained, which pays every live card that pays on training (Muster Rites, The Art of War). The user may want to rule on the upkeep.

**Notes for later batches:**
- C3's Doctrine tests (`test/sim/doctrineOffer.test.ts`, and the Doctrine pools in `test/sim/statecraft.test.ts` and `test/sim/decks.test.ts`) pin the exact Doctrines in each tier. A batch that adds a Doctrine updates those pins, as D4 and D5 did.
- D7's shapes for the Expansionist track, built to be used as they are in E5:
  - **the disband moment** for Veteran Colonies: the `disband` occasion, paid by `applyDisbandUnit` with `townId` (the empire's town on whose hex the unit stood) and `unitCost` (absent for a free unit); a rider's `inTown` (`true` for any of the empire's towns, or a town scope) and the `unitCost` measure. Veteran Colonies' food is a growth windfall in the town the unit stood in: `{ yield: 'food', amount: 1, fromOccasion: 'unitCost' }` with `inTown: true` and `class: { category: 'military' }`.
  - **the food-to-hammers transfer** for The Breadbasket: the `surplusToProduction` effect, with an optional `category` and `class` (what the town must be building) and `scope` (which towns). With no category it applies whatever the town builds. It is step 14 of `docs/yields.md`, and the basket gains nothing in a turn it moves.
  - **the fortified-unit hex test**: `TileCondition` `fortifiedUnit`, answered by `GroundFacts.fortified` (`groundFactsFor`). The merge after E4 joined it with E3's and E4's facts (`player`, `watered`, `wonderCentre`, `copiedHexes`) in one `GroundFacts` and one `groundFactsFor`.
- D6's shapes for the Expansionist track: the citizens reward (`CommissionReward.citizens` with `citizensTo`, `{ smallest: n }` for The Wide Country), and the town that met a goal (`commissionGoalTown`, `commissionGoalMeasure`, `CommissionReward.building` and `fromGoal`, for The Heartland). A goal that one town meets by a figure, as The Heartland's does, names its town in `commissionGoalTown`.
- The D2 and D3 docblocks were written before the ASD-STE100 rule and still contain some em dashes. The user schedules the rewrite pass.
