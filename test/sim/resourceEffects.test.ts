import { describe, expect, it } from 'vitest';

import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { improvementDef, improvementForResource } from '../../src/sim/improvementData';
import {
  borderCostFor,
  cityResources,
  cityTile,
  cityYieldPercents,
  cityYields,
  collectYields,
  controlledHoldings,
  controlledResources,
  foundCityAt,
  growCities,
  growthCarryover,
  growthThreshold,
  hasResource,
  nextBorderCost,
  stageSumsFor,
  productionModifiers,
  resourceCopies,
} from '../../src/sim/cities';
import { type GameMap, type Tile, createMap, getTileAt, mapRange, tileHex, tileIndex } from '../../src/sim/map';
import {
  authorityOf,
  explainAuthority,
  explainHappiness,
  happinessOf,
  meterEffects,
  tierPercent,
} from '../../src/sim/meters';
import {
  RESOURCE_EFFECT_KINDS,
  RESOURCE_IDS,
  type ResourceEffect,
  type ResourceId,
  resourceDef,
  resourceEffects,
  resourcesOfKind,
  withExtraResources,
} from '../../src/sim/resourceData';
import {
  cityResourceYields,
  describeResourceEffect,
  describeResourceSignature,
  empireResourceYields,
  foldResourceYields,
  foldRulePercent,
  resourceAuthority,
  resourceConnectionPercent,
  resourceHappiness,
  resourcePercentYields,
  resourceProduction,
  resourceRouteYields,
  resourceRulePercent,
  resourceTierBoost,
} from '../../src/sim/resourceEffects';
import { empireGold, explainEmpireGold } from '../../src/sim/empireGold';
import { explainRouteYieldBetween, foldRouteYield } from '../../src/sim/routeYields';
import {
  explainUnitUpkeepRebate,
  unitUpkeep,
  unitUpkeepTotal,
} from '../../src/sim/upkeep';
import { makeRng } from '../../src/sim/rng';
import { RULES } from '../../src/sim/rulesData';
import { type City, type GameState, createUnit, newGame } from '../../src/sim/state';
import { type TechAge, type TechId, highestAge } from '../../src/sim/techData';
import { plainTechs } from './techHelpers';
import { resetVisibility } from '../../src/sim/visibility';
import { civYields } from '../../src/ui/topBar';

/**
 * The luxury signature vocabulary (design ledger, Entry IX; `resourceEffects.ts`).
 *
 * Three claims are under test and none of them is a number. The first is that
 * there is **one evaluator**: nine shapes go into `data/resources.json` and
 * labelled lists come out, and no consumer switches on `effect.kind`. The second
 * is the uniqueness reading — an empire shape counts once per kind for the whole
 * empire, a local shape once per kind *per city*, and `perCopy` is the single
 * marked exception. The third is that the *modifiers* are orthogonal: `fromAge`
 * gates any shape at all, and it gates at the same boundary everywhere.
 *
 * Wherever a shape has more than one user, everything is asserted against the
 * table rather than against the tuning — `luxuryWith('percentYields')` rather
 * than `'gems'`, so a designer who moves a signature from one luxury to another
 * does not fail this suite. Where a shape has exactly one user (amber's tier boost,
 * cotton's carryover, furs' border rebate) the row is named and said to be
 * named, because pretending otherwise would only obscure what is being tested.
 */

/** Every technology of `age` or earlier — an empire standing in that age. */
function techsUpTo(age: TechAge): TechId[] {
  return plainTechs(age);
}

/** Stands a player in an age, with every reveal and improvement of it in hand. */
function standIn(state: GameState, playerId: number, age: TechAge): void {
  state.players[playerId]!.techsResearched = techsUpTo(age);
  expect(highestAge(state.players[playerId]!.techsResearched)).toBe(age);
}

/** The first luxury with an effect of this shape, and that effect. */
function luxuryWith<K extends ResourceEffect['kind']>(
  kind: K,
  where: (effect: Extract<ResourceEffect, { kind: K }>) => boolean = () => true,
): { id: ResourceId; effect: Extract<ResourceEffect, { kind: K }> } | undefined {
  for (const id of resourcesOfKind('luxury')) {
    for (const effect of resourceEffects(id)) {
      if (effect.kind !== kind) continue;
      const narrowed = effect as Extract<ResourceEffect, { kind: K }>;
      if (where(narrowed)) return { id, effect: narrowed };
    }
  }
  return undefined;
}

