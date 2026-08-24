import { describe, expect, it } from 'vitest';

import { createGame, loadGame, replay, saveGame, snapshotState } from '../../src/sim/game';
import { generateMap } from '../../src/sim/mapgen';
import {
  MAPGEN_CONFIG,
  type MapgenOverrides,
  mapgenFor,
  resolveMapgenConfig,
} from '../../src/sim/mapgenData';
import type { GameConfig } from '../../src/sim/state';
import { newGame } from '../../src/sim/state';
import { chooseStartPositions, startSpacing } from '../../src/sim/startPositions';

/**
 * The mapgen override seam: different numbers, same promise.
 *
 * A tuning panel needs to generate a map with `mountainShare: 0.11` without the
 * generator's module table ever being written to, because a mutated table is a
 * `{config, log}` that replays to a different world depending on what somebody
 * had typed first. The sheet therefore rides in the **config**, and these tests
 * hold that arrangement to four things:
 *
 *   1. an absent sheet is byte-identical to the world before the feature;
 *   2. a sheet changes the map, and changes it the same way every time;
 *   3. a typo throws rather than being ignored — the failure mode this exists
 *      to prevent is a designer concluding a tunable does nothing;
 *   4. a save round-trips it, so the map comes back.
 */

const SEED = 90210;
const SIZE = 'duel';

function config(overrides?: MapgenOverrides): GameConfig {
  return {
    seed: SEED,
    sizeName: SIZE,
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Basil', color: '#1f8a85', isHuman: false },
    ],
    ...(overrides ? { mapgenOverrides: overrides } : {}),
  };
}

describe('resolveMapgenConfig', () => {
  it('returns the module table itself when there is nothing to merge', () => {
    expect(resolveMapgenConfig()).toBe(MAPGEN_CONFIG);
    expect(resolveMapgenConfig(null)).toBe(MAPGEN_CONFIG);
    expect(resolveMapgenConfig({})).toBe(MAPGEN_CONFIG);
  });

  it('merges one leaf and leaves every sibling alone', () => {
    const merged = resolveMapgenConfig({ elevation: { mountainShare: 0.11 } });
    expect(merged.elevation.mountainShare).toBeCloseTo(0.11, 12);
    expect(merged.elevation.hillShare).toBe(MAPGEN_CONFIG.elevation.hillShare);
    expect(merged.moisture).toEqual(MAPGEN_CONFIG.moisture);
    expect(merged.starts).toEqual(MAPGEN_CONFIG.starts);
  });

  it('reaches a nested leaf without flattening its parent', () => {
    const merged = resolveMapgenConfig({
      resources: { luxuryCopiesPerKind: { max: 9 } },
    });
    expect(merged.resources.luxuryCopiesPerKind).toEqual({
      min: MAPGEN_CONFIG.resources.luxuryCopiesPerKind.min,
      max: 9,
    });
  });

  it('never writes to the module table', () => {
    const before = JSON.stringify(MAPGEN_CONFIG);
    resolveMapgenConfig({
      elevation: { mountainShare: 0.5 },
      moisture: { rainShadow: { enabled: false } },
      starts: { ringWeights: [1, 0.8, 0.4] },
    });
    expect(JSON.stringify(MAPGEN_CONFIG)).toBe(before);
  });

  it('replaces an array wholesale rather than merging into it', () => {
    const merged = resolveMapgenConfig({ starts: { ringWeights: [1, 0.8, 0.4] } });
    expect(merged.starts.ringWeights).toEqual([1, 0.8, 0.4]);
  });

  it('throws on an unknown key, naming it and its siblings', () => {
    expect(() => resolveMapgenConfig({ elevation: { mountainshare: 0.1 } } as MapgenOverrides))
      .toThrow(/elevation\.mountainshare/);
    expect(() => resolveMapgenConfig({ elevatoin: {} } as MapgenOverrides)).toThrow(
      /Unknown mapgen override key "elevatoin"/,
    );
    expect(() =>
      resolveMapgenConfig({ resources: { luxuryCopiesPerKind: { mid: 4 } } } as MapgenOverrides),
    ).toThrow(/resources\.luxuryCopiesPerKind\.mid/);
  });

  it('throws when a value is the wrong shape', () => {
    expect(() =>
      resolveMapgenConfig({ elevation: { mountainShare: 'lots' } } as unknown as MapgenOverrides),
    ).toThrow(/must be a number/);
    expect(() =>
      resolveMapgenConfig({
        moisture: { rainShadow: { enabled: 1 } },
      } as unknown as MapgenOverrides),
    ).toThrow(/must be a boolean/);
    expect(() =>
      resolveMapgenConfig({ starts: { ringWeights: 2 } } as unknown as MapgenOverrides),
    ).toThrow(/must be an array/);
    expect(() =>
      resolveMapgenConfig({ elevation: 0.4 } as unknown as MapgenOverrides),
    ).toThrow(/must be an object/);
    expect(() =>
      resolveMapgenConfig({ elevation: { seaLevel: NaN } } as MapgenOverrides),
    ).toThrow(/finite/);
  });

  it('lets an explicit undefined stand for "not overridden"', () => {
    const merged = resolveMapgenConfig({
      elevation: { mountainShare: undefined, hillShare: 0.3 },
    });
    expect(merged.elevation.mountainShare).toBe(MAPGEN_CONFIG.elevation.mountainShare);
    expect(merged.elevation.hillShare).toBe(0.3);
  });
});

