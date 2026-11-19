# The ground paint texture: the measuring test and the plan (2026-11-18)

The rulings: `docs/flags.md`, "Rendering: baked ground paint and a scroll cache (2026-11-18)", "Rendering focus: the ground paint texture (2026-11-18)" and "After rendering pass five (2026-11-18)". The background: `docs/plans/render-performance-2026-11-16.md`, "Fourth pass" and "Fifth pass".

This document has two parts. Part 1 is a test that measures the gain. Part 2 is the plan, as deep as the measurement justifies. Nothing here is the full build.

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

1. **The texture ground at the farthest zoom, in place of the far mesh.** Make the test's code the real path: the plain land built in the workers as the far land, the bake spread over frames, the mipmaps made once, the context-loss path, the switch and the byte budget. Draw it where the far land is drawn today (under 25 to 29 pixels a hex). Gate: pictures at the farthest zoom at device ratio 1 (the same at normal size expected); geometry memory down about 160 MB; no frame gain yet at the user's ratio, because the user's farthest zoom is 27.8 pixels a hex and draws the near land.
2. **Raise the threshold to the middle zoom.** Draw the plain land up to about 90 to 100 pixels a hex at 32 texels a unit. Expected gain: 13% to 17% of a panning frame at the middle zoom and 14% to 17.5% at the farthest (measured). Gate: before, after and difference pictures at the middle and farthest zoom and at the threshold itself, a crop strip across the threshold to judge the change as the zoom crosses it, and the timing method of this document. This stage changes the picture a little, so it ships with pictures and the switch.
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
