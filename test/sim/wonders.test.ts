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
  emptyCityYields,
  foundCityAt,
  realiseItem,
  growthSurplus,
  productionModifiers,
  queueCategory,
  settleProduction,
} from '../../src/sim/cities';
import {
  BUILDING_IDS,
  type BuildingId,
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
  createUnit,
  playerById,
  wonderClaim,
} from '../../src/sim/state';
import {
  anyCardDef,
  cardCityYields,
  cardPurchaseRiders,
  cardRulePercent,
  cardTileLines,
  describeCard,
  liveCityEffects,
  liveEffects,
  scopedCardTileLines,
  stripRefs,
  tileConditionHolds,
} from '../../src/sim/statecraft';
import { FAMILIES } from '../../src/sim/greatPeopleData';
import { pantheonSlots, performRiteAt } from '../../src/sim/religion';
import { happinessOf } from '../../src/sim/meters';
import { previewCombat } from '../../src/sim/combat';
import { explainPurchaseCost } from '../../src/sim/purchase';
import { projectDef } from '../../src/sim/projectData';
import { unitDef } from '../../src/sim/unitData';
import { GOVERNMENT_IDS, governmentDef, poolDoctrines } from '../../src/sim/statecraftData';
import { findPath, moveProfile, reachableTiles, stepCost, zocField } from '../../src/sim/pathfind';
import { advanceAlongPath } from '../../src/sim/movement';
import { fullMovement } from '../../src/sim/units';
import { cityResources, claimTile, ownedTiles } from '../../src/sim/cities';
import { RESOURCE_IDS, resourceDef } from '../../src/sim/resourceData';
import { improvementForResource } from '../../src/sim/improvementData';

/** A combat forecast, or a loud failure. `previewCombat` answers one or a refusal. */
function forecastOf(state: GameState, attackerId: number, tile: { col: number; row: number }) {
  const preview = previewCombat(state, attackerId, { col: tile.col, row: tile.row });
  if (!preview.ok) throw new Error(`no forecast: ${preview.error}`);
  return preview;
}
import { type GameMap, getTile, mapNeighbors, tileHex } from '../../src/sim/map';
import { createCity } from '../../src/sim/state';
import { flatState, unit } from './zocHelpers';
import { TECH_IDS, techDef } from '../../src/sim/techData';
import { getTileAt } from '../../src/sim/map';
import { buildError } from '../../src/sim/tech';
import { emptyTurnReport } from '../../src/sim/turn';

/** The row every framework test is written against. */
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

