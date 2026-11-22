/**
 * The citizen sheets weigh all six yields (the user's ruling of 2026-11-22,
 * `docs/plans/beta-checklist-2026-11-21.md` section B2): *"Let's have it use
 * the bot's curve so that food is important early and less important late."*
 *
 * What these tests hold:
 *   - the default sheet is read at the owner's age, from `data/rules.json`;
 *   - food leads at the first age and does not lead at the last;
 *   - science, culture and faith count under every sheet, so a hex that pays
 *     them beats an empty hex;
 *   - each focus still leads with its own yield;
 *   - a town the default sheet leaves short of food swaps toward food
 *     (`feedTown`), and never moves a pinned hex;
 *   - the same board gives the same assignment.
 */
import { describe, expect, it } from 'vitest';

import {
  assignCitizens,
  assignableTiles,
  citizenWeightsAt,
  citizenWeightsFor,
  foundCityAt,
  yieldScore,
} from '../../src/sim/cities';
import { type Tile, createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { CITIZEN_FOCUSES, type CitizenWeights, RULES } from '../../src/sim/rulesData';
import { type City, type GameState, bumpRevision } from '../../src/sim/state';
import { LAST_TECH_AGE, TECH_AGES, TECH_IDS, type TechAge, techDef } from '../../src/sim/techData';
import { TILE_YIELD_KEYS, readTileYield } from '../../src/sim/terrainData';
import { resetVisibility } from '../../src/sim/visibility';
import { foldTile, yieldContextFor } from '../../src/sim/yields/hex';
import { foldCity } from '../../src/sim/yields/town';
import { newGame } from './newGameHelpers';

const CITIES = RULES.cities;

/** A two-seat state on a blank desert board. Desert pays nothing. */
function desertState(): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 16, height: 12, terrain: 'desert' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(16 * 12).fill(null);
  state.units = [];
  state.nextEntityId = 1;
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** The town's ring in tile-index order, the order ties break in. */
function ring(state: GameState, city: City): Tile[] {
  return [...assignableTiles(state, city)].sort(
    (a, b) => tileIndex(state.map, a.col, a.row) - tileIndex(state.map, b.col, b.row),
  );
}

function worked(city: City): string[] {
  return city.workedTiles.map((cell) => `${cell.col},${cell.row}`);
}

function key(tile: Tile): string {
  return `${tile.col},${tile.row}`;
}

/**
 * Moves seat 0 into an age by giving it one technology of that age. The age
 * is the highest age among the seat's technologies (`highestAge`), so one is
 * enough, and a charter technology does not count.
 */
function enterAge(state: GameState, age: TechAge): void {
  if (age === 1) return;
  const tech = TECH_IDS.find((id) => techDef(id).age === age && techDef(id).charter !== true);
  if (!tech) throw new Error(`No technology of age ${age}`);
  state.players[0]!.techsResearched.push(tech);
  bumpRevision(state);
}

/** The voice with the highest weight on a sheet; ties go to the first in `TILE_YIELD_KEYS`. */
function leader(sheet: CitizenWeights): keyof CitizenWeights {
  let best: keyof CitizenWeights = TILE_YIELD_KEYS[0]!;
  for (const voice of TILE_YIELD_KEYS) if (sheet[voice] > sheet[best]) best = voice;
  return best;
}

/**
 * Places the town's citizens after a test has dressed the board by hand. The
 * revision moves first, so no reading remembered from before the dressing is
 * used (`test/sim/benches.test.ts`).
 */
function place(state: GameState, city: City): void {
  bumpRevision(state);
  assignCitizens(state, city);
}

/** The seat's tile context, read after the board was dressed by hand. */
function ground(state: GameState): ReturnType<typeof yieldContextFor> {
  bumpRevision(state);
  return yieldContextFor(state, 0);
}

describe('the default citizen sheet', () => {
  it('reads one entry of each row of the rules at the age', () => {
    for (const age of TECH_AGES) {
      const sheet = citizenWeightsAt(age);
      for (const voice of TILE_YIELD_KEYS) {
        const row = CITIES.citizenWeights[voice];
        expect(sheet[voice], `${voice} at age ${age}`).toBe(row[Math.min(row.length - 1, age - 1)]);
      }
    }
  });

  it('has a whole, positive weight for every yield at every age', () => {
    for (const age of TECH_AGES) {
      for (const voice of TILE_YIELD_KEYS) {
        const weight = citizenWeightsAt(age)[voice];
        expect(Number.isInteger(weight), `${voice} at age ${age}`).toBe(true);
        expect(weight, `${voice} at age ${age}`).toBeGreaterThan(0);
      }
    }
  });

  it('puts food first at the first age, and not at the last', () => {
    const first = citizenWeightsAt(1);
    for (const voice of TILE_YIELD_KEYS) {
      if (voice !== 'food') expect(first.food, voice).toBeGreaterThan(first[voice]);
    }
    const last = citizenWeightsAt(LAST_TECH_AGE);
    expect(leader(last)).not.toBe('food');
    // Food falls toward production and never below it.
    expect(last.food).toBe(last.production);
    for (const age of TECH_AGES.slice(1)) {
      expect(citizenWeightsAt(age).food).toBeLessThanOrEqual(citizenWeightsAt((age - 1) as TechAge).food);
    }
  });

  it('is read at the owner’s age, not at anybody else’s', () => {
    const state = desertState();
    expect(citizenWeightsFor(state, 0)).toEqual(citizenWeightsAt(1));
    enterAge(state, LAST_TECH_AGE);
    expect(citizenWeightsFor(state, 0)).toEqual(citizenWeightsAt(LAST_TECH_AGE));
    expect(citizenWeightsFor(state, 1)).toEqual(citizenWeightsAt(1));
  });
});

describe('science, culture and faith on a hex', () => {
  it('score above nothing under every sheet', () => {
    const sheets: [string, CitizenWeights][] = [
      ...TECH_AGES.map((age): [string, CitizenWeights] => [`default at age ${age}`, citizenWeightsAt(age)]),
      ...(['food', 'production', 'gold'] as const).map((focus): [string, CitizenWeights] => [
        `${focus} focus`,
        CITIES.citizenFocusWeights[focus],
      ]),
    ];
    for (const [name, sheet] of sheets) {
      for (const voice of ['science', 'culture', 'faith'] as const) {
        const one = readTileYield({ food: 0, production: 0, gold: 0, [voice]: 1 });
        expect(yieldScore(one, sheet), `${voice} under the ${name}`).toBeGreaterThan(0);
      }
    }
  });

  it('put a citizen on a stone circle (faith and culture, nothing else) over an empty hex, at every age and under every focus', () => {
    for (const age of TECH_AGES) {
      for (const focus of CITIZEN_FOCUSES) {
        const state = desertState();
        enterAge(state, age);
        const city = foundCityAt(state, 0, at(state, 8, 5));
        city.population = 1;
        // The highest index in the ring, so the tie-break alone would never take it.
        const hexes = ring(state, city);
        const shrine = hexes[hexes.length - 1]!;
        shrine.improvement = 'stoneCircle';
        expect(foldTile(shrine, ground(state))).toMatchObject({ food: 0, production: 0, gold: 0 });
        if (focus !== 'default') city.focus = focus;
        place(state, city);
        expect(worked(city), `age ${age}, ${focus}`).toEqual([key(shrine)]);
      }
    }
  });

  it('put a citizen on a science hex over a gold hex that pays a point more', () => {
    const state = desertState();
    const city = foundCityAt(state, 0, at(state, 8, 5));
    city.population = 1;
    const [goldHex, garden] = ring(state, city);
    goldHex!.resource = 'gold';
    garden!.improvement = 'physicGarden';
    const ctx = ground(state);
    expect(foldTile(goldHex!, ctx)).toMatchObject({ gold: 3, science: 0 });
    expect(foldTile(garden!, ctx)).toMatchObject({ gold: 0, science: 2 });

    // Two science against three gold: the default sheet at the first age says
    // a point of science is worth more than a point and a half of gold.
    const sheet = citizenWeightsAt(1);
    expect(2 * sheet.science).toBeGreaterThan(3 * sheet.gold);
    place(state, city);
    expect(worked(city)).toEqual([key(garden!)]);

    // The gold focus says otherwise, and the town does what it was told.
    city.focus = 'gold';
    place(state, city);
    expect(worked(city)).toEqual([key(goldHex!)]);
  });
});

describe('food by age', () => {
  /**
   * One citizen, a grassland (two food) and a hill mine (three production).
   * At the first age two food outweigh three hammers; at the last age they do
   * not.
   */
  function grassOrMine(age: TechAge): { state: GameState; city: City; grass: Tile; mine: Tile } {
    const state = desertState();
    enterAge(state, age);
    const city = foundCityAt(state, 0, at(state, 8, 5));
    city.population = 1;
    const [mine, grass] = ring(state, city);
    mine!.hills = true;
    mine!.improvement = 'mine';
    grass!.terrain = 'grassland';
    const ctx = ground(state);
    expect(foldTile(mine!, ctx)).toMatchObject({ food: 0, production: 3 });
    expect(foldTile(grass!, ctx)).toMatchObject({ food: 2, production: 0 });
    return { state, city, grass: grass!, mine: mine! };
  }

  it('works the food at the first age and the hammers at the last', () => {
    const early = grassOrMine(1);
    place(early.state, early.city);
    expect(worked(early.city)).toEqual([key(early.grass)]);

    const late = grassOrMine(LAST_TECH_AGE);
    place(late.state, late.city);
    expect(worked(late.city)).toEqual([key(late.mine)]);
    // And the centre feeds the one citizen, so no guard was needed.
    expect(foldCity(late.state, late.city).food).toBeGreaterThanOrEqual(late.city.population * CITIES.foodPerCitizen);
  });
});

describe('the focus sheets', () => {
  it('each lead with their own yield', () => {
    for (const focus of ['food', 'production', 'gold'] as const) {
      const sheet = CITIES.citizenFocusWeights[focus];
      for (const voice of TILE_YIELD_KEYS) {
        if (voice !== focus) expect(sheet[focus], `${focus} over ${voice}`).toBeGreaterThan(sheet[voice]);
      }
    }
  });

  it('each pick their own yield first, at the first age and at the last', () => {
    for (const age of [1, LAST_TECH_AGE] as const) {
      for (const focus of ['food', 'production', 'gold'] as const) {
        const state = desertState();
        enterAge(state, age);
        const city = foundCityAt(state, 0, at(state, 8, 5));
        city.population = 1;
        const hexes = ring(state, city);
        hexes[0]!.hills = true;
        hexes[0]!.improvement = 'mine';
        hexes[1]!.improvement = 'customsHouse';
        hexes[2]!.terrain = 'grassland';
        hexes[3]!.improvement = 'academy';
        city.focus = focus;
        place(state, city);
        const paid = foldTile(at(state, city.workedTiles[0]!.col, city.workedTiles[0]!.row), ground(state));
        // The hex worked pays the most of the focused yield of any hex in the ring.
        const most = Math.max(...hexes.map((tile) => foldTile(tile, ground(state))[focus]));
        expect(paid[focus], `${focus} focus at age ${age}`).toBe(most);
      }
    }
  });
});

describe('a town short of food', () => {
  /**
   * A town of three at the last age: two farms and a grassland feed it, and
   * three academies pay science. The default sheet at the last age puts a
   * point of science above a point of food, so left alone it would take the
   * academies and go hungry.
   */
  function hungry(): { state: GameState; city: City; farms: Tile[]; schools: Tile[] } {
    const state = desertState();
    enterAge(state, LAST_TECH_AGE);
    const city = foundCityAt(state, 0, at(state, 8, 5));
    city.population = 3;
    const hexes = ring(state, city);
    const farms = hexes.slice(0, 3);
    farms[0]!.terrain = 'grassland';
    farms[0]!.improvement = 'farm';
    farms[1]!.terrain = 'grassland';
    farms[1]!.improvement = 'farm';
    farms[2]!.terrain = 'grassland';
    const schools = hexes.slice(3, 6);
    for (const tile of schools) tile.improvement = 'academy';
    return { state, city, farms, schools };
  }

  it('swaps toward food until the town is fed, and keeps what it can', () => {
    const { state, city, farms, schools } = hungry();
    const sheet = citizenWeightsFor(state, 0);
    const ctx = ground(state);
    // The sheet alone prefers every academy to every food hex.
    for (const school of schools) {
      for (const farm of farms) {
        expect(yieldScore(foldTile(school, ctx), sheet)).toBeGreaterThan(yieldScore(foldTile(farm, ctx), sheet));
      }
    }
    place(state, city);
    const upkeep = city.population * CITIES.foodPerCitizen;
    expect(foldCity(state, city).food).toBeGreaterThanOrEqual(upkeep);
    // Fed, and still on at least one academy: the guard trades only as much as
    // the town must eat.
    expect(worked(city).some((cell) => schools.map(key).includes(cell))).toBe(true);
  });

  it('never moves a pinned hex to feed the town', () => {
    const { state, city, schools } = hungry();
    city.lockedTiles = schools.map((tile) => ({ col: tile.col, row: tile.row }));
    place(state, city);
    // Every seat is pinned to an academy: the player has answered the question.
    expect([...worked(city)].sort()).toEqual(schools.map(key).sort());
  });

  it('keeps a focus that starves the town refused, and feeds the fallback', () => {
    // Two farms, two academies and two mines, and a town of three. The
    // production focus takes both mines and goes hungry, so it is refused. The
    // default sheet then takes both academies and goes hungry too, so the
    // guard swaps an academy for the second farm.
    const state = desertState();
    enterAge(state, LAST_TECH_AGE);
    const city = foundCityAt(state, 0, at(state, 8, 5));
    city.population = 3;
    const hexes = ring(state, city);
    for (const farm of hexes.slice(0, 2)) {
      farm.terrain = 'grassland';
      farm.improvement = 'farm';
    }
    const schools = hexes.slice(2, 4);
    for (const school of schools) school.improvement = 'academy';
    const mines = hexes.slice(4, 6);
    for (const mine of mines) {
      mine.hills = true;
      mine.improvement = 'mine';
    }
    const upkeep = city.population * CITIES.foodPerCitizen;

    // The three hexes the production sheet ranks first are both mines and a
    // farm. Pinned there, the town goes hungry.
    const production = CITIES.citizenFocusWeights.production;
    const ctx = ground(state);
    const ranked = [...hexes].sort(
      (a, b) => yieldScore(foldTile(b, ctx), production) - yieldScore(foldTile(a, ctx), production),
    );
    expect(ranked.slice(0, 3).map(key).sort()).toEqual([...mines, hexes[0]!].map(key).sort());
    city.lockedTiles = [...mines, hexes[0]!].map((tile) => ({ col: tile.col, row: tile.row }));
    place(state, city);
    expect(foldCity(state, city).food).toBeLessThan(upkeep);
    city.lockedTiles = [];

    city.focus = 'production';
    place(state, city);
    expect(foldCity(state, city).food).toBeGreaterThanOrEqual(upkeep);
    expect(worked(city).filter((cell) => mines.map(key).includes(cell))).toHaveLength(0);
    expect(worked(city).filter((cell) => schools.map(key).includes(cell))).toHaveLength(1);
  });

  it('starves as before when no hex can feed it', () => {
    const state = desertState();
    enterAge(state, LAST_TECH_AGE);
    const city = foundCityAt(state, 0, at(state, 8, 5));
    city.population = 4;
    for (const tile of ring(state, city)) tile.improvement = 'academy';
    place(state, city);
    expect(city.workedTiles).toHaveLength(4);
    expect(foldCity(state, city).food).toBeLessThan(city.population * CITIES.foodPerCitizen);
  });
});

describe('determinism', () => {
  it('gives the same board the same assignment, at every age', () => {
    for (const age of TECH_AGES) {
      const build = (): City => {
        const state = desertState();
        enterAge(state, age);
        const city = foundCityAt(state, 0, at(state, 8, 5));
        city.population = 3;
        const hexes = ring(state, city);
        hexes[0]!.improvement = 'academy';
        hexes[1]!.improvement = 'stoneCircle';
        hexes[2]!.terrain = 'grassland';
        hexes[3]!.terrain = 'grassland';
        hexes[4]!.hills = true;
        hexes[4]!.improvement = 'mine';
        hexes[5]!.improvement = 'customsHouse';
        place(state, city);
        // Asking again changes nothing.
        const first = [...city.workedTiles];
        place(state, city);
        expect(city.workedTiles).toEqual(first);
        return city;
      };
      expect(build().workedTiles, `age ${age}`).toEqual(build().workedTiles);
    }
  });
});
