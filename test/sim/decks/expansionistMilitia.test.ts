/**
 * **The Expansionist militia and the trades** (batch E10 of
 * `docs/plans/expansionist-themes-triage.md`). `expansionist.test.ts` checks
 * the rows against the sheet, and `expansionistSurplus.test.ts` checks Veteran
 * Colonies through the disband command. This file checks the three shapes the
 * batch added:
 *
 *   · the `citizens` grant: citizens in the town the moment names, only when
 *     the moment carries a unit's cost, with no growth riders, and counted
 *     toward the town's largest size. With The Mit'a, a levied soldier who
 *     retires gives its citizen back, and the levy's return gives another
 *     (readings 25 and 26);
 *   · `levied` on `combatLine`: Watch and Ward's +5 reaches only a piece a
 *     levy raised, in attack and in defence, while the fight's hex is inside
 *     the piece's own borders (reading 27);
 *   · the `guildInflow` rule: The Burghers add one line to a town's guild
 *     inflow, half the other lines, in towns of twelve citizens or more. The
 *     renown-building gate stays (reading 28);
 *   · the words of the three cards.
 */

import { describe, expect, it } from 'vitest';

import { applyCommand, type Command } from '../../../src/sim/commands';
import { previewCombat } from '../../../src/sim/combat';
import { foundCityAt, refreshCityDerived } from '../../../src/sim/cities';
import { explainGuildInflow, foldGuildInflow, runGuilds } from '../../../src/sim/guilds';
import { returnLeviedCitizens } from '../../../src/sim/levies';
import { tileIndex } from '../../../src/sim/map';
import { guildThreshold, totalSpecialists } from '../../../src/sim/specialists';
import {
  type City,
  type GameState,
  type Unit,
  addBuilding,
  bumpRevision,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import {
  combatLineAmount,
  describeCard,
  stripRefs,
  windfallPayout,
  windfallPayoutIsEmpty,
} from '../../../src/sim/statecraft';
import { type CardCombatLineEffect, type OrderId, orderDef, orderIsDealt } from '../../../src/sim/statecraftData';
import { openWar } from '../../../src/sim/wars';
import { at, bareState } from '../improvementHelpers';

/** Puts a card in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** One town of the given size for this seat, at its largest size, with an empty queue. */
function town(state: GameState, col: number, row: number, population: number, playerId = 0): City {
  const city = foundCityAt(state, playerId, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/** Hands a hex to a town, or to nobody, as borders moving there would. */
function own(state: GameState, city: City | null, col: number, row: number): void {
  state.tileOwner[tileIndex(state.map, col, row)] = city === null ? null : city.id;
  bumpRevision(state);
}

function disband(state: GameState, unitId: number): void {
  const result = applyCommand(state, { type: 'disbandUnit', playerId: 0, unitId });
  expect(result.ok, result.ok ? '' : result.error).toBe(true);
}

const said = (id: string): string => describeCard(id as never).map((clause) => stripRefs(clause.text)).join(' ');

describe('the Expansionist batch E10: the citizens grant (Veteran Colonies)', () => {
  it('pays one citizen in the town the moment names, and only when the moment carries a unit’s cost', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    slot(state, 0, 'veteranColonies');
    const paid = windfallPayout(state, 0, 'disband', 0, 0, { actor: 'warrior', townId: city.id, unitCost: 20 });
    expect(paid.citizens).toEqual([{ card: 'veteranColonies', source: expect.any(String), amount: 1, townId: city.id }]);
    expect(paid.lines.map((line) => line.note)).toContain('+1 citizen');
    expect(paid.grants).toEqual([]);
    // A unit raised for free carries no cost, so the moment pays nothing.
    expect(windfallPayoutIsEmpty(windfallPayout(state, 0, 'disband', 0, 0, { actor: 'warrior', townId: city.id }))).toBe(true);
    // A moment in no town pays nothing, and neither does a civilian.
    expect(windfallPayoutIsEmpty(windfallPayout(state, 0, 'disband', 0, 0, { actor: 'warrior', unitCost: 20 }))).toBe(true);
    expect(
      windfallPayoutIsEmpty(windfallPayout(state, 0, 'disband', 0, 0, { actor: 'worker', townId: city.id, unitCost: 20 })),
    ).toBe(true);
  });

  it('pays no growth riders, and counts the citizen toward the town’s largest size', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    slot(state, 0, 'veteranColonies');
    // Granary Levies pays hammers for a growth; a soldier coming home is not one.
    slot(state, 0, 'expansionistGranaryLevies');
    const hammers = city.hammerBasket;
    const soldier = createUnit(state, 0, 'warrior', city.col, city.row);
    disband(state, soldier.id);
    expect(city.population).toBe(4);
    expect(city.largestSize).toBe(4);
    expect(city.hammerBasket).toBe(hammers);
  });

  it('gives a levied soldier’s citizen back when it retires, and The Mit’a gives another twenty turns after the levy', () => {
    const state = bareState();
    const city = town(state, 5, 5, 8);
    slot(state, 0, 'theMusterOfTheFields');
    slot(state, 0, 'theMita');
    slot(state, 0, 'veteranColonies');
    const start = state.turn;
    const levied = applyCommand(state, { type: 'levyCitizen', playerId: 0, cityId: city.id, use: 'muster' } as Command);
    expect(levied.ok, levied.ok ? '' : levied.error).toBe(true);
    expect(city.population).toBe(7);
    const soldier = state.units[state.units.length - 1]!;
    expect(soldier.levied).toBe('muster');
    // The soldier walks home to the town's own hex and retires there.
    soldier.col = city.col;
    soldier.row = city.row;
    bumpRevision(state);
    disband(state, soldier.id);
    expect(city.population).toBe(8);
    state.turn = start + 20;
    returnLeviedCitizens(state);
    expect(city.population).toBe(9);
  });
});

describe('the Expansionist batch E10: Watch and Ward (levied on combatLine)', () => {
  /** A war between the two seats, with seat 0's town at (2, 2). */
  function war(): { state: GameState; home: City } {
    const state = bareState();
    openWar(state, 0, 1);
    const home = town(state, 2, 2, 3);
    slot(state, 0, 'watchAndWard');
    return { state, home };
  }

  /** The card's strength on one side of a forecast. */
  function line(state: GameState, attacker: Unit, col: number, row: number, side: 'attacker' | 'defender'): number {
    const view = previewCombat(state, attacker.id, { col, row });
    if (!view.ok) throw new Error(view.error);
    const lines = side === 'attacker' ? view.attackerLines : view.defenderLines;
    return lines.filter((entry) => entry.source.includes('Watch and Ward')).reduce((sum, entry) => sum + entry.amount, 0);
  }

  it('gives a levied unit +5 when it attacks a hex inside your borders, and nothing outside them', () => {
    const { state, home } = war();
    const soldier = createUnit(state, 0, 'warrior', 4, 4);
    soldier.levied = 'conscript';
    createUnit(state, 1, 'warrior', 5, 4);
    own(state, home, 5, 4);
    expect(line(state, soldier, 5, 4, 'attacker')).toBe(5);
    own(state, null, 5, 4);
    expect(line(state, soldier, 5, 4, 'attacker')).toBe(0);
  });

  it('gives a levied unit +5 when it defends inside your borders', () => {
    const { state, home } = war();
    const soldier = createUnit(state, 0, 'warrior', 5, 6);
    soldier.levied = 'muster';
    own(state, home, 5, 6);
    const rival = createUnit(state, 1, 'warrior', 4, 6);
    expect(line(state, rival, 5, 6, 'defender')).toBe(5);
  });

  it('gives nothing to a unit no levy raised', () => {
    const { state, home } = war();
    const plain = createUnit(state, 0, 'warrior', 4, 8);
    createUnit(state, 1, 'warrior', 5, 8);
    own(state, home, 5, 8);
    expect(line(state, plain, 5, 8, 'attacker')).toBe(0);
  });

  it('reaches only the levy use a row names, where it names one', () => {
    const { state } = war();
    const soldier = createUnit(state, 0, 'warrior', 4, 4);
    const effect: CardCombatLineEffect = {
      kind: 'combatLine',
      amount: 5,
      side: 'both',
      when: { test: 'always' },
      levied: 'muster',
    };
    const situation = {
      unit: soldier,
      side: 'attack' as const,
      tile: at(state, 5, 4),
      vsBarbarians: false,
      vsCity: false,
      targetHp: 100,
      targetMaxHp: 100,
    };
    expect(combatLineAmount(state, situation, effect)).toBeNull();
    soldier.levied = 'conscript';
    expect(combatLineAmount(state, situation, effect)).toBeNull();
    soldier.levied = 'muster';
    expect(combatLineAmount(state, situation, effect)).toBe(5);
    expect(combatLineAmount(state, situation, { ...effect, levied: true })).toBe(5);
  });
});

describe('the Expansionist batch E10: The Burghers (the guildInflow rule)', () => {
  /** A town of this size with a Library, so its guild bar has a trade to name. */
  function guildTown(state: GameState, population: number, library = true): City {
    const city = town(state, 5, 5, population);
    if (library) addBuilding(state, city, 'library');
    refreshCityDerived(state, city);
    bumpRevision(state);
    return city;
  }

  it('adds one line, half the town’s other lines, in a town of twelve citizens', () => {
    const state = bareState();
    const city = guildTown(state, 12);
    const before = explainGuildInflow(state, city);
    const base = foldGuildInflow(before);
    expect(base).toBeGreaterThan(0);
    slot(state, 0, 'theBurghers');
    const after = explainGuildInflow(state, city);
    expect(after.slice(0, before.length)).toEqual(before);
    const added = after.slice(before.length);
    expect(added).toHaveLength(1);
    expect(added[0]!.source).toContain('The Burghers');
    expect(added[0]!.amount).toBeCloseTo(base / 2, 10);
    expect(foldGuildInflow(after)).toBeCloseTo(base * 1.5, 10);
  });

  it('adds nothing in a town of eleven citizens', () => {
    const state = bareState();
    const city = guildTown(state, 11);
    slot(state, 0, 'theBurghers');
    expect(explainGuildInflow(state, city).some((entry) => entry.source.includes('Burghers'))).toBe(false);
  });

  it('fills the bar faster, and still converts nobody in a town with no renown building', () => {
    const state = bareState();
    const city = guildTown(state, 12, false);
    slot(state, 0, 'theBurghers');
    const inflow = foldGuildInflow(explainGuildInflow(state, city));
    city.guildBasket = guildThreshold(city) * 3;
    const before = city.guildBasket;
    runGuilds(state);
    expect(totalSpecialists(city)).toBe(0);
    expect(city.guildBasket).toBeCloseTo(before + inflow, 10);
  });
});

describe('the Expansionist batch E10: the rows', () => {
  it('deals all three, with the levy gate on Watch and Ward', () => {
    for (const id of ['veteranColonies', 'theBurghers', 'watchAndWard']) {
      expect(orderIsDealt(id as OrderId), id).toBe(true);
    }
    expect(orderDef('watchAndWard' as OrderId).needsLevy).toBe(true);
    expect(orderDef('watchAndWard' as OrderId).type).toBe('military');
    expect(orderDef('theBurghers' as OrderId).type).toBe('civic');
    expect(orderDef('veteranColonies' as OrderId).type).toBe('economic');
  });

  it('says what each does in plain words', () => {
    expect(said('veteranColonies')).toBe(
      'for military units alone, disbanding a unit in one of your cities gives that city one more citizen, unless the unit was raised for free',
    );
    expect(said('watchAndWard')).toBe('+5 combat strength for units raised by a levy inside your territory');
    expect(said('theBurghers')).toBe('the guild bar fills 50% faster, in every city of 12 or more citizens');
  });
});
