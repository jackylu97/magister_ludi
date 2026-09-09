/**
 * The spread of projections `projection.test.ts` sweeps.
 *
 * Sixty projections — five squashes by four base sizes by three paddings — is
 * the whole point of the file: the projection is arithmetic and the interesting
 * failures are at the degenerate flat view and at the large base size, not in
 * the middle. Every claim costs one call per projection.
 *
 * There used to be a sibling, `projection.slow.test.ts`, carrying the round trip
 * through a hex's *interior* — sixteen offsets on each of sixty-four cells on
 * each of the sixty. It was **retired** on 2026-09-09 (the user, the test-speed
 * pass): the centre round trip kept here is the reading that fails first when
 * the transform breaks, so the sixty thousand assertions bought a second
 * warning rather than a first one. `docs/audit/test-suite-speed.md` records it.
 *
 * The spread stays in a plain module because importing a `.test.ts` from a
 * `.test.ts` would re-register its tests.
 */
import { createProjection } from '../../src/render/projection';

/** A spread of squash values, including the degenerate flat-view case. */
export const SQUASHES = [1, 0.85, 0.58, 0.42, 0.25];
export const BASE_SIZES = [8, 22, 40, 69.28];
export const PADS = [0, 17, 120.5];

export function projections(): ReturnType<typeof createProjection>[] {
  const result = [];
  for (const squash of SQUASHES) {
    for (const baseSize of BASE_SIZES) {
      for (const padTop of PADS) {
        result.push(createProjection(baseSize, squash, padTop, 5, 10));
      }
    }
  }
  return result;
}
