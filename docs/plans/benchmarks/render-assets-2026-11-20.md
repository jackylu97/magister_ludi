# What costs a frame on the late-game board

The painted board on the Apple M4 spent 22.3 ms of GPU time at normal zoom and 26.5 ms at wide zoom. A 60 FPS frame has 16.7 ms for all its work. Trees, water, land and contact shadows accounted for the largest repeatable differences. The most expensive individual model family we measured was a grove of trees.

## Where the GPU time goes

Each number is the median difference in milliseconds when a temporary build skipped one part of the frame. Both frames in a pair used the same camera position. Skipping a draw also changes which surfaces cover other surfaces, so adding the rows would give a misleading total.

| Part skipped | Normal zoom | Wide zoom |
|---|---:|---:|
| Water | 3.64 | 3.53 |
| Land | 3.61 | 3.35 |
| Trees | 3.20 | 4.89 |
| Contact shadows | 3.21 | 2.60 |
| Units, including their outlines | 2.42 | 1.33 |
| Towns | 1.23 | 2.01 |
| Improvements and resources | 0.49 | 1.57 |
| Remaining board layers combined, excluding rocks and terrain detail | 0.36 | 1.92 |
| Control with the same picture drawn twice | −0.15 | 0.26 |

Water, land and trees each got faster in at least 23 of the 24 pairs at both zooms. Contact shadows got faster in all 48 pairs. Turning off the miniature blur gave mixed results. There is little evidence for changing that effect.

