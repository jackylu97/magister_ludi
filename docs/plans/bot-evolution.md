# The bot's skill and an evolutionary tuner — E0, the plan

The ruling of record is `docs/flags.md` (zzzzz), 2026-09-15. This is E0: a
document, not code. Read-only audit of `data/ai.json` and every module of
`src/ai/` at `3dce171`; one measurement (§3.6). The user marks this up; E1
builds the harness. ▢ marks a question for the user; (rec) is the
orchestrator's default and stands unless overruled. The list of rulings is at
the foot.

Four parts, per the ruling: (1) the decision surface as it stands, (2) the
strategy-level knobs that are missing, (3) the harness, (4) the difficulty
lever, kept separate.

## 0. Findings in brief

- The sheet holds **131 leaves** (97 of the scalar numbers are integer-valued
  today), all on the arena panel by construction. **Two are dead** — `military.huntRadius` and
  `score.nominalTiles` have no reader anywhere in `src/ai/` (the `weights.die`
  precedent: a live dial that moves nothing). Fourteen are switches wearing a
  number (0 means "arm off"), two are sentinels (999 = never declare, 60 =
  always sign), and one is a mode flip (`military.aggression` at 0 → 0.01
  changes *which* threshold is read).
- **No decision in the bot is a plan.** The priority system (`docs/bot-priorities.md`)
  is greedy with a margin: every sitting rebuilds the want book from
  `GameState`; the only long-horizon terms are the bead race's liveness
  (`priorities.raceLiveHorizons`), the wager's lean after a stake, and the
  age-banded weight rows. There is no victory shape, no phase, no stored goal,
  no reading of a rival's lead, and no memory of who declared on whom.
- Of the six strategy questions the ruling names, **two have behaviour a
  number could steer today** (expansion stop, war open/end) and four need a
  reading written before a knob can move them (victory shape before the deal,
  a technology's value by age, a faith or wonder race, a neighbour's threat as
  more than an army ratio). §2 marks each plainly.
- **The harness needs no source change to seat a candidate**: the per-seat
  tuning door (`setAiTuning(sheet, {playerId})`, `scripts/gridSearch.ts`'s
  door) takes a whole merged sheet; a candidate's persona structure lives in
  the genome and is merged by the harness, not by `aiConfigFor`. The judge —
  `foldScore` — is V1's and has not landed (`src/sim/score.ts` is absent on
  `main`); the harness is blocked on it and on nothing else.
- **Measured** (§3.6): one 120-turn six-seat game costs **31.0 s on the duel
  board and 170.7 s on the standard board** (one core, this machine), the
  standard board's last twenty turns alone costing 70 s. A generation of twelve
  children at the honest evaluation (§3.4) is ~3.3 CPU-hours — **25 minutes on
  eight workers**.

## 1. The decision surface, audited

### 1.1 The sheet's structure — what the harness must preserve

- `data/ai.json` is one object of seventeen **blocks** (`driver` · `search` ·
  `priorities` · `expansion` · `site` · `workers` · `growth` · `military` ·
  `war` · `weights` · `solvency` · `score` · `threat` · `research` ·
  `religion` · `wager` · `puppet`) plus two **override sheets**: `puppetProfile`
  and `personas`. `aiConfig.ts:1227` destructures the two sheets off before
  the rest becomes `AI` — the base every reader and the arena's walker sees.
- **A persona is a sparse deep-override** (`PersonaOverride = DeepPartial<AiConfig>`,
  `aiConfig.ts:1209`): plain objects merge key by key, **arrays and scalars
  replace wholesale**, the base's key order is kept (`deepMerge`, :1315).
  Today: `balanced: {}` (identity — `aiConfigFor('balanced') === AI` by
  reference), `wide` (4 blocks, 6 leaves), `tall` (5 blocks, 10 leaves, one
  whole `weights.food` row), `zealot` (3 blocks, 6 leaves, two rows),
  `warmonger` (4 blocks, 19 leaves, the whole `military.mix` — and
  `military.huntRadius`, which is dead).
- **The merge order a seat reads** (`aiConfigFor(persona, playerId)`, :1354):
  the file's base → the page-level tuning sheet (`setAiTuning(sheet)`) → the
  seat's own sheet (`setAiTuning(sheet, {playerId})`) → the persona's override.
  Memoised per `seat|persona`; every memo cleared when any sheet changes.
  Nothing is ever written to a save — a tuned bot's *commands* are the log.
- `puppetProfile` is folded over the seat's merged sheet for one town's
  `productionTable` only (`aiConfigForPuppet`, :1387); it reads the **file's**
  profile, not a per-seat one.
- **Pins the harness's output must keep** (a champion pasted into the file is
  gated by these):
  - `test/sim/aiPersona.test.ts:97` — `PERSONA_IDS` is exactly
    `['balanced','wide','tall','zealot','warmonger']` in file order;
    `balanced` is `AI` by identity (so `balanced` stays `{}`).
  - `:113` — a merged persona's leaf paths equal the base's exactly (an
    override may not invent a key; a knob a persona overrides must exist in
    the base).
  - `:126` — `tall.expansion.cityValueFalloff` is 0.6 and below balanced,
    `wide`'s above; `zealot.religion.prophetTechValue` above base;
    `warmonger.weights.military` above base; **only the warmonger has
    `military.aggression > 0`**; an overridden weight row keeps its length.
  - `test/ui/arenaPage.test.ts:115` — the panel walks `AI` (the base only):
    `personas` and `puppetProfile` are **not on the arena** and never were.
- **Integer rows**: nothing in the file marks one. The 97 integer-valued
  leaves are integer by *use* (§1.4), and the harness must keep them so.

### 1.2 Every knob → the decision it moves → the reader

Readers are `file:function` in `src/ai/`; a knob read in several places lists
each. Knobs that reach a decision only through a `value.ts` price helper are
marked *via*. The two unread knobs are marked **dead**.

