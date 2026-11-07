/**
 * **What batch P2 remembers inside one seat's turn, and the two stale answers it fixed.**
 * The plan is `docs/plans/performance-pass-2026-11-06.md`, "P2".
 *
 * Pinned here:
 *
 *   - `buildImprovementPlan` answers from memory while the economy clock stands still,
 *     writes `unclaimed` again on each ask, and builds again when the clock moves;
 *   - the shadow check rebuilds a remembered plan and throws if the two differ;
 *   - `siteGround`'s copy of the board is built again when the real clock moves, so a
 *     government adopted in a sitting reaches the hypothetical;
 *   - `marchOneTrader` announces a renewed term.
 *
 * The digests in `test/sim/aiDigest.slow.test.ts` hold that none of this moves a
 * decision. These tests hold what a digest cannot see: when each answer is thrown away.
 */

import { describe, expect, it } from 'vitest';

import { botSitting, nextBotDecision, valueContext } from '../../src/ai/bot';
import { buildImprovementPlan, reachableGroundOn } from '../../src/ai/plan';
import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { createMap, getTileAt } from '../../src/sim/map';
import { economyStamp, setSlateShadow, slateShadow } from '../../src/sim/slate';
import {
  type City,
  type GameState,
  bumpPiecesOnly,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import { END_OF_TURN_PHASES, emptyTurnReport } from '../../src/sim/turn';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

/** A blank grassland board with two seats, and a town for each column named. */
function bench(columns: readonly number[]): { state: GameState; towns: City[] } {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a' },
    ],
  });
  state.map = createMap({ width: 30, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(30 * 12).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  const towns: City[] = [];
  for (const column of columns) {
    const town = foundCityAt(state, 0, getTileAt(state.map, column, 5)!)!;
    town.queue = [{ kind: 'unit', id: 'warrior' }];
    refreshCityDerived(state, town);
    towns.push(town);
  }
  state.turn = 40;
  playerById(state, 0)!.gold = 500;
  recomputeAllVisibility(state);
  bumpRevision(state);
  return { state, towns };
}

/** Runs `body` with the shadow check on, and puts back what it found. */
function underShadow(body: () => void): void {
  const was = slateShadow();
  setSlateShadow(true);
  try {
    body();
  } finally {
    setSlateShadow(was);
  }
}

describe('the improvement plan, on the economy clock', () => {
  function planned() {
    const { state } = bench([5]);
    const worker = createUnit(state, 0, 'worker', 12, 5);
    bumpRevision(state);
    const owner = playerById(state, 0)!;
    const ctx = valueContext(state, owner);
    return { state, worker, owner, ctx, plan: buildImprovementPlan(state, owner, ctx) };
  }

  it('answers from memory while the clock stands still', () => {
    const { state, owner, ctx, plan } = planned();
    expect(plan.entries.length).toBeGreaterThan(1);
    expect(buildImprovementPlan(state, owner, ctx)).toBe(plan);
  });

  it('builds again when the clock moves', () => {
    const { state, owner, ctx, plan } = planned();
    bumpRevision(state);
    expect(buildImprovementPlan(state, owner, ctx)).not.toBe(plan);
  });

  it('does not share an answer between two contexts', () => {
    const { state, owner, plan } = planned();
    expect(buildImprovementPlan(state, owner, valueContext(state, owner))).not.toBe(plan);
  });

  it('writes who stands on a hex again on each ask, because a plain order moves a worker and not the clock', () => {
    const { state, worker, owner, ctx, plan } = planned();
    const best = plan.entries[0]!;
    expect(best.unclaimed).toBe(true);
    const clock = economyStamp(state);
    worker.col = best.col;
    worker.row = best.row;
    bumpPiecesOnly(state);
    expect(economyStamp(state)).toBe(clock);

    const again = buildImprovementPlan(state, owner, ctx);
    expect(again).toBe(plan);
    expect(best.unclaimed).toBe(false);
    for (const entry of again.entries) {
      if (entry !== best) expect(entry.unclaimed).toBe(true);
    }

    // And back: the hex is free again as soon as the worker has left it.
    worker.col = 12;
    worker.row = 5;
    bumpPiecesOnly(state);
    buildImprovementPlan(state, owner, ctx);
    expect(best.unclaimed).toBe(true);
  });

  it('agrees with a plan built fresh on the same context, when the clock stands still', () => {
    const { state, worker, owner, ctx, plan } = planned();
    const best = plan.entries[0]!;
    worker.col = best.col;
    worker.row = best.row;
    bumpPiecesOnly(state);
    underShadow(() => {
      expect(() => buildImprovementPlan(state, owner, ctx)).not.toThrow();
    });
  });

  it('is disbelieved by the shadow check when a write said nothing', () => {
    const { state, owner, ctx, plan } = planned();
    const best = plan.entries[0]!;
    // A hex with a work on it offers a different row or none. Written by hand and not
    // announced, which is the stale answer this check exists to name.
    getTileAt(state.map, best.col, best.row)!.improvement = best.improvement!;
    underShadow(() => {
      expect(() => buildImprovementPlan(state, owner, ctx)).toThrowError(/plan shadow/);
    });
  });
});

describe('the board a site is read against', () => {
  it('follows a government adopted in the sitting', () => {
    // The copy in `siteGround` shares its seats' `statecraft` with the real board, but
    // the law it remembers hangs off the copy, whose own clocks never move. Before batch
    // P2 this threw `law shadow` on the second hex (seed 999, seat 2, turn 68).
    const { state } = bench([5]);
    const owner = playerById(state, 0)!;
    const ctx = valueContext(state, owner);
    reachableGroundOn(ctx, getTileAt(state.map, 15, 5)!);
    owner.statecraft.government = 'warChief';
    bumpRevision(state);
    underShadow(() => {
      expect(() => reachableGroundOn(ctx, getTileAt(state.map, 16, 5)!)).not.toThrow();
    });
  });

  it('keeps what it already answered about a hex for the sitting', () => {
    const { state } = bench([5]);
    const owner = playerById(state, 0)!;
    const ctx = valueContext(state, owner);
    const tile = getTileAt(state.map, 15, 5)!;
    const first = reachableGroundOn(ctx, tile);
    bumpRevision(state);
    expect(reachableGroundOn(ctx, tile)).toBe(first);
  });
});

describe('a route that renews', () => {
  it('announces, because the loans read its term', () => {
    const { state, towns } = bench([5, 11]);
    towns[0]!.buildings.push('market');
    bumpRevision(state);
    const cart = createUnit(state, 0, 'trader', towns[0]!.col, towns[0]!.row);
    const sent = applyCommand(state, {
      type: 'startRoute',
      playerId: 0,
      unitId: cart.id,
      fromCityId: towns[0]!.id,
      toCityId: towns[1]!.id,
      mode: 'land',
    });
    expect(sent.ok, sent.ok ? '' : sent.error).toBe(true);
    cart.trade!.expiresTurn = state.turn;
    cart.trade!.autoResend = true;
    // With nothing left to walk on, the renewal is the only write that can announce.
    cart.movesLeft = 0;
    bumpRevision(state);

    const march = END_OF_TURN_PHASES.find((phase) => phase.name === 'marchTraders')!;
    const clock = economyStamp(state);
    march.run(state, emptyTurnReport());
    expect(cart.trade!.expiresTurn).toBeGreaterThan(state.turn);
    expect(economyStamp(state)).toBeGreaterThan(clock);
  });
});

describe('a sitting asks the same questions with the memos in place', () => {
  it('plays a seat to the end of its turn with every hit disbelieved', () => {
    const { state } = bench([5, 11]);
    createUnit(state, 0, 'worker', 12, 7);
    createUnit(state, 0, 'warrior', 6, 7);
    bumpRevision(state);
    const sitting = botSitting(0);
    underShadow(() => {
      for (let step = 0; step < 40; step++) {
        const decision = nextBotDecision(state, 0, sitting);
        if (decision === null) break;
        const result = applyCommand(state, decision.command);
        expect(result.ok, result.ok ? '' : result.error).toBe(true);
        if (decision.command.type === 'endTurn') break;
      }
    });
  });
});
