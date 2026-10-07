import * as T from 'three';

// Three filters shadow casters against the render camera's layers, rather
// than the shadow camera's layers. Submit each light separately so cached
// scenery and moving counters never enter one another's depth maps.
//
// The separation is also what lets the two passes disagree about *detail*.
// Three builds the colour render list before it renders any shadow map, so a
// visibility flip made inside this wrapper reaches the depth submission and
// nothing else: `bakeDetail` raises the board's near geometry for the static
// sun and drops it again before the colour pass draws, which is how an
// overview frame that has to rebake keeps its far LOD on screen.
//
// The per-pass ledger (`staticMs`, `staticDraws` and the counter's pair) is the
// only way to tell a bake apart from the frame it happened in: `lastRenderMs`
// and `info.render.calls` cover both passes at once, so a probe that watched
// only those could never say which half the millisecond went to.
// `wrap` is the canonical-period lookup (`paintedShadowWrap.js`), swept over the
// scene here rather than handed a list of materials: this is the one moment that
// owns the static map, and it is late enough that every layer which reads that
// map is already standing. See that file for why a missed receiver is not a
// wrong shadow but no shadow at all.
export function separatePaintedShadows(renderer, sun, counters, bakeDetail = null, wrap = null) {
  const original = renderer.shadowMap.render;
  const map = renderer.shadowMap;
  let bakes = 0, staticMs = 0, staticDraws = 0, staticTris = 0, counterMs = 0, counterDraws = 0, counterTris = 0;
  const calls = () => renderer.info?.render.calls ?? 0;
  const tris = () => renderer.info?.render.triangles ?? 0;
  map.render = (lights, scene, camera) => {
    if (!map.enabled || (!map.autoUpdate && !map.needsUpdate)) return;
    const layers = camera.layers.mask;
    try {
      if (lights.includes(sun) && (sun.shadow.autoUpdate || sun.shadow.needsUpdate)) {
        wrap?.sweep(scene);
        camera.layers.set(0);
        map.needsUpdate = true;
        const drawn = calls(), drawnTris = tris(), started = now();
        try {
          bakeDetail?.(true);
          original.call(map, [sun], scene, camera);
        } finally {
          bakeDetail?.(false);
          staticMs += now() - started; staticDraws += calls() - drawn; staticTris += tris() - drawnTris;
        }
        bakes++;
      }
      if (lights.includes(counters)) {
        camera.layers.set(2);
        map.needsUpdate = true;
        const drawn = calls(), drawnTris = tris(), started = now();
        try {
          original.call(map, [counters], scene, camera);
        } finally {
          counterMs += now() - started; counterDraws += calls() - drawn; counterTris += tris() - drawnTris;
        }
      }
    } finally {
      camera.layers.mask = layers;
    }
  };
  return {
    get bakes() { return bakes; },
    get stats() { return { bakes, staticMs, staticDraws, staticTris, counterMs, counterDraws, counterTris }; },
    dispose() { map.render = original; },
  };
}

// The sim is the clock-free half of the app; a renderer helper is not, and a
// headless test has no `performance`.
function now() {
  return typeof performance === 'undefined' ? 0 : performance.now();
}

