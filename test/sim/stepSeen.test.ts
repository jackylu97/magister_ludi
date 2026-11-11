/**
 * **What a step announces** (batch P1, `docs/plans/performance-pass-2026-11-06.md`).
 *
 * `readCity`, `readEmpire`, `readEmpireRates` and the bot's `townFolds` grid sit on
 * the economy clock, so a seat that marches does not price its empire again. That is
 * honest only if every step those readings can see moves the clock. `stepIsSeen`
 * (`movement.ts`) and `recomputeMarchSight` (`visibility.ts`) decide that.
 *
 * A played game cannot prove it, because a game that never reaches a card never
 * reads the seam. So each test here hands a seat the one law row that reads one seam,
 * takes the step, and checks two things:
 *
 *   1. the step changed the answer, so the test is not vacuous;
 *   2. the remembered readings equal a fresh fold, with the slate's shadow check on.
 *
 * If a seam stops announcing, the second check fails and names the reading.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { type Tile, createMap, getTileAt, neighborTiles, tileHex } from '../../src/sim/map';
import { advanceAlongPath } from '../../src/sim/movement';
import { townFolds } from '../../src/ai/townFolds';
import { readCity, readEmpire, readEmpireRates } from '../../src/sim/readings';
import { economyStamp, setSlateShadow, slateShadow } from '../../src/sim/slate';
import {
  type City,
  type GameState,
  type TimedEffect,
  type Unit,
  bumpRevision,
  createUnit,
} from '../../src/sim/state';
import { lawReadsTrenches } from '../../src/sim/statecraft/evaluator';
import type { CardEffect } from '../../src/sim/statecraftData';
import { isWaterTerrain } from '../../src/sim/terrainData';
import { EXPLORED, HIDDEN, recomputeVisibility, resetVisibility } from '../../src/sim/visibility';
import { computeFreshwater } from '../../src/sim/water';
import { foldEmpireRates } from '../../src/sim/yields/empire';
import { empirePercents, explainCity } from '../../src/sim/yields/town';
import { newGame } from './newGameHelpers';
import { plainTechs } from './techHelpers';
import { openEveryWar } from './warHelpers';

/** A flat board with a sea on its west edge, two seats at war, every hex charted. */
function board(options: { war?: boolean } = {}): GameState {
  const state = newGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 30, height: 20, terrain: 'grassland' });
  for (const tile of state.map.tiles) {
    if (tile.col <= 4) tile.terrain = 'coast';
  }
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  for (const player of state.players) player.techsResearched = plainTechs();
  computeFreshwater(state.map);
  if (options.war !== false) openEveryWar(state);
  chartEverything(state);
  bumpRevision(state);
  return state;
}

