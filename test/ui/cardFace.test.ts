/**
 * **An Order's face** — the A3 board, built in batch C1
 * (`docs/plans/chairs-build.md`; the board is
 * `docs/plans/mockups/card-faces/SuitsRevised.dc.html`).
 *
 * The face says three things, each one way: **the suit shows the deck, the ink
 * shows the type, and the rank shows the rarity**. Each claim fails the same
 * way, as a card that *looks* finished: a deck drawn with the wrong suit, a
 * card inked by its deck instead of its type, a rare that looks common. So the
 * claims are pinned one by one:
 *
 *   1. **One suit a deck**, as the board pairs them, six distinct drawings; a
 *      card two decks share shows both suits, and a card of no deck the seal.
 *   2. **One ink a type**, resolved by the stylesheet, and an unsorted card in
 *      the Wildcard ink with a word of its own.
 *   3. **One rank a rarity**, drawn in ink and pewter only, with the card's
 *      tier as its numeral.
 *   4. **Every surface draws an Order from `orderSuitFace`**: the draft, the
 *      council, the collection, the Compendium and the commission chips.
 *   5. **The charter keeps its chip**; the rarity chip leaves the hand, because
 *      the rank shows the rarity now.
 *   6. **The flair gallery shows the suits and the faces**, in the pass that
 *      ships them (CLAUDE.md).
 *
 * And two things that do not change in C1: a Doctrine keeps its thread's face,
 * and the reward sheet keeps the U1 deck face until batch C3 removes it.
 *
 * This suite has no jsdom (`sourceHelpers.ts`), so the face's data is checked
 * as data and its wiring is read from the source.
 */

import { describe, expect, it } from 'vitest';

import { CARD_LINE_MARKS, DECK_MARKS, type DeckFace, deckMarkDataUri } from '../../src/art/lineMarks';
import {
  type Band,
  CARD_TYPES,
  DECK_IDS,
  DECK_WORDS,
  DOCTRINE_IDS,
  ORDER_IDS,
  type OrderId,
  doctrineDef,
  orderDef,
  orderType,
} from '../../src/sim/statecraftData';
import {
  BAND_NUMERAL,
  CHARTER_CHIP,
  DECK_SUIT,
  RARITY_MARK,
  RARITY_WORD,
  TYPE_INK,
  TYPE_WORD,
  deckFaceOf,
  orderBadges,
  orderPayoff,
  orderSuitBadges,
  orderSuitFace,
} from '../../src/ui/deckBadges';
import {
  INK_IDS,
  RANK_IDS,
  SEAL_MARK,
  SUIT_IDS,
  SUIT_MARKS,
  glyphBoxes,
  suitMarkDataUri,
  suitsWord,
} from '../../src/ui/suitFace';
import { compendiumSections } from '../../src/ui/compendium';
import { between, braceBody, uiSource } from './sourceHelpers';

/** The flair gallery's sources, which `uiSource` does not glob. */
const GALLERY = import.meta.glob('../../src/flairGallery/{marks,cardFaces,main}.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function gallery(name: string): string {
  const key = Object.keys(GALLERY).find((path) => path.endsWith(`/${name}`));
  const text = key === undefined ? undefined : GALLERY[key];
  if (typeof text !== 'string' || text.length === 0) throw new Error(`no gallery source ${name}`);
  return text;
}

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

