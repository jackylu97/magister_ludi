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
 * `unitAwaitsOrders` (`sim/units.ts`) is the one predicate — the sim owns it so
 * an AI or a future second client asks the same question this interface does.
 * Its docblock is the complete accounting of every clause, including the fifth
 * (a routed trade caravan is never idle, however much movement it has left).
 * What is worth repeating here is only why it lives in the sim and not in this
 * file: this module decides *what the button does about* a unit that is
 * awaiting orders, not *what counts as* awaiting orders.
 *
 * **Blocking and offering are two questions** (2026-09-08, `docs/flags.md`
 * (bbb)). Since standing orders started marching on the turn's own points, a
 * column under orders opens its owner's turn standing still with a *full*
 * allowance — the single most useful thing a camera could show, and the last
 * thing anybody wants End Turn to bar on, because then every multi-turn march
 * would be a button press to get past. So there are two readings and two
 * functions here:
 *
 *   · `firstBlocker` — what the button may not go past. Asks the narrow
 *     `unitAwaitsOrders`, which keeps its "no stored path" clause exactly as
 *     written: a piece with orders has been told what to do.
 *   · `firstUnitOffer` — where the camera goes next. Asks the wide
 *     `unitOfferedForOrders`, so a piece under orders is offered with its
 *     committed route drawn and may simply be walked past.
 *
 * The offer never bars anything, which is why it is a second function rather
 * than a flag on the first: a caller that wanted "what stops the turn" and got
 * "what is worth looking at" would be a locked End Turn button.
 *
 * **Workers need no clause of their own, and that is a result rather than an
 * oversight.** M7's builders are exactly the unit this prompt exists for — a
 * worker parked on a hex it could be farming is a wasted turn — and
 * `unitAwaitsOrders`'s existing clauses already surface one: it keeps its full
 * movement while it stands around, so `movesLeft > 0` catches it; building
 * spends *all* of that allowance (see `improvements.ts`), so it stops blocking
 * the instant it has done the turn's work; and a worker whose last charge went
 * into a farm is removed from the board entirely, so "has movement but nothing
 * left to spend" is a state that cannot exist. A clause reading `chargesLeft`
 * would therefore have been a clause that never changed an answer.
 *
 * The other three blockers are simple facts: an unanswered discovery offer, a
 * city of yours with an empty production queue, and a research pool aimed at
 * nothing while there is still something to aim it at.
 *
 * The discovery blocker goes **first**, ahead of the idle unit. The order here is
 * the cost of forgetting, and forgetting a ruin is the dearest of the four: an
 * idle unit costs a turn of movement and an empty queue a turn of hammers, both
 * recoverable, while an unspent offer is a boon the player crossed the map for
 * and cannot be given by anything else. It is also the only one that *bars* rather
 * than nags — the reducer refuses a `chooseDiscovery` from a seat that has ended
 * its turn, so a player who pressed past this would have to wait a whole
 * resolution to answer a card that is already on screen.
 *
 * Skipped units, and why sleep is not one of them
 * -----------------------------------------------
 * A player can wave a specific idle unit off with Skip Turn (`controls.ts`),
 * and that unit must then stop blocking End Turn for the rest of *this* turn.
 * Skip is not a clause on `unitAwaitsOrders`, deliberately: it is not a fact
 * about the unit (a replay or an AI reading the same state has no idea one
 * seat's interface waved it off, and must not need to), it is a fact about
 * what one client's player has already been asked and answered. So it lives
 * as an optional exclusion `firstBlocker` is handed, rather than as state this
 * module would otherwise have to invent a place to keep. The set is owned and
 * cleared by `controls.ts` — this module only ever reads it for one call.
 *
 * **Sleep is the other kind, and the pair is the point.** Both silence a unit;
 * they differ in *whose fact it is*, and that difference decides where each one
 * lives:
 *
 *   · **Skip** is a fact about a *conversation* — this client asked, this
 *     player said "not now". It lasts one turn, it is not in the state, it is
 *     not in the log, a second client watching the same game knows nothing
 *     about it, and it must stay that way: a save that remembered which units
 *     one seat had clicked past would be a save that remembers an interface.
 *   · **Sleep** is a fact about the *piece*. It is a logged command, it lives on
 *     `Unit.sleeping`, it survives a save and a reload, an AI reading the state
 *     can see it, and the simulation itself ends it — `wakeSleepers` (`turn.ts`)
 *     wakes a sleeper when an enemy comes inside its own sight, which is a thing
 *     no view-layer skip set could ever do.
 *
 * So skip is an argument to this function and sleep is a clause inside it, and
 * neither is a candidate to be folded into the other. A unit can of course be
 * both, and the answer is the same either way.
 */

import { greatPersonBlocker } from '../sim/greatPeople';
import { religionBlocker } from '../sim/religion';
import type { Player } from '../sim/state';
import { statecraftBlocker } from '../sim/statecraft';
import { wagerBlocker } from '../sim/wagers';
import { availableTechs } from '../sim/tech';
import { type GameState, hasEndedTurn, playerById } from '../sim/state';
import { unitAwaitsOrders, unitOfferedForOrders } from '../sim/units';

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
  | { kind: 'research' }
  | { kind: 'discovery' }
  | { kind: 'statecraft'; what: 'order' | 'doctrine' }
  | { kind: 'religion' }
  | { kind: 'greatPerson' }
  | { kind: 'wager' };

/**
 * Which Statecraft draft this empire owes an answer to, or `null`.
 *
 * The two that block, in the order they can be outstanding — a draft first,
 * because an adoption's Doctrine draw can only exist after one. The rule itself
 * is `statecraftBlocker` in the simulation (which is where a future AI reads
 * it); this only turns its sentence into the discriminant the interface steers
 * by, so there is still exactly one answer to "does this empire owe a card".
 */
function statecraftBlockerKind(player: Player): 'order' | 'doctrine' | null {
  const said = statecraftBlocker(player);
  if (said === null) return null;
  return player.statecraft.pendingOrder !== undefined ? 'order' : 'doctrine';
}

/** What `firstBlocker` may be asked to look past. See "Skipped units" above. */
export interface BlockerExclusions {
  /** Idle units to treat as though they were not idle, for this call only. */
  skippedUnitIds?: ReadonlySet<number>;
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
 *
 * `exclusions.skippedUnitIds` is the one thing a caller may ask this otherwise
 * stateless question to look past — see "Skipped units" in the module
 * docblock. It touches only the idle-unit arm; a skip does not excuse a city
 * or the research pool, which were never what Skip Turn was for.
 */
export function firstBlocker(
  state: GameState,
  playerId: number,
  exclusions?: BlockerExclusions,
): TurnBlocker | null {
  const player = playerById(state, playerId);
  if (!player || player.eliminated) return null;
  // The wild has no screen to be prompted on and never sends an `endTurn`; a
  // blocker computed for it would be a question nobody can answer.
  if (player.barbarian) return null;
  if (hasEndedTurn(state, playerId)) return null;

  // **First**, ahead of everything, and that is the cost-of-forgetting order read
  // one notch further: an idle unit costs a turn of movement and an empty queue a
  // turn of hammers, but an unanswered discovery costs *the discovery* — the
  // offer sits on the player until it is spent, no other seat can take it, and a
  // player who ends the turn without seeing it has simply not been shown the
  // thing they walked across the map for. It is also the only blocker whose
  // subject is a decision the reducer is holding open rather than a thing on the
  // board, which is why it names no id: the empire is the subject.
  if (player.pendingDiscovery !== undefined) return { kind: 'discovery' };

  // **Beside the discovery, and for its reasons exactly.** A Statecraft draft is
  // the same shape of debt one scale out: the offer sits on the empire until it
  // is spent, no other seat can take it, and the reducer refuses a `chooseOrder`
  // from a seat that has ended its turn — so a player who pressed past this
  // would have to wait a whole resolution to answer a card already on screen.
  //
  // A **banked government** deliberately does not appear here. Entry XV makes
  // adoption bankable on purpose — take it when your slots are worth swapping —
  // and a blocker on it would delete the only reason banking exists. The top
  // bar's badge is where an unclaimed triple is said out loud instead.
  const statecraft = statecraftBlockerKind(player);
  if (statecraft !== null) return { kind: 'statecraft', what: statecraft };

  // **And beside both**, for their reasons exactly (ledger Entry XXVIII): a
  // belief offer sits on the empire until it is spent, no other seat can take
  // it, and the reducer refuses a `chooseBelief` from a seat that has ended its
  // turn — so pressing past it would mean waiting a whole resolution to answer
  // a card already on screen. It is third rather than first only because a
  // discovery and a draft can both be outstanding at once and something has to
  // be; a god does not go stale while the other two are answered.
  if (religionBlocker(player) !== null) return { kind: 'religion' };

  // **The fourth offer**, and it owes the turn exactly what the other three do
  // (`docs/great-people.md`): the hand sits on the empire until it is spent, no
  // other seat can answer it, and the reducer refuses a `chooseGreatPerson` from
  // a seat that has ended its turn — so pressing past it would mean waiting a
  // whole resolution to answer a card already on screen. It is fourth of the
  // four rather than first for the discovery's reason read the other way: all
  // four can be outstanding at once and something has to be last, and a name
  // does not go stale while the other three are answered.
  //
  // An **empty** offer never reaches here: `greatPersonBlocker` answers `null`
  // for one, because a spent roster is not a decision.
  if (greatPersonBlocker(player) !== null) return { kind: 'greatPerson' };

  // **The fifth offer, and the shortest-lived of them** (`docs/wager.md` §2).
  // The three wagers are dealt to the whole world on the turn an age opens and
  // every seat answers in that one window, so this blocks on the deal turn and
  // never after it — the `wagers` phase fills an empty chair with the first card
  // at the end of the following turn, which is what a hot-seat game with an
  // absent player needs and what a human must never be quietly given instead of
  // being asked.
  //
  // It goes below the four offers for their own stated reason: all five can be
  // outstanding at once and something has to be last, and a bar the whole world
  // was dealt does not go stale while a discovery, a draft, a god and a name are
  // answered. The rule itself is `wagerBlocker` in the simulation, where the bot
  // reads it.
  if (wagerBlocker(state, playerId) !== null) return { kind: 'wager' };

  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    if (exclusions?.skippedUnitIds?.has(unit.id)) continue;
    if (unitAwaitsOrders(unit)) return { kind: 'idleUnit', unitId: unit.id };
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

/**
 * The next piece to **hand the player**, or `null` when there is nobody worth
 * flying the camera to.
 *
 * `firstBlocker`'s unit arm read one clause wider — see "Blocking and offering"
 * in the module docblock, and `unitOfferedForOrders` (`sim/units.ts`) for the
 * predicate itself. It answers "who should I be looking at", where its sibling
 * answers "what may I not end the turn without settling", and the difference is
 * a column under standing orders: it is not idle, it must not bar the button,
 * and it is exactly the piece a player wants in hand at the top of a turn — it
 * is standing still with a full allowance, and the route it is holding is the
 * thing they might want to change.
 *
 * Only ever `{ kind: 'idleUnit' }` or nothing: the four offers a seat owes
 * (a discovery, a draft, a god, a name) are `firstBlocker`'s business and are
 * raised by the button, not by the camera. Every caller of this asks the
 * blocker first anyway, so an empire owing a card is never quietly steered past
 * it.
 *
 * The three never-offered seats are `firstBlocker`'s three, for its reasons: a
 * player who does not exist, the wild, and a seat that has already ended this
 * turn — steering a finished seat's camera to a piece it may not move would be
 * a worse answer than nothing. `exclusions.skippedUnitIds` is honoured too: a
 * piece the player has waved off this turn is waved off for the cycle as well,
 * which is what Skip Turn means.
 */
export function firstUnitOffer(
  state: GameState,
  playerId: number,
  exclusions?: BlockerExclusions,
): TurnBlocker | null {
  const player = playerById(state, playerId);
  if (!player || player.eliminated) return null;
  if (player.barbarian) return null;
  if (hasEndedTurn(state, playerId)) return null;

  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    if (exclusions?.skippedUnitIds?.has(unit.id)) continue;
    if (unitOfferedForOrders(unit)) return { kind: 'idleUnit', unitId: unit.id };
  }
  return null;
}
