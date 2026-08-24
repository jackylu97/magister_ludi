import { describe, expect, it } from 'vitest';

import { buildingDef } from '../src/sim/buildingData';
import { type Command, applyCommand } from '../src/sim/commands';
import {
  cityResources,
  cityStageSums,
  cityTile,
  cityYieldPercents,
  cityYields,
  borderGrowth,
  foundCityAt,
  growthSurplus,
  modifierPercent,
  productionModifiers,
  stageSumsFor,
  unitProductionCost,
} from '../src/sim/cities';
import { computeFreshwater } from '../src/sim/water';
import { chopYield, improvementForResource } from '../src/sim/improvementData';
import {
  type GameMap,
  type Tile,
  createMap,
  getTileAt,
  mapRange,
  tileHex,
  tileIndex,
} from '../src/sim/map';
import {
  type MeterEffect,
  type ModifiedYield,
  authorityOf,
  borderPercent,
  growthFactor,
  growthPercent,
  happinessOf,
  meterEffects,
  tierPercent,
  yieldFactor,
} from '../src/sim/meters';
import {
  MODIFIER_STAGES,
  NO_STAGES,
  STAGE_LABEL,
  applyStages,
  foldStages,
  stageFactor,
  stagesAreIdle,
  withStage,
} from '../src/sim/modifiers';
import {
  CITY_YIELD_KEYS,
  type ResourceEffect,
  type ResourceId,
  resourceEffects,
  resourcesOfKind,
} from '../src/sim/resourceData';
import { RULES } from '../src/sim/rulesData';
import {
  type City,
  type GameState,
  type QueueItem,
  createUnit,
  newGame,
} from '../src/sim/state';
import { TECH_IDS } from '../src/sim/techData';
import { resetVisibility } from '../src/sim/visibility';

/**
 * Entry XVII (the modifier doctrine) and Entry XVIII.5 (windfalls are
 * modifier-immune), asserted against each other in one file — because they are
 * two halves of the same question. XVII says exactly how a recurring yield meets
 * a percentage; XVIII.5 says a one-time grant never meets one at all, and the
 * only way to be sure of the second is to prove it in a city where the first is
 * demonstrably biting.
 *
 * The arithmetic claims are made twice on purpose: once against the pure helper
 * (`modifiers.ts`), where a base of 100 makes 21 points visibly different from
 * 20, and once end to end through `cityYields`, where the same numbers have to
 * come out of a real board with real buildings and a real meter tier. The first
 * proves the rule; the second proves the pipeline is wired to it.
 */

/** The three yields a meter tier can touch. The whole of the global stage today. */
const MODIFIED_YIELDS: readonly ModifiedYield[] = ['production', 'science', 'culture'];

const UNIT: QueueItem = { kind: 'unit', id: 'warrior' };
const BUILDING: QueueItem = { kind: 'building', id: 'granary' };

/** A blank grassland rectangle, every tech in hand, nothing standing on it. */
function bareState(width = 16, height = 12): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  for (const player of state.players) player.techsResearched = [...TECH_IDS];
  computeFreshwater(state.map);
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** Hands a city every tile in its work radius, so a seam has somewhere to go. */
function growTerritory(state: GameState, city: City): void {
  for (const tile of mapRange(
    state.map,
    tileHex(cityTile(state.map, city)),
    RULES.cities.workRadius,
  )) {
    state.tileOwner[tileIndex(state.map, tile.col, tile.row)] = city.id;
  }
}

/**
 * Puts an improved seam of `id` on a tile this city owns — the improvement the
 * data says opens it, so a luxury moved from the plantation to the quarry needs
 * no edit here.
 */
function plant(state: GameState, city: City, col: number, row: number, id: ResourceId): Tile {
  const tile = at(state.map, col, row);
  tile.resource = id;
  tile.improvement = improvementForResource(id)!;
  expect(cityResources(state, city, 'luxury')).toContain(id);
  return tile;
}

