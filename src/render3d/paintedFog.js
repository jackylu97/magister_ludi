import * as T from 'three';

// One texel per canonical cell. Every wrap copy and every terrain/prop batch
// reads the same channels: vision, monotone clearing and reversible footprints.
export function createPaintedFog(width, height) {
  let shadowRevision = 0;
  const data = new Uint8Array(width * height * 4);
  const texture = new T.DataTexture(data, width, height, T.RGBAFormat);
  texture.minFilter = texture.magFilter = T.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  const uniforms = {
    paintedFog: { value: texture },
    paintedFogSize: { value: new T.Vector2(width, height) },
    paintedFogWash: { value: new T.Color('#b3ab99') },
  };
  function write(cell, channel, value) {
    if (cell < 0 || cell >= width * height || data[cell * 4 + channel] === value) return false;
    data[cell * 4 + channel] = value;
    texture.needsUpdate = true;
    return true;
  }
  return {
    texture, uniforms,
    get shadowRevision() { return shadowRevision; },
    apply(levels) {
      let changed = 0;
      for (let cell = 0; cell < width * height; cell++) {
        const level = levels === null ? 2 : levels[cell] ?? 0;
        if ((data[cell * 4] > 0) !== (level >= 1)) shadowRevision++;
        if (write(cell, 0, level >= 2 ? 255 : level >= 1 ? 127 : 0)) changed++;
      }
      return changed;
    },
    suppress(cell, scope) {
      return write(cell, 1, Math.max(data[cell * 4 + 1] || 0, Math.min(2, scope)));
    },
    reserve(cell, radius) { return write(cell, 2, Math.round(Math.max(0, Math.min(1, radius)) * 255)); },
    unsuppress(cell) { return write(cell, 1, 0); },
    visible(cell, grade = 0) {
      return data[cell * 4] > 0 && (grade === 0 || data[cell * 4 + 1] < grade);
    },
    dispose() { texture.dispose(); },
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
` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
vec2 paintedUv = (vec2(mod(paintedCell, paintedFogSize.x), floor(paintedCell / paintedFogSize.x)) + .5) / paintedFogSize;
vec3 paintedState = texture2D(paintedFog, paintedUv).rgb;
${shared ? `vec2 paintedOtherUv = (vec2(mod(paintedOther, paintedFogSize.x), floor(paintedOther / paintedFogSize.x)) + .5) / paintedFogSize;
paintedState.r = max(paintedState.r, texture2D(paintedFog, paintedOtherUv).r);` : ''}
vPaintedFog = vec3(paintedState.r, paintedState.g * 255.0, paintedSuppress);
vPaintedReserved = paintedReservationDistance > 0.0 && paintedReservationDistance - 1.0 < paintedState.b ? 1.0 : 0.0;
`);
    shader.fragmentShader = 'varying float vPaintedReserved;\nvarying vec3 vPaintedFog;\nuniform vec3 paintedFogWash;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', `void main() {
if (vPaintedReserved > .5) discard;
if (vPaintedFog.x < .1 || (vPaintedFog.z > .5 && vPaintedFog.y + .1 >= vPaintedFog.z)) discard;
`);
    if (!depth) shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
if (vPaintedFog.x < .75) outgoingLight = mix(outgoingLight, paintedFogWash, .5) * .7;
#include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => `${cacheKey()}:painted-fog-v3:${depth}:${shared}`;
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
