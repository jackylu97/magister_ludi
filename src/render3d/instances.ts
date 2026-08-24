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
 *
 * WHY AN INSTANCE IS OFF: the three-bit state machine
 * ---------------------------------------------------
 * There are three entirely separate reasons a board instance is not drawn, they
 * are owned by three different layers, and any of them can hold at once:
 *
 *   **fog-hidden** — `hide` / `restore`, owned by `FogView` (`fog3d.ts`). "This
 *   seat has never charted the hex." It comes and goes as scouts walk, and it is
 *   re-decided from `state.visibility` every frame.
 *
 *   **suppressed** — `suppress` / `unsuppress`, owned by whatever has been
 *   *built* on the hex (`board3d.ts`, driven from `renderer3d.ts`). "A town
 *   stands here, so the pines it was founded in are gone"; "this is a ploughed
 *   field, so the meadow it was cut out of is gone." It is a fact about the
 *   world, identical for every seat, and — Civ-wise — it never comes back.
 *
 *   **veiled** — `veil` / `unveil`, owned by `RevealView` (`reveal3d.ts`). "This
 *   seat has no word for what is on the hex": the ore is drawn on the board and
 *   this player has not researched Bronze Working. Like fog it is per seat and
 *   re-decided every frame; unlike fog it is a fact about *knowledge* rather
 *   than about sight, so it is the one bit that comes off for good — a
 *   technology is never unlearnt — while a scout can walk away from a hex.
 *
 * The composition rule is one line: **an instance renders iff none of the three
 * bits is set.** So the bits live side by side on the handle and the matrix
 * follows their *or*:
 *
 *      fog  sup  veil │ matrix
 *      ───────────────┼─────────────────────────
 *       0    0    0   │ as built  (the snapshot)
 *       anything else │ HIDDEN_MATRIX
 *
 * and a transition writes only when that *or* actually flips. That is what
 * makes the operations commute, which is the whole point: suppressing a
 * tile the seat cannot see costs nothing now and is still respected when the
 * fog lifts (`restore` puts the instance back to *whatever the other bits say*,
 * not to "built"); and a tile going dark and coming back does not resurrect the
 * meadow a farm was ploughed over, nor un-veil ore the seat still cannot name.
 * Naive per-instance clearing that wrote matrices directly had exactly that bug
 * — a fog restore resurrected suppressed clutter — which is why this was
 * deferred out of M7 and is now here instead. Every operation is a `setFlags`
 * over the whole word, so a fourth reason costs a constant and two methods.
 *
 * The wash (`setWash`) is deliberately *orthogonal* to all three bits. A tint on
 * a zero-scaled instance is a colour nobody can see, so suppression never
 * touches colour and fog never asks whether something is suppressed before
 * tinting it. Keeping them independent is what stops the restore path needing to
 * know which of eight states it is putting an instance back into.
 *
 * The bits are per **handle** (one `add` call, one instance, its wrap copies),
 * and all are meaningless before `flush` — the flags are written against live
 * meshes, so a caller that suppressed something before the buffers existed would
 * set a bit nothing had acted on. Everything in this renderer patches after the
 * flush; nothing needs to do otherwise.
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
 * The draw order of everything that is not plain board geometry, in one place.
 *
 * Three sorts the transparent pass by `renderOrder` first and by depth second,
 * so this list *is* the layering of the interface — and it only reads as a
 * design decision while the numbers sit together:
 *
 *   `overlay`  a decal that belongs to the board (a territory tint). Depth
 *              tested, so the trees standing on the ground it colours hide it.
 *   `silhouette` the x-ray ghost of a unit, drawn only where world geometry is
 *              in front of it (see `MaterialLibrary.silhouette`). It sits
 *              *above* the board's decals, because a ghost showing through a
 *              pine is information about a piece and a territory tint is
 *              scenery — and *below* `onTop`, because everything from there up
 *              is the interface talking, and a ring or a route dot must never be
 *              tinted by a ghost lying under it. Its own layer rather than
 *              sharing `overlay`: the two are drawn against opposite depth
 *              tests, and a number that says which is drawn first is the only
 *              place that distinction is visible.
 *   `onTop`    a decal that belongs to the *interface*: the hover and selection
 *              rings, the route dots, the worked-tile chips. Not depth tested at
 *              all, so nothing on the board can swallow it.
 *   `badge`    the unit badges. Above the rings, because a ring is a mark on the
 *              ground *under* a piece and must not paint over the tag naming it
 *              — but still depth tested, so a mountain in front of a unit hides
 *              its badge along with it (see `badges3d.ts`).
 *   `hpBar`    above the badge it is stacked on, matching where the two actually
 *              sit in the world (`hpBarY`), so the bar cannot be cut in half by
 *              the disc below it.
 *
 * They are code, not `view3d.json`: a render order is not a number anybody
 * tunes to taste, it is the statement of which readout wins.
 */
