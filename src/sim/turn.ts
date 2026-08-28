/**
 * The end-of-turn resolution pipeline.
 *
 * When the last outstanding player ends their turn the world moves: cities eat
 * and grow, production and research tick over, borders creep outward, units heal
 * and get their movement back. Those effects are not independent — a city that
 * starves this turn must not also have grown, and borders must expand before the
 * next turn's yields are collected — so the *order* is the design, and it lives
 * here as one explicit array rather than being scattered across the modules that
 * eventually implement each step.
 *
 * Every phase is `(state) => void` and mutates the state in place, exactly like
 * the reducer that calls it (see `commands.ts`). Phases never roll their own
 * randomness source; if one needs a die it uses `state.rng`.
 *
 * Milestone 2 laid the skeleton and the two unit phases; Milestone 3 fills in
 * the four city phases, whose bodies live in `cities.ts` so that this file stays
 * a statement of *order* rather than a second home for city rules. Milestone 4
 * fills in `advanceResearch`, whose body lives in `tech.ts` for the same reason,
 * and leaves it in the position it was always reserved.
 *
 * Why this order
 * --------------
 * `collectYields` first, because everything downstream spends what it banks.
 * `growCities` before `advanceProduction`, so a city that grows this turn is the
 * larger city when its settler's `minCityPop` is checked. `expandBorders` last
 * of the city phases, so a tile claimed this turn is worked *next* turn — a
 * border that expanded and was immediately harvested would pay twice for one
 * turn's culture.
 *
 * `advanceResearch` sits after production and before the units are touched, and
 * both sides of that matter: this turn's science was banked by `collectYields`
 * at the top, so a tech completes on the turn its beakers arrived rather than
 * the turn after; and a unit that auto-upgrades here is retyped *before*
 * `healUnits` and `resetMovement` read it, so it heals and refills as the unit
 * it now is.
 *
 * One phase sweeps every city before the next phase begins. That is the whole
 * design of the pipeline: a rule is applied to the empire, not to a city, so no
 * city can ever be a turn ahead of its neighbour because it was founded first.
 *
 * `healUnits` runs *before* `resetMovement` and that is the design, not an
 * accident of the array: "did this unit act?" is answered by its movement still
 * being untouched, so healing has to be read before the allowance is refilled.
 * Swapping the two would heal every unit on the board, every turn, forever.
 * Milestone 5 gives `resetMovement` a second thing to clear — `hasAttacked` —
 * and it is the same argument twice: a unit that fought is not resting, so the
 * flag has to survive until healing has read it.
 *
 * Milestone 5's two additions sit where they do for reasons of their own.
 * `healCities` is a sibling of `healUnits` rather than part of it, because a
 * city heals unconditionally and a unit does not — one rule each, in one place
 * each. `advanceFortify` follows the healing so that "has this unit been still
 * all turn?" is asked once, of one board state, by both.
 *
 * Entry XX adds one phase, `barbarians`, between `healCities` and `healUnits`,
 * and its position is that same argument read once more: the wild acts *after*
 * the towns have had their turn, so a raid meets the world this turn produced,
 * and *before* the healing, so a raider that marched or fought is not resting —
 * exactly like every other unit on the board. See `barbarianTurn`.
 *
 * Playtest batch two adds `spendLeftoverMovement`, immediately before
 * `resetMovement` and immediately after the healing. Both halves of that are the
 * rule: the points it spends must be *this* turn's, and "has this unit been
 * still all turn?" must already have been answered, so that a piece's healing
 * never depends on whether a neighbour got out of its way. See the function.
 *
 * Entry XXI adds `wakeSleepers`, and it is the one phase whose position is "as
 * late as it can be": it asks whether an enemy is standing next to a sleeping
 * civilian, and that question is only worth asking of a board that has stopped
 * moving — after the wild has raided *and* after `resetMovement` has walked
 * everybody's standing orders. It still sits *above* `refreshVisibility`, which
 * stays last and unconditional, because clearing a flag moves no piece and
 * claims no tile. The full argument is on the function.
 *
 * There is deliberately no elimination phase
 * ------------------------------------------
 * A player is out when they hold no units and no cities, and in v1 the *only*
 * thing that can bring that about is an attack: cities are never destroyed
 * (starvation floors population at 1, and a captured city changes owner rather
 * than vanishing), and the only other way a unit leaves the board is a settler
 * spending itself on a city — which leaves its owner holding that city. So
 * `updateElimination` is called from inside `applyCombat`, where the loss
 * actually happens, and nowhere else.
 *
 * That is not only economy, it is the correct place. Under simultaneous turns a
 * player wiped out mid-window has not ended their turn, and a verdict that
 * waited for the end of the turn would leave the window waiting for a seat with
 * nothing left to do. Deciding it inline closes the seat the instant it empties.
 *
 * The day something else can empty a player — razing a city, a plague, a
 * scenario that disbands an army — that rule calls `updateElimination` too, or
 * this array grows a phase. Adding one *now* would be a phase that could only
 * ever fire on a hand-edited state, which is a phase no test can honestly cover.
 */

