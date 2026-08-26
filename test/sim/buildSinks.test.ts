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
  foundingErrorAt,
  planProduction,
  productionModifiers,
  queueItemCost,
  queueItemName,
  settleProductionWindfall,
  turnsToBuild,
  unitProductionCost,
} from '../../src/sim/cities';
import { type Game, createGame, dispatch } from '../../src/sim/game';
import { type GameMap, type Tile, createMap, getTileAt, mapRange, tileHex } from '../../src/sim/map';
import { explainHappiness, happinessOf } from '../../src/sim/meters';
import { PROJECT_IDS, projectDef, projectRate } from '../../src/sim/projectData';
import { RULES } from '../../src/sim/rulesData';
import { type City, type GameState, createUnit, newGame } from '../../src/sim/state';
import { PROJECT_UNLOCK_TECH, TECH_IDS, UNIT_UNLOCK_TECH, techDef } from '../../src/sim/techData';
import { availableTechs, buildError, gatingTech, isUnlocked } from '../../src/sim/tech';
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

/** The nearest tile a city could legally stand on, or null. `tech.test.ts`'s. */
function nearestSite(
  state: GameState,
  col: number,
  row: number,
): { col: number; row: number } | null {
  const from = state.map.tiles.find((tile) => tile.col === col && tile.row === row);
  if (!from) return null;
  let best: { col: number; row: number } | null = null;
  let bestDistance = Infinity;
  for (const tile of mapRange(state.map, tileHex(from), 8)) {
    if (foundingErrorAt(state, 0, tile) !== null) continue;
    const distance = Math.abs(tile.col - col) + Math.abs(tile.row - row);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { col: tile.col, row: tile.row };
    }
  }
  return best;
}

/**
 * `statecraftPacing.test.ts`'s scripted empire, playing the **military** line:
 * expand to five towns, then muster the strongest footman it can field, for
 * ever. Deliberately the same seed and the same conservative script, so the
 * only thing between this measurement and that file's is what the empire spends
 * its hammers on.
 */
