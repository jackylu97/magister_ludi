# Render speed pass, 2026-11-16

The user, 2026-11-16: "Now that the visual update has concluded, could you look into the rendering pipeline and graphics and see if there are any speedups available? Lets make it run as efficiently as possible, also verify that the cloud shading is fully removed from the game."

This file records how the renderer was measured, what each frame and each turn costs, what was changed, and the choices that trade a little picture for speed. Every fix keeps the picture the same: the pictures before and after match pixel for pixel.

## 1. Method, machine and cases

### Machine

- Apple M4, 10 cores, macOS. Chrome 156 in headless mode, with ANGLE on Metal: the WebGL renderer string is "ANGLE (Apple, ANGLE Metal Renderer: Apple M4)". This is the real GPU, not a software path.
- **All timings were taken under load.** Other agents ran games, bot probes and tests on the same machine. The load average was 300 at the start and between 4 and 30 during the runs. CPU times are therefore inflated, perhaps by two to five times, and they vary from run to run. The counts (draw calls, triangles, passes, targets, rebuilds) do not depend on load.
- **GPU time per pass could not be measured.** `EXT_disjoint_timer_query_webgl2` is present, but under ANGLE's Metal backend a query also counts the time its command buffer waits, and the GPU was shared with other pages (24 % busy with my tab closed). A clear of an 800 by 479 target read 6 to 88 ms. Xcode is not installed, so there is no Metal trace either. For the GPU side this file gives the work each pass does (pixels, samples, reads). For the choices in section 6 it gives the wall time from the start of a frame to the end of a `gl.finish()` after it, as the 10th percentile of alternating blocks of frames.

### Cases

| Case | Map | Turn | Seats | Cities | Units |
|---|---|---|---|---|---|
| New game | Standard, 80 by 52 (4,160 hexes) | 1 | 6 | 0 | 12 |
| Late game | Standard, 80 by 52 | 130 | 6 | 71 | 444 |
| Largest map | Giant, 180 by 112 (20,160 hexes) | 1 | 8 | 0 | 16 |

The late game was played by the bots in the page (`createGame` and `createBotStepper`, seed 20261116) and saved. A late game on the Giant map was not made: playing and loading it would have taken a long time on a loaded machine.

Views, all on the seat's own start or capital unless named:

