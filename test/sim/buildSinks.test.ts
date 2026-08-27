/**
 * The build-sink pass: **a queue is never idle** (design ledger, Entry XXVI).
 *
 * Three things landed together because they are one playtest finding — "the
 * early game runs out of things to build, and units are too cheap against the
 * tech pace" — and this file holds all three:
 *
 *   1. **Repeatable projects.** Tithes and Scholarship: a queue row that costs
 *      hammers, pays a printed conversion, and never leaves the queue.
 *   2. **The roster's prices**, up ~40% in Age I with a mounted premium, and an
 *      age band on the later rosters so a late empire's science pace does not
 *      buy it units that are nearly free.
 *   3. **Two Age I building sinks**, the palisade and the funeral games, each
 *      declaring an effect through the generic vocabulary rather than a case.
 *
 * The measurements at the bottom are the pass's argument and are pinned as
 * bands rather than as memorised numbers, for `statecraftPacing.test.ts`'s
 * reason: a curve that got cheaper is as much a regression as one that got
 * dearer.
 */

import { describe, expect, it } from 'vitest';

import { buildingCityStat, buildingHappiness, foldBuildingCityStat } from '../../src/sim/buildingEffects';
import { buildingDef } from '../../src/sim/buildingData';
import { type Command, applyCommand } from '../../src/sim/commands';
import { previewCombat } from '../../src/sim/combat';
import {
  advanceProduction,
  centreYield,
  cityYields,
  explainUnitCost,
  foldUnitCost,
  foundCityAt,
  planProduction,
  productionModifiers,
  queueItemCost,
  queueItemName,
  settleProductionWindfall,
  turnsToBuild,
  unitProductionCost,
} from '../../src/sim/cities';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { explainHappiness, happinessOf } from '../../src/sim/meters';
import { PROJECT_IDS, projectDef, projectRate } from '../../src/sim/projectData';
import { RULES } from '../../src/sim/rulesData';
import { type City, type GameState, createUnit, newGame } from '../../src/sim/state';
import { PROJECT_UNLOCK_TECH, UNIT_UNLOCK_TECH, techDef } from '../../src/sim/techData';
import { buildError, gatingTech, isUnlocked } from '../../src/sim/tech';
import { techGifts } from '../../src/sim/techUnlocks';
import { UNIT_TYPE_IDS, unitDef } from '../../src/sim/unitData';
import { resetVisibility } from '../../src/sim/visibility';

// --- the bench --------------------------------------------------------------

