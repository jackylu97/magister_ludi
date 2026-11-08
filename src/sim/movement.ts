/**
 * The one implementation of "walk a unit along a path, spending movement".
 *
 * Two callers share it and must never drift apart: the `moveUnit` command,
 * which starts an order, and the `spendLeftoverMovement` turn phase, which
 * continues a stored one on whatever the turn had left. A multi-turn move is
 * not a special case — it is the same walk, resumed a turn later.
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
 *   - the tile became impassable, or a **hostile** piece now stands on it: the
 *     order is *cleared*. The route the player approved no longer exists, and
 *     guessing a new one on their behalf is worse than asking again. A piece of
 *     a seat nobody has declared on is not one of those since `docs/flags.md`
 *     (ooooo) — the column files through it and the order stands.
 *   - the unit would come to rest on a tile its own category cannot share: the
 *     unit **plans a way round that hex to the same goal** and walks it
 *     (`docs/flags.md` (xxxxxx) part 3, the user, 2026-10-17: *"The unit should
 *     reroute its pathing if there's a unit blocking the tile it plans to move
 *     onto next turn"*). Only when there is no such route is the order *kept*
 *     as it was: a traffic jam, not a wall, and the unit waits and tries again
 *     next turn, once its own side has moved on.
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
 * The swap is two of these walks
 * ------------------------------
 * `swapPlaces` is the third caller and the only one that walks two pieces
 * (`docs/flags.md` (ooooo), rule 3). It is deliberately not a third *kind* of
 * movement: the mover walks its route and the sitter walks the same route
 * backwards, each spending its own allowance, each breaking its own trench, each
 * arriving through `arriveOnTile`. Nothing about a step changes because the hex
 * it ends on had a friend on it.
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
import { blockades } from './blockade';
import { cityAt, tileOwnerPlayerId } from './cities';
import { breakFortify } from './combat';
import { type Tile, getTileAt, tileIndex } from './map';
import {
  type Cell,
  type MoveProfile,
  type SwapPlan,
  canStopOn,
  canTransit,
  findPathAround,
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
import { lawReadsTrenches, opusSiegeInForce, upkeepAsksWhere } from './statecraft/evaluator';
import { isWaterTerrain } from './terrainData';
import { isCombatant, unitDef } from './unitData';
import { bumpEconomy } from './slate';


/**
 * **A march that went round a blocked hex** (`docs/flags.md` (xxxxxx) part
 * 3): the piece, where it set off from, and every cell it entered, in order.
 *
 * News for the interface rather than state: the board slides a piece along the
 * cells it walked, and a detour walks cells no route on screen showed. Without
 * this the piece would jump to where the detour left it. The order left on the
 * unit (`Unit.path`) is the detour's own remainder, so the drawn route needs
 * no report.
 */
export interface RerouteReport {
  unitId: number;
  ownerId: number;
  from: Cell;
  walked: Cell[];
}

/** The report for one walk, or `null` when it kept to the route it was handed. */
export function rerouteReport(unit: Unit, from: Cell, result: AdvanceResult): RerouteReport | null {
  if (!result.rerouted || result.walked.length === 0) return null;
  return { unitId: unit.id, ownerId: unit.ownerId, from: { col: from.col, row: from.row }, walked: result.walked };
}

interface AdvanceResult {
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
  /**
   * Every cell the unit entered, in order. The interface slides the piece
   * along these when the walk left the route it was given (`rerouted`).
   */
  walked: Cell[];
  /**
   * True when the walk planned a way round a blocked hex (`docs/flags.md`
   * (xxxxxx) part 3), so the cells walked and the order left on the unit are
   * not the route the walk was handed.
   */
  rerouted: boolean;
}

