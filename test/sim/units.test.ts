import { describe, expect, it } from 'vitest';
import { type Command, applyCommand } from '../../src/sim/commands';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import { type GameState, type Unit, createUnit, newGame } from '../../src/sim/state';
import {
  UNIT_TYPE_IDS,
  isCivilian,
  unitDef,
  unitMaxHp,
  unitStampStrength,
} from '../../src/sim/unitData';
import {
  hasStackingRoom,
  stacksFreely,
  unitAwaitsOrders,
  unitOfferedForOrders,
  unitsOnTile,
} from '../../src/sim/units';
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
  it('gives every unit exactly one of four slots, and only the trader an uncapped one', () => {
    const categories = new Set(UNIT_TYPE_IDS.map((id) => unitDef(id).category));
    // The fourth is the naval line's (2026-08-29): a hull takes a slot of its
    // own, which is the whole of "one warship per hex" with no clause anywhere.
    expect([...categories].sort()).toEqual(['civilian', 'military', 'naval', 'trader']);
    expect(unitDef('trader').category).toBe('trader');
    expect(unitDef('trireme').category).toBe('naval');
    expect(stacksFreely('trader')).toBe(true);
    expect(stacksFreely('civilian')).toBe(false);
    expect(stacksFreely('military')).toBe(false);
    // A ship is capped like a soldier. Its *escort* is the extra clause, and it
    // is asked of the ground rather than of the category — see `naval.test.ts`.
    expect(stacksFreely('naval')).toBe(false);
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

  /**
   * The two-turn march, re-aimed on **2026-09-08** (batch U1, `docs/flags.md`
   * (bbb)). It used to expect the column at col 4 after one resolution and at
   * col 5 holding one point after the second: `resetMovement` refilled the
   * allowance and then spent it walking the stored order, so every turn opened
   * on a piece that had already marched. Now the march is walked by
   * `spendLeftoverMovement`, before the refill, on the points the turn actually
   * had — so the order that was given with nothing left walks nothing on the
   * turn it was given, and every turn after opens with a **full** allowance and
   * the rest of the route still stored.
   */
  it('continues a standing order at the end of each following turn', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 0, 3);
    const full = unitDef('warrior').movement;
    applyCommand(state, move(warrior.id, 5, 3));
    expect(warrior.col).toBe(2);

    // Turn one's points went into the two hexes the command itself walked, so
    // the resolution has nothing to spend — and refills.
    endRound(state);
    expect(warrior.col).toBe(2);
    expect(warrior.movesLeft).toBe(full);
    expect(warrior.path).toEqual([
      { col: 3, row: 3 },
      { col: 4, row: 3 },
      { col: 5, row: 3 },
    ]);

    // Turn two: the player spent none of it, so the whole allowance goes into
    // the march — and the piece stands at the far end of it, refilled.
    endRound(state);
    expect(warrior.col).toBe(4);
    expect(warrior.movesLeft).toBe(full);
    expect(warrior.path).toEqual([{ col: 5, row: 3 }]);

    endRound(state);
    expect(warrior.col).toBe(5);
    expect(warrior.movesLeft).toBe(full);
    expect(warrior.path).toBeUndefined();

    // Idle from here on.
    endRound(state);
    expect(warrior.col).toBe(5);
    expect(warrior.movesLeft).toBe(full);
  });

  /**
   * The other half of the same ruling, said as the player sees it: a piece
   * ordered with **nothing left to spend** stands still on the turn it was
   * ordered and walks at the end of the next one. Before 2026-09-08 the order
   * was walked on the very next turn's fresh allowance, which is the same
   * arrival one turn earlier and a turn the player never got to spend.
   */
  it('stands still the turn it is ordered at zero movement, and walks at the next turn’s end', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 0, 3);
    const full = unitDef('warrior').movement;
    warrior.movesLeft = 0;
    expect(applyCommand(state, move(warrior.id, 3, 3))).toEqual({ ok: true });
    expect(warrior.col).toBe(0);

    // Nothing this turn: there were no points to walk it with.
    endRound(state);
    expect(warrior.col).toBe(0);
    expect(warrior.movesLeft).toBe(full);

    // And the next resolution spends the allowance that turn granted.
    endRound(state);
    expect(warrior.col).toBe(full);
    expect(warrior.movesLeft).toBe(full);
  });

  it('replaces a standing order when a new one is issued', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 0, 3);
    applyCommand(state, move(warrior.id, 6, 3));
    expect(warrior.path).toHaveLength(4);

    // 2026-09-08 (batch U1): "an order and spare movement at once" used to be
    // the one moment a cleared jam produced, and this test needed a friendly
    // soldier parked on the route to manufacture it. It is now the ordinary
    // case — a marching piece opens every turn with a full allowance and the
    // rest of its route — which is the whole point of the ruling: the order is
    // the player's to change, on a turn they can still spend.
    endRound(state);
    expect(warrior.col).toBe(2);
    expect(warrior.movesLeft).toBe(unitDef('warrior').movement);
    expect(warrior.path).toHaveLength(4);

    applyCommand(state, move(warrior.id, 2, 4));
    expect(warrior.col).toBe(2);
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
    // Two resolutions now, not one (2026-09-08, batch U1): the order was given
    // with the turn's points already spent, so the first resolution has nothing
    // to walk it with and the wall is not met until the second.
    endRound(state);
    expect(warrior.col).toBe(2);
    expect(warrior.path).toHaveLength(4);

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

    // The first resolution has nothing to spend (batch U1); the second walks
    // the turn's allowance into the traffic.
    endRound(state);
    expect(warrior.col).toBe(2);

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
    // Three resolutions rather than two since batch U1 — the first has this
    // turn's points, and the command already spent them.
    endRound(state, [1, 0]);
    expect(warrior.col).toBe(2);
    endRound(state, [0, 1]);
    expect(warrior.col).toBe(4);
    endRound(state, [1, 0]);
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

  /**
   * The ruling of 2026-09-08 (batch U1, `docs/flags.md` (bbb)) as one
   * assertion: the refill walks nobody. A stored order left on a piece that had
   * *nothing* this turn is walked by nothing this resolution — the old second
   * pass would have spent the allowance it had just handed out and put the
   * piece two hexes on, holding none of it.
   */
  it('refills and resumes nothing — the piece keeps its order and its points', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 0, 3);
    warrior.movesLeft = 0;
    warrior.path = [
      { col: 1, row: 3 },
      { col: 2, row: 3 },
    ];

    endRound(state);
    expect([warrior.col, warrior.row]).toEqual([0, 3]);
    expect(warrior.movesLeft).toBe(unitDef('warrior').movement);
    expect(warrior.path).toEqual([
      { col: 1, row: 3 },
      { col: 2, row: 3 },
    ]);
  });

  /** The broom that is all the second pass left behind. */
  it('sweeps away an empty route rather than walking it', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 4, 4);
    // Only reachable from a hand-edited save; an idle unit carries no `path`.
    warrior.path = [];
    endRound(state);
    expect(Object.prototype.hasOwnProperty.call(warrior, 'path')).toBe(false);
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

    // The first resolution has nothing left to spend on either of them (batch
    // U1, 2026-09-08); the second is where they contend. The tie-break is
    // unchanged, and it is what this test is about.
    endRound(state);
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

    // And the stored order is what sets off — at the end of the *next* turn,
    // on that turn's own points (batch U1, 2026-09-08). This resolution has
    // nothing to walk it with, which is the ruling said plainly.
    endRound(state);
    expect([scout.col, scout.row]).toEqual([2, 2]);

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
    // Two hexes, not four (re-aimed 2026-09-08, batch U1): `spendLeftoverMovement`
    // still walks the one point the jam left unspent, and it is still the whole
    // reason this phase exists — but the refill no longer marches the column a
    // second time on the *next* turn's allowance, so the piece stands one hex
    // on with a full purse and the rest of its route.
    expect(column.col).toBe(2);
    expect(column.movesLeft).toBe(unitDef('warrior').movement);
    expect(column.path).toEqual([
      { col: 3, row: 3 },
      { col: 4, row: 3 },
      { col: 5, row: 3 },
      { col: 6, row: 3 },
    ]);
  });

  /**
   * `spendLeftoverMovement`'s position, unchanged by batch U1 and now exercised
   * by every standing order rather than only by a cleared jam: the healing is
   * decided **before** the march. A column that stood still all turn under
   * orders has rested, so it heals — and then walks. Put the march first and
   * the same piece would never heal again as long as it was marching.
   */
  it('heals a marching column before it walks, never after', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 0, 3);
    warrior.hp = 40;
    warrior.path = [
      { col: 1, row: 3 },
      { col: 2, row: 3 },
    ];

    endRound(state);
    // It marched inside the resolution, and it healed on the way out.
    expect(warrior.col).toBe(2);
    expect(warrior.hp).toBe(40 + RULES.healing.perTurnIfRested);
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
    // Re-aimed 2026-09-08 (batch U1): the resolution used to add a whole fresh
    // allowance on top of the one the command had just spent, which is exactly
    // the double march the ruling removed. The piece stands where it stopped.
    expect(scout.col - reached).toBe(0);
    expect(scout.movesLeft).toBe(unitDef('scout').movement);

    // The next turn's allowance is what walks it, once.
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

