import { describe, expect, it } from 'vitest';
import { type Command, applyCommand } from '../../src/sim/commands';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import { type GameState, type Unit, createUnit, newGame } from '../../src/sim/state';
import { UNIT_TYPE_IDS, isCivilian, unitDef } from '../../src/sim/unitData';
import { hasStackingRoom, stacksFreely, unitsOnTile } from '../../src/sim/units';
import { resetVisibility } from '../../src/sim/visibility';

/** A blank two-player state on a flat grassland rectangle. */
function flatState(width = 16, height = 8): GameState {
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

function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

/**
 * Ends the turn for every seat, so the end-of-turn phases actually run. Turns
 * are simultaneous: the pipeline fires on the *last* of these, not on each.
 */
function endRound(state: GameState, order?: readonly number[]): void {
  const ids = order ?? state.players.map((player) => player.id);
  for (const playerId of ids) {
    expect(applyCommand(state, { type: 'endTurn', playerId })).toEqual({ ok: true });
  }
}

/** A move order. Most units in these tests belong to player 0. */
function move(unitId: number, col: number, row: number, playerId = 0): Command {
  return { type: 'moveUnit', playerId, unitId, target: { col, row } };
}

/** A spawn. `playerId` (who asked) defaults to `ownerId` (whose unit it is). */
function spawn(
  ownerId: number,
  unitType: string,
  col: number,
  row: number,
  playerId = ownerId,
): Command {
  return { type: 'spawnUnit', playerId, ownerId, unitType, at: { col, row } } as Command;
}

describe('the stacking rule', () => {
  /**
   * The user's ruling of 2026-08-28: *"make traders their own separate unit
   * type; it can stand on the same tile as civilian and military units."*
   *
   * A hex holds one military piece, one civilian piece, and **any number of
   * traders**. Three claims live here: the roster is split three ways, the cap
   * is per slot, and the trader's slot has no cap at all.
   */
  it('gives every unit exactly one of three slots, and only the trader an uncapped one', () => {
    const categories = new Set(UNIT_TYPE_IDS.map((id) => unitDef(id).category));
    expect([...categories].sort()).toEqual(['civilian', 'military', 'trader']);
    expect(unitDef('trader').category).toBe('trader');
    expect(stacksFreely('trader')).toBe(true);
    expect(stacksFreely('civilian')).toBe(false);
    expect(stacksFreely('military')).toBe(false);
    // The category is a *stacking* answer and not a combat one: `isCivilian` is
    // `!isCombatant`, so capture, plunder, fortify and upkeep still read a
    // caravan exactly as they read a worker.
    expect(isCivilian(unitDef('trader'))).toBe(true);
  });

  it('holds one soldier, one civilian, and as many caravans as ask', () => {
    const state = flatState();
    createUnit(state, 0, 'warrior', 4, 4);
    createUnit(state, 0, 'worker', 4, 4);
    expect(hasStackingRoom(state, 4, 4, 'military')).toBe(false);
    expect(hasStackingRoom(state, 4, 4, 'civilian')).toBe(false);
    // The caravan's slot is nobody else's, and it never fills.
    expect(hasStackingRoom(state, 4, 4, 'trader')).toBe(true);
    for (let n = 0; n < 5; n++) createUnit(state, 0, 'trader', 4, 4);
    expect(hasStackingRoom(state, 4, 4, 'trader')).toBe(true);
    // And a hex full of caravans still has room for the other two.
    expect(unitsOnTile(state, 4, 4)).toHaveLength(7);
    expect(hasStackingRoom(state, 5, 4, 'military')).toBe(true);
  });

  it('lets a caravan march onto and stop on a hex two other pieces hold', () => {
    const state = flatState();
    createUnit(state, 1, 'worker', 6, 4);
    const trader = createUnit(state, 1, 'trader', 4, 4);
    // The soldier is the *same* seat's: a foreign piece is a wall for reasons
    // that have nothing to do with stacking, and that rule is untouched.
    createUnit(state, 1, 'warrior', 6, 4);

    expect(applyCommand(state, move(trader.id, 6, 4, 1)).ok).toBe(true);
    expect([trader.col, trader.row]).toEqual([6, 4]);
    expect(unitsOnTile(state, 6, 4)).toHaveLength(3);
  });
});

describe('spawnUnit', () => {
  it('puts a unit on the board at full health and movement', () => {
    const state = flatState();
    const result = applyCommand(state, spawn(1, 'scout', 3, 3));
    expect(result).toEqual({ ok: true });
    expect(state.units).toHaveLength(1);
    const scout = state.units[0]!;
    expect(scout).toEqual({
      id: RULES.game.firstEntityId,
      ownerId: 1,
      type: 'scout',
      col: 3,
      row: 3,
      hp: unitDef('scout').maxHp,
      movesLeft: unitDef('scout').movement,
      // Milestone 5: every unit carries "have I fought this turn?", and a fresh
      // one has not. No `fortifiedTurns` key — a unit that has never dug in and
      // a unit shaken out of a trench must serialise identically.
      hasAttacked: false,
    });
  });

  it('lets a military and a civilian unit share a tile', () => {
    const state = flatState();
    expect(applyCommand(state, spawn(0, 'warrior', 2, 2))).toEqual({ ok: true });
    expect(applyCommand(state, spawn(0, 'settler', 2, 2))).toEqual({ ok: true });
    expect(unitsOnTile(state, 2, 2)).toHaveLength(2);
  });

  it('refuses a second military unit on the same tile', () => {
    const state = flatState();
    applyCommand(state, spawn(0, 'warrior', 2, 2));
    const before = clone(state);
    expect(applyCommand(state, spawn(1, 'scout', 2, 2)).ok).toBe(false);
    expect(state).toEqual(before);
  });

  it('spawns for another player: playerId asks, ownerId receives', () => {
    const state = flatState();
    // Player 0 acting on behalf of player 1 — a debug or production spawn.
    expect(applyCommand(state, spawn(1, 'scout', 3, 3, 0))).toEqual({ ok: true });
    expect(state.units[0]!.ownerId).toBe(1);
  });

  it('spawns even from a seat that has already ended its turn', () => {
    const state = flatState();
    applyCommand(state, { type: 'endTurn', playerId: 0 });
    // Unlike `moveUnit`, spawning is not a move: production will run it for a
    // player who finished long ago.
    expect(applyCommand(state, spawn(0, 'warrior', 3, 3))).toEqual({ ok: true });
  });

  it('refuses impassable terrain, unknown types, owners and actors', () => {
    const state = flatState();
    at(state.map, 4, 4).terrain = 'mountain';
    at(state.map, 5, 5).terrain = 'ocean';
    const before = clone(state);

    for (const bad of [
      spawn(0, 'warrior', 4, 4), // mountain
      spawn(0, 'warrior', 5, 5), // ocean
      spawn(0, 'zeppelin', 1, 1), // no such unit type
      spawn(9, 'warrior', 1, 1), // no such owner
      spawn(0, 'warrior', 1, 1, 9), // no such acting player
      spawn(0, 'warrior', 1, 99), // off the map
      spawn(0, 'warrior', 1.5, 1), // not an integer cell
    ]) {
      expect(applyCommand(state, bad).ok).toBe(false);
    }
    expect(state).toEqual(before);
  });

  it('allocates ids from the shared entity counter', () => {
    const state = flatState();
    applyCommand(state, spawn(0, 'warrior', 1, 1));
    applyCommand(state, spawn(0, 'warrior', 2, 1));
    expect(state.units.map((u) => u.id)).toEqual([1, 2]);
    expect(state.nextEntityId).toBe(3);
  });
});

describe('moveUnit', () => {
  it('walks the unit and charges its movement', () => {
    const state = flatState();
    // 2026-08-28: scout's movement dropped 3→2 (data ruling) — one hex still
    // leaves a point unspent, which is the number this test pins, read off
    // the row rather than written as a literal.
    const scout = createUnit(state, 0, 'scout', 1, 3);
    expect(applyCommand(state, move(scout.id, 2, 3))).toEqual({ ok: true });
    expect(scout.col).toBe(2);
    expect(scout.row).toBe(3);
    expect(scout.movesLeft).toBe(unitDef('scout').movement - 1);
    expect(scout.path).toBeUndefined();
  });

  it('charges feature and hills costs', () => {
    const state = flatState();
    at(state.map, 2, 3).feature = 'forest';
    at(state.map, 2, 3).hills = true; // costs 3
    // A horseman rather than a scout: this is the *terrain* rule, and the scout
    // is now the one unit in the roster exempt from it (see the test below).
    // Four points in, three spent, one left — a figure the floor cannot fake.
    const horseman = createUnit(state, 0, 'horseman', 1, 3);
    expect(applyCommand(state, move(horseman.id, 2, 3))).toEqual({ ok: true });
    expect(horseman.movesLeft).toBe(1);
  });

  /**
   * The other half of the same rule: `ignoresTerrainCost` on a unit's row makes
   * every hex it can enter cost the floor, and the walker spends what the
   * evaluator quotes.
   *
   * Asserted through `applyCommand` rather than against `tileMoveCost` directly,
   * because the claim that matters is not "the function returns 1" — that is
   * pinned in `pathfind.test.ts` — but that the *march* is charged with the
   * mover's own row. A scout that crossed a wooded hill for 3 while the reachable
   * highlight promised 1 is exactly the drift the one-evaluator rule exists to
   * prevent.
   */
  it('charges a unit that ignores terrain the floor for every hex', () => {
    const state = flatState();
    at(state.map, 2, 3).feature = 'forest';
    at(state.map, 2, 3).hills = true; // costs 3 to anybody else
    at(state.map, 3, 3).feature = 'jungle'; // and 2
    const scout = createUnit(state, 0, 'scout', 1, 3);
    expect(unitDef('scout').ignoresTerrainCost).toBe(true);
    expect(applyCommand(state, move(scout.id, 3, 3))).toEqual({ ok: true });
    // Two hexes that would have cost five, walked for both of its two points —
    // and it is standing on the far one rather than stranded on the wood.
    // 2026-08-28: scout's movement dropped 3→2 (data ruling), so the two
    // hexes now spend the whole allowance rather than leaving one behind.
    expect(scout.col).toBe(3);
    expect(scout.movesLeft).toBe(unitDef('scout').movement - 2);
    expect(scout.path).toBeUndefined();
  });

  /** The exemption is movement only: impassable ground still refuses it. */
  it('does not let a unit that ignores terrain walk onto a mountain', () => {
    const state = flatState();
    at(state.map, 2, 3).terrain = 'mountain';
    const scout = createUnit(state, 0, 'scout', 1, 3);
    expect(applyCommand(state, move(scout.id, 2, 3))).toEqual({
      ok: false,
      error: `Unit ${scout.id} cannot stop on (2, 3)`,
    });
    expect(scout.col).toBe(1);
  });

  it('enters a tile it cannot afford as long as it has any movement left', () => {
    const state = flatState();
    at(state.map, 2, 3).feature = 'forest'; // costs 2
    const warrior = createUnit(state, 0, 'warrior', 1, 3);
    warrior.movesLeft = 1;
    expect(applyCommand(state, move(warrior.id, 2, 3))).toEqual({ ok: true });
    expect(warrior.col).toBe(2);
    // Overspend is forgiven, never carried into debt.
    expect(warrior.movesLeft).toBe(0);
  });

  it('stores the unwalked remainder as a standing order', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 0, 3); // 2 MP
    expect(applyCommand(state, move(warrior.id, 5, 3))).toEqual({ ok: true });
    expect(warrior.col).toBe(2);
    expect(warrior.movesLeft).toBe(0);
    expect(warrior.path).toEqual([
      { col: 3, row: 3 },
      { col: 4, row: 3 },
      { col: 5, row: 3 },
    ]);
  });

  it('continues a standing order on the following turns', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 0, 3);
    applyCommand(state, move(warrior.id, 5, 3));

    endRound(state);
    expect(warrior.col).toBe(4);
    expect(warrior.movesLeft).toBe(0);
    expect(warrior.path).toEqual([{ col: 5, row: 3 }]);

    endRound(state);
    expect(warrior.col).toBe(5);
    expect(warrior.movesLeft).toBe(1);
    expect(warrior.path).toBeUndefined();

    // Idle from here on.
    endRound(state);
    expect(warrior.col).toBe(5);
    expect(warrior.movesLeft).toBe(2);
  });

  it('replaces a standing order when a new one is issued', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 0, 3);
    applyCommand(state, move(warrior.id, 6, 3));
    expect(warrior.path).toHaveLength(4);

    // A friendly soldier blocks the far end, so next turn the march stops early
    // and keeps a movement point — the one moment an order and spare movement
    // coexist, and therefore the only way to re-order a marching unit.
    createUnit(state, 0, 'warrior', 4, 3);
    endRound(state);
    expect(warrior.col).toBe(3);
    expect(warrior.movesLeft).toBe(1);
    expect(warrior.path).toHaveLength(3);

    applyCommand(state, move(warrior.id, 3, 4));
    expect(warrior.col).toBe(3);
    expect(warrior.row).toBe(4);
    expect(warrior.path).toBeUndefined();
  });

  it('does not alias the command’s target cells into the state', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 0, 3);
    const command = move(warrior.id, 5, 3);
    applyCommand(state, command);
    expect(warrior.path![0]).not.toBe(command);
    warrior.path![0]!.col = 99;
    expect(command).toEqual(move(warrior.id, 5, 3));
  });

  it('abandons an order whose route has been walled off', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 0, 3);
    applyCommand(state, move(warrior.id, 6, 3));
    expect(warrior.path).toHaveLength(4);

    // The world changes under the order: the next step becomes a mountain.
    at(state.map, 3, 3).terrain = 'mountain';
    endRound(state);
    expect(warrior.col).toBe(2);
    expect(warrior.path).toBeUndefined();
  });

  it('waits rather than resting on a tile its own category cannot share', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 0, 3);
    applyCommand(state, move(warrior.id, 6, 3));
    // A friendly soldier parks exactly where the march would come to rest.
    createUnit(state, 0, 'warrior', 4, 3);

    endRound(state);
    expect(warrior.col).toBe(3);
    // The order survives: this is traffic, not a wall.
    expect(warrior.path).toEqual([
      { col: 4, row: 3 },
      { col: 5, row: 3 },
      { col: 6, row: 3 },
    ]);
  });

  it('rejects illegal orders without touching the state', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 2, 2);
    const enemy = createUnit(state, 1, 'warrior', 6, 6);
    at(state.map, 4, 2).terrain = 'mountain';
    const spent = createUnit(state, 0, 'scout', 8, 2);
    spent.movesLeft = 0;
    const before = clone(state);

    const rejected: Command[] = [
      move(999, 3, 2), // no such unit
      move(enemy.id, 6, 5), // not the acting player's unit
      move(warrior.id, 3, 2, 9), // no such acting player
      // A spent unit is deliberately **not** in this list any more: an order
      // given with no movement left is now a standing order (see below).
      move(warrior.id, 2, 2), // already there
      move(warrior.id, 4, 2), // impassable target
      move(warrior.id, 6, 6), // occupied by an enemy soldier
      move(warrior.id, 2, 99), // off the map
      { type: 'moveUnit', playerId: 0, unitId: warrior.id, target: { col: 1.5, row: 2 } },
      { type: 'moveUnit', playerId: 0, unitId: warrior.id } as unknown as Command,
    ];
    for (const command of rejected) {
      expect(applyCommand(state, command).ok).toBe(false);
    }
    expect(state).toEqual(before);
  });

  it('rejects a target that is unreachable, leaving the unit put', () => {
    const state = flatState();
    // Fence off a pocket around (6, 3).
    for (const [col, row] of [
      [5, 3],
      [6, 2],
      [7, 2],
      [7, 3],
      [6, 4],
      [7, 4],
    ] as const) {
      at(state.map, col, row).terrain = 'mountain';
    }
    const warrior = createUnit(state, 0, 'warrior', 1, 3);
    const before = clone(state);
    expect(applyCommand(state, move(warrior.id, 6, 3)).ok).toBe(false);
    expect(state).toEqual(before);
  });

  it('resolves a wrapped target column to the tile it names', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 0, 3);
    // 16 wide, so column 17 is column 1.
    expect(applyCommand(state, move(warrior.id, 17, 3))).toEqual({ ok: true });
    expect(warrior.col).toBe(1);
  });
});