function flatState(width = 16, height = 12): GameState {
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
  state.nextEntityId = 1;
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** A city with every technology in the game, so no gate is in the way. */
function plant(state: GameState, ownerId: number, col: number, row: number): City {
  return foundCityAt(state, ownerId, at(state.map, col, row));
}

/** Hands a seat the four Age I nodes this pass hangs its content off. */
function knowEverything(state: GameState, playerId: number): void {
  const player = state.players[playerId]!;
  for (const tech of ['calendar', 'letters', 'stonecraft', 'bronzeWorking'] as const) {
    if (!player.techsResearched.includes(tech)) player.techsResearched.push(tech);
  }
}

// --- 1. projects ------------------------------------------------------------

describe('a project is a queue row that never leaves', () => {
  it('completes without being spliced out, and is charged again next turn', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    city.queue = [{ kind: 'project', id: 'tithes' }];
    const cost = projectDef('tithes').cost;

    // One completion: the hammers go, the gold arrives, the row stays.
    city.hammerBasket = cost;
    const before = state.players[0]!.gold;
    const done = settleProductionWindfall(state, city);
    expect(done?.name).toBe('Tithes');
    expect(city.queue).toEqual([{ kind: 'project', id: 'tithes' }]);
    expect(city.hammerBasket).toBe(0);
    expect(state.players[0]!.gold).toBe(before + projectDef('tithes').pays.gold!);

    // And again, from a fresh basket, with no re-queueing anywhere.
    city.hammerBasket = cost;
    expect(settleProductionWindfall(state, city)?.name).toBe('Tithes');
    expect(city.queue).toHaveLength(1);
    expect(state.players[0]!.gold).toBe(before + 2 * projectDef('tithes').pays.gold!);
  });

  it('holds when the basket is short, and never drops', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    city.queue = [{ kind: 'project', id: 'scholarship' }];
    city.hammerBasket = projectDef('scholarship').cost - 1;

    expect(planProduction(state, city)).toBeNull();
    const before = state.players[0]!.sciencePool;
    advanceProduction(state);
    expect(city.queue).toHaveLength(1);
    expect(state.players[0]!.sciencePool).toBe(before);
    expect(city.hammerBasket).toBe(projectDef('scholarship').cost - 1);
  });

  it('keeps its remainder as the next conversion\'s down payment', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    city.queue = [{ kind: 'project', id: 'tithes' }];
    const cost = projectDef('tithes').cost;

    // A very good turn: two conversions' worth in the basket. At most **one**
    // completes per call — the phase's rule, which a project does not escape —
    // and the change is kept.
    city.hammerBasket = cost * 2 + 3;
    advanceProduction(state);
    expect(city.hammerBasket).toBe(cost + 3);
    expect(state.players[0]!.gold).toBe(projectDef('tithes').pays.gold!);
    advanceProduction(state);
    expect(city.hammerBasket).toBe(3);
    expect(state.players[0]!.gold).toBe(2 * projectDef('tithes').pays.gold!);
  });

  it('pays the printed figure and nothing multiplies it', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    city.queue = [{ kind: 'project', id: 'scholarship' }];

    // Entry XVIII.5's discipline, read for a conversion: the hammers were
    // already staged on their way into the basket (Entry XVII), so the payout
    // is immune to everything that stages a yield. Put the empire deep into a
    // happiness bonus — the empire-stage tier that multiplies science — and the
    // beakers must not move.
    const contented = happinessOf(state, 0);
    expect(contented).toBeGreaterThan(RULES.meters.tiers[0]!.whenAtOrAbove!);
    city.hammerBasket = projectDef('scholarship').cost;
    advanceProduction(state);
    expect(state.players[0]!.sciencePool).toBe(projectDef('scholarship').pays.science!);
  });

  it('carries no category bonus: a project is not a ProductionCategory', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    city.buildings.push('barracks');
    // The barracks pays toward units and only toward units. A project is not a
    // category a bonus may name, so the list is empty rather than matched.
    expect(productionModifiers(state, city, { kind: 'unit', id: 'warrior' })).toHaveLength(1);
    expect(productionModifiers(state, city, { kind: 'project', id: 'tithes' })).toEqual([]);
    const plain = cityYields(state, city).production;
    expect(cityYields(state, city, [], { kind: 'project', id: 'tithes' }).production).toBe(plain);
  });

  it('prices and estimates through the same two evaluators every row uses', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    city.queue = [{ kind: 'project', id: 'tithes' }];

    const cost = queueItemCost(state, 0, city.queue[0]!)!;
    expect(cost).toBe(projectDef('tithes').cost);
    expect(queueItemName(city.queue[0]!)).toBe('Tithes');

    // `turnsToBuild` needs no project clause: the interval between payouts and
    // "how long until this completes" are the same question for a repeatable
    // item, and the front row is the one that counts the basket.
    const rate = cityYields(state, city, [], city.queue[0]).production;
    expect(rate).toBeGreaterThan(0);
    city.hammerBasket = 0;
    expect(turnsToBuild(state, city, city.queue[0]!, 0)).toBe(Math.ceil(cost / rate));
    city.hammerBasket = cost - rate;
    expect(turnsToBuild(state, city, city.queue[0]!, 0)).toBe(1);
    // A row behind the front is quoted at full price, project or not.
    expect(turnsToBuild(state, city, city.queue[0]!, 1)).toBe(Math.ceil(cost / rate));
  });

  it('is reached by a windfall exactly as a building is', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    city.queue = [{ kind: 'project', id: 'tithes' }];
    // The preview half: what would this grant finish?
    const grant = projectDef('tithes').cost;
    expect(planProduction(state, city, city.hammerBasket + grant)?.kind).toBe('project');
  });
});

