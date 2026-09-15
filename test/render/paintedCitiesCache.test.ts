import { afterEach, describe, expect, it } from 'vitest';
import {
  BoxGeometry, BufferGeometry, DoubleSide, Float32BufferAttribute, InstancedMesh, Mesh,
  MeshBasicMaterial, MeshStandardMaterial,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { wrapWidth } from '../../src/render3d/layout';
import { PaintedCityLayer, type PaintedCityAssets } from '../../src/render3d/paintedCities';
import { installPaintedSurface, uninstallPaintedSurface } from '../../src/render3d/paintedSurface';
import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt, tileIndex, type GameMap } from '../../src/sim/map';
import { newGame, type GameState } from '../../src/sim/state';
import { EXPLORED, VISIBLE, resetVisibility } from '../../src/sim/visibility';
// @ts-expect-error No declarations for the shared study geometry.
import { prepareTerrainMap } from '../../src/terrainStudy/surface.js';
// @ts-expect-error No declarations for the shared study geometry.
import { terrainMesh } from '../../src/terrainStudy/terrainMesh.js';

const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); });

// The approved GLBs' asymmetric bounds, so a stand-in fits and refuses where
// the real sculpt does. See `paintedCities.test.ts` for the same table.
const bounds: Record<string, [number[], number[]]> = {
  'city-house': [[-.235, -.022, -.2184], [.241, .6668, .28]],
  'city-loggia': [[-.245, -.026, -.1925], [.245, .601, .2865]],
  'civic-sanctum': [[-.305, -.0195, -.305], [.305, 1.1473, .415]],
  'city-spire': [[-.14, -.022, -.14], [.14, 1.14, .14]],
  'city-dome': [[-.187, -.026, -.187], [.187, .558, .187]],
  house: [[-.245, -.17, -.225], [.245, .538, .225]],
  temple: [[-.31, -.18, -.32], [.31, .71, .347]],
  'bell-tower': [[-.15, -.16, -.145], [.15, .91, .145]],
};

function cityAssets(): PaintedCityAssets {
  const material = new MeshStandardMaterial({ color: 'white', vertexColors: true });
  cleanups.push(() => material.dispose());
  const entries = Object.entries(bounds).map(([name, [min, max]]) => {
    const geometry = new BoxGeometry(max[0]! - min[0]!, max[1]! - min[1]!, max[2]! - min[2]!);
    geometry.translate((min[0]! + max[0]!) / 2, (min[1]! + max[1]!) / 2, (min[2]! + max[2]!) / 2);
    geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3).fill(1), 3));
    cleanups.push(() => geometry.dispose());
    return [name, geometry];
  });
  return { material, ...Object.fromEntries(entries) } as PaintedCityAssets;
}

function fixture() {
  const state = newGame({ seed: 9, sizeName: 'duel', players: [
    { name: 'Red', color: '#ac3333', isHuman: true },
    { name: 'Blue', color: '#3344ac', isHuman: true },
  ] });
  state.map = createMap({ width: 8, height: 6, terrain: 'grassland' });
  state.units = []; state.cities = []; state.nextEntityId = 1;
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  resetVisibility(state);
  foundCityAt(state, 0, getTileAt(state.map, 3, 2)!);
  foundCityAt(state, 0, getTileAt(state.map, 6, 4)!);
  const [city, other] = state.cities as [typeof state.cities[number], typeof state.cities[number]];
  state.visibility[0]!.fill(VISIBLE);
  const prepared = prepareTerrainMap(state.map, { wrap: true }) as GameMap;
  const material = new MeshBasicMaterial({ side: DoubleSide }), tops: BufferGeometry[] = [];
  for (const tile of prepared.tiles) {
    const [top, side] = terrainMesh(tile) as [BufferGeometry, BufferGeometry]; side.dispose();
    for (const name of Object.keys(top.attributes)) if (name !== 'position') top.deleteAttribute(name);
    top.setAttribute('paintedCell', new Float32BufferAttribute(new Float32Array(top.getAttribute('position').count).fill(tileIndex(prepared, tile.col, tile.row)), 1));
    tops.push(top);
  }
  const terrain = mergeGeometries(tops)!; tops.forEach(top => top.dispose());
  const meshes = [-1, 0, 1].map(copy => {
    const mesh = new Mesh(terrain, material); mesh.position.x = copy * wrapWidth(state.map); return mesh;
  });
  installPaintedSurface(state.map, prepared, meshes);
  cleanups.push(() => { uninstallPaintedSurface(state.map); terrain.dispose(); material.dispose(); });
  const layer = new PaintedCityLayer(cityAssets(), () => undefined);
  cleanups.push(() => layer.dispose());
  const build = (levels: number[] | null = state.visibility[0]!, previewWalls = false): void => {
    layer.build(state, prepared, levels, true, { previewWalls });
  };
  return { state, city, other, prepared, layer, build };
}

