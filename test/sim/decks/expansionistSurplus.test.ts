/**
 * **The Expansionist batch E6** (`docs/plans/expansionist-build-triage.md`):
 * the two cards that waited for Dominion batch D7's shapes.
 *
 *   · The Breadbasket: a town told to stop growing puts its food surplus into
 *     production, through D7's `surplusToProduction` and a new town scope,
 *     `avoidsGrowth`. While a card moves a town's surplus, the Avoid growth
 *     tick no longer moves the town's citizens off food (readings 41, 77 and
 *     78);
 *   · Veteran Colonies: disbanding a military unit on the hex of one of your
 *     towns pays that town food equal to the unit's production cost, through
 *     D7's disband moment (readings 42 and 79).
 */

import { describe, expect, it } from 'vitest';

import {
  channelSurplus,
  foundCityAt,
  growthSurplus,
  growthThreshold,
  refreshCityDerived,
  unitProductionCost,
} from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { type Tile, createMap, getTileAt } from '../../../src/sim/map';
import { makeRng } from '../../../src/sim/rng';
import {
  type City,
  type GameState,
  bumpRevision,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import { describeCard, stripRefs } from '../../../src/sim/statecraft';
import { type DoctrineId, type OrderId } from '../../../src/sim/statecraftData';
import { resetVisibility } from '../../../src/sim/visibility';
import { explainSurplusMoved, foldCity } from '../../../src/sim/yields/town';
import { newGame } from '../newGameHelpers';

/**
 * Two seats on plains, with three grassland hexes beside the town's hex at
 * (4, 4). A town of three works the grassland for its food, and the
 * avoid-growth cap moves it onto the plains.
 */
function board(): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    barbarians: true,
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 24, height: 12, terrain: 'plains' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(24 * 12).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  state.rng = makeRng(12345);
  for (const [col, row] of [
    [5, 4],
    [3, 4],
    [4, 3],
  ] as const) {
    at(state, col, row).terrain = 'grassland';
  }
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  return getTileAt(state.map, col, row)!;
}

