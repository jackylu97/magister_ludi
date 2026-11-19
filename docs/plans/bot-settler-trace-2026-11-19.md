# Settlers in the Stage C comparison, 2026-11-19

The frozen-board bots founded 33 fewer towns by turn 100. They produced 29 fewer settlers and had six more still active at the cutoff. Two fewer net losses to barbarians offset part of that difference. Settlers that founded took a median of seven turns in both versions.

| Settler count across five maps | Live board | Frozen board |
|---|---:|---:|
| Starting settlers | 30 | 30 |
| Settlers produced | 369 | 340 |
| Foundings, including starting settlers | 340 | 307 |
| Captures by barbarians | 38 | 27 |
| Recoveries from barbarians | 29 | 20 |
| Net losses to barbarians | 9 | 7 |
| Still active in bot seats after turn 100 | 50 | 56 |

All new settlers counted toward their empire's paid unit production total. None carried a purchase stamp. No settler died in combat, was disbanded, or changed directly from one bot seat to another. The archive recorded 33 and 24 barbarian captures by comparing owners at turn boundaries. The event trace also catches ownership changes within the turn. For example, on seed 999 a bot recovered settler 138 on turn 44 and barbarians took it back during resolution of the same turn in both versions.

## Differences by map

Each pair gives the live-board count first. Net losses subtract recoveries from barbarian captures. The last column covers settlers produced during play that founded by turn 100.

| Seed | Produced | Founded | Net losses | Still active | Mean turns to found |
|---|---:|---:|---:|---:|---:|
| 42 | 80 → 62 | 65 → 52 | 4 → 1 | 17 → 15 | 11.19 → 9.91 |
| 999 | 69 → 62 | 67 → 61 | 1 → 1 | 7 → 6 | 8.05 → 7.85 |
| 1 | 50 → 57 | 56 → 54 | 0 → 2 | 0 → 7 | 12.42 → 11.52 |
| 7 | 104 → 88 | 88 → 76 | 1 → 3 | 21 → 15 | 10.63 → 11.36 |
| 2026 | 66 → 71 | 64 → 64 | 3 → 0 | 5 → 13 | 11.33 → 7.74 |

Seeds 42 and 7 account for 25 of the 33 fewer foundings. Together their bots produced 34 fewer settlers. On seed 1, the frozen-board bots produced seven more. Seven were still active at the cutoff, and two remained in barbarian hands. On seed 2026, five more settlers produced and three fewer net losses left eight more active with the same number of foundings.

The main difference in production occurred on turns 51 through 75. Bots produced 136 settlers in that period on the live board and 112 on the frozen board. At turn 50, the frozen-board bots had founded six more towns across the five maps. By turn 75 they had founded 12 fewer.

## Time to settle

Among the 310 live-board and 277 frozen-board settlers produced during play that founded by the cutoff, the mean time fell from 10.65 to 9.69 turns. The median stayed at seven. Among all settlers produced through turn 90, 211 of 333 (63%) founded within ten turns on the live board, compared with 192 of 281 (68%) on the frozen board. Each settler in this comparison had ten turns of follow-up, including those that remained active or in barbarian hands.

The observed settlement times give little support to a general slowdown in reaching sites. The original Stage C probe recorded zero refused founding commands in the final frozen-board games. The five-map unit histories show when fewer settlers appeared. The city decisions below explain part of the difference on seed 42. The result applies to these five maps through turn 100.

## Method

The comparison covers seeds 42, 999, 1, 7 and 2026 on standard maps with six bot seats and barbarians. It ends after resolution of turn 100. The live-board bot used the board that earlier seats left. The frozen-board bot planned each seat from the start of the bot step. Both versions ran seats in one process.

The original Stage C probe kept accepted founding counts, town counts and four state digests per game. It replayed each command log but kept only the result and log length. To recover unit histories, the new probe ran the same configurations on isolated copies of the archived `before` and `c1c` trees. It watched each settler's creation, change of owner and removal on the real game state. It also recorded starting settlers and units still present after turn 100.

For each seat and turn, the trace checks the unit count and owner by ID. For each turn it checks the accepted founding commands against the founding events, then checks the founding count and town count against the archive. At turns 20, 50, 75 and 100 it checks the state digest. At the end it checks the command log length and warning count.

Settlement time is the founding turn minus the turn the unit appeared. It includes time spent under barbarian control if a seat recovered the unit. Starting settlers are excluded from this timing. A settler created during end-of-turn resolution usually gets its first order on the next turn. An active settler has no observed settlement time at the cutoff.


