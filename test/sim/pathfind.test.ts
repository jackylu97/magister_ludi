import { describe, expect, it } from 'vitest';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import {
  canStopOn,
  canTransit,
  findPath,
  isPassable,
  reachableTiles,
  tileMoveCost,
} from '../../src/sim/pathfind';
import { type GameState, type Unit, createUnit, newGame } from '../../src/sim/state';
import { moveCost } from '../../src/sim/terrainData';
import { type UnitTypeId, unitDef } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';

/** A blank state whose map is a flat grassland rectangle, ready to be sculpted. */
function flatState(width = 10, height = 8): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  // The board was replaced under this state; the fog grids were sized for the
  // old one. See `resetVisibility`.
  resetVisibility(state);
  state.units = [];
  state.nextEntityId = 1;
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function unit(
  state: GameState,
  col: number,
  row: number,
  type: UnitTypeId = 'warrior',
  ownerId = 0,
): Unit {
  return createUnit(state, ownerId, type, col, row);
}

/**
 * What a path costs `type` to walk, tile by tile.
 *
 * Takes the unit type rather than only the map because `tileMoveCost` does: the
 * price of a step is a fact about the destination *and* the mover. A helper that
 * had kept quoting the ground's own price would agree with the searches for
 * every unit but the one this parameter exists for.
 */
function cost(
  state: GameState,
  path: readonly { col: number; row: number }[],
  type: UnitTypeId = 'warrior',
): number {
  let total = 0;
  for (const step of path) {
    total += tileMoveCost(at(state.map, step.col, step.row), unitDef(type))!;
  }
  return total;
}

describe('tileMoveCost', () => {
  it('reads the plain terrain cost', () => {
    expect(moveCost('grassland', 'none', false)).toBe(1);
    expect(moveCost('plains', 'none', false)).toBe(1);
    expect(moveCost('desert', 'none', false)).toBe(1);
    expect(moveCost('tundra', 'none', false)).toBe(1);
    expect(moveCost('snow', 'none', false)).toBe(1);
  });

  it('reports impassable terrain as null', () => {
    expect(moveCost('mountain', 'none', false)).toBeNull();
    expect(moveCost('ocean', 'none', false)).toBeNull();
    expect(moveCost('coast', 'none', false)).toBeNull();
  });

  it('lets a feature override the terrain cost rather than add to it', () => {
    expect(moveCost('grassland', 'forest', false)).toBe(2);
    expect(moveCost('plains', 'forest', false)).toBe(2);
    expect(moveCost('grassland', 'jungle', false)).toBe(2);
  });

  it('adds the hills surcharge on top of whichever base won', () => {
    expect(moveCost('grassland', 'none', true)).toBe(2);
    // The documented combination: override (2) + hills extra (1).
    expect(moveCost('grassland', 'forest', true)).toBe(3);
    expect(moveCost('plains', 'jungle', true)).toBe(3);
  });

  it('keeps impassable terrain impassable whatever sits on it', () => {
    expect(moveCost('mountain', 'forest', true)).toBeNull();
    expect(moveCost('ocean', 'forest', false)).toBeNull();
  });

  it('agrees with the tile-level helper', () => {
    const state = flatState();
    const tile = at(state.map, 3, 3);
    tile.feature = 'forest';
    tile.hills = true;
    expect(tileMoveCost(tile)).toBe(3);
    expect(isPassable(tile)).toBe(true);
    tile.terrain = 'mountain';
    expect(tileMoveCost(tile)).toBeNull();
    expect(isPassable(tile)).toBe(false);
  });
});

