# Bot strength before BP13 and on November 19

The current build reached a winner by the turn limit on five of the 16 maps. Before BP13, all 16 games were still running. Four of the five current winners occupied seat 3, which plays Magisterial and Expansionist. The fixed seats prevent us from separating the effects of deck, persona and starting position.

At turn 100, current production was 54.9% higher across the 15 matched maps (95% interval +15.4% to +108.1%). Culture was 84.1% higher and towns were 9.2% higher. The science estimate was +40.1%, but its interval included zero. At turn 50, all 16 maps had readings and every interval included zero.

At turn 120, production was higher on 10 of the 11 remaining maps. The paired estimate was +70.6%. These 11 maps exclude all five early current wins. One map supplied 14,235 of the 49,872 current production, so the pooled total gives it more weight than the paired estimate.

## Games

The baseline is `9164452f`, the build used for the original BP13 before measurements. The current build is `2d7b503a`. Both games use the same 16 seeds from the earlier end check and stop after turn 120 or at a win. The turn number labels the turn just played. A game that finishes turn 100 normally has 101 as its next turn.

The shared baseline library holds the per-seed results, the probes and the starting-map hashes. Five additional current runs reproduced the early winners, their checkpoint digests and every recorded seat measure. Each archived game includes its final state digest. [Before BP13](/Users/jacky/code/webciv-baselines/9164452f/six-seat-standard-t120/NOTES-strength.md) · [Current build](/Users/jacky/code/webciv-baselines/2d7b503a/six-seat-standard-t120/NOTES.md)

Both builds use the Standard map with barbarians and the default bot settings of that build. Six bots play in a fixed seat order.

| Seat | Persona | Decks |
|---:|---|---|
| 0 | Balanced | Dominion, Magisterial |
| 1 | Wide | Expansionist, Scientific |
| 2 | Tall | Commerce, Devotion |
| 3 | Zealot | Magisterial, Expansionist |
| 4 | Warmonger | Devotion, Dominion |
| 5 | Balanced | Scientific, Commerce |

The probe calls each build’s ordinary synchronous `driveBots`. Before BP13 each seat decided on the live board. The current driver plans on a frozen board and applies the seats’ plans in order. The probe adds a warning handler and takes readings after turn resolution. It runs each game in a fresh Node process from a bundle built from a Git archive of the recorded commit.

We compared SHA-256 hashes of the complete starting map and of the starting units’ owners, types and positions on every seed. Both hashes matched across versions on all 16 maps. The baseline turn-50 and turn-100 state digests matched the separate historical study on all seven seeds that study recorded. Two baseline games, seeds 42 and 999, came from the original BP13 run. The other 30 games ran from the pinned builds. All 32 finished with zero driver warnings or stalls.

The measures follow the BP13 probe. Food and production sum city output. Gold, science, culture and faith sum the six empires’ rates. Each seat’s rate is rounded before summing. Technologies count researched technologies across seats, so two seats researching the same technology count twice. Improvements count improved map tiles. The tables sum all six seats, including seats that lost.

For each measure, the two count columns sum the matched games. The percentage gives each seed equal weight. It is the geometric mean of current divided by baseline. The interval uses a two-sided 95% Student t interval on log ratios. Several measures share the same games and the intervals have no adjustment for multiple comparisons. If a game ends before a checkpoint, the checkpoint comparison excludes that pair.

## What changed between builds

The two builds each play against six bots from their own version. These games measure how each version develops an empire. A direct win-rate comparison would require the two bots to play each other under shared rules.

The current build includes the worker and escort changes after BP12, changes to citizen focus, frozen-board planning, and changes to Council decisions. Game rules also changed. The world clock can advance sooner, an empire can lend only a luxury it owns, and the generic Orders, Dominion, Magisterial and the wonders changed. Several of those changes affect production, science, unit grants and the time to victory. A difference between these games cannot identify the effect of one bot change.

## Measurements

