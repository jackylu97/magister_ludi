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
