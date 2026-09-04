/**
 * The offer spread's arithmetic: a hand of two, three, four or five cards that
 * fits on the smallest stage this game is played on.
 *
 * There is no jsdom in this suite (see `test/ui/statecraftCards.test.ts`), so
 * nothing here builds a card — which is exactly why `offerSpread` is a pure
 * function of a count and a stage rather than a measurement taken off a laid-out
 * DOM. How many cards an offer deals is a *fold* now (`explainOfferSize`), so
 * "does the spread fit" stopped being a thing anybody could check by opening the
 * game once: it is four counts times two frames, and a spread that overflows is
 * the sort of thing that is quietly wrong on every offer at once.
 *
 * It was four counts times two frames times *the upgrade card being there or
 * not* until the levelling ruling of 2026-09-04 took the centred card away. The
 * spread has one shape now, and the sheet's second control (the pass) lives in
 * the foot, which `FOOT` has always been paying for.
 *
 * The one screen in this interface that cannot be dismissed is the last one that
 * should be allowed to fall off the bottom of the window — there is no Escape
 * from an offer, so a card the player cannot reach is a game they cannot play.
 */

import { describe, expect, it } from 'vitest';

import { offerSpread, phaseAfter } from '../../src/ui/offerCard';

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
      const what = `${count} cards at ${name}`;

      it(`stands inside the window: ${what}`, () => {
        const spread = offerSpread(count, stage);
        // Top to bottom, overlay padding included. This is the whole point.
        expect(spread.total, what).toBeLessThanOrEqual(stage.height);
      });

      it(`lays the row inside the sheet: ${what}`, () => {
        const spread = offerSpread(count, stage);
        const row = spread.card * count + GAP * (count - 1) + SHEET_PAD_X * 2;
        expect(row, what).toBeLessThanOrEqual(spread.sheet);
        // And the sheet inside the overlay's own padding.
        expect(spread.sheet + 48, what).toBeLessThanOrEqual(stage.width);
      });

      it(`keeps a card a card: ${what}`, () => {
        const spread = offerSpread(count, stage);
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
});

