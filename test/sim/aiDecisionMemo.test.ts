/**
 * **What bot batch BP14 keeps for one decision gives back only what a fresh
 * reading would.**
 *
 * Two scopes keep readings for the length of one bot decision
 * (`nextBotDecision`, `src/ai/bot.ts`):
 *
 *   - the card and effect prices on each context (`inDecision`,
 *     `src/ai/decisionMemo.ts`; `explainCardEffects` and `explainEffects` in
 *     `src/ai/value.ts`), kept under the guards open when each was taken;
 *   - the two search fields of each board (`withFieldsHeld`,
 *     `src/sim/pathfind.ts`; `transitField` and `zocField`).
 *
 * The digest pins in `aiDigest.slow.test.ts` hold for two whole games that the
 * bots decide the same. These tests pin the rest:
 *
 *   - by case: what is kept, for how long, and that nothing is kept outside a
 *     scope or handed across a guard;
 *   - over a short game of real bot commands with both shadow checks on: every
 *     kept answer is taken again at the moment it is handed back and must
 *     equal it, and the memos did answer (or the walk proves nothing).
 */

import { describe, expect, it } from 'vitest';

import { botSitting, nextBotDecision, valueContext } from '../../src/ai/bot';
import {
  decisionMemoTally,
  inDecision,
  keepingEpoch,
  keepingScope,
  setDecisionMemoShadow,
  withGuard,
} from '../../src/ai/decisionMemo';
import { driveBots } from '../../src/ai/driver';
import { SITTING_PHASES } from '../../src/ai/sittingPhases';
import { explainCardEffects, explainEffects } from '../../src/ai/value';
import { applyCommand } from '../../src/sim/commands';
import { heldFieldsTally, transitField, withFieldsHeld, zocField } from '../../src/sim/pathfind';
import { setSlateShadow, slateShadow } from '../../src/sim/slate';
import { playerById } from '../../src/sim/state';
import { ORDER_IDS, orderDef } from '../../src/sim/statecraftData';
import { createGame } from './newGameHelpers';

const SEATS = [
  { name: 'Ada', color: '#a00' },
  { name: 'Bors', color: '#00a' },
  { name: 'Cato', color: '#0a0', persona: 'warmonger' },
  { name: 'Dido', color: '#aa0', persona: 'tall' },
];

function game(seed = 42) {
  return createGame({ seed, sizeName: 'duel', players: SEATS as never, barbarians: true });
}

/** An Order whose row carries effects, so its price is a walk of them. */
function someOrder() {
  const id = ORDER_IDS.find((order) => (orderDef(order).effects ?? []).length > 1)!;
  return { id, effects: orderDef(id).effects };
}

describe('the card prices kept for one decision', () => {
  it('keeps a price inside one decision and nowhere else', () => {
    const { state } = game();
    const ctx = valueContext(state, playerById(state, 0)!);
    const { id, effects } = someOrder();
    // Outside a decision every ask is fresh: equal, and never the same object.
    expect(keepingEpoch()).toBe(0);
    const a = explainCardEffects(id, effects, ctx);
    const b = explainCardEffects(id, effects, ctx);
    expect(b).not.toBe(a);
    expect(b).toEqual(a);
    let first: unknown = null;
    inDecision(() => {
      const kept = decisionMemoTally.cardKept;
      first = explainCardEffects(id, effects, ctx);
      expect(explainCardEffects(id, effects, ctx)).toBe(first);
      expect(decisionMemoTally.cardKept).toBe(kept + 1);
      expect(first).toEqual(a);
      // Nested scopes share the outer one.
      inDecision(() => expect(explainCardEffects(id, effects, ctx)).toBe(first));
    });
    // The next decision starts empty.
    inDecision(() => {
      const again = explainCardEffects(id, effects, ctx);
      expect(again).not.toBe(first);
      expect(again).toEqual(a);
    });
  });

  it('hands nothing across a guard', () => {
    const { state } = game();
    const ctx = valueContext(state, playerById(state, 0)!);
    const { id, effects } = someOrder();
    inDecision(() => {
      expect(keepingScope()).toBe('');
      const outside = explainCardEffects(id, effects, ctx);
      let inside: unknown = null;
      withGuard(() => {
        expect(keepingScope()).not.toBe('');
        // A price taken under a stand-in is kept under that guard alone.
        inside = explainCardEffects(id, effects, ctx);
        expect(inside).not.toBe(outside);
        expect(explainCardEffects(id, effects, ctx)).toBe(inside);
        // A second guard inside the first is a scope of its own.
        withGuard(() => expect(explainCardEffects(id, effects, ctx)).not.toBe(inside));
      });
      expect(keepingScope()).toBe('');
      expect(explainCardEffects(id, effects, ctx)).toBe(outside);
      // A later guard is a new one, and does not see the first guard's prices.
      withGuard(() => expect(explainCardEffects(id, effects, ctx)).not.toBe(inside));
    });
  });

  it('keeps an effects price by its town and its list', () => {
    const { state } = game();
    const ctx = valueContext(state, playerById(state, 0)!);
    const { effects } = someOrder();
    const town = state.cities.find((city) => city.ownerId === 0);
    inDecision(() => {
      const plain = explainEffects(effects, ctx);
      expect(explainEffects(effects, ctx)).toBe(plain);
      // Another list with the same effects is not the same list.
      expect(explainEffects([...effects], ctx)).not.toBe(plain);
      if (town !== undefined) {
        const here = explainEffects(effects, ctx, undefined, town);
        expect(here).not.toBe(plain);
        expect(explainEffects(effects, ctx, undefined, town)).toBe(here);
        // A copy of the town is another town for the memo.
        expect(explainEffects(effects, ctx, undefined, { ...town })).not.toBe(here);
      }
    });
  });
});

