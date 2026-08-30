/**
 * Sleep: the civilian's fortify, and the one order the simulation itself ends.
 *
 * Four properties, and they are the whole feature:
 *
 *   1. **The command validates like every other order** — a real seat, its own
 *      unit, a civilian, not already asleep, and the turn not yet ended — and a
 *      refusal leaves the state byte-identical (hard rule 1).
 *   2. **A sleeper stops blocking End Turn.** That is the only thing the flag
 *      buys and the whole reason a player would ever press the button, so it is
 *      pinned against `firstBlocker` rather than against `unitAwaitsOrders`
 *      alone.
 *   3. **`wakeSleepers` wakes it when an enemy comes inside its *own* sight** —
 *      any owner but its own, the wild included, combatants only, and line of
 *      sight respected, because it is the same rule the fog and the archers ask.
 *   4. **An order is a waking.** Every command that names a sleeping unit
 *      clears the flag, and that is asserted centrally (`orderedUnitId`) rather
 *      than one verb at a time, because the central version is the claim.
 *
 * Plus the two things every state change in this project owes: a log replays to
 * a byte-identical state, and a save round-trips.
 */

import { describe, expect, it } from 'vitest';

import { type Command, applyCommand } from '../../src/sim/commands';
import { type Game, createGame, dispatch, loadGame, saveGame, replay } from '../../src/sim/game';
import { createMap } from '../../src/sim/map';
import {
  type GameState,
  type Unit,
  SCHEMA_VERSION,
  createUnit,
  newGame,
} from '../../src/sim/state';
import { runEndOfTurn } from '../../src/sim/turn';
import { sleepError, sleepingSnapshot, unitAwaitsOrders, wakesSince } from '../../src/sim/units';
import { resetVisibility } from '../../src/sim/visibility';
import { firstBlocker } from '../../src/ui/turnBlockers';

/**
 * A blank three-seat state on flat grassland: two empires and the wild, so a
 * hostile can be either kind without a second fixture.
 */
function flatState(): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
    barbarians: true,
  });
  state.map = createMap({ width: 24, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  return state;
}

function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function sleep(unitId: number, playerId = 0): Command {
  return { type: 'sleepUnit', playerId, unitId };
}

/** The wild's seat id — appended last, which is `seatBarbarians`' promise. */
function wildId(state: GameState): number {
  const wild = state.players.find((player) => player.barbarian === true);
  expect(wild).toBeDefined();
  return wild!.id;
}

describe('the sleepUnit command', () => {
  it('puts a civilian to sleep and marks it by the presence of the key', () => {
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 5, 5);
    expect(worker.sleeping).toBeUndefined();
    expect(applyCommand(state, sleep(worker.id))).toEqual({ ok: true });
    expect(worker.sleeping).toBe(true);
  });

  it('refuses a soldier, and names the better verb', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 5, 5);
    const before = clone(state);
    const result = applyCommand(state, sleep(warrior.id));
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.error).toContain('fortify');
    // Rejected command = state byte-identical.
    expect(state).toEqual(before);
  });

  it('refuses a unit that is already asleep', () => {
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 5, 5);
    applyCommand(state, sleep(worker.id));
    const before = clone(state);
    expect(applyCommand(state, sleep(worker.id)).ok).toBe(false);
    expect(state).toEqual(before);
  });

  it('refuses somebody else’s unit', () => {
    const state = flatState();
    const worker = createUnit(state, 1, 'worker', 5, 5);
    const before = clone(state);
    expect(applyCommand(state, sleep(worker.id, 0)).ok).toBe(false);
    expect(state).toEqual(before);
  });

  it('refuses a unit that does not exist, and a seat that does not', () => {
    const state = flatState();
    const before = clone(state);
    expect(applyCommand(state, sleep(999)).ok).toBe(false);
    expect(applyCommand(state, sleep(999, 99)).ok).toBe(false);
    expect(state).toEqual(before);
  });

  it('refuses a seat that has already ended its turn', () => {
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 5, 5);
    expect(applyCommand(state, { type: 'endTurn', playerId: 0 })).toEqual({ ok: true });
    const before = clone(state);
    expect(applyCommand(state, sleep(worker.id)).ok).toBe(false);
    expect(state).toEqual(before);
  });

  it('does not require movement — a worker that spent its turn may still sleep', () => {
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 5, 5);
    worker.movesLeft = 0;
    expect(applyCommand(state, sleep(worker.id))).toEqual({ ok: true });
    expect(worker.sleeping).toBe(true);
  });

  it('is enabled by exactly the rule the reducer applies', () => {
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 5, 5);
    const warrior = createUnit(state, 0, 'warrior', 6, 5);
    expect(sleepError(worker)).toBeNull();
    expect(sleepError(warrior)).not.toBeNull();
    applyCommand(state, sleep(worker.id));
    expect(sleepError(worker)).not.toBeNull();
  });
});

