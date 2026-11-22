/**
 * **BP13c: a worker that steps back stays there for the turn, and a sleeping
 * worker is asked before a town decides its build** (`docs/flags.md`, the
 * bullet "BP13c: after the worker fixes. Ruled 2026-11-17"; the user: *"is the
 * sleeped worker every awoken? If not the fix should be to wake villagers
 * before deciding to build new ones"*).
 *
 * The tests here:
 *
 *   - a worker that steps back into its town with movement left is not ordered
 *     out again in the same sitting, and is asked again the next turn;
 *   - a sleeping worker is asked before a town with an empty queue chooses its
 *     build in the same sitting;
 *   - the price of a new worker counts the charges of a sleeping worker;
 *   - the gold book holds no worker, and the faith book holds none while the
 *     seat has a worker, asleep or awake.
 *
 * Each board is arranged by hand (`aiWorkerGuards.test.ts`' bench), and every
 * command the file expects is put to the reducer.
 */

import { describe, expect, it } from 'vitest';

import { botSitting, nextBotDecision, valueContext } from '../../src/ai/bot';
import type { BotDecision } from '../../src/ai/decision';
import { buildImprovementPlan, explainWorkerCraving } from '../../src/ai/plan';
import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { type GameMap, type Tile, createMap, getTileAt, tileIndex, tileNeighbors } from '../../src/sim/map';
import { type City, type GameState, type Unit, addBuilding, bumpRevision, createUnit, playerById } from '../../src/sim/state';
import { researchExpansion } from '../../src/sim/tech';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { openWar } from '../../src/sim/wars';
import { newGame } from './newGameHelpers';

/** A blank state on flat ground with two seats, `aiWorkerGuards.test.ts`' bench. */
function bench(): GameState {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a' },
    ],
  });
  const width = 24;
  const height = 12;
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** Seat 0's town at (4,5) with its garrison, holding the ground from column 1 to 9. */
function homeTown(state: GameState): City {
  const town = foundCityAt(state, 0, at(state.map, 4, 5));
  createUnit(state, 0, 'warrior', town.col, town.row);
  for (let col = 1; col <= 9; col++) {
    for (let row = 1; row <= 9; row++) state.tileOwner[tileIndex(state.map, col, row)] = town.id;
  }
  bumpRevision(state);
  return town;
}

/** Seat 0's decisions in one sitting, each put to the reducer. */
function sit(state: GameState, limit = 80): BotDecision[] {
  const sitting = botSitting(0);
  const sent: BotDecision[] = [];
  for (let step = 0; step < limit; step++) {
    const decision = nextBotDecision(state, 0, sitting);
    if (decision === null) break;
    const result = applyCommand(state, decision.command);
    expect(result.ok, `${decision.command.type}: ${result.ok ? '' : result.error}`).toBe(true);
    sent.push(decision);
  }
  return sent;
}

function about(sent: readonly BotDecision[], unit: Unit): BotDecision[] {
  return sent.filter((decision) => (decision.command as { unitId?: number }).unitId === unit.id);
}

describe('workers act on the improvements their seat has unlocked', () => {
  it('keeps specialist-only works out of a custom worker roster', () => {
    const state = bench();
    homeTown(state);
    const player = playerById(state, 0)!;
    recomputeAllVisibility(state);
    const base = valueContext(state, player);
    const ctx = { ...base, ai: { ...base.ai, workers: { ...base.ai.workers, improvements: ['academy'] } } };
    expect(buildImprovementPlan(state, player, ctx).entries.some(entry => entry.improvement === 'academy')).toBe(false);
  });

  it.each(['stoneCircle', 'cliffMonastery', 'smelter', 'physicGarden', 'qanat', 'paradiseGarden'] as const)(
    'builds %s on a suitable worked tile after its unlock', id => {
      const state = bench();
      const city = homeTown(state);
      const player = playerById(state, 0)!;
      const tile = at(state.map, city.col + 1, city.row);
      const near = tileNeighbors(state.map, tile).find(near => near.col !== city.col)!;
      city.population = 4;
      city.lockedTiles = [{ col: tile.col, row: tile.row }];
      if (id === 'cliffMonastery') {
        near.terrain = 'mountain';
        tile.mountainsBeside = 1;
      }
      if (id === 'qanat') near.hills = true;
      if (id === 'smelter') near.improvement = 'mine';
      if (id === 'paradiseGarden' || id === 'physicGarden') tile.freshwater = true;
      refreshCityDerived(state, city);
      const worker = createUnit(state, 0, 'worker', tile.col, tile.row);
      recomputeAllVisibility(state);
      const plan = () => buildImprovementPlan(state, player, valueContext(state, player));
      expect(plan().entries.some(entry => entry.improvement === id)).toBe(false);
      if (id === 'stoneCircle') player.statecraft.orders.push('theMegaliths');
      if (id === 'cliffMonastery') player.statecraft.orders.push('theCliffMonasteries');
      if (id === 'smelter') player.techsResearched.push('smelting');
      if (id === 'qanat') player.techsResearched.push('surveying');
      if (id === 'physicGarden') player.techsResearched.push('herbals');
      if (id === 'paradiseGarden') player.leader = 'cyrusTheGreat';
      bumpRevision(state);
      expect(plan().byTile.get(tileIndex(state.map, tile.col, tile.row))?.improvement).toBe(id);
      const orders = about(sit(state), worker).map(d => d.command);
      expect(orders).toContainEqual(expect.objectContaining({ type: 'buildImprovement', improvement: id }));
      expect(tile.improvement).toBe(id);
      const cityPlots = plan().entries.filter(entry => state.tileOwner[tileIndex(state.map, entry.col, entry.row)] === city.id);
      expect(cityPlots.some(entry => entry.improvement === id)).toBe(false);
    }
  );
});

