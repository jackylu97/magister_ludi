/**
 * The one implementation of "a unit came to rest on this hex, and the hex had
 * something on it".
 *
 * Five things in this game happen because a piece *arrived* rather than because
 * anybody issued a verb for them: a ruin or a village is claimed, a barbarian
 * camp is burnt out, the civilians standing on the hex change hands with the
 * ground (Entry XX.H — the rule that hands a stolen laborer back when its camp
 * is stormed), a **laden caravan on that hex is plundered** rather than taken,
 * and a **road is laid** under a caravan of one's own that has come to rest here
 * (the trade pass). All are consequences of the foot landing, and all have
 * exactly two ways to happen — an ordinary march (`advanceAlongPath` in
 * `movement.ts`, which is itself the one implementation of a walk, whether the
 * order was fresh or resumed by `resetMovement`) and the advance a melee attacker
 * makes into the tile it took (`applyCombat` in `combat.ts`) — whether it took
 * that tile by emptying it or by there having been nothing on it that could
 * swing back (user, 2026-08-28: a blow on a lone civilian *is* the step onto its
 * hex, so the capture below is the whole of it).
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
import { capitalCityOf, tileOwnerCityId } from './cities';
import { revokeLegacies } from './greatPeople';
import { claimDiscoveryAt } from './discoveries';
import type { Tile } from './map';
import {
  type DiscoveryOffer,
  type GameState,
  type Unit,
  captureUnit,
  cityById,
  playerById,
  removeUnit,
} from './state';
import { cardBehaviorRule } from './statecraft';
import { layRoadUnder } from './roads';
import { type TraderPlunder, settleTraderPlunder } from './trade';
import { awardOccasion } from './triumphs';
import { isCivilian, isCombatant, trades, unitDef } from './unitData';
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
  /**
   * Caravans destroyed on this hex and what each paid, in the order they were
   * taken. Usually empty.
   *
   * `captured`'s sibling and its exception: a laden trader standing where
   * somebody comes to rest is **plundered rather than taken**, so it is a
   * different list rather than a flag on the same one. See the plunder clause in
   * `arriveOnTile`.
   */
  plundered: TraderPlunder[];
}

/** Nothing happened. Shared so a caller can compare rather than allocate. */
export function emptyArrival(): ArrivalReport {
  return { discovery: null, camp: null, captured: [], plundered: [] };
}