/** A blank two-player state on a flat grassland rectangle, seeded and quiet. */
function flatState(width = 30, height = 12): GameState {
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
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  state.rng = makeRng(12345);
  // The Ancient age: every reveal and every improvement technology is age 1, so
  // a fixture can improve anything at all while every `fromAge: 3` tier is still
  // locked. Tests that want the late tier say so.
  for (const player of state.players) standIn(state, player.id, 1);
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** Hands a city every tile inside its work radius, so seams have somewhere to go. */
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
 * Puts an improved seam of `id` on a tile this city owns.
 *
 * The improvement is whatever `improvements.json` says opens that resource, so
 * this helper is as data-driven as the thing it is testing — a luxury moved from
 * the plantation to the quarry needs no edit here, and since Entry XXVII a sea
 * luxury plants exactly like a land one: the improvement it names is the fishing
 * boats. `plantable` is how a test asks, and it is now true of every row.
 */
function plant(state: GameState, city: City, col: number, row: number, id: ResourceId): Tile {
  const tile = at(state.map, col, row);
  tile.resource = id;
  tile.improvement = improvementForResource(id)!;
  expect(state.tileOwner[row * state.map.width + col]).toBe(city.id);
  expect(cityResources(state, city, 'luxury')).toContain(id);
  return tile;
}

/** True when some improvement opens this resource. True of every row since the boats. */
function plantable(id: ResourceId): boolean {
  return improvementForResource(id) !== null;
}

/** The first plantable luxury with an effect of this shape. */
function plantableWith<K extends ResourceEffect['kind']>(
  kind: K,
  where: (effect: Extract<ResourceEffect, { kind: K }>) => boolean = () => true,
): { id: ResourceId; effect: Extract<ResourceEffect, { kind: K }> } | undefined {
  for (const id of resourcesOfKind('luxury')) {
    if (!plantable(id)) continue;
    for (const effect of resourceEffects(id)) {
      if (effect.kind !== kind) continue;
      const narrowed = effect as Extract<ResourceEffect, { kind: K }>;
      if (where(narrowed)) return { id, effect: narrowed };
    }
  }
  return undefined;
}

/**
 * Every voice of a list of resource lines, summed into one number.
 *
 * For the tests that care that a *figure moved* rather than which voice it moved
 * in — a `perCopy` tier that pays food on silver and hammers on gold is one
 * assertion either way, which is what keeps this suite about the mechanism.
 */
function foldOne(lines: ReturnType<typeof cityResourceYields>): number {
  const total = foldResourceYields(lines);
  return (
    total.food + total.production + total.gold + total.science + total.culture + total.faith
  );
}

// --- the vocabulary ---------------------------------------------------------

describe('the effect vocabulary', () => {
  it('reads every shape the table declares, and nothing it does not', () => {
    for (const id of RESOURCE_IDS) {
      for (const effect of resourceEffects(id)) {
        expect(RESOURCE_EFFECT_KINDS).toContain(effect.kind);
        // Only luxuries carry a signature: a bonus resource is its tile yield
        // and a strategic one is a production gate, and neither has a second job.
        expect(resourceDef(id).kind).toBe('luxury');
      }
    }
  });

  it('exercises every shape it defines, or holds it live here', () => {
    // A shape nobody declares is a shape whose evaluator nothing tests, and the
    // fix for one is normally to delete it. This list is the register of what the
    // table is *not* using, and it turned over completely in the nerf round of
    // 2026-09-02 — which is the point of pinning it: the round moved four shapes
    // out of the data and one (`empireYields`) in, and every one of those moves
    // had to be typed here on purpose.
    //
    // What the round did, and why each shape left the table:
    //
    //   · `empireYields` was the one reading nothing declared, precisely because
    //     the old table was **wide everywhere**. It is now the backbone of the
    //     round — gems, silk, spices, incense, jade, furs, dyes, tea all pay a
    //     fixed sum however many towns an empire has, which is the whole of the
    //     nerf;
    //   · `percentYields` left because every row that had one was a percentage
    //     of a wide empire's total, which is the same snowball read as a share;
    //   · `authoritySupply` left with spices' and silver's writ lines;
    //   · `happinessTierBoost` left with amber's, and `perPopulationYields` with
    //     olives' half a coin a head.
    //
    // All four are kept rather than deleted — each is a real reading, and each is
    // held live by a row installed at runtime in the tests below, which is the
    // same proof the table's data-drivenness rests on. The day a row declares one
    // again, this line is what tells whoever wrote it to delete the exception.
    const declared = new Set<string>();
    for (const id of RESOURCE_IDS) {
      for (const effect of resourceEffects(id)) declared.add(effect.kind);
    }
    expect(RESOURCE_EFFECT_KINDS.filter((kind) => !declared.has(kind))).toEqual([
      'perPopulationYields',
      'authoritySupply',
      'percentYields',
      'happinessTierBoost',
    ]);
    expect(luxuryWith('perCityYields', (effect) => effect.scope === 'owner')).toBeUndefined();
  });

  it('never asks the empire for a yield it has no basket for', () => {
    for (const id of RESOURCE_IDS) {
      for (const effect of resourceEffects(id)) {
        if (effect.kind !== 'empireYields') continue;
        expect(effect.food).toBeUndefined();
        expect(effect.production).toBeUndefined();
      }
    }
  });

  it('says what each signature does, in words, from one place', () => {
    for (const id of RESOURCE_IDS) {
      const lines = describeResourceSignature(id);
      expect(lines).toHaveLength(resourceEffects(id).length);
      for (const line of lines) expect(line.text.length).toBeGreaterThan(0);
      const words = describeResourceEffect(id);
      if (resourceEffects(id).length === 0) {
        expect(words).toBeNull();
        continue;
      }
      expect(words).toBeTruthy();
    }
  });

  it('labels a locked tier by the age it waits for, and only that tier', () => {
    // The interface greys a tier it cannot yet pay and names the age — "Æra III"
    // — so a payoff a player cannot use is still a payoff they can plan for.
    // `fromAge` is carried on the line rather than folded into the sentence, so
    // a surface can *style* it instead of parsing prose for the same fact.
    const late = luxuryWith('perCityYields', (effect) => effect.fromAge === 3);
    expect(late).toBeDefined();
    const lines = describeResourceSignature(late!.id);
    expect(lines.some((line) => line.fromAge === 3)).toBe(true);
    expect(lines.some((line) => line.fromAge === undefined)).toBe(true);
    expect(describeResourceEffect(late!.id)).toContain('Æra III');
  });
});

// --- the flat yield shapes --------------------------------------------------

/**
 * A row that overrides an existing one, so the invented signature is carried by
 * a resource an improvement already opens.
 *
 * `withExtraResources` merges by key, so reusing `gems` keeps its place in the
 * table's order, its terrain rule and — crucially — the mine that opens it. A
 * *new* id could never be `controlled` by anybody: nothing in
 * `data/improvements.json` names it, so `openedResource` would answer null and
 * no signature could ever be reached. That is the whole reason these two tests
 * override rather than invent.
 */
function withSignature<T>(effects: readonly unknown[], body: () => T): T {
  const row = { ...(resourceDef('gems') as unknown as Record<string, unknown>), effects };
  return withExtraResources({ gems: row as never }, body);
}

/** A board with one hill seam of gems in the first of two cities. */
function twoCities(): { state: GameState; first: City; second: City } {
  const state = flatState();
  const first = foundCityAt(state, 0, at(state.map, 6, 5));
  growTerritory(state, first);
  const second = foundCityAt(state, 0, at(state.map, 20, 5));
  growTerritory(state, second);
  return { state, first, second };
}

describe("perCityYields at 'owner' scope: the powerful-local reading", () => {
  /**
   * The scope the ratified table does not use, held live with an overridden row.
   *
   * `'owner'` was its own shape (`cityYields`) until the ratified table turned
   * out to be wide everywhere, at which point keeping a whole `kind` nothing
   * declared would have been dead vocabulary — so it became a word in `scope`
   * instead. It is still a real reading and it is still reachable.
   */
  it('pays only the city that holds the seam', () => {
    withSignature([{ kind: 'perCityYields', scope: 'owner', gold: 5 }], () => {
      const { state, first, second } = twoCities();
      at(state.map, 7, 5).hills = true;
      plant(state, first, 7, 5, 'gems');

      const goldFor = (city: City): number =>
        foldResourceYields(
          cityResourceYields(state, city).filter((line) => line.resource === 'gems'),
        ).gold;
      expect(goldFor(first)).toBe(5);
      // The far city holds no seam of this kind, so an owner-scoped line does
      // not reach it — which is the whole difference from the wide scope.
      expect(goldFor(second)).toBe(0);

      // A second seam in the same city is still one signature: uniqueness is per
      // city, not per tile.
      at(state.map, 5, 5).hills = true;
      plant(state, first, 5, 5, 'gems');
      expect(goldFor(first)).toBe(5);

      // And a seam in the second city is a second signature — the reason a
      // powerfully-local shape is worth settling for.
      at(state.map, 21, 5).hills = true;
      plant(state, second, 21, 5, 'gems');
      expect(goldFor(second)).toBe(5);
    });
  });
});

describe('empireYields: once for the empire, wherever it stands', () => {
  it('pays a flat sum once a turn, however many seams or towns', () => {
    withSignature([{ kind: 'empireYields', gold: 4, culture: 1 }], () => {
      const { state, first, second } = twoCities();
      at(state.map, 7, 5).hills = true;
      plant(state, first, 7, 5, 'gems');

      const lines = empireResourceYields(state, 0).filter((line) => line.resource === 'gems');
      expect(lines).toHaveLength(1);
      expect(lines[0]!.gold).toBe(4);
      expect(lines[0]!.culture).toBe(1);

      // Neither a second seam nor a second town changes it — this is the one
      // reading in the vocabulary a wide empire gets no more out of than a tall
      // one, and it lands in no city at all.
      at(state.map, 5, 5).hills = true;
      plant(state, first, 5, 5, 'gems');
      at(state.map, 21, 5).hills = true;
      plant(state, second, 21, 5, 'gems');
      expect(empireResourceYields(state, 0).filter((line) => line.resource === 'gems')).toHaveLength(1);
      for (const city of [first, second]) {
        expect(cityResourceYields(state, city).map((line) => line.resource)).not.toContain('gems');
      }

      // Banked once per player by the turn pipeline, and in the strip's headline.
      const player = state.players[0]!;
      const before = { gold: player.gold, culture: player.culturePool };
      collectYields(state);
      const cities = state.cities
        .filter((city) => city.ownerId === 0)
        .reduce((sum, city) => sum + cityYields(state, city).gold, 0);
      expect(player.gold - before.gold).toBe(cities + 4);
      expect(player.culturePool - before.culture).toBeGreaterThanOrEqual(1);
      expect(civYields(state, 0).gold).toBe(cities + 4);
    });
  });
});

describe('perCityYields: the wide shape', () => {
  it('pays in every city the empire holds, not only the one with the seam', () => {
    const wide = plantableWith(
      'perCityYields',
      (effect) => effect.scope === undefined && effect.fromAge === undefined,
    );
    expect(wide).toBeDefined();
    const { id, effect } = wide!;

    const state = flatState();
    const first = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, first);
    const second = foundCityAt(state, 0, at(state.map, 20, 5));
    growTerritory(state, second);

    const before = [cityYields(state, first), cityYields(state, second)];
    plant(state, first, 7, 5, id);

    // The far city has no seam of its own and is paid anyway — which is the
    // whole of "empire-scaling", and the thing happiness and authority price.
    for (const city of [first, second]) {
      const line = cityResourceYields(state, city).find((entry) => entry.resource === id);
      expect(line, city.name).toBeDefined();
      expect(line!.gold).toBe(effect.gold ?? 0);
      expect(line!.culture).toBe(effect.culture ?? 0);
    }
    const after = [cityYields(state, first), cityYields(state, second)];
    expect(after[1]!.gold + after[1]!.culture + after[1]!.science).toBeGreaterThan(
      before[1]!.gold + before[1]!.culture + before[1]!.science,
    );
  });

  it('pays once for a second seam of the same kind', () => {
    const wide = plantableWith(
      'perCityYields',
      (effect) => effect.scope === undefined && effect.fromAge === undefined,
    );
    const { id } = wide!;
    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);

    plant(state, city, 7, 5, id);
    const once = foldResourceYields(
      cityResourceYields(state, city).filter((line) => line.resource === id),
    );
    plant(state, city, 5, 5, id);
    expect(
      foldResourceYields(cityResourceYields(state, city).filter((line) => line.resource === id)),
    ).toEqual(once);
  });

  it('honours a coastal scope: the harbour is paid and the inland town is not', () => {
    const coastal = luxuryWith('perCityYields', (effect) => effect.scope === 'coastal');
    expect(coastal).toBeDefined();
    const { id, effect } = coastal!;

    const state = flatState();
    // A sea down one edge, so one city stands on the coast and one does not.
    for (let row = 0; row < 12; row++) at(state.map, 0, row).terrain = 'coast';
    const inland = foundCityAt(state, 0, at(state.map, 20, 5));
    growTerritory(state, inland);
    const harbour = foundCityAt(state, 0, at(state.map, 1, 5));
    growTerritory(state, harbour);

    // Entry XXVII: a sea luxury is a *held* luxury now, so the scope is asserted
    // the way every other one is — the seam improved on the empire's own coast,
    // and the two towns' lines compared. This test used to go through the
    // evaluator's internals because nothing could open a sea seam at all.
    standIn(state, 0, 3);
    plant(state, harbour, 0, 6, id);
    const linesFor = (city: City): number =>
      cityResourceYields(state, city).filter((line) => line.resource === id).length;
    expect(linesFor(harbour)).toBeGreaterThan(0);
    expect(linesFor(inland)).toBe(0);
    expect(effect.scope).toBe('coastal');
    expect(plantable(id)).toBe(true);
  });
});

