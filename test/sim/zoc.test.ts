/**
 * Zone of control (design-notes Entry XXV; the toll is the user's ruling of
 * 2026-08-28).
 *
 * The rule is one sentence — a step from a hex an enemy touches to another hex
 * *that same enemy* touches costs the ground's price **plus
 * `rules.movement.zocExtraCost`** — and it is enforced in exactly one place,
 * `stepCost` in `pathfind.ts`. So the tests come in two halves: the rule matrix,
 * asked of the board, and the *agreement* between the four readers of that
 * evaluator. The second half is the one that matters: a highlight computed by
 * one rule and walked by another is the failure this file exists to catch.
 *
 * What the toll replaced is worth stating, because these tests are where it was
 * pinned: a slide used to complete and then empty the purse. It does not any
 * more. A mover pays a point extra and marches on with the rest, and nothing in
 * this file may go back to asserting a zeroed allowance.
 *
 * Geometry is derived, never hardcoded. `ring` asks the map for a hex's
 * neighbours and `touches` asks it for adjacency, so a test says "another tile
 * the same enemy touches" and means it on any layout.
 */

import { describe, expect, it } from 'vitest';
import type { Command } from '../../src/sim/commands';
import { type GameMap, type Tile, createMap, getTile, getTileAt, mapNeighbors, tileHex, wrappedDistance } from '../../src/sim/map';
import { advanceAlongPath } from '../../src/sim/movement';
import {
  findPath,
  inZoneOfControl,
  pathTurns,
  reachableTiles,
  stepCost,
  zocBinds,
  zocField,
} from '../../src/sim/pathfind';
import { RULES } from '../../src/sim/rulesData';
import { type GameState, type Unit, createCity, newGame, realPlayers } from '../../src/sim/state';
import { type Game, createGame, dispatch, replay } from '../../src/sim/game';
import { unitDef } from '../../src/sim/unitData';
import { fullMovement } from '../../src/sim/units';
import { resetVisibility } from '../../src/sim/visibility';
import { flatState, unit } from './zocHelpers';

// --- scaffolding ------------------------------------------------------------

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** A hex's six neighbours, in `HEX_DIRECTIONS` order. Consecutive ones touch. */
function ring(map: GameMap, tile: Tile): Tile[] {
  const result: Tile[] = [];
  for (const hex of mapNeighbors(map, tileHex(tile))) {
    const neighbor = getTile(map, hex);
    if (neighbor) result.push(neighbor);
  }
  return result;
}

function touches(map: GameMap, a: Tile, b: Tile): boolean {
  return wrappedDistance(map, tileHex(a), tileHex(b)) === 1;
}

/**
 * A picket and the two hexes it holds the line between.
 *
 * `guard` is the tile the enemy stands on, `here` and `along` are two of its
 * neighbours that also touch each other (the slide the rule forbids), and
 * `away` is a neighbour of `here` the guard does not touch (the retreat the
 * rule leaves free).
 */
function picket(map: GameMap, guardCol = 6, guardRow = 4) {
  const guard = at(map, guardCol, guardRow);
  const around = ring(map, guard);
  let here: Tile | undefined;
  let along: Tile | undefined;
  for (const a of around) {
    for (const b of around) {
      if (a === b) continue;
      if (!touches(map, a, b)) continue;
      here = a;
      along = b;
      break;
    }
    if (here) break;
  }
  if (!here || !along) throw new Error('no adjacent pair on the ring');
  const away = ring(map, here).find((tile) => tile !== guard && !touches(map, tile, guard));
  if (!away) throw new Error('no tile out of contact');
  return { guard, here, along, away };
}

/**
 * Takes one named step, through the walk the reducer commits.
 *
 * The rule matrix asks about a *step*, so it hands the walker the step rather
 * than a destination: `findPath` is free to route around a picket when that is
 * cheaper (and it does — see the test that pins it), which is the right answer
 * to a different question.
 */
function step(state: GameState, mover: Unit, to: Tile): void {
  advanceAlongPath(state, mover, [{ col: to.col, row: to.row }]);
}

