/**
 * The two shaders the whole look is built out of: a banded toon material and an
 * inverted-hull outline material. Adapted from `src/proto3d/toon.ts`; the only
 * change is that the ramp floor now comes from `view3d.json` instead of being a
 * constant, and the library also hands out the unlit materials the overlays use.
 *
 * Toon banding
 * ------------
 * `MeshToonMaterial` looks up `dot(N, L)` in a 1D `gradientMap` instead of using
 * it directly, so the ramp texture *is* the lighting model. Ours is an N-pixel
 * `DataTexture` with `NearestFilter`, which is the entire trick: three pixels,
 * no interpolation, three flat bands of light on every surface.
 *
 * The bands do not run to black. The darkest step is ~0.45, because a toon ramp
 * that bottoms out at zero gives you a cel-shaded cartoon; keeping the shadow
 * band light and letting the cool hemisphere fill colour it is what reads as
 * painted cardboard under a lamp.
 *
 * Outlines
 * --------
 * Inverted hull: draw the same geometry again, back faces only, pushed outward
 * along the surface normal, in near-black. From the camera the expanded shell is
 * hidden behind the real mesh everywhere except at the silhouette, where it
 * spills out as a rim.
 *
 * The push uses a *smoothed* normal (`aHullNormal`), not the render normal.
 * Everything here is flat-shaded, so the render normals are per-face and
 * duplicated at every edge; pushing along those would blow the mesh apart into
 * separate floating faces and the "outline" would be a cloud of dark shards.
 * `computeHullNormals` re-welds by position and averages, so the shell stays a
 * closed surface. It is applied in `begin_vertex`, before the instance matrix,
 * so instance scale multiplies the thickness — harmless here because every
 * instance is scaled uniformly and only by a few percent.
 */

import {
  BackSide,
  BufferAttribute,
  type BufferGeometry,
  Color,
  DataTexture,
  DoubleSide,
  type IUniform,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  UnsignedByteType,
  Vector3,
} from 'three';

import { VIEW3D, saturate } from './lookData';

/**
 * An N-band lighting ramp. `steps` of 1 is legal and gives unlit flat colour,
 * which is a genuinely useful thing to flip to when judging a palette.
 */
export function makeGradientMap(steps: number, floor: number): DataTexture {
  const n = Math.max(1, Math.round(steps));
  const data = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1);
    data[i] = Math.round((floor + (1 - floor) * t) * 255);
  }
  const texture = new DataTexture(data, n, 1, RedFormat, UnsignedByteType);
  // Nearest on both filters is what keeps the bands hard. Mipmaps would blur
  // the ramp back into a smooth falloff at a distance.
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

// --- hull normals ----------------------------------------------------------

/** Quantised position key, so vertices that coincide weld even after float math. */
function positionKey(x: number, y: number, z: number): string {
  const q = (v: number): number => Math.round(v * 1e4);
  return `${q(x)},${q(y)},${q(z)}`;
}

/**
 * Per-vertex smoothed normals, welded by position, written onto the geometry as
 * `aHullNormal`. Idempotent: calling it twice on the same geometry is a no-op.
 */
export function computeHullNormals(geometry: BufferGeometry): void {
  if (geometry.getAttribute('aHullNormal')) return;

  const position = geometry.getAttribute('position');
  const count = position.count;
  const index = geometry.getIndex();
  const triCount = index ? index.count / 3 : count / 3;

  const accum = new Map<string, Vector3>();
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const ab = new Vector3();
  const ac = new Vector3();
  const faceNormal = new Vector3();

  const vertexAt = (i: number, out: Vector3): Vector3 =>
    out.set(position.getX(i), position.getY(i), position.getZ(i));

  for (let t = 0; t < triCount; t++) {
    const i0 = index ? index.getX(t * 3) : t * 3;
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    vertexAt(i0, a);
    vertexAt(i1, b);
    vertexAt(i2, c);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    // Left un-normalised: the cross product's length is twice the triangle
    // area, so large faces weigh more and a fan of slivers cannot drag the
    // averaged normal around.
    faceNormal.crossVectors(ab, ac);
    for (const i of [i0, i1, i2]) {
      const key = positionKey(position.getX(i), position.getY(i), position.getZ(i));
      const existing = accum.get(key);
      if (existing) existing.add(faceNormal);
      else accum.set(key, faceNormal.clone());
    }
  }

  const out = new Float32Array(count * 3);
  const normal = new Vector3();
  for (let i = 0; i < count; i++) {
    const key = positionKey(position.getX(i), position.getY(i), position.getZ(i));
    const summed = accum.get(key);
    if (summed && summed.lengthSq() > 1e-12) normal.copy(summed).normalize();
    else normal.set(0, 1, 0);
    out[i * 3] = normal.x;
    out[i * 3 + 1] = normal.y;
    out[i * 3 + 2] = normal.z;
  }
  geometry.setAttribute('aHullNormal', new BufferAttribute(out, 3));
}

// --- material library ------------------------------------------------------

export interface ToonOptions {
  /** Transparency. Omitted means fully opaque. */
  opacity?: number;
}

