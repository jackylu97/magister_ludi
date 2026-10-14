# Painted movement performance

User ruling, September 14, 2026: measure the slow unit-movement path, then
implement performance improvements while retaining the approved art and interactions.

Initial finding: `setGameState` unconditionally rebuilds every world layer after
commands, bypassing the frame loop's fingerprints and invalidating static shadows.
Prioritize eliminating unrelated rebuilds, then limiting fog-driven updates to
relevant content. Preserve seat changes, reveal gates, ownership, clearing,
movement animation, exact surface contacts and deterministic simulation.

Measure the existing and revised live update path on the same standard-map save
in a separate review tab. Synthetic presentation updates must restore the real
state and must not issue simulation orders or write a save. Add regression tests
for unchanged scenery, visibility transitions and genuine world edits. Further
LOD/art changes remain separate from this movement-focused pass.

## Implementation

- `setGameState` and invalidated frames share the fingerprint update path.
  Loads/new state objects force a refresh; in-place moves do not rebuild towns,
  roads, borders or sites whose presentation facts and visibility stayed fixed.
- Visibility fingerprints cover the cells each layer can actually draw. They
  include resource cells, owned territory, camps and technology-gated survey notes.
  Animation-only frames reuse this synchronized state.
- Shadow fingerprints distinguish hidden/charted transitions from visible/
  remembered wash. Ground ribbons receive shadows and do not invalidate caster
  depth. Genuine scenery edits and newly charted ground still invalidate it.
- Resource/discovery instance and field batches survive updates outside their
  region. Replaced batches dispose their own buffers; borrowed art stays alive.
- Vertical surface queries lazily index exact transformed terrain triangles.
  Resting pieces, walking footprints and other callers use those buckets; pointer
  picking retains its existing raycast/occlusion behavior. The index lives with
  the registered map and adds a CPU-memory cache, not another GPU geometry copy.
- Improvement support searches also use the exact local sampler, reusing terrain
  geometry already generated for their field clipping.

## Measurement protocol and limits

The profile-only menu button `Benchmark movement updates` temporarily passes a
presentation copy of the same saved standard map to the renderer, alternates one
unit's resting location, and alternates 12 charted cells between visible and
remembered. Eight updates per scenario; original renderer state restored in
`finally`. No simulation command, turn or save is issued. The destination is an
art-placement sample, not a validated gameplay move.

`updatesMs` measures the synchronous state-refresh entry point; normal in-place
commands are detected by the shared frame path. `updateToTwoFramesMs` includes
waiting for two animation-frame callbacks, scheduling and cold GPU work. Neither
metric is an isolated GPU time or an FPS multiplier. The opening save has two
units, so these results do not substitute for a developed-empire stress test.
First-placement spikes are retained in the raw arrays rather than discarded.

`check-movement-contacts.mjs` separately compares 240 exact vertical contacts over
one real 36-tile hill chunk with the previous triangle raycasts, including cold
index construction and warm reuse. It checks returned heights before reporting
operation timings.

## Results

Standard 80×52 seed-1 turn-2 save, same eight-update probe before/after:

| Scenario | CPU refresh median before → after | Two-frame window median before → after | Static shadow bakes before → after |
| --- | --- | --- | --- |
| Piece relocation, unchanged visibility | 61.7 → 4.3 ms | 114.0 → 37.0 ms | 8 → 0 |
| Piece relocation, charted visibility changes | 60.8 → 9.5 ms | 101.0 → 32.1 ms | 8 → 0 |

The first relocation's CPU refresh dropped from 321.5 to 5.6 ms. Raw samples
retain warm-up/scheduling variation. These are update-path improvements, not a
claim that overall game FPS increased by those ratios. Newly revealed land was
not part of this charted-ground probe and still needs a static shadow bake.

The separate 240-contact CPU comparison measured 157.06 ms for raycasts,
12.12 ms including cold index construction, and 0.41 ms for warm indexed
queries. Maximum height difference: 2.11e-15 world units.

Evidence:
- `benchmarks/painted-movement-before-2026-09-14.json`
- `benchmarks/painted-movement-after-2026-09-14.json`
- `benchmarks/painted-movement-contacts-2026-09-14.json`

Validation: all 6,520 core tests in 234 files pass; typecheck and production build
pass (existing bundle-size advisory). Updated old tests that required blanket
rebuilds/raycasts to assert scoped visibility refresh, preserved contacts, bounded
moving samples and persistent batches. The live game was checked at play zoom;
direct scout-model selection shows the original HP, moves and exploration orders.
No simulation orders or saves were submitted during browser verification.

Further work remains separate: distant geometry LOD, developed-empire stress,
full hidden-batch culling and spatially incremental terrain shadow refresh.
