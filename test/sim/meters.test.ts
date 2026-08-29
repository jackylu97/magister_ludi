import { describe, expect, it } from 'vitest';

import { buildingDef } from '../../src/sim/buildingData';
import { applyCommand } from '../../src/sim/commands';
import {
  assignCitizens,
  capitalCityOf,
  cityTile,
  cityYields,
  collectYields,
  controlledResources,
  foundCityAt,
  growthSurplus,
  isCoastalCity,
} from '../../src/sim/cities';
import { type Game, createGame, dispatch, replay, saveGame, loadGame, snapshotState } from '../../src/sim/game';
import {
  type GameMap,
  type Tile,
  createMap,
  getTileAt,
  mapRange,
  neighborTiles,
  tileHex,
  tileIndex,
} from '../../src/sim/map';
import {
  type MeterEffect,
  agesAdvanced,
  authorityOf,
  explainAuthority,
  explainFoundingCost,
  explainHappiness,
  foldMeter,
  foundingCostLines,
  growthFactor,
  growthStiflePercent,
  happinessDemand,
  happinessOf,
  meterEffects,
  meterStanding,
  stepPercent,
  tierPercent,
  yieldFactor,
} from '../../src/sim/meters';
import { resourceEffects } from '../../src/sim/resourceData';
import { makeRng } from '../../src/sim/rng';
import { RULES } from '../../src/sim/rulesData';
import {
  type City,
  type GameState,
  SCHEMA_VERSION,
  createUnit,
  newGame,
  playerById,
} from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';

/**
 * Wine's signature, read off the table rather than written down here.
 *
 * The vocabulary is data (`resourceData.ts`), so a test that hard-coded "+2"
 * would be asserting the *tuning* rather than the mechanism — and the mechanism
 * is the claim: an `extraHappiness` row pays on top of the flat per-unique
 * figure, on a line of its own.
 */
function wineSignature(): number {
  let total = 0;
  for (const effect of resourceEffects('wine')) {
    if (effect.kind === 'extraHappiness' && effect.per === undefined) total += effect.amount;
  }
  return total;
}

/** Terrain nothing can stand on, for the fixtures that go looking for ground. */
const WATER: string[] = ['ocean', 'coast', 'lake', 'mountain'];

const METERS = RULES.meters;
const HAPPY = METERS.happiness;
const WRIT = METERS.authority;

/**
 * The two empire meters (design ledger, Entries I and XIV), which are the whole
 * of Milestone 10's simulation.
 *
 * Everything here is asserted against `data/rules.json` rather than against the
 * numbers that happen to be in it today — `HAPPY.palace`, not `9` — because the
 * numbers are explicitly a playtest lever and a suite that pinned them would
 * fail the first time a designer turned one. What is pinned is the *shape*: what
 * folds to what, which rung a boundary value stands on, what outranks what, and
 * which of the five yields each effect is allowed to touch.
 */

/** A blank two-player state on a flat grassland rectangle, seeded and quiet. */
function flatState(width = 24, height = 12): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  state.rng = makeRng(12345);
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** The line a named source contributes, or `undefined`. */
function lineFor(entries: { source: string; value: number }[], match: string): number | undefined {
  return entries.find((entry) => entry.source.includes(match))?.value;
}

/**
 * Hands a city every tile inside its work radius, so a test can grow it past
 * the six tiles a founding claims and still have somewhere to put the citizens.
 */
function growTerritory(state: GameState, city: City): void {
  for (const tile of mapRange(state.map, tileHex(cityTile(state.map, city)), RULES.cities.workRadius)) {
    state.tileOwner[tileIndex(state.map, tile.col, tile.row)] = city.id;
  }
  assignCitizens(state, city);
}

/** Turns a tile into open sea, so the tile beside it becomes a coastal site. */
function makeSea(state: GameState, col: number, row: number): void {
  at(state.map, col, row).terrain = 'coast';
}

