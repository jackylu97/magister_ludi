/**
 * **Slow tier** — the woodland pass over a sweep of seeds.
 *
 * `forests.test.ts` holds the rules (what the grain may move, what a clearing
 * is); this holds the *reading*, which is the only way to know whether the
 * 2026-09-06 ruling was actually answered. A patch statistic on one seed is an
 * anecdote — a wet seed and a dry seed disagree by a factor of two on almost
 * everything the woods do — so the claims here are averages over five standard
 * boards, and the bands around them are deliberately wide. This is mapgen, not
 * a scripted empire: what is being pinned is that the *shape* did not drift
 * back, not a number.
 *
 * Both readings are printed, so a run that fails hands over the whole table
 * rather than one number out of band.
 */
import { describe, expect, it } from 'vitest';

import { type MapgenOverrides } from '../../src/sim/mapgen';
// Read-only sweeps, so they come off the directory's memo rather than the
// generator (`fixtures.ts`): nothing here writes to a board it is handed, and
// the same standard seeds are asked for by `startStrategics.slow.test.ts` and
// by the two override sweeps below.
import { mapFor } from './fixtures';
import { MAPGEN_CONFIG } from '../../src/sim/mapgenData';
import { isEnclosed, patchSizeByTile, woodLine, woodStats, woodedMask } from './forestHelpers';

const SEEDS = [1, 7, 42, 1234, 90210];

/**
 * The rate test's own seeds, and there are twice as many for a reason worth
 * saying out loud: the grain does most of the work, so a standard board has
 * only a dozen enclosed hexes left to offer a clearing to. Five boards is
 * fifty-odd draws and a fifty-draw estimate of a 0.4 rate is worth ±0.13 at one
 * sigma — which is the band, not the claim. Ten boards buys the claim back.
 */
const RATE_SEEDS = [1, 7, 42, 1234, 90210, 5, 88, 404, 7777, 31415];

/** The world before the ruling: the moisture ranking alone, nothing cleared. */
const OFF: MapgenOverrides = { woodland: { grain: 0, clearingChance: 0 } };

interface Averages {
  share: number;
  patches: number;
  meanPatch: number;
  largestPatch: number;
  enclosedShare: number;
}

function sweep(label: string, overrides?: MapgenOverrides): Averages {
  const rows: string[] = [];
  const total: Averages = {
    share: 0,
    patches: 0,
    meanPatch: 0,
    largestPatch: 0,
    enclosedShare: 0,
  };
  for (const seed of SEEDS) {
    const stats = woodStats(mapFor(seed, 'standard', overrides));
    rows.push(woodLine(`  seed ${seed}`, stats));
    total.share += stats.share / SEEDS.length;
    total.patches += stats.patches / SEEDS.length;
    total.meanPatch += stats.meanPatch / SEEDS.length;
    total.largestPatch += stats.largestPatch / SEEDS.length;
    total.enclosedShare += stats.enclosedShare / SEEDS.length;
  }
  console.log(
    `${label}\n${rows.join('\n')}\n  average: share ${(total.share * 100).toFixed(1)}% · ` +
      `${total.patches.toFixed(1)} woods · mean ${total.meanPatch.toFixed(1)} · ` +
      `largest ${total.largestPatch.toFixed(1)} · enclosed ${(total.enclosedShare * 100).toFixed(1)}%`,
  );
  return total;
}

describe('the woods, before and after the grain', () => {
  it('halves the mean wood and empties its inside at the same share', () => {
    const before = sweep('before (woodland off)', OFF);
    const after = sweep('after (shipped sheet)');

    // The targets the batch was written to, each stated as the ruling stated
    // it and banded loosely enough that a seed set with one wet outlier in it
    // still passes.
    //
    // 1. The share is what the ruling asked to *keep*: the world should not
    //    have visibly less wood, only differently arranged wood.
    expect(after.share).toBeGreaterThan(before.share * 0.9);
    expect(after.share).toBeLessThan(before.share * 1.1);

    // 2. "Smaller patches of forest across the map": mean roughly halved,
    //    and there are more woods for the same trees.
    expect(after.meanPatch).toBeLessThan(before.meanPatch * 0.65);
    expect(after.patches).toBeGreaterThan(before.patches * 1.5);

    // 3. The largest wood on a board is the "huge patch" itself.
    expect(after.largestPatch).toBeLessThan(before.largestPatch * 0.75);

    // 4. "Some unforested tiles breaking up the large patches" — the share of
    //    the wood that is *inside* a wood, down by far more than half.
    expect(after.enclosedShare).toBeLessThan(before.enclosedShare * 0.5);
  });

  it('holds the same shape at every size', () => {
    // The grain is stated in `cycleTiles`, so a copse is the same size in hexes
    // on a duel board and a giant one and a bigger world simply holds more of
    // them. The reading that would catch a `frequency` slip is the mean patch,
    // which must stay in the same band across the sizes rather than growing
    // with the map.
    for (const size of ['duel', 'standard', 'large']) {
      const stats = woodStats(mapFor(7, size));
      console.log(woodLine(`  ${size}`, stats));
      expect(`${size} mean ${stats.meanPatch.toFixed(1)}`).toBe(
        `${size} mean ${Math.min(Math.max(stats.meanPatch, 2), 12).toFixed(1)}`,
      );
    }
  });
});

describe('the clearing rate', () => {
  it('opens about the sheet share of the hexes it is offered', () => {
    // Counted against the *offer*, not against the forest: the candidates are
    // the enclosed hexes of the grained deal in a wood of at least
    // `clearingMinPatch`, and the rate is how many of those lost their trees.
    const { clearingChance, clearingMinPatch } = MAPGEN_CONFIG.woodland;
    let offered = 0;
    let opened = 0;
    for (const seed of RATE_SEEDS) {
      const grained = mapFor(seed, 'standard', { woodland: { clearingChance: 0 } });
      const shipped = mapFor(seed, 'standard');
      const wooded = woodedMask(grained);
      // A wood below the floor is never offered, so the floor has to be applied
      // here too or the rate is measured against the wrong denominator.
      const sizes = patchSizeByTile(grained, wooded);
      for (let i = 0; i < grained.tiles.length; i++) {
        if (!wooded[i] || !isEnclosed(grained, i, wooded)) continue;
        if (sizes[i]! < clearingMinPatch) continue;
        offered += 1;
        if (shipped.tiles[i]!.feature === 'none') opened += 1;
      }
    }
    const rate = opened / Math.max(1, offered);
    console.log(`  clearings: ${opened} of ${offered} offered — ${(rate * 100).toFixed(1)}%`);
    expect(offered).toBeGreaterThan(60);
    expect(rate).toBeGreaterThan(clearingChance - 0.16);
    expect(rate).toBeLessThan(clearingChance + 0.16);
  });
});
