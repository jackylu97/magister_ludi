/**
 * Turns a live `GameState` into a pile of `InstancedMesh`es.
 *
 * This is the only file that knows both the simulation and Three.js. It reads
 * the map through the ordinary sim accessors — nothing is mutated, nothing is
 * cached back into the state — and emits one instanced draw per
 * (geometry, material) pair. A duel map is ~1000 tiles and a few hundred
 * decorations and comes out at roughly a dozen draw calls.
 *
 * Placement is a pure function of `(col, row)`
 * -------------------------------------------
 * Every jitter — yaw, height, tree position, tree size, which hills get rocks —
 * comes from `hashUnit(col, row, stream)`. Nothing rolls a die and nothing
 * remembers a previous frame, so rebuilding the scene reproduces it exactly and
 * two tiles with the same terrain still look different. Each kind of decoration
 * draws from its own `stream`, so adding rocks does not reshuffle forests.
 *
 * Uniform scale only
 * ------------------
 * Height jitter is applied as a *uniform* scale about each prism's base rather
 * than a y-only squash. It costs a matching ±3.5% of hex radius, which is
 * invisible under the tile gap and frankly helps — the tiles look hand-cut —
 * and it buys two things: the inverted-hull outline keeps a constant thickness
 * (the shell offset is multiplied by the instance matrix), and the base stays
 * planted on the floor plane instead of floating.
 */

import {
  type BufferGeometry,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
  BoxGeometry,
} from 'three';

import { hexToPixel } from '../sim/hex';
import { type GameMap, type Tile, offsetToAxial } from '../sim/map';
import type { GameState } from '../sim/state';

import { hashDisc, hashSigned, hashUnit } from './hash';
import {
  hexPrism,
  mountainPeak,
  pineTree,
  rock,
  roundTree,
  scoutPiece,
  settlerPiece,
  warriorPiece,
} from './geometry';
import {
  BOARD,
  DECOR,
  FEATURE_COLOR,
  PALETTE,
  PIECE,
  SIDE_DARKEN,
  TERRAIN_COLOR,
  playerColor,
  shade,
} from './palette';
import { type MaterialLibrary, computeHullNormals } from './toon';

/** Which prism height a tile gets. Mountain beats hills beats water beats flat. */
type HeightClass = keyof typeof BOARD.height;

function heightClassOf(tile: Tile): HeightClass {
  if (tile.terrain === 'mountain') return 'mountain';
  if (tile.terrain === 'ocean') return 'ocean';
  if (tile.terrain === 'coast' || tile.terrain === 'lake') return 'coast';
  return tile.hills ? 'hills' : 'land';
}

// --- instance collection ---------------------------------------------------

interface Bucket {
  geometry: BufferGeometry;
  /**
   * One colour per geometry group. Length 1 for a plain shape; length 3 for a
   * prism, which `CylinderGeometry` splits into side / top cap / bottom cap —
   * that split is what lets a tile have a darker side than its top face
   * without a texture or a second draw.
   */
  colors: number[];
  outlined: boolean;
  matrices: Matrix4[];
}

/**
 * Accumulates transforms keyed by (geometry, colours), then flattens the lot
 * into `InstancedMesh`es. Two-pass because an `InstancedMesh` needs its count
 * up front, and counting the map twice is more code than buffering matrices.
 */
class InstanceCollector {
  private readonly buckets = new Map<string, Bucket>();
  private readonly geometryIds = new Map<BufferGeometry, number>();

