/**
 * **Works on the land, and the wonder towns** (batch MG9 of
 * `docs/plans/magisterial-themes-triage.md`).
 *
 * Batch MG9 builds four cards and the shapes under them:
 *
 *   · the work-laid moment (`improvementBuilt`, paid by `payWorkLaidRiders`)
 *     carries its hex, so a rider's tile test can ask what now stands there,
 *     and a grant, `claimBeside`, gives the unowned hexes beside the moment's
 *     hex to the nearest town (`claimUnownedBeside`). Card: The Landmark
 *     Bounds (the triage's reading 29);
 *   · a combat condition, `standingOnWork`: the piece stands on a
 *     great-person work, whoever owns it. Card: The Custodians, +4 strength
 *     in attack and defence (reading 30);
 *   · a commission figure, `oneTownWorksWorked`, with a floor on the town's
 *     wonders (`wondersAtLeast`), and `commissionGoalTown` names the first
 *     town that meets both. Card: Commission: The Ideal City, +25% culture,
 *     science and production in that town for good (reading 33);
 *   · an action rule, `wonderHammersMoveOn`, read in `refundBeatenWonders`: a
 *     lost wonder race moves its hammers to the town's next item in place of
 *     the gold. Card: The Envious Eye (reading 34).
 */

import { describe, expect, it } from 'vitest';

