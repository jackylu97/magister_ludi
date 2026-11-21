# Mid-turn unit latency on the Apple M4

On the turn 120 save, picking, movement range and board updates took time during selection. The first move also updated sight and refreshed the HUD. Across 24 selections and eight moves, the game made 600 reads of city yields, empire yields or empire meters. None of those interactions called `explainCity` or `explainEmpireLines` to calculate a full yield breakdown before visible feedback. Commands that change the economy or reveal new ground can produce different results. [Per-click measurements](midturn-latency-2026-11-20.json)

## Response times

An alternate route on the same save shows when a move can trigger those calculations. A swordsman walked through Dawnreach on its way to (51,24). Entering and leaving the city each invalidated the economy cache because a city can read its garrison. The move revealed no new tiles. The deferred HUD refresh then recalculated 17 city yield lists and one empire yield list between the first and second walking draws.

With bot preparation off, those calculations took 6.3 ms within an 11.5 ms HUD refresh. With preparation on, they took 8.5 ms within a 13.5 ms HUD refresh. The second capture identified the caller. The yield strip at the top of the screen made the empire read and triggered all 18 calculations. The move command itself took 2.5 ms in each capture. The model reached one CSS pixel after 39.2 and 43.2 ms. This was one route tested twice. It identifies a source of mid-turn work without establishing how often it occurs in a full game. [Alternate route, commands and timings](midturn-latency-2026-11-20.json)

The table gives milliseconds from pointer release to a submitted board draw. Each selection rebuilt its ring on the intended tile. Each move displaced the intended walking model by at least one CSS pixel under the current camera. Later selections are the median of five clicks. [Timings and display boundaries](../../../scripts/input-latency/README.md)

| Run order | Bot preparation | First selection | Later selections | First move | Second move |
|---|---|---:|---:|---:|---:|
| 1 | On | 30.6 | 19.4 | 45.4 | 35.4 |
| 2 | Off | 39.4 | 17.0 | 37.4 | 35.5 |
| 3 | Off | 35.4 | 19.3 | 40.8 | 35.2 |
| 4 | On | 36.1 | 16.4 | 40.8 | 32.0 |

- **Input delivery.** Chrome delivered all 32 releases to the page within 0.3 to 1.5 ms of their input timestamps. The last five selections in each run generally answered in one or two display intervals.
- **First selection.** The board spent 8.7 to 11.0 ms updating its layers. Exact model, badge and ground picking together took 5.9 to 8.4 ms. The movement range also checks whether nearby friendly units could swap places. These costs depend on the unit and the board around it.
- **First move.** The reducer took 2.7 to 3.9 ms, including 1.7 to 2.4 ms to update sight. The board spent 4.0 to 5.1 ms updating layers. The main HUD refresh took 5.2 to 7.7 ms. In all eight moves the first drawn pose moved 0.11 to 0.53 CSS pixels. The second draw crossed one pixel. Measuring only the command or the next render would miss that delay.
- **Bot preparation.** The coordinator's request overlapped five of 16 inputs in the enabled runs. The page spent zero time posting a bot request during those five windows. Both second moves overlapped planning and took 35.4 and 32.0 ms. The matching moves with preparation off took 35.5 and 35.2 ms. These samples give no stable latency penalty for leaving planning on. A worker can run while the main thread handles input. Its elapsed time includes waits for seat workers and does not measure the CPU capacity taken away from rendering. [Phase timings, worker intervals and walking distances](midturn-latency-2026-11-20.json)

Sampling the first walking pose after board updates is worth testing. A second candidate is the HUD refresh that can run between the first and second walking draws. Compare one change at a time against the same actions. The captures measure submission by the game. A later compositor event can still contain an earlier frame.

## Reproduce the measurement

The capture used game commit `d77c22c5`, a fixed camera radius of 7, seat 0, 489 units and 74 cities. The painted board used the default 1.5× resolution at 2205 by 1189 buffer pixels. Chrome reported Apple M4 Metal and ten logical processors. Four fresh headless Chrome processes ran in sequence. The central test suite had finished and the playtest server had no connected clients before the captures. Other Mac applications could still use the CPU or GPU. The fixed inputs and full save hash are in the measurement file. [Environment and inputs](midturn-latency-2026-11-20.json)