  add(geometry: BufferGeometry, colors: number[], matrix: Matrix4, outlined = true): void {
    let id = this.geometryIds.get(geometry);
    if (id === undefined) {
      id = this.geometryIds.size;
      this.geometryIds.set(geometry, id);
    }
    const key = `${id}|${colors.join(',')}|${outlined ? 1 : 0}`;
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { geometry, colors, outlined, matrices: [] };
      this.buckets.set(key, bucket);
    }
    bucket.matrices.push(matrix);
  }

  flush(group: Group, materials: MaterialLibrary, shadows: boolean): void {
    for (const bucket of this.buckets.values()) {
      const count = bucket.matrices.length;
      if (count === 0) continue;

      const material =
        bucket.colors.length === 1
          ? materials.get(bucket.colors[0]!)
          : bucket.colors.map((color) => materials.get(color));
      const mesh = new InstancedMesh(bucket.geometry, material, count);
      mesh.castShadow = shadows;
      mesh.receiveShadow = shadows;
      for (let i = 0; i < count; i++) mesh.setMatrixAt(i, bucket.matrices[i]!);
      mesh.instanceMatrix.needsUpdate = true;
      group.add(mesh);

      if (!bucket.outlined) continue;
      computeHullNormals(bucket.geometry);
      const shell = new InstancedMesh(bucket.geometry, materials.outline, count);
      // The shell must never cast: it is a fraction of a millimetre larger than
      // the mesh it wraps and would z-fight with its own subject's shadow.
      shell.castShadow = false;
      shell.receiveShadow = false;
      for (let i = 0; i < count; i++) shell.setMatrixAt(i, bucket.matrices[i]!);
      shell.instanceMatrix.needsUpdate = true;
      group.add(shell);
    }
  }
}

// --- shared geometry -------------------------------------------------------

/**
 * One geometry per shape, built once and shared by every board ever built.
 *
 * Prisms are pre-built per height class rather than being one unit prism scaled
 * in y, precisely so instance scaling can stay uniform (see the module
 * docblock). There are five classes, so this costs five geometries.
 */
export class BoardGeometry {
  readonly prisms: Record<HeightClass, BufferGeometry>;
  readonly peak: BufferGeometry;
  readonly pine: BufferGeometry;
  readonly broadleaf: BufferGeometry;
  readonly boulder: BufferGeometry;
  readonly pieces: { warrior: BufferGeometry; scout: BufferGeometry; settler: BufferGeometry };

  constructor() {
    const radius = BOARD.hexRadius * (1 - BOARD.tileGap);
    const prismFor = (topY: number): BufferGeometry => hexPrism(radius, topY - BOARD.floorY);
    this.prisms = {
      ocean: prismFor(BOARD.height.ocean),
      coast: prismFor(BOARD.height.coast),
      land: prismFor(BOARD.height.land),
      hills: prismFor(BOARD.height.hills),
      mountain: prismFor(BOARD.height.mountain),
    };
    this.peak = mountainPeak(BOARD.peak.radius, BOARD.peak.height);
    this.pine = pineTree(DECOR.pine);
    this.broadleaf = roundTree(DECOR.jungle);
    this.boulder = rock(DECOR.rock.radius);
    this.pieces = {
      warrior: warriorPiece(PIECE.height / 0.63),
      scout: scoutPiece(PIECE.height / 0.76),
      settler: settlerPiece(PIECE.height / 0.52),
    };
  }

  dispose(): void {
    for (const prism of Object.values(this.prisms)) prism.dispose();
    this.peak.dispose();
    this.pine.dispose();
    this.broadleaf.dispose();
    this.boulder.dispose();
    for (const piece of Object.values(this.pieces)) piece.dispose();
  }
}

// --- board build -----------------------------------------------------------

export interface BuiltBoard {
  group: Group;
  /** World-space extent of the board, for camera framing and pan clamping. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Centre of the first player's starting units, so the camera opens on them. */
  focus: Vector3;
  tileCount: number;
  drawCalls: number;
  dispose(): void;
}

/** World position of a tile centre, ignoring height. */
function tileCenter(tile: Tile): { x: number; z: number } {
  const point = hexToPixel(offsetToAxial(tile.col, tile.row), BOARD.hexRadius);
  return { x: point.x, z: point.y };
}

/** Per-tile uniform scale. See the module docblock for why it is not y-only. */
function tileScale(tile: Tile): number {
  return 1 + hashSigned(tile.col, tile.row, 11) * BOARD.heightJitter;
}

/**
 * Top face height of a tile *after* its jitter — where anything standing on
 * this tile must be placed. Derived from the same scale the prism gets, so a
 * tree can never float above or sink into the tile it belongs to.
 */
