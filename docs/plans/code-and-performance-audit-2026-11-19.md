# Save reliability, unit rendering and bot performance

Three read-only audits examined commit `85603d21`. The first implementation batch can cover save storage, visible unit rendering and bot plan memory in parallel. Each has separate code and a specific check. The proposed frame-time improvements need a browser measurement on the changed build.

## First batch

### Preserve the last successful save

The slot writer replaces the payload before it writes the label. If the label write fails, the error handler deletes both keys. A probe started with a working Quick Save and refused only the replacement label write. The game reported a failed save, the list became empty and reading the old save returned null. A second probe issued two saves to the same slot. The older request finished packing last and overwrote the newer request.

Make a slot replacement atomic and order overlapping writes to the same slot. Retain support for existing plain and packed saves and for listing slots without decompressing every game. Test failure on an empty and an occupied slot, and an older save that finishes packing after a newer one. Load the surviving game and compare its command log. [Slot writer](../../src/ui/saves.ts#L384) · [Manual save entry](../../src/main.ts#L6174) · [Storage failure tests](../../test/ui/saves.test.ts#L285)

### Skip unit rebuilds for hidden moves

On four saved boards, moving an enemy between two unseen cells changed both unit fingerprints. The visible pieces and their stack positions stayed identical. The renderer rebuilt the unit batches and invalidated the moving shadows. On seed 999 at turn 120 the local player could see 145 of 520 units.

Use the inputs that affect the pieces this seat can see, including changes to visibility, stance toward another empire and stacks. Check that the hidden move produces zero rebuilds and shadow invalidations. Move the same unit into sight, then verify appearance, picking, garrison badges and shadows. Repeat with a seat change and in spectator mode. Measure frame time on the same boards. [Unit fingerprint](../../src/render3d/pieces.ts#L1877) · [Visibility fingerprint](../../src/render3d/layerVisibility.ts#L14) · [Rebuild decision](../../src/render3d/renderer3d.ts#L4275)

### Release bot explanations as each command is recorded

An ordinary browser worker keeps a seat's full decision objects until its last command. It then clears the explanations before sending the plan back. On turn 120 of seeds 42 and 999, one seat's explanations accounted for 1,718,685 and 870,812 bytes of serialized JSON across 27 and 28 steps. These counts measure the size of the retained content. Heap use, garbage collection and timing still need measurement.

Let the plan writer retain explanations only when a consumer asks for them. Exercise the browser workers and the serial planner. Compare commands, accepted and refused outcomes, bot memory and the final state. Compare the spectator's score terms and explanations in full. [Plan writer](../../src/ai/frozenBoard.ts#L342) · [Worker reply](../../src/ui/botPlanProtocol.ts#L61)

## Other findings

| Area | Evidence | Next change and check |
|---|---|---|
| Unit review poses | Two unit types sharing one sculpture requested rotations of 0.4 and 1.2 radians. Both received the first rotation. The shipped mapping used the imported model only for the swordsman when audited. | Store rotation per placement. Test both lookup orders, shared geometry and disposal. Address this before comparing sculpt variants in the model viewer. [Model cache](../../src/render3d/paintedUnits.ts#L97) |
| Worker build and repair | The rules allowed a player with Outposts to rebuild a damaged Outpost on a reachable neutral tile. The worker panel hid the build and displayed a blocked Repair. Razing a town can leave this position. | Have the worker options choose between building and repairing. Test the free repair on owned land and the legal charged build on neutral land. [Build options](../../src/ui/controls.ts#L667) · [Panel filter](../../src/ui/unitPanel.ts#L967) |
| Hovering a unit badge | Each eligible pointer sample can walk the unit list six times. That is 3,120 roster visits on the 520-unit save, before checking towns or projecting positions. | Reuse world-space badge positions until the relevant pieces, seat or terrain change. Project through the current camera. Compare picked IDs on map seams, moving units, garrisons and covered traders. [Hover](../../src/ui/controls.ts#L8170) · [Badge positions](../../src/render3d/pieces.ts#L752) |
| Yield overlay | With tile yields visible, confirming four accepted Council slot commands requests five immediate builds before the next frame. | Mark the overlay as needing an update. Build it once after state changes and before drawing. Compare the geometry after a Council change, founding, an improvement and a seat change. [Council commands](../../src/ui/controls.ts#L4024) · [Lens rebuild](../../src/render3d/renderer3d.ts#L3167) |
| Applying finished bot plans | Earlier WebKit measurements on two turn-120 positions recorded 48 and 107 ms to apply prepared bot commands on the page. UI reporting and the human End Turn were outside that measurement. | Measure the current build. Try yielding between complete commands on the browser path. Compare the longest frame gap and total End Turn time. Test divergence, notifications, save and restart during a yield, and the final state and log. [Replay loop](../../src/ai/driver.ts#L373) · [Earlier measurements](performance-pass-2026-11-06.md) |
| Auto-exploration | Using the existing neighbor-index table saved a median 1.75 and 1.65 ms per board across seven alternating warm Node pairs. All 30 explorers returned the same targets and examined counts. | Replace coordinate allocation in the search loop. Check the map seam, poles and equal-distance tie order. [Explorer search](../../src/sim/explore.ts#L260) · [Neighbor table](../../src/sim/map.ts#L561) |

For comparison when reviewing new sculpts, the current worker body has 992 triangles, the archer 1,468, the swordsman 1,508 and the war elephant 1,620. These geometry counts exclude outlines and shadows. Compare new models with the current pieces at the same camera angle and unit count before setting a budget.

## Implementation results

| Change | Verification |
|---|---|
| Ordinary games release bot explanations after recording each command. Spectator mode retains the explanations. | On turn 120 of seeds 42 and 999, the ordinary planner retained zero explanation trees, down from 68 and 119. The commands, outcomes, bot memory and final game state matched the earlier build. The spectator kept the same scores and reasons. |
| The renderer skips a unit rebuild when an enemy moves between two cells under fog. | Across four archived boards, all 28 hidden moves kept the same visible pixels and skipped the rebuild. On the 520-unit board, the median time for the unit layer fell from 5.5 ms to 1.2 ms. This measurement excludes the other board layers. |
| Auto-exploration reads adjacent cells from the map's existing index. | All 30 archived searches chose the same targets and examined the same number of cells. Across 15 paired Node runs, the median saving per board was 1.57 ms on seed 42 and 1.51 ms on seed 999. |
| Each unit type keeps its own rotation when it shares a sculpture with another type. | Tests requested both types in both orders, changed a rotation and verified that both types still shared one mesh. The kit released the geometry once. |
| Workers can rebuild a damaged neutral Outpost when the Order and range allow it. | The worker panel offered a charged build on neutral ground. The command claimed the tile and set a new build date. Repairing an owned farm preserved the original date and the worker's charges. |
| Each save now replaces its payload and a copy of its label in one storage write. The shelf normally reads the separate small label. | A failed replacement preserved the previous game. An equal-sized save replaced an existing slot at full quota. Chromium ordered two Quick Saves across same-origin frames while Autosave finished independently. Without Web Locks, write order is guaranteed only within a tab. An older packed save needs room for one short header on its first update. |
| Badge picking reuses world positions and projects them through the current camera. | On seed 999 at turn 120, 700 pointer samples picked the same units. Full roster scans fell from 4,200 to 4. Median Chrome time per 100 picks fell from 47.4 ms to 3.2 ms, including projection. |
| Commands that change tile yields before the same frame share an overlay redraw. | Four accepted Council commands and their final repaint requested one build, down from five. The number, position and shape of the glyphs matched an immediate rebuild after the Council changes, a founding, a new farm and a seat change. |

### Bot replay and a save during End Turn

The browser still applies each finished bot reply in one call. A prototype let it draw between commands. In a four-seat game, a manual save after the first of 13 attempts reloaded the correct saved position. When play resumed, the bot planned 13 attempts for the remaining work instead of the original 12. Its fourth command changed citizen focus. The original fourth command ended the seat's turn. The resulting log, bot memory and game state differed.

Before spreading replay across frames, the game needs a way to save and resume the rest of the prepared plan, or to take the save at a point where the plan is complete. A guard against running stale commands after a restart protects the new game but does not recover the saved game's continuation.

Four alternating warm pairs in foreground Chromium measured an 8 ms budget between complete commands. The table gives the median of the longest frame gap in each run and the median elapsed time. These runs include the real reducer, notifications and the human End Turn command. They exclude 3D drawing, panels, autosave and worker planning.

| Turn 120 fixture | Replay frame gap, current / prototype | Full turn frame gap, current / prototype | Elapsed time, current / prototype |
|---|---|---|---|
| Seed 42, 73 attempts | 34.8 / 17.1 ms | 288.4 / 265.0 ms | 288.2 / 337.6 ms |
| Seed 999, 124 attempts | 76.2 / 17.4 ms | 442.2 / 371.8 ms | 442.1 / 538.5 ms |

Both runs preserved the final state, RNG, log, bot memory and notifications when allowed to finish. Turn resolution itself produced the longest remaining gap.

### Verification on the playtest

Typecheck, the production build and all 12,497 tests passed at `d889c418`. The run covered 588 test files, including the slow tier. The checkout serving port 5199 already included those changes. In a fresh Chromium profile, two overlapping writes kept the later command log. Removing the cached shelf label still allowed the list and both load paths to recover the correct game. The same session also checked pillaging and free repair.

## Next renderer measurements

The user asked for repeated measurement of the Three.js renderer. Use a saved late-game board at normal zoom. Record the camera, viewport, pixel ratio, renderer, active effects and quality settings. Measure a stationary board and repeat the same camera pan and zoom. Capture frame times, draw calls, triangles and textures. Where possible, separate the time spent preparing the scene from GPU execution.

Use the most expensive measured operation to select the first experiment. Change one thing, repeat the scene and compare visible output. Use that result to select the second experiment. Keep changes with a repeatable gain and correct visuals. Record experiments that lose time or change appearance. Check controls, reduced motion and cleanup when a change affects them. [Three.js optimization skill](https://github.com/MengTo/Skills/blob/main/agent-skills/game-development/optimize-threejs-games/SKILL.md)

### Measured results

Chrome 156 used native Apple M4 Metal graphics. The viewport and drawing buffer were both 960 × 640. The camera used play radius 7, with the seat's usual fog, textures, shadows and reflections. The still and pan measurements used turn 120 of seeds 999 and 42. Timings through GPU readback include the wait for submitted draws to finish. Treat them as paired comparisons. All four quality-preserving prototypes produced identical still and pan captures on both boards.

| Experiment | What changed | Result |
|---|---|---|
| Trim offscreen ends of unit batches | Saved roughly 6,500 to 10,400 triangles per pan frame. | Seed 999 took 24.2 ms against controls of 22.0 and 23.3 ms. Seed 42 stayed in its control range. |
| Remove entirely fogged trees before submission | Saved 287,222 to 452,446 pan triangles, depending on the board. | Seed 999 pan rose to 25.2 ms. The seed 42 still view took 26.3 ms against controls of 24.0 and 25.2 ms. |
| Skip the stencil copy after the main pass | Removed one buffer copy per frame while keeping color and depth copies. | Seed 999's still median improved to 22.1 ms, but its 95th percentile got worse. Seed 42 pan went from 24.1 to 26.9 ms. |
| Skip ripple arithmetic at zero weight | Kept the water material's appearance and the submitted geometry. | Seed 999 gained 0.8 ms still and lost 0.3 ms panning. Seed 42 lost 0.3 ms still and gained 0.1 ms panning. |

All four remain experiments. The main color pass had the highest individual GPU median on both boards, at 10.1 and 15.0 ms. Removing all three contact-shadow draws changed seed 999's panning median from 20.7 to 20.8 ms.

As a diagnostic, flat shading isolated the cost of the full terrain and water materials. On the coastal seed 999, flat water saved 2.0 ms still and 1.15 ms panning. Flat land saved 0.85 and 0.70 ms. The two materials had similar costs on seed 42. A flat material changes the picture, so these figures bound the possible saving on these views. Each variant recorded 56 frames per scene and camera mode. The strict pan comparison used 32 matching pairs with the same draw and triangle counts.