/**
 * Owns every material in the scene, so there is exactly one place a look change
 * has to write to. Materials are cached by `(colour, opacity)`, which is also
 * the instancing key — two kinds of geometry sharing a colour share a material,
 * and the `InstancedMesh` split falls out of the geometry alone.
 *
 * Overlay materials are kept in a separate cache because they are a different
 * *kind* of thing: unlit, double-sided, depth-tested but not depth-writing, and
 * deliberately untouched by the saturation control — an interface tint that
 * drifted with the art direction slider would stop meaning what it means.
 */
export class MaterialLibrary {
  private readonly cache = new Map<string, MeshToonMaterial>();
  private readonly overlayCache = new Map<string, MeshBasicMaterial>();
  /** Base colour per material, pre-saturation, so the slider is not cumulative. */
  private readonly baseColors = new Map<MeshToonMaterial, number>();
  private gradientMap: DataTexture;
  private saturation = 1;
  private readonly rampFloor: number;

  readonly outlineWidth: IUniform<number> = { value: 0 };
  readonly outline: MeshBasicMaterial;

  constructor(rampSteps: number, outlineColor: number) {
    this.rampFloor = VIEW3D.look.rampFloor;
    this.gradientMap = makeGradientMap(rampSteps, this.rampFloor);
    this.outline = new MeshBasicMaterial({ color: outlineColor, side: BackSide });
    this.outline.onBeforeCompile = (shader) => {
      shader.uniforms.uOutlineWidth = this.outlineWidth;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nattribute vec3 aHullNormal;\nuniform float uOutlineWidth;',
        )
        .replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\ntransformed += aHullNormal * uOutlineWidth;',
        );
    };
  }

  /** A toon material for this colour, created once and shared thereafter. */
  get(color: number, options: ToonOptions = {}): MeshToonMaterial {
    const opacity = options.opacity ?? 1;
    const key = `${color}|${opacity}`;
    const existing = this.cache.get(key);
    if (existing) return existing;

    const material = new MeshToonMaterial({
      color: saturate(color, this.saturation),
      gradientMap: this.gradientMap,
      // Faceting is baked into the geometry (see `flatten` in `geometry.ts`),
      // not requested here: `MeshToonMaterial` does not implement `flatShading`,
      // and setting it would be silently dropped.
      transparent: opacity < 1,
      opacity,
    });
    this.cache.set(key, material);
    this.baseColors.set(material, color);
    return material;
  }

  /**
   * An unlit material for a decal.
   *
   * `depthWrite: false` with `depthTest: true` is the combination that lets a
   * tint float a hair above a tile top without either z-fighting it or punching
   * a hole in the pieces standing on it.
   *
   * `onTop` turns the depth test *off* as well, which is the difference between
   * a decal that belongs to the board and one that belongs to the interface.
   * A territory tint is scenery: it must be hidden by the trees and the pieces
   * standing on the ground it colours, or every unit inside your borders would
   * be washed in your own colour. A yield pip, a route dot or a selection ring
   * is not scenery — it is the game *talking to the player*, and a pip a pine
   * tree can stand in front of is a pip the player cannot count. Those are drawn
   * with the test off and late (see `instances.ts` for the render orders), so
   * nothing on the board can occlude them.
   *
   * Depth testing is the only difference. Both kinds stay out of the depth
   * buffer, and both are sorted back-to-front by three's transparent pass, which
   * is what keeps two of them on the same tile — an HP bar's backing and its
   * fill, a pinned dot and its ring — layered the way they were built.
   */
  overlay(color: number, opacity: number, onTop = false): MeshBasicMaterial {
    const key = `${color}|${opacity}|${onTop ? 1 : 0}`;
    const existing = this.overlayCache.get(key);
    if (existing) return existing;
    const material = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: !onTop,
      // Decals are flat and the camera never goes below the board, but a
      // single-sided quad that ends up back-facing simply vanishes, and that
      // failure is much more expensive to debug than this is to enable.
      side: DoubleSide,
    });
    this.overlayCache.set(key, material);
    return material;
  }

  setRampSteps(steps: number): void {
    const next = makeGradientMap(steps, this.rampFloor);
    for (const material of this.cache.values()) {
      material.gradientMap = next;
      material.needsUpdate = true;
    }
    this.gradientMap.dispose();
    this.gradientMap = next;
  }

  /** Rewrites every cached colour from its stored base. Never cumulative. */
  setSaturation(factor: number): void {
    this.saturation = factor;
    const scratch = new Color();
    for (const [material, base] of this.baseColors) {
      material.color.copy(scratch.setHex(saturate(base, factor)));
    }
  }

  /**
   * Marks every material for recompilation. Needed when the shadow map is
   * toggled: the flag changes which defines the programs were built with, and
   * three does not notice by itself.
   */
  invalidatePrograms(): void {
    for (const material of this.cache.values()) material.needsUpdate = true;
    for (const material of this.overlayCache.values()) material.needsUpdate = true;
    this.outline.needsUpdate = true;
  }

  dispose(): void {
    for (const material of this.cache.values()) material.dispose();
    for (const material of this.overlayCache.values()) material.dispose();
    this.cache.clear();
    this.overlayCache.clear();
    this.baseColors.clear();
    this.outline.dispose();
    this.gradientMap.dispose();
  }
}
