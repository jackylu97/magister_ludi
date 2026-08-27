/**
 * The one implementation of "a unit came to rest on this hex, and the hex had
 * something on it".
 *
 * Three things in this game happen because a piece *arrived* rather than because
 * anybody issued a verb for them: a ruin or a village is claimed, a barbarian
 * camp is burnt out, and the civilians standing on the hex change hands with the
 * ground (Entry XX.H — the rule that hands a stolen laborer back when its camp
 * is stormed). All are consequences of the foot landing, and all have
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
import {
  type DiscoveryOffer,
  type GameState,
  type Unit,
  captureUnit,
  playerById,
} from './state';
import { awardOccasion } from './triumphs';
import { isCivilian, unitDef } from './unitData';
import { unitsOnTile } from './units';

/** A civilian that changed hands because somebody took the ground it stood on. */
export interface CapturedCivilian {
  id: number;
  type: Unit['type'];
  /** Who it belonged to a moment ago. */
  fromOwnerId: number;
  /** True when it was the wild's, i.e. this was a rescue rather than a seizure. */
  fromWild: boolean;
}

/**
 * What arriving on a hex turned out to be worth. Both `null` and the empty list
 * on the overwhelming majority of steps, which is every step onto ordinary
 * ground.
 */
export interface ArrivalReport {
  /** The three cards this arrival dealt, or `null`. */
  discovery: DiscoveryOffer | null;
  /** What burning out the camp that stood here paid, or `null`. */
  camp: CampBounty | null;
  /** Civilians the arriving unit took with the ground. Usually empty. */
  captured: CapturedCivilian[];
}

/** Nothing happened. Shared so a caller can compare rather than allocate. */
export function emptyArrival(): ArrivalReport {
  return { discovery: null, camp: null, captured: [] };
}

/** True when this arrival is worth reporting at all. */
export function isEmptyArrival(report: ArrivalReport): boolean {
  return report.discovery === null && report.camp === null && report.captured.length === 0;
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
    // The Camp Burned. Beside the bounty rather than in the reducer, for the
    // same reason the bounty itself is here: this is the one place a camp stops
    // existing, and the wild is already excluded one line above.
    awardOccasion(state, unit.ownerId, 'campCleared');
  }

  /**
   * The ground and the people on it change hands together.
   *
   * Second of the three, and it is the *rule about the hex* rather than a rule
   * about fighting, which is why it is here and not in `applyCombat`: the only
   * way to arrive on a hex somebody else's civilian is standing on is to have
   * killed whatever was guarding it (`canAdvanceOnto` in `combat.ts` — an
   * ordinary march is refused by `canTransit` and always was), so this fires on
   * the advance and nowhere else. Written as "any foreign civilian here" rather
   * than as a combat outcome so it cannot be true of one arrival and false of
   * another.
   *
   * Placed **after** the camp is burnt out and before the site is searched,
   * which is the same order `arriveOnTile` has always resolved in and reads as
   * the sentence it is: the fight, the prisoners, then the search of what is
   * left. It is what makes storming a camp with a stolen laborer parked on it
   * hand the laborer back — the wild's escorts walk their cargo home and park it
   * *on* the camp (`barbarians.ts`), so the camp hex is exactly where the
   * rescues happen. `fromWild` is carried so the interface can tell a rescue
   * ("your laborers are freed") from a seizure of somebody else's worker; the
   * mechanic is one mechanic either way.
   *
   * The wild is not excluded here, unlike the camp bounty above: a raider that
   * kills an escort and advances takes the worker that was behind it, exactly as
   * an empire does. That is the *same* rule reaching in the other direction, and
   * it is the rule barbarian theft has always used.
   */
  for (const other of unitsOnTile(state, tile.col, tile.row)) {
    if (other.ownerId === unit.ownerId) continue;
    if (!isCivilian(unitDef(other.type))) continue;
    const fromOwnerId = other.ownerId;
    report.captured.push({
      id: other.id,
      type: other.type,
      fromOwnerId,
      fromWild: playerById(state, fromOwnerId)?.barbarian === true,
    });
    captureUnit(state, other, unit.ownerId);
  }

  report.discovery = claimDiscoveryAt(state, unit, tile);
  return report;
}
