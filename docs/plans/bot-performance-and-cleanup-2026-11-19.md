# Bot checks, turn performance and code cleanup

The user approved parallel work on the following items on November 19. Bot tuning comes later. The checkout at `2d7b503a` is the reference for the current game in these comparisons.

- Run the 16-seed bot comparison against the build before BP13, as requested in `astra-handoff-2026-11-18.md`, section 3.1. Use the same maps, seats and turn limits on both sides. Record the versions and distinguish changes to the game rules from changes to the bot.
- Trace the change from 340 to 307 foundings on the five maps in the Stage C comparison in `performance-pass-2026-11-06.md`. Count settlers produced, lost and still active, and time to settlement. Compare the original serial live-board and frozen-board versions. Keep bot decisions unchanged.
- Profile the parts of `collectYields` on repeatable late-game boards. Apply a measured improvement if the yield breakdowns, assignments and game state still match. The prior phase timings are in `performance-pass-2026-11-06.md`, under “Frame timing on a painted board”.
- Start the code cleanup with contested great person recruitment (A1 in `code-quality-audit.md`). Verify its effect on a saved game through dispatch and replay. Preserve the winner of the contested choice and the losing seat’s replacement offer.
- Start the rendering pass with close-zoom ground paint from section 3.2 of the handoff. Check the implementation against the dated ground-paint plan and later rulings. Show changes to the picture before changing the playtest default.

Use the orchestrator for the full test suite. Keep long simulations at low process priority and avoid duplicate runs.

## Code cleanup

| Audit item | Result |
|---|---|
| A1. Contested great person choices | The redraw is an accepted, logged outcome. A two-seat contention in a six-seat duel on turn 62 produced a 1,456-command save. A full reload reproduced the board and the next recruit. |
| A2. Ownership of diplomatic terms | A trade or peace offer owns the terms at submission. Editing the draft after submission leaves the agreement and its save intact. Tests cover gold per turn, a luxury and a ceded city. |
| A3. Invalid saves | Both game loaders check the setup before normalization. A malformed command reports its position in the log. The schema version stays the same. |
| A7. Terrain worker messages | The regular typecheck includes the JavaScript senders and receivers. The shared type covers the terrain request, progress, early terrain, completion and errors. Geometry and asset payload internals still use their existing declarations and transfer tests. |

The next cleanup is A4. A failed boot can leave End Turn, resize and other event listeners attached. An ordinary restart or load adopts the new game into the existing interface. Test these two paths separately. After a failed boot and retry, a click, a resize or a shortcut should each act once.

A5 shares the same event handlers. The H, W, E and S keys open screens. The input guard prevents their global handlers from closing the same screens, although the handlers contain close branches. The help currently describes open actions. In Play already implements its own I shortcut to close. Coordinate edits with the Quiet Table work on the Faith screen.

A6 is independent. The Council preview drops timing and reroll history from unchanged chairs. The preview is used in hover totals and chair highlights. The review found no currently dealt card with a demonstrated incorrect payout. A fix belongs in the staging helper and its tests.

## Performance queue

- **End Turn.** The city changes reduced the median paired End Turn wait by 14 and 42 ms on two turn-120 boards in WebKit. The next CPU target is the happiness calculation while towns bank food, particularly the count of buildings that provide a yield. A card can change what a building provides, and the economy can change between towns. Reusing a value needs tests for both cases. [City measurements](city-yield-performance-2026-11-19.md)
- **Terrain and load time.** The two terrain meshes now share their initial grid. At close zoom the next visual test is a denser texture limited to the visible ground. Check sharpness at beaches and river banks, the memory limit on Giant, picking and unit heights at the map seam, and what the player sees while the texture loads. The far-zoom mesh can then be tested with roads, borders and hill silhouettes. [Terrain measurements](ground-paint-texture-2026-11-18.md)
- **Bots.** The [16-seed comparison](bot-strength-2026-11-19.md) found five victories by the turn limit on the current build and none before BP13. Four winners occupied the same fixed seat. Rotating the seat, persona and deck assignments would help separate their effects. The [settler trace](bot-settler-trace-2026-11-19.md) found 29 fewer settlers produced in the historical comparison. On the map with the largest decline, more cities could build settlers, but fewer selected one. Before changing expansion weights, compare the inputs to the city’s settler production score. Bot tuning remains a later task.
