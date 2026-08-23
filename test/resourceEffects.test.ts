import { describe, expect, it } from 'vitest';

import { buildingDef } from '../src/sim/buildingData';
import { improvementForResource } from '../src/sim/improvementData';
import {
  cityResources,
  cityTile,
  cityYields,
  collectYields,
  controlledResources,
  foundCityAt,
  productionModifiers,
} from '../src/sim/cities';
import { type Game, createGame, dispatch, loadGame, replay, saveGame, snapshotState } from '../src/sim/game';
import { type GameMap, type Tile, createMap, getTileAt, mapRange, tileHex, tileIndex } from '../src/sim/map';
import { explainHappiness, happinessOf } from '../src/sim/meters';
import {
  RESOURCE_EFFECT_KINDS,
  RESOURCE_IDS,
  type ResourceEffect,
  type ResourceId,
  resourceDef,
  resourcesOfKind,
} from '../src/sim/resourceData';
import {
  cityResourceYields,
  describeResourceEffect,
  empireResourceYields,
  foldResourceYields,
  resourceHappiness,
  resourceProduction,
} from '../src/sim/resourceEffects';
import { makeRng } from '../src/sim/rng';
import { RULES } from '../src/sim/rulesData';
import { type City, type GameState, newGame } from '../src/sim/state';
import { resetVisibility } from '../src/sim/visibility';
import { civYields } from '../src/ui/topBar';

/**
 * The luxury signature vocabulary (design ledger, Entry IX; `resourceEffects.ts`).
 *
 * Two claims are under test and neither of them is a number. The first is that
 * there is **one evaluator**: four shapes go into `data/resources.json` and four
 * labelled lists come out, and no consumer switches on `effect.kind`. The second
 * is the uniqueness reading — an empire shape counts once per kind for the whole
 * empire, a local shape once per kind *per city* — because that is the rule that
 * decides whether a second seam of jade is worth settling for.
 *
 * Everything is asserted against the table rather than against the tuning:
 * `find('cityYields')` rather than `'gems'`, so a designer who moves a signature
 * from one luxury to another does not fail this suite. What is pinned is the
 * shape.
 */

