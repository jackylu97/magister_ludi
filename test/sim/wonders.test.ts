/**
 * Wonders: one per world, claimed by the first city to finish one, and paid for
 * in gold by everybody who was beaten to it.
 *
 * The framework rather than the roster (user, 2026-08-27): there is exactly one
 * wonder row in the table — The Oracle, marked `placeholder` and homed on
 * Divination until the tree pass lands the real twenty-three — and it is here to
 * exercise every path. What is asserted is therefore the *mechanism*: the claim,
 * the two refusals, the refusal to sell one, the sweep that settles a race, the
 * exact rule for what "banked toward it" means, and the fact that a wonder's
 * effect is an ordinary card read by the ordinary evaluator.
 *
 * The refund is deliberately checked as an arithmetic and not as a number: the
 * rate is a tunable (`production.wonderRefundGoldPerHammer`), and a test that
 * hard-coded 1 would fail the day a designer tried 1.5 for the right reason.
 */
import { describe, expect, it } from 'vitest';

import {
  type WonderCompletion,
  advanceProduction,
  foundCityAt,
  productionModifiers,
  queueCategory,
  settleProduction,
} from '../../src/sim/cities';
import {
  BUILDING_IDS,
  WONDER_IDS,
  buildingDef,
  isWonder,
} from '../../src/sim/buildingData';
import { applyCommand } from '../../src/sim/commands';
import { createGame, dispatch, replay, snapshotState } from '../../src/sim/game';
import { purchaseError } from '../../src/sim/purchase';
import { RULES } from '../../src/sim/rulesData';
import {
  type City,
  type GameState,
  SCHEMA_VERSION,
  claimWonder,
  playerById,
  wonderClaim,
} from '../../src/sim/state';
import { cardCityYields, liveCityEffects, liveEffects } from '../../src/sim/statecraft';
import { getTileAt } from '../../src/sim/map';
import { buildError } from '../../src/sim/tech';
import { emptyTurnReport } from '../../src/sim/turn';

/** The placeholder, named once so the tree pass has one line to change. */
const WONDER = 'theOracle' as const;
const REFUND_RATE = RULES.production.wonderRefundGoldPerHammer;