/** Every hex explored by every seat, so a step charts nothing new. */
function chartEverything(state: GameState): void {
  for (const player of state.players) state.visibility[player.id]!.fill(EXPLORED);
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** A seat's law gains these rows for the life of the test. */
function give(state: GameState, seat: number, effects: readonly CardEffect[]): void {
  const rows: TimedEffect[] = effects.map((effect) => ({
    card: 'theLongWatch' as TimedEffect['card'],
    effect,
    expiresTurn: 9999,
  }));
  state.players[seat]!.timed = rows;
  bumpRevision(state);
}

/** A full allowance, so a test's step is never refused for want of movement. */
function rested(unit: Unit): Unit {
  unit.movesLeft = 15;
  return unit;
}

function step(state: GameState, unit: Unit, to: Tile): void {
  rested(unit);
  const done = applyCommand(state, {
    type: 'moveUnit',
    playerId: unit.ownerId,
    unitId: unit.id,
    target: { col: to.col, row: to.row },
  });
  expect(done.ok, done.ok ? '' : done.error).toBe(true);
  expect(unit.col).toBe(to.col);
  expect(unit.row).toBe(to.row);
}

/** Remembered readings equal a fresh fold. The shadow check adds to this on each hit. */
function expectHonest(state: GameState, seat: number): void {
  const percents = empirePercents(state, seat);
  for (const city of state.cities) {
    if (city.ownerId !== seat) continue;
    expect(readCity(state, city), city.name).toEqual(explainCity(state, city, [], percents));
  }
  expect(readEmpireRates(state, seat)).toEqual(foldEmpireRates(state, seat));
  // Asked twice, so the second ask is a hit that the shadow check disbelieves.
  readEmpire(state, seat);
  readEmpire(state, seat);
}

/** A town of seat 0 standing inland, with the hexes around it its own. */
function inlandTown(state: GameState, seat = 0, col = 12, row = 8): City {
  const town = foundCityAt(state, seat, at(state, col, row));
  chartEverything(state);
  bumpRevision(state);
  return town;
}

/** A hex beside the town that the town owns, and is not the town. */
function groundOf(state: GameState, town: City): Tile {
  const ring = neighborTiles(state.map, tileHex(at(state, town.col, town.row)));
  const mine = ring.find((tile) => state.tileOwner[tile.row * state.map.width + tile.col] === town.id);
  if (mine === undefined) throw new Error('the town owns none of its neighbours');
  return mine;
}

let shadowBefore = false;
beforeEach(() => {
  shadowBefore = slateShadow();
  setSlateShadow(true);
});
afterEach(() => {
  setSlateShadow(shadowBefore);
});

describe('a step nothing can see', () => {
  it('leaves the economy clock and every remembered reading where they were', () => {
    const state = board();
    const town = inlandTown(state);
    const soldier = createUnit(state, 0, 'warrior', 20, 8);
    chartEverything(state);
    bumpRevision(state);
    const list = readCity(state, town);
    const empire = readEmpire(state, 0);
    const rates = readEmpireRates(state, 0);
    const folds = townFolds(state, state.players[0]!);
    const economy = economyStamp(state);
    const revision = state.revision;

    step(state, soldier, at(state, 21, 8));

    expect(state.revision).toBe(revision + 1);
    expect(economyStamp(state)).toBe(economy);
    expect(readCity(state, town)).toBe(list);
    expect(readEmpire(state, 0)).toBe(empire);
    expect(readEmpireRates(state, 0)).toBe(rates);
    expect(townFolds(state, state.players[0]!)).toBe(folds);
    expectHonest(state, 0);
  });

  it('answers the same through the remembered lists as the plain fold', () => {
    const state = board();
    const town = inlandTown(state);
    town.population = 5;
    town.buildings.push('monument', 'library');
    bumpRevision(state);
    expect(readEmpireRates(state, 0)).toEqual(foldEmpireRates(state, 0));
  });
});

describe('a fortified piece leaving its trench', () => {
  it('moves the count of fortified units', () => {
    const state = board();
    const town = inlandTown(state);
    give(state, 0, [
      { kind: 'pays', where: 'empire', basis: 'count', to: 'gold', amount: 5, count: 'fortifiedUnits' },
    ] as unknown as CardEffect[]);
    const ground = groundOf(state, town);
    const soldier = createUnit(state, 0, 'warrior', ground.col, ground.row);
    chartEverything(state);
    expect(applyCommand(state, { type: 'fortify', playerId: 0, unitId: soldier.id }).ok).toBe(true);
    const dug = readEmpire(state, 0).totals.gold;
    expectHonest(state, 0);

    // To a hex that is no town and on the same side of the border, so only the
    // trench can be what is seen.
    const next = neighborTiles(state.map, tileHex(ground)).find(
      (tile) =>
        !(tile.col === town.col && tile.row === town.row) &&
        state.tileOwner[tile.row * state.map.width + tile.col] === town.id,
    )!;
    step(state, soldier, next);

    expect(soldier.fortifiedTurns).toBeUndefined();
    expect(readEmpire(state, 0).totals.gold).toBeLessThan(dug);
    expectHonest(state, 0);
  });

  it('moves the hex test that asks for a fortified unit', () => {
    const state = board();
    const town = inlandTown(state);
    give(state, 0, [
      { kind: 'pays', where: 'hex', food: 3, on: { test: 'fortifiedUnit' } },
    ] as unknown as CardEffect[]);
    const ground = groundOf(state, town);
    const soldier = createUnit(state, 0, 'warrior', ground.col, ground.row);
    town.population = 3;
    town.workedTiles = [{ col: ground.col, row: ground.row }];
    chartEverything(state);
    expect(applyCommand(state, { type: 'fortify', playerId: 0, unitId: soldier.id }).ok).toBe(true);
    const dug = readCity(state, town).flats.food;
    expectHonest(state, 0);

    const next = neighborTiles(state.map, tileHex(ground)).find(
      (tile) =>
        !(tile.col === town.col && tile.row === town.row) &&
        state.tileOwner[tile.row * state.map.width + tile.col] === town.id,
    )!;
    step(state, soldier, next);

    expect(readCity(state, town).flats.food).toBeLessThan(dug);
    expectHonest(state, 0);
  });
});

describe('a piece with nothing to see it dig in', () => {
  it('fortifies and leaves its trench without moving the clock', () => {
    const state = board();
    const soldier = createUnit(state, 0, 'warrior', 20, 8);
    chartEverything(state);
    bumpRevision(state);
    const economy = economyStamp(state);

    expect(applyCommand(state, { type: 'fortify', playerId: 0, unitId: soldier.id }).ok).toBe(true);
    expect(economyStamp(state)).toBe(economy);

    step(state, soldier, at(state, 21, 8));
    expect(soldier.fortifiedTurns).toBeUndefined();
    expect(economyStamp(state)).toBe(economy);
  });

  it('moves the clock on both once a law row reads trenches', () => {
    const state = board();
    give(state, 0, [
      { kind: 'pays', where: 'hex', food: 3, on: { test: 'fortifiedUnit' } },
    ] as unknown as CardEffect[]);
    const soldier = createUnit(state, 0, 'warrior', 20, 8);
    chartEverything(state);
    bumpRevision(state);
    const economy = economyStamp(state);

    expect(applyCommand(state, { type: 'fortify', playerId: 0, unitId: soldier.id }).ok).toBe(true);
    const dug = economyStamp(state);
    expect(dug).toBeGreaterThan(economy);

    step(state, soldier, at(state, 21, 8));
    expect(economyStamp(state)).toBeGreaterThan(dug);
  });

  it('counts a rite on a town as law', () => {
    const state = board();
    const town = inlandTown(state);
    town.timed = [
      {
        card: 'theLongWatch' as TimedEffect['card'],
        effect: {
          kind: 'pays',
          where: 'city',
          basis: 'count',
          to: 'gold',
          amount: 1,
          count: 'fortifiedUnits',
        } as unknown as CardEffect,
        expiresTurn: 9999,
      },
    ];
    bumpRevision(state);
    expect(lawReadsTrenches(state, 0)).toBe(true);
    expect(lawReadsTrenches(state, 1)).toBe(false);
  });
});

describe('the data `lawReadsTrenches` relies on', () => {
  /** Every row of the card vocabulary in the data, wherever it sits. */
  function rows(): Record<string, unknown>[] {
    const files = import.meta.glob('../../data/**/*.json', { eager: true, import: 'default' }) as Record<
      string,
      unknown
    >;
    const found: Record<string, unknown>[] = [];
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) {
        for (const item of value) walk(item);
        return;
      }
      if (value === null || typeof value !== 'object') return;
      const row = value as Record<string, unknown>;
      if (typeof row['kind'] === 'string') {
        found.push(row);
        return;
      }
      for (const child of Object.values(row)) walk(child);
    };
    for (const data of Object.values(files)) walk(data);
    return found;
  }

  const TRENCH = /"(?:fortifiedUnits|fortifiedUnit|garrisonWatch)"/;

  it('finds the rows it is about', () => {
    expect(rows().filter((row) => TRENCH.test(JSON.stringify(row))).length).toBeGreaterThan(0);
  });

  it('has no closed gate reading a trench and no trench paid on a route', () => {
    // A `conditionRule` whose gate is closed is not in `liveEffects`, so a gate that
    // read a trench would be missed. A row paid on a route can read a town of another
    // seat. A row that does either needs `lawReadsTrenches` to change first.
    const odd = rows()
      .filter((row) => TRENCH.test(JSON.stringify(row)))
      .filter((row) => row['kind'] !== 'pays' || !['city', 'empire', 'hex'].includes(String(row['where'])));
    expect(odd).toEqual([]);
  });
});

