/**
 * **Dominion batch D11, the commissions** (`docs/plans/dominion-themes-
 * triage.md`, the D11 section). `dominion.test.ts` checks the rows against the
 * sheet, and `test/fixtures/cardText.json` pins their words. This file checks
 * that each new shape and each card does what its text says:
 *
 *   · feature C: the `commissionMet` moment fires once for each commission
 *     met, of any deck, and the `commissionsMet` count reads every commission
 *     met this game (reading 34). The Ovation and The Res Gestae read them
 *     (readings 18 and 19);
 *   · Commission: Man the Walls: the `garrisonedTowns` figure, and a reward
 *     paid flat to each town a scope admits, settled at once (reading 17);
 *   · Commission: The Chosen Men: an Elite floor on the rank tally, and a
 *     zone-of-control rule narrowed to Elite pieces (reading 16);
 *   · Commission: The Border Fortress: a floor on the work a great person
 *     lays (reading 15);
 *   · Commission: The Captured Marvel: the `rivalCapital` town scope, and an
 *     institution in place of the one-time payout (reading 14);
 *   · reading 40: a rank's production settles at once, except inside a
 *     completion (reading 41).
 */

import { describe, expect, it } from 'vitest';

import { WONDER_IDS } from '../../../src/sim/buildingData';
import {
  explainBuildingCost,
  foldUnitCost,
  foundCityAt,
  realiseItem,
  settleRanksEarned,
} from '../../../src/sim/cities';
import { applyCombat } from '../../../src/sim/combat';
import { commissionFigure, commissionProgress, runCommissions } from '../../../src/sim/commissions';
import { type GreatPersonId } from '../../../src/sim/greatPeopleData';
import { greatPersonWorkAt } from '../../../src/sim/greatPeople';
import { type Tile, createMap, getTileAt } from '../../../src/sim/map';
import { moveProfile } from '../../../src/sim/pathfind';
import { makeRng } from '../../../src/sim/rng';
import { RULES } from '../../../src/sim/rulesData';
import {
  type City,
  type GameState,
  type Player,
  bumpRevision,
  createUnit,
  playerById,
  realPlayers,
} from '../../../src/sim/state';
import {
  cardZocIgnored,
  cityScopeAdmits,
  deckPoolOf,
  explainCardPercentYields,
  recordScalingOccasion,
  slotOrderAt,
  slotOrderError,
  slotTypesOf,
  tallyOf,
} from '../../../src/sim/statecraft';
import { type CardType, type OrderId, orderDef, orderFitsSlot, orderIsDealt } from '../../../src/sim/statecraftData';
import { unitDef, unitStampStrength } from '../../../src/sim/unitData';
import { resetVisibility } from '../../../src/sim/visibility';
import { openWar } from '../../../src/sim/wars';
import { explainTileYield, yieldContextFor } from '../../../src/sim/yields/hex';
import { newGame } from '../newGameHelpers';

const OVATION = 'theOvation' as OrderId;
const RES_GESTAE = 'theResGestae' as OrderId;
const WALLS = 'dominionManTheWalls' as OrderId;
const FORTRESS = 'dominionTheBorderFortress' as OrderId;
const CHOSEN = 'dominionTheChosenMen' as OrderId;
const MARVEL = 'dominionTheCapturedMarvel' as OrderId;
const RANKS = 'dominionTheRanksOfMerit' as OrderId;
const STRONGROOM = 'theStrongroom' as OrderId;
const GENERAL = 'ahmoseSonOfEbana' as GreatPersonId;

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

/** One card's percentage on a voice in a town. */
function percentPaid(state: GameState, city: City, card: OrderId, voice: string): number {
  return explainCardPercentYields(state, city)
    .filter((line) => line.card === card && line.yield === voice)
    .reduce((sum, line) => sum + line.percent, 0);
}