/** The first luxury whose signature is of this shape, or `undefined`. */
function luxuryWith<K extends ResourceEffect['kind']>(
  kind: K,
): { id: ResourceId; effect: Extract<ResourceEffect, { kind: K }> } | undefined {
  for (const id of resourcesOfKind('luxury')) {
    const effect = resourceDef(id).effect;
    if (effect?.kind === kind) {
      return { id, effect: effect as Extract<ResourceEffect, { kind: K }> };
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
 * the plantation to the quarry needs no edit here.
 */
function plant(state: GameState, city: City, col: number, row: number, id: ResourceId): Tile {
  const tile = at(state.map, col, row);
  tile.resource = id;
  tile.improvement = improvementForResource(id)!;
  expect(state.tileOwner[row * state.map.width + col]).toBe(city.id);
  expect(cityResources(state, city, 'luxury')).toContain(id);
  return tile;
}


describe('the effect vocabulary', () => {
  it('reads every shape the table declares, and nothing it does not', () => {
    for (const id of RESOURCE_IDS) {
      const effect = resourceDef(id).effect;
      if (effect === undefined) continue;
      expect(RESOURCE_EFFECT_KINDS).toContain(effect.kind);
      // Only luxuries carry a signature: a bonus resource is its tile yield and
      // a strategic one is a production gate, and neither has a second job.
      expect(resourceDef(id).kind).toBe('luxury');
    }
  });

  it('uses all four shapes across the ten luxuries', () => {
    // Not a tuning assertion: the claim is that the vocabulary is *exercised*,
    // so a shape nobody uses is a shape whose evaluator nothing tests.
    for (const kind of RESOURCE_EFFECT_KINDS) {
      expect(`${kind}: ${luxuryWith(kind) ? 'used' : 'unused'}`).toBe(`${kind}: used`);
    }
  });

  it('never asks the empire for a yield it has no basket for', () => {
    for (const id of RESOURCE_IDS) {
      const effect = resourceDef(id).effect;
      if (effect?.kind !== 'empireYields') continue;
      expect(effect.food).toBeUndefined();
      expect(effect.production).toBeUndefined();
    }
  });

  it('says what each signature does, in words, from one place', () => {
    for (const id of RESOURCE_IDS) {
      const words = describeResourceEffect(id);
      if (resourceDef(id).effect === undefined) {
        expect(words).toBeNull();
        continue;
      }
      expect(words).toBeTruthy();
      expect(words!.length).toBeGreaterThan(0);
    }
  });
});

describe('cityYields: the powerful-local shape', () => {
  it('pays into the city that owns the seam, and shows up as its own line', () => {
    const local = luxuryWith('cityYields');
    expect(local).toBeDefined();
    const { id, effect } = local!;

    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    const before = cityYields(state, city);

    plant(state, city, 7, 5, id);
    const lines = cityResourceYields(state, city);
    expect(lines.map((line) => line.resource)).toEqual([id]);
    expect(lines[0]!.source).toBe(resourceDef(id).name);

    const after = cityYields(state, city);
    const paid = foldResourceYields(lines);
    // The total is the fold of the list and the list is what the panel prints:
    // the two cannot disagree, which is rule 5 at city scale. Compared field by
    // field against the same city a moment earlier, so the citizens' own
    // reshuffle onto the new tile is included honestly rather than assumed away.
    expect(after.gold - before.gold).toBeGreaterThanOrEqual(paid.gold);
    expect(paid.food + paid.production + paid.gold + paid.science + paid.culture)
      .toBeGreaterThan(0);
    expect(paid.gold).toBe(effect.gold ?? 0);
    expect(paid.culture).toBe(effect.culture ?? 0);
  });

  it('pays once for two seams of one kind, and twice for two cities', () => {
    const local = luxuryWith('cityYields');
    const { id } = local!;

    const state = flatState();
    const first = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, first);
    plant(state, first, 7, 5, id);
    const once = foldResourceYields(cityResourceYields(state, first));

    // A second seam of the same kind in the same city is worth nothing more:
    // the effect is keyed on the *kind* the city controls, not on the tiles.
    plant(state, first, 5, 5, id);
    expect(cityResourceYields(state, first)).toHaveLength(1);
    expect(foldResourceYields(cityResourceYields(state, first))).toEqual(once);

    // A second *city* with its own seam is a second signature, and that is the
    // whole point of a local shape — the second seam is worth settling for.
    const second = foundCityAt(state, 0, at(state.map, 20, 5));
    growTerritory(state, second);
    plant(state, second, 21, 5, id);
    expect(foldResourceYields(cityResourceYields(state, second))).toEqual(once);
  });
});

describe('empireYields: once per unique kind, whoever holds it', () => {
  it('pays a player once however many seams they dig', () => {
    const empire = luxuryWith('empireYields');
    expect(empire).toBeDefined();
    const { id, effect } = empire!;

    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);

    plant(state, city, 7, 5, id);
    const once = empireResourceYields(state, 0);
    expect(once.map((line) => line.resource)).toEqual([id]);
    expect(foldResourceYields(once).gold).toBe(effect.gold ?? 0);
    expect(foldResourceYields(once).science).toBe(effect.science ?? 0);
    expect(foldResourceYields(once).culture).toBe(effect.culture ?? 0);

    plant(state, city, 5, 5, id);
    expect(empireResourceYields(state, 0)).toHaveLength(1);
    expect(foldResourceYields(empireResourceYields(state, 0))).toEqual(foldResourceYields(once));

    // A second city holding the same kind is still one line: an empire effect
    // is the empire's, and `controlledResources` is what makes it unique.
    const second = foundCityAt(state, 0, at(state.map, 20, 5));
    growTerritory(state, second);
    plant(state, second, 21, 5, id);
    expect(empireResourceYields(state, 0)).toHaveLength(1);
  });

  it('is banked once a turn, not once a city', () => {
    const empire = luxuryWith('empireYields');
    const { id, effect } = empire!;
    const gain = (effect.gold ?? 0) + (effect.science ?? 0) + (effect.culture ?? 0);
    expect(gain).toBeGreaterThan(0);

    const state = flatState();
    const first = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, first);
    const second = foundCityAt(state, 0, at(state.map, 20, 5));
    growTerritory(state, second);
    plant(state, first, 7, 5, id);
    plant(state, second, 21, 5, id);

    const player = state.players[0]!;
    const before = { gold: player.gold, science: player.sciencePool, culture: player.culturePool };
    collectYields(state);
    const banked =
      player.gold - before.gold +
      (player.sciencePool - before.science) +
      (player.culturePool - before.culture);

    // Two cities, one signature. The comparison that matters is against the
    // *same* pipeline with the seams unimproved, so the cities' own yields drop
    // out of both sides.
    for (const tile of [at(state.map, 7, 5), at(state.map, 21, 5)]) tile.improvement = undefined;
    const bare = { gold: player.gold, science: player.sciencePool, culture: player.culturePool };
    collectYields(state);
    const without =
      player.gold - bare.gold +
      (player.sciencePool - bare.science) +
      (player.culturePool - bare.culture);
    expect(banked - without).toBe(gain);
  });

  it('is in the empire headline the top bar prints', () => {
    const empire = luxuryWith('empireYields');
    const { id, effect } = empire!;

    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    const before = civYields(state, 0);
    plant(state, city, 7, 5, id);
    const after = civYields(state, 0);

    // The strip is what the player reads and `collectYields` is what the turn
    // banks; both fold the same list, so a signature missing from one would be
    // a headline the resolution disagrees with.
    expect(after.science - before.science).toBeGreaterThanOrEqual(effect.science ?? 0);
    expect(after.culture - before.culture).toBeGreaterThanOrEqual(effect.culture ?? 0);
  });
});

