/**
 * **The draft pass** (batch B1, `docs/flags.md` (aaaaaa); the user, 2026-09-15:
 * *"how it's difficult to find the card you're looking for with our long spans
 * of time between drafts, and how expensive re-rolls are"*).
 *
 * Two changes to the *draw* and none to a card, each pinned here at the
 * mechanism: the reroll's ladder is **zeroed by adoption**, and the meter is
 * **flatter**, measured. Two more were ruled and dropped before landing (a line
 * to follow, a card held back from a passed hand — the separate-decks rework
 * of the pool made both redundant); nothing of either is pinned because
 * nothing of either shipped.
 */

import { describe, expect, it } from 'vitest';

import type { Command } from '../../src/sim/commands';
import { createGame, dispatch } from '../../src/sim/game';
import { adoptGovernmentAt, draftCost } from '../../src/sim/statecraft';
import { GOVERNMENT_TIERS, governmentsAtTier } from '../../src/sim/statecraftData';

function game(seed = 7) {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bey', color: '#1f8a85', isHuman: true },
    ],
    barbarians: false,
  });
}

describe('the reroll starts again under a new government', () => {
  /** Climbs the seat to the first charter and banks the offer, by drafts alone. */
  function climbToCharter(g: ReturnType<typeof game>): void {
    const player = g.state.players[0]!;
    const rung = GOVERNMENT_TIERS[0]!;
    for (let tier = 1; tier <= rung; tier++) {
      player.statecraft.drafts = tier - 1;
      player.statecraft.pendingOrder = { options: ['firstRites'] };
      dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
    }
    player.statecraft.drafts = rung;
    player.statecraft.pendingGovernment = { tier: rung, options: governmentsAtTier(rung) };
  }

  it('zeroes rerollsTaken on adoption, and nowhere else', () => {
    const g = game();
    const player = g.state.players[0]!;
    const sc = player.statecraft;
    sc.rerollsTaken = 3;
    // A pick and a pass leave the bill standing — the ladder is not a discount
    // for drafting.
    sc.pendingOrder = { options: ['firstRites', 'saltTithes'] };
    dispatch(g, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
    expect(sc.rerollsTaken).toBe(3);
    sc.pendingOrder = { options: ['saltTithes'] };
    dispatch(g, { type: 'skipOrderOffer', playerId: 0 } as Command);
    expect(sc.rerollsTaken).toBe(3);

    climbToCharter(g);
    sc.rerollsTaken = 3;
    const adopted = adoptGovernmentAt(g.state, player, 0);
    expect(adopted).not.toBeNull();
    expect(sc.rerollsTaken).toBe(0);
  });

  it('zeroes it through the command too', () => {
    const g = game();
    const sc = g.state.players[0]!.statecraft;
    climbToCharter(g);
    sc.rerollsTaken = 5;
    const result = dispatch(g, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 } as Command);
    expect(result.ok).toBe(true);
    expect(sc.rerollsTaken).toBe(0);
  });
});

describe('the meter, flatter', () => {
  it('keeps the opening cadence and eases every rung from the third', () => {
    // The first three rungs are what the first three drafts cost, and B1 asked
    // that they land on the turns they always did: the base and the second rung
    // are untouched, and the third is two culture under the 2.65 ladder's —
    // under a turn's income. The measurement (`docs/orders-and-doctrines.md`,
    // "The draft pass") saw the first three drafts land on turns 8 / 15 / 25
    // against 8 / 15 / 26.
    const BEFORE = (n: number): number => Math.floor(12 + 5 * n + n ** 2.65);
    expect(draftCost(0)).toBe(BEFORE(0));
    expect(draftCost(1)).toBe(BEFORE(1));
    expect(BEFORE(2) - draftCost(2)).toBe(2);
    // And every rung from the third is cheaper than it was — the whole of the
    // ruling, read as arithmetic.
    for (let n = 2; n <= 30; n++) expect(draftCost(n), `rung ${n}`).toBeLessThan(BEFORE(n));
  });
});
