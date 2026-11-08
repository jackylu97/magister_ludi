# Performance and clean-up pass, 2026-11-06

The user's request, after the Doctrine build: *"yes do a performane pass. please remove any unused code. re-organize logic so that its well encapsulated with the new set of abilities. use any skills you have access to to make this build more performant and simple to understand"*

The branch is `decks`, from `c81fcaca`. Nothing is pushed. A push still needs the user's yes.

## What started this

Six seats, two decks each, standard map, 120 turns, one fork, on the same commit pair (`2a73a7e5` deployed, `a207602a` this build):

| Game | Deployed: total, last 10 turns | This build: total, last 10 turns | Towns, units (deployed, this build) |
|---|---|---|---|
| Seed 999 | 126 s, 2.3 s a turn | 275 s, 8.0 s a turn | 37 and 169, 53 and 330 |
| Seed 42 | 142 s, 2.1 s a turn | 169 s, 4.1 s a turn | 33 and 175, 45 and 238 |

Those figures came from a busy laptop. The findings below use a quiet one, so the totals are lower and the ratios are close.

## The three stages, in this order

1. **Speed.** Find where the time goes on both builds, fix the causes, and measure again.
2. **Unused code.** Remove what nothing reaches: exports, functions, data fields, shapes and tests of them.
3. **Encapsulation.** Move the logic the Doctrine build added into units with one job and a small surface. `src/ai/value.ts` (13,414 lines) and `src/ai/bot.ts` (9,574 lines) are the first candidates, and a split must have a reason a reader can state.

## Rules for every change in this pass

- **The bots decide the same.** A speed fix, a removal or a move changes no decision and no rule. The pin is `test/sim/aiDigest.slow.test.ts`, on both boards, plus the two-deck games at seeds 999 and 42. If a digest moves, the change has a bug until proved otherwise.
- **A change that would move a digest is a question for the user,** not a fix. That includes capping how many units a bot builds, or pricing a card more coarsely. Measure it, then report it.
- **The readings stay honest.** Rule 5 still holds: a total is the fold of its list. A memo stores a list or a fold, and never a second way to reach it.
- **A memo needs a stated lifetime and a reason it cannot go stale.** Key it on the state revision or on the `ValueContext`, as `src/sim/readings.ts` and `src/ai/value.ts` do. Name what would make it wrong.
- **Determinism.** No clock, no `Math.random()`, no outcome from Map or Set order in `src/sim/` or `src/ai/`.
- **Coverage stays.** A test goes only with the code it covers. A reworked test replaces the old one.
- **Registers stay true.** Source-reading tests may name a moved function. Update the register, and do not weaken what it asserts.
- **Save format.** A speed fix or a move does not bump the schema. If a change must, it is a question for the user.
- **Plain writing.** Comments explain why, in plain English (`CLAUDE.md`, "Writing"). No em dashes. Old voice in a touched block may be rewritten when the block moves. Do not start a separate rewrite of comments.

## Pins

Every change in this pass keeps these, on commit `a207602a`, schema 226. `pin.zsh` lives in `~/code/webciv-review/`.

| Game | Turn 20 | Turn 40 | Turn 60 | Turn 80 | Turn 100 | Turn 120 |
|---|---|---|---|---|---|---|
| Two decks, seed 999 | `9c6d08a2:816362` | `71aa694e:836957` | `0fea4510:858075` | `fd5516e2:893884` | `b60d282a:954549` | `0c71298d:1018350` |
| Two decks, seed 42 | `2452bd2a:816618` | `ef7b6931:832292` | `06f01163:849767` | `f91d70de:879534` | `3d0cfd5e:918043` | `c692d39f:954330` |

`test/sim/aiDigest.slow.test.ts` pins duel `269f8ad7:313474` and standard `6b717173:928115`.

## Findings

**The slowdown is more commands, not slower commands.** Turns 111 to 120, on a quiet laptop:

