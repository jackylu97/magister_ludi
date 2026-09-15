# Painted renderer — performance audit

> **Delegation update, 2026-09-14:** the original audit below describes the
> older `fog-study` snapshot, not the current integrated renderer. Read
> [the reconciliation and additional tasks](#integration-reconciliation-and-additional-tasks--70ff850)
> before assigning its numbered findings. Several proposed fixes have already
> shipped in main commit `70ff850`. The completed audit now lives in the main
> worktree; references below to missing/untracked benchmarks describe the old
> snapshot only. This update changes documentation only.

Read-only audit of the renderer redesign as committed in `fog-study` at `534c68d`
(the 2026-09-14 snapshot), with the fog study (`2ea39cf`) noted only where it
inherits a problem. Nothing in the tree was changed. Line numbers are this
worktree's. Figures marked **(est.)** are arithmetic from the source; figures
marked **(measured)** are quoted from the benchmark JSONs, which live untracked
in the main worktree at `/Users/jacky/code/webciv/docs/plans/benchmarks/` and are
**absent from this worktree** — `docs/plans/benchmarks/` here is an empty
directory, so every benchmark link in `painted-game-integration.md` is dead on
this branch.

## Summary

The painted look is structurally sound where the native renderer is strict — the
board really is built once (`renderer3d.ts:887`), wrap copies share geometry and
instance buffers by `Mesh.clone()` (`paintedBoard.js:58-65`), matrices are frozen
(`paintedBoard.js:238`), `customProgramCacheKey` is set on every
`onBeforeCompile` patch (`paintedFog.js:140`, `paintedWorks.ts:198`,
`paintedGround.ts:140`, `paintedUnits.ts:123`, `painterly.js:89`), and there is no
`Math.random` anywhere in the painted render path. The cost is concentrated in
three places, in this order. **First, the static sun shadow map is 8192² fitted
across all three wrap periods** (`paintedLook.js:82`, `:98`) — roughly 537 MB of
render-target memory (est.) for an effective ~34 shadow texels per hex, and it is
invalidated by *any* fog texel change (`renderer3d.ts:824`), which forces a
~2,835-draw full-board bake (est.) on the frame a unit takes one step, while the
same frame is also forced back to near LOD in the colour pass
(`paintedBoard.js:319`). **Second, a fog move rebuilds five whole layers from
scratch** — cities, works, sites, roads, territory (`renderer3d.ts:2349`, `:2355`,
`:2371`, `:2379`, `:2400`) — where the native discipline patches instances in
place; `PaintedCityLayer` has no recipe cache at all and re-raycasts every wall
segment through the global raycaster (`paintedCities.ts:131`, `:229`), and
`PaintedGroundLayer` re-`JSON.stringify`s every road/border cell to test its own
cache (`paintedGround.ts:150`). **Third, every drawn frame pays fixed work that
does not depend on the frame**: `signPaintedWorks` builds and hashes strings over
all 4,160 tiles plus a 4,160-element fog fold (`paintedWorks.ts:68-80`,
`renderer3d.ts:1023-1029`), `applyFog` sweeps all 4,160 cells
(`paintedFog.js:47`), `updateDetail` writes `.visible` on ~3,600 objects
(`paintedBoard.js:317-322`), and `updateDynamicShadows` re-renders the 2048²
counter shadow map unconditionally (`renderer3d.ts:2439` → `paintedLook.js:108`).
The measured numbers back this up: play is CPU-bound, not GPU-bound — 12.7 ms
median CPU submission against a 17.6 ms frame (measured,
`painted-integrated-standard-2026-09-14.json`). Everything above is fixable
without touching the approved art.

## Findings, ranked by expected win ÷ risk

| # | Where | What happens | Why it costs | Fix | Expected effect | Risk |
|---|---|---|---|---|---|---|
| 1 | `renderer3d.ts:2439`; `paintedLook.js:103-109` | `updateDynamicShadows` runs on **every drawn frame** and unconditionally sets `renderer.shadowMap.needsUpdate = true`, which is the gate `separatePaintedShadows` checks (`paintedShadows.js:9`). It also allocates a `Vector3` and calls `updateProjectionMatrix()` each time. | The 2048² counter depth map is cleared and re-rendered on every panned frame even when no unit is walking. Panning is the commonest interaction in the game. | Only call it when a walker/faller exists or the camera target moved past a threshold; leave `shadowMap.needsUpdate` alone otherwise. Hoist the offset `Vector3` to module scope. | 2048² clear + redraw removed from every idle/pan frame; est. 0.3–1.0 ms GPU and one less pass per frame. Zero effect on stills. | Low — gate is local, the visual result is identical while nothing moves. |
| 2 | `renderer3d.ts:1021-1038`; `paintedWorks.ts:68-80` | `rebuildPaintedWorks()` is called from the frame loop (`renderer3d.ts:2367`). Its guard computes `signPaintedWorks`, which walks all 4,160 tiles calling `visibleResourceAt` and FNV-hashing three **strings** per tile (`paintedWorks.ts:71`), then folds 4,160 visibility levels (`renderer3d.ts:1026`) and the whole `cleared` map (`:1029`). | ~12,500 string hashes + 4,160 `resourceIsVisibleTo` lookups + 4,160 integer folds, on every frame that draws. This is the largest single per-frame CPU item in painted mode and is very likely most of the 12.7 ms median `cpuRenderMs` gap between the resource build (8.5 ms, measured `painted-resources-standard-2026-09-13.json`) and the integrated build. | Replace the string hashes with integer folds over resource/improvement/feature *ids* (they are already enumerable), and gate the whole call behind `MapView.noteStateChanged?()` + the existing `fogMoved` flag, as the yields lens already is (CLAUDE.md, "the yields lens rebuilds only when a hex's yield can change"). | est. 3–8 ms off every drawn frame at play zoom; directly attacks the CPU-bound median. | Low — the fingerprint's *contents* are unchanged, only its encoding and when it is asked. |
| 3 | `paintedLook.js:82` and `:98` | `sun.shadow.mapSize.set(min(8192, maxTextureSize), …)` → 8192² on any modern GPU, and `fitShadows` expands the shadow box across `bounds.minX - period` … `bounds.maxX + period`, i.e. all three wrap copies. | Three r185 allocates a PCF shadow target as `new WebGLRenderTarget(w,h)` **plus** a 32-bit `DepthTexture` (`three.module.js:9302-9303`): 8192²×4 (unused RGBA8 colour) + 8192²×4 (depth) ≈ **537 MB** (est.). Because it spans three periods, ~2/3 of those texels are duplicates of the centre copy; effective density is ~34 texels/hex (est., 8192 ÷ 3 ÷ 80). | Fit the shadow camera to **one** period and resolve the shadow lookup in canonical space, or — as a one-line stopgap — drop to 4096². | 4096² alone: 537 MB → 134 MB (est.), density 17 texels/hex. One period at 4096²: 134 MB **and** 51 texels/hex — better quality than today at 1/4 the memory. | Stopgap low; one-period fit medium (the ±period copies need a wrapped shadow coordinate or they lose shadows). |
| 4 | `renderer3d.ts:824`, and again at `:760`, `:984`, `:1017`, `:1036`, `:1071`, `:1103` | Any change to the fog texture calls `paintedLook.invalidateShadows()`, and so does every one of the five layer rebuilds. `updateDetail(pixels, baking)` then forces **near** LOD for that frame (`paintedBoard.js:319`). | One unit step ⇒ full 8192² bake over ~2,835 casters (est.: 126 chunks × ~4 shadow-casting materials × 3 copies + ~1,323 near prop batches) **and** a near-LOD colour pass even at overview zoom. This is the acknowledged open item in `painted-game-integration.md:97-100`. The pre-fix movement run shows what it costs: 8 bakes, 321.5 ms worst update (measured, `painted-movement-before-2026-09-14.json`). | Invalidate only when **caster presence** changes — a hex crossing the hidden/charted boundary, a suppression change, a new building — not when a charted hex merely moves between remembered and visible. The fog shader already discards on channel 0; a remembered→visible flip changes no silhouette. | Removes the bake from the common case (a march through already-charted ground). Est. tens of ms off each such turn. | Medium — needs a second "did any caster appear or disappear" return from `fog.apply`; correctness is testable (a hex becoming charted must still rebake). |
| 5 | `paintedCities.ts:92-123`, `:130`, `:131`, `:161`, `:204-235` | `PaintedCityLayer.build` caches nothing. Each call re-tessellates the tile (`terrainMesh(tile)`, `:130`), re-clips a `surfacePatch` per building footprint (`:161`), and walks 52 or 92 wall segments each sampling 9 heights (`:229`) through `samplePaintedSurface` → `samplePaintedWorld` → a **global raycast** (`paintedSurface.ts:154-161`). It is called on every `fogMoved` (`renderer3d.ts:2349`). | est. ~830 raycasts per walled city per fog move, plus a tile tessellation and several polygon clips. At one city this is inside the measured 8–13 ms "visibility changes" update (measured, `painted-movement-after-2026-09-14.json`); it scales linearly with city count, so a ten-city empire is est. ~8,000 raycasts per unit step. | Cache a per-city recipe keyed on `cityLook` + tile identity exactly as `PaintedWorksLayer.recipes` does (`paintedWorks.ts:117-120`), and replace `height()` with `createTileSurfaceSampler` (`paintedTileSurface.ts:12`) — the same fix `painted-final-validation.md:459-460` already applied to sites, measured there at **244×** (`painted-site-contacts-2026-09-14.json`: 2979.05 ms world raycast vs 12.18 ms local triangles). | Est. the dominant term in the movement spike on a developed map; near-zero on turn 5, which is why the benchmark does not see it. | Low-medium — the recipe key must include walls, tier, wonders, population; a stale key is a visible bug. |
| 6 | `paintedGround.ts:150`, `:154`, `:173`, `:185`; `renderer3d.ts:991`, `:1061` | On every `fogMoved`, `planPaintedRoads`/`planPaintedTerritory` are recomputed over the whole map, then `build` does `JSON.stringify(marks)` per cell to test its geometry cache — over objects containing `Color` instances — and re-runs `mergeGeometries` per region per wrap copy. | The plan walk is 4,160 tiles × 6 directions with string vertex keys (`paintedGround.ts:70`); `JSON.stringify` of a mark list is est. 200–800 bytes of transient string per roaded/bordered cell per fog move. All of it to discover that nothing changed. | Key the recipe on a cheap integer fold of the plan (or on the same `signRoadCells`/`signTerritory` fingerprints that already gated the call), and make a fog-level change swap the batch's *material* rather than re-merging geometry. | Est. 1–4 ms per fog move on a developed map, plus a large drop in GC churn. | Low. |
| 7 | `paintedWorks.ts:102`, `:139-155` | A fog-level change rebuilds the whole works/sites layer: every `InstancedMesh` disposed and recreated ×3 wrap copies, every patch batch re-`mergeGeometries`d. The expensive per-cell *recipes* are correctly cached (`:117-120`); the batching is not. | The native contract is "fog patches in place, never rebuilds" (CLAUDE.md). Here a remembered→visible flip on one hex re-merges every patch region on the map because the material key changed (`:132`). | Build the batches once per *content* change; for a level change, move the affected cells between a "visible" and a "remembered" mesh, or pass the level as a per-instance attribute and pick the wash in the shader (the wash is already a shader mix, `:196`). | Est. 1–5 ms per fog move, and removes a per-move geometry allocation/free cycle. | Medium — the wash currently rides a cloned material; moving it to an attribute changes one program. |
| 8 | `paintedLook.js:35, 39, 43` | The three grain textures are awaited **sequentially** before `loadVegetation` (`:65`) which is awaited before `loadSettlementAssets` (`:68`). | 8.9 MB of PNG on three serialized round trips, then two more serialized asset batches, before the lighting rig exists. The browser startup report is "board build 8043.5 ms" (measured, `painted-startup-browser-2026-09-14.json`) and that figure **excludes** asset loading. | `Promise.all` the three textures, and start the two GLB batches concurrently with them — only `style.register` and the board build need them all. | Est. removes 2 of 3 texture round trips and overlaps ~11 MB of asset fetch with each other; cold-load only. | Low. |
| 9 | `paintedLook.js:35-44`; `painterly.js:76-77`; `paintedLook.js:59` | The three 1254×1254 grains are **RGB PNGs** (colorType 2) but every read uses `.r` only (`painterly.js:76`, `paintedLook.js:50`). They upload as RGBA8 with mipmaps: est. 3 × 1254² × 4 × 1.33 ≈ **25 MB** VRAM for three scalar noise fields. `mergedLand.bumpMap = mineralTexture` additionally costs 3 taps + derivatives per land fragment. | 8.9 MB download, 25 MB VRAM, and 7 grain taps per merged-land fragment (2 painterly paper + 1 mineral + 1 flock + 3 bump). | Re-encode as 8-bit greyscale PNG and load with `RedFormat` (or `LuminanceFormat`); drop `bumpMap` on `mergedLand` below the LOD threshold that already exists (`paintedBoard.js:318`). | est. −6 MB download, −19 MB VRAM, and 3 fewer taps per land fragment at distant zoom. Pixel-identical for the red-channel reads. | Low for the format change; the bump LOD is a visual decision. |
| 10 | `paintedBoard.js:75-82`, `:91` | Five per-vertex attributes carry per-**tile** constants: `paintedCell` (2 B), `paintedSuppress` (1 B), `paintedReservationDistance` (1 B), `turfWeight` (4 B), and `uv` (8 B). `uv` is computed as `position.xz * .6` (`:81`) — it is 100 % derivable in the shader. | On merged-land batches that is 52 B/vertex where 40 would do; `uv` alone is est. ~15 % of the 209.8 MiB geometry total (measured, `painted-integrated-standard-2026-09-14.json`) ≈ **30 MiB**. `turfWeight` is a per-cell constant that could ride the fog texture the shader already samples. | Compute `uv` from `position.xz` in the existing `onBeforeCompile` hook (`paintedLook.js:47`); move `turfWeight` into a spare fog-texture channel or a small per-terrain lookup. | est. −30 to −45 MiB geometry; slightly fewer bytes per vertex fetched. | Medium — three's bump-map path reads `vBumpMapUv`, so the hook must set it rather than delete the attribute blindly. |
| 11 | `renderer3d.ts:2438` | `for (const group of [...this.walkers.values(), ...this.fallers.values()]) group.traverse(object => object.layers.set(2));` runs on every drawn frame in painted mode. | Two array spreads and a closure allocated per frame even when both maps are empty, and a full subtree traverse per walker per frame when they are not. | Set the layer once when the walker/faller group is created, not per frame. | Small (est. < 0.1 ms) but free; removes steady-state allocation. | Low. |
| 12 | `renderer3d.ts:1581`; `unitModelPicking.ts:187-196` | `pickUnitModel` passes `[this.scene]` as the occluder root, and `blocks()` recurses the whole graph; for any `InstancedMesh` whose bounds the ray crosses it casts against **every instance** (`:189-192`). It is reached from hover, not only click (`controls.ts:6272`, via `unitPointerTarget`). | est. ~3,600 board objects walked and hundreds-to-thousands of per-instance casts per pointer move once a prop batch is on the ray. | Restrict the occluder roots to the board's chunk batches along the ray (the `columns` grid in `paintedSurface.ts:86-91` already indexes exactly that), or cap the per-instance loop with an instance-level BVH. | Hover latency; no effect on frame time when the pointer is still. | Medium — picking correctness is user-visible; the "invisible peak must not intercept a click" rule (`paintedSurface.ts:125-136`) must survive. |
| 13 | `paintedBoard.js:317-322` | `updateDetail` is called every drawn frame (`renderer3d.ts:2435`) and writes `.visible` on both terrain levels and both prop lists — est. 126 × 6 + ~1,700 ≈ 2,450 property writes per frame — even when `showingDistant` did not change. | Pure waste on the ~99.9 % of frames where the zoom band is unchanged. | Early-return when `showingDistant` and `baking` both match the previous call. | est. 0.05–0.2 ms/frame. | Low. |
| 14 | `paintedFog.js:45-62`; `renderer3d.ts:1040-1047` | `fog.apply` sweeps all `width*height` cells every drawn frame; `reserveFootprints` (`paintedBoard.js:310-315`) likewise sweeps all cells on every works rebuild. | 4,160 iterations × ~6 operations per frame. Cheap per iteration, but it is the same "ask the whole map" pattern as finding 2 and it compounds. | Keep a dirty-cell list from the visibility phase, or accept it — `write()` already early-outs on no change (`paintedFog.js:34`) so only the loop itself remains. | est. 0.02–0.05 ms/frame; listed for completeness, fix it only alongside finding 2. | Low. |
| 15 | `paintedBoard.js:53` | `decorateMesh` sets `mesh.receiveShadow = true` on every board mesh, including `mergedWater` (ocean/coast/lake/river) and `mergedDetails`. `paintedGround.ts:187` and `paintedWorks.ts:151` do the same for road/border ribbons and field patches. | `receiveShadow` compiles the shadow-map sampling chunks into those programs; PCF against an 8192² map is real fragment cost over the whole ocean. | Leave water and the ground ribbons receiving (a headland's shadow on the shore is the point) but reconsider `mergedDetails`. Measure before cutting. | Unquantified; listed so it is a deliberate choice rather than an accident. | Low to try, but it is an art call. |
| 16 | `paintedLook.js:79-83`, `:98-99`; `paintedBoard.js:318`; `lighting.js:37-39, 51, 95` | The painted look's performance knobs — 8192 and 2048 shadow sizes, the 25/29-pixel LOD band, the GTAO 512/12-sample/half-res settings, the contact fade thresholds — are literals in code, not rows in `data/view3d.json`. | CLAUDE.md: "Code holds algorithms, never tuned constants." It also means none of this can be dialled for a weak device without a code edit, which review 7 explicitly asks for ("scalable shadows/foliage for weaker devices"). | Move them into `data/view3d.json` beside the existing `VIEW3D.pieces` block the painted code already reads (`paintedUnitPlacement.ts:35`). | No frame-time effect; unblocks the review-7 deliverable. | Low. |

### Note on the fog study (`2ea39cf`, not the audit target)

The study adds a second `DataTexture` of `2W × H × 4` bytes (`paintedFogLook.ts:155-159`) — est. 33 KB at standard size, negligible — and two more derivative-using fragment paths (`:400`, `:437`). It inherits finding 4 directly: `fog.apply` returns only the *vision*-channel change count (`paintedFog.js:45-62`), so a multi-frame eased reveal does not rebake per frame, but the first frame of each reveal still triggers the full 8192² bake through `renderer3d.ts:824`. `advanceReveal` is not yet called from `renderer3d.ts` (it is review-page only, `main.js:204`), so the reveal animation does not currently reach the game loop; wiring it up without fixing finding 4 first would put a bake on the first frame of every reveal.

## Draw-call and instance estimate — standard map (80 × 52, 4,160 tiles)

Arithmetic from the builders, with the measured numbers alongside.

**Chunking.** `paintedBoard.js:127` keys near batches by `floor(col/6),floor(row/6)`: cols 0–79 → 14 buckets, rows 0–51 → 9 buckets = **126 chunks**. `paintedBoard.js:167` keys far prop batches by `floor(col/18),floor(row/18)`: 5 × 3 = **15 regions**. Every batch is tripled by the wrap copies (`paintedBoard.js:30-32`, `:58-65`).

**Near terrain.** Up to 6 materials can appear per chunk (`mergedLand`, `mergedWater`, `mergedDetails`, `earth`, `features.stone`, `features.shrub` — the fan-out at `paintedBoard.js:156`); ~4 is a fair average for a mixed chunk (est.).
`126 × 4 × 3 = 1,512 meshes` (est.)

**Far terrain.** Only land ground materials get a far clone (`paintedBoard.js:134`), and they all fold into `mergedLand`, so one batch per chunk.
`126 × 1 × 3 = 378 meshes` (est.)

**Near props.** The tree variant index is `floor(col/6) + floor(row/6)*2` (`paintedBoard.js:196`, `:215`) — **constant within a 6×6 chunk**, so each chunk draws exactly one broadleaf geometry and one cypress geometry, plus limestone/rock, plus escarpment + shoulder geometries only where a range crosses it. ~3.5 distinct `geometry.uuid + material.uuid` keys per chunk (est.).
`126 × 3.5 × 3 = 1,323 meshes` (est.)

**Far props.** Across an 18×18 region the variant index varies, so up to 3 broadleaves + 2 cypresses + limestone(rock) + limestone(range) + 3 escarpments + 3 shoulders ≈ 9 keys (est.).
`15 × 9 × 3 = 405 meshes` (est.)

**Board total ≈ 3,618 `Object3D`** (est.), of which **2,835 are near-LOD** and 783 far. `paintedBoard.js:295` reports `drawCalls` as `visible children of copies[1] × 3`, i.e. the pre-frustum figure — 2,835 at play zoom.

**Cross-check against measurement.** Play view is 254 median draws (measured, `painted-integrated-standard-2026-09-14.json`) — a play frustum covers ~10–12 of 126 chunks, so `~11/126 × 2,835 ≈ 247` board draws plus works/cities/ground/units and the composer's passes. Overview is 888 median draws against 783 far-LOD board objects plus layers. Wrap seam is 116. The estimate and the measurement agree to within the modelling error of "~4 materials per chunk".

**Instances.** The browser report gives **14,430 instances** for 4,160 tiles (measured, `painted-startup-browser-2026-09-14.json`) — that is `instanceCount`, which counts near props only (`paintedBoard.js:123`), so 4,810 canonical prop instances × 3 copies. Instance arrays measure 2.09 MiB (measured, same file's sibling `painted-integrated-standard-2026-09-14.json`). Arithmetic check: an `InstancedMesh` instance costs 64 B of matrix + 12 B of colour = 76 B; `28,860 × 76 ≈ 2.19 MB ≈ 2.09 MiB` — which confirms that **every near prop instance's matrix is duplicated into the far batch** (`paintedBoard.js:169`, the `for (const batches of [props, mapProps.get(farKey)])` loop). That duplication is deliberate and cheap; it is noted only so the number is understood.

**Memory ledger** (standard map, play):

| Item | Size | Source |
|---|---:|---|
| Board geometry arrays | 209.80 MiB | measured, `painted-integrated-standard-2026-09-14.json` |
| Board instance arrays | 2.09 MiB | measured, same |
| Static sun shadow target (8192², RGBA8 + 32-bit depth) | ≈ 537 MB | est. from `paintedLook.js:82` + `three.module.js:9302-9303` |
| Counter shadow target (2048²) | ≈ 33.6 MB | est., `paintedLook.js:79` |
| Three grain textures (1254² RGBA8 + mips) | ≈ 25 MB | est., `paintedLook.js:35-44` |
| GLB source (29 settlement + 9 vegetation) | 3.2 MB + ~7.8 MB on disk | `public/terrain-study/` |

The shadow target alone is more than twice the geometry the benchmarks report, and the doc's memory figures explicitly exclude it (`painted-game-integration.md:116-117`). That is the headline memory fact.

## What the benchmarks report, and where they fall short of the review-7 gate

Review 7 (`renderer-art-migration.md:30`) asks for: load/build time; **frame-time distributions while panning, zooming and moving**; draw calls; triangles; memory; **on the real standard map and a larger stress map**; browser/device/DPR and warm-up recorded; 60 fps on a reference machine.

What exists (all Apple M4 / Chromium 152, DPR 1.5, 36 warm-up + 120 measured frames):

| Run | Play | Overview | Wrap seam | Board build | Geometry |
|---|---|---|---|---|---|
| `painted-standard-2026-09-13` (terrain only) | 16.8 ms / 185 draws / 1.05M tri | 32.4 ms / 546 / 2.74M | 16.7 ms / 114 / 0.54M | 7,187 ms | 206.85 MiB |
| `painted-resources-standard-2026-09-13` | 17.6 ms / 201 / 1.10M | 33.3 ms / 711 / 3.02M | 16.7 ms | 9,835 ms | 210.82 MiB |
| `painted-integrated-standard-2026-09-14` (all layers) | 17.6 ms / **254** / 1.35M, cpu 12.7 ms | 33.4 ms / **888** / 3.14M, cpu 14.4 ms | 16.7 ms / 116 / 0.54M | 6,066 ms | 209.80 MiB |
| `painted-overview-after-2026-09-14` (charted views) | 16.7 ms / 54 / 0.59M, cpu 3.5 ms | 16.7 ms / 49 / 0.66M | 16.7 ms | 6,077 ms | 213.32 MiB |
| `painted-movement-before → after` | update 30.8–321.5 ms, **8 bakes** → 3.6–13.4 ms, **0 bakes** | | | | |
| `painted-startup-paired-2026-09-14` | board build 6,837 / 5,011 ms (before) vs 5,473 / 4,772 ms (after), identical `geometryHash` | | | | |

Shortfalls against the gate:

1. **No moving measurement in the frame sweep.** `benchmarkTerrain` only pans (`renderer3d.ts:482`); no unit walks, no zoom transition, no end-of-turn. The separate `benchmarkMovementUpdates` measures `setGameState` cost and two frames (`renderer3d.ts:442-444`), not a frame-time distribution during a march.
2. **The sweep is omniscient and static.** `benchmarkTerrain` calls `setFogSeat(null)` (`renderer3d.ts:473`), so no fog texel changes during the 156 frames — which is exactly why every run reports `terrainShadowRebakes: 0`. The gate's worst case (finding 4) is measured out of existence by the harness.
3. **No developed empire.** The resource checkpoint says so explicitly (`painted-game-integration.md:201-202`), and `painted-startup-browser-2026-09-14.json` is "standard seed 1, turn 7". Findings 5–7 scale with cities, works, roads and borders, all of which are near-zero in every run.
4. **No larger stress map.** Every JSON is `80 × 52 / 4,160 tiles`. The gate names "a larger stress map".
5. **Memory excludes the largest item.** Both the doc (`:116-117`) and the JSONs report only `geometryMiB` and `instanceMiB`; the 8192² shadow target, the render targets and the grain textures are uncounted.
6. **The `terrainShadowBakes: 0` row in `painted-movement-after-2026-09-14.json` cannot be reproduced from this tree.** `renderer3d.ts:824` still invalidates on any fog change, and the "visibility changes" scenario flips 12 charted cells per iteration (`renderer3d.ts:440`), so `fog.apply` must return non-zero (`paintedFog.js:49`) and a bake must follow. Either the counter or the invalidation differed in the measured build. Re-run before trusting that row.
7. **The evidence is untracked.** `docs/plans/benchmarks/` is empty on this branch; the files exist only as untracked working-tree files in the main checkout. A gate whose evidence is not committed cannot be re-checked.
8. **60 fps is not demonstrated, and the harness cannot demonstrate it.** Every play/wrap median sits at 16.7–17.6 ms, which is the vsync floor, and every p95 is 33–34 ms, i.e. one dropped frame in twenty at play zoom. Overview medians are 33 ms — a locked 30 fps. `terrain-study-performance.md:51,59` already makes this caveat for the study; it applies to the game too.

## Do not touch — expensive-looking but correct

- **Wrap copies via `Mesh.clone()`** (`paintedBoard.js:58-65`). Three's `clone()` shares the geometry and material references, so the three copies cost three draw calls and **zero** extra bytes. The `customDepthMaterial` is re-assigned explicitly (`:61`) because `clone()` drops it. Correct as written.
- **`customProgramCacheKey` on every shader patch** (`paintedFog.js:140`, `painterly.js:89`, `paintedWorks.ts:198`, `paintedGround.ts:140`, `paintedUnits.ts:123`, `vegetation.js:20, 39`, `paintedLook.js:54`). Every `onBeforeCompile` closure is paired with a stable key, so Three's program cache is intact. This is the trap most renderers fall into and this one does not.
- **`matrixAutoUpdate = false` sweeps** (`paintedBoard.js:238`, `paintedWorks.ts:157`, `paintedCities.ts:122`, `paintedGround.ts:192`). Board transforms never animate; this is the study's measured static-matrix win (`terrain-study-performance.md:10`).
- **`indexGeometry`** (`indexGeometry.js`). It welds only bit-identical attribute tuples and bails when indexing would not pay (`:27`). The `toNonIndexed()` at `paintedBoard.js:67` is a *transient* — the merge is re-indexed at `:93`, so the ×3 vertex blow-up does not survive the build.
- **`createTileSurfaceSampler`** (`paintedTileSurface.ts`). This is the good pattern, measured at 244× against the raycast path (`painted-site-contacts-2026-09-14.json`). Finding 5 is "use more of this", not "change this".
- **The painterly fragment shader's `dFdx/dFdy` and two grain taps** (`painterly.js:72-78`). This is the approved look. The projection onto the dominant plane needs the derivatives; the second tap is the paper tooth. Finding 9 targets the texture *format*, not these reads.
- **The GTAO contact pass at half resolution with a shared depth texture** (`lighting.js:51-58`). This is the study's largest measured win — 2.5×–2.69× GPU (`terrain-study-performance.md:44-47`) — and `setContactDetail` already fades it out at map zoom (`lighting.js:91-97`).
- **`fog.write`'s early-out** (`paintedFog.js:34`) and `clearCell`'s monotone guard (`renderer3d.ts:757`). Both are already the cheap version.
- **`paintedUnitSupport`'s caches** (`paintedUnitPlacement.ts:9-10, 26-31`) and the moving-piece stride (`:35`). Resting contacts are cached per map per model; a walker samples at most `VIEW3D.pieces.paintedMovingContacts` = 24 points. Correctly bounded already.
- **`PaintedWorksLayer.recipes`** (`paintedWorks.ts:117-120`). The expensive farm cuts are cached across fog changes exactly as the docs claim. Finding 7 is about the batching around them, not the recipes.
- **`board.triangleCount`** (`paintedBoard.js:288-294`). It calls `traverseVisible`, but nothing reads it — it has no caller in `src/`. Dead, not hot. (Worth deleting for tidiness, not for frames.)

## Suggested order — three batches

**Batch A — per-frame work that does not depend on the frame.** Findings 1, 2, 11, 13, and 14 if it falls out. All local, all testable against the existing renderer tests, no art change and no shader change. This is the batch that moves the measured 12.7 ms median CPU submission, and it is the cheapest thing on the list. Re-run `benchmarkTerrain` and `benchmarkMovementUpdates` afterwards and **commit the JSONs**.

**Batch B — shadow economics.** Findings 3 and 4, in that order: size and fit the static map first (a pure win, and it makes every subsequent bake cheaper), then narrow the invalidation to caster-presence changes. This is the batch that removes the movement spike, and it needs a new renderer test — "a remembered→visible flip does not rebake; a hidden→charted flip does". Measure with a harness that does **not** call `setFogSeat(null)`.

**Batch C — layers patch instead of rebuild.** Findings 5, 6, 7, then 10 and 12 if there is appetite. This is the batch that brings the painted layers into line with CLAUDE.md's "fingerprints, not rebuilds" and "fog patches in place", and the one that decides whether a developed empire plays at the same rate as turn 5. It should be measured on a saved late-game map, which is also the missing evidence for review-7 shortfalls 3 and 4.

Findings 8, 9 and 16 are independent of all three and can ride whichever batch is convenient; 8 and 9 are the only ones that move startup.

## Integration reconciliation and additional tasks — `70ff850`

Added from the integrated renderer audit, September 14, 2026. **No implementation
is authorized by this document update.** The user will assign the work later.
The source locations below refer to **main `70ff850`**, inspected at
`/Users/jacky/code/webciv`, not this worktree's older line numbers. Use function
names to locate the code after bringing the integration changes into a task's
branch. Do not replace the fog study wholesale to obtain these optimizations.

### Reconcile the baseline before assigning the original rows

| Original finding | Current integrated state / remaining scope |
| --- | --- |
| 2, 14: whole-map checks on every drawn frame | `Renderer3D.loop` calls `syncStateLayers()` only when `dirty`; animation-only frames reuse synchronized state. Full-map signatures still run on dirty refreshes, so profile command/pointer/camera invalidation on a developed map before optimizing the remaining scans. Do not reimplement a frame gate or assume all drawing bypasses it. |
| 4: every fog change rebakes static shadows | The ordinary charted-ground case is fixed. `createPaintedFog.shadowRevision`, `Renderer3D.applyFog`, and shadow-specific `layerVisibility` distinguish caster presence from the remembered/visible wash. The measured movement probe goes from eight static bakes to zero. **Newly charted ground still rebakes**; task 19 below covers that remaining case. Preserve the fog study's eased reveal when reconciling. |
| 5: cities, including global raycasts | City recipes/batches still rebuild and are a legitimate developed-map target. However `samplePaintedWorld()` now lazily builds exact triangle samplers in spatial columns for ordinary terrain meshes. The estimate of hundreds of global terrain raycasts per city is obsolete; instanced peaks can still use raycasts. Profile the current city path before allocating another contact cache. |
| 6: roads/borders on every fog move | Visibility fingerprints are scoped to cells the layer draws, so unrelated fog changes no longer rebuild it. `PaintedGroundLayer.build()` still clears/re-merges batches when its own inputs change. Retain that narrower incremental-batching task. |
| 7: every works/site batch recreated | `PaintedWorksLayer.batches` now retains unchanged regional meshes/merged geometry; sites use the same machinery. Recipes remain cached. An affected-region content/visibility change can still rebuild that region. Do not replace this with another equivalent cache; measure remaining regional work first. |
| 13: repeated detail visibility writes | Fixed: `PaintedBoard.updateDetail()` returns when effective distance/baking mode is unchanged. |
| Hidden terrain submission | Fixed: wholly uncharted batches are excluded from colour and shadow submissions. Shared river sectors include both banks. This is why charted overview now measures 49 draws instead of 501. |
| Benchmark shortfalls 2, 6, 7 | The current sweep includes charted play/overview as well as omniscient views. It still does not explore new ground. The zero-rebake charted movement result is consistent with current code. Benchmark JSONs and their methodology are now committed under `docs/plans/benchmarks/` in `70ff850`; they are not missing evidence on main. |
| Startup construction | Circumcircle reuse, exact-attribute vertex indexing, pigment spatial bins and reduced clipping allocations are implemented. `buildPaintedBoardAsync()` now runs the shared generator in a one-shot worker, transferring buffers, hill contacts and visibility membership. Do not propose moving terrain construction to a worker again. |

Corrections that matter to implementation decisions:

- **CPU attribution:** `lastRenderMs` starts immediately before the draw, after
  `syncStateLayers()` and other frame preparation. It is CPU submission time,
  not whole-frame CPU time and not GPU elapsed time. The summary's assertion
  that string fingerprints explain the measured submission gap, and that play
  is proven CPU-bound, is not established by those numbers. Use task 24.
- **Wrap memory:** ordinary `Mesh.clone()` shares geometry/material. In the
  installed Three.js `InstancedMesh.copy()`, `instanceMatrix.copy()` and
  `instanceColor.clone()` duplicate instance arrays. Therefore “zero extra
  bytes” applies to shared geometry, not all wrap-instance storage. This is
  already included in `instanceBytes`; it is small beside terrain/shadow memory.
- **Counter shadow gating (#1):** resting unit batches are also on layer 2
  (`rebuildUnits()`), not only walkers/fallers. Invalidate for unit placement,
  composition, visibility, death, embarkation and shadow-camera coverage as
  well as active animation. A `walkers.size > 0` gate alone leaves stale shadows.
- **Texture optimization (#9):** greyscale PNG encoding alone does not guarantee
  a one-channel GPU upload. Installed Three r185 exports `RedFormat`, not the
  proposed `LuminanceFormat`. Verify the decoded source/upload path, filtering,
  mipmaps and colour-space parity before claiming memory savings.
- **Shadow estimates (#3):** byte arithmetic is useful but not measured resident
  GPU memory. Lowering 8192 to 4096 is a quality tradeoff; canonical-period
  lookup must also retain cross-seam casters. It is not an unconditional
  one-line quality-preserving win.

### Additional large gaps, ready to scope into bounded tasks

#### 17. Shadow settings still trigger synchronous full terrain reconstruction

**Evidence:** `Renderer3D.setShadows()` calls `rebuildBoard(this.map)` directly.
That path consumes a prepared board only when one is waiting; an ordinary
settings toggle has none, so it calls synchronous `buildPaintedBoard()`.
Worker startup preparation therefore does not protect this interaction from a
multi-second rebuild. This is source-confirmed; toggle latency is not yet measured.

**Implementation fence:** `src/render3d/renderer3d.ts`, board shadow flags and
material invalidation helpers. Change shadow state on existing batches instead
of regenerating terrain, pigment cuts, instance matrices and contact metadata.
Audit both static and counter passes and the city/unit layers. Do not merely
send another unnecessary full build to the worker.

**Acceptance:** off→on→off at play and overview preserves geometry/instance
buffer identities, footprints, fog masks, selection, camera and unit placement;
zero terrain-generator calls; correct first shadow bake when enabling. Report
cold/warm toggle-to-present timings, including any shader compilation. Start
with `paintedBoard.test.ts`, `paintedShadows.test.ts`, `paintedLifecycle.test.ts`.
**Priority:** high, bounded structural win with no intentional art change.

#### 18. Fully revealed overview still submits the expensive prop population

**Measured:** `painted-overview-after-2026-09-14.json` reports omniscient overview
at **808 draws, 3.13 million submitted triangles, 33.3 ms median**. The large
charted-overview win is from hidden-batch culling, not proof that a developed,
largely explored world runs at 60 fps.

**Source:** `paintedBoard.js` creates `mapProps` from the same geometry and
instances as near props; `terrainMesh(..., {distant:true})` reduces base ground
sampling, while pigment cuts and all approved hill faces remain. Far batching
reduces submissions without materially simplifying trees/rocks.

**Bounded first task:** add a per-material/per-asset triangle and draw breakdown
at overview, then prototype **one** distant prop family (groves or escarpments)
with reduced geometry in `vegetation.js` / asset-build scripts and `propMeshes`.
Keep near geometry for picking and static shadow baking. Do not thin the number
of forests, change biome readability or flatten approved hill contours merely
to hit a triangle count. Treat pigment/ground simplification as a separate
follow-up after this attribution, not a second simultaneous rewrite.

**Acceptance:** paired omniscient overview and seam measurements on standard
and large maps, with game-scale screenshots and user eye check for LOD changes;
unchanged near appearance, picking, caster silhouettes and instance placement.
Report frame distributions and GPU time, not only fewer vertices. **Priority:**
high for full-world scalability; visual review required.

#### 19. New exploration still forces a global bake and near-LOD colour frame

**Source-confirmed remaining case:** hidden→charted changes still invalidate the
static sun. `loop()` passes `sun.shadow.needsUpdate` into
`paintedBoard.updateDetail(pixels, baking)` before `paintedLook.render()`, which
makes near geometry visible for both the shadow bake and that frame's colour
render. Remembered→visible movement has already been fixed (original #4).

**Split into two tasks:**

1. Capture a legitimate scout march revealing new cells, including an overview
   reveal, with per-pass timings and caster/draw counts. Separate the cost of
   shadow depth from the temporary near-LOD colour pass.
2. First decouple shadow LOD visibility from colour LOD visibility using the
   existing static/counter separation in `paintedShadows.js`. Separately scope
   spatial shadow caching/tiles or canonical-period coverage with original #3
   if the global depth bake remains dominant. Partial updates to a single
   global target require correct clearing of vacated regions; do not assume
   setting a scissor alone makes the cache correct.

**Acceptance:** charted wash changes still produce zero static rebakes; genuine
new casters appear immediately; overview colour retains its far LOD during a
bake; no stale/missing shadows at wrap seams, suppression, city founding,
forest clearing or time-of-day changes. Measure the whole march, including the
first reveal, rather than warming the expensive frame away. **Priority:** high
for exploration hitches; larger architectural work after measurement.

#### 20. Static GLB processing is still repeated at runtime

**Source:** `terrainStudy/vegetation.js::loadVegetation/species` clones and
expands GLB meshes, transforms positions, bakes material colours/cavity shading,
creates UV/canopy attributes, extracts shoulder pieces, creates `rangeFoot`,
merges and indexes. `settlementAssets.js` also loads/processes the authored kit.
Original #8 overlaps downloads; it does not remove this CPU preparation. Its
share of cold/warm startup has not been isolated yet.

**Task:** time these stages first, then move immutable processing into a build
script which emits renderer-ready asset attributes and a versioned manifest.
Keep live shader hooks/materials renderer-local. Work on vegetation first;
settlements are a separate follow-up using the same contract. This does not
require changing authored silhouettes or adding higher-detail assets.

**Acceptance:** final attribute/index fingerprints, asset bounds, canopy/rock
weights and material associations match the current loader; compare actual
asset loading/processing and bytes on the wire under cold and warm caches.
Retain partial-load failure/disposal coverage in `paintedLifecycle.test.ts`.
Coordinate file ownership with original #8/#9. **Priority:** medium-high startup
candidate; magnitude requires measurement.

#### 21. Identical terrain is rebuilt on every load; caching needs a memory budget

**Evidence:** each `preparePaintedMap()` launches a one-shot worker. The final
standard-save check still spends **6,209.5 ms** constructing terrain off-thread;
main-thread handoff is only **34.2 ms**. Responsiveness improved, but returning
to unchanged terrain still repeats construction. See
`painted-worker-browser-final-2026-09-14.json`.

**Task:** prototype a bounded cache of immutable packed geometry/contact data at
`paintedBoardAsync.js` / `paintedBoardTransfer.js`. Start with repeat loads of
one unchanged world. The key must cover actual terrain-affecting tile contents
and renderer/asset/attribute/palette version, not seed alone: feature clearing,
oases, river edges and hills can change the result. Rebind live material and
asset identities per renderer; reconstruct visibility, clearing, reservations
and gameplay layers from the loaded game. Account for shadow-state metadata
or make it independent of cached geometry.

**Memory constraint:** the standard board holds roughly **213 MiB of geometry
arrays**. Transferring a buffer detaches it from its sender; an unbounded RAM
cache or cloning a full packet per hit can trade seconds for hundreds of MiB.
Measure peak memory while the old live board, worker temporaries and incoming
board coexist. Compare a bounded persistent-cache prototype against a retained
RAM packet; choose one explicitly. No cached GPU objects across contexts.

**Acceptance:** cache hit/miss/load wall times; content/version invalidation;
byte-identical output; independent fog/reservations for two games; cancellation
and corrupted-cache fallback; memory plateaus over repeated load/dispose cycles.
Do not cache simulation state or change save semantics in this task.
**Priority:** medium-high for repeat loads, dependent on a memory-safe design.

#### 22. Simulation creation and saved-command replay still block before the worker

**Source:** `main.ts::boot/adoptGame` calls synchronous `createGame()`;
`continueButton` calls `loadSlot()` before `beginGame()`. `ui/saves.ts::loadSave`
calls `sim/game.ts::tryReplay`, which creates state then applies the entire log
synchronously. The terrain worker and its frame-gap metric start later. Existing
CPU generation observations were around 0.7–0.9 seconds on a standard map;
late-save replay has **not** been benchmarked and may dominate a longer game.

**First task:** instrument JSON parsing/validation, state/map creation and replay
separately using short and developed-game logs. Confirm where the loading UI
first paints; do not infer whole-load responsiveness from the terrain metric.

**Conditional implementation task:** put the existing synchronous creation/replay
entry points inside a separate worker wrapper and transfer the validated result
back before adopting it. Keep command application order, RNG, rejected-command
index/message and all-or-nothing loading unchanged. Cancellation must not mutate
the live game or write an autosave. Keep simulation algorithms synchronous/pure
inside that worker; do not distribute commands across workers or weaken replay
validation. A snapshot/save-format redesign is outside this task.

**Acceptance:** identical final simulation state and failure results across the
sync/worker paths; responsive loading/cancellation during replay; actual
click-to-playable time and largest main-thread task. Start with existing save,
replay and mapgen tests. **Priority:** measure early, implement if significant.

#### 23. Startup evidence stops before first GPU-ready presentation

**Gap:** `terrain-loading-results` ends after CPU board hydration. `boardBuildMs`
is not click-to-playable time; neither includes all texture decoding, GLB work,
GPU buffer upload, first shader compilation, first shadow bake and composer/AO
allocation. The initial movement probes also retain first-placement spikes.
A worker can leave a large freeze at the final presentation boundary.

**Task (instrumentation first):** add explicit timestamps spanning the loading
entry, simulation/replay, assets, terrain worker, hydration, state-layer setup,
first presented board and first responsive input. Correlate main-thread long
tasks and available GPU timings. Identify compile/upload costs before choosing
whether to precompile material variants, initialize textures earlier or stage
uploads. Do not insert arbitrary sleeps or add unconditional extra full-board
renders as a claimed optimization.

**Acceptance:** cold/new, warm/new and resumed/developed saves, same seed and
camera where comparisons allow; include canceled/failed load. Produce stage
measurements and maximum blocking interval as well as total elapsed time.
Coordinate with #20/#22 rather than assigning three agents to edit `main.ts`
at once. **Priority:** measurement prerequisite for remaining startup work.

#### 24. Integrated CPU/GPU attribution and realistic stress fixtures

This makes the original benchmark shortfalls actionable, rather than adding
another unmeasured optimization. **The study already has GPU timing support**
in `terrainStudy/benchmark.js` using asynchronous timer queries; the integrated
`Renderer3D.benchmarkTerrain()` currently reports submission CPU time and RAF
intervals only.

**Bounded instrumentation task:** port/reuse the supported GPU timer lifecycle
without blocking readback; discard disjoint samples and report unavailable
hardware explicitly. Measure frame preparation (`syncStateLayers`, animation,
picking/DOM projection where applicable) separately from render submission.
Expose static-shadow, counter-shadow, colour and post-pass counts/timings where
possible; keep absent measurements null rather than reporting zero. Record
hardware/browser, DPR, viewport, current commit, seed, fixture population,
visibility and warm-up policy with every output.

**Fixture task:** build reproducible presentation fixtures or validated saves
covering a developed standard map and a large map, with explicit counts of
cities/walls, units, fields, roads and sites. Include real unit marches into
unexplored ground, simultaneous animations, model/icon/tile hovering, an LOD
zoom crossing, a city-screen transition and end-turn refresh. Current synthetic
movement changes one resting unit and twelve already-charted fog cells; it is
not a substitute for these workloads. Keep harness activity out of the user's
live save and restore camera/seat/state after view-only probes.

**Acceptance:** committed raw frame distributions (p50/p95/max, dropped-frame
fraction), CPU and GPU attribution, changed-region/bake counts, heap/geometry/
instance/estimated-target memory and repeated-load peak memory. Do not promise
60 fps from a 16.7 ms vsync-limited median or compare different saves as a paired
speedup. **Priority:** high; first deliverable is evidence, not an engine rewrite.

### Revised delegation order

1. **Reconcile onto `70ff850` and preserve the fog study.** Re-run the existing
   checks after integration; original rows marked completed are not fresh tasks.
2. **Measurement task #24, plus startup stage markers #23.** These can be one
   bounded harness assignment. No speculative FPS target for a worker to meet.
3. **Local fixes:** #17 and corrected original #1/#11. Assign separate source
   ownership or sequence them because they touch the same renderer.
4. **Measured major targets:** shadow coverage/original #3 and #19; developed-map
   city/ground caching (remaining #5/#6); overview LOD #18. Each gets its own
   comparison and visual review where the output changes.
5. **Startup:** #20, then #21 or #22 according to the stage measurements.
   Original #8/#9 complement these; they are not the only startup opportunities.

For every implementation assignment: name the exact source fence, one workload,
its before/after measurements, invariants and focused regression tests. Preserve
approved art unless that task explicitly has a visual-review checkpoint. Let the
integrating agent run the full core/typecheck/build gate; this audit update ran
no code tests and made no runtime or asset changes.
