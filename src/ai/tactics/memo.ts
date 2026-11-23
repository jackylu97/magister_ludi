import { unitTacticalTally } from './metrics';
import { battlefield, occupancyWithin, type Battlefield } from './field';
import { distance } from './position';
import { getTileAt, mapRange, tileHex, tileIndex } from '../../sim/map';
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

interface UnitEntry { economy: number; ai: AiConfig; jobs: string; facts: string; sight: readonly number[]; reads: ReadonlySet<number>; plan: TacticalPlan | null }
const UNIT_MEMO = new WeakMap<GameState, { turn: number; units: Map<number, UnitEntry> }>();

function unitFacts(field: Battlefield, unitId: number, radius: number, sight: readonly number[], reads: ReadonlySet<number>): string {
  const unit = field.state.units.find(row => row.id === unitId)!;
  return JSON.stringify([occupancyWithin(field, reads), sight.map(index => field.state.visibility[unit.ownerId]?.[index]),
    field.units.filter(row => distance(field.state, unit, row) <= radius).map(row => row.facts)]);
}

/**
 * The economy clock already protects ground, empire effects and movement
 * profiles. Between those changes, serialize visible unit facts once for the
 * player. Movement dependencies can extend beyond the local radius along roads.
 * Execution at the worker boundary still uses the full dependency guard.
 */
function cachedUnitPlan(state: GameState, playerId: number, unitId: number, ai: AiConfig, options: TacticalOptions): TacticalPlan | null {
  const field = battlefield(state, playerId);
  const unit = field.state.units.find(row => row.id === unitId);
  if (!unit) return null;
  let memo = UNIT_MEMO.get(state);
  if (!memo || memo.turn !== state.turn) UNIT_MEMO.set(state, memo = { turn: state.turn, units: new Map() });
  const economy = economyStamp(state);
  const jobs = JSON.stringify([options.excluded?.includes(unitId) ?? false, options.locked?.includes(unitId) ?? false]);
  const held = memo.units.get(unitId);
  const radius = ai.tactics.moveRadius ? ai.tactics.radius + ai.tactics.moveRadius : state.map.width + state.map.height;
  if (held && held.economy === economy && held.ai === ai && held.jobs === jobs &&
      held.facts === unitFacts(field, unitId, radius, held.sight, held.reads)) {
    unitTacticalTally.planReuses++;
    tacticalTally.cacheHits++;
    return held.plan;
  }
  if (!held) unitTacticalTally.firstAssessments++;
  else if (held.economy !== economy) unitTacticalTally.economyChanges++;
  else unitTacticalTally.localChanges++;
  const plan = planTacticalCombat(state, playerId, unitId, ai, options);
  const sight = mapRange(state.map, tileHex(getTileAt(state.map, unit.col, unit.row)!), radius).map(tile => tileIndex(state.map, tile.col, tile.row));
  const reads = new Set(plan?.reads ?? sight);
  if (!plan) for (const enemy of field.units) {
    if (distance(state, unit, enemy) > ai.tactics.radius) continue;
    for (const index of field.reaches.get(enemy.id)?.reads ?? []) reads.add(index);
  }
  const facts = unitFacts(field, unitId, radius, sight, reads);
  memo.units.set(unitId, { economy, ai, jobs, facts, sight, reads, plan });
  return plan;
}

/**
 * A distant order can leave a local fight unchanged. Reuse the assessment only
 * if its local facts, essential jobs, tuning and economy stamp still match.
 * The economy stamp also guards effects from changes outside the local area.
 */
export function cachedTacticalPlan(
  state: GameState, playerId: number, unitId: number, ai: AiConfig, options: TacticalOptions,
): TacticalPlan | null {
  if (ai.tactics.perUnit > 0) return cachedUnitPlan(state, playerId, unitId, ai, options);
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
