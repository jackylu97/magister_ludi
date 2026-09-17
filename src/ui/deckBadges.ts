/**
 * **The deck badge and the charter mark** — what a card face says about where
 * a card comes from, since the decks rework (`docs/plans/decks-rework.md`
 * D1a: *"the draft sheet shows the deck badge on each card and a 'charter'
 * mark where a row is one"*; finished in D1c).
 *
 * Four readers and one table: the draft sheet's eyebrow and chips
 * (`main.ts`, `showStatecraftOffer`), the reward sheet (`rewardSheet.ts`), the
 * collection's grouping (`statecraftScreen.ts`) and the Compendium's shelf
 * (`compendium.ts`). All of them print a deck's name through `DECK_WORDS` —
 * the simulation's own word table — so the badge on a dealt card, the heading
 * it is filed under afterwards and the shelf it is read on are one string.
 * Nothing here invents a word for a deck.
 *
 * **A badge is a label and a tone**, and the tone is the one thing D1a left
 * unfinished: the chips reached the card as bare strings, so a Dominion badge
 * and a Commerce badge were the same grey word under the same neutral lozenge,
 * saying twice what the eyebrow above them had already said once. A tone is an
 * opaque key — exactly what `OfferOption.line` is and for exactly that reason —
 * which one block of `style.css` turns into ink. The card component still knows
 * nothing about decks and must not start guessing; it sets the key on the
 * element and lets the stylesheet answer.
 */

import { DECK_WORDS, type DeckId, type OrderId, orderDef } from '../sim/statecraftData';

/** The word the badge wears for a row with no deck at all. */
export const GENERIC_WORD = 'Generic';

/** The mark a charter row wears beside its deck. */
export const CHARTER_WORD = 'Charter';

/**
 * **What a charter is, said where the choice is made.**
 *
 * The one fact about a charter a player cannot work out from its clauses, and
 * the one that changes what the card is worth: an ordinary Order is a chair
 * spent for as long as you keep it, and a charter is not — it is taken for the
 * door it opens and then sits in the collection for good. A hand that marked
 * the row "Charter" and left it there would be naming a word the player has
 * never met. Said on the chip rather than in a footnote, because the chip is
 * the thing under the name and the footnote is the thing nobody reads.
 */
export const CHARTER_CHIP = 'Charter — takes no chair';

/**
 * One chip under a card's name: the word on it, and the key the stylesheet
 * inks it by. See the module docblock for why a tone is a string.
 */
export interface OrderBadge {
  label: string;
  /** A deck id, or `'charter'`. Absent draws the plain chip. */
  tone?: string;
}

/**
 * A deck's name for a badge. One door for every surface, so the leader's face
 * and the card's chip agree on the spelling.
 */
export function deckWord(deck: DeckId): string {
  return DECK_WORDS[deck];
}

/**
 * **The eyebrow of a dealt card**: "Dominion order", "Dominion · Commerce
 * order" for a cross-type, "Generic order" for a row of nobody's, and
 * "charter" in the place of "order" for a row that is one.
 */
export function orderPayoff(id: OrderId): string {
  const def = orderDef(id);
  const home = def.decks.length === 0 ? GENERIC_WORD : def.decks.map(deckWord).join(' · ');
  return `${home} ${def.charter === undefined ? 'order' : CHARTER_WORD.toLowerCase()}`;
}

/**
 * **The chips under the eyebrow**: one per deck the row names (none for a
 * generic row), and the charter's own sentence after them where the row is
 * one. Empty for a generic ordinary card, which is the honest badge for a card
 * of nobody's.
 */
export function orderBadges(id: OrderId): OrderBadge[] {
  const def = orderDef(id);
  const badges: OrderBadge[] = def.decks.map((deck) => ({ label: deckWord(deck), tone: deck }));
  if (def.charter !== undefined) badges.push({ label: CHARTER_CHIP, tone: 'charter' });
  return badges;
}
