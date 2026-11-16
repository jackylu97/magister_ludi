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

### U4: the movement wash's leftovers

U3 found that the movement frontier replaced the reachable-hex wash and rim on 2026-09-15 (`ca2ed768`), and that its tunables and one geometry stayed behind. Remove them:

- `data/view3d.json` and `src/render3d/lookData.ts`: `overlay.reachableOpacity`, `reachableRimColor`, `reachableRimOpacity` and `look.saturation`. The patch is `~/code/webciv-review/u3-dead-knobs.patch`.
- `overlay.reachableColor`, which only a test reads, and `reachableRimOuter` and `reachableRimWidth`, which only build `board3d.ts`'s `reachRing`. Nothing draws `reachRing`. Remove the three keys, the geometry, and the test assertion on them.
- `toon.ts` `setSaturation`, if only a test calls it.
- Check each against `src/flairGallery/` and the pieces gallery first. A slider there counts as a reader.
- `BuildingId` (`src/sim/buildingData.ts`) does not list `viziersHall`, a live row. Add it if the type check stays clean. If adding it needs more than the union, report it.

**Not unused: tutorial version 2.** `src/ui/guide*.ts` is batch T1 of `docs/plans/tutorial.md`, which the user approved on 2026-10-15. Batches T5 and T6 wire it into the game after the interface rework. It stays.

## Stage 3: encapsulation

The spec is `docs/audit/s3-encapsulation-2026-11-07.md`, a read-only audit. Its line numbers are those of `7e76fee0`. Its main findings:

- One Doctrine's code follows the layers: the data row, the type member, one reader in the evaluator, the seam that asks, the words, the bot's price and the screens. 46 of the 98 Doctrines are data only.
- A Doctrine that adds a new fact about the board (a turn stamp, a second capital) touches 8 to 13 files, because every reader of the fact must know it. A move does not change that.
- What a move can fix is the spread inside a file. The bot's prices, which the whole of `value.ts` and 8 other bot files use, sit under a heading that names only the first 130 of their 1,040 lines. The council code sits in two places of `draft.ts`, 1,300 lines apart.
- The repeats are small: 14 of them, listed in section 3 of the audit.

Rules for every batch: the rules for this pass, plus the audit's own. Code moves unchanged. A name the old file now imports gains `export`. New `src/ai` files stay flat, because 21 register globs read `src/ai/*.ts`.

Batches, in this order:

| Batch | What | Audit section | After |
|---|---|---|---|
| **S1** | The bot's prices leave `value.ts` for the leaf `src/ai/prices.ts` (about 1,110 lines) | 2, S1 | |
| **S3** | The schema history v79 to v221 leaves `state.ts` for `docs/history/schema-changelog.md` (about 3,365 lines of comment) | 2, S3 | may run beside S1 |
| **S2** | The scope's reach leaves `value.ts` for the leaf `src/ai/scopeReach.ts` (about 680 lines) | 2, S2 | S1 |
| **K1** | The sim merges: items 1 to 4, 8 and 9 (the city-cost rows, `cardUpgradeStrength`, `cardLevyEvery`, `cardBeliefPoolSlots`, the `rulePercent` words, `levyLineError`) | 3 | S2 |
| **K2** | The bot merges: items 5 to 7 and 10 to 14 (the Doctrine ghost seat, the lists a second reading leaves out, The Apostolic Camera's row test, one switch for the rule prices, the detached docblock, `foldOf`, the walks that ask "does this test name X", the context memos), and the seven docblocks in `prices.ts` and `scopeReach.ts` that point the wrong way after S1 and S2 | 3 | K1 |
| **S6** | Headings in the evaluator's tail, in the smallest form: headings only, no function moves | 2, S6 | K2 |

A merge in K1 or K2 must leave `test/fixtures/cardText.json` and the pins unchanged. If a merge would move either, leave it out and report it.

The user said yes to these on 2026-11-09 (*"yes to all decisions, please take a look at failing tests after the changes. we can do a bot pass after some more playtesting"*):

- **S4:** the council leaves `draft.ts` for a fourth file, `src/sim/statecraft/council.ts`. It changes the `CLAUDE.md` line "the card system in three". That change is approved with the batch.
- **S0 and S5:** a new load-order test over `src/ai/*.ts`, then the bot's council and offer decisions leave `bot.ts` for `src/ai/council.ts`. That adds one function-level cycle between `council.ts` and `bot.ts`. Measure the test's cost before it joins the core tier.

After S5, in this order:

1. The push gate (`npm run test:all`) on the result, then push `main` and `deck-themes` and move the play server, so the user can playtest.
2. The stale-answer failures in the shadow run (43 or 44 tests, "law shadow … stale at turn 1"). Find the cause before any fix.

The bot pass (why bots on this build give many more orders) waits for more playtesting.

Not doing, from the audit's section 4: splitting `evaluator.ts` into files, splitting `value.ts` by deck, a bot subfolder, splitting `scoreEffect`, and splitting `describers.ts`.

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

### S3

The schema history v79 to v221 moved from the `SCHEMA_VERSION` docblock in `state.ts` to the end of `docs/history/schema-changelog.md`, word for word. Entries v222 and later stay, as the docblock asks. `state.ts` went from 8,611 lines to 5,246, and its first type now starts at line 239.

- A script (`~/code/webciv-review/s3-schema/check-move.py`) proved the move exact: every non-comment line of `state.ts` is unchanged, and the lines added to the changelog equal the moved span without its comment prefix.
- The kept entries now point at the changelog for v119. The changelog's title and intro, and its row in `docs/history/README.md`, name the new range.
- One test read the v111 entry from `state.ts`: `test/sim/sunkProgress.test.ts`. The audit missed it. It now reads the changelog, and takes the v111 entry alone, so it checks a narrower text than before.

Checks at the gate: type check clean, 11,093 core tests passed, build clean. No code changed, so the pins were not run.

### U3

No key in `data/` is a leftover. A script on the TypeScript compiler API (`~/code/webciv-review/data-keys.cjs`) matched every key in the 28 data files to the interface it is read through, and every key is declared. So U3 removed nothing.

Nine declared keys have no live use:

- Four tunables of the movement wash that the frontier replaced, and three more that only build a geometry nothing draws. Batch U4 removes them.
- `rules.json` `combat.flankingBonus` (value 0) has been reserved for a flanking rule since Milestone 5. `docs/units.md` prints it under a sync test. It stays until the user rules on flanking.
- `view.json` `board.maxCacheDimension` belongs to the frozen 2D renderer. It stays.

Fields that only retired rows carry (`orders.*.neutral`, `quests.*.system`, the endeavours' prerequisites), the `retired` change-log blocks of `mapgen.json` and `discoveries.json`, and fields that only a validator reads (`rules.census.renown`, `techs.abilities.*.byCard`, `malices.*.voice`) all stay.

### U4

The reachable-hex wash's leftovers are gone: 83 lines.

- `data/view3d.json` and `lookData.ts`: `overlay.reachableColor`, `reachableOpacity`, `reachableRimColor`, `reachableRimOpacity`, `reachableRimOuter`, `reachableRimWidth` and `look.saturation`.
- `board3d.ts`: the `reachRing` geometry, which was built and never drawn.
- `toon.ts`: `MaterialLibrary.setSaturation`, which only a test called, and the state only it used. `toon()` now passes the colour straight in. At the fixed factor of 1, `saturate` returned the same colour (`Math.round(c) & 0xff` on each channel), so nothing drawn changes.
- Two assertions went with the code: one checked only `reachRing`, one checked only `reachableColor`.
- `reachableScale` stays: it sizes the decal that the attack mark and the city-site chips draw.
- `BuildingId` now lists `viziersHall`, a live row it was missing. The type check needed nothing else.

Checks at the gate: type check clean, 11,093 core tests passed, build clean. Both pins match at all six turns. `test/sim/aiDigest.slow.test.ts` passes on both boards.

### S1

The bot's prices moved from `value.ts` to the new leaf `src/ai/prices.ts` (1,101 lines). `value.ts` went from 13,425 lines to 12,387.

- 42 declarations moved with their docblocks and memos: `VOICES`, `Voice`, `YieldBag`, the wager's lean, the prices (`delayDiscount`, `voiceWeight`, `hammerPrice`, `sciencePrice`, `faithPrice` and the rest), and `ratesOf`.
- `prices.ts` imports only the `ValueContext` type from `value.ts`. Each importer imports the prices from `prices.ts` directly; `value.ts` does not re-export them.
- Two checks proved the move exact: the agent's script, and an independent one that compares each top-level statement's code and docblock. All 446 statements of the old file are in the two new files, with none changed and none new.
- Registers updated: the `src/ai` file list in `aiBot.test.ts`, the readers of `newLuxuryBonus` in `aiWants.test.ts`, the banned imports in `spectatePage.test.ts`, and a new `['prices.ts', 'readCity']` row in `readings.test.ts` for `townProduction`.
- Where the audit was wrong: `weightWords` must be exported, because `value.ts` calls it, and the three spans hold 1,065 lines, not 1,112.
- Four moved docblocks still say "below" or "above" about code that stayed in `value.ts` (`prices.ts` lines 295, 456, 705 and 1086). Batch K2 fixes them.

Checks at the gate, with U4's files in place: type check clean, 11,093 core tests passed, build clean. Both pins match at all six turns. `test/sim/aiDigest.slow.test.ts` passes on both boards.

### S2

The scope's reach moved from `value.ts` to the new leaf `src/ai/scopeReach.ts` (694 lines). `value.ts` went from 12,387 lines to 11,749.

- 28 declarations moved: the 26 of "the scope, evaluated (batch X2)" (`townsAdmitting`, `realmTownsAdmitting`, `oneTownShare`, `capitalAdmits`, `workedHexesAdmitting`, `groundOfHexLine`, `wholeShareOf`, `hexPercentShareOf`, `scopeShare` and the rest, with their five memos), plus `townHolding` and `townHoldingOn`.
- `scopeReach.ts` imports the prices from `prices.ts` and only the `ValueContext` type from `value.ts`. It takes seven sim names from `statecraft/evaluator.ts` directly, not through the index, because the index adds bundler warnings about re-exports between chunks.
- Both checks proved the move exact. Against `value.ts` before S1, all 446 statements are in the three files (376, 42 and 28), with none changed and none new.
- Registers updated: the `src/ai` file list in `aiBot.test.ts`, the banned imports in `spectatePage.test.ts`, and the imports of two tests. One comment in `aiConfig.ts` now names `scopeReach.ts`.
- Three moved docblocks point the wrong way (`scopeReach.ts` lines 70, 127 and 226). Batch K2 fixes them with the four in `prices.ts`.

Checks at the gate: type check clean, 11,093 core tests passed, build clean. Both pins match at all six turns. `test/sim/aiDigest.slow.test.ts` passes on both boards.

### K1

Six repeats in the sim are merged. 82 lines fewer, and `test/fixtures/cardText.json` is unchanged.

1. **The city-cost rows.** `cardCityCostRows(state, city)` replaces `cardCityCostDelta`, `cardCityCostDiscount`, `cardCityCostValue` and `cardCityCostPercent`, and shares one walk with `cardProspectCityCost`. `explainAuthority` makes one call a town, not four.
2. **`cardUpgradeStrength`** sums `ruleFigures(…, 'value', unit.type)`.
3. **The levy readers.** `cardLevyShortestTurns(state, playerId, field)` replaces `cardLevyReturnDelay` and `cardLevyEvery`.
4. **The god and belief slots.** `cardPantheonSlots(state, playerId, pool?)` replaces `cardBeliefPoolSlots`.
5. **The `rulePercent` words.** Each `RULE_WORDS` entry takes the effect and builds its whole sentence. There were six patches, not the audit's three.
   - A probe described 3,306 made-up rows against the code before and after. 42 of them read differently: rows that set `range` on a rule other than `campMuster` and also name the rule's own noun. The old words dropped the noun, though the evaluator reads the noun and ignores `range` on those rules. The new words print it.
   - No data row and no test row has that shape, so no player sees a change.
6. **`levyLineError`** asks `citizenFocusError` for its first three refusals, which were the same words in the same order.

The `statecraft.ts` index lost `cardCityCostDelta`, `cardCityCostDiscount`, `cardCityCostPercent`, `cardCityCostValue` and `cardBeliefPoolSlots`, and gained `cardCityCostRows`. A comment in `statecraftData.ts` said that `poolSlotsFor` reads the holder of the holy city. It reads the seat that founded the religion, as DT19c ruled (reading 37), and the comment now says so.

Checks at the gate: type check clean, 11,093 core tests passed, build clean. Both pins match at all six turns. `test/sim/aiDigest.slow.test.ts` passes on both boards.

### K2

Eight repeats in the bot are merged. 93 lines fewer.

1. **One switch for the rule prices.** `ruleWorth(effect, ctx)` in `value.ts` holds one exhaustive `switch` over all 96 `CardFlagRuleId` values. It replaces the six deck functions that returned `number | null` and the Dominion `if` chain. The 44 rules that take the stand-in are named cases, so a new rule fails the type check until it has a price. A script compared every case's return with the old one: 96 labels, none repeated, no difference. The three `aiAppraisal.test.ts` tests that read `scoreEffect`'s case labels read the same 52 labels as before.
2. **The Doctrine ghost seat.** `ghostSeatUnderDoctrine(player, id, turn)` in `draft.ts` builds the ghost that `deckPair` (`value.ts`) and `ghostPair` (`cardImpact.ts`) each built by hand. The Order cases stay apart on purpose.
3. **The lists the bot copied.** The evaluator exports `CHAIR_READS_ONCE`, `GOD_READS_ONCE`, `GOVERNMENT_READ_NOT_AT_ALL`, `VOICES_AN_EMPIRE_BANKS` and a new row test, `isLineAbroadRow`. The bot reads them instead of its own copies. The sets were the same before the change.
4. **The walks that ask "does this test name X".** Two evaluator helpers, `scopeAsks` and `tileConditionAsks`, serve seven walks. The walks that also go into `beside`, or into `all` only, stay as they were.
5. **The context memos.** `onContext(memo, ctx, compute)` in `prices.ts` states the lifetime (one sitting) once. 35 of the 38 memos use it. The three that keep a guard value before they compute (`faithPrice`, `handRuleWorth`, `widerFitWorth`) stay hand-written.
6. **`foldOf`** is gone; its 34 calls name `foldTerms`.
7. **Docblocks.** The Commerce rules' docblock now heads their cases in the switch. Seven docblocks that moved in S1 and S2 now name `value.ts` where the code they mean is.

The `statecraft.ts` index gained eight names and lost none. The build has two fewer warnings.

Checks at the gate: type check clean, 11,093 core tests passed, build clean. Both pins match at all six turns. `test/sim/aiDigest.slow.test.ts` passes on both boards.

### S6

The evaluator's tail has 23 new section headings, so each run of readers sits under the seam that asks it: the Opus siege and interdict, the one-to-a-realm limit, behaviour rules and refusals, soldiers who turn sides by faith, rule figures, great-person works, the Opus and research rules, the gold a purchase may spend, draft offers, purchase riders, buildings and works a card opens, what the whole collection holds, buildings a town's faith or scope opens, verbs and units a card opens, belief slots and religious pressure, zone of control, renown, routes, amplifiers, chairs, flat-step amplifiers, founding a city, and the rules of Statecraft itself. "What a town holds" now covers only a town's buildings.

- No function moved, and no code line or docblock changed: the diff adds 23 heading lines and 23 blank lines and removes nothing.
- Left for a later move: seven single readers that sit under another seam's heading (`cardShoreRaids`, `cardChargePrice`, `cardSurplusCarrier`, `cardUpgradeStrength`, `cardRareWeight`, `cardBeadOccasions`, `cardProjectPays`), the chairs pair that splits the amplifiers in two, and five docblocks that sit away from their functions (`cardPantheonSlots`, `cardBorderZoc`, `cardRenownLines`, `cardUnlocksUnit`, `cardRouteYieldLines`).

Checks at the gate: type check clean, 11,093 core tests passed, build clean. Comments only, so the pins were not run.

### S4

The council left `src/sim/statecraft/draft.ts` for a new file, `src/sim/statecraft/council.ts`. The council is how many chairs a seat has and of which type, which card fits which chair, the slots, where a malice sits, and how the council is seated again after an adoption or a Doctrine.

- 35 declarations moved: the audit's 34, plus `ghostSeatUnderDoctrine` (K2), which only wraps `ghostCouncilUnderDoctrine`. A statement-by-statement compare against `54c0dc52` finds all 123 statements of the old `draft.ts` in the two files, with no code or docblock changed and no new `export`.
- `draft.ts` went from 3,531 to 2,550 lines, and `council.ts` has 1,031. `draft.ts` keeps the ladder, the pools, the offers, the rerolls and the governments.
- The index `statecraft.ts` has a fourth block, re-exported by name. The files that imported moved names straight from `draft.ts` (`evaluator.ts`, `describers.ts`, `commissions.ts`, `cardImpact.ts`, `src/ai/value.ts`) now import them from `council.ts`.
- The function-level cycle runs both ways with `draft.ts` and `evaluator.ts`. No top-level statement of either file, or of `council.ts`, reads a value from the cycle at load time, and `moduleCycles.test.ts` has a case where `council.ts` loads first.
- The registers point at the new file and assert the same facts: `slateRegister.test.ts` (six keys), `magisterialConstitution.test.ts`, `typedChairs.test.ts`, and `decks.test.ts`, which now reads both files.
- `CLAUDE.md` (Layout, and the cards trap) and `docs/README.md` now name four files. The user approved the `CLAUDE.md` change with the batch.

Checks at the gate: type check clean, 11,094 core tests passed, build clean with the same 158 cycle warnings, both pins unchanged at all six turns, digest test passed.

### S0 and S5

**S0.** A new core test, `test/sim/aiModuleCycles.test.ts`, does for `src/ai` what `moduleCycles.test.ts` does for the sim. It globs `src/ai/*.ts`, and for each module it resets the module registry, loads that module first, and then plays the first turn of two bot seats on a duel board with barbarians (`driveBots`, seed 4242). All 21 modules passed before S5, so no load-order fault was found. The file takes about 3 s on one fork, so it joined the core tier as it is.

**S5.** The bot's council and offer decisions left `src/ai/bot.ts` for a new file, `src/ai/council.ts`, and the naming helpers left it for `src/ai/decision.ts`.

- To `council.ts` (19): `slottingDecision`, `slotPairTerms`, `reslotDecision`, `moveToCountedChair`, `sealedThisTurn`, `adoptionTable`, `orderDecision`, `skipCandidate`, `doctrineDecision`, `beliefDecision`, `beliefRedeal`, `redealBag`, `discoveryDecision`, `pickCard`, `scoreCard`, `explainCard`, `cardName`, `decksOf`, `heldInDecks`.
- To `decision.ts` (7): `rankTerms`, `chosenAt`, `refused`, `unweighed`, `townSubject`, `itemName`, `unitLabel`. (`foldOf` was already gone, in K2.) `decision.ts` still imports nothing from `src/ai`.
- A statement compare against `68a7f084` finds every statement of the old `bot.ts` and `decision.ts` in the three files, with no code or docblock changed.
- `bot.ts` went from 9,618 to 8,631 lines. `council.ts` has 1,014 and `decision.ts` 300.
- The one new function-level cycle: `council.ts` calls `seatContext` in `bot.ts`, and `valueContext` in `bot.ts` calls `explainCard`. Both calls are inside functions, and S0's test loads each file first.
- Registers that point at the new file and assert the same facts: `aiBot.test.ts` (the file list), `magisterialConstitution.test.ts` (the bot's chair-fit reads, now also checking that `bot.ts` has none), `aiWants.test.ts` (the one file that asks `'rerollOffer'`), `magisterialDraft.test.ts` (the pass candidate's price), and `spectatePage.test.ts` (one more banned import). 13 test files import `scoreCard` or `explainCard` from the new file.

Checks at the gate: type check clean, 11,117 core tests passed (23 of them S0's), build clean with the same 158 cycle warnings, both pins unchanged at all six turns, digest test passed.

### The stale answers in the shadow run

The shadow run recomputes every remembered answer and fails if the two differ. It had failed 44 core tests since before this pass. None of them was a fault in the simulation, so no game decision changed.

- **41 were tests that edit the board by hand and announce it late or never.** A test that pushes a building, a faith, a Doctrine or a turn by hand must call `bumpRevision`, as the contract on `liveReading` says. Some never did. Others called `refreshCityDerived` first and bumped after it, so the refresh seated the citizens on the old law. Each now bumps after its edit, and before any refresh. One of the 41 was in `src/flairGallery/worksFixture.ts`, which only the gallery page and its test use.
- **3 were measurements that the shadow run doubles:** two in `readings.test.ts` and one in `resourceBonuses.test.ts`. Each turns the shadow off around the measurement only, and restores it in a `finally`. The assertions are unchanged.
- **The lint (`benches.test.ts`) missed them** because it checks whole files, and every one of those files called `bumpRevision` somewhere. It now also reads `test/sim/decks/`, and it has 17 more kinds of hand edit, each with lines it must catch and lines it must not. The wider lint found four more files that edit the board and ask the simulation without announcing (`war.test.ts`, `captureSheet.test.ts`, `decks/common.test.ts`, `decks/dominion.test.ts`). They now announce.
- **Left open:**
  - `test/render` is still outside the lint. Bringing it in would flag 13 files that edit the state by hand and do not announce.
  - A fault that cannot happen today: in `realiseItem` (`cities.ts`), `consecrateBuilding` writes `City.consecration` after the function's `bumpEconomy`, and `slateRegister.test.ts` has no row for that field. No consecration row in `data/religion.json` pays happiness or authority, so no answer can go stale now. It becomes a real fault the day one does.

Checks: type check clean, 11,117 core tests passed, build clean, both pins unchanged, digest test passed, and the core shadow run passed all 11,117 tests.

## Slow bot turns, 2026-11-13 (batch BPS)

The user: *"fix the slow bot turns please"* (`docs/flags.md`, "Slow bot turns first"). Branch `decks` at `a84b16f5`, schema 242, after bot batches BP1 and BP2. The rules of this pass still hold: a speed fix only, and the bots decide the same.

### Method

- The same game as the earlier probes: six seats with two decks each, standard map, barbarians on, seeds 999 and 42. The probe is a scratch script outside the repo, run with `vite-node`. It times each turn, each seat, each bot decision and each command, and it takes a CPU profile of turns 101 to 120 through `node:inspector`.
- The laptop's load changed a lot while this batch ran. Other work pushed the load average from 5 to over 40, and one game took three times as long in one hour as in another. So a time below is only compared with a time taken in the same minutes. The before and after figures come from one process that plays the same game on both trees, a turn on one and then the same turn on the other, so both see the same load. Commands, towns and units do not depend on the load, so those figures are exact.
- Two reference commits were played too: `5379853b`, the commit before BP1, and `f0c48fbb`, BP1 itself.

### Pins at `a84b16f5`

The pins at the top of this file are from `a207602a` and no longer apply: many batches since then moved them on purpose. These are the pins for this batch.

| Game | Turn 20 | Turn 40 | Turn 60 | Turn 80 | Turn 100 | Turn 120 |
|---|---|---|---|---|---|---|
| Two decks, seed 999 | `3f51010e:815245` | `828fd649:840149` | `3f9d417b:865264` | `f5ce3aa0:907099` | `221b097e:974889` | `3da1fb22:1062995` |
| Two decks, seed 42 | `13c84b0d:816820` | `7f8d775c:834115` | `03250d43:851358` | `76a0149d:873960` | `5395f68d:918415` | `54932900:975388` |

At turn 130 the two games are `088cfd2f:1112337` and `83d3c432:1011458`. `test/sim/aiDigest.slow.test.ts` pins duel `87a4f27f:348377` and standard `36c397f5:1062622`.

### What makes the late turns slow

**Mostly more work, not slower work.** Seed 999, turns 111 to 120, the commit before BP1 against this tree, run side by side with the profiler on:

| Measure | Before BP1 (`5379853b`) | This tree (`a84b16f5`) | Change |
|---|---:|---:|---:|
| Seconds a turn | 1.61 | 3.02 | +88% |
| Commands a turn | 80 | 138 | +73% |
| Towns | 44 | 61 | +39% |
| Units, barbarians' included | 332 | 413 | +24% |
| Milliseconds a command | 20.2 | 21.9 | +8% |

The three causes, one at a time:

1. **More commands.** BP1 is where they rose. In turns 111 to 120, seed 999 gives 80 commands a turn before BP1, 126 at BP1 and 138 on this tree. On seed 42 the rise is small: 69, 75 and 82. Most of the new commands are orders to pieces and towns:

   | Command, seed 999, turns 111 to 120, a turn | Before BP1 | This tree |
   |---|---:|---:|
   | `moveUnit` | 31.9 | 58.4 |
   | `setCityProduction` | 10.0 | 18.4 |
   | `buildImprovement` | 4.8 | 9.0 |
   | `setCitizenFocus` | 5.1 | 7.8 |
   | `attack` | 2.4 | 5.2 |
   | `proposeDeal` and `declineDeal` | 4.2 | 9.1 |
   | `buyRoute` | 0.7 | 3.5 |
   | everything else, `endTurn` included | 20.6 | 26.4 |

   One seat holds most of the rise. Seat 3 (zealot, Magisterial and Expansionist) gives 41 commands a turn and takes 0.96 s of the 3.0 s. Before BP1 it gave 11 and took 0.21 s.
2. **Bigger empires.** 61 towns against 44, and 413 units against 332. A seat's turn opens with readings of the whole empire (below), and those grow with the towns.
3. **Slower decisions for each command.** Only a little: 21.9 ms a command against 20.2. Each decision costs about what it did.

Why the bots hold more towns and give more orders after BP1 is a question about their play. This batch does not change it.

**Where the time goes on this tree.** Seed 999, turns 101 to 120, a profile of 58.9 s:

| Part of the turn | Time | Share |
|---|---:|---:|
| Bot decisions | 44.9 s | 76% |
| Of which `valueContext`, once a seat's turn: `wantBook` 11.3 s, `liveChains` 7.0 s, `nextTownChain` 1.1 s, `routeOutlook` 1.0 s | 20.6 s | 35% |
| Of which the beeline's first table in each seat's turn (`techGoalTable`); a later table costs about 1.2 ms | 8.7 s | 15% |
| Of which the other arms, on each decision | 15.6 s | 26% |
| The reducer | 11.3 s | 19% |
| Of which the end of the turn (`runEndOfTurn`) | 8.5 s | 14% |

**The largest single cost was the what-if fold.** `townFolds.with` folds a town with one more building, through `explainCity` with a candidate. The tech chains, the beeline's table and both banks price buildings this way. It took 12.4 s, 21% of the profile. Counted over the same turns:

- 397 folds with a candidate in a seat's turn, of which 338 were a pair of town and building asked for the first time. So a memo could not help, because the pairs are distinct.
- Timed step by step, a fold with a candidate spent 41% of its time in steps 3 to 7 (the cards' town lines, the seams, the specialists, the routes, the palace) and 34% in steps 1 and 2 (the centre and the worked hexes).
- Steps 3 to 7 never read the candidate. Steps 1 and 2 read it only through `cityContext`, and 93% of pairs had a candidate that cannot change the ground.

So most of each fold walked again what the town's plain reading (`readCity`) already held.

By itself, no function held more than 3.5% of the profile: `explainCity` 3.5%, its line builder `say` 2.9%, `cityLocalEffects` 2.6%, `tileConditionHolds` 1.9%, `liveReading` 1.8%, `searchPath` 1.6%. The cost is in how often the folds run, not in one slow loop.

### The fix

A fold with a candidate copies, from the town's plain reading, every part that the candidate cannot change. It walks only the rest.

- **`explainCity` (`src/sim/yields/town.ts`)** takes a fifth parameter, `standing`: the town's plain reading at the same moment. When a caller passes it with a candidate, `explainCity` copies:
  - the lines of steps 3 to 7, always;
  - the lines of steps 1 and 2, when `candidateReachesGround` says no;
  - the lines of step 9, when no card's share on buildings reaches the candidate (`sharesReachCandidate`);
  - the percentages, when both readings were handed the same `empire` object.

  Steps 8 and 10 are always worked out. The copied lines are the same objects, in the same order, so the list and its fold are what a full walk gives. `copySteps` and `sharesReachCandidate` are two small helpers beside it. With no `standing`, or no candidate, nothing changes.
- **`candidateReachesGround` (`src/sim/yields/hex.ts`)** is the test for steps 1 and 2. It asks the three places where `cityContext` reads a candidate: whether the candidate's row puts a tile line on the ground, whether it waters fields, and whether a card's hex line counted by the town is live (`cardCountsTownGround`). It asks the candidate's row and never the town, so it reads no town's buildings. That costs a cautious "yes" for a candidate the town already holds and for a second source of water, which only means that the hexes are walked: 92.8% of pairs still copy the ground, against 93.3% for a test that asked the town.
- **`rowTileLines` and `buildingIrrigates` (`src/sim/buildingEffects.ts`)** are the two row facts it asks. `buildingTileLines` and `buildingsIrrigate` now ask them for each row, so each fact is still worked out in one place, and their answers are the same.
- **`cardCountsTownGround` (`src/sim/statecraft/evaluator.ts`)** answers the third question. It keeps its answer against the live list of effects, which is rebuilt whenever the law changes and never written after.
- **`townFolds.with` (`src/ai/townFolds.ts`)** passes `readCity(state, city)` as `standing`. It asks `readCity` at the moment of the fold and not the grid's own `quoteOf`, because a chain's copy can keep a grid after the economy clock moves. While the clock stands still, it is the same memo.

**Why no decision can change.** Each copied part is a function of inputs that the candidate does not reach. That is what the parameter's docblock argues, part by part. Three checks prove it:

- A scratch check folded every building row in every town of both games, at turns 30, 60, 90 and 110: 30,750 pairs. With and without `standing`, the readings and the folds were the same, byte for byte. It was run again on the final code, with the same result.
- `test/sim/whatIfCopy.test.ts` (new, core) does the same on a played duel, and again after a seat slots The Bourse and after it takes The Hydraulic Empire, which reach step 9 and the ground. It also checks that a "no" from `candidateReachesGround` means the same context. Each of three broken versions of the code failed it: a ground test that always says no, one that skips the counted rows, and a share test that always says no.
- Both pins match at all six turns and at turn 130, and the digest test passes on both boards.

### Before and after

One process plays the same game on both trees, a turn on `a84b16f5` and then the same turn on this batch's tree, in turns to 130. Wall seconds a turn, and CPU seconds a turn in brackets (CPU time counts the garbage collector's threads too, so early turns read higher than the wall). The load rose again from about turn 100 of seed 999, so the late seconds there are high for both trees; read the change.

| Turns | Seed 999 before | Seed 999 after | Change | Seed 42 before | Seed 42 after | Change |
|---|---:|---:|---:|---:|---:|---:|
| 1 to 10 | 0.19 (0.35) | 0.18 (0.33) | −7% (−6%) | 0.19 (0.36) | 0.19 (0.36) | −1% (0%) |
| 11 to 20 | 0.27 (0.38) | 0.31 (0.37) | +15% (−4%) | 0.28 (0.35) | 0.27 (0.32) | −4% (−8%) |
| 21 to 30 | 0.33 (0.47) | 0.31 (0.44) | −6% (−5%) | 0.31 (0.40) | 0.30 (0.39) | −2% (−3%) |
| 31 to 40 | 0.40 (0.54) | 0.40 (0.53) | +1% (−2%) | 0.40 (0.53) | 0.36 (0.47) | −11% (−11%) |
| 41 to 50 | 0.53 (0.65) | 0.47 (0.61) | −12% (−6%) | 0.45 (0.59) | 0.47 (0.61) | +6% (+3%) |
| 51 to 60 | 0.62 (0.76) | 0.57 (0.69) | −8% (−9%) | 0.50 (0.63) | 0.46 (0.60) | −8% (−4%) |
| 61 to 70 | 0.97 (1.15) | 0.74 (0.99) | −24% (−14%) | 0.57 (0.74) | 0.52 (0.68) | −8% (−7%) |
| 71 to 80 | 1.14 (1.61) | 1.04 (1.46) | −8% (−9%) | 0.89 (1.11) | 0.66 (0.90) | −26% (−19%) |
| 81 to 90 | 2.50 (2.58) | 2.20 (2.09) | −12% (−19%) | 1.05 (1.29) | 0.97 (1.19) | −7% (−8%) |
| 91 to 100 | 2.57 (2.75) | 2.07 (2.28) | −19% (−17%) | 2.22 (2.25) | 1.97 (2.00) | −11% (−11%) |
| 101 to 110 | 5.88 (5.50) | 5.57 (4.65) | −5% (−15%) | 1.90 (2.13) | 1.66 (1.78) | −13% (−17%) |
| 111 to 120 | 6.89 (6.27) | 5.55 (4.98) | −20% (−21%) | 4.40 (3.64) | 3.66 (3.16) | −17% (−13%) |
| 121 to 130 | 7.88 (7.71) | 6.53 (6.45) | −17% (−16%) | 4.52 (4.37) | 3.94 (3.91) | −13% (−10%) |
| Whole game | 301.6 s (307.1 s) | 259.2 s (258.7 s) | −14% (−16%) | 176.8 s (183.8 s) | 154.4 s (163.7 s) | −13% (−11%) |

- **The late turns cost about 15% less on both seeds.** In CPU time, turns 91 to 130 fall by 15% to 21% on seed 999 and by 10% to 17% on seed 42.
- **A second round, under a heavier load** (the laptop was swapping), agrees: CPU time for the whole game falls by 13% on seed 999 and by 12% on seed 42, and turns 91 to 130 fall by 10% to 24%.
- **Commands, towns and digests are the same** on both trees in every band, as they must be.
- These runs were taken before the register fix (see Checks), which makes the ground test ask the candidate's row. That walks the hexes for 0.5% more pairs, which is too small to move these figures, so they were not taken again.
- **The what-if fold itself**, in profiles of turns 101 to 120 of seed 999 taken side by side: `townFolds.with` fell from 12.4 s to 4.4 s with steps 1 to 7 copied (a quiet pair), and from 24.7 s to 5.4 s with step 9 and the percentages copied too (a pair taken under a heavy load, so only its ratio counts).

### What this batch measured and did not fix

These are not done. Each is a question or a small saving.

- **More commands and bigger empires (the main cause).** The late turn is about twice what it was before BP1 because the bots give 73% more commands and hold 39% more towns (seed 999). The rise is in BP1, and most of it is in seat 3. That is the bots' play, so it is a question for BP3 or for the user, not a speed fix.
- **Town readings after each clock move.** A seat's turn takes about 142 plain town readings, against about 10 towns a seat, because the economy clock moves on 56% of commands (1,352 of 2,414 in turns 101 to 120 of seed 999, all of `setCityProduction`, `buildImprovement`, `attack` and `setCitizenFocus`). Each move throws away every town's reading. P2 measured a per-town clock for `setCityProduction` at 2.7% and did not build it. That still holds.
- **The deck margin.** `readDeckMargin` builds two ghost readings of the empire for each engine card, 2.3 times in a seat's turn, at 9.4 ms each. In 54 of 275 cases it repeats one already read on the same clock in another context of the same turn. A memo would save about 1%.
- **The purchase gate in `reachOf` (`wants.ts`).** The want book asks `explainPurchaseCost` and then `purchaseGate`, which prices the purchase again when every earlier clause passes. Most rows are refused before that, so the second price costs 0.13 s of the profile. Not worth a change.
- **The end of the turn.** 14% of a late turn, with no part above 3.5%: `collectYields`, the barbarians' raid, `spendLeftoverMovement`, the wager readings, the deck tally.
- **Two other folds with a candidate** in the bot do not pass `standing` yet: `frontRowWorth` (`bot.ts`) and `explainRelic` (`wants.ts`). Together they cost about 0.1 s in the profile.

### Checks

- Type check clean (`npx tsc --noEmit -p .`).
- The register of readers in `test/sim/decks/expansionistCura.test.ts` (Expansionist batch E12) failed at the first gate. A first version of `candidateReachesGround` read the town's shelf itself: it asked `townShelf`, read `shelf.buildings` twice and handed `buildingsIrrigate` a one-row list that was not what the town holds. The register allows a read of a town's buildings only where the question is what was built, and asks every reading of a building's effect to be handed what the town holds. The test now asks only the candidate's row (above), so the register needed no new row and kept every pin. It passes.
- Every test file that reads the source of the simulation or the bot (75 files under `test/sim` and `test/mapgen`, 3,358 tests; and 26 files under `test/ui` and `test/render`, 863 tests): passed.
- 24 narrow test files, 1,361 tests, all passed: the new `whatIfCopy.test.ts`, the yield registers (`yieldsDocSync`, `yieldOrder`, `readings`, `verbs`, `slateRegister`, `stepSeen`, `benches`), the load-order tests (`moduleCycles`, `aiModuleCycles`), and the bot and yield files that fold a town (`aiBot`, `aiWants`, `aiAppraisal`, `aiSittingMemos`, `aiExpansionist`, `aiCommerce`, `aiScientific`, `exactYields`, `buildingPackage`, `cities`, `cardImpact`, `greatPeople`, `charters`, `statecraft`).
- The shadow check (`test/vitest.shadow.config.ts`) on `whatIfCopy`, `readings` and `aiSittingMemos`: passed.
- `test/sim/aiDigest.slow.test.ts`: passed on both boards.
- Both two-deck games: the same digests at turns 20 to 120 and at turn 130, on every run of this batch.
- The core tier, the build and the slow tier were not run. They are the orchestrator's gate.

## Bot batch BP3: a card's stamp is its pay now, 2026-11-13

The ruling is `docs/flags.md` (ooooooo), B8, with B3 and B4 under it: where the sim can stamp a card on a copy of the seat's state (`explainCardImpact`), the bot takes that figure as the card's pay now, and keeps its own readings only for what a stamp cannot see. This batch changes the bots' decisions on purpose, so the pins move. No rule of the game changed. Branch `decks` at `9e5e0b44`.

### What the bot reads now

- **The stamp's two boards.** `cardImpactWorlds` (`src/sim/cardImpact.ts`) hands out the pair `explainCardImpact` diffs: the card in the first empty chair that fits it, or in a chair added at the end, and never in the chair of a card it would push out (fault B4). A seated card is read with its chair emptied.
- **The books on both boards.** `explainCardStamp` (`src/ai/value.ts`) reads the six voices of the empire's headline (`readEmpire`), renown a turn and the two meters on each board, weighs the difference at the seat's prices, and adds the hammer premium. The books used to be `foldEmpireRates` plus the cards' empire lines staged apart, which parted from the stamp by a floor; the headline is the sum the stamp folds, so the two now agree to the last digit.
- **What a stamp cannot see.** `explainBeyondStamp` prices, effect by effect: the promise half of an effect the books show (the walk less the same walk on `todayContext`, a context with no tech chains and `ValueContext.today` set), and the whole walk of an effect the books cannot show (riders, combat lines, rules of play, unlocks). `stampSight` is the classification, an exhaustive switch, so a new shape stops the build until it is classed. Seven shapes split their own way (`ownBeyond`).
- **Where the stamp is read.** A decision about one card is stamped: an Order, Doctrine or pantheon offer, the pantheon's free redeal, a chair to fill, a better arrangement, a new government's chairs. An estimate over a whole pool is walked as before: the draft plan's best card and the pass's rung of pity (`CardReading`). A card the walk cannot read at all (`hasFoldReadEngine`) is stamped in both, as `deckMargin` stamped it before. Boons, charters, met commissions, governments and follower or enhancer beliefs are walked.
- **The memo.** One reading of a card's two boards is kept on the slate's economy clock (`botCardStamp`), and the real board's books beside it (`botBooks`). Both boards are `state` or a shallow copy of it with one seat's council, pantheon or Doctrines changed, so a reading is a function of what `state` holds, and every write to that moves the economy clock. The shadow run (`test/vitest.shadow.config.ts`) passed on `aiCardStamp`, `aiSittingMemos`, `aiWants`, `aiBot`, `aiMagisterial` and `readings`.
- **The arrangement is looked at once a seal's length.** `reslotDecision` looks for a swap on one turn in five (the seal), a different turn for each seat (`isReseatTurn`). A chair no bench card fits is not priced. Empty chairs and a chair that counts twice are still filled on any turn.

### What it costs

Measured on the six-seat two-deck game, seeds 999 and 42, turns 101 to 120. A CPU profile of each tree gives the share of a late turn spent in the books of a card's two boards (`deckReading`); on the earlier tree that is the engine margin (`deckMargin`).

| Seed | Before (`9e5e0b44`) | This batch | Of which: re-seat, chair fill, offers, new council, draft plan |
|---|---:|---:|---|
| 999 | 5.6% | 16.1% | 5.0%, 4.0%, 1.6%, 1.1%, 4.4% |
| 42 | 2.1% | 11.4% | 3.9%, 2.6%, 2.4%, 0.8%, 1.8% |

So the batch adds about a tenth of a late turn. The rest of the change in seconds a turn is play: the bots now give about a quarter more commands late and field more units (seed 999 at turn 120: 390 units against 321).

| Turns 100 to 120 | Seed 999 before | Seed 999 after | Seed 42 before | Seed 42 after |
|---|---:|---:|---:|---:|
| Wall seconds a turn | 1.82 | 2.39 | 1.10 | 1.63 |
| CPU seconds a turn | 2.05 | 2.65 | 1.25 | 1.85 |
| Commands a turn | 126 | 159 | 71 | 100 |

The two trees were played in one process, a turn on each in turn, so both saw the same load. The machine was loaded by other runs, so read the change, not the figure.

Two designs were measured and dropped:

- **A stamp for every card on every decision.** The draft plan alone prices the whole shelf, forty or more cards a seat, and a stamp costs 3 to 35 ms at turn 100. That was 4.4 s a turn for seed 999 at turn 100, more than the whole turn.
- **Stamps in every chair arm, every turn.** Seed 999, turns 111 to 120: 1.25 s a turn became 3.52 s. The re-seat arm stamped every held card each turn, 30 to 50 stamps for a seat of 19 towns, at about 20 ms each.

### Pins at BP3

| Game | Turn 20 | Turn 40 | Turn 60 | Turn 80 | Turn 100 | Turn 120 |
|---|---|---|---|---|---|---|
| Two decks, seed 999 | `3f51010e:815245` | `0ff7b045:839485` | `96af7c06:864179` | `4b0a867a:922428` | `9cf5d91c:988430` | `1ff9ccb6:1076099` |
| Two decks, seed 42 | `13c84b0d:816820` | `471755fd:833668` | `6b57650d:855656` | `ac4db8a1:887694` | `5f52146b:946936` | `de277fa3:1012049` |

At turn 130 the two games are `92c372b2:1097639` and `b64a3718:1065413`. `test/sim/aiDigest.slow.test.ts` pins duel `8daf613b:326673` and standard `35a1f543:1051740`. Before the batch, the untouched tree gave the BPS pins above at every turn and both digest pins.

### What this batch measured and did not fix

These are not done.

- **A count of the empire's own yield, asked in every town.** Bills of Exchange counts the empire's gold a turn (`count: 'empireYield'`) on a line each town reads, and each ask folds the whole empire again (`countOf`), so a reading of that seat costs the square of its towns. It slows that seat's stamps about four times. A memo scoped to one pure reading of the empire would remove it; that is a change in the sim's readings, so it is left for a speed batch.
- **The re-seat arm and the chair fill are most of the cost** (about 9% of a late turn on seed 999). Looking once in two seals' lengths would halve the re-seat part; seating by the walk would remove it and part the seat logic from the draft.
- **The pool estimates still walk.** The culture price (the draft plan's best card) and the pass still read percentages at the nominal helping (fault B3).
- **The growth of a counted percentage** is priced at the nominal helping, as before.
- **Follower and enhancer beliefs and governments are not stamped.** The first is fault B7 (bot batch BP5); a government's stamp is the whole adoption, which `adoptionTable` prices as two terms.

### Checks

- `test/sim/aiCardStamp.test.ts` (new, core): the bot's stamp equals the sim's stamp for every card on offer on a played board; a stamped card is its stamp and what the books cannot show; an engine in a full council takes a chair of its own; a Boon, a charter, a government and a follower belief are walked; a stamp is re-read after a write.
- `test/sim/aiCardStamp.slow.test.ts` (new, slow): the digest's six seats on the duel board, all six decks, positions at turns 40, 80 and 120. It checks that the bot's stamp equals `explainCardImpact`'s fold for every card it stamps; that a card of lines the books show, with no promise, is priced at its stamp; that each effect read as unseen, lent alone to its card's row, leaves the books where they were; and that each shape read as on the books moves them on some card. Each of three broken versions failed it: percentages read as unseen (check 3), combat lines read as on the books (check 4), and the books read without the happiness meter (check 1).
- A scratch run of the same checks on eleven more positions (both seeds, both trees, turns 40 to 120): 9,000 stamps, no difference from the sim's stamp, no unseen effect with a footprint.

## Bot batch BP4: riders at full value, and rates from the seat's war plans, 2026-11-13

The ruling is `docs/flags.md` (ooooooo), B2: riders are priced at full value times the rate, with the seat's own recent rates. The user added: *"the bonuses towards killing should probably factor in the bot's inclination to go to war"*. The fault and its evidence are fault 2 of `docs/audit/bot-pass-3-card-values.md`. This batch changes the bots' decisions on purpose, so the pins move. No rule of the game changed. Branch `decks` at `d782ae32`.

### What the bot reads now

- **One firing at full value, times the rate** (`scoreWindfallRider`, `value.ts`). The grant no longer goes through the lump exchange, which priced every rider at a twentieth of its pay. `windfallGrantWorth` returns a firing in two parts: what it pays in full (`once`), and the stand-ins (`flat`), which keep their figure. A grant that lasts (a mark, a hex claimed, a town turned) is a reading a turn, so its full value is that reading times `score.lumpTurns`. The founding rider, The Planted Towns, a raid's plunder and a hex bought read the same way. A single firing set beside a rate (the pass in a draft, a hex bought) still takes the exchange.
- **The war moments read the seat's war plans and its fighting** (`ValueContext.warOutlook`, built once a context by `warOutlook` in `bot.ts`, on the revision clock). The plans: at war or not, the seat's largest lean toward a war (`declarationLean`, with its own sheet), and the soldiers spare of its garrisons (`strikeForce`). The fighting: the war-loss list the game keeps for weariness (`Player.warLosses`), over the last 20 turns. A kill is the wild at the seat's own record, plus the intent times the kill pace at war. A capture is the intent times the town pace at war. A death is the seat's own record, or its recent losses when higher. A raid is the seat's own record of hexes pillaged, which is nothing for a bot, because the bot gives no pillage order. None of these reads the threat any more.
- **The narrowings on a rider**: a kill of the wild (`vsBarbarians`), a rider for one kind of piece (`class`, Letters of Marque's ships), and a once-a-turn limit (`oncePerTurn`, `oncePerTurns`).
- **A building finished** reads the recent window too, off the towns' age stamps, leaving out a founding gift and what a town held before it was taken.
- **New knobs** in `data/ai.json`: `score.recentTurns` (20), `score.warPace.killsPerSoldier` (0.02), `score.warPace.leanShare` (0.25), `score.warPace.townsPerKill` (0.02). Each has a row in `data/ai.bounds.json`, and the arena panel shows them with no page edit. `docs/bot-priorities.md` has the readings in full.
- **A seat that falls during its own turn** (`driver.ts`, `stepper.ts`). The new play met one: seat 1 of the six-seat duel lost its last piece in one of its own commands on turn 115, and both bot loops then sent an End Turn the reducer refused three times. Both loops now end such a seat quietly. No state changes, because the refused End Turns changed nothing.

### The rates, against the real pace

Six seats, two decks each, standard map, seeds 999 and 42. At every tenth turn from 30 to 120, the bot's rate for each moment is read through a rider that pays one gold, and set against the real count over the next 20 turns. The real counts are diffs of the seat's records (kills, losses, captures, technologies, units gained) and of each town's citizens and buildings.

| Moment, a turn | Before | After | Real |
|---|---:|---:|---:|
| A kill | 0.10 | 0.41 | 0.46 |
| A kill, for a seat at war (35 samples) | 0.10 | 0.80 | 0.72 |
| A death | 0.05 | 0.17 | 0.27 |
| A building finished | 0.23 | 0.55 | 0.85 |
| A capture, for a seat at war | the threat over 60 turns | 0.012 | 0.011 |

That is 120 samples of a seat at a turn, over both seeds, played on this batch's tree. The warmonger of seed 999 reads 1.20 kills a turn against 1.36 real. The whole-game records still read low late for growth (0.42 of real), units gained (0.49) and technologies (0.80), because an empire grows past its average. The game keeps no recent record of those three.

### What it costs

The war outlook costs about 0.7 ms a seat to read on a turn-100 board, once a context, against more than a second for the whole context. The rider readings are memos on the context. So the code's own cost is too small to measure in a turn; the change in seconds a turn is play.

| Turns 100 to 120 | Seed 999 before | Seed 999 after | Seed 42 before | Seed 42 after |
|---|---:|---:|---:|---:|
| Wall seconds a turn | 4.52 | 5.16 | 2.84 | 2.22 |
| CPU seconds a turn | 4.28 | 4.60 | 2.77 | 2.34 |
| Commands a turn | 159 | 173 | 100 | 96 |

The two trees were played in one process, a turn on each in turn, and the two seeds ran at once, so the load was high: read the change, not the figure. Turns 121 to 130 of seed 999 cost 9.47 s a turn after against 4.21 s before, with fewer commands (172 against 194). A profile of turns 112 to 130 on each tree, timing every decision, puts the rise in the council's decisions (`draft`), which BP3's stamps price: 124 of them against 100, and each costs about what it did beside a piece's order. The seats draft more, because they make more culture, and hold more cards: at turn 120, seat 5 holds 31 Orders in 11 chairs against 20 in 8.

### Turn 100, over six seeds

The same game to turn 100 on seeds 1, 7, 42, 999, 2026 and 31337, totals over the six seats:

| | Towns | Units | Food | Production | Gold | Science | Culture | Faith |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Before | 267 | 1,272 | 6,679 | 6,736 | 2,481 | 4,585 | 2,723 | 974 |
| After | 261 | 1,383 | 6,957 | 5,975 | 2,082 | 4,264 | 2,747 | 925 |
| Change | −2% | +9% | +4% | −11% | −16% | −7% | +1% | −5% |

The spread between seeds is wide: production rose 17% and 33% on seeds 1 and 7 and fell 23%, 30% and 40% on seeds 999, 42 and 31337. More seats adopt the War Chief at the fourth tier: its two kill riders now read 50 to 100 points, against a whole signature of 20 to 60 for the Council of Elders (seed 42, turn 40). On seed 42 at turn 60, four seats hold the War Chief after, against two before.

### Pins at BP4

| Game | Turn 20 | Turn 40 | Turn 60 | Turn 80 | Turn 100 | Turn 120 |
|---|---|---|---|---|---|---|
| Two decks, seed 999 | `3f51010e:815245` | `48374022:839086` | `db7e2b96:868721` | `4804348c:906474` | `12790131:982357` | `966a3b88:1058596` |
| Two decks, seed 42 | `8d45741a:817019` | `4d044c5c:833336` | `1f335fce:852101` | `64dfeff7:879537` | `71956417:925065` | `30f52932:982685` |

At turn 130 the two games are `aeac812d:1115767` and `203cd835:1020266`. `test/sim/aiDigest.slow.test.ts` pins duel `2d4e0b89:352098` and standard `a098571d:1017275`. Before the batch, the untouched tree gave the BP3 pins above at every turn, at turn 130, and both digest pins.

### What this batch measured and did not fix

These are not done.

- **The same fault in three rules.** `growthCarryover` and the `tilePurchase` rule (`ruleRewriteValue`) and The Wildwood Compact's saved charges (`tendedWorksFreeWorth`) price a rate times a lump through the exchange, as the riders did. They are rules, not riders, so they were left.
- **A grant scaled by the fallen piece's strength** (`fromOccasion: 'strength'`: The Bards' Praise, Songs of the Fallen, Rites of Blood) is read at its bare amount, because the bot forecasts no strength for a kill or a death. Code reading, not measured.
- **Growth, units gained and technologies** read at half to four fifths of their real pace (the table above). The game keeps no recent record of them.
- **A great person gained or acting** is still read at one in `score.lumpTurns` turns (0.05), against 0.08 to 0.14 real late (seed 999 and 42, turns 80 to 120).
- **The stand-ins** in a grant (a heal, a pressure lump on a moment the bot does not read) keep their old figure for each firing.
- **The economy at turn 100** moved down a little on average and widely by seed (above). Whether that is weaker play or the spread of six games needs more seeds.
- **The late council decisions** cost more because the seats hold more cards (above). Looking at the arrangement less often, which BP3 already noted, would help.
- **A seat that falls during its own turn as the last seat to act** would leave the turn unresolved: elimination marks its turn ended, but only an End Turn resolves the world. Code reading; no game met it.

### Checks

- Type check clean (`npx tsc --noEmit -p .`).
- `test/sim/aiRiderRates.test.ts` (new, core): a kill reads the wild at the seat's record and rivals at its army's pace times its intent; a seat that will not go to war reads near the wild's half alone, and its army fights once it is attacked; the recent fighting is read off the war losses inside the window only; a capture follows the kills at war and reads no threat; a death reads the record or the recent losses; a ship's rider reads nothing with no ship; the once-a-turn limits cap the rate; a building's pace leaves out a founding gift and a taken town's past.
- `test/sim/aiDriverEliminated.test.ts`: a new case for a seat that falls during its own turn, in both loops. It failed with the two guards taken out.
- The rider tests that priced a firing through the lump exchange now price it in full: `aiAppraisal`, `aiCommerce`, `aiCommissions` (Harry the Border now reads the seat's record of raids), `aiDevotion`, `aiExpansionist`, `aiMagisterial`, `aiPrices` (The Martyr's Crown now reads the seat's record of losses) and `aiScientific`. `aiBounds` lists the new whole-number knob.
- Every core test that reads the source of a changed file or prices a rider: 164 files.
- The slow tier, by name: `aiDigest` (the pins above), `aiCardStamp`, `aiBot`, `aiDecision`, `aiDriver`, `aiGarrison`, `aiWants`, `aiWar`, `beads`, `cityModifiers` and `botWorker` passed. `botWorker` moves to seed 26: on seed 30 the bots no longer call a great person in sixty turns, though the page and the worker still played it to the same log and the same digests.
- The shadow check (`test/vitest.shadow.config.ts`) passed on `aiRiderRates`, `aiSittingMemos`, `aiDriverEliminated` and `readings`. It fails on `aiWar.test.ts` at `botThreatWeights` on the untouched tree too: that test writes `state.wars` without announcing it. Not this batch's.
- The core tier, the build and the whole slow tier were not run. They are the orchestrator's gate.

## Bot batch BP5: rites in their own town, and beliefs in the towns their faith can expect to hold, 2026-11-14

The rulings are `docs/flags.md` (ooooooo), B6 ("as the audit proposes") and B7, with the user's addition: *"make sure that bot's price the potential across all cities when making a selection (the first religious pick will always be zero because there are no followers)"*. The faults and their evidence are faults 6 and 7 of `docs/audit/bot-pass-3-card-values.md`. This batch changes the bots' decisions on purpose, so the pins move. No rule of the game changed. Branch `decks` at `44fe4165`.

### What the bot reads now

- **A rite is priced in its own town** (B6). `explainEffects` hands its `town` to the hex walk (`workedHexesAdmitting`, `groundOfHexLine`, `wholeShareOf`, `hexPercentShareOf`, `scopeNote`, in `scopeReach.ts`) and to `scoreRulePercent`. With no town named, a context priced for one town reads its share of the realm, the mean town.
- **A share of the food surplus reads the surplus** (B6, `growthShareWorth`, `value.ts`). Each town is the growth channel read with the share and without it. `channelSurplus` (`src/sim/cities.ts`) takes an optional extra percentage for this; it is nought for every rule of the game, so nothing in the sim changes.
- **The towns a faith can expect to hold** (B7, `faithTowns`): every town at a first pick (no religion yet, or a religion with no follower belief yet); at a later pick, the towns that follow the religion and the towns that follow none.
- **A belief at a choice** (B7, `explainBeliefChoice`): a follower belief is the walk of its lines as they read in a following town, times the share of the expected towns; an enhancer belief is the walk on a context (`ValueContext.faithChoice`) where a count of following towns also counts the expected towns. The founding's hands, the next rung and The Seven Councils' room read it.
- **At a decision** a founder's follower and enhancer beliefs are stamped (B8's ruling). The sim's stamp pays a follower belief only in the towns that follow now. What it cannot see, the expected towns that do not follow yet, is the bot's reading (`explainBeliefBeyond`).
- `docs/bot-priorities.md` has the readings in full. No new knob.

### The prices, on a recorded board

Seed 42 at turn 100 (BP4's snapshot), the median over every town of the bot's price a turn against the sim's rite preview in the same town, at the seat's prices:

| Rite | Before | After | Preview |
|---|---:|---:|---:|
| Rite of the Harvest | 294 | 35 | 28 |
| Rite of Plenty | 341 | 48 | 48 |
| Consecration of the Bounds | 53 | 7 | 5 |
| Rite of Fasting | −1,235 | +79 | +121 |

The preview cannot see the growth the Fast stops, so the bot reads less than the preview there. On the same board two seats have just founded, with no town following yet. Lines asked of following towns now read every town at a first pick: Feast Days reads 472 against 36 before, Pilgrimage 207 against 0, and Congregation and Pilgrims' Coin, which count following towns, 126 and 336 against 0.

### What it costs

A belief's stamp costs about 3 to 4 ms on a turn-100 board (33 beliefs in 96 to 143 ms, against 5 to 7 ms walked). A belief offer with a free redeal stamps its hand and the bag, about 20 beliefs, a few times a seat in a game. The rite and growth readings are memos on the context, or one town's walk.

| Turns 100 to 120 | Seed 999 before | Seed 999 after | Seed 42 before | Seed 42 after |
|---|---:|---:|---:|---:|
| Wall seconds a turn | 3.61 | 2.72 | 2.27 | 2.51 |
| CPU seconds a turn | 3.86 | 2.93 | 2.39 | 2.74 |
| Commands a turn | 173 | 146 | 96 | 128 |
| Milliseconds a command | 20.9 | 18.6 | 23.7 | 19.7 |

The two trees were played in one process, a turn on each in turn, with the two seeds at once. The cost of a command fell on both seeds, so the change in seconds a turn is play: seed 999 gives fewer commands late and seed 42 more.

### Turn 100, over six seeds

The same game to turn 100 on seeds 1, 7, 42, 999, 2026 and 31337, totals over the six seats:

| | Towns | Units | Food | Production | Gold | Science | Culture | Faith |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Before | 261 | 1,383 | 6,957 | 5,973 | 2,083 | 4,266 | 2,748 | 925 |
| After | 270 | 1,315 | 6,583 | 6,601 | 2,118 | 4,194 | 2,317 | 1,058 |
| Change | +3% | −5% | −5% | +11% | +2% | −2% | −16% | +14% |

The spread between seeds is wide. Culture fell 56% on seed 999 (922 to 410), which is more than the whole fall; it rose on seeds 2026 (+68%), 31337 (+18%) and 42 (+11%). Production rose on four seeds. Religions founded by turn 100 are 18 before and 18 after, at a mean turn of 82 against 85. The first founding of each game is at a mean turn of 77 against 76: earlier on three seeds and later on three. Seed 42 founds none by turn 100 after (two before, at turns 97 and 100), and three by turn 120 in both trees. The follower beliefs chosen move toward the lines asked of following towns (Feast Days, Cathedrals of the Sky, Lamps of the Shrine), which read nothing at a first pick before.

### Pins at BP5

| Game | Turn 20 | Turn 40 | Turn 60 | Turn 80 | Turn 100 | Turn 120 |
|---|---|---|---|---|---|---|
| Two decks, seed 999 | `3f51010e:815245` | `b1aef284:839032` | `8566c623:869521` | `4275e141:909089` | `3645c8f2:973247` | `fb89d2b0:1044013` |
| Two decks, seed 42 | `29590316:816994` | `81cae172:833771` | `f7ffb892:855631` | `5d8b7a10:887624` | `ee21e4a7:932357` | `2c8f93a6:1023751` |

At turn 130 the two games are `2a57c839:1086027` and `9cac3410:1044566`. `test/sim/aiDigest.slow.test.ts` pins duel `ee0c50f4:344556` and standard `a3ad5cdc:1030926`. Before the batch, the untouched tree gave the BP4 pins above at every turn, at turn 130, and both digest pins.

### What this batch measured and did not fix

These are not done.

- **The Rite of the Sabbath** reads −102 a turn against +29 in the preview (seed 42, turn 100, median). It is priced in its town already; the bot weighs a hammer above a point of culture (`sabbathWorth`). That is a weight, not the town.
- **A building's growth row** (the Aqueduct, The Hanging Gardens) reads the realm's surplus now, but still over the realm and not over its own town: the older over-read `explainWrittenEffects` names.
- **One more devout town** (`readDevoutTown`, `followerLinesInOneTown`) still reads a held Pilgrimage off the real town's followers, not as a town that follows (`asFollowing`). Small.
- **Ecclesia** (a hex count of following towns) reads the towns that follow now, with no count of the expected towns: the hex count has no promise half.
- **The belief redeal stamps the whole bag.** About 20 stamps for each free redeal. A walk of the bag would cost about a twentieth, but would set a walked mean against a stamped hand.

### Checks

- Type check clean (`npx tsc --noEmit -p .`).
- `test/sim/aiRiteTown.test.ts` (new, core): a hex rite reads the worked hexes of its own town; with no town named, a one-town context reads the mean town and the seat's own book every town; the Rite of Fasting costs its town's surplus, and nothing in a town whose growth has stopped; a card's share of the surplus is the realm's surplus town by town, against its scope. All five fail on the untouched tree.
- `test/sim/aiBeliefChoice.test.ts` (new, core): the expected towns at a first pick and at a later pick; a line asked of following towns priced in every town at a first pick; a later pick at the share of the expected towns; a count of followers read as citizens; at a decision, the stamp alone when every town follows and nothing is promised, and more than the stamp when expected towns do not follow yet; an enhancer's count of following towns with the expected towns in it.
- Tests reworked because they pinned the old readings: `aiLevy` (the rite to refuse is now Consecration of the Bounds, since the Fast pays on that bench, and the ordering reads the better rite), `aiExpansionist` (the two Aqueduct tests seat the bench towns' citizens, so the towns make more food than they eat), `aiScientific` (The Two Capitals' growth line is held to the surplus it costs in the towns other than the capital). `aiCardStamp.test.ts` says its follower belief is a seat's with no religion.
- `test/sim/aiCardStampHelpers.ts`: a founder's follower and enhancer beliefs join `cardsToPrice`, and the slow check's second claim leaves out a faith belief while expected towns do not follow yet. The slow positions hold 165 such stamps (33 at turn 80, 132 at turn 120), and all four checks pass on them.
- Every core test that imports the bot, or reads the source of a changed file (`import.meta.glob` and the file names): 208 files, 7,024 tests, passed.
- The slow tier, by name: `aiDigest` (the pins above), `aiCardStamp`, `botWorker` (seed 26 as before; it passes unchanged), `aiBot`, `aiDecision`, `aiDriver`, `aiGarrison`, `aiWants`, `aiWar`, `beads` and `cityModifiers` passed.
- The shadow check (`test/vitest.shadow.config.ts`) passed on `aiRiteTown`, `aiBeliefChoice`, `aiCardStamp`, `aiSittingMemos`, `aiDevotion` and `aiLevy`.
- The core tier, the build and the whole slow tier were not run. They are the orchestrator's gate.

## Bot batch BP6: no deck bonus, and commissions priced as investments, 2026-11-14

The rulings are `docs/flags.md` (ooooooo), B1 and B12. B1 is the deck bonus removed, with a tie-break of about two points and a price for the progress toward a Doctrine that needs many cards of one deck. The user: *"why is this bonus even needed? in theory, the greedy approach should be a good decision maker on its own already right?"* The cautious version (+5% of the card's own price for each held card, to +50%) is measured beside it. B12 is "as proposed on the page" the item links (the proposal of 2026-11-12): measure each commission, price it as an investment, add the steering half, and give an open commission a chair price from its reward. The audit's fault 1 has B1's evidence. This batch changes the bots' decisions on purpose, so the pins move. No rule of the game changed. Branch `decks` at `9420cef6`.

### What the bot reads now

- **A card's own price has no deck term** (`explainCard`, `council.ts`). The chair arms read it (`seatPrice`) and so does a new government's chair fill. `score.synergyBonus` is retired.
- **A pick** (`explainDraftCard`) is the card's own price plus the deck terms (`deckTerms`): a tie-break of `score.deck.tieBreak` (2) times the share of the seat's held cards that share a deck with the card, and the progress toward the Doctrines still to come (`explainDoctrineProgress`, `value.ts`). The Order, Doctrine and belief offers, the pass and the culture price read it.
- **No Doctrine needs cards of one deck.** The offer deals one Doctrine from each of the seat's two decks, whatever it holds (`drawDoctrineOffer`), and no card counts the cards of a deck. So the progress term prices the one thing that does exist: a Doctrine still to come whose `pays` line counts the seat's Orders. Today that is The Magnaura (+1 science in every town for each seated Civic Order). The term reads nothing for most cards.
- **The cautious version** is the knob `score.deck.sharePerCard` (0, off). Above nought, a pick gains that share of its own price for each held card of its decks, at most `score.deck.shareCap` (0.5), in place of the tie-break and the progress. The two new knobs and the cap have rows in `data/ai.bounds.json`, and the arena panel shows them with no page edit.
- **A commission's chair price** (`explainCommissionChair`): the reward read in full (a one-time reward at its lump times `score.lumpTurns`, a lasting one at its rate for each turn of the horizon after the goal), and then: met, the whole reward for one turn of the chair; a counted part still to come, the reward times the discount of the forecast turns, over those turns; only reached parts still to come, nothing, because a reached figure grows without a chair. The re-seat arm looks on any turn when a held commission's goal is met (`metCommissionWaits`).
- **The pull of a step** (`commissionPullTerm`): an action that moves an open commission's goal carries one step's share of the commission's price, as a chain hands its steps a share (`chainTerm`). A counted part counts a step only while its card sits; a goal the seat will not meet inside the horizon is priced at nought, so it pulls nothing. Five arms ask it: the production table (a wonder, and its hammers), the beeline (the technologies on a road), the rite plan, the gold book (a building bought) and the hex planner (a hex owned, a hex claimed).
- `docs/bot-priorities.md` has the readings in full.

### Turn 100, three versions

Six seats, two decks a seat, standard map, the same game on seeds 1, 7, 42, 999, 2026 and 31337. "Old" is the untouched tree (the deck bonus), "ruled" is this batch as it ships, and "cautious" is this batch with `score.deck.sharePerCard` at 0.05. Totals over the six seats.

| Seed 999 | Towns | Units | Food | Production | Gold | Science | Culture | Faith |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Old | 48 | 248 | 1,137 | 936 | 370 | 730 | 410 | 230 |
| Ruled | 44 | 192 | 1,410 | 1,314 | 574 | 981 | 366 | 153 |
| Cautious | 45 | 222 | 1,465 | 1,567 | 812 | 950 | 404 | 195 |

| Seed 42 | Towns | Units | Food | Production | Gold | Science | Culture | Faith |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Old | 39 | 192 | 1,012 | 674 | 260 | 485 | 261 | 72 |
| Ruled | 42 | 189 | 1,013 | 832 | 254 | 627 | 327 | 78 |
| Cautious | 33 | 187 | 826 | 938 | 406 | 590 | 226 | 64 |

| Six seeds, summed | Towns | Units | Food | Production | Gold | Science | Culture | Faith |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Old | 270 | 1,315 | 6,583 | 6,601 | 2,117 | 4,192 | 2,318 | 1,058 |
| Ruled | 264 | 1,272 | 6,365 | 6,220 | 1,964 | 4,664 | 1,999 | 1,001 |
| Ruled, change | −2% | −3% | −3% | −6% | −7% | +11% | −14% | −5% |
| Cautious | 261 | 1,390 | 6,883 | 6,767 | 2,517 | 4,432 | 2,044 | 1,040 |
| Cautious, change | −3% | +6% | +5% | +3% | +19% | +6% | −12% | −2% |

The spread between seeds is wide, as in the batches before: production in the ruled version rose 40% on seed 999 and 23% on seed 42 and fell 32% on seed 7 and 21% on seed 2026. Culture fell on five seeds of six in the ruled version and on all six in the cautious one.

**Deck focus at turn 100**, the mean over the 36 seats. "Main" and "second" are the seat's two decks, by the count it holds of each. "Picks a deck term decided" counts the Order picks whose winner changes when the deck terms are taken out of the scores, over the six games.

| Version | Orders held | Of the main deck | Of the second deck | Common | Seats with 3 or more of the second deck | Doctrines held | Picks a deck term decided |
|---|---:|---:|---:|---:|---:|---:|---:|
| Old | 14.1 | 12.0 | 1.5 | 0.8 | 10 of 36 | 2.22 | 215 of 506 (42%) |
| Ruled | 12.9 | 6.9 | 3.6 | 2.4 | 27 of 36 | 2.22 | 15 of 463 (3%) |
| Cautious | 12.8 | 6.8 | 3.4 | 2.5 | 25 of 36 | 2.14 | 10 of 460 (2%) |

The Doctrines a seat holds come with its governments, one offer at each adoption, so the count does not move with the deck spread, as the B1 page feared it might. Seed 999, Orders of the seat's first deck / second deck / common, and Doctrines of the first / second deck:

| Seat (decks) | Old | Ruled | Cautious |
|---|---|---|---|
| 0 (Dominion, Magisterial) | 17 / 3 / 1, D 4 / 0 | 5 / 5 / 1, D 0 / 3 | 7 / 2 / 4, D 2 / 0 |
| 1 (Expansionist, Scientific) | 0 / 11 / 0, D 0 / 2 | 5 / 8 / 0, D 1 / 1 | 6 / 5 / 3, D 1 / 0 |
| 2 (Commerce, Devotion) | 1 / 11 / 0, D 0 / 2 | 1 / 8 / 3, D 0 / 2 | 2 / 5 / 4, D 2 / 0 |
| 3 (Magisterial, Expansionist) | 3 / 13 / 1, D 0 / 2 | 2 / 6 / 2, D 2 / 0 | 4 / 8 / 3, D 2 / 1 |
| 4 (Devotion, Dominion) | 16 / 3 / 1, D 2 / 1 | 3 / 7 / 2, D 0 / 2 | 7 / 5 / 1, D 0 / 2 |
| 5 (Scientific, Commerce) | 0 / 13 / 1, D 0 / 2 | 5 / 8 / 4, D 0 / 2 | 3 / 8 / 3, D 1 / 1 |

Seed 42, the same:

| Seat (decks) | Old | Ruled | Cautious |
|---|---|---|---|
| 0 (Dominion, Magisterial) | 10 / 3 / 0, D 2 / 0 | 5 / 5 / 1, D 2 / 0 | 4 / 2 / 3, D 1 / 1 |
| 1 (Expansionist, Scientific) | 12 / 2 / 1, D 2 / 0 | 8 / 7 / 2, D 2 / 1 | 9 / 5 / 2, D 4 / 0 |
| 2 (Commerce, Devotion) | 12 / 0 / 1, D 2 / 0 | 8 / 2 / 4, D 2 / 0 | 7 / 3 / 4, D 2 / 0 |
| 3 (Magisterial, Expansionist) | 1 / 12 / 0, D 0 / 2 | 6 / 8 / 3, D 2 / 1 | 8 / 2 / 1, D 2 / 0 |
| 4 (Devotion, Dominion) | 3 / 9 / 1, D 0 / 2 | 2 / 6 / 3, D 1 / 1 | 3 / 5 / 1, D 0 / 1 |
| 5 (Scientific, Commerce) | 12 / 0 / 0, D 1 / 1 | 5 / 4 / 3, D 2 / 0 | 3 / 3 / 3, D 0 / 1 |

B12 changed almost nothing by turn 100: the ruled tree with B1 alone played the same games on five seeds of six, because few commissions are drafted after B1 and fewer reach a chair before turn 100.

### Commissions, measured

The same game to turn 150 on seeds 999 and 42, both trees.

| | Drafted | Ever seated | Met |
|---|---:|---:|---:|
| Old | 11 | 0 | 0 |
| This batch | 4 | 2 | 3 |

- **Old.** Seven of the eleven were drafted at a forecast at the horizon, which is a price of nought; the deck bonus drafted them. None was ever seated.
- **This batch.** The Founding Vows (seed 999, seat 2) was drafted at turn 56 at a forecast of 10 turns, stayed on the bench until it was seated at turn 118, and was met at turn 122, four turns after it sat. The Great Loan and The Domesday Survey were drafted with their reached goals already met, and each was seated and paid on the turn it was drafted. The Eighth Wonder (seed 999, seat 3) sat 32 turns from turn 35 and was not met by turn 150. In the six turn-100 games, three of the six commissions drafted read a forecast at the horizon, which is a price of nought; why each beat its hand was not traced.
- **Does progress need a chair?** By the rules, yes for every counted goal: its tally grows only while the card sits (`recordScalingOccasion`). A reached goal grows with no chair and is checked only while the card sits, so it needs a chair for one turn, the turn it is met.
- **The bot's forecast of turns to each goal**, as if each seat held the card, at turns 40, 80, 120 and 150 of the final tree's two games. Seven commissions read at the horizon (60 turns or more) for every seat at every snapshot: A Guild Commission, A Victor's Peace, Hold the Capitals, Take the City, The Grand Campaign, The Lynx-Eyed Academy and The Wide Country. Four need captures or a war won, two need buildings or hexes bought, and The Lynx-Eyed Academy needs four Academies. That is the bot's forecast from its own pace, not proof that no bot can meet them, so the list is for the user's design call (the page's "Your decision"). The Mission reads 54 turns for every seat at every snapshot, the cautious default alone, because the board keeps no record of towns converted.
- **What meeting a goal costs** is not priced (below). The goals fall in three groups by what moves them: ones the seat does anyway (technologies, Orders held, hexes and worked hexes, gold income, wonders already under way); ones an arm can steer with this batch's pull (a wonder, a road through a technology, a rite, a building bought, a hex bought); and ones no arm steers (a camp, a capture, a war won, a town converted, a rank, a great person's work, the luxuries, the routes, the treasury, a council in order).

### What it costs

The new readings, timed on seed 42 at turn 110 over the six seats: pricing every card the seats' decks can deal (236 cards) took 54 ms as the card's own price, and the deck terms of the pick added a few milliseconds (the Doctrine progress alone 3 ms). Every commission's chair price took under a millisecond, and the pull of every building row and every research road 4 ms. The six seats' contexts took 840 ms. So the batch's own cost is under 1% of a late turn.

| Turns 100 to 120 | Seed 999 before | Seed 999 after | Seed 42 before | Seed 42 after |
|---|---:|---:|---:|---:|
| Wall seconds a turn | 6.87 | 6.13 | 6.88 | 8.34 |
| CPU seconds a turn | 5.16 | 4.81 | 3.81 | 4.44 |
| Commands a turn | 146 | 132 | 128 | 100 |

The two trees were played in one process, a turn on each in turn, beside other runs, so the load was high: read the change, not the figure. The rise on seed 42 is play. At turn 120 its seats hold 64 towns against 52 before (seat 1 holds 20), and each command reads a bigger empire.

### Pins at BP6

| Game | Turn 20 | Turn 40 | Turn 60 | Turn 80 | Turn 100 | Turn 120 |
|---|---|---|---|---|---|---|
| Two decks, seed 999 | `1a5c474a:815245` | `b017563e:835628` | `7930b0eb:861051` | `44af7c4e:906518` | `526b6051:959079` | `952b428a:1055558` |
| Two decks, seed 42 | `46751351:817059` | `d80e0e19:832350` | `f41fa359:852595` | `b342b3f4:883991` | `6e64c238:939183` | `87e4c121:1023292` |

At turn 130 the two games are `606b903b:1113768` and `cccd2570:1086475`. `test/sim/aiDigest.slow.test.ts` pins duel `cfa6111d:359911` and standard `af0e32c5:1034066`. Before the batch, the untouched tree gave the BP5 pins above at every turn, at turn 130, and both digest pins.

### What this batch measured and did not fix

These are not done.

- **The cost of the work a goal needs** (B12's second step). The draft price is the reward at the delay of the forecast, as before. The forecast reads the seat's own pace, so a goal the seat does not work toward reads far away and near nothing, which keeps such a commission out of a draft; but the price does not charge what the work would cost a seat that chose to do it.
- **The chair in a draft.** A draft prices a commission as if it would sit. The Founding Vows was drafted at turn 56 and sat at turn 118. A plain card weaker than every seated card has the same fault; the BP3 ruling asks for a bench charge in one place for every card or none.
- **The steps no arm asks** (above): a camp cleared (the camp ranking is P5, batch BP8), a town taken, a war won, a town converted, a rank earned, a great person's work, the luxuries, the routes, the treasury and a council in order.
- **The Doctrine engines.** The progress term reads only a Doctrine's `pays` lines that count Orders. A Doctrine whose worth grows with the cards held in another way (The Council of Ten's chairs, Scutage, The Arthashastra) is not read as progress.
- **Culture at turn 100** fell 14% in the ruled version and 12% in the cautious one over six seeds, on five seeds of six and on all six. Not traced.

### Checks

- Type check clean (`npx tsc --noEmit -p .`).
- `test/sim/aiDeckTerms.test.ts` (new, core): a card's own price reads no deck, and the chair arms read it with no tie-break; a pick adds the knob times the share of held cards of its deck, at most the knob; a common card and a card already held get nothing; The Magnaura's count is priced on a Civic Order at the chance and the wait of the adoption, and on no card that joins no count, no card already held and no seat without the Doctrine; the cautious version adds its capped share of the card's own price and nothing to a card worth nothing.
- `test/sim/aiCommissionChair.test.ts` (new, core): a met goal's chair price is its whole reward; a reached goal not met reads nothing; a counted goal is the reward, times the discount, over the forecast turns; the slot arm seats a met commission over a card that pays, and the re-seat arm looks off its own turn when one waits; the pull of a counted goal counts only while its card sits, a reached goal's counts either way and stops once it is met, and the wonder row and the research road read only their own goals.
- Tests reworked because they pinned the old bonus: `aiBot` (the two deck tests now pin the tie-break), `aiMagisterial` (the pass and the hand estimate now price each card as a pick) and `decks/dominionWars` (Vae Victis passed only because holding Carried-Off Scholars raised the deck bonus; the seat now has soldiers, so it has a pace of captures, and the doubled rider is priced above nought).
- Every core test that imports the bot, or reads the source of a changed file or the bot's sheet (`import.meta.glob` and the file names): 116 files, 4,109 tests, passed.
- The slow tier, by name: `aiDigest` (the pins above), `aiCardStamp`, `botWorker` (seed 26 as before; it passes unchanged), `aiBot`, `aiDecision`, `aiDriver`, `aiGarrison`, `aiWants`, `aiWar` and `beads` passed.
- The shadow check (`test/vitest.shadow.config.ts`) passed on `aiDeckTerms`, `aiCommissionChair`, `aiSittingMemos`, `aiCardStamp`, `aiCommissions` and `aiSeatable`.
- The core tier, the build and the whole slow tier were not run. They are the orchestrator's gate.

## Bot batch BP7: the smaller readings, the wonder rewards and the Forbidden City's chair, 2026-11-14

The rulings are `docs/flags.md` (ooooooo), B10 and P9, both "as proposed on the page" the item links (the proposal of 2026-11-12). B10 is fault 10 of `docs/audit/bot-pass-3-card-values.md`. The page's P9 ("three wonder rewards the bot cannot read") is row 10 of the ranked table in `docs/audit/bot-pass-3-competitiveness.md`; row 9 of that table is a rule question about what a wonder costs, which the page does not number. The user added the Forbidden City's chair: *"please make sure to implement the forbidden palace's additional wildcard slot"*. That is a rule change, so this batch is schema 243. Branch `decks` at `1104891a`.

### The rule change: the Forbidden City's chair

- The row's `deferred: ["one more Order slot"]` is now `effects: [{ "kind": "slotRider" }]`, the shape The King's Friends and The Council of Ten use. No new shape. The card says "you have one more wildcard chair" through the existing describer.
- The chair belongs to whoever holds the town the wonder stands in, because a wonder's effects are its holder's law. Three seams refit the councils, and each asks only about a town that holds a row that opens chairs (`buildingOpensChairs`, `statecraft/council.ts`): the wonder finished (`realiseItem`), the town handed over by capture or treaty (`handOverCity`, for both seats) and the town razed (`razeCityAt`).
- A seat that loses the chair is seated again as an adoption seats it: `refitSlots(state, player, 'reseat')` runs `reseatOrders` with the old council's fit. A card that keeps its chair keeps its seal, a card whose chair closed moves to a free chair that fits it, and a card that fits no free chair returns to the collection with its progress. Scutage closes a chair by choice and keeps its older reading (the card in the closed chair returns), which `magisterialDoctrines.test.ts` pins.
- `docs/wonders.md` states the rule and `docs/README.md` has a line. `docs/codex.md` is generated and far out of date (a fresh run rewrites 215 lines), so it was not regenerated and still marks the row as deferred.

### What the bot reads now

- **B10, a charter that opens no technology** (`explainCharterOpening`, `value.ts`): a building at the shelf it opens (`scoreUnlockedBuilding`), a unit at the `unlocksUnit` reading, a rite at one town's blessing (`explainRite`) times the towns, at nought or more, and a tended work at nought, because the bot's roster lays none. Before, the seven live ones read nought.
- **B10, a Boon** (`onDraftWorth`): a unit is the hammers it would cost, as a lump; a trader is the best route a new caravan could run today while a slot is free; and the lump is spread over the turns the game has left (`boonTurns`: `score.gameTurns` less the turn now, at most the one horizon, `priorities.horizonTurns`), in place of `score.lumpTurns`.
- **B10, The Grain Census**: its tally is forecast at the seat's pace of growth over the horizon, never below `score.tallyForecast.sizeRecord`.
- **B10, a charter technology**: the research choice reads it as the draft does (`explainCharterKnowledge` in `readNodeGifts`), and a held charter's technology becomes the research goal once its road can be learnt in `research.charterTurns` turns (`charterDeadline`, `bot.ts`). The game records no draft turn, so the deadline reads the road. This is the proposal's one fixed behaviour.
- **P9, three completion grants** (`completionGrantTerm`, `value.ts`): Stonehenge's free god at the faith the next rung costs, as a lump; the Theatre of Dionysus' Doctrine offer at the bot's price for a Doctrine offer, the reading a commission's Doctrine offer takes; its free Amphitheatre at the hammers it would cost, as a lump. Each read `score.unknownEffect` (2) before.
- **One more Wildcard chair** (`extraChairsWorth`, `value.ts`): the best card the seat holds and cannot seat now, by the walk (a commission at its chair price, and a met commission left out because it leaves its chair after a turn); with the bench empty, the card the seat expects to draft, discounted for the drafts it waits on. The Forbidden City's row reads it, and so does every `slotRider` that opens chairs and a commission's `wildcardChairs` reward. A chair closed keeps the old stand-in.
- **New knobs**: `score.gameTurns` (200), `score.tallyForecast.sizeRecord` (10) and `research.charterTurns` (15), each with a row in `data/ai.bounds.json`; the arena shows them with no page edit. `docs/bot-priorities.md` has the readings in full.

### The prices, on a recorded board

Seed 42, the six-seat two-deck game, at turn 90 (the untouched tree's board, read by both trees). The value is points a turn, for each of the six seats:

| Row | Before | After |
|---|---|---|
| Stonehenge's free god | 2 | 24 to 54 |
| The Theatre's Doctrine offer | 2 | 11 to 377 |
| The Theatre's free Amphitheatre | 2 | 25 |
| The Forbidden City's chair | 0 (deferred) | 32 to 609 |

The chair reads the walk. On this board the walk and the slot arm's stamp disagree for some cards on the bench: seat 3's best benched card is 609 by the walk and 423 by its stamp. A stamp for every benched card each time the row is priced would cost about what BP3 measured and dropped (30 to 50 stamps a seat), so the chair keeps the walk, as the pool estimates do.

### Turn 100, over six seeds

The same game to turn 100 on seeds 1, 7, 42, 999, 2026 and 31337, totals over the six seats:

| | Towns | Units | Food | Production | Gold | Science | Culture | Faith |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Before | 264 | 1,272 | 6,365 | 6,220 | 1,964 | 4,664 | 1,999 | 1,001 |
| After | 269 | 1,365 | 6,493 | 7,487 | 2,381 | 4,696 | 2,314 | 934 |
| Change | +2% | +7% | +2% | +20% | +21% | +1% | +16% | −7% |

The spread between seeds is wide, as in the batches before: production rose 168% on seed 31337 (876 to 2,345) and 18% on seed 2026, and fell 33% on seed 42 and 16% on seed 7. Without seed 31337, production is −4%.

### Wonders

Wonders built, per seed, seats 0 to 5:

| Seed | By turn 100, before | By turn 100, after | By turn 150, before | By turn 150, after |
|---|---|---|---|---|
| 1 | 12 (2 · 0 · 0 · 4 · 6 · 0) | 10 (6 · 0 · 1 · 2 · 1 · 0) | 27 | 26 (8 · 0 · 1 · 9 · 8 · 0) |
| 7 | 11 (4 · 4 · 1 · 1 · 1 · 0) | 10 (2 · 7 · 0 · 0 · 1 · 0) | 24 (10 · 11 · 1 · 1 · 1 · 0) | 22 (11 · 9 · 0 · 1 · 1 · 0) |
| 42 | 10 (0 · 8 · 2 · 0 · 0 · 0) | 10 (1 · 4 · 0 · 4 · 0 · 1) | 25 (0 · 21 · 2 · 2 · 0 · 0) | 24 (2 · 7 · 0 · 14 · 0 · 1) |
| 999 | 13 (11 · 0 · 0 · 0 · 0 · 2) | 10 (4 · 1 · 2 · 0 · 0 · 3) | 27 (20 · 2 · 0 · 0 · 0 · 5) | 22 (12 · 1 · 2 · 0 · 2 · 5) |
| 2026 | 10 (0 · 4 · 2 · 1 · 3 · 0) | 11 (0 · 3 · 1 · 7 · 0 · 0) | | |
| 31337 | 10 (5 · 3 · 0 · 0 · 2 · 0) | 16 (2 · 0 · 1 · 11 · 2 · 0) | | |
| Total | 66 | 67 | 103 | 94 |

- **The three wonders whose rewards are now read are built earlier.** Stonehenge: 4, 7, 1, 4, 11 and 28 turns earlier on the six seeds. The Theatre of Dionysus: 6, 9, 1, 19 and 20 turns earlier on five seeds, 11 turns later on seed 999.
- **The Forbidden City** was built on four seeds of six by turn 150 in both trees: at turns 111, 117, 105 and 119 before, and 117, 107, 121 and 119 after. Its holder had every chair filled on 135 of the 140 turns it held the wonder, read at the end of each turn; the chair stood empty on 5 turns in all. On seed 1 a malice sat in the last chair, so a card filled another.
- **More hammers go into lost races.** Town-turns with a wonder at the front of a queue that another seat finished first, seeds 1, 7, 42 and 999, turns 1 to 150: 172 before, 264 after. Each of the two halves alone gives about 215.

### Charters and Boons

- **Charter technologies researched**: by turn 100, 0 of 10 held before and 8 of 8 after; by the end of the runs (turn 150 on four seeds, 100 on two), 5 of 16 before and 10 of 10 after, every one within 15 turns of the turn the seat drafted it (3 to 11 turns). With `research.charterTurns` at 0 the new reading alone researched 2 of 13 by turn 150, so the deadline is what does it.
- **Boons**: picked in 3 of 13 offers that held one before turn 60 (4 of 14 before), and 3 of 6 from turn 60 (3 of 7 before). Too few offers to read a change.

### Turn 150, and what this batch cannot tell apart

Seeds 1, 7, 42 and 999 to turn 150, totals over the six seats. "B10 only" and "P9 only" are this batch with the other half's readings put back (P9 only keeps the Forbidden City's rule); "no deadline" is this batch with `research.charterTurns` at 0; "no change" is the untouched tree with `score.deck.tieBreak` at 2.5 in place of 2, a nudge with no expected direction, which changed the game on seeds 1 and 42 only.

| Turn 150 | Towns | Units | Food | Production | Gold | Science | Culture | Faith |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Before | 353 | 1,997 | 14,946 | 32,306 | 6,478 | 32,624 | 12,999 | 3,101 |
| No change | −1% | −2% | −2% | −3% | +6% | −7% | −8% | 0% |
| This batch | −5% | +9% | −12% | −9% | −28% | −22% | −4% | −19% |
| B10 only | −12% | 0% | −8% | −37% | −28% | −61% | −43% | −24% |
| P9 only | −7% | +13% | −1% | +4% | +15% | −21% | +1% | −1% |
| No deadline | −11% | +8% | +13% | +4% | −5% | −32% | −34% | +1% |

Every changed tree reads less science at turn 150 than the untouched one, and the nudge moved one seed's science by 25% (seed 1, 11,513 to 8,587). No single part of the batch carries the fall: each half alone, and the batch without the deadline, read lower too, and the two halves do not add up to the whole. So four seeds cannot say whether the batch costs late play or the untouched tree drew well on these seeds. A run over many more seeds would; it was not done here.

### What it costs

The new readings, timed on seed 42 at turn 90 over the six seats: the first chair reading (the bench walked and the next hand's best card) took 19 ms, the three wonder rows 23 ms, the 21 live charters 20 ms and five Boons 2 ms, against 470 ms for the six seats' contexts. Each reading is a memo on the context or one walk, so the batch's own cost is a few percent of a context at most.

| Turns 100 to 120 | Seed 999 before | Seed 999 after | Seed 42 before | Seed 42 after |
|---|---:|---:|---:|---:|
| Wall seconds a turn | 2.16 | 2.85 | 1.86 | 1.43 |
| CPU seconds a turn | 2.44 | 3.16 | 2.07 | 1.62 |
| Commands a turn | 132 | 153 | 100 | 110 |
| Milliseconds a command | 16.4 | 18.6 | 18.6 | 13.1 |

The two trees were played in one process, a turn on each in turn, with the two seeds at once and nothing else running. The cost of a command rose on one seed and fell on the other, so the change in seconds a turn is play: seed 999 gives more commands late.

### Pins at BP7

| Game | Turn 20 | Turn 40 | Turn 60 | Turn 80 | Turn 100 | Turn 120 |
|---|---|---|---|---|---|---|
| Two decks, seed 999 | `1d42380f:815164` | `736d7c4a:837205` | `6d3730d3:862627` | `ea59bd77:911063` | `bb476e42:973365` | `70413f21:1051545` |
| Two decks, seed 42 | `f9fc43c1:817008` | `e52fd1aa:832347` | `383d2a0c:846051` | `8d8b77c5:873818` | `8ab0688d:913489` | `2dcda59e:974198` |

The digests carry the schema version, so they move even where the play did not. This run stopped after turn 120, so it gives no turn-130 figure. `test/sim/aiDigest.slow.test.ts` pins duel `89f988df:326624` and standard `ea9d00e3:1043519`. Before the batch, the untouched tree gave the BP6 pins above at every turn from 20 to 120, and both digest pins.

### What this batch measured and did not fix

These are not done.

- **The chair reads the walk, not the stamp.** On the recorded board the two differ by up to a third for a card on the bench (above). A stamp of the bench each time a chair is priced is the cost BP3 dropped.
- **Lost races.** The Theatre and the Forbidden City now read high, so more seats queue them at once, and more town-turns go into races another seat wins (172 to 264 over four seeds to turn 150). The build arm still reads no race (fault P4, held by the user for the parameter pass).
- **The charter deadline reads the road, not the draft.** The game keeps no draft turn, so a charter whose road is longer than `research.charterTurns` turns waits until the road comes inside it. On these seeds every held charter was researched within 15 turns of its draft, and none waited.
- **The research reading of a charter technology** agrees with the draft's now, but on its own it changed little: with the deadline off, 2 of 13 held charter technologies were researched by turn 150.
- **The trader of The First Caravan** is the route a new caravan could run today. It does not ask whether the seat would have bought that route anyway with gold.
- **Turn 150.** The fall in late science above is not traced to a cause. More seeds would tell a cost from the spread of four games.
- **`docs/codex.md`** is stale, as above.

### Checks

- Type check clean (`npx tsc --noEmit -p .`).
- `test/sim/forbiddenCityChair.test.ts` (new, core): the row is a `slotRider` in plain words and no longer deferred; the chair opens on completion, for the holder only; a card sits in it, and the slot command before the wonder is refused with the state byte-identical; capture moves it to the new holder; the loser's card moves to a free chair that fits it and keeps its progress, and a card that keeps its chair keeps its seal; an unsorted card takes a typed chair; a card that fits no free chair returns with its progress; a raze closes it; the same steps twice give the same board byte for byte.
- `test/sim/aiWonderRewards.test.ts` (new, core): Stonehenge's god at the next rung's faith, the Theatre's Doctrine offer at a commission's Doctrine offer reading (The Golden Bull), the free Amphitheatre at its hammers and nought where one stands, no grant of the three left to the stand-in; one more chair is the best benched card and then the next; a second chair waits longer; the Forbidden City's row reads the chair; the slot arm fills the new chair.
- `test/sim/aiSmallReadings.test.ts` (new, core): the building, unit, rite and tended-work charters; `boonTurns` early, late and past the end; The Sword of State at its hammers; The First Caravan at its route and nought with no slot; The Grain Census's forecast; a charter node read as the draft reads it; the deadline sets the goal, the table's best differs with the rule off, and a long road waits.
- Tests reworked: `wonders` (the deferral and shape registers), `cardTextSnapshot`'s fixture (`CARD_TEXT_WRITE=1`, the Forbidden City's two lines only), `explore` (the schema digit; with the version printed as 242 the old hashes return), the fifteen schema pins, `slateRegister` and `magisterialConstitution` (the new chair writer, which announces and settles), `expansionistCura` (two new readers of a town's buildings), `aiBounds` (two new whole-number knobs), `aiMagisterial` (The Wandering Muse and The Grand Retrospective at the new spread), `aiScientific` (a charter node's traits inside the draft's reading) and `decks/magisterialDoctrines` (The Arthashastra's chair is worth the best card as well as its second reading).
- Every core test that imports the bot, reads a source file (`import.meta.glob` or `readFileSync`), names the schema, the wonders, the chairs or a town handed over, and the Compendium's tests: 259 files, 7,628 tests, passed. Thirteen of them first failed on a worker timeout while another job loaded the machine, and passed when run again alone.
- The slow tier, by name: `aiDigest` (the pins above), `botWorker` (seed 26 as before; it passes unchanged), `aiBot`, `aiDecision`, `aiDriver`, `aiGarrison`, `aiWants`, `aiWar`, `beads`, `cityModifiers`, `religion`, `statecraft`, `cities`, `war`, `endgame` and `saveCheckpoints` passed. `aiCardStamp` passed on the tree before the last change (a met commission left out of the chair's bench), which no recorded game reached: the four seeds played the same games to turn 150 with and without it.
- The shadow check (`test/vitest.shadow.config.ts`) passed on `forbiddenCityChair`, `aiWonderRewards`, `aiSmallReadings`, `aiSittingMemos`, `aiCardStamp`, `wonders` and `readings`.
- The core tier, the build and the whole slow tier were not run. They are the orchestrator's gate.

## Bot batch BP8: the camp hunt, the worker's price and the purchase check, 2026-11-14

The rulings are `docs/flags.md` (ooooooo), P5, P6 and the bot side of P8, each "as proposed on the page" the item links (the proposal of 2026-11-12). They are rows 5, 6 and 8 of the ranked table in `docs/audit/bot-pass-3-competitiveness.md`, with the evidence in its sections 3.4, 3.5 and 3.7. P5 also takes the pull BP6 left: the commission step "a camp cleared". The page and the audit disagree on one point: the page says the count of workers "is a fixed target" today, but the code has priced a worker by the ground waiting for a spade since batch 4 (`explainWorkerCraving`). The batch followed the page's fix, and changed what that price reads. No rule of the game changed. The one change under `src/sim/` is that `campCadence` (`barbarians.ts`) is exported for the bot. Branch `decks` at `b7a87f7a`.

### What the measurement found before the change

The six-seat, two-deck game of BP6 and BP7, seeds 1, 7, 42, 999, 2026 and 31337, on the untouched tree. The probes are in the session's scratch folder (`bp8/`).

- **The camps.** Every seed holds the 24 camps the rules allow at turns 50 and 100. The wild founds up to three camps every second turn while it holds fewer than `maxCamps`, so a camp cleared is replaced within two turns, and "camps standing" cannot fall while legal ground is left. What clearing changes is where the camps stand and how many raids a seat meets. The seats cleared 14 camps by turn 50 and 111 by turn 100, over 36 seats.
- **Why so few.** The hunt ranked camps by distance alone and sent any free piece. A lone warrior at the door of a dug-in warrior warden on open ground deals 26 and takes 35, so it did not strike. It dug in, and a dug-in piece is never asked again outside a war (`wakeTheCampaign` is the only arm that wakes one). On seed 42 at turn 60 one seat had 12 of its 13 soldiers dug in, eight of them a hex from a town, and had cleared no camp.
- **Idle workers** are rare on this tree: 43 of 5,343 worker-turns to turn 100 (0.8%), against the audit's 19% on its older tree. Each worker-turn was sorted by what the worker was told: built, walked, kept walking, slept, or nothing. The idle ones were asleep: 15 with a plan entry they could reach, 22 with nothing in the plan. A sleeping worker is never asked again (`firstBlocker` names no sleeping piece), and only `wakeSleepers` wakes it, on a new sighting.
- **Too few workers.** 0.54 a town at turn 100, and 27% of worked hexes (406 of 1,517) bare with a legal improvement. In the build table on seed 1, the worker's row scored a median of 0.28 of the winner's where bare hexes waited; soldiers, palisades and walls won half of those tables. At least a quarter of those rows read nought, because each spade on the board was charged to the town nearest it, so one worker by a town talked that town out of a second while ground elsewhere waited.
- **Workers lost.** The wild took 217 civilians by turn 100 (more than the 146 workers alive then). On seed 42 to turn 100 (read on an early version of this batch, with the camp hunt already changed), 30 of the 33 workers and settlers taken had been walking, most with a raider a hex away at the start of the turn and a soldier of ours one or two hexes off. The bot reads a soldier within `war.escortRadius` as cover, but the wild takes any civilian with no soldier on its own hex (`isUnguarded`).
- **Walking.** Three quarters of worker-turns are a march ordered or a march carried on, against a quarter spent building.
- **The purchase check (P8).** When each seat ended its turn, three cases were looked for where the purse covered a purchase above the bot's own reserve: a building at the front of a town founded in the last 15 turns that the town would take 8 turns or more to raise; a town with no soldier in it and a hostile piece within two hexes; a free route slot. For each case the bot's own book (the sitting's) and a book read fresh at that moment were asked what the spend arm would do, with the live gates the arm asks. Most cases were the bot holding toward a better want, holding its wage reserve, or a gate refusing the row. The faults were two, and both come from a book read once a turn: the want book holds one route row, the best pair, so after the seat hired it the next pair was not in the book until the next turn, and a seat with free slots hired one route a turn; and a town founded during the turn had no rows in the book, so an empty new town with the wild beside it was not bought a defender that turn. On a bench with two free slots and 5,000 gold, the untouched tree hires one route in the turn.

### What the bot reads now

- **A camp's worth** (`explainCamp`, `value.ts`): the bounty through the lump exchange, the cards that pay on a camp cleared, the commission pull, the raiders it sends at this seat (when the seat holds the real town nearest it, one raid every muster cadence at `camps.raidLoss` of the hammers of the best melee piece the seat could raise) and the site it closes to a settler. `campMarch` ranks camps by it, discounted by the walk.
- **A force sized to the camp** (`campForce`): the camp wants `camps.forceMargin` (1.5) times its guard, and a piece joins only while the force is short and the seat's spare soldiers within `camps.marchReach` (12) can make it whole. A piece at the door holds there. Once the force beside a camp is whole, a blow on the guard takes `camps.assaultAppetite` (0.5) (`campAssault`).
- **The hunt wakes its pieces** (`wakeTheHunt`): a dug-in or sleeping field soldier near a camp whose force is short and can be made whole, or beside a camp whose force is whole, is asked again once a turn; only a march or a blow is sent.
- **The worker's price** (`explainWorkerCraving`, `plan.ts`): the ground of every town of the seat, less the charges of every spade on the board and of every spade queued in another town, inside `workers.waitingTurns` (20) turns of the asking town.
- **A sleeping worker is asked again** once a turn (`wakeIdleWorker`).
- **The next route after a hire** (`nextRouteOffer`): once the seat's running routes differ from the count its book was read at, the route outlook is asked again and its best pair is offered beside the book.
- `docs/bot-priorities.md` has the readings in full.

### Turn 100, over six seeds

The same game to turn 100 on seeds 1, 7, 42, 999, 2026 and 31337, totals over the six seats. "Before" is the untouched tree, "after" this batch as it ships.

| Seed | Version | Towns | Units | Food | Production | Gold | Science | Culture | Faith |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | Before | 50 | 277 | 1,435 | 1,479 | 327 | 757 | 444 | 241 |
| 1 | After | 53 | 293 | 1,340 | 1,786 | 335 | 859 | 470 | 234 |
| 7 | Before | 44 | 210 | 1,030 | 734 | 406 | 879 | 416 | 139 |
| 7 | After | 44 | 226 | 1,119 | 1,182 | 327 | 893 | 461 | 201 |
| 42 | Before | 34 | 180 | 657 | 558 | 274 | 459 | 289 | 60 |
| 42 | After | 40 | 167 | 1,052 | 694 | 259 | 734 | 268 | 81 |
| 999 | Before | 52 | 246 | 1,211 | 1,305 | 391 | 811 | 345 | 109 |
| 999 | After | 45 | 188 | 931 | 949 | 518 | 930 | 283 | 103 |
| 2026 | Before | 38 | 185 | 699 | 1,066 | 383 | 708 | 323 | 123 |
| 2026 | After | 52 | 205 | 952 | 1,181 | 372 | 874 | 306 | 212 |
| 31337 | Before | 51 | 267 | 1,461 | 2,345 | 600 | 1,082 | 497 | 262 |
| 31337 | After | 42 | 217 | 1,024 | 881 | 209 | 682 | 300 | 250 |

| Six seeds | Towns | Units | Food | Production | Gold | Science | Culture | Faith |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Before | 269 | 1,365 | 6,493 | 7,487 | 2,381 | 4,696 | 2,314 | 934 |
| After | 276 | 1,296 | 6,418 | 6,673 | 2,020 | 4,972 | 2,088 | 1,081 |
| Change | +3% | −5% | −1% | −11% | −15% | +6% | −10% | +16% |

The spread between seeds is wide, as in the batches before. Production rose on four seeds (1, 7, 42 and 2026, by 11% to 61%) and fell on two (999 by 27%, 31337 by 62%). Seed 31337's figure before is BP7's outlier (production rose 168% on that seed in BP7); without seed 31337, production is +13% and gold +2%.

### The wild

| | Camps standing, turn 50 | Turn 100 | Camps cleared, turn 50 | Turn 100 | Units lost to the wild, turn 50 | Turn 100 | Civilians the wild took, to turn 100 | Blows on a camp's warden, to turn 100 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Before | 144 | 143 | 14 | 111 | 201 | 495 | 217 | 369 |
| After | 144 | 144 | 21 | 145 | 219 | 535 | 184 | 726 |

- The figures are summed over the six games (36 seats). Camps cleared by turn 100 rose on every seed (1: 18 to 26, 7: 23 to 26, 42: 16 to 17, 999: 15 to 17, 2026: 13 to 32, 31337: 26 to 27).
- Camps standing do not move, for the rule reason above: the wild refills to 24.
- Units lost to the wild rose 8% (on three seeds of six); the civilians it took fell 15%.

### Workers

| | Workers, turn 50 | Turn 100 | A town, turn 100 | Worker-turns to turn 100 | Idle | Share idle | Improvements built to turn 100 | Worked hexes bare with a legal improvement, turn 100 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Before | 50 | 146 | 0.54 | 5,343 | 43 | 0.8% | 1,306 | 406 of 1,517 (27%) |
| After | 62 | 144 | 0.52 | 6,214 | 24 | 0.4% | 1,502 | 331 of 1,585 (21%) |

Each cause of an idle worker the measurement found, and what was done:

- **Asleep with ground it could reach** (15 worker-turns before): a sleeping worker is never asked again. `wakeIdleWorker` asks it once a turn. After: 2.
- **Asleep with nothing in the plan** (22 before, 22 after): the plan held no entry for it. This is not a fault: there was no ground for it.
- **The worker's price read nought** where bare hexes waited, in a quarter of the build tables on seed 1, because each spade on the board was charged to the town nearest it. The craving now reads the empire's ground less every spade's charges and the spades queued (`explainWorkerCraving`). Workers held at turn 100 did not rise (146 to 144), but more were raised early (50 to 62 at turn 50), improvements built to turn 100 rose 15% and the bare worked hexes fell from 27% to 21%.
- **Not idle, but lost or slow, and not fixed**: the wild's thefts (217 civilians by turn 100 before, 184 after) and the walking (three quarters of worker-turns, before and after). See below.

### The banks and the purchase check

| | Turn | Gold banked, median (most) | Faith banked, median (most) | Gold spent | Bought with gold: pieces / buildings | Routes hired | Hexes bought | Bought with faith: pieces / buildings | Rites |
|---|---|---|---|---:|---|---:|---:|---|---:|
| Before | 50 | 72 (145) | 14 (111) | 6,765 | 93 / 0 | 4 | 19 | 0 / 0 | 74 |
| Before | 100 | 426 (1,018) | 76 (331) | 73,607 | 437 / 127 | 171 | 33 | 45 / 1 | 313 |
| Before | 150, seeds 42 and 999 | 1,235 (3,466) | 181 (612) | 114,032 | 292 / 208 | 184 | 13 | 54 / 14 | 285 |
| After | 50 | 75 (141) | 16 (296) | 6,835 | 94 / 0 | 2 | 21 | 0 / 0 | 75 |
| After | 100 | 390 (983) | 98 (746) | 72,246 | 365 / 129 | 171 | 36 | 64 / 0 | 347 |
| After | 150, seeds 42 and 999 | 1,626 (8,749) | 92 (877) | 128,434 | 276 / 220 | 193 | 17 | 62 / 42 | 224 |

The figures to a turn are counts over the games to that turn; the medians are over the 36 seats (12 at turn 150).

**The purchase check**, at every seat's end of turn to turn 100 (3,600 seat-turns a tree), the three cases described above, and what the two books say at that moment (the first 40 cases a seed):

| | A new town's building | A town with no soldier and the wild beside it | A free route slot | Held toward a better want | Held for the wage reserve | Refused by the rules | The sitting's book holds, a fresh one buys |
|---|---:|---:|---:|---:|---:|---:|---:|
| Before | 0 | 12 | 33 | 11 | 2 | 11 | 21 |
| After | 6 | 32 | 35 | 19 | 22 | 11 | 21 |

- In every case but the last column, the bot's own book says why it did not buy, and the reason is its rule: the purchase is worth less a coin than holding toward a dearer want or holding the wage reserve, or the rules refuse the row (a piece already in the town's hex, a pair already running, borders frozen). That is the comparison the spend arm makes.
- **The empty town beside the wild.** After the batch, 32 such cases to turn 100 (12 before), and in 24 of them the bot's own book held: a soldier for the empty town was worth less a coin than the bar (a Palisade or a Swordsman saved for, the wage reserve), and the best row it could buy was often a Granary. A garrison leaves its town when it kills a piece next door and advances, and the book did not then rate a new defender above holding. Why that row reads so low was not traced. This is the page's own example of a purchase that should beat waiting, so it is open for the next batch.
- The last column is the book read once a turn: routes (14 before, 13 after) and towns with no rows in the sitting's book (7 before, 8 after), which are towns founded later in the game, most likely during that turn (not fixed, above). One route fault is fixed: after a hire the next pair was not in the book, so a seat hired one route a turn (`nextRouteOffer`). On a bench with two free slots and 5,000 gold the untouched tree hires one route in the turn and this tree hires two. The check reads the sitting's book and not that offer, so it cannot tell how many of the 13 route cases after are offers the spend arm saw and held; the others have causes the check does not name (a pair or a price that moved during the turn).
- To turn 100 the seats hired 171 routes before and after, and bought 494 things with gold against 564 before; gold income at turn 100 was 15% lower (2% without seed 31337).

### What it costs

| Turns 100 to 120 | Seed 999 before | Seed 999 after | Seed 42 before | Seed 42 after |
|---|---:|---:|---:|---:|
| Wall seconds a turn | 3.00 | 1.84 | 1.77 | 1.76 |
| CPU seconds a turn | 3.32 | 2.06 | 2.07 | 2.06 |
| Commands a turn | 153 | 111 | 110 | 105 |
| Milliseconds a command | 19.6 | 16.5 | 16.1 | 16.8 |

The two trees were played in one process, a turn on each in turn, with the two seeds at once and nothing else of this batch running. The new arms are cheap: in a CPU profile of turns 101 to 120 on seed 42 (an earlier version of the batch), the hunt's wake arm took 0.2 seconds in all, the camp forces 0.1 seconds, and the worker's arms about 0.6 seconds more than before. Seed 999's fall is play: its seats give fewer commands late. A version measured before the last fix (the force reading took the empire's health figure) gave 2.69 against 3.30 and 2.08 against 2.02 seconds a turn.

Two versions of the P8 fix were measured and dropped for their cost. Reading the sitting's context again after every founding and every route hired took 6 contexts a turn and 0 to 7 more on seed 42 at turns 100 to 120, each 150 to 300 milliseconds: about a third of a late turn went into contexts, and that tree played turns 100 to 120 of seed 42 at 4.43 seconds a turn, against 1.67 for the untouched tree in the same process. Reading it again after every purchase was dropped for its play (below).

### Tried and dropped

Each was measured on an earlier version of this batch, on the six seeds to turn 100, and taken out. Totals over the six seats against the untouched tree:

| Version | Towns | Units | Food | Production | Gold | Science | Culture | Faith |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| The book read again after every purchase | +6% | −11% | +2% | −13% | −6% | +7% | −1% | +5% |
| A civilian's cover read as a soldier on its own hex, with the third row's reading | −12% | −9% | −8% | −22% | −7% | −14% | −15% | −2% |
| This batch with the book read again at a founding and a route hired | +9% | +8% | +29% | +41% | +10% | +32% | +55% | +49% |

- **The book read again after every purchase.** It fixes every stale-book case at once, but after each purchase the fresh book prices gold against the smaller purse, so the seat bought less in a turn (368 pieces bought with gold to turn 100, against 423 in the version without it) and fewer soldiers; production fell on five seeds of six against the same tree without it.
- **A civilian's cover read as a soldier on its own hex** (the wild's own rule, `isUnguarded`). The wild took 183 civilians to turn 100, against 217 on the untouched tree and 189 on an earlier version of this batch without the change, while workers ran home far more often (worker marches 2,359 to 4,500 to turn 100) and built 21% fewer improvements than the untouched tree.
- **The book read again at a founding and a route hired** played well (the third row; without seed 2026, where one seat ran away, the figures are +4% towns, +1% production and −3% science), and in it two games of six ended before turn 150 with the Opus (seed 42 at turn 133, seed 999 at turn 139). It was dropped for its cost (above). The version that ships offers the next route without reading the book again.

### Pins at BP8

| Game | Turn 20 | Turn 40 | Turn 60 | Turn 80 | Turn 100 | Turn 120 |
|---|---|---|---|---|---|---|
| Two decks, seed 999 | `399a050d:815383` | `a7ddf102:837928` | `74f9a6c3:871041` | `778d5be5:906555` | `d85e3560:960547` | `ecc7feaa:1023061` |
| Two decks, seed 42 | `a99a216a:817383` | `77c7b302:836308` | `eaa3d1e9:857299` | `a8be71df:889996` | `ac7f2fa1:935726` | `fbdafb23:982630` |

`test/sim/aiDigest.slow.test.ts` pins duel `ce93521f:331077` and standard `855266fe:1048454`. Before the batch, the untouched tree gave the BP7 pins above at every turn from 20 to 120, and both digest pins (`89f988df:326624`, `ea9d00e3:1043519`).

### What this batch measured and did not fix

These are not done.

- **Camps standing** stay at the cap. The wild refills to `maxCamps` within two turns of a camp cleared, so the page's measure "camps cleared" moves and "camps standing" cannot, while legal ground is left.
- **Units lost to the wild** rose 8% to turn 100: more pieces fight at camps. The force and the assault exchange are knobs (`camps.forceMargin`, `camps.assaultAppetite`) for the parameter pass.
- **The wild's thefts.** 184 civilians taken to turn 100, against 217. The bot still reads a soldier within `war.escortRadius` as a civilian's cover, where the rule needs a soldier on its own hex. Reading the rule's cover was tried and dropped (above); the next step is a guard that stands on the worker's hex, or work chosen away from the wild.
- **Walking.** Three quarters of worker-turns are a march, before and after. `workers.walkDiscount` (0.12 a hex) is a knob for the parameter pass.
- **Bare worked hexes** fell from 27% to 21% at turn 100; the page's target was under 10%. Workers held at turn 100 did not rise (146 to 144, 0.52 a town).
- **The empty town beside the wild** (P8, above): the bot's book does not rate a new defender above holding in 24 of 32 cases. Not traced, not changed.
- **A town founded during the turn** has no rows in the want book until the next turn (P8). The fix that reads the book again at a founding was measured and dropped for its cost (above), so this case stands.
- **Late gold.** At turn 150 on seeds 42 and 999 the median seat banks 1,626 gold and the richest 8,749 (1,235 and 3,466 before), and in one dropped version a seat held 16,076 at turn 138. What a late treasury should buy is the rule question P8 left for the user.
- **The endgame.** In the version that ships no game ends before turn 150 on seeds 42 and 999, and no seat holds Alchemy there at turn 150. In the dropped version that read the book again at a founding and a route hired, the Opus was finished at turns 133 and 139.
- **The check after BP8.** `docs/flags.md` asks for the commands and the seconds a turn to be measured again after this batch. The table above is that measure for seeds 999 and 42; a run over more seeds is the orchestrator's.

### Checks

- Type check clean (`npx tsc --noEmit -p .`).
- `test/sim/aiCampHunt.test.ts` (new, core, 13 tests): a camp's worth reads the bounty, and the raiders only of a camp whose nearest town is ours; the riders that scale the payout and pay on a camp cleared; the pull of an open commission that counts camps cleared. The force: no lone piece at a camp the seat cannot field a force for, a march once it can, the assault blow with the whole force beside the camp and none alone, a dug-in piece called out once a turn and none with no camp in reach. The worker: the empire's ground less every spade and every spade queued in another town, another town's bare hexes when the asking town's are finished, nothing past the look-ahead, a sleeping worker roused. The next route: two routes hired in one turn on a bench where the untouched tree hires one, and nothing beside the book while no route has been hired.
- Tests reworked: `aiBot` (the door of a held camp gets two spare pieces, so the force can be whole; the sheet register names the `camps` block) and `aiBounds` (two new whole-number knobs).
- Every core test that imports the bot, its sheet or the wild, or reads a source file (`import.meta.glob` or `readFileSync`): 252 files, 7,525 tests passed and 3 failed. One was the register in `resourceBonuses` (a reader of a piece's maximum health must pass the empire's figure; the new force reading did not, and now does). Two were load-order cases of `moduleCycles` that timed out at 30 seconds while other work on the machine held the load average at 15 to 21. After the fix the three files passed alone, and the ten bot files most touched (`aiBot`, `aiPersona`, `aiGarrison`, `aiAppraisal`, `aiWants`, `aiWar`, `aiCampHunt`, `aiBounds`, `aiRows`, `arenaPage`) passed again: 424 tests.
- The slow tier, by name: `aiDigest` (the pins above), `aiCardStamp`, `botWorker` (seed 26 as before; it passes unchanged), `aiBot`, `aiDecision`, `aiDriver`, `aiGarrison`, `aiWants`, `aiWar`, `beads`, `cityModifiers` and `barbarians` passed: 12 files, 41 tests.
- The shadow check (`test/vitest.shadow.config.ts`) passed on `aiCampHunt` and `aiSittingMemos`.
- The core tier, the build and the whole slow tier were not run. They are the orchestrator's gate.

## End check of bot pass 3, 2026-11-14

`docs/flags.md` (ooooooo): the user asked to *"continue with the build and examine at the end"* whether the bots' extra commands are sound, and BP6, BP7 and BP8 left open questions (the turn-150 fall of BP7, the culture fall of BP6 and BP8). This is a measurement only: no file under `src/`, `data/` or `test/` changed. Branch `decks` at `9a12c3aa`.

### Method

- **Trees**, each a detached `git worktree` with the main tree's `node_modules` linked in: deployed `2a73a7e5` (GitHub `main`), pre-pass `5379853b` (the commit before BP1; nothing under `src/`, `data/` or `test/` changes between it and BP1's parent), BP5 `9420cef6`, BP6 `86646802`, BP7 `ac469aab`, and now `b28f3c5e` (BP8; `9a12c3aa` changes only docs). Between BP5 and now the rules data changes in one row, the Forbidden City (BP7), so a change in play there is the bots'.
- **The game** is BP6 to BP8's: six seats with two decks each, standard map, barbarians on. Seeds 999, 42, 1, 7, 2026, 31337, 3, 5, 11, 13, 17, 23, 101, 314, 777 and 4242.
- **The probe** is a scratch script (`play.ts`, in the session's scratch folder `endcheck/`), run with `vite-node`. It needed no change for the older trees. It plays one or more trees in one process, one turn on each tree in rotation, and records, a turn: the wall and CPU time of `driveBots` (the end of the turn included), the accepted commands by type and by seat, refusals, towns, units by kind, and counters of repeated and undone orders (below). It takes a full snapshot at turns 100 and 150. It reproduced the pinned digests of BP7 and BP8 (for example `a99a216a:817383`, `eaa3d1e9:857299`, `ac7f2fa1:935726` and `fbdafb23:982630` for BP8's seed 42 at turns 20, 60, 100 and 120), so the probe does not change play.
- **Question 1** plays deployed, pre-pass and now in one process for each of seeds 999, 42, 1 and 7, so the three see the same load. The other games ran one tree a process, four at a time.
- **The yields** are `foldEmpireRates`, as in BP4 to BP8. That figure leaves out the empire-scale card lines (`explainEmpireCardYields`). For culture these are large (a quarter of what an empire banks at turn 100), so question 4 gives the banked culture too: the towns' culture plus every line of `explainEmpireLines`.
- **Paired figures.** For each seed, the ratio of one tree's total to the other's. The tables give the geometric mean of those ratios with a 95% interval (a t interval on the log ratios), the count of seeds down and up, and the change of the totals. A change whose interval holds nought is not shown at this sample size.
- **The laptop slept.** From about 15:58 the machine went into deep sleep with a dark wake of about a minute every 15 minutes, so some turns read 900 to 980 seconds of wall time and under 13 seconds of CPU. Those turns are in games of questions 2 to 4 only, which read no time. From 17:03 `caffeinate -s`, tied to the queue's process, held the machine awake. No game of question 1 has such a turn.
- **One probe fault, mended.** In the first 26 games of BP5 to now, the town half of the culture split failed (`explainCity` returns a reading, not a list). Those games were played again to turn 100 for the split; the totals were never affected.

### 1. Commands and seconds a turn

Seeds 999, 42, 1 and 7, the three trees in one process, a turn on each in rotation. Each row is the mean over the seeds of the ten turns that end at the turn named. Commands are the accepted commands without End Turn. At turn 150 the table has three seeds, because seed 1 ended at turn 129 on the current tree (seat 1 finished the Opus).

| Turn | Tree | Moves | Builds | Purchases | Cards and council | Worker orders | Others | All | Towns | Units | Commands a town | Moves a unit | Wall s | CPU s | ms a command |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 20 | deployed | 2.4 | 2.0 | 0.3 | 2.1 | 0.5 | 3.9 | 11.3 | 7.9 | 25 | 1.43 | 0.09 | 0.54 | 0.64 | 48 |
| 20 | pre-pass | 2.5 | 2.1 | 0.3 | 2.1 | 0.7 | 3.8 | 11.5 | 7.7 | 26 | 1.49 | 0.10 | 0.28 | 0.38 | 24 |
| 20 | now | 2.3 | 2.1 | 0.3 | 2.0 | 0.6 | 3.7 | 11.0 | 7.8 | 26 | 1.41 | 0.09 | 0.28 | 0.40 | 26 |
| 60 | deployed | 16.8 | 5.3 | 1.4 | 3.2 | 1.8 | 16.9 | 45.4 | 19.8 | 91 | 2.29 | 0.19 | 1.72 | 1.88 | 39 |
| 60 | pre-pass | 10.5 | 5.8 | 0.5 | 2.5 | 2.3 | 13.7 | 35.3 | 20.1 | 84 | 1.76 | 0.13 | 0.74 | 0.88 | 22 |
| 60 | now | 23.6 | 6.9 | 0.9 | 2.1 | 3.2 | 18.8 | 55.5 | 22.2 | 92 | 2.50 | 0.26 | 0.97 | 1.20 | 18 |
| 100 | deployed | 19.8 | 5.2 | 1.8 | 3.8 | 1.6 | 19.1 | 51.3 | 29.9 | 151 | 1.71 | 0.13 | 3.04 | 3.28 | 59 |
| 100 | pre-pass | 34.0 | 9.8 | 2.5 | 3.8 | 3.9 | 26.7 | 80.7 | 36.2 | 176 | 2.23 | 0.19 | 1.64 | 1.89 | 21 |
| 100 | now | 46.4 | 12.4 | 3.9 | 3.7 | 4.9 | 32.2 | 103.5 | 42.9 | 201 | 2.41 | 0.23 | 2.12 | 2.39 | 21 |
| 120 | deployed | 22.3 | 5.7 | 2.9 | 3.6 | 1.9 | 21.1 | 57.7 | 35.0 | 180 | 1.65 | 0.12 | 4.72 | 5.00 | 86 |
| 120 | pre-pass | 54.5 | 14.4 | 2.8 | 4.0 | 4.5 | 28.1 | 108.4 | 48.2 | 256 | 2.25 | 0.21 | 3.04 | 3.30 | 29 |
| 120 | now | 64.8 | 17.8 | 6.3 | 4.6 | 5.8 | 43.8 | 143.2 | 56.9 | 290 | 2.52 | 0.22 | 6.15 | 6.44 | 41 |
| 150 | deployed | 24.7 | 7.2 | 5.0 | 4.0 | 2.3 | 20.2 | 63.4 | 41.0 | 234 | 1.55 | 0.11 | 5.95 | 6.22 | 94 |
| 150 | pre-pass | 73.9 | 16.4 | 5.6 | 4.7 | 4.4 | 39.5 | 144.5 | 64.2 | 397 | 2.25 | 0.19 | 6.78 | 7.13 | 47 |
| 150 | now | 76.6 | 25.4 | 10.0 | 6.3 | 7.8 | 56.3 | 182.3 | 77.4 | 456 | 2.36 | 0.17 | 18.99 | 19.42 | 94 |

"Builds" is `setCityProduction`. "Purchases" is `purchaseItem`, `purchaseTile`, `buyRoute`, `purchaseGreatPersonOffer` and `contribute`. "Cards and council" is the draft, slot, government and Doctrine commands. "Worker orders" is `buildImprovement`, `prospect`, `chopFeature` and `removeImprovement`. In "others", turns 91 to 150, a turn: attacks 4.5 deployed, 6.8 pre-pass, 12.2 now; fortify 4.1, 9.4, 11.8; citizen focus 2.5, 4.1, 5.5; deals proposed 2.7, 3.5, 3.3 and declined 2.3, 3.0, 2.8.

Per seed, turns 141 to 150 (seed 1 on the current tree: turns 120 to 129, its last ten):

| Seed | Tree | Commands | Towns | Units | Commands a town | Wall s | ms a command |
|---|---|---:|---:|---:|---:|---:|---:|
| 999 | deployed | 61 | 39 | 244 | 1.55 | 5.99 | 99 |
| 999 | pre-pass | 104 | 55 | 359 | 1.88 | 4.26 | 41 |
| 999 | now | 185 | 69 | 426 | 2.68 | 8.49 | 46 |
| 42 | deployed | 63 | 39 | 227 | 1.61 | 5.74 | 91 |
| 42 | pre-pass | 125 | 57 | 311 | 2.19 | 6.37 | 51 |
| 42 | now | 144 | 72 | 369 | 2.01 | 6.04 | 42 |
| 1 | deployed | 146 | 46 | 326 | 3.16 | 19.11 | 131 |
| 1 | pre-pass | 200 | 69 | 462 | 2.90 | 9.09 | 46 |
| 1 | now | 221 | 75 | 434 | 2.95 | 9.07 | 41 |
| 7 | deployed | 67 | 45 | 231 | 1.49 | 6.11 | 92 |
| 7 | pre-pass | 205 | 80 | 521 | 2.55 | 9.71 | 47 |
| 7 | now | 218 | 92 | 573 | 2.38 | 42.44 | 194 |

**Where the rise comes from.** Against the pre-pass tree, the current tree gives 28% more commands a turn at turn 100, 32% more at turn 120 and 26% more at turn 150. It holds 18% to 21% more towns and 14% to 15% more units. Commands a town rose by 5% to 12%. So about two thirds of the rise is bigger empires, and one third is more commands for each town. The larger part of the rise since the deployed build came before bot pass 3: at turn 100 the pre-pass tree already gives 57% more commands than the deployed one, at 30% more commands a town.

The commands for each town that bot pass 3 added are mostly these, turns 91 to 150, a turn: attacks 6.8 to 12.2 (the camp hunt of BP8 doubled the blows on camp wardens), purchases (2.5 to 3.9 at turn 100, 5.6 to 10.0 at turn 150: routes hired, BP8), production orders (one for each item finished, so they follow the towns), worker orders (P6 raised more workers), and the loops below.

**Repeated and undone orders.** Counted on every accepted command of the same four games, turns 91 to 150, a turn (shares in brackets):

| | Deployed | Pre-pass | Now |
|---|---:|---:|---:|
| Moves | 26.8 | 56.1 | 65.9 |
| A move back to a hex the piece left in the last two turns | 4.0 (15%) | 6.3 (11%) | 10.7 (16%) |
| A second move to the same piece in the same turn | 1.9 (7%) | 4.0 (7%) | 6.4 (10%) |
| A move that changes the end of a march under way | 14.0 (52%) | 29.1 (52%) | 31.4 (48%) |
| Production orders | 6.4 | 14.2 | 19.3 |
| Of which a change of a build under way | 0 | 0.36 (3%) | 0.22 (1%) |
| Citizen-focus orders | 2.5 | 4.1 | 5.5 |
| Of which back to a focus the town held in the last five turns | 1.5 (61%) | 2.4 (58%) | 3.7 (67%) |
| Sleep and fortify orders | 4.1 | 9.6 | 13.0 |
| Of which to a piece also put to sleep the turn before | 0.08 (2%) | 0.39 (4%) | 1.34 (10%) |
| Deals proposed, and accepted | 2.7, 0.4 | 3.5, 0.5 | 3.3, 0.5 |
| Refused by the reducer; repeated orders the driver stopped | 0; 0 | 0; 0 | 0; 0 |

- **Production does not churn.** 97% to 100% of production orders fill an empty queue after an item is finished. A build under way is changed about once in 50 orders, and no town changes back.
- **Most "re-aims" are not waste.** About half of all moves change the end of a march, on all three trees. A piece that is re-asked as the board moves gets a new goal; the share did not rise.
- **Three loops, by trace** (seed 7 on the current tree, every order of turns 86 to 92 printed with the arm's summary):
  - **A prophet walks between two hexes for ever.** `prophetCommand`'s last clause, `holySiteStep` (`src/ai/bot.ts`), steps the prophet to any neighbouring hex where the ground would take a holy site, when nothing else applies. It does not ask whether the prophet stands on a town centre, or whether a site could be raised on the new hex. In a town that already holds a site, the next decision steps it back. On seed 7 seat 4's prophet made eight such moves every turn from turn 88, and two more prophets two moves each. Over the four seeds, "other civilians" (prophets, apostles, great people) made 6.1 moves back a turn at turns 141 to 150, against 2.7 before the pass. The arm is older than the pass; the bots now buy more prophets. Over all 16 games of questions 2 to 4, 7 games on the current tree show three or more such moves in a turn by turn 100, and none of 15 on the pre-pass tree.
  - **A town's focus switches every turn.** `focusCommand` puts a town on the production focus when its build waits on hammers, and back to the default when nothing waits. With the production focus the build no longer waits, so the next turn it goes back, and so on. One town on seed 7 switched on all seven turns traced. The arm is bound to one order a town a turn, but nothing stops the reversal next turn. This is on all three trees; each order also moves the economy clock, so the seat reads its towns again. Over the 16 games at turns 51 to 100, 1.9 of 3.3 focus orders a turn flip back on the current tree, and 1.1 of 2.0 before the pass.
  - **Settlers put back to sleep every turn.** `wakeIdleSettler` wakes a sleeping settler with a march once a turn, and the settler's arm puts it to sleep again. On seed 7 the current tree holds 37 settlers at turn 150 (5 on the pre-pass tree), about 10 of them put back to sleep each turn. Over the four seeds, 15.5 settlers at turns 141 to 150 against 5.8. The settlers were built and then had nowhere to go.
- **Deals.** About 3 deals are proposed a turn and one in seven is accepted, on all three trees. That is about 6 commands a turn of offers and refusals.
- Together the loops and the refused deals are about 15 commands of 150 a late turn on the current tree. They are real waste, but they are not most of the rise.

**Why seed 7 is slow.** The current tree's seed 7 takes 42 seconds a turn at turns 141 to 150 (pre-pass: 9.7), at 194 ms a command, and 10 to 22 seconds a turn at turns 109 to 117. The commands do not explain it. Two CPU profiles of a solo run of that game (BPS's `run.ts`, which played the same game: the same digests at turns 20 to 100):

- **Turns 141 to 146: 70% of the time is in `countOf` (`src/sim/statecraft/evaluator.ts`)**, through its `empireYield` arm, which calls `foldEmpireRates`. Seat 5 holds Money at Work (Commerce, "+1 science in every town for each 20 gold a turn"). That line is read in every town, and each read folds the whole empire, so one reading of the seat costs as many empire folds as it has towns (19). BP3's stamps read the seat's books twice a card, and the re-seat arm and the chair fill stamp many cards: an unslot decision took 8.6 seconds, a slot 3.7 seconds and a draft pick 2.1 seconds. On turns 145 and 146 seat 5 alone took 51 and 65 seconds. Three live Commerce Orders count the empire's gold this way: The Nest Egg (the capital only), Money at Work and Bills of Exchange (every town). BP3 found this for Bills of Exchange and left it for a speed batch. In the games of this check, about one game in four has a seat holding Money at Work or Bills of Exchange at turn 150, on every tree.
- **Turns 109 to 116: 59% of the time is in `wakeTheCampaign` (`src/ai/bot.ts`)**, through `soldierCommand`, `campaignPlan`, `musterHex` and `campaignMarch`, and 67% in `findPath`. Seat 4 (the warmonger) is at war with many pieces dug in. The arm remembers a piece (`BotSitting.called`) only when it sends it a march or a blow. A piece whose answer is to stay is not remembered, so `housekeeping` asks it again, with a full campaign plan and path searches, at every decision of the seat's turn. Seat 4 took 5 to 15 seconds of each of those turns.

On seeds 999 and 42 the cost of a command did not rise: at turns 111 to 120, 28.6 against 28.4 ms and 29.5 against 33.7 ms. At turns 141 to 150 those two seeds take 8.5 and 6.0 seconds a turn against 4.3 and 6.4, in step with their commands (185 against 104, and 144 against 125). On seed 1 the cost of a command rose by 43% at turns 111 to 120 (32.0 against 22.4 ms). There the warmonger, at war, gives 80 to 116 commands on some turns, which fits the campaign arm above, but that seed was not profiled.

**Verdict.** The rise in commands is mostly sound. About two thirds of it is bigger empires (more towns, units and workers), the rest is real work the batches asked for (camp blows, routes hired, worker orders), and production orders do not churn. About a tenth of a late turn's commands is waste in three loops (the prophet, the focus, the settlers) and in refused deals; the focus loop and the deals are older than the pass. The cost of a command did not rise on two seeds of four. On the other two it did, and on seed 7 two speed faults, not the commands, make a late turn four times as slow as before the pass.

### 2. Turn 150: BP6, BP7 and now, over 16 seeds

**BP7's four seeds reproduce.** On seeds 1, 7, 42 and 999, summed at turn 150 or at the game's end, BP6 gives 32,625 science and 6,481 gold, and BP7 25,464 and 4,671: −22% and −28%, the figures BP7 reported (its "before" read 32,624 and 6,478). So these are the same games. Two of the four seeds carry the fall: science on seed 42 falls from 6,580 to 3,545, and seed 1 from 11,514 to 7,936, while seed 7 rises from 4,933 to 6,108.

**Many games end before turn 150.** The Opus ends 3 of 16 games on BP6, 6 on BP7 (one of them on turn 150 itself) and 7 on the current tree by turn 150 (and none on the pre-pass and deployed trees, whose games of this check stop at turn 100 for 12 seeds and at 150 for four):

| Tree | Games that end before turn 150 (seed, last turn, the builder's seat) |
|---|---|
| BP6 | 1 (148, seat 3), 5 (144, seat 0), 314 (140, seat 3) |
| BP7 | 3 (135, seat 0), 5 (145, seat 0), 11 (130, seat 0), 13 (147, seat 0), 777 (148, seat 1); 314 ends on turn 150 itself (seat 1) |
| Now | 1 (129, seat 1), 2026 (147, seat 1), 5 (142, seat 3), 11 (137, seat 3), 13 (139, seat 0), 314 (135, seat 3), 4242 (146, seat 3) |

So a comparison at turn 150 holds only the seeds where no tree ended, seven of them, and it leaves out the games each tree played best. Both readings are below.

**Turn 120, all 16 seeds** (six seats summed; techs a seat):

| Figure | BP6: mean (median; low to high) | BP7 | Now | BP7 against BP6, paired | Now against BP6, paired |
|---|---|---|---|---|---|
| Towns | 57 (58; 43 to 64) | 57 (56; 48 to 70) | 60 (62; 46 to 71) | +1% [−5%, +7%], 4 down, 10 up | +6% [−3%, +16%], 5 down, 10 up |
| Units | 306 (294; 274 to 390) | 319 (315; 252 to 414) | 320 (332; 239 to 388) | +3% [−4%, +12%], 6 down, 9 up | +4% [−3%, +12%], 6 down, 10 up |
| Gold | 598 (594; 256 to 1,035) | 775 (754; 261 to 1,744) | 919 (836; 499 to 1,552) | +25% [−4%, +64%], 4 down, 12 up | +53% [+17%, +101%], 4 down, 12 up |
| Science | 1,358 (1,360; 829 to 1,868) | 1,679 (1,430; 830 to 5,111) | 2,101 (1,692; 936 to 5,080) | +14% [−8%, +42%], 6 down, 10 up | +38% [+3%, +84%], 4 down, 12 up |
| Culture | 611 (600; 377 to 1,069) | 761 (689; 351 to 1,513) | 1,067 (727; 398 to 2,365) | +20% [−3%, +49%], 5 down, 11 up | +49% [+5%, +110%], 4 down, 12 up |
| Techs known, a seat | 29.1 (29.3; 24.5 to 31.5) | 29.2 (28.8; 25.8 to 32.2) | 30.6 (30.6; 27.3 to 33.0) | +0% [−3%, +4%], 8 down, 7 up | +5% [+2%, +9%], 3 down, 13 up |

The turn-120 snapshot holds no food, production, faith or wonders (the probe's light snapshot), so those are read at turn 150 only.

**Turn 150, the seven seeds where every tree reached it** (999, 42, 7, 31337, 17, 23, 101):

| Figure | BP6: mean (median; low to high) | BP7 | Now | BP7 against BP6, paired | Now against BP6, paired |
|---|---|---|---|---|---|
| Towns | 79 (72; 66 to 96) | 80 (78; 74 to 91) | 82 (82; 71 to 93) | +2% [−12%, +19%] | +4% [−15%, +27%] |
| Units | 474 (459; 421 to 554) | 516 (507; 390 to 647) | 530 (554; 401 to 618) | +8% [−12%, +32%] | +11% [−10%, +37%] |
| Food | 3,512 (3,390; 2,741 to 5,054) | 3,364 (2,816; 2,358 to 6,119) | 4,002 (3,274; 2,712 to 6,242) | −8% [−33%, +26%] | +10% [−28%, +69%] |
| Production | 6,472 (6,684; 3,331 to 9,525) | 8,943 (6,906; 3,102 to 26,093) | 7,396 (5,783; 3,873 to 15,641) | +15% [−47%, +151%] | +9% [−24%, +58%] |
| Gold | 1,329 (1,399; 685 to 1,911) | 1,528 (1,187; 936 to 3,458) | 1,554 (1,311; 1,018 to 2,749) | +10% [−34%, +82%] | +18% [−37%, +121%] |
| Science | 5,195 (4,933; 2,238 to 9,598) | 6,422 (4,512; 3,263 to 16,341) | 5,349 (4,154; 3,373 to 9,443) | +14% [−33%, +92%] | +6% [−37%, +76%] |
| Culture | 2,268 (1,998; 1,057 to 3,885) | 2,561 (1,765; 1,038 to 4,787) | 2,711 (1,950; 1,325 to 5,160) | +7% [−44%, +102%] | +17% [−44%, +143%] |
| Culture banked (with the empire lines) | 3,084 (2,547; 1,284 to 4,818) | 3,731 (2,515; 1,756 to 7,676) | 3,960 (3,152; 2,266 to 6,539) | +14% [−39%, +114%] | +31% [−33%, +153%] |
| Faith | 668 (609; 333 to 1,200) | 640 (575; 361 to 1,338) | 685 (717; 402 to 1,002) | −4% [−29%, +30%] | +7% [−31%, +66%] |
| Techs known, a seat | 36.4 (37.2; 32.5 to 38.7) | 36.9 (36.2; 34.2 to 39.0) | 38.5 (38.2; 37.3 to 40.8) | +1% [−4%, +7%] | +6% [+0%, +12%] |
| Wonders built | 24 (24; 17 to 27) | 23 (22; 19 to 27) | 24 (24; 22 to 26) | −3% [−16%, +13%] | +1% [−11%, +14%] |
| Seats eliminated | 1 seat in 7 games | none | none | | |

Per seed, science at turn 150 or at the game's end (marked *), BP6 / BP7 / now: 999 9,598 / 7,875 / 6,215; 42 6,580 / 3,545 / 3,373; 1 11,514* / 7,936 / 3,286*; 7 4,933 / 6,108 / 9,443; 2026 3,284 / 7,316 / 5,028*; 31337 4,995 / 16,341 / 4,154; 3 3,064 / 6,353* / 14,140; 5 4,954* / 10,732* / 3,425*; 11 3,642 / 4,186* / 14,576*; 13 7,949 / 13,093* / 10,466*; 17 3,490 / 3,263 / 6,482; 23 2,238 / 3,312 / 4,005; 101 4,534 / 4,512 / 3,772; 314 6,674* / 5,834 / 10,584*; 777 4,418 / 8,281* / 8,812; 4242 5,419 / 5,307 / 9,024*. The spread between seeds is three to one inside one tree.

**Verdict.** The fall BP7 saw is not real at this sample size. It is the spread of four seeds, two of which carry it. Over 16 seeds at turn 120, BP7 reads no change against BP6 (every interval holds nought), and the current tree reads more gold, science, culture and techs, each with an interval above nought. At turn 150 no figure differs with an interval that excludes nought, on the seven seeds that allow the comparison. The current tree and BP7 also finish the Opus before turn 150 twice as often as BP6.

### 3. The whole pass: before BP1 and now, turn 100, 16 seeds

No game ended before turn 100 on either tree. Six seats summed, except where a figure says "a seat":

| Figure | Pre-pass: mean (median; low to high) | Now: mean (median; low to high) | Now against pre-pass, paired |
|---|---|---|---|
| Towns | 37 (37; 31 to 46) | 45 (44; 38 to 53) | +22% [+14%, +30%], 1 down, 15 up |
| Citizens | 215 (214; 176 to 254) | 313 (299; 250 to 409) | +44% [+33%, +57%], 0 down, 16 up |
| Units | 175 (170; 127 to 220) | 217 (218; 167 to 293) | +24% [+15%, +34%], 1 down, 15 up |
| Soldiers | 149 (146; 102 to 187) | 162 (160; 130 to 223) | +9% [−1%, +19%], 7 down, 8 up |
| Food | 776 (756; 547 to 1,287) | 1,192 (1,128; 925 to 1,806) | +54% [+39%, +69%], 0 down, 16 up |
| Production | 611 (587; 459 to 964) | 1,135 (1,096; 608 to 1,786) | +82% [+54%, +115%], 0 down, 16 up |
| Gold | 180 (158; 118 to 278) | 392 (378; 196 to 578) | +115% [+65%, +179%], 1 down, 15 up |
| Science | 451 (440; 364 to 586) | 859 (867; 627 to 1,237) | +89% [+72%, +107%], 0 down, 16 up |
| Culture | 264 (251; 146 to 357) | 400 (348; 253 to 741) | +46% [+20%, +78%], 2 down, 14 up |
| Culture banked (with the empire lines) | 359 (350; 162 to 497) | 533 (460; 327 to 929) | +46% [+17%, +82%], 4 down, 12 up |
| Faith | 87 (81; 40 to 152) | 177 (189; 81 to 284) | +99% [+58%, +151%], 1 down, 15 up |
| Gold banked | 1,566 (1,532; 1,137 to 2,088) | 2,528 (2,604; 1,545 to 3,349) | +61% [+41%, +84%], 1 down, 15 up |
| Techs known, a seat | 20.5 (20.6; 18.3 to 22.8) | 25.3 (25.3; 22.8 to 27.0) | +23% [+20%, +27%], 0 down, 16 up |
| Wonders built | 8 (8; 4 to 10) | 11 (11; 8 to 15) | +53% [+32%, +79%], 1 down, 15 up |
| Orders held, a seat | 12.6 (12.4; 10.5 to 15.2) | 13.1 (13.2; 10.8 to 14.7) | +4% [−4%, +12%], 8 down, 8 up |
| of the seat's main deck | 11.1 (11.2; 9.2 to 13.5) | 7.0 (6.8; 5.8 to 9.2) | −37% [−42%, −31%], 16 down, 0 up |
| of its second deck | 1.1 (1.1; 0.5 to 2.3) | 3.7 (3.8; 2.5 to 4.8) | +264% [+181%, +371%], 0 down, 16 up |
| common | 0.7 (0.7; 0.3 to 1.0) | 2.5 (2.7; 1.3 to 3.2) | +295% [+211%, +401%], 0 down, 16 up |
| Seats with 3 or more of the second deck (of 96) | 13 | 73 | |
| Doctrines, a seat | 1.90 (1.83; 1.67 to 2.33) | 2.29 (2.33; 2.00 to 2.50) | +21% [+14%, +29%], 0 down, 14 up |
| Drafts taken, a seat | 12.8 (12.7; 10.5 to 15.2) | 14.4 (14.5; 12.3 to 16.8) | +13% [+5%, +22%], 4 down, 11 up |
| Commissions met (all 16 games) | 4 | 7 | |
| Camps cleared | 15 (14; 8 to 25) | 21 (21; 9 to 34) | +42% [+25%, +63%], 0 down, 16 up |
| Improvements built | 162 (158; 134 to 224) | 247 (252; 185 to 302) | +53% [+41%, +66%], 0 down, 16 up |
| Great people called | 8 (8; 3 to 15) | 20 (20; 15 to 25) | +169% [+104%, +254%], 0 down, 16 up |
| Religions founded (all 16 games) | 28 | 57 | |
| Seats eliminated | none | none | |

"Main" and "second" are the seat's two decks by the count of Orders it holds of each, as in BP6. The pre-pass tree holds the great-people rules of GP1 (`5379853b` is that commit), so the rise in great people is the bots' (BP2's great-person gate and P3).

**Verdict.** At turn 100 bot pass 3 made the bots stronger on every figure, on 14 to 16 seeds of 16, with every interval well above nought: half again as many citizens, twice the gold and faith, nine tenths more science, a fifth more towns and techs, half again as many wonders, improvements and camps cleared, and more than two and a half times the great people. The decks are mixed now: a seat's main deck went from 88% of its Orders to 53%.

### 4. Culture

The same 16 seeds at turn 100, for BP5, BP6, BP7 and now. Six seats summed.

| Figure | BP5 | BP6 | BP7 | Now | BP6 against BP5, paired | Now against BP5, paired |
|---|---:|---:|---:|---:|---|---|
| Culture a turn | 404 | 319 | 360 | 400 | −21% [−32%, −9%], 14 down, 2 up | −5% [−18%, +11%], 10 down, 5 up |
| Culture banked (with the empire lines) | 516 | 424 | 470 | 533 | −20% [−35%, −1%], 12 down | +0% [−15%, +18%], 10 down |
| Towns | 42 | 42 | 44 | 45 | +2% [−4%, +8%] | +8% [+2%, +14%] |
| Citizens | 267 | 278 | 288 | 313 | +5% [−3%, +14%] | +18% [+8%, +28%] |
| Culture a town | 9.8 | 7.5 | 8.2 | 8.8 | | −12% [−24%, +3%], 12 down, 4 up |
| Faith a turn | 145 | 150 | 140 | 177 | +4% [−8%, +18%] | +21% [−3%, +51%] |
| Wonders built | 10 | 10 | 11 | 11 | +2% [−10%, +15%] | +11% [+0%, +23%] |
| Orders held, a seat | 13.7 | 12.3 | 12.6 | 13.1 | −10% [−15%, −5%], 14 down | −5% [−11%, +2%] |
| Orders held that pay culture (six seats) | 17.1 | 13.6 | 14.0 | 14.6 | | −17% [−33%, +4%], 10 down |
| Drafts taken, a seat | 14.0 | 13.5 | 13.7 | 14.4 | −4% [−9%, +2%] | +3% [−3%, +10%] |
| Amphitheaters held | 5.1 | 2.0 | 4.3 | 3.6 | | a town: −39% [−56%, −15%], 13 down |
| Monuments held | 31.4 | 29.6 | 29.7 | 34.3 | | a town: +1% [−4%, +6%] |

Step by step, culture a turn: BP5 to BP6 −21% [−32%, −9%], BP6 to BP7 +12% [+0%, +25%], BP7 to now +8% [−10%, +30%].

Where the culture comes from: the towns' lines by the Ledger's class (`CityYieldLine.class`) and the empire lines by origin, means over the 16 seeds:

| Part | BP5 | BP6 | BP7 | Now | BP6 against BP5 | Now against BP5 |
|---|---:|---:|---:|---:|---|---|
| Town lines: Orders and other cards | 75.6 | 44.8 | 49.7 | 54.1 | −45% [−63%, −20%], 11 down | −42% [−60%, −16%], 13 down |
| Town lines: buildings | 108.0 | 83.8 | 102.2 | 110.1 | −22% [−33%, −9%], 12 down | +2% [−10%, +16%] |
| Town lines: religion | 51.6 | 39.6 | 36.8 | 47.4 | −12.0, 9 down | −21% [−48%, +19%] |
| Town lines: worked hexes | 42.9 | 38.4 | 50.6 | 53.4 | −17% [−39%, +14%] | +16% [−12%, +52%] |
| Town lines: wonders | 6.8 | 6.9 | 7.8 | 8.8 | −4% [−30%, +32%] | +35% [+13%, +60%], 0 down |
| Town lines: great people | 3.5 | 2.9 | 1.9 | 5.3 | | |
| Town lines: other (the palace and the rest) | 41.6 | 42.4 | 43.9 | 44.8 | +2% | +8% [+2%, +14%] |
| Town percentages | 49.6 | 41.8 | 41.9 | 48.6 | −7% [−47%, +65%] | +6% [−36%, +75%] |
| Empire lines: cards | 106.9 | 95.6 | 104.4 | 125.2 | −11.3, 8 down | +18.4, 8 down |
| Empire lines: luxuries, routes, the empire stage | 29.6 | 27.7 | 30.6 | 34.9 | +9% | +5.3 |

- **BP6 cut culture by a fifth, on 14 seeds of 16.** That is real at this sample size. The cut is in three places: culture that Orders pay in towns (−31 a turn, −45%), buildings (−24, −22%, with Amphitheaters 5.1 to 2.0) and religion (−12). Drafts barely moved (−4%), but each seat held 10% fewer Orders.
- **BP7 and BP8 brought most of it back.** Buildings came back to BP5's level, and worked hexes, wonders and the empire's card lines rose. At 16 seeds the current tree is not lower than BP5 on the mean: −5% [−18%, +11%], and the banked culture +0% [−15%, +18%]. The typical seed is lower (median −16%; 10 down, 5 up), and two seeds far higher (seed 11 +69%, seed 4242 +83%) hold the mean up. The −14% of BP6 and the −10% of BP8 were each on six seeds.
- **What stays lower is the culture Orders pay in towns**: −42% [−60%, −16%], on 13 seeds of 16. The bots hold fewer culture Orders (17.1 to 14.6 over six seats), and the ones they stopped holding are common cards of one deck with a culture line that needs a condition. Summed over the 16 games, BP5 to now: The Staple Right 14 to 1, The Harbour Cities 12 to 1, Conquered Archives 9 to 3, The Old Holy Places 6 to 1, The Common Road 11 to 6, Civic Receipts 4 to 0, The Pilgrim Staff 6 to 2, The Coast 8 to 4. Those that rose: The Working Court 2 to 9, The Martyrology 5 to 11 (an empire line), Names in Stone 0 to 6, The Seven Sights 0 to 5, Public Gatherings 14 to 19. This is B1, the deck bonus removed in BP6: the bonus kept a seat's own-deck commons, and on their own price these lose to other cards.
- **More towns with less each.** Culture a town is −12% [−24%, +3%] (12 down) and a citizen −16%, while towns are +8% and citizens +18%.

**Verdict.** At 16 seeds, culture is not lower now than at BP5 on the mean (−5%, interval −18% to +11%), and the culture an empire banks is the same. It fell at BP6 by a fifth (real, 14 seeds of 16) and came back in BP7 and BP8. The part that stays lower is the culture Orders pay in towns (−42%), because without the deck bonus the bots stop drafting the culture commons of their own deck. Not fixed.

### What this check could not measure

- **Seconds a turn outside question 1.** The games of questions 2 to 4 ran one tree a process, under different loads, and some of them through the laptop's sleep, so their times are not compared.
- **The deployed tree over many seeds.** Question 1 has four seeds for the deployed tree, and its turn-150 row three, because the current tree's seed 1 ended at turn 129.
- **Seed 1's slow turns** (a 43% higher cost a command at turns 111 to 120) were not profiled. The warmonger was at war there, which fits the campaign arm, but that is not shown.
- **The empire-scale card lines of gold and science.** The yields of questions 2 and 3 are `foldEmpireRates`, as in BP4 to BP8, which leaves out the empire-scale card lines. For culture the banked figure is given; for gold and science the earlier games of this check did not record those lines, so the tables do not hold them.
- **The cost of the loops in seconds.** The prophet, focus and settler loops are counted in commands. Each command costs a decision, and a focus order also moves the economy clock, but their share of a turn was not profiled.
- **Commissions** stay too few to read: 4 met in 16 games to turn 100 before the pass, 7 now.
- **The turn-150 yields** can be compared on seven seeds only, because so many games end earlier with the Opus.

### Faults to fix next, in this order

1. **The empire's gold counted in every town** (speed). Money at Work and Bills of Exchange pay in every town by a count of the empire's gold a turn (`count: 'empireYield'`), and each town's read folds the whole empire (`countOf` calls `foldEmpireRates`). With BP3's stamps a seat that holds one takes seconds for each council decision: 70% of seed 7's turns 141 to 146, up to 65 seconds for one seat's turn, 42 seconds a turn at turns 141 to 150 against 9.7 before the pass. About one game in four has such a seat by turn 150. A reading of the empire's rates kept on the economy clock for the count, which `readEmpireRates` already is, would make it one fold. BP3 proposed this for a speed batch.
2. **The campaign arm asks the same dug-in pieces again at every decision** (speed). `wakeTheCampaign` remembers a piece only when it sends it a march or a blow, so a piece whose answer is to stay gets a full campaign plan and path searches at every `housekeeping` decision of its seat's turn: 59% of seed 7's turns 109 to 116, 5 to 15 seconds of each turn for the warmonger. Remembering every piece asked for the rest of the seat's turn would end it, at the cost of not seeing a board that moved within the turn.
3. **The prophet that walks between two hexes** (play and commands). `holySiteStep` steps a prophet to any neighbouring hex whose ground would take a holy site, when nothing else applies, without asking whether it stands on a town centre or whether a site could then be raised. In a town that holds a site already it walks back and forth for the rest of the game. It shows in 7 of 16 games by turn 100 on the current tree (none before the pass), and at turns 141 to 150 of question 1 at 6 moves back a turn. The faith spent on the prophet is lost too.
4. **The citizen focus that switches every turn** (commands and speed). `focusCommand` moves a town to the production focus when its build waits on hammers and back when nothing waits, and the move removes the reason. Two thirds of focus orders return to a focus the town held in the last five turns, on every tree. Each order moves the economy clock, so the seat reads its towns again. A margin, or a focus kept for some turns, would stop it.
5. **Settlers with nowhere to go** (play). Late in the game settlers pile up: 15.5 at turns 141 to 150 in question 1 against 5.8 before the pass, and 37 on seed 7 at turn 150, about 10 of them woken by `wakeIdleSettler` and put back to sleep each turn. The production spent on them is lost. The settler's price could read the sites still open.
6. **Deals that are declined** (commands). About 3 deals are proposed a turn and one in seven is accepted, on every tree. That is about 6 commands a turn for half a deal.

## BP9: the faults of the end check, 2026-11-15

`docs/flags.md` (ooooooo), the bullet "BP9: the faults the end check found, ruled 2026-11-14". The user, on faults 1 to 3: *"yes go for it."* On faults 4 and 5: *"4 and 5 feel like genuine bugs, this should be patched out. I think it's fine to just prevent the bots from doing that, unless there's a more elegant solution."* Fault 6 (refused deals) is not in this batch.

### Method

- **Trees**, each a detached `git worktree` with the main tree's `node_modules` linked in: the **old tree** is `74d8da0e` (BP8 and two commits of docs), **f12** is the old tree with fixes 1 and 2 only, and the **new tree** is the whole batch. The apostle's clause (fault 3, below) came last, after most runs; where a figure comes from the batch without it, the text says so.
- **The game** is the end check's: six seats with two decks each, standard map, barbarians on.
- **The probe** is the end check's `play.ts` with three more counters (`play9.ts` in the session's scratch folder `bp9/`): prophet moves back to a hex the prophet left in the last two turns, focus orders that undo the town's last focus order (by the turns between them), and settlers asleep at the end of each turn. The other counters are the end check's, defined the same way.
- **Traces** restore a state snapshot and the bot's harness memories (`readHarnessMemory`). A snapshot without the memories plays a different game: the war ledger is part of what decides a campaign.

### Fault 1: the empire's gold counted in every town (speed)

- **Cause.** Money at Work and Bills of Exchange pay in every town by the empire's gold a turn (`count: 'empireYield'`). The count's arm in `countOf` calls `foldEmpireRates`, and that folds every town of the empire again. So one reading of an empire of N towns cost about N × N town readings. The thunk of `explainEmpireCardYields` folds the empire as well, and its towns' counts folded it once more each. BP3's stamps read the seat's books on two ghost boards a card, cold.
- **Why not `readEmpireRates`.** The memo cannot go on `foldEmpireRates`: that fold is asked inside handlers and phases, where writes to `City.queue` and the baskets do not move the economy clock (`slate.ts`, batch P1). And the count asks under its own recursion cut, which gives a different answer from the plain fold. `readEmpireRates` is the plain fold over the `readCity` lists, which themselves hold the count, so it is the wrong figure for the count. `src/sim/yields/` still imports nothing from `readings.ts`.
- **Fix.** A scope, `readingAtRest` (`statecraft/evaluator.ts`), for readers that ask while no command or phase is part of the way through a write. The four readings of `readings.ts` (`readEmpirePercents`, `readCity`, `readEmpire`, `readEmpireRates`) compute inside it, and so does every bot decision (`nextBotDecision`, which now wraps `decideNext`). Inside the scope the count reads `restingCutRates`: the same fold, under the same cut, remembered on the economy clock and keyed by seat and by the four recursion cuts (`conditionDepth`, `meterDepth`, `suppliesDepth`, `heldDepth`). Outside the scope the count folds fresh, as before.
- **Checks.** The figures do not change: the digests of seeds 7, 999, 42 and 1 on the f12 tree equal the old tree's at every snapshot to turn 120 (seed 7 also at 150), and both pins held with fixes 1 and 2 alone. `test/sim/empireYieldAtRest.test.ts` (new, 4 tests): every town is paid the same inside the scope and outside; inside it the fold is remembered until the clock moves; outside it an unannounced write is seen at once; the shadow check disbelieves every hit of a four-town fixture and of a bot decision; and a source register (the four readings, the bot's one entry, nothing in the reducer, the phases or the yields folds).
- **Profile** (seed 7, turns 141 and 142 from a snapshot): 20.2 s before, `countOf` 49% and `foldEmpireRates` 41%; 11.8 s after, `foldEmpireRates` 12%. What is left of `countOf` (25%) is a different count, `buildingsSupplying`, through the building packages.

### Fault 2: the campaign's dug-in pieces asked again (speed)

- **Cause.** `wakeTheCampaign` asks every dug-in field soldier of a seat at war at every housekeeping decision, and remembers a piece (`BotSitting.called`) only when it sends a march or a blow. On seed 7, turn 109, seat 4 asked 483 times; 431 answers were "nothing" and 36 were "dig in". Each such ask cost 40 to 90 ms: the plan's muster (`musterHex`, a search from the home town) and then four searches to the hexes beside the target town, which all failed ("no route to it"), each one a flood of the whole reachable ground.
- **Why the answer is not remembered.** A remembered "stay" would change play. Counted on the counting tree, the pinned 120-turn duel holds 137 asks whose earlier answer that turn was to stay and whose later answer was a march or a blow (the standard board 34), after another piece moved off a goal, joined the muster or struck. Remembering until the board's full fingerprint changes would hit 12% and 18% of the asks (seed 7, turns 109 and 110), because a piece of the seat moves between nearly every two asks.
- **Fix.** Each ask is cheaper, with the same answers. `campaignMarch` searches its push goals and its muster goals each as one list, and `musterHex` its road's goals, through `findPathToFirst` (`pathfind.ts`): the route it returns is the route a loop of `findPath` returns, and a failed search proves which later goals cannot be reached. A target across the water costs one failed search and not four. `routeEndsOn` (`bot.ts`) names the goal the route ends on, so the feed's candidates are the same.
- **Checks.** The digests of the four seeds and both pins (above). The 59% of the end check is reproduced from a snapshot with the harness memories: turn 109 took 8.8 s, `wakeTheCampaign` 59%, `musterHex` 34%. With fixes 1 and 2, turns 109 and 110 took 4.2 s together, `wakeTheCampaign` 28%, `musterHex` 20%. No new test: the change is an exact replacement and the digests are its test.

### Fault 3: the prophet that walks between two hexes

- **Cause.** `prophetCommand`'s last clause, `holySiteStep`, stepped the piece to the first neighbour in `mapRange` order whose *ground* would take a holy site. It did not ask whether the piece could raise a site there. A prophet whose faith is founded, with no belief left to take, standing in a town that already holds its site, therefore stepped to a neighbour where the same three facts held, and the next decision stepped it again. Two hexes are each the other's first legal neighbour, so it walked back and forth: no score made either hex look better. The end check counted eight such moves a turn on seed 7 from turn 88; the BP9 trace of turn 109 shows one prophet's two steps of that turn, to `(63,10)` and back to `(62,9)`.
- **Which batch.** The step is the naive bot's (`0269b439`, 2026-08-31), written for a bought prophet on its town's centre. Batch F3 (`355b27ef`, 2026-09-11) added the one-site-a-town clause to the planting (`townWantingSite`) but not to the step, and from then a prophet with nothing to raise loops. It is not one batch of bot pass 3: the pre-pass tree loops too (seed 2026, 12 civilian moves back by turn 100 in the end check's data), and the batch trees BP1 to BP4 on seeds 999, 2026 and 1 show 0 to 50 by turn 100 with no trend. Bot pass 3 made idle prophets common: more faith (+99% at turn 100), twice the religions, and a want book that buys a prophet for acts the prophet's arm never takes (below, "Not done").
- **Fix.** `holySiteStep` steps only to a hex where the piece could raise a site on its next order: the reducer's own gate, `plantHolySiteError`, asked of a positional copy of the piece on that hex (`plantErrorOn`), and, for a faith already founded, a town holding that hex with no site yet (`townWantingSiteAt`). A piece with no such hex stands down and sleeps. The feed's sentence now says "Steps to (x,y), where it can raise a holy site on its next order."
- **Test.** `test/sim/aiEndCheckLoops.test.ts`: a prophet with nothing to raise is not stepped (on the old tree this test fails: the order is `moveUnit`), and a bought prophet on the centre of a town that wants a site still steps, and then plants.
- **The apostle, one arm over.** BP9's own games showed the same loop in `apostleCommand`: the walk to a town that would keep the apostle's relic asked only whether the town had a cathedral (`cityWouldKeepRelic`), not whether it kept a relic already. An apostle with a charge left walked between two such towns (seed 7 on the new tree, turn 133 on: Junipers Rest and Pinehollow, three moves a turn). The walk now asks `placeRelicError` of a positional copy too (`relicErrorOn`). Both positional copies stand the piece on the hex with a move to act with (`boardWithPieceOn`). The want book's relic price (`explainRelic`) already skipped a town that keeps one. Test: `aiEndCheckLoops.test.ts`, an apostle between two towns that keep relics does not walk, and walks once one of them keeps none (fails on the old tree). This change leaves all 16 games identical to turn 100.

### Fault 4: the town whose focus switches every turn

- **Cause.** The two readings do not disagree by the focus. Priced on both foci at the same turn, a town gets the same answer: Elmsgate (seed 7, seat 4) on turns 60 to 63 and Stonebridge (seat 5) on turns 110 to 113 gave the same best focus on both foci on all eight turns. On one turn the two scores differed by 5 points; the answer did not. What moves is the price the table charges for the gold and science the lean gives up. It is the want book's live price, set by the best thing gold can buy that turn (a soldier's wage, a route, the town's own archer), and it swings: Elmsgate priced a coin at 19.8, 22.3, 11.4 and 21.2 on turns 60 to 63, while its lean on the hammers won or lost by 1 to 24 points against a hammer term of 56 to 78. So the answer flipped nearly every turn. A second, smaller part: when both sheets place the citizens on the same hexes, the arm still orders the balanced focus, and the next turn's ground can flip it back.
- **Fix: the user's guard.** No simple fix of the cause exists: the price is the seat's, and a margin on a score near nought needs a scale of its own. So the bot does not change a town's focus back within `driver.focusHoldTurns` (5) turns of its own order. The orders are dated in a new harness memory, `focusRoll.ts` (`noteFocusOrder`, `lastFocusOrder`, copied to the bot worker through `harnessMemory.ts`). A town whose focus another hand changed is not held. A hold that ended when the town's build changed was tried and dropped: on four seeds to turn 100 it left 193 of 257 quick undos standing.
- **Test.** `test/sim/aiEndCheckLoops.test.ts`: the bot undoes a focus it did not give; it leaves a town on its own order within the hold; it may change it after the hold; it ignores an order the town no longer stands on; and the roll travels with the harness memory. `aiWants.test.ts`' record of the focus arm empties the roll before each sitting, since what it tests is the arm's comparison.

### Fault 5: the settlers that pile up

- **Cause, in three parts** (traced on seed 7, turns 141 to 145, from a snapshot with the harness memories):
  - **The waking is the simulation's, not `wakeIdleSettler`'s.** `wakeSleepers` (`turn.ts`) wakes a sleeping piece whenever a foreign soldier is in its sight, which on a full late map is every turn. The idle-unit blocker then asks the settler's arm, which answers "Nowhere legal to found and nowhere better to walk. Sleeps." On seed 7 that was 40 sleep orders in five turns. `wakeIdleSettler` never wakes a settler without a site: it sends only a march or a founding. It did ask every sleeping settler again at every housekeeping decision, which cost 2% of a late turn.
  - **The settler row ignored the settlers already waiting.** Seat 5 held 13 settlers, 7 of them asleep, and three of its towns started a settler in one turn, each valued at 765 points: "a step of the next town at (34,24), one of 1 thing still to happen". With a settler standing, the expansion chain's one step is the escort for the next site when that site is dangerous, and `unitRoleValue` read the share of whatever step was left.
  - **No site at all was priced as a whole town.** When no legal site is in reach of any town (`nextTownChain` answers `null`), `unitRoleValue` priced a settler at `explainNextTown` in full ("one more town, with nowhere yet legal to put it"), while the faith purchase of the same piece (`expansionTerm`) read nought.
- **Fix: the user's guard, and the no-site case.** A settler row, in the queue (`unitRoleValue`) and in the faith purchase (`expansionTerm`), is worth nothing while a settler of the seat sleeps for want of a site (`settlerWaits`, `chain.ts`). The queue's row is worth nothing when no site is in reach of any town. A sleeping settler is asked again once a turn (`BotSitting.roused`, `wakeIdleWorker`'s bound). Nothing was built for the waking itself: it is a rule of the simulation, and a civilian's only standing order is sleep.
- **Tried and dropped: the escort's share.** Pricing a settler row only while the chain still owes a settler (the escort's share left to soldiers) is the more exact cause fix. It cost 2 to 6 towns a game at turn 100 on all four seeds measured (999: 52 against 55, 42: 34 against 40, 1: 33 against 35, 7: 44 against 46, with and without it), because the extra settlers it stops early in the game find other sites. It is left for the user (below).
- **Test.** `aiEndCheckLoops.test.ts`: a town prices a settler at a step of the next town when no settler of the seat stands, and at nothing while one sleeps, with the term that says so.

### Speed

One process a seed, the trees in rotation, a turn on each, as the end check did. Wall seconds a turn. The machine carried other load during these runs (load average 4 to 25), so compare only the rows of one seed and band. f12 plays the same game as the old tree (the same digests), so that pair is the clean measure of fixes 1 and 2. The new tree plays a different game.

| Seed and turns | Run | Old tree | Fixes 1 and 2 (f12) | Whole batch |
|---|---|---:|---:|---:|
| 7, turns 109 to 116 | three trees | 12.80 s, 147 commands, 87 ms each | 6.41 s, 147, 44 ms | 4.21 s, 125, 34 ms |
| 7, turns 109 to 116 | two trees, final code | 13.89 s, 147, 94 ms | | 4.62 s, 125, 37 ms |
| 7, turns 141 to 150 | three trees | 40.34 s, 218, 185 ms | 16.14 s, 218, 74 ms | 14.41 s, 158, 91 ms (turns 141 to 146) |
| 7, turns 141 to 150 | two trees, final code | 31.33 s, 218, 143 ms | | 9.87 s, 155, 64 ms (turns 141 to 146) |
| 999, turns 100 to 120 | three trees | 4.38 s, 105, 42 ms | | 5.63 s, 139, 41 ms |
| 999, turns 100 to 120 | first run | 1.67 s | 1.68 s | |
| 42, turns 100 to 120 | three trees | 3.72 s, 99, 38 ms | | 7.50 s, 146, 51 ms |
| 42, turns 100 to 120 | first run | 1.53 s | 1.55 s | |

"Three trees" ran the old tree, f12 and the batch without the apostle's clause in one process a seed; that clause changes nothing in seed 7 before turn 133. "Two trees, final code" ran the old tree and the final batch. "First run" is an earlier run of the three trees, stopped at turn 125, on a less loaded machine. The new tree's seed 7 ends at turn 147 (seat 1 finishes the Opus), so its late row is turns 141 to 146.

- **Seed 7, turns 109 to 116**: fixes 1 and 2 halve the turn on the same game, and the cost of a command falls from 87 to 44 ms. The whole batch takes it to a third.
- **Seed 7, turns 141 to 150**: fixes 1 and 2 take the turn from 40.3 to 16.1 seconds on the same game, 185 to 74 ms a command. The whole batch plays a smaller late game there (82 towns against 92, 474 units against 573) and takes about a third of the old tree's time.
- **Seeds 999 and 42, turns 100 to 120**: fixes 1 and 2 change nothing there (a separate run of the three trees: 1.67 against 1.68 s and 1.53 against 1.55 s), because no seat holds Money at Work or Bills of Exchange and no seat is at war with dug-in pieces. The new tree is slower on those two seeds because its games are bigger: 63 towns against 51 and 50 against 44 at turns 100 to 120, with 139 against 105 and 146 against 99 commands a turn.

### The loops

All 16 seeds of the end check to turn 100, the old tree and the new one in rotation in one process a seed.

| Turns 51 to 100, a turn | Old tree | New tree |
|---|---:|---:|
| Prophet moves back to a hex it left in the last two turns | 0.53 | 0.00 |
| Games with a turn of three or more such moves by turn 100 | 7 of 16 | 0 of 16 |
| Focus orders | 3.28 | 2.14 |
| Of which back to a focus the town held in the last five turns | 1.92 | 0.77 |
| Of which undoing the town's last order within four turns | 1.74 | 0.00 |
| Accepted commands | 79.7 | 76.8 |

The old tree reproduces the end check: 7 of 16 games with the prophet loop, and 1.9 of 3.3 focus orders a turn going back. On the new tree the focus orders that still go back come five turns or more after the order they undo.

The last ten turns of each game of the speed runs (the end check's rule for a game that ends early). Settlers held, settlers asleep at the end of the turn, settlers put to sleep again on the turn after a sleep, and prophet moves back, each a turn:

| Seed | Old tree: turns | Settlers | Asleep | Slept again | Prophet back | New tree: turns | Settlers | Asleep | Slept again | Prophet back |
|---|---|---:|---:|---:|---:|---|---:|---:|---:|---:|
| 999 | 141 to 150 | 10.2 | 3.4 | 2.0 | 3.5 | 131 to 140 (ends 141) | 12.0 | 6.4 | 0.0 | 0.0 |
| 42 | 141 to 150 | 5.6 | 0.1 | 0.0 | 6.4 | 117 to 126 (ends 127) | 11.1 | 0.0 | 0.0 | 0.0 |
| 1 | 120 to 129 (ends 130) | 16.4 | 1.9 | 0.5 | 4.9 | 134 to 143 (ends 144) | 7.8 | 1.8 | 0.1 | 0.0 |
| 7 | 141 to 150 | 30.6 | 10.7 | 7.5 | 8.2 | 137 to 146 (ends 147) | 14.0 | 4.9 | 1.0 | 0.0 |
| Mean | | 15.7 | 4.0 | 2.5 | 5.8 | | 11.2 | 3.3 | 0.3 | 0.0 |

Seeds 999 and 42 of the new tree are the batch without the apostle's clause. The old tree reproduces the end check (15.5 settlers and 6.1 civilian moves back a turn at turns 141 to 150). On the new tree, seed 7, where the fault was found, holds half the settlers and a seventh of the sleep orders, and no prophet or apostle walks back. The sleeping settlers stop growing: on seed 999 they stand at 6 or 7 from turn 124 to 140. The settlers that grow are awake and marching (seeds 999 and 42, which also hold 17% and 24% more towns at turns 111 to 120); see "Not done".

### Play at turn 100

Six seeds, six seats summed (the yields are `foldEmpireRates`, as in the end check):

| Seed | Tree | Towns | Units | Food | Production | Gold | Science | Culture | Faith |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 999 | old | 45 | 188 | 931 | 949 | 518 | 931 | 283 | 103 |
| 999 | new | 55 | 245 | 1,320 | 1,468 | 733 | 1,108 | 383 | 144 |
| 42 | old | 40 | 167 | 1,052 | 695 | 260 | 734 | 268 | 81 |
| 42 | new | 40 | 184 | 1,244 | 1,595 | 460 | 710 | 595 | 125 |
| 1 | old | 53 | 293 | 1,340 | 1,786 | 336 | 859 | 470 | 234 |
| 1 | new | 35 | 265 | 1,028 | 1,334 | 300 | 431 | 309 | 86 |
| 7 | old | 44 | 226 | 1,119 | 1,182 | 327 | 893 | 460 | 201 |
| 7 | new | 46 | 191 | 936 | 1,189 | 365 | 990 | 498 | 120 |
| 2026 | old | 52 | 205 | 952 | 1,182 | 373 | 875 | 306 | 212 |
| 2026 | new | 44 | 203 | 1,212 | 1,595 | 490 | 1,052 | 389 | 225 |
| 31337 | old | 42 | 217 | 1,024 | 881 | 209 | 683 | 300 | 250 |
| 31337 | new | 51 | 251 | 1,497 | 1,249 | 498 | 964 | 606 | 314 |

The apostle's clause leaves all 16 games identical to turn 100 (the digests at 20, 60 and 100 match), so these figures are the final code's.

All 16 seeds, the new tree against the old, paired (geometric mean of the ratios, 95% interval, seeds down and up):

| Figure | New against old |
|---|---|
| Towns | +2% [−7%, +11%], 5 down, 10 up |
| Units | +2% [−5%, +10%], 7 down, 8 up |
| Food | −1% [−14%, +15%], 8 down, 8 up |
| Production | +12% [−5%, +32%], 6 down, 10 up |
| Gold | +5% [−17%, +31%], 7 down, 9 up |
| Science | +1% [−13%, +16%], 6 down, 10 up |
| Culture | +8% [−16%, +41%], 6 down, 10 up |
| Faith | −2% [−23%, +23%], 6 down, 10 up |

Every interval holds nought: at this sample size the batch does no measurable harm at turn 100. Single seeds move a lot (seed 1: 35 towns against 53 on the old tree; seed 999: 55 against 45), because the focus hold changes decisions from turn 10 on and the game then parts.

### Not done, and proposals

- **The escort's share** (fault 5). The settler row still reads the expansion chain's share when the chain's one step is the escort for a settler already standing. Pricing that step as the soldiers' alone is the exact cause fix, and it cost 2 to 6 towns a game at turn 100 on four seeds. Whether the bots should raise a second settler while the first waits for an escort is a question for the user or the parameter pass.
- **The settlers marching late.** The guard stops a seat that has a settler asleep from raising another. It does not stop settlers that are awake and marching toward sites that other seats then take; on seed 42 of the new tree, 11 settlers stood at turns 117 to 126 and none was asleep. Several towns of a seat can still start a settler in one turn, because the sitting reads the expansion chain once a turn.
- **Proposal, a settler with no site at all**: a legal command exists, `disbandUnit` (no join-a-town command exists). A settler asleep for a number of turns with no site could be disbanded, which saves its upkeep and the sleep order the simulation's `wakeSleepers` forces each turn. Not built.
- **Proposal, the prophet the bot buys for nothing.** The want book prices a prophet by its best act (`prophetTerms`, `wants.ts`). Two of those acts are acts the arm never takes: the empire rite over every town (`explainEmpireRite`, priced since `55027c67`, 2026-09-07; no bot arm sends `empireRite`), and a further holy site priced as the stones alone (`explainStones`), without asking whether any town of the seat lacks a site. So a seat with every town holding a site still buys prophets, which now sleep where they used to walk. Either the arm learns the rite or the book stops pricing it. Not built.
- **Proposal, the focus ties.** When both sheets place a town's citizens on the same hexes, the focus arm still orders the balanced focus (41 of 221 focus orders in the pinned duel, 68 of 301 on the standard board). The hold covers them; an arm that sent nothing on a tie would save the order.
- **The muster's search** (fault 2) is still taken once for each piece asked (20% of seed 7's turns 109 and 110 with fixes 1 and 2). Sharing it between pieces is exact only when neither piece's own hex lies on the road or within two hexes of the target, and only for a mover that does not embark; that rule was not built.
- **The shadow check over a late game** was not run: on a 19-town empire each hit recomputes its nested readings, and two turns did not finish in 23 minutes. The fixture test runs the shadow check on a four-town empire and a bot decision.

### Pins

`test/sim/aiDigest.slow.test.ts`: fixes 1 and 2 alone moved neither pin (duel `ce93521f:331077`, standard `855266fe:1048454`; measured before fixes 3 to 5 were written). Fixes 3 to 5 change play, and the pins are re-cut once, with the reason printed beside them: duel `ce93521f:331077` -> `3def2cf4:345268`, standard `855266fe:1048454` -> `b8fc7751:1046273`. The apostle's clause moved neither of the new pins.

### Checks

- Type check clean (`npx tsc --noEmit -p .`).
- `test/sim/empireYieldAtRest.test.ts` (new, core, 4 tests) and `test/sim/aiEndCheckLoops.test.ts` (new, core, 10 tests), above. The prophet and the apostle tests fail on the old tree.
- Tests changed for what the batch changed: `aiBot.test.ts` (the module list holds `focusRoll.ts`; the camp-door test gives the seat a full purse, because on the fixture the new bots play the seat is a coin a turn short and the disband arm answered first), `aiWants.test.ts` (the focus record empties the roll before each sitting), `readings.test.ts` and `test/ui/botWorker.test.ts` (the fourth memory beside the state), `aiCardStamp.slow.test.ts` (below) and `aiDigest.slow.test.ts` (the pins).
- **`aiCardStamp.slow.test.ts`**: the new game holds a position (seat 5 of the duel at turn 121) where Feast Days is priced at 59.7 and stamped at 48. The 11.7 is `explainBeliefBeyond`'s promise: the follower line opened to every town the faith can expect to hold, read on the seat's context against today's, so the chains' towns still to come show there even when every expected town follows already. The check's test for "no promise" walked the raw line, whose faith scope keeps those towns out. The check now also counts a belief as promised when its own reading beyond the books is not nought. Switching fix 1 off gave the same finding, so it is the new position and not the fold.
- Every core test file that imports the bot, its sheet or reads a source file: 226 files, 7,020 tests passed.
- The slow tier, by name: `aiDigest`, `aiCardStamp`, `aiBot`, `aiDecision`, `aiDriver`, `aiGarrison`, `aiWants`, `aiWar`, `beads`, `ledgerFold`, `statecraft`, `religion`, `barbarians`, `botWorker` and `cityModifiers`: 15 files, 47 tests passed.
- The core tier, the build and the whole slow tier were not run. They are the orchestrator's gate.

### Files

`src/sim/statecraft/evaluator.ts` (`readingAtRest`, `restingCutRates`, the `empireYield` arm), `src/sim/readings.ts` (the four readings at rest), `src/ai/bot.ts` (`nextBotDecision` and `decideNext`; `campaignMarch` and `routeEndsOn`; `holySiteStep`, `townWantingSiteAt`, `plantErrorOn`, `relicErrorOn`, `boardWithPieceOn`, the apostle's walk; `focusCommand`; `unitRoleValue`'s settler row; `wakeIdleSettler`), `src/ai/campaign.ts` (`musterHex`), `src/ai/chain.ts` (`settlerWaits`), `src/ai/wants.ts` (`expansionTerm`), `src/ai/focusRoll.ts` (new), `src/ai/harnessMemory.ts`, `src/ai/aiConfig.ts` and `data/ai.json` (`driver.focusHoldTurns`, 5), `docs/bot-priorities.md`, this section, and the tests named above.

## BP10: settlers for free sites, one focus a build, and the prophet's price, 2026-11-15

`docs/flags.md` (ooooooo), the bullet "BP10: the user's second ruling on the focus and the settlers, 2026-11-15". The user: *"the bot should simply just complete what it's working on without swapping focus in cities (disallow switching entirely). for the settler: aren't we having the bot look at it's available settle locations to determine whether to make a settler? How is it not sending those to settle if it already chose a spot"*. Bot fixes only: no file under `src/sim/` and no rules data changed.

### Method

- **Trees**, each a detached `git worktree` with the main tree's `node_modules` linked in: the **old tree** is `7f0ae0a8` (BP9 and the flags commits), **focus A** is the old tree with the focus change alone, **focus B** is focus A with `driver.focusOrders` at nought, and the **new tree** is the whole batch as measured, which is the batch without the weariness reading of part 4 (it came last).
- **The game** is the end check's: six seats with two decks each, standard map, barbarians on. Seeds 999, 42, 1, 7, 2026, 31337, 3, 5, 11, 13, 17, 23, 101, 314, 777 and 4242.
- **The probe** is BP9's `play9.ts` with three more records (`play10.ts` in the session's scratch folder `bp10/`): the life of every settler (the turn and town it was started in, the site the sitting's expansion chain named then, the seat's other settlers at that moment, every order it got, where it stood and where its march ended at the end of each turn, and what became of it); every focus order with the town's build at the time (the head of the queue and how many turns it had been the head; a build ends when the head changes or its basket falls); and prophets held, asleep and bought. A tuning sheet can be applied to one tree of a process (`TUNES`), which is how focus B and the no-hold run were played.
- **Paired figures** as in the end check: for each seed, the ratio of one tree's total to the other's; the geometric mean of the ratios with a 95% t interval, and the seeds down and up.
- The machine carried other load during these runs (load average 15 to 38), and from about 11:30 it slept for long spells ("What the measurement could not finish"), so seconds are compared only between trees of one process, in CPU time.

### 1. Settlers

#### The trace

Seeds 999, 42 and 7 on the old tree to turn 150 (they end at turns 141, 127 and 147, when a seat finishes the Opus), every settler of the real seats alive at some turn from 100 to 150: 142 settlers. 84 founded a town, a mean of 4.9 turns after they were raised. 58 founded nothing.

**The answer to the user's question.** The bot does look at the sites, but in two places that did not know about each other, and neither knew about the seat's other settlers:

- **The build arm read one site for the whole empire, once a turn.** A settler row was worth a share of the expansion chain, whose site is the legal hex nearest to any town of the seat, read when the seat sat down for its turn (`ctx.expansion`, `nextTownChain`). The chain drops its settler step once a settler of the seat stands or is queued, but it is read once a turn, so every town that chose a build later in that turn still saw the step open and priced a settler at a whole next town for the same site. Of 116 late settlers started in a queue, 92 were started on a turn when another town of the same seat also started one, and 78 while another town already had one queued. In 20 of 38 seat-turns with a start, two or more towns started one, up to eight in one turn (seed 42).
- **The settler chose its own site, and looked only 8 hexes from where it stood.** Once raised, a settler took the best-scoring hex within `expansion.siteSearchRadius` of itself (`marchToSite`), not the chain's site, with no notion of where the seat's other settlers were going. So several marched to one hex, the first founded and the rest lost it. A settler asked again on the way chose again from where it then stood, so its target moved. And a settler raised in a town whose own 8 hexes held no legal site slept at once: the chain's site was near another town. 10 of the 12 sleepers had been priced on a site 9 to 16 hexes from the town that raised them.

The 58 that founded nothing, one cause each (the first that applies, in this order):

| Cause | Settlers |
|---|---:|
| Taken by the wild on the way | 11 |
| Asleep at the end: no legal site within its 8 hexes (asleep 18.7 turns on average, at most 32) | 12 |
| Marching to a site another settler of the seat was also marching to | 19 |
| Still marching, its target changed 3 or more times | 4 |
| Raised in the last five turns of the game, still on its way | 11 |
| Other | 1 |

Causes looked for and not found as a main cause: a site made illegal by a rival during the march (1 settler), a wait for an escort (6 settlers had a site struck for want of one at some order; none stood at the end after one), and a path over water (27 settlers had a best site with no route at some order; the probe cannot see whether a sleeper's own search failed for want of a route, but 10 of the 12 sleepers were priced on a site out of their reach).

#### The fix

The rule the user expects, at its two causes. A new leaf, `settlerSites.ts`, says which site each settler of the seat is for, read off the live board (a **claim**): a settler marching to a legal site claims the end of its march (of two marches within the spacing rule of each other, the first in unit order keeps it); an awake settler with no claim claims the free site nearest to it within the search radius, else the nearest anywhere among the seat's sites; a settler in a town's queue claims the free site nearest to that town; a sleeping settler claims nothing. A site is free when it is legal now and at least `minCitySpacing` (4) hexes from every claim. The seat's sites are the legal hexes within 8 hexes of its towns, read once for the context (`ValueContext.sites`) and asked again for their legality where used.

- **The build arm and the faith purchase** (`settlerTerms`, `bot.ts`) price a settler in a town only for the free site nearest to that town, after every claim of the seat. The claims are read when the row is priced, so a second town choosing a build in the same turn sees the settler the first one queued. With a site, the settler is the next town there, priced as the expansion chain prices a town, with the walk from this town; without one it is worth nothing ("every legal site within 8 hexes of X already has a settler of this empire for it"). The spend arm asks the claims again before it buys one (`settlerSiteRefusal`). A law that forbids founding (The Soldiers' Share) makes a settler worth nothing.
- **The falloff counts the settlers already on their way.** A first version priced each new settler as though the towns its siblings would found did not exist, and on the duel fixture the capital then raised settlers from turn 12 to turn 31 without a break. The next town is now the one after every claimed site (`explainNextTown`'s `coming`).
- **The settler keeps its site** (`settlerCommand`). Asked again on the way, a settler marching to a site it claims keeps the march (the same target, so `reaskTheMarch` sends nothing), unless something hostile now stands near the site and nothing walks with it. On legal ground on the way it compares only its own site with the ground under it, at the march arm's margin, and founds there when the rest of the walk does not pay; the first version without this founded the duel's first capital a turn later. Choosing a site, it skips every hex within the spacing rule of another settler's march. With nothing it can take within 8 hexes, it walks to the nearest free site among the seat's sites (`marchToFreeSite`, at most four routes asked), and sleeps only when there is none.
- **BP9's guard is removed** (`settlerWaits`). A sleeping settler claims nothing, and a settler is raised only for a free site, so the guard had nothing left to stop.
- **BP9's open fault, the escort's share, is fixed by construction**: the settler row reads its own site's chain and none of the seat chain's steps, so it no longer takes the escort step's whole worth while a settler stands. The expansion chain itself, and every other reader of it (the escort term, the meter prices, the camp's site, the worker's want), is unchanged.
- **Tests** (`aiEndCheckLoops.test.ts`): a march claims its end and a second march beside it has no claim; a town's next settler is for a different site from the one its queue is for; a town prices a settler while a site is free and at nothing once every site has one, with the sentence that says so; a settler is not sent to a site within the spacing rule of another's march; a marching settler asked again sends nothing.

#### Before and after

**Towns at turns 50 and 100.** The new tree's runs of seeds 777 and 4242 did not finish (below), so the new tree has 15 seeds at turn 50 and 14 at turn 100. Focus A is the old tree with the focus change alone, so "new against A" is the settler and prophet changes alone.

| Figure | Old tree | A | New | New against the old tree | New against A |
|---|---:|---:|---:|---|---|
| Towns, turn 50 | 19 | 19 | 21 | +11% [+1%, +21%], 4 down, 10 up | +10% [+3%, +18%], 2 down, 11 up |
| Towns, turn 100 | 46 | 44 | 53 | +16% [+6%, +27%], 2 down, 11 up | +21% [+13%, +30%], 1 down, 13 up |
| Citizens, turn 100 | 308 | 296 | 322 | +3% [−10%, +17%] | +8% [−7%, +26%] |
| Food, turn 100 | 1,185 | 1,156 | 1,302 | +4% [−16%, +29%] | +12% [−10%, +39%] |
| Production, turn 100 | 1,244 | 1,128 | 1,164 | −12% [−32%, +13%] | +2% [−23%, +36%] |
| Gold, turn 100 | 405 | 384 | 438 | −2% [−26%, +30%] | +13% [−19%, +58%] |
| Science, turn 100 | 871 | 785 | 822 | −6% [−20%, +10%] | +3% [−19%, +31%] |
| Culture, turn 100 | 425 | 372 | 434 | −2% [−28%, +32%] | +11% [−12%, +40%] |
| Faith, turn 100 | 167 | 150 | 158 | −3% [−18%, +15%] | +5% [−8%, +19%] |

Means are over each tree's own seeds; the paired columns use the seeds both trees reached. Early expansion is not lost: towns rise at turn 50 and at turn 100, with intervals above nought. BP9's escort's share, which the settler row no longer reads, cost 2 to 6 towns a game when it was fixed alone; together with the claims it costs none. At turns 51 to 100 a seat holds 4.9 settlers a turn against 4.0 (they are now raised for several sites at once) and starts 0.74 a turn against 0.58.

**Late settlers**, seeds 999, 42 and 7. The new tree's runs reached turn 130 on seeds 999 and 7 and turn 150 on seed 42 before the machine went to sleep (below); the old tree's games end at turns 141, 127 and 147. So the window is turns 100 to 130.

| Settlers alive at some turn in 100 to 130 | Old tree | New tree |
|---|---:|---:|
| All | 121 | 155 |
| Founded a town | 79 | 115 |
| Founded nothing | 42 | 40 |
| of which taken by the wild | 9 | 38 |
| of which taken by a rival | 0 | 2 |
| of which asleep at the end for want of a site | 8 (asleep 22.5 turns on average) | 0 |
| of which marching to a site another settler of the seat was going to | 11 | 0 |
| of which still marching, target changed 3 or more times | 4 | 0 |
| of which raised in the last five turns, still on its way | 9 | 0 |
| Settlers that slept at some turn end, whole games | 14 (234 turn-ends, at most 32 in a row) | 3 (18 turn-ends, at most 9) |

| Turns 121 to 130, a turn (seed 42 old tree: 121 to 126) | Old tree: 999, 42, 7 | New tree: 999, 42, 7 |
|---|---|---|
| Settlers held | 10.2, 13.3, 10.8 | 10.7, 3.9, 8.1 |
| asleep | 5.2, 0.0, 1.1 | 0.1, 0.0, 0.0 |
| Towns | 74.6, 58.3, 68.5 | 86.3, 82.4, 92.6 |

- Every settler of the new tree that founded nothing was taken. None sleeps for want of a site, none marches to a site another settler is for, and none wanders. The settlers still held late are on their way: on seed 42, at turns 141 to 150, 10.1 are held and none sleeps.
- **A settler with no site at all** is now rare: 3 in the three games slept at some turn, for at most 9 turns. A disband rule is not needed.
- **The open problem is the wild.** It took 38 settlers in the window against 9, a quarter of all settlers (seed 999 alone: 25 of 59; seat 3 there lost 12). There are more settlers on the road at once, and the wild takes any civilian with no soldier on its own hex (BP8's open item: the bot counts a soldier within 4 hexes as cover). 15 of the 38 were on the far march to a free site beyond their own 8 hexes (`marchToFreeSite`), which asks only whether something hostile stands near the site, not along the road; of the 41 settlers that took such a march, 19 founded a town.

### 2. Citizen focus

**Why BP9's build-keyed hold failed.** The old tree with the hold turned off (`driver.focusHoldTurns` 0), seeds 7, 999, 42 and 1 to turn 100. At turns 51 to 100 the bots gave 2.7 focus orders a turn, and 257 of them undid the town's last order within four turns. The probe dates every build: a build starts when the head of a town's queue changes, or when the head stays and its basket falls (a row finished, and the same row again).

- **Builds are short.** 1,659 builds started at turns 51 to 100: half took two turns or less, 74% four turns or less.
- **42% of the quick undos came after the town had started a new build** (107 of 257); 58% (150) undid an order on the same build.

So a hold that ends with the build cannot stop four undos in ten: the next build starts within a turn or two, and the comparison is a near tie that the live prices tip either way. BP9 reported that its build-keyed hold left 193 of 257 quick undos standing. On this run a hold keyed on the head and its basket leaves 107. BP9 did not keep its code, so how it was keyed is not known; the gap says it also let go of some builds that had not changed. Both causes are real, and the larger one is that builds are short.

**Version A, the default** (`driver.focusOrders` 1). The arm chooses a town's focus when the town starts a build and keeps it until that build is finished or leaves the head of the queue. The choice is written down even when it keeps the focus the town has, so no later look on the same build can change it. The roll (`focusRoll.ts`) keeps, for each town, the focus chosen, the head it was chosen for (`queueItemKey`, or `-` for an empty queue) and the hammers in the head's basket when the arm last looked; the same head with a basket that has not fallen is the same build, so a second copy of one unit after the first is a new build. **A project** never finishes and its basket only grows, so its focus is kept while it heads the queue; the production arm puts a better row ahead of a project when one appears (`projectIdleCommand`), and that is a new build. A town whose focus another hand changed is chosen for again. BP9's five-turn hold (`driver.focusHoldTurns`) is gone.

**Version B** (`driver.focusOrders` 0): the bot sends no focus order.

**Version A against B and the old tree** (BP9's five-turn hold), 16 seeds at turn 100, six seats summed:

| Figure | Old tree (hold) | A | B | A against the old tree | B against the old tree |
|---|---:|---:|---:|---|---|
| Towns | 46 | 44 | 41 | −4% [−11%, +3%], 10 down, 4 up | −9% [−15%, −2%], 13 down, 3 up |
| Citizens | 308 | 296 | 290 | −4% [−13%, +5%], 10 down, 6 up | −5% [−12%, +2%], 11 down, 5 up |
| Food | 1,185 | 1,156 | 1,114 | −4% [−18%, +13%], 7 down, 9 up | −5% [−15%, +5%], 9 down, 7 up |
| Production | 1,244 | 1,128 | 974 | −13% [−28%, +6%], 11 down, 5 up | −24% [−34%, −13%], 15 down, 1 up |
| Gold | 405 | 384 | 349 | −8% [−29%, +20%], 7 down, 9 up | −17% [−36%, +7%], 8 down, 8 up |
| Science | 871 | 785 | 735 | −10% [−22%, +3%], 13 down, 3 up | −15% [−25%, −4%], 14 down, 2 up |
| Culture | 425 | 372 | 342 | −12% [−29%, +9%], 10 down, 6 up | −20% [−32%, −5%], 12 down, 4 up |
| Faith | 167 | 150 | 144 | −12% [−27%, +7%], 9 down, 7 up | −12% [−24%, +2%], 10 down, 5 up |

| Turns 51 to 100, a turn | Old tree | A | B |
|---|---:|---:|---:|
| Focus orders | 2.14 | 1.60 | 0 |
| Back to a focus the town held in the last five turns | 0.77 | 0.49 | 0 |
| Undoing the town's last order within four turns | 0 | 0.40 | 0 |
| of which on the same build | 0 | 0 | 0 |
| Accepted commands | 76.8 | 75.6 | 69.1 |

- **B is clearly worse**: production −24%, science −15%, culture −20% and towns −9%, each with an interval below nought. Without a focus the towns never lean on the hills when a build waits on hammers.
- **A is not measurably different from BP9's hold** at this sample size (every interval holds nought), but it reads lower on most seeds (science 13 of 16 down, production 11). One likely reason, not measured: a town that chose the balanced ordering at the start of a long build (a wonder) cannot lean on the hills later in it, where under the hold it could after five turns. That is the user's rule working as written. A stays the default, as the brief asks; the user can choose.
- A changes no focus within a build (0 of its 0.40 quick undos a turn), and gives a quarter fewer focus orders than the hold.

### 3. The prophet's price

**Confirmed, and one more.** The want book prices a prophet by its best act (`prophetTerms`, `wants.ts`). Three of the acts it priced were acts the prophet's arm (`prophetCommand`) would not or could not take:

- **The rite over every town** (`explainEmpireRite`, priced since `55027c67`): no arm of the bot sends `empireRite`. Removed from the price.
- **A further holy site** (`explainStones`) was priced in every town. The arm raises one only on the ground of the town the prophet stands in, one step off the centre it was bought on, and only while that town holds no site (`townWantingSite`, `holySiteStep`). It is now priced only where that can happen (`siteRaisableFrom`: the town holds no site, and a hex of its own beside the centre takes one).
- **Another rung** (`explainNextRung`) read `nextBeliefPool`, which names the next pool but not its door: the enhancer pool waits on Theology. A seat with its follower beliefs full and no Theology bought prophets for an enhancer the arm could not take (`gainBeliefError` refuses). The rung is now priced only when that gate, asked of a copy of the board with one prophet of the seat added (`deepenRefusal`), says yes. The function's docblock had said enhancers waited on Theology; the code did not.

A prophet with no act left is worth nothing, and the book does not buy it. A bot arm for the empire rite is not built. It would be small (the rite plan already prices one town's blessing, `explainRite` on a town-scoped context, and the command names the prophet and the rite), but which rite, and when a prophet should spend a charge on it rather than wait for a rung, are choices the arm does not make today; it is left as a proposal.

**Tests** (`aiEndCheckLoops.test.ts`): the prophet row prices no rite over every town; it prices a further site in a town that holds none, and nothing once the town's site stands; it prices no enhancer before Theology, and does with it.

**Idle prophets**, a turn, six seats summed:

| | Old tree | New tree |
|---|---:|---:|
| Turns 51 to 100, 16 seeds (new tree 15): prophets held | 0.47 | 0.03 |
| asleep at the end of the turn | 0.37 | 0.00 |
| bought | 0.18 | 0.10 |
| Turns 121 to 130 (seed 42: the old tree's last turns, 121 to 126), seeds 999, 42, 7: held | 4.4, 3.0, 4.5 | 0.1, 0.5, 0.6 |
| asleep | 3.8, 2.8, 4.4 | 0.0, 0.5, 0.3 |

On the new tree's seed 42, which runs to turn 150, 2.2 prophets stand at turns 141 to 150 and 1.8 of them sleep. They were not traced.

### 4. Two more fixes, found by the slow tier

`aiCardStamp.slow.test.ts` failed on the new games: "theGloriousDead at turn 121, seat 2: rulePercent/unitLossWeariness moves the books by 32". The bot read the unit-loss weariness rule (The Funeral Oration, The Glorious Dead) as a rule the stamp cannot see, and priced a stand-in beside the stamp. In this position seat 2 is at war with losses in the weariness window, the stamp's contentment moves by 32 points, and the stand-in counted a share of the same relief again. The rule now reads as a line on the books (`rulePercentInBooks`, `value.ts`), as the army's wages do. Its town-loss sibling should read the same way, but no recorded position holds a lost town, and the check's other half (a shape read as on the books must move them somewhere) then fails, so it stays a stand-in. The fault is older than this batch; BP10's games are the first to hold the position. This change came after the measurements above. It moves play only for a seat that holds one of the two cards while it has lost units in the window, and it moved neither pin.

`aiDecision.slow.test.ts` (the fold audit) failed on the new games too: "t35 draft/Teal → The Fast → … Rite of Fasting: one town's blessing × 2 towns: parts fold to 20.5, term says 41.1". The charter's rite term (`explainCharterOpening`, bot batch BP7) printed one town's blessing as its only part beside a value of that blessing times the towns. Its parts now carry the multiplication (and a `× 0` line when the blessing pays nothing), and its value is their fold. The figure is the same, so play does not change. The fault is BP7's; BP10's games are the first where a seat with two towns weighed The Fast.

### 5. Speed

Seeds 7, 999 and 42, the old tree and the new one in one process a seed, a turn on each in rotation, turns 100 to 120. The machine slept for long spells during these runs (about 11:30 on, on battery: `caffeinate` does not hold a Mac awake there, and the power log shows deep idle with 45-second dark wakes), so the table gives CPU seconds a turn, and wall seconds only over the turns with no sleep in them.

| Seed | Tree | CPU s a turn | Wall s a turn (turns with no sleep) | Commands a turn | Towns | CPU ms a command |
|---|---|---:|---:|---:|---:|---:|
| 7 | old | 4.86 | 4.89 (18 of 21) | 119 | 56.4 | 41 |
| 7 | new | 7.33 | 7.31 (18) | 189 | 75.8 | 39 |
| 999 | old | 4.70 | 4.28 (16) | 139 | 62.7 | 34 |
| 999 | new | 6.91 | 7.78 (19) | 163 | 71.7 | 42 |
| 42 | old | 5.66 | 5.34 (18) | 146 | 49.7 | 39 |
| 42 | new | 2.92 | 2.85 (21) | 108 | 57.4 | 27 |

The new games are bigger (a sixth to a third more towns), and on seeds 7 and 999 the turn is half again as long. The cost of a command is the same on seed 7, a fifth higher on seed 999 and lower on seed 42, where the old tree's game ends at turn 127 with seat 1 finishing the Opus and the new tree's runs to turn 150. The site claims are read at every settler decision and every settler row; they were not profiled.

### What the measurement could not finish

- **The machine slept.** From about 11:30 the laptop ran on battery and went into deep idle sleep, with dark wakes of about 45 seconds every 10 to 60 minutes (the power log); `caffeinate -s` holds it awake only on mains power, and `-i` did not stop it. So the new tree's runs of seeds 777 and 4242 to turn 100 did not finish (its tables hold 15 seeds at turn 50 and 14 at turn 100), and the 150-turn runs stopped at turn 130 on seeds 999 and 7 (seed 42 reached 150).
- **Turn 150** was not compared: the old tree's games end before it on two of the three seeds, and the new tree's runs did not reach it on two.
- **The cost of the claims** in a late turn was not profiled.

### Not done, and proposals

- **The wild takes many more settlers** (above): 38 in turns 100 to 130 against 9. Two bot-side answers, neither built: drop the far march to a free site beyond the settler's own radius (`marchToFreeSite`; the user's rule allows a settler to wait), or ask the danger along the road and not only at the site; and BP8's open item, a soldier on the settler's own hex as its only cover.
- **Version A reads lower than BP9's hold on most seeds** (not measurable at 16 seeds). If the user wants it, a long build could count as a new build every few turns; that would break the ruling as written, so it is not built.
- **A bot arm for the empire rite**: a proposal (above). The prophet's price no longer counts the rite, so nothing is bought for it.
- **Prophets still asleep late** on the new tree's seed 42 (1.8 of 2.2 at turns 141 to 150) were not traced.
- **The focus ties** (BP9's proposal: when both sheets place the citizens on the same hexes, the arm still orders the balanced focus) are unchanged.

### Pins

`test/sim/aiDigest.slow.test.ts`, re-cut once, with the reason printed beside them: duel `3def2cf4:345268` -> `4da3f046:337488`, standard `b8fc7751:1046273` -> `6a878f7e:1003339`. The weariness reading of part 4 came after the cut and moved neither pin (the test passes with them).

### Checks

- Type check clean (`npx tsc --noEmit -p .`).
- Core, by name: every `test/sim/ai*.test.ts` that is not slow, `test/ui/botWorker.test.ts`, `test/ui/arenaPage.test.ts` (`driver.focusOrders` appears on the panel as a number), `test/sim/readings.test.ts`, `test/sim/empireYieldAtRest.test.ts` and `test/sim/decks/dominionEconomy.test.ts`: 44 files, 993 tests passed, after the last change to play. `aiAppraisal`, `aiDecision`, `aiSmallReadings` and `aiWonderRewards` again after the fold fix: 4 files, 169 tests passed.
- `test/sim/aiEndCheckLoops.test.ts` (core, 20 tests): the focus tests (one focus a build, the switch at nought, the roll in the harness memory), the settler tests and the prophet tests above.
- Tests changed for what the batch changed: `aiBot.test.ts` (the module list holds `settlerSites.ts`; the defence fixture re-sited from turn 19 to 17, because the capital now raises settlers through most of the old turns), `aiWants.test.ts` (the rich record runs seven turns, so the focus arm leans a town and puts one back), `aiDigest.slow.test.ts` (the pins).
- Slow, by name: `aiDigest`, `aiCardStamp`, `aiBot`, `aiDriver`, `aiWants`, `aiWar`, `aiDecision`, `aiGarrison`, `botWorker`, `religion`, `beads`, `barbarians`, `statecraft`, `ledgerFold` and `cityModifiers`: 15 files passed. `aiCardStamp` and `aiDecision` passed after the two fixes of part 4; `aiDigest` and `aiDecision` were run last, after the fold fix.
- The whole core tier, the build and the whole slow tier were not run. They are the orchestrator's gate.

### Files

`src/ai/settlerSites.ts` (new: `foundingSites`, `siteClaims`, `nearestFreeSite`, `freeSiteForTown`, `claimsOfOthers`, `marchClaimOf`, `siteIsFree`), `src/ai/bot.ts` (`valueContext`'s `sites`; `nextTownChain`, `siteProbe`, `settlerTerms`; `unitRoleValue`'s settler row; `settlerCommand`, `keepMarch`, `marchToFreeSite`, `marchToSite`; `settlerSiteRefusal` in `bankSpend`; `focusCommand`, `buildMarkOf`), `src/ai/chain.ts` (`explainNextTown`'s `coming`, `expansionChain`; `settlerWaits` removed), `src/ai/wants.ts` (`WantInputs.settlerWorth`, the faith row's settler and town; `prophetTerms`, `siteRaisableFrom`, `deepenRefusal`, `explainNextRung`; `expansionTerm` and `explainEmpireRite` removed), `src/ai/value.ts` (`ValueContext.sites`; `rulePercentInBooks`; the rite term of `explainCharterOpening`), `src/ai/focusRoll.ts` (one choice a build), `src/ai/harnessMemory.ts`, `src/ai/aiConfig.ts` and `data/ai.json` (`driver.focusOrders` 1 in place of `driver.focusHoldTurns`), `docs/bot-priorities.md`, this section, and the tests: `test/sim/aiEndCheckLoops.test.ts`, `test/sim/aiBot.test.ts` (the module list holds `settlerSites.ts`; the defence fixture re-sited from turn 19 to 17), `test/sim/aiWants.test.ts` (the rich record runs seven turns), `test/sim/aiDigest.slow.test.ts` (the pins).