| Game | Build | Seconds a turn | Commands a turn | Milliseconds a command | Towns | Units, barbarians included |
|---|---|---|---:|---:|---:|---:|
| Seed 999 | Deployed | 1.25 | 49 | 25.5 | 35 | 260 |
| Seed 999 | This build | 4.15 to 4.32 | 168 | 24.7 to 25.7 | 52 | 413 |
| Seed 42 | Deployed | 1.09 | 40 | 27.6 | 33 | 284 |
| Seed 42 | This build | 1.81 | 94 | 19.2 | 43 | 341 |

- A command costs the same or less on this build. The extra time comes from bots that hold more towns and units and give more orders.
- In seed 999, seat 0 alone holds 109 units and 14.6 towns and takes 1.6 s of the 4.2 s.
- `moveUnit`, `fortify` and `sleepUnit` are 58% of all commands in turns 101 to 120 of seed 999 (1,669 of 2,893). On seed 42, `moveUnit` rose from 138 to 834 between the builds. Why the bots move so much more is a question about their play, not their speed, and this pass only reports it.
- The cost of a seat's turn is about (orders given) times (the empire's towns), because several readings of the whole empire are taken again after each command.

**Where a command's time goes.** Seed 999, turns 100 to 120, this build, 75.8 s in all:

| Reading | Share | Note |
|---|---:|---|
| `explainCity` | 34% | Two main callers: `foldEmpireRates` (13.5 s) and the what-if grid in `townFolds.with` (10.2 s) |
| `valueContext` | 27% | Once a seat's turn. `wantBook` 8.9 s, `liveChains` 5.4 s, `routeOutlook` 4.3 s |
| `foldEmpireRates` | 23% | Not remembered at all. 11.4 s of it is `disbandCommand` asking `netGoldPerTurn` on every decision |
| `techChain` | 17% | `priceCopy` to `townFolds.with`, from `liveChains` and from `reaimBeeline` |
| `dispatch` | 13% | The reducer. `applyEndTurn` is 7.2 s of it |
| `blockaded` and `cityBlockaded` | 8% | `cityBlockaded` builds a set of strings, then walks every unit on the board, for each route line |
| `wakeTheCampaign`, `reaskTheMarch` | 13% | Housekeeping on each decision |

The same functions lead the profile on the deployed build. No single Doctrine reading stands out. A fix to these readings speeds up both kinds of game.

**Why the readings are taken again after every order.** `readCity` and `readEmpire` sat on the revision clock, which moves on every accepted command, because a town's list can see a hull in the harbour mouth (`cityBlockaded`) and a piece in a town.

**Correction, from batch P1.** This plan first said that the economy clock stands still for movement orders. That was wrong. Since batch M3, every step and every fog sweep moved it. In turns 100 to 120 of seed 999, 3,009 of 3,034 commands moved it. So P1 first had to narrow what announces, and could then move the readings to that clock.

## Batches

### P1: the town's list stops being re-read after a plain move

Fence: `src/sim/blockade.ts`, `src/sim/routeYields.ts`, `src/sim/slate.ts`, `src/sim/readings.ts`, `src/sim/yields/empire.ts`, `src/sim/yields/town.ts`, `src/sim/commands.ts` (the clocks), `src/ai/townFolds.ts`, `netGoldPerTurn` in `src/ai/bot.ts`, and the tests of these.

1. Make `cityBlockaded` cheap: no set of strings per call, and no walk of the whole board for each route line.
2. List everything under `explainCity`, `foldCity` and `foldEmpireRates` that reads where a unit stands. This includes the blockade, garrisons, and any card or Doctrine that counts pieces on a hex. State the list in your report.
3. Decide from that list whether these readings can sit on the economy clock, with each piece-reading seam announcing when it changes. `meterEffects` already does this for garrisons. `test/slateShadow.ts` and `test/vitest.shadow.config.ts` recompute every memo hit, so use them to prove it. Run the shadow check on a played game as well as on the tests. A mismatch means a seam has not announced.
4. If that holds, move `readCity`, `readEmpire` and the `townFolds` grid to the economy clock, and remember `foldEmpireRates` under it. `foldEmpireRates` sits below `readings.ts`, so it uses `slateMemo` directly, as `meterEffects` does. Check that no caller changes the returned object, and that no phase reads a stale answer.
5. If it does not hold, keep the revision clock, and use the cheapest correct thing instead. Report why.