describe('the breakdown is the number', () => {
  it('folds happiness to exactly the sum of its lines', () => {
    const state = flatState();
    foundCityAt(state, 0, at(state.map, 4, 4));
    foundCityAt(state, 0, at(state.map, 10, 4));
    state.cities[1]!.population = 5;

    const entries = explainHappiness(state, 0);
    expect(happinessOf(state, 0)).toBe(foldMeter(entries));
    expect(foldMeter(entries)).toBe(entries.reduce((sum, entry) => sum + entry.value, 0));

    // Supply and demand are sub-folds of the same list, never a second sum.
    const standing = meterStanding(entries);
    expect(standing.gain - standing.cost).toBeCloseTo(standing.total, 10);
    expect(standing.gain).toBe(HAPPY.palace);
    expect(standing.cost).toBe(1 + 5);
  });

  it('folds authority to exactly the sum of its lines, and reads as used/capacity', () => {
    const state = flatState();
    foundCityAt(state, 0, at(state.map, 4, 4));
    foundCityAt(state, 0, at(state.map, 10, 4));

    const entries = explainAuthority(state, 0);
    expect(authorityOf(state, 0)).toBe(foldMeter(entries));

    const standing = meterStanding(entries);
    expect(standing.gain).toBe(WRIT.palaceCapacity);
    // The capital is free and the second city is not.
    expect(standing.cost).toBe(WRIT.capital + WRIT.foundedCity);
    expect(standing.total).toBe(standing.gain - standing.cost);
  });

  it('says nothing at all for an empire with no cities', () => {
    const state = flatState();
    expect(explainHappiness(state, 0)).toEqual([]);
    expect(explainAuthority(state, 0)).toEqual([]);
    expect(happinessOf(state, 0)).toBe(0);
    expect(authorityOf(state, 0)).toBe(0);
    // No palace without a capital to put it in.
    expect(capitalCityOf(state, 0)).toBeUndefined();
  });

  it('charges crowding as its own line, and only past the threshold', () => {
    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 4, 4));

    city.population = HAPPY.crowdingFrom;
    expect(explainHappiness(state, 0).some((entry) => entry.source.includes('crowding'))).toBe(
      false,
    );

    city.population = HAPPY.crowdingFrom + 3;
    const entries = explainHappiness(state, 0);
    const crowding = lineFor(entries, 'crowding');
    expect(crowding).toBeDefined();
    expect(-crowding!).toBeCloseTo(HAPPY.crowdingWeight * 3 ** HAPPY.crowdingExponent, 10);
    // And the two lines together are the curve `happinessDemand` states.
    expect(-(lineFor(entries, 'citizens')! + crowding!)).toBeCloseTo(
      happinessDemand(city.population),
      10,
    );
  });
});

describe('the ladders', () => {
  it('puts every tier boundary on the rung the design says', () => {
    const [first, second] = [METERS.tiers[0]!.percent, METERS.tiers[1]!.percent];
    expect(tierPercent(0)).toBe(0);
    expect(tierPercent(4)).toBe(0);
    expect(tierPercent(5)).toBe(first);
    expect(tierPercent(9)).toBe(first);
    expect(tierPercent(10)).toBe(second);
    expect(tierPercent(-4)).toBe(0);
    expect(tierPercent(-5)).toBe(-first);
    expect(tierPercent(-9)).toBe(-first);
    expect(tierPercent(-10)).toBe(-second);
  });

  it('clamps a tier however deep the value goes', () => {
    expect(tierPercent(1000)).toBe(METERS.tierClamp);
    expect(tierPercent(-1000)).toBe(-METERS.tierClamp);
  });

  it('puts every growth-stifle boundary on its own steeper rung', () => {
    // −1 / −10 / −20, and the first rung is `< 0` rather than `≤ 0`: an empire
    // in exact balance is balanced (design ledger, Entry XIV.D.4).
    const rungs = METERS.growthStifle.map((step) => step.percent);
    expect(growthStiflePercent(1)).toBe(0);
    expect(growthStiflePercent(0)).toBe(0);
    expect(growthStiflePercent(-0.5)).toBe(rungs[0]);
    expect(growthStiflePercent(-1)).toBe(rungs[0]);
    expect(growthStiflePercent(-9.9)).toBe(rungs[0]);
    expect(growthStiflePercent(-10)).toBe(rungs[1]);
    expect(growthStiflePercent(-19)).toBe(rungs[1]);
    expect(growthStiflePercent(-20)).toBe(rungs[2]);
    expect(growthStiflePercent(-99)).toBe(rungs[2]);
  });

  it('takes the deepest rung that applies, whatever order the table is in', () => {
    const shuffled = [...METERS.tiers].reverse();
    for (const value of [-12, -7, -1, 0, 6, 14]) {
      expect(stepPercent(shuffled, value, METERS.tierClamp)).toBe(tierPercent(value));
    }
  });
});

