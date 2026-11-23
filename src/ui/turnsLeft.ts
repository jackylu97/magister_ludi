/**
 * How long a thing with a duration stays in force, in one wording for every
 * surface (the user, 2026-11-22: "for cards that have a time duration, could we
 * add an indicator for how much longer it will be active ('6 turns left')").
 *
 * A timed effect holds the turn it ends on (`expiresTurn`), never a countdown,
 * so the turns left are derived each time they are read and nothing is stored.
 * The In play screen and the Faith sheet's rites read these two functions. The
 * simulation's own ledger label says the same words (`timedLive` in
 * `statecraft/evaluator.ts`), so a line in the Ledger and in a city's
 * breakdown reads "(6 turns left)" too.
 */

import { element } from './dom';

/** The turns left before `expiresTurn`, read on `turn`. Never negative. */
export function turnsLeftOn(turn: number, expiresTurn: number): number {
  return Math.max(0, expiresTurn - turn);
}

/** "1 turn left", "6 turns left". */
export function turnsLeftWords(turns: number): string {
  return `${turns} ${turns === 1 ? 'turn' : 'turns'} left`;
}

/**
 * The same words as a node, with the number in its own element so that a
 * surface can set it in the tabular figures: `<b>6</b><small>turns left</small>`.
 */
export function turnsLeftNode(turns: number, className: string): HTMLElement {
  const node = element('span', className);
  node.title = turnsLeftWords(turns);
  node.append(
    element('b', undefined, String(turns)),
    element('small', undefined, turns === 1 ? 'turn left' : 'turns left'),
  );
  return node;
}
