/**
 * Each yield chip's own list (`chipLedgerRows`, batch UX6), and the two things
 * it must never do: disagree with the chip, and print a stage's sum over the
 * percentages it is the sum of.
 *
 * A chip is `foldCity` toward the front of the queue, the figure the end of
 * turn banks. Its list is the town centre, the worked land, the town's other
 * lines, one row per percentage and the unrest gate, so the rows add up to the
 * chip (rule 5). The first block checks that for every voice of every town of a
 * developed empire, built by hand so it stays quick: a capital with buildings,
 * specialists, percentages from buildings, the meters and a treasury in debt, a
 * town in unrest, a puppet and a rival's town. `cityModifiers.slow.test.ts`
 * asks the same of a game the bots have played forward.
 *
 * The second block is the user's ruling of 2026-08-27, kept from the list the
 * chips replaced: a stage prints its parts and never its sum, because the sum is
 * arithmetic a player can do by eye and was the same fact said twice. With it,
 * the canary: a list that cannot account for its chip says so on a last row
 * rather than quietly disagreeing with it.
 *
 * The third block is what makes the percentage rows complete: every percentage
 * `foldCityStages` folds has a line of its own in the lists the rows come from.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import {
  cityYieldPercents,
  foldCity,
  foldCityStages,
  productionModifiers,
  type CityReading,
} from '../../src/sim/yields/town';
import { STAGE_LABEL } from '../../src/sim/yields/stages';
import { createMap, getTileAt } from '../../src/sim/map';
import { meterEffects } from '../../src/sim/meters';
import { readCity, readEmpire } from '../../src/sim/readings';
import { CITY_YIELD_KEYS } from '../../src/sim/resourceData';
import { type City, type GameState, bumpRevision, playerById } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';
import { computeFreshwater } from '../../src/sim/water';
import {
  type ChipLedger,
  UNACCOUNTED_SOURCE,
  chipLedgerRows,
  workedLandLabel,
} from '../../src/ui/cityPanel';
import { signedFigure } from '../../src/ui/figures';
import { braceBody, uiSource } from './sourceHelpers';
import { newGame } from '../sim/newGameHelpers';

/** A blank grassland board for seat 0 and a rival, with nothing on it yet. */
function board(width: number, height: number): GameState {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: false },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  computeFreshwater(state.map);
  return state;
}

/**
 * An empire with something on every step a test can reach by hand: a capital of
 * eight (the palace, eight buildings, two scholars, a warrior at the front so
 * the barracks puts hammers behind it), a town in unrest, a puppet building a
 * monument with a workshop behind it, a rival's town, and a treasury in debt.
 */
function developedEmpire(): GameState {
  const state = board(22, 14);
  const capital = foundCityAt(state, 0, getTileAt(state.map, 5, 5)!);
  capital.population = 8;
  capital.buildings.push(
    'granary',
    'library',
    'monument',
    'forum',
    'barracks',
    'workshop',
    'houseOfWisdom',
    'machuPicchu',
  );
  capital.specialists.scholar = 2;
  capital.queue = [{ kind: 'unit', id: 'warrior' }];

  const restless = foundCityAt(state, 0, getTileAt(state.map, 12, 5)!);
  restless.population = 4;
  restless.buildings.push('library');
  restless.unrest = { target: 12, progress: 3, unguarded: 1 };
  restless.queue = [{ kind: 'building', id: 'monument' }];

  const puppet = foundCityAt(state, 0, getTileAt(state.map, 8, 10)!);
  puppet.population = 3;
  puppet.buildings.push('workshop');
  puppet.puppet = true;
  puppet.queue = [{ kind: 'building', id: 'monument' }];

  const rival = foundCityAt(state, 1, getTileAt(state.map, 18, 10)!);
  rival.population = 5;
  rival.buildings.push('library', 'granary');

  playerById(state, 0)!.gold = -40;
  for (const city of state.cities) refreshCityDerived(state, city);
  bumpRevision(state);
  return state;
}

function fold(ledger: ChipLedger): number {
  let total = 0;
  for (const row of ledger.rows) total += row.amount;
  return total;
}