/** True when this arrival is worth reporting at all. */
export function isEmptyArrival(report: ArrivalReport): boolean {
  return (
    report.discovery === null &&
    report.camp === null &&
    report.captured.length === 0 &&
    report.plundered.length === 0
  );
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
 * the same one sentence for both — and it is now the same sentence for a *third*
 * arrival, the empire whose doctrine has made peace with the wild
 * (`noCampClearing`).
 */
export function arriveOnTile(state: GameState, unit: Unit, tile: Tile): ArrivalReport {
  const report = emptyArrival();
  const isWild = playerById(state, unit.ownerId)?.barbarian === true;

  // **Wolf-Mother's Pact does not sack its ally's villages.** A doctrine may
  // take an empire out of the camp-clearing business altogether — the price it
  // pays for converting the wild's fallen — and the refusal belongs here beside
  // the wild's own, because this is the one place a camp stops existing and the
  // reason is the same one sentence: whoever arrived has no quarrel with it.
  const clears = !isWild && !cardBehaviorRule(state, unit.ownerId, 'noCampClearing');

  /**
   * **Archimedes hears the soldier at the door.**
   *
   * The third thing that happens because a piece *arrived* rather than because
   * anybody issued a verb (`GreatPersonDef.revokedWhen`), and it is here for the
   * two that came before it: this is the one place a position comes to rest, so
   * a rule about somebody walking somewhere has exactly one seam to be written
   * at. A sweep at end of turn would let a column march through a capital and
   * out again between two resolutions, which is precisely the fall the clause is
   * about.
   *
   * A **soldier**, not a scout's shadow or a settler passing by: `isCombatant`
   * is the same question the sleepers' wake asks of a neighbour, and for its
   * reason — a rival builder wandering across the palace ward is not a sack.
   * The wild counts, because there is no diplomacy in this game and a barbarian
   * in the capital is exactly the sentence.
   */
  if (isCombatant(unitDef(unit.type))) {
    const holder = tileOwnerCityId(state, tile.col, tile.row);
    if (holder !== null) {
      const town = cityById(state, holder);
      if (town && town.ownerId !== unit.ownerId) {
        const capital = capitalCityOf(state, town.ownerId);
        if (capital && capital.id === town.id) {
          revokeLegacies(state, town.ownerId, 'enemyEntersCapital');
        }
      }
    }
  }

  if (clears && hasCampAt(state, tile.col, tile.row)) {
    removeCampAt(state, tile.col, tile.row);
    report.camp = settleCampBounty(state, unit.ownerId, { col: tile.col, row: tile.row });
    // **The tally.** `Player.campsCleared` is the one thing a burnt-out camp
    // leaves behind, and it is written here for the bounty's reason exactly:
    // this is the single place a camp stops existing, so a record kept anywhere
    // else would be a second answer that drifts. The Last Hunt reads it through
    // `countScaled`'s `clearedCamps`; nothing lowers it.
    const clearer = state.players[unit.ownerId];
    if (clearer) clearer.campsCleared += 1;
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
   * attacked it — either killing whatever was guarding it, or finding nothing
   * there that could swing back (`canAdvanceOnto` in `combat.ts` — an ordinary
   * march is refused by `canTransit` and always was), so this fires on the
   * advance and nowhere else. Written as "any foreign civilian here" rather than
   * as a combat outcome so it cannot be true of one arrival and false of
   * another.
   *
   * **This is now the whole of "a warrior captures a settler"** (user,
   * 2026-08-28). `applyCombat` used to hand a lone civilian over in place and
   * stand still; it does not any more, so a melee blow on an unguarded worker
   * reaches this loop exactly as the blow that killed its escort does. The
   * mechanism gained nothing, which is the point: the reason storming a camp
   * with a prisoner parked on it frees the prisoner *and* burns the camp *and*
   * pays the bounty in one command is that all three were always this function,
   * and the taking of the worker has simply come home to it.
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
    const otherDef = unitDef(other.type);
    if (!isCivilian(otherDef)) continue;
    /**
     * **A laden caravan is plundered, not taken** (the trade pass).
     *
     * The one exception to the rule above, and it is on the *occasion* rather
     * than on `captureUnit`, which is what keeps the change of hands one
     * three-line function that has never heard of routes. A trade route is a
     * thing between two of *somebody else's* cities — there is nothing to
     * inherit — so what a soldier gets is the cargo, paid to the nearest town it
     * can be carried to (`settleTraderPlunder`), and what the owner gets is the
     * loss. The wild plunders exactly as an empire does and simply has nowhere
     * to put the goods, which the report says out loud.
     *
     * An **unladen** trader is an ordinary civilian and is captured like one:
     * the clause asks `trades` *and* the piece's own `trade`, because what is
     * worth killing is the cargo and not the profession.
     */
    if (trades(otherDef) && other.trade !== undefined) {
      const fromOwnerId = other.ownerId;
      removeUnit(state, other.id);
      report.plundered.push(
        settleTraderPlunder(state, unit.ownerId, fromOwnerId, {
          col: tile.col,
          row: tile.row,
        }),
      );
      continue;
    }
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
  // The road, last, and only under a caravan actually carrying a route: a
  // highway is *worn* by traffic, so it is written where an arrival is written
  // and nowhere else. See `layRoadUnder` and `Tile.road`.
  layRoadUnder(unit, tile);
  return report;
}
