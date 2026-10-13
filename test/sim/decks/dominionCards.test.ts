/**
 * **The Dominion sheet's new mechanics**, one test each (the Dominion batch of
 * `docs/plans/deck-implementation.md`). `dominion.test.ts` checks the rows
 * against the sheet; this file checks that the shapes the batch added do what
 * the cards say:
 *
 *   · a capture records the commissions' capture counts, and the commission
 *     rewards read the town that was taken (Take the City, The Captured Marvel,
 *     Hold the Capitals);
 *   · Spolia moves half a captured town's Magnum Opus hammers into the
 *     captor's own Opus town;
 *   · "the city raising the Magnum Opus" as a city scope, a strength line near
 *     it (The Praetorian Guard), and a strength line and a war condition
 *     against the empire raising one (The Grand Coalition);
 *   · Songs of the Fallen pays a loss only for a piece that was defending;
 *   · Battle Honours' renown favours great generals;
 *   · The Nation in Arms musters in every town with an Armoury;
 *   · The Soldier-Farmers' hex line, gated on peace and on a garrison.
 */

import { describe, expect, it } from 'vitest';

import { applyCombat, previewCombat } from '../../../src/sim/combat';
import { foundCityAt } from '../../../src/sim/cities';
import { commissionFigure, runCommissions } from '../../../src/sim/commissions';
import { type Tile, createMap, getTileAt } from '../../../src/sim/map';
import { makeRng } from '../../../src/sim/rng';
import {
  type City,
  type GameState,
  bumpRevision,
  createUnit,
  newGame,
  playerById,
  realPlayers,
} from '../../../src/sim/state';
import {
  cardProduction,
  cityScopeAdmits,
  musterPeriodicUnits,
  scopedCardTileLines,
  tallyOf,
  windfallPayout,
} from '../../../src/sim/statecraft';
import { type OrderId } from '../../../src/sim/statecraftData';
import { resetVisibility } from '../../../src/sim/visibility';
import { openWar } from '../../../src/sim/wars';

const OPUS = { kind: 'building', id: 'theMagnumOpus' } as City['queue'][number];

/** Two seats on a flat grassland rectangle, at war unless told otherwise. */
function flat(war = true): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 16, height: 8, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(16 * 8).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  state.rng = makeRng(12345);
  if (war) {
    const seats = realPlayers(state);
    openWar(state, seats[0]!.id, seats[1]!.id);
  }
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  return getTileAt(state.map, col, row)!;
}

/** Puts a card in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

describe('the Dominion batch — taking a city', () => {
  /** Seat 1's first town at (4,3), raising the Opus; seat 0's at (10,3), raising one too. */
  function siege(): { state: GameState; theirs: City; ours: City } {
    const state = flat();
    const theirs = foundCityAt(state, 1, at(state, 4, 3))!;
    const ours = foundCityAt(state, 0, at(state, 10, 3))!;
    theirs.queue = [OPUS];
    theirs.hammerBasket = 80;
    ours.queue = [OPUS];
    ours.hammerBasket = 0;
    theirs.hp = 1;
    bumpRevision(state);
    return { state, theirs, ours };
  }

  it('counts the capture for the commissions and pays them off the town that was taken', () => {
    const { state, theirs } = siege();
    for (const id of ['dominionTakeTheCity', 'dominionTheCapturedMarvel', 'dominionTheGrandCampaign']) {
      slot(state, 0, id);
    }
    const attacker = createUnit(state, 0, 'warrior', 3, 3);
    expect(applyCombat(state, attacker.id, { col: 4, row: 3 }).ok).toBe(true);
    expect(theirs.ownerId).toBe(0);

    const sc = playerById(state, 0)!.statecraft;
    expect(tallyOf(sc, 'dominionTakeTheCity' as OrderId)).toBe(1);
    // Their first town was an original capital, so the marked count moves too.
    expect(tallyOf(sc, 'dominionTheCapturedMarvel' as OrderId)).toBe(1);
    expect(tallyOf(sc, 'dominionTheGrandCampaign' as OrderId)).toBe(1);
    expect(commissionFigure(state, 0, 'originalCapitalsHeld')).toBe(1);
    expect(commissionFigure(state, 0, 'capturedThisTurnPopulation')).toBe(theirs.population);

    const reports = runCommissions(state);
    const people = theirs.population;
    const take = reports.find((report) => report.card === 'dominionTakeTheCity')!;
    expect(take.lines).toEqual(expect.arrayContaining([`+${23 * people} culture`, `+${23 * people} science`]));
    const marvel = reports.find((report) => report.card === 'dominionTheCapturedMarvel')!;
    expect(marvel.lines).toEqual(expect.arrayContaining([`+${20 * people} culture`]));
    // Three captures are needed, so The Grand Campaign is still waiting.
    expect(reports.some((report) => report.card === 'dominionTheGrandCampaign')).toBe(false);
  });

  it('Spolia moves half the taken Opus hammers into your own Opus town', () => {
    const { state, ours } = siege();
    slot(state, 0, 'dominionSpolia');
    const attacker = createUnit(state, 0, 'warrior', 3, 3);
    expect(applyCombat(state, attacker.id, { col: 4, row: 3 }).ok).toBe(true);
    expect(ours.hammerBasket).toBe(40);
  });

  it('Spolia pays nothing for a town that was raising no Opus', () => {
    const payout = windfallPayout(flat(), 0, 'capture', 0, 0, { opusProgress: 0 });
    expect(payout.grants).toEqual([]);
  });
});

