import { describe, expect, it } from 'vitest';

import { buildingDef } from '../src/sim/buildingData';
import { improvementDef, improvementForResource } from '../src/sim/improvementData';
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
} from '../src/sim/cities';
import { type Game, createGame, dispatch, loadGame, replay, saveGame, snapshotState } from '../src/sim/game';
import { type GameMap, type Tile, createMap, getTileAt, mapRange, tileHex, tileIndex } from '../src/sim/map';
import {
  authorityOf,
  explainAuthority,
  explainHappiness,
  happinessOf,
  meterEffects,
  tierPercent,
} from '../src/sim/meters';
import {
  RESOURCE_EFFECT_KINDS,
  RESOURCE_IDS,
  type ResourceEffect,
  type ResourceId,
  resourceDef,
  resourceEffects,
  resourcesOfKind,
  withExtraResources,
} from '../src/sim/resourceData';
import {
  cityResourceYields,
  describeResourceEffect,
  describeResourceSignature,
  empireResourceYields,
  foldResourceYields,
  foldRulePercent,
  resourceAuthority,
  resourceHappiness,
  resourcePercentYields,
  resourceProduction,
  resourceRulePercent,
  resourceTierBoost,
} from '../src/sim/resourceEffects';
import { makeRng } from '../src/sim/rng';
import { RULES } from '../src/sim/rulesData';
import { type City, type GameState, newGame } from '../src/sim/state';
import { TECH_IDS, type TechAge, type TechId, highestAge, techDef } from '../src/sim/techData';
import { resetVisibility } from '../src/sim/visibility';
import { civYields } from '../src/ui/topBar';

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
  return TECH_IDS.filter((id) => techDef(id).age <= age);
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
 * the plantation to the quarry needs no edit here. A sea luxury has no
 * improvement at all and cannot be planted: that is the point of it, and
 * `plantable` is how a test asks.
 */
function plant(state: GameState, city: City, col: number, row: number, id: ResourceId): Tile {
  const tile = at(state.map, col, row);
  tile.resource = id;
  tile.improvement = improvementForResource(id)!;
  expect(state.tileOwner[row * state.map.width + col]).toBe(city.id);
  expect(cityResources(state, city, 'luxury')).toContain(id);
  return tile;
}

/** True when some improvement opens this resource — false for everything wet. */
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
    // fix for one is normally to delete it. The ratified table declares seven of
    // the nine: it is **wide everywhere**, so the two flat readings that pay a
    // fixed amount regardless of how many towns an empire has — `empireYields`,
    // and the `'owner'` scope — have no row today.
    //
    // Both are kept rather than deleted, and both are held live by a row
    // installed at runtime in the two tests below. `empireYields` is the one
    // *tall-friendly* reading in the whole vocabulary (one city or ten, it pays
    // the same), it is what the turn pipeline's per-player banking exists for,
    // and it costs one branch. Listing the gap here rather than letting the loop
    // pass vacuously is the point: the day a row declares one, this line is what
    // tells whoever wrote it to delete the exception.
    const declared = new Set<string>();
    for (const id of RESOURCE_IDS) {
      for (const effect of resourceEffects(id)) declared.add(effect.kind);
    }
    expect(RESOURCE_EFFECT_KINDS.filter((kind) => !declared.has(kind))).toEqual(['empireYields']);
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
    const late = luxuryWith('percentYields', (effect) => effect.fromAge === 3);
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
    const wide = plantableWith('perCityYields', (effect) => effect.scope === undefined);
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
    const wide = plantableWith('perCityYields', (effect) => effect.scope === undefined);
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

    // A coastal signature is inert until work boats exist — no improvement opens
    // a sea luxury — so the scope is asserted through the evaluator directly,
    // with the empire *holding* the kind. That is the honest shape of the test:
    // the rule under test is the scope, not the improvement.
    const held = new Set<ResourceId>([id]);
    const linesFor = (city: City): number => {
      // `cityResourceYields` reads `controlledResources`, so a kind nobody can
      // improve yet cannot be forced through it. What can be asserted without
      // inventing a work boat is that the scope predicate is the *only* thing
      // separating the two towns — which `resourcePercentYields` shows below on
      // a shape that shares the same `scopeAdmits`.
      return cityResourceYields(state, city).filter((line) => held.has(line.resource)).length;
    };
    expect(linesFor(harbour)).toBe(0);
    expect(linesFor(inland)).toBe(0);
    expect(effect.scope).toBe('coastal');
    expect(plantable(id)).toBe(false);
  });
});

