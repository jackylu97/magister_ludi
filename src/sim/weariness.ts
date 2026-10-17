/**
 * **War weariness** (batch WC2, `docs/flags.md` (rrrrrr) part 2).
 *
 * An empire that is losing a war grows tired of it. Weariness against one
 * enemy is this empire's losses to that enemy minus that enemy's losses to this
 * empire, counted over the last `rules.war.weariness.windowTurns` turns and
 * never below zero, so a war you are winning costs nothing. A unit counts
 * `unitLoss` points and a town taken by force counts `townLoss` (the user's
 * ruling: a town is worth eight units). Each point costs `happinessPerPoint`
 * happiness, as one cost line per enemy in the happiness list
 * (`explainHappiness`, `meters.ts`). That is all weariness does: it lowers
 * happiness, which can slow growth or shrink the bonus a happy empire earns.
 * It never touches combat.
 *
 * Where each part of the rule lives:
 *
 *   · **the record** is `Player.warLosses` (`state.ts`): one entry per loss,
 *     stamped with the turn and the empire that caused it. `recordWarLoss` below
 *     is its only writer.
 *   · **the callers** of `recordWarLoss` are the places where one empire's piece
 *     or town is destroyed or taken by another. They are pinned by a source test
 *     (`test/sim/weariness.test.ts`):
 *       - `applyCombat` (`combat.ts`): a laden trader plundered by an attack, a
 *         defender killed (by a melee or a ranged blow), and an attacker killed
 *         by the counter-blow of a unit or a city;
 *       - `captureCity` (`combat.ts`): a town taken by force;
 *       - `arriveOnTile` (`arrival.ts`): a laden trader plundered and a civilian
 *         captured by a piece arriving on its hex.
 *   · **the reading** is `explainWeariness` (one line per enemy) and
 *     `foldWeariness` (the total). The happiness meter and the foreign courts
 *     screen read it, and the bots read `wearinessBetween` for one war.
 *   · **the law** may count an empire's own losses for less (Dominion batch D7:
 *     The Funeral Oration halves its unit losses, The Glorious Dead counts none
 *     of its losses). Only the empire's own reading changes: what its losses
 *     offset in its enemy's reading stays whole (the triage's reading 24).
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
 * Nothing counts down. A loss is compared against `state.turn` whenever the
 * list is read, which is the discipline of `Player.triumphs` and of every timed
 * effect. The broom only deletes records that are already outside the window,
 * so running it or not changes no outcome.
 *
 * **Keeping the happiness memo fresh.** `meterEffects` is remembered on the
 * economy clock (`slate.ts`). `recordWarLoss` moves that clock after it writes,
 * and the turn change moves it too (`applyEndTurn` bumps it on the line after
 * `state.turn += 1`), which is the moment a loss can leave the window. The
 * broom does not move it, because what it deletes no reading counts.
 */

import { RULES } from './rulesData';
import { bumpEconomy } from './slate';
import { type GameState, type WarLoss, type WarLossKind, playerById } from './state';
// Straight from the evaluator rather than through the `statecraft.ts` index, a
// function-level cycle (the evaluator reads the meters, which read this file).
import { cardRulePercent } from './statecraft/evaluator';

/** Every figure of the rule. See `WearinessRules`. */
const WEARINESS = RULES.war.weariness;

/**
 * Is this loss still inside the window on this turn?
 *
 * A loss on turn `t` counts from turn `t` to turn `t + windowTurns − 1`. A
 * window of nothing counts nothing.
 */
export function lossInWindow(loss: WarLoss, turn: number): boolean {
  return turn - loss.turn < WEARINESS.windowTurns;
}

/** The points of weariness one loss of this kind is worth. */
function lossPoints(kind: WarLossKind): number {
  return kind === 'town' ? WEARINESS.townLoss : WEARINESS.unitLoss;
}

