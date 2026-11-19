# The ground paint texture: the measuring test and the plan (2026-11-18)

The rulings: `docs/flags.md`, "Rendering: baked ground paint and a scroll cache (2026-11-18)", "Rendering focus: the ground paint texture (2026-11-18)" and "After rendering pass five (2026-11-18)". The background: `docs/plans/render-performance-2026-11-16.md`, "Fourth pass" and "Fifth pass".

This document has three parts. Part 1 is a test that measures the gain. Part 2 is the plan, as deep as the measurement justifies. Part 3 is the build of the plan's stages 1 and 2 (2026-11-18): what ships, and what was measured. Parts 1 and 2 are kept as they were written; where Part 3 differs from them, Part 3 is the current state.

## Summary

- **The gain is real at the middle and farthest zoom, and near zero at the closest.** A plain land that reads its paint from a texture makes a panning frame 13% to 17% shorter at the middle zoom, 14% to 17.5% shorter at the farthest, and 3% to 7% shorter at the closest (the closest zoom's range crosses zero in two runs of three).
- **The texture cannot be sharp at the closest zoom at a sensible size.** One texture over the standard map is 60 MB at 32 texels a unit and 239 MB at 64. The closest zoom draws 144 pixels a unit, so a patch edge is soft there at both sizes. At the middle and farthest zoom, 32 texels a unit looks the same as the present land at normal size.
- **Recommendation: build part of it.** Draw the plain, textured land at the middle and farthest zoom, where it gains and looks the same. Keep the present land for the closest zoom, where the texture gains nothing and looks softer. This also replaces the present far mesh, which saves about 160 MB of geometry.
- **Not recommended now:** a land with no cut mesh at all. It needs a second, denser set of textures for the closest zoom, and the closest zoom has no frame time to win.

## Part 1: the measuring test

### What the test is

- The switch is `painted.groundTexture.test` in `data/view3d.json`. It is off. The code is `src/render3d/groundPaintTest.js`, with small hooks in `paintedBoard.js`, `terrainPigment.js` and `renderer3d.ts`. The file's docblock lists what to delete.
- With the switch on, the board's far land is built a second way. It is the hex grid and the hill mounds with no brush patch cut into them. It is batched in the same 6-by-6 chunks as the near land, so the two are culled alike.
- The page bakes one texture from the near land's own vertex colours, seen from straight above. Only the flat ground is drawn into it: the hex tops, the beaches and the river banks. The hill mounds, the creases and the turf are not drawn into it.
- The plain land's shader reads the paint from the texture by the vertex's own x and z. A hill mound reads the same paint and keeps its slope shade in its vertex colour. Bare rock and the creases keep their own vertex colour and do not read the texture.
- The texture covers one wrap period and repeats in x, so the three wrap copies share it.
- `groundPaintTest.show(true)` on the board draws the plain land at every zoom. The measuring scripts use it to change between the present land and the plain land in one page.
- The present land is not changed by the switch. With the switch off, the page's pictures are the same as the "before" pictures of a page with the switch on (see "The picture").

### Method

- The fifth pass's method. One headless Chrome (ANGLE on Metal, Apple M4), vsync, the frame limit and the battery saver off. A 1600 by 1000 window at device ratio 2, so the canvas is 2400 by 1437. The turn-130 fixture (schema 244, 74 towns).
- Alternating blocks in one page: the present land, then the plain land with the texture. Eight rounds a run, 20 panning frames a block, one pixel read before and after each block so that a block waits for its own GPU work. The figure is the median, over the rounds, of the change against the same round's base block.
- My own dev server (port 5281, its own cache, no hot reload, no file watching), restarted before each run. Everything at `nice 15`.
- **The machine was not in the state the brief asks for.** The laptop was on battery in low power mode for the whole job (64% at the start, 30% at the end). I could not change that. Other agents ran heavy work: the one-minute load average was between 6 and 299, and the GPU's own counter read 73% to 100% busy with my page parked. The base frames are therefore longer than the fifth pass's (60 to 85 ms at the middle zoom here, 39 to 47 ms there). Read the percentages before the milliseconds.
- Scripts and results: `/private/tmp/claude-501/-Users-jacky-code-webciv/c4da3ce5-796a-4aa7-8603-c5fc07da6b1d/scratchpad/groundtex/` (`gtdiag.mjs` for the timings, `quadmodel.mjs` for the shader runs, `shots.mjs` and `plain.mjs` for the pictures and the load, `pics.sh` for the crops; results in `runs/`, pictures in `pics/`).

### The frame time

Three runs. Milliseconds a panning frame. "Change" is the median of the eight rounds, with the range of the rounds. The load is the one-minute load average during the blocks.

| Zoom | Run | Present land | Plain land with texture | Change (range) | Percent | Load |
|---|---|---|---|---|---|---|
| Closest | 1 | 30.5 | 29.1 | −0.9 (−1.4 to +0.1) | −3.0% | 7 to 12 |
| Closest | 2 | 33.6 | 31.5 | −2.5 (−5.9 to +3.0) | −7.3% | 14 to 18 |
| Closest | 3 | 33.7 | 34.1 | −1.6 (−4.5 to +2.3) | −4.8% | 10 to 18 |
| Middle | 1 | 69.2 | 56.9 | −11.4 (−24.9 to −6.3) | −16.4% | 12 to 32 |
| Middle | 2 | 84.7 | 64.3 | −11.4 (−55.8 to +15.9) | −13.4% | 55 to 78 |
| Middle | 3 | 60.1 | 50.0 | −10.5 (−11.9 to −5.1) | −17.4% | 219 to 230 |
| Farthest | 1 | 56.6 | 47.1 | −9.9 (−12.1 to −6.7) | −17.5% | 82 to 131 |
| Farthest | 2 | 54.4 | 47.3 | −7.6 (−9.5 to −6.4) | −13.9% | 275 to 291 |
| Farthest | 3 | 55.5 | 45.5 | −9.7 (−11.3 to −8.1) | −17.4% | 54 to 69 |

- Run 2 used a texture of 64 texels a unit, runs 1 and 3 used 32. The texture's size does not change the frame time by more than the noise.
- **Middle zoom: 10.5 to 11.4 ms shorter, 13% to 17%.** One run's range crosses zero (run 2, under a load of 55 to 78); the other two do not.
- **Farthest zoom: 7.6 to 9.9 ms shorter, 14% to 17.5%.** No range crosses zero.
- **Closest zoom: 0.9 to 2.5 ms shorter.** Two of three ranges cross zero. No firm gain.
- **Against the estimate.** The fifth pass estimated 7 to 12 ms of a 39 to 47 ms frame at the middle zoom (15% to 30%) and 6 to 10 ms of 36 at the farthest (17% to 28%). The measured percentages are at the low end of both. On the fifth pass's frame times, 13% to 17% is about 5 to 8 ms at the middle zoom and 5 to 6 ms at the farthest.
- **The upper limit.** In run 1 the present land with a one-colour material (no land shader at all) was 17.3 ms shorter at the middle zoom and 14.4 ms at the farthest. So the texture gets about two thirds of what the land's shading costs.

### Shader runs and triangles

The fifth pass's CPU count (`quadmodel.mjs`): every land triangle on screen is rasterised on the CPU. "Runs a land pixel" counts 4x MSAA and the 2-by-2 blocks; no depth test is modelled.

| Zoom | Land triangles on screen: present | plain | plain, far grid | Mean triangle (pixels): present | plain | plain, far grid | Shader runs a land pixel: present | plain | plain, far grid |
|---|---|---|---|---|---|---|---|---|---|
| Closest | 89,500 | 19,300 | 12,400 | 31 | 132 | 211 | 2.10 | 1.51 | 1.36 |
| Middle | 814,000 | 176,000 | 115,000 | 4.1 | 18 | 28 | 4.41 | 2.80 | 2.32 |
| Farthest | 1,789,000 | 387,000 | 254,000 | 0.4 | 1.8 | 2.7 | 10.33 | 6.29 | 4.56 |

- The plain land has 657,000 triangles a wrap copy. The present land has 3.09 million. The hex tops and mounds alone are 562,000; the rest of the plain land is the land a free coast lays in water hexes, the creases and the turf.
- The whole frame's triangles: 1.46 M to 1.19 M at the closest zoom, 5.04 M to 3.81 M at the middle, 5.83 M to 4.40 M at the farthest.
- At the farthest zoom the plain land's triangles are still under two pixels each, and the land is still shaded 6.3 times a pixel. A coarser mesh for that zoom has more to give (see "The coarser grid").

### The coarser grid

The test can also build the plain land on the overview's coarser grid (`painted.groundTexture.grid: "far"`: spacing 0.45 in place of 0.17, about 191 triangles a hex in place of 319, the mounds unchanged). 432,000 triangles a wrap copy.

| Zoom | Present land | Plain land, far grid | Change (range) | Percent | Load |
|---|---|---|---|---|---|
| Closest | 34.3 | 31.8 | −2.5 (−5.4 to +3.4) | −7.3% | 15 to 16 |
| Middle | 61.1 | 48.4 | −12.5 (−20.8 to −11.4) | −20.4% | 86 to 107 |
| Middle, second run | 65.2 | 51.8 | −12.7 (−16.2 to −9.0) | −19.5% | 183 to 190 |
| Farthest | 57.2 | 46.1 | −10.4 (−21.9 to −6.3) | −18.2% | 137 to 151 |

- The coarser grid adds about 3 points at the middle zoom (20% against 13% to 17%) and about 1 point at the farthest (18% against 14% to 17.5%), which is inside the noise there. The mounds, which it does not change, are 151,000 of its 337,000 top triangles.
- The picture changes more: the hex tops lose their small relief, so the light on flat ground is more even (pictures `pics/fargrid-<zoom>-before|after|difference.png`).

### The picture

The clock held, the interface hidden, `Math.random` seeded. The present land against the plain land in one page. A pixel "differs" when any channel differs by one level or more.

| View | Texels a unit | Pixels that differ | By more than 2 levels | Mean level | Largest |
|---|---|---|---|---|---|
| Closest | 32 | 10.6% | 4.2% | 0.48 | 106 |
| Closest | 64 | 8.4% | 2.3% | 0.27 | 101 |
| Closest, a hill region | 32 | 11.3% | 4.2% | 0.52 | 125 |
| Closest, a hill region | 64 | 8.9% | 2.2% | 0.31 | 125 |
| Middle | 32 | 12.0% | 3.0% | 0.32 | 86 |
| Middle | 64 | 10.3% | 1.9% | 0.23 | 86 |
| Farthest | 32 | 4.4% | 1.0% | 0.10 | 64 |
| Farthest | 64 | 4.4% | 1.0% | 0.10 | 64 |

Pictures, all in `/private/tmp/claude-501/-Users-jacky-code-webciv/c4da3ce5-796a-4aa7-8603-c5fc07da6b1d/scratchpad/groundtex/pics/`:
- Whole views: `home-<closest|middle|farthest>-before.png`, `-after.png` (32 texels a unit), `-after-d64.png`, `-difference.png`, `-difference-d64.png`. The same for `hill-closest-…`.
- Close crops, three boxes side by side at three times the size (before, after at 32, after at 64): `hill-closest-crop.png`, `river-closest-crop.png`, `road-closest-crop.png`, `border-closest-crop.png`, `coast-closest-crop.png`, `shore-closest-crop.png`, `patches-closest-crop.png`, `land-middle-crop.png`, `land-farthest-crop.png`.

What the pictures show:
- **Middle and farthest zoom: the same at normal size.** The differences are on patch edges and are one or two levels. At three times the size, a patch edge at 32 texels a unit is a little softer than the present one at the middle zoom; at 64 it is not.
- **Closest zoom: patch edges are soft.** The closest zoom draws 144 buffer pixels a unit. At 32 texels a unit an edge is a blur 4 to 5 pixels wide. At 64 it is about 2 pixels. At 96 (tried once: 538 MB) it is close to the present edge. The present edges are hard cuts with MSAA.
- **The beach's upper edge and the river banks are softer too**, because the test bakes them into the texture. Their largest differences (64 to 125 levels) are there and on lake rims. `river-closest-crop.png` shows it best: the pale bank beside the river is a blur at 32 texels a unit.
- **Hill mounds hold.** The mound's shape, its slope shade and its bare rock are geometry and vertex colour, as before. Only the strokes on the mound come from the texture.
- **Borders, the border tint, roads, the river ribbon, the fog, towns and works do not change.** They are separate layers or shader work, and the test does not touch them.
- **The switch does not change the shipped picture.** A page served with the switch off, against the "before" pictures of the page with the switch on: 0 pixels differ at the closest, middle and farthest zoom.

### Memory

One texture over the standard map (80 by 52 hexes; one wrap period is 138.6 units, the depth 79 units), sRGB 8-bit RGBA with mipmaps:

| Texels a unit | Size | Bytes with mipmaps | Sharp up to about |
|---|---|---|---|
| 32 | 4434 by 2528 | 60 MB | the middle zoom (51 pixels a unit) |
| 64 | 8868 by 5056 | 239 MB | 100 pixels a unit, between the middle and the closest zoom |
| 96 | 13302 by 7584 | 538 MB | the closest zoom (144 pixels a unit), nearly |

- The Giant map (180 by 112) is 311.8 by 169 units: 288 MB at 32 texels a unit. At 64 it is wider than the largest texture this GPU takes (16,384).
- Geometry on the GPU, one wrap copy (the copies share it): the present near land 306 MB (3.09 M triangles), the present far land 247 MB (2.48 M triangles), the plain land 87 MB (657,000 triangles).
- The board's whole geometry is 678 MB today and 518 MB with the test on, because the plain land takes the far land's place. With the 60 MB texture, the test's board is about 100 MB smaller than today's.

### The load step

Standard map, turn 130, four board workers. Two loads each, back to back, under a load average of 21 to 55.

| | Switch off | Switch on |
|---|---|---|
| Board build (s) | 10.4, 17.4 | 10.9, 15.9 |
| of it, the land step (s) | 6.8, 10.9 | 7.2, 9.2 |
| of it, the far view step (s) | 0.7, 1.4 | 0.2, 0.2 |
| The texture bake, 32 texels a unit (s) | none | 0.3 to 1.1 (ten first bakes) |

- The build time does not change by more than the noise. The plain far land is cheaper to build than the cut far land (no cuts, and the far view step falls from 0.7 to 1.4 s to 0.2 s), but the near land's cuts are still made.
- The bake runs on the page's GPU and stops the page once, for 0.3 to 1.1 s at 32 texels a unit. A second bake in the same page took 1.4 to 2.3 s at 32 and at 64 (the mipmaps are made again after each of the bake's squares; a build would make them once).
- **Not measured:** the build time of a land with no cut mesh at all. That is the load gain of the full design (stage 4 below).