describe('a sleeping unit and the End Turn blocker', () => {
  it('stops being idle, and stops blocking', () => {
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 5, 5);
    expect(unitAwaitsOrders(worker)).toBe(true);
    expect(firstBlocker(state, 0)).toEqual({ kind: 'idleUnit', unitId: worker.id });

    applyCommand(state, sleep(worker.id));
    expect(unitAwaitsOrders(worker)).toBe(false);
    // Nothing else of this seat's is outstanding: no cities, and the opening
    // research choice is the only thing left, which is a different blocker.
    expect(firstBlocker(state, 0)?.kind).not.toBe('idleUnit');
  });

  it('does not silence the unit standing next to it', () => {
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 5, 5);
    const settler = createUnit(state, 0, 'settler', 6, 5);
    applyCommand(state, sleep(worker.id));
    expect(firstBlocker(state, 0)).toEqual({ kind: 'idleUnit', unitId: settler.id });
  });

  it('is a fact about the piece, unlike a skip', () => {
    // The pair the `turnBlockers` docblock argues about: a skip is an argument
    // to `firstBlocker` and vanishes with the client, sleep is on the unit and
    // survives a save. Both silence; only one is in the state.
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 5, 5);
    applyCommand(state, sleep(worker.id));
    const reloaded = clone(state);
    expect(reloaded.units[0]!.sleeping).toBe(true);
    expect(unitAwaitsOrders(reloaded.units[0]!)).toBe(false);
  });
});

describe('wakeSleepers', () => {
  /** Runs the resolution the way the reducer does, phases and all. */
  function resolve(state: GameState): void {
    runEndOfTurn(state);
  }

  function sleeper(state: GameState, col = 5, row = 5): Unit {
    const worker = createUnit(state, 0, 'worker', col, row);
    expect(applyCommand(state, sleep(worker.id))).toEqual({ ok: true });
    return worker;
  }

  it('wakes a sleeper with a rival warrior inside its own sight', () => {
    const state = flatState();
    const worker = sleeper(state);
    // A worker sees 2 (`data/units.json`); two hexes east is inside it.
    createUnit(state, 1, 'warrior', 7, 5);
    resolve(state);
    expect(worker.sleeping).toBeUndefined();
  });

  it('wakes a sleeper for a barbarian exactly as for a rival empire', () => {
    const state = flatState();
    const worker = sleeper(state);
    createUnit(state, wildId(state), 'warrior', 7, 5);
    resolve(state);
    expect(worker.sleeping).toBeUndefined();
  });

  it('leaves a sleeper asleep when the enemy is outside its sight', () => {
    const state = flatState();
    const worker = sleeper(state);
    // Six hexes east, well past a worker's two.
    createUnit(state, 1, 'warrior', 11, 5);
    resolve(state);
    expect(worker.sleeping).toBe(true);
  });

  it('leaves a sleeper asleep for a foreign civilian — combatants only', () => {
    const state = flatState();
    const worker = sleeper(state);
    createUnit(state, 1, 'worker', 6, 5);
    resolve(state);
    expect(worker.sleeping).toBe(true);
  });

  it('leaves a sleeper asleep for its owner’s own army standing on top of it', () => {
    const state = flatState();
    const worker = sleeper(state);
    createUnit(state, 0, 'warrior', 5, 5);
    resolve(state);
    expect(worker.sleeping).toBe(true);
  });

  it('respects line of sight — a mountain hides an approaching column', () => {
    const state = flatState();
    const worker = sleeper(state);
    // A wall of mountains directly between the worker and the warrior. The
    // straight hex line from (5,5) to (7,5) passes through (6,5).
    const ridge = state.map.tiles[state.map.width * 5 + 6]!;
    ridge.terrain = 'mountain';
    createUnit(state, 1, 'warrior', 7, 5);
    resolve(state);
    expect(worker.sleeping).toBe(true);
  });

  it('wakes every sleeper an approach reaches, not only the first', () => {
    const state = flatState();
    const a = sleeper(state, 5, 5);
    const b = sleeper(state, 6, 6);
    createUnit(state, 1, 'warrior', 6, 5);
    resolve(state);
    expect(a.sleeping).toBeUndefined();
    expect(b.sleeping).toBeUndefined();
  });

  it('reads the board *after* standing orders resolve, which is why it is last', () => {
    // The property the phase's position exists for: a rival column three hexes
    // off with a standing order finishes its march inside this very resolution,
    // and the sleeper must be woken by where it *ends up*.
    const state = flatState();
    const worker = sleeper(state);
    const raider = createUnit(state, 1, 'warrior', 9, 5);
    expect(applyCommand(state, {
      type: 'moveUnit',
      playerId: 1,
      unitId: raider.id,
      target: { col: 6, row: 5 },
    })).toEqual({ ok: true });
    // It could not walk the whole way this turn, so it is still out of sight
    // and holding the rest as a standing order.
    expect(raider.path).toBeDefined();
    expect(worker.sleeping).toBe(true);
    resolve(state);
    expect(raider.col).toBe(6);
    expect(worker.sleeping).toBeUndefined();
  });
});