describe('one suit a deck', () => {
  it('pairs the decks with the board’s six suits', () => {
    // The spec of record: `docs/plans/chairs-build.md`, "the suit shows the deck".
    expect(DECK_SUIT).toEqual({
      dominion: 'swords',
      expansionist: 'wands',
      commerce: 'coins',
      devotion: 'cups',
      scientific: 'spheres',
      magisterial: 'crowns',
    });
    expect(new Set(Object.values(DECK_SUIT)).size).toBe(DECK_IDS.length);
    expect([...SUIT_IDS].sort()).toEqual(Object.values(DECK_SUIT).sort());
  });

  it('draws six suits, no two alike, and says what each one depicts', () => {
    const drawn = SUIT_IDS.map((suit) => suitMarkDataUri(suit));
    expect(new Set(drawn).size).toBe(SUIT_IDS.length);
    for (const suit of SUIT_IDS) {
      expect(SUIT_MARKS[suit].note.length, suit).toBeGreaterThan(8);
      expect(SUIT_MARKS[suit].paths.length, suit).toBeGreaterThan(0);
      for (const path of SUIT_MARKS[suit].paths) expect(path.d.length, suit).toBeGreaterThan(4);
    }
    // The seal is a seventh drawing, distinct from every suit.
    expect(drawn).not.toContain(suitMarkDataUri('seal'));
  });

  it('draws a card of one deck with that deck’s suit', () => {
    const face = orderSuitFace(SINGLE);
    expect(face.suits).toEqual([DECK_SUIT[orderDef(SINGLE).decks[0]!]]);
    expect(face.deck).toBe(DECK_WORDS[orderDef(SINGLE).decks[0]!]);
  });

  it('draws a card two decks share with both suits, and names both decks at its foot', () => {
    // The board leaves this case open; the build's answer, to show the user.
    const face = orderSuitFace(CROSS);
    expect(face.suits).toEqual(orderDef(CROSS).decks.map((deck) => DECK_SUIT[deck]));
    expect(face.suits).toHaveLength(2);
    for (const deck of orderDef(CROSS).decks) expect(face.deck).toContain(DECK_WORDS[deck]);
    expect(suitsWord(face.suits)).toContain(' and ');
  });

  it('draws a card of no deck with the seal, and calls it Generic', () => {
    const face = orderSuitFace(GENERIC);
    expect(face.suits).toEqual([]);
    expect(face.deck).toBe('Generic');
    // By reference, so the seal, the card back and the neutral thread stay one drawing.
    expect(SEAL_MARK.paths).toBe(CARD_LINE_MARKS.none.paths);
  });

  it('keeps a pair of suits inside the medallion', () => {
    // The board's own boxes for one suit, at each size and rank.
    expect(glyphBoxes(1, true, 'hand')).toEqual([{ x: 18, y: 18, size: 56 }]);
    expect(glyphBoxes(1, false, 'hand')).toEqual([{ x: 6, y: 6, size: 80 }]);
    expect(glyphBoxes(1, true, 'seat')).toEqual([{ x: 17, y: 17, size: 58 }]);
    expect(glyphBoxes(1, false, 'seat')).toEqual([{ x: 4, y: 4, size: 84 }]);
    // Two suits: inside the inner ring (radius 34.5 about 46) on a ringed card,
    // inside the 92-unit box on a common one, and never overlapping.
    for (const size of ['hand', 'seat'] as const) {
      const ringed = glyphBoxes(2, true, size);
      for (const box of ringed) {
        expect(box.x).toBeGreaterThanOrEqual(46 - 34.5);
        expect(box.x + box.size).toBeLessThanOrEqual(46 + 34.5);
      }
      expect(ringed[0]!.x + ringed[0]!.size).toBeLessThanOrEqual(ringed[1]!.x);
      for (const box of glyphBoxes(2, false, size)) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.size).toBeLessThanOrEqual(92);
      }
    }
  });
});