Done means: pins unchanged, `slateRegister` still true, and a before-and-after profile of seed 999.

### P2: a bot stops repeating work inside one seat's turn

Fence: `src/ai/` (mainly `bot.ts`, `chain.ts`, `townFolds.ts`, `wants.ts`, `campaign.ts`), `src/sim/turn.ts` (`marchOneTrader`, one line, task 1), `src/ai/plan.ts` (`siteGround`, task 1), and the tests of these.

The profile after P1 (`~/code/webciv-review/prof/p1-final-999.cpuprofile`, seed 999, turns 100 to 120, 79.3 s in all). Shares overlap, because one function calls another.

| Path | Time | How often it runs |
|---|---:|---|
| `priceCopy` to `townFolds.with` to `explainCity` | 10.7 s | From `techChain`, under `techGoalTable` and `liveChains` |
| `reaimBeeline` to `researchCommand` to `techGoalTable` | 9.1 s | `housekeeping`, on each decision |
| `wantBook` | 8.1 s | Inside `valueContext`, once a seat's turn |
| `disbandCommand` to `netGoldPerTurn` | 7.2 s | On each decision |
| `wakeTheCampaign` to `soldierCommand` | 6.9 s | `housekeeping`, on each decision |
| `liveChains` | 6.1 s | Inside `valueContext`, once a seat's turn |
| `reaskTheMarch` to `unitCommand` | 5.4 s | `housekeeping`, on each decision |
| `routeOutlook` | 4.1 s | Inside `valueContext`, once a seat's turn |

1. **Two stale answers that P1 found, on the committed tree too.** Both make a played game throw under the shadow check, and that limits how far the check can prove later batches.
   - `marchOneTrader` renews `TradeRoute.expiresTurn` and does not announce, so `luxuryLoans` is stale until the next step (seed 999, turn 102, phase `marchTraders`).
   - `siteGround` (`src/ai/plan.ts`) holds a shallow copy of the board for a sitting, and that copy keeps the old law after a government change (seed 999, seat 2, turn 68; forced game, seed 11, turn 44).

   Fix each one by itself, and run the pins after each fix. If a fix leaves the pins unchanged, keep it. If a fix moves a pin, remove it and report the first turn it moved, because that is a question for the user. Then run the shadow check on seed 999 for the whole game, and report how far it gets.
2. **Count before you change anything.** For each path in the table, count the calls in a seat's turn, and how many of them return the same answer as the call before. Put these counts in your report. They decide which fix comes first.
3. **Stop asking again when nothing has changed.** The three `housekeeping` readings run on each decision. If an answer depends only on what the economy clock covers, keep it until that clock moves. Name everything else it reads, such as a unit's own orders or a sitting's memory. If you cannot name it all, do not remember it.
4. **Ask the cheap question first.** `disbandCommand` asks for net gold on each decision. If a cheaper test settles the decision in most cases, ask it first. Change the order only if the decision stays the same in every case.
5. **Look at `priceCopy`.** Find out why `with` still costs 10.7 s after P1. Check how many distinct pairs of town and row are asked, how many grids are built in a seat's turn, and whether `techChain` prices rows that its caller then ignores.
6. **Measure a per-town clock, and do not build it.** `setCityProduction` is 359 of the 1,533 clock moves in those turns, and it changes one town. Estimate what the bots would save if only that town's reading were dropped. Report the figure. A third clock adds machinery, so it needs a strong reason.

