/**
 * **Dominion batch D1, "ranks: earning them"** (`docs/plans/dominion-build-triage.md`).
 * `dominion.test.ts` checks the eleven rows against the sheet; this file checks
 * that the shapes the batch added do what the cards say:
 *
 *   · earning a rank is a moment: `settleRanksEarned` keeps the lifetime record
 *     (`Player.ranksEarned`), counts the tally and pays the riders on the
 *     `rankEarned` occasion, once for each rank, in a fight as well as anywhere
 *     else (Honours of the Legion, The Tactica, Up Through the Ranks, The
 *     Campaign Annals, The Veterans' Roll);
 *   · the drill phase: units in towns every four turns (The Drill Grounds),
 *     garrisoned units every turn (The Regimental Schools), units beside a
 *     great general (The Tactica), added up and written once;
 *   · a unit gained with experience or a rank (The Training Cadre, The Drill
 *     Masters), which counts as earning the rank, and only for units gained;
 *   · a levy row with a town scope and a starting rank (The Devshirme), and the
 *     row that governs a use when two cards grant it;
 *   · a founding beside a military unit (The Armed Colony).
 */

import { describe, expect, it } from 'vitest';

import { applyCombat } from '../../../src/sim/combat';
import { foundCityAt, realiseItem, settleRanksEarned } from '../../../src/sim/cities';
import { type GreatPersonId } from '../../../src/sim/greatPeopleData';
import { levyAt, levyError, levyGrantFor, levyOptions } from '../../../src/sim/levies';
import { type Tile, createMap, getTileAt } from '../../../src/sim/map';
import { grantExperience, rankThreshold } from '../../../src/sim/ranks';
import { makeRng } from '../../../src/sim/rng';
import {
  type City,
  type GameState,
  type Unit,
  bumpRevision,
  createUnit,
  playerById,
  realPlayers,
} from '../../../src/sim/state';
import {
  describeCard,
  explainCardEmpireYields,
  explainCardCityYields,
  explainCardPercentYields,
  foldCardYields,
  stripRefs,
  tallyOf,
} from '../../../src/sim/statecraft';
import { drillUnits } from '../../../src/sim/statecraft/evaluator';
import { type OrderId } from '../../../src/sim/statecraftData';
import { END_OF_TURN_PHASES } from '../../../src/sim/turn';
import { unitDef, unitStampStrength } from '../../../src/sim/unitData';
import { resetVisibility } from '../../../src/sim/visibility';
import { openWar } from '../../../src/sim/wars';
import { newGame } from '../newGameHelpers';

const VETERAN = rankThreshold('veteran');
const ELITE = rankThreshold('elite');
const GENERAL = 'ahmoseSonOfEbana' as GreatPersonId;

/** Two seats on a flat grassland rectangle, at peace unless told otherwise. */
function flat(war = false): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 16, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(16 * 10).fill(null);
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

/** The strength the `rankEarned` occasion reports for a unit. */
function strengthOf(unit: Unit): number {
  return Math.max(0, unitDef(unit.type).combatStrength + unitStampStrength(unit));
}

/** Raises a unit by a card's grant and settles what it reached, as the drill does. */
function drill(state: GameState, unit: Unit, amount: number): void {
  settleRanksEarned(state, unit, grantExperience(state, unit, amount));
}