### After turn 50

16 paired seeds.

| Measure | Before BP13 | Current | Paired change (95% interval) | Lower / tied / higher |
|---|---:|---:|---:|---:|
| Towns | 369 | 370 | +0.3% (-6.5% to +7.5%) | 5 / 5 / 6 |
| Citizens | 1,301 | 1,313 | +0.5% (-9.7% to +11.9%) | 9 / 0 / 7 |
| Improvements | 727 | 781 | +8.7% (-6.3% to +26.1%) | 7 / 0 / 9 |
| Units | 1,364 | 1,436 | +4.9% (-4.0% to +14.5%) | 5 / 0 / 11 |
| Food | 4,450 | 4,380 | -1.7% (-16.3% to +15.6%) | 10 / 0 / 6 |
| Production | 3,018 | 3,327 | +9.6% (-5.3% to +26.9%) | 4 / 1 / 11 |
| Science | 1,274 | 1,358 | +6.6% (-9.5% to +25.4%) | 7 / 0 / 9 |
| Gold | 796 | 978 | +28.2% (-9.1% to +80.8%) | 6 / 0 / 10 |
| Culture | 1,126 | 1,381 | +21.8% (-2.0% to +51.3%) | 4 / 0 / 12 |
| Faith | 337 | 264 | -24.0% (-43.9% to +2.9%) | 12 / 0 / 4 |
| Technologies | 1,030 | 1,089 | +5.8% (-0.7% to +12.7%) | 3 / 0 / 13 |

### After turn 100

15 paired seeds.

| Measure | Before BP13 | Current | Paired change (95% interval) | Lower / tied / higher |
|---|---:|---:|---:|---:|
| Towns | 809 | 885 | +9.2% (+0.4% to +18.8%) | 5 / 0 / 10 |
| Citizens | 4,828 | 5,269 | +8.4% (-3.9% to +22.4%) | 6 / 0 / 9 |
| Improvements | 3,710 | 3,860 | +4.2% (-3.8% to +12.9%) | 6 / 1 / 8 |
| Units | 3,369 | 3,512 | +3.9% (-4.6% to +13.1%) | 7 / 0 / 8 |
| Food | 18,141 | 21,721 | +18.3% (-0.8% to +41.2%) | 4 / 0 / 11 |
| Production | 17,056 | 29,727 | +54.9% (+15.4% to +108.1%) | 4 / 0 / 11 |
| Science | 12,885 | 21,727 | +40.1% (-0.2% to +96.5%) | 5 / 0 / 10 |
| Gold | 6,061 | 7,272 | +25.9% (-6.0% to +68.5%) | 5 / 0 / 10 |
| Culture | 6,120 | 13,443 | +84.1% (+23.5% to +174.4%) | 2 / 0 / 13 |
| Faith | 2,735 | 3,448 | +22.7% (+3.7% to +45.2%) | 5 / 0 / 10 |
| Technologies | 2,212 | 2,388 | +7.9% (+2.6% to +13.5%) | 3 / 0 / 12 |

### After turn 120

11 paired seeds.

| Measure | Before BP13 | Current | Paired change (95% interval) | Lower / tied / higher |
|---|---:|---:|---:|---:|
| Towns | 739 | 810 | +10.2% (-1.6% to +23.4%) | 3 / 0 / 8 |
| Citizens | 5,227 | 5,994 | +14.0% (-4.4% to +35.9%) | 5 / 0 / 6 |
| Improvements | 3,863 | 4,232 | +8.3% (-4.0% to +22.2%) | 6 / 0 / 5 |
| Units | 3,415 | 3,577 | +4.0% (-9.8% to +19.8%) | 6 / 0 / 5 |
| Food | 20,942 | 26,049 | +22.3% (+1.0% to +48.1%) | 3 / 0 / 8 |
| Production | 25,089 | 49,872 | +70.6% (+17.2% to +148.4%) | 1 / 0 / 10 |
| Science | 19,700 | 33,605 | +45.9% (-6.5% to +127.6%) | 4 / 0 / 7 |
| Gold | 9,008 | 11,557 | +31.4% (-5.7% to +83.1%) | 4 / 0 / 7 |
| Culture | 8,738 | 16,086 | +78.2% (+25.6% to +153.0%) | 2 / 0 / 9 |
| Faith | 3,191 | 4,970 | +50.8% (+23.9% to +83.6%) | 1 / 0 / 10 |
| Technologies | 2,001 | 2,078 | +3.8% (-1.0% to +8.8%) | 4 / 0 / 7 |

