import { economyStamp } from '../../sim/slate';
import type { GameState } from '../../sim/state';
import type { AiConfig } from '../aiConfig';
import { sameTacticalDependencies, tacticalDependencies, type TacticalDependencies } from './dependencies';
import { planTacticalCombat, tacticalTally, type TacticalOptions, type TacticalPlan } from './planner';

interface Entry {
  revision: number;
  economy: number;
  ai: AiConfig;
  options: string;
  facts: TacticalDependencies;
  plan: TacticalPlan;
}
const MEMO = new WeakMap<GameState, { turn: number; units: Map<number, Entry> }>();

/**
 * A distant order can leave a local fight unchanged. Reuse the assessment only
 * if its local facts, essential jobs, tuning and economy stamp still match.
 * The economy stamp also guards effects from changes outside the local area.
 */
export function cachedTacticalPlan(
  state: GameState, playerId: number, unitId: number, ai: AiConfig, options: TacticalOptions,
): TacticalPlan | null {
  let memo = MEMO.get(state);
  if (!memo || memo.turn !== state.turn) {
    memo = { turn: state.turn, units: new Map() };
    MEMO.set(state, memo);
  }
  const unit = state.units.find(row => row.id === unitId);
  if (!unit) return null;
  const economy = economyStamp(state);
  const jobs = JSON.stringify(options);
  const held = memo.units.get(unitId);
  if (held && held.ai === ai && held.economy === economy && held.options === jobs) {
    const command = held.plan.action.command ?? { type: 'fortify', playerId, unitId };
    const facts = held.revision === state.revision ? held.facts
      : tacticalDependencies(state, playerId, command, ai.tactics.radius, held.facts.centres);
    if (facts && sameTacticalDependencies(held.facts, facts, id => id)) {
      held.revision = state.revision;
      tacticalTally.cacheHits++;
      return held.plan;
    }
  }
  const plan = planTacticalCombat(state, playerId, unitId, ai, options);
  if (plan) {
    const command = plan.action.command ?? { type: 'fortify', playerId, unitId };
    const centres = [{ col: unit.col, row: unit.row }, ...('target' in command ? [command.target] : [])];
    const facts = tacticalDependencies(state, playerId, command, ai.tactics.radius, centres);
    if (facts) memo.units.set(unitId, { revision: state.revision, economy, ai, options: jobs, facts, plan });
  }
  return plan;
}
