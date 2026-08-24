/**
 * The one implementation of "walk a unit along a path, spending movement".
 *
 * Two callers share it and must never drift apart: the `moveUnit` command,
 * which starts an order, and the `resetMovement` turn phase, which continues a
 * stored one. A multi-turn move is not a special case — it is the same walk,
 * resumed with a refilled allowance.
 *
 * Entering costs "at least a point, not exactly the cost"
 * ------------------------------------------------------
 * A step onto a tile always succeeds while the unit has *any* movement left,
 * even if the tile costs more than remains; the balance is forgiven and
 * `movesLeft` floors at 0. Without this a 2-MP warrior with 1 MP left could
 * never step into a forest, and units would strand themselves a hex short of
 * every wood on the map. It is the Civ rule, and `reachableTiles` mirrors it so
 * the highlight always matches what a click will do.
 *
 * Stopping short
 * --------------
 * The walk stops before a step it must not take, and what happens to the rest of
 * the order depends on why:
 *
 *   - the tile became impassable, or a foreign unit now stands on it: the order
 *     is *cleared*. The route the player approved no longer exists, and guessing
 *     a new one on their behalf is worse than asking again.
 *   - the unit would come to rest on a tile its own category cannot share: the
 *     order is *kept*. That is a traffic jam, not a wall — the unit waits and
 *     tries again next turn, once its own side has moved on.
 *
 * A stored path is always the *remaining* waypoints, never the walked ones, and
 * the key is deleted rather than set to `[]` when the order finishes, so an idle
 * unit serialises identically however it came to be idle.
 *
 * Fortification breaks here
 * -------------------------
 * A unit that actually enters a tile stops being dug in, and this is the one
 * place that can say so for both callers at once — a fresh `moveUnit` and a
 * stored order resumed at the turn change are the same walk. See `breakFortify`
 * in `combat.ts`; the other half of the rule (attacking breaks it too) is in
 * `applyCombat`.
 */

import { type ArrivalReport, arriveOnTile, isEmptyArrival } from './arrival';
import { breakFortify } from './combat';
import { getTileAt } from './map';
import { type Cell, canStopOn, canTransit, tileMoveCost } from './pathfind';
import type { GameState, Unit } from './state';

export interface AdvanceResult {
  /** How many tiles the unit actually entered. */
  steps: number;
  /** True when the remaining order was abandoned because the route is gone. */
  cleared: boolean;
  /**
   * What the walk turned up, in the order it was walked: a ruin claimed, a camp
   * burnt out. Only the steps that found something are in it, so an ordinary
   * march reports an empty array.
   *
   * A list rather than one report, because a march is many arrivals — a column
   * that rides through a camp and stops on a village did both, and an interface
   * that could only say one of them would be dropping news the player earned.
   */
  arrivals: ArrivalReport[];
}

/**
 * Walks `unit` along `path` (offset cells, the unit's own tile excluded),
 * spending movement, and stores whatever is left of the order on the unit.
 *
 * `path` may be the unit's own `path` array; it is read before the field is
 * reassigned, so passing it in is safe.
 */
export function advanceAlongPath(state: GameState, unit: Unit, path: readonly Cell[]): AdvanceResult {
  let steps = 0;
  let cleared = false;
  let index = 0;
  const arrivals: ArrivalReport[] = [];

  while (index < path.length && unit.movesLeft > 0) {
    const step = path[index]!;
    const tile = getTileAt(state.map, step.col, step.row);
    if (!tile || !canTransit(state, unit, tile)) {
      cleared = true;
      break;
    }

    const cost = tileMoveCost(tile)!;
    // Overspending is forgiven, never borrowed: the allowance floors at zero.
    const after = Math.max(0, unit.movesLeft - cost);
    const wouldRestHere = after === 0 || index === path.length - 1;
    if (wouldRestHere && !canStopOn(state, unit, tile)) {
      // A jam, not a wall. Keep the order and wait for the tile to clear.
      break;
    }

    unit.col = tile.col;
    unit.row = tile.row;
    unit.movesLeft = after;
    // A trench is a place, not a posture: the step out of it is the moment it
    // stops counting. Written here rather than in the `moveUnit` handler so it
    // also covers a stored order resumed by `resetMovement` — one implementation
    // of "the unit moved", exactly as this function is one implementation of the
    // walk itself.
    breakFortify(unit);
    // And the other half of "the unit entered a tile": whatever was standing on
    // it. Beside `breakFortify` for exactly its reason — one place a position
    // changes, one place that can forget — and per *step* rather than at the end
    // of the walk, because a ruin is found by riding over it and not only by
    // stopping on it. See `arrival.ts`.
    const found = arriveOnTile(state, unit, tile);
    if (!isEmptyArrival(found)) arrivals.push(found);
    steps += 1;
    index += 1;
  }

  const remaining = cleared ? [] : path.slice(index);
  if (remaining.length > 0) {
    // Copy the cells: the caller's array (and the command it came from) must not
    // be aliased into the state.
    unit.path = remaining.map((cell) => ({ col: cell.col, row: cell.row }));
  } else {
    delete unit.path;
  }

  return { steps, cleared, arrivals };
}
