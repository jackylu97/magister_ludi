/**
 * Batching transforms into `InstancedMesh`es, and the east–west wrap.
 *
 * Everything drawn on the board goes through here, and everything drawn on the
 * board is drawn *three times*: once at world x − W, once in place, once at
 * x + W, where W is the map's wrap period in world units. The camera wraps its
 * target modulo W (see `camera3d.ts`), so at any moment at most two of the three
 * copies are on screen, and panning east past the seam lands the eye on an
 * identical copy of the board with no rebuild, no popping and no seam.
 *
 * Baking the copies into the instance buffer rather than cloning the scene
 * graph is what keeps the draw-call count flat: an `InstancedMesh` of 12,480
 * prisms is one draw call, exactly as an `InstancedMesh` of 4,160 is. The cost
 * is three times the vertex work and three times the instance memory, which for
 * a board of a few tens of thousands of instances is a trade worth making — and
 * the trade the alternative (three scene-graph copies, or a shader that offsets
 * by instance) would have made worse or more complicated.
 *
 * A copy is a pure x translation, applied by adding to element 12 of the
 * instance matrix — the world-space x component of the translation column. That
 * is exact for any matrix built by `Matrix4.compose`, which is all of them.
 */

import { type BufferGeometry, Group, InstancedMesh, Matrix4 } from 'three';

import { type MaterialLibrary, computeHullNormals } from './toon';

/** A matrix that scales to nothing: the way an instance is hidden. */
export const HIDDEN_MATRIX = new Matrix4().makeScale(0, 0, 0);

interface Bucket {
  geometry: BufferGeometry;
  /**
   * One colour per geometry group. Length 1 for a plain shape; length 3 for a
   * prism, which `CylinderGeometry` splits into side / top cap / bottom cap —
   * that split is what lets a tile have a darker side than its top face without
   * a texture or a second draw.
   */
  colors: number[];
  outlined: boolean;
  /** Unlit overlay decals, drawn after everything and never shadowed. */
  overlay: boolean;
  /** An overlay the board may not occlude. See `MaterialLibrary.overlay`. */
  onTop: boolean;
  opacity: number;
  matrices: Matrix4[];
  mesh: InstancedMesh | null;
  shell: InstancedMesh | null;
}

/**
 * A claim on the instance slots one `add` call produced — one per wrap copy.
 * Handed back so a caller that needs to move or hide a thing later (only units
 * do) can write to exactly its own slots without rebuilding the buffer.
 */
export interface InstanceHandle {
  readonly bucket: unknown;
  readonly start: number;
  readonly count: number;
}

interface HandleImpl extends InstanceHandle {
  readonly bucket: Bucket;
}

export interface CollectorOptions {
  /** World-x offsets to replicate every instance at. See the module docblock. */
  copyOffsets: readonly number[];
  /** Keep the source matrices after flushing, so hidden instances can return. */
  keepMatrices?: boolean;
}

/**
 * Accumulates transforms keyed by (geometry, colours, material kind), then
 * flattens the lot into `InstancedMesh`es. Two-pass because an `InstancedMesh`
 * needs its count up front, and counting the map twice is more code than
 * buffering matrices.
 */
export class InstanceCollector {
  private readonly buckets = new Map<string, Bucket>();
  private readonly geometryIds = new Map<BufferGeometry, number>();
  private readonly copyOffsets: readonly number[];
  private readonly keepMatrices: boolean;

  constructor(options: CollectorOptions) {
    this.copyOffsets = options.copyOffsets;
    this.keepMatrices = options.keepMatrices ?? false;
  }

