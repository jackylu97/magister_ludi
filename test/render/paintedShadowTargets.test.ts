/**
 * The static and counter shadow targets: what they cost and what reads them.
 *
 * WebGL audit 2026-10-06, finding 1. The static sun used to ask three for an
 * 8192² PCF map, which three allocates as an RGBA8 colour texture plus a 32-bit
 * depth texture: 512 MiB, half of it never sampled, on every device. The look
 * now picks the size from a device tier and hands both lights a target whose
 * colour attachment is one byte a texel. These tests pin the tier rule, the
 * target's setup (it must match three's own depth setup, or every shadow on the
 * board goes wrong), the memory arithmetic, and that the shadow lookup still
 * binds the depth texture.
 */
import { describe, expect, it } from 'vitest';
import {
  DepthFormat, DirectionalLight, LessEqualCompare, LinearFilter, MeshDepthMaterial, RedFormat,
  UnsignedByteType, UnsignedIntType,
} from 'three';
// three's internal light-uniform builder: the code that binds each shadow's sampler.
import { WebGLLights } from 'three/src/renderers/webgl/WebGLLights.js';
// @ts-expect-error The browser helper is JavaScript, with no standalone declaration.
import { installShadowTarget, shadowTargetBytes, staticShadowSize } from '../../src/render3d/paintedShadows.js';
// @ts-expect-error The browser helper is JavaScript, with no standalone declaration.
import { paintedFogDepth } from '../../src/render3d/paintedFog.js';
import { VIEW3D } from '../../src/render3d/lookData';
import viewJson from '../../data/view3d.json';

const MiB = 1024 * 1024;
const knobs = viewJson.painted.shadows;
const SIZES = { low: knobs.staticMapTiers.low, standard: knobs.staticMapSize, high: knobs.staticMapTiers.high };
const renderer = { state: { buffers: { depth: { getReversed: () => false } } } };

function light(size: number): DirectionalLight {
  const sun = new DirectionalLight();
  sun.shadow.mapSize.set(size, size);
  return sun;
}

describe('the static shadow tier', () => {
  it('ships 4096 as the standard tier, with 2048 and 8192 either side', () => {
    expect(SIZES).toEqual({ low: 2048, standard: 4096, high: 8192 });
    expect(VIEW3D.painted.shadows.staticMapSize).toBe(4096);
  });

  it('gives a desktop the standard tier', () => {
    expect(staticShadowSize(SIZES, knobs.lowMemoryGiB, {})).toEqual({ tier: 'standard', size: 4096 });
    expect(staticShadowSize(SIZES, knobs.lowMemoryGiB, { memoryGiB: 8, coarsePointer: false }))
      .toEqual({ tier: 'standard', size: 4096 });
  });

  it('gives a touch device or a low-memory one the low tier', () => {
    expect(staticShadowSize(SIZES, knobs.lowMemoryGiB, { coarsePointer: true }).tier).toBe('low');
    expect(staticShadowSize(SIZES, knobs.lowMemoryGiB, { memoryGiB: 4 }).tier).toBe('low');
    expect(staticShadowSize(SIZES, knobs.lowMemoryGiB, { memoryGiB: 2 }).size).toBe(2048);
  });

  it('lets the page ask for any tier, and ignores a word it does not know', () => {
    expect(staticShadowSize(SIZES, knobs.lowMemoryGiB, { requested: 'high', coarsePointer: true }))
      .toEqual({ tier: 'high', size: 8192 });
    expect(staticShadowSize(SIZES, knobs.lowMemoryGiB, { requested: 'low' }).size).toBe(2048);
    expect(staticShadowSize(SIZES, knobs.lowMemoryGiB, { requested: 'toString' }).tier).toBe('standard');
    expect(staticShadowSize(SIZES, knobs.lowMemoryGiB, { requested: 'ultra' }).tier).toBe('standard');
  });

  it('never asks for more than the GPU’s largest texture', () => {
    expect(staticShadowSize(SIZES, knobs.lowMemoryGiB, { requested: 'high' }, 4096).size).toBe(4096);
  });
});

describe('the shadow target', () => {
  it('is a one-byte colour attachment beside three’s own depth setup', () => {
    const sun = light(1);
    const target = installShadowTarget(renderer, sun, 4096);
    expect(sun.shadow.map).toBe(target);
    expect(sun.shadow.mapSize.toArray()).toEqual([4096, 4096]);
    expect([target.width, target.height]).toEqual([4096, 4096]);
    expect(target.texture.format).toBe(RedFormat);
    expect(target.texture.type).toBe(UnsignedByteType);
    // Exactly what `WebGLShadowMap` builds for a PCF directional light in r185.
    const depth = target.depthTexture!;
    expect(depth.format).toBe(DepthFormat);
    expect(depth.type).toBe(UnsignedIntType);
    expect(depth.compareFunction).toBe(LessEqualCompare);
    expect([depth.minFilter, depth.magFilter]).toEqual([LinearFilter, LinearFilter]);
    expect([depth.image.width, depth.image.height]).toEqual([4096, 4096]);
  });

  it('is the texture the shadow lookup binds', () => {
    // Three's light-uniform builder picks `depthTexture || texture` for each
    // shadow; this is the sampler every receiver's PCF lookup reads.
    const lights = new WebGLLights({ has: () => false } as unknown as ConstructorParameters<typeof WebGLLights>[0]);
    const sun = light(1);
    sun.castShadow = true;
    installShadowTarget(renderer, sun, 2048);
    lights.setup([sun]);
    expect(lights.state.directionalShadowMap[0]).toBe(sun.shadow.map!.depthTexture);
  });

  it('takes 80 MiB at the standard tier where three’s own took 512 MiB at the old size', () => {
    // Arithmetic from the sizes and formats; no browser reports resident memory.
    expect(shadowTargetBytes(light(8192)) / MiB).toBe(512);
    expect(shadowTargetBytes(light(2048)) / MiB).toBe(32);
    const sun = light(1), counters = light(1);
    installShadowTarget(renderer, sun, 4096);
    installShadowTarget(renderer, counters, 2048);
    expect(shadowTargetBytes(sun) / MiB).toBe(80);
    expect(shadowTargetBytes(counters) / MiB).toBe(20);
  });

  it('is installed on both lights by the look, before three allocates its own', () => {
    const look = Object.values(import.meta.glob('../../src/render3d/paintedLook.js', {
      query: '?raw', import: 'default', eager: true,
    }) as Record<string, string>)[0]!;
    expect(look).toContain('installShadowTarget(renderer,dynamicSun,');
    expect(look).toContain('installShadowTarget(renderer,sun,staticMap.size)');
    // The old path set a size and let three allocate RGBA8 on the first bake.
    expect(look).not.toContain('sun.shadow.mapSize.set(');
  });
});

describe('the board’s depth material', () => {
  it('writes depth only', () => {
    const fog = { uniforms: {} };
    const material = paintedFogDepth(fog) as MeshDepthMaterial;
    expect(material).toBeInstanceOf(MeshDepthMaterial);
    expect(material.colorWrite).toBe(false);
    expect(material.depthWrite).toBe(true);
  });
});
