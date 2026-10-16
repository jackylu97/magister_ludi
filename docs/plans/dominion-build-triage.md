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

**Overlaps and order:**
- `combat.ts`: D1, D2, D3, D4, D5, D6. `turn.ts`: D1, D7. `cities.ts`: D1, D5, D6, D7. `unrest.ts`: D3, D4. `improvements.ts`: D3, D6. `diplomacy.ts`: D5, D6. `statecraft/draft.ts`: D5, D6, D7. `ranks.ts`: D1, D2. `commands.ts`: D1, D7. `state.ts` (new `Player` records): D1, D3, D6.
- D5's The Landsturm uses D3's delivery field, and D6's Danegeld uses D3's pillage hook, so D3 goes before both.
- Double Time reads every end-of-turn Order effect, including D1's drill effect and D7's War Feeds Itself, so it goes last.
- Every Doctrine needs C3's offer first. Double Time also needs the last-band field.
- The five group-3 cards keep their sheet rows. The Relay Stations, Circumvallation and Mercenary Contracts already have deferred data rows. Rally to the Standard needs a new deferred row. The Longships' data row (`marineDrill`) still plays Marine Drill and would become a deferred row.

## Rule ambiguities, with a recommended reading

1. **What counts as gaining a unit** (Muster Rites, The Art of War, Rites of Passage, The Gathering Host, the rank cards). Today a conscript from The General Levy pays no completion riders, and a unit taken from someone else (Blood Brothers, a captured civilian) is not gained. **Recommend:** a conscript counts as gained (it still does not count as trained); a unit taken from someone else does not. Civilians count, as Muster Rites pays for them today.
2. **Upkeep on units a card raises when the text is silent** (The Conscription Rolls, The State Forges, The Open Muster, The Armourers' Secret, The Landsturm, Total Mobilisation, The Sword of State, The Cleruchy). Today every unit a card raises for free costs no upkeep. **Recommend:** keep that rule, and add "It costs no upkeep" to those texts, as The King's Levy and The Nation in Arms already say it.
3. **Double Time: which effects repeat.** **Recommend:** periodic boons, periodic musters (The King's Levy, The Conscription Rolls, The Nation in Arms) and the new end-of-turn Order effects (The Drill Grounds, The Regimental Schools, The Tactica's experience, War Feeds Itself). Not repeated: per-turn renown trickles (The General Staff, The Mural Crown), yields, timed effects, commissions and Doctrines. A muster that triggers twice raises two units.
4. **The Chevauchée: how the damage is done.** The sheet's own reading is "a strike at half the pillaging unit's strength, with no damage back". **Recommend:** each city of an empire you are at war with, within three hexes, takes a blow through the normal combat damage sum with the raider at half strength; no counter-blow; it can wear the walls down to the floor but never takes the town.
5. **The Horde: do the extra hexes count as pillages?** **Recommend:** yes. Each neighbouring improvement torn out counts for the pillage tally, The Sagas and Danegeld, and pays the pillage riders, as the builds doc's "multiplies every pillage pay-off" says. The raider's movement and heal are spent and paid once.
6. **Vae Victis: which capture rewards double.** **Recommend:** every windfall rider on the capture (yields, renown, pressure, Spolia's hammers). Not doubled: timed effects (Hegemony's +30% would stack), commission rewards, and Doctrine effects (The Soldiers' Share).
7. **The Captured Arms: do barbarian kills count?** `Player.unitsKilled` leaves them out. **Recommend:** count them, with a record of its own, since a Tier 0 card would otherwise pay almost nothing. The risk is farming camps with no cap.
8. **The Hunting Grounds: what spawns faster.** New camps appearing (`campEveryTurns`, a world clock with a camp cap) or each camp raising its raiders (`unitEveryTurns`). The 2026-10-15 note reads it as more camps. **Recommend:** camps within ten hexes raise their units 50% faster. That can be done camp by camp; new-camp placement is world-wide.
9. **The Armed Colony: which unit, and where.** **Recommend:** a military unit of yours on the founding hex or one of the six around it; only the first in unit order becomes a Veteran; a unit already Veteran or Elite gains nothing.
10. **The Armourers' Secret:** a technology that unlocks two military units, or a unit needing a resource you lack. **Recommend:** one of each military unit it unlocks, granted even without the resource, in the capital.
11. **The Defiant Kingdom: which empires are compared.** **Recommend:** only empires you have met, so the card does not reveal unmet empires.
12. **The Spear Makers: a unit's age.** **Recommend:** the age of the technology that unlocks it; a unit no technology unlocks is first-age.
13. **Walled Towns: is a Palisade a wall?** Stone Walls needs a Palisade, and the user moved the card to Tier I because "walls unlock later". **Recommend:** Stone Walls, as Defensive Lines used.
14. **The Fyrd beside The Muster of the Fields.** Removed by the user on 2026-10-16 (*"let's remove the fyrd for now"*), so this needs no reading. The note as written: both are the same levy use; the levy menu keeps the first card's town floor, so held together the result depends on chair order, and The Fyrd adds nothing. **Recommend:** the lowest floor among held cards applies, and ask whether The Fyrd should differ (no waiting period, or a Veteran unit).
15. **The Cleruchy: does it take a chair?** **Recommend:** treat it like The Sword of State: the settler arrives on draft, and seated the card does nothing.
16. **The New Code: is the free draft a draft?** `PlayerStatecraft.drafts` is the tier ladder. **Recommend:** it does not raise the draft count or the next draft's cost. If a draft is already open, it is skipped and the ten-turn stamp is not written.
17. **The Soldiers' Share:** settlers, Elites, and "earned". **Recommend:** settlers cannot be trained or bought while it is held; an Elite gains nothing; a rank raised this way counts as earned (it pays Honours of the Legion).
18. **The Laws of Lord Shang: how food becomes hammers.** **Recommend:** the town's growth surplus, as the growth channel computes it, is added one for one to the front-row unit's hammers after the production percentages, as its own labelled line; the food basket gains nothing that turn.
19. **Centurions: does the aura stack?** **Recommend:** +3 for each adjacent Elite, no cap (six neighbours at most); an Elite does not count itself.
20. **The Varangian Guard: movement for the second attack.** An attack zeroes movement today. **Recommend:** an Elite's first attack costs one point of movement, as a hit-and-run hull's does, so it can attack again.
21. **The Swift Riders: what an attack costs.** **Recommend:** one movement point, the rest kept, as for hit-and-run hulls.
22. **Interior Lines: "has not moved".** **Recommend:** the unit still has its full movement allowance, so no new record is kept.
23. **War Feeds Itself.** **Recommend:** your military units on hexes owned by an empire you are at war with; the hex's yield read as your empire sees it; gold, science, culture and faith to your banks, food and production to your nearest town; the owner loses nothing.
24. **The Funeral Oration and The Glorious Dead.** **Recommend:** both change only your own weariness reading, not the enemy's offset. The Funeral Oration halves unit losses only; The Glorious Dead removes unit and town losses ("your losses").
25. **The Farming Garrisons and The Castra: the town's own hex.** **Recommend:** a fortified garrison in a town counts for the town's centre hex.
26. **The Captive Craftsmen: where its production goes.** An empire line has no hammer basket. **Recommend:** the capital.
27. **The Bakufu and The Consular Roads: "pacified at once".** **Recommend:** the unrest ends in the unrest phase at the end of the turn in which the condition holds, as the earlier King's Peace draft read it. Pax Romana ends it at the moment of capture, which fires The Provincial Census at once.
28. **The Strategoi: "citadel yields".** The existing hex percentage doubles only the citadel's own +2 production, not the lines cards put on citadels. **Recommend:** double everything the citadel hex pays, which needs a hex-wide doubler instead.
29. **The Drill Grounds: the cadence.** **Recommend:** the world calendar (every fourth turn, for military units standing in a town at that end of turn), like the periodic musters.
30. **Commission: Take the City: which population.** A capture halves the town. **Recommend:** the floor and the reward both read the town as it stood before the capture.
31. **War Reparations, Danegeld and A Victor's Peace.** **Recommend:** "cities taken in that war" are towns of that empire you took by force during the war and still hold at the peace; "hexes pillaged" are that empire's hexes; "destroy it" means it was eliminated while you were at war with it.
32. **The Crusader Orders: press or convert.** Built as a 30-pressure lump. **Recommend:** keep the lump and change the status to implemented; converting the town outright would be a new grant.
33. **The Mural Crown: is the new general counted?** **Recommend:** yes, a general gained now counts toward its own payout.
34. **The Harrying.** **Recommend:** "beside" means next to the town's centre hex; a town already in unrest keeps its current record.
35. **The Arrière-ban: two declarations in ten turns.** **Recommend:** the window renews instead of stacking to +100%.
36. **Copying the Enemy: "cannot yet build".** **Recommend:** the technology that unlocks it is not yet researched; a unit no technology unlocks pays nothing.
37. **The Landsturm: "beside a great general".** **Recommend:** the six hexes around a great general, which is what "beside" means elsewhere on the sheet, not the aura's two-hex reach.

**Not yet ruled** (the sheet's "Still open" list, not ambiguities): Combined Arms' second clause; the endless host's three Doctrines (The Servian Reforms, Weight of Numbers, The Laws of Lord Shang); The Plunder Economy and The Consular Roads; The Captured Arms against The Art of War; and the Doctrine-to-government pairing (C3). Their texts may change before the build.

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
