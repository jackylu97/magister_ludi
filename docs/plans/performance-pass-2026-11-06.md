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
