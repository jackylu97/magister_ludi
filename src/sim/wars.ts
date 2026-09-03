/**
 * Who is at war with whom, and who may not declare on whom yet — the register
 * and its readings, and nothing that *does* anything.
 *
 * The whole of the war state is two arrays on `GameState`, and both are
 * **symmetric pair relations**: one row per unordered pair, written with the
 * lower player id in `a`. There is no per-seat list, no mirrored copy and no
 * "who declared on me" — a war is a fact about two empires, so it is stored
 * once and asked from either side (`docs/war-diplomacy.md`, section 1).
 *
 * Why this is a leaf
 * ------------------
 * `atWar` is read by the movement evaluator, by the combat planner and by the
 * raid gate — three of the lowest modules in the simulation — so it may import
 * nothing that imports them. It imports `state.ts` and the rule book and stops
 * there, exactly as `roads.ts` does one system over, and the verbs that
 * *change* the register live a layer up in `diplomacy.ts` where they can reach
 * `arriveOnTile` and the trade rules. `state.ts` names the two shapes below in
 * a **type-only** import, which is the documented exception: nothing runs
 * across that arrow.
 *
 * The wild is never in the register
 * ---------------------------------
 * A barbarian has no diplomacy, no seat at any table and nothing to sign, and
 * the rule the whole game already plays by is that it fights everybody. So
 * there is no row for it, ever, and `atWar` says *true* for it without looking
 * — which is what makes every gate downstream of this file a single clause
 * (`if (!atWar(...)) refuse`) that leaves the wild exactly as it was. A row
 * naming the wild is not "a war"; it is a corrupt save, and `declareWarError`
 * is where it is refused.
 *
 * Nothing here counts down
 * ------------------------
 * `Truce.untilTurn` is an **absolute** turn compared against `state.turn`, the
 * discipline `TimedEffect` states and `SlottedOrder.sealedUntil` keeps: a truce
 * that has run out is already inert, and `pruneTruces` is a broom rather than a
 * clock — deleting nothing would change no outcome, which is exactly what makes
 * it safe to run anywhere in the pipeline.
 */

import { RULES } from './rulesData';
import { type GameState, isBarbarian, playerById } from './state';

/**
 * One live war, as the unordered pair it is.
 *
 * `a < b` always, which is not a convention but the *key*: it is what makes
 * "is there a row for this pair" one comparison rather than two, and what makes
 * a second row for the same pair impossible to write by accident. `openWar`
 * below is the only place a row is built, and it orders the pair itself.
 *
 * `declaredTurn` is kept for the sentence a screen says ("at war since …") and
 * for nothing else — no rule anywhere reads it, and a war does not get worse
 * with age in v1.
 *
 * `offers` is the standing white-peace proposals on this war, as a **sorted
 * list of player ids** — the key is *absent* while nobody has offered, so a war
 * nobody is suing over serialises exactly as one from before peace existed.
 * Sorted rather than in offer order because nothing about the outcome may
 * depend on who spoke first: peace resolves when *both* ids are here, which is
 * a set question, and a list that recorded the order would be recording
 * something no rule is allowed to read.
 */
export interface WarState {
  a: number;
  b: number;
  declaredTurn: number;
  offers?: number[];
}

/**
 * One truce: this pair may not go to war again until `untilTurn`.
 *
 * `WarState`'s twin in shape and its opposite in meaning, and a separate array
 * rather than a flag on a war for the plainest reason — a truce exists exactly
 * when a war does not. `untilTurn` is absolute (see the module docblock).
 */
export interface Truce {
  a: number;
  b: number;
  untilTurn: number;
}

/** The pair, ordered — the key every row in both registers is written with. */
function pair(x: number, y: number): { a: number; b: number } {
  return x <= y ? { a: x, b: y } : { a: y, b: x };
}

/**
 * The war row for this pair, or `undefined`.
 *
 * Asked by anything that wants to *say* something about the war (since when,
 * who has offered peace); anything that only wants to know whether blows are
 * legal asks `atWar`, which answers for the wild as well.
 */
export function warBetween(state: GameState, x: number, y: number): WarState | undefined {
  const { a, b } = pair(x, y);
  for (const war of state.wars) {
    if (war.a === a && war.b === b) return war;
  }
  return undefined;
}

/**
 * **THE** question every gate in the simulation asks: may these two empires do
 * violence to each other?
 *
 * Three clauses in precedence, and each is one sentence of the ruling:
 *
 *   · **Nobody is at war with themselves.** A seat's own pieces and ground are
 *     never a legal target, and this is where that is said once rather than in
 *     each of the four gates.
 *   · **The wild is at war with everybody, always.** No row, no declaration, no
 *     peace — see the module docblock. It is answered before the register is
 *     read, so a world with no wars in it still lets the raiders raid.
 *   · Otherwise: is there a row?
 *
 * An id that names nobody reads as *not* at war, which is the strictest honest
 * answer: a gate handed a stale id refuses rather than permitting a blow
 * against a seat that is not there.
 */
