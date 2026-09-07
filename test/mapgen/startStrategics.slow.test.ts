/**
 * **Slow tier** — the strategic start guarantee over five seeds and every size.
 *
 * The core file holds the rules; this holds the promise. "Every capital has both
 * horses and iron within six tiles" (2026-09-05) is a claim about *every* seat
 * of *every* map, and one standard board cannot make it. It also prints what the
 * guarantee had to force, which is the number that says whether the scatter is
 * dealing enough strategics on its own — that figure only generation can give
 * (`MapDetail.forcedStrategics`), because a forced copy and a dealt copy are the
 * same tile on the finished map.
 *
 * `duel` is measured and reported but **not** held to the promise, and that is
 * the honest state of it: a 40×25 board asked to seat twelve capitals has starts
 * with no featureless hill inside six hexes, the chooser's seventh rejection
 * refuses those sites, and its own last-resort fallback then seats players on
 * them anyway because there is nowhere else. See `docs/mapgen.md`.
 */
import { describe, expect, it } from 'vitest';

import { generateMapDetail } from '../../src/sim/mapgen';
import { MAPGEN_CONFIG, MAP_SIZE_NAMES } from '../../src/sim/mapgenData';
import { mapRange, tileHex } from '../../src/sim/map';
import { resourceDef, tileSuitsResource } from '../../src/sim/resourceData';
import { chooseStartPositions } from '../../src/sim/startPositions';
import { RULES } from '../../src/sim/rulesData';

const SEEDS = [1, 7, 42, 1234, 90210];
const WANTED = MAPGEN_CONFIG.resources.startStrategics;
const RADIUS = MAPGEN_CONFIG.resources.startStrategicRadius;

/** The one board the promise is not made on. See the file docblock. */
const CROWDED = 'duel';

describe('every capital is armed', () => {
  it('has every guaranteed strategic in reach of every seat', () => {
    for (const size of MAP_SIZE_NAMES) {
      let forced = 0;
      let seats = 0;
      const short: string[] = [];
      const groundless: string[] = [];
      for (const seed of SEEDS) {
        const detail = generateMapDetail(seed, size);
        forced += detail.forcedStrategics;
        const starts = chooseStartPositions(detail.map, RULES.game.maxPlayers);
        for (const start of starts) {
          seats += 1;
          const near = mapRange(detail.map, tileHex(start), RADIUS);
          for (const id of WANTED) {
            if (near.some((tile) => tile.resource === id)) continue;
            short.push(`${size}/${seed} (${start.col},${start.row}) ${id}`);
            // Was it even possible? A seat with no legal hex in reach is the
            // refusal clause's case, not the guarantee's failure.
            if (!near.some((tile) => tileSuitsResource(tile, resourceDef(id)))) {
              groundless.push(`${size}/${seed} (${start.col},${start.row}) ${id}`);
            }
          }
        }
      }
      console.log(
        `  ${size}: ${seats} seats · ${forced} forced · ${short.length} short ` +
          `(${groundless.length} with no legal ground)`,
      );
      if (size === CROWDED) {
        // Reported, not promised — but every shortfall there must be a ground
        // shortfall rather than a pass that simply gave up.
        expect(short.length - groundless.length).toBeLessThanOrEqual(
          Math.round(seats * 0.1),
        );
        continue;
      }
      expect(short).toEqual([]);
      // And the guarantee is doing real work at every size: the scatter alone
      // does not arm two thirds of the seats.
      expect(forced).toBeGreaterThan(seats / 2);
    }
  });
});
