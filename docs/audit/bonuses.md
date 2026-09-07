# The bonus audit — from a data row to a printed number (2026-09-06)

A read-only audit of the whole bonus chain: what a row declares, which fold pays
it, which bank receives it, which surface prints it, and what the bot thinks it
is worth. The question asked was the user's: *are all bonuses accurately
calculated, so that previews and bot perspectives are accurate?*

Nothing under `src/` or `data/` was changed. One narrow test file was run
(`test/ui/ledgerScreen.test.ts`, 30 passed) to check whether an existing pin
already catches finding 4; it does not, and why is said below.

The scope is the folds (`cities.ts`, `modifiers.ts`, `statecraft.ts`,
`resourceEffects.ts`, `buildingEffects.ts`, `routeYields.ts`, `empireGold.ts`,
`upkeep.ts`, `meters.ts`, `renown.ts`, `yieldFormat.ts`), the previews
(`cardImpact.ts`, `purchase.ts`, the city panel, the top bar, the Ledger, the
compendium describers) and the bot's appraisal (`src/ai/value.ts`, `wants.ts`,
`chain.ts`, `plan.ts`, `routes.ts`).

---

## 1. The chain, in words

    a data row                data/*.json — orders, buildings, resources, techs,
                              beliefs, greatPeople, beads
       │
       ▼
    the walk                  liveEffects(state, seat)  · statecraft.ts:1423
                              ten sources, memoised per (state, seat, cut)
                              liveCityEffects(city) = that ++ cityLocalEffects
                              (buildings · rites · follower beliefs ·
                              consecration)  · statecraft.ts:1884
       │
       ├─ the hex             TileLine × 7 producers → TileYieldContext.lines
       │                      → explainTileYield  · cities.ts:525
       │                      → foldTileYield (base/override replace, add sums)
       │
       ├─ the town's flats    cityQuote  · cities.ts:3158
       │                        centre → worked hexes → cardCityYields →
       │                        cityResourceYields → specialists → route lines →
       │                        palace → buildings → cardBuildingYields →
       │                        cardYieldConversions
       │
       ├─ the percentages     cityYieldPercents  · cities.ts:2940
       │                        meters (empire stage) · luxuries · cards ·
       │                        arrears (empire stage)
       │                      + productionModifiers (city stage, per build)
       │                      → cityStageSums → applyStages  · modifiers.ts:152
       │                        (base+flats) × (1+Σcity%) × (1+Σempire%), exact
       │
       ├─ the side channels   growthSurplus (own % list)  · cities.ts:3425
       │                      borderGrowth  (own % list)  · cities.ts:3559
       │                      explainRenown                · renown.ts:120
       │                      explainHappiness/Authority   · meters.ts:206/518
       │
       ▼
    the banks                 collectYields  · cities.ts:3836
                              1. price EVERY city (assignCitizens first)
                              2. bank baskets, pools, treasury
                              3. empireResourceYields   (per player)
                              4. senderRouteYields      (per player)
                              5. empireGold             (per player)
                              6. explainEmpireCardYields(per player)
                              7. collectArrears
       │
       ├─ surfaces            top bar civYields · city panel · Ledger band 1 ·
       │                      build preview explainBuildingPreview ·
       │                      card stamp explainCardImpact · compendium ·
       │                      trade panel · yieldFormat.roundYield at the eye
       │
       └─ the bot             empireRateReading → deckReading → deckMargin
                              (value.ts:1456/1716) for the four engine shapes;
                              explainEffects's per-kind walk for everything else;
                              countOf asked directly for a counted row.

Two things this diagram makes visible and the findings below turn on:

* **`empireRateReading` is not `collectYields`.** It sums steps 1, 3, 4 and 5
  and deliberately not step 6 (`cities.ts:4026`, to stop conversions feeding
  each other). Everything reading it inherits that hole.
* **Three separate reimplementations of `cityQuote`'s summands exist** — the
  fold itself, `cityFlatsByClass` (`ledgerScreen.ts:311`) and `civYields`
  (`topBar.ts:134`) — and only the second is pinned to the first.

---

## 2. Findings

Severity: **W** wrong number · **P** misleading preview · **B** bot misprice ·
**S** stale remnant. "Confirmed" says whether the reading was verified against a
data row and/or a test.

**Status** is batch H1's (2026-09-06): *fixed*, each with a test that would have
caught it, or *left* with the reason — another batch's fence, or a row that is
not in H1's queue and is still open. A finding whose fix changed shape under a
ruling says so (finding 2: The Reckless Levy became a flat coin a soldier rather
than a doubled payroll).

| # | Sev | Where | What the code does | What it should do | Fix | Confirmed | Status |
|---|---|---|---|---|---|---|---|
| 1 | **W** | `cities.ts:3239-3243` | Folds only `food`/`production`/`gold` out of `cityRouteYields`; `RouteYieldLine` also carries `science`/`culture` (`routeYields.ts:157`) and `cardLines` writes them (`routeYields.ts:375`) | Fold all five voices, or state which bank the two extra voices land in | one line + a ruling | **yes** — `orders/ledgerKeepers` (live, not retired) is `{routeYield, science:1, culture:1, origin:hasBuilding market}` | **fixed** — `cityQuote` folds all five voices; the city panel prints them; pinned in `trade.test.ts` at line, quote and bank |
| 2 | **W** | `upkeep.ts:298` | `if (percent >= 0) return out;` — a **positive** `unitUpkeep` fold is discarded, and `explainUnitUpkeepRebate` is the rule's only reader | Charge a surcharge line into `explainEmpireGold` when the fold is positive | one arm | **yes** — `orders/theRecklessLevy` (live) declares `+100%` and its printed text promises it | **fixed, re-ruled** — the Levy is a flat coin a soldier now (`upkeepSurcharge`, the rebate's twin), charged on `explainEmpireGold`'s maintenance line; the positive-*percent* arm is honoured too (no live row) |
| 3 | **W/P** | `topBar.ts:134-184`, `ledgerScreen.ts` `ledgerReading` | Neither adds `senderRouteYields`, which `collectYields` banks at `cities.ts:3931-3937` (gold + science + culture of every **outbound foreign** route) | Add the fold beside `empireResourceYields` in both | one line each | **yes** — read against `collectYields`; `test/ui/ledgerScreen.test.ts:144` pins the two surfaces to *each other*, so both drift together | **fixed** — both surfaces add `senderRouteYields`, and the new pin is against the **banked** delta rather than against each other |
| 4 | **P** | `ledgerScreen.ts:311-350` | `cityFlatsByClass` is a declared mirror of `cityQuote` and has drifted three ways: (a) it never walks `cardBuildingYields`; (b) `:316` floors `population × CITIES.sciencePerPop`; (c) `:337` floors `population × entry.sciencePerPop` | Walk the eleventh summand; drop both floors (batch X made `cityQuote:3173` and `:3266` exact) | one arm | **yes** — `sciencePerPop` is `0.5` (rules) / library `0.5` · monastery `0.25` · university `0.75`; seven live `buildingYieldPercent` Orders exist. The pin at `test/ui/ledgerScreen.test.ts:152` passes only because the bench has neither | **fixed** — the mirror walks `cardBuildingYields` and both floors are gone; the bench grew a `buildingYieldPercent` Order and an odd-population town |
| 5 | **B** | `value.ts:1456` (`deckReading`), via `cities.ts:4026` | `empireRateReading` omits `cardEmpireYields`, so the bot's margin cannot see **any** empire-scale card line | Add the empire card fold to the reading the bot takes (not to `empireRates`, which must stay conversion-safe) | one arm | **yes** — `enhancerBeliefs/apostles` is `effectAmplifier{founderTrickle}`, `foldReadsAmplifier` routes it to the margin, and `founderTrickle` pays `where:'empire'` → margin is exactly 0 | left — batch **H2**'s fence (`src/ai/`) |
| 6 | **B** | `value.ts:1892-1910`, `:2031` | `realizedCount` takes an empire-scale count once; `scorePayout` ignores `pays.where`. The sim pays a `where:'city'` line in **every** town (`statecraft.ts:3279-3296`) | Multiply a `where:'city'` payout by the towns the scope admits | one arm | **yes** — live rows: `governments/imperium`, `buildings/assemblyHall` (×2), `buildings/smithy`, `people/simaQian`. At six towns this is a 6× under-price | left — batch **H2** |
| 7 | **B** | `value.ts:1867-1875` | Divides `Σ_city count` by `per` **once**; `helpings` floors per town (`statecraft.ts:3222`) | Sum the per-town helpings | one line | **yes** — `governments/republic` (per 5), `orders/statuteLabour`, `followerBeliefs/choirs` (per 3), `titheHouses` (per 4). Over-prices by up to `cities × (per−1)/per` helpings | left — batch **H2** |
| 8 | **P** | `cities.ts:5942-5949` | `tilePurchasePrice` applies `rulePercent tilePurchase` **outside** `explainTilePurchase`; `foldTilePrice` is documented as the price | Make the card a line of the list | one line | **yes** — `orders/charteredCompanies` (−15%) and `orders/royalSurveyors` (−25%) are live; `test/sim/territory.test.ts:436` pins the equality that then breaks. Latent: no surface prints the breakdown today | **fixed** — the charter is a line of `explainTilePurchase`; the price is the fold |
| 9 | **W** | `cities.ts:600-601, 645` | `paidSoFar` memoises `foldTileYield(list)` **inside** the loop that pushes card lines, so a `TileCondition{test:'yields'}` may or may not see an earlier card's add depending on walk order | Hoist the fold before the card loop, as the docblock claims | one line | read-confirmed; deterministic, so no replay risk — but the printed rule and the code differ | left — not in H1's queue; deterministic, so nothing replays differently. The printed rule and the code still differ |
| 10 | **W** | `cities.ts:3961` | `explainEmpireCardYields` runs **after** the treasury has been credited in the same phase, so `empireRates` re-prices every town against a debt state that may have flipped mid-phase; a `rateConversion` then reads science/culture the phase did not bank | Take the rate reading before step 2 banks, or freeze `empirePercents` for the phase | one arm | read-confirmed; bites only on the turn an empire crosses zero | left — not in H1's queue; one-turn window on the turn an empire crosses zero |
| 11 | **W** | `upkeep.ts:280, 292` | `if (share <= 0) break;` in both flat-rebate loops — a zero-valued line ends the walk over the remaining sources | `continue` | one line ×2 | read-confirmed; no live row emits a zero line | left — no live row emits a zero line, so `break` and `continue` walk the same list today |
| 12 | **P** | `resourceEffects.ts:661` | `resourceUpkeepRebateLines` floors its total where the card rebate beside it in the same list is exact since batch X | Drop the floor | one line | read-confirmed | left — `resourceEffects.ts` is outside H1's fence |
| 13 | **P** | `resourceEffects.ts:396` | `cityResourceYields` filters on `foldOne(line) !== 0` — the **sum** of six voices — so a signature paying `+1🌾 −1💰` disappears whole | Filter on "any voice non-zero" | one line | read-confirmed; no live row cancels | left — `resourceEffects.ts` is outside H1's fence; no live row cancels |
| 14 | **P** | `cities.ts:3584` vs `:3593` | `borderGrowth` applies `max(0, meter + card)` but prints `borderPercent + cardPercent` unclamped | Print the applied figure | one line | read-confirmed | left — not in H1's queue |
| 15 | **W** | `statecraft.ts:4328-4335` | `cardAuthority`'s `countScaled` arm asks `countOf` with no city, where `cardHappiness` sweeps towns (`:4199` docblock) | Sweep towns for a city-scoped count | one arm | read-confirmed; no live row (all authority payouts use empire counts) | left — not in H1's queue; no live row |
| 16 | **P** | `cities.ts:3489-3491` | `borderCostFor` asks `cardRulePercent` **without** the city, while `explainGrowthPercent` (`:3387`) and `growthCarryover` (`:4175`) pass it — a scoped or rite-borne `borderCost` would be invisible | Hand the town in | one line | read-confirmed; no live row | left — not in H1's queue; no live row |
| 17 | **W** | `statecraft.ts:5378` | `runPeriodicBoons` reads `orderDef(slot.card).effects` directly, bypassing `liveEffects` — a `periodic` nested in a `conditionRule` fires ungated | Read the seat's walk, filtered to the slot's card | one arm | read-confirmed; no live row nests one | left — not in H1's queue; no live row nests one |
| 18 | **W** | `statecraft.ts:3760, 3842` + `buildingEffects.ts:316` | The seven `TileLine` producers walk `liveEffects`, `timedLive`, follower beliefs and consecrations — **never** `cityBuildingEffects`. An ordinary building's `effects` carrying a `tileYield` is read by nobody | Add the producer, or refuse the shape on an ordinary row in the register test | one arm | read-confirmed; live rows use the `tileYields` *field* instead, so nothing is broken today — it is a trap, and `data/buildings.json` already puts `productionBonus` and `percentYields` in `effects`, so the next author will reach for it | left — not in H1's queue (a trap, not a wrong number) |
| 19 | **B** | `value.ts:1294` | `scoreEffect('periodic')` divides by `periodicPeriodOf(effect, 0)` — the empire's own `periodShorten` is ignored when pricing a fresh periodic card, although `periodShorten`'s own arm reads it | Fold the held shorteners in | one line | read-confirmed | left — batch **H2** |
| 20 | **B** | `chain.ts:426` | A tech's own card effects are priced with `explainEffects`, not `explainCardEffects`, so a node carrying an engine shape falls to `score.unknownEffect` | Route through `explainCardEffects` | one line | **yes** — `techs/theImperialPost` carries an `effectAmplifier` | left — batch **H2** |
| 21 | **S** | `religion.ts:263` | `augurHasActed` is exported and called by nothing since the augur was retired | Delete, or say in the docblock that it is kept for a returning verb | one line | **yes** — grep across `src/` and `test/` | **fixed** — `augurHasActed` deleted, with a note where it stood |
| 22 | **S** | `statecraft.ts:2644`, `:3199`, `statecraftData.ts:1021` | `chargedAugurs` is a `CountKind` no data row uses; the belief that would have used it (The Vigil) is not in `data/religion.json` — its effect was deferred | Retire the count, or land The Vigil | one arm | **yes** | **fixed** — the member, the arm, the city-scoped register row and the describer words are all out; Court Augurs is re-cut as a different count when it lands |
| 23 | **S** | `CLAUDE.md` "register of mid-turn yield mutations" | Says 17 entries; `refreshCityDerived`'s own docblock (`cities.ts:2085-2140`) now lists 22 | Resync the two | one line | **yes** | **fixed** — CLAUDE.md now says the docblock is the register of record and runs to 22 |

### The five worst, ranked

1. **Finding 1** — a live Order (Ledger-Keepers) pays nothing at all on a
   domestic route: the science and culture it computes are dropped by
   `cityQuote`'s three-voice fold.
2. **Finding 2** — a live Order's stated malus (The Reckless Levy's doubled
   payroll) is never charged, because the only reader of the rule refuses a
   positive percentage.
3. **Finding 3** — the top bar and the Ledger both under-report the empire's
   per-turn gold, science and culture by the whole of its foreign trade, and the
   pinning test compares them only to each other.
4. **Finding 5** — the bot's marginal reading cannot see any empire-scale card
   line, so every engine routed through the margin that pays there (Apostles is
   the built case) appraises at exactly zero.
5. **Finding 6** — a `where:'city'` counted line is priced once instead of once
   per town, an under-price by a factor of the empire's city count on five live
   rows.

### Checks that came back clean

| Class of bug hunted | Where I looked | Result |
|---|---|---|
| a total computed beside its breakdown | `foldTileYield` `cities.ts:775` · `foldUnitCost` `:3708` · `foldBuildingPreview` `:2498` · `foldMeter` `meters.ts:120` · `empireGold` `empireGold.ts:290` · `foldRenown` `renown.ts:232` · `foldRouteYield` `routeYields.ts:562` · `foldCardYields` `statecraft.ts:3593` | every total is its list's fold; the two exceptions are findings 8 and 3 |
| a percentage applied inside a stage or twice | `applyStages` `modifiers.ts:152` is the only multiplication; `withStage` `:121` folds the build hammers into the city stage rather than beside it | clean |
| a floor surviving batch X on a yield line | `cityQuote:3173/3266`, `cardBuildingYields:2440`, `explainTileYield:743/762`, `growthSurplus:3449`, `borderGrowth:3589`, `amplify` `routeYields.ts:415`, `explainCityRenown` `renown.ts:216`, `amplifyTrickle` `statecraft.ts:1694` | all exact; the survivors are findings 4, 12 and the intentional integer prices (`explainUnitCost`, `explainPurchaseCost`, `explainTilePurchase`, road maintenance, meter luxury lines) |
| a scope ignored | `cityScopeAdmits` reached from `cardCityYields:3273`, `cardPercentYields:3977`, `cardProduction:4039`, `cardBuildingPercents:3551`, `cardYieldConversions:3498`, `cardRulePercent:4152`, `scopedCardTileLines:3847`, `cardCityRenownShares:5838`; `scopeAdmits` `resourceEffects.ts:241` for `coastal`/`owner`/`capital` | clean; findings 15/16 are the two readers that cannot ask |
| a count reading a stale register | `assignCitizens` is called first in `collectYields:3853`; `refreshCityDerived` has 72 call sites over 11 modules; `workedTiles`-reading counts (`workedHills`, `workedTilesInCity`, `workedUnimprovedTiles`) are priced after the re-seat | clean |
| a timed effect read without `liveCityEffects` | every city-scoped reader in `statecraft.ts` goes through `cityEffectsOfKind` → `liveCityEffects`; `cardRulePercent` takes the town for `growthSurplus`/`growthCarryover`/`borderCulture` | clean except finding 16 |
| `appliedLast` that isn't last | `cardBuildingPercents` returns `[...ordinary, ...last]` (`statecraft.ts:3563`); `cardBuildingYields` runs `for (const pass of [false, true])` and takes the ordinary shares off `base`, the last ones off `raised` (`cities.ts:2432-2451`) | clean |
| an amplifier reading its own card / reaching empire lines | `deckModifierLines:3373` skips `paid.card === card` and any non-Order line; `tileAmplifierLines:3807` the same; a scoped amplifier pays nothing in the empire fold (`:3367`) | clean |
| `periodic` re-stamp | `runPeriodicBoons:5388` moves an outstanding stamp by `period − firePeriod` and re-stamps on fire; nothing counts down | clean except finding 17 |
| a `retired` row still counted | 10 retired buildings, 44 retired orders, 4 retired doctrines; no live card's `building:` field names a retired row (checked all of `orders`, `buildings`, `people`) | clean — a retired row a save still holds keeps paying, which is the stated intent |
| the debt rule's stage | `empirePercents:2913` puts arrears on the **empire** stage; `collectYields` prices every city before any banks (`:3851`) | clean except finding 10 |
| the Throne's rebate line | `explainUnitUpkeepRebate:259-270` sums `Unit.upkeepRebate` clamped per piece, names the row off the table not the board | clean |
| `oncePerEmpire` uniques | `oneOfAKind` `statecraft.ts:1953` is the one predicate both walks ask; `cityBuildingEffects:1993` skips them so nothing is read twice | clean |
| Cathedral consecration vs pantheon | `consecrationEffects:1927` is city-local and reads `City.consecration`; pantheon beliefs are `liveEffects`' fourth source | clean |
| the endpoint-luxury count | `endpointLuxuryCount` `resourceEffects.ts:573` is a set **union**, returned as `.size` only | clean |
| `perEndpointLuxury` | `routeYields.ts:366-384`; hoisted once, and a road with no luxury carries the row at zero rather than dropping it | clean |
| growth carry-over | `growthCarryover:4167` reads the rule as the rate itself, town handed in | clean |
| `happinessTierBoost` above the clamp | `tierPercent` `meters.ts:805` clamps then adds the boost, positive rungs only | clean |
| `explainEmpireGold`'s lines | `empireGold.ts:181-287`; connections (+ flat/share amplifier + luxury share), roads, units, rebates, buildings, tributes — one fold, `empireGold` its only sum | clean except finding 2 |
| determinism | no `Math.random`, `Date` or clock anywhere in `src/sim/` or `src/ai/`; `Map`/`Set` appear only as indices and unions (`explainTileYield:643`, `cardBuildingYields:2418`, `endpointLuxuryCount:574`, the impact `Bucket`) with output ordered by an array | clean |
| compendium describers | all 46 `CardEffect` kinds have an arm in `describeEffect` (`statecraft.ts:6443-7136`) | clean |

---

## 3. The stand-in register (the bot)

Every place `src/ai/` prices with a nominal figure instead of asking the board,
and what a real reading would need. Knob values are `data/ai.json` → `score`.

**Status** is batch H2's (2026-09-06): **CLOSED** — a real reading now; **KEPT**
— still a stand-in, with the reason it stays; **RETIRED** — the knob is gone.

| Stand-in | Value | Where | What it stands for | The true reading it would need | Status |
|---|---|---|---|---|---|
| `score.unknownEffect` | 2 | the `default` arm | Any `CardEffect.kind` with no arm | see the table below — the kinds | **CLOSED as a default**: `scoreEffect` is exhaustive on the aliased discriminant and there is no `default` any more; the constant survives only in **nine named arms** (below) |
| `nominalRate` = `unknownEffect × nominalCount` | 6 | `nominalRate` | "the per-turn yield a percentage is a percentage of" | the seat's own `empireRateReading` per voice ÷ cities | KEPT — the percentage arms were not in H2's fence |
| `score.nominalCount` | 3 | `offerRider`, `upkeepRebate`, a tally with no holder | "how many helpings" | `offerSize`/`explainOfferSize` for the rider; nothing for a holder-less tally | KEPT — the new `upkeepSurcharge` arm beside it reads the real piece count (`unitsInField`); the rebate's is pre-existing and was not moved |
| `score.nominalTiles` | 3 | `tileYield`, `amplifiedLines` | "how many hexes this empire works that the condition admits" | a sweep of `city.workedTiles` × `tileConditionHolds` | KEPT |
| `score.caravanScale` | 3 | `routes.ts` | "what a route pays beyond its yields" (a slot, a road, a partner) | the marginal reading `explainRoutePay` already builds, plus `cardRouteSlots` | **KEPT, measured**: H1's five-voice route fold added voices the reading already claimed to carry, not the terms this stands in for (the road's march, trading-post range, the destination's growth), so its stated justification is untouched. And it decides nothing on the acceptance boards: **no seat raises a caravan at all inside t75** on any of the six, at ×3 or at ×1 (two seats hold one route slot each and neither fills it). The grid search is the instrument |
| `workers.veinValue` | sheet | `plan.ts` | An unprospected seam | nothing — the seam is unknown by construction | **RETIRED** — the want prices at 0 and prints a zero-valued label; the knob is gone from `data/ai.json` and `aiConfig.ts`, so the arena panel loses the box with no page edit. Inert on every board (`veins.share` is 0) |
| `weights.die` | 60 | read nowhere | a great-person die | — | **RETIRED** — dice are gone; it shipped as a live arena box that moved nothing |
| `score.tallyForecast.*` | 6/8/4/3/2000 | `potentialTerms` | Occasions a growing card still expects | a game-length model; honestly a forecast | KEPT — and it gained a second reader: `occasionRate`'s `kill` and `death` arms divide it by the horizon, which is what "occasions expected over the horizon" means said as a rate |
| `score.combatScale`, `weights.military` | 3 / sheet | `explainSoldier`, the combat arms | A strength point | `planCombat`'s own ledger | KEPT |

**The kinds that fall to `score.unknownEffect`** — *rewritten by batch H2,
2026-09-06.* `scoreEffect` switches on an aliased discriminant and ends in a
`never`, so **every** member of `CardEffect` has an arm and a member added to the
union stops the build. The stand-in survives in nine named arms and nowhere else.

| Kind | Live rows | The reading it takes now | Status |
|---|---|---|---|
| `windfallRider` | 43 | the occasion's own frequency on this board (`occasionRate`, off the empire's own records) × what the grant hands over (`explainLump`) × `perAge` × `perSlottedOrder` | **CLOSED** |
| `rulePercent` | 21 (7 of 9 rules) | each rule's own fold: `unitUpkeepTotal`, `happinessDemand` per town, the food rate, the growth threshold × the growth rate, the expansion chain's settler hammers, the ring price × the seat's own purchase record, the pieces in the field | **CLOSED** but for `borderCulture`/`borderCost` — both buy *ground*, which is the settle table's currency (batch 4's two-weight-tables gap) |
| `unlocksBuilding` | 12 | the shelf it opens (`explainBuildingRow` + the row's flats) × the towns × the raising discount | **CLOSED** |
| `effectAmplifier` | 11 | the table it points at: the routes running, the roads' own coin (`explainEmpireGold`'s positive lines), the shelf's `perUniqueLuxury`, the faith rate, the renown rate. `connectionYields` also joined `foldReadsAmplifier` (it lives inside `goldPerTurn`) | **CLOSED** but for `riteDuration` and `greatPersonAct` — neither is a rate |
| `meterRule` | 9 | the constant each rewrites, × the towns, at the meter's live price | **CLOSED** but for `borderFreezeExempt` (ground again) and the row nothing names |
| `yieldConversion` | 8 | the share of the `from` books, at the `to` price | **CLOSED** |
| `rateConversion` | 8 | `floor(the rate ÷ per) × the payout` — the books are literally its input | **CLOSED** |
| `pressureRule` · `pressure` | 8 · 2 | — | **KEPT**: the tide has no reading in this currency. The bot prices the *first* religion (`religion.prophetTechValue`) and nothing prices the hundredth follower |
| `routeRider` | 6 | `routeSlotTerm` — the very door a market's `routeSlots` walks through | **CLOSED** |
| `cityStat` | 6 | `explainBuildingRow`'s own wall reading, exactly (not × towns, so the two agree) | **CLOSED** |
| `conditionRule` | 6 | its clauses at full price while the gate is open on this board, nothing when shut | **CLOSED** |
| `purchaseRider` | 5 | the share it takes off, over what the purse turns over in a turn | **CLOSED** |
| `foundingRider` | 5 | what the town is founded with (a citizen at the growth threshold, a shelf, a road home) × the founding rate | **CLOSED** |
| `actionRule` | 4 | — | **KEPT**: three of four open the great-person draft **no surface constructs** (H3's row); the fourth is a worker's saving |
| `pantheonSlots` | 2 | — | **KEPT** (× the slots): a belief's worth is the faith book's, and the faith book (`wants.ts`) reads this file |
| `behaviorRule` | 2 | — | **KEPT**: a rule of the wild's turn, and roads that are already free |
| `zocRule` · `unitStamp` | 1 · 1 | the wall reading and the `unitStat` reading, one grade out | **CLOSED** (a stamp's `hp` half is named — a hit point is a fraction of a piece and a stamp names no piece) |
| `projectRider` | 1 | the payout it adds × the towns actually running that project | **CLOSED** |
| `periodicOffer` · `periodicMuster` | 1 · 1 | one firing's worth over the cadence — `periodic`'s own arithmetic. The muster's piece is `explainBuildingRow`'s gifted-piece reading | **CLOSED** (the offer's *hand* is the draft plan's, so that half is the stand-in over an exact cadence) |
| `mirrorYield` | 1 | the category's shelves' own `from` figure, paid at the `to` price | **CLOSED** |
| `cityRule` · `metaRule` | 1 · 1 | — | **KEPT**: what fresh water un-gates is `buildError` asked hypothetically, and a seal is the difference between two draft plans |
| `upkeepSurcharge` | 1 (H1's new shape) | −amount × the pieces in the field, at gold's live price | **CLOSED** — and it is the first shape the new `never` caught |

Two further blind spots that are not stand-ins but omissions:

* **the margin's hole** (finding 5) — **CLOSED by batch H2**. `deckReading` now
  reads `marginRates`, which is `empireRateReading` **plus**
  `explainEmpireCardYields`. The sender's foreign routes and the treasury's four
  lines were already inside the base reading (`empireRates`, `cities.ts:4111-4118`),
  so the card empire lines were the whole of the hole. It is built in `value.ts`
  rather than added to `empireRateReading`, deliberately: that function's meaning
  in the simulation is *the base rate a conversion reads*, and folding the card
  lines back into it would be a card feeding itself;
* **the fallback cut** (`value.ts:1752` docblock, stated) — a row mixing an
  engine with a non-yield clause loses the non-yield half. No live Order mixes.

---

## 4. Provenance of every preview

"Same fold" = the surface calls the evaluator the resolution banks from.
"Beside it" = the surface re-implements or re-sums the summands.

| Surface | Where | Provenance | Note |
|---|---|---|---|
| tile hover readout | `tileReadout.ts` → `tileContextAt` → `explainTileYield` | **same fold** | context register at `cities.ts:448` |
| yields lens | `lens3d.ts` → `LensView.playerId` → `explainTileYield` | **same fold** | |
| city panel · flats | `cityPanel.ts:1560-1621` | **same fold** — prints the very lists `cityQuote` folds | drops the route line's science/culture (`:1467`) — cosmetic half of finding 1 |
| city panel · stages | `cityPanel.ts:1629` → `cityStageSums` | **same fold** | |
| city panel · growth | `explainGrowthPercent` / `growthSurplus` | **same fold** | |
| city panel · borders | `borderGrowth` | **same fold** | printed percent ≠ applied factor when clamped (finding 14) |
| build list preview | `explainBuildingPreview` `cities.ts:2566` | **same fold** — a ghost diff of `cityYields` with a named reconciliation line | model preview; nothing reimplemented |
| card stamp | `explainCardImpact` `cardImpact.ts:649` | **same fold** — two ghosts of `cityYields`, `explainEmpireCardYields`, `empireResourceYields`, `explainEmpireGold`, `happinessOf`, `authorityOf` | best-built preview in the tree; misses `senderRouteYields` for the same reason finding 3 does |
| top bar headline | `civYields` `topBar.ts:134` | **beside it** | re-sums `collectYields`' six steps and omits step 4 — finding 3 |
| Ledger band 1 · totals | `ledgerReading` `ledgerScreen.ts` | **beside it** | same omission; pinned only against `civYields` |
| Ledger band 1 · classes | `cityFlatsByClass` `ledgerScreen.ts:311` | **beside it, declared** | drifted three ways — finding 4 |
| purchase price | `explainPurchaseCost` `purchase.ts:266` | **same fold** — `foldUnitCost` of its own lines | riders carry the *difference*, so the list sums exactly |
| unit cost | `explainUnitCost` `cities.ts:3659` | **same fold** | every step carries its difference |
| tile purchase | `explainTilePurchase` `cities.ts:5881` | **beside it** for the card half | finding 8 |
| offer size | `explainOfferSize` `statecraft.ts:841` | **same fold** | asked once when the offer opens |
| trade panel | `explainRouteYieldBetween` / `explainRouteSenderYieldBetween` | **same fold** | the send preview and the paying caravan are one function |
| empire gold hover | `explainEmpireGold` `empireGold.ts:181` | **same fold** | four lines + rebates + tributes |
| meters hover | `explainHappiness` / `explainAuthority` / `explainFoundingCost` | **same fold** | the settler's projection is literally the line the meter would append |
| renown hover | `explainRenown` `renown.ts:120` | **same fold** | guild bar deliberately reads `explainCityRenown` *without* shares |
| tech card gifts | `chain.ts` → `explainTechGifts`, `buildingYieldDelta` | **same fold** (sim side) | the bot's own weighting is separate |
| great-person face | `actGainOf` `greatPeople.ts:815` → `empireRateReading` | **same fold** | inherits finding 5's hole |
| compendium | `describeCard` / `describeBuildingRow` / `describeEffect` | **same rows** | all 46 kinds covered; prose is generated from the row, never hand-written |
| spectate feed | `Appraisal.terms` — every bot total is its printed terms' fold | **same fold** (of the bot's arithmetic) | the arithmetic itself is the stand-in register above |

---

## 5. What could not be verified without running a game

* **Magnitudes.** Every finding above is a reading of the code and the data
  rows. How much finding 3 costs a real empire depends on how many foreign
  routes it runs; how much finding 6 costs the bot depends on whether Imperium
  or the Assembly Hall is ever in its deck.
* **Whether the ledger pin fails today.** `test/ui/ledgerScreen.test.ts` passed
  (30/30) on the current tree. It will fail the moment its bench slots one of
  the seven `buildingYieldPercent` Orders or grows a town to an odd population —
  which is the honest way to confirm finding 4, and is a one-line change to the
  bench rather than an audit's business.
* **Whether Ledger-Keepers ever visibly pays.** Finding 1 says it does not bank;
  whether a player would notice depends on whether the Ledger's band-1 "trade"
  class (which *does* add the two voices, `ledgerScreen.ts:331`) is read.
* **The bot's actual ranking shifts.** Findings 5, 6, 7, 19 and 20 all move
  appraisals; whether any of them changes a *decision* needs the arena
  (`arena.html`, five headless games a worker) rather than a reading.
* **Finding 10's live window.** The debt-state flip inside `collectYields` is a
  one-turn effect on the turn an empire crosses zero, and it would take a scripted
  game to see it land.
