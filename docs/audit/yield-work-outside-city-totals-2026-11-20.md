# Yield calculations outside the top bar

This audit measures the game at `bae0f882` on the turn 120 save. It follows the audit of city and empire totals. The save has 74 cities and 4,160 tiles. Seat 0 owns 17 cities. Measurements use local Node 26.7 on the Mac. They cover CPU work and exclude the browser, GPU and drawing the UI. [Fixture](../../scripts/input-latency/fixtures/turn120.json.gz) · [Earlier audit and browser measurements](yield-calculation-frequency-2026-11-20.md)

## Movement and selection

**The yield motes refresh too much on some moves and too little on some Orders.** The renderer checks the visible cells, the displayed works, the viewer and the viewer's number of technologies. When any of those change, it prices every visible land tile except mountains and city centres. It shares the yield context within each owning city. It keeps the result across animation frames. The optional yield symbols use the same calculation in a separate call when that overlay is active. [Renderer change check](../../src/render3d/renderer3d.ts) · [Mote inputs](../../src/render3d/paintedYieldLight.ts) · [Tile readings for both layers](../../src/render3d/lens3d.ts)

| Action from the fixture | What happened |
|---|---|
| Move seat 0's legionary 256 from (54,18) to (54,19) | One tile left sight. All 253 remaining eligible tiles kept exactly the same six yields. The change check requested a rebuild, which prices those 253 tiles. For scale, pricing the 254 starting tiles alone took 1.93 ms. |
| Move pikeman 1293 to (53,26), then swordsman 818 through Dawnreach to (51,24) | Both moves succeeded. All 254 tiles stayed visible and the mote change check stayed the same through both commands. The motes do not explain this swordsman's delay. |
| Remove The Highlands from slot 5 for seat 1 | Of 97 eligible tiles, 14 dropped a mote level. The renderer skipped the rebuild. At (7,40), production fell from 4 to 3 and science fell from 3 to 1. The mote score fell from 8.5 to 4.5, enough to change both the light level and its leading colour. |

For the Order check, I called the renderer's own `rebuildYieldLight` method before and after the accepted command. A counter stood in for the draw. It recorded just the initial build. I compared each tile's expected output through the production `seenTileYields` and `yieldLightHex` functions.

**First change for movement.** Keep a visible tile's last yield separately from whether the tile is currently in sight. A visibility-only change can remove a hidden tile's motes or price a newly visible tile. If a command changes the economy, refresh the affected owner or area even when sight stays fixed. Start with a broader refresh when the affected owners are uncertain. Include city-scoped Orders, changes to an owner's technologies, adjacency, and wild land priced for the viewer. Use both movement cases and The Highlands as regression cases. Measure the full draw separately from the cost of pricing tiles.

**Selection and hover.** Selection refreshes city banners. On a repeat refresh, the banner calculation made 29 sums from existing lists for 17 cities, with zero new city or tile breakdowns. It took 0.76 ms for 35 banners in the standalone calculation, including the default garrison lookup. The live UI can pass its existing garrison lookup. An ordinary tile hover already shares one list between its headline and its breakdown. The settler ranking runs only for the settler lens and its hover text. [Banner fact calculation](../../src/ui/cityBanners.ts) · [Selection and hover dispatch](../../src/main.ts) · [Tile inspector](../../src/ui/tileReadout.ts)

## Orders and research

**A technology charter calculates an income preview the player never sees.** When a draft opens, each option calculates its normal Order stamp. A charter then replaces that stamp with “Opened.” I exercised that branch with The Glassmakers' Charter on seat 0. The discarded stamp alone took 43.53 ms and called the city breakdown 119 times. The charter slip took another 4.20 ms and rebuilt 17 city lists and 142 tile lists to estimate research time. The charter was a controlled preview, separate from the actual pending draft below. [Offer construction](../../src/main.ts) · [Charter slip](../../src/ui/charterTech.ts)

