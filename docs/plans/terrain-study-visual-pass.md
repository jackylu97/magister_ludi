# Terrain study: multicoloured tiles and painted terrain

This remains a separate preview using the real Standard 80 × 52 map generator. The game renderer is untouched. References are aesthetic guidance; use bounded art passes followed by a creative-director eye check.

## Current direction and controls

The user's latest direction favours distinct multicoloured tiles, guided by the reposted green/ochre landscape (`b2e2fd31…_2.png`). Biomes should transition through angular patches of pigment, not a smooth palette blend. This takes priority over the secondary agent's physical-rendering prescription. Shallow tile pieces and the approved narrow river cuts are retained.

The study defaults to **Painted light**. **Controls → Shading → Physical light** compares the physical material response on the same geometry and palette. Painted shading replaces physical light accumulation with three broad warm/cool colour families, keeps the actual cached cast-shadow map, adds generated gouache pigment variation and avoids filmic compression of the chosen pigments. Contact occlusion is lighter in this mode. The latest pass separates olive sunlit pigment from deep teal cast shadows, adds broad fill to shaded rock faces, and changes water to a pale periwinkle family with darker ocean pigment. Shadow filtering is narrower to retain readable silhouettes. Green pigments use a separate blue-channel response so shaded cypresses stay teal rather than navy. The physical option retains rough materials, a prefiltered sky/earth environment and ACES tone mapping. This approximates broad indirect illumination; it is not real-time global illumination.

**Controls → Paper grain** now adjusts subtle surface-attached grain (default 0.28). The user found the previous screen-space paper unnerving while panning. That output effect has been removed. The existing gouache texture is sampled in world units on the dominant surface plane, including instance transforms, so it moves with the map and filters with zoom. Physical mode disables the control and grain. No additional render target, fullscreen pass or generated asset is used.

## Multicoloured-tile pass

The user rejected the preceding blended-biome treatment: it averaged colours too broadly and missed the multicoloured tile shapes in their reference. The first explicit patch version was closer, but its overlapping silhouettes felt garbled and unintentional. The subsequent edge-sweep version was too uniform; the latest feedback asks for a mix of big and small shapes and less awkward boundaries. The current pass paints shared landscape shapes at several scales. The approved polygon hills remain. Tunic/Thronefall remain loose shape inspiration; harsh shadows are not the target.

- `prepareTerrainMap` identifies dry land joins on rendering copies. Those joins close the previous 0.01-unit gap; redundant interior skirts are omitted. River/coastal cuts and bank walls at wet junctions remain. Faint tapered, interrupted seams now give joined tiles more definition.
- `terrainPigment.js` now generates shared world-space brush groups, rather than repeating an edge sweep on every hex. Each group combines a broad darker area, a medium lighter flank, small attached extensions, a small recess and occasional detached fragments. Small shapes cluster around the large contour rather than being scattered evenly. Seeded positions and sizes vary under a shared broad direction.
- Neighbouring tiles clip the same shapes in the same global order. A group carries its originating biome's pigments into neighbouring terrain, so biome transitions use whole patches. The preceding paired-edge transition stamps are removed. Coverage varies naturally between tiles instead of requiring an identical number of colour regions on every hex.
- Patch boundaries split the existing ground triangles, interpolate their original heights and retain their normals. Colour is constant within each resulting fragment. This creates crisp painted edges without floating decals, z-fighting or additional material batches. Mound vertices and broad lighting planes stay intact.
- A single depth-tested hover/click outline reveals the tile boundary on interaction. Trees and other scene objects can occlude it.
- Painted cast shadows mix in more fill and use wider filtering. The full-board sun shadow remains cached; no camera-dependent rebake was introduced.
- The current 72-tile fixture verifies deterministic output, finite attributes, discrete pigments, exact preservation of mound vertices and unchanged source map data. Its tiles contain two to five pigments. Projected surface area differs by less than 0.00000044 tile units squared after clipping. 720 vertical ray comparisons agree within 0.00000001 height units. A separate 2,574-sample check confirms identical pigment on both sides of shared same-biome edges. The fixture grows from 14,193 to 31,583 surface triangles, versus 40,895 in the first patch version. This is extra static geometry, not a free performance improvement.