```sh
node scripts/input-latency/check.mjs
gzip -dc scripts/input-latency/fixtures/turn120.json.gz > /tmp/magister-input-turn120.json
node scripts/input-latency/run.mjs --snapshot /tmp/magister-input-turn120.json \
  --actions scripts/input-latency/turn120-actions.json \
  --modes on,off --out /tmp/unit-on-off.json
node scripts/input-latency/run.mjs --snapshot /tmp/magister-input-turn120.json \
  --actions scripts/input-latency/turn120-actions.json \
  --modes off,on --out /tmp/unit-off-on.json
```

The same runner accepts an exported save and can find its own legal targets. Each run outputs full nested spans, main-thread times counted once, worker request windows, input queue times and walker displacements. It requires Chrome and Playwright. [Setup and report fields](../../../scripts/input-latency/README.md)

To reproduce the move through Dawnreach, use the second action list with the same snapshot. [Dawnreach actions](../../../scripts/input-latency/turn120-city-actions.json)

## Switching between two movement outlines

The first five Dawnreach clicks alternate between pikeman 1293 and swordsman 818. The renderer rebuilt the swordsman's outline on the fourth click even though its 53 reachable tiles and the terrain were unchanged. One browser trace recorded 14.2 ms in the overlay build for that click.

The renderer now keeps the last two outlines. The selected tile, the set of reachable tiles and the terrain must match. A change to the terrain releases both outlines on the next build. The additional stored outline uses about 20 KiB for this pikeman or 113 KiB for this swordsman.

An offline comparison used the first five clicks, the saved movement ranges and painted terrain meshes around both units. It measured the CPU time inside the overlay build. After eight warm-up pairs, 36 pairs alternated which version ran first. Across the last three clicks, the median total fell from **7.83 to 0.25 ms**. The repeat swordsman click alone fell from **4.88 to 0.08 ms**. All five clicks produced the same geometry bytes, instance transforms, colours, opacity and draw order. The first selection of each distinct outline still needs to sample the ground. This measurement ends before the board draw. [Overlay implementation](../../../src/render3d/overlays.ts)

Two costs remain visible in the input traces. On the repeat swordsman click, the two exact model picks took 17.1 ms combined with bot preparation on. On the pikeman's first move, the HUD refresh took 18.3 ms between the first walking draw and the draw that reached one CSS pixel. Time those two paths separately on the same save. A worker in flight during either event does not establish how much main-thread work it delayed.

## Turn 73 in native WebKit

The exported save replayed 2,746 commands to turn 73 with 231 units and 28 cities (seed 900373). A fresh WKWebView showed Pasargadae, Ecbatana, Susa, Babylon and Sardis together. The camera centre and radius were reconstructed from the visible cities. The radius was 13, the board buffer was 2205 × 1189, and the pixel ratio was 1.5. The daylight scene had shadows and bot preparation on. Idle motion continued. Another Chrome capture and the player's WebKit client were active on the Mac.

