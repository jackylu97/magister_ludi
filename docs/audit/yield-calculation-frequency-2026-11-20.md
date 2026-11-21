# Yield calculation frequency

## Original Dawnreach trace

The turn 120 swordsman crossed six hexes. He entered Dawnreach on the first step and left on the second. Regimental Schools paid for the additional garrison unit. The Arthashastra copied that effect. Together they added 12 base production and 12 base science to Dawnreach while the swordsman stood there. After the city's percentage bonuses, the empire's production rate rose by 12.48. It reverted on exit. The other 73 cities, all 4,160 tile breakdowns and all six players' happiness and authority contributions stayed the same at each step. Every city and empire result matched the starting result at the destination. [Step-by-step fresh comparisons](../plans/benchmarks/dawnreach-yield-comparison-2026-11-20.json)

The simulation advanced a shared economy counter on entry and on exit. Advancing the counter makes cached results expire. The next reader pays the cost. After the move, the top bar asked for the player's totals. It had to calculate all 17 of that player's city lists and the empire list. That calculation took 6.3 ms with bot planning off and 8.5 ms with it on, between walking frames. The move command itself took 2.5 ms each time. On the two other routes, 32 matched selections and moves made 600 economy or meter reads and zero fresh city or empire breakdowns. [Hardware timings and method](../plans/benchmarks/midturn-latency-2026-11-20.md)

## Calculation sites reviewed

| Where | What the code does | Which work to count |
|---|---|---|
| [Tile yields](../../src/sim/yields/hex.ts) and [city yields](../../src/sim/yields/town.ts) | A city reads its centre, worked tiles, buildings and bonuses. A fold can use an existing list. If the caller omits that list, the default builds a new one. | Count fresh tile and city lists separately from summing an existing list. Retain the tile owner's context, resource visibility and any what-if inputs. |
| [Economy readings](../../src/sim/readings.ts) and [cache](../../src/sim/slate.ts) | The first request for a city, empire, meter or base rate computes it once per key and economy counter. A fresh empire reading visits its cities. The headline and the base rate used to price bonuses have different definitions. | Count misses by seat, city and reading type. One cache expiration can affect other seats even though they do no work until asked. |
| [Top bar](../../src/ui/topBar.ts), [city banners](../../src/ui/cityBanners.ts) and [city panel](../../src/ui/cityPanel.ts) | The top bar checks the general state revision and then asks for the empire. The banners and city panel use the cached city list. The [leader sheet](../../src/ui/leaderSheet.ts) reads the same meter breakdowns as the HUD. | A repeated draw with the same economic inputs should build zero fresh lists after the initial read. Count direct meter calculations too. Keep hypothetical comparisons apart. |
| [Yield overlay](../../src/render3d/lens3d.ts), [rich tiles](../../src/render3d/paintedRichness.ts) and [yield lights](../../src/render3d/paintedYieldLight.ts) | These layers read tile yields for the tiles they display. The renderer checks for changes before rebuilding layers. The [tile inspector](../../src/ui/tileReadout.ts) asks for a labelled breakdown for the inspected tile. | Count tile evaluations and number of tiles per actual rebuild. Two layers can ask for overlapping tile sets. The interaction timings did not establish a cost for that overlap. |
| [Bot comparisons](../../src/ai/townFolds.ts), [diplomacy](../../src/ai/diplomacy.ts), [deal memory](../../src/ai/dealMemory.ts) and [wagers](../../src/ai/wager.ts) | Building comparisons reuse standing city lists and evaluate hypothetical buildings separately. Diplomacy, deal memory and wagers share the settled base rates. | Measure repeated reads in one unchanged decision state. Keep different candidates, seats, and any mid-command reads distinct. |
| [Spectator](../../src/spectate/main.ts) and [arena](../../src/arenaPage/run.ts) | The spectator shares the base rates with the bot. The arena uses the food and production already in those rates. | The arena previously folded each city twice. Its food and production still equal the sums of the city totals. |
| [Turn collection](../../src/sim/yields/empire.ts), [citizen assignment](../../src/sim/cities.ts) and [census](../../src/sim/census.ts) | Collection assigns citizens and prices every city before any city banks. Food routing reuses those prices. Citizen assignment can compare real alternative allocations. A due census selects one statistic and asks each eligible seat. | Count final collection once per city per collection. Count distinct assignment candidates separately. During a mutation, a fresh read may be necessary for a payout, a changed assignment or the next phase. |
| [Orders](../../src/sim/statecraft/evaluator.ts), [card comparisons](../../src/sim/cardImpact.ts) and [research previews](../../src/sim/tech.ts) | Some amounts depend on current income. Card comparisons can remove or add effects. The evaluator also computes base rates with selected effects excluded to avoid recursion. | A real state, a candidate effect and an evaluation with effects excluded can legitimately give three answers. Share only reads with the same inputs and rules. |

## Frequency targets and fixes

Reuse city and empire yield components whenever their inputs still match. Verify each ordered contribution against a fresh calculation, including effects shared with other cities or players.

