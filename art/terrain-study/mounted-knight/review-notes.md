# Unit sculptures — chess-like silhouette review

September 12, 2026. Discovery sites are approved; these three unit sculpts await an eye check.

## Current direction

The user rejected rectangular bodies and overly dynamic poses. The new instruction is upright, sculptural pieces with drapery and circular bases. Blender now unions and relaxes body surfaces before decimation, producing rounded heads, sloping shoulders, resting arms and continuous cloth. The approved terrain and lighting remain in place.

Three representatives are implemented:

- Warrior: upright draped figure, almond shield, resting sword and a low circular base.
- Spearman: robed sentinel with an upright spear, asymmetric mantle and circular base.
- Horseman: mounted knight based on the latest reference, with a fuller carved ivory horse, arched neck, blunt lowered muzzle, lifted foreleg, short rounded helmet crown, fitted breastplate, blue-grey gauntlets and a long owner-coloured cloak. The horse-head-only chess test is superseded.

The mounted reference is `yungsalad_toon_shading_tabletop_4X_game_of_the_mythologized_p_989e7d5a-77d7-49c7-a28e-3dbd6c5e1c1b_0.png`. The circular base follows the user's preceding direction. This is the cavalry silhouette study, still shown under the existing Horseman entry; it does not assign knight equipment to production horsemen.

The discarded stiff and flat-plane drafts are archived in `.dream-loop/`; they are not loaded. Remaining lines await approval. All 44 data IDs have an explicit art-family inventory in `unitCatalog.js`; inventory coverage does not mean those models are implemented. Keep a shared sculpture per unit line with modest variant changes.

## Preview

Open `terrain-study.html?review&view=units&unit=horseman&light=day&settled&units&owner=vermilion`. Controls → Unit pieces offers individual detail views, **Compare poses**, a wider countryside view, owner pigments and an optional selection ring.

Slate and Vermilion are art-review pigments. Crimson, Teal and Lapis use the existing faction palette. The knight's horse, armour and base retain their fixed materials while the cloak and chest marking change colour. Owner choice persists in the URL. A stale URL for an unimplemented unit opens Warrior. Detail framing centres the sculpture, and the study permits closer zoom for model inspection.

Figures are staged on generated tiles near the example city. They do not change mapgen, simulation data or the production renderer. This is an art checkpoint, not the movement, stacking, garrison or fog integration stage.

## Implementation and checks

`build_unit_assets.py` authors the local Blender GLBs using connected surfaces, voxel union, relaxation, decimation and restrained painted materials. Mounted authoring is isolated in `build_knight_asset.py`; `build_settlement_assets.py -- --units-only --knight-only` rebuilds just this representative. Generated mineral texture and approved settlement lighting are shared with the terrain art.

Geometry in the GLBs: Warrior 3,550 triangles; Spearman 3,324; mounted knight 8,395 (8,396 before GLB export). The three GLBs total about 0.98 MiB. Each uses two shared geometry roles, instanced by the renderer. Owner changes update instance colours without rebuilding the world.

The knight's helmet has a long parallel visor below a short rounded cap. The horse has a deeper chest, compact lower legs, substantial hooves, broader mane locks and a shaped bridle/breastcollar. The cloak retains width through its lower half, ending in rounded hanging folds; it is fitted outside the actual horse silhouette during authoring. Boots and greaves remain exposed in front of its edge. Side and rear views were used to eliminate the initial rump and hind-leg intersections as well as the reported boot collision.

Accessory ring counts were reduced after the sculpture review, preserving the horse, cloak, rider, mane, gloves, knees and boots exactly. The breastcollar retains enough longitudinal samples to remain continuous over the chest. This reduces the detailed draft from 11,112 authored triangles to 8,396 without a global silhouette decimation.

Actual underside vertices and samples across the circular bases are fitted against the rendered terrain triangles. A small tilt limit keeps the statues upright; placement avoids unsupported bases. Static terrain batching and cached sun shadows are preserved.

Validation:

- `node scripts/terrain-study/check-unit-pieces.mjs`: three standard seeds, all 44 inventory IDs, deterministic distinct placements, finite geometry, bounded triangle counts and 2,745 independent contact raycasts. Seven of nine placements are on hill tiles; maximum sampled clearance is 0.0351 world units.
- `check_knight_sculpt.py -- --include-horse` against the saved authoring scene: zero boot/cloak and horse/cloak triangle contacts. Minimum surface gaps are 0.1370 / 0.1371 for the boots and 0.00551 for the horse, above the 0.003 threshold. Both passing and failing validator exits were checked.
- `npm run build`: passes.
- Live browser checks cover the knight, fixed ivory versus owner-coloured cloth, detailed framing and the combined view. Comparison framing includes the full sculpture heights on raised terrain.
- Repeated independent front, opposite-side and rear reviews now find the rough proportions fairly close to the reference. The former review's generous score is superseded by this stricter geometry review. Remaining differences are the narrower horse crest and more faceted cloth folds; user eye check remains the approval gate.

Evidence: `.dream-loop/knight-final-in-game.png`, `knight-final-companions.png`, `knight-turnaround-{front,side,back}.png`, `knight-clearance.json`, `knight-final-geometry-comparison.json`, `knight-final-contact-checks.json` and `knight-final-build.log`.

To repeat the mesh check after authoring: open `.dream-loop/knight-sculpture-review.blend` in background Blender with `--python-exit-code 1 --python scripts/terrain-study/check_knight_sculpt.py -- --include-horse`. `render_knight_review.py` creates neutral orthographic turnarounds from that scene without saving preview lighting or pigments into the asset.

Next: user eye check, then carry the chosen silhouette language into remaining unit lines in small batches. City borders and production integration remain separate gates.
