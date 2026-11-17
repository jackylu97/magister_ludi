/**
 * **Why a card pays nothing now** (batch SS10, part 2): `cardIdleReason` in
 * `statecraft/evaluator.ts` and its words, `idleReasonWords` in
 * `statecraft/describers.ts`. The orders screen prints the words under "+0 now".
 *
 * The bench is the shared duel (`statecraftHelpers.ts`): two seats, at war from
 * the first turn, with no towns and no trade routes. A Doctrine is lent the
 * effects each case needs (`lendDoctrineEffects`), so the cases do not depend
 * on any one row's text.
 */

import { afterEach, describe, expect, it } from 'vitest';

import {
  type CardIdleReason,
  cardIdleReason,
  cardCanPay,
  idleReasonWords,
  stripRefs,
} from '../../src/sim/statecraft';
import {
  type CardEffect,
  type CityScope,
  type EmpireCondition,
  DOCTRINE_IDS,
  ORDER_IDS,
  doctrineDef,
  orderDef,
  orderIsDealt,
} from '../../src/sim/statecraftData';
import { game, lendDoctrineEffects } from './statecraftHelpers';

const DOCTRINE = DOCTRINE_IDS[0]!;

let restore: (() => void) | null = null;
afterEach(() => {
  restore?.();
  restore = null;
});

function lend(effects: readonly CardEffect[]): void {
  restore?.();
  restore = lendDoctrineEffects(DOCTRINE, effects);
}

const goldInEmpire = { kind: 'pays', where: 'empire', gold: 3 } as unknown as CardEffect;
const goldInCoastalTowns = { kind: 'pays', where: 'city', scope: { test: 'coastal' }, gold: 1 } as unknown as CardEffect;
const foreignRouteShare = {
  kind: 'pays',
  where: 'route',
  crossing: 'international',
  share: [{ yield: 'gold', percent: 100 }],
} as unknown as CardEffect;
const when = (test: EmpireCondition['test'], then: readonly CardEffect[]): CardEffect =>
  ({ kind: 'conditionRule', when: { test }, then }) as unknown as CardEffect;

describe('cardCanPay', () => {
  it('is true for a card with a pays clause, open or behind a condition', () => {
    lend([goldInEmpire]);
    expect(cardCanPay(DOCTRINE)).toBe(true);
    lend([when('atPeace', [goldInEmpire])]);
    expect(cardCanPay(DOCTRINE)).toBe(true);
  });

  it('is false for a card with no pays clause, which is a rule', () => {
    lend([when('atPeace', [])]);
    expect(cardCanPay(DOCTRINE)).toBe(false);
    lend([]);
    expect(cardCanPay(DOCTRINE)).toBe(false);
  });
});

describe('cardIdleReason', () => {
  it('names an empire condition that does not hold', () => {
    const { state } = game();
    // The bench's two seats are at war, so "while you are at peace" is shut.
    lend([when('atPeace', [goldInEmpire])]);
    expect(cardIdleReason(state, 0, DOCTRINE)).toEqual({ kind: 'condition', when: { test: 'atPeace' } });
  });

  it('gives no reason when the condition holds and the clause behind it has no gate', () => {
    const { state } = game();
    lend([when('atWar', [goldInEmpire])]);
    expect(cardIdleReason(state, 0, DOCTRINE)).toBeNull();
  });

  it('names a kind of town the empire has none of', () => {
    const { state } = game();
    lend([goldInCoastalTowns]);
    expect(cardIdleReason(state, 0, DOCTRINE)).toEqual({ kind: 'noTown', scope: { test: 'coastal' } });
  });

  it('names a missing trade route, with its crossing', () => {
    const { state } = game();
    lend([foreignRouteShare]);
    expect(cardIdleReason(state, 0, DOCTRINE)).toEqual({ kind: 'noRoute', crossing: 'international' });
  });

  it('gives no reason when another paying clause has no gate to name', () => {
    const { state } = game();
    lend([goldInCoastalTowns, goldInEmpire]);
    expect(cardIdleReason(state, 0, DOCTRINE)).toBeNull();
  });

  it('takes the first closed gate in the card’s own clause order', () => {
    const { state } = game();
    lend([when('atPeace', [goldInEmpire]), goldInCoastalTowns]);
    expect(cardIdleReason(state, 0, DOCTRINE)?.kind).toBe('condition');
    lend([goldInCoastalTowns, when('atPeace', [goldInEmpire])]);
    expect(cardIdleReason(state, 0, DOCTRINE)?.kind).toBe('noTown');
  });

  it('gives no reason for a rule card', () => {
    const { state } = game();
    lend([when('atPeace', [])]);
    expect(cardIdleReason(state, 0, DOCTRINE)).toBeNull();
  });
});

