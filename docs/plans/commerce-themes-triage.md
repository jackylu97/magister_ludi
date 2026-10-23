# Batch T triage: the Commerce themes pass

**Status:** written 2026-10-23 by a triage agent that changed no code and no data, before any batch in this plan. It is the plan to build the Commerce deck as `docs/plans/commerce-themes.md` and `docs/plans/commerce-list-proposed.md` now stand: the themes pass, its revision of 2026-10-21 (section 12), and your answers of 2026-10-23 (section 13). Section 13 outranks sections 2 to 12, and section 12 outranks sections 2 to 10. The readings below are the ones the build uses unless you change them here. Mark any you disagree with, as on the deck sheets.

Source: the two plan docs above, `docs/decks/commerce.md` (the sheet of 2026-10-07, in the old format), `data/decks/commerce.json` and the rows of `data/decks/common.json` that name Commerce. Facts were checked against the code at commit `0d5ab0dc` (branch `decks`, after Expansionist batch E13). Earlier Commerce batches used the names C1 to C8, so this plan's batches are T1 to T9.

**Groups:**
- **1, data only:** the text can be written with shapes that exist today. The cell names the shape.
- **2, new shape, no new player decision:** the behaviour is automatic, or uses UI that exists. The cell names what is missing.
- **3, waits on you:** no card of the deck. Questions 3 and 4 decide two shared cards (T7).

Each cell starts with the batch that builds the row.

## Facts the cells rely on

