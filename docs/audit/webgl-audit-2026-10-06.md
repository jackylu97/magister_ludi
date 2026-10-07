# WebGL rendering audit — 2026-10-06

Read-only audit of the game's 3D renderer (`src/render3d/`, plus the parts of
`src/terrainStudy/` the game imports). No source, data or test file was changed.
Line numbers are the working tree on branch `decks` at `a462c76`.

**Scope.** The default renderer is the painted look (`main.ts:2124-2129`:
`artMode()` returns `'painted'` unless `?art=toon3d`). The toon diorama is the
opt-in fallback and is covered only where it shares code. `src/render/` (frozen
2D) is out of scope.

**Method.** Static reading of the render loop, every layer's rebuild path, the
shadow rig, the post-processing chain and three.js r185's own shadow and render
target code. Plus three measurements of my own, run from a scratch directory
outside the repo:

- `npm run build` (exit 0): three.js is a 608 kB chunk (155 kB gzip); the
  renderer is 124 kB. JavaScript size is not a WebGL problem here.
- A vite-node script that played a standard map with bots to turn 101 (244
  units, 29 cities, seed 1; the committed t120 fixture no longer replays under
  schema 123) and timed the fingerprint functions `syncStateLayers` runs.
- A vite-node script that built every painted unit sculpt and measured its size.

Where this report quotes the committed benchmarks
(`docs/plans/benchmarks/painted-integrated-*-t120-2026-09-15.json`), note that
they ran on SwiftShader (software GL): their CPU-side counts and draw/triangle
figures are usable, their GPU and frame-time figures are not.

This audit follows `docs/plans/painted-performance-audit.md` (September 14).
Most of that audit's findings have shipped: the canonical-period shadow fit,
the counter-map gate, hidden-batch culling, the far LOD for ground, bake-detail
decoupling, city recipe caching, greyscale grains uploaded as `RedFormat`, the
derived `uv`, the terrain worker, prebuilt asset bundles, and the shadow toggle
that no longer rebuilds the board. They are not repeated below.

## Summary

The renderer is in good shape on the things that usually go wrong: it draws on
demand, builds the board once in a worker, culls unexplored batches, keys every
shader patch, and separates the static sun from the moving-unit shadow map. What
is left is mostly memory and robustness, plus a few places where work scales
with the whole map or the whole army instead of with what changed or what is on
screen. The largest single item is the static sun's 8192² shadow target: 512 MiB
of GPU memory, half of it a colour attachment nothing reads, chosen with no
device tier. Second, there is no WebGL context-loss handling, and three.js's own
restore path replaces `renderer.shadowMap`, which silently removes the painted
shadow separation. Together these make the game fragile on anything with less
memory than a desktop GPU. The biggest per-frame costs are units, which are
never frustum-culled and draw nine times each (body, outline, x-ray ghost, times
three wrap copies), and camera-only frames, which run the full state
fingerprint sweep because panning and state changes share one `dirty` flag. The
moving-unit shadow map also re-renders on nearly every pan frame at ordinary
window shapes, by its own docblock's admission.

## Compatibility at a glance

| Item | State |
|---|---|
| WebGL version | WebGL2 only (three r185 dropped WebGL1). Covers current desktop browsers and iOS 15+. |
| Extensions relied on | `EXT_color_buffer_half_float`/`EXT_color_buffer_float` implicitly (half-float composer, GTAO and PMREM targets); `KHR_parallel_shader_compile` optional (`compileAsync`); `EXT_disjoint_timer_query_webgl2` benchmark only. None is checked. |
| Context loss | Not handled (finding 2). |
| Device pixel ratio | Capped at 1.5 in painted mode, 2 in toon (`renderer3d.ts:2752`). No pixel budget, no listener for a DPR change without a resize (finding 8). |
| GPU memory, 1080p window, DPR 2 display | About 1 GB estimated: static shadow 512 MiB, board geometry 213 MiB, default framebuffer ~150 MB (finding 7), composer and contact targets ~80 MB, counter shadow 32 MiB. |