## Part 2: the plan

### The design in one paragraph

Keep the present cut land for the closest zooms. Below a zoom threshold, draw a plain land (the hex grid and hill mounds, no patch cuts) that reads its paint from one texture over the map. The plain land also takes the place of the present far mesh. The texture holds only the paint of the static ground, so nothing that changes during play needs a new bake.

### What is baked, and how

- **Content:** the flat ground's paint as a function of x and z: the base pigment and every brush patch, and the paint of the land a free coast lays in water hexes. Decide in stage 1 whether the beaches and river banks are baked (the test does) or stay geometry (sharper, more triangles; the count was not taken). The river crop shows the baked banks are plainly soft at the closest zoom, which the plain land does not serve in this plan.
- **Not in the texture:** the hill mounds' slope shade and bare rock (vertex colour), the creases and the turf (geometry), and everything in the table below.
- **Space:** one atlas for one wrap period, read by the vertex's own x and z, repeating in x. The three wrap copies share it with no extra code. This is what the test does.
- **Texel density:** 32 texels a unit on the standard map (60 MB). On larger maps, lower the density to keep the texture under a byte budget set in `data/view3d.json` (a new row, for example 96 MB). The zoom threshold follows the density: the plain land is drawn only where the screen has no more than about 1.6 pixels a texel.
- **Format:** `SRGB8_ALPHA8`, mipmaps, trilinear filter, anisotropy 4. The paint is linear vertex colour today; an sRGB target keeps the dark tones without a 16-bit format. The alpha channel is free (a use: a land mask, to stop the filter mixing the clear colour in at a shore).
- **The bake, stage 1:** on the page's GPU, from the near land's own vertex colours, in squares of 2048 texels with 4x MSAA, as the test does. Make the mipmaps once at the end. Spread the squares over several frames so the page does not stop for a second. The four build workers do not change.
- **A lost WebGL context:** bake again after `Renderer3D.recoverContext` rebuilds the board. The near land's colour arrays are released after upload (`RELEASED_AFTER_UPLOAD`), so the bake must run after the new board's geometry is on the GPU, as the test does.
- **Load cost:** standard map 0.3 to 1.1 s on the page's GPU at 32 texels a unit (measured). Giant map: not measured; about four times the texels at the same density.

