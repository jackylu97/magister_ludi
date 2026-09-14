# Resources and settlement art — first review

September 12, 2026. Preview: `/terrain-study.html?review&view=settlement&settled&light=golden`.

The user approved the time-of-day lighting and asked to move to resource models, improvements and cities. This first review keeps the approved terrain and lighting and establishes the shared asset families. It does not replace the production game renderer.

## Review coverage

- All 43 current resource IDs map to animal, crop, shrub, mineral or marine families, driven by `data/resources.json`. Actual resource locations come from mapgen. As with the terrain inspection sheet, resources are all visible; player/technology reveal rules are not applied here.
- Six authored animal silhouettes: horses, cattle, bison, deer, beavers for furs, elephants for ivory. Small groups, stable placement and shared indexed GLB meshes.
- Plantation resources use branching shrubs and restrained pigment variations. Mine/quarry deposits use jagged exposed fragments in resource-specific colours. Crop resources use small grain/reed patches; marine resources have schools, shell beds, crab/coral silhouettes and whale backs. These are shared families, not 43 fully bespoke models.
- Seven everyday improvements: farm, pasture, mine, quarry, camp, plantation, fishing boat. Resource props remain visible alongside the improvement. Hill farms plant onto the existing surfaces rather than modifying the terrain into terraces.
- One compact city kit: a stepped sanctuary with a robed monument and sun arch, arcaded townhouses and loggias, a terracotta cupola, stone spire, fitted foundations, courtyard and optional timber palisade. The gate has a clear approach into the courtyard. Palisade visibility changes instance visibility and requests a single shadow bake, without rebuilding terrain.

Use **Controls → Resources & settlements** for City & countryside, Hill farm, Grazing herd, Find resource and Inspect improvement. Settlement examples are explicitly illustrative metadata outside the generated tile data. Changing the example-set toggle rebuilds this static art fixture; runtime improvement deltas are not integrated yet.

## Geometry and performance

`scripts/terrain-study/build_settlement_assets.py` authors the local Blender kit. Buildings and animal parts are combined on load into one vertex-coloured indexed geometry per asset; standard-map placement uses the existing near-chunk/far-map instance batching. Animals are roughly 500–712 triangles, houses 424 and the civic temple 884. Existing generated mineral/gouache grain and the approved painted shader are reused.

`surfacePatch.js` clips soil patches and crop-row polygons against the terrain's actual triangles. The marking interpolates the original triangle height plus a small lift. Both the underlying plate and hill faces are included; depth testing keeps only the visible surface. The marking receives ordinary shadows. Rigid buildings have fitted foundations; footprint reservations keep surrounding vegetation clear. Cultivated fields reserve their space against adjacent foothill props.

Verification: production build passes. `node scripts/terrain-study/check-settlements.mjs` checks all resource IDs, all 14 GLBs, unchanged simulation data, fixture availability on three standard seeds and 2,394 real-terrain surface samples. Near-field height error is below 0.000004 world units relative to the intended 0.007 lift; fields remain above the distant terrain mesh. Visual checks include hill surfaces, city entrance, animal silhouettes and the palisade toggle.

## Next eye checks

### Monumental city refinement

The city now draws from the user's warm limestone, monumental-arch and statuary references. Five Blender-authored assets replace the basic buildings in the city: `city-house`, `city-loggia`, `civic-sanctum`, `city-spire` and `city-dome`. Deep arcades, stepped cornices, arched window surrounds, restrained stone courses and sparse raised roof rolls carry the detail. The sanctuary's larger robed figure and arch remain visible at normal map zoom; the spire and dome have separate silhouettes. Farmhouses retain the original small house.

`build_city_assets.py` extends the existing asset authoring kit. Run `build_settlement_assets.py -- --city-only` through Blender to export just these models; a full kit export includes them too. Mesh parts are joined before export and load into the same indexed, vertex-coloured instance batches and approved generated mineral-grain material. The five new models range from 1,306 to 3,392 triangles; the illustrated seven-building city totals 15,851 model triangles, plus foundations and palisade. Golden-hour lighting is unchanged. This pass adds no render passes or per-frame model work.

Build, syntax and settlement checks pass, including all 19 GLBs and existing three-seed terrain-placement checks. Visual review covers the façades, central entrance, monument silhouette and building separation at gameplay scale. The earlier performance benchmark below predates this architecture pass; no new full-map benchmark was run for it.

### Painted fields and livestock refinement

The reference review replaces the small rectangular row plots with broad, flat painted fields covering approximately 91% of each farm tile. Each field now divides into four unequal adjoining parcels, with offset boundaries, narrow grassy access strips, independent stroke directions and straw, ochre, clay and muted green harvest colours. A tiny farmhouse uses the existing house instance at 30% scale and a small painted yard. Placement prefers a low, level shoulder near the field edge; the existing fitted foundation seats it on hills. Crop paint follows the existing hill faces; the user's flat-paint direction supersedes the earlier terrace experiment. Farms add no crop-head instances or new terrain relief. Livestock use 48% of their previous linear scale, with horses recoloured warm chestnut and darker brown manes and hooves.

The build and placement checks pass, including 297 additional samples of actual painted hill fields across three standard seeds. Visual review covers both the city/countryside frame and a hill-farm close-up. The benchmark below predates this art refinement.

Hill farms now use height-following crop bands in `farmContours.js`. The bands are clipped directly against the painted terrain faces using a shared, slightly graded height field, so they turn continuously around shoulders and ridges while retaining rows on broad summits. Flat farms retain their varied brush strokes. This adds painted markings only, with no terraced terrain or per-frame work. The same surface-placement checks pass after this refinement; visual checks cover close-up hills and gameplay framing.

Hill-farm paint now uses only the mound faces, excluding the underlying flat plate before applying any field colours or rows. Crops stop at the actual hill feet, leaving the ground outside and between mounds clear. The farmhouse retains its small local yard. Flat farms keep their expansive footprint. Updated checks pass across three seeds: 2,520 surface samples, 561 cultivated samples, and 33 samples verifying clear ground beyond hill crops. Close-up visual review confirms clean crop edges and retained houses.

Approve proportions and the shared resource families before expanding the remaining seven improvements (lumbermill and six great-person works; floating gardens were removed from scope by the user), city growth/state variants, units and production renderer integration. Roads, ownership, fog and placement updates during play still belong to later integration checkpoints. This first review does not claim a finished city or improvement catalogue.

## Final performance check

The first follow-up benchmark exposed an expensive contact-occlusion pass at the full-board zoom, where its world-space radius projects to less than 1.5 render pixels. Contact shade now fades smoothly between a projected radius of 3 and 1.5 pixels, and those passes are skipped below that size. Gameplay/close-up lighting is unchanged; the cached sun shadow map remains active. `?fullAO` retains the unscaled contact pass for comparison. Benchmark results include both the requested contact setting and the effective scale, so skipped work is explicit.

Final main-preview benchmark: Apple M4 / ANGLE Metal, 1117×836 CSS pixels, DPR 1.5, Daylight, 4,160 tiles, settlement examples on. All six measured phases held a median 16.6–16.7ms frame interval (~60fps), with p95 18.0–18.3ms and zero shadow rebakes during the paths. Full-map pan submitted 399 draws / 2.38M triangles; median GPU time was 10.42ms with the contact option enabled (effective scale 0 at this distance). Close-up contact scale remained 1. Results: `terrain-study-settlement-benchmark.json`. This is a preview benchmark on the reference machine, not a guarantee for full gameplay or other hardware.
