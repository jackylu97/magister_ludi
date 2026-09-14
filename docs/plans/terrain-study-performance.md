# Terrain study performance pass

Scope: the separate `terrain-study.html` preview, Standard map (80 × 52 / 4,160 tiles), seed 1. The production game renderer has not changed.

## Implementation

- Reuse the colour pass's depth texture for contact shading. Reconstruct normals in a fullscreen pass instead of drawing every mesh a second time. Contact buffers use half the main resolution in each dimension; main rendering stays at the selected device pixel ratio.
- Combine contact shading with tone mapping / output conversion, avoiding a full-resolution colour copy and a separate blending pass.
- Index bit-identical complete vertex attribute tuples. Triangle order, normals, UVs, colour boundaries and custom shader weights are preserved.
- Stop recomputing static object transforms each frame.
- When tiles are under 25 rendered pixels wide, use fewer micro-subdivisions in the land plates; return to full detail above 29 pixels. Banks and mound faces are identical. Oases keep the full basin geometry at every zoom. Pigment boundaries are painted again from the same world-space regions.
- At the same distant zoom, consolidate props into map-wide instances by geometry/material. Every prop model, transform, colour and animation is retained. Close views retain spatially culled 6 × 6 tile batches.
- Sun shadows still bake from full-detail geometry, independent of camera position. Camera movement and level-of-detail transitions do not request a new bake.

The distant plate adds some initialization work and geometry storage. This pass optimizes rendering, not initial map generation. The measured geometry buffers are about 190 MiB including both terrain levels, versus about 183 MiB for the reference; this excludes textures, framebuffer allocations and per-instance data. Smaller contact buffers save framebuffer memory separately.

## Repeatable checks

Run `node scripts/terrain-study/check-performance.mjs` from the repository root. This bundles the actual map generator in memory and checks:

- Complete attributes reconstructed bit-for-bit after indexing, including real terrain, water and imported GLB parts, plus a large indexed grid and split material/shader boundaries.
- Three generated Standard seeds, 3,600 surface samples: identical riverbank/coast skirt vertices and hill faces at both detail levels; matching terrain footprints; maximum sampled plate height change 0.00366 world units; no game-data changes.

`npm run build` also passes. Browser checks cover both shading modes, the range and full-board views, water, and shadow/detail transitions. Screenshot comparison is against the approved pre-performance rendering, not a new art target.

## Reproduce the browser measurement

Open the preview, expand **Controls**, and choose **Run performance benchmark**. The benchmark restores the camera and contact setting afterward. It runs the same mountain / grove / overview camera paths with fixed animation time, warm-up periods and asynchronous WebGL timer queries. It does not call `gl.finish()` or read pixels back.

- Default path: optimized rendering.
- Add `&reference` to restore the original full-resolution contact pass, unindexed geometry, static-transform updates and original terrain/prop batching.
- Add `&benchIterations=3` for a sustained-load comparison: three consecutive renders per animation frame. CPU and GPU timings and draw/triangle counts are normalized per render; **frame intervals describe the entire three-render burst**, so they must not be treated as ordinary game FPS.
- `&benchLabel=...` labels the displayed result.
- `&noindex`, `&nofuse` and `&nolod` isolate indexing, post composition, and distant terrain/prop batching respectively.

GPU elapsed time includes driver scheduling. Browser frame throttling and host load varied during this session, so repeated runs matter. A 60-fps display cap cannot reveal how much additional work would fit inside each frame. These measurements are from one Apple M4 using ANGLE Metal, not a claim about all hardware. Cities, units, roads and game UI are absent from this terrain preview.

## Results

Final paired sustained runs: 842 × 836 CSS pixels, DPR 1.5, Apple M4 / ANGLE Metal. Three renders per animation frame, normalized per render. Contact and sun shadows enabled in these rows.

| View | Reference GPU median | Optimized GPU median | Ratio | Reference → optimized GPU p95 |
|---|---:|---:|---:|---:|
| Mountains, still | 10.23 ms | 4.10 ms | 2.50× | 10.97 → 5.48 ms |
| Mountains, panning | 10.92 ms | 4.06 ms | 2.69× | 12.08 → 5.66 ms |
| Grove, panning | 10.31 ms | 4.02 ms | 2.56× | 10.86 → 5.95 ms |
| Whole board, panning | 12.12 ms | 4.84 ms | 2.50× | 14.56 → 6.10 ms |

Whole-board submitted work: **1,539 → 364 draw calls**, **5,358,481 → 2,190,290 triangles per render**. Mountain close-up: 139 → 71 calls and 677,949 → 338,976 triangles. No shadow rebakes occurred during any measured camera path.

These are GPU-time reductions under sustained load, not a promise of 2.5× higher displayed FPS. Earlier single-render measurements showed a smaller gain (for example, the shared-depth step alone changed mountain panning from 8.02 to 4.94 ms). Host load and frame throttling changed during the session. A separate earlier optimized sustained run ranged from 5.99 ms at overview to 7.74 ms in mountains; the final comparison above was repeated after the browser resumed 60 Hz scheduling. Measure representative slower devices before setting a minimum specification.

See `terrain-study-benchmark.json` for the final paired phase data, including the contact-off diagnostic rows. CPU submission time includes the render loop and driver calls; GPU elapsed time is collected asynchronously. Initialization timings were variable and are not used to claim a startup gain.

Screenshot review scored visual preservation 10/10 for the mountain close-up and full overview: no meaningful change in silhouettes, pigment boundaries, prop density, contact shadows or shore continuity. The contact approximation can differ by a few pixels at fine intersections, especially at low render resolution. The distant plate changes only subpixel relief and keeps the deliberate hill shapes.

Remaining headroom is concentrated in the ~2.2 million triangles still submitted at full-map zoom, the terrain's many small chunk draws, and synchronous generation/build work. More aggressive distant prop meshes or cached terrain rendering would be a separate measured step, with another visual review.

Final normal single-render check: all six camera/diagnostic phases held a median 16.7 ms animation frame interval, with p95 between 17.4 and 17.6 ms. No timer disjoints and no shadow rebakes occurred. Single-render GPU readings remained noisier (5.0–9.8 ms with contact enabled), which is why the throughput table uses a paired sustained-load method. This is a headroom improvement; displayed FPS remains capped near 60 on this machine.