describe('perPopulationYields: paid a head', () => {
  /**
   * Olives' half a coin a head, held live with an overridden row.
   *
   * The shape left the table in the nerf round of 2026-09-02 — a yield paid per
   * citizen in **every** city is the wide snowball read one scale finer — and it
   * is kept for the same reason the `'owner'` scope is: it is a real reading of
   * the vocabulary, it costs one branch, and a shape nothing exercises is a shape
   * whose flooring rule quietly rots.
   */
  it('scales with the city and floors per city', () => {
    withSignature([{ kind: 'perPopulationYields', gold: 0.5 }], () => {
      const id: ResourceId = 'gems';
      const state = flatState();
      const city = foundCityAt(state, 0, at(state.map, 6, 5));
      growTerritory(state, city);
      at(state.map, 7, 5).hills = true;
      plant(state, city, 7, 5, id);

      // Half a coin a head, floored per city — the same rule a building's
      // `sciencePerPop` keeps, and for the same reason: two half sources must pay
      // for two halves rather than round into a free one.
      for (const population of [1, 2, 3, 7]) {
        city.population = population;
        const line = cityResourceYields(state, city).find(
          (entry) => entry.resource === id && entry.source.includes('per citizen'),
        );
        const expected = Math.floor(0.5 * population);
        if (expected === 0) {
          expect(line).toBeUndefined();
          continue;
        }
        expect(line!.gold).toBe(expected);
      }
    });
  });
});

describe('extraHappiness: a second line, not a bigger one', () => {
  it('pays on top of the flat per-unique figure', () => {
    const happy = plantableWith('extraHappiness', (effect) => effect.per === undefined);
    expect(happy).toBeDefined();
    const { id, effect } = happy!;

    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    const bare = happinessOf(state, 0);

    plant(state, city, 7, 5, id);
    const signature = resourceHappiness(state, 0).filter((line) => line.resource === id);
    expect(signature.length).toBeGreaterThan(0);
    expect(happinessOf(state, 0)).toBe(
      bare +
        RULES.meters.happiness.perUniqueLuxury +
        signature.reduce((sum, line) => sum + line.amount, 0),
    );

    // Two lines at least: what a luxury is worth, and what *this* luxury is.
    const entries = explainHappiness(state, 0).filter((entry) =>
      entry.source.startsWith(resourceDef(id).name),
    );
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries[0]!.value).toBe(RULES.meters.happiness.perUniqueLuxury);
    expect(effect.amount).toBeGreaterThan(0);
  });

  it('multiplies a "per city" line by the towns that qualify', () => {
    const perCity = plantableWith('extraHappiness', (effect) => effect.per === 'city');
    expect(perCity).toBeDefined();
    const { id, effect } = perCity!;
    // Every "per city" contentment line is an Æra III tier since the nerf round
    // — the class the user called "way too strong" is now the *late* half of a
    // row rather than the whole of it — so the fixture has to stand in that age
    // for the line to be live at all.
    expect(effect.fromAge).toBe(3);

    const state = flatState();
    standIn(state, 0, 3);
    const first = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, first);
    plant(state, first, 7, 5, id);

    const lineFor = (): number => {
      const line = resourceHappiness(state, 0).find(
        (entry) => entry.resource === id && entry.source.includes('cities'),
      );
      return line?.amount ?? 0;
    };
    expect(lineFor()).toBe(effect.amount);

    const second = foundCityAt(state, 0, at(state.map, 20, 5));
    growTerritory(state, second);
    expect(lineFor()).toBe(effect.amount * 2);

    // Still one *kind*, however many seams. Only the towns multiply.
    plant(state, first, 5, 5, id);
    expect(lineFor()).toBe(effect.amount * 2);
  });
});

/**
 * The writ a luxury supplies — held live with overridden rows since the nerf
 * round of 2026-09-02 took spices' and silver's authority lines off the table.
 *
 * Kept rather than deleted for the reason every unused reading here is kept: it
 * is the one shape that pays into the *other* meter, its "capacity, never a
 * discount" rule is a claim about `meters.ts` that nothing else asserts, and it
 * costs one branch in the evaluator.
 */
