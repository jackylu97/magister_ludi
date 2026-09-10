import { describe, expect, it } from 'vitest';

import {
  type City,
  type GameConfig,
  type GameState,
  bumpRevision,
  newGame,
  realPlayers,
} from '../../src/sim/state';
import { assignCitizens, foundCityAt } from '../../src/sim/cities';
import { type Tile, createMap, getTileAt } from '../../src/sim/map';
import {
  IMPROVEMENT_IDS,
  type ImprovementId,
  improvementDef,
} from '../../src/sim/improvementData';
import { LEDGER_CLASSES, classifyImprovement } from '../../src/sim/ledgerClass';
import { foldLedgerBag, ledgerBagOfCity } from '../../src/sim/ledgerFold';
import { readEmpire } from '../../src/sim/readings';
import { CITY_YIELD_KEYS } from '../../src/sim/resourceData';
import { resetVisibility } from '../../src/sim/visibility';
import { explainCity } from '../../src/sim/yields/town';
import { runWorldClock } from '../../src/sim/beads';
import { runWagers, wagerDealOf, wagerStanding } from '../../src/sim/wagers';
import type { TechId } from '../../src/sim/techData';

/**
 * **The Patronage reads the works** — batch W4, the user's ruling of 2026-09-10
 * (`docs/flags.md` (eeee), the spec of record).
 *
 * The complaint that opened it was a reading: *"does The Patronage not factor
 * legacies from previous ages? my reading shows zero"*. Legacies did count — a
 * legacy's lines carry the great person's own card and `classifyCard` has always
 * filed those under `people`. What did not count was the **works**: an academy's
 * three beakers are a tile line, and a tile line went to `tiles` with the grass
 * under it, so a realm whose great people had all been planted read near nought
 * against a card promising *"their works, their gifts and their legacies"*.
 *
 * Four things are pinned here, in the order the fix runs: the class follows the
 * row's own `greatPerson` marker and never a name (and the prophet's holy site
 * is not a great person's); a work standing on a worked hex moves that hex's
 * yield out of `tiles` and into `people`; a farm's hex does not move; and the
 * re-filing is a **re-filing** — the eight classes still add to exactly what the
 * town banks. Then the reading the whole thing exists for: The Patronage's
 * standing rises when a work is planted inside the age's window.
 */

function config(over: Partial<GameConfig> = {}): GameConfig {
  return {
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00', isHuman: true },
      { name: 'Bors', color: '#00a', isHuman: false },
    ],
    ...over,
  };
}

/**
 * A two-seat state on blank grassland. Grass pays a bushel and nothing else, so
 * every figure a test reads is a figure the test put there — and a work planted
 * on grass is the improvement's yield and the ground's, which is the whole of
 * what the hex line is.
 */
