/**
 * **Arrangements on the hex grid** (batch MG15 of
 * `docs/plans/magisterial-themes-triage.md`).
 *
 * Batch MG15 builds two cards and the shapes under them:
 *
 *   · a tile test, `workLine`: the hex's great-person work stands on a
 *     straight line of works along one of the three hex axes, with no gap
 *     and every work of the line in the asking empire's borders. The lines
 *     are found once for the board (`workLinesOf`) and handed to the test
 *     through the ground facts (`GroundFacts.workLine`). Card: The
 *     Processional Way, +3 culture and +3 science on each work of a line of
 *     three or more (the triage's reading 39);
 *   · a commission figure, `worksBesideWork`: the most hexes beside one of
 *     the empire's works that carry a great-person work or a tended work.
 *     The goal's hex is the first such work in map order (`gardenWorkFor`,
 *     `commissionGoalHex`), and a reward, `claimWithin`, gives every
 *     unowned hex within that many hexes of it to the nearest town through
 *     the claim routine The Landmark Bounds uses (`claimUnownedBeside`).
 *     Card: Commission: The Paradise Garden (reading 41).
 */

import { describe, expect, it } from 'vitest';

import { claimUnownedBeside, foundCityAt, refreshCityDerived } from '../../../src/sim/cities';
import { commissionFigure, commissionGoalHex, gardenWorkFor, runCommissions } from '../../../src/sim/commissions';
import { HEX_DIRECTIONS } from '../../../src/sim/hex';
import { type ImprovementId } from '../../../src/sim/improvementData';
import {
  type Tile,
  getTile,
  mapRange,
  neighborTiles,
  raiseImprovement,
  tileHex,
  tileIndex,
  wrappedDistance,
} from '../../../src/sim/map';
import { type City, type GameState, bumpRevision, playerById } from '../../../src/sim/state';
import {
  commissionFulfilledTurn,
  describeCard,
  groundFactsFor,
  stripRefs,
  tileConditionHolds,
  workLineAt,
  workLinesOf,
} from '../../../src/sim/statecraft';
import { type OrderId, type TileCondition, orderDef, orderIsDealt, ordersForDecks } from '../../../src/sim/statecraftData';
import { cityContext, explainTileYield } from '../../../src/sim/yields/hex';
import { at, bareState } from '../improvementHelpers';

const GARDEN = 'magisterialTheParadiseGarden' as OrderId;
const PROCESSION = 'theProcessionalWay' as OrderId;

/** The two rows batch MG15 dealt, with the tier, rarity and type the sheet gives each. */
const MG15_ROWS: readonly [OrderId, number, string, string][] = [
  [GARDEN, 3, 'rare', 'wildcard'],
  [PROCESSION, 4, 'rare', 'civic'],
];

const LANDMARK = 'landmark' as ImprovementId;
const ACADEMY = 'academy' as ImprovementId;
const GARDEN_WORK = 'forestGarden' as ImprovementId;
const FARM = 'farm' as ImprovementId;

/** The Processional Way's own test. */
const LINE_OF_THREE: TileCondition = { test: 'workLine', length: 3 };

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

/** Which town owns a hex, or `null`. */
function ownerOf(state: GameState, tile: Tile): number | null {
  return state.tileOwner[tileIndex(state.map, tile.col, tile.row)] ?? null;
}

/** Gives these hexes to a town, as a test sets borders. */
function own(state: GameState, city: City | null, tiles: readonly Tile[]): void {
  for (const tile of tiles) state.tileOwner[tileIndex(state.map, tile.col, tile.row)] = city?.id ?? null;
  bumpRevision(state);
}

/** Lays a work on each of these hexes, through the one writer of a hex's works. */
function lay(state: GameState, tiles: readonly Tile[], work: ImprovementId = LANDMARK): void {
  for (const tile of tiles) raiseImprovement(tile, work, state.turn);
  bumpRevision(state);
}

/** `count` hexes in a straight line from `start`, one step at a time along a direction. */
function lineFrom(state: GameState, start: Tile, direction: number, count: number): Tile[] {
  const d = HEX_DIRECTIONS[direction]!;
  const h = tileHex(start);
  const tiles: Tile[] = [];
  for (let k = 0; k < count; k++) {
    const tile = getTile(state.map, { q: h.q + d.q * k, r: h.r + d.r * k });
    expect(tile, `step ${k} along ${direction}`).toBeDefined();
    tiles.push(tile!);
  }
  return tiles;
}

