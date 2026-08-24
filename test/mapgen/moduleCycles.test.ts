import { describe, expect, it, vi } from 'vitest';

/**
 * The load-time import cycles, asserted rather than reasoned about.
 *
 * Three modules now document a *function-level* cycle and claim it is safe:
 * `meters.ts` ↔ `cities.ts`, `resourceEffects.ts` ↔ `cities.ts`, and
 * `startPositions.ts` → `cities.ts` (closed by
 * `mapgen → resources → startPositions`). Each claim rests on the same thing:
 * nothing reads a *value* from the other module while modules are being
 * evaluated, so whichever one happens to be pulled in first finishes fine.
 *
 * That is exactly the sort of claim that is true until somebody adds a
 * top-level `const X = someFunction()` and it fails as an uninitialised binding
 * at boot — in the browser, not in a suite whose own import order happens to be
 * lucky. So the entry points are loaded here in each order that matters, with
 * the module registry reset between them, and each is asked to do real work.
 *
 * A failure here reads as `Cannot access 'X' before initialization`, and the
 * fix is never to reorder these tests: it is to move whatever was hoisted back
 * inside a function.
 */
describe('module load order', () => {
  /** Every module that can be the first one pulled in, worst case first. */
  const entryPoints = [
    '../../src/sim/cities',
    '../../src/sim/meters',
    '../../src/sim/resourceEffects',
    '../../src/sim/startPositions',
    '../../src/sim/resources',
    // Entry XX's five: the two halves of the discoveries (`discoveryPlacement`
    // is imported by `mapgen`, `discoveries` by the reducer), the camp registry,
    // the one "a unit arrived" seam, and the wild itself — which imports
    // `combat` and is imported by `turn`, so it closes a loop through the entire
    // simulation if anything in it is hoisted.
    '../../src/sim/discoveryPlacement',
    '../../src/sim/discoveries',
    '../../src/sim/camps',
    '../../src/sim/arrival',
    '../../src/sim/barbarians',
    '../../src/sim/mapgen',
    '../../src/sim/state',
    '../../src/sim/game',
    '../../src/sim/commands',
  ];

  for (const entry of entryPoints) {
    it(`survives ${entry} being evaluated first`, async () => {
      vi.resetModules();
      await import(entry);

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
    });
  }
});
