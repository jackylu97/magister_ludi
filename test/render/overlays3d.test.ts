import { describe, expect, it } from 'vitest';
import {
  InstancedMesh,
  type BufferGeometry,
  type Material,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
} from 'three';

import type { TileIcons } from '../../src/render3d/badges3d';
import { BoardGeometry } from '../../src/render3d/board3d';
import {
  TerritoryLayer,
  borderBandMatrix,
  borderCornerMatrix,
} from '../../src/render3d/cities3d';
import { RENDER_ORDER } from '../../src/render3d/instances';
import { cellCenter, directionDelta, tileScale, tileTopY } from '../../src/render3d/layout';
import { LensLayer } from '../../src/render3d/lens3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { OverlayLayer } from '../../src/render3d/overlays';
import { MaterialLibrary } from '../../src/render3d/toon';
import { foundCityAt } from '../../src/sim/cities';
import {
  createMap,
  getTileAt,
  tileHex,
  tileIndex,
  wrappedDistance,
  type Tile,
} from '../../src/sim/map';
import {
  type ResourceDef,
  type ResourceId,
  withExtraResources,
} from '../../src/sim/resourceData';
import { RULES } from '../../src/sim/rulesData';
import { type GameState, newGame } from '../../src/sim/state';
import { DIRECTION_COUNT, computeFreshwater, neighborInDirection } from '../../src/sim/water';
import { resetVisibility } from '../../src/sim/visibility';
import type { LensView } from '../../src/ui/mapView';

/**
 * How many copies of every instance the board keeps for the horizontal wrap: one
 * a world to the west, one where the tile is, one a world to the east. Named
 * because every instance count in this file is a multiple of it.
 */
const WRAP_COPIES = 3;

/**
 * The fraction of the ideal hex a prism's top face actually covers: a `tileGap`
 * narrower so the grout shows, times the tile's own hashed size jitter. The band
 * arithmetic has to agree with both or a border lies in the gutter.
 */
function faceFraction(tile: Tile): number {
  return (1 - VIEW3D.board.tileGap) * tileScale(tile);
}

/**
 * A two-player state on a flat grassland rectangle, with fresh water recomputed
 * so `tile.freshwater` is real data rather than whatever `newGame` left.
 */
function flatState(width = 12, height = 8): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  // The board was replaced under this state; the fog grids were sized for the
  // old one. See `resetVisibility`.
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  computeFreshwater(state.map);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** Every instanced mesh in a layer group, paired with its single material. */
function decals(group: { children: unknown[] }): { mesh: InstancedMesh; material: MeshBasicMaterial }[] {
  const out: { mesh: InstancedMesh; material: MeshBasicMaterial }[] = [];
  for (const child of group.children) {
    if (!(child instanceof InstancedMesh)) continue;
    const material = child.material as Material;
    if (Array.isArray(material)) continue;
    out.push({ mesh: child, material: material as MeshBasicMaterial });
  }
  return out;
}

/** The colours a layer painted, as hex, ignoring how many instances of each. */
function colorsOf(group: { children: unknown[] }): number[] {
  return decals(group).map((entry) => entry.material.color.getHex());
}

function lensView(overrides: Partial<LensView> = {}): LensView {
  return {
    mode: 'none',
    cells: null,
    resources: false,
    resourceCells: null,
    yields: false,
    yieldCells: null,
    playerId: 0,
    ...overrides,
  };
}

/**
 * A stand-in for the tile-icon atlas.
 *
 * The real one rasterises twenty-five SVGs into a canvas, which needs a DOM the
 * simulation tests do not have — and the lens layer only ever asks it for one
 * thing, the material every flat mark is drawn with. So the tests hand over a
 * material with the two properties that *are* the feature (no depth test, no
 * depth write) and assert the layer's arithmetic around it. Which mark is which
 * is then a question about geometry, not about colour: every glyph shares one
 * material and is told apart by its cell of the atlas.
 */
const fakeIcons = {
  material: new MeshBasicMaterial({ depthTest: false, depthWrite: false }),
  // The standing half of the same atlas: the resource markers, which are
  // depth-tested world objects. See `test/resources3d.test.ts` for what is
  // asserted about them; nothing in this file draws one.
  standingMaterial: new MeshBasicMaterial(),
} as unknown as TileIcons;

/** The fixed camera's rotation, which every standing marker is turned by. */
const faceCamera = new Quaternion();

/** The geometries a layer drew, ignoring how many instances of each. */
function shapesOf(group: { children: unknown[] }): BufferGeometry[] {
  return decals(group).map((entry) => entry.mesh.geometry);
}