describe('a piece at a town’s gate', () => {
  it('moves the garrison count going in and coming out', () => {
    const state = board();
    const town = inlandTown(state);
    give(state, 0, [
      { kind: 'pays', where: 'city', basis: 'count', to: 'gold', amount: 5, count: 'garrison' },
    ] as unknown as CardEffect[]);
    const ground = groundOf(state, town);
    const soldier = createUnit(state, 0, 'warrior', ground.col, ground.row);
    chartEverything(state);
    bumpRevision(state);
    const outside = readEmpire(state, 0).totals.gold;

    step(state, soldier, at(state, town.col, town.row));
    expect(readEmpire(state, 0).totals.gold).toBeGreaterThan(outside);
    expectHonest(state, 0);

    step(state, soldier, ground);
    expect(readEmpire(state, 0).totals.gold).toBe(outside);
    expectHonest(state, 0);
  });

  it('moves a scope that asks for a garrison', () => {
    const state = board();
    const town = inlandTown(state);
    give(state, 0, [
      { kind: 'percentYields', yield: 'science', percent: 25, scope: { test: 'garrisoned' } },
    ] as unknown as CardEffect[]);
    const ground = groundOf(state, town);
    const soldier = createUnit(state, 0, 'warrior', ground.col, ground.row);
    chartEverything(state);
    bumpRevision(state);
    const before = readCity(state, town).percents.length;

    step(state, soldier, at(state, town.col, town.row));
    expect(readCity(state, town).percents.length).toBeGreaterThan(before);
    expectHonest(state, 0);
  });

  it('moves a scope that asks for a great general', () => {
    const state = board();
    const town = inlandTown(state);
    give(state, 0, [
      { kind: 'percentYields', yield: 'science', percent: 25, scope: { test: 'generalPresent' } },
    ] as unknown as CardEffect[]);
    const ground = groundOf(state, town);
    const general = createUnit(state, 0, 'greatPerson', ground.col, ground.row);
    general.person = 'ahmoseSonOfEbana' as Unit['person'];
    chartEverything(state);
    bumpRevision(state);
    const before = readCity(state, town).percents.length;

    step(state, general, at(state, town.col, town.row));
    expect(readCity(state, town).percents.length).toBeGreaterThan(before);
    expectHonest(state, 0);
  });
});

