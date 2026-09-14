# Generated terrain checkpoint

Current review: [resources and settlements](../../docs/plans/terrain-study-settlements.md), [approved lighting presets](../../docs/plans/terrain-study-lighting.md), and [performance](../../docs/plans/terrain-study-performance.md). Open `/terrain-study.html?review&view=settlement&settled` for the first city/improvement eye check. The dated sections below describe earlier versions.

This file records earlier checkpoints. For the current painted terrain,
polygon hills, shared colour patches and sparse open-land saplings, see
[`docs/plans/terrain-study-visual-pass.md`](../../docs/plans/terrain-study-visual-pass.md).

Open `/terrain-study.html` (included in Vite build inputs). Uses the real
`generateMap(seed, size)` and tile data. Separate from the existing renderer.

Implemented: all terrain colours, hill surfaces, composed mountain rocks,
forest/jungle vegetation, 8×8 spatial chunks, instanced props, surface raycasting,
seed regeneration, overview and close-up camera. Shared local surface function
and rock builder are separate modules for further renderer development.

This initial renderer uses reduced foliage and no grass compared with the
approved small study. Shadows cover the entire finite board in a cached 4096² map, refreshed only
on regeneration. Camera navigation does not invalidate them. This trades some
close-up shadow resolution and a larger shadow texture for stable full-board coverage.
Water retains flat geometry with animated pigment/ripple shading. Resource models, improvements, roads,
cities, units, fog and wrap copies are not yet rendered. Resources/river presence
are reported from real data on hover. Rivers are now drawn along generated edges. Trees are restricted to forest/jungle features, including forested hills.
Oases and floodplains have distinct lightweight treatments. These remain art-review items.

Picking raycasts terrain chunk meshes, then uses the game's hex conversion;
it does not yet select raised prop silhouettes. Surface placement currently
samples the analytic hill formula; precise interpolation on the rendered mesh
is needed before production roads and foundations. No production migration yet.

Verified in browser: standard seed 1 close-up and whole map, seed 2 regeneration,
no runtime errors. Production build passes with circular-chunk and large-chunk
warnings elsewhere in the bundle. Live FPS is an informal counter, not a controlled
full-game benchmark. Future checks must include moving camera, picking, shadows,
actual UI and gameplay layers at a specified resolution/device.

## Water and surface pass

Distinct lake pigment, animated world-space water highlights, shallow shoreline
ribbons on land-facing water edges, and fine grain/patch variation on terrain.
River edges are emitted once, with narrow bank/water ribbons. River-facing hill
edges ease down toward the channel. Lake/River/Coast buttons find real generated
examples. No new textures or per-frame geometry rebuilds.

River junctions currently meet as simple strips; river mouths still need a
proper transition down to the lower water level. This is a first visual pass,
not the final channel/shore geometry. Full-scale performance needs remeasurement
with the extra fragment shading and water batches. Browser checked lake view
and shader compilation with no errors; production build passes.

## Static-page optimization

Flat tiles use six triangles rather than 36; hills keep the denser sculpted mesh.
Only forest/jungle tiles receive trees. Water and river/shore ribbons no longer
cast shadows, although they can receive them. Picking is skipped while dragging.
The on-page shadow bake count stays constant when switching overview/coast/close-up;
regenerating a map increments it. Future moving units will need a separate dynamic
shadow strategy; the whole-board cache is appropriate for this static page.
Verified browser navigation and no console errors; production build passes.
These checks are not a controlled before/after FPS benchmark.

## Batching and interaction pass

Biome pigments now live in vertex colours inside a shared land/water batch;
riverbank/river/shore bands share one vertex-colour material. Same close-up at
514×767 changed from 125 calls / 195k triangles to 88 calls / 238k triangles:
fewer calls, slightly less fine-grained culling. Terrain picking explicitly
rejects chunk bounding boxes before triangle work. Opt-in `?profile` prints
100 deterministic sample timings comparing broad-phase paths (CPU only, noisy,
not GPU frame times). Preliminary pre-merge p95 was 3.4ms vs 1.4ms; after merging,
results were noisier, so don't interpret that as a fixed speedup guarantee.

