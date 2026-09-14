import { foundCityAt } from '../sim/cities';
import { discoveryKindTech } from '../sim/discoveryData';
import { createMap, getTileAt } from '../sim/map';
import { newGame } from '../sim/state';
import { resetVisibility, VISIBLE } from '../sim/visibility';

export const WORLD_VIEWS = {
  borders: { col: 9, row: 6, label: 'Two-colour borders' },
  roads: { col: 9, row: 9, label: 'Road junctions & hills' },
  ruins: { col: 5, row: 12, label: 'Ancient ruins' },
  village: { col: 9, row: 12, label: 'Tribal village' },
  antiquity: { col: 13, row: 12, label: 'Buried antiquities' },
  camp: { col: 13, row: 3, label: 'Barbarian camp' },
  wreck: { col: 18, row: 9, label: 'Sea wreck' },
  seam: { col: 0, row: 6, label: 'Map wrap seam' },
} as const;
export type WorldView = keyof typeof WORLD_VIEWS;

/** Isolated inspection state; the production renderer consumes its live facts. */
export function createWorldFixture() {
  const state = newGame({ seed: 19, sizeName: 'duel', players: [
    { name: 'Western court', color: '#714291', secondary: '#c9ccd6', isHuman: true },
    { name: 'Eastern court', color: '#b34e37', secondary: '#e8c672', isHuman: true },
  ] });
  state.map = createMap({ width: 22, height: 16, terrain: 'grassland' });
  state.units = []; state.cities = []; state.camps = []; state.nextEntityId = 1;
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  resetVisibility(state);
  const tile = (col: number, row: number) => getTileAt(state.map, col, row)!;
  for (const t of state.map.tiles) {
    t.moisture = .55;
    if (t.col >= 17 && t.col <= 19) t.terrain = 'coast';
    if ((t.col >= 7 && t.col <= 11 && t.row >= 8 && t.row <= 10) || (t.col >= 12 && t.col <= 14 && t.row >= 11)) t.hills = true;
    if ((t.row <= 5 && t.col >= 6 && t.col <= 10) || (t.row === 9 && t.col >= 11 && t.col <= 14)) t.feature = 'forest';
  }
  const west = foundCityAt(state, 0, tile(5, 6)), east = foundCityAt(state, 1, tile(13, 6));
  west.population = 5; east.population = 4;
  for (const t of state.map.tiles) if (t.row >= 4 && t.row <= 8 && (t.col <= 15 || t.col >= 20))
    state.tileOwner[t.row * state.map.width + t.col] = t.col < 10 || t.col >= 20 ? west.id : east.id;
  // Concave corners and a hole exercise both ink rails.
  state.tileOwner[4 * state.map.width + 9] = null;
  state.tileOwner[5 * state.map.width + 8] = null;
  for (let col = 0; col < 22; col++) if (col < 17 || col > 19) tile(col, 7).road = 0;
  for (let row = 7; row <= 11; row++) tile(9, row).road = 0;
  for (let col = 7; col <= 13; col++) tile(col, 9).road = 0;
  tile(5, 6).road = 0; tile(13, 6).road = 1;
  tile(3, 10).road = 0;
  tile(11, 7).riverEdges = 1; tile(12, 7).riverEdges = 1 << 3;
  tile(5, 12).discovery = 'ruins'; tile(9, 12).discovery = 'village';
  tile(13, 12).discovery = 'antiquity'; tile(18, 9).discovery = 'wreck';
  state.camps.push({ col: 13, row: 3, foundedTurn: 0 });
  const tech = discoveryKindTech('antiquity');
  if (tech) state.players[0]!.techsResearched.push(tech);
  state.visibility.forEach(levels => levels.fill(VISIBLE));
  return state;
}
