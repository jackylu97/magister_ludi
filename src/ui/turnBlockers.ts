/**
 * Unfinished business: what the local seat still owes the turn before it may
 * end it.
 *
 * Civ's oldest and best piece of hand-holding. The player presses End Turn, and
 * instead of the turn going by with a settler standing where it was dropped and
 * a capital building nothing, the button *takes them to the thing they forgot*.
 * One press, one blocker, in a fixed order — press again and it finds the next.
 *
 * Why it lives here and not in `src/sim/`
 * ---------------------------------------
 * Because it is not a rule. The reducer's `endTurn` is unchanged and will still
 * take the command from anybody who sends it — a remote client, an AI, a replay
 * of a log recorded before this file existed. Determinism is untouched: this is
 * a *reader* of the state that decides what a button says and where the camera
 * looks. Putting it in the simulation would make a UI courtesy into a rule that
 * every other seat would then have to obey.
 *
 * Why it is a pure function anyway
 * --------------------------------
 * `controls.ts` is browser-only and untestable without a DOM; the question
 * "what is this seat's first blocker" is neither. Extracting it as a fold over
 * `(state, playerId)` means the priority order, the idle definition and every
 * exclusion are covered by ordinary unit tests, and `controls.ts` is left with
 * only the part that genuinely needs a camera: panning, selecting, and saying
 * so.
 *
 * The idle definition
 * -------------------
 * A unit is idle when it **can still be told to do something and has not been
 * told**:
 *
 *     movesLeft > 0  &&  no stored path  &&  not fortified
 *
 * Each clause earns its place, and one omission is deliberate:
 *
 *   · `movesLeft > 0` — a unit that spent its allowance is finished for the
 *     turn whatever else is true of it. This is also the whole of the answer to
 *     "did it attack": a piece that attacked and has no movement left is spent
 *     and does not block, while a piece that attacked and *can still walk* is
 *     genuinely awaiting orders and does. `hasAttacked` is therefore never read
 *     — reading it would silence a unit that still has a move to make, which is
 *     exactly the unit the player most often forgets.
 *   · no stored `path` — a column marching to a waypoint three turns away has
 *     its orders. Asking about it every turn of the march would train the player
 *     to press through the prompt.
 *   · not fortified — digging in *is* the order. `fortifiedTurns` present is
 *     the fortified state (see its docblock in `state.ts`), and a fortified
 *     sentry keeps its full movement, so without this clause every garrison in
 *     the empire would block every turn forever.
 *
 * **Workers need no fourth clause, and that is a result rather than an
 * oversight.** M7's builders are exactly the unit this prompt exists for — a
 * worker parked on a hex it could be farming is a wasted turn — and the three
 * clauses already surface one: it keeps its full movement while it stands
 * around, so `movesLeft > 0` catches it; building spends *all* of that allowance
 * (see `improvements.ts`), so it stops blocking the instant it has done the
 * turn's work; and a worker whose last charge went into a farm is removed from
 * the board entirely, so "has movement but nothing left to spend" is a state
 * that cannot exist. A clause reading `chargesLeft` would therefore have been a
 * clause that never changed an answer.
 *
 * The other two blockers are simple facts: a city of yours with an empty
 * production queue, and a research pool aimed at nothing while there is still
 * something to aim it at.
 */

import { availableTechs } from '../sim/tech';
import { type GameState, type Unit, hasEndedTurn, playerById } from '../sim/state';

/**
 * One piece of unfinished business, carrying whatever the interface needs to
 * take the player to it.
 *
 * A discriminated union rather than `{ kind, id }`: the id means a different
 * thing in each arm, and `'research'` has no id at all — the empire is the
 * subject.
 */
export type TurnBlocker =
  | { kind: 'idleUnit'; unitId: number }
  | { kind: 'cityProduction'; cityId: number }
  | { kind: 'research' };

/**
 * Is this unit awaiting orders? See the module docblock for why these three
 * clauses and no fourth.
 *
 * `path` is absent rather than empty on an idle unit (`state.ts` keeps that
 * invariant so snapshots compare byte for byte), but this tolerates an empty
 * array too: a route with nothing left in it is not an order.
 */
export function isIdleUnit(unit: Unit): boolean {
  if (unit.movesLeft <= 0) return false;
  if (unit.path !== undefined && unit.path.length > 0) return false;
  if (unit.fortifiedTurns !== undefined) return false;
  return true;
}

/**
 * The first thing this seat still owes the turn, or `null` when it owes
 * nothing and End Turn may simply end the turn.
 *
 * The order is the order of the cost of forgetting: a unit that stands still is
 * a turn of movement gone, a city with an empty queue is a turn of hammers
 * gone, and an unaimed science pool is only ever *late* — it keeps its
 * contents. Within a kind the answer follows `state.units` / `state.cities`
 * order, which is part of the state, so the same board always surfaces the same
 * unit first.
 *
 * Three seats are never blocked, because for them the question is not being
 * asked in good faith: a player who does not exist, one who has been
 * eliminated (they have no units and no cities, and would otherwise be held
 * hostage forever by an unchosen technology), and one who has already ended
 * this turn — that seat's End Turn is a no-op the reducer refuses, and steering
 * their camera to a unit they cannot move would be a worse answer than nothing.
 */
export function firstBlocker(state: GameState, playerId: number): TurnBlocker | null {
  const player = playerById(state, playerId);
  if (!player || player.eliminated) return null;
  if (hasEndedTurn(state, playerId)) return null;

  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    if (isIdleUnit(unit)) return { kind: 'idleUnit', unitId: unit.id };
  }

  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    if (city.queue.length === 0) return { kind: 'cityProduction', cityId: city.id };
  }

  // Nothing left to research is not unfinished business — it is a finished
  // tree, and a prompt that could never be satisfied would be a locked button.
  if (player.researching === null && availableTechs(state, playerId).length > 0) {
    return { kind: 'research' };
  }

  return null;
}
