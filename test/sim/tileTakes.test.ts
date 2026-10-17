/**
 * **Towns may take each other's hexes with the citizen tool** (the user's
 * ruling of 2026-10-17, `docs/flags.md` (aaaaaaa)).
 *
 * A pin (`setLockedTiles`) may go on a hex that another town of the same empire
 * owns, inside this town's work radius. The pin takes the hex: `state.tileOwner`
 * moves to this town, and the hex stays this town's when the pin is lifted. The
 * one list of such hexes is `takeableTiles` (`cities.ts`). The readings:
 *
 *   1. no take gives a town two "at most one per town" works (The Keeps);
 *   2. the town that loses the hex drops its pin there, and its citizens are
 *      placed again in the same command;
 *   3. the automatic assignment, and so the bots, never take a hex.
 */

import { describe, expect, it } from 'vitest';

import {
  assignableTiles,
  foundCityAt,
  refreshCityDerived,
  takeBlockedBy,
  takeableTiles,
  withinWorkRadius,
} from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { snapshotState } from '../../src/sim/game';
import { type Tile, createMap, getTileAt, raiseImprovement, tileIndex } from '../../src/sim/map';
import { makeRng } from '../../src/sim/rng';
import { type City, type GameState, bumpRevision } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

/** Two seats on a flat grassland board, nothing on it. */
function board(): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 24, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(24 * 12).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  state.rng = makeRng(12345);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  return getTileAt(state.map, col, row)!;
}

/** A town of three at a hex, its citizens placed. */
function town(state: GameState, playerId: number, col: number, row: number, population = 3): City {
  const city = foundCityAt(state, playerId, at(state, col, row));
  city.population = population;
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/**
 * Seat 0's capital at (4, 4) and its second town at (7, 4), three hexes east.
 * The second town's ring holds (6, 4), two hexes from the capital.
 */
function twoTowns(): { state: GameState; home: City; next: City; hex: Tile } {
  const state = board();
  const home = town(state, 0, 4, 4);
  const next = town(state, 0, 7, 4);
  const hex = at(state, 6, 4);
  expect(owner(state, hex)).toBe(next.id);
  return { state, home, next, hex };
}

function owner(state: GameState, tile: Tile): number | null {
  return state.tileOwner[tileIndex(state.map, tile.col, tile.row)] ?? null;
}

function pin(state: GameState, city: City, cells: readonly Tile[]): ReturnType<typeof applyCommand> {
  return applyCommand(state, {
    type: 'setLockedTiles',
    playerId: city.ownerId,
    cityId: city.id,
    cells: cells.map((tile) => ({ col: tile.col, row: tile.row })),
  });
}

const works = (city: City, tile: Tile): boolean =>
  city.workedTiles.some((cell) => cell.col === tile.col && cell.row === tile.row);

/** Expects a pin to be refused with these words, and the state left byte for byte as it was. */
function refused(state: GameState, city: City, cells: readonly Tile[], words: string): void {
  const before = snapshotState(state);
  const result = pin(state, city, cells);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error).toBe(words);
  expect(snapshotState(state)).toBe(before);
}

