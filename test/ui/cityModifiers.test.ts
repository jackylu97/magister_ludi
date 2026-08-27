/**
 * The city panel's modifier list, and the one thing about it that was wrong: a
 * stage heading that said its own lines a second time.
 *
 * `stageRows` is the panel's layout decision extracted from its DOM (this suite
 * has no jsdom), and it is worth holding still because the failure is invisible
 * to every other kind of test — the numbers were right, the fold was right, the
 * player just read the same fact twice in two different sets of glyphs.
 *
 * The first pass collapsed the *one-source* case and left the rest; the player
 * read the two-source case the same way (2026-08-27) and they were right, so the
 * heading is gone entirely and the sources are the list. What is asserted here is
 * that and its one exception — the **canary**, a stage that folds to a figure
 * with no line to account for it, which is the only shape in which a heading
 * still prints.
 *
 * The second block is the reason dropping the heading is *safe*: every
 * percentage `cityStageSums` folds has a line of its own in this list, so the
 * fold is visibly the sum of what is printed under where it used to be. If a
 * future modifier joined the fold without joining the list, that would stop being
 * true — the canary would fire in the panel, and this block fails here first.
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

describe('a stage prints its parts and never their sum', () => {
  it('drops the heading over a single line', () => {
    // The reported bug in its first shape: the empire stage's summed figures
    // over a single meter line saying the same thing.
    const rows = stageRows('Empire', '🔬 +10%  🎭 +10%', [HAPPINESS]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.label).toBe('Happiness +8');
    // The line's own figure, which groups the yields it multiplies rather than
    // listing them apart — same fact, one row.
    expect(rows[0]!.figures).toBe('🔬🎭 +10%');
    expect(rows[0]!.stage).toBe(false);
  });

  it('drops it over two lines as well — the note that reopened this', () => {
    // "Empire +10% science +10% culture" above "Happiness +6 culture science
    // +10%" is arithmetic the player can do by eye off the rows beneath it.
    const rows = stageRows('Empire', '🔬 +10%', [HAPPINESS, AUTHORITY]);
    expect(rows.map((row) => row.stage)).toEqual([false, false]);
    expect(rows.map((row) => row.label)).toEqual(['Happiness +8', 'Authority −6']);
    // And the word itself is nowhere in what the panel prints.
    expect(rows.some((row) => row.label.includes('Empire'))).toBe(false);
  });

  it('keeps a malus in the alarm ink', () => {
    expect(stageRows('Empire', '⚙ −10%', [AUTHORITY])[0]!.bad).toBe(true);
  });

  it('prints both lines when two sources cancel, and no "no net change"', () => {
    // The whole point of summing rather than compounding: a +10% and a −10% have
    // to read as nothing, and a player who can see two modifiers must be able to
    // find where they went. The two lines are how they find them.
    const rows = stageRows('Empire', null, [HAPPINESS, AUTHORITY]);
    expect(rows).toHaveLength(2);
    expect(rows.some((row) => row.figures === 'no net change')).toBe(false);
  });

  it('prints nothing for a stage nothing joined', () => {
    expect(stageRows('City bonuses', null, [])).toEqual([]);
  });

  it('keeps the canary: a fold with nothing to account for it still prints', () => {
    // Cannot happen today (the block below is what keeps it so), and if it ever
    // does the panel must say a percentage is in force rather than swallow it.
    const rows = stageRows('Empire', '🔬 +10%', []);
    expect(rows).toEqual([{ label: 'Empire', figures: '🔬 +10%', bad: false, stage: true }]);
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

  it('gives the happiness tier one row, not a fold and its reason', () => {
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
    expect(rows[0]!.label).toBe(`Happiness +${effects[0]!.value}`);
  });
});