describe('one ink a type', () => {
  it('inks every row by its type, and an unsorted row in the Wildcard ink', () => {
    for (const id of ORDER_IDS) {
      const type = orderType(id);
      expect(orderSuitFace(id).ink, id).toBe(TYPE_INK[type]);
    }
    expect(TYPE_INK.unsorted).toBe('wildcard');
    for (const type of CARD_TYPES) expect(TYPE_INK[type]).toBe(type);
    // Every ink is worn by some card in the data, so none of the four is dead.
    const worn = new Set(ORDER_IDS.map((id) => orderSuitFace(id).ink));
    for (const ink of INK_IDS) expect(worn.has(ink), ink).toBe(true);
  });

  it('resolves each ink in the stylesheet, at the board’s colours', () => {
    const css = uiSource('style.css');
    const board: Record<string, [string, string]> = {
      military: ['#a8361b', '#f2ddd2'],
      economic: ['#b5791b', '#f3e5c8'],
      civic: ['#4f78be', '#dfe6f3'],
      wildcard: ['#4a2a72', '#e6dfee'],
    };
    for (const ink of INK_IDS) {
      expect(css, ink).toContain(`--type-${ink}: ${board[ink]![0]};`);
      expect(css, ink).toContain(`--type-${ink}-ground: ${board[ink]![1]};`);
      const rule = between(css, `[data-ink='${ink}'] {`, '}');
      expect(rule, ink).toContain(`--card-ink: var(--type-${ink});`);
      // The old accent's readers (the stamp, a card's frame) follow the type too.
      expect(rule, ink).toContain(`--line-ink: var(--type-${ink});`);
    }
  });

  it('says "Unsorted" for an unsorted card, never the Wildcard word its ink borrows', () => {
    // The two will fit different chairs from batch C2, and the word is how a
    // player tells them apart.
    expect(TYPE_WORD.unsorted).toBe('Unsorted');
    expect(TYPE_WORD.unsorted).not.toBe(TYPE_WORD.wildcard);
    const unsorted = ORDER_IDS.find((id) => orderType(id) === 'unsorted')!;
    expect(orderSuitFace(unsorted).caption.startsWith('Unsorted · ')).toBe(true);
    const typed = ORDER_IDS.find((id) => orderType(id) === 'military')!;
    expect(orderSuitFace(typed).caption.startsWith('Military · ')).toBe(true);
  });
});

describe('one rank a rarity', () => {
  it('ranks every row by its rarity, with its band as the numeral', () => {
    expect(BAND_NUMERAL).toEqual({ 0: '0', 1: 'I', 2: 'II', 3: 'III', 4: 'IV' });
    for (const id of ORDER_IDS) {
      const face = orderSuitFace(id);
      expect(face.rank, id).toBe(orderDef(id).rarity);
      expect(face.numeral, id).toBe(BAND_NUMERAL[orderDef(id).band as Band]);
      expect(face.caption, id).toContain(RARITY_WORD[orderDef(id).rarity]);
      expect(face.caption, id).toContain(`Tier ${face.numeral}`);
    }
    expect([...RANK_IDS]).toEqual(['common', 'uncommon', 'rare']);
  });

  it('draws the three ornaments the board names, one a rank', () => {
    const face = uiSource('suitFace.ts');
    for (const part of ['suit-frame-pip', 'suit-frame-court', 'suit-frame-trump', 'suit-ribbon', 'suit-cartouche']) {
      expect(face, part).toContain(part);
    }
    // A star in each corner of a rare card.
    for (const corner of ['is-tl', 'is-tr', 'is-bl', 'is-br']) expect(face).toContain(`'${corner}'`);
  });

  it('draws the rank in ink and pewter, never in a type’s ink', () => {
    // "No colour in the ladder, so it never meets a chair ink" (the board).
    const css = uiSource('style.css');
    const rank = between(css, '.suit-frame {', '/* The body: the medallion');
    expect(rank).not.toContain('card-ink');
    expect(rank).not.toContain('--type-');
    expect(rank).toContain('var(--rank-pewter)');
  });
});