Each sample moved the camera along the same path for 2.3 seconds. The camera returned to the starting point between runs. The two pan pairs reversed the setting order. FPS counts submitted board draws during the sample. P95 describes the gap between draws. [Repeat the camera measurement](../../../scripts/input-latency/README.md#measure-camera-motion-in-safari-or-another-browser)

| Camera motion | Yield symbols | Board FPS | P95 gap | Longest gap | Median draw calls | Median triangles |
|---|---|---:|---:|---:|---:|---:|
| Pan 1 | On | 14.4 | 144 ms | 160 ms | 429 | 1,744,041 |
| Pan 2 | Off | 10.2 | 155 ms | 246 ms | 418 | 1,735,344 |
| Pan 3 | Off | 12.5 | 97 ms | 132 ms | 418 | 1,735,344 |
| Pan 4 | On | 15.1 | 114 ms | 162 ms | 432 | 1,748,125 |
| Zoom 1 | On | 14.6 | 94 ms | 121 ms | 439 | 1,901,516 |
| Zoom 2 | Off | 16.1 | 84 ms | 93 ms | 432 | 1,909,270 |

The lens rebuilt zero times during these six camera motions. Hiding the symbols removed draws but gave no consistent frame benefit. On the two pans with the symbols visible, the CPU spent a median of 10 and 8 ms inside the painted renderer per board frame. Browser animation callback gaps reached 143 and 113 ms at p95. These measurements include system contention. They do not separate GPU work from browser scheduling or display presentation.

A trusted right-click moved swordsman 516 from (24,41) to (25,41). In the first capture, the release waited 22 ms for delivery. The first submitted walking draw followed 286 ms later, 308 ms from release. The projected figure had moved 16.4 CSS pixels. Command processing took 18 ms, including 9 ms for sight. The hover check after the move refreshed the lens for 43 ms inside the model pick. The first board frame refreshed it again for 9 ms. No background bot request overlapped this click. The private WebKit window did not deliver the test's left-clicks, so this capture establishes a move time only.

The picker now asks whether the ray hits a unit's body before preparing objects that might hide it. A hit still checks the current terrain and lens markers. An offscreen replay compared the old and new paths on the same move and camera. Both issued the same command and found no unit body under the pointer. The old path rebuilt the lens twice. The new path rebuilt it once, in the board frame. At the time of the move, the swordsman had activated the Explorer lens, with resource pins and yield symbols on. No matching native WebKit timing was available after the change. [Picker](../../../src/render3d/unitModelPicking.ts) · [Move and picking tests](../../../test/render/frameDirty.test.ts)

### GPU time and repeated yield symbols

A headless Chrome run used the same turn 73 board, the five-city view, the 1.5× board buffer and Apple M4 Metal. The warmed control pan produced 53 board frames at 30.0 FPS. The median CPU submission took 3.8 ms. The WebGL elapsed timer recorded a median of 23.9 ms and a p95 of 28.1 ms on the GPU. The median interval between submitted frames was 33.5 ms and the p95 was 36.8 ms. In the first control pan, median CPU and GPU times were 7.9 and 45.5 ms. The earlier native WebKit measurement used a different engine under different system load.

An experiment shared one buffer of yield symbols between the three horizontal copies of the map. Three.js could then skip copies outside the camera. Resource pins kept their original buffers. During the ordinary pan the glyphs still needed 14 draws. Their submitted triangles fell from 11,196 to 3,732, within a frame that submitted about 1.75 million triangles. Their transform buffers fell from 358,272 to 119,424 bytes.

| View | Matched GPU pairs | Pairs faster with shared glyphs | Median change in GPU time | Changed RGBA channel values |
|---|---:|---:|---:|---:|
| Five cities, Explorer lens, pins and yields | 16 | 8 | 0.04 ms slower | 892 |
| Five cities, yield symbols only | | | | 847 |
| Map seam, all tiles revealed, Explorer lens, pins and yields | 16 | 6 | 0.81 ms slower | 1,084 |

The paired GPU draws alternated which version ran first at each camera position. Separately, comparisons of the full colour buffer held the camera, animation time and fog fixed. Repeating the control matched every channel at each view. The experiment changed the picture and gave no consistent frame saving. The game keeps its existing glyph batches. [Glyph construction](../../../src/render3d/lens3d.ts) · [Shared copy implementation tested](../../../src/render3d/instances.ts) · [Pixel counts and paired GPU times](turn73-glyph-wraps-2026-11-21.json)

### Land triangles hidden by fog

Whole unexplored land chunks already skip the draw. The next experiment removed fully hidden triangles from partly explored chunks. It kept the original vertex order and dropped a triangle only when all three vertices read an unexplored tile. The original geometry still served picking, terrain height and ground paint. Remembered ground kept its geometry. [Land batches](../../../src/render3d/paintedBoard.js) · [Fog shader](../../../src/render3d/paintedFog.js)

The headless Chrome test used the same save, Apple M4 and 1.5× board buffer. It timed twenty pairs of full board draws per view, alternating which version ran first at each camera position. Each row counts the ordinary land triangles submitted to the main camera. Near the seam, the player had explored little of the ground in view.

| View | Land triangles before | Triangles removed | Pairs faster with filter | Median paired GPU change |
|---|---:|---:|---:|---:|
| Five Persian cities, radius 13 | 179,862 | 27,808 | 13 of 20 | 0.31 ms faster |
| Frontier near (30,41), radius 8 | 620,455 | 68,927 | 12 of 20 | 0.19 ms faster |
| Map seam, radius 13 | 3,786 | 3,264 | 10 of 20 | 0.05 ms slower |

All 10,486,980 colour bytes matched at each view, including after a fresh shadow draw. The new tile at (30,41) matched at 30, 150 and 300 ms of its reveal. Switching to an all-visible map restored all 210,617 submitted land triangles in the five-city view. The test started after the ground paint was ready. It did not exercise worker delivery or a live change to terrain height.

The game keeps the existing land batches. Preparing the filtered indices took 45.1 ms of CPU time and allocated 1,588,704 bytes for 44 geometry records by the first comparison. The small GPU savings do not justify that cost on a turn when the player discovers new ground. [Paired GPU times and colour counts](turn73-hidden-land-2026-11-21.json)

### What costs a frame on turn 73

In an isolated headless Chrome session, the Apple M4 drew the five-city view at the default 1.5× resolution. The camera had a radius of 13. Explorer, resource pins, yields and shadows were on. At each camera position the diagnostic drew the full picture and then repeated the draw with one part omitted. The order alternated. Each row has 24 pairs. GPU time covers the board draw. Removing a surface can expose another one, so the rows do not add to the total.

| Part omitted | Median GPU time saved | Faster pairs | Median triangles omitted |
|---|---:|---:|---:|
| Trees | 6.47 ms | 23/24 | 926,165 |
| Land | 4.11 ms | 24/24 | 179,862 |
| Water | 3.72 ms | 24/24 | 194,423 |
| Contact shadows | 2.54 ms | 21/24 | 3 full-screen triangles |
| Towns | 0.19 ms | 14/24 | 24,079 |
| Units | 0.13 ms | 13/24 | 139,442 |
| Identical picture twice | −0.28 ms | 12/24 | 0 |

A separate CPU check compared the existing ground picker against a version that searched a smaller list of terrain meshes. We tried 1,020 warmed pointer rays across the five cities and both map edges. All 878 hits and 142 misses matched, including the triangle, instance, distance and point. The median time for all 1,020 rays fell from 26.15 to 24.00 ms. That saves about 0.002 ms per pointer event, so the current picker stays in play. The test covered ground picking. A click on a unit also tests its model and anything in front of it. [All render groups, GPU pairs and ground-pick timings](turn73-render-costs-2026-11-21.json)

### Trees at the edge of the camera

In the five-city view, 95.5% of the submitted tree triangles belonged to trees whose bounds reached the camera. At the closer frontier, that share fell to 45.9%. The existing renderer already removed hidden trees and whole groves outside the camera. This check measured the trees left inside partly visible groves.

The renderer now shortens a draw when its last trees lie entirely outside the camera. Each bound includes the tree's full wind motion, rotation and scale. Each camera gets its own count. The renderer restores the whole grove before a fresh shadow draw. Fog changes can reuse a slot for a different tree, so the bounds follow changes to the instance matrices. [Culling code](../../../src/render3d/copyCulling.ts) · [Tests](../../../test/render/copyCulling.test.ts)

Two independent headless Chrome sessions used the turn 73 save at 1.5×. The second ran the views in reverse order. The table gives the median difference in full-frame GPU time between two draws from the same camera position. Positive values mean less GPU time with the change.

| View | Tree triangles skipped | First run, 24 pairs | Repeat, 36 pairs |
|---|---:|---:|---:|
| Five Persian cities, radius 13 | 24,721 of 932,991 | −0.44 ms, 9 faster | +0.32 ms, 21 faster |
| Frontier near (30,41), radius 8 | 116,597 of 779,437 | +0.98 ms, 19 faster | +0.64 ms, 26 faster |
| Map seam with no trees | 0 | +0.07 ms, 13 faster | +0.10 ms, 19 faster |

All 10,486,980 colour bytes matched in every fixed view, including after a shadow update and with the camera settled. A second experiment copied all trees that could remain on screen into new draw buffers. At the frontier it saved 1.60 ms of GPU time in the first run. Median frame submission rose from 6.65 to 8.00 ms. Shortening the draw uses the original buffers. Its gain repeated at the frontier. The five-city results had opposite signs. [Full pose timings and pixel checks](turn73-offscreen-trees-2026-11-21.json)

### Simpler tree crowns at normal zoom

A separate trial clustered each sculpt into a 5 × 7 × 5 grid. It kept the tree positions, instance attributes and wind. At radius 13, the five-city view submitted 720,866 fewer triangles per frame. Across 24 paired draws the median GPU time saved was 4.58 ms. All 24 pairs improved. Drawing the current trees twice gave a median difference of −0.09 ms.

The crowns had broader facets at normal zoom. Restoring the original meshes reproduced every colour byte in the reference image. This trial measured GPU time for the whole frame. It did not measure input latency or FPS. The playtest update uses the original crowns. [Paired timings and image comparison](turn73-render-costs-2026-11-21.json)
