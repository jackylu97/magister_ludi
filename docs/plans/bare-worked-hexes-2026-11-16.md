# Bare worked hexes, 2026-11-16

`docs/flags.md` (ooooooo), the bullet "BP13", last line. The user: *"dispatch an agent to investigate the bare worked hexes."* BP8 measured 21% of worked hexes bare with a legal improvement at turn 100 (27% before BP8; the aim on the proposal page was under 10%). Nobody had traced why. This study measures it and proposes fixes. It changes no code, no data and no test. Branch `decks` at `4b4c0872`.

## The answer in short

- **How many.** At turn 100, 26% of the worked hexes that have or could take an improvement are bare (497 of 1,921, seven seeds; the seeds read 20% to 36%). BP8's measure gives 24% (BP8 read 21% on its own tree, four batches earlier). The share is 47% at turn 50, 29% at turn 75 and 27% at turn 125: it stops falling after turn 75.
- **Why, one cause a hex, at turn 100:**
  1. **57%: the seat's workers spend their next charge on ground no citizen works.** The worker's choice (`rankPlanFor`) ranks every hex by the yield it would pay a citizen, whether or not a citizen stands on it. 53% of the improvements laid to turn 100 went on unworked hexes, and 19% of all improvements laid were still unworked six turns later.
  2. **24%: every worker of the seat is busy on other bare worked hexes.** The seats hold too few workers for their growth, and the workers are slow: 71% of worker-turns are marches, 25% are builds.
  3. 13%: a worker stands on the hex, marches to it, or picks it next.
  4. 6%: the bot reads no gain on the hex, and it is right (a qanat pays its neighbours and nothing on its own hex; a lumbermill or a camp on a forest takes away faith or culture the bare forest pays).
  5. 1%: the seat has no worker.
- **Two faults make the workers slow.** A march is not a claim, so workers chase the same hex: at turn 100, 52% of workers go for a hex another worker of their seat also goes for, and about half of all re-aimed marches (891 of 1,755) happen because another worker laid the target or stands on it. And the wild takes a fifth of the workers whose lives end (157 of 766), after 1.1 improvements each, against 3.9 for a worker that spends all its charges.
- **What it costs.** At turn 100 the bare worked hexes would add about 3% of the seats' town food, production and gold. The median seat loses about 3%; the worst seats lose 14% of their food or 21% of their production. At turn 125 it is 5% of food, 3% of production and 4% of gold. A modest loss on average, and large in a few seats.
- **A yardstick.** With the charges the seats already hold at turn 100, a plain plan (each worker to the nearest bare worked hex that no other worker has taken) would lay 65% of the bare worked hexes, in a median of about 3 turns. The bots lay 18% of them in the next ten turns.
- **The top three fixes** (none built): the worker's choice reads which hexes are worked (fix 1); a march is a claim (fix 2, a plain bug); the worker's price counts only the charges that will really land (fix 3). Details are in section 6.

## Method

- **The tree.** One detached `git worktree` of `decks` at `4b4c0872` (BP12 and the flags commit), in the session's scratch folder, with the main tree's `node_modules` linked in. Every run used it, so the other agents' edits in the main tree did not reach the runs.
- **The game.** The end check's game: six seats with two decks each, standard map, barbarians on, played by the bots. Seat 0 balanced (Dominion, Magisterial), 1 wide (Expansionist, Scientific), 2 tall (Commerce, Devotion), 3 zealot (Magisterial, Expansionist), 4 warmonger (Devotion, Dominion), 5 balanced (Scientific, Commerce).
- **Seeds and turns.** Seven seeds of the end check's sixteen: 999, 42, 1, 7, 2026, 31337 and 3. Each game was played to the end of turn 125, with full readings at turns 50, 75, 100 and 125. No game ended early.
- **The probe** is `barehex/probe.ts` in the scratch folder, run with `vite-node`. It sends no command of its own. It records:
  - each turn: each seat's worked hexes, which of them are bare with a legal improvement, how long each hex has been worked and bare, how many hexes entered the worked set, the workers held, and what each worker did that turn;
  - each worker order: its kind (lay, march, flight, re-aim, wake, sleep), its target, whether the target is worked, and, for a re-aimed march, what stands at the old end;
  - each improvement laid: whether its hex was worked before the build, just after it, and the first turn it was worked;
  - each build decision of a town: the worker row's score against the winner's;
  - each worker's life: when it came, what it laid, how it left the board;
  - at the four readings, every bare worked hex: the bot's own plan for the seat (`buildImprovementPlan` on a fresh `valueContext`), the yield the improvement adds, every worker of the seat and what its own arm would do next (`rankPlanFor`, then the shortlist, path and refusal checks of `workerCommand`), each town's worker price (`explainWorkerCraving`), and the same bare hexes followed for the next ten turns.
