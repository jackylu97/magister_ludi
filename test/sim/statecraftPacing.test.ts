/**
 * The culture ladder's **arithmetic**, which is a pure function and belongs in
 * the after-every-change gate.
 *
 * The measurement Entry XV calls load-bearing — *how often does a draft land* —
 * is a pacing number rather than a rule: it is taken over eighty turns of a
 * scripted empire and lives in `statecraftPacing.slow.test.ts`. What is here is
 * the shape of the curve that pacing rests on, which one call answers.
 */

import { describe, expect, it } from 'vitest';

import { draftCost } from '../../src/sim/statecraft';

describe('the culture ladder', () => {
  it('escalates by draft count and by nothing else', () => {
    // Entry I's third commitment, restated by Entry XV: authority is the only
    // lawful width tax. The curve takes one argument, so a city count cannot
    // reach it — this asserts the shape rather than the promise, because the
    // promise is enforced by the signature.
    expect(draftCost(0)).toBeLessThan(draftCost(1));
    expect(draftCost(1)).toBeLessThan(draftCost(2));
    // Superlinear: the gap between consecutive drafts widens.
    expect(draftCost(10) - draftCost(9)).toBeGreaterThan(draftCost(1) - draftCost(0));
    // Whole numbers all the way down — a pool of integers wants an integer
    // threshold. See `draftCost`.
    for (let n = 0; n < 20; n++) expect(Number.isInteger(draftCost(n))).toBe(true);
  });
});
