/**
 * **The route memo gives back only what the search would find again** (bot
 * batch BP13, `src/ai/routeMemo.ts`).
 *
 * The escort plan asks its route searches through a memo kept for a sitting.
 * A kept answer must be the answer `findPath`, `findPathToFirst` and
 * `pathTurns` give on the board as it stands, or the bots would decide
 * differently (the digest pins in `aiDigest.slow.test.ts` hold the same claim
 * for two whole games). These tests pin it three ways:
 *
 *   - by case: a piece of the seat walking inland keeps a route; a piece of
 *     another seat, or the seat's own piece on the goal, does not;
 *   - by a long random walk on a board with water, other seats' pieces and a
 *     mover that may embark: after every move, every kept answer equals a
 *     fresh search;
 *   - the floor the memo's ellipse is drawn with (`searchFloor`, the mirror of
 *     `pathfind.ts`' private `cheapestStepCostFor`) is no more than any step on
 *     a generated map costs, which is the fact the ellipse rests on.
 */

import { describe, expect, it } from 'vitest';

import { memoPath, memoPathToFirst, memoTurns, routeMemo, routeMemoTally, searchFloor } from '../../src/ai/routeMemo';
import { type GameMap, type Tile, createMap, getTileAt, mapRange, tileHex } from '../../src/sim/map';
import { findPath, findPathToFirst, moveProfile, pathTurns, stepCost, zocField } from '../../src/sim/pathfind';
import { makeRng, nextFloat, nextInt } from '../../src/sim/rng';
import { type GameState, type Unit, bumpRevision, createUnit, playerById } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';
import { openWar } from '../../src/sim/wars';
import { createGame, newGame } from './newGameHelpers';

function bench(width = 20, height = 12): GameState {
  const state = newGame({
    seed: 5,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a' },
    ],
  });
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

/** Moves a piece by hand, as a command would, and says so to the revision. */
function place(state: GameState, unit: Unit, col: number, row: number): void {
  unit.col = col;
  unit.row = row;
  bumpRevision(state);
}

describe('the route memo, by case', () => {
  it('keeps a route while a piece of the seat walks inland', () => {
    const state = bench();
    const soldier = createUnit(state, 0, 'warrior', 2, 5);
    const other = createUnit(state, 0, 'warrior', 2, 8);
    const goal = at(state.map, 12, 5);
    const memo = routeMemo(0);
    const kept = routeMemoTally.kept;
    expect(memoPath(memo, state, soldier, goal)).toEqual(findPath(state, soldier, goal));
    place(state, other, 3, 9);
    expect(memoPath(memo, state, soldier, goal)).toEqual(findPath(state, soldier, goal));
    expect(routeMemoTally.kept).toBe(kept + 1);
  });

  it('asks again when a piece of another seat moves', () => {
    const state = bench();
    const soldier = createUnit(state, 0, 'warrior', 2, 5);
    openWar(state, 0, 1);
    const enemy = createUnit(state, 1, 'warrior', 18, 1);
    const goal = at(state.map, 12, 5);
    const memo = routeMemo(0);
    const before = memoPath(memo, state, soldier, goal);
    // Into the road: a wall now, and a zone of control beside it.
    place(state, enemy, 7, 5);
    const kept = routeMemoTally.kept;
    const after = memoPath(memo, state, soldier, goal);
    expect(routeMemoTally.kept).toBe(kept);
    expect(after).toEqual(findPath(state, soldier, goal));
    expect(after).not.toEqual(before);
  });

  it('asks again when a piece of the seat stands on the goal', () => {
    const state = bench();
    const soldier = createUnit(state, 0, 'warrior', 2, 5);
    const other = createUnit(state, 0, 'warrior', 2, 8);
    const goal = at(state.map, 12, 5);
    const memo = routeMemo(0);
    expect(memoPath(memo, state, soldier, goal)).not.toBeNull();
    // Two soldiers may not share a hex, so the goal is closed to it now.
    place(state, other, 12, 5);
    expect(memoPath(memo, state, soldier, goal)).toBeNull();
    expect(findPath(state, soldier, goal)).toBeNull();
  });
});

