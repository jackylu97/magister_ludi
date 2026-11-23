/** Rank one unit's positions, then forecast only a small set of attacks. */
import { attackRange, fortifyBonus, hasLineOfSight, pieceStrength, previewCombatSample, type CombatSample } from '../../sim/combat';
import { getTileAt, mapRange, tileHex, tileIndex } from '../../sim/map';
import { unitHealthBonus } from '../../sim/resourceEffects';
import { RULES } from '../../sim/rulesData';
import { inheritGroundReadings } from '../../sim/slate';
import { breakFortify, isBarbarian, type GameState, type Unit } from '../../sim/state';
import { cardBehaviorRule } from '../../sim/statecraft/evaluator';
import { defenseBonus } from '../../sim/terrainData';
import { isCombatant, isRanged, unitDef, unitMaxHp } from '../../sim/unitData';
import { fullMovement } from '../../sim/units';
import { isVisibleTo, VISIBLE } from '../../sim/visibility';
import { atWar } from '../../sim/wars';
import type { AiConfig } from '../aiConfig';
import { foldTerms, type ValueTerm } from '../decision';
import { combatWorth, positionTerms, quietTerms, type TacticalContext } from './assessment';
import { battlefield, threateningOrigin, type Battlefield } from './field';
import { unitTacticalTally } from './metrics';
import type { TacticalOptions, TacticalPlan } from './planner';
import { attackActions, distance, holdAction, initialPosition, movementActions, projectAction, roleOf, targetCells,
  type TacticalAction, type TacticalPosition } from './position';

function health(state: GameState, unit: Unit): number {
  return unitMaxHp(unit, unitHealthBonus(state, unit.ownerId));
}

function freeOrigin(state: GameState, enemy: Unit, origin: TacticalAction): boolean {
  return !state.units.some(other => other.id !== enemy.id && isCombatant(unitDef(other.type)) &&
    other.col === origin.to.col && other.row === origin.to.row);
}

function threats(ctx: TacticalContext, field: Battlefield, unit: Unit, state: GameState) {
  const tile = getTileAt(state.map, unit.col, unit.row)!;
  const defence = Math.max(1, pieceStrength(unit) + defenseBonus(tile.terrain, tile.feature, tile.hills) + fortifyBonus(unit));
  return ctx.enemies.flatMap(id => {
    const enemy = state.units.find(piece => piece.id === id && piece.ownerId !== ctx.playerId);
    if (!enemy) return [];
    const origin = threateningOrigin(field, enemy, unit, from => freeOrigin(state, enemy, from));
    if (!origin) return [];
    // A ratio is a cheap ranking estimate, not a second combat resolver.
    const power = Math.max(pieceStrength(enemy), unitDef(enemy.type).rangedStrength ?? 0, 1);
    return [{ enemy, origin, estimate: RULES.combat.baseDamage * power / defence }];
  }).sort((a, b) => b.estimate - a.estimate || a.enemy.id - b.enemy.id);
}

/** Reuse known approaches, but validate the forecast on the candidate board. */
function replyForecast(
  ctx: TacticalContext, field: Battlefield, position: TacticalPosition, enemy: Unit,
  target: Unit, used: ReadonlySet<string>,
): { origin: TacticalAction; forecast: CombatSample } | null {
  let found: { origin: TacticalAction; forecast: CombatSample } | null = null;
  let attempts = 0;
  threateningOrigin(field, enemy, target, origin => {
    if (used.has(`${origin.to.col}:${origin.to.row}`) || !freeOrigin(position.state, enemy, origin) ||
      attempts >= ctx.ai.tactics.choices) return false;
    attempts++;
    const actor = { ...enemy, col: origin.to.col, row: origin.to.row,
      movesLeft: fullMovement(enemy, position.state) - origin.cost, hasAttacked: false, firstAttackTurn: undefined };
    if (origin.kind === 'move') breakFortify(actor);
    const visible = position.state.visibility[actor.ownerId]!.slice();
    visible[tileIndex(position.state.map, target.col, target.row)] = VISIBLE;
    const board = { ...position.state,
      units: position.state.units.map(other => other.id === actor.id ? actor : other),
      visibility: position.state.visibility.map((row, owner) => owner === actor.ownerId ? visible : row) };
    inheritGroundReadings(position.state, board);
    ctx.stats.forecasts++;
    const forecast = previewCombatSample(board, actor.id, target, 'middle');
    if (!forecast.ok) return false;
    found = { origin, forecast };
    return true;
  });
  return found;
}

