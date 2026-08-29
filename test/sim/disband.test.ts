/**
 * Disband: letting a unit go on purpose, before the creditors do it for you.
 *
 * The user's ruling of 2026-08-29 — "we need a way to delete units too" — and
 * the properties are the whole verb:
 *
 *   1. **It validates like every other order** — a real seat, still acting, its
 *      own unit — and a refusal leaves the state byte-identical (hard rule 1).
 *   2. **The piece leaves through `removeUnit`**, never a splice: `state.units`
 *      loses it and the owner's sight is recomputed, which is exactly what that
 *      one seam is for.
 *   3. **No movement requirement.** A spent, fortified, sleeping or wounded
 *      piece may all be let go — giving up a unit is a decision about the
 *      payroll, not work the unit does.
 *   4. **A routed caravan is refused**, and the refusal points at the screen
 *      that can end the route (`Unit.trade` is the route; there is no register).
 *   5. **The wild never disbands.** It has no treasury to save.
 *   6. It reports through `CommandResult.disbanded`, the creditors' own
 *      `DisbandReport` shape, carrying what the piece had been costing —
 *      `unitUpkeepOf`, so a granted piece reports nothing saved.
 *
 * Plus the thing every state change in this project owes: a log with a disband
 * in it replays to a byte-identical state.
 */

import { describe, expect, it } from 'vitest';

import { applyCommand, disbandError } from '../../src/sim/commands';
import { type Game, createGame, dispatch, replay } from '../../src/sim/game';
import { createMap } from '../../src/sim/map';
import { type GameState, createUnit, newGame } from '../../src/sim/state';
import { unitUpkeep } from '../../src/sim/upkeep';
import { resetVisibility } from '../../src/sim/visibility';

/** A blank three-seat state on flat grassland — `sleep.test.ts`'s fixture. */
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

function disband(unitId: number, playerId = 0) {
  return { type: 'disbandUnit', playerId, unitId } as const;
}

/** The wild's seat id — appended last, which is `seatBarbarians`' promise. */
function wildId(state: GameState): number {
  const wild = state.players.find((player) => player.barbarian === true);
  expect(wild).toBeDefined();
  return wild!.id;
}

