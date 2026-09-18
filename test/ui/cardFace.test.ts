/**
 * **A dealt card's face** — `docs/flags.md` item (nnnnnn), ruled U1 (the user,
 * 2026-09-17: *"lets have the icons reflect what kind of card they are, also, i
 * notice the deck type is mentioned on the card design twice … add the rarity
 * to the card somewhere"*).
 *
 * Three faults on one face, and all three have the same failure mode — a card
 * that *looks* finished. A hand of three neutral lozenges is not obviously a
 * bug; a word printed twice is not obviously a bug; a missing field is invisible
 * by definition. So what is pinned here is the ruling itself, claim by claim:
 *
 *   1. **Every deck resolves to a drawing of its own**, and the two faces that
 *      have no single deck resolve to the two the ruling gave them — the seal
 *      for a card of nobody's, the seal doubled for a card two decks share.
 *   2. **The deck is named once in words per face**, on each of the four
 *      surfaces that draw one: the draft sheet, the reward sheet, the
 *      collection and the Compendium. The chip that repeated the eyebrow is
 *      gone from all four.
 *   3. **The rarity is on the card**, marked with the doc's own ● ◆ ○ and
 *      worded out of one table, matching the row it came from.
 *   4. **The charter's chip survives**, because what it says is the one thing a
 *      player cannot work out from the clauses.
 *
 * Read as source where the fact is structural and as data where the data is
 * reachable — this suite has no jsdom (`sourceHelpers.ts`'s docblock), and
 * "which function the option's emblem comes from" is a structural fact anyway.
 */

import { describe, expect, it } from 'vitest';

import {
  CARD_LINE_MARKS,
  DECK_MARKS,
  type DeckFace,
  SLOT_MARKS,
  deckMarkDataUri,
} from '../../src/art/lineMarks';
import {
  DECK_IDS,
  DECK_WORDS,
  DOCTRINE_IDS,
  ORDER_IDS,
  type OrderId,
  doctrineDef,
  orderDef,
} from '../../src/sim/statecraftData';
import {
  CHARTER_CHIP,
  NO_DECK_WORD,
  RARITY_MARK,
  RARITY_WORD,
  deckFaceOf,
  orderBadges,
  orderFace,
  orderPayoff,
} from '../../src/ui/deckBadges';
import { compendiumSections } from '../../src/ui/compendium';
import { between, braceBody, uiSource } from './sourceHelpers';

