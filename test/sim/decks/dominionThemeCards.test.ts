/**
 * **Dominion batch D9, the Tier 0 cards of the themes pass**
 * (`docs/plans/dominion-themes-triage.md`, the D9 section). `dominion.test.ts`
 * checks the rows against the sheet, and `test/fixtures/cardText.json` pins
 * their words. This file checks that each card does what its new text says:
 *
 *   · Commission: Clear the Frontier: two camps cleared while it is seated
 *     bring a great general from a draft, and nothing else (reading 1);
 *   · Battle Honours: six kills while it is seated, the wild's units included,
 *     bring two citizens and the best melee unit in the capital, free of
 *     upkeep (readings 1 and 9);
 *   · The Camp Chaplains: faith equal to the strength of a unit killed or lost.
 *     The loss is The Funeral Games' old line;
 *   · The Bards' Praise: 30 culture for a camp;
 *   · The Champion's Portion: renown equal to the strength of a unit killed,
 *     the wild's units included, favouring great generals (reading 26).
 *
 * It also checks the retirements of readings 7 and 8: the ten cut Orders and
 * The Servian Reforms are dealt by nobody, and a seat that already holds one
 * keeps its effects.
 */

import { describe, expect, it } from 'vitest';

import { settleCampBounty } from '../../../src/sim/camps';
import { bestMeleeFor, foundCityAt } from '../../../src/sim/cities';
import { applyCombat } from '../../../src/sim/combat';
import { runCommissions } from '../../../src/sim/commissions';
import { type Tile, createMap, getTileAt } from '../../../src/sim/map';
import { makeRng } from '../../../src/sim/rng';
import {
  type City,
  type GameState,
  type Player,
  type Unit,
  bumpRevision,
  createUnit,
  playerById,
  realPlayers,
} from '../../../src/sim/state';
import {
  deckPoolOf,
  recordScalingOccasion,
  slotOrderAt,
  slotOrderError,
  slotTypesOf,
  tallyOf,
  windfallPayout,
} from '../../../src/sim/statecraft';
import {
  type OrderId,
  doctrineDef,
  orderDef,
  orderFitsSlot,
  orderIsDealt,
  poolDoctrines,
} from '../../../src/sim/statecraftData';
import { unitDef } from '../../../src/sim/unitData';
import { resetVisibility } from '../../../src/sim/visibility';
import { openWar } from '../../../src/sim/wars';
import { newGame } from '../newGameHelpers';
import { keepTheRites } from '../statecraftHelpers';

const FRONTIER = 'dominionClearTheFrontier' as OrderId;
const HONOURS = 'dominionBattleHonours' as OrderId;
const CHAPLAINS = 'dominionTheCampChaplains' as OrderId;
const BARDS = 'theBardsPraise' as OrderId;
const CHAMPION = 'theChampionsPortion' as OrderId;

/** The ten Orders the themes pass cut (reading 8). */
const CUT: readonly OrderId[] = [
  'musterRites',
  'theFuneralGames',
  'theArmourersSecret',
  'dominionTheMarshals',
  'dominionMarchDiscipline',
  'theOpenMuster',
  'theCleruchy',
  'theValetudinaria',
  'theStateForges',
  'theKeshik',
] as OrderId[];

/** Two seats and the wild on a flat grassland rectangle, the two seats at war unless told otherwise. */
function flat(war = true): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    barbarians: true,
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 20, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(20 * 12).fill(null);
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

function seat(state: GameState, id: number): Player {
  return playerById(state, id)!;
}

/** The wild's seat. */
function wild(state: GameState): Player {
  return state.players.find((player) => player.barbarian === true)!;
}