describe('the search fields held for one decision', () => {
  it('sweeps each board and seat once inside the scope, and afresh outside it', () => {
    const { state } = game();
    expect(zocField(state, 0)).not.toBe(zocField(state, 0));
    withFieldsHeld(() => {
      const zoc = zocField(state, 0);
      const transit = transitField(state, 0);
      expect(zocField(state, 0)).toBe(zoc);
      expect(transitField(state, 0)).toBe(transit);
      expect(zocField(state, 1)).not.toBe(zoc);
      // A board of its own (a copy with the pieces moved) is swept for itself.
      const copy = { ...state, units: state.units.map((unit) => ({ ...unit })) };
      expect(zocField(copy, 0)).not.toBe(zoc);
      expect(zocField(copy, 0)).toEqual(zoc);
      // A board written in place is swept again.
      const before = transitField(copy, 0);
      copy.units.pop();
      expect(transitField(copy, 0)).not.toBe(before);
    });
    const a = transitField(state, 0);
    expect(transitField(state, 0)).not.toBe(a);
    expect(transitField(state, 0)).toEqual(a);
  });
});

describe('a short game of real bot commands, with both shadow checks on', () => {
  it('hands back only what a fresh reading gives, and the memos answer', () => {
    const played = game(7);
    // The opening turns with no check, so the walk below reaches towns, cards
    // and soldiers.
    while (played.state.turn < 28 && played.state.winnerId === null) driveBots(played, { warn: () => {} });
    const cards = decisionMemoTally.cardKept;
    const effects = decisionMemoTally.effectsKept;
    const fields = heldFieldsTally.kept;
    // The spend arm's kept "nothing to buy" (bot batch BP16) is checked under
    // the same switch.
    const spends = decisionMemoTally.spendKept;
    const slate = slateShadow();
    setSlateShadow(true);
    setDecisionMemoShadow(true);
    let warnings = 0;
    try {
      while (played.state.turn < 36 && played.state.winnerId === null) {
        driveBots(played, {
          warn: () => {
            warnings += 1;
          },
        });
      }
    } finally {
      setDecisionMemoShadow(false);
      setSlateShadow(slate);
    }
    expect(warnings).toBe(0);
    expect(decisionMemoTally.cardKept - cards).toBeGreaterThan(0);
    expect(decisionMemoTally.effectsKept - effects).toBeGreaterThan(50);
    expect(heldFieldsTally.kept - fields).toBeGreaterThan(50);
    // Since bot batch BP16's phases the spend arm is asked once a sitting and
    // again only after the purse moved, so its memo is asked and seldom kept.
    expect(decisionMemoTally.spendAsked - spends).toBeGreaterThan(0);
  }, 120_000);
});

describe('the spend arm keeps "nothing to buy" for the sitting (bot batch BP16)', () => {
  it('keeps the answer while the purse stands, and reads again when the purse moves', () => {
    const played = game(7);
    while (played.state.turn < 20 && played.state.winnerId === null) driveBots(played, { warn: () => {} });
    // Find a seat whose spending phase closed with nothing to buy, and open
    // the phase again with nothing changed: the bank's answer is kept.
    for (const playerId of [0, 1, 2, 3]) {
      const sitting = botSitting(playerId);
      for (let step = 0; step < 40 && !sitting.closed.has('spending'); step++) {
        const decision = nextBotDecision(played.state, playerId, sitting);
        if (decision === null) break;
        expect(applyCommand(played.state, decision.command).ok).toBe(true);
      }
      if (!sitting.closed.has('spending') || sitting.spendQuiet.gold === null) continue;
      // One decision to take up what the last command changed, unapplied.
      nextBotDecision(played.state, playerId, sitting);
      const reopen = (): void => {
        for (const phase of SITTING_PHASES) if (phase !== 'spending') sitting.closed.add(phase);
        sitting.closed.delete('spending');
      };
      reopen();
      const asked = decisionMemoTally.spendAsked;
      const kept = decisionMemoTally.spendKept;
      nextBotDecision(played.state, playerId, sitting);
      expect(decisionMemoTally.spendAsked - asked).toBeGreaterThan(0);
      expect(decisionMemoTally.spendKept - kept).toBe(decisionMemoTally.spendAsked - asked);
      // A coin more in the purse is another key, so the gold bank is read
      // again (and the purse is an event that opens the phase by itself).
      playerById(played.state, playerId)!.gold += 1;
      const before = decisionMemoTally.spendKept;
      const askedBefore = decisionMemoTally.spendAsked;
      nextBotDecision(played.state, playerId, sitting);
      const asks = decisionMemoTally.spendAsked - askedBefore;
      expect(asks).toBeGreaterThan(0);
      expect(decisionMemoTally.spendKept - before).toBeLessThan(asks);
      return;
    }
    throw new Error('no seat had nothing to buy at turn 20');
  }, 120_000);
});