Done means: pins unchanged, `test/sim/slateRegister.test.ts` still true, and a before-and-after profile of seed 999 from the same hour.

### P3: hot small functions, the last speed batch

The profile after P2 is flat. No function holds more than 3% of the time by itself, so this batch has a limit. **Stop when the next change would save less than 1% of the profile.** Report what is left, and do not chase it.

Fence: the functions below and their tests. Do not change the shape of a reading, and do not add a clock.

The profile is `~/code/webciv-review/prof/p2-final-999.cpuprofile` (seed 999, turns 100 to 120, 102.6 s in all).

| Function | With its callees | Note |
|---|---:|---|
| `searchPath` (`src/sim/pathfind.ts`) | 10.8 s | `findPath` 5.9 s and `findPathToFirst` 3.4 s call it. `stepCost` is 2.7 s and `zocField` 2.4 s below it |
| `improvementErrorAt` (`src/sim/improvements.ts`) | 6.4 s | `improvementGroundError` 2.2 s, `improvementCardError` 2.1 s, `townHoldsWork` 1.1 s |
| `cityScopeAdmits` (`src/sim/statecraft/evaluator.ts`) | 6.0 s | `connectedCities` 2.6 s, `garrisonOf` 1.1 s |
| `explainTileYield` (`src/sim/yields/hex.ts`) | 5.5 s | 3.0 s by itself, and `pushLine` 1.8 s |
| A function with no name in `src/sim/cities.ts` | 2.5 s | Find out which one it is |
| `sweepOwnCopies` (`src/sim/cities.ts`) | 2.0 s | |
| `wrapCol`, `wrappedDistance`, `mapRange` (`src/sim/map.ts`) | about 4 s | Small and called very often |
| `cityBlockaded` (`src/sim/blockade.ts`) | 1.8 s | A port still walks every piece, by design |
| `playerById` (`src/sim/state.ts`) | 1.6 s | |
| `ownedTiles` (`src/sim/cities.ts`) | 1.6 s | |
| `townHolding` (`src/ai/value.ts`) | 1.5 s | |

1. Read each function, and find what makes it cost so much. Prefer a better loop to a memo.
2. Take the largest saving first, and measure each change alone.
3. A memo needs a stated lifetime, and a reason it cannot go stale. The rules at the top of this plan still apply.

Done means: pins unchanged, `test/sim/slateRegister.test.ts` still true, and a before-and-after profile of seed 999 from the same hour.

## Stage 2: unused code

The list is `~/code/webciv-review/dead-e82a.txt`, made by `dead.cjs` at `e82a7da8`. The tool starts from the eight pages' entry modules and follows every name to the top-level declaration it means. A declaration that no page reaches is unused. It has four sections:

| Section | Declarations | Lines |
|---|---:|---:|
| 1. No page reaches it, and no test names it | 170 | 2,497 |
| 2. No page reaches it, and only tests or scripts name it | 243 | 3,508 |
| 3. Reached, but exported, and no other file names it | 1,067 | 15,995 |
| 4. Reached, exported, and only tests name the export | 691 | 10,575 |

**Leave these alone.** Each is a rule in `CLAUDE.md` or a question for the user:

- `src/render/`, the frozen 2D renderers. They are live: `main.ts` imports them when the address asks for `?art=`. `dead.cjs` listed them as unused because it did not follow names taken out of a dynamic import. `CLAUDE.md` says to keep them compiling.
- `src/ui/guide*.ts`, tutorial version 2: 113 declarations and 1,556 lines. The user's decision.
- `consecrateError` and `consecrateAt`, kept on purpose (`CLAUDE.md`, Religion).
- `retired: true` rows, and the code that reads them for saves and the Compendium.
- `src/sim/statecraft.ts`, the index that 144 test files import.

### U1: remove what nothing reaches

Fence: `src/` outside the list above, and the tests of what goes.