function flatState(): GameState {
  const width = 16;
  const height = 12;
  const state = newGame(config());
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.nextEntityId = 1;
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** A town with citizens enough to work a handful of its ring. */
function town(state: GameState): City {
  const city = foundCityAt(state, 0, at(state, 8, 5));
  city.population = 4;
  assignCitizens(state, city);
  bumpRevision(state);
  return city;
}

/** The hex the first citizen is standing on. */
function firstWorked(state: GameState, city: City): Tile {
  const cell = city.workedTiles[0];
  if (!cell) throw new Error('the town works nothing');
  return at(state, cell.col, cell.row);
}

/** Lays an improvement on a worked hex without moving anybody off it. */
function lay(state: GameState, tile: Tile, improvement: ImprovementId): void {
  tile.improvement = improvement;
  bumpRevision(state);
}

/** One class of one town's basket, summed over the six voices. */
function classOf(state: GameState, city: City, cls: 'tiles' | 'people'): number {
  const bag = ledgerBagOfCity(state, city);
  let total = 0;
  for (const key of CITY_YIELD_KEYS) total += bag[cls][key];
  return total;
}

// --- 1. the marker ----------------------------------------------------------

describe('which improvements are a great person’s', () => {
  it('reads the row’s own marker, and never a name', () => {
    // The register test, and the reason there is no list of five ids anywhere in
    // `src/sim/`: presence of `ImprovementDef.greatPerson` is the marker (the
    // same convention `charges` and `consecrates` keep), so a sixth work is a
    // JSON row and files itself.
    let works = 0;
    for (const id of IMPROVEMENT_IDS) {
      const family = improvementDef(id).greatPerson;
      const expected = family === undefined || family === 'prophet' ? 'tiles' : 'people';
      expect(classifyImprovement(id), id).toBe(expected);
      if (expected === 'people') works += 1;
    }
    expect(works).toBeGreaterThan(0);
  });

  it('leaves the prophet’s holy site with the land, and a worker’s ground too', () => {
    // A prophet is bought with faith and holds no renown — `WorkFamily` widened
    // `Family` by exactly one member for this reason — so the site he plants is
    // not a great person's work, and its faith stays where it has always been.
    const prophets = IMPROVEMENT_IDS.filter(
      (id) => improvementDef(id).greatPerson === 'prophet',
    );
    expect(prophets.length).toBeGreaterThan(0);
    for (const id of prophets) expect(classifyImprovement(id)).toBe('tiles');
    expect(classifyImprovement('farm')).toBe('tiles');
    expect(classifyImprovement('mine')).toBe('tiles');
  });
});

// --- 2. the hex line --------------------------------------------------------

describe('a hex a great person is standing on', () => {
  it('moves its yield out of the land and into the people', () => {
    const state = flatState();
    const city = town(state);
    const tile = firstWorked(state, city);

    const groundBefore = classOf(state, city, 'tiles');
    const peopleBefore = classOf(state, city, 'people');

    lay(state, tile, 'academy');
    const groundAfter = classOf(state, city, 'tiles');
    const peopleAfter = classOf(state, city, 'people');

    // The academy's own beakers, *and* the grass under it: a hex is one fold in
    // which a hill replaces the grass, so the improvement's share cannot be
    // taken back out without a second sum of the remainder.
    const academy = improvementDef('academy').yields.science ?? 0;
    expect(academy).toBeGreaterThan(0);
    expect(peopleAfter - peopleBefore).toBeGreaterThanOrEqual(academy);
    expect(groundAfter).toBeLessThan(groundBefore);
  });

  it('is the hex’s own line that moved — step 2, one line, one class', () => {
    const state = flatState();
    const city = town(state);
    const tile = firstWorked(state, city);
    lay(state, tile, 'landmark');

    const hexes = explainCity(state, city).lines.filter((line) => line.step === 2);
    const mine = hexes.filter((line) => line.class === 'people');
    expect(mine).toHaveLength(1);
    const culture = improvementDef('landmark').yields.culture ?? 0;
    expect(culture).toBeGreaterThan(0);
    expect(mine[0]!.culture).toBeGreaterThanOrEqual(culture);
    // Every other worked hex is still the land's.
    expect(hexes.filter((line) => line.class === 'tiles').length).toBe(hexes.length - 1);
  });

  it('leaves a farm where it has always been', () => {
    const state = flatState();
    const city = town(state);
    const tile = firstWorked(state, city);

    const peopleBefore = classOf(state, city, 'people');
    lay(state, tile, 'farm');

    expect(classOf(state, city, 'people')).toBe(peopleBefore);
    const hexes = explainCity(state, city).lines.filter((line) => line.step === 2);
    for (const line of hexes) expect(line.class).toBe('tiles');
    expect(classOf(state, city, 'tiles')).toBeGreaterThan(0);
  });

  it('is a re-filing: the eight classes still add to what the town banks', () => {
    // The one invariant the whole change must not break. `ledgerBagOfCity`
    // shares the two stages' gain out over the percentages that supplied it and
    // rounds eight figures a voice so they still add to the bank — moving a line
    // between two classes may not move the sum.
    const state = flatState();
    const city = town(state);
    lay(state, firstWorked(state, city), 'manufactory');

    const banked = readEmpire(state, 0).towns.find((one) => one.city.id === city.id);
    expect(banked).toBeDefined();
    const folded = foldLedgerBag(ledgerBagOfCity(state, city));
    for (const key of CITY_YIELD_KEYS) {
      expect(folded[key], key).toBe(banked!.total[key]);
    }
    // And nothing landed outside the eight.
    expect(LEDGER_CLASSES).toHaveLength(8);
  });
});

// --- 3. the card ------------------------------------------------------------

const OF_AGE: Record<number, TechId> = { 2: 'currency' };

/** One turn, in the pipeline's own shape — `wagers.test.ts`' `tick`, verbatim. */
function tick(state: GameState): void {
  runWorldClock(state);
  runWagers(state);
  state.turn += 1;
}

/**
 * Runs a board to Æra II's deal and then puts **The Patronage** on the table,
 * every seat opening at where it actually stands.
 *
 * The deal is rewritten rather than re-rolled because which three cards a seed
 * deals is `wagers.test.ts`' subject, not this file's: the question here is what
 * one row *reads*, and a test that fished for a seed dealing it would be a test
 * about the draw.
 */
function dealThePatronage(state: GameState): number {
  for (const player of realPlayers(state)) {
    const tech = OF_AGE[2]!;
    if (!player.techsResearched.includes(tech)) player.techsResearched.push(tech);
  }
  bumpRevision(state);
  for (let step = 0; step < 60; step += 1) {
    tick(state);
    const deal = wagerDealOf(state, 2);
    if (deal) {
      deal.dealt = ['patronage'];
      deal.claimed = [];
      deal.opening = realPlayers(state).map((player) => ({
        playerId: player.id,
        at: [player.wagerTotals.peopleYields ?? 0],
      }));
      return 2;
    }
  }
  throw new Error('no wager was ever dealt');
}

describe('The Patronage', () => {
  it('rises when a work is planted inside the age', () => {
    // Two boards from one seed, ticked the same number of times, differing in
    // exactly one hex: one has a scholar standing on it. The card is a *flow* —
    // `now − opening` — so the difference between the two standings is what the
    // work paid over the window and nothing else.
    const quiet = flatState();
    const quietCity = town(quiet);
    const age = dealThePatronage(quiet);

    const patron = flatState();
    const patronCity = town(patron);
    expect(dealThePatronage(patron)).toBe(age);
    lay(patron, firstWorked(patron, patronCity), 'academy');
    expect(quietCity.id).toBe(patronCity.id);

    for (let step = 0; step < 3; step += 1) {
      tick(quiet);
      tick(patron);
    }

    const without = wagerStanding(quiet, 0, 'patronage', age);
    const with_ = wagerStanding(patron, 0, 'patronage', age);
    expect(with_).toBeGreaterThan(without);
  });
});
