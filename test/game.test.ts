import { describe, expect, it } from 'vitest';
import { type Command } from '../src/sim/commands';
import {
  type Game,
  createGame,
  dispatch,
  loadGame,
  replay,
  restoreState,
  saveGame,
  snapshotState,
} from '../src/sim/game';
import { tileHex, tileIndex, wrappedDistance } from '../src/sim/map';
import { type Cell, findPath, reachableTiles } from '../src/sim/pathfind';
import { type GameConfig, type Unit, SCHEMA_VERSION } from '../src/sim/state';

function config(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    seed: 31337,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#e8503a', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
      { name: 'Cleo', color: '#4caf50' },
    ],
    ...overrides,
  };
}

function endTurn(playerId: number): Command {
  return { type: 'endTurn', playerId };
}

/**
 * Plays out `count` whole turns: every seat ends, in player order. Turns are
 * simultaneous, so a turn advances on the last of each group, not on each one.
 */
function endTurns(game: Game, count: number): void {
  for (let i = 0; i < count; i++) {
    for (const player of game.state.players) {
      expect(dispatch(game, endTurn(player.id)).ok).toBe(true);
    }
  }
}

describe('createGame', () => {
  it('starts with the normalised config, a fresh state and an empty log', () => {
    const game = createGame(config({ seed: 8.9 }));
    expect(game.config.seed).toBe(8);
    expect(game.log).toEqual([]);
    expect(game.state.turn).toBe(1);
    expect(game.state.map.seed).toBe(8);
  });

  it('does not alias the caller’s config', () => {
    const source = config();
    const game = createGame(source);
    source.sizeName = 'standard';
    source.players.push({ name: 'Late', color: '#000' });
    expect(game.config.sizeName).toBe('duel');
    expect(game.config.players).toHaveLength(3);
  });
});

describe('dispatch', () => {
  it('logs a command only when it succeeds, author included', () => {
    const game = createGame(config());
    expect(dispatch(game, endTurn(0)).ok).toBe(true);
    expect(dispatch(game, endTurn(1)).ok).toBe(true);
    expect(game.log).toEqual([
      { type: 'endTurn', playerId: 0 },
      { type: 'endTurn', playerId: 1 },
    ]);

    const rejected = dispatch(game, { type: 'nope' } as unknown as Command);
    expect(rejected.ok).toBe(false);
    // A refused second endTurn is not logged either, and leaves the flags alone.
    expect(dispatch(game, endTurn(1)).ok).toBe(false);
    expect(game.log).toHaveLength(2);
    expect(game.state.turnEnded).toEqual([true, true, false]);
  });

  it('copies the command so a reused object cannot rewrite history', () => {
    const game = createGame(config());
    const command = { type: 'endTurn', playerId: 0 } as Command & { note?: string };
    dispatch(game, command);
    command.note = 'mutated after dispatch';
    expect(game.log[0]).toEqual({ type: 'endTurn', playerId: 0 });
  });
});

describe('replay', () => {
  it('reproduces the live state exactly from config and log', () => {
    const game = createGame(config());
    endTurns(game, 7);
    const rebuilt = replay(game.config, game.log);
    expect(rebuilt).toEqual(game.state);
    expect(snapshotState(rebuilt)).toBe(snapshotState(game.state));
  });

  it('reproduces an untouched game too', () => {
    const game = createGame(config());
    expect(replay(game.config, game.log)).toEqual(game.state);
  });

  it('reproduces a game of moves, spawns and turns exactly', () => {
    const game = createGame(config());
    const unitsOf = (playerId: number) =>
      game.state.units.filter((u) => u.ownerId === playerId);

    /** The first tile, in index order, that is a real several-turn march away. */
    function distantTarget(unit: Unit): Cell {
      const { map } = game.state;
      const from = tileHex(map.tiles[tileIndex(map, unit.col, unit.row)]!);
      for (const tile of map.tiles) {
        const distance = wrappedDistance(map, from, tileHex(tile));
        if (distance < 4 || distance > 8) continue;
        const path = findPath(game.state, unit, tile);
        if (path && path.length > unit.movesLeft) return { col: tile.col, row: tile.row };
      }
      throw new Error('This seed has no room to march; pick another');
    }

    // Ada marches a unit somewhere far enough to need several turns.
    const settler = unitsOf(0)[0]!;
    expect(
      dispatch(game, {
        type: 'moveUnit',
        playerId: 0,
        unitId: settler.id,
        target: distantTarget(settler),
      }).ok,
    ).toBe(true);
    expect(settler.path).toBeDefined();

    // In the same window, Bors reinforces beside his own escort. Two players
    // acting inside one turn is the normal case now, not an interleaving trick.
    const borsUnits = unitsOf(1);
    const escort = borsUnits[borsUnits.length - 1]!;
    // Somewhere the escort could itself stand is somewhere a soldier fits.
    const muster = reachableTiles(game.state, escort)[0]!.tile;
    expect(
      dispatch(game, {
        type: 'spawnUnit',
        playerId: 1,
        ownerId: escort.ownerId,
        unitType: 'scout',
        at: { col: muster.col, row: muster.row },
      }).ok,
    ).toBe(true);
    endTurns(game, 3);

    // Ada re-orders the marching unit mid-route, then more turns pass.
    const marching = unitsOf(0).find((u) => u.path !== undefined) ?? unitsOf(0)[0]!;
    dispatch(game, {
      type: 'moveUnit',
      playerId: 0,
      unitId: marching.id,
      target: { col: marching.col, row: marching.row + 2 },
    });
    endTurns(game, 8);

    expect(game.log.length).toBeGreaterThan(10);
    const rebuilt = replay(game.config, game.log);
    expect(rebuilt).toEqual(game.state);
    expect(snapshotState(rebuilt)).toBe(snapshotState(game.state));
  });

  it('throws rather than silently skipping a command it cannot apply', () => {
    const bad = [endTurn(0), { type: 'timeTravel' }] as unknown as Command[];
    expect(() => replay(config(), bad)).toThrow(/Replay failed at command 1/);
  });

  it('replays an out-of-order interleaving of every seat identically', () => {
    const game = createGame(config());
    const first = (playerId: number) =>
      game.state.units.filter((u) => u.ownerId === playerId)[0]!;

    // Seats act in no particular order and end in no particular order, twice —
    // which is exactly what arriving network commands look like.
    for (const order of [
      [2, 0, 1],
      [1, 2, 0],
    ]) {
      for (const playerId of order) {
        const unit = first(playerId);
        const somewhere = reachableTiles(game.state, unit)[0]!.tile;
        expect(
          dispatch(game, {
            type: 'moveUnit',
            playerId,
            unitId: unit.id,
            target: { col: somewhere.col, row: somewhere.row },
          }).ok,
        ).toBe(true);
      }
      for (const playerId of [...order].reverse()) {
        expect(dispatch(game, endTurn(playerId)).ok).toBe(true);
      }
    }

    expect(game.state.turn).toBe(3);
    expect(game.log).toHaveLength(12);
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });

  it('resolves a contested tile the same way on replay', () => {
    const game = createGame(config());
    const mine = game.state.units.filter((u) => u.ownerId === 0)[0]!;
    const contested = reachableTiles(game.state, mine)[0]!.tile;
    const target = { col: contested.col, row: contested.row };

    // Player 0 takes the tile first...
    expect(dispatch(game, { type: 'moveUnit', playerId: 0, unitId: mine.id, target }).ok).toBe(
      true,
    );
    // ...so player 1 reaching for the same one is refused, and the loser's
    // command never reaches the log at all.
    const theirs = game.state.units.filter((u) => u.ownerId === 1)[0]!;
    const race = dispatch(game, { type: 'moveUnit', playerId: 1, unitId: theirs.id, target });
    expect(race.ok).toBe(false);
    expect(game.log).toHaveLength(1);
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });
});