/**
 * **Can any remembered reading tell that this piece took this step?**
 *
 * The economy clock (`slate.ts`) moves when a write changes what its readings
 * fold, and those readings include a town's whole list. Most steps change nothing
 * they fold, and a bot gives hundreds of orders a turn. So a step of a plain order
 * (`advanceAlongPath`'s `plainOrder`) announces only if it can change one of these,
 * which are all the places a town's list, an empire's lines or its meters read
 * where a piece stands:
 *
 *   1. **A fortified piece leaves its trench, and its owner's law reads trenches.**
 *      The `fortifiedUnits` and `garrisonWatch` counts and the `fortifiedUnit` hex
 *      test read `Unit.fortifiedTurns`, and a position only for a piece that has one
 *      (`lawReadsTrenches`).
 *   2. **Either hex is a town, and the piece is one a town can count.** The
 *      `garrison` count and the `garrisoned` and `garrisonRank` scopes count soldiers
 *      (`isCombatant`) on a town's own hex, the `generalPresent` scope asks for a
 *      great person, and an upkeep rebate with `where: 'garrison'` can reach any
 *      piece its owner's law names. Rows of a rival's law can ask this too, on a
 *      route that ends in the town or a post standing in it, so this does not depend
 *      on what the owner's own law holds.
 *   3. **The step crosses the owner's border, and the owner's upkeep asks.** An
 *      upkeep rebate or surcharge with `where: 'ownTerritory'` or
 *      `'foreignTerritory'` asks only which side a piece is on (`upkeepAsksWhere`).
 *   4. **The piece blockades.** `cityBlockaded` cuts a town's route lines.
 *   5. **A soldier moves while an empire holds `opusSiege`.** `cardOpusSiegeBy` and
 *      `siegeField` ask who stands around a town building the Opus. A town's what-if
 *      can ask about the Opus before it reaches the front of a queue, so the test is
 *      the rule and not the queue.
 *
 * What would make this wrong is a new reader of a piece's position under
 * `explainCity`, `explainEmpireLines` or the meters. `POSITION_READERS` in
 * `test/sim/slateRegister.test.ts` lists the readers and fails when a new one
 * appears. A wrong answer here is a stale yield, so a doubtful case announces.
 * `advanceAlongPath` announces a hex it paved, and `recomputeMarchSight` a seat's
 * sight: the two other things a plain order can write that these readings fold.
 */
function stepIsSeen(state: GameState, unit: Unit, from: Tile, to: Tile): boolean {
  if (unit.fortifiedTurns !== undefined && lawReadsTrenches(state, unit.ownerId)) return true;
  const def = unitDef(unit.type);
  const soldier = isCombatant(def);
  if (cityAt(state, from.col, from.row) || cityAt(state, to.col, to.row)) {
    if (soldier || def.greatWork === true || upkeepAsksWhere(state, unit, 'gate')) return true;
  }
  const wasHome = tileOwnerPlayerId(state, from.col, from.row) === unit.ownerId;
  const isHome = tileOwnerPlayerId(state, to.col, to.row) === unit.ownerId;
  if (wasHome !== isHome && upkeepAsksWhere(state, unit, 'border')) return true;
  if (blockades(state, unit)) return true;
  return soldier && opusSiegeInForce(state);
}

/**
 * Walks `unit` along `path` (offset cells, the unit's own tile excluded),
 * spending movement, and stores whatever is left of the order on the unit.
 *
 * `path` may be the unit's own `path` array; it is read before the field is
 * reassigned, so passing it in is safe.
 *
 * `trading` is the piece this one is **changing places with** — the sitter of a
 * swap (`docs/flags.md` (ooooo), rule 3), which is stepping the other way in the
 * same command and is therefore excused from the stacking count rather than
 * jamming the hex it is about to leave. It is handed straight to `canStopOn`
 * and read nowhere else here: a swap is two ordinary walks, and the only thing
 * that is not ordinary about the first of them is that the hex it ends on is
 * occupied by the piece that is about to walk the route back. The second walk
 * passes nothing, because by then the ground it is aiming at is empty.
 *
 * `plainOrder` says a command is walking this piece, so a step that no reading can
 * see stays quiet (`stepIsSeen`, batch P1). A walk inside a phase leaves it off and
 * announces every step. The phases read remembered answers while they run, and the
 * register of announced writes does not cover every field those answers fold, so the
 * next step's announcement is a second guard there. A command answers at the end.
 */
