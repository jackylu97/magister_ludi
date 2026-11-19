import { describe, expect, it } from 'vitest';

import { valueContext } from '../../../src/ai/bot';
import { explainYields } from '../../../src/ai/prices';
import { boonTurns, explainCardEffects, onDraftWorth } from '../../../src/ai/value';
import { buildingProductionCost, foundCityAt, planProduction, unitProductionCost } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { raiseImprovement } from '../../../src/sim/map';
import { layRoad } from '../../../src/sim/roads';
import { bumpRevision, createUnit, type City, type GameState, type QueueItem } from '../../../src/sim/state';
import { describeCard, eligibleFor, stripRefs, tallyOf } from '../../../src/sim/statecraft';
import { orderDef, orderKeyword, type OrderId } from '../../../src/sim/statecraftData';
import { cityContext, explainTileYield, foldTileLines } from '../../../src/sim/yields/hex';
import { explainCity } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';

const GILDED = 'theGildedCountry';
const MEMORY = 'theLongMemory';
const RAISING = 'theGreatRaising';
const KILNS = 'theBrickKilns';
const PROGRAMME = 'theBuildingProgramme';

function draft(state: GameState, card: OrderId): void {
  state.players[0]!.statecraft.pendingOrder = { options: [card] };
  const result = applyCommand(state, { type: 'chooseOrder', playerId: 0, optionIndex: 0 });
  expect(result.ok, `${card}: ${JSON.stringify(result)}`).toBe(true);
}

function seat(state: GameState, card: OrderId, slotIndex: number): void {
  expect(applyCommand(state, { type: 'slotOrder', playerId: 0, cardId: card, slotIndex }).ok).toBe(true);
}

function queue(state: GameState, town: City, ...items: QueueItem[]): void {
  const result = applyCommand(state, {
    type: 'setCityProduction', playerId: town.ownerId, cityId: town.id, queue: items,
  });
  expect(result.ok, JSON.stringify(result)).toBe(true);
}

describe('The Long Memory', () => {
  it('requires an owned Scaler and doubles only future gains from seated Scalers', () => {
    const state = bareState();
    const home = foundCityAt(state, 0, at(state, 5, 5));
    const player = state.players[0]!;
    const sc = player.statecraft;
    const canDeal = () => eligibleFor(state, player, 18).includes(MEMORY);
    const worth = () => explainCardEffects(MEMORY, orderDef(MEMORY).effects, valueContext(state, player)).total;

    expect(canDeal()).toBe(false);
    draft(state, PROGRAMME);
    seat(state, PROGRAMME, 0);
    expect(canDeal()).toBe(false);

    draft(state, KILNS);
    expect(canDeal()).toBe(true);
    expect(worth()).toBe(0);
    seat(state, KILNS, 1);
    expect(worth()).toBeGreaterThan(0);

    player.gold = 100000;
    const buy = (id: 'monument' | 'library' | 'workshop' | 'market') => {
      expect(applyCommand(state, {
        type: 'purchaseItem', playerId: 0, cityId: home.id, item: { kind: 'building', id }, currency: 'gold',
      }).ok).toBe(true);
    };
    buy('monument');
    expect(tallyOf(sc, KILNS)).toBe(1);

    draft(state, MEMORY);
    buy('library');
    expect(tallyOf(sc, KILNS)).toBe(2);
    seat(state, MEMORY, 2);
    expect(tallyOf(sc, KILNS)).toBe(2);
    buy('workshop');
    expect(tallyOf(sc, KILNS)).toBe(4);
    expect(tallyOf(sc, PROGRAMME)).toBe(3);

    state.turn = sc.slots[2]!.sealedUntil;
    expect(applyCommand(state, { type: 'unslotOrder', playerId: 0, slotIndex: 2 }).ok).toBe(true);
    buy('market');
    expect(tallyOf(sc, KILNS)).toBe(5);
    expect(tallyOf(sc, PROGRAMME)).toBe(4);

    sc.tallies.find((tally) => tally.card === KILNS)!.count = 20;
    bumpRevision(state);
    expect(worth()).toBe(0);
  });
});