| knob | decision it moves | reader(s) |
|---|---|---|
| `driver.commandsPerSeat` | cap on `accepted + refused` commands a seat may emit in a turn | `driver.ts:driveSeat` · `stepper.ts:pending` |
| `driver.endTurnAttempts` | passes of the command loop after a refused `endTurn` | `driver.ts:driveSeat` · `stepper.ts:step` |
| `driver.greatPersonRedraws` | refused `chooseGreatPerson` retried as redraws | `driver.ts:driveSeat` · `stepper.ts:step` |
| `driver.reaimsPerTurn` | research re-aims allowed per sitting (0 = housekeeping re-aim off) | `bot.ts:reaimBeeline` |
| `driver.reaskPerTurn` | re-asks of a marching piece per turn (0 = arm off) | `bot.ts:reaskTheMarch` |
| `search.pathProbes` | destinations pathed before a piece stands still — settler sites, flight, escort, worker shortlist, withdraw, campaign approach/muster, camps, undefended towns, work sites, the road probe | `bot.ts:marchToSite/civilianFlight/escortMarch/workerCommand/fallBackAndHeal/campaignMarch/campMarch/undefendedCity/greatPersonCommand` · `campaign.ts:campaignRoad/musterHex` |
| `search.routeGateProbes` | town pairs the route gate is asked about, richest first | `routes.ts:routeOutlook` |
| `priorities.horizonTurns` | H: every `(H − delay)/H` discount; reachable techs; saving-row cliff; bead-rate floor; build-effort cap; growth stand-in | `value.ts:delayDiscount/delayTerm/occasionRate` · `wants.ts:tileWants/turnsToFirstGod/savingRows` · `plan.ts:reachableTechs` · `chain.ts:beadChain` · `bot.ts:growthTerm/push/explainHurry` |
| `priorities.switchMargin` | how much a challenger beeline must beat the incumbent (×; ÷ when the incumbent is negative); the bar a march site must beat the settler's own hex | `bot.ts:techGoalTable/marchToSite` |
| `priorities.priceBandLow` | floor of a bank's, a meter's, the hammer's shadow price | `wants.ts:priceOf/meterPrice` · `value.ts:hammerPrice` |
| `priorities.priceBandHigh` | ceiling of the same, and of the science/faith/wager-lifted prices | `wants.ts:priceOf/meterPrice` · `value.ts:hammerPrice/sciencePrice/faithPrice/wagerLift` |
| `priorities.raceLiveHorizons` | whether a shut bead race is live: `delay ≤ H × this` | `chain.ts:beadChain` |
| `expansion.siteSearchRadius` | how far the expansion chain probes for the nearest legal site; how far a settler ranks hexes | `bot.ts:nextTownChain/marchToSite` |
| `expansion.cityValueFalloff` | the next town is `weights.city × falloff^towns` | `chain.ts:explainNextTown` |
| `expansion.hexOffersPriced` | frontier hexes put to `tilePurchaseError` per town (0 = tile purchases off) | `wants.ts:pricedOffers` |
| `site.freshWaterBonus` | flat site term for a river or lake | `bot.ts:explainSiteValue` |
| `site.newLuxuryBonus` / `newStrategicBonus` | flat term for a resource kind the realm holds none of — at a site, on a frontier hex | `value.ts:newResourceTerms` (from `bot.ts:explainSiteValue`, `wants.ts:tileWants`) |
| `workers.searchRadius` | the ring a **great person's** work sites are ranked in (not a worker's) | `bot.ts:explainGreatPerson/greatPersonCommand` |
| `workers.improvements` | the roster the plan scores every hex against; **list order breaks ties** | `plan.ts:workRoster/bestEntryOn` |
| `workers.planTopN` | width of a spade's shortlist (`+ pathProbes`) | `bot.ts:workerCommand` |
| `workers.planRadius` | hexes from a town an entry must be within to count toward its craving | `plan.ts:explainWorkerCraving` |
| `workers.walkDiscount` | `value / (1 + hexes × this)` — which entry a spade or a great person walks to | `plan.ts:rankPlanFor/rankWorkSites` |
| `workers.workDefenseValue` | a citadel's defender line per point | `plan.ts:workGifts` |
| `growth.smallCityPop` / `smallCityPremium` | the premium a citizen of a small town carries | `bot.ts:explainCitizen` |
| `military.campHuntRadius` | piece→camp **and** camp→own-town reach of the hunt (docblock says `threat.radius` for the first; code reads this) | `bot.ts:campMarch` |
| `military.garrisonPerCity` | garrison owed per town: shortfall paid, redundancy, empty-town term, "every town held" gate, which town an idle soldier holds, the spare of the strike force | `bot.ts:garrisonWorth/isRedundant/unitRoleValue/townsAreHeld/undefendedCity` · `campaign.ts:strikeForce` |
| `military.armyPerCity` | standing levy per town | `campaign.ts:levyReading` |
| `military.aggression` | exchange loosening on a rival's piece; **>0 selects `declareThreshold` over `declareThresholdPeaceful`** and multiplies the ratio | `bot.ts:soldierCommand→favourableBlow` · `diplomacy.ts:explainAdvantage/explainDeclaration` |
| `military.huntRadius` | **dead** — named in two docblocks, read by nothing | — |
| `military.scoutCap` / `scoutEarlyTurns` / `scoutBonus` / `scoutGlutPenalty` / `scoutDecayPerTurn` | the opening scout book's turn gate (`scoutEarlyTurns`, 0 also shuts the book), the premium, the glut charge, the decay | `bot.ts:openingScout/unitRoleValue` |
| `military.mix.{melee,ranged,mounted,siege}` / `mixBonus` | `mixBonus × (target − share)` per trade | `bot.ts:explainMixCraving` |
| `military.healBelowHealth` | dig in on own ground below this share of hp | `bot.ts:restAndHeal` |
| `military.rangedDeferral` | printed charge when a melee blow is held for a bow or a hard target | `bot.ts:favourableBlow` |
| `military.strikeFloor` | least dealt per taken in the field (0 while besieging) | `bot.ts:favourableBlow` |
| `military.hardTargetMargin` | melee refused at a town / dug-in piece under this (0 = clause off) | `bot.ts:favourableBlow` |
| `military.withdrawBelowHealth` | walk home from foreign ground below this share | `bot.ts:fallBackAndHeal` |
| `military.screenRadius` / `screenBonus` / `screenExposure` | whether a bowman screens; the seven candidate hexes' score | `bot.ts:screenMarch` |
| `war.declareThreshold` | the warlike bar; **also the cap** on the peace-side advantage bar for every persona | `diplomacy.ts:explainDeclaration/explainAdvantage` |
| `war.declareThresholdPeaceful` | the bar for a zero-appetite seat (999 = never) | `diplomacy.ts:explainDeclaration/explainAdvantage` |
| `war.reachRadius` | a target town must be within this of one of our combatants | `diplomacy.ts:nearestTownInReach` |
| `war.secondWarMultiple` | bar × this while any real war is on (floored at 1) | `diplomacy.ts:explainDeclaration` |
| `war.dogpileSeats` | wars-against at which the target reads at its raised strength | `diplomacy.ts:explainDeclaration` |
| `war.expeditionOdds` / `roadDragPerStep` | the force against the walls, dragged per road step, refused under the odds | `diplomacy.ts:explainExpedition` |
| `war.strikeForce` | spare soldiers a declaration needs; pieces mustered before a push; extra levy at war | `diplomacy.ts:explainDeclaration` · `bot.ts:campaignPlan` · `campaign.ts:sightedArmyWanted` |
| `war.musterDistance` / `musterRadius` | steps short of the walls the muster stands; who counts as gathered | `campaign.ts:musterHex` · `bot.ts:campaignPlan/campaignMarch` |
| `war.siegeExchange` | exchange bar within 1 hex of the target while pushing (replaces `aggression` there) | `bot.ts:soldierCommand` |
| `war.escortRadius` | "a hostile is about" for a site, a settler, an escort | `bot.ts:nextTownChain/marchToSite/escortWithin/civilianDanger` |
| `war.sueFloor` | warscore under which the seat sues; an enemy under it is not campaigned against | `diplomacy.ts:peaceDecision` · `bot.ts:campaignPlan` |
| `war.acceptCeiling` | warscore over which a fair paper is declined and no counter is written (60 = always sign) | `diplomacy.ts:readPeaceOffer/counterRefusal/counterTerms` |
| `war.tributeFloor` | warscore under which a sue carries coin | `diplomacy.ts:peaceDecision` |
| `war.peaceExchange` | our cost / their cost at which the war is "bleeding" | `diplomacy.ts:explainStanding` |
| `war.goldPerScorePoint` | coin owed per negative warscore point | `diplomacy.ts:owedForPeace` |
| `war.unitLossWeight` / `cityWeight` / `strengthWeight` | the warscore's three lines; the first two also the per-war exchange | `diplomacy.ts:explainWarScore/explainStanding` |
| `war.luxuryGoldBaseline` / `luxuryGptBaseline` | a seam's coin on a paper; their **ratio** is the gpt→coin rate | `diplomacy.ts:explainSide/counterTerms` |
| `war.openBordersPrice` | a right of way's coin, either way | `diplomacy.ts:explainSide` |
| `war.counterMarkup` | the premium over even a counter asks | `diplomacy.ts:counterTerms` |
| `war.refusalMemoryTurns` | how long a refused swap stays refused (0 = never remembered) | `diplomacy.ts:writeSwap` → `dealMemory.ts:readDealRefusal` |
| `weights.{food,production}[age]` | table weight of a basket / a hammer; `production` also the hammer price's prior | `value.ts:yieldWeight/baseVoiceWeight/hammerPrice/hammerTerm` |
| `weights.{gold,faith,culture}[age]` | the **prior** a bank's shadow price is banded around (gold's × `goldPressure`); science/faith also the floor of their premium prices | `wants.ts:priorPrice` · `value.ts:sciencePrice/faithPrice` · `bot.ts:valueContext` |
| `weights.science[age]` | the science price's table half and floor | `value.ts:sciencePrice` |
| `weights.bead` | a bead owed, a `paysBead` node, a bead grant, the stake's premium | `chain.ts:beadChain/readNodeGifts` · `value.ts:explainBuildingRow/explainProjectRow/scoreEffect` · `wager.ts:appraiseWagers/wagerLeanOf` |
| `weights.victory` | closing the great work; the row that ends the game | `chain.ts:beadChain` · `value.ts:explainBuildingRow` |
| `weights.tech` | flat worth of one more technology; a free-tech grant | `chain.ts:techChain` · `value.ts:explainBuildingRow` |
| `weights.city` | the next town (before falloff); a settler unlock; a settler at a basket's front; **a town's coin on a paper** | `chain.ts:explainNextTown/unitTerm` · `bot.ts:frontRowWorth` · `diplomacy.ts:explainSide/counterTerms` |
| `weights.military` | a strength point: soldiers, walls, auras, card strength lines, "a piece" (× `combatScale`) | `value.ts:explainSoldier/explainBuildingRow/unitStatPoints/scoreEffect/…` · `bot.ts:explainActFor` · `wants.ts:mirrorTerm` |
| `weights.unitEdge` | a movement/sight/range/charge point; a town screened by a toll | `value.ts:unitStatPoints/scoreEffect` |
| `weights.happiness` / `authority` | prior of the two meter prices; an artist's calm | `bot.ts:valueContext/explainActFor` · `wants.ts:meterPrice` |
| `weights.renown` | renown trickles, lumps, amplifiers, the deck margin's renown channel | `value.ts:explainBuildingRow/scoreEffect/scoreAmplifier/periodicWorth/readingTerms` |
| `weights.worker` | a civilian unlock; a civilian at a basket's front | `chain.ts:unitTerm` · `bot.ts:frontRowWorth` |
| `weights.debtAversion` | the ceiling of the gold-pressure ramp | `bot.ts:goldPressure` |
| `solvency.healthyIncome` / `strainSpan` / `arrearsTreasury` / `graceTreasury` / `graceTurns` | the gold pressure 1 → `debtAversion`, and the opening grace | `bot.ts:goldPressure` (`arrearsTreasury` also `disbandCommand`) |
| `solvency.reserveTurnsOfUpkeep` | the gold reserve a purchase must leave | `bot.ts:goldReserveFor` · `wants.ts:wageReserveRow` |
| `solvency.minArmy` / `disbandBelowIncome` | whether the disband arm fires and its floor | `bot.ts:disbandCommand` |
| `score.unknownEffect` | what any unread shape is worth (never zero); × `nominalCount` the nominal per-turn yield every percentage is a percentage of | `value.ts:scoreEffect/unreadEffect/nominalRate/…` · `wants.ts:faithRowTerms` |
| `score.caravanScale` | multiplier on the best open route's pay (1 = off) | `routes.ts:explainCaravan` |
| `score.nominalCount` | count a `pays` count is assumed to reach; `upkeepRebate`'s pieces; **the divisor** in `landfall`; last-resort counted card | `value.ts:nominalRate/scoreEffect/explainCounted` |
| `score.nominalTiles` | **dead** — replaced by `workedHexesAdmitting` (`value.ts:2370`) | — |
| `score.synergyBonus` | per held card on an option's `line` | `bot.ts:explainCard` |
| `score.combatScale` | soldiers a unit grant is worth (× `weights.military`) | `value.ts:explainBuildingRow/unitStatPoints/scoreEffect/windfallGrantWorth` |
| `score.patienceTurns` | build-effort divisor cap for bead / `endsTheGame` rows only | `bot.ts:push` |
| `score.lumpTurns` | lump ↔ per-turn exchange everywhere; the malice's; a rite's; the bid a want makes against the prior | `value.ts:explainLump/lumpOfPoints/occasionRate` · `wants.ts:explainRite/priceOf` · `wager.ts:malicePrice` · `bot.ts:explainActFor` |
| `score.tallyForecast.{barbarianKill,wonderAnywhere,greatPersonSpent,unitLost,goldSpent}` | a growing card's potential per occasion (absent key = "no forecast") | `value.ts:potentialTerms/occasionRate` |
| `threat.radius` | enemy pieces near a town → `ctx.threat`; "town is threatened" | `bot.ts:threatLevel/cityIsThreatened` |
| `threat.militaryBonus` | added per threat to a soldier's worth | `value.ts:explainSoldier` |
| `threat.garrisonValue` | a soldier for an empty town, bought or queued | `bot.ts:garrisonWorth/unitRoleValue` |
| `threat.extraArmyPerThreat` | levy per threat | `campaign.ts:levyReading` |
| `threat.techMilitaryFactor` | ceiling of a unit unlock's multiplier under threat (floored at 1) | `chain.ts:unitTerm` |
| `threat.armyPerSightedCamp` / `armyPerSightedHostile` / `sightedArmyCap` | the sighted half of the levy, capped | `campaign.ts:sightedArmyWanted` |
| `research.goalHorizon` | max closure length of a beeline goal | `bot.ts:techGoalTable` |
| `research.abilityValue` | worth of one granted ability | `chain.ts:readNodeGifts` |
| `research.strandWeight` | charge for beakers stranded by a re-aim (0 = off) | `bot.ts:techGoalTable` |
| `religion.prophetTechValue` | the first god's flat term; the founder-prophet's **floor**; the prophet unlock × `faithAppetite` | `wants.ts:ladderPlan/prophetTerms` · `chain.ts:unitTerm` |
| `religion.tideShare` | share of reachable foreign towns the trickle is priced on (0 = no trickle) | `wants.ts:tideReach` |
| `wager.ageTurns` | assumed turns left when no countdown runs (floored to an integer) | `wager.ts:turnsToClose` |
| `wager.malicePenalty` | >0 a flat malice price; **0 = read the deck** | `wager.ts:malicePrice` |
| `wager.leanWeight` | ≤0 no lean; else scales the lifted voice and the appetite term | `wager.ts:wagerLeanOf` · `value.ts:wagerVoicePremium/wagerAppetiteTerm` |
| `wager.driftWeight` | multiplier on projected pace — standing cards and verb-counted flows only | `wager.ts:rateOf` |
| `puppet.switchMargin` | fraction a building must beat a puppet's running conversion by (0 = off) | `bot.ts:puppetRedecisionTable` |
| `puppet.strandWeight` | margin added per share of the front row already paid (0 = off) | `bot.ts:strandShare` |
| `puppetProfile.weights.{gold,science,culture}` | a puppet's taste, folded over the seat's sheet for its production table | `aiConfig.ts:aiConfigForPuppet` → `bot.ts:puppetAwareContext` |