describe('a piece at a town’s gate, continued', () => {
  it('stays unseen when the piece is a civilian and nothing counts one', () => {
    const state = board();
    const town = inlandTown(state);
    const ground = groundOf(state, town);
    const worker = createUnit(state, 0, 'worker', ground.col, ground.row);
    chartEverything(state);
    bumpRevision(state);
    const economy = economyStamp(state);

    step(state, worker, at(state, town.col, town.row));

    expect(economyStamp(state)).toBe(economy);
    expectHonest(state, 0);
  });

  it('is seen for a civilian when the owner’s upkeep asks who stands in a town', () => {
    const state = board();
    const town = inlandTown(state);
    give(state, 0, [{ kind: 'upkeepRebate', free: true, where: 'garrison' }] as unknown as CardEffect[]);
    const ground = groundOf(state, town);
    const worker = createUnit(state, 0, 'worker', ground.col, ground.row);
    chartEverything(state);
    bumpRevision(state);
    const economy = economyStamp(state);

    step(state, worker, at(state, town.col, town.row));

    expect(economyStamp(state)).toBeGreaterThan(economy);
    expectHonest(state, 0);
  });

  it('reaches a rival whose row asks for a garrison at the far end of a route', () => {
    // Seat 0 sends a route to seat 1's town, and seat 1's law pays that town more if
    // the town at the far end has a garrison. Seat 0's own law says nothing about
    // garrisons, so the step cannot be gated on what the piece's owner holds. At
    // peace, because a war stops a route that crosses a border from paying.
    const state = board({ war: false });
    const origin = inlandTown(state, 0, 12, 8);
    const far = foundCityAt(state, 1, at(state, 22, 8));
    give(state, 1, [
      {
        kind: 'pays',
        where: 'city',
        gold: 5,
        scope: { test: 'routeEndsHere', farEnd: { test: 'garrisoned' } },
      },
    ] as unknown as CardEffect[]);
    const cart = createUnit(state, 0, 'trader', 12, 8);
    cart.trade = { from: origin.id, to: far.id, outbound: true };
    const ground = groundOf(state, origin);
    const soldier = createUnit(state, 0, 'warrior', ground.col, ground.row);
    chartEverything(state);
    bumpRevision(state);
    const before = readEmpire(state, 1).totals.gold;
    expectHonest(state, 1);

    step(state, soldier, at(state, origin.col, origin.row));

    expect(readEmpire(state, 1).totals.gold).toBeGreaterThan(before);
    expectHonest(state, 1);
  });
});

