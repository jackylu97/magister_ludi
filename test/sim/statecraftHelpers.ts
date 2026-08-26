/**
 * The two lines `statecraft.test.ts` and `statecraft.slow.test.ts` both open
 * with.
 *
 * The concern's two long replays — sixty turns of slotting and unslotting, and
 * forty turns of reaching a draft the honest way — are slow-tier by shape and
 * live in the sibling file. They start from the same duel game and found a city
 * the same way as every other test here, so the fixture lives in a plain module:
 * importing a `.test.ts` from a `.test.ts` re-registers its tests and the suite
 * would count them twice.
 */
import { foundCityAt } from '../../src/sim/cities';
import { createGame } from '../../src/sim/game';
import { getTileAt } from '../../src/sim/map';
import type { GameState } from '../../src/sim/state';

export function game(seed = 7) {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
}

export function found(state: GameState, playerId: number) {
  const unit = state.units.find((u) => u.ownerId === playerId)!;
  return foundCityAt(state, playerId, getTileAt(state.map, unit.col, unit.row)!);
}