/**
 * The first plantable luxury with an effect of this shape — asserted against the
 * table rather than against a named row, so moving silk's tier to another luxury
 * does not fail this suite.
 */
function plantableWith<K extends ResourceEffect['kind']>(
  kind: K,
  where: (effect: Extract<ResourceEffect, { kind: K }>) => boolean = () => true,
): { id: ResourceId; effect: Extract<ResourceEffect, { kind: K }> } | undefined {
  for (const id of resourcesOfKind('luxury')) {
    if (improvementForResource(id) === null) continue;
    for (const effect of resourceEffects(id)) {
      if (effect.kind !== kind) continue;
      const narrowed = effect as Extract<ResourceEffect, { kind: K }>;
      if (where(narrowed)) return { id, effect: narrowed };
    }
  }
  return undefined;
}

/** One line of a staged list, for the arithmetic tests. */
function line(stage: 'city' | 'empire', percent: number): { stage: 'city' | 'empire'; percent: number } {
  return { stage, percent };
}

// ---------------------------------------------------------------------------

describe('Entry XVII: the two stages, as arithmetic', () => {
  it('is multiplicative across the stages: +10% city and +10% global is ×1.21', () => {
    // The doctrine's own worked example, and the whole reason the single pool
    // was split: 21 points of base, not 20. A global modifier is worth more in a
    // well-built city, which is what makes it a *late* effect worth spending an
    // age on rather than a flat tax rebate.
    const sums = foldStages([line('city', 10), line('empire', 10)]);
    expect(sums).toEqual({ city: 10, empire: 10 });
    expect(applyStages(100, sums)).toBe(121);
    expect(applyStages(100, sums)).toBeGreaterThan(applyStages(100, { city: 20, empire: 0 }));
    expect(stageFactor(sums)).toBeCloseTo(1.21, 10);
  });

  it('is additive within a stage: +10% and +15% in the same city is +25%', () => {
    // Never 1.10 × 1.15 = ×1.265, which is the reading the ledger rejects: no
    // source is privileged inside a stage, and two bonuses a player can read off
    // two building cards must add up the way they look like they add up.
    const sums = foldStages([line('city', 10), line('city', 15)]);
    expect(sums).toEqual({ city: 25, empire: 0 });
    expect(applyStages(100, sums)).toBe(125);
    expect(applyStages(100, sums)).not.toBe(Math.floor(100 * 1.1 * 1.15));
  });

  it('floors once, at the very end, and never twice', () => {
    // 15 hammers under +10% city and +10% global is 18.15 — eighteen. Rounding
    // the city stage first would bank 17, which is the whole of what "floored
    // once at the very end" buys, and it is a hammer a player would never find.
    const sums = { city: 10, empire: 10 };
    expect(applyStages(15, sums)).toBe(18);
    expect(Math.floor(Math.floor(15 * 1.1) * 1.1)).toBe(17);

    // And the arithmetic is exact where a float multiplication is not. Marble's
    // +15% on a base of 100 is 115 hammers; built as `base * (1 + 15/100)` it is
    // 114.99999999999999 in IEEE doubles and floors to 114, eating a hammer
    // nobody could account for. Multiplying in whole points and dividing once
    // returns the exact quotient whenever the true answer is a whole number —
    // which is what makes "floored once at the very end" true rather than nearly
    // true. No city today makes a hundred hammers, so this is a guarantee about
    // the pipeline rather than a bug that was biting.
    expect(applyStages(100, { city: 15, empire: 0 })).toBe(115);
    expect(Math.floor(100 * (1 + 15 / 100))).toBe(114);
  });

  it('nets to nothing when two global tiers offset, and leaves the base whole', () => {
    const sums = foldStages([line('empire', 10), line('empire', -10)]);
    expect(sums).toEqual({ city: 0, empire: 0 });
    expect(stagesAreIdle(sums)).toBe(true);
    for (const base of [1, 3, 7, 12, 41]) expect(applyStages(base, sums)).toBe(base);
    // The reading the ledger asked for in so many words: +10% and −10% have to
    // read as nothing at all, which they do not if they are compounded.
    expect(applyStages(41, sums)).not.toBe(Math.floor(41 * 1.1 * 0.9));
  });

  it('leaves a yield with only global percents exactly where the single pool left it', () => {
    // The regression guard on the split: for every yield nothing local touches —
    // which is most of them, most of the game — the staged pipeline must return
    // the same number the one-pool pipeline did, or the split would be a stealth
    // rebalance rather than a doctrine.
    for (const percent of [-20, -10, 5, 10, 15, 25]) {
      for (const base of [0, 1, 3, 7, 13, 20, 41, 137]) {
        const staged = applyStages(base, { city: 0, empire: percent });
        expect(staged).toBe(Math.floor((base * (100 + percent)) / 100));
      }
    }
  });

  it('is the identity when nothing is modifying the yield', () => {
    expect(stagesAreIdle(NO_STAGES)).toBe(true);
    expect(applyStages(7, NO_STAGES)).toBe(7);
    expect(stageFactor(NO_STAGES)).toBe(1);
    // `withStage` is how a percentage computed beside the list joins it — the
    // hammers behind a build — and it never mutates what it is given.
    const sums = withStage(NO_STAGES, 'city', 10);
    expect(sums).toEqual({ city: 10, empire: 0 });
    expect(NO_STAGES).toEqual({ city: 0, empire: 0 });
    expect(withStage(sums, 'empire', 0)).toBe(sums);
  });

  it('prints the two stages in the order they apply', () => {
    // Rule 6: the reader sees flats, the city multiplier, the global multiplier,
    // in that order. The panel walks `MODIFIER_STAGES`, so the order is asserted
    // here rather than in the DOM.
    expect(MODIFIER_STAGES).toEqual(['city', 'empire']);
    expect(STAGE_LABEL.city).toBe('City bonuses');
    expect(STAGE_LABEL.empire).toBe('Empire');
  });
});

