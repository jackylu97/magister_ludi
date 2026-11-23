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

## BP11: escorts for settlers, and the focus question, 2026-11-15

`docs/flags.md` (ooooooo), the bullet "BP11: escorts for settlers, and the focus question, ruled 2026-11-15". The user: *"the ai should try to escort its settler with military units. Also, why does the no focus orders make the outcomes so much worse? what would be a good fix otherwise, maybe having the bots change focus isn't a bad thing?"* Bot changes only: no file under `src/sim/` and no rules data changed.

### Method

- **Trees**, each a detached `git worktree` with the main tree's `node_modules` linked in: the **old tree** is `f0c057e4` (BP10 and the flags commit), and the **new tree** is the old tree with this batch's bot files copied in, frozen when the final runs started. One fix came after them (a soldier the escort plan sends is marked as called for the turn, below); it touches only a soldier whose march cannot take its first step, and on the one game that showed it (seed 314) it removed the only warning of the 48 games. Two earlier versions were measured and dropped on the way ("Tried and changed on the way"). Focus settings are tuning sheets on the new tree (`TUNES`): **A** is the default (`driver.focusOrders` 1, one focus a build), **B** is no orders (0), **C** is the margin (2, `driver.focusMargin` 10).
- **The game** is the end check's: six seats with two decks each, standard map, barbarians on. The 16 end-check seeds.
- **The probe** is BP10's `play10.ts` with four more records (`play11.ts` in the session's scratch folder `bp11/`): the units of each seat the wild killed or took, by kind (from each command's and each resolution's combats, and from owners that changed to the wild); where each settler stood when its seat ended its turn, with or without a soldier of its own on its hex, and the nearest piece of the wild; the bot's own CPU time a turn (inside `nextBotDecision`); and, on request, the focus table of every town every turn (`focusReading`) for the noise measurement.
- **Paired figures** as in the end check and BP10: for each seed the ratio of one tree's total to the other's, the geometric mean of the ratios with a 95% t interval, and the seeds down and up.
- **Seconds** are CPU seconds (`process.cpuUsage`), not wall seconds. The laptop started on battery (27%), and was on mains power from about 22:25; no run was lost to sleep. Runs on the dropped versions were stopped on purpose.

### 1. Escorts

#### What existed, and why it did not protect the settlers

