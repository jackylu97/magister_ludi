import { describe, expect, it } from 'vitest';
import {
  BackSide,
  type BufferGeometry,
  Euler,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
} from 'three';

import {
  MARGINALIA_CELLS,
  NUMERAL_CELLS,
  RESOURCE_ICON_FILES,
  TILE_ICON_CELLS,
  type TileIcons,
  YIELD_COLORS,
  YIELD_ICON_FILES,
  YIELD_KEYS,
  badgeAtlasLayout,
  paperRadiusFraction,
  tileAtlasSize,
  tileIconIndex,
  tileIconRect,
  yieldDiscLayout,
  yieldShadowColor,
} from '../src/render3d/badges3d';
import { BoardGeometry, RESOURCE_PROPS, buildBoard } from '../src/render3d/board3d';
import { cellCenter, tileTopY } from '../src/render3d/layout';
import { RENDER_ORDER } from '../src/render3d/instances';
import { LensLayer, yieldDiscWidth, yieldRowLayout } from '../src/render3d/lens3d';
import { VIEW3D } from '../src/render3d/lookData';
import { MaterialLibrary } from '../src/render3d/toon';
import { foundCityAt } from '../src/sim/cities';
import { type GameState, newGame } from '../src/sim/state';
import { visibleResourceAt } from '../src/sim/tech';
import { type Tile, createMap, getTileAt } from '../src/sim/map';
import { RESOURCE_IDS, type ResourceId } from '../src/sim/resourceData';
import { TECH_IDS } from '../src/sim/techData';
import { computeFreshwater } from '../src/sim/water';
import { resetVisibility } from '../src/sim/visibility';
import { LENS_DEFAULTS, type LensView } from '../src/ui/mapView';

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
  // The second material of the same atlas: the one the standing resource markers
  // are drawn with. Left at three's defaults, because the two properties under
  // test — a marker *does* test and write depth — are exactly those defaults.
  standingMaterial: new MeshBasicMaterial(),
} as unknown as TileIcons;

/**
 * The fixed camera's rotation, standing in for `view.camera.quaternion`.
 *
 * Deliberately not the identity: "every marker is turned to face the camera" is
 * only a claim if the rotation it is turned by is one an untouched quaternion
 * could not have produced by accident.
 */