describe('a piece crossing its owner’s border', () => {
  it('stays unseen when the owner’s upkeep does not ask', () => {
    const state = board();
    const town = inlandTown(state);
    const ground = groundOf(state, town);
    const soldier = createUnit(state, 0, 'warrior', ground.col, ground.row);
    chartEverything(state);
    bumpRevision(state);
    const economy = economyStamp(state);

    // Out over the border one hex at a time.
    let hex = ground;
    while (state.tileOwner[hex.row * state.map.width + hex.col] === town.id) {
      const next = neighborTiles(state.map, tileHex(hex)).find((tile) => tile.col > hex.col && tile.row === hex.row);
      if (next === undefined) throw new Error('walked off the board');
      step(state, soldier, next);
      hex = next;
    }

    expect(economyStamp(state)).toBe(economy);
    expectHonest(state, 0);
  });

  it('is seen for a piece that carries a waiver of its own', () => {
    const state = board();
    const town = inlandTown(state);
    const ground = groundOf(state, town);
    const soldier = createUnit(state, 0, 'warrior', ground.col, ground.row);
    soldier.timed = [
      {
        card: 'theLongWatch' as TimedEffect['card'],
        effect: { kind: 'upkeepRebate', free: true, where: 'ownTerritory' } as unknown as CardEffect,
        expiresTurn: 9999,
      },
    ];
    chartEverything(state);
    bumpRevision(state);
    const economy = economyStamp(state);

    let hex = ground;
    while (state.tileOwner[hex.row * state.map.width + hex.col] === town.id) {
      const next = neighborTiles(state.map, tileHex(hex)).find((tile) => tile.col > hex.col && tile.row === hex.row);
      if (next === undefined) throw new Error('walked off the board');
      step(state, soldier, next);
      hex = next;
    }

    expect(economyStamp(state)).toBeGreaterThan(economy);
    expectHonest(state, 0);
  });

  it('moves an upkeep rebate that asks where the piece stands', () => {
    const state = board();
    const town = inlandTown(state);
    give(state, 0, [
      { kind: 'upkeepRebate', free: true, where: 'ownTerritory' },
    ] as unknown as CardEffect[]);
    const soldier = createUnit(state, 0, 'warrior', 20, 8);
    chartEverything(state);
    // Walked in from the east until it stands one hex outside the border.
    let hex = at(state, soldier.col, soldier.row);
    while (true) {
      const next = neighborTiles(state.map, tileHex(hex)).find((tile) => tile.col < hex.col && tile.row === hex.row);
      if (next === undefined) throw new Error('walked off the board');
      if (state.tileOwner[next.row * state.map.width + next.col] === town.id) break;
      hex = next;
    }
    soldier.col = hex.col;
    soldier.row = hex.row;
    bumpRevision(state);
    const abroad = readEmpire(state, 0).totals.gold;

    const home = neighborTiles(state.map, tileHex(hex)).find(
      (tile) => state.tileOwner[tile.row * state.map.width + tile.col] === town.id,
    )!;
    step(state, soldier, home);

    // The piece's upkeep is forgiven at home and charged abroad.
    expect(readEmpire(state, 0).totals.gold).toBeGreaterThan(abroad);
    expectHonest(state, 0);
  });

  it('moves an upkeep surcharge that asks where the piece stands', () => {
    const state = board();
    const town = inlandTown(state);
    give(state, 0, [
      { kind: 'upkeepSurcharge', amount: 7, where: 'foreignTerritory' },
    ] as unknown as CardEffect[]);
    const ground = groundOf(state, town);
    const soldier = createUnit(state, 0, 'warrior', ground.col, ground.row);
    chartEverything(state);
    bumpRevision(state);
    const home = readEmpire(state, 0).totals.gold;

    // Out over the border one hex at a time. The hex after the last owned one is abroad.
    let hex = ground;
    while (state.tileOwner[hex.row * state.map.width + hex.col] === town.id) {
      const next = neighborTiles(state.map, tileHex(hex)).find((tile) => tile.col > hex.col && tile.row === hex.row);
      if (next === undefined) throw new Error('walked off the board');
      step(state, soldier, next);
      hex = next;
    }
    expect(readEmpire(state, 0).totals.gold).toBeLessThan(home);
    expectHonest(state, 0);
  });
});