describe('moveUnit under simultaneous turns', () => {
  it('refuses an order from a seat that has ended its turn', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 2, 3);
    expect(applyCommand(state, { type: 'endTurn', playerId: 0 })).toEqual({ ok: true });

    const before = clone(state);
    const result = applyCommand(state, move(warrior.id, 3, 3));
    expect(result).toEqual({
      ok: false,
      error: 'Player 0 has ended turn 1 and cannot move',
    });
    expect(state).toEqual(before);
  });

  it('still lets an open seat move while another seat has ended', () => {
    const state = flatState();
    const mine = createUnit(state, 0, 'warrior', 2, 3);
    const theirs = createUnit(state, 1, 'warrior', 8, 3);
    // Player 0 is done; player 1 is still playing, in the same turn.
    expect(applyCommand(state, { type: 'endTurn', playerId: 0 })).toEqual({ ok: true });

    expect(applyCommand(state, move(theirs.id, 9, 3, 1))).toEqual({ ok: true });
    expect(theirs.col).toBe(9);
    expect(state.turn).toBe(1);
    // And player 0's unit stayed exactly where the seat left it.
    expect(mine.col).toBe(2);
  });

  it('gives a contended tile to whoever moved first in the log', () => {
    const state = flatState();
    // Two soldiers, different owners, one step either side of (3, 4).
    const first = createUnit(state, 0, 'warrior', 2, 4);
    const second = createUnit(state, 1, 'warrior', 4, 4);

    expect(applyCommand(state, move(first.id, 3, 4, 0))).toEqual({ ok: true });
    expect([first.col, first.row]).toEqual([3, 4]);

    // Same turn, same tile, one command later: the loser is refused cleanly and
    // keeps its position and its movement. Log order is the whole tie-break.
    const before = clone(state);
    const result = applyCommand(state, move(second.id, 3, 4, 1));
    expect(result).toEqual({ ok: false, error: `Unit ${second.id} cannot stop on (3, 4)` });
    expect(state).toEqual(before);
    expect(second.col).toBe(4);
    expect(second.movesLeft).toBe(unitDef('warrior').movement);
  });

  it('walks a standing order across a turn boundary whoever ends first', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 0, 3);
    applyCommand(state, move(warrior.id, 5, 3));
    expect(warrior.col).toBe(2);

    // The seats finish in a different order each turn; a stored order is
    // owner-agnostic and resolves with the turn, not with its owner's seat.
    endRound(state, [1, 0]);
    expect(warrior.col).toBe(4);
    endRound(state, [0, 1]);
    expect(warrior.col).toBe(5);
    expect(warrior.path).toBeUndefined();
  });
});