describe('The Gilded Country', () => {
  it('reads another Order’s gold and applies a whole-tile percentage afterward', () => {
    const state = bareState();
    const home = foundCityAt(state, 0, at(state, 5, 5));
    const player = state.players[0]!;
    const paid = at(state, 6, 5);
    const idle = at(state, 5, 4);
    const bare = at(state, 4, 5);
    layRoad(paid, 0);
    layRoad(idle, 0);
    raiseImprovement(paid, 'citadel', state.turn);
    expect(applyCommand(state, {
      type: 'setLockedTiles', playerId: 0, cityId: home.id, cells: [{ col: paid.col, row: paid.row }],
    }).ok).toBe(true);

    draft(state, GILDED);
    seat(state, GILDED, 0);
    player.statecraft.pendingDoctrine = { options: ['theStrategoi'] };
    expect(applyCommand(state, { type: 'chooseDoctrine', playerId: 0, optionIndex: 0 }).ok).toBe(true);
    const lines = (tile: typeof paid) => explainTileYield(tile, cityContext(state, home));
    const worth = () => explainCardEffects(GILDED, orderDef(GILDED).effects, valueContext(state, player)).total;
    expect(lines(paid).some((line) => line.card === GILDED)).toBe(false);
    expect(worth()).toBe(0);

    draft(state, 'marketGardens');
    seat(state, 'marketGardens', 1);
    const hexLines = lines(paid);
    expect(hexLines.filter((line) => line.card === GILDED)).toEqual([
      expect.objectContaining({ source: 'Order · The Gilded Country', gold: 1 }),
    ]);
    expect(hexLines.find((line) => line.card === 'marketGardens')?.gold).toBe(1);
    expect(hexLines.find((line) => line.card === 'theStrategoi')?.gold).toBe(2);
    expect(foldTileLines(hexLines).gold).toBe(4);
    expect(lines(bare).some((line) => line.card === GILDED)).toBe(false);
    expect(worth()).toBeGreaterThan(0);
    expect(home.workedTiles).not.toContainEqual({ col: idle.col, row: idle.row });
    expect(explainCity(state, home).lines.filter((line) => line.card === GILDED)).toHaveLength(1);
  });

  it('uses the prior additive total for every threshold, even with fractional yields', () => {
    const state = bareState();
    const tile = at(state, 5, 5);
    const zero = { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
    const feeder = { ...zero, source: 'Other Order', gold: 0.5, on: { test: 'road' } } as const;
    const first = {
      ...zero, source: 'First threshold', gold: 1, on: { test: 'yields', yield: 'gold', atLeast: 1 },
    } as const;
    const second = {
      ...zero, source: 'Second threshold', gold: 1, on: { test: 'yields', yield: 'gold', atLeast: 2 },
    } as const;
    const percent = { ...zero, source: 'Double', on: { test: 'road' }, wholePercent: 100 } as const;
    layRoad(tile, 0);

    const lines = [second, first, feeder, percent];
    expect(foldTileLines(explainTileYield(tile, { techs: [], lines })).gold).toBe(1);
    const qualifying = explainTileYield(tile, {
      techs: [],
      lines: [...lines, { ...feeder, source: 'One more half', on: { test: 'yields', yield: 'food' } }],
    });
    expect(qualifying.filter((line) => line.source.includes('threshold')).map((line) => line.source))
      .toEqual(['First threshold']);
    expect(foldTileLines(qualifying).gold).toBe(4);
  });
});

describe('The Great Raising', () => {
  it('finishes only each eligible front item, with ordinary riders and unit escalation', () => {
    const state = bareState(54, 13);
    const found = (col: number) => foundCityAt(state, 0, at(state, col, 5));
    const home = found(3);
    const train = found(9);
    const blocked = found(15);
    const puppet = found(21);
    const wonder = found(27);
    const opus = found(33);
    const project = found(39);
    const idle = found(45);
    const rival = foundCityAt(state, 1, at(state, 51, 5));
    const player = state.players[0]!;
    draft(state, KILNS);
    seat(state, KILNS, 0);
    draft(state, 'magisterialMasterMasons');
    seat(state, 'magisterialMasterMasons', 1);

    const monument = { kind: 'building', id: 'monument' } as const;
    const granary = { kind: 'building', id: 'granary' } as const;
    const worker = { kind: 'unit', id: 'worker' } as const;
    queue(state, home, monument, granary);
    queue(state, train, worker, worker);
    queue(state, blocked, worker, granary);
    queue(state, puppet, monument);
    queue(state, wonder, { kind: 'building', id: 'stonehenge' }, worker);
    opus.queue = [{ kind: 'building', id: 'theMagnumOpus' }];
    queue(state, project, { kind: 'project', id: 'tithes' });
    queue(state, rival, monument);

    home.hammerBasket = buildingProductionCost('monument', state, 0) + 7;
    home.itemProgress = { 'building:granary': 3 };
    home.unrest = { target: 10, progress: 0, unguarded: 0 };
    train.hammerBasket = 2;
    puppet.puppet = true;
    for (const town of [blocked, puppet, wonder, opus, project, idle, rival]) town.hammerBasket = 4;
    createUnit(state, 0, 'worker', blocked.col, blocked.row);
    const unchanged = [blocked, puppet, wonder, opus, project, idle, rival]
      .map((city) => ({ city, queue: city.queue.slice(), hammers: city.hammerBasket }));
    const workerCost = unitProductionCost(state, 0, 'worker');
    bumpRevision(state);
    expect(planProduction(state, blocked, Infinity)?.kind).toBe('unit');
    const ctx = valueContext(state, player);
    expect(onDraftWorth(RAISING, ctx)).toBeCloseTo(
      explainYields({ production: workerCost - 2 }, ctx).total / boonTurns(ctx),
    );

    draft(state, RAISING);
    expect(home.buildings).toContain('monument');
    expect(home.queue).toEqual([granary]);
    expect(home.hammerBasket).toBe(33);
    expect(tallyOf(player.statecraft, KILNS)).toBe(1);
    expect(train.queue).toEqual([worker]);
    expect(train.hammerBasket).toBe(0);
    expect(state.units.find((unit) => unit.col === train.col && unit.row === train.row))
      .toMatchObject({ type: 'worker', ownerId: 0 });
    expect(state.units.find((unit) => unit.col === train.col && unit.row === train.row)?.freeUpkeep).toBeUndefined();
    expect(unitProductionCost(state, 0, 'worker')).toBeGreaterThan(workerCost);

    for (const before of unchanged) {
      expect(before.city.queue).toEqual(before.queue);
      expect(before.city.hammerBasket).toBe(before.hammers);
    }
    expect(orderKeyword(RAISING)).toBe('boon');
    expect(player.statecraft.slots.some((slot) => slot?.card === RAISING)).toBe(false);
  });
});

it('describes the yield threshold, Scaler rule, and draft completion', () => {
  const words = (card: OrderId) => describeCard(card).map((clause) => stripRefs(clause.text)).join(' ');
  expect(words(GILDED)).toContain('makes at least 1 gold');
  expect(words(MEMORY)).toContain('your Scalers gain twice as much each time');
  expect(words(MEMORY)).toContain('if you own a Scaler');
  expect(words(RAISING)).toContain('each town completes its current unit or building, except wonders and the Magnum Opus');
});
