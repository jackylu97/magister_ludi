/**
 * The two-city fixture `cities.test.ts` and `cities.slow.test.ts` share.
 *
 * Three tests are built on it and one of them — the thirty-two-turn
 * byte-for-byte replay — is slow-tier by shape, so the fixture has to be
 * reachable from both files. It lives in a plain module rather than being
 * exported from a test file, because importing a `.test.ts` from a `.test.ts`
 * re-registers its tests and the suite would count them twice.
 */
import { expect } from 'vitest';

import { type Command } from '../../src/sim/commands';
import { type Game, createGame, dispatch } from '../../src/sim/game';
import type { GameConfig } from '../../src/sim/state';
import { unitDef } from '../../src/sim/unitData';

export function config(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    seed: 31337,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#e8503a', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
    ...overrides,
  };
}

/** Founds a city with each player's starting settler and queues some work. */
export function twoCityGame(): Game {
  const game = createGame(config());
  for (const player of game.state.players) {
    const settler = game.state.units.find(
      (unit) => unit.ownerId === player.id && unitDef(unit.type).foundsCity,
    );
    expect(settler).toBeDefined();
    expect(
      dispatch(game, { type: 'foundCity', playerId: player.id, settlerUnitId: settler!.id }).ok,
    ).toBe(true);
  }
  expect(game.state.cities).toHaveLength(2);

  for (const city of game.state.cities) {
    expect(
      dispatch(game, {
        type: 'setCityProduction',
        playerId: city.ownerId,
        cityId: city.id,
        // Units only. Every building is behind a technology since the Age I
        // rework, and this game is driven *entirely by commands* so that its
        // log is a save file — a tech granted by reaching into the state
        // would not survive the replay these three tests exist to assert.
        // What is being measured is thirty turns of growth and production,
        // and a queue of units measures it exactly as well.
        queue: [
          { kind: 'unit', id: 'warrior' },
          { kind: 'unit', id: 'worker' },
          { kind: 'unit', id: 'scout' },
        ],
      } as Command).ok,
    ).toBe(true);
  }
  return game;
}
