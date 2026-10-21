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
 *
 * **Dominion batch D10, the data-only cards of Tiers I to III** (the D10
 * section of the triage). Each test below checks one card's text:
 *
 *   · The Acropolis: culture on a citadel hex, and authority for each citadel
 *     inside your borders, worked or not (reading 27);
 *   · The Castle Demesne: food and production on a citadel hex;
 *   · The Spartan Discipline: faster military units, slower buildings, the
 *     Magnum Opus included and wonders spared (reading 32);
 *   · The Naadam: culture and happiness for each pasture and camp in a town's
 *     borders, worked or not (reading 28);
 *   · The Tributary Kings: the capital paid for each citizen of your puppets
 *     (reading 30);
 *   · The Roll of Triumphs: a percentage for each great general gained
 *     (reading 33);
 *   · The March Revenues: a percentage for each pasture, camp and strategic
 *     resource inside your borders, a herd on a resource counted once
 *     (reading 29);
 *   · The Taker of Cities: strength in an attack on a town, beside one of
 *     your great generals (reading 31);
 *   · Commission: The Ranks of Merit, Commission: The First Province and
 *     Commission: Take the City: their goals, and the institutions they leave
 *     (readings 3, 10 to 13, and the triage's new reading 40).
 */

import { describe, expect, it } from 'vitest';

import { WONDER_IDS } from '../../../src/sim/buildingData';
import { settleCampBounty } from '../../../src/sim/camps';
import { bestMeleeFor, foundCityAt, settleRanksEarned } from '../../../src/sim/cities';
import { applyCombat, previewCombat } from '../../../src/sim/combat';
import { runCommissions } from '../../../src/sim/commissions';
import { type GreatPersonId } from '../../../src/sim/greatPeopleData';
import { type Tile, createMap, getTileAt, raiseImprovement } from '../../../src/sim/map';
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
  cardAuthority,
  cardHappiness,
  deckPoolOf,
  explainCardCityYields,
  explainCardPercentYields,
  recordScalingOccasion,
  slotOrderAt,
  slotOrderError,
  slotTypesOf,
  tallyOf,
  windfallPayout,
} from '../../../src/sim/statecraft';
import {
  type CardType,
  type OrderId,
  doctrineDef,
  orderDef,
  orderFitsSlot,
  orderIsDealt,
  poolDoctrines,
} from '../../../src/sim/statecraftData';
import { type TechId } from '../../../src/sim/techData';
import { unitDef, unitStampStrength } from '../../../src/sim/unitData';
import { resetVisibility } from '../../../src/sim/visibility';
import { openWar } from '../../../src/sim/wars';
import { explainTileYield, yieldContextFor } from '../../../src/sim/yields/hex';
import { productionModifiers } from '../../../src/sim/yields/town';
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

// --- Dominion batch D10 ------------------------------------------------------

const ACROPOLIS = 'theAcropolis' as OrderId;
const DEMESNE = 'theCastleDemesne' as OrderId;
const SPARTAN = 'theSpartanDiscipline' as OrderId;
const RANKS = 'dominionTheRanksOfMerit' as OrderId;
const PROVINCE = 'dominionTheFirstProvince' as OrderId;
const TAKE = 'dominionTakeTheCity' as OrderId;
const NAADAM = 'theNaadam' as OrderId;
const TAKER = 'theTakerOfCities' as OrderId;
const ROLL = 'theRollOfTriumphs' as OrderId;
const MARCH = 'theMarchRevenues' as OrderId;
const TRIBUTARY = 'theTributaryKings' as OrderId;
const GENERAL = 'ahmoseSonOfEbana' as GreatPersonId;

/** The hexes a town owns, its own hex left out, in map order. */
function ringOf(state: GameState, city: City): Tile[] {
  return state.map.tiles.filter(
    (tile, index) => state.tileOwner[index] === city.id && !(tile.col === city.col && tile.row === city.row),
  );
}

/** What one card's line pays on a hex, read off the hex's own breakdown. */
function hexPaid(state: GameState, tile: Tile, card: OrderId): Record<'food' | 'production' | 'culture', number> {
  const total = { food: 0, production: 0, culture: 0 };
  const name = orderDef(card).name;
  for (const line of explainTileYield(tile, yieldContextFor(state, 0))) {
    if (!line.source.includes(name)) continue;
    total.food += line.food;
    total.production += line.production;
    total.culture += line.culture;
  }
  return total;
}