// --- what a piece's maximum health is ---------------------------------------

/**
 * `unitMaxHp` is **the** maximum health of one piece, and the split between it
 * and `unitDef(...).maxHp` is the whole point: the roster's figure is what the
 * Compendium prints about a *type*, and this is what a *unit* actually has,
 * stamp and all (`Unit.stamp`, the Orders pass of 2026-08-29).
 *
 * A pure reading over the unit table, so it is tested here rather than through a
 * card: every heal cap, both forecast bars, the upgrade's fraction and the hp
 * bar the renderer draws go through it, and a second opinion about a legion's
 * health is exactly what having one helper prevents.
 */
describe('a piece’s maximum health', () => {
  it('is the roster’s figure when nothing was stamped', () => {
    for (const type of UNIT_TYPE_IDS) {
      expect(unitMaxHp({ type }), type).toBe(unitDef(type).maxHp);
    }
  });

  it('adds the stamp, and floors at a single point', () => {
    expect(unitMaxHp({ type: 'warrior', stamp: { hp: 10 } })).toBe(
      unitDef('warrior').maxHp + 10,
    );
    // A strength stamp is a different reading and leaves the bar alone.
    expect(unitMaxHp({ type: 'warrior', stamp: { strength: 3 } })).toBe(
      unitDef('warrior').maxHp,
    );
    expect(unitStampStrength({ type: 'warrior', stamp: { strength: 3 } })).toBe(3);
    expect(unitStampStrength({ type: 'warrior' })).toBe(0);
    // Signed, and floored: a card that took a piece's last point of health would
    // be a card that deletes an army on the turn it is slotted.
    expect(unitMaxHp({ type: 'warrior', stamp: { hp: -9999 } })).toBe(1);
  });

  it('is absent on every piece a stampless empire creates', () => {
    const state = flatState();
    const unit = createUnit(state, 0, 'warrior', 3, 3);
    // Presence is the state: a game with no such card in it serialises exactly
    // as it did before the field existed.
    expect('stamp' in unit).toBe(false);
    expect(JSON.stringify(unit).includes('stamp')).toBe(false);
    expect(unit.hp).toBe(unitMaxHp(unit));
  });
});

