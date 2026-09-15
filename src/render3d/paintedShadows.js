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
export function separatePaintedShadows(renderer, sun, counters, bakeDetail = null) {
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