  /**
   * Queues one instance — and with it one copy per wrap offset. `outlined` adds
   * an inverted-hull shell; `overlay` swaps the toon material for an unlit one
   * and is mutually exclusive with it. `onTop` implies `overlay` and additionally
   * lifts the decal above every piece of board geometry (see below).
   */
  add(
    geometry: BufferGeometry,
    colors: number[],
    matrix: Matrix4,
    options: {
      outlined?: boolean;
      overlay?: boolean;
      onTop?: boolean;
      opacity?: number;
    } = {},
  ): InstanceHandle {
    const outlined = options.outlined ?? true;
    const onTop = options.onTop ?? false;
    const overlay = onTop || (options.overlay ?? false);
    const opacity = options.opacity ?? 1;

    let id = this.geometryIds.get(geometry);
    if (id === undefined) {
      id = this.geometryIds.size;
      this.geometryIds.set(geometry, id);
    }
    const key =
      `${id}|${colors.join(',')}|${outlined ? 1 : 0}|` +
      `${overlay ? 1 : 0}|${onTop ? 1 : 0}|${opacity}`;
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        geometry,
        colors,
        outlined: outlined && !overlay,
        overlay,
        onTop,
        opacity,
        matrices: [],
        mesh: null,
        shell: null,
      };
      this.buckets.set(key, bucket);
    }

    const start = bucket.matrices.length;
    for (const dx of this.copyOffsets) {
      const copy = matrix.clone();
      copy.elements[12] += dx;
      bucket.matrices.push(copy);
    }
    return { bucket, start, count: this.copyOffsets.length } as HandleImpl;
  }

  /** Builds the meshes and adds them to `group`. Returns the draw-call count. */
  flush(group: Group, materials: MaterialLibrary, shadows: boolean): number {
    let draws = 0;
    for (const bucket of this.buckets.values()) {
      const count = bucket.matrices.length;
      if (count === 0) continue;

      const material = bucket.overlay
        ? materials.overlay(bucket.colors[0]!, bucket.opacity, bucket.onTop)
        : bucket.colors.length === 1
          ? materials.get(bucket.colors[0]!, { opacity: bucket.opacity })
          : bucket.colors.map((color) => materials.get(color, { opacity: bucket.opacity }));

      const mesh = new InstancedMesh(bucket.geometry, material, count);
      mesh.castShadow = shadows && !bucket.overlay;
      mesh.receiveShadow = shadows && !bucket.overlay;
      // Overlays are unlit decals a hair above the board; drawing them last and
      // without depth writes keeps them off the depth buffer entirely. The
      // `onTop` kind is drawn after even those, because it is not depth-tested
      // at all and its layering is decided purely by the order it is drawn in —
      // see `MaterialLibrary.overlay` for which decals are which and why.
      if (bucket.overlay) mesh.renderOrder = bucket.onTop ? 20 : 10;
      for (let i = 0; i < count; i++) mesh.setMatrixAt(i, bucket.matrices[i]!);
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      group.add(mesh);
      bucket.mesh = mesh;
      draws++;

      if (bucket.outlined) {
        computeHullNormals(bucket.geometry);
        const shell = new InstancedMesh(bucket.geometry, materials.outline, count);
        // The shell must never cast: it is a fraction of a millimetre larger
        // than the mesh it wraps and would z-fight its own subject's shadow.
        shell.castShadow = false;
        shell.receiveShadow = false;
        shell.frustumCulled = false;
        for (let i = 0; i < count; i++) shell.setMatrixAt(i, bucket.matrices[i]!);
        shell.instanceMatrix.needsUpdate = true;
        group.add(shell);
        bucket.shell = shell;
        draws++;
      }

      if (!this.keepMatrices) bucket.matrices.length = 0;
    }
    return draws;
  }

  /** Zero-scales an instance's slots, in the mesh and its outline shell alike. */
  static hide(handle: InstanceHandle): void {
    const bucket = (handle as HandleImpl).bucket;
    for (let i = 0; i < handle.count; i++) {
      bucket.mesh?.setMatrixAt(handle.start + i, HIDDEN_MATRIX);
      bucket.shell?.setMatrixAt(handle.start + i, HIDDEN_MATRIX);
    }
    markUpdated(bucket);
  }

  /**
   * Puts an instance back where it was built. Requires the collector to have
   * been created with `keepMatrices`, which only the unit layer needs.
   */
  static restore(handle: InstanceHandle): void {
    const bucket = (handle as HandleImpl).bucket;
    for (let i = 0; i < handle.count; i++) {
      const matrix = bucket.matrices[handle.start + i];
      if (!matrix) continue;
      bucket.mesh?.setMatrixAt(handle.start + i, matrix);
      bucket.shell?.setMatrixAt(handle.start + i, matrix);
    }
    markUpdated(bucket);
  }
}

function markUpdated(bucket: Bucket): void {
  if (bucket.mesh) bucket.mesh.instanceMatrix.needsUpdate = true;
  if (bucket.shell) bucket.shell.instanceMatrix.needsUpdate = true;
}

/** Disposes every `InstancedMesh` under a group and empties it. */
export function disposeInstancedGroup(group: Group): void {
  for (const child of group.children) {
    if (child instanceof InstancedMesh) child.dispose();
  }
  group.clear();
}