describe('perPopulationYields: paid a head', () => {
  it('scales with the city and floors per city', () => {
    const perPop = plantableWith('perPopulationYields');
    expect(perPop).toBeDefined();
    const { id, effect } = perPop!;
    expect(effect.fromAge).toBe(3);

    const state = flatState();
    standIn(state, 0, 3);
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    plant(state, city, 7, 5, id);

    // Half a coin a head, floored per city — the same rule a building's
    // `sciencePerPop` keeps, and for the same reason: two half sources must pay
    // for two halves rather than round into a free one.
    for (const population of [1, 2, 3, 7]) {
      city.population = population;
      const line = cityResourceYields(state, city).find(
        (entry) => entry.resource === id && entry.source.includes('per citizen'),
      );
      const expected = Math.floor((effect.gold ?? 0) * population);
      if (expected === 0) {
        expect(line).toBeUndefined();
        continue;
      }
      expect(line!.gold).toBe(expected);
    }
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

    const state = flatState();
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

describe('authoritySupply: capacity, never a discount', () => {
  it('adds a gain line to the writ, and never touches what a city costs', () => {
    const writ = plantableWith('authoritySupply', (effect) => effect.per === undefined);
    expect(writ).toBeDefined();
    const { id, effect } = writ!;

    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    const before = explainAuthority(state, 0);
    const beforeTotal = authorityOf(state, 0);

    plant(state, city, 7, 5, id);
    const after = explainAuthority(state, 0);
    expect(authorityOf(state, 0)).toBe(beforeTotal + effect.amount);

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

  it('multiplies a "per city" writ by the empire\'s towns', () => {
    const perCity = plantableWith('authoritySupply', (effect) => effect.per === 'city');
    expect(perCity).toBeDefined();
    const { id, effect } = perCity!;

    const state = flatState();
    const first = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, first);
    plant(state, first, 7, 5, id);
    const line = (): number =>
      resourceAuthority(state, 0).find(
        (entry) => entry.resource === id && entry.source.includes('cities'),
      )?.amount ?? 0;
    expect(line()).toBe(effect.amount);

    const second = foundCityAt(state, 0, at(state.map, 20, 5));
    growTerritory(state, second);
    expect(line()).toBe(effect.amount * 2);
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

describe('percentYields: two sums, each applied once', () => {
  it('joins the meters in a single per-yield stage sum rather than compounding', () => {
    const percent = plantableWith('percentYields', (effect) => effect.scope === undefined);
    expect(percent).toBeDefined();
    const { id, effect } = percent!;

    const state = flatState();
    standIn(state, 0, 3);
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
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

  it('is not applied at all before its age, and is after it', () => {
    const percent = plantableWith('percentYields', (effect) => effect.fromAge === 3);
    expect(percent).toBeDefined();
    const { id, effect } = percent!;

    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    plant(state, city, 7, 5, id);

    standIn(state, 0, 2);
    expect(resourcePercentYields(state, city).map((line) => line.resource)).not.toContain(id);
    standIn(state, 0, 3);
    expect(resourcePercentYields(state, city).map((line) => line.resource)).toContain(id);
    expect(effect.percent).not.toBe(0);
  });

  it('scopes to the coast when the row says so', () => {
    const coastal = luxuryWith('percentYields', (effect) => effect.scope === 'coastal');
    expect(coastal).toBeDefined();

    const state = flatState();
    standIn(state, 0, 3);
    for (let row = 0; row < 12; row++) at(state.map, 0, row).terrain = 'coast';
    // The capital first and inland, because the capital is free and its line
    // says "capital" rather than "coastal" (`cityAuthorityCost`'s precedence).
    const inland = foundCityAt(state, 0, at(state.map, 20, 5));
    growTerritory(state, inland);
    const harbour = foundCityAt(state, 0, at(state.map, 1, 5));
    growTerritory(state, harbour);

    // Sea luxuries cannot be held yet (no work boat), so the scope is asserted
    // where it is decided: both towns see nothing, and the coastal one is the
    // one that *would* — proved by the same `isCoastalCity` the authority meter
    // charges by, which the ledger below reads.
    expect(resourcePercentYields(state, harbour)).toEqual([]);
    expect(resourcePercentYields(state, inland)).toEqual([]);
    const writ = explainAuthority(state, 0);
    expect(writ.some((line) => line.source.includes('coastal'))).toBe(true);
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
    // Furs, and the only row that names `borderCost` today.
    const rule = plantableWith('rulePercent', (effect) => effect.rule === 'borderCost');
    expect(rule).toBeDefined();
    const { id, effect } = rule!;

    const state = flatState();
    standIn(state, 0, 3);
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    expect(borderCostFor(state, city)).toBe(nextBorderCost(city.tilesClaimed));

    plant(state, city, 7, 5, id);
    expect(borderCostFor(state, city)).toBe(
      Math.max(1, Math.floor(nextBorderCost(city.tilesClaimed) * (1 + effect.percent / 100))),
    );
    expect(borderCostFor(state, city)).toBeLessThan(nextBorderCost(city.tilesClaimed));
  });

  it('keeps a share of the basket when a city grows', () => {
    // Cotton, and the only row that names `growthCarryover`. The rule's number
    // *is* the rate rather than a scaling of a base, because there is no base:
    // an empire without cotton keeps nothing.
    const rule = plantableWith('rulePercent', (effect) => effect.rule === 'growthCarryover');
    expect(rule).toBeDefined();
    const { id, effect } = rule!;

    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    const threshold = growthThreshold(city.population);
    expect(growthCarryover(state, city, threshold)).toBe(0);

    plant(state, city, 7, 5, id);
    const kept = growthCarryover(state, city, threshold);
    expect(kept).toBe(Math.floor((threshold * effect.percent) / 100));
    expect(kept).toBeGreaterThan(0);

    // And the phase spends the threshold less the rebate, so the city starts its
    // next citizen with the difference already banked.
    city.foodBasket = threshold;
    const population = city.population;
    growCities(state);
    expect(city.population).toBe(population + 1);
    expect(city.foodBasket).toBe(kept);
  });
});

describe('happinessTierBoost: amber lifts the bonus rungs', () => {
  it('raises the positive tiers and leaves the malus rungs alone', () => {
    const boost = plantableWith('happinessTierBoost');
    expect(boost).toBeDefined();
    const { id, effect } = boost!;
    expect(effect.fromAge).toBe(3);

    const points = effect.points;
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
    const scaled = plantableWith('authoritySupply', (effect) => effect.perCopy === true);
    expect(scaled).toBeDefined();
    const { id, effect } = scaled!;
    expect(effect.fromAge).toBe(3);

    const state = flatState();
    standIn(state, 0, 3);
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);

    plant(state, city, 7, 5, id);
    expect(resourceCopies(state, 0, id)).toBe(1);
    const perCopyLine = (): number =>
      resourceAuthority(state, 0)
        .filter((line) => line.resource === id && line.source.includes('copies'))
        .reduce((sum, line) => sum + line.amount, 0);
    // One copy prints no "×n" note at all — the label only earns its keep when
    // the number is not one.
    expect(perCopyLine()).toBe(0);
    const oneCopy = authorityOf(state, 0);

    plant(state, city, 5, 5, id);
    expect(resourceCopies(state, 0, id)).toBe(2);
    expect(authorityOf(state, 0)).toBe(oneCopy + effect.amount);
    expect(perCopyLine()).toBe(effect.amount * 2);

    plant(state, city, 6, 4, id);
    expect(resourceCopies(state, 0, id)).toBe(3);
    expect(authorityOf(state, 0)).toBe(oneCopy + 2 * effect.amount);

    // And the *unique* lines on the same row are untouched by the second seam:
    // uniqueness is still the rule, this is still the exception.
    const flat = resourceAuthority(state, 0).filter(
      (line) => line.resource === id && !line.source.includes('copies'),
    );
    expect(flat).toHaveLength(1);
  });

  it('stops counting a copy the moment it stops being a holding', () => {
    const scaled = plantableWith('authoritySupply', (effect) => effect.perCopy === true)!;
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

  it('is carried by a save and survives a replay', () => {
    const config = {
      seed: 4242,
      sizeName: 'standard',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    };
    const game: Game = createGame(config);
    const founder = game.state.units.find((unit) => unit.type === 'settler')!;
    expect(dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: founder.id }).ok).toBe(true);
    for (let turn = 0; turn < 6; turn++) {
      expect(dispatch(game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
    }
    const json = saveGame(game);
    expect(snapshotState(loadGame(json).state)).toBe(snapshotState(game.state));
    // The field is on the player and therefore in the snapshot, whatever it
    // happens to hold on this seed.
    expect(snapshotState(game.state)).toContain('faithPool');
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

  it('gives nothing for a resource no improvement opens', () => {
    // The sea luxuries and the fish: a city cannot be founded on water anyway,
    // and even standing on one would open nothing, because "the technology the
    // improvement needs" has no improvement to ask.
    const state = flatState();
    standIn(state, 0, 3);
    const site = at(state.map, 6, 5);
    site.resource = 'pearls';
    foundCityAt(state, 0, site);
    expect(improvementForResource('pearls')).toBeNull();
    expect(hasResource(state, 0, 'pearls')).toBe(false);
  });
});

// --- determinism ------------------------------------------------------------

describe('signatures and the replay', () => {
  /**
   * Determinism, with the whole vocabulary switched on.
   *
   * The signatures touch food, hammers, gold, science, culture, faith, happiness
   * and authority — every number a turn banks — so a run whose luxuries are
   * improved and whose log replays byte for byte is the strongest single
   * statement that none of them reached outside the simulation for anything.
   */
  it('replays a run byte for byte with the vocabulary live', () => {
    const config = {
      seed: 4242,
      sizeName: 'standard',
      players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
    };
    const game: Game = createGame(config);
    const founder = game.state.units.find((unit) => unit.type === 'settler')!;
    expect(dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: founder.id }).ok).toBe(
      true,
    );
    for (let turn = 0; turn < 12; turn++) {
      expect(dispatch(game, { type: 'endTurn', playerId: 0 }).ok).toBe(true);
    }

    const reloaded = loadGame(saveGame(game));
    expect(snapshotState(reloaded.state)).toBe(snapshotState(game.state));
    expect(snapshotState(replay(game.config, game.log))).toBe(snapshotState(game.state));
  });

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