describe('findPath', () => {
  it('walks a straight line at one point per tile', () => {
    const state = flatState();
    const scout = unit(state, 1, 2, 'scout');
    const path = findPath(state, scout, at(state.map, 5, 2))!;
    expect(path).toEqual([
      { col: 2, row: 2 },
      { col: 3, row: 2 },
      { col: 4, row: 2 },
      { col: 5, row: 2 },
    ]);
    expect(cost(state, path)).toBe(4);
  });

  it('excludes the start tile and includes the goal', () => {
    const state = flatState();
    const warrior = unit(state, 1, 2);
    const path = findPath(state, warrior, at(state.map, 3, 2))!;
    expect(path[0]).toEqual({ col: 2, row: 2 });
    expect(path[path.length - 1]).toEqual({ col: 3, row: 2 });
  });

  it('refuses a path to the tile the unit is already on', () => {
    const state = flatState();
    const warrior = unit(state, 4, 4);
    expect(findPath(state, warrior, at(state.map, 4, 4))).toBeNull();
  });

  it('accumulates feature and hills costs along the route', () => {
    const state = flatState();
    at(state.map, 2, 2).feature = 'forest'; // 2
    at(state.map, 3, 2).hills = true; // 2
    at(state.map, 4, 2).feature = 'jungle';
    at(state.map, 4, 2).hills = true; // 3
    const warrior = unit(state, 1, 2);
    const path = findPath(state, warrior, at(state.map, 5, 2))!;
    // The detour around the expensive strip is longer but not cheaper here:
    // whatever route wins, the pathfinder must report its true cost.
    expect(cost(state, path)).toBeLessThanOrEqual(2 + 2 + 3 + 1);
    expect(cost(state, path)).toBeGreaterThanOrEqual(4);
  });

  it('prefers a longer cheap route over a shorter expensive one', () => {
    // Wide enough that going the other way round the cylinder is no shortcut.
    const state = flatState(20, 8);
    // A belt of forest along row 2 makes the straight line cost 2 per tile.
    for (let col = 1; col <= 5; col++) at(state.map, col, 2).feature = 'forest';
    const warrior = unit(state, 0, 2);
    const path = findPath(state, warrior, at(state.map, 6, 2))!;
    // Straight through is 5 forest (10) plus the goal (1) = 11; slipping into
    // the neighbouring row and back costs 7 steps of clear ground.
    expect(cost(state, path)).toBe(7);
    expect(path.some((step) => step.row !== 2)).toBe(true);
  });

  it('never routes through impassable tiles', () => {
    const state = flatState();
    for (let row = 0; row < state.map.height; row++) {
      if (row === 5) continue; // one gap in the mountain range
      at(state.map, 4, row).terrain = 'mountain';
    }
    const warrior = unit(state, 2, 1);
    const path = findPath(state, warrior, at(state.map, 6, 1))!;
    for (const step of path) {
      expect(at(state.map, step.col, step.row).terrain).not.toBe('mountain');
    }
    // Either through the gap or around the seam — never through the rock.
    expect(path.length).toBeGreaterThan(4);
  });

  it('returns null when the goal is walled off', () => {
    const state = flatState(9, 7);
    // Ring the goal in mountains.
    for (const [col, row] of [
      [3, 3],
      [4, 3],
      [3, 4],
      [5, 4],
      [3, 5],
      [4, 5],
    ] as const) {
      at(state.map, col, row).terrain = 'mountain';
    }
    const warrior = unit(state, 0, 0);
    expect(findPath(state, warrior, at(state.map, 4, 4))).toBeNull();
  });

  it('returns null for an impassable goal', () => {
    const state = flatState();
    at(state.map, 5, 5).terrain = 'ocean';
    const warrior = unit(state, 1, 5);
    expect(findPath(state, warrior, at(state.map, 5, 5))).toBeNull();
  });

  it('crosses the east–west seam when that is the short way round', () => {
    const state = flatState(12, 6);
    const warrior = unit(state, 0, 2);
    const path = findPath(state, warrior, at(state.map, 9, 2))!;
    expect(path).toEqual([
      { col: 11, row: 2 },
      { col: 10, row: 2 },
      { col: 9, row: 2 },
    ]);
    expect(cost(state, path)).toBe(3);
  });

  it('is deterministic: identical inputs give an identical path', () => {
    const a = flatState();
    const b = flatState();
    const unitA = unit(a, 1, 1);
    const unitB = unit(b, 1, 1);
    const goal = { col: 7, row: 5 };
    const first = findPath(a, unitA, at(a.map, goal.col, goal.row));
    const second = findPath(a, unitA, at(a.map, goal.col, goal.row));
    const other = findPath(b, unitB, at(b.map, goal.col, goal.row));
    expect(second).toEqual(first);
    expect(other).toEqual(first);
    // And the tie-broken choice is still a shortest path.
    expect(cost(a, first!)).toBe(6);
  });

  it('walks past a friendly unit but will not stop on it', () => {
    const state = flatState();
    const mover = unit(state, 1, 3, 'warrior', 0);
    unit(state, 2, 3, 'warrior', 0); // friendly blocker, same category

    const blocked = at(state.map, 2, 3);
    expect(canTransit(state, mover, blocked)).toBe(true);
    expect(canStopOn(state, mover, blocked)).toBe(false);
    expect(findPath(state, mover, blocked)).toBeNull();

    const through = findPath(state, mover, at(state.map, 3, 3))!;
    expect(through).toEqual([
      { col: 2, row: 3 },
      { col: 3, row: 3 },
    ]);
  });

  it('stops on a friendly unit of the other category', () => {
    const state = flatState();
    const mover = unit(state, 1, 3, 'warrior', 0);
    unit(state, 2, 3, 'settler', 0);
    expect(canStopOn(state, mover, at(state.map, 2, 3))).toBe(true);
    expect(findPath(state, mover, at(state.map, 2, 3))).toEqual([{ col: 2, row: 3 }]);
  });

  it('treats an enemy unit as a wall, whatever its category', () => {
    const state = flatState();
    const mover = unit(state, 1, 3, 'warrior', 0);
    unit(state, 2, 3, 'settler', 1); // enemy civilian

    const held = at(state.map, 2, 3);
    expect(canTransit(state, mover, held)).toBe(false);
    expect(canStopOn(state, mover, held)).toBe(false);
    const around = findPath(state, mover, at(state.map, 3, 3))!;
    expect(around.some((step) => step.col === 2 && step.row === 3)).toBe(false);
  });
});

