/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — the generator's
 * range, asserted a draw at a time.
 *
 * A scale fixture rather than a slow algorithm: twenty thousand draws with two
 * assertions on each is forty thousand `expect` calls, and the cost is the
 * assertions rather than the arithmetic. It is the shape that puts it here —
 * the next property somebody wants to hold over a hundred thousand samples
 * belongs beside it, not in the gate that runs after every change.
 *
 * `rng.test.ts` keeps every claim about the stream itself: that a seed
 * reproduces, that two seeds diverge, that a clone does not couple, that
 * `nextInt` hits both ends of its range, that `shuffle` is a permutation, and
 * that `hashSeed` is stable — including the ten-bucket uniformity reading,
 * which draws a hundred thousand floats and asserts twenty times.
 */
import { describe, expect, it } from 'vitest';
import { makeRng, nextFloat } from '../../src/sim/rng';

describe('rng', () => {
  it('keeps nextFloat in [0, 1)', () => {
    const rng = makeRng(4242);
    for (let i = 0; i < 20000; i++) {
      const v = nextFloat(rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

});