/**
 * The gate on the moving counters' depth map.
 *
 * `renderer.shadowMap.needsUpdate` is what `separatePaintedShadows` reads, and
 * it used to be set on every drawn frame — so panning an empty board cleared
 * and re-rendered a 2048² depth map for a scene in which nothing on layer 2 had
 * moved. Panning is the commonest thing a player does.
 *
 * The map goes stale for exactly two reasons, and both are seams rather than
 * frames. **Something on layer 2 changed** — a piece placed, taken, moved,
 * killed, embarked, hidden by the fog, or a walk in flight — which the renderer
 * reports through `invalidate()`. Or **the box no longer covers the screen**:
 * the light is directional, so a pan changes no shadow's shape, and the fitted
 * box stays true until the view walks off it. The sun's own angle is the third
 * case and is read off the offset handed in, so an hour change re-fits without
 * being told.
 *
 * "Walks off it" is measured against what the box actually has to give. The
 * ground the frustum covers reaches `viewReach` (the wider of its two axes —
 * `DioramaCamera.groundReach`), and the box's half-extent minus that reach is
 * the whole of the slack. The allowance is the lesser of that slack and
 * `coverage` of the box's half-extent, so a counter standing at the very edge
 * of the screen is **never** outside a box fitted a moment ago.
 *
 * The box is sized from the reach as well as from the frustum height, so the
 * allowance is always the full `coverage` share. It used to be cut at a fixed
 * 1.8 half-heights, which left 0.02 of a half-height spare at 16:9 and none at
 * all on a window wider than 1.8:1 (most browser windows once the tab bar is
 * subtracted): the map was re-fitted and re-rendered on nearly every pan frame,
 * and on the wider windows the box did not even reach the screen's side edges.
 * Now the half-extent is the larger of 1.8 half-heights and
 * `viewReach / (1 − coverage)`, the smallest box that keeps the whole allowance.
 * At 16:10 and narrower the first term still wins and nothing changes; wider
 * windows get a box that grows with them, so the counters' shadow texels are
 * somewhat larger there (about 9% at 16:9) in exchange for the map being left
 * alone through ordinary pans.
 *
 * `coverage` is `painted.shadows.counterCoverage` in `data/view3d.json`. The
 * rest of the numbers here are the rig's geometry rather than tuning: how far
 * up the light hangs, and how much wider than the view its box is cut.
 */
export function createCounterShadows(renderer, light, coverage) {
  const offset = new T.Vector3();
  let dirty = true, fitted = null, extent = 0, facing = null;
  function fit(target, wanted, sunOffset) {
    fitted = fitted ? fitted.copy(target) : target.clone();
    extent = wanted; facing = [...sunOffset];
    offset.set(sunOffset[0], sunOffset[1], sunOffset[2]).normalize().multiplyScalar(80);
    light.position.copy(target).add(offset);
    light.target.position.copy(target); light.target.updateMatrixWorld();
    const camera = light.shadow.camera;
    Object.assign(camera, { left: -wanted, right: wanted, top: wanted, bottom: -wanted, near: .5, far: 180 });
    camera.updateProjectionMatrix();
    dirty = true;
  }
  return {
    /** Something on layer 2 changed: the depth in the map is no longer true. */
    invalidate() { dirty = true; },
    /** Was the box re-fitted to this target? Tests and callers ask; the loop does not. */
    get coverageTarget() { return fitted; },
    /** The box's half-extent, so the containment rule above can be asserted. */
    get boxExtent() { return extent; },
    /**
     * Follows the view, and re-renders the map only when something asked for it.
     * Returns whether this call put the counters back on the renderer's list.
     *
     * `viewReach` is how far the visible ground goes from the target on its
     * wider axis. Omitting it is read as "no idea, so no slack", which fits the
     * box to every frame the view moves.
     */
    update(target, radius, sunOffset, viewReach = Infinity) {
      // An unknown reach cannot size the box; it falls back to the frustum cut.
      const reachCut = Number.isFinite(viewReach) && coverage < 1 ? viewReach / (1 - coverage) : 0;
      const wanted = Math.max(6, radius * 1.8, reachCut);
      // The drift the box can absorb without uncovering the edge of the screen.
      const allowed = Math.min(wanted * coverage, Math.max(0, wanted - viewReach));
      const turned = !facing || facing.some((value, i) => value !== sunOffset[i]);
      if (!fitted || turned || wanted !== extent || fitted.distanceTo(target) > allowed) {
        fit(target, wanted, sunOffset);
      }
      if (!dirty) return false;
      dirty = false;
      renderer.shadowMap.needsUpdate = true;
      return true;
    },
  };
}

