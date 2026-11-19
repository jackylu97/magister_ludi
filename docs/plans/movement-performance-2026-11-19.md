# Barbarian turns and standing movement orders

The WebKit comparison used turn 120 on seeds 42 and 999. Each pair started from two copies of the same board after the bot seats played. The reference simulation was `581f324f`. Both versions dispatched the human seat’s End Turn and reached turn 121. Every run matched the reference’s serialized state, including the random generator, the complete command result and the command log.

## Where the time went

A separate Node run counted calls in the reference phases. The barbarian phase built 2,195 movement profiles on seed 42 and 1,595 on seed 999. A wandering unit rebuilt its profile for each possible destination. A unit approaching a target did the same for each neighboring hex. The candidate builds one profile per choice. It also checks distance, visibility, leash and land access before it reads the target owner’s protection from barbarians. The order of eligible tiles and the random draw stay the same.

Standing orders built 85 and 186 profiles, one per walk, and made 6 and 51 detour searches. Those walks processed 341 and 636 arrivals. An arrival now checks for a camp before reading the camp-clearing rule. It checks for a friendly city before reading the city movement rule, and for an improvement before looking up a town’s remount building. The checks still run at the original points in the arrival sequence. Each walk continues to read the current board for its movement profile, zone of control and any detour.

## Paired WebKit timings

The test alternated which version ran first. It discarded two warm-up pairs and measured ten pairs per board. The first two time columns give the median for each version. The last two columns use the difference within each pair.

| Seed | Phase | Reference (ms) | Candidate (ms) | Median saving (ms) | Faster pairs |
|---|---|---:|---:|---:|---:|
| 42 | Barbarians | 161.5 | 164 | 13 | 7/10 |
| 42 | Standing orders | 84.5 | 64.5 | 19 | 8/10 |
| 999 | Barbarians | 187 | 157 | 21.5 | 6/10 |
| 999 | Standing orders | 182 | 171.5 | 22.5 | 7/10 |

The one-minute host load average ranged from 72 at the start to 74 at the end. The absolute times varied between pairs. Full End Turn had a median paired saving of 19 ms and 88 ms respectively, and ran faster in six of ten pairs on each board. These measurements cover two late turns.