function game(seed = 11) {
  return createGame({
    seed,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e', isHuman: true },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  });
}

/** Hands a seat a technology, the way a completed research would. */
function learn(state: GameState, playerId: number, ...techs: string[]): void {
  const player = playerById(state, playerId)!;
  for (const tech of techs) {
    if (!player.techsResearched.includes(tech as never)) {
      player.techsResearched.push(tech as never);
    }
  }
}

/** A city for a player, on the tile one of their units is standing on. */
function found(state: GameState, playerId: number): City {
  const unit = state.units.find((u) => u.ownerId === playerId)!;
  return foundCityAt(state, playerId, getTileAt(state.map, unit.col, unit.row)!);
}

/** A town with the wonder at the front of its queue and the hammers for it. */
function racing(state: GameState, city: City, hammers = buildingDef(WONDER).cost): void {
  learn(state, city.ownerId, 'husbandry', 'divination');
  city.queue = [{ kind: 'building', id: WONDER }];
  city.hammerBasket = hammers;
}

// --- the roster -------------------------------------------------------------

describe('the wonder roster', () => {
  it('has exactly one row, and it says it is a placeholder', () => {
    expect(WONDER_IDS).toEqual([WONDER]);
    expect(buildingDef(WONDER).placeholder).toBe(true);
    // The flag is the only marker. Nothing anywhere compares an id against
    // "theOracle", which is what makes the tree pass a data change.
    expect(BUILDING_IDS.filter(isWonder)).toEqual([...WONDER_IDS]);
  });

  it('sorts a wonder into its own production category', () => {
    expect(queueCategory({ kind: 'building', id: WONDER })).toBe('wonder');
    expect(queueCategory({ kind: 'building', id: 'granary' })).toBe('building');
    expect(queueCategory({ kind: 'unit', id: 'warrior' })).toBe('unit');
    // A project names no category at all — Entry XXVI, unchanged.
    expect(queueCategory({ kind: 'project', id: 'tithes' })).toBeNull();
  });

  it('keeps a building bonus off a wonder', () => {
    const g = game();
    const city = found(g.state, 0);
    // A barracks-shaped percentage names `building`; the marble-shaped one that
    // names `wonder` does not exist yet, and that is the point of the category.
    city.buildings.push('barracks');
    const toward = productionModifiers(g.state, city, { kind: 'building', id: WONDER });
    expect(toward).toEqual([]);
  });
});

// --- the claim --------------------------------------------------------------

describe('claiming a wonder', () => {
  it('records who built it, where and when', () => {
    const g = game();
    const city = found(g.state, 0);
    racing(g.state, city);
    g.state.turn = 42;

    const done = settleProduction(g.state, city);
    expect(done?.name).toBe(buildingDef(WONDER).name);
    expect(city.buildings).toContain(WONDER);

    const claim = wonderClaim(g.state, WONDER);
    expect(claim).toEqual({
      building: WONDER,
      cityId: city.id,
      playerId: 0,
      turn: 42,
    });
    // The report the pipeline announces, and the shape a `triumphs` evaluator
    // will read for renown.
    expect(done?.wonder).toMatchObject({
      building: WONDER,
      cityId: city.id,
      playerId: 0,
      turn: 42,
      refunds: [],
    });
  });

  it('refuses a second copy in the same empire, naming the town building it', () => {
    const g = game();
    const first = found(g.state, 0);
    learn(g.state, 0, 'husbandry', 'divination');
    first.queue = [{ kind: 'building', id: WONDER }];

    // Asked on behalf of another town of the same empire: refused.
    const second = found(g.state, 0);
    expect(buildError(g.state, 0, 'building', WONDER, second)).toBe(
      `${first.name} is already building ${buildingDef(WONDER).name}`,
    );
    // Asked on behalf of the town that is legitimately building it: allowed —
    // otherwise re-sending a queue would refuse the queue it already holds.
    expect(buildError(g.state, 0, 'building', WONDER, first)).toBeNull();
  });

  it('refuses another empire once it stands, naming the city and the owner', () => {
    const g = game();
    const mine = found(g.state, 0);
    racing(g.state, mine);
    settleProduction(g.state, mine);

    learn(g.state, 1, 'husbandry', 'divination');
    expect(buildError(g.state, 1, 'building', WONDER)).toBe(
      `${buildingDef(WONDER).name} already stands in ${mine.name} (Ada)`,
    );
    // And the reducer refuses the queue with that same sentence.
    const theirs = found(g.state, 1);
    const result = applyCommand(g.state, {
      type: 'setCityProduction',
      playerId: 1,
      cityId: theirs.id,
      queue: [{ kind: 'building', id: WONDER }],
    });
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.error).toContain('already stands in');
  });

  it('is never for sale, in any bank', () => {
    const g = game();
    const city = found(g.state, 0);
    learn(g.state, 0, 'husbandry', 'divination');
    playerById(g.state, 0)!.gold = 100000;
    for (const currency of ['gold', 'faith'] as const) {
      expect(
        purchaseError(g.state, 0, city.id, { kind: 'building', id: WONDER }, currency),
      ).toBe(`${buildingDef(WONDER).name} is a wonder — it must be built, not bought`);
    }
    // An ordinary building is still for sale, so the refusal is about wonders
    // and not about buildings.
    expect(
      purchaseError(g.state, 0, city.id, { kind: 'building', id: 'shrine' }, 'gold'),
    ).toBeNull();
  });
});

// --- being beaten -----------------------------------------------------------

describe('being beaten to a wonder', () => {
  it('refunds the loser at the rule’s rate and empties the basket', () => {
    const g = game();
    const winner = found(g.state, 0);
    const loser = found(g.state, 1);
    racing(g.state, winner);
    racing(g.state, loser, 140);
    const before = playerById(g.state, 1)!.gold;

    const done = settleProduction(g.state, winner);

    expect(loser.queue).toEqual([]);
    expect(loser.hammerBasket).toBe(0);
    expect(playerById(g.state, 1)!.gold).toBe(before + Math.floor(140 * REFUND_RATE));
    expect(done?.wonder?.refunds).toEqual([
      {
        building: WONDER,
        cityId: loser.id,
        playerId: 1,
        hammers: 140,
        gold: Math.floor(140 * REFUND_RATE),
      },
    ]);
  });

  it('refunds nothing when the wonder was not the front of the queue', () => {
    const g = game();
    const winner = found(g.state, 0);
    const loser = found(g.state, 1);
    racing(g.state, winner);
    learn(g.state, 1, 'husbandry', 'divination');
    // The basket is toward the **warrior**, which is what the city is actually
    // paying for. Hammers behind another item are not hammers toward the wonder.
    loser.queue = [
      { kind: 'unit', id: 'warrior' },
      { kind: 'building', id: WONDER },
    ];
    loser.hammerBasket = 90;
    const before = playerById(g.state, 1)!.gold;

    const done = settleProduction(g.state, winner);

    expect(loser.queue).toEqual([{ kind: 'unit', id: 'warrior' }]);
    expect(loser.hammerBasket).toBe(90);
    expect(playerById(g.state, 1)!.gold).toBe(before);
    expect(done?.wonder?.refunds).toEqual([
      { building: WONDER, cityId: loser.id, playerId: 1, hammers: 0, gold: 0 },
    ]);
  });

  it('takes a queued-but-unstarted copy out of the winner’s own empire too', () => {
    const g = game();
    const winner = found(g.state, 0);
    const sibling = found(g.state, 0);
    racing(g.state, winner);
    sibling.queue = [{ kind: 'building', id: WONDER }];
    sibling.hammerBasket = 0;

    const done = settleProduction(g.state, winner);

    expect(sibling.queue).toEqual([]);
    expect(done?.wonder?.refunds.map((r) => r.cityId)).toEqual([sibling.id]);
    expect(done?.wonder?.refunds[0]?.gold).toBe(0);
  });

  it('settles a same-turn race by sweep order, and pays the later city back', () => {
    const g = game();
    const first = found(g.state, 0);
    const second = found(g.state, 1);
    racing(g.state, first, 200);
    racing(g.state, second, 200);
    // Both baskets cover it, both rows are at the front, and both cities resolve
    // inside one phase. `state.cities` order is founding order.
    expect(g.state.cities.map((c) => c.id)).toEqual([first.id, second.id]);

    const report = emptyTurnReport();
    advanceProduction(g.state, report);

    expect(first.buildings).toContain(WONDER);
    expect(second.buildings).not.toContain(WONDER);
    expect(g.state.wonders).toHaveLength(1);
    expect(g.state.wonders[0]!.cityId).toBe(first.id);
    // One completion, announced once, carrying the loser's refund.
    expect(report.wonders).toHaveLength(1);
    const [done] = report.wonders as [WonderCompletion];
    expect(done.refunds).toEqual([
      {
        building: WONDER,
        cityId: second.id,
        playerId: 1,
        hammers: 200,
        gold: Math.floor(200 * REFUND_RATE),
      },
    ]);
    expect(playerById(g.state, 1)!.gold).toBe(Math.floor(200 * REFUND_RATE));
  });
});

// --- what a wonder does -----------------------------------------------------

describe('a wonder’s effect is a card', () => {
  it('reads through liveCityEffects in the city it stands in, and only there', () => {
    const g = game();
    const home = found(g.state, 0);
    const other = found(g.state, 0);
    racing(g.state, home);
    settleProduction(g.state, home);

    // The empire's own walk carries it (it is `liveEffects`' fifth source), so
    // every city-scoped reader sees it — the scope is what decides where it
    // lands.
    expect(liveEffects(g.state, 0).some((entry) => entry.card === WONDER)).toBe(true);
    expect(liveCityEffects(g.state, home).some((entry) => entry.card === WONDER)).toBe(true);

    // The placeholder's clause is scoped `hasBuilding: theOracle`, so it pays
    // its own town and not the one next door.
    const here = cardCityYields(g.state, home).find((line) => line.card === WONDER);
    expect(here?.faith).toBe(1);
    expect(cardCityYields(g.state, other).some((line) => line.card === WONDER)).toBe(false);
  });

  it('pays every city when the clause names no scope', () => {
    const g = game();
    const home = found(g.state, 0);
    const other = found(g.state, 0);
    // The empire-wide reading, asserted on the mechanism rather than on a row
    // that does not exist yet: an unscoped clause is what a belief has, and a
    // wonder's is read by the same evaluator.
    const def = buildingDef(WONDER);
    const restore = def.effects;
    (def as { effects?: unknown }).effects = [{ kind: 'cityYields', culture: 2 }];
    try {
      racing(g.state, home);
      settleProduction(g.state, home);
      expect(cardCityYields(g.state, home).find((l) => l.card === WONDER)?.culture).toBe(2);
      expect(cardCityYields(g.state, other).find((l) => l.card === WONDER)?.culture).toBe(2);
    } finally {
      (def as { effects?: unknown }).effects = restore;
    }
  });

  it('follows the stones when a city changes hands', () => {
    const g = game();
    const home = found(g.state, 0);
    racing(g.state, home);
    settleProduction(g.state, home);

    home.ownerId = 1;
    // The claim is history and does not move; the effect does.
    expect(wonderClaim(g.state, WONDER)!.playerId).toBe(0);
    expect(liveEffects(g.state, 0).some((entry) => entry.card === WONDER)).toBe(false);
    expect(liveEffects(g.state, 1).some((entry) => entry.card === WONDER)).toBe(true);
  });
});

// --- the state --------------------------------------------------------------

describe('the claim register', () => {
  it('starts empty, serialises in claim order and round-trips', () => {
    const g = game();
    expect(g.state.wonders).toEqual([]);
    expect(g.state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(20);

    const city = found(g.state, 0);
    claimWonder(g.state, WONDER, city);
    const back = JSON.parse(snapshotState(g.state)) as GameState;
    expect(back.wonders).toEqual(g.state.wonders);
  });

  it('replays a claimed wonder byte for byte', () => {
    const g = createGame({
      seed: 4242,
      sizeName: 'duel',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    });
    const founder = g.state.units.find((unit) => unit.type === 'settler')!;
    expect(dispatch(g, { type: 'foundCity', playerId: 0, settlerUnitId: founder.id }).ok).toBe(
      true,
    );
    const capital = g.state.cities[0]!;

    // Driven **entirely by commands**, so the log is a save file: research the
    // two nodes, then queue the wonder and wait for the hammers. Everything a
    // reach into the state would grant is granted by the reducer instead.
    for (const tech of ['husbandry', 'divination'] as const) {
      expect(dispatch(g, { type: 'chooseResearch', playerId: 0, techId: tech }).ok).toBe(true);
      while (!g.state.players[0]!.techsResearched.includes(tech)) {
        expect(dispatch(g, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
      }
    }
    expect(
      dispatch(g, {
        type: 'setCityProduction',
        playerId: 0,
        cityId: capital.id,
        queue: [{ kind: 'building', id: WONDER }],
      }).ok,
    ).toBe(true);
    for (let turn = 0; turn < 120 && g.state.wonders.length === 0; turn++) {
      expect(dispatch(g, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
    }

    // The run actually built it.
    expect(g.state.wonders).toHaveLength(1);
    expect(capital.buildings).toContain(WONDER);
    expect(snapshotState(replay(g.config, g.log))).toBe(snapshotState(g.state));
  });
});