describe('happiness supply', () => {
  /** Plants a worked, improved luxury inside the city's own borders. */
  function plant(state: GameState, city: City, col: number, row: number, resource: 'silk' | 'wine'): void {
    const tile = at(state.map, col, row);
    tile.resource = resource;
    tile.improvement = 'plantation';
    expect(state.tileOwner[row * state.map.width + col]).toBe(city.id);
  }

  it('pays for a luxury once however many seams are dug', () => {
    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 4, 4));
    const bare = happinessOf(state, 0);

    plant(state, city, 3, 4, 'silk');
    expect(controlledResources(state, 0, 'luxury')).toEqual(['silk']);
    expect(happinessOf(state, 0)).toBe(bare + HAPPY.perUniqueLuxury);

    // A second seam of the *same* luxury is worth nothing more.
    plant(state, city, 5, 4, 'silk');
    expect(controlledResources(state, 0, 'luxury')).toEqual(['silk']);
    expect(happinessOf(state, 0)).toBe(bare + HAPPY.perUniqueLuxury);
    // "Silk · plantation": the line says *how* the empire holds it, because a
    // seam somebody dug and a town founded on top of one are lost in completely
    // different ways. One line either way — the luxury is still unique.
    expect(
      explainHappiness(state, 0).filter((entry) => entry.source.startsWith('Silk')),
    ).toHaveLength(1);

    // A different one is — and wine's *signature* is extra happiness on top of
    // the flat figure, which is a second line rather than a bigger one. Read off
    // the table, because the whole point of the vocabulary is that the number
    // lives in `resources.json` (see `resourceEffects.ts`).
    plant(state, city, 4, 3, 'wine');
    expect(controlledResources(state, 0, 'luxury')).toEqual(['silk', 'wine']);
    expect(happinessOf(state, 0)).toBe(bare + 2 * HAPPY.perUniqueLuxury + wineSignature());
    expect(explainHappiness(state, 0).filter((e) => e.source.startsWith('Wine'))).toHaveLength(2);
    expect(
      explainHappiness(state, 0).filter((e) => e.source === 'Wine · signature'),
    ).toHaveLength(1);
  });

  it('ignores a luxury nobody has improved, and a rival’s', () => {
    const state = flatState();
    const mine = foundCityAt(state, 0, at(state.map, 4, 4));
    const bare = happinessOf(state, 0);

    // Owned, unimproved: worth gold to whoever works it, worth no happiness.
    at(state.map, 3, 4).resource = 'silk';
    expect(happinessOf(state, 0)).toBe(bare);

    // Improved, but inside somebody else's borders.
    const theirs = foundCityAt(state, 1, at(state.map, 12, 4));
    const tile = at(state.map, 11, 4);
    tile.resource = 'wine';
    tile.improvement = 'plantation';
    expect(state.tileOwner[4 * state.map.width + 11]).toBe(theirs.id);
    expect(happinessOf(state, 0)).toBe(bare);
    expect(happinessOf(state, 1)).toBe(
      HAPPY.palace + HAPPY.perUniqueLuxury + wineSignature() - mine.population * 0 - 1,
    );
  });
});