function lossTerm(ctx: TacticalContext, unit: Unit, damage: number, future = false): ValueTerm {
  const weights = ctx.ai.tactics.roles[roleOf(unit)];
  const cost = Math.min(unit.hp, damage) / health(ctx.root, unit) * 100 +
    (damage >= unit.hp ? ctx.ai.military.counterLossCost : 0);
  return { label: future ? 'Expected damage and loss risk before the next action' : 'Immediate counter damage and loss risk',
    value: cost * (ctx.worth.get(unit.id) ?? 1) * weights.loss *
      (future ? weights.exposure * ctx.ai.tactics.threatConfidence : 1), op: 'sub' };
}

/**
 * Each enemy gets one attack estimate. Origins cannot be shared. We do not
 * search response sequences or assume the opponent always attacks this unit.
 * The forecast retains combat modifiers, terrain, fortification and water rules.
 */
function exposure(ctx: TacticalContext, field: Battlefield, position: TacticalPosition): { terms: ValueTerm[]; capturesCover: boolean } {
  const unit = position.state.units.find(row => row.id === ctx.units[0]);
  if (!unit) return { terms: [], capturesCover: false };
  const origins = new Set<string>();
  let damage = 0;
  let wallDamage = 0;
  let replies = 0;
  let capturesCover = false;
  for (const threat of threats(ctx, field, unit, position.state)) {
    if (replies >= ctx.ai.tactics.replies) break;
    const result = replyForecast(ctx, field, position, threat.enemy, unit, origins);
    if (!result) continue;
    const { origin, forecast } = result;
    const key = `${origin.to.col}:${origin.to.row}`;
    origins.add(key);
    replies++;
    capturesCover ||= forecast.advances;
    if (forecast.defenderUnitId === unit.id) damage += forecast.damageToDefender;
    else if (forecast.defenderCityId !== null) wallDamage += forecast.damageToDefender;
  }
  ctx.stats.replies += replies;
  return { terms: [lossTerm(ctx, unit, damage, true), { label: 'Expected wall damage at this position',
    value: wallDamage * ctx.ai.tactics.threatConfidence, op: 'sub' }], capturesCover };
}

/** A retreat or attack can leave civilians behind, even if the soldier survives. */
function civilianExposure(ctx: TacticalContext, field: Battlefield, position: TacticalPosition, capturesCover: boolean): ValueTerm[] {
  if (!ctx.protectedUnits.length) return [];
  const civilians = position.state.units.filter(unit => ctx.protectedUnits.includes(unit.id) && unit.ownerId === ctx.playerId);
  const target = civilians[0];
  if (!target) return [];
  const loss: ValueTerm[] = [{ label: 'Civilians left without effective cover can be captured',
    value: civilians.length * ctx.ai.tactics.civilian * ctx.ai.tactics.threatConfidence, op: 'sub' }];
  const guard = position.state.units.find(unit => unit.ownerId === ctx.playerId && isCombatant(unitDef(unit.type)) &&
    unit.col === target.col && unit.row === target.row);
  // Waiting behind a guard that a retained melee forecast kills is not safe.
  if (guard) return guard.id === ctx.units[0] && capturesCover ? loss : [];
  const passive = cardBehaviorRule(position.state, ctx.playerId, 'barbariansPassive');
  const used = new Set<string>();
  for (const id of ctx.enemies) {
    const enemy = position.state.units.find(unit => unit.id === id && unit.ownerId !== ctx.playerId);
    if (!enemy || !isCombatant(unitDef(enemy.type)) || isRanged(unitDef(enemy.type)) ||
      (passive && isBarbarian(position.state, enemy.ownerId))) continue;
    const result = replyForecast(ctx, field, position, enemy, target, used);
    if (result && (result.forecast.capturesUnit || result.forecast.plundersUnit)) {
      return loss;
    }
  }
  return [];
}

function cheapExposure(ctx: TacticalContext, field: Battlefield, position: TacticalPosition): number {
  const unit = position.state.units.find(row => row.id === ctx.units[0]);
  if (!unit) return 0;
  const damage = threats(ctx, field, unit, position.state).slice(0, ctx.ai.tactics.replies)
    .reduce((sum, row) => sum + row.estimate, 0);
  return foldTerms([lossTerm(ctx, unit, damage, true)]);
}