/**
 * The whole point of the `onTop` decal kind: it is the interface talking, and
 * nothing on the board — a pine tree, a mountain cone, a piece — may occlude it.
 * That is expressed as `depthTest: false` on a mesh drawn after everything else,
 * so these two properties *are* the feature.
 */
function expectDrawnOverTheBoard(
  group: { children: unknown[] },
  order: number = RENDER_ORDER.onTop,
): void {
  const drawn = decals(group);
  expect(drawn.length).toBeGreaterThan(0);
  for (const { mesh, material } of drawn) {
    expect(material.depthTest).toBe(false);
    expect(material.depthWrite).toBe(false);
    // The layer, named rather than written out: the flat tile icons and the
    // badges now sit one and two steps above the interface's own decals (see
    // `RENDER_ORDER`), and the numbers only stay consistent while every test
    // reads them off the one list.
    expect(mesh.renderOrder).toBe(order);
  }
}

describe('board overlays draw over the board', () => {
  const geometry = new BoardGeometry();
  const materials = new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);

  it('draws yield glyphs on a forested tile, above the trees standing on it', () => {
    const state = flatState();
    // The reported bug: the marks on a forest tile were behind its pine trees.
    at(state, 4, 4).feature = 'forest';

    const layer = new LensLayer();
    layer.build(
      state,
      lensView({ yields: true, yieldCells: [{ col: 4, row: 4 }] }),
      geometry,
      materials,
      fakeIcons,
      faceCamera,
    );

    // Grassland forest yields 1 food and 1 production: one sheaf and one hammer,
    // three wrap copies each.
    const shapes = shapesOf(layer.group);
    expect(shapes).toContain(geometry.yieldGlyphs.food);
    expect(shapes).toContain(geometry.yieldGlyphs.production);
    expect(shapes).not.toContain(geometry.yieldGlyphs.gold);
    for (const { mesh } of decals(layer.group)) expect(mesh.count).toBe(3);
    // A yield glyph is a readout printed on the face, one step above the washes
    // the interface prints there — `test/render/lens3d.test.ts` holds the rest
    // of that argument, including the pass the order lives in.
    expectDrawnOverTheBoard(layer.group, RENDER_ORDER.tileIcon);
    layer.dispose();
  });

  it('draws nothing at all until the icon atlas has arrived', () => {
    const state = flatState();
    const layer = new LensLayer();
    // The atlas rasterises in the background; a board asked for yields before it
    // lands shows the plain board rather than a field of blanks.
    layer.build(
      state,
      lensView({ yields: true, yieldCells: [{ col: 4, row: 4 }] }),
      geometry,
      materials,
      null,
      faceCamera,
    );
    expect(decals(layer.group)).toHaveLength(0);
    layer.dispose();
  });

  it('draws every interaction decal over the board too', () => {
    const state = flatState();
    const layer = new OverlayLayer();
    layer.build(
      state.map,
      {
        reachable: [{ col: 1, row: 1 }],
        attackable: [{ col: 7, row: 1 }],
        path: [{ col: 2, row: 1 }],
        committed: [{ col: 3, row: 1 }],
        hover: { col: 4, row: 1 },
        selection: { col: 5, row: 1 },
        worked: [{ col: 6, row: 1 }],
        locked: [{ col: 6, row: 1 }],
      },
      geometry,
      materials,
    );
    expectDrawnOverTheBoard(layer.group);
    layer.dispose();
  });

  /**
   * The reachable set is a wash *and* a rim, and the rim is the load-bearing
   * half.
   *
   * A wash on its own has no edge — over mixed terrain its boundary is wherever
   * the eye decides the tint stopped — which is what "too subtle" meant (user,
   * 2026-08-27). What is held still here is the pair: both marks on every
   * reachable hex, in two different inks, and the rim brighter and more opaque
   * than the wash it edges. The last clause is the one a well-meaning tune-down
   * would break, and it would break it invisibly.
   */
  it('rims every reachable hex as well as washing it, and rims it brighter', () => {
    const state = flatState();
    const layer = new OverlayLayer();
    const cells = [
      { col: 2, row: 2 },
      { col: 3, row: 2 },
      { col: 4, row: 2 },
    ];
    layer.build(
      state.map,
      {
        reachable: cells,
        path: [],
        committed: [],
        hover: null,
        selection: null,
        worked: [],
        locked: [],
      },
      geometry,
      materials,
    );

    const drawn = decals(layer.group);
    const wash = drawn.find((entry) => entry.mesh.geometry === geometry.decal);
    const rim = drawn.find((entry) => entry.mesh.geometry === geometry.reachRing);
    expect(wash, 'the reachable wash').toBeDefined();
    expect(rim, 'the reachable rim').toBeDefined();
    // One instance of each per hex, times the three wrap copies — and one bucket
    // apiece, because both are keyed on a single colour.
    expect(wash!.mesh.count).toBe(cells.length * 3);
    expect(rim!.mesh.count).toBe(cells.length * 3);
    expect(rim!.material.color.getHex()).toBe(VIEW3D.overlay.reachableRimColor);
    expect(rim!.material.opacity).toBeGreaterThan(wash!.material.opacity);
    expectDrawnOverTheBoard(layer.group);
    layer.dispose();
  });

  it('keeps the reachable rim inside the selection ring rather than on top of it', () => {
    // A hex that is both reachable and hovered wears two concentric marks. At
    // the same radius they would be one smudge fighting for the same pixels,
    // and the ring — which answers "where is the cursor" — would be the one
    // that lost, because it is drawn first.
    expect(VIEW3D.overlay.reachableRimOuter).toBeLessThan(VIEW3D.overlay.ringOuter);
    // And a band a player can actually see: thinner than the selection ring's,
    // which is the difference between "this is the piece" and "this is ground".
    expect(VIEW3D.overlay.reachableRimWidth).toBeGreaterThan(0);
    expect(VIEW3D.overlay.reachableRimWidth).toBeLessThan(VIEW3D.overlay.ringWidth);
    // The wash reaches the rim it is edged by, so no ring of bare board shows
    // between the two.
    expect(VIEW3D.overlay.reachableScale).toBeGreaterThanOrEqual(
      VIEW3D.overlay.reachableRimOuter,
    );
  });

  it('tints attackable tiles in their own colour, over the reachable wash', () => {
    const state = flatState();
    const layer = new OverlayLayer();
    // A tile that is *both* walkable and defended: the two sets overlap all the
    // time, and the fight has to be the thing that reads.
    layer.build(
      state.map,
      {
        reachable: [{ col: 2, row: 2 }],
        attackable: [{ col: 2, row: 2 }],
        path: [],
        committed: [],
        hover: null,
        selection: null,
        worked: [],
        locked: [],
      },
      geometry,
      materials,
    );

    const colors = colorsOf(layer.group);
    expect(colors).toContain(VIEW3D.overlay.attackColor);
    expect(colors).toContain(VIEW3D.overlay.reachableColor);
    expectDrawnOverTheBoard(layer.group);
    layer.dispose();
  });

  it('draws no attack tint when nothing is attackable', () => {
    const state = flatState();
    const layer = new OverlayLayer();
    layer.build(
      state.map,
      {
        reachable: [{ col: 2, row: 2 }],
        path: [],
        committed: [],
        hover: null,
        selection: null,
        worked: [],
        locked: [],
      },
      geometry,
      materials,
    );
    // The field is optional, so a caller with nothing to say about combat says
    // nothing and gets nothing.
    expect(colorsOf(layer.group)).not.toContain(VIEW3D.overlay.attackColor);
    layer.dispose();
  });

  /**
   * The settler lens's hover preview lives in *this* layer and not in the lens,
   * because it changes on every mouse move and the lens is a few thousand
   * instances rebuilt only when the lens itself changes. So what is pinned here
   * is that the overlay draws it at all, in an ink of its own, and that a caller
   * with nothing to preview draws nothing — the arithmetic of *which* cells is
   * the UI's (`siteRadiusCells` in `controls.ts`), asked of `mapRange`.
   */
  it('previews a prospective city’s work radius in an ink of its own', () => {
    const state = flatState();
    const layer = new OverlayLayer();
    const radius = [
      { col: 4, row: 4 },
      { col: 5, row: 4 },
      { col: 4, row: 5 },
    ];
    layer.build(
      state.map,
      {
        reachable: [],
        path: [],
        committed: [],
        hover: { col: 4, row: 4 },
        selection: null,
        worked: [],
        locked: [],
        siteRadius: radius,
      },
      geometry,
      materials,
    );

    const colors = colorsOf(layer.group);
    expect(colors).toContain(VIEW3D.overlay.siteRadiusColor);
    // Distinct from every other mark this layer draws, or the preview would read
    // as reachable ground or as a selection.
    expect(VIEW3D.overlay.siteRadiusColor).not.toBe(VIEW3D.overlay.reachableColor);
    expect(VIEW3D.overlay.siteRadiusColor).not.toBe(VIEW3D.overlay.selectionColor);
    expect(VIEW3D.overlay.siteRadiusColor).not.toBe(VIEW3D.overlay.hoverColor);
    // One chip per cell, times the wrap copies, and inset from the hex so a
    // preview under the reachable wash still reads as chips.
    const chips = decals(layer.group).filter(
      ({ material }) => material.color.getHex() === VIEW3D.overlay.siteRadiusColor,
    );
    expect(chips).toHaveLength(1);
    expect(chips[0]!.mesh.count).toBe(radius.length * WRAP_COPIES);
    expect(VIEW3D.overlay.siteRadiusScale).toBeLessThan(1);
    expectDrawnOverTheBoard(layer.group);
    layer.dispose();
  });

  it('draws no radius preview when the settler lens is down', () => {
    const state = flatState();
    const layer = new OverlayLayer();
    layer.build(
      state.map,
      {
        reachable: [{ col: 2, row: 2 }],
        path: [],
        committed: [],
        hover: null,
        selection: null,
        worked: [],
        locked: [],
      },
      geometry,
      materials,
    );
    // Optional like `attackable`: the UI hands over an empty list — or nothing
    // at all — whenever the lens is not up, and no chip is drawn.
    expect(colorsOf(layer.group)).not.toContain(VIEW3D.overlay.siteRadiusColor);
    layer.dispose();
  });

  /**
   * Every band instance a territory layer drew, across every wrap copy.
   *
   * The bands are the *only* thing sharing `geometry.borderBand`, so counting
   * that geometry's buckets counts borders and nothing else — the tint is a
   * hexagon and a worked-tile ring is a ring.
   */
  function bandCount(group: { children: unknown[] }, geo: BoardGeometry): number {
    let total = 0;
    for (const { mesh } of decals(group)) {
      if (mesh.geometry === geo.borderBand) total += mesh.count;
    }
    return total;
  }

  /** Every band's world position, wrap copies collapsed to the middle one. */
  function bandCentres(group: { children: unknown[] }, geo: BoardGeometry): Vector3[] {
    const out: Vector3[] = [];
    const matrix = new Matrix4();
    for (const { mesh } of decals(group)) {
      if (mesh.geometry !== geo.borderBand) continue;
      // Three copies of every band, at −period, 0 and +period; the middle one is
      // the tile where it actually stands. See `InstanceCollector.copyOffsets`.
      for (let i = 1; i < mesh.count; i += WRAP_COPIES) {
        mesh.getMatrixAt(i, matrix);
        out.push(new Vector3().setFromMatrixPosition(matrix));
      }
    }
    return out;
  }

  /** How many edges of this player's territory face somebody else's ground. */
  function ownershipEdges(state: GameState, playerId: number): number {
    const owner = new Map<number, number>();
    for (const city of state.cities) owner.set(city.id, city.ownerId);
    let edges = 0;
    for (let index = 0; index < state.tileOwner.length; index++) {
      const cityId = state.tileOwner[index];
      if (cityId === null || cityId === undefined) continue;
      if (owner.get(cityId) !== playerId) continue;
      const tile = state.map.tiles[index]!;
      for (let d = 0; d < DIRECTION_COUNT; d++) {
        const neighbour = neighborInDirection(state.map, tile, d);
        const other = neighbour
          ? state.tileOwner[tileIndex(state.map, neighbour.col, neighbour.row)]
          : null;
        const otherPlayer = other === null || other === undefined ? undefined : owner.get(other);
        if (otherPlayer !== playerId) edges += 1;
      }
    }
    return edges;
  }

  it('draws a band on exactly the edges where ownership changes, and none inside', () => {
    const state = flatState();
    foundCityAt(state, 0, at(state, 5, 4));

    const layer = new TerritoryLayer();
    layer.build(state, geometry, materials);

    // The interior is silent: a claim of N tiles has far fewer boundary edges
    // than 6N, and the difference is every edge between two of this player's own
    // hexes — the ones that used to be painted and are now nothing at all.
    const edges = ownershipEdges(state, 0);
    expect(edges).toBeGreaterThan(0);
    expect(edges).toBeLessThan(6 * state.tileOwner.filter((id) => id !== null).length);
    expect(bandCount(layer.group, geometry)).toBe(edges * WRAP_COPIES);
    layer.dispose();
  });

  it('has both sides draw their own half of a contested edge', () => {
    const state = flatState();
    // Two capitals three hexes apart: their first rings do not overlap, but the
    // tiles between them will be claimed by one or the other.
    foundCityAt(state, 0, at(state, 4, 4));
    foundCityAt(state, 1, at(state, 6, 4));

    // A tile of A's, with a tile of B's next door: the frontier, by hand, so the
    // test does not depend on how far a new city's first claim reaches.
    const mine = at(state, 5, 4);
    const theirs = at(state, 6, 4);
    state.tileOwner[tileIndex(state.map, mine.col, mine.row)] = state.cities[0]!.id;
    state.tileOwner[tileIndex(state.map, theirs.col, theirs.row)] = state.cities[1]!.id;

    const layer = new TerritoryLayer();
    layer.build(state, geometry, materials);

    // Two inks on the board, and both of them drew bands.
    const inks = new Set(
      decals(layer.group)
        .filter(({ mesh }) => mesh.geometry === geometry.borderBand)
        .map(({ material }) => material.color.getHex()),
    );
    expect(inks.size).toBe(2);

    // The shared edge is drawn twice, once from each side, and the two bands sit
    // on opposite sides of the edge itself — each inside its own hex, meeting in
    // the middle. Anything else is one nation's paint on another's ground.
    const edge = 0;
    const ours = new Vector3().setFromMatrixPosition(borderBandMatrix(mine, edge));
    const centre = cellCenter(mine.col, mine.row);
    const seam = {
      x: centre.x + directionDelta(edge).x / 2,
      z: centre.z + directionDelta(edge).z / 2,
    };
    expect(Math.hypot(ours.x - centre.x, ours.z - centre.z)).toBeLessThan(
      Math.hypot(seam.x - centre.x, seam.z - centre.z),
    );
    // And it really is drawn there: the layer's own band centres include ours.
    const drawn = bandCentres(layer.group, geometry);
    expect(
      drawn.some((at) => Math.hypot(at.x - ours.x, at.z - ours.z) < 1e-6),
    ).toBe(true);
    layer.dispose();
  });

  it('lays every band flat on its own tile, inside the prism it belongs to', () => {
    const state = flatState();
    const tile = at(state, 5, 4);
    const centre = cellCenter(tile.col, tile.row);
    const apothem =
      (Math.hypot(directionDelta(0).x, directionDelta(0).z) / 2) * faceFraction(tile);

    for (let d = 0; d < DIRECTION_COUNT; d++) {
      const at3 = new Vector3().setFromMatrixPosition(borderBandMatrix(tile, d));
      // On the tile's own face, lifted by the shared overlay lift — the same
      // height the tint sits at, so a border cannot float over its own ground.
      expect(at3.y).toBeCloseTo(tileTopY(tile) + VIEW3D.overlay.lift, 10);
      // Inside the hex: pulled back from the seam by half the band's width, so
      // the neighbour's own half has room on the far side.
      const reach = Math.hypot(at3.x - centre.x, at3.z - centre.z);
      expect(reach).toBeCloseTo(
        apothem - (VIEW3D.board.hexRadius * VIEW3D.territory.borderWidth) / 2,
        10,
      );
    }
  });

  /** How many mitre pieces a layer put down, wrap copies included. */
  function cornerCount(group: { children: unknown[] }, geo: BoardGeometry): number {
    let total = 0;
    for (const { mesh } of decals(group)) {
      if (mesh.geometry === geo.borderCorner) total += mesh.count;
    }
    return total;
  }

  /**
   * A territory of exactly the named tiles, claimed for player 0.
   *
   * By hand rather than by founding cities: these tests are about the *shape* of
   * an outline — a lone hex, a domino — and a city's first ring is whatever the
   * rules say it is.
   */
  function claim(state: GameState, cells: readonly Tile[]): void {
    foundCityAt(state, 0, at(state, 9, 6));
    state.tileOwner.fill(null);
    for (const cell of cells) {
      state.tileOwner[tileIndex(state.map, cell.col, cell.row)] = state.cities[0]!.id;
    }
  }

  /**
   * One band's four corners in world space, as the pair of ends and the pair of
   * lips: local +x runs along the edge toward the corner shared with
   * `direction + 1`, local +z points inward, into the tile.
   */
  function bandCorners(matrix: Matrix4): {
    outerAhead: Vector3;
    innerAhead: Vector3;
    outerBehind: Vector3;
    innerBehind: Vector3;
    length: number;
  } {
    const position = new Vector3();
    const rotation = new Quaternion();
    const scale = new Vector3();
    matrix.decompose(position, rotation, scale);
    const along = new Vector3(1, 0, 0).applyQuaternion(rotation).multiplyScalar(scale.x / 2);
    const across = new Vector3(0, 0, 1).applyQuaternion(rotation).multiplyScalar(scale.z / 2);
    return {
      outerAhead: position.clone().add(along).sub(across),
      innerAhead: position.clone().add(along).add(across),
      outerBehind: position.clone().sub(along).sub(across),
      innerBehind: position.clone().sub(along).add(across),
      length: scale.x,
    };
  }

  /**
   * How close two of these points have to be to be the same point.
   *
   * Loose by the standards of the rest of this file because one side of every
   * comparison has been through a `Float32Array`: the mitre's corners are
   * *vertices*, and a buffer attribute is single precision, so the arithmetic
   * agrees to about a part in 10^9 and no further.
   */
  const SAME_POINT = 1e-6;

  /** The mitre's own four points, in world space, deduplicated. */
  function cornerPoints(geo: BoardGeometry, matrix: Matrix4): Vector3[] {
    const attribute = geo.borderCorner.getAttribute('position');
    const out: Vector3[] = [];
    for (let i = 0; i < attribute.count; i++) {
      const point = new Vector3(
        attribute.getX(i),
        attribute.getY(i),
        attribute.getZ(i),
      ).applyMatrix4(matrix);
      if (!out.some((seen) => seen.distanceTo(point) < SAME_POINT)) out.push(point);
    }
    return out;
  }

  function hasPoint(points: readonly Vector3[], wanted: Vector3): boolean {
    return points.some((point) => point.distanceTo(wanted) < SAME_POINT);
  }

  it('mitres every corner a border turns, and none it runs straight through', () => {
    const state = flatState();
    const lone = at(state, 3, 3);
    claim(state, [lone]);

    const layer = new TerritoryLayer();
    layer.build(state, geometry, materials);

    // A country of one hex: all six edges face the world, so the line turns at
    // all six of its vertices.
    expect(bandCount(layer.group, geometry)).toBe(6 * WRAP_COPIES);
    expect(cornerCount(layer.group, geometry)).toBe(6 * WRAP_COPIES);
    layer.dispose();

    // A domino. Each hex now has one *interior* edge, and the two vertices at
    // either end of it are where the outline passes from one tile to the other —
    // the line carries on there through the neighbour's own band, so neither
    // tile turns and neither draws a mitre. Four turns each, eight in all, which
    // is exactly the corner set of the domino's outline.
    const partner = neighborInDirection(state.map, lone, 0)!;
    claim(state, [lone, partner]);
    const both = new TerritoryLayer();
    both.build(state, geometry, materials);
    expect(bandCount(both.group, geometry)).toBe(10 * WRAP_COPIES);
    expect(cornerCount(both.group, geometry)).toBe(8 * WRAP_COPIES);
    both.dispose();
  });

  it('stops a turning band inside its own hex, and runs a straight one to the corner', () => {
    const tile = at(flatState(), 3, 3);
    const side = VIEW3D.board.hexRadius * faceFraction(tile);
    const turns = [true, true, true, true, true, true];

    for (let d = 0; d < DIRECTION_COUNT; d++) {
      // Both ends turning: the band must end short of its own face's corners.
      // The bug this replaced ran every band *past* them, which is what left a
      // pair of spurs sticking out of the hexagon at every vertex of a border.
      expect(bandCorners(borderBandMatrix(tile, d, turns)).length).toBeLessThan(side);
      // Neither end turning: the line carries on into the next tile of the same
      // country, so the band runs the full side of the *ideal* hex — reaching
      // the vertex it shares with that tile rather than the corner of its own
      // shrunken face, which is what keeps the line from going dashed once per
      // tile across the grout.
      expect(bandCorners(borderBandMatrix(tile, d)).length).toBeCloseTo(
        VIEW3D.board.hexRadius,
        12,
      );
    }
  });

  it('tiles the joint: the mitre meets both bands lip to lip, and nothing twice', () => {
    const tile = at(flatState(), 3, 3);
    const turns = [true, true, true, true, true, true];

    for (let corner = 0; corner < DIRECTION_COUNT; corner++) {
      const ahead = bandCorners(borderBandMatrix(tile, corner, turns));
      const behind = bandCorners(
        borderBandMatrix(tile, (corner + 1) % DIRECTION_COUNT, turns),
      );
      // The two bands' inner end caps already meet, at the point one band-width
      // in from both edges. That is the mitre apex, and it is why the corner
      // piece can be a tiling rather than a patch laid over the top: at less
      // than full opacity an overlap would print a dark notch at exactly the
      // vertex a player reads to see where their ground stops.
      // Both sides of *this* one are matrix arithmetic, so it holds to double
      // precision: the two bands genuinely end on the same point.
      expect(ahead.innerAhead.distanceTo(behind.innerBehind)).toBeLessThan(1e-12);

      const points = cornerPoints(geometry, borderCornerMatrix(tile, corner));
      expect(points).toHaveLength(4);
      // …and the piece is bounded by that apex, the two bands' outer end caps,
      // and the hex vertex itself: it fills the turn and claims nothing else.
      expect(hasPoint(points, ahead.innerAhead)).toBe(true);
      expect(hasPoint(points, ahead.outerAhead)).toBe(true);
      expect(hasPoint(points, behind.outerBehind)).toBe(true);
    }
  });

  it('winds the mitre the way a band is wound, or it is a hole', () => {
    // Counter-clockwise seen from +y, exactly as `riverSegment` is: the border
    // ink is drawn FrontSide, so a flipped kite is an invisible one — and an
    // invisible mitre looks precisely like the notch it was added to close.
    const attribute = geometry.borderCorner.getAttribute('position');
    expect(attribute.count % 3).toBe(0);
    for (let i = 0; i < attribute.count; i += 3) {
      const ax = attribute.getX(i + 1) - attribute.getX(i);
      const az = attribute.getZ(i + 1) - attribute.getZ(i);
      const bx = attribute.getX(i + 2) - attribute.getX(i);
      const bz = attribute.getZ(i + 2) - attribute.getZ(i);
      // Negative in (x, z), which is counter-clockwise once the +y viewpoint
      // flips the handedness of the plane. `riverSegment` is wound the same way.
      expect(ax * bz - az * bx).toBeLessThan(0);
      // Flat on the ground, facing the sky, like every other overlay shape.
      expect(attribute.getY(i)).toBe(0);
    }
  });

  it('leaves the territory tint depth-tested, because it is scenery', () => {
    const state = flatState();
    foundCityAt(state, 0, at(state, 5, 4));

    const layer = new TerritoryLayer();
    layer.build(state, geometry, materials);
    const drawn = decals(layer.group);
    expect(drawn.length).toBeGreaterThan(0);
    for (const { mesh, material } of drawn) {
      // A tint that ignored depth would wash over every tree and every piece
      // standing inside your own borders.
      expect(material.depthTest).toBe(true);
      expect(mesh.renderOrder).toBe(RENDER_ORDER.overlay);
    }
    layer.dispose();
  });
});