export const RENDER_ORDER = {
  overlay: 10,
  silhouette: 15,
  onTop: 20,
  badge: 21,
  hpBar: 22,
} as const;

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
   * A second, caller-owned material to draw the *same instances* with, in a
   * second pass. `null` for every bucket that does not want one.
   *
   * The x-ray silhouette (see `MaterialLibrary.silhouette`), and structurally it
   * is the outline shell's twin: one more `InstancedMesh` over the identical
   * matrices, so it costs one draw call per bucket and not one per unit, and so
   * it cannot drift out of position from the thing it is ghosting. Hiding and
   * restoring an instance moves all three meshes together for the same reason.
   */
  ghostMaterial: Material | null;
  /** The draw order that second pass claims. See `RENDER_ORDER.silhouette`. */
  ghostOrder: number | null;
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
  /**
   * A draw order claimed by the caller, overriding the one the decal kind would
   * have been given. `null` means "whatever this kind is worth" — see
   * `RENDER_ORDER` for who claims one and why.
   */
  order: number | null;
  opacity: number;
  matrices: Matrix4[];
  /** One tint per matrix, parallel. Left alone entirely unless `tinted`. */
  tints: Tint[];
  /** Whether any `add` on this bucket asked for a tint. */
  tinted: boolean;
  mesh: InstancedMesh | null;
  shell: InstancedMesh | null;
  ghost: InstancedMesh | null;
  /**
   * Copies of the matrix and colour buffers exactly as they were uploaded, kept
   * only when the collector was built with `snapshot`.
   *
   * The cheap half of "put it back". `keepMatrices` holds `Matrix4` *objects*,
   * which is right for the unit layer — a few hundred instances that are also
   * read as transforms — and wrong for the board, where a hundred thousand boxed
   * matrices would cost tens of megabytes to support an operation that only ever
   * copies sixteen floats back where they came from. A flat `Float32Array` slice
   * of what was already uploaded costs 64 bytes an instance and answers the same
   * question.
   */
  baseMatrix: Float32Array | null;
  baseColor: Float32Array | null;
  /**
   * Per-wash-strength multipliers for this bucket's ink and for its outline's,
   * worked out once and reused. See `setWash`: the factor depends only on the
   * bucket's colour and the strength asked for, and a board being washed is
   * asking for one of two strengths on tens of thousands of instances.
   *
   * Keyed by `mix|shade`, because a wash is two numbers and caching on one of
   * them would hand the second strength the first one's answer.
   */
  washes: Map<string, { mesh: Tint; shell: Tint }>;
}

/**
 * Per-instance writes issued since the last reset, by kind.
 *
 * Instrumentation, and it exists for exactly one reason: the fog of war's
 * headline promise is that a visibility change costs writes proportional to the
 * tiles that *changed*, never a board rebuild (design-notes, M8 hard perf
 * constraint). That is a claim about operation counts, and a claim about
 * operation counts wants a test that counts operations rather than a wall clock
 * that a loaded CI box makes a liar of. `test/stress.test.ts` reads it.
 *
 * A module-level tally rather than a field, because the writes are issued by
 * static methods on behalf of whichever layer is patching — and because it is a
 * counter, not state: nothing reads it to decide anything.
 */
export const INSTANCE_WRITES = { matrix: 0, tint: 0 };

/** Zeroes the tally. Called by a test before the operation it is measuring. */
export function resetInstanceWrites(): void {
  INSTANCE_WRITES.matrix = 0;
  INSTANCE_WRITES.tint = 0;
}