export function advanceAlongPath(
  state: GameState,
  unit: Unit,
  path: readonly Cell[],
  trading?: Unit,
  plainOrder = false,
): AdvanceResult {
  let steps = 0;
  let cleared = false;
  let index = 0;
  const arrivals: ArrivalReport[] = [];
  // The route being walked: `path`, until a detour replaces it.
  let route: readonly Cell[] = path;
  const walked: Cell[] = [];
  // Every hex this walk has stepped round, by tile index, in the order found.
  // A detour avoids all of them, so the list only grows and the walk cannot
  // swing between two blocked hexes for ever.
  const avoided: number[] = [];
  // The route and place the piece held before the detours it has not yet
  // taken a step along. If the walk ends waiting without a step down any of
  // them, the piece keeps that order, as it would have before the ruling.
  let held: { route: readonly Cell[]; index: number } | null = null;
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

  while (index < route.length && unit.movesLeft > 0) {
    const from = getTileAt(state.map, unit.col, unit.row);
    const step = route[index]!;
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
    const wouldRestHere = after === 0 || index === route.length - 1;
    if (wouldRestHere && !canStopOn(state, unit, tile, mover, undefined, trading)) {
      // A jam, not a wall. **Plan a way round the hex first** (flags item
      // (xxxxxx) part 3); keep the order and wait for the tile to clear only
      // when there is none.
      const detour = trading === undefined ? detourAround(state, unit, route, index, tile, avoided, mover) : null;
      if (detour !== null) {
        if (held === null) held = { route, index };
        route = detour;
        index = 0;
        continue;
      }
      // No way round: wait, and with the order the piece had before any detour
      // it has not set foot on.
      if (held !== null) {
        route = held.route;
        index = held.index;
        held = null;
      }
      break;
    }

    // Asked before the writes, because a step out of a trench is seen and the
    // trench is gone after `breakFortify`.
    const seen = !plainOrder || stepIsSeen(state, unit, from, tile);
    unit.col = tile.col;
    unit.row = tile.row;
    unit.movesLeft = after;
    // A trench is a place, not a posture: the step out of it is the moment it
    // stops counting. Written here rather than in the `moveUnit` handler so it
    // also covers a stored order resumed by `spendLeftoverMovement` — one implementation
    // of "the unit moved", exactly as this function is one implementation of the
    // walk itself.
    breakFortify(unit);
    // After all the writes, because `arriveOnTile` below asks the meters. A step of
    // a plain order that nothing can see does not announce: that is what lets a seat
    // march without pricing its empire again. See `stepIsSeen`.
    if (seen) bumpEconomy(state);
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
    const unpaved = tile.road === undefined;
    const found = arriveOnTile(state, unit, tile);
    // A laden caravan wears a road as it arrives (`layRoadUnder`). The maintenance
    // bill and the connected towns read roads, and a plain order's result does not
    // report one, so that order announces it here.
    if (plainOrder && unpaved && tile.road !== undefined) bumpEconomy(state);
    if (!isEmptyArrival(found)) arrivals.push(found);
    walked.push({ col: tile.col, row: tile.row });
    steps += 1;
    index += 1;
    // A step down the detour makes it the order.
    held = null;
  }

  // The walk walked off the route it was handed, or holds a different one now.
  const rerouted = route !== path;
  const remaining = cleared ? [] : route.slice(index);
  if (remaining.length > 0) {
    // Copy the cells: the caller's array (and the command it came from) must not
    // be aliased into the state.
    unit.path = remaining.map((cell) => ({ col: cell.col, row: cell.row }));
  } else {
    delete unit.path;
  }

  return { steps, cleared, arrivals, walked, rerouted };
}

