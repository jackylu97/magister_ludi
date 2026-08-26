/**
 * What `tech.test.ts` and `tech.slow.test.ts` both need.
 *
 * The split between those two files is cost, not subject: the core file asks
 * what a rule is on a blank rectangle, and the slow one plays two hundred turns
 * to ask when an age closes. Both open the same kind of game and both name a
 * technology the same way, so the two-line fixtures live here rather than in
 * either test file — importing a `.test.ts` from a `.test.ts` would re-register
 * its tests and the suite would count them twice.
 */
import { expect } from 'vitest';

import type { Command } from '../../src/sim/commands';
import { type Game, createGame, dispatch } from '../../src/sim/game';
import type { GameConfig } from '../../src/sim/state';
import { unitDef } from '../../src/sim/unitData';

/** A two-player duel config, overridable a field at a time. */
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

/** The `chooseResearch` command, spelled once. */
export function choose(playerId: number, techId: string): Command {
  return { type: 'chooseResearch', playerId, techId } as Command;
}

/** A game with a city each and both players researching. */
export function researchingGame(): Game {
  const game = createGame(config());
  for (const player of game.state.players) {
    const settler = game.state.units.find(
      (unit) => unit.ownerId === player.id && unitDef(unit.type).foundsCity,
    )!;
    expect(dispatch(game, {
      type: 'foundCity',
      playerId: player.id,
      settlerUnitId: settler.id,
    }).ok).toBe(true);
    expect(dispatch(game, choose(player.id, 'earthenware')).ok).toBe(true);
  }
  return game;
}