describe('a pin takes a hex from another town of the empire', () => {
  it('takes a hex inside the work radius, and works it', () => {
    const { state, home, next, hex } = twoTowns();
    expect(takeableTiles(state, home).map((entry) => [entry.tile.col, entry.tile.row, entry.from.id])).toContainEqual([
      6,
      4,
      next.id,
    ]);
    const result = pin(state, home, [hex]);
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
    expect(owner(state, hex)).toBe(home.id);
    expect(works(home, hex)).toBe(true);
    expect(home.lockedTiles).toEqual([{ col: 6, row: 4 }]);
    // Now its own, so an ordinary hex of the town and no longer a take.
    expect(assignableTiles(state, home).includes(hex)).toBe(true);
    expect(takeableTiles(state, home).some((entry) => entry.tile === hex)).toBe(false);
  });

  it('refuses a hex outside the work radius: a town eight hexes away takes nothing', () => {
    const { state, home } = twoTowns();
    const far = town(state, 0, 12, 4);
    const hex = at(state, 11, 4);
    expect(owner(state, hex)).toBe(far.id);
    expect(takeableTiles(state, home).some((entry) => entry.from.id === far.id)).toBe(false);
    refused(state, home, [hex], `${home.name} cannot work (11, 4)`);
    // And the far town cannot reach back either.
    refused(state, far, [at(state, 5, 4)], `${far.name} cannot work (5, 4)`);
  });

  it('refuses another empire’s hex and a town’s own centre', () => {
    const { state, home, next } = twoTowns();
    const rival = town(state, 1, 4, 8);
    const theirs = at(state, 4, 7);
    expect(owner(state, theirs)).toBe(rival.id);
    // Both hexes are inside the capital's reach: the refusals are about whose
    // they are, not about how far.
    expect(withinWorkRadius(state, home, 4, 7)).toBe(true);
    expect(withinWorkRadius(state, home, next.col, next.row)).toBe(true);
    refused(state, home, [theirs], `${home.name} cannot work (4, 7)`);
    refused(state, home, [at(state, next.col, next.row)], `${home.name} cannot work (7, 4)`);
  });

  it('drops the losing town’s pin there and places its citizens again in the same command', () => {
    const { state, home, next, hex } = twoTowns();
    expect(pin(state, next, [hex]).ok).toBe(true);
    expect(works(next, hex)).toBe(true);
    const seated = next.workedTiles.length;
    expect(pin(state, home, [hex]).ok).toBe(true);
    expect(next.lockedTiles).toEqual([]);
    expect(works(next, hex)).toBe(false);
    // Re-seated on its own ground, not left one citizen short.
    expect(next.workedTiles.length).toBe(seated);
    for (const cell of next.workedTiles) expect(owner(state, at(state, cell.col, cell.row))).toBe(next.id);
    expect(works(home, hex)).toBe(true);
  });

  it('refuses a take that would give a town two works it may hold once', () => {
    const { state, home, hex } = twoTowns();
    raiseImprovement(hex, 'townKeep', state.turn);
    expect(takeableTiles(state, home).some((entry) => entry.tile === hex)).toBe(true);
    raiseImprovement(at(state, 3, 4), 'townKeep', state.turn);
    expect(owner(state, at(state, 3, 4))).toBe(home.id);
    bumpRevision(state);
    expect(takeableTiles(state, home).some((entry) => entry.tile === hex)).toBe(false);
    expect(takeBlockedBy(state, home, hex)).toBe('townKeep');
    refused(state, home, [hex], `${home.name} already has a keep`);
  });

  it('refuses two takes in one command that would bring two such works', () => {
    const { state, home, hex } = twoTowns();
    const third = town(state, 0, 4, 1);
    const other = at(state, 4, 2);
    expect(owner(state, other)).toBe(third.id);
    raiseImprovement(hex, 'townKeep', state.turn);
    raiseImprovement(other, 'townKeep', state.turn);
    bumpRevision(state);
    // Each is takeable on its own, and the two together are refused.
    const takeable = takeableTiles(state, home).map((entry) => entry.tile);
    expect(takeable.includes(hex) && takeable.includes(other)).toBe(true);
    refused(state, home, [hex, other], `${home.name} already has a keep`);
    expect(pin(state, home, [hex]).ok).toBe(true);
    expect(owner(state, hex)).toBe(home.id);
    expect(owner(state, other)).toBe(third.id);
  });

  it('keeps the hex with the town that took it when the pin is lifted', () => {
    const { state, home, next, hex } = twoTowns();
    expect(pin(state, home, [hex]).ok).toBe(true);
    expect(pin(state, home, []).ok).toBe(true);
    expect(owner(state, hex)).toBe(home.id);
    refreshCityDerived(state, next);
    expect(works(next, hex)).toBe(false);
  });

  it('never takes a hex through the automatic assignment, or through a turn', () => {
    const { state, home, next } = twoTowns();
    const theirs = state.tileOwner.map((holder, index) => (holder === next.id ? index : -1)).filter((index) => index >= 0);
    // More citizens than the capital has ground: the spare ones idle or
    // specialise, and never reach across.
    home.population = 12;
    refreshCityDerived(state, home);
    for (const cell of home.workedTiles) expect(owner(state, at(state, cell.col, cell.row))).toBe(home.id);
    for (const player of [0, 1]) expect(applyCommand(state, { type: 'endTurn', playerId: player }).ok).toBe(true);
    for (const index of theirs) expect(state.tileOwner[index]).toBe(next.id);
    for (const cell of home.workedTiles) expect(owner(state, at(state, cell.col, cell.row))).toBe(home.id);
  });
});
