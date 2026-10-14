# Painted overview performance

User ruling (2026-09-14): continue the performance improvements after the
movement pass. Preserve the approved painted appearance and responsive controls.

This pass measures the standard saved map with both the original seat's fog and
omniscient visibility. Target unnecessary submissions: wholly hidden board
batches and small ground batches at overview zoom. Keep the existing terrain,
pigments, props, shadows and picking surfaces; no reduction in asset fidelity.

Measure before and after through the same in-game benchmark, with 36 warm-up
frames and 120 measured frames per view. Record viewport and DPR. Frame intervals
include browser scheduling; CPU render time is submission time, not GPU time.
The benchmark changes presentation only and restores the seat and camera.

## Implementation

- Each immutable board batch records its canonical cells once, shared by all
  three wrap copies. Only hidden/charted changes recalculate batch presence.
  Remembered/visible changes still update the fog texture without a batch walk.
- A batch with no charted cell is omitted from both color and shadow submissions.
  Partially charted batches retain the existing per-cell shader masks. Shared
  river sectors include both banks in their visibility membership, including
  chunk boundaries and the world seam. Clearing and footprint masks remain
  independent; this conservative cull ignores them.
- Overview ground uses 18×18 regions instead of 6×6 chunks. The faces, pigments,
  normals and shader inputs are unchanged. Close views, picking surfaces and
  static shadow baking still use the original chunks. Overview prop meshes and
  their instance populations are unchanged.
- Detail visibility only updates when crossing the zoom hysteresis or entering/
  leaving a static-shadow bake, instead of assigning every mesh every frame.
- The existing view-only benchmark now includes charted play (centered on an
  owned piece) and charted overview before its three omniscient views.

## Results

Standard 80×52, seed 1, turn 2; 1280×678 CSS viewport at DPR 1.5. The opening
save has two units and a small charted region. Medians, before → final repeat:

| View | Frame interval | CPU render submission | Draw calls | Submitted triangles |
| --- | --- | --- | --- | --- |
| Charted play | 16.7 → 16.7 ms | 8.5 → 3.5 ms | 129 → 54 | 812,004 → 590,915 |
| Charted overview | 33.3 → 16.7 ms | 11.7 → 3.0 ms | 501 → 49 | 2,695,559 → 661,039 |
| Omniscient play | 17.1 → 16.7 ms | 13.3 → 3.6 ms | 240 → 240 | 1,346,092 → 1,346,092 |
| Omniscient overview | 33.7 → 33.3 ms | 16.8 → 11.5 ms | 874 → 808 | 3,131,207 → 3,131,207 |
| Wrap seam | 16.7 → 16.7 ms | 11.0 → 11.6 ms | 102 → 102 | 534,117 → 534,117 |

All five views retain zero terrain-shadow rebakes during measured panning.
Board build: 6029 → 6076.5 ms on the repeat load. Geometry arrays rise from
209.80 to 213.32 MiB because some larger indexed batches require 32-bit indices;
instance buffers remain 2.09 MiB. Visibility membership adds a small CPU-only
cell list per canonical batch, not another geometry or instance copy.

The initial after-run had a 16.5-second load and more scheduling spikes; a clean
reload returned to the baseline load time. Its raw report is retained alongside
the repeat. CPU/frame timings vary substantially even in unchanged play/seam
scenes; do not attribute all timing differences to these edits. Submission
counts agree across both after-runs. The clear repeatable gain is skipping
unexplored batches. Fully revealed overview is still about 30 FPS here and needs
further work; this is not a general 2× improvement across all maps or machines.
Larger far batches also submit a few additional off-screen triangles at some pan
positions, visible in the raw p95 counts.

Evidence:
- `benchmarks/painted-overview-before-2026-09-14.json`
- `benchmarks/painted-overview-after-initial-2026-09-14.json`
- `benchmarks/painted-overview-after-2026-09-14.json`

Regression coverage checks hidden batches through zoom/baking and restoration,
shared river visibility across chunk/wrap edges, overview region coverage,
preserved close picking surfaces and unchanged instance populations.

Validation: all 6,523 core tests in 234 files pass; typecheck and production
build pass (existing bundle-size advisory). Live inspection covers fog edges,
coastline, golden lighting and direct scout-model selection with its original
health, movement allowance and exploration orders. No commands or saves issued.