- **The wild's rule.** A thief of the wild takes a civilian it can see within `theftRadius` (5) that has no soldier on its own hex (`isUnguarded`, `barbarians.ts`). A blow on a hex that holds a soldier and a civilian hits the soldier first, so a soldier on the hex is cover; a melee kill of that soldier still carries the winner onto the hex and takes the civilian. One soldier and one civilian may share a land hex (`stacking.perCategoryPerTile` 1, a category each). On water a hex holds one piece that is not a ship, so an embarked settler can have no soldier with it. A town holds one soldier, so a settler in a town can never have a second soldier on its hex.
- **The bot's reading.** The settler arm and the worker arm counted any soldier of the seat within `war.escortRadius` (4) hexes, outside a town, as cover (`escortWithin`). The soldier arm's escort (`escortMarch`) sent the nearest redundant soldier to the hex of any settler with no soldier within 4 hexes, after the camp hunt and the empty towns. The expansion chain priced an escort step (a share for soldier rows) when the next site had a hostile near it and the seat had no soldier at all.
- **Why it failed.** A soldier three hexes off was cover to the bot and not to the wild. On the old tree, at turns 100 to 130 on seeds 999, 42 and 7, the wild took 38 settlers (BP10's figure, reproduced exactly). When their seat last ended its turn before the loss, 35 of the 38 stood alone outside a town, with a piece of the wild one hex off (30) or two (5), and 33 of them were still on a march; 27 of the 35 were three hexes or fewer from a town of their own. The other 3 had a soldier on the hex, which the wild killed first. A settler beside a raider marches on only when the danger reading finds it covered, which under the old reading was any soldier of ours within 4 hexes outside a town. And the chasing soldier walked at a settler's speed behind a settler that walked on, so it reached it only when the settler stopped.

#### The design built

- **A settler's cover is a soldier on its own hex** (`coverOn`), or the soldier its escort plan walks to its hex this turn. The worker reads its danger through the same function (`civilianDanger`), so the first version changed both. **The worker keeps the old reading** (`civilianCover`): on that version's runs, to turn 100 on seeds 999, 42 and 7, the seats held more workers (1,504 worker-turns against 1,134; 1,113 against 773; 1,493 against 1,129) and started fewer improvements (235 against 299; 129 against 208; 203 against 278), most likely because a worker with a raider within 4 hexes and a soldier within 4 now ran home where it used to work on (not traced), and the wild took as many (15 against 15; 21 against 19; 33 against 22). So the change is not clearly safe for workers, and it is kept to settlers. `war.escortRadius` keeps both its old meanings for the worker, and for the settler means only how near a hostile counts as danger.
- **Which soldier** (`freeEscort`, `escortPlan`): a field soldier of the seat on land, as fast as a settler, healthy (`military.healBelowHealth`; not asked for a soldier already beside the settler), not needed for its town's garrison (`isRedundant`), not at a camp's door (part of a hunt's force). A chase or a meet waits for every town of the seat to be held (`townsAreHeld`). Nearest first, by hexes and then a route (`findPath`, `pathTurns`), at most `search.pathProbes` routes a settler. One soldier a settler, settlers in unit order. The escort outranks the camp hunt, the screen and the campaign: its clause (`escortDuty`) comes after the two heal arms and before every blow and march, so a soldier with a settler does not strike and advance off its hex.
- **Build or buy one when none is free?** No new rule. The expansion chain still prices its escort step when the next site has a hostile near it and the seat has no soldier to spare (`escortAvailable`, now on the new cover reading), which is the share a soldier row in the queue reads. A seat buys or builds no soldier for an ordinary escort; the user's word was "try".
- **How the pair moves.** The settler leads and the soldier follows. A new march walks the settler at once, and `walkWithSettlers` (first in housekeeping) or the soldier's own clause walks the soldier onto its hex in the same turn, before the wild moves (the wild moves in the resolution, before stored routes are walked). A settler on a stored route walks at the end of the turn, after the wild, and its soldier catches up early in the next turn; when the wild moves the two stand together. The settler does not run ahead: it sets out only when its soldier can reach the hex the settler stops on this turn (`paceOf`); when the soldier has spent movement, the settler waits a turn on the soldier's hex. Where the soldier cannot follow even on full movement (a rival's ground it may not enter), the march arm first looks for a site both can reach (`marchToSite`), and only then lets the settler go on. At sea they cannot share a hex, so the plan sends no soldier to an embarked settler.
- **The departure** (`leaveTown`). A settler in a town with a site to go to waits for a free soldier that can reach a hex beside the town, and nearer the site, within `expansion.escortWaitTurns` (2) turns; when that soldier stands there, the settler steps out onto its hex, and the two walk on. A waiting settler sleeps in the town; a settler asleep in its own town now claims its site (`settlerSites.ts`), so no second settler is raised for it.
- **No escort.** It still goes when its road is safe: when nothing hostile the seat can see stands within `expansion.roadDangerRadius` (2) of the hexes it walks in its next turn (`roadAhead`, `roadDanger`). It waits in the town when something does. In the field, a settler alone does not take a site whose next stretch of road is unsafe, stops keeping a march when its next stretch becomes unsafe, and with no site left, when it is not on a march, walks back to the nearest town of its own. The danger at its own hex is the old reading (`civilianDanger` at `war.escortRadius`), which founds where it stands when the ground is legal and otherwise runs home.
- **Danger along the road**, not only at the end (BP10's finding): the next stretch is read at every decision on the way, because the settler is asked again each turn (`reaskTheMarch`).
- **The escort is the first garrison.** A settler about to found whose soldier reaches its hex this turn waits for it (`foundWithEscort`), so the soldier stands in the new town when it is founded; the garrison arms keep it there.
- **Tests** (`test/sim/aiEscorts.test.ts`, new, 8 tests): a soldier one hex off is not cover and a soldier on the hex is; a settler steps out onto a waiting escort's hex; waits in its town while one is on its way, and the plan sends it; with no soldier and columns round the town it stays; with none and nothing in sight it leaves alone; the soldier walks after its settler in the same turn; the escort becomes the garrison. The cover test and the pair test fail on the old tree. `aiWar.test.ts`' escort case now places the spare soldier within the wait, because the long chase is gone.
- **Tried and changed on the way**, on 60-turn runs of seeds 999, 42 and 7: a road check over the whole road at `war.escortRadius` (4) kept settlers in their towns, and towns at turn 60 fell on two seeds of three (seed 42: 19 against 26), so the check reads only the next turn's walk at its own radius (2). A soldier that could not follow on full movement made its settler wait for ever (a hex it could not enter), so that case now lets the settler go. A meeting hex on the far side of the town made the pair walk back through the town each turn, so the meeting hex must be nearer the site than the town. On the first long runs a settler on a march whose road turned unsafe was sent home, and walked out and back. Only a settler that is not on a march walks home now; one on a march keeps walking, and the danger reading at its own hex still turns it home. That stopped the walking out and back, but not the larger number of settlers held late (below). The first version also changed the worker's cover (above).

#### Before and after

**16 seeds, turns 1 to 100**, the old tree against the new (focus A on both). Units lost to the wild are pieces of the six seats killed in a fight with the wild or taken by it.

| Figure | Old tree | New tree |
|---|---:|---:|
| Settlers alive at some turn | 1,058 | 979 |
| Founded a town | 755 | 775 |
| Founded nothing | 216 | 64 |
| of which taken by the wild | 209 | 61 |
| of which taken by a rival | 6 | 3 |
| Still alive at turn 100 | 87 | 140 |
| Settler-turns in the field, with a soldier of their own on the hex | 364 of 4,607 | 2,585 of 5,718 |
| Settler-turns waiting in a town | 171 | 1,444 |
| Units lost to the wild: settlers taken | 194 | 56 |
| workers taken | 325 | 314 |
| soldiers killed | 776 | 840 |
| scouts killed | 675 | 705 |
| traders killed | 31 | 25 |
| all | 2,002 | 1,943 |

| Figure, six seats summed | Old tree | New tree | New against old |
|---|---:|---:|---|
| Towns, turn 50 | 21 | 23 | +11% [+4%, +18%], 2 down, 12 up |
| Towns, turn 100 | 53 | 54 | +2% [−7%, +12%], 5 down, 10 up |
| Citizens, turn 100 | 322 | 317 | −1% [−10%, +9%], 9 down, 7 up |
| Food, turn 100 | 1,282 | 1,200 | −4% [−15%, +9%], 8 down, 8 up |
| Production, turn 100 | 1,141 | 1,095 | −1% [−16%, +17%], 6 down, 10 up |
| Gold, turn 100 | 437 | 397 | −9% [−26%, +11%], 9 down, 7 up |
| Science, turn 100 | 822 | 782 | −2% [−14%, +11%], 7 down, 9 up |
| Culture, turn 100 | 432 | 426 | +2% [−16%, +23%], 9 down, 7 up |
| Faith, turn 100 | 161 | 160 | +1% [−17%, +22%], 5 down, 11 up |

- **The wild takes under a third as many settlers** (209 to 61 to turn 100), and a settler founds nothing in 7% of cases against 20%. A settler stands with a soldier of its own on its hex in 45% of its turns in the field, against 8%.
- **Early expansion does not fall: it rises.** Towns at turn 50 are 11% up, with the interval above nought and 12 seeds of 16 up. At turn 100 towns are 2% up and every yield is within its interval.
- **The cost is time.** Settlers spend 1,444 turns waiting in towns against 171, and more of them are alive at turn 100. Units lost to the wild fall 3% in all: fewer settlers, workers and traders, and 8% more soldiers, which now stand beside settlers where the wild strikes.
- **Workers**, which keep the old cover reading: the wild took 314 against 325.

**Seeds 999, 42 and 7, turns 100 to 130** (BP10's window):

| Settlers alive at some turn in 100 to 130 | Old tree | New tree |
|---|---:|---:|
| All | 169 | 179 |
| Founded a town | 113 | 99 |
| Founded nothing | 40 | 5 |
| of which taken by the wild | 38 | 5 |
| Still alive at turn 131 | 16 | 75 |

| Turns 121 to 130, a turn | Old tree: 999, 42, 7 | New tree: 999, 42, 7 |
|---|---|---|
| Settlers held | 10.7, 3.9, 8.1 | 22.3, 30.8, 23.1 |
| asleep | 0.1, 0.0, 0.0 | 7.3, 8.8, 2.4 |
| Towns | 86.3, 82.4, 92.6 | 82.8, 87.7, 86.8 |

- **The wild took 5 settlers in the window, against 38.**
- **Late, the seats hold two to eight times as many settlers**, and found 12% fewer towns in the window: a settler lives longer (it waits for an escort, waits out danger, or walks with a soldier that has to keep pace), and the ones the wild used to take are still on the board. The towns held at turns 121 to 130 are 2% fewer (257 against 261 on the three seeds; one seed up, two down). This was not traced to the end; see "Not done".
- **One fix after the runs.** On seed 314, turn 63, the plan sent a dug-in soldier toward a town's meeting hex; its first step was blocked, so it stayed as it was, and the camp hunt's wake arm (`wakeTheHunt`) then asked it and sent the same order. The driver stops a seat at a repeated order (`repeatsAnOrder`), so that seat ended its turn early. `walkWithSettlers` now marks the soldier it orders as called for the turn (`BotSitting.called`), as the two wake arms do. Seed 314 played to turn 100 again with no warning.

### 2. Citizen focus

#### Why no focus orders read so much worse

- **What a town does without an order.** `assignCitizens` places a town's citizens by the balanced sheet (`rules.cities.citizenWeights`), which weighs food high, so a town grows and works farms. The production sheet (`citizenFocusWeights.production`) puts the same citizens on hills and mines. The bot leans a town only when the lean is the chains' idea: the hammer premium must be positive (`hammerTerm`), and the growth it gives up is charged (`growthTerm`). With `driver.focusOrders` at nought no town ever leans.
- **Which focus the bot picks, and when.** On the town traces (seeds 999 and 42, the old tree, A against B, to turn 100), a quarter to two fifths of A's towns stand on the production focus at any turn from 40 on (seed 999: 8 of 20 at turn 40, 25 of 50 at turn 90, 23 of 58 at turn 100; seed 42: 13 of 42 at turn 100). The leans are for units and early buildings: on seed 999, 45 of A's 78 leans were for a unit at the head of the queue (warriors, archers, scouts, workers, settlers) and 33 for a building (palisades, libraries, walls, granaries).
- **Where the yield goes.** BP10's figure (production −24%, science −15%) was B against BP9's five-turn hold, not against A. Read again from BP10's own runs (16 seeds):

| B (no orders) against | Turn | Towns | Citizens | Production | Production a citizen | Food a citizen | Science | Science a citizen |
|---|---:|---|---|---|---|---|---|---|
| BP9's hold | 50 | −7% [−15%, +1%] | +1% [−6%, +9%] | −15% [−22%, −7%] | −16% [−21%, −11%] | +3% [−3%, +9%] | −7% [−18%, +6%] | −8% [−17%, +2%] |
| BP9's hold | 100 | −9% [−15%, −2%] | −5% [−12%, +2%] | −24% [−34%, −13%] | −20% [−31%, −7%] | 0% [−8%, +9%] | −15% [−25%, −4%] | −10% [−19%, −1%] |
| A | 50 | −7% [−14%, +1%] | +1% [−6%, +7%] | −9% [−17%, +1%] | −9% [−15%, −3%] | 0% [−5%, +6%] | 0% [−7%, +8%] | 0% [−8%, +8%] |
| A | 100 | −5% [−11%, +2%] | −1% [−10%, +9%] | −13% [−35%, +15%] | −12% [−30%, +9%] | −1% [−8%, +8%] | −5% [−20%, +12%] | −4% [−15%, +7%] |

  - **Most of the gap is the snapshot itself.** The yields are read at the turn: a town on the production focus makes more hammers that turn, and under BP9's hold many towns stood on it. At turn 50, B's towns make 16% fewer hammers a citizen than the hold's, with the same food a citizen. Against A the gap a citizen is 9%.
  - **The rest is slower building early.** At turn 50 B holds 7% fewer towns and 7% fewer units than the hold; the lean finishes settlers and soldiers sooner while a town's growth waits anyway (a settler halts growth). The food the towns keep does not come back as citizens by turn 100 (citizens −1% to −5%).
  - **Science follows the towns and the buildings.** Against the hold, science a citizen is 8% lower at turn 50 and 10% lower at turn 100: libraries and other science buildings are built later as well. Against A it is the same at turn 50 and 4% lower at turn 100, inside the noise.
  - **Against A the gap is not measurable** at 16 seeds: every interval holds nought. On BP10's settlers it is smaller still: on the two town traces of the old tree (BP10's settlers), B ended turn 100 with more towns than A (seed 999: 66 against 58; seed 42: 49 against 42), more citizens (386 against 354; 287 against 227), and production 7% lower on one and the same on the other (1,376 against 1,486; 666 against 668).

#### The margin setting (C)

- **`driver.focusOrders` 2** (`marginFocusCommand`): the same table as A (`focusTable`), asked of every town once a turn, with no memory of builds. A town on the balanced ordering leans on the hammers when the lean scores more than `driver.focusMargin`; a leaning town goes back when the lean scores less than minus the margin, or when one of the table's two gates refuses the lean (nothing the empire raises waits on hammers, or the town would not feed itself). Anything else keeps the focus the town has. A tie (both sheets place the citizens on the same hexes, so the lean scores nought) never changes it; under A such a town on the hammers is still sent back.
- **The unit** is the table's own: points a turn of the bot's value scale, the score of "work the hammers" against the balanced ordering at nought. A gate is not a score; it is the table's rule that the lean must not stand, so it sends a leaning town back whatever the margin.
- **How its size was chosen.** The probe read every town's table every turn to turn 80 on two seeds (`focusReading`; seed 999 on the batch's tree before its last two settler fixes, whose focus arm is the same code, and seed 42 on the final tree; 3,256 town-turns), and took the change of the lean's score from one turn to the next for the same town on the same build at the same size, with no gate on either turn (1,714 pairs). BP9 found that this score moves with the live price of the gold and science the lean gives up.

| Change of the lean's score in one turn, same build and size | Points a turn |
|---|---:|
| Median | 0.0 |
| 75th percentile | 0.2 |
| 90th percentile | 7.6 |
| 95th percentile | 16.9 |
| Largest | 89.1 |

  Half the town-turns score exactly nought (the two sheets agree), and 68 of the 1,714 pairs changed sign from one turn to the next. Under the margin a lean is undone only when the score crosses the whole band, from more than the margin to less than minus it. At 10 points that is a move of more than 20 points, which fewer than one step in twenty makes (the 95th percentile is 16.9). So the margin is 10. At 5, 12% of the steps move by more than the margin; at 20, 4%.
- **Tests** (`aiEndCheckLoops.test.ts`): a leaning town goes back when the balanced ordering wins by more than the margin; it keeps its focus when the balanced ordering wins by less; and on a tie (uniform ground) C keeps a leaning town where A sends it back.

#### The three settings, 16 seeds at turn 100

On the new tree (the escorts in all three). Six seats summed; the paired columns are against A.

| Figure | A (one focus a build) | B (no orders) | C (margin 10) | B against A | C against A |
|---|---:|---:|---:|---|---|
| Towns | 54 | 52 | 53 | −3% [−12%, +6%], 10 down, 6 up | −1% [−7%, +5%], 8 down, 6 up |
| Citizens | 317 | 315 | 320 | −1% [−11%, +10%], 10 down, 6 up | +1% [−8%, +11%], 7 down, 9 up |
| Food | 1,200 | 1,179 | 1,183 | −2% [−14%, +11%], 8 down, 8 up | −1% [−15%, +14%], 9 down, 7 up |
| Production | 1,095 | 1,059 | 1,096 | −6% [−21%, +11%], 9 down, 7 up | 0% [−15%, +17%], 9 down, 7 up |
| Gold | 397 | 415 | 428 | 0% [−26%, +36%], 7 down, 9 up | +6% [−18%, +37%], 6 down, 10 up |
| Science | 782 | 744 | 823 | −7% [−17%, +4%], 10 down, 6 up | +4% [−7%, +16%], 7 down, 9 up |
| Culture | 426 | 392 | 393 | −14% [−33%, +11%], 10 down, 6 up | −6% [−17%, +6%], 8 down, 8 up |
| Faith | 160 | 139 | 145 | −15% [−28%, +1%], 10 down, 5 up | −9% [−20%, +3%], 12 down, 4 up |
| Towns on the production focus | 18 | 0 | 25 | | +42% [+23%, +63%], 2 down, 14 up |

| Turns 51 to 100, a turn | A | B | C |
|---|---:|---:|---:|
| Focus orders | 1.59 | 0 | 0.94 |
| Back to a focus the town held in the last five turns | 0.37 | 0 | 0.20 |
| Undoing the town's last order within four turns | 0.29 | 0 | 0.17 |
| Accepted commands | 83.6 | 79.1 | 81.5 |

The pre-BP9 behaviour (the arm free to change a town's focus whenever its answer changed) was not run: C at margin nought is close to it, and BP9's end check has its figures.

- **No setting is measurably better than another.** Every interval holds nought, so at 16 seeds this is not a result, only a reading.
- **B reads lower than A on seven of eight figures** (faith −15%, culture −14%, science −7%, production −6%), as BP10's runs did. It is the least likely to be best.
- **C reads the same as A.** It is higher on science (+4%) and gold (+6%), lower on culture (−6%) and faith (−9%), and within a point on towns, citizens, food and production. It gives 41% fewer focus orders and 40% fewer quick undos, and holds two fifths more towns on the hammers: a lean is kept until the balanced ordering wins clearly, where A goes back at the next build when the table says so.
- **The default stays A** (`driver.focusOrders` 1). A and C cannot be told apart at this sample size, and A is the user's own rule from BP10. Changing the default would change every game for no measured gain. The user chooses after the parameter pass; C is one knob away.

### 3. Speed

Seeds 7, 999 and 42, the old tree and the new one in one process a seed, a turn on each in rotation, turns 100 to 120. CPU seconds of the whole turn (the probe's own bookkeeping included, the same on both trees), and the bot's own CPU inside `nextBotDecision`. All 21 turns finished on every run; the laptop was on mains power for these runs.

| Seed | Tree | CPU s a turn | Bot CPU s a turn | Commands a turn | Towns | CPU ms a command |
|---|---|---:|---:|---:|---:|---:|
| 7 | old | 4.27 | 3.41 | 189 | 75.8 | 23 |
| 7 | new | 3.86 | 3.06 | 154 | 73.4 | 25 |
| 999 | old | 3.91 | 3.01 | 163 | 71.7 | 24 |
| 999 | new | 3.25 | 2.61 | 138 | 70.0 | 23 |
| 42 | old | 2.43 | 1.86 | 108 | 57.4 | 23 |
| 42 | new | 3.17 | 2.49 | 112 | 66.0 | 28 |

- On seeds 7 and 999 the turn is 10% and 17% cheaper, with fewer commands. On seed 42 it is 30% dearer: the new game holds 15% more towns there, and a command costs a fifth more.
- **The profile of a late turn** (`node:inspector`, a turn's CPU profile). Seed 7, turns 105 to 107, on the batch's tree before its last two settler fixes: the settler arm (`settlerCommand`) was 6.5% of the turn, most of it settlers waiting in their towns that weighed every site again each turn (`marchToFreeSite` 3.6%, `marchToSite` 2.1%); the escort plan and its arms were about 1%. A settler whose escort is on its way now waits without weighing the sites (`settlerCommand`'s first BP11 clause). Seed 42, turns 110 to 112, on the final code: the settler arm is 2.0% (`marchToSite` 1.1%, `marchToFreeSite` 0.4%), the escort plan 0.7% (`readEscortPlan` 0.6%) and the housekeeping arm 0.7% with the plan inside it. Nothing of this batch's is more than about 1.5% of a turn.

### Not done, and proposals

- **Settlers held late** (the late table above): two to eight times as many at turns 121 to 130, with a quarter of them asleep, and 12% fewer towns founded in that window on the three seeds. Part of it is the settlers the wild no longer takes; part is time spent waiting and walking in pairs. Not traced further. Two knobs bear on it for the parameter pass: `expansion.escortWaitTurns` (nought: a settler walks with a soldier only when one already stands beside its town) and `expansion.roadDangerRadius`. A run with `escortWaitTurns` at nought was queued and not reached.
- **No soldier is built or bought for an escort** beyond the expansion chain's escort step. Whether a seat should train one when a settler waits with no soldier to spare is for the user or the parameter pass.
- **At sea** a settler can have no soldier on its hex, and the plan sends none; a ship as escort is not built.
- **Workers** keep the old cover reading (above). A worker version of the escort (a soldier that stands on a working worker's hex) is not built.
- **The focus default** stays A; the user chooses after the parameter pass. `driver.focusMargin` sits with `driver.focusOrders` in the `driver` block, which the tuner does not move; if the parameter pass should tune the margin, it needs a row in `data/ai.bounds.json` and a block the tuner reads.
- **The noise** was measured on two seeds to turn 80. A late game may move by more.
- **The cost of the settler arm** is BP10's site search (`marchToSite`, `marchToFreeSite`), about 1.5% of a late turn on seed 42; not changed.

### Pins

`test/sim/aiDigest.slow.test.ts`, re-cut once at the end, with the reason printed beside them: duel `4da3f046:337488` -> `4394b792:358774`, standard `6a878f7e:1003339` -> `6549b1b3:1032261`.

### Checks

- Type check clean (`npx tsc --noEmit -p .`).
- Core, by name, on the final code: every `test/sim/ai*.test.ts` that is not slow (with the new `aiEscorts.test.ts`), `test/ui/arenaPage.test.ts` (the three new knobs appear on the panel with no page edit), `test/ui/botWorker.test.ts`, `test/sim/readings.test.ts` and `test/sim/empireYieldAtRest.test.ts`: 44 files, 975 tests passed.
- Slow, by name, on the final code: `aiDigest`, `aiCardStamp`, `aiBot`, `aiDriver`, `aiWants`, `aiWar`, `aiDecision`, `aiGarrison`, `botWorker`, `religion`, `beads`, `barbarians`, `statecraft`, `ledgerFold` and `cityModifiers`: 15 files, 47 tests passed.
- Tests changed for what the batch changed: `aiWar.test.ts` (the escort case: the spare soldier within the wait), `aiBounds.test.ts` and `aiPersona.test.ts` (the two `expansion` knobs), `aiWants.test.ts` (the rich record runs nine turns, because on the new board the seventh no longer puts a town back on the balanced ordering), `aiDigest.slow.test.ts` (the pins).
- The whole core tier, the build and the whole slow tier were not run. They are the orchestrator's gate.

### Files

- `src/ai/bot.ts`: the escort (`coverOn`, `civilianCover`, `inOwnTown`, `settlerStride`, `roadDanger`, `roadAhead`, `EscortJob`, `EscortPlan`, `freeEscort`, `meetingHexes`, `readEscortPlan`, `escortPlan`, `escortJobs`, `hasSettler`, `escortDuty`, `walkWithSettlers`, `leaveTown`, `waitInTown`, `setOut`, `paceOf`); `escortAvailable`; `civilianDanger` and `civilianFlight` (a cover and a reason passed in); `settlerCommand` (the plan, the wait for an escort on its way, the road on a kept march, `foundWithEscort`, the walk home); `marchToSite` (a site both can reach, the road for a settler alone); `soldierCommand` (`escortDuty` early; `escortMarch` removed); `housekeeping` (`walkWithSettlers` first); `BotSitting.escorts` and `escortOrders`; the focus margin (`marginFocusCommand`, `focusReading`, `focusTable`'s `edge` and `gated`).
- `src/ai/settlerSites.ts`: a settler asleep in its seat's own town claims a site.
- `src/ai/aiConfig.ts` and `data/ai.json`: `expansion.escortWaitTurns` (2), `expansion.roadDangerRadius` (2), `driver.focusMargin` (10), `driver.focusOrders`' third setting; the docblock of `war.escortRadius`. `data/ai.bounds.json`: rows for the two `expansion` knobs.
- Tests: `test/sim/aiEscorts.test.ts` (new); `test/sim/aiEndCheckLoops.test.ts` (the margin); `test/sim/aiWar.test.ts` (the escort case); `test/sim/aiBounds.test.ts` and `test/sim/aiPersona.test.ts` (the new knobs); `test/sim/aiWants.test.ts` (the rich record runs nine turns); `test/sim/aiDigest.slow.test.ts` (the pins).
- `docs/bot-priorities.md`, and this section.

## BP12: the late pile of settlers, 2026-11-16

`docs/flags.md` (ooooooo), the bullet "BP12: the late pile of settlers, approved 2026-11-15". The user's rule: a settler that waits must not be a reason to build another, and a seat must not hold more settlers than it has free sites and can move. Bot changes only: no file under `src/sim/` and no rules data changed.

### Method

- **Trees**, each a detached `git worktree` with the main tree's `node_modules` linked in. The **old tree** is `f5111f10` (BP11 and the flags commit). The **new tree** is the old tree with this batch's bot files copied in, as measured: the batch without the speed work of part 4, which plays the same game (part 4). Three variants were measured on the way (part 3). The old tree also got the two measurement readings (`settlerReading`, `escortReading`), which send nothing.
- **The game** is the end check's: six seats with two decks each, standard map, barbarians on. The 16 end-check seeds.
- **The probe** is `play12.ts` in the session's scratch folder `bp12/`, cut down from BP11's `play11.ts`. At the end of each seat's turn it writes one row for each settler of the seat: where it stands (in a town, beside one, on the road, at its site), whether it sleeps, its march, whether a soldier of its own shares its hex, its claim (`siteClaims`), its own arm's answer and reason now (`settlerReading`, asked as if it were awake), its escort job, and the seat's spare soldiers (`escortReading`). For a settler that waits with nowhere to go it also counts the free sites within 8 hexes, those with a hostile within 4 hexes, and those with no route. At each settler start it records what the price saw: the free sites left after the claims, the seat's settlers by state and the spare soldiers. It also records every settler's life (start, orders, fate), as BP10's probe did.
- **The probe does not change play.** The digest at turn 100 is the same with the rows, with only the lives, and with nothing recorded (seeds 7, 999 and 42, both trees).
- **Paired figures** as in BP10 and BP11: for each seed the ratio of one tree's total to the other's, the geometric mean of the ratios with a 95% t interval, and the seeds down and up.
- **Seconds** are CPU seconds (`process.cpuUsage`). The laptop was on mains power at the start (`pmset`: "AC Power"); from about 09:40 it ran on battery and slept once for 21 minutes (the power log). The runs went on after it woke, CPU seconds do not count the sleep, and no run was lost. Other load shared the machine (load average 11 to 17), so seconds compare only between trees of one process.

### 1. The trace

Seeds 999, 42, 7, 1 and 2026 on the old tree to turn 140, every settler of the six seats at every turn from 90 to 140: 355 settlers and 4,124 settler-turns. 213 of the settlers founded a town, and 142 were still alive at turn 141.

**Settler-turns by state**, turns 90 to 140:

| State | 999 | 42 | 7 | 1 | 2026 | All | Share |
|---|---:|---:|---:|---:|---:|---:|---:|
| Waits in a town: nowhere it can go | 193 | 56 | 227 | 220 | 369 | 1,065 | 26% |
| Marches with an escort | 178 | 205 | 224 | 127 | 400 | 1,134 | 27% |
| Marches alone | 241 | 195 | 224 | 120 | 209 | 989 | 24% |
| Runs home | 44 | 56 | 90 | 38 | 94 | 322 | 8% |
| Waits a turn in the field for its escort to keep pace | 43 | 35 | 51 | 36 | 77 | 242 | 6% |
| Waits in a town for an escort on its way | 30 | 30 | 36 | 55 | 88 | 239 | 6% |
| Waits in a town: a hostile near the road, no escort | 9 | 6 | 21 | 5 | 6 | 47 | 1% |
| Stands in the field: nowhere it can go | 39 | 0 | 2 | 4 | 2 | 47 | 1% |
| Founds, or steps out to its escort | 4 | 8 | 5 | 1 | 21 | 39 | 1% |
| All | 781 | 591 | 880 | 606 | 1,266 | 4,124 | |

"Marches" includes the far march to a free site beyond the settler's own 8 hexes (158 settler-turns) and marches whose next stretch has turned unsafe, which a stored route walks on (229).

**Settlers that waited more than three turns**, by the cause they waited for most: 122 settlers, 1,425 waiting turns (11.7 each). Only 40 of them founded a town by turn 141; 82 were still alive.

| Main cause of the wait | Settlers | Waiting turns |
|---|---:|---:|
| Nowhere it can go, in a town | 92 | 1,172 |
| Its escort cannot keep pace, in the field | 15 | 90 |
| Its escort is on the way, in a town | 10 | 75 |
| A hostile near the road and no escort, in a town | 3 | 43 |
| Nowhere it can go, in the field | 2 | 45 |

**Why "nowhere it can go"** (1,065 settler-turns in a town):

| Reading at that turn | Settler-turns |
|---|---:|
| Every free site within 8 hexes has a hostile within 4 hexes, and no escort job | 710 |
| of which a town of the seat was short of its garrison, so the plan sent no escort at all | 374 |
| of which every town was held, and no free soldier was within 2 turns of the town | 336 |
| Every free site has a hostile near it, and its escort already stood beside the town | 163 |
| No legal free site within 8 hexes | 175 |
| Other (no route, or a road danger the probe does not split out) | 17 |

**What the price saw at each settler start**, turns 90 to 140: 320 starts (316 in a queue, 4 bought). At a start the seat already held 4.8 settlers and had 2.2 more in queues, and the price saw 10.1 free sites and 15.1 spare soldiers on average. 154 of the 320 starts (48%) came while a settler of the same seat already slept in one of its towns, and 57 of the 69 such starts on four seeds came within about 8 hexes of that town.

**The causes, with counts:**

- **No free soldier: not a cause.** No waiting settler-turn fell on a turn with no spare soldier. The seats held 12 to 35 spare soldiers each at turns 121 to 130.
- **A visible hostile near the road: a small cause.** 47 settler-turns (1%) waited for that reason. The large cause is the hostile near the **site**: in 873 settler-turns every free site within 8 hexes had a hostile within 4 hexes, so the settler arm, weighing the sites as a settler alone, struck them all.
- **A waiting settler not counted against the free sites: not a cause.** A settler asleep in its own town claims a site (BP11). 172 of the 1,640 waiting settler-turns had no claim, and in each of them there was no free site left for it to claim, so a town could not raise another for one either.
- **The claim changes while it waits: true, not a cause of the pile.** In 367 of 1,640 waiting settler-turns (22%) the claim differed from the turn before, because a standing claim is the nearest free site and moves with the other settlers' marches. It changes which site a settler is for, not how many settlers a town raises.
- **Something else: the escort never came, and the towns kept building.** Three faults in BP11's escort plan kept the soldiers away from the settlers that needed them:
  - a soldier waiting on the hex beside the town did not count as walking with the settler, because a settler in a town has no cover (163 settler-turns, and 48 more with no legal site);
  - one town short of its garrison anywhere in the empire stopped every escort (`townsAreHeld`), and a town was short in a fifth of the seats' turns (437 settler-turns);
  - the plan took only a soldier within 2 turns (`expansion.escortWaitTurns`) of the town, although the seat had a dozen to spare further off (336 settler-turns).

  At the same time the settler price read only the free sites, not whether a settler could reach them, so about half the starts came while a settler of the seat already slept in one of its towns, most of them near it.

**A run with `expansion.escortWaitTurns` at nought** (the old tree, seeds 999, 42 and 7, BP11's open question) separates the two waits: the waits for an escort on its way fall from 96 settler-turns to 1, and the waits with nowhere to go stay at 20% of settler-turns (366 of 1,833). The pile is not the short wait for an escort; it is the settlers that have nowhere they may go alone and get no escort.

### 2. The fix

Four changes in `src/ai/bot.ts`, one knob, and no change to the rules. Part 4 adds four changes to the escort plan's cost that give the same answers.

- **The escort beside the town counts** (`settlerCommand`). A settler in its own town has no cover, because `coverOn` counts no soldier in a town. So before BP12 a settler whose soldier already stood on the meeting hex beside the town (`meet`, nought turns) still weighed the sites as a settler alone, struck every site with a hostile near it, and slept, with the soldier waiting beside it. Now that soldier walks with it: the settler may choose a site with a hostile near it, and steps out onto the soldier's hex (`leaveTown`).
- **A settler that already sleeps in its town calls a soldier from further off** (`readEscortPlan`, knob `expansion.escortCallTurns`, 6). A settler just raised still takes only a soldier within `expansion.escortWaitTurns` (2) turns of the town, and otherwise leaves alone on a safe road, as in BP11. A settler asleep in its town takes a free soldier within `expansion.escortCallTurns` turns. It waits for that soldier only while it cannot leave alone: it is asked again each turn (`wakeIdleSettler`), and it leaves alone when a site and its road are safe (`leaveTown`'s `called`). The soldier walks to the meeting hex through the soldier's own arm (`escortDuty`), as in BP11.
- **A town short of its garrison keeps only its nearest soldiers** (`garrisonReserve`). Before BP12 one town short of its garrison anywhere in the empire stopped the whole escort plan (`townsAreHeld`). Now, for each such town, its nearest free soldiers, as many as it is short, are held back for it. They are the soldiers the garrison arm sends there (`undefendedCity` sends each soldier to its nearest empty town). The other free soldiers may walk with a settler.
- **A settler that cannot move is no reason to raise another** (`settlerWaitingNear`, read by `settlerTerms` for the queue's row and the faith purchase, and by `settlerSiteRefusal` for the gold purchase). A town prices a settler at nothing while a settler of the seat sleeps in a town within `expansion.siteSearchRadius` (8) hexes of it with no soldier coming for it in the escort plan. The row says why: "Settler 812 already waits in Larkspur, 5 hexes off, with no soldier coming to walk with it, so a settler raised here now would wait for the same ground". The plan this reads is read once for each revision of the board in a context (`pricedEscortPlan`).
- **Two readings for the measurement**, which send nothing: `settlerReading` (a settler's own answer and reason, asked as if it were awake, with its escort job) and `escortReading` (the seat's spare soldiers, and whether its towns are held).

**Tests.** `test/sim/aiEscorts.test.ts`, a new block of five: a settler steps out to the soldier beside its town when no site is safe alone; a settler asleep in its town calls a soldier four turns off, and a settler just raised does not; it still leaves alone on a safe road while that soldier walks; it waits for that soldier when it cannot leave alone, and the soldier marches; a town short of its garrison keeps its nearest soldier and another soldier still walks with a settler. `test/sim/aiEndCheckLoops.test.ts`, two more: a town prices no settler while a settler of the seat sleeps in it with no soldier coming, with the sentence, and prices one again when it has gone; a settler asleep with a soldier coming holds nothing back. All five escort tests and the first end-check test fail on the old tree. `test/sim/aiBounds.test.ts` and `test/sim/aiPersona.test.ts` list the new knob.

### 3. Before and after

The new tree as measured is the batch without the speed work of part 4, which plays the same game (part 4).

**16 seeds, turns 50 and 100**, the old tree against the new. Six seats summed.

| Figure | Old tree | New tree | New against old |
|---|---:|---:|---|
| Towns, turn 50 | 23.1 | 23.1 | 0% [−5%, +4%], 7 down, 6 up |
| Towns, turn 100 | 57.9 | 54.4 | −6% [−13%, +2%], 11 down, 5 up |
| Citizens, turn 100 | 330 | 322 | −3% [−8%, +3%], 11 down, 5 up |
| Food, turn 100 | 1,305 | 1,210 | −7% [−16%, +3%], 9 down, 6 up |
| Production, turn 100 | 1,138 | 1,168 | +3% [−10%, +18%], 8 down, 8 up |
| Gold, turn 100 | 467 | 399 | −16% [−35%, +8%], 10 down, 6 up |
| Science, turn 100 | 833 | 860 | +4% [−7%, +15%], 5 down, 11 up |
| Culture, turn 100 | 434 | 404 | −8% [−19%, +4%], 11 down, 5 up |
| Faith, turn 100 | 164 | 185 | +13% [0%, +28%], 6 down, 10 up |
| Settlers held, turn 100 | 11.4 | 8.6 | −27% [−57%, +23%], 7 down, 8 up |

| Turns 1 to 100, 16 seeds | Old tree | New tree |
|---|---:|---:|
| Settlers started | 1,137 | 992 |
| Settlers alive at some turn | 1,065 | 958 |
| Founded a town | 850 | 795 |
| Taken by the wild (from the settlers' lives) | 55 | 55 |
| Taken by a rival | 6 | 1 |
| Still alive at turn 101 | 152 | 106 |
| Units lost to the wild: settlers taken (from each turn's losses) | 51 | 53 |
| workers taken | 342 | 306 |
| soldiers killed | 883 | 794 |
| traders killed | 40 | 13 |

**The late window, turns 100 to 130**, the 15 seeds where both trees reach turn 130 (the new tree's game on seed 5 ends at turn 127, when a seat finishes the Opus).

| Figure, summed over the 15 seeds | Old tree | New tree | New against old |
|---|---:|---:|---|
| Settlers held, a turn at 121 to 130 | 340 | 254 | −27% [−41%, −10%], 13 down, 2 up |
| of which asleep | 92 | 26 | −67% [−80%, −46%], 12 down, 3 up |
| Towns founded at turns 100 to 130 | 390 | 406 | 0% [−17%, +20%], 8 down, 7 up |
| Towns held, a turn at 121 to 130 | 1,191 | 1,142 | −5% [−13%, +4%], 8 down, 7 up |
| Settlers started or bought at turns 100 to 130 | 517 | 543 | +12% [−10%, +38%], 4 down, 11 up |
| Settler rows held back because a settler waits near (part 2) | 0 | 772 of 7,763 | |
| Settlers taken by the wild at turns 100 to 130 | 24 | 27 | |
| of which on seeds 999, 42 and 7 | 5 | 7 | |

**Settler-turns by state after**, the trace of part 1 on the new tree (seeds 999, 42, 7, 1 and 2026, turns 90 to 140). The new tree's games on seeds 999 and 42 end at turns 136 and 133 (a seat finishes the Opus), so the window holds 242 game-turns against 254.

| State | Old tree | New tree |
|---|---:|---:|
| Waits in a town: nowhere it can go | 1,065 (26%) | 281 (9%) |
| Marches with an escort | 1,134 (27%) | 1,224 (38%) |
| Marches alone | 989 (24%) | 799 (25%) |
| Runs home | 322 (8%) | 281 (9%) |
| Waits a turn in the field for its escort to keep pace | 242 (6%) | 326 (10%) |
| Waits in a town for an escort on its way | 239 (6%) | 220 (7%) |
| Waits in a town: a hostile near the road, no escort | 47 (1%) | 64 (2%) |
| Stands in the field: nowhere it can go | 47 (1%) | 19 (1%) |
| Founds, or steps out to its escort | 39 (1%) | 30 (1%) |
| All | 4,124 (16.2 a game-turn) | 3,244 (13.4 a game-turn) |
| Settlers that waited more than three turns | 122 (1,425 waiting turns) | 73 (682 waiting turns) |

| Turns 121 to 130, a turn, six seats summed | 999 | 42 | 7 | 1 | 2026 |
|---|---:|---:|---:|---:|---:|
| Settlers held, old tree | 20.1 | 12.9 | 18.0 | 18.1 | 37.5 |
| Settlers held, new tree | 14.8 | 13.7 | 18.3 | 11.4 | 24.4 |
| Free sites a settler in the nearest town has a route to, new tree | 33.1 | 44.6 | 18.5 | 66.7 | 49.9 |
| Spare soldiers, new tree | 140.8 | 103.6 | 136.3 | 169.5 | 103.5 |

Of the 281 settler-turns still spent asleep in a town with nowhere to go, 208 have every free site near a hostile and no soldier within `expansion.escortCallTurns`, and 65 have no legal free site within 8 hexes.

- **The pile is smaller, and it is no longer asleep.** Over 15 seeds the seats hold 27% fewer settlers at turns 121 to 130, with an interval below nought, and two thirds fewer asleep. The settlers that wait with nowhere to go fall from a quarter of all settler-turns to a tenth. The settlers held late are below the free sites the seats can reach on every traced seed; on the old tree seed 2026 held more (37.5 against 33.4).
- **Towns founded late do not fall.** 406 against 390 at turns 100 to 130 over 15 seeds; the paired figure is 0%, 8 seeds down and 7 up.
- **Towns at turn 50 hold; towns at turn 100 read 6% lower**, with an interval that holds nought ([−13%, +2%]) and 11 seeds of 16 down. The towns start 13% fewer settlers to turn 100 (992 against 1,137) and found 6% fewer towns. A variant without the leave-alone rule reads 1% lower at turn 100, but the wild takes more settlers with it and the pile barely shrinks (below).
- **The wild takes as many settlers**: 55 against 55 to turn 100, and 27 against 24 at turns 100 to 130 (5 against 7 on BP11's three seeds). The counts are small.
- **Yields at turn 100**: production +3%, science +4%, faith +13% (its interval is just above nought), gold −16%, culture −8%, food −7%; every other interval holds nought. The hammers not spent on settlers (13% fewer started) most likely show in the production and the science; the gold, culture and food read lower with fewer towns.
- **Games end earlier on some seeds.** On the trace seeds the new tree's games on 999 and 42 end at turns 136 and 133, and in the 130-turn runs seed 5 ends at 127; the old tree's reach 141 on all of them. A seat finishes the Opus sooner. This was not traced.

**Variants measured on the way**, each against the old tree (16 seeds unless said; the late figures over the seeds both trees take to turn 130). "Held back" is the rule that a town raises no settler while a settler of the seat sleeps near it; "leave alone" is the rule that a settler waiting for a soldier called from further off still leaves alone when its road is safe.

| Tree | Towns, turn 50 | Towns, turn 100 | Settlers held at 121 to 130 | of which asleep | Towns founded at 100 to 130 | Settlers the wild took, to turn 100 | the same, 100 to 130 |
|---|---|---|---|---|---|---|---|
| First version: held back for any settler asleep near the town, no leave alone | −4% [−11%, +2%] | −7% [−16%, +3%] | not run | | | 55 → 52 | |
| No held back, no leave alone (12 seeds at turn 50, 11 later) | 0% [−6%, +7%] | +6% [−7%, +20%] | −13% [−31%, +11%] | −43% | −5% [−22%, +16%] | 39 → 56 | 19 → 26 |
| Held back for a settler with no soldier coming, no leave alone | −2% [−6%, +3%] | −1% [−12%, +10%] | −6% [−22%, +13%] | −35% | +9% [−3%, +23%] | 55 → 64 | 24 → 40 |
| **The batch**: held back for a settler with no soldier coming, and leave alone | 0% [−5%, +4%] | −6% [−13%, +2%] | −27% [−41%, −10%] | −67% | 0% [−17%, +20%] | 55 → 55 | 24 → 27 |

- **The first version cost early towns.** It held back for a settler whose escort was already on its way, which early in the game is most of them. Holding back only for a settler with no soldier coming costs nothing measurable: the third row against the second, towns at turn 100 0% [−6%, +7%] on 11 seeds.
- **The leave-alone rule is the difference between the last two rows.** With it the wild takes no more settlers than on the old tree (55 against 55 to turn 100) and the pile shrinks by a quarter. Without it the wild takes 64 and 40, and the pile shrinks by 6%. Paired against each other on 16 seeds, the batch has 5% fewer towns at turn 100 [−10%, +1%], 11 seeds down and 4 up. Which matters more is a choice for the user; the batch keeps the rule, because the wild is one of the brief's limits and the pile is the batch's purpose.

### 4. Speed

**CPU seconds a turn**, seeds 7, 999 and 42, turns 100 to 120, all 21 turns on every run. Two processes a seed: the old tree against the new tree as measured, and the new tree as measured against the final code (with the speed work below). Trees in one process play a turn each in rotation. The bot's own CPU is the time inside `nextBotDecision`.

| Seed | Tree | CPU s a turn | Bot CPU s a turn | Commands a turn | Towns | CPU ms a command |
|---|---|---:|---:|---:|---:|---:|
| 7 | old | 7.26 | 5.76 | 158 | 75.1 | 46 |
| 7 | new, as measured | 6.95 | 5.64 | 173 | 82.1 | 40 |
| 999 | old | 7.04 | 5.62 | 144 | 74.1 | 49 |
| 999 | new, as measured | 7.09 | 5.58 | 120 | 80.2 | 59 |
| 42 | old | 4.70 | 3.65 | 110 | 63.3 | 43 |
| 42 | new, as measured | 5.57 | 4.41 | 119 | 67.0 | 47 |

| Seed | New, as measured | Final code | Same game |
|---|---:|---:|---|
| 7 | 6.12 | 6.31 | yes (digests at turns 100 and 120) |
| 999 | 6.12 | 5.89 | yes |
| 42 | 4.86 | 4.68 | yes |

- On seed 7 the turn is 4% cheaper; on seed 999 it costs the same with a sixth fewer commands; on seed 42 it is 19% dearer, in a game with 6% more towns and 8% more commands, and a command costs a tenth more. The two processes ran at different times under different load, so only the columns of one table compare.
- The final code against the tree as measured is within the noise of a run (−4% to +3%).

**The profile of a late turn** (`node:inspector`, seed 42, turns 110 to 112, the new tree as measured). The escort plan (`readEscortPlan`) was 5.7% of the turn, against 0.4% on the old tree at the same turns. On the old tree one town short of its garrison stopped the plan at its first lines, and a town was short in a fifth of the seats' turns; now the plan is read in full at every revision of the board while the seat has a settler (234 reads in three turns), and a settler asleep in its town asks for soldiers further off.

Four changes give the same answers and make it cheaper:

- each soldier is read once (`freeEscort` at any health, then its health), where the plan read it twice;
- a soldier with no movement left is not asked for a route to a marching settler, which it must reach this turn (`pathTurns` starts a new turn before the first step);
- the reserve for towns short of their garrison is read only when a town is short (`townsAreHeld` first);
- a waiting settler's route to its site is asked last, only when a soldier could come for it.

On seeds 7, 999 and 42 the final code plays the same game as the measured tree (the same digest at turns 100 and 120). They save little: on two more profiles of the same turns the plan was 4.3% and 5.5% of the turn. **The plan is still about 5% of this late turn**, and nothing else of the batch's is above 3.2% (`settlerCommand` 3.2%, `walkWithSettlers` and `escortDuty` 2.1% each with the plan inside them, `settlerTerms` 1.4%, `pricedEscortPlan` and `settlerWaitingNear` 0.5% each). It is not fixed (below).

**Tried and dropped:**

- **A plan kept across revisions while nothing it reads has changed** (a fingerprint of every unit, town, camp, hex owner, hex feature, technology, war and slotted Order). It kept the plan for only 13 of 234 reads, because nearly every command moves a piece or changes a queue, and the fingerprint itself cost a quarter of what it saved.
- **Routes kept for the sitting**, by piece, place, movement left and goals. The plan fell to 2.6% of the turn. But a route depends on more than those (an enemy piece killed, a piece of the seat's own on the way), and on seed 7 the game parted from the measured tree between turns 100 and 120. A change to speed must not change play that the tables above measure, so it was dropped.

### Not done, and proposals

- **Towns at turn 100 read 6% lower** (the interval holds nought). The towns start 13% fewer settlers to turn 100. The variant without the leave-alone rule reads 1% lower at turn 100 but lets the wild take more settlers (part 3). Why the leave-alone rule costs early towns was not traced.
- **The remaining waits**: 208 of the 281 settler-turns still asleep in a town with nowhere to go have every site near a hostile and no free soldier within `expansion.escortCallTurns` turns, and 65 have no legal free site within 8 hexes. A settler that cannot move is no reason to build another, so they no longer raise new ones near them, but they still cost their upkeep. A seat could train a soldier for one (the brief's fourth option); it is not built.
- **Games end earlier on some seeds** (a seat finishes the Opus at turns 127 to 136 on three of the measured games). Not traced.
- **`expansion.escortCallTurns`** (6) was not swept. It and `expansion.escortWaitTurns` are for the parameter pass.
- **The escort plan's cost is about 5% of a late turn** on seed 42 (5.7% before the four exact changes, 4.3% to 5.5% after, against 0.4% on the old tree), above the brief's few percent. Keeping routes for a sitting brought it to 2.6% but changed play, so it was dropped. Two ways to finish it, not built: key a kept route on the pieces near it, so a route is asked again when something near it moves; or read the plan once a sitting for the settlers asleep in their towns, whose soldiers walk for several turns anyway.

### Pins

`test/sim/aiDigest.slow.test.ts`, re-cut once at the end, with the reason printed beside them: duel `4394b792:358774` -> `98ab65ea:361047`, standard `6549b1b3:1032261` -> `8c45d70b:1032553`.

### Checks

- Type check clean (`npx tsc --noEmit -p .`).
- Core, by name, one worker: every `test/sim/ai*.test.ts` that is not slow, `test/ui/arenaPage.test.ts` (the new knob appears on the panel with no page edit), `test/ui/botWorker.test.ts`, `test/sim/readings.test.ts`, `test/sim/empireYieldAtRest.test.ts` and `test/mapgen/moduleCycles.test.ts`: 45 files, 1,080 tests passed, on the final code.
- Slow, by name, one worker (`TEST_TIER=slow`): `aiCardStamp`, `aiBot`, `aiDriver`, `aiWants`, `aiWar`, `aiDecision`, `aiGarrison`, `botWorker`, `religion`, `beads`, `barbarians`, `statecraft`, `ledgerFold` and `cityModifiers`: 14 files, 45 tests, on the final code; 44 passed and one failed, in `aiCardStamp`: "finds a footprint on the books for each shape it reads as on them", for the unit-loss rule. That check needs a recorded position where a seat that prices The Funeral Oration or The Glorious Dead has lost units inside the weariness window. The game the BP12 bots play has none: seat 5 prices The Glorious Dead at turns 119 to 121 with no losses, and no other seat prices either card at any turn from 100 to 121. The bot's reading of the rule did not change. The test now records the last position once more with two units of each seat lost to the next seat that turn (`recordPositions`), and `aiCardStamp` passes, all four cases (4 tests). `aiDigest` with the new pins: 2 tests passed.
- The new tests fail on the old tree: all five of `aiEscorts.test.ts`' new block, and the first new test of `aiEndCheckLoops.test.ts`.
- The whole core tier, the build and the whole slow tier were not run. They are the orchestrator's gate.

### Files

- `src/ai/bot.ts`: `settlerCommand` (the escort beside the town, `beside`; a far call waits only when it cannot leave alone); `leaveTown` (`called`); `readEscortPlan` (the long call, `garrisonReserve` in place of the `townsAreHeld` gate, the claim's route asked last, one `freeEscort` a soldier, the no-movement skip); `garrisonReserve` (new); `settlerTerms` and `settlerSiteRefusal` (the waiting rule); `settlerWaitingNear`, `pricedEscortPlan` and `settlerWaitingWords` (new); `settlerReading` and `escortReading` (new, for the measurement).
- `src/ai/aiConfig.ts` and `data/ai.json`: `expansion.escortCallTurns` (6). `data/ai.bounds.json`: its row.
- Tests: `test/sim/aiEscorts.test.ts` (five new), `test/sim/aiEndCheckLoops.test.ts` (two new), `test/sim/aiBounds.test.ts` and `test/sim/aiPersona.test.ts` (the new knob), `test/sim/aiDigest.slow.test.ts` (the pins), `test/sim/aiCardStamp.slow.test.ts` (a worn copy of the last recorded position, below).
- `docs/bot-priorities.md`, and this section.

## BP13: refused deals, the escort plan's cost, and soldiers that guard workers, 2026-11-16

`docs/flags.md` (ooooooo), the bullet "BP13: refused deals, the escort plan's cost, and soldiers that guard workers". The user: *"Let's fix the refused deal and escort plan points. … the bots should have logic to move soldiers to protect workers if they sense a hostile unit."* Bot changes only: no file under `src/sim/` and no rules data changed; one new bot knob.

### Method

- **Trees.** The **old tree** is `9164452f` (BP12 and docs commits; `9dc92d40` after it changes only `docs/flags.md`), a detached worktree. The **new tree** is the old tree with this batch's files copied in. For part 2 alone, two timed copies (`inst2.py`) wrap the escort plan in a CPU timer: one of the old code, one of the part 2 code without parts 1 and 3.
- **The game** is the end check's: six seats with two decks each, standard map, barbarians on.
- **Seeds.** The coordinator asked for fewer seeds because the machine was overloaded. Two seeds were played to turn 120 on both trees, 42 and 999; seeds 7, 1 and 2026 were cut when the battery ran low (9% at 20:05). The play tables are a first reading on two seeds; a 16-seed check is a later job. Seed 7 was used for the escort plan's timing (part 2).
- **The probe** is `play13.ts` in the session's scratch folder `bp13/`. It plays the old and the new tree in one process, a turn on each in rotation, and records per turn the CPU of the whole turn and of `nextBotDecision`, the accepted commands by type, units lost to the wild by kind, worker-turns by state (from the last order each worker got in the turn and its summary), deals in force, and every deal paper in turns 50 to the end of the window, with the facts the receiver's clauses read at the proposal and at the answer, and the answer. The hooks send nothing: the old tree's seed 42 reached `4653d278:986102` at turn 110, the digest of a game played with no probe.
- **Profiles.** `snap.ts` plays a seed to turn 110 and saves the state with the bot's harness memories (`readHarnessMemory`); `prof13.ts` restores it and plays turns 110 to 112 with a CPU profile; `pair13.ts` restores it into two trees and plays them a turn each in rotation, so both see the same load. A restored game plays the same game as an uninterrupted one (the digest above).
- **Seconds** are CPU seconds (`process.cpuUsage`). The laptop ran on battery (73% at the start, 23% at 19:25) and was shared with other jobs: the load average ran from 8 to 47. Every run was niced (`nice -n 15`), one game process at a time from 16:30. CPU figures compare only between the two trees of one process.
- **Paired figures**: for each seed the ratio of the new tree's six-seat total to the old tree's, the geometric mean of the ratios with a 95% t interval, and the seeds down and up. With four seeds an interval is wide.

### 1. Refused deals

#### The reproduction

Seed 999, old tree, turns 50 to 136 (the game ended at 136, when seat 3 finished the Opus), every paper a bot wrote. The only paper the bots write is the swap of one luxury held twice for one held none of (`swapDecision`); peace offers were counted apart.

| Fate of the paper | Papers |
|---|---:|
| Sent back: it asked for the receiver's **last copy**, and the receiver held one copy when it was written | 102 |
| The same, and the same paper had been sent back before (written again after the refusal memory lapsed or the holdings moved) | 26 |
| Sent back: the receiver held two when it was written, but lent one elsewhere before it answered | 2 |
| Sent back by the rules at the signing: the writer's copy was already lent in another paper ("The S1 have no dyes to lend") | 2 |
| Sent back on price: what was offered reached the receiver first by another paper | 1 |
| Signed | 38 |
| Not answered before the game ended | 1 |
| **All** | 172 (2.0 a turn; 22% signed) |

- **The cause is one clause the writer never asked.** A receiver refuses a paper that asks for a kind it holds once (`asksOurLastCopy`). The writer checked that clause only after a paper had been sent back once, and only to decide whether to sweeten it. 128 of the 133 refusals were that clause at the moment of writing.
- **The price never refuses a swap the bot writes.** A kind the receiver lacks arrives at the baseline, the kind it lends leaves at the baseline less what its cards pay back, and a new partner only adds; so the paper reads nought or more on any sheet. Only the hard clauses decide.
- **Re-sending**: 122 distinct papers in 172. A refused paper came back when the refusal memory (`war.refusalMemoryTurns`, 20) lapsed or the receiver's holdings changed.
- **Concurrency** is the small rest: the writer offered its second copy of a kind in two papers at once, and a receiver was asked for the same kind by two seats.
- **Peace offers are not the problem**: 8 peace papers in 86 game-turns on seed 999, none sent back; on seeds 42 and 999 at turns 50 to 100, 0.02 a turn and no envoy sent home.

#### The fix

- **The receiver's own reading** (`dealVerdict`, `diplomacy.ts`). `answerProposal`'s three clauses are one function now, and the writer asks it of a bot receiver before it writes (`writeSwap`), on the receiver's sheet and context (`receiverReader`). Both seats run the same code, so a paper goes to a bot only when the reading the receiver answers with signs it. The receiver's full context (`valueContext`, as its own sitting builds it, with `seatBooks`) is built only when its cards count copies lent or deal partners; without such a card the reading needs nothing else from the context and gives the same answer, so the writer does not pay a whole book for every paper. A paper the receiver would refuse is not written, and its row says why ("the S2 would send it back: it asks for the only tea they hold"). The same paper is offered again only when the receiver's reading changes, which is the "until something changes" of the brief.
- **The papers already standing** (`swapDecision`, `standingRefusal`). A copy the writer has offered in a paper still on the table is promised, so it offers no second copy of a kind it holds twice, and it does not ask for a kind it has already asked for. It leaves a bot receiver alone when another seat's standing paper already asks it for the same kind (the receiver answers papers in order and would be left one copy) or already offers it the same kind.
- **A person is asked as before.** A human seat gets the plain swap, then once more with coin after a refusal, then nothing about that swap for 20 turns or until the person's holdings move (`dealMemory.ts`). Only the writer's own promised copies apply to a person too, so a bot no longer offers a person a copy it has already offered elsewhere. **What a person sees today**: the paper stands until it is answered, and the ✉ offers button reads "1 offer waiting" with a row "S0 · Trade offer"; the row opens the Diplomacy screen at that seat, where the person signs or sends it back. An offer does not stop the person ending the turn. A bot writes at most one paper to a seat at a time.

#### Before and after

Seeds 42 and 999, turns 50 to 100 (102 game-turns on each tree):

| A turn, six seats | Old tree | New tree |
|---|---:|---:|
| Papers proposed | 1.92 | 0.41 |
| signed | 0.28 | 0.36 |
| sent back | 1.62 | 0.05 |
| Deal commands (propose, sign, send back) | 3.82 | 0.82 |
| Share signed | 15% | 88% |
| Deals in force | 4.53 | 5.03 |
| Luxuries lent in them | 9.06 | 10.06 |
| Gold a turn in them; open borders | 0; 0 | 0; 0 |
| Peace offers; envoys sent home | 0.02; 0 | 0.06; 0 |

| Fate of the papers, turns 50 to 100 | Old tree | New tree |
|---|---:|---:|
| Signed | 29 | 37 |
| Sent back: their last copy at the proposal | 152 | 0 |
| the same, written again | 8 | 0 |
| Sent back: their last copy only at the answer (their copy went to another paper since) | 6 | 5 |
| Sent back by the rules: the copy offered was gone | 1 | 0 |

- **Signed deals did not fall: they rose by 29%** (0.28 to 0.36 a turn), and the deals and luxuries in force rose by a tenth. The deal commands fell from 3.8 to 0.8 a turn, about three commands a turn fewer.
- **What is still sent back** is a copy the receiver lent between the paper and its answer, to a paper of a seat that wrote after this check (5 in 102 game-turns).

### 2. The escort plan's cost

Done first and alone, so the pins could prove it decides the same.

#### The profile before

Seed 42, turns 110 to 112, old tree, CPU-timed copy (`readEscortPlan` wrapped in `process.cpuUsage`): **234 reads in three turns, 4.2% to 5.4% of the turns' CPU** in four runs (BP12's profiler figure was 5.7%). Where it went, by the CPU profile:

| Part of a read | Share of the plan |
|---|---:|
| `findPath` (a chase, a settler's route to its claim) | 42% |
| `findPathToFirst` (a soldier to the hexes beside a waiting settler's town) | 16% |
| `pathTurns` (each route's turns; it sweeps every piece for the zone of control at each call) | 14% |
| `siteClaims`, `freeEscort` (a walk of every town for each soldier), `garrisonReserve`, the meeting hexes' `canStopOn`, the rest | 28% |

| Who asked for a read | Reads | ms a read |
|---|---:|---:|
| `walkWithSettlers` (housekeeping, after every command) | 146 | 3.3 |
| `escortDuty` (each soldier's decision) | 58 | 7.7 |
| `settlerCommand` | 19 | 16.9 |
| the settler price (`pricedEscortPlan`, a second cache of its own) | 11 | 9.9 |

**167 of the 234 reads gave the same plan as the read before them.** Most commands move one of the seat's own pieces and leave every route the plan asks about as it was, so the route searches repeat.

#### The change

Six changes in `src/ai/bot.ts` and `src/ai/settlerSites.ts`, and a new leaf, `src/ai/routeMemo.ts`. None changes what the plan decides.

1. **A route memo for the sitting** (`routeMemo.ts`: `memoPath`, `memoPathToFirst`, `memoTurns`). The plan and `escortDuty` ask their searches through it. A kept answer is given back only while every input of the search is the same (below). 75% of the plan's searches on these turns were answered from it.
2. **One plan, one memo, for each context**, keyed on the context's site list (`contextEscortPlan`). Before, the settler price and the arms kept a plan each and could read the same plan twice at one revision.
3. **A plan whose inputs have not moved is kept** (`escortPlanInputs`): a number key of every input the plan reads. It kept the plan for about one ask in five (47 of 224).
4. **The settlers' claims and the threat to each town are kept** while their own inputs stand (`EscortKeep`, `keptClaims`, `sweepLook`), and the claims of towns' queues, which change no settler's claim, are not read (`siteClaims(…, false)`).
5. **A soldier that can be in no job is not asked about the plan** (`mayEscort` in `escortDuty`).
6. **Smaller exact savings**: the garrison counts in one walk of the pieces (`townsAreHeld`, `sweepLook`); each unit's movement profile read once a revision and passed to `canStopOn` (`moverOf`).

#### Why the answers are the same, where BP12's two attempts were not

A kept search is given back only while all of its inputs, read from `pathfind.ts`, are the same:

- **the searcher**: its id, owner, type and hex, and its movement profile, the object `moveProfile` builds for the search (what the seat's cards, technologies and resources do to its steps); a count of turns also reads its movement left;
- **every hex's owner, road and feature, every town, every piece of another seat, the pairs at war, the deals that open a border, and the turn**: the walls of `transitField`, the zone of control, closed borders, and the price of each step. When any of these moves, the memo is emptied;
- **who stands on the goal hexes**: `canStopOn` counts them against the stacking cap;
- **the seat's own pieces on a shore hex that the search can have looked at**, for a mover that may take to the water: a step across a shore ends the march, and the search asks `canStopOn` of the landing hex.

Nothing else that a search reads can change between two commands of one sitting. The seat's own pieces add nothing to the walls (`pieceBits` answers 0 for them) and nothing to the zone of control, so one of them that moves changes a search only at a goal or a landing. *Which* landings: the search is A* with a heuristic of `distance × floor`, where the floor is the mover's cheapest step, so every hex it takes off its heap lies inside the ellipse `distance from the start + distance to the goal ≤ route cost ÷ floor`, and it asks questions only of those hexes and their neighbours. A search that found no route, or that ended on a goal other than its first, can have read every hex it could reach, so for it every shore piece of the seat counts. A test walks every step of a generated map and checks that none costs less than the floor the memo uses.

The plan-level key holds every input `readEscortPlan` reads: the board above, every own piece's hex and type, each settler's and field soldier's health, health stamp, movement left, sleep and march, the towns in unrest, the camps, the empire's bonus to a piece's health, and the threat weights.

BP12's first attempt kept a plan while a fingerprint of every unit stood: exact, but it held for 13 reads of 234, because nearly every command moves a piece. Its second kept routes by piece, place, movement left and goals; a route also depends on the pieces of other seats (one killed opens a road) and on the seat's own pieces at the goal and at a landing, so seed 7 parted. This memo keys on those too, and on nothing else.

**The evidence:**

- The digest pins held with part 2 alone: duel `98ab65ea:361047`, standard `8c45d70b:1032553` (`aiDigest.slow.test.ts`, 2 tests passed).
- Every timing run on the seed 42 snapshot gave the old tree's digests at turns 110, 111 and 112 (`4653d278:986102`, `128bff1b:991329`, `dbeb4944:1000121`).
- `test/sim/aiRouteMemo.test.ts` walks a board with a lake, a coast, pieces of another seat and movers that may embark through 160 random moves, and after each one compares every kept answer with a fresh search: over 2,000 comparisons, over 1,000 of them answered from the memo, all equal.

#### The profile after

CPU of the escort plan against the CPU of the turns, the old and the part 2 code in one process on the restored game (the threat weights, read at every revision by whichever arm asks first, are taken before the timer on both):

| Seed, turns 110 to 112 | Old tree | Part 2 | Reads, old and new | Same digests |
|---|---:|---:|---:|---|
| 42 | 4.2% (0.77 of 18.1 s) | 3.0% (0.53 of 18.0 s) | 234, 177 of 224 asks | yes |
| 7 | 4.1% (1.29 of 31.3 s) | 2.9% (1.00 of 35.0 s) | 351, 262 of 326 asks | yes |

Five earlier runs of seed 42 on the way, with the threat weights inside the timer, read 4.4% to 5.4% for the old code; the final code read 2.8% to 3.7% under the same conditions.

- **About a third cheaper, not under 2%.** The searches are mostly answered from the memo (75%), but the plan is still read at most revisions: the plan key kept it for one ask in five, because most commands move a settler or a field soldier, and every one of those is an input. What is left per read is about a third route searches the memo cannot keep (a searcher that moved, the first search of a sitting) and two thirds the plan's own walks. See "Not done".

### 3. Soldiers guard a threatened worker

#### The design

Soldier-side, so the worker keeps working (BP11 found that making workers wait for a soldier on their own hex cost a fifth to two fifths of improvements). All of it is in `bot.ts`, in the section "worker guards".

- **What counts as hostile** (`guardHostile`): a combatant of the wild, or of an empire the seat is at war with, that the seat can see (`isVisibleTo`). Under a card that keeps the wild from stealing this seat's civilians (`barbariansPassive`, the rule the wild itself reads), the wild does not count.
- **The threat, by the hostile's own movement** (`hostileReach`, `workerThreat`): the hostile's own route (`findPathToFirst` with its own movement profile) to the nearest hex beside the worker, then the step onto the worker, counted by `pathTurns` with its full allowance. A threat is a hostile that could walk onto the worker within `workers.guardTurns` (2) turns; 1 means in its next move. A hostile two hexes off behind a ridge is no threat. At most `search.pathProbes` hostiles are asked for each worker, nearest first, and only those a march of that many turns could cover at a road's price.
- **A worker in enemy fields is the war's case** (`inWarFields`, the first clause of `civilianDanger`): it walks home as before, and no guard is sent into an enemy's land for it. Added after the gate's core run, where `aiWar.test.ts`' worker in enemy fields got the step-back sentence instead.
- **Read once a sitting** (`guardPlan`, `BotSitting.guards`), at the first ask, off the board as it stands then. The hostiles do not move inside a seat's turn: the wild moves in the resolution, the other seats in their own turns. A worker that walks during the turn is read again at its new hex, with no guard.
- **Which soldiers are free** (`freeGuard`): a field soldier on land, healthy (`military.healBelowHealth`), not a town's last defender and not in a threatened town (`isRedundant`), not at a camp's door (a hunt's force), not a settler's escort (the escort plan), and **at home**: inside the seat's own borders, and not marching out of them. That last clause is the campaign's: a piece on a campaign or out at a camp stands beyond the borders, and the workers work inside them.
- **The assignment** (`readGuardPlan`), soonest threat first, then by id; one soldier a worker:
  - a soldier of ours already on the worker's hex holds there (`hold`);
  - else the nearest free soldier whose route onto the worker's hex takes no more turns than the hostile needs (`march`);
  - else the nearest free soldier that can reach the hex between in that time, the last hex of the hostile's road (`screen`).
- **The soldier** (`guardDuty`, in `soldierCommand` right after the escort and before every blow and march): on its job hex it holds; anywhere else it marches there. `guardWorkers` (housekeeping, right after the escorts) sends a guard that is asleep or dug in, once a turn.
- **The worker** (`workerCommand`, `workerGuard`): with a guard coming it is covered, so the old flight rule (a hostile within `war.escortRadius` and no soldier within it) does not send it home. It works on; when a hostile could take it in its next move it works the hex it stands on, or waits, rather than walk off before its soldier arrives. With no guard coming and a hostile that could take it in its next move, it **steps back** (`stepBack`) to a soldier of ours or a town it can reach this turn, or runs for a town (`civilianFlight`). Next turn it is asked again and goes back to work when the danger has passed.
- **Release**: the plan is read again each sitting, so a guard with no threat left has no job and its own arms take it back. A soldier asleep on the hex of a worker that has no threat now is asked its own arm once a turn (`guardWorkers`), and a march or a blow is sent.
- **Cost**: one reading a sitting; a few route searches for each worker with a hostile near it and for each guard sought.
- **Knob**: `workers.guardTurns` (2), integer, with a row in `data/ai.bounds.json` (0 to 3); nought turns the guards off. It appears on the arena page through the sheet walk.
- **Tests**: `test/sim/aiWorkerGuards.test.ts` (new, 5): the nearest free soldier marches onto the worker and the worker works on; with no soldier the worker steps back to its town; a soldier already on the hex holds; a hostile behind a ridge is no danger; the knob at nought turns it off. The first three fail on the old tree.

#### Before and after

Seeds 42 and 999, turns 1 to 100:

| Six seats, two seeds | Old tree | New tree |
|---|---:|---:|
| Workers taken by the wild | 36 | 29 |
| Workers taken by a rival | 1 | 0 |
| Soldiers killed by the wild | 78 | 93 |
| Improvements started | 530 | 478 |
| Improvements standing at turn 100 | 532 | 477 |
| Worker-turns | 2,155 | 1,958 |
| of which working (a spade on its hex) | 419 (19.4%) | 374 (19.1%) |
| walking or on a march | 1,595 (74%) | 1,416 (72%) |
| running home (`civilianFlight`) | 71 (3.3%) | 53 (2.7%) |
| stepping back (`stepBack`) | 0 | 40 (2.0%) |
| standing or asleep | 70 | 75 |
| Guard orders, seed 999 to turn 120 | 0 | 42 marches, 22 holds |

- **Workers taken by the wild fell by a fifth** (36 to 29), on both seeds (21 to 19, 15 to 10). Running and stepping back together are 4.7% of worker-turns against 3.3%.
- **Improvements fell by a tenth** (530 to 478 started), and that breaks the brief's limit on these two seeds. The share of worker-turns spent working is the same (19.1% against 19.4%); the fall is in worker-turns (9% fewer), so the new games held fewer workers. Parts 1 and 3 both change the game from turn 20 on, and this run cannot tell which one moved the worker count; a run with `workers.guardTurns` at nought on the same seeds would, and was not made (the battery).
- **Soldiers killed by the wild rose by a fifth** (78 to 93): guards stand where the raiders strike.
- **Cost**: the guard plan is read once a sitting. On seed 42 at turns 100 to 120 the whole turn was 5% cheaper on the new tree; on seed 999 it was 6% dearer with 24% more commands (below).

### 4. Play at turn 100, and seconds a turn

Seeds 42 and 999, the old tree against the new, six seats summed. With two seeds every interval is far too wide to mean anything; the figures are a first reading only.

| Turn 100 | Old tree | New tree | Seed 42, seed 999 |
|---|---:|---:|---|
| Towns | 61 | 70 | 49 to 69, 73 to 71 |
| Citizens | 374 | 372 | |
| Food | 1,382 | 1,349 | |
| Production | 1,584 | 1,322 | down on both |
| Gold | 570 | 580 | |
| Science | 997 | 938 | down on both |
| Culture | 434 | 393 | |
| Faith | 193 | 164 | |

CPU seconds a turn at turns 100 to 120, the whole turn with the probe's own bookkeeping, the two trees in one process (seed 7 was cut; see "Seeds"):

| Seed | Old tree | New tree | Bot CPU, old and new | Commands a turn, old and new |
|---|---:|---:|---:|---:|
| 42 | 3.56 | 3.37 | 2.80, 2.63 | 119, 122 |
| 999 | 9.24 | 9.75 | 7.35, 7.63 | 120, 149 |

### Not done, and proposals

- **The escort plan is not under 2%.** It fell from 4.1% to 4.2% of the turns' CPU to 2.9% to 3.0% (seeds 42 and 7, turns 110 to 112, the two trees in one process), about a third cheaper. What is left is about a third searches the memo cannot keep and two thirds the plan's own walks, read at most new revisions. Two ways on, not built: track which pieces each job depends on, so a move of a piece no job can use keeps the plan (70% of the reads gave the same plan); and keep the threat weights (`threatWeights`, read at every revision by whichever arm asks first) across revisions while their inputs stand. Both are for the decision-speed batch the flags queue after BP13 (BP14).
- **Seeds.** Two seeds (42 and 999) for the play tables, against four to six asked; seeds 7, 1 and 2026 were cut when the battery ran low (9% at 20:05). The speed table has seeds 42 and 999 only. A 16-seed check is a later job.
- **Improvements fell by a tenth on the two seeds**, against the brief's limit. Not yet separated from the deals change; the next step is the same seeds with `workers.guardTurns` at nought.
- **A guard left behind.** A guard asleep on a worker's hex is let go when the worker has no threat; one whose worker walked off while it slept stays asleep until a hostile comes into its sight or another arm wakes it.
- **Peace offers** are unchanged: they were not a cause of the waste.

### Pins

`test/sim/aiDigest.slow.test.ts`, re-cut once at the end with the reason printed beside them: duel `98ab65ea:361047` -> `c19609c9:365065`, standard `8c45d70b:1032553` -> `eb076b82:1079375`. With part 2 alone both old pins held. The duel pin moved once more (from `59f22059:356663`) when a worker in enemy fields was left to the war flight; the standard pin did not move.

### Checks

- Type check clean (`nice -n 15 npx tsc --noEmit -p .`).
- Narrow tests, by name: `aiWorkerGuards` (new, 5), `aiRouteMemo` (new, 5), `aiDiplomacy` (27, 6 of them new), `aiEscorts`, `aiEndCheckLoops`, `aiBounds` and `test/ui/arenaPage.test.ts` (the new knob appears on the panel with no page edit): all passed. `aiDigest.slow.test.ts` with part 2 alone: 2 passed on the old pins; with all three parts it gave the two new digests, which are now the literals (the duel literal from the run after the enemy-fields fix, which passed on the standard board).
- The whole core tier, the build and the slow bot files are the orchestrator's.

### Files

- `src/ai/routeMemo.ts` (new): the route memo (`memoPath`, `memoPathToFirst`, `memoTurns`, `moverOf`, `boardEpoch`, `searchFloor`).
- `src/ai/bot.ts`: the escort plan's cost (`contextEscortPlan`, `escortPlanInputs`, `EscortKeep`, `keptClaims`, `SweepLook`, `sweepLook`, `redundantIn`, `mayEscort`, `freeEscort`'s `look`, `meetingHexes`' mover, `townsAreHeld` in one walk); the worker guards (`GuardThreat`, `GuardJob`, `GuardPlan`, `guardHostile`, `hostileReach`, `workerThreat`, `freeGuard`, `guardPlan`, `readGuardPlan`, `guardDuty`, `guardWorkers`, `workerGuard`, `dangerWords`, `stepBack`; `soldierCommand`, `workerCommand`, `housekeeping`, `BotSitting.guards`, `BotSitting.guardOrders`); the receiver context handed to `diplomacyDecision`.
- `src/ai/diplomacy.ts`: `PaperReader`, `contextReader`, `receiverReader`, `dealVerdict`, `verdictReason`, `standingRefusal`; `answerProposal` through `dealVerdict`; `swapDecision` and `writeSwap` (the receiver's reading, the papers standing); `diplomacyDecision`'s `rivalContext`.
- `src/ai/settlerSites.ts`: `siteClaims` without the queues' claims.
- `src/ai/aiConfig.ts` and `data/ai.json`: `workers.guardTurns` (2). `data/ai.bounds.json`: its row.
- Tests: `test/sim/aiWorkerGuards.test.ts` and `test/sim/aiRouteMemo.test.ts` (new), `test/sim/aiDiplomacy.test.ts` (six new), `test/sim/aiBounds.test.ts` (the knob), `test/sim/aiDigest.slow.test.ts` (the pins).
- `docs/bot-priorities.md`, and this section.

## BP13b: the worker fixes from the bare-hex report, and four citizen sheets, 2026-11-16

`docs/flags.md` (ooooooo), the bullet "BP13b: the three worker fixes from the bare-hex report". The user: *"the worker should target the highest value hexes, which is what it should be doing now no? a march should count as a claim, and a worker's payoff should count the charges that will actually land."* The report is `docs/plans/bare-worked-hexes-2026-11-16.md`. Bot changes only: no file under `src/sim/` and no rules data changed; one new bot knob.

### Method

- **Trees.** The **before tree** is `aa403039` (BP13 merged into the render merge), a clean detached worktree. Its bot and simulation files are BP13's (`626ccfcb`). The **after tree** is the before tree with this batch's five source and data files copied in. The **final tree** is the after tree with one change that keeps every answer the same: the four-sheet table folds each hex once (part 4). On all five seeds the final tree reached the after tree's digest at turn 100.
- **The game** is the end check's: six seats with two decks each, standard map, barbarians on, to the end of turn 100.
- **The probe** is `play13b.ts` in the scratch folder `bp13b/`: BP13's `play13.ts` with the bare-hex study's readings added. It sends no command. It plays several trees, or one tree under several tunings, in one process, a turn on each in rotation. It records per turn the CPU of the whole turn and of `nextBotDecision`, accepted commands by type, units lost to the wild, worker-turns by state, re-aimed worker marches and focus orders; every improvement a worker starts, with whether its hex is worked before and six turns later; and at turns 50, 75 and 100 the bare worked hexes (the report's definition: a worked hex, not a town's own, with no improvement and at least one legal improvement), the workers sharing a march end, the yields and the towns by focus.
- **Seeds**: 42, 999, 1, 7 and 2026. The four-sheet switch off was played on 42 and 999. One game process at a time, each at `nice -n 15` under `caffeinate -i`.
- **Machine**: the laptop, shared with other jobs (load average 4 to 38). CPU figures compare only inside one process.
- **Shared baseline.** The before tree's five games, the guards-off games of step 0 and the probe are stored in `/Users/jacky/code/webciv-baselines/aa403039/` (`six-seat-standard-t100/` and `six-seat-standard-t100-guard0/`), each with a `NOTES.md`. The after and final games are in the scratch folder `bp13b/out/`.

### Step 0: BP13's open question

BP13 saw improvements started fall by a tenth on seeds 42 and 999 (530 to 478, turns 1 to 100) and could not tell whether the worker guards or the deals change caused it. The committed tree was played again, as committed and with `workers.guardTurns` at nought (a tuning in the probe, not an edit of the data file).

**The answer.** The guards changed the game, not the deals: with the guards off, both seeds send the BP12 tree's commands, turn for turn, to turn 48 (seed 42) and turn 33 (seed 999), and hold the same towns, workers and improvements to about turn 70. With the guards off, the committed tree starts 524 improvements, against 478 with them. But the loss is on one seed only (999: 330 against 277; 42: 194 against 201), and the path is not workers held back from work. So two seeds cannot show a cost of the guards that is more than the noise of two games parting.

| Seeds 42 and 999, turns 1 to 100 | BP12 tree (`9164452f`) | Committed (`aa403039`) | Committed, guards off |
|---|---:|---:|---:|
| Improvements started | 530 | 478 | 524 |
| seed 42, seed 999 | 212, 318 | 201, 277 | 194, 330 |
| Worker-turns | 2,155 | 1,958 | 2,144 |
| Share of worker-turns working | 19.4% | 19.1% | 19.2% |
| Workers that came | | 173 | 171 |
| Workers held at turns 50, 75, 100 | 21, 43, 45 | 15, 35, 57 | 21, 42, 47 |
| Towns at turns 50, 75, 100 | 45, 81, 122 | 46, 67, 139 | 45, 81, 126 |
| Workers taken by the wild | 36 | 29 | 38 |
| Soldiers killed by the wild | 78 | 93 | 71 |
| Bare worked share at turns 50, 75, 100 | | 51%, 32%, 37% | 44%, 33%, 31% |

- **The path.** The same number of workers came (173 against 171) and the same share of worker-turns was spent working (19%). What differs is *when*: the guarded games held fewer workers and fewer towns at turns 50 and 75, and more workers at turn 100. The games part early, at turn 17 on seed 42 (a worker steps back from a raider instead of laying a farm) and at turn 31 on seed 999 (a guard's march), and grow apart from there. Soldiers killed by the wild rose by about a third with the guards on, as BP13 found.
- **One fault found** (`stepback.ts`, a count on the committed tree that sends nothing): of 52 step-backs in the two games, 12 were ordered out again in the same turn, and 7 of those ended the turn back on the hex they had fled. None laid anything after. The step back is undone because the guard plan is read once a sitting and the worker, now in its town, has no threat and walks back to its best hex.
- **Proposal, not built** (no clear case on improvements): a worker that stepped back this turn stays where it stepped to until the next sitting (a set on `BotSitting`, read in `workerCommand`). It changes safety, not the improvement count: the undone step-backs laid nothing either way.

### 1. The worker's choice shares the city's rule

- **The rule** (`rankPlanFor`, `citizenWouldWork`, `plan.ts`). For each entry, the worker asks the owning town's own citizen scorer whether a citizen would work the hex with the improvement on it: `yieldScore` with `RULES.cities.citizenWeights` or the town's focus sheet, over the hex's yield with the improvement on it (`PlanEntry.improved`, the plan's own `improvementYieldDelta` in the owner's context added to the hex's fold).
  - A hex the town does not work counts when it outranks the weakest hex the town works on that sheet (the higher score, and on a tie the lower tile index, which is `chooseCitizens`' order).
  - A hex the town works counts when the improvement keeps or raises its score, or when it still outranks the best hex the town leaves idle. A row that takes away what the sheet weighs (a lumbermill that costs a forest its food) can send the citizen off.
  - No on ground no town of the seat owns, on a hex outside the town's `assignableTiles`, and in a town that works no hex but its own.
- **What counts.** If yes, the entry counts in full, worked today or not. If no, only the part that needs no citizen counts (`PlanEntry.seatless`: the seam it opens, `seamOpeningTerms`, with the strategic copies; the whole of a survey). An entry with no such part leaves the list, so a worker with nothing left that a citizen would use sleeps, and `wakeIdleWorker` asks it again each turn. The first line of every row says which reading counted it, at nought, so the fold is unchanged.
- **There is no share knob.**
- **What it reads, and when it can be stale.** The improved yield and the owning town come with the plan entry, which is remembered on the economy clock. The town's worked hexes, scored on its sheet, are remembered on the context while the clock and the town's focus stand still (`townSheetOf`). A citizen moved by `assignCitizens` moves the clock, and the focus is in the key, so the reading is the town as it stands at each ask. Two things are not read: a seat a town has grown into and not yet filled (one turn late), and the production lean a town takes while a settler halts its growth (the build is short; the improvement outlives it).
- **A luxury's opening.** The plan priced a luxury's own pay at nothing, so under the rule an unworked plantation would have counted for nothing and fallen below any worked farm. `seamOpeningTerms` now prices the first copy of a luxury the empire cannot draw on today (`hasResource`, the access reading the strategic seam already used) at `site.newLuxuryBonus` (14), through `newResourceTerms`, the door the site and hex arms use. Access needs no citizen, so it is part of `seatless`. A second copy of a luxury the empire already draws on still adds nothing; what it could fetch in a deal is not priced.
- **The craving's seats are unchanged** (`citizenSeats`, population + 2 deep on the balanced sheet). It is a different question (which hexes a new worker's charges are for) and was not ruled; see "Choices left".

### 2. A march is a claim

- `spadeClaims` replaces `workerHexes`: a hex is claimed by each piece with charges that stands on it, as before, and by each spade whose march ends on it. The plan keeps the claimants by id (`ImprovementPlan.claims`), written again on every ask with `unclaimed`, so the shadow check still holds.
- `rankPlanFor` skips a hex another spade claims; the piece's own hex and its own march end are its own claim, so a worker asked again keeps its target in view.
- **The craving does not count a charge twice** (part 3): a claim is taken by its claimant, with that claimant's charges.

### 3. The price counts the charges that will land

- `explainWorkerCraving` asks `spokenFor` which of the seated entries the spades already out, and the ones queued, will lay. Each spade on the board:
  1. takes its march end first, with the entry's charges, however late it lands, because no other spade of the seat goes for a claimed hex. A spade with no march takes the hex it stands on only when that hex is seated, where it would lay it the next turn. Every spade takes its claim before any spade walks on;
  2. then walks the seated list by the new spade's own rule (`walkTheList`): best first, at its stride, one dig a turn, each entry it can pay for and land inside `workers.waitingTurns`.
- A spade queued in another town walks from that town from the turn the queue would finish it (the sum of `turnsToBuild` for its row and each row ahead of it). A queue with no spade in it is not timed.
- What no spade reaches in time is left for the new one. Before, every remaining charge came off the front of the list at once, so a spade far away covered a town's ground.
- **When it is read.** The board's spades are walked once a plan (again when the economy clock moves); the queues on every ask. A spade ordered to march in the sitting keeps its old claim in this reading until the next plan, the bargain the count of charges had before (once a sitting).

### 4. The bot compares all four citizen sheets

- `sheetTable` (`bot.ts`) prices the balanced, food, production and gold placements, each against the balanced one in the bot's currency: the yields (`explainYields`), the hammer premium gained (`hammerTerm`) or given up (`lostHammerTerm`, new: the same price over the table, times the hammers lost), and the growth brought forward or put off (`growthTerm`, which a food sheet can win). The production sheet must still be the chains' idea, and no sheet may starve the town (the guard `assignCitizens` applies). The best sheet above nought wins; a tie keeps the balanced ordering; between lean sheets the order production, food, gold breaks a tie.
- **Finite**: every reading is a function of the board and the sitting's frozen prices, never of the sheet the town stands on, so acting on the answer cannot change it (a test sets each of the four focuses and reads the same table).
- Under `driver.focusOrders` 2 a town moves to the best sheet when it leads the town's own sheet by more than the margin, or when a gate refuses the town's sheet. On two sheets this is BP11's rule.
- **The switch**: `growth.allFocusSheets` (1), with a row in `data/ai.bounds.json` (0 to 1, whole). At nought the arm reads the two-sheet table that shipped before (`focusTable`, unchanged). It is in `growth` because `driver.*` is frozen for the tuner (`aiBounds.test.ts`); the arena panel shows it through the sheet walk (`test/ui/arenaPage.test.ts` passed with no page edit).
- **The speed fix** (the final tree): the four sheets read each hex's fold once, and the town's food under a sheet once for each food figure, where `rankTiles` and `bagOfTiles` fold the ring again for each sheet. The figures are the same; seed 42 reached the same digest at turn 100 and its bot CPU at turns 90 to 100 fell by 8% (same game, one process).

### 5. Before and after, five seeds to turn 100

Seeds 42, 999, 1, 7 and 2026, six seats summed. The play figures are the after tree's games; the final tree played the same games (the same digests at turn 100 on all five seeds). Shares are pooled over the seeds; "seeds up/down" is the after tree against the before tree seed by seed, with the geometric mean of the ratios for counts. With five seeds a direction on all five is a reading worth having; anything else is noise.

| Figure | Before | After | Seeds |
|---|---:|---:|---|
| Bare worked share, turn 50 | 49% | 47% | 1 up, 4 down |
| Bare worked share, turn 75 | 36% | 32% | 2 up, 3 down |
| Bare worked share, turn 100 | 35% | 23% | 0 up, 5 down |
| Improvements started, turns 1 to 100 | 1,187 | 1,334 | +12%, 4 up, 1 down |
| of those to turn 94, worked six turns later | 74% | 83% | 4 up, 1 down |
| of those to turn 94, on a hex worked when started | 52% | 58% | 4 up, 1 down |
| Workers that came | 428 | 466 | +9%, 3 up, 1 down |
| Workers taken by the wild | 98 | 113 | +15%, 3 up, 2 down |
| Worker-turns | 5,366 | 5,691 | +7%, 4 up, 1 down |
| Share of worker-turns working | 17% | 19% | 3 up, 2 down |
| Re-aimed worker marches | 1,231 | 752 | −37%, 0 up, 5 down |
| Workers sharing a march end, turn 100 | 57 | 0 | 0 up, 5 down |
| Soldiers killed by the wild | 224 | 254 | +2%, 2 up, 3 down |
| Focus orders | 541 | 777 | +44%, 5 up, 0 down |
| Towns, turn 100 | 311 | 298 | −4%, 1 up, 3 down |
| Citizens | 1,773 | 1,877 | +5%, 3 up, 2 down |
| Food | 6,510 | 7,407 | +9%, 3 up, 2 down |
| Production | 6,997 | 8,216 | +17%, 3 up, 2 down |
| Gold | 2,499 | 3,396 | +38%, 4 up, 1 down |
| Science | 4,501 | 5,798 | +26%, 4 up, 1 down |
| Culture | 2,452 | 2,648 | +10%, 3 up, 2 down |
| Faith | 943 | 941 | +2%, 3 up, 2 down |

Per seed, the bare worked share at turn 100 and the improvements started: 42: 42% to 37%, 201 to 215; 999: 33% to 14%, 277 to 322; 1: 37% to 26%, 195 to 281; 7: 30% to 14%, 276 to 294; 2026: 34% to 25%, 238 to 222.

- **The bare worked share fell on every seed at turn 100**, from 35% to 23%; at turns 50 and 75 it moved little (49% to 47%, 36% to 32%). The report's aim on the proposal page was under 10%.
- **The improvements land where citizens are**: 83% of the improvements started are worked six turns later, against 74%; 12% more were started, from 9% more workers.
- **The march claim works**: no two workers share a march end at turn 100 (57 before), and re-aimed marches fell by 37%.
- **Workers taken by the wild rose by 15%**, about as much as the worker-turns and the workers (24% of the workers that came, against 23%).
- **The yields at turn 100 rose on most seeds** (gold and science on four of five), with 4% fewer towns. Two of these readings come from the four-sheet switch rather than the worker fixes (part 6).
- Towns by focus at turn 100, five seeds: before 210 balanced and 101 production; after 191 balanced, 88 production, 19 gold and none on food.

### 6. The four-sheet switch, seeds 42 and 999

The after tree with `growth.allFocusSheets` at nought (the two-sheet table) beside the before and after trees, in one process a seed.

| Figure | Before | After, four sheets | After, two sheets |
|---|---:|---:|---:|
| Bare worked share, turns 50, 75, 100 | 51%, 32%, 37% | 52%, 32%, 25% | 55%, 33%, 26% |
| Improvements started | 478 | 537 | 466 |
| worked six turns later | 72% | 83% | 88% |
| Workers that came | 173 | 180 | 156 |
| Re-aimed worker marches | 401 | 279 | 289 |
| Workers sharing a march end, turn 100 | 24 | 0 | 2 |
| Focus orders | 224 | 325 | 198 |
| Towns, turn 100 | 139 | 122 | 117 |
| Citizens | 744 | 817 | 658 |
| Food | 2,698 | 3,716 | 2,770 |
| Production | 2,644 | 4,497 | 2,123 |
| Gold | 1,161 | 1,845 | 1,282 |
| Science | 1,875 | 2,987 | 1,733 |
| Culture | 786 | 1,181 | 912 |
| Faith | 329 | 489 | 342 |

- **The worker fixes do the bare-hex work on both settings**: the share at turn 100 is 25% and 26%, the march claim holds, and more of the improvements are worked six turns later.
- **The yields part on the switch**: on both seeds the four-sheet games end turn 100 with more citizens, production and science than the two-sheet games, and on seed 42 with more food too (on 999 the two-sheet game has more food, 1,861 against 1,675). Most of the gap is seed 42, where the four-sheet game made 2,832 production against 677. Two seeds cannot tell a gain from two games parting.

### 7. Speed

CPU seconds a turn at turns 90 to 100, the whole turn with the probe's bookkeeping and the bot's own CPU inside `nextBotDecision`, the before and final trees in one process a seed (the final tree plays the after tree's games):

| Seed | Before | Final | Bot, before and final | Commands a turn, before and final | Towns at turn 100, before and final |
|---|---:|---:|---:|---:|---:|
| 42 | 1.75 | 2.45 | 1.39, 1.93 | 103, 95 | 69, 58 |
| 999 | 2.45 | 3.26 | 1.87, 2.63 | 106, 128 | 70, 64 |
| 1 | 3.38 | 4.25 | 2.64, 3.62 | 130, 113 | 49, 61 |
| 7 | 3.21 | 3.61 | 2.48, 2.91 | 103, 111 | 63, 63 |
| 2026 | 4.16 | 3.18 | 3.29, 2.48 | 121, 103 | 60, 52 |
| Mean | 2.99 | 3.35 (+15%, 4 up, 1 down) | 2.34, 2.71 (+19%) | | |

- **What the new code costs.** A CPU profile of the final tree on seed 999's turn-90 state, turns 90 to 92: every function this batch added or changed is small. `explainWorkerCraving` 0.3% of the turns, `rankPlanFor` 0.3% (with `citizenWouldWork` and `townSheetOf` inside it), `focusCommand` 0.2% (`sheetTable` 0.1%), `spokenFor` 0.1%, `spadeClaims` 0.1%. The plan's walk is 2.5% against 2.3% on the before tree (the extra fold of each hex for `PlanEntry.improved`). Together about 1.5% of a late turn.
- **Paired from one state.** The same turn-90 state played three turns on each tree in one process: seed 42, before 15.2 s and final 14.4 s; seed 999, before 10.3 s and final 9.6 s. Two profiles of the same seed 42 state, four sheets and two, read 6.5 s and 9.8 s, the other way round from the paired run, so a three-turn window says little beyond "not dearer".
- **So most of the rise at turns 90 to 100 is the games.** The final games are richer at turn 100 (production +17%, gold +38%, science +26%), and on seeds 42 and 1 a command costs a third to a half more (17 ms against 26 ms, 26 ms against 38 ms). Five seeds cannot separate a cost of the code from a richer board further than the profile does.
- **The four-sheet table's speed fix** (final against after, seed 42, one process, the same game): the whole turn at turns 90 to 100 fell from 2.28 s to 2.14 s and the bot's CPU from 1.85 s to 1.71 s.

### Not done, and choices left

- **The bare share is not under 10%.** It is 23% at turn 100 on five seeds, from 35%. At turns 50 and 75 it barely moved (49% to 47%, 36% to 32%): new towns are mostly bare (the report's table 3), and early seats hold too few charges, which the citizen test cannot help.
- **Workers taken by the wild rose by 15%**, with 9% more workers. Fix 4 of the report (the wild's toll) is still open.
- **The step back undone in the same turn** (step 0): proposed, not built.
- **The craving's seats and the worker's test differ.** The craving counts a town's worked hexes and the next two by the balanced sheet (`citizenSeats`, unchanged); the worker counts a hex in full only when a citizen would work it now, on the town's sheet. So the craving may price a hex a town will work after it grows that no worker lays until it does. Not ruled; a choice for the user.
- **A worker no longer lays ground ahead of growth.** With nothing a citizen would work, it sleeps and is asked again each turn, rather than improve a hex a town will work later. This is the ruling read strictly; the user may prefer a share for the next citizen's hex.
- **The board's spades in the craving** take entries best first by the straight distance, as the new spade's walk always did. A real worker ranks by worth over the walk and may lay unseated seams too, so the reading is a little optimistic about what the board's spades cover.
- **The lost hammer premium** (`lostHammerTerm`) is this batch's reading of "the bot's own currency": a sheet that makes fewer hammers is charged the premium the hammers carried, as a sheet that makes more is paid it. Without it the four-sheet table would favour any sheet that leaves the hills whenever engines wait on hammers. A choice for the user.
- **The four-sheet switch is on.** The food sheet held no town at any turn-100 reading; the gold sheet held 19 of 298.
- **Not measured**: 16 seeds (the brief asked for five at most); turns after 100; the bare-hex report's plain-plan yardstick; per-seat shares.

### Pins

`test/sim/aiDigest.slow.test.ts`, re-cut once at the end with the reason printed beside them: duel `c19609c9:365065` -> `96597c87:340143`, standard `eb076b82:1079375` -> `109baaf6:1053026`. Both runs reported no warning and no stall.

### Checks

- Type check clean (`nice -n 15 npx tsc --noEmit -p .`).
- Narrow tests, by name: `aiWorkerClaims` (new, 11; all 11 fail on the before tree), `aiBot` (two fixtures grown by play re-sited, below), `aiAppraisal`, `aiCampHunt`, `aiPersona`, `aiSittingMemos`, `aiWants` (two focus claims reworked for four sheets), `aiEndCheckLoops` (the BP10 and BP11 focus tests run with two sheets as written; three new four-sheet versions beside them), `aiWorkerGuards`, `aiWar`, `aiBounds` (the new knob), `aiModuleCycles`, `test/ui/arenaPage.test.ts` (the knob appears on the panel with no page edit) and `test/ui/botWorker.test.ts` (no new memory on the state): all passed.
- `aiBot.test.ts`' two fixtures on the duel grown by play: "raises a soldier over an economy building when a column is next door" moved from turn 17 to 12 (swept 8 to 32: turns 10 to 14 read as the test says), and "marches a free soldier to the door of a held camp" from turn 12 to 15 (at turn 12 a real camp five hexes off is worth more than the test's; turns 13 to 18 hold).
- Slow tier: `aiDigest.slow.test.ts` twice (the pins), and `aiWants.slow.test.ts` once (its two focus claims reworked for four sheets as in the core file). The other slow files, the whole core tier and the build are the orchestrator's.

### Files

- `src/ai/plan.ts`: `PlanEntry.seatless`, `seatlessTerms`, `improved`, `town`; `ImprovementPlan.claims`; `spadeClaims` and `marchEndOf` (in place of `workerHexes`); `pricedEntry`'s hex fold; `seamOpeningTerms` with luxuries; `rankPlanFor` with the claims and the citizen test; `citizenWouldWork`, `townSheetOf`, `idleHexOf`, `outranks`, `claimedByAnother`; `explainWorkerCraving`, `walkTheList`, `entryChargeCost` and `spokenFor` by each spade's clock; `PlanMemo.spoken` and `sheets`.
- `src/ai/bot.ts`: `sheetTable`, `lostHammerTerm`, `focusTableFor`, `FocusTable`, `sheetSentence`, `marginSheetSentence`; `focusCommand`, `marginFocusCommand` and `focusReading` through `focusTableFor`. `focusTable` unchanged.
- `src/ai/aiConfig.ts` and `data/ai.json`: `growth.allFocusSheets` (1). `data/ai.bounds.json`: its row.
- Tests: `test/sim/aiWorkerClaims.test.ts` (new); `aiBot.test.ts`, `aiBounds.test.ts`, `aiEndCheckLoops.test.ts`, `aiWants.test.ts`, `aiWants.slow.test.ts`, `aiDigest.slow.test.ts`.
- `docs/bot-priorities.md`, and this section.
- Scratch (not in the repo): the probe `play13b.ts`, the step-back count `stepback.ts`, the timings `pair13b.ts` and `prof13.ts`, the tables `analyse.py` and `tables.py`, and the games in `out/` of the session's scratch folder `bp13b/`.

## BP13c and the lending rule, 2026-11-17

`docs/flags.md`, the bullets "BP13c: after the worker fixes. Ruled 2026-11-17" and "A borrowed luxury cannot be lent on. Ruled 2026-11-17". One game rule changes (schema 244): an empire lends only the luxury copies it owns. The rest is bot changes, with no new knob.

### Method

- **Trees.** The **before** games are the stored baseline of `f10cb2fa` (`/Users/jacky/code/webciv-baselines/f10cb2fa/six-seat-standard-t100/final-42.json` and `final-999.json`), not played again. The simulation and bot files of the working tree's base equal that commit's; later commits changed only the renderer and the interface. The **after** tree is the working tree with this batch, copied to the scratch folder `bp13c/after/`.
- **The game** is the baseline's: six seats with two decks each, standard map, barbarians on, to the end of turn 100. Seeds 42 and 999, one game process at a time, each at `nice -n 15` under `caffeinate -i`.
- **The probe** is `bp13c/probe13c.ts`: the baseline's `PROBE.ts` with every key it records unchanged, and three new keys. `w.steps` counts each worker's accepted orders in a turn: a step back, any order after it, a hold, and whether the worker ended the turn on the hex it fled. `dealsLive` and `luxLent` count the deals in force and the luxuries lent in them at the end of each turn. It sends no command.
- **Two seeds show direction only.** The before games did not record the new keys, so those rows have no before figure.
- **Attribution of the pins.** `bp13c/digest.ts` plays the two pinned digest games of `aiDigest.slow.test.ts` on a tree and prints each digest twice: as the tree prints it, and with the schema number read as 243. Three trees: `j1` (the lending rule and its bot readings only, `src/ai/bot.ts` as at `f10cb2fa`), `j1h` (`j1` with the step-back hold) and `after` (everything).

### 1. A borrowed luxury cannot be lent on

- **The cause.** `dealSideError` (`src/sim/diplomacy.ts`) asked `availableCopies`, which is `resourceCopies` less the copies units hold. `resourceCopies` is the empire's own copies less the copies it lends, floored at nought, plus the copies lent to it (`netCopies`). So a copy lent in counted as a copy the empire could lend. A scratch test with three seats (C owns one silk and lends it to A; A offers it to B) was accepted, and the copies read 1 / 1 / 0, and again 1 / 2 / 0 for a second lend. The `resourceCopies` docblock states the invariant this broke: two empires can never hold three copies between them where there were two.
- **The fix.** `lendableCopies` (`src/sim/cities.ts`): the copies the empire owns and has not lent already (`ownedCopiesKept`, the ground's copies less the copies lent away, floored at nought), and never more than `availableCopies`. `dealSideError` asks it, so the proposal, the signing (`answerDealError`) and a peace paper when it is written all read it. `resourceCopies` still counts the copies an empire uses, loans included, so access and what the luxury pays are unchanged. `resourceCopies` and the new count read the same ground (`groundCopies`, the memo on the economy clock that `resourceCopies` had).
- **The sentence** a player sees, beside the other two refusals of the same clause: "The Ada have silk only on loan, and a borrowed luxury cannot be lent to another empire". It has no identifier and no number. The other two are unchanged ("no silk to lend" when the empire uses none; "no silk to spare" when a unit holds every copy).
- **Every caller.** `availableCopies` is read by the build gate and the upgrade ladder (strategic copies, which cannot be lent), by the bot's spare strategic copies (`spareResourceCopies`), and by the interface's spare figure. None of them lends, so none changes. The deal gate was the one reader that lends, and it now reads `lendableCopies`.
- **A deal standing on a borrowed copy** (a save from before the rule) resolves cleanly when the loan under it ends: the lender's own count floors at nought, the receiver keeps the copy until the lender's deal ends, and no new deal can lend it. A test writes such a register and ends the two loans in turn.
- **The bots** never write a paper the gate refuses. The swap arm (`swapDecision`) counts a kind as spare only when one copy of it is the seat's own and not promised in a standing paper; the counter (`counterTerms`) offers only such a copy; and the two Commerce forecasts that count copies a seat could lend (`luxuryLoansLost`, the `copiesLent` count in `commerceCountAhead`) read `lendableCopies`. Without the counter's clause, a bot holding two silk on loan and two spices of its own lost its counter to the gate (the test fails).
- **Saves.** The project's practice for a rule that refuses a command it used to accept is a schema bump with no migration (v238 is the same case: a Boon could be seated, and a log that did so is refused at that command). So `SCHEMA_VERSION` is 244, with an entry in its docblock: a v243 save is refused and does not replay, for the reason given under v119 in `docs/history/schema-changelog.md` (the branch starts its saves afresh). The schema number is part of every state's print, so every pin over a whole state moves: the two digest pins and the two boards of `explore.test.ts` (length unchanged; with the number printed as 243 they give the old hashes exactly), and fifteen tests that pin the number.
- **Tests.** `test/sim/borrowedLuxury.test.ts` (new, 6; four fail on the old rule, the three-seat case, the signing and the two invariant runs, and the other two read the new count): the three-seat case through the reducer, with the state byte-identical after the refusal; an own copy beside a borrowed one (the own copy may go, then nothing); a paper refused at the signing when the own copy went to another deal first; a pre-rule register resolving as its loans end; and the invariant over 40 seeded sequences of 24 deals each among three and among four seats, with time passing so deals run out: the usable copies never add up to more than the ground's copies, and no seat lends more copies than its ground supplies. `test/sim/aiDiplomacy.test.ts` (three new): no swap offers a kind held only on loan; a seat with its own copy beside two loans lends its own, and the receiver signs; the counter offers its own spices and never the borrowed silk. `test/sim/resourceCopies.test.ts`: the source pin of the memo now reads `groundCopies`.

### 2. A worker that steps back stays there for the turn

- **Why it was sent out again.** The guard clause of `workerCommand` sends a worker that a hostile could take in its next move, with no guard coming, back to a soldier or a town it can reach this turn (`stepBack`). The step back is one `moveUnit`. A worker that reached its town with movement left raised the idle-unit blocker, so the same sitting asked `workerCommand` again. In its own town the guard reading answers nothing (`workerGuard` returns `null` for a worker in its own town), so the worker took the improvement plan's answer and walked back out, often to the hex it fled. A worker still on its way was asked again by `reaskTheMarch` at its new hex, with the same result where that hex read no threat. The guard plan is read once a sitting, so nothing in the sitting remembered the danger.
- **The fix** (`BotSitting.steppedBack`, `holdAfterStepBack`). When the guard clause sends a worker back (by `stepBack`, or by `civilianFlight` from the same clause), the sitting remembers the worker. Any later ask in the sitting gets the worker's ordinary answer with every march replaced by a sleep. A worker that has arrived may still lay or survey the hex it stands on; a worker still walking keeps walking, because `reaskTheMarch` does not let a sleep cancel a march. The next sitting asks it afresh: `wakeIdleWorker` asks a sleeping worker once a turn.
- **Test** (`test/sim/aiWorkerHold.test.ts`, 2 of 5; both fail before): a worker one hex from its town, a hostile two hexes off, no guard. It steps back into the town, is asked again with movement in hand, and sends no march; the next turn, with the hostile gone, it goes back to work. Before the fix the second answer was "Walks 1 hexes to (4,4) for Farm".

### 3. Sleeping workers and new workers

The user: *"is the sleeped worker every awoken? If not the fix should be to wake villagers before deciding to build new ones"*. Three questions, each read in the code and pinned by a test (`test/sim/aiWorkerHold.test.ts`).

- **(a) Is the sleeping worker asked before a town decides its build? It was not.** `decideNext` answers the blockers in `firstBlocker`'s order (`src/ui/turnBlockers.ts`): idle units, idle traders, then each town with an empty queue (`cityProduction`), then research. A sleeping worker raises no blocker, and `wakeIdleWorker` ran in `housekeeping`, which comes after every blocker. So every empty queue was filled before any sleeping worker was asked. **Fixed**: `wakeIdleWorker` runs before an empty queue's blocker is answered, and at the top of `housekeeping`, ahead of the town on a conversion (`projectIdleCommand`, the one other place a town re-decides its build). The test (fails before): a sleeping worker with ground to lay and a town with an empty queue; the worker's order now comes before the town's `setCityProduction` (before: the town's order was second in the sitting and the worker's fourth).
- **(b) Does the price of a new worker count a sleeping worker's charges? It did.** `explainWorkerCraving` takes off what the seat's spades will lay (`spokenFor`), and `spokenFor` walks every unit of the seat that lays ground, with its own remaining charges, asleep or awake. The test: a town's craving falls when a worker stands beside it, and reads the same when that worker sleeps. One caveat, left as it was: the craving counts the next two citizens' hexes (`citizenSeats`), while the worker counts only hexes a citizen would work now (BP13b's ruling). So a sleeping worker with nothing a citizen would work still covers, in the craving, ground it will not lay until the town grows.
- **(c) Can another path add a worker while one sleeps? No.** The gold book's only unit rows are soldiers for a town short of its garrison (`garrisonWorth` answers `null` for anything else). The faith book (`faithPlan`) leaves out any row the seat already owns one of unless its worth counts the ones it holds (`alreadyCounted`: settlers and land soldiers), so it offers no worker while the seat has one, asleep or awake. A worker levy is wanted only while a town queues a worker (`levyPieceWant`), so it follows the queue's price. The test: a town with an Almshouse and the faith to buy a worker; the faith book offers a worker until a sleeping worker stands in the empire, and the gold book never does.
- **(3) `growth.allFocusSheets`** stays on (1).

### 4. Before and after, seeds 42 and 999 to turn 100

Six seats summed, both seeds summed; shares pooled. Two seeds show direction only. A dash is a figure the before probe did not record.

| Seeds 42 and 999 | Before (`f10cb2fa`) | After | Per seed, before to after |
|---|---:|---:|---|
| Workers that came, turns 1 to 100 | 180 | 182 | 76, 104 to 76, 106 |
| Workers taken by the wild | 31 | 33 | 14, 17 to 18, 15 |
| Step-backs (a worker sent back from a threat) | - | 98 | 52, 46 |
| of those ordered out again in the same turn | - | 0 | |
| of those ending the turn on the hex fled | - | 0 | |
| Holds sent (a march the hold replaced, worker in its shelter) | - | 34 | 13, 21 |
| Worker-turns whose last order was a step back (after: or a hold) | 29 | 98 | |
| Improvements started, turns 1 to 100 | 537 | 555 | 215, 322 to 216, 339 |
| of those to turn 94, worked six turns later | 83% | 87% | |
| Bare worked share, turns 50, 75, 100 | 52%, 32%, 25% | 50%, 31%, 21% | |
| Worker-turns | 2,130 | 2,294 | |
| Deals proposed | 38 | 46 | 15, 23 to 19, 27 |
| Deals signed | 35 | 42 | 13, 22 to 17, 25 |
| Deals sent back | 3 | 4 | |
| Deals in force, mean of turns 50 to 100 | - | 10.9 | |
| Luxuries lent in them, mean of turns 50 to 100 | - | 21.8 | |
| Luxuries lent at turn 100 | - | 42 | |
| Towns, turn 100 | 122 | 121 | 58, 64 to 52, 69 |
| Citizens | 817 | 771 | 375, 442 to 336, 435 |
| Food | 3,716 | 2,962 | 2,041, 1,675 to 1,221, 1,741 |
| Production | 4,497 | 2,549 | 2,832, 1,665 to 1,007, 1,542 |
| Gold | 1,845 | 1,599 | 936, 909 to 534, 1,065 |
| Science | 2,987 | 2,100 | 1,752, 1,235 to 758, 1,342 |
| Culture | 1,181 | 1,135 | 743, 438 to 487, 648 |
| Faith | 489 | 434 | 308, 181 to 159, 275 |

- **No step-back is undone in the same turn** (0 of 98; BP13b counted 12 of 52 re-ordered and 7 back on the fled hex on its before tree, `aa403039`). 34 times a worker reached its shelter with movement left and the hold kept it there.
- **The step-backs that remain repeat across turns.** Of the 98, 26 were a worker that started the turn in its own town, walked out to work, and stepped back in the same turn (a second probe pass, `probe13c-detail.ts`, the same games). A worker in its own town reads no threat (`workerGuard` answers `null` there), so the next sitting sends it out into the danger it fled. Not ruled; see "Not done".
- **The lending rule does not change these games' deals**: the bots never lent a borrowed copy in the pinned games (below). Deals proposed and signed rose a little (46 and 42 against 38 and 35), which is the games parting, not the rule.
- **Yields at turn 100 fell, mostly on seed 42** (production 2,832 to 1,007; on seed 999 1,665 to 1,542). BP13b already found seed 42's production an outlier of its four-sheet game (2,832 against 677 with two sheets). The games part early (a held worker and a woken worker change the order of commands from the first threat), and two seeds cannot tell a cost from two games parting. Improvements started, the share worked six turns later and the bare share at turn 100 all moved the right way on both seeds.
- **Speed**: the after games took 68 s and 82 s for 100 turns, one process each, on a quieter machine than the baseline's. No timing comparison is made.

### Pins

`test/sim/aiDigest.slow.test.ts`, re-cut once at the end with the reason printed beside them: duel `96597c87:340143` -> `29663d27:358427`, standard `109baaf6:1053026` -> `5be63c3e:1044882`. Which part moved them (`bp13c/digest.ts`, each digest with the schema number read as 243):

| Tree | Duel | Standard |
|---|---|---|
| `j1`: the lending rule and its bot readings | `96597c87:340143` (the old pin) | `109baaf6:1053026` (the old pin) |
| `j1h`: `j1` and the step-back hold | `c9dd7d83:358792` | `f1058f13:1044882` |
| after: `j1h` and the sleeping workers asked first | `745de5e8:358427` | `f1058f13:1044882` |

- **The lending rule changes no decision in the pinned games**: no bot lent a borrowed copy in them. The rule moves both pins only through the schema number.
- **The step-back case occurs in both pinned games**, and the hold moves both.
- **The sleeping workers asked first** move the duel and not the standard board.
- No warning and no stall on either board.

### Checks

- Type check clean (`nice -n 15 npm run typecheck`).
- Narrow tests, by name: `borrowedLuxury` (new, 6), `aiWorkerHold` (new, 5), `aiDiplomacy` (three new), `deals`, `deals.slow`, `resourceCopies` (one source pin reworded), `explore` (the two boards), `aiBot`, `aiWar`, `aiWorkerGuards`, `aiWorkerClaims`, `aiEscorts`, `aiEndCheckLoops`, `aiSittingMemos`, `aiPuppet`, `aiWants`, `aiCampHunt`, `aiLevy`, `aiCommerce`, `aiThreatUpkeep`, `aiRouteRun`, `aiAppraisal`, `aiBounds`, `aiModuleCycles`, `empireYieldAtRest`, `test/mapgen/moduleCycles` and `test/mapgen/resources`, the Commerce deck files that propose deals, the fifteen files whose schema pin moved, and `religion.slow`'s schema test: all passed. `test/ui/dealPanel.test.ts` (another agent's file) passed with the new rule as that agent wrote it.
- Slow tier: `aiDigest.slow.test.ts` twice (the pins). The whole core tier and the build are the orchestrator's.

### Not done, and choices left

- **The before tree's step-back counts are not measured.** The stored baseline games do not record them and the brief said not to play the before tree again. BP13b's count on its own before tree (`aa403039`) is 12 of 52 re-ordered and 7 back on the fled hex. Two more games on `f10cb2fa` with `probe13c.ts` would give the figure for this baseline (about three minutes).
- **Deals in force and luxuries lent have no before figure** for the same reason.
- **A worker in its own town reads no threat.** The hold covers the rest of the turn only. The next sitting sends a worker out of its town into the danger it fled, and it steps back again (26 of the 98 step-backs). A worker in a town could read the threat to the hex it would walk to. Not ruled; a choice for the user.
- **A peace's second signature does not ask the deal gate again.** `proposePeaceError` checks a paper's terms when it is written, and a bare offer that signs it checks nothing (`applyPeaceOffer` then runs `settlePeacePair`). So a paper written while a copy was the giver's own still lends it after the copy went to another deal, and a lump the treasury no longer holds is still paid. Older than this batch, and the same for coin and towns; not changed here.
- **A deal that outlives the copy under it still pays the receiver** until it ends: a pillaged plantation, a town ceded in the same peace, or a save from before the rule. The giver's count floors at nought. Making the receiver lose the copy at once is a rule change nobody has ruled.
- **The interface's spare figure.** The Deal panel's `spare` (`src/ui/diplomacyScreen.ts`, `dealSide`) still reads `availableCopies`, so an empire with its own silk and a borrowed silk shows two spare where it may lend one. The row is refused correctly, by `dealSideError`. For the agent rebuilding the screen: `lendableCopies` is the figure; and the docblock of "the luxury rule" in `test/ui/dealPanel.test.ts` still says a borrowed copy may be lent.

### Files

- `src/sim/cities.ts`: `groundCopies`, `keptCopies`, `ownedCopiesKept`, `lendableCopies`; `resourceCopies` and `netCopies` through them.
- `src/sim/diplomacy.ts`: `dealSideError` asks `lendableCopies`, with the new sentence.
- `src/sim/deals.ts`: the two docblocks that state the rule.
- `src/sim/state.ts`: `SCHEMA_VERSION` 244 and its entry.
- `src/ai/bot.ts`: `BotSitting.steppedBack`, `holdAfterStepBack`, `workerChoice` (the rest of `workerCommand`, split out); `wakeIdleWorker` asked before an empty queue's blocker and at the top of `housekeeping`.
- `src/ai/diplomacy.ts`: `swapDecision`'s spare and `counterTerms` read `lendableCopies`.
- `src/ai/value.ts`: `luxuryLoansLost` and the `copiesLent` forecast read `lendableCopies`.
- Tests: `test/sim/borrowedLuxury.test.ts` and `test/sim/aiWorkerHold.test.ts` (new); `aiDiplomacy.test.ts` (three new), `resourceCopies.test.ts`, `explore.test.ts`, `aiDigest.slow.test.ts`, and the schema pin in fifteen files.
- `docs/luxuries.md` and `docs/war-diplomacy.md` (the rule), `docs/bot-priorities.md`, and this section.
- Scratch (not in the repo), in the session's scratch folder `bp13c/`: the probe `probe13c.ts` and `probe13c-detail.ts`, `digest.ts`, `queue.sh`, the tables `tables13c.py` (with BP13b's `analyse.py`), the trees `after/`, `j1/` and `j1h/`, and the after games in `out/` (`after-42.json`, `after-999.json`) and `out-detail/`.

## BP14: the decision-speed pass, 2026-11-17

`docs/flags.md`, the bullet "Queued after BP13: faster bot decisions, then the arena and the evolutionary tuner". The user: *"see if we can make the decisionmaking much more efficient"*, confirmed on 2026-11-17: *"yes go ahead with the bot decision speed pass"*. The rule of the batch: play does not change. Four changes, each keeping every answer the same; no knob, no data change and no rule change.

### Method

- **Trees.** The **base tree** is `e682002d` (the head of `decks`), a clean detached worktree. Its bot and simulation code equal `bdc74737` (BP13c): `git diff --stat bdc74737 e682002d -- src/sim src/ai data` shows card text (`statecraft/describers.ts`), two readers that only the orders screen calls (`cardIdleReason`, `cardCanPay`) and the renderer's `data/view3d.json`. The **new tree** is the working tree with this batch.
- **The game** is the end check's: six seats with two decks each, standard map, barbarians on.
- **Snapshots.** `snap14.ts` (scratch folder `bp14/`) plays a seed from turn 1 and saves the state with the bot's harness memories at turns 90 and 120. A restored game plays the same game: the seed 42 snapshot reached the stored digest of turn 100 (`813871d0:954523`).
- **Profiles.** `prof14.ts` restores a snapshot and plays 11 turns under the inspector's CPU profiler (500 µs sampling). `profgroup.cjs`, `profkids.cjs`, `profparents.cjs` and `profcompare.cjs` read a profile by function name, by children and by callers.
- **Counts.** A scratch copy of the base tree (`bp14/inst/`) wraps the readings in question in a census: calls, the calls whose key was asked before in the same revision, their time, and whether the second answer differed from the first.
- **Timings.** `pair.ts` restores one snapshot into both trees and plays them a turn each in rotation in one process, several times over, with the first tree of each repeat alternating. CPU seconds by `process.cpuUsage`: the whole turn, and the bot's own time inside `nextBotDecision`. One game process at a time, `nice -n 15` under `caffeinate -i`.
- **Machine.** Shared with two interface agents running browsers. The load average was 17 to 68 during step 0 and the first profiles, and 3 to 6 during the timings and the profiles below.

### Step 0: did BP13c lower the yields?

BP13c was measured on seeds 42 and 999, where production at turn 100 fell from 4,497 to 2,549, most of it on seed 42. The three missing seeds (1, 7, 2026) were played on the base tree with the baseline's `PROBE.ts` and stored in `/Users/jacky/code/webciv-baselines/bdc74737/six-seat-standard-t100/` with a note. Seed 42 played again gave the stored digests at turns 20, 50, 75 and 100. Before is `f10cb2fa` (BP13b), after is `bdc74737`. Six seats summed, turn 100. Paired is the geometric mean of the per-seed ratios with a 95% t interval.

| Figure | Before | After | After against before, paired | Per seed (42, 999, 1, 7, 2026) |
|---|---:|---:|---|---|
| Towns | 298 | 290 | −3% [−13%, +8%], 3 down, 2 up | 58→52, 64→69, 61→54, 63→61, 52→54 |
| Citizens | 1,877 | 1,816 | −3% [−14%, +10%], 3 down, 2 up | 375→336, 442→435, 431→374, 360→382, 269→289 |
| Food | 7,407 | 6,966 | −3% [−33%, +41%], 2 down, 3 up | 2,041→1,221, 1,675→1,741, 1,676→1,506, 1,195→1,478, 820→1,020 |
| Production | 8,216 | 7,695 | −2% [−55%, +112%], 3 down, 2 up | 2,832→1,007, 1,665→1,542, 1,204→2,021, 1,496→1,479, 1,019→1,646 |
| Gold | 3,396 | 3,040 | −11% [−40%, +30%], 2 down, 3 up | 936→534, 909→1,065, 592→431, 526→529, 433→481 |
| Science | 5,798 | 5,120 | −10% [−49%, +60%], 2 down, 3 up | 1,752→758, 1,235→1,342, 794→1,144, 1,193→981, 824→895 |
| Culture | 2,648 | 2,524 | −2% [−39%, +57%], 3 down, 2 up | 743→487, 438→648, 494→474, 625→432, 348→483 |
| Faith | 941 | 1,120 | +21% [−37%, +131%], 1 down, 4 up | 308→159, 181→275, 154→169, 164→252, 134→265 |
| Improvements started, turns 1 to 100 | 1,334 | 1,351 | −0% [−14%, +15%], 2 down, 3 up | 215→216, 322→339, 281→276, 294→336, 222→184 |
| Workers built, turns 1 to 100 | 466 | 445 | −6% [−20%, +11%], 2 down, 2 up | 76→76, 104→106, 99→90, 103→109, 84→64 |
| Workers taken (the wild and rivals) | 116 | 109 | −4% [−34%, +39%], 3 down, 2 up | 15→19, 19→18, 24→31, 22→18, 36→23 |
| Bare worked share, turn 100 (pooled) | 23% | 20% | 4 down, 1 up | 37%→33%, 14%→12%, 26%→17%, 14%→11%, 25%→30% |

- **Neither.** Over five seeds no figure moves with an interval that excludes nought, and every yield rises on two or three seeds of five. The fall BP13c saw is seed 42 alone: its before game was BP13b's outlier (2,832 production against 677 with two citizen sheets), and its after game is close to the other seeds.
- **How sure.** Not sure that there is no effect: the intervals are wide (production −55% to +112%), so a real change of a fifth either way cannot be ruled out at this sample size. What five seeds show is that the two-seed fall was not a fall caused by the batch. The improvements, the share of them worked and the bare share moved the right way or not at all.
- So the three changes were not turned off one by one.

### 1. The profile before

The base tree, turns 90 to 100 and 120 to 130, seeds 42 and 999, on the quieter machine. Shares of the profiled time. The bot's own time inside `nextBotDecision` is 72% to 77% of it, and the reducer 18% to 23%, of which the end of the turn is 14% to 19%.

| Inclusive share | 42, t90 | 999, t90 | 42, t120 | 999, t120 |
|---|---:|---:|---:|---:|
| `valueContext` (once a sitting) | 29.5% | 28.9% | 25.7% | 26.7% |
| of it `wantBook` (`purchasingPlan`, `draftPlan`, `faithPlan`) | 17.3% | 15.4% | 16.1% | 16.9% |
| of it `liveChains` | 8.5% | 7.5% | 5.6% | 5.7% |
| `techGoalTable` (its first ask in a sitting, through `reaimBeeline`) | 10.5% | 9.1% | 4.3% | 4.4% |
| card prices (`explainCardEffects`, nested) | 15.9% | 14.4% | 18.3% | 23.3% |
| `chairReading` (what a Wildcard chair is worth) | 8.4% | 5.2% | 0.3% | 1.4% |
| the council (`orderDecision`, `slottingDecision`, `reslotDecision`) | 13.0% | 12.1% | 22.0% | 26.5% |
| `cityCommand` | 6.7% | 6.1% | 7.3% | 7.4% |
| `unitCommand` (worker, soldier, settler) | 10.8% | 8.4% | 8.1% | 7.1% |
| `diplomacyDecision` | 3.8% | 4.2% | 4.6% | 4.7% |
| `reaskTheMarch` | 3.4% | 2.9% | 2.7% | 2.2% |
| path searches (`searchPath`) | 6.3% | 8.3% | 5.6% | 5.5% |
| the two search fields (`transitField`, `zocField`) | 2.6% | 3.2% | 2.9% | 2.8% |
| `reachOf` (the purchasing plan's gate and price) | 7.3% | 7.0% | 6.9% | 6.7% |
| a great person's act (`explainActFor`) | 2.7% | 1.9% | 0.1% | 0.5% |
| the escort plan (`contextEscortPlan`) | 1.6% | 1.3% | 1.6% | 0.9% |
| the worker guards (`guardPlan`) | 2.3% | 0.7% | 1.4% | 0.9% |

- **Self time is flat.** In seed 42's profile no function holds more than 2.6% of self time (`searchPath`, the collector, `slateMemo`, `liveReading`, `cityLocalEffects`, `explainCity`). The cost is spread over many readings.
- **The first decision of a sitting is 42% of the bot's time** (seed 42, turns 90 to 95, split by decision: 36 sittings, 2.36 of 5.61 CPU seconds), most of it `valueContext` and the beeline's table. The last decision, which answers nothing and ends the turn, is another 11.5%, because it asks every arm once more.
- **The census** (the base tree, seed 42, turns 90 to 94): of 6,153 card prices, 1,657 asked again in the same revision; of 4,267 zone sweeps and 3,069 transit sweeps, 88% and 84% swept a board already swept in the same revision; a great person's act folded the whole empire for each family on each ask. Building rows asked again inside one economy tick, across revisions, repeated 69 times in 13,611, so a longer memo would not pay there.
- **Where the 15% rise of BP13b went.** The functions BP13b added or changed are 1.0% to 1.7% of a late turn together: `explainWorkerCraving` 0.2% to 0.4%, `rankPlanFor` 0.4% to 0.7% (with `citizenWouldWork` and `townSheetOf` inside it), `spokenFor` 0.1% to 0.3%, and `focusCommand` 0.2% to 0.3% (with `sheetTable` inside it). The plan walk (`walkImprovementPlan`, 3% to 4%) grew by about a tenth with the extra fold of each entry. The rest of the rise is the bigger games, as BP13b found: more towns, more units and more cards, read by the same code.

### 2. The changes

**A. The search fields are held for one decision** (`withFieldsHeld`, `transitField`, `zocField`, `src/sim/pathfind.ts`).

- What: inside the scope, each board's two fields are swept once for each seat and kept until the outermost scope closes. `nextBotDecision` opens it. Outside it nothing is kept.
- Why play is unchanged: a field is a function of the board object and the seat (`units`, `cities`, `wars`, `players`, `tileOwner`, the map). A bot decision writes nothing to the real board. The boards it builds for itself (`boardWithPieceOn`, the site ground of `plan.ts`, a peace probe, a board with a work) are new objects. Each is written only as it is built, before any search is asked of it. The entry is also checked against the revision and the identity and length of the arrays it reads, so a board written in place is swept again. With the slate's shadow on, every kept field is swept again and compared.
- Tally, seed 42, turns 90 to 92: 2,701 asks, 2,207 kept.

**B. Card and effects prices kept for one decision** (`inDecision`, `decisionMemo.ts`; `explainCardEffects`, `explainEffects`, `value.ts`).

- What: a price asked again inside one decision, on the same context, with the same card, reading, effects list (by identity, or both empty) and town (by identity), is the price already taken.
- **The guards.** Five context memos hold a stand-in value while they are first read, so that a reading which asks for them again does not recurse: `faithPrice`, `malicePrice`, `chairReading`, `handRuleWorth` and `widerFitWorth`. The census found 19 second asks in five turns whose answer differed from the first, all of this kind: The Jinshi inside the Doctrine offer (nought under the hand rule's stand-in, −1.8 to −13.1 after it), and a card that opens a chair inside the chair reading. So each of the five reads its value inside `withGuard`, which gives that reading a number of its own. A price is kept under the list of guards open when it was taken, and handed back only under the same list. A kept price saw every stand-in it read still in place, and every other memo it read already holding its final value, so asking again gives the same answer.
- Why play is unchanged: inside one decision the board does not move, and a context memo keeps its value once it is set. The shadow check (`setDecisionMemoShadow`) takes every kept price again and throws when the two differ.
- Tally, seed 42, turns 90 to 94: 6,153 card prices asked, 660 kept; 21,781 effects prices asked, 8,294 kept. Most of the census's 1,657 repeats cross a guard (a card priced by the draft plan and again inside the chair reading), so they cannot be shared without the fault above.

**C. A great person's act reads the remembered books** (`actGainOf`, `src/sim/greatPeople.ts`; `explainActFor`, `value.ts`).

- What: `actGainOf` takes the empire's rates as an optional argument, by default the fresh `foldEmpireRates`. The bot hands it `readEmpireRates`, the same fold taken off the `readCity` lists and remembered on the economy clock. The act itself and the interface pass nothing.
- Why play is unchanged: `readEmpireRates` is `foldEmpireRates` at rest (batch P1), and the bot asks only at rest. The Universal Genius's price (`actThenWorkWorth`) asked five families' acts on every ask, each folding every town: 2.7% of seed 42's turns 90 to 100 before, 0.1% after.

**D. The purchasing plan asks the gate first** (`reachOf`, `src/ai/wants.ts`).

- What: `purchaseGate` is asked before `explainPurchaseCost`, and a row the gate refuses for a reason that is neither the bank nor a unit's blocker is struck without its price.
- Why play is unchanged: both are pure readings. A row with no price is struck either way, and a row the gate refuses for such a reason was struck whatever it cost. `reachOf` fell from about 7% of a late turn to about 4%.

**Tests.** `test/sim/aiDecisionMemo.test.ts` (new, core, 5 tests):

- a price is kept inside one decision and nowhere else, and a nested scope shares the outer one;
- nothing is handed across a guard, in either direction, and two guards are two scopes;
- an effects price is kept by its town and its list;
- the fields are swept once for each board and seat inside the scope and afresh outside it, a copy of the board gets its own field, and a board written in place is swept again;
- a game of four bot seats on the duel board, played to turn 28 and then to turn 36 with both shadow checks on (the slate's, which disbelieves every kept field, and the decision memo's): every kept answer equals a fresh one at each hand-back, no command is refused, and the memos answered (more than 50 kept fields and effects prices, and some kept card prices).

Two more checks on the late board, not in the suite: the decision memo's shadow over seed 42's turns 90 to 92 (six seats, 46 towns), and both shadows over turn 90 (60 seconds). Both gave the base tree's digests.

### 3. Play is unchanged

- `test/sim/aiDigest.slow.test.ts`: the pins hold unchanged (see "Pins").
- Seeds 42 and 999, played from turn 1 on the new tree: the digests after turns 50 and 100 equal the stored games' (seed 42: `511f35d6:843434`, `813871d0:954523`; seed 999: `0186e46d:852974`, `796792fe:1011270`).
- Every paired timing and every profile run reached the base tree's digests turn for turn (turns 90 to 100 and 120 to 130 on both seeds).

### 4. Seconds a turn

CPU seconds of the whole turn and of the bot inside `nextBotDecision`, the two trees in one process, a turn each in rotation, the first tree of each repeat alternating. Load average 3 to 5. The first repeat of each process carries the warm-up of both trees.

| Window | Tree | Repeat 1 | Repeat 2 | Repeat 3 | Bot, repeats 1 to 3 |
|---|---|---:|---:|---:|---|
| 42, turns 90 to 100 (11 turns) | base | 17.28 | 12.10 | 11.16 | 13.43, 9.44, 8.75 |
| | new | 16.39 | 10.73 | 10.79 | 12.72, 8.15, 8.23 |
| 999, turns 90 to 100 | base | 25.45 | 17.12 | 15.97 | 19.87, 13.51, 12.59 |
| | new | 23.67 | 15.95 | 15.34 | 18.35, 12.36, 11.94 |
| 42, turns 120 to 125 (6 turns) | base | 22.62 | 18.74 | | 17.81, 14.60 |
| | new | 21.05 | 16.18 | | 16.58, 12.26 |
| 999, turns 120 to 125 | base | 44.00 | 33.43 | | 35.97, 27.27 |
| | new | 42.42 | 27.35 | | 34.10, 21.95 |

- **Turns 90 to 100: the turn is 3% to 11% cheaper, repeat by repeat, and the bot 5% to 14%.** Over the three repeats: seed 42, 6% (the bot 8%); seed 999, 6% (the bot 7%). Per turn over repeats 2 and 3: seed 42, 1.06 against 0.98 seconds; seed 999, 1.50 against 1.42.
- **Turns 120 to 125: 4% to 18% cheaper, the bot 5% to 20%.** The warm second repeat gained more on both seeds (14% and 18%); two repeats cannot tell whether the late game gains more or the first repeat was noisier.
- Single profile runs of turns 120 to 130 moved by up to a half between two runs of the same tree (the end of the turn, which this batch does not touch, read 5 and 10 seconds), so only the paired runs are used for seconds.

The profile after, the same windows (inclusive share, before → after):

| | 42, t90 | 999, t90 | 42, t120 | 999, t120 |
|---|---|---|---|---|
| `valueContext` | 29.5% → 26.2% | 28.9% → 25.5% | 25.7% → 24.7% | 26.7% → 25.4% |
| `purchasingPlan` | 10.5% → 8.0% | 10.3% → 7.7% | 9.9% → 7.6% | 9.7% → 6.6% |
| `reachOf` | 7.3% → 4.7% | 7.0% → 4.2% | 6.9% → 4.3% | 6.7% → 3.6% |
| `chairReading` | 8.4% → 6.8% | 5.2% → 3.9% | 0.3% → 0.4% | 1.4% → 2.2% |
| `explainActFor` | 2.7% → 0.1% | 1.9% → 0.1% | 0.1% → 0.3% | 0.5% → 0.1% |
| `transitField` and `zocField` | 2.6% → 2.4% | 3.2% → 3.0% | 2.9% → 2.0% | 2.8% → 2.0% |
| profiled seconds | 9.13 → 8.63 | 14.17 → 12.93 | see above | see above |

### Found and left: savings that change play

Each of these would make a decision read a figure other than the one it reads today, so none is built. The estimates are shares of the profiles above.

- **One context for the book.** `valueContext` builds the want book, the chains and the chair reading on four contexts in turn (the prior, the engines, the constrained and the final), and each context's memos read again what the last one read, at other prices. Pricing all of it on one context would cut perhaps a third of `valueContext`: **about 8% of a late turn**.
- **The beeline's table from the chains' node gifts.** `techGoalTable` prices every node's copies again on the final context after `liveChains` priced them on the engines context: **about 5% at turn 90**, less later.
- **The chair reading once a sitting.** `chairReading` prices every card a hand can deal, on each context it is asked on: **3% to 7% at turn 90** while a Wildcard chair is open.
- **Stamps kept for the sitting.** A slotting moves the economy clock, so every held card is stamped again on two boards at the next council decision. Keeping the stamps of the sitting's first reading would cut most of `slottingDecision` and `reslotDecision`: **about 10% at turns 120 to 130**, where the council is 22% to 27% of the turn.
- **The last decision of a sitting.** It asks every arm once more and answers nothing: 11.5% of the bot's time. Skipping the arms whose last answer was nothing, while the command since cannot have changed it, needs a list of each arm's inputs, which this batch did not write.

One simulation change keeps every answer but was not made: the empire reading's card lines (`explainEmpireCardYields`, inside `empireReading`) fold the whole empire again for a seat that holds a `pays` rate card (5.7% of seed 42's turns 120 to 130, about 1% elsewhere). Handing it `readEmpireRates` would give the same figure at rest, but `explainEmpireLines` is read by the yields doc's sync test and may be asked under a recursion cut, so it is left for a simulation batch.

### Not done, and not measured

- **The escort plan's two ways on** (BP13). On these games the plan is 0.9% to 1.6% of a late turn and the threat weights 0.2% to 0.3%, so the two ways would save under 1%. Not built.
- **"Much less" was not reached.** The exact savings are about a tenth of a late bot turn. What is left is first-time work spread thin (part 1), and the larger savings above change play.
- **Not measured**: 16 seeds; the duel; turns after 130; wall time (the machine was shared); the whole core tier, the build and the whole slow tier (the orchestrator's gates).

### Pins

`test/sim/aiDigest.slow.test.ts`: duel `29663d27:358427`, standard `5be63c3e:1044882`, unchanged.

### Checks

- Type check clean (`nice -n 15 npm run typecheck`).
- Narrow tests, by name, in one run: `aiDecisionMemo` (new) and the 46 files that read the code changed here or name its functions (`aiBot`, `aiWar`, `aiDiplomacy`, `aiWorkerClaims`, `aiWorkerHold`, `aiWorkerGuards`, `aiRouteMemo`, `aiEndCheckLoops`, `aiWants`, `verbs`, `test/mapgen/moduleCycles`, `aiModuleCycles`, `empireYieldAtRest`, `slateRegister`, `purchase`, `greatPeople`, `zoc`, `trade`, `pathfind`, `shoreAndDetour`, `naval`, `readings`, `aiAppraisal`, `aiCommissions`, `aiMagisterial`, `aiDevotion`, `aiCommerce`, `aiPrices`, `aiWager`, `aiCardStamp`, `aiSittingMemos`, `aiEscorts`, `aiScientific`, `aiPuppet`, `aiGarrison`, `aiBeliefChoice`, `aiThreatUpkeep`, `aiDecision`, `aiWonderRewards`, `statecraft`, `ranks`, `unrest`, `wonders`, and three deck files): 47 files, 2,164 tests passed.
- Slow tier: `aiDigest.slow.test.ts` (the pins) and `aiWants.slow.test.ts`.

### Files

- `src/ai/decisionMemo.ts` (new): `inDecision`, `keepingEpoch`, `keepingScope`, `withGuard`, `decisionMemoTally`, `setDecisionMemoShadow`.
- `src/ai/bot.ts`: `nextBotDecision` opens the two scopes; `decideAtRest`.
- `src/ai/value.ts`: `explainCardEffects` and `explainEffects` through the kept prices (`keptOn`, `freshCardEffects`, `freshEffects`); the guards of `chairReading`, `handRuleWorth` and `widerFitWorth`; `explainActFor` hands `actGainOf` the remembered books.
- `src/ai/prices.ts` (`faithPrice`) and `src/ai/wager.ts` (`malicePrice`): their guards.
- `src/ai/wants.ts`: `reachOf` asks the gate first.
- `src/sim/pathfind.ts`: `withFieldsHeld`, `heldFieldsTally`, and `transitField` and `zocField` through the held fields.
- `src/sim/greatPeople.ts`: `actGainOf` takes the rates.
- Tests: `test/sim/aiDecisionMemo.test.ts` (new); `test/sim/aiBot.test.ts` (the register of bot files).
- `docs/bot-priorities.md`, and this section.
- The baseline folder: `/Users/jacky/code/webciv-baselines/bdc74737/six-seat-standard-t100/` (seeds 1, 7 and 2026, and a note).
- Scratch (not in the repo), in the session's scratch folder `bp14/`: `probe.ts` (the baseline's `PROBE.ts`), `step0.py`, `snap14.ts`, `prof14.ts`, `pair.ts`, `tally.ts`, `bydecision.ts`, `shadowrun.ts`, the profile readers, the queues, the snapshots in `snaps/`, the profiles in `prof/` and the logs in `logs/`. The two scratch trees (`base/` and `inst/`) were removed at the end.

## BP15: more bot speed, with caching, and the worker that stays home, 2026-11-17

`docs/flags.md`, the bullet "BP15: more bot speed, with caching, and the worker that stays home". The user, on the BP14 report: *"#4 worker should stay home yes. #1 bot speedup yes. Any more bot speed up approaches we could take? I'm happing to lean into approaches that take advantage of caching"*. Three stages, each with its own proof: caches that keep play identical (stage 1), the savings that change play (stage 2), and the worker that stays home (stage 3). No knob and no rules data changed.

### Method

- **Trees.** The **base tree** is `e0d6996c` (the head of `decks`: BP14 and the flags commit), a clean detached worktree. Its bot and simulation code equal BP14's commit `f24c69e3`. The **stage 1 tree** is the base with stage 1 only. The **final tree** is the working tree with all three stages. The **pre-BP14 tree** is `e682002d`, BP14's own base, for the total since BP14 started. Each was a scratch worktree outside the repo, removed at the end.
- **The game** is the end check's and the baseline's: six seats with two decks each, standard map, barbarians on.
- **The before games.** The baseline's `PROBE.ts` with one more key, `w.backDetail` (BP13c's `probe13c-detail.ts`: each step-back with whether the worker started the turn in its town), played on the base tree for the five seeds. All five reached the stored digests of `/Users/jacky/code/webciv-baselines/bdc74737/six-seat-standard-t100/` at turns 20, 50, 75 and 100 (seed 42 `813871d0:954523`, 999 `796792fe:1011270`, 1 `e63dd291:972568`, 7 `1f30a306:999510`, 2026 `a9dacb71:962265`), so BP14 changed no play and the stored games are this batch's "before". They were played again only to record the new key.
- **Snapshots.** BP14's `snap14.ts` snapshots of seeds 42 and 999 at turns 90 and 120 (state and harness memories); the base tree replays them to the stored digests.
- **Censuses**, on a scratch copy of the base tree, three to four turns from a snapshot:
  - `census.ts`: every slate miss (`slateMemo`) by bucket, by who asked (a bot decision, a command, a phase of the turn end, or a ghost board of a card stamp), its compute time, and whether the fresh answer printed the same as the last answer for the same key;
  - `ctxcensus.ts`: every context memo set (a `WeakMap` keyed on a `ValueContext`), by memo, and how many contexts set the same memo for one seat at one board revision;
  - `arms.ts`: the bot's CPU by decision (the first of a sitting, the last one that answers nothing, the rest) and by arm.
- **Timings.** BP14's `pair.ts`: one snapshot restored into several trees in one process, a turn each in rotation, three repeats, the first tree of each repeat alternating. CPU seconds by `process.cpuUsage`. One game process of mine at a time, `nice -n 15` under `caffeinate -i`.
- **Machine.** Shared: another agent ran bot games for its own audit during the later runs. The load average is given beside each timing.

### 1. Where the time goes

BP14 found no hot function: the bot's picture of its seat is built once a sitting (`valueContext`), and the turn end is 14% to 19% of a turn. The censuses say what is computed more than once.

- **Slate readings recomputed with the same answer** (seed 42, turns 120 to 122, 15.9 instrumented CPU seconds). Inside bot decisions, a town's list (`readCity`) was folded 1,166 times, 856 of them giving the answer the last fold gave (426 ms). In the turn end, `collectYields` read the seat's meters (`meterEffects`) 374 times, 367 the same (506 ms): it banks each town and announces the treasury, because a card may count banked gold. The cause in both is the economy clock: it is one counter for the whole board, so a build order in one town throws away every town's list in the game.
- **Card stamps.** A stamp (`stampReadingOf`) folds the seat's whole empire on a copy of the board with the card in place (a ghost board). On seed 42 the stamps were 2.2 s of 15.9 s, nearly all of it on ghost boards (`readEmpire` 1.7 s). On seed 999, turns 120 to 123, 255 stamps cost 8.0 s of 42.5 s, and 85 of them were the same card stamped again **in the same sitting** after the economy clock moved (a seating, a purchase, a build order); 4 of those 85 gave the same answer.
- **Context memos.** Inside `valueContext` a sitting builds several contexts (the prior, the chains', the book's, the final one) and later copies (`todayContext`, `oneTownContext`). The memos set again on another context at the same revision are cheap ones: a beaker's price (100 repeats in three turns), the scope counts (71), the promised buildings (64), the rates (55), the tech costs (47). Together they are under 2% of a late turn in BP14's profiles.
- **By decision** (base tree, seed 42 turns 90 to 95, and seed 999 turns 120 to 123). The first decision of a sitting is 39% and 33% of the bot's time (the context). The last decision, which answers nothing, is 12% and 4%, and most of it is the beeline's table (`reaimBeeline`): 896 of 1,252 ms and 309 of 593 ms. In the middle decisions the re-aim arm costs 688 ms and 711 ms, because it builds the whole table again on each ask.
- **Shared work.** Facts that do not depend on the seat (the tech tree's columns and costs, rule tables, unit and building rows) are under 1% of a turn together in the profiles, and so are the pure map helpers (`mapRange`, `neighborsOf`, `wrappedDistance`, `getTileAt`). Nothing worth sharing between seats was found.

### 2. Stage 1: caches that keep play identical

**Built: the empire's lines read the remembered books** (`readEmpire`, `src/sim/readings.ts`; `explainEmpireLines` and `explainEmpireCardYields`, `src/sim/yields/empire.ts`).

- What: a `pays` rate row (the Bourse, two beliefs, Al-Ma'mun) reads the empire's books. Inside `readEmpire` those books were a fresh `foldEmpireRates`: every town of the empire folded a second time, just after `readEmpire` had folded them for its own list. `explainEmpireLines` and `explainEmpireCardYields` now take the books as an optional thunk, and `readEmpire` passes `() => readEmpireRates(state, playerId)`. A caller with none (the phase `collectYields`, the interface, `cardImpact.ts`) folds fresh, as before.
- **Key and lifetime**: none of its own. It reads `readEmpireRates`, which is on the economy clock (`slate.ts`); this change only stops a second, unremembered fold of the same figure.
- **Why the figure is the same**: `readEmpireRates` is `foldEmpireRates` with the seat's meters and each town's list handed in (`readEmpirePercents`, `readCity`), the very calls the fresh fold makes. `readEmpire` is a reader at rest (`readingAtRest`), and so were its own town lists, so no recursion cut differs between the two folds.
- This is the change BP14 left "for a simulation batch". It is in `readings.ts`, where `readX` memos live; the folds only take a parameter. The register (`test/sim/verbs.test.ts`) and the yields doc's sync test pass unchanged.
- **Tests** (`test/sim/empireLinesAtRest.test.ts`, new, core, 3): the lines `readEmpire` holds equal a fresh `explainEmpireLines` for a seat with a Bourse, with the Bourse's line among them; only the reading at rest hands in the books (a source check); and a 30-turn bot game with the slate's shadow check on, comparing the two on every seat each turn. Two interface tests pinned the old shape and were brought up to date (outside the batch's fence; see "Checks").

**Looked at, and not built**:

- **The beeline's table on the economy clock.** Built and measured first as a stage 1 cache (key: the sitting's context and the economy stamp), with a shadow check. It was never handed back in eight turns of a four-seat game: the arm that asks the table again comes after a command from a later arm (a focus, a seating, a build), and each of those moves the economy clock. It became stage 2's table, kept on the seat's research instead.
- **A finer clock for a town's list** (one stamp a town, so a build order in one town does not refold the others). The list reads card scopes that depend on what a town is building (`city.queue`), queued units reserve strategic copies empire-wide, and the meters read the treasury. Each of the 154 calls of `bumpEconomy` would need a class, and the slate register (`slateRegister.test.ts`) a new set of rows. The census puts the gain at about 4% of a late bot turn. Not built: the risk is a stale yield in the rules.
- **A treasury clock for `collectYields`** (the meters kept across a bank that cannot change them). It needs every read of the four pools in the fold's call graph listed, as `POSITION_READERS` lists piece positions. About 3% of a late turn by the census. Not built, for the same reason; see "Further options".
- **Sharing a ghost board's readings with the real board.** The ghost board differs only in one seat's council, pantheon or Doctrines, but a town's list, the meters and the percentages all fold the law. The readings that do not (resources held, outlying hexes, watering, caravans) are about 1.5% of a late turn. Not built.
- **Map facts once a game, and work shared by all seats**: under 1% each (part 1).

**Proof**: `test/sim/aiDigest.slow.test.ts` passed with the pins unchanged (duel `29663d27:358427`, standard `5be63c3e:1044882`). Seeds 42 and 999 played from turn 1 on the stage 1 tree gave the stored digests at turns 20, 50, 75 and 100. In every paired timing below, the stage 1 tree reached the base tree's digest after every turn.

**Seconds a turn, base against stage 1** (CPU seconds of the window, three repeats; load average 4 to 5):

| Window | Base | Stage 1 | Change over the three repeats |
|---|---|---|---:|
| 42, turns 90 to 100 | 24.73, 16.89, 17.09 | 23.80, 16.45, 17.04 | −2.4% |
| 999, turns 90 to 100 | 46.27, 28.66, 31.17 | 45.52, 27.33, 31.61 | −1.5% |
| 42, turns 120 to 125 | 38.56, 28.59, 26.94 | 37.81, 28.24, 26.79 | −1.3% |
| 999, turns 120 to 125 | 47.50, 36.72, 34.56 | 45.51, 34.33, 33.32 | −4.7% |

- The gain is where a seat holds a rate row: 4% to 7% a repeat on seed 999 at turn 120, about 1% elsewhere, inside the noise of the 90 to 100 windows.

### 3. Stage 2: the savings that change play

Each keeps a reading for the rest of a seat's sitting that was read again before. The sitting's context now carries a key (`ValueContext.sitting`, a `SittingKey` that `seatContext` passes to `valueContext`); every context made from it by a spread carries the same key. A context built outside a sitting (a test, the audience that answers a paper, the rival's reading in a swap) has none and reads as before.

**Built: the beeline's table is kept while the research stands still** (`BotSitting.beeline`, `techGoalTable`, `src/ai/bot.ts`).

- Key: the sitting's context, and the seat's research (`beelineKey`: the techs known, the plan, the pool, and the number of cards held, since a charter opens a node). Lifetime: the sitting.
- How play can differ: a later ask in the same sitting reads the towns' folds, the levy and the commissions as they stood at the first ask, so a building bought or a soldier raised since does not move the goal until the next sitting. A research order changes the key, so the arm reads a fresh table at its next ask. The re-aim budget (`driver.reaimsPerTurn`) is unchanged.
- Why it is acceptable: the goal is a plan of many turns, read afresh every sitting, and the table's inputs that a sitting can move (a town's fold after one purchase) move each node's score by a little. Nothing in it is a figure the seat spends.
- Measured: 40% to 60% of the asks are handed the kept table (part 7). The table is asked less often in a sitting than the arm split suggested: most of its cost is each sitting's first ask, which this does not touch.
- Tests (`test/sim/aiBeelineTable.test.ts`, new, core, 2): an ask after a focus order (the economy clock moves) gets the kept table, and an ask after a research order reads a new one; a short game keeps tables and refuses no command.

**Built: the card stamps are kept for the sitting** (`stampReadingOf`, `src/ai/value.ts`).

- Key: the sitting and the card. Lifetime: the sitting. The first ask in a sitting reads the stamp on the economy clock as before.
- **A kept stamp is read again when another card has taken the chair it names** (`chairTakenByAnother`). Without this, a card stamped before the seat filled that chair would be priced in a chair it can no longer have, for example a chair that reads a card twice.
- How play can differ: a card stamped before the seat seated another card, bought a building or changed a build is priced on the books as they were then. So a card that pays more (or less) beside a card just seated is not seen to until the next sitting. The difference is second order: two cards in different stages multiply, so the stale price of the second misses the first's share of it.
- Why it is acceptable: what the treasury can pay is never read off a stamp (the spend arm reads the purse on the live board, `bankSpend`), so no purchase can be made with gold already spent, and the chair rule above stops the one case that would price a card in a chair it cannot take.
- Tests (`test/sim/aiSittingStamps.test.ts`, new, core, 2 of 3): every stampable card of a seat keeps its first stamp across a write (a town grown by four citizens) on the sitting's context, while a context with no sitting, and a new sitting, read the moved stamps; and a kept stamp is read again when another card is put in its chair.

**Built: the chair reading is read once a sitting** (`chairReading`, `src/ai/value.ts`).

- Key: the sitting. Lifetime: the sitting. While the first reading runs, the stand-in is on the sitting too, and a context that meets the stand-in does not keep it, so a card that opens a chair still does not read itself (BP14's guard rule).
- How play can differ: what a Wildcard chair is worth is read on the first context that asks (often the prior, inside the draft plan), so its cards are priced at the prior's prices where the final context priced them at its own.
- Why it is acceptable: the reading is a forecast (the bench's best cards and the expected card of hands still to come, discounted by the turns to draft them), and prices of the prior and the final context differ by the shadow prices' clamp at most.
- Test (`test/sim/aiSittingStamps.test.ts`, 1 of 3): a copy of the sitting's context at five times the culture and gold prices reads the same chair worth.

**Tried and taken out: the beeline's node gifts from the chains' context.** BP14 proposed pricing the table's nodes on the context the live chains use (`raced`), so a node both read is folded once. Built and measured on seed 7 (duel, four seats, turns 25 to 70, every fifth turn): the goal differed in 11 of 56 readings, and the best score was 10% lower on average. The chains' context prices at the prior and holds no chains and no want book, so some gifts read much less there. The great-person gate was the clearest case: `test/sim/aiGreatPersonGate.test.ts` failed, because a seat with 6,000 renown banked no longer aimed its research at the gate. A seat sitting on that bank without opening the gate is a mistake a player would see, so the change was taken out. The kept table above takes most of the same time.

**Not built: one context for the book.** The context census (part 1) found the memos repeated across a sitting's contexts at one revision to be cheap ones, under 2% of a late turn. The larger repeats are not repeats of one figure: the purchasing plan, the chains and the build arm price the same building rows on three contexts at three sets of prices, and the draft plan and the pass candidate price the same pool at the prior's and the final prices. Sharing them would price a town's build and the pass at the prior's prices, which undoes what the shadow prices are for (the build arm and the book agreeing about a coin). Not built.

**Not built: the last decision skips its arms.** After the kept table, what is left of the last decision is the arms that read units and the council (the stamps are kept now). Part 7 gives its share after the batch: 2% to 3% of the bot's time outside the beeline's first table. Skipping an arm needs a list of what each command can change for each arm, and a wrong row is a missed order; not built.

### 4. Stage 3: a worker stays home while its work is in danger

The user: *"worker should stay home yes"*. BP13c found 26 of 98 step-backs on seeds 42 and 999 were a worker that started the turn in its town, walked out to work and stepped back in the same turn: a worker in its town read no threat (`workerGuard` answers `null` there), so each sitting sent it out again.

- **The rule** (`threatenedTarget`, `workerChoice`, `src/ai/bot.ts`). A plan row whose hex a hostile could reach within `workers.guardTurns` turns is refused before its route is priced. The threat is the guard arm's own reading (`workerThreat`): a combatant of the wild or of a rival at war that the seat can see, by the hostile's own route and full movement (`hostileReach`). The hex is safe when no such hostile exists, when a soldier of the seat stands on it, or when a guard of the plan (`guardPlan`, a `hold` or a `march`) is going to it and arrives no later than the hostile. A town of the seat is always safe.
- **What the worker does instead**: the best safe row; or the hex it stands on (a standing row is never refused); or the survey; or a sleep, and `wakeIdleWorker` asks it again next turn.
- **A march into danger stops.** A worker whose march ends on a hex that is now threatened, with no safe row to take, is told to stop (`cancelOrder`): a stand-down does not cancel a march (`reaskTheMarch`). Its march end was its claim (`spadeClaims`), so stopping releases it, and a worker with a guard on that hex may take it.
- The threat to each hex is read once a sitting (`BotSitting.hexThreats`, by tile index), because the hostiles do not move in the seat's turn, the guard plan's own bargain. The guard on the hex is read live. `workers.guardTurns` at nought turns this off with the guards; there is no new knob.
- **Tests** (`test/sim/aiWorkerHome.test.ts`, new, core, 4; all four fail on the base tree): a worker in its town walks only to hexes a raider north of the town cannot reach in two turns (before: to (5,5), two turns from it); with every hex of the town's ring threatened it sleeps in the town, and the next turn, with the raider gone, it is roused and goes to work; a hex a soldier of the seat holds is taken where the same hex without the soldier is not; and a worker marching to a hex that is now threatened stops its march and keeps no path.
### 5. Five seeds to turn 100

Seeds 42, 999, 1, 7 and 2026, six seats summed, turn 100. Before is the base tree (the stored `bdc74737` games, played again with the detail probe); after is the final tree. Paired is the geometric mean of the per-seed ratios with a 95% t interval, and the seeds that went down and up.

| Figure | Before | After | After against before, paired | Per seed (42, 999, 1, 7, 2026) |
|---|---:|---:|---|---|
| Towns | 290 | 302 | +3% [−9%, +17%], 1 down, 4 up | 52→54, 69→73, 54→47, 61→70, 54→58 |
| Citizens | 1,816 | 1,859 | +1% [−22%, +33%], 1 down, 4 up | 336→401, 435→466, 374→262, 382→390, 289→340 |
| Food | 6,966 | 7,006 | −1% [−34%, +48%], 2 down, 3 up | 1,221→1,579, 1,741→1,661, 1,506→859, 1,478→1,785, 1,020→1,122 |
| Production | 7,695 | 9,295 | +6% [−55%, +150%], 2 down, 3 up | 1,007→1,277, 1,542→2,011, 2,021→944, 1,479→4,043, 1,646→1,020 |
| Gold | 3,040 | 3,191 | +3% [−29%, +50%], 3 down, 2 up | 534→466, 1,065→964, 431→340, 529→893, 481→528 |
| Science | 5,120 | 4,611 | −12% [−43%, +37%], 2 down, 3 up | 758→864, 1,342→1,360, 1,144→540, 981→944, 895→903 |
| Culture | 2,524 | 2,238 | −20% [−56%, +48%], 3 down, 2 up | 487→282, 648→692, 474→223, 432→691, 483→350 |
| Faith | 1,120 | 1,071 | −5% [−25%, +21%], 4 down, 1 up | 159→204, 275→247, 169→129, 252→249, 265→242 |
| Improvements started, turns 1 to 100 | 1,351 | 1,337 | +1% [−21%, +29%], 3 down, 2 up | 216→235, 339→320, 276→234, 336→296, 184→252 |
| Workers built, turns 1 to 100 | 445 | 454 | +3% [−14%, +25%], 3 down, 2 up | 76→77, 106→105, 90→83, 109→103, 64→86 |
| Workers taken (the wild and rivals) | 109 | 56 | **−54% [−76%, −12%]**, 4 down, 1 up | 19→6, 18→5, 31→16, 18→19, 23→10 |
| Step-backs | 225 | 86 | **−64% [−80%, −32%]**, 5 down, 0 up | 52→11, 46→11, 39→24, 38→23, 50→17 |
| of them repeats (started the turn in its town) | 31 | 1 | 4 down, 0 up | 10→0, 16→0, 0→0, 4→1, 1→0 |
| Bare worked share, turn 100 (pooled) | 20% | 22% | 3 down, 2 up | 33%→31%, 12%→23%, 17%→15%, 11%→22%, 30%→14% |

More worker readings, five seeds summed (`workers15.py`): workers taken by the wild 103 → 56 and by rivals 6 → 0; soldiers killed by the wild 233 → 263 (+13%); the share of worker-turns spent working 18% in both; improvements started to turn 94 that are worked six turns later 85% in both; worker-turns with no order (`idles`) 47 → 187, and re-aimed worker marches 818 → 994 (+22%), as workers wait or change target instead of walking into danger. Holds after a step-back (BP13c's rule, now rarely needed) fell from 54 to 16.

- **Workers are much safer, and the repeats are gone.** Half as many workers were taken (the interval excludes nought, four seeds of five down), step-backs fell by two thirds on every seed, and 30 of the 31 repeats BP13c described are gone. Improvements started, the share of them worked and the share of worker-turns spent working did not move.
- **The yields: neither.** No yield moves with an interval that excludes nought, and each rises on two or three seeds of five except faith (four down, by 5% paired). Science (−12%) and culture (−20%) fell most, both mostly on seed 1, which also lost seven towns; production rose most (seed 7, 1,479 to 4,043). Five seeds cannot tell these from games parting: BP14's step 0 found intervals as wide between two trees that differ much less. So: better for workers, neither for the economy.
- The soldiers killed by the wild rose by 13% (233 to 263), perhaps because guards and soldiers now stand where workers would have walked. Not studied further.

### 6. Seconds a turn

The pre-BP14 tree (`e682002d`), the base (BP14) and the final tree, from the same snapshots in one process, a turn each in rotation, three repeats. CPU seconds of the whole window; load average 4 to 7 (another agent's games ran beside these).

| Window | Pre-BP14 | BP14 (base) | Final | Final against BP14 | Final against pre-BP14 |
|---|---|---|---|---:|---:|
| 42, turns 90 to 100 | 31.66, 23.34, 21.29 | 29.91, 21.46, 19.90 | 30.09, 21.28, 19.58 | −0.4% | −7.0% |
| 999, turns 90 to 100 | 46.08, 35.20, 33.51 | 43.38, 32.36, 31.68 | 43.23, 31.22, 30.21 | −2.6% | −8.8% |
| 42, turns 120 to 125 | 47.84, 38.01, 33.05 | 45.60, 37.31, 30.83 | 45.21, 35.28, 30.10 | −2.8% | −7.0% |
| 999, turns 120 to 125 | 56.51, 46.92, 42.33 | 53.16, 46.59, 39.77 | 51.00, 44.66, 36.90 | −5.0% | −9.1% |

- **This batch: 0% to 5% a turn**, about half of it stage 1 (part 2) on the seats that hold a rate row. The final tree makes 3% to 7% more decisions in the same windows (seed 42, turns 90 to 100: 1,177 against 1,099), because its play differs: a worker that waits is asked again. A decision is 7% cheaper on the two turn 90 windows (the bot's CPU over its decisions).
- **Since BP14 started: 7% to 9% a turn.**
- The machine was busier than in BP14's runs, so the absolute seconds are about a quarter higher than BP14's table and the stage 1 table above; only the ratios inside one process compare.
- The five-seed games' own CPU (separate processes, with the probe's bookkeeping, turns 90 to 100) read 2.21 before and 2.62 after a turn, 3 seeds down and 2 up; the after games ran on a loaded machine and played bigger boards on seeds 42 and 7. Not used for speed.

### 7. Where the time goes now

- **The beeline's table** (`decisionMemoTally`, the final tree, the same four windows): 36 of 72, 45 of 112, 53 of 90 and 50 of 118 asks were handed the kept table. The rest are each sitting's first ask and the asks after a research order.
- **The last decision** (the arm split on the final tree): 10% of the bot's time at seed 42 turns 90 to 95, and 4% at seed 999 turns 120 to 123, as before. Most of it is still the beeline's table at its first ask in the sitting (987 of 1,358 ms, and 593 of 1,135 ms); the other arms are 2% to 3% of the bot's time. This is the measure behind leaving the skip unbuilt.
- **By seat** (`seats.ts`, the final tree): the slowest seat of each turn, summed over the window, is 30% to 35% of the bot's time (seed 42, turns 120 to 125: 11.0 of 31.3 CPU seconds; seed 999, turns 90 to 100: 11.7 of 34.8). The part of a turn that is not a bot decision (the reducer applying commands, and the turn end) is 20% to 23%.

### 8. Further options

The user asked what else could make bot games faster. Estimates are shares of a late turn from the profiles and censuses above, unless said otherwise.

**Bots that decide in parallel** (approved by the user as the next batch, BP16: *"parallel bots sounds good too"*). A design, not built here.

- **How the seats decide today.** `driveBots` (`src/ai/driver.ts`) walks the seats in `realPlayers` order (`botSeatsToDrive`). For each seat, `driveSeat` opens one sitting (`botSitting`) and loops: ask `nextBotDecision` on the live state, `dispatch` the command (which appends it to the log), ask again, until the bot answers nothing and the seat ends its turn. So seat 3 decides on a board that already holds every command seats 0 to 2 sent this turn. The stepper (`stepper.ts`) is the same loop one decision at a time, pinned byte for byte against `driveBots`. The game page runs the same loop in one web worker (`src/ui/bot.worker.ts`): the page sends a structured clone of its state with the bot memories kept beside the state (`harnessMemory.ts`: deal refusals, war ledger, muster roll, focus roll), the worker runs `driveBots` on the clone and records every command it put to the reducer, and the page puts the same commands to its own state in the same order (`replayBotAttempts`), stopping at the first outcome that differs. The arena and the tuner run one whole game per worker or process. The turn resolves when every seat has ended (rule 3).
- **What a later seat reads of an earlier seat's same-turn commands.** Pieces: a hex an earlier seat's unit took (one combatant a hex), its zone of control on the later seat's routes, a unit it killed or damaged, a worker or a town it captured (a melee kill on a garrison takes the town at once), and what the later seat's threat and guard readings see. Diplomacy: a war declared (the later seat's soldiers act on it in the same turn), a paper put to it (bot-to-bot papers are answered at the receiver's sitting), a deal signed (the luxury copies lent). Shared things decided by log order (rule 2): the great-person roster (`chooseGreatPerson` is refused and redrawn when another seat took the name, the one refusal that changes the state), a founding site made illegal by a town just founded beside it, a hex bought, and a wonder's front-row refund. Research, a town's build choice, a citizen focus, a card seated and the seat's own purchases read only the seat's own empire, except where a card counts foreign towns or routes.
- **(a) Plan on the turn-start state, apply in seat order.** Each seat's sitting runs in its own worker on a clone of the state as the turn began, applying its own commands to its own copy. The main thread then applies the seats' command lists in seat order. At the first command whose outcome differs from the worker's (refused, or accepted with a different result), the rest of that seat's list is dropped and the seat's sitting continues serially on the live state. Determinism: each worker's list is a pure function of the turn-start state and the seat, the merge order is fixed, and a re-plan is serial, so the result does not depend on thread timing. Play changes: a later seat no longer reacts in the same turn to an earlier seat's moves unless one of its commands is refused, so the seats become more alike in what they see (today seat 5 sees five seats' turns and seat 0 none). Saves are unchanged: the log holds the applied commands in the order applied, and a replay of `{config, log}` replays them with no bot in the loop.
- **(b) A phase split.** The decisions that cannot collide (research, build choices, focus, card seating, drafts) run in parallel, then unit orders and diplomacy run in seat order. Play changes inside a seat too: today its arms interleave (an offer, a purchase, a unit, a town), and a phase split reorders them, so a seat would choose its builds before its soldiers move. The context, the biggest cost, would be built in the parallel phase and is needed again by the serial one, so it would have to be built twice or sent across threads. Less gain and more change than (a) or (c).
- **(c) Speculative planning with a check.** As (a), and before seat k's list is applied, the main thread checks whether the commands of seats before it this turn touched anything seat k's sitting read. A coarse, conservative check is enough: a unit of an earlier seat that moved, fought or was made within a radius of seat k's units, towns and plan hexes; a war, peace or paper that names seat k; a town founded or captured within a radius of seat k's sites and towns; a great person called; a deal that lends seat k a copy. If nothing touched, seat k's list is exactly what it would have decided serially, and it is applied whole; if something did, seat k is planned again serially on the live state. Play and the digests stay identical to today **if the check is complete**, which is the strongest test of it. The speed-up depends on how often neighbours touch each other; on a standard map in the late game, seats at war will often re-plan.
- **State shared between threads.** A structured clone of the state for each worker (about 10 ms at turn 150, by `bot.worker.ts`'s own measure; six clones is well under 2% of a late turn of 2 to 6 CPU seconds) and the four harness memories. A shared read-only snapshot would need a binary encoding of the whole state; not worth it at these sizes. Workers keep nothing between turns, as the page's worker does today, so no copy can drift. The memories a seat's sitting writes (its focus roll, its muster mark, a refusal it records) come back with its list and are merged in seat order.
- **Expected speed-up** for six seats on a 10-core machine. Measured on the final tree (part 7): the slowest seat of each turn, summed, is 30% to 35% of the bot's time, and the rest of a turn (the reducer and the turn end) is 20% to 23% of it. With (a) or (c) and no seat planned again, a turn costs the serial part plus the slowest seat: 46% to 50% of today's, so **about 2× faster** at turns 90 to 125 (2.0× to 2.2× on the four windows). Six seats use six cores; a seventh to tenth core does not help one game, because the slowest seat bounds it. Clones and messages add 1% to 2%. Seats planned again eat into it: with (c) on a board where neighbours fight, perhaps 1.5×. (b) gains less, because the context, the largest single cost, is needed by both phases. For the tuner and the arena, one game per core (as today) is still the better use of cores; parallel seats shorten one game, which is what a player waiting at End Turn and the digest tests feel.
- **Tests that would prove it.** (1) For (c): the parallel driver gives the digest pins of `aiDigest.slow.test.ts` unchanged on both boards, and the same log as `driveBots`. (2) For (a): one game played twice with the parallel driver, once with the workers' replies taken in seat order and once in reverse and in a shuffled order, gives the same log and digest. (3) The log of a parallel game replays through the reducer alone to the same state (saves). (4) A board where an earlier seat's unit takes the hex a later seat's plan marches to: the later seat's command is refused or caught by the check, the seat re-plans and ends its turn with no warning and no stall. (5) The worker's reply and the page's replay agree (`test/ui/botWorker.test.ts`, extended to several workers).

**A cheaper bot for the tuner** (`scripts/evolve.ts`, `docs/plans/bot-evolution.md`). The tuner plays 16 games a child, and a standard board's last twenty turns cost as much as its first hundred. A tuner mode could stamp no cards (walk them all), read the beeline's table once a turn, ask fewer routes (`search.pathProbes`) and skip the escort and guard plans. Perhaps 30% to 50% off a game. The cost: the tuner would fit knobs to a bot that is not the shipped one, and the stamps are where card prices come from. Only worth it with a check that the champion found in tuner mode still wins in full mode on held-out seeds.

**Stopping a tuner game early when it is decided.** Fitness is the score at the horizon (turn 100 or 120). If the candidate's three seats lead or trail by more than a margin at turn 80 on every reading, the result is known; the last twenty turns of a standard game are about 40% of its cost. The cost: a new rule for "decided" that must be calibrated on stored games (how often a turn-80 lead reverses by turn 100), and the promotion rule counts signs, so a wrong early stop is a wrong sign.

**A shared early game.** Two children that differ only in knobs read after turn T play the same game to T, so one snapshot could serve both. In practice nearly every knob is read in the first turns (the weights, the horizon), and a child's genome mutates many genes at once, so few pairs would share a prefix. Only worth it if the genome is split into blocks by when they are first read, which a read trace of `aiConfig` could measure.

**A treasury clock** (stage 1's left item). Most of `collectYields`' repeated meter readings (367 of 374) give the same answer, because each bank announces the treasury in case a card counts banked gold. A tenant that never read the treasury could survive a treasury-only announcement. About 3% of a late turn; it needs a register of every read of the four pools under the folds, as `POSITION_READERS` is for positions, and a shadow run.

**A finer clock for a town's list** (stage 1's other left item). About 4% of a late bot turn; it needs every economy announcement classified by the town it reaches.

**Fewer stamps.** The stamps are now kept for a sitting, and their first reading is still 15% to 20% of a late turn on seed 999. A stamp folds every town of the empire under the card. A cheaper form would fold only the towns a card's scope admits (its `where` and `scope`), with the others copied from the real board's lists. That is exact for most cards and wrong for an engine that reads other cards' lines, so it would need the same register of shapes `foldReadEngine` keeps.

### Pins

`test/sim/aiDigest.slow.test.ts`, re-cut once at the end with the reason printed beside them: duel `29663d27:358427` -> `ec1eb394:358349`, standard `5be63c3e:1044882` -> `70375d88:1021629`. Stage 1 alone moved neither (part 2). Neither board reported a warning or a stall. The digest file was run again on the working tree with the new pins and passed (both boards).

### Checks

- Type check clean (`nice -n 15 npm run typecheck`).
- Narrow tests, by name, all passed: the four new files (`empireLinesAtRest`, `aiBeelineTable`, `aiSittingStamps`, `aiWorkerHome`); the brief's list (`aiBot`, `aiWar`, `aiDiplomacy`, `aiWorkerClaims`, `aiWorkerHold`, `aiWorkerGuards`, `aiRouteMemo`, `aiDecisionMemo`, `aiEndCheckLoops`, `aiWants`, `verbs`, `test/mapgen/moduleCycles`, `yieldsDocSync`); and the files that read the changed code or name its functions (`aiDevotion`, `aiAppraisal`, `aiCommissions`, `aiMagisterial`, `slateRegister`, `cardImpact`, `statecraft`, `weariness`, `momentsR1`, `cities`, `aiCommerce`, `aiCardStamp`, `aiSittingMemos`, `empireYieldAtRest`, `readings`, `aiPersona`, `aiGreatPersonGate`, `aiSmallReadings`, `aiModuleCycles`, `aiScientific`, the Scientific and Magisterial Doctrine deck files, and `test/ui/topBar`, `topBarCost`, `tradePanels`, `ledgerScreen`, `statecraftReveal`, `dealMemory`, `botWorker`).
- **Two interface tests were brought up to date**, outside the batch's fence because they pin the shape stage 1 changed: `test/ui/topBar.test.ts` reads the line of `readings.ts` that calls `explainEmpireLines`, and `test/ui/topBarCost.test.ts` counted two meter sweeps for an empire with a rate card, which is now one. No interface source changed.
- Slow tier: `aiDigest.slow.test.ts` on the stage 1 tree (pins unchanged), on the final tree (the new pins read off it), and on the working tree with the new pins; `aiWants.slow.test.ts`. The whole core tier, the build and the rest of the slow tier are the orchestrator's.

### Files

- `src/sim/readings.ts`: `empireReading` hands `explainEmpireLines` the remembered books.
- `src/sim/yields/empire.ts`: `explainEmpireLines` and `explainEmpireCardYields` take the books as an optional thunk.
- `src/ai/bot.ts`: `valueContext` takes a `SittingKey`, and `seatContext` passes one; `BotSitting.beeline`, `beelineKey`, `techGoalTable` (kept) and `readTechGoalTable` (the old body), `TechGoalTable`; `bestTechGoal` takes a sitting; `BotSitting.hexThreats`, `threatenedTarget`, and `workerChoice` with the refusal of threatened rows and the stopped march.
- `src/ai/value.ts`: `ValueContext.sitting` and `SittingKey`; `stampReadingOf` kept for the sitting (`SITTING_STAMPS`, `economyStampReading`, `chairTakenByAnother`); `chairReading` once a sitting (`SITTING_CHAIRS`).
- `src/ai/decisionMemo.ts`: the table's two tallies.
- Tests: `test/sim/empireLinesAtRest.test.ts`, `aiBeelineTable.test.ts`, `aiSittingStamps.test.ts`, `aiWorkerHome.test.ts` (new); `test/sim/aiDigest.slow.test.ts` (the pins); `test/ui/topBar.test.ts` and `test/ui/topBarCost.test.ts` (one line each).
- `docs/bot-priorities.md`, and this section.
- Scratch (not in the repo), in the session's scratch folder `bp15/`: the probe `probe.ts`, `census.ts`, `ctxcensus.ts`, `arms.ts` with `armpatch.py`, `seats.ts`, BP14's `pair.ts`, `prof14.ts` and `snap14.ts`, the queues, `digests.py`, `table15.py` and `workers15.py`, the profile readers (with `profwhere.cjs`), the snapshots in `snaps/`, the logs in `logs/`, and the games in `out/` (`before/` and `after/`, with `PROBE.ts` and a `NOTES.md` for the baseline folder). The scratch trees (`base/`, `inst/`, `s1/`, `s2/`, `s2arms/`, `pre14/`) were removed at the end.

## BP16: the audit's safe items, then parallel bots, 2026-11-17

`docs/flags.md`, the bullet "BP16: the audit's safe items, then parallel bots". The user: *"lets gp for 1 and 2."* Stage A takes the three safe items of `docs/plans/bot-simplification-audit-2026-11-17.md` (T4, T2, T3). Play may change; the pins are cut once and five seeds are checked. No knob, no data and no rule changed.

### Method

- **Trees.** The **base tree** is `aba435ea` (the head of `decks`: BP15 at `843b2d55` and the flags commit; the same bot and rules as `843b2d55`), a clean detached worktree. The **stage A tree** is the base with this stage's files copied in (`freeze.sh`). A **T3-only tree** is the base with only the spend arm's memo and the gate's price (T3), to show that T3 changes no play. Each was a scratch worktree outside the repo.
- **The before games.** The `843b2d55` baseline's `PROBE.ts` with one more key, `w.moves` (each accepted march: the piece, the target, its type, and its reason, with a re-ask's prefix cut so the arm under it shows), played on the base tree for the five seeds. All five reached the stored digests of `/Users/jacky/code/webciv-baselines/843b2d55/six-seat-standard-t100/` at turns 20, 50, 75 and 100 (seed 42 `4f531faa:961790`, 999 `eac67e9e:1002567`, 1 `ebbcdfc7:950214`, 7 `c53c1f9e:1017553`, 2026 `c3d2aa88:959943`).
- **Flips** are the audit's: a piece's march target returns to the target of its order two before, with a different target between, inside three turns. A flip is a hurt piece's when the fall-back ("Too hurt to be out here") and the hunt or the campaign call-out are among its three orders.
- **A census** of diplomacy on the base tree (one logging line in `decideNext`, in a scratch copy): every ask, by sitting, and which answers came after an ask in the same sitting that had nothing to say. Those are the answers the new rule sends a turn later. The census reached the stored digests on all five seeds.
- **Timings.** BP14's `pair.ts`: a turn-90 snapshot of the base tree restored into both trees in one process, a turn each in rotation, three repeats. CPU seconds by `process.cpuUsage`. One game process of mine at a time, `nice -n 15` under `caffeinate -i`.
- **Machine.** Shared with other agents. The load average was 3 to 9 during the timings, with one spike to 32 at the start of seed 42's.

### 1. The heal arm and the dug-in piece (T4)

- **Cause.** `restAndHeal` answered nothing for a hurt piece that was already fortified, because `fortifyError` refuses "already fortified". So `soldierCommand` went on to the escort, the blows and the marches. `wakeTheHunt` and `wakeTheCampaign` ask exactly such pieces, called them out to a camp or a muster, and `fallBackAndHeal` walked them home again on the next turn (or, in the campaign's case, in the same sitting).
- **Change.** `restAndHeal` answers `'resting'` for a hurt piece on its own ground that is already dug in, and `soldierCommand` then sends it nothing. A piece that is not dug in still digs in, and the decisive-blow exception is unchanged.
- **Tests** (both failed before the fix): `test/sim/aiCampHunt.test.ts`, "leaves a hurt piece dug in on its own ground to mend, and calls the others out"; `test/sim/aiWar.test.ts`, "leaves a hurt piece dug in on its own ground to mend, and calls the healthy ones". Each drives a whole sitting: the healthy dug-in pieces are called out, the hurt one is sent nothing and is still dug in.
- **Measured.** A hurt piece called out and walked home: 64 flips before, 2 after, five seeds (8→0, 10→1, 13→1, 14→0, 19→0). All flips: 743 → 715, which is inside the noise of games that part (part 4).

### 2. Diplomacy once a sitting (T2)

- **Change.** `decideNext` asks `diplomacyDecision` at every decision until the first one where it answers nothing, and then not again in the sitting (`BotSitting.abroadQuiet`). This is the audit's "first ask" rule, kept going while each ask answers, so several papers on the table are all answered.
- **Incoming papers are answered at once.** Bot-to-bot papers are sent only in the sender's sitting, so every paper standing for a seat is on the table when it sits down, and it is answered in that sitting. The audience (`answerAudience`, a person's paper) is unchanged. In the census no answer to a paper (`acceptDeal`, `declineDeal`) came after a quiet ask: 0 of 94.
- **What waits one turn**, by the census (base tree, five seeds, turns 1 to 100): 57 of 255 answers came after a quiet ask in the same sitting. They were 53 swap papers (`proposeDeal`: a copy the seat gained in the sitting, for example a plantation laid), 3 peace papers and 1 declaration. Per seed: 7 of 28, 18 of 95, 10 of 39, 11 of 52, 11 of 41. The asks fall from 26,092 (8.7 a sitting) to about one a sitting plus one for each answer.
- **The swap writer reads a bot receiver's verdict with no prices** (the audit's finding 23, `receiverReader`). Checked in code: on a bot's swap what arrives is a kind the receiver lacks at `war.luxuryGoldBaseline` (bounds 40 to 300), plus any coin a sweetened paper adds (`counterTerms` only adds coin); what leaves is one kind at the same baseline, less the share the receiver keeps while it is lent. The two terms that read the receiver's prices, a new deal partner and what lent copies pay its cards, only add to its total. So the verdict is the last-copy clause alone. The receiver's context and the callback that built it in `decideNext` are gone, and `diplomacyDecision` takes a switch (`askReceivers`) in its place.
- **Tests** (`test/sim/aiDiplomacy.test.ts`): two papers put to a seat before its sitting are both answered in it, and the seat is quiet after; a paper that reaches a seat after it fell quiet waits for its next sitting; and a receiver holding The Treaty Ports and Export Guilds signs, on its own full context, the swap a bot wrote with no prices, with both price terms printed in its answer.

### 3. The spend arm's empty answer, and one price a purchase (T3)

- **Change.** `bankSpend` keeps a "nothing to buy" reached before any live gate for the sitting (`BotSitting.spendQuiet`, one a bank). The key is what that answer reads: the purse in the bank (`purseOf`), the gold reserve (`goldReserveFor`; nought in the other banks), the running routes (`usedRouteSlots`), and the sitting's record of the next route after a hire (`routeOffer`, by identity). The book and its bar are the sitting's context's and do not change in the sitting. A "nothing" after a gate struck a row is not kept. The purse is read once a call instead of once a row. Faith and culture now get the sitting too, for the memo; only gold reads the next route.
- **The want book prices a purchase once** (the audit's finding 4). `purchaseGate` (`src/sim/purchase.ts`) hands back the price its bank clause compared (`price`, set when the gate reached the bank), and `reachOf` reads it. Only a unit with a piece of the seat in the town's hex, refused before the bank, is priced again.
- **Proof that the answers are the same.**
  - With T3 alone on the base tree, seeds 42 and 999 to turn 100 gave the stored digests at turns 20, 50, 75 and 100, and both digest pins held unchanged.
  - The decision memo's shadow switch (`setDecisionMemoShadow`) now covers the kept answer too: every hit is read again and the arm throws if the fresh answer is not the same "nothing before a gate". With it on, the whole of stage A played seeds 42 and 999 to turn 100 with no throw and the same digests as without it. 12,014 of 14,251 asks (seed 42) and 13,191 of 15,605 (seed 999) were handed the kept answer.
- **Tests.** `test/sim/aiDecisionMemo.test.ts`: the four-seat shadow game now also asserts that more than 50 kept answers were checked, and a new test asserts that a second ask in a sitting is kept and that a coin more in the purse is read again. `test/sim/purchase.test.ts` and `test/sim/decks/commercePurse.test.ts` pin the gate's `price` against `explainPurchaseCost`.

### 4. Five seeds to turn 100

Six seats summed. Before is the base tree, after the stage A tree. Paired is the geometric mean of the per-seed ratios with a 95% t interval.

| Figure | Before | After | After against before, paired | Per seed (42, 999, 1, 7, 2026) |
|---|---:|---:|---|---|
| Towns | 302 | 294 | −2% [−20%, +20%], 4 down, 1 up | 54→51, 73→66, 47→61, 70→67, 58→49 |
| Citizens | 1,859 | 1,717 | −7% [−31%, +27%], 4 down, 1 up | 401→300, 466→370, 262→364, 390→389, 340→294 |
| Food | 7,006 | 6,662 | −2% [−29%, +35%], 4 down, 1 up | 1,579→1,177, 1,661→1,481, 859→1,289, 1,785→1,615, 1,122→1,100 |
| Production | 9,295 | 6,887 | −17% [−46%, +27%], 4 down, 1 up | 1,277→1,069, 2,011→1,773, 944→1,206, 4,043→1,965, 1,020→874 |
| Gold | 3,191 | 3,087 | −3% [−33%, +42%], 3 down, 2 up | 466→446, 964→1,060, 340→512, 893→705, 528→364 |
| Science | 4,611 | 4,379 | −2% [−30%, +37%], 4 down, 1 up | 864→716, 1,360→1,120, 540→847, 944→830, 903→866 |
| Culture | 2,238 | 2,302 | +9% [−37%, +86%], 3 down, 2 up | 282→242, 692→685, 223→454, 691→455, 350→466 |
| Faith | 1,071 | 969 | −8% [−35%, +30%], 4 down, 1 up | 204→186, 247→246, 129→177, 249→158, 242→202 |
| Improvements started, turns 1 to 100 | 1,337 | 1,316 | −2% [−11%, +9%], 3 down, 2 up | 235→222, 320→290, 234→251, 296→319, 252→234 |
| Workers built | 454 | 440 | −3% [−9%, +3%], 3 down, 2 up | 77→76, 105→96, 83→84, 103→105, 86→79 |
| Workers taken (the wild and rivals) | 56 | 72 | +41% [−27%, +174%], 1 down, 4 up | 6→8, 5→15, 16→17, 19→14, 10→18 |
| Soldiers lost to the wild | 263 | 232 | **−11% [−20%, −2%]**, 5 down, 0 up | 66→58, 31→28, 61→59, 39→36, 66→51 |
| Deals proposed | 94 | 75 | −15% [−34%, +8%], 3 down, 1 up | 10→10, 36→25, 11→12, 18→14, 19→14 |
| Deals signed | 88 | 74 | −11% [−28%, +9%], 3 down, 1 up | 10→10, 34→25, 10→11, 17→14, 17→14 |
| Wars declared | 24 | 14 | −55% [−91%, +121%], 4 down, 1 up | 3→1, 8→1, 6→7, 6→5, 1→0 |
| Flip-back orders | 743 | 715 | −3% [−24%, +23%], 3 down, 2 up | 135→126, 132→160, 130→150, 148→124, 198→155 |
| of them a hurt piece called out and walked home | 64 | 2 | **−91% [−98%, −54%]**, 5 down, 0 up | 8→0, 10→1, 13→1, 14→0, 19→0 |

- **Better for soldiers, neither for the economy.** The hurt-piece flips are gone on every seed, and soldiers lost to the wild fell on every seed (the only other interval that excludes nought). No yield moves with an interval that excludes nought. Production fell most (−17%), and most of that is seed 7, which was BP15's outlier at 4,043.
- **Fewer wars, and not because a declaration waits.** The census found 1 declaration of 24 that the new rule would send a turn later. Seeds 42 and 999, where the drop is, part from turn 20 on (the digests differ from turn 50), so this reads as the games parting; five seeds cannot tell it from an effect. Deals fell less, and 53 swap papers over the five games wait a turn by the census.
- Workers taken rose on four seeds of five (+41%), with an interval from −27% to +174%. Not studied further.

### 5. Seconds a turn

The base and the stage A tree from the base tree's turn-90 snapshot, in one process, a turn each in rotation, three repeats. CPU seconds of turns 90 to 100 (11 turns), and the bot's own CPU inside `nextBotDecision`.

| Window | Tree | Repeat 1 | Repeat 2 | Repeat 3 | Bot, repeats 1 to 3 | Decisions |
|---|---|---:|---:|---:|---|---:|
| 42, turns 90 to 100 | base | 40.54 | 22.00 | 21.35 | 30.84, 16.85, 16.52 | 1,138 |
| | stage A | 36.77 | 20.33 | 20.43 | 27.73, 14.92, 14.44 | 1,106 |
| 999, turns 90 to 100 | base | 56.16 | 39.54 | 34.94 | 44.73, 32.12, 28.49 | 1,207 |
| | stage A | 51.64 | 37.05 | 29.78 | 41.17, 28.41, 22.51 | 1,267 |

- **The turn is 8% to 9% cheaper over the three repeats** (seed 42 −7.6%, seed 999 −9.3%), **and the bot 11% to 13%** (−11.1%, −12.6%). Per decision the bot is 9% and 17% cheaper; stage A made 3% fewer decisions on seed 42 and 5% more on seed 999, because its play differs.
- Both base runs reached the stored digest at turn 100, so the snapshots replay the stored games.

### Pins

`test/sim/aiDigest.slow.test.ts`, cut once: duel `ec1eb394:358349` -> `973ac191:342552`, standard `70375d88:1021629` -> `604db3ce:1039518`. T3 alone moved neither. Neither board reported a warning or a stall. The digest file and `aiWants.slow.test.ts` were run again on the working tree with the new pins and passed.

### Checks

- Type check clean (`nice -n 15 npm run typecheck`).
- Narrow tests, all passed: the brief's list (`aiBot`, `aiWar`, `aiDiplomacy`, `aiWorkerClaims`, `aiWorkerHold`, `aiWorkerGuards`, `aiWorkerHome`, `aiRouteMemo`, `aiDecisionMemo`, `aiEndCheckLoops`, `aiWants`, `verbs`, `test/mapgen/moduleCycles`, `test/ui/botWorker`), and the files that read the changed code or name its functions (`aiCampHunt`, `aiCommerce`, `aiModuleCycles`, `empireYieldAtRest`, `purchase`, `decks/commercePurse`, `tilePurchaseGate`, `weariness`, `test/ui/dealMemory`, `test/ui/seatNames`).
- Slow tier: `aiDigest.slow.test.ts` on the T3-only tree (pins unchanged), on the stage A tree (the new pins read off it), and on the working tree with the new pins; `aiWants.slow.test.ts` on the working tree. The whole core tier, the build and the rest of the slow tier are the orchestrator's.

### Files

- `src/ai/bot.ts`: `restAndHeal` and `soldierCommand` (T4); `BotSitting.abroadQuiet` and `decideNext` (T2); `BotSitting.spendQuiet`, `bankSpend` and `readBankSpend`, and `spendCommand` hands the sitting to every bank (T3).
- `src/ai/diplomacy.ts`: `diplomacyDecision` and `swapDecision` take `askReceivers`; `receiverReader` reads no prices.
- `src/ai/wants.ts`: `reachOf` reads the gate's price.
- `src/ai/decisionMemo.ts`: the spend memo's two tallies.
- `src/sim/purchase.ts`: `purchaseGate` hands back `price`.
- Tests: `test/sim/aiCampHunt.test.ts`, `aiWar.test.ts`, `aiDiplomacy.test.ts`, `aiDecisionMemo.test.ts`, `purchase.test.ts`, `decks/commercePurse.test.ts`, and the pins in `aiDigest.slow.test.ts`.
- `docs/bot-priorities.md`, and this section.
- Scratch (not in the repo), in the session's scratch folder `bp16/`: `probe.ts`, `gamesq.sh`, `freeze.sh`, `play.ts`, `pair.ts`, `diplocensus.ts`, `table16.py`, `slow.sh`, the queues `qA2.sh` and `qA3.sh`, the snapshots in `snaps/`, the logs in `logs/`, and the games in `out/` (`before2/` and `stageA/`, each with `PROBE.ts`; `stageA/` has a `NOTES.md` for the baseline folder). The T3-only and census trees were removed; the base and stage A trees (`before/`, `stageA/`) are kept for the stages that follow and will be removed at the end.

### Stage B: the bot's turn in phases

`docs/flags.md`, the bullet "The bot's turn in phases, and a fourth rendering speed pass". The user: *"lets take this phased approach"*. Before this stage `decideNext` asked its whole list of arms again after every command. Now a sitting asks a few groups of arms (phases) until each has nothing more to do, then not again unless a named event opens it. Every arm keeps its own logic and sentences. Play may change; the pins are cut once and five seeds are checked. No knob, no data and no rule changed.

#### Method

- **Trees.** The **stage A tree** is the branch head `4323c876` (stage A, committed, and a merge of `decks` that changed only `docs/flags.md`). The **stage B tree** is it with this stage's files copied in. A **variant tree** of the first shape, with a scratch switch that moves named phases after the loop, served the ablation in part 3. Each was a scratch worktree outside the repo.
- **The before games** are stage A's after games (`out/stageA/`, the same probe). Replayed from a snapshot or a census, the stage A tree reached their digests.
- **The census.** A scratch copy of the stage A tree with one logging call around every arm of `decideNext` and `housekeeping`, and a probe that records what changed on the seat's own board between two decisions (its purse, towns, research, offers, cards, wars, soldiers, units, queue heads and piece positions). For each arm and sitting it counts the answers before the arm's first empty answer and the answers after one, and for the second kind what changed in between. The census games reached stage A's stored digests on all five seeds.
- **The end check** (`setSittingEndCheck`, `sittingPhases.ts`): at the end of each sitting, the old full pass (`theOldPass`, every arm in the order before this stage) is asked on a copy of the sitting, with the harness memories read before and put back after, and what it would still have done is counted. With the check on, seed 42 gave the same digests as with it off (both shapes), and so did all five seeds of the final shape.
- **Timings.** BP14's `pair.ts` from stage A's turn-90 and turn-120 snapshots of seeds 42 and 999, both trees in one process, a turn each in rotation, three repeats. Load average 3 to 4 (the machine was quiet for these runs; it was at 10 to 70 for the games).

#### 1. The census: which arm answered after it had said nothing

Five seeds, turns 1 to 100, on the stage A tree: 3,000 sittings, 27,297 decisions, 179,933 asks of an arm.

| Arm | Asks | Answers | Of them after an empty answer in the same sitting | What had changed |
|---|---:|---:|---:|---|
| `disband` | 26,341 | 27 | 4 | the purse (4), a unit gained (4), a soldier lost (2) |
| `spend` | 26,314 | 1,352 | 71 | the purse (71), a piece moved (67), a town grew (23), a unit gained (23), a war (9) |
| `slotting` | 3,596 | 395 | 208 | the cards (208): a card unseated by the re-seat arm, then another seated |
| `reaimBeeline` | 4,689 | 320 | 0 | |
| `focus` | 4,365 | 769 | 0 | |
| `reslot`, `levy`, `retire`, `projectIdle`, `diplomacy` | | | 0 | |
| the loop's arms (escorts, campaign, hunt, guards, idle settler, idle unit) | | | 185, 47, 7, 2, 1, 2 | a piece moved |

The loop's arms answer after another piece moved by design, so they stay a loop. Of the phases, only spending and the council answered after an empty answer, and in the council it was the council's own command.

#### 2. The shape as built

- **The first shape** was the ruling's order: research, diplomacy, the council, spending, housekeeping, each until it had nothing more to do, then the loop, then the end, with four events (`purse` to spending, `council` to the council, `queue` (a town's build) to housekeeping, `copies` to diplomacy). Housekeeping's focus waits while a town has no build. The end check found 26 orders in 3,000 sittings that the old pass would still have sent (20 beeline re-aims, 2 declarations, 1 peace signed, 1 focus, 1 purchase, 1 disband).
- **But it lowered production** (part 3), so the final shape asks research, the council and housekeeping **after** the loop, where the old order asked them:
  1. diplomacy, then spending, each until it has nothing more to do;
  2. the loop: the turn's first blocker (any offer, an idle piece or cart, an empty queue with a sleeping worker asked first, an empty research plan), then a sleeping worker, the escorts, the guards, a sleeping settler, the campaign's dug-in pieces, the hunt's, and the marches asked again;
  3. research, the council, housekeeping, each until it has nothing more to do, once the loop has nothing; after one of them answers, the next decision asks the loop again first;
  4. the end.
- **The events, final**: `purse` (the seat's gold, faith or culture changed) opens spending, and opened it 357 times in the five final games; `copies` (the luxury copies the seat holds changed) opens diplomacy, 257 times. The `council` and `queue` events opened nothing in 3,000 sittings of the final shape, because the last three phases read the board after the loop has changed it, so they were taken out (the pins and seed 999's game were read again without them and did not move).
- **The loop's per-arm mark.** A mark that skipped a loop arm while the seat's pieces, towns, wars and cards stood as the arm had read them was built and measured: 5 skipped asks of each arm in five games, because almost every decision of the loop is a unit or town order. It was taken out. The per-piece marks the arms already keep (`called`, `roused`, `reasked`, `guardOrders`, `escortOrders`) ask each piece at most once a turn, except the campaign's stay answer.
- **What waits a turn**, by the end check of the final shape over the five seeds (3,000 sittings): 3 orders, 2 declarations of war (after the seat bought or moved soldiers in the sitting) and 1 disband. Accepted and listed.
- **Callers with no sitting** (tests, a puppet's pick) are asked every arm in the old order (`theOldPass`), which is also what the end check asks.

#### 3. Why research and the council come after the loop

Production at turn 100 and improvements started to turn 100, six seats summed (`ablation.py`):

| Order | 42 | 999 | 7 | 1 | 2026 | Sum of 42, 999, 7 | Sum of five |
|---|---:|---:|---:|---:|---:|---:|---:|
| stage A | 1,069 / 222 | 1,773 / 290 | 1,965 / 319 | 1,206 / 251 | 874 / 234 | 4,807 / 831 | 6,887 / 1,316 |
| all five phases before the loop | 806 / 219 | 1,093 / 269 | 1,662 / 299 | 787 / 216 | 766 / 209 | 3,561 / 787 | 5,114 / 1,212 |
| housekeeping after the loop | 799 / 210 | 1,044 / 278 | 1,569 / 283 | | | 3,412 / 771 | |
| the council after the loop | 1,167 / 222 | 1,788 / 336 | 1,399 / 300 | | | 4,354 / 858 | |
| research after the loop | 855 / 221 | 1,321 / 292 | 2,470 / 308 | 1,246 / 262 | 811 / 234 | 4,646 / 821 | 6,703 / 1,317 |
| research, council, housekeeping after (final) | 983 / 224 | 1,576 / 324 | 1,451 / 341 | 1,285 / 264 | 1,574 / 227 | 4,010 / 889 | 6,869 / 1,380 |

- With all five phases before the loop, production fell by 26% [−39%, −10%] and the improvements started by 8% [−14%, −2%], both on every seed. The end check found almost nothing waiting, so the cause is the order, not a waiting order.
- Moving housekeeping (the focus) after the loop changed nothing. Moving research, or the council, after the loop brought most of it back; moving all three brought both figures back to stage A's level over five seeds.
- **The cause is not proven.** The likeliest reading: the beeline's table (`techGoalTable`) and the council's stamps are the first expensive readers of the sitting's context, and five context memos hold a stand-in value while they are first read (the audit's finding 9, BP14's guards), so the arm that reads them first shapes the prices of the whole sitting. Asking those two after the loop puts the old first readers back. A second reading is that research goals and card seats chosen before the towns and pieces act are chosen on a board that has not yet moved this turn. The final tree's games are byte-identical to the variant tree's with the same order (all five digests).

#### 4. Five seeds to turn 100

Before is stage A's after games, after the stage B tree. Six seats summed. Paired is the geometric mean of the per-seed ratios with a 95% t interval.

| Figure | Before | After | After against before, paired | Per seed (42, 999, 1, 7, 2026) |
|---|---:|---:|---|---|
| Towns | 294 | 290 | −1% [−16%, +17%], 3 down, 2 up | 51→58, 66→58, 61→53, 67→65, 49→56 |
| Citizens | 1,717 | 1,731 | +0% [−13%, +15%], 2 down, 3 up | 300→285, 370→398, 364→307, 389→431, 294→310 |
| Food | 6,662 | 6,481 | −3% [−10%, +5%], 4 down, 1 up | 1,177→1,115, 1,481→1,583, 1,289→1,174, 1,615→1,526, 1,100→1,083 |
| Production | 6,887 | 6,869 | +3% [−32%, +57%], 3 down, 2 up | 1,069→983, 1,773→1,576, 1,206→1,285, 1,965→1,451, 874→1,574 |
| Gold | 3,087 | 2,949 | −7% [−48%, +65%], 3 down, 2 up | 446→452, 1,060→974, 512→236, 705→673, 364→614 |
| Science | 4,379 | 4,777 | +6% [−23%, +46%], 2 down, 3 up | 716→567, 1,120→1,126, 847→756, 830→1,271, 866→1,057 |
| Culture | 2,302 | 2,048 | −8% [−39%, +38%], 3 down, 2 up | 242→357, 685→489, 454→346, 455→324, 466→532 |
| Faith | 969 | 1,013 | +2% [−35%, +61%], 2 down, 3 up | 186→140, 246→162, 177→189, 158→236, 202→286 |
| Improvements started | 1,316 | 1,380 | +4% [−3%, +11%], 1 down, 4 up | 222→224, 290→324, 251→264, 319→341, 234→227 |
| Workers built | 440 | 456 | +3% [−2%, +10%], 1 down, 3 up | 76→76, 96→102, 84→82, 105→109, 79→87 |
| Workers taken (the wild and rivals) | 72 | 54 | **−24% [−38%, −8%]**, 5 down, 0 up | 8→7, 15→9, 17→12, 14→12, 18→14 |
| Soldiers lost to the wild | 232 | 243 | +4% [−16%, +28%], 3 down, 2 up | 58→53, 28→25, 59→56, 36→44, 51→65 |
| Deals proposed | 75 | 96 | +33% [−6%, +87%], 1 down, 4 up | 10→15, 25→23, 12→23, 14→19, 14→16 |
| Deals signed | 74 | 88 | +23% [−17%, +82%], 1 down, 4 up | 10→12, 25→21, 11→22, 14→18, 14→15 |
| Wars declared | 14 | 27 | +110% [−50%, +782%], 1 down, 4 up | 1→3, 1→5, 7→15, 5→3, 0→1 |
| Peace proposed | 21 | 40 | +156% [−68%, +1955%], 1 down, 4 up | 1→6, 1→8, 10→20, 9→4, 0→2 |
| Decisions | 27,297 | 29,098 | **+6% [+2%, +11%]**, 0 down, 5 up | 5,072→5,389, 5,602→6,035, 5,815→6,485, 5,763→5,989, 5,045→5,200 |
| Flip-back orders | 715 | 763 | +6% [−25%, +48%], 2 down, 3 up | 126→159, 160→111, 150→197, 124→152, 155→144 |

- **Neither worse nor better for the economy.** No yield moves with an interval that excludes nought. Workers taken fell on every seed. More swap papers go out in the sitting they become possible (the `copies` event), so deals rose on four seeds of five.
- **Wars rose** from 14 to 27, back to the 24 of the tree before stage A, most of it on seed 1 (7 to 15). Diplomacy is now asked first, before spending, as it was not in stage A (offers, arrears and spending came first). Five seeds cannot tell this from games parting.
- **Decisions a sitting** rose from 9.1 to 9.7: more papers, more marches.

**Asks per arm**, five seeds, turns 1 to 100 (stage A by the census, stage B by `phaseTally` in the end-check runs): all arms 179,933 → 132,386 (−26%). The phases' arms: `disband` 26,341 → 4,849, `spend` 26,314 → 4,804, `projectIdle` 11,016 → 3,849, `reaimBeeline` 4,689 → 3,346, `levy` 4,369 → 3,583, `retire` 4,365 → 3,849, `focus` 4,365 → 3,848, `diplomacy` 3,184 → 3,516 (the `copies` event). The loop's arms were asked 3% to 7% more, as the decisions rose.

#### 5. Seconds a turn

Stage A and stage B from stage A's snapshots, in one process, a turn each in rotation, three repeats. CPU seconds of the window, and the bot's own inside `nextBotDecision`. Load average 3 to 4.

| Window | Tree | Repeat 1 | Repeat 2 | Repeat 3 | Bot, repeats 1 to 3 | Decisions | Turn | Bot |
|---|---|---:|---:|---:|---|---:|---:|---:|
| 42, turns 90 to 100 | stage A | 10.39 | 7.74 | 6.66 | 7.95, 5.79, 5.08 | 1,061 | | |
| | stage B | 10.22 | 7.61 | 6.79 | 7.77, 5.71, 5.17 | 1,066 | −0.7% | −0.9% |
| 999, turns 90 to 100 | stage A | 14.88 | 12.66 | 10.86 | 11.61, 9.76, 8.32 | 1,086 | | |
| | stage B | 14.55 | 12.44 | 10.58 | 11.35, 9.41, 8.19 | 1,086 | −2.2% | −2.5% |
| 42, turns 120 to 125 | stage A | 12.78 | 8.91 | 8.37 | 9.78, 6.72, 6.32 | 876 | | |
| | stage B | 12.62 | 8.67 | 8.55 | 9.62, 6.48, 6.48 | 875 | −0.7% | −1.1% |
| 999, turns 120 to 125 | stage A | 17.89 | 13.70 | 13.36 | 13.70, 10.35, 10.16 | 773 | | |
| | stage B | 17.82 | 13.39 | 13.46 | 13.69, 10.14, 10.22 | 789 | −0.6% | −0.5% |

- **The gain is about 1% of a turn** (0.6% to 2.2%). The asks the phases skip were cheap ones after stage A's memos (the spend arm's kept "nothing to buy", diplomacy once a sitting) and BP15's kept readings (the beeline's table, the card stamps). What costs is read once a sitting either way: the context at the first decision, the beeline's first table, the council's first stamps, and the loop's unit arms. The last decision of a sitting still asks the loop's arms once, which the end of a sitting needs.
- Stage A replayed from its snapshots reached its stored digests (seed 42 `d3e86ffa:955881` at turn 100).

#### 6. What this means for parallel bots (stage C)

- **No phase reads only the seat's own empire.** All of them read the sitting's context (`valueContext`), which is built at the sitting's first decision from the whole board: the trade outlook prices pairs with any town on the board, the threat reading counts foreign pieces near the seat's towns, the war outlook reads every rival's army (`armyStrength`), and the hexes for sale near the seat's towns read their owners. Diplomacy reads every rival's army, towns, papers and wars, and its campaign road is a path search. Research reads a few facts of the whole game (any seat holding alchemy, the wonders register, the great-person roster) and the threat near the seat's towns. The council folds the seat's own empire, but cards whose scope counts foreign towns or routes read those. Housekeeping (the focus) reads the seat's own towns.
- **What the shape does give.** The first two phases come before any of the seat's own pieces move, so for them the only inputs that earlier seats' commands can change are the context's foreign readings, the live purchase gates and diplomacy's own readings. That is a short list that could be named and checked. The loop and the last three phases read the board after the seat's own pieces moved, which is where the path fields (`transitField`, `zocField`, swept over the whole board) and the hostiles near the seat's pieces come in.
- **Unchanged by the shape**: the shared unit id counter (a unit an earlier seat buys or a town it founds moves the ids this seat's own purchases would get, and later commands name those ids), and the per-seat tuning sheets (`setAiTuning`, module state of the main thread, which a worker would have to be sent).

#### Pins

`test/sim/aiDigest.slow.test.ts`, cut once: duel `973ac191:342552` -> `28801863:335754`, standard `604db3ce:1039518` -> `c0770657:1035266`. Neither board reported a warning or a stall. The digest file and `aiWants.slow.test.ts` were run again on the working tree with the new pins.

#### Checks

- Type check clean (`nice -n 15 npm run typecheck`).
- Narrow tests, all passed: `aiSittingPhases` (new, 4 tests), the brief's list (`aiBot`, `aiWar`, `aiDiplomacy`, `aiWorkerClaims`, `aiWorkerHold`, `aiWorkerGuards`, `aiWorkerHome`, `aiRouteMemo`, `aiDecisionMemo`, `aiEndCheckLoops`, `aiWants`, `verbs`, `test/mapgen/moduleCycles`, `test/ui/botWorker`), and every other core file that drives the bot (35 files, among them `aiCampHunt`, `aiBeelineTable`, `aiSittingStamps`, `aiSittingMemos`, `aiCommerce`, `aiDevotion`, `aiMagisterial`, `aiWager`, `aiPuppet`, `aiModuleCycles`, `empireYieldAtRest`, the deck files, `test/ui/spectatePage`, `test/ui/arenaPage`).
- Slow tier: `aiDigest.slow.test.ts` (the pins read off the stage B tree, then on the working tree), `aiWants.slow.test.ts`, and the stepper's pin against the driver (`aiDecision.slow.test.ts`, `aiDriver.slow.test.ts`) and `aiBot.slow.test.ts`.
- Tests brought up to date: `aiDecisionMemo` (the spend memo is asked once a sitting now, so its test opens the spending phase by hand), `aiBeelineTable` (the table is asked about once a sitting, so it is seldom kept), `aiEndCheckLoops` (the town's build is no longer the sitting's first decision), `aiBot` (the held-camp board re-sited to turn 14, and the register of bot files), `aiDiplomacy` (the closed phases replace stage A's flag).

#### Files

- `src/ai/sittingPhases.ts` (new, a leaf): the phases, the seat's print, the events, the tallies and the end check's switch.
- `src/ai/bot.ts`: `decideNext` hands a sitting to `phasedDecision`; `askPhase`, `theLoop`, `theOldPass`, `checkTheEnd`, `copyOfSitting`, `townAwaitsItsBuild`, `adoptionDecision`; `BotSitting.closed` (in place of stage A's diplomacy flag) and `BotSitting.print`.
- Tests: `test/sim/aiSittingPhases.test.ts` (new); `aiBot`, `aiDecisionMemo`, `aiBeelineTable`, `aiEndCheckLoops`, `aiDiplomacy`; the pins in `aiDigest.slow.test.ts`.
- `docs/bot-priorities.md` ("The order of a sitting", at the top), and this section.
- Scratch, in `bp16/`: `armcensus.ts` (with the logging copy `census2/`), `phaserun.ts`, `phasedebug.ts`, `camptest.ts`, `probeVar.ts` and `qVar.sh` (the ablation, on `var/`), `ablation.py`, `varcmp.py`, `samedigests.py`, the queues `qB1.sh` to `qB4.sh`, stage A's snapshots in `snapsA/`, the census in `out/census/`, the end checks in `out/check/`, the ablation games in `out/var-*/`, the first shape's games in `out/stageB-v1/`, and the final games in `out/stageB/` (with `PROBE.ts` and `NOTES.md`). The census, variant and stage A base trees (`census2/`, `var/`, `before/`) were removed; the stage A and stage B trees (`stageA/`, `stageB/`) are kept for stage C and will be removed at the end.

## BP16b-fix: the order fault, 2026-11-18

`docs/flags.md`, the section "Bots after BP16 stage B", item 2. The user: *"you're good to go with your recommendation for the bots optimization."* The claim to test: some memos that live for a sitting keep the value their first reader leaves, so the order of the arms changes prices. Stage B found that asking all five phases before the loop lowered production at turn 100 by 26% on five seeds (part 3 above). No knob, no data and no rule changed.

### Method

- **Trees.** The **base tree** is `a97cd1a0` (the head of `decks`, with the same bot as `f469e13a`, BP16 stage B). Seed 42 on it reached the stored digest of `/Users/jacky/code/webciv-baselines/f469e13a/six-seat-standard-t100/` (`4a516bc0:952535`). The **shadow tree** is the base with a throwaway check and two switches. The **exact-fix tree** is the base with the fix of part 4, the **smaller-fix tree** the base with the fix of part 5. Each is a scratch copy outside the repo.
- **The shadow check** (`memoShadow.ts`, scratch only). Every memo that lives for a sitting records the arm that filled it, the board revision and economy stamp, and the guards open. At each later read the value is computed again from nothing on the board as it is then, and the two are compared, once for each memo entry in each decision. While the fresh value is computed, every memo reads and writes a scratch store that is then dropped, so the fresh value is fresh all the way down and the real memos are not touched. With the check on, seeds 42 and 999 to turn 100 reached the stored digests, so the check changes no decision.
- **The order switch** (`BP_ORDER=allfirst`, scratch only). It asks the five phases before the loop in the first shape's order (research, diplomacy, the council, spending, housekeeping), with that shape's two extra events (`council`, `queue`). On the base tree it gave stage B's figures for that order exactly, on all five seeds (production / improvements started: 806 / 219, 1,093 / 269, 1,662 / 299, 787 / 216, 766 / 209).
- **The fresh mode** (`BP_FRESH=1`, scratch only). Every memo on a context, the two sitting memos and the plan's memo are dropped whenever the board revision moves, so no value outlives a command.
- **Probe and seeds.** The `f469e13a` baseline's `PROBE.ts`; six seats, standard map; seeds 42, 999, 7, 1 and 2026 to turn 100. `nice -n 15`, at most two of my game processes at once. Other agents loaded the machine (load average 4 to 42). Counts and yields do not depend on load.

### 1. The memos that live for a sitting

A sitting builds its context (`seatContext`, `bot.ts`) at its first decision and keeps it for the seat's whole turn. The memos keyed on a context therefore lived for the sitting, though most of their docblocks said "one decision". Every one of them reads the live board (`ctx.state`). The shadow read 52 of them; 30 gave a value that differed from a fresh one at least once.

| Memo | What it reads that a sitting's commands can change | Readers (arms) |
|---|---|---|
| `ratesOf` (`RATES_MEMO`, `prices.ts`) | every town's yields: a build, a focus, a seated card, a purchase | 12, among them the town's build, the council, the beeline |
| The card stamps (`SITTING_STAMPS`, `value.ts`, BP15) | the books with and without the card: anything on the economy clock | 8: slot, re-seat, adoption, the offers, the beeline |
| The chair reading (`SITTING_CHAIRS` and `CHAIR_WORTH_MEMO`, BP15) | the bench, the free chairs, the culture rate; and the **prices of the first context that asked**, shared with every other context of the sitting | 4 |
| A node's gifts (`NODE_MEMO`, `chain.ts`) | the town folds and the levy handed in by the first caller, and the memos above | the beeline, the research blocker |
| The improvement plan's memos (`memoOf`, `plan.ts`: seats, what a hex could hold, the landings, the renewals) | worked hexes, the research plan, the science rate; the plan itself and the town sheets also read pieces | 5 to 8 loop arms |
| `oneTownShare`, the scope counts (`scopeReach.ts`), `boardTempo`, `draftsAhead`, `faithPrice`, `growthShareWorth`, `explainCamp` and 10 smaller ones | towns, buildings, worked hexes, pools, rates | up to 10 |
| The guarded readings (`chairReading`, `handRuleWorth`, `widerFitWorth`, `faithPrice`, `malicePrice`) | as above; and a value filled while a stand-in was in place was kept outside it | 2 to 14 |
| The beeline's table (`BotSitting.beeline`, BP15) | the towns' folds, the levy, the commissions; kept while research stood still | the research blocker and the re-aim (handed back 0 times in these games) |

The 22 memos with no difference: the tech costs, the science price, the site ground, the derived contexts (one town, today), the levy outlook, piece and rite, the ground facts, the sight, the class share, the worked hex, the works forecast, the posture and eight readings of single cards.

Not order-dependent, by reading the code: the context's own fields (the book, the prices, the chains) and the seat's books are read at the sitting's first decision in every order; the guard plan, the threats to a worker's hex and the hunt's camps are first read by a loop arm in every order and read only by loop arms; the escort plan is keyed by the revision and its inputs; the spend memo and the next route are keyed by their inputs (stage A's shadow covers them).

### 2. The proof: kept values against fresh ones

Seeds 42 and 999, the final order, turns 1 to 100: 11,424 decisions, 405,448 checked reads, **3,585 differed** (1,694 and 1,891).

- **By cause.** The board's economy clock had moved since the fill: 2,529. The same board, but an inner memo the value was built on was stale: 639. Filled or read while a guard held its stand-in: 312. Only pieces had moved: 105 (the plan, the town sheets and what a hex could hold).
- **By memo** (checked reads, differing): `ratesOf` 5,698, 705 (12%); a node's gifts 17,386, 428; the card stamps 1,716, 397 (23%); the chair reading on a context 418, 381, of which 219 were reads of its own stand-in; the chair reading shared by the sitting 288, 239 (83%); `draftsAhead` 2,814, 182; what a hex could hold 94,035, 174; `oneTownShare` 8,890, 174; the landings 4,835, 168; the scope counts 24,638, 164; `boardTempo` 5,024, 160; `faithPrice` 7,039, 125.
- **By reader pair** (the arm that filled the memo, the arm that read it, differing of checked): `ratesOf`, a town's build, then the beeline: 233 of 526; the stamps, the re-seat, then the slot: 211 of 286; the sitting's chair reading, the context build, then the beeline: 164 of 164, and then a town's build: 46 of 46; `ratesOf`, an Order offer, then the beeline: 120 of 202; `draftsAhead`, an Order offer, then a town's build: 69 of 141.
- So the claim is true: a later arm read the value an earlier arm left, on a board that had moved since, and a fresh reading would have given another price.

### 3. Does it explain the 26%?

Production at turn 100 and improvements started to turn 100, six seats summed. "Kept" is the memos as they were; "fresh" is the fresh mode.

| Order, memos | 42 | 999 | 7 | 1 | 2026 | Sum |
|---|---:|---:|---:|---:|---:|---:|
| final, kept (the baseline) | 983 / 224 | 1,576 / 324 | 1,451 / 341 | 1,285 / 264 | 1,574 / 227 | 6,869 / 1,380 |
| all five first, kept | 806 / 219 | 1,093 / 269 | 1,662 / 299 | 787 / 216 | 766 / 209 | 5,114 / 1,212 |
| final, fresh | 1,096 / 222 | 1,988 / 332 | 1,597 / 287 | 744 / 237 | 1,009 / 232 | 6,434 / 1,310 |
| all five first, fresh | 854 / 204 | 1,273 / 323 | 2,164 / 309 | 720 / 212 | 637 / 198 | 5,648 / 1,246 |

All five first against the final order, paired (geometric mean of the per-seed ratios, 95% t interval):

| Memos | Production | Improvements started |
|---|---|---|
| kept | −28% [−52%, +7%], 4 of 5 down | **−12% [−19%, −3%]**, 5 of 5 down |
| fresh | −16% [−44%, +25%], 4 of 5 down | −6% [−16%, +5%], 4 of 5 down |

- **The memos explain part of it, not all.** With fresh memos the order still lowers production on four seeds of five, by 16%; neither that nor the 6% fewer improvements is clear of chance on five seeds. Fresh memos against kept ones, in either order, are not clear of chance either (final −10% [−43%, +39%], all first +4% [−17%, +30%]).
- The rest reads as the order itself: in the first shape research and the council choose before the loop has moved the board (stage B's second reading). Five seeds cannot prove that.
- **The exact fix of part 4 plays the fresh mode's games exactly**, so its figures for both orders are the fresh rows above. **With every memo fresh, all five phases first still lose production** (−16%, not clear of chance). The landed order stands (item 1 of the ruling), and its reason in `docs/bot-priorities.md` is corrected.

### 4. The exact fix and its cost

- **What it was** (`/Users/jacky/code/webciv-baselines/bp16fix/exact-fix.patch`): every memo on a context held a value for one stamp of the board's economy clock and for the guards open when it was read (`keptValue`, `keepValue`, `onContext`, `prices.ts`). The economy clock (`economyStamp`, `slate.ts`) moves with every write that changes the books, holdings or meters, and not with a step that moves only a piece (`COMMAND_CLOCKS`, `commands.ts`). A value read while a guarded reading gave its stand-in was handed back only inside that reading, BP14's rule for the decision's card prices. The five guarded readings kept their stand-in in a set of their own. The two sitting memos of BP15 went, and the beeline's table was kept under one stamp of the clock.
- **It was exact.** The shadow on the fixed tree (seed 42 to turn 100) checked 213,837 kept reads and found **none** that differed from a fresh reading, and its game was unchanged by the check. The fixed tree played the same games as the fresh mode, to the digest at turns 20, 50, 75 and 100: seeds 42, 999, 7, 1 and 2026 in the final order, and seeds 42 and 999 with all five phases first (the other three were stopped to save the machine's load).
- **Its play** is the "final, fresh" row of part 3: against the baseline no figure is clear of chance (production −10% [−43%, +39%], improvements started −5% [−15%, +6%]).
- **Its cost.** CPU a turn against the base tree, one process, the trees a turn each in rotation, three repeats:

| Window | Load | Exact fix | Without the forecasts (variant) |
|---|---|---|---|
| seed 42, turns 90 to 94 (the same play in both trees) | 4 to 5 | +7.9% (+5.5%, +9.5%, +10.0%); bot +9.2% | |
| seed 42, turns 90 to 94, again | 4 to 5 | +5.5% (+4.6%, +4.6%, +8.1%); bot +8.4% | +2.1% (+1.1%, +0.9%, +5.0%); bot +3.9% |
| seed 999, turns 90 to 94 (play parts at turn 90) | 3 to 6 | +4.7%; bot a decision +6.7% | +4.2%; bot a decision +5.0% |

- **Where the cost is.** A profile of seed 42, turns 90 to 95, and a count of the readings: the forecasts of a hand and a chair are read again after each command that moves the economy clock. The chair reading was taken 56 times against 25 in the base tree (it prices every card a hand can deal, inside its guard), the Doctrine offer 28 against 12, the wider fit 28 against 9, the foreign card 19 against 11 and the hand rules 7 against 3. Without them (the variant, with those seven readings kept as before) the rest still cost about 2% of a turn: the empire's rates (`ratesOf`), the open rows (`openRows`) and the plan's memos, each read again after a command. A value kept for the sitting was read once a sitting; a value kept for one stamp of the clock is read once for each stamp at which an arm asks for it. No smaller key is exact: what these readings fold moves with the economy clock.

### 5. The smaller fix and its cost

- **What it was** (`/Users/jacky/code/webciv-baselines/bp16fix/small-fix.patch`): the two cheapest corrections. A card's stamp was read on the economy clock in a sitting too (`stampReadingOf`, `value.ts`), so BP15's layer that kept the first stamp for the sitting (`SITTING_STAMPS`, `chairTakenByAnother`) went; 397 of 1,716 kept stamps were stale (part 2). The beeline's table was kept under one stamp of the economy clock (`techGoalTable`, `bot.ts`) in place of BP15's key of the seat's research; since stage B the table is asked about once a sitting, so it was handed back 0 times in these games either way. It corrects 2 of the 30 memos that gave stale reads.
- **Its play**, five seeds to turn 100 against the `f469e13a` baseline, six seats summed, paired (geometric mean of the per-seed ratios, 95% t interval). No figure is clear of chance.

| Figure | Before | After | After against before, paired | Per seed (42, 999, 1, 7, 2026) |
|---|---:|---:|---|---|
| Towns | 290 | 298 | +2% [−8%, +15%], 2 down, 3 up | 58→52, 58→65, 53→58, 65→68, 56→55 |
| Citizens | 1,731 | 1,709 | −1% [−6%, +4%], 3 down, 2 up | 285→272, 398→410, 307→314, 431→405, 310→308 |
| Food | 6,481 | 6,737 | +4% [−1%, +8%], 1 down, 4 up | 1,115→1,164, 1,583→1,686, 1,174→1,163, 1,526→1,630, 1,083→1,094 |
| Production | 6,869 | 6,761 | −5% [−34%, +37%], 3 down, 2 up | 983→1,123, 1,576→1,920, 1,285→744, 1,451→1,413, 1,574→1,561 |
| Gold | 2,949 | 3,029 | +5% [−17%, +33%], 2 down, 3 up | 452→388, 974→986, 236→337, 673→727, 614→591 |
| Science | 4,777 | 4,615 | −5% [−28%, +25%], 3 down, 2 up | 567→607, 1,126→1,472, 756→599, 1,271→979, 1,057→958 |
| Culture | 2,048 | 2,231 | +5% [−37%, +73%], 4 down, 1 up | 357→331, 489→474, 346→241, 324→669, 532→516 |
| Faith | 1,013 | 920 | −10% [−33%, +21%], 3 down, 2 up | 140→156, 162→176, 189→119, 236→193, 286→276 |
| Improvements started | 1,380 | 1,291 | −6% [−13%, +2%], 3 down, 1 up | 224→228, 324→299, 264→237, 341→300, 227→227 |
| Workers built | 456 | 432 | −5% [−12%, +3%], 4 down, 1 up | 76→78, 102→95, 82→78, 109→95, 87→86 |
| Soldiers lost to the wild | 243 | 260 | +10% [−10%, +35%], 0 down, 5 up | 53→54, 25→37, 56→57, 44→46, 65→66 |
| Deals signed | 88 | 78 | −12% [−28%, +8%], 3 down, 0 up | 12→10, 21→21, 22→15, 18→17, 15→15 |
| Wars declared | 27 | 22 | −24% [−54%, +24%], 3 down, 0 up | 3→3, 5→2, 15→14, 3→2, 1→1 |
| Decisions | 29,098 | 28,980 | −0% [−3%, +2%], 2 down, 3 up | 5,389→5,201, 6,035→6,064, 6,485→6,549, 5,989→5,936, 5,200→5,230 |

- **Its cost**, the same timer as part 4:
  - On the same play (a probe tree that plays as the base and also takes every fresh stamp a kept one was handed for, so its extra work is the smaller fix's and its games are the base's): seed 999, turns 90 to 100, **+1.8%** (+1.8%, +1.9%, +1.6%), the bot +3.8%; seed 42, turns 90 to 100, −1.8% (−3.4%, −3.7%, +2.4%), the bot −1.1%. Load 4 to 8.
  - The smaller fix itself, seed 42, turns 90 to 94 (the same play as the base): +1.1% (−1.2%, +8.7%, −3.8%) and +0.3% (−1.8%, 0.0%, +4.1%). Load 4 to 10.
- It would have cut the digest pins (duel `28801863:335754` -> `174e414b:362460`, standard `c0770657:1035266` -> `ba9dadf1:1059910`); the patch holds them.

### 6. The decision: found, measured, not shipped

The coordinator, 2026-11-18: do not ship a code change. The smaller fix corrects 2 of 30 memos, shows no play change clear of chance and costs up to 1.8% of a turn on one seed; the exact fix costs 5% to 8%. So the stale reads are a speed trade kept for now, on the record: about 0.9% of the kept reads of a sitting's context memos differ from a fresh reading (part 2). The landed order of a sitting stands, and `docs/bot-priorities.md` now gives the corrected reason for it and this trade.

- The two patches and the smaller fix's five games (with `PROBE.ts` and `NOTES.md`) are in `/Users/jacky/code/webciv-baselines/bp16fix/`, with a README. Both patches apply to `a97cd1a0`; the files they touch are the same on `d2004dd2`.

### What a sitting reads of other seats

For stage C (parallel bots from a frozen copy of the board). The context is built at the sitting's first decision. What it reads of other seats there is fixed for the sitting: the trade outlook (`routeOutlook`, pairs with any town on the board), the threat near the seat's towns (`threatLevel`), the sighted camps and hostiles (`sightedThreat`), the war outlook (`warOutlook`: rivals' armies by `armyStrength`, the war-loss lists) and the hexes for sale near the seat's towns. Read later in the sitting:

- **Diplomacy** (first, and opened again by the `copies` event): `diplomacyDecision` reads rivals' armies, towns, wars, the papers on the table and other seats' luxury copies, and the campaign road (a path search).
- **Spending**: `nextRouteOffer` reads the trade outlook again after a hire.
- **The loop's unit arms**: `nearestHostile`, `rangedFriendReady` and `previewCombat` (every piece in range), the zone and transit fields (`zocField`, `transitField`, every piece), `civilianDanger`, `workerThreat` and the guard plan, the escort plan, `huntCamps` and `explainCamp` (the camps and the wild's pieces), the campaign (`campaignPlan`, `campaignTarget`, `musterHex`: enemy towns and armies), the settlers' sites (`foundingErrorAt`: borders and pieces on a hex), and the trader (`routeOutlook`, `startRouteError`: foreign towns).
- **A town's build** (`cityCommand`): the campaign posture (`campaignPosture`: rivals' armies and wars) and the wonders register (a wonder another seat has finished is refused).
- **Research**: `opusOpen` (any seat holding alchemy), the wonders register, the great-person roster, the race (a rival's rod).
- **The council**: cards whose scope counts foreign towns or routes (`scopeReach.ts`), the follower beliefs in towns abroad (`followerLinesInOneTown`), the census.
- **The memos on the context** keep these readings for the sitting from their first read (part 1).
- Unchanged from stage B: the shared unit id counter and the per-seat tuning sheets.

### Pins

Not cut: no code changed. `test/sim/aiDigest.slow.test.ts` passes with the stage B pins (duel `28801863:335754`, standard `c0770657:1035266`).

### Checks

- After the revert, only `docs/bot-priorities.md` and this file differ from `decks`.
- Slow tier on the reverted worktree: `TEST_TIER=slow npx vitest run test/sim/aiDigest.slow.test.ts`, 2 tests passed with the stage B pins, exit 0.
- Type check clean (`nice -n 15 npm run typecheck`, exit 0).
- Before the revert, with the smaller fix in place: 59 core test files (1,484 tests, among them every test that reads the source of the changed files) passed, and so did `aiDigest.slow` with its cut pins and `aiWants.slow`.

### Files

- `docs/bot-priorities.md` ("The order of a sitting": the corrected reason, and the note on stale context memos), and this section. No source or test file changed.
- Kept outside the repo: `/Users/jacky/code/webciv-baselines/bp16fix/` (`README.md`, `exact-fix.patch`, `small-fix.patch`, `games/`).
- Scratch, in the session's scratch folder `bp16fix/`: the check (`shadow/src/ai/memoShadow.ts`, `patch_shadow.py`, `patch_shadowfix.py`, `shadowrun.ts`, `shadowtable.py`, `fixtable.py`, `readers.py`), the order switch (`patch_order.py`), the variant (`patch_v.py`), the smaller fix's builder (`patch_mini.py`), the timers (`pair2.ts`, `pair2.sh`, `timing.py`, `prof1.sh`, `profsum.py`, `patch_count.py`, `countrun.ts`), the tables (`abl.py`, `mktable.py`), and the games in `out/` (`shadow/`, `A1-allfirst/`, `F0-fresh-final/`, `F1-fresh-allfirst/`, `fix-allfirst/`, `after-fullfix/`, `after/`). The scratch trees (`base/`, `shadow/`, `fix/`, `fixorder/`, `shadowfix/`, `varV/`, `mini/`, `costprobe/`, `basecount/`, `fixcount/`) can be removed.

## Stage C: parallel bots from a frozen board, 2026-11-18

`docs/flags.md`, "Bots after BP16 stage B (2026-11-18)", item 3: *"Each bot decides from the board as it stood at the start of the turn's bot step, in its own worker. Results change once."* The work has two stages. C1 changes what the bots see, on one thread, so the play change is measured on its own. C2 puts the plans in workers. This section reports C1 and sketches C2.

### Method

- **Trees.** The **before tree** is `3e85400e` (the head of `decks`, which contains the world clock rule of `7847f279`), copied to the scratch folder `bp16c/before/`. Seeds 42 and 999 on it reached the stored digests of `/Users/jacky/code/webciv-baselines/7847f279/six-seat-standard-t130/` at turns 20, 50, 75, 100, 110, 120 and 130, and all five seeds reached the stored turn-100 digests with the new probe, so the baseline is valid for it. The **first C1 tree** (`bp16c/c1a/`) is the before tree with this stage's files as first built. The **final tree** (`bp16c/c1c/`, the worktree) adds the resumed sitting after a cut (part 2) and the corrected outcome tally (part 5).
- **Probe.** `bp16c/PROBE.ts`: the `7847f279` baseline's probe, with every key it records unchanged except that a command's decision is found by the command object (a plan's commands are decided on a copy before they land). Added a turn: the plan of each seat (planned, landed, cut), the frozen board's tally (refusals by kind and reason, cuts by reason, outcomes unlike the copy's), decisions asked on a copy and on the real state, the blows struck by real seats and what they left on the board, the warnings' text; and at the end a replay of the save. Six seats, standard map, seeds 42, 999, 1, 7 and 2026, to turn 100. The before games were played again with this probe.
- **Timings.** `bp16c/pair.ts`: BP14's pair timer, both trees from the same snapshot in one process, a turn each in rotation, three repeats, with the split of a frozen-board turn: the freeze, each seat's plan (from its first decision to the next seat's), the apply phase (from the first command put to the real game to the end, the turn's resolution included). Snapshots of the before tree at turns 90 and 120 of seeds 42 and 999 (`bp16c/snaps/`).
- **Load.** `nice -n 15`, at most two of my game processes at once. Other jobs loaded the machine heavily (load average 6 to 200). Counts and yields do not depend on load; each timing compares the two trees under the same load.

### 1. The rule as built

`src/ai/frozenBoard.ts` (new), `driveBots` (`driver.ts`) and the stepper (`stepper.ts`):

1. **Freeze.** When the turn's bot step begins, `freezeBoard` writes the muster roll's mark for the turn on the real state, then copies the state once (`structuredClone`) with the bot memories beside it.
2. **Plan.** Each bot seat runs its whole sitting on its own copy of the frozen board (`planSeat`). The loop is the live loop (`runSitting`, moved out of `driveSeat` unchanged, with its four guards), and its commands are applied to the copy with `applyCommand`. The plan is the list of accepted commands without the End Turn, each with the copy's new ids, the offer it chose from, what a march or a blow left, and the sitting's marks after it. The driver makes every plan before any command lands; the last seat takes the frozen copy itself. The stepper makes each plan when the seat's moment comes. A plan is a function of the frozen board and the seat, so the plans are the same (pinned: plans made in reverse order, and again after another seat's plan has landed, are the same).
3. **Apply.** The plans are put to the real game in seat order through `dispatch` (`applyNextStep`). A seat that an earlier seat knocked out is skipped.
4. **Cut and repair** (part 2): the plan stops at the first command that cannot mean on the real board what it meant on the copy. The seat finishes its turn with a live sitting (`driveSeat`, the code before this stage), which carries the plan's budget and the orders it landed (`SeatGuards`) and the plan's marks at its last landed command (`resumedSitting`, `bot.ts`: the pieces and towns already asked, the re-aims spent, the phases closed), and reads the board again.
5. **Memories.** After a seat's plan, its war windows and focus rows from its copy join the real state's (`mergeSeatMemory`); the refusal memory is banked as each answer lands; the muster mark was written at the freeze.
6. **End Turn.** A plan that ran to its end sends the End Turn and asks nothing more.
7. **Reports.** `SeatDriveReport` gains `planned`, `landed` and `cut`. A refused planned command is a **conflict**, not a bug: it is not warned about and not counted in `refused`. `frozenTally` counts landings, refusals, cuts and unlike outcomes; nothing reads it to decide.

### 2. The repair, and its counts

The candidates were: stop the plan at the first refusal and finish with a live sitting; skip only the refused command and those naming the same piece or town; or apply the plans command by command in turn. Counts, five seeds, turns 1 to 100 (3,000 seat-turns), the final tree:

| | Count | A turn of six seats |
|---|---:|---:|
| Plans cut | 143 (4.8% of seat-turns) | 0.29 |
| of them by a refusal | 55 | 0.11 |
| of them by an offer that differed | 87 | 0.17 |
| of them by a great person already called | 1 | |
| Planned commands | 25,855 | |
| dropped after a cut | 1,401 (5.4%) | |
| sent by the live sittings after a cut | 1,371 | |
| Decisions asked on the real board (live) | 1,514 of 30,369 (5.0%) | |

- **Refusals are rare.** By reason: a target gone ("Nothing to attack on", 18; "No unit with id", 3), a hex taken ("cannot stop on", 14), a peace made earlier in the step ("You are not at war", 11; "their land is closed", 1), a friend with no movement to trade places (3), a civilian that another seat's piece now stands on, taken by walking onto it (2), a wonder another seat finished first (1), a luxury no longer there to lend (1), a route the purse could no longer pay (1). 20 of the 55 came after a march or a blow of the same plan had landed differently from the copy's (part 5).
- **Most cuts are offers.** An offer drawn during the sitting (a belief when a faith is founded, 40; a Doctrine when a government is adopted, 27; an Order after an Order, 12; a reroll, 4; a skip, 3; a great person, 1) is drawn from the state's random stream, which earlier seats have moved on the real board. The real offer is another hand, so the plan is cut before the choice and the live sitting chooses from the real hand.
- **A cut came halfway through its plan** on average (45% of the plan had landed). The live sittings sent about as many commands as the cuts dropped.
- **The live sitting starts from the plan's marks.** In the first build (`c1a`) it was a fresh sitting. In 2 of its 155 cuts it sent nothing: its first ask re-asked a piece the plan had already ordered, met the order already landed, and the driver's repeat guard stopped the seat (seed 2026, turn 70, seat 4: 7 planned commands dropped and none sent, and the one warning in those games). With the marks carried on, every live sitting of the final tree sent its commands, and there was no warning in the five games.
- **The simplest repair wins**: stop at the first problem and finish live. A skip-and-continue repair could save at most the live sittings' own cost (0.1 s to 1.2 s of bot time a turn, part 6) and would need a rule for which later commands depend on a refused one. A round-robin apply would make every plan depend on the others again, which is what the ruling removes.

### 3. The hazards, one by one

- **The readings of other seats** (the list "What a sitting reads of other seats" above): **read from the frozen copy**. That is the rule. A reading that is stale by the time the command lands shows up as a refusal or a cut.
- **The unit id counter: a real hazard, fixed.** Units, towns, deals and papers take ids from one counter. Every copy starts at the frozen counter, so two seats' copies hand out the same ids (pinned). The plan records how many ids each command handed out on the copy; the applier records how many the real state handed out, maps the copy's ids to the real ones, and rewrites every later command's `unitId`, `settlerUnitId`, `cityId`, `fromCityId`, `toCityId`, `dealId` and a peace paper's ceded towns, and the ids in the sitting's marks. Ids below the frozen counter name the same thing on both boards. An id with no mapping cuts the plan; a different count of new ids cuts it after the command (0 in five games). The log holds the real ids, and all five games' saves replayed to the same state.
- **Diplomacy within a turn.** A paper one bot sends another this turn is answered at the receiver's next sitting; papers stand until answered (no rule reads `DealProposal.turn`), so nothing is lost. A person's paper is answered at once by the audience (`answerAudience`, unchanged), and a paper still standing is on the frozen board, so the bot's plan answers it in the same turn (pinned). An answer to a paper that is no longer good is refused and cuts the plan (1 in five games).
- **War declared this turn by an earlier seat.** The seat it names does not see it until its next sitting, unless its plan is cut: its soldiers do not answer the declaration in the same turn. A command the new war makes illegal is refused and cuts the plan, and the live sitting sees the war. A peace made earlier in the step (a seat answering the other's standing peace paper) turns a planned blow into a refusal (11 in five games), and the plan is cut there. Wars declared: 20 before, 24 after.
- **The tuning sheets.** On one thread the module's sheets are the same for every plan, so C1 needs no change. For C2 a worker must be sent the page's sheet and each planned seat's sheet (`aiTuning()`, `aiTuning({ playerId })`) and install them around the plan (`withAiTuning`); part 8.
- **Memos keyed on the state.** A copy is a new key, so every reading a sitting builds on its copy starts cold. Nothing leaks between copies or into the real state: every memo on a board is a `WeakMap` keyed on the state, the map or a context; the two string-to-number tables (`INPUT_CODES` in `bot.ts`, `TYPE_CODES` in `routeMemo.ts`) are read for equality only; the decision memo's counters are compared within one context. The cold memos cost little (part 6: the bot's own time is about the same).
- **The random stream.** No bot decision draws from it (pinned by `aiBot.test.ts`). The commands the bots send do: a blow's roll (`combat.ts`), a ruin's discovery (`discoveries.ts`), a great person's hand and its redraw (`greatPeople.ts`), an Order or Doctrine draft and a reroll (`statecraft/draft.ts`), a faith's name (`religion.ts`), a consecration (`cities.ts`) and a card that musters a piece (`statecraft/evaluator.ts`). Every copy starts at the same point of the stream, so two seats' copies draw the same numbers; those draws stay on the copies, which are dropped. The real state draws when a command lands, in the fixed seat order, so the log does not depend on the order in which the plans were made. Where a copy's draw shaped a later command, the applier checks it: an offer is compared before a choice, and a march or a blow that left a different board is counted.
- **The one refusal that changes the state** (`chooseGreatPerson` when another seat called the name first) is asked of the rule before the command is sent, so the applier never sends it; the plan is cut (1 in five games, pinned) and the live sitting calls from the real hand. A known gap, not new: when a live sitting finds every name of its hand spent, the bot sends a pick to make the reducer redraw (`greatPersonDecision`), and the log does not hold that refusal, so such a save would not replay. That path is the same before and after this stage.

### 4. Play, five seeds to turn 100

Before is the before tree, after the final tree, both with this probe. Six seats summed. Paired is the geometric mean of the per-seed ratios with a 95% t interval.

| Figure | Before | After | After against before, paired | Per seed (42, 999, 1, 7, 2026) |
|---|---:|---:|---|---|
| Towns | 340 | 307 | −10% [−19%, +1%], 4 down, 0 up | 65→52, 67→61, 56→54, 88→76, 64→64 |
| Citizens | 1,684 | 1,749 | +4% [−14%, +26%], 2 down, 3 up | 331→287, 420→406, 316→329, 326→342, 291→385 |
| Food | 6,160 | 7,290 | +20% [−6%, +54%], 0 down, 5 up | 1,357→1,367, 1,760→1,871, 1,078→1,319, 1,054→1,212, 911→1,521 |
| Production | 5,993 | 8,168 | +29% [−5%, +76%], 0 down, 5 up | 1,011→1,049, 1,836→2,424, 709→964, 1,022→1,051, 1,415→2,680 |
| Gold | 2,582 | 3,058 | +11% [−24%, +61%], 3 down, 2 up | 488→479, 898→1,173, 278→269, 468→367, 450→770 |
| Science | 4,092 | 4,984 | +18% [−14%, +62%], 1 down, 4 up | 615→676, 1,155→1,401, 800→729, 759→808, 763→1,370 |
| Culture | 2,005 | 2,638 | +26% [−16%, +89%], 0 down, 5 up | 303→347, 617→724, 310→330, 400→401, 375→836 |
| Faith | 911 | 1,086 | +19% [−19%, +74%], 1 down, 4 up | 140→233, 250→305, 178→131, 117→166, 226→251 |
| Techs known | 740 | 764 | **+3% [+0%, +6%]**, 0 down, 5 up | 128→136, 162→171, 146→147, 150→152, 154→158 |
| Units | 1,260 | 1,182 | −6% [−19%, +11%], 4 down, 1 up | 209→190, 329→278, 255→252, 260→223, 207→239 |
| Soldiers | 965 | 846 | −12% [−26%, +5%], 4 down, 1 up | 150→123, 245→185, 224→208, 197→167, 149→163 |
| Improvements started | 1,266 | 1,316 | +4% [−1%, +9%], 1 down, 4 up | 216→214, 320→322, 235→255, 249→260, 246→265 |
| Workers built | 419 | 426 | +1% [−3%, +6%], 1 down, 4 up | 71→68, 100→101, 79→81, 81→86, 88→90 |
| Workers taken (the wild and rivals) | 43 | 41 | −13% [−53%, +59%], 3 down, 2 up | 6→3, 7→6, 8→13, 10→12, 12→7 |
| Units lost to the wild | 450 | 442 | +1% [−19%, +25%], 2 down, 3 up | 71→87, 60→67, 115→107, 83→87, 121→94 |
| Deals signed | 91 | 98 | +9% [−3%, +22%], 1 down, 4 up | 13→15, 27→29, 22→21, 14→17, 15→16 |
| Wars declared | 20 | 24 | −20% [−48%, +22%], 2 down, 1 up | 1→1, 5→3, 11→11, 3→2, 0→7 |
| Peace proposed | 33 | 40 | −13% [−33%, +14%], 2 down, 1 up | 2→2, 7→5, 20→16, 4→4, 0→13 |
| March orders | 11,096 | 10,349 | −8% [−23%, +11%], 3 down, 2 up | 2,047→1,499, 1,995→2,108, 2,521→2,629, 2,513→2,199, 2,020→1,914 |
| Decisions | 29,634 | 30,369 | +2% [−10%, +15%], 2 down, 3 up | 5,355→4,712, 6,056→6,557, 6,319→7,138, 6,388→6,140, 5,516→5,822 |

- **No yield is worse clear of chance.** The one figure clear of chance is a gain: techs known +3% on all five seeds. Food, production and culture rose on all five seeds, not clear of chance.
- **Towns fell on four seeds of five** (−10%, the interval's top at +1%): close to clear, and the one figure to watch. A likely reading, not proven: a seat chooses its settlers' sites without seeing the towns other seats found in the same step, so a march goes on toward a site that has just become worse or illegal. No `foundCity` was refused in the final games (1 in `c1a`), so the loss is more likely in the marches than in the foundings. Not tuned: the brief says to report first.
- **Decisions a sitting**: 9.9 before, 10.1 after.
- **The first tree** (`c1a`, five seeds to turn 130 with the first probe) gave the same picture: at turn 100 no interval excluded nought (production +14%, science +16%, towns −4%); at turn 130 none either (production −15% [−35%, +11%], towns −3%).

### 5. Fighting

| Figure, five seeds, turns 1 to 100 | Before | After |
|---|---:|---:|
| Blows struck by seats (landed) | 1,969 | 1,889 |
| of them on a town | 55 | 53 |
| Blows on a piece that left no enemy on the hex, a share of blows on pieces | 27% (518) | 27% (488) |
| Attackers lost in their own blow | 7 | 6 |
| Towns taken by force | 1 | 2 |
| Planned blows refused (target gone 18, war already over 11, attacker gone 2, a civilian to take by walking 2) | | 33 (1.7% of blows) |
| Planned marches refused (hex taken 14, friend without movement 3, piece gone 1, closed land 1) | | 19 (0.2% of marches) |
| Blows that landed and left another board than the copy's | | 65 (3.4%) |
| Marches that landed and stopped elsewhere than on the copy | | 29 (0.3%) |
| Units lost to the wild | 450 | 442 |

- **Armies are not visibly worse at fighting.** The share of blows that clear a hex and the attackers lost in their own blow did not move. Collisions are a small share: 1.7% of planned blows were refused and 3.4% of blows came out differently from the copy's, and every refusal cut its plan so the live sitting gave the seat's remaining pieces their orders on the real board. Soldiers at turn 100 fell 12% (4 seeds of 5, not clear of chance); fewer towns would explain some of it.
- The blow print (`outcomePrint`) replaced a first tally that read `CommandResult.combats`, which an ordinary blow does not carry (`applyAttack` reports only a plunder).

### 6. Seconds a turn

CPU seconds of the window, the two trees from the same before snapshot in one process, a turn each in rotation, three repeats. The play parts after the first turn, so the windows compare the same turns of two games. "C2 estimate" is the freeze, the slowest seat's plan, and the apply phase, summed over the window.

| Window | Load | Before, repeats 1 to 3 | C1, repeats 1 to 3 | C1 against before | Decisions | C2 estimate, against before |
|---|---|---|---|---|---|---|
| 42, turns 90 to 100 | 10 to 60 | 20.95, 15.16, 14.24 | 22.14, 16.80, 15.86 | +9.3% | 1,076, 1,100 | 51%, 57%, 57% |
| 999, turns 90 to 100 | 41 to 116 | 116.23, 62.50, 52.68 | 126.30, 64.39, 56.80 | +6.5% | 1,347, 1,376 | 53%, 50%, 51% |
| 42, turns 120 to 125 | 22 to 116 | 53.57, 36.79, 40.20 | 54.30, 36.48, 39.79 | −0.2% | 702, 719 | 63%, 63%, 62% |
| 999, turns 120 to 125 | 22 to 77 | 69.27, 55.79, 28.20 | 82.32, 65.46, 32.14 | +16.7% | 1,112, 1,223 | 67%, 65%, 64% |

- **C1 costs about 0% to 17% more a turn, about 8% on average.** The bot's own CPU is about the same per decision (the cold memos on a copy cost little); the extra is the copies (one freeze and five more clones a turn, about 8 ms each at turn 120 on a quiet machine, `clonecost.ts`) and the reducer running every command twice, once on the copy and once on the real board. Seed 999 at turns 120 to 125 is the dearest window: its after game made 10% more decisions and spent 2.8 s to 7.3 s of bot time in live sittings after cuts.
- The first tree (`c1a`) on seed 42, turns 90 to 100, at load 14 to 23: +8.9%, the same as the final tree.
- **The split of a C1 turn**, seed 999, turns 90 to 100, repeat 3: the freeze 0.52 s, the plans 41.49 s, the apply phase 14.78 s (every command on the real board, the live sittings with 2.89 s of bot time, and the turn's resolution). The slowest seat's plan, summed over the turns, was 11.55 s, 28% of the plans.
- **A cheaper copy** was measured and not built: copying the tiles by spread (every `Tile` field is a primitive) and the rest by `structuredClone` cost 63% of a full `structuredClone` (`clonecost2.ts`). It would save about 1% of a turn.

### 7. Pins and tests

- **Pins.** Not cut by this stage: the coordinator runs the gate. Both digests in `test/sim/aiDigest.slow.test.ts` (duel `2fa80e05:339704`, standard `040c052c:1045966`) will **move**: from turn 1 every seat after the first decides on the frozen board, not on the board the earlier seats left, so a six-seat game parts at once (seed 42's turn-100 digest moved from `e0494721:951439` to `a23917a1:949123`).
- **Tests written first and run while building**: `test/sim/aiFrozenBoard.test.ts` (new, 7 tests: the frozen property, the same hex, new ids and the replay, a person's paper answered in the same turn, a great person already called, a cut plan leaving no piece without orders, the stepper and the driver on a short game), `test/sim/aiDriverEliminated.test.ts` (3, reworked) and `test/sim/aiDriverRepeat.test.ts` (5); all passed.
- **The closing sweep was left to the coordinator** (the user's word): every file that plays bots or reads the bot's sources (listed in the hand-back), and the slow tier.

### 8. Stage C2: the plans in workers (a sketch, not built)

The plans are the only part that moves. The freeze, the apply, the cuts, the live sittings and the memory merge stay on one thread as built, so C2 gives the C1 log byte for byte when every plan is the same.

- **A planner, handed to the driver.** `driveBots` takes the plans from a planner: `plan(board, seats) → SeatPlan[]`. The planner of C1 is the loop as built (in-process, in seat order). A worker planner sends the work out and waits. The driver becomes `driveBotsAsync(game, options & { planner })` for the callers that have workers; the synchronous `driveBots` stays for the tests and for one core.
- **What goes to a worker**: the frozen state (the `postMessage` structured clone; nothing else is needed, since every plan starts from a copy of it), the bot memories (`HarnessMemory`), the frozen id counter, the seats this worker plans, and the tuning sheets: the page's and each of those seats' own (`aiTuning()`, `aiTuning({ playerId })`), which the worker installs around the plans and clears after.
- **What comes back**: each seat's `SeatPlan` as plain data: the steps (command, new ids, offer print, outcome print, the sitting's marks), the decisions with their candidates and terms (what the spectator prints; a flag can leave them out for the headless driver, where they are most of the message), the copy's memories, and the warnings as text, which the main thread says in seat order so that they do not depend on which worker answered first.
- **How many workers**: `min(seats, cap)`, with the cap at `navigator.hardwareConcurrency − 2` in a browser (the page and the coordinating worker keep one core each) and `os.availableParallelism() − 1` in a node script, and never above six. With one core, or no `Worker`, the planner is the in-process loop, which is C1 exactly. A worker plans its seats one after another, each on its own copy, so fewer workers than seats gives the same plans. Workers live across turns.
- **The browser.** Today the page sends its state to one bot worker, which runs `driveBots` on its copy, and the page puts the same commands to its own state (`replayBotAttempts`). In C2 that worker coordinates: it freezes its copy, hands the plans to a pool of plan workers it owns, applies the plans and the live sittings to its copy as now, and the page replays the attempts as now. The page's own work and the audience are unchanged.
- **The headless driver** (tests, the arena, the probe): the arena and the tuner already run one game a core, so they keep the in-process planner. A test pins that a worker planner (a fake one, through `structuredClone`, as `botWorker.test.ts` fakes the bot worker) gives the same log and digest as the in-process one, with the replies taken in seat order, in reverse and shuffled, and that a worker that has planned other seats first gives the same plan as a fresh one.
- **The spectator** keeps the stepper, which plans each seat when its moment comes; it can ask the pool for all plans at the freeze.
- **Expected speed-up** for six seats on six workers: the freeze, the slowest seat's plan, the apply phase and the messages. From part 6 the estimate is 50% to 57% of today's turn at turns 90 to 100 and 62% to 67% at turns 120 to 125, so **about 1.8× to 2× faster at turns 90 to 100 and 1.5× to 1.6× at turns 120 to 125**, before the messages (one structured clone of the state to each worker, 1% to 2% of a turn). Late in the game one seat's plan is often half of all the planning (seed 42, turns 120 to 125), and the apply phase, most of it the turn's resolution, is a quarter to a third of a turn. The next gains after C2 are there: the resolution, the slowest seat, and the 5% of plans that are cut (per-seat random streams would remove most offer cuts, but that is a rules change).

### Files

- `src/ai/frozenBoard.ts` (new): the guards of one seat's loop and the loop (`SeatGuards`, `runSitting`, moved from `driver.ts`), the frozen board (`freezeBoard`), the plan (`planSeat`), the applier (`startPlanRun`, `applyNextStep`, the id mapping, the offer and great-person checks, the outcome tally), the live sitting after a cut (`liveSittingAfter`), the memory merge (`mergeSeatMemory`) and the tally (`frozenTally`).
- `src/ai/bot.ts`: `SittingMarks`, `sittingMarks` and `resumedSitting` (a sitting's marks as plain data, and a fresh sitting that carries them).
- `src/ai/driver.ts`: `driveBots` freezes, plans every seat, and puts the plans in seat order; `driveSeat` is the live sitting and takes the plan's guards and sitting; `SeatDriveReport` gains `planned`, `landed` and `cut`; the guard helpers are re-exported by name.
- `src/ai/stepper.ts`: the same, a command a step; a seat is planned when its moment comes.
- `src/ai/harnessMemory.ts`, `src/ui/bot.worker.ts`: docblocks only.
- Tests: `test/sim/aiFrozenBoard.test.ts` (new); `test/sim/aiDriverEliminated.test.ts` (a seat is knocked out on the real board through the driver's `attempt` hook and between the stepper's steps, since a policy now acts on a copy); `test/sim/aiBot.test.ts` (the register of bot files lists `frozenBoard.ts`).
- `docs/bot-priorities.md` ("The turn's bot step: plans on a frozen board", new, above "The order of a sitting"), and this section.
- Scratch, in the session's scratch folder `bp16c/`: the trees (`before/`, `c1a/`, `c1b/`, `c1c/`), the probe (`PROBE.ts`, `run.sh`), the snapshot maker (`play.ts`, `snap.sh`, `snaps/`), the timer (`pair.ts`, `pair.sh`, `timings.sh`, `timing.py`, `out/timing/`), the copy measurements (`clonecost.ts`, `clonecost2.ts`), the table (`c1table.py`), a quick game (`quick.ts`), a debug script (`debug1.ts`), and the games: `out/c1/` (the before and final games to turn 100) and `out/c1old/` (the before and `c1a` games to turn 130, with the first probe).

## One turn runner for the game, arena and spectator

The game and arena finish one pass of `runBotTurn`. The spectator advances the same pass one command at a time. Each seat still plans against a copy of the board from the start of the pass. The game prepares all plans before applying the first one. The spectator prepares one plan at a time so its first step can display promptly. The spectator keeps each decision's original explanation and candidate scores.

A planning copy can give a newly founded city a different id from the real board. The game already mapped that id when it dispatched the command. The spectator now shows the mapped id in the command details. A regression test checks the actual command and the entire explanation.

### Before and after

The comparison used the original bot code at `9aa47a2c`. Both runs used a duel map and barbarians. The six seats used balanced, wide, warmonger, tall, zealot, and balanced, in that order. Each run compared driver attempts and their results, accepted-command reports, per-seat reports, command logs, and final states. It also compared the spectator's candidates, scores, reasons, focus, and turn labels.

| Seed | Turns | Attempts | Scored decisions | Candidates | Plan conflicts | Displayed ids corrected |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 20260831 | 24 | 340 | 196 | 1,426 | 0 | 6 |
| 42 | 50 | 1,323 | 1,023 | 5,975 | 4 | 21 |

Every comparison matched byte for byte apart from the corrected ids in the spectator's command details. All 1,663 spectator commands matched their corresponding driver attempts on the new code. The second game included a refused founding command and three conflicting offers. Neither run produced a bot warning.

A Chromium check also exercised the spectator page. Next action added one decision.
The expanded row showed the chosen score, nested terms, and command JSON. Play
turn advanced to turn 2, and Next action added the next decision.

Typecheck, all 12,073 core tests in 520 files, and the production build passed
with the Council layout from `99854d70`. Both 120-turn bot digests kept their
original values. The six slow decision and spectator tests also passed.

## Parallel bot planning in the game, 2026-11-19

The game worker now hands frozen-board plans to a pool of seat workers. The coordinator still resolves conflicts, runs any remaining live decisions and applies commands in the original seat order. If a worker fails, the coordinator discards the group and plans from the same frozen board before it dispatches a command. One bot seat or a browser without usable nested workers uses the existing serial planner. The arena and tuner already run several whole games at once. They keep that allocation.

A seat worker receives the global and per-seat tuning. Its reply to the ordinary game omits the card scores and candidate explanations that only the spectator displays. The spectator uses the same command runner and still gets the full decision at each step.

**Browser parity.** Chromium 156 and native WebKit each handled 15 nested requests for five bot seats over three turns. The comparisons included attempted and accepted commands, the command log, bot memory and the saved game state before and after turn resolution. Every comparison matched. Core coverage also checks reversed and shuffled replies, incomplete replies, worker failure and timeout.

**Timing.** The first sample used six Node workers. On seed 42, two turns from the turn-90 snapshot took 9.93 seconds in serial and 9.03 with workers. Two turns from turn 120 took 12.84 seconds in serial and 16.22 with workers. The pool still returned full explanations. These short samples had concurrent load.

A second run used the browser pool through three Node workers with compact replies. Each pair started from the same Standard seed-42 snapshot. Execution order alternated. Times below are milliseconds for the whole bot step. Turn 90 includes first-use startup in one worker sample.

| Start | Four serial samples | Four worker samples |
|---|---|---|
| Turn 90 | 1188, 639, 588, 591 | 954, 582, 418, 352 |
| Turn 120 | 1194, 1168, 1075, 1032 | 885, 773, 747, 720 |

All eight pairs matched on state, logs, warnings and bot memories. Two additional three-turn games matched on save replay. The three-worker measurements favour parallel planning on these two boards. Opening turns can cost more than serial play, especially while the workers load, and the results do not establish a general late-game speedup on other machines. The reproduction notes are in `/private/tmp/webciv-c2-node-evidence/NOTES.md`.

## Preparing bots during the human turn, 2026-11-19

The game starts a private bot turn when play begins and after a turn resolves. It also schedules a fresh one after a group of human orders. The commands stay in the worker until the human passes the normal End Turn checks. A diplomatic audience takes priority. Suspending, loading or replacing the game cancels old replies before they can reach the board.

The game reuses a complete result or waits for a matching request that is still running. The check includes the game and state, turn, command log, revision, RNG, eligible seats, great-person offers, bot memory and tuning. A refused pick of a great person can change the hand without advancing either the log or RNG. The test includes that case. After a human changes a simulation input, the first implementation treats every seat as potentially affected and starts over on the updated board. It does not try to prove that a distant player's action was irrelevant to one seat.

On a fresh End Turn request, a nearly finished but stale calculation can finish briefly so the coordinator and seat workers stay warm. Its output is discarded. This wait uses the recent drive time and has an 80 ms limit. An audience or a game cancellation interrupts immediately.

**Browser measurements.** Chromium 156 and native WebKit each ran 12 scripted turns on a Duel map with one human and five bot seats, seed 42. Preparing during the human turn and planning only at End Turn produced identical attempts, logs, game states and bot memories. There were 168 commands in the final log. Rendering and human turn resolution were outside the timed section.

| State when End Turn was pressed | Chromium | Native WebKit |
|---|---:|---:|
| Matching result ready, two presses | 0.5 and 1.9 ms | 1 and 2 ms |
| Matching request still running | 30.7 and 53.3 ms | 49 and 57 ms |
| Human had just changed the board, old work still running | 71 and 91 ms | 84 and 101 ms |
| Same last case, on-demand control | 44 and 50 ms | 49 and 71 ms |

An initial implementation immediately closed the old worker on that last input. It took 184 to 212 ms in Chromium and 369 to 388 ms in WebKit. The bounded wait kept the warm pool for all four ordinary presses. A deliberately delayed stale response still triggered a restart after about 80 ms. The early-game measurements show the advantage when the player has given the worker time to finish, and the cost of acting just before End Turn. The scripts and raw results are in `/private/tmp/webciv-bp17-warm.5r3OAf`.

Typecheck, 12,101 core tests and the production build passed on the combined branch. Six slow tests covered the driver, worker and both original 120-turn final states.

## Research review frequency, 2026-11-19

The play build keeps its existing research review schedule. Two experiments checked whether a bot could skip the expensive review of its current research plan on some turns. Both still chose a plan immediately when a new one was required. The first allowed up to three turns between reviews. The second allowed two and checked for changes to each town's population and front production item.

Five six-seat Standard games used seeds 42, 999, 1, 7 and 2026. Each reached turn 100 and replayed without a stall or bot warning. The table sums all seats across the five games at turn 100.

| Measure | Existing schedule | Three-turn limit | Two-turn limit |
|---|---:|---:|---:|
| Towns | 307 | 338 | 299 |
| Citizens | 1,749 | 1,700 | 1,672 |
| Production per turn | 8,168 | 6,715 | 7,279 |
| Science per turn | 4,984 | 4,406 | 4,727 |
| Culture per turn | 2,638 | 2,197 | 2,814 |
| Known technologies, counted per seat | 764 | 768 | 755 |

With the two-turn limit, seeds 42, 7 and 2026 matched the existing final state exactly. On seed 999, production fell from 2,424 to 1,537. One seat accounted for most of the difference. It had 109 citizens against the original 122, and produced 193 against the original 1,051. The saved measurements do not identify a single decision that caused the decline.

A separate timing check used the same turn-90 snapshot on seed 42. It warmed each version for one turn, then timed four turns, reversing the order for the second pair. The existing version used 5.32 and 3.99 CPU seconds. The two-turn version used 5.17 and 4.19. Each made the same 411 decisions and ended in the same state. The two-turn version saved one of 29 research table builds in each run. The timing gave no repeatable gain to offset the risk to play. The two private versions are on `codex/bot-research-review`. The detailed results are in `/private/tmp/webciv-bp18-evidence/variants-report.md`.

## Council card prices, 2026-11-19

The candidate estimates every eligible card when a chair has more than three choices. It prices the top three on copies of the board. It also keeps close estimates, Commissions, seated cards, reusable exact prices, and cards whose meters or effects the estimate cannot capture well. A setting of zero prices every eligible card on copies of the board. The spectator distinguishes estimates from exact prices.

The same candidate also corrects the extra value previously given to flat production and science. It uses the same price for a hammer or beaker when comparing current and expected pay. A production bonus uses the actual item at the front of each town's queue to find what it pays now. An empty chair requires a positive score. Replacing an Order requires the challenger to beat the incumbent by the existing switch margin.

**Agreement on saved boards.** The first test ranked 387 chairs in 12 board states from seeds 42 and 999 around turns 90 and 120. Keeping only the top three estimates could miss The Pandects by over 250 score points. The second test called each of the three actual decision functions for each seat on those boards. Both sides used the same corrected prices, margin and floor. They differed only in whether the shortlist ran. For empty-chair checks, the test opened one chair if they were all full. Government checks used all governments in the current tier.

| Decision | Paired calls | Changed choices | Full board calculations, all cards | Full board calculations, shortlist |
|---|---:|---:|---:|---:|
| Fill an empty chair | 72 | 0 | 491 | 284 |
| Replace a seated card | 72 | 0 | 247 | 233 |
| Adopt a government | 72 | 0 | 1,014 | 911 |

The counts are new calculations. A cached price costs much less. The timings from this test overlap other work, so they cannot establish the saving on a whole turn. The source and records are in `/private/tmp/webciv-bp19.QaFgCX`.

**First changed action on seed 42.** The command log matched through turn 42. On turn 43, seat 2 previously replaced Salt Tithes, worth 10, with The Wayside Shrines, worth 10.66. The candidate kept Salt Tithes with both full pricing and the shortlist. Keeping the corrected prices and setting the switch margin to one restored that swap. A 6.6% gain is below the usual 10% margin. This check identifies that decision. Many later choices can contribute to the outcome of the game.

**Five games.** The play build and candidate each played the same five Standard maps with the same six seats. All ten games replayed without warnings or stalls. The table sums the six seats across all five games at turn 100.

| Measure | Play build | Candidate |
|---|---:|---:|
| Towns | 307 | 281 |
| Citizens | 1,749 | 1,630 |
| Food per turn | 7,290 | 5,681 |
| Production per turn | 8,168 | 7,025 |
| Science per turn | 4,984 | 5,150 |
| Known technologies, counted per seat | 764 | 762 |
| Orders seated | 422 | 420 |
| Orders unseated | 221 | 215 |

Food fell on four maps. Across the five paired seed ratios the geometric mean fell 22.4%, with a 95% interval between a 38.3% and a 2.3% decline. Production varied in both directions. Two original winners, on seeds 42 and 999, finished on turns 133 and 147. The candidate reached turn 150 without a winner on those maps. Seed 2026 kept the same winner and moved from turn 112 to 142. Seed 7 finished ten turns earlier with a different winner. On seed 1, the candidate won on turn 150 and the play build reached the limit without a winner. Only seed 1 had a turn-150 board from both versions. The complete paired checkpoints are in `/private/tmp/webciv-bp19-evidence/report.md`.

The combined policy stays on the private branch. Six fewer unseatings in five games and mixed progress toward victory do not justify the change. The single-variable timing test below holds the corrected prices, floor and margin fixed, so it measures only the cost of running the shortlist.

**Whole-turn timing.** Sixteen paired serial turns used turns 90 and 120 on seeds 42 and 999. Each pair started from the same board and bot memory after warmup. Measurement order alternated. Full pricing and shortlisting produced the same commands and final state in all 16 pairs.

| Measure over 16 turns | Full pricing | Shortlist |
|---|---:|---:|
| CPU seconds | 35.858 | 35.731 |
| Elapsed seconds | 30.853 | 30.662 |
| New board calculations | 672 | 636 |

The shortlist reduced aggregate CPU by 0.35% and elapsed time by 0.62%. Eight pairs used less CPU and nine finished sooner. All 36 avoided calculations came from checking replacements. The 160 empty-chair checks needed no new board calculation, and no government adoption occurred on those turns. The median elapsed difference by board ranged from 45 ms sooner to 11 ms later. These results give little reason to add a separate shortlist to the live bot. The traces and per-board samples are in `/private/tmp/webciv-bp19-controlled`.

In a separate test, all three decisions used less CPU when they needed fresh prices. Filling a chair saved 11.9%, replacing a seated card saved 3.5% and adoption saved 5.1%. Repeating each decision with the same bot memory needed no new board calculations under either rule. In that case shortlisting added a median 0.15 ms to adoption and had little effect on the other two decisions.

The private candidate passed typecheck, all 12,108 core tests, the production build and all four slow card-pricing checks. The play build keeps its previous Council rules and 120-turn reference results.

## Late-game parallel planning in the play build, 2026-11-19

Port 5199 served the local play checkout at `7f800de0` for this measurement. A separate test page built from that checkout ran the serial coordinator and the parallel coordinator in browser workers. Each sample restored the same Standard map and bot memory. Seat zero was human and the five other seats planned. Each parallel request received five successful nested-worker replies. The time below starts in the coordinator and ends after it applies the bot commands. It excludes rendering, human turn resolution and the trip back to the page.

| Map seed | Turn | WebKit serial | WebKit parallel | Chromium serial | Chromium parallel |
|---:|---:|---:|---:|---:|---:|
| 42 | 90 | 678 ms | 639 ms | 637 ms | 393 ms |
| 42 | 120 | 1,174 ms | 1,075 ms | 943 ms | 692 ms |
| 999 | 90 | 644 ms | 384 ms | 564 ms | 201 ms |
| 999 | 120 | 3,931 ms | 2,301 ms | 1,698 ms | 1,451 ms |

Each cell is the median of four warm runs. Each board had one earlier warmup, and the two modes took turns running first. All 32 measured pairs matched on attempted commands, acceptances, final state and bot memory. Parallel planning finished sooner in 13 of 16 WebKit pairs and all 16 Chromium pairs. Across the timed samples, WebKit used 28.5% less elapsed time and Chromium used 35.9% less. The first WebKit request, with a cold worker pool, took 2.26 seconds against 1.50 seconds in serial. These are repeated turns on two maps. They show the range a player can see with a late board on this laptop. The raw runs are in `/private/tmp/webciv-live-bots.crKOC9NR`.

The archived five-seed comparison of planning every seat from the same board also records settler captures. Accepted foundings dropped from 340 to 307 by turn 100. Recorded barbarian settler captures fell from 33 to 24 and no rival captures were observed. Those traces did not count new settlers or surviving settlers, so they leave open whether the bots produced fewer settlers or spent longer reaching a site. That comparison changed which board each seat saw. The worker scheduling comparisons use the same board for each seat.

## Reduce stalls at the start of a human turn, 2026-11-19

The player reports lag as a turn begins and asks to try staggering bot planning according to hardware. Give board drawing and input priority while the player can act. Keep preparation during the human turn. Use the ordinary End Turn path when the player is waiting. The schedule must preserve the snapshot checks, the order of commands and the spectator explanations. Compare the first frames, input delay and time left at End Turn. Measure a control with background preparation disabled to see how much comes from the board itself.

Background preparation now waits for the handover to announce the new turn. It then allows 650 ms for the opening camera movement, waits for a frame, and asks the browser for idle time. On browsers without an idle callback, it posts the snapshot in a timer after that frame. A group of human commands gets a 250 ms delay from the last command. It keeps the opening grace period if the player acts during it. A pending handover or End Turn defers the snapshot again. Hidden pages schedule fresh work when the player returns.

On fewer than eight reported logical cores, or with no core count, the coordinator plans background seats in sequence. On eight or more it uses up to two seat workers. A fresh foreground request can use the existing larger pool. End Turn reuses a matching background result, including one still running. These limits change scheduling only. Opening the game with `?botPrep=off` disables speculative work for that tab and keeps the normal End Turn path. This provides a control on the player's own machine.

At the same handover, the 3D renderer calls `skipAnimations` before starting the new movements. Check whether a turn with no active unit animation can use the normal redraw without an immediate duplicate rebuild. Keep the existing handling for hidden pieces, walking or falling meshes, and glows.

### Main-thread work with a finished bot plan

A separate native WebKit run used the release code and restored four Standard map snapshots with one human and five bots. The production worker prepared the bot commands. For each snapshot, seven warm repetitions applied that reply to a fresh copy, dispatched the human’s End Turn and sampled the Ledger. Every reply applied, advanced the turn and reached the same state on each repetition.

| Seed | Turn | Apply bot moves | Resolve End Turn | Sample Ledger | Combined median |
|---:|---:|---:|---:|---:|---:|
| 42 | 90 | 26 ms | 142 ms | 1 ms | 169 ms |
| 42 | 120 | 48 ms | 430 ms | 3 ms | 481 ms |
| 999 | 90 | 34 ms | 195 ms | 5 ms | 235 ms |
| 999 | 120 | 107 ms | 611 ms | 22 ms | 746 ms |

These are separate medians. The timers exclude rendering, reporting each action to the interface, autosave and the test’s snapshot copies. The pending Order on the second turn-120 board means a real player must first clear the draft or choose to proceed. After that, the same resolution runs on the page. The measured pause was mostly in the game rules even with bot planning complete. Raw timings are in `/private/tmp/webciv-main-turn.XazNRf/webkit.json`.

### Frame timing on a painted board

A native WebKit window panned the real 3D board for 1.25 seconds before pressing End Turn. The Standard map used seed 42 at turn 90, with 53 towns and 278 units. WebKit reported eight logical cores. The window was 1280 by 960 CSS pixels at device pixel ratio two. The coordinator and its pool were warm. Two runs used opposite orders for the four settings. Each reply contained 67 attempts. The accepted command log, final state and bot memory matched across settings.

| Preparation during play | Longest gap without a frame in the first 650 ms | Click to bot reply applied |
|---|---|---|
| Off | 84 ms, 64 ms | 3.49 s, 1.54 s |
| Previous five-worker start at 250 ms | 145 ms, 84 ms | 0.41 s, 2.29 s |
| Two workers starting at 250 ms | 111 ms, 103 ms | 1.13 s, 0.64 s |
| Two workers after the opening delay | 67 ms, 70 ms | 0.87 s, 0.95 s |

The last setting posted at 665 and 670 ms. The longest frame gaps later in the same 1.25 seconds were 187 and 98 ms for that setting. The off control delivered about 21 to 22 frames per second during the pan. A timer scheduled every 50 ms measured event-loop delay. Its pooled 95th percentile was 34 ms with preparation off, 41 ms with the old start, 45 ms with the early two-worker start and 28 ms with the delayed start. A long gap between frames can coexist with prompt input. Two runs of one board give a comparison for the opening window, with considerable variation in the overall frame rate and click wait. Raw samples are in `/private/tmp/webciv-turn-start.5zvdTbK1/webkit-t90-repeat.json`.

Five additional warm WebKit repetitions timed each of the 35 resolution phases on the two turn-120 boards. Collecting city yields took 163 and 237 ms, or 45% and 44% of the median reducer time. Barbarians took 59 and 86 ms (16% each). On seed 999, spending leftover movement took another 77 ms. The sums of the phases were within 1 ms of the whole command. The instrumented and ordinary games produced the same command result, log and final state.

A control on the previous play build (`7f800de0`) took 657 ms median for the End Turn reducer on seed 999, across four warm runs ranging from 507 to 890 ms. A comparable pause existed before the new Orders. The samples do not establish a speed difference between game versions. The next target for the pause is the per-city work in `collectYields`. Raw phase times are in `/private/tmp/webciv-turn-phases.N934MX/webkit.json`.

The yield collection phase includes recording deck totals, assigning citizens, pricing towns and banking their yields. The deck totals intentionally read the board before citizen reassignment. Time these separate steps before reusing any computed result. One specific candidate is `borderGrowth`. Collection needs the new border culture, but this read also computes the adjusted cost and time for the next tile. Another is reusing the list of standing empire yields when a card reads an empire rate from the same state. Neither saving has been measured.

Also count how many towns already fill every citizen slot from locked tiles or have enough citizens for every eligible tile. In either case the final set of tiles is known before scoring them. The assignment writer sorts selected tile indices into a stable order. Measure how many tile evaluations this would remove on early and late boards before changing the rule.

The combined scheduler, renderer and Order changes passed the typecheck, 12,153 core tests, production build and 13 slow tests for replay, bot parity, card pricing and religion. The scheduler and frame measurements above do not include any claimed saving from the renderer’s separate idle unit rebuild removal.

## Reuse technology paths during research review, 2026-11-19

A research review still considers the same goals every turn. Each seat checks how many prerequisites it lacks before it prices a goal. It now passes that same ordered list to the price calculation. A shared roster index breaks ties between technologies at the same depth. It includes charter technologies. Which prerequisites a player still needs is read from the current board.

The comparison used six seats on each of five Standard maps after ten turns (seeds 42, 999, 1, 7 and 2026), plus four archived turn-90 and turn-120 boards from the first two seeds. All 54 research tables matched in full, including all 1,980 candidate scores and explanations. Every ordered prerequisite list matched. Both 120-turn replay tests also kept their published final states.

The isolated path check ran ten sweeps of all goals for all six seats per board, six times after warmup, alternating the two versions. Summing median process CPU time over the nine boards gave 256 ms before and 91 ms after. These times cover only the prerequisite lists. They exclude scoring the goals and the rest of the bot turn.

## Settlement advice on turn 73, 21 November

Opening the settler lens ranks sites on the player's chart. The renderer and hover panel reuse that list until the game revision changes. On the archived turn 73 map, the first call in a fresh Node process took 10.8 ms. Across seven further copies of the same board it took 2.6 to 5.9 ms. Reading the same list again took at most 0.004 ms. Each of the eight lists matched a fresh calculation, including scores and order. These timings exclude browser rendering. Selecting a soldier with the settler lens closed does not ask for this list.

Worker advice uses the bot's improvement planner. The [turn 73 measurement](benchmarks/turn73-worker-advice-2026-11-21.md) records that cost separately.


## Combined bot and Age I play release, 22 November

The user requested the reviewed bot work and ready handoff items on port 5199.
The release uses save version 260 and is tagged `codex/age1-play-2026-11-22`.
The previous play build is tagged `codex/play-before-age1-2026-11-22`.

- Integrated charter improvement planning, repeatable unit actions and legal
  zero-damage captures; the Arena can select named leaders.
- Integrated shared faith-purchase budgeting and research-unlock reuse.
- Priced city defenses from local threats and let fortified ranged units fire.
  The optional army-growth and melee-screen settings retain neutral defaults.
- Added the seven approved Age I changes, Camp at Husbandry, raiders choosing
  reachable improvements before cities, and difficulty rules zero through five.
  The difficulty selector remains Claude's UI work; normal setup uses tier zero.
- Fixed an existing double count in the bot price of town-loss weariness relief.
  The actual happiness change now supplies its value, as for unit-loss relief.
  The new regression checks both kinds of loss.

Typecheck exited zero. The full suite passed all 618 files and 13,046 tests at
three workers. The production build exited zero, with the existing large-chunk
warning. Both fresh 120-turn games reported no warnings or stalls and their
saved command logs replayed exactly. Duel: 6,966 commands and
`4172463b:393230`. Standard: 7,293 commands and `64733584:1087655`.
The town-loss valuation correction changed neither log in these two games.
The 60-turn worker and page comparison also matched every command and state.

This is an integration and correctness result, not a new bot-strength or FPS
measurement. The science/Order forecast experiments and the settlement-water
trial remain separate. Rebase further strength comparisons on this new opening.
The newly approved wager redesign also stays separate until its score weights
and marks have been measured.

## Per-unit combat play release, 23 November

The user accepted the current bot strength and approved the combat changes
for playtesting. The integrated build enables `tactics.enabled: 1` with
`tactics.perUnit: 1` on the version 266 rules. Combat weights and economy
settings stay at their tested values. The original policy remains available
through `tactics.enabled: 0`.

The [release record](../audit/bot-play-release-2026-11-23.md) contains the
integration details, validation results and remaining bot work. The rollback
tag `codex/play-before-combat-2026-11-23` preserves the previous play build
at `a033e91c`, which reads version 264 saves.

Typecheck, core tests, the full suite and the production build exited zero.
Core passed 575 files and 13,045 tests. The full suite passed 625 files and
13,217 tests. Both 120-turn games completed without warnings or stalls and
replayed exactly: duel `c86d21d1:430323`, standard `3c17801f:1173951`.
The full suite also confirmed identical spectator/driver and worker/page play.