Calculate the charter slip first and skip the ordinary stamp when the slip supplies its own. Use the city's share of empire science already read by the research tree. The ETA took 0.01 ms with the shared rate and still returned one turn. The raw and shared science rates agreed for all six playable seats. [Research tree](../../src/ui/techTree.ts) · [Research estimate](../../src/sim/tech.ts)

**The normal draft can share work between cards.** Seat 2 had a real pending offer of The Monopoly, The Offering Chests and The Old Foundations. Its three stamps took 26.33 ms, with 126 calls to the city breakdown. Passing the existing `cardImpactSheet` to all three brought this to 22.00 ms and 96 calls. All three displayed stamps matched exactly. This comparison used the existing optional parameter. Each proposed card still had its own simulated result. [Card comparisons and shared readings](../../src/sim/cardImpact.ts)

**The Council total costs more than a frame at 60 FPS.** With seat 0's current income already available, the calculation for the Council total alone took 34.30 ms. It made 102 calls to the city breakdown and 1,102 to the tile breakdown. Opening the screen also draws individual cards. The total compares the real council with a hypothetical council, then attributes changes to happiness and authority. Different meter values can produce different payouts. Keep the shared real-board reading. The next candidate is reuse of each simulated city's ground, buildings and flat contributions across steps that change only the percentages. Verify every labelled contribution as well as the final totals. [Council draw](../../src/ui/statecraftScreen.ts) · [Meter comparisons](../../src/sim/cardImpact.ts)

## Settlement, city panels and workers

| Where | Finding | Change worth considering |
|---|---|---|
| Settlement recommendations | Seat 0 ranked 61 candidate sites. Their overlapping rings produced 1,159 tile calculations for 259 distinct hexes, in 3.07 ms. A repeat request in the same revision made zero calculations. | Remember a tile's yield for one seat during one ranking. That would remove 900 repeated calculations. Keep distance, ranking, resource visibility and each site's explanation specific to the candidate. [Site ranking](../../src/sim/sites.ts) · [Existing result cache](../../src/sim/readings.ts) |
| City yield chips | Dawnreach's six chips summed the same city list six times, once for each displayed yield. All six together took 0.27 ms. | Pass the same current-production total to the six chips. Build a detailed list when the player opens it if the panel still costs enough to warrant that change. [City panel](../../src/ui/cityPanel.ts) |
| Worker build choices | Each option calculates both the current tile and the proposed improvement. The preview copies the map's tile-reference array once per option. The two seat 0 workers had no options on their current tiles. Worker 929 had one pasture option, which took 0.52 ms. | Share the current tile when multiple options are available. Keep each preview's ownership and adjacency separate. No worker in this save had several options, so the sample gives no measured saving for this change. [Worker choices](../../src/ui/controls.ts) · [Improvement previews](../../src/sim/improvements.ts) |
| Trade and religion panels | The city summary builds detailed route payouts just to count its rows. Incoming domestic routes also calculate the same destination payout twice. The Religion & followers tab obtains the religion reading for both the title and body. For a founder, each includes the empire card yield calculation. | Count the same eligible routes without pricing them. Share the domestic route result and one religion reading per panel draw. These findings come from the call sites. [City summary](../../src/ui/cityPanel.ts) · [Route rows](../../src/ui/tradeLines.ts) · [Religion panel](../../src/ui/religionScreen.ts) · [Founder income](../../src/ui/faithReading.ts) |

## Bot planning and turn collection

**Bot planning is the largest background consumer sampled.** Seat 0's 23-command plan took 582 ms of CPU. It called the tile breakdown 10,800 times and the city breakdown 1,246 times. Of the city calls, 616 came from pricing a hypothetical building for a research choice. These calls can reuse parts of an existing city list. A call count measures entries to the function and says nothing by itself about which parts it recalculates. Seat 2's 16-command plan took 177 ms and made 3,274 tile and 322 city calls. Both timings exclude copying the board for dispatch. A worker's elapsed CPU time does not establish a pause on the player's main thread. [Bot planning](../../src/ai/frozenBoard.ts) · [Research choices](../../src/ai/chain.ts) · [Building comparison cache](../../src/ai/townFolds.ts)