/** One card's flat lines in a town, summed for one voice. */
function cityPaid(state: GameState, city: City, card: OrderId, voice: 'food' | 'production' | 'gold' | 'culture'): number {
  return explainCardCityYields(state, city)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line[voice], 0);
}

/** One card's percentage on a voice in a town. */
function percentPaid(state: GameState, city: City, card: OrderId, voice: string): number {
  return explainCardPercentYields(state, city)
    .filter((line) => line.card === card && line.yield === voice)
    .reduce((sum, line) => sum + line.percent, 0);
}

/** One card's line on a meter for seat 0. */
function meterPaid(lines: readonly { card: string; amount: number }[], card: OrderId): number {
  return lines.filter((line) => line.card === card).reduce((sum, line) => sum + line.amount, 0);
}

/** One card's percentage behind a build in a town. */
function buildPercent(state: GameState, city: City, item: City['queue'][number], card: OrderId): number {
  return productionModifiers(state, city, item)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line.percent, 0);
}

/** Seat 0 takes `town` with a warrior from the hex to its west, as a melee capture does. */
function take(state: GameState, town: City): void {
  town.hp = 1;
  const raider = createUnit(state, 0, 'warrior', town.col - 1, town.row);
  bumpRevision(state);
  const result = applyCombat(state, raider.id, { col: town.col, row: town.row });
  if (!result.ok) throw new Error(result.error);
  expect(town.ownerId, 'the town was taken').toBe(0);
}

/** Keeps seat 0's science and culture where a test can read them. */
function holdTheBanks(state: GameState): void {
  const player = seat(state, 0);
  player.researching = null;
  delete player.researchQueue;
  // A draft offer is waiting, so culture stays banked instead of buying a draft.
  player.statecraft.pendingOrder = { options: [] };
}

describe('Dominion D10: citadels', () => {
  it('The Acropolis: +2 culture on a citadel hex, and +1 authority for each citadel inside your borders, worked or not', () => {
    const state = flat(false);
    const capital = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, ACROPOLIS);
    const [keep, tower] = ringOf(state, capital);
    raiseImprovement(keep!, 'citadel', state.turn);
    raiseImprovement(tower!, 'citadel', state.turn);
    // A citadel outside every border counts nothing.
    raiseImprovement(at(state, 15, 9), 'citadel', state.turn);
    bumpRevision(state);
    expect(hexPaid(state, keep!, ACROPOLIS)).toEqual({ food: 0, production: 0, culture: 2 });
    // A town of one citizen works one hex at most, so at least one of the two
    // citadels is not worked, and both count (reading 27).
    expect(capital.population).toBe(1);
    expect(meterPaid(cardAuthority(state, 0), ACROPOLIS)).toBe(2);
    // The capital's buildings no longer count (the old text).
    capital.buildings.push('monument', 'granary');
    bumpRevision(state);
    expect(meterPaid(cardAuthority(state, 0), ACROPOLIS)).toBe(2);
  });

  it('The Castle Demesne: +3 food and +3 production on a citadel hex, and nothing on other hexes', () => {
    const state = flat(false);
    const capital = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, DEMESNE);
    const [keep, field] = ringOf(state, capital);
    raiseImprovement(keep!, 'citadel', state.turn);
    raiseImprovement(field!, 'farm', state.turn);
    bumpRevision(state);
    expect(hexPaid(state, keep!, DEMESNE)).toEqual({ food: 3, production: 3, culture: 0 });
    expect(hexPaid(state, field!, DEMESNE)).toEqual({ food: 0, production: 0, culture: 0 });
  });
});