**The sheet, the data and the tests.**
- `data/decks/commerce.json` holds 97 Order rows: 68 live, 6 deferred (The Return Leg, The Treaty Ports, Export Guilds, The Consulate, The Post Riders, The Embargo) and 23 retired. No row carries a `type`. The deck has no Doctrine rows, and no deck but Dominion has any (15 live). Checked.
- `data/decks/common.json` holds 17 rows that name Commerce. 13 carry a type (those shared with Dominion, Expansionist and Scientific). Pilgrim Markets, The Tithe, Travelling Players and The Cosmopolitan Court carry none. Mercenary Contracts is deferred. The Art Dealers has no row. Checked.
- `docs/decks/commerce.md` is in the old format: statuses built, revised, new and deferred, no Type column, no Doctrine tables. **No test reads it as a sheet.** `test/sim/decks/commerce.test.ts` pins the data by hand: 97 rows, 23 retired, 68 live, 6 deferred, the band spread `[15, 22, 30, 15, 15]`, lists of the rows that write a shape, "twenty-nine turns is not thirty" for Established Routes, and an age-2 gate (no band 0 row names a route, trader, post or Market). `test/sim/decks/commerceSheet.test.ts` pins ruling (qqqqqq) 1's +25% and +38% gold rows. Checked.
- `test/sim/decks/sortedSheets.ts` lists `SORTED_DECKS = ['dominion', 'expansionist', 'scientific']`. `dominion.test.ts` fails a typed row that no sorted sheet lists. Batch E0 typed the shared rows of decks not yet sorted, which is the precedent for the Devotion and Magisterial rows. Checked.
- The sorted sheets check their shared tables against `common.json` (tier, rarity, text, type). The Dominion sheet lists The Escorted Roads at Tier I and Mercenary Contracts as `modify: deferred`. The Expansionist sheet lists The Grain Exchange at Tier I. The Scientific sheet lists The Exchange of Discoveries (`modify: moved`, Tier I) and Merchant Scholars (`modify: revised; moved`, Tier III), and leaves both to the Commerce build (`docs/plans/scientific-build-triage.md`). Checked.
- Tests that seat or pin a row this plan retires or moves: `commerce.test.ts` (Ore Caravans, Frontier Investment, Venture Routes, The Merchant Dynasties, The Waqf, The Brokers' Redraw), `commerceSheet.test.ts` (Bought Swords, Frontier Investment, Patrons Abroad, The Waqf), `test/sim/statecraft.test.ts` (Frontier Investment, Venture Routes, The Caravanserai Network, and "theSilkRoadMonks · routeYield" in the fold registry), `test/sim/routeTally.test.ts` (The Caravanserai Network), and `test/fixtures/cardText.json`. Checked.
- `SCHEMA_VERSION` is 168 (`src/sim/state.ts`), pinned in `test/sim/state.test.ts`, which also pins the turn's phase list. Checked.

**Routes and posts** (`trade.ts`, `routes.ts`, `routeYields.ts`).
- A route is `Unit.trade` (`TradeRoute`: `from`, `to`, `expiresTurn`, `startedTurn`, `autoResend`), written only by `startRouteAt`. The term is `rules.trade.routeTurns` (20). A renewal (`autoResend`, in `marchOneTrader`, `turn.ts`) rewrites `expiresTurn` and keeps `startedTurn`. Checked.
- **A route writes your post at both ends.** `startRouteAt` calls `openPost` at the origin and the destination, `{ by, since }`. So a foreign route leaves your post in your own origin town too. `openPost` and `closePost` are the only writers of `City.posts`, and the code says so. `closePost` drops a post that has not ripened when your last route to the town ends. Checked.
- A post is established when `cityHoldsPost` finds `turn − since ≥ postTermTurns()` (20). It pays when `cityPostPays` also finds peace and no blockade. Checked.
- No occasion fires when a route starts, renews or lapses, or when a post is established. `TurnReport.routesEnded` reports endings as news only. Checked.
- `CityScope` `holdsPost` and `CountKind` `citiesAdmitted` (with `admits`) exist, so "your towns holding your post" is data only. `postCities` counts foreign towns only. Checked.
- `cardRouteYieldLines` (`statecraft/evaluator.ts`) asks `countOf` with the route's **origin** as the town, so a route line counted `within: 'city'` reads the origin. `docs/yields.md` describes the route · count pair as counted by `routeLength` only. Checked.
- `CountKind` `population` ignores `admits` (evaluator, `case 'population'`). `CardPeriodicEffect` has `everyTurns`, `pays`, `amount` and `count`, and no `admits`. `fromTownPopulation` (The Topping Out) pays food and production only, and culture banks once for the empire. Checked.
- The range gate is `gateRoute` (`trade.ts`), lifted by `rangeWaived`, which asks for a sea route, the rule `postsWaiveSeaRouteRange` and a paying post at both ends. Checked.
- `productionBonus` takes a `scope`; `routeEndsHere` has `crossing`, `direction`, `atLeast`, `atMost` and `farEnd`. Checked.
- **Bots never renew a route.** Nothing in `src/ai/` sends `setAutoResend` (`SetAutoResendCommand`, `applySetAutoResend`, `commands.ts`). Bots hire with `routeDecision` and send with `traderCommand` (`src/ai/bot.ts`). Checked.

**Deals and luxuries** (`deals.ts`, `diplomacy.ts`, `cities.ts`, `resourceEffects.ts`).
- A live deal is a row in `state.deals` (`DealState`) with terms `goldPerTurn` (tribute), `luxuries` (one copy of each kind named), `openBorders` and, at a peace, `cities`. It runs `RULES.war.dealTurns` (20) to an absolute `untilTurn` (`dealIsLive`). War cancels it (`cancelDealsBetween`). **A deal of gold alone leaves no row.** Checked.
- `proposeDealError` asks for peace, a live seat, something on the table and luxuries the proposer can spare. It asks for no route, no Currency and **no meeting**: only the diplomacy screen limits the list to empires you have met. Checked.
- `lentCopiesAwayBy` and `dealsBetween` exist. The net count is `netCopies` (`cities.ts`): your copies minus those lent away, plus those lent to you. No `CountKind` reads deals. `deals.ts` is a leaf, and the evaluator may import it with no new cycle. Checked.
- Bots offer one-for-one swaps of spare copies (`swapDecision`), sweetened with gold or tribute on a second try, and accept a human's offer that their appraisal (`explainSide`) scores at zero or more. Checked.
- The holdings sweep is cached on the economy clock, which does not move when a card is seated, so a card rule on copies is applied outside the cache (Strategic Exports' precedent). The deal gate (`availableCopies`) and the bots' last-copy checks read whole copies. Checked.
- The Silk Road's loan: `importedLuxuries` (`resourceEffects.ts`), one kind for each international route, at half value (`importedLuxuryPercent` 50; `meters.ts` pays the luxury happiness at half, rounded down). Its twin `runningRouteImports` (`routeImports.ts`) is pinned equal by `test/ui/tradeImports.test.ts`. Checked.
- `effectAmplifier` with target `luxuryDuplicates` at 100% already makes every copy count, but it reaches every line a luxury's `copiesFor` reads (yields, extra happiness rows, authority, renown, percentages). The flat luxury happiness (`perUniqueLuxury`, 4) counts once a kind. Checked.
- `purchaseTileAt` fires `tilePurchase` with no facts: no price and no hex. `windfallRider` has no tile test. Checked.
- `TileCondition` has `improved` (tended works excluded), `resourceKind` (only a resource the reader can see) and `all`. Checked.

**The purse** (`purchase.ts`, `upkeep.ts`, `state.ts`).
- Gold is refused in five places: `purchaseGate` (buildings, units and caravans), `tilePurchaseGate`, `greatPersonPurchaseError`, `contributeError` and `rerollError`. `settleReroll` clamps gold at zero outside `spendGold`. `spendGold` only subtracts. The Trade screen compares gold with the price itself (`tradeScreen.ts`). Checked.
- `rules.upkeep.disbandBelow` is −10, read in `disbandCandidate`. `debtPercent` (−25% science and culture) applies whenever the treasury is below zero (`treasuryInDebt`). Checked.
- `Player.goldSpent` counts units, buildings, hexes, caravans, great-person drafts and gold poured into the Opus. It does not count upgrades, a deal's lump of gold or gold rerolls. Checked.
- No tally is raised once a turn on a condition; all 23 `TALLY_OCCASIONS` are events. Checked.
- `CardRouteRiderEffect` has `extra`, `scope`, `count`, `per`, `max` and `building`, and no `family`. `cardRouteSlots` builds a stand-in count without one. Checked.
- `Unit.freeUpkeep` is written only at five seams, and purchases are left out on purpose. `unitStamp` has no `timed`. `Unit.timed` is read for combat and movement, never for upkeep. Checked.

**Commissions.**
- A commission row carries `commission: { goals, reward }`. `CommissionReward.lasting` is read by `liveEffects` from `commissionsFulfilled` (an institution). No Dominion or Expansionist row pairs a one-time reward with `lasting`; Dominion has 8 institutions of 13 commissions, Expansionist 5 of 5, Scientific none of 3. Checked.
- `CommissionFigure` has fifteen members. None counts towns that receive a route or the empires your routes reach. Checked.
- The Great Loan is a commission row: its goal is a gold income of at least one, so it pays at the end of the turn it is seated. Checked.
- Feature C (Dominion D11) counts met commissions of every deck, so Commerce's commissions feed The Ovation and The Res Gestae in a Dominion seat with no T work. Checked.

**The bots** (`src/ai/value.ts`, `data/ai.json`).
- D16 prices a commission as its reward, discounted by the forecast turns to its goal, and an institution through `lastingWorth`. `score` has groups for `dominion`, `scientific` and `expansionist`, and none for `commerce`. Checked.
- `value.ts` switches exhaustively on `CardEffect` kinds, `WindfallOccasion`, `TallyOccasion` (`occasionRecord`) and rule ids. A count goes through the sim's `countOf`. `routeRider` is priced as `extra` times towns, and its `count`, `per` and `max` are ignored. Checked.
- The bot's purse compares gold with prices itself (`bot.ts`, `wants.ts`), so it would not see a credit line. Checked.

**Where the code differs from the pass.**
- **The Hanse and The Grain Barges need no new shape** (section 7 says they do). The Hanse is `citiesAdmitted` with `holdsPost`. The Grain Barges is a route line counted by the origin's `population`.
- **The Champagne Fairs is not near existing.** The Topping Out's per-town grant pays only food and production. It needs `admits` on the `population` count and on `periodic`.
- **The Fondaci pays twice for many routes.** A route writes your post at both ends, so a route to a new town can establish two posts. The pass priced one.
- **A deal needs no meeting in the sim.** Section 12 says a deal needs a met empire; only the screen asks.
- **The Casa da Índia is nearly built.** The `luxuryDuplicates` amplifier does it, but for every line of a luxury, not only its yields.
- Letters of Credit reaches five refusal points, not one, and the Trade screen and the bot each compare gold themselves.

## Tier 0

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| Market Day | new; revised (section 13) | 1 | T2. `pays` `where: 'capital'`, `basis: 'count'`, `count: 'capitalPopulation'`, `to: 'gold'`, `amount: 1`. Text: "Your capital gains +1 gold for every citizen." (reading 5). |
| The Emporia | new; revised (section 13) | 1 | T2. `pays` `where: 'hex'`, `on: { test: 'all', of: [{ test: 'improved' }, { test: 'resourceKind', kind: 'luxury' }] }`, food 1, production 1. Text: "Improved luxury hexes gain +1 food and +1 production." (reading 6). |
| Land Speculation | implemented; reworked | 2 | T5. Missing: `tilePurchase` carries no facts. It needs the price (`gold`) and the hex on `WindfallOccasionFacts`, and a tile test on `windfallRider` asked of that hex. Then `windfallRider` `tilePurchase`, `on: { test: 'hasResource' }`, grant culture `amount: 0.5`, `fromOccasion: 'gold'` (Civic Receipts' grant) (reading 24). |
| Salt Tithes, Travellers' Letters, The Pathfinders' Company, The Map Sellers, The Assayer's Rule, The Mineral Trade, The Nest Egg | implemented | – | Built (7). |

The Merchant Shrines moves to the shared table (T1). Coastal Estates retires (T1). The Carters' Guild moves to Tier II.

## Tier I

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| Private Patronage | implemented; revised (section 13) | 1 | T1. `percentYields` gold 38 → 40. The 20% slower ordinary buildings stays (reading 4). |
| The Market Writ | implemented; trimmed | 1 | T1. Drop `percentYields` gold 38. The authority count stays. |
| The Grain Banks (was The Agora) | new; revised (section 13) | 1 | T2. `pays` `where: 'city'`, gold 3, scope `{ test: 'hasBuilding', building: 'granary' }` (Common Ledgers' form). Text: "Cities with a Granary gain +3 gold." Uncommon, Economic (reading 7, question 2). |
| The Market Halls | new | 1 | T2. The Scribes' Hall's shape: two `pays` `where: 'city'`, count `population` `within: 'city'`, `per: 3`, food 1 and production 1, scope `hasBuilding` market (reading 35). |
| Export Guilds | new (a deferred data row); reworked | 2 | T5. Feature D's count of copies lent. Two `pays` `where: 'capital'`, `basis: 'count'`: culture 4 and production 2. The row `exportGuilds` moves band 2 → 1 and common → uncommon in T1, and leaves `deferred` in T5 (readings 20, 21, 41). |
| Letters of Credit | new | 2 | T6. Missing: a card value for a spend floor, one helper for "what this empire may spend" that the gold gates ask, and `disbandCandidate` reading the same floor in place of `disbandBelow` (reading 25). |
| The Strongbox | new | 2 | T6. Missing: a `TallyOccasion` raised once a turn after the yields bank, with the treasury as a fact and a floor (300) on the card's row. Then The Gathering Host's form: two `pays` count `tally`, science 1 and culture 1, `max: 15` (reading 26). |
| Civic Receipts, Financed Industry, The Staple Right, Commercial Education | implemented | – | Built (4). |
| The Planters' Charter (charter) | modify: as built | – | Plays as built. |

Bought Swords, Frontier Investment, Ore Caravans and Venture Routes retire (T1). The Post Riders, a deferred row, retires (T1). Provisioning Contracts, The Common Road and The Factors' Houses move to Tier II, and Established Routes to Tier III.

## Tier II

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| Provisioning Contracts | implemented; moved | 1 | T1. Band 1 → 2. |
| The Carters' Guild | implemented; reworked; moved | 1 | T1. Band 0 → 2. Its two `pays` rows become `productionBonus` category building, percent 25, scope `{ test: 'routeEndsHere', crossing: 'domestic' }` (reading 34). |
| The Factors' Houses | implemented; trimmed; moved | 1 | T1. Band 1 → 2. Drop `percentYields` gold 25 (scope `holdsPost`). |
| The Common Road | implemented; moved | 1 | T1. Band 1 → 2. |
| The Spice Exchange | implemented; moved | 1 | T1. Band 4 → 2. |
| Corner the Market | implemented; reworked (an institution) | 1 | T1. Reward `lasting`: `pays` `where: 'empire'`, `basis: 'count'`, `count: 'duplicateLuxuries'`, `to: 'happiness'`, `amount: 2`. Drop the great merchant and the 225 gold. The goal is unchanged (readings 8, 9, 42; question 1). |
| The Customs Houses | implemented; reworked | 1 | T1. The Merchant Dynasties' two rows at amount 4: count `tilesInBorders`, `within: 'city'`, tile improvement customsHouse, science and culture. Drop the hex gold, the renown and the +38% gold (reading 33). |
| Names in Stone | new | 1 | T2. Two `pays` `where: 'city'`, count `goldSpent`, `percent: 1`, `per: 200`, `stage: 'city'`, `max: 30`: science and culture (readings 29, 30). |
| The Hanse | new | 1 | T2. Two `pays` `where: 'city'`, count `citiesAdmitted`, `admits: { test: 'holdsPost' }`, `percent: 3`, `stage: 'city'`, `max: 10`: production and culture. The pass lists a new shape; it exists (readings 13, 30). |
| Bills of Exchange | new | 1 | T2. `pays` `where: 'city'`, count `bankedGold`, `percent: 1`, `per: 100`, `stage: 'city'`, `max: 30`, to production (reading 30). |
| The Foreign Factor | implemented; reworked | 2 | T3. Missing: a `CountKind` of the citizens of foreign towns holding your paying post, a quarter of each town, floored town by town. Then `pays` empire count, science 1 and culture 1. The host's +2 gold row stays (reading 14). |
| The Fondaci | new | 2 | T3. Missing: a `WindfallOccasion` `postEstablished`, fired by a sweep of `City.posts`, with the town and its citizens as facts. Then `windfallRider` `postEstablished`, science 20 and culture 20, `fromOccasion: 'population'` (reading 12). |
| Commission: The Great Fair | new | 2 | T4. Missing: a `CommissionFigure` for your towns a domestic route arrives at. Reward `lasting`: `routeRider` `extra: 2` (readings 8, 10). |
| The Treaty Ports | new (a deferred data row); reworked | 2 | T5. Feature D's count of deal partners. `pays` `where: 'city'`, count, to production, `percent: 5`, `stage: 'city'`, `max: 5`. The row moves band 1 → 2 in T1, and leaves `deferred` in T5 (readings 20, 21, 41). |
| The Merchant Guilds | new | 2 | T6. Feature A. Missing: `family` on `routeRider`, passed through `cardRouteSlots`, and its words. Then `routeRider` `extra: 1`, count `guildsmen`, family merchant, `per: 2` (reading 28). |
| The Home Market, The League of Cities, Foreign Procurement, Royal Assays, Mining Districts, Strategic Exports, Houses of Account | implemented | – | Built (7). |
| The Exchange, Numidian Cavalry (charter) | modify: as built | – | Play as built (2). |

The Caravanserai Network retires (T1), and so does The Consulate, a deferred row. The Waqf, The Silk Road Monks and The Brokers' Redraw move to the shared table (T1). The Scholars' Roads moves to Tier III.

## Tier III

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| Caravanserai Cities | implemented; trimmed | 1 | T1. Drop `percentYields` gold 30. The rule stays. |
| Established Routes | implemented; revised; moved | 1 | T1. Band 1 → 3. `standingTurns` 30 → 20, and the text (reading 19). |
| The Scholars' Roads | implemented; moved | 1 | T1. Band 2 → 3. |
| The Strongroom | implemented; revised; moved | 1 | T1. Band 4 → 3, rare → uncommon, goal `treasury` 2,000 → 1,500, and the text. It keeps its one-time reward (reading 8). |
| The Return Leg | new (a deferred data row); reworked | 2 | T3. Missing: a copy of a domestic route's pay for its origin, switched on by a rule (for example an `ActionRuleId` `homeRoutesPayOrigin`), as labelled lines at the route step of the origin's fold. The row moves band 1 → 3 and uncommon → rare in T1, and leaves `deferred` in T3 (readings 16, 41). |
| The Champagne Fairs | new | 2 | T3. Missing: `admits` read by the `population` count, and `admits` on `periodic`, passed into its probe. Then `periodic` every 10 turns, culture, `amount: 10`, count `population`, admits `routeEndsHere` domestic (reading 17). |
| The Admiralty of Trade | implemented; reworked | 2 | T3. `rangeWaived` (`trade.ts`) drops its sea clause and asks only that the destination holds your paying post. The rule is renamed. Rare → uncommon (reading 18). |
| The Lingua Franca | new | 2 | T3. Missing: a `CountKind` of every live route in the world. Then two `pays` `where: 'city'`, `percent: 1`, `per: 3`, `stage: 'city'`, `max: 30`: science and culture (readings 15, 30). |
| The Commenda | new; revised (section 13) | 2 | T5. Missing: a lent copy kept for its lender at half value, outside the holdings memo, as a list of its own (the Silk Road loan's model), and half the lent copies, rounded down, added to the card counts. The deal gate does not change (reading 2, question 6). |
| The Capitulations | new | 2 | T5. Missing: a rule id, and a walk of your paying posts abroad in `importedLuxuries`, after the routes (reading 22). |
| The Endowment, The Gilded Scaffold, A Guild Commission, The Chartered Metropolis, The Money Lenders, A Court of Merchants, The Bourse, The Customs Service | implemented | – | Built (8). A Guild Commission keeps its one-time reward (reading 8). |
| The Monopoly | modify: as built | – | Plays as built. |

Safe Conduct is cut. It has no data row, so it leaves the list (reading 1).

## Tier IV

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| Bought and Paid For | implemented; reworked | 1 | T1. Two `pays` `where: 'city'`, count `purchasedBuildings`, `within: 'city'`, `bank: 'gold'`, `percent: 4`, `stage: 'city'`, `max: 6`: production and culture (reading 32). |
| Money at Work | implemented; reworked | 1 | T1. `pays` `where: 'city'`, count `bankedGold`, `per: 500`, science 1, no `max` (reading 31). |
| The Grain Barges | new | 1 | T2. `pays` `where: 'route'`, `crossing: 'domestic'`, `basis: 'count'`, count `population`, `within: 'city'` (the origin), `per: 4`, food 1, production 1. The pass lists a new shape; it exists (reading 40). |
| The World's Fair | implemented; reworked | 2 | T4. Missing: a `CommissionFigure` of the empires your routes reach, and a reward that writes your post, established at once, in each one's capital, through a third post writer. Drop the timed +50% (readings 8, 11). |
| The Casa da Índia | new | 2 | T5. Missing: the `luxuryDuplicates` amplifier narrowed to a luxury's flat yields. The amplifier at 100% is a data-only alternative, but it multiplies every line of the luxury (reading 23, question 5). |
| The Merchant Works, The Hired Garrison, The Trade Winds, The World's Exchange, The Neutral Flag, Merchant Princes | implemented | – | Built (6). |
| The Great Loan | modify: as built | – | Plays as built (a commission met the turn it is seated). |

Patrons Abroad and The Merchant Dynasties retire (T1), and so does The Embargo, a deferred row.

## Shared with another deck

How the build handles the cards of decks whose themes pass has not happened (Devotion, Magisterial): it builds what you approved (the moves to the shared file and the tier moves), changes no partner text, and types the rows by the Commerce sheet, as batch E0 typed the shared rows of unsorted decks. Each partner's pass may then revise the row in `common.json`, and its triage reconciles both sheets (reading 37). Recommended: build them now, because you approved the moves and a row moved later is a second change to the same pools.

| Card | Status | Group | Shape, what is missing, or the question |
|---|---|---|---|
| The Waqf, The Silk Road Monks (Devotion) | implemented, and as built; moved to the shared cards | 1 | T1. The rows move to `common.json`, `decks: ['commerce', 'devotion']`, ids, texts and bands unchanged, typed Civic (reading 37). |
| The Brokers' Redraw (Magisterial) | as built; moved to the shared cards | 1 | T1. As above, `decks: ['commerce', 'magisterial']`, typed Wildcard. The screen still has no button for a gold redraw, so Magisterial seats inherit the gap (Follow-ups). |
| The Merchant Shrines (Devotion) | implemented; moved to the shared cards (section 12, answered) | 1 | T1. As above, Tier 0, typed Civic. It is the Devotion pair's early shared card. |
| The Escorted Roads (Dominion), Pilgrim Markets (Devotion), The Grain Exchange (Expansionist) | implemented; moved | 1 | T1. Band 1 → 2 (section 12, answered). The Dominion and Expansionist sheets' shared rows move with them. |
| The Exchange of Discoveries (Scientific) | implemented; moved | 1 | T1. Band 3 → 1. The Scientific sheet's row becomes `implemented`. |
| Travelling Players (Magisterial) | modify: revised; moved | 1 | T1. Band 0 → 2, because it needs a route. Its built text stays. The Commerce sheet's revised text counts the decks seated in your government, which is Magisterial's material, so it waits for the Magisterial pass (reading 38). |
| Merchant Scholars (Scientific) | modify: revised; reworked; moved | 1 | T2. Band 1 → 3. `pays` `where: 'route'`, `crossing: 'international'`, count `tilesInBorders`, `within: 'city'` (the origin), tile improvement academy, science 2. `docs/yields.md` names the counts read at the origin on its route · count row. The Scientific sheet's row becomes `implemented` (reading 36). |
| Mercenary Contracts (Dominion) | modify: deferred; reworked | 2 | T6. "Military units you buy cost no upkeep for twenty turns." Missing: a timed effect stamped on a bought unit (`unitStamp` with a `timed` field writing `Unit.timed`), read by the upkeep fold. The Dominion sheet's row becomes `implemented` (reading 27). |
| The Art Dealers (Magisterial) | add | 2 | T7, if you answer yes to question 4. Missing: a `WindfallOccasion` for a card entering your collection (a pick, a charter). Then `windfallRider`, gold 15. |
| A Dominion card for Tier I or earlier | not on the sheet | 3 | Question 3. T7 if you answer yes. |
| Market Gardens, The Provincial Fair, The Tithe, The Merchant Navigators, Books from the Ships, Letters of Marque, War Bonds, Professional Soldiers, The Chartered Company (charter), The Cosmopolitan Court | implemented, or as built | – | Built (10). |

**Each pair's early shared card** (ruling (qqqqqq) 14: every pair keeps one at Tier I or earlier):
- Expansionist: Market Gardens (Tier 0).
- Devotion: The Merchant Shrines (Tier 0, moved in T1).
- Scientific: The Exchange of Discoveries (Tier I, after T1).
- Magisterial: none with a row. Travelling Players leaves Tier 0, and The Art Dealers has no row (question 4).
- Dominion: none. The Escorted Roads moves to Tier II, and Bought Swords is removed (question 3).

**Tier I's Military chair.** No shared card fills it: the shared cards at Tier I after T1 are The Exchange of Discoveries (Civic) and The Art Dealers (Economic). The gap is small:
- every government has a Wildcard chair;
- a Tier 0 Military card the seat holds (The Pathfinders' Company) can sit in a Tier I Military chair;
- the partner deck's Tier I Military cards are dealt too, and Devotion's and Magisterial's cards are unsorted, so they fit any chair.

It bites a Commerce seat with Expansionist or Scientific under the War Chief (two Military chairs). Recommended (question 3): share Dominion's The Standing Army (Tier 0, uncommon, Military, built: "Garrisoned units cost no upkeep. Cities with a Barracks gain +30% production toward military units."). It mends the Dominion pair's early card and gives a Commerce seat a Military card that pays in its own currency, because upkeep is gold. Its Barracks half is Dominion's. Tier I keeps no Commerce Military card of its own, as Tier III has none.

## Commerce's commissions: the mix

Section 13, item 5: *"institutions are ok, do a mix of institutions and one time boons"*. The proposal, as readings 8 to 11 to confirm (question 1):

| Commission | Tier | Becomes | Text | What it reads and pays | Shape |
|---|---|---|---|---|---|
| Commission: The Great Fair | II | institution | Commission. Have domestic trade routes arrive in four of your towns at the same time. Then, for the rest of the game, you may run two more trade routes. The card leaves its chair. | Reads your towns that receive a home route. Pays two route slots for good. | `lasting` `routeRider` `extra: 2` exists; the goal figure is new (T4). |
| Corner the Market | II | institution | Commission. Hold four copies of one luxury, counting copies you receive in deals. Then, for the rest of the game, gain +2 happiness for each luxury you hold two or more copies of. The card leaves its chair. | Reads the luxuries you hold spare copies of. Pays happiness. | `lasting` `pays` empire count `duplicateLuxuries` to happiness, data only (T1). |
| The Strongroom | III | one-time | Commission. Goal: end a turn with at least 1,500 gold in your treasury. Reward: culture equal to a fifth of your treasury at that moment, and a great merchant. The card then leaves its chair. | The moment the hoard is cashed. | Exists (T1 changes the figure). |
| A Guild Commission | III | one-time | Unchanged. | A free great-person draft. | Exists. |
| The World's Fair | IV | one-time | Commission. Have trade routes to four other empires at the same time. Then your trading post is established in the capital of each of them. The card leaves its chair. | Plants posts, which then last and pay. | Figure and reward new (T4). |

Why this split:
- **The Great Fair is an institution already.** Two route slots "for the rest of the game" is a lasting reward. The network it rewards keeps running.
- **Corner the Market becomes one.** Holding copies is a standing state, so a lasting reward on spare copies keeps paying the choice the goal asked for. The old reward paid gold, the deck's own yield. Happiness is civic life, which the goods reach only through The Monopoly. Size: a luxury kind gives +4 happiness (`perUniqueLuxury`), so three spare kinds at about turn 100 give +6, worth one and a half new luxuries. It takes no chair, so it sits under a Tier II regular card, as Dominion's The Border Fortress does. Royal Assays, deals and Corner the Market's own goal raise the count.
- **The Strongroom stays one-time.** The fun is the moment: spend the hoard or cash it. A lasting reward from the hoard would repeat The Nest Egg, Bills of Exchange, Money at Work and The Money Lenders.
- **A Guild Commission stays one-time.** A great-person draft is one act. A lasting reward on bought buildings would be the fifth card that reads them.
- **The World's Fair stays one-time.** The posts it writes are lasting objects already.
- **The Great Loan** is a commission row but a loan, met the turn it is seated. It stays as built, outside the five.
- Corner the Market loses its great merchant, so the bankers' commissions bring one merchant (The Strongroom). Merchant Princes and A Court of Merchants still feed the family.

## Feature D: deals as a card quantity (T5)

You accepted it on 2026-10-23 (section 13, section 10's item 2).
- **Two `CountKind` members** (reading 20):
  - copies lent: the sum of `lentCopiesAwayBy`'s values, one for each copy of each kind this empire lends in a live deal;
  - deal partners: the empires that hold at least one live deal row with this empire (`dealIsLive`), each once, in seat order, as `tradePartnerEmpires` walks.
- Each needs its member, its `COUNT_WORDS` entry (`describers.ts`, which the compiler requires) and its `countOf` arm. The evaluator imports `deals.ts`, a leaf; `test/mapgen/moduleCycles.test.ts` is in the gate. The counts stay fresh because `openDeal`, `cancelDealsBetween` and `pruneDeals` move the economy clock.
- **Cards:** Export Guilds (copies lent, Tier I) and The Treaty Ports (deal partners, Tier II).
- **What it does not add:** a moment when a deal is signed, a new screen or a new command. A deal of gold alone leaves no row, so it does not make a partner.
- **The bots** offer swaps of spare copies already. T9 teaches the deal appraisal (`explainSide`, `src/ai/diplomacy.ts`) what a lent copy pays a seat holding Export Guilds or The Commenda, and what a new partner pays a seat holding The Treaty Ports.
- **Other decks' cards it opens** (section 6 of the pass: tribute received, renown from envoys, cheaper research, religious pressure) are not in this plan. Each deck's pass may use the two counts.

## Doctrines

- Commerce has no Doctrine rows and none designed. Section 8 of the pass: *"Commerce has no Doctrines yet, so none falls outside a theme. They come after your cuts: one for each theme at most of Tiers I to IV."*
- **What the sheet needs (T1):** a Doctrine table (Doctrine | Build | Text) under each of Tiers I to IV, empty, and the header line "Doctrines: none yet." The sheet test skips Doctrine tables, and the counts tables count Orders only.
- **The design is the deck pass's stage 6, not this plan:** three to five Doctrines a tier (12 to 20), each written for one of the four themes or the engine, most with a drawback, offered with the governments of tiers 4, 10, 18 and 26. A triage of its own then builds them.
- Until then a Commerce seat's Doctrine offer comes only from its partner, because an empty bag gives its place to the rest. Only Dominion has Doctrines, so a Commerce seat with any other partner is offered none.
- Safe Conduct's rule (war does not end your trade) was cut by you. The Doctrines pass does not bring it back unless you ask.

## Cut and retired rows

| Rows | In the data now | Action |
|---|---|---|
| Coastal Estates, Bought Swords, Frontier Investment, Ore Caravans, Venture Routes, The Caravanserai Network, Patrons Abroad, The Merchant Dynasties (merged into The Customs Houses) | live | T1: `retired: true`, off the sheet and the Commerce shelf (reading 39). |
| The Consulate, The Post Riders, The Embargo | deferred | T1, the same. |
| Safe Conduct, The Agora (replaced by The Grain Banks), The Homeward Cargoes and the eight 10-17 cards not taken | no row | None. They never reach the sheet. |

T1 retires 11 rows, so the retired count goes from 23 to 34. It moves 4 rows to `common.json`, so `commerce.json` goes from 97 rows to 93: 56 live, 3 deferred and 34 retired.

## Readings

The first nine come from section 13. The rest are new. Each gives the reading the build uses, then the alternative. A reading is how the build interprets a text that could mean two things.

1. **(Section 13)** Safe Conduct is cut. It has no row, so nothing retires. A war still ends every route between the two empires and stops your posts in the enemy's towns.
2. **(Section 13)** The Commenda: "Luxuries you lend in a deal count as half a copy for you."
   - Counts and goals (`uniqueLuxuries`, `luxuryCopies`, `duplicateLuxuries`, `monopolyLuxuries`, Corner the Market's figure) read, for each kind, the copies you keep plus half the copies you lend, rounded down. Two copies of silk lent count as one silk.
   - Happiness and yields: a kind you hold only through lent copies is held at half value, as a Silk Road loan is (its happiness at half, rounded down, and each yield line at half). A kind you also keep a copy of pays as today. Silver's and gold's per-copy lines pay half for each lent copy.
   - The deal gate (`availableCopies`) and the bots' last-copy checks read the count without the card, so one copy is never lent twice.
   - The rule is applied outside the holdings memo, as Strategic Exports is.
   - Alternative: keep halves as fractions in every count, which every reader of whole copies would have to learn.
3. **(Section 13)** Bought Swords' row retires, and it is not shared with Dominion. Its rule `boughtUnitsCountAsTrained` stays in the code (reading 39).
4. **(Section 13)** Private Patronage pays +40% gold and keeps its drawback.
5. **(Section 13)** Market Day: "Your capital gains +1 gold for every citizen." It counts the capital's citizens (`capitalPopulation`), and pays nothing with no capital. It is the tall seat's gold card.
6. **(Section 13)** The Emporia: "Improved luxury hexes gain +1 food and +1 production." A hex line: a worked hex with a luxury you can see and any improvement, a tended work excepted. Alternative: only the improvement that opens the luxury, which needs a new tile test.
7. **(Section 13)** The Grain Banks takes The Agora's place: Tier I, uncommon, Economic, "Cities with a Granary gain +3 gold." It is the home market's widen card for market towns, and it pays before Currency, because the Granary is an age-1 building. Size: five Granary towns at turn 60 pay +15 gold, a Tier I regular card. It sits beside the shared The Grain Exchange (Tier II), which reads the same Granary towns.
8. **(Section 13, item 5)** Two institutions, The Great Fair and Corner the Market; three one-time rewards, The Strongroom, A Guild Commission and The World's Fair. The Great Loan stays as built, outside the five. Alternative: The Strongroom also becomes an institution, which repeats the hoard cards.
9. Corner the Market's institution is "+2 happiness for each luxury you hold two or more copies of", read from the net count (deals included; lent copies per reading 2). Its goal is unchanged.
10. The Great Fair's figure counts your towns that are the destination of at least one of your domestic routes, at the end of a turn. It is built as a general figure, your towns a scope admits, with the scope on the goal (`routeEndsHere` domestic), through `citiesAdmitted`'s walk. Alternative: a figure for this card alone.
11. The World's Fair's figure is `tradePartnerEmpires`' walk. When the goal is met, the reward reads the partners again and writes your post in each one's current capital, dated a full term back, so it is established at once and `closePost` never drops it. A capital that already holds your post gains nothing new, and a partner with no capital gives nothing. The post pays by the ordinary rule (peace, no blockade), and it fires The Fondaci's moment (reading 12). Alternative: a written post does not pay The Fondaci.
12. The Fondaci: every post of yours that is established counts, at home or abroad, each by its own town's citizens. A route writes your post at both ends, so a route to a new town can establish two. A town that already holds your post does not establish it again. The moment fires when the post is established, whether or not it pays that turn. Alternative: only the destination of a route counts.
13. The Hanse counts your towns holding your paying post, the capital and the origins of foreign routes included. "At most +30%" is `max: 10`.
14. The Foreign Factor: the sum, over foreign towns holding your paying post, of each town's citizens divided by four, floored town by town, paid to your empire. A suspended post counts nothing. The host's +2 gold stays as built.
15. The Lingua Franca counts every live route of every real empire, yours included, foreign and domestic. A renewed route counts once.
16. The Return Leg: domestic routes only. The origin gains a copy of everything the route pays its destination: the base, every card line and every share (Established Routes' +50% included), as labelled lines at the route step (step 6 of `docs/yields.md`). The copy is not a route line, so no card that reads or multiplies routes reaches it, and it never travels again. Alternative: the route's base pay only.
17. The Champagne Fairs: towns a domestic route of yours arrives at; every ten turns as `periodic` counts them; the culture banks once for the empire, ten times the citizens of those towns.
18. The Admiralty of Trade: any route, by land or sea, whose destination holds your paying post ignores the range limit. The origin needs no post. Every other clause of the gate still runs. The rule is renamed (for example `postsWaiveRouteRange`). Alternative: sea routes only.
19. Established Routes at twenty turns: a route's term is twenty turns, so only a renewed route reaches twenty. A renewal keeps the start, so the second term pays half again (T8 teaches the bots to renew).
20. Feature D's two counts are as defined in its section. A deal of gold alone leaves no row, so it adds no partner. War cancels deals.
21. Export Guilds pays your capital for each copy lent, so two copies of silk lent count twice. A copy lent under The Commenda is still lent. The Treaty Ports is a city-stage percentage, at most +25% (`max: 5`).
22. The Capitulations: `importedLuxuries` walks the routes first, then the foreign towns holding your paying post, in state order, one kind each, never a kind you hold or another loan has claimed, at half value. It needs no Silk Road. The Trade screen's twin `runningRouteImports` stays the route half, and its pin compares the route half.
23. The Casa da Índia: every copy of a luxury pays the luxury's flat yields (food, production, gold, science, culture, faith). Its happiness, authority, renown and percentages count once a kind. Silver's and gold's per-copy rows are not counted twice. Alternative: the existing amplifier at 100%, data only, which also multiplies the other lines (question 5).
24. Land Speculation pays culture equal to half the price, rounded down, when the bought hex holds a resource you can see.
25. Letters of Credit:
    - Purchases may take the treasury to −150: buildings, units, caravans, hexes and great-person drafts. Gold poured into the Opus and gold rerolls are not purchases and keep their checks.
    - Your units are not disbanded until the treasury falls below −150.
    - The −25% science and culture of debt still starts below zero. The card's text is unchanged.
    - Alternative: every gold spend, the Opus and rerolls included.
26. The Strongbox: the tally is raised once a turn, after the turn's yields bank, when the treasury holds at least the row's floor (300, on the card's row). It counts only while seated, stops at +15 (`max`), and keeps its count when the card is unseated, as every tally does.
27. Mercenary Contracts: a military unit bought with gold or faith while the card is seated costs no upkeep for twenty turns from its purchase, through a timed effect on the unit. It keeps the waiver if the card leaves its chair, as Professional Soldiers' stamp does. Alternative: gold only.
28. The Merchant Guilds counts the merchants in the trades across your towns (`guildsmen`, family merchant), one more route for every two, as `routeRider`'s `extra` adds capacity.
29. Names in Stone counts what `Player.goldSpent` counts, gold poured into the Opus included. Alternative: purchases only.
30. The deck's percentages on a count (The Hanse, Names in Stone, Bills of Exchange, The Lingua Franca, The Treaty Ports, Bought and Paid For) are city-stage lines at `where: 'city'`, as The Exchange and The Spice Exchange are. Alternative: the empire stage, which multiplies over the town percentages.
31. Money at Work: every town gains +1 science for every 500 gold, with no cap. A treasury below zero counts as nothing (`bankedGold`).
32. Bought and Paid For counts, in each town, the buildings bought there with gold, six at most (+24%).
33. The Customs Houses counts the customs houses inside each town's borders, worked or not (The Merchant Dynasties' count). Its old hex gold, renown and +38% gold go.
34. The Carters' Guild: towns a domestic route of yours arrives at. "Buildings" is the building category, the Magnum Opus included (Dominion's reading 32); wonders are their own category.
35. The Market Halls: towns with a Market, citizens divided by three, floored.
36. Merchant Scholars counts the Academies inside the origin town's borders (`tilesInBorders`, improvement academy), on foreign routes only.
37. The four rows moved to `common.json` keep their ids, texts and bands. They are typed Civic (The Waqf, The Silk Road Monks, The Merchant Shrines) and Wildcard (The Brokers' Redraw). A save that holds one reads the same.
38. The shared route cards follow section 12's rule, no route card before Tier II. Market Gardens stays at Tier 0 (section 12, answered), so the widened age gate test names it as the one exception. Travelling Players keeps its built text until the Magisterial pass.
39. The eleven rows retire in T1, before any card that replaces them lands. A save that holds one keeps it, with its effects. A shape only a retired row uses stays in the code (`boughtUnitsCountAsTrained`, Venture Routes' route term, Frontier Investment's route share). A test that seats a retired row directly stays; a test that deals one from a pool changes.
40. The Grain Barges: the origin's citizens divided by four, floored, paid to the destination. Under The Return Leg the origin is paid the copy too.
41. The three deferred rows (The Return Leg, Export Guilds, The Treaty Ports) take their new text, band and rarity in T1 and stay `deferred`, with no effects and a plain sentence, so the Compendium shows the target card (Expansionist's reading 37). A live row whose new text needs a new shape keeps its old text until its batch.
42. Corner the Market's goal reads net copies: copies lent to you count, Royal Assays' extra copies count, Silk Road loans do not.

## The batches

**One track.** No other deck's batches are planned at `0d5ab0dc`: the Dominion, Expansionist and Scientific plans are complete. The T batches run one at a time. If a Devotion or Magisterial track starts, the shared files are `common.json`, the three statecraft files, `docs/orders-and-doctrines.md`, the card text fixture, the schema line, `src/ai/value.ts` and `data/ai.json`.

**Keep each batch additive in the shared files:**
- Put a new union member beside the Commerce members already there, and a new switch arm beside the Commerce arms in the evaluator, the describers and `src/ai/value.ts`.
- A batch that adds a member to a union `value.ts` switches on exhaustively (a `CardEffect` kind, a `WindfallOccasion`, a `TallyOccasion`, a rule id) adds a stand-in arm in the same batch, so the tree typechecks. T9 prices it.
- In `docs/orders-and-doctrines.md`, edit only the Commerce shelf, the Cross-type table and their notes.
- Rewrite `test/fixtures/cardText.json` with `CARD_TEXT_WRITE=1 npx vitest run test/sim/cardTextSnapshot.test.ts`.
- Each card batch bumps `SCHEMA_VERSION` once and updates its pin.

**The sheet.** T1 writes the sheet in the sorted format. Each later batch sets its own rows to `implemented`, with the Ability cell equal to the data row's text and the Type column equal to its `type`, and recomputes the counts tables.

### T1: the sheet of record, the sort, the retirements, the moves and the changes in place

- **Builds:**
  - **The sheet.** Rewrite `docs/decks/commerce.md` in the format of `docs/decks/scientific.md`:
    - a header: what the sheet is; "Why each card is here" names the themes pass (sections 12 and 13 hold your rulings) and the list doc; "The build plan" names this triage; "Doctrines: none yet";
    - the status list (`implemented`; `modify` with `deferred`, `revised`, `reworked`, `moved`, `rarity`, `shared` and `as built`; `add`), and the Type note;
    - two counts tables (by status, by type), five tier tables (Card | Rarity | Status | Ability | Type), an empty Doctrine table under Tiers I to IV, the shared table (Card | Rarity | Also in | Tier | Status | Ability | Type), and "Open for your pass" with a "Ruled 2026-10-23" list pointing at section 13 of the themes pass and the commissions mix;
    - every card of this plan's tier tables, with its target text and type. A trim is `modify: revised`. The cut rows are off the tables. The old sheet stays in git.
  - **The sort.** `commerce` joins `SORTED_DECKS`. Every row the sheet lists carries the Type cell's type in the data: 59 Commerce rows and 21 shared rows. A retired row carries none.
  - **The sync test,** in `test/sim/decks/commerce.test.ts`, on the model of `expansionist.test.ts`: statuses, types, counts tables, every live row listed once, the shared table mirrored onto `common.json`, every shared row naming Commerce listed. The file's own pins move: 97 → 93 rows, 23 → 34 retired, 68 → 56 live, 6 → 3 deferred, the band spread, the lists of rows that write a shape, and Established Routes' "twenty-nine turns is not thirty". **The age gate widens to section 12's rule:** no Commerce row and no shared row naming Commerce reads a route, a trader or a post before Tier II, Market Gardens excepted by name. A Market is allowed from Tier I.
  - **The retirements:** 11 rows (reading 39).
  - **The moves:** The Waqf, The Silk Road Monks, The Brokers' Redraw and The Merchant Shrines to `common.json` (reading 37). The Devotion and Magisterial sheets each gain a line in their shared section naming the cards moved, for their passes to confirm.
  - **Cards changed in place (15):** Private Patronage, The Market Writ, Provisioning Contracts, The Carters' Guild, The Factors' Houses, The Common Road, The Spice Exchange, Corner the Market, The Customs Houses, Caravanserai Cities, Established Routes, The Scholars' Roads, The Strongroom, Bought and Paid For, Money at Work.
  - **The three deferred rows** take their target text, band and rarity (reading 41).
  - **The shared tiers:** The Escorted Roads, Pilgrim Markets and The Grain Exchange to band 2, The Exchange of Discoveries to band 1, Travelling Players to band 2. The Dominion, Expansionist and Scientific sheets' shared rows change with them.
- **Fence:** `data/decks/commerce.json`, `data/decks/common.json`, `docs/decks/commerce.md`, the shared rows of `docs/decks/dominion.md`, `docs/decks/expansionist.md` and `docs/decks/scientific.md`, a line in `docs/decks/devotion.md` and `docs/decks/magisterial.md`, the Commerce shelf and the Cross-type table of `docs/orders-and-doctrines.md`, `test/fixtures/cardText.json`, `src/sim/state.ts` (the schema line) and `test/sim/state.test.ts`, `test/sim/decks/sortedSheets.ts`, `test/sim/decks/commerce.test.ts`, `test/sim/decks/commerceSheet.test.ts`, `test/sim/decks.test.ts` (the live count falls by the eight live rows retired), `test/sim/statecraft.test.ts` and `test/sim/routeTally.test.ts` (rows that retire or move), a new `test/sim/decks/commerceThemeCards.test.ts`. `src/sim/statecraft/describers.ts` only if a sentence reads badly.
- **Depends on:** nothing.
- **Schema:** one bump (11 rows leave the pools, 4 rows change decks, every listed row gains a type).
- **Done-gate:** `npx vitest run test/sim/decks/commerce.test.ts test/sim/decks/commerceSheet.test.ts test/sim/decks/commerceThemeCards.test.ts test/sim/decks/common.test.ts test/sim/decks/shared.test.ts test/sim/decks/dominion.test.ts test/sim/decks/expansionist.test.ts test/sim/decks/scientific.test.ts test/sim/decks.test.ts test/sim/statecraft.test.ts test/sim/routeTally.test.ts test/sim/commissions.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`, and the fence's files typecheck.

**Built 2026-10-23** (`e482ebae`). Schema 169. The explore digests moved by the version alone (checked with the version printed as 168). The plan missed 14 more schema pins, and four tests outside the fence that pinned The Strongroom's 2,000 gold (`commissions.test.ts`, which also opens a second Wildcard chair now that The Strongroom is Wildcard; `test/ui/commissionRail.test.ts`; `test/sim/aiCommissions.test.ts`; the Scientific sheet's header count). The "Notes and deferred halves" section of `docs/orders-and-doctrines.md` is left for T2. New readings:

43. (T1) Merchant Scholars stays at Tier I until T2. The age gate names it as a second exception, and pins its band, so T2 must remove the exception.
44. (T1) The live rows that wait on a later shape keep their old text and rarity in the data until their batch: Land Speculation, The Foreign Factor, The Admiralty of Trade (still rare) and The World's Fair.
45. (T1) The sheet has a seventh status reason, `as built`, which the sync test checks. The Standing Army joins the shared table in T7.

### T2: the new data-only cards

- **Builds:** eight Commerce rows (Market Day, The Emporia, The Grain Banks, The Market Halls, Names in Stone, The Hanse, Bills of Exchange, The Grain Barges) and the shared Merchant Scholars. The route · count row of `docs/yields.md` names the counts read at the origin (The Grain Barges, Merchant Scholars).
- **Fence:** `data/decks/commerce.json`, `data/decks/common.json` (Merchant Scholars), `docs/decks/commerce.md`, the Merchant Scholars row of `docs/decks/scientific.md`, `docs/yields.md` (one row), the Commerce shelf and the Cross-type table, `test/fixtures/cardText.json`, the schema line and its pin, `test/sim/decks.test.ts` (Commerce's live rows 56 → 64), `test/sim/decks/commerceThemeCards.test.ts`. The describers only if a sentence reads badly.
- **Depends on:** T1.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/commerceThemeCards.test.ts test/sim/decks/commerce.test.ts test/sim/decks/scientific.test.ts test/sim/yieldsDocSync.test.ts test/sim/decks.test.ts test/sim/statecraft.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.
- **After T2 a playtest can start:** 60 of the 77 cards and charters play as written.

### T3: routes and posts

- **Builds:**
  - The Return Leg: a rule, read where a home route's pay is folded (`routeYields.ts`, the route step of `yields/town.ts`), that writes the copy into the origin's breakdown as labelled lines. `docs/yields.md` registers it, and its sync test is in the gate (reading 16).
  - The Fondaci: a `WindfallOccasion` `postEstablished`, fired once for each post of the empire that ripens, with `townId` and `population` as facts. It is fired by a sweep of `City.posts` in a new turn phase (the `roadJoinings` phase is the precedent) or by a stamp on the post record; the batch chooses, says why, and pins it. One helper fires it, so T4's written posts can call it (reading 12).
  - The Foreign Factor: a `CountKind` of foreign post citizens, floored town by town (reading 14).
  - The Lingua Franca: a `CountKind` of every live route in the world (reading 15).
  - The Admiralty of Trade: `rangeWaived` widened and the rule renamed (reading 18).
  - The Champagne Fairs: `admits` read by the `population` count, and `admits` on `CardPeriodicEffect`, passed into its probe (reading 17).
- **Fence:** the shared six (Commerce parts: `statecraftData.ts`, `statecraft/evaluator.ts`, `statecraft/describers.ts`, `data/decks/commerce.json`, the Commerce shelf, the fixture), `docs/decks/commerce.md`, `src/sim/trade.ts` (`rangeWaived`), `src/sim/routes.ts` (the post helper), `src/sim/routeYields.ts`, `src/sim/yields/town.ts` (the route step only), `docs/yields.md`, `src/sim/turn.ts` (a phase, if chosen), the schema line and its pin (and the phase list in `test/sim/state.test.ts`), `test/sim/decks.test.ts` (Commerce's live rows 64 → 68), `src/ai/value.ts` (stand-in arms), `test/sim/trade.test.ts` and `test/sim/decks/commerce.test.ts` (their Admiralty pins), a new `test/sim/decks/commerceRoutes.test.ts`.
- **Depends on:** T2.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/commerceRoutes.test.ts test/sim/trade.test.ts test/sim/commercialPosts.test.ts test/sim/routeTally.test.ts test/sim/yieldsDocSync.test.ts test/sim/decks/commerce.test.ts test/sim/decks.test.ts test/sim/statecraft.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts test/mapgen/moduleCycles.test.ts`.

### T4: the trade commissions

- **Builds:**
  - A `CommissionFigure` for your towns a scope admits, with the scope on the goal, read in `commissionFigure` through `citiesAdmitted`'s walk (reading 10). Card: Commission: The Great Fair, a new row with a `lasting` `routeRider`.
  - A `CommissionFigure` for the empires your routes reach (`tradePartnerEmpires`' walk), and a `CommissionReward` field that writes your post in each partner's capital through a third post writer, exported from `trade.ts` beside `openPost` and `closePost`, dated a full term back. The writer's docblock names the three writers. It calls T3's Fondaci helper (reading 11). Card: The World's Fair, changed in place.
- **Fence:** the shared six (Commerce parts), `docs/decks/commerce.md`, `src/sim/commissions.ts`, `src/sim/trade.ts` (the writer), the schema line and its pin, `test/sim/decks.test.ts` (68 → 69), `src/ai/value.ts` (a stand-in for the reward), `test/sim/commissions.test.ts`, a new `test/sim/decks/commerceCommissions.test.ts`.
- **Depends on:** T3.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/commerceCommissions.test.ts test/sim/commissions.test.ts test/sim/aiCommissions.test.ts test/sim/commercialPosts.test.ts test/sim/decks/commerce.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.

### T5: goods and deals (feature D)

- **Builds:**
  - Feature D's two counts (its section). Cards: Export Guilds and The Treaty Ports leave `deferred`.
  - The Commenda's half copy (reading 2): a list of lent copies kept at half value for their lender, outside the holdings memo, read by `meters.ts` and `resourceEffects.ts` as the Silk Road loan is, and half the lent copies, rounded down, added to the card counts and Corner the Market's figure. The deal gate and `ai/` checks do not change. Card: The Commenda, a new row.
  - The Capitulations: a rule id and the posts walk in `importedLuxuries` (reading 22). Card: a new row.
  - The Casa da Índia: the `luxuryDuplicates` amplifier narrowed to flat yields, for example a field on `effectAmplifier` (reading 23). Card: a new row. If you answer question 5 with the alternative, it is the existing amplifier at 100%, data only.
  - Land Speculation: the price and the hex on `tilePurchase`'s facts (`purchaseTileAt`), and a tile test on `windfallRider` (reading 24). Card: changed in place.
- **Fence:** the shared six (Commerce parts), `docs/decks/commerce.md`, `src/sim/deals.ts` (read; a helper only if needed), `src/sim/cities.ts` (`purchaseTileAt`'s facts, the copy counts), `src/sim/resourceEffects.ts`, `src/sim/meters.ts`, `src/sim/commissions.ts` (the copies figure), `src/sim/routeImports.ts` and `test/ui/tradeImports.test.ts`, the schema line and its pin, `test/sim/decks.test.ts` (69 → 74; Land Speculation was live already), `src/ai/value.ts` (stand-ins), a new `test/sim/decks/commerceGoods.test.ts`.
- **Depends on:** T3 (The Capitulations reads posts).
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/commerceGoods.test.ts test/sim/deals.test.ts test/sim/resourceCopies.test.ts test/sim/resourceEffects.test.ts test/sim/meters.test.ts test/sim/tilePurchaseGate.test.ts test/sim/occasionRiders.test.ts test/ui/tradeImports.test.ts test/sim/decks/commerce.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/statecraft.test.ts test/mapgen/moduleCycles.test.ts`.

### T6: the purse and the hoard

- **Builds:**
  - Letters of Credit: a spend floor on the card (for example a `rule` with a value), one helper for what an empire may spend that `purchaseGate`, `tilePurchaseGate` and `greatPersonPurchaseError` ask, and `disbandCandidate` reading the floor. The three comparisons in `src/ui/tradeScreen.ts` ask the sim's gate, so the screen does not refuse a hire the sim allows (reading 25).
  - The Strongbox: a `TallyOccasion` raised once a turn after the yields bank, with the treasury as a fact and a floor on the row, read in `recordScalingOccasion` (reading 26).
  - The Merchant Guilds: `family` on `routeRider`, through `cardRouteSlots` and the describers (reading 28).
  - Mercenary Contracts (shared with Dominion): `unitStamp` with a `timed` field that writes a timed effect to `Unit.timed` for a bought unit, read by the upkeep fold. `Unit.freeUpkeep`'s five seams do not change (reading 27). The Dominion sheet's row becomes `implemented`.
- **Fence:** the shared six (Commerce parts), `data/decks/common.json` (Mercenary Contracts), `docs/decks/commerce.md`, the Mercenary Contracts row of `docs/decks/dominion.md`, `src/sim/purchase.ts`, `src/sim/cities.ts` (`tilePurchaseGate`), `src/sim/greatPeople.ts` (the purchase check), `src/sim/upkeep.ts`, `src/sim/statecraft/draft.ts` (`recordScalingOccasion`, `cardRouteSlots`), `src/sim/turn.ts` (where the tally is raised), `src/ui/tradeScreen.ts` (three comparisons), the schema line and its pin, `test/sim/decks.test.ts` (74 → 77, and Mercenary Contracts in the shared file), `src/ai/value.ts` (stand-ins), a new `test/sim/decks/commercePurse.test.ts`.
- **Depends on:** T5.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/commercePurse.test.ts test/sim/purchase.test.ts test/sim/upkeep.test.ts test/sim/uniqueUpkeep.test.ts test/sim/tilePurchaseGate.test.ts test/sim/greatPeople.test.ts test/sim/guilds.test.ts test/sim/decks/shared.test.ts test/sim/decks/dominion.test.ts test/ui/tradeScreen.test.ts test/sim/decks/commerce.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.
- **After T6 every card of the plan plays as written:** 77 of 77.

### T7: the pair cards (questions 3 and 4, answered yes)

- **Builds:**
  - The Art Dealers: a `WindfallOccasion` paid when a card enters your collection (a pick or a charter), fired where the pick is settled, and the row in `common.json`, `decks: ['commerce', 'magisterial']`, Economic. Magisterial's The Court Painter and The Accessions Register can read the same moment later.
  - The Standing Army: its row moves from `dominion.json` to `common.json`, `decks: ['dominion', 'commerce']`, id and text unchanged, and both sheets list it in their shared tables.
- **Fence:** the shared six (Commerce parts), `data/decks/dominion.json` (one row leaves), `docs/decks/dominion.md`, `docs/decks/commerce.md`, `src/sim/statecraft/draft.ts` (where a pick is settled), the schema line and its pin, `src/ai/value.ts` (a stand-in), `test/sim/decks/dominion.test.ts` and the Dominion tests that count its file, a new `test/sim/decks/commercePairs.test.ts`.
- **Depends on:** T1. It may run any time after T1.
- **Schema:** one bump.
- **Done-gate:** `npx vitest run test/sim/decks/commercePairs.test.ts test/sim/decks/dominion.test.ts test/sim/decks/common.test.ts test/sim/decks/shared.test.ts test/sim/decks/commerce.test.ts test/sim/offers.test.ts test/sim/decks.test.ts test/sim/statecraftDocSync.test.ts test/sim/cardTextSnapshot.test.ts test/sim/state.test.ts`.

### T8: bots renew their routes

- **Builds:** a step in `src/ai/bot.ts` that turns `autoResend` on for the bot's own caravans (`setAutoResend`, `on: true`), one step after the hire, because a hired caravan has its id only after the reducer runs. A knob in `data/ai.json` beside the bot's route knobs says when a bot lets a route lapse instead (for example when a new partner pays more). The arena panel shows it with no page edit. This is section 10's item 8, answered yes.
- **Fence:** `src/ai/bot.ts`, `data/ai.json`, `test/sim/aiBot.test.ts`, a new `test/sim/aiRouteRenewal.test.ts`.
- **Depends on:** T1 (Established Routes at twenty turns). It touches no sim file and may run beside T2 to T7.
- **Schema:** none.
- **Done-gate:** `npx vitest run test/sim/aiRouteRenewal.test.ts test/sim/aiBot.test.ts test/sim/aiDecision.test.ts`. The digests move; T9 re-pins them.

### T9: bot pricing

- **Builds:**
  - A `score.commerce` group in `data/ai.json`, and prices in `src/ai/value.ts` for every new kind of T3 to T7:
    - the Return Leg rule (the home routes' pay a second time);
    - `postEstablished` (a forecast from the routes the seat runs, as `tallyForecast` forecasts a moment);
    - the Admiralty's widened rule;
    - the World's Fair's posts reward, in `rewardTerms`;
    - The Commenda, The Capitulations and the narrowed amplifier, through the luxury fold where the bot can see it;
    - the `tilePurchase` rider, in the hex planner;
    - the treasury tally (`occasionRecord`, and a `tallyForecast` entry);
    - the timed upkeep waiver, as a cheaper bought unit;
    - the card-drafted moment, if T7 ran.
  - `routeRider`'s `count`, `per` and `max`, which `value.ts` ignores today (The Merchant Guilds).
  - The bot's purse reads T6's helper, so a bot holding Letters of Credit sees its credit (`bot.ts`, `wants.ts`). It keeps its own reserve.
  - The deal appraisal (`explainSide`, `src/ai/diplomacy.ts`) prices a lent copy at what it pays a seat holding Export Guilds or The Commenda, and a new partner for The Treaty Ports.
  - The five commissions are priced by D16's commission price. Check that Corner the Market's and The Great Fair's institutions price as their effects.
  - Re-pin the explore digest and the bot digests with the control-run method of the D batches.
- **Fence:** `src/ai/value.ts`, `data/ai.json`, `src/ai/diplomacy.ts`, `src/ai/bot.ts` (the purse), `src/ai/wants.ts` (the purse), `test/sim/aiAppraisal.test.ts`, `test/sim/aiDiplomacy.test.ts`, `test/sim/aiCommissions.test.ts`, `test/sim/explore.test.ts`, and the digests.
- **Depends on:** T6, T8, and T7 if it ran. It touches no sim file.
- **Schema:** none.
- **Done-gate:** `npx vitest run test/sim/aiAppraisal.test.ts test/sim/aiDiplomacy.test.ts test/sim/aiCommissions.test.ts test/sim/explore.test.ts`. The digest re-pin is the orchestrator's push-gate work (`npm run test:all`). **The Commerce build plan is then complete.**

### Order and overlaps

- The track: T1 → T2 → T3 → T4 → T5 → T6 → T9, one at a time. T7 runs after T1 once questions 3 and 4 are answered. T8 runs after T1 and before T9.
- Cards and charters that play as written, after each batch: 52 of 77 after T1, 60 after T2, 66 after T3, 68 after T4, 74 after T5 and 77 after T6.
- The files the batches share:

| File | Batches |
|---|---|
| `src/sim/statecraftData.ts`, `src/sim/statecraft/evaluator.ts`, `src/sim/statecraft/describers.ts` | T3 to T7 (T1, T2 only if a sentence reads badly) |
| `data/decks/commerce.json`, `docs/decks/commerce.md`, the Commerce shelf, the fixture, the schema line | T1 to T7 |
| `data/decks/common.json` | T1, T2, T6, T7 |
| `docs/decks/dominion.md` | T1, T6, T7 |
| `docs/decks/scientific.md` | T1, T2 |
| `docs/yields.md` | T2, T3 |
| `src/sim/trade.ts` | T3, T4 |
| `src/sim/cities.ts` | T5, T6 |
| `src/sim/commissions.ts` | T4, T5 |
| `src/sim/turn.ts` | T3 (if a phase), T6 |
| `src/sim/statecraft/draft.ts` | T6, T7 |
| `src/ai/value.ts` | T3 to T7 (stand-in arms), T9 |
| `src/ai/bot.ts`, `data/ai.json` | T8, T9 |

## Counts

**By group** (the 77 rows of the tier tables, charters included):

| | Built | Group 1 | Group 2 | Group 3 | All |
|---|---|---|---|---|---|
| Tier 0 | 7 | 2 | 1 | 0 | 10 |
| Tier I | 5 | 4 | 3 | 0 | 12 |
| Tier II | 9 | 10 | 5 | 0 | 24 |
| Tier III | 9 | 4 | 6 | 0 | 19 |
| Tier IV | 7 | 3 | 2 | 0 | 12 |
| **All** | **37** | **23** | **17** | **0** | **77** |
| Shared | 10 | 10 | 2 | 1 | 23 |

"Built" counts the five rows that play as built. The shared row in group 3 is question 3's card. Beside these, T1 retires 11 rows.

**The deck after section 13** (seatable cards; the two charters apart):

| Tier | Seatable | Military | Economic | Civic | Wildcard | Common / uncommon / rare | Charters |
|---|---|---|---|---|---|---|---|
| 0 | 10 | 1 | 5 | 4 | 0 | 7 / 3 / 0 | 0 |
| I | 11 | 0 | 6 | 5 | 0 | 3 / 5 / 3 | 1 (Economic) |
| II | 23 | 1 | 9 | 11 | 2 | 7 / 14 / 2 | 1 (Military) |
| III | 19 | 0 | 11 | 6 | 2 | 0 / 10 / 9 | 0 |
| IV | 12 | 1 | 6 | 3 | 2 | 0 / 3 / 9 | 0 |
| **All** | **75** | **3** | **37** | **29** | **6** | **17 / 35 / 23** | **2** |

- Section 13 counts 76 seatable cards. The sheet holds 75, because The Merchant Shrines moves to the shared table (section 12, item 5, answered yes after the pass counted).
- **By theme:** the home market 17, the far trade 14, the goods 16 and the two charters, the bankers 15, engine glue 13 (17%).

| Tier | Home market | Far trade | Goods | Bankers | Glue |
|---|---|---|---|---|---|
| 0 | 2 | 3 | 4 | 1 | 0 |
| I | 2 | 0 | 2 | 3 | 4 |
| II | 7 | 4 | 6 | 4 | 2 |
| III | 4 | 4 | 3 | 5 | 3 |
| IV | 2 | 3 | 1 | 2 | 4 |

- **Gold:** 18 of 75 cards pay gold (24%): the pass's 17, and The Grain Banks.
- **The shared table:** 22 cards (21 rows and The Art Dealers): 4 Military, 7 Economic, 10 Civic and 1 Wildcard. 23 with question 3's card.
- **New shapes:** 18 for Commerce's own cards (section 7's 21, less Safe Conduct, Bought Swords, The Hanse and The Grain Barges, and The Champagne Fairs' two fields added), and Mercenary Contracts' timed waiver, and The Art Dealers' moment if T7 runs.
- **Doctrines:** none.

## Follow-ups

**The UI track** (`src/ui/`):
- Commerce's two institutions join the read-only list of institutions under the council (Dominion's question 4, answered).
- No notice reports a post established or The Fondaci's pay, or the posts The World's Fair writes.
- The Trade screen's import list shows route loans only; The Capitulations' post loans need a line.
- The Brokers' Redraw still has no button for a gold redraw, and after T1 a Magisterial seat is dealt it too.
- The happiness Corner the Market's institution pays should be named on the happiness ledger as an institution.

**The bot track:**
- After T9 the bots lend for Export Guilds and The Commenda only as far as the appraisal prices it; they still propose only swaps.
- Feature D's counts open cards for Dominion, Magisterial, Scientific and Devotion (section 6 of the pass). No deck uses them yet.

**The sheet:**
- Seven rows play as built (The Exchange, The Monopoly, The Great Loan, The Planters' Charter, Numidian Cavalry, The Silk Road Monks, The Brokers' Redraw). A later pass either rewrites their sheet text to what the game does or builds the text.
- The Merchant Works touches the wonder split (section 9 of the pass). It stays as written; say if you want "a world wonder" dropped.
- Commerce's Doctrines: the deck pass's stage 6.

## Questions for the user

**Answered 2026-10-23**, verbatim: *"approved, lets begin implementation. for 1-7, go with the recommendations."* So:
1. The Great Fair and Corner the Market become institutions; The Strongroom, A Guild Commission and The World's Fair keep one-time rewards.
2. The Granary card is The Grain Banks.
3. Dominion's The Standing Army is shared with Commerce (T7).
4. The Art Dealers and its draft moment are built now (T7).
5. The Casa da Índia pays each copy's flat yields only, a small new shape (T5).
6. The Commenda's half copy is reading 2 as written.
7. Readings 1 to 42 stand.

The track: T1, T2, T7, T3, T4, T5, T6, then T8 and T9 after the bot levy batch lands.


1. **The commissions mix.** The Great Fair and Corner the Market become institutions; The Strongroom, A Guild Commission and The World's Fair keep one-time rewards. Corner the Market's institution: "for the rest of the game, gain +2 happiness for each luxury you hold two or more copies of." *Recommended: yes.* The alternative is a third institution for The Strongroom, which repeats the hoard cards.
2. **The Granary card's name: The Grain Banks.** In Ptolemaic Egypt the royal granaries kept accounts of grain for farmers and merchants, and paid by moving grain from one account to another on a written order: a bank that held wheat. No card in any deck uses the name. *Recommended: The Grain Banks.* The alternative is The Harvest Loans (the grain lent at interest from Mesopotamian temple stores), which shares a word with several Expansionist cards.
3. **The Dominion pair's early shared card, and Tier I's Military chair.** Moving The Escorted Roads to Tier II and removing Bought Swords leave the Dominion · Commerce pair with no shared card at Tier I or earlier (ruling (qqqqqq) 14), and Tier I with no Commerce Military card. *Recommended: share Dominion's The Standing Army (Tier 0, Military) with Commerce in T7.* The alternatives are a new Tier I card for the pair, designed with you, or leaving both gaps.
4. **The Art Dealers.** It is the Magisterial pair's early shared card, and after T1 that pair has none with a row. *Recommended: build its draft moment in T7 now,* so Magisterial's own draft cards can read it later. The alternative is to wait for the Magisterial pass.
5. **The Casa da Índia:** every copy pays the luxury's flat yields only, a small new shape (*recommended*), or every line of the luxury, through the existing amplifier, data only?
6. **The Commenda's half copy** (reading 2): counts add half the lent copies, rounded down, and a kind held only through lent copies pays at half value, like a Silk Road loan. *Recommended: yes,* as section 13 asked the triage to confirm.
7. **The readings.** A reading is how the build interprets a text that could mean two things. May the build use readings 1 to 42 until you mark one?
