import { attackRange, pieceStrength } from '../../sim/combat';
import { explainUnitHeal, foldUnitHeal } from '../../sim/healing';
import { tileIndex } from '../../sim/map';
import type { Cell } from '../../sim/pathfind';
import { unitHealthBonus } from '../../sim/resourceEffects';
import { inheritGroundReadings } from '../../sim/slate';
import type { GameState, Unit } from '../../sim/state';
import { isCombatant, unitDef, unitMaxHp } from '../../sim/unitData';
import { fullMovement } from '../../sim/units';
import { VISIBLE } from '../../sim/visibility';
import type { AiConfig } from '../aiConfig';
import { foldTerms, type ValueTerm } from '../decision';
import {
  attackActions, distance, initialPosition, movementActions, projectAction, roleOf,
  targetCells, type TacticalAction, type TacticalPosition,
} from './position';

export interface TacticalStats { positions: number; forecasts: number; replies: number; cacheHits: number; limited: boolean }
export interface TacticalContext {
  root: GameState;
  playerId: number;
  units: readonly number[];
  enemies: readonly number[];
  cities: readonly number[];
  protectedUnits: readonly number[];
  locked: readonly number[];
  ai: AiConfig;
  stats: TacticalStats;
  worth: ReadonlyMap<number, number>;
}

export function combatWorth(state: GameState, ids: readonly number[]): Map<number, number> {
  const units = state.units.filter(unit => ids.includes(unit.id));
  const strength = (unit: Unit): number => Math.max(pieceStrength(unit), unitDef(unit.type).rangedStrength ?? 0, 1);
  const values = units.filter(unit => isCombatant(unitDef(unit.type))).map(strength).sort((a, b) => a - b);
  const typical = values[Math.floor(values.length / 2)] ?? 1;
  return new Map(units.map(unit => [unit.id, strength(unit) / typical]));
}

/** Health changes are charged once, from the initial board to the final board. */
export function positionTerms(ctx: TacticalContext, position: TacticalPosition, exposure = false): ValueTerm[] {
  const terms: ValueTerm[] = [];
  for (const id of [...ctx.units, ...ctx.protectedUnits, ...ctx.enemies]) {
    const before = ctx.root.units.find(unit => unit.id === id);
    if (!before) continue;
    const after = position.state.units.find(unit => unit.id === id && unit.ownerId === before.ownerId);
    const friendly = before.ownerId === ctx.playerId;
    const def = unitDef(before.type);
    const weights = ctx.ai.tactics.roles[roleOf(before)];
    const scale = ctx.worth.get(id) ?? 1;
    if (!isCombatant(def)) {
      if (!after) terms.push({ label: `${friendly ? 'Loss' : 'Capture'} of ${def.name} ${id}`, value: ctx.ai.tactics.civilian, op: friendly ? 'sub' : 'add' });
      continue;
    }
    const maxHp = unitMaxHp(before, unitHealthBonus(ctx.root, before.ownerId));
    const damage = before.hp - (after?.hp ?? 0);
    if (damage !== 0) terms.push({
      label: `${damage} health ${damage >= 0 ? 'lost by' : 'restored to'} ${def.name} ${id}`,
      value: damage / maxHp * 100 * scale * (friendly ? weights.loss * (exposure ? weights.exposure : 1) : weights.damage), op: friendly ? 'sub' : 'add',
    });
    if (!after) terms.push({
      label: `${friendly ? 'Loss' : 'Removal'} of ${def.name} ${id}`,
      value: scale * (friendly ? ctx.ai.military.counterLossCost * weights.loss * (exposure ? weights.exposure : 1) : ctx.ai.military.targetRemovalValue),
      op: friendly ? 'sub' : 'add',
    });
  }
  // Projections keep unchanged city records. Most field exchanges therefore
  // need no city walk, and a siege only needs the records it actually changed.
  if (ctx.root.cities !== position.state.cities) {
    for (const before of ctx.root.cities) {
      const friendly = before.ownerId === ctx.playerId;
      if (!friendly && !ctx.cities.includes(before.id)) continue;
      const after = position.state.cities.find(city => city.id === before.id);
      if (!after || after === before) continue;
      if (before.ownerId !== after.ownerId) {
        terms.push({ label: `${friendly ? 'Loss' : 'Capture'} of ${before.name}`, value: ctx.ai.tactics.city + ctx.ai.military.cityCaptureValue, op: friendly ? 'sub' : 'add' });
      } else if (before.hp !== after.hp) {
        terms.push({ label: `Wall damage at ${before.name}`, value: before.hp - after.hp, op: friendly ? 'sub' : 'add' });
      }
    }
  }
  if (position.camps) terms.push({ label: 'Camps cleared', value: position.camps * ctx.ai.tactics.camp });
  return terms;
}

export function quietTerms(ctx: TacticalContext, position: TacticalPosition): ValueTerm[] {
  const terms: ValueTerm[] = [];
  const targets = targetCells(position.state, ctx.enemies, ctx.cities);
  for (const id of ctx.units) {
    const before = ctx.root.units.find(unit => unit.id === id);
    const unit = position.state.units.find(unit => unit.id === id);
    if (!before || !unit) continue;
    const heal = foldUnitHeal(explainUnitHeal(position.state, unit));
    if (heal > 0) terms.push({ label: `Rest available to ${unitDef(unit.type).name} ${id}`, value: heal * ctx.ai.tactics.healing });
    if (targets.length && (before.col !== unit.col || before.row !== unit.row)) {
      const range = attackRange(position.state, unit);
      const gap = (piece: Unit): number => Math.min(...targets.map(target => Math.max(0, distance(position.state, piece, target) - range)));
      terms.push({ label: `Progress toward an attack for ${unitDef(unit.type).name} ${id}`,
        value: (gap(before) - gap(unit)) * ctx.ai.tactics.progress * ctx.ai.tactics.roles[roleOf(unit)].progress });
    }
  }
  return terms;
}