/** The recipe's own identity: the anchor object a town's cut produced. */
const cut = (layer: PaintedCityLayer, id: number): unknown => layer.flagAnchors.get(id);
const meshesOf = (layer: PaintedCityLayer): unknown[] => layer.group.children.slice();

describe('the painted city recipes', () => {
  /**
   * The whole claim of the cache, stated as the thing it must never do: a town
   * whose look, size and ground are what they were is not cut again, and the
   * batches over it are not rebuilt either.
   */
  it('cuts a town once and keeps its batches while nothing about it moves', () => {
    const f = fixture(); f.build();
    const first = cut(f.layer, f.city.id), meshes = meshesOf(f.layer);
    expect(f.layer.group.children.length).toBeGreaterThan(0);
    f.build(); f.build();
    expect(cut(f.layer, f.city.id)).toBe(first);
    expect(meshesOf(f.layer)).toEqual(meshes);
  });

  /**
   * A stale key is a visible bug, so every field the cut reads is walked here
   * and asserted to move it. `sculptKey` derives the look's half by walking the
   * object, so a sixth sculpt fact joins the key the day it joins `CityLook` —
   * this table is the pin that the five that exist today are in it.
   */
  it('re-cuts the town for every fact the sculpt is drawn from', () => {
    const table: [string, (state: GameState, city: GameState['cities'][number]) => void][] = [
      ['population', (_state, city) => { city.population = 5; }],
      ['tier', (state) => { state.players[0]!.techsResearched = [...state.players[0]!.techsResearched, 'currency', 'kingship', 'irrigation']; }],
      ['walls', (_state, city) => { city.buildings = [...city.buildings, 'palisade']; }],
      ['shrine', (_state, city) => { city.buildings = [...city.buildings, 'shrine']; }],
      ['temple', (_state, city) => { city.buildings = [...city.buildings, 'temple']; }],
      ['wonders', (_state, city) => { city.buildings = [...city.buildings, 'pyramids']; }],
      ['capital', (state) => { state.cities.reverse(); }],
    ];
    for (const [name, change] of table) {
      const f = fixture(); f.build();
      const before = cut(f.layer, f.city.id);
      change(f.state, f.city); f.build();
      expect(`${name}: ${cut(f.layer, f.city.id) === before}`).toBe(`${name}: false`);
      for (const cleanup of cleanups.splice(0).reverse()) cleanup();
    }
  });

  /** The preview is a wall on a town that has not built one — a cut, not a tint. */
  it('re-cuts for the palisade preview and back again', () => {
    const f = fixture(); f.build();
    const plain = cut(f.layer, f.city.id);
    const walls = (): number => f.layer.placements.filter(placement => placement.kind === 'wall').length;
    expect(walls()).toBe(0);
    f.build(f.state.visibility[0]!, true);
    expect(cut(f.layer, f.city.id)).not.toBe(plain);
    expect(walls()).toBeGreaterThan(0);
    f.build();
    expect(walls()).toBe(0);
  });

  /**
   * The two facts in `CityLook` the *banner* owns. They are in `signCities` —
   * the board has to repaint for them — and deliberately not in the sculpt's
   * key, because no roof moves for a conversion. See `BANNER_ONLY`.
   */
  it('keeps the cut when only the banner changes', () => {
    const f = fixture(); f.build();
    const before = cut(f.layer, f.city.id);
    f.city.puppet = true; f.build();
    expect(cut(f.layer, f.city.id)).toBe(before);
  });

  /** A town out of sight is a town still standing; a town razed is not. */
  it('holds a hidden town\'s cut and drops a razed one\'s', () => {
    const f = fixture(); f.build();
    const before = cut(f.layer, f.city.id);
    f.state.visibility[0]!.fill(EXPLORED); f.build();
    expect(f.layer.flagAnchors.has(f.city.id)).toBe(false);
    f.state.visibility[0]!.fill(VISIBLE); f.build();
    expect(cut(f.layer, f.city.id)).toBe(before);
    const razed = f.city.id;
    f.state.cities = f.state.cities.filter(city => city.id !== razed); f.build();
    expect(f.layer.flagAnchors.has(razed)).toBe(false);
    expect(f.layer.placements.every(placement => placement.cityId !== razed)).toBe(true);
    // The other town's cut is untouched by its neighbour's fall.
    expect(f.layer.flagAnchors.has(f.other.id)).toBe(true);
  });

  /** One town changing must not re-cut the one next to it. */
  it('re-cuts only the town that changed', () => {
    const f = fixture(); f.build();
    const untouched = cut(f.layer, f.other.id);
    f.city.population = 4; f.build();
    expect(cut(f.layer, f.other.id)).toBe(untouched);
  });

  /** Every placement a build reports belongs to a town it drew this time. */
  it('reports the placements, anchors and heights of exactly the towns it drew', () => {
    const f = fixture(); f.build();
    const drawn = new Set(f.state.cities.map(city => city.id));
    expect(new Set(f.layer.placements.map(placement => placement.cityId))).toEqual(drawn);
    expect(new Set(f.layer.flagAnchors.keys())).toEqual(drawn);
    expect(new Set(f.layer.cityHeights.keys())).toEqual(drawn);
    f.state.visibility[0]!.fill(EXPLORED);
    f.state.visibility[0]![tileIndex(f.state.map, f.city.col, f.city.row)] = VISIBLE;
    f.build();
    expect(new Set(f.layer.placements.map(placement => placement.cityId))).toEqual(new Set([f.city.id]));
    expect([...f.layer.flagAnchors.keys()]).toEqual([f.city.id]);
    expect(f.layer.group.children.every(object => !(object instanceof InstancedMesh) || object.count > 0)).toBe(true);
  });

  /**
   * The shadow setting used to be part of the batch key, so turning shadows on
   * re-instanced every town on the map and re-merged all their ground pigment —
   * the one thing this layer's caches exist to avoid — to change a boolean.
   */
  it('takes the shadow toggle over the stones it already instanced', () => {
    const f = fixture();
    f.layer.build(f.state, f.prepared, f.state.visibility[0]!, true, {});
    const casting = f.layer.group.children.map(mesh => (mesh as Mesh).castShadow);
    const geometries = f.layer.group.children.map(mesh => (mesh as Mesh).geometry);
    expect(casting).toContain(true);

    f.layer.build(f.state, f.prepared, f.state.visibility[0]!, false, {});
    expect(f.layer.group.children.map(mesh => (mesh as Mesh).castShadow)).toEqual(casting.map(() => false));
    expect(f.layer.group.children.map(mesh => (mesh as Mesh).geometry)).toEqual(geometries);

    f.layer.setShadows(true);
    expect(f.layer.group.children.map(mesh => (mesh as Mesh).castShadow)).toEqual(casting);
    expect(f.layer.group.children.map(mesh => (mesh as Mesh).geometry)).toEqual(geometries);
    // Town pigment receives whichever way the switch is thrown: it is flat on
    // the ground and has nothing to gain from leaving the receiving set.
    expect(f.layer.group.children.every(mesh => (mesh as Mesh).receiveShadow)).toBe(true);
  });
});
