/**
 * The offer spread's arithmetic: a hand of two, three, four or five cards that
 * fits on the smallest stage this game is played on.
 *
 * There is no jsdom in this suite (see `test/ui/statecraftCards.test.ts`), so
 * nothing here builds a card — which is exactly why `offerSpread` is a pure
 * function of a count and a stage rather than a measurement taken off a laid-out
 * DOM. How many cards an offer deals is a *fold* now (`explainOfferSize`), so
 * "does the spread fit" stopped being a thing anybody could check by opening the
 * game once: it is four counts times two frames times the upgrade card being
 * there or not, and a spread that overflows is the sort of thing that is quietly
 * wrong on every offer at once.
 *
 * The one screen in this interface that cannot be dismissed is the last one that
 * should be allowed to fall off the bottom of the window — there is no Escape
 * from an offer, so a card the player cannot reach is a game they cannot play.
 */

import { describe, expect, it } from 'vitest';

import { offerSpread } from '../../src/ui/offerCard';

/** The two frames the spread is verified in, and the smaller one is the gate. */
const STAGES = {
  small: { width: 1280, height: 720 },
  large: { width: 1440, height: 900 },
};

/** Every hand `rules.offers` can deal: the base of three, down to two, up to the cap. */
const COUNTS = [2, 3, 4, 5];

/** The stylesheet's own gap and the sheet's horizontal padding. */
const GAP = 12;
const SHEET_PAD_X = 20;

describe('the spread fits the stage', () => {
  for (const [name, stage] of Object.entries(STAGES)) {
    for (const count of COUNTS) {
      for (const centre of [false, true]) {
        const what = `${count} cards${centre ? ' and an upgrade' : ''} at ${name}`;

        it(`stands inside the window: ${what}`, () => {
          const spread = offerSpread(count, stage, { centre });
          // Top to bottom, overlay padding included. This is the whole point.
          expect(spread.total, what).toBeLessThanOrEqual(stage.height);
        });

        it(`lays the row inside the sheet: ${what}`, () => {
          const spread = offerSpread(count, stage, { centre });
          const row = spread.card * count + GAP * (count - 1) + SHEET_PAD_X * 2;
          expect(row, what).toBeLessThanOrEqual(spread.sheet);
          // And the sheet inside the overlay's own padding.
          expect(spread.sheet + 48, what).toBeLessThanOrEqual(stage.width);
        });

        it(`keeps a card a card: ${what}`, () => {
          const spread = offerSpread(count, stage, { centre });
          // Portrait, always: a card wider than it is tall is a certificate.
          expect(spread.height, what).toBeGreaterThan(spread.card);
          // Legible: the type scale never drops below the floor the tarot face
          // was drawn to survive, and never grows past its designed size.
          expect(spread.scale, what).toBeGreaterThanOrEqual(0.74);
          expect(spread.scale, what).toBeLessThanOrEqual(1);
          expect(spread.emblem, what).toBeGreaterThanOrEqual(28);
        });
      }
    }
  }
});

describe('the spread narrows as the hand widens', () => {
  it('never deals a wider card to a bigger hand', () => {
    for (const stage of Object.values(STAGES)) {
      let previous = Number.POSITIVE_INFINITY;
      for (const count of COUNTS) {
        const spread = offerSpread(count, stage, { centre: true });
        expect(spread.card).toBeLessThanOrEqual(previous);
        previous = spread.card;
      }
    }
  });

  it('shrinks the emblem and the type with the card', () => {
    const three = offerSpread(3, STAGES.small);
    const five = offerSpread(5, STAGES.small);
    expect(five.emblem).toBeLessThan(three.emblem);
    expect(five.scale).toBeLessThan(three.scale);
  });

  it('draws the ordinary three-card draft at its designed size where there is room', () => {
    // The base is three and the screen was drawn for three: on the larger frame
    // the type is at scale 1 and the sheet is the width it has always been. A
    // pass about four and five that quietly redrew the ordinary draft would be
    // a regression wearing a feature's clothes.
    const spread = offerSpread(3, STAGES.large, { centre: true });
    expect(spread.sheet).toBe(880);
    expect(spread.scale).toBe(1);
    expect(spread.card).toBe(272);
  });

  it('shrinks that same draft to fit the smaller frame rather than scrolling it', () => {
    // The measurement that started this: three cards *and* the upgrade card at
    // 1280×720 overflowed the sheet and scrolled, on the one screen that cannot
    // be dismissed. It fits now because the row gives up the height the upgrade
    // card needs.
    const small = offerSpread(3, STAGES.small, { centre: true });
    const large = offerSpread(3, STAGES.large, { centre: true });
    expect(small.card).toBeLessThan(large.card);
    expect(small.total).toBeLessThanOrEqual(STAGES.small.height);
  });
});

describe('the upgrade card is paid for in height', () => {
  it('takes the room out of the row rather than off the bottom of the sheet', () => {
    for (const count of COUNTS) {
      const alone = offerSpread(count, STAGES.small);
      const withCentre = offerSpread(count, STAGES.small, { centre: true });
      // The height is what the upgrade card costs the row. The width follows it
      // only where the portrait rule bites — a hand of two, whose cards are wide
      // enough that the room the upgrade takes would have flattened them.
      expect(withCentre.height).toBeLessThanOrEqual(alone.height);
      expect(withCentre.card).toBeLessThanOrEqual(alone.card);
      expect(withCentre.total).toBeLessThanOrEqual(STAGES.small.height);
    }
  });
});

describe('a stage nobody designed for', () => {
  it('still answers a card that fits a phone', () => {
    const spread = offerSpread(5, { width: 390, height: 780 });
    expect(spread.sheet).toBeLessThanOrEqual(390 - 48);
    // The floor holds — below it a card is not a card — and the stylesheet's
    // narrow query is what stacks the row rather than this arithmetic.
    expect(spread.card).toBe(132);
  });

  it('does not fold up on a short window', () => {
    const spread = offerSpread(5, { width: 1280, height: 560 }, { centre: true });
    expect(spread.height).toBe(210);
    expect(spread.card).toBeGreaterThan(0);
  });
});