export function atWar(state: GameState, x: number, y: number): boolean {
  if (x === y) return false;
  if (playerById(state, x) === undefined || playerById(state, y) === undefined) return false;
  if (isBarbarian(state, x) || isBarbarian(state, y)) return true;
  return warBetween(state, x, y) !== undefined;
}

/**
 * The live truce between this pair, or `null`.
 *
 * **Live** is the whole of the reading: a row whose `untilTurn` has arrived is
 * already spent and answers `null` here, whether or not the broom has got to it
 * yet. That is why nothing downstream ever compares a turn itself — the
 * comparison lives here, once.
 */
export function truceBetween(state: GameState, x: number, y: number): Truce | null {
  if (x === y) return null;
  const { a, b } = pair(x, y);
  for (const truce of state.truces) {
    if (truce.a !== a || truce.b !== b) continue;
    return state.turn < truce.untilTurn ? truce : null;
  }
  return null;
}

/**
 * Turns of peace this pair still owes each other, or zero when they owe none.
 *
 * The one figure the refusal sentence and the Diplomacy screen both print, so
 * "the peace holds for three more turns" and the countdown beside the seat's
 * name can never disagree.
 */
export function truceTurnsLeft(state: GameState, x: number, y: number): number {
  const truce = truceBetween(state, x, y);
  return truce === null ? 0 : Math.max(0, truce.untilTurn - state.turn);
}

/** Every empire this seat is at war with, in `state.players` order. */
export function enemiesOf(state: GameState, playerId: number): number[] {
  const list: number[] = [];
  for (const player of state.players) {
    if (player.id === playerId) continue;
    if (atWar(state, playerId, player.id)) list.push(player.id);
  }
  return list;
}

/** Has this seat put a standing white-peace offer on this war? */
export function hasPeaceOffer(state: GameState, from: number, to: number): boolean {
  const war = warBetween(state, from, to);
  return war?.offers?.includes(from) === true;
}

// --- the writers ------------------------------------------------------------

/**
 * Opens a war. **Validates nothing** — `declareWarError` is the gate, and it is
 * asked in full before this is called (the reducer's contract).
 *
 * Appended rather than inserted, so `state.wars` is in declaration order for
 * `GameState.camps`' stated reason: an outcome that depends on iteration order
 * must depend on an order the state itself carries. Nothing about a war
 * currently iterates for an outcome, which is precisely the property worth not
 * giving up by accident.
 */
export function openWar(state: GameState, x: number, y: number): WarState {
  const row: WarState = { ...pair(x, y), declaredTurn: state.turn };
  state.wars.push(row);
  return row;
}

/**
 * Closes a war and writes the truce that follows it, returning the truce's own
 * absolute expiry.
 *
 * The two halves are one function because they are one event: there is no way
 * for a war to end in v1 that does not buy the losers and the winners the same
 * ten turns of quiet (`rules.war.truceTurns`), and splitting them would make a
 * peace with no truce something a future caller could write by forgetting a
 * line. A pair that somehow already carries a truce row has it **rewritten**
 * rather than joined by a second, so the register keeps its one-row-per-pair
 * invariant whatever order things happened in.
 */
export function closeWar(state: GameState, x: number, y: number): number {
  const { a, b } = pair(x, y);
  state.wars = state.wars.filter((war) => war.a !== a || war.b !== b);
  const untilTurn = state.turn + RULES.war.truceTurns;
  const existing = state.truces.find((truce) => truce.a === a && truce.b === b);
  if (existing) existing.untilTurn = untilTurn;
  else state.truces.push({ a, b, untilTurn });
  return untilTurn;
}

/**
 * Writes or clears one seat's standing peace offer on a war it is in.
 *
 * Presence is the state, twice over: an empty `offers` list is **deleted**
 * rather than left as `[]`, so a war nobody is suing over is byte-identical to
 * one from before anybody offered, and a war that ends takes every offer on it
 * with it because the offers live on the row (see `WarState.offers`). Sorted on
 * every write, for the reason on the field.
 *
 * Returns true when something actually changed, which is what lets the reducer
 * refuse a second identical offer with a sentence instead of logging a command
 * that does nothing.
 */
export function setPeaceOffer(
  state: GameState,
  from: number,
  to: number,
  standing: boolean,
): boolean {
  const war = warBetween(state, from, to);
  if (!war) return false;
  const held = war.offers ?? [];
  const has = held.includes(from);
  if (has === standing) return false;
  const next = standing ? [...held, from].sort((p, q) => p - q) : held.filter((id) => id !== from);
  if (next.length === 0) delete war.offers;
  else war.offers = next;
  return true;
}

/**
 * Sweeps out truces that have run out. A **broom, not a clock**
 * (`pruneTimedEffects`' twin — see the module docblock): every reader already
 * compares an absolute turn, so a spent row is inert and deleting it changes no
 * outcome at all. It exists so a long game's save does not accumulate dead
 * paper.
 */
export function pruneTruces(state: GameState): void {
  state.truces = state.truces.filter((truce) => state.turn < truce.untilTurn);
}
