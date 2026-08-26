/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — the four readers
 * of `stepCost`, agreed over rough random boards.
 *
 * A sweep by nature: twenty-five generated boards of mixed terrain with pickets
 * scattered on them, and for **every** tile the reachable-set sweep highlights,
 * the route is planned and then actually walked. That is the claim Entry XXV
 * cares about — a highlight computed by one rule and walked by another is a
 * promise the march does not keep — and it can only be made by trying every
 * highlighted hex on boards nobody laid out by hand.
 *
 * `zoc.test.ts` keeps the rule matrix itself, which is asked of one picket on a
 * board built for the question: what a slide costs, what walking out of contact
 * costs, that a civilian exerts nothing, that two enemies do not chain, that the
 * wild is a seat like any other, that the "~N turns" estimate reads the same
 * evaluator, and that a game full of marches along a picket replays.
 */
import { describe, expect, it } from 'vitest';
import { advanceAlongPath } from '../../src/sim/movement';
import { findPath, reachableTiles } from '../../src/sim/pathfind';
import type { GameState } from '../../src/sim/state';
import type { UnitTypeId } from '../../src/sim/unitData';
import { flatState, unit } from './zocHelpers';

/** A tiny deterministic generator, so a failing board can be reproduced. */
function lcg(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return ((s >>> 8) & 0xffffff) / 0x1000000;
  };
}

/** A rough board: mixed terrain, mixed features, and pickets scattered on it. */
function randomBoard(seed: number): GameState {
  const state = flatState(11, 9);
  const rand = lcg(seed);
  for (const tile of state.map.tiles) {
    const roll = rand();
    if (roll < 0.1) tile.terrain = 'mountain';
    else if (roll < 0.2) tile.feature = 'forest';
    else if (roll < 0.28) tile.hills = true;
    else if (roll < 0.33) {
      tile.feature = 'jungle';
      tile.hills = true;
    }
  }
  const open = state.map.tiles.filter((tile) => tile.terrain !== 'mountain');
  const types: UnitTypeId[] = ['warrior', 'scout', 'chariotArcher'];
  for (let i = 0; i < 6; i++) {
    const tile = open[Math.floor(rand() * open.length)]!;
    if (state.units.some((u) => u.col === tile.col && u.row === tile.row)) continue;
    // Combat units only: an arrival on this board must change nothing but the
    // mover, so the save/restore below is exact.
    unit(state, tile, types[Math.floor(rand() * types.length)]!, i % 2);
  }
  return state;
}

describe('one evaluator: the sweep, the route and the walk agree', () => {
  it('walks to every tile the sweep highlighted, on rough random boards', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const state = randomBoard(seed);
      for (const mover of state.units.filter((u) => u.ownerId === 0)) {
        const home = { col: mover.col, row: mover.row, movesLeft: mover.movesLeft };
        for (const { tile } of reachableTiles(state, mover)) {
          const path = findPath(state, mover, tile);
          expect(path, `seed ${seed}: no route to a highlighted tile`).not.toBeNull();
          advanceAlongPath(state, mover, path!);
          expect(
            [mover.col, mover.row],
            `seed ${seed}: highlighted (${tile.col},${tile.row}) was not reached`,
          ).toEqual([tile.col, tile.row]);
          expect(mover.path, `seed ${seed}: the march did not finish`).toBeUndefined();
          mover.col = home.col;
          mover.row = home.row;
          mover.movesLeft = home.movesLeft;
          delete mover.fortifiedTurns;
        }
      }
    }
  });

});
