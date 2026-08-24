/**
 * Where a hover card lands, which is the part of a hover card that can be wrong
 * for weeks before anybody notices.
 *
 * `placeCard` was split out of the card itself so that this could be asked at
 * all: the card is DOM and this suite has no jsdom, but *beside the anchor, and
 * never off the screen* is pure arithmetic over four rectangles. The failure it
 * guards against is not a wobble — it is a card three hundred pixels below the
 * fold, which for a surface that only exists while the pointer is still is a
 * card that never appeared.
 *
 * `placeCardBelow` is the same question for the top bar's strip, where "beside"
 * is the wrong answer: the neighbours of a chip in a horizontal row are the very
 * things it is being compared against, so its card drops underneath instead.
 */

import { describe, expect, it } from 'vitest';
import { placeCard, placeCardBelow } from '../../src/ui/infoCard';

const VIEW = { width: 1200, height: 800 };
const CARD = { width: 260, height: 180 };
const GAP = 10;

/** An anchor of a given size at a given corner, in viewport coordinates. */
function anchor(left: number, top: number, width = 160, height = 24) {
  return { left, top, right: left + width, bottom: top + height };
}

describe('placeCard', () => {
  it('sits to the right of the anchor, its top lined up with the anchor\'s', () => {
    const at = placeCard(anchor(200, 300), CARD, VIEW, GAP);
    expect(at.left).toBe(200 + 160 + GAP);
    expect(at.top).toBe(300);
  });

  it('flips to the left when there is no room to the right', () => {
    // A build button hard against the right edge — which is where the city
    // panel puts every one of them.
    const box = anchor(1000, 300);
    const at = placeCard(box, CARD, VIEW, GAP);
    expect(at.left).toBe(box.left - GAP - CARD.width);
    expect(at.left + CARD.width).toBeLessThan(box.left);
  });

  it('keeps its side while the pointer walks down a column of buttons', () => {
    // The side is chosen from the anchor's horizontal position alone, so a
    // card does not flap from side to side as the pointer moves vertically.
    const sides = [100, 240, 380, 520].map((top) => placeCard(anchor(1000, top), CARD, VIEW, GAP).left);
    expect(new Set(sides).size).toBe(1);
  });

  it('does not flip early: the fit test includes the card\'s own margin', () => {
    // Exactly enough room on the right, to the pixel. Taking it must not then
    // be undone by the viewport clamp — that would be two rules disagreeing.
    const box = anchor(VIEW.width - GAP - CARD.width - GAP - 160, 300);
    const at = placeCard(box, CARD, VIEW, GAP);
    expect(at.left).toBe(box.right + GAP);
    expect(at.left + CARD.width + GAP).toBe(VIEW.width);
  });

  it('never lets the card fall below the fold', () => {
    const at = placeCard(anchor(200, 780), CARD, VIEW, GAP);
    expect(at.top).toBe(VIEW.height - CARD.height - GAP);
    expect(at.top + CARD.height).toBeLessThanOrEqual(VIEW.height);
  });

  it('never lets the card leave the top or the left edge', () => {
    const at = placeCard(anchor(-400, -50), CARD, VIEW, GAP);
    expect(at.top).toBe(GAP);
    expect(at.left).toBeGreaterThanOrEqual(GAP);
  });

  it('pins a card larger than the window to the top-left rather than off it', () => {
    // The readable failure: a card is read downwards and rightwards, so what
    // spills is the end of it. Clamping to the far edge instead would push the
    // *beginning* off the screen, which is the unreadable one.
    const huge = { width: 2000, height: 2000 };
    const at = placeCard(anchor(600, 400), huge, VIEW, GAP);
    expect(at).toEqual({ left: GAP, top: GAP });
  });

  it('never overlaps the anchor it is describing', () => {
    // Beside, never over: the anchor is the thing being asked about, and a card
    // that covered it would answer a question the player can no longer see.
    for (const left of [0, 150, 400, 700, 900, 1150]) {
      const box = anchor(left, 200);
      const at = placeCard(box, CARD, VIEW, GAP);
      const clear = at.left >= box.right || at.left + CARD.width <= box.left;
      expect(clear).toBe(true);
    }
  });
});

describe('placeCardBelow', () => {
  it('drops under the anchor with their left edges lined up', () => {
    const box = anchor(200, 8);
    const at = placeCardBelow(box, CARD, VIEW, GAP);
    expect(at.left).toBe(box.left);
    expect(at.top).toBe(box.bottom + GAP);
  });

  it('never lets the card leave the right edge', () => {
    // The last chip in the strip, hard against a narrow window.
    const at = placeCardBelow(anchor(1150, 8), CARD, { width: 1200, height: 800 }, GAP);
    expect(at.left).toBe(1200 - CARD.width - GAP);
    expect(at.left + CARD.width).toBeLessThanOrEqual(1200 - GAP);
  });

  it('never lets the card fall below the fold', () => {
    const at = placeCardBelow(anchor(200, 700), CARD, VIEW, GAP);
    expect(at.top + CARD.height).toBeLessThanOrEqual(VIEW.height - GAP);
  });

  it('pins a card larger than the window to the top-left rather than off it', () => {
    const huge = { width: 2000, height: 2000 };
    const at = placeCardBelow(anchor(200, 8), huge, VIEW, GAP);
    expect(at.left).toBe(GAP);
    expect(at.top).toBe(GAP);
  });

  it('never overlaps the anchor it is describing', () => {
    const box = anchor(200, 8);
    const at = placeCardBelow(box, CARD, VIEW, GAP);
    expect(at.top).toBeGreaterThanOrEqual(box.bottom);
  });
});
