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

## Unit selection and first moves

The next measurement should trace mid-turn work from a real pointer event to the first frame that shows a selection or at least one CSS pixel of movement. Record input queuing, command validation, simulation calculations, UI updates, board updates and overlapping bot work. Compare bot planning on and off on the same save. Put reusable measurement code outside the simulation and keep it off during normal play.

The follow-up used the turn 120 save at the default 1.5× resolution with bot planning enabled. In the first capture, releasing the pointer to select a swordsman spent 21.6 ms in the handler. Two exact unit picks used 8.8 ms. Computing the movement range used 3.8 ms, building the lens used 4.1 ms and refreshing the panel used 3.2 ms.

City streets, squares and improvement patches each share a draw with other patches. A pointer over a unit can cross the combined bounds of all those patches while missing every individual patch in front of the unit. The picker now checks the individual bounds first. It still tests the original triangles when a patch could cover the unit. Preparing 1,860 bounds across 24 batches took 1.9 ms when the save opened.

Twelve screen positions took a median of 25.0 ms with the old picker and 18.0 ms with the new one. The new picker was faster in all 14 alternating pairs on the same scene. Both returned the same unit or empty result at all 252 positions on a separate grid. Twelve grid positions hit a unit.

| Pointer release to board draw | Previous picker | Updated picker |
|---|---:|---:|
| First selection ring | 38.5 ms | 51.0 ms |
| Later selection rings, five clicks | 15.5–26.4 ms | 17.5–44.9 ms |
| First walk, at least one CSS pixel | 42.3 ms | 100.2 ms |
| Second walk, at least one CSS pixel | 34.9 ms | 42.7 ms |

The table measures the draw submitted by the game. Chrome's presentation events could also include an older frame. The updated run included the paired picking test before the first walk and had longer board updates. These two runs establish the CPU saving in the paired picks only. For all four walks, the first frame moved the model less than half a CSS pixel. The second frame reached the one-pixel threshold. On the first move, checking for a model at the destination took at most 0.5 ms. The renderer samples the walking pose before it updates board layers. Sampling the pose after that work is a separate candidate. [Input phases, projected distances and paired picks](unit-interactions-2026-11-20.json)

On the turn 120 save with 489 units and 74 cities, Chrome received a real click on the same unit and a real move order to the same tile. Bot preparation was on. The renderer now prepares picking grids during idle time, reuses the list of standing unit models and defers drawing movement highlights until the frame. The tutorial also skips measuring a card again when its contents and visibility stay the same.

The move handler took 33.0, 33.8 and 38.4 ms before the changes. It took 29.6 and 31.1 ms after them. From the start of the move handler to the first observed board draw, the original took 99.8 to 137.8 ms. The updated version took 122.4 and 123.0 ms. These samples show less work inside the handler. They do not establish a shorter wait for the first visible movement.

In the last capture the board drew 18.4 frames per second during a drag and 24.3 through a zoom transition. Chrome presented 27.9 and 29.7 frames per second over the same intervals. Presentation can include frames where the board did not redraw. The original drag samples drew about 29 board frames per second. Other applications were active and load varied across these runs. Further comparisons need matched host load. [Input samples and timings](board-interactions-2026-11-20.json)

### Contact shadow render targets

A temporary build stored contact shadow intensity in a single half-precision channel. It kept the resolution and intensity precision. Four fixed camera views matched every colour byte. Over 24 paired GPU samples per view, the normal city view took 2.65 ms longer and the wide city view took 2.22 ms longer. The inland view saved 1.30 ms and the seam view saved 0.25 ms. The city results ruled out this change for the M4. [Pixel checks and GPU timings](board-interactions-2026-11-20.json)

## Second interaction comparison

In a later run, a visible Chrome window cleared a WebGL canvas of the same size once per animation callback. Three four-second samples delivered 30.25, 30.00 and 30.00 callbacks per second. The Mac reported 9% battery. This control measures the browser's frame cadence during that session.

At 1.5× resolution with bot planning on, the updated game drew 29.4 FPS during the drag and 28.3 FPS through the zoom transition. The two first moves took 42.7 and 52.2 ms from the start of the click handler to the next observed board draw. The comparison build had the same unit picking and tutorial fixes but read the meters directly. Its first moves took 40.5 and 36.0 ms. The meter change saves CPU time on repeated reads. These clicks show no reduction in the wait to see a move. [Input samples and empty-canvas control](late-game-meters-2026-11-20.json)

### Sharing the empire meters

The guide, top bar and meter cards now reuse the same happiness or authority reading until the economy changes. We checked each line and its totals for six seats after every command on two late-game saves. All 8,412 comparisons matched the fresh readings. On turn 120, CPU time across those requests fell from 911 to 282 ms. On turn 151 it fell from 4,006 to 1,888 ms. These totals cover repeated reads over two turns. [CPU timings and command counts](late-game-meters-2026-11-20.json)

Two fog experiments used the same 701 commands. Caching the visible tiles around each unit made moves slightly slower on both maps. Revealing owned tiles before checking sight lines moved the median command time from 1.63 to 1.63 ms on one map and from 1.53 to 1.47 ms on the other. The command results and complete game state matched after every command. Both experiments stayed out of the game. [Fog measurements](late-game-meters-2026-11-20.json)

### Offscreen terrain and water shading

The terrain experiment shortened a draw when the first or last groups of 384 triangles fell outside the main camera. The water experiment skipped ripple and glint calculations when the shader would give them zero weight. Each experiment matched every colour byte in four fixed views. The table gives the median GPU time saved over 24 alternating pairs. A negative number means the candidate took longer.