describe('a ship', () => {
  /** A route from a port to an inland town of seat 0, on a laden caravan. */
  function routed(state: GameState): { port: City; inland: City } {
    const port = foundCityAt(state, 0, at(state, 5, 4));
    const inland = foundCityAt(state, 0, at(state, 12, 4));
    port.buildings = ['granary', 'monument', 'barracks'];
    port.population = 6;
    inland.population = 6;
    const cart = createUnit(state, 0, 'trader', 12, 4);
    cart.trade = { from: port.id, to: inland.id, outbound: true };
    chartEverything(state);
    bumpRevision(state);
    return { port, inland };
  }

  it('that blockades cuts the route lines the moment it reaches the harbour mouth', () => {
    const state = board();
    const { inland } = routed(state);
    const hull = createUnit(state, 1, 'warGalley', 3, 4);
    chartEverything(state);
    bumpRevision(state);
    const open = readCity(state, inland);
    expect(open.lines.some((line) => line.source.startsWith('Blockaded'))).toBe(false);
    expectHonest(state, 0);

    step(state, hull, at(state, 4, 4));

    expect(readCity(state, inland).lines.some((line) => line.source.startsWith('Blockaded'))).toBe(true);
    expectHonest(state, 0);

    step(state, hull, at(state, 3, 4));
    expect(readCity(state, inland).lines.some((line) => line.source.startsWith('Blockaded'))).toBe(false);
    expectHonest(state, 0);
  });

  it('that cannot blockade stays out of the town’s list and out of the clock', () => {
    const state = board();
    const { inland } = routed(state);
    // Far from every town, so its sight finds nothing new either.
    const hull = createUnit(state, 1, 'trireme', 1, 16);
    chartEverything(state);
    bumpRevision(state);
    const list = readCity(state, inland);
    const economy = economyStamp(state);

    step(state, hull, at(state, 2, 16));

    expect(economyStamp(state)).toBe(economy);
    expect(readCity(state, inland)).toBe(list);
  });

  it('built just now is seen at once', () => {
    const state = board();
    const { inland } = routed(state);
    expect(readCity(state, inland).lines.some((line) => line.source.startsWith('Blockaded'))).toBe(false);
    createUnit(state, 1, 'warGalley', 4, 4);
    chartEverything(state);
    bumpRevision(state);
    expect(readCity(state, inland).lines.some((line) => line.source.startsWith('Blockaded'))).toBe(true);
  });
});