/** What one card's line pays on a hex, read off the hex's own breakdown. */
function hexPaid(state: GameState, tile: Tile, card: OrderId): { food: number; production: number } {
  const total = { food: 0, production: 0 };
  const name = orderDef(card).name;
  for (const line of explainTileYield(tile, yieldContextFor(state, 0))) {
    if (!line.source.includes(name)) continue;
    total.food += line.food;
    total.production += line.production;
  }
  return total;
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

/** The cost of one building for seat 0, as the queue charges it. */
function buildingCost(state: GameState, id: 'monument'): number {
  return foldUnitCost(explainBuildingCost(id, state, 0));
}

/** The timed effects The Ovation has hung on seat 0. */
function ovationTimed(state: GameState) {
  return (seat(state, 0).timed ?? []).filter((held) => held.card === OVATION);
}

/** Seat 0 meets The Strongroom (a Commerce commission) at the next check. */
function meetStrongroom(state: GameState): void {
  slot(state, STRONGROOM);
  seat(state, 0).gold = 2500;
  bumpRevision(state);
}

describe('Dominion D11 — feature C: a commission met is a moment and a count', () => {
  it('The Ovation: a commission of any deck gives every town +30% production for ten turns, and another restarts the ten turns', () => {
    const state = flat(false);
    const capital = foundCityAt(state, 0, at(state, 2, 2))!;
    const other = foundCityAt(state, 0, at(state, 12, 6))!;
    slot(state, OVATION);
    expect(percentPaid(state, capital, OVATION, 'production')).toBe(0);
    // A Commerce commission counts (reading 34).
    meetStrongroom(state);
    expect(runCommissions(state).map((report) => report.card)).toEqual([STRONGROOM]);
    bumpRevision(state);
    expect(percentPaid(state, capital, OVATION, 'production')).toBe(30);
    expect(percentPaid(state, other, OVATION, 'production')).toBe(30);
    const first = ovationTimed(state);
    expect(first.length).toBeGreaterThan(0);
    for (const held of first) expect(held.expiresTurn).toBe(state.turn + 10);
    // Four turns on, a Dominion commission restarts the ten turns. Nothing
    // stacks: the same entries are written with the later expiry.
    state.turn += 4;
    for (const town of [capital, other, foundCityAt(state, 0, at(state, 7, 9))!]) {
      createUnit(state, 0, 'warrior', town.col, town.row);
    }
    seatCommission(state, WALLS);
    expect(runCommissions(state).map((report) => report.card)).toEqual([WALLS]);
    bumpRevision(state);
    const second = ovationTimed(state);
    expect(second.length).toBe(first.length);
    for (const held of second) expect(held.expiresTurn).toBe(state.turn + 10);
    expect(percentPaid(state, capital, OVATION, 'production')).toBe(30);
  });

  it('pays nothing on the moment while The Ovation is not held', () => {
    const state = flat(false);
    foundCityAt(state, 0, at(state, 2, 2));
    meetStrongroom(state);
    expect(runCommissions(state).map((report) => report.card)).toEqual([STRONGROOM]);
    expect(ovationTimed(state)).toEqual([]);
  });

  it('The Res Gestae: +4% production and culture for each commission met this game, those met before it was seated included, at most +28%', () => {
    const state = flat(false);
    const capital = foundCityAt(state, 0, at(state, 2, 2))!;
    // A commission met before the card is seated counts (reading 19).
    meetStrongroom(state);
    runCommissions(state);
    slot(state, RES_GESTAE);
    expect(percentPaid(state, capital, RES_GESTAE, 'production')).toBe(4);
    expect(percentPaid(state, capital, RES_GESTAE, 'culture')).toBe(4);
    const sc = seat(state, 0).statecraft;
    sc.commissionsFulfilled = [
      ...(sc.commissionsFulfilled ?? []),
      { card: WALLS, turn: state.turn },
      { card: RANKS, turn: state.turn },
    ];
    bumpRevision(state);
    expect(percentPaid(state, capital, RES_GESTAE, 'production')).toBe(12);
    // The eighth commission adds nothing.
    for (const card of [FORTRESS, CHOSEN, MARVEL, 'dominionClearTheFrontier', 'dominionBattleHonours'] as OrderId[]) {
      sc.commissionsFulfilled = [...sc.commissionsFulfilled, { card, turn: state.turn }];
    }
    bumpRevision(state);
    expect(sc.commissionsFulfilled.length).toBe(8);
    expect(percentPaid(state, capital, RES_GESTAE, 'production')).toBe(28);
    expect(percentPaid(state, capital, RES_GESTAE, 'culture')).toBe(28);
  });
});

describe('Dominion D11 — Commission: Man the Walls', () => {
  it('counts the towns with a combat unit of yours on their hex, and pays 30 production to each of them at once', () => {
    expect(orderDef(WALLS).commission?.goals).toEqual([{ kind: 'reached', figure: 'garrisonedTowns', count: 3 }]);
    const state = flat(false);
    const towns = [
      foundCityAt(state, 0, at(state, 2, 2))!,
      foundCityAt(state, 0, at(state, 8, 4))!,
      foundCityAt(state, 0, at(state, 14, 8))!,
      foundCityAt(state, 0, at(state, 8, 9))!,
    ];
    const [first, second, third, fourth] = towns as [City, City, City, City];
    // A town with nothing standing in it, one with a worker, and one with a
    // rival's soldier beside it count nothing.
    createUnit(state, 0, 'warrior', first.col, first.row);
    createUnit(state, 0, 'worker', fourth.col, fourth.row);
    createUnit(state, 1, 'warrior', second.col + 1, second.row);
    bumpRevision(state);
    expect(commissionFigure(state, 0, 'garrisonedTowns')).toBe(1);
    createUnit(state, 0, 'warrior', second.col, second.row);
    bumpRevision(state);
    seatCommission(state, WALLS);
    expect(commissionProgress(state, 0, WALLS)[0]).toMatchObject({ have: 2, need: 3, met: false });
    expect(runCommissions(state)).toEqual([]);
    createUnit(state, 0, 'warrior', third.col, third.row);
    bumpRevision(state);
    expect(commissionFigure(state, 0, 'garrisonedTowns')).toBe(3);
    // The first town is building a Monument and lacks a little, so the 30
    // production finishes it at once (reading 17).
    const cost = buildingCost(state, 'monument');
    first.queue = [{ kind: 'building', id: 'monument' }];
    first.hammerBasket = cost - 10;
    const before = towns.map((town) => town.hammerBasket);
    const reports = runCommissions(state);
    expect(reports.map((report) => report.card)).toEqual([WALLS]);
    expect(reports[0]!.lines).toEqual([
      `+30 production in ${first.name}`,
      `+30 production in ${second.name}`,
      `+30 production in ${third.name}`,
    ]);
    expect(first.buildings).toContain('monument');
    expect(first.queue).toEqual([]);
    expect(first.hammerBasket).toBe(20);
    expect(second.hammerBasket - before[1]!).toBe(30);
    expect(third.hammerBasket - before[2]!).toBe(30);
    // The town with only a worker in it gains nothing.
    expect(fourth.hammerBasket).toBe(before[3]);
  });
});

describe('Dominion D11 — Commission: The Chosen Men', () => {
  it('counts only Elite ranks earned while seated, then lets Elite units ignore enemy zone of control', () => {
    expect(orderDef(CHOSEN).commission?.goals).toEqual([
      { kind: 'counted', occasion: 'rankEarned', count: 3, rank: 'elite' },
    ]);
    const state = flat(false);
    foundCityAt(state, 0, at(state, 2, 2));
    const sc = seat(state, 0).statecraft;
    seatCommission(state, CHOSEN);
    const soldier = createUnit(state, 0, 'warrior', 5, 5);
    // A Veteran rank does not count (reading 16).
    settleRanksEarned(state, soldier, ['veteran']);
    expect(tallyOf(sc, CHOSEN)).toBe(0);
    settleRanksEarned(state, soldier, ['elite']);
    expect(tallyOf(sc, CHOSEN)).toBe(1);
    // A unit that goes from no rank to Elite in one step counts once here.
    settleRanksEarned(state, createUnit(state, 0, 'warrior', 6, 5), ['veteran', 'elite']);
    expect(tallyOf(sc, CHOSEN)).toBe(2);
    // A moment with no rank never meets the floor.
    recordScalingOccasion(state, 0, 'rankEarned');
    expect(tallyOf(sc, CHOSEN)).toBe(2);
    expect(runCommissions(state)).toEqual([]);
    recordScalingOccasion(state, 0, 'rankEarned', 1, { rank: 'elite' });
    const reports = runCommissions(state);
    expect(reports.map((report) => report.card)).toEqual([CHOSEN]);
    expect(reports[0]!.lines).toEqual([]);
    bumpRevision(state);
    const ladder = RULES.combat.ranks.ladder;
    const elite = createUnit(state, 0, 'warrior', 9, 5);
    elite.experience = ladder.elite.experience;
    const veteran = createUnit(state, 0, 'warrior', 10, 5);
    veteran.experience = ladder.veteran.experience;
    bumpRevision(state);
    // The rule is read off the piece, not its type.
    expect(cardZocIgnored(state, 0, elite)).toBe(true);
    expect(cardZocIgnored(state, 0, veteran)).toBe(false);
    expect(moveProfile(state, elite).ignoresZoc).toBe(true);
    expect(moveProfile(state, veteran).ignoresZoc).toBeUndefined();
  });

  it('counts every rank once, with its rank, for a card that counts all ranks', () => {
    const state = flat(false);
    foundCityAt(state, 0, at(state, 2, 2));
    const sc = seat(state, 0).statecraft;
    seatCommission(state, RANKS);
    settleRanksEarned(state, createUnit(state, 0, 'warrior', 5, 5), ['veteran', 'elite']);
    expect(tallyOf(sc, RANKS)).toBe(2);
    expect(seat(state, 0).ranksEarned).toBe(2);
  });
});

describe('Dominion D11 — Commission: The Border Fortress', () => {
  it('counts a great person spent on a citadel while seated, and nothing else; then citadels give +2 food and +2 production', () => {
    expect(orderDef(FORTRESS).commission?.goals).toEqual([
      { kind: 'counted', occasion: 'greatPersonSpent', count: 1, work: 'citadel' },
    ]);
    const state = flat(false);
    const capital = foundCityAt(state, 0, at(state, 4, 4))!;
    const sc = seat(state, 0).statecraft;
    seatCommission(state, FORTRESS);
    // A boon and another family's work do not count (reading 15).
    recordScalingOccasion(state, 0, 'greatPersonSpent');
    recordScalingOccasion(state, 0, 'greatPersonSpent', 1, { improvement: 'academy' });
    expect(tallyOf(sc, FORTRESS)).toBe(0);
    const hex = at(state, capital.col + 1, capital.row);
    const general = createUnit(state, 0, 'greatPerson', hex.col, hex.row, GENERAL);
    bumpRevision(state);
    expect(hexPaid(state, hex, FORTRESS)).toEqual({ food: 0, production: 0 });
    greatPersonWorkAt(state, seat(state, 0), general, hex);
    expect(hex.improvement).toBe('citadel');
    expect(tallyOf(sc, FORTRESS)).toBe(1);
    const reports = runCommissions(state);
    expect(reports.map((report) => report.card)).toEqual([FORTRESS]);
    expect(reports[0]!.lines).toEqual([]);
    bumpRevision(state);
    expect(hexPaid(state, hex, FORTRESS)).toEqual({ food: 2, production: 2 });
  });
});

describe('Dominion D11 — Commission: The Captured Marvel', () => {
  it('reads a town founded as another empire’s capital, never the holder’s own', () => {
    const state = flat();
    const home = foundCityAt(state, 0, at(state, 2, 2))!;
    const rivalSeat = foundCityAt(state, 1, at(state, 16, 9))!;
    const rivalTown = foundCityAt(state, 1, at(state, 8, 4))!;
    const scope = { test: 'rivalCapital' } as const;
    expect(home.originalCapitalOf).toBe(0);
    expect(cityScopeAdmits(state, home, scope, 0)).toBe(false);
    expect(cityScopeAdmits(state, rivalSeat, scope, 1)).toBe(false);
    expect(cityScopeAdmits(state, rivalTown, scope, 1)).toBe(false);
    take(state, rivalSeat);
    expect(cityScopeAdmits(state, rivalSeat, scope, 0)).toBe(true);
  });

  it('pays no one-time reward; then captured towns that hold a world wonder or were a rival’s capital gain +30% science and culture', () => {
    const state = flat();
    const home = foundCityAt(state, 0, at(state, 2, 2))!;
    const rivalSeat = foundCityAt(state, 1, at(state, 16, 9))!;
    const marvel = foundCityAt(state, 1, at(state, 8, 4))!;
    const plain = foundCityAt(state, 1, at(state, 12, 8))!;
    foundCityAt(state, 1, at(state, 18, 2));
    const wonder = WONDER_IDS[0]!;
    marvel.buildings.push(wonder);
    home.buildings.push(WONDER_IDS[1]!);
    seatCommission(state, MARVEL);
    take(state, rivalSeat);
    expect(tallyOf(seat(state, 0).statecraft, MARVEL)).toBe(1);
    const reports = runCommissions(state);
    expect(reports.map((report) => report.card)).toEqual([MARVEL]);
    // No one-time payout (reading 14).
    expect(reports[0]!.lines).toEqual([]);
    take(state, marvel);
    take(state, plain);
    bumpRevision(state);
    for (const voice of ['science', 'culture']) {
      expect(percentPaid(state, rivalSeat, MARVEL, voice), `${voice}: a rival's capital`).toBe(30);
      expect(percentPaid(state, marvel, MARVEL, voice), `${voice}: a wonder`).toBe(30);
      expect(percentPaid(state, plain, MARVEL, voice), `${voice}: neither`).toBe(0);
      // A town you founded is not captured, wonder or not.
      expect(percentPaid(state, home, MARVEL, voice), `${voice}: your own town`).toBe(0);
    }
    // A captured town that loses its wonder, and was never a capital, stops paying.
    marvel.buildings = marvel.buildings.filter((id) => id !== wonder);
    bumpRevision(state);
    expect(percentPaid(state, marvel, MARVEL, 'science')).toBe(0);
  });
});

describe('Dominion D11 — a rank’s production settles at once (readings 40 and 41)', () => {
  /** Seat 0 with The Ranks of Merit's institution, and a capital a little short of a Monument. */
  function ranked(): { state: GameState; capital: City; short: number } {
    const state = flat(false);
    const capital = foundCityAt(state, 0, at(state, 2, 2))!;
    foundCityAt(state, 0, at(state, 14, 8));
    seat(state, 0).statecraft.commissionsFulfilled = [{ card: RANKS, turn: state.turn }];
    capital.queue = [{ kind: 'building', id: 'monument' }];
    const short = 1;
    capital.hammerBasket = buildingCost(state, 'monument') - short;
    bumpRevision(state);
    return { state, capital, short };
  }

  it('finishes the capital’s build at once when a rank is earned in the field', () => {
    const { state, capital, short } = ranked();
    const soldier = createUnit(state, 0, 'warrior', 15, 8);
    const strength = Math.max(0, unitDef(soldier.type).combatStrength + unitStampStrength(soldier));
    expect(strength).toBeGreaterThan(short);
    settleRanksEarned(state, soldier, ['veteran']);
    expect(capital.buildings).toContain('monument');
    expect(capital.queue).toEqual([]);
    expect(capital.hammerBasket).toBe(strength - short);
  });

  it('leaves the hammers in the basket for a unit gained already holding a rank, inside a completion', () => {
    const { state, capital } = ranked();
    const basket = capital.hammerBasket;
    const tile = at(state, capital.col + 1, capital.row);
    const made = realiseItem(state, capital, { kind: 'unit', id: 'warrior', tile }, { free: true, rank: 'veteran' });
    const unit = state.units.find((piece) => piece.id === made.unitId)!;
    const strength = Math.max(0, unitDef(unit.type).combatStrength + unitStampStrength(unit));
    expect(capital.buildings).not.toContain('monument');
    expect(capital.hammerBasket - basket).toBe(strength);
  });
});

describe('Dominion D11 — the deal', () => {
  it('deals each card to a Dominion seat, at its tier and with its type', () => {
    const cards: [OrderId, number, CardType][] = [
      [WALLS, 0, 'wildcard'],
      [OVATION, 1, 'economic'],
      [RES_GESTAE, 2, 'civic'],
      [FORTRESS, 2, 'wildcard'],
      [CHOSEN, 3, 'wildcard'],
      [MARVEL, 4, 'wildcard'],
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
