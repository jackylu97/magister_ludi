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
 * "Walks off it" is measured against what the box actually has to give, not
 * against a fixed fraction, because how much is spare depends on the window.
 * The box is cut at 1.8 half-heights; the ground the frustum covers reaches
 * `viewReach` (the wider of its two axes — `DioramaCamera.groundReach`), and
 * the difference is the whole of the slack. The allowance is the lesser of that
 * slack and `coverage` of the box's half-extent, so a counter standing at the
 * very edge of the screen is **never** outside a box fitted a moment ago,
 * whatever the aspect ratio. A wide window simply has less to give and re-fits
 * more often — at 16:9 on nearly every frame the view moves, which is what it
 * did before this gate existed — and a window wider than the box's own cut has
 * nothing to give and re-fits on any movement at all. Widening the cut would
 * buy slack at the price of a coarser map, and the map's figures are not this
 * batch's to change.
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
      const wanted = Math.max(6, radius * 1.8);
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
