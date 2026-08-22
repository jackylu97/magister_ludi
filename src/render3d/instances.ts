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

import {
  type BufferGeometry,
  type Material,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
} from 'three';

import { type MaterialLibrary, computeHullNormals } from './toon';

/** A matrix that scales to nothing: the way an instance is hidden. */
export const HIDDEN_MATRIX = new Matrix4().makeScale(0, 0, 0);

/**
 * A per-instance colour multiplier: `[r, g, b]`, 1 meaning "leave it alone".
 *
 * Not a colour. Three multiplies `instanceColor` into the fragment's diffuse, so
 * writing tints as multipliers keeps them independent of whatever base ink the
 * bucket happens to be painted in — the same ±5% value wobble does the right
 * thing on a pine and on a dune — and keeps them composable with the vertex
 * colours the prisms carry (`bakeContactShading`), which multiply in the same
 * place.
 */
export type Tint = readonly [number, number, number];

/** No wobble. Shared so an untinted instance costs no allocation. */
const NO_TINT: Tint = [1, 1, 1];

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
  /**
   * A caller-owned material used verbatim instead of one from the library.
   *
   * The escape hatch for the one kind of instance whose look is not a colour:
   * the unit badges, whose disc is a cell of a shared texture atlas (see
   * `badges3d.ts`). Everything else on the board is flat ink, and the library
   * exists precisely so a colour is all a bucket needs; a textured instance has
   * nothing to ask it for. A bucket with a material of its own is never
   * outlined, never shadowed and never tinted — it is a printed thing.
   */
  material: Material | null;
  /** Multiply the ink by the geometry's `color` attribute. See `ToonOptions`. */
  vertexColors: boolean;
  /** Unlit overlay decals, drawn after everything and never shadowed. */
  overlay: boolean;
  /** An overlay the board may not occlude. See `MaterialLibrary.overlay`. */
  onTop: boolean;
  opacity: number;
  matrices: Matrix4[];
  /** One tint per matrix, parallel. Left alone entirely unless `tinted`. */
  tints: Tint[];
  /** Whether any `add` on this bucket asked for a tint. */
  tinted: boolean;
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
  /** Identity, not colour, keys a custom-material bucket. See `Bucket.material`. */
  private readonly materialIds = new Map<Material, number>();
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
   *
   * `tint` deliberately stays *out* of the bucket key. That is its entire
   * reason for existing: colour is the instancing key, so giving ten thousand
   * trees ten thousand slightly different greens by passing ten thousand
   * colours would produce ten thousand draw calls. As a per-instance multiplier
   * it is one extra float3 per instance and no extra draw at all.
   *
   * `material` overrides the library entirely for callers whose look is not a
   * colour — see `Bucket.material`. It joins the bucket key by *identity*, so
   * one shared material batches and two do not.
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
      tint?: Tint;
      vertexColors?: boolean;
      material?: Material;
    } = {},
  ): InstanceHandle {
    const custom = options.material ?? null;
    const outlined = custom ? false : (options.outlined ?? true);
    const onTop = options.onTop ?? false;
    const overlay = !custom && (onTop || (options.overlay ?? false));
    const opacity = options.opacity ?? 1;
    const vertexColors = options.vertexColors ?? false;

    let id = this.geometryIds.get(geometry);
    if (id === undefined) {
      id = this.geometryIds.size;
      this.geometryIds.set(geometry, id);
    }
    let materialId = -1;
    if (custom) {
      const known = this.materialIds.get(custom);
      materialId = known ?? this.materialIds.size;
      if (known === undefined) this.materialIds.set(custom, materialId);
    }
    const key =
      `${id}|${colors.join(',')}|${outlined ? 1 : 0}|` +
      `${overlay ? 1 : 0}|${onTop ? 1 : 0}|${opacity}|${vertexColors ? 1 : 0}|${materialId}`;
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        geometry,
        colors,
        outlined: outlined && !overlay,
        material: custom,
        vertexColors: vertexColors && !overlay,
        overlay,
        onTop,
        opacity,
        matrices: [],
        tints: [],
        tinted: false,
        mesh: null,
        shell: null,
      };
      this.buckets.set(key, bucket);
    }

    const tint = options.tint ?? NO_TINT;
    if (options.tint) bucket.tinted = true;

    const start = bucket.matrices.length;
    for (const dx of this.copyOffsets) {
      const copy = matrix.clone();
      copy.elements[12] += dx;
      bucket.matrices.push(copy);
      bucket.tints.push(tint);
    }
    return { bucket, start, count: this.copyOffsets.length } as HandleImpl;
  }

  /** Builds the meshes and adds them to `group`. Returns the draw-call count. */
  flush(group: Group, materials: MaterialLibrary, shadows: boolean): number {
    let draws = 0;
    for (const bucket of this.buckets.values()) {
      const count = bucket.matrices.length;
      if (count === 0) continue;

      const toonOptions = {
        opacity: bucket.opacity,
        vertexColors: bucket.vertexColors,
      };
      const material = bucket.material
        ? bucket.material
        : bucket.overlay
          ? materials.overlay(bucket.colors[0]!, bucket.opacity, bucket.onTop)
          : bucket.colors.length === 1
            ? materials.get(bucket.colors[0]!, toonOptions)
            : bucket.colors.map((color) => materials.get(color, toonOptions));

      const mesh = new InstancedMesh(bucket.geometry, material, count);
      mesh.castShadow = shadows && !bucket.overlay && !bucket.material;
      mesh.receiveShadow = shadows && !bucket.overlay && !bucket.material;
      // Overlays are unlit decals a hair above the board; drawing them last and
      // without depth writes keeps them off the depth buffer entirely. The
      // `onTop` kind is drawn after even those, because it is not depth-tested
      // at all and its layering is decided purely by the order it is drawn in —
      // see `MaterialLibrary.overlay` for which decals are which and why.
      if (bucket.overlay) mesh.renderOrder = bucket.onTop ? 20 : 10;
      // A textured bucket brings its own material and so is never `overlay` —
      // but it may still be a *decal*, and the tile icons are (see `TileIcons`
      // in `badges3d.ts`). Their material turns the depth test off itself; what
      // they cannot do for themselves is claim a draw order, so `onTop` grants
      // them the same one the unlit decals get.
      else if (bucket.material && bucket.onTop) mesh.renderOrder = 20;
      for (let i = 0; i < count; i++) mesh.setMatrixAt(i, bucket.matrices[i]!);
      mesh.instanceMatrix.needsUpdate = true;
      if (bucket.tinted) {
        // Written straight into the attribute rather than through
        // `setColorAt`, which routes a `THREE.Color` through colour management:
        // these are multipliers, not colours, and converting them would apply a
        // transfer function to a number that is not in any colour space.
        const values = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          const tint = bucket.tints[i]!;
          values[i * 3] = tint[0];
          values[i * 3 + 1] = tint[1];
          values[i * 3 + 2] = tint[2];
        }
        mesh.instanceColor = new InstancedBufferAttribute(values, 3);
        mesh.instanceColor.needsUpdate = true;
      }
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
      // Tints are baked into the attribute and never read again; a hide/restore
      // only rewrites matrices.
      bucket.tints.length = 0;
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