describe('authoritySupply: capacity, never a discount', () => {
  it('adds a gain line to the writ, and never touches what a city costs', () => {
    withSignature([{ kind: 'authoritySupply', amount: 2 }], () => {
      const id: ResourceId = 'gems';
      const state = flatState();
      const city = foundCityAt(state, 0, at(state.map, 6, 5));
      growTerritory(state, city);
      const before = explainAuthority(state, 0);
      const beforeTotal = authorityOf(state, 0);

      at(state.map, 7, 5).hills = true;
      plant(state, city, 7, 5, id);
      const after = explainAuthority(state, 0);
      expect(authorityOf(state, 0)).toBe(beforeTotal + 2);

      const added = after.filter((line) => line.source.startsWith(resourceDef(id).name));
      expect(added).toHaveLength(1);
      expect(added[0]!.part).toBe('gain');
      // The cost side is byte-identical: a luxury widens the writ, it does not
      // make a town cheaper to hold.
      const costs = (list: typeof before): string =>
        JSON.stringify(list.filter((line) => line.part === 'cost'));
      expect(costs(after)).toBe(costs(before));
      expect(resourceAuthority(state, 0).map((line) => line.resource)).toContain(id);
    });
  });

  it('multiplies a "per city" writ by the empire\'s towns', () => {
    withSignature([{ kind: 'authoritySupply', amount: 1, per: 'city' }], () => {
      const id: ResourceId = 'gems';
      const state = flatState();
      const first = foundCityAt(state, 0, at(state.map, 6, 5));
      growTerritory(state, first);
      at(state.map, 7, 5).hills = true;
      plant(state, first, 7, 5, id);
      const line = (): number =>
        resourceAuthority(state, 0).find(
          (entry) => entry.resource === id && entry.source.includes('cities'),
        )?.amount ?? 0;
      expect(line()).toBe(1);

      const second = foundCityAt(state, 0, at(state.map, 20, 5));
      growTerritory(state, second);
      expect(line()).toBe(2);
    });
  });
});

// --- modifiers --------------------------------------------------------------

describe('productionBonus: one shape over two tables', () => {
  it('puts a luxury’s hammers behind its category and no other', () => {
    const bonus = plantableWith('productionBonus');
    expect(bonus).toBeDefined();
    const { id, effect } = bonus!;

    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    city.population = 4;
    plant(state, city, 7, 5, id);

    const matching = { kind: effect.category, id: effect.category === 'unit' ? 'warrior' : 'granary' };
    const other =
      effect.category === 'unit'
        ? { kind: 'building' as const, id: 'granary' }
        : { kind: 'unit' as const, id: 'warrior' };

    expect(resourceProduction(state, city, effect.category).map((line) => line.resource)).toContain(id);
    expect(resourceProduction(state, city, other.kind).map((line) => line.resource)).not.toContain(id);

    const behind = productionModifiers(state, city, matching as never);
    // City stage whatever the row's scope says: a category bonus is a share of
    // the hammers *this town* puts behind *this build*, which is what Entry
    // XVII.4 stages on — where the effect applies, not where it is held.
    expect(behind).toContainEqual({
      source: resourceDef(id).name,
      resource: id,
      percent: effect.percent,
      stage: 'city',
    });
  });

  it('reaches every city when the row says empire, and only the seam’s when it does not', () => {
    const wide = plantableWith('productionBonus', (effect) => effect.scope === 'empire');
    expect(wide).toBeDefined();
    const { id, effect } = wide!;

    const state = flatState();
    const first = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, first);
    const second = foundCityAt(state, 0, at(state.map, 20, 5));
    growTerritory(state, second);
    plant(state, first, 7, 5, id);

    for (const city of [first, second]) {
      expect(resourceProduction(state, city, effect.category).map((line) => line.resource), city.name)
        .toContain(id);
    }
  });

  it('folds a building’s bonus and a luxury’s into one list', () => {
    // The generalisation under test: the barracks used to be the only thing that
    // could do this and it did it through a unit-only field. Both tables now
    // declare `{ category, percent }`, and `productionModifiers` is a list over
    // the two — no barracks case and no marble case anywhere.
    const barracks = buildingDef('barracks').productionBonus!;
    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    city.population = 4;
    city.buildings = ['barracks'];

    const unit = { kind: 'unit', id: 'warrior' } as never;
    const fromBuilding = productionModifiers(state, city, unit);
    expect(fromBuilding).toHaveLength(1);
    expect(fromBuilding[0]!.percent).toBe(barracks.percent);

    const sameCategory = plantableWith(
      'productionBonus',
      (effect) => effect.category === barracks.category,
    );
    expect(sameCategory).toBeDefined();
    plant(state, city, 7, 5, sameCategory!.id);
    const both = productionModifiers(state, city, unit);
    expect(both).toHaveLength(2);
    expect(both.map((line) => line.source)).toContain(resourceDef(sameCategory!.id).name);
  });
});

/**
 * A luxury's percentage on a yield — held live with overridden rows since the
 * nerf round of 2026-09-02 took the last one off the table.
 *
 * Every row that had one took a share of a *wide* empire's total, which is the
 * snowball the round was about, so all of them went. The shape stays because the
 * claim it carries is about Entry XVII rather than about any luxury: a
 * percentage from this table is a **city-stage** line that sums with the
 * buildings' and is multiplied once by the meters, and that is the doctrine a
 * later age's row will land back into.
 */
describe('percentYields: two sums, each applied once', () => {
  it('joins the meters in a single per-yield stage sum rather than compounding', () => {
    withSignature([{ kind: 'percentYields', yield: 'gold', percent: 10 }], () => {
    const id: ResourceId = 'gems';
    const effect = { yield: 'gold', percent: 10 } as const;

    const state = flatState();
    standIn(state, 0, 3);
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    at(state.map, 7, 5).hills = true;
    plant(state, city, 7, 5, id);

    const lines = cityYieldPercents(state, city);
    const mine = lines.filter((line) => line.resource === id);
    expect(mine).toHaveLength(1);
    expect(mine[0]!.yield).toBe(effect.yield);

    // Every luxury percentage is **city-stage**, however far its scope reaches:
    // "+10% gold in every city" applies in a city, so it sums with that city's
    // buildings and the meters multiply what the two come to (Entry XVII.4, read
    // strictly). Additive within the stage is the rest of the doctrine — two
    // sources at +10% read as +20%, never as 1.1 × 1.1.
    expect(mine[0]!.stage).toBe('city');
    const sums = stageSumsFor(lines, effect.yield);
    for (const stage of ['city', 'empire'] as const) {
      expect(sums[stage]).toBe(
        lines
          .filter((line) => line.yield === effect.yield && line.stage === stage)
          .reduce((total, line) => total + line.percent, 0),
      );
    }
    // The global stage is the meters and nothing else, so no luxury is in it.
    expect(lines.filter((line) => line.stage === 'empire').every((line) => line.meter !== undefined))
      .toBe(true);
    expect(sums.city).toBeGreaterThanOrEqual(effect.percent);
    });
  });

  it('is not applied at all before its age, and is after it', () => {
    withSignature([{ kind: 'percentYields', yield: 'gold', percent: 10, fromAge: 3 }], () => {
      const id: ResourceId = 'gems';
      const state = flatState();
      const city = foundCityAt(state, 0, at(state.map, 6, 5));
      growTerritory(state, city);
      at(state.map, 7, 5).hills = true;
      plant(state, city, 7, 5, id);

      standIn(state, 0, 2);
      expect(resourcePercentYields(state, city).map((line) => line.resource)).not.toContain(id);
      standIn(state, 0, 3);
      expect(resourcePercentYields(state, city).map((line) => line.resource)).toContain(id);
    });
  });

  it('scopes to the coast when the row says so', () => {
    withSignature(
      [{ kind: 'percentYields', yield: 'science', percent: 20, scope: 'coastal' }],
      () => {
        const id: ResourceId = 'gems';
        const state = flatState();
        standIn(state, 0, 3);
        for (let row = 0; row < 12; row++) at(state.map, 0, row).terrain = 'coast';
        // The capital first and inland, because the capital is free and its line
        // says "capital" rather than "coastal" (`cityAuthorityCost`'s precedence).
        const inland = foundCityAt(state, 0, at(state.map, 20, 5));
        growTerritory(state, inland);
        const harbour = foundCityAt(state, 0, at(state.map, 1, 5));
        growTerritory(state, harbour);

        // The seam is inland and the *scope* is what decides where the share
        // lands: the harbour is paid because it stands on the coast, and the town
        // that owns the mine is not, which is the whole difference between a
        // scope and a holding.
        at(state.map, 21, 5).hills = true;
        plant(state, inland, 21, 5, id);
        expect(resourcePercentYields(state, harbour).map((line) => line.resource)).toContain(id);
        expect(resourcePercentYields(state, inland).map((line) => line.resource)).not.toContain(id);
        const writ = explainAuthority(state, 0);
        expect(writ.some((line) => line.source.includes('coastal'))).toBe(true);
      },
    );
  });
});

