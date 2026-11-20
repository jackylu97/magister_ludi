# Base economy bot study, 2026-11-20

Five paired games ran on the standard 80 × 52 map with barbarians and six bot seats. Each game used the same seed and seat order before and after the price and yield changes. The seeds were 20260831 through 20260835. The seats used the digest roster in order (balanced, wide, tall, zealot, warmonger, balanced), with no named leaders, custom tuning or deck choices. Each run used the `sixSeatSpec` setup and the synchronous `driveBots` loop. It stopped at victory, a stall or the end of turn 150.

The baseline was commit `4825d475`. The candidate was commit `d3a2ff0e`, schema 251. It reduced science per citizen to 0.25, set Libraries to 3 science, Universities to 6 science and Amphitheaters to 4 culture. It set the military surcharge to 80%, the worker cost to 14 plus 4 per previous worker and the settler cost to 36 plus 9 per previous settler.

## Science and units

Each entry is a mean across paired seats on the same seed immediately after the named turn resolved. Science uses the Arena rate (`foldEmpireRates`). It includes town science and standing empire income. The game then applies Orders that pay only at empire level. One-time grants do not contribute to the Arena rate. Units include every live piece owned by the seat, including civilians. Eliminated seats remain in the sample.

| Turn | Paired seats | Science before | Science after | Change | Units before | Units after | Change |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 50 | 30 | 10.89 | 6.15 | -4.74 | 13.43 | 9.87 | -3.57 |
| 100 | 30 | 121.65 | 94.97 | -26.68 | 33.87 | 30.83 | -3.03 |
| 150 | 18 | 1073.76 | 1459.11 | 385.36 | 78.06 | 78.39 | 0.33 |

At turn 150, the independent samples cover 24 baseline seats and 18 candidate seats. Across all seats still observed, mean science was 1152.3 before and 1459.11 after. Mean units were 82.08 and 78.39. Games that ended early contribute no later rate.

The paired turn-150 science medians were **611.31 before and 483.01 after**. On seed 20260832, the sixth seat (balanced, ID 5) rose from 2,538.528 to 15,399.711 science per turn.

| Seed | Mean science before, turn 150 | Mean science after, turn 150 |
|---:|---:|---:|
| 20260831 | n/a | n/a |
| 20260832 | 1022.58 | 3063.14 |
| 20260833 | 957.66 | 795.19 |
| 20260834 | 1241.03 | 519.01 |
| 20260835 | 1387.94 | n/a |

### Seed 20260832, sixth seat

A second run of the candidate with the same config reproduced every recorded turn, event and seat checkpoint. Its city and empire yield lists explain the high science rate on turn 150. This run adds no seats to the sample.

The seat held 30 towns with 293 citizens. Money at Work pays each town science for the empire’s gold income. It paid 85 science in every town, or 2,550 in total. The Curia added 26 per town, or 780. Together they supplied 3,330 of the empire’s 5,214.25 science before percentages. The citizens themselves supplied 73.25, Libraries added 90 and Universities added 42.

City bonuses ranged from +131% to +166%. Each town then received the net empire bonus of +20% (+40% from happiness, −20% from authority). The capital, Cinderhold, held 20 citizens. The Grand Army paid it 426 flat science for 71 military units and The Curia added 128 to that payment. Cinderhold’s 827 flat science became 2,540.544 after its +156% city and +20% empire bonuses. The Polymath’s Study contributed 40 percentage points to the city bonus, The Boule 28 and The Pandects 25.

The towns produced 15,376.911 science after bonuses. Foreign caravan income added 19 before the empire bonus, or 22.8 after it. Together they gave the Arena rate of 15,399.711. The Scriptoria paid a further 5 science at empire level, or 6 after the bonus, bringing recurring science to 15,405.711.

[Science lines, percentages and populations for all 30 towns](base-economy-2026-11-20-science-sources.json)

## Ages, settlers and war

Counts show how many seats or games reached the event by turns 50, 100 and 150. Ages use the highest researched non-charter age. Age I starts on turn 1. Median turns use the seats that reached each event. The last two columns count pairs in which both runs reached the event and give the median change within those pairs. A positive change means later in the candidate. War counts use five game pairs. Other rows use thirty seat pairs.

| Event | Before by 50 / 100 / 150 | After by 50 / 100 / 150 | Median turn before | Median turn after | Both reached | Median paired change |
|---|---:|---:|---:|---:|---:|---:|
| Age I | 30 / 30 / 30 | 30 / 30 / 30 | 1 | 1 | 30 | 0 |
| Age II | 20 / 30 / 30 | 5 / 30 / 30 | 44.5 | 63 | 30 | 17 |
| Age III | 0 / 25 / 30 | 0 / 20 / 29 | 83.5 | 94 | 29 | 4 |
| Age IV | 0 / 2 / 25 | 0 / 0 / 18 | 126 | 129 | 15 | -3 |
| First additional settler acquired | 30 / 30 / 30 | 30 / 30 / 30 | 14.5 | 16 | 30 | 2 |
| First settler built or purchased | 30 / 30 / 30 | 30 / 30 / 30 | 15.5 | 17.5 | 30 | 2 |
| First war between real seats | 1 / 4 / 5 | 0 / 5 / 5 | 56 | 77 | 5 | 7 |

Additional settlers exclude the settler each seat starts with. Acquisitions use changes in unit ownership after each accepted command. Purchases use the accepted purchase command, production uses the increase in the empire’s settler count for pricing, and free grants and captures are recorded separately. War uses the first declared war between two real seats. In the event fields, null means the run ended before the event occurred.

| First additional settler source | Before | After |
|---|---:|---:|
| Production | 28 | 27 |
| Purchase | 0 | 0 |
| Grant | 2 | 3 |
| Capture | 0 | 0 |
| Unreached | 0 | 0 |

## Game coverage

| Seed | Completed turns before | Completed turns after | First war before | First war after |
|---:|---:|---:|---:|---:|
| 20260831 | 142 | 144 | 111 | 99 |
| 20260832 | 150 | 150 | 48 | 55 |
| 20260833 | 150 | 150 | 72 | 88 |
| 20260834 | 150 | 150 | 56 | 51 |
| 20260835 | 150 | 141 | 56 | 77 |

## Run checks

| Check | Before | After |
|---|---:|---:|
| Games decided before completing turn 150 | 1 | 2 |
| Stalls | 0 | 0 |
| Invalid bot orders | 0 | 0 |
| Repeated orders | 0 | 0 |
| Driver warnings | 0 | 0 |
| Rejected live attempts, including conflicts between simultaneous plans | 213 | 180 |

The bot driver records a plan conflict separately when an earlier seat changes the board before a later seat acts. The per-seed file lists the reasons plans stopped and the reasons the reducer rejected live attempts.

[Aggregate and paired changes](base-economy-2026-11-20-summary.json) · [Per-seed and per-seat observations](base-economy-2026-11-20-per-seed.json)