### Each thing that lives on the land today

| Thing | Where it lives today | With the texture ground | When it changes during play |
|---|---|---|---|
| Pigment patches | Cut into the land's triangles, vertex colour (`terrainPigment.js`) | **Baked** into the texture | Never changes |
| Hill mounds' shape | Geometry (`hillMounds.js`) | Kept as geometry on the plain land | A town or work removes a mound: `PaintedRelief` rewrites the index, as today. The texture holds the flat paint under the mound, so no bake is needed |
| Hill mounds' slope shade, bare rock | Vertex colour | Kept as vertex colour (the shade multiplies the texture's paint; rock ignores the texture) | Never changes |
| Creases on joined hex edges | Thin geometry on the land | Kept as geometry | Never changes |
| Turf | Geometry in the land's batch, cleared under towns | Kept as geometry | `paintedSuppress` and the fog texture, as today |
| Mineral grain, flock, bump map, paper | The land's shader, by world position | Unchanged (same shader) | Never changes |
| Markings: roads | Separate layer (`PaintedGroundLayer`, clipped onto each hex top by `projectMarkings`) | Unchanged | Rebuilt by its own layer, as today |
| Borders and the border tint | Separate layers (`planPaintedTerritory`, `planPaintedTerritoryTint`) | Unchanged | Rebuilt by their own layers, as today |
| Fog wash, remembered hexes, the reveal | The board's shaders read a one-texel-a-hex texture by the `paintedCell` attribute (`paintedFog.js`) | Unchanged. The plain land carries `paintedCell`, so its triangles must not cross a hex edge | A texel write, as today |
| Improvements, farms, works | Separate layers (`paintedWorks.ts`) | Unchanged | Their own layers |
| Cleared ground under towns | `paintedSuppress` grades and the footprint reservation, in the shader | Unchanged | A texel write, as today |
| A chopped forest | Trees are instanced props; `treedCells` | Unchanged | As today |
| Beach sand, river banks | Geometry clipped onto the hex top, in the land's batch | Baked (the test) or kept as geometry (to decide in stage 1) | Never changes |
| Coast and shore blend, foam, shallows | The water's batch and the detail batch | Unchanged | Never changes |
| River ribbon, river glints | The water's batch; `paintedFlow.ts` | Unchanged | Never changes |
| The sea mirror | A second pass of pieces, towns and stones only (`seaMirror.ts`) | Unchanged: it does not draw the land | |
| Shadows received | The land's shader samples the two shadow maps | Unchanged, and cheaper: fewer shader runs | |
| Shadows cast | The near land, in the static bake (`setBakeDetail`) | Unchanged: the bake still raises the near land | |
| Ink edges or an outline on the land | None | None | |