- **Definitions.**
  - A **worked hex** is a hex in a town's `workedTiles`, not the town's own hex.
  - A **legal improvement** is any improvement row, other than a great person's work and the outpost, that `improvementErrorAt` accepts for the hex's owner now. It includes rows the bot does not lay (the qanat, the physic garden, the tended works).
  - A **bare worked hex** is a worked hex with no improvement and at least one legal improvement.
  - **The share** is the bare worked hexes over the worked hexes that have an improvement or could take one. BP8's figure was the bare worked hexes with an improvement on the bot's roster over all worked hexes. Table 1 gives both.
  - **Turn T** is the state after turn T has resolved, before any seat plays turn T + 1.
  - **The yield an improvement adds** is the game's own reading: `improvementYieldDelta` with the town's context (`cityContext`), which is `foldTile` with and without the improvement. The improvement is the one the bot's plan would lay. Where the plan has no entry, it is the legal one with the best citizen score (`yieldScore`). It is the hex's own figure, before the town's percentages.
- **The probe does not change play.** On seed 42 the digests after turns 50 and 100 (`8989f28a:843997`, `e05a7859:939952`) equal those of the same game played with no probe. On the six later seeds, each reading also left the state digest unchanged.
- **Probe versions.** Fields were added while the queue ran. Seed 42 lacks the ten-turn follow, the plain plan, the idle improvements, the resource kind of a build and the exact worker targets; seed 999 lacks the re-aim reasons. Tables built on fewer seeds say so.
- **The machine, and what did not run.**
  - The laptop ran on battery throughout and was shared with other agents. From 15:55 to 16:20 the load average was 80 to 237 and swap was nearly full.
  - At 15:57 a fault in my queue script started nine games at once. I stopped seven of them by PID within three minutes; they were played again later. Seed 42 and its plain twin ran two at a time, under the limit at that time.
  - At 16:23 the coordinator asked for one game at a time at `nice 15`, and later for 4 to 6 seeds. Every later game ran alone. Seed 5, the eighth seed, was not started. Every game that started after the fault finished.
- **Shared baseline.** The seven games and the probe are stored in `/Users/jacky/code/webciv-baselines/4b4c0872/six-seat-standard-t125/`, with a `NOTES.md` that lists the digests.

## 1. How many

**Table 1. Bare worked hexes over worked hexes that have or could take an improvement, all six seats summed.**

| Seed | Turn 50 | Turn 75 | Turn 100 | Turn 125 |
|---|---:|---:|---:|---:|
| 999 | 30 of 70 (43%) | 60 of 168 (36%) | 84 of 350 (24%) | 119 of 507 (23%) |
| 42 | 17 of 36 (47%) | 36 of 119 (30%) | 78 of 246 (32%) | 188 of 474 (40%) |
| 1 | 34 of 67 (51%) | 44 of 168 (26%) | 47 of 234 (20%) | 70 of 341 (21%) |
| 7 | 32 of 72 (44%) | 64 of 183 (35%) | 110 of 304 (36%) | 150 of 487 (31%) |
| 2026 | 32 of 63 (51%) | 36 of 145 (25%) | 69 of 274 (25%) | 118 of 417 (28%) |
| 31337 | 45 of 80 (56%) | 37 of 138 (27%) | 45 of 218 (21%) | 64 of 330 (19%) |
| 3 | 30 of 80 (38%) | 41 of 172 (24%) | 64 of 295 (22%) | 89 of 426 (21%) |
| **All** | **220 of 468 (47%)** | **318 of 1,093 (29%)** | **497 of 1,921 (26%)** | **798 of 2,982 (27%)** |
| BP8's measure (roster only, of all worked hexes) | 220 of 582 (38%) | 313 of 1,172 (27%) | 486 of 2,021 (24%) | 788 of 3,268 (24%) |
| Worked hexes with no legal improvement | 114 | 79 | 100 | 286 |

**Table 2. By seat, seven seeds summed.**

| Seat | Persona | Decks | Towns, turn 100 | Workers, turn 100 | Bare, turn 100 | Share, turn 100 | Share, turn 125 |
|---|---|---|---:|---:|---:|---:|---:|
| 0 | balanced | Dominion, Magisterial | 72 | 17 | 155 | 36% | 37% |
| 1 | wide | Expansionist, Scientific | 101 | 40 | 125 | 31% | 37% |
| 2 | tall | Commerce, Devotion | 43 | 25 | 60 | 25% | 26% |
| 3 | zealot | Magisterial, Expansionist | 63 | 27 | 73 | 23% | 19% |
| 4 | warmonger | Devotion, Dominion | 67 | 22 | 52 | 16% | 16% |
| 5 | balanced | Scientific, Commerce | 55 | 22 | 32 | 15% | 9% |

