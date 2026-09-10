/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — the purchase
 * log, replayed.
 *
 * A long replay, and long on purpose: every act is a **command** and the
 * treasury is *earned* rather than handed over, because a save is `{config,
 * log}` and nothing else. A game whose gold arrived by reaching into the state
 * is a game the replay cannot reproduce, and it would prove nothing about the
 * command — so the empire has to play forty turns before it can afford the thing
 * the test is about.
 *
 * `purchase.test.ts` keeps the three claims the concern is for — one price
 * evaluator, one completion routine, one gate — and every refusal, each of which
 * is a single call on a fresh state.
 */
import { describe, expect, it } from 'vitest';

import type { Command } from '../../src/sim/commands';
import { dispatch, replay, snapshotState } from '../../src/sim/game';
import { type PurchasableItem, explainPurchaseCost } from '../../src/sim/purchase';
import { getTileAt, neighborTiles, tileHex } from '../../src/sim/map';
import { playerById } from '../../src/sim/state';
import { unitDef } from '../../src/sim/unitData';
import { buyCommand, game } from './purchaseHelpers';

const WARRIOR: PurchasableItem = { kind: 'unit', id: 'warrior' };

/**
 * Walks every piece standing in a town onto a neighbouring hex, by command.
 *
 * "Move it first" is what item (hhhh) tells a player to do, and a determinism
 * suite may not do it any other way: the state is only ever touched through
 * `applyCommand` here, so the escort steps out on a `moveUnit` like anything
 * else and the step lands in the log the replay reads back.
 */
function marchOut(live: ReturnType<typeof game>, town: { col: number; row: number }): void {
  for (const piece of live.state.units.filter(
    (u) => u.ownerId === 0 && u.col === town.col && u.row === town.row,
  )) {
    for (const target of neighborTiles(live.state.map, tileHex(
      getTileAt(live.state.map, town.col, town.row)!,
    ))) {
      const moved = dispatch(live, {
        type: 'moveUnit',
        playerId: 0,
        unitId: piece.id,
        target: { col: target.col, row: target.row },
      } as Command);
      if (moved.ok && (piece.col !== town.col || piece.row !== town.row)) break;
    }
  }
}

describe('determinism', () => {
  it('replays a log with purchases in it, byte for byte', () => {
    // Every act is a **command** and the treasury is earned rather than handed
    // over, because a save is `{config, log}` and nothing else: a game whose
    // gold arrived by reaching into the state is a game the replay cannot
    // reproduce, and it would prove nothing about the command.
    const live = game();
    const settler = live.state.units.find((u) => unitDef(u.type).foundsCity)!;
    expect(
      dispatch(live, { type: 'foundCity', playerId: 0, settlerUnitId: settler.id } as Command).ok,
    ).toBe(true);
    const town = live.state.cities[0]!;

    // **Run until the treasury covers two warriors rather than for a fixed
    // forty turns** (re-aimed 2026-09-06, `docs/flags.md` item y): the age band
    // now prices the Æra I roster at ×1.25, a purchase converts the folded cost,
    // and forty turns of this seat's income no longer covers one. The budget is
    // a fixture of the economy, not the claim — the claim is that a log with two
    // purchases in it replays — so it is asked as a condition and bounded.
    const price = (): number =>
      explainPurchaseCost(live.state, 0, town.id, WARRIOR, 'gold')!.total;
    let turns = 0;
    while (playerById(live.state, 0)!.gold <= price() * 2 && turns < 120) {
      dispatch(live, { type: 'endTurn', playerId: 0 } as Command);
      dispatch(live, { type: 'endTurn', playerId: 1 } as Command);
      turns += 1;
    }
    expect(playerById(live.state, 0)!.gold).toBeGreaterThan(price());

    // **A bought unit stands on the city hex, or is not sold** (item (hhhh)), so
    // the hex has to be clear before each of the two purchases — and here that
    // is a *command* too, exactly like everything else in this log: the seat's
    // escort marches out, and after the first delivery the new warrior does. The
    // rule joining the replay is the point, not a detour around it.
    marchOut(live, town);
    expect(dispatch(live, buyCommand(town.id, WARRIOR)).ok).toBe(true);
    dispatch(live, { type: 'endTurn', playerId: 0 } as Command);
    dispatch(live, { type: 'endTurn', playerId: 1 } as Command);
    marchOut(live, town);
    expect(dispatch(live, buyCommand(town.id, WARRIOR)).ok).toBe(true);

    const replayed = replay(live.config, live.log);
    expect(snapshotState(replayed)).toEqual(snapshotState(live.state));
  });
});
