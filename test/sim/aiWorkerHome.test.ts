/**
 * **BP15: a worker stays home while its work is in danger** (`docs/flags.md`,
 * the bullet "BP15: more bot speed, with caching, and the worker that stays
 * home"; the user: *"worker should stay home yes"*).
 *
 * BP13c found that 26 of 98 step-backs were a worker that started the turn in
 * its own town, walked out to work and stepped back in the same turn. A worker
 * in its town read no threat, so each sitting sent it back out. The rule now: a
 * worker does not march to a hex that a hostile can reach within
 * `workers.guardTurns` turns, by the guard arm's own reading, unless a soldier
 * of the seat holds the hex or a guard reaches it first.
 *
 * The tests here:
 *
 *   - a worker in its town walks to a hex the hostile cannot reach in time,
 *     not to the threatened hex the plan ranks first;
 *   - with every hex of its ground threatened it sleeps in its town, and the
 *     next turn, with the danger gone, it goes to work;
 *   - a soldier of the seat on a threatened hex makes that hex safe;
 *   - a worker whose march ends on a hex that is now threatened, with no safe
 *     hex to take, stops its march, so its claim is released.
 *
 * Each board is arranged by hand (`aiWorkerHold.test.ts`' bench), and every
 * command the file expects is put to the reducer.
 */

import { describe, expect, it } from 'vitest';

import { botSitting, nextBotDecision } from '../../src/ai/bot';
import type { BotDecision } from '../../src/ai/decision';
import { foundCityAt } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { type GameMap, type Tile, createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { findPath, pathTurns } from '../../src/sim/pathfind';
import { type City, type GameState, type Unit, bumpRevision, createUnit, playerById } from '../../src/sim/state';
import { researchExpansion } from '../../src/sim/tech';
import { fullMovement } from '../../src/sim/units';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { openWar } from '../../src/sim/wars';
import { newGame } from './newGameHelpers';

/** A blank state on flat ground with two seats. */
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
  const height = 14;
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

/**
 * Seat 0's town at (`col`, `row`) with its garrison (its last defender, so no
 * guard can be spared), holding the ground within `reach` columns and rows.
 */
function homeTown(state: GameState, col: number, row: number, reach: number): City {
  const town = foundCityAt(state, 0, at(state.map, col, row));
  createUnit(state, 0, 'warrior', town.col, town.row);
  for (let c = col - reach; c <= col + reach; c++) {
    for (let r = row - reach; r <= row + reach; r++) state.tileOwner[tileIndex(state.map, c, r)] = town.id;
  }
  bumpRevision(state);
  return town;
}

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

/** The turns the hostile needs to walk onto the hex, with its full allowance, or `null`. */
function hostileTurns(state: GameState, hostile: Unit, col: number, row: number): number | null {
  const route = findPath(state, hostile, at(state.map, col, row));
  if (route === null) return null;
  const full = fullMovement(hostile, state);
  return pathTurns(state, hostile, route, { left: full, refill: full });
}

/** The hexes a worker's decisions sent it to. */
function marchesOf(sent: readonly BotDecision[], unit: Unit): { col: number; row: number }[] {
  return about(sent, unit)
    .map((decision) => decision.command)
    .filter((command) => command.type === 'moveUnit')
    .map((command) => (command as { target: { col: number; row: number } }).target);
}

describe('a worker stays home while its work is in danger (bot batch BP15)', () => {
  it('walks to a hex the hostile cannot reach in time, not to the one it can', () => {
    const state = bench();
    homeTown(state, 6, 6, 4);
    farming(state);
    const worker = createUnit(state, 0, 'worker', 6, 6);
    openWar(state, 0, 1);
    // A raider north of the town, inside the seat's sight: the hexes north of
    // the town are within its two turns, the hexes south are not.
    const raider = createUnit(state, 1, 'warrior', 6, 2);
    recomputeAllVisibility(state);
    const marches = marchesOf(sit(state), worker);
    expect(marches.length, 'the worker goes out to work').toBeGreaterThan(0);
    for (const target of marches) {
      const turns = hostileTurns(state, raider, target.col, target.row);
      expect(turns === null || turns > 2, `(${target.col},${target.row}) is ${turns} turns from the raider`).toBe(true);
    }
  });

  it('sleeps in its town when every hex is threatened, and works when the danger has gone', () => {
    const state = bench();
    homeTown(state, 6, 6, 1);
    farming(state);
    const worker = createUnit(state, 0, 'worker', 6, 6);
    openWar(state, 0, 1);
    // Two hexes from the town: every hex of the town's ring is within its reach.
    const raider = createUnit(state, 1, 'warrior', 6, 8);
    recomputeAllVisibility(state);
    const orders = about(sit(state), worker);
    for (const order of orders) expect(order.command.type, order.summary).not.toBe('moveUnit');
    expect([worker.col, worker.row]).toEqual([6, 6]);
    expect(worker.sleeping, 'it sleeps, so it is asked again next turn').toBe(true);
    // The next turn, with the raider gone, it is a fresh question.
    state.units = state.units.filter((unit) => unit.id !== raider.id);
    worker.movesLeft = 2;
    state.turn += 1;
    bumpRevision(state);
    recomputeAllVisibility(state);
    const next = about(sit(state), worker);
    expect(next.some((decision) => decision.command.type === 'moveUnit')).toBe(true);
    expect(next[0]?.summary).toMatch(/^Rouses a sleeping worker/);
  });

  it('takes a threatened hex that a soldier of the seat holds', () => {
    /** The town and one hex of ground beside it, (6,7), next to a raider. */
    function board(guarded: boolean): { state: GameState; worker: Unit } {
      const state = bench();
      const town = homeTown(state, 6, 6, 0);
      state.tileOwner.fill(null);
      state.tileOwner[tileIndex(state.map, 6, 6)] = town.id;
      state.tileOwner[tileIndex(state.map, 6, 7)] = town.id;
      farming(state);
      const worker = createUnit(state, 0, 'worker', 6, 6);
      openWar(state, 0, 1);
      createUnit(state, 1, 'warrior', 6, 8);
      if (guarded) {
        // A second soldier, so the town keeps its garrison, dug in on the hex.
        const guard = createUnit(state, 0, 'warrior', 6, 7);
        guard.fortifiedTurns = 1;
      }
      recomputeAllVisibility(state);
      return { state, worker };
    }
    const alone = board(false);
    expect(marchesOf(sit(alone.state), alone.worker), 'with no guard it stays home').toEqual([]);
    const held = board(true);
    expect(marchesOf(sit(held.state), held.worker)).toEqual([{ col: 6, row: 7 }]);
  });

  it('stops a march to a hex that is now threatened, which releases its claim', () => {
    const state = bench();
    homeTown(state, 6, 6, 1);
    farming(state);
    // Under a march to the ring's far hex, still standing in the town.
    const worker = createUnit(state, 0, 'worker', 6, 6);
    worker.path = [{ col: 6, row: 7 }];
    openWar(state, 0, 1);
    createUnit(state, 1, 'warrior', 6, 8);
    recomputeAllVisibility(state);
    const orders = about(sit(state), worker);
    expect(orders[0]?.command.type, orders[0]?.summary).toBe('cancelOrder');
    expect(orders[0]?.summary).toContain('Stops its march to (6,7)');
    expect(worker.path === undefined || worker.path.length === 0).toBe(true);
    expect([worker.col, worker.row]).toEqual([6, 6]);
  });
});