describe('the settler lens reads a site rather than scoring it', () => {
  const geometry = new BoardGeometry();
  const materials = new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);
  const LENS = VIEW3D.lens;

  /** The colours the lens paints over one named tile. */
  function washOver(state: GameState, col: number, row: number): number[] {
    const layer = new LensLayer();
    layer.build(
      state,
      lensView({ mode: 'settler', cells: [{ col, row }] }),
      geometry,
      materials,
      fakeIcons,
      faceCamera,
    );
    const colors = colorsOf(layer.group);
    layer.dispose();
    return colors;
  }

  it('paints a coastal tile blue', () => {
    const state = flatState();
    at(state, 3, 3).terrain = 'coast';
    computeFreshwater(state.map);
    expect(washOver(state, 4, 3)).toEqual([LENS.siteCoastColor]);
  });

  it('paints a fresh-water tile green', () => {
    const state = flatState();
    at(state, 3, 5).terrain = 'lake';
    computeFreshwater(state.map);
    expect(washOver(state, 4, 5)).toEqual([LENS.siteFreshColor]);
  });

  it('marks an estuary — both at once — with a blend and a ring', () => {
    const state = flatState();
    at(state, 3, 3).terrain = 'coast';
    at(state, 5, 3).terrain = 'lake';
    computeFreshwater(state.map);

    const colors = washOver(state, 4, 3);
    // Two decals, both in the blended ink: the wash and the ring that makes a
    // premium site findable in a field of washes.
    expect(colors).toHaveLength(2);
    expect(new Set(colors).size).toBe(1);
    expect(colors[0]).not.toBe(LENS.siteCoastColor);
    expect(colors[0]).not.toBe(LENS.siteFreshColor);
  });

  it('says nothing about ground that is merely legal', () => {
    const state = flatState();
    // Dry, inland, and perfectly foundable: no mark at all.
    expect(washOver(state, 6, 4)).toEqual([]);
  });

  it('washes ground the reducer would refuse in crimson, not in shade', () => {
    const state = flatState();
    at(state, 6, 4).terrain = 'mountain';
    computeFreshwater(state.map);
    expect(washOver(state, 6, 4)).toEqual([LENS.siteRefusedColor]);
    // The point of the change: refusal is stated in an ink, never as a
    // darkening. The fog already darkens, and a refused hex that read as
    // unexplored ground was the bug.
    expect(LENS.siteRefusedColor).not.toBe(VIEW3D.palette.ink);
  });

  it('refuses the whole ring the spacing rule reserves around a city', () => {
    // The lens is the reducer's own rule painted (`foundingErrorAt`), so the
    // hexes it refuses are exactly the ones the command would: everything
    // within `minCitySpacing − 1` of a town, anyone's.
    const state = flatState(16, 12);
    foundCityAt(state, 1, at(state, 8, 6));
    const spacing = RULES.cities.minCitySpacing;
    for (const tile of state.map.tiles) {
      const distance = wrappedDistance(state.map, tileHex(tile), tileHex(at(state, 8, 6)));
      if (distance >= spacing) continue;
      expect(`${tile.col},${tile.row}: ${washOver(state, tile.col, tile.row)[0]}`).toBe(
        `${tile.col},${tile.row}: ${LENS.siteRefusedColor}`,
      );
    }
  });

  it('rings a luxury in grape, on refused ground as much as on legal ground', () => {
    // The ring answers "what is on this hex", not "may I settle here" — a
    // settler aims at a luxury from a legal tile *beside* it, so the mark has to
    // survive the crimson.
    const state = flatState();
    at(state, 6, 4).resource = 'gems';
    at(state, 6, 5).resource = 'gems';
    at(state, 6, 5).terrain = 'mountain';
    computeFreshwater(state.map);

    expect(washOver(state, 6, 4)).toEqual([LENS.siteLuxuryColor]);
    expect(washOver(state, 6, 5)).toEqual([LENS.siteRefusedColor, LENS.siteLuxuryColor]);
  });

  it('leaves a bonus resource unringed — the ring is for luxuries', () => {
    const state = flatState();
    at(state, 6, 4).resource = 'wheat';
    computeFreshwater(state.map);
    expect(washOver(state, 6, 4)).toEqual([]);
  });

  it('says nothing about a luxury this seat has no word for yet', () => {
    // The roundels' own gate (`visibleResourceAt`), asked of the simulation so
    // the lens cannot ring a dye the player has not heard of. No shipped luxury
    // is tech-gated today, so the row is invented at runtime — which is also the
    // honest form of the claim: the gate is data, and the lens asks one
    // function about it either way.
    withExtraResources(
      {
        tyrianDye: {
          name: 'Tyrian Dye',
          kind: 'luxury',
          yields: { food: 0, production: 0, gold: 3 },
          validTerrain: ['grassland'],
          validFeatures: ['none'],
          frequency: 1,
          clusterSize: [1, 1],
          emoji: '🐚',
          requiresTech: 'bronzeWorking',
        } as unknown as ResourceDef,
      },
      () => {
        const state = flatState();
        at(state, 6, 4).resource = 'tyrianDye' as ResourceId;
        computeFreshwater(state.map);

        const player = state.players[0]!;
        player.techsResearched = player.techsResearched.filter((id) => id !== 'bronzeWorking');
        expect(washOver(state, 6, 4)).toEqual([]);

        // And the moment the seat can name it, the ring is there — the reveal
        // reaches the lens exactly as it reaches the roundel and the yield.
        player.techsResearched = [...player.techsResearched, 'bronzeWorking'];
        expect(washOver(state, 6, 4)).toEqual([LENS.siteLuxuryColor]);
      },
    );
  });

  it('shows the yield glyphs and the settler wash at the same time', () => {
    const state = flatState();
    at(state, 3, 3).terrain = 'coast';
    computeFreshwater(state.map);

    const layer = new LensLayer();
    layer.build(
      state,
      lensView({
        mode: 'settler',
        cells: [{ col: 4, row: 3 }],
        yields: true,
        yieldCells: [{ col: 4, row: 3 }],
      }),
      geometry,
      materials,
      fakeIcons,
      faceCamera,
    );
    // The wash *and* the grassland's two food glyphs: the two are independent.
    expect(colorsOf(layer.group)).toContain(LENS.siteCoastColor);
    expect(shapesOf(layer.group)).toContain(geometry.yieldGlyphs.food);
    layer.dispose();
  });
});
