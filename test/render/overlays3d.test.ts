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
import { TerritoryLayer, borderBandMatrix } from '../../src/render3d/cities3d';
import { RENDER_ORDER } from '../../src/render3d/instances';
import { cellCenter, directionDelta, tileScale, tileTopY } from '../../src/render3d/layout';
import { LensLayer } from '../../src/render3d/lens3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { OverlayLayer } from '../../src/render3d/overlays';
import { MaterialLibrary } from '../../src/render3d/toon';
import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt, tileIndex, type Tile } from '../../src/sim/map';
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

  it('darkens ground the reducer would refuse', () => {
    const state = flatState();
    at(state, 6, 4).terrain = 'mountain';
    computeFreshwater(state.map);
    expect(washOver(state, 6, 4)).toEqual([LENS.siteInvalidColor]);
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
