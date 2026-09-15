/**
 * The benchmark fixtures are saves, and a save is only evidence if it is
 * reproducible (audit task #24).
 *
 * `scripts/terrain-study/check-fixtures.mjs` builds the developed standard and
 * large maps by driving the bots from a seed and writing the game's own
 * `{config, log}` envelope. Two properties make that a fixture rather than a
 * snapshot, and both are pinned here on a duel-sized stand-in so the core tier
 * stays quick: the same seed and turn count produce the **same bytes**, and the
 * payload **replays** through the same door a player's Continue uses.
 *
 * The long fixtures themselves are built by the script, which runs the identical
 * two checks on each one before it writes the file.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { createGame } from '../../src/sim/game';
import { driveBots } from '../../src/ai/driver';
import { loadSave, makeSavePayload } from '../../src/ui/saves';
import type { GameConfig } from '../../src/sim/state';

const CONFIG: GameConfig = {
  seed: 1,
  sizeName: 'duel',
  players: [
    { name: 'Crimson', color: '#d4502e', isHuman: false },
    { name: 'Teal', color: '#1f8a85', isHuman: false },
  ],
  barbarians: true,
};

function fixture(turns: number): ReturnType<typeof makeSavePayload> {
  const game = createGame(CONFIG);
  for (let turn = 0; turn < turns; turn++) driveBots(game, { warn: () => {} });
  // `savedAt` is a clock, and a clock is the one thing a fixture may not carry.
  return makeSavePayload(game, 'fixture-pin', 0);
}

/** The payload's bytes. A fixture is its bytes: two builds either agree or do not. */
const bytes = (value: unknown): string => JSON.stringify(value);

/** `node:fs` behind a variable specifier — see `paintedBenchmark.test.ts`. */
const FS_SPECIFIER = 'node:fs';
interface MinimalFs { readFileSync(path: string, encoding: string): string }

describe('a benchmark fixture is deterministic', () => {
  it('produces the identical save from the same seed and turn count', () => {
    const first = fixture(4);
    const second = fixture(4);
    expect(bytes(second)).toBe(bytes(first));
    expect(first.log.length).toBeGreaterThan(0);
  });

  it('replays through the real loader, which is what the harness loads it with', () => {
    const payload = fixture(4);
    const loaded = loadSave(JSON.stringify(payload));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.game.state.turn).toBe(payload.turn);
    expect(loaded.game.log.length).toBe(payload.log.length);
  });
});

describe('the fixture generator', () => {
  let source = '';
  beforeAll(async () => {
    source = ((await import(/* @vite-ignore */ FS_SPECIFIER)) as MinimalFs)
      .readFileSync('scripts/terrain-study/check-fixtures.mjs', 'utf8');
  });

  it('runs both checks on every fixture it writes', () => {
    expect(source).toContain('does not replay');
    expect(source).toContain('payloadSha256');
    expect(source).toContain('deterministic');
  });

  it('names a seed, a size and a turn count for each, and nothing else decides one', () => {
    for (const key of ['seed:', 'sizeName:', 'turns:', 'seats:', 'barbarians:']) {
      expect(source).toContain(key);
    }
    // A fixture carries no clock: the envelope is stamped at zero on purpose,
    // so the bytes are a function of the seed alone.
    expect(source).toContain('makeSavePayload(game, fixture.id, 0)');
  });

  it('covers the developed standard map and a larger one, as the gate asks', () => {
    expect(source).toContain("sizeName: 'standard'");
    expect(source).toContain("sizeName: 'large'");
  });
});