describe('authority: what a city costs', () => {
  it('gives the capital a free ride and charges every city after it', () => {
    const state = flatState();
    const capital = foundCityAt(state, 0, at(state.map, 4, 4));
    expect(capitalCityOf(state, 0)?.id).toBe(capital.id);
    expect(authorityOf(state, 0)).toBe(WRIT.palaceCapacity - WRIT.capital);

    foundCityAt(state, 0, at(state.map, 10, 4));
    expect(authorityOf(state, 0)).toBe(WRIT.palaceCapacity - WRIT.capital - WRIT.foundedCity);
  });

  it('discounts a coastal city without exempting it', () => {
    const state = flatState();
    foundCityAt(state, 0, at(state.map, 4, 4));
    makeSea(state, 11, 4);
    const port = foundCityAt(state, 0, at(state.map, 10, 4));
    expect(isCoastalCity(state, port)).toBe(true);

    const line = lineFor(explainAuthority(state, 0), 'coastal');
    expect(line).toBe(-WRIT.coastalCity);
    // A discount, never an exemption (design ledger, Entry I.b).
    expect(WRIT.coastalCity).toBeGreaterThan(0);
    expect(WRIT.coastalCity).toBeLessThan(WRIT.foundedCity);
  });

  it('charges a captured city more than one you grew', () => {
    const state = flatState();
    foundCityAt(state, 0, at(state.map, 4, 4));
    const taken = foundCityAt(state, 0, at(state.map, 10, 4));
    taken.captured = true;

    expect(lineFor(explainAuthority(state, 0), 'captured')).toBe(-WRIT.capturedCity);
    expect(WRIT.capturedCity).toBeGreaterThan(WRIT.foundedCity);
  });

  it('prices a seized harbour as a seizure: captured outranks coastal', () => {
    const state = flatState();
    foundCityAt(state, 0, at(state.map, 4, 4));
    makeSea(state, 11, 4);
    const port = foundCityAt(state, 0, at(state.map, 10, 4));
    expect(isCoastalCity(state, port)).toBe(true);
    port.captured = true;

    const entries = explainAuthority(state, 0);
    expect(lineFor(entries, 'captured')).toBe(-WRIT.capturedCity);
    expect(lineFor(entries, 'coastal')).toBeUndefined();
  });

  it('moves the palace to the oldest city the empire actually founded', () => {
    const state = flatState();
    const first = foundCityAt(state, 0, at(state.map, 4, 4));
    const second = foundCityAt(state, 0, at(state.map, 10, 4));

    // The capital falls; the empire seats its writ in the town it still built.
    first.captured = true;
    first.ownerId = 1;
    expect(capitalCityOf(state, 0)?.id).toBe(second.id);

    // Won back, it is still a seized city — and still not the capital.
    first.ownerId = 0;
    expect(capitalCityOf(state, 0)?.id).toBe(second.id);
    expect(lineFor(explainAuthority(state, 0), 'captured')).toBe(-WRIT.capturedCity);
  });

  it('seats a capital in a purely conquered empire rather than none at all', () => {
    const state = flatState();
    const only = foundCityAt(state, 0, at(state.map, 4, 4));
    only.captured = true;
    expect(capitalCityOf(state, 0)?.id).toBe(only.id);
    // It is the capital *and* it was seized; captured is the dearer line and
    // wins, so a conqueror's first prize is never free.
    expect(lineFor(explainAuthority(state, 0), 'captured')).toBe(-WRIT.capturedCity);
  });

  it('grants capacity per age advance, and nothing for the age you start in', () => {
    const state = flatState();
    foundCityAt(state, 0, at(state.map, 4, 4));
    expect(agesAdvanced(state, 0)).toBe(0);
    expect(meterStanding(explainAuthority(state, 0)).gain).toBe(WRIT.palaceCapacity);

    // A Classical technology is the second age reached, which is one advance.
    state.players[0]!.techsResearched.push('mathematics');
    expect(agesAdvanced(state, 0)).toBe(1);
    const entries = explainAuthority(state, 0);
    expect(lineFor(entries, 'Æra II')).toBe(WRIT.perAge);
    expect(meterStanding(entries).gain).toBe(WRIT.palaceCapacity + WRIT.perAge);
  });

  /**
   * Capacity an empire *built*, which is the Age I rework's addition to the
   * writ: a monument raises it by one.
   *
   * What is under test is the data-drivenness rather than the number. Nothing in
   * `meters.ts` names the monument — the line is grown from whichever buildings
   * declare an `authorityCapacity` — so the assertions are written off
   * `buildingDef` and a second such building would need no code at all.
   */
  it('counts the capacity its buildings supply, one line per type', () => {
    const state = flatState();
    const first = foundCityAt(state, 0, at(state.map, 4, 4));
    const second = foundCityAt(state, 0, at(state.map, 10, 4));
    const monument = buildingDef('monument');
    const capacity = monument.authorityCapacity!;
    const bare = meterStanding(explainAuthority(state, 0)).gain;

    // A type nobody has built is not a line: an empty row would be a list of
    // everything the player has not done.
    expect(lineFor(explainAuthority(state, 0), monument.name)).toBeUndefined();

    first.buildings.push('monument');
    expect(lineFor(explainAuthority(state, 0), monument.name)).toBe(capacity);
    expect(meterStanding(explainAuthority(state, 0)).gain).toBe(bare + capacity);

    // Two of them are one line that counts them, not two lines.
    second.buildings.push('monument');
    const entries = explainAuthority(state, 0);
    const named = entries.filter((entry) => entry.source.includes(monument.name));
    expect(named).toHaveLength(1);
    expect(named[0]!.source).toBe(`Monuments ×2`);
    expect(named[0]!.value).toBe(2 * capacity);
    expect(meterStanding(entries).gain).toBe(bare + 2 * capacity);

    // And it is the *owner's* writ it raises: the other seat's is untouched.
    expect(lineFor(explainAuthority(state, 1), monument.name)).toBeUndefined();
  });

  it('prices a city that does not exist yet, discount included', () => {
    const state = flatState();
    foundCityAt(state, 0, at(state.map, 4, 4));
    const before = authorityOf(state, 0);

    const inland = at(state.map, 10, 4);
    expect(authorityOf(state, 0, { site: inland })).toBe(before - WRIT.foundedCity);

    makeSea(state, 11, 8);
    const shore = at(state.map, 10, 8);
    expect(authorityOf(state, 0, { site: shore })).toBe(before - WRIT.coastalCity);

    // And the projection is exactly what founding there actually costs.
    foundCityAt(state, 0, shore);
    expect(authorityOf(state, 0)).toBe(before - WRIT.coastalCity);
  });

  it('gives a player’s very first city the capital’s free ride in the projection', () => {
    const state = flatState();
    // `toBeCloseTo`, because a capital that costs nothing folds to a signed
    // zero and `-0 === 0` is not what `toBe` asks.
    expect(authorityOf(state, 0, { site: at(state.map, 4, 4) })).toBeCloseTo(-WRIT.capital, 10);
  });
});