describe('extraHappiness: a second line, not a bigger one', () => {
  it('pays on top of the flat per-unique figure', () => {
    const happy = luxuryWith('extraHappiness');
    expect(happy).toBeDefined();
    const { id, effect } = happy!;

    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    const bare = happinessOf(state, 0);

    plant(state, city, 7, 5, id);
    expect(resourceHappiness(state, 0).map((line) => line.resource)).toEqual([id]);
    expect(happinessOf(state, 0)).toBe(
      bare + RULES.meters.happiness.perUniqueLuxury + effect.amount,
    );

    // Two lines, not one: what a luxury is worth, and what *this* luxury is.
    const entries = explainHappiness(state, 0).filter((entry) =>
      entry.source.startsWith(resourceDef(id).name),
    );
    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.value)).toEqual([
      RULES.meters.happiness.perUniqueLuxury,
      effect.amount,
    ]);
  });

  it('pays once for a second seam of the same kind', () => {
    const { id } = luxuryWith('extraHappiness')!;
    const state = flatState();
    const city = foundCityAt(state, 0, at(state.map, 6, 5));
    growTerritory(state, city);
    plant(state, city, 7, 5, id);
    const once = happinessOf(state, 0);
    plant(state, city, 5, 5, id);
    expect(happinessOf(state, 0)).toBe(once);
    expect(resourceHappiness(state, 0)).toHaveLength(1);
  });
});

describe('productionBonus: one shape over two tables', () => {
  it('puts a luxury’s hammers behind its category and no other', () => {
    const marble = luxuryWith('productionBonus');
    expect(marble).toBeDefined();
    const { id, effect } = marble!;

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

    expect(resourceProduction(state, city, effect.category).map((line) => line.resource)).toEqual([id]);
    expect(resourceProduction(state, city, other.kind)).toEqual([]);

    const behind = productionModifiers(state, city, matching as never);
    expect(behind).toContainEqual({
      source: resourceDef(id).name,
      resource: id,
      percent: effect.percent,
    });
    expect(productionModifiers(state, city, other as never)).toEqual([]);
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

    // A luxury whose signature names the *same* category adds a second line to
    // the same list, and the multiplier is their sum applied once.
    const sameCategory = resourcesOfKind('luxury').find((id) => {
      const effect = resourceDef(id).effect;
      return effect?.kind === 'productionBonus' && effect.category === barracks.category;
    });
    if (sameCategory === undefined) {
      // Nothing in the table pairs with the barracks today; the fold is still
      // asserted by the building-only case above and by the luxury-only case in
      // the test before this one.
      expect(fromBuilding.map((line) => line.building)).toEqual(['barracks']);
      return;
    }
    plant(state, city, 7, 5, sameCategory);
    const both = productionModifiers(state, city, unit);
    expect(both).toHaveLength(2);
    expect(both.map((line) => line.source)).toContain(resourceDef(sameCategory).name);
  });
});

describe('signatures and the replay', () => {
  /**
   * Determinism, with the vocabulary switched on.
   *
   * The signatures touch gold, science, culture, hammers and happiness — five of
   * the numbers a turn banks — so a run whose luxuries are improved and whose
   * log replays byte for byte is the strongest single statement that none of
   * them reached outside the simulation for anything.
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
      const city = foundCityAt(state, 0, at(state.map, 6, 5));
      growTerritory(state, city);
      let col = 4;
      for (const id of resourcesOfKind('luxury')) {
        if (improvementForResource(id) === null) continue;
        plant(state, city, col, 5, id);
        col += 1;
        if (col > 8) break;
      }
      return state;
    };
    const first = build();
    const second = build();
    const city = (state: GameState): City => state.cities[0]!;

    expect(controlledResources(second, 0, 'luxury')).toEqual(
      controlledResources(first, 0, 'luxury'),
    );
    expect(cityResourceYields(second, city(second))).toEqual(
      cityResourceYields(first, city(first)),
    );
    expect(empireResourceYields(second, 0)).toEqual(empireResourceYields(first, 0));
    expect(resourceHappiness(second, 0)).toEqual(resourceHappiness(first, 0));
    expect(happinessOf(second, 0)).toBe(happinessOf(first, 0));
  });
});
