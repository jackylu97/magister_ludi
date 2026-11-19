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
| A7. Terrain worker messages | The regular typecheck includes the JavaScript senders and receivers. The shared type covers the terrain request, progress, early terrain, completion and errors. Geometry and asset payload internals still use their existing declarations and transfer tests. |

A4 and A5 are complete. Startup now releases failed attempts. Chromium verified Begin, End Turn, resize, keyboard shortcuts, Restart and Load on the flat and painted boards. [Startup report](boot-cleanup-2026-11-19.md)

A6 is complete. The Council preview preserves the timing and reroll count of an Order that Confirm leaves in its chair, including a card returned to that chair. Moving or replacing it starts new chair history. Remaining cleanup includes the internal terrain-worker transfer buffers. The outer message types already pass the regular typecheck.

## Performance queue

- **End Turn.** Counting buildings now reuses the card payment list within each town count. This saved a median of 47 ms and 2 ms across paired End Turns on two late boards. On the earlier WebKit profile, the second board spent 86 ms resolving barbarians and 77 ms spending leftover movement. Measure repeated movement-profile and route calculations in those phases. [City happiness measurements](city-happiness-performance-2026-11-19.md)
- **Terrain.** The close-zoom trial is available at `/?closeGround=1`. Before making it the default, review beach and river sharpness, measure fast dragging and test a full Giant board. Then test coarser far-zoom terrain with roads, borders and hill silhouettes visible. Replacing the cut geometry also requires picking, unit placement, static shadows and initial load to work without it. [Terrain trial](close-terrain-trial-2026-11-19.md)
- **Bots.** Four of five wins in the 16-seed comparison came from one fixed seat. On seed 2026, exchanging only the decks or only the personas of seats 2 and 3 removed the original turn-100 win. Repeat on more maps with each factor varied separately. The settler trace found eight matched town, turn and site pairs where the proposed town value went from positive to negative. Five had unchanged or shorter build times. Trace the components of that town value before changing any weights. [Victory comparison](bot-strength-2026-11-19.md) · [Settler scores](bot-settler-trace-2026-11-19.md)
- **Tests.** The duel digest and the card audit now share one 120-turn game. The next candidate is the turn-60 snapshot shared by the two-seat bot and ledger checks. Preserve the independent second playthrough that checks determinism. In the card audit, measure how much time it spends calculating an unchanged empty-card score before deciding whether to reuse it.

## Playtest verification

Playtest commit `63fb9363` passed typecheck, the production build and all 12,437 tests in 585 files. Both bot digests matched. The full suite took 16 minutes 34 seconds with three workers. The previous run took 23 minutes 13 seconds with three workers. Host load differed between runs. A Chromium check on port 5199 also verified the trial URL, Council chair history, pillage and repair, deal ownership and saved choices.