describe('what the meters do to the economy', () => {
  /**
   * An empire of `cities` cities whose happiness has been pushed to `happiness`
   * by hand, through the one input that is honestly free to move: population.
   */
  function empire(cityCount: number): GameState {
    const state = flatState(36, 12);
    for (let index = 0; index < cityCount; index++) {
      foundCityAt(state, 0, at(state.map, 4 + index * 4, 4));
    }
    return state;
  }

  it('multiplies science and culture when the people are content', () => {
    const state = empire(1);
    const city = state.cities[0]!;
    city.population = 3;
    const happiness = happinessOf(state, 0);
    expect(tierPercent(happiness)).toBeGreaterThan(0);

    const effects = meterEffects(state, 0);
    const bonus = effects.find((effect) => effect.meter === 'happiness' && !effect.growth)!;
    expect(bonus.yields).toEqual(['science', 'culture']);
    // Contentment buys thought, never iron.
    expect(yieldFactor(effects, 'production')).toBe(1);
    expect(yieldFactor(effects, 'science')).toBe(1 + bonus.percent / 100);
  });

  it('stifles growth and only growth when the people are not', () => {
    const state = empire(1);
    const city = state.cities[0]!;
    city.population = HAPPY.palace + 4;
    const happiness = happinessOf(state, 0);
    expect(happiness).toBeLessThan(0);

    const effects = meterEffects(state, 0);
    expect(effects.every((effect) => effect.meter === 'happiness')).toBe(true);
    expect(effects.filter((effect) => effect.growth)).toHaveLength(1);
    // A happiness deficit is a growth problem and nothing else.
    expect(yieldFactor(effects, 'production')).toBe(1);
    expect(yieldFactor(effects, 'science')).toBe(1);
    expect(yieldFactor(effects, 'culture')).toBe(1);
    expect(growthFactor(effects)).toBeLessThan(1);
  });

  it('takes the stifle out of the surplus and never out of the harvest', () => {
    const state = empire(1);
    const city = state.cities[0]!;
    city.population = HAPPY.palace + 1;
    growTerritory(state, city);
    collectYields(state);
    city.foodBasket = 0;

    const yields = cityYields(state, city);
    const raw = yields.food - city.population * RULES.cities.foodPerCitizen;
    expect(raw).toBeGreaterThan(0);

    const factor = growthFactor(meterEffects(state, 0));
    expect(factor).toBeLessThan(1);
    expect(growthSurplus(state, city)).toBe(Math.floor(raw * factor));

    // The harvest itself is untouched: a stifled city keeps feeding itself, and
    // what the phase banks is exactly what the evaluator promised.
    const before = city.foodBasket;
    const promised = growthSurplus(state, city);
    collectYields(state);
    expect(cityYields(state, city).food).toBe(yields.food);
    expect(city.foodBasket - before).toBe(promised);
  });

  it('never turns a deficit into a deeper one: a stifle cannot starve', () => {
    const state = empire(1);
    const city = state.cities[0]!;
    city.population = HAPPY.palace + 6;
    // Starve it by hand: nothing to work but the centre.
    city.workedTiles = [];
    const raw = cityYields(state, city).food - city.population * RULES.cities.foodPerCitizen;
    expect(raw).toBeLessThan(0);
    expect(growthSurplus(state, city)).toBe(raw);
  });

  it('multiplies production when the writ runs, and everything when it does not', () => {
    const state = empire(1);
    state.players[0]!.techsResearched.push('mathematics', 'currency');
    expect(tierPercent(authorityOf(state, 0))).toBeGreaterThan(0);
    const good = meterEffects(state, 0).find((effect) => effect.meter === 'authority')!;
    expect(good.yields).toEqual(['production']);

    const wide = empire(6);
    expect(authorityOf(wide, 0)).toBeLessThanOrEqual(-5);
    const bad = meterEffects(wide, 0).find((effect) => effect.meter === 'authority')!;
    expect(bad.percent).toBeLessThan(0);
    // Over-extension is the one thing in this game that taxes the whole economy.
    expect(bad.yields).toEqual(['production', 'science', 'culture']);
  });

  it('sums the two meters per yield and applies the sum once', () => {
    // A hand-built pair, because the point is the arithmetic and not the board:
    // +10% and −10% on the same yield have to read as nothing at all.
    const effects: MeterEffect[] = [
      {
        meter: 'happiness',
        value: 6,
        percent: 10,
        yields: ['science', 'culture'],
        growth: false,
        borders: false,
      },
      {
        meter: 'authority',
        value: -6,
        percent: -10,
        yields: ['production', 'science', 'culture'],
        growth: false,
        borders: false,
      },
    ];
    expect(yieldFactor(effects, 'science')).toBeCloseTo(1, 10);
    expect(yieldFactor(effects, 'culture')).toBeCloseTo(1, 10);
    expect(yieldFactor(effects, 'production')).toBeCloseTo(0.9, 10);
    // The growth stifle is not a yield modifier and never leaks into one.
    expect(growthFactor(effects)).toBe(1);
  });

  it('folds the modifiers into the one evaluator every surface reads', () => {
    const state = empire(6);
    const city = state.cities[0]!;
    const effects = meterEffects(state, 0);
    const factor = yieldFactor(effects, 'production');
    expect(factor).toBeLessThan(1);

    // `cityYields` is the number the panel prints, the pipeline banks and
    // `turnsToBuild` divides by — one multiplication, floored once at the end.
    const rate = cityYields(state, city).production;
    const unmodified = state.cities.length;
    expect(unmodified).toBeGreaterThan(0);
    expect(rate).toBe(Math.floor(rate));
    expect(rate).toBeGreaterThan(0);

    // Softening the meter softens the rate, through the same function.
    state.players[0]!.techsResearched.push('mathematics', 'currency', 'engineering');
    expect(cityYields(state, city).production).toBeGreaterThanOrEqual(rate);
  });
});

