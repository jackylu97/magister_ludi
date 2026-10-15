/**
 * The deal: a card laid face down and turned over on its own beat.
 *
 * Lifted out of `offerCard.ts` (batch UX10) so a second surface can deal: the
 * Faith sheet's Bonuses tab deals its cards every time it opens (the user's
 * ruling of 2026-10-15, `docs/flags.md` (ssssss) 4.1). The Orders draft deals
 * exactly as it did before; this module is its timing, its back and its class,
 * moved and not changed.
 *
 * How a deal works
 * ----------------
 * A dealt card wears `is-dealing` and a `--deal-delay`, and carries a back as
 * its last child. The stylesheet turns the card about its own vertical axis
 * (the `card-deal` keyframes, `style.css`): for the first half of the turn the
 * back is what faces the player. Once the card has come round, the class, the
 * delay and the back come off again (`settleDealtCard`), because a stuck
 * `preserve-3d` costs a card its hover shadow and a stuck back is a card nobody
 * can read. Reduced motion never deals at all: the caller checks `wantsMotion`
 * and draws the card face up.
 */

import { cardLineMarkUrl } from './cardLine';
import { element } from './dom';

/**
 * How long a card takes to come over, and how long between two of them.
 *
 * Milliseconds, and they are here rather than in `style.css` because the script
 * has to know when the last card has landed in order to take the backs down.
 * Two numbers in one place beat a duration in the stylesheet and a timeout in
 * the module that quietly disagree by 40ms and leave a back on the table.
 */
export const DEAL_MS = 420;
export const DEAL_STAGGER_MS = 110;

/**
 * One card's back: the weave, the gilt rules and the neutral seal.
 *
 * Entry VII's card-back weave, and the reason it can be one element is that a
 * back has nothing to say. It is identical on every card in the hand — same
 * ink, same emblem, same rules — because a back that varied would be telling
 * you which card to turn over first, which is the one thing a deck must never
 * do. The emblem is `CARD_LINE_MARKS.none`, the lozenge seal the Statecraft
 * screen already stamps with, asked for through `cardLine.ts` like every other
 * card emblem; drawing a ninth seal for the back would have been a second deck.
 */
export function cardBack(): HTMLElement {
  const back = element('span', 'card-back');
  back.setAttribute('aria-hidden', 'true');
  back.style.setProperty('--card-back-emblem', cardLineMarkUrl('none'));
  return back;
}

/**
 * Lays one card face down, to come over `index` beats after the first. The back
 * goes on last, so it is the last child and covers the face.
 */
export function dealCard(card: HTMLElement, index: number): void {
  card.classList.add('is-dealing');
  card.style.setProperty('--deal-delay', `${index * DEAL_STAGGER_MS}ms`);
  card.append(cardBack());
}

/** When the card dealt at `index` has come round, in milliseconds from the deal. */
export function dealtAt(index: number): number {
  return index * DEAL_STAGGER_MS + DEAL_MS;
}

/** Takes one dealt card's class, delay and back off again once it has come round. */
export function settleDealtCard(card: HTMLElement): void {
  card.classList.remove('is-dealing');
  card.style.removeProperty('--deal-delay');
  for (const back of card.querySelectorAll('.card-back')) back.remove();
}