describe('healUnits', () => {
  const rate = RULES.healing.perTurnIfRested;

  it('heals a unit that never moved', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 3, 3);
    warrior.hp = 40;
    endRound(state);
    expect(warrior.hp).toBe(40 + rate);
  });

  it('does not heal a unit that moved this turn', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 3, 3);
    warrior.hp = 40;
    applyCommand(state, move(warrior.id, 4, 3));
    endRound(state);
    expect(warrior.hp).toBe(40);
  });

  it('resumes healing the turn after the unit stops', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 3, 3);
    warrior.hp = 40;
    applyCommand(state, move(warrior.id, 4, 3));
    endRound(state);
    endRound(state);
    expect(warrior.hp).toBe(40 + rate);
  });

  it('caps healing at the type’s maximum', () => {
    const state = flatState();
    const { maxHp } = unitDef('warrior');
    const warrior = createUnit(state, 0, 'warrior', 3, 3);
    warrior.hp = maxHp - 1;
    endRound(state);
    expect(warrior.hp).toBe(maxHp);
    endRound(state);
    expect(warrior.hp).toBe(maxHp);
  });
});

describe('resetMovement', () => {
  it('refills every unit’s allowance, whoever owns it', () => {
    const state = flatState();
    const mine = createUnit(state, 0, 'warrior', 1, 1);
    const theirs = createUnit(state, 1, 'scout', 5, 5);
    mine.movesLeft = 0;
    theirs.movesLeft = 1;
    endRound(state);
    expect(mine.movesLeft).toBe(unitDef('warrior').movement);
    expect(theirs.movesLeft).toBe(unitDef('scout').movement);
  });

  it('resolves contended standing orders in array order', () => {
    const state = flatState();
    // Two soldiers three tiles either side of the same destination.
    const first = createUnit(state, 0, 'warrior', 0, 4);
    const second = createUnit(state, 0, 'warrior', 6, 4);
    applyCommand(state, move(first.id, 3, 4));
    applyCommand(state, move(second.id, 3, 4));

    // Each order walks two of its three steps immediately.
    expect([first.col, second.col]).toEqual([2, 4]);

    endRound(state); // the earlier unit in the array takes the tile
    const winner: Unit = state.units[0]!;
    expect(winner.id).toBe(first.id);
    expect(first.col).toBe(3);
    expect(first.row).toBe(4);
    expect(second.col).toBe(4);
    expect(second.path).toEqual([{ col: 3, row: 4 }]);
  });
});