Per seat and game at turn 100 (42 seat-games) the share runs from 5% to 57%, with a median of 22% (quartiles 17% and 34%). Seat 0 holds the fewest workers a town (0.24) and has the highest share.

**Table 3. By the age of the town.**

| Town age (turns) | Worked hexes, turn 100 | Bare, turn 100 | Bare share of worked, turn 100 | Turn 125 |
|---|---:|---:|---:|---:|
| 0 to 10 | 124 | 93 | 75% | 65% |
| 11 to 25 | 283 | 117 | 41% | 43% |
| 26 to 50 | 474 | 129 | 27% | 33% |
| 51 and more | 1,140 | 158 | 14% | 15% |

New towns are mostly bare, but they hold a fifth of the bare hexes (93 of 497). Most bare hexes are in towns older than 25 turns.

## 2. Why: the causes at turn 100

### The cause of each bare hex

Each bare worked hex is sorted into the first of these that is true:

- **A. A worker is on it or on its way:** A1 a worker stands on it; A2 a worker's march ends on it; A3 a worker of the seat picks it next.
- **B. The bot reads no gain:** B1 the only legal rows are outside the bot's roster (`workers.improvements`); B2 the plan has no entry, because every legal row loses as much as it gives.
- **C. The seat has no worker** (C1 with one queued, C2 with none).
- **F. A worker of the seat lays unworked ground next:** at least one worker's next act (by its own arm, asked at the reading) is on a hex no citizen works.
- **G. Every worker of the seat lays other worked ground next.**
- D, E. The workers are in danger, or can reach nothing (none found).

**Table 4. Causes.** The yields are what the improvements would add, summed. The citizen score is `yieldScore` (food 3, production 2, gold 1).

| Cause | Turn 75 | Turn 100 | Share, turn 100 | Turn 125 | Food, turn 100 | Production | Gold | Citizen score |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| F. A worker of the seat lays unworked ground next | 146 | 284 | 57% | 536 | +199 | +164 | +63 | 988 (61%) |
| G. Every worker of the seat lays other worked ground next | 87 | 120 | 24% | 150 | +70 | +70 | +15 | 365 (23%) |
| A2. A worker marches to it | 20 | 24 | 5% | 26 | +16 | +14 | +23 | 99 |
| A1. A worker stands on it | 17 | 18 | 4% | 30 | +8 | +14 | +7 | 59 |
| A3. A worker picks it next | 22 | 18 | 4% | 20 | +14 | +9 | +14 | 74 |
| B2. The bot reads no gain | 21 | 18 | 4% | 26 | -4 | +13 | +5 | 19 |
| B1. Only legal outside the roster | 5 | 11 | 2% | 10 | 0 | 0 | 0 | 0 |
| C1. No worker, one queued | 0 | 4 | 1% | 0 | +5 | 0 | 0 | 15 |
| **All** | **318** | **497** | **100%** | **798** | **+308** | **+284** | **+127** | **1,619** |

The rest of the yield at turn 100: science +16, faith -55, culture -82 (rows on forests that take away faith or culture the bare hex pays, in B2 and in F).

**By seed, turn 100:**

| Seed | Bare | A | B | C | F | G |
|---|---:|---:|---:|---:|---:|---:|
| 999 | 84 | 11 | 6 | 4 | 57 | 6 |
| 42 | 78 | 10 | 9 | 0 | 40 | 19 |
| 1 | 47 | 7 | 1 | 0 | 23 | 16 |
| 7 | 110 | 7 | 0 | 0 | 41 | 62 |
| 2026 | 69 | 9 | 10 | 0 | 37 | 13 |
| 31337 | 45 | 3 | 3 | 0 | 39 | 0 |
| 3 | 64 | 13 | 0 | 0 | 47 | 4 |

F leads on six seeds of seven. On seed 7, G leads: most of its bare hexes are in seats that hold far fewer charges than they need (seat 0: 66 bare worked hexes, 15 charges).

F is a seat-wide test: a hex counts as F if any worker of its seat goes for unworked ground next, even far away. Two narrower readings agree in direction. For 45% of the bare hexes, the nearest worker of the seat goes for an unworked hex next. Of the 113 workers in the seats under F, 77 go for an unworked hex next: a mine 31 times, a lumbermill 13, a farm 11.

### Examples, turn 100