| View | Terrain triangles skipped | Terrain time saved | Water time saved |
|---|---:|---:|---:|
| City at normal zoom | 259,418 | 0.48 ms | 1.30 ms |
| City at wide zoom | 58,517 | −1.11 ms | −0.76 ms |
| Inland at normal zoom | 331,518 | 1.68 ms | 0.04 ms |
| Map seam at wide zoom | 9,988 | −0.57 ms | −0.04 ms |

Both changes cost time in the wide city view. The game keeps its previous terrain draw ranges and water shader. [Pixel checks, triangle counts and sample pairs](terrain-and-water-2026-11-20.json)

## Hidden trees on the painted board

The renderer now submits only the trees the existing shader can show. A tree on remembered ground still draws. A tree on unexplored ground, cleared land or inside a building footprint can leave the draw. The three map copies share the same list. A change to a tile updates its tree batches and restores trees when the new view needs them.

At turn 151, four fixed views matched every RGBA byte before and after filtering. The checks included a fresh shadow map and a settled water reflection. Switching between two players and the full map also matched after the camera settled. An earlier check caught a change immediately after the seat switch. Repeating the original renderer alone produced that same change. [Image checks and paired GPU measurements](canopy-instances-2026-11-20.json)

| Turn 151 view | Tree triangles skipped per main draw of the board | Median GPU time saved per frame | Faster pairs out of 24 |
|---|---:|---:|---:|
| Cinderhold at normal zoom | 309,260 | 0.83 ms | 17 |
| Cinderhold at wide zoom | 549,724 | 1.69 ms | 24 |
| Inland at normal zoom | 289,547 | 1.17 ms | 23 |
| Map seam without trees | 0 | −0.08 ms | 9 |

### Player input on a 60 Hz display

The empty WebGL canvas reached 60 FPS in three runs while the Mac was charging. Two builds then ran in alternating order with five bots enabled. Both used the same picking and meter changes. Only the tree renderer differed. The measurements below count board draws during the gesture. The linked data also covers the short interval after release. [Gesture timings and display control](canopy-instances-2026-11-20.json)

| Turn 120 action | Before tree filtering, two runs | With tree filtering, two runs |
|---|---:|---:|
| Pan while holding the pointer | 60.1, 60.1 FPS | 56.5, 60.1 FPS |
| Zoom across the detail threshold | 60.0, 48.5 FPS | 60.0, 60.0 FPS |
| First move handler to next observed board draw | 33.0, 29.4 ms | 32.5, 28.4 ms |

The longest gap during an active pan was 39.7 ms with filtering. It overlapped a 19.9 ms Chrome renderer task. The other filtered pan had a 52.7 ms gap just after the pointer was released. While the pointer was down, its longest gap was 17.9 ms. These captures do not isolate the cause of the active hitch. They show a repeatable GPU saving in the wide city view, with first-move latency similar in both interactive builds.

On the two first moves, the updated click handlers took 10.2 and 8.8 ms. The next board frame took 11.9 and 11.8 ms of CPU time. Updating the board layers used 5.0 and 5.2 ms of that frame, including 2.0 and 2.2 ms to update the units.

Over Cinderhold on turn 151, the original renderer drew 47.3 and 40.8 FPS during active drags. The filtered renderer drew 43.7 and 33.2 FPS. During wheel input the figures were 41.3 and 40.7 FPS before filtering, then 41.3 and 38.1 FPS after filtering. Each drag started soon after opening this save and switching to the sixth seat. Six main-thread idle callbacks took at least 50 ms during the slower filtered drag. The native GPU savings did not translate into a faster average in this comparison. [Cinderhold gesture samples](canopy-instances-2026-11-20.json)

### Terrain preparation during a drag

Two further traces identified the idle work. Over four seconds of dragging, the renderer spent 881 and 1,392 ms preparing ground height samplers and pointer-picking grids. Chrome sometimes started that work between pointer events. Individual terrain jobs could last longer than a display frame.

The renderer now waits until the player releases the board, any unit walk ends and activity has settled for 160 ms. It starts new chunks for up to 4 ms in an idle callback. A chunk already in progress can take longer. The board can still answer an immediate terrain query. An early version used only the time since the last camera input. It restarted too soon when Chrome delivered successive events far apart during the same press.

For this comparison, both builds had the same surface preparation waiting at the start of the first drag over Cinderhold. The table covers only the interval with the button held. All four runs finished the deferred work. [Traces, slowest seconds and completion checks](terrain-input-2026-11-20.json)

| Turn 151 drag | Original scheduling | Wait for release |
|---|---:|---:|
| Board FPS in each run | 22.4, 24.3 | 24.9, 31.8 |
| Time in terrain callbacks over 2 ms | 1,767, 2,283 ms | 0, 0 ms |
| Main-thread tasks of at least 50 ms | 6, 9 | 0, 0 |
| Longest gap between board draws | 99, 119 ms | 83, 74 ms |

A further GPU experiment gave the filtered trees a simpler colour and depth shader. All four fixed pictures matched every byte. The wide city saved 0.56 and 0.77 ms in two runs. In the second run, the seam with no trees also measured 0.45 ms faster. The change would add a separate pair of shader programs for the small remaining gain. We kept the shared programs. [Shader comparisons and control timings](terrain-input-2026-11-20.json)

## Setup for the asset measurements

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
