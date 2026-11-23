/** A bounded local search returns one command; the next decision reads its actual outcome. */
import { isCombatant, isRanged, unitDef } from '../../sim/unitData';
import type { GameState, Unit } from '../../sim/state';
import { isVisibleTo } from '../../sim/visibility';
import { atWar } from '../../sim/wars';
import { inheritGroundReadings } from '../../sim/slate';
import { fullMovement } from '../../sim/units';
import type { AiConfig } from '../aiConfig';
import { foldTerms, type BotCandidate, type ValueTerm } from '../decision';
import { combatWorth, enemyReply, positionTerms, quietTerms, type TacticalContext, type TacticalStats } from './assessment';
import {
  attackActions, distance, holdAction, initialPosition, movementActions, projectAction, targetCells,
  type TacticalAction, type TacticalPosition,
} from './position';

export interface TacticalOptions {
  /** Units with another essential duty are excluded from this engagement. */
  excluded?: readonly number[];
  /** These units can fire from their position but cannot leave it. */
  locked?: readonly number[];
}
export interface TacticalPlan {
  action: TacticalAction;
  sequence: readonly TacticalAction[];
  candidates: BotCandidate[];
  stats: TacticalStats;
  units: readonly number[];
  enemies: readonly number[];
}
interface Choice { position: TacticalPosition; quick: number }

/** Diagnostics do not enter scores or search limits. */
export const tacticalTally = { calls: 0, engagements: 0, positions: 0, forecasts: 0, replies: 0, limited: 0, cacheHits: 0 };

function actionKey(action: TacticalAction): string {
  return `${action.unitId}:${action.kind}:${action.to.col}:${action.to.row}`;
}
function label(action: TacticalAction): string {
  return `${action.unitId}: ${action.kind} (${action.to.col},${action.to.row})`;
}

function contextFor(state: GameState, playerId: number, anchor: Unit, ai: AiConfig, options: TacticalOptions): TacticalContext | null {
  const enemies = state.units.filter(unit => atWar(state, playerId, unit.ownerId) &&
    isVisibleTo(state, playerId, unit.col, unit.row) && distance(state, anchor, unit) <= ai.tactics.radius)
    .sort((a, b) => distance(state, anchor, a) - distance(state, anchor, b) || a.id - b.id)
    .slice(0, ai.tactics.enemies).map(unit => unit.id);
  const cities = state.cities.filter(city => atWar(state, playerId, city.ownerId) &&
    isVisibleTo(state, playerId, city.col, city.row) && distance(state, anchor, city) <= ai.tactics.radius).map(city => city.id);
  if (!enemies.length && !cities.length) return null;
  const units = state.units.filter(unit => unit.ownerId === playerId && isCombatant(unitDef(unit.type)) &&
    !options.excluded?.includes(unit.id) && distance(state, anchor, unit) <= ai.tactics.radius)
    .sort((a, b) => Number(b.id === anchor.id) - Number(a.id === anchor.id) || distance(state, anchor, a) - distance(state, anchor, b) || a.id - b.id)
    .slice(0, ai.tactics.units).map(unit => unit.id);
  if (!units.includes(anchor.id)) return null;
  const protectedUnits = state.units.filter(unit => unit.ownerId === playerId && !units.includes(unit.id) &&
    distance(state, anchor, unit) <= ai.tactics.radius)
    .sort((a, b) => Number(isCombatant(unitDef(a.type))) - Number(isCombatant(unitDef(b.type))) || distance(state, anchor, a) - distance(state, anchor, b) || a.id - b.id)
    .slice(0, ai.tactics.units).map(unit => unit.id);
  return {
    root: state, playerId, ai, units, enemies, cities, protectedUnits, locked: options.locked ?? [],
    stats: { positions: 0, forecasts: 0, replies: 0, cacheHits: 0, limited: false },
    worth: combatWorth(state, [...units, ...enemies, ...protectedUnits]),
  };
}

function quickScore(ctx: TacticalContext, position: TacticalPosition): number {
  return foldTerms([...positionTerms(ctx, position), ...quietTerms(ctx, position)]);
}