### 1.3 Decisions made with no knob

Two classes. **Tunable** = a literal that could move into the sheet as a number
with no new behaviour (E1's cheapest search space). **Structural** = a fixed
ordering, ladder, formula shape or silent skip; a behaviour has to be written
before a number can steer it. The lines are this worktree's.

**Tunable as they stand**

| where | literal | decision it moves |
|---|---|---|
| `bot.ts:5101` | `held >= 2 × wanted → null` | hard cap on the levy at twice the wanted army |
| `bot.ts:851`, `:5136` | `−soldier × levy.standing` (slope 1) | how hard a standing levy share charges a soldier, bought or queued |
| `wants.ts:1347–1352` | `surplus = held/wanted; value = −worth × surplus` | the same slope in the faith book |
| `bot.ts:6557` | `favourableBlow(holdsWild, 0)` | blows on the wild always need dealt > taken — no appetite for the wild |
| `bot.ts:6591` | `within: 1` | how far from the target town the siege appetite applies |
| `bot.ts:6818` | `floor = besieging ? 0 : strikeFloor` | no strike floor at all under siege |
| `bot.ts:7010` | `standingsNear(…, 1, …)` | a withdrawing piece's goal is home or a hex within 1 |
| `bot.ts:7104`, `:7153` | `mapRange(from, 1)`; `<= 1` | screen candidates are the six neighbours; "screened" is a melee piece within 1 |
| `bot.ts:2381` | `gain <= 0` | reslot on any strictly positive gain — margin 0 |
| `bot.ts:2564` | `challenger <= running + |running| × share` | a non-puppet project-idle switch has margin 0 beyond `strandShare` (the puppet gets `puppet.switchMargin`) |
| `bot.ts:2894–2896` | `best >= mean` of the pool | redeal a belief hand when its best is under the pool mean (×1.0, "deliberately not tuned") |
| `bot.ts:3690`, `:4082` | faith reserve `0` | faith has no wage reserve; a contribution keeps none for faith or an `endsTheGame` row |
| `bot.ts:937` | `net >= 0` | the opening grace needs non-negative income |
| `value.ts:1513, 1570, 1755, 2822, 3050, 3161, 3210` | `(1 + ctx.threat)` | every defensive line scales in threat with slope 1, intercept 1 (a soldier's own threat term is *additive*, `:2080` — two conventions) |
| `value.ts:1038–1041`, `:1138` | floor = table (×1) | the science and faith prices floor at the table, never at `priceBandLow` |
| `value.ts:3145` | `(hung × turns) / nominalCount` | `landfall` reuses the count knob as a divisor — deserves its own |
| `value.ts:3159` | `bought ? 0.5 : 1` | a bank-only stamp reaches half the levy |
| `value.ts:676, 864, 1018, 1125`, `wants.ts:1141`, `plan.ts:416`, `chain.ts:504, 802` | `max(1, rate)` | every rate floors at one a turn before dividing |
| `chain.ts:1927` | `max(beads/turn, 1/H)` | the bead rate floors at one bead a horizon |
| `chain.ts:434` | `worth <= 0 → drop` | a held-tech chain at or under nought leaves the book |
| `plan.ts:220` | `REACH = 3` | how far from a town the plan quotes ground (claimed "work radius + one" but not derived from `RULES.cities.workRadius`) |
| `plan.ts:898, 910` | `AHEAD = 2` | not-yet-worked hexes counted as seats for the craving |
| `campaign.ts:326, 420, 541` | ring `1`; `.slice(0, 3)` (docblock says two); goals within `2` | the road probe's ring, its hexes per piece, the muster road's goals |
| `diplomacy.ts:425` | `ahead: theirs > ours` | any positive exchange margin declines peace — no margin |
| `diplomacy.ts:614` | `total >= 0 && arriving > 0` | a paper is accepted at exactly even (the counter asks `counterMarkup`; acceptance asks none) |
| `diplomacy.ts:904` | `fair = value >= −owed` | a peace is fair at exactly what is owed, no slack |
| `diplomacy.ts:775`, `:1142`, `:1147` | `min(gold, …)`, `max(0, floor(goldRate))` | tribute and counter coin capped at the **whole** treasury / whole income |
| `diplomacy.ts:1399` | `force.siege !== null` | exactly one ranged or siege piece suffices for a strike force |
| `diplomacy.ts:558, 1156, 1632` | copies `>= 2` | a "duplicate" seam is two or more; the last copy is never sold (ruled) |
| `diplomacy.ts:360, 414, 1417, 1543` | `max(1, theirs)`, `max(1, town)` | an enemy with no army reads as strength 1 |

**Structural — a behaviour before a number**

| where | what is fixed | decision it moves |
|---|---|---|
| `bot.ts:1160–1190` | arm order: offers → disband → spend → diplomacy → blockers → housekeeping | which arm gets the command |
| `bot.ts:1365–1423` | housekeeping order: adoption → project-idle → wake settler → wake campaign → re-ask march → re-aim → focus → slotting → reslot | precedence among wake-ups |
| `bot.ts:5509–5518` | dispatch: foundsCity → trades → consecrates → prophesies → proclaims → builder → explorer → combatant → greatWork → stand down | which arm a piece gets |
| `bot.ts:6531–6668` | soldier ladder: rest → withdraw → wild blow → rival blow → screen → camp → undefended town → escort → campaign → stand down | a soldier's turn; first non-null wins, no comparison across rungs |
| `bot.ts:4472–4578` | the opening book: one town, empty queue, no ranger, `turn < scoutEarlyTurns` → first explorer row | the first build is a scout, unweighed |
| `bot.ts:3651–3655`, `:4066` | gold → faith → contribution; `['gold','faith']` | bank precedence is first-non-null, never an argmax across banks |
| `bot.ts:5078`, `:5157` | `category === 'naval' → null`; trailing `return null` | **hulls are never queued**; any unit outside settler/builder/explorer/combatant is never queued |
| `bot.ts:4773–4774, 4809` | puppet: no wonders, no units; `endsTheGame` only in the busiest town | candidate classes per town |
| `bot.ts:4925` | `(value × wait − upkeep) / effort` | the build score's shape |
| `bot.ts:5437–5451` | busiest town by `foldCity().production` | where the Opus is raised (`chain.ts:1815` prices it there too) |
| `bot.ts:5180–5190` | `modelClass` ladder, `mountedRanged → ranged`, default melee | how a row joins the mix |
| `bot.ts:5768` | `hereScore × switchMargin` (multiplies a possibly negative score) | the bar a march site must clear — asymmetric with `techGoalTable`'s ÷ |
| `bot.ts:5769, 5783`, `chain.ts:1344` | `ceil(distance / max(1, movement))` | crow-flight walk estimates ignore terrain, roads, hostiles |
| `bot.ts:6274–6297` | ground-only growth model; best improvement per hex, never negative | a site's citizen count over the horizon |
| `bot.ts:6006, 6078, 7002, 7532` | nearest first, id tie-break | flight, escort, withdraw, undefended-town targets are distance-only |
| `bot.ts:6791–6794`, `:6819`, `:6828`, `:6851` | `dealt − taken`; `bar = taken × max(floor, 1 − appetite)`; hard target = city phase or fortified-on-paying-ground; fires iff kills or `dealt > bar` | the whole exchange rule; no piece value, no lookahead |
| `bot.ts:6658` | `label.includes('has not shot yet')` | a held blow detected by string-matching its own label |
| `bot.ts:7295–7313` | skip wars under `sueFloor`; **nearest** target wins; push iff `gathered >= strikeForce` | which war is fought and when the column moves |
| `bot.ts:7866–7919`, `:7975–7993`, `:8018` | prophet ladder found → belief → second site → step off → sleep; apostle walks to the first consecrated town in `state.cities` order | religious pieces are ladders, unweighed |
| `bot.ts:8098` | strict `>` | a trader takes the best pay; no bias to a foreign market |
| `bot.ts:2700, 2733, 2953` | `optionIndex: 0` | an unreadable Order offer and every ruin boon take index 0 |
| `bot.ts:445` | `faithAppetite = god && !religion ? 1 : 0` | the faith appetite is binary; it never reads whether a religion can still be founded |
| `bot.ts:694–699`, `:713–715` | first `foundsCity` row; **nearest** legal site | the expansion chain is priced on the nearest site, not the best |
| `bot.ts:4204, 4208` | flat `weights.city` / `weights.worker` | a settler at a basket's front is flat — no falloff, unlike the queue |
| `chain.ts:1107–1158` | combatant → foundsCity → trades → prophesies → civilian | unit-unlock valuation; an explorer unlock is priced as a worker |
| `chain.ts:1044–1049` | the town with least `raise` | a wonder unlock is priced in one town, the fastest |
| `chain.ts:1830–1840`, `:1871–1879` | urgency `× 1 / × 0`; `× 0` when a rival closes first | the bead race is a cliff once open |
| `chain.ts:1952` | rival's close uses **our** `buildDelay` | a rival's raising priced at our busiest town |
| `chain.ts` (whole) | no age term | a technology's worth has no reading of the age it opens, the age the empire is in, or the world clock |
| `diplomacy.ts:1464–1492` | sort by ratio, seat id; `break` on the first with a road and odds | target empire = whom we can beat and reach; no value-of-target, no lead, no grievance |
| `diplomacy.ts:1571–1584` vs `campaign.ts:447–486` | nearest to our **pieces** vs nearest to our **towns** | the town declared on and the town campaigned against can differ |
| `diplomacy.ts:694–705` | lowest-id war acts | with several wars only one is sued/signed per ask |
| `diplomacy.ts:776–777`, `:1139–1194` | a sue offers lump coin only; counters fill coin → gpt → town → seams | the shapes of a paper |
| `diplomacy.ts:1636–1673` | roster × table × table, first writable | the one unprompted deal: a 1:1 luxury swap |
| `campaign.ts:289` | `fighting ? strikeForce : 0` | one strike force wanted however many wars are on |
| `campaign.ts:549, 565` | muster collapses onto the home town | no road → silent fallback |
| `campaign.ts` (whole) | no cap, no "failed" reading | a campaign is never abandoned; it dissolves when the war or the warscore does |
| `warLedger.ts:104, 115–116` | baseline at first read; career deltas | the exchange charges every war for every loss; a save loaded mid-war forgets |
| `wager.ts:152–201` | `WAGER_AIM`, `CAPITAL_COUNTS` | which staked bars lean on which voice — a table, not in the sheet |
| `wager.ts:363` | `min(1, max(0, projected/bar))` | the stake's margin curve is linear and clamped |
| `value.ts:2583–2600`, `:2658`, `:3420`, `:3463`, `:3994`, `:4734` | `return 0` | non-flat `pays` compress nothing; share/mirror with no `from`, veins, unread occasions, unread conditions and absent forecasts price **zero** (every other unread shape prices `unknownEffect`) |
| `value.ts:1840` | first combatant row in table order | "a piece's bar" |
| `value.ts:3433` | `LIVE_RITE_IDS[0]` | the first live rite's duration stands for all |
| `value.ts:4258–4330` | Doctrine/Order only; bench rank = field count | which cards get a deck margin and how the chair is chosen |
| `wants.ts:1242–1266`, `:1256` | prophet → apostle → non-naval combatant → settler → lump | a faith unit's reading; **a hull bought with faith is never a soldier** |
| `wants.ts:978` | owns any → skip | a second prophet/apostle/hull is never a want |
| `wants.ts:2207–2208` | `max(prior, marginal)` | meter prices ratchet up only; `priceBandLow` is unreachable for meters |
| `wants.ts:2305` | gold `× goldPressure`; faith/culture not | only gold's prior carries the collapse lever |
| `routes.ts:313–326`, `:352` | sorted by **land** pay; `modes[0]` | a sea pair's premium is not in the probe order; land preferred where both are legal |
| `plan.ts:630` | own territory only | surveys inside our borders only (the rule allows anywhere) |
| `driver.ts:250–256`, `:271` | refused-JSON memo → `break`; only `chooseGreatPerson` retried | how a refusal ends a seat's thinking |

### 1.4 What the arena's walker cannot represent

The panel is one control per numeric leaf, arrays replaced wholesale, string
arrays read-only (`src/arenaPage/knobs.ts`). It walks the base only. The
harness inherits every limit below, and a bounds sheet (§3.2) is where each is
written down.

- **Not on the panel at all**: `personas.*`, `puppetProfile.*` (stripped before
  the walk). `military.mix` and `score.tallyForecast` are shown as leaves but
  their *keys* are fixed by type — a control cannot add an occasion, and an
  absent forecast prints "no forecast" where 0 prints a figure.
- **Dead dials**: `military.huntRadius`, `score.nominalTiles`.
- **Zero is a switch, not a magnitude**: `driver.reaimsPerTurn`,
  `driver.reaskPerTurn`, `research.strandWeight`, `puppet.switchMargin`,
  `puppet.strandWeight`, `military.hardTargetMargin`, `military.scoutEarlyTurns`
  (also shuts the opening book), `solvency.graceTurns`, `wager.leanWeight`,
  `wager.malicePenalty` (0 = read the deck), `religion.tideShare`,
  `expansion.hexOffersPriced`, `war.refusalMemoryTurns`; `score.caravanScale`
  at **1** is off.
- **Sentinels**: `war.declareThresholdPeaceful` 999 (tall, zealot) and
  `war.acceptCeiling` 60 (tall, zealot) are "never" and "always", not points on
  a scale.
- **A mode flip**: `military.aggression` > 0 selects `war.declareThreshold`
  over `war.declareThresholdPeaceful` (`diplomacy.ts:354, 1373`) — the bar
  jumps from 4.5 to 1.4 between 0 and 0.01. The persona pin (only the
  warmonger above 0) makes this a persona-level fact the mutator must respect.
- **Silent floors** (a range of the slider is one setting):
  `priorities.switchMargin` < 1 → 1; `threat.techMilitaryFactor` < 1 → 1;
  `weights.debtAversion` < 1 → 1; `priorities.horizonTurns`, `score.lumpTurns`,
  `driver.endTurnAttempts`, `search.routeGateProbes`, `war.secondWarMultiple`,
  `war.strikeForce`, `war.dogpileSeats` < 1 → 1; `military.aggression` and
  `war.siegeExchange` clamped to [0, 1].
- **Knob against knob** (an ordering nothing enforces): `priceBandLow ≤
  priceBandHigh` (else the clamp collapses to high); `withdrawBelowHealth <
  healBelowHealth`; `tributeFloor < sueFloor < 0 < acceptCeiling`;
  `peaceExchange > 1`; `luxuryGoldBaseline / luxuryGptBaseline` is the rate;
  `score.nominalCount` is a **divisor** (0 → Infinity); `score.unknownEffect`
  must stay > 0 (the module's stated invariant); `war.declareThreshold` caps
  every persona's peace bar (`diplomacy.ts:356`).
- **Integer by use** (radii, counts, turns, loop bounds — a fraction floors or
  misbehaves): `driver.*`, `search.*`, `expansion.siteSearchRadius`,
  `expansion.hexOffersPriced`, `workers.searchRadius/planTopN/planRadius`,
  `growth.smallCityPop`, `military.campHuntRadius/garrisonPerCity/armyPerCity/scoutCap/scoutEarlyTurns/screenRadius`,
  `war.reachRadius/dogpileSeats/strikeForce/musterDistance/musterRadius/escortRadius/refusalMemoryTurns`,
  `solvency.minArmy/graceTurns/reserveTurnsOfUpkeep`, `score.nominalCount/patienceTurns/lumpTurns`,
  `threat.radius/sightedArmyCap`, `research.goalHorizon`, `wager.ageTurns`,
  `priorities.horizonTurns`.
- **Structured leaves**: `weights.{six voices}` are arrays whose length must
  cover `TechAge` (1–4; a shorter row reuses its last entry, `value.ts:725`);
  `military.mix` is unnormalised (four numbers summing to 1.2 are simply
  hungrier); `workers.improvements` is an ordering (ties) and a filter
  (unknown ids dropped silently).
- **One knob, several questions**: `war.strikeForce` (declaration bar, muster
  size, war-time levy — by design); `workers.searchRadius` (a great person's
  ring, not a worker's); `military.campHuntRadius` (both halves of the hunt;
  the docblock names `threat.radius`); `search.pathProbes` (also truncates the
  printed struck list); `weights.city` (a value-vector weight **and** a town's
  coin on a paper); `weights.bead` (race valuation and stake premium).

## 2. The missing strategy-level knobs

Each: (a) what exists, (b) the proposed row(s) — shape and default, (c) the
reader, (d) **NUMBER** (a number on an existing decision; the arena shows it
the day it lands) or **NEW** (a behaviour to write first; costs code). Defaults
reproduce today's play wherever a default can, so every new knob is an arena
A/B.

### 2.1 Which victory shape a seat plays for, and when it commits

- (a) The win is one door (`docs/beads.md`): beads from wagers kept or grants
  → the Opus. "Shape" therefore means **which wager family** (domination ·
  culture · science · economic, `data/wagers.json`) a seat's play is built to
  keep, and how early. Today: `wager.ts:appraiseWagers` stakes the best of the
  three dealt cards by projected margin, with no family preference; the lean
  (`wagerLeanOf`) exists only **after** a stake and only until the bar is met;
  `chain.ts:beadChain` goes live within `raceLiveHorizons`; personas do not
  differ in any of this. Nothing before the first deal (Æra II, turn ~60–80)
  leans the empire toward any family.
- (b) `wager.familyLean: {domination: 1, culture: 1, science: 1, economic: 1}`
  — a multiplier on a card's stake score and on its lean's worth, per family.
  `wager.standingLean: 0` — the worth of a *standing* lean on the seat's
  preferred family's `WagerCount` readings before any card is dealt (0 = today).
  `wager.commitMargin: 0` — the projected margin under which a stake is treated
  as a malice-avoidance pick (the card with the least malice cost) rather than
  the best bar; 0 = today.
- (c) `wager.ts:appraiseWagers` (multiply by the family's lean), `wagerLeanOf`
  (same), `value.ts:wagerVoicePremium/wagerAppetiteTerm` (a standing lean is a
  second `WagerLean` built from `WAGER_AIM` for the family's counts, no card).
- (d) `familyLean` **NUMBER** (two multiplications). `commitMargin` **NUMBER**
  (one comparison in the stake). `standingLean` **NEW** — a lean with no card
  needs a synthetic `WagerLean` and the family → counts mapping made data
  (`WAGER_AIM` moves to the wager rows or the sheet).
- Personas would then say what they are: tall → `science`/`culture`, wide →
  `economic`, warmonger → `domination` — as numbers, never a code path.

### 2.2 When expansion stops and development starts

- (a) Real behaviour, one lever: `weights.city × cityValueFalloff^towns`
  (`chain.ts:explainNextTown`) against every other chain at shadow prices, with
  the authority meter's price rising as the meter is short. No age term, no
  land term (the chain probes the *nearest* legal site, `bot.ts:713`, and a
  board with no site within `siteSearchRadius` prices the chain empty), no
  explicit "now build". `growth.smallCityPop/Premium` is the development side.
- (b) `expansion.cityValueFalloffByAge: [0.9, 0.9, 0.9, 0.9]` — the falloff
  per age (replaces the scalar; tall's 0.6 becomes a row). `expansion.frontierWeight: 0`
  — a scarcity term: the next town's worth × `(sites still legal within
  reach / this)` capped at 1; 0 = off. `growth.smallCityPop` → `[9, 9, 9, 9]`
  per age.
- (c) `chain.ts:explainNextTown` (index the row by `ctx.age`); `bot.ts:nextTownChain`
  already sweeps the radius for the nearest site — counting the legal ones is
  the same sweep; `bot.ts:explainCitizen` for the per-age pop.
- (d) The two age rows **NUMBER** (a wholesale array replace, the walker's own
  shape). `frontierWeight` **NEW** (small: the count and one term).

### 2.3 How a technology is valued by age

- (a) `chain.ts` has **no age term at all**: a node is the sum of its gifts
  (buildings per town, units, projects, abilities, effects, `paysBead`)
  discounted by the road's delay; age enters only through the weight rows
  inside `explainYields` and through the column's cost as delay. Nothing
  values crossing into the next age (the world clock deals wagers on the
  *mean* age — `docs/wager.md`), holding a military edge over a neighbour, or
  the Opus door (`alchemy` earns nothing for being the door unless it pays a
  bead). Breadth vs depth is only `research.goalHorizon` and `weights.tech`.
- (b) `weights.techByAge: [14, 14, 14, 14]` — the flat per-node worth per age
  (replaces `weights.tech`). `research.ageEntryValue: 0` — the worth of the
  node that first lifts this seat's `highestAge` (0 = today).
  `research.militaryEdgeValue: 0` — a unit unlock's worth × (their best
  strength / ours) when a neighbour's roster outclasses ours; 0 = today.
  `research.doorValue: 0` — the Opus door tech's own worth while the race is
  shut (0 = today).
- (c) `chain.ts:techChain` (`weights.tech` by age), `readNodeGifts` (age entry:
  compare `techDef(node).age` with the seat's `highestAge`; door: `gatingTech`),
  `chain.ts:unitTerm` (the edge needs a neighbour's best row — a reading over
  `state.units` per rival, which `diplomacy.ts:armyStrength` already walks).
- (d) `techByAge`, `ageEntryValue`, `doorValue` **NUMBER** (one clause each in
  a fold that already prints its terms). `militaryEdgeValue` **NEW** (a
  per-rival roster reading; shared with §2.5).

### 2.4 When a seat pivots to faith, or to wonders

- (a) Faith: `faithAppetite` is binary (a god held, no religion —
  `bot.ts:445`); `religion.prophetTechValue` floors the founder chain;
  `weights.faith[age]` is the zealot's whole identity. No race reading: a seat
  keeps wanting a prophet while rivals found first, and nothing reads whether a
  religion can still be founded. Wonders: an ordinary wonder is amortised over
  its full `turnsToBuild` like any row (`bot.ts:push`; `score.patienceTurns`
  applies to bead / `endsTheGame` rows only); a wonder is priced in one town
  (`chain.ts:1044`); nothing reads a rival's progress on the same wonder
  (`GameState.wonders` is the claim register; a rival's queue is invisible).
- (b) `religion.founderRaceWeight: 0` — discount the founder chain by the
  share of rivals whose faith rate would reach the founding first (the bead
  race's rival-clock idiom, `chain.ts:leadingRival`); 0 = today.
  `score.wonderPatienceTurns: 0` — the patience cap extended to every
  `wonder: true` row; 0 = today's full amortisation. `score.wonderRaceDiscount: 0`
  — a contested wonder (claimed elsewhere this age, or a rival's town
  visibly building it) × (1 − this); 0 = today.
- (c) `wants.ts:prophetTerms` (the race), `bot.ts:push` (patience by marker),
  `value.ts:explainBuildingRow` (the discount; the claim register is readable,
  a rival's *queue* only if fog allows — the honest reading is the register).
- (d) `wonderPatienceTurns` **NUMBER**. `founderRaceWeight` and
  `wonderRaceDiscount` **NEW** (each a rival sweep, both small, both with an
  idiom to copy).

### 2.5 How a neighbour's threat is read

- (a) Three readings, none of them a *neighbour*: `ctx.threat` counts enemy
  pieces within `threat.radius` of our towns (adjacency, an emergency);
  `sightedThreat` counts charted camps and hostiles in sight (the levy); the
  declaration's ratio reads a rival's **whole** army omnisciently
  (`diplomacy.ts:armyStrength`, no fog) against ours. No distance-weighted
  rival strength, no reading of a rival's persona or appetite, no memory of
  who declared on whom, no reading of a rival's lead (score, techs, wonders),
  and the garrison term does not know which border is the dangerous one.
- (b) `threat.rivalArmyWeight: 0` — per rival, fielded strength × proximity
  (1 / nearest-town distance) → added to the levy and to `garrisonValue` for
  the towns nearest that rival; 0 = today. `war.grievanceTurns: 0` — turns a
  declaration against us is remembered (a harness `WeakMap` on the state, the
  `dealMemory.ts` idiom), raising that rival's declaration score and lowering
  our acceptance of their peace; 0 = off. `war.leadEnvyWeight: 0` — the
  declaration score × (1 + this × (their `foldScore` / ours − 1)) — V1's
  score as a reason to fight the leader; 0 = today.
- (c) `campaign.ts:levyReading/sightedArmyWanted` and `bot.ts:garrisonWorth`
  (the per-rival term); `diplomacy.ts:explainDeclaration` (grievance and envy
  as printed terms); a `src/ai/grievances.ts` leaf beside `warLedger.ts`.
- (d) All three **NEW**. `leadEnvyWeight` is the cheapest once `foldScore`
  lands (one fold per rival per ask); `rivalArmyWeight` is the one the user
  will feel (a seat that arms the right border).

### 2.6 How a war is opened and ended

- (a) Fully built and printed (`docs/war-diplomacy.md` §13–14): bar × second
  war × dogpile → strike force → reach → expedition odds; peace by warscore
  floors and the exchange ledger. What is missing is **why**: the target is
  whom we can beat and reach (ratio, then seat id), never what the war would
  gain; there is no war goal, so a winning seat fights until the exchange
  turns; a campaign is never abandoned; a sue offers lump coin only.
- (b) `war.targetValueWeight: 0` — a candidate target's score × (1 + this ×
  the target town's site worth / `weights.city`) (`sites.ts:foldSite`, the
  settler's own reading); 0 = today's ratio-only order. `war.goalTowns: 0` —
  towns taken this war at which the seat sues for a white peace while ahead;
  0 = today. `war.aheadMargin: 1` — `ahead = theirs > ours × this` (the
  audit's `diplomacy.ts:425`). `war.siegePiecesWanted: 1` — pieces that
  shoot or lay siege the force needs (`:1399`). `war.campaignPatienceTurns: 0`
  — turns a push may stand at the walls without the town's hp falling before
  the column withdraws and the war is sued; 0 = never. `war.tributeShare: 1`
  — the share of the treasury a sue may offer (`:775`).
- (c) `diplomacy.ts:explainDeclaration` (value, envy), `explainStanding`
  (margin, goal), `peaceDecision` (share), `bot.ts:campaignPlan` (patience —
  needs the target's hp remembered across turns: a `WeakMap` beside the war
  ledger).
- (d) `aheadMargin`, `siegePiecesWanted`, `tributeShare` **NUMBER** (literals
  today). `targetValueWeight` **NUMBER** with one fold call (`foldSite` exists).
  `goalTowns` **NUMBER** (the ledger already counts towns this war).
  `campaignPatienceTurns` **NEW** (a memory).

### 2.7 Others the audit begs for

- **The levy's shape** (§1.3): `military.levyCapMultiple: 2`,
  `military.levySurplusSlope: 1`, `military.wildAggression: 0`,
  `war.siegeWithin: 1`, `military.siegeStrikeFloor: 0` — five **NUMBER**s that
  are the army-sizing and blow-taking literals the user has watched.
- **Hulls**: `bot.ts:5078` never queues a naval row and `wants.ts:1256` never
  prices one as a soldier — a whole class the bot cannot play, and no knob can
  open it. **NEW** (a `naval` role in the mix and a coast reading) — the
  maritime item on the user's resume list, not this batch.
- **The threat slope** `(1 + ctx.threat)`: `threat.wallSlope: 1` **NUMBER**.
- **Price floors**: `priorities.priceFloorScience: 1`, `…Faith: 1` (the table
  ×1 floors) **NUMBER** — or read `priceBandLow` there and retire the special
  case ▢.
- **The two dead dials** retire in the same batch (the `weights.die` precedent:
  a live box that moves nothing is a lie on the panel).

### 2.8 Ranking, and the first batch

Ranked by expected skill gain per unit of work (gain the user would see in a
game against the bot, work in the batch's hours):

1. **The war's why and the levy's shape** — §2.6's three literals + `targetValueWeight`
   + `goalTowns`, §2.7's five levy numbers. All NUMBER. The war is where the
   user meets the bot; every one of these is a printed term today.
2. **Expansion and tech by age** — §2.2's two rows, §2.3's `techByAge`,
   `ageEntryValue`, `doorValue`. NUMBER. The tuner cannot learn a curve the
   sheet has no row for.
3. **The wager's family lean** — §2.1 `familyLean`, `commitMargin`. NUMBER.
   Personas become victory shapes without a code path.
4. **A neighbour read as a neighbour** — §2.5 `rivalArmyWeight`,
   `grievanceTurns`, `leadEnvyWeight`. NEW, medium. The largest behavioural
   gain of the list; the last needs V1.
5. **Wonders and faith as races** — §2.4. One NUMBER, two small NEWs.
6. **The standing lean** — §2.1 `standingLean`, NEW; the campaign's patience,
   NEW. Later.

(rec) **First batch, before E1 runs a generation**: items 1–3 — every row
marked NUMBER above, defaults at today's play, the two dead dials retired, the
personas restated as numbers on the new rows (`familyLean`, the falloff row).
Roughly twenty-five knobs, each an arena A/B by construction, each with a
bounds row (§3.2). Items 4–6 are their own batches after the harness has run
on 1–3, so the tuner's first reading is of behaviour the user already
understands.

## 3. The harness

### 3.1 Where it lives and what it reuses

- `scripts/evolve.ts`, beside `scripts/gridSearch.ts`, run as
  `npx vite-node scripts/evolve.ts` — the runner the grid search already uses
  (vite-node resolves the JSON imports and the sim's module graph; there is no
  `tsx` in the repo and none is wanted). A tool, not a test: it asserts
  nothing (`gridSearch.ts`'s own argument).
- **The engine is the arena's**: `runArenaGame` (`src/arenaPage/run.ts`) —
  the real driver, the sim's own folds, the stall and refusal readings. The
  page's Web Worker is a shell around it; the script's worker is a child
  process around the same function (`gridSearch.ts:fanOut`'s pattern: this
  script re-spawned with `--worker`, one JSON task a line in, one result a
  line out, merged **by key**).
- **The judge is V1's** — `explainScore(state, playerId)` / `foldScore`, a leaf
  beside `ledgerFold.ts` with weights in `data/rules.json`'s `score` block
  (`docs/flags.md` (uuuuu)). Not on `main` at `3dce171`; the harness imports
  it and **is blocked on it landing**, and on nothing else. Until then the
  script can build against `scripts/gridObjective.ts`'s `foldStanding` behind
  a flag, for smoke only — it is the bot's own weight table and therefore the
  circular judge the grid search warns about.
- **Seating a candidate needs no source change.** A candidate is a whole
  `data/ai.json` shape (base + `personas` + `puppetProfile`). A seat plays it
  as persona P by: `persona` key omitted (balanced — identity, nothing merged),
  and `setAiTuning(mergeOf(candidate.base, candidate.personas[P]), {playerId})`
  — the seat sheet replaces every leaf, so the file's base under it is
  invisible, and the file's persona sheets are never consulted. The genome
  keeps the persona structure; the harness owns the merge (the same
  `deepMerge` rules — arrays replace, objects merge). `clearSeatTuning()` in a
  `finally` between games (`gridSearch.ts:playGame`).
  - Known gap: `aiConfigForPuppet` folds the **file's** `puppetProfile`. The
    genome's `puppetProfile` is frozen in E1 (not mutated), or the seam grows
    a per-seat profile — a source change, ▢ later.
  - `Player.persona` is written into the state by the persona key
    (`state.ts:3578`) and read by nothing in `src/sim/`; a seat with no key
    reports `balanced` in `SeatReading`, so the ledger carries its own persona
    column.

### 3.2 The genome, the bounds and the mutation

- **Genome** = the file's shape exactly: the seventeen blocks, `puppetProfile`
  (frozen), `personas` with **exactly today's keys** — a persona's override
  may change value, never gain or lose a leaf (the pins of §1.1 hold by
  construction; `balanced` stays `{}`). Two invariants the mutator checks
  before a child is played: every persona's paths ⊂ the base's; only the
  warmonger's `military.aggression` > 0.
- **Bounds live in a sibling sheet**, (rec) `data/ai.bounds.json`, so
  `data/ai.json` stays what the arena walks. One row per knob path:
  `{min, max, integer?, step?, frozen?, allowsOff?}`; array leaves carry a
  row per band or one row for the row. Rules: a numeric leaf **without a
  bounds row is frozen** (a new knob never enters the search unannounced);
  the sentinels (999, 60), the two dead dials, `driver.*` and `search.*`
  (compute caps, not skill — a tuner would learn to spend more CPU) are
  `frozen: true`; a switch knob (§1.4) is bounded away from 0 unless
  `allowsOff`; the knob-against-knob orderings are checked as a repair step
  after mutation (swap or clamp so `bandLow ≤ bandHigh`,
  `withdraw < heal`, `tributeFloor < sueFloor < 0 < acceptCeiling`). A core
  test pins: every bounds row names a live leaf; every integer-by-use leaf of
  §1.4 is `integer: true`; every leaf has a row or is listed as frozen.
- **Mutation**: Gaussian per knob, σ = `sigmaShare × (max − min)` (rec 0.1),
  each knob mutated with probability `pMutate` (rec 0.15, so ~20 of ~130
  leaves move in a child); integers rounded then clamped; **age rows** are
  mutated as one scalar on the whole row (the grid search's `scale` — the
  curve's shape is a design opinion) plus, with a lower probability, one
  band's jitter; `military.mix` renormalised to today's sum after mutation;
  persona overrides mutated at the same rate **relative to the base** (an
  override's value is a delta from the base's, so a base that moves carries
  its personas with it).
- **Crossover** (rec): uniform **by block** — a child takes each top-level
  block whole from one of two parents; a persona's override sheet travels with
  the block it overrides (a `war` block from parent A brings A's persona `war`
  overrides). Never across personas and never within a block: the knobs of a
  block were tuned against each other (`strikeForce` read three times is the
  argument), and a persona's override is meaningless beside another sheet's
  base.
- **Selection**: (μ + λ) with μ = 6 elites and λ = 12 children a generation
  (rec); parents by tournament of 3 over the elites; the **reigning champion**
  is the elite with the best fitness. A child's fitness is measured against
  the reigning champion (§3.4), which makes fitness a *relative* figure — so
  every genome's games are re-keyed and cached forever (§3.5), and a genome
  is never re-played.
- **Promotion rule** (rec): a child replaces the champion only when its
  advantage is positive on at least two thirds of its seed × size × mirror
  games, not merely on the mean — `t100-probe-noise` (eight seeds cannot read
  happiness to ±6.5) is the reason a mean alone is a coin toss.

### 3.3 The evaluation — candidate against the champions

- **One game**: six seats, the wild on, both boards. Seats 0/2/4 play the
  candidate, 1/3/5 the champion, with persona positions fixed
  `[balanced, wide, tall, zealot, warmonger, balanced]`; the **mirror** game
  on the same seed swaps the two sides, so over a pair each genome plays every
  persona and both sides of the seat-order tie-breaks. The reigning
  champion's own genome is the opponent (not every elite — cost).
- **Per child** (rec, the honest default): 4 seeds × {duel, standard} × 2
  mirrors = 16 games. Quick mode `--seeds 2` = 8. Seeds are a fixed
  acceptance set (so fitness is comparable across generations) plus a
  held-out set the champion is validated on every fifth generation; a
  champion that loses on held-out seeds is **flagged in the ledger**, never
  demoted by the script.
- **Turn horizons**: duel to 120; standard to **100** (§3.6 — the standard
  board's last twenty turns cost as much as the first hundred). ▢ whether a
  longer Opus sweep runs on the champion alone (§3.4).

### 3.4 Fitness — `foldScore` at a fixed turn, plus the Opus turn

- Per seat: `foldScore(state, seat)` read at the horizon turn T, or at the
  turn the game decided if earlier. **Objective, never the bot's own
  appraisal**: the weights are `rules.score`'s, not the candidate's — a
  candidate that trebles `weights.science` wins nothing by the scoring.
- **The Opus term**: a seat that raises the Opus before T scores its fold at
  that turn **plus** `(T − opusTurn) × opusBonusPerTurn` — earlier is better,
  and a decided game is not a lost measurement. ▢ `opusBonusPerTurn`
  (rec: `rules.score`'s own weight for the Opus line divided by 20, so ten
  turns earlier is worth half an Opus; the script reads it from the bounds
  sheet's header, never hard-codes it). Measured (§3.6): neither timing game
  reached the Opus by t120 on six seats, so within E1's horizons the term
  pays rarely; the honest reading of a *victory* pace needs the 240-turn
  duel bench `docs/wager.md` cut the threshold on — (rec) a weekly
  `--opus-sweep` on the champion only, ledgered separately.
- **A game's advantage** = mean fold of the candidate's three seats − mean fold
  of the champion's three; a child's **fitness** = the mean over its games,
  with the per-game sign counted for the promotion rule. Eliminated seats
  score their fold (towns lost are already in it). Warnings > 0 or a stall on
  any game **disqualify** the child and print the refusals — a bot that
  refuses its own commands is a bug, not a strategy (`run.ts`'s reading).

### 3.5 Cost, parallelism, determinism, ledger

- **Cost per game, measured** (§3.6): duel-120 31 s, standard-100 95 s,
  standard-120 171 s. Per child at the honest default: 8 × 31 + 8 × 95 =
  **1,008 CPU-s**; λ = 12 → 12,100 CPU-s ≈ **3.4 CPU-hours a generation ≈ 25
  min wall on 8 workers**; twenty generations overnight. Quick mode is half.
  The champion's side of every game is played in the same game (no separate
  champion cost); elites are re-scored only when the champion changes (their
  cached games are against the old champion — (rec) re-play the μ elites
  against a new champion once, 6 × 16 games, the price of a promotion).
  Games with stronger empires run longer (the standard board's cost is
  superlinear in towns), so the figure drifts up as the population improves.
- **Parallelism**: child processes, `os.availableParallelism() − 2` = **8 on
  this ten-core machine** (`gridSearch.ts`'s rule and its reason: the parent
  is bookkeeping and a saturated machine measures its own thermals). Not
  `worker_threads` — vite-node's transform is per process. Memory: one game
  is ~260–310 MB RSS; eight workers ≈ 2.5 GB.
- **Determinism, guaranteed**: a game is a pure function of (seed, size,
  seating, the two merged sheets); the sim's randomness is `state.rng`; the
  driver reads no clock (audited); the tuning seam clears every memo on
  install; the harness-side memories (`dealMemory`, `warLedger`, `PlanMemo`)
  are `WeakMap`s on a game's own objects. Results are merged by key and folded
  in plan order (floating-point sums in arrival order would make the ledger a
  fact about the machine's load). Nothing in a result carries a clock; wall
  time is printed, never written.
- **Determinism, detected**: every result carries the game's
  `sha256(snapshotState(state))` digest; every generation replays one
  **sentinel** game (champion vs champion, the first acceptance seed, duel) in
  two different workers and aborts the run on a digest mismatch; a cached
  fitness is re-verified when its digest is asked for. The in-tree pins today
  are `test/sim/aiDriver.slow.test.ts` (sixty turns, two seats, played twice)
  and `aiBot.slow.test.ts`'s byte-for-byte replay; the **120-turn six-seat
  digest at two seeds** exists only as the orchestrator's scratch procedure
  (`docs/flags.md` (jjjjj), (ttttt): "the 120-turn digests identical at two
  seeds"). (rec) E1 lands it as `test/sim/aiDigest.slow.test.ts` with the two
  digests as literals — the `explore.test.ts` `RANGED_BOARDS` pattern, re-cut
  on a schema bump — so the harness's sentinel and the suite's pin are one
  reading.
- **The ledger** (gitignored, `evolve/` at the root beside
  `gridsearch-results.json`): `ledger.csv` — one row per child per generation
  (generation, id, parent ids, fitness, wins/games, per-size and per-seed
  advantage, Opus turns, warnings, stalls, digest); `gen-NNN.md` — the
  generation's table sorted by fitness with the champion's knob deltas vs
  `data/ai.json` in `knobs.ts:describeEdit`'s own print
  (`weights.food 9.8,8.4,7,5.6 → …`); `champion.json` — the full sheet in the
  file's shape; `champion-diff.md` — the sparse override, which is also what
  the arena's sheet loader takes.
- **The winner is written back by hand, only.** The script never opens
  `data/ai.json` for writing; the user pastes `champion.json` (or the sparse
  diff) and the gate is the suite: `aiPersona.test.ts` (the pins),
  `arenaPage.test.ts`, the bounds sync test, and the digests re-cut with a
  sentence in the changelog. A pasted champion is a balance change and lands
  like one.

### 3.6 The measurement

One headless 120-turn six-seat game (`runArenaGame`, seed 20260831, personas
balanced/wide/tall/zealot/warmonger/balanced, the wild on, `tuning: null`),
one core, this machine, vite-node in the worktree:

| board | wall | t0–20 | –40 | –60 | –80 | –100 | –120 | outcome |
|---|---|---|---|---|---|---|---|---|
| duel (40×25) | **31.0 s** | 1.7 | 3.1 | 4.7 | 5.7 | 7.2 | 8.1 | no winner; 0 refused; 0 stalls; 307 MB |
| standard (80×52) | **170.7 s** | 2.8 | 5.0 | 8.6 | 46.5 | 31.6 | 70.3 | no winner; 0 refused; 0 stalls; 259 MB |

The standard board at t120 held 10/9/2/5/8/7 towns and 54/34/13/25/46/36
pieces; the duel board 8/8/3/3/2/4 and 30/33/22/14/12/16. A1's own figure
(turns 101–120 at 1.5 s a turn, `docs/flags.md` (jjjjj)) is the same reading:
the standard board's late turns are where the cost is, and where a stronger
population will push it.

## 4. The difficulty lever, separate

- **What it is**: a handicap sheet, (rec) `data/handicap.json` — named levels
  (the user's words; the specimen's voice, never "easy/hard" if the game has
  better ones), each a row of bonuses **for bot seats**: `yieldPercent` per
  voice (an empire-stage percentage), `productionCostPercent`,
  `upkeepPercent`, `happinessFlat`, `sightBonus`, `startingUnits`, and a
  `mapKnown` flag. A level is a `GameConfig` field (`config.difficulty`, or
  per seat on `PlayerSpec`) — in the save, replayed, byte-identical at the
  default level.
- **Where it reads, rule 5**: a yield handicap is a labelled line in the
  breakdown or it is a lie. The percentage lands in `cityYieldPercents`
  (`src/sim/yields/town.ts`) at stage `empire` with source
  `Handicap · <level>`, folded by `applyStages` like every other percentage
  (Entry XVII: two stages, never a third); a flat joins `explainCentreYield`
  as a line; the cost half is a line in `explainBuildingCost`/`explainUnitCost`
  (`cities.ts`, the one standard of `docs/production-costs.md`); upkeep a
  line in `explainEmpireGold` (never a second fold); sight a term where the
  visibility sweep reads a piece's `sight`. The Ledger classifies the lines
  as `other`; the Compendium prints the level's rows from data. A doc table
  of the levels carries a sync test.
- **Why it stays out of the evolution loop**: the tuner measures **skill at
  equal rules** — candidate and champion on one board under one rule set,
  and any bonus in the loop is a bonus the tuner learns to lean on rather
  than play around. Difficulty is the *player's* dial and orthogonal to it:
  what the user feels is handicap × skill, and the two are tuned in that
  order — skill first, so the handicap's levels are cut against a bot that
  plays as well as it can, and a level's bonus is then the honest distance
  between the bot's best and the player's. A skilled bot also lets the ladder
  start lower: the top level may need no bonus at all.

## What the user must rule on

1. **The first batch** — (rec) §2.8's items 1–3 as NUMBERs with today's
   defaults, before E1 plays a generation; the NEW behaviours (§2.5, §2.4,
   the standing lean) as later batches. ▢ Or E1 first on the sheet as it is.
2. **The bounds sheet's home** — (rec) `data/ai.bounds.json`, sync-tested
   against the sheet's leaves, a leaf without a row frozen. ▢ Or
   `scripts/evolve.bounds.json`, untested.
3. **Frozen from the search** — (rec) `driver.*`, `search.*` (compute caps),
   `puppetProfile`, the sentinels, the dead dials. ▢ Add `solvency.*`?
4. **The horizons and the Opus term** — (rec) duel 120 / standard 100 for
   the fold; `opusBonusPerTurn` = the Opus line's weight ÷ 20; a separate
   240-turn duel Opus sweep on the champion only. ▢ Longer horizons at the
   measured cost (standard-120 is 1.8× standard-100).
5. **The evaluation's size** — (rec) 4 seeds × 2 sizes × 2 mirrors = 16 games
   a child, λ = 12, μ = 6, ~25 min a generation on 8 workers; promotion on
   two thirds of games, not the mean. ▢ Quick mode as the default.
6. **Crossover** — (rec) uniform by block, personas travelling with their
   block, never across personas. ▢ Mutation only.
7. **The six-seat digest as a tiered test** — (rec) `aiDigest.slow.test.ts`
   with two literals, re-cut on schema bumps, the harness's sentinel reading
   the same. ▢ Keep it a scratch procedure.
8. **The two dead dials** — (rec) retire `military.huntRadius` and
   `score.nominalTiles` in the first batch (the `weights.die` precedent).
   ▢ Give `huntRadius` its reader instead (the hunt reads `campHuntRadius`
   for both halves today, and the docblock disagrees with the code).