describe('Dominion D10: towns', () => {
  it('The Spartan Discipline: +30% toward military units and −15% toward buildings, the Opus included; wonders and civilians are untouched', () => {
    const state = flat(false);
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, SPARTAN);
    const item = (kind: 'unit' | 'building', id: string) => ({ kind, id }) as City['queue'][number];
    expect(buildPercent(state, city, item('unit', 'warrior'), SPARTAN)).toBe(30);
    expect(buildPercent(state, city, item('unit', 'settler'), SPARTAN)).toBe(0);
    expect(buildPercent(state, city, item('building', 'monument'), SPARTAN)).toBe(-15);
    // Reading 32: the Magnum Opus is a building, and a wonder is not.
    expect(buildPercent(state, city, item('building', 'theMagnumOpus'), SPARTAN)).toBe(-15);
    expect(buildPercent(state, city, item('building', WONDER_IDS[0]!), SPARTAN)).toBe(0);
  });

  it('The Naadam: +2 culture and +1 happiness for each pasture and camp in a town’s borders, worked or not', () => {
    const state = flat(false);
    const herders = foundCityAt(state, 0, at(state, 4, 4))!;
    const farmers = foundCityAt(state, 0, at(state, 12, 6))!;
    slot(state, NAADAM);
    const [first, second, third, fourth] = ringOf(state, herders);
    raiseImprovement(first!, 'pasture', state.turn);
    raiseImprovement(second!, 'pasture', state.turn);
    raiseImprovement(third!, 'camp', state.turn);
    raiseImprovement(fourth!, 'farm', state.turn);
    raiseImprovement(ringOf(state, farmers)[0]!, 'farm', state.turn);
    bumpRevision(state);
    expect(cityPaid(state, herders, NAADAM, 'culture')).toBe(6);
    expect(cityPaid(state, farmers, NAADAM, 'culture')).toBe(0);
    expect(meterPaid(cardHappiness(state, 0), NAADAM)).toBe(3);
    // A barbarian camp is not the improvement: nothing stands on the hex.
    state.camps.push({ col: 15, row: 9 } as GameState['camps'][number]);
    bumpRevision(state);
    expect(meterPaid(cardHappiness(state, 0), NAADAM)).toBe(3);
  });

  it('The Tributary Kings: the capital gains +1 production and +1 gold for each citizen in your puppets', () => {
    const state = flat(false);
    const capital = foundCityAt(state, 0, at(state, 2, 2))!;
    const puppet = foundCityAt(state, 0, at(state, 9, 5))!;
    const annexed = foundCityAt(state, 0, at(state, 15, 9))!;
    puppet.puppet = true;
    puppet.population = 6;
    annexed.population = 4;
    slot(state, TRIBUTARY);
    bumpRevision(state);
    expect(cityPaid(state, capital, TRIBUTARY, 'production')).toBe(6);
    expect(cityPaid(state, capital, TRIBUTARY, 'gold')).toBe(6);
    // The tribute is the capital's: the puppet and the other town gain nothing.
    expect(cityPaid(state, puppet, TRIBUTARY, 'production')).toBe(0);
    expect(cityPaid(state, annexed, TRIBUTARY, 'gold')).toBe(0);
  });
});

describe('Dominion D10: counts over the empire', () => {
  it('The Roll of Triumphs: +5% production and gold for each great general gained, at most +30%', () => {
    const state = flat(false);
    const city = foundCityAt(state, 0, at(state, 4, 4))!;
    slot(state, ROLL);
    const player = seat(state, 0);
    expect(percentPaid(state, city, ROLL, 'production')).toBe(0);
    player.greatPeopleByFamily = { general: 2, scholar: 4 };
    bumpRevision(state);
    expect(percentPaid(state, city, ROLL, 'production')).toBe(10);
    expect(percentPaid(state, city, ROLL, 'gold')).toBe(10);
    player.greatPeopleByFamily = { general: 9 };
    bumpRevision(state);
    expect(percentPaid(state, city, ROLL, 'production')).toBe(30);
    expect(percentPaid(state, city, ROLL, 'gold')).toBe(30);
  });

  it('The March Revenues: +3% production for each pasture, camp and strategic resource inside your borders, a herd on a resource counted once, at most +30%', () => {
    const state = flat(false);
    const west = foundCityAt(state, 0, at(state, 4, 4))!;
    const east = foundCityAt(state, 0, at(state, 12, 6))!;
    slot(state, MARCH);
    const [pasture, camp, seam, herd, farm] = ringOf(state, west);
    raiseImprovement(pasture!, 'pasture', state.turn);
    raiseImprovement(camp!, 'camp', state.turn);
    // Obsidian needs no technology to be seen, so this count does not move
    // when batch D12 adds the sight gate (reading 29).
    seam!.resource = 'obsidian' as Tile['resource'];
    herd!.resource = 'obsidian' as Tile['resource'];
    raiseImprovement(herd!, 'pasture', state.turn);
    raiseImprovement(farm!, 'farm', state.turn);
    // A strategic resource outside every border counts nothing.
    at(state, 18, 1).resource = 'obsidian' as Tile['resource'];
    bumpRevision(state);
    expect(percentPaid(state, west, MARCH, 'production')).toBe(12);
    // The count is the empire's, so every town gains the same.
    expect(percentPaid(state, east, MARCH, 'production')).toBe(12);
    for (const tile of [...ringOf(state, west), ...ringOf(state, east)]) {
      if (tile.improvement === undefined) raiseImprovement(tile, 'camp', state.turn);
    }
    bumpRevision(state);
    expect(percentPaid(state, west, MARCH, 'production')).toBe(30);
  });
});