function optionsFor(ctx: TacticalContext, before: TacticalPosition, id: number): Choice[] {
  const unit = before.state.units.find(row => row.id === id);
  if (!unit || before.finished.includes(id) || unit.movesLeft <= 0) return [];
  const targets = targetCells(before.state, ctx.enemies, ctx.cities);
  const attacks = ctx.locked.includes(id) && !isRanged(unitDef(unit.type)) ? [] : attackActions(before.state, unit, targets);
  const movedLast = [...before.actions].reverse().find(action => action.unitId === id)?.kind === 'move';
  // Hidden occupants are removed from the planner's view. Do not turn that
  // missing information into a promise that an unseen destination is empty.
  const moves = ctx.locked.includes(id) || movedLast ? [] : movementActions(before.state, unit, ctx.ai.tactics.moveRadius || undefined)
    .filter(action => isVisibleTo(ctx.root, ctx.playerId, action.to.col, action.to.row));
  // Preserve an escape direction as well as progress toward an attack.
  const nearestEnemy = (action: TacticalAction): number => Math.min(...targets.map(target => distance(before.state, action.to, target)));
  const escape = [...moves].sort((a, b) => nearestEnemy(b) - nearestEnemy(a) || a.cost - b.cost)[0];
  const towards = [...moves].sort((a, b) => nearestEnemy(a) - nearestEnemy(b) || a.cost - b.cost);
  const moveChoices = [escape, ...towards.slice(0, ctx.ai.tactics.choices)].filter((action): action is TacticalAction => action !== undefined);
  const unique = [holdAction(before.state, unit), ...attacks, ...moveChoices].filter((action, index, all) =>
    all.findIndex(other => actionKey(action) === actionKey(other)) === index);
  const choices: Choice[] = [];
  for (const action of unique) {
    if (ctx.stats.positions >= ctx.ai.tactics.projections) { ctx.stats.limited = true; break; }
    ctx.stats.positions++;
    if (action.kind === 'attack') ctx.stats.forecasts++;
    const result = projectAction(before, action);
    if (!result || (ctx.locked.includes(id) && result.forecast?.advances)) continue;
    choices.push({ position: result.position, quick: quickScore(ctx, result.position) });
  }
  return choices;
}

function keepDifferentStarts(choices: readonly Choice[], limit: number): Choice[] {
  const kept: Choice[] = [];
  const keys: string[] = [];
  for (const choice of [...choices].sort((a, b) => b.quick - a.quick)) {
    const first = choice.position.actions[0];
    if (!first || keys.includes(actionKey(first))) continue;
    keys.push(actionKey(first));
    kept.push(choice);
    if (kept.length >= limit) break;
  }
  return kept;
}

/** Recheck movement when a low-damage branch left a different occupant alive. */
function conservativeSequence(ctx: TacticalContext, actions: readonly TacticalAction[]): TacticalPosition {
  let current = initialPosition(ctx.root);
  for (const original of actions) {
    const unit = current.state.units.find(row => row.id === original.unitId);
    if (!unit || unit.col !== original.from.col || unit.row !== original.from.row) break;
    const action = original.kind === 'move' ? movementActions(current.state, unit, ctx.ai.tactics.moveRadius || undefined).find(move => actionKey(move) === actionKey(original)) : original;
    if (!action) break;
    const result = projectAction(current, action, 'low');
    if (!result) break;
    current = result.position;
    if (current.terminal) break;
  }
  return current;
}

function assess(ctx: TacticalContext, position: TacticalPosition): ValueTerm[] {
  const own = positionTerms(ctx, position);
  const remaining = enemyReply(ctx, position, false);
  const sameAllowances = position.state.units.filter(unit => ctx.enemies.includes(unit.id)).every(unit =>
    unit.movesLeft === fullMovement(unit, position.state) && !unit.hasAttacked && unit.firstAttackTurn !== position.state.turn);
  const full = sameAllowances ? remaining : enemyReply(ctx, position, true);
  if (sameAllowances) ctx.stats.cacheHits++;
  const reply = foldTerms(positionTerms(ctx, remaining)) <= foldTerms(positionTerms(ctx, full)) ? remaining : full;
  const after = positionTerms(ctx, reply, true);
  const beforeReply = positionTerms(ctx, position, true);
  const result: ValueTerm[] = [
    { label: 'Our projected actions', value: foldTerms(own), parts: own },
    { label: 'Change after a feasible enemy reply', value: foldTerms(after) - foldTerms(beforeReply), parts: [
      { label: `After: ${reply.actions.map(label).join('; ') || 'no useful attack'}`, value: foldTerms(after), parts: after },
      { label: 'Before the reply', value: foldTerms(beforeReply), op: 'sub', parts: beforeReply },
    ] },
    ...quietTerms(ctx, reply),
  ];
  return result;
}

