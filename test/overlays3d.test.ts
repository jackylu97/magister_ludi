import { describe, expect, it } from 'vitest';
import {
  InstancedMesh,
  type BufferGeometry,
  type Material,
  MeshBasicMaterial,
  Quaternion,
} from 'three';

import type { TileIcons } from '../src/render3d/badges3d';
import { BoardGeometry } from '../src/render3d/board3d';
import { TerritoryLayer } from '../src/render3d/cities3d';
import { RENDER_ORDER } from '../src/render3d/instances';
import { LensLayer } from '../src/render3d/lens3d';
import { VIEW3D } from '../src/render3d/lookData';
import { OverlayLayer } from '../src/render3d/overlays';
import { MaterialLibrary } from '../src/render3d/toon';
import { foundCityAt } from '../src/sim/cities';
import { createMap, getTileAt, type Tile } from '../src/sim/map';
import { type GameState, newGame } from '../src/sim/state';
import { computeFreshwater } from '../src/sim/water';
import type { LensView } from '../src/ui/mapView';

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
function expectDrawnOverTheBoard(group: { children: unknown[] }): void {
  const drawn = decals(group);
  expect(drawn.length).toBeGreaterThan(0);
  for (const { mesh, material } of drawn) {
    expect(material.depthTest).toBe(false);
    expect(material.depthWrite).toBe(false);
    // The interface's own layer, named rather than written out: the badges now
    // sit one step above it (see `RENDER_ORDER`), and the two numbers only stay
    // consistent while both tests read the same list.
    expect(mesh.renderOrder).toBe(RENDER_ORDER.onTop);
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
    expectDrawnOverTheBoard(layer.group);
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