function tileTop(tile: Tile): number {
  const base = BOARD.height[heightClassOf(tile)];
  return BOARD.floorY + (base - BOARD.floorY) * tileScale(tile);
}

function tileYaw(tile: Tile): number {
  return hashSigned(tile.col, tile.row, 12) * BOARD.yawJitter;
}

/**
 * The substrate: one slab under the whole board, in the darkest earth tone.
 *
 * It exists because the tiles are drawn under-sized. Without it you would look
 * straight down the gap between two same-height tiles and see sky, and the
 * board would read as a lattice rather than a solid object. With it, the gaps
 * become grout lines — which is most of what sells "pieces on a table".
 */
function buildSubstrate(map: GameMap, bounds: BuiltBoard['bounds']): Mesh {
  const pad = BOARD.hexRadius * 0.7;
  const width = bounds.maxX - bounds.minX + pad * 2;
  const depth = bounds.maxZ - bounds.minZ + pad * 2;
  const top = BOARD.height.ocean - 0.06;
  const height = top - (BOARD.floorY - 0.4);

  const geometry = new BoxGeometry(width, height, depth);
  geometry.translate(
    (bounds.minX + bounds.maxX) / 2,
    top - height / 2,
    (bounds.minZ + bounds.maxZ) / 2,
  );
  const material = new MeshBasicMaterial({
    color: new Color(shade(PALETTE.earth, -0.32)),
    // The slab is seen from above through cracks and from the side at the map
    // edge; DoubleSide costs nothing here and avoids a hollow-looking rim.
    side: DoubleSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.name = `substrate:${map.sizeName}`;
  return mesh;
}

function addDecorations(
  tile: Tile,
  top: number,
  center: { x: number; z: number },
  geometry: BoardGeometry,
  collector: InstanceCollector,
): void {
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const axis = new Vector3(0, 1, 0);

  const place = (
    shape: BufferGeometry,
    color: number,
    stream: number,
    index: number,
    baseScale: number,
  ): void => {
    const slot = stream * 64 + index * 4;
    const offset = hashDisc(tile.col, tile.row, slot, DECOR.spread * BOARD.hexRadius);
    const jitter = 1 + hashSigned(tile.col, tile.row, slot + 2) * DECOR.sizeJitter;
    const yaw = hashUnit(tile.col, tile.row, slot + 3) * Math.PI * 2;
    position.set(center.x + offset.x, top, center.z + offset.z);
    quaternion.setFromAxisAngle(axis, yaw);
    const s = baseScale * jitter;
    scale.set(s, s, s);
    collector.add(shape, [color], new Matrix4().compose(position, quaternion, scale));
  };

  if (tile.feature === 'forest') {
    // Two or three, hashed — an even count everywhere looks planted by a
    // machine, and the sim has no per-tile density to read.
    const count = 2 + Math.floor(hashUnit(tile.col, tile.row, 20) * 2);
    for (let i = 0; i < count; i++) place(geometry.pine, FEATURE_COLOR.forest, 2, i, 1);
  } else if (tile.feature === 'jungle') {
    const count = 2 + Math.floor(hashUnit(tile.col, tile.row, 21) * 2);
    for (let i = 0; i < count; i++) place(geometry.broadleaf, FEATURE_COLOR.jungle, 3, i, 1.1);
  }

  // Rocks scatter on bare hills only: a forested hill already has silhouette,
  // and piling boulders under the trees just made mud.
  if (tile.hills && tile.feature === 'none' && tile.terrain !== 'mountain') {
    if (hashUnit(tile.col, tile.row, 30) < 0.55) {
      const count = 1 + Math.floor(hashUnit(tile.col, tile.row, 31) * 2);
      for (let i = 0; i < count; i++) place(geometry.boulder, PALETTE.slate, 4, i, 1);
    }
  }
}

export function buildBoard(
  state: GameState,
  geometry: BoardGeometry,
  materials: MaterialLibrary,
  shadows: boolean,
): BuiltBoard {
  const map = state.map;
  const group = new Group();
  const collector = new InstanceCollector();

  const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const axis = new Vector3(0, 1, 0);

  for (const tile of map.tiles) {
    const center = tileCenter(tile);
    bounds.minX = Math.min(bounds.minX, center.x);
    bounds.maxX = Math.max(bounds.maxX, center.x);
    bounds.minZ = Math.min(bounds.minZ, center.z);
    bounds.maxZ = Math.max(bounds.maxZ, center.z);

    const kind = heightClassOf(tile);
    const s = tileScale(tile);
    position.set(center.x, BOARD.floorY, center.z);
    quaternion.setFromAxisAngle(axis, tileYaw(tile));
    scale.set(s, s, s);
    // Water is not outlined. An inverted hull on a low prism in a field of
    // identical low prisms draws a dark ring around every single one, and the
    // ocean turns into graph paper; the two blues carry the read instead.
    const water = kind === 'ocean' || kind === 'coast';
    const topColor = TERRAIN_COLOR[tile.terrain];
    // side / top cap / bottom cap. The bottom is never seen, but the group
    // exists and must be given something.
    const side = shade(topColor, SIDE_DARKEN);
    collector.add(
      geometry.prisms[kind],
      [side, topColor, side],
      new Matrix4().compose(position, quaternion, scale),
      !water,
    );

    const top = tileTop(tile);
    if (tile.terrain === 'mountain') {
      const peakYaw = hashUnit(tile.col, tile.row, 13) * Math.PI * 2;
      const peakScale = 0.86 + hashUnit(tile.col, tile.row, 14) * 0.4;
      position.set(center.x, top - 0.05, center.z);
      quaternion.setFromAxisAngle(axis, peakYaw);
      scale.set(peakScale, peakScale, peakScale);
      collector.add(
        geometry.peak,
        [shade(PALETTE.slate, 0.08)],
        new Matrix4().compose(position, quaternion, scale),
      );
    } else {
      addDecorations(tile, top, center, geometry, collector);
    }
  }

  // Units last so their instance buckets are contiguous; also lets a stack on
  // one tile fan out by index without a second pass over the map.
  const stackIndex = new Map<string, number>();
  for (const unit of state.units) {
    const tile = map.tiles[unit.row * map.width + unit.col];
    if (!tile) continue;
    const key = `${unit.col},${unit.row}`;
    const index = stackIndex.get(key) ?? 0;
    stackIndex.set(key, index + 1);

    const center = tileCenter(tile);
    const angle = index * 2.1;
    const spread = index === 0 ? 0 : 0.34;
    position.set(
      center.x + Math.cos(angle) * spread,
      tileTop(tile),
      center.z + Math.sin(angle) * spread,
    );
    // Pieces face the camera-ish rather than a random direction: a toy soldier
    // pointing away from the viewer looks like a mistake, not a variation.
    quaternion.setFromAxisAngle(axis, -0.6 + hashSigned(unit.col, unit.row, 40) * 0.5);
    scale.set(1, 1, 1);
    collector.add(
      geometry.pieces[unit.type],
      [playerColor(unit.ownerId)],
      new Matrix4().compose(position, quaternion, scale),
    );
  }

  collector.flush(group, materials, shadows);

  const substrate = buildSubstrate(map, bounds);
  group.add(substrate);

  // Open on player 0's starting stack — the interesting part of any map.
  const focus = new Vector3(
    (bounds.minX + bounds.maxX) / 2,
    0,
    (bounds.minZ + bounds.maxZ) / 2,
  );
  const first = state.units.find((unit) => unit.ownerId === 0);
  if (first) {
    const tile = map.tiles[first.row * map.width + first.col];
    if (tile) {
      const center = tileCenter(tile);
      focus.set(center.x, 0, center.z);
    }
  }

  return {
    group,
    bounds,
    focus,
    tileCount: map.tiles.length,
    drawCalls: group.children.length,
    dispose(): void {
      // Geometry and toon materials are shared and owned elsewhere; only the
      // substrate's one-off pair and the instanced meshes themselves are ours.
      substrate.geometry.dispose();
      (substrate.material as MeshBasicMaterial).dispose();
      for (const child of group.children) {
        if (child instanceof InstancedMesh) child.dispose();
      }
      group.clear();
    },
  };
}
