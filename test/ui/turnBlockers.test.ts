/**
 * The End Turn gate: what the local seat still owes the turn.
 *
 * `firstBlocker` was extracted from `src/ui/controls.ts` precisely so that this
 * file could exist — the camera pan, the selection and the button's label are
 * browser-only and are not covered here (as with every other UI pass, there is
 * no jsdom in this suite), but the *decision* is a fold over the state and is
 * covered exhaustively: each kind, the priority between them, every exclusion
 * the idle definition makes, and the three seats that are never blocked at all.
 */

import { describe, expect, it } from 'vitest';
import { foundCityAt } from '../../src/sim/cities';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import {
  type City,
  type GameState,
  type Unit,
  createUnit,
  newGame,
} from '../../src/sim/state';
import { availableTechs } from '../../src/sim/tech';
import { TECH_IDS } from '../../src/sim/techData';
import { resetVisibility } from '../../src/sim/visibility';
import { firstBlocker, isIdleUnit } from '../../src/ui/turnBlockers';

/** A two-player state on a blank grassland rectangle, as `tech.test.ts` uses. */
function flatState(width = 16, height = 12): GameState {
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

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function plant(state: GameState, ownerId: number, col: number, row: number): City {
  return foundCityAt(state, ownerId, at(state.map, col, row));
}

/**
 * A state with nothing outstanding at all, which every test below starts from
 * and then breaks in exactly one way.
 *
 * "Nothing outstanding" is three separate facts, so all three are set: no units
 * on the board, no cities, and a research pool with an aim. A test that adds one
 * idle unit is then testing that unit and nothing else.
 */
function settled(): GameState {
  const state = flatState();
  const player = state.players[0]!;
  player.researching = availableTechs(state, 0)[0] ?? null;
  expect(player.researching).not.toBeNull();
  return state;
}

/** Puts a unit down and spends its whole allowance: present, but finished. */
function spentUnit(state: GameState, ownerId: number, col: number, row: number): Unit {
  const unit = createUnit(state, ownerId, 'warrior', col, row);
  unit.movesLeft = 0;
  return unit;
}

// ---------------------------------------------------------------------------

describe('isIdleUnit', () => {
  it('calls a fresh unit with moves and no orders idle', () => {
    const state = flatState();
    expect(isIdleUnit(createUnit(state, 0, 'warrior', 3, 3))).toBe(true);
  });

  it('does not call a spent unit idle', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    unit.movesLeft = 0;
    expect(isIdleUnit(unit)).toBe(false);
  });

  it('does not call a unit under a standing order idle', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    unit.path = [{ col: 4, row: 3 }, { col: 5, row: 3 }];
    expect(isIdleUnit(unit)).toBe(false);
  });

  it('does not call a fortified unit idle, however long it has been dug in', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    unit.fortifiedTurns = 0;
    expect(isIdleUnit(unit)).toBe(false);
    unit.fortifiedTurns = 5;
    expect(isIdleUnit(unit)).toBe(false);
  });

  it('still calls a unit that attacked but can walk idle', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    unit.hasAttacked = true;
    expect(unit.movesLeft).toBeGreaterThan(0);
    expect(isIdleUnit(unit)).toBe(true);
  });

  it('does not call a unit that attacked and is out of movement idle', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    unit.hasAttacked = true;
    unit.movesLeft = 0;
    expect(isIdleUnit(unit)).toBe(false);
  });

  it('treats an emptied path as no order at all', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    unit.path = [];
    expect(isIdleUnit(unit)).toBe(true);
  });

  it('calls a worker with charges, movement and no orders idle', () => {
    // The unit this prompt exists for: a worker parked on farmable ground is a
    // wasted turn, and it falls out of the three clauses without a fourth. See
    // the module docblock in `turnBlockers.ts`.
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 3, 3);
    expect(worker.chargesLeft).toBe(3);
    expect(isIdleUnit(worker)).toBe(true);
  });

  it('stops calling a worker idle once it has spent its turn building', () => {
    // Building spends the *whole* allowance (see `buildImprovementAt`), which is
    // exactly what makes the `movesLeft` clause enough on its own.
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 3, 3);
    worker.chargesLeft = 2;
    worker.movesLeft = 0;
    expect(isIdleUnit(worker)).toBe(false);
  });
});

describe('firstBlocker · idle units', () => {
  it('reports an idle unit by id', () => {
    const state = settled();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    expect(firstBlocker(state, 0)).toEqual({ kind: 'idleUnit', unitId: unit.id });
  });

  it('reports the first idle unit in state order, not merely any of them', () => {
    const state = settled();
    const first = createUnit(state, 0, 'warrior', 3, 3);
    createUnit(state, 0, 'warrior', 4, 3);
    expect(firstBlocker(state, 0)).toEqual({ kind: 'idleUnit', unitId: first.id });
    // Give the first one orders and the next one steps up.
    first.movesLeft = 0;
    expect(firstBlocker(state, 0)).toEqual({
      kind: 'idleUnit',
      unitId: state.units[1]!.id,
    });
  });

  it('never blocks on somebody else’s idle unit', () => {
    const state = settled();
    createUnit(state, 1, 'warrior', 3, 3);
    expect(firstBlocker(state, 0)).toBeNull();
  });

  it('is silent when every unit is spent, marching or dug in', () => {
    const state = settled();
    spentUnit(state, 0, 3, 3);
    createUnit(state, 0, 'warrior', 4, 3).path = [{ col: 5, row: 3 }];
    createUnit(state, 0, 'warrior', 5, 4).fortifiedTurns = 2;
    expect(firstBlocker(state, 0)).toBeNull();
  });
});

