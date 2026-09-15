import * as T from 'three';

/**
 * The canonical-period shadow lookup.
 *
 * The board is a cylinder and the scene holds three copies of it side by side.
 * The static sun's depth map used to be fitted across all three, which is why
 * its pass drew every chunk three times — three quarters of a fully charted
 * overview frame, for two thirds of nothing: the world is periodic in x, so the
 * two outer copies of that map are the middle one again.
 *
 * `painted.shadows.periodFit` bakes **one** period and teaches the receivers to
 * wrap their lookup into it. The wrap is not a `mod` on world x. The sun has an
 * x component, so translating a point by one period moves its shadow coordinate
 * by a fixed vector — sideways *and* along the light's own depth axis — and that
 * vector is the shadow matrix's first column times the period. Subtracting a
 * whole number of them lands any wrap copy on the canonical band:
 *
 *     coord' = coord − round( (x − centre) / period ) · step
 *
 * The rounding is per fragment rather than per vertex on purpose. A wrap copy is
 * a whole mesh today, but a unit layer draws its three copies out of one
 * instanced buffer, and a triangle that straddled the band's edge would tear if
 * its corners disagreed about which copy they were in. Per fragment the figure is
 * constant across a copy and steps only where the bands meet, which is where the
 * bake's margin is.
 *
 * **Who wraps.** Every material that reads the map, which is why this is a sweep
 * over the scene rather than a list: the painted look registers a dozen of them,
 * the board clones each one again for the fog, and the frozen toon layers still
 * standing under the painted art (the site markers' ink stake) read the same map
 * from a shader the painted style never touched. A receiver left out of the wrap
 * does not look wrong on the canonical copy — it looks *unshadowed* on the other
 * two, because three's `getShadow` returns full light outside the map. The sweep
 * runs from inside the static bake (`separatePaintedShadows`), which is the one
 * moment that owns this map and is late enough that every layer is up.
 *
 * The patch has to be the outermost `onBeforeCompile` on a material: the painted
 * style *inserts* the shadow-mask chunk, so a wrap installed underneath it would
 * be reading a shader the style had not written yet. The sweep gets that for
 * nothing, because it patches the material a mesh actually draws with — the fog
 * clone, not the original it was copied from — and by then every other hook is
 * already on. The price is one recompile of anything that reaches the scene
 * after its first frame; see the sacrifices in P11's report.
 */

// Three's own chunks, with the direct read of the directional coordinate routed
// through the wrap — derived rather than copied, so a change to the chunk in a
// future three carries straight through, and additive rather than destructive,
// so nothing that does not ask for `painted_…` sees any difference.
const COORD = /vDirectionalShadowCoord\[\s*i\s*\]/g;
// `UNROLLED_LOOP_INDEX` is three's own token for the light's slot: the unroller
// rewrites it to the literal index, which is the only way this function can tell
// the static sun (slot 0, the periodic map) from the moving counters (slot 1,
// whose small box follows the camera and must not wrap). Slot 0 is the sun
// because the scene adds it first and three's light sort is stable — the same
// assumption `painterly.js` makes when it reads `directionalLights[0]`.
const WRAPPED = 'paintedWrapShadow( vDirectionalShadowCoord[ i ], UNROLLED_LOOP_INDEX )';
for (const chunk of ['shadowmask_pars_fragment', 'lights_fragment_begin']) {
  T.ShaderChunk[`painted_${chunk}`] = T.ShaderChunk[chunk].replace(COORD, WRAPPED);
}

const DECLARATIONS = `
uniform vec4 paintedShadowStep;
uniform vec2 paintedShadowBand;
varying float vPaintedShadowX;
vec4 paintedWrapShadow( const in vec4 coord, const in int light ) {
  if ( light != 0 || paintedShadowStep.w < .5 ) return coord;
  float copy = floor( ( vPaintedShadowX - paintedShadowBand.x ) * paintedShadowBand.y + .5 );
  return vec4( coord.xyz - copy * paintedShadowStep.xyz, coord.w );
}
`;

/** The chunk names this module adds to three's table, for the register test. */
export const PAINTED_SHADOW_CHUNKS = ['painted_shadowmask_pars_fragment', 'painted_lights_fragment_begin'];