1. Check each declaration in sections 1 and 2 before removing it. Search its name in `src/`, `test/`, `scripts/`, `data/`, the root `*.html` pages, `vite.config.ts` and `docs/`. A name inside a string counts as a use: a register test, a describer table, a JSON `kind`.
2. **Section 1:** remove the declaration. Then remove any import or local that the type check now reports as unused.
3. **Section 2:** decide each one.
   - If the only tests that name it test the declaration itself, remove the declaration and those tests.
   - If a test uses it to check live code or data, keep it, and give the reason in one line of the report. These are the usual cases: the `*Problems` validators, the register and count lists (`OCCASIONS`, `BEAD_COUNTS`, `WAGER_COUNTS`, `TALLY_OCCASIONS` and the like), `setSlateShadow`, `replay`, `saveGame`, `loadGame`, `snapshotState`, `restoreState`, `cloneRng`, fixture helpers (`withExtraResources`, `clearSeatTuning`, `memoryCheckpointStore`), size probes (`dealMemorySize`, `warLedgerSize`) and the tech chart layout that the tree test pins.
   - If you are not sure, keep it and list it.
4. If a source-reading register test names a removed function, update the register. Do not weaken what it asserts.
5. Remove a comment that names a removed function. Do not rewrite other comments.

Done means: type check clean, the narrow tests and the register tests green, the 60-turn pin unchanged, and a report of what went, what stayed and why.

### U2: an export means that another file uses it

Section 3, made again after U1 with `~/code/webciv-review/dead-js.cjs`. That copy of the tool also reads the `.js` modules and follows names taken out of a dynamic import, which the first tool missed. Remove the `export` keyword from each declaration that only its own file uses. Then a reader can trust that `export` marks the module's real surface, and the type check catches the next unused function by itself (`noUnusedLocals` is on).

1. Do it with a script on the TypeScript compiler API, not by hand. Keep the script in `~/code/webciv-review/`.
2. Keep `export` on an entry module's declarations, and on anything that a root page, `vite.config.ts` or a string in a test names.
3. If the type check reports a newly unused local, that declaration was reached only through a dead path. Remove it, and list it in the report.

Done means: type check clean, the register tests green, the core tier green at the gate, and the pins unchanged.

### U3: data fields that nothing reads

An audit first. For each `data/*.json` file, compare the keys in its rows with the TypeScript interface the loader reads them through, and with every reader in `src/`.

- A key that is not in the interface and that no code reads is a leftover.
- A key in the interface that no code reads is unused.
- The arena panel walks all of `data/ai.json`, and the Compendium walks the rows, so a key either one prints counts as read.

Remove only clear leftovers: no reader, no doc table, no sync test. List the rest for the user.

## Built

### P1

A plain step no longer makes a seat price its empire again. `readCity`, `readEmpire`, the new `readEmpireRates` and the bot's `townFolds` grid now sit on the economy clock. A step of a plain order moves that clock only when `stepIsSeen` (`src/sim/movement.ts`) finds that a reading can tell. `cityBlockaded` builds no strings, and an inland town answers at once.

| Measure, same hour, before and after | Before | After | Change |
|---|---:|---:|---:|
| Seed 999, turns 1 to 120 | 185.5 s | 157.3 s | −15% |
| Seed 999, turns 111 to 120 | 5.51 s a turn | 4.38 s a turn | −21% |
| Seed 42, turns 1 to 120 | 113 s | 100 s | −12% |
| Commands that move the clock, seed 999, turns 100 to 120 | 3,009 of 3,034 | 1,533 of 3,034 | |

Where P1 differs from its task list:

- `foldEmpireRates` has no memo, because callers inside a handler or a phase ask it. The memo is `readEmpireRates`, which only readers at rest may ask.
- A port still walks the pieces, with one row comparison first. `siteGround`'s shallow copy shares `state.units` but has no clock, so a remembered list of ships would be wrong there.
- Phases still announce every step and every fog sweep.