- **F.** Seed 999, seat 0, Ironford (49,25): grassland, a farm adds +1 food, worked for 41 turns. The plan prices the farm at 5.6. The nearest worker, 2 hexes away, walks to a mine on an unworked hill priced at 49.4. The seat holds 5 workers with 8 charges, and its bare worked hexes need 31.
- **F.** Seed 3, seat 5, S5 3 (40,44): a forested hill, a lumbermill adds +1 production, worked for 10 turns. The seat holds 17 charges for its 3 bare worked hexes, and its other workers lay unworked ground. The nearest worker, 4 hexes away, walks to a worked deer camp.
- **G.** Seed 999, seat 3, S3 9 (44,48): a tundra hill, a mine adds +1 production, worked for 14 turns. The nearest worker, 1 hex away, lays a farm on another worked hex.
- **G.** Seed 3, seat 3, S3 1 (14,36): desert floodplain, a farm adds +2 food, worked for one turn. The nearest worker, 1 hex away, walks to a worked fish hex for fishing boats, priced at 73.
- **A2.** Seed 999, seat 0, S0 8 (55,16): a hill, a plantation adds +3 gold. A worker's march ends on it. The nearest worker, 10 hexes away, would walk to an unworked mine if asked now.
- **B1.** Seed 2026, seat 1, Larkspur (46,34): dry desert. The only legal row is a qanat, which adds nothing on its own hex and waters the hexes beside it. The bot's roster does not list the qanat.
- **B2.** Seed 42, seat 3, S3 4 (47,6): tundra forest. A lumbermill adds +1 production and takes away 1 food and 1 faith that the hex pays now. The bot is right to leave it.
- **C1.** Seed 999, seat 4, S4 1 (25,34): plains, a farm adds +1 food, worked for 38 turns. Seat 4 holds no worker at turn 100, with one queued.

### The candidates, confirmed or rejected

| Candidate | Reading at turn 100 | Verdict |
|---|---|---|
| The worker's choice ignores which hexes are worked | 53% of improvements to turn 100 land on unworked hexes; at turn 100, 54% of workers go for an unworked hex next while a bare worked hex is on their list | **Confirmed. The main cause** (F) |
| Too few workers | 442 charges held against 497 needed; the plain plan leaves 35% of the bare hexes for want of charges; 0.076 workers a worked hex, from 0.129 at turn 50 | **Confirmed** (G, and part of F) |
| Workers far away | Nearest worker: 0 to 2 hexes for 22% of the bare hexes, 3 to 5 for 36%, 6 to 10 for 32%, 11 or more for 8% | Confirmed as a part. 28% of the marches ordered are 6 hexes or more |
| Workers chase the same hex | 52% of workers share their next hex with another worker of the seat | **Confirmed.** A plain bug (fix 2) |
| Workers lost to the wild and not replaced | 157 of 766 ended lives, 1.1 improvements each | **Confirmed** as a loss of charges |
| Another job first (a resource, a chop, a prospect, a road) | The bot never chops and builds no roads with workers. Of the unworked builds with a known resource kind, 111 were luxuries, 49 strategic, 94 bonus and 618 none | Resources: a minor part, and often right (see below). Chops, roads: not a cause |
| The hex became worked recently | 79% of the bare hexes had been worked for 4 turns or more, and 51% for 11 or more | Rejected |
| The citizens move between hexes often | 96% of worked hexes were worked the turn before (turns 76 to 125) | Rejected |
| The improvement is legal but poor | 29 hexes (6%, B1 and B2): a qanat adds nothing on its own hex, and a forest row takes away faith or culture the hex pays bare; 22 of them add nothing by the citizen weights | Confirmed, small. The bot is right |
| The worker is asleep, idle, out of charges or fleeing | Asleep, idle or woken: 0.4% of worker-turns to turn 100; fleeing 4%; a worker with no charge leaves the board | Rejected. `wakeIdleWorker` works |
| The hex is unsafe and the worker is held back | 37% of bare hexes have a hostile combatant within 4 hexes, but the worker's choice reads no danger at its target; only `civilianFlight` reads danger, at the worker's own hex | Rejected as "held back"; the wild's toll is above |
| A technology the bot's roster does not list | 11 hexes (2%) where only a qanat is legal | Small (B1) |
| A new, captured or rebel town | New towns: 93 hexes (19%), see table 3. Captured: 1. In unrest: 0 | New towns: a part. Captured, unrest: rejected |
| An improvement pillaged and not rebuilt | None of the 497 bare hexes had held an improvement before | Rejected |