1. **Known ground, ordinary selection or movement.** The [offline count check](../../scripts/input-latency/check-yields.mjs) enforces zero fresh city lists and zero empire lists for each of the 32 verified ordinary interactions. It checks the snapshot, the input sequence and the measurement hooks. The same zero budget now covers each of the 16 clicks in the paired Dawnreach capture. Both checks end at the first visible response.
2. **Passing through a city.** When one unit enters and leaves the same city during a march, both steps advance the economy counter. The march restores the previous city, empire and meter readings if those steps were the only economic changes. A discovery, a capture, new sight or a different position-sensitive effect cancels reuse.
3. **Stopping in a city.** A change in a garrison can affect a foreign route, post, meter or empire-wide modifier. City and empire breakdowns expire. Ground indexes and other cities' garrison rosters survive a change confined to one city gate. Unit movement tests cover entry, exit, swaps, rank, foreign income, blockade, fortification, new sight and discoveries.
4. **Receipts and interface actions.** Closing a census is an immediate candidate for narrower invalidation. Its only specific write is the player's census-read turn. The command currently advances the economy counter. Test that the blocker clears and that warmed yields survive. Audit other commands individually before changing their classification. [Census dismissal](../../src/sim/census.ts) · [Command classifications](../../src/sim/commands.ts)
5. **Repeated reads outside player interaction.** The headline and the base rates share each city's total for its current production item. A 12-city test counts 12 folds when both readings run in either order. Building previews reuse existing building lines and price the additions. Payouts and turn resolution keep their fresh calculations.

The existing [movement correctness tests](../../test/sim/stepSeen.test.ts) compare cached and fresh answers. The [cache dependency tests](../../test/sim/slateRegister.test.ts) guard which position changes can affect yields. Use those correctness checks alongside call counts. The [input diagnostic](../../scripts/input-latency/README.md) measures from a trusted pointer event to a submitted selection ring or a one-pixel walking step. The timings apply to the recorded late-game save. The other candidates above come from inspecting the code.

## Building yields across economic changes

A city's effective list includes its own buildings and any buildings an Order grants. A settled reading still checks the list in order. It reuses each building's printed yield across cities and turns. For a building that pays science per citizen, population is an additional input. The cache holds one result per building type and expires that result when its input or the game data changes. Card bonuses on buildings use their own calculation.

A focus change keeps ground and garrison indexes. Income still expires because another city's Order or a foreign route can depend on the tiles this city works. Money at Work gives every town one science per 20 gold of empire income. Reassigning one citizen can cross that threshold. A regression test also changes a farm worker to a miner and checks both the capital's science and a foreign trade partner's gold. [Focus regression](../../test/sim/cities.test.ts) · [Commerce Orders](../../data/decks/commerce.json)

In the turn 120 save, changing Dawnreach from food to production focus raised empire production from 1130.70 to 1143.18 and reduced food from 740.5 to 732.5. The player kept all 173 printed building contributions across 17 cities. Dawnreach was the only city whose complete yield list changed after the focus edit. The player also kept all 173 contributions when a swordsman stopped in Dawnreach after legionary 26 vacated it. For the through-move, stop and focus change, all 74 city breakdowns and each seat's base rates matched an independent fresh calculation. The saved state for each command matched the previous build. All six seats produced identical bot plans on the starting board.

## Command and income calculation on the Mac

The timings below are medians from 21 pairs in Node. Each sample restored the same turn 120 state, warmed the player's empire breakdown, applied one command and read that breakdown again. The two builds alternated which went first. Four warm-up pairs preceded the samples. The times exclude browser rendering. The counts come from a separate run that recorded cache misses.

| Action | Previous → updated CPU time | Fresh city / empire lists | Ground index rebuilds | Garrison roster rebuilds |
|---|---:|---:|---:|---:|
| Pass through Dawnreach | 10.61 → 2.28 ms | 17 / 1 → 0 / 0 | 11 → 0 | 17 → 0 |
| Stop in Dawnreach | 8.96 → 8.06 ms | 17 / 1 → 17 / 1 | 11 → 0 | 17 → 1 |
| Change Dawnreach from food to production focus | 8.26 → 7.25 ms | 17 / 1 → 17 / 1 | 11 → 0 | 17 → 0 |

For the through-move, move pikeman 1293 to (53,26), warm seat 0's income and move swordsman 818 to (51,24). For the stop, start from the original fixture, move legionary 26 to (53,29), warm the same income and move swordsman 818 to (53,28). The focus test starts from the original fixture and changes city 16. In all three, measure the command plus the next call to `readEmpire(state, 0)`.

## Browser check on the Mac

These are the final swordsman moves from two paired comparisons on the turn 120 fixture. Each run used a fresh Chrome profile, the same fixed actions and the default 1.5× resolution. The first pair ran the previous build first. The second pair ran the updated build first and reversed the order of the bot modes. All times are in milliseconds.

| Pair | Bot preparation | Previous yield work | Updated yield work | Previous release to visible step | Updated release to visible step |
|---|---|---:|---:|---:|---:|
| First | On | 6.3 | 0 | 47.7 | 58.0 |
| First | Off | 5.9 | 0 | 39.1 | 47.5 |
| Second | On | 24.1 | 0 | 154.8 | 108.7 |
| Second | Off | 30.5 | 0 | 162.1 | 102.6 |

Every previous through-move rebuilt 17 city breakdowns and one empire breakdown. Every updated through-move rebuilt zero. Frame timing varied substantially between the two pairs. Board draws, board updates and the rest of the HUD still took time before the model moved one CSS pixel. Total input latency improved in one pair and worsened in the other. [Fixture and capture instructions](../../scripts/input-latency/README.md)
