import { describe, expect, it, vi } from 'vitest';

/**
 * The load-time import cycles, asserted rather than reasoned about.
 *
 * Several modules document a *function-level* cycle and claim it is safe:
 * `meters.ts` ↔ `cities.ts`, `resourceEffects.ts` ↔ `cities.ts`, `tech.ts` ↔
 * `cities.ts`, `statecraft.ts` ↔ `cities.ts`, and `startPositions.ts` →
 * `cities.ts` (closed by `mapgen → resources → startPositions`). Each claim
 * rests on the same thing: nothing reads a *value* from the other module while
 * modules are being evaluated, so whichever one happens to be pulled in first
 * finishes fine.
 *
 * That is exactly the sort of claim that is true until somebody adds a
 * top-level `const X = someFunction()` and it fails as an uninitialised binding
 * at boot — in the browser, not in a suite whose own import order happens to be
 * lucky. So each module is loaded first in turn, with the module registry reset
 * between them, and each is asked to do real work.
 *
 * A failure here reads as `Cannot access 'X' before initialization`, and the
 * fix is never to reorder these tests: it is to move whatever was hoisted back
 * inside a function.
 *
 * **The list is a glob, and that is the point** (2026-08-28). It used to be a
 * hand-kept register of "every module that can be the first one pulled in, worst
 * case first", which meant a new module was covered only if somebody remembered
 * to add it — and the pass that found the `cities.ts` ↔ `trade.ts` cycle found it
 * by hand, because neither of those two hubs was on the list. `import.meta.glob`
 * over `src/sim/*.ts` makes coverage a property of the directory instead: a
 * module added tomorrow is exercised the moment it exists, in a file nobody has
 * to edit. Keys are sorted so the report reads the same way twice.
 */
const SIM_MODULES = import.meta.glob('../../src/sim/*.ts');

describe('module load order', () => {
  const paths = Object.keys(SIM_MODULES).sort();

  it('enumerates the whole simulation', () => {
    // A glob that silently matched nothing would pass every test below by
    // vacuum, which is the one way this file can lie.
    expect(paths.length).toBeGreaterThan(40);
    expect(paths).toContain('../../src/sim/cities.ts');
    expect(paths).toContain('../../src/sim/trade.ts');
    expect(paths).toContain('../../src/sim/routeYields.ts');
    expect(paths).toContain('../../src/sim/empireGold.ts');
  });

  /**
   * Each case re-evaluates the whole simulation graph from cold and then
   * generates a map and resolves a turn on it — two to four seconds on an idle
   * machine and past the 5 s default when `test:all` runs every file in
   * parallel beside it. The budget is generous because this test is a cycle
   * detector, not a benchmark: it fails by throwing "X is not a function", never
   * by being slow, and a timeout here has only ever meant a loaded machine.
   */
  const SWEEP_TIMEOUT_MS = 30_000;

  for (const path of paths) {
    const name = path.replace('../../src/sim/', '').replace(/\.ts$/, '');
    it(`survives ${name} being evaluated first`, async () => {
      vi.resetModules();
      await SIM_MODULES[path]!();

      // Then the whole graph, and a real game on top of it: generation runs the
      // start scorer and both fairness passes, and a turn runs every evaluator
      // that sits on one of the cycles.
      const { createGame, dispatch } = await import('../../src/sim/game');
      // With the wild in it, so the barbarian phase runs inside the resolution
      // below and every module on that side of the graph is exercised too.
      const game = createGame({
        seed: 4242,
        sizeName: 'duel',
        players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
        barbarians: true,
      });
      expect(game.state.map.tiles.length).toBeGreaterThan(0);
      expect(game.state.units.length).toBeGreaterThan(0);
      expect(dispatch(game, { type: 'endTurn', playerId: 0 } as never).ok).toBe(true);
      expect(game.state.turn).toBe(2);
    }, SWEEP_TIMEOUT_MS);
  }
});
