import { describe, expect, it } from 'vitest';

import { valueContext } from '../../../src/ai/bot';
import { buildingPullTerm, explainCardEffects, explainCommission, explainCommissionChair } from '../../../src/ai/value';
import type { BuildingId } from '../../../src/sim/buildingData';
import { foundCityAt, settleProduction, settleProductionWindfall } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { commissionProgress, runCommissions } from '../../../src/sim/commissions';
import { bumpRevision, type City, type GameState } from '../../../src/sim/state';
import { explainCardEmpireYields, explainCardPercentYields, foldCardYields, slotTypesOf, tallyOf } from '../../../src/sim/statecraft';
import { orderDef } from '../../../src/sim/statecraftData';
import { at, bareState } from '../improvementHelpers';

const KILNS = 'theBrickKilns';
const PROGRAMME = 'theBuildingProgramme';

function finish(state: GameState, town: City, id: BuildingId): void {
  town.queue = [{ kind: 'building', id }];
  town.hammerBasket = 100000;
  expect(settleProduction(state, town)?.item).toEqual({ kind: 'building', id });
  bumpRevision(state);
}

function buy(state: GameState, town: City, id: BuildingId, currency: 'gold' | 'faith') {
  return applyCommand(state, {
    type: 'purchaseItem', playerId: town.ownerId, cityId: town.id, item: { kind: 'building', id }, currency,
  });
}

