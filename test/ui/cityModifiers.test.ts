/**
 * The city panel's modifier list, and the one thing about it that was wrong: a
 * stage heading that said its only line a second time.
 *
 * `stageRows` is the panel's layout decision extracted from its DOM (this suite
 * has no jsdom), and it is worth holding still because the failure is invisible
 * to every other kind of test — the numbers were right, the fold was right, the
 * player just read the same fact twice in two different sets of glyphs.
 *
 * The second block is the reason the collapse is *safe*: every percentage
 * `cityStageSums` folds has a line of its own in this list, so "one source" and
 * "the heading is that source" are the same statement. If a future modifier
 * joined the fold without joining the list, that would stop being true — and
 * `cityYieldPercents` plus the hammers is asserted here to still be the whole of
 * it.
 */

import { describe, expect, it } from 'vitest';

import { cityStageSums, cityYieldPercents, foundCityAt, productionModifiers } from '../../src/sim/cities';
import { createMap, getTileAt } from '../../src/sim/map';
import { meterEffects } from '../../src/sim/meters';
import { CITY_YIELD_KEYS } from '../../src/sim/resourceData';
import { type GameState, newGame } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';
import { computeFreshwater } from '../../src/sim/water';
import { stageRows } from '../../src/ui/cityPanel';

type Source = readonly [string, string, boolean];

const HAPPINESS: Source = ['Happiness +8', '🔬🎭 +10%', false];
const AUTHORITY: Source = ['Authority −6', '⚙🔬🎭 −10%', true];

describe('a stage prints its heading and its parts, once each', () => {
  it('collapses a stage that is the fold of exactly one line', () => {
    // The reported bug, in the shape the panel saw it: the empire stage's summed
    // figures over a single meter line saying the same thing.
    const rows = stageRows('Empire', '🔬 +10%  🎭 +10%', [HAPPINESS]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.label).toBe('Empire · Happiness +8');
    // The line's own figure, which groups the yields it multiplies rather than
    // listing them apart — same fact, one row.
    expect(rows[0]!.figures).toBe('🔬🎭 +10%');
    expect(rows[0]!.stage).toBe(true);
  });

  it('keeps a collapsed stage in the alarm ink when its one line is a malus', () => {
    const rows = stageRows('Empire', '⚙ −10%', [AUTHORITY]);
    expect(rows[0]!.bad).toBe(true);
  });

  it('keeps the heading the moment a second source joins it', () => {
    const rows = stageRows('Empire', '🔬 +10%', [HAPPINESS, AUTHORITY]);
    expect(rows.map((row) => row.stage)).toEqual([true, false, false]);
    expect(rows[0]!.label).toBe('Empire');
    expect(rows[0]!.figures).toBe('🔬 +10%');
    expect(rows.slice(1).map((row) => row.label)).toEqual(['Happiness +8', 'Authority −6']);
  });

  it('says so out loud when two sources cancel', () => {
    // The whole point of summing rather than compounding: a +10% and a −10% have
    // to read as nothing, and a player who can see two modifiers must be able to
    // find where they went.
    const rows = stageRows('Empire', null, [HAPPINESS, AUTHORITY]);
    expect(rows[0]!.figures).toBe('no net change');
    expect(rows).toHaveLength(3);
  });

  it('prints nothing for a stage nothing joined', () => {
    expect(stageRows('City bonuses', null, [])).toEqual([]);
  });
});

describe('every percentage the stages fold has a line of its own', () => {
  function empire(): GameState {
    const state = newGame({
      seed: 11,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: false },
      ],
    });
    state.map = createMap({ width: 12, height: 8, terrain: 'grassland' });
    resetVisibility(state);
    state.units = [];
    state.cities = [];
    state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
    computeFreshwater(state.map);
    foundCityAt(state, 0, getTileAt(state.map, 5, 4)!);
    return state;
  }

  it('folds exactly the meters, the luxuries and the hammers — nothing unlisted', () => {
    const state = empire();
    const city = state.cities[0]!;
    const front = city.queue[0];
    const sums = cityStageSums(state, city, front);
    const percents = cityYieldPercents(state, city);
    const hammers = productionModifiers(state, city, front);

    // Rebuilt from the two lists the panel prints from. If a third source ever
    // joins `cityStageSums` without joining one of these, this diverges — and
    // the collapse above would start hiding a modifier rather than a repetition.
    for (const key of CITY_YIELD_KEYS) {
      const city_ = percents
        .filter((line) => line.yield === key && line.stage === 'city')
        .reduce((sum, line) => sum + line.percent, 0);
      const empire_ = percents
        .filter((line) => line.yield === key && line.stage === 'empire')
        .reduce((sum, line) => sum + line.percent, 0);
      const behind =
        key === 'production' ? hammers.reduce((sum, line) => sum + line.percent, 0) : 0;
      expect(sums[key].city).toBe(city_ + behind);
      expect(sums[key].empire).toBe(empire_);
    }
  });

  it('gives the happiness tier one meter line and one stage fold, not two lines', () => {
    const state = empire();
    // A fresh capital is content, so the empire stage holds exactly one effect.
    const effects = meterEffects(state, 0).filter(
      (effect) => !effect.growth && effect.yields.length > 0,
    );
    expect(effects).toHaveLength(1);
    const rows = stageRows('Empire', '🔬 +10%  🎭 +10%', [
      [`Happiness +${effects[0]!.value}`, '🔬🎭 +10%', false],
    ]);
    expect(rows).toHaveLength(1);
  });
});