describe('a captured city, end to end', () => {
  /**
   * A real war: player 1 plants a city beside player 0's start and player 0
   * storms it, entirely through logged commands. Nothing is hand-edited, so the
   * log is a script that reproduces every byte of the result.
   */
  function conquest(): { game: Game; cityId: number } {
    const game = createGame({
      seed: 4242,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
    });
    const home = game.state.units.find((unit) => unit.ownerId === 0)!;

    // Somewhere legal for a rival city with room for an army around it, found by
    // walking the board rather than assumed: the generator owns where the start
    // is, and a peninsula tip with one land neighbour cannot be besieged.
    const landlocked = (tile: Tile): boolean => !WATER.includes(tile.terrain);
    let site: Tile | null = null;
    for (let dc = -6; dc <= 6 && !site; dc++) {
      for (let dr = -5; dr <= 5 && !site; dr++) {
        const tile = getTileAt(game.state.map, home.col + dc, home.row + dr);
        if (!tile || !landlocked(tile)) continue;
        if (Math.abs(dc) + Math.abs(dr) < 3) continue;
        if (game.state.units.some((u) => u.col === tile.col && u.row === tile.row)) continue;
        const open = neighborTiles(game.state.map, tileHex(tile)).filter(
          (near) => landlocked(near) && !game.state.units.some((u) => u.col === near.col && u.row === near.row),
        );
        if (open.length < 4) continue;
        site = tile;
      }
    }
    expect(site).not.toBeNull();

    expect(
      dispatch(game, {
        type: 'spawnUnit',
        playerId: 1,
        ownerId: 1,
        unitType: 'settler',
        at: { col: site!.col, row: site!.row },
      }).ok,
    ).toBe(true);
    const settler = game.state.units.find(
      (unit) => unit.ownerId === 1 && unit.col === site!.col && unit.row === site!.row,
    )!;
    expect(dispatch(game, { type: 'foundCity', playerId: 1, settlerUnitId: settler.id }).ok).toBe(
      true,
    );
    const city = game.state.cities.find((entry) => entry.col === site!.col)!;
    expect(city.captured).toBe(false);

    // An army, one swordsman per hex that actually touches the city — melee
    // needs adjacency, and stacking allows one soldier per tile.
    const besiegers: number[] = [];
    for (const tile of neighborTiles(game.state.map, tileHex(site!))) {
      if (WATER.includes(tile.terrain)) continue;
      if (game.state.units.some((u) => u.col === tile.col && u.row === tile.row)) continue;
      const spawned = dispatch(game, {
        type: 'spawnUnit',
        playerId: 0,
        ownerId: 0,
        unitType: 'swordsman',
        at: { col: tile.col, row: tile.row },
      });
      if (!spawned.ok) continue;
      besiegers.push(
        game.state.units.find((u) => u.ownerId === 0 && u.col === tile.col && u.row === tile.row)!
          .id,
      );
    }
    expect(besiegers.length).toBeGreaterThan(1);

    for (let turn = 0; turn < 20 && city.ownerId !== 0; turn++) {
      for (const id of besiegers) {
        if (city.ownerId === 0) break;
        dispatch(game, {
          type: 'attack',
          playerId: 0,
          unitId: id,
          target: { col: city.col, row: city.row },
        });
      }
      for (const player of game.state.players) {
        dispatch(game, { type: 'endTurn', playerId: player.id });
      }
    }
    expect(city.ownerId).toBe(0);
    return { game, cityId: city.id };
  }

  it('raises the flag the meter prices, and prices it', () => {
    const { game, cityId } = conquest();
    const city = game.state.cities.find((entry) => entry.id === cityId)!;
    expect(city.captured).toBe(true);
    expect(lineFor(explainAuthority(game.state, 0), 'captured')).toBe(-WRIT.capturedCity);
  });

  it('leaves the conqueror’s settler ladder exactly where it was', () => {
    const { game } = conquest();
    // Taking a city is not building a settler (design ledger, Entry XIV.D.2).
    // Presence is the state, so an empire that has founded nothing carries no
    // `settler` key at all.
    expect(game.state.players[0]!.unitsBuilt.settler).toBeUndefined();
  });

  it('replays a conquest to a byte-identical state, captured flag and all', () => {
    const { game } = conquest();
    expect(game.state.cities.some((city) => city.captured)).toBe(true);
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });

  it('round-trips a schema 34 save with a captured city in it', () => {
    expect(SCHEMA_VERSION).toBe(34);
    const { game } = conquest();
    const reloaded = loadGame(saveGame(game));
    expect(snapshotState(reloaded.state)).toBe(snapshotState(game.state));
    expect(reloaded.state.cities.some((city) => city.captured)).toBe(true);
    // The flag is carried by the state dump, not merely by the log's replay.
    expect(snapshotState(game.state)).toContain('"captured":true');
  });
});