describe('the route memo, on a long random walk', () => {
  it('gives the search\'s own answer after every move', () => {
    const state = bench(22, 14);
    // A lake in the middle, and a coast on the east side, so routes cross and
    // skirt water.
    for (const tile of mapRange(state.map, tileHex(at(state.map, 10, 7)), 2)) tile.terrain = 'lake';
    for (let row = 0; row < 14; row++) for (const col of [19, 20, 21]) at(state.map, col, row).terrain = 'coast';
    const seat = playerById(state, 0)!;
    seat.techsResearched.push('sailing' as never, 'wayfinding' as never);
    openWar(state, 0, 1);
    const rng = makeRng(20261116);
    const land = (): Tile => {
      for (;;) {
        const tile = at(state.map, nextInt(rng, 0, 22), nextInt(rng, 0, 14));
        if (tile.terrain === 'grassland') return tile;
      }
    };
    const ours: Unit[] = [];
    for (const type of ['warrior', 'warrior', 'settler', 'worker', 'worker', 'warrior']) {
      const tile = land();
      ours.push(createUnit(state, 0, type as never, tile.col, tile.row));
    }
    const theirs: Unit[] = [];
    for (let i = 0; i < 3; i++) {
      const tile = land();
      theirs.push(createUnit(state, 1, 'warrior', tile.col, tile.row));
    }
    const memo = routeMemo(0);
    const goals = [at(state.map, 4, 2), at(state.map, 15, 11), at(state.map, 18, 7), at(state.map, 2, 12)];
    let checked = 0;
    const keptBefore = routeMemoTally.kept;
    for (let step = 0; step < 160; step++) {
      // Mostly the seat's own pieces move, now and then another seat's, and a
      // piece's movement left changes as a march spends it.
      const mover = nextFloat(rng) < 0.8 ? ours[nextInt(rng, 0, ours.length)]! : theirs[nextInt(rng, 0, theirs.length)]!;
      const tile = nextFloat(rng) < 0.3 ? at(state.map, nextInt(rng, 0, 22), nextInt(rng, 0, 14)) : land();
      if (state.units.some((unit) => unit !== mover && unit.col === tile.col && unit.row === tile.row)) continue;
      mover.col = tile.col;
      mover.row = tile.row;
      mover.movesLeft = nextInt(rng, 0, 3);
      bumpRevision(state);
      for (const searcher of ours) {
        for (const goal of goals) {
          const route = memoPath(memo, state, searcher, goal);
          expect(route).toEqual(findPath(state, searcher, goal));
          if (route !== null) expect(memoTurns(memo, state, searcher, route)).toBe(pathTurns(state, searcher, route));
          checked += 1;
        }
        const first = memoPathToFirst(memo, state, searcher, goals);
        expect(first).toEqual(findPathToFirst(state, searcher, goals));
      }
    }
    expect(checked).toBeGreaterThan(2000);
    // And the memo did answer from what it kept, or the walk proves nothing.
    expect(routeMemoTally.kept - keptBefore).toBeGreaterThan(1000);
  });
});

describe('the floor the memo draws its ellipse with', () => {
  it('is no more than any step on a generated map costs', () => {
    const game = createGame({
      seed: 42,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#a00' },
        { name: 'Bors', color: '#00a' },
      ],
    });
    const { state } = game;
    const seat = playerById(state, 0)!;
    seat.techsResearched.push('sailing' as never, 'wayfinding' as never);
    const pieces = ['warrior', 'settler', 'scout'].map((type) => createUnit(state, 0, type as never, 0, 0));
    const field = zocField(state, 0);
    for (const piece of pieces) {
      const mover = moveProfile(state, piece);
      const floor = searchFloor(mover);
      for (const tile of state.map.tiles) {
        for (const next of mapRange(state.map, tileHex(tile), 1)) {
          if (next === tile) continue;
          const price = stepCost(state.map, tile, next, mover, field);
          if (price !== null) expect(price.cost).toBeGreaterThanOrEqual(floor);
        }
      }
    }
  });
});