describe('rulePercent: a percentage on a rule', () => {
  it('takes a share off what a citizen demands in happiness', () => {
    const rule = plantableWith('rulePercent', (effect) => effect.rule === 'happinessDemand');
    expect(rule).toBeDefined();
    const { id, effect } = rule!;
    expect(effect.fromAge).toBe(3);

    const state = flatState();
    standIn(state, 0, 3);
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    city.population = 6;

    const demandOf = (): number =>
      -explainHappiness(state, 0)
        .filter((line) => line.part === 'cost')
        .reduce((total, line) => total + line.value, 0);
    const before = demandOf();
    plant(state, city, 7, 5, id);
    const after = demandOf();
    expect(after).toBeCloseTo(before * (1 + effect.percent / 100), 6);
    expect(foldRulePercent(resourceRulePercent(state, 0, 'happinessDemand'))).toBe(effect.percent);
  });

  it('takes a share off the next border tile', () => {
    // `borderCost` left the table with furs' rebate in the nerf round of
    // 2026-09-02 — cheaper borders are a *wide* empire's bonus — and the rule
    // survives because the cards name it too (`CardRule`) and `cities.ts` folds
    // both vocabularies into one figure. Held live here with an overridden row.
    withSignature([{ kind: 'rulePercent', rule: 'borderCost', percent: -10 }], () => {
      const id: ResourceId = 'gems';
      const state = flatState();
      standIn(state, 0, 3);
      const city = foundCityAt(state, 0, at(state.map, 6, 5));
      growTerritory(state, city);
      expect(borderCostFor(state, city)).toBe(nextBorderCost(city.tilesClaimed));

      at(state.map, 7, 5).hills = true;
      plant(state, city, 7, 5, id);
      expect(borderCostFor(state, city)).toBe(
        Math.max(1, Math.floor(nextBorderCost(city.tilesClaimed) * 0.9)),
      );
      expect(borderCostFor(state, city)).toBeLessThan(nextBorderCost(city.tilesClaimed));
    });
  });

  it('keeps a share of the basket when a city grows', () => {
    // `growthCarryover` left with cotton's line in the same round, and is held
    // live the same way. The rule's number *is* the rate rather than a scaling of
    // a base, because there is no base: an empire with nothing that names it
    // keeps nothing.
    withSignature([{ kind: 'rulePercent', rule: 'growthCarryover', percent: 10 }], () => {
      const id: ResourceId = 'gems';
      const state = flatState();
      const city = foundCityAt(state, 0, at(state.map, 6, 5));
      growTerritory(state, city);
      const threshold = growthThreshold(city.population);
      expect(growthCarryover(state, city, threshold)).toBe(0);

      at(state.map, 7, 5).hills = true;
      plant(state, city, 7, 5, id);
      const kept = growthCarryover(state, city, threshold);
      expect(kept).toBe(Math.floor((threshold * 10) / 100));
      expect(kept).toBeGreaterThan(0);

      // And the phase spends the threshold less the rebate, so the city starts
      // its next citizen with the difference already banked.
      city.foodBasket = threshold;
      const population = city.population;
      growCities(state);
      expect(city.population).toBe(population + 1);
      expect(city.foodBasket).toBe(kept);
    });
  });
});

/**
 * The tier boost — amber's, until the nerf round of 2026-09-02 took it off the
 * row, and held live with an overridden one since.
 *
 * It is the only shape that reaches *inside* a meter's ladder rather than
 * standing beside it, and its one-sidedness (the malus rungs are untouched) is a
 * claim about `tierPercent` that nothing else in the suite makes. A card still
 * declares the same reading (`cardTierBoost`), so the ladder's parameter is live
 * either way — what this holds is the *luxury* half of it.
 */
describe('happinessTierBoost: a luxury lifts the bonus rungs', () => {
  it('raises the positive tiers and leaves the malus rungs alone', () => {
    withSignature([{ kind: 'happinessTierBoost', points: 5, fromAge: 3 }], () => {
    const id: ResourceId = 'gems';
    const points = 5;
    // The ladder itself, asked directly: the boost is added *after* the clamp,
    // which is the only place it can be added and still do anything at the top
    // rung — `tierClamp` is exactly that rung's magnitude.
    expect(tierPercent(20, points)).toBe(RULES.meters.tierClamp + points);
    expect(tierPercent(6, points)).toBe(tierPercent(6) + points);
    expect(tierPercent(-20, points)).toBe(tierPercent(-20));
    expect(tierPercent(0, points)).toBe(0);

    const state = flatState();
    standIn(state, 0, 3);
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);

    const bonusNow = (): number =>
      meterEffects(state, 0).find((entry) => entry.meter === 'happiness' && !entry.growth)?.percent ??
      0;
    at(state.map, 7, 5).hills = true;
    plant(state, city, 7, 5, id);
    expect(resourceTierBoost(state, 0).points).toBe(points);
    // The empire is comfortably content with a palace and a luxury, so the rung
    // it stands on is a positive one and the boost is on top of it.
    expect(happinessOf(state, 0)).toBeGreaterThanOrEqual(5);
    expect(bonusNow()).toBe(tierPercent(happinessOf(state, 0)) + points);

    // Locked before its age, exactly like every other tier.
    standIn(state, 0, 2);
    expect(resourceTierBoost(state, 0).points).toBe(0);
    expect(bonusNow()).toBe(tierPercent(happinessOf(state, 0)));
    });
  });
});

// --- the nerf round's four shapes -------------------------------------------

/**
 * The shapes the round of 2026-09-02 added, and the one scope it added with them.
 *
 * Each exists because the round moved a payoff **off "every city"** and had to
 * put it somewhere that does not scale with how far the borders run: into the
 * capital, onto the buildings an empire actually raised, onto the routes it
 * actually sent, and onto the payroll it actually keeps. They are asserted here
 * against the table rather than against the tuning, like every other shape with
 * more than one user.
 */
describe("perCityYields at 'capital' scope: one town, however wide the empire", () => {
  it('pays the capital and no other town, wherever the seam is', () => {
    const capitalRow = plantableWith('perCityYields', (effect) => effect.scope === 'capital');
    expect(capitalRow).toBeDefined();
    const { id, effect } = capitalRow!;

    const { state, first, second } = twoCities();
    // The seam is in the *second* city, so what is under test is the scope and
    // not the holding: a capital is paid for a mine it does not own.
    at(state.map, 21, 5).hills = true;
    plant(state, second, 21, 5, id);

    const lineFor = (city: City) =>
      cityResourceYields(state, city).find((entry) => entry.resource === id);
    expect(lineFor(first)).toBeDefined();
    expect(lineFor(first)!.source).toContain('capital');
    expect(lineFor(second)).toBeUndefined();
    expect(foldOne(cityResourceYields(state, first).filter((l) => l.resource === id))).toBe(
      (effect.food ?? 0) + (effect.production ?? 0) + (effect.gold ?? 0) +
        (effect.science ?? 0) + (effect.culture ?? 0) + (effect.faith ?? 0),
    );

    // And it *moves*: `capitalCityOf` is the one rule, so a capital that falls
    // takes the line with it rather than leaving it behind on a flag.
    first.captured = true;
    expect(lineFor(first)).toBeUndefined();
    expect(lineFor(second)).toBeDefined();
  });
});

