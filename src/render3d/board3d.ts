/**
 * Turns a `GameMap` into a pile of `InstancedMesh`es: the terrain, its
 * decorations, and the substrate slab underneath.
 *
 * Adapted from the prototype's `src/proto3d/board.ts`. Two things changed on the
 * way in. The map is now baked three times side by side so the east–west wrap
 * works (see `instances.ts`), and units left: they change on every command and
 * belong to a layer that can be rebuilt on its own, not to a board that is built
 * once per map. Everything about the *look* is unchanged.
 *
 * Placement is a pure function of `(col, row)`
 * -------------------------------------------
 * Every jitter — yaw, height, tree position, tree size, which hills get rocks —
 * comes from `hashUnit(col, row, stream)`. Nothing rolls a die and nothing
 * remembers a previous frame, so rebuilding the board reproduces it exactly,
 * the three wrap copies are identical, and two tiles with the same terrain still
 * look different. Each kind of decoration draws from its own `stream`, so adding
 * rocks does not reshuffle forests.
 *
 * Uniform scale only
 * ------------------
 * Height jitter is applied as a *uniform* scale about each prism's base rather
 * than a y-only squash. It costs a matching ±3.5% of hex radius, which is
 * invisible under the tile gap and frankly helps — the tiles look hand-cut — and
 * it buys two things: the inverted-hull outline keeps a constant thickness (the
 * shell offset is multiplied by the instance matrix), and the base stays planted
 * on the floor plane instead of floating.
 */

import {
  BoxGeometry,
  BufferAttribute,
  type BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three';

import { type GameMap, type Tile, tileIndex } from '../sim/map';
import { hasRiverEdge, neighborInDirection } from '../sim/water';

import { hashDisc, hashSigned, hashUnit } from './hash';
import {
  bannerPole,
  barQuad,
  cityHouseBody,
  cityHouseRoof,
  hexDecal,
  hexPrism,
  hexRing,
  mountainPeak,
  pathDot,
  pineTree,
  riverSegment,
  rock,
  roundTree,
  scoutPiece,
  settlerPiece,
  spriteQuad,
  warriorPiece,
} from './geometry';
import { InstanceCollector, disposeInstancedGroup } from './instances';
import { VIEW3D, shade } from './lookData';
import {
  type HeightClass,
  boardBounds,
  cellCenter,
  directionDelta,
  edgeYaw,
  heightClassOf,
  tileScale,
  tileTopY,
  tileYaw,
  wrapWidth,
} from './layout';
import type { MaterialLibrary } from './toon';

const BOARD = VIEW3D.board;
const DECOR = VIEW3D.decor;
const OVERLAY = VIEW3D.overlay;
const CITY = VIEW3D.city;
const LENS = VIEW3D.lens;
const TABLE = VIEW3D.table;
const RIVERS = VIEW3D.rivers;
const SPRITE = VIEW3D.units.sprite;

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
  /** City shapes: the houses of the town and the pole its banner flies from. */
  readonly houseBody: BufferGeometry;
  readonly houseRoof: BufferGeometry;
  readonly pole: BufferGeometry;
  /** Overlay shapes: reachable tint, highlight ring, path chip, HP bar. */
  readonly decal: BufferGeometry;
  readonly ring: BufferGeometry;
  readonly dot: BufferGeometry;
  readonly bar: BufferGeometry;
  /** A fuller hexagon than `decal`, for the territory tint and the lens wash. */
  readonly territory: BufferGeometry;
  /** A yield pip: the path dot's little sibling. See `lens3d.ts`. */
  readonly pip: BufferGeometry;
  /** An upright unit quad standing on its base, for the sprite units. */
  readonly billboard: BufferGeometry;
  /** The blob shadow and the ownership ring a billboard stands in. */
  readonly blob: BufferGeometry;
  readonly baseRing: BufferGeometry;
  /** One river's worth of water, lying across one grout gap. */
  readonly river: BufferGeometry;

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
      warrior: warriorPiece(VIEW3D.piece.height),
      scout: scoutPiece(VIEW3D.piece.height),
      settler: settlerPiece(VIEW3D.piece.height),
    };
    this.houseBody = cityHouseBody(CITY.house);
    this.houseRoof = cityHouseRoof(CITY.house);
    this.pole = bannerPole(CITY.poleRadius, CITY.poleHeight);
    this.decal = hexDecal(BOARD.hexRadius * OVERLAY.reachableScale);
    this.territory = hexDecal(BOARD.hexRadius * VIEW3D.territory.tintScale);
    this.ring = hexRing(
      BOARD.hexRadius * OVERLAY.ringOuter,
      BOARD.hexRadius * OVERLAY.ringWidth,
    );
    this.dot = pathDot(OVERLAY.pathDotRadius, OVERLAY.pathDotHeight);
    this.pip = pathDot(LENS.pipRadius, LENS.pipHeight);
    this.river = riverSegment();
    this.bar = barQuad();
    // Sprite units. Built unconditionally rather than behind the style switch:
    // three small shared geometries cost nothing, and a board that had to be
    // rebuilt to flip an art-direction switch would not be trivially flippable.
    this.billboard = spriteQuad();
    this.blob = hexDecal(BOARD.hexRadius * SPRITE.shadowRadius);
    this.baseRing = hexRing(
      BOARD.hexRadius * SPRITE.ringOuter,
      BOARD.hexRadius * SPRITE.ringWidth,
    );
  }

  dispose(): void {
    for (const prism of Object.values(this.prisms)) prism.dispose();
    this.peak.dispose();
    this.pine.dispose();
    this.broadleaf.dispose();
    this.boulder.dispose();
    for (const piece of Object.values(this.pieces)) piece.dispose();
    this.houseBody.dispose();
    this.houseRoof.dispose();
    this.pole.dispose();
    this.decal.dispose();
    this.ring.dispose();
    this.dot.dispose();
    this.pip.dispose();
    this.river.dispose();
    this.bar.dispose();
    this.territory.dispose();
    this.billboard.dispose();
    this.blob.dispose();
    this.baseRing.dispose();
  }
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface BuiltBoard {
  group: Group;
  /** World-space extent of one copy of the board, for framing and clamping. */
  bounds: Bounds;
  /** Horizontal wrap period in world units. */
  wrapWidth: number;
  tileCount: number;
  /** Instances actually uploaded, wrap copies included. For the stats readout. */
  instanceCount: number;
  drawCalls: number;
  dispose(): void;
}

