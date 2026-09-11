/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — where a start
 * may be seated, swept.
 *
 * Properties across many seeds and every map size rather than fixtures on one
 * roll, because the claim is about the algorithm and not about seed 4242 — and
 * "every map size" is what makes them slow, since the last two sizes are a huge
 * board and a giant one. Every threshold is read from `mapgen.starts`, so a
 * designer who retunes a weight retunes this suite with it.
 *
 * `startPositions.test.ts` keeps what one duel or one standard map answers: that
 * the chooser lands on passable land, is deterministic in the map alone, never
 * doubles up, relaxes rather than seats fewer, that the roster is planned and
 * spilled the way the stacking rule says, and that a site's score folds its own
 * ledger.
 */
import { describe, expect, it } from 'vitest';
import { MAPGEN_CONFIG, MAP_SIZE_NAMES } from '../../src/sim/mapgen';
import { tileHex, tileIndex, wrappedDistance } from '../../src/sim/map';
import {
  chooseStartPositions,
  planStartPositions,
  scoreStartSite,
  startSpacing,
} from '../../src/sim/startPositions';
import { RULES } from '../../src/sim/rulesData';
import type { GameConfig } from '../../src/sim/state';
import { gameFor, mapFor } from './fixtures';

function config(players: number, sizeName = 'duel', seed = 4242): GameConfig {
  return {
    seed,
    sizeName,
    players: new Array(players).fill(null).map((_, i) => ({ name: `P${i}`, color: '#fff' })),
  };
}

describe('newGame start placement', () => {
  it('gives every player their starting roster on every map size', () => {
    for (const sizeName of MAP_SIZE_NAMES) {
      const state = gameFor(config(3, sizeName));
      expect(state.units).toHaveLength(3 * RULES.startingUnits.length);
      for (const player of state.players) {
        const owned = state.units.filter((u) => u.ownerId === player.id);
        expect(owned.map((u) => u.type)).toEqual(RULES.startingUnits);
      }
    }
  });

});

describe('start-site scoring', () => {
  const STARTS = MAPGEN_CONFIG.starts;
  const SEEDS = [1, 7, 99, 1234, 4242, 31337];

  it('never seats anybody on cold or arid ground when the map has better', () => {
    for (const size of MAP_SIZE_NAMES) {
      for (const seed of SEEDS.slice(0, 3)) {
        const map = mapFor(seed, size);
        for (const start of chooseStartPositions(map, 4)) {
          // The hard rejection is on the *site*, so a start on snow, tundra or
          // desert can only mean the accepted pool was exhausted — which is a
          // different failure, and the maps in this suite are not that poor.
          expect(`${size}/${seed}: ${start.terrain}`).toBe(`${size}/${seed}: ${start.terrain}`);
          expect(STARTS.hostileTerrain).not.toContain(start.terrain);
        }
      }
    }
  });

  it('clears the food and production floors on every start it accepts', () => {
    for (const seed of SEEDS) {
      const map = mapFor(seed, 'standard');
      for (const start of chooseStartPositions(map, 6)) {
        const score = scoreStartSite(map, start);
        expect(score.reject).toBeNull();
        expect(`${seed} food ${score.ringFood}`).toBe(
          `${seed} food ${Math.max(score.ringFood, STARTS.minRingFood)}`,
        );
        expect(`${seed} prod ${score.ringProduction}`).toBe(
          `${seed} prod ${Math.max(score.ringProduction, STARTS.minRingProduction)}`,
        );
      }
    }
  });

  it('keeps every pair of starts at the map’s own spacing', () => {
    // Every size except the duel map, which is the one board where four players
    // genuinely do not fit at full spacing — the greedy sweep relaxes there by
    // design rather than seating three of them (see the test above). The floor
    // the clamp guarantees is asserted for it separately, below.
    for (const size of MAP_SIZE_NAMES.filter((name) => name !== 'duel')) {
      for (const seed of SEEDS.slice(0, 3)) {
        const map = mapFor(seed, size);
        const spacing = startSpacing(map);
        const starts = chooseStartPositions(map, 4);
        for (let i = 0; i < starts.length; i++) {
          for (let j = i + 1; j < starts.length; j++) {
            const distance = wrappedDistance(map, tileHex(starts[i]!), tileHex(starts[j]!));
            expect(`${size}/${seed}: ${distance}`).toBe(
              `${size}/${seed}: ${Math.max(distance, spacing)}`,
            );
          }
        }
      }
    }
  });

  it('seats a duel map’s four anyway, and reports every seat it could not keep apart', () => {
    // **The duel board cannot hold the floor, and that is now said out loud.**
    // Until 2026-09-11 the floor was 5 and a 40×25 board could hold it, so this
    // asked for it outright; the floor is 10 now (`docs/flags.md` (rrrr),
    // (tttt)) and four capitals on 432 land tiles will not fit at ten. The
    // ruling's answer is not to fail and not to pretend: seat everybody at the
    // best distance the board has, and hand back a `shortfall` row for each seat
    // inside the floor. So the claim is the shortfall's own honesty — every row
    // names a real distance, and every seat *not* on a row really is clear.
    for (const seed of SEEDS) {
      const map = mapFor(seed, 'duel');
      const plan = planStartPositions(map, 4);
      expect(plan.starts).toHaveLength(4);
      const floor = MAPGEN_CONFIG.starts.minDistance;
      for (let seat = 0; seat < plan.starts.length; seat++) {
        let nearest = Infinity;
        for (let other = 0; other < plan.starts.length; other++) {
          if (other === seat) continue;
          nearest = Math.min(
            nearest,
            wrappedDistance(map, tileHex(plan.starts[seat]!), tileHex(plan.starts[other]!)),
          );
        }
        const row = plan.shortfall.find((entry) => entry.seat === seat);
        expect(`${seed}/${seat}: nearest ${nearest}, reported ${row?.distance ?? 'clear'}`).toBe(
          `${seed}/${seat}: nearest ${nearest}, reported ${nearest < floor ? nearest : 'clear'}`,
        );
      }
    }
  });

  it('holds the floor on every size the product actually plays', () => {
    // The other half of the same claim. Six seats is the shipped roster and
    // `standard` up is where the game is played; there the floor is not a
    // fallback, it is kept, and no seat is ever reported short.
    for (const size of MAP_SIZE_NAMES.filter((name) => name !== 'duel')) {
      for (const seed of SEEDS) {
        const map = mapFor(seed, size);
        const plan = planStartPositions(map, 6);
        expect(`${size}/${seed}: ${plan.shortfall.length} short`).toBe(`${size}/${seed}: 0 short`);
      }
    }
  });

  it('scales that spacing to the map and not to the roster', () => {
    const small = mapFor(4242, 'duel');
    const large = mapFor(4242, 'giant');
    expect(startSpacing(large)).toBeGreaterThan(startSpacing(small));
    expect(startSpacing(small)).toBeGreaterThanOrEqual(STARTS.minDistance);
    expect(startSpacing(large)).toBeLessThanOrEqual(STARTS.maxDistance);
    // Independent of how many players ask, which is the property the resource
    // fairness passes lean on: they seat the maximum roster once and cover every
    // real game because a short roster's starts are an exact *prefix*.
    const few = chooseStartPositions(large, 2).map((t) => tileIndex(large, t.col, t.row));
    const many = chooseStartPositions(large, RULES.game.maxPlayers).map((t) =>
      tileIndex(large, t.col, t.row),
    );
    expect(many.slice(0, few.length)).toEqual(few);
  });

});