describe('a worker that steps back stays there for the turn', () => {
  it('is not ordered out of its town again in the same sitting', () => {
    const state = bench();
    homeTown(state);
    // One hex from its town, and a hostile two hexes off that can take it in
    // its next move. The town's garrison is its last defender, so no guard comes.
    const worker = createUnit(state, 0, 'worker', 5, 5);
    openWar(state, 0, 1);
    createUnit(state, 1, 'warrior', 7, 5);
    recomputeAllVisibility(state);
    const orders = about(sit(state), worker);
    expect(orders[0]?.summary).toMatch(/^Steps back to its town/);
    // It reached the town with movement in hand, so it was asked again; the
    // answer keeps it there.
    for (const later of orders.slice(1)) {
      expect(later.command.type, later.summary).not.toBe('moveUnit');
    }
    expect([worker.col, worker.row]).toEqual([4, 5]);
  });

  it('is asked again at the next sitting, and works when the danger has gone', () => {
    const state = bench();
    homeTown(state);
    const worker = createUnit(state, 0, 'worker', 5, 5);
    openWar(state, 0, 1);
    const raider = createUnit(state, 1, 'warrior', 7, 5);
    recomputeAllVisibility(state);
    sit(state);
    expect([worker.col, worker.row]).toEqual([4, 5]);
    // The next turn, with the raider gone: the worker is a fresh question.
    state.units = state.units.filter((unit) => unit.id !== raider.id);
    worker.movesLeft = 2;
    state.turn += 1;
    bumpRevision(state);
    recomputeAllVisibility(state);
    const next = about(sit(state), worker);
    expect(next.some((decision) => decision.command.type === 'moveUnit' || decision.command.type === 'buildImprovement')).toBe(true);
  });
});

/** The two technologies a worker needs to lay farms and mines. */
function farming(state: GameState): void {
  const player = playerById(state, 0)!;
  for (const goal of ['agriculture', 'mining'] as const) {
    for (const step of [...researchExpansion(state, 0, goal), goal]) {
      if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
    }
  }
  bumpRevision(state);
}

describe('a sleeping worker is asked before a town decides its build', () => {
  it('rouses the sleeping worker before the town with an empty queue chooses', () => {
    const state = bench();
    const town = homeTown(state);
    farming(state);
    town.queue = [];
    const worker = createUnit(state, 0, 'worker', 6, 5);
    worker.sleeping = true;
    recomputeAllVisibility(state);
    const sent = sit(state);
    const woken = sent.findIndex((decision) => (decision.command as { unitId?: number }).unitId === worker.id);
    const built = sent.findIndex((decision) => decision.command.type === 'setCityProduction');
    expect(woken, 'the worker is asked').toBeGreaterThanOrEqual(0);
    expect(sent[woken]!.summary).toMatch(/^Rouses a sleeping worker/);
    expect(built, 'the town chooses').toBeGreaterThanOrEqual(0);
    expect(woken).toBeLessThan(built);
  });
});

describe('the price of a new worker counts a sleeping worker', () => {
  function craving(state: GameState, city: City): number {
    const player = playerById(state, 0)!;
    const ctx = valueContext(state, player);
    const plan = buildImprovementPlan(state, player, ctx);
    return explainWorkerCraving(plan, state, city, ctx, 'worker').total;
  }

  it('reads a sleeping worker\'s charges as it reads an awake one\'s', () => {
    const state = bench();
    const town = homeTown(state);
    town.population = 3;
    refreshCityDerived(state, town);
    farming(state);
    recomputeAllVisibility(state);
    const alone = craving(state, town);
    expect(alone).toBeGreaterThan(0);
    const worker = createUnit(state, 0, 'worker', 5, 5);
    bumpRevision(state);
    const awake = craving(state, town);
    expect(awake).toBeLessThan(alone);
    worker.sleeping = true;
    bumpRevision(state);
    expect(craving(state, town)).toBe(awake);
  });
});

describe('no other book adds a worker while one sleeps', () => {
  /** The rows of a book that buy a worker. */
  function workerRows(state: GameState, book: 'gold' | 'faith'): number {
    const ctx = valueContext(state, playerById(state, 0)!);
    const wants = book === 'gold' ? ctx.wants.gold : ctx.wants.faith;
    return wants.filter((want) => want.buy?.item.kind === 'unit' && want.buy.item.id === 'worker').length;
  }

  it('the gold book holds no worker, and the faith book holds one only while the seat has none', () => {
    const state = bench();
    const town = homeTown(state);
    farming(state);
    // A town that sells civilians for faith, and the faith to buy one.
    addBuilding(state, town, 'almshouse');
    playerById(state, 0)!.faithPool = 2000;
    playerById(state, 0)!.gold = 2000;
    bumpRevision(state);
    expect(workerRows(state, 'gold')).toBe(0);
    expect(workerRows(state, 'faith')).toBeGreaterThan(0);
    const worker = createUnit(state, 0, 'worker', 6, 5);
    worker.sleeping = true;
    bumpRevision(state);
    expect(workerRows(state, 'gold')).toBe(0);
    expect(workerRows(state, 'faith')).toBe(0);
  });
});