describe('Generic Orders that count finished buildings', () => {
  it('counts paid buildings and windfall completions once, without counting free buildings or other queue items', () => {
    const state = bareState(24, 12);
    const home = foundCityAt(state, 0, at(state, 3, 5));
    const rival = foundCityAt(state, 1, at(state, 17, 5));
    const player = state.players[0]!;
    player.statecraft.orders.push(KILNS);
    player.statecraft.slots.push({ card: KILNS, sealedUntil: state.turn });
    player.gold = 100000;
    player.faithPool = 100000;
    player.legacies.push({ id: 'alKhwarizmi', age: 4 });
    player.techsResearched.push('colonialCharters');
    const tally = () => tallyOf(player.statecraft, KILNS);
    const yieldLines = () => foldCardYields(explainCardEmpireYields(state, 0).filter((line) => line.card === KILNS));
    const daughter = foundCityAt(state, 0, at(state, 9, 5));
    expect(daughter.buildings).toContain('townCharter');
    expect(tally()).toBe(0);

    home.queue = [{ kind: 'building', id: 'monument' }];
    home.hammerBasket = 100000;
    expect(settleProductionWindfall(state, home)?.item).toEqual({ kind: 'building', id: 'monument' });
    expect(tally()).toBe(1);
    expect(buy(state, home, 'granary', 'gold').ok).toBe(true);
    expect(tally()).toBe(2);
    expect(buy(state, home, 'granary', 'gold').ok).toBe(false);
    expect(buy(state, home, 'library', 'faith').ok).toBe(true);
    expect(tally()).toBe(3);
    expect(yieldLines()).toMatchObject({ science: 3, gold: 3 });

    finish(state, rival, 'granary');
    finish(state, home, 'theatreOfDionysus');
    expect(home.buildings).toContain('amphitheater');
    for (const item of [{ kind: 'unit', id: 'warrior' }, { kind: 'project', id: 'tithes' }] as const) {
      home.queue = [item];
      home.hammerBasket = 100000;
      expect(settleProduction(state, home)?.item).toEqual(item);
    }
    finish(state, home, 'theMagnumOpus');
    expect(tally()).toBe(3);
    expect(yieldLines()).toMatchObject({ science: 3, gold: 3 });
  });

  it('keeps progress across reseating and grants the lasting reward once at twelve', () => {
    const state = bareState(30, 12);
    const towns = [3, 9, 15, 21, 27].map((col) => foundCityAt(state, 0, at(state, col, 5)));
    const player = state.players[0]!;
    const chair = slotTypesOf(player.statecraft).indexOf('wildcard');
    player.statecraft.orders.push(PROGRAMME, KILNS);
    player.statecraft.slots.push({ card: KILNS, sealedUntil: state.turn });
    const seat = () => applyCommand(state, { type: 'slotOrder', playerId: 0, cardId: PROGRAMME, slotIndex: chair });
    const tally = () => tallyOf(player.statecraft, PROGRAMME);
    const reward = (town: City) => explainCardPercentYields(state, town).filter((line) => line.card === PROGRAMME);

    finish(state, towns[0]!, 'monument');
    expect(tally()).toBe(0);
    expect(seat().ok).toBe(true);
    for (const town of towns.slice(0, 3)) {
      for (const id of ['granary', 'workshop', 'library'] as const) finish(state, town, id);
    }
    expect(tally()).toBe(9);
    expect(reward(towns[0]!)).toEqual([]);
    state.turn = player.statecraft.slots[chair]!.sealedUntil;
    expect(applyCommand(state, { type: 'unslotOrder', playerId: 0, slotIndex: chair }).ok).toBe(true);
    finish(state, towns[1]!, 'monument');
    expect(tally()).toBe(9);
    expect(seat().ok).toBe(true);

    finish(state, towns[2]!, 'monument');
    finish(state, towns[3]!, 'monument');
    expect(commissionProgress(state, 0, PROGRAMME)[0]).toMatchObject({ have: 11, need: 12, met: false });
    expect(runCommissions(state)).toEqual([]);
    player.gold = 100000;
    expect(buy(state, towns[4]!, 'monument', 'gold').ok).toBe(true);
    expect(commissionProgress(state, 0, PROGRAMME)[0]).toMatchObject({ have: 12, need: 12, met: true });
    expect(runCommissions(state).map((report) => report.card)).toEqual([PROGRAMME]);
    expect(player.statecraft.slots[chair]).toBeNull();
    expect(seat().ok).toBe(false);

    for (const town of towns.slice(3)) {
      for (const id of ['granary', 'workshop', 'library', 'market'] as const) finish(state, town, id);
    }
    const laterTown = foundCityAt(state, 0, at(state, 3, 10));
    expect(runCommissions(state)).toEqual([]);
    expect(tally()).toBe(12);
    expect(tallyOf(player.statecraft, KILNS)).toBe(22);
    const lines = explainCardEmpireYields(state, 0).filter((line) => line.card === KILNS);
    expect(foldCardYields(lines)).toMatchObject({ science: 20, gold: 20 });
    for (const town of [...towns, laterTown]) {
      expect(reward(town)).toEqual([expect.objectContaining({ yield: 'production', percent: 10 })]);
    }
  });

  it('prices both Orders from recent buildings and adds progress only for an eligible build', () => {
    const state = bareState(24, 12);
    const home = foundCityAt(state, 0, at(state, 3, 5));
    const player = state.players[0]!;
    player.statecraft.orders.push(PROGRAMME);
    state.turn += 2;
    const before = valueContext(state, player);
    const kilnsBefore = explainCardEffects(KILNS, orderDef(KILNS).effects, before).total;
    const programmeBefore = explainCommission(PROGRAMME, before)!.total;

    finish(state, home, 'monument');
    finish(state, home, 'granary');
    finish(state, home, 'library');
    const benched = valueContext(state, player);
    expect(explainCardEffects(KILNS, orderDef(KILNS).effects, benched).total).toBeGreaterThan(kilnsBefore);
    expect(explainCommission(PROGRAMME, benched)!.total).toBeGreaterThan(programmeBefore);
    expect(explainCommissionChair(PROGRAMME, benched)!.total).toBeGreaterThan(0);
    expect(buildingPullTerm(benched, 'workshop')).toBeNull();

    player.gold = 100000;
    player.faithPool = 100000;
    player.legacies.push({ id: 'alKhwarizmi', age: 4 });
    const chair = slotTypesOf(player.statecraft).indexOf('wildcard');
    expect(applyCommand(state, { type: 'slotOrder', playerId: 0, cardId: PROGRAMME, slotIndex: chair }).ok).toBe(true);
    const seated = valueContext(state, player);
    expect(buildingPullTerm(seated, 'workshop')?.value).toBeGreaterThan(0);
    expect(buildingPullTerm(seated, 'stonehenge')).toBeNull();
    expect(buildingPullTerm(seated, 'theMagnumOpus')).toBeNull();
    for (const currency of ['gold', 'faith'] as const) {
      const purchase = seated.wants[currency].find((want) => want.buy?.item.kind === 'building' && want.buy.item.id === 'university');
      const term = purchase?.terms.find((line) => line.label === 'a step toward an open commission');
      expect(term?.value).toBeGreaterThan(0);
    }
  });
});
