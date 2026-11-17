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