// --- the rule ---------------------------------------------------------------

/** The toll, read off the rules rather than written down here. */
const TOLL = RULES.movement.zocExtraCost;

describe('the zone-of-control rule', () => {
  it('charges the ground plus the toll, and leaves the mover the rest', () => {
    const state = flatState();
    const { guard, here, along } = picket(state.map);
    unit(state, guard, 'warrior', 1);
    // Three points, so "the rest" is a number and not zero by accident: a
    // slide costs a point of grass and a point of picket, and the third point
    // is still in the purse afterwards.
    const mover = unit(state, here, 'chariotArcher', 0);
    const full = fullMovement(mover, state);

    step(state, mover, along);
    // The step *completes* — a toll is a price, never a wall.
    expect([mover.col, mover.row]).toEqual([along.col, along.row]);
    expect(mover.movesLeft).toBe(full - 1 - TOLL);
    expect(mover.movesLeft).toBeGreaterThan(0);
  });

  it('is forgiven like any other overspend when the purse is short', () => {
    const state = flatState();
    const { guard, here, along } = picket(state.map);
    unit(state, guard, 'warrior', 1);
    const mover = unit(state, here, 'warrior', 0);
    // One point left: less than the slide costs, and the step still happens —
    // the same clause that lets a warrior walk into a forest on its last point.
    mover.movesLeft = 1;

    step(state, mover, along);
    expect([mover.col, mover.row]).toEqual([along.col, along.row]);
    expect(mover.movesLeft).toBe(0);
  });

  it('lets a unit walk out of contact for the ground price alone', () => {
    const state = flatState();
    const { guard, here, away } = picket(state.map);
    unit(state, guard, 'warrior', 1);
    const mover = unit(state, here, 'warrior', 0);
    const full = fullMovement(mover, state);

    step(state, mover, away);
    expect([mover.col, mover.row]).toEqual([away.col, away.row]);
    expect(mover.movesLeft).toBe(full - 1);
  });

  it('lets a unit walk into contact for the ground price alone', () => {
    const state = flatState();
    const { guard, here, away } = picket(state.map);
    unit(state, guard, 'warrior', 1);
    // `away` does not touch the guard and `here` does: the step in is free.
    const mover = unit(state, away, 'warrior', 0);
    const full = fullMovement(mover, state);

    step(state, mover, here);
    expect([mover.col, mover.row]).toEqual([here.col, here.row]);
    expect(mover.movesLeft).toBe(full - 1);
  });

  it('exerts nothing for a civilian', () => {
    const state = flatState();
    const { guard, here, along } = picket(state.map);
    unit(state, guard, 'settler', 1);
    const mover = unit(state, here, 'warrior', 0);
    const full = fullMovement(mover, state);

    step(state, mover, along);
    expect([mover.col, mover.row]).toEqual([along.col, along.row]);
    expect(mover.movesLeft).toBe(full - 1);
  });

  it('exerts nothing for the mover’s own side', () => {
    const state = flatState();
    const { guard, here, along } = picket(state.map);
    unit(state, guard, 'warrior', 0);
    const mover = unit(state, here, 'warrior', 0);
    const full = fullMovement(mover, state);

    step(state, mover, along);
    expect(mover.movesLeft).toBe(full - 1);
  });

  it('is exerted by an enemy city, garrison or no garrison', () => {
    const state = flatState();
    const { guard, here, along } = picket(state.map);
    createCity(state, 1, 'Ur', guard.col, guard.row);
    const mover = unit(state, here, 'chariotArcher', 0);
    const full = fullMovement(mover, state);

    step(state, mover, along);
    expect([mover.col, mover.row]).toEqual([along.col, along.row]);
    expect(mover.movesLeft).toBe(full - 1 - TOLL);
  });

  it('is exerted by the wild, which is a seat like any other', () => {
    const state = newGame({
      seed: 3,
      sizeName: 'duel',
      players: [{ name: 'A', color: '#a00', isHuman: true }],
      barbarians: true,
    });
    state.map = createMap({ width: 12, height: 10, terrain: 'grassland' });
    resetVisibility(state);
    state.units = [];
    state.cities = [];
    state.nextEntityId = 1;

    const wild = state.players.find((player) => player.barbarian)!;
    const { guard, here, along } = picket(state.map);
    unit(state, guard, 'warrior', wild.id);
    const mover = unit(state, here, 'chariotArcher', 0);
    const full = fullMovement(mover, state);

    step(state, mover, along);
    expect(mover.movesLeft).toBe(full - 1 - TOLL);
  });

  it('binds the wild too: the rule is a fact about the board, not about empires', () => {
    const state = newGame({
      seed: 5,
      sizeName: 'duel',
      players: [{ name: 'A', color: '#a00', isHuman: true }],
      barbarians: true,
    });
    state.map = createMap({ width: 12, height: 10, terrain: 'grassland' });
    resetVisibility(state);
    state.units = [];
    state.cities = [];
    state.nextEntityId = 1;

    const wild = state.players.find((player) => player.barbarian)!;
    const { guard, here, along } = picket(state.map);
    unit(state, guard, 'warrior', 0);
    // The raider marches by the ordinary machinery — `barbarians.ts` walks
    // `findPath` into `advanceAlongPath` like anybody else — so it inherits the
    // rule without a line of its own.
    const raider = unit(state, here, 'chariotArcher', wild.id);
    const full = fullMovement(raider, state);

    step(state, raider, along);
    expect([raider.col, raider.row]).toEqual([along.col, along.row]);
    expect(raider.movesLeft).toBe(full - 1 - TOLL);
  });

  it('binds a scout: `ignoresTerrainCost` is about the ground, not the enemy', () => {
    const state = flatState();
    const { guard, here, along } = picket(state.map);
    unit(state, guard, 'warrior', 1);
    const scout = unit(state, here, 'scout', 0);
    const full = fullMovement(scout, state);
    expect(unitDef('scout').ignoresTerrainCost).toBe(true);

    step(state, scout, along);
    expect([scout.col, scout.row]).toEqual([along.col, along.row]);
    // The floor it pays for the ground, and the toll on top of it: an ability
    // about the ground buys nothing against a picket.
    expect(scout.movesLeft).toBe(full - RULES.movement.minStepCost - TOLL);
  });

  it('does not chain between two different enemies', () => {
    const state = flatState();
    const { guard, here, along } = picket(state.map);
    // One picket for each hex, neither touching the other's. The slide is free
    // because no *single* piece holds both ends of it.
    const forHere = ring(state.map, here).find(
      (tile) => tile !== along && !touches(state.map, tile, along),
    )!;
    const forAlong = ring(state.map, along).find(
      (tile) => tile !== here && !touches(state.map, tile, here) && tile !== forHere,
    )!;
    expect(guard).toBeDefined();
    unit(state, forHere, 'warrior', 1);
    unit(state, forAlong, 'warrior', 1);
    const mover = unit(state, here, 'warrior', 0);
    const full = fullMovement(mover, state);

    step(state, mover, along);
    expect([mover.col, mover.row]).toEqual([along.col, along.row]);
    expect(mover.movesLeft).toBe(full - 1);
  });

  it('is a symmetric fact about a pair of hexes, however it is asked', () => {
    const state = flatState();
    const { guard, here, along, away } = picket(state.map);
    unit(state, guard, 'warrior', 1);
    const field = zocField(state, 0);
    expect(zocBinds(state.map, field, here, along)).toBe(true);
    expect(zocBinds(state.map, field, along, here)).toBe(true);
    expect(zocBinds(state.map, field, here, away)).toBe(false);
    expect(zocBinds(state.map, field, away, here)).toBe(false);
  });

  it('prices the step through `stepCost` and nowhere else', () => {
    const state = flatState();
    const { guard, here, along, away } = picket(state.map);
    unit(state, guard, 'warrior', 1);
    const field = zocField(state, 0);
    const mover = { def: unitDef('warrior'), embarks: false, naval: false, ocean: false };
    expect(stepCost(state.map, here, along, mover, field)).toEqual({ cost: 1 + TOLL, zoc: true });
    expect(stepCost(state.map, here, away, mover, field)).toEqual({ cost: 1, zoc: false });
    // Impassable is still impassable, and it is decided before anything else.
    along.terrain = 'mountain';
    expect(stepCost(state.map, here, along, mover, field)).toBeNull();
  });

  it('tells the interface when a unit is being held', () => {
    const state = flatState();
    const { guard, here, away } = picket(state.map);
    const enemy = unit(state, guard, 'warrior', 1);
    const held = unit(state, here, 'warrior', 0);
    const free = unit(state, away, 'warrior', 0);
    expect(inZoneOfControl(state, held)).toBe(true);
    expect(inZoneOfControl(state, free)).toBe(false);
    // And it is the *enemy* half that matters, not the standing-next-to half.
    expect(inZoneOfControl(state, enemy)).toBe(true);
    enemy.ownerId = 0;
    expect(inZoneOfControl(state, held)).toBe(false);
  });
});