import { WONDER_IDS } from '../../../src/sim/buildingData';
import {
  buildingProductionCost,
  claimUnownedBeside,
  foundCityAt,
  ownedTiles,
  queueItemName,
  refreshCityDerived,
  settleProduction,
} from '../../../src/sim/cities';
import { previewCombat } from '../../../src/sim/combat';
import { commissionFigure, commissionGoalTown, runCommissions, worksTownFor } from '../../../src/sim/commissions';
import { greatPersonWorkAt } from '../../../src/sim/greatPeople';
import { type Family, GREAT_PERSON_IDS, type GreatPersonId, greatPersonDef } from '../../../src/sim/greatPeopleData';
import { payWorkLaidRiders } from '../../../src/sim/improvements';
import { type ImprovementId } from '../../../src/sim/improvementData';
import { type Tile, neighborTiles, raiseImprovement, tileHex, tileIndex } from '../../../src/sim/map';
import { RULES } from '../../../src/sim/rulesData';
import {
  type City,
  type GameState,
  type Unit,
  addBuilding,
  bumpRevision,
  createUnit,
  playerById,
  queueItemKey,
} from '../../../src/sim/state';
import {
  commissionFulfilledTurn,
  describeCard,
  explainCardPercentYields,
  stripRefs,
} from '../../../src/sim/statecraft';
import {
  type CommissionGoal,
  type OrderId,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import { at, bareState } from '../improvementHelpers';

const BOUNDS = 'theLandmarkBounds' as OrderId;
const CUSTODIANS = 'theCustodians' as OrderId;
const ENVIOUS = 'theEnviousEye' as OrderId;
const IDEAL = 'magisterialTheIdealCity' as OrderId;

/** The four rows batch MG9 dealt, with the tier, rarity and type the sheet gives each. */
const MG9_ROWS: readonly [OrderId, number, string, string][] = [
  [BOUNDS, 1, 'uncommon', 'economic'],
  [CUSTODIANS, 2, 'common', 'military'],
  [ENVIOUS, 2, 'uncommon', 'economic'],
  [IDEAL, 4, 'rare', 'wildcard'],
];

/** The wonder every race here is run for. */
const WONDER = 'theOracle' as const;
const REFUND_RATE = RULES.production.wonderRefundGoldPerHammer;

/** Puts a card in a chair for a seat, the way the reading sees it. */
function seat(state: GameState, card: OrderId, playerId = 0): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** A town of three citizens for a seat, with an empty queue. A seat's first town is its capital. */
function town(state: GameState, col: number, row: number, playerId = 0): City {
  const city = foundCityAt(state, playerId, at(state, col, row));
  city.population = 3;
  city.largestSize = 3;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/** The first great person of this family in the roster, in table order. */
function personOf(family: Family): GreatPersonId {
  const id = GREAT_PERSON_IDS.find((person) => greatPersonDef(person).family === family);
  expect(id, family).toBeDefined();
  return id!;
}

/** A great person of this family for seat 0, standing on a hex. */
function person(state: GameState, tile: Tile, family: Family): Unit {
  const unit = createUnit(state, 0, 'greatPerson', tile.col, tile.row, personOf(family));
  bumpRevision(state);
  return unit;
}

/** The six hexes around a hex, in the map's neighbour order. */
function ringOf(state: GameState, tile: Tile): Tile[] {
  return neighborTiles(state.map, tileHex(tile));
}

/** Which town owns a hex, or `null`. */
function ownerOf(state: GameState, tile: Tile): number | null {
  return state.tileOwner[tileIndex(state.map, tile.col, tile.row)] ?? null;
}

/** A hex of the town's ring with unowned ground beside it, in map order. */
function edgeHex(state: GameState, city: City): Tile {
  const edge = ownedTiles(state, city).find(
    (tile) =>
      !(tile.col === city.col && tile.row === city.row) &&
      ringOf(state, tile).some((next) => ownerOf(state, next) === null),
  );
  expect(edge, `${city.name} has an edge hex`).toBeDefined();
  return edge!;
}

/** The printed clauses of a card, with the keyword marks taken out. */
function words(id: OrderId): string[] {
  return describeCard(id).map((clause) => stripRefs(clause.text));
}

// --- the rows ------------------------------------------------------------------

describe('Magisterial batch MG9: the rows', () => {
  it('deals all four from the tier, rarity and type the sheet names', () => {
    for (const [id, band, rarity, type] of MG9_ROWS) {
      const def = orderDef(id);
      expect(orderIsDealt(id), id).toBe(true);
      expect(def.decks, id).toEqual(['magisterial']);
      expect(ordersForDecks(['magisterial']), id).toContain(id);
      expect(def.band, id).toBe(band);
      expect(def.rarity, id).toBe(rarity);
      expect(def.type, id).toBe(type);
      expect(def.deferred, id).toBeUndefined();
    }
  });

  it('carries the text of the sheet and the shapes the triage names', () => {
    expect(orderDef(BOUNDS).text).toBe('Laying a great-person work claims every unowned hex beside it.');
    expect(orderDef(BOUNDS).effects).toEqual([
      { kind: 'windfallRider', occasion: 'improvementBuilt', on: { test: 'greatWork' }, grant: { claimBeside: true } },
    ]);
    expect(orderDef(CUSTODIANS).text).toBe('Your units standing on a great-person work gain +4 strength.');
    expect(orderDef(CUSTODIANS).effects).toEqual([
      { kind: 'combatLine', amount: 4, side: 'both', when: { test: 'standingOnWork' } },
    ]);
    expect(orderDef(ENVIOUS).text).toBe(
      "When a rival completes a wonder you were building, the production you put into it moves to the next item in that town's queue.",
    );
    expect(orderDef(ENVIOUS).effects).toEqual([{ kind: 'rule', rule: 'wonderHammersMoveOn' }]);
    expect(orderDef(IDEAL).text).toBe(
      'Commission. Have one of your towns hold two wonders and work three great-person works. Then, for the rest of the game, that town gains +25% culture, science and production. The card leaves its chair.',
    );
    expect(orderDef(IDEAL).effects).toEqual([]);
    const scope = { test: 'markedBy', card: IDEAL };
    expect(orderDef(IDEAL).commission).toEqual({
      goals: [{ kind: 'reached', figure: 'oneTownWorksWorked', count: 3, wondersAtLeast: 2 }],
      reward: [
        { markTown: true },
        {
          lasting: [
            { kind: 'percentYields', yield: 'culture', percent: 25, scope },
            { kind: 'percentYields', yield: 'science', percent: 25, scope },
            { kind: 'percentYields', yield: 'production', percent: 25, scope },
          ],
        },
      ],
    });
  });

  it('prints each card in plain words', () => {
    expect(words(BOUNDS)).toEqual([
      'a great person laying a work claims every unowned hex beside it for your nearest city',
    ]);
    expect(words(CUSTODIANS)).toEqual(['+4 combat strength while standing on a great-person work']);
    expect(words(ENVIOUS)).toEqual([
      'when a rival completes a wonder one of your cities was building, the production that city put into it moves to the next item in its queue',
    ]);
    expect(words(IDEAL)[0]).toBe(
      'Commission. Goal: have one of your cities hold 2 wonders and work 3 great-person works, while this card is seated',
    );
  });
});

// --- The Landmark Bounds -------------------------------------------------------

describe('The Landmark Bounds (reading 29)', () => {
  /** A capital for seat 0 on a bare board. */
  function board(): { state: GameState; capital: City } {
    const state = bareState(20, 10);
    const capital = town(state, 4, 5);
    return { state, capital };
  }

  it('gives every unowned hex beside a great person’s work to the nearest town', () => {
    const { state, capital } = board();
    seat(state, BOUNDS);
    const site = edgeHex(state, capital);
    const open = ringOf(state, site).filter((tile) => ownerOf(state, tile) === null);
    expect(open.length).toBeGreaterThan(0);
    const artist = person(state, site, 'artist');
    greatPersonWorkAt(state, playerById(state, 0)!, artist, site);
    expect(site.improvement).toBe('landmark');
    for (const tile of ringOf(state, site)) expect(ownerOf(state, tile), `${tile.col},${tile.row}`).toBe(capital.id);
  });

  it('claims nothing without the card in a chair', () => {
    const { state, capital } = board();
    const site = edgeHex(state, capital);
    const open = ringOf(state, site).filter((tile) => ownerOf(state, tile) === null);
    greatPersonWorkAt(state, playerById(state, 0)!, person(state, site, 'artist'), site);
    for (const tile of open) expect(ownerOf(state, tile)).toBeNull();
  });

  it('leaves a rival’s hexes and another town’s hexes where they are', () => {
    const { state, capital } = board();
    seat(state, BOUNDS);
    const site = edgeHex(state, capital);
    const open = ringOf(state, site).filter((tile) => ownerOf(state, tile) === null);
    expect(open.length).toBeGreaterThanOrEqual(2);
    // One open hex goes to a rival's town, and one to a second town of seat 0
    // that stands further from the work than the capital does.
    const rival = town(state, 14, 5, 1);
    const sibling = town(state, 9, 2);
    state.tileOwner[tileIndex(state.map, open[0]!.col, open[0]!.row)] = rival.id;
    state.tileOwner[tileIndex(state.map, open[1]!.col, open[1]!.row)] = sibling.id;
    bumpRevision(state);
    greatPersonWorkAt(state, playerById(state, 0)!, person(state, site, 'artist'), site);
    expect(ownerOf(state, open[0]!)).toBe(rival.id);
    expect(ownerOf(state, open[1]!)).toBe(sibling.id);
    for (const tile of open.slice(2)) expect(ownerOf(state, tile)).toBe(capital.id);
  });

  it('asks the hex the work stands on, so a farm claims nothing', () => {
    const { state, capital } = board();
    seat(state, BOUNDS);
    const site = edgeHex(state, capital);
    const open = ringOf(state, site).filter((tile) => ownerOf(state, tile) === null);
    raiseImprovement(site, 'farm' as ImprovementId, state.turn);
    payWorkLaidRiders(state, 0, site, 'farm' as ImprovementId);
    for (const tile of open) expect(ownerOf(state, tile)).toBeNull();
  });

  it('names no hex for a build that leaves another work standing, as a burn on an improved hex does', () => {
    const { state, capital } = board();
    seat(state, BOUNDS);
    const site = edgeHex(state, capital);
    const open = ringOf(state, site).filter((tile) => ownerOf(state, tile) === null);
    // The Landmark stands on the hex, and the moment is about another row:
    // the burn path of `buildImprovementAt` marks the hex and keeps the work.
    raiseImprovement(site, 'landmark' as ImprovementId, state.turn);
    payWorkLaidRiders(state, 0, site, 'burnedCountry' as ImprovementId);
    for (const tile of open) expect(ownerOf(state, tile)).toBeNull();
    // The same hex, paid for the Landmark itself, claims the ring.
    payWorkLaidRiders(state, 0, site, 'landmark' as ImprovementId);
    for (const tile of open) expect(ownerOf(state, tile)).toBe(capital.id);
  });

  it('re-seats the town and redraws the empire’s map', () => {
    const { state, capital } = board();
    const site = edgeHex(state, capital);
    const open = ringOf(state, site).filter((tile) => ownerOf(state, tile) === null);
    state.visibility[0]!.fill(0);
    expect(claimUnownedBeside(state, 0, { col: site.col, row: site.row })).toBe(capital);
    for (const tile of open) {
      expect(ownerOf(state, tile)).toBe(capital.id);
      expect(state.visibility[0]![tileIndex(state.map, tile.col, tile.row)], `${tile.col},${tile.row}`).toBe(2);
    }
    // A second claim finds nothing left to take.
    expect(claimUnownedBeside(state, 0, { col: site.col, row: site.row })).toBeNull();
  });
});

// --- The Custodians ------------------------------------------------------------

describe('The Custodians (reading 30)', () => {
  /** The strength lines on one side of a forecast whose label names the card. */
  function custodians(state: GameState, attacker: Unit, target: Tile, side: 'attacker' | 'defender'): number {
    for (const player of state.players) state.visibility[player.id]!.fill(2);
    const view = previewCombat(state, attacker.id, { col: target.col, row: target.row });
    if (!view.ok) throw new Error(view.error);
    const list = side === 'attacker' ? view.attackerLines : view.defenderLines;
    return list.filter((line) => line.source.includes('The Custodians')).reduce((sum, line) => sum + line.amount, 0);
  }

  /** Two warriors side by side on open ground, at war. */
  function bench(): { state: GameState; mine: Unit; theirs: Unit; mineAt: Tile; theirsAt: Tile } {
    const state = bareState(20, 10);
    const mineAt = at(state, 8, 5);
    const theirsAt = ringOf(state, mineAt)[0]!;
    const mine = createUnit(state, 0, 'warrior', mineAt.col, mineAt.row);
    const theirs = createUnit(state, 1, 'warrior', theirsAt.col, theirsAt.row);
    bumpRevision(state);
    return { state, mine, theirs, mineAt, theirsAt };
  }

  it('gives +4 to a unit that attacks from a great-person work', () => {
    const { state, mine, mineAt, theirsAt } = bench();
    seat(state, CUSTODIANS);
    expect(custodians(state, mine, theirsAt, 'attacker')).toBe(0);
    raiseImprovement(mineAt, 'academy' as ImprovementId, state.turn);
    bumpRevision(state);
    expect(custodians(state, mine, theirsAt, 'attacker')).toBe(4);
  });

  it('gives +4 to a unit that defends on a great-person work nobody owns', () => {
    const { state, mineAt, theirs } = bench();
    seat(state, CUSTODIANS);
    raiseImprovement(mineAt, 'citadel' as ImprovementId, state.turn);
    bumpRevision(state);
    expect(ownerOf(state, mineAt)).toBeNull();
    expect(custodians(state, theirs, mineAt, 'defender')).toBe(4);
  });

  it('pays only the holder, and only the piece on the work', () => {
    const { state, mine, mineAt, theirs, theirsAt } = bench();
    seat(state, CUSTODIANS);
    raiseImprovement(theirsAt, 'landmark' as ImprovementId, state.turn);
    bumpRevision(state);
    // The rival stands on the work and does not hold the card.
    expect(custodians(state, mine, theirsAt, 'defender')).toBe(0);
    // My piece is not on a work.
    expect(custodians(state, theirs, mineAt, 'defender')).toBe(0);
    expect(custodians(state, mine, theirsAt, 'attacker')).toBe(0);
  });
});

// --- Commission: The Ideal City -------------------------------------------------

describe('Commission: The Ideal City (reading 33)', () => {
  const GOAL = orderDef(IDEAL).commission!.goals[0] as CommissionGoal;

  /** Raises world wonders in a town through the one writer of a town's buildings. */
  function wonders(state: GameState, city: City, count: number, from = 0): void {
    for (const id of WONDER_IDS.slice(from, from + count)) addBuilding(state, city, id);
    bumpRevision(state);
  }

  /** Lays great-person works on owned hexes of a town and pins its citizens to them. */
  function works(state: GameState, city: City, count: number): void {
    const ring = ownedTiles(state, city).filter((tile) => !(tile.col === city.col && tile.row === city.row));
    const laid = ring.slice(0, count);
    expect(laid).toHaveLength(count);
    for (const tile of laid) raiseImprovement(tile, 'landmark' as ImprovementId, state.turn);
    city.population = Math.max(city.population, count);
    city.lockedTiles = laid.map((tile) => ({ col: tile.col, row: tile.row }));
    refreshCityDerived(state, city);
    bumpRevision(state);
  }

  it('counts the works one town works, among the towns that hold two wonders', () => {
    const state = bareState(20, 10);
    const first = town(state, 4, 5);
    const second = town(state, 12, 5);
    expect(commissionFigure(state, 0, 'oneTownWorksWorked', GOAL)).toBe(0);
    // Three works in a town with one wonder do not count.
    wonders(state, first, 1);
    works(state, first, 3);
    expect(commissionFigure(state, 0, 'oneTownWorksWorked', GOAL)).toBe(0);
    // Two wonders and two works in the second town count two.
    wonders(state, second, 2, 1);
    works(state, second, 2);
    expect(commissionFigure(state, 0, 'oneTownWorksWorked', GOAL)).toBe(2);
    // A second wonder in the first town makes its three count.
    wonders(state, first, 1, 3);
    expect(commissionFigure(state, 0, 'oneTownWorksWorked', GOAL)).toBe(3);
    // With no floor, every town counts.
    expect(commissionFigure(state, 0, 'oneTownWorksWorked')).toBe(3);
  });

  it('counts a work only while a citizen works its hex', () => {
    const state = bareState(20, 10);
    const capital = town(state, 4, 5);
    wonders(state, capital, 2);
    works(state, capital, 3);
    expect(commissionFigure(state, 0, 'oneTownWorksWorked', GOAL)).toBe(3);
    capital.workedTiles = capital.workedTiles.slice(1);
    expect(commissionFigure(state, 0, 'oneTownWorksWorked', GOAL)).toBe(2);
  });

  it('names the first town in founding order that meets both floors', () => {
    const state = bareState(20, 10);
    const first = town(state, 4, 5);
    const second = town(state, 12, 5);
    wonders(state, second, 2);
    works(state, second, 3);
    expect(worksTownFor(state, 0, 2, 3)).toBe(second);
    expect(commissionGoalTown(state, 0, IDEAL)).toBe(second);
    wonders(state, first, 2, 2);
    works(state, first, 3);
    expect(worksTownFor(state, 0, 2, 3)).toBe(first);
    expect(commissionGoalTown(state, 0, IDEAL)).toBe(first);
  });

  it('marks that town and raises its culture, science and production by a quarter for good', () => {
    const state = bareState(20, 10);
    const capital = town(state, 4, 5);
    const other = town(state, 12, 5);
    seat(state, IDEAL);
    // Not yet met: the card stays in its chair.
    runCommissions(state);
    expect(commissionFulfilledTurn(playerById(state, 0)!.statecraft, IDEAL)).toBeUndefined();
    wonders(state, other, 2);
    works(state, other, 3);
    const reports = runCommissions(state);
    expect(reports.map((report) => report.card)).toEqual([IDEAL]);
    expect(commissionFulfilledTurn(playerById(state, 0)!.statecraft, IDEAL)).toBe(state.turn);
    expect(other.markedBy).toEqual([{ card: IDEAL, owner: 0 }]);
    expect(capital.markedBy).toBeUndefined();
    const lift = (city: City): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const line of explainCardPercentYields(state, city)) {
        if (line.card !== IDEAL) continue;
        out[line.yield] = (out[line.yield] ?? 0) + line.percent;
      }
      return out;
    };
    expect(lift(other)).toEqual({ culture: 25, science: 25, production: 25 });
    expect(lift(capital)).toEqual({});
  });
});

