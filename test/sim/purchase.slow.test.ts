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
import { playerById } from '../../src/sim/state';
import { unitDef } from '../../src/sim/unitData';
import { buyCommand, game } from './purchaseHelpers';

const WARRIOR: PurchasableItem = { kind: 'unit', id: 'warrior' };

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

    for (let turn = 0; turn < 40; turn++) {
      dispatch(live, { type: 'endTurn', playerId: 0 } as Command);
      dispatch(live, { type: 'endTurn', playerId: 1 } as Command);
    }
    expect(playerById(live.state, 0)!.gold).toBeGreaterThan(
      explainPurchaseCost(live.state, 0, town.id, WARRIOR, 'gold')!.total,
    );

    expect(dispatch(live, buyCommand(town.id, WARRIOR)).ok).toBe(true);
    dispatch(live, { type: 'endTurn', playerId: 0 } as Command);
    dispatch(live, { type: 'endTurn', playerId: 1 } as Command);
    expect(dispatch(live, buyCommand(town.id, WARRIOR)).ok).toBe(true);

    const replayed = replay(live.config, live.log);
    expect(snapshotState(replayed)).toEqual(snapshotState(live.state));
  });
});