export function planTacticalCombat(
  state: GameState, playerId: number, unitId: number, ai: AiConfig, options: TacticalOptions = {},
): TacticalPlan | null {
  tacticalTally.calls++;
  // Hidden occupants must not change the search through pathfinding queries.
  const visible = { ...state, units: state.units.filter(unit => unit.ownerId === playerId || isVisibleTo(state, playerId, unit.col, unit.row)) };
  inheritGroundReadings(state, visible);
  state = visible;
  const anchor = state.units.find(unit => unit.id === unitId && unit.ownerId === playerId);
  if (!anchor || !isCombatant(unitDef(anchor.type))) return null;
  const ctx = contextFor(state, playerId, anchor, ai, options);
  if (!ctx) return null;
  const initial = initialPosition(state);
  let hold = initial;
  for (const id of ctx.units) {
    const unit = hold.state.units.find(row => row.id === id)!;
    hold = projectAction(hold, holdAction(hold.state, unit))!.position;
  }
  let frontier: Choice[] = [{ position: initial, quick: quickScore(ctx, initial) }];
  const candidates: Choice[] = [];
  const escapes: Choice[] = [];
  for (let depth = 0; depth < ai.tactics.depth && frontier.length; depth++) {
    const next: Choice[] = [];
    for (const parent of frontier) {
      if (parent.position.terminal) continue;
      for (const id of ctx.units) next.push(...optionsFor(ctx, parent.position, id));
    }
    if (depth === 0) {
      const targets = targetCells(state, ctx.enemies, ctx.cities);
      // Any group member can act first. Keep a retreat for each one so the
      // quick shortlist cannot trade away an ally whose safer move it dropped.
      for (const id of ctx.units) {
        const escape = next.filter(choice => choice.position.actions[0]?.kind === 'move' && choice.position.actions[0]?.unitId === id)
          .sort((a, b) => {
            const gap = (choice: Choice): number => Math.min(...targets.map(target => distance(state, choice.position.actions[0]!.to, target)));
            return gap(b) - gap(a);
          })[0];
        if (escape) escapes.push(escape);
      }
    }
    frontier = keepDifferentStarts(next, ai.tactics.beam);
    candidates.push(...frontier);
    if (ctx.stats.limited) break;
  }
  const finalists = keepDifferentStarts(candidates, ai.tactics.choices);
  for (const escape of escapes) {
    if (!finalists.some(row => actionKey(row.position.actions[0]!) === actionKey(escape.position.actions[0]!))) finalists.push(escape);
  }
  // Holding is always assessed first and wins equal scores.
  finalists.unshift({ position: hold, quick: quickScore(ctx, hold) });
  const rows: BotCandidate[] = [];
  let selected = 0;
  for (const candidate of finalists) {
    const terms = assess(ctx, candidate.position);
    if (candidate.position.actions.some(action => action.kind === 'attack') && ai.tactics.risk > 0) {
      const conservative = conservativeSequence(ctx, candidate.position.actions);
      const low = foldTerms(assess(ctx, conservative));
      const middle = foldTerms(terms);
      terms.push({ label: 'Cost of the low-damage scenario', value: Math.max(0, middle - low) * ai.tactics.risk, op: 'sub' });
    }
    const row = { label: candidate.position.actions.map(label).join('; '), score: foldTerms(terms), terms, chosen: false };
    rows.push(row);
    if (row.score > rows[selected]!.score) selected = rows.length - 1;
  }
  rows[selected]!.chosen = true;
  const sequence = finalists[selected]!.position.actions;
  const action = sequence.find(step => step.command !== null) ?? sequence[0]!;
  tacticalTally.engagements++;
  tacticalTally.positions += ctx.stats.positions;
  tacticalTally.forecasts += ctx.stats.forecasts;
  tacticalTally.replies += ctx.stats.replies;
  tacticalTally.cacheHits += ctx.stats.cacheHits;
  if (ctx.stats.limited) tacticalTally.limited++;
  return { action, sequence, candidates: rows, stats: ctx.stats, units: ctx.units, enemies: ctx.enemies };
}