/**
 * How thoroughly a tile's dressing yields to what has been built on it.
 *
 * An ordered scale rather than a set of independent flags, because the two
 * things that clear a hex are *nested*: a farm takes the meadow, and a town
 * takes the meadow and everything standing in it. So `suppressTile(cell, scope)`
 * switches off every handle whose own grade is at or below the scope asked for,
 * and the containment is expressed by the numbers rather than by a table.
 *
 * The grades exist to match, exactly, what the board used to decide at *bake*
 * time — see `addDecorations`, which is where each one is claimed:
 *
 *   `CLUTTER` the ground's own scatter: tufts, flowers, cacti, the pebbles on
 *             tundra and the loose boulders on a bare hill. What a farm or a
 *             mine (`clearsClutter` in `data/improvements.json`) ploughs under.
 *   `DECOR`   all of the above *plus* the things that stand on the hex: the
 *             trees, the resource props, the reeds and shingle on a bank. What a
 *             town clears the ground of.
 *
 * The prism itself, a mountain's peak and snow, and the sand band are on no
 * grade at all: a settlement does not remove the hill it is built on.
 */
export const SUPPRESS = {
  /** Never suppressed by anything. The default for `add`. */
  never: 0,
  clutter: 1,
  decor: 2,
} as const;

/** One of `SUPPRESS`. A grade on a handle, or a scope on a `suppressTile`. */
export type SuppressScope = (typeof SUPPRESS)[keyof typeof SUPPRESS];

/** An instance is hidden because the seat has not charted the hex. */
const FOG_BIT = 1;
/** An instance is hidden because something was built over it. */
const SUPPRESS_BIT = 2;
/** An instance is hidden because the seat cannot yet *name* what it draws. */
const VEIL_BIT = 4;

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
  /** The scope at which this instance yields. See `SUPPRESS`. */
  readonly suppressible: SuppressScope;
  /** `FOG_BIT | SUPPRESS_BIT`: why this instance is off, if it is. */
  flags: number;
}

export interface CollectorOptions {
  /** World-x offsets to replicate every instance at. See the module docblock. */
  copyOffsets: readonly number[];
  /** Keep the source matrices after flushing, so hidden instances can return. */
  keepMatrices?: boolean;
  /**
   * Keep flat copies of the uploaded matrix and colour buffers, so any instance
   * can be hidden, tinted and put back exactly as it was built.
   *
   * The board's version of `keepMatrices`, and cheaper by two orders of
   * magnitude — see `Bucket.baseMatrix`. Fog of war is the only caller: it needs
   * to zero-scale a tile's whole scatter and later restore it, and to multiply a
   * tile's tints toward vellum and later un-multiply them, on a buffer that is
   * built once per map and must never be rebuilt.
   */
  snapshot?: boolean;
  /**
   * Give every bucket a per-instance colour attribute, even the ones nothing
   * asked to tint.
   *
   * Without it a bucket that was collected untinted has no `instanceColor` at
   * all and cannot be knocked back later. The board turns it on because fog
   * dims *everything* on a remembered tile — the prism, the trees, the river,
   * the sand band — and a river that stayed bright on a greyed-out hex would be
   * the one thing on the board that had not heard about the fog.
   */
  forceTint?: boolean;
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
  private readonly snapshot: boolean;
  private readonly forceTint: boolean;
  /**
   * Which instance slots belong to which tile, for callers that said so.
   *
   * The whole of the incremental-fog mechanism, and the reason it is collected
   * *here* rather than derived afterwards: only the collector knows which bucket
   * and which slots one `add` produced, and reconstructing that from the outside
   * would mean a second implementation of the bucket key. A tile that named
   * itself gets its handles remembered; everything else costs nothing.
   */
  private readonly byTile = new Map<number, InstanceHandle[]>();

  constructor(options: CollectorOptions) {
    this.copyOffsets = options.copyOffsets;
    this.keepMatrices = options.keepMatrices ?? false;
    this.snapshot = options.snapshot ?? false;
    this.forceTint = options.forceTint ?? false;
  }

