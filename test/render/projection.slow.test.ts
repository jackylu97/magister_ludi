/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — the round trip
 * through the *interior* of a hex.
 *
 * A scale fixture: sixteen offsets on each of sixty-four cells on each of the
 * sixty projections is some sixty thousand assertions, and the cost is the
 * assertions rather than the arithmetic. It is the shape that puts it here — the
 * claim is that *no* point well inside a hex lands on a neighbour, and a claim
 * of that form is only worth what it sweeps.
 *
 * `projection.test.ts` keeps the same round trip on tile *centres*, which costs
 * one call per projection and is the reading that fails first when the transform
 * is wrong, along with every other claim in the concern.
 */
import { describe, expect, it } from 'vitest';
import { axialToOffset } from '../../src/sim/map';
import { isoToAxial, tileIsoCenter } from '../../src/render/projection';
import { projections } from './projectionHelpers';

describe('projection round-trip', () => {
  it('maps points well inside a hex back to that hex', () => {
    // Sixteen offsets at 40% of the circumradius: comfortably inside the hex
    // for every squash, since the squash only ever shrinks the y extent.
    const offsets: { dx: number; dy: number }[] = [];
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      offsets.push({ dx: Math.cos(angle) * 0.4, dy: Math.sin(angle) * 0.4 });
    }

    for (const projection of projections()) {
      const { baseSize, squash } = projection;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const iso = tileIsoCenter(col, row, projection);
          for (const { dx, dy } of offsets) {
            const hit = axialToOffset(
              isoToAxial(
                iso.x + dx * baseSize,
                iso.y + dy * baseSize * squash,
                projection,
              ),
            );
            expect(hit).toEqual({ col, row });
          }
        }
      }
    }
  });

});
