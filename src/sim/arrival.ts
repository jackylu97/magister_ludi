/**
 * The one implementation of "a unit came to rest on this hex, and the hex had
 * something on it".
 *
 * Two things in this game happen because a piece *arrived* rather than because
 * anybody issued a verb for them: a ruin or a village is claimed, and a barbarian
 * camp is burnt out. Both are consequences of the foot landing, and both have
 * exactly two ways to happen — an ordinary march (`advanceAlongPath` in
 * `movement.ts`, which is itself the one implementation of a walk, whether the
 * order was fresh or resumed by `resetMovement`) and the advance a melee attacker
 * makes into the tile it emptied (`applyCombat` in `combat.ts`).
 *
 * That is two call sites for two rules, which is four places to forget. This is
 * the one place instead, and it is the same argument `breakFortify` makes from
 * inside `advanceAlongPath`: there is exactly one moment a unit's position
 * changes, so there is exactly one place that can forget what standing there
 * means.
 *
 * Why it is a module and not a function in either of them
 * ------------------------------------------------------
 * Layering. `barbarians.ts` has to attack through the one combat evaluator, so it
 * imports `combat.ts`; if `combat.ts` then imported the camp rules from
 * `barbarians.ts` that would be a cycle worth avoiding rather than documenting.
 * The camp *registry* therefore lives in `camps.ts`, which knows nothing about
 * fighting, and this module sits above `camps.ts` and `discoveries.ts` and below
 * both call sites. Nothing imports it back.
 *
 * It reports rather than announces
 * --------------------------------
 * Nothing here writes a sentence for a player. It returns what happened and the
 * interface says it (`controls.ts`), because the same arrival happens inside a
 * replay, inside an AI's turn and inside a test, none of which have a notice bar.
 */

import { type CampBounty, hasCampAt, removeCampAt, settleCampBounty } from './camps';
import { claimDiscoveryAt } from './discoveries';
import type { Tile } from './map';
import { type DiscoveryOffer, type GameState, type Unit, playerById } from './state';

/**
 * What arriving on a hex turned out to be worth. Both fields are `null` on the
 * overwhelming majority of steps, which is every step onto ordinary ground.
 */
export interface ArrivalReport {
  /** The three cards this arrival dealt, or `null`. */
  discovery: DiscoveryOffer | null;
  /** What burning out the camp that stood here paid, or `null`. */
  camp: CampBounty | null;
}

/** Nothing happened. Shared so a caller can compare rather than allocate. */
export function emptyArrival(): ArrivalReport {
  return { discovery: null, camp: null };
}

/**
 * Resolves everything standing on the tile this unit has just entered.
 *
 * Camps are cleared **before** discoveries are claimed, and the order is a rule
 * rather than an accident: a camp's food bounty can grow the nearest city, a
 * ruin's grain cache can grow it too, and a player who takes both in one step
 * should collect them in the order they happened — the fight, then the search of
 * what was left. It also means the camp is gone before anything else looks at the
 * hex, so no later rule has to ask whether the thing it is reading about is still
 * contested.
 *
 * The two rules refuse for themselves, so this validates nothing:
 * `claimDiscoveryAt` walks away from a barbarian and from a player who already
 * owes an answer, and the camp half simply finds no camp. Calling it on every
 * step of every march is therefore free in the case that matters — two array
 * scans over lists that are almost always empty — and correct in the case that
 * does not.
 *
 * **The wild clears nothing.** A barbarian marching over its own camp must not
 * collect a bounty for it, and a barbarian marching over *another* camp is the
 * wild walking through the wild. The claim half refuses barbarians on its own
 * (see `discoveryClaimError`); the camp half is refused here, where the reason is
 * the same one sentence for both.
 */
export function arriveOnTile(state: GameState, unit: Unit, tile: Tile): ArrivalReport {
  const report = emptyArrival();
  const isWild = playerById(state, unit.ownerId)?.barbarian === true;

  if (!isWild && hasCampAt(state, tile.col, tile.row)) {
    removeCampAt(state, tile.col, tile.row);
    report.camp = settleCampBounty(state, unit.ownerId, { col: tile.col, row: tile.row });
  }

  report.discovery = claimDiscoveryAt(state, unit, tile);
  return report;
}
