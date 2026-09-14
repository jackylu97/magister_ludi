import { foundCityAt } from '../sim/cities';
import { improvementErrorAt } from '../sim/improvements';
import { createMap, getTileAt, type Tile } from '../sim/map';
import { createUnit, newGame } from '../sim/state';
import { resetVisibility, VISIBLE } from '../sim/visibility';

export const WORKS_VIEWS = {
  plantation: { col: 4, row: 6, label: 'Plantation · wine', note: 'Cultivated shrubs, painted beds and a small farmhouse.' },
  plantationHills: { col: 5, row: 8, label: 'Plantation · tea hills', note: 'Rows follow the hill faces; the farmhouse has a fitted foundation.' },
  reeds: { col: 4, row: 10, label: 'Plantation · reeds', note: 'Cultivated reed beds retain the resource’s own silhouette.' },
  lumbermill: { col: 9, row: 6, label: 'Lumbermill · forest', note: 'A timber shed and log yard in a small clearing; the forest remains.' },
  lumbermillHills: { col: 10, row: 8, label: 'Lumbermill · jungle hills', note: 'Upright workshop and log stacks fitted to the slope, with surrounding canopy.' },
  fishingBoats: { col: 13, row: 6, label: 'Fishing boats · coast', note: 'Small working boats share the water with fish, pearls and whales.' },
  academy: { col: 4, row: 13, label: 'Academy', note: 'An open colonnade and carved pediment, with space in front for a unit.' },
  landmark: { col: 7, row: 13, label: 'Landmark', note: 'A gilt-tipped stone obelisk; the horse resource remains visible beside it.' },
  manufactory: { col: 10, row: 13, label: 'Manufactory · iron hills', note: 'A terracotta kiln and workshop on fitted masonry; exposed iron remains in front.' },
  customsHouse: { col: 11, row: 16, label: 'Customs house · coast', note: 'A trading hall with open arcades, tiered eaves and a small gilt vane.' },
  citadel: { col: 4, row: 16, label: 'Citadel · hills', note: 'An open fort with individually supported walls. The courtyard retains the hill surface.' },
  holySite: { col: 7, row: 16, label: 'Holy site', note: 'A ring of standing stones and a rear votive altar, with the center open.' },
  academyHills: { col: 4, row: 18, label: 'Academy · hills', note: 'The colonnade stays upright on a fitted foundation, above the natural hill faces.' },
  holySiteHills: { col: 7, row: 18, label: 'Holy site · hills', note: 'Each standing stone is supported separately, leaving the hill exposed inside the circle.' },
} as const;
export type WorksView = keyof typeof WORKS_VIEWS;

/** A gallery fixture, never a saved game or a mutation of the running game. */
export function createWorksFixture() {
  const state = newGame({ seed: 19, sizeName: 'duel', players: [
    { name: 'The review town', color: '#984d36', isHuman: true },
  ] });
  state.map = createMap({ width: 20, height: 21, terrain: 'grassland' });
  state.units = []; state.cities = []; state.camps = []; state.nextEntityId = 1;
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  resetVisibility(state);
  const tile = (col: number, row: number): Tile => getTileAt(state.map, col, row)!;
  for (const t of state.map.tiles) {
    t.moisture = .55;
    if (t.col >= 12) t.terrain = t.col > 15 ? 'ocean' : 'coast';
    else {
      if (t.col < 6 && t.row > 8) t.terrain = 'plains';
      if (t.col >= 7 && t.col <= 11 && t.row >= 3 && t.row <= 8) t.feature = 'forest';
      if ((t.col >= 4 && t.col <= 6 || t.col >= 9 && t.col <= 10) && t.row >= 7 && t.row <= 8) t.hills = true;
      if (t.col >= 3 && t.col <= 5 && t.row === 2) t.terrain = 'mountain';
    }
  }
  tile(4, 6).resource = 'wine';
  Object.assign(tile(5, 8), { resource: 'tea', hills: true });
  Object.assign(tile(4, 10), { resource: 'reeds', terrain: 'plains', feature: 'none' });
  tile(10, 8).feature = 'jungle';
  tile(13, 6).resource = 'fish'; tile(13, 8).resource = 'pearls'; tile(15, 7).resource = 'whales';
  tile(6, 10).resource = 'wheat';
  Object.assign(tile(7, 13), { resource: 'horses', terrain: 'plains' });
  Object.assign(tile(10, 13), { resource: 'iron', hills: true });
  tile(9, 13).feature = 'forest'; tile(10, 12).feature = 'forest';
  for (const [col, row] of [[4, 16], [4, 18], [7, 18], [5, 18], [8, 18]]) tile(col!, row!).hills = true;
  tile(7, 16).resource = 'wine';

  const town = foundCityAt(state, 0, tile(8, 10));
  town.population = 4;
  state.tileOwner.fill(town.id);
  state.players[0]!.techsResearched.push('calendar', 'siegecraft', 'sailing', 'agriculture', 'bronzePanoply', 'husbandry');
  for (const [col, row, id] of [
    [4, 6, 'plantation'], [5, 8, 'plantation'], [4, 10, 'plantation'],
    [9, 6, 'lumbermill'], [10, 8, 'lumbermill'],
    [13, 6, 'fishingBoats'], [13, 8, 'fishingBoats'], [15, 7, 'fishingBoats'], [6, 10, 'farm'],
    [4, 13, 'academy'], [7, 13, 'landmark'], [10, 13, 'manufactory'],
    [11, 16, 'customsHouse'], [4, 16, 'citadel'], [7, 16, 'holySite'],
    [4, 18, 'academy'], [7, 18, 'holySite'],
  ] as const) {
    const ground = tile(col, row), refusal = improvementErrorAt(state, 0, ground, id);
    if (refusal) throw new Error(`Invalid painted works fixture: ${refusal}`);
    ground.improvement = id;
  }
  for (let col = 5; col <= 10; col++) tile(col, 9).road = 0;
  tile(8, 10).road = 0;
  createUnit(state, 0, 'worker', 8, 9);
  createUnit(state, 0, 'warrior', 7, 10);
  state.visibility[0]!.fill(VISIBLE);
  return state;
}
