/**
 * **The faces the offer sheet is handed** (Quiet Table, build stage 2).
 *
 * `offerCard.ts` knows nothing about cards: it takes strings, and since this
 * stage a function that draws a face (`OfferOption.dress`). This module is the
 * callers' half: it draws the Order draft's card as the Council's engraved
 * face (`dressOrderFace`) and the great person offer's as the great person
 * card (`dressGreatPersonCard`), and says where on each the stamp's seat is
 * and how each fits its words once it is on the page.
 *
 * `OFFER_FACE_SHAPES` are the two faces' designed sizes, which the sheet's
 * spread (`dressedSpread`) lays out: the Order face is the board's 220 px wide
 * at the Council's 21 by 25.8 proportion, and the great person card is the
 * board's 214 by 392.
 */

import type { GreatPersonId } from '../sim/greatPeopleData';
import type { GameState } from '../sim/state';
import type { OrderId } from '../sim/statecraftData';
import { element } from './dom';
import {
  GREAT_PERSON_CARD_WIDTH_EM,
  dressGreatPersonCard,
  fitGreatPersonCard,
  greatPersonActLine,
  greatPersonCardHeightEm,
} from './greatPersonCard';
import { greatPersonCard } from './greatPersonFace';
import type { DressedFace, OfferShape } from './offerCard';
import { dressOrderFace, fitOrderFace } from './orderFace';

/** The designed width of each face, and its height over its width. */
export const OFFER_FACE_SHAPES = {
  order: { width: 220, ratio: 25.8 / 21 },
  person: { width: 214, ratio: 392 / 214 },
} as const satisfies Record<string, OfferShape>;

/**
 * **An Order in the draft**, on the Council's engraved face: the tier plate,
 * the name, the device, the effect. No pay plate (`plate: null`): the stamp's
 * seat stands at the card's foot instead, wearing the flourish until the pick.
 * In a control, so a keyword is bold and not a link.
 */
export function orderOfferFace(id: OrderId): DressedFace {
  const face = element('div');
  dressOrderFace(face, id, { where: 'hand', inControl: true, plate: null });
  // The bottom corner ornaments step aside for the seat.
  face.dataset.seat = 'true';
  const seat = element('div', 'offer-face-seat');
  face.querySelector('.of-in')?.append(seat);
  // Fitted with the rest of its hand (`fitOrderHand`), so a hand reads alike.
  return { face, seat };
}

/**
 * **A hand of Orders reads alike** (Quiet Table, build stage 3: "a consistent
 * card size"). The Order face is one size already; what could differ is its
 * words, which step down for a long effect (`fitOrderFace`, the Council's
 * approved rule). So each card is fitted, and then every card in the hand takes
 * the smallest size any of them needed and the short picture if any of them
 * needed it: three cards side by side never print their rules at three sizes.
 */
export function fitOrderHand(faces: readonly HTMLElement[]): void {
  const fits = faces.map((face) => fitOrderFace(face));
  if (fits.length === 0) return;
  const size = Math.min(...fits.map((fit) => fit.size));
  const short = fits.some((fit) => fit.picture === 'short');
  for (const face of faces) {
    face.dataset.picture = short ? 'short' : 'full';
    face.style.setProperty('--of-text', `${size / 10}em`);
  }
}

/**
 * The great person card's shape for the spread: the board's width, and the
 * roster's one measured height (`greatPersonCardHeightEm`).
 */
export function greatPersonOfferShape(): OfferShape {
  return { width: OFFER_FACE_SHAPES.person.width, ratio: greatPersonCardHeightEm() / GREAT_PERSON_CARD_WIDTH_EM };
}

/**
 * **A great person on offer**, on the great person card, with what they do
 * when spent. No figure is ever printed on this hand: a legacy pays nothing
 * until the person is spent (`showGreatPersonOffer`'s docblock), so the seat
 * stays empty.
 */
export function greatPersonOfferFace(state: GameState, playerId: number, id: GreatPersonId): DressedFace {
  const face = element('div');
  const seat = dressGreatPersonCard(face, greatPersonCard(id), {
    inControl: true,
    act: greatPersonActLine(state, playerId, id),
  });
  return { face, seat, fit: () => fitGreatPersonCard(face) };
}