/**
 * Choose a few legal origins per target instead of forecasting every approach.
 * An existing shot comes first, then the cheapest move into range. This is a
 * heuristic for position choice only. The shared combat plan still decides
 * legality, terrain strength, counters and damage for each retained exchange.
 */
function replyChoices(ctx: TacticalContext, current: TacticalPosition, enemy: Unit, targets: readonly Cell[]): TacticalPosition[] {
  const results: TacticalPosition[] = [];
  let moves: TacticalAction[] | undefined;
  const movedPositions = new Map<TacticalAction, TacticalPosition | null>();
  const range = attackRange(current.state, enemy);
  const tryOrigin = (position: TacticalPosition, target: Cell): boolean => {
    const actor = position.state.units.find(unit => unit.id === enemy.id);
    if (!actor) return false;
    const action = attackActions(position.state, actor, [target])[0];
    if (!action) return false;
    ctx.stats.forecasts++;
    const result = projectAction(position, action);
    if (!result) return false;
    results.push(result.position);
    return true;
  };
  for (const target of targets) {
    let checked = Number(tryOrigin(current, target));
    if (checked >= ctx.ai.tactics.replyOrigins) continue;
    // Threats keep their full movement range. A two-hex friendly search must
    // not hide an enemy that can approach along a road or fire from farther away.
    moves ??= movementActions(current.state, enemy).filter(action => action.cost < enemy.movesLeft);
    const origins = moves.filter(action => {
      const gap = distance(current.state, action.to, target);
      return gap > 0 && gap <= range;
    }).sort((a, b) => a.cost - b.cost || distance(current.state, b.to, target) - distance(current.state, a.to, target));
    for (const move of origins) {
      if (!movedPositions.has(move)) movedPositions.set(move, projectAction(current, move)?.position ?? null);
      const moved = movedPositions.get(move);
      if (!moved || moved.terminal) continue;
      if (tryOrigin(moved, target)) checked++;
      if (checked >= ctx.ai.tactics.replyOrigins) break;
    }
  }
  return results;
}

/**
 * Construct one feasible response. Occupation and health change after each
 * attack, so enemies cannot share an origin or attack a target already removed.
 * Full allowances are a conservative next-opportunity scenario. The remaining
 * allowance scenario is evaluated separately; these are not added together.
 */
export function enemyReply(ctx: TacticalContext, position: TacticalPosition, full: boolean): TacticalPosition {
  const known = ctx.enemies;
  const state: GameState = {
    ...position.state,
    units: position.state.units.map(unit => known.includes(unit.id) && full
      ? { ...unit, movesLeft: fullMovement(unit, position.state), hasAttacked: false, firstAttackTurn: undefined } : unit),
    visibility: position.state.visibility.map((visible, owner) => {
      if (!known.some(id => position.state.units.some(unit => unit.id === id && unit.ownerId === owner))) return visible;
      const copy = visible.slice();
      for (const unit of position.state.units) if (unit.ownerId === ctx.playerId) copy[tileIndex(position.state.map, unit.col, unit.row)] = VISIBLE;
      for (const city of position.state.cities) if (city.ownerId === ctx.playerId) copy[tileIndex(position.state.map, city.col, city.row)] = VISIBLE;
      return copy;
    }),
  };
  inheritGroundReadings(position.state, state);
  let current = { ...initialPosition(state), captures: position.captures, camps: position.camps };
  const targetIds = [...ctx.units, ...ctx.protectedUnits];
  const cityIds = state.cities.filter(city => city.ownerId === ctx.playerId).map(city => city.id);
  for (let step = 0; step < ctx.ai.tactics.replies; step++) {
    let best: { position: TacticalPosition; score: number } | null = null;
    const before = foldTerms(positionTerms(ctx, current));
    for (const id of known) {
      const enemy = current.state.units.find(unit => unit.id === id);
      // Civilians cannot attack. A converted unit also stops being an enemy.
      // Skip them before pathfinding or forecasting rejected attacks.
      if (!enemy || enemy.ownerId === ctx.playerId || !isCombatant(unitDef(enemy.type)) ||
          enemy.movesLeft <= 0 || enemy.hasAttacked) continue;
      const targets = targetCells(current.state, targetIds, cityIds);
      if (ctx.ai.tactics.replyOrigins > 0) {
        for (const reply of replyChoices(ctx, current, enemy, targets)) {
          const score = before - foldTerms(positionTerms(ctx, reply));
          if (score > 0 && (best === null || score > best.score)) best = { position: reply, score };
        }
        continue;
      }
      const moves = movementActions(current.state, enemy)
        .filter(action => action.cost < enemy.movesLeft)
        .sort((a, b) => Math.min(...targets.map(target => distance(current.state, a.to, target))) - Math.min(...targets.map(target => distance(current.state, b.to, target))));
      const origins: (TacticalAction | null)[] = [null, ...moves.slice(0, ctx.ai.tactics.choices)];
      for (const move of origins) {
        const moved = move ? projectAction(current, move)?.position : current;
        if (!moved) continue;
        const attacker = moved.state.units.find(unit => unit.id === id);
        if (!attacker) continue;
        for (const action of attackActions(moved.state, attacker, targets)) {
          ctx.stats.forecasts++;
          const result = projectAction(moved, action);
          if (!result) continue;
          const score = before - foldTerms(positionTerms(ctx, result.position));
          if (score > 0 && (best === null || score > best.score)) best = { position: result.position, score };
        }
      }
    }
    if (!best) break;
    ctx.stats.replies++;
    current = best.position;
    if (current.terminal) break;
  }
  return current;
}
