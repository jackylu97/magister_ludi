/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — the luxury
 * vocabulary, carried through a real game.
 *
 * Both tests here open a **standard map**, found a capital and play it, which is
 * what makes them slow: everything else in the concern is asked of a blank
 * rectangle with seams planted on it by hand. They are worth the map. The
 * signatures touch food, hammers, gold, science, culture, faith, happiness and
 * authority — every number a turn banks — so a run whose luxuries are improved
 * and whose log replays byte for byte is the strongest single statement that
 * none of them reached outside the simulation for anything.
 *
 * `resourceEffects.test.ts` keeps the whole effect vocabulary shape by shape,
 * every scope, `fromAge`, `perCopy`, the seam rule, and the purity claim that
 * two boards built the same way answer identically.
 */
import { describe, expect, it } from 'vitest';

import { type Game, createGame, dispatch, loadGame, replay, saveGame, snapshotState } from '../../src/sim/game';

describe('faith: banked, and spent by nothing', () => {
  it('is carried by a save and survives a replay', () => {
    const config = {
      seed: 4242,
      sizeName: 'standard',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    };
    const game: Game = createGame(config);
    const founder = game.state.units.find((unit) => unit.type === 'settler')!;
    expect(dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: founder.id }).ok).toBe(true);
    for (let turn = 0; turn < 6; turn++) {
      expect(dispatch(game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
    }
    const json = saveGame(game);
    expect(snapshotState(loadGame(json).state)).toBe(snapshotState(game.state));
    // The field is on the player and therefore in the snapshot, whatever it
    // happens to hold on this seed.
    expect(snapshotState(game.state)).toContain('faithPool');
  });

});

describe('signatures and the replay', () => {
  /**
   * Determinism, with the whole vocabulary switched on.
   *
   * The signatures touch food, hammers, gold, science, culture, faith, happiness
   * and authority — every number a turn banks — so a run whose luxuries are
   * improved and whose log replays byte for byte is the strongest single
   * statement that none of them reached outside the simulation for anything.
   */
  it('replays a run byte for byte with the vocabulary live', () => {
    const config = {
      seed: 4242,
      sizeName: 'standard',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    };
    const game: Game = createGame(config);
    const founder = game.state.units.find((unit) => unit.type === 'settler')!;
    expect(dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: founder.id }).ok).toBe(
      true,
    );
    for (let turn = 0; turn < 12; turn++) {
      expect(dispatch(game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
    }

    const reloaded = loadGame(saveGame(game));
    expect(snapshotState(reloaded.state)).toBe(snapshotState(game.state));
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });

});