  /**
   * The tile→instances map built by this collector, keyed by `tileIndex`.
   *
   * Read after the adds (before or after `flush`, either is fine — a handle
   * names a bucket and a slot range, both of which survive the flush).
   */
  tileHandles(): Map<number, InstanceHandle[]> {
    return this.byTile;
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
   *
   * `order` claims a draw order (see `RENDER_ORDER`) for callers whose layering
   * is not the one their decal kind implies — the badges, which must sit over
   * the interface rings without giving up their depth test. It joins the bucket
   * key too: two draw orders cannot share one mesh.
   */
  add(
    geometry: BufferGeometry,
    colors: number[],
    matrix: Matrix4,
    options: {
      outlined?: boolean;
      overlay?: boolean;
      onTop?: boolean;
      order?: number;
      opacity?: number;
      tint?: Tint;
      vertexColors?: boolean;
      material?: Material;
      /**
       * Draw these instances a second time with this material, over the same
       * matrices — the x-ray silhouette pass. See `Bucket.ghostMaterial`.
       *
       * It joins the bucket key by *identity*, exactly as `material` does. In
       * practice it is derived from the bucket's own colour and is therefore
       * already implied by the key, but relying on that would mean two callers
       * passing different ghosts for one colour would silently share the first
       * one's — a bug that would show up as somebody else's player colour
       * bleeding through a mountain.
       */
      ghost?: Material;
      /** Draw order for the ghost pass; defaults to `RENDER_ORDER.silhouette`. */
      ghostOrder?: number;
      /**
       * The `tileIndex` this instance belongs to, for callers whose instances
       * can be hidden or tinted a tile at a time — which is the board, and fog
       * of war, and nothing else. Deliberately *not* part of the bucket key: a
       * tile is a fact about who owns an instance, never about how it is drawn,
       * and keying on it would give every hex on the map its own draw call.
       */
      tile?: number;
      /**
       * The grade at which this instance yields to what gets built on its tile.
       * See `SUPPRESS`, and the two-bit state machine in the module docblock.
       *
       * Recorded on the handle, never on the bucket: it is a fact about one
       * scrap of scatter — this pine, this tuft — and two scraps of the same
       * shape on the same tile can hold different grades. Like `tile`, it is
       * deliberately out of the bucket key.
       */
      suppressible?: SuppressScope;
    } = {},
  ): InstanceHandle {
    const custom = options.material ?? null;
    const outlined = custom ? false : (options.outlined ?? true);
    const onTop = options.onTop ?? false;
    const overlay = !custom && (onTop || (options.overlay ?? false));
    const order = options.order ?? null;
    const opacity = options.opacity ?? 1;
    const vertexColors = options.vertexColors ?? false;

    let id = this.geometryIds.get(geometry);
    if (id === undefined) {
      id = this.geometryIds.size;
      this.geometryIds.set(geometry, id);
    }
    const materialId = this.materialKey(custom);
    const ghostId = this.materialKey(options.ghost ?? null);
    const key =
      `${id}|${colors.join(',')}|${outlined ? 1 : 0}|` +
      `${overlay ? 1 : 0}|${onTop ? 1 : 0}|${order ?? 'auto'}|` +
      `${opacity}|${vertexColors ? 1 : 0}|${materialId}|${ghostId}`;
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        geometry,
        colors,
        outlined: outlined && !overlay,
        material: custom,
        ghostMaterial: options.ghost ?? null,
        ghostOrder: options.ghostOrder ?? null,
        vertexColors: vertexColors && !overlay,
        overlay,
        onTop,
        order,
        opacity,
        matrices: [],
        tints: [],
        // Never a printed bucket, however loudly the collector was asked. A
        // per-instance colour multiplies whatever the fragment shader has —
        // which for a textured bucket is the *atlas*, not an ink — so a forced
        // attribute here would put the board's fog machinery one careless write
        // away from greying out every roundel on it. `setWash` refuses these
        // buckets from the other end; this is the half that makes sure there is
        // nothing there to write to. See `Bucket.material`.
        tinted: this.forceTint && !custom,
        mesh: null,
        shell: null,
        ghost: null,
        baseMatrix: null,
        baseColor: null,
        washes: new Map(),
      };
      this.buckets.set(key, bucket);
    }

    // A printed bucket is never tinted — see `Bucket.material`, and `tinted`
    // above. A caller that asks anyway gets the print, not a multiplied print.
    const tint = (custom ? null : options.tint) ?? NO_TINT;
    if (tint !== NO_TINT) bucket.tinted = true;