/**
 * Orders given with nothing left to spend, and the phase that spends what a
 * jammed column never got round to using (playtest batch two).
 */
describe('standing orders and leftover movement', () => {
  it('takes a march from a spent unit and records it as a standing order', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 2, 2);
    scout.movesLeft = 0;

    // 2026-08-28: scout's movement dropped 3→2 (data ruling) — the march is
    // sized off the unit's own row, not pinned as a literal, so it still
    // fills exactly one turn's allowance.
    const movement = unitDef('scout').movement;
    const destCol = 2 + movement;

    // Accepted, and nothing moves: `advanceAlongPath` takes no step it cannot
    // pay for, so an allowance of zero stores the whole route.
    expect(applyCommand(state, move(scout.id, destCol, 2))).toEqual({ ok: true });
    expect([scout.col, scout.row]).toEqual([2, 2]);
    expect(scout.movesLeft).toBe(0);
    expect(scout.path).toEqual(
      Array.from({ length: movement }, (_, i) => ({ col: 3 + i, row: 2 })),
    );

    // And the stored order is what sets off next turn.
    endRound(state);
    expect(scout.col).toBe(destCol);
    expect(scout.path).toBeUndefined();
  });

  it('overwrites the orders a spent unit already had', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 2, 2);
    applyCommand(state, move(scout.id, 8, 2));
    scout.movesLeft = 0;
    const wasAt = { col: scout.col, row: scout.row };

    expect(applyCommand(state, move(scout.id, 2, 5))).toEqual({ ok: true });
    expect([scout.col, scout.row]).toEqual([wasAt.col, wasAt.row]);
    // Half of an abandoned route is not a plan: the new order replaces the old
    // one whole, exactly as it does for a unit that still has movement.
    expect(scout.path![scout.path!.length - 1]).toEqual({ col: 2, row: 5 });
    expect(scout.path!.some((cell) => cell.col === 8)).toBe(false);
  });

  it('still refuses an order a spent unit could never walk', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 2, 2);
    scout.movesLeft = 0;
    createUnit(state, 1, 'warrior', 5, 2);
    const before = clone(state);
    for (const bad of [
      move(scout.id, 2, 2), // already there
      move(scout.id, 5, 2), // an enemy is standing on it
      move(scout.id, 2, 99), // off the map
    ]) {
      expect(applyCommand(state, bad).ok, JSON.stringify(bad)).toBe(false);
    }
    expect(state).toEqual(before);
  });

  it('marches a jam that cleared with the movement the turn left it', () => {
    const state = flatState();
    const column = createUnit(state, 0, 'warrior', 0, 3);
    const blocker = createUnit(state, 0, 'warrior', 2, 3);

    // The column sets off, gets one hex, and stops rather than resting on top of
    // its own picket: traffic, not a wall, so the order is kept.
    applyCommand(state, move(column.id, 6, 3));
    expect([column.col, column.movesLeft]).toEqual([1, 1]);
    expect(column.path![0]).toEqual({ col: 2, row: 3 });

    // The picket is ordered out of the way inside the same turn.
    applyCommand(state, move(blocker.id, 2, 0));
    expect(unitsOnTile(state, 2, 3)).toHaveLength(0);

    endRound(state);
    // Four hexes, not three: `spendLeftoverMovement` walks the one point the
    // jam left unspent *before* the allowance is refilled, and `resetMovement`
    // then walks the two the new turn granted.
    expect(column.col).toBe(4);
    expect(column.path).toEqual([
      { col: 5, row: 3 },
      { col: 6, row: 3 },
    ]);
  });

  it('is deterministic: the same orders resolve byte-identically, in array order', () => {
    const run = (): GameState => {
      const state = flatState();
      // Three columns behind one picket, so the leftover phase has more than one
      // unit to walk and two of them want the same hex.
      const first = createUnit(state, 0, 'warrior', 0, 3);
      const second = createUnit(state, 0, 'warrior', 0, 4);
      const picket = createUnit(state, 0, 'warrior', 2, 3);
      applyCommand(state, move(first.id, 6, 3));
      applyCommand(state, move(second.id, 6, 3));
      applyCommand(state, move(picket.id, 2, 0));
      endRound(state);
      endRound(state);
      return state;
    };
    // A sweep over `state.units` is part of the state; a sweep over a Map or a
    // Set would not be, and this is where that would show.
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });

  it('never marches a unit that has nothing left, and never twice on one point', () => {
    const state = flatState();
    const scout = createUnit(state, 0, 'scout', 2, 2);
    applyCommand(state, move(scout.id, 8, 2));
    // The order spent every point it had, so the leftover phase has nothing to
    // give it: one turn is one allowance, and the phase is not a second one.
    expect(scout.movesLeft).toBe(0);
    const reached = scout.col;
    endRound(state);
    expect(scout.col - reached).toBe(unitDef('scout').movement);
  });
});