The normal view submitted 348 draws and 2.55 million triangles. The wide view submitted 593 draws and 2.88 million triangles. Median CPU time for submitting the full frame was 2.1 and 3.1 ms respectively. These GPU measurements cover controlled panning. The [previous interaction trace](../code-and-performance-audit-2026-11-19.md#webgl-calls-during-a-first-move) covers the separate delay on the first unit move.

### Named models

The counts below cover triangles submitted to the main camera across all instances of each model. That can include several draws for the same unit. The time columns use the matched GPU pairs. The two time columns for each model come from the same run.

| Model | Normal triangles | Wide triangles | Normal ms | Wide ms |
|---|---:|---:|---:|---:|
| Grove variant 0 | 155,595 | 331,936 | 0.37 | 1.71 |
| Grove variant 1 | 232,921 | 313,076 | 1.23 | 1.69 |
| Grove variant 2 | 139,268 | 237,132 | 0.64 | 1.66 |
| Longswordsman | 198,468 | 198,468 | −0.16 | 0.44 |
| Age IV house, variant A | 58,028 | 58,028 | 0.53 | 0.48 |
| Mine headframe | 59,400 | 68,400 | 0.83 | 0.07 |

The three grove variants cost about the same at wide zoom. A separate run put grove variant 1 at 1.70 ms normal and 1.60 ms wide. The Longswordsman submitted the most triangles among the unit models, but skipping it gave little consistent benefit. The house and headframe timings also varied. Reducing detail on the new unit sculpts would be a low priority on this evidence.

## Improvements to pursue

1. **Share city buffers across the three map copies.** City props rebuild the same transform and colour arrays for each copy. A temporary build used the sharing pattern that improvements already use. Across 30 alternating comparisons, median city layer build time fell from 1.3 to 0.7 ms. The shared version won all 30. Its instance arrays used 185,668 bytes, down from 557,004. Four camera views, including one across the map seam, matched every RGBA byte. This saves work when a city batch rebuilds. Commit `fe822e14` applies the change to the city renderer. [City batches](../../../src/render3d/paintedCities.ts) · [Improvement batches](../../../src/render3d/paintedWorks.ts)
2. **Group town props by location and test the draw-call tradeoff.** At normal zoom the GPU received 296,941 town triangles. The bounding spheres put at least 172,914 entirely outside the camera. The equivalent unit figures were 461,361 outside out of 658,506 submitted. Smaller groups could reject more offscreen work. They can also add draws, especially around the map seam. Compare both zooms and keep the unit outlines, fog, selection and shadow views in the comparison. [City grouping](../../../src/render3d/paintedCities.ts) · [Unit grouping](../../../src/render3d/pieces.ts)
3. **Separate the cost of water shading from depth and screen coverage.** Water used only 68,603 triangles at normal zoom and cost about as much GPU time as 549,059 land triangles. Test the calm-water shader with and without the work for ripple strokes. The default calm-water branch multiplies their contribution by zero on open water. Check whether the compiler already removes the work and compare pixels at coasts, lakes and river mouths. [Sea shader](../../../src/render3d/visualTestLook.ts)
4. **Investigate trees at wide zoom before changing their shapes.** The wide camera submitted 923,618 tree triangles. Test removing fully covered static instances from the submitted batches where the same instances are also absent from the shadow pass. Verify the shadow and reveal cases separately. A previous attempt to clip them in the vertex shader matched the images but failed to improve frame times. Contact shadows already reuse depth and blend during final output. Any proposal to lower their resolution or the board resolution requires a visual review. [Tree batches](../../../src/render3d/paintedBoard.js) · [Earlier tree comparison](../code-and-performance-audit-2026-11-19.md#clipping-fully-hidden-trees-in-the-vertex-shader) · [Contact shadows](../../../src/terrainStudy/lighting.js)

## Follow-up on offscreen town models

A temporary build sorted large town batches into six-by-six tile areas. It shortened a draw when all remaining areas fell outside the camera. Four views matched every pixel, including fog, reflections, a new static shadow and the map seam.

This cut about 77,000 submitted triangles at normal zoom and 42,000 at wide zoom. Draw counts stayed the same. A repeat in a fresh browser took 48 matched GPU samples per view. The median saving was 0.05 ms at normal zoom. Wide zoom took 0.88 ms longer and the inland view took 0.35 ms longer. The renderer keeps its previous draw order. [Pixel checks, timings and controls](city-spatial-culling-2026-11-20.json)

## Measurement conditions

The renderer came from commit `ee54e8d1`, save version 251. The snapshot followed turn 150 on seed 20260832. It held 530 units and 91 cities. It used player 6's fog, the painted board and daylight. Headless Chrome used the Apple M4 through ANGLE Metal. The 1.5× drawing buffer measured 2205 × 1189.

Both main views looked at Cinderhold (column 46, row 7). The camera radius was 7 or 14. The board had finished baking. The test held the water reflection in the state it uses while panning. An initial rotating block test also sampled an inland location. The inland control varied substantially. The main table uses the follow-up comparison at identical camera positions.

The follow-up used three blocks of eight poses per view. It alternated the order of the normal frame and the diagnostic frame. Native WebGL GPU timers surrounded each render. CPU submission was timed separately. The control omitted nothing. A second run used the same method to measure the three individual groves and the two lighting effects. Every pair returned a timer reading. Browser presentation, pointer latency, bot turns and cold-start work were outside these measurements.

The city comparison forced every city prop batch to rebuild with its recipes cached. Time covered the city layer build after old batches were removed. The pixel check froze animation and compared the baseline, a repeat, the shared version and the restored baseline. The city comparison ran on a temporary server.

[Measurements, sample differences and per-model draw counts](render-assets-2026-11-20.json)

## Model delivery at this revision

| Content | What the board draws |
|---|---|
| Keshig | Uses the painted Xiongnu Horse Archer. The unit kept its existing ID. |
| Hypaspist, Janissary, Condottiere, Qin Crossbowman, Sparabara, Hwacha | Use the generic pieces for their classes. The roster lists their art assignments. They still need sculpts. |
| Ballista Elephant | Uses the generic piece for its class. The existing siege-elephant sculpt has a different ID, `siegeElephant`. It is available for review. |
| Numidian Cavalry and Company Guard | These deck units also use class pieces. |
| Chess-piece study | The spearman, worker, archer and horseman have Blender review assets. The live board uses its existing pieces. |
| Towns and established improvements | The city architecture progresses by age. Farms, mines, quarries, lumbermills, pastures and plantations have age tables. Seven selected props have damaged models. The renderer adds common pillage effects. |
| Fish Traps, Wild Orchard, Paradise Garden | Borrow the fishing boat, trellises and a fence ring respectively. Floating Gardens, Physic Garden and Qanat also borrow props. |
| Nazca Lines, Inuksuk, Totem Pole, Stepwell, Hillfort and Baray | These six Expansionist improvements are in the handoff. They have no improvement rows or dedicated board models in this revision. |

The art status comes from tracing the data IDs through the live selectors. The GPU timings above apply to the assets drawn in the fixture. [Handoff art list](../astra-handoff-2026-11-18.md#313-models-the-board-is-missing-audit-of-2026-11-20) · [Unit selector](../../../src/render3d/paintedUnits.ts) · [Unit roster](../../../src/terrainStudy/unitCatalog.js) · [Improvement age and damage models](../../../src/terrainStudy/northStarAssets.js) · [Carved unit preview](../../../art/terrain-study/carved-unit-roster/lineup.jpg)