The latest screenshot is `.dream-loop/mixed-scale-patches-review.png`. The preceding edge-sweep treatment is retained in `.dream-loop/patch-shapes-review.png` and `.dream-loop/patch-shapes-before-mixed-scales.js`. The first patch treatment is retained in `.dream-loop/colour-patches-review.png` and `.dream-loop/colour-patches-before-shape-refinement.js`. The rejected blend is retained in `.dream-loop/biome-review.png` and `.dream-loop/pre-colour-patches/terrainPigment.js` for comparison. Colour calculation is performed at build time. Patches and seams join the existing ground batches; the interaction outline adds one draw when visible. No new texture asset or postprocessing pass is used. This treatment still needs the user's eye check.

Review views:
- `terrain-study.html?review`: river grove.
- `terrain-study.html?review&view=rocks`: mixed rock, forest and plains scene; framing persists on refresh.
- `terrain-study.html?review&view=hills`: unobstructed hills beside flat grassland/plains; also available through **Hills & plains**.

## Connected mountain ranges (final requested art pass)

Neighbouring mountains previously read as separate rock formations on grey hex bases. `mountainRanges.js` now creates a shared deterministic placement plan, keeping the existing sculpted summits and connecting every dry mountain pair with a lower saddle. Hill-facing slopes receive one smaller rock shoulder and a low outer stone. River crossings are excluded; saddles beside wet corners narrow across the ridge while retaining their span between peaks.

- Summit shapes remain the existing three Blender escarpment assets. Shoulders reuse only their main fracture blocks, omitting the summit's tiny perimeter rubble. Outer stones reuse the 44-triangle limestone asset. All pieces remain instanced per chunk, geometry and material.
- Mountain bases borrow neighbouring land pigments and irregular shared rock patches through `createTerrainPainter`. The lower rock faces mix in the surrounding grass/plains/desert/tundra/snow colour, with constant weights per face to preserve clean facets. The tall upper faces keep their cool stone palette. There is no smooth biome gradient or added rendering pass.
- **Mountain ranges** in Controls, or `terrain-study.html?review&view=range`, frames adjoining mountains and surrounding hills. **Rock formations** keeps the previous closer inspection view.
- Three Standard maps retain all 145/142/144 summits and connect all 92/86/107 dry mountain pairs. Raycasts against actual asset geometry cover 98.9–99.0% of the sampled peak-to-peak lines on average, with at least 88% for each line. Placement, positive finite transforms, source-data preservation and determinism pass. Lower rocks follow the existing terrain height when planted; mountains remain decorative geometry as before.
- The first pass had too many tiny copies of the complete mountain asset. The final version uses broader shoulders and a single low outer stone, reducing visual repetition and triangle cost. Independent visual review passed the final result: connected ranges, readable height hierarchy and no obvious new clipping or lighting artifacts. The reviewed Standard view showed 133 draws, about 672k triangles and one cached shadow bake; this is a view-specific observation, not a fresh hardware benchmark.

Captures: `.dream-loop/range-before.png`, `.dream-loop/range-first.png`, `.dream-loop/range-final.png`. Previous sources: `.dream-loop/pre-mountain-ranges/`. Geometry check: `.dream-loop/check-mountain-ranges.mjs`. The approved water, hills, lighting and camera response remain intact.

## Lake and coast mouths (current correction)

The lake's shallow-water band previously closed across river entrances. River terminal nodes now record their receiving lake/coast/ocean through shared corner topology. Each mouth carries the receiving water's shallow pigment upstream in one asymmetric tapered patch, covering the old cross-mouth contact line and ending along the river's existing light bank. The opposite bank stays dark farther upstream; there is no smooth gradient or added overlay mesh.

The lake shown by the user was inspected before editing, then reviewed again at the lake preset. The exposed upper-left, upper-right and lower-left connections visibly join; independent visual review confirms the border is removed without a new blocker. Checks cover all 130 mouths on three Standard maps (13 lake mouths), with 520 cross-mouth colour comparisons and checks for the darker opposite bank. Existing geometry/raycast checks also pass. Captures: `.dream-loop/lake-mouth-before.png`, `.dream-loop/lake-mouth-after.png`. Targeted check: `.dream-loop/check-river-mouths.mjs`.

## Connected coastal shelves and river banks (current correction)

The preceding fix passed isolated-edge checks but still looked disconnected across tiles. It used two coastal shape rules and tapered river stamps that did not share endpoints. Those rules have been replaced.

