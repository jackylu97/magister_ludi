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
 *
 * **The deck is named once and shown once** (U1, `docs/flags.md` item
 * (nnnnnn); the user, reading a hand: *"i notice the deck type is mentioned on
 * the card design twice … add the rarity to the card somewhere"*). D1c kept
 * both the eyebrow's word and a chip repeating it, deliberately and wrongly —
 * on screen it is the same word twice under the same neutral plate. So:
 *
 *   · the **eyebrow keeps the words**. It is the accessible reading order
 *     ("1, dominion order, Blooded Spears, …") and it is the one place a
 *     cross-type can name *both* of its decks.
 *   · the **emblem takes the deck's drawing and the deck's ink** (`DECK_MARKS`,
 *     and `deckFaceOf` below is the one place a row is turned into a face).
 *   · the **chip the deck word vacated is spent on rarity**, which the card
 *     has never carried though it is the field the draw is weighted by and the
 *     one thing that tells a player whether a card they passed on will come
 *     round again.
 *   · the **charter keeps its own chip**. A charter is a kind, not a deck, and
 *     that it takes no chair is the one fact a player cannot work out from the
 *     clauses.
 */

import {
  DECK_WORDS,
  type DeckId,
  type OrderId,
  type OrderRarity,
  orderDef,
} from '../sim/statecraftData';
import { type DeckFace, deckMarkUrl } from './cardLine';

export type { DeckFace };

/** The word the badge wears for a row with no deck at all. */
export const GENERIC_WORD = 'Generic';

/** What a card of nobody's deck is called when the face has to *say* it. */
export const NO_DECK_WORD = 'no deck';

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
  /** A rarity, or `'charter'`. Absent draws the plain chip. */
  tone?: string;
  /**
   * A single character set *before* the label, hidden from the reading.
   *
   * The rarity's own ● ◆ ○, which are the doc's column and the sync test's
   * (`docs/orders-and-doctrines.md` §Rarity). A mark rather than a second word,
   * because the word is already there and what the mark buys is the glance: a
   * hand of three is sorted into commons and a rare before a syllable of it is
   * read. `aria-hidden` wherever it is drawn — a reader that announced "white
   * circle, Rare" would be saying the field twice.
   */
  mark?: string;
}

/**
 * **The rarity marks**, which are the doc's own column and the sync test's:
 * ● common · ◆ uncommon · ○ rare (`docs/orders-and-doctrines.md` §Rarity).
 *
 * Filled, half-filled, hollow — the ladder is legible as a *shape* before it is
 * legible as a colour, which is what makes it survive a colour-blind reader and
 * a greyscale screenshot both.
 */
export const RARITY_MARK: Readonly<Record<OrderRarity, string>> = {
  common: '●',
  uncommon: '◆',
  rare: '○',
};

/**
 * The rarity in words, and **one table for every surface**.
 *
 * The book used to soften these to "often · less often · seldom", on the
 * argument that "common" reads as a judgement about a card rather than a
 * statement about a deck. That argument was right while rarity lived only in a
 * ledger row nobody had met. It is wrong now that the chip under a card's name
 * says it at the moment of the choice: a field printed as one word on the hand
 * that dealt the card and a different word on its page in the book is the drift
 * this module exists to prevent. The draw's own three names win, and the shelf
 * says what the weight *does* in its own prose instead.
 */
export const RARITY_WORD: Readonly<Record<OrderRarity, string>> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
};

/**
 * **Which face a row is entitled to** — the one place a card's decks become a
 * drawing, and the ruling on the two rows that have no single deck.
 *
 * A generic row (no deck at all) keeps the lozenge seal, and a cross-type (two
 * decks) takes the seal doubled. The argument for both is `DECK_MARKS`'s
 * docblock in `src/art/lineMarks.ts`; what belongs here is the consequence for
 * *ink*, since the accent this key resolves lands on the frame and the eyebrow
 * as well as the mark. Both neutral faces take plain ink, and a cross-type
 * takes it for a reason of its own: a frame cannot be two colours, so a
 * cross-type painted in the first of its decks would be a card wearing half of
 * its own answer, with the half chosen by nothing but the order the row happens
 * to list them in.
 */