/** A tile by coordinate. Throws rather than returning undefined into an expect. */
function at(map: GameMap, col: number, row: number) {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** A hex's neighbours as tiles — geometry asked of the map, never spelled out. */
function ring(map: GameMap, tile: { col: number; row: number }) {
  const around = [];
  for (const hex of mapNeighbors(map, tileHex(at(map, tile.col, tile.row)))) {
    const neighbour = getTile(map, hex);
    if (neighbour) around.push(neighbour);
  }
  return around;
}

/** A town with the wonder at the front of its queue and the hammers for it. */
function racing(state: GameState, city: City, hammers = buildingDef(WONDER).cost): void {
  learn(state, city.ownerId, 'husbandry', 'divination');
  city.queue = [{ kind: 'building', id: WONDER }];
  city.hammerBasket = hammers;
}

// --- the roster -------------------------------------------------------------

describe('the wonder roster', () => {
  it('is twenty-seven ratified rows and no placeholder left', () => {
    expect(WONDER_IDS).toHaveLength(27);
    expect(WONDER_IDS).toContain(WONDER);
    for (const id of WONDER_IDS) expect(buildingDef(id).placeholder, id).toBeUndefined();
    // The flag is the only marker. Nothing anywhere compares an id against a
    // wonder's name, which is what made the roster pass a data change.
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

// --- the ratified roster ----------------------------------------------------

/**
 * The twenty-seven rows of `docs/wonders.md`, homed on the tree as it stands.
 *
 * What is asserted here is the *data*, and it is asserted the way a designer
 * would check it: every row is a legal row, every row is homed exactly once,
 * every clause the vocabulary can say comes out as a sentence, and every clause
 * it cannot say is written down as a deferral rather than bent into a shape that
 * nearly fits. A wonder that quietly did nothing would pass every behavioural
 * test in this file and fail these.
 */
describe('the ratified roster', () => {
  it('gives every wonder a cost, a lump of renown and a family', () => {
    for (const id of WONDER_IDS) {
      const def = buildingDef(id);
      expect(def.name, id).toBeTruthy();
      expect(def.cost, id).toBeGreaterThan(0);
      expect(def.wonder, id).toBe(true);
      // The doc's ratified figure, and the reason a wonder is a feat: ten
      // renown on the turn it is finished, and a trickle thereafter.
      expect(def.renown?.onComplete, id).toBe(10);
      expect(def.renown?.perTurn, id).toBeGreaterThan(0);
      expect(FAMILIES).toContain(def.renown!.family);
    }
  });

  it('homes every wonder on exactly one technology that exists', () => {
    const homes = new Map<string, string[]>();
    for (const tech of TECH_IDS) {
      for (const id of techDef(tech).unlocks.buildings ?? []) {
        expect(BUILDING_IDS, `${tech} unlocks ${id}`).toContain(id);
        homes.set(id, [...(homes.get(id) ?? []), tech]);
      }
    }
    for (const id of WONDER_IDS) {
      expect(homes.get(id), id).toHaveLength(1);
    }
  });

  it('says every clause out loud, and never in an empty string', () => {
    for (const id of WONDER_IDS) {
      const def = buildingDef(id);
      const card = anyCardDef(id);
      // `anyCardDef` adapts the building row into the card shape, deferrals and
      // all — one lookup and one description for all seven classes.
      expect(card.name, id).toBe(def.name);
      expect(card.effects.length, id).toBe((def.effects ?? []).length);
      const clauses = describeCard(id);
      for (const clause of clauses) expect(clause.text, id).toBeTruthy();
      // Every row says *something*: an effect, or a stated deferral. A row that
      // said neither would be a wonder that does nothing at all.
      expect(clauses.length, id).toBeGreaterThan(0);
    }
  });

  it('defers, in words, exactly what the vocabulary cannot say', () => {
    // The four halves the pass could not build without bending a shape. They
    // are on the row and struck through on the card, which is the Statecraft
    // rule applied to a wonder.
    for (const id of ['statueOfZeus', 'terracottaArmy', 'alhambra', 'notreDame', 'forbiddenCity'] as const) {
      expect(buildingDef(id).deferred, id).toBeDefined();
      const struck = describeCard(id).filter((clause) => clause.deferred);
      expect(struck.length, id).toBeGreaterThan(0);
    }
    // Hagia Sophia's note is gone because the promise it apologised for is
    // kept: prophets exist (`docs/religion-v2.md`), so the row grants one
    // outright and presses for its owner's faith into the bargain.
    expect(buildingDef('hagiaSophia').note).toBeUndefined();
    expect(buildingDef('hagiaSophia').deferred).toBeUndefined();
    expect(buildingDef('hagiaSophia').onComplete?.[0]).toEqual({ grant: 'unit', unit: 'prophet' });
  });

  it('reads every shape the roster declares — the register', () => {
    // The shape register, `statecraft.test.ts`'s one scale over: a shape
    // declared and never used is a shape nobody has tested, and every one of
    // these is read by a consumer asserted further down this file.
    const used = new Set<string>();
    for (const id of WONDER_IDS) {
      for (const effect of buildingDef(id).effects ?? []) used.add(effect.kind);
    }
    for (const kind of [
      'pantheonSlots',
      'purchaseRider',
      'zocRule',
      'projectRider',
      'combatLine',
      'countScaled',
      'tileYield',
      'effectAmplifier',
      'rulePercent',
      'unitStat',
      'cityStat',
      'cityYields',
      'percentYields',
      'offerRider',
    ]) {
      expect(used.has(kind), kind).toBe(true);
    }
    // And the three fields that are not kinds. Each is read in exactly one
    // place, and each has a behavioural test below.
    expect(WONDER_IDS.some((id) => buildingDef(id).requiresSite !== undefined)).toBe(true);
    expect(WONDER_IDS.some((id) => buildingDef(id).onComplete !== undefined)).toBe(true);
    expect(
      WONDER_IDS.some((id) =>
        (buildingDef(id).effects ?? []).some(
          (effect) => effect.kind === 'tileYield' && effect.scope !== undefined,
        ),
      ),
    ).toBe(true);
  });
});

// --- what the new shapes do -------------------------------------------------

/** Raises a wonder in a town the way a completion does: the stones *and* the claim. */
function raise(state: GameState, city: City, id: BuildingId): void {
  city.buildings.push(id);
  claimWonder(state, id, city);
}

describe('a slot grant', () => {
  it('opens a pantheon slot beside the ones the tree opens', () => {
    const g = game();
    const city = found(g.state, 0);
    learn(g.state, 0, 'husbandry', 'divination');
    const bare = pantheonSlots(g.state, 0);
    expect(bare).toBeGreaterThan(0);

    raise(g.state, city, 'stonehenge');
    expect(pantheonSlots(g.state, 0)).toBe(bare + 1);
    // Two wonders that each grant one grant two: it is a fold, not a flag.
    raise(g.state, city, 'greatMosqueOfDjenne');
    expect(pantheonSlots(g.state, 0)).toBe(bare + 2);
    // And the neighbour's pantheon is untouched.
    expect(pantheonSlots(g.state, 1)).toBe(0);
  });
});

describe('a purchase rider', () => {
  it('takes a quarter off a religious unit, as a line of the price', () => {
    const g = game();
    const city = found(g.state, 0);
    learn(g.state, 0, 'husbandry', 'divination');
    const item = { kind: 'unit', id: 'augur' } as const;
    const full = explainPurchaseCost(g.state, 0, city.id, item, 'faith')!;

    raise(g.state, city, 'greatZiggurat');
    const cut = explainPurchaseCost(g.state, 0, city.id, item, 'faith')!;

    // One more line, carrying the difference, and the fold is still the price.
    expect(cut.lines).toHaveLength(full.lines.length + 1);
    expect(cut.total).toBe(Math.floor((full.total * 75) / 100));
    expect(cut.lines[cut.lines.length - 1]!.source).toContain('Great Ziggurat');
    expect(cut.lines.reduce((sum, line) => sum + line.amount, 0)).toBe(cut.total);
    // The filter is the roster's own marker, not a name: a warrior is not a
    // religious unit and its price is untouched.
    expect(cardPurchaseRiders(g.state, 0, 'unit', 'augur')).toHaveLength(1);
    expect(cardPurchaseRiders(g.state, 0, 'unit', 'warrior')).toHaveLength(0);
    // And `on` defaults to units: the Ziggurat says nothing about granaries.
    expect(cardPurchaseRiders(g.state, 0, 'building')).toHaveLength(0);
  });
});

describe('the Great Wall', () => {
  it('makes every owned hex hold ground, and both searches agree about it', () => {
    const state = flatState();
    // The town is far away, so that nothing here is locked by the *city*
    // source the field has always had: what is being tested is the border.
    const town = at(state.map, 9, 8);
    const theirs = createCity(state, 1, 'Wallstead', town.col, town.row);
    raise(state, theirs, 'greatWall');
    const heart = at(state.map, 3, 3);
    claimTile(state, theirs, heart);
    for (const tile of ring(state.map, heart)) claimTile(state, theirs, tile);

    const field = zocField(state, 0);
    expect(field.sources.some((s2) => s2.col === heart.col && s2.row === heart.row)).toBe(true);
    // A step from one hex of that border to the next stays alongside the same
    // owned hex, so it is a slide and it pays the toll — every hex of the
    // crossing, which is what makes a walled country slow rather than shut.
    const [from, along] = ring(state.map, heart);
    const walker = unit(state, from!, 'warrior', 0);
    const mover = moveProfile(state, walker);
    const inside = stepCost(state.map, from!, along!, mover, field)!;
    expect(inside.zoc).toBe(true);
    expect(inside.cost).toBe(1 + RULES.movement.zocExtraCost);
    // And the same board without the Wall tolls nothing at all.
    theirs.buildings = [];
    state.wonders = [];
    const open = stepCost(state.map, from!, along!, mover, zocField(state, 0))!;
    expect(open.zoc).toBe(false);
    expect(open.cost).toBe(1);
  });

  it('stops the highlight exactly where the walk stops', () => {
    const state = flatState();
    const town = at(state.map, 9, 8);
    const theirs = createCity(state, 1, 'Wallstead', town.col, town.row);
    raise(state, theirs, 'greatWall');
    const heart = at(state.map, 3, 3);
    claimTile(state, theirs, heart);
    for (const tile of ring(state.map, heart)) claimTile(state, theirs, tile);

    const [from, along] = ring(state.map, heart);
    const walker = unit(state, from!, 'warrior', 0);
    // The overlay and the reducer are two readers of one evaluator: the tolled
    // hex is reachable, at the ground's price plus the toll, and the path to it
    // is one step.
    const reach = reachableTiles(state, walker);
    const found2 = reach.find((entry) => entry.tile === along);
    expect(found2).toBeDefined();
    expect(found2!.cost).toBe(1 + RULES.movement.zocExtraCost);
    expect(findPath(state, walker, along!)).toHaveLength(1);
    // A two-point warrior spends its whole turn on one hex of a walled border,
    // and the walk agrees with the sweep about that.
    advanceAlongPath(state, walker, findPath(state, walker, along!)!);
    expect([walker.col, walker.row]).toEqual([along!.col, along!.row]);
    expect(walker.movesLeft).toBe(fullMovement(walker, state) - found2!.cost);
  });

  it('costs nothing at all in a world where nobody holds it', () => {
    const state = flatState();
    const home = at(state.map, 6, 4);
    const theirs = createCity(state, 1, 'Wallstead', home.col, home.row);
    for (const tile of ring(state.map, home)) claimTile(state, theirs, tile);
    // The town projects, as it always did; its borders do not.
    const field = zocField(state, 0);
    expect(field.sources).toHaveLength(1);
    expect(field.sources[0]).toMatchObject({ col: home.col, row: home.row });
  });
});

describe('a project rider', () => {
  it('adds beakers to one turn of Scholarship, and to no other project', () => {
    const g = game();
    const city = found(g.state, 0);
    learn(g.state, 0, 'earthenware', 'divination', 'letters', 'calendar');
    const player = playerById(g.state, 0)!;

    const scholarship = projectDef('scholarship').pays.science ?? 0;
    city.queue = [{ kind: 'project', id: 'scholarship' }];
    city.hammerBasket = projectDef('scholarship').cost;
    const before = player.sciencePool;
    settleProduction(g.state, city);
    expect(player.sciencePool - before).toBe(scholarship);

    raise(g.state, city, 'waterClockOfSuSong');
    city.hammerBasket = projectDef('scholarship').cost;
    const mid = player.sciencePool;
    settleProduction(g.state, city);
    expect(player.sciencePool - mid).toBe(scholarship + 3);

    // Tithes is another project and pays what it always paid.
    city.queue = [{ kind: 'project', id: 'tithes' }];
    city.hammerBasket = projectDef('tithes').cost;
    const gold = player.gold;
    settleProduction(g.state, city);
    expect(player.gold - gold).toBe(projectDef('tithes').pays.gold ?? 0);
  });
});

describe('a site requirement', () => {
  it('refuses a town without the ground, by naming the site', () => {
    const g = game();
    const city = found(g.state, 0);
    learn(g.state, 0, 'sailing', 'wayfinding');
    // A landlocked town cannot raise the Colossus, and is told what it wants.
    // The wonder moved to Wayfinding with the re-cut of 2026-09-02 — the sea's
    // node, which is where a coastal site belongs.
    const inland = getTileAt(g.state.map, city.col, city.row)!;
    inland.terrain = 'grassland';
    for (const tile of ring(g.state.map, inland)) tile.terrain = 'grassland';
    const refusal = buildError(g.state, 0, 'building', 'colossus', city);
    expect(refusal).toContain('wants a harbour');
    expect(refusal).toContain(city.name);
    // The reducer refuses the queue with the same sentence.
    const result = applyCommand(g.state, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: city.id,
      queue: [{ kind: 'building', id: 'colossus' }],
    });
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.error).toContain('wants a harbour');

    // Give it a coast and the refusal goes away — one evaluator, one answer.
    ring(g.state.map, inland)[0]!.terrain = 'coast';
    expect(buildError(g.state, 0, 'building', 'colossus', city)).toBeNull();
  });

  it('says nothing at all to a caller with no town in hand', () => {
    const g = game();
    learn(g.state, 0, 'sailing', 'wayfinding');
    // The tree's question — "could this empire ever build one" — is not the
    // queue's, and a site is a fact about a city.
    expect(buildError(g.state, 0, 'building', 'colossus')).toBeNull();
  });
});


describe('the new combat clauses', () => {
  it('pays a filtered line to the class it names and to nobody else', () => {
    const state = flatState();
    const home = at(state.map, 6, 4);
    const mine = createCity(state, 0, 'Granada', home.col, home.row);
    raise(state, mine, 'alhambra');

    const target = at(state.map, 2, 2);
    const prey = unit(state, target, 'warrior', 1);
    void prey;
    const from = ring(state.map, target)[0]!;
    const knight = unit(state, from, 'horseman', 0);
    const foot = unit(state, from, 'warrior', 0);

    const mounted = forecastOf(state, knight.id, target);
    expect(mounted.bonuses.some((line) => line.source.includes('Alhambra'))).toBe(true);
    const marching = forecastOf(state, foot.id, target);
    expect(marching.bonuses.some((line) => line.source.includes('Alhambra'))).toBe(false);
  });

  it('holds the capital’s own borders, and only those', () => {
    const state = flatState();
    const home = at(state.map, 6, 4);
    const capital = createCity(state, 0, 'Uruk', home.col, home.row);
    raise(state, capital, 'wallsOfUruk');
    const inside = ring(state.map, home)[0]!;
    claimTile(state, capital, inside);

    // A defender standing on the capital's ground carries the line…
    const defender = unit(state, inside, 'warrior', 0);
    void defender;
    const raider = unit(
      state,
      ring(state.map, inside).find((tile) => tile.col !== home.col || tile.row !== home.row)!,
      'warrior',
      1,
    );
    const held = forecastOf(state, raider.id, inside);
    expect(held.bonuses.some((line) => line.source.includes('Uruk'))).toBe(true);

    // …and one standing on ground nobody claimed does not.
    const outside = at(state.map, 1, 1);
    const stray = unit(state, outside, 'warrior', 0);
    void stray;
    const other = unit(state, ring(state.map, outside)[0]!, 'warrior', 1);
    const away = forecastOf(state, other.id, outside);
    expect(away.bonuses.some((line) => line.source.includes('Uruk'))).toBe(false);
  });

  it('pays a garrison for standing in the town it defends', () => {
    const state = flatState();
    const home = at(state.map, 6, 4);
    const mine = createCity(state, 0, 'Xianyang', home.col, home.row);
    raise(state, mine, 'terracottaArmy');
    const garrison = unit(state, home, 'spearman', 0);
    void garrison;
    const raider = unit(state, ring(state.map, home)[0]!, 'warrior', 1);

    // **Re-pinned, 2026-08-28.** A garrison is only *reachable* once the walls
    // are down (combat's three beats): while the town has hit points above the
    // floor an attack on that hex hits the city, which defends with
    // `cityBaseStrength` and carries none of a soldier's own lines. So the town
    // is beaten down first, and the Terracotta Army is then read where the ruling
    // says a garrison fights — in beat two.
    mine.hp = 1;

    const siege = forecastOf(state, raider.id, home);
    expect(siege.cityPhase).toBe('garrison');
    expect(siege.defenderUnitId).toBe(garrison.id);
    expect(siege.bonuses.some((line) => line.source.includes('Terracotta'))).toBe(true);
    // It is a *defender's* line: the same army attacking out of the town gets
    // nothing from it.
    const sally = forecastOf(state, garrison.id, ring(state.map, home)[0]!);
    expect(sally.bonuses.some((line) => line.source.includes('Terracotta'))).toBe(false);
  });
});

describe('the new counts', () => {
  it('counts buildings of one kind across the empire', () => {
    const g = game();
    const first = found(g.state, 0);
    const second = found(g.state, 0);
    raise(g.state, first, 'circusMaximus');
    const bare = happinessOf(g.state, 0);

    first.buildings.push('barracks');
    expect(happinessOf(g.state, 0)).toBe(bare + 1);
    second.buildings.push('barracks');
    expect(happinessOf(g.state, 0)).toBe(bare + 2);
    // A temple is not a barracks: the row names which building it counts.
    second.buildings.push('temple');
    expect(happinessOf(g.state, 0)).toBe(bare + 2);
  });

  it('counts every building in the town that holds the tomb', () => {
    const g = game();
    const city = found(g.state, 0);
    const other = found(g.state, 0);
    raise(g.state, city, 'mausoleum');

    const line = () => cardCityYields(g.state, city).find((l) => l.card === 'mausoleum')?.gold ?? 0;
    // The Mausoleum counts itself, because a wonder is a building.
    const withTomb = line();
    expect(withTomb).toBeGreaterThan(0);
    city.buildings.push('granary');
    expect(line()).toBe(withTomb + 1);
    // The town next door has the tomb's empire but not its stones.
    expect(cardCityYields(g.state, other).find((l) => l.card === 'mausoleum')).toBeUndefined();
  });

  it('counts a town’s own improved bonus seams when the line says “in this city”', () => {
    const g = game();
    const city = found(g.state, 0);
    const other = found(g.state, 1);
    raise(g.state, city, 'templeOfArtemis');
    const bare = happinessOf(g.state, 0);

    // A seam the town does not already hold, chosen off the table rather than
    // written here: the count is of *kinds*, and a capital planted on wheat
    // already holds wheat, so a hard-coded one would be a test that measures
    // where the start scorer put the settler.
    const already = new Set(cityResources(g.state, city, 'bonus'));
    const fresh = RESOURCE_IDS.filter(
      (id) => resourceDef(id).kind === 'bonus' && !already.has(id) && improvementForResource(id),
    )[0]!;
    const mine = ownedTiles(g.state, city).find(
      (tile) => tile.col !== city.col || tile.row !== city.row,
    )!;
    mine.resource = fresh;
    mine.improvement = improvementForResource(fresh)!;
    expect(happinessOf(g.state, 0)).toBe(bare + 1);

    // …and one in somebody else's, which is not this city's ground and pays
    // this city nothing.
    const theirsKind = RESOURCE_IDS.filter(
      (id) =>
        resourceDef(id).kind === 'bonus' &&
        id !== fresh &&
        !already.has(id) &&
        improvementForResource(id),
    )[0]!;
    const theirs = ownedTiles(g.state, other).find(
      (tile) => tile.col !== other.col || tile.row !== other.row,
    )!;
    theirs.resource = theirsKind;
    theirs.improvement = improvementForResource(theirsKind)!;
    expect(happinessOf(g.state, 0)).toBe(bare + 1);
  });

  it('counts a town’s worked tiles, two to the point', () => {
    const g = game();
    const city = found(g.state, 0);
    raise(g.state, city, 'angkorWat');
    const faith = () => cardCityYields(g.state, city).find((l) => l.card === 'angkorWat')?.faith ?? 0;

    city.workedTiles = [];
    expect(faith()).toBe(0);
    city.workedTiles = [{ col: city.col, row: city.row }];
    expect(faith()).toBe(0);
    city.workedTiles = [
      { col: city.col, row: city.row },
      { col: city.col, row: city.row },
    ];
    expect(faith()).toBe(1);
  });
});

describe('a scoped tile line', () => {
  it('lands on the ground of the town that holds the wonder, and nowhere else', () => {
    const g = game();
    const city = found(g.state, 0);
    const other = found(g.state, 0);
    raise(g.state, city, 'hangingGardens');

    const here = scopedCardTileLines(g.state, city);
    expect(here.some((line) => line.source.includes('Hanging Gardens'))).toBe(true);
    expect(scopedCardTileLines(g.state, other)).toHaveLength(0);
    // And the empire-wide pass leaves it out entirely — a scope is a question
    // about a city, and that pass has none.
    expect(cardTileLines(g.state, 0).some((line) => line.source.includes('Hanging Gardens'))).toBe(
      false,
    );

    // The condition is a farm *beside fresh water*, which is two questions
    // about one hex.
    const tile = getTileAt(g.state.map, city.col, city.row)!;
    const line = here[0]!;
    tile.improvement = 'farm';
    tile.freshwater = false;
    expect(tileConditionHolds(tile, line.on)).toBe(false);
    tile.freshwater = true;
    expect(tileConditionHolds(tile, line.on)).toBe(true);
    tile.improvement = undefined;
    expect(tileConditionHolds(tile, line.on)).toBe(false);
  });

  it('names a resource by name, for the standing stones', () => {
    const g = game();
    const city = found(g.state, 0);
    raise(g.state, city, 'stonehenge');
    const line = cardTileLines(g.state, 0).find((l) => l.source.includes('Stonehenge'))!;
    expect(line.faith).toBe(1);

    const tile = getTileAt(g.state.map, city.col, city.row)!;
    tile.resource = 'stone';
    expect(tileConditionHolds(tile, line.on)).toBe(true);
    tile.resource = 'marble';
    expect(tileConditionHolds(tile, line.on)).toBe(true);
    tile.resource = 'wheat';
    expect(tileConditionHolds(tile, line.on)).toBe(false);
  });
});

describe('the growth channel', () => {
  it('adds a quarter to what a town banks, summed with the meters', () => {
    const g = game();
    const city = found(g.state, 0);
    // The town drinks, so the wonder's quarter is the whole of what is on the
    // channel: a town off fresh water carries the dry-settle line as well
    // (`explainGrowthPercent`, 2026-09-03), and that is another test's subject.
    getTileAt(g.state.map, city.col, city.row)!.freshwater = true;
    const yields = { ...emptyCityYields(), food: 10 };
    const bare = growthSurplus(g.state, city, yields);
    expect(bare).toBeGreaterThan(0);

    raise(g.state, city, 'hangingGardens');
    expect(growthSurplus(g.state, city, yields)).toBe(Math.floor(bare * 1.25));
  });
});

// --- an ordinary building's effects -----------------------------------------

/**
 * `BuildingDef.effects` said the day would come — "the day an ordinary building
 * wants a card effect it fills this in, and the evaluator will not notice the
 * difference" — and until the aqueduct wanted one (user, 2026-08-27: "change
 * aqueduct: +15% surplus growth in city") the promise was half true: a row could
 * carry effects and the only reader, `liveEffects`' wonder source, was gated on
 * `isWonder`.
 *
 * The half that had to be decided rather than lifted is **scope**. A wonder is
 * one per world and belongs to the empire's walk; a granary stands in every town
 * that built one, so an ordinary row's effects are a source of `liveCityEffects`
 * and of nothing else. These two tests are that sentence in both directions.
 */
describe('an ordinary building carries card effects, in its own town only', () => {
  it('pays the town it stands in', () => {
    const g = game();
    const city = found(g.state, 0);
    // Watered by the ground, so what is measured here is the row's own +15% and
    // not the dry-settle line the aqueduct also lifts (`explainGrowthPercent`;
    // that half is pinned in `test/sim/cities.test.ts`).
    getTileAt(g.state.map, city.col, city.row)!.freshwater = true;
    const yields = { ...emptyCityYields(), food: 10 };
    const bare = growthSurplus(g.state, city, yields);

    city.buildings.push('aqueduct');
    expect(growthSurplus(g.state, city, yields)).toBe(Math.floor(bare * 1.15));
    // And it is an ordinary line of the ordinary ledger, labelled by its class.
    const line = cardRulePercent(g.state, 0, 'growthSurplus', city).find(
      (entry) => entry.card === 'aqueduct',
    );
    expect(line?.percent).toBe(15);
    expect(line?.source).toBe('Building · Aqueduct');
  });

  it('pays no other town, and nothing empire-wide', () => {
    const g = game();
    const city = found(g.state, 0);
    const other = foundCityAt(g.state, 0, at(g.state.map, city.col + 4, city.row));
    const yields = { ...emptyCityYields(), food: 10 };
    const bare = growthSurplus(g.state, other, yields);

    city.buildings.push('aqueduct');
    expect(growthSurplus(g.state, other, yields)).toBe(bare);
    expect(cardRulePercent(g.state, 0, 'growthSurplus', other)).toHaveLength(0);
    // The empire's own walk never sees it: `liveEffects` is the law, and a
    // building is not law.
    expect(cardRulePercent(g.state, 0, 'growthSurplus')).toHaveLength(0);
    expect(liveEffects(g.state, 0).some((e) => e.card === 'aqueduct')).toBe(false);
    expect(liveCityEffects(g.state, city).some((e) => e.card === 'aqueduct')).toBe(true);
  });

  it('does not read a wonder twice, from the empire and from its own town', () => {
    // The one thing the new source could get wrong: a wonder arrives through
    // `liveEffects` already, so counting it again here would pay it double in
    // the city it stands in.
    const g = game();
    const city = found(g.state, 0);
    raise(g.state, city, 'hangingGardens');
    const lines = cardRulePercent(g.state, 0, 'growthSurplus', city).filter(
      (entry) => entry.card === 'hangingGardens',
    );
    expect(lines).toHaveLength(1);
  });
});

describe('a rite lasts longer under the observatory', () => {
  it('lengthens the stamp, and never becomes a countdown', () => {
    const g = game();
    learn(g.state, 0, 'husbandry', 'divination', 'earthenware', 'letters');
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;

    const plain = createUnit(g.state, 0, 'augur', city.col, city.row);
    const first = performRiteAt(g.state, player, plain, 'omenReading');
    const bare = first.expiresTurn! - g.state.turn;
    expect(bare).toBeGreaterThan(0);
    delete city.timed;

    raise(g.state, city, 'chichenItza');
    const blessed = createUnit(g.state, 0, 'augur', city.col, city.row);
    const second = performRiteAt(g.state, player, blessed, 'omenReading');
    expect(second.expiresTurn! - g.state.turn).toBe(Math.floor((bare * 150) / 100));
    // Still an absolute turn nobody ticks: losing the wonder cannot shorten a
    // blessing already stamped.
    const stamped = second.expiresTurn!;
    city.buildings = city.buildings.filter((id) => id !== 'chichenItza');
    expect(city.timed!.every((entry) => entry.expiresTurn === stamped)).toBe(true);
  });
});

// --- what a completion hands over -------------------------------------------

/** Finishes `id` in `city` the way the phase does, and answers the completion. */
function finish(state: GameState, city: City, id: BuildingId) {
  city.queue = [{ kind: 'building', id }];
  city.hammerBasket = buildingDef(id).cost;
  return settleProduction(state, city);
}

describe('a completion grant', () => {
  it('raises a building through `realiseItem`, and never a second copy', () => {
    // `CompletionGrant`'s fourth arm (the tree re-cut of 2026-09-02): the
    // Theatre of Dionysus builds the Amphitheater it is named for. It goes
    // through `realiseItem` — the one seam that means "this town now has the
    // thing" — so the granted row pays its renown and joins the list exactly as
    // a built one does, and a town that already holds it gets nothing rather
    // than a second copy.
    const g = game();
    const city = found(g.state, 0);
    learn(g.state, 0, 'letters', 'epicPoetry');
    expect(city.buildings).not.toContain('amphitheater');

    const done = finish(g.state, city, 'theatreOfDionysus');
    const raised = done!.grants!.find((one) => one.grant === 'building')!;
    expect(raised).toEqual({ grant: 'building', name: 'Amphitheater', done: true });
    expect(city.buildings).toContain('amphitheater');
    // Once, and once only — the town holds one of each row.
    expect(city.buildings.filter((id) => id === 'amphitheater')).toHaveLength(1);

    // And a town that already has one is told so rather than given a second.
    const other = foundCityAt(g.state, 0, at(g.state.map, city.col + 4, city.row));
    other.buildings.push('amphitheater');
    const again = realiseItem(g.state, other, { kind: 'building', id: 'theatreOfDionysus' });
    expect(again.grants).toContainEqual({
      grant: 'building',
      name: 'Amphitheater',
      done: false,
    });
    expect(other.buildings.filter((id) => id === 'amphitheater')).toHaveLength(1);
  });

  it('calls the best melee unit the empire can build, through the ordinary spawn', () => {
    const g = game();
    const city = found(g.state, 0);
    learn(g.state, 0, 'stonecraft', 'bronzeWorking', 'ironWorking');
    const before = g.state.units.length;

    const done = finish(g.state, city, 'statueOfZeus');
    expect(done?.grants).toHaveLength(1);
    const [grant] = done!.grants!;
    // The Spear Wall, not the legionary — and that is the rule working rather than
    // a weak answer: "can build" is `buildError`'s whole question, and this seat
    // holds Iron Working but no improved iron. So the free sword obeys the
    // resource gate exactly as a built one does, read off the roster and never
    // named on the row. (It was the spearman before the re-cut of 2026-09-02
    // put the Spear Wall on this node; what is on trial is the gate, not the name.)
    expect(grant).toMatchObject({ grant: 'unit', name: unitDef('spearWall').name, done: true });
    expect(g.state.units).toHaveLength(before + 1);
    const born = g.state.units.find((u) => u.id === grant!.unitId)!;
    expect(born.type).toBe('spearWall');
    expect(born.ownerId).toBe(0);
    // Born like a built one: it can act on the turn it arrived.
    expect(born.movesLeft).toBe(fullMovement(born, g.state));
  });

  it('finishes the technology the seat is aiming at, and re-seats every town', () => {
    const g = game();
    const city = found(g.state, 0);
    learn(g.state, 0, 'earthenware', 'divination', 'letters', 'philosophy');
    const player = playerById(g.state, 0)!;
    player.researching = 'mathematics';
    player.sciencePool = 0;

    const done = finish(g.state, city, 'greatLibrary');
    expect(done?.grants?.[0]).toMatchObject({
      grant: 'tech',
      name: techDef('mathematics').name,
      done: true,
    });
    expect(player.techsResearched).toContain('mathematics');
    // Through `settleResearch` and nothing else: the aim is cleared and the
    // pool keeps its (zero) overflow, exactly as a turn's beakers would leave it.
    expect(player.researching).toBeNull();
    expect(player.sciencePool).toBe(0);
  });

  it('loses the technology when the seat is aiming at nothing, and says so', () => {
    const g = game();
    const city = found(g.state, 0);
    learn(g.state, 0, 'earthenware', 'divination', 'letters', 'philosophy');
    playerById(g.state, 0)!.researching = null;

    const done = finish(g.state, city, 'greatLibrary');
    expect(done?.grants?.[0]).toMatchObject({ grant: 'tech', done: false });
  });

  it('opens a Doctrine draft, and never a second on top of one already owed', () => {
    const g = game();
    const city = found(g.state, 0);
    const player = playerById(g.state, 0)!;
    learn(g.state, 0, 'earthenware', 'divination', 'letters', 'stonecraft', 'currency', 'philosophy', 'drama');
    // The chiefdom deals nothing — a tier with no live pool is skipped rather
    // than dealt an empty hand.
    expect(finish(g.state, city, 'theatreOfDionysus')?.grants?.[0]).toMatchObject({
      grant: 'doctrineDraft',
      done: false,
    });
    expect(player.statecraft.pendingDoctrine).toBeUndefined();

    // Under a government with a pool it deals one…
    const tiered = GOVERNMENT_IDS.find((id) => poolDoctrines(governmentDef(id).tier).length > 0)!;
    player.statecraft.government = tiered;
    city.buildings = city.buildings.filter((id) => id !== 'theatreOfDionysus');
    g.state.wonders = [];
    expect(finish(g.state, city, 'theatreOfDionysus')?.grants?.[0]).toMatchObject({
      grant: 'doctrineDraft',
      done: true,
    });
    expect(player.statecraft.pendingDoctrine).toBeDefined();
    const dealt = player.statecraft.pendingDoctrine;

    // …and a second wonder finishing while it is unanswered leaves it alone.
    const other = found(g.state, 0);
    other.buildings.push('hagiaSophia');
    const second = finish(g.state, other, 'houseOfWisdom');
    void second;
    expect(player.statecraft.pendingDoctrine).toBe(dealt);
  });

  it('rides out through the report and the command result', () => {
    const g = game();
    const city = found(g.state, 0);
    learn(g.state, 0, 'stonecraft', 'bronzeWorking', 'ironWorking');
    city.queue = [{ kind: 'building', id: 'statueOfZeus' }];
    city.hammerBasket = buildingDef('statueOfZeus').cost;

    const report = emptyTurnReport();
    advanceProduction(g.state, report);
    expect(report.grants).toHaveLength(1);
    expect(report.grants[0]).toMatchObject({ grant: 'unit', done: true });
  });
});

// --- the words ---------------------------------------------------------------

describe('a wonder in words', () => {
  it('gives an ordinary building its article and a wonder its name', () => {
    // "an Amphitheater", not "a Amphitheater" — a sound rule, in one place. The
    // Theatre's own clause became a count with the re-cut of 2026-09-02 (+1
    // happiness per Amphitheater held); the Great Library below still carries
    // the scoped shape, so both readings of the article are still on trial.
    expect(describeCard('theatreOfDionysus').map((c) => stripRefs(c.text))).toContain(
      '+1 happiness per Amphitheater',
    );
    expect(describeCard('greatLibrary').map((c) => stripRefs(c.text))).toContain(
      '+1 science in every city with a Library',
    );
    // A wonder is a proper noun: there is exactly one of it, so it takes no
    // article at all.
    expect(describeCard('theOracle').map((c) => stripRefs(c.text))).toContain(
      '+1 faith in every city with The Oracle',
    );
  });

  it('prints a completion grant, which is not an effect', () => {
    expect(describeCard('statueOfZeus').map((c) => c.text)).toContain(
      'on completion, the best melee unit you can build joins you',
    );
    expect(describeCard('greatLibrary').map((c) => c.text)).toContain(
      'on completion, the technology you are researching is finished',
    );
    expect(describeCard('theatreOfDionysus').map((c) => c.text)).toContain(
      'on completion, a Doctrine draft opens',
    );
  });

  it('prints the two meter fields, which are not effects either', () => {
    // The Forbidden City's whole sentence is five points of writ and Circus
    // Maximus keeps four of its five points of cheer on the row rather than in
    // `effects` — both are `BuildingDef` fields read by `buildingEffects.ts`,
    // and a card built out of `def.effects` alone printed neither. Said in the
    // meters' own words, the same two `describeEffect` arms use for a card.
    expect(describeCard('forbiddenCity').map((c) => c.text)).toContain('+5 authority capacity');
    expect(describeCard('circusMaximus').map((c) => c.text)).toContain('+4 happiness');
    // And a row with neither field says neither thing — the clause is the
    // presence of the number, never a zero printed for completeness.
    expect(describeCard('theOracle').map((c) => c.text.includes('authority'))).not.toContain(true);
    expect(describeCard('theOracle').map((c) => c.text.includes('happiness'))).not.toContain(true);
  });

  it('names who a filtered combat line is for, and whose ground a tile line is on', () => {
    expect(describeCard('alhambra').map((c) => c.text)).toContain(
      '+2 combat strength for mounted units',
    );
    expect(describeCard('petra').map((c) => stripRefs(c.text))).toContain(
      '+1 food, +1 production on every desert hex, in every city with Petra',
    );
  });
});

describe('the lighthouse’s embarked movement', () => {
  it('pays a piece at sea and not one ashore', () => {
    const state = flatState();
    const home = at(state.map, 6, 4);
    const city = createCity(state, 0, 'Pharos', home.col, home.row);
    raise(state, city, 'greatLighthouse');

    const ashore = unit(state, at(state.map, 2, 2), 'worker', 0);
    const base = unitDef('worker').movement;
    expect(fullMovement(ashore, state)).toBe(base);

    // The same piece standing on water — which for a piece on the board at all
    // means it embarked to get there.
    at(state.map, 2, 2).terrain = 'coast';
    expect(fullMovement(ashore, state)).toBe(base + 1);
  });
});
