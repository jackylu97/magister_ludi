/**
 * The bench `purchase.test.ts` and `purchase.slow.test.ts` share.
 *
 * The forty-turn replay is the only test in the concern that needs a *game*
 * rather than a state — every act in it is a command and the treasury is
 * *earned*, because a save is `{config, log}` and nothing else — so it is
 * slow-tier by shape and lives in the sibling file. The two lines it opens with
 * are the same two every other test opens with, so they live here rather than
 * being exported from a test file: importing a `.test.ts` from a `.test.ts`
 * re-registers its tests.
 */
import { createGame } from './newGameHelpers';
import type { Command } from '../../src/sim/commands';
import { getTileAt, neighborTiles, tileHex } from '../../src/sim/map';
import { bumpRevision, createUnit, type City, type GameState } from '../../src/sim/state';
import { type UnitTypeId } from '../../src/sim/unitData';
import type { PurchasableItem } from '../../src/sim/purchase';

export function game(seed = 11) {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
}

export function buyCommand(
  cityId: number,
  item: PurchasableItem,
  currency: 'faith' | 'gold' = 'gold',
  playerId = 0,
): Command {
  return { type: 'purchaseItem', playerId, cityId, item, currency } as Command;
}

/** Fill the ring to test a refused purchase. The caller sets up the city centre. */
export function fillPurchaseRing(state: GameState, city: City, type: UnitTypeId): void {
  const centre = getTileAt(state.map, city.col, city.row)!;
  for (const tile of neighborTiles(state.map, tileHex(centre))) {
    createUnit(state, city.ownerId, type, tile.col, tile.row);
  }
  bumpRevision(state);
}