/**
 * **Writes down one war loss**: `loserId` lost a unit or a town to `byId`.
 *
 * The only writer of `Player.warLosses`. It does nothing when the two are the
 * same empire, when either id names nobody, or when either side is the
 * barbarians, so its callers can call it on every loss without checking.
 *
 * It moves the economy clock after the write, because the happiness meter reads
 * this list and is remembered on that clock (see the module docblock).
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
  bumpEconomy(state);
}

/** One enemy's line of an empire's war weariness. */
export interface WearinessLine {
  /** The enemy this line is about. */
  enemyId: number;
  /** Points this empire lost to that enemy inside the window. */
  suffered: number;
  /** Points that enemy lost to this empire inside the window. */
  inflicted: number;
  /** `suffered − inflicted`, never below zero: the weariness itself. */
  points: number;
  /** The happiness these points cost: `points × happinessPerPoint`. */
  happiness: number;
}

/**
 * The points one empire lost to another inside the window.
 *
 * `own` asks for the loser's **own** reading, which its law may lower (Dominion
 * batch D7): the unit points and the town points are each scaled by the
 * loser's `unitLossWeariness` and `townLossWeariness` percentages, and the sum
 * is rounded down. With no such card the figure is the plain sum.
 */
function pointsLost(state: GameState, loserId: number, byId: number, own = false): number {
  const losses = playerById(state, loserId)?.warLosses;
  if (losses === undefined) return 0;
  let units = 0;
  let towns = 0;
  for (const loss of losses) {
    if (loss.by !== byId) continue;
    if (!lossInWindow(loss, state.turn)) continue;
    if (loss.kind === 'town') towns += lossPoints(loss.kind);
    else units += lossPoints(loss.kind);
  }
  if (!own || units + towns === 0) return units + towns;
  const unitShare = lossShare(state, loserId, 'unitLossWeariness');
  const townShare = lossShare(state, loserId, 'townLossWeariness');
  return Math.floor((units * unitShare + towns * townShare) / 100);
}

/**
 * **What this empire's law says one kind of its losses counts for**, as a
 * share of the whole in percent: 100 with no card, 50 under The Funeral
 * Oration, nought under The Glorious Dead. Never below nought.
 */
function lossShare(
  state: GameState,
  playerId: number,
  rule: 'unitLossWeariness' | 'townLossWeariness',
): number {
  let percent = 0;
  for (const line of cardRulePercent(state, playerId, rule)) percent += line.percent;
  return Math.max(0, 100 + percent);
}

/**
 * **This empire's weariness against one enemy**, as the line `explainWeariness`
 * would print for it. A line of zeroes when nothing was lost either way.
 *
 * The one place the arithmetic is done. `explainWeariness` asks it for each
 * enemy, and the bots ask it for the one war they are deciding about.
 */
export function wearinessBetween(state: GameState, playerId: number, enemyId: number): WearinessLine {
  // This empire's own losses, as its law counts them; the enemy's losses
  // whole, because this empire's law says nothing about them.
  const suffered = pointsLost(state, playerId, enemyId, true);
  const inflicted = pointsLost(state, enemyId, playerId);
  const points = Math.max(0, suffered - inflicted);
  return { enemyId, suffered, inflicted, points, happiness: points * WEARINESS.happinessPerPoint };
}

/**
 * **This empire's war weariness**, one line per enemy (rule 5).
 *
 * One line for every other empire that this empire lost something to, or that
 * lost something to it, inside the window, in seat order. A line whose losses
 * cancel out is kept, with no points, so a surface can show an even exchange;
 * the happiness meter prints only the lines that cost something. The barbarians
 * never have a line, because no loss to or from them is ever recorded.
 */
export function explainWeariness(state: GameState, playerId: number): WearinessLine[] {
  const lines: WearinessLine[] = [];
  for (const enemy of state.players) {
    if (enemy.id === playerId || enemy.barbarian) continue;
    const line = wearinessBetween(state, playerId, enemy.id);
    if (line.suffered === 0 && line.inflicted === 0) continue;
    lines.push(line);
  }
  return lines;
}

/** Total weariness: the points of every line, summed. The only sum of one. */
export function foldWeariness(lines: readonly WearinessLine[]): number {
  let total = 0;
  for (const line of lines) total += line.points;
  return total;
}

/**
 * **The broom**: deletes every war loss that has left the window, and the list
 * itself once it is empty.
 *
 * Run by the `settleDiplomacy` phase beside the truce broom. It only deletes
 * records that `lossInWindow` already refuses on this turn and on every later
 * one, so no reading changes and the economy clock is left alone. It exists to
 * keep a long game's state from growing a record for every loss ever suffered.
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