describe('an order is a waking', () => {
  it('wakes on a move order', () => {
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 5, 5);
    applyCommand(state, sleep(worker.id));
    expect(applyCommand(state, {
      type: 'moveUnit',
      playerId: 0,
      unitId: worker.id,
      target: { col: 6, row: 5 },
    })).toEqual({ ok: true });
    expect(worker.sleeping).toBeUndefined();
  });

  it('wakes on cancelOrder, which is the "never mind" verb sleep borrows', () => {
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 5, 5);
    applyCommand(state, sleep(worker.id));
    // No standing path at all: cancelling the *sleep* is the whole subject.
    expect(applyCommand(state, { type: 'cancelOrder', playerId: 0, unitId: worker.id }))
      .toEqual({ ok: true });
    expect(worker.sleeping).toBeUndefined();
  });

  it('still refuses cancelOrder on a unit with neither an order nor a sleep', () => {
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 5, 5);
    const before = clone(state);
    expect(applyCommand(state, { type: 'cancelOrder', playerId: 0, unitId: worker.id }).ok)
      .toBe(false);
    expect(state).toEqual(before);
  });

  it('wakes on founding a city — and does not trip over the spent settler', () => {
    const state = flatState();
    const settler = createUnit(state, 0, 'settler', 5, 5);
    applyCommand(state, sleep(settler.id));
    expect(applyCommand(state, {
      type: 'foundCity',
      playerId: 0,
      settlerUnitId: settler.id,
    })).toEqual({ ok: true });
    expect(state.units.find((unit) => unit.id === settler.id)).toBeUndefined();
  });

  it('does not wake on a refused order — a refusal is not an order', () => {
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 5, 5);
    applyCommand(state, sleep(worker.id));
    // Off the map: refused, and the state must be byte-identical afterwards.
    const before = clone(state);
    expect(applyCommand(state, {
      type: 'moveUnit',
      playerId: 0,
      unitId: worker.id,
      target: { col: 5, row: -4 },
    }).ok).toBe(false);
    expect(state).toEqual(before);
    expect(worker.sleeping).toBe(true);
  });

  it('does not wake on somebody else’s command', () => {
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 5, 5);
    const other = createUnit(state, 0, 'worker', 8, 8);
    applyCommand(state, sleep(worker.id));
    expect(applyCommand(state, {
      type: 'moveUnit',
      playerId: 0,
      unitId: other.id,
      target: { col: 9, row: 8 },
    })).toEqual({ ok: true });
    expect(worker.sleeping).toBe(true);
  });

  it('wakes a captured civilian, because the sleep was its old owner’s decision', () => {
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 5, 5);
    applyCommand(state, sleep(worker.id));
    const raider = createUnit(state, 1, 'warrior', 6, 5);
    // The blow *is* the step onto the worker's hex (user, 2026-08-28), so the
    // hand-over is reported by the arrival — `ok` with an `arrivals` list rather
    // than a bare `ok`. What is under test here is unchanged: the sleep was the
    // old owner's decision and `captureUnit` ends it.
    expect(applyCommand(state, {
      type: 'attack',
      playerId: 1,
      unitId: raider.id,
      target: { col: 5, row: 5 },
    }).ok).toBe(true);
    expect(worker.ownerId).toBe(1);
    expect(worker.sleeping).toBeUndefined();
  });
});