describe('every surface draws an Order from orderSuitFace', () => {
  it('deals the draft’s hand as the A3 hand card', () => {
    const draft = braceBody(uiSource('main.ts'), 'function showStatecraftOffer()');
    expect(draft).toContain('suit: orderSuitFace(id)');
    expect(draft).toContain('badges: orderSuitBadges(id)');
    // The U1 deck face is gone from the draft; a Doctrine still reads its thread.
    expect(draft).not.toContain('orderFace(');
    expect(draft).toContain('...cardFace(doctrineDef(id))');
    expect(draft).not.toContain('...cardFace(orderDef(id))');
    const offer = uiSource('offerCard.ts');
    expect(offer).toContain("dressSuitFace(button, suit, 'hand', [");
    expect(offer).toContain('option.suit !== undefined ? suitHandCard(option, option.suit, index)');
  });

  it('seats a card in the council as the A3 seated card', () => {
    const screen = uiSource('statecraftScreen.ts');
    const slots = between(screen, 'function drawSlots(', 'function drawAggregate(');
    expect(slots).toContain("dressSuitFace(card, orderSuitFace(filled.card), 'seat', [name])");
    // The old office line drew the archetype thread's lozenge for every new row.
    expect(slots).not.toContain('cardLineMarkNode(');
    expect(slots).not.toContain('slotMarkNode(');
  });

  it('lists a card in the collection under the A3 row', () => {
    const screen = uiSource('statecraftScreen.ts');
    const face = braceBody(screen, 'function drawOrderFace(');
    expect(face).toContain('const face = orderSuitFace(id);');
    expect(face).toContain('suitRowNode(face, def.name, true)');
    expect(face).toContain('into.dataset.ink = face.ink;');
    expect(screen).toContain('drawOrderFace(button, id, describeCard(id));');
    // The shelf a card is filed on does not decide its ink.
    expect(screen).toContain("button.className = 'sc-card sc-card-order'");
    expect(uiSource('style.css')).not.toContain('.sc-card-dominion');
  });

  it('marks a card’s page in the Compendium with the same face, and says its type', () => {
    for (const id of ORDER_IDS) {
      const entry = entryOf(id);
      expect(entry.mark, id).toEqual({ kind: 'suit', face: orderSuitFace(id) });
      const type = entry.rows.find((row) => row.label === 'Type');
      if (orderDef(id).retired === true) {
        expect(type, `${id} is withdrawn and still prints a type`).toBeUndefined();
      } else {
        expect(type?.figures, id).toBe(TYPE_WORD[orderType(id)]);
      }
    }
  });

  it('inks a commission’s chip by its type, and draws its suit', () => {
    const rail = uiSource('commissionRail.ts');
    expect(rail).toContain('const face = orderSuitFace(card);');
    expect(rail).toContain('button.dataset.ink = chip.ink;');
    expect(rail).toContain('suitGlyphNode(suit)');
    expect(rail).not.toContain('deckFaceOf(');
  });

  it('draws no deck emblem for an Order anywhere but the reward sheet', () => {
    for (const file of ['offerCard.ts', 'statecraftScreen.ts', 'compendium.ts', 'commissionRail.ts']) {
      const source = uiSource(file);
      expect(source, file).not.toContain('deckMarkNode(');
      expect(source, file).not.toContain('deckFaceOf(');
    }
    expect(uiSource('main.ts')).not.toContain('orderFace(');
  });
});

describe('the deck is named once per card face', () => {
  it('names the deck at the foot, and on the eyebrow only where there is no foot', () => {
    // The A3 hand card does not draw the eyebrow: its foot names the deck.
    const offer = uiSource('offerCard.ts');
    const hand = braceBody(offer, 'export function suitHandCard(');
    expect(hand).not.toContain('offer-payoff');
    // The Compendium's page still says it in the eyebrow, out of one function.
    for (const id of ORDER_IDS) {
      expect(entryOf(id).eyebrow.split(' — ')[0], id).toBe(orderPayoff(id).toLowerCase());
      for (const deck of orderDef(id).decks) expect(orderPayoff(id), id).toContain(DECK_WORDS[deck]);
    }
  });

  it('never names a deck in the Compendium’s figures column', () => {
    for (const id of ORDER_IDS) {
      const figures = entryOf(id)
        .rows.map((row) => `${row.label} ${row.figures}`)
        .join(' ');
      for (const deck of DECK_IDS) {
        expect(figures.includes(DECK_WORDS[deck]), `${id} / ${deck}`).toBe(false);
      }
    }
  });
});