describe('buildingCategoryYields: paid for what you built, not for how wide you spread', () => {
  it('lands in the town holding the building, and counts only its own shelf', () => {
    const row = plantableWith(
      'buildingCategoryYields',
      (effect) => effect.category !== undefined,
    );
    expect(row).toBeDefined();
    const { id, effect } = row!;
    const category = effect.category!;

    const { state, first, second } = twoCities();
    standIn(state, 0, 3);
    at(state.map, 7, 5).hills = true;
    plant(state, first, 7, 5, id);

    const lineFor = (city: City) =>
      cityResourceYields(state, city).find((entry) => entry.resource === id);
    // No buildings anywhere: no line anywhere. The buildings *are* the scope.
    expect(lineFor(first)).toBeUndefined();
    expect(lineFor(second)).toBeUndefined();

    // A building of the right shelf, in the town that does *not* hold the seam —
    // the line follows the building, which is the whole reading.
    const matching = BUILDING_IDS.find(
      (building) => buildingDef(building).category === category && !buildingDef(building).wonder,
    )!;
    const other = BUILDING_IDS.find(
      (building) => buildingDef(building).category !== category && !buildingDef(building).wonder,
    )!;
    second.buildings = [other];
    expect(lineFor(second)).toBeUndefined();
    second.buildings = [other, matching];
    const paid = lineFor(second);
    expect(paid).toBeDefined();
    expect(paid!.source).toContain('×1');
    expect(lineFor(first)).toBeUndefined();

    // Two of them are twice the line, and the count is on the label.
    const secondMatching = BUILDING_IDS.filter(
      (building) => buildingDef(building).category === category && !buildingDef(building).wonder,
    )[1]!;
    const once = foldOne(cityResourceYields(state, second).filter((l) => l.resource === id));
    second.buildings = [other, matching, secondMatching];
    expect(foldOne(cityResourceYields(state, second).filter((l) => l.resource === id))).toBe(
      once * 2,
    );
    expect(lineFor(second)!.source).toContain('×2');
  });

  it('pays its happiness to the empire, counted over every town', () => {
    const row = plantableWith(
      'buildingCategoryYields',
      (effect) => (effect.happiness ?? 0) > 0,
    );
    expect(row).toBeDefined();
    const { id, effect } = row!;
    const amount = effect.happiness!;

    const { state, first, second } = twoCities();
    standIn(state, 0, 3);
    at(state.map, 7, 5).hills = true;
    plant(state, first, 7, 5, id);

    const contentment = (): number =>
      resourceHappiness(state, 0)
        .filter((line) => line.resource === id && line.source.includes('buildings'))
        .reduce((sum, line) => sum + line.amount, 0);
    expect(contentment()).toBe(0);

    const matching = BUILDING_IDS.find(
      (building) =>
        buildingDef(building).category === effect.category && !buildingDef(building).wonder,
    )!;
    first.buildings = [matching];
    expect(contentment()).toBe(amount);
    // Happiness is an empire meter and has no city-scale reading to land in, so
    // a second workshop in a second town is a second point on the same line.
    second.buildings = [matching];
    expect(contentment()).toBe(amount * 2);
    expect(happinessOf(state, 0)).toBeGreaterThan(0);
  });

  it('counts wonders when the row names them, whatever shelf they sit on', () => {
    const row = plantableWith('buildingCategoryYields', (effect) => effect.wonders === true);
    expect(row).toBeDefined();
    const { id } = row!;

    const state = flatState();
    standIn(state, 0, 3);
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    at(state.map, 7, 5).hills = true;
    plant(state, city, 7, 5, id);

    const lineFor = () => cityResourceYields(state, city).find((entry) => entry.resource === id);
    const wonder = BUILDING_IDS.find((building) => buildingDef(building).wonder === true)!;
    const plain = BUILDING_IDS.find((building) => buildingDef(building).wonder !== true)!;
    city.buildings = [plain];
    expect(lineFor()).toBeUndefined();
    city.buildings = [plain, wonder];
    expect(lineFor()).toBeDefined();
    expect(lineFor()!.source).toContain('wonders');
  });
});

describe('routeYields: a coin on every caravan', () => {
  it('joins the route’s own list, once per route, off the origin’s owner', () => {
    const row = plantableWith('routeYields');
    expect(row).toBeDefined();
    const { id, effect } = row!;
    expect(effect.fromAge).toBe(3);

    const { state, first, second } = twoCities();
    first.population = 3;
    second.population = 3;
    const bare = explainRouteYieldBetween(state, first, second);

    at(state.map, 7, 5).hills = true;
    plant(state, first, 7, 5, id);
    // Locked before its age like every other second tier.
    standIn(state, 0, 2);
    expect(explainRouteYieldBetween(state, first, second)).toEqual(bare);

    standIn(state, 0, 3);
    const lines = explainRouteYieldBetween(state, first, second);
    const added = lines.filter((line) => line.source.includes(resourceDef(id).name));
    expect(added).toHaveLength(1);
    expect(added[0]!.gold).toBe(effect.gold ?? 0);
    // Rule 5: the route's totals are still the fold of the list it prints, with
    // the new line in it.
    expect(foldRouteYield(lines).gold).toBe(foldRouteYield(bare).gold + (effect.gold ?? 0));
    // Once per kind however many seams — and once per *route*, which is what
    // makes it a line on the caravan rather than a flat on the empire.
    at(state.map, 5, 5).hills = true;
    plant(state, first, 5, 5, id);
    expect(
      explainRouteYieldBetween(state, first, second).filter((line) =>
        line.source.includes(resourceDef(id).name),
      ),
    ).toHaveLength(1);
    expect(resourceRouteYields(state, 0)).toHaveLength(1);
    expect(resourceRouteYields(state, 1)).toEqual([]);
  });
});

describe('unitUpkeepRebate: a shilling off each soldier', () => {
  it('joins the payroll’s one give-back list, floored at what a piece costs', () => {
    const row = plantableWith('unitUpkeepRebate');
    expect(row).toBeDefined();
    const { id, effect } = row!;
    expect(effect.fromAge).toBe(3);

    const state = flatState();
    standIn(state, 0, 3);
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    createUnit(state, 0, 'warrior', 6, 6);
    createUnit(state, 0, 'warrior', 6, 7);
    // A settler pays nothing, so nothing may be rebated off it — the clamp is
    // per piece and `unitUpkeepOf` is what says which pieces there are.
    createUnit(state, 0, 'settler', 6, 8);
    const gross = unitUpkeepTotal(state, 0);
    expect(gross).toBeGreaterThan(0);

    expect(explainUnitUpkeepRebate(state, 0)).toEqual([]);
    at(state.map, 7, 5).hills = true;
    plant(state, city, 7, 5, id);

    const rebate = explainUnitUpkeepRebate(state, 0);
    expect(rebate).toHaveLength(1);
    expect(rebate[0]!.source).toContain(resourceDef(id).name);
    // Two soldiers at a warrior's own price: the shilling is taken off each, and
    // never off more than the piece was being charged.
    expect(rebate[0]!.gold).toBe(Math.min(effect.amount, unitUpkeep('warrior')) * 2);
    expect(rebate[0]!.gold).toBeLessThanOrEqual(gross);

    // And it is the *same list* the law's rebates land in — one give-back on the
    // ledger, never a second subtraction under the charge.
    const ledger = explainEmpireGold(state, 0);
    expect(ledger.some((line) => line.source.includes(resourceDef(id).name))).toBe(true);
    expect(ledger.find((line) => line.source.startsWith('Unit maintenance'))!.gold).toBe(-gross);
  });
});

