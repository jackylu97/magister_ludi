/**
 * The woodland pass: the grain of the forest deal and the clearings punched
 * through it (`mapgen.ts` passes 1b and 1c, ruled 2026-09-06).
 *
 * The three claims that make this pass safe to have added at all, and every one
 * is a *comparison of two generations* rather than a fixture:
 *
 *   1. **Nothing above it moved.** Turning the whole block off leaves terrain,
 *      hills, elevation, moisture, rivers, jungle, oases and floodplains
 *      bit-identical — only forest hexes differ. That is the determinism
 *      discipline the pass was designed around: its dice come out of streams
 *      keyed on the seed, never out of the map's `rng`.
 *   2. **The grain moves trees, never their number.** Both fields are read as
 *      percentiles inside the eligible set and the count taken is
 *      `share × candidates` either way, so the forest tile count at `grain: 0`
 *      and at any other grain is *exactly* equal with the clearings off.
 *   3. **A clearing is the inside of a wood.** At certainty, no forest hex on
 *      the finished map has all six neighbours wooded.
 *
 * The sweeps — the patch statistics over five seeds, and the clearing rate
 * against the sheet's own number — are `forests.slow.test.ts`.
 */
import { describe, expect, it } from 'vitest';

import { type MapgenOverrides, generateMap } from '../../src/sim/mapgen';
import { MAPGEN_CONFIG } from '../../src/sim/mapgenData';
import { tileIndex } from '../../src/sim/map';
import { isEnclosed, woodStats, woodedMask } from './forestHelpers';
import { mapFor } from './fixtures';

/** The block off: the deal is the moisture ranking alone and nothing is cleared. */
const OFF: MapgenOverrides = { woodland: { grain: 0, clearingChance: 0 } };

/** The grain on, the clearings off — for isolating one half from the other. */
const GRAIN_ONLY: MapgenOverrides = { woodland: { clearingChance: 0 } };

describe('the woodland pass leaves every earlier pass alone', () => {
  // Two full generations of the same seed, so `generateMap` rather than the
  // memo table: the subject *is* the difference between two sheets.
  const before = generateMap(11, 'standard', OFF);
  const after = generateMap(11, 'standard');

  it('moves no terrain, no hill, no field and no river', () => {
    expect(after.tiles).toHaveLength(before.tiles.length);
    for (let i = 0; i < before.tiles.length; i++) {
      const was = before.tiles[i]!;
      const now = after.tiles[i]!;
      const where = `(${was.col},${was.row})`;
      expect(`${where} ${now.terrain}`).toBe(`${where} ${was.terrain}`);
      expect(`${where} hills ${now.hills}`).toBe(`${where} hills ${was.hills}`);
      expect(`${where} elevation ${now.elevation}`).toBe(`${where} elevation ${was.elevation}`);
      expect(`${where} moisture ${now.moisture}`).toBe(`${where} moisture ${was.moisture}`);
      expect(`${where} rivers ${now.riverEdges}`).toBe(`${where} rivers ${was.riverEdges}`);
      expect(`${where} fresh ${now.freshwater ?? false}`).toBe(
        `${where} fresh ${was.freshwater ?? false}`,
      );
    }
  });

  it('touches no feature but the forest', () => {
    let differing = 0;
    for (let i = 0; i < before.tiles.length; i++) {
      const was = before.tiles[i]!.feature;
      const now = after.tiles[i]!.feature;
      if (was === now) continue;
      differing += 1;
      // Every difference is a hex that gained or lost trees. A jungle, an oasis
      // or a floodplain that moved would mean the pass had reached upstream.
      expect(`${was} -> ${now}`).toBe(
        was === 'forest' ? 'forest -> none' : `${was} -> forest`,
      );
      expect(was === 'forest' || was === 'none').toBe(true);
    }
    // And it does *something* — a test that passes because nothing changed
    // would pass with the pass deleted.
    expect(differing).toBeGreaterThan(50);
  });
});

