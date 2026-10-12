/**
 * A commission card's progress, read off the simulation for the interface
 * (batch C). The card face, the draft hand and the HUD chips all take their
 * counters from `commissionCounters`, so a chip and the card it stands for
 * always print the same count.
 *
 * Private by construction (ruling (qqqqqq) 6): every figure is asked of the
 * seat that is looking, and nothing here reads another empire.
 */

import { commissionProgress } from '../sim/commissions';
import type { GameState } from '../sim/state';
import { commissionCounterWords, commissionFulfilledTurn, slotOf } from '../sim/statecraft';
import { type OrderId, orderDef } from '../sim/statecraftData';
import { type GoalCounter, goalCounterNode } from './goalCounter';

/** Where a commission stands for this seat. */
export type CommissionStanding = 'offered' | 'seated' | 'held' | 'fulfilled';

/** The plain counters for this card, one per part of its goal. Empty for a non-commission. */
export function commissionCounters(state: GameState, playerId: number, card: OrderId): GoalCounter[] {
  return commissionProgress(state, playerId, card).map((part) => ({
    label: commissionCounterWords(part.goal),
    have: part.have,
    need: part.need,
  }));
}

/** Whether this seat has the card seated, held on the shelf, fulfilled, or not at all. */
export function commissionStanding(state: GameState, playerId: number, card: OrderId): CommissionStanding {
  const sc = state.players[playerId]?.statecraft;
  if (!sc || !sc.orders.includes(card)) return 'offered';
  if (commissionFulfilledTurn(sc, card) !== undefined) return 'fulfilled';
  return slotOf(sc, card) >= 0 ? 'seated' : 'held';
}

/** The note under a counter, by standing. Plain player words. */
export const STANDING_NOTE: Record<CommissionStanding, string | undefined> = {
  offered: undefined,
  seated: undefined,
  held: 'Not seated. Progress is kept and resumes when you seat it.',
  fulfilled: 'Fulfilled. The reward has been paid.',
};

/**
 * The counter block for a card face, or `null` for a card that is not a
 * commission. A fulfilled card shows the note alone.
 */
export function commissionGoalNode(state: GameState, playerId: number, card: OrderId): HTMLElement | null {
  if (orderDef(card).commission === undefined) return null;
  const standing = commissionStanding(state, playerId, card);
  const counters = standing === 'fulfilled' ? [] : commissionCounters(state, playerId, card);
  const node = goalCounterNode(counters, STANDING_NOTE[standing]);
  if (standing === 'held') node.classList.add('is-paused');
  return node;
}