### Individual maps

Each pair gives the value before BP13 followed by the current value. A dash means the game ended before that checkpoint. Winner entries give the turn displayed on the final state. A win during turn resolution can advance that counter by one.

| Seed | Towns, turn 100 | Citizens, turn 100 | Production, turn 100 | Science, turn 100 | Production, turn 120 | Science, turn 120 | Winning seat and final state turn, before / current |
|---:|---:|---:|---:|---:|---:|---:|---|
| 999 | 73 / 71 | 455 / 381 | 1,797 / 1,910 | 1,230 / 981 | 3,661 / 3,928 | 2,561 / 2,321 | None / None |
| 42 | 49 / 62 | 292 / 505 | 1,372 / 2,635 | 764 / 2,461 | 3,674 / — | 1,520 / — | None / Seat 3, turn 111 |
| 1 | 48 / 64 | 282 / 322 | 1,055 / 2,567 | 743 / 799 | 2,822 / 14,235 | 1,573 / 3,788 | None / None |
| 7 | 66 / 69 | 358 / 472 | 1,770 / 4,410 | 752 / 4,131 | 4,003 / — | 1,989 / — | None / Seat 0, turn 114 |
| 2026 | 62 / — | 329 / — | 1,638 / — | 870 / — | 3,352 / — | 1,351 / — | None / Seat 3, turn 100 |
| 31337 | 44 / 62 | 268 / 328 | 643 / 1,684 | 828 / 1,104 | 1,541 / 4,540 | 1,199 / 2,676 | None / None |
| 3 | 59 / 60 | 370 / 302 | 1,261 / 1,061 | 1,049 / 800 | 2,442 / 2,456 | 3,211 / 1,663 | None / None |
| 5 | 55 / 61 | 309 / 380 | 1,144 / 4,624 | 1,087 / 4,030 | 2,523 / — | 2,416 / — | None / Seat 3, turn 103 |
| 11 | 48 / 52 | 309 / 308 | 988 / 880 | 561 / 459 | 1,820 / 2,158 | 1,127 / 946 | None / None |
| 13 | 50 / 49 | 292 / 327 | 931 / 968 | 950 / 1,001 | 2,208 / 3,161 | 1,863 / 2,891 | None / None |
| 17 | 56 / 48 | 331 / 272 | 1,064 / 783 | 733 / 640 | 2,397 / 2,196 | 1,502 / 1,261 | None / None |
| 23 | 49 / 44 | 247 / 249 | 614 / 804 | 488 / 740 | 1,419 / 2,537 | 921 / 1,284 | None / None |
| 101 | 47 / 54 | 303 / 398 | 795 / 2,083 | 706 / 1,411 | 2,724 / 5,601 | 1,620 / 9,670 | None / None |
| 314 | 58 / 68 | 391 / 340 | 1,553 / 1,972 | 1,228 / 1,213 | 3,763 / — | 2,922 / — | None / Seat 3, turn 117 |
| 777 | 55 / 52 | 314 / 290 | 1,053 / 985 | 813 / 857 | 2,038 / 2,404 | 1,433 / 2,155 | None / None |
| 4242 | 52 / 69 | 307 / 395 | 1,016 / 2,361 | 953 / 1,100 | 2,017 / 6,656 | 2,690 / 4,950 | None / None |