- closest zoom (frustum 5), middle zoom (14), farthest zoom (the board's own limit, 44.7 on a standard map);
- closest zoom on the charted land hex farthest from any water ("inland");
- panning at the middle zoom, and the board left still (idle).

Viewport 1600 by 958 at a pixel ratio of 1, except the choices: 1470 by 830 CSS pixels at device ratio 2, as on the user's laptop, which the canvas caps at 1.5 (a 2205 by 1182 buffer).

### How

- The unchanged code (a copy of `HEAD` made with `git archive`) and the changed code were served side by side, with the same saves, and measured one after the other with the same script.
- A small library, injected into the page, wraps `renderer.render` (draws for each pass), the frame loop (main-thread time for each drawn frame), and every `rebuild…` method and layer `build` (a ledger of calls and time). It changes nothing that is drawn.
- Pictures: the clock held (`setClock(100)`), the HUD hidden, and `Math.random` seeded before the page loads. three's contact pass makes its denoise noise from `Math.random` on every load; without the seed, two loads of the same code differ in a fine speckle over the land. With it, two loads of the unchanged code match exactly (0 differing pixels), which is the floor every comparison below is held to.
- Scripts, results and CPU profiles: `/private/tmp/claude-501/-Users-jacky-code-webciv/c4da3ce5-796a-4aa7-8603-c5fc07da6b1d/scratchpad/renderperf/` (`baseline.mjs`, `perflib.js`, `choices.mjs`, `pair.sh`, `runs/`). Pictures: the `final/` folder there.

## 2. Before the changes

### One frame, late game (turn 130)

Draw calls are the mirror pass plus the main pass; the composer's four full-screen steps add four more.

| View | Draws (mirror + main) | Triangles | Frame loop CPU, median (under load) |
|---|---|---|---|
| Closest | 159 + 351 = 514 | 2.52 M | 23.7 ms |
| Middle | 324 + 718 = 1,046 | 5.52 M | 24.5 ms |
| Farthest | 367 + 712 = 1,083 | 4.44 M | 27.9 ms |
| Closest, inland | 154 + 373 = 531 | 2.98 M | 22.1 ms |
| Panning, middle | 317 + 698 = 1,016 | 5.21 M | 29.0 ms |

Turn 1 on the standard map is small by comparison: 111 to 124 draws, 0.86 to 1.10 M triangles, 2 to 8 ms a frame.

Where a frame's CPU time goes (late game, middle zoom, panning; share of the frame loop, from a sampled profile):

| Part | Share |
|---|---|
| The main pass (`RenderPass`) | 63 % |
| The mirror pass (`seaMirror.ts`): the scene drawn a second time for the calm sea's reflection | 31 % |
| Of both: three looking for a program again (`setProgram`, `getProgram`, `getParameters`) | 38 % |
| Of both: walking and culling the scene (`projectObject`) | 19 % |
| Matrix updates (`updateMatrixWorld`, twice a frame) | 7 % |

Turning the mirror off took the frame from 30.2 to 20.9 ms in a back-to-back test; without its clipping plane it was 28.5 ms, so the plane's program switches are only part of the mirror's cost. Section 7 has more on the program lookups.

Draws by layer at the middle zoom (both passes), from turning each layer off in turn: the painted works 315, the board 319 (of which the merged land is 27 and the stones 52), the units 254, the lens pins 69, the towns 22. Triangles: the board 4.0 M of the 5.5 M, the merged land alone 1.35 M, the three soft groves 1.95 M.

### GPU work for each pass

At the user's buffer (2205 by 1182, 2.6 M pixels). The contact pass and its helpers run at half size (0.65 M pixels).

| Pass | Target | Work for each pixel |
|---|---|---|
| Mirror (only while the calm sea is on) | half size, half-float, depth | the full painterly shading, on pieces, works, towns and stones only |
| Main | full size, 4-sample MSAA, half-float, depth and stencil | every layer; the sea's paint has about 15 value-noise calls and the sun's road |
| Normals from depth | half size | 9 depth reads |
| Contact (GTAO) | half size | 12 samples: 3 directions of 4 steps |
| Denoise | half size | 16 taps |
| Output | the canvas | 1 colour and 1 contact read, the miniature blur's 12 taps on the outer 58 % of rows, the colour grade |
| Static sun shadow | 4096² | only when the charted world changes |
| Moving pieces' shadow | 2048² | only when a piece changes or the view leaves the box |

### Memory

Render targets (arithmetic from the sizes allocated; the browser does not report resident GPU memory):

| Target | At 1600 by 958 | At 2205 by 1182 |
|---|---|---|
| Main pass (MSAA colour and depth-stencil, resolved colour, depth texture) | 92 MB | 156 MB |
| Contact pass (three half-size targets) | 14 MB | 24 MB |
| Mirror | 5 MB | 8 MB |
| Static sun shadow (4096², one-byte colour and depth) | 84 MB | 84 MB |
| Moving pieces' shadow (2048²) | 21 MB | 21 MB |
| Canvas (no MSAA, no depth) | 6 MB | 10 MB |
| **Total** | **221 MB** | **303 MB** |

The composer's second full-size target is never drawn into, so three never allocates it. Late game: 738 geometries, 28 textures, 81 programs, 4,480 meshes (1,830 visible), 80,118 instances.

### One-time and per-turn costs (under load)

| Event | Before |
|---|---|
| Board build at load (worker), standard map | 29 to 51 s (it varied with the load) |
| One accepted command: the state sync with nothing changed | 6 ms (an earlier unloaded measure: 1.4 to 1.8 ms) |
| The end of a turn at turn 130: the one state sync after the turn resolves | **4,587 ms** in one frame |
| The board left still | 21 frames drawn a second, each a full frame (the sea and the idle motion at `motionFps` 24) |

The turn-end sync, by rebuild (one turn, turn 130 to 131):

| Rebuild | Calls | Before (ms) |
|---|---|---|
| `rebuildLens` (the resource pins) | 1 | 1,485 |
| `rebuildUnits` | 3 | 1,289 |
| `rebuildImprovements` (the toon layer, which the painted look barely draws) | 1 | 760 |
| `rebuildPaintedWorks` | 2 | 735 |
| `rebuildRoads` | 1 | 618 |
| `rebuildTerritory` | 1 | 595 |
| of these, `paintedFlow.build` (the river glints) | 2 | 455 |

The profile of that sync named the cause of most of it: 2.2 s of the 4.6 s was the painted surface's height samplers being built again (`createTileSurfaceSampler` and the vertex copy before it), reached through `tileTopY` from the pins, the pieces and the toon works.

## 3. The fixes

### 3.1 Height samplers kept across installs (`paintedSurface.ts`)

- **What.** `installPaintedSurface` makes a new registration each time the works layer rebuilds on a map with a terrace on it, and a new registration started with no samplers. Every placement after it built the sampler of each chunk it touched again. Now a chunk's sampler is kept (`keptSamplers`, by mesh) while the mesh has the same geometry, the same index and position buffers at the same versions, the same side and the same world matrix. The hill cuts in `paintedRelief.ts` rewrite the index and raise its version, so a cut chunk still builds a new sampler. The vertex copy also lost its two objects for each vertex; the arithmetic is `Vector3.applyMatrix4`'s, term for term, so the heights are the same numbers.
- **Gain.** At the turn-130 turn end: the pins 1,485 → 15 ms, the units 1,289 → 214 ms, the toon improvements 760 → 10 ms.
- **Test.** `test/render/paintedSurface.test.ts`, "keeps a chunk's sampler across installs until the chunk itself changes" (counts builds with `surfaceSamplerBuilds`).

### 3.2 River glints traced once for each board (`paintedFlow.ts`)

- **What.** The flow layer traced every river again (`createOrganicRivers`) on each build, which is each works rebuild and so each time the seat's sight moves. The glints, their ground heights and their hexes are kept for each board map; a build only asks the fog which to keep.
- **Gain.** `paintedFlow.build` 455 → 3 ms at the turn-130 turn end, and 143 → 1 ms at turn 1.
- **Test.** `test/render/wrapCulling.test.ts`, "are traced once for a board however often the layer is built, and follow the fog".

### 3.3 Wrap copies culled (`wrapCulling.ts`, six layers)

- **What.** The smoke, the birds, the river glints, the windmill sails, the richness motes and the yield light each draw one mesh for each of the three wrap copies, and each turned frustum culling off because their shaders move vertices. So all three copies were drawn on every frame. Now each layer widens its measured bounds by the farthest its shader moves a vertex, and the copies are culled like any other mesh.
- **Gain.** 6 to 18 fewer draws a frame (turn 130: 1,046 → 1,036 at the middle zoom; turn 1: 124 → 118).
- **Test.** `test/render/wrapCulling.test.ts`: every bird vertex at both ends of its flight and its beat stays inside its copy's bounds, and a view over the middle copy culls the two side copies.

### 3.4 The mirror pass skipped with no sea in view (`renderer3d.ts`)

- **What.** The mirror pass draws the scene a second time, and only the sea's paint reads its picture. `waterInView` tests the camera's frustum against spheres round each block of 2 by 2 hexes that holds an ocean, coast or lake hex, widened by two hex radii for the hex itself and the free coastline. The bounds come from the map, because the board's water meshes also carry the rivers, which run through almost every chunk of land and never read the mirror. With no such block in view, the pass is skipped (`mirrorSkips` counts the frames).
- **Gain.** Closest zoom, inland, turn 130: draws 531 → 367 (31 % fewer), triangles 2.98 → 2.47 M, frame loop 22.1 → 16.1 ms (under load). Views with the sea in them are unchanged. The test itself costs a few hundred sphere tests a frame; it did not show in the profile.
- **Test.** The pictures (below). A unit test would need a whole renderer; the inland view's 0 differing pixels and its 31 skipped mirror passes in 31 frames are the check.

### 3.5 Transparent double-sided quads drawn in one pass (`toon.ts`, `badges3d.ts`, `lens3d.ts`)

- **What.** three draws a transparent material with `side: DoubleSide` twice for each object, back faces and then front faces, and between the two it changes `side`, marks the material for update and looks for the program again. The board's overlays (bars, rings, decals: `MaterialLibrary.overlay`), the tile icons and their quieter copies, the unit badges and the resource pins are all such materials. In every one of their meshes all quads face the same way: a decal lies flat, a bar, a badge or a pin faces the camera. So one of the two passes drew no pixel, and the material now asks for one pass (`forceSinglePass`). The yield light keeps its two passes: one of its meshes holds washes seen from their backs and motes seen from the front, and the order of the two passes is part of its picture.
- **Gain.** Program lookups at the middle zoom of turn 130: 232 → 92 a frame with the mirror, 128 → 10 without it. Draws: middle zoom 1,036 → 952, closest 504 → 432, turn 1 118 → 105.
- **Test.** `test/render/singlePass.test.ts`.

### 3.6 The cloud shadows removed

See section 5.

### The proof that the picture is the same

Held clock, HUD hidden, `Math.random` seeded; every view compared pixel by pixel with the unchanged code.

| Case | Closest | Middle | Farthest | Closest, inland |
|---|---|---|---|---|
| Two loads of the unchanged code (the floor) | 0 | 0 | 0 | 0 |
| Turn 130, unchanged against fixes 3.1 to 3.4 | 0 | 0 | 0 | 0 |
| Turn 130, unchanged against all fixes | 0 | 0 | 0 | 0 |
| Turn 1, unchanged against fixes 3.1 to 3.4 | 0 | 0 | 0 | 0 |
| Turn 1, unchanged against all fixes | 0 | 0 | 0 | 0 |

The largest difference in any channel was 0 in every comparison. The pictures are in `final/` (`std130-…-before.png`, `std130-…-after.png`, `std1-…`); the "after" pictures there are of all fixes.

## 4. After the changes

### One frame, late game (turn 130)

| View | Draws before (mirror + main) | Draws after | Triangles before | Triangles after | Frame loop CPU, median, before → after |
|---|---|---|---|---|---|
| Closest | 159 + 351 = 514 | 140 + 288 = **432** | 2.52 M | 2.48 M | 23.7 → 8.4 ms |
| Middle | 324 + 718 = 1,046 | 299 + 649 = **952** | 5.52 M | 5.47 M | 24.5 → 15.6 ms |
| Farthest | 367 + 712 = 1,083 | 342 + 645 = **991** | 4.44 M | 4.39 M | 27.9 → 15.7 ms |
| Closest, inland | 154 + 373 = 531 | 0 + 309 = **313** | 2.98 M | 2.46 M | 22.1 → 9.7 ms |
| Panning, middle | 317 + 698 = 1,016 | 292 + 629 = **924** | 5.21 M | 5.16 M | 29.0 → 20.6 ms |

The draw counts and triangles do not depend on load. The CPU times do, and the last "after" run happened while the machine was less busy, so the fall in CPU time is partly the load: the run between (all fixes but 3.5) read 17 to 31 ms. Program lookups a frame at the middle zoom: 232 → 92. Turn 1 on the standard map: 124 → 105 draws. Memory, programs and textures are unchanged.

### The end of a turn (turn 130 to 131)

| | Before | After (two runs) |
|---|---|---|
| The state sync after the turn | 4,587 ms | **1,365 ms and 1,089 ms** (−70 % to −76 %) |
| The longest frame of the turn | 4,890 ms | **1,561 ms and 1,239 ms** |

| Rebuild | Before (ms) | After (ms) |
|---|---|---|
| `rebuildLens` | 1,485 | 15 |
| `rebuildUnits` (3 calls) | 1,289 | 214 |
| `rebuildImprovements` | 760 | 10 |
| `rebuildPaintedWorks` (2 calls) | 735 | 115 |
| `paintedFlow.build` (2 calls) | 455 | 3 |
| `rebuildRoads` | 618 | 626 |
| `rebuildTerritory` | 595 | 572 |

What is left is mostly the road plan and the border plan. Both plan the whole map again when one road or one border changes (section 7).

### The largest map

The Giant map (180 by 112) could not be measured. Both loads, of the unchanged and of the changed code, stopped at "Painting the world" with "Terrain construction timed out. Please try loading again.": the board build in the worker has a fixed limit of 120 s (`paintedBoardAsync.js`), and on this loaded machine (load average up to 83 at the time) the Giant board took longer. See section 7.

## 5. The cloud shadows

The user asked for them to go on 2026-11-14. Switch 7 was off by default (`allOn` set `clouds = false`), and the calm sea's sun settings had `cloud: 0`.

### What was found

- **Nothing of them was drawn by default**, in any light preset: the shade returned 1 when the switch was off, and the sea's cloud term was multiplied by 0.
- **A player could still turn them on**: the menu's visual test panel drew a checkbox for every switch, number 7 included, and `?vtest=7` turned it on.
- **Some of it still ran on every frame:**
  - every material the painterly style registered (every material but the chart paper) carried the cloud uniforms and an extra function, and read a uniform and branched on it for every fragment;
  - the calm sea (pattern 5) worked out two value-noise calls (eight hashes, each with a `sin`) for every open-water fragment, and then multiplied the result by 0;
  - the frame loop tested the cloud switch for motion frames.
- **Its cost** could not be measured on its own on this machine (section 1). By count, the sea's two dead noise calls were 2 of the about 15 noise calls in the sea's paint.

### What was removed

- `visualTest.ts`: the `clouds` switch, its entry and its default. Number 7 stays unused: `RETIRED_SWITCH_IDS` holds it, and a test checks that no switch takes it. `parseVisualTest` finds a switch by its number, so `?vtest=7` now turns nothing on, and the other numbers do not move.
- The menu checkbox: it is built from `VISUAL_SWITCHES`, so it went with the entry.
- `visualTestLook.ts`: the `vtestClouds`, `vtestCloud`, `vtestCloudStrength` and `vtestPeriod` uniforms, `CLOUD_UNIFORMS`, `CLOUD_GLSL`, `installClouds`, and the sea's dead cloud term in pattern 5.
- `paintedLook.js`: the cloud installer on every registered material; `paintedLook.d.ts` and `renderer3d.ts`: the chart paper's `chart` option, which only kept the clouds off the paper, and the period uniform.
- `renderer3d.ts`: the cloud test in the motion frame rule.
- `data/view3d.json`: `visualTest.clouds` and the six `cloud…` rows of the calm sea; `lookData.ts`: their types.
- Tests: `test/render/visualTest.test.ts` (the default switches, the numbering, the retired number, and a check that no cloud code or setting comes back).
- Left alone: `docs/art-pass.md` mentions the cloud shadows in its history of the pass.

The removal does not change the picture: every comparison in section 3 was made with it in place.

## 6. Choices for the user

Each of these changes the picture a little. None is applied. Each is a row of `data/view3d.json`; the first is new in this pass and is 0 (off).

Measured on the late game at the middle zoom, at the user's buffer (2205 by 1182). "Frame" is the 10th percentile of the time from the start of a frame to the end of `gl.finish()`, in alternating blocks with the approved settings, under load. "Picture" compares a held-clock picture with the approved one.

| Choice | Setting | Gain | Picture |
|---|---|---|---|
| Stop the motion when the board is left alone | `visualTest.motionRestSeconds`: 3 (new; 0 = off) | idle frames 21.5 → **0** a second, after 3 s with no input or change | the sea, the smoke and the pieces stop moving after 3 s; they start again with the next input, with a small jump in their phase |
| Half the motion rate | `visualTest.motionFps`: 12 | idle frames 21.5 → **10** a second | the motion steps half as often |
| Lower pixel ratio | `painted.canvas.maxPixelRatio`: 1.25 | 31 % fewer pixels in every full-size pass; frame 10.6 → 9.3 ms | softer: 76 % of pixels differ, mean 2.7 of 255 |
| Pixel ratio 1 | `painted.canvas.maxPixelRatio`: 1 | 56 % fewer pixels; frame 10.6 → 9.3 ms | softer still: 89 % differ, mean 4.7 |
| Edge smoothing at 2 samples | `visualTest.smoothing`: 2 | the MSAA buffers halved (63 MB less at this size); frame 21.8 → 20.4 ms | rougher edges: 41 % differ, mean 1.6, up to 153 on edges |
| Contact pass at a third of the size | `painted.contact.renderScale`: 0.35 | 51 % fewer contact pixels; frame 22.2 → 21.3 ms | contact shade a little coarser: 61 % differ, mean 1.0 |
| Contact pass with 8 samples | `painted.contact.samples`: 8 | a third fewer contact samples; no gain above the noise | 57 % differ, mean 0.7 |
| A smaller mirror picture | `visualTest.coast.open.mirror.scale`: 0.35 | half the mirror's pixels; no gain above the noise | 0.6 % differ |

What the figures say: on this machine the frame is limited by the CPU's work for each draw, not by the GPU's fill. The GPU-side choices save at most about a tenth of a frame. The two motion choices are the ones with a large gain, because they remove whole frames while the player is thinking. The pictures are in `final/` (`choice-….png`, and `choice-…-difference.png`, where brighter is a larger difference).

## 7. What could not be measured, and what looked wrong

### Not measured

- GPU time for each pass (section 1). The renderer's own benchmark (`benchmarkTerrain`) has the same problem on this backend: its GPU column reads the wait between command buffers as well.
- The Giant map at all (section 4).
- The start-up: board build times varied from 29 to 51 s with the load, so no change there can be claimed or ruled out.

### Looked wrong, or worth a later pass

- **Program lookups on every frame** (two of three causes fixed). Counting the calls to each material's `customProgramCacheKey` (three asks it only when it looks for a program) gave, at the middle zoom of turn 130, 232 lookups a frame over 38 materials with the mirror on, and 128 over 16 with it off. Two causes:
  - transparent double-sided materials (the pins, the unit badges, the bars and rings): three draws each such object in two passes and changes `side` between them. Fixed in section 3.5.
  - one opaque material, the settlement and works material, is drawn on instanced meshes with instance colours (the works) and without them (the towns). three sorts opaque objects by material and then by depth, so the program changes back and forth inside that material's run: 10 lookups a frame, 20 with the mirror. Giving the towns' instances a white instance colour would end it without changing a pixel (a colour is multiplied by 1); it was not done in this pass.
  - The mirror's clipping plane makes every material drawn in both passes change program twice a frame. Without the plane the frame was about 1.7 ms faster under load, but the plane keeps everything under the water out of the reflection, and moving the main pass onto the same program would add a `discard` to every opaque shader, which costs more on Apple's GPUs than it saves.

- **A Giant map does not load on a slow or busy machine.** The board build in the worker gives up after a fixed 120 s (`paintedBoardAsync.js`), whatever the map's size. On this machine under load, a turn-1 Giant game stopped there twice ("Terrain construction timed out"), so the player is sent back to the title screen with no game. A limit that grows with the number of hexes, or one that resets while the worker reports progress, would let a slow device finish.
- **The road and border plans re-plan the whole map** when one road or one border changes: 626 ms and 572 ms of the 1,365 ms turn-end sync that is left (under load). Both are memoised on their signature, so they run only on a real change, but they are not incremental. Making them incremental means keeping the plan for each hex and planning again only the hexes near a change; the border outline joins edges across the whole map, so that one is not a small job.
- **The board never idles.** With the sea and the idle motion on, the loop draws 21 to 24 full frames a second for as long as the game is open, mirror and contact pass included. The module docblock of `renderer3d.ts` still says "Idle cost is one `requestAnimationFrame` that returns immediately", which was true before the motion frames. Section 6 has the two settings that bring the idle cost down.
- **The units go into the mirror whole**: their outlines, their x-ray ghosts, their badges and their health bars are all drawn into the mirror's picture. Leaving any of them out would change the picture where they reflect, so it was not done.

## Second pass

The ruling: `docs/flags.md`, "Rendering speed, second pass. Ruled 2026-11-17." Five items: the works and towns material, the motion at rest, the road plan, the terrain build's time limit, and the border plan. The coordinator added a sixth during the pass: a test of the first pass that failed only when other test files ran before it.

### Method

- The same as section 1: the unchanged code (`git archive` of `decks` at `276e193b`, the commit that turned the border outline rule off) served beside the changed code, the same saves, the same scripts. Only one dev server ran at a time (ports 5243 and 5244), each with its own dependency cache.
- The saves were made again in the page with the same seed (20261116): the turn-130 game came out as before, with 71 towns and 444 units.
- The load average was between 9 and 35 during the runs. The "before" runs had the higher load. Where a time is compared, the table says how much of the fall the load explains. Counts do not depend on load.
- Scripts and results: `/private/tmp/claude-501/-Users-jacky-code-webciv/c4da3ce5-796a-4aa7-8603-c5fc07da6b1d/scratchpad/renderperf2/` (`measure2.mjs`, `shots2.mjs`, `shots3.mjs`, `giant.mjs`, `runs/`). Pictures: `pics/` there.

### 1. The works and towns material

- **Cause, as the first pass said.** The towns (`paintedCities.ts`) and the works (`paintedWorks.ts`) draw with one material. The works' instanced meshes carry instance colours and the towns' did not. three needs another program for an instanced mesh with no colours (`needsProgramChange` compares `instanceColor` with null), and it sorts opaque meshes by material and then by depth, so towns and works mixed in one view changed program back and forth.
- **Change.** `paintedCities.ts` gives every town instance a white colour. The shader multiplies the vertex colour by the instance colour (`vColor.rgb *= instanceColor.rgb`), and a product with 1.0 is exact, so no pixel moves.
- **Counts** (program lookups a frame, middle zoom, turn 130):

| | Before | After |
|---|---|---|
| All materials, mirror on | 92 | 74 |
| All materials, mirror off | 10 | 0 |
| The works and towns material, mirror on | 20 | 2 |
| The works and towns material, mirror off | 10 | 0 |

  The 2 left with the mirror on are the mirror's clipping plane (section 7). Turn 1 has no towns: 16 and 0 before and after. Draws are the same (952).
- **Test.** `test/render/paintedCities.test.ts`, "gives every town instance a white colour, so towns and works draw with one program".

### 2. The motion rests when idle

- **Change.**
  - `data/view3d.json`: `visualTest.motionRestSeconds` is 3 (0 never rests). Its type and docblock are in `lookData.ts`.
  - The game menu has a new option beside the time of day, "Stop the motion when idle", off by default. It is kept in the URL as `?rest=1`, the way the time of day keeps `light` (`motionRestChoice` and `build3DPanel` in `main.ts`).
  - `renderer3d.ts`: `setMotionRest(on)` and `noteActivity()`. A pointer move or press, a wheel turn or a key on the window wakes the motion. A camera move and a game change wake it through the frame they ask for. When the motion stops, the loop keeps the time of the last frame drawn. When it wakes, the time it rested comes off the motion's clock (`restedMs`), so the first frame shows the motion exactly where the last frame before the rest left it. With the option off, `restedMs` stays 0 and the clock is the page's own, to the last bit.
  - The module docblock of `renderer3d.ts` now says what is true: the board draws `motionFps` frames a second for its motion while the sea or the idle motion is on, and stops only with the option on.
- **Counts** (turn 130, idle board):

| | Frames drawn a second |
|---|---|
| Option off (the default), before and after | 20.5 and 20 |
| Option on, the first 3 s | 20 |
| Option on, after 3 s with no input | 0 |
| The second after a pointer move sent through the DevTools protocol | 13 (the second began a little before the move arrived) |

  The motion's clock, frame by frame, across a rest woken by a key: the last frame before the rest drew at 2,023 ms with the clock at 59.6486 s; the next frame drew at 4,520 ms with the clock at 59.6486 s, and the frames after it step by 0.05 s as before. No leap.
- **Tests.** `test/render/motionRest.test.ts`: the motion runs while the option is off, with the page's clock; it stops after the rest time and starts on the next input, on a game change and on a camera frame; the first frame after a rest shows the clock it stopped at; the window listener and the menu option are wired.

### 3. The road plan

- **Cause.** `planPaintedRoads` was memoised on `signRoadCells`, so any road laid or pillaged planned all 240 road hexes again. With the organic roads (switch 5) a hex's plan is heavy: taut road heights solved over 240 passes, sides, kerbs and bridges, 49,721 marks on the turn-130 map.
- **Change** (`paintedGround.ts`). A hex's road marks depend only on the board under it and its neighbours (fixed), the style, and its links (which of its six neighbours are paved land). So the plan keeps each hex's marks with the links they were drawn for, and plans again only the hexes whose links moved (`planRoadCells`, `roadLinks`). The plan still comes out in cell order. A new map or a new style keeps nothing.
- **Counts** (turn 130):

| | Before | After |
|---|---|---|
| A road laid and taken away again (two plans), in the page | 1,694 to 1,751 ms | 16 ms |
| A plan from nothing (a new map), in the page | 787 to 989 ms | 435 to 698 ms (the same work; the after run had less load) |
| `rebuildRoads` at the turn end, 130 to 131 (4 roads laid) | 963 ms, of which the layer 45 ms | 43 ms, of which the layer 32 ms |
| Road hexes clipped again by the layer at that turn end | 2 of 237 | 2 of 237 |

- **Test.** `test/render/paintedRoadPlan.test.ts`, for the straight and the organic roads: after a road laid, a road pillaged, a town founded with a road laid into it and a road hex changing hands, the plan equals a plan made from nothing (same cells, same order, marks equal field by field), and every hex out of reach of the change keeps the very marks object it had. A new map plans every hex again.

### 4. The terrain build's time limit

- **Found.** The limit struck again during this pass: a turn-1 standard map on the unchanged code stopped at "Terrain construction timed out" under a load of about 30 (its next try built in 117.6 s, just inside the limit).
- **Change.**
  - `paintedBoardAsync.js`: no time limit. A build fails only on an error: the worker's own error message, its `error` event, a message it cannot read, or a failed post.
  - `paintedBoard.js` names each step as it starts (`progress(done, total, stage)`): the hills, the mountains, the colours, the rivers, the coast, the sea, the land (the one step that counts, chunk by chunk), the far view. The worker adds "packing". The page records how long each step took and the longest wait between two reports (`PaintedBuildMetrics.stageMs`, `longestSilenceMs`).
  - The loading sheet shows the step's name beside "Painting the world" (`paintingDetail` in `loadingSheet.ts`), so a slow build reads as work that goes on, and the bar counts the land step as before.
- **The guard for a stuck build: none.** A limit cannot tell a slow build from a stuck one. The worker reports as each step starts, but a step in progress says nothing, so any limit on silence is a longer fixed limit that a slow enough machine still reaches. The build has no waits on anything outside itself, so it ends or it fails, and a failure arrives as one of the errors above. The longest silence measured (below) is there for anyone who wants to set a silence limit later.
- **Counts.** The Giant map (180 by 112, 8 seats, turn 1), load about 17, which the first pass could not load at all:

| Step | Seconds |
|---|---|
| The hills | 8.0 |
| The mountains | 1.3 |
| The colours | 0.4 |
| The rivers | 5.9 |
| The coast | 0.5 |
| The sea | 0.1 |
| The land | 162.2 |
| The far view | 7.2 |
| Packing | 3.2 |
| **The worker in all** | **185.5** (the old limit was 120) |

  The longest silence between two reports was 8.0 s (the hills). The sheet's line changed 77 times in the 177 s it showed "Painting the world". The board was up 224 s after Continue was pressed, with 20,160 hexes and no error.
- **Tests.** `test/render/paintedWorker.test.ts`: the "timeout" failure case is gone; a new case holds a build ten minutes silent on one step and then fifteen more on the land step, and it still lands, passes on every report, and records the silence. `test/ui/loadingSheet.test.ts`: the step's words, and the pin on `terrainBuildProgress`. `test/render/contextLoss.test.ts`: the rebuild after a lost context passes the step on too.

### 5. The border plan

The border agent finished during this pass, so the coordinator asked for the change itself, not only the plan.

- **Cause.** `planPaintedTerritory` was memoised on `signTerritory`, so any hex changing hands planned every border edge again. A CPU profile of the plan from nothing (the unchanged code) put 87 % of its time in `edgeHeight`: with the game's `level` style, each band of each edge asks the height of the edge and of the edges either side, and each asks the ground 27 times.
- **Change** (`paintedGround.ts`).
  - `edgeHeightOf` keeps each edge's height for the board, by hex and side, as `borderHeight` already did for hexes. An edge's ends and normal are fixed by its hex and side, so the numbers are the same.
  - `keepBorder` and `handOut`: each plan keeps the marks each edge handed out, with the owner and outline arrays it was drawn from. The next plan finds the hexes whose seat changed, and plans again only the edges within `BORDER_REACH` (4) hexes of one. An edge reads the seats round its two corners (one hex away), and a draped band is handed to hexes of its seat up to three hexes away (`spread`), so 4 leaves a hex to spare. Every other edge hands out the marks it handed out before, and the plan is put together edge by edge in a full plan's order. The tint plan does the same for its three edge lists. A new map, new players or a new style keeps nothing.
  - `territoryHoles` returns at once when `holeMax` is below 1 (the game's data since `276e193b`): no pocket can be that small.
- **Counts** (turn 130):

| | Before | After |
|---|---|---|
| The line plan from nothing (every edge planned), in the page | 537 to 564 ms | 5 ms (the heights kept for the board) |
| The tint plan from nothing | 21 ms | 11 ms |
| `rebuildTerritory` at the turn end, 130 to 131 (18 hexes changed hands) | 1,035 ms | 173 ms |
| of which the two plans | 639 ms | 19 ms |
| of which the two layers (unchanged code) | 41 + 355 ms | 17 + 137 ms |
| Border and tint hexes clipped again by the layers at that turn end | 47 of 567, 130 of 835 | the same |

  The first plan of a board still asks every height once; it runs at load, with the board build.
- **Tests.** `test/render/paintedBorderPlan.test.ts`, for six styles (none, the game's, the outline rule on, draped over the relief, ruled, ruled with a wash): after a hex changing hands, a hex lost, a hole opening, a town captured and a town founded with its ring, the line plan and the tint plan equal plans made from nothing, and the hexes more than eight hexes from the change keep the very marks objects they had; the same after sixteen random changes in a row; another game on the same board plans every edge again.

### The turn-end sync

The one state sync after the turn resolves, turn 130 to 131:

| | Before | After |
|---|---|---|
| The sync | 2,511 ms | 305 ms |
| The longest frame of the turn | 2,933 ms | 400 ms |

The after run had less load: `units.build`, which this pass did not touch, fell from 359 to 155 ms, so about 2.3 times of the fall is load. The plans' own fall (road 918 to 11 ms, border 639 to 19 ms) is far larger than that.

### 6. The river glint test that failed after other files

- **Cause.** `test/render/wrapCulling.test.ts` counted the river traces with `vi.mock` of `organicRivers.js`. The suite runs with `isolate: false` (`vite.config.ts`), so a worker keeps its modules from one test file to the next. When an earlier file in the same worker had already loaded `paintedFlow.ts`, it kept the real `createOrganicRivers`, and the mocked count read 0. It was not the cache key: the flow layer's cache is a `WeakMap` on the prepared board, and each test makes its own board.
- **Reproduced** in one worker: a copy of the old test run after a file that loads `paintedFlow.ts` failed with the same message; the new test passed in the same run.
- **Change.** The test counts with `vi.spyOn` on the module's export, which every importer reads at call time, and restores it after each test. No `vi.mock` is left in the suite. `npm run test:render` then passed the test in both of its runs (the second run passed all 1,411 tests).

### The proof that the picture is the same

Held clock, interface hidden, `Math.random` seeded; the unchanged code against all the changes, pixel by pixel:

| Case | Closest | Middle | Farthest | Closest, inland |
|---|---|---|---|---|
| Turn 130 | 0 | 0 | 0 | 0 |
| Turn 1 | 0 | 0 | 0 | 0 |
| Turn 131 after a real turn end in the page, against a fresh load of turn 131 on the unchanged code | 0 | 0 | 0 | not taken |

The last row is the one that tests the kept plans in the game: the changed code ended turn 130 in the page, so its road and border plans were updated one change at a time (4 roads laid, 18 hexes changed hands), and the unchanged code loaded the game's own autosave of turn 131 and planned everything from nothing. Both looked at the seat's capital with the overlays (selection rings, paths) hidden. The largest difference in any channel was 0 in every comparison. Pictures: `pics/std-t130-…-before.png` and `…-after.png`, `pics/std-t1-…`, `pics/turned-…`.

### Not measured, and still open

- GPU time, as in section 1. Frame times under load were not used as evidence.
- The Giant map on the unchanged code: the first pass showed it stops at 120 s, and the standard map's timeout during this pass is the same fault.
- The first border plan of a board, with no heights kept yet: it runs once, during the load.
- **Open: the tint layer clips its marks one at a time.** At the turn end the tint layer took 137 to 355 ms to clip 130 hexes again: `PaintedGroundLayer.build` projects each tint mark on its own (`projectMarkings(terrain, [mark])`) to give it its fade. Projecting a hex's marks together and fading the pieces after would be faster, but the pieces' order and so the merged geometry could change, so it needs its own picture check.
- **Open: the road layer folds every hex's marks again** when the plan object is new (`foldMarks`, about 20 to 50 ms at turn 130). Kept marks are the same objects now, so the layer could skip the fold for an unchanged marks array.
- **Open: the mirror's clipping plane** still costs 2 program lookups a frame for each material drawn in both passes (section 7).

## Third pass

The ruling: `docs/flags.md`, "Rendering speed, third pass. Ruled 2026-11-17." The order of importance is the frame rate while the player pans, then the load time of a new game, then the pause at a turn end. A change that keeps the picture the same needs no approval. A change to the picture is one setting, with pictures before and after, and is left off for the user to choose.

### Method

- The same as the second pass. The unchanged code is a `git archive` of `decks` at `aa403039`, served on port 5251; the worktree on 5252. Each server has its own dependency cache and no hot reload. One headless Chrome (ANGLE on Metal, Apple M4). Everything runs at `nice 15`.
- The saves are the second pass's: `std-t130` (71 towns, 444 units) and `std-t1`, seed 20261116. A Giant save (180 by 112, 8 seats, turn 1) was made the same way.
- Another agent played bot games on the machine during the whole pass. The load average was between 3 and 101; each table gives it. Every timing is the unchanged code and the worktree back to back, at least twice. Counts (draws, lookups, matrix visits, frustum tests, triangles tested, the worker's output) do not depend on load and are the evidence.
- The pictures: clock held, interface hidden, `Math.random` seeded, at four views at turn 1 and turn 130 (closest, middle and farthest zoom on the seat's start, closest zoom on the land hex farthest from water), compared pixel by pixel with the unchanged code.
- The board worker's output: a fingerprint of every byte the workers hand the page (every batch, every typed array, in order, and the prepared terrain), taken in the page. The same fingerprint means the same board.
- Scripts: `/private/tmp/claude-501/-Users-jacky-code-webciv/c4da3ce5-796a-4aa7-8603-c5fc07da6b1d/scratchpad/renderperf3/` (`pan3.mjs` and `panlib.js` for panning, `loadprof.mjs` for the load, `measure3.mjs` for the turn end, `choices.mjs` for the picture-changing settings, `shots.sh` for the pictures, `runs/` for every result and CPU profile). Pictures: `pics/` there.

### Summary

- **Panning.** A real drag at turn 130 spent more of the main thread on the pointer's pick (about 20 ms on every pointer move) than on drawing. The pick now tests only the triangles under the ray and gives the same hit as three's raycast. On the frame itself: 68 program lookups a frame became 0, the scene's matrix walk visits half as many objects, and three tests 1,304 meshes against the camera a frame instead of 3,696, with the same 824 draws. The loop's CPU time fell by about a fifth at the middle and closest zooms (at the middle zoom 23.4 to 24.2 ms before and 19.0 to 20.8 ms after, back to back under load). The picture is the same.
- **The load.** The board is now built by four workers at once, its slowest step (the clip of the river ribbon) runs about eight times faster, and the page no longer builds every layer twice. A new standard game came up in 13 to 14 s instead of 35 to 37 s, a new Giant game in 62 to 74 s instead of 174 to 178 s (back to back, load 5 to 13). The workers' output is the same byte for byte, and the picture is the same.
- **The turn end.** The ground ink's clip and the pieces' heights got cheaper, and a hex's ground is tessellated once. At the turn-130 turn end the border tint, the border line and the roads take about half the time they did, and placing the pieces about a third (in a profile). The whole state sync fell in three of four back-to-back pairs (423 → 366, 788 → 429, 534 → 443 ms; the fourth, under the pass's highest load, rose 787 → 946 ms), because the works, the lens and the towns did not get faster. The picture is the same.
- **Two settings that change the picture**, both shipped so that the picture is as it was: `mirror.whileMoving` (no reflections while the camera moves: the loop's time while panning falls by about a third) and `mirror.works` (the works stay out of the mirror: about a tenth). They are for the user to choose; see the table.

### A. Panning

#### Before

Measured on the unchanged code while the camera panned 8 CSS pixels a frame through the renderer's own `panByScreen` (the call a drag makes), and with a real pointer drag sent through the DevTools protocol (a press, then a move of 8 pixels every 16 ms for 3 s). Turn 130, load average 36 to 46 for the timings.

| | Middle zoom (14) | Closest zoom |
|---|---|---|
| Draws a frame (mirror + main), median | 824 | 428 |
| Triangles a frame | 4.53 M | 2.53 M |
| Program lookups a frame | 68 | 52 |
| Scene matrix walk: objects visited a frame | 9,040 | 9,040 |
| Matrices composed a frame | 803 | 803 |
| One pointer pick (`renderer.pick`), median of 15 | 23.4 ms (5 to 50) | 17.4 ms (13 to 37) |
| Real drag: frames the page drew in 3.2 s (this first run) | 16 | 53 |

Turn 1: 105 draws, 16 program lookups, 6,620 matrix visits, one pick 13 to 15 ms.

Where a panning frame's CPU time went (turn 130, middle zoom, a sampled profile of 240 frames; the frame loop was 19 ms a frame under the profiler):

| Part | ms a frame |
|---|---|
| The main pass (`RenderPass`) | 9.4 |
| The mirror pass (`seaMirror.ts`) | 7.4 |
| Of both: `setProgram` | 5.0 |
| Of that: program lookups (`getProgram`) | 2.5 |
| Of both: walking and culling the scene (`projectObject`) | 4.5 |
| Matrix walks (`updateMatrixWorld`, twice a frame) | 2.0 |
| The town banners (`cityBanners.reposition`) | 1.25 |

The real drag showed a different cost. In the drag's profile the largest single cost was not the frame at all: `refreshHover` (`src/ui/controls.ts`) picks the hex under the pointer on every pointer move, the pick raycast every triangle of every ground chunk its box test let through (`pickPaintedSurface`), and that took 21 % of the main thread against the frame loop's 16 %. Pointer moves arrive 60 to 120 times a second, so a drag at turn 130 spent more time picking than drawing, and the page drew 16 frames in 3.2 s.

#### What changed

All of these keep the picture the same.

1. **The pick tests only the triangles under the ray** (`paintedSurface.ts`). Each ground chunk's geometry gets a grid of its triangles on the ground plane (`PickGrid`), kept like the height samplers while the index and positions are the same. A pick clips the ray to the chunk's own height range, which on the board's oblique view is a short path, and tests only the triangles in the grid cells under it. Everything else is three's own arithmetic in three's own order: the same sphere and box tests, the same ray in the mesh's space, `Ray.intersectTriangle` on the same corners, the same distance, and the earliest triangle among equal distances. Test: `test/render/paintedSurface.test.ts`, 400 random rays, steep and shallow, over all three copies, against three's raycast: the same object, face, distance and point, bit for bit.
2. **The mirror draws through twins** (`seaMirror.ts`). The mirror pass clips at the water with a clipping plane, and three compiles a material with a clipping plane as a program of its own. So every material drawn in both passes changed program twice a frame, and each change makes three work out the material's whole parameter set and cache key again. A twin is `Object.create(material)`: every property, uniform, hook, cache key, version and id is read from the material, but three keeps its own record of the twin, so the twin stays on the clipped program and the material on the plain one. Before the mirror draws, each visible object is handed its material's twin; after, it gets its material back, and any property three wrote on a twin is taken off. A pass that also draws a shadow map keeps the materials, because the shadow bake teaches each receiving material its wrap lookup (`paintedShadowWrap.js`). Test: `test/render/seaMirrorTwins.test.ts`.
3. **The scene's matrices are walked once a frame** (`renderer3d.ts`). The loop walks them before the mirror pass and turns the scene's own walk off for both passes. Nothing moves between the two passes.
4. **The wrap copies a pass cannot see are left out of it** (`copyCulling.ts`). The board's three copies each hold about a thousand meshes, and three tests every visible mesh against the camera in every pass. A copy is now hidden for a pass when the box round its meshes' bounding spheres (the very spheres three tests) lies outside the camera's view, so three would have culled every one of them anyway. A mesh as wide as the map (the chart's paper) stays out of the box and is left to three; a copy that holds one has its other meshes hidden one by one. The layers that keep their three copies as siblings in one group (the pieces, the works, the sites, the towns, the roads, the borders and the border tint) are culled the same way, mesh by mesh, with their boxes measured again whenever a mesh, its sphere, its place or its culling flag changes. Nothing is hidden in a pass that draws a shadow map. Tests: `test/render/copyCulling.test.ts`, which pans a camera over three copies and checks that a hidden copy never holds a mesh three would draw.
5. **The town banners read every point before they move any banner** (`src/ui/cityBanners.ts`). A projection reads the canvas's size, and a read after a style write makes the browser lay the page out at once; with the two interleaved, a pan laid the page out once for each town on every frame. Test: `test/ui/cityBannerHover.test.ts`, "projects every banner before it moves any of them".

#### After

Back to back with the unchanged code, two loads each, turn 130, load average 40 to 63. The loop's time is the median of each block of 120 panning frames, two blocks a load. The drag is the real pointer drag of 3.2 s.

| | Middle zoom, before | Middle zoom, after | Closest zoom, before | Closest zoom, after |
|---|---|---|---|---|
| Draws a frame (mirror + main), median | 824 | 824 | 428 | 428 |
| Triangles a frame | 4.53 M | 4.53 M | 2.53 M | 2.53 M |
| Program lookups a frame | 68 | **0** | 52 | **0** |
| Matrix walk: objects visited a frame | 9,040 | **4,529** | 9,040 | **4,529** |
| Matrices composed a frame | 803 | **412** | 803 | **412** |
| Meshes tested against the camera a frame | 3,696 | **1,304** | 3,696 | **1,304** |
| Frame loop while panning (ms) | 24.1, 23.4, 24.0, 24.2 | **19.0, 19.8, 20.8, 20.5** | 19.7, 20.2, 19.3, 18.8 | **15.4, 14.8, 15.2, 15.2** |
| Time between frames while panning (ms) | 43.1, 39.7, 42.4, 44.8 | 38.1, 37.6, 40.6, 41.7 | 22.0, 22.9, 20.8, 20.9 | 21.8, 20.5, 21.1, 21.3 |
| One pointer pick (ms, median of 15; min to max) | 23.4 (5 to 50) | **0.2** (0 to 104) | 17.4 (13 to 37) | **0.3** (0.1 to 96) |
| Real drag: frames drawn in 3.2 s | 33, 42 | 56, 56 | 63, 112 | 95, 91 |

The highest pick times after are the first picks over chunks whose triangle grid had not been built yet. That run was made before the last change of the pass: the idle warm-up of section C (change 5) now builds each chunk's pick grid beside its height sampler, so a first pick finds it ready. The pick grids are data on the page's side only and draw nothing.

The meshes tested a frame, by layer, at the middle zoom (main + mirror): the board 1,323 + 111 → 443 + 42, the works 660 + 660 → 220 + 249, the pieces 320 + 315 → 110 + 119, the sites 126 → 42.

What the figures say:
- The counts fell as planned and the draws did not change.
- The frame loop's own time fell by about a fifth at both zooms, back to back.
- The time between frames fell less. Under this load the frame was often waiting on something other than the page's own CPU time (the GPU process and the compositor, shared with the other agent's work): at the closest zoom the time between frames stayed at about 21 ms with either code. On an unloaded machine the loop's share of the frame is larger, as the first pass found.
- The real drag sends its pointer moves through the DevTools protocol from a loaded machine, so its frame counts vary a lot from run to run. The pick's own time (above) is the firmer figure: it was about 20 ms on every pointer move, and a drag moves the pointer 60 to 120 times a second.

Turn 1 on the standard map, one load each, load average 45 to 70: the same 105 draws at the middle zoom; program lookups 16 → 0; matrix visits 6,620 → 3,319; meshes tested 277 → 110; the loop while panning 8.5 and 8.1 ms → 6.4 and 5.7 ms at the middle zoom, 8.1 and 8.4 → 6.5 and 6.1 ms at the closest. The time between frames stayed at the display's 16.7 ms: at turn 1 the frame already kept up.

### B. The load time of a new game

#### Before

From the press on Continue to the first drawn frame of the board, the unchanged code, back to back with the worktree (load average 5 to 13):

| Map | Runs | First frame (s) | The board worker (s) | Of it, the land step (s) | After the board (s) |
|---|---|---|---|---|---|
| Standard, turn 1 | 3 | 37.0, 35.4, 37.1 | 31.3, 29.9, 31.1 | 26.9, 25.6, 26.7 | 5.0, 4.9, 5.3 |
| Giant, turn 1 | 2 | 174.1, 178.2 | 143.9, 150.1 | 124.0, 128.9 | 27.3, 25.2 |

A CPU profile of the board worker on the standard map (41.6 s with the profiler on) put a quarter of the build in one function, `surfacePatch` (10.6 s of its own time), which clips a mark to a hex's triangles. It is called for every piece of the organic river ribbon near each river hex (`organicRivers.pieces`, 12.0 s with its callees), against every triangle of the hex. For each triangle it first built a list of the three corners and four more lists to find their bounds, and most triangles are then thrown away because they lie outside the mark. Next came the vertex weld (`indexGeometry`, 4.6 s), the hex triangulation (`triangulate`, 1.6 s), the pigment and the sea's attributes.

After the board, the page spent most of its time building every layer twice. `createRenderer` (`src/main.ts`) gave the renderer the state before the controls gave it a seat, so the first build drew the works, the sites, the pieces and the rest for the whole map, and the controls' first seat built them all again a moment later. On the Giant map the first build alone was about 18 s of the page's time (the works 10.9 s, the sites 5.4 s). The sea's distance bake (`bakeSeaDistances`) took another 5.2 s on the page once the board had come back.

#### What changed

1. **The clip rejects a triangle without building lists** (`src/terrainStudy/surfacePatch.js`). The bounds test reads the six coordinates from the buffer. The clip of a triangle that passes is the same code as before. Test: `test/render/surfacePatch.test.ts` keeps the old function as the reference and compares 60 marks inside, across and outside a hill hex, number for number.
2. **The weld hashes the normal with the position** (`src/terrainStudy/indexGeometry.js`). The ground is flat-shaded, so each corner is shared by faces with different normals, and a hash on the position alone sent all of them down one probe chain. Which vertices are equal, and the order each first appears in, do not depend on the hash. Test: `test/render/indexGeometry.test.ts`, against the old weld.
3. **The triangulation keys an edge by a number** and reads each new point once (`src/terrainStudy/terrainMesh.js`). A `Map` keeps insertion order for either kind of key, so the faces come out in the same order.
4. **The land and the far view are built by four workers at once** (`paintedBoardAsync.js`, `paintedBoard.js`, `paintedBoard.worker.js`).
   - The map is cut into the far view's regions (18 by 18 hexes, three by three land chunks). `paintedBuildParts` shares them among the parts by an estimate of their work (a land hex counts four, a water hex one), largest first.
   - Each part works out the whole map's shape, rivers and coast first, because a hex's ground reads its neighbours. Then it builds the land chunks and the far view of its own regions only.
   - Every batch carries `order`: the step, the land chunk that made it (or, for the far view, the chunk that first added to its region), and a count. Sorted by `order`, the parts' batches are the batches one whole build makes, in its order. The page sorts them and hydrates the board as before.
   - The number of workers is `painted.build.workers` in `data/view3d.json` (4), never more than one fewer than the device's cores. 1 is the old single worker.
   - Tests: `test/render/paintedWorker.test.ts`, "shares the regions among the parts…": a 24 by 20 map built as three parts, through the page's own merge, is byte for byte the board one worker builds.
5. **The board is shown to its first seat before the first state** (`src/main.ts`). `createRenderer` sets the fog seat to the seat the controls will open at, so each layer is built once. The controls still send the seat, and the same seat again changes nothing. Test: `test/ui/firstSeat.test.ts` (reads the source).
6. **The sea's distances are baked while the land is built** (`seaDistances.js`, `seaDistances.worker.js`, `renderer3d.ts`). The prepared terrain is complete when the land step starts, so the part that sends it now sends it then. The page hands it to a small worker, which bakes the distances while the land is still being built, and the page makes the texture from the numbers when they come back. Tests: `test/render/paintedWorker.test.ts`, the two cases about the early terrain.

#### The board is the same

The fingerprint of everything the workers hand the page (every batch's bytes in order, and the prepared terrain):

| Map | Unchanged code | Worktree, four parts |
|---|---|---|
| Standard, turn 1 | batches 2539583501, terrain 700843773 | the same, from the early terrain message |
| Giant, turn 1 | batches 1825417839, terrain 4002607866 | the same |

And the pictures at turn 1 and turn 130 (section "The proof that the picture is the same" below) have 0 differing pixels.

#### After

Back to back with the unchanged code, load average 5 to 13. These runs were made before change 6: in them the page baked the sea's distances itself.

| Map | First frame (s) | The board build (s) | Of it, the shape, rivers and coast (s) | The land (s) | The far view (s) | After the board (s) |
|---|---|---|---|---|---|---|
| Standard, turn 1, before | 37.0, 35.4, 37.1 | 31.9, 30.5, 31.8 | 2.6, 2.6, 2.6 | 26.9, 25.6, 26.7 | 1.7, 1.7, 1.8 | 5.0, 4.9, 5.3 |
| Standard, turn 1, after | **13.2, 14.4, 13.3** | 10.3, 11.4, 11.2 | 4.2, 3.9, 4.7 | 5.5, 6.4, 5.6 | 0.3, 0.5, 0.5 | 2.9, 2.9, 2.1 |
| Giant, turn 1, before | 174.1, 178.2 | 146.8, 153.0 | 11.2, 12.9 | 124.0, 128.9 | 8.7, 8.3 | 27.3, 25.2 |
| Giant, turn 1, after | **62.1, 73.5** | 55.6, 66.3 | 27.3, 22.5 | 22.5, 37.4 | 5.1, 5.4 | 6.5, 7.2 |

The final code, with change 6, back to back again. The other agent's load had risen (load average 24 to 52):

| Map | First frame (s) | The board build (s) | Shape, rivers, coast (s) | The land (s) | The far view (s) | After the board (s) | Longest page stop during the build (ms) |
|---|---|---|---|---|---|---|---|
| Standard, before | 62.1, 65.5 | 54.2, 57.7 | 3.8, 3.7 | 45.0, 48.0 | 4.0, 4.7 | 7.9, 7.8 | 54, 52 |
| Standard, after | **21.9, 38.2** | 18.5, 34.0 | 6.8, 13.2 | 10.3, 17.7 | 0.9, 1.2 | 3.5, 4.2 | 593, 982 |
| Giant, before | 235.5 | 189.1 | 10.2 | 157.8 | 15.1 | 46.4 | 51 |
| Giant, after | **160.0** | 145.9 | 74.3 | 61.3 | 8.4 | 14.1 | 6,520 |

Under this load the four parts compete with the other agent's work for the cores, so the split gains less: the shape, rivers and coast, which every part works out, took 74 s on the Giant map where one worker took 10 s. On a machine with its cores free the earlier table is the better guide. The last column counts only the time of the build: the unchanged code's page stopped after the board instead, while it baked the sea and built the layers twice (the column before it).

What the figures say:
- The land step is now a fifth of what it was on the standard map (four parts and a cheaper clip), and the far view a fifth too.
- The shape, rivers and coast now take longer, because every part works them out and the four copies compete for the machine with the other agent's work. On the Giant map they are now the largest part of the build (section "Not measured, and still open").
- After the board, the page's own work fell from 25 to 27 s to 6.5 to 7 s on the Giant map: the layers are built once, for the seat's eyes, and the sea's bake no longer waits for the board.
- The worker profile of the standard map after changes 1 to 3 (one worker, 23.4 s with the profiler on): `surfacePatch` 1.2 s of its own time (from 10.6 s), the weld's comparison 0.8 s (from 2.4 s), the triangulation 0.7 s (from 1.4 s).

### C. The pause at a turn end

#### Before

One real turn end, turn 130 to 131, on the unchanged code (`measure3.mjs`, the second pass's turn measure): the one state sync after the turn resolves, split by rebuild. In that turn 18 hexes changed hands and 4 roads were laid; the tint layer clipped 130 hexes again, the border layer 47 and the road layer 2.

Two loads of each side, back to back with the worktree (load average 18 to 72; the "before" of the second pair ran under the higher load). Milliseconds:

| Rebuild | Before, run 1 | Before, run 2 |
|---|---|---|
| The state sync | 423 | 788 |
| The longest frame of the turn | 553 | 1,102 |
| `units.build` | 181 | 300 |
| `rebuildTerritory` | 252 | 352 |
| of which the border tint | 191 | 291 |
| of which the border line | 32 | 30 |
| `rebuildRoads` | 60 | 151 |
| `rebuildPaintedWorks` | 79 | 189 |
| `rebuildLens` | 12 | 43 |
| `rebuildCities` | 7 | 24 |
| `rebuildImprovements` | 7 | 12 |

A profile of the changed code's turn end named two more costs beside the ones the second pass left open:
- `units.build` spent more than half its time (224 of 404 ms with the profiler on) in three's raycast of the terrace shelves. The shelves are an instanced batch registered as ground, so every height a piece stood at near one walked every instance and every triangle of the shelf (`samplePaintedWorld`, through `paintedUnitSupport` and `placePiece`).
- Every hex whose ink was clipped again was tessellated first (`terrainMesh`), by the border line and again by the border tint: about a fifth of the tint's rebuild.

#### What changed

1. **The clip rejects a triangle without building lists** (the same change as B1). The border tint clips each of its marks on its own, and each clip walked every triangle of the hex.
2. **The road layer does not fold a hex's marks again when they are the same array** (`paintedGround.ts`). The road and border plans keep a hex's marks array when nothing near it changed, and never change an array they have handed out. Test: `test/render/paintedGroundCache.test.ts`, "does not fold again a marks array it has drawn…".
3. **A hex's tessellated top is kept** (`paintedGround.ts`, `groundTop`). It depends only on the prepared hex, and the clip only reads it. Test: "tessellates a hex once for every layer and build…" in the same file.
4. **The pick and the height walk an instanced batch as three does, through the triangle grid** (`paintedSurface.ts`, `nearestOnInstanced`). The whole batch's sphere first, then each instance as a mesh at its own place, and only the triangles under the ray. Test: `test/render/paintedSurface.test.ts`, "finds the same hit on an instanced shelf as three's raycast…": 300 rays and 16 heights against three's own raycast, to the last bit.
5. **The ground's height samplers are built in idle time after the first frame** (`warmPaintedSurface`, `scheduleSurfaceWarm` in `renderer3d.ts`). Because the layers are now built for the seat's eyes at load (B5), a chunk the seat had not seen had no sampler, and a turn that showed new ground built them inside the turn end. They are now built a few milliseconds at a time while the player looks at the board, and each chunk's pick grid (A1) with them. Test: "warms the samplers a slice at a time…".

#### After

Four pairs, each the unchanged code and then the worktree. In pairs 3 and 4 the board was left alone for 15 s before the turn ended (`measure4.mjs`), as a player looks at it, so the idle warm-up (change 5) had time to run. Load average 18 to 72 and rising through the runs. Milliseconds, before → after:

| Rebuild | Pair 1 | Pair 2 | Pair 3 (15 s wait) | Pair 4 (15 s wait) |
|---|---|---|---|---|
| The state sync | 423 → **366** | 788 → **429** | 534 → **443** | 787 → 946 |
| The longest frame of the turn | 553 → 672 | 1,102 → **671** | 730 → 730 | 1,173 → 1,401 |
| `units.build` | 181 → 169 | 300 → **183** | 212 → 234 | 369 → 323 |
| `rebuildTerritory` | 252 → **169** | 352 → **162** | 290 → **139** | 354 → 407 |
| of which the border tint | 191 → **120** | 291 → **112** | 226 → **100** | 270 → 301 |
| of which the border line | 32 → **14** | 30 → **16** | 37 → **14** | 45 → 50 |
| `rebuildRoads` | 60 → **32** | 151 → **38** | 67 → **33** | 134 → **72** |
| `rebuildPaintedWorks` | 79 → 108 | 189 → 162 | 129 → 170 | 210 → 254 |
| `rebuildLens` | 12 → 16 | 43 → 18 | 17 → 45 | 30 → 96 |
| `rebuildCities` | 7 → 23 | 24 → 21 | 11 → 26 | 17 → 63 |

The fourth pair's worktree run had the highest load of the pass (load average 66 and rising) and is slower in every row, the clipping rows too.

What the figures say:
- The ground ink is about half what it was in the three comparable pairs: the border tint 191 to 291 ms → 100 to 120 ms, the border line 30 to 37 → 14 to 16, the roads 60 to 151 → 32 to 38.
- The pieces' placement, in a profile of the worktree's turn: `placePiece` 81 ms, of which the heights 76 ms, where the first profile of this pass had 273 ms, 224 of them in three's raycast of the shelves. What is left of `units.build` is mostly the old pieces' disposal (70 ms) and the new instance buffers; the layer is still rebuilt whole.
- The works, the lens and the towns did not fall, and are often slower. Part of that is load. Part is change B5: the first state's layers are now built for the seat's eyes, so the works' recipes for a hex the seat has not seen are made at the turn end that shows it, where before the first build had made them all at load. The heights are warmed in idle time; the recipes are not (section "Not measured, and still open").
- The layers clipped about the same hexes again: the tint 130 before and 134 after, the border line 47 and 49, the roads 2 and 5. The worktree's few more are hexes the seat sees for the first time in that turn, whose ink it now makes then (B5).

### Choices for the user: two settings that change the picture

Both are rows of `data/view3d.json` under `visualTest.coast.open.mirror`, typed in `lookData.ts`, and both ship as `true`: the picture as it was. Measured on the turn-130 game at the middle zoom while panning (`choices.mjs`), each against the shipped setting in alternating blocks, three rounds, load average 44 to 64. The pictures are at the seat's start, clock held, interface hidden, 1600 by 1000.

| Setting | What changes | Draws a panning frame (mirror) | Frame loop, three rounds (ms) | Difference | Pictures | Recommendation |
|---|---|---|---|---|---|---|
| Shipped (`whileMoving: true`, `works: true`) | nothing | 865 (269) | 19.2, 19.1, 18.9 | | | |
| `whileMoving: false` | the sea shows no reflections on a frame drawn while the camera moves, and they come back on the first frame after it has been still for `settleMs` (150 ms) | 587 (0) | 12.7, 12.2, 12.5 (−35 %) | on a moving frame: 0.55 % of pixels differ, mean 0.056, at most 62 | `pics/mirror-moving-before.png`, `…-after.png`, `…-difference.png` | The largest gain on the panning frame. Visible only while the camera moves, as reflections of ships, rocks and towns that blink out and back. The user's call; a first look in the browser while dragging decides it. |
| `works: false` | the farms, mines, herds and fishing boats never reflect; towns, pieces and stones still do | 713 (118) | 17.2, 16.9, 16.5 (−11 %) | 0.08 % of pixels differ, mean 0.003, at most 31: specks at coastal works and the fishing boats | `pics/mirror-works-before.png`, `…-after.png`, `…-difference.png` | Not visible at normal size except the fishing boats' small reflections. Safe to turn on if the boats' reflections do not matter. |

Under this load the time between frames stayed about 35 ms with either setting: the frame was waiting on something other than the loop's own CPU time (the GPU process or the compositor, shared with the other agent's work). On an unloaded machine the loop's time is a larger share of the frame.

Two candidates from the brief were not built:
- **A lower pixel ratio or a lighter contact pass while the camera moves.** The first pass found the frame limited by the CPU's work for each draw, and the GPU-side choices saved at most a tenth of a frame. Changing the pixel ratio also reallocates the full-size render targets (about 150 MB at the user's buffer) at the start and the end of every pan, which would itself be a stall.
- **A mirror at a lower rate while panning.** `whileMoving: false` is the same idea taken all the way, and its gain is measured above.

### The proof that the picture is the same

Clock held, interface hidden, `Math.random` seeded; the unchanged code against all the changes of this pass (both choices at their shipped `true`), pixel by pixel:

| Case | Closest | Middle | Farthest | Closest, inland |
|---|---|---|---|---|
| Turn 130 | 0 | 0 | 0 | 0 |
| Turn 1 | 0 | 0 | 0 | 0 |

The largest difference in any channel was 0 in every comparison. The pictures are `pics/std-t130-…-before.png` and `…-after.png`, and `pics/std-t1-…`. The same check was made twice on the way (after the mirror and culling changes, and after the split build and the first seat), with 0 differing pixels each time. The board worker's output was compared byte for byte (section B).

### Tests

New: `test/render/copyCulling.test.ts`, `test/render/seaMirrorTwins.test.ts`, `test/render/mirrorChoices.test.ts`, `test/render/surfacePatch.test.ts`, `test/render/indexGeometry.test.ts`, `test/ui/firstSeat.test.ts`. Added to: `test/render/paintedSurface.test.ts` (the pick grid, the instanced shelf, the warm-up), `test/render/paintedWorker.test.ts` (the split build, the early terrain), `test/render/paintedGroundCache.test.ts` (the marks array, the kept hex tops), `test/ui/cityBannerHover.test.ts` (the banner reads), `test/render/paintedKnobs.test.ts` (the new `build.workers` row), and `test/render/motionRest.test.ts` (its stand-in renderer has the new fields). `npm run test:render` ran twice. The first run had one failure, `test/render/paintedFog.test.ts`, a source pin that wants `revealing` last in the loop's `asked` line; the line now ends with it. In the second run every test that reported passed (1,432 of 1,436), but vitest caught two "Timeout calling onTaskUpdate" errors while `test/render/paintedWorker.test.ts` ran, at a load average of 66: the new split-build test held its worker for about 15 s. It now builds a smaller map (6 s on its own) and passes on its own run; the module was not run a third time. `npm run typecheck`: no errors.

### Not measured, and still open

- **GPU time**, as in section 1. And the frame rate under this pass's load: the time between frames stayed near 35 ms at the middle zoom whatever the loop cost, so the loop's gains are given as CPU time and counts, and the frame rate on an unloaded machine was not measured.
- **The load at turn 130 on the unchanged code** was not timed back to back; the load tables are turn 1. The turn-130 load on the worktree was 34.7 s with the profiler on, most of it the replay of 130 turns.
- **The early steps of a split build run once in every part.** Each part works out the whole map's shape, rivers and coast before its share of the land, because a hex's ground reads its neighbours. On the Giant map they took 22 to 27 s of a 55 to 66 s build with four parts on this loaded machine, against 11 to 13 s with one part. They are now the largest part of a Giant load. Sharing them (one part works them out and hands them on) needs the river and coast objects to cross between workers.
- **The first state's layers no longer warm the caches for the whole map** (B5). The works' recipes and the ground ink for hexes the seat has not seen are made when the seat first sees them, at that turn's end, where before the first build had made them all at load. The ground's height samplers are warmed in idle time (C5); the recipes are not.
- **The hover pick of a unit model** (`pickUnitModel`) still raycasts the scene on a pointer move that is not a drag. It was not measured; a drag no longer reaches it.
- **The town tint clips each of its marks on its own** (the second pass's open item). The clip itself is faster (C1, C3); the marks are still clipped one by one, as `projectMarkings` with one mark gives the same pieces as with all of them.
- **The page still stops for a few seconds while a Giant map's terrain arrives.** The prepared terrain is a large message (about 131 million values on the Giant map). The page reads it once, as before the pass, and now also hands it to the sea's worker, which copies it again on the page's thread. The loading sheet stood still for 6.5 s in the final Giant load (load average 47). It happens while the land is being built, so it does not lengthen the load. Sending the terrain from the board worker to the sea's worker through a `MessageChannel` would keep the page out of it.
- **Found: the chart's paper is drawn three times in the same place.** `createChartTable` (`paintedBoard.js`) clones the paper into each wrap copy with `matrixWorldAutoUpdate` already false, so the clones never take their copy's offset: all three stand at x = 0 (read in the page: `matrixWorld` x is 0 in the copies at −138.6, 0 and +138.6). So the paper is not drawn on the far side of the seam, and the two side copies draw the middle one again. Fixing it changes the picture at the seam, so it was left for the user. The copy culling (A4) leaves the paper to three's own test.
- **Twins and new material code.** A material whose shader hook stores the compiled shader to change it later would not see its twin's copy changed. No material drawn in the mirror does so today (checked by reading every `onBeforeCompile` in `src/render3d` and `src/terrainStudy`); a new one that does would show a stale uniform in the reflection only.

## Fourth pass

The ruling: `docs/flags.md`, "The bot's turn in phases, and a fourth rendering speed pass. Ruled 2026-11-17." The user: "could we try to improve the graphics performance further?" The rules of the third pass still hold. Panning comes first, then the load time of a new game, then the pause at a turn end. A change that keeps the picture the same needs no approval. A change to the picture comes with pictures, a difference figure and one setting to revert, and ships off unless the difference cannot be seen.

### Method

- The unchanged code is a `git archive` of `decks` at `0e25b104`, served on port 5263. The worktree is served on 5264. Each server has its own dependency cache, no hot reload and no file watching. One headless Chrome (ANGLE on Metal, Apple M4). Everything runs at `nice 15`.
- **The fixtures are new.** The saves of the earlier passes are schema 243 and the game is now 244, so the save shelf does not list them. The bots played a new turn-130 game in the page with the same seed (20261116): 74 towns and 373 units, where the old one had 71 and 444. The turn-1 standard save and the Giant save (180 by 112, 8 seats) were made again too.
- **A trap in the method.** A Vite server with no file watching serves each module as it was when a page first asked for it. Every "after" run must come after a restart of the worktree's server. The first seam pictures and two turn-end runs of this pass were served stale code and were thrown away.
- **The machine was not quiet.** Other agents ran bot games and test suites through the whole pass. The one-minute load average was between 4 and 75. Every timing script waits up to four minutes for the load average to fall under 6 before it times anything, and each table gives the load it measured at. The GPU was shared too: with my tab parked on a blank page, the GPU's own counter (`ioreg`, IOAccelerator) read 6 to 49 % busy from other programs (the user's browsers and the window server).
- **New tools.** Chrome's tracing through the DevTools protocol (`Tracing.start`, categories `toplevel`, `gpu`, `gpu.angle`, `viz`, `cc`, `benchmark`, `blink.user_timing`, `devtools.timeline`, `disabled-by-default-gpu.service`, `disabled-by-default-gpu.device`), read for each thread of each process between two marks the page sets. The GPU's busy share from `ioreg`. And diagnostics that take one thing out of the frame at a time, in alternating blocks, with the time between frames as the figure.
- Scripts: `/private/tmp/claude-501/-Users-jacky-code-webciv/c4da3ce5-796a-4aa7-8603-c5fc07da6b1d/scratchpad/renderperf4/` (`trace.mjs` and `tracesum.cjs` for the traces, `gpuutil.mjs` for the GPU counter, `diag.mjs` and `diag2.mjs` for the diagnostics, `drawlist.mjs` for the draws, `measure4.mjs` and `turnsum.cjs` for the turn end, `loadprof.mjs` for the load, `shots2.mjs`, `seamshots.mjs` and `shots-paperless.mjs` for the pictures, `choices4.mjs` for the picture-changing choice, `queueB.sh`, `queueG.sh` and `queueI.sh` for the final runs; results in `runs/`). Pictures: `pics/` there.

### Summary

- **What bounds a panning frame: the GPU.** Chrome's own trace shows the GPU process's main thread busy 98 to 99 % of every panning frame at all three zooms, and about half of that time it waits for the GPU to finish earlier frames. The GPU's own counter reads 86 to 94 % busy while the board pans (28 to 36 % of that is other programs on this laptop). The page's main thread is idle for half to two thirds of each frame. Taking the board's ground out of the frame takes the middle zoom's frame from about 43 ms to about 23 ms, and taking the trees out saves about 8 ms; nothing else moves it by more than the noise.
- **Panning: no change to the frame's cost was found that keeps the picture the same.** The ground is expensive because its triangles are about a pixel each at the middle zoom, and the only way to draw fewer of them is to change the picture. The pass measured and threw away three identical-picture ideas (no fog discard, a front-to-back draw order, fewer draws by merging). The draws were listed by layer at three zooms.
- **Outside the fence: the town banners.** At the farthest zoom the GPU process spends 18 ms a frame drawing the page's HTML again, because the banners move with a transform on elements with no compositor layer of their own. `will-change: transform` on `.city-banner` took that to 0.4 ms in a trace. It is in `src/style.css` and needs its own picture check.
- **The chart paper fault is fixed** (shipped on, as the brief asks): the paper now continues past the map's seam, and two of its three draws go.
- **The load.** The map's shape and rivers are worked out once and handed to the other three parts of the build; the hill mounds travel as typed arrays, so the prepared terrain message is 5.1 million values where it was 131 million; and the sea's bake gets the terrain straight from the board worker. The board is the same byte for byte on the standard and the Giant map.
- **The turn end.** The pieces' old meshes are disposed in idle time after the rebuild, the works' recipes for hexes the seat has not seen are made in idle time, and the border tint measures each hex's top once. The pieces' rebuild at the turn end fell from about 40 ms to 15 to 29 ms and the works' from about 55 ms to 35 to 49 ms.
- **The machine.** Besides the other agents' load, the laptop ran on battery in low power mode the whole day, and at 20 % charge Chrome's battery saver began to cap frames at 30 a second (from 14:46 page time). The frame-time comparison after that point measured the cap, so the panning "after" figures are counts only. See "Not measured".

### A. Panning

#### What bounds a frame

Turn 130, the camera panning 8 CSS pixels a frame through `panByScreen`, 120 frames, traced. The unchanged code; two runs on two days, load average 5.2 to 6.5 at the time (the scripts waited for it). "Waiting for the GPU" is `CALayerTreeCoordinator::ApplyBackpressure`, where the GPU process stops until the GPU has finished an earlier frame. "WebGL commands" is the GPU process running the page's GL calls through ANGLE (`CommandBufferService:PutChanged`). "Page raster" is the GPU process drawing the page's HTML layers again (`RasterDecoderImpl`, and the wait for that raster to be scheduled), which the moving town banners cause.

| | Closest | Middle | Farthest |
|---|---|---|---|
| Draws a panning frame (main pass; the mirror is off while moving) | 235 | 614 | 797 |
| Triangles | 1.53 M | 4.28 M | 4.78 M |
| Time between frames (ms) | 22.1, 20.7 | 45.8, 43.3 | 46.4, 45.3 |
| Page's main thread busy, a frame (ms) | 12.8, 11.3 | 16.9, 15.2 | 18.7, 20.0 |
| GPU process's main thread busy | 98 %, 99 % | 99 %, 99 % | 99 %, 99 % |
| of it, waiting for the GPU (ms a frame) | 10.9, 10.8 | 23.7, 22.7 | 11.7, 7.8 |
| of it, WebGL commands (ms a frame) | 6.1, 5.4 | 10.8, 10.2 | 12.8, 13.1 |
| of it, page raster (ms a frame) | 2.0, 1.7 | 7.1, 6.4 | 17.5, 19.6 |

The GPU's own busy share (`ioreg` IOAccelerator "Device Utilization %", sampled every half second for 12 s; it counts every program on the GPU):

| | Closest | Middle | Farthest |
|---|---|---|---|
| My page parked on a blank page | 36 % | 37 % | 29 % |
| Panning | 86 % | 94 % | 91 % |
| Still view, redrawn every frame (mirror on) | 87 % | 100 % | 100 % |

What the figures say:
- **The frame is GPU-bound.** The GPU process is never idle while the board pans, and its largest part is the wait for the GPU. The GPU is near full use, and a third of that is other programs on this laptop (the user's browsers and the window server), so on a machine with the GPU to itself the frame would be shorter, but bound in the same place.
- **The page is not the bound.** Its frame loop is 8 to 13 ms of a 21 to 46 ms frame. Cutting the page's CPU time alone cannot raise the frame rate on this machine.
- **The GPU process's own work matters at the farthest zoom.** There the page raster (the town banners, 18 to 20 ms a frame) is larger than the WebGL commands (13 ms) and the wait for the GPU (8 to 12 ms). The banners are moved with a CSS transform on elements that have no compositor layer of their own, so each pan frame makes the GPU process draw their layer again. That is `src/ui/cityBanners.ts` and `src/style.css`, outside this pass's fence. With `will-change: transform` on `.city-banner`, a trace showed the page raster fall from 18.0 to 0.4 ms a frame ("Not measured, and still open" below).
- **GPU timer queries.** `EXT_disjoint_timer_query_webgl2` is still on this backend; the pass did not get a clean reading from it (see "Not measured"). The trace and the GPU's own counter above answer the question it was meant to.

#### Where the GPU's time goes

Diagnostics, not changes: each takes one thing out of the frame (so changes the picture), in alternating blocks of 40 panning frames, three rounds (six for the last three rows), turn 130, middle zoom, the unchanged code. The figure is the median time between frames in each block. Load average 5.6 to 8 except where given.

| Taken out | Time between frames (ms), one figure a round | Triangles a frame |
|---|---|---|
| Nothing | 45.6, 43.8, 40.5 / 44.9, 50.5, 40.7 / 42.7 to 44.0 | 4.33 M |
| The whole board (ground, trees, stones) | 17.1, 16.8, 16.7 / 16.9, 16.9, 16.6 | 0.65 M |
| The board's ground (land, water, earth, decals) | 23.6, 23.4, 19.9 / 23.0, 24.5, 23.8 | 2.85 M |
| The merged land only | 30.1, 31.8, 32.6 (load 33 to 54) | 3.13 M |
| The merged water only | 41.7, 40.0, 35.0 (load 33 to 54) | 4.08 M |
| The trees (groves and cypresses) | 39.3, 35.9, 29.9 | 2.35 M |
| The stones | 43.0, 47.3, 38.1 | 4.19 M |
| The works, the pieces, the pins, the ground ink, the towns and sites, the banners | within the noise of "Nothing" | |
| The contact pass | 44.1, 40.5, 39.5 | |
| The miniature blur and the grade | 42.3, 40.5, 40.8 | |
| The board's far detail at the middle zoom | 39.2, 33.3, 36.0 | 3.06 M |
| The fog's two discards on every board material (six rounds, every hex in view charted) | 40.5 to 42.8 (base 42.1 to 43.6) | 4.33 M |
| Opaque objects drawn front to back across materials (six rounds) | 41.5 to 44.8 (base 42.1 to 44.0); the page's loop rose from 12 to 16 ms | 4.33 M |
| The chart paper (all three copies; six rounds) | 40.4 to 43.9 (base 42.1 to 43.6) | 4.25 M |

What the figures say:
- The board is about 60 % of the frame, and its ground is most of that: the merged land alone costs about 15 ms at the middle zoom. The land has about 1.2 million triangles in view there, on about 1.5 million pixels, so a triangle covers about a pixel. A GPU shades in blocks of two by two pixels, so a mesh this fine runs the land's fragment shader (the painterly style, two shadow maps, the bump map, the sky's light) about four times for each pixel it covers.
- The far detail at the middle zoom would save about 15 % of the frame, with a different picture. It is the one large lever, and it is a picture choice (below).
- The fog's discard is not the cost (Apple's GPUs lose their hidden-surface removal on a shader with `discard`, which was the reason to test it): about 3 %, inside the noise. Neither is the draw order. Neither is the number of draws: the works' 189 draws at the middle zoom cost less than the noise.

#### The draws

Draws of one panning frame, by layer (`drawlist.mjs`, turn 130; the mirror is off while the camera moves, by the user's choice of the third pass). The main pass, plus the counter shadow map where the counter rig re-fitted during the pan.

| Layer | Closest | Middle | Farthest |
|---|---|---|---|
| The board: ground chunks (land, water, earth, decals: about 28 chunks at the middle zoom), trees, stones, the chart paper | 74 | 283 | 246 |
| The works (instanced props by 12-by-12 region, sculpt and fog shade, three copies; and the merged field patches) | 38 | 189 | 261 |
| The pieces (body, outline and ghost of each bucket, each copy in view) | 52 | 81 | 104 |
| The resource pins (one instanced mesh for each kind, all three copies in one buffer, never culled) | 35 | 35 | 35 |
| The sites | 0 | 12 | 42 |
| The towns | 10 | 10 | 10 |
| The borders, the border tint, the roads | 12 | 23 | 32 |
| The contact pass and the output step (four full-screen quads) | 4 | 4 | 4 |
| The counter shadow map (pieces, when the rig re-fits) | 1 | 2.3 | 4.1 |
| The rest (map ends, fog, toon improvements, smoke, sails, birds, river glints, yield light) | 10 | 11 | 13 |
| **All** | **237** | **655** | **747** |

With the mirror on (a still view): 870 draws at the middle zoom, of which 135 in the mirror pass (the pieces 94, the board's stones 31, the towns 10). The static sun's map (4096²) is not drawn while panning: `renderer.shadowMap.autoUpdate` is false and the static sun bakes only when the charted world changes. The counter map re-fits only when the view walks off its box.

Each further draw costs the page about 7 µs and the GPU process about 12 µs (from the closest zoom's 235 draws to the middle zoom's 614: the page's loop 8 → 10.5 ms, the WebGL commands 6 → 10.5 ms), so 100 fewer draws would save about 1.2 ms of the GPU process's 43 ms. While the GPU is the bound, that does not shorten the frame. The draws that could go without a picture change and without more GPU work:
- The chart paper's two extra draws: fixed (D below). Middle zoom 870 → 868 draws with the mirror, 735 → 733 without.
- The resource pins' 35 draws, made at every zoom whatever is in view: the pins of each kind span the whole map, so a copy for each wrap copy, or regions, would draw about as many. Not changed.
- The board's props by region instead of by chunk, and the works by larger regions: fewer draws, but more off-screen instances sent to the GPU, which is the bound. Not changed.

#### What changed for panning

Only the chart paper (D below): two draws fewer at every zoom where the side copies are out of view. The pass looked for identical-picture savings in the GPU's work and found none above the noise (table above). The rendering's CPU side was not changed: the page is idle for half the frame.

#### The choice that changes the picture

The far detail from a closer zoom: `painted.lod.nearPixels` and `farPixels` in `data/view3d.json` (25 and 29 pixels a hex). The middle zoom is 59 pixels a hex at 1600 by 958, and about 73 at the user's buffer (2205 by 1182). Raised to 70 and 74, the middle zoom draws the board's far detail: the hex tops' coarser mesh and the map-scale tree and rock sculpts (about a tenth of the facets). Measured in the diagnostics above: 4.33 M → 3.06 M triangles, the frame about 15 % shorter. The trees read as blocks at that zoom, so it is not shipped. The pictures and the difference figure are in the choices table below.

### B. The load time of a new game

#### Before

The third pass left two faults in the split build. Every part of the build worked out the whole map's shape, rivers and coast before its share of the land, and on a loaded machine the four copies competed for the cores (22 to 27 s on the Giant map where one worker took 11 to 13 s). And the page read the prepared terrain from the board worker and then copied it on to the sea's worker itself, a stop of 6.5 s on the Giant map. The prepared terrain was large because the hill mounds travelled as arrays of `[x, y, z]` arrays: the message was 131 million values on the Giant map, and copying nested arrays costs a step for every number and every array.

#### What changed

All of these keep the board the same, byte for byte.

1. **The shape and the rivers are worked out once** (`paintedBoard.js`, `paintedBoard.worker.js`, `paintedBoardAsync.js`, `organicRivers.js`). The part that sends the prepared terrain posts the shape to the other parts as soon as it has it (before anything is carved into the tiles), and then the rivers: the ribbon's polygons packed as numbers, the small things along the banks, the corners a river reaches, the mouths, and each hex's cut. The page gives each other part a `MessageChannel` port to that part. A part that receives builds on what it was handed and works out the short steps itself (the mountains, the colours, the coast, the sea), in the same order on the same tiles. The rivers' land-step half (`riverLand`: the ribbon pieces on a hex and the trees, rocks, stones and reeds along its banks) is one function for the traced rivers and the handed-on ones. The setting is `painted.build.share` (true); false makes every part work them out, as before.
2. **The hill mounds travel as one typed array** (`surface.js`, `packTerrainMap`, `restoreTerrainMap`): nine numbers a triangle in a `Float64Array`, and each piece's other fields beside it in their own order. The restored mounds equal the built ones field for field. The prepared terrain message on the Giant map is 5.1 million values (it was 131 million).
3. **The sea's bake gets the terrain from the board worker** (`seaDistances.worker.js`, `renderer3d.ts`, `beginSeaBake`). The page starts the bake's worker before the board build and hands one end of a `MessageChannel` to it and the other to the board worker that sends the terrain. The page still reads the terrain once, for the board it hydrates.

Tests: `test/render/paintedWorker.test.ts`: a split build in which one part hands the shape and the rivers to the other, with organic rivers and a free coast on, gives the one-worker board byte for byte, works out the shape and the rivers once, and the page hands out the ports; the terrain port goes to the part that sends the terrain and no other; the board worker posts the same terrain to the port as to the page; the sea's worker bakes the same numbers from terrain that arrives on its port. `test/render/paintedKnobs.test.ts` has the new row.

#### The board is the same

Fingerprints of everything the board workers hand the page (every batch, in one build's order), and of the prepared terrain as the page holds it after the load (every tile's fields and its hill mounds). The terrain message itself changed form, so it is compared after the restore.

| Map | | Batches | Terrain message | Restored terrain |
|---|---|---|---|---|
| Standard, turn 1 | unchanged code | 1532852944 | 700843773 (27,241,033 values; the third pass's figure) | 3705028162 |
| Standard, turn 1 | worktree | 1532852944 | 199446467 (1,058,361 values) | 3705028162 |
| Giant, turn 1 | unchanged code | 781788191 | 4002607866 (131,455,201 values; the third pass's figure) | 3249121355 |
| Giant, turn 1 | worktree | 781788191 | 2794561086 (5,094,660 values) | 3249121355 |

#### After

From the press on Continue to the first drawn frame, no profiler and no fingerprint, back to back (unchanged code, then worktree). The load average was 23 to 33 and the laptop on battery in low power mode, so every figure is longer than on a quiet machine plugged in; the pairs are what to compare. "Early steps" is the shape, mountains, colours, rivers, coast and sea as the page saw the slowest part go through them. "Longest page stop" is the longest gap between two of the page's frames during the build.

| Map | | First frame (s) | Build (s) | Early steps (s) | The land (s) | Longest page stop (ms) |
|---|---|---|---|---|---|---|
| Standard, turn 1 | before | 26.1, 23.3, 17.9 | 21.4, 19.4, 15.2 | 7.4, 5.6, 4.1 | 12.3, 11.9, 9.9 | 611, 572, 437 |
| Standard, turn 1 | after | **21.6, 19.3, 15.4** | 17.4, 16.0, 12.7 | 4.5, 3.8, 3.1 | 10.7, 10.6, 8.4 | **202, 106, 63** |
| Giant, turn 1 | before | 104.4, 107.6 | 96.1, 97.6 | 36.5, 34.4 | 51.3, 52.1 | 3,220, 2,653 |
| Giant, turn 1 | after | 97.6, 108.5 | 86.9, 97.9 | 21.4, 27.2 | 53.1, 57.0 | **325, 313** |

What the figures say:
- The standard map comes up 14 to 17 % sooner in each pair. The early steps take about two thirds of the time, and the receiving parts wait about as long as one worker takes to work them out; the rivers now take 0.1 to 0.2 s in the slowest part, where they took 1.0 to 2.4 s.
- The page no longer stops for long while the terrain arrives: the longest gap between its frames during a standard build fell from 437 to 611 ms to 63 to 202 ms.
- **On the Giant map the build did not get faster under this load** (one pair 7 % sooner, one 1 % later). The early steps are 7 to 15 s shorter, as planned: the receiving parts wait 19 to 24 s for the shape and the rivers, where four parts working them out took 29 to 31 s to reach the land. But the land step and the far view came out 2 to 5 s longer each in both pairs. Two causes are possible and neither was tested: the four parts now start the land at the same moment and compete for the cores for longer, and the receiving parts' tiles come out of a copy (a structured clone), whose objects V8 may lay out differently from the ones `prepareTerrainMap` makes, so the land step's hot code may read them more slowly. `painted.build.share: false` turns the sharing off if a quiet machine shows the same.
- On the Giant map too, the page's longest stop during the build fell from 2.7 to 3.2 s to about 0.3 s: the terrain message is a twenty-fifth of its old size and the page no longer copies it on.

#### What the load's main thread still does

A CPU profile of the page during the worktree's Giant load (`runs/after-giant/page.cpuprofile`; that run also folded the fingerprint on the page, which is left out here). After the board arrives, the page's own work before the first frame is about 4 s:
- `setGameState`, 2.4 s. Of it, 1.1 s is the river glints' layer (`paintedFlow`), which traces the rivers again on the page (`createOrganicRivers`, 0.9 s) though a board worker traced them minutes before. The worker could send the glints' list (`flow()`) with the terrain; not done in this pass.
- The hydrate of the board from the workers' batches (`buildPaintedBoard` with `prepared`), 1.0 s.
- `rebuildBoard`, 0.8 s, of which the chart paper's geometry, 0.6 s (`paintedChartGeometry`, a fan of every hex of the map built on the page). It could be built in a worker.
- The board's shader programs (`warmPrograms`), 0.4 s, and the hill mounds' unpack (`restoreTerrainMap`), 0.1 s.

A board drawn before its dressing, with a reveal, was not built (it is a picture change at load and would need its own strip of frames).

### C. The pause at a turn end

#### Before

One real turn end, turn 130 to 131 of the new fixture, after the board was left alone for 15 s (`measure4.mjs`). In this turn 6 hexes changed hands and no road was laid; the tint layer clipped 30 hexes again and the border line 13. A CPU profile of the turn end on the unchanged code named the parts:
- `rebuildPaintedWorks` (54 to 84 ms): the layer's build (28 to 45 ms; in the profile 23 of its 47 ms were new recipes: the farm cuts and patches of hexes the seat sees for the first time) and the yield light it rebuilds (13 to 31 ms).
- `rebuildUnits` (40 to 64 ms, three rebuilds a turn end): in the profile 35 of its 59 ms were the disposal of the old pieces' meshes. three's disposal of an instanced mesh frees its vertex-array state by walking its record of every geometry and every program the renderer has drawn (`releaseStatesOfObject`), about a tenth of a millisecond a mesh with a board up, and the layer is rebuilt whole.
- `rebuildTerritory` (47 to 73 ms), most of it the border tint (25 to 48 ms), which measured each hex top's bounds again for every mark it clipped.
- **The longest frame of the turn end was twice the sync**: 295 to 384 ms, of which the sync was 128 to 209 ms. The rest was the draw: a static shadow bake, and 14 shader programs linked for the first time inside that frame, the same 14 on both codes (8 of the pieces' pigment materials and 6 plain basic materials; which variant of each was not found, because three's record of a program keeps only the start of its key). The profile put 144 ms in `getProgramInfoLog`, which waits for a link to finish. This happens at the first turn end after a load; a later turn end finds the programs made.

#### What changed

All of these keep the picture the same.

1. **The pieces' old meshes are disposed in idle time** (`instances.ts`, `disposeInstancedGroupSoon`; `pieces.ts`). A rebuild takes the old meshes out of the group at once, and they are disposed a few at a time in idle callbacks (at least one a slice, so the queue empties even on a page that is never idle). A mesh out of the group is not drawn. The layer's own disposal flushes the queue. Test: `test/render/disposeSoon.test.ts`.
2. **The works' recipes for hexes the seat has not seen are made in idle time** (`paintedWorks.ts`, `warmRecipes`; `renderer3d.ts`, `scheduleWorksWarm`). After each works build, an idle walk makes the recipe of each hidden hex with a work or a resource the seat can name, with the same fields `build` would give it. `build` checks every recipe it reuses against the hex as it is then, so a recipe made too early is made again. Nothing in this walk is drawn. Test: `test/render/paintedWorks.test.ts`: the warmed recipes are used when the hexes come into view, no recipe is made then, and the layer draws the same meshes, instance for instance, as a layer that never warmed.
3. **The border tint measures each hex top once** (`surfaceMarkings.js`, `projectMarkings` takes an `each` callback; `paintedGround.ts`). The tint fades each clipped piece by its own mark, so it clipped one mark at a time, and each call measured the top's bounds again. One call with `each` gives the same pieces with the same marks in the same order. Test: `test/render/surfacePatch.test.ts`.

#### After

Two pairs, the unchanged code then the worktree, the same turn end. Milliseconds. The load average was 5.7 to 6.2 at the start of each run; the laptop was on battery in low power mode.

| | Before, run 1 | Before, run 2 | After, run 1 | After, run 2 |
|---|---|---|---|---|
| The state sync | 164 | 173 | **128** | 178 |
| The longest frame of the turn | 336 | 366 | 302 | 444 |
| of which the sync / the draw | 164 / 170 | 173 / 187 | 128 / 173 | 178 / 264 |
| `rebuildUnits` | 40.8 | 40.3 | **15.5** | **29.1** |
| `rebuildPaintedWorks` | 54.4 | 57.6 | **34.6** | **49.0** |
| of which the layer's build | 32.8 | 35.4 | **18.7** | **28.9** |
| `rebuildTerritory` | 65.0 | 72.6 | 55.5 | 81.6 |
| of which the border tint | 44.0 | 47.9 | 33.7 | 46.7 |
| `rebuildYieldLight` | 14.9 | 16.0 | 10.4 | 12.9 |
| `rebuildLens`, `rebuildCities`, `rebuildSites` | 11.8, 19.2, 11.8 | 13.4, 14.5, 14.0 | 14.4, 12.8, 12.0 | 19.8, 18.8, 10.2 |

What the figures say:
- The two largest parts came down in both pairs: the pieces from about 40 ms to 15 and 29 ms, the works from about 55 ms to 35 and 49 ms.
- The second "after" run was slower in every other row (the territory, the lens, the towns, the draw), so the load rose under it; the whole sync is not a firm gain at this load.
- The draw half of the turn-end frame is now as large as the sync. Its largest part, the first-time program links, is the open item below.

### D. The chart paper at the seam (a picture change, shipped on)

- **The fault.** `createChartTable` (`paintedBoard.js`) clones the paper into each wrap copy and turned off the clone's matrix updates before the clone had ever been placed. Every object of the board has stopped following its parent by then, so the walk of the group that followed placed nothing, and all three papers stood at x = 0. The middle was drawn three times, and past the map's seam no paper was drawn: the view showed the table's bare ground with a hard edge where the map wraps.
- **The fix.** Each clone takes its copy's place once (`updateMatrixWorld` with its updates on) and only then stops following it. Test: `test/render/paintedFog.test.ts`, the three pages stand at −W, 0 and +W.
- **The picture.** It changes only past the seam: there the paper is now drawn, with its ruled hexes and its sea wash. Shipped on, as the brief asks for a fault. **For the user to look at:**

| View | Pixels that differ | Mean | Largest in a channel | Pictures |
|---|---|---|---|---|
| Seam, middle zoom, turn 1 (all paper) | 47.2 % | 4.6 | 39 | `pics/seam-t1-middle-before.png`, `…-after.png`, `…-difference.png` |
| Seam, farthest zoom, turn 1 | 32.2 % | 3.6 | 101 | `pics/seam-t1-farthest-…` |
| Seam, middle zoom, turn 130 | 47.2 % | 4.5 | 41 | `pics/seam-t130-middle-…` |
| Seam, farthest zoom, turn 130 | 26.7 % | 2.9 | 114 | `pics/seam-t130-farthest-…` |
| The seat's own farthest view, turn 130 (the seam is at its left edge) | 9.8 % | 0.9 | 126 | `pics/paper-t130-farthest-…` |
| The seat's own farthest view, turn 1 | 5.3 % | 0.4 | 102 | `pics/paper-t1-farthest-…` |
| The seat's closest, middle and inland views, turns 1 and 130 | 0 | 0 | 0 | |

- **Draws.** The two side papers are now culled by three like any mesh when their copy is out of view: 870 → 868 draws at the middle zoom (mirror on), 735 → 733 (off); at the seam one side copy stays in view, so 3 → 2 papers.

### The proof that every other change keeps the picture

Clock held, interface hidden, `Math.random` seeded; the unchanged code against the worktree, pixel by pixel, at four views. Because the paper fix changes the farthest view, the worktree's pictures were taken a second time with only the paper put back where the unchanged code draws it (the three papers' world x set to 0 in the page, `shots-paperless.mjs`):

| Case | Closest | Middle | Farthest | Closest, inland |
|---|---|---|---|---|
| Turn 130, all changes | 0 | 0 | 157,355 (the paper past the seam) | 0 |
| Turn 1, all changes | 0 | 0 | 85,037 (the paper past the seam) | 0 |
| Turn 130, all changes but the paper | 0 | 0 | 0 | 0 |
| Turn 1, all changes but the paper | 403 | 106 | 48 | 0 |

- At turn 130 the worktree with the paper put back matches the unchanged code at all four views.
- At turn 1 it differs in one place in each view: the shading round one stone off the coast (up to 44 in a channel), the same 403, 106 and 48 pixels on a second load. The shipped code does not show it: with the paper fixed, the turn-1 closest and middle views match the unchanged code exactly (0), and the farthest view differs only in the strip past the seam (its difference picture, `pics/paper-t1-farthest-difference.png`, has nothing else). So the stone's difference comes from putting the paper back in the page, which happens after the shadow bake and after the copy boxes were measured, and is not a perfect copy of the old build. It was not traced further.

### The choice that changes the picture

| Setting | What changes | Gain | Difference | Pictures | Recommendation |
|---|---|---|---|---|---|
| `painted.lod.nearPixels` 25 → 70 and `farPixels` 29 → 74 (not shipped; the data is unchanged) | the middle zoom draws the board's far detail: coarser hex tops, and the map-scale trees and rocks, which read as blocks | middle zoom, panning, turn 130: draws 643 → 515, triangles 4.26 M → 3.01 M; the frame about 15 % shorter in the diagnostics (three rounds), 37.6 → 34.0 ms in one block each under the battery saver | 23.5 % of pixels differ, mean 2.5, at most 212 | `pics/lod-middle-before.png`, `…-after.png`, `…-difference.png` | Keep it off: the trees are plainly blockier at normal size. It is the one large lever on the panning frame found in this pass, and it is a picture decision for the user. |

The two settings the user took in the third pass (`visualTest.coast.open.mirror.whileMoving: false` and `works: false`) are unchanged.

### Tests

New: `test/render/disposeSoon.test.ts`. Added to: `test/render/paintedWorker.test.ts` (the shared shape and rivers, the terrain port, the board worker's post to the port, the sea's bake from the port; and the long split-build tests now give the test runner a turn of the event loop between builds, because under load vitest's own messages timed out while they ran), `test/render/paintedWorks.test.ts` (the warmed recipes), `test/render/surfacePatch.test.ts` (one clip with `each`), `test/render/paintedFog.test.ts` (the papers' places), `test/render/paintedKnobs.test.ts` (`build.share`). `npm run test:render` ran twice under a load average of 30 to 75: both times 100 of its 101 files passed (1,444 tests), and the runner timed out on its own messages while `test/render/paintedWorker.test.ts` ran its long builds, so that file reported no result (the third pass met the same). The file's two split-build tests were then made smaller and given turns of the event loop between builds; on its own the file passes, 15 of 15, twice. `test/ui/cityBanners.test.ts` and `test/ui/firstSeat.test.ts` read the renderer's files and pass. `npm run typecheck`: no errors.

### Not measured, and still open

- **Frame times after the changes.** At 20 % charge Chrome's battery saver capped every frame at 30 a second from 14:46 page time: the worktree's panning frames read exactly 33.3 ms with both processes mostly idle. Low power mode was on all day. The panning comparison of this pass is therefore counts (draws, triangles), and the only change to the panning frame is two fewer draws. A rerun plugged in, or with `--disable-features=BatterySaverModeAvailable` (`chrome-nosaver.sh` in the scripts), would give the after figures.
- **An unthrottled frame rate.** `chrome-nosaver.sh uncapped` turns off vsync and the frame limit; it was not run before the battery saver came on.
- **GPU timer queries.** Not read cleanly this pass (the run was cut with the battery saver on). The trace and the GPU's own counter give the GPU-bound finding without them.
- **The town banners' raster** is the largest part of the GPU process's own work at the farthest zoom (18 to 20 ms a frame, more than the WebGL commands). They move with a transform on elements with no compositor layer of their own. `will-change: transform` on `.city-banner` would let the compositor move them with no raster; it is in `src/style.css`, outside this pass's fence, and may change how the banner text is rasterised, so it needs its own picture check. Measured once at the farthest zoom (turn 130, panning, the worktree; `trace.mjs --layered` adds the rule in the page): the GPU process's page raster fell from 18.0 to 0.4 ms a frame (`RasterDecoderImpl` and its wait). The time it freed went to waiting for the GPU (12.9 → 21.1 ms a frame), and the time between frames moved only from 44.6 to 42.7 ms, because the GPU is the bound here. On a machine whose GPU has room, it would take about 18 ms off the GPU process's frame at the farthest zoom. It is the largest saving this pass found that need not change the board's picture, and it is outside the fence.
- **The board's ground is the frame's largest cost**, about a pixel a triangle at the middle zoom. The picture-keeping ways to cut it are gone; what is left changes the picture: the far detail from a closer zoom (the choice above), or a coarser near mesh for flat hexes.
- **First-time program links at the first turn end** (about 144 ms of a 300 to 440 ms frame). `warmLatePrograms` compiles the gestures' programs in idle time after the first frame; the 14 programs this turn end linked are not among them. Compiling them in idle time too would move them off the turn end. Not done: the variants were not identified.
- **The static shadow bake at a turn end** runs in the turn end's frame (one bake a turn here). Not measured on its own.
- **The pins' 35 draws**, made at every zoom whatever is in view, and **the works' draws**, 189 to 261, were not cut: on this machine draws are not the bound.
- **Turn 1 panning** was not traced this pass (cut with the battery saver). The third pass found turn 1 kept up with the display at 105 draws.
- **The load's page work after the board** (about 4 s on the Giant map): the page traces the rivers again for the river glints (0.9 s) and builds the chart paper's geometry (0.6 s); both could come from a board worker. See B.

### How much speed is left

- **Panning:** little that keeps the picture. The GPU is the bound and the board's ground is most of its work; draws and the page's CPU are not the bound on this machine. The far detail from the middle zoom is worth about 15 % of a panning frame, as a picture choice. On a machine whose GPU has more headroom than this one (where a third of the GPU went to other programs), the town banners' raster and the WebGL commands come next.
- **Load:** the land step is now the bulk of a standard build (8 to 11 s of 13 to 17 s under load). It is already split four ways. What remains on the early steps is the shape (2.5 to 3.6 s), which only one part now works out; the others wait for it.
- **Turn end:** the first-time program links and the shadow bake in the draw half of the frame; in the sync, the border tint and the works' batch rebuild.