// --- the overlay ------------------------------------------------------------

describe('the reachable set under a zone of control', () => {
  it('prices the hex alongside at the ground plus the toll, and hides the one past it', () => {
    const state = flatState();
    const { guard, here, along } = picket(state.map);
    const mover = unit(state, here, 'warrior', 0);
    const full = fullMovement(mover, state);

    // The tile straight on through the slide: `along` is its *only* neighbour
    // that the mover can also reach in one step, so it is reachable exactly
    // when the slide leaves something to spend.
    const beyond = ring(state.map, along).find(
      (tile) =>
        tile !== guard &&
        wrappedDistance(state.map, tileHex(here), tileHex(tile)) === 2 &&
        ring(state.map, tile).filter((n) => touches(state.map, n, here)).length === 1,
    )!;
    expect(beyond).toBeDefined();

    const sweep = (): Map<Tile, number> =>
      new Map(reachableTiles(state, mover).map((r) => [r.tile, r.cost]));

    // The control: an enemy *civilian* on the same hex. It blocks the same
    // ground and holds none of it, so any difference below is the rule alone.
    const quiet = unit(state, guard, 'settler', 1);
    const open = sweep();
    expect(open.get(along)).toBe(1);
    expect(open.get(beyond)).toBe(2);

    state.units = state.units.filter((u) => u.id !== quiet.id);
    unit(state, guard, 'warrior', 1);
    const held = sweep();
    // The step alongside still happens, at the ground's price plus the toll —
    // which for a two-point warrior is its whole turn, and that is arithmetic
    // rather than a rule about turns.
    expect(held.get(along)).toBe(1 + TOLL);
    expect(held.get(along)).toBe(full);
    // Nothing past it: the frontier stops where the purse does, by the same
    // clause that stops it at the edge of any other expensive ground.
    expect(held.has(beyond)).toBe(false);
  });

  it('prices the slide at exactly what the way round costs, and takes the short one', () => {
    const state = flatState();
    const { guard, here, along } = picket(state.map);
    unit(state, guard, 'warrior', 1);
    // A toll of one point on flat ground is exactly what the detour costs: the
    // slide is one step at two points, going round is two steps at one each.
    // So a picket is a **toll** rather than a wall — the old lock made the
    // detour strictly better, and it no longer is.
    const scout = unit(state, here, 'scout', 0);
    const full = fullMovement(scout, state);
    const route = findPath(state, scout, along)!;
    // Equal costs settle by the search's own total order, which never displaces
    // a route already recorded at that cost — here, the direct step. The claim
    // worth pinning is that it is *one* answer, whatever it is, and that the
    // walk spends what the search said.
    expect(route).toHaveLength(1);
    advanceAlongPath(state, scout, route);
    expect([scout.col, scout.row]).toEqual([along.col, along.row]);
    expect(scout.movesLeft).toBe(full - 1 - TOLL);
  });

  it('leaves the sweep untouched where no enemy stands', () => {
    const state = flatState();
    const mover = unit(state, at(state.map, 4, 4), 'warrior', 0);
    const before = reachableTiles(state, mover).map((r) => [r.tile.col, r.tile.row, r.cost]);
    // Far enough away that nothing it holds is in reach.
    unit(state, at(state.map, 10, 8), 'warrior', 1);
    const after = reachableTiles(state, mover).map((r) => [r.tile.col, r.tile.row, r.cost]);
    expect(after).toEqual(before);
  });
});