import { barbarianTurn } from './barbarians';
import {
  type CompletionGrantReport,
  type WonderCompletion,
  advanceProduction,
  collectYields,
  expandBorders,
  growCities,
} from './cities';
import { type CombatOutcome, advanceFortify, healCities } from './combat';
import { hasLineOfSight } from './los';
import { openPeriodicOffers, pruneTimedEffects } from './religion';
import { getTileAt, tileHex, wrappedDistance } from './map';
import { findPath } from './pathfind';
import { advanceAlongPath } from './movement';
import { cardUnitStat, runStatecraft } from './statecraft';
import { runRenown } from './renown';
import { advanceResearch } from './tech';
import { endRoute, routeTarget, standsIn } from './trade';
import { type TriumphAward, triumphMarks, triumphsSince } from './triumphs';
import { type GameState, type Unit, wakeUnit } from './state';
import { isCombatant, unitDef } from './unitData';
import { fullMovement, isRested } from './units';
import { RULES } from './rulesData';
import { recomputeAllVisibility, sightOf } from './visibility';

/**
 * What a resolution *did* that stops being visible the instant it is over.
 *
 * `CommandResult.arrivals`' argument, one scale up and for the same reason: the
 * end-of-turn pipeline is where the wild strikes, and by the time `endTurn`
 * returns the raider has already been paid, the worker has already changed
 * hands and the board says nothing about who hit whom. An interface that wanted
 * to tell a player "your warrior was attacked" would have to re-derive it from
 * a diff of two boards — which cannot name the attacker at all.
 *
 * So the pipeline **reports**, exactly as `arriveOnTile` reports: it is handed a
 * sink, phases that have something to say write into it, and `applyEndTurn`
 * passes it out through the `CommandResult`. Nothing is stored on `GameState`,
 * because none of it is a fact about the world — it is a fact about the
 * *transition*, and a transition is over.
 *
 * `run` takes it as a **second parameter**, so every phase that has nothing to
 * report is assignable unchanged (a function of one argument satisfies a
 * two-argument signature). `barbarianTurn` and `advanceProduction` read it.
 */