- `waterContours.js` traces complete coastal paths across neighbouring hexes using shared corner topology and actual rendered waterlines. Every coast and lake edge now uses the same continuous shelf and shallow-water bands, including islands and headlands. Width varies slowly across the world. Adjacent segments share offset vertices at every bend.
- River paths continue through ordinary hex corners and split only at confluences. Each path keeps one light bank through its bends. The light now occupies roughly half the visible channel, with shared miter joins and a common confluence polygon. Separate tapered river highlight stamps are removed.
- The approved river width, bank cuts, land, lighting and water height remain unchanged. Pigments are still baked into the existing merged water geometry with no new render pass or material batch.
- New checks sample 2,044 points along 73 coastal edges across connected land, stepped shorelines and lake basins, plus 150 river samples through rotated bends. Three Standard maps also pass surface-area, finite geometry, constant-height, deterministic pigment, source-data and 7,650 raycast colour/height checks. Water geometry totals 141,927–157,128 triangles on those maps (down from 166,000–179,029 in the preceding correction).
- Browser review covers long coastlines, a lake, an island and river bends/confluences. Independent visual review found no water-join blocker. The review noted small pointed tips in the existing terrain bank walls; those are part of the approved bank geometry, not broken pigment joins, and are left intact in this water-only correction.

Captures: `.dream-loop/connected-coast-review.png`, `connected-lake-review.png`, `connected-islands-review.png`, and `connected-river-review.png`. Previous painter source: `.dream-loop/pre-connected-water/`. Current continuity check: `.dream-loop/check-connected-water.mjs` (replaces the isolated-edge check).

## Coastal corners and river highlights (superseded correction)

The user approved the water pass but found the per-edge shelves awkward on hexes with three or more water-facing sides, and requested light highlights on only one river bank.

- Exposed land hexes now use `coastalContour`: one continuous convex offset outline for each depth pigment, fitted to the actual bank/water intersection. Shared width variation and bevelled corner joins replace separate lobes. One- and two-sided shores retain the preceding tapered patches.
- Rivers have a common darker channel, with the lighter strip and fine current marks confined to the bank facing the sun. The side choice is invariant when the opposite tile owns the edge. River colour layers also cover incidental open-water glints, so they cannot reintroduce a centre highlight.
- The bank and water geometry are unchanged. **Coastal corners** is a new review preset, also available at `terrain-study.html?review&view=headlands`.
- All 42 shore masks with at least three exposed sides are checked at three world positions. The tests verify finite convex nested contours and 270 connected wet corners. Forty-eight river cases cover all six directions, check asymmetric bank colour and preserve the same selected bank when edge ownership reverses.
- Full water checks pass on three Standard maps, including 7,650 rendered height/colour comparisons and unchanged source map data. Maximum projected-area error is below 0.00001241 per sheet. Water triangle totals are now 166,000–179,029 per tested map. The island and river close-ups render without browser errors.

Current captures: `.dream-loop/coastal-corners-review.png` and `.dream-loop/one-bank-river-review.png`. Previous sources: `.dream-loop/pre-coastal-corners/`.

## Coast, lake and river pass (preceding pass)

Revisited the user's island/harbour references (`8720d618…_1.png`), blue faceted water (`f038202b…_3.png`) and painted landscape (`b2e2fd31…_2.png`). The common cues are calm blue surfaces, a few deliberate depth shapes, lighter submerged shelves and sparse marks. Approved narrow river cuts, land/hill geometry and the lighting rig are retained.

- `waterPigment.js` paints continuous world-space regions into the existing level water meshes. All water shares a richer blue base, with fewer, broad close-valued fields in open water. Tapered angular shelves follow the actual bank/water intersection; lakes receive a slightly greener shallow pigment. Thin contact colour at the waterline adds depth.
- River sheets receive a darker narrow core and occasional fine current marks. Coast/lake surface marks remain sparse. The existing subtle shader ripple stays attached to the world; there is no vertex displacement, reflection pass, smooth depth gradient or screen-space grain added. Water uses less of the existing surface grain.
- Sparse half-submerged limestone groups reuse the existing geometry, material and chunk instance batches. They are placed at coast/lake banks, keeping inland rivers clear. There are 426, 423 and 504 individual shoreline stones on three tested Standard maps.
- Painting clips original water triangles rather than stacking floating overlays. Palette values are discrete. Tiny triangles that collapse at Float32 precision are discarded before normals are calculated. No extra water material batch or postprocessing pass is introduced. This adds static water triangles and generation work; it is not a performance optimization.
- Three Standard maps validate all 9,414 water/under-bank sheets: finite upward geometry, level height, deterministic outputs, unchanged original map data and 7,650 rendered height/colour comparisons. Maximum projected surface-area difference is 0.00001183 world units squared per sheet. Painted sheets total 176,905–193,490 triangles per tested map, including portions hidden beneath land. The shader and both shading modes were inspected in the browser with no runtime/shader errors. Production build passes with existing circular/chunk-size warnings. Panning and changing review views retain one cached shadow bake.
- An independent visual review identified repetitive rectangular shelves and overly frequent interior colour patches. The final pass tapers the shelves, reduces the number of interior fields and brings their values closer together.