describe('the chips', () => {
  it('drops the rarity chip from an A3 card, and keeps the charter’s', () => {
    for (const id of ORDER_IDS) {
      const chips = orderSuitBadges(id);
      expect(chips.every((badge) => badge.tone === 'charter'), id).toBe(true);
      expect(chips.length, id).toBe(orderDef(id).charter === undefined ? 0 : 1);
    }
    expect(orderSuitBadges(CHARTER)).toEqual([{ label: CHARTER_CHIP, tone: 'charter' }]);
    // The collection prints the charter's chip through the one printer.
    expect(braceBody(uiSource('statecraftScreen.ts'), 'function drawOrderFace(')).toContain(
      'orderChipsNode(id, charter)',
    );
  });

  it('keeps the rarity chip and its marks for the reward sheet and the book', () => {
    // `docs/orders-and-doctrines.md` §Rarity, whose column IS `OrderDef.rarity`.
    expect(RARITY_MARK).toEqual({ common: '●', uncommon: '◆', rare: '○' });
    for (const id of ORDER_IDS) {
      const rarity = orderDef(id).rarity;
      const chips = orderBadges(id).filter((badge) => badge.tone === rarity);
      expect(chips.length, id).toBe(1);
      expect(chips[0]!.label, id).toBe(RARITY_WORD[rarity]);
      const row = entryOf(id).rows.find((one) => one.label === 'Rarity');
      expect(row?.figures, id).toBe(`${RARITY_MARK[rarity]} ${RARITY_WORD[rarity]}`);
    }
  });
});

describe('the flair gallery', () => {
  it('shows the six suits and the seal among the drawn marks', () => {
    const marks = gallery('marks.ts');
    expect(marks).toContain('for (const suit of SUIT_IDS)');
    expect(marks).toContain('suitMarkDataUri(suit)');
    expect(marks).toContain("suitMarkDataUri('seal')");
  });

  it('shows the faces through the game’s own builders', () => {
    const faces = gallery('cardFaces.ts');
    expect(faces).toContain('suitHandCard(');
    expect(faces).toContain("dressSuitFace(card, face, 'seat'");
    expect(faces).toContain('suitRowNode(');
    expect(faces).toContain('orderSuitFace(id)');
    expect(gallery('main.ts')).toContain('drawCardFaces(');
  });
});

describe('what C1 leaves alone', () => {
  it('leaves a Doctrine reading its archetype thread', () => {
    // A Doctrine carries `decks` too (the empty list every pre-rework row got),
    // so the class is decided by the caller and never by the row's shape.
    let threaded = 0;
    for (const id of DOCTRINE_IDS) {
      expect(doctrineDef(id).decks, id).toEqual([]);
      if ((doctrineDef(id).line ?? 'none') !== 'none') threaded += 1;
    }
    expect(threaded).toBeGreaterThan(0);
    const screen = uiSource('statecraftScreen.ts');
    expect(screen).toContain("drawCardFace(card, cardDef(id), 'permanent', describeCard(id));");
    expect(braceBody(screen, 'function drawCardFace(')).toContain('cardLineMarkNode(id)');
  });

  it('leaves the reward sheet on the U1 deck face until batch C3 removes it', () => {
    const hand = braceBody(uiSource('rewardSheet.ts'), 'function drawHand(');
    expect(hand).toContain('deckFaceOf(def)');
    expect(hand).toContain('deckMarkNode(face)');
    expect(hand).toContain('orderChipsNode(id)');
    expect(hand).toContain('orderPayoff(id)');
    // So every deck face the reward sheet can ask for is still drawn.
    const faces: DeckFace[] = [...DECK_IDS, 'generic', 'shared'];
    expect(Object.keys(DECK_MARKS).sort()).toEqual([...faces].sort());
    expect(new Set(faces.map((face) => deckMarkDataUri(face))).size).toBe(faces.length);
    for (const id of ORDER_IDS) expect(DECK_MARKS[deckFaceOf(orderDef(id))], id).toBeDefined();
  });
});
