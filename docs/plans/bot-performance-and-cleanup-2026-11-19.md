# Bot checks, turn performance and code cleanup

The user approved parallel work on the following items on November 19. Bot tuning comes later. The checkout at `2d7b503a` is the reference for the current game in these comparisons.

- Run the 16-seed bot comparison against the build before BP13, as requested in `astra-handoff-2026-11-18.md`, section 3.1. Use the same maps, seats and turn limits on both sides. Record the versions and distinguish changes to the game rules from changes to the bot.
- Trace the change from 340 to 307 foundings on the five maps in the Stage C comparison in `performance-pass-2026-11-06.md`. Count settlers produced, lost and still active, and time to settlement. Compare the original serial live-board and frozen-board versions. Keep bot decisions unchanged.
- Profile the parts of `collectYields` on repeatable late-game boards. Apply a measured improvement if the yield breakdowns, assignments and game state still match. The prior phase timings are in `performance-pass-2026-11-06.md`, under “Frame timing on a painted board”.
- Start the code cleanup with contested great person recruitment (A1 in `code-quality-audit.md`). Verify its effect on a saved game through dispatch and replay. Preserve the winner of the contested choice and the losing seat’s replacement offer.
- Start the rendering pass with close-zoom ground paint from section 3.2 of the handoff. Check the implementation against the dated ground-paint plan and later rulings. Show changes to the picture before changing the playtest default.

Use the orchestrator for the full test suite. Keep long simulations at low process priority and avoid duplicate runs. The duel digest and the card pricing audit both play the same six seats for 120 turns. Share this game within one test worker. Keep both map digests, all three card positions, the extra war-loss position and all existing checks. The Standard game can run in another worker.

## Code cleanup

| Audit item | Result |
|---|---|
| A1. Contested great person choices | The redraw is an accepted, logged outcome. A two-seat contention in a six-seat duel on turn 62 produced a 1,456-command save. A full reload reproduced the board and the next recruit. |
| A2. Ownership of diplomatic terms | A trade or peace offer owns the terms at submission. Editing the draft after submission leaves the agreement and its save intact. Tests cover gold per turn, a luxury and a ceded city. |
| A3. Invalid saves | Both game loaders check the setup before normalization. A malformed command reports its position in the log. The schema version stays the same. |
| A7. Terrain worker messages | The page and worker share the types for geometry, materials, instance buffers and hill data. TypeScript now checks how the worker packs these fields and how the page restores them. Transfer tests cover shared geometry, ordinary and instanced attributes, and missing, empty and populated hill lists. |
| A8. Incorrect comments | The dispatch comment now explains when a command enters the save log. The council comments identify the rite that updates an Order's reroll count. |

A4 and A5 are complete. Startup now releases failed attempts. Chromium verified Begin, End Turn, resize, keyboard shortcuts, Restart and Load on the flat and painted boards. [Startup report](boot-cleanup-2026-11-19.md)

A6 is complete. The Council preview preserves the timing and reroll count of an Order that Confirm leaves in its chair, including a card returned to that chair. Moving or replacing it starts new chair history.

## Performance queue

For this batch, the user chose movement performance, settler diagnostics, controlled deck and persona swaps on more maps, and code cleanup. The Giant terrain and drag trials are on hold.

The bot work in section 3.1 of the November 18 handoff has the following status.

| Item | Current build and remaining work |
|---|---|
| Spectator, arena and regular turns | All three use the same command runner. The spectator retains each step's candidates and scores. Regular games release them as each command is recorded. |
| Stage C2 and BP17 | Seat workers plan in parallel during the human turn. The game reuses a current result at End Turn. After a change to the board, it checks every bot again. Reusing an individual seat's plan after a change still requires a reliable way to identify all its inputs. |
| BP18 and T1, less frequent pricing | Bots reuse exact research paths. On five maps, reusing a research decision for two or three turns hurt play and gave no repeatable time saving. Prices for a new turn still use the current board. The purchase list has a further exact improvement below. |
| BP19 and T6, Council prices | The shortlist saved 0.35% of CPU time over 16 paired turns. The separate trial that combined it with new prices and a replacement margin reduced food production at turn 100. The game continues to price every candidate. |
| Game comparisons | The 16-seed comparison, the settler trace and the eight-map deck and persona swaps are complete. |
| Deferred work | The user deferred bot tuning, including the evolutionary search. The user also held the correction for 0.9% of retained context readings, which cost 5–8% of bot time in its trial. |

