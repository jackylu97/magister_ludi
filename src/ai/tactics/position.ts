/** Local projections keep the live state and its caches unchanged. */
import { attackRange, capturedCityHealth, combatContinuation, fortifyError, previewCombatSample, strikesAfterAttack, type CombatSample } from '../../sim/combat';
import type { Command } from '../../sim/commands';
import { getTileAt, tileHex, wrappedDistance } from '../../sim/map';
import { reachableTiles, snapMovement, type Cell } from '../../sim/pathfind';
import { unitHealthBonus } from '../../sim/resourceEffects';
import { inheritGroundReadings } from '../../sim/slate';
import { breakFortify, wakeInTrench, type GameState, type Unit } from '../../sim/state';
import { cardBehaviorRule } from '../../sim/statecraft/evaluator';
import { isCombatant, isRanged, unitDef, unitMaxHp } from '../../sim/unitData';
import type { MixRole } from '../aiConfig';

export type TacticalCommand = Extract<Command, { type: 'moveUnit' | 'attack' | 'fortify' | 'skipUnit' }>;
export interface TacticalAction {
  unitId: number;
  from: Cell;
  to: Cell;
  kind: 'hold' | 'move' | 'attack';
  cost: number;
  command: TacticalCommand | null;
}
export interface TacticalPosition {
  state: GameState;
  finished: readonly number[];
  actions: readonly TacticalAction[];
  captures: number;
  camps: number;
  /** Captures change empire effects. Replan after the real command resolves. */
  terminal: boolean;
}
export interface ProjectedAction {
  position: TacticalPosition;
  forecast?: CombatSample;
}

export function roleOf(unit: Unit): MixRole {
  const def = unitDef(unit.type);
  if (def.modelClass === 'siege') return 'siege';
  if (def.modelClass === 'mounted' || def.modelClass === 'mountedRanged') return 'mounted';
  return isRanged(def) ? 'ranged' : 'melee';
}

export function distance(state: GameState, a: Cell, b: Cell): number {
  const from = getTileAt(state.map, a.col, a.row);
  const to = getTileAt(state.map, b.col, b.row);
  return from && to ? wrappedDistance(state.map, tileHex(from), tileHex(to)) : Infinity;
}

export function initialPosition(state: GameState): TacticalPosition {
  return { state, finished: [], actions: [], captures: 0, camps: 0, terminal: false };
}

/** The move range already includes terrain, roads, occupation and control tolls. */
export function movementActions(state: GameState, unit: Unit, radius?: number, readTiles?: Set<number>): TacticalAction[] {
  return reachableTiles(state, unit, { swaps: false, radius, readTiles }).map(row => ({
    unitId: unit.id, from: { col: unit.col, row: unit.row }, to: { col: row.tile.col, row: row.tile.row },
    kind: 'move', cost: row.cost,
    command: { type: 'moveUnit', playerId: unit.ownerId, unitId: unit.id, target: { col: row.tile.col, row: row.tile.row } },
  }));
}

export function holdAction(state: GameState, unit: Unit): TacticalAction {
  return {
    unitId: unit.id, from: { col: unit.col, row: unit.row }, to: { col: unit.col, row: unit.row },
    kind: 'hold', cost: 0,
    command: fortifyError(unit, state) === null
      ? { type: 'fortify', playerId: unit.ownerId, unitId: unit.id } : null,
  };
}

export function attackAction(unit: Unit, to: Cell): TacticalAction {
  return { unitId: unit.id, from: { col: unit.col, row: unit.row }, to, kind: 'attack', cost: 0,
    command: { type: 'attack', playerId: unit.ownerId, unitId: unit.id, target: to } };
}

/** Targets come from the caller's known enemies, never from hidden occupants. */
export function attackActions(state: GameState, unit: Unit, targets: readonly Cell[]): TacticalAction[] {
  if (unit.movesLeft <= 0 || unit.hasAttacked) return [];
  const range = attackRange(state, unit);
  return targets.filter(target => distance(state, unit, target) <= range && distance(state, unit, target) > 0)
    .map(target => attackAction(unit, { col: target.col, row: target.row }));
}

/**
 * A short combat projection includes health, occupation, action budgets and
 * kill healing, ranks and attack counts. Economic rewards resolve on the real command;
 * they are not simulated by running commands against the game's random stream.
 */