const FLAIR = Object.values(
  import.meta.glob('../../src/flairGallery/marks.ts', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as Record<string, string>,
)[0]!;

const ORDERS = compendiumSections().find((section) => section.id === 'order')!.entries;
const entryOf = (id: OrderId) => ORDERS.find((entry) => entry.id === `order:${id}`)!;

/** A row with exactly one deck, one with none, one with two. */
const SINGLE = ORDER_IDS.find(
  (id) => orderDef(id).decks.length === 1 && orderDef(id).charter === undefined,
)!;
const GENERIC = ORDER_IDS.find(
  (id) => orderDef(id).decks.length === 0 && orderDef(id).charter === undefined,
)!;
const CROSS = ORDER_IDS.find((id) => orderDef(id).decks.length > 1)!;
const CHARTER = ORDER_IDS.find((id) => orderDef(id).charter !== undefined)!;

describe('one drawing a deck', () => {
  it('draws every deck, and no two of them alike', () => {
    const faces: DeckFace[] = [...DECK_IDS, 'generic', 'shared'];
    expect(Object.keys(DECK_MARKS).sort()).toEqual([...faces].sort());
    // Distinct as *pictures*, not merely as keys: the whole complaint was three
    // cards wearing one plate, and a table that pointed two decks at the same
    // paths would be that complaint again with more steps.
    const drawn = faces.map((face) => deckMarkDataUri(face));
    expect(new Set(drawn).size).toBe(faces.length);
    // And each says what it depicts, the way every other mark table here does.
    for (const [face, mark] of Object.entries(DECK_MARKS)) {
      expect(mark.note.length, face).toBeGreaterThan(8);
      expect(mark.paths.length, face).toBeGreaterThan(0);
    }
  });

  it('keeps a card of nobody’s deck on the seal it already had', () => {
    // By reference, so the neutral card, the card back and the neutral thread
    // cannot become three drawings of the same idea.
    expect(DECK_MARKS.generic.paths).toBe(CARD_LINE_MARKS.none.paths);
  });

  it('never lets a deck id collide with a thread or an office', () => {
    // The accent key namespace is shared: one block of `style.css` resolves
    // `data-line` for a deck, a thread and (through the slot ghosts) an office.
    // A collision would ink one of them as the other with no error anywhere.
    const threads = new Set(Object.keys(CARD_LINE_MARKS));
    const offices = new Set(Object.keys(SLOT_MARKS));
    for (const face of [...DECK_IDS, 'generic', 'shared']) {
      expect(threads.has(face), face).toBe(false);
      expect(offices.has(face), face).toBe(false);
    }
  });

  it('shows the six in the flair gallery, in the pass that ships them', () => {
    expect(FLAIR).toContain('DECK_MARKS');
    expect(FLAIR).toContain('deckMarkDataUri(');
  });
});

describe('the ruling on the two faces that have no single deck', () => {
  it('gives a one-deck row its deck’s own face', () => {
    expect(deckFaceOf(orderDef(SINGLE))).toBe(orderDef(SINGLE).decks[0]);
  });

  it('gives a row of nobody’s deck the seal, and says so in words', () => {
    expect(deckFaceOf(orderDef(GENERIC))).toBe('generic');
    expect(orderFace(orderDef(GENERIC)).lineName).toBe(NO_DECK_WORD);
  });

  it('gives a cross-type the doubled seal, and names both decks', () => {
    // Not one deck's drawing (it would deny the other half of the card) and not
    // the plain seal (it would file the card beside the cards of nobody's).
    expect(deckFaceOf(orderDef(CROSS))).toBe('shared');
    expect(deckFaceOf(orderDef(CROSS))).not.toBe('generic');
    const name = orderFace(orderDef(CROSS)).lineName;
    for (const deck of orderDef(CROSS).decks) expect(name).toContain(DECK_WORDS[deck]);
  });

  it('answers for every row in the deck, with a face the table draws', () => {
    for (const id of ORDER_IDS) {
      const face = deckFaceOf(orderDef(id));
      expect(DECK_MARKS[face], id).toBeDefined();
      expect(orderFace(orderDef(id)).line, id).toBe(face);
      expect(orderFace(orderDef(id)).emblem, id).toMatch(/^url\("data:image\/svg\+xml,/);
    }
  });

  it('resolves every one of the eight accent keys to an ink', () => {
    const css = uiSource('style.css');
    for (const face of [...DECK_IDS, 'generic', 'shared']) {
      expect(css, face).toContain(`[data-line='${face}']`);
    }
    // The two neutral faces take plain ink deliberately — see the ruling.
    expect(css).toContain("[data-line='generic'],\n[data-line='shared'] {\n  --line-ink: var(--line-none);");
  });
});

describe('the deck is named once per card face', () => {
  it('says it in the eyebrow and never again on a chip', () => {
    for (const id of ORDER_IDS) {
      const labels = orderBadges(id).map((badge) => badge.label);
      for (const deck of DECK_IDS) {
        expect(labels.includes(DECK_WORDS[deck]), `${id} / ${deck}`).toBe(false);
      }
      // And the eyebrow still carries every deck the row names.
      for (const deck of orderDef(id).decks) {
        expect(orderPayoff(id), id).toContain(DECK_WORDS[deck]);
      }
    }
  });

  it('builds the draft sheet’s option out of one eyebrow and one face', () => {
    const draft = braceBody(uiSource('main.ts'), 'function showStatecraftOffer()');
    expect(draft).toContain('payoff: orderPayoff(id)');
    expect(draft).toContain('badges: orderBadges(id)');
    expect(draft).toContain('...orderFace(orderDef(id))');
    // The thread's face answers for the two classes with no deck, and only
    // those two: an Order drawn by `cardFace` is four hundred lozenges.
    expect(draft).toContain('...cardFace(doctrineDef(id))');
    expect(draft).not.toContain('...cardFace(orderDef(id))');
    // Nothing on this sheet spells a deck for itself.
    expect(draft).not.toContain('deckWord(');
  });

  it('builds the reward sheet’s card out of the same doors', () => {
    const hand = braceBody(uiSource('rewardSheet.ts'), 'function drawHand(');
    expect(hand).toContain('orderPayoff(id)');
    expect(hand).toContain('orderChipsNode(id)');
    // The emblem and the accent, which this sheet had neither of before U1.
    expect(hand).toContain('deckFaceOf(def)');
    expect(hand).toContain('deckMarkNode(face)');
    expect(hand).toContain('button.dataset.line = face');
    expect(hand).not.toContain('deckWord(');
  });

  it('draws the chips through one printer, and names the second copy’s reason', () => {
    // Two renderers, not three. `offerCard.ts` keeps its own because its whole
    // contract is that no simulation type crosses its boundary; the two
    // surfaces that may be handed a node share `orderChipsNode`.
    for (const file of ['rewardSheet.ts', 'statecraftScreen.ts']) {
      expect(uiSource(file), file).toContain('orderChipsNode(');
      expect(uiSource(file), file).not.toContain("element('span', 'offer-badge')");
    }
    expect(uiSource('offerCard.ts')).toContain("element('span', 'offer-badge')");
  });

  it('builds the collection’s card off the row’s decks, not off its shelf', () => {
    const screen = uiSource('statecraftScreen.ts');
    const face = between(screen, 'function drawCardFace(', 'export function createStatecraftScreen');
    expect(face).toContain('deckMarkNode(deck.face)');
    // A Doctrine has no deck and still reads the archetype thread.
    expect(face).toContain('cardLineMarkNode(id)');
    // The Order call site hands the deck over; nothing here sniffs the shape.
    expect(screen).toContain('face: deckFaceOf(def),');
    // The group key used to ride the card as a class and ink a cross-type in
    // whichever deck the seat held first.
    expect(screen).toContain("button.className = 'sc-card sc-card-order'");
    expect(uiSource('style.css')).not.toContain('.sc-card-dominion');
  });

  it('prints it once on the Compendium’s page too, out of the same function', () => {
    for (const id of ORDER_IDS) {
      const entry = entryOf(id);
      // One door for the words — the page composed `decks` itself until U1.
      expect(entry.eyebrow.split(' — ')[0], id).toBe(orderPayoff(id).toLowerCase());
      // And the figures column names no deck at all; the eyebrow and the shelf
      // heading are where a deck belongs.
      const figures = entry.rows.map((row) => `${row.label} ${row.figures}`).join(' ');
      for (const deck of DECK_IDS) {
        expect(figures.includes(DECK_WORDS[deck]), `${id} / ${deck}`).toBe(false);
      }
    }
  });

  it('wears its deck’s own drawing on the shelf', () => {
    expect(entryOf(SINGLE).mark).toEqual({ kind: 'deck', deck: orderDef(SINGLE).decks[0] });
    expect(entryOf(CROSS).mark).toEqual({ kind: 'deck', deck: 'shared' });
    expect(entryOf(GENERIC).mark).toEqual({ kind: 'deck', deck: 'generic' });
  });
});

describe('the rarity takes the chip the deck vacated', () => {
  it('is the doc’s own three marks', () => {
    // `docs/orders-and-doctrines.md` §Rarity, whose column IS `OrderDef.rarity`
    // — the doc side of the pairing is `test/sim/statecraftDocSync.test.ts`'s.
    expect(RARITY_MARK).toEqual({ common: '●', uncommon: '◆', rare: '○' });
  });

  it('gives every card exactly one rarity chip, matching its row', () => {
    for (const id of ORDER_IDS) {
      const rarity = orderDef(id).rarity;
      const chips = orderBadges(id).filter((badge) => badge.tone === rarity);
      expect(chips.length, id).toBe(1);
      expect(chips[0]!.label, id).toBe(RARITY_WORD[rarity]);
      expect(chips[0]!.mark, id).toBe(RARITY_MARK[rarity]);
    }
  });

  it('inks the three rungs as a ladder, the rare alone in a colour', () => {
    const css = uiSource('style.css');
    for (const tone of ['common', 'uncommon', 'rare']) {
      expect(css, tone).toContain(`.offer-badge[data-tone='${tone}']`);
      expect(css, tone).toContain(`--rarity-${tone}:`);
    }
    expect(css).toContain('--rarity-rare: #c8901f;');
  });

  it('prints the same mark and the same word in the book', () => {
    for (const id of ORDER_IDS) {
      const row = entryOf(id).rows.find((one) => one.label === 'Rarity');
      expect(row, id).toBeDefined();
      const rarity = orderDef(id).rarity;
      expect(row!.figures, id).toBe(`${RARITY_MARK[rarity]} ${RARITY_WORD[rarity]}`);
    }
  });

  it('never softens the word on one surface and not the other', () => {
    // The book used to say "often · less often · seldom". One field printed as
    // two vocabularies is what `deckBadges.ts` exists to prevent.
    const book = uiSource('compendium.ts');
    expect(book).not.toContain("uncommon: 'less often'");
    expect(book).toContain('rarityFigure(');
  });
});

describe('the charter keeps its own chip', () => {
  it('says the one thing the clauses cannot', () => {
    const charters = ORDER_IDS.filter((id) => orderDef(id).charter !== undefined);
    expect(charters.length).toBeGreaterThan(0);
    for (const id of charters) {
      const badges = orderBadges(id);
      expect(badges.some((badge) => badge.label === CHARTER_CHIP), id).toBe(true);
      expect(badges.some((badge) => badge.tone === 'charter'), id).toBe(true);
      // Beside the rarity, never instead of it.
      expect(badges.length, id).toBe(2);
      expect(orderPayoff(id), id).toContain('charter');
    }
    expect(orderBadges(CHARTER).length).toBe(2);
  });
});

describe('the classes with no deck are untouched', () => {
  it('leaves a Doctrine reading its archetype thread', () => {
    // The trap this pins: a Doctrine carries `decks` too — the empty list every
    // pre-rework row got — so a face builder that sniffed the shape would strip
    // all forty-eight of them of the thread they were drawn for and hand them
    // the seal. Most of them have a real thread, so the loss would be visible.
    let threaded = 0;
    for (const id of DOCTRINE_IDS) {
      expect(doctrineDef(id).decks, id).toEqual([]);
      if ((doctrineDef(id).line ?? 'none') !== 'none') threaded += 1;
    }
    expect(threaded).toBeGreaterThan(0);
    // Which is why the face arrives as a parameter, from a caller that knows
    // what class it is holding.
    const screen = uiSource('statecraftScreen.ts');
    expect(screen).toContain("drawCardFace(card, cardDef(id), 'permanent', describeCard(id));");
    expect(screen).toContain('face: deckFaceOf(def),');
  });
});