describe('the grain', () => {
  it('deals exactly as many forest hexes at every grain', () => {
    // The claim the deal is built on: both fields are percentiles inside the
    // candidate set, so `Math.round(candidates.length * forestShare)` is the
    // same number at every weight and only the ordering changes.
    const off = woodStats(generateMap(11, 'standard', OFF)).forest;
    for (const grain of [0.25, 0.55, 0.9, 1]) {
      const map = generateMap(11, 'standard', { woodland: { grain, clearingChance: 0 } });
      expect(`grain ${grain}: ${woodStats(map).forest}`).toBe(`grain ${grain}: ${off}`);
    }
  });

  it('breaks the same trees into more woods', () => {
    const flat = woodStats(generateMap(11, 'standard', OFF));
    const grained = woodStats(generateMap(11, 'standard', GRAIN_ONLY));
    expect(grained.patches).toBeGreaterThan(flat.patches);
    expect(grained.meanPatch).toBeLessThan(flat.meanPatch);
    expect(grained.largestPatch).toBeLessThan(flat.largestPatch);
  });

  it('keeps the wood in wet country', () => {
    // The grain is a scatter *inside* the deal, not a replacement for it: the
    // moisture field still has the larger say at the shipped weight, so the
    // wooded hexes are still wetter than the eligible ground they stand in.
    const map = mapFor(11, 'standard');
    let wooded = 0;
    let woodedMoisture = 0;
    let dry = 0;
    let dryMoisture = 0;
    for (const tile of map.tiles) {
      if (tile.terrain !== 'grassland' && tile.terrain !== 'plains') continue;
      if (tile.feature === 'forest') {
        wooded += 1;
        woodedMoisture += tile.moisture;
      } else if (tile.feature === 'none') {
        dry += 1;
        dryMoisture += tile.moisture;
      }
    }
    expect(wooded).toBeGreaterThan(0);
    expect(woodedMoisture / wooded).toBeGreaterThan(dryMoisture / Math.max(1, dry));
  });
});

describe('the clearings', () => {
  it('leaves no wood with an inside when every enclosed hex is opened', () => {
    // Enclosure is read off the woodland as dealt, so a hex enclosed on the
    // finished map was enclosed in the snapshot too and was therefore offered
    // — at certainty, the set has to come out empty.
    const map = generateMap(11, 'standard', {
      woodland: { clearingChance: 1, clearingMinPatch: 1 },
    });
    const wooded = woodedMask(map);
    const inside: string[] = [];
    for (let i = 0; i < map.tiles.length; i++) {
      if (!wooded[i] || !isEnclosed(map, i, wooded)) continue;
      inside.push(`(${map.tiles[i]!.col},${map.tiles[i]!.row})`);
    }
    expect(inside).toEqual([]);
  });

  it('spares a copse below the minimum patch', () => {
    // Certainty on the rate, and a floor above the largest wood on the map:
    // nothing may be opened, so the forest is the grained deal untouched.
    const grained = woodStats(generateMap(11, 'standard', GRAIN_ONLY));
    const spared = woodStats(
      generateMap(11, 'standard', {
        woodland: { clearingChance: 1, clearingMinPatch: grained.largestPatch + 1 },
      }),
    );
    expect(spared.forest).toBe(grained.forest);
    expect(spared.patchSizes).toEqual(grained.patchSizes);
  });

  it('opens hexes inside the woods and nowhere else', () => {
    const grained = generateMap(11, 'standard', GRAIN_ONLY);
    const cleared = generateMap(11, 'standard');
    const wooded = woodedMask(grained);
    let opened = 0;
    for (let i = 0; i < grained.tiles.length; i++) {
      if (grained.tiles[i]!.feature === cleared.tiles[i]!.feature) continue;
      // Only ever forest → none, and only ever a hex with a full wooded ring.
      expect(grained.tiles[i]!.feature).toBe('forest');
      expect(cleared.tiles[i]!.feature).toBe('none');
      expect(isEnclosed(grained, i, wooded)).toBe(true);
      opened += 1;
    }
    expect(opened).toBeGreaterThan(0);
  });
});

describe('the sheet', () => {
  it('ships the woodland block the pass reads', () => {
    // The knobs exist in `data/mapgen.json` under the names the doc and the
    // page use. A pass whose block went missing would silently read undefined.
    const wood = MAPGEN_CONFIG.woodland;
    expect(wood.grain).toBeGreaterThan(0);
    expect(wood.grain).toBeLessThanOrEqual(1);
    expect(wood.clearingChance).toBeGreaterThan(0);
    expect(wood.clearingChance).toBeLessThanOrEqual(1);
    expect(wood.clearingMinPatch).toBeGreaterThanOrEqual(1);
    expect(MAPGEN_CONFIG.noise.woodlandGrain.cycleTiles).toBeGreaterThan(0);
  });

  it('regenerates the same woods from the same seed', () => {
    const first = generateMap(23, 'duel');
    const second = generateMap(23, 'duel');
    for (let i = 0; i < first.tiles.length; i++) {
      const tile = first.tiles[i]!;
      expect(`${tileIndex(first, tile.col, tile.row)} ${second.tiles[i]!.feature}`).toBe(
        `${tileIndex(first, tile.col, tile.row)} ${tile.feature}`,
      );
    }
  });
});
