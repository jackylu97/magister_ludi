# End Turn city yields, November 19, 2026

Citizen assignment used less CPU time on both turn-120 boards. Checking for a food-conversion card before checking siege and interdict rules also reduced the work of banking food. The median paired change in wall time for the whole yield phase was 12 ms faster on seed 42 and 5 ms slower on seed 999. A separate WebKit test below measured the End Turn pause after applying the bot moves.

## Where the phase spends time

The starting point was the yield code in `2d7b503a`. The probe used the archived Standard snapshots for seeds 42 and 999 from the earlier WebKit run. They have 89 and 86 towns. Each run restored the board at the start of turn 120, recorded the deck totals and called `collectYields`. The earlier WebKit test also applied the bots’ moves before timing End Turn. The numbers below measure Node.js v26.7.0 on the restored boards and exclude bot planning, other turn phases and drawing.

| Median wall time across seven warm repetitions | Seed 42 | Seed 999 |
|---|---:|---:|
| Record the deck totals | 48 ms | 53 ms |
| Assign citizens | 19 ms | 43 ms |
| Price each town | 58 ms | 74 ms |
| Prepare carried food | <1 ms | <1 ms |
| Bank city yields | 143 ms | 122 ms |
| Bank empire yields | 33 ms | 42 ms |
| Whole phase, including arrears | 298 ms | 348 ms |

The timers for assignment and pricing accumulated the calls in their original order. Each row has its own median. A second instrumented run measured the parts of city banking. Food growth took 171 and 114 ms. Borders took 7 and 13 ms. Route tallies took 17 and 34 ms. The border cost within that reading took 0.5 and 0.4 ms. Calculating the turns left is one subtraction and division once the cost is known. Splitting the border forecast offers little saving on these boards. The separate runs varied with machine load.

A CPU sample of the original code identified the main cost in food growth. Each time a town banks, the economy changes. The next positive food surplus needs the current happiness penalty. The call to `meterEffects` from `explainGrowthPercent` accounted for 1,716 samples. Of those, 878 passed through `cardHappiness`. The most frequent path there counted buildings by the yield they supply. That count can depend on card and resource effects on an individual building. This is the next calculation to investigate. An empire-wide happiness value taken before the first town banks would miss effects that depend on its treasury.

## Changes and measurements

- If every eligible tile fits, assignment now selects them all. If valid pins fill the available seats, it keeps those pins. When a choice remains, assignment scores the unpinned candidates and ranks them by score, then tile index. The existing writer stores the final coordinates in index order.
- If balanced and focused assignment produce the same coordinates, the food check can only change the weights for avoid-growth swaps. Towns with avoid growth enabled still make the check. Other towns skip it.
- When calculating food converted to production, the game now checks whether a card applies to the town and its current build first. An applicable card still checks unrest, siege and interdict before moving food.

| Assignment work | Seed 42, turn 10 | Seed 999, turn 10 | Seed 42, turn 120 | Seed 999, turn 120 |
|---|---:|---:|---:|---:|
| Towns | 6 | 6 | 89 | 86 |
| Calls to choose tiles, including focused choices | 9 | 9 | 114 | 120 |
| Calls where the final set was already fixed | 0 | 0 | 30 | 16 |
| Candidate scores avoided by those fixed choices | 0 of 73 | 0 of 75 | 223 of 872 | 159 of 1,227 |
| Focus food checks skipped | 2 | 0 | 8 | 8 |

On both turn-120 boards, the conversion check found no matching card. Across deck tallies and collection, checking the card first removed 350 and 363 production-gate queries from this particular calculation. The ordinary production calculation still checks its gates.

A separate comparison timed one assignment sweep after recording the deck totals on a fresh board. The two versions shared the same compiled simulation code and alternated order. In 20 warm pairs, median process CPU time fell from 52 to 36 ms on seed 42 and from 120 to 104 ms on seed 999. The change used less CPU in 17 of 20 pairs on each board. This isolated sweep excludes the town pricing interleaved with assignments in the real phase.

The full phase comparison used three versions in one process. They shared all code except the two changed functions for assignment and the changed food-conversion function. All six orders ran twice after warmup. Each version received a fresh clone. The host ran other work during measurement.

| Full phase, 12 repetitions per version | Seed 42 | Seed 999 |
|---|---:|---:|
| Original median wall time | 306 ms | 482 ms |
| Assignment change alone | 333 ms | 608 ms |
| Both changes | 296 ms | 493 ms |
| Median paired wall time saved, original to both | 12 ms | −5 ms |
| Median paired CPU time saved, original to both | 13 ms | 9 ms |

Within the banking loop, checking the card first reduced food-growth wall time relative to the assignment change alone in 10 of 12 pairs on seed 42 and 11 of 12 on seed 999. The original and combined versions gave a more conservative comparison, with median paired savings of 11 and 12 ms for food growth. The assignment-only version had considerable wall-time variation in the full-phase run. The counts and the isolated comparison give a more direct measure of the work removed.

## Game and replay checks

- On each turn-120 snapshot, the three versions matched on the complete state after collection, the worked tiles, every town’s yield breakdown and every empire’s yield breakdown. Dispatching End Turn for each seat from the original snapshot also produced identical command results, accepted logs and turn-121 states. This comparison did not reproduce the archived bot plan.
- For the turn-10 check, all six seats used bots with the two snapshots’ map and seat settings. The original and combined versions made the same 116 and 124 accepted commands and reached identical states. Both versions replayed each log from its configuration to that same state.
- The focused test runs covered cities, tile transfers, exact yields, the economy change register, surplus conversions, Devotion cards and the yield sequence. Raw counts, timings and the comparison scripts are in `/private/tmp/webciv-yields-n19` on the measurement machine.

## Browser check after bot moves

Native WebKit loaded the same Standard turn-120 snapshots and ran the current bots once to prepare each board. It applied 73 bot commands on seed 42 and 124 on seed 999. The two yield implementations then received identical copies of each board. The reference used the city and yield files from `2d7b503a`. All other code came from the same checkout. The full command result, accepted log and turn-121 game state matched in every run.

Each board had two warmup pairs and ten timed pairs. The order alternated. The yield column times `collectYields`; the End Turn column starts just before dispatch and ends when dispatch returns. It includes the yield call. It excludes rendering, autosave and preparation of the bot moves. Other low-priority simulations were running.

| Seed | Median yield time, before / after | Paired median saved | Median End Turn, before / after | Paired median saved |
|---|---:|---:|---:|---:|
| 42 | 184 / 165 ms | 19 ms | 470 / 459 ms | 14 ms |
| 999 | 283 / 246 ms | 32 ms | 709 / 665 ms | 42 ms |

The yield phase took less time in 19 of 20 pairs. End Turn took less time in 16 of 20. The two boards establish a gain for these cases. A wider set of maps would be needed to predict the saving in a new game. The local probe and timings are in `/private/tmp/webciv-yields-webkit-1119`.
