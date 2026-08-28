/**
 * **Slow tier** (`npm run test:slow`, and `npm run test:all`) — the two city
 * replays that need a run rather than a turn.
 *
 * Both are byte-for-byte `{config, log}` replays, and both are long because the
 * thing they are asserting takes a long time to happen. The settler ladder needs
 * **three settlers out of one capital** before the escalation is worth
 * replaying, and how long three take is a function of the ground that capital
 * stands on — eighty turns is a budget generous enough for a slow roll, which is
 * what stops the fixture being a map-generator test in disguise. The two-city
 * replay runs thirty-two turns because it is asserting that growth, borders and
 * production reproduce, and a city that has not grown reproduces nothing.
 *
 * `cities.test.ts` keeps everything else, which is the overwhelming bulk of the
 * concern — the yield algebra, founding, the work radius, citizen assignment and
 * locked tiles, the centre, growth, production and the windfall register,
 * `turnsToBuild`, the settler ladder's *arithmetic*, borders, the reveal gate,
 * and the mid-turn refresh register — including the twenty-turn pinned-citizen
 * replay and the twelve-turn save round-trip, which are the short replays that
 * belong in the after-every-change gate.
 */
import { describe, expect, it } from 'vitest';

import { unitProductionCost } from '../../src/sim/cities';
import type { Command } from '../../src/sim/commands';
import { createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import { unitDef } from '../../src/sim/unitData';
import { twoCityGame } from './citiesHelpers';

const BASE = unitDef('settler').cost;
const STEP = unitDef('settler').escalation!;

describe('escalating settler cost', () => {
  it('replays a run of escalating settlers byte for byte', () => {
    const game = createGame({
      seed: 4242,
      sizeName: 'standard',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    });
    const founder = game.state.units.find((unit) => unitDef(unit.type).foundsCity)!;
    expect(
      dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: founder.id }).ok,
    ).toBe(true);
    const capital = game.state.cities[0]!;

    // Eighty turns rather than forty. The ladder needs three settlers out of one
    // capital to be worth replaying, and how long three take is a function of
    // the ground that capital stands on — which the elevation/moisture rework
    // moved. A budget generous enough for a slow roll costs nothing here and
    // stops the fixture being a map-generator test in disguise.
    for (let turn = 0; turn < 80; turn++) {
      if (capital.queue.length === 0 && capital.population >= unitDef('settler').minCityPop) {
        dispatch(game, {
          type: 'setCityProduction',
          playerId: 0,
          cityId: capital.id,
          queue: [{ kind: 'unit', id: 'settler' }],
        } as Command);
      }
      expect(dispatch(game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
    }

    // The run was long enough for the ladder to matter.
    const built = game.state.players[0]!.unitsBuilt.settler ?? 0;
    expect(built).toBeGreaterThanOrEqual(3);
    expect(unitProductionCost(game.state, 0, 'settler')).toBe(BASE + STEP * built);
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });

});

describe('determinism with cities', () => {
  it('replays thirty turns of two growing cities byte for byte', () => {
    const game = twoCityGame();
    for (let turn = 0; turn < 32; turn++) {
      for (const player of game.state.players) {
        expect(dispatch(game, { type: 'endTurn', playerId: player.id }).ok).toBe(true);
      }
    }

    // The game actually did something worth replaying.
    expect(game.state.turn).toBe(33);
    expect(game.state.cities.every((city) => city.population > 1)).toBe(true);
    // Units rather than buildings, for the reason the queue names: every
    // building is behind a technology now, and this log may not reach past the
    // reducer to grant one.
    expect(game.state.units.some((unit) => unit.type === 'worker')).toBe(true);
    expect(game.state.tileOwner.some((owner) => owner !== null)).toBe(true);

    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });

});