describe('Dominion D1 — earning a rank is a moment', () => {
  it('keeps the record and the tally, and pays the riders once for each rank', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 4, 4));
    for (const id of ['theWarHallSchools', 'theTactica', 'upThroughTheRanks', 'theCampaignAnnals']) {
      slot(state, 0, id);
    }
    const player = playerById(state, 0)!;
    // Far up the ladder, so the culture paid stays in the pool rather than
    // buying a draft at once.
    player.statecraft.drafts = 25;
    const warrior = createUnit(state, 0, 'warrior', 6, 4);
    const science = player.sciencePool;
    const culture = player.culturePool;
    const renown = player.renownEarned;
    const generals = player.renownByFamily.general ?? 0;

    // Straight from nothing to Elite: two ranks in one step.
    drill(state, warrior, ELITE);
    expect(warrior.experience).toBe(ELITE);
    expect(player.ranksEarned).toBe(2);
    const sc = player.statecraft;
    expect(tallyOf(sc, 'theCampaignAnnals' as OrderId)).toBe(2);
    // Honours of the Legion: science and culture equal to its strength, for
    // each rank. The Tactica: 15 science for each rank.
    const strength = strengthOf(warrior);
    expect(player.sciencePool - science).toBe(2 * strength + 2 * 15);
    expect(player.culturePool - culture).toBe(2 * strength);
    // Up Through the Ranks: 250 renown for the Elite alone, favouring generals.
    expect(player.renownEarned - renown).toBe(250);
    expect((player.renownByFamily.general ?? 0) - generals).toBe(250);
  });

  it('pays Up Through the Ranks for an Elite and never for a Veteran', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 4, 4));
    slot(state, 0, 'upThroughTheRanks');
    const player = playerById(state, 0)!;
    const warrior = createUnit(state, 0, 'warrior', 6, 4);
    const renown = player.renownEarned;
    drill(state, warrior, VETERAN);
    expect(player.renownEarned).toBe(renown);
    drill(state, warrior, ELITE - VETERAN);
    expect(player.renownEarned - renown).toBe(250);
  });

  it('counts a rank earned in a fight, attacking or defending', () => {
    const state = flat(true);
    foundCityAt(state, 0, at(state, 2, 2));
    slot(state, 0, 'theWarHallSchools');
    const player = playerById(state, 0)!;
    const science = player.sciencePool;
    // Attacking: a spearman one point short of Veteran strikes a warrior and
    // lives, which is enough.
    const attacker = createUnit(state, 0, 'spearman', 5, 5);
    attacker.experience = VETERAN - 1;
    createUnit(state, 1, 'warrior', 6, 5);
    expect(applyCombat(state, attacker.id, { col: 6, row: 5 }).ok).toBe(true);
    expect(state.units).toContain(attacker);
    expect(attacker.experience).toBeGreaterThanOrEqual(VETERAN);
    expect(player.ranksEarned).toBe(1);
    // Defending: a spearman one point short of Veteran outlives a warrior's
    // blow, and the rank is its owner's, earned in the other side's command.
    const defender = createUnit(state, 0, 'spearman', 10, 5);
    defender.experience = VETERAN - 1;
    const raider = createUnit(state, 1, 'warrior', 11, 5);
    expect(applyCombat(state, raider.id, { col: 10, row: 5 }).ok).toBe(true);
    expect(state.units).toContain(defender);
    expect(defender.experience).toBeGreaterThanOrEqual(VETERAN);
    expect(player.ranksEarned).toBe(2);
    // Honours of the Legion paid each of them its strength.
    expect(player.sciencePool - science).toBe(strengthOf(attacker) + strengthOf(defender));
  });

  it('reads the record through The Veterans’ Roll, at most +30%', () => {
    const state = flat();
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, 0, 'theVeteransRoll');
    const player = playerById(state, 0)!;
    const percent = (voice: string): number =>
      explainCardPercentYields(state, city)
        .filter((line) => line.yield === voice)
        .reduce((sum, line) => sum + line.percent, 0);
    expect(percent('science')).toBe(0);
    player.ranksEarned = 7;
    bumpRevision(state);
    expect(percent('science')).toBe(7);
    expect(percent('culture')).toBe(7);
    player.ranksEarned = 45;
    bumpRevision(state);
    expect(percent('science')).toBe(30);
  });

  it('grows The Campaign Annals from its starting +3 science', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 4, 4));
    slot(state, 0, 'theCampaignAnnals');
    const science = (): number => foldCardYields(explainCardEmpireYields(state, 0)).science;
    expect(science()).toBe(3);
    drill(state, createUnit(state, 0, 'warrior', 6, 4), VETERAN);
    bumpRevision(state);
    expect(science()).toBe(4);
  });
});

