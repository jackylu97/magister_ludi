import { expect, it } from 'vitest';

import { sampleEmpireIncome } from '../../scripts/botAuditReadings';
import { readEmpireRates } from '../../src/sim/readings';
import { bumpRevision } from '../../src/sim/state';
import { found, game } from './statecraftHelpers';

it('includes empire Order income in the audit total and its individual yields', () => {
  const { state } = game();
  found(state, 0);
  const sc = state.players[0]!.statecraft;
  sc.orders = ['theArtDealers'];
  sc.slots[0] = { card: 'theArtDealers', sealedUntil: state.turn };
  bumpRevision(state);

  const conversionInputs = readEmpireRates(state, 0);
  const income = sampleEmpireIncome(state, 0);
  // The Art Dealers pays three gold for its own occupied chair. The conversion
  // input deliberately excludes this income to prevent cards reading themselves.
  expect(income.rates.goldPerTurn - (conversionInputs.goldPerTurn ?? 0)).toBeCloseTo(3);
  const oldTotal = ['food', 'production', 'gold', 'science', 'culture', 'faith']
    .reduce((sum, key) => sum + (conversionInputs[`${key}PerTurn` as keyof typeof conversionInputs] ?? 0), 0);
  expect(income.total - oldTotal).toBeCloseTo(3);
});
