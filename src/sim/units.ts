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
import { cardUnitStat } from './statecraft';
import { type UnitCategory, isCivilian, unitDef } from './unitData';
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

/**
 * The unit's full movement allowance, i.e. what `resetMovement` refills to.
 *
 * **The** evaluator for a movement allowance, which is what lets `unitStatCard`
 * be one hook: Horse Lords, March Discipline, Far Runners, Master of Maps and
 * Imperium are five rows that all land here, and nothing writes a movement
 * number onto a unit. Floored at 1, because a card that could take a piece's
 * last point would be a card that removes it from the game.
 *
 * `state` is optional so that the pure question — "what does this *type* move" —
 * is still askable by a caller with no world in hand (a preview, a test). Every
 * caller inside the simulation passes it, because an allowance that ignored the
 * empire's law would be an allowance the board disagrees with.
 */
export function fullMovement(unit: Unit, state?: GameState): number {
  const base = unitDef(unit.type).movement;
  if (!state) return base;
  return Math.max(1, base + cardUnitStat(state, unit, 'movement'));
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
export function isRested(unit: Unit, state?: GameState): boolean {
  return unit.movesLeft === fullMovement(unit, state) && !unit.hasAttacked;
}

/**
 * Is this unit awaiting orders — the one predicate for "does this piece need
 * the player's attention before the turn can end", asked by End Turn's
 * blocker, the idle-unit camera cycle, and Skip Turn's own gate alike.
 *
 * A unit is idle when it **can still be told to do something and has not been
 * told**:
 *
 *     movesLeft > 0  &&  no stored path  &&  not fortified  &&  not asleep
 *       &&  not carrying a trade route
 *
 * The first four clauses and their reasoning are `ui/turnBlockers.ts`'s
 * original docblock, reproduced in full there — `movesLeft > 0` (a unit that
 * spent its allowance is finished for the turn, `hasAttacked` deliberately
 * never read), no stored `path` (a column mid-march has its orders), not
 * fortified (digging in *is* the order), not asleep (a civilian's fortify).
 *
 * **Trade is the fifth, and the fix this predicate exists for** (the routed
 * caravan bug, 2026-08-28). A laden caravan rests on its destination hex with
 * full movement and no `path` between legs — `marchTraders` aims the next leg
 * during resolution, not the moment it arrives — so the first four clauses
 * alone would flag it idle every single turn of a twenty-turn route. But a
 * caravan carrying a route is not a piece the player positions; `Unit.trade`
 * present *is* its standing order, the same way `fortifiedTurns` and
 * `sleeping` are standing orders for a soldier and a civilian. Presence is
 * again the state, so this reads `unit.trade !== undefined` rather than
 * anything about where the route currently points.
 *
 * Lives in the sim so an AI (or a future second client) asks the same
 * question the interface does, rather than a UI-only rule the simulation
 * cannot see. `path` is absent rather than empty on an idle unit (`state.ts`
 * keeps that invariant so snapshots compare byte for byte), but this
 * tolerates an empty array too: a route with nothing left in it is not an
 * order.
 */
export function unitAwaitsOrders(unit: Unit): boolean {
  if (unit.movesLeft <= 0) return false;
  if (unit.path !== undefined && unit.path.length > 0) return false;
  if (unit.fortifiedTurns !== undefined) return false;
  if (unit.sleeping === true) return false;
  if (unit.trade !== undefined) return false;
  return true;
}

// --- sleep ------------------------------------------------------------------

/**
 * Why this unit cannot be told to sleep, or `null` when it can.
 *
 * Split out of the command for the reason every blocker in this codebase is:
 * the unit sheet's Sleep button is enabled by exactly the rule the reducer
 * accepts, so a live button and a rejected command cannot disagree. It asks
 * nothing about the turn or the actor — those belong to the command.
 *
 * Two clauses, and they are `fortifyError`'s two read the other way round.
 * **Civilians only**: a soldier that means to stand still already has a verb for
 * it, and it is a better one — fortifying pays defence, and a swordsman that
 * "slept" would be a swordsman quietly giving up the bonus it was standing there
 * for. **Not already asleep**: re-sleeping would change nothing and put a log
 * entry in the save that says nothing, which is `fortify`'s and
 * `chooseResearch`' refusal exactly.
 *
 * Unlike fortify it does **not** require movement, and for fortify's reason:
 * sleeping is what a worker that has just spent its whole allowance on a farm
 * does with the rest of its turn, and demanding a movement point would make the
 * order useless in the situation it exists for.
 */
export function sleepError(unit: Unit): string | null {
  const def = unitDef(unit.type);
  if (!isCivilian(def)) return `A ${def.name} keeps watch — fortify instead`;
  if (unit.sleeping === true) return `${def.name} is already asleep`;
  return null;
}

/**
 * Which of a player's units are asleep, by id, in `state.units` order.
 *
 * Half of a *difference*, and the same shape as `researchSnapshot` in `tech.ts`
 * for the same reason: waking is something the **resolution** does (see
 * `wakeSleepers` in `turn.ts`), and by the time a command returns the flag it
 * cleared is simply not there any more. The interface takes this before it
 * dispatches an `endTurn` and asks `wakesSince` afterwards, so the sentence a
 * player reads is a fact about the state rather than a second implementation of
 * the phase's rule.
 *
 * A plain array rather than a `Set`, because it is small, it is ordered, and
 * ordered is what a deterministic list of announcements needs.
 */
export function sleepingSnapshot(state: GameState, playerId: number): number[] {
  const ids: number[] = [];
  for (const unit of state.units) {
    if (unit.ownerId === playerId && unit.sleeping === true) ids.push(unit.id);
  }
  return ids;
}

/**
 * The player's units that were asleep in `before` and are awake now, in
 * `state.units` order. See `sleepingSnapshot`.
 *
 * A unit that died, or that changed hands, is not in the answer: it is looked up
 * in the live state and checked against the same owner, so what comes back is
 * always "a piece of yours that is standing there awake". Nothing else clears
 * the flag inside a resolution, so every entry is the wake `wakeSleepers` gave
 * it — but the check is written as "was asleep, is not" rather than as a report
 * from the phase, so a future second cause of waking is announced for free
 * instead of silently.
 */
export function wakesSince(
  state: GameState,
  playerId: number,
  before: readonly number[],
): Unit[] {
  const woken: Unit[] = [];
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    if (unit.sleeping === true) continue;
    if (before.includes(unit.id)) woken.push(unit);
  }
  return woken;
}