The reports include the test conditions, timing samples and results for each research and Council trial. [Performance measurements](performance-pass-2026-11-06.md#one-turn-runner-for-the-game-arena-and-spectator)

The bot now looks up production scores by item type and ID. Previously, if a building and a project shared a printed name, a puppet could keep the wrong item in its queue. A soldier now records when it waits for a ranged unit to attack. The spectator uses that decision to print the reason. On the same six-seat duel played for 25 turns, all 380 spectator steps, their 3,690 score terms, the command log and the final state matched the reference build at `581f324f`. [Bot audit, finding 13](bot-simplification-audit-2026-11-17.md)

- **End Turn.** Counting buildings now reuses the card payment list within each town count. Barbarians reuse the movement profile within one choice. Units with standing orders skip camp, city and improvement rules when the destination has no matching feature. On two turn-120 boards, the movement changes saved a paired median of 13 and 21.5 ms in the barbarian phase, and 19 and 22.5 ms in standing orders. [City happiness measurements](city-happiness-performance-2026-11-19.md) · [Movement measurements](movement-performance-2026-11-19.md)
- **Terrain.** The close-zoom trial is available at `/?closeGround=1`. Further visual trials are on hold. [Terrain trial](close-terrain-trial-2026-11-19.md)
- **Bots.** On eight selected maps, the original seats won five games by turn 120. Exchanging the deck pairs of seats 2 and 3 produced three wins, all by seat 2. Exchanging only their personas produced none. On seed 42, six of the eight settler sites that changed from a positive value to a negative one had their largest loss in authority or happiness. One lost planned building value and one lost credit for a wager. [Victory comparison](bot-strength-2026-11-19.md) · [Settler scores](bot-settler-trace-2026-11-19.md)
- **Tests.** The duel digest and the card audit now share one 120-turn game. The next candidate is the turn-60 snapshot shared by the two-seat bot and ledger checks. Preserve the independent second playthrough that checks determinism. In the card audit, measure how much time it spends calculating an unchanged empty-card score before deciding whether to reuse it.

### Army counts in the bot's purchase priorities

When the bot checks which soldiers it could buy, it first prices each soldier type in each city. During one evaluation, all rows use the same army count and all rows for one city use the same garrison count. The bot now computes each count once at that scope. A new evaluation still reads the current board.

The comparison covered the five bot seats on each of two Standard maps at turn 120. The counts include every call made while preparing prices for those seats, including calls outside the purchase list.

| Map seed | Army readings before | Army readings after | Garrison readings before | Garrison readings after | Commands replayed |
|---|---:|---:|---:|---:|---:|
| 42 | 3,468 | 183 | 3,288 | 76 | 72 |
| 999 | 3,026 | 191 | 2,857 | 85 | 119 |

In both games, the ordered purchase lists, their scores and the value assigned to each currency matched the original. Regular play and the spectator produced the same commands, state and bot memory. The spectator also preserved every candidate score and explanation. All 191 commands succeeded. [Original audit, finding 12](bot-simplification-audit-2026-11-17.md)

A separate timing run removed the counters and alternated the original and changed code on the same machine. After two warmup pairs, building a fresh price list for each of the five seats finished sooner in all eight measured pairs on each map. The median paired elapsed saving was 25.6 ms on seed 42 and 31.8 ms on seed 999. Process CPU time improved in four of eight pairs on seed 42 and seven of eight on seed 999. These timings cover the price calculation only.

## Playtest verification

Cleanup commit `39cdbfbe` passed typecheck, the production build and all 12,439 tests in 585 files. Both fixed bot games matched their expected digests. The full suite ran once in an isolated copy, with three workers, in 21 minutes 22 seconds. The two bot comparison runs shared the machine during this test.

In Chromium, a fresh Duel reached the playable board through all four terrain workers. They returned 380 mesh batches and one terrain packet. The compiled game and port 5199 both passed this check. The local server also passed the checks for Council chair history, pillage and repair, deal ownership and saved choices. The nine changed UI test files passed separately on the integrated playtest at `7ea464cb` (158 tests).
