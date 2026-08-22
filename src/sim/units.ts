/**
 * Unit queries: who is standing where, and who is allowed to.
 *
 * Pure reads over `GameState.units`. Nothing here mutates — creation lives in
 * `state.ts` (next to the id allocator), movement in `movement.ts`, and every
 * player-visible change goes through `commands.ts`.
 *
 * Stacking
 * --------
 * `rules.stacking.perCategoryPerTile` caps how many units of each category may
 * share a tile. At the default of 1 that is the Civ V rule: a settler and its
 * escort stand on the same hex, two escorts do not. The cap is counted per
 * category and *across owners*, because until combat exists two hostile
 * warriors cannot resolve who keeps the tile.
 *
 * Transit vs stopping
 * -------------------
 * They are different questions and the pathfinder needs both. Walking *through*
 * a friendly unit is fine — armies file past each other — but finishing a move
 * on top of one is not. An enemy unit blocks both: you may not slip past a
 * hostile army, so any tile holding a foreign unit is a wall for now.
 *
 * Contention under simultaneous turns
 * -----------------------------------
 * Every player acts inside one shared window, so two of them can reach for the
 * same tile in the same turn. Nothing here has to arbitrate that: these are
 * point-in-time reads of `state.units`, and `applyCommand` applies commands one
 * at a time in log order. The first mover's command finds the tile empty and
 * takes it; the second one's finds a foreign unit standing there and is rejected
 * cleanly, leaving its unit exactly where it was. Log order *is* the tie-break,
 * which is why a replay resolves every race the same way the live game did.
 * Standing orders resolving inside `resetMovement` are ordered by `state.units`
 * instead, for the same reason and with the same guarantee.
 *
 * The scan is linear. Unit counts stay in the hundreds and an array keeps
 * iteration order honest; a spatial index becomes worthwhile only when profiling
 * says so.
 */

import type { GameState, Unit } from './state';
import { type UnitCategory, unitDef } from './unitData';
import { RULES } from './rulesData';

/** Every unit standing on an offset cell, in `state.units` order. */
export function unitsOnTile(state: GameState, col: number, row: number): Unit[] {
  const result: Unit[] = [];
  for (const unit of state.units) {
    if (unit.col === col && unit.row === row) result.push(unit);
  }
  return result;
}

/** The first unit of `category` on a cell, ignoring `exceptId`. */
export function unitOnTile(
  state: GameState,
  col: number,
  row: number,
  category: UnitCategory,
  exceptId = -1,
): Unit | undefined {
  for (const unit of state.units) {
    if (unit.id === exceptId) continue;
    if (unit.col !== col || unit.row !== row) continue;
    if (unitDef(unit.type).category === category) return unit;
  }
  return undefined;
}

/** True when a unit not owned by `ownerId` stands on the cell. */
export function hasForeignUnit(
  state: GameState,
  col: number,
  row: number,
  ownerId: number,
): boolean {
  for (const unit of state.units) {
    if (unit.col === col && unit.row === row && unit.ownerId !== ownerId) return true;
  }
  return false;
}

/**
 * Whether one more unit of `category` fits on the cell. `exceptId` excludes a
 * unit from the count — a unit never blocks itself when it is asked whether it
 * may stay where it already is.
 */
export function hasStackingRoom(
  state: GameState,
  col: number,
  row: number,
  category: UnitCategory,
  exceptId = -1,
): boolean {
  const limit = RULES.stacking.perCategoryPerTile;
  let count = 0;
  for (const unit of state.units) {
    if (unit.id === exceptId) continue;
    if (unit.col !== col || unit.row !== row) continue;
    if (unitDef(unit.type).category !== category) continue;
    count += 1;
    if (count >= limit) return false;
  }
  return true;
}

/** The unit's full movement allowance, i.e. what `resetMovement` refills to. */
export function fullMovement(unit: Unit): number {
  return unitDef(unit.type).movement;
}

/**
 * True when the unit did nothing at all this turn: it spent no movement *and*
 * it did not attack.
 *
 * The attack half matters even though attacking zeroes the allowance, because
 * the two facts are separately observable and a rule that read only one of them
 * would be a rule waiting to be wrong — a unit that gained a free attack, or a
 * zero-movement siege engine that shot without moving, would heal on the turn it
 * fought. The name is the promise: rested means it rested.
 */
export function isRested(unit: Unit): boolean {
  return unit.movesLeft === fullMovement(unit) && !unit.hasAttacked;
}
