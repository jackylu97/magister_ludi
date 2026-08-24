/**
 * What the two hover cards say about a hex.
 *
 * `describeTile` is the whole of the terrain/feature line on both surfaces — the
 * game's info panel and the mapgen inspection page — and it is pure, so it can
 * be asserted here without a DOM. What is worth asserting is exactly the thing
 * that would break silently: the card reads the feature **generically**, out of
 * `terrain.json`, so a feature added to the table has to arrive named and with
 * its yields already in the figure rather than as a blank row or an `undefined`.
 * The two arid features are the first ones to test that claim since jungle.
 */

import { describe, expect, it } from 'vitest';

import { tileYieldOf } from '../../src/sim/cities';
import type { Tile } from '../../src/sim/map';
import { FEATURE_IDS, type FeatureId } from '../../src/sim/terrainData';
import { describeTile } from '../../src/ui/tileReadout';

function tile(overrides: Partial<Tile> = {}): Tile {
  return {
    col: 3,
    row: 4,
    terrain: 'desert',
    feature: 'none',
    hills: false,
    elevation: 0.7,
    moisture: 0.2,
    riverEdges: 0,
    freshwater: false,
    ...overrides,
  } as Tile;
}

describe('describeTile', () => {
  it('names every feature in the table, with nothing left blank', () => {
    for (const feature of FEATURE_IDS as FeatureId[]) {
      const described = describeTile(tile({ feature }));
      expect(described.feature, feature).toBeTruthy();
      expect(described.feature, feature).not.toBe('undefined');
    }
  });

  it('reads the oasis and the floodplain as desert wearing a feature', () => {
    const oasis = describeTile(tile({ feature: 'oasis' }));
    expect(oasis.terrain).toBe('Desert');
    expect(oasis.feature).toBe('Oasis');
    expect(oasis.hills).toBe(false);

    const flood = describeTile(tile({ feature: 'floodplain' }));
    expect(flood.terrain).toBe('Desert');
    expect(flood.feature).toBe('Floodplain');
  });

  it('prints the feature yield the card would show, not the bare desert', () => {
    // The other half of the row. Desert pays nothing, so a card that fell back
    // to the terrain would print an em dash on the two hexes in the game that
    // most need a number on them.
    expect(tileYieldOf(tile())).toMatchObject({ food: 0, production: 0 });
    expect(tileYieldOf(tile({ feature: 'oasis' }))).toMatchObject({ food: 3, production: 1 });
    expect(tileYieldOf(tile({ feature: 'floodplain' }))).toMatchObject({ food: 2, production: 0 });
  });
});
