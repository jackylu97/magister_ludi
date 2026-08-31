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
import { ABILITY_TECH, TECH_IDS, type TechId, techDef } from '../../src/sim/techData';
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
  // **Every technology whose gift is a *thing***, and deliberately not the ones
  // whose gift is a *rule* (`TechDef.effects`, the tree pass of 2026-08-30).
  //
  // What every file sharing this fixture means by it is "nothing is gated" —
  // Currency is held so the roster question never comes up, Sailing is held so
  // the water is not the subject. What none of them means is "and seven rules of
  // the world have been rewritten": The Imperial Post keeps a town's roads for
  // nothing, Colonial Charters founds every city with a granary, The Floating
  // Fields pay every worked water hex a further food. Those belong in tests
  // about *those* nodes, and each has one.
  //
  // Derived rather than listed, so the eighth such node joins the exclusion by
  // being written rather than by somebody remembering this line.
  // The node that **opens the ocean** is left out for the same reason and by
  // the same kind of derivation: half the fixtures in these files are built out
  // of walls of ocean, and a seat holding The Astrolabe walks through them.
  const ruleNodes = new Set<TechId>(
    TECH_IDS.filter((id) => (techDef(id).effects ?? []).length > 0),
  );
  const ocean = ABILITY_TECH.get('oceanGoing');
  if (ocean !== undefined) ruleNodes.add(ocean);
  for (const player of state.players) {
    player.techsResearched = TECH_IDS.filter((id) => !ruleNodes.has(id));
  }
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