describe('the Dominion batch — the city raising the Magnum Opus', () => {
  it('is a city scope read off the front of the queue', () => {
    const state = flat();
    const city = foundCityAt(state, 0, at(state, 10, 3))!;
    expect(cityScopeAdmits(state, city, { test: 'raisingOpus' })).toBe(false);
    city.queue = [OPUS];
    expect(cityScopeAdmits(state, city, { test: 'raisingOpus' })).toBe(true);
  });

  it('The Praetorian Guard strengthens units near it, and no others', () => {
    const state = flat();
    const ours = foundCityAt(state, 0, at(state, 10, 3))!;
    ours.queue = [OPUS];
    slot(state, 0, 'dominionThePraetorianGuard');
    const near = createUnit(state, 0, 'warrior', 9, 3);
    createUnit(state, 1, 'warrior', 8, 3);
    const far = createUnit(state, 0, 'warrior', 2, 6);
    createUnit(state, 1, 'warrior', 1, 6);
    const guard = (unitId: number, col: number, row: number): number => {
      const view = previewCombat(state, unitId, { col, row });
      if (!view.ok) throw new Error('no preview');
      return view.attackerLines
        .filter((line) => line.source.includes('Praetorian'))
        .reduce((sum, line) => sum + line.amount, 0);
    };
    expect(guard(near.id, 8, 3)).toBe(6);
    expect(guard(far.id, 1, 6)).toBe(0);
  });

  it('The Grand Coalition fights the empire raising one, and trains faster against it', () => {
    const state = flat();
    const ours = foundCityAt(state, 0, at(state, 12, 3))!;
    ours.buildings.push('barracks' as never);
    const theirs = foundCityAt(state, 1, at(state, 2, 3))!;
    slot(state, 0, 'dominionTheGrandCoalition');
    const attacker = createUnit(state, 0, 'warrior', 7, 3);
    createUnit(state, 1, 'warrior', 6, 3);
    const coalition = (): number => {
      const view = previewCombat(state, attacker.id, { col: 6, row: 3 });
      if (!view.ok) throw new Error('no preview');
      return view.attackerLines
        .filter((line) => line.source.includes('Grand Coalition'))
        .reduce((sum, line) => sum + line.amount, 0);
    };
    const training = (): number =>
      cardProduction(state, ours, 'unit', 'warrior' as never).reduce((sum, line) => sum + line.percent, 0);
    expect(coalition()).toBe(0);
    expect(training()).toBe(0);
    theirs.queue = [OPUS];
    bumpRevision(state);
    expect(coalition()).toBe(6);
    expect(training()).toBe(30);
  });
});

describe('the Dominion batch — riders and musters', () => {
  it('Songs of the Fallen pays a loss only while the piece defends', () => {
    const state = flat();
    slot(state, 0, 'songsOfTheFallen');
    expect(windfallPayout(state, 0, 'death', 0, 0, { strength: 8 }).grants).toEqual([]);
    expect(windfallPayout(state, 0, 'death', 0, 0, { strength: 8, defending: true }).grants).toHaveLength(2);
  });

  it('Battle Honours pays renown that favours great generals', () => {
    const state = flat();
    slot(state, 0, 'dominionBattleHonours');
    const payout = windfallPayout(state, 0, 'camp');
    expect(payout.renown).toEqual([
      expect.objectContaining({ amount: 12, family: 'general' }),
    ]);
  });

  it('The Nation in Arms musters in every town with an Armoury', () => {
    const state = flat();
    const a = foundCityAt(state, 0, at(state, 3, 3))!;
    const b = foundCityAt(state, 0, at(state, 10, 3))!;
    foundCityAt(state, 0, at(state, 7, 6));
    a.buildings.push('armoury' as never);
    b.buildings.push('armoury' as never);
    slot(state, 0, 'dominionTheNationInArms');
    state.turn = 10;
    const before = state.units.filter((unit) => unit.ownerId === 0).length;
    musterPeriodicUnits(state);
    expect(state.units.filter((unit) => unit.ownerId === 0).length).toBe(before + 2);
  });

  it('The Soldier-Farmers pay a garrisoned town’s pastures at peace, and not at war', () => {
    // A scoped hex line is read with its owning town in hand
    // (`scopedCardTileLines`, which `cityContext` calls), so it is asked here.
    for (const war of [false, true]) {
      const state = flat(war);
      const city = foundCityAt(state, 0, at(state, 4, 3))!;
      createUnit(state, 0, 'warrior', city.col, city.row);
      slot(state, 0, 'dominionTheSoldierFarmers');
      const lines = scopedCardTileLines(state, city);
      expect(lines.length, war ? 'at war' : 'at peace').toBe(war ? 0 : 1);
    }
  });
});