describe('Dominion D10: the captains', () => {
  it('The Taker of Cities: +5 strength in an attack on a town, beside one of your great generals, and nowhere else', () => {
    const state = flat();
    slot(state, TAKER);
    const town = foundCityAt(state, 1, at(state, 8, 4))!;
    const card = orderDef(TAKER).name;
    const lines = (unit: Unit, col: number, row: number, side: 'attacker' | 'defender'): number => {
      const view = previewCombat(state, unit.id, { col, row });
      if (!view.ok) throw new Error(view.error);
      return (side === 'attacker' ? view.attackerLines : view.defenderLines)
        .filter((line) => line.source.includes(card))
        .reduce((sum, line) => sum + line.amount, 0);
    };
    const alone = createUnit(state, 0, 'warrior', town.col - 1, town.row);
    bumpRevision(state);
    expect(lines(alone, town.col, town.row, 'attacker')).toBe(0);
    createUnit(state, 0, 'greatPerson', town.col - 2, town.row, GENERAL);
    bumpRevision(state);
    expect(lines(alone, town.col, town.row, 'attacker')).toBe(5);
    // Against a unit in the field, beside the same general: nothing.
    const field = createUnit(state, 1, 'warrior', town.col - 2, town.row + 1);
    bumpRevision(state);
    expect(lines(alone, field.col, field.row, 'attacker')).toBe(0);
    // In defence: nothing.
    expect(lines(field, alone.col, alone.row, 'defender')).toBe(0);
  });
});