**Is the unworked choice right by yield?** Not often. Of the 990 improvements laid on unworked hexes to turn 100, 495 were worked the same turn (a citizen moved onto the new improvement) and 135 within five turns. The other 360 (19% of all 1,855 improvements) stayed unworked for six turns or more, 108 of them to turn 125. A luxury or a strategic seam opens without a citizen, so the 160 such builds are partly right even unworked. At turn 100, 22% of the improved hexes the seats own stand unworked (356 of 1,600, six seeds: mines 111, farms 100, lumbermills 63), while 419 worked hexes on the same seeds wait bare.

**Why the plan's best hexes are not the citizens' hexes.** The plan prices a hex in the bot's currency (`explainYields` plus the hammer premium), and the citizens choose hexes by the citizen weights (food 3, production 2, gold 1). In the examples a +1 food farm reads 5.6 to 14 and a +1 production mine 16.8 to 49. So the workers favour mines and lumbermills on hills and forests, and the citizens work the grassland and plains, where 168 of the 497 bare hexes want a farm.

## 3. What it costs

**Table 5. The yield the bare worked hexes would add, against the seats' town totals (`foldCity`), all seats of a seed summed.** The hex figure is before the town's percentages, so the share reads a little low.

| Seed | Food, turn 100 | Production, turn 100 | Gold, turn 100 | Food, turn 125 | Production, turn 125 | Gold, turn 125 |
|---|---:|---:|---:|---:|---:|---:|
| 999 | +56 (3%) | +39 (2%) | +25 (2%) | +84 (3%) | +61 (1%) | +30 (1%) |
| 42 | +44 (4%) | +31 (2%) | +35 (6%) | +412 (14%) | +394 (6%) | +272 (15%) |
| 1 | +42 (4%) | +17 (2%) | +6 (1%) | +51 (3%) | +38 (1%) | +21 (1%) |
| 7 | +51 (3%) | +98 (6%) | +17 (2%) | +85 (3%) | +202 (4%) | +40 (2%) |
| 2026 | +39 (3%) | +42 (3%) | +20 (3%) | +74 (3%) | +211 (5%) | +66 (4%) |
| 31337 | +34 (3%) | +20 (3%) | +18 (3%) | +47 (3%) | +67 (3%) | +35 (3%) |
| 3 | +42 (3%) | +37 (3%) | +6 (1%) | +58 (2%) | +67 (2%) | +20 (1%) |
| **All** | **+308 of 9,107 (3%)** | **+284 of 9,536 (3%)** | **+127 of 5,016 (3%)** | **+811 of 17,477 (5%)** | **+1,040 of 29,915 (3%)** | **+484 of 11,700 (4%)** |

- Per seat at turn 100: the median seat would gain 3.5% food, 2.9% production and 2.2% gold. The worst seat: 13.6% food, 20.5% production, 12.7% gold.
- At turn 125 the worst seat is seed 42's seat 1 (wide, Expansionist and Scientific): 35 towns, 11 workers, 109 bare worked hexes, and its cards make an improved hex pay much more (a farm there adds +4 food, +2 production and +2 gold). It would gain 21% of its food and 20% of its gold.
- A bare worked hex would add on average 0.62 food, 0.57 production and 0.26 gold at turn 100, and 1.02 food, 1.30 production and 0.61 gold at turn 125, as the cards that pay improved hexes come in.
- So the fifth matters little in the median seat and a lot in the seats whose cards pay for improvements. Food also compounds: a farm worked 20 turns earlier is growth 20 turns earlier, which these figures do not count.

## 4. Workers

**Table 6. Workers against towns and worked hexes, seven seeds summed.**

| Turn | Towns | Worked hexes | Workers | Workers a town | Workers a worked hex | Charges held | Charges the bare hexes need | Seats with no worker |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 25 | 94 | 203 | 21 | 0.22 | 0.103 | 50 | - | 23 of 42 |
| 50 | 170 | 582 | 75 | 0.44 | 0.129 | 211 | 220 | 7 of 42 |
| 75 | 273 | 1,172 | 125 | 0.46 | 0.107 | 312 | 318 | 0 of 42 |
| 100 | 401 | 2,021 | 153 | 0.38 | 0.076 | 442 | 497 | 1 of 42 |
| 125 | 564 | 3,268 | 212 | 0.38 | 0.065 | 769 | 798 | 0 of 42 |

The worked hexes grow faster than the workers: workers a worked hex fall by half from turn 50 to turn 125. The charges held stay just under the charges the bare hexes need, but they land slowly (table 7) and half of them land on unworked ground.

**Table 7. Worker-turns by state.**

