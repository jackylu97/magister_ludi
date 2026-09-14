// Three filters shadow casters against the render camera's layers, rather
// than the shadow camera's layers. Submit each light separately so cached
// scenery and moving counters never enter one another's depth maps.
export function separatePaintedShadows(renderer, sun, counters) {
  const original = renderer.shadowMap.render;
  const map = renderer.shadowMap;
  let bakes = 0;
  map.render = (lights, scene, camera) => {
    if (!map.enabled || (!map.autoUpdate && !map.needsUpdate)) return;
    const layers = camera.layers.mask;
    try {
      if (lights.includes(sun) && (sun.shadow.autoUpdate || sun.shadow.needsUpdate)) {
        camera.layers.set(0);
        map.needsUpdate = true;
        original.call(map, [sun], scene, camera);
        bakes++;
      }
      if (lights.includes(counters)) {
        camera.layers.set(2);
        map.needsUpdate = true;
        original.call(map, [counters], scene, camera);
      }
    } finally {
      camera.layers.mask = layers;
    }
  };
  return { get bakes() { return bakes; }, dispose() { map.render = original; } };
}