describe('the spread narrows as the hand widens', () => {
  it('never deals a wider card to a bigger hand', () => {
    for (const stage of Object.values(STAGES)) {
      let previous = Number.POSITIVE_INFINITY;
      for (const count of COUNTS) {
        const spread = offerSpread(count, stage);
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
    const spread = offerSpread(3, STAGES.large);
    expect(spread.sheet).toBe(880);
    expect(spread.scale).toBe(1);
    expect(spread.card).toBe(272);
  });

  it('fits the smaller frame rather than scrolling it', () => {
    // The one screen that cannot be dismissed must never overflow the window it
    // is drawn in — the measurement that put this arithmetic here.
    const small = offerSpread(3, STAGES.small);
    expect(small.total).toBeLessThanOrEqual(STAGES.small.height);
    expect(small.card).toBeGreaterThan(0);
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
    const spread = offerSpread(5, { width: 1280, height: 560 });
    expect(spread.height).toBeGreaterThanOrEqual(210);
    expect(spread.card).toBeGreaterThan(0);
  });
});

/**
 * View map: the sheet comes down, the offer does not (user, 2026-08-27).
 *
 * `phaseAfter` is the component's own state machine rather than a model of it —
 * `createOfferCard` runs exactly this and does its DOM around the answer — which
 * is what makes asserting it worth anything in a suite with no jsdom. What is
 * being held still is one distinction: **hidden is not gone**. An offer put away
 * so the player can look at their capital is still an offer, and the moment that
 * stops being true the boon a player crossed the map for is thrown away by the
 * key people press to close things.
 */
describe('an offer put away is still an offer', () => {
  it('hides without ending, and comes back', () => {
    let phase = phaseAfter('none', 'show');
    expect(phase).toBe('shown');
    phase = phaseAfter(phase, 'viewMap');
    expect(phase).toBe('hidden');
    phase = phaseAfter(phase, 'reopen');
    expect(phase).toBe('shown');
  });

  it('is never ended by hiding, from any state', () => {
    // The one rule that must not be edited away: only taking a card and a new
    // game end an offer.
    expect(phaseAfter('shown', 'viewMap')).not.toBe('none');
    expect(phaseAfter('hidden', 'viewMap')).not.toBe('none');
  });

  it('does nothing at all with no offer in hand', () => {
    // Escape on an empty board must not leave a "Return to the offer" chip
    // pointing at nothing.
    expect(phaseAfter('none', 'viewMap')).toBe('none');
    expect(phaseAfter('none', 'reopen')).toBe('none');
  });

  it('ends on the pick and on a new game, and only there', () => {
    for (const from of ['shown', 'hidden'] as const) {
      expect(phaseAfter(from, 'take')).toBe('none');
      expect(phaseAfter(from, 'clear')).toBe('none');
    }
  });

  it('lets the chip and the blocker both lead back without arguing', () => {
    // Two affordances point at the same offer; pressing the second after the
    // first should leave the card where it is rather than error.
    expect(phaseAfter('shown', 'reopen')).toBe('shown');
  });

  it('deals over whatever was held, hidden included', () => {
    // End Turn's blocker re-shows the pending offer off the state, which lands
    // as a plain `show` on a component that is currently hiding one.
    expect(phaseAfter('hidden', 'show')).toBe('shown');
  });
});

/**
 * The foot the View map control sits in is *in the budget*.
 *
 * `FOOT` is a length in the `.offer-*` block exactly as `HEAD` is, and a strip
 * added to the sheet without being subtracted from the room the cards get is a
 * spread that thinks it fits and does not — on the one screen a player cannot
 * dismiss.
 */
describe('the foot is paid for', () => {
  it('still fits the smallest stage with five cards', () => {
    const spread = offerSpread(5, STAGES.small);
    expect(spread.total).toBeLessThanOrEqual(STAGES.small.height);
  });
});

/**
 * The other half of "nothing is spent", and the half a state machine cannot
 * say: that hiding sends no command and drops no callback.
 *
 * Read from the source, `seatRoster.test.ts`'s instrument, because the failure
 * has no error in it — an offer thrown away by Escape looks exactly like an
 * offer that was never dealt, and the End Turn blocker would then be pointing at
 * a card nothing can put back on screen.
 */
describe('View map spends nothing', () => {
  const SOURCE = Object.values(
    import.meta.glob('../../src/ui/offerCard.ts', {
      eager: true,
      query: '?raw',
      import: 'default',
    }) as Record<string, string>,
  )[0] as string;

  /** The body of one top-level `function name(...) { … }` in the module. */
  function body(name: string): string {
    const at = SOURCE.indexOf(`\n  function ${name}(`);
    if (at < 0) throw new Error(`offerCard.ts has no function "${name}"`);
    const open = SOURCE.indexOf('{', at);
    let depth = 0;
    for (let i = open; i < SOURCE.length; i += 1) {
      if (SOURCE[i] === '{') depth += 1;
      else if (SOURCE[i] === '}') {
        depth -= 1;
        if (depth === 0) return SOURCE.slice(open + 1, i);
      }
    }
    throw new Error(`offerCard.ts: "${name}" never closes`);
  }

  it('never calls the caller back', () => {
    // `choose` is the offer. Hiding must not reach it in any form.
    expect(body('viewMap')).not.toContain('choose');
  });

  /**
   * **And the pass is the opposite** (the draft's second answer, 2026-09-04).
   * The one thing that must never blur is that View map keeps the offer and a
   * pass spends it, so the pass is held to `take`'s contract rather than
   * `viewMap`'s: it drops the offer, it reports the phase, and it calls the
   * caller — which is what dispatches the command.
   */
  it('spends the offer when the player passes', () => {
    const skip = body('skip');
    expect(skip).toContain('standing = null');
    expect(skip).toContain("moveTo('take')");
    expect(skip).toContain('callback()');
  });

  it('never lets a pass reach an offer that has none', () => {
    // A caller that gave `Offer.pass` and no handler has written a button that
    // does nothing; it must not instead answer an offer nobody passed on.
    expect(body('skip')).toContain('if (callback === null) return;');
  });

  it('never lets go of the offer it is holding', () => {
    expect(body('viewMap')).not.toContain('standing = null');
    // And the two that do end an offer still do.
    expect(body('clear')).toContain('standing = null');
    expect(body('take')).toContain('standing = null');
  });

  it('reopens from the offer it kept rather than asking for a new one', () => {
    // An offer is drawn once at the moment it opens (CLAUDE.md); a reopen that
    // re-derived the hand would make the deal a function of when somebody
    // looked at a screen.
    expect(body('reopen')).toContain('standing.offer');
  });
});
