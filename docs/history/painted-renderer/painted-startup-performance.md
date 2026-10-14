# Painted map startup

User ruling (2026-09-14): investigate and improve slow loading/generation of
maps. Measure generation separately from building the painted board. Preserve
seeded map results, saved-game replay, all approved terrain detail and resource
ownership/disposal. Prioritize eliminating repeated computation before changing
the startup architecture or reducing visual fidelity.

## First construction pass

- Terrain triangulation computes each live face's circumcircle once. Its
  subsequent point tests reuse the exact same center and squared radius.
- Vertex deduplication hashes position to select a bucket, then compares every
  attribute before welding. Coincident normal/color/UV/fog boundaries remain
  distinct, including signed-zero Float32 components. Output vertex and triangle
  order are preserved.
- `scripts/terrain-study/check-startup.mjs` isolates seeded generation and full
  board construction with tiny prop stand-ins, excluding downloads, GLB parsing,
  GPU upload/compilation and save replay. It hashes every board geometry's
  attributes and indices for before/after comparison.

The initial V8 CPU profile attributed about 2.81 seconds of self time to vertex
indexing, 0.63 seconds to equality checks, and 1.60 seconds to triangulation and
its repeated circumcircle tests. Pigment clipping remains another major cost.

Unprofiled standard seed-1 CPU build: 13,800 → 9,749 ms on the clean repeat.
Generation (unchanged code): 885 → 674 ms. Both versions produce geometry hash
`cc45459ef07a71054602d73d04de8a3abdc65a2e83a87477ef0fc55d8e676f33`
and 212.80 MiB of geometry arrays. This is a construction benchmark, not a
total-loading-time claim. A contended initial after-run measured 15,044 ms
construction and 5,916 ms generation; retain it to show scheduling variability.

The stronger paired comparison ran both old and new algorithms in one process,
on the same generated map, after the test suite finished. It ran old/new with
cold per-module topology caches, then new/old with warm caches and GC before
each build. Cold construction: **6837 → 5473 ms (20% less time)**. Warm:
**5011 → 4772 ms (5% less time)**. All four geometry hashes and memory totals
match. Prefer these paired figures over the noisier isolated 30% result above;
they still exclude asset loading, GPU work and replay.

Evidence:
- `benchmarks/painted-startup-before-2026-09-14.json`
- `benchmarks/painted-startup-after-2026-09-14.json`
- `benchmarks/painted-startup-after-initial-2026-09-14.json`
- `benchmarks/painted-startup-paired-2026-09-14.json`
- `benchmarks/painted-startup-browser-2026-09-14.json`

Additional geometry verification covers 227 real terrain/GLB geometries with
bit-for-bit attribute recovery after indexing, and 3,600 near/far terrain
contacts across three seeds. The existing overview approximation's maximum
height difference remains 0.003912 world units; bank contours and hill faces
remain identical.

Opportunities identified after the first pass: pigment-clipping allocations;
preprocessed static asset buffers; worker-based construction; caching
completed terrain across repeated loads of an identical world. Saved games
regenerate their seeded world and replay commands, so late-save replay needs
its own measurement before any caching change. This pass changes neither the
simulation nor save format.

Validation: all 6,526 core tests in 235 files pass; typecheck and production
build pass (existing bundle-size advisory). Added core indexing regressions
for coincident boundaries, 32-bit indices, triangle order and morph exclusions.
The browser successfully resumes the current turn-7 standard save; its board
report varied from 6.0 to 8.0 seconds. That is after-only data and a newer save
than the overview pass's turn-2 baseline, not evidence of a total-load speedup.

## Worker and pigment pass — authorized September 14

Proceed with pigment optimization and worker-based terrain construction. Keep
the same synchronous builder as the reference/fallback, transfer finished typed
buffers to the main thread, and bind them to the live materials there. Await the
board before attaching gameplay state. Cancel stale/disposed builds and handle
worker failure explicitly. Measure geometry parity, startup responsiveness and
construction time separately. Keep simulation generation and replay unchanged.


### Implementation

- Terrain pigment queries now use spatial bins for mountain colour patches,
  retaining original overlap order, wrapped positions and exact clipping.
  Triangle clipping also avoids temporary coordinate-mapping arrays.
- New games and resumed games await a one-shot terrain worker before installing
  the board. A replacement game keeps the current game intact until its board
  has been prepared successfully.
- Workers receive cloned asset geometry plus material identities/linear colours;
  textures, shader hooks and live GPU assets remain on the main thread. Finished
  terrain and instance buffers transfer ownership without a second copy.
- The handoff includes prepared hill-contact data and batch visibility cells.
  The main thread restores geometry views, live material bindings, fog, LOD,
  mountain picking predicates and the three map-wrap copies.
- Cancelled/replaced/disposed jobs terminate their workers; late boards are
  disposed. Worker startup/build/message/timeout errors return to the existing
  loading error UI for retry. Only environments without Worker support use the
  synchronous fallback automatically.
- Loading shows progress. `?profile` adds loading timings to Game setup:
  total wall time, worker construction, main-thread handoff, frame callback
  count and longest frame interval **while awaiting the worker**. These exclude
  simulation generation/replay, asset downloads, final GPU upload and shaders.

### Measurements

Paired pigment test, same process/map, old/new then new/old:

| Standard map, seed 1 | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Cold topology caches | 5,801 ms | 4,622 ms | 20.3% |
| Warm topology caches | 4,715 ms | 4,202 ms | 10.9% |

All four builds retain the exact geometry fingerprint
`cc45459ef07a71054602d73d04de8a3abdc65a2e83a87477ef0fc55d8e676f33`
and 212.800 MiB of geometry (small prop stand-ins). The actual worker round-trip
on the full 4,160-tile standard map also retains that fingerprint and memory
size. Its final main-thread hydration measured 24.5 ms in Node; Node has no
animation-frame callbacks, so its responsiveness counters are zero.

Run `node scripts/terrain-study/check-startup.mjs --worker` to reproduce the
worker build/transfer/hydration check. Without `--worker` it measures the
synchronous reference builder. Worker wall time is not a claim of a shorter
end-to-end load: scheduling, module startup, rendering, replay and GPU upload
remain separate costs.

### Validation

All **6,537 core tests in 237 files pass**, along with typecheck and the production
build (existing bundle-size advisory). New regressions cover exact transferred
geometry and prop transforms, shared asset ownership, material bindings,
hill-contact/wrapping metadata, fog/LOD/picking, cancellation, replacement,
shutdown, timeout, message/build failure and retry.

Browser checks successfully resumed the existing turn-7 standard save and,
on an isolated production-preview origin, started seed 1 then restarted onto
seed 2. Both production paths used the worker and had no console errors.
Observed main-thread handoff: 26.5 ms (dev save), 40.1 ms (production fresh map),
61.8 ms (production restart). These are individual observations, not a device
support guarantee. The corrected responsiveness probe uses callback execution
time instead of shared RAF timestamps, which can be stale after simulation
work. Raw records live beside the paired CPU and worker parity measurements.

Final saved-game check with the corrected callback-time probe, after tests/build
finished: 6,589 ms total terrain preparation, 6,209.5 ms worker construction,
34.2 ms handoff, 386 frame callbacks and a 42.8 ms maximum callback gap while
awaiting worker output. No console errors. This replaces the earlier stale-RAF
interval observations for responsiveness claims; it does not measure the whole
click-to-first-playable-frame interval.
