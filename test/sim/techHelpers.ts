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
import { ABILITY_TECH, TECH_IDS, type TechAge, type TechId, techDef } from '../../src/sim/techData';
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

/**
 * Every technology whose gift is a **thing** — and deliberately not the ones
 * whose gift is a **rule** (the tree pass of 2026-08-30).
 *
 * What a fixture saying "give the seat every technology" has always meant is
 * *nothing is gated*: Currency is held so the roster question never comes up,
 * Sailing so the water is not the subject. What none of them ever meant is
 * *and seven rules of the world have been rewritten* — The Imperial Post keeps
 * a town's roads for nothing, The Examination Hall lifts every good rung of
 * the meters by five points, Colonial Charters founds every city with a
 * granary. Each of those belongs in a test about that node, and each has one.
 *
 * The node that **opens the ocean** is left out for the same reason and by the
 * same kind of derivation: a great many fixtures in this suite are built out of
 * walls of ocean, and a seat holding The Astrolabe walks through them.
 *
 * Derived rather than listed, so the next such node joins by being written
 * rather than by somebody remembering this function. `upTo` narrows it to an
 * era, which is what the resource tiers want.
 */
export function plainTechs(upTo: TechAge = 4): TechId[] {
  const ocean = ABILITY_TECH.get('oceanGoing');
  return TECH_IDS.filter((id) => {
    const def = techDef(id);
    if (def.age > upTo) return false;
    if ((def.effects ?? []).length > 0) return false;
    return id !== ocean;
  });
}