/** The marker a patched material's program cache key carries. */
export const PAINTED_SHADOW_WRAP_KEY = ':painted-period-wrap';

/**
 * One band for the process, and one record of who has been patched.
 *
 * Both are module state rather than the look's, because the materials outlive
 * the look. The frozen toon layers under the painted art are the renderer's,
 * not the look's, so a look disposed and built again — an art toggle, a new
 * game — would meet a material its predecessor had already patched. Patching it
 * twice defines the wrap's uniforms and function twice and the shader does not
 * compile; leaving it bound to the dead look's uniforms would freeze its band.
 * A single band solves both: the second look writes the figures the first one's
 * shaders are already reading.
 */
const BAND = {
  // xyz: one world period as a displacement of the shadow coordinate.
  // w: 1 once the map is one period wide, 0 while it spans all three.
  paintedShadowStep: { value: new T.Vector4(0, 0, 0, 0) },
  // x: the canonical band's centre in world x. y: one over the period.
  paintedShadowBand: { value: new T.Vector2(0, 0) },
};
const PATCHED = new WeakSet();

/**
 * The band, and the machinery that installs it.
 *
 * `setBand` is called from the fit; `sweep` from the bake. Both are no-ops until
 * a period is set, so the knob off is the shipped shader unchanged — no material
 * is patched, no chunk is swapped, and nothing recompiles.
 */
export function createShadowWrap() {
  const uniforms = BAND;
  // A look starts with no fit: the band belongs to whichever board is up.
  uniforms.paintedShadowStep.value.set(0, 0, 0, 0);
  let live = false;

  function install(material) {
    // Two records, because one is not enough. The set catches the material
    // itself; the cache key catches a *clone* of a patched material, which
    // three makes by copying the original's compile hook (`paintedFogMaterial`)
    // and so arrives already wrapped under a new object.
    if (PATCHED.has(material) || String(material.customProgramCacheKey?.() ?? '').includes(PAINTED_SHADOW_WRAP_KEY)) return false;
    PATCHED.add(material);
    const previous = material.onBeforeCompile;
    const cacheKey = material.customProgramCacheKey.bind(material);
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer);
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = 'varying float vPaintedShadowX;\n' + shader.vertexShader;
      // `worldpos_vertex` has already put the world position in scope under the
      // same guard the read below sits behind, so the wrap costs one varying and
      // nothing else.
      shader.vertexShader = shader.vertexShader.replace('#include <shadowmap_vertex>', `#include <shadowmap_vertex>
#ifdef USE_SHADOWMAP
 vPaintedShadowX = worldPosition.x;
#endif`);
      shader.fragmentShader = DECLARATIONS + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <shadowmask_pars_fragment>', '#include <painted_shadowmask_pars_fragment>')
        .replace('#include <lights_fragment_begin>', '#include <painted_lights_fragment_begin>');
    };
    material.customProgramCacheKey = () => `${cacheKey()}${PAINTED_SHADOW_WRAP_KEY}`;
    material.needsUpdate = true;
    return true;
  }

  return {
    uniforms,
    /** Has a period been set? The bake asks before it pays for a walk. */
    get live() { return live; },
    /**
     * The canonical band, from the sun the bake was just fitted to. A period of
     * zero is the three-copy fit: the step's `w` goes to zero and every wrap
     * already compiled becomes an identity.
     */
    setBand(sun, centreX, period) {
      live = period > 0;
      if (!live) { uniforms.paintedShadowStep.value.set(0, 0, 0, 0); return; }
      // Three's own matrix, asked for through three's own updater, so the bias
      // half of it is never a copy of a constant that could drift.
      sun.shadow.updateMatrices(sun);
      const e = sun.shadow.matrix.elements;
      uniforms.paintedShadowStep.value.set(e[0] * period, e[1] * period, e[2] * period, 1);
      uniforms.paintedShadowBand.value.set(centreX, 1 / period);
    },
    /** Teaches every material in the scene that receives a shadow to wrap. */
    sweep(scene) {
      if (!live) return 0;
      let installed = 0;
      scene.traverse(object => {
        if (!object.isMesh || !object.receiveShadow) return;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (material && install(material)) installed++;
        }
      });
      return installed;
    },
    /** Patches one material directly. The sweep's own worker, and the tests'. */
    install,
  };
}