/** The town of three at (4, 4), building a monument. */
function town(state: GameState): City {
  const city = foundCityAt(state, 0, at(state, 4, 4))!;
  city.population = 3;
  city.queue = [{ kind: 'building', id: 'monument' }];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/** Puts an Order in a chair for this seat, and lets the town place its citizens again. */
function slot(state: GameState, id: string, city?: City): void {
  const sc = playerById(state, 0)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
  if (city) refreshCityDerived(state, city);
}

/** Gives this seat a Doctrine, as a chosen offer does. */
function hold(state: GameState, id: string): void {
  playerById(state, 0)!.statecraft.doctrines.push(id as DoctrineId);
  bumpRevision(state);
}

/** Ticks or unticks the town's Avoid growth, through the reducer. */
function avoidGrowth(state: GameState, city: City, avoid: boolean): void {
  const result = applyCommand(state, { type: 'setCitizenFocus', playerId: 0, cityId: city.id, avoidGrowth: avoid });
  expect(result.ok, result.ok ? '' : result.error).toBe(true);
}

/** The town's production toward its front row, steps 1 to 14. */
function production(state: GameState, city: City): number {
  return foldCity(state, city, [], city.queue[0]).production;
}

function moved(state: GameState, city: City): ReturnType<typeof explainSurplusMoved> {
  return explainSurplusMoved(state, city, foldCity(state, city, [], city.queue[0]), city.queue[0]);
}

const worked = (city: City): string => JSON.stringify(city.workedTiles);

const said = (id: string): string => describeCard(id as never).map((clause) => stripRefs(clause.text)).join(' ');

describe('the Expansionist batch E6: The Breadbasket', () => {
  it('keeps the citizens of a town told to stop growing on its food, and moves the whole surplus into production', () => {
    const state = board();
    const city = town(state);
    const free = { tiles: worked(city), surplus: channelSurplus(state, city), production: production(state, city) };
    expect(free.surplus).toBeGreaterThan(0);
    // Without the card, the tick moves citizens off food until the basket
    // gains nothing.
    avoidGrowth(state, city, true);
    expect(worked(city)).not.toBe(free.tiles);
    expect(channelSurplus(state, city)).toBeLessThanOrEqual(0);
    // With it, the citizens stay where the focus put them, and the surplus is
    // production: one labelled line, and nothing stored.
    slot(state, 'expansionistTheBreadbasket', city);
    expect(worked(city)).toBe(free.tiles);
    const line = moved(state, city);
    expect(line).toHaveLength(1);
    expect(line[0]!.card).toBe('expansionistTheBreadbasket');
    expect(line[0]!.amount).toBe(free.surplus);
    expect(production(state, city)).toBe(free.production + free.surplus);
    expect(growthSurplus(state, city)).toBe(0);
  });

  it('moves nothing in a town that may grow, whatever it builds', () => {
    const state = board();
    const city = town(state);
    slot(state, 'expansionistTheBreadbasket', city);
    expect(moved(state, city)).toEqual([]);
    expect(growthSurplus(state, city)).toBe(channelSurplus(state, city));
    // Told to stop growing, it moves the surplus toward a unit as toward a
    // building: the row names no category.
    avoidGrowth(state, city, true);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    refreshCityDerived(state, city);
    bumpRevision(state);
    expect(moved(state, city)).toHaveLength(1);
    // And untold, it grows again.
    avoidGrowth(state, city, false);
    expect(moved(state, city)).toEqual([]);
  });

  it('leaves The Laws of Lord Shang’s town on its food while it builds a military unit, and caps it otherwise', () => {
    const state = board();
    const city = town(state);
    const free = worked(city);
    hold(state, 'theLawsOfLordShang');
    avoidGrowth(state, city, true);
    // A monument: the Doctrine moves nothing, so the tick caps the surplus.
    expect(worked(city)).not.toBe(free);
    expect(moved(state, city)).toEqual([]);
    // A warrior: the Doctrine moves the surplus, so the cap does not run.
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    refreshCityDerived(state, city);
    bumpRevision(state);
    expect(worked(city)).toBe(free);
    expect(moved(state, city)).toHaveLength(1);
    expect(growthSurplus(state, city)).toBe(0);
  });

  it('says what it does in plain words', () => {
    expect(said('expansionistTheBreadbasket')).toBe(
      'a city told to stop growing puts its food surplus into production instead of into growth',
    );
  });
});

describe('the Expansionist batch E6: Veteran Colonies', () => {
  function disband(state: GameState, unitId: number): void {
    const result = applyCommand(state, { type: 'disbandUnit', playerId: 0, unitId });
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
  }

  it('pays the town food equal to the unit’s production cost when a soldier is disbanded on its hex', () => {
    const state = board();
    const city = town(state);
    slot(state, 'veteranColonies');
    const cost = unitProductionCost(state, 0, 'warrior');
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(growthThreshold(city.population));
    const soldier = createUnit(state, 0, 'warrior', city.col, city.row);
    disband(state, soldier.id);
    expect(city.foodBasket).toBe(cost);
    expect(city.population).toBe(3);
  });

  it('grows the town at once when the food fills its basket, as a growth windfall', () => {
    const state = board();
    const city = town(state);
    slot(state, 'veteranColonies');
    city.foodBasket = growthThreshold(city.population) - 1;
    const soldier = createUnit(state, 0, 'warrior', city.col, city.row);
    disband(state, soldier.id);
    expect(city.population).toBe(4);
  });

  it('pays nothing for a unit raised for free, a unit outside the town’s hex, or a civilian', () => {
    const state = board();
    const city = town(state);
    slot(state, 'veteranColonies');
    const free = createUnit(state, 0, 'warrior', city.col, city.row);
    free.freeUpkeep = true;
    disband(state, free.id);
    const afield = createUnit(state, 0, 'warrior', city.col + 1, city.row);
    disband(state, afield.id);
    const worker = createUnit(state, 0, 'worker', city.col, city.row);
    disband(state, worker.id);
    expect(city.foodBasket).toBe(0);
  });

  it('counts a unit a levy raised, which is not a free unit', () => {
    const state = board();
    const city = town(state);
    slot(state, 'veteranColonies');
    const levied = createUnit(state, 0, 'warrior', city.col, city.row);
    levied.levied = 'conscript';
    const cost = unitProductionCost(state, 0, 'warrior');
    disband(state, levied.id);
    expect(city.foodBasket).toBe(cost);
  });

  it('says what it does in plain words', () => {
    expect(said('veteranColonies')).toBe(
      'for military units alone, disbanding a unit in one of your cities grants food equal to its production cost',
    );
  });
});