export interface TurnReport {
  /** Every blow struck during the resolution, in the order they landed. */
  combats: CombatOutcome[];
  /**
   * Every wonder finished during the resolution, in the order the sweep claimed
   * them, with the refunds each one paid out (`WonderCompletion`).
   *
   * `combats`' sibling, and it joins for the same argument read one scale wider:
   * by the time `endTurn` returns, the claim is in `state.wonders`, the losers'
   * queues have been rewritten and their baskets are gold, and no diff of two
   * boards can name what happened. Unlike a blow, it is **news to every seat**
   * — a wonder is the one thing another empire finishing takes away from you.
   */
  wonders: WonderCompletion[];
  /**
   * Every Triumph earned during the resolution, in seat order.
   *
   * `wonders`' sibling, and it joins for the same argument: a triumph is a
   * *difference* that stops existing the instant the resolution is over — the
   * renown is banked, the offer may already be open, and no diff of two boards
   * can say which of the four things that happened this turn earned it.
   *
   * It is filled by a **diff**, not by a sink: `Player.triumphs` is append-only
   * and stamped, so `runEndOfTurn` remembers each seat's length before the
   * pipeline and slices afterwards (`triumphsSince`). That is why not one phase
   * grew a parameter — the alternative was threading an out-list through
   * `foundCityAt`, `realiseItem`, `settleProduction` and `applyCombat` for a
   * fact the state already records.
   */
  triumphs: TriumphAward[];
  /**
   * Every completion grant a finished building handed over during the
   * resolution, in the sweep's own order (`CompletionGrantReport`).
   *
   * `wonders`' sibling one scale in: a wonder is news to every seat and a grant
   * is news to its owner, but both are *differences* that stop existing the
   * instant the resolution ends — the sword is standing in the town, the
   * technology is in the list, the Doctrine offer is on the seat, and no diff of
   * two boards can say which building handed any of it over.
   */
  grants: CompletionGrantReport[];
}

/** A fresh, empty report. The one place its shape is written. */
export function emptyTurnReport(): TurnReport {
  return { combats: [], wonders: [], triumphs: [], grants: [] };
}

export interface TurnPhase {
  /** Stable identifier, used by tests and (later) by the turn-log UI. */
  name: string;
  run: (state: GameState, report: TurnReport) => void;
}

/**
 * The phases, in the order they resolve. Insert new phases deliberately: the
 * position of a phase in this array is a rules decision.
 */
