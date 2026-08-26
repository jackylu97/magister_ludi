import { describe, expect, it } from 'vitest';
import { newPlayerStatecraft } from '../../src/sim/statecraft';
import { type Command, applyCommand } from '../../src/sim/commands';
import { RULES } from '../../src/sim/rulesData';
import {
  type GameConfig,
  type GameState,
  SCHEMA_VERSION,
  allTurnsEnded,
  allocateEntityId,
  cityById,
  clearTurnEnded,
  deriveGameplayRng,
  hasEndedTurn,
  newGame,
  normalizeConfig,
  playerById,
  unitById,
} from '../../src/sim/state';
import { END_OF_TURN_PHASES, runEndOfTurn } from '../../src/sim/turn';
import { generateMap } from '../../src/sim/mapgen';
import { nextUint32 } from '../../src/sim/rng';

function config(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    seed: 4242,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#e8503a', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
      { name: 'Cleo', color: '#4caf50' },
    ],
    ...overrides,
  };
}

/** A structural copy, for "the state did not change" assertions. */
function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

/** `endTurn` for one seat. Every command names the player who issued it. */
function endTurn(playerId: number): Command {
  return { type: 'endTurn', playerId };
}

describe('newGame', () => {
  it('starts on turn 1 with every seat open and the opening rosters', () => {
    const state = newGame(config());
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.turn).toBe(RULES.game.startingTurn);
    expect(state.turn).toBe(1);
    // One flag per player, all clear: nobody has ended the first turn.
    expect(state.turnEnded).toEqual([false, false, false]);
    expect(allTurnsEnded(state)).toBe(false);
    // Milestone 2 step 2: `newGame` now seats each player's starting units, so
    // the entity counter has already handed out their ids.
    const perPlayer = RULES.startingUnits.length;
    expect(state.units).toHaveLength(state.players.length * perPlayer);
    expect(state.nextEntityId).toBe(RULES.game.firstEntityId + state.units.length);
    expect(state.cities).toEqual([]);
  });

  it('turns player specs into players with index ids and explicit humanity', () => {
    const state = newGame(config());
    // Milestone 3 adds the three empty yield pools every player starts with;
    // Milestone 4 adds the research fields — nothing chosen, and the opening
    // kit of technologies from `rules.research.startingTechs`. Milestone 5 adds
    // `eliminated`, which nobody is on turn one, and escalating settlers add
    // `settlersBuilt` — zero even though every player is holding a settler,
    // because the one they start with was never paid for. Territory & gold adds
    // `tilesPurchased`, the same shape of lifetime counter for bought ground.
    const pools = {
      gold: 0,
      sciencePool: 0,
      culturePool: 0,
      faithPool: 0,
      researching: null,
      techsResearched: RULES.research.startingTechs,
      settlersBuilt: 0,
      tilesPurchased: 0,
      eliminated: false,
      // Every seat carries the flag and every *real* seat carries it false; the
      // wild is appended separately and only when the config asks for it (see
      // the barbarian suite).
      barbarian: false,
      // Always present, like `techsResearched`: every seat has a government and
      // a slot spread from turn one. See `Player.statecraft`.
      statecraft: newPlayerStatecraft(),
    };
    expect(state.players).toEqual([
      { id: 0, name: 'Ada', color: '#e8503a', isHuman: true, ...pools },
      { id: 1, name: 'Bors', color: '#3a7fe8', isHuman: false, ...pools },
      { id: 2, name: 'Cleo', color: '#4caf50', isHuman: false, ...pools },
    ]);
  });

  it('generates the map from the seed and size', () => {
    const state = newGame(config({ seed: 99, sizeName: 'duel' }));
    expect(state.map).toEqual(generateMap(99, 'duel'));
    expect(state.map.seed).toBe(99);
    expect(state.map.sizeName).toBe('duel');
  });

  it('is deterministic: the same config produces an identical state', () => {
    expect(newGame(config())).toEqual(newGame(config()));
    // Also identical byte-for-byte, key order included.
    expect(JSON.stringify(newGame(config()))).toBe(JSON.stringify(newGame(config())));
  });

  it('does not depend on how many other games were created first', () => {
    const first = newGame(config());
    newGame(config({ seed: 7 }));
    newGame(config({ seed: -13, sizeName: 'standard' }));
    expect(newGame(config())).toEqual(first);
  });

  it('gives different seeds different maps and different generator states', () => {
    const a = newGame(config({ seed: 1 }));
    const b = newGame(config({ seed: 2 }));
    expect(a.rng.state).not.toBe(b.rng.state);
    expect(a.map).not.toEqual(b.map);
  });

  it('derives a gameplay stream decorrelated from the map generator', () => {
    const seed = 4242;
    const state = newGame(config({ seed }));
    // The map generator starts at `seed` itself; gameplay must not.
    expect(state.rng.state).not.toBe(seed | 0);
    expect(state.rng).toEqual(deriveGameplayRng(seed));
    // The first gameplay roll is not the first mapgen roll either.
    const gameplay = deriveGameplayRng(seed);
    const mapgen = { state: seed | 0 };
    expect(nextUint32(gameplay)).not.toBe(nextUint32(mapgen));
  });

  it('produces a plain, JSON-serializable state', () => {
    const state = newGame(config());
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it('rejects impossible configs', () => {
    expect(() => newGame(config({ players: [] }))).toThrow(/at least/);
    const crowd = new Array(RULES.game.maxPlayers + 1)
      .fill(null)
      .map((_, i) => ({ name: `P${i}`, color: '#fff' }));
    expect(() => newGame(config({ players: crowd }))).toThrow(/at most/);
    expect(() => newGame(config({ sizeName: 'gigantic' }))).toThrow(/Unknown map size/);
  });
});

describe('normalizeConfig', () => {
  it('coerces the seed to a 32-bit integer and fills in isHuman', () => {
    const normalized = normalizeConfig({
      seed: 12.75,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#fff' }],
    });
    expect(normalized.seed).toBe(12);
    expect(normalized.players[0]).toEqual({ name: 'Ada', color: '#fff', isHuman: false });
  });

  it('copies the players so later edits to the spec cannot reach the game', () => {
    const source = config();
    const state = newGame(source);
    source.players[0]!.name = 'Mallory';
    expect(state.players[0]!.name).toBe('Ada');
  });
});

describe('accessors', () => {
  it('allocates entity ids in a deterministic sequence', () => {
    const state = newGame(config());
    // The starting units have already consumed the first ids.
    const first = state.nextEntityId;
    expect(allocateEntityId(state)).toBe(first);
    expect(allocateEntityId(state)).toBe(first + 1);
    expect(state.nextEntityId).toBe(first + 2);
  });

  it('finds players, units and cities by id', () => {
    const state = newGame(config());
    expect(playerById(state, 0)!.name).toBe('Ada');
    expect(playerById(state, 2)!.name).toBe('Cleo');
    expect(playerById(state, 9)).toBeUndefined();
    expect(unitById(state, state.units[0]!.id)).toBe(state.units[0]);
    expect(unitById(state, 9999)).toBeUndefined();
    // Cities stay empty until milestone 3.
    expect(cityById(state, 1)).toBeUndefined();
  });
});

describe('turn status helpers', () => {
  it('reads and clears the per-player flags', () => {
    const state = newGame(config());
    expect(hasEndedTurn(state, 1)).toBe(false);

    applyCommand(state, endTurn(1));
    expect(hasEndedTurn(state, 1)).toBe(true);
    expect(hasEndedTurn(state, 0)).toBe(false);
    // An id that is nobody's is simply not finished; existence is a different
    // question, asked with `playerById`.
    expect(hasEndedTurn(state, 99)).toBe(false);
    expect(allTurnsEnded(state)).toBe(false);

    clearTurnEnded(state);
    expect(state.turnEnded).toEqual([false, false, false]);
  });

  it('never calls a game with no players "all ended"', () => {
    const state = newGame(config());
    state.players = [];
    state.turnEnded = [];
    expect(allTurnsEnded(state)).toBe(false);
  });

  it('iterates players, not flags, so a stray flag cannot resolve a turn', () => {
    const state = newGame(config());
    state.turnEnded = [true, true, false, true];
    expect(allTurnsEnded(state)).toBe(false);
  });
});

describe('endTurn', () => {
  it('marks one seat finished and leaves the turn alone', () => {
    const state = newGame(config());
    expect(state.turn).toBe(1);

    expect(applyCommand(state, endTurn(1))).toEqual({ ok: true });
    expect(state.turnEnded).toEqual([false, true, false]);
    expect(state.turn).toBe(1);
  });

  it('resolves the turn only when the last of three seats ends', () => {
    const state = newGame(config());

    expect(applyCommand(state, endTurn(2))).toEqual({ ok: true });
    expect(state.turn).toBe(1);
    expect(applyCommand(state, endTurn(0))).toEqual({ ok: true });
    expect(state.turn).toBe(1);
    expect(state.turnEnded).toEqual([true, false, true]);

    expect(applyCommand(state, endTurn(1))).toEqual({ ok: true });
    // The turn rolled over and every seat reopened.
    expect(state.turn).toBe(2);
    expect(state.turnEnded).toEqual([false, false, false]);
  });

  it('resolves on the second seat in a two-player game', () => {
    const state = newGame(
      config({
        players: [
          { name: 'Ada', color: '#a00' },
          { name: 'Bors', color: '#00a' },
        ],
      }),
    );
    expect(applyCommand(state, endTurn(1))).toEqual({ ok: true });
    expect(state.turn).toBe(1);
    expect(applyCommand(state, endTurn(0))).toEqual({ ok: true });
    expect(state.turn).toBe(2);
    expect(state.turnEnded).toEqual([false, false]);
  });

  it('advances every turn in a single-player game', () => {
    const state = newGame(config({ players: [{ name: 'Solo', color: '#fff' }] }));
    applyCommand(state, endTurn(0));
    expect(state.turn).toBe(2);
    expect(state.turnEnded).toEqual([false]);
  });

  it('keeps rolling over many turns', () => {
    const state = newGame(config());
    for (let turn = 0; turn < 10; turn++) {
      for (const player of state.players) applyCommand(state, endTurn(player.id));
    }
    expect(state.turn).toBe(11);
    expect(state.turnEnded).toEqual([false, false, false]);
  });

  it('does not care in which order the seats end', () => {
    const forwards = newGame(config());
    for (const id of [0, 1, 2]) applyCommand(forwards, endTurn(id));
    const backwards = newGame(config());
    for (const id of [2, 1, 0]) applyCommand(backwards, endTurn(id));
    expect(JSON.stringify(backwards)).toBe(JSON.stringify(forwards));
  });

  it('refuses a second endTurn from the same seat, untouched', () => {
    const state = newGame(config());
    applyCommand(state, endTurn(1));
    const before = clone(state);

    const result = applyCommand(state, endTurn(1));
    expect(result).toEqual({ ok: false, error: 'Player 1 has already ended turn 1' });
    expect(state).toEqual(before);
    // And the seat that has *not* ended is still welcome.
    expect(applyCommand(state, endTurn(0))).toEqual({ ok: true });
  });

  it('lets a seat end the next turn after ending this one', () => {
    const state = newGame(config());
    for (const id of [0, 1, 2]) applyCommand(state, endTurn(id));
    expect(applyCommand(state, endTurn(0))).toEqual({ ok: true });
    expect(state.turn).toBe(2);
    expect(state.turnEnded).toEqual([true, false, false]);
  });

  it('refuses a playerId that is not a player, without touching the state', () => {
    const state = newGame(config());
    const before = clone(state);
    for (const bad of [7, -1, 1.5, undefined, '0']) {
      const result = applyCommand(state, { type: 'endTurn', playerId: bad } as unknown as Command);
      expect(result.ok).toBe(false);
    }
    expect(state).toEqual(before);
  });

  it('refuses a corrupt flag array without touching the state', () => {
    const state = newGame(config());
    state.turnEnded = [false, false];
    const before = clone(state);
    const result = applyCommand(state, endTurn(0));
    expect(result).toEqual({
      ok: false,
      error: 'Corrupt turnEnded: 2 flag(s) for 3 player(s)',
    });
    expect(state).toEqual(before);
  });
});

describe('applyCommand contract', () => {
  it('rejects an unknown command type and leaves the state untouched', () => {
    const state = newGame(config());
    const before = clone(state);
    // `foundCity` used to stand in for "not a command yet"; it is one now.
    const result = applyCommand(state, { type: 'razeCity', tile: 3 } as unknown as Command);
    expect(result.ok).toBe(false);
    expect(result).toEqual({ ok: false, error: 'Unknown command type "razeCity"' });
    expect(state).toEqual(before);
  });

  it('rejects malformed commands rather than throwing', () => {
    const state = newGame(config());
    const before = clone(state);
    for (const bad of [null, undefined, 42, 'endTurn', {}, { type: 7 }, []]) {
      const result = applyCommand(state, bad as unknown as Command);
      expect(result.ok).toBe(false);
    }
    expect(state).toEqual(before);
  });

  it('never returns a shared result object', () => {
    const state = newGame(config());
    const a = applyCommand(state, endTurn(0));
    const b = applyCommand(state, endTurn(1));
    expect(a).not.toBe(b);
  });
});

describe('end-of-turn pipeline', () => {
  it('runs a fixed, named, ordered set of phases', () => {
    expect(END_OF_TURN_PHASES.map((phase) => phase.name)).toEqual([
      'collectYields',
      'growCities',
      'advanceProduction',
      'advanceResearch',
      // Culture buys a draft, beside the phase that spends the other pool a
      // resolution filled — and before `expandBorders`, whose channel it never
      // touches. See `runStatecraft`.
      'statecraft',
      'expandBorders',
      'healCities',
      // The wild acts after the towns and before the healing, so a raider that
      // marched or fought is not resting. See `barbarianTurn`.
      'barbarians',
      'healUnits',
      'advanceFortify',
      'resetMovement',
      // As late as it can be: the question "is an enemy standing next to my
      // sleeping worker" is only worth asking of a board that has stopped
      // moving, which is after the wild has raided *and* after `resetMovement`
      // has walked everybody's standing orders. See `wakeSleepers`.
      'wakeSleepers',
      // Still last and unconditional: clearing a flag moves no piece.
      'refreshVisibility',
    ]);
  });

  it('changes nothing when no unit has moved or been hurt', () => {
    const state = newGame(config());
    const before = clone(state);
    runEndOfTurn(state);
    expect(state).toEqual(before);
  });
});
