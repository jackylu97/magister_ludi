/**
 * The bench `improvements.test.ts` and `improvements.slow.test.ts` share.
 *
 * The split between those two is cost: the core file asks what the rules refuse
 * on one hand-built board, and the slow one asks the chop's protection rule of
 * **every row in the resource table**, which is forty-odd fresh states. Both
 * start from the same blank grassland rectangle and the same worker standing in
 * a wood, so those three lines live here rather than in either test file —
 * importing a `.test.ts` from a `.test.ts` re-registers its tests and the suite
 * would count them twice.
 */
import { foundCityAt } from '../../src/sim/cities';
import { type Tile, createMap, getTileAt } from '../../src/sim/map';
import { type City, type GameState, type Unit, createUnit, newGame } from '../../src/sim/state';
import { TECH_IDS } from '../../src/sim/techData';
import { computeFreshwater } from '../../src/sim/water';
import { resetVisibility } from '../../src/sim/visibility';

/** A blank grassland rectangle, two seats, every technology known. */
export function bareState(width = 12, height = 10): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  for (const player of state.players) player.techsResearched = [...TECH_IDS];
  computeFreshwater(state.map);
  return state;
}

export function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** A player-0 city at (5, 5) and a worker standing in a wood at (5, 4). */
export function woodedWorker(): { state: GameState; worker: Unit; tile: Tile; city: City } {
  const state = bareState();
  const city = foundCityAt(state, 0, at(state, 5, 5));
  const tile = at(state, 5, 4);
  tile.feature = 'forest';
  const worker = createUnit(state, 0, 'worker', 5, 4);
  return { state, worker, tile, city };
}