function attackEstimate(ctx: TacticalContext, state: GameState, unit: Unit, action: TacticalAction): number {
  const enemy = state.units.find(row => ctx.enemies.includes(row.id) && row.col === action.to.col && row.row === action.to.row);
  if (!enemy) return ctx.ai.tactics.city;
  if (!isCombatant(unitDef(enemy.type))) return ctx.ai.tactics.civilian;
  const power = Math.max(pieceStrength(unit), unitDef(unit.type).rangedStrength ?? 0, 1);
  const defence = Math.max(1, pieceStrength(enemy));
  const damage = RULES.combat.baseDamage * power / defence;
  const counter = isRanged(unitDef(unit.type)) ? 0 : RULES.combat.baseDamage * defence / power;
  return Math.min(enemy.hp, damage) / health(state, enemy) * 100 * (ctx.worth.get(enemy.id) ?? 1) +
    (damage >= enemy.hp ? ctx.ai.military.targetRemovalValue * (ctx.worth.get(enemy.id) ?? 1) : 0) +
    foldTerms([lossTerm(ctx, unit, counter)]);
}

function shots(ctx: TacticalContext, position: TacticalPosition): TacticalAction[] {
  const unit = position.state.units.find(row => row.id === ctx.units[0]);
  if (!unit || (ctx.locked.includes(unit.id) && !isRanged(unitDef(unit.type)))) return [];
  const targets = targetCells(position.state, ctx.enemies, ctx.cities);
  return attackActions(position.state, unit, targets).filter(action => !isRanged(unitDef(unit.type)) ||
    hasLineOfSight(position.state.map, getTileAt(position.state.map, unit.col, unit.row)!,
      getTileAt(position.state.map, action.to.col, action.to.row)!))
    .sort((a, b) => attackEstimate(ctx, position.state, unit, b) - attackEstimate(ctx, position.state, unit, a));
}

/** Reward a useful front line once, rather than paying for each nearby ally. */
function supportTerms(ctx: TacticalContext, position: TacticalPosition): ValueTerm[] {
  const unit = position.state.units.find(row => row.id === ctx.units[0]);
  if (!unit) return [];
  const ranged = isRanged(unitDef(unit.type));
  const supported = position.state.units.some(friend => friend.ownerId === ctx.playerId && friend.id !== unit.id &&
    isCombatant(unitDef(friend.type)) && isRanged(unitDef(friend.type)) !== ranged && distance(position.state, unit, friend) <= 1 &&
    ctx.enemies.some(id => {
      const enemy = position.state.units.find(row => row.id === id && row.ownerId !== ctx.playerId);
      if (!enemy) return false;
      const front = ranged ? friend : unit;
      const bow = ranged ? unit : friend;
      return distance(position.state, front, enemy) < distance(position.state, bow, enemy) &&
        distance(position.state, bow, enemy) <= attackRange(position.state, bow);
    }));
  return supported ? [{ label: ranged ? 'A melee ally protects this firing position' : 'Protects an allied firing position', value: ctx.ai.tactics.support }] : [];
}

function score(ctx: TacticalContext, field: Battlefield, position: TacticalPosition): ValueTerm[] {
  const danger = exposure(ctx, field, position);
  return [...positionTerms(ctx, position), ...quietTerms(ctx, position), ...supportTerms(ctx, position),
    ...danger.terms, ...civilianExposure(ctx, field, position, danger.capturesCover)];
}