describe('reachableTiles', () => {
  it('reports every tile within the movement allowance, with its cost', () => {
    const state = flatState();
    const warrior = unit(state, 4, 4); // 2 MP on flat ground
    const reach = reachableTiles(state, warrior);
    const costs = new Map(reach.map((r) => [`${r.tile.col},${r.tile.row}`, r.cost]));
    expect(costs.get('5,4')).toBe(1);
    expect(costs.get('6,4')).toBe(2);
    expect(costs.get('7,4')).toBeUndefined();
    // Never the tile it is standing on.
    expect(costs.has('4,4')).toBe(false);
  });

  it('uses the same cost function as the pathfinder', () => {
    const state = flatState();
    at(state.map, 5, 4).feature = 'forest';
    at(state.map, 5, 4).hills = true;
    // A chariot archer rather than a scout: three points like the scout had, and
    // it still pays the ground what the ground asks. The scout's own version of
    // this agreement is the test below.
    const rider = unit(state, 4, 4, 'chariotArcher'); // 3 MP
    const reach = reachableTiles(state, rider);
    const forest = reach.find((r) => r.tile.col === 5 && r.tile.row === 4)!;
    expect(forest.cost).toBe(3);
    const path = findPath(state, rider, forest.tile)!;
    expect(cost(state, path, 'chariotArcher')).toBe(forest.cost);
  });

  /**
   * The same agreement for a unit that ignores terrain, and the *difference* the
   * flag makes to what a turn reaches.
   *
   * Two units of three movement points each, dropped on the same hex of the same
   * ridge, so the only variable is the row in `data/units.json`. The wooded hill
   * costs the rider its whole turn and lets the scout keep walking — which is the
   * ability stated as a board fact rather than as a number out of a function.
   */
  it('reaches further with a unit that ignores terrain, and agrees with the path', () => {
    const state = flatState();
    // Three full columns of wooded ridge rather than three tiles of it, so
    // there is no cheap way round: the difference measured is the ability and
    // not a detour the sweep happened to find.
    for (const col of [5, 6, 7]) {
      for (let row = 0; row < state.map.height; row++) {
        at(state.map, col, row).feature = 'forest';
        at(state.map, col, row).hills = true; // 3 apiece to anybody else
      }
    }
    const rider = unit(state, 4, 4, 'chariotArcher'); // 3 MP, pays the ground
    const scout = unit(state, 4, 5, 'scout'); // 3 MP, does not

    const ridden = new Map(
      reachableTiles(state, rider).map((r) => [`${r.tile.col},${r.tile.row}`, r.cost]),
    );
    const scouted = new Map(
      reachableTiles(state, scout).map((r) => [`${r.tile.col},${r.tile.row}`, r.cost]),
    );

    // One wooded hill is the rider's whole turn; the scout crosses all three.
    expect(ridden.get('5,4')).toBe(3);
    expect(ridden.has('6,4')).toBe(false);
    expect(scouted.get('5,4')).toBe(1);
    expect(scouted.get('6,4')).toBe(2);
    expect(scouted.get('7,4')).toBe(3);

    // And the route the pathfinder returns is priced the same way the sweep
    // priced it — the one-evaluator guarantee, asked of the exempt unit.
    const goal = at(state.map, 7, 4);
    const path = findPath(state, scout, goal)!;
    expect(path).toHaveLength(3);
    expect(cost(state, path, 'scout')).toBe(scouted.get('7,4'));
  });

  it('lets a unit with any movement left enter a tile it cannot afford', () => {
    const state = flatState();
    at(state.map, 5, 4).feature = 'forest'; // costs 2
    const warrior = unit(state, 4, 4);
    warrior.movesLeft = 1;

    const reach = reachableTiles(state, warrior);
    const forest = reach.find((r) => r.tile.col === 5 && r.tile.row === 4)!;
    expect(forest.cost).toBe(2);
    // ...but arriving there ends the move, so nothing beyond it is reachable.
    expect(reach.some((r) => r.tile.col === 6 && r.tile.row === 4)).toBe(false);
  });

  it('reports nothing for a unit with no movement left', () => {
    const state = flatState();
    const warrior = unit(state, 4, 4);
    warrior.movesLeft = 0;
    expect(reachableTiles(state, warrior)).toEqual([]);
  });

  it('omits tiles the unit could not legally stop on', () => {
    const state = flatState();
    const mover = unit(state, 4, 4, 'warrior', 0);
    unit(state, 5, 4, 'warrior', 0); // friendly soldier: transit yes, stop no
    at(state.map, 3, 4).terrain = 'mountain';

    const reach = reachableTiles(state, mover);
    const keys = new Set(reach.map((r) => `${r.tile.col},${r.tile.row}`));
    expect(keys.has('5,4')).toBe(false);
    expect(keys.has('3,4')).toBe(false);
    // But the tile beyond the friendly unit is still reachable through it.
    expect(keys.has('6,4')).toBe(true);
  });

  it('is deterministic and ordered by tile index', () => {
    const state = flatState();
    const scout = unit(state, 3, 3, 'scout');
    const first = reachableTiles(state, scout);
    const second = reachableTiles(state, scout);
    expect(second).toEqual(first);
    const indices = first.map((r) => r.tile.row * state.map.width + r.tile.col);
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
  });
});
