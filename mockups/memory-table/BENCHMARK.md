# Study 03 rendering benchmark — 2026-09-11

Hardware: MacBook Air, Apple M4, 10-core GPU, 16 GB memory. In-app Chromium 152.
Framebuffer 1388 × 1060, device pixel ratio 2. Browser remained visible.

Standard is 80 × 52 = 4160 tiles (`data/mapgen.json`). This test uses 113 clones
of the 37-tile study: 4181 tile equivalents. This is a dense rendering proxy,
NOT an actual generated standard game map. It repeats the whole study, including
its pedestal, city, two pieces, forests, villages and ornamental geometry.
Copies share geometry and materials. This exaggerates some repeated decoration
and underestimates unique-map memory and generation work. No game simulation,
fog, UI update workload, or full-world shadow coverage is included.

Each run warms up for 90 frames, then measures 240 requestAnimationFrame intervals
while orbiting. CPU submission duration is not GPU time. Triangles/draw calls
are maxima, not averages. Empty-scene baseline also ran at 30 FPS, indicating a
session timing ceiling; 60 FPS capability cannot be established here. There is
no GPU timer measurement. Other activity and thermal state are uncontrolled.

| View | Average FPS | p95 frame time | Maximum draw calls | Maximum triangles |
| --- | ---: | ---: | ---: | ---: |
| Empty baseline | 30.0 | 34.3 ms | 1 | 2 |
| Single study | 30.0 | 34.3 ms | 156 | 177,092 |
| Standard-equivalent, close | 30.0 | 34.3 ms | 942 | 2,415,950 |
| Standard-equivalent, regional | 20.4 | 67.7 ms | 6,129 | 9,413,224 |
| Standard-equivalent, whole board | 7.8 | 165.8 ms | 17,516 | 20,011,172 |
| Close, shadows refreshed each frame | 27.2 | 50.0 ms | 2,130 | 4,820,930 |

An earlier regional run was 16.2 FPS. Its whole-board measurement was invalid
because the camera far plane clipped the scene; that was corrected before the
saved run. The saved whole-board sample renders 20 million triangles.

Clone assembly: 161 ms, NOT procedural world generation time. Unique source
geometry buffers total approximately 15.95 MB, NOT total browser/GPU memory.
Terrain is already merged into 18 material batches per patch. The decorative
pieces and architectural elements remain many separate meshes.

Conclusion: this exact geometry cannot simply be multiplied to standard size
and remain fast at all zoom levels. Close views are promising, but regional and
world views need distance-based detail reduction, reduced terrain triangulation,
instanced or merged pieces, small culling chunks, and simplified distant forest
and settlement representations. A generated standard map with game overlays,
real unit counts, movement and shadow invalidation must be benchmarked before
claiming production performance. The current fixed-area shadow test does not
validate whole-map lighting.

Reproduce: run `npm run dev`, open `/mockups/memory-table/?benchmark`, keep the
tab visible and wait for `complete: true`. The normal mockup stays unchanged.
Raw measurements: `benchmark-results.json`. Harness: `benchmark.js`.
