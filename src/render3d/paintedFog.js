import * as T from 'three';
import {
  PAINTED_FOG_GLSL, PAINTED_REVEAL_MS, createPaintedLightField, paintedFogUniforms, paintedRevealEase,
} from './paintedFogLook';

// One texel per canonical cell. Every wrap copy and every terrain/prop batch
// reads the same channels: vision, monotone clearing and reversible footprints.
//
// Beside it, and on the same cells, the continuous field of `paintedFogLook.ts`
// carries how lit a hex is and how far the world has soaked through the paper —
// the two things that are light rather than ink, and therefore fade. See that
// file for why the second field is twice as wide.
export function createPaintedFog(width, height) {
  let shadowRevision = 0;
  const data = new Uint8Array(width * height * 4);
  const texture = new T.DataTexture(data, width, height, T.RGBAFormat);
  texture.minFilter = texture.magFilter = T.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  const light = createPaintedLightField(width, height);
  const uniforms = {
    paintedFog: { value: texture },
    paintedFogSize: { value: new T.Vector2(width, height) },
    ...paintedFogUniforms(light),
  };
  const cells = width * height;
  // A reveal is a comparison against a stamp, never a countdown: the cells that
  // are moving, where each channel started, and where it is going.
  const moving = new Set();
  const fromLit = new Uint8Array(cells), fromCharted = new Uint8Array(cells);
  const toLit = new Uint8Array(cells), toCharted = new Uint8Array(cells);
  const stamped = new Float64Array(cells);
  let stamps = 0, revealMs = PAINTED_REVEAL_MS;
  function write(cell, channel, value) {
    if (cell < 0 || cell >= width * height || data[cell * 4 + channel] === value) return false;
    data[cell * 4 + channel] = value;
    texture.needsUpdate = true;
    return true;
  }
  function settle(cell, lit, charted) {
    moving.delete(cell);
    light.write(cell, lit, charted);
  }
  return {
    texture, uniforms, lightTexture: light.texture,
    // Whether a cell casts at all — charted or not — and nothing about how lit
    // it is: remembered ground keeps every scrap of its geometry, so the whole
    // remembered ⇄ visible traffic of an ordinary turn moves this by zero.
    get shadowRevision() { return shadowRevision; },
    /**
     * `at` is the reveal's clock, in milliseconds. Without one every register
     * change arrives whole — a seat change, a headless test; with one the paper
     * dissolves and the sun comes up over `revealMs`, driven by `advanceReveal`
     * and writing nothing but texels either way.
     */
    apply(levels, at) {
      let changed = 0;
      for (let cell = 0; cell < width * height; cell++) {
        const level = levels === null ? 2 : levels[cell] ?? 0;
        if ((data[cell * 4] > 0) !== (level >= 1)) shadowRevision++;
        if (write(cell, 0, level >= 2 ? 255 : level >= 1 ? 127 : 0)) changed++;
        const lit = level >= 2 ? 255 : 0, charted = level >= 1 ? 255 : 0;
        if (light.lit[cell] === lit && light.charted[cell] === charted) continue;
        if (at === undefined || revealMs <= 0) { settle(cell, lit, charted); continue; }
        if (toLit[cell] === lit && toCharted[cell] === charted && moving.has(cell)) continue;
        fromLit[cell] = light.lit[cell]; fromCharted[cell] = light.charted[cell];
        toLit[cell] = lit; toCharted[cell] = charted;
        stamped[cell] = at; stamps++;
        moving.add(cell);
      }
      return changed;
    },
    /**
     * Walks the reveals toward their targets and returns how many are still
     * moving, so a demand-driven loop knows whether to ask for another frame.
     */
    advanceReveal(now) {
      for (const cell of [...moving]) {
        const eased = paintedRevealEase((now - stamped[cell]) / revealMs);
        const lit = Math.round(fromLit[cell] + (toLit[cell] - fromLit[cell]) * eased);
        const charted = Math.round(fromCharted[cell] + (toCharted[cell] - fromCharted[cell]) * eased);
        if (eased >= 1) settle(cell, toLit[cell], toCharted[cell]);
        else light.write(cell, lit, charted);
      }
      return moving.size;
    },
    /** The reveal's length, in milliseconds. A review slider moves it live. */
    get revealMs() { return revealMs; },
    set revealMs(value) { revealMs = Math.max(0, value); },
    /** How many transitions have been stamped: one per cell per change. */
    get revealStamps() { return stamps; },
    get revealing() { return moving.size; },
    suppress(cell, scope) {
      return write(cell, 1, Math.max(data[cell * 4 + 1] || 0, Math.min(2, scope)));
    },
    reserve(cell, radius) { return write(cell, 2, Math.round(Math.max(0, Math.min(1, radius)) * 255)); },
    unsuppress(cell) { return write(cell, 1, 0); },
    visible(cell, grade = 0) {
      return data[cell * 4] > 0 && (grade === 0 || data[cell * 4 + 1] < grade);
    },
    dispose() { texture.dispose(); light.dispose(); },
  };
}

