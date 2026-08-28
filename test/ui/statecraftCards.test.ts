/**
 * The Statecraft deck's *dressing*, in the two places it can be quietly wrong on
 * every card at once.
 *
 * There is no jsdom in this suite (see `test/ui/yieldMark.test.ts` for the same
 * note), so nothing here builds a card. What it asks instead is the pair of
 * questions that survive that: **where a card sits** in an offer, and **whether
 * every card the data can deal has a face to wear**.
 *
 * The second one is the real prize. A line is a string in
 * `data/statecraft.json`, the table that says what a line looks like is
 * TypeScript, and the two are joined by nothing but a record type — which is
 * checked at compile time for the members that *exist* and not at all for the
 * members a JSON row can invent. A card dealt with an unknown thread would have
 * come up with no emblem and no accent, on the one screen where the whole point
 * is that a hand reads as coloured.
 */

import { describe, expect, it } from 'vitest';

import {
  CARD_LINE_MARKS,
  type PendingCardLine,
  SLOT_MARKS,
  lineMarkSvg,
} from '../../src/art/lineMarks';
import { CARD_LINE_ACCENT, CARD_LINE_NAME, lineOf } from '../../src/ui/cardLine';
import { type OfferOption, orderOfferLayout } from '../../src/ui/offerCard';
import {
  DOCTRINE_IDS,
  GOVERNMENT_IDS,
  ORDER_IDS,
  SLOT_TYPES,
  cardDef,
} from '../../src/sim/statecraftData';

/** A card with only the fields the layout reads. The rest is the DOM's business. */
function option(title: string, emphasis?: 'deepen'): OfferOption {
  const card: OfferOption = { title, payoff: '', flavor: '' };
  if (emphasis !== undefined) card.emphasis = emphasis;
  return card;
}

describe('orderOfferLayout', () => {
  /**
   * The playtest note, held as a rule: the upgrade is not the fourth card of a
   * row, it is the card in the middle. Three new Orders flank it.
   */
  it('lifts the deepen card out of the row and centres it', () => {
    const layout = orderOfferLayout([
      option('Blooded Spears'),
      option('Salt Tithes'),
      option('Far Runners'),
      option('Militia Levies · 1 → 2', 'deepen'),
    ]);
    expect(layout.row).toEqual([0, 1, 2]);
    expect(layout.centre).toBe(3);
  });

  /**
   * And the indices are the *reducer's*, not the row's. `chooseOrder` is told an
   * `optionIndex` and the upgrade is deliberately the last one
   * (`isUpgradeIndex`), so a layout that renumbered as it reordered would pick
   * the card next to the one the player clicked.
   */
  it('answers indices into the offer, never positions in the spread', () => {
    const layout = orderOfferLayout([
      option('Deepen', 'deepen'),
      option('A'),
      option('B'),
      option('C'),
    ]);
    expect(layout.centre).toBe(0);
    expect(layout.row).toEqual([1, 2, 3]);
  });

  it('leaves every other offer exactly as it was: no centre, the row in order', () => {
    // A discovery's three, a Doctrine's three, the government triple.
    const layout = orderOfferLayout([option('A'), option('B'), option('C')]);
    expect(layout.centre).toBeNull();
    expect(layout.row).toEqual([0, 1, 2]);
  });

  it('takes the first deepen card and only the first', () => {
    // There is at most one today — `OrderOffer.upgrade` is a single id — and a
    // second centred card would be a spread nobody has designed.
    const layout = orderOfferLayout([option('A'), option('X', 'deepen'), option('Y', 'deepen')]);
    expect(layout.centre).toBe(1);
    expect(layout.row).toEqual([0, 2]);
  });

  it('survives an empty offer without inventing a card', () => {
    expect(orderOfferLayout([])).toEqual({ row: [], centre: null });
  });
});