describe('generateMap with overrides', () => {
  it('is byte-identical to today when the sheet is absent or empty', () => {
    const plain = JSON.stringify(generateMap(SEED, SIZE));
    expect(JSON.stringify(generateMap(SEED, SIZE, undefined))).toBe(plain);
    expect(JSON.stringify(generateMap(SEED, SIZE, {}))).toBe(plain);
    // And no stray key on the map itself: an unmodified world serialises the
    // way it did before the field existed.
    expect(JSON.parse(plain)).not.toHaveProperty('mapgenOverrides');
  });

  it('changes the map, and changes it the same way every time', () => {
    const sheet: MapgenOverrides = { elevation: { mountainShare: 0.16 } };
    const plain = generateMap(SEED, SIZE);
    const tuned = generateMap(SEED, SIZE, sheet);
    const again = generateMap(SEED, SIZE, { elevation: { mountainShare: 0.16 } });

    const mountains = (map: ReturnType<typeof generateMap>): number =>
      map.tiles.filter((tile) => tile.terrain === 'mountain').length;
    expect(mountains(tuned)).toBeGreaterThan(mountains(plain));

    // Determinism is the whole point: a *different* object with the same
    // numbers must produce the same world, or the memo would be load-bearing.
    expect(JSON.stringify(again.tiles)).toBe(JSON.stringify(tuned.tiles));
  });

  it('carries the sheet on the map, so every later pass reads it', () => {
    const sheet: MapgenOverrides = { starts: { minDistance: 9, spacingFactor: 0.9 } };
    const map = generateMap(SEED, SIZE, sheet);
    expect(map.mapgenOverrides).toEqual(sheet);
    expect(mapgenFor(map).starts.minDistance).toBe(9);
    // The start chooser is handed a map and nothing else; it must still be
    // choosing against the numbers the world was made with.
    expect(startSpacing(map)).toBeGreaterThanOrEqual(9);
    expect(startSpacing(generateMap(SEED, SIZE))).toBe(
      startSpacing(generateMap(SEED, SIZE)),
    );
  });

  it('moves the starts when the start tunables move', () => {
    const map = generateMap(SEED, SIZE);
    const tuned = generateMap(SEED, SIZE, { starts: { productionWeight: 0.1, foodWeight: 4 } });
    const at = (m: ReturnType<typeof generateMap>): string =>
      chooseStartPositions(m, 4)
        .map((tile) => `${tile.col},${tile.row}`)
        .join(' ');
    // The ground is identical — only the scorer's weights moved — so this is a
    // statement about the chooser reading the map's own sheet.
    expect(JSON.stringify(tuned.tiles.map((t) => t.terrain))).toBe(
      JSON.stringify(map.tiles.map((t) => t.terrain)),
    );
    expect(at(tuned)).not.toBe(at(map));
  });
});

describe('a game generated with overrides', () => {
  it('leaves a game without them byte-identical', () => {
    const plain = snapshotState(newGame(config()));
    expect(snapshotState(newGame({ ...config(), mapgenOverrides: {} }))).toBe(plain);
  });

  it('replays from its config alone', () => {
    const sheet: MapgenOverrides = {
      elevation: { mountainShare: 0.12, hillShare: 0.2 },
      resources: { luxuryKindsPerContinent: 2 },
    };
    const first = snapshotState(newGame(config(sheet)));
    const second = snapshotState(replay(config(sheet), []));
    expect(second).toBe(first);
    expect(first).not.toBe(snapshotState(newGame(config())));
  });

  it('refuses a bad sheet before a tile is drawn', () => {
    expect(() => newGame(config({ elevation: { seeLevel: 0.5 } } as MapgenOverrides))).toThrow(
      /Unknown mapgen override key "elevation\.seeLevel"/,
    );
  });

  it('round-trips through a save, map and all', () => {
    const sheet: MapgenOverrides = {
      moisture: { forestShare: 0.5, rainShadow: { enabled: false } },
    };
    const game = createGame(config(sheet));
    const reloaded = loadGame(saveGame(game));

    expect(reloaded.config.mapgenOverrides).toEqual(sheet);
    expect(snapshotState(reloaded.state)).toBe(snapshotState(game.state));
    // And the reloaded map still knows its own numbers.
    expect(mapgenFor(reloaded.state.map).moisture.rainShadow.enabled).toBe(false);
  });

  it('normalises an empty sheet away rather than storing one', () => {
    const game = createGame({ ...config(), mapgenOverrides: {} });
    expect(game.config.mapgenOverrides).toBeUndefined();
    expect(JSON.parse(saveGame(game)).config).not.toHaveProperty('mapgenOverrides');
  });

  it('copies the sheet, so editing the caller object cannot rewrite a map', () => {
    const sheet: MapgenOverrides = { elevation: { mountainShare: 0.14 } };
    const game = createGame(config(sheet));
    const before = snapshotState(game.state);
    sheet.elevation!.mountainShare = 0.4;
    expect(snapshotState(replay(game.config, game.log))).toBe(before);
  });
});