describe('Dominion D10: the commissions and their institutions', () => {
  it('The Ranks of Merit: three ranks while seated; then each rank pays its strength in science, and in production in the capital', () => {
    expect(orderDef(RANKS).commission?.goals).toEqual([{ kind: 'counted', occasion: 'rankEarned', count: 3 }]);
    const state = flat(false);
    const capital = foundCityAt(state, 0, at(state, 2, 2))!;
    const far = foundCityAt(state, 0, at(state, 14, 8))!;
    holdTheBanks(state);
    const player = seat(state, 0);
    const soldier = createUnit(state, 0, 'warrior', far.col + 1, far.row);
    const strength = Math.max(0, unitDef(soldier.type).combatStrength + unitStampStrength(soldier));
    seatCommission(state, RANKS);
    // While the card is seated, a rank pays nothing from it.
    const science = player.sciencePool;
    settleRanksEarned(state, soldier, ['veteran']);
    expect(player.sciencePool).toBe(science);
    expect(tallyOf(player.statecraft, RANKS)).toBe(1);
    expect(runCommissions(state)).toEqual([]);
    recordScalingOccasion(state, 0, 'rankEarned', 2);
    const reports = runCommissions(state);
    expect(reports.map((report) => report.card)).toEqual([RANKS]);
    // The institution pays nothing at once.
    expect(reports[0]!.lines).toEqual([]);
    expect(player.statecraft.slots.some((held) => held?.card === RANKS)).toBe(false);
    // Then a rank pays its strength in science, and in production in the
    // capital, however far the unit stands from it (reading 12). The
    // hammers wait in the capital's basket for the turn's production step
    // (reading 40).
    const before = { science: player.sciencePool, capital: capital.hammerBasket, far: far.hammerBasket };
    settleRanksEarned(state, soldier, ['elite']);
    expect(player.sciencePool - before.science).toBe(strength);
    expect(capital.hammerBasket - before.capital).toBe(strength);
    expect(far.hammerBasket).toBe(before.far);
  });

  it('The First Province: one town captured while seated; then towns you captured gain +5 food and +5 gold', () => {
    expect(orderDef(PROVINCE).commission?.goals).toEqual([{ kind: 'counted', occasion: 'cityCaptured', count: 1 }]);
    const state = flat();
    const home = foundCityAt(state, 0, at(state, 2, 2))!;
    foundCityAt(state, 1, at(state, 16, 9));
    const first = foundCityAt(state, 1, at(state, 8, 4))!;
    const second = foundCityAt(state, 1, at(state, 12, 8))!;
    holdTheBanks(state);
    seatCommission(state, PROVINCE);
    take(state, first);
    expect(tallyOf(seat(state, 0).statecraft, PROVINCE)).toBe(1);
    // Not yet an institution: the town taken gains nothing from it yet.
    expect(cityPaid(state, first, PROVINCE, 'food')).toBe(0);
    const reports = runCommissions(state);
    expect(reports.map((report) => report.card)).toEqual([PROVINCE]);
    expect(reports[0]!.lines).toEqual([]);
    bumpRevision(state);
    // Every town taken, in unrest or not (reading 13), and a later one too.
    expect(cityPaid(state, first, PROVINCE, 'food')).toBe(5);
    expect(cityPaid(state, first, PROVINCE, 'gold')).toBe(5);
    take(state, second);
    bumpRevision(state);
    expect(cityPaid(state, second, PROVINCE, 'gold')).toBe(5);
    // A town you founded gains nothing.
    expect(cityPaid(state, home, PROVINCE, 'food')).toBe(0);
  });

  it('Take the City: a town of eight; then each later capture pays 250 science and 250 culture for each age, twice under Vae Victis', () => {
    expect(orderDef(TAKE).commission?.goals).toEqual([
      { kind: 'counted', occasion: 'cityCaptured', count: 1, minPopulation: 8 },
    ]);
    const state = flat();
    foundCityAt(state, 0, at(state, 2, 2));
    foundCityAt(state, 1, at(state, 18, 10));
    const small = foundCityAt(state, 1, at(state, 7, 3))!;
    const big = foundCityAt(state, 1, at(state, 12, 6))!;
    const later = foundCityAt(state, 1, at(state, 7, 9))!;
    small.population = 7;
    big.population = 8;
    holdTheBanks(state);
    const player = seat(state, 0);
    seatCommission(state, TAKE);
    take(state, small);
    expect(tallyOf(player.statecraft, TAKE)).toBe(0);
    // The capture that meets the goal pays no science from the card
    // (reading 10): the goal is checked at the end of the turn.
    const science = player.sciencePool;
    take(state, big);
    expect(tallyOf(player.statecraft, TAKE)).toBe(1);
    expect(player.sciencePool).toBe(science);
    const reports = runCommissions(state);
    expect(reports.map((report) => report.card)).toEqual([TAKE]);
    // No one-time payout, and no Barracks.
    expect(reports[0]!.lines).toEqual([]);
    expect(big.buildings).not.toContain('barracks');
    // Each later capture: 250 of each, times the seat's age (reading 3).
    const grants = () =>
      windfallPayout(state, 0, 'capture', 0, 0, {})
        .grants.filter((grant) => grant.card === TAKE)
        .map((grant) => ({ yield: grant.yield, amount: grant.amount }));
    expect(grants()).toEqual([
      { yield: 'science', amount: 250 },
      { yield: 'culture', amount: 250 },
    ]);
    player.techsResearched.push('philosophy' as TechId);
    bumpRevision(state);
    expect(grants()).toEqual([
      { yield: 'science', amount: 750 },
      { yield: 'culture', amount: 750 },
    ]);
    // In a real capture.
    const banks = { science: player.sciencePool, culture: player.culturePool };
    take(state, later);
    expect(player.sciencePool - banks.science).toBe(750);
    expect(player.culturePool - banks.culture).toBe(750);
    // Vae Victis pays an institution's capture rider twice (reading 11).
    slot(state, 'vaeVictis' as OrderId);
    expect(grants()).toEqual([
      { yield: 'science', amount: 1500 },
      { yield: 'culture', amount: 1500 },
    ]);
  });
});

describe('Dominion D10: the deal', () => {
  it('deals each card to a Dominion seat, at its tier and with its type', () => {
    const cards: [OrderId, number, CardType][] = [
      [ACROPOLIS, 1, 'civic'],
      [DEMESNE, 1, 'economic'],
      [SPARTAN, 1, 'military'],
      [RANKS, 1, 'wildcard'],
      [PROVINCE, 1, 'wildcard'],
      [TAKE, 2, 'wildcard'],
      [NAADAM, 2, 'civic'],
      [TAKER, 2, 'military'],
      [ROLL, 2, 'economic'],
      [MARCH, 3, 'economic'],
      [TRIBUTARY, 3, 'economic'],
    ];
    const state = flat();
    const player = seat(state, 0);
    player.decks = ['dominion', 'magisterial'];
    const pool = deckPoolOf(state, player);
    for (const [id, band, type] of cards) {
      expect(orderIsDealt(id), id).toBe(true);
      expect(orderDef(id).band, id).toBe(band);
      expect(orderDef(id).type, id).toBe(type);
      expect(orderDef(id).decks, id).toEqual(['dominion']);
      expect(pool, id).toContain(id);
    }
  });
});
