import { readEmpire } from '../src/sim/readings';
import type { GameState } from '../src/sim/state';

/** Audit the same income as the HUD. Conversion inputs omit empire card payouts. */
export function sampleEmpireIncome(state: GameState, playerId: number) {
  const totals = readEmpire(state, playerId).totals;
  const rates = {
    foodPerTurn: totals.food,
    productionPerTurn: totals.production,
    goldPerTurn: totals.gold,
    sciencePerTurn: totals.science,
    culturePerTurn: totals.culture,
    faithPerTurn: totals.faith,
  };
  return { rates, total: Object.values(totals).reduce((sum, value) => sum + value, 0) };
}