function playWarband(maxTurns: number): Game {
  const game = createGame({
    seed: 4242,
    sizeName: 'standard',
    players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
  });
  const CITY_TARGET = 5;

  for (let turn = 0; turn < maxTurns; turn++) {
    const player = game.state.players[0]!;
    // Answer whatever Statecraft is owed, always option 0: this measures the
    // roster's price, not the choices.
    if (player.statecraft.pendingOrder !== undefined) {
      dispatch(game, { type: 'chooseOrder', playerId: 0, optionIndex: 0 } as Command);
    }
    if (player.statecraft.pendingGovernment !== undefined) {
      dispatch(game, { type: 'adoptGovernment', playerId: 0, choiceIndex: 0 } as Command);
    }
    if (player.statecraft.pendingDoctrine !== undefined) {
      dispatch(game, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 } as Command);
    }
    if (player.researching === null) {
      const next = [...availableTechs(game.state, 0)].sort(
        (a, b) => techDef(a).cost - techDef(b).cost || TECH_IDS.indexOf(a) - TECH_IDS.indexOf(b),
      )[0];
      if (next) dispatch(game, { type: 'chooseResearch', playerId: 0, techId: next } as Command);
    }
    for (const unit of [...game.state.units]) {
      if (!unitDef(unit.type).foundsCity) continue;
      if (dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: unit.id }).ok) continue;
      if (unit.path && unit.path.length > 0) continue;
      const target = nearestSite(game.state, unit.col, unit.row);
      if (target) dispatch(game, { type: 'moveUnit', playerId: 0, unitId: unit.id, target });
    }
    for (const city of game.state.cities) {
      if (city.queue.length > 0) continue;
      const settlersOut =
        game.state.units.filter((unit) => unitDef(unit.type).foundsCity).length +
        game.state.cities.filter((other) =>
          other.queue.some((item) => item.kind === 'unit' && item.id === 'settler'),
        ).length;
      const queue: { kind: string; id: string }[] = [];
      if (
        game.state.cities.length + settlersOut < CITY_TARGET &&
        city.population >= unitDef('settler').minCityPop
      ) {
        queue.push({ kind: 'unit', id: 'settler' });
      } else {
        const pick = UNIT_TYPE_IDS.filter(
          (id) =>
            unitDef(id).category === 'military' &&
            isUnlocked(game.state, 0, 'unit', id) &&
            unitDef(id).requiresResource === undefined,
        ).sort((a, b) => unitDef(b).combatStrength - unitDef(a).combatStrength)[0];
        if (pick) queue.push({ kind: 'unit', id: pick });
      }
      if (queue.length === 0) continue;
      dispatch(game, { type: 'setCityProduction', playerId: 0, cityId: city.id, queue } as Command);
    }
    dispatch(game, { type: 'endTurn', playerId: 0 });
  }
  return game;
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
    expect(techGifts('letters').map((gift) => gift.kind)).toEqual(['building', 'project']);
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
    const gifts = techGifts('stonecraft').filter((gift) => gift.kind === 'building');
    expect(gifts.map((gift) => gift.id)).toEqual(['monument', 'palisade']);
    const games = techGifts('bronzeWorking').filter((gift) => gift.kind === 'building');
    expect(games.map((gift) => gift.id)).toEqual(['barracks', 'funeralGames']);
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
  it('leaves the median capital opening on three hammers, scout unmoved', () => {
    const openings: number[] = [];
    for (const seed of [
      4242, 1, 2, 3, 7, 11, 42, 99, 777, 1234, 2024, 2468, 31337, 555, 8888, 90210, 5, 6, 8, 9, 12,
    ]) {
      const game = createGame({
        seed,
        sizeName: 'standard',
        players: [{ name: 'Ada', color: '#d4502e', isHuman: true }],
      });
      const founder = game.state.units.find((unit) => unitDef(unit.type).foundsCity)!;
      expect(dispatch(game, { type: 'foundCity', playerId: 0, settlerUnitId: founder.id }).ok).toBe(
        true,
      );
      openings.push(cityYields(game.state, game.state.cities[0]!).production);
    }
    openings.sort((a, b) => a - b);
    const median = openings[Math.floor(openings.length / 2)]!;

    /**
     * **Measured 2026-08-26, 21 seeds.** The median capital opens on **3⚙**
     * (band 2–4), unchanged by this pass — the pass moved prices, not ground.
     * Against that rate:
     *
     *   scout    9⚙ → **3 turns** (the anchor; deliberately not raised)
     *   warrior  5⚙ → 7⚙, **2 turns → 3**
     *   worker   8⚙ → 10⚙, **3 turns → 4**
     *
     * Three turns for the opening piece either way is the shape the opening is
     * balanced around, and the warrior joining the scout there is the whole
     * intent: a first unit is now a *turn* of commitment rather than a rounding
     * error against a 15🔬 technology.
     */
    expect(median).toBe(3);
    expect(openings[0]).toBeGreaterThanOrEqual(2);
    expect(openings[openings.length - 1]).toBeLessThanOrEqual(6);
    expect(Math.ceil(unitDef('scout').cost / median)).toBe(3);
    expect(Math.ceil(unitDef('warrior').cost / median)).toBe(3);
    expect(Math.ceil(unitDef('worker').cost / median)).toBe(4);
  }, 60_000);

  it('costs the warband empire a quarter of its army by turn 40', () => {
    const game = playWarband(40);
    const mine = game.state.units.filter((unit) => unit.ownerId === 0);

    /**
     * **Measured 2026-08-26 on seed 4242**, the same scripted empire the ages
     * and the draft cadence are measured against, playing the *military* line:
     * five cities' worth of expansion first, then nothing but the strongest
     * footman it can field. At turn 40 it fields
     *
     *   before this pass   **8 units** (6 warriors, 2 spearmen), 3 cities
     *   after              **6 units** (5 warriors, 1 spearman), 3 cities
     *
     * — a **25% cut**, which is the pass's whole claim about the roster. Note
     * what did *not* change: the city count, the technology count (9 either
     * way) and the map. The empire researches at the same rate and simply
     * cannot buy as much army with it, which is the finding the pass was
     * answering.
     *
     * The building-first empire measured 4 units at turn 40 both before and
     * after — it is hammer-bound on settlers and granaries rather than on the
     * roster, so the price change is invisible to it. That is the right
     * asymmetry: this pass taxes the player who was spamming units, not the
     * one who was building.
     *
     * A band on both sides, for `statecraftPacing.test.ts`'s reason. The lower
     * bound is what stops a later retune quietly making units free again.
     */
    expect(game.state.turn).toBe(41);
    expect(game.state.cities.length).toBe(3);
    expect(mine.length).toBeGreaterThanOrEqual(5);
    expect(mine.length).toBeLessThanOrEqual(7);
    expect(game.state.players[0]!.techsResearched.length).toBe(9);
  }, 120_000);

  it('leaves what ground is worth untouched: this was a price pass', () => {
    // The other half of "the opening did not move": nothing here touched what
    // ground is worth, so a city centre pays exactly what it paid.
    const state = flatState();
    const city = plant(state, 0, 5, 5);
    expect(centreYield(state, city).production).toBe(RULES.cities.baseCityYields.production);
  });
});