    const start = bucket.matrices.length;
    for (const dx of this.copyOffsets) {
      const copy = matrix.clone();
      copy.elements[12] += dx;
      bucket.matrices.push(copy);
      bucket.tints.push(tint);
    }
    const handle: HandleImpl = {
      bucket,
      start,
      count: this.copyOffsets.length,
      suppressible: options.suppressible ?? SUPPRESS.never,
      flags: 0,
    };
    if (options.tile !== undefined) {
      const list = this.byTile.get(options.tile);
      if (list) list.push(handle);
      else this.byTile.set(options.tile, [handle]);
    }
    return handle;
  }

  /** A stable small integer per material identity, for the bucket key. */
  private materialKey(material: Material | null): number {
    if (!material) return -1;
    const known = this.materialIds.get(material);
    if (known !== undefined) return known;
    const id = this.materialIds.size;
    this.materialIds.set(material, id);
    return id;
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
      // A caller that named an order gets it, whatever kind of thing it is:
      // that is how a badge sits above the interface rings while staying an
      // ordinary depth-tested object (see `RENDER_ORDER`).
      if (bucket.order !== null) mesh.renderOrder = bucket.order;
      else if (bucket.overlay) {
        mesh.renderOrder = bucket.onTop ? RENDER_ORDER.onTop : RENDER_ORDER.overlay;
      }
      // A textured bucket brings its own material and so is never `overlay` —
      // but it may still be a *decal*, and the tile icons are (see `TileIcons`
      // in `badges3d.ts`). Their material turns the depth test off itself; what
      // they cannot do for themselves is claim a draw order, so `onTop` grants
      // them the same one the unlit decals get.
      else if (bucket.material && bucket.onTop) mesh.renderOrder = RENDER_ORDER.onTop;
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
        if (bucket.tinted) {
          // The rim gets a colour attribute too, all ones — so it changes
          // nothing until something asks. Without it a washed-out tile would
          // keep a full-strength black outline, and remembered ground would read
          // as high-contrast line art rather than as a faded chart. See
          // `setWash`, which is the only thing that ever writes here.
          const ones = new Float32Array(count * 3).fill(1);
          shell.instanceColor = new InstancedBufferAttribute(ones, 3);
          shell.instanceColor.needsUpdate = true;
        }
        group.add(shell);
        bucket.shell = shell;
        draws++;
      }

      if (bucket.ghostMaterial) {
        // The same geometry, the same matrices, one more material. Built after
        // the shell so a ghost is drawn over its own outline rather than under
        // it — both fail the depth test in the same places, and the ghost is the
        // one carrying the information.
        const ghost = new InstancedMesh(bucket.geometry, bucket.ghostMaterial, count);
        ghost.castShadow = false;
        ghost.receiveShadow = false;
        ghost.frustumCulled = false;
        ghost.renderOrder = bucket.ghostOrder ?? RENDER_ORDER.silhouette;
        for (let i = 0; i < count; i++) ghost.setMatrixAt(i, bucket.matrices[i]!);
        ghost.instanceMatrix.needsUpdate = true;
        group.add(ghost);
        bucket.ghost = ghost;
        draws++;
      }

      if (this.snapshot) {
        // Slices of what was *actually uploaded*, taken after the writes above,
        // so a restore puts back the bytes the GPU already has rather than a
        // recomputed guess at them. Empty buffers are still sliced (and cost
        // nothing) so the two fields are never half-present.
        bucket.baseMatrix = (mesh.instanceMatrix.array as Float32Array).slice();
        bucket.baseColor = mesh.instanceColor
          ? (mesh.instanceColor.array as Float32Array).slice()
          : null;
      }

      if (!this.keepMatrices) bucket.matrices.length = 0;
      // Tints are baked into the attribute and never read again; a hide/restore
      // only rewrites matrices.
      bucket.tints.length = 0;
    }
    return draws;
  }

  /**
   * Zero-scales an instance's slots, in the mesh and its outline shell alike,
   * because the seat cannot see the hex. Fog's half of the two bits.
   */
  static hide(handle: InstanceHandle): void {
    setFlags(handle as HandleImpl, (handle as HandleImpl).flags | FOG_BIT);
  }

  /**
   * Puts an instance back *to the state the other bit leaves it in* — which is
   * where it was built if nothing has been raised over it, and zero-scaled if
   * something has. See the two-bit state machine in the module docblock: this is
   * the half of it that stops a scout walking past a farm and regrowing the
   * meadow it was ploughed out of.
   *
   * Where "as built" comes from: two sources, checked in that order — the
   * `keepMatrices` list of `Matrix4` objects the unit layer holds, and the flat
   * `snapshot` slice the board holds. A collector that asked for neither cannot
   * restore, and says nothing about it — the instance simply stays hidden, which
   * is what the caller has already seen on screen.
   */
  static restore(handle: InstanceHandle): void {
    setFlags(handle as HandleImpl, (handle as HandleImpl).flags & ~FOG_BIT);
  }

  /**
   * Switches an instance off because something has been built on its tile, if
   * this instance is one of the kinds that yields at `scope`.
   *
   * Idempotent, and safe on a fog-hidden instance: it sets the bit and writes
   * nothing, and the fog's own later `restore` reads the bit and leaves the
   * instance down. See `SUPPRESS` for the grades and the module docblock for the
   * composition rule.
   */
  static suppress(handle: InstanceHandle, scope: SuppressScope): void {
    const impl = handle as HandleImpl;
    if (impl.suppressible === SUPPRESS.never || impl.suppressible > scope) return;
    setFlags(impl, impl.flags | SUPPRESS_BIT);
  }

  /**
   * Undoes a `suppress`, putting the instance back unless fog still has it down.
   *
   * Nothing in the game calls this: a town is never un-founded and a field is
   * never un-ploughed — pillaging destroys the *improvement*, and the cleared
   * ground stays cleared, which is both the Civ rule and what actually happens
   * to a meadow. It exists because a bit that can only ever be set is a bit
   * whose composition with fog was never really tested, and because the editor
   * and the tests need to be able to put a board back.
   */
  static unsuppress(handle: InstanceHandle): void {
    setFlags(handle as HandleImpl, (handle as HandleImpl).flags & ~SUPPRESS_BIT);
  }

  /**
   * Switches an instance off because the seat has no word for what it draws.
   * The reveal gate's half of the three bits; see `RevealView` in `reveal3d.ts`.
   *
   * Deliberately *not* a `suppress` with a third grade: suppression is a fact
   * about the world that every seat sees the same way and that never comes back,
   * and a veil is the opposite of both — it is per seat, and it lifts. Folding
   * them together would mean a player researching Bronze Working un-ploughed
   * every farm in their empire.
   *
   * Idempotent, and it composes with the other two exactly as they compose with
   * each other: the instance is drawn only when nothing at all is against it.
   */
  static veil(handle: InstanceHandle): void {
    const impl = handle as HandleImpl;
    setFlags(impl, impl.flags | VEIL_BIT);
  }

  /** Lifts a `veil`, putting the instance back unless fog or a town has it. */
  static unveil(handle: InstanceHandle): void {
    const impl = handle as HandleImpl;
    setFlags(impl, impl.flags & ~VEIL_BIT);
  }

  /**
   * Switches off everything one tile owns that yields at `scope`. The board's
   * entry point; see `BuiltBoard.suppressTile`.
   */
  suppressTile(tile: number, scope: SuppressScope): void {
    for (const handle of this.byTile.get(tile) ?? []) {
      InstanceCollector.suppress(handle, scope);
    }
  }

  /** The inverse, for completeness. See `InstanceCollector.unsuppress`. */
  unsuppressTile(tile: number): void {
    for (const handle of this.byTile.get(tile) ?? []) InstanceCollector.unsuppress(handle);
  }

  /**
   * Washes an instance's ink toward `target` and takes `shade` of the light out
   * of the result. Both at 0 leaves it exactly as built.
   *
   * The per-instance colour attribute is a *multiplier*, not a colour (see
   * `Tint`), which is what keeps this composable with everything already in the
   * buffer — the per-tile terrain wobble, the per-tree value-and-hue drift, the
   * contact shading baked into the prisms. All of it survives underneath. So a
   * wash toward a flat tone cannot be written directly; what is written is the
   * multiplier that *takes this bucket's own ink to the washed colour*:
   *
   *     washed = ((1 − mix)·ink + mix·target) · (1 − shade)
   *     factor = washed / ink
   *
   * That is a per-*bucket* number, because ink is the instancing key, so it is
   * computed once per strength pair and cached.
   *
   * Why the second term exists
   * --------------------------
   * The mix alone was the whole of this for one milestone, on the argument that
   * dimming makes remembered ground *darker* and darker ground reads as night
   * rather than as memory. The argument is right about the look and wrong about
   * the arithmetic: a lerp toward a mid-luminance tone is a hue move, and the
   * board's palette lives in that same mid band, so mixing halfway to the chart
   * grey changed a grassland face's luminance by four percent — in the
   * *brightening* direction — and lagoon's by sixteen. Remembered ground came
   * out the same picture as watched ground, and on water it came out the lit
   * one. `shade` is what makes "a lit bubble" a statement the pixels can
   * support: the mix decides what remembered ground looks *like*, the shade
   * decides that there is less light on it.
   *
   * The outline shell is washed too, from the outline material's own colour, so
   * a faded tile does not keep a full-strength black rim.
   *
   * A **printed** bucket — one that brought its own material, which is to say a
   * texture atlas (see `Bucket.material`) — is skipped outright. Its "ink" is a
   * picture, not a colour, and a multiplier over a texture would knock the print
   * itself back: a parchment roundel would grey out and the thin strokes on it
   * would go with it. That is the same contract `forceTint` keeps, from the
   * other end.
   *
   * `mix` and `shade` of 0 restore exactly, which is why there is no separate
   * reset.
   */
  static setWash(handle: InstanceHandle, target: number, mix: number, shade = 0): void {
    const bucket = (handle as HandleImpl).bucket;
    if (bucket.material) return;
    const key = `${mix}|${shade}`;
    let wash = bucket.washes.get(key);
    if (!wash) {
      wash = {
        mesh: washFactor(bucketInk(bucket), target, mix, shade),
        shell: washFactor(outlineInk(bucket), target, mix, shade),
      };
      bucket.washes.set(key, wash);
    }
    writeWash(bucket.mesh, bucket.baseColor, handle, wash.mesh);
    // The shell's stored base is all ones (see `flush`), so the factor is
    // written straight in rather than multiplied by anything.
    writeWash(bucket.shell, null, handle, wash.shell);
  }
}

