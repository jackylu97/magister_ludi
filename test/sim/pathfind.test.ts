import { describe, expect, it } from 'vitest';
import { type GameMap, type Tile, createMap, getTileAt, tileIndex } from '../../src/sim/map';
import {
  canStopOn,
  canTransit,
  cheapestStepCost,
  findPath,
  isPassable,
  isShoreStep,
  moveProfile,
  pathTurnMarks,
  pathTurns,
  reachableTiles,
  shoreStepCost,
  snapMovement,
  stepCost,
  planSwap,
  takesByWalking,
  tileMoveCost,
  transitField,
  zocField,
} from '../../src/sim/pathfind';
import { cityAt } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { hasForeignUnit } from '../../src/sim/units';
import { advanceAlongPath } from '../../src/sim/movement';
import { RULES } from '../../src/sim/rulesData';
import { techsGrant } from '../../src/sim/techData';
import { fullMovement } from '../../src/sim/units';
import {
  type GameState,
  type Unit,
  createCity,
  createUnit,
  newGame,
  bumpRevision,
} from '../../src/sim/state';
import { moveCost } from '../../src/sim/terrainData';
import { openWar } from '../../src/sim/wars';
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
    total += tileMoveCost(at(state.map, step.col, step.row), { def: unitDef(type), embarks: false, naval: false, ocean: false, full: unitDef(type).movement })!;
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

  /**
   * **Re-taken 2026-09-15** (`docs/flags.md` (ooooo), rule 1: *"units should be
   * able to move past units that are blocking them… this should apply only on
   * civs you're not at war with"*). The measured reason the numbers moved is the
   * ruling itself: a stranger's piece was a wall to transit and is now a hex the
   * column files through, exactly as a friend's is. What the old pin was really
   * protecting — that nobody *rests* on somebody else's hex, and that nobody
   * walks off with their people without a war — is asserted here unchanged.
   */
  it('walks past a piece at peace, whatever its category, and never rests on it', () => {
    const state = flatState();
    const mover = unit(state, 1, 3, 'warrior', 0);
    unit(state, 2, 3, 'settler', 1); // a neighbour's civilian, nobody at war

    const held = at(state.map, 2, 3);
    expect(canTransit(state, mover, held)).toBe(true);
    expect(canStopOn(state, mover, held)).toBe(false);
    // And the taking still needs a war: passing through is not seizing.
    expect(takesByWalking(state, mover, held)).toBe(false);
    expect(findPath(state, mover, held)).toBeNull();
    // The road through the pass is open, and it costs the ground and nothing
    // more — a pass is not a toll.
    const through = findPath(state, mover, at(state.map, 3, 3))!;
    expect(through).toEqual([
      { col: 2, row: 3 },
      { col: 3, row: 3 },
    ]);
    expect(cost(state, through)).toBe(2);
  });

  it('keeps a hostile soldier a wall, and lets one at peace be passed', () => {
    const state = flatState();
    const mover = unit(state, 1, 3, 'warrior', 0);
    unit(state, 2, 3, 'spearman', 1);

    const held = at(state.map, 2, 3);
    expect(canTransit(state, mover, held)).toBe(true);
    const through = findPath(state, mover, at(state.map, 3, 3))!;
    expect(through).toEqual([
      { col: 2, row: 3 },
      { col: 3, row: 3 },
    ]);

    // Declared: the same hex, the same piece, and now a wall the road goes
    // round rather than through.
    openWar(state, 0, 1);
    expect(canTransit(state, mover, held)).toBe(false);
    const around = findPath(state, mover, at(state.map, 3, 3))!;
    expect(around.some((step) => step.col === 2 && step.row === 3)).toBe(false);
  });

  /**
   * A hex with one empire's cart and another's on it, and only one war: the
   * column may walk through, and may not come to rest — so nobody at peace is
   * ever carried off with the ground. That is the clause that moved out of
   * `canTransit` and into `canStopOn` when rule 1 landed.
   */
  it('will not rest on a hex where an enemy cart shares the ground with a neutral one', () => {
    const state = flatState();
    const three = newGame({
      seed: 1,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
        { name: 'C', color: '#0a0', isHuman: true },
      ],
    });
    three.map = state.map;
    resetVisibility(three);
    three.units = [];
    three.nextEntityId = 1;
    openWar(three, 0, 1);
    const mover = unit(three, 1, 3, 'warrior', 0);
    unit(three, 2, 3, 'worker', 1); // at war: takeable
    unit(three, 2, 3, 'worker', 2); // at peace: not
    const held = at(three.map, 2, 3);
    expect(canTransit(three, mover, held)).toBe(true);
    expect(canStopOn(three, mover, held)).toBe(false);
    expect(takesByWalking(three, mover, held)).toBe(false);
  });

  /**
   * **A hex holding nothing but the enemy's civilians is not a wall** (user,
   * 2026-09-05, `docs/flags.md` note 22: a settler is *taken by walking onto
   * it*). The clause is in `canTransit`, so all four readers of `stepCost`
   * inherit it — which is what lets the interface send an archer's right-click
   * as a march and have the reducer accept the very route the highlight drew.
   */
  it('lets a soldier at war walk onto a hex holding only enemy civilians', () => {
    const state = flatState();
    openWar(state, 0, 1);
    const mover = unit(state, 1, 3, 'warrior', 0);
    unit(state, 2, 3, 'settler', 1);

    const held = at(state.map, 2, 3);
    expect(canTransit(state, mover, held)).toBe(true);
    expect(canStopOn(state, mover, held)).toBe(true);
    expect(takesByWalking(state, mover, held)).toBe(true);
    expect(findPath(state, mover, held)).toEqual([{ col: 2, row: 3 }]);
    // And it is ground to be *walked through* as much as walked to: the ground
    // and the people on it change hands together whichever it turns out to be.
    expect(findPath(state, mover, at(state.map, 3, 3))).toEqual([
      { col: 2, row: 3 },
      { col: 3, row: 3 },
    ]);
  });

  it('keeps the wall up for a soldier guarding them, and for a civilian mover', () => {
    const state = flatState();
    openWar(state, 0, 1);
    const mover = unit(state, 1, 3, 'warrior', 0);
    const settlerMover = unit(state, 1, 4, 'settler', 0);
    unit(state, 2, 3, 'settler', 1);
    const guarded = at(state.map, 2, 3);
    // A settler does not capture a settler: the taking is a soldier's.
    expect(canTransit(state, settlerMover, guarded)).toBe(false);
    expect(takesByWalking(state, settlerMover, guarded)).toBe(false);

    unit(state, 2, 3, 'spearman', 1);
    expect(canTransit(state, mover, guarded)).toBe(false);
    expect(takesByWalking(state, mover, guarded)).toBe(false);
  });

  /**
   * Gap 2 of the 2026-08-28 city-combat pass: a hex holding a **foreign** city
   * is not enterable by movement, stop or transit, for anybody. Before this,
   * `canStopOn`/`canTransit` never asked about cities at all, so a unit could
   * `moveUnit` onto an empty foreign city hex and stand there — filling the
   * town's only military slot and leaving nothing for an attack to resolve
   * against. Taking a foreign city is capture's job (`capturesCity` in
   * `combat.ts`), never an ordinary march's.
   */
  it('treats a foreign city as a wall — an empty one included', () => {
    const state = flatState();
    const mover = unit(state, 1, 3, 'warrior', 0);
    createCity(state, 1, 'Uruk', 2, 3); // no garrison at all, still refused

    const held = at(state.map, 2, 3);
    expect(canTransit(state, mover, held)).toBe(false);
    expect(canStopOn(state, mover, held)).toBe(false);
    // Either routed around, or refused outright if nothing else leads through —
    // never a path that crosses the city's own hex.
    const around = findPath(state, mover, at(state.map, 3, 3));
    if (around) {
      expect(around.some((step) => step.col === 2 && step.row === 3)).toBe(false);
    }
    expect(findPath(state, mover, held)).toBeNull();
  });

  it('leaves a unit’s own city hex ordinary ground', () => {
    const state = flatState();
    const mover = unit(state, 1, 3, 'warrior', 0);
    createCity(state, 0, 'Ur', 2, 3); // same owner as the mover

    const home = at(state.map, 2, 3);
    expect(canTransit(state, mover, home)).toBe(true);
    expect(canStopOn(state, mover, home)).toBe(true);
    expect(findPath(state, mover, home)).toEqual([{ col: 2, row: 3 }]);
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
   * Two units dropped on the same hex of the same ridge, so the only variable
   * is the row in `data/units.json`. The wooded hill costs the rider its whole
   * turn and lets the scout keep walking — which is the ability stated as a
   * board fact rather than as a number out of a function.
   *
   * 2026-08-28: the scout's movement dropped 3→2 (data ruling), so the ridge
   * is now two columns deep, not three — enough to still show the exemption,
   * sized off `unitDef('scout').movement` rather than a literal.
   */
  it('reaches further with a unit that ignores terrain, and agrees with the path', () => {
    const state = flatState();
    const scoutMovement = unitDef('scout').movement;
    // Two full columns of wooded ridge rather than two tiles of it, so there
    // is no cheap way round: the difference measured is the ability and not
    // a detour the sweep happened to find.
    for (const col of [5, 6]) {
      for (let row = 0; row < state.map.height; row++) {
        at(state.map, col, row).feature = 'forest';
        at(state.map, col, row).hills = true; // 3 apiece to anybody else
      }
    }
    const rider = unit(state, 4, 4, 'chariotArcher'); // 3 MP, pays the ground
    const scout = unit(state, 4, 5, 'scout'); // 2 MP, does not

    const ridden = new Map(
      reachableTiles(state, rider).map((r) => [`${r.tile.col},${r.tile.row}`, r.cost]),
    );
    const scouted = new Map(
      reachableTiles(state, scout).map((r) => [`${r.tile.col},${r.tile.row}`, r.cost]),
    );

    // One wooded hill is the rider's whole turn; the scout crosses both.
    expect(ridden.get('5,4')).toBe(3);
    expect(ridden.has('6,4')).toBe(false);
    expect(scouted.get('5,4')).toBe(1);
    expect(scouted.get('6,4')).toBe(scoutMovement);

    // And the route the pathfinder returns is priced the same way the sweep
    // priced it — the one-evaluator guarantee, asked of the exempt unit.
    const goal = at(state.map, 6, 4);
    const path = findPath(state, scout, goal)!;
    expect(path).toHaveLength(2);
    expect(cost(state, path, 'scout')).toBe(scouted.get('6,4'));
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
    // A friendly soldier: transit yes, stop no. **And spent**, so the swap
    // (rule 3) is not on the table either — a piece with no points cannot walk
    // the route back, which is the one thing that could put its hex in this
    // list. The swap's own reachability is pinned in "the swap" below.
    const sitter = unit(state, 5, 4, 'warrior', 0);
    sitter.movesLeft = 0;
    at(state.map, 3, 4).terrain = 'mountain';

    const reach = reachableTiles(state, mover);
    const keys = new Set(reach.map((r) => `${r.tile.col},${r.tile.row}`));
    expect(keys.has('5,4')).toBe(false);
    expect(keys.has('3,4')).toBe(false);
    // But the tile beyond the friendly unit is still reachable through it.
    expect(keys.has('6,4')).toBe(true);
  });

  it('excludes a foreign city hex, garrisoned or not', () => {
    const state = flatState();
    const mover = unit(state, 4, 4, 'warrior', 0);
    createCity(state, 1, 'Uruk', 5, 4);

    const reach = reachableTiles(state, mover);
    const keys = new Set(reach.map((r) => `${r.tile.col},${r.tile.row}`));
    expect(keys.has('5,4')).toBe(false);
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

// --- the shore crossing -----------------------------------------------------

/**
 * **Crossing the shore costs everything** (the Themes Build's ruling, priced in
 * `stepCost`): a step with one foot wet and one foot dry costs the mover's whole
 * allowance, in either direction, so wading out and wading ashore each end the
 * turn's marching.
 *
 * Tested at the evaluator and then at **all four of its readers**, because that
 * is the property the rule was put in `stepCost` for: a price the searches and
 * the walk could disagree about is a highlight promising a march the reducer
 * will not deliver. The four are `findPath`, `reachableTiles`, `pathTurns` and
 * `advanceAlongPath`, and each gets its own assertion below rather than a claim
 * that they "read the same function".
 */
/**
 * **The turn medallions' reader** (batch U1, 2026-09-08, `docs/flags.md` (bbb)):
 * where a march rests at the end of each turn, so the board can print the
 * number on the hex.
 *
 * `pathTurnMarks` is `pathTurns` read out cell by cell instead of summed, and
 * the contract that matters is that the two never disagree: the last mark's
 * turn *is* the estimate, every time, on any route. A medallion saying "three"
 * on a destination the unit sheet calls two turns away would be the interface
 * arguing with itself, and it is the only bug this pair can produce.
 */
describe('pathTurnMarks', () => {
  it('marks the hex each turn ends on, and no other hex on the route', () => {
    const state = flatState();
    // Two movement points, four hexes: rest, rest, arrive.
    const warrior = unit(state, 1, 4, 'warrior');
    expect(fullMovement(warrior, state)).toBe(2);
    const path = [
      { col: 2, row: 4 },
      { col: 3, row: 4 },
      { col: 4, row: 4 },
      { col: 5, row: 4 },
    ];
    expect(pathTurnMarks(state, warrior, path)).toEqual([
      { col: 3, row: 4, turn: 1 },
      { col: 5, row: 4, turn: 2 },
    ]);
  });

  it('agrees with `pathTurns` on the destination, which is the whole contract', () => {
    const state = flatState();
    const worker = unit(state, 1, 4, 'worker');
    const path = [
      { col: 2, row: 4 },
      { col: 3, row: 4 },
      { col: 4, row: 4 },
      { col: 5, row: 4 },
      { col: 6, row: 4 },
    ];
    const marks = pathTurnMarks(state, worker, path);
    const last = marks[marks.length - 1]!;
    expect(last).toMatchObject({ col: 6, row: 4 });
    expect(last.turn).toBe(pathTurns(state, worker, path));
    // One mark per *rest*, never one per hex.
    expect(marks).toHaveLength(last.turn);
  });

  it('counts from the purse the piece is actually holding', () => {
    const state = flatState();
    const warrior = unit(state, 1, 4, 'warrior');
    const path = [
      { col: 2, row: 4 },
      { col: 3, row: 4 },
    ];
    // With a full purse both hexes are this turn's, so there is one rest.
    expect(pathTurnMarks(state, warrior, path)).toEqual([{ col: 3, row: 4, turn: 1 }]);
    // Spend a point and the same route rests twice — which is exactly why the
    // renderer is handed the marks rather than deriving them from the cells.
    warrior.movesLeft = 1;
    expect(pathTurnMarks(state, warrior, path)).toEqual([
      { col: 2, row: 4, turn: 1 },
      { col: 3, row: 4, turn: 2 },
    ]);
  });

  it('marks a march ordered with nothing left as arriving the turn after next', () => {
    // The standing-orders ruling read as a number, and the one place batch U1
    // made an **existing** estimate honest rather than changing it: a piece
    // with nothing left walks none of the route in the resolution it is ordered
    // in, so its first hex is the *second* turn change away. `pathTurns` always
    // said two here — it counts a refill it needs as a turn, which the old
    // pipeline then quietly spent inside the same resolution — and the marks
    // agree with it by construction, which is the contract above.
    const state = flatState();
    const warrior = unit(state, 1, 4, 'warrior');
    warrior.movesLeft = 0;
    const path = [{ col: 2, row: 4 }];
    expect(pathTurnMarks(state, warrior, path)).toEqual([{ col: 2, row: 4, turn: 2 }]);
    expect(pathTurns(state, warrior, path)).toBe(2);
  });

  it('stops at a waypoint nothing can walk on, rather than inventing rests past it', () => {
    const state = flatState();
    const warrior = unit(state, 1, 4, 'warrior');
    at(state.map, 3, 4).terrain = 'mountain';
    const marks = pathTurnMarks(state, warrior, [
      { col: 2, row: 4 },
      { col: 3, row: 4 },
      { col: 4, row: 4 },
    ]);
    expect(marks).toEqual([{ col: 2, row: 4, turn: 1 }]);
  });

  it('has nothing to say about an empty route', () => {
    const state = flatState();
    expect(pathTurnMarks(state, unit(state, 1, 4, 'warrior'), [])).toEqual([]);
  });
});

describe('the shore crossing', () => {
  /**
   * A strait: dry land, two columns of coast, dry land again. Both seats hold
   * Sailing, so a civilian may take to the water at all — the crossing's *price*
   * is what is under test, never who may pay it.
   */
  function straitState(): GameState {
    const state = flatState(10, 8);
    for (const tile of state.map.tiles) {
      if (tile.col === 4 || tile.col === 5) tile.terrain = 'coast';
    }
    for (const player of state.players) {
      if (!player.techsResearched.includes('sailing')) player.techsResearched.push('sailing');
      bumpRevision(state);
    }
    return state;
  }

  /** The price of one step, asked exactly as the four readers ask it. */
  function priceOf(state: GameState, mover: Unit, from: Tile, to: Tile): number | null {
    const price = stepCost(state.map, from, to, moveProfile(state, mover), zocField(state, mover.ownerId));
    return price === null ? null : price.cost;
  }

  it('charges the mover’s whole allowance in both directions', () => {
    const state = straitState();
    const worker = unit(state, 3, 4, 'worker');
    const full = fullMovement(worker, state);
    expect(full).toBeGreaterThan(RULES.movement.embarkCost);

    // Wading out.
    expect(priceOf(state, worker, at(state.map, 3, 4), at(state.map, 4, 4))).toBe(full);
    // And wading ashore, from the far side of the strait: the same crossing seen
    // from the other bank, and the rule is symmetric on purpose.
    worker.col = 5;
    expect(priceOf(state, worker, at(state.map, 5, 4), at(state.map, 6, 4))).toBe(full);
  });

  it('leaves a step that stays on one side of the water alone', () => {
    const state = straitState();
    const worker = unit(state, 4, 4, 'worker');
    // Water to water is the embark price, unchanged.
    expect(priceOf(state, worker, at(state.map, 4, 4), at(state.map, 5, 4))).toBe(
      RULES.movement.embarkCost,
    );
    // Land to land is the ground's own price, unchanged.
    worker.col = 2;
    expect(priceOf(state, worker, at(state.map, 2, 4), at(state.map, 3, 4))).toBe(
      moveCost('grassland', 'none', false),
    );
  });

  it('is the rule read off the data, not a number written into the evaluator', () => {
    // `'all'` as shipped, and `shoreStepCost` is the one reading of the setting.
    const state = straitState();
    const worker = unit(state, 3, 4, 'worker');
    const mover = moveProfile(state, worker);
    expect(RULES.movement.shoreCrossing).toBe('all');
    expect(shoreStepCost(mover)).toBe(mover.full);
    expect(isShoreStep(at(state.map, 3, 4), at(state.map, 4, 4), mover)).toBe(true);
    expect(isShoreStep(at(state.map, 4, 4), at(state.map, 5, 4), mover)).toBe(false);
    expect(isShoreStep(at(state.map, 2, 4), at(state.map, 3, 4), mover)).toBe(false);
    // A price the searches lean on: still a whole third, and still admissible.
    expect(snapMovement(shoreStepCost(mover))).toBe(shoreStepCost(mover));
    expect(cheapestStepCost).toBeLessThanOrEqual(shoreStepCost(mover));
  });

  it('stops the reachable highlight at the water’s edge', () => {
    const state = straitState();
    const worker = unit(state, 3, 4, 'worker');
    const keys = new Set(
      reachableTiles(state, worker).map((entry) => `${entry.tile.col},${entry.tile.row}`),
    );
    // The near water is reachable — the crossing is legal with any movement in
    // hand, and the overspend is forgiven.
    expect(keys.has('4,4')).toBe(true);
    // And nothing past it: the purse is empty on arrival, so the far water and
    // the far shore are both next turn's business.
    expect(keys.has('5,4')).toBe(false);
    expect(keys.has('6,4')).toBe(false);
    // The cost the highlight quotes is the crossing's own.
    const wet = reachableTiles(state, worker).find(
      (entry) => entry.tile.col === 4 && entry.tile.row === 4,
    );
    expect(wet?.cost).toBe(fullMovement(worker, state));
  });

  it('counts the extra turn in the “~N turns” estimate', () => {
    const state = straitState();
    const worker = unit(state, 3, 4, 'worker');
    // Two hexes of dry marching is one turn for a two-point piece…
    const dry = unit(state, 1, 4, 'worker');
    expect(pathTurns(state, dry, [{ col: 2, row: 4 }, { col: 3, row: 4 }])).toBe(1);
    // …and the same two hexes are two turns when the first of them is the shore,
    // because the crossing took the whole purse and the second step waits for a
    // refill.
    expect(pathTurns(state, worker, [{ col: 4, row: 4 }, { col: 5, row: 4 }])).toBe(2);
  });

  it('walks a march to the water and stops there, keeping the order', () => {
    const state = straitState();
    const worker = unit(state, 3, 4, 'worker');
    const walked = advanceAlongPath(state, worker, [
      { col: 4, row: 4 },
      { col: 5, row: 4 },
    ]);
    expect(walked.steps).toBe(1);
    expect(walked.cleared).toBe(false);
    expect(worker.col).toBe(4);
    expect(worker.movesLeft).toBe(0);
    // The rest of the order is kept — this is a purse running out, not a route
    // that stopped existing.
    expect(worker.path).toEqual([{ col: 5, row: 4 }]);
  });

  it('still routes across the strait, at the price the walk will spend', () => {
    const state = straitState();
    const worker = unit(state, 3, 4, 'worker');
    const path = findPath(state, worker, at(state.map, 6, 4));
    expect(path).not.toBeNull();
    expect(path).toEqual([
      { col: 4, row: 4 },
      { col: 5, row: 4 },
      { col: 6, row: 4 },
    ]);
    // Two turns of marching, and the second one is the whole point: the wade out
    // takes the first turn's purse, then the refill pays for the hex of open
    // water and the landing is made on what is left — a crossing costs
    // everything, and overspending it is forgiven exactly as walking into a
    // forest on one point is.
    expect(pathTurns(state, worker, path!)).toBe(2);
  });

  it('pins Sea Legs: it widens who may cross, never what a crossing costs', () => {
    const state = straitState();
    const warrior = unit(state, 3, 4, 'warrior');
    // Sailing alone is a civilian's verb: a soldier cannot be on the water at
    // all, so there is no price to quote.
    expect(priceOf(state, warrior, at(state.map, 3, 4), at(state.map, 4, 4))).toBeNull();

    state.players[0]!.techsResearched.push('wayfinding');
    bumpRevision(state);
    expect(techsGrant(state.players[0]!.techsResearched, 'militaryEmbark')).toBe(true);
    // With Sea Legs the soldier wades — and pays exactly what the worker beside
    // it pays: its own whole allowance. The gift is a wider roster, not a
    // discount, which is why no second number was invented for it.
    const worker = unit(state, 3, 5, 'worker');
    expect(priceOf(state, warrior, at(state.map, 3, 4), at(state.map, 4, 4))).toBe(
      fullMovement(warrior, state),
    );
    expect(priceOf(state, worker, at(state.map, 3, 5), at(state.map, 4, 5))).toBe(
      fullMovement(worker, state),
    );
  });
});

/**
 * **The hoist is the same two readings, taken once** — the M-series pin
 * (`docs/flags.md` (fffff)'s follow-up row).
 *
 * `canTransit` used to walk `state.cities` and `state.units` per edge; it now
 * reads one byte of a `TransitField` swept once per search. The claim is that
 * nothing about the *answer* moved, and this is the whole of the proof, in two
 * halves that between them cover every reader:
 *
 *   · the **field** says what the two walks say, hex for hex and seat for seat;
 *   · the **gate** answers the same with a field and without one, for every
 *     piece on the board and every hex of it.
 *
 * That is sufficient for `findPath` and `reachableTiles` by construction: both
 * searches are built out of `canTransit`, `canStopOn` and `stepCost`, the last
 * of which the hoist never touched. A route is a fold of edge answers, so two
 * runs agreeing on every edge agree on every route — which is why there is no
 * third half here comparing routes against a second implementation, and why the
 * byte-for-byte proof that a *bot game* is unchanged (a 120-turn six-seat drive
 * at two seeds, digested with `snapshotState`) is taken out of tier, where a
 * drive of that size belongs.
 *
 * The board is built by hand rather than played, so that the cases a played
 * board reaches by luck are all here on purpose: a foreign piece, a friendly
 * one, a foreign town, a friendly town, a hex carrying both, three seats rather
 * than two, and the two ends of the wrapped seam — which is the one place a
 * coordinate could be confused with an index.
 */
describe('the transit field', () => {
  /** Three seats, pieces and towns strewn over the seam and the middle alike. */
  function crowdedState(): GameState {
    const state = newGame({
      seed: 3,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
        { name: 'C', color: '#0a0', isHuman: true },
      ],
    });
    state.map = createMap({ width: 12, height: 8, terrain: 'grassland' });
    resetVisibility(state);
    state.units = [];
    state.cities = [];
    state.nextEntityId = 1;
    createCity(state, 0, 'Home', 5, 3);
    createCity(state, 1, 'Theirs', 8, 3);
    // On the seam, both sides of it: column 0 and column 11 are neighbours.
    createCity(state, 2, 'Edge', 0, 6);
    unit(state, 5, 3, 'warrior', 0);
    unit(state, 6, 3, 'warrior', 1);
    unit(state, 6, 4, 'settler', 1);
    // A friendly piece and a foreign one on one hex: the two bits are
    // independent, and a hex that carries both must read as both.
    unit(state, 8, 3, 'warrior', 1);
    unit(state, 8, 3, 'worker', 0);
    unit(state, 11, 6, 'warrior', 2);
    unit(state, 0, 0, 'warrior', 1);
    unit(state, 11, 7, 'settler', 2);
    return state;
  }

  /**
   * **Re-taken 2026-09-15**, and the bits moved because their *meaning* did
   * (`docs/flags.md` (ooooo)): what a foreign piece does to a march now depends
   * on whether anybody has declared anything, so the field carries three piece
   * bits — a hostile soldier, a hostile civilian, a piece at peace — where it
   * carried one. `1` is the town, `2 | 4 | 8` between them are still exactly
   * "somebody else is standing here", which is what this pin has always said.
   */
  it('says what `cityAt` and `hasForeignUnit` say, hex for hex and seat for seat', () => {
    const state = crowdedState();
    for (const seat of [0, 1, 2]) {
      const field = transitField(state, seat);
      expect(field.ownerId).toBe(seat);
      let towns = 0;
      let pieces = 0;
      for (const tile of state.map.tiles) {
        const bits = field.blocked[tileIndex(state.map, tile.col, tile.row)]!;
        const city = cityAt(state, tile.col, tile.row);
        expect((bits & 1) !== 0).toBe(city !== undefined && city.ownerId !== seat);
        expect((bits & (2 | 4 | 8)) !== 0).toBe(
          hasForeignUnit(state, tile.col, tile.row, seat),
        );
        if ((bits & 1) !== 0) towns += 1;
        if ((bits & (2 | 4 | 8)) !== 0) pieces += 1;
      }
      // An agreement between two readings that both say "nothing anywhere" is
      // not an agreement worth having: the board is crowded on purpose, so the
      // field has to have found the crowd.
      expect(towns).toBe(2);
      expect(pieces).toBeGreaterThanOrEqual(3);
    }
  });

  it('gates every piece on every hex exactly as the walks did', () => {
    const state = crowdedState();
    // Everybody at war with everybody, so the civilian clause at the foot of
    // `canTransit` is live rather than skipped: that arm reads the state
    // directly and has to go on answering for itself.
    openWar(state, 0, 1);
    openWar(state, 0, 2);
    openWar(state, 1, 2);
    for (const piece of state.units) {
      const mover = moveProfile(state, piece);
      const field = transitField(state, piece.ownerId);
      for (const tile of state.map.tiles) {
        expect(canTransit(state, piece, tile, mover, field)).toBe(
          canTransit(state, piece, tile, mover),
        );
        expect(canStopOn(state, piece, tile, mover, field)).toBe(
          canStopOn(state, piece, tile, mover),
        );
      }
    }
  });

  it('is spent only against the seat it was swept for', () => {
    const state = crowdedState();
    // A field built for somebody else is not a second opinion, it is a wrong
    // one — so the gate compares the seat and falls back to the walks rather
    // than reading a stranger's bytes. Pinned because that compare is the only
    // thing between a hoist and a quietly different board.
    const piece = state.units.find((row) => row.ownerId === 0)!;
    const mover = moveProfile(state, piece);
    const theirs = transitField(state, 1);
    for (const tile of state.map.tiles) {
      expect(canTransit(state, piece, tile, mover, theirs)).toBe(
        canTransit(state, piece, tile, mover),
      );
    }
  });

  it('leaves the route and the highlight where they were', () => {
    // The composed half: the searches take a field by default now, so this is
    // the reading a caller actually gets, pinned against the hand-written answer
    // rather than against a second run of the same code.
    const state = flatState(8, 6);
    // **Declared**, since `docs/flags.md` (ooooo): a piece of a seat at peace
    // is walked through now, so the sentence this pin makes — a foreign soldier
    // is a wall the route goes round — is only true of a war. The town beside
    // it is a wall to everybody either way.
    openWar(state, 0, 1);
    createCity(state, 1, 'Theirs', 4, 2);
    unit(state, 5, 2, 'warrior', 1);
    const mine = unit(state, 2, 2, 'warrior', 0);
    // Straight along row 2 is shortest, and a foreign town and a foreign soldier
    // both sit on that line, so the route has to go round the pair of them.
    const path = findPath(state, mine, at(state.map, 6, 2));
    expect(path).not.toBeNull();
    for (const step of path!) {
      expect(`${step.col},${step.row}`).not.toBe('4,2');
      expect(`${step.col},${step.row}`).not.toBe('5,2');
    }
    expect(path![path!.length - 1]).toEqual({ col: 6, row: 2 });
    const reach = reachableTiles(state, mine).map((row) => `${row.tile.col},${row.tile.row}`);
    expect(reach).not.toContain('4,2');
    expect(reach).toContain('3,2');
  });
});

/**
 * **The swap** — `docs/flags.md` (ooooo), rule 3 (the user, 2026-09-15:
 * *"Moving a military unit onto another should 'swap' the two unit's positions
 * if they both have enough movement to reach the swapped destination tile"*).
 *
 * The plan is pinned here, at the rule; `movement.test.ts` pins the command that
 * spends it. The two must agree by construction — they ask the same function —
 * and the block after this one is the pin that says so about the *highlight*:
 * the reachable set and the accepted orders are one list.
 */
describe('planSwap', () => {
  it('trades two of one seat’s soldiers, and says which route each walks', () => {
    const state = flatState();
    const mover = unit(state, 4, 4, 'warrior', 0);
    const sitter = unit(state, 5, 4, 'spearman', 0);
    const plan = planSwap(state, mover, at(state.map, 5, 4))!;
    expect(plan.sitter.id).toBe(sitter.id);
    expect(plan.path).toEqual([{ col: 5, row: 4 }]);
    expect(plan.back).toEqual([{ col: 4, row: 4 }]);
  });

  it('reads the way back as the way out, reversed', () => {
    const state = flatState();
    const mover = unit(state, 3, 4, 'horseman', 0);
    unit(state, 5, 4, 'horseman', 0);
    const plan = planSwap(state, mover, at(state.map, 5, 4))!;
    expect(plan.path).toEqual([{ col: 4, row: 4 }, { col: 5, row: 4 }]);
    expect(plan.back).toEqual([{ col: 4, row: 4 }, { col: 3, row: 4 }]);
  });

  it('refuses when either purse is short', () => {
    const state = flatState();
    const mover = unit(state, 4, 4, 'warrior', 0);
    const sitter = unit(state, 5, 4, 'spearman', 0);
    sitter.movesLeft = 0;
    expect(planSwap(state, mover, at(state.map, 5, 4))).toBeNull();
    sitter.movesLeft = fullMovement(sitter, state);
    mover.movesLeft = 0;
    expect(planSwap(state, mover, at(state.map, 5, 4))).toBeNull();
  });

  it('refuses a walk that runs out halfway, however far the piece could get', () => {
    const state = flatState();
    // Two hexes of forest between them: the warrior can enter the first with
    // its last point but cannot reach the second this turn, so the trade is off
    // — a swap is never stored as a standing order.
    at(state.map, 4, 4).feature = 'forest';
    at(state.map, 5, 4).feature = 'forest';
    const mover = unit(state, 3, 4, 'warrior', 0);
    unit(state, 5, 4, 'warrior', 0);
    for (const tile of state.map.tiles) if (tile.row !== 4) tile.terrain = 'mountain';
    expect(planSwap(state, mover, at(state.map, 5, 4))).toBeNull();
  });

  it('never trades with a civilian, in either chair', () => {
    const state = flatState();
    const soldier = unit(state, 4, 4, 'warrior', 0);
    unit(state, 5, 4, 'worker', 0);
    expect(planSwap(state, soldier, at(state.map, 5, 4))).toBeNull();
    const worker = unit(state, 4, 5, 'worker', 0);
    unit(state, 5, 5, 'warrior', 0);
    expect(planSwap(state, worker, at(state.map, 5, 5))).toBeNull();
  });

  it('never trades with another seat, at peace or at war', () => {
    const state = flatState();
    const mine = unit(state, 4, 4, 'warrior', 0);
    unit(state, 5, 4, 'warrior', 1);
    expect(planSwap(state, mine, at(state.map, 5, 4))).toBeNull();
    openWar(state, 0, 1);
    expect(planSwap(state, mine, at(state.map, 5, 4))).toBeNull();
  });

  it('refuses ground the sitter could not stand on', () => {
    const state = flatState();
    // A hull in its own harbour and a warrior beside it: both are this seat's
    // soldiers, and the trade is still refused, because the ground each is
    // asked to stand on is asked of its own profile.
    createCity(state, 0, 'Harbour', 5, 4);
    at(state.map, 5, 5).terrain = 'coast';
    const hull = unit(state, 5, 4, 'trireme', 0);
    const warrior = unit(state, 4, 4, 'warrior', 0);
    expect(planSwap(state, warrior, at(state.map, 5, 4))).toBeNull();
    expect(planSwap(state, hull, at(state.map, 4, 4))).toBeNull();
  });

  it('puts the swap hex in the highlight, in its own colour', () => {
    const state = flatState();
    const mover = unit(state, 4, 4, 'warrior', 0);
    unit(state, 5, 4, 'spearman', 0);
    const reach = reachableTiles(state, mover);
    const swap = reach.find((row) => row.tile.col === 5 && row.tile.row === 4)!;
    expect(swap.swap).toBe(true);
    expect(swap.cost).toBe(1);
    // Every other hex in the list is an ordinary march and says nothing.
    for (const row of reach) {
      if (row === swap) continue;
      expect(row.swap).toBeUndefined();
    }
  });
});

/**
 * **The highlight is the order** — the ruling's own pin (`docs/flags.md`
 * (ooooo)): `reachableTiles` is exactly the set of hexes a `moveUnit` would be
 * accepted *and come to rest on* this turn. Asked of a piece beside a friend,
 * beside a foe and beside one of its own soldiers, at war and at peace, because
 * those are the three hexes the three rules changed.
 *
 * A march the reducer accepts but **stores** is not in the set and must not be:
 * the highlight answers "where can I get to this turn", and an order to walk for
 * three days is a different promise. So the comparison is against where the
 * piece actually stands afterwards.
 */
describe('the highlight and the reducer', () => {
  function board(war: boolean): { state: GameState; mover: Unit } {
    const state = flatState(9, 7);
    if (war) openWar(state, 0, 1);
    const mover = unit(state, 4, 3, 'warrior', 0);
    unit(state, 5, 3, 'spearman', 0); // its own soldier: the swap
    unit(state, 4, 2, 'settler', 0); // a friend of the other category
    unit(state, 3, 3, 'spearman', 1); // somebody else's soldier
    unit(state, 3, 4, 'worker', 1); // and somebody else's civilian
    return { state, mover };
  }

  for (const war of [false, true]) {
    it(`agrees hex for hex ${war ? 'at war' : 'at peace'}`, () => {
      const { state, mover } = board(war);
      const highlight = new Set(
        reachableTiles(state, mover).map((row) => `${row.tile.col},${row.tile.row}`),
      );
      // Something to compare against: a highlight of nothing would agree with
      // a reducer that refuses everything.
      expect(highlight.size).toBeGreaterThan(5);
      for (const tile of state.map.tiles) {
        const fresh = board(war);
        const key = `${tile.col},${tile.row}`;
        const result = applyCommand(fresh.state, {
          type: 'moveUnit',
          playerId: 0,
          unitId: fresh.mover.id,
          target: { col: tile.col, row: tile.row },
        });
        const rested =
          result.ok && fresh.mover.col === tile.col && fresh.mover.row === tile.row;
        expect(`${key}: ${String(rested)}`).toBe(`${key}: ${String(highlight.has(key))}`);
      }
    });
  }
});

/**
 * **Rule 2**: the picket is a war toll (`docs/flags.md` (ooooo) — *"Units should
 * not exert ZOC if you're not at war with them"*). The arithmetic of the toll
 * has its own file (`zoc.test.ts`); what is pinned here is *whose* pieces are in
 * the field at all.
 */
describe('zocField and the war', () => {
  it('holds ground only for seats at war, the wild always', () => {
    const state = flatState();
    unit(state, 5, 4, 'spearman', 1);
    expect(zocField(state, 0).sources).toHaveLength(0);
    openWar(state, 0, 1);
    expect(zocField(state, 0).sources.map((tile) => `${tile.col},${tile.row}`)).toEqual(['5,4']);
  });

  it('leaves a neighbour’s town out of the field, and puts an enemy’s in', () => {
    const state = flatState();
    createCity(state, 1, 'Theirs', 5, 4);
    expect(zocField(state, 0).sources).toHaveLength(0);
    openWar(state, 0, 1);
    expect(zocField(state, 0).sources).toHaveLength(1);
  });

  it('charges no toll for stepping along a neighbour’s line', () => {
    const state = flatState();
    const mover = unit(state, 4, 5, 'warrior', 0);
    unit(state, 5, 4, 'spearman', 1);
    const price = stepCost(
      state.map,
      at(state.map, 4, 5),
      at(state.map, 5, 5),
      moveProfile(state, mover),
      zocField(state, 0),
    )!;
    expect(price.zoc).toBe(false);
    expect(price.cost).toBe(1);

    openWar(state, 0, 1);
    const tolled = stepCost(
      state.map,
      at(state.map, 4, 5),
      at(state.map, 5, 5),
      moveProfile(state, mover),
      zocField(state, 0),
    )!;
    expect(tolled.zoc).toBe(true);
    expect(tolled.cost).toBe(1 + RULES.movement.zocExtraCost);
  });
});