describe('Dominion D1 — the drill', () => {
  it('runs as a phase of its own, after the muster and before the renown sweep', () => {
    const names = END_OF_TURN_PHASES.map((phase) => phase.name);
    expect(names.indexOf('drill')).toBe(names.indexOf('muster') + 1);
    expect(names.indexOf('renown')).toBe(names.indexOf('drill') + 1);
  });

  it('The Drill Grounds drill the units standing in your towns every fourth turn', () => {
    const state = flat();
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, 0, 'theDrillGrounds');
    const inTown = createUnit(state, 0, 'warrior', city.col, city.row);
    const outside = createUnit(state, 0, 'warrior', 9, 4);
    const worker = createUnit(state, 0, 'worker', city.col, city.row);
    state.turn = 7;
    drillUnits(state);
    expect(inTown.experience).toBeUndefined();
    state.turn = 8;
    drillUnits(state);
    expect(inTown.experience).toBe(1);
    expect(outside.experience).toBeUndefined();
    // A civilian holds no rank, so it is never drilled.
    expect(worker.experience).toBeUndefined();
  });

  it('The Regimental Schools drill every garrisoned unit every turn and pay its town science', () => {
    const state = flat();
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, 0, 'theRegimentalSchools');
    const science = (): number =>
      explainCardCityYields(state, city).reduce((sum, line) => sum + line.science, 0);
    expect(science()).toBe(0);
    const soldier = createUnit(state, 0, 'warrior', city.col, city.row);
    bumpRevision(state);
    expect(science()).toBe(2);
    state.turn = 7;
    drillUnits(state);
    state.turn = 8;
    drillUnits(state);
    expect(soldier.experience).toBe(2);
  });

  it('adds two drills on one turn and announces the rank once', () => {
    const state = flat();
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, 0, 'theDrillGrounds');
    slot(state, 0, 'theRegimentalSchools');
    const soldier = createUnit(state, 0, 'warrior', city.col, city.row);
    soldier.experience = VETERAN - 2;
    state.turn = 8;
    drillUnits(state);
    expect(soldier.experience).toBe(VETERAN);
    expect(playerById(state, 0)!.ranksEarned).toBe(1);
  });

  it('The Tactica drills the units on or beside a great general, and no others', () => {
    const state = flat();
    foundCityAt(state, 0, at(state, 2, 2));
    slot(state, 0, 'theTactica');
    createUnit(state, 0, 'greatPerson', 8, 5, GENERAL);
    const escort = createUnit(state, 0, 'warrior', 8, 5);
    const beside = createUnit(state, 0, 'warrior', 9, 5);
    const far = createUnit(state, 0, 'warrior', 11, 5);
    // A rival's soldier beside the general is not drilled by it.
    const rival = createUnit(state, 1, 'warrior', 7, 5);
    state.turn = 3;
    drillUnits(state);
    expect(escort.experience).toBe(1);
    expect(beside.experience).toBe(1);
    expect(far.experience).toBeUndefined();
    expect(rival.experience).toBeUndefined();
  });
});

describe('Dominion D1 — units gained with experience', () => {
  it('The Training Cadre gives two experience to a unit gained in a town with a Barracks', () => {
    const state = flat();
    const barracks = foundCityAt(state, 0, at(state, 4, 4))!;
    barracks.buildings.push('barracks' as never);
    const plain = foundCityAt(state, 0, at(state, 10, 4))!;
    slot(state, 0, 'drillManuals');
    const a = realiseItem(state, barracks, { kind: 'unit', id: 'warrior', tile: at(state, 4, 4) });
    const b = realiseItem(state, plain, { kind: 'unit', id: 'warrior', tile: at(state, 10, 4) });
    expect(state.units.find((unit) => unit.id === a.unitId)!.experience).toBe(2);
    expect(state.units.find((unit) => unit.id === b.unitId)!.experience).toBeUndefined();
  });

  it('The Drill Masters make every unit gained a Veteran, which counts as earning the rank', () => {
    const state = flat();
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, 0, 'theDrillMasters');
    slot(state, 0, 'theWarHallSchools');
    const player = playerById(state, 0)!;
    const science = player.sciencePool;
    const made = realiseItem(state, city, { kind: 'unit', id: 'warrior', tile: at(state, 4, 4) });
    const warrior = state.units.find((unit) => unit.id === made.unitId)!;
    expect(warrior.experience).toBe(VETERAN);
    expect(player.ranksEarned).toBe(1);
    expect(player.sciencePool - science).toBe(strengthOf(warrior));
    // A settler has no rank to start at.
    const settler = realiseItem(state, city, { kind: 'unit', id: 'settler', tile: at(state, 4, 4) });
    expect(state.units.find((unit) => unit.id === settler.unitId)!.experience).toBeUndefined();
    // A unit that is not gained (a ruin's escort, a scenario's piece) starts with nothing.
    expect(createUnit(state, 0, 'warrior', 7, 7).experience).toBeUndefined();
  });

  it('adds The Training Cadre’s experience on top of a Veteran start', () => {
    const state = flat();
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    city.buildings.push('barracks' as never);
    slot(state, 0, 'theDrillMasters');
    slot(state, 0, 'drillManuals');
    const made = realiseItem(state, city, { kind: 'unit', id: 'warrior', tile: at(state, 4, 4) });
    expect(state.units.find((unit) => unit.id === made.unitId)!.experience).toBe(VETERAN + 2);
  });
});