| State | Turns 1 to 100 | Share | Turns 1 to 125 | Share |
|---|---:|---:|---:|---:|
| Marching, an order from an earlier turn | 2,217 | 30% | 3,538 | 30% |
| Marching, a new order | 1,836 | 25% | 2,870 | 24% |
| Building | 1,855 | 25% | 2,820 | 24% |
| Marching, re-aimed | 1,197 | 16% | 2,069 | 18% |
| Fleeing | 280 | 4% | 465 | 4% |
| Asleep, put to sleep, idle or woken | 30 | 0.4% | 31 | 0.3% |
| **All** | **7,415** | | **11,793** | |

- One improvement takes four worker-turns (1,855 builds in 7,415 worker-turns). A build ends the worker's turn, and a worker walks two hexes a turn on open ground, so a worker in the middle of its town's hexes could lay about one improvement every one or two turns.
- **Re-aimed marches.** Of 1,755 re-aims (six seeds), 714 (41%) came after another worker laid the old target and 157 (9%) after another worker came to stand on it. Another 725 (41%) found the old target still bare: the arm named a better hex when the piece came nearer to it.
- **Shared targets.** At turn 100 the 130 workers of six seeds go for 88 hexes: 68 workers (52%) share their next hex with another worker of the seat, and 54 of the 81 marching workers march to a hex another worker also marches to. At turn 125 it is 63%.
- **Marches.** 53% of the marches ordered go to an unworked hex. 28% are 6 hexes or more.

**Table 8. Worker lives, turns 1 to 125.**

| How the life ended | Workers | Improvements a life, mean | Median |
|---|---:|---:|---:|
| Spent its last charge | 598 | 3.87 | 4 |
| Taken by the wild | 157 | 1.13 | 1 |
| Taken by a rival | 10 | 1.40 | 1 |
| Other | 1 | 0 | 0 |
| **All ended lives** | **766** | **3.27** | **4** |
| Still alive at turn 125 | 199 | 1.58 | 1 |

A worker carries three charges; cards give some workers four. An ended life lasted a median of 12 turns, 71% of it marching. The wild took 20% of the workers whose lives ended, after they had laid about one improvement each.

**The worker's price in the build queue (turns 1 to 100).**

- 4,513 build decisions were made in a seat with at least one bare worked hex. The worker row was on the table in nearly all of them, and won 561 (12%). It read nought or less in 488 (11%).
- Its score against the winner's: median 0.45 (quartiles 0.22 and 0.73). The winners there: Warrior 449, Settler 394, Palisade 353, Archer 329, Scout 325, Monument 290, Stone Walls 282, Library 263, Granary 222.
- Where the seat's bare worked hexes outnumber three charges for each worker it holds (2,060 decisions), the worker won 17%, at a median of 0.55 of the winner.
- At turn 100 the craving (`explainWorkerCraving`) reads above nought in 215 of the 226 towns with a bare worked hex. So the price sees the ground. It is lower than the soldiers', settlers' and walls' rows, because `spokenFor` takes every charge on the board off the front of the best worked hexes, as if each charge lands at once on the best worked hex. In the games a charge takes four worker-turns, half of the charges land on unworked ground, and a fifth of the workers are taken before they spend them.
- **What one more worker would add.** If its three charges landed on bare worked hexes, about 1.9 food, 1.7 production and 0.8 gold a turn at turn 100 (three times the mean hex above), after about three turns, for the rest of the game. A worker costs 10 hammers plus 2 for each worker the empire has built before (`UnitDef.escalation`); a Warrior costs 15. A seat that has built ten workers pays 30 hammers, which the production alone repays in about 18 turns.

## 5. A yardstick from the rules alone

The plain plan a person could follow: each worker in turn takes the nearest bare worked hex no other worker has taken, walks there at its stride (two hexes a turn, terrain costs ignored), lays it, and goes on while it has charges.

**Table 9. The plain plan with the charges held, against what the bots did in the next ten turns (six seeds).**

| Reading | Bare worked hexes | Plain plan: laid | Plain plan: left for want of charges | Plain plan: mean turn of a build, median seat | Bots: laid within 10 turns | Bots: the citizen left | Bots: still bare and worked after 10 turns |
|---:|---:|---:|---:|---:|---:|---:|---:|
| Turn 50 | 203 | 140 (69%) | 63 | 2.8 | 63 (31%) | 41 (20%) | 99 (49%) |
| Turn 75 | 282 | 216 (77%) | 66 | 3.5 | 82 (29%) | 57 (20%) | 143 (51%) |
| Turn 100 | 419 | 271 (65%) | 148 | 3.3 | 76 (18%) | 87 (21%) | 256 (61%) |
| Turn 125 | 610 | 417 (68%) | 193 | 3.7 | - | - | - |