export const END_OF_TURN_PHASES: readonly TurnPhase[] = [
  {
    name: 'pruneTimedEffects',
    // **First**, and it is a broom rather than a clock (ledger Entry XXVIII).
    // Every reader of a rite compares `state.turn` against an absolute
    // `expiresTurn`, so an effect that has run out is already inert and deleting
    // it changes no outcome at all — which is exactly what makes this phase safe
    // to place anywhere. It goes first so the turn's arithmetic is done over a
    // list with nothing dead in it, and so a panel never has to filter one.
    run: pruneTimedEffects,
  },
  {
    name: 'collectYields',
    // Re-assigns citizens, then banks food, hammers, gold, science and culture.
    run: collectYields,
  },
  {
    name: 'growCities',
    // Spends a full food basket on a population point, or starves one away.
    run: growCities,
  },
  {
    name: 'advanceProduction',
    // Completes at most one item per city, carrying the overflow forward — and
    // reports any wonder claimed, which is the one completion the whole world
    // hears about. The second phase to write into the report, after the wild.
    run: advanceProduction,
  },
  {
    name: 'advanceResearch',
    // Spends `Player.sciencePool` on the tech it is aimed at, and marches the
    // army up its upgrade chains the moment one lands.
    run: advanceResearch,
  },
  {
    name: 'statecraft',
    // Culture buys a draft, and a tier buys a government offer. Directly after
    // `advanceResearch` because the two are the same shape — an empire spending
    // a pool `collectYields` filled at the top of this resolution — and because
    // a hand must be dealt from a board that has already grown, built and learnt
    // this turn. Before `expandBorders` and harmlessly so: border culture is a
    // separate channel (`City.culture`) that this phase never touches, which is
    // the whole of "do not double-spend". See `runStatecraft`.
    run: runStatecraft,
  },
  {
    name: 'religion',
    // The cadenced drafts — Keeper of the Calendar's almanac, and nothing else
    // today. Directly after `statecraft` because it is the same shape one
    // currency over: an offer dealt from `state.rng` at the end of a resolution,
    // blocking End Turn until it is answered, on a board that has already grown,
    // built and learnt this turn. It skips the wild for `runStatecraft`'s
    // reason. See `openPeriodicOffers`.
    run: openPeriodicOffers,
  },
  {
    name: 'renown',
    // Buildings and wonders pay their trickle, standing Triumphs are claimed,
    // and a filled ladder deals a great person. Directly after `religion`
    // because it is the same shape a fifth currency over — an empire spending a
    // pool this resolution filled, on a board that has already grown, built and
    // learnt — and *after* `advanceProduction`, which is what lets a wonder
    // finished this turn pay into the same sweep that banks the library beside
    // it. It skips the wild for `runStatecraft`'s reason. See `runRenown`.
    run: runRenown,
  },
  {
    name: 'expandBorders',
    // Culture buys the next tile for each city, best-scoring first.
    run: expandBorders,
  },
  {
    name: 'healCities',
    // Towns recover unconditionally, unlike units: there is no "did it act?"
    // question to ask of a city. Its body is in `combat.ts`, beside the rules
    // that spend the hit points it restores.
    run: healCities,
  },
  {
    name: 'barbarians',
    // The wild founds camps, musters bands and raids — after the towns have had
    // their turn, so a raid is resolved against the world this turn produced, and
    // *before* `healUnits`, so a raider that marched or fought is not resting.
    // The full argument for the position is in `barbarianTurn`'s docblock; it is
    // a rules decision, exactly like every other entry in this array.
    run: barbarianTurn,
  },
  {
    name: 'healUnits',
    // Units that spent nothing this turn recover; anyone who marched or fought
    // does not. Reads `movesLeft` and `hasAttacked`, so it must run before
    // `resetMovement` clears both — and after `barbarians`, so the question is
    // asked of the raiders too.
    run: healUnits,
  },
  {
    name: 'advanceFortify',
    // Everybody still dug in digs a little deeper. After `healUnits`, because
    // fortifying and resting are different questions and a unit that fortified
    // this turn has still been standing still all of it.
    run: advanceFortify,
  },
  {
    name: 'marchTraders',
    // The caravans keep walking, turn around at each end, and drop a route that
    // has run out. Directly before `spendLeftoverMovement`, and the position is
    // the rule — see `marchTraders`.
    run: marchTraders,
  },
  {
    name: 'spendLeftoverMovement',
    // Standing orders march once more on **this** turn's unspent points, before
    // anything is refilled. The position is the rule — see the function.
    run: spendLeftoverMovement,
  },
  {
    name: 'resetMovement',
    // Refills every allowance, clears `hasAttacked`, then walks standing orders
    // with the new points.
    run: resetMovement,
  },
  {
    name: 'wakeSleepers',
    // A sleeping civilian with a foreign combatant inside its own sight wakes.
    // **Last**, and the position is the rule — see `wakeSleepers`.
    run: wakeSleepers,
  },
  {
    name: 'refreshVisibility',
    // Last, and unconditionally, for every seat.
    //
    // Every *individual* mutation already refreshes the empire it belongs to —
    // a unit is created, killed, moved, a border grows — so this phase is not
    // where fog is normally maintained. It is here because the resolution is the
    // one moment several of those happen at once and one of them is a standing
    // order resumed by the phase directly above: a unit that marched during
    // `resetMovement` did so inside a phase, not inside a command, and the
    // cheapest honest way to be sure nobody's map is a turn stale is to redraw
    // all of them once the world has stopped moving.
    //
    // Its position is therefore not negotiable: it must be after every phase
    // that can move a piece, claim a tile or retype a unit, which is all of them.
    run: recomputeAllVisibility,
  },
];

/**
 * Restores `healing.perTurnIfRested` to every unit that did not spend a single
 * movement point this turn, capped at the type's maximum.
 */
function healUnits(state: GameState): void {
  const amount = RULES.healing.perTurnIfRested;
  for (const unit of state.units) {
    if (!isRested(unit, state)) continue;
    const { maxHp } = unitDef(unit.type);
    if (unit.hp >= maxHp) continue;
    // Field Surgeons, through the one place a heal is decided. It rides on the
    // *rested* rule rather than replacing it: "heal +5 per turn anywhere" means
    // anywhere on the map, not while marching — a card that healed a unit
    // mid-charge would be a different card and a much stronger one.
    unit.hp = Math.min(maxHp, unit.hp + amount + cardUnitStat(state, unit, 'heal'));
  }
}