export function projectAction(
  before: TacticalPosition, action: TacticalAction, sample: 'low' | 'middle' | 'high' = 'middle',
): ProjectedAction | null {
  const state = before.state;
  const original = state.units.find(unit => unit.id === action.unitId);
  if (!original || before.finished.includes(original.id)) return null;
  const actor: Unit = { ...original };
  const changed = new Map<number, Unit>([[actor.id, actor]]);
  const removed: number[] = [];
  let cities = state.cities;
  let players = state.players;
  let camps = state.camps;
  let terminal = before.terminal;
  let captures = before.captures;
  let campsCleared = before.camps;
  let forecast: CombatSample | undefined;
  let finished = before.finished;
  if (action.kind === 'hold') {
    if (fortifyError(actor, state) === null) {
      actor.fortified = true;
      delete actor.dugIn;
    }
    finished = [...finished, actor.id];
  } else if (action.kind === 'move') {
    actor.col = action.to.col;
    actor.row = action.to.row;
    actor.movesLeft = Math.max(0, snapMovement(actor.movesLeft - action.cost));
    breakFortify(actor);
    delete actor.path;
    delete actor.sleeping;
    // A move onto a known civilian or camp has arrival effects. End this
    // projection there so the next live assessment reads the actual result.
    const civilians = state.units.filter(unit => unit.ownerId !== actor.ownerId &&
      unit.col === actor.col && unit.row === actor.row && !isCombatant(unitDef(unit.type)));
    removed.push(...civilians.map(unit => unit.id));
    terminal = civilians.length > 0;
  } else {
    const result = previewCombatSample(state, actor.id, action.to, sample);
    if (!result.ok) return null;
    forecast = result;
    actor.hp = result.attackerHpAfter;
    if (result.attackerExperience !== undefined) Object.assign(actor, { experience: result.attackerExperience });
    const strikes = strikesAfterAttack(state, actor.ownerId, result.defenderCityId ?? result.defenderUnitId!);
    if (strikes !== state.players[actor.ownerId]?.strikesThisTurn) {
      players = players.map(player => player.id === actor.ownerId ? { ...player, strikesThisTurn: strikes } : player);
    }
    const defender = state.units.find(unit => unit.id === result.defenderUnitId);
    const killed = defender !== undefined && (result.plundersUnit || result.damageToDefender >= result.defenderHp);
    if (defender) {
      if (result.defenderConverted) {
        const converted = { ...defender, ownerId: actor.ownerId, movesLeft: 0 };
        converted.hp = unitMaxHp(converted, unitHealthBonus(state, actor.ownerId));
        breakFortify(converted);
        changed.set(defender.id, converted);
        terminal = true;
      } else if (killed || result.capturesUnit) removed.push(defender.id);
      else {
        const survivor = { ...defender, hp: result.defenderHp - result.damageToDefender, experience: result.defenderExperience };
        if (!state.players[survivor.ownerId]?.barbarian) wakeInTrench(survivor);
        changed.set(defender.id, survivor);
      }
    }
    if (result.defenderCityId !== null && result.cityPhase === 'walls') {
      cities = cities.map(city => city.id === result.defenderCityId
        ? { ...city, hp: Math.max(0, result.defenderHp - result.damageToDefender) } : city);
    }
    Object.assign(actor, combatContinuation(state, original, killed && !result.defenderConverted));
    if (!cardBehaviorRule(state, actor.ownerId, 'attackKeepsFortification', actor.type)) breakFortify(actor);
    if (actor.hp <= 0) removed.push(actor.id);
    else {
      if (result.capturedCityId !== null) {
        captures += 1;
        cities = cities.map(city => city.id === result.capturedCityId ? { ...city, ownerId: actor.ownerId, captured: true } : city);
        const captured = cities.find(city => city.id === result.capturedCityId)!;
        captured.hp = capturedCityHealth({ ...state, cities }, captured);
        terminal = true;
      }
      if (result.advances) {
        actor.col = action.to.col;
        actor.row = action.to.row;
        breakFortify(actor);
      }
    }
    delete actor.path;
    delete actor.sleeping;
  }
  if (actor.hp > 0 && state.players[actor.ownerId]?.barbarian !== true && (action.kind === 'move' || forecast?.advances)) {
    const was = camps.length;
    camps = camps.filter(camp => camp.col !== actor.col || camp.row !== actor.row);
    campsCleared += was - camps.length;
    if (was !== camps.length) terminal = true;
  }
  const projected: GameState = {
    ...state, cities, camps, players,
    units: state.units.filter(unit => !removed.includes(unit.id)).map(unit => changed.get(unit.id) ?? unit),
  };
  inheritGroundReadings(state, projected);
  return { position: { state: projected, finished, actions: [...before.actions, action], captures, camps: campsCleared, terminal }, forecast };
}

export function targetCells(state: GameState, enemyIds: readonly number[], cityIds: readonly number[]): Cell[] {
  const cells: Cell[] = [];
  for (const unit of state.units) if (enemyIds.includes(unit.id)) cells.push({ col: unit.col, row: unit.row });
  for (const city of state.cities) if (cityIds.includes(city.id) && !cells.some(cell => cell.col === city.col && cell.row === city.row)) {
    cells.push({ col: city.col, row: city.row });
  }
  return cells;
}