// ---------------------------------------------------------------------------

describe('Entry XVII: the two stages, through the yield pipeline', () => {
  /**
   * A capital with a barracks, a warrior at the front of the queue, and a writ
   * in surplus — the smallest board on which *both* stages bite at once: the
   * barracks is city-stage (it is a fact about this town's build), the writ's
   * tier is global-stage (it is the empire's mood).
   */
  function bothStages(): { state: GameState; city: City } {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state.map, 5, 5));
    city.population = 4;
    city.buildings = ['barracks'];
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    return { state, city };
  }

  it('sums the buildings into the city stage and the meters into the global one', () => {
    const { state, city } = bothStages();
    expect(authorityOf(state, 0)).toBeGreaterThan(0);
    const writ = tierPercent(authorityOf(state, 0));
    expect(writ).toBeGreaterThan(0);

    const sums = cityStageSums(state, city, UNIT);
    expect(sums.production.city).toBe(buildingDef('barracks').productionBonus!.percent);
    expect(sums.production.empire).toBe(writ);

    // Both stages, on a base of a hundred: the doctrine's example reached
    // through the real classification rather than a hand-built list.
    const staged = applyStages(100, sums.production);
    expect(staged).toBe(Math.floor((100 * (100 + sums.production.city) * (100 + writ)) / 10_000));
    expect(staged).toBeGreaterThan(applyStages(100, { city: 0, empire: sums.production.city + writ }));
  });

  it('is what cityYields actually multiplies by — no second implementation', () => {
    const { state, city } = bothStages();
    const sums = cityStageSums(state, city, UNIT);

    // The base is the same city asked with both stages emptied: no meter tier
    // reaches a city whose empire has no cities, so it is rebuilt rather than
    // faked. What matters is the relation, which is exact.
    const rate = cityYields(state, city, [], UNIT).production;
    const flat = cityYields(state, city, [], BUILDING).production;
    expect(flat).toBeGreaterThan(0);

    // A granary at the front collects no barracks bonus, so the difference
    // between the two is exactly the city stage — through the same fold.
    const base = applyStages(flat, { city: 0, empire: 0 });
    expect(flat).toBe(applyStages(base, { city: 0, empire: 0 }));
    expect(rate).toBeGreaterThanOrEqual(flat);
    expect(rate).toBe(Math.floor(rate));

    // And the panel's own figures are this same fold, not a second one.
    const hammers = modifierPercent(productionModifiers(state, city, UNIT));
    expect(hammers).toBe(buildingDef('barracks').productionBonus!.percent);
    expect(sums.production).toEqual(
      withStage(stageSumsFor(cityYieldPercents(state, city), 'production'), 'city', hammers),
    );
  });

  it('stages every meter percentage as global, whichever meter it came from', () => {
    const { state, city } = bothStages();
    const percents = cityYieldPercents(state, city);
    expect(percents.length).toBeGreaterThan(0);
    for (const percent of percents) {
      if (percent.meter !== undefined) expect(percent.stage).toBe('empire');
    }
    // Which is the same figure `yieldFactor` reports for the meters alone: the
    // global stage *is* the meters today, and the two readings cannot drift. The
    // meters touch three yields, so the other three must come back untouched.
    const effects = meterEffects(state, 0);
    const sums = cityStageSums(state, city, UNIT);
    for (const key of MODIFIED_YIELDS) {
      expect(1 + sums[key].empire / 100).toBeCloseTo(yieldFactor(effects, key), 10);
    }
    for (const key of CITY_YIELD_KEYS) {
      if ((MODIFIED_YIELDS as readonly string[]).includes(key)) continue;
      expect(sums[key].empire).toBe(0);
    }
  });

  it('leaves a yield nothing local touches exactly where the single pool left it', () => {
    // A city with no seam and no category bonus on that yield has an empty city
    // stage, so the staged answer *is* the one-pool answer — to the point. This
    // is the assertion that says the split was a clarification for most of a run
    // rather than a silent buff, and it is why the measured pacing drift was nil.
    const { state, city } = bothStages();
    const sums = cityStageSums(state, city, UNIT);
    const yields = cityYields(state, city, [], UNIT);
    for (const key of ['science', 'culture', 'gold', 'food'] as const) {
      expect(sums[key].city).toBe(0);
      expect(yields[key]).toBe(applyStages(yields[key], NO_STAGES));
      expect(applyStages(100, sums[key])).toBe(Math.floor((100 * (100 + sums[key].empire)) / 100));
    }
  });

  it('sums a luxury’s percentage into the city stage with the buildings’', () => {
    // The correction the user ratified with the doctrine: **every** luxury
    // percentage is city-stage, however far its scope reaches. "+5% culture in
    // every city" is not an empire total — it lands on one town's culture and
    // multiplies with what that town built — so it joins the monument in the
    // first multiplication and the happiness tier multiplies the pair.
    const found = plantableWith('percentYields', (effect) => effect.yield === 'culture');
    expect(found).toBeDefined();
    const { id, effect } = found!;

    const state = bareState(30, 12);
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    city.population = 3;
    city.buildings = ['monument'];
    growTerritory(state, city);
    plant(state, city, 7, 5, id);

    const tier = tierPercent(happinessOf(state, 0));
    expect(tier).toBeGreaterThan(0);
    const sums = cityStageSums(state, city);
    expect(sums.culture.city).toBe(effect.percent);
    expect(sums.culture.empire).toBe(tier);

    // Both stages live on one yield: the doctrine's ×1.21 shape, reached from a
    // luxury and a meter rather than from a hand-built list.
    expect(applyStages(100, sums.culture)).toBe(
      Math.floor((100 * (100 + effect.percent) * (100 + tier)) / 10_000),
    );
    expect(applyStages(100, sums.culture)).toBeGreaterThan(
      applyStages(100, { city: 0, empire: effect.percent + tier }),
    );

    // And the panel's own line for it says city, beside the meter's empire.
    const percents = cityYieldPercents(state, city);
    expect(percents.find((entry) => entry.resource === id)!.stage).toBe('city');
    expect(percents.filter((entry) => entry.stage === 'empire').every((e) => e.meter !== undefined))
      .toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe('the channels Entry XVII does not own', () => {
  /** An empire wide enough that its writ is overdrawn and its people unhappy. */
  function overstretched(cityCount: number): GameState {
    const state = bareState(36, 12);
    for (let index = 0; index < cityCount; index++) {
      foundCityAt(state, 0, at(state.map, 4 + index * 4, 4));
    }
    return state;
  }

  it('keeps the growth stifle out of the staged food percentages', () => {
    const state = overstretched(1);
    const city = state.cities[0]!;
    city.population = RULES.meters.happiness.palace + 4;
    expect(happinessOf(state, 0)).toBeLessThan(0);

    const effects = meterEffects(state, 0);
    expect(growthPercent(effects)).toBeLessThan(0);
    expect(growthFactor(effects)).toBeLessThan(1);

    // The stifle multiplies the *surplus*, not the harvest (Entry XIV.D.4), so
    // it is in neither stage — a food yield with a stifle on it is a food yield
    // with nothing on it.
    const sums = cityStageSums(state, city);
    expect(sums.food).toEqual({ city: 0, empire: 0 });
    expect(cityYieldPercents(state, city).every((entry) => entry.yield !== 'food')).toBe(true);

    // And the surplus really is throttled, by its own factor, downstream of the
    // untouched harvest.
    const yields = cityYields(state, city);
    const raw = yields.food - city.population * RULES.cities.foodPerCitizen;
    if (raw > 0) expect(growthSurplus(state, city)).toBe(Math.floor(raw * growthFactor(effects)));
  });

  it('keeps the border tier out of the staged culture percentages', () => {
    const state = overstretched(1);
    const city = state.cities[0]!;
    city.population = 3;
    const effects = meterEffects(state, 0);
    expect(borderPercent(effects)).toBeGreaterThan(0);

    // The writ's border percentage is a fact about *culture accrual toward the
    // next tile*, which is its own channel with its own evaluator. The culture
    // yield's stages carry the meters' yield percentages and nothing else.
    const sums = cityStageSums(state, city);
    expect(sums.culture.city).toBe(0);
    const growth = borderGrowth(state, city);
    expect(growth.percent).toBe(borderPercent(effects));
    expect(growth.base).toBe(cityYields(state, city).culture);
    // The border channel multiplies the *already staged* culture — one factor,
    // applied to the yield the stages produced, never a third stage.
    expect(growth.perTurn).toBe(Math.floor(growth.base * (1 + growth.percent / 100)));
  });

  it('folds a hand-built pair the same way whichever channel it is in', () => {
    // The three folds side by side, on one list, so a source that leaked from
    // one channel into another would show up as two of them agreeing.
    const effects: MeterEffect[] = [
      {
        meter: 'happiness',
        value: 6,
        percent: 10,
        yields: ['science', 'culture'],
        growth: false,
        borders: false,
      },
      { meter: 'happiness', value: -6, percent: -25, yields: [], growth: true, borders: false },
      {
        meter: 'authority',
        value: 4,
        percent: 10,
        yields: ['production'],
        growth: false,
        borders: true,
      },
    ];
    expect(growthPercent(effects)).toBe(-25);
    expect(borderPercent(effects)).toBe(10);
    expect(yieldFactor(effects, 'science')).toBeCloseTo(1.1, 10);
    // Food is not a `ModifiedYield` at all — the meters cannot reach it, which
    // is why the stifle had to be its own channel in the first place.
    expect(MODIFIED_YIELDS).not.toContain('food');
  });
});

// ---------------------------------------------------------------------------

describe('Entry XVIII.5: a windfall is modifier-immune', () => {
  /**
   * A city with a wood to fell beside it, a warrior at the front of its queue,
   * and — when `modified` — a barracks in it, on a board whose writ is in
   * surplus. That is one live city-stage percentage and one live global-stage
   * percentage, which is precisely the state in which a chop that *did* scale
   * would pay more.
   *
   * The warrior is in *both* fixtures, and it is what makes the comparison
   * honest twice over: it is a unit at the front, so the barracks' category
   * percentage is live in the modified city, and it is the same queue on both
   * sides, so the two baskets are settled by the same rules (Entry XVIII) and
   * differ only by whatever the chop paid.
   */
  function chopper(modified: boolean): { state: GameState; city: City; workerId: number } {
    const state = bareState();
    const city = foundCityAt(state, 0, at(state.map, 5, 5));
    city.population = 4;
    city.queue = [{ kind: 'unit', id: 'warrior' }];
    if (modified) city.buildings = ['barracks'];
    const tile = at(state.map, 5, 4);
    tile.feature = 'forest';
    const worker = createUnit(state, 0, 'worker', 5, 4);
    return { state, city, workerId: worker.id };
  }

  const chop = (unitId: number): Command => ({ type: 'chopFeature', playerId: 0, unitId });

  /**
   * What the basket should hold after a chop that settles the front item: the
   * printed lump, less what the completion charged. Read off the game's own
   * evaluators rather than written as a number, so this says "the lump was
   * unmodified" and not "the lump was twenty".
   */
  function bankedAfterSettling(state: GameState): number {
    return chopYield('forest').production - unitProductionCost(state, 0, 'warrior');
  }

  it('pays the printed lump into a modified city, to the hammer', () => {
    const { state, city, workerId } = chopper(true);

    // First: prove the modifiers are actually biting, or the test proves nothing.
    const sums = cityStageSums(state, city, UNIT);
    expect(sums.production.city).toBeGreaterThan(0);
    expect(sums.production.empire).toBeGreaterThan(0);
    expect(applyStages(100, sums.production)).toBeGreaterThan(100);

    expect(city.hammerBasket).toBe(0);
    const charged = unitProductionCost(state, 0, 'warrior');
    expect(applyCommand(state, chop(workerId))).toEqual({ ok: true });
    // The printed number, exactly. Not the staged one, not the city stage alone.
    // The lump is read through what it *bought* plus what it left, because a
    // windfall now settles the queue on landing: the warrior it paid for is on
    // the board and the overflow is in the basket, and the two together are the
    // whole of what the chop delivered.
    expect(city.hammerBasket).toBe(chopYield('forest').production - charged);
    expect(city.hammerBasket + charged).toBe(chopYield('forest').production);
    expect(city.hammerBasket + charged).not.toBe(
      applyStages(chopYield('forest').production, sums.production),
    );
  });

  it('pays a bare city exactly the same lump', () => {
    const modified = chopper(true);
    const plain = chopper(false);
    expect(cityStageSums(plain.state, plain.city, UNIT).production).toEqual(
      // A city with no barracks has no city stage; its empire has the same writ.
      { city: 0, empire: cityStageSums(modified.state, modified.city, UNIT).production.empire },
    );

    expect(applyCommand(modified.state, chop(modified.workerId))).toEqual({ ok: true });
    expect(applyCommand(plain.state, chop(plain.workerId))).toEqual({ ok: true });
    // Byte for byte the same basket: the 20⚙ chop is 20⚙ in every city of every
    // empire, which is the commitment in the ledger's own words. Both queues
    // settled the same warrior for the same price, so the overflow is the lump.
    expect(modified.city.hammerBasket).toBe(plain.city.hammerBasket);
    expect(modified.city.hammerBasket).toBe(bankedAfterSettling(modified.state));
  });
});