describe('saveGame / loadGame', () => {
  it('stores config and log, not the state', () => {
    const game = createGame(config());
    endTurns(game, 4);
    const parsed = JSON.parse(saveGame(game)) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(['config', 'log', 'schemaVersion']);
    expect(parsed['schemaVersion']).toBe(SCHEMA_VERSION);
    // The map is the big thing, and it is nowhere in the file.
    expect(saveGame(game).length).toBeLessThan(1000);
  });

  it('round-trips into a game with an identical state that keeps playing', () => {
    const game = createGame(config());
    endTurns(game, 5);

    const loaded = loadGame(saveGame(game));
    expect(loaded.config).toEqual(game.config);
    expect(loaded.log).toEqual(game.log);
    expect(loaded.state).toEqual(game.state);

    // Both continue from the same point and stay in lockstep.
    endTurns(loaded, 4);
    endTurns(game, 4);
    expect(loaded.state).toEqual(game.state);
    expect(loaded.log).toEqual(game.log);
  });

  it('rejects files it cannot trust', () => {
    expect(() => loadGame('42')).toThrow(/not an object/);
    expect(() => loadGame(JSON.stringify({ schemaVersion: 999, config: config(), log: [] })))
      .toThrow(/schema 999/);
    expect(() => loadGame(JSON.stringify({ schemaVersion: SCHEMA_VERSION, log: [] })))
      .toThrow(/no config/);
    expect(() => loadGame(JSON.stringify({ schemaVersion: SCHEMA_VERSION, config: config() })))
      .toThrow(/command log/);
  });
});

describe('snapshotState / restoreState', () => {
  it('round-trips the full state, map included', () => {
    const game = createGame(config());
    endTurns(game, 5);
    const restored = restoreState(snapshotState(game.state));
    expect(restored).toEqual(game.state);
    expect(restored.map).toEqual(game.state.map);
    expect(restored.map.tiles).toHaveLength(game.state.map.tiles.length);
    expect(restored.rng).toEqual(game.state.rng);
  });

  it('produces a state that can still be played', () => {
    const game = createGame(config());
    endTurns(game, 3);
    const restored = restoreState(snapshotState(game.state));
    const revived: Game = { config: game.config, state: restored, log: [...game.log] };
    endTurns(revived, 3);
    endTurns(game, 3);
    expect(revived.state).toEqual(game.state);
  });

  it('rejects a snapshot from another schema', () => {
    expect(() => restoreState('null')).toThrow(/not an object/);
    expect(() => restoreState(JSON.stringify({ schemaVersion: 0 }))).toThrow(/schema 0/);
  });
});

describe('determinism guard', () => {
  it('produces bit-identical states for interleaved games from one config', () => {
    const a = createGame(config());
    const b = createGame(config());
    for (let i = 0; i < 12; i++) {
      const command = endTurn(i % 3);
      // Deliberately alternate which game moves first.
      if (i % 2 === 0) {
        dispatch(a, command);
        dispatch(b, command);
      } else {
        dispatch(b, command);
        dispatch(a, command);
      }
    }
    expect(snapshotState(a.state)).toBe(snapshotState(b.state));
    expect(snapshotState(replay(config(), a.log))).toBe(snapshotState(a.state));
  });

  it('keeps different seeds apart under the same command log', () => {
    const a = createGame(config({ seed: 1 }));
    const b = createGame(config({ seed: 2 }));
    endTurns(a, 6);
    endTurns(b, 6);
    expect(a.log).toEqual(b.log);
    expect(snapshotState(a.state)).not.toBe(snapshotState(b.state));
  });
});
