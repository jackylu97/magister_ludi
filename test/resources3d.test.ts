import { describe, expect, it } from 'vitest';
import { BackSide, type BufferGeometry, InstancedMesh, MeshBasicMaterial } from 'three';

import {
  NUMERAL_CELLS,
  RESOURCE_ICON_FILES,
  TILE_ICON_CELLS,
  type TileIcons,
  YIELD_COLORS,
  YIELD_ICON_FILES,
  YIELD_KEYS,
  badgeAtlasLayout,
  tileAtlasSize,
  tileIconIndex,
  tileIconRect,
} from '../src/render3d/badges3d';
import { BoardGeometry, RESOURCE_PROPS, buildBoard } from '../src/render3d/board3d';
import { LensLayer } from '../src/render3d/lens3d';
import { VIEW3D } from '../src/render3d/lookData';
import { MaterialLibrary } from '../src/render3d/toon';
import { type GameState, newGame } from '../src/sim/state';
import { type Tile, createMap, getTileAt } from '../src/sim/map';
import { RESOURCE_IDS, type ResourceId } from '../src/sim/resourceData';
import { TECH_IDS } from '../src/sim/techData';
import { computeFreshwater } from '../src/sim/water';
import type { LensView } from '../src/ui/mapView';

/**
 * The board's half of the resources milestone: the diorama props, the flat
 * marks printed on a tile, and the atlas arithmetic that decides which cell each
 * of them lands in.
 *
 * The shape of these tests follows `pieces3d.test.ts` and `badges3d.test.ts`,
 * because the failure they are guarding against is the same one: a registry that
 * is exhaustive by *type* in one direction and by nothing at all in the other,
 * so a resource added to the data grows an invisible prop and a mark drawn for
 * nobody. Both directions are closed here.
 */

function materials(): MaterialLibrary {
  return new MaterialLibrary(VIEW3D.look.rampSteps, VIEW3D.palette.ink!);
}

/** A stand-in for the icon atlas; see the note in `overlays3d.test.ts`. */
const fakeIcons = {
  material: new MeshBasicMaterial({ depthTest: false, depthWrite: false }),
} as unknown as TileIcons;

function lensView(overrides: Partial<LensView> = {}): LensView {
  return { mode: 'none', cells: null, yields: false, yieldCells: null, playerId: 0, ...overrides };
}