Checks at the gate:

- Type check clean, 11,098 core tests passed, build clean.
- Both pins match at all six turns. `test/sim/aiDigest.slow.test.ts` passes on both boards.
- `test/sim/stepSeen.test.ts` is new. It gives each seam a card row that reads it. The agent turned off each of 16 seam clauses in turn, and the tests caught all 16.
- The core tier under the shadow check fails 44 tests. The same 44 fail on the commit before P1, so P1 adds none. Most messages say `law shadow: seat 0's law is stale at turn 1`. No one has yet worked out why these 44 fail.

Left for later: `foldOnRevision` keeps its old name, and `liveReading` still keys on the revision (about 1% of the time).

### P2

A bot repeats less inside one seat's turn, and the two stale answers that P1 found are fixed.

| Measure, same hour, before and after, on a busy laptop | Before | After | Change |
|---|---:|---:|---:|
| Seed 999, turns 1 to 120 | 227 s | 205 s | −10% |
| Seed 999, turns 111 to 120 | 6.41 s a turn | 5.65 s a turn | −12% |
| Seed 42, turns 1 to 120 | 143 s | 134 s | −6% |
| `housekeeping`, seed 999, turns 100 to 120 | 33.0 s | 23.1 s | −30% |

What changed:

- **The two stale answers.** `marchOneTrader` announces a renewed term, and `siteGround` builds its copy again when the real economy clock moves. Neither fix moved a pin.
- **Remembered:** `townsAreHeld`, the `campaignEnemy` ask and a new `foreignHexes` filter on the revision clock, `goldReserveFor` on the economy clock, and `buildImprovementPlan` on the context and the economy clock. The plan's `unclaimed` bit is written again on every ask, because a plain order moves a worker without moving that clock.
- **Cheap tests first:** `wakeTheCampaign` asks its pure tests before `marchIsStalled`. `skipCandidate` prices each card once.
- **`techChain` takes `scoreOnly`,** which only `techGoalTable` passes. It skips the fold for a copy whose own `raise` already reaches the horizon, because that copy's discount is zero. On the spectator feed, such a row now prints only the zero discount. No figure changes.

What the counts showed, which corrects this plan's table:

- `reaimBeeline` runs about twice a seat's turn, not on each decision. Every repeat follows a clock move, so a memo saves nothing.
- `townFolds.with` costs what it does because the pairs are distinct: 321 pairs of town and row a seat's turn. 85% of misses are a first ask.
- `disbandCommand` stays the largest repeated cost, at 10.4 s of 102.6 s. Net gold settles 87% of its asks, so no cheaper test can go first. 83% of clock ticks read the rates only for this arm.
- A per-town clock for `setCityProduction` would save about 2.7%. It does not justify a third clock, so it is not built.

Left out because it could change a decision: the beeline's table could skip every copy with a zero discount, and price it only if a later table finds it live. That would save an estimated 2.5% to 5%. It could price a copy later than today if a technology lands mid-sitting. This never happened in the games measured, but nothing proves it cannot. The saving is small, so this stays out unless the user wants it.

Checks at the gate:

- Type check clean, 11,108 core tests passed, build clean.
- Both pins match at all six turns. `test/sim/aiDigest.slow.test.ts` passes on both boards.
- The core tier under the shadow check fails 43 tests, all from P1's list of 44, with no new failures. The 44th, in `resourceBonuses`, compares timings, so it does not count as a fix.
- The agent ran seed 999 with every hit disbelieved for turns 1 to 76, with no throw. Past that point the check got too slow, so it ran the whole game with sampled checks, also with no throw. With the trader fix removed, a check of `luxuryLoans` throws at turn 102, as before. With the fix, turns 95 to 120 are clean.

### P3

The small hot functions cost less, and the speed stage ends here. The profile after P3 holds nothing that would save 1%.

