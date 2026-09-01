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
import { foldCityHappiness, meterGroups } from '../../src/ui/meterBreakdown';

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
  // A town well past the old crowding threshold — kept that size so the day the
  // surcharge returns, this fixture immediately exercises it again.
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

/**
 * The second fold, and the user's ruling behind it (playtest, 2026-08-27):
 * *"funeral games shouldn't appear as a source of happiness, but just be
 * reflected in the overall city values — if X has 10 pop and a funeral games, it
 * should net to −7 in the demand section"*.
 *
 * The same rule-5 discipline as the grouping above, one step further in.
 * `meterGroups` partitions and this one *merges two lines it was handed*; both
 * are forbidden from re-deriving a figure, and the property that proves it is
 * the same one: **the total is untouched**. What moves is which side of the
 * ledger a town's colosseum is counted on.
 */
describe('a town’s own buildings net into that town’s demand line', () => {
  /** The user's example, exactly: ten citizens and a funeral games. */
  function withGames(): GameState {
    const state = flatState();
    foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    const city = state.cities[0]!;
    city.name = 'Uruk';
    city.population = 10;
    city.buildings.push('funeralGames');
    return state;
  }

  /** Every town of a seat, as the fold needs to recognise its lines. */
  function towns(state: GameState, playerId: number) {
    return state.cities.filter((city) => city.ownerId === playerId);
  }

  it('nets the user’s ten citizens and a funeral games to −7', () => {
    const state = withGames();
    const folded = foldCityHappiness(explainHappiness(state, 0), towns(state, 0));
    const line = folded.find((entry) => entry.source.startsWith('Uruk'))!;
    expect(line.value).toBe(-7);
    // And it stays on the side of the ledger the question is asked from: "how
    // much does this town cost me" is a demand question at −7 and at +2 alike.
    expect(line.part).toBe('cost');
  });

  it('names the building in the line, so the discount is not a mystery', () => {
    const state = withGames();
    const folded = foldCityHappiness(explainHappiness(state, 0), towns(state, 0));
    const line = folded.find((entry) => entry.source.startsWith('Uruk'))!;
    expect(line.source).toBe('Uruk (10) · Funeral Games +3');
  });

  it('leaves the empire’s own supply exactly where it was', () => {
    // The palace is not a discount on one town's appetite — it is something the
    // empire holds, and it is lost the way an empire loses things.
    const state = withGames();
    const folded = foldCityHappiness(explainHappiness(state, 0), towns(state, 0));
    expect(folded.some((entry) => entry.source === 'Palace' && entry.part === 'gain')).toBe(true);
  });

  it('takes the building off the supply side altogether', () => {
    const state = withGames();
    const raw = explainHappiness(state, 0);
    expect(raw.some((entry) => entry.source === 'Uruk · Funeral Games')).toBe(true);
    const folded = foldCityHappiness(raw, towns(state, 0));
    expect(folded.some((entry) => entry.source === 'Uruk · Funeral Games')).toBe(false);
  });

  it('changes the total not at all — which is the whole licence for doing it', () => {
    const state = empire();
    state.cities[0]!.buildings.push('funeralGames');
    state.cities[1]!.buildings.push('funeralGames', 'circusMaximus');
    const raw = explainHappiness(state, 0);
    const folded = foldCityHappiness(raw, towns(state, 0));
    expect(foldMeter(folded)).toBe(foldMeter(raw));
    // The sides *do* move, and that is the point: supply loses what demand gains.
    expect(meterStanding(folded).gain).toBeLessThan(meterStanding(raw).gain);
    expect(meterStanding(folded).total).toBe(meterStanding(raw).total);
  });

  it('leaves a crowding line alone, because it is a different fact', () => {
    // The surcharge is disabled by data (Entry LVI), so the sim never emits
    // this line today — the fold's promise is pinned against a hand-made entry,
    // because the promise must survive the day the weight comes back.
    const state = empire();
    const raw = [
      ...explainHappiness(state, 0),
      { source: `${state.cities[1]!.name} crowding`, part: 'cost' as const, value: -3 },
    ];
    const folded = foldCityHappiness(raw, towns(state, 0));
    expect(folded.some((entry) => entry.source.endsWith('crowding'))).toBe(true);
  });

  it('nets each town into its own line when one name is a prefix of another', () => {
    const state = flatState();
    foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    foundCityAt(state, 0, getTileAt(state.map, 8, 4)!);
    state.cities[0]!.name = 'Ur';
    state.cities[1]!.name = 'Uruk';
    state.cities[0]!.population = 4;
    state.cities[1]!.population = 6;
    state.cities[1]!.buildings.push('funeralGames');
    const folded = foldCityHappiness(explainHappiness(state, 0), towns(state, 0));
    expect(folded.find((entry) => entry.source.startsWith('Ur ('))!.value).toBe(-4);
    expect(folded.find((entry) => entry.source.startsWith('Uruk ('))!.source).toBe(
      'Uruk (6) · Funeral Games +3',
    );
  });

  it('passes a ledger it recognises nothing in straight through', () => {
    const state = withGames();
    const raw = explainHappiness(state, 0);
    // No towns declared: nothing to net into, so nothing is netted.
    expect(foldCityHappiness(raw, [])).toEqual(raw);
  });
});

/**
 * And the discipline itself, read off the sources: the fold is applied to the
 * lines `explainHappiness` returned, in one place, and never by asking the
 * simulation a second question. A `buildingHappiness` call at the surface would
 * be a second evaluator that agrees with the meter until the day the rules move.
 */
describe('the fold is a presentation of one evaluator’s list', () => {
  const SOURCES = import.meta.glob(
    ['../../src/ui/topBar.ts', '../../src/ui/meterBreakdown.ts'],
    { eager: true, query: '?raw', import: 'default' },
  ) as Record<string, string>;

  function source(name: string): string {
    const key = Object.keys(SOURCES).find((path) => path.endsWith(name));
    const text = key === undefined ? undefined : SOURCES[key];
    if (typeof text !== 'string' || text.length === 0) throw new Error(`${name} came back empty`);
    return text;
  }

  it('folds the lines the evaluator returned, and asks nothing else', () => {
    const bar = source('topBar.ts');
    expect(bar).toContain('foldCityHappiness(explainHappiness(state, playerId), towns)');
    // The other evaluator for the same fact. Reaching for it here is the second
    // implementation this whole arrangement exists to prevent.
    expect(bar).not.toContain('buildingHappiness');
    expect(source('meterBreakdown.ts')).not.toContain('buildingHappiness(');
  });

  it('applies it in exactly one place, so no reader can disagree', () => {
    const bar = source('topBar.ts');
    // One helper; the chip, the hover card and the click-through ledger all ask
    // it. A raw `explainHappiness(state, ...)` outside it would be a surface
    // printing a different ledger from the one beside it.
    const raw = bar.match(/explainHappiness\(state, /g) ?? [];
    expect(raw).toHaveLength(1);
    expect(bar).toContain('function happinessEntries(');
  });

  it('leaves authority alone — it already prices a city as one net line', () => {
    expect(source('topBar.ts')).not.toContain('foldCityAuthority');
  });
});