## Findings, ranked by expected impact

Each finding says whether I **traced** it in the code (confirmed) or am
inferring it (suspected).

### 1. The static shadow target is 512 MiB, half of it unused, with no device tier — confirmed

- **Where:** `paintedLook.js:112-113`; `data/view3d.json` `painted.shadows.staticMapSize: 8192`;
  three's allocation at `node_modules/three/src/renderers/webgl/WebGLShadowMap.js:253-254`;
  the depth material at `paintedFog.js:164`.
- **What it costs:** three allocates a PCF shadow map as a full RGBA8 colour
  texture plus a 32-bit depth texture: 8192² × 4 B + 8192² × 4 B = **512 MiB**
  (the committed benchmark's own memory table agrees). The PCF lookup reads only
  the depth texture, so the 256 MiB colour half is never sampled. It is still
  cleared on every bake, and the board's custom depth material
  (`MeshDepthMaterial` with `RGBADepthPacking`) computes and writes packed depth
  into it for every caster fragment. On an integrated GPU, clearing and writing
  half a gigabyte is a real share of each bake. The counter map has the same
  shape at 2048² (32 MiB, 16 MiB unused).
- **Why it matters now:** `periodFit` (P11) made the map cover one period instead
  of three, so 8192 now buys roughly 95 shadow texels per hex width on the
  standard map (8192 ÷ ~149 world units × √3; approximate, since the box is in
  light space). Before P11 the shipped game ran at about 34 texels per hex. The
  size was not revisited when the density nearly tripled. The only clamp is
  `maxTextureSize`, so a phone or a 4 GB laptop asks for the same 512 MiB.
- **Fix, in order of risk:**
  1. `colorWrite: false` on the depth materials made by `paintedFogDepth`
     (and on the counter pass's). Saves the colour bandwidth on every bake. Low
     risk: the colour attachment is never read.
  2. Make `staticMapSize` a device tier rather than one number: 4096 by default
     (128 MiB, about 48 texels per hex, still 1.4× the density the game shipped
     with before P11), 8192 as an opt-in high tier, 2048 for coarse-pointer or
     low-memory devices. Low code risk; it is an art call, so it needs a
     side-by-side screenshot at play and city zoom (shadow edges get softer in
     world units because PCF filters in texels).
  3. Assign `sun.shadow.map` yourself before the first bake with a 1-byte colour
     format (`RedFormat`, `UnsignedByteType`) and the same depth texture setup
     three uses (`DepthFormat`, `UnsignedIntType`, `LessEqualCompare`, linear
     filtering). three only allocates when `shadow.map === null`, so it keeps
     yours. Saves 192 MiB at 8192. Medium risk: it depends on three internals
     and must be re-checked on every three upgrade; verify with
     `renderer.info.memory` and a GPU memory dump.

### 2. No context-loss handling, and three's restore breaks the painted shadow rig — confirmed

- **Where:** no `webglcontextlost`/`webglcontextrestored` listener anywhere in
  `src/` outside the frozen 2D renderer; three's restore at
  `node_modules/three/src/renderers/WebGLRenderer.js:1111-1131` and `:464`, `:516`.
- **What happens:** three calls `preventDefault()` on loss, so the browser may
  restore the context. On restore three runs `initGLContext()`, which builds a
  **new** `WebGLShadowMap` and assigns it to `renderer.shadowMap`. The painted
  rig patched the old object's `render` (`paintedShadows.js:24-63`), so after a
  restore the static sun and the counter light render together against the
  camera's layers 0 and 2: units enter the 8192² static map, the bake-detail
  hook and the wrap sweep stop running, and every counter invalidation becomes a
  full static bake. The PMREM environment (`lighting.js:22-25`) was a render
  target and is not regenerated, so standard materials lose their sky light.
  The static map comes back empty until the next invalidation. And the loop is
  render-on-demand, so nothing redraws until the player touches the camera.
- **Why it matters:** context loss is ordinary on mobile, on laptops switching
  GPUs, after driver updates, and under memory pressure — and finding 1 puts
  this page under memory pressure on anything smaller than a desktop GPU.
- **Fix:** listen for `webglcontextlost` on the canvas: stop the loop, abort any
  board build, and show a plain "Graphics were reset — rebuilding the board"
  notice. On `webglcontextrestored`, do not try to patch three's new objects;
  rebuild the renderer from the game state through the path that already exists
  for a new game (`createRenderer` → `enablePaintedLook` → `preparePaintedMap`
  → `setGameState`, `main.ts:2251-2286`). The game state is untouched by a
  context loss, so this costs a board build (seconds, off-thread) and nothing
  else. Medium risk, mostly in the UI glue. Test with
  `renderer.getContext().getExtension('WEBGL_lose_context')`.

### 3. Units are never culled and draw nine times each — confirmed

- **Where:** `instances.ts:638`, `:658`, `:684` (`frustumCulled = false` on the
  body, the outline shell and the x-ray ghost); `pieces.ts:1160-1173` (painted
  units go through the shared `InstanceCollector`, `copyOffsets [-period, 0, period]`).
- **What it costs:** every unit visible to the seat is submitted as body +
  outline + ghost, each with three wrap copies, every drawn frame, whether or not
  any of it is on screen. Painted unit sculpts average about 1,500 triangles
  (measured: 940 for a carrack to 2,236 for a catapult across 61 types), so one
  unit costs about 13,500 submitted triangles per frame. In my turn-101 bot game
  the human seat sees 46 units in 15 type-and-owner buckets: about 45 draw calls
  and 620k triangles, two-thirds of them for wrap copies off screen. The
  spectator page and any omniscient view see all 244 units in 44 buckets: about
  130 draws and 3.3M triangles. That matches the committed fixture, where
  omniscient play submits 7.37M triangles against 1.57M for the seat's own view.
  The sculpts also cast into the counter shadow map, unculled, three copies
  each, every time that map renders (finding 5).
- **Why:** each bucket's single `InstancedMesh` holds all three copies, so its
  bounding sphere spans the whole cylinder and culling could not help; turning it
  off was the honest choice for that layout.
- **Fix, in steps:**
  1. One `InstancedMesh` per wrap copy (three per bucket) with
     `computeBoundingSphere()` and culling on. At play zoom usually one copy is
     on screen, so unit vertex work drops by about 3× and the counter shadow pass
     gets the same saving through the shadow camera's frustum. The handle layout
     (`HandleImpl.start/count`) already groups a unit's three copies, so hide,
     wash and restore become one write per copy mesh. Low-medium risk: the unit
     pick (`modelCandidates`) and the walk hide/restore must see all three meshes.
  2. Move owner ink from a per-material uniform (`paintedUnits.ts:99-131`) to a
     per-instance attribute, so buckets are per sculpt rather than per sculpt and
     owner. Roughly 3× fewer unit draw calls in a six-seat game. Medium risk.
  3. A far LOD for units at overview zoom, where a 1,500-triangle sculpt is a few
     pixels and the badge carries the information. An art call.

### 4. Panning and zooming run the whole state sync every frame — confirmed and measured

- **Where:** `renderer3d.ts:2633-2643` (`panByScreen`, `zoomBy` call
  `invalidate()`), `:3264-3266` (`invalidate` sets the one `dirty` flag),
  `:3486-3490` (`dirty` triggers `syncStateLayers`); also `setHover` →
  `rebuildOverlays` → `invalidate` (`:2391-2398`, `:2122`).
- **What it costs:** one flag means both "the state may have changed" and "draw
  a frame", so every camera frame runs `syncStateLayers`: two
  `layerVisibility` walks of every tile, `signPaintedWorks` over every tile,
  the works fog fold, and eleven more fingerprints, plus the fog and reveal
  passes. Measured on an Apple M4 in Node, turn-101 standard map: **1.6 ms per
  frame for the fingerprints alone** (`layerVisibility` 0.39 ms × 2,
  `signPaintedWorks` 0.19, `signSites` 0.14, works fog fold 0.11,
  `signImprovements` × 2 0.11, `signUnits` 0.09, the rest under 0.06 each).
  On a mid-range laptop that is likely 4–6 ms of a 16.7 ms budget spent
  re-proving nothing changed. The committed t120 benchmark reports a median
  `preparationMs` of 12–17 ms on pan frames; this sweep is part of that, and the
  rest is unattributed (see open questions). Hovering a new tile also disposes
  and recreates every overlay `InstancedMesh` (`overlays.ts:259`), and through
  the same flag pays the sweep again.
- **Fix:** split the flag. `stateDirty` (set by `setGameState`, `setFogSeat`,
  commands, atlas loads, `setCityFocus` because it sets `facingTurned`, and
  anything that rebuilds a layer) runs `syncStateLayers`; `frameDirty` (set by
  pan, zoom, hover, resize, vignette and selection changes) only draws. Low-medium
  risk: audit each `invalidate()` call site (about 30) for which one it means;
  `test/render/paintedUpdateScope.test.ts` already pins the sync's behaviour.

### 5. The counter shadow map re-renders on nearly every pan frame — confirmed

- **Where:** `paintedShadows.js:138-153`, and its own docblock at `:96-100`.
- **What it costs:** the box half-extent is `1.8 × frustum` and the slack it
  allows before re-fitting is `min(0.1 × box, box − viewReach)`, where
  `viewReach = frustum × max(aspect, 1/sin(elevation))`. At 16:9 that slack is
  0.02 × frustum; at any window wider than 1.8:1 (most laptop and desktop
  browser windows, once the tab bar is subtracted) it is zero, so every pan
  frame re-fits and re-renders. Each render clears 2048² of colour and depth
  (32 MiB of writes) and draws every layer-2 caster: all visible units, three
  copies each, unculled (finding 3). three's shadow renderer also walks the
  whole scene graph (~4,000 board objects) to find the layer-2 objects.
- **Fix:** size the box from `viewReach` rather than from the frustum height,
  for example `wanted = max(6, 1.3 × viewReach)`, which always leaves at least
  23% of the box as slack. Texel density for unit shadows drops by about a
  quarter at 16:9; if that shows, raise `counterMapSize` to 3072 (72 MiB with
  three's colour attachment, 36 MiB without it per finding 1). Low risk; needs an
  eye check on unit shadow softness. Finding 3's culling makes each re-render
  cheaper either way.

### 6. A full static bake follows changes the seat cannot see — confirmed

- **Where:** `renderer3d.ts:3375-3376` (`rebuildCities(... || signCities(state) !== ...)`),
  `:3381-3382` (improvements), `:1986` and `:2000` (works), `:1921`, `:1954`;
  `signCities` at `cities3d.ts:1329-1365`.
- **What it costs:** `signCities`, `signImprovements` and `signPaintedWorks`
  hash every city and tile on the map regardless of fog. Any city growing,
  converting or changing owner anywhere — including a rival's town the seat has
  never seen — and any improvement built anywhere marks the static shadows dirty,
  and the next frame re-renders the 8192² map over every charted caster in the
  period. Religion only changes a banner, which casts nothing. On a developed map
  something changes every turn, so in practice the static map rebakes at every
  end of turn (the committed end-turn workload records one rebake). Its real-GPU
  cost has not been measured (open questions).
- **Fix:** bake when a caster mesh actually changed, not when a global
  fingerprint moved. `PaintedCityLayer.build` already knows this: its `reuse`
  check (`paintedCities.ts:196-201`) returns true for every retained batch, so it
  can return "replaced at least one batch or patch". `PaintedWorksLayer` and the
  sites layer keep the same retained-batch map. Use that return value as
  `shadowChanged` and drop the global fingerprints from the decision. Low-medium
  risk; extend `paintedShadows.test.ts` with "an unseen city grows: no bake; a
  seen city grows: one bake".

### 7. The canvas pays for anti-aliasing, depth and stencil it never uses in painted mode — confirmed (memory size suspected)

- **Where:** `renderer3d.ts:388` (`new WebGLRenderer({ canvas, antialias: true, stencil: true })`);
  the painted frame is `composer.render()` (`lighting.js:84-88`), and three's
  `EffectComposer` targets have no MSAA samples
  (`node_modules/three/examples/jsm/postprocessing/EffectComposer.js:69`).
- **What it costs:** in painted mode the scene renders into the composer's
  half-float target; the only thing drawn to the canvas is `OutputPass`'s
  full-screen quad, which has no edges for MSAA to smooth and no use for depth or
  stencil. The canvas still allocates a multisampled colour plus
  depth-stencil buffer and resolves it every frame. For a 1080p window on a DPR 2
  display (canvas about 2880×1500 at the 1.5 cap) that is on the order of
  140 MB at 4× MSAA, plus the resolve. The exact figure depends on the driver.
- **Fix:** `createRenderer` knows the mode before it constructs `Renderer3D`
  (`main.ts:2261-2264`). Pass it in and create the painted renderer with
  `{ antialias: false, depth: false, stencil: false }`; keep the current options
  for `?art=toon3d`, which does draw straight to the canvas and does use the
  stencil. Low risk.
- **Note:** this also means the painted scene has no anti-aliasing at all today.
  If edges should be smoothed, the place to spend that memory is `samples` on the
  composer's render target, not the canvas. That is an art decision, not part of
  this fix.

### 8. Resolution is capped by DPR, not by pixel count — confirmed

- **Where:** `renderer3d.ts:2748-2757`; `main.ts:5875`.
- **What it costs:** the 1.5 cap protects Retina laptops, but a 4K monitor at
  100% scaling (DPR 1) gets an 8.3M-pixel drawing buffer: about 100 MB for the
  composer target (12 B per pixel), about 58 MB for the contact pass, plus
  finding 7's canvas buffers, and 2× the fill cost of the 1080p case.
  Separately, resize is only heard through `window` `resize`; moving the window
  to a display with a different DPR does not always fire it, so the canvas can
  stay at the old ratio until the next real resize.
- **Fix:** cap the drawing buffer at a pixel budget (for example 4.5M pixels)
  by lowering the ratio when `width × height × ratio²` exceeds it, and listen to
  `matchMedia('(resolution: …dppx)')` as well as `resize`. Low risk.

### 9. Every unit move re-clones and re-uploads every unit outline geometry — confirmed

- **Where:** `instances.ts:647-650`; units rebuild on every `signUnits` change
  (`renderer3d.ts:3333-3337`), which is every step.
- **What it costs:** to attach the per-instance `unitOutlineWidth` attribute,
  each outline bucket clones its whole source geometry, so every rebuild uploads
  a fresh vertex buffer per bucket: painted sculpts are 68–160 KB each (measured,
  99 KB average) plus the hull normals. With 15–44 buckets that is 1.5–5 MB of
  vertex uploads and as many new GL buffers per unit step, all thrown away at the
  next step.
- **Fix:** build the shell geometry as a new `BufferGeometry` that shares the
  source's attribute objects and index, then adds only the instanced width
  attribute — the pattern `paintedBoard.js:229-234` (`propMeshes`) already uses.
  three uploads a shared attribute once. Low risk.

### 10. Programs for everything but the board compile on first use — suspected

- **Where:** `renderer3d.ts:572-577` (`warmPrograms` compiles the board only);
  `paintedUnits.ts:59-97` (a sculpt is built the first time its type appears).
- **What it costs:** the units, cities, works, overlays, lens, badges and
  walkers compile their programs on the frame that first draws them: the first
  selection ring, the first lens, the first walk. three's synchronous link check
  blocks that frame. On ANGLE over D3D11 (most Windows machines) a link can take
  tens to hundreds of milliseconds. Not measured — the benchmarks ran on Apple
  hardware and SwiftShader. Building a unit sculpt the first time it is seen
  costs 3–18 ms on an M4 (measured; the war elephant is 17.6 ms), so the first
  sight of an enemy type hitches a frame.
- **Fix:** the docblock is right that compiling the whole scene at load costs
  more than it saves. Instead, after the first board frame, call `compileAsync`
  for each state layer group and for a hidden prototype of the overlay, lens and
  walker materials from `requestIdleCallback`. During the loading sheet, resolve
  the sculpts for every unit type present in the state. Low risk; measure on a
  Windows laptop first.

### 11. Half-float targets and WebGL2 are assumed, with no fallback — suspected

- **Where:** `lighting.js:33` (composer, half-float by default), GTAO's targets,
  the PMREM environment (`lighting.js:22`); `main.ts:1430-1435` (a failed renderer
  shows the raw error text).
- **What it costs:** rendering to a half-float target needs
  `EXT_color_buffer_half_float` or `EXT_color_buffer_float`. Where it is missing,
  the framebuffer is incomplete and the canvas stays black, with no message. A
  browser without WebGL2 gets three's constructor error printed on the landing.
  The frozen 2D renderer still compiles and could serve these devices.
- **Fix:** after creating the renderer, check
  `renderer.extensions.has('EXT_color_buffer_half_float') || renderer.extensions.has('EXT_color_buffer_float')`;
  if neither, fall back to the toon look (which renders to the canvas). If
  `WebGLRenderer` throws, boot `?art=flat` with a plain sentence saying why.
  Low risk.

### 12. The JavaScript heap keeps a full copy of the board's buffers — confirmed, low priority

- **Where:** no `onUpload` release anywhere in `src/render3d` or `src/terrainStudy`.
- **What it costs:** the 213 MiB of board geometry lives both on the GPU and in
  the JS heap (the t120 benchmark reports a 631 MiB heap). Some of it is needed
  after upload — positions and indices for the ground pick and surface sampling,
  hill batches for `PaintedRelief.replace`. Colours, normals and pigment
  attributes of batches that are never sampled are not.
- **Fix:** none recommended yet. Releasing arrays conflicts with three's own
  context restore (which re-uploads from them) and needs a careful list of what
  each reader touches. Revisit if finding 2 lands as "rebuild on restore", since
  that makes the retained arrays unnecessary for recovery.

### 13. The toon fallback asks for a deprecated shadow type — confirmed, cosmetic

- **Where:** `renderer3d.ts:393`, `abacus3d.ts:332` (`PCFSoftShadowMap`).
- **What it costs:** three r185 prints a deprecation warning and silently uses
  `PCFShadowMap` (`WebGLShadowMap.js:99-103`). Nothing else changes.
- **Fix:** use `PCFShadowMap` explicitly. The toon path is opt-in and closed to
  new work otherwise; leave the rest of it alone.

## Draw calls and triangles today

From the committed t120 benchmarks (SwiftShader, so counts only):

| View, standard map t120 | Draw calls | Triangles submitted |
|---|---:|---:|
| Seat's own view, play zoom | 253 | 1.57M |
| Seat's own view, overview | 456 | 2.88M |
| Omniscient, play zoom | 556 | 7.37M |
| Omniscient, overview | 1,236 | 9.36M |

The large map (104×64) reaches 1,726 draws and 12.8M triangles at omniscient
overview. Draw calls are fine for desktop at play zoom; the triangle counts in
omniscient views are dominated by units (finding 3) and by full-detail props at
overview (the open item 18 in `painted-performance-audit.md`, of which only the
groves have a distant sculpt so far).

## Already done well

- **Render on demand** (`renderer3d.ts:3452-3486`): an idle board costs one
  `requestAnimationFrame` callback that returns. Water animates only while
  something else draws, which is the right trade.
- **The board builds once, off-thread**, with buffers transferred, not copied,
  and cancelled builds disposed (`renderer3d.ts:473-490`).
- **Shadow economics:** static and moving shadows are separate maps and passes;
  the static map covers one period with a per-fragment wrap
  (`paintedShadowWrap.js`); hidden/charted is distinguished from
  remembered/visible so ordinary marches do not rebake; the bake raises near
  geometry for the depth pass only (`paintedBoard.js:557`, `setBakeDetail`).
- **Culling:** wholly unexplored batches leave both the colour and shadow
  passes; overview ground uses 18×18 regions.
- **Program cache hygiene:** every `onBeforeCompile` patch has a matching
  `customProgramCacheKey`; the wrap patch is idempotent across clones.
- **Static transforms:** `matrixAutoUpdate` and `matrixWorldAutoUpdate` off
  across the board.
- **Warm-up:** atlases uploaded one per frame during the worker build
  (`warmTextures`), the board's programs compiled with `compileAsync` before it
  enters the scene.
- **Post-processing:** contact shade at half resolution, normals rebuilt from
  depth instead of a second scene pass, the AO folded into the output pass, and
  the whole pass faded out at map scale (`lighting.js`).
- **Textures:** grains are one-channel and uploaded as `RedFormat`; atlases are
  small (128 px cells); fog is a tiny `DataTexture` written per texel, never a
  rebuild.
- **Lifetimes:** one WebGL context per session for the board (restart and load
  reuse it); disposal paths are thorough; the Abacus's second context calls
  `forceContextLoss()` on close.

## Open questions — what to measure, and how

1. **What a static bake costs on real GPUs, at 8192 and 4096.** Wrap the
   static `original.call(map, [sun], …)` in `paintedShadows.js:40` with an
   `EXT_disjoint_timer_query_webgl2` query (the ledger already separates static
   from counter time on the CPU side). Measure on the M4 and on an Intel or AMD
   integrated laptop, standard and large t120 maps. This decides how much
   findings 1 and 6 are worth.
2. **Where the 12–17 ms of per-frame preparation goes.** Add
   `performance.mark`/`measure` around `syncStateLayers`, the frame listener in
   `main.ts:5405`, and `stepAnimations`, then pan for ten seconds in the Chrome
   performance panel on real GPU hardware. SwiftShader steals CPU from the main
   thread and its figures should not be used for this.
3. **Why a march step on the developed map costs 50–230 ms in `setGameState`**
   (t120 `workloads.march.setGameStateMs`). Mark each rebuild inside
   `syncStateLayers` (`rebuildUnits`, `rebuildCities`, `rebuildPaintedWorks`,
   `rebuildLens`, `rebuildOverlays`) and repeat on real hardware.
4. **How much the default framebuffer really takes with `antialias: true`.**
   Compare GPU process memory in `chrome://tracing` (memory-infra) or an Xcode
   Metal capture with and without the option, same window size.
5. **Whether the page survives a 4 GB tablet.** Load `?art=painted` on an iPad
   and an Android tablet, play ten turns, and watch for context loss
   (`console` shows three's "Context Lost"). Repeat after finding 1's tier
   change.
6. **Whether a foreign town leaves a wrong shadow when it leaves or enters
   sight.** Its stones are drawn only on visible cells (`paintedCities.ts:169`),
   but a visible↔remembered flip deliberately skips the bake
   (`test/render/paintedUpdateScope.test.ts:71`). The static map may keep the
   shadow of a town no longer drawn, or lack the shadow of one just seen, until
   the next bake. Remembered ground is drawn in shade, which may hide the first
   case; the second is on sunlit ground. Needs an eye check at play zoom.
7. **Peak heap and GPU memory while `adoptGame` holds two boards** (the live one
   and the prepared one) on restart or load, measured over five restarts to
   confirm memory returns to a plateau.