- In charges: at turn 100 the bare worked hexes need 497 charges and the seats hold 442, with few queued. Summed over all seats, about one hex in nine is beyond the charges held. Seat by seat it is more, because some seats hold more charges than they need and others far fewer: the plain plan lays 65% inside about three turns and leaves 35% for want of charges in their own seat.
- In turns: the plain plan's last build in the median seat lands at turn 6 after the reading (15 at the most). In the bots' games, 61% of the same hexes are still bare and worked ten turns later.

## 6. Fix proposals

None of these is built. Fix 1 explains the most bare hexes and the most yield. Fixes 2 and 3 explain most of the rest, through the workers' speed and number.

### Fix 1: the worker's choice reads which hexes are worked

- **Explains** cause F: 57% of the bare worked hexes at turn 100 and 61% of their yield; and the 360 improvements (19% of all) that stood unworked six turns or more.
- **What is wrong.** The user's ruling on the worker's price, 2026-09-09: *"workers early is fine, as long as those tiles will be worked"*. `explainWorkerCraving` (`src/ai/plan.ts`) follows it: it counts only entries on hexes a citizen works or will work next (`citizenSeats`, population + 2 deep, over all the seat's towns in `empireSeats`). The worker's own choice does not. `rankPlanFor` ranks every entry of the plan by `value / (1 + distance × workers.walkDiscount)`, and `value` is the yield the hex would pay a citizen, whether or not a citizen stands on it. `workerCommand` (`src/ai/bot.ts`) then takes the first row of that ranking that it can reach.
- **Change.** In `rankPlanFor`, read the same seats as the craving. An entry outside the seats keeps in full the part of its value that needs no citizen: the seam it opens (`seamOpeningTerms`, the strategic copies). The rest is multiplied by a new knob, for example `workers.unseatedShare` (with its row in `data/ai.bounds.json`, so the arena panel shows it). A second, smaller change for the same cause: rank the seated entries by the town's own citizen weights, or flag the gap, because the plan's currency and the citizens' weights disagree about a mine against a farm.
- **Gain.** The charges laid on ground nobody works go to the worked bare hexes. About half the unworked builds were worked at once, and those hexes are in the seats, so they keep their full value. The idle ones lose it.
- **Risk.**
  - A luxury opens without a citizen, and the plan prices a luxury's own pay (its contentment and coin) at nothing today (`workGifts`' docblock: "a luxury is worth strictly more to this bot than it says"). With the knob, an unworked luxury plantation would fall behind a worked farm. Price the luxury's pay for the spade, or exempt a seam the empire does not hold.
  - A town that is about to grow works its next hexes; the seats already include two citizens ahead.
  - The plan is memoised on the economy clock (`buildImprovementPlan`'s docblock), and the seats are memoised for the sitting (`citizenSeats`). The choice would read the seats through the craving's memo, so it sees the worked hexes as the sitting began. That is the craving's bargain today; a citizen moved during the sitting is seen the next turn. If that is not good enough, read `workedTiles` on every ask, as `unclaimed` is read.
- **Bug or choice.** A bug against the 2026-09-09 ruling, in that the price obeys it and the choice does not. The knob's value, and whether the plan should use the citizens' weights, are choices for the user.

### Fix 2: a march is a claim (a plain bug)

- **Explains** the speed loss in causes F and G: 52% of workers share their next hex at turn 100; about half of the re-aimed marches (891 of 1,755) happen because another worker laid the target or stands on it; re-aimed marches are 16% of all worker-turns.
- **What is wrong.** `buildImprovementPlan` marks a hex as taken only when a worker stands on it (`workerHexes`, which writes `PlanEntry.unclaimed`). A worker that marches to a hex does not take it. So `rankPlanFor` offers the same best hex to every worker of the seat, two or three march to it, the first lays it, and `reaskTheMarch` re-aims the others when they see it laid, often after several turns of walking.
- **Change.** In `workerHexes`, also mark the last hex of each spade's march (`Unit.path`). In `rankPlanFor`, treat the piece's own march end as it treats the hex the piece stands on, so a worker that is re-asked still sees its own target. Optional: a worker may take a claimed hex when it would land sooner than the claimant, and the claimant is re-aimed.
- **Keep the price as it is.** `explainWorkerCraving` skips claimed entries and also subtracts every spade's remaining charges (`spokenFor`). It already counts one charge of a standing worker twice: its hex is skipped, and all its charges, the one it will spend there included, come off the next entries. If marches become claims, read the craving off the standing-only bit, or subtract only the charges of spades that hold no claim.
- **Gain.** Fewer wasted marches and re-aims, so more builds from the same workers. The plain plan of section 5 shows what distinct targets give.
- **Risk.** Without the optional rule, a far worker holds a hex that a near one could lay sooner. The march end is a second read of a piece's position under the plan's memo; it must be written on every ask, as `unclaimed` is, or the shadow check (`setSlateShadow`) fails.
- **Bug or choice.** A plain bug.

### Fix 3: the worker's price counts the charges that will really land

- **Explains** cause G (24% of the bare hexes) and the 35% of bare hexes the plain plan cannot reach with the charges held: too few workers for the growth.
- **What is wrong.** `spokenFor` (`src/ai/plan.ts`) takes every charge of every spade on the board, and of every spade queued in another town, off the front of the empire's best worked entries, as if each charge lands there at once. In the games the charges land at one build in four worker-turns, about half on unworked ground, and the wild takes a fifth of the workers with most of their charges. So the craving reads the ground as covered while it waits; the worker wins 12% of the build decisions where bare hexes wait.
- **Change.** In `explainWorkerCraving`, walk each spade on the board along the seated list with its own landing clock, as the craving already does for the new spade: from where it stands, at its stride, one hex at a time, inside `workers.waitingTurns`. An entry no spade on the board reaches inside the bound stays open for the new one. With fix 2 in place, start each spade at its claim.
- **Gain.** More workers in the seats whose ground waits longest, and none where the workers already cover it.
- **Risk.** More workers cost hammers away from settlers, soldiers and walls, and give the wild more civilians to take. One walk a spade costs more time in each build decision than one subtraction. The figure moves the slow-tier pins.
- **Bug or choice.** A bug in the reading: the BP8 ruling prices "the yield of the hexes it would improve in the next 20 turns", and the present subtraction does not read the turns.

### Smaller fixes and open choices

- **Fix 4, the wild's toll.** The wild takes a fifth of the workers. BP13 is building soldiers that move to protect workers. Measure the bare share again after it lands, before tuning anything else here.
- **Fix 5, shorter marches.** `workers.walkDiscount` (0.12 a hex) lets a worker cross an empire for a slightly better hex: 28% of marches are 6 hexes or more. Fixes 1 and 2 should shorten them. Sweep the knob in the parameter pass, after them.
- **Fix 6, a worker in the gold book (a choice for the user).** The want book (`purchasingPlan`, `src/ai/wants.ts`) has rows for buildings, garrison soldiers, routes and hexes, and none for a worker. A seat never buys a worker with gold, even with thousands banked late (BP8 found 8,749 gold in one seat at turn 150). A row priced by the craving would turn late gold into improvements.
- **Fix 7, the measure (a choice for the user).** 6% of the bare worked hexes (29) have only rows that give nothing on the hex: a qanat (it waters its neighbours) or a lumbermill or camp that takes away faith or culture the bare forest pays. The bot is right to leave them. A measure of "bare with an improvement that adds yield" would leave them out. A qanat's worth to its neighbours is not priced by the plan, and the roster does not list it; that is a separate question.
- **Not needed: `wakeIdleWorker`.** Asleep, idle and woken workers are 0.4% of worker-turns to turn 100. BP8's wake arm works.

## 7. What this study did not measure

- **No fix was built or played.** The gains above are readings of the bots' own games and a yardstick, not measured outcomes.
- **Seven seeds, not eight.** The coordinator asked for 4 to 6 seeds; seed 5 was not started. The ten-turn follow, the plain plan, the idle improvements and the exact shared targets are on six seeds (seed 42 ran on an earlier probe).
- **The plain plan is crude.** It ignores terrain costs, embarking, danger and the wild, and it lets a build land on the turn of arrival. It is a yardstick, not a forecast.
- **The F rule is seat-wide.** One worker of the seat on unworked ground puts every waiting hex of the seat in F. The nearest-worker reading (45% of bare hexes) is the narrower figure.
- **Luxury pay.** The cost of an unworked luxury build is overstated: its contentment and coin need no citizen and are not counted here.
- **Food over time.** The cost table counts yields at one turn. It does not count the growth an earlier farm would bring.
- **The danger at a worker's hex** was read as `civilianDanger` reads it, from outside the bot (any hostile combatant within the escort radius and no soldier of the seat within it), not by calling the bot's own function.
- **Turns after 125** were not played.

## Files

- This file.
- The probe, the analysis scripts and the raw records are in the session's scratch folder `barehex/` (`probe.ts`, `analyse.py`, `tables.py`, `out/`), and the records and the probe are also in `/Users/jacky/code/webciv-baselines/4b4c0872/six-seat-standard-t125/`.