/**
 * The substrate: one slab under the whole board, in the darkest earth tone.
 *
 * It exists because the tiles are drawn under-sized. Without it you would look
 * straight down the gap between two same-height tiles and see sky, and the board
 * would read as a lattice rather than a solid object. With it, the gaps become
 * grout lines — which is most of what sells "pieces on a table".
 *
 * One slab spans all three wrap copies rather than three slabs meeting edge to
 * edge, because two abutting boxes leave a visible hairline exactly where the
 * seam must be invisible.
 */
function buildSubstrate(bounds: Bounds, period: number): Mesh {
  const pad = BOARD.hexRadius * BOARD.substratePad;
  const width = bounds.maxX - bounds.minX + pad * 2 + period * 2;
  const depth = bounds.maxZ - bounds.minZ + pad * 2;
  const top = BOARD.height.ocean - BOARD.substrateDrop;
  const height = top - (BOARD.floorY - 0.4);

  const geometry = new BoxGeometry(width, height, depth);
  geometry.translate(
    (bounds.minX + bounds.maxX) / 2,
    top - height / 2,
    (bounds.minZ + bounds.maxZ) / 2,
  );
  const material = new MeshBasicMaterial({
    color: new Color(shade(VIEW3D.palette.earth!, BOARD.substrateShade)),
    // The slab is seen from above through cracks and from the side at the map
    // edge; DoubleSide costs nothing here and avoids a hollow-looking rim.
    side: DoubleSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * The chart-table: the surface the whole board is lying on.
 *
 * One unlit plane under the substrate, wider than the three wrap copies and
 * running far past the poles, shaded by *vertex colour* from the lit vellum in
 * the middle to a deeper tone at the far edges. That is the whole vignette: no
 * texture, no image, no shader, no second render pass — a strip of quads whose
 * corners carry a colour, built once with the board and never touched again.
 *
 * Why a plane and not just a darker clear colour: a flat backdrop is a void, and
 * the board floats in it. A surface that is *lighter under the board than at the
 * edges of the room* reads as a lit table, and the diorama sits on it.
 *
 * The fall-off is measured in z only. Rows do not wrap but columns do — the
 * board is a cylinder and the camera wraps with it — so darkening by distance
 * in x would put a shadow on one side of a seam that has no sides. z is also
 * where the void actually is: past the poles, which is the only direction you
 * can look off the edge of the world.
 *
 * See `TableSpec` for what this surface becomes when fog of war arrives.
 */
function buildTable(bounds: Bounds, period: number): Mesh {
  const pad = BOARD.hexRadius * BOARD.substratePad;
  const width = bounds.maxX - bounds.minX + pad * 2 + period * 2;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const halfDepth = (bounds.maxZ - bounds.minZ) / 2 + BOARD.hexRadius * TABLE.edgePad;
  const depth = (halfDepth + TABLE.reach) * 2;

  // One segment per two world units of depth: enough that the gradient is
  // smooth under an orthographic camera, cheap enough to be a rounding error
  // (a few hundred vertices against the board's tens of thousands).
  const segments = Math.max(8, Math.round(depth / 2));
  const geometry = new PlaneGeometry(width, depth, 1, segments);
  // `PlaneGeometry` stands up in xy; lay it down, then move it under the board.
  geometry.rotateX(-Math.PI / 2);
  // Just below the substrate's own underside, so the slab keeps a visible edge
  // sitting on the table rather than being coplanar with it.
  geometry.translate(centerX, BOARD.floorY - 0.45, centerZ);

  const lit = new Color(TABLE.color);
  const dim = new Color(TABLE.edgeColor);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const mixed = new Color();
  for (let i = 0; i < position.count; i++) {
    const over = Math.abs(position.getZ(i) - centerZ) - halfDepth;
    const t = Math.max(0, Math.min(1, over / TABLE.edgeFalloff));
    // Smoothstep: a linear ramp on a surface this large shows its own start and
    // end as two faint bands, and the eye finds both.
    mixed.copy(lit).lerp(dim, t * t * (3 - 2 * t));
    colors[i * 3] = mixed.r;
    colors[i * 3 + 1] = mixed.g;
    colors[i * 3 + 2] = mixed.b;
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));

  // Unlit, like the substrate: the gradient *is* its shading, and running it
  // through the toon ramp would band it into three flat steps.
  const material = new MeshBasicMaterial({ vertexColors: true });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  // Under everything: it must never take a pixel from the board it carries.
  mesh.renderOrder = -1;
  return mesh;
}

/**
 * Every river on the map, as one flat ribbon per flagged edge.
 *
 * Each edge is flagged on *both* the tiles that share it (see the `map.ts`
 * docblock), so a naive sweep would draw every segment twice. Only directions
 * 0–2 — east, south-east, south-west — are emitted; the other three are the same
 * edges seen from the far side and are covered by their own tile's first half.
 * That is exact rather than approximate, because `HEX_DIRECTIONS[d + 3]` is
 * `-HEX_DIRECTIONS[d]`.
 *
 * The ribbon lies `rivers.drop` below the *lower* of the two tiles' top faces,
 * which is what puts it in the grout instead of on it: everything outside the
 * gap is inside one prism or the other and the depth buffer hides it. Taking the
 * lower of the two matters where a river runs along the foot of a hill — anchored
 * to the higher tile it would hang in mid-air over the lower one.
 *
 * Nothing is animated and nothing is hashed: the geometry is a pure function of
 * the map, baked once with the board and replicated across the wrap like
 * everything else.
 */
function addRivers(
  map: GameMap,
  geometry: BoardGeometry,
  collector: InstanceCollector,
): void {
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const axis = new Vector3(0, 1, 0);

  // A hexagon's side equals its circumradius, so the shared edge is exactly one
  // hex radius long before the overhang that closes the corners.
  const length = BOARD.hexRadius * RIVERS.overhang;
  const width = BOARD.hexRadius * RIVERS.width;

  for (const tile of map.tiles) {
    for (let direction = 0; direction < 3; direction++) {
      if (!hasRiverEdge(tile, direction)) continue;
      const neighbor = neighborInDirection(map, tile, direction);
      if (!neighbor) continue;

      const center = cellCenter(tile.col, tile.row);
      const delta = directionDelta(direction);
      const y = Math.min(tileTopY(tile), tileTopY(neighbor)) - RIVERS.drop;
      position.set(center.x + delta.x / 2, y, center.z + delta.z / 2);
      quaternion.setFromAxisAngle(axis, edgeYaw(direction));
      scale.set(length, 1, width);
      collector.add(
        geometry.river,
        [RIVERS.color],
        new Matrix4().compose(position, quaternion, scale),
        // No inverted hull: a dark rim around a line this thin would swallow it,
        // and the grout it sits in is already the outline.
        { outlined: false },
      );
    }
  }
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
    for (let i = 0; i < count; i++) place(geometry.pine, VIEW3D.featureColor.forest, 2, i, 1);
  } else if (tile.feature === 'jungle') {
    const count = 2 + Math.floor(hashUnit(tile.col, tile.row, 21) * 2);
    for (let i = 0; i < count; i++) {
      place(geometry.broadleaf, VIEW3D.featureColor.jungle, 3, i, 1.1);
    }
  }

  // Rocks scatter on bare hills only: a forested hill already has silhouette,
  // and piling boulders under the trees just made mud.
  if (tile.hills && tile.feature === 'none' && tile.terrain !== 'mountain') {
    if (hashUnit(tile.col, tile.row, 30) < 0.55) {
      const count = 1 + Math.floor(hashUnit(tile.col, tile.row, 31) * 2);
      for (let i = 0; i < count; i++) place(geometry.boulder, VIEW3D.palette.slate!, 4, i, 1);
    }
  }
}

/**
 * Bakes a map into instance buffers.
 *
 * `cityCells` is the set of tile indices that hold a city, and the only thing
 * it does is suppress that tile's trees and boulders — a settlement clears the
 * ground it stands on. Without it the forest a city was founded in grows
 * straight through the town, and since the houses are the size of the
 * population, that would hide the one thing on the board that shows a city
 * growing.
 *
 * It is a parameter rather than a lookup into the state because the board is
 * built from the *map*, and the map is generation output that knows nothing
 * about who lives on it. The renderer fingerprints the set and rebuilds when it
 * changes, which is rare — founding a city, and nothing else.
 */
export function buildBoard(
  map: GameMap,
  geometry: BoardGeometry,
  materials: MaterialLibrary,
  shadows: boolean,
  cityCells: ReadonlySet<number> = new Set(),
): BuiltBoard {
  const group = new Group();
  const period = wrapWidth(map);
  const collector = new InstanceCollector({ copyOffsets: [-period, 0, period] });

  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const axis = new Vector3(0, 1, 0);

  for (const tile of map.tiles) {
    const center = cellCenter(tile.col, tile.row);

    const kind = heightClassOf(tile);
    const s = tileScale(tile);
    position.set(center.x, BOARD.floorY, center.z);
    quaternion.setFromAxisAngle(axis, tileYaw(tile));
    scale.set(s, s, s);
    // Water is not outlined. An inverted hull on a low prism in a field of
    // identical low prisms draws a dark ring around every single one, and the
    // ocean turns into graph paper; the two blues carry the read instead.
    const water = kind === 'ocean' || kind === 'coast';
    const topColor = VIEW3D.terrainColor[tile.terrain];
    // side / top cap / bottom cap. The bottom is never seen, but the group
    // exists and must be given something.
    const side = shade(topColor, VIEW3D.sideDarken);
    collector.add(
      geometry.prisms[kind],
      [side, topColor, side],
      new Matrix4().compose(position, quaternion, scale),
      { outlined: !water },
    );

    const top = tileTopY(tile);
    if (tile.terrain === 'mountain') {
      const peakYaw = hashUnit(tile.col, tile.row, 13) * Math.PI * 2;
      const peakScale = 0.86 + hashUnit(tile.col, tile.row, 14) * 0.4;
      position.set(center.x, top - 0.05, center.z);
      quaternion.setFromAxisAngle(axis, peakYaw);
      scale.set(peakScale, peakScale, peakScale);
      collector.add(
        geometry.peak,
        [shade(VIEW3D.palette.slate!, 0.08)],
        new Matrix4().compose(position, quaternion, scale),
      );
    } else if (!cityCells.has(tileIndex(map, tile.col, tile.row))) {
      addDecorations(tile, top, center, geometry, collector);
    }
  }

  addRivers(map, geometry, collector);

  const bounds = boardBounds(map);
  let drawCalls = collector.flush(group, materials, shadows);
  let instanceCount = 0;
  for (const child of group.children) {
    const count = (child as { count?: number }).count;
    if (typeof count === 'number') instanceCount += count;
  }

  const substrate = buildSubstrate(bounds, period);
  group.add(substrate);
  drawCalls++;

  const table = buildTable(bounds, period);
  group.add(table);
  drawCalls++;

  return {
    group,
    bounds,
    wrapWidth: period,
    tileCount: map.tiles.length,
    instanceCount,
    drawCalls,
    dispose(): void {
      // Geometry and toon materials are shared and owned elsewhere; only the
      // one-off pairs (the substrate and the table) and the instanced meshes
      // themselves are ours.
      substrate.geometry.dispose();
      (substrate.material as MeshBasicMaterial).dispose();
      table.geometry.dispose();
      (table.material as MeshBasicMaterial).dispose();
      disposeInstancedGroup(group);
    },
  };
}