// --- The Envious Eye -----------------------------------------------------------

describe('The Envious Eye (reading 34)', () => {
  /** Seat 0 wins the race; seat 1 loses it, with `queue` behind the wonder. */
  function race(queue: City['queue'], held: boolean): { state: GameState; winner: City; loser: City } {
    const state = bareState(20, 10);
    const winner = town(state, 4, 5);
    const loser = town(state, 14, 5, 1);
    winner.queue = [{ kind: 'building', id: WONDER }];
    winner.hammerBasket = buildingProductionCost(WONDER, state, 0);
    loser.queue = [{ kind: 'building', id: WONDER }, ...queue];
    if (held) seat(state, ENVIOUS, 1);
    bumpRevision(state);
    return { state, winner, loser };
  }

  /** A building the losing town does not hold yet, and what it costs there. */
  const NEXT = 'monument' as const;

  it('pays gold for the hammers without the card, as before', () => {
    const { state, winner, loser } = race([{ kind: 'building', id: NEXT }], false);
    loser.hammerBasket = 20;
    const gold = playerById(state, 1)!.gold;
    const done = settleProduction(state, winner);
    expect(done?.wonder?.refunds).toEqual([
      { building: WONDER, cityId: loser.id, playerId: 1, hammers: 20, gold: 20 * REFUND_RATE },
    ]);
    expect(playerById(state, 1)!.gold).toBe(gold + 20 * REFUND_RATE);
    expect(loser.hammerBasket).toBe(0);
  });

  it('moves the hammers to the next item instead, and pays no gold', () => {
    const { state, winner, loser } = race([{ kind: 'building', id: NEXT }], true);
    expect(loser.buildings).not.toContain(NEXT);
    const cost = buildingProductionCost(NEXT, state, 1);
    const banked = Math.max(1, Math.floor(cost / 2));
    loser.hammerBasket = banked;
    const gold = playerById(state, 1)!.gold;
    const done = settleProduction(state, winner);
    expect(done?.wonder?.refunds).toEqual([
      {
        building: WONDER,
        cityId: loser.id,
        playerId: 1,
        hammers: banked,
        gold: 0,
        movedTo: queueItemName({ kind: 'building', id: NEXT }),
      },
    ]);
    expect(playerById(state, 1)!.gold).toBe(gold);
    expect(loser.queue).toEqual([{ kind: 'building', id: NEXT }]);
    expect(loser.hammerBasket).toBe(banked);
  });

  it('finishes the next item at once when the hammers cover it', () => {
    const { state, winner, loser } = race([{ kind: 'building', id: NEXT }], true);
    const cost = buildingProductionCost(NEXT, state, 1);
    loser.hammerBasket = cost + 5;
    settleProduction(state, winner);
    expect(loser.buildings).toContain(NEXT);
    expect(loser.queue).toEqual([]);
    expect(loser.hammerBasket).toBe(5);
  });

  it('moves the hammers banked under the wonder when it was not the front row', () => {
    const { state, winner, loser } = race([], true);
    loser.queue = [{ kind: 'building', id: NEXT }, { kind: 'building', id: WONDER }];
    const cost = buildingProductionCost(NEXT, state, 1);
    // Three hammers toward the Monument at the front, and a bucket under the
    // wonder that leaves the Monument short by four.
    const parked = cost - 7;
    expect(parked).toBeGreaterThan(0);
    loser.hammerBasket = 3;
    loser.itemProgress = { [queueItemKey({ kind: 'building', id: WONDER })]: parked };
    const done = settleProduction(state, winner);
    expect(done?.wonder?.refunds[0]).toMatchObject({ hammers: parked, gold: 0 });
    expect(loser.itemProgress).toBeUndefined();
    expect(loser.queue).toEqual([{ kind: 'building', id: NEXT }]);
    expect(loser.hammerBasket).toBe(cost - 4);
  });

  it('pays gold to a town with nothing left in its queue', () => {
    const { state, winner, loser } = race([], true);
    loser.hammerBasket = 30;
    const gold = playerById(state, 1)!.gold;
    const done = settleProduction(state, winner);
    expect(done?.wonder?.refunds[0]).toEqual({
      building: WONDER,
      cityId: loser.id,
      playerId: 1,
      hammers: 30,
      gold: 30 * REFUND_RATE,
    });
    expect(playerById(state, 1)!.gold).toBe(gold + 30 * REFUND_RATE);
  });

  it('pays gold for a race lost to another town of the same empire', () => {
    const state = bareState(20, 10);
    const winner = town(state, 4, 5);
    const sibling = town(state, 14, 5);
    seat(state, ENVIOUS);
    winner.queue = [{ kind: 'building', id: WONDER }];
    winner.hammerBasket = buildingProductionCost(WONDER, state, 0);
    sibling.queue = [{ kind: 'building', id: WONDER }, { kind: 'building', id: NEXT }];
    sibling.hammerBasket = 12;
    bumpRevision(state);
    const done = settleProduction(state, winner);
    expect(done?.wonder?.refunds[0]).toMatchObject({ cityId: sibling.id, hammers: 12, gold: 12 * REFUND_RATE });
    expect(done?.wonder?.refunds[0]?.movedTo).toBeUndefined();
  });
});