| Measure, same hour, before and after | Before | After | Change |
|---|---:|---:|---:|
| Seed 999, turns 1 to 120 | 211.4 s | 112.4 s | −47% |
| Seed 999, turns 111 to 120 | 5.84 s a turn | 3.20 s a turn | −45% |
| Seed 999, profile of turns 100 to 120 | 105.7 s | 56.6 s | −46% |
| Seed 42, turns 1 to 120 | 133 s | 69 s | −48% |

What changed, with each function's cost before and after:

- **Path search, 11.3 s to 5.8 s.**
  - `map.ts`: `wrapCol` returns at once for a column on the board. `wrapQ`, `wrappedDistance` and `mapRange` build no objects. The new `neighbourTable(map)` holds each hex's neighbours by tile index, keyed on width and height.
  - `pathfind.ts`: `zocField` and `transitField` ask `atWar` once a seat (`warReader`). `zocBinds` checks only the six hexes beside `from`, through `ZocField.isSource`. `TransitField.occupied` lets `canStopOn` skip the stacking walk on an empty hex. `stepCost` is still the one price, and `zocField` is still built once per sweep.
  - `playerById` tries `players[id]` first, and `atWar` reads each player once.
- **The bot's improvement plan, `improvementErrorAt` 7.6 s to 0.** `plan.ts` filters the roster once with `improvementOpenTo`, and each hex then asks only `improvementGroundError`. The new `hexStanding` reads a hex's owner and town once.
- **New memos on the economy clock:** `resourceSites`, `cityResources`, `connectedCityIds`, `garrisonOf`, `hullsOnBoard`, `caravansOnBoard` and `liveResourceEffects`. Each states its lifetime and what would make it wrong. The two that fold the law, `cityResources` and `liveResourceEffects`, carry `lawIsCut()` in their key, as `liveReading` does. The ship and caravan lists hold the units themselves, so position and owner are read live. Only a unit being created, removed or upgraded can make them wrong, and each of those announces.
- **Yields.** `explainCity` builds the town's context once and passes it to `explainCentreYield` and `foldCentre`. `explainTileYield` sorts a context's lines once into a plan, kept in a `WeakMap` on the lines array. `foldTileLines` and `foldCityFlats` name the six voices.
- **Smaller loops:** `highestAge`, `townHoldingOn`, `nearestTownInReach`, and one transit field per search in `exploreSearch`, `standingsNear` and `stepAsideForBlocker`.

Test edits: fixtures that wrote to the state by hand now call `bumpRevision`, which is the rule for such a test. No assertion changed. `slateRegister.test.ts` has two new `EXCUSED` rows, for `foldTileLines` and `foldCityFlats`, which write a local total. `map.test.ts` and `zoc.test.ts` check the new code against the old rules.

Checks at the gate:

- Type check clean, 11,116 core tests passed, build clean.
- Both pins match at all six turns. `test/sim/aiDigest.slow.test.ts` passes on both boards.
- The core tier under the shadow check fails 44 tests: P2's 43 and the `resourceBonuses` timing test, which was on P1's list. Under the shadow check, a memo hit also does the whole walk. So that test's warm and cold loops cost nearly the same, and the result changes with load. Run alone, it passes under the shadow check and passes in the normal tier (0.14 µs warm against 38 µs cold).

Left, each under 1% of the profile: `importedLuxuries` and `luxuryLoans` on the revision clock (0.5 s), `cityLocalEffects` asking `oneOfAKind` first (0.4 s), `liveReading` on the economy clock only (0.5 s), `garrisonAt` in `campaign.ts` (0.6 s), and `say` with handles (0.4 s).

### End of the speed stage

The deployed build against the build after P3, run back to back on a quiet laptop, 18:37 to 18:45 on 2026-11-07. Six seats with two decks each, standard map, 120 turns, one fork. Towns and units count the six seats, not the barbarians.