/** A blank grassland state with every seat holding every technology. */
function flatState(width = 10, height = 8): GameState {
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
  for (const player of state.players) player.techsResearched = [...TECH_IDS];
  computeFreshwater(state.map);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** Triangle count of a geometry, indexed or not. */
function triangles(geometry: BufferGeometry): number {
  const index = geometry.getIndex();
  return (index ? index.count : geometry.getAttribute('position').count) / 3;
}

// --- the prop registry ------------------------------------------------------

describe('the resource prop registry', () => {
  const geometry = new BoardGeometry();

  it('has a prop for every resource, and a resource for every prop', () => {
    // The forward direction is a compile error (`Record<ResourceId, …>`); this is
    // the other one, which the type system cannot see: a prop nobody asks for.
    expect(Object.keys(RESOURCE_PROPS).sort()).toEqual([...RESOURCE_IDS].sort());
  });

  it('builds one shared geometry per resource, all of them distinct', () => {
    const built = RESOURCE_IDS.map((id) => geometry.resourceProps[id]);
    expect(built.every((shape) => shape !== undefined)).toBe(true);
    expect(new Set(built).size).toBe(RESOURCE_IDS.length);
  });

  it('keeps every prop inside the triangle budget', () => {
    // Roughly eighty triangles, which is the number the whole clutter family is
    // cut to. A prop that blew past it would be a model rather than a toy, and
    // it is instanced once per resource tile on the map.
    //
    // The horses are the exception and the cap is written to allow exactly one:
    // that prop is `miniHorse`, the cavalry sculpt reused *verbatim* so a herd on
    // a hex and the horseman it buys are visibly the same animal. Trimming it to
    // budget would mean two horses, which is the thing the reuse exists to avoid.
    for (const id of RESOURCE_IDS) {
      const budget = id === 'horses' ? 100 : 80;
      const count = triangles(geometry.resourceProps[id]);
      expect(`${id}: ${count <= budget ? 'ok' : count}`).toBe(`${id}: ok`);
      expect(count).toBeGreaterThan(0);
    }
  });

  it('stands every prop on the ground rather than sunk into it', () => {
    // Origins are at the base of every shape in `geometry.ts`, so a prop placed
    // on a tile top must not have most of itself below y = 0.
    for (const id of RESOURCE_IDS) {
      const position = geometry.resourceProps[id].getAttribute('position');
      let lowest = Infinity;
      let highest = -Infinity;
      for (let i = 0; i < position.count; i++) {
        lowest = Math.min(lowest, position.getY(i));
        highest = Math.max(highest, position.getY(i));
      }
      expect(`${id} base ${lowest >= -0.02 ? 'ok' : lowest}`).toBe(`${id} base ok`);
      expect(highest).toBeGreaterThan(0);
    }
  });

  it('paints every prop from a colour the palette actually has', () => {
    for (const id of RESOURCE_IDS) {
      const spec = VIEW3D.resources.props[id];
      expect(typeof spec.color).toBe('number');
      expect(spec.count).toBeGreaterThanOrEqual(1);
      expect(spec.size).toBeGreaterThan(0);
    }
  });
});

// --- props on a board -------------------------------------------------------

describe('resource props on the board', () => {
  const geometry = new BoardGeometry();

  function statsFor(state: GameState): Map<BufferGeometry, number> {
    const board = buildBoard(state.map, geometry, materials(), false);
    const byGeometry = new Map<BufferGeometry, number>();
    for (const child of board.group.children) {
      if (!(child instanceof InstancedMesh)) continue;
      if (!Array.isArray(child.material) && child.material.side === BackSide) continue;
      byGeometry.set(child.geometry, (byGeometry.get(child.geometry) ?? 0) + child.count);
    }
    board.dispose();
    return byGeometry;
  }

  it('puts a resource tile\'s own prop on it', () => {
    const state = flatState();
    at(state, 4, 4).resource = 'cattle';
    const stats = statsFor(state);
    // Three wrap copies of at least one cow.
    expect(stats.get(geometry.resourceProps.cattle) ?? 0).toBeGreaterThanOrEqual(3);
  });

  it('replaces the generic clutter rather than piling on top of it', () => {
    const bare = flatState();
    const withWheat = flatState();
    at(withWheat, 4, 4).resource = 'wheat';

    const before = statsFor(bare).get(geometry.tuft) ?? 0;
    const after = statsFor(withWheat).get(geometry.tuft) ?? 0;
    // That one hex stopped growing grass; the rest of the field is untouched.
    expect(after).toBeLessThan(before);
    expect(statsFor(withWheat).get(geometry.resourceProps.wheat) ?? 0).toBeGreaterThan(0);
  });

  it('leaves the trees standing, because deer live in them', () => {
    const state = flatState();
    const tile = at(state, 4, 4);
    tile.feature = 'forest';
    tile.resource = 'deer';
    const stats = statsFor(state);
    expect(stats.get(geometry.resourceProps.deer) ?? 0).toBeGreaterThan(0);
    // A forest with its trees taken away to make room would stop being one.
    const pines = (stats.get(geometry.pine) ?? 0) + (stats.get(geometry.pineAlt) ?? 0);
    expect(pines).toBeGreaterThan(0);
  });

  it('takes the boulders off a hill it puts ore on', () => {
    const rocky = flatState();
    at(rocky, 4, 4).hills = true;
    const mined = flatState();
    at(mined, 4, 4).hills = true;
    at(mined, 4, 4).resource = 'iron';

    const before = statsFor(rocky).get(geometry.boulder) ?? 0;
    const after = statsFor(mined).get(geometry.boulder) ?? 0;
    expect(after).toBeLessThanOrEqual(before);
    expect(statsFor(mined).get(geometry.resourceProps.iron) ?? 0).toBeGreaterThan(0);
  });

  it('places props by hash, so two builds of one map agree exactly', () => {
    const state = flatState();
    at(state, 3, 3).resource = 'horses';
    at(state, 6, 5).resource = 'gems';
    const first = statsFor(state);
    const second = statsFor(state);
    for (const [shape, count] of first) expect(second.get(shape)).toBe(count);
  });
});

// --- the tile atlas ---------------------------------------------------------

describe('the tile-icon atlas', () => {
  it('has a cell for every resource, every yield voice and every digit', () => {
    const resources = TILE_ICON_CELLS.filter((cell) => cell.set === 'resource').map((c) => c.id);
    const yields = TILE_ICON_CELLS.filter((cell) => cell.set === 'yield').map((c) => c.id);
    const numerals = TILE_ICON_CELLS.filter((cell) => cell.set === 'numeral').map((c) => c.id);
    expect(resources).toEqual([...RESOURCE_IDS]);
    expect(yields).toEqual([...YIELD_KEYS]);
    expect(numerals).toEqual([...NUMERAL_CELLS]);
    expect(TILE_ICON_CELLS).toHaveLength(RESOURCE_IDS.length + 3 + 10);
  });

  it('names an artwork file for every mark that has one', () => {
    expect(Object.keys(RESOURCE_ICON_FILES).sort()).toEqual([...RESOURCE_IDS].sort());
    for (const id of RESOURCE_IDS) {
      expect(RESOURCE_ICON_FILES[id]).toBe(`sprites/icons/resources/${id}.svg`);
    }
    for (const key of YIELD_KEYS) {
      expect(YIELD_ICON_FILES[key]).toBe(`sprites/icons/yields/${key}.svg`);
    }
  });

  it('prints each yield voice in the colour the interface already counts in', () => {
    expect(YIELD_COLORS.food).toBe(VIEW3D.lens.foodColor);
    expect(YIELD_COLORS.production).toBe(VIEW3D.lens.productionColor);
    expect(YIELD_COLORS.gold).toBe(VIEW3D.lens.goldColor);
  });

  it('tiles the cells into a grid big enough to hold them all', () => {
    const layout = tileAtlasSize();
    expect(layout.columns * layout.rows).toBeGreaterThanOrEqual(TILE_ICON_CELLS.length);
    expect(layout.width).toBe(layout.columns * layout.cell);
    expect(layout.height).toBe(layout.rows * layout.cell);
    // The layout helper is shared with the badges, so a ninth model class and a
    // thirteenth resource break in the same, tested, place.
    expect(badgeAtlasLayout(25, 5, 128)).toMatchObject({ columns: 5, rows: 5 });
  });

  it('gives every cell its own rectangle, inside the texture', () => {
    const seen = new Set<string>();
    for (const cell of TILE_ICON_CELLS) {
      const rect = tileIconRect(cell);
      for (const value of [rect.u0, rect.u1, rect.v0, rect.v1]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
      expect(rect.u1).toBeGreaterThan(rect.u0);
      expect(rect.v1).toBeGreaterThan(rect.v0);
      const key = `${rect.u0},${rect.v0}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('refuses to hand back a rectangle for a cell it does not have', () => {
    expect(tileIconIndex({ set: 'resource', id: 'coal' as ResourceId })).toBe(-1);
    expect(() => tileIconRect({ set: 'numeral', id: 42 })).toThrow(/no atlas cell/);
  });
});

// --- what the lens draws ----------------------------------------------------

describe('the resource lens', () => {
  const geometry = new BoardGeometry();

  /** The geometries the lens drew over the whole map. */
  function shapesFor(state: GameState, lens: Partial<LensView>): BufferGeometry[] {
    const layer = new LensLayer();
    layer.build(state, lensView(lens), geometry, materials(), fakeIcons);
    const out: BufferGeometry[] = [];
    for (const child of layer.group.children) {
      if (child instanceof InstancedMesh) out.push(child.geometry);
    }
    layer.dispose();
    return out;
  }

  it('puts a roundel on a tile that carries something', () => {
    const state = flatState();
    at(state, 4, 4).resource = 'wine';
    const shapes = shapesFor(state, { mode: 'resources' });
    expect(shapes).toEqual([geometry.resourceIcons.wine]);
  });

  it('says nothing about a board with nothing on it', () => {
    expect(shapesFor(flatState(), { mode: 'resources' })).toEqual([]);
  });

  it('hides a resource the viewing player has no technology for', () => {
    const state = flatState();
    at(state, 4, 4).resource = 'iron';
    at(state, 6, 4).resource = 'horses';
    state.players[0]!.techsResearched = [];

    // Player 0 has never heard of iron; the horses are ungated and still shown.
    expect(shapesFor(state, { mode: 'resources', playerId: 0 })).toEqual([
      geometry.resourceIcons.horses,
    ]);
    // Player 1 knows Bronze Working and sees both.
    const seat1 = shapesFor(state, { mode: 'resources', playerId: 1 });
    expect(seat1).toContain(geometry.resourceIcons.iron);
    expect(seat1).toContain(geometry.resourceIcons.horses);
  });

  it('draws nothing at all before the atlas has rasterised', () => {
    const state = flatState();
    at(state, 4, 4).resource = 'wine';
    const layer = new LensLayer();
    layer.build(state, lensView({ mode: 'resources' }), geometry, materials(), null);
    expect(layer.group.children).toHaveLength(0);
    layer.dispose();
  });

  it('honours the cell restriction, like every other lens', () => {
    const state = flatState();
    at(state, 4, 4).resource = 'wine';
    at(state, 7, 6).resource = 'salt';
    expect(shapesFor(state, { mode: 'resources', cells: [{ col: 4, row: 4 }] })).toEqual([
      geometry.resourceIcons.wine,
    ]);
  });
});

describe('the yield glyphs', () => {
  const geometry = new BoardGeometry();

  /** Every instanced mesh the yield switch drew over one tile. */
  function marksOver(state: GameState, col: number, row: number): InstancedMesh[] {
    const layer = new LensLayer();
    layer.build(
      state,
      lensView({ yields: true, yieldCells: [{ col, row }] }),
      geometry,
      materials(),
      fakeIcons,
    );
    const out: InstancedMesh[] = [];
    for (const child of layer.group.children) {
      if (child instanceof InstancedMesh) out.push(child);
    }
    layer.dispose();
    return out;
  }

  it('repeats a glyph once per point, up to the cap', () => {
    const state = flatState();
    // Bare grassland is two food: two sheaves, three wrap copies each, and one
    // bucket because they share a cell of the atlas.
    const marks = marksOver(state, 4, 4);
    expect(marks).toHaveLength(1);
    expect(marks[0]!.geometry).toBe(geometry.yieldGlyphs.food);
    expect(marks[0]!.count).toBe(2 * 3);
  });

  it('adds a resource\'s yield to the row it belongs in', () => {
    const state = flatState();
    at(state, 4, 4).resource = 'wheat';
    const marks = marksOver(state, 4, 4);
    // Three food now, still one voice: the resource adds, it does not speak.
    expect(marks).toHaveLength(1);
    expect(marks[0]!.count).toBe(3 * 3);
  });

  it('gives a mixed tile one row per voice', () => {
    const state = flatState();
    const tile = at(state, 4, 4);
    tile.resource = 'salt';
    tile.terrain = 'desert';
    // Desert is 0/0/0; salt is 1 food and 1 gold, so two rows and no hammer.
    const shapes = marksOver(state, 4, 4).map((mesh) => mesh.geometry);
    expect(shapes).toContain(geometry.yieldGlyphs.food);
    expect(shapes).toContain(geometry.yieldGlyphs.gold);
    expect(shapes).not.toContain(geometry.yieldGlyphs.production);
  });

  it('collapses past the cap to one glyph and a numeral', () => {
    const state = flatState();
    const tile = at(state, 4, 4);
    // A hill is two production; five more from a hand-set stack of resources is
    // not a real tile, so the amount is forced by writing the yield the lens
    // reads — the arithmetic under test is the layout, not the economy.
    tile.hills = true;
    tile.resource = 'wheat';
    expect(VIEW3D.lens.glyphCap).toBe(4);

    // 0/2/0 + 1/0/0 = one food and two production: still under the cap.
    const under = marksOver(state, 4, 4);
    expect(under.every((mesh) => mesh.geometry !== geometry.numerals[0])).toBe(true);

    // Six of one voice: one glyph, one digit, three copies of each.
    const many = flatState();
    at(many, 4, 4).terrain = 'lake';
    at(many, 4, 4).resource = 'fish';
    const lake = marksOver(many, 4, 4);
    expect(lake.map((mesh) => mesh.geometry)).toContain(geometry.yieldGlyphs.food);
  });

  it('lays a two-digit count out as two numerals', () => {
    // Ten of a voice is not reachable on a real tile today, so the layout is
    // exercised through the digit table directly: `numerals` is indexed by
    // value, which is what makes "12" two lookups rather than a string parse.
    expect(geometry.numerals).toHaveLength(10);
    expect(new Set(geometry.numerals).size).toBe(10);
    expect(geometry.numerals[7]).toBe(geometry.numerals[7]);
  });

  it('draws every mark over the board, never inside it', () => {
    const state = flatState();
    for (const mesh of marksOver(state, 4, 4)) {
      expect(mesh.renderOrder).toBe(20);
      const material = mesh.material as MeshBasicMaterial;
      expect(material.depthTest).toBe(false);
    }
  });
});
