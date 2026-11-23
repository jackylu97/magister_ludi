import { attackRange, hasLineOfSight } from '../../sim/combat';
import { getTileAt, mapRange, tileHex, tileIndex } from '../../sim/map';
import { economyStamp, inheritGroundReadings } from '../../sim/slate';
import type { GameState, Unit } from '../../sim/state';
import { fullMovement } from '../../sim/units';
import { isCombatant, isRanged, unitDef } from '../../sim/unitData';
import { isVisibleTo } from '../../sim/visibility';
import { unitTacticalTally } from './metrics';
import { distance, movementActions, type TacticalAction } from './position';

interface Reach {
  key: string;
  origins: TacticalAction[];
  range: number;
  reads: ReadonlySet<number>;
  occupancy: string;
  checked: GameState;
  coverage: Map<number, { scanned: number; origins: TacticalAction[] }>;
}
export interface Battlefield {
  state: GameState;
  units: readonly { id: number; col: number; row: number; facts: string }[];
  reaches: Map<number, Reach>;
  signatures: WeakMap<Unit, string>;
}
interface Entry { revision: number; turn: number; economy: number; field: Battlefield }
const FIELDS = new WeakMap<GameState, Map<number, Entry>>();

/**
 * Keep only information this player can see. Health changes need new combat
 * scores, but do not change movement paths. Reuse those paths between units.
 * Occupancy and economy changes conservatively rebuild affected reach queries.
 */
export function battlefield(state: GameState, playerId: number): Battlefield {
  let players = FIELDS.get(state);
  if (!players) FIELDS.set(state, players = new Map());
  const old = players.get(playerId);
  const economy = economyStamp(state);
  if (old?.revision === state.revision && old.turn === state.turn && old.economy === economy) return old.field;
  const visible = { ...state, units: state.units.filter(unit => unit.ownerId === playerId || isVisibleTo(state, playerId, unit.col, unit.row)) };
  inheritGroundReadings(state, visible);
  const reaches = old?.turn === state.turn && old.economy === economy
    ? old.field.reaches : new Map<number, Reach>();
  const units = visible.units.map(unit => {
    const { path: _path, ...facts } = unit;
    return { id: unit.id, col: unit.col, row: unit.row, facts: JSON.stringify(facts) };
  });
  const field = { state: visible, reaches, units, signatures: new WeakMap<Unit, string>() };
  players.set(playerId, { revision: state.revision, turn: state.turn, economy, field });
  return field;
}

export function occupancyWithin(field: Battlefield, reads: ReadonlySet<number>): string {
  return JSON.stringify(field.state.units.filter(unit => reads.has(tileIndex(field.state.map, unit.col, unit.row)))
    .map(unit => [unit.id, unit.ownerId, unit.type, unit.col, unit.row]));
}

/** Full movement is a next-opportunity estimate, independent of the enemy's spent turn. */
export function enemyReach(field: Battlefield, enemy: Unit): Reach {
  const state = field.state;
  let key = field.signatures.get(enemy);
  if (key === undefined) {
    const { hp: _hp, movesLeft: _moves, hasAttacked: _attacked, path: _path, ...facts } = enemy;
    key = JSON.stringify(facts);
    field.signatures.set(enemy, key);
  }
  const old = field.reaches.get(enemy.id);
  if (old?.key === key && (old.checked === state || old.occupancy === occupancyWithin(field, old.reads))) {
    old.checked = state;
    unitTacticalTally.reachReuses++; return old;
  }
  const fresh = { ...enemy, movesLeft: fullMovement(enemy, state), hasAttacked: false };
  const projected = { ...state, units: state.units.map(unit => unit.id === enemy.id ? fresh : unit) };
  inheritGroundReadings(state, projected);
  const stay: TacticalAction = { unitId: enemy.id, from: enemy, to: enemy, kind: 'hold', cost: 0, command: null };
  const reads = new Set<number>();
  const origins = [stay, ...movementActions(projected, fresh, undefined, reads).filter(move => move.cost < fresh.movesLeft)]
    .sort((a, b) => a.cost - b.cost);
  // A control source beside a tested edge can change its price. Include the
  // blocked frontier, not only destinations, so newly opened routes invalidate.
  const tested = [...reads];
  for (const index of tested) for (const tile of mapRange(state.map, tileHex(state.map.tiles[index]!), 1)) reads.add(tileIndex(state.map, tile.col, tile.row));
  const result: Reach = { key, origins, range: attackRange(state, enemy), reads, occupancy: occupancyWithin(field, reads), checked: state,
    coverage: new Map() };
  field.reaches.set(enemy.id, result);
  unitTacticalTally.reachBuilds++;
  return result;
}

/** Cheap coverage includes real paths and sight, but is not a promised enemy sequence. */
export function threateningOrigin(
  field: Battlefield, enemy: Unit, target: Unit,
  accepts: (origin: TacticalAction) => boolean = () => true,
): TacticalAction | undefined {
  if (!isCombatant(unitDef(enemy.type))) return undefined;
  const reach = enemyReach(field, enemy);
  const index = tileIndex(field.state.map, target.col, target.row);
  // The same destination occurs in movement, attack and low-roll candidates.
  // Coverage depends on the range's guarded paths and terrain, not target health.
  let coverage = reach.coverage.get(index);
  if (!coverage) reach.coverage.set(index, coverage = { scanned: 0, origins: [] });
  const cached = coverage.origins.find(accepts);
  if (cached) return cached;
  const tile = getTileAt(field.state.map, target.col, target.row)!;
  // Most queries need only the first origin. Scan farther only when another
  // candidate occupies it or another enemy already uses it in this estimate.
  while (coverage.scanned < reach.origins.length) {
    const origin = reach.origins[coverage.scanned++]!;
    const gap = distance(field.state, origin.to, target);
    if (gap <= 0 || gap > reach.range || (isRanged(unitDef(enemy.type)) &&
      !hasLineOfSight(field.state.map, getTileAt(field.state.map, origin.to.col, origin.to.row)!, tile))) continue;
    coverage.origins.push(origin);
    if (accepts(origin)) return origin;
  }
  return undefined;
}