describe('a project is gated, once, by the tree', () => {
  it('names its technology and refuses a queue without it', () => {
    expect(PROJECT_UNLOCK_TECH.get('tithes')).toBe('calendar');
    expect(PROJECT_UNLOCK_TECH.get('scholarship')).toBe('letters');
    // Every project is gated: one available on turn one is a capital that never
    // has to choose what to do with its hammers.
    for (const id of PROJECT_IDS) expect(gatingTech('project', id)).not.toBeNull();

    const state = flatState();
    const city = plant(state, 0, 5, 5);
    expect(isUnlocked(state, 0, 'project', 'tithes')).toBe(false);
    expect(buildError(state, 0, 'project', 'tithes')).toBe('Tithes needs Calendar');

    const refused = applyCommand(state, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: city.id,
      queue: [{ kind: 'project', id: 'tithes' }],
    } as Command);
    expect(refused.ok).toBe(false);

    state.players[0]!.techsResearched.push('calendar');
    expect(buildError(state, 0, 'project', 'tithes')).toBeNull();
    expect(
      applyCommand(state, {
        type: 'setCityProduction',
        playerId: 0,
        cityId: city.id,
        queue: [{ kind: 'project', id: 'tithes' }],
      } as Command).ok,
    ).toBe(true);
    expect(city.queue).toEqual([{ kind: 'project', id: 'tithes' }]);
  });

  it('refuses the same project twice: the second copy could never be reached', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    const refused = applyCommand(state, {
      type: 'setCityProduction',
      playerId: 0,
      cityId: city.id,
      queue: [
        { kind: 'project', id: 'tithes' },
        { kind: 'project', id: 'tithes' },
      ],
    } as Command);
    expect(refused.ok).toBe(false);
    expect(city.queue).toEqual([]);
    // Two *different* projects are fine — the second is simply never reached
    // while the first stands, which is the player's own arrangement.
    expect(
      applyCommand(state, {
        type: 'setCityProduction',
        playerId: 0,
        cityId: city.id,
        queue: [
          { kind: 'project', id: 'tithes' },
          { kind: 'project', id: 'scholarship' },
        ],
      } as Command).ok,
    ).toBe(true);
  });

  it('rejects an unknown project id without touching the state', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    const before = JSON.stringify(state);
    expect(
      applyCommand(state, {
        type: 'setCityProduction',
        playerId: 0,
        cityId: city.id,
        queue: [{ kind: 'project', id: 'alchemy' }],
      } as unknown as Command).ok,
    ).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('shows up on its tech\'s gift list, as its own kind', () => {
    const tithes = techGifts('calendar').filter((gift) => gift.kind === 'project');
    expect(tithes.map((gift) => gift.id)).toEqual(['tithes']);
    expect(tithes[0]).toMatchObject({ name: 'Tithes', glyph: '↻' });
    // Letters also teaches Omen Reading, which is an ability (a rite is a verb,
    // hung on the tree's `abilities` key like embarkation) and sorts last. Two
    // buildings since the wonders' roster: the library, and the Great Ziggurat
    // standing on the same node — a wonder is an ordinary `unlocks.buildings`
    // entry, which is the whole of how it is homed.
    expect(techGifts('letters').map((gift) => gift.kind)).toEqual([
      'building',
      'building',
      'project',
      'ability',
    ]);
  });

  it('states its rate in one place', () => {
    // The label the panel and the star chart both print, so a retuned cost
    // cannot leave a stale sentence behind it.
    const glyphs = { gold: 'G', science: 'S', faith: 'F' };
    expect(projectRate('tithes', glyphs)).toBe('5G');
    expect(projectRate('scholarship', glyphs)).toBe('5S');
    // The rate the design ratified: four hammers to the coin.
    expect(projectDef('tithes').cost / projectDef('tithes').pays.gold!).toBe(4);
    expect(projectDef('scholarship').cost / projectDef('scholarship').pays.science!).toBe(4);
  });
});