/**
 * **A cart is never asked for orders** — R4 (the user, 2026-09-09: *"never ask
 * for orders on a trader unit"*), the sixth clause of `unitAwaitsOrders`.
 *
 * The fifth clause silenced a caravan while it was *carrying* a route and left
 * the lapsed one talking: the wagon comes home, the route key is gone, and the
 * first four clauses called it idle every turn for the rest of the game — a
 * piece with nothing on its own sheet that would answer the prompt, since every
 * route verb lives on the Trade sheet. The sixth is the whole class.
 *
 * It is asked of **`UnitDef.routeOnly`**, the row's own marker, and nothing here
 * compares a type against a name; the wide predicate inherits it by
 * construction, being the narrow one with the march set aside.
 */
describe('a caravan and the two order predicates', () => {
  it('is neither awaiting orders nor offered, idle or routed', () => {
    const state = flatState();
    const cart = createUnit(state, 0, 'trader', 3, 3);
    expect(unitDef(cart.type).routeOnly).toBe(true);
    // Idle: full movement, no path, no route on it — the four clauses that used
    // to call it idle all say yes, and the marker says no.
    expect(cart.movesLeft).toBeGreaterThan(0);
    expect(cart.path).toBeUndefined();
    expect(cart.trade).toBeUndefined();
    expect(unitAwaitsOrders(cart)).toBe(false);
    expect(unitOfferedForOrders(cart)).toBe(false);

    // Routed, which the fifth clause already covered: still false, by two
    // clauses now rather than one.
    cart.trade = { from: 1, to: 2, expiresTurn: 20, outbound: true, autoResend: false };
    expect(unitAwaitsOrders(cart)).toBe(false);
    expect(unitOfferedForOrders(cart)).toBe(false);
  });

  it('leaves every other civilian exactly where it was', () => {
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 4, 4);
    expect(unitDef(worker.type).routeOnly).toBeUndefined();
    expect(unitAwaitsOrders(worker)).toBe(true);
    expect(unitOfferedForOrders(worker)).toBe(true);
  });
});
