# Happiness while towns bank food, November 19

On Standard seed 42 at turn 120, reusing the town's card payment list reduced the median paired End Turn time by 47 ms in native WebKit. Seed 999 showed a 2 ms difference. Both boards produced identical command results, accepted logs and turn-121 states.

## Where the time went

A Node.js probe restored each archived board, recorded the deck totals and called `collectYields`. It timed calls under `cardHappiness` while a town banked food. The reference was `55450c28`. The times below are inclusive medians from three warm runs under load.

| Reference measurement | Seed 42 | Seed 999 |
|---|---:|---:|
| Towns | 89 | 86 |
| Calls to card happiness during food banking | 85 | 77 |
| Time in card happiness | 107 ms | 28 ms |
| Time checking whether buildings supply a yield | 82 ms | 7 ms |
| Time building the town payment lists in those checks | 36 ms | 2 ms |
| Time summing the building packages | 4 ms | <1 ms |

For each building whose category did not answer the question, the count read its package. Reading each package collected the same empire and town effects again and selected the `pays` effects. Seed 42 made 5,152 such lists. Seed 999 made 1,020.

The count now obtains the payment list when the first building in that town needs it. Each building still tests its own selectors and resolves its own amounts, luxury lines and recursive supply checks. Each count starts a fresh list for each town, including when the next town banks food. This reduced list construction to 575 and 168 calls. The number of packages read stayed at 5,152 and 1,020.

## Browser timing and parity

Native WebKit applied the bots' moves to each turn-120 snapshot once. Each version received a fresh copy. The reference and candidate alternated order for two warmup pairs and ten measured pairs. End Turn includes the yield phase. Both measurements exclude bot preparation and rendering. Other tasks ran on the host.

| Seed | Bot commands | Median yield time, before / after | Paired median saved | Median End Turn, before / after | Paired median saved |
|---|---:|---:|---:|---:|---:|
| 42 | 73 | 216 / 174 ms | 36 ms | 553 / 513 ms | 47 ms |
| 999 | 124 | 375 / 367 ms | 28 ms | 976 / 1,004 ms | 2 ms |

Yield time fell in eight pairs on seed 42 and six on seed 999. End Turn time fell in seven and six pairs. The paired medians use the difference within each pair. Seed 999 gives little evidence of a whole-turn improvement.

The Node.js comparison also checked the complete state after collection, every town and empire yield breakdown, and End Turn from the snapshots before bot moves. The focused simulation tests cover card and luxury changes to building packages, recursive building counts and a treasury crossing a happiness threshold between towns. The local scripts and measurements are in `/private/tmp/webciv-happiness-1119`.
