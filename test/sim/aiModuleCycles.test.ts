import { describe, expect, it, vi } from 'vitest';

/**
 * The bot's load-time import cycles, checked by loading each module first.
 *
 * `src/ai` has many function-level import cycles: `value.ts` with `chain.ts`,
 * `wants.ts`, `routes.ts` and `campaign.ts`, for example. Each one is safe
 * only while no top-level statement reads a value from a module that is still
 * loading. A new top-level `const X = someFunction()` that calls into the
 * cycle breaks that rule. The failure then depends on which module loads
 * first. A test file whose own imports happen to load in a lucky order does
 * not see it, but the browser or the bot worker can load the modules in
 * another order and fail at boot.
 *
 * So each case resets the module registry, loads one module first, and then
 * asks the bot to do real work on a small board. Two kinds of failure show up
 * here:
 *
 *   - "Cannot access 'X' before initialization": a top-level statement read a
 *     value from a module that was still loading. Move the read inside a
 *     function. Do not reorder these tests.
 *   - "X is not a function": a name came through an `export *` from a module
 *     that imports this one back. A star re-export comes out empty in a
 *     cycle. Re-export the name by name.
 *
 * The list of modules is a glob over `src/ai/*.ts`, for the reason
 * `test/mapgen/moduleCycles.test.ts` gives for its own glob: a new module is
 * covered as soon as it exists, and nobody has to remember to add it to a
 * list. The glob is flat because `src/ai` is flat. The keys are sorted so the
 * report reads the same way each time.
 */
const AI_MODULES = import.meta.glob('../../src/ai/*.ts');

describe('bot module load order', () => {
  const paths = Object.keys(AI_MODULES).sort();

  it('enumerates the whole bot', () => {
    // A glob that matched nothing would pass every case below with no work
    // done. This case makes that fail.
    expect(paths.length).toBeGreaterThan(15);
    expect(paths).toContain('../../src/ai/bot.ts');
    expect(paths).toContain('../../src/ai/value.ts');
    expect(paths).toContain('../../src/ai/prices.ts');
    expect(paths).toContain('../../src/ai/scopeReach.ts');
    expect(paths).toContain('../../src/ai/decision.ts');
  });

  /**
   * Each case loads the bot and the whole simulation again from cold, builds a
   * duel map, and plays the first turn of two bot seats. That takes well under
   * a second on an idle machine, and more when other test files run beside it.
   * The budget is generous because this test finds load-order faults by an
   * exception, never by being slow. A timeout here means a loaded machine.
   */
  const SWEEP_TIMEOUT_MS = 30_000;

  for (const path of paths) {
    const name = path.replace('../../src/ai/', '').replace(/\.ts$/, '');
    it(`survives ${name} being evaluated first`, async () => {
      vi.resetModules();
      await AI_MODULES[path]!();

      // Then the rest of the graph, and real bot work on top of it. The driver
      // plays the whole first turn of two bot seats through the bot's own entry
      // point (`nextBotDecision`), and the second End Turn resolves the turn.
      // On this seed one seat founds its town on turn 1, so the town's arms run
      // too. The wild is in the game, so the barbarian phase runs as well.
      const { createGame } = await import('../../src/sim/game');
      const { driveBots } = await import('../../src/ai/driver');
      const game = createGame({
        seed: 4242,
        sizeName: 'duel',
        players: [
          { name: 'Ada', color: '#d4502e' },
          { name: 'Teal', color: '#1f8a85' },
        ],
        barbarians: true,
      });
      const warnings: string[] = [];
      const reports = driveBots(game, { warn: (message) => warnings.push(message) });
      expect(warnings).toEqual([]);
      expect(reports.map((report) => report.playerId)).toEqual([0, 1]);
      for (const report of reports) {
        expect(report.refused).toBe(0);
        expect(report.ended).toBe(true);
      }
      expect(game.state.turn).toBe(2);
    }, SWEEP_TIMEOUT_MS);
  }
});
