/**
 * **The deck badge and the charter mark** — what a card face says about where
 * a card comes from, since the decks rework (`docs/plans/decks-rework.md`
 * D1a: *"the draft sheet shows the deck badge on each card and a 'charter'
 * mark where a row is one"*).
 *
 * Three readers and one table: the draft sheet's eyebrow and chips
 * (`main.ts`, `showStatecraftOffer`), the reward sheet (`rewardSheet.ts`) and
 * the collection's grouping (`statecraftScreen.ts`). All of them print a
 * deck's name through `DECK_WORDS` — the simulation's own word table — so the
 * badge on a dealt card and the heading it is filed under afterwards are one
 * string. Nothing here invents a word for a deck.
 *
 * Strings out, like everything that crosses into `offerCard.ts`: the card
 * component knows nothing about decks and must not start guessing.
 */

import { DECK_WORDS, type DeckId, type OrderId, orderDef } from '../sim/statecraftData';

/** The word the badge wears for a row with no deck at all. */
export const GENERIC_WORD = 'Generic';

/** The mark a charter row wears beside its deck. */
export const CHARTER_WORD = 'Charter';

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
 * generic row), and the charter mark after them where the row is one. Empty
 * for a generic ordinary card, which is the honest badge for a card of
 * nobody's.
 */
export function orderBadges(id: OrderId): string[] {
  const def = orderDef(id);
  const badges = def.decks.map(deckWord);
  if (def.charter !== undefined) badges.push(CHARTER_WORD);
  return badges;
}