Balanced resolution caps DPR at 1.25 versus previous 1.5 (31% fewer pixels when
both caps apply). Sharp restores 1.5; Fast uses 1. Geometry remains unchanged by
this switch. Build and browser checks pass. A controlled FPS comparison across
views/devices is still needed; draw-call reductions alone are not proof of FPS.

## Desert water features

Oasis pools use irregular nested ground/water patches and sparse reeds, without
trees. Floodplain tiles use a sage/silt base with fertile patches and reeds.
Both read the actual `tile.feature`; mapgen already derives floodplains on flat,
featureless desert touching river edges or adjacent oases. No generation rules
changed. New detail colours share the existing merged detail batch. Oasis and
Floodplain navigation buttons locate examples. Production build and browser
shader checks pass; oasis view inspected.

## Sculpted oasis and original tree crowns

Deciduous trees now instance the original study's three irregular overlapping
crowns with two foliage tones, retaining forest/jungle-only placement. This
increases foliage geometry versus the single-crown approximation.
Oases use a recessed terrain basin with a water plane, a composed crag shelf and
sparse reeds; flat nested green patches were removed. Oasis tiles use the hill
mesh subdivision budget to resolve the depression. The pool and shelves remain
in the shared detail batches. Camera damping remains disabled. Browser preview
checked without errors and build checked during this pass.

## Reference-led lighting pass

Lambert diffuse materials replace the four-band toon ramp: warm key, cooler and
reduced ambient fill. Solid blue water pigments replace per-vertex water/oasis
gradients; quiet directional streaks replace bright ripple dots. Water hexes
meet without gaps. Shore foam is sparse rather than a complete pale outline.
Oasis rock meshes now have a separate shadow-casting batch (they previously
shared the non-casting water-detail batch). Whole-board shadow bounds are fitted
to board corners in light space, still cached independently of camera movement.
No reflection pass added. Coast and oasis views inspected without browser errors.

## Lighting correction — approved baseline restored

The user rejected the Lambert lighting pass. Restored the approved gameplay
study's four-band toon materials, hemisphere colours/intensity (1.5), warm key
(3.2), and exposure (1.12). The Lambert entry above is historical, not current.
Retained tighter cached shadow coverage and oasis caster fixes. Avoid darkening
or replacing the overall material response as a proxy for greater fidelity.
The oasis reference pass adds green terrain, a bent basin outline, low clustered
shrubs and warm rock shelves; no forest trees or decorative ruins added.
Restored lighting/oasis view inspected with no browser errors.

## Smaller trees / fidelity checkpoint

Trees scaled to 68% of the prior size, including trunks. Added sparse instanced
grass, low faceted ground accents and scattered stones. Shadow resolution is now
8192² where supported (clamped to maxTextureSize), cached once per generated map;
Sharp DPR 1.5 is the default for this visual review. Compared with 4096² shadows
this uses four times the shadow-map texels; the pass prioritizes visual fidelity,
not a performance improvement. No new global lighting/material shift. Latest
reference emphasizes sculpted ground, contact shadows and recessed riverbanks;
the rivers remain the existing strips pending a dedicated channel pass.

## Recessed river and accent pass

River-adjacent land now slopes to a 0.075 channel floor beneath water at 0.115;
all affected tiles receive additional surface subdivisions. Existing river edge
flags and duplicate-edge ownership are preserved. Sparse grouped stones and low
grass replace scattered green rock accents. Smaller trees and approved lighting
are unchanged. Six-direction checks confirm banks below the water and unchanged
flat tile centres; browser river view and production build pass.
River mouths and junctions still require refinement; this is not a completed
hydrological mesh. Added bank geometry increases the fidelity-pass workload.