describe('connectionPercent: a share of what the roads pay', () => {
  it('rides the connections line of the empire ledger, floored once', () => {
    const row = plantableWith('connectionPercent');
    expect(row).toBeDefined();
    const { id, effect } = row!;
    expect(effect.fromAge).toBe(3);

    const { state, first, second } = twoCities();
    standIn(state, 0, 3);
    // Big enough that a tenth of the connection's coin is a whole coin: the
    // share is floored **once**, so a small connection legitimately rounds it
    // away and this test would be asserting the flooring rather than the share.
    second.population = 24;
    // A road all the way home, so the flood fill reaches the second town.
    for (let col = 6; col <= 20; col++) at(state.map, col, 5).road = 0;

    const connections = (list: ReturnType<typeof explainEmpireGold>): number =>
      list.find((line) => line.source.startsWith('City connections'))?.gold ?? 0;
    const before = explainEmpireGold(state, 0);
    expect(connections(before)).toBeGreaterThan(0);
    expect(before.some((line) => line.source.includes(resourceDef(id).name))).toBe(false);

    at(state.map, 7, 5).hills = true;
    plant(state, first, 7, 5, id);
    const after = explainEmpireGold(state, 0);
    // The connections line itself is untouched — the share is its **own** line,
    // after it, exactly as the payroll's rebates sit after the payroll.
    expect(connections(after)).toBe(connections(before));
    const share = after.find((line) => line.source.includes(resourceDef(id).name));
    expect(share).toBeDefined();
    expect(share!.gold).toBe(Math.floor((connections(before) * effect.percent) / 100));
    expect(share!.gold).toBeGreaterThan(0);
    // Rule 5: the treasury's figure is the fold of the list, with the share in it.
    expect(empireGold(state, 0)).toBe(after.reduce((sum, line) => sum + line.gold, 0));
    expect(resourceConnectionPercent(state, 0)).toHaveLength(1);
  });
});

// --- the two modifiers ------------------------------------------------------

describe('fromAge: the second tier', () => {
  it('switches on at exactly the age it names, and not one age earlier', () => {
    const late = plantableWith('perCityYields', (effect) => effect.fromAge === 3) ??
      plantableWith('percentYields', (effect) => effect.fromAge === 3);
    expect(late).toBeDefined();
    const { id } = late!;

    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    plant(state, city, 7, 5, id);

    const lateLines = (): number =>
      resourceEffects(id).filter((effect) => effect.fromAge === 3).length;
    expect(lateLines()).toBeGreaterThan(0);

    const liveCount = (): number =>
      cityResourceYields(state, city).filter((line) => line.resource === id).length +
      resourcePercentYields(state, city).filter((line) => line.resource === id).length +
      resourceHappiness(state, 0).filter((line) => line.resource === id).length +
      resourceAuthority(state, 0).filter((line) => line.resource === id).length;

    standIn(state, 0, 1);
    const ancient = liveCount();
    standIn(state, 0, 2);
    // The boundary is at *three*: an empire in the Classical age has nothing more
    // than it had in the Ancient one, however close it is.
    expect(liveCount()).toBe(ancient);
    standIn(state, 0, 3);
    expect(liveCount()).toBeGreaterThan(ancient);
  });
});

describe('perCopy: the marked exception to uniqueness', () => {
  it('counts tiles rather than kinds, and only where the row says so', () => {
    // Silver and gold, and only their Æra III tiers — the round of 2026-09-02
    // moved both onto `perCityYields` (a food and a hammer a town, per copy) and
    // left the exception exactly where it was: the *base* tier of each row is a
    // flat coin a town however many veins are dug, and only the late line scales.
    const scaled = plantableWith('perCityYields', (effect) => effect.perCopy === true);
    expect(scaled).toBeDefined();
    const { id, effect } = scaled!;
    expect(effect.fromAge).toBe(3);
    const paid = (effect.food ?? 0) + (effect.production ?? 0) + (effect.gold ?? 0);
    expect(paid).toBeGreaterThan(0);

    const state = flatState();
    standIn(state, 0, 3);
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);

    plant(state, city, 7, 5, id);
    expect(resourceCopies(state, 0, id)).toBe(1);
    const perCopyLine = (): number =>
      foldOne(
        cityResourceYields(state, city).filter(
          (line) => line.resource === id && line.source.includes('copies'),
        ),
      );
    // One copy prints no "×n" note at all — the label only earns its keep when
    // the number is not one.
    expect(perCopyLine()).toBe(0);
    const oneCopy = foldOne(cityResourceYields(state, city).filter((l) => l.resource === id));

    plant(state, city, 5, 5, id);
    expect(resourceCopies(state, 0, id)).toBe(2);
    expect(foldOne(cityResourceYields(state, city).filter((l) => l.resource === id))).toBe(
      oneCopy + paid,
    );
    expect(perCopyLine()).toBe(paid * 2);

    plant(state, city, 6, 4, id);
    expect(resourceCopies(state, 0, id)).toBe(3);
    expect(foldOne(cityResourceYields(state, city).filter((l) => l.resource === id))).toBe(
      oneCopy + 2 * paid,
    );

    // And the *unique* lines on the same row are untouched by the second seam:
    // uniqueness is still the rule, this is still the exception.
    const flat = cityResourceYields(state, city).filter(
      (line) => line.resource === id && !line.source.includes('copies'),
    );
    expect(flat).toHaveLength(1);
  });

  it('stops counting a copy the moment it stops being a holding', () => {
    const scaled = plantableWith('perCityYields', (effect) => effect.perCopy === true)!;
    const state = flatState();
    standIn(state, 0, 3);
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    const first = plant(state, city, 7, 5, scaled.id);
    plant(state, city, 5, 5, scaled.id);
    expect(resourceCopies(state, 0, scaled.id)).toBe(2);
    // Pillaged: `openedResource` simply stops finding an improvement.
    delete first.improvement;
    expect(resourceCopies(state, 0, scaled.id)).toBe(1);
  });
});

// --- faith ------------------------------------------------------------------

describe('faith: banked, and spent by nothing', () => {
  it('rides the tile algebra and lands in the pool every turn', () => {
    const paying = RESOURCE_IDS.find((id) => resourceDef(id).yields.faith);
    expect(paying).toBeDefined();

    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    const tile = at(state.map, 7, 5);
    tile.terrain = 'desert';
    tile.resource = paying!;
    city.population = 1;
    city.lockedTiles = [{ col: 7, row: 5 }];

    const player = state.players[0]!;
    expect(player.faithPool).toBe(0);
    const yields = cityYields(state, city);
    // The citizen has not been assigned yet by this call, so bank a turn and
    // compare against the pool rather than assuming the assignment.
    expect(yields.faith).toBeGreaterThanOrEqual(0);
    collectYields(state);
    expect(player.faithPool).toBe(cityYields(state, city).faith);
    expect(player.faithPool).toBeGreaterThan(0);

    const before = player.faithPool;
    collectYields(state);
    expect(player.faithPool).toBe(before * 2);
  });

  it('pays a signature into the pool, once per turn', () => {
    const faithful = plantableWith('perCityYields', (effect) => (effect.faith ?? 0) > 0);
    expect(faithful).toBeDefined();
    const { id, effect } = faithful!;

    const state = flatState();
    const first = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, first);
    const second = foundCityAt(state, 0, at(state.map, 20, 5));
    growTerritory(state, second);

    const player = state.players[0]!;
    collectYields(state);
    const bare = player.faithPool;
    plant(state, first, 7, 5, id);
    collectYields(state);
    // Both cities are paid: this is a wide shape, so two towns is twice the
    // incense, off one grove.
    expect(player.faithPool - bare).toBeGreaterThanOrEqual(2 * (effect.faith ?? 0));
  });
});

// --- access -----------------------------------------------------------------