Review `terrain-study.html?review&view=coast`, `?review&view=lake`, or use **River grove** in Controls. Captures: `.dream-loop/water-coast-review.png`, `.dream-loop/water-lake-review.png`, `.dream-loop/water-river-review.png`. Previous sources are in `.dream-loop/pre-water-pass/`.

## Hill breadth and density (preceding correction)

The user found the landscape placement too thin and sparse. The placement approach is retained, but the geometry proportions and coverage rule are corrected.

- Primary and secondary mound widths now track their lengths (68–94% before the existing shape variation). Tops are wider across both axes. This produces broad grassy facets rather than elongated brush-like crests.
- Landscape groups occur more frequently. Remaining hill terrain is filled from sampled open pockets, with a jittered, shuffled search that retains irregular placement. Coverage uses actual surface relief; overlapping footprints are no longer counted twice. Flat tiles and all river/coast cuts remain excluded.
- On Standard seed 1, sampled raised coverage of hill tiles increases from 22.5% to 65.6%. Median footprint aspect ratio decreases from 2.06 to 1.34; the 90th percentile decreases from 3.31 to 1.74. The map contains 2,535 distinct mound shapes versus 765 previously, including smaller companions and shared forms. These are static meshes in the existing terrain batches, not additional per-mound draw calls.
- The live browser scene was inspected after the change. The 120-tile mixed fixture passes 28,782 shared-edge samples, 3,181 rendered-height checks, determinism, containment and upward winding. Three Standard maps also pass 213,904 seam samples and 761,530 bank samples, with unchanged source data. The 72-tile pigment fixture preserves surface area and mound vertices and passes 720 ray comparisons. Production build passes with the existing circular/chunk-size warnings.

Current capture: `.dream-loop/broad-hills-review.png`. Prior source, screenshot and measurements: `.dream-loop/pre-broad-hills/`.

## Landscape hill placement (preceding pass)

The user found the paired-hex hills too regular and asked for placement like the successful tile pigment patterns. The new pass removes hex pairing from placement.

- Hill brushes use jittered world-space positions, a broad regional direction, varied five-to-eight-sided silhouettes and mixed lengths, widths and heights. Large shapes receive a variable number of smaller flanks; gaps between groups are retained. Placement is independent of tile centres and shared-edge midpoints.
- Each brush is fitted inside its connected hill region and clipped into the existing terrain batches. One hill can now cover portions of three, four or five hexes. Area-based footprint checks preserve enclosed flat areas and river cuts as well as the outer boundary. All portions of a shared brush use matching geometry and pigment.
- Hill tiles with too little coverage receive an off-centre brush in deterministic shuffled order. Footprints reduced by terrain constraints also become lower, avoiding narrow spikes. The old repeated paired-ridge silhouette has been removed.
- Hover outlines and prop placement still sample the exact geometry. Shared-edge metadata now supports multiple neighbours; the review camera handles that case. The approved fine paint strokes, lighting, water and ground details are retained.
- Three Standard maps pass 213,904 seam samples and 761,530 river/coast bank samples. Shared heights agree within 0.0000001 units; source game data is unchanged. The maps have 298–340 hill tiles participating in shared forms. Individual brushes cover one to five tiles, with maximum footprint diagonals of 3.45–4.34 world units. Preparing rendering metadata, including hills, took 626–805 ms locally; this is build-time work, not a frame-rate benchmark.
- The 120-tile mixed fixture passes determinism, containment, upward winding, 12,560 seam samples and 3,181 rendered-height comparisons. The 72-tile pigment fixture passes surface-area conservation, exact mound preservation and 720 ray checks.

Current capture: `.dream-loop/landscape-hills-review.png`. Previous source: `.dream-loop/pre-landscape-hills/`. This pass is ready for the next visual review.