A smaller bot change has a clear target. Tile purchase scoring asked `borderGrowth` for an estimate without supplying the city's yields. That rebuilt 17 city lists in seat 0's plan and six in seat 2's. Pass the matching standing total at that decision point. Preserve the existing calculation without a production target. Before changing building comparison caching, measure repeated evaluations of the same city and building across commands with unchanged inputs. Other commands in the same plan can change the answer. [Tile purchase scoring](../../src/ai/wants.ts) · [Border growth](../../src/sim/cities.ts)

**Turn collection took 142 ms.** It made 147 city breakdowns. Of those, 74 priced each city before income was banked, 20 came from citizen assignment, and 53 came from base-rate calculations. Food routes already share the per-city prices. The treasury changes during collection and can change the effects of Orders and the debt penalty. Keep these timing boundaries when reusing work. For the player's reported stutter, movement and screen draws have higher priority. [Collection](../../src/sim/yields/empire.ts) · [Citizen assignment](../../src/sim/cities.ts)

## Measurement method

Each timed sample restored the same snapshot. For player-facing measurements I warmed the seat's empire reading first, except when explicitly measuring a repeat lookup. Nine timed samples followed three warm-ups. Collection used five samples after three warm-ups. Bot planning used five samples after two warm-ups, with a fresh private board for each plan. The figures above are median elapsed times for synchronous functions in Node. A separate build counted function calls without affecting the timed runs. I checked the fixture's actual pending offer for stamp equality and accepted commands for both visibility and the Order reproduction. The controlled charter preview used its real card and the game's own offer functions.

For the next browser measurement, capture the legionary's sight change and the Dawnreach route separately. Record tiles repriced, time spent building mote geometry and the first frame with visible movement. Compare the two routes with bot preparation both on and off. [Browser measurement instructions](../../scripts/input-latency/README.md)

## Changes and verification

The updated build reuses each city's current total across the top bar, city banners and yield chips. Order previews share the real board across the offer. Each hypothetical board still calculates its own city contributions. A change to happiness, authority or debt can then apply new percentages to those contributions. Opening a technology charter skips the ordinary Order preview and uses the research screen's current science rate.

| Turn 120 operation | Earlier calculation count | Updated count | Median CPU time before and after |
|---|---:|---:|---:|
| Technology charter, current income already available | 136 city breakdowns and 1,386 tile breakdowns | 0 and 0 | 45.06 → 0.03 ms |
| Actual three-card draft for seat 2 | 126 city breakdowns and 774 tile breakdowns | 18 and 186 | 26.30 → 12.05 ms |
| First Council total for seat 0, current income available | 102 city breakdowns and 1,102 tile breakdowns | 17 and 392 | 34.34 → 12.98 ms |
| Repeat the same Council total | 102 city breakdowns and 1,102 tile breakdowns | 0 and 0 | 31.54 → 0.01 ms |
| Rank 61 settlement sites for seat 0 | 1,159 tile breakdowns | 259, one per distinct tile | 3.04 → 2.57 ms |
| Refresh the 35 visible city banners | 29 city sums | 0 city sums | 1.11 → 0.93 ms |

Each timing used eleven alternating pairs after three warm-ups. Each build started with an independent copy of the save and a current empire reading. Function counts came from separate instrumented runs.

City trade summaries count eligible routes without pricing them. Workers share the existing tile reading across their build options. A bot estimating border growth uses the city total it already calculated for that decision. The religion screen shares its reading between the title and the followers tab.

### Movement and display

Reselecting a unit can reuse its reachable tiles and attack targets. Hovering a destination and then moving there can reuse the displayed path for the animation. The reducer independently checks the command. A board revision expires the UI path and range. The waiting list for End Turn also depends on units the user skipped and whether they closed the religion screen this turn. The UI includes those choices in its cache key. Dismissing a census advances the command revision and preserves cached income.

