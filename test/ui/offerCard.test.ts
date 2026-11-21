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

import { OFFER_REVEAL, revealDelay, revealEndsAt } from '../../src/ui/cardDeal';
import { OFFER_WORDS, dressedSpread, offerSpread, phaseAfter, stackedSpread, takeLabel } from '../../src/ui/offerCard';
import { GOVERNMENT_HAND_SHAPE, OFFER_FACE_SHAPES } from '../../src/ui/offerFaces';

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
        // The A3 hand card's own scale (batch C1) keeps the same floor and cap.
        expect(spread.suitScale, what).toBeGreaterThanOrEqual(0.74);
        expect(spread.suitScale, what).toBeLessThanOrEqual(1);
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

/**
 * **The A3 hand card** (batch C1, `suitFace.ts`) was drawn at 200 wide, not
 * the emblem face's 265, and carries more above its name, so it has a scale of
 * its own. Its content has to fit the height the spread grants, as the emblem
 * face's does.
 */
describe('the A3 hand card fits the spread', () => {
  /** The A3 card's content at scale 1, as `offerCard.ts` estimates it. */
  const SUIT_CONTENT_AT_ONE = 360;

  it('draws the ordinary three-card draft at the board’s size where there is room', () => {
    expect(offerSpread(3, STAGES.large).suitScale).toBe(1);
  });

  it('shrinks with a wider hand, and never past the floor', () => {
    for (const stage of Object.values(STAGES)) {
      let previous = Number.POSITIVE_INFINITY;
      for (const count of COUNTS) {
        const spread = offerSpread(count, stage);
        expect(spread.suitScale).toBeLessThanOrEqual(previous);
        previous = spread.suitScale;
      }
    }
  });

  it('fits its content in the height the spread grants, unless held at the floor', () => {
    for (const stage of Object.values(STAGES)) {
      for (const count of COUNTS) {
        const spread = offerSpread(count, stage);
        if (spread.suitScale === 0.74) continue;
        // Within the rounding to two places: half a hundredth of the content.
        expect(spread.suitScale * SUIT_CONTENT_AT_ONE, `${count} cards`).toBeLessThanOrEqual(
          spread.height + SUIT_CONTENT_AT_ONE * 0.005,
        );
      }
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

/**
 * **A hand of drawn faces** (Quiet Table, build stage 2): the Order draft's
 * engraved cards and the great person cards keep their proportion, and the
 * sheet is as tall as its content. The board's Order sheet is 444 px tall
 * where the old one was 532 (the user: "too much negative space on the
 * bottom").
 */
describe('a hand of drawn faces fits the stage', () => {
  for (const [shapeName, shape] of Object.entries(OFFER_FACE_SHAPES)) {
    for (const count of COUNTS) {
      for (const [stageName, stage] of Object.entries(STAGES)) {
        it(`stands inside the window: ${count} ${shapeName} cards at ${stageName}`, () => {
          const spread = dressedSpread(count, stage, shape);
          expect(spread.total).toBeLessThanOrEqual(stage.height);
          expect(spread.sheet).toBeLessThanOrEqual(stage.width - 48);
          expect(spread.card).toBeLessThanOrEqual(shape.width);
          // A card keeps its own proportion, whatever the room.
          expect(spread.height).toBe(Math.round(spread.card * shape.ratio));
        });
      }
    }
  }

  /**
   * **A stacked hand** (the government banners, Quiet Table frame 7): the
   * rows stand one under another, each 856 by 164 where there is room (the
   * board's 130 and the name plate under the window), and the whole sheet
   * inside the window.
   */
  for (const count of COUNTS) {
    for (const [stageName, stage] of Object.entries(STAGES)) {
      it(`stands a stacked hand inside the window: ${count} banners at ${stageName}`, () => {
        const spread = stackedSpread(count, stage, GOVERNMENT_HAND_SHAPE);
        expect(spread.total).toBeLessThanOrEqual(stage.height);
        expect(spread.sheet).toBeLessThanOrEqual(stage.width - 48);
        expect(spread.card).toBeLessThanOrEqual(GOVERNMENT_HAND_SHAPE.width);
        expect(spread.height).toBe(Math.round(spread.card * GOVERNMENT_HAND_SHAPE.ratio));
      });
    }
  }

  it('draws the three government banners at the board’s width on the large stage, and a little under it on the small one', () => {
    const large = stackedSpread(3, STAGES.large, GOVERNMENT_HAND_SHAPE);
    expect(large.card).toBe(856);
    expect(large.height).toBe(164);
    // The board's sheet: the rows and a 16 px margin either side.
    expect(large.sheet).toBe(888);
    // At 1280 by 720 three rows of 164 are a few pixels too tall, so the hand is 849 wide.
    const small = stackedSpread(3, STAGES.small, GOVERNMENT_HAND_SHAPE);
    expect(small.card).toBe(849);
    expect(small.height).toBe(163);
    expect(small.sheet).toBe(881);
  });

  it('draws the three-card draft and the great person offer at the board’s sizes where there is room', () => {
    expect(dressedSpread(3, STAGES.large, OFFER_FACE_SHAPES.order).card).toBe(220);
    expect(dressedSpread(3, STAGES.large, OFFER_FACE_SHAPES.person).card).toBe(214);
    expect(dressedSpread(3, STAGES.small, OFFER_FACE_SHAPES.person).card).toBe(214);
    // The Order sheet is about the board's 444 px: the overlay's two pads are
    // not part of the sheet.
    const order = dressedSpread(3, STAGES.large, OFFER_FACE_SHAPES.order);
    expect(order.total - 48).toBeLessThan(470);
  });
});

/**
 * **The reveal** (Quiet Table, build stage 2; the user: "have the cards reveal
 * themselves one by one"): a hold on the backs, then one card after another,
 * each turn as long as before. Three cards are all up at 1240 ms.
 */
describe('the reveal', () => {
  it('holds, then turns the cards one by one, at the board’s timings', () => {
    expect(OFFER_REVEAL).toEqual({ holdMs: 300, staggerMs: 260, turnMs: 420 });
    expect([0, 1, 2].map(revealDelay)).toEqual([300, 560, 820]);
    expect(revealEndsAt(3)).toBe(1240);
    expect(revealEndsAt(0)).toBe(0);
  });

  const SOURCE = Object.values(
    import.meta.glob('../../src/ui/offerCard.ts', { eager: true, query: '?raw', import: 'default' }) as Record<
      string,
      string
    >,
  )[0] as string;

  it('writes each card’s wait and turn from the one table', () => {
    expect(SOURCE).toContain("button.style.setProperty('--deal-delay', `${revealDelay(index)}ms`);");
    expect(SOURCE).toContain("button.style.setProperty('--deal-turn', `${OFFER_REVEAL.turnMs}ms`);");
    expect(SOURCE).toContain('}, revealEndsAt(offer.options.length) + 40);');
    // The back is the caller's (the draft pile's, the laurel, the crown), or the weave.
    expect(SOURCE).toContain('button.append((offer.back ?? cardBack)());');
  });

  it('turns every card up on a press or a key, and lets neither choose a card', () => {
    // A press: caught on the overlay in the capturing phase, before any card.
    expect(SOURCE).toContain("container.addEventListener('click', onRevealPress, true);");
    const press = SOURCE.slice(SOURCE.indexOf('function onRevealPress('));
    expect(press.slice(0, press.indexOf('\n  }'))).toContain('event.stopPropagation();');
    // A key: swallowed, and its keyup too, because a button presses on Space's keyup.
    expect(SOURCE).toContain("if (revealing && event.key !== 'Escape' && !MODIFIER_KEYS.has(event.key)) {");
    expect(SOURCE).toContain("window.addEventListener('keyup', onKeyUp, true);");
    expect(SOURCE).toContain("container.removeEventListener('click', onRevealPress, true);");
  });

  it('shows the cards face up with reduced motion, with no turn at all', () => {
    expect(SOURCE).toContain('const dealing = (tarot || dressed) && wantsMotion();');
  });
});

/**
 * **A click chooses, and the take button takes** (Quiet Table, build stage 2:
 * the great person sheet, with Take at the bottom right).
 */
describe('choosing and taking', () => {
  const SOURCE = Object.values(
    import.meta.glob('../../src/ui/offerCard.ts', { eager: true, query: '?raw', import: 'default' }) as Record<
      string,
      string
    >,
  )[0] as string;

  it('names the chosen card on the take button', () => {
    expect(takeLabel(undefined, 'The Town Watch')).toBe('Take The Town Watch');
    expect(takeLabel('Swear', 'The Imperium')).toBe('Swear The Imperium');
    expect(OFFER_WORDS.waits).toBe('The offer waits. Nothing is spent.');
    for (const words of [OFFER_WORDS.waits, OFFER_WORDS.viewMap, OFFER_WORDS.viewMapTitle, OFFER_WORDS.take]) {
      expect(words).not.toMatch(/\d|—/);
    }
  });

  it('chooses on a click and a number key, and takes on Enter and the take button', () => {
    expect(SOURCE).toContain("button.addEventListener('click', () => chooseCard(index));");
    expect(SOURCE).toContain('chooseCard(digit - 1);');
    expect(SOURCE).toContain('take(Number(card.dataset.index));');
    expect(SOURCE).toContain("takeButton.addEventListener('click', () => take(chosen));");
    // The first card is chosen when the sheet opens, as the board draws it.
    expect(SOURCE).toContain('chooseCard(0);');
    // And a second press of Take while the figure lands takes nothing.
    expect(SOURCE).toContain('if (choose === null) return;');
  });

  it('puts the sheet away from the ×, which is View map and never a close', () => {
    expect(SOURCE).toContain("look.className = 'statecraft-close offer-look';");
    expect(SOURCE).toContain('look.setAttribute(\'aria-label\', OFFER_WORDS.viewMap);');
    expect(SOURCE).toContain('viewMap();');
  });
});