function ledgerOf(state: GameState, city: City, key: (typeof CITY_YIELD_KEYS)[number]): ChipLedger {
  return chipLedgerRows(state, city, readCity(state, city), key);
}

describe('every chip’s list adds up to the chip, for every town of a developed empire', () => {
  it('folds to the chip, which is the figure the end of turn banks, with nothing unaccounted', () => {
    const state = developedEmpire();
    for (const city of state.cities) {
      const quote: CityReading = readCity(state, city);
      const banked = readEmpire(state, city.ownerId).towns.find((town) => town.city.id === city.id)!;
      for (const key of CITY_YIELD_KEYS) {
        const ledger = chipLedgerRows(state, city, quote, key);
        const where = `${city.name} ${key}`;
        // The chip is `foldCity` toward the front, and that is what is banked.
        expect(ledger.total, where).toBe(foldCity(state, city, [], city.queue[0], quote)[key]);
        expect(ledger.total, where).toBe(banked.total[key]);
        // The rows add up to it, and none of them is the canary.
        expect(Math.abs(fold(ledger) - ledger.total), where).toBeLessThan(1e-9);
        expect(ledger.rows.filter((row) => row.kind === 'unaccounted'), where).toEqual([]);
        // Nothing that adds nothing is printed.
        expect(ledger.rows.filter((row) => row.amount === 0), where).toEqual([]);
      }
    }
  });

  it('starts from the town centre and the worked land, then the rest in the sequence’s order', () => {
    const state = developedEmpire();
    const capital = state.cities[0]!;
    const food = ledgerOf(state, capital, 'food');
    const hexes = capital.workedTiles.length;
    expect(hexes).toBeGreaterThan(0);
    // The centre's line first, then the land folded into one row.
    expect(food.rows[0]!.label).toBe('City centre');
    expect(food.rows.map((row) => row.label)).toContain(workedLandLabel(hexes));
    expect(food.rows.findIndex((row) => row.label === workedLandLabel(hexes))).toBe(1);
    // The granary is one of the other lines, after the land.
    expect(food.rows.map((row) => row.label)).toContain('Granary');
    expect(workedLandLabel(1)).toBe('Worked land (1 hex)');
    expect(workedLandLabel(8)).toBe('Worked land (8 hexes)');
  });

  it('has the percentages, the hammers behind the build and the unrest gate in the lists', () => {
    // Not vacuous: each kind of row the list can print appears somewhere.
    const state = developedEmpire();
    const [capital, restless] = state.cities;
    const science = ledgerOf(state, capital!, 'science');
    expect(science.rows.some((row) => row.kind === 'percent')).toBe(true);
    // The treasury in debt costs a quarter of the thought, as a row of its own.
    const arrears = science.rows.find((row) => row.label === 'Treasury in debt');
    expect(arrears?.percent).toBeLessThan(0);
    expect(arrears?.amount).toBeLessThan(0);
    // The barracks puts hammers behind the warrior at the front.
    const production = ledgerOf(state, capital!, 'production');
    expect(production.rows.find((row) => row.label === 'Barracks')).toMatchObject({
      kind: 'percent',
      percent: 25,
    });
    // A town in unrest makes no production, and its list says why, last.
    const stopped = ledgerOf(state, restless!, 'production');
    expect(stopped.total).toBe(0);
    expect(stopped.rows[stopped.rows.length - 1]).toMatchObject({ kind: 'gate', label: 'In unrest' });
    expect(Math.abs(fold(stopped))).toBeLessThan(1e-9);
    // Gold is untouched by unrest, and its list has no gate.
    expect(ledgerOf(state, restless!, 'gold').rows.some((row) => row.kind === 'gate')).toBe(false);
  });
});