/**
 * Wakes every sleeping unit with a foreign combatant inside its own sight.
 *
 * The reason sleep is safe to give an order at all. A worker told to sleep on
 * the frontier stops blocking End Turn and stops being auto-focused
 * (`ui/turnBlockers.ts`), which is exactly what the player asked for and exactly
 * how a worker gets quietly killed; so the game takes on the duty of noticing
 * for them. It is a *report*, not a rule — the flag is the only thing this
 * touches, nothing about the sleeper's movement, posture or defence differs
 * either way, and the interface says so by diffing the flag (`wakesSince` in
 * `units.ts`) rather than by re-deriving this sweep.
 *
 * Its position in the array is the design, like every other entry.
 *
 *   · **After `barbarians`**, because the wild's raid is the commonest thing
 *     that puts an enemy beside a sleeping worker, and a wake that ran before it
 *     would answer about last turn's board.
 *   · **After `resetMovement`**, which is the stronger half of the same claim:
 *     that phase resumes standing orders, so a rival's column three hexes away
 *     may finish its march right next to the sleeper *inside the resolution*. A
 *     wake asked any earlier is a wake asked of a board that has not stopped
 *     moving.
 *   · **Before `refreshVisibility`**, which stays last and unconditional as its
 *     own docblock insists. Nothing here moves a piece, claims a tile or retypes
 *     a unit, so the fog has nothing to re-read on account of it — and this
 *     phase does not consult a fog grid, only the sleeper's own eyes.
 *
 * "Its own sight" is deliberately the unit's, not its empire's: `sightOf` plus
 * the same `hasLineOfSight` the fog and the archers ask (`los.ts`), so a worker
 * behind a ridge sleeps through a column on the other side of it exactly as it
 * would fail to see one. An empire-wide test would wake every worker in the
 * realm because a scout on the far coast spotted a galley.
 *
 * **Combatants only.** A rival settler wandering past is not a reason to wake a
 * builder; a warrior is. Any owner but the sleeper's own counts — there is no
 * diplomacy in this game, and the wild is a `Player` like anybody else, so the
 * one clause covers barbarians without naming them.
 *
 * Iterates `state.units` twice in `state.units` order and touches only a flag,
 * so it is deterministic in the state alone and rolls no dice.
 */
function wakeSleepers(state: GameState): void {
  for (const sleeper of state.units) {
    if (sleeper.sleeping !== true) continue;
    const from = getTileAt(state.map, sleeper.col, sleeper.row);
    if (!from) continue;
    const radius = sightOf(state.map, sleeper, state);
    const eye = tileHex(from);
    for (const other of state.units) {
      if (other.ownerId === sleeper.ownerId) continue;
      if (!isCombatant(unitDef(other.type))) continue;
      const to = getTileAt(state.map, other.col, other.row);
      if (!to) continue;
      if (wrappedDistance(state.map, eye, tileHex(to)) > radius) continue;
      if (!hasLineOfSight(state.map, from, to)) continue;
      wakeUnit(sleeper);
      break;
    }
  }
}

/**
 * Walks every caravan carrying a route, turns it around at each end, and ends a
 * route that has run out.
 *
 * **The shuttle**, and the whole of it. A trade route in this game is a piece
 * that walks (`Unit.trade` — see `trade.ts`), which means somebody has to keep
 * it walking: a caravan that arrived last turn is standing on its destination
 * with no orders, and nothing else in the pipeline would ever give it any.
 *
 * Its position in the array is the design, like every other entry.
 *
 *   · **Immediately before `spendLeftoverMovement`**, so a caravan that has just
 *     turned around sets off on *this* turn's remaining points rather than
 *     standing in the gateway for a turn. That phase and `resetMovement` then
 *     walk the path this one set, which is what keeps the walk in one place: this
 *     phase decides *where* a caravan is going and never how far it gets.
 *   · **After everything that can move a piece or take a city** — the wild's
 *     raid above all — because a route whose destination changed hands during
 *     the resolution should end this turn and not next, and because a caravan
 *     killed by a raider must not be marched first.
 *   · **Before `wakeSleepers` and `refreshVisibility`**, which both insist on a
 *     board that has stopped moving and stay where they are.
 *
 * What it does *not* do is lay road, pay anything, or refresh a city. The road is
 * `arriveOnTile`'s, per step, on every march whoever ordered it; the yields are
 * derived on read from wherever the caravan happens to be standing; and a route
 * that ends here changes no city's derived state that the next `collectYields`
 * will not recompute one phase into the next turn.
 *
 * Walked in `state.units` order, like every other sweep, and it rolls no dice.
 */