describe('the disbandUnit command', () => {
  it('takes the piece off the board and says what it had been costing', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 5, 5);
    const result = applyCommand(state, disband(warrior.id));
    expect(result.ok).toBe(true);
    expect(state.units.find((unit) => unit.id === warrior.id)).toBeUndefined();
    expect(result.ok ? result.disbanded : null).toEqual([
      { unitId: warrior.id, ownerId: 0, type: 'warrior', upkeep: unitUpkeep('warrior') },
    ]);
  });

  it('reports nothing saved for a piece the empire never paid for', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 5, 5);
    // `Unit.freeUpkeep` — captured, converted, or handed over by a windfall.
    warrior.freeUpkeep = true;
    const result = applyCommand(state, disband(warrior.id));
    expect(result.ok ? result.disbanded?.[0]?.upkeep : null).toBe(0);
  });

  it('leaves the owner’s sight recomputed — the `removeUnit` seam, not a splice', () => {
    const state = flatState();
    // Two pieces far enough apart that the second cannot see the first's ground.
    createUnit(state, 0, 'warrior', 5, 5);
    const scout = createUnit(state, 0, 'warrior', 20, 5);
    // *Seen*, not *explored*: exploration is remembered forever, so the count
    // that must fall is the one for ground somebody is standing near now.
    const seen = (): number => state.visibility[0]!.filter((cell) => cell > 1).length;
    const lit = seen();
    expect(applyCommand(state, disband(scout.id)).ok).toBe(true);
    expect(seen()).toBeLessThan(lit);
  });

  it('does not require movement, and takes a spent or fortified piece', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 5, 5);
    warrior.movesLeft = 0;
    warrior.fortifiedTurns = 3;
    warrior.hp = 12;
    expect(applyCommand(state, disband(warrior.id)).ok).toBe(true);
    expect(state.units).toHaveLength(0);
  });

  it('refuses a unit that does not exist, and a seat that does not', () => {
    const state = flatState();
    const before = clone(state);
    expect(applyCommand(state, disband(999)).ok).toBe(false);
    expect(applyCommand(state, disband(999, 99)).ok).toBe(false);
    expect(state).toEqual(before);
  });

  it('refuses somebody else’s unit', () => {
    const state = flatState();
    const worker = createUnit(state, 1, 'worker', 5, 5);
    const before = clone(state);
    expect(applyCommand(state, disband(worker.id, 0)).ok).toBe(false);
    expect(state).toEqual(before);
  });

  it('refuses a seat that has already ended its turn', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 5, 5);
    expect(applyCommand(state, { type: 'endTurn', playerId: 0 })).toEqual({ ok: true });
    const before = clone(state);
    expect(applyCommand(state, disband(warrior.id)).ok).toBe(false);
    expect(state).toEqual(before);
  });

  it('refuses a caravan carrying a route, and names the screen that ends it', () => {
    const state = flatState();
    const trader = createUnit(state, 0, 'trader', 5, 5);
    trader.trade = { from: 1, to: 2, expiresTurn: 40, outbound: true, autoResend: false };
    const before = clone(state);
    const result = applyCommand(state, disband(trader.id));
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.error).toContain('Trade screen');
    expect(state).toEqual(before);
  });

  it('takes an idle caravan — the refusal is about the route, not the piece', () => {
    const state = flatState();
    const trader = createUnit(state, 0, 'trader', 5, 5);
    expect(applyCommand(state, disband(trader.id)).ok).toBe(true);
  });

  it('refuses the wild — a barbarian army thins because somebody killed it', () => {
    const state = flatState();
    const wild = wildId(state);
    const raider = createUnit(state, wild, 'warrior', 5, 5);
    const before = clone(state);
    const result = applyCommand(state, disband(raider.id, wild));
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.error).toContain('wild');
    expect(state).toEqual(before);
  });
});

describe('disbandError is the whole rule', () => {
  it('answers `null` for exactly what the reducer accepts', () => {
    const state = flatState();
    const warrior = createUnit(state, 0, 'warrior', 5, 5);
    expect(disbandError(state, 0, warrior.id)).toBeNull();
    // And the reducer's refusal is this sentence, never a second one.
    const trader = createUnit(state, 0, 'trader', 6, 5);
    trader.trade = { from: 1, to: 2, expiresTurn: 40, outbound: true, autoResend: false };
    const said = disbandError(state, 0, trader.id);
    expect(said).not.toBeNull();
    const result = applyCommand(state, disband(trader.id));
    expect(result.ok ? '' : result.error).toBe(said);
  });
});

describe('disband in the log', () => {
  /** A real game with a disbanded opening piece in its log. */
  function disbandingGame(): Game {
    const game = createGame({
      seed: 4,
      sizeName: 'duel',
      players: [
        { name: 'A', color: '#a00', isHuman: true },
        { name: 'B', color: '#00a', isHuman: true },
      ],
      barbarians: true,
    });
    // The opening scout, which `newGame` seats deterministically — nothing goes
    // on the board outside the log, or a replay from `{config, log}` would have
    // nothing to let go of.
    const piece = game.state.units.find((unit) => unit.ownerId === 0 && unit.type !== 'settler');
    expect(piece).toBeDefined();
    expect(dispatch(game, { type: 'disbandUnit', playerId: 0, unitId: piece!.id }).ok).toBe(true);
    for (let turn = 0; turn < 4; turn++) {
      for (const player of game.state.players) {
        dispatch(game, { type: 'endTurn', playerId: player.id });
      }
    }
    return game;
  }

  it('replays to a byte-identical state', () => {
    const game = disbandingGame();
    expect(game.log.some((command) => command.type === 'disbandUnit')).toBe(true);
    expect(JSON.stringify(replay(game.config, game.log))).toBe(JSON.stringify(game.state));
  });
});
