/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — the dressing
 * compared instance for instance, on a whole standard board.
 *
 * A scale fixture. What the claim is worth comes entirely from its size: two
 * builds of the same generated map must agree on **every** instance matrix, or a
 * rebuild — founding a city, toggling shadows, panning across the wrap seam —
 * would make the grass jump. A digest over eleven-by-nine hand-laid tiles would
 * pass while a seam-dependent placement drifted on the four thousand hexes a
 * real board has, so the map is generated and the whole thing is flattened and
 * compared.
 *
 * `dressing3d.test.ts` keeps the counts — the draw-call budget, one instanced
 * draw per kind, the shore band, the tints, the contact shading and the paper
 * standees — which are the readings a small board answers exactly as well.
 */
import { describe, expect, it } from 'vitest';

import { BoardGeometry, buildBoard } from '../../src/render3d/board3d';
import { generateMap } from '../../src/sim/mapgen';
import { materials, matrixDigest } from './dressingHelpers';

describe('board dressing', () => {
  it('rebuilds a generated map instance for instance', () => {
    const map = generateMap(4242, 'standard');
    const geometry = new BoardGeometry();
    const library = materials();
    const first = buildBoard(map, geometry, library, false);
    const second = buildBoard(map, geometry, library, false);
    expect(second.drawCalls).toBe(first.drawCalls);
    expect(matrixDigest(second.group)).toEqual(matrixDigest(first.group));
    first.dispose();
    second.dispose();
    geometry.dispose();
  });

});