/** `0xRRGGBB` split into three 0..1 channels. */
function channels(color: number): [number, number, number] {
  return [((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255];
}

/**
 * The multiplier that takes `ink` to `mix(ink, target, mix) · (1 − shade)`.
 *
 * Guarded at both ends. A channel at or near zero cannot be multiplied *up* to
 * anything — 0 × anything is 0 — so it is floored before the division, which
 * costs a little accuracy on a near-black ink and avoids an infinity. The factor
 * is then capped, because a genuinely black bucket would otherwise ask for a
 * multiplier in the hundreds and blow out to white the moment the wash is
 * anything at all.
 *
 * Both strengths at zero is the identity, and it has to be *exactly* the
 * identity rather than approximately one: it is what a tile returning to sight
 * is restored with, and a rounding error there would leave a ghost of the wash
 * on every hex that had ever been remembered.
 */
function washFactor(ink: number | null, target: number, mix: number, shade: number): Tint {
  if (ink === null || (mix <= 0 && shade <= 0)) return NO_TINT;
  const from = channels(ink);
  const to = channels(target);
  const light = 1 - Math.max(0, Math.min(1, shade));
  const out: [number, number, number] = [1, 1, 1];
  for (let k = 0; k < 3; k++) {
    const base = Math.max(from[k]!, 0.02);
    const washed = (from[k]! * (1 - mix) + to[k]! * mix) * light;
    out[k] = Math.max(0, Math.min(8, washed / base));
  }
  return out;
}

/**
 * The colour that stands for a bucket, for washing purposes.
 *
 * The *second* entry when there is more than one, because a multi-colour bucket
 * is a hex prism and its groups are side / top cap / bottom cap — the top cap is
 * the face anybody is looking at. `null` for a bucket with no ink of its own,
 * which is a textured one (a badge, a roundel, a serpent): those carry a picture
 * rather than a colour and there is nothing to wash.
 */
function bucketInk(bucket: Bucket): number | null {
  if (bucket.colors.length === 0) return null;
  return bucket.colors.length > 1 ? bucket.colors[1]! : bucket.colors[0]!;
}

/** The outline material's own ink, or null when this bucket has no shell. */
function outlineInk(bucket: Bucket): number | null {
  const material = bucket.shell?.material as { color?: { getHex(): number } } | undefined;
  return material?.color ? material.color.getHex() : null;
}

/** Writes one handle's slots of a colour attribute, counting the writes. */
function writeWash(
  mesh: InstancedMesh | null,
  base: Float32Array | null,
  handle: InstanceHandle,
  factor: Tint,
): void {
  const color = mesh?.instanceColor;
  if (!color) return;
  const values = color.array as Float32Array;
  for (let i = 0; i < handle.count; i++) {
    const at = (handle.start + i) * 3;
    const r = base ? base[at]! : 1;
    const g = base ? base[at + 1]! : 1;
    const b = base ? base[at + 2]! : 1;
    values[at] = r * factor[0];
    values[at + 1] = g * factor[1];
    values[at + 2] = b * factor[2];
    INSTANCE_WRITES.tint += 1;
  }
  color.needsUpdate = true;
}

/**
 * Moves a handle to a new pair of bits, and writes matrices only if that
 * changed whether it is drawn.
 *
 * The whole two-bit machine is here, and it is four lines because the rule is
 * an `or`: what reaches the buffer depends on *whether any* bit is set, never on
 * which. So three of the four transitions between "off for one reason" and "off
 * for two" cost nothing at all — which is exactly the case the milestone cares
 * about, a save with thirty farms on ground the seat has not charted yet.
 *
 * The elision is also why a redundant call is free rather than merely harmless:
 * the unit layer's `hide` is documented idempotent, fog re-hides a chart patch
 * on every level change, and neither now pays for saying so twice.
 */
function setFlags(handle: HandleImpl, next: number): void {
  const drawn = handle.flags === 0;
  handle.flags = next;
  if (drawn === (next === 0)) return;
  if (next !== 0) writeHidden(handle);
  else writeBuilt(handle);
}

/** Zero-scales a handle's slots in the mesh, the outline shell and the ghost. */
function writeHidden(handle: HandleImpl): void {
  const bucket = handle.bucket;
  for (let i = 0; i < handle.count; i++) {
    bucket.mesh?.setMatrixAt(handle.start + i, HIDDEN_MATRIX);
    bucket.shell?.setMatrixAt(handle.start + i, HIDDEN_MATRIX);
    // The ghost travels with the piece it ghosts: a silhouette left behind
    // while its unit slid away would be the most visible bug on the board.
    bucket.ghost?.setMatrixAt(handle.start + i, HIDDEN_MATRIX);
    INSTANCE_WRITES.matrix += 1;
  }
  markUpdated(bucket);
}

/** Puts a handle's slots back to the transforms it was collected with. */
function writeBuilt(handle: HandleImpl): void {
  const bucket = handle.bucket;
  for (let i = 0; i < handle.count; i++) {
    const slot = handle.start + i;
    const matrix = bucket.matrices[slot];
    if (matrix) {
      bucket.mesh?.setMatrixAt(slot, matrix);
      bucket.shell?.setMatrixAt(slot, matrix);
      bucket.ghost?.setMatrixAt(slot, matrix);
      INSTANCE_WRITES.matrix += 1;
      continue;
    }
    const base = bucket.baseMatrix;
    if (!base) continue;
    copyMatrix(base, bucket.mesh, slot);
    copyMatrix(base, bucket.shell, slot);
    copyMatrix(base, bucket.ghost, slot);
    INSTANCE_WRITES.matrix += 1;
  }
  markUpdated(bucket);
}

/** Copies one instance's 16 floats out of a snapshot and into a live mesh. */
function copyMatrix(base: Float32Array, mesh: InstancedMesh | null, slot: number): void {
  if (!mesh) return;
  const target = mesh.instanceMatrix.array as Float32Array;
  const at = slot * 16;
  for (let k = 0; k < 16; k++) target[at + k] = base[at + k]!;
}

function markUpdated(bucket: Bucket): void {
  if (bucket.mesh) bucket.mesh.instanceMatrix.needsUpdate = true;
  if (bucket.shell) bucket.shell.instanceMatrix.needsUpdate = true;
  if (bucket.ghost) bucket.ghost.instanceMatrix.needsUpdate = true;
}

/** Disposes every `InstancedMesh` under a group and empties it. */
export function disposeInstancedGroup(group: Group): void {
  for (const child of group.children) {
    if (child instanceof InstancedMesh) child.dispose();
  }
  group.clear();
}