// --- the four readers agree -------------------------------------------------


describe('one evaluator: the sweep, the route and the walk agree', () => {
  it('stops honestly when an enemy moves alongside a queued march', () => {
    const state = flatState();
    // A long straight order down an empty row, queued while the road is clear.
    const start = at(state.map, 1, 4);
    const mover = unit(state, start, 'chariotArcher', 0); // three points
    const goal = at(state.map, 5, 4);
    const path = findPath(state, mover, goal)!;
    mover.path = path.map((cell) => ({ col: cell.col, row: cell.row }));

    // The world changes under the order: a picket arrives beside the second and
    // third hexes of the route.
    const second = at(state.map, path[1]!.col, path[1]!.row);
    const third = at(state.map, path[2]!.col, path[2]!.row);
    const guard = ring(state.map, second).find(
      (tile) => touches(state.map, tile, third) && tile !== third,
    )!;
    unit(state, guard, 'warrior', 1);

    const walk = advanceAlongPath(state, mover, mover.path);
    expect(walk.cleared).toBe(false);
    expect(mover.movesLeft).toBe(0);
    // It got as far as the slide and no further, and the rest of the order is
    // still standing: this is a stop, not an abandonment.
    expect([mover.col, mover.row]).toEqual([third.col, third.row]);
    expect(mover.path?.length).toBe(path.length - 3);
  });
});