describe('Dominion D1 — The Devshirme', () => {
  /** A captured, annexed town of seat 0, with `population` citizens. */
  function captured(state: GameState, population: number, col = 4): City {
    const city = foundCityAt(state, 0, at(state, col, 4))!;
    city.captured = true;
    city.population = population;
    bumpRevision(state);
    return city;
  }

  it('lets a captured town of six raise a Veteran, and no other town', () => {
    const state = flat();
    const taken = captured(state, 6);
    const home = foundCityAt(state, 0, at(state, 10, 4))!;
    home.population = 8;
    slot(state, 0, 'theDevshirme');
    expect(levyOptions(state, 0, home)).toEqual([]);
    expect(levyError(state, 0, taken, 'muster')).toBeNull();
    const before = state.units.length;
    levyAt(state, taken, 'muster');
    expect(state.units.length).toBe(before + 1);
    const raised = state.units[state.units.length - 1]!;
    expect(raised.experience).toBe(VETERAN);
    expect(taken.population).toBe(5);
    expect(playerById(state, 0)!.ranksEarned).toBe(1);
  });

  it('refuses a captured town of five', () => {
    const state = flat();
    const taken = captured(state, 5);
    slot(state, 0, 'theDevshirme');
    expect(levyError(state, 0, taken, 'muster')).toMatch(/at least 6 citizens/);
  });

  it('beside The Muster of the Fields, governs only the towns it reaches, whatever the order', () => {
    for (const order of [
      ['theMusterOfTheFields', 'theDevshirme'],
      ['theDevshirme', 'theMusterOfTheFields'],
    ]) {
      const state = flat();
      const six = captured(state, 6, 3);
      const five = captured(state, 5, 7);
      const home = foundCityAt(state, 0, at(state, 11, 4))!;
      home.population = 6;
      for (const id of order) slot(state, 0, id);
      expect(levyGrantFor(state, 0, six, 'muster')?.card, order.join()).toBe('theDevshirme');
      expect(levyGrantFor(state, 0, five, 'muster')?.card, order.join()).toBe('theMusterOfTheFields');
      expect(levyGrantFor(state, 0, home, 'muster')?.card, order.join()).toBe('theMusterOfTheFields');
      // One menu line for the use, named after the governing card.
      const lines = levyOptions(state, 0, six).filter((line) => line.use === 'muster');
      expect(lines.map((line) => line.cardName)).toEqual(['The Devshirme']);
    }
  });
});

describe('Dominion D1 — The Armed Colony', () => {
  function owned(state: GameState, city: City): number {
    return state.tileOwner.filter((owner) => owner === city.id).length;
  }

  it('gives a town founded beside a military unit three more hexes, and makes the unit a Veteran', () => {
    const plainState = flat();
    slot(plainState, 0, 'theArmedColony');
    const plain = foundCityAt(plainState, 0, at(plainState, 6, 5))!;

    const state = flat();
    slot(state, 0, 'theArmedColony');
    const escort = createUnit(state, 0, 'warrior', 7, 5);
    const second = createUnit(state, 0, 'warrior', 5, 5);
    const city = foundCityAt(state, 0, at(state, 6, 5))!;
    expect(owned(state, city)).toBe(owned(plainState, plain) + 3);
    // Only the first in unit order becomes a Veteran.
    expect(escort.experience).toBe(VETERAN);
    expect(second.experience).toBeUndefined();
    expect(playerById(state, 0)!.ranksEarned).toBe(1);
  });

  it('gives a Veteran escort nothing more, and still claims the hexes', () => {
    const state = flat();
    slot(state, 0, 'theArmedColony');
    const escort = createUnit(state, 0, 'warrior', 7, 5);
    escort.experience = VETERAN + 1;
    foundCityAt(state, 0, at(state, 6, 5));
    expect(escort.experience).toBe(VETERAN + 1);
    expect(playerById(state, 0)!.ranksEarned).toBeUndefined();
  });

  it('does nothing for a town founded with no military unit beside it', () => {
    const state = flat();
    slot(state, 0, 'theArmedColony');
    const far = createUnit(state, 0, 'warrior', 10, 5);
    const city = foundCityAt(state, 0, at(state, 6, 5))!;
    const control = flat();
    const plain = foundCityAt(control, 0, at(control, 6, 5))!;
    expect(owned(state, city)).toBe(owned(control, plain));
    expect(far.experience).toBeUndefined();
  });
});

describe('Dominion D1 — the words', () => {
  it('describes each card in a first-time player’s words', () => {
    const said = (id: string): string[] => describeCard(id as never).map((c) => stripRefs(c.text));
    expect(said('theDrillGrounds')).toEqual([
      'your combat units standing in one of your cities gain 1 experience every 4 turns',
    ]);
    expect(said('theDrillMasters')).toEqual(['units you gain start as Veterans']);
    expect(said('upThroughTheRanks')).toEqual([
      'one of your units becoming an Elite grants +250 renown, favouring a great general',
    ]);
    expect(said('theDevshirme')).toEqual([
      'a captured city of at least 6 citizens may spend one citizen for the best melee unit you can build as a Veteran, which counts as trained (once every 5 turns)',
    ]);
    expect(said('theArmedColony')).toEqual([
      'new cities claim 3 more hexes beside their borders at once, when founded beside one of your military units',
      'a new city founded beside one of your military units makes that unit a Veteran',
    ]);
  });
});