/**
 * The static sun's shadow resolution for this device.
 *
 * One fixed 8192² map cost every device 512 MiB of GPU memory, phones and 4 GB
 * laptops included, and after the bake was fitted to one map period it bought
 * about 95 shadow texels per hex width — nearly three times the density the game
 * shipped with before. The sizes are rows of `painted.shadows` in
 * `data/view3d.json`: `staticMapSize` is the standard tier, `staticMapTiers`
 * holds the low and high ones; `paintedLook.js` reads the rows and hands them in.
 *
 * How the tier is chosen, in order:
 *  - `requested` (the page's `?shadows=low|standard|high`) wins, so the high
 *    tier is opt-in and any tier can be forced for a side-by-side check;
 *  - otherwise a device whose primary pointer is coarse (a phone or a tablet),
 *    or that reports `navigator.deviceMemory` at or below `lowMemoryGiB`, gets
 *    the low tier;
 *  - everything else gets the standard tier.
 * The result is clamped to the GPU's largest texture.
 *
 * Pure, so the rule can be tested without a browser; `paintedLook.js` reads the
 * device facts.
 */
export function staticShadowSize(sizes, lowMemoryGiB, device = {}, maxTextureSize = Infinity) {
  let tier = 'standard';
  if (typeof device.requested === 'string' && Object.hasOwn(sizes, device.requested)) tier = device.requested;
  else if (device.coarsePointer || (typeof device.memoryGiB === 'number' && device.memoryGiB <= lowMemoryGiB)) tier = 'low';
  return { tier, size: Math.min(sizes[tier], maxTextureSize) };
}

/**
 * Gives a shadow-casting light its depth target before three allocates one.
 *
 * Three's PCF shadow map is a full RGBA8 colour texture plus a 32-bit depth
 * texture, and the PCF lookup samples only the depth texture: the colour half
 * (256 MiB at 8192², 64 MiB at 4096²) is never read. Three's render targets
 * always carry at least one colour attachment, so this one is the smallest
 * colour-renderable format, one byte a texel, and the depth texture is set up exactly as
 * three's own `WebGLShadowMap` sets it up for `PCFShadowMap` (the depth format,
 * 32-bit unsigned texels, a less-or-equal compare, linear filtering for the
 * hardware's 2×2 filter). Three only allocates when `shadow.map` is null, so it
 * keeps this one; if the shadow type ever changes, three replaces it with its
 * own, which is the old behaviour rather than a broken one.
 *
 * Depends on three's shadow-map internals (r185, `WebGLShadowMap.js`): re-check
 * the depth-texture setup on every three upgrade.
 */
export function installShadowTarget(renderer, light, size) {
  const shadow = light.shadow;
  if (shadow.map) { shadow.map.dispose(); shadow.map = null; }
  const target = new T.WebGLRenderTarget(size, size, {
    format: T.RedFormat, type: T.UnsignedByteType, generateMipmaps: false,
    minFilter: T.NearestFilter, magFilter: T.NearestFilter,
  });
  target.texture.name = `${light.name}.shadowMapColour`;
  const depth = new T.DepthTexture(size, size, T.UnsignedIntType);
  depth.name = `${light.name}.shadowMap`;
  depth.format = T.DepthFormat;
  const reversed = renderer.state?.buffers?.depth?.getReversed?.() === true;
  depth.compareFunction = reversed ? T.GreaterEqualCompare : T.LessEqualCompare;
  depth.minFilter = T.LinearFilter; depth.magFilter = T.LinearFilter;
  target.depthTexture = depth;
  shadow.mapSize.set(size, size);
  shadow.map = target;
  return target;
}

const CHANNELS = { [T.RedFormat]: 1, [T.RGFormat]: 2, [T.RGBAFormat]: 4 };
const TYPE_BYTES = { [T.UnsignedByteType]: 1, [T.HalfFloatType]: 2, [T.FloatType]: 4 };

/**
 * GPU bytes a light's shadow target takes, computed from its size and formats
 * (resident memory is not something a browser will report). A light with no
 * target yet is priced as three would allocate it: RGBA8 colour plus 32-bit depth.
 */
export function shadowTargetBytes(light) {
  const map = light.shadow?.map ?? null;
  const width = map?.width ?? light.shadow.mapSize.x, height = map?.height ?? light.shadow.mapSize.y;
  const colour = map ? (CHANNELS[map.texture.format] ?? 4) * (TYPE_BYTES[map.texture.type] ?? 1) : 4;
  // The depth half is 32 bits a texel whether it is three's texture or ours.
  return width * height * (colour + 4);
}