describe('a soldier while an empire holds the siege of the Opus', () => {
  it('stops the town’s hammers the moment it closes the ring', () => {
    const state = board();
    const town = inlandTown(state);
    town.population = 6;
    town.queue = [{ kind: 'building', id: 'theMagnumOpus' }];
    state.players[1]!.techsResearched.push('siegecraft');
    give(state, 1, [{ kind: 'rule', rule: 'opusSiege' }] as unknown as CardEffect[]);
    // Two soldiers on opposite hexes of the ring deny every hex of it, and the
    // second one's step is what closes the siege.
    const ring = neighborTiles(state.map, tileHex(at(state, town.col, town.row)));
    expect(ring.length).toBe(6);
    createUnit(state, 1, 'warrior', ring[0]!.col, ring[0]!.row);
    const closer = createUnit(state, 1, 'warrior', ring[2]!.col, ring[2]!.row);
    chartEverything(state);
    bumpRevision(state);
    const open = readEmpire(state, 0).towns[0]!.total.production;
    expect(open).toBeGreaterThan(0);
    expectHonest(state, 0);

    step(state, closer, ring[3]!);

    expect(readEmpire(state, 0).towns[0]!.total.production).toBe(0);
    expectHonest(state, 0);
  });

  it('leaves a soldier’s step unseen when nobody holds the rule', () => {
    const state = board();
    const soldier = createUnit(state, 1, 'warrior', 20, 8);
    chartEverything(state);
    bumpRevision(state);
    const economy = economyStamp(state);
    step(state, soldier, at(state, 21, 8));
    expect(economyStamp(state)).toBe(economy);
  });
});

describe('a laden caravan paving a road', () => {
  it('moves what the road pays and what it costs', () => {
    const state = board();
    const port = foundCityAt(state, 0, at(state, 12, 4));
    const far = foundCityAt(state, 0, at(state, 24, 4));
    give(state, 0, [
      { kind: 'pays', where: 'empire', basis: 'count', to: 'gold', amount: 5, count: 'roadHexes' },
    ] as unknown as CardEffect[]);
    const cart = createUnit(state, 0, 'trader', 18, 8);
    cart.trade = { from: port.id, to: far.id, outbound: true };
    chartEverything(state);
    bumpRevision(state);
    const before = readEmpire(state, 0).totals.gold;

    rested(cart);
    advanceAlongPath(state, cart, [{ col: 19, row: 8 }], undefined, true);

    expect(at(state, 19, 8).road).toBe(0);
    expect(readEmpire(state, 0).totals.gold).toBeGreaterThan(before);
    expectHonest(state, 0);
  });

  it('announces the paving itself, on the step that lays it', () => {
    const state = board();
    const port = foundCityAt(state, 0, at(state, 12, 4));
    const far = foundCityAt(state, 0, at(state, 24, 4));
    const cart = createUnit(state, 0, 'trader', 18, 8);
    cart.trade = { from: port.id, to: far.id, outbound: true };
    chartEverything(state);
    bumpRevision(state);
    const economy = economyStamp(state);

    rested(cart);
    advanceAlongPath(state, cart, [{ col: 19, row: 8 }], undefined, true);
    expect(economyStamp(state)).toBeGreaterThan(economy);

    // The hex is paved now, so a second walk over it writes nothing and says nothing.
    rested(cart);
    advanceAlongPath(state, cart, [{ col: 18, row: 8 }], undefined, true);
    const after = economyStamp(state);
    rested(cart);
    advanceAlongPath(state, cart, [{ col: 19, row: 8 }], undefined, true);
    expect(economyStamp(state)).toBe(after);
  });
});

describe('a walk inside a phase', () => {
  it('announces every step, because the phase reads while it runs', () => {
    const state = board();
    const soldier = createUnit(state, 0, 'warrior', 20, 8);
    chartEverything(state);
    bumpRevision(state);
    const economy = economyStamp(state);

    rested(soldier);
    advanceAlongPath(state, soldier, [{ col: 21, row: 8 }]);

    expect(economyStamp(state)).toBe(economy + 1);
  });

  it('sweeps the fog with an announcement, whatever the sweep found', () => {
    const state = board();
    createUnit(state, 0, 'warrior', 20, 8);
    chartEverything(state);
    recomputeVisibility(state, 0);
    const economy = economyStamp(state);

    recomputeVisibility(state, 0);

    expect(economyStamp(state)).toBe(economy + 1);
  });
});