All ten games matched all 40 archived state digests, all 1,000 per-turn founding and town counts, and their command log lengths. Each game finished turn 100 with zero warnings. The historical configurations and probe are documented in the [Stage C comparison](performance-pass-2026-11-06.md#stage-c-parallel-bots-from-a-frozen-board-2026-11-18). The local trace runner and ten unit-event files are in `/private/tmp/webciv-c1-settlers.k8IqjC/`. Its reproduction command is `./run.sh 42 999 1 7 2026`, which runs one game at a time.

## Why production fell

The largest production gap arose on turns 51 through 75. Across all five maps the frozen-board bots had 48 more town-turns in this period but produced 24 fewer settlers. A town-turn counts one town owned by a bot seat at the start of one turn. It includes small towns that could not yet train a settler.

| Turns | Live town-turns | Frozen town-turns | Settlers produced, live / frozen | Settlers per 100 town-turns, live / frozen |
|---|---:|---:|---:|---:|
| 1–25 | 900 | 893 | 57 / 56 | 6.33 / 6.27 |
| 26–50 | 2,186 | 2,199 | 63 / 62 | 2.88 / 2.82 |
| 51–75 | 3,900 | 3,948 | 136 / 112 | 3.49 / 2.84 |
| 76–100 | 6,933 | 6,314 | 113 / 110 | 1.63 / 1.74 |
| All turns | 13,919 | 13,354 | 369 / 340 | 2.65 / 2.55 |

Late in the games the frozen-board bots had 619 fewer town-turns and produced settlers at a slightly higher rate. Town count alone cannot explain the earlier shortfall. The drop also appears within Age II. Across 927 live-board seat-turns in Age II, bots produced 167 settlers. Across 979 frozen-board seat-turns in Age II, they produced 132. Age here means the seat's age at the start of the turn. A seat may own several towns. These counts include turns 2 through 100, which cover all settler production.

Seed 42 had the largest net production drop. Seat 3 produced 20 settlers on the live board and nine on the frozen board. Seat 0 produced 18 and nine. Seat 2 went from three to nine. The largest single-seat drop across all maps was on seed 7, where seat 1 produced 27 and 11.

### Build decisions on seed 42

During turns 51 through 75, the frozen-board bots had **507 eligible town-turns against 460** on the live board. Eligibility requires a population of at least two and permission from the game's settler build check at the start of the turn. The bots produced 15 settlers against 31, or 2.96 against 6.74 per 100 eligible town-turns. A settler stood first in the queue on 82 frozen-board town-turns against 152 live-board town-turns.

The bots also chose settlers less often when they set a town's production. Of the 156 accepted live-board queue orders, 116 scored a settler and 40 put one first. Of the 151 frozen-board orders, 125 scored a settler and 12 put one first. The settler scored zero or less on 38 of the 116 live-board choices and 95 of the 125 frozen-board choices. A town can revise its queue more than once, so these are orders, not distinct units.

Two towns show how those scores affected an actual choice. Each comparison uses the same map location and turn in the two games.

| Town and turn | Live-board choice | Frozen-board choice |
|---|---|---|
| Northwatch, seat 0, turn 68 | Settler scored 102.60 for a proposed town at (17, 26). | Library scored 19.61. Settler scored −2.20 for a proposed town at (17, 22). |
| Brightwater, seat 3, turn 73 | Settler scored 49.44 for a proposed town at (36, 13). | Shrine scored 16.94. Settler scored −3.03 for a proposed town at (41, 12). |

The two versions sometimes valued even the same site differently. At Pinehollow on turn 58, both priced a town at (43, 34). The live-board bot expected a four-turn build and scored the settler at 22.97. The frozen-board bot expected eight turns and scored it at −9.93. It chose a Library at 10.48. The games had already diverged, so these examples establish how the recorded boards led to different queues. They do not isolate which earlier change first lowered the value of a new town.

The seed 42 follow-up matched all eight archived state digests. It linked all 541 live-board and 536 frozen-board accepted queue orders to the bot's candidate scores using turn, seat, town coordinates and queue contents. The extra trace files are alongside the unit histories. The reproduction command is `./cities-run.sh 42`.

### What changed in the settler scores

The production formula matches in both archived versions. Multiply the value of the next town by the build delay factor, subtract upkeep, and divide by turns of build effort. Settler upkeep was zero in all 241 recorded settler candidates on turns 51 through 75. The calculation reproduced every score in those orders. The number of negative town values rose from 37 to 90. A nearby settler waiting for an escort accounted for the remaining one live-board and five frozen-board zero scores.

| Town and turn | Next-town value, live → frozen | Build effort, live → frozen |
|---|---:|---:|
| Pinehollow, 58 | 98.42 → −91.64 | 4 → 8 |
| Northwatch, 68 | 439.71 → −12.00 | 4 → 5 |
| Brightwater, 73 | 269.70 → −13.00 | 5 → 4 |

At Pinehollow, the live-board calculation was 98.42355 × (56/60) ÷ 4 = 22.97. The frozen-board calculation was −91.63542 × (52/60) ÷ 8 = −9.93. If only the build time had changed to eight turns, the score would have been 10.66. The archived frozen-board Library scored 10.48. This arithmetic holds the Library and the live-board town value fixed. With the frozen-board town value and a four-turn build, the settler still scores −21.38.

On turns 51 through 75, 31 pairs of accepted queue orders scored a settler for the same seat, town location and turn, with a site named in both games. In 16 pairs, the site also matched. Eight of those 16 went from positive town value to negative, and none moved in the opposite direction. In five of those eight, the build effort stayed the same or fell. Among the 15 pairs with different sites, seven went from positive to negative and one moved in the opposite direction.

The bot selects the nearest available site after accounting for existing settler claims. The town value combines the value of another town, the plans it would help, the walk to the site, wagers, and charges for authority and happiness. The trace kept only that combined value for the selected site. For the next check, start with the same-site cases. Compare the number of towns held or already claimed, the value of the plans a town would help, and the authority and happiness charges on the two boards. For Pinehollow's build time, compare the settler's hammer cost, any progress on its queue row, and the town's production rate.