const faceCamera = new Quaternion().setFromEuler(new Euler(-Math.PI / 5, Math.PI / 7, 0));

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
  // The board was replaced under this state; the fog grids were sized for the
  // old one. See `resetVisibility`.
  resetVisibility(state);
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
  it('has a cell for every resource, every yield voice, every digit and the marginalia', () => {
    const resources = TILE_ICON_CELLS.filter((cell) => cell.set === 'resource').map((c) => c.id);
    const yields = TILE_ICON_CELLS.filter((cell) => cell.set === 'yield').map((c) => c.id);
    const numerals = TILE_ICON_CELLS.filter((cell) => cell.set === 'numeral').map((c) => c.id);
    const margins = TILE_ICON_CELLS.filter((cell) => cell.set === 'marginalia').map((c) => c.id);
    expect(resources).toEqual([...RESOURCE_IDS]);
    expect(yields).toEqual([...YIELD_KEYS]);
    expect(numerals).toEqual([...NUMERAL_CELLS]);
    expect(margins).toEqual([...MARGINALIA_CELLS]);
    expect(TILE_ICON_CELLS).toHaveLength(
      RESOURCE_IDS.length + 3 + 10 + MARGINALIA_CELLS.length,
    );
  });

  /**
   * The marginalia went on the *end* of the cell list, and that is load-bearing
   * rather than tidy: the list decides texture coordinates, so a set inserted
   * anywhere else would shift every cell after it and silently re-point marks on
   * the board at somebody else's picture. This pins the resources at index 0 and
   * the serpent last.
   */
  it('appends new sets rather than inserting them', () => {
    expect(tileIconIndex({ set: 'resource', id: RESOURCE_IDS[0]! })).toBe(0);
    expect(tileIconIndex({ set: 'marginalia', id: 'serpent' })).toBe(TILE_ICON_CELLS.length - 1);
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

// --- what the switch draws --------------------------------------------------

/**
 * The resource switch draws a *standing marker* — a camera-facing roundel on a
 * pin, floated over the hex — where it used to print a flat roundel on the face.
 *
 * The change was made because the flat form sat in the same plane, at the same
 * height and on the same centre as the yield stacks, so a tile that both made
 * something and had something on it printed the two on top of each other. Every
 * assertion the flat roundel had is still here; what each of them is asked about
 * moved from `resourceIcons` to `resourceMarkers`, and the shape of the marker —
 * its lift, its pin, its constant orientation, its anchor off the tile centre —
 * is what the new ones add.
 */
describe('the resource markers', () => {
  const geometry = new BoardGeometry();
  const LENS = VIEW3D.lens;

  /** Every instanced mesh the lens layer drew. */
  function meshesFor(state: GameState, lens: Partial<LensView>): InstancedMesh[] {
    const layer = new LensLayer();
    layer.build(state, lensView(lens), geometry, materials(), fakeIcons, faceCamera);
    const out: InstancedMesh[] = [];
    for (const child of layer.group.children) {
      if (child instanceof InstancedMesh) out.push(child);
    }
    layer.dispose();
    return out;
  }

  /** The geometries the lens layer drew, in collection order. */
  function shapesFor(state: GameState, lens: Partial<LensView>): BufferGeometry[] {
    return meshesFor(state, lens).map((mesh) => mesh.geometry);
  }

  /** Just the roundels: the pins and everything else filtered out. */
  function markersFor(state: GameState, lens: Partial<LensView>): BufferGeometry[] {
    const standing = new Set<BufferGeometry>(Object.values(geometry.resourceMarkers));
    return shapesFor(state, lens).filter((shape) => standing.has(shape));
  }

  /**
   * The position, rotation and scale of one instance of a mesh.
   *
   * Index 1 by default, not 0: every instance is collected three times, at
   * world x − W, in place, and at x + W (see `instances.ts`), so the middle of
   * the three is the copy whose x is the tile's own.
   *
   * Read back through a `Float32Array`, so five decimal places is the whole of
   * the precision there is to compare against — asking for more would be a test
   * of three's storage rather than of this layer's arithmetic.
   */
  function instance(mesh: InstancedMesh, index = 1) {
    const matrix = new Matrix4();
    mesh.getMatrixAt(index, matrix);
    const position = new Vector3();
    const quaternion = new Quaternion();
    const scale = new Vector3();
    matrix.decompose(position, quaternion, scale);
    return { position, quaternion, scale };
  }

  it('puts a marker on a tile that carries something', () => {
    const state = flatState();
    at(state, 4, 4).resource = 'wine';
    expect(markersFor(state, { resources: true })).toEqual([geometry.resourceMarkers.wine]);
  });

  it('says nothing about a board with nothing on it', () => {
    expect(shapesFor(flatState(), { resources: true })).toEqual([]);
  });

  it('hides a resource the viewing player has no technology for', () => {
    const state = flatState();
    at(state, 4, 4).resource = 'iron';
    at(state, 6, 4).resource = 'horses';
    state.players[0]!.techsResearched = [];

    // Player 0 has never heard of iron; the horses are ungated and still shown.
    expect(markersFor(state, { resources: true, playerId: 0 })).toEqual([
      geometry.resourceMarkers.horses,
    ]);
    // Player 1 knows Bronze Working and sees both.
    const seat1 = markersFor(state, { resources: true, playerId: 1 });
    expect(seat1).toContain(geometry.resourceMarkers.iron);
    expect(seat1).toContain(geometry.resourceMarkers.horses);
  });

  /**
   * A city wears no pin, and the tile under it still answers for itself.
   *
   * Two halves of one rule, and the second is why the suppression lives in the
   * lens rather than in `visibleResourceAt`. The board's job is to be legible —
   * a roundel on a pin through a town's own roofs is litter, and the wheat under
   * a city is already spoken for by the panel that grew out of it. The
   * simulation's job is to answer questions, and "what is on this tile" is one
   * the hover card asks about every tile on the board, city or not. Filtering in
   * the *info* path would have made a city a hole in the map.
   */
  it('draws no marker on a tile a city stands on', () => {
    const state = flatState();
    at(state, 4, 4).resource = 'wheat';
    at(state, 6, 4).resource = 'wheat';
    foundCityAt(state, 0, at(state, 4, 4));

    // The other wheat, two tiles over, still wears its pin: what went is the
    // marker on the city, not the resource kind.
    expect(markersFor(state, { resources: true })).toEqual([geometry.resourceMarkers.wheat]);
    const meshes = meshesFor(state, { resources: true });
    const roundel = meshes.find((mesh) => mesh.geometry === geometry.resourceMarkers.wheat)!;
    const centre = cellCenter(6, 4);
    expect(instance(roundel).position.x).toBeCloseTo(centre.x - LENS.resourceMarkerOffsetX, 5);
    // One marker, so one pin — the city's pin went with its roundel.
    expect(meshes.filter((mesh) => mesh.geometry === geometry.resourceStem)).toHaveLength(1);
    expect(roundel.count).toBe(3);
  });

  it('still names the resource under a city when the pointer asks', () => {
    // The hover readout's own source (`describeResource` in `main.ts`), asked
    // exactly as it asks it. The marker is a drawing decision; this is not.
    const state = flatState();
    at(state, 4, 4).resource = 'wheat';
    foundCityAt(state, 0, at(state, 4, 4));
    expect(visibleResourceAt(state, 0, at(state, 4, 4))).toBe('wheat');
    expect(markersFor(state, { resources: true })).toEqual([]);
  });

  it('draws nothing at all before the atlas has rasterised', () => {
    const state = flatState();
    at(state, 4, 4).resource = 'wine';
    const layer = new LensLayer();
    layer.build(state, lensView({ resources: true }), geometry, materials(), null, faceCamera);
    expect(layer.group.children).toHaveLength(0);
    layer.dispose();
  });

  it('honours its own cell restriction, like every other half of the layer', () => {
    const state = flatState();
    at(state, 4, 4).resource = 'wine';
    at(state, 7, 6).resource = 'salt';
    expect(markersFor(state, { resources: true, resourceCells: [{ col: 4, row: 4 }] })).toEqual([
      geometry.resourceMarkers.wine,
    ]);
  });

  it('draws nothing while the switch is off', () => {
    const state = flatState();
    at(state, 4, 4).resource = 'wine';
    expect(shapesFor(state, { resources: false })).toEqual([]);
  });

  /**
   * The switch starts on, which is the whole point of it no longer being a lens:
   * a player who has opened no menu is still told what is on the ground. The
   * default is asserted through the layer, not merely read back, so the test
   * fails if either the constant or its wiring stops meaning "markers up".
   */
  it('is on by default, so an untouched board already names its ground', () => {
    const state = flatState();
    at(state, 4, 4).resource = 'wine';
    expect(LENS_DEFAULTS.resources).toBe(true);
    expect(markersFor(state, { resources: LENS_DEFAULTS.resources })).toEqual([
      geometry.resourceMarkers.wine,
    ]);
  });

  it('layers under the settler lens rather than replacing it', () => {
    // The two used to be exclusive modes. A settler picked up over a wine hill
    // must now show both the site wash and the marker naming what is there.
    const state = flatState();
    at(state, 4, 4).resource = 'wine';
    // One tile a city cannot go on, so the wash has something to say at all.
    at(state, 0, 0).terrain = 'ocean';
    const shapes = shapesFor(state, { mode: 'settler', resources: true });
    expect(shapes).toContain(geometry.resourceMarkers.wine);
    expect(shapes).toContain(geometry.territory);
  });

  // --- the shape of a marker ------------------------------------------------

  describe('stands over its tile rather than lying on it', () => {
    function markerOver(col: number, row: number, id: ResourceId = 'wine') {
      const state = flatState();
      at(state, col, row).resource = id;
      const meshes = meshesFor(state, { resources: true });
      const roundel = meshes.find((mesh) => mesh.geometry === geometry.resourceMarkers[id]);
      const stem = meshes.find((mesh) => mesh.geometry === geometry.resourceStem);
      if (!roundel || !stem) throw new Error('the marker did not draw both of its halves');
      return { state, roundel, stem, tile: at(state, col, row) };
    }

    it('floats the roundel a tunable lift above the tile face', () => {
      const { roundel, tile } = markerOver(4, 4);
      // Enough to clear the props growing under it, and asked of the data rather
      // than of a number written here twice.
      expect(LENS.resourceMarkerLift).toBeGreaterThan(0.4);
      expect(instance(roundel).position.y).toBeCloseTo(
        tileTopY(tile) + LENS.resourceMarkerLift,
        5,
      );
    });

    it('plants one pin per marker, from the face up to the roundel', () => {
      const { roundel, stem, tile } = markerOver(4, 4);
      // Three wrap copies of one marker, so three of each half — and the pin is
      // *one* instanced draw whatever is on the board.
      expect(roundel.count).toBe(3);
      expect(stem.count).toBe(3);

      const pin = instance(stem);
      // Standing on the tile face…
      expect(pin.position.y).toBeCloseTo(tileTopY(tile) + LENS.glyphLift, 5);
      // …and exactly long enough to reach the roundel's centre, where the paper
      // hides its top. Thin: a pin, not a post.
      expect(pin.scale.y).toBeCloseTo(LENS.resourceMarkerLift, 5);
      expect(pin.scale.x).toBeCloseTo(LENS.resourceStemRadius, 5);
      expect(pin.scale.x).toBeLessThan(LENS.resourceIconSize / 4);
      // Ink, and standing upright rather than turned to the camera with the
      // roundel: a pin that leaned with the quad would not touch the ground.
      expect(pin.quaternion.angleTo(new Quaternion())).toBeCloseTo(0, 5);
    });

    it('shares the pin between every marker on the board', () => {
      const state = flatState();
      at(state, 3, 3).resource = 'wine';
      at(state, 5, 3).resource = 'salt';
      at(state, 7, 3).resource = 'iron';
      const stems = meshesFor(state, { resources: true }).filter(
        (mesh) => mesh.geometry === geometry.resourceStem,
      );
      // One bucket, one draw, nine instances: three markers by three wrap copies.
      expect(stems).toHaveLength(1);
      expect(stems[0]!.count).toBe(9);
    });

    it('turns every roundel by the camera rotation, and only by that', () => {
      const state = flatState();
      at(state, 3, 3).resource = 'wine';
      at(state, 5, 3).resource = 'salt';
      const meshes = meshesFor(state, { resources: true });
      const roundels = meshes.filter((mesh) => mesh.geometry !== geometry.resourceStem);
      expect(roundels.length).toBeGreaterThan(0);
      for (const mesh of roundels) {
        for (let i = 0; i < mesh.count; i++) {
          // The same constant for every instance and every wrap copy — the badge
          // bargain: the camera never moves, so this is resolved once.
          expect(instance(mesh, i).quaternion.angleTo(faceCamera)).toBeCloseTo(0, 5);
        }
      }
      // And it is a real rotation, not an identity that would pass by accident.
      expect(faceCamera.angleTo(new Quaternion())).toBeGreaterThan(0.1);
    });

    it('anchors off the tile centre, clear of the flat yield stacks', () => {
      const { roundel, stem } = markerOver(4, 4);
      const centre = cellCenter(4, 4);
      const at3d = instance(roundel).position;

      expect(LENS.resourceMarkerOffset).toBeGreaterThan(0);
      expect(LENS.resourceMarkerOffsetX).toBeGreaterThan(0);
      // Toward the hex's upper-left corner: −z is up-screen and −x is left
      // under this camera.
      expect(at3d.x).toBeCloseTo(centre.x - LENS.resourceMarkerOffsetX, 5);
      expect(at3d.z).toBeCloseTo(centre.z - LENS.resourceMarkerOffset, 5);
      // The pin comes up under the roundel, not somewhere else on the hex.
      const foot = instance(stem).position;
      expect(foot.x).toBeCloseTo(at3d.x, 5);
      expect(foot.z).toBeCloseTo(at3d.z, 5);
    });

    /**
     * The collision the lateral half of the anchor exists for.
     *
     * A unit standing on the tile floats its class badge centre-top over its own
     * head, so a marker lifted straight up the middle of the hex ends up behind
     * it — and the badge is now drawn over the interface rings, which makes it
     * the thing that wins. The two are separated *across* the hex rather than up
     * it because the camera's tilt squashes z on screen and leaves x alone.
     *
     * Asked of the data, in the data's own units: the marker's near edge has to
     * clear the badge's far edge with both of them at their tunable sizes, which
     * is the invariant that would break the day somebody grows either one.
     */
    it('clears the badge a unit on the same tile floats over its head', () => {
      const { roundel } = markerOver(4, 4);
      const centre = cellCenter(4, 4);
      const gap = Math.abs(instance(roundel).position.x - centre.x);
      const halves = VIEW3D.badges.diameter / 2 + LENS.resourceIconSize / 2;
      expect(gap).toBeGreaterThan(halves);
    });

    it('keeps the yield stacks flat, on the face, in the middle of the hex', () => {
      // The other half of the collision: the glyphs did not move, and the marker
      // is nowhere near them in either plane.
      const state = flatState();
      at(state, 4, 4).resource = 'wine';
      const meshes = meshesFor(state, {
        resources: true,
        yields: true,
        yieldCells: [{ col: 4, row: 4 }],
      });
      const glyph = meshes.find((mesh) => mesh.geometry === geometry.yieldGlyphs.food);
      const roundel = meshes.find((mesh) => mesh.geometry === geometry.resourceMarkers.wine);
      if (!glyph || !roundel) throw new Error('expected both readouts on this tile');

      const tile = at(state, 4, 4);
      const flat = instance(glyph);
      expect(flat.position.y).toBeCloseTo(tileTopY(tile) + VIEW3D.overlay.lift + LENS.glyphLift, 5);
      expect(flat.quaternion.angleTo(new Quaternion())).toBeCloseTo(0, 5);
      // A whole marker-lift apart vertically, and a whole anchor offset apart in
      // z: the two readouts no longer share a pixel.
      expect(instance(roundel).position.y - flat.position.y).toBeGreaterThan(0.4);
      expect(Math.abs(instance(roundel).position.z - cellCenter(4, 4).z)).toBeCloseTo(
        LENS.resourceMarkerOffset,
        5,
      );
    });

    it('is an ordinary object in the world, hidden by what stands in front of it', () => {
      // Not `onTop`, unlike every flat readout: a marker is a thing in the
      // diorama, so a mountain must be able to hide it — the class-badge rule.
      const { roundel, stem } = markerOver(4, 4);
      for (const mesh of [roundel, stem]) expect(mesh.renderOrder).toBe(0);
      const paper = roundel.material as MeshBasicMaterial;
      expect(paper.depthTest).toBe(true);
      expect(paper.depthWrite).toBe(true);
    });

    it('costs one draw for the pins on top of the cells already drawn', () => {
      const state = flatState();
      at(state, 3, 3).resource = 'wine';
      at(state, 5, 3).resource = 'salt';
      at(state, 7, 3).resource = 'iron';
      const layer = new LensLayer();
      layer.build(
        state,
        lensView({ resources: true }),
        geometry,
        materials(),
        fakeIcons,
        faceCamera,
      );
      // Three atlas cells — what the flat roundels cost too — plus the one
      // shared pin bucket. Flat in the number of tiles, as everything here is.
      expect(layer.drawCalls).toBe(4);
      layer.dispose();
    });
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
      faceCamera,
    );
    const out: InstancedMesh[] = [];
    for (const child of layer.group.children) {
      if (child instanceof InstancedMesh) out.push(child);
    }
    layer.dispose();
    return out;
  }

  it('repeats a glyph once per point, up to the stack maximum', () => {
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

  it('keeps a real tile\'s yields down to stacks, never numerals', () => {
    const state = flatState();
    const tile = at(state, 4, 4);
    tile.hills = true;
    tile.resource = 'wheat';
    // 0/2/0 + 1/0/0 = one food and two production: both well under the maximum,
    // so nothing on the board today should be printing a count.
    const marks = marksOver(state, 4, 4);
    expect(marks.every((mesh) => !geometry.numerals.includes(mesh.geometry))).toBe(true);
  });

  /**
   * The row arithmetic is checked through `yieldRowLayout` rather than through
   * instance matrices, because the interesting cases are on either side of a
   * threshold no real tile reaches: nothing in the data makes five of one yield
   * yet. The layer draws exactly what this returns — see `addYieldGlyphs`.
   */
  describe('the row layout', () => {
    it('stacks the discs at a fraction of their own diameter, in order', () => {
      const row = yieldRowLayout(4);
      expect(row.glyphs).toHaveLength(4);
      expect(row.numerals).toEqual([]);

      const steps = row.glyphs.slice(1).map((x, i) => x - row.glyphs[i]!);
      // Monotone left to right, and every step the same one.
      expect(steps.every((step) => step > 0)).toBe(true);
      for (const step of steps) expect(step).toBeCloseTo(steps[0]!, 10);
      // An overlap, not a row of separate tokens: a step shorter than a disc.
      expect(steps[0]!).toBeCloseTo(yieldDiscWidth() * VIEW3D.lens.yieldStackStep, 10);
      expect(steps[0]!).toBeLessThan(yieldDiscWidth());
    });

    it('centres the stack on the tile, whatever its depth', () => {
      for (const amount of [1, 2, 3, 4]) {
        const glyphs = yieldRowLayout(amount).glyphs;
        const middle = (glyphs[0]! + glyphs[glyphs.length - 1]!) / 2;
        expect(middle).toBeCloseTo(0, 10);
      }
      expect(yieldRowLayout(1).glyphs).toEqual([0]);
    });

    it('takes about half the width the spaced row used to', () => {
      // The whole point of the rework. The old row stepped 0.32 world units per
      // point at a glyph size of 0.36; four points spanned 1.32.
      const glyphs = yieldRowLayout(4).glyphs;
      const width = glyphs[3]! - glyphs[0]! + yieldDiscWidth();
      expect(width).toBeLessThan(1.32 * 0.55);
    });

    it('collapses to one glyph and a count at the stack maximum plus one', () => {
      expect(VIEW3D.lens.yieldStackMax).toBe(4);
      // Four is the last stack…
      expect(yieldRowLayout(4).numerals).toEqual([]);
      expect(yieldRowLayout(4).glyphs).toHaveLength(4);
      // …and five is the first count.
      const five = yieldRowLayout(5);
      expect(five.glyphs).toHaveLength(1);
      expect(five.numerals.map((mark) => mark.digit)).toEqual([5]);
    });

    it('lays a two-figure count out as two numerals, left to right', () => {
      const row = yieldRowLayout(12);
      expect(row.glyphs).toHaveLength(1);
      expect(row.numerals.map((mark) => mark.digit)).toEqual([1, 2]);
      expect(row.numerals[1]!.x).toBeGreaterThan(row.numerals[0]!.x);
      // The glyph leads, and the pair is centred like a stack is.
      expect(row.glyphs[0]!).toBeLessThan(row.numerals[0]!.x);
      const span = row.numerals[1]!.x + VIEW3D.lens.numeralSize / 2;
      const start = row.glyphs[0]! - yieldDiscWidth() / 2;
      expect((start + span) / 2).toBeCloseTo(0, 10);
      // Every digit has a cell to be drawn from: ten of them, all distinct.
      expect(geometry.numerals).toHaveLength(10);
      expect(new Set(geometry.numerals).size).toBe(10);
    });

    it('says nothing at all about a yield of zero', () => {
      expect(yieldRowLayout(0)).toEqual({ glyphs: [], numerals: [] });
    });
  });

  /**
   * The shadow is baked into the atlas cell rather than instanced under each
   * disc — see `drawYieldCell`. What can be checked without a canvas is the
   * packing invariant that makes baking safe, and it is the one that bites: the
   * atlas cells are edge to edge with no gutter, so a shadow that reached past
   * the half-cell would print on the neighbouring mark.
   */
  describe('the glyph drop shadow', () => {
    it('is offset against the direction the stack runs in', () => {
      const disc = yieldDiscLayout();
      // Down and to the left, so each coin's shadow falls on the one before it.
      expect(disc.offsetX).toBeLessThan(0);
      expect(disc.offsetY).toBeGreaterThan(0);
    });

    it('stays inside its own atlas cell', () => {
      const disc = yieldDiscLayout();
      expect(disc.radius + Math.abs(disc.offsetX)).toBeLessThanOrEqual(0.5);
      expect(disc.radius + Math.abs(disc.offsetY)).toBeLessThanOrEqual(0.5);
      // And it leaves the voice disc smaller than a parchment roundel, which is
      // where the room for it came from.
      expect(disc.radius).toBeLessThan(paperRadiusFraction());
    });

    it('is the voice\'s own colour, shaded toward ink', () => {
      for (const key of YIELD_KEYS) {
        const shadow = yieldShadowColor(key);
        const voice = YIELD_COLORS[key];
        expect(shadow).not.toBe(voice);
        // Darker in every channel: a shade of the disc, not a second hue.
        for (const shift of [16, 8, 0]) {
          expect((shadow >> shift) & 0xff).toBeLessThan((voice >> shift) & 0xff);
        }
      }
    });
  });

  it('draws every mark over the board, never inside it', () => {
    const state = flatState();
    for (const mesh of marksOver(state, 4, 4)) {
      expect(mesh.renderOrder).toBe(RENDER_ORDER.onTop);
      const material = mesh.material as MeshBasicMaterial;
      expect(material.depthTest).toBe(false);
    }
  });
});
