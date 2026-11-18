/**
 * **The phases of a bot seat's sitting, and the events that re-open one** (bot
 * batch BP16, stage B; `docs/flags.md`, the bullet "The bot's turn in phases").
 *
 * A sitting is one seat's run of decisions in one turn. Before this batch
 * `decideNext` (`bot.ts`) asked its whole list of arms again after every
 * command, so an arm that had nothing to say was asked at every decision (the
 * audit, `docs/plans/bot-simplification-audit-2026-11-17.md`: disband 4,901
 * times for no answer, diplomacy 4,564 for 44). Now a sitting runs in four
 * parts:
 *
 *   1. **The two first phases**: diplomacy, then spending. Each is asked until
 *      it has nothing more to do, and is then closed for the sitting.
 *   2. **The loop** over what needs an answer: the turn's blockers (idle units,
 *      towns with an empty queue, any offer), and the arms that move pieces.
 *   3. **The three last phases**, asked once the loop has nothing: research,
 *      the council, housekeeping, each until it has nothing more to do.
 *   4. **The end**: when the loop and every open phase have nothing, the
 *      sitting ends. The closed phases are not asked again.
 *
 * **Why three phases come after the loop.** The ruling's first shape asked all
 * five before the loop. On the five stored seeds it lowered production at turn
 * 100 by 26% (5 seeds of 5) and the improvements laid by 8% (5 of 5). Asking
 * research and the council after the loop, as the order before the phases did,
 * took both back to stage A's level (the section "BP16" of
 * `docs/plans/performance-pass-2026-11-06.md`, stage B).
 *
 * A closed phase opens again only when one of the events below has happened
 * since the seat's last decision. An event is a difference in the seat's own
 * print (`SeatPrint`) between two decisions, so it is raised by the seat's own
 * accepted command, whatever that command reported back.
 *
 * This file is a leaf: the phases, the print, the events, the tallies and the
 * check switch. The arms themselves are `bot.ts`'.
 */

import type { GameState, Player } from '../sim/state';
import { controlledResources, resourceCopies } from '../sim/cities';

/** The five phases of a sitting. */
export type SittingPhase = 'research' | 'diplomacy' | 'council' | 'spending' | 'housekeeping';

/** The phases asked before the loop, in order. */
export const FIRST_PHASES: readonly SittingPhase[] = ['diplomacy', 'spending'];

/** The phases asked once the loop has nothing, in order. */
export const LAST_PHASES: readonly SittingPhase[] = ['research', 'council', 'housekeeping'];

/** Every phase, in the order a sitting reaches them. */
export const SITTING_PHASES: readonly SittingPhase[] = [...FIRST_PHASES, ...LAST_PHASES];

/**
 * **The events, and the phases each one opens again.** A short, closed list.
 * Each entry is justified by a count on the five stored games to turn 100 (the
 * section "BP16" of `docs/plans/performance-pass-2026-11-06.md`, stage B): an
 * arm that had said nothing earlier in the sitting answered after this event.
 *
 *   · `purse`: the seat's gold, faith or culture changed after the spending
 *     phase closed (a ruin's gold, a plunder, a deal). On stage A's games the
 *     spend arm answered 71 times after such a change, and the arrears arm 4
 *     times. It opened spending 357 times in the final five games.
 *   · `copies`: the luxury copies the seat holds changed (a plantation laid, a
 *     town founded on a seam). Stage A's census found 53 swap papers that
 *     waited a turn after the seat gained a copy in its sitting. It opened
 *     diplomacy 257 times in the final five games.
 *
 * Two more were built and taken out, because with research, the council and
 * housekeeping asked after the loop they opened nothing in 3,000 sittings: a
 * change of held or seated cards (the council) and a change of a town's build
 * (housekeeping). Research has no event: a plan that empties is the research
 * blocker, which the loop answers whatever the phases say.
 */
export type SittingEvent = 'purse' | 'copies';

export const REOPENS: Readonly<Record<SittingEvent, readonly SittingPhase[]>> = {
  purse: ['spending'],
  copies: ['diplomacy'],
};

/** What the events are read from: the seat's own board, in two short strings. */
export interface SeatPrint {
  purse: string;
  copies: string;
}

/** The seat's print now. Cheap: the seat's three banks and its luxury copies. */
export function seatPrint(state: GameState, player: Player): SeatPrint {
  let copies = '';
  for (const id of controlledResources(state, player.id, 'luxury')) copies += `${id}${resourceCopies(state, player.id, id)};`;
  return {
    purse: `${player.gold}|${player.faithPool ?? 0}|${player.culturePool ?? 0}`,
    copies,
  };
}

/** The events between two prints of the same seat, in the list's order. */
export function eventsBetween(before: SeatPrint, after: SeatPrint): SittingEvent[] {
  const out: SittingEvent[] = [];
  if (before.purse !== after.purse) out.push('purse');
  if (before.copies !== after.copies) out.push('copies');
  return out;
}

/**
 * Counts for the measurement and the tests: nothing in a decision reads them.
 * `asked` and `answered` are by arm; `reopened` by event; `endChecks` counts
 * the sittings the end check read, and `endFound` what the old pass would
 * still have done there, by command type and the first words of its reason.
 */
export const phaseTally = {
  asked: {} as Record<string, number>,
  answered: {} as Record<string, number>,
  reopened: {} as Record<string, number>,
  endChecks: 0,
  endFound: {} as Record<string, number>,
};

/** Adds one to a tally row. */
export function tallyOne(table: Record<string, number>, key: string): void {
  table[key] = (table[key] ?? 0) + 1;
}

let endCheck = false;

/**
 * **The end check** (tests and measurement only; off by default). At the end of
 * each sitting the old full pass, every arm in the order before this batch, is
 * asked on a copy of the sitting, and what it would still have done is
 * counted in `phaseTally.endFound` (`bot.ts`, `checkTheEnd`). A module flag, like
 * the decision memo's shadow, and never part of the state or the data.
 */
export function setSittingEndCheck(on: boolean): void {
  endCheck = on;
}

/** Is the end check on? */
export function sittingEndCheck(): boolean {
  return endCheck;
}