| Game | Deployed `2a73a7e5`: total, last 10 turns | After P3 `e82a7da8`: total, last 10 turns | Towns and units (deployed, after P3) |
|---|---|---|---|
| Seed 999 | 127.8 s, 2.24 s a turn | 108.8 s, 2.80 s a turn | 37 and 169, 53 and 330 |
| Seed 42 | 141.6 s, 2.31 s a turn | 72.9 s, 1.45 s a turn | 33 and 175, 45 and 238 |

- On seed 42, the Doctrine build is now faster than the deployed build over the whole game and at the end.
- On seed 999, the whole game is faster. The last ten turns cost 25% more than on the deployed build, with 43% more towns and twice the units. At the start of the pass they cost about 3.5 times as much.
- The remaining gap comes from bigger empires that give more orders. That is a question about how the bots play, and it is for the user.

### U1

50 declarations that no page reaches are gone: 25 from section 1 and 25 from section 2. `src/` lost 520 lines net, `test/` 279.

- **Removed, among others:** `describeCombat` and `siegeTail` (`combat.ts`), ten old hex helpers in `hex.ts` (`neighbor`, `ring`, `range` and the like; the map's own helpers are the live ones), `valueOfSoldier`, `metSeats`, `originCityOf`, `seamDistance`, `formatYield`, and the dead sentence builders in `diplomacyScreen.ts`, `bankFigure.ts`, `figures.ts` and `priceCell.ts`. The full list is in the agent's report.
- **Tests:** only the blocks that tested removed code went. In `combat.test.ts`, three checks on the removed sentence became checks on the outcome itself (`cityPhase`, `capturedCityId`, `defenderUnitId`).
- **Kept from section 2: 129 declarations.** Each is a test tool that checks live code or data: the `*Problems` validators, register and count lists, save and replay, fixtures, size probes, the tech chart layout, reference answers such as `tileYield`, and thin wrappers that tests drive.
- **Unsure, kept:** eight reserve unit sculpts in `geometry.ts`, `cityBaselines` and `buildingYieldDelta` (comments say a future surface needs them), `ritePreview` and `bestRouteMode` (live comments explain code through them), and `TechGiftKind` (its docblock is the only description of the gift kinds).

**The first tool gave false positives.** It did not read the `.js` modules of the painted board, and it did not follow names taken out of a dynamic import. So the frozen 2D renderer and `createCompendium` looked unused, and they are not. `~/code/webciv-review/dead-js.cjs` fixes both. With it, after U1: section 1 holds 77 declarations (620 lines) and section 2 holds 188 (3,029 lines). Tutorial version 2 is 113 of them (1,556 lines); most of the rest are the test tools above.

Checks at the gate: type check clean, 11,093 core tests passed, build clean. Both pins match at all six turns. `test/sim/aiDigest.slow.test.ts` passes on both boards. U1 touches no memo, so the shadow run was not repeated.

### U2

1,060 declarations in 234 files lost `export`, because only their own file uses them. Now `export` marks what a module offers other files, and `noUnusedLocals` catches the next unused function by itself.

- The edit was made by `~/code/webciv-review/unexport.cjs`, on the TypeScript compiler API. It deletes the keyword and never reprints a file. A check on the diff confirmed that each of the 1,060 changed lines is the old line without its leading `export `.
- Section 3 of the list went from 1,119 declarations to 59. The 59 are 29 in `src/render/` (frozen), 20 in `.js` files, and 10 that a test finds by their `export ...` text: `raiseOnDraft`, `COMMAND_CLOCKS`, `ADD_SHELVES`, `ADD_TABS`, `AddTab`, `FAITH_SHELF`, `GameControlsOptions`, `STAMP_PENDING_MARK`, `TRADE_MARK` and `SiteReading`.
- No local became unused, so nothing else was removed. No namespace import is walked by key, so none needed a keep.

Checks at the gate: type check clean, 11,093 core tests passed, build clean. Both pins match at all six turns. `test/sim/aiDigest.slow.test.ts` passes on both boards.
