# Speed up the test suite

The user asked on 2026-11-19 for an Astra pass to speed up the test suite. The main delay is the feedback time for a settled game change. Find where the core suite spends its time and check the full before and after on the same machine. Keep the existing test commands, coverage, isolation and the rules that decide which checks belong in core and slow. Record timings, what changed and how the result was checked. Coordinate CPU-heavy runs with the release checks.

## Changes and focused timings

The first pass used commit `7f800de0`, Node 26.7.0 and Vitest 2.1.9. On this machine Node reports 10 available CPUs and 16 GiB of RAM. An earlier six-worker core run took 292.95 seconds and had six failed tests. Vitest reported 1,514 seconds in test bodies and 177 seconds in collection, summed across workers. A five-worker release run took 690.97 seconds and passed. Another nine-worker suite ran alongside it, so the two runs cannot establish a faster worker count.

- Three bot test files now play each repeated opening once per file. Each case gets its own state, config and command log. The helper copies all four kinds of bot memory through `readHarnessMemory` and `adoptHarnessMemory`, the same functions the bot worker uses. The three files avoid 19, 46 and 60 duplicate bot turns respectively. The shadow checks and the two independent games that compare command logs still run across their original turns.
- The Compendium test looks up each Doctrine in the book the file already built. On this commit it avoids 105 extra builds. Four were for named examples and 101 were for the check over all Doctrines with a deck.
- Two render tests compare typed-array views directly. They check the array type and all the bytes in the view. A failure reports the first differing byte. The ground test also checks the attribute order, mesh order and index.
- The existing runner already shares the module registry and the initial game fixtures within each fork. The two module-order tests still load every entry from a fresh registry. This pass changes no test command, worker count or tier.

The Compendium runs used the same command and process priority. Both passed all 29 tests.

| One-worker Compendium run | Before | After |
| --- | ---: | ---: |
| Test bodies | 10.51 s | 0.26 s |
| Whole command, as timed by Vitest | 14.45 s | 2.82 s |

`nice -n 15 npx vitest run --minWorkers=1 --maxWorkers=1 test/ui/compendiumDecks.test.ts`

The three bot files also passed in each run. The table shows time in each file's test bodies. Other jobs changed the CPU load between runs. The baseline ran at normal priority and the candidate at lower priority. The counts of avoided turns give the direct comparison.

| Test file | Before | After | Duplicate turns removed |
| --- | ---: | ---: | ---: |
| aiDecisionMemo | 107.61 s | 48.70 s | 19 |
| aiSittingPhases | 50.81 s | 8.97 s | 46 |
| aiSittingStamps | 26.17 s | 5.77 s | 60 |

The five-file check included the three bot files, `paintedGroundPaint` and `paintedGeometryBuild`. All 42 cases passed. Both render files passed with direct byte comparisons. The geometry change reached the large-mesh test during the first timing run, so these runs do not measure its saving. A separate regression test checks that changing one fixture copy leaves the next copy's state, log and bot memory intact. TypeScript passed with `npm run typecheck`.

## Whole core suite on the play release

The comparison used the same game code, npm command, six Vitest forks and process priority on the same 10-core, 16 GiB laptop. Both runs were on battery. The first used the original tests. The second used the test changes above and one additional fixture-isolation check. Neither run changed how the game builds its world or plays a turn.

| Measure | Original | Updated |
|---|---:|---:|
| Passed core tests | 12,153 in 530 files | 12,154 in 531 files |
| Elapsed time including npm startup | 375.92 s | 207.17 s |
| Process CPU time, user and system combined | 1,086.61 s | 912.39 s |
| Test-body time summed across the six edited test files | 176.2 s | 114.6 s |

The two wall times include considerable variation outside the edited tests. Of the unchanged files that took at least one second in the first run, the median took 54% as long in the second. The 169-second difference does not measure the effect of these changes alone. The matched Compendium check and the 125 avoided simulation turns give the clearest evidence of the actual saving. A separate earlier core run overlapped a nine-worker suite in another checkout and took 691 seconds. A full run per checkout can compete for the same machine.

The updated suite passed typecheck and the production build. Raw logs and process timing are in `/private/tmp/webciv-tuner-audit.yl81LvAm/suite-baseline.log` and `/private/tmp/webciv-tuner-audit.yl81LvAm/suite-candidate.log`.
