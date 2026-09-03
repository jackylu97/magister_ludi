/**
 * What `zoc.test.ts` and `zoc.slow.test.ts` both build their boards out of.
 *
 * The zone-of-control rule is asked two ways: as a matrix on a board laid out by
 * hand, and as an *agreement* between the four readers of `stepCost`, swept over
 * twenty-five rough random boards. The second is slow-tier by shape and lives in
 * the sibling file; both start from the same blank state and put units on it the
 * same way, so those two lines live here rather than being exported from a test
 * file — importing a `.test.ts` from a `.test.ts` re-registers its tests.
 */
import { createMap } from '../../src/sim/map';
import type { Tile } from '../../src/sim/map';
import { type GameState, type Unit, createUnit, newGame } from '../../src/sim/state';
import type { UnitTypeId } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';
import { openEveryWar } from './warHelpers';

/** A blank state on flat grassland, with a second seat to be hostile with. */
export function flatState(width = 12, height = 10): GameState {
  const state = newGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  // Every pair of real seats declares (schema 56): a blow between two empires
  // at peace is refused, and this bench is not about the refusal. See
  // `test/sim/warHelpers.ts`.
  openEveryWar(state);
  return state;
}

export function unit(
  state: GameState,
  tile: Tile,
  type: UnitTypeId = 'warrior',
  ownerId = 0,
): Unit {
  return createUnit(state, ownerId, type, tile.col, tile.row);
}