describe('cancelOrder', () => {
  /** A cancel order. Most units in these tests belong to player 0. */
  function cancel(unitId: number, playerId = 0): Command {
    return { type: 'cancelOrder', playerId, unitId };
  }

  /** A warrior at (0, 3) already marching east, with three waypoints left. */
  function marching(state: GameState): Unit {
    const warrior = createUnit(state, 0, 'warrior', 0, 3);
    expect(applyCommand(state, move(warrior.id, 5, 3))).toEqual({ ok: true });
    expect(warrior.path).toHaveLength(3);
    return warrior;
  }

  it('drops the standing order and leaves everything else alone', () => {
    const state = flatState();
    const warrior = marching(state);
    const before = { ...warrior };

    expect(applyCommand(state, cancel(warrior.id))).toEqual({ ok: true });
    expect(warrior.col).toBe(before.col);
    expect(warrior.row).toBe(before.row);
    expect(warrior.movesLeft).toBe(before.movesLeft);
    expect(warrior.hp).toBe(before.hp);
  });

  it('deletes the key rather than emptying it, so an idle unit serialises alike', () => {
    const state = flatState();
    const warrior = marching(state);
    applyCommand(state, cancel(warrior.id));

    // `movement.ts`'s convention: a unit that never had an order and a unit
    // whose order was cancelled must be indistinguishable.
    expect(warrior.path).toBeUndefined();
    expect('path' in warrior).toBe(false);
    const idle = createUnit(state, 0, 'warrior', 9, 3);
    expect(Object.keys(warrior).sort()).toEqual(Object.keys(idle).sort());
  });

  it('stops the march: the unit stays put through the next turns', () => {
    const state = flatState();
    const warrior = marching(state);
    applyCommand(state, cancel(warrior.id));

    endRound(state);
    expect([warrior.col, warrior.row]).toEqual([2, 3]);
    endRound(state);
    expect([warrior.col, warrior.row]).toEqual([2, 3]);
    // Movement is refilled as usual — cancelling an order is not a penalty.
    expect(warrior.movesLeft).toBe(unitDef('warrior').movement);
  });

  it('rejects every illegal cancellation without touching the state', () => {
    const state = flatState();
    const warrior = marching(state);
    const idle = createUnit(state, 0, 'warrior', 9, 3);
    const enemy = createUnit(state, 1, 'warrior', 12, 3);
    expect(applyCommand(state, move(enemy.id, 12, 6, 1))).toEqual({ ok: true });
    expect(enemy.path).toBeDefined();
    const before = clone(state);

    const rejected: Command[] = [
      cancel(999), // no such unit
      cancel(enemy.id), // not the acting player's unit
      cancel(warrior.id, 9), // no such acting player
      cancel(idle.id), // nothing to cancel
      { type: 'cancelOrder', playerId: 0 } as unknown as Command, // no unit id
      { type: 'cancelOrder', playerId: '0', unitId: warrior.id } as unknown as Command,
    ];
    for (const command of rejected) {
      expect(applyCommand(state, command).ok).toBe(false);
    }
    expect(state).toEqual(before);
  });

  it('refuses a cancellation from a seat that has ended its turn', () => {
    const state = flatState();
    const warrior = marching(state);
    expect(applyCommand(state, { type: 'endTurn', playerId: 0 })).toEqual({ ok: true });

    // Turn-gated exactly like `moveUnit`, and deliberately: the order is about
    // to be walked by a resolution this seat has already handed over to.
    const before = clone(state);
    expect(applyCommand(state, cancel(warrior.id))).toEqual({
      ok: false,
      error: 'Player 0 has ended turn 1 and cannot cancel orders',
    });
    expect(state).toEqual(before);
  });

  it('lets an open seat cancel while another seat has ended', () => {
    const state = flatState();
    const theirs = createUnit(state, 1, 'warrior', 8, 3);
    expect(applyCommand(state, move(theirs.id, 13, 3, 1))).toEqual({ ok: true });
    expect(applyCommand(state, { type: 'endTurn', playerId: 0 })).toEqual({ ok: true });

    expect(applyCommand(state, cancel(theirs.id, 1))).toEqual({ ok: true });
    expect(theirs.path).toBeUndefined();
  });

  it('cannot be cancelled twice: the second is a refusal, not a no-op', () => {
    const state = flatState();
    const warrior = marching(state);
    expect(applyCommand(state, cancel(warrior.id))).toEqual({ ok: true });
    const before = clone(state);
    expect(applyCommand(state, cancel(warrior.id))).toEqual({
      ok: false,
      error: `Unit ${warrior.id} has no standing order`,
    });
    expect(state).toEqual(before);
  });
});