function marchTraders(state: GameState): void {
  for (const unit of state.units) {
    if (unit.trade === undefined) continue;
    marchOneTrader(state, unit);
  }
}

/**
 * One caravan's leg. Split out so the sweep above reads as the sentence it is.
 *
 * The order of the three questions is the rule:
 *
 *   1. **has it arrived?** If it is standing on the town it was walking to, the
 *      leg is over. A leg that ended *at home* is where expiry is asked, and
 *      nowhere else — a route runs out when the caravan gets back, not in the
 *      middle of the road, which is what stops a piece being stranded holding a
 *      dead route halfway across the map.
 *   2. **is the route still a route?** `routeTarget` answers `null` when either
 *      end has stopped being one of this empire's cities, and that ends the
 *      route exactly as expiry does. A missing *path* deliberately does not: a
 *      jam is not a wall (see below), so a caravan with nowhere to walk this
 *      turn waits, and only a route that has already lapsed is dropped where it
 *      stands — which is what stops a stranded caravan holding a slot for ever.
 *   3. **does it need a path?** Only when it has none: a caravan mid-march is
 *      already under orders, and re-pathing it every turn would throw away a
 *      route the board agreed to and re-derive it against a board that may have
 *      an enemy standing on it.
 */
function marchOneTrader(state: GameState, unit: Unit): void {
  const route = unit.trade;
  if (!route) return;

  let target = routeTarget(state, unit);
  if (target && standsIn(unit, target)) {
    // Home, at the end of the road: the one moment expiry is asked.
    if (!route.outbound && state.turn >= route.expiresTurn) {
      if (!route.autoResend) {
        endRoute(state, unit);
        return;
      }
      // A fresh leg on the same terms — the whole of "auto-resend". The expiry
      // is *rewritten* rather than extended, so a caravan that sat at home for
      // ten turns does not carry ten turns of credit.
      route.expiresTurn = state.turn + Math.max(1, Math.floor(RULES.trade.routeTurns));
    }
    route.outbound = !route.outbound;
    target = routeTarget(state, unit);
    delete unit.path;
  }

  if (!target) {
    endRoute(state, unit);
    return;
  }

  if (!unit.path || unit.path.length === 0) {
    const goal = getTileAt(state.map, target.col, target.row);
    const path = goal ? findPath(state, unit, goal) : null;
    if (!path || path.length === 0) {
      // **A jam is not a wall**, which is `advanceAlongPath`'s own distinction
      // read one level up: the commonest reason a caravan cannot path to a town
      // right now is that another civilian is standing in the gateway, and a
      // route that died of that would be a route killed by traffic. So it waits.
      //
      // The one thing that must not happen is a caravan waiting *forever* on a
      // partner it can never reach again, holding a route slot: so a route that
      // has already lapsed ends here rather than at home, which is the only case
      // where the caravan will never get home to end it properly.
      if (state.turn >= route.expiresTurn) endRoute(state, unit);
      return;
    }
    unit.path = path.map((cell) => ({ col: cell.col, row: cell.row }));
  }
}

