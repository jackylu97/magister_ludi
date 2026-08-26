/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — Statecraft's two
 * long replays.
 *
 * Both are long because the *sequence* is the subject. The first plays sixty
 * turns twice over, answering everything Statecraft is owed and then slotting,
 * unslotting and re-slotting every card into every slot, and asserts the two
 * runs agree byte for byte; the second reaches a draft the honest way over forty
 * turns so that the log can reproduce it. A draft, a doctrine and an adoption
 * are events tens of turns apart, and there is no short version of them.
 *
 * `statecraft.test.ts` keeps the card table's integrity, the meter, the draft's
 * dealing, the whole command matrix, seals, adoption, every hook family end to
 * end, and the twelve-turn save round-trip.
 */
import { describe, expect, it } from 'vitest';

import type { Command } from '../../src/sim/commands';
import { dispatch, replay, snapshotState } from '../../src/sim/game';
import type { PlayerStatecraft } from '../../src/sim/statecraft';
import { STARTING_GOVERNMENT } from '../../src/sim/statecraftData';
import { found, game } from './statecraftHelpers';

describe('determinism', () => {
  it('replays a full Statecraft sequence byte for byte', () => {
    const play = () => {
      const g = game(31);
      const player = g.state.players[0]!;
      const log: Command[] = [];
      const send = (command: Command): void => {
        if (dispatch(g, command).ok) log.push(command);
      };
      found(g.state, 0);
      for (let turn = 0; turn < 60; turn++) {
        // Answer everything Statecraft is owed, then slot, unslot and re-slot.
        if (player.statecraft.pendingOrder) {
          send({ type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
        }
        if (player.statecraft.pendingGovernment) {
          send({ type: 'adoptGovernment', playerId: 0, choiceIndex: 1 } as Command);
        }
        if (player.statecraft.pendingDoctrine) {
          send({ type: 'chooseDoctrine', playerId: 0, optionIndex: 0 } as Command);
        }
        for (const owned of player.statecraft.orders) {
          for (let i = 0; i < player.statecraft.slots.length; i++) {
            send({ type: 'slotOrder', playerId: 0, cardId: owned.id, slotIndex: i } as Command);
          }
        }
        for (let i = 0; i < player.statecraft.slots.length; i++) {
          send({ type: 'unslotOrder', playerId: 0, slotIndex: i } as Command);
        }
        // Culture the empire would never earn on a duel map in sixty turns; the
        // point is the *sequence*, not the economy.
        player.culturePool += 40;
        send({ type: 'endTurn', playerId: 0 });
        send({ type: 'endTurn', playerId: 1 });
      }
      return { snapshot: snapshotState(g.state), log, config: g.config };
    };

    const a = play();
    const b = play();
    expect(b.snapshot).toEqual(a.snapshot);
    expect(a.log.length).toBeGreaterThan(50);
    // The offers were real: the empire climbed and adopted.
    const drafted = JSON.parse(a.snapshot) as { players: { statecraft: PlayerStatecraft }[] };
    expect(drafted.players[0]!.statecraft.drafts).toBeGreaterThan(3);
    expect(drafted.players[0]!.statecraft.government).not.toBe(STARTING_GOVERNMENT);
  });

  it('replays a logged game with Statecraft commands in it', () => {
    const g = game(23);
    const log: Command[] = [];
    const send = (command: Command): void => {
      if (dispatch(g, command).ok) log.push(command);
    };
    const player = g.state.players[0]!;
    // Reach a draft the honest way, so the replay can reproduce it.
    for (let turn = 0; turn < 40; turn++) {
      if (player.statecraft.pendingOrder) {
        send({ type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
      }
      const unit = g.state.units.find((u) => u.ownerId === 0 && u.type === 'settler');
      if (unit) send({ type: 'foundCity', playerId: 0, settlerUnitId: unit.id } as Command);
      send({ type: 'endTurn', playerId: 0 });
      send({ type: 'endTurn', playerId: 1 });
    }
    const replayed = replay(g.config, log);
    expect(snapshotState(replayed)).toEqual(snapshotState(g.state));
  });

});
