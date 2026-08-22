/**
 * The research figures, which two surfaces quote and neither owns.
 *
 * `researchProgress` was extracted from the star chart's node bar so that the
 * HUD's research card could draw the same bar without a second implementation
 * of "how far along is this" — so what is covered here is exactly the part that
 * would drift: the clamp at both ends, the turn count (including the honest
 * `null` when the empire makes no science), and the one printed line both
 * surfaces put under the bar. The card and the chart themselves are DOM and are
 * not covered — as with every other UI pass, there is no jsdom in this suite.
 */

import { describe, expect, it } from 'vitest';
import { turnsToFill } from '../src/sim/cities';
import { researchProgress } from '../src/ui/researchProgress';

describe('researchProgress', () => {
  it('reports the fraction of the cost the pool has covered', () => {
    const progress = researchProgress(230, 250, 10);
    expect(progress.fraction).toBeCloseTo(0.92, 10);
    expect(progress.banked).toBe(230);
    expect(progress.cost).toBe(250);
  });

  it('counts the turns the remainder takes at the current rate', () => {
    expect(researchProgress(230, 250, 10).turns).toBe(2);
    // Rounded up, never down: a turn that pays 9 of the last 10 beakers is not
    // the turn the technology lands on.
    expect(researchProgress(0, 100, 30).turns).toBe(4);
  });

  it('agrees with the production estimator it delegates to', () => {
    // The same helper the city panel quotes hammers with, so a "3t" on the
    // research card and a "3t" on a build row mean the same arithmetic.
    for (const [pool, cost, rate] of [
      [0, 250, 7],
      [113, 250, 7],
      [249, 250, 1],
    ] as const) {
      expect(researchProgress(pool, cost, rate).turns).toBe(turnsToFill(cost - pool, rate));
    }
  });

  it('says "—" rather than a number when no science is being made', () => {
    const progress = researchProgress(40, 250, 0);
    expect(progress.turns).toBeNull();
    expect(progress.figures).toBe('40/250 🔬 · —');
  });

  it('is already paid when the pool covers the cost, however much it overflows', () => {
    // Banking is real (see `src/sim/tech.ts`): a player who chose nothing for
    // ten turns can start a technology already able to pay for it twice.
    const progress = researchProgress(600, 250, 0);
    expect(progress.fraction).toBe(1);
    // Zero turns even at no rate at all — the beakers are already in hand.
    expect(progress.turns).toBe(0);
    expect(progress.figures).toBe('600/250 🔬 · 0t');
  });

  it('clamps a negative pool to an empty bar rather than an inverted one', () => {
    const progress = researchProgress(-5, 250, 10);
    expect(progress.fraction).toBe(0);
    expect(progress.banked).toBe(0);
  });

  it('treats a costless technology as paid instead of dividing by zero', () => {
    const progress = researchProgress(0, 0, 10);
    expect(progress.fraction).toBe(1);
    expect(progress.turns).toBe(0);
  });

  it('floors the banked pool, because beakers accrue in fractions and labels do not', () => {
    const progress = researchProgress(229.8, 250, 10);
    expect(progress.banked).toBe(229);
    expect(progress.figures).toBe('229/250 🔬 · 3t');
    // The bar is drawn from the unrounded pool: the label is what rounds.
    expect(progress.fraction).toBeCloseTo(0.9192, 4);
  });

  it('prints the line both surfaces put under the bar', () => {
    expect(researchProgress(230, 250, 10).figures).toBe('230/250 🔬 · 2t');
  });
});