export function deckFaceOf(def: { decks: readonly DeckId[] }): DeckFace {
  if (def.decks.length === 0) return 'generic';
  if (def.decks.length > 1) return 'shared';
  return def.decks[0]!;
}

/**
 * How a card's face reaches a surface: the accent key, the picture and the
 * name of what the colour is.
 *
 * Structurally the half of `OfferOption` that `cardFace` fills in `main.ts`,
 * and deliberately not typed as one — `offerCard.ts` holds the line that no
 * simulation type crosses its boundary, and this side of that line is where a
 * `DeckId` is allowed to exist.
 */
export interface CardFace {
  /** Reaches the DOM as `data-line`, resolved to ink by one block of `style.css`. */
  line: string;
  /** The emblem, as a ready CSS `url(…)` value for the mask. */
  emblem: string;
  /** What the accent *is*, in words — the card's `title`. */
  lineName: string;
}

/**
 * **A dealt Order's face**: the deck's mark, the deck's ink and the deck's
 * name, from the row alone.
 *
 * The four readers all call this rather than `cardFace` (`main.ts`), which
 * still answers for the two card classes that have no deck — a Doctrine and a
 * government — off the archetype thread. That is the whole of the split: a row
 * with `decks` is drawn by its deck, a row without one by its thread.
 */
export function orderFace(def: { decks: readonly DeckId[] }): CardFace {
  const face = deckFaceOf(def);
  return {
    line: face,
    emblem: deckMarkUrl(face),
    lineName: def.decks.length === 0 ? NO_DECK_WORD : def.decks.map(deckWord).join(' · '),
  };
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
 * **The chips under the eyebrow**: the rarity, always, and the charter's own
 * sentence after it where the row is one.
 *
 * The deck chips that stood here until U1 are gone — the eyebrow above says the
 * deck in words and the emblem shows it as a mark, and a third statement of the
 * same fact was the complaint. Every card carries exactly one chip now, and a
 * charter two; there is no card with none, which is the change a player feels
 * first, because a generic card used to arrive with the space under its name
 * empty.
 */
export function orderBadges(id: OrderId): OrderBadge[] {
  const def = orderDef(id);
  const badges: OrderBadge[] = [
    { label: RARITY_WORD[def.rarity], tone: def.rarity, mark: RARITY_MARK[def.rarity] },
  ];
  if (def.charter !== undefined) badges.push({ label: CHARTER_CHIP, tone: 'charter' });
  return badges;
}

/**
 * **The chips, drawn** — for the two surfaces that may be handed a node.
 *
 * The reward sheet and the collection both build a card face out of elements
 * and both want the same row of chips; a copy each is how a rare comes to look
 * like one thing on the sheet that offered it and another in the hand that
 * holds it. `offerCard.ts` keeps its own copy and keeps it deliberately: that
 * component's whole contract is that no simulation type crosses its boundary,
 * so it is handed labels and opaque tones and builds the row itself. Two
 * renderers, not three, and the second one is a stated boundary rather than an
 * oversight.
 *
 * The mark is `aria-hidden` for `OrderBadge.mark`'s reason, and the label is a
 * text node beside it rather than the chip's own text, so the two can be sized
 * apart by the stylesheet.
 */
export function orderChipsNode(id: OrderId): HTMLElement {
  const chips = document.createElement('p');
  chips.className = 'offer-badges';
  for (const badge of orderBadges(id)) {
    const chip = document.createElement('span');
    chip.className = 'offer-badge';
    if (badge.tone !== undefined) chip.dataset.tone = badge.tone;
    if (badge.mark !== undefined) {
      const mark = document.createElement('span');
      mark.className = 'offer-badge-mark';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = badge.mark;
      chip.append(mark);
    }
    const label = document.createElement('span');
    label.className = 'offer-badge-label';
    label.textContent = badge.label;
    chip.append(label);
    chips.append(chip);
  }
  return chips;
}