/**
 * **A way round the hex the march cannot rest on**, or `null` (`docs/flags.md`
 * (xxxxxx) part 3).
 *
 * The hex is `route[index]`, and the walk has found that the piece would have
 * to rest there and may not: a piece stands on it that leaves no room
 * (`canStopOn`). The reading of the user's *"a unit of the same type blocking
 * its path"* is the stacking rule itself, because that is what makes a hex
 * one the piece may not rest on: a piece of its own category (one military, one
 * civilian and one ship to a hex), at sea any second piece that is not a ship,
 * or a stranger's piece at peace. A caravan blocks nobody. A hostile soldier
 * is a wall rather than a jam, and the walk clears the order before it gets
 * here, as it always has.
 *
 * The goal stays the route's last cell. When the blocked hex *is* the goal
 * there is nothing to go round, and the piece waits. Otherwise the hex joins
 * `avoided` and `findPathAround` plans from where the piece stands now, round
 * every hex this walk has met blocked so far. A detour of no steps is no
 * detour.
 *
 * **A way round on land stays on land.** When the piece and the rest of its
 * route are all on dry ground, the detour is planned for the same piece with
 * the water closed to it (a narrowed `MoveProfile`, the safe direction). Going
 * round one blocked hex by sea costs two landings, each a whole turn, and in
 * the bot games the pieces sent that way then stayed on the water, changing
 * their target every turn. A route that already crosses water may go round by
 * water.
 */
function detourAround(
  state: GameState,
  unit: Unit,
  route: readonly Cell[],
  index: number,
  blocked: Tile,
  avoided: number[],
  mover: MoveProfile,
): Cell[] | null {
  if (index >= route.length - 1) return null;
  const last = route[route.length - 1]!;
  const goal = getTileAt(state.map, last.col, last.row);
  if (!goal) return null;
  avoided.push(tileIndex(state.map, blocked.col, blocked.row));
  const detour = findPathAround(state, unit, goal, avoided, dryWhereDry(state, unit, route, index, mover));
  return detour !== null && detour.length > 0 ? detour : null;
}

/**
 * The mover a detour is planned for: the piece's own, or, when the piece and
 * the rest of its route are all on land, the same piece with the water closed
 * to it. See `detourAround`.
 */
function dryWhereDry(
  state: GameState,
  unit: Unit,
  route: readonly Cell[],
  index: number,
  mover: MoveProfile,
): MoveProfile {
  if (mover.naval) return mover;
  const wet = (cell: Cell): boolean => {
    const tile = getTileAt(state.map, cell.col, cell.row);
    return tile !== undefined && isWaterTerrain(tile.terrain);
  };
  if (wet(unit) || route.slice(index).some(wet)) return mover;
  return { ...mover, embarks: false };
}

/**
 * Two of one seat's soldiers change places: the mover walks `plan.path`, the
 * sitter walks it backwards (`docs/flags.md` (ooooo), rule 3).
 *
 * **Everything was decided before this ran.** `planSwap` priced both walks
 * through `stepCost`, asked the ground of each piece's own profile and found
 * room for each where the other is standing, so this function takes no decision
 * and refuses nothing — which is what lets one command spend two pieces without
 * ever leaving half a swap on the board.
 *
 * **The mover first, and the order is the whole of the mechanism.** Its last
 * step lands on the hex the sitter is still standing on, which is the one thing
 * an ordinary walk will not do — so the sitter is handed down as `trading` and
 * excused from the stacking count it is about to vacate. By the time the sitter
 * sets off, the route behind the mover is clear and the hex it is aiming at is
 * empty, so its walk needs no exemption at all: it is an ordinary march, priced
 * and walked like any other.
 *
 * Both arrivals come back in one list, the mover's first, because a swap is one
 * order and the ruins and camps it turned up are one piece of news.
 */
export function swapPlaces(state: GameState, unit: Unit, plan: SwapPlan): ArrivalReport[] {
  const out = advanceAlongPath(state, unit, plan.path, plan.sitter, true);
  const back = advanceAlongPath(state, plan.sitter, plan.back, undefined, true);
  return [...out.arrivals, ...back.arrivals];
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
