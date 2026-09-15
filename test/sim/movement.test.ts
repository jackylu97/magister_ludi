/**
 * `moveUnit`, the command (gap 2 of the 2026-08-28 city-combat pass).
 *
 * `pathfind.test.ts` pins the rule at the evaluator — `canTransit`/`canStopOn`
 * refuse a foreign city hex — and this file pins it at the seam a player
 * actually touches: the `moveUnit` command, end to end through `applyCommand`.
 * A hex holding somebody else's city is not enterable by movement, stop or
 * transit, for anybody; taking it is `attack`'s job (`capturesCity` in
 * `combat.ts`), never an ordinary march's.
 */
import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { type Command, applyCommand } from '../../src/sim/commands';
import { snapshotState } from '../../src/sim/game';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { type GameState, createUnit, newGame } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';
import { openWar } from '../../src/sim/wars';

/** A blank two-player state on a flat grassland rectangle, nobody at war. */
function peaceState(width = 10, height = 8): GameState {
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
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  return state;
}

/** A blank two-player state on a flat grassland rectangle. */
function flatState(width = 10, height = 8): GameState {
  const state = peaceState(width, height);
  // **The two seats are at war** (schema 56): this file asks what a *march*
  // does, and at peace a soldier may not enter another empire's fields at all —
  // so a bench at peace would be testing the border rule over and over instead.
  // The border rule has its own file (`test/sim/war.test.ts`).
  openWar(state, 0, 1);
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function moveUnit(unitId: number, col: number, row: number, playerId = 0): Command {
  return { type: 'moveUnit', playerId, unitId, target: { col, row } };
}

function attack(unitId: number, col: number, row: number, playerId = 0): Command {
  return { type: 'attack', playerId, unitId, target: { col, row } };
}

describe('moveUnit onto a city hex', () => {
  it('refuses a foreign city with a named sentence, not a coordinate', () => {
    const state = flatState();
    const city = foundCityAt(state, 1, at(state.map, 5, 4));
    const mover = createUnit(state, 0, 'warrior', 4, 4);

    const result = applyCommand(state, moveUnit(mover.id, 5, 4));
    expect(result).toEqual({ ok: false, error: `${city.name} is another empire's city — take it by force` });

    // Rejected, so the unit did not move — the reducer's own contract.
    expect(mover.col).toBe(4);
    expect(mover.row).toBe(4);
  });

  it('refuses even an empty, undefended foreign city the same way', () => {
    const state = flatState();
    const city = foundCityAt(state, 1, at(state.map, 5, 4));
    city.hp = 1; // walls down, nobody home — still not a march's to take
    const mover = createUnit(state, 0, 'warrior', 4, 4);

    const result = applyCommand(state, moveUnit(mover.id, 5, 4));
    expect(result.ok).toBe(false);
    expect(mover.col).toBe(4);
    expect(mover.row).toBe(4);
  });

  it('leaves a unit’s own city ordinary, enterable ground', () => {
    const state = flatState();
    foundCityAt(state, 0, at(state.map, 5, 4));
    const mover = createUnit(state, 0, 'warrior', 4, 4);

    const result = applyCommand(state, moveUnit(mover.id, 5, 4));
    expect(result.ok).toBe(true);
    expect(mover.col).toBe(5);
    expect(mover.row).toBe(4);
  });

  it('is enterable by its new owner the instant capture flips it, same turn', () => {
    const state = flatState();
    const city = foundCityAt(state, 1, at(state.map, 5, 4));
    city.hp = 1; // walls down, nobody home: the next melee blow takes it
    const raider = createUnit(state, 0, 'warrior', 4, 4);
    // A second piece of the same empire, standing at the city's other gate —
    // the one actually under test. It played no part in the attack; the only
    // thing that changed for it is who the city belongs to.
    const settler = createUnit(state, 0, 'settler', 6, 4);

    // `toMatchObject`: taking a seat of government clacks a bead, and the
    // result carries what it earned.
    expect(applyCommand(state, attack(raider.id, 5, 4))).toMatchObject({ ok: true });
    expect(city.ownerId).toBe(0);

    const result = applyCommand(state, moveUnit(settler.id, 5, 4));
    expect(result.ok).toBe(true);
    expect(settler.col).toBe(5);
    expect(settler.row).toBe(4);
  });
});

/**
 * **Passing, and the swap** — `docs/flags.md` (ooooo), the user of 2026-09-15.
 * The rules themselves are pinned at the evaluator in `pathfind.test.ts`; this
 * file pins them at the seam a player touches, the `moveUnit` command end to end
 * through `applyCommand`.
 */
describe('moveUnit past a piece at peace', () => {
  it('walks through a neighbour who is in the way, and still will not stand on them', () => {
    const state = peaceState();
    const mover = createUnit(state, 0, 'warrior', 4, 4);
    createUnit(state, 1, 'spearman', 5, 4);

    // Two hexes, both open ground, with a stranger's spearman on the first: the
    // column files past for the ground's own price and arrives.
    expect(applyCommand(state, moveUnit(mover.id, 6, 4))).toEqual({ ok: true });
    expect([mover.col, mover.row]).toEqual([6, 4]);

    // And the hex it walked through is still not one it may rest on.
    const back = applyCommand(state, moveUnit(mover.id, 5, 4));
    expect(back.ok).toBe(false);
    expect([mover.col, mover.row]).toEqual([6, 4]);
  });

  it('keeps a declared enemy a wall', () => {
    const state = flatState();
    const mover = createUnit(state, 0, 'warrior', 4, 4);
    createUnit(state, 1, 'spearman', 5, 4);
    // Fenced in, so the only road to the far hex is through the picket: two
    // walls of mountain with one open row between them.
    for (const tile of state.map.tiles) {
      if (tile.row !== 4) tile.terrain = 'mountain';
    }
    // Accepted — the board wraps, so there is always a long way round — but
    // the road it takes is the long one: the picket's hex is neither walked nor
    // stored, which is the whole of what a wall means.
    expect(applyCommand(state, moveUnit(mover.id, 6, 4)).ok).toBe(true);
    expect([mover.col, mover.row]).not.toEqual([5, 4]);
    expect(mover.col).toBeLessThan(5);
    for (const step of mover.path ?? []) expect([step.col, step.row]).not.toEqual([5, 4]);
  });
});

describe('moveUnit onto one of your own soldiers', () => {
  it('trades places, spends both allowances and wakes them both', () => {
    const state = peaceState();
    const mover = createUnit(state, 0, 'warrior', 4, 4);
    const sitter = createUnit(state, 0, 'spearman', 5, 4);
    sitter.sleeping = true;
    sitter.fortifiedTurns = 1;
    const moverStart = mover.movesLeft;
    const sitterStart = sitter.movesLeft;

    expect(applyCommand(state, moveUnit(mover.id, 5, 4))).toEqual({ ok: true });
    expect([mover.col, mover.row]).toEqual([5, 4]);
    expect([sitter.col, sitter.row]).toEqual([4, 4]);
    // Both walked, so both paid for their walk and neither is dug in or asleep.
    expect(mover.movesLeft).toBeLessThan(moverStart);
    expect(sitter.movesLeft).toBeLessThan(sitterStart);
    expect(sitter.sleeping).toBeUndefined();
    expect(sitter.fortifiedTurns).toBeUndefined();
    expect(mover.path).toBeUndefined();
    expect(sitter.path).toBeUndefined();
  });

  it('swaps across two hexes, the sitter walking the road back', () => {
    const state = peaceState();
    const mover = createUnit(state, 0, 'horseman', 3, 4);
    const sitter = createUnit(state, 0, 'horseman', 5, 4);

    expect(applyCommand(state, moveUnit(mover.id, 5, 4)).ok).toBe(true);
    expect([mover.col, mover.row]).toEqual([5, 4]);
    expect([sitter.col, sitter.row]).toEqual([3, 4]);
  });

  it('refuses when either piece is short of the walk, byte for byte', () => {
    const state = peaceState();
    const mover = createUnit(state, 0, 'warrior', 4, 4);
    const sitter = createUnit(state, 0, 'spearman', 5, 4);
    sitter.movesLeft = 0;

    const before = snapshotState(state);
    const result = applyCommand(state, moveUnit(mover.id, 5, 4));
    expect(result).toEqual({
      ok: false,
      error: 'Your Spearman there has not the movement to trade places',
    });
    expect(snapshotState(state)).toEqual(before);

    // The other way round: the sitter is fed and the mover is spent. A piece
    // with nothing left is given the march as a standing order everywhere else
    // in this game — but a swap is never stored, so this is a refusal.
    sitter.movesLeft = 2;
    mover.movesLeft = 0;
    const spent = snapshotState(state);
    expect(applyCommand(state, moveUnit(mover.id, 5, 4)).ok).toBe(false);
    expect(snapshotState(state)).toEqual(spent);
  });

  it('never swaps a civilian, in either chair', () => {
    const state = peaceState();
    const worker = createUnit(state, 0, 'worker', 4, 4);
    const soldier = createUnit(state, 0, 'warrior', 5, 4);
    // A worker ordered onto its own escort: an ordinary march onto a hex with
    // room in the civilian slot, and emphatically not a trade — the escort
    // stands exactly where it stood.
    expect(applyCommand(state, moveUnit(worker.id, 5, 4)).ok).toBe(true);
    expect([worker.col, worker.row]).toEqual([5, 4]);
    expect([soldier.col, soldier.row]).toEqual([5, 4]);

    // And the escort ordered onto a hex holding only a worker of its own: that
    // is an ordinary march onto a hex with room in the military slot, not a
    // swap — the worker stays exactly where it is.
    const other = createUnit(state, 0, 'worker', 6, 4);
    expect(applyCommand(state, moveUnit(soldier.id, 6, 4)).ok).toBe(true);
    expect([soldier.col, soldier.row]).toEqual([6, 4]);
    expect([other.col, other.row]).toEqual([6, 4]);
  });

  it('never swaps with another seat, at peace or at war', () => {
    const peace = peaceState();
    const mine = createUnit(peace, 0, 'warrior', 4, 4);
    const theirs = createUnit(peace, 1, 'warrior', 5, 4);
    expect(applyCommand(peace, moveUnit(mine.id, 5, 4)).ok).toBe(false);
    expect([mine.col, mine.row]).toEqual([4, 4]);
    expect([theirs.col, theirs.row]).toEqual([5, 4]);

    const war = flatState();
    const ours = createUnit(war, 0, 'warrior', 4, 4);
    const enemy = createUnit(war, 1, 'warrior', 5, 4);
    expect(applyCommand(war, moveUnit(ours.id, 5, 4)).ok).toBe(false);
    expect([ours.col, ours.row]).toEqual([4, 4]);
    expect([enemy.col, enemy.row]).toEqual([5, 4]);
  });
});