/**
 * Marches every standing order that still has movement to spend, on the points
 * this turn left it.
 *
 * The case it exists for is a **jam that has since cleared**. `advanceAlongPath`
 * stops short of a tile the mover may not come to rest on and *keeps* the order
 * (see `movement.ts`): traffic, not a wall. Until now the column then sat on a
 * full purse for the rest of the turn while the friendly piece in its way walked
 * off, and set out again only on the next turn's allowance — so a player who
 * moved two units in the wrong order paid a turn for it. This phase asks once
 * more, after everybody has finished moving, which is the earliest honest moment
 * to ask: the board has stopped changing.
 *
 * It is not a second allowance. A unit that spent its points has none here, and
 * `advanceAlongPath` is the same walk with the same purse — this only spends
 * what the turn already granted and nobody got round to using.
 *
 * Its position in the array is the design, like every other entry.
 *
 *   · **Immediately before `resetMovement`**, which is what makes the points it
 *     spends *this* turn's rather than next turn's. One line later and the
 *     allowance has been refilled, and the phase would be a free extra march
 *     every turn for every unit under orders.
 *   · **After `healUnits` and `advanceFortify`**, and this is the load-bearing
 *     half. Both ask "has this unit been still all turn?", and the answer must
 *     be about the turn the *player* had. Asking any earlier would make a
 *     unit's healing depend on whether a neighbour happened to step out of its
 *     way — a piece that sat jammed all turn would heal or not according to
 *     somebody else's marching order, which is a rule nobody could predict and
 *     nobody asked for. So the healing is decided first, and the tidying-up
 *     march happens after it.
 *   · **Before `wakeSleepers` and `refreshVisibility`**, which both insist on a
 *     board that has stopped moving and stay where they are; a column that
 *     finishes its march here is exactly the sort of thing the first is watching
 *     for.
 *
 * Walked in `state.units` order, like every other sweep, so two orders
 * contending for the same tile always resolve the same way. Whatever the march
 * turns up — a ruin, a camp — is claimed by `arriveOnTile` per step and the
 * report is dropped, exactly as `resetMovement` drops it: this is a phase, and a
 * phase has no `CommandResult` to hand it out through.
 */
function spendLeftoverMovement(state: GameState): void {
  for (const unit of state.units) {
    const path = unit.path;
    // `length === 0` is only reachable from a hand-edited save; `resetMovement`
    // is one line away and owns tidying it up.
    if (!path || path.length === 0) continue;
    if (unit.movesLeft <= 0) continue;
    advanceAlongPath(state, unit, path);
  }
}

/**
 * Refills movement, then resumes standing orders.
 *
 * Two passes, and the order matters: every unit is refilled *before* anyone
 * moves, so a unit stepping aside frees its tile for a unit resuming later in
 * the array with a full allowance rather than a stale one. Within the second
 * pass units are walked in `state.units` order, which is part of the state — so
 * two units whose orders contend for the same tile always resolve the same way.
 */
function resetMovement(state: GameState): void {
  for (const unit of state.units) {
    unit.movesLeft = fullMovement(unit, state);
    // The same allowance, refilled in the same breath: one attack per unit per
    // turn, and this is the turn ending. It is cleared *after* `healUnits` has
    // read it, which is the whole reason that phase comes first.
    unit.hasAttacked = false;
  }
  for (const unit of state.units) {
    const path = unit.path;
    if (!path) continue;
    if (path.length === 0) {
      // Only reachable from a hand-edited save; an idle unit has no `path` key.
      delete unit.path;
      continue;
    }
    advanceAlongPath(state, unit, path);
  }
}

/**
 * Runs every phase in order. Called by the `endTurn` command once the last
 * outstanding seat has finished, before the flags are cleared and the turn
 * counter advances — so a phase still sees the turn that is ending in
 * `state.turn`, and sees every player marked as having ended it.
 */
export function runEndOfTurn(state: GameState): TurnReport {
  const report = emptyTurnReport();
  // The marks are taken **before** a phase runs, because a triumph can be earned
  // by nearly any of them — a wonder in `advanceProduction`, an era in
  // `advanceResearch`, a camp burnt out by a raider's own march in
  // `resetMovement`, a standing count in `renown` — and a diff of one
  // append-only list is cheaper and less forgettable than a sink threaded
  // through all four. See `TurnReport.triumphs`.
  const marks = triumphMarks(state);
  for (const phase of END_OF_TURN_PHASES) phase.run(state, report);
  report.triumphs.push(...triumphsSince(state, marks));
  return report;
}
