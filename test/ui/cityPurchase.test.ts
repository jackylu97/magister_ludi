/**
 * Two promises the city screen makes that only a source read can hold still,
 * both from the 2026-08-26 playtest (ledger Entry XXIX).
 *
 *   1. **A purchase-only thing is not a build row.** The augur used to sit in
 *      the "Add to queue" grid, greyed, answering "why can I not build this"
 *      with "because it is not built" — which is not an answer, it is a
 *      category error. The panel now filters the unit list with
 *      `isPurchaseOnly` and offers the augur in the bank it is actually sold
 *      in. The failure mode of forgetting is a row that looks broken rather than
 *      one that errors, so no behavioural test sees it.
 *   2. **Every buildable row carries its price in coin.** A tag that exists for
 *      units and not buildings (or the other way round) is the sort of gap that
 *      reads as a missing feature for a milestone.
 *
 * Plus the one thing item 3 of that playtest asked for, and the only way to make
 * it stay asked for: a belief's **axis has no name**. Keeping the table free of
 * a name field is what leaves nowhere for one to be printed from — an assertion
 * about the shape rather than about any one surface, which is what makes it
 * survive the next screen that draws a card.
 */

import { describe, expect, it } from 'vitest';

import { AXIS_MARK } from '../../src/ui/religionScreen';
import { BELIEF_AXES } from '../../src/sim/religionData';

/** The panel's own text, read through Vite's raw glob (`seatRoster.test.ts`). */
const SOURCES = import.meta.glob('../../src/ui/cityPanel.ts', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function panelSource(): string {
  const text = Object.values(SOURCES)[0];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error('cityPanel.ts came back empty');
  }
  return text;
}

describe('the build list and the price tags', () => {
  it('filters purchase-only types out of the unit rows', () => {
    const source = panelSource();
    expect(source).toMatch(/isPurchaseOnly\(\{ kind: 'unit', id \}\)/);
    // …and offers them instead, in the bank the roster row names.
    expect(source).toMatch(/purchaseVerb\(item\)/);
  });

  it('gives a unit row and a building row a tag, and a project or a wonder none', () => {
    const source = panelSource();
    // The rows are built through one helper, so the three call sites say which
    // of them is priced. A project never completes, so there is nothing to buy;
    // a **wonder** is refused by `purchaseError` outright (it is built, not
    // bought), so its row withholds the tag rather than offering a price the
    // reducer will not honour.
    expect(source).toMatch(/row\(button, \{ kind: 'unit', id \}\)/);
    expect(source).toMatch(/row\(button, wonder \? undefined : \{ kind: 'building', id \}\)/);
    expect(source).toMatch(/\n\s*row\(button\);/);
  });

  it('prices and greys the tag with the reducer’s own two functions', () => {
    const source = panelSource();
    // The figure is the price evaluator's fold and the blocker is the command's
    // own sentence — so a tag a player can press is a command the reducer takes.
    expect(source).toMatch(/explainPurchaseCost\(state, seat, city\.id, item, currency\)/);
    expect(source).toMatch(/purchaseError\(state, seat, city\.id, item, currency\)/);
  });

  it('leads the purchase caption with the treasury, as Buy Tiles does', () => {
    const source = panelSource();
    expect(source).toMatch(/in the treasury/);
    expect(source).toMatch(/RULES\.production\.goldPerHammer/);
  });
});

describe('a belief’s axis has no word', () => {
  it('carries a glyph and nothing else, for every axis', () => {
    for (const axis of BELIEF_AXES) {
      const mark = AXIS_MARK[axis];
      expect(Object.keys(mark), axis).toEqual(['glyph']);
      expect(mark.glyph, axis).toBeTruthy();
    }
  });
});