## Shared hills and finer strokes (preceding pass)

The user approved the emerging treatment and asked for additional small strokes, less repetition in hills, and larger hills spanning adjacent hill hexes.

- Each world-space brush group now includes three to five additional narrow dashes and short wedges. They follow the larger brush direction and sit near its margins. Pigments, lighting and static batching are retained.
- `createMapHillMounds` pairs some adjacent hill tiles across dry joins. One broad polygon ridge is generated for the pair, with wider shoulders on each tile and a narrower connection at the shared edge. Its footprint and height vary deterministically. The same model is clipped into the two terrain chunks, using a common pigment across the join.
- Shared footprints are fitted inside the union of their two hill tiles, with clearance from other edges. Ridges never cross rivers or spill onto flat/water tiles. A pair that cannot support at least a 1.85-unit longitudinal footprint is left available for another neighbour or a local hill. Shared ridges are a sparse pairing, not a continuous ridge on every hill-to-hill edge.
- Unpaired hills now choose among four layouts with one to three differently sized mounds, replacing the repeated three/four-mound layout. Shared ridges may receive one small local shoulder. Props sample the actual clipped faces. Hover outlines now rise over shared ridges; the Hills & plains view favours larger unobstructed pairs.
- A 120-tile fixture checks deterministic geometry, finite upward faces, containment, 3,366 shared-edge samples and 3,181 ray comparisons. Shared heights agree within 0.0000001 units. The maximum height difference between full rendered ground and the placement surface is 0.00214, including the pre-existing flat-ground micro-relief interpolation.
- Three real Standard maps contain 223, 220 and 235 shared ridge pairs. All 23,028 shared-edge samples match within floating-point tolerance; 131,538 bank samples confirm that hills leave river/coastal edges unchanged. Source map data is unchanged. Highest tested hill vertices are approximately 0.52–0.53 units, versus ordinary ground at 0.12.
- Pigment clipping retains surface area, finite colours and exact hill vertex positions. The current 72-tile pigment fixture has 13,785 source triangles and 36,006 painted surface triangles. The extra strokes are static geometry rather than an additional render pass.

The preceding hill/surface/paint sources are in `.dream-loop/pre-shared-hills/`. The paired placement described in this section has been superseded by landscape brushes above.

## Tunic-inspired ground detail