describe('idleReasonWords', () => {
  it('says each case in plain words', () => {
    expect(idleReasonWords({ kind: 'condition', when: { test: 'atPeace' } })).toBe('you are at war');
    expect(idleReasonWords({ kind: 'condition', when: { test: 'atWar' } })).toBe('you are at peace');
    expect(idleReasonWords({ kind: 'noTown', scope: { test: 'coastal' } })).toBe('you have no coastal city');
    expect(idleReasonWords({ kind: 'noTown', scope: { test: 'capital' } })).toBe('you do not hold your capital');
    expect(idleReasonWords({ kind: 'noRoute' })).toBe('you have no trade routes');
    expect(idleReasonWords({ kind: 'noRoute', crossing: 'international' })).toBe('you have no foreign trade routes');
    expect(idleReasonWords({ kind: 'noRoute', crossing: 'domestic' })).toBe('you have no domestic trade routes');
    expect(
      idleReasonWords({ kind: 'noRouteEnd', end: 'origin', scope: { test: 'coastal' } }),
    ).toBe('none of your trade routes starts at a coastal city');
    expect(idleReasonWords(null)).toBeNull();
  });

  it('words every empire condition, with no figure', () => {
    const tests: readonly EmpireCondition['test'][] = [
      'cityCountAtMost',
      'cityCountAtLeast',
      'authorityNegative',
      'authorityPositive',
      'happinessNegative',
      'atWar',
      'atPeace',
      'keepingRite',
      'atWarWithOpusBuilder',
      'rivalHoldsMoreTowns',
      'noMetEmpireAhead',
      'knowsUniqueTech',
    ];
    for (const test of tests) {
      const words = idleReasonWords({ kind: 'condition', when: { test, value: 3 } as EmpireCondition });
      expect(words, test).not.toBeNull();
      expect(words!, test).not.toMatch(/\d/);
    }
  });

  it('gives no words when the scope’s own words carry a figure', () => {
    const scope = { test: 'populationAtLeast', value: 6 } as unknown as CityScope;
    expect(idleReasonWords({ kind: 'noTown', scope })).toBeNull();
  });

  it('words every gate a live card can close, in plain words with no figure and no raw mark', () => {
    const reasons: CardIdleReason[] = [];
    const walk = (effects: readonly CardEffect[]): void => {
      for (const effect of effects) {
        if (effect.kind === 'conditionRule') {
          reasons.push({ kind: 'condition', when: effect.when });
          walk(effect.then);
        }
        if (effect.kind !== 'pays') continue;
        if (effect.where === 'city' && effect.scope !== undefined) reasons.push({ kind: 'noTown', scope: effect.scope });
        if (effect.where !== 'route') continue;
        reasons.push(effect.crossing === undefined ? { kind: 'noRoute' } : { kind: 'noRoute', crossing: effect.crossing });
        for (const end of ['origin', 'destination', 'eitherEnd'] as const) {
          const scope = effect[end];
          if (scope !== undefined) reasons.push({ kind: 'noRouteEnd', end, scope });
        }
      }
    };
    for (const id of ORDER_IDS) if (orderIsDealt(id)) walk(orderDef(id).effects);
    for (const id of DOCTRINE_IDS) if (doctrineDef(id).retired !== true) walk(doctrineDef(id).effects);
    expect(reasons.length).toBeGreaterThan(0);
    for (const reason of reasons) {
      const words = idleReasonWords(reason);
      if (words === null) continue;
      const plain = stripRefs(words);
      expect(plain, JSON.stringify(reason)).not.toMatch(/\d|\[\[|\]\]|undefined/);
      expect(plain.trim(), JSON.stringify(reason)).toBe(plain);
    }
  });
});