// --- 2. what a unit costs ---------------------------------------------------

describe('the roster is priced in the money of its own age', () => {
  it('multiplies a unit by the band of the technology that unlocks it', () => {
    const state = flatState();
    const band = RULES.production.unitCostAgeMultiplier;
    expect(band[0]).toBe(1);
    for (const id of UNIT_TYPE_IDS) {
      // A great person is neither built nor bought, so it is not priced in
      // hammers at all — see `tech.test.ts`'s reading of the same exception.
      if (unitDef(id).greatWork === true) continue;
      const gate = UNIT_UNLOCK_TECH.get(id);
      // Every unit in the roster is gated; an ungated one would take band 1.
      expect(gate, id).toBeDefined();
      const age = techDef(gate!).age;
      expect(unitProductionCost(state, 0, id), id).toBe(
        Math.floor(unitDef(id).cost * (band[age - 1] ?? 1)),
      );
    }
  });

  it('leaves Age I where the opening is balanced and lifts the later rosters', () => {
    const state = flatState();
    // The anchor: the scout is three turns at the median opening rate and did
    // not move in this pass. Everything else in Age I went up ~40%.
    expect(unitProductionCost(state, 0, 'scout')).toBe(9);
    expect(unitProductionCost(state, 0, 'warrior')).toBe(7);
    expect(unitProductionCost(state, 0, 'worker')).toBe(10);
    expect(unitProductionCost(state, 0, 'spearman')).toBe(8);
    expect(unitProductionCost(state, 0, 'archer')).toBe(8);
    // The mounted premium, which is the pass's second half: a horse is a
    // decision arrived at sooner and now priced like one.
    expect(unitProductionCost(state, 0, 'horseman')).toBe(12);
    expect(unitProductionCost(state, 0, 'chariot')).toBe(17);
    expect(unitProductionCost(state, 0, 'chariotArcher')).toBe(14);
    // Age II at ×1.5, Age III at ×2, off the printed row.
    expect(unitProductionCost(state, 0, 'swordsman')).toBe(13);
    expect(unitProductionCost(state, 0, 'catapult')).toBe(16);
    expect(unitProductionCost(state, 0, 'pikeman')).toBe(24);
    expect(unitProductionCost(state, 0, 'knight')).toBe(32);
    expect(unitProductionCost(state, 0, 'trebuchet')).toBe(34);
  });

  it('is the fold of its own labelled lines, escalation included', () => {
    const state = flatState();
    for (const id of UNIT_TYPE_IDS) {
      expect(foldUnitCost(explainUnitCost(state, 0, id)), id).toBe(
        unitProductionCost(state, 0, id),
      );
    }
    // The settler's whole ladder, line by line, with the band's line absent
    // because a settler is Age I and multiplies by one.
    const settler = explainUnitCost(state, 0, 'settler');
    expect(settler).toEqual([{ source: 'Settler', amount: unitDef('settler').cost }]);
    state.players[0]!.settlersBuilt = 3;
    const escalated = explainUnitCost(state, 0, 'settler');
    expect(escalated.map((line) => line.source)).toEqual(['Settler', '3 already founded']);
    expect(foldUnitCost(escalated)).toBe(
      unitDef('settler').cost + 3 * unitDef('settler').costIncrement!,
    );
    // And a later-age unit says which band it is in.
    expect(explainUnitCost(state, 0, 'knight').map((line) => line.source)).toEqual([
      'Knight',
      'Æra III roster ×2',
    ]);
  });

  it('leaves the settler escalation the only thing an empire can move', () => {
    const state = flatState();
    for (const id of UNIT_TYPE_IDS) {
      if (unitDef(id).costIncrement !== undefined) continue;
      const priced = unitProductionCost(state, 0, id);
      state.players[0]!.settlersBuilt = 9;
      expect(unitProductionCost(state, 0, id), id).toBe(priced);
      state.players[0]!.settlersBuilt = 0;
    }
  });
});

// --- 3. the two Age I building sinks ---------------------------------------