/** Puts an Order in a chair for seat 0, the way the reading sees it. */
function slot(state: GameState, id: OrderId): void {
  const sc = seat(state, 0).statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Seats a commission for seat 0 in the first empty chair it fits, through the slot verb. */
function seatCommission(state: GameState, id: OrderId): void {
  const player = seat(state, 0);
  if (!player.statecraft.orders.includes(id)) player.statecraft.orders.push(id);
  const chairs = slotTypesOf(player.statecraft);
  const index = player.statecraft.slots.findIndex(
    (held, chair) => held === null && orderFitsSlot(id, chairs[chair]!),
  );
  expect(index, 'an empty chair').toBeGreaterThanOrEqual(0);
  expect(slotOrderError(state, 0, id, index)).toBeNull();
  slotOrderAt(state, player, id, index);
  bumpRevision(state);
}

/** `striker` kills `victim`, which is left on one hit point first. */
function kill(state: GameState, striker: Unit, victim: Unit): void {
  victim.hp = 1;
  bumpRevision(state);
  const result = applyCombat(state, striker.id, { col: victim.col, row: victim.row });
  if (!result.ok) throw new Error(result.error);
  expect(state.units.includes(victim), 'the victim fell').toBe(false);
}

/** The strength a fallen piece is worth to a battle rider: a fresh unit's roster figure. */
function strengthOf(type: string): number {
  return unitDef(type as Unit['type']).combatStrength;
}

/** The yields a payout grants, as `yield: amount`. */
function granted(state: GameState, occasion: 'kill' | 'death' | 'camp', strength?: number) {
  const facts = strength === undefined ? {} : { strength };
  return windfallPayout(state, 0, occasion, 0, 0, facts).grants.map((grant) => ({
    yield: grant.yield,
    amount: grant.amount,
  }));
}

/** The units of `city`'s owner on or beside its hex. */
function unitsNear(state: GameState, city: City): Unit[] {
  return state.units.filter(
    (unit) =>
      unit.ownerId === city.ownerId &&
      Math.abs(unit.col - city.col) <= 1 &&
      Math.abs(unit.row - city.row) <= 1,
  );
}

describe('Dominion D9 — the two commissions trade rewards', () => {
  it('Clear the Frontier: two camps cleared while it is seated call a great general, and pay nothing else', () => {
    expect(orderDef(FRONTIER).commission).toEqual({
      goals: [{ kind: 'counted', occasion: 'campCleared', count: 2 }],
      reward: [{ greatPerson: 'general' }],
    });
    const state = flat(false);
    keepTheRites(state);
    const capital = foundCityAt(state, 0, at(state, 2, 2))!;
    createUnit(state, 0, 'warrior', 3, 3);
    seatCommission(state, FRONTIER);
    settleCampBounty(state, 0, { col: 3, row: 3 });
    expect(tallyOf(seat(state, 0).statecraft, FRONTIER)).toBe(1);
    expect(runCommissions(state)).toEqual([]);
    settleCampBounty(state, 0, { col: 3, row: 3 });
    // The camps' own bounty may feed the nearest town, so the reward is
    // measured from here.
    const population = capital.population;
    const units = state.units.length;
    const reports = runCommissions(state);
    expect(reports.map((report) => report.card)).toEqual([FRONTIER]);
    expect(reports[0]!.lines).toEqual(['a great general to call']);
    expect(seat(state, 0).greatPersonOffer?.family).toBe('general');
    // The two citizens and the free unit are Battle Honours' now.
    expect(capital.population).toBe(population);
    expect(state.units.length).toBe(units);
  });

  it('Battle Honours: six kills while it is seated, the wild’s units included, bring two citizens and the best melee unit in the capital', () => {
    expect(orderDef(HONOURS).commission).toEqual({
      goals: [{ kind: 'counted', occasion: 'unitKilled', count: 6 }],
      reward: [{ citizens: 2 }, { unit: 'bestMelee' }],
    });
    const state = flat();
    keepTheRites(state);
    const capital = foundCityAt(state, 0, at(state, 2, 2))!;
    seatCommission(state, HONOURS);
    const sc = seat(state, 0).statecraft;
    // A kill of the wild's unit counts (reading 9).
    const striker = createUnit(state, 0, 'warrior', 8, 6);
    const raider = createUnit(state, wild(state).id, 'warrior', 9, 6);
    kill(state, striker, raider);
    expect(tallyOf(sc, HONOURS)).toBe(1);
    // And a kill of another empire's unit.
    const second = createUnit(state, 0, 'warrior', 12, 8);
    const theirs = createUnit(state, 1, 'warrior', 13, 8);
    kill(state, second, theirs);
    expect(tallyOf(sc, HONOURS)).toBe(2);
    for (let kills = 3; kills <= 5; kills++) recordScalingOccasion(state, 0, 'unitKilled');
    expect(tallyOf(sc, HONOURS)).toBe(5);
    // Five is not enough.
    expect(runCommissions(state)).toEqual([]);
    recordScalingOccasion(state, 0, 'unitKilled');
    const population = capital.population;
    const near = unitsNear(state, capital).length;
    const best = bestMeleeFor(state, 0)!;
    const reports = runCommissions(state);
    expect(reports.map((report) => report.card)).toEqual([HONOURS]);
    expect(reports[0]!.lines).toEqual(expect.arrayContaining([`+2 citizens in ${capital.name}`]));
    expect(capital.population).toBe(population + 2);
    const raised = unitsNear(state, capital);
    expect(raised).toHaveLength(near + 1);
    const unit = raised[raised.length - 1]!;
    expect(unit.type).toBe(best);
    expect(unit.freeUpkeep).toBe(true);
    // The great general is Clear the Frontier's now.
    expect(seat(state, 0).greatPersonOffer).toBeUndefined();
  });
});

describe('Dominion D9 — the moments', () => {
  it('The Camp Chaplains grant faith equal to the strength of a unit killed or lost', () => {
    const state = flat();
    slot(state, CHAPLAINS);
    expect(granted(state, 'kill', 8)).toEqual([{ yield: 'faith', amount: 8 }]);
    // The loss is The Funeral Games' line, which this card took over.
    expect(granted(state, 'death', 8)).toEqual([{ yield: 'faith', amount: 8 }]);
    expect(
      windfallPayout(state, 0, 'death', 0, 0, { strength: 8, defending: true }).grants.map((grant) => grant.amount),
    ).toEqual([8]);
    // In a real fight: a kill, then a loss.
    const ours = createUnit(state, 0, 'warrior', 4, 4);
    const theirs = createUnit(state, 1, 'warrior', 5, 4);
    const faith = seat(state, 0).faithPool;
    kill(state, ours, theirs);
    expect(seat(state, 0).faithPool).toBe(faith + strengthOf('warrior'));
    const lost = createUnit(state, 0, 'spearman', 10, 8);
    const avenger = createUnit(state, 1, 'warrior', 11, 8);
    const before = seat(state, 0).faithPool;
    kill(state, avenger, lost);
    expect(seat(state, 0).faithPool).toBe(before + strengthOf('spearman'));
  });

  it('The Bards’ Praise grants 30 culture for a camp, and culture equal to the strength of a unit killed', () => {
    const state = flat(false);
    slot(state, BARDS);
    expect(granted(state, 'camp')).toEqual([{ yield: 'culture', amount: 30 }]);
    expect(granted(state, 'kill', 8)).toEqual([{ yield: 'culture', amount: 8 }]);
    expect(granted(state, 'death', 8)).toEqual([]);
    foundCityAt(state, 0, at(state, 2, 2));
    createUnit(state, 0, 'warrior', 3, 3);
    const player = seat(state, 0);
    player.culturePool = 0;
    // A draft offer is waiting, so the culture stays banked where the test can
    // read it instead of buying the next draft.
    player.statecraft.pendingOrder = { options: [] };
    settleCampBounty(state, 0, { col: 3, row: 3 });
    expect(player.culturePool).toBe(30);
  });

  it('The Champion’s Portion grants renown equal to the strength of a unit killed, the wild’s included, favouring great generals', () => {
    const state = flat();
    slot(state, CHAMPION);
    const renown = (occasion: 'kill' | 'death', facts: { strength: number; vsBarbarians?: boolean }) =>
      windfallPayout(state, 0, occasion, 0, 0, facts).renown.map((line) => ({
        amount: line.amount,
        family: line.family,
      }));
    expect(renown('kill', { strength: 8 })).toEqual([{ amount: 8, family: 'general' }]);
    expect(renown('kill', { strength: 6, vsBarbarians: true })).toEqual([{ amount: 6, family: 'general' }]);
    // A loss pays nothing.
    expect(renown('death', { strength: 8 })).toEqual([]);
    // In a real fight, against the wild: the renown is banked, and counted
    // toward a great general. The same fight on a board without the card is
    // the baseline, because a kill may also earn a Triumph's renown.
    const fight = (seated: boolean): { pool: number; generals: number } => {
      const board = flat();
      if (seated) slot(board, CHAMPION);
      const player = seat(board, 0);
      const striker = createUnit(board, 0, 'warrior', 8, 6);
      const raider = createUnit(board, wild(board).id, 'spearman', 9, 6);
      kill(board, striker, raider);
      return { pool: player.renownPool, generals: player.renownByFamily.general ?? 0 };
    };
    const without = fight(false);
    const withCard = fight(true);
    expect(withCard.pool - without.pool).toBe(strengthOf('spearman'));
    expect(withCard.generals - without.generals).toBe(strengthOf('spearman'));
  });
});

describe('Dominion D9 — the retirements', () => {
  it('deals none of the ten cut Orders and not The Servian Reforms, and a seat that holds one keeps it', () => {
    const state = flat();
    const pool = deckPoolOf(state, seat(state, 0));
    for (const id of CUT) {
      expect(orderDef(id).retired, id).toBe(true);
      expect(orderDef(id).decks, id).toEqual(['dominion']);
      expect(orderIsDealt(id), id).toBe(false);
      expect(pool, id).not.toContain(id);
    }
    expect(doctrineDef('theServianReforms').retired).toBe(true);
    expect(poolDoctrines(doctrineDef('theServianReforms').tier)).not.toContain('theServianReforms');
    // A save may hold a retired card. Its effects still apply: The Funeral
    // Games still pays faith on a loss (reading 8).
    expect(granted(state, 'death', 8)).toEqual([]);
    slot(state, 'theFuneralGames' as OrderId);
    expect(granted(state, 'death', 8)).toEqual([{ yield: 'faith', amount: 8 }]);
  });

  it('deals The Champion’s Portion to a Dominion seat at Tier 0', () => {
    expect(orderIsDealt(CHAMPION)).toBe(true);
    expect(orderDef(CHAMPION).band).toBe(0);
    expect(orderDef(CHAMPION).type).toBe('civic');
    const state = flat();
    const player = seat(state, 0);
    player.decks = ['dominion', 'magisterial'];
    expect(deckPoolOf(state, player)).toContain(CHAMPION);
  });
});