describe('firstBlocker · production', () => {
  it('reports a city with an empty queue', () => {
    const state = settled();
    const city = plant(state, 0, 5, 5);
    expect(city.queue).toEqual([]);
    expect(firstBlocker(state, 0)).toEqual({ kind: 'cityProduction', cityId: city.id });
  });

  it('is silent once the queue holds anything', () => {
    const state = settled();
    const city = plant(state, 0, 5, 5);
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    expect(firstBlocker(state, 0)).toBeNull();
  });

  it('reports the first empty queue in state order', () => {
    const state = settled();
    const first = plant(state, 0, 3, 3);
    plant(state, 0, 9, 8);
    expect(firstBlocker(state, 0)).toEqual({ kind: 'cityProduction', cityId: first.id });
    first.queue = [{ kind: 'unit', id: 'warrior' }];
    expect(firstBlocker(state, 0)).toEqual({
      kind: 'cityProduction',
      cityId: state.cities[1]!.id,
    });
  });

  it('never blocks on a rival’s idle city', () => {
    const state = settled();
    plant(state, 1, 5, 5);
    expect(firstBlocker(state, 0)).toBeNull();
  });
});

describe('firstBlocker · research', () => {
  it('reports an unaimed science pool', () => {
    const state = settled();
    state.players[0]!.researching = null;
    expect(firstBlocker(state, 0)).toEqual({ kind: 'research' });
  });

  it('is silent when the tree is exhausted', () => {
    const state = settled();
    const player = state.players[0]!;
    player.researching = null;
    player.techsResearched = [...TECH_IDS];
    expect(availableTechs(state, 0)).toEqual([]);
    expect(firstBlocker(state, 0)).toBeNull();
  });

  it('is silent while a technology is being researched', () => {
    const state = settled();
    expect(firstBlocker(state, 0)).toBeNull();
  });
});

describe('firstBlocker · skipped units', () => {
  // The exclusion is the testable half of Skip Turn: `controls.ts` owns the
  // set and when it is cleared, but the fold that skips past it is this pure
  // function's, and it is covered exactly like every other clause here.
  it('does not report a skipped idle unit', () => {
    const state = settled();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    expect(firstBlocker(state, 0, { skippedUnitIds: new Set([unit.id]) })).toBeNull();
  });

  it('reports the next idle unit past a skipped one, in state order', () => {
    const state = settled();
    const skipped = createUnit(state, 0, 'warrior', 3, 3);
    const next = createUnit(state, 0, 'warrior', 4, 3);
    expect(firstBlocker(state, 0, { skippedUnitIds: new Set([skipped.id]) })).toEqual({
      kind: 'idleUnit',
      unitId: next.id,
    });
  });

  it('falls through to production once every idle unit is skipped', () => {
    const state = settled();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    const city = plant(state, 0, 5, 5);
    expect(firstBlocker(state, 0, { skippedUnitIds: new Set([unit.id]) })).toEqual({
      kind: 'cityProduction',
      cityId: city.id,
    });
  });

  it('does not excuse a unit the exclusion does not name', () => {
    const state = settled();
    const skipped = createUnit(state, 0, 'warrior', 3, 3);
    const other = createUnit(state, 0, 'warrior', 4, 3);
    expect(firstBlocker(state, 0, { skippedUnitIds: new Set([skipped.id, 999]) })).toEqual({
      kind: 'idleUnit',
      unitId: other.id,
    });
  });

  it('behaves exactly as the unexcluded call with no exclusions object at all', () => {
    const state = settled();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    expect(firstBlocker(state, 0, {})).toEqual({ kind: 'idleUnit', unitId: unit.id });
  });
});

describe('firstBlocker · priority', () => {
  it('answers unit, then production, then research, in that order', () => {
    const state = settled();
    const player = state.players[0]!;
    player.researching = null;
    const city = plant(state, 0, 5, 5);
    const unit = createUnit(state, 0, 'warrior', 3, 3);

    // All three outstanding at once: the unit is the one that costs a turn of
    // movement, so it goes first.
    expect(firstBlocker(state, 0)).toEqual({ kind: 'idleUnit', unitId: unit.id });
    unit.movesLeft = 0;
    expect(firstBlocker(state, 0)).toEqual({ kind: 'cityProduction', cityId: city.id });
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    expect(firstBlocker(state, 0)).toEqual({ kind: 'research' });
    player.researching = availableTechs(state, 0)[0] ?? null;
    expect(firstBlocker(state, 0)).toBeNull();
  });

  it('walks the whole list rather than stopping at the first unit it sees', () => {
    // A spent unit ahead of an idle one in `state.units` must not hide it.
    const state = settled();
    spentUnit(state, 0, 3, 3);
    const idle = createUnit(state, 0, 'warrior', 4, 3);
    expect(firstBlocker(state, 0)).toEqual({ kind: 'idleUnit', unitId: idle.id });
  });
});

describe('firstBlocker · seats that are never blocked', () => {
  it('answers nothing for a player who does not exist', () => {
    const state = settled();
    createUnit(state, 0, 'warrior', 3, 3);
    expect(firstBlocker(state, 7)).toBeNull();
  });

  it('answers nothing for an eliminated player', () => {
    const state = settled();
    state.players[0]!.researching = null;
    state.players[0]!.eliminated = true;
    expect(firstBlocker(state, 0)).toBeNull();
  });

  it('answers nothing once the seat has ended its turn', () => {
    const state = settled();
    createUnit(state, 0, 'warrior', 3, 3);
    expect(firstBlocker(state, 0)).not.toBeNull();
    state.turnEnded[0] = true;
    expect(firstBlocker(state, 0)).toBeNull();
    // ...and the seat that has not ended is still asked in earnest.
    createUnit(state, 1, 'warrior', 4, 3);
    expect(firstBlocker(state, 1)).not.toBeNull();
  });
});