describe('the meters never gate anything', () => {
  it('leaves a rejected command\'s state byte-identical, meters and all', () => {
    const state = flatState();
    foundCityAt(state, 0, at(state.map, 4, 4));
    const city = state.cities[0]!;
    city.population = HAPPY.palace + 8;
    expect(happinessOf(state, 0)).toBeLessThan(0);
    expect(authorityOf(state, 0)).toBeDefined();

    const before = JSON.stringify(state);
    const unit = createUnit(state, 0, 'settler', 4, 6);
    const after = JSON.stringify(state);
    // A settler exists now; the refusal below must change nothing further.
    expect(after).not.toBe(before);

    // Founding on top of an existing city is refused, deficit or no deficit.
    const result = applyCommand(state, {
      type: 'foundCity',
      playerId: 0,
      settlerUnitId: unit.id,
    });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(state)).toBe(after);
  });
});

/**
 * The founding preview (user ruling, 2026-08-29: "better indicators for the
 * authority/happiness cost of a new city ... mousing over a tile will show the
 * happiness/authority cost of placing a city there").
 *
 * The claim under test is never the tuning — it is that the preview and the
 * meters are **one reading**. So every case here asserts the preview's fold
 * against what `explainAuthority`'s own prospect says, or against the rules
 * table, and the card cases are there because a card is exactly what a second
 * implementation would get wrong: a hand-rolled "+2, and 1 if coastal" in the
 * interface would quote the printed price to an empire that had legislated a
 * different one.
 */
