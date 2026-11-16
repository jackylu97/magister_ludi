/**
 * The town and the farm of the north-star look (the visual test of 2026-11-12,
 * `docs/flags.md` item (nnnnnnn), "Towns and works in the test scene"). The
 * pictures are judged by eye. These tests pin the rules: the garrison's place
 * stays clear, a road gets a gate, the study's town comes back when the new
 * houses are not loaded, and a farm's plots stay on their hex.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { BoxGeometry, Float32BufferAttribute, MeshStandardMaterial } from 'three';
import { VIEW3D } from '../../src/render3d/lookData';
import { PaintedCityLayer, type PaintedCityAssets } from '../../src/render3d/paintedCities';
import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt, type GameMap } from '../../src/sim/map';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { resetVisibility, VISIBLE } from '../../src/sim/visibility';
// @ts-expect-error No declarations for the shared study geometry.
import { centre, prepareTerrainMap } from '../../src/terrainStudy/surface.js';
// @ts-expect-error No declarations for the shared study geometry.
import { NORTH_STAR_TOWN_AGES, NORTH_STAR_TOWN_ASSETS } from '../../src/terrainStudy/northStarAssets.js';
// @ts-expect-error No declarations for the shared study geometry.
import { northStarFarmPlan } from '../../src/terrainStudy/northStarWorks.js';
import { newGame } from '../sim/newGameHelpers';

const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0).reverse()) cleanup(); });

const STUDY = ['city-house', 'city-loggia', 'civic-sanctum', 'city-spire', 'city-dome', 'house'];
const MONUMENTS = ['monument-obelisk', 'monument-ziggurat', 'monument-armillary'];

function assets(names: readonly string[]): PaintedCityAssets {
  const material = new MeshStandardMaterial({ color: 'white', vertexColors: true });
  cleanups.push(() => material.dispose());
  return { material, ...Object.fromEntries(names.map(name => {
    const geometry = new BoxGeometry(.5, .5, .4); geometry.translate(0, .25, 0);
    geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3).fill(1), 3));
    cleanups.push(() => geometry.dispose());
    return [name, geometry];
  })) } as PaintedCityAssets;
}

function fixture(names: readonly string[]) {
  const state = newGame({ seed: 9, sizeName: 'duel', players: [
    { name: 'Red', color: '#ac3333', isHuman: true }, { name: 'Blue', color: '#3344ac', isHuman: true },
  ] });
  state.map = createMap({ width: 8, height: 6, terrain: 'grassland' });
  state.units = []; state.cities = []; state.nextEntityId = 1;
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  resetVisibility(state);
  const tile = getTileAt(state.map, 3, 2)!;
  const city = foundCityAt(state, 0, tile);
  state.visibility[0]!.fill(VISIBLE);
  const prepared = prepareTerrainMap(state.map, { wrap: true }) as GameMap;
  const layer = new PaintedCityLayer(assets(names), () => undefined);
  cleanups.push(() => layer.dispose());
  const c = centre(getTileAt(prepared, 3, 2)) as { x: number; z: number };
  const build = (): void => layer.build(state, prepared, state.visibility[0]!, true, { previewWalls: true });
  return { state, city, tile, prepared, layer, c, build };
}

describe.skipIf(!VIEW3D.visualTest.northStar)('the north-star town', () => {
  const town = VIEW3D.visualTest.town;

  it('stands a centre and the new houses, and keeps the garrison\'s place clear', () => {
    const f = fixture([...STUDY, ...MONUMENTS, ...NORTH_STAR_TOWN_ASSETS as string[]]);
    f.build();
    const pieces = f.layer.placements.filter(p => p.kind !== 'wall' && p.kind !== 'gate');
    expect(pieces.filter(p => p.kind === 'civic')).toHaveLength(1);
    const houses = pieces.filter(p => p.kind === 'house');
    expect(houses.length).toBeGreaterThanOrEqual(town.minHouses);
    for (const house of houses) expect(house.asset).toMatch(/^ns-house-[123][a-f]$/);
    for (const piece of pieces) for (const corner of piece.footprint) {
      const distance = Math.hypot(corner.x - f.c.x, corner.z - f.c.z);
      expect(distance).toBeGreaterThan(VIEW3D.pieces.base.radius);
      expect(distance).toBeLessThan(1);
    }
  });

  // The user, 2026-11-16: "lets have towns contain just huts in age 1, small buildings in age 2, but could we have
  // slightly more intricate buildings for age 3/4".
  it('draws the centre and the houses of its owner\'s age: a larger hut, a larger house, then a hall', () => {
    const byAge = town.byAge;
    try {
      town.byAge = true;
      const f = fixture([...STUDY, ...MONUMENTS, ...NORTH_STAR_TOWN_ASSETS as string[]]);
      const ages = NORTH_STAR_TOWN_AGES as { houses: string[]; centre: string }[];
      expect(ages.map(age => age.centre)).toEqual(['ns-great-hut', 'ns-great-house', 'ns-hall-3']);
      for (const age of [1, 2, 3, 4]) {
        f.state.players[0]!.techsResearched = TECH_IDS.filter(id => techDef(id).age <= age && techDef(id).charter !== true);
        f.build();
        const entry = ages[Math.min(3, age) - 1]!;
        const pieces = f.layer.placements.filter(p => p.cityId === f.city.id);
        expect(pieces.filter(p => p.kind === 'civic').map(p => p.asset), `age ${age}`).toEqual([entry.centre]);
        for (const house of pieces.filter(p => p.kind === 'house')) expect(entry.houses, `age ${age}`).toContain(house.asset);
        // No hall, and no tiled house, stands in a town of the first two ages.
        if (age < 3) for (const piece of pieces) expect(piece.asset).not.toMatch(/^ns-hall/);
      }
      // Ages 3 and 4 share one look, so the town is not cut again between them.
      expect(ages).toHaveLength(3);
    } finally { town.byAge = byAge; }
  });

  it('starts the smoke at the centre building, whatever else stands in the town', () => {
    const f = fixture([...STUDY, ...MONUMENTS, ...NORTH_STAR_TOWN_ASSETS as string[]]);
    f.build();
    const centre = f.layer.placements.find(p => p.kind === 'civic')!, smoke = f.layer.smokeAnchors.get(f.city.id)!;
    expect(smoke).toBeDefined();
    // Over the centre's own footprint, and above its floor: never a fixed place in the hex, and never the height of a monument.
    const xs = centre.footprint.map(p => p.x), zs = centre.footprint.map(p => p.z);
    expect(smoke.x).toBeGreaterThan(Math.min(...xs)); expect(smoke.x).toBeLessThan(Math.max(...xs));
    expect(smoke.z).toBeGreaterThan(Math.min(...zs)); expect(smoke.z).toBeLessThan(Math.max(...zs));
    expect(smoke.y).toBeGreaterThan(centre.y);
  });

  it('gives back the hall of before in every age when the switch is off', () => {
    const byAge = town.byAge;
    try {
      town.byAge = false;
      const f = fixture([...STUDY, ...MONUMENTS, ...NORTH_STAR_TOWN_ASSETS as string[]]);
      for (const age of [1, 3]) {
        f.state.players[0]!.techsResearched = TECH_IDS.filter(id => techDef(id).age <= age && techDef(id).charter !== true);
        f.build();
        const pieces = f.layer.placements.filter(p => p.cityId === f.city.id);
        expect(pieces.filter(p => p.kind === 'civic').map(p => p.asset)).toEqual(['ns-hall']);
        for (const house of pieces.filter(p => p.kind === 'house')) expect(house.asset).toMatch(new RegExp(`^ns-house-${age}[abc]$`));
      }
    } finally { town.byAge = byAge; }
  });

  it('reaches close to the hex edge with its wall', () => {
    const f = fixture([...STUDY, ...MONUMENTS, ...NORTH_STAR_TOWN_ASSETS as string[]]);
    f.build();
    const reach = Math.max(...f.layer.placements.filter(p => p.kind === 'wall').map(p => Math.abs(p.x - f.c.x)));
    expect(reach).toBeGreaterThan(Math.sqrt(3) / 2 - town.wallInset - .05);
  });

  it('opens a gate where a road leaves the town, and cuts the town again when the road is laid', () => {
    const f = fixture([...STUDY, ...MONUMENTS, ...NORTH_STAR_TOWN_ASSETS as string[]]);
    const eastWall = (): number => f.layer.placements.filter(p => p.kind === 'wall' && p.asset !== 'ns-tower'
      && p.x > f.c.x && Math.abs(p.z - f.c.z) < town.gateHalf * .8).length;
    f.build();
    expect(eastWall()).toBeGreaterThan(0);
    const gates = f.layer.placements.filter(p => p.kind === 'gate').length;
    f.tile.road = 0; getTileAt(f.state.map, 4, 2)!.road = 0;
    f.build();
    expect(eastWall()).toBe(0);
    expect(f.layer.placements.filter(p => p.kind === 'gate').length).toBe(gates + 1);
  });

  it('draws the study\'s town when the new houses are not loaded', () => {
    const f = fixture(STUDY);
    f.build();
    const pieces = f.layer.placements.filter(p => p.kind === 'house' || p.kind === 'civic');
    expect(pieces.length).toBeGreaterThan(0);
    for (const piece of pieces) expect(piece.asset.startsWith('ns-')).toBe(false);
  });
});

describe('the north-star farm plan', () => {
  const works = VIEW3D.visualTest.works;

  it('keeps four fields and a yard on the hex, for any tile', () => {
    const map = prepareTerrainMap(createMap({ width: 8, height: 6, terrain: 'grassland' }), { wrap: true }) as GameMap;
    for (const tile of map.tiles) {
      const plan = northStarFarmPlan(tile, works) as { yard: number[][]; fields: number[][][] };
      expect(plan.fields.length).toBe(4);
      expect(plan.yard.length).toBeGreaterThanOrEqual(3);
      for (const plot of [plan.yard, ...plan.fields]) for (const [x, z] of plot) expect(Math.hypot(x!, z!)).toBeLessThan(1);
    }
  });

  it('is the same plan each time for one tile', () => {
    const map = prepareTerrainMap(createMap({ width: 8, height: 6, terrain: 'grassland' }), { wrap: true }) as GameMap;
    expect(northStarFarmPlan(map.tiles[11], works)).toEqual(northStarFarmPlan(map.tiles[11], works));
  });
});