describe('the “~N turns” estimate reads the same evaluator', () => {
  it('counts the extra turn a picket costs a standing order', () => {
    const state = flatState();
    const { guard, here, along } = picket(state.map);
    const mover = unit(state, here, 'warrior', 0); // two points
    const onward = ring(state.map, along).find(
      (tile) =>
        tile !== guard &&
        tile !== here &&
        !touches(state.map, tile, here) &&
        !touches(state.map, tile, guard),
    )!;
    const order = [
      { col: along.col, row: along.row },
      { col: onward.col, row: onward.row },
    ];

    // Two hexes of open ground is exactly one turn's march for a two-point
    // piece...
    expect(pathTurns(state, mover, order)).toBe(1);
    // ...and with a picket beside the first of them it is two, because the toll
    // on the first hex leaves nothing for the second. The panel prints this;
    // `stepCost` decides it.
    unit(state, guard, 'warrior', 1);
    expect(pathTurns(state, mover, order)).toBe(2);
  });
});

// --- determinism ------------------------------------------------------------

describe('a zone of control replays', () => {
  it('reproduces a game whose log is full of marches along a picket', () => {
    const game: Game = createGame({
      seed: 2026,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a' },
        { name: 'C', color: '#0a0' },
      ],
      barbarians: true,
    });

    // Every seat's every unit is ordered to the far edge of its own sweep, ten
    // turns running, on a map crowded enough that pickets form by themselves —
    // and the wild musters into the middle of it. A locked march is a *shorter*
    // march, so a replay that priced the rule differently would land its pieces
    // somewhere else on the very first contact.
    for (let turn = 0; turn < 10; turn++) {
      for (const player of realPlayers(game.state)) {
        for (const mover of game.state.units.filter((u) => u.ownerId === player.id)) {
          const reach = reachableTiles(game.state, mover);
          if (reach.length === 0) continue;
          const goal = reach[reach.length - 1]!.tile;
          dispatch(game, {
            type: 'moveUnit',
            playerId: player.id,
            unitId: mover.id,
            target: { col: goal.col, row: goal.row },
          });
        }
      }
      for (const player of realPlayers(game.state)) {
        dispatch(game, { type: 'endTurn', playerId: player.id } as Command);
      }
    }

    expect(game.log.length).toBeGreaterThan(30);
    expect(replay(game.config, game.log)).toEqual(game.state);
  });
});