The user now permits occasional small trees on open terrain. This supersedes the earlier forest-only restriction for scenic saplings; forest/jungle tiles retain their denser treatment. The visual cue is the composed planting and broad grass silhouettes in [Finji's official Tunic screenshot](https://finji.co/assets/images/tunic/tunic1.png), with the user's gentler shadow preference retained.

- `groundDressing.js` places one small sapling on a minority of eligible grassland/plains tiles. It excludes existing features and resources, keeps centres clear, checks bank clearance and rejects uneven root footprints. Scales are 0.20–0.275, below the main forest treatment. Trees reuse the sculpted tree assets, breeze shader and chunk instance batches.
- Incidental miniature escarpments and the four green stone specks per tile are replaced by sparse groups of a low bevelled slab and two smaller broken pieces. Mountain escarpments retain their models.
- `turf.js` now builds one or two composed tufts from five broader folded blades, replacing the previous sprays of sixteen very narrow strokes. Their small silhouettes are more legible at map scale. Geometry remains in the existing terrain batches.
- Three real Standard maps contain 44, 47 and 33 scenic trees across 497, 536 and 420 eligible open tiles respectively. Placement checks verify determinism, feature/resource exclusions, clear centres, shore clearance, exact terrain height, finite grass geometry and unchanged map data. This is a placement check, not a full-game performance benchmark.

The latest capture is `.dream-loop/meadow-detail-review.png`; the preceding `main.js` and `turf.js` are in `.dream-loop/pre-meadow-pass/`. The treatment is ready for visual review.

## Geometry and assets

- Ordinary land is at 0.12 and water at 0.04, a difference of 0.08 tile units. Flat surface relief is limited to 0.008. Hills retain the broad polygon planes inspired by the upper-left of the user’s `3214653e…_2.png` reference, but now mix local mounds with larger shared ridges as described above. The surfaces are explicit polygon meshes added to the ground batch; the preceding rounded height field remains removed. Ground shading uses a broader light transition to reveal slopes. Trees and stones retain their stronger paint bands.
- Explicit river crest/toe polygons include broad corner chamfers. Interior triangles terminate on the crest. The basic channel is about 0.18 units across at water height, with slightly wider junctions. Level water underneath each cut tile replaces bowed ribbons and rounded caps. These shapes are unchanged from the user-approved river pass.
- Prop placement uses the cut polygon and footprint clearance. Hill heights are sampled from the actual triangular planes in `hillMounds.js`, rather than from a separate analytic surface. Floodplain patches conform to terrain. Oasis pools sit above their basin floors and below surrounding land.
- Three connected broadleaf crowns, two swept cypresses and three fractured escarpment groups replace the earlier repeated tree/rock forms. Crowns use voxel union and decimation, with bent branching trunks and roots. Rock groups combine large sloping fracture planes with smaller stones at the base.
- Prop variants remain instanced by spatial chunk. Main tree groups remain forest/jungle only; the newly permitted scenic saplings and small ground shrubs are separate. Occasional warm broadleaf crown tints add variation while trunks retain their own colour.
- Broad, sparse grass tufts and fine flocking texture accompany low grouped stone slabs. Subtle tree movement remains.
- Static sun shadows cover the full board, independent of camera panning. Contact occlusion is screen-space. Camera damping remains disabled.

Rebuild the new models with `scripts/terrain-study/build_landscape_assets.py` using Blender. `-- --rocks-only` rebuilds only escarpments. The original asset script and old GLBs are retained for comparison.

## Generated textures

These project assets were made with the built-in image generation tool. Complete prompts are preserved in the adjacent provenance files:

- `public/terrain-study/flocking-grain.png` and `flocking-grain.provenance.md`.
- `public/terrain-study/gouache-grain.png` and `gouache-grain.provenance.md`.

The existing `mineral-grain.png` supplies subtle stone/ground relief. Screenshots and pre-change source snapshots are stored in the gitignored `.dream-loop` folder.

## Validation and limits

- The polygon mound pass checks 512 hill/flat/river/coast combinations for deterministic shapes, finite geometry, upward normals, unchanged bank crest/toe heights, usable centres and bounded hill heights. A further 12,676 vertical ray comparisons confirm that prop placement agrees with the rendered polygon faces, including overlapping mounds. Production build passes with existing warnings. The surface grain and land shading were checked in the browser.
- The preceding paper pass was visually checked on river grove, rocks, coast and oases. Both shading variants render without browser shader errors; switching styles retains one cached sun-shadow bake. Production build passes with the existing circular-chunk and chunk-size warnings.
- All eight new GLBs have bounded positions, normals and vertex cavity colours. Broadleaves have 643 triangles each, cypresses 167, and escarpments 664–668.
- The preceding geometry checks covered 512 river/hill/coast combinations: finite positions, upward winding, complete polygon coverage, level boundary vertices, submerged channel centres and placeable tile centres. The river geometry is unchanged in this pass.
- Standard seed 1 contains 4,160 tiles and 782 flagged river edges; opposite river edges match and rendering metadata does not mutate original generation data.
- A local full-board spot check at 1280 × 720 CSS / 1920 × 1080 drawing buffer, painted mode with contact shadows, showed about 22 fps, 1,407 draws and 4.1M submitted triangles including postprocessing. This differs from the earlier viewport and is not a controlled before/after benchmark.

This is an art-review treatment, not a finished renderer migration. Full-board LOD, postprocessing cost and texture delivery still need optimization. Rock/tree silhouettes, shadow contrast and paper strength remain open to visual feedback. The latest hill comparison is `.dream-loop/polygon-hills-review.png`; the previous smooth-hill source is in `.dream-loop/pre-mounds-pass/`. The earlier comparison remains `.dream-loop/hills-surface-review.png`. Earlier painted captures remain in `.dream-loop/paper-grove-review.png` and `.dream-loop/paper-rocks-review.png`. Cities, units, roads, resource models and improvements remain later stages.

## Rendering performance pass — September 12

The approved art now runs through shared-depth contact shading, a combined output pass, lossless vertex indexing, static transforms, and distant terrain/prop batches. Full-detail banks, hills, oases and cached sun shadows remain the reference. The Standard board dropped from 1,539 to 364 draws per render; the final paired sustained Apple M4 measurement was about 2.5× faster in GPU time. This is not a universal FPS multiplier. See [terrain-study-performance.md](terrain-study-performance.md) for implementation details, checks, tradeoffs and the complete measured scope.
