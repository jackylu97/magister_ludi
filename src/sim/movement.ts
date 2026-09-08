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
 * There is no third reason. A step that slides along an enemy's zone of control
 * (Entry XXV) is an ordinary step at a dearer price — the ground plus
 * `rules.movement.zocExtraCost` — since the user's 2026-08-28 ruling, so a
 * column marching past a picket simply runs out of points sooner and stops the
 * way anything else that runs out of points stops. Nothing in this walk knows
 * the rule exists; `stepCost` does.
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
import {
  type Cell,
  canStopOn,
  canTransit,
  isShoreStep,
  moveProfile,
  snapMovement,
  stepCost,
  zocField,
} from './pathfind';
import type { GameState, Unit } from './state';
// The one reading of what an empire's law hangs on a piece that wades ashore.
// A **function-level edge**, the documented kind: nothing here is called at load
// time, and the alternative — this file deciding what a landing is worth — would
// be a second evaluator of a card.
import { cardLandfallEffects, timedEffectIsLive } from './statecraft';
import { isWaterTerrain } from './terrainData';


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
  // The mover's own profile — its row, and whether its empire may take to the
  // water — resolved once and handed to the evaluator on every step. This is the
  // third of the four readers of `stepCost` (see its docblock): what the
  // highlight promised and what the march spends have to be the same arithmetic,
  // abilities and zones of control included.
  const mover = moveProfile(state, unit);
  // Once for the whole walk, and that is exact rather than an economy: nobody
  // else moves while a column marches, and the two things a step can change —
  // a ruin claimed, a civilian taken — are neither of them sources of control.
  const field = zocField(state, unit.ownerId);

  while (index < path.length && unit.movesLeft > 0) {
    const from = getTileAt(state.map, unit.col, unit.row);
    const step = path[index]!;
    const tile = getTileAt(state.map, step.col, step.row);
    if (!from || !tile || !canTransit(state, unit, tile, mover)) {
      cleared = true;
      break;
    }

    const price = stepCost(state.map, from, tile, mover, field)!;
    // Overspending is forgiven, never borrowed: the allowance floors at zero.
    // That one clause is what lets a picket's toll need no clause of its own —
    // a piece with a point left may pay a two-point slide and arrive empty,
    // exactly as it may walk into a forest with a point left.
    // Snapped, because a road step costs a third and three of them have to come
    // to exactly one point — see `snapMovement`. The allowance a unit carries is
    // always a whole third for the same reason.
    const after = Math.max(0, snapMovement(unit.movesLeft - price.cost));
    // A unit that has spent its last point comes to rest on the hex it stepped
    // onto, so the tile has to be one it may legally share.
    const wouldRestHere = after === 0 || index === path.length - 1;
    if (wouldRestHere && !canStopOn(state, unit, tile, mover)) {
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
    // **The men off the boats** — Admiralty. A landing is a fact about the *pair*
    // of hexes, which is the one thing `arriveOnTile` cannot see: that seam is
    // handed the hex a piece came to rest on, and this is the only place in the
    // walk that still holds the hex it came *from*. It is the same reading
    // `stepCost` prices the crossing by (`isShoreStep`), narrowed to the wet-to-
    // dry direction, so the free landing and the blessing that rides it can
    // never disagree about which step was a landing.
    if (isShoreStep(from, tile, mover) && isWaterTerrain(from.terrain)) {
      hangLandfall(state, unit);
    }
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

/**
 * Hangs whatever this empire's law gives a piece that has just come ashore, for
 * the turns the row names (`CardLandfallEffect`).
 *
 * An ordinary `TimedEffect` on `Unit.timed` — absolute expiry, no countdown, one
 * entry per effect (`stampRite`'s shape, because every reader walks a flat list)
 * — so a strength line hung by a landing joins `planCombat`'s ledger exactly as
 * a rite's does and is swept by the same broom. The array is created lazily, so
 * a piece nothing ever blessed serialises as it always did.
 *
 * A card whose landfall carries no effects hangs nothing, which is the honest
 * reading of a row that promises nothing rather than an empty list on the piece.
 */
function hangLandfall(state: GameState, unit: Unit): void {
  for (const { card, effect } of cardLandfallEffects(state, unit.ownerId)) {
    if (effect.effects.length === 0) continue;
    const expiresTurn = state.turn + Math.max(1, Math.floor(effect.turns));
    // **A second landing refreshes the blessing rather than stacking it**, which
    // is what "+5 for three turns" says and the reading that cannot be farmed:
    // the alternative is a piece hopping in and out of the surf to carry two
    // copies of one card. The card's own live entries are dropped first, so the
    // piece is always carrying exactly one of them — dead paper is left to the
    // broom (`pruneTimedEffects`), which is the only thing allowed to tidy.
    const kept = (unit.timed ?? []).filter(
      (entry) => entry.card !== card || !timedEffectIsLive(state, entry),
    );
    for (const hung of effect.effects) kept.push({ card, effect: hung, expiresTurn });
    unit.timed = kept;
  }
}
