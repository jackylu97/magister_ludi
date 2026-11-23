/**
 * **The war losses the game keeps** (`Player.warLosses`).
 *
 * Each record says that one empire lost a unit or a town to another empire on
 * a turn. The game keeps a record for `rules.war.lossWindowTurns` turns.
 *
 * War weariness read this list until the user removed it (2026-11-23,
 * `docs/flags.md`, "Eight simpler rules"). A loss now costs no happiness. The
 * list stays because the bots read their recent fighting from it: their kills,
 * the towns they took and the units they lost (`warOutlook`, `src/ai/bot.ts`).
 * No rule of the game reads it.
 *
 * Where each part lives:
 *
 *   · **the record** is `Player.warLosses` (`state.ts`). `recordWarLoss` below
 *     is its only writer.
 *   · **the callers** of `recordWarLoss` are the places where one empire's piece
 *     or town is destroyed or taken by another. A source test pins them
 *     (`test/sim/warLosses.test.ts`):
 *       - `applyCombat` (`combat.ts`): a laden trader plundered by an attack, a
 *         defender killed (by a melee or a ranged blow), an attacker killed by
 *         the counter-blow of a unit or a city, a defender turned to the
 *         attacker's side, and a ship that joins the defender;
 *       - `captureCity` (`combat.ts`): a town taken by force;
 *       - `arriveOnTile` (`arrival.ts`): a laden trader plundered and a civilian
 *         captured by a piece arriving on its hex.
 *   · **the broom** is `pruneWarLosses`, run by the `settleDiplomacy` phase.
 *
 * What is not a loss:
 *
 *   · anything to do with the barbarians, on either side. Rebels raised by
 *     unrest are barbarians too;
 *   · a town handed over in a peace deal (`handOverCity` called from
 *     `diplomacy.ts`), because nobody took it by force;
 *   · a unit its own owner disbands, or one the creditors take for debt;
 *   · a settler, worker, prophet or great person spending itself.
 *
 * Nothing counts down. A reader compares a loss against `state.turn`, as
 * `Player.triumphs` and every timed effect do. The broom only deletes records
 * that are already outside the window.
 *
 * **No clock moves here.** No slate tenant on the economy clock reads this
 * list. The bots' reading is on the revision clock, which every command and
 * every phase moves.
 */

import { RULES } from './rulesData';
import { type GameState, type WarLoss, type WarLossKind, playerById } from './state';

/** How many turns a loss is kept. See `WarRules.lossWindowTurns`. */
const WINDOW_TURNS = RULES.war.lossWindowTurns;

/**
 * Is this loss still inside the window on this turn?
 *
 * A loss on turn `t` is kept from turn `t` to turn `t + lossWindowTurns − 1`.
 * A window of nothing keeps nothing.
 */
export function lossInWindow(loss: WarLoss, turn: number): boolean {
  return turn - loss.turn < WINDOW_TURNS;
}

/**
 * **How many turns a war loss is kept**: the rule's window. The bot reads a
 * seat's recent fighting from this list (bot batch BP4), so it may not look
 * further back than the records are kept.
 */
export function lossTurnsCounted(): number {
  return WINDOW_TURNS;
}

/**
 * **Writes down one war loss**: `loserId` lost a unit or a town to `byId`.
 *
 * The only writer of `Player.warLosses`. It does nothing when the two are the
 * same empire, when either id names nobody, or when either side is the
 * barbarians, so its callers can call it on every loss without checking.
 */
export function recordWarLoss(
  state: GameState,
  loserId: number,
  byId: number,
  kind: WarLossKind,
): void {
  if (loserId === byId) return;
  const loser = playerById(state, loserId);
  const winner = playerById(state, byId);
  if (!loser || !winner) return;
  if (loser.barbarian || winner.barbarian) return;
  const record: WarLoss = { turn: state.turn, by: byId, kind };
  if (loser.warLosses === undefined) loser.warLosses = [record];
  else loser.warLosses.push(record);
}

/**
 * **The broom**: deletes every war loss that has left the window, and the list
 * itself once it is empty.
 *
 * Run by the `settleDiplomacy` phase beside the truce broom. It only deletes
 * records that `lossInWindow` already refuses on this turn and on every later
 * one. It keeps a long game's state from growing a record for every loss ever
 * suffered.
 */
export function pruneWarLosses(state: GameState): void {
  for (const player of state.players) {
    const losses = player.warLosses;
    if (losses === undefined) continue;
    const kept = losses.filter((loss) => lossInWindow(loss, state.turn));
    if (kept.length === losses.length) continue;
    if (kept.length === 0) delete player.warLosses;
    else player.warLosses = kept;
  }
}