describe('the wake difference the interface announces', () => {
  it('names the units that were asleep and are not, in state order', () => {
    const state = flatState();
    const a = createUnit(state, 0, 'worker', 5, 5);
    const b = createUnit(state, 0, 'worker', 15, 5);
    applyCommand(state, sleep(a.id));
    applyCommand(state, sleep(b.id));
    const before = sleepingSnapshot(state, 0);
    expect(before).toEqual([a.id, b.id]);

    createUnit(state, 1, 'warrior', 7, 5);
    runEndOfTurn(state);

    expect(wakesSince(state, 0, before).map((unit) => unit.id)).toEqual([a.id]);
  });

  it('says nothing about a unit that changed hands or left the board', () => {
    const state = flatState();
    const worker = createUnit(state, 0, 'worker', 5, 5);
    applyCommand(state, sleep(worker.id));
    const before = sleepingSnapshot(state, 0);
    const raider = createUnit(state, 1, 'warrior', 6, 5);
    applyCommand(state, {
      type: 'attack',
      playerId: 1,
      unitId: raider.id,
      target: { col: 5, row: 5 },
    });
    // Awake, yes — but not this player's any more, so it is not their news.
    expect(worker.ownerId).toBe(1);
    expect(wakesSince(state, 0, before)).toEqual([]);
  });
});

describe('sleep in the log', () => {
  /** A real game with a sleeping worker in its log. */
  function sleepingGame(): Game {
    const game = createGame({
      seed: 4,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
      barbarians: true,
    });
    // The opening settler, which `newGame` seats deterministically — nothing is
    // put on the board outside the log, or a replay from `{config, log}` would
    // have nothing to sleep.
    const settler = game.state.units.find(
      (unit) => unit.ownerId === 0 && unit.type === 'settler',
    );
    expect(settler).toBeDefined();
    // Through `dispatch`, so the command lands in the log a replay walks.
    expect(dispatch(game, { type: 'sleepUnit', playerId: 0, unitId: settler!.id }).ok).toBe(true);
    for (let turn = 0; turn < 4; turn++) {
      for (const player of game.state.players) {
        dispatch(game, { type: 'endTurn', playerId: player.id });
      }
    }
    return game;
  }

  it('replays to a byte-identical state', () => {
    const game = sleepingGame();
    expect(game.log.some((command) => command.type === 'sleepUnit')).toBe(true);
    expect(JSON.stringify(replay(game.config, game.log))).toBe(JSON.stringify(game.state));
  });

  it('round-trips a schema 36 save with a sleeper in it', () => {
    expect(SCHEMA_VERSION).toBe(36);
    const game = sleepingGame();
    const json = saveGame(game);
    expect((JSON.parse(json) as { schemaVersion: number }).schemaVersion).toBe(SCHEMA_VERSION);
    expect(JSON.stringify(loadGame(json).state)).toBe(JSON.stringify(game.state));
  });

  it('serialises an awake unit exactly as one that never slept', () => {
    // Presence is the state: the key must not survive a waking as `false`.
    const state = flatState();
    const never = createUnit(state, 0, 'worker', 5, 5);
    const woken = createUnit(state, 0, 'worker', 15, 5);
    applyCommand(state, sleep(woken.id));
    applyCommand(state, {
      type: 'moveUnit',
      playerId: 0,
      unitId: woken.id,
      target: { col: 16, row: 5 },
    });
    const shape = (unit: Unit): string => JSON.stringify(Object.keys(unit));
    expect(shape(woken)).toBe(shape(never));
  });
});
