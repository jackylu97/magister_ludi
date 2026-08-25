/**
 * The hover cards' grouping, which is the one part of them a suite can hold
 * still: the cards themselves are DOM and this suite has no jsdom, but *the same
 * lines, partitioned, folding to the same total* is arithmetic over a list.
 *
 * What it guards is rule 5 at the surface. A meter is the fold of its ledger and
 * there is exactly one implementation of that fold (`foldMeter`); a card that
 * grouped lines by rewriting them, dropped one it had no home for, or summed a
 * subtotal from anything other than the lines printed under it would be a second
 * implementation — the kind that agrees with the chip beside it for a hundred
 * turns and then does not.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt } from '../../src/sim/map';
import {
  type MeterContribution,
  explainAuthority,
  explainHappiness,
  foldMeter,
  meterStanding,
} from '../../src/sim/meters';
import { type GameState, newGame } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';
import { computeFreshwater } from '../../src/sim/water';
import { meterGroups } from '../../src/ui/meterBreakdown';

/** A flat two-player world with nothing on it but the cities a test founds. */
function flatState(): GameState {
  const state = newGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: false },
    ],
  });
  state.map = createMap({ width: 14, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  computeFreshwater(state.map);
  return state;
}

/** An empire of three towns, one of them the capital and one of them crowded. */
function empire(): GameState {
  const state = flatState();
  for (const [col, row] of [
    [4, 4],
    [8, 4],
    [11, 7],
  ] as const) {
    foundCityAt(state, 0, getTileAt(state.map, col, row)!);
  }
  // A town big enough to pay the crowding term, which is the one case where a
  // single city owns two lines of the happiness ledger.
  state.cities[1]!.population = 11;
  return state;
}

/** Every line of every group, in the order a card would print them. */
function lines(groups: ReturnType<typeof meterGroups>): MeterContribution[] {
  return groups.flatMap((group) => group.lines);
}

describe('a meter card groups its ledger without changing it', () => {
  it('folds to the same total the chip shows, on both meters', () => {
    const state = empire();
    for (const [meter, entries] of [
      ['happiness', explainHappiness(state, 0)],
      ['authority', explainAuthority(state, 0)],
    ] as const) {
      const groups = meterGroups(meter, entries);
      const subtotals = groups.reduce((sum, group) => sum + group.total, 0);
      expect(subtotals).toBeCloseTo(foldMeter(entries), 10);
      expect(subtotals).toBeCloseTo(meterStanding(entries).total, 10);
      // And each group's own figure is the sum of the lines printed under it,
      // not a figure computed beside them.
      for (const group of groups) {
        expect(group.lines.reduce((sum, line) => sum + line.value, 0)).toBeCloseTo(group.total, 10);
      }
    }
  });

  it('keeps every line exactly once, in the order the rules produced it', () => {
    const state = empire();
    const entries = explainHappiness(state, 0);
    const kept = lines(meterGroups('happiness', entries));
    expect(kept).toHaveLength(entries.length);
    // A partition: same lines, same objects, and each in exactly one group.
    expect(new Set(kept).size).toBe(entries.length);
    for (const entry of entries) expect(kept).toContain(entry);
    // Supply before demand, which is the order the sentence is read in and the
    // order the ledger itself comes in.
    const gains = entries.filter((entry) => entry.part === 'gain');
    expect(kept.slice(0, gains.length)).toEqual(gains);
  });

  it('names each meter\'s two sides in that meter\'s own words', () => {
    const state = empire();
    expect(meterGroups('happiness', explainHappiness(state, 0)).map((g) => g.label)).toEqual([
      'Supply',
      'Demand',
    ]);
    expect(meterGroups('authority', explainAuthority(state, 0)).map((g) => g.label)).toEqual([
      'Capacity',
      'Used',
    ]);
  });

  it('keeps the capital\'s free line, which is worth nothing and says the most', () => {
    const state = empire();
    const groups = meterGroups('authority', explainAuthority(state, 0));
    const used = groups.find((group) => group.label === 'Used')!;
    // Three towns, three lines — the capital's among them at zero. A grouping
    // that dropped worthless lines would drop the one a player looks for.
    expect(used.lines).toHaveLength(3);
    expect(used.lines.some((line) => line.value === 0)).toBe(true);
  });

  it('prints no side an empire has nothing to say about', () => {
    // Turn one: no cities, so no palace, no luxuries and no demand.
    const state = flatState();
    expect(meterGroups('happiness', explainHappiness(state, 0))).toEqual([]);
    expect(meterGroups('authority', explainAuthority(state, 0))).toEqual([]);
  });
});