export function planUnitCombat(
  root: GameState, playerId: number, unitId: number, ai: AiConfig, options: TacticalOptions,
): TacticalPlan | null {
  const field = battlefield(root, playerId);
  const state = field.state;
  const unit = state.units.find(row => row.id === unitId && row.ownerId === playerId);
  if (!unit || !isCombatant(unitDef(unit.type)) || options.excluded?.includes(unitId)) return null;
  const enemies = state.units.filter(enemy => atWar(state, playerId, enemy.ownerId) && distance(state, unit, enemy) <= ai.tactics.radius)
    .sort((a, b) => Number(isCombatant(unitDef(b.type))) - Number(isCombatant(unitDef(a.type))) || distance(state, unit, a) - distance(state, unit, b) || a.id - b.id)
    .slice(0, ai.tactics.enemies).map(enemy => enemy.id);
  const cities = state.cities.filter(city => atWar(state, playerId, city.ownerId) && isVisibleTo(state, playerId, city.col, city.row) &&
    distance(state, unit, city) <= ai.tactics.radius).map(city => city.id);
  if (!enemies.length && !cities.length) return null;
  unitTacticalTally.assessments++;
  const protectedUnits = state.units.filter(friend => friend.ownerId === playerId && !isCombatant(unitDef(friend.type)) &&
    friend.col === unit.col && friend.row === unit.row).map(friend => friend.id);
  const ctx: TacticalContext = { root: state, playerId, ai, units: [unitId], enemies, cities, protectedUnits, locked: options.locked ?? [],
    stats: { positions: 0, forecasts: 0, replies: 0, cacheHits: 0, limited: false }, worth: combatWorth(state, [unitId, ...enemies]) };
  const initial = initialPosition(state);
  const held = projectAction(initial, holdAction(state, unit))!.position;
  const reads = new Set<number>();
  const moves = ctx.locked.includes(unitId) ? [] : movementActions(state, unit, ai.tactics.moveRadius || undefined, reads)
    .filter(move => isVisibleTo(state, playerId, move.to.col, move.to.row));
  const ranked = moves.map(move => {
    const position = projectAction(initial, move)!.position;
    const possible = shots(ctx, position)[0];
    const actor = position.state.units.find(row => row.id === unitId)!;
    const danger = cheapExposure(ctx, field, position);
    const quick = foldTerms([...positionTerms(ctx, position), ...quietTerms(ctx, position), ...supportTerms(ctx, position)]) + danger +
      (possible ? attackEstimate(ctx, position.state, actor, possible) : 0);
    return { position, quick, danger, canAttack: possible !== undefined, arrivalValue: foldTerms(positionTerms(ctx, position)) };
  }).sort((a, b) => b.quick - a.quick);
  unitTacticalTally.tiles += ranked.length + 1;
  const direct = shots(ctx, initial);
  // A distant enemy is not yet a local fight. Keep the strategic marcher's
  // full route instead of issuing several two-hex moves through safe ground.
  if (!direct.length && !ranked.some(row => row.canAttack || row.arrivalValue > 0) && cheapExposure(ctx, field, held) === 0) return null;
  const finalists = [held, ...ranked.slice(0, ai.tactics.finalists).map(row => row.position)];
  // A tempting attack must not remove every escape from the cheap shortlist.
  const safest = [...ranked].sort((a, b) => b.danger - a.danger || b.quick - a.quick)[0];
  if (safest && !finalists.includes(safest.position)) finalists.push(safest.position);
  for (const shot of direct.slice(0, ai.tactics.attacks)) {
    ctx.stats.forecasts++;
    const result = projectAction(initial, shot);
    if (result) finalists.push(result.position);
  }
  // A moved archer may still shoot. Score that outcome now, execute only the move,
  // and reassess the actual board before sending the follow-up attack.
  for (const candidate of [...finalists]) {
    if (candidate.terminal || candidate.actions[0]?.kind !== 'move') continue;
    for (const shot of shots(ctx, candidate).slice(0, ai.tactics.attacks)) {
      ctx.stats.forecasts++;
      const result = projectAction(candidate, shot);
      if (result) finalists.push(result.position);
    }
  }
  const candidates = finalists.map(position => {
    ctx.stats.positions++;
    const terms = score(ctx, field, position);
    // A low roll can leave the target alive or the attacker on a different tile.
    if (position.actions.some(action => action.kind === 'attack') && ai.tactics.risk > 0) {
      let conservative = initial;
      for (const action of position.actions) {
        if (action.kind === 'attack') ctx.stats.forecasts++;
        const result = projectAction(conservative, action, 'low');
        if (!result) break;
        conservative = result.position;
        if (conservative.terminal) break;
      }
      terms.push({ label: 'Cost of the low-damage scenario',
        value: Math.max(0, foldTerms(terms) - foldTerms(score(ctx, field, conservative))) * ai.tactics.risk, op: 'sub' });
    }
    return { label: position.actions.map(action => `${action.unitId}: ${action.kind} (${action.to.col},${action.to.row})`).join('; '),
      score: foldTerms(terms), terms, chosen: false };
  });
  let best = 0;
  for (let i = 1; i < candidates.length; i++) if (candidates[i]!.score > candidates[best]!.score) best = i;
  candidates[best]!.chosen = true;
  unitTacticalTally.forecasts += ctx.stats.forecasts;
  for (const index of [...reads]) for (const tile of mapRange(state.map, tileHex(state.map.tiles[index]!), 1)) reads.add(tileIndex(state.map, tile.col, tile.row));
  for (const id of enemies) for (const index of field.reaches.get(id)?.reads ?? []) reads.add(index);
  return { action: finalists[best]!.actions[0]!, sequence: finalists[best]!.actions, candidates, stats: ctx.stats, units: [unitId], enemies, reads };
}