The yield symbols and motes now use one price per tile and viewer. Sight changes can hide a tile without changing its yield. An economic change can also affect a tile while it stays visible. The renderer checks the owning city's yield rules before reusing a price across a garrison or citizen-focus change. Unknown or position-dependent inputs take a fresh reading. A board replacement or a data reset also expires the readings. If a soldier enters and leaves the same city in one move and nothing else affects income, the simulation restores the earlier yield readings. The renderer uses the same signal and still checks for changes in sight.

| Move on the same starting save | Earlier CPU time | Updated CPU time | Visible result |
|---|---:|---:|---|
| Legionary 364 from (59,7) to (59,6), sight only | 4.20 ms | 1.17 ms | One lit tile disappeared. The other 253 needed zero new tile calculations. |
| Legionary 256 from (54,18) to (54,19), leaving a garrison | 5.43 ms | 4.62 ms | No remaining tile changed and the disappearing tile had no light. The geometry stayed in place. |

These medians cover choosing visible tiles, calculating their yields and building mote geometry in Node. Fifteen alternating pairs followed five warm-ups, with each variant starting from its own restored board. They exclude other board layers, the GPU and waiting for a frame. A garrison exit must still check city rules. In a separate test with The Soldier-Farmers active, that exit correctly reduced gold and production on resource tiles. Removing The Highlands updated all 14 tiles whose mote level changed. [Renderer regression cases](../../test/render/boardTileYields.test.ts)

### Correctness checks and remaining work

- For all six playable seats, the earlier and updated builds produced identical full bot plans, decision explanations and settlement rankings. All 56 sampled Council and Order comparisons matched line by line.
- At six successive states on the late-game board, all 74 city breakdowns and all six empires' totals, income lines, base rates, happiness and authority matched fresh calculations. The sequence covered two ordinary movement commands, a garrison exit, a focus change and removing The Highlands.
- The simulation still expires some readings for a whole empire. Changing a city's worked tiles can affect another city through trade or an empire-wide Order. Hypothetical buildings in bot research and the costs of turn collection remain separate opportunities.
- On a board update, the renderer still walks the map to check whether the artwork for improvements changed. That walk examines resource reveals, the owning player's age, damaged improvements, terrain features and cities. Animation-only frames normally skip it. A narrower key must also account for the display settings that choose improvement models. [Improvement change check](../../src/render3d/paintedWorks.ts) · [Renderer update](../../src/render3d/renderer3d.ts)

### Leaving a garrison

Moving legionary 256 out of city 408 did no full city yield calculations. Reading the income bar after the move recalculated 17 city breakdowns. Only city 408 changed. It lost 14 production, 15 science and 4 culture before percentage bonuses. Sword and Plough, Examinations of State and Regimental Schools supplied those yields. The Arthashastra doubled Regimental Schools. Other games can have Orders or trade routes that make a garrison matter outside its city.

Cities now share the empire's existing list for each effect kind. Each city appends its own matching effects in their original order. This reduced the number of effect rows inspected during the income calculation from 31,382 to 8,282. Across 33 alternating pairs, the median CPU time for the move and income update went from 8.54 to 8.19 ms. A focus change at Dawnreach went from 7.09 to 6.76 ms. These measurements exclude drawing and input latency. [City effect lookup](../../src/sim/statecraft/evaluator.ts) · [Garrison and city-only income test](../../test/sim/stepSeen.test.ts)

Two experiments did not justify more caching. Reusing the worked tiles avoided all 142 tile calculations, but checking their inputs cost enough to make the move slower. Caching local effects for longer added no repeatable gain over sharing the empire list. We checked the smaller change against fresh calculations for all 74 cities and six empires before and after a garrison exit, a focus change, a sight change and removing The Highlands.

In Chrome on the M4 at 1.5× resolution, swordsman 818 passing through Dawnreach triggered zero city or board tile calculations. The yield light check took 0.1 ms with bot planning on and 0.0 ms at the timer's precision with it off. The earlier renderer took 5.5 and 3.7 ms for the same check. By comparison, legionary 256 leaving its garrison triggered 17 city calculations and zero board tile calculations. The release-to-draw times were 138 ms with planning on and 97 ms with it off. These are individual clicks. They identify work on the input path but do not measure average FPS or establish how much latency the bots add.