describe('what founding a city here would cost', () => {
  /** A tile beside open sea, so the site reads as a harbour. */
  function coastalSite(state: GameState): Tile {
    makeSea(state, 11, 4);
    return at(state.map, 10, 4);
  }

  it('prices a plain inland site at the founded price and one citizen', () => {
    const state = flatState();
    foundCityAt(state, 0, at(state.map, 4, 4));

    const lines = explainFoundingCost(state, 0, at(state.map, 10, 4));
    expect(foldMeter(foundingCostLines(lines, 'authority'))).toBe(-WRIT.foundedCity);
    // A town is founded at one citizen, and `crowdingFrom` is far above one — so
    // the happiness half is a single line and there is no crowding in it.
    expect(foldMeter(foundingCostLines(lines, 'happiness'))).toBe(-HAPPY.demandPerPop);
    expect(foundingCostLines(lines, 'happiness')).toHaveLength(1);
    expect(lines.every((line) => line.part === 'cost')).toBe(true);
  });

  it('reads a harbour as the discount it is, never as a surcharge', () => {
    const state = flatState();
    foundCityAt(state, 0, at(state.map, 4, 4));
    const site = coastalSite(state);

    const authority = foldMeter(foundingCostLines(explainFoundingCost(state, 0, site), 'authority'));
    expect(authority).toBe(-WRIT.coastalCity);
    // The rule *replaces* the founded price rather than adding to it, which is
    // the one thing a preview written from the ledger's prose would invert.
    expect(authority).toBeGreaterThan(-WRIT.foundedCity);
  });

  it('gives the very first city the capital\'s free ride', () => {
    const state = flatState();
    expect(capitalCityOf(state, 0)).toBeUndefined();

    const lines = explainFoundingCost(state, 0, at(state.map, 4, 4));
    expect(foldMeter(foundingCostLines(lines, 'authority'))).toBeCloseTo(-WRIT.capital, 10);
    // Still a line, and still says why — a price of nothing is worth saying.
    expect(foundingCostLines(lines, 'authority')[0]!.source).toContain('capital');
    // The palace the first city hands over is deliberately *not* in the list: it
    // is a fact about founding at all, identical on every hex, and this list is
    // read by comparing hexes.
    expect(lines.some((line) => line.source.includes('Palace'))).toBe(false);
  });

  it('follows the empire\'s own law rather than the printed price', () => {
    const state = flatState();
    foundCityAt(state, 0, at(state.map, 4, 4));
    const site = coastalSite(state);
    const printed = foldMeter(foundingCostLines(explainFoundingCost(state, 0, site), 'authority'));

    // Thalassocracy shifts what a coastal town costs; the preview must move with
    // it, through the same `cardMeterRule` call the meter makes.
    playerById(state, 0)!.statecraft.doctrines.push('thalassocracy');
    const legislated = foldMeter(
      foundingCostLines(explainFoundingCost(state, 0, site), 'authority'),
    );
    expect(legislated).toBeGreaterThan(printed);

    // And the happiness half's card, which is a surcharge on governing one more
    // town at all — its own line, outside the demand factor.
    playerById(state, 0)!.statecraft.doctrines.push('manifestOfTheSteppe');
    const happiness = foundingCostLines(explainFoundingCost(state, 0, site), 'happiness');
    expect(happiness).toHaveLength(2);
    expect(lineFor(happiness, 'cost of governing')).toBeLessThan(0);
  });

  it('is the same line the meter itself would append', () => {
    const state = flatState();
    foundCityAt(state, 0, at(state.map, 4, 4));
    for (const site of [at(state.map, 10, 4), coastalSite(state)]) {
      const preview = foldMeter(foundingCostLines(explainFoundingCost(state, 0, site), 'authority'));
      // `explainAuthority`'s prospect is the settler sheet's projection. One
      // implementation, asked from two ends: the difference the projection makes
      // *is* the preview's authority half.
      expect(authorityOf(state, 0, { site }) - authorityOf(state, 0)).toBe(preview);
    }
  });
});