/** The longest line each hex's work stands on, for seat 0. */
function lengths(state: GameState, tiles: readonly Tile[]): number[] {
  return tiles.map((tile) => workLineAt(state, 0, tile));
}

/** What The Processional Way pays on a hex, read off the hex's own list as the town works it. */
function processionPays(state: GameState, city: City, tile: Tile): { culture: number; science: number } {
  const paid = { culture: 0, science: 0 };
  for (const line of explainTileYield(tile, cityContext(state, city))) {
    if (line.card !== PROCESSION) continue;
    paid.culture += line.culture;
    paid.science += line.science;
  }
  return paid;
}

/** The printed clauses of a card, with the keyword marks taken out. */
function words(id: OrderId): string[] {
  return describeCard(id).map((clause) => stripRefs(clause.text));
}

// --- the rows ------------------------------------------------------------------

describe('Magisterial batch MG15: the rows', () => {
  it('deals both from the tier, rarity and type the sheet names', () => {
    for (const [id, band, rarity, type] of MG15_ROWS) {
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
    expect(orderDef(GARDEN).text).toBe(
      'Commission. Have a great-person work with three other works or tended hexes beside it. Then every unowned hex within three hexes of it joins your borders. The card leaves its chair.',
    );
    expect(orderDef(GARDEN).effects).toEqual([]);
    expect(orderDef(GARDEN).commission).toEqual({
      goals: [{ kind: 'reached', figure: 'worksBesideWork', count: 3 }],
      reward: [{ claimWithin: 3 }],
    });
    expect(orderDef(PROCESSION).text).toBe(
      'Great-person works in a straight line of three or more give +3 culture and +3 science each.',
    );
    expect(orderDef(PROCESSION).effects).toEqual([
      { kind: 'pays', where: 'hex', culture: 3, science: 3, on: { test: 'workLine', length: 3 } },
    ]);
  });

  it('prints each card in plain words', () => {
    expect(words(GARDEN)).toEqual([
      'Commission. Goal: have a great-person work in your borders with 3 other great-person works or tended hexes beside it, while this card is seated',
      'Reward: every unowned hex within 3 hexes of that work joins your nearest city',
      'then this card leaves its chair and is never seated again',
    ]);
    expect(words(PROCESSION)).toEqual([
      "+3 science, +3 culture on every hex carrying a great person's work in a straight line of 3 or more such works in your borders",
    ]);
  });
});

// --- The Processional Way ------------------------------------------------------

describe('The Processional Way: works on a line (reading 39)', () => {
  /** A capital for seat 0 on a bare board. */
  function board(): { state: GameState; capital: City } {
    const state = bareState(20, 10);
    const capital = town(state, 3, 5);
    return { state, capital };
  }

  it('finds a line of three along each of the three axes, in either direction', () => {
    for (const direction of [0, 1, 2, 3, 4, 5]) {
      const { state, capital } = board();
      const line = lineFrom(state, at(state, 9, 4), direction, 3);
      own(state, capital, line);
      lay(state, line);
      expect(lengths(state, line), `direction ${direction}`).toEqual([3, 3, 3]);
    }
  });

  it('ends a line at a gap, and at a hex outside the borders', () => {
    const { state, capital } = board();
    const line = lineFrom(state, at(state, 8, 4), 0, 4);
    own(state, capital, line);
    lay(state, [line[0]!, line[1]!, line[3]!]);
    expect(lengths(state, line)).toEqual([2, 2, 0, 1]);
    // The gap gets a work, but the hex is nobody's: the line stays broken.
    own(state, null, [line[2]!]);
    lay(state, [line[2]!]);
    expect(lengths(state, line)).toEqual([2, 2, 0, 1]);
    // In the borders, the four make one line.
    own(state, capital, [line[2]!]);
    expect(lengths(state, line)).toEqual([4, 4, 4, 4]);
  });

  it("does not count a rival's work in the line", () => {
    const { state, capital } = board();
    const rival = town(state, 16, 5, 1);
    const line = lineFrom(state, at(state, 9, 4), 0, 3);
    own(state, capital, line.slice(0, 2));
    own(state, rival, line.slice(2));
    lay(state, line);
    expect(lengths(state, line)).toEqual([2, 2, 0]);
    expect(workLineAt(state, 1, line[2]!)).toBe(1);
  });

  it('counts a work on two lines by its longest line', () => {
    const { state, capital } = board();
    const middle = at(state, 9, 4);
    const across = lineFrom(state, at(state, 8, 4), 0, 3);
    const down = [...lineFrom(state, middle, 4, 2).reverse(), ...lineFrom(state, middle, 1, 3).slice(1)];
    expect(down).toHaveLength(4);
    expect(down[1]).toBe(middle);
    own(state, capital, [...across, ...down]);
    lay(state, [...across, ...down]);
    expect(lengths(state, across)).toEqual([3, 4, 3]);
    expect(lengths(state, down)).toEqual([4, 4, 4, 4]);
  });

  it("follows the map's east-west wrap", () => {
    const { state, capital } = board();
    const width = state.map.width;
    const line = [at(state, width - 1, 2), at(state, 0, 2), at(state, 1, 2)];
    own(state, capital, line);
    lay(state, line);
    expect(lengths(state, line)).toEqual([3, 3, 3]);
  });

  it('finds the lines once for the board, and again after a work goes up', () => {
    const { state, capital } = board();
    const line = lineFrom(state, at(state, 9, 4), 0, 3);
    own(state, capital, line);
    lay(state, line.slice(0, 2));
    const first = workLinesOf(state, 0);
    // Asked again with nothing moved, the board's answer is the same object.
    expect(workLinesOf(state, 0)).toBe(first);
    expect(first.hexes).toEqual(line.slice(0, 2).map((tile) => tileIndex(state.map, tile.col, tile.row)));
    expect(first.lengths).toEqual([2, 2]);
    // A work laid moves the clock, so the next ask walks the map again.
    lay(state, [line[2]!]);
    expect(workLinesOf(state, 0)).not.toBe(first);
    expect(lengths(state, line)).toEqual([3, 3, 3]);
  });

  it('answers the tile test from the board, and no without it', () => {
    const { state, capital } = board();
    const line = lineFrom(state, at(state, 9, 4), 0, 3);
    own(state, capital, line);
    lay(state, line);
    const ground = groundFactsFor(state, 0);
    for (const tile of line) {
      expect(tileConditionHolds(tile, LINE_OF_THREE, undefined, undefined, state.turn, ground)).toBe(true);
      expect(tileConditionHolds(tile, LINE_OF_THREE)).toBe(false);
      expect(tileConditionHolds(tile, { test: 'workLine', length: 4 }, undefined, undefined, state.turn, ground)).toBe(
        false,
      );
    }
    // Another empire's facts do not see this line.
    expect(tileConditionHolds(line[0]!, LINE_OF_THREE, undefined, undefined, state.turn, groundFactsFor(state, 1))).toBe(
      false,
    );
  });

  it('pays +3 culture and +3 science on each work of a line of three, once, and only seated', () => {
    const { state, capital } = board();
    const line = lineFrom(state, at(state, 4, 4), 0, 3);
    const lone = at(state, 4, 7);
    own(state, capital, [...line, lone]);
    lay(state, [...line, lone]);
    for (const tile of line) expect(processionPays(state, capital, tile)).toEqual({ culture: 0, science: 0 });
    seat(state, PROCESSION);
    for (const tile of line) expect(processionPays(state, capital, tile)).toEqual({ culture: 3, science: 3 });
    expect(processionPays(state, capital, lone)).toEqual({ culture: 0, science: 0 });
    // A second line through the middle work does not pay it twice.
    const middle = line[1]!;
    const cross = [...lineFrom(state, middle, 4, 2).slice(1), ...lineFrom(state, middle, 1, 2).slice(1)];
    own(state, capital, cross);
    lay(state, cross);
    expect(lengths(state, [middle])).toEqual([3]);
    expect(processionPays(state, capital, middle)).toEqual({ culture: 3, science: 3 });
  });

  it('is doubled by The Divine Proportion, as reading 26 names it', () => {
    const { state, capital } = board();
    const line = lineFrom(state, at(state, 4, 4), 0, 3);
    own(state, capital, line);
    lay(state, line);
    seat(state, PROCESSION);
    seat(state, 'theDivineProportion' as OrderId);
    const total = { culture: 0, science: 0 };
    for (const entry of explainTileYield(line[0]!, cityContext(state, capital))) {
      if (entry.card !== PROCESSION && entry.card !== ('theDivineProportion' as OrderId)) continue;
      total.culture += entry.culture;
      total.science += entry.science;
    }
    expect(total).toEqual({ culture: 6, science: 6 });
  });

  it('counts a Holy Site, and not a farm', () => {
    const { state, capital } = board();
    const line = lineFrom(state, at(state, 9, 4), 0, 3);
    own(state, capital, line);
    lay(state, line.slice(0, 2));
    lay(state, [line[2]!], 'holySite' as ImprovementId);
    expect(lengths(state, line)).toEqual([3, 3, 3]);
    lay(state, [line[2]!], FARM);
    expect(lengths(state, line)).toEqual([2, 2, 0]);
  });
});

// --- Commission: The Paradise Garden ---------------------------------------------

describe('Commission: The Paradise Garden (reading 41)', () => {
  const GOAL = orderDef(GARDEN).commission!.goals[0]!;

  /**
   * A capital for seat 0 at (4, 7), and a Landmark two hexes east of it in
   * its borders. The work's ring is returned in the map's neighbour order,
   * without the hex it shares with the capital's ring.
   */
  function board(): { state: GameState; capital: City; work: Tile; ring: Tile[] } {
    const state = bareState(24, 14);
    const capital = town(state, 4, 7);
    const work = at(state, 6, 7);
    own(state, capital, [work]);
    lay(state, [work]);
    const ring = neighborTiles(state.map, tileHex(work)).filter((tile) => !(tile.col === 5 && tile.row === 7));
    return { state, capital, work, ring };
  }

  it('counts the works and tended hexes beside one work, whoever owns them', () => {
    const { state, ring } = board();
    const rival = town(state, 18, 7, 1);
    expect(commissionFigure(state, 0, 'worksBesideWork', GOAL)).toBe(0);
    lay(state, [ring[0]!], ACADEMY);
    lay(state, [ring[1]!], GARDEN_WORK);
    expect(commissionFigure(state, 0, 'worksBesideWork', GOAL)).toBe(2);
    // A farm is neither.
    lay(state, [ring[2]!], FARM);
    expect(commissionFigure(state, 0, 'worksBesideWork', GOAL)).toBe(2);
    // A work beside it on a rival's hex counts.
    own(state, rival, [ring[3]!]);
    lay(state, [ring[3]!], LANDMARK);
    expect(commissionFigure(state, 0, 'worksBesideWork', GOAL)).toBe(3);
  });

  it('does not count a work outside the borders as the centre', () => {
    const state = bareState(24, 14);
    town(state, 4, 7);
    const work = at(state, 14, 7);
    lay(state, [work]);
    lay(state, neighborTiles(state.map, tileHex(work)), LANDMARK);
    expect(ownerOf(state, work)).toBeNull();
    expect(commissionFigure(state, 0, 'worksBesideWork', GOAL)).toBe(0);
    expect(gardenWorkFor(state, 0, 3)).toBeNull();
  });

  it('names the first work in map order that meets the goal', () => {
    const { state, capital, work, ring } = board();
    // A second qualifying work further south, owned by the same town.
    const south = at(state, 6, 10);
    own(state, capital, [south]);
    lay(state, [south]);
    lay(state, neighborTiles(state.map, tileHex(south)).slice(0, 3), GARDEN_WORK);
    expect(gardenWorkFor(state, 0, 3)).toBe(south);
    expect(commissionGoalHex(state, 0, GARDEN)).toBe(south);
    // Once the northern work meets it too, it comes first.
    lay(state, ring.slice(0, 3), GARDEN_WORK);
    expect(tileIndex(state.map, work.col, work.row)).toBeLessThan(tileIndex(state.map, south.col, south.row));
    expect(gardenWorkFor(state, 0, 3)).toBe(work);
    expect(commissionGoalHex(state, 0, GARDEN)).toBe(work);
    // Another card's goal names no hex.
    expect(commissionGoalHex(state, 0, PROCESSION)).toBeNull();
  });

  it('claims every unowned hex within three of the work for the nearest town, once', () => {
    const { state, capital, work, ring } = board();
    const rival = town(state, 10, 7, 1);
    seat(state, GARDEN);
    // Not met yet: the card stays in its chair and nothing is claimed.
    lay(state, ring.slice(0, 2), GARDEN_WORK);
    expect(runCommissions(state)).toEqual([]);
    expect(commissionFulfilledTurn(playerById(state, 0)!.statecraft, GARDEN)).toBeUndefined();
    const reach = mapRange(state.map, tileHex(work), 3);
    const before = new Map(reach.map((tile) => [tileIndex(state.map, tile.col, tile.row), ownerOf(state, tile)]));
    expect([...before.values()].filter((owner) => owner === null).length).toBeGreaterThan(10);
    expect([...before.values()]).toContain(rival.id);
    lay(state, [ring[2]!], LANDMARK);
    state.visibility[0]!.fill(0);
    const reports = runCommissions(state);
    expect(reports.map((report) => report.card)).toEqual([GARDEN]);
    expect(reports[0]!.lines).toEqual([
      `the unowned land within 3 hexes of your great-person work joins ${capital.name}`,
    ]);
    expect(commissionFulfilledTurn(playerById(state, 0)!.statecraft, GARDEN)).toBe(state.turn);
    for (const tile of reach) {
      const was = before.get(tileIndex(state.map, tile.col, tile.row));
      const where = `${tile.col},${tile.row}`;
      // An unowned hex is the capital's now; an owned one keeps its town.
      expect(ownerOf(state, tile), where).toBe(was === null ? capital.id : was);
    }
    // Nothing beyond three hexes moved.
    for (const tile of state.map.tiles) {
      if (wrappedDistance(state.map, tileHex(tile), tileHex(work)) <= 3) continue;
      if (ownerOf(state, tile) === capital.id) {
        expect(wrappedDistance(state.map, tileHex(tile), tileHex(at(state, capital.col, capital.row)))).toBeLessThanOrEqual(1);
      }
    }
    // The empire's map is redrawn: a claimed hex near the town is in sight.
    const near = reach.find(
      (tile) =>
        before.get(tileIndex(state.map, tile.col, tile.row)) === null &&
        wrappedDistance(state.map, tileHex(tile), tileHex(at(state, capital.col, capital.row))) <= 3,
    )!;
    expect(state.visibility[0]![tileIndex(state.map, near.col, near.row)]).toBe(2);
    // Met once: the next turn's phase pays nothing.
    expect(runCommissions(state)).toEqual([]);
  });

  it('gives the land to the town nearest the work', () => {
    const { state, capital } = board();
    // A second town of seat 0, and a work two hexes from it and six from the
    // capital. Only this work has works or tended hexes beside it.
    const second = town(state, 12, 7);
    const far = at(state, 10, 7);
    own(state, second, [far]);
    lay(state, [far]);
    const open = neighborTiles(state.map, tileHex(far)).filter((tile) => ownerOf(state, tile) === null);
    lay(state, open.slice(0, 3), GARDEN_WORK);
    expect(gardenWorkFor(state, 0, 3)).toBe(far);
    seat(state, GARDEN);
    runCommissions(state);
    const reach = mapRange(state.map, tileHex(far), 3);
    expect(reach.filter((tile) => ownerOf(state, tile) === second.id).length).toBeGreaterThan(10);
    expect(reach.filter((tile) => ownerOf(state, tile) === null)).toEqual([]);
    // The capital gained nothing around this work.
    for (const tile of reach) {
      if (ownerOf(state, tile) !== capital.id) continue;
      expect(wrappedDistance(state.map, tileHex(tile), tileHex(at(state, capital.col, capital.row)))).toBeLessThanOrEqual(1);
    }
  });

  it('claims through the one claim routine, which keeps its ring of six by default', () => {
    const { state, capital, work } = board();
    const ring = neighborTiles(state.map, tileHex(work));
    const open = ring.filter((tile) => ownerOf(state, tile) === null);
    expect(claimUnownedBeside(state, 0, { col: work.col, row: work.row })).toBe(capital);
    for (const tile of open) expect(ownerOf(state, tile)).toBe(capital.id);
    // Nothing two hexes away moved.
    for (const tile of mapRange(state.map, tileHex(work), 2)) {
      if (wrappedDistance(state.map, tileHex(tile), tileHex(work)) < 2) continue;
      if (wrappedDistance(state.map, tileHex(tile), tileHex(at(state, capital.col, capital.row))) <= 1) continue;
      expect(ownerOf(state, tile), `${tile.col},${tile.row}`).toBeNull();
    }
    // With a radius of two, the next ring joins too.
    expect(claimUnownedBeside(state, 0, { col: work.col, row: work.row }, 2)).toBe(capital);
    for (const tile of mapRange(state.map, tileHex(work), 2)) expect(ownerOf(state, tile)).not.toBeNull();
  });
});