describe('a city standing on the seam', () => {
  /** A board with one city planted directly on a resource tile. */
  function settledOn(id: ResourceId, age: TechAge | null): { state: GameState; city: City } {
    const state = flatState();
    if (age === null) state.players[0]!.techsResearched = [];
    else standIn(state, 0, age);
    const site = at(state.map, 6, 5);
    site.resource = id;
    if (resourceDef(id).hills === true) site.hills = true;
    const city = foundCityAt(state, 0, site);
    return { state, city };
  }

  it('gives nothing before the improvement’s technology, and everything after', () => {
    // Gems are the ledger's own example: a mine opens them, so a capital founded
    // on a gem seam is worth nothing at all until Mining — and the turn Mining
    // lands the seam appears, with no flag written and no phase run.
    const id: ResourceId = 'gems';
    const needed = improvementDef(improvementForResource(id)!).requiresTech!;
    const { state } = settledOn(id, null);

    expect(hasResource(state, 0, id)).toBe(false);
    expect(controlledResources(state, 0, 'luxury')).not.toContain(id);

    state.players[0]!.techsResearched = [needed];
    expect(hasResource(state, 0, id)).toBe(true);
    expect(controlledResources(state, 0, 'luxury')).toContain(id);
  });

  it('says on the ledger that it is the town and not a mine', () => {
    const id: ResourceId = 'gems';
    const improvement = improvementDef(improvementForResource(id)!);
    const { state } = settledOn(id, 1);

    const holdings = controlledHoldings(state, 0, 'luxury');
    expect(holdings.find((holding) => holding.id === id)?.via).toBe('city');
    const line = explainHappiness(state, 0).find((entry) =>
      entry.source.startsWith(resourceDef(id).name),
    );
    expect(line!.source).toBe(`${resourceDef(id).name} · city`);
    expect(line!.source).not.toContain(improvement.name.toLowerCase());
  });

  it('is refused what it cannot be told is there', () => {
    // The precedence: the reveal binds *before* either way of working a seam.
    // Iron under a city is iron nobody has a word for until Bronze Working, and
    // this binds the improved path too — a mine dug on a hill for its hammers
    // does not hand its owner iron early.
    const id: ResourceId = 'iron';
    const reveal = resourceDef(id).requiresTech!;
    const improvement = improvementForResource(id)!;
    const needed = improvementDef(improvement).requiresTech!;

    const { state } = settledOn(id, null);
    state.players[0]!.techsResearched = [needed];
    expect(hasResource(state, 0, id)).toBe(false);
    state.players[0]!.techsResearched = [needed, reveal];
    expect(hasResource(state, 0, id)).toBe(true);

    // Same rule, other path: an improved seam with no reveal is no supply.
    const other = flatState();
    other.players[0]!.techsResearched = [needed];
    const city = foundCityAt(other, 0, at(other.map, 6, 5));
    growTerritory(other, city);
    const seam = at(other.map, 7, 5);
    seam.hills = true;
    seam.resource = id;
    seam.improvement = improvement;
    expect(hasResource(other, 0, id)).toBe(false);
    other.players[0]!.techsResearched = [needed, reveal];
    expect(hasResource(other, 0, id)).toBe(true);
  });

  it('counts once when the same kind is both settled on and mined elsewhere', () => {
    const id: ResourceId = 'gems';
    const { state, city } = settledOn(id, 1);
    growTerritory(state, city);
    const once = happinessOf(state, 0);
    expect(controlledHoldings(state, 0, 'luxury').filter((h) => h.id === id)).toHaveLength(1);

    // A second seam, dug this time. Still one luxury — uniqueness does not care
    // how a holding came about — and the ledger now names the *mine*, because
    // the improved reading is the more specific fact and the one a pillage can
    // take away.
    plant(state, city, 7, 5, id);
    expect(happinessOf(state, 0)).toBe(once);
    const holdings = controlledHoldings(state, 0, 'luxury').filter((h) => h.id === id);
    expect(holdings).toHaveLength(1);
    expect(holdings[0]!.via).toBe('improvement');
  });

  it('follows the city when it changes hands', () => {
    const { state, city } = settledOn('gems', 1);
    standIn(state, 1, 1);
    expect(hasResource(state, 0, 'gems')).toBe(true);
    expect(hasResource(state, 1, 'gems')).toBe(false);
    city.ownerId = 1;
    expect(hasResource(state, 0, 'gems')).toBe(false);
    expect(hasResource(state, 1, 'gems')).toBe(true);
  });

  it('opens a sea seam under a town only once its owner can sail', () => {
    // The settled path read for the newest improvement. It used to be the
    // opposite assertion — a sea resource had no improvement, so a town standing
    // on one drew nothing by either path — and Entry XXVII is what changed it.
    // A city cannot in fact be founded on water (`foundingErrorAt` refuses), so
    // the rule is stated where it can be: the fishing boats' technology gates a
    // town's claim on the seam under it exactly as the mine's gates a capital
    // founded on gems.
    const state = flatState();
    const site = at(state.map, 6, 5);
    site.resource = 'pearls';
    foundCityAt(state, 0, site);
    expect(improvementForResource('pearls')).toBe('fishingBoats');
    const player = state.players[0]!;
    player.techsResearched = player.techsResearched.filter((id) => id !== 'sailing');
    expect(hasResource(state, 0, 'pearls')).toBe(false);
    standIn(state, 0, 1);
    expect(hasResource(state, 0, 'pearls')).toBe(true);
  });
});

// --- determinism ------------------------------------------------------------

describe('signatures and the replay', () => {
  /**
   * The evaluators themselves are pure functions of the board.
   *
   * Two boards built the same way, seam for seam, must agree on every line of
   * every list — which is the property the turn pipeline relies on when it banks
   * an empire signature once and the top bar quotes it a second time.
   */
  it('answers identically for two boards built the same way', () => {
    const build = (): GameState => {
      const state = flatState();
      standIn(state, 0, 3);
      const city = foundCityAt(state, 0, at(state.map, 6, 5));
      growTerritory(state, city);
      let col = 4;
      for (const id of resourcesOfKind('luxury')) {
        if (!plantable(id)) continue;
        plant(state, city, col, 5, id);
        col += 1;
        if (col > 8) break;
      }
      return state;
    };
    const first = build();
    const second = build();
    const city = (state: GameState): City => state.cities[0]!;

    expect(controlledHoldings(second, 0, 'luxury')).toEqual(controlledHoldings(first, 0, 'luxury'));
    expect(cityResourceYields(second, city(second))).toEqual(cityResourceYields(first, city(first)));
    expect(empireResourceYields(second, 0)).toEqual(empireResourceYields(first, 0));
    expect(resourceHappiness(second, 0)).toEqual(resourceHappiness(first, 0));
    expect(resourceAuthority(second, 0)).toEqual(resourceAuthority(first, 0));
    expect(cityYieldPercents(second, city(second))).toEqual(cityYieldPercents(first, city(first)));
    expect(happinessOf(second, 0)).toBe(happinessOf(first, 0));
    expect(authorityOf(second, 0)).toBe(authorityOf(first, 0));
  });

  it('keeps the top bar and the turn pipeline reading one list', () => {
    const state = flatState();
    standIn(state, 0, 3);
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    const before = civYields(state, 0);

    const wide = plantableWith('perCityYields', (effect) => effect.scope === undefined)!;
    plant(state, city, 7, 5, wide.id);
    const after = civYields(state, 0);
    expect(after.gold + after.culture + after.science + after.faith).toBeGreaterThan(
      before.gold + before.culture + before.science + before.faith,
    );

    // `collectYields` re-assigns citizens before it banks, and a new seam is a
    // tile a citizen wants — so the honest comparison is against the strip read
    // *after* the sweep, which is what a player sees on the turn that resolves.
    const player = state.players[0]!;
    const banked = player.gold;
    collectYields(state);
    expect(player.gold - banked).toBe(civYields(state, 0).gold);
  });
});