So the answer to "what happens when it changes mid-game" is the same for every row: nothing new. No tile is baked again, and there is no second texture and no mask. That holds because the texture carries only static paint.

### The pick grid and `samplePaintedWorld`

- Unchanged. The pick meshes and the height samplers stay on the near (cut) land. The cuts add no height, so the plain land's surface is the same surface.
- If a later stage drops the cut land (stage 4), the plain land becomes the pick mesh. It has a fifth of the triangles, so the chunk samplers get cheaper. The heights are the same only if the plain land keeps the near grid.

### The coarse mesh

- **Stage 1 and 2:** the near grid and the mounds, uncut: about 320 triangles a land hex, 657,000 a wrap copy. Same silhouette as today, so hills and coasts do not change shape at the switch.
- **It can vary with zoom (stage 3):** the far grid measured 3 points more at the middle zoom. At the farthest zoom the plain land is still shaded 6.3 times a pixel, so a mesh of a few triangles for a flat hex has more to give there.
- **What keeps the silhouette:** the hill mounds stay whole at every level. The hex outline, the river carve and the free coast's slope keep their vertices (they are in `terrainMesh`'s topology already). Only the grid inside a flat hex gets coarser.
- **A limit:** a triangle cannot cross a hex edge, because the fog reads one cell a vertex.
- **A risk for stage 3:** roads, borders and the tint are clipped onto the near grid's hex top. On a coarser top they can sink into the ground or float over it by the top's small relief (0.008 units against a lift of 0.008). Check with pictures before choosing the grid.

### Fallbacks and the switch back

- One row in `data/view3d.json`, `painted.groundTexture.enabled`. Off: the near land is drawn at every zoom. The fifth pass found the present far mesh gives no gain, so drawing the near land at the farthest zoom costs nothing against today.
- If the bake fails or the GPU's largest texture is too small for the budget's density, the board keeps the near land at every zoom.
- The zoom threshold is a second row with a band (two values), as `painted.lod` has, so the switch between the two lands does not flicker.

### Stages

Stages 1 and 2 are built (2026-11-18), as one build; see "Part 3: stages 1 and 2, built" below for what was measured and what differs from this list.

1. **Built. The texture ground at the farthest zoom, in place of the far mesh.** Make the test's code the real path: the plain land built in the workers as the far land, the bake spread over frames, the mipmaps made once, the context-loss path, the switch and the byte budget. Draw it where the far land is drawn today (under 25 to 29 pixels a hex). Gate: pictures at the farthest zoom at device ratio 1 (the same at normal size expected); geometry memory down about 160 MB; no frame gain yet at the user's ratio, because the user's farthest zoom is 27.8 pixels a hex and draws the near land.
2. **Built. Raise the threshold to the middle zoom.** Draw the plain land up to about 90 to 100 pixels a hex at 32 texels a unit. Expected gain: 13% to 17% of a panning frame at the middle zoom and 14% to 17.5% at the farthest (measured). Gate: before, after and difference pictures at the middle and farthest zoom and at the threshold itself, a crop strip across the threshold to judge the change as the zoom crosses it, and the timing method of this document. This stage changes the picture a little, so it ships with pictures and the switch.
3. **A coarser plain land for the farthest zoom.** Expected: about 3 points more at the middle zoom (measured with the far grid); more at the farthest (the far grid alone gave about 1 point there, so the mounds need a coarser level too). Gate: pictures of flat ground, roads and borders on the coarser top.
4. **Only if load time or memory needs it: no cut land.** The workers send each hex's patch outlines; the page draws them into the texture; the closest zoom reads denser textures made for the chunks in view. This removes 306 MB of geometry and the painter's cuts from the load. It is a large build, it has no frame gain at the closest zoom, and its load gain is not measured. Do not start it without a measurement of the land step with no cuts.

### Risks

- **The Giant map's memory.** 288 MB at 32 texels a unit. With a budget, its density falls to about 18 texels a unit at 96 MB, and the plain land then looks soft above about 30 pixels a unit, so it can serve only the farther zooms there. A texture for charted chunks only would fix that; it is not planned.
- **The change at the threshold.** The two lands differ on patch edges by a soft pixel. The change may be seen as the zoom crosses the threshold. Stage 2's gate checks it.
- **Weaker GPUs.** A 4434 by 2528 texture and its bake target are within WebGL2's guaranteed limits only on desktop-class GPUs (the guaranteed largest texture is 2048). The byte budget and the fallback cover this, but it is not tested.
- **The numbers come from a loaded laptop on battery in low power mode.** The percentages held across loads of 7 to 290, but the milliseconds are not the user's.

### What could not be determined

