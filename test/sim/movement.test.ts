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
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { type GameState, createUnit, newGame } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';
import { openWar } from '../../src/sim/wars';

/** A blank two-player state on a flat grassland rectangle. */
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
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
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
