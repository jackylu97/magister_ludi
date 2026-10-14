# Painted integration: final validation

The user approved the world-layer checkpoint on September 14, 2026. This pass
checks the assembled renderer in the main game before any default rollout.

## Startup correction

The first standard-map load stalled in discovery placement. Each candidate in
`createSiteLayout` called the registered full-chunk raycaster: a single hill
ruin searched 4,375 surface contacts. `createTileSurfaceSampler` now indexes
that tile's actual triangles into small local buckets and returns the highest
barycentric contact, including overlapping hill faces. The site layout and its
search remain unchanged; unit movement/picking still uses the world registry.

`node scripts/terrain-study/check-site-contacts.mjs` compares the same five-piece
ruin search against a 36-tile, 9,371-triangle chunk. The measured search dropped
from 2,979 ms to 12.2 ms (244× for that operation), with maximum layout difference
6.1e-16 world units. This is a CPU contact benchmark, not a game frame-rate claim.
The new sampler also matches raycasts across flat ground, hills, cut banks and
water in a dedicated render test.

## Main-game check

Resumed the existing turn-2 seed-1 standard map through Continue (80×52, 4,160
tiles). No simulation orders or turns were submitted. The corrected build loads
successfully. Inspected city/territory art under the real HUD, zoomed to play
scale, and selected the scout through both its body and its badge. Its existing
exploration orders, HP and moves are displayed correctly. No browser errors.

Final gates: all 6,513 core tests in 233 files passed; typecheck and production
build passed. The existing large-chunk advisory remains.

## Standard-map frame measurement

Seed 1, turn 2, 80×52 (4,160 tiles), 1280×678 CSS pixels at DPR 1.5, in-app
Chromium 152. Test/build processes had finished. Each view warms for 36 frames
and measures 120 frames. The sweep temporarily reveals the map and restores the
original seat/camera; no orders or turns were submitted.

| View | Median frame | p95 frame | Median draws | Median triangles | Terrain shadow rebakes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Play, dense forest | 17.6 ms | 34.0 ms | 254 | 1.35M | 0 |
| Whole-world overview | 33.4 ms | 50.7 ms | 888 | 3.14M | 0 |
| Wrap seam | 16.7 ms | 34.0 ms | 116 | 0.54M | 0 |

Terrain build: 6.07 seconds. Board arrays: 209.80 MiB geometry plus 2.09 MiB
instances; excludes textures, render targets and gameplay-layer allocations.
The old resource baseline used a smaller viewport, so this is not an exact
before/after FPS comparison. This is an opening-game measurement, not a
hundreds-of-cities/improvements stress test. Play-scale camera motion remains
near the display cadence; whole-world overview remains the clearest rendering
optimization opportunity. Static shadows correctly stay cached while panning.

Raw report: [integrated standard map](benchmarks/painted-integrated-standard-2026-09-14.json).
CPU comparison: [site contacts](benchmarks/painted-site-contacts-2026-09-14.json).

Ready for broader playtesting in the opt-in painted game. A developed-empire
stress test and default-rollout decision remain; neither is claimed complete.