- Frame times on power, with low power mode off, on a quiet machine.
- The Giant map: the bake's time, the memory in practice, and the gain.
- The build time of a land with no cut mesh (stage 4's load gain).
- The gain between the middle and the closest zoom, which decides the best threshold.
- A device ratio other than 2, and a GPU other than this one.

## Part 3: stages 1 and 2, built (2026-11-18)

The ruling: `docs/flags.md`, "Ground paint texture: build stages 1 and 2 (2026-11-18)". The two stages were built as one: the plain land is drawn at the middle and the farthest zoom from the start.

### What ships

- **The plain land.** On the page, `groundPaintPlan` (`src/render3d/groundPaint.js`) decides, before the board is built, whether the map gets a plain land and at what density. The board workers then build the plain land in place of the present far land: the cut land's own grid and hill mounds, no brush patch cut in, in the same 6 by 6 chunks as the cut land. Its batches are `plain` and the cut land's are `cut` (`PaintedBoardBatch.detail`). The props keep their near and far bands (`painted.lod`).
- **The switch.** The plain land is drawn below `painted.groundTexture.nearPixels` pixels a hex and kept up to `farPixels` (90 and 100), and only once its texture is baked. The cut land is drawn above, picked by the pointer, and raised into the static sun's shadow bake, as before.
- **The bake.** On the page's GPU, from the cut land's own colours, from straight above, a little at a time: the renderer's loop takes one step a display frame, from `bakeAfterMs` (1 s) after the board's first frame. A step uploads at most `bakeStepMiB` (2 MiB) of land, or draws one square of `bakeSquare` (1,024) texels with `bakeSamples` (4) MSAA, which the GPU then copies into the texture (`copyTexSubImage2D`). Land nobody has charted is drawn through stand-ins that share its arrays, so the bake does not put the whole map's land on the GPU, and the board's own meshes still upload, and release their colours, when they are first drawn. Near its end the bake also uploads the charted plain land, at most 2 MiB a step, so the frame that first shows it does not upload it all. The mipmaps are made once, at the end. sRGB RGBA8, mipmaps, trilinear filter, anisotropy 4. The three wrap copies share the one material and the one texture.
- **No step waits for the GPU on purpose.** A WebGL call that reads something back waits for every frame the GPU has queued, and on this loaded machine one such wait took 0.9 to 1.3 s. The bake's program links off the page's thread (`compileAsync`) while the layers are built; both new programs (the bake's and the plain land's) are used for the first time in the board's first frame, which is long anyway and has nothing queued before it (`prime`, `primeLand`: one chunk of plain land drawn with no colour and no depth); and the copy is done in WebGL directly, because three's `copyTextureToTexture` reads five settings back on each call. There is no `getError` check either (see below).
- **The budget and the fall back.** The density (32 texels a unit) is lowered to fit the GPU's largest texture and `budgetMiB` (256), and the band is lowered with it. If the lowered band would start below `lod.farPixels` (29), the board keeps the present far land. A failed bake keeps the cut land at every zoom.
- **The switch back.** `painted.groundTexture.enabled: false` builds the board as it was, far land and all.
- **A lost context.** `recoverContext` rebuilds the board through `preparePaintedMap` and `rebuildBoard`, which ask for the plan again, and the new board's texture is baked again by the loop.
- **What was deleted.** `groundPaintTest.js`, its `test`, `show` and `grid` rows and their type, the `groundPaintTest` hooks on the board, and the bake that stopped the page.

### Two faults found and fixed in the plain land

- **The hill under terraces stayed on the plain land.** `PaintedRelief` takes a mound away by rewriting the index, and passes over a batch with no index. The plain land's faces share almost no corner, so welding declined to index 81 of its 82 batches. A plain batch now always has an index. Test: `paintedGroundPaint.test.ts`, "takes a hill away under a town".
- **A hill that reaches over from a hex of another ground changed colour.** `hillMounds.js` gives a mound its owner hex's ground, and a mound can reach into a neighbour. The texture holds the neighbour's flat ground, so on the plain land that part of the mound took the neighbour's colour (a plains hill turned green on a grassland hex). Such a face now keeps its own colour and is cut as on the cut land (`paint` in `terrainPigment.js`). Test: "keeps the colour of a hill that reaches over from another ground".

### A fault of the cut land, not changed

On a hill at a coast or a river, the cut land's beach and bank pieces lie over the hill's faces, and they are not marked as hill faces. So when terraces take the hill away, those pieces stay, floating: grey or sand-coloured blocks stand among the terraces (`pics/blob1z-middle-crop.png`; 72,624 such steep faces in 244 hill hexes at turn 130, 139 of them at a coast and 103 at a river). On the plain land the pieces are in the texture, so the terraces are clean. This is the largest single difference between the two lands at the threshold, and it is on `decks` as it is. A fix (mark those pieces as hill faces) changes the cut land's picture at every zoom, so it is left for the user.

### The threshold

Turn 130, 2400 by 1437 buffer, the seat's start. The frame times are the fifth pass's method (`diag.mjs`): one page, alternating blocks of 20 panning frames with a GPU sync, eight rounds; "cut" forces the cut land at every zoom and "plain" the plain land. The figure is the median of the rounds' changes against the cut block of the same round, with the range of the changes in ms and the one-minute load average during the blocks. "Shader runs" is the fifth pass's CPU model (`quadmodel.mjs`): land shader runs a land pixel, with 4x MSAA and the 2-by-2 blocks. The picture is the cut land against the plain land in one page, the clock held; "over 2" is the share of pixels that differ by more than 2 levels.

**The machine was never quiet.** Other agents ran bot games the whole time: the one-minute load average was 6 to 237 during the blocks, and the GPU's own counter read 78% to 100% busy with my page parked. Run 1 was on power; runs 2 to 4 on battery in low power mode (it was unplugged at about 20:10). Each script waited up to five minutes for a load under 8 before each zoom; only one zoom's blocks (115, run 3) got it. Read the percentages, not the milliseconds. Two page loads were lost when the page's connection closed during a five-minute wait (run 1 after 115, run 3 before its first zoom); those zooms were measured again in runs 3 and 4.

| Pixels a hex | Pixels a texel | Frame: cut → plain, ms (median of each run) | Change, each run: median (range, ms; load) | Shader runs: cut, plain | Picture: differ, over 2, mean, largest |
|---|---|---|---|---|---|
| 27.8 (farthest) | 0.50 | 49.8 → 42.2; 60.8 → 50.9; 61.9 → 52.6 | −14.9% (−18.7 to +1.3; 144 to 148); −16.6% (−12.8 to −8.6; 108 to 128); −15.5% (−12.7 to −7.7; 202 to 218) | 10.35, 6.29 | 5.5%, 1.4%, 0.14, 132 |
| 88.9 (middle) | 1.60 | 47.5 → 38.1; 58.5 → 47.4; 59.9 → 48.3 | −18.6% (−15.7 to −5.8; 171 to 213); −19.0% (−12.0 to −9.4; 110 to 128); −18.9% (−13.2 to −9.9; 174 to 188) | 4.41, 2.76 | 14.4%, 3.5%, 0.40, 179 |
| 100 | 1.80 | | | | 14.4%, 3.9%, 0.44, 181 |
| 115 | 2.07 | 80.0 → 66.0; 53.4 → 43.6; 61.1 → 49.6 | −17.2% (−18.9 to −10.2; 103 to 147); −17.6% (−28.7 to −7.0; 115 to 126); −16.5% (−24.3 to −6.2; 6 to 13) | 3.74, 2.40 | 14.1%, 4.2%, 0.47, 191 |
| 130 | 2.35 | 52.4 → 42.2; 52.1 → 45.6 | −17.5% (−13.5 to −7.7; 91 to 97); −9.6% (−18.4 to −0.8; 19 to 25) | 3.44, 2.23 | 14.2%, 4.5%, 0.52, 188 |
| 160 | 2.89 | 38.8 → 33.7; 39.1 → 33.9 | −13.4% (−6.7 to −4.3; 225 to 237); −13.4% (−6.7 to −1.9; 40 to 47) | 3.06, 2.04 | 13.8%, 4.8%, 0.58, 216 |
| 200 | 3.61 | | | | 13.7%, 5.0%, 0.67, 203 |
| 248.9 (closest) | 4.49 | 20.4 → 18.2; 32.5 → 29.9; 31.0 → 28.3 | −9.0% (−3.2 to −0.9; 31 to 35); −8.1% (−3.7 to −0.1; 53 to 59); −8.0% (−3.3 to −1.7; 111 to 115) | 2.36, 1.69 | 13.7%, 5.5%, 0.70, 170 |

- **The gain is 15% to 19% from the farthest zoom to 115 pixels a hex, 10% to 18% at 130, 13% at 160, and 8% to 9% at the closest.** Only the farthest zoom's range in run 1 crosses zero. The closest zoom's gain is now firm (the test found 3% to 7%, crossing zero), but small. The triangles drawn a panning frame fall from 4.73 M to 3.67 M at the middle zoom, 6.72 M to 5.07 M at the farthest and 2.16 M to 1.69 M at the closest.
- **The picture grows softer step by step.** The patch edges are the difference: the share of pixels more than 2 levels apart rises from 3.5% at the middle zoom to 4.5% at 130 and 5.5% at the closest. At three times the size, the plain land's edges are as sharp as the cut land's at 100 pixels a hex, a little soft at 130, and plainly soft at 160 (`pics/step-p100-crop.png`, `step-p130-crop.png`, `step-p160-crop.png`). There is no step in the curve to set the threshold at.
- **The choice: 90 to 100, as the plan said.** The plain land then covers the middle zoom at the measured buffer (89 pixels a hex) and at the user's (about 73), which is the look the user saw and approved, and goes no further than where its edges stay as sharp as the cut land's (1.6 to 1.8 pixels a texel). Raising the band to 120 and 130 would add 10% to 18% at the zooms between 100 and 130, with softer patch edges up close. That is one setting, and the user's choice.
- **The game opens at the middle zoom** (`camera.frustum` 14). At this window that is 88.9 pixels a hex, just under the band, so the plain land is drawn from the end of the bake (about 73 at the user's window). In a larger canvas the same zoom has more pixels a hex, and over 90 it draws the cut land until the player zooms out.
- **The two switches agree.** The plain land's band (90 to 100) starts above the far detail band (25 to 29), so the far props always stand on the plain land; the plan refuses any density whose band would start below 29. The far detail band is not changed: at the user's ratio the farthest zoom (27.8) still sits inside it and keeps the near props, as pass five found.

### The change of land as the zoom crosses the threshold

`popseq.mjs`: the camera zoomed out from 125 to 70 pixels a hex and back, 3% a frame, the band as shipped. The land changed at 89.4 (to the plain land) and at 100.9 (back to the cut land).

- **No pop.** The mean difference between one frame and the next is 25.9 to 28.6 levels at every step (the zoom moves the whole picture), and the two steps where the land changed sit on the same smooth curve as their neighbours: 26.80, **26.99**, 27.16 going out, and 26.62, **26.54**, 26.42 coming in. The land's own change at that camera (each land forced, the same frame) is 14.4% of pixels, mean 0.40 and 0.44, largest 176 and 185 (the terrace blocks above), against 26 to 28 for the zoom step itself.
- The hill silhouettes do not change: the mounds are the same geometry on both lands. The colour does not change: the largest differences are the patch edges, the coast's upper edge and the terrace blocks.
- No cross-fade was added; the band (hysteresis of 10 pixels a hex) keeps the land from flickering.
- Pictures: `pics/pop-strip-out-crop.png` and `pics/pop-strip-in-crop.png` (six frames across each change, twice the size), `pics/pop-f011-before|after|difference.png` and `pics/pop-f032-…` (the camera at each change, each land).

### Play on the plain land

`play.mjs`: the turn-130 game, a copy of its state that shares its map (as the renderer's workload probe does), changed through the sim's own commands with the camera at the middle zoom (the plain land drawn). For each change, a picture before and after it with the plain land, and after it with the cut land forced.

| Change | What moved (before → after, plain land) | The plain land against the cut land after it |
|---|---|---|
| A town founded on a charted hill (`spawnUnit`, `foundCity`) | 3.3% of pixels, mean 1.05: the town, its cleared ground, its border and border tint | 9.2% differ, mean 0.28: patch edges only |
| A town on a coastal hill | 1.6%, mean 0.59 | 7.4%, mean 0.24 |
| Terraces on a hill and a farm (`raiseImprovement`) | 0.26%, mean 0.10: the works; the hill's 195 faces on the plain land taken away (degenerate), 0 before | 13.7%, mean 0.35 |
| A disc of 37 hexes charted (the fog) | 5.0%, mean 2.55: the remembered and dark hexes lit; new plain land chunks charted | 11.3%, mean 0.28 |

- Each change draws on the plain land as on the cut land: the town's clearing, the border and its tint, the works, the hill taken away under terraces, and the fog's patching (`pics/play-<change>-middle-before|after|difference.png`, and `play-<change>-lands-middle-…` for the two lands after it; crops `pics/play-town-middle-crop.png`, `play-works-middle-crop.png`, `play-fog-middle-crop.png`: before, after, cut land).
- A town keeps its hill on both lands (only terraces take a hill away, `clearGround`), so the town on a coastal hill shows no floating pieces.
- A tile bought for a town could not be staged: every town of the seat had its borders frozen ("authority is overdrawn"). The founded towns' new borders are the border change shown.
- Unit tests pin the same on a small board: the hill relief, the fog's charting chunk by chunk, the clearing as a texel write, and the same surface height on both lands (`test/render/paintedGroundPaint.test.ts`).

### The picture against `decks`

| View | Switch off against `decks` | As shipped against `decks` |
|---|---|---|
| Turn 130, closest | 0 pixels | 0 pixels (the cut land) |
| Turn 130, middle | 0 | 14.4% differ, 3.5% by more than 2, mean 0.40, largest 179 |
| Turn 130, farthest | 0 | 5.5%, 1.4%, mean 0.14, largest 132 |
| Turn 1, closest | 1,648 pixels, largest 44: the sea's reflection of a rock, which differs between two loads of `decks` too (pass five) | 0 |
| Turn 1, middle | 0 | 1.7%, mean 0.06, largest 145 |
| Turn 1, farthest | 0 | 0.3%, mean 0.01, largest 49 |

Pictures: `pics/home-<zoom>-before|after|difference.png` (turn 130), `pics/home-t1-…` (turn 1), `pics/switchoff-<zoom>-before|after.png`.

### Memory

From the board's own figures (`geometryBytes`, and each family's attributes) and the plan's texture size, after a load.

| Map | Far land before | Plain land after | Texture | Board geometry, before → after | Net |
|---|---|---|---|---|---|
| Standard (80 by 52) | 235.3 MiB (10 batches, 2.48 M triangles) | 87.0 MiB (82 batches, 664,000 triangles) | 57.0 MiB: 4434 by 2528, 32 texels a unit | 646.3 → 498.1 MiB | −91 MiB |
| Giant (180 by 112) | 1,028.2 MiB (49 batches, 10.98 M triangles) | 409.6 MiB (340 batches, 3.13 M triangles) | 256.0 MiB: 9636 by 5223, 30.9 texels a unit (the budget) | 2,924.5 → 2,305.9 MiB | −363 MiB |

- At 32 texels a unit the Giant map's texture would be 274 MiB and 9977 texels wide, under the GPU's 16,384; the 256 MiB budget lowers it to 30.9 texels a unit, and its band to 87 to 97 pixels a hex. At 64 texels a unit it would be 19,954 texels wide, over the GPU's limit: the plan then lowers the density to fit (test: "keeps under the GPU's largest texture").
- The plain land is 3% larger than the test's (664,000 triangles against 657,000): the hill faces of another hex's ground are cut, and a plain batch carries its own index.
- The cut land stays as it was: 291.7 MiB standard, 1,308 MiB Giant.
- The bake's own targets, held only while it runs: the 1,024-texel MSAA square (about 32 MiB) and the stand-ins of one square (at most `bakeStepMiB` a step, let go after the square).

### The load

Continue to the first board frame, back to back, `decks` then the worktree, three pairs on the standard map at turn 1 and turn 130, one on the Giant map at turn 1. Seconds. The laptop was on battery in low power mode, with a load average of 20 to 55.

| Map | Load (before; after) | Board build | Far view step |
|---|---|---|---|
| Standard, turn 1 | 18.0, 21.9, 19.3; 19.0, 18.2, 15.6 | 14.7, 17.9, 15.6; 14.9, 14.7, 12.3 | 0.9 to 1.3; 0.01 |
| Standard, turn 130 | 47.6, 49.5, 52.8; 66.4, 47.4, 44.2 | 14.6, 13.1, 16.1; 16.2, 12.3, 10.9 | 1.1; 0.01 to 0.04 |
| Giant, turn 1 | 75.8; 63.5 | 67.2; 55.3 | 8.4; 0.07 |

- The far view step falls from about 1 s to nothing on the standard map and from 8.4 s to nothing on the Giant map: it now builds only the far props. The whole load does not change by more than the noise on the standard map; the one Giant pair came up 12 s sooner.
- The turn-130 load is long on both codes because the save replays its 8,118 commands.

### The bake and the page's stops

The page's longest gap between two frames: in the three seconds after the loading sheet goes (both codes), and from the bake's first step to its last. The shipped code (`bakeStepMiB` 2, `bakeAfterMs` 1 s), two or three loads each, a load average of 7 to 17 for the shipped rows.

| Map | `decks`: stop after the sheet | Shipped: stop after the sheet | Shipped: stop during the bake | The bake: steps, longest step, first to last step, page time, land uploaded for it |
|---|---|---|---|---|
| Standard, turn 1 | 63, 82, 76 ms | 85 ms (with 4 MiB steps) | 85 ms | 113 steps, 18 ms, 1.3 s, 0.5 s, 293 MiB |
| Standard, turn 130 | 111, 108, 114 ms | 110, 144 ms | 110, 144 ms | 97 steps, 109 and 142 ms, 1.3 and 1.8 s, 0.7 and 0.8 s, 149 MiB |
| Giant, turn 1 | 94 ms | 66 ms | 77 ms | 576 steps, 65 ms, 9.0 s, 2.8 s, 1,390 MiB |

- **How it got there.** The test's bake stopped the page once for 0.3 to 1.1 s. The first spread bake, one square a frame, still had steps of 200 to 600 ms at turn 130; a profile put them in WebGL calls that wait for the GPU: three's first use of a program (`getProgramInfoLog`, 0.9 to 1.2 s under load), three's `copyTextureToTexture` (`getParameter`, 1.3 s), and large uploads (`bufferData`). The shipped bake links its program off the page's thread, uses both new programs in the board's first frame, copies in WebGL directly, uploads at most 2 MiB a step (4 MiB gave steps of 142 to 179 ms at turn 130, 1 MiB no better than 2), and uploads the charted plain land itself, so the frame that first shows the plain land is no longer a stop (the gap after the bake fell from 535 ms to 44 to 48 ms).
- **The stop that is left** is at turn 130: the longest step is still 109 to 142 ms, and the page's longest gap after the sheet goes is 110 to 144 ms against 108 to 114 ms on `decks`. A bake that starts 12 s after the load (a profile run) still had one step of 0.9 s, all in `bufferData`, the first upload after the page had rested; that was not seen when the bake starts 1 s after the first frame, and not traced further.
- The Giant map's bake takes 9 s at the middle zoom: the cut land is drawn until it ends.

### The pick grid and `samplePaintedWorld`

Unchanged by construction: the pick meshes and the samplers stay on the cut land, which is byte for byte the present near land (test: "keeps the cut land byte for byte"). The plain land has the same surface: a ray down at each point of a grid over the test board meets both lands within 0.002 units (test: "has the cut land's surface").

### A lost context

`ctxloss.mjs`: `WEBGL_lose_context` in the page, then the context given back. The renderer built a new board (a new group), the new board's texture was baked again (88 steps, 1.5 s, on the shipped code), and the plain land was drawn at the middle zoom again. The picture before and after the loss differs by fine speckle over the whole view and a few small patches (mean 3.4): the contact shade's noise is made again from `Math.random` when the look is rebuilt, so this is not the land; the land's paint is the same at twice the size (`pics/ctxloss-middle-crop.png`). The unit tests pin the order: no step while the context is lost, the new board's first frame waited for, one step a display frame, and a frame drawn when the bake ends (`test/render/contextLoss.test.ts`).

### What differs from the plan

- Stages 1 and 2 were built as one: the plain land is drawn up to the middle zoom from the start, not first under the far detail band.
- **The plain land is in 6 by 6 chunks, not in the far land's 18 by 18 regions**, so it is culled with the cut land it stands in for; the test measured it that way.
- **The beaches and river banks are baked** into the texture, as in the test. They are soft at the closest zoom, which draws the cut land.
- **The bake is spread over about 45 to 480 display frames, not 6**, starts `bakeAfterMs` (1 s) after the board's first frame, draws through stand-ins for uncharted land, and uploads the charted plain land; the plan foresaw none of these. They came from the page's stops measured on the way (below).
- **The byte budget is 256 MiB, not 96.** The plain land saves more geometry than the texture costs on both maps (−91 MiB standard, −363 MiB Giant), and at 96 MiB the Giant map's band would fall to about 55 pixels a hex, so its middle zoom would keep the cut land.
- **No `getError` check for a texture the GPU had no room for:** it waits for every queued frame (30 to 50 ms measured). The budget is the guard.
- Two faults of the test's plain land were fixed (above): the missing index, and the hills of another hex's ground.

### Tests

- New: `test/render/paintedGroundPaint.test.ts` (26 tests): the plan on the standard and the Giant map, the GPU's limit, the fall back on a small GPU or a small budget, the switch; the cut land byte for byte, the plain land's batches, marks and cells, a hill of another hex's ground, its material and the shared texture; the band and its two edges; agreement with the far detail band; the static sun's bake; the hill relief, the fog and the clearing on the plain land; the same surface; the bake's steps, stand-ins, upload limit, copies, wrap offsets and single mipmap; the first use of both programs before the first frame; the charted plain land uploaded and no other; a bake the GPU cannot take; a disposed board and a new one; the shader; the worker message and the hydrate.
- Changed: `test/render/contextLoss.test.ts` (four tests on the bake after a restore), `test/render/paintedKnobs.test.ts` (the rows), `test/render/paintedWorkerLifecycle.test.ts` (its renderer stub now names the GPU's largest texture, which the plan asks for).
- Run, each green (`npx vitest run`, exit 0): the files the plan's author ran (`paintedKnobs`, `paintedBoard`, `paintedFarLod`, `paintedWorker`, `paintedUploadRelease`, `paintedFog`, `lookData`, `contextLoss`, `paintedSurface`, `paintedSeams`, `paintedBenchmark`, `paintedShadowDetail`, `visualTest`, `paintedSceneNames`, `paintedWarmup`, `surfacePatch`, `motionRest`) and every test file that reads the source of a touched file or uses the renderer or the board: 54 files, 1,158 tests, exit 0. `npm run typecheck`: exit 0.

### Not measured, and open

- **Frame times on a quiet machine, on power.** See "The threshold": the percentages held across loads of 6 to 237, but no block had the machine to itself.
- **The Giant map's frame gain.** Its memory and bake were measured; its panning frames were not.
- **A device ratio other than 2, and another GPU.** The fall back for a small GPU is tested in the unit tests only.
- **For the user to decide:**
  1. The band: 90 to 100 pixels a hex as shipped, or higher (120 to 130 adds 10% to 18% at those zooms, with softer patch edges up close).
  2. The cut land's floating beach and bank pieces under terraces on coastal and river hills (`decks` as it is). Fixing them changes the cut land's picture.
  3. The budget: 256 MiB keeps the Giant map near full density; a smaller one lowers its band and its memory.


## Close zoom comparison, 2026-11-19

The comparison used the shipped renderer at its minimum camera distance. Native WebKit on the Apple GPU and Chromium with SwiftShader drew the same gallery coastline, river and hills, with seed 23 and a 1920 × 1440 drawing buffer. Each hex spanned 249.4 render pixels. The board texture covered the close view for these captures only.

At 32 texels per world unit the transition from sand to grass and the edges of the river banks look softer than the cut mesh. At 64 those edges track the reference more closely in both engines. In the full WebKit river frame, 7.55% of pixels differed from the cut frame by more than two RGB levels at 32, and 3.85% at 64. These percentages include variation between repeated renders.

The memory tradeoff depends on map size. On the 26 × 18 gallery board the atlas used 6.6 MiB at 32 and 26.3 MiB at 64. The atlas planner on the Apple GPU gives 57.0 and 228.1 MiB respectively for Standard. On Giant, the 256 MiB budget limits both requests to about 30.9 texels per world unit. These are figures for the atlas alone. The close-zoom switch stays in the play build pending the visual decision. If close zoom needs 64 on Giant, detail confined to the visible area is worth testing.