describe('what a seat can see', () => {
  it('moves the count of revealed hexes when a step charts one', () => {
    const state = board();
    inlandTown(state);
    give(state, 0, [
      { kind: 'pays', where: 'empire', basis: 'count', to: 'gold', amount: 1, count: 'revealedTiles' },
    ] as unknown as CardEffect[]);
    const scout = createUnit(state, 0, 'scout', 20, 8);
    // Everything east of the scout's sight goes back under the fog.
    const grid = state.visibility[0]!;
    grid.fill(HIDDEN);
    recomputeVisibility(state, 0);
    bumpRevision(state);
    const before = readEmpire(state, 0).totals.gold;

    step(state, scout, at(state, 21, 8));

    expect(readEmpire(state, 0).totals.gold).toBeGreaterThan(before);
    expectHonest(state, 0);
  });

  it('stays still when a step charts nothing', () => {
    const state = board();
    const scout = createUnit(state, 0, 'scout', 20, 8);
    chartEverything(state);
    recomputeVisibility(state, 0);
    bumpRevision(state);
    const economy = economyStamp(state);
    const before = state.visibility[0]!.filter((level) => level > HIDDEN).length;

    step(state, scout, at(state, 21, 8));

    expect(state.visibility[0]!.filter((level) => level > HIDDEN).length).toBe(before);
    expect(economyStamp(state)).toBe(economy);
  });

  it('moves the count of camps in sight when a camp comes into view', () => {
    const state = board();
    inlandTown(state);
    give(state, 0, [
      { kind: 'pays', where: 'empire', basis: 'count', to: 'gold', amount: 5, count: 'visibleCamps' },
    ] as unknown as CardEffect[]);
    const scout = createUnit(state, 0, 'scout', 20, 8);
    chartEverything(state);
    recomputeVisibility(state, 0);
    // A camp just past the scout's sight, on ground already charted.
    let col = 21;
    while (state.visibility[0]![8 * state.map.width + col] === 2) col += 1;
    state.camps.push({ col, row: 8, foundedTurn: 0 });
    bumpRevision(state);
    const before = readEmpire(state, 0).totals.gold;

    step(state, scout, at(state, 21, 8));

    expect(readEmpire(state, 0).totals.gold).toBeGreaterThan(before);
    expectHonest(state, 0);
  });

  it('moves the count of foreign towns sighted when one comes into view', () => {
    const state = board();
    inlandTown(state);
    give(state, 0, [
      { kind: 'pays', where: 'empire', basis: 'count', to: 'gold', amount: 5, count: 'sightedCities' },
    ] as unknown as CardEffect[]);
    const scout = createUnit(state, 0, 'scout', 18, 14);
    chartEverything(state);
    recomputeVisibility(state, 0);
    // A rival's town just past the scout's sight, on ground already charted.
    let col = 19;
    while (state.visibility[0]![14 * state.map.width + col] === 2) col += 1;
    foundCityAt(state, 1, at(state, col, 14));
    chartEverything(state);
    // The two seats have met already, so only the sighting can be what is seen.
    state.players[0]!.metSeats = [1];
    bumpRevision(state);
    const before = readEmpire(state, 0).totals.gold;

    step(state, scout, at(state, 19, 14));

    expect(readEmpire(state, 0).totals.gold).toBeGreaterThan(before);
    expectHonest(state, 0);
  });

  it('moves when a seat meets another', () => {
    const state = board();
    const scout = createUnit(state, 0, 'scout', 18, 14);
    chartEverything(state);
    recomputeVisibility(state, 0);
    let col = 19;
    while (state.visibility[0]![14 * state.map.width + col] === 2) col += 1;
    createUnit(state, 1, 'warrior', col, 14);
    state.players[0]!.metSeats = [];
    chartEverything(state);
    bumpRevision(state);
    const economy = economyStamp(state);

    step(state, scout, at(state, 19, 14));

    expect(state.players[0]!.metSeats).toEqual([1]);
    expect(economyStamp(state)).toBeGreaterThan(economy);
  });
});

describe('the water beside a town', () => {
  it('is found off the map, and a town inland has none', () => {
    const state = board();
    const inland = inlandTown(state);
    createUnit(state, 1, 'warGalley', 4, 4);
    chartEverything(state);
    bumpRevision(state);
    const ring = neighborTiles(state.map, tileHex(at(state, inland.col, inland.row)));
    expect(ring.some((tile) => isWaterTerrain(tile.terrain))).toBe(false);
    expect(readCity(state, inland).lines.some((line) => line.source.startsWith('Blockaded'))).toBe(false);
  });
});