describe('a stage prints its parts and never their sum', () => {
  it('prints each percentage on a row of its own, and never a stage’s heading', () => {
    const state = developedEmpire();
    for (const city of state.cities) {
      for (const key of CITY_YIELD_KEYS) {
        const labels = ledgerOf(state, city, key).rows.map((row) => row.label);
        expect(labels).not.toContain(STAGE_LABEL.city);
        expect(labels).not.toContain(STAGE_LABEL.empire);
      }
    }
  });

  it('names a meter’s line with the meter’s standing, once', () => {
    // A fresh capital is content, so the happiness tier stands on its thought:
    // one row, "Happiness +N", and not a stage's sum over it.
    const state = board(12, 8);
    const city = foundCityAt(state, 0, getTileAt(state.map, 5, 4)!);
    bumpRevision(state);
    const happiness = meterEffects(state, 0).find(
      (effect) => effect.meter === 'happiness' && !effect.growth && effect.yields.length > 0,
    );
    expect(happiness).toBeDefined();
    const rows = ledgerOf(state, city, 'science').rows.filter((row) => row.kind === 'percent');
    const named = rows.filter((row) => row.label.startsWith('Happiness'));
    expect(named).toHaveLength(1);
    expect(named[0]!.label).toBe(`Happiness ${signedFigure(happiness!.value)}`);
    expect(named[0]!.percent).toBe(happiness!.percent);
  });

  it('prints no percentage on a voice nothing multiplies', () => {
    const state = board(12, 8);
    const city = foundCityAt(state, 0, getTileAt(state.map, 5, 4)!);
    bumpRevision(state);
    expect(ledgerOf(state, city, 'food').rows.some((row) => row.kind === 'percent')).toBe(false);
  });

  it('keeps a malus in the alarm ink', () => {
    // A row that takes away is printed in vermilion, off the figure itself.
    const card = braceBody(uiSource('cityPanel.ts'), 'function chipCardContent(');
    expect(card).toContain("if (row.amount < 0) item.classList.add('is-bad');");
  });

  it('keeps the canary: a list that cannot account for its chip says so', () => {
    // Cannot happen with the simulation as it is (the first block is what keeps
    // it so). Simulated here by a reading with one line taken out of its list
    // but not out of its fold: the chip still says the whole, and the list
    // must not quietly disagree with it.
    const state = developedEmpire();
    const capital = state.cities[0]!;
    const real = readCity(state, capital);
    const granary = real.lines.find((line) => line.source === 'Granary' && line.food !== 0)!;
    const doctored: CityReading = { ...real, lines: real.lines.filter((line) => line !== granary) };
    const ledger = chipLedgerRows(state, capital, doctored, 'food');
    const last = ledger.rows[ledger.rows.length - 1]!;
    expect(last).toMatchObject({ kind: 'unaccounted', label: UNACCOUNTED_SOURCE });
    expect(last.amount).toBeGreaterThan(0);
    expect(Math.abs(fold(ledger) - ledger.total)).toBeLessThan(1e-9);
  });
});

describe('every percentage the stages fold has a line of its own', () => {
  it('folds exactly the meters, the luxuries and the hammers — nothing unlisted', () => {
    const state = board(12, 8);
    foundCityAt(state, 0, getTileAt(state.map, 5, 4)!);
    const city = state.cities[0]!;
    const front = city.queue[0];
    const sums = foldCityStages(state, city, front);
    const percents = cityYieldPercents(state, city);
    const hammers = productionModifiers(state, city, front);

    // Rebuilt from the two lists the chips' rows come from. If a third source
    // ever joins `foldCityStages` without joining one of these, this diverges,
    // and the chips' lists would start leaving a percentage out.
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

  it('gives the meters one row each, on every voice they move', () => {
    // A fresh capital is content and, since the palace's authority of six
    // (2026-09-08, ruling ddd), solvent as well, so two meters stand on it: the
    // happiness tier on thought and the authority tier on hammers. Each is one
    // row on each voice it moves, never a fold and its reason.
    const state = board(12, 8);
    const city = foundCityAt(state, 0, getTileAt(state.map, 5, 4)!);
    bumpRevision(state);
    const effects = meterEffects(state, 0).filter(
      (effect) => !effect.growth && effect.yields.length > 0,
    );
    expect(effects.map((effect) => effect.meter)).toEqual(['happiness', 'authority']);
    for (const effect of effects) {
      const word = effect.meter === 'happiness' ? 'Happiness' : 'Authority';
      for (const key of effect.yields) {
        const rows = ledgerOf(state, city, key).rows.filter((row) => row.label.startsWith(word));
        expect(rows, `${word} on ${key}`).toHaveLength(1);
      }
    }
  });
});