function installFogShader(material, fog, depth, shared = false) {
  const previous = material.onBeforeCompile;
  const cacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    Object.assign(shader.uniforms, fog.uniforms);
    shader.vertexShader = `attribute float paintedCell;
attribute float paintedSuppress;
attribute float paintedReservationDistance;
${shared ? 'attribute float paintedOther;' : ''}
uniform sampler2D paintedFog;
uniform vec2 paintedFogSize;
varying vec3 vPaintedFog;
varying float vPaintedReserved;
${depth ? '' : PAINTED_FOG_GLSL.lightHead}
` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
vec2 paintedUv = (vec2(mod(paintedCell, paintedFogSize.x), floor(paintedCell / paintedFogSize.x)) + .5) / paintedFogSize;
vec3 paintedState = texture2D(paintedFog, paintedUv).rgb;
${shared ? `vec2 paintedOtherUv = (vec2(mod(paintedOther, paintedFogSize.x), floor(paintedOther / paintedFogSize.x)) + .5) / paintedFogSize;
paintedState.r = max(paintedState.r, texture2D(paintedFog, paintedOtherUv).r);` : ''}
vPaintedFog = vec3(paintedState.r, paintedState.g * 255.0, paintedSuppress);
vPaintedReserved = paintedReservationDistance > 0.0 && paintedReservationDistance - 1.0 < paintedState.b ? 1.0 : 0.0;
${depth ? '' : PAINTED_FOG_GLSL.lightVertex}
`);
    shader.fragmentShader = 'varying float vPaintedReserved;\nvarying vec3 vPaintedFog;\n'
      + (depth ? '' : PAINTED_FOG_GLSL.lightHead + PAINTED_FOG_GLSL.registerHead) + shader.fragmentShader;
    // Ink is discrete: the discard reads the nearest-filtered vision channel,
    // so the uncharted frontier lands on whole hexes. Light is continuous and
    // is read one line later, from the field that is filtered.
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', `void main() {
if (vPaintedReserved > .5) discard;
if (vPaintedFog.x < .1 || (vPaintedFog.z > .5 && vPaintedFog.y + .1 >= vPaintedFog.z)) discard;
${depth ? '' : PAINTED_FOG_GLSL.registerWeight}
`);
    if (!depth) {
      // The painterly style composes the sun on one line; the remembered
      // register takes it back out there rather than unpainting it afterwards.
      shader.fragmentShader = shader.fragmentShader.replace(
        PAINTED_FOG_GLSL.painterlySun.find, PAINTED_FOG_GLSL.painterlySun.replace);
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
        `${PAINTED_FOG_GLSL.registerPaint}
#include <opaque_fragment>`);
    }
  };
  material.customProgramCacheKey = () => `${cacheKey()}:painted-fog-v4:${depth}:${shared}`;
  return material;
}

// Three does not clone onBeforeCompile. Preserve the approved material's
// painterly and foliage hooks explicitly before adding board-local fog.
export function paintedFogMaterial(source, fog, shared = false) {
  const material = source.clone();
  material.onBeforeCompile = source.onBeforeCompile;
  material.customProgramCacheKey = source.customProgramCacheKey.bind(source);
  return installFogShader(material, fog, false, shared);
}

export function paintedFogDepth(fog, side = T.FrontSide, shared = false) {
  return installFogShader(new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, side }), fog, true, shared);
}

/**
 * The paper's material: the same fog, read the other way round.
 *
 * It draws only where the board discards — and, during a reveal, for as long as
 * the world is still soaking through it. Nothing else on the table is inverted
 * like this, so it gets its own installer rather than a third flag on the
 * board's.
 */
export function paintedChartMaterial(material, fog) {
  const previous = material.onBeforeCompile;
  const cacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    Object.assign(shader.uniforms, fog.uniforms);
    shader.vertexShader = PAINTED_FOG_GLSL.chartHead + PAINTED_FOG_GLSL.lightHead + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
${PAINTED_FOG_GLSL.lightVertex}
${PAINTED_FOG_GLSL.chartVertex}
`);
    shader.fragmentShader = PAINTED_FOG_GLSL.lightHead + PAINTED_FOG_GLSL.registerHead
      + PAINTED_FOG_GLSL.chartFragmentHead + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('void main() {',
      `void main() {\n${PAINTED_FOG_GLSL.chartDiscard}`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
      `${PAINTED_FOG_GLSL.chartPaint}\n#include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => `${cacheKey()}:painted-chart-v1`;
  return material;
}