describe('the funeral games pay a meter, generically', () => {
  it('folds into the happiness ledger as its own line', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    const before = happinessOf(state, 0);

    city.buildings.push('funeralGames');
    const supplied = buildingDef('funeralGames').happiness!;
    expect(supplied).toBe(3);
    expect(happinessOf(state, 0)).toBe(before + supplied);

    // The line, and the fold identity the meter is built on: the total is the
    // sum of the list and there is no second arithmetic beside it.
    const list = explainHappiness(state, 0);
    const line = list.find((entry) => entry.source === `${city.name} · Funeral Games`);
    expect(line).toEqual({ source: `${city.name} · Funeral Games`, part: 'gain', value: 3 });
    expect(buildingHappiness(state, 0)).toEqual([
      { source: `${city.name} · Funeral Games`, amount: 3 },
    ]);
  });

  it('pays the empire that holds the town, and stops when it does not', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    city.buildings.push('funeralGames');
    expect(buildingHappiness(state, 0)).toHaveLength(1);
    expect(buildingHappiness(state, 1)).toEqual([]);
    city.ownerId = 1;
    expect(buildingHappiness(state, 0)).toEqual([]);
    expect(buildingHappiness(state, 1)).toHaveLength(1);
  });
});

describe('the palisade is a wall the town built', () => {
  it('joins the forecast beside the walls a card would raise', () => {
    const state = flatState();
    knowEverything(state, 0);
    const city = plant(state, 0, 5, 5);
    const attacker = createUnit(state, 1, 'warrior', 5, 6);

    const bare = previewCombat(state, attacker.id, { col: 5, row: 5 });
    if (!bare.ok) throw new Error(bare.error);
    city.buildings.push('palisade');
    const walled = previewCombat(state, attacker.id, { col: 5, row: 5 });
    if (!walled.ok) throw new Error(walled.error);

    const added = buildingDef('palisade').cityStat!.amount;
    expect(added).toBe(5);
    expect(walled.defenderStrength).toBe(bare.defenderStrength + added);
    // A list, never a number: "+5" beside the walls with no reason is exactly
    // what a breakdown exists to prevent.
    expect(walled.defenderLines).toContainEqual({ source: 'Palisade', amount: added });
    expect(buildingCityStat(city, 'defense')).toEqual([{ source: 'Palisade', amount: added }]);
    expect(foldBuildingCityStat(buildingCityStat(city, 'defense'))).toBe(added);
    // And it says nothing about sight, which is the other half of the shape.
    expect(buildingCityStat(city, 'sight')).toEqual([]);
  });

  it('is handed over by Stonecraft, on the same list the monument is', () => {
    // The wonders homed on each node are on the same list and after the
    // ordinary rows, because that is the order `unlocks.buildings` carries.
    const gifts = techGifts('stonecraft').filter((gift) => gift.kind === 'building');
    expect(gifts.map((gift) => gift.id)).toEqual([
      'monument',
      'palisade',
      'stonehenge',
      'pyramids',
    ]);
    const games = techGifts('bronzeWorking').filter((gift) => gift.kind === 'building');
    expect(games.map((gift) => gift.id)).toEqual(['barracks', 'funeralGames', 'wallsOfUruk']);
  });

  it('costs what an Age I sink should: a real decision against a settler', () => {
    expect(buildingDef('palisade').cost).toBe(30);
    expect(buildingDef('funeralGames').cost).toBe(35);
    // Both dearer than the opening settler, which is the point of a sink: it is
    // the thing a town does when expansion is no longer the obvious answer.
    expect(buildingDef('palisade').cost).toBeGreaterThan(unitDef('settler').cost);
  });
});

// --- 4. the measurements ----------------------------------------------------

describe('what the pass did to the opening', () => {
  it('leaves what ground is worth untouched: this was a price pass', () => {
    // The other half of "the opening did not move": nothing here touched what
    // ground is worth, so a city centre pays exactly what it paid.
    const state = flatState();
    const city = plant(state, 0, 5, 5);
    expect(centreYield(state, city).production).toBe(RULES.cities.baseCityYields.production);
  });
});