describe('every card the data can deal has a face', () => {
  const EVERY_CARD = [...GOVERNMENT_IDS, ...DOCTRINE_IDS, ...ORDER_IDS];

  it('finds the whole table, so the sweep is not vacuous', () => {
    expect(EVERY_CARD.length).toBeGreaterThan(90);
  });

  /**
   * The join the compiler cannot make: `line` is a string in JSON and
   * `CardLine` is a union in TypeScript, and a row with a thread nobody drew
   * would deal a card with no emblem and no accent.
   */
  it('draws every thread the table names, and names every ink', () => {
    for (const id of EVERY_CARD) {
      const line = lineOf(cardDef(id));
      expect(CARD_LINE_MARKS[line], `no drawing for "${line}" (${id})`).toBeDefined();
      expect(CARD_LINE_NAME[line], `no name for "${line}" (${id})`).toBeTruthy();
      expect(CARD_LINE_ACCENT[line], `no accent for "${line}" (${id})`).toBeTruthy();
    }
  });

  /**
   * `'none'` is most of the good cards, so its mark has to be a real drawing
   * rather than an absence — a blank emblem reads as a card that failed to load,
   * not as a card that joins no line.
   */
  it('gives the neutral card a drawing of its own', () => {
    expect(CARD_LINE_MARKS.none.paths.length).toBeGreaterThan(0);
    expect(lineMarkSvg(CARD_LINE_MARKS.none)).toContain('<path');
  });

  it('draws a distinct mark for each thread — no two lines share a picture', () => {
    const drawn = Object.values(CARD_LINE_MARKS).map((mark) => lineMarkSvg(mark));
    expect(new Set(drawn).size).toBe(drawn.length);
  });

  it('draws the three offices an empty slot ghosts', () => {
    for (const slot of SLOT_TYPES) {
      expect(SLOT_MARKS[slot].paths.length).toBeGreaterThan(0);
      expect(lineMarkSvg(SLOT_MARKS[slot])).toContain('<svg');
    }
  });

  /**
   * The mask only paints what the drawing covers, so an empty `d` is an emblem
   * that silently is not there — and it is invisible in review because the frame
   * around it still draws.
   */
  it('leaves no empty path in either set', () => {
    const every = [...Object.values(CARD_LINE_MARKS), ...Object.values(SLOT_MARKS)];
    for (const mark of every) {
      for (const path of mark.paths) expect(path.d.length).toBeGreaterThan(4);
      expect(mark.note.length).toBeGreaterThan(0);
    }
  });
});

/**
 * The threads the deck's newer themes name, drawn and named ahead of the union
 * that will hold them.
 *
 * A colour is not a rule (`CardLine`'s own docblock), so the interface may be
 * ready for a thread before `src/sim/statecraftData.ts` declares it. The failure
 * that shape invites is a face declared in one of the three tables and forgotten
 * in the other two — a card that comes up named but blank, or drawn but grey —
 * and that is invisible until somebody deals the card, which cannot happen until
 * the simulation adopts the member. So the sweep is over the union itself.
 */
describe('the threads waiting for the data to name them', () => {
  const PENDING: readonly PendingCardLine[] = [
    'court',
    'cloister',
    'charter',
    'ploughshare',
    'highlands',
  ];

  it('is the Marble Court and its four siblings', () => {
    // The Laureate is the card waiting for one of them. Named here so that
    // renaming the thread without renaming the row fails loudly.
    expect(PENDING).toContain('court');
    expect(CARD_LINE_NAME.court).toBe('The Marble Court');
  });

  it('has a drawing, a name and an ink for every one of them', () => {
    for (const line of PENDING) {
      expect(CARD_LINE_MARKS[line], `no drawing for "${line}"`).toBeDefined();
      expect(CARD_LINE_MARKS[line].paths.length, `empty drawing for "${line}"`).toBeGreaterThan(0);
      expect(CARD_LINE_MARKS[line].note, `undescribed drawing for "${line}"`).toBeTruthy();
      expect(CARD_LINE_NAME[line], `no name for "${line}"`).toBeTruthy();
      expect(CARD_LINE_ACCENT[line], `no accent for "${line}"`).toBe(line);
    }
  });

  /**
   * The accent key reaches the DOM as `data-line` and is resolved to ink by one
   * block of `style.css`. A key with no block there is a card drawn in whatever
   * `--line-ink` happened to be inherited — which is *something*, and therefore
   * a bug nobody notices.
   */
  it('has a cut of the palette resolved for every accent', async () => {
    const css = (
      await import('../../src/style.css?raw')
    ).default as unknown as string;
    for (const line of PENDING) {
      expect(css, `no --line-${line} in the palette`).toContain(`--line-${line}:`);
      expect(css, `no [data-line='${line}'] block`).toContain(`[data-line='${line}']`);
    }
  });

  it('reads every name as a name, never as a bare word', () => {
    for (const line of PENDING) {
      expect(CARD_LINE_NAME[line]).toMatch(/^The [A-Z]/);
    }
  });
});
