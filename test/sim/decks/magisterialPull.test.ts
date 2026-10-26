/**
 * **The Pull of the Masters** (batch MG16 of
 * `docs/plans/magisterial-themes-triage.md`, the triage's reading 40).
 *
 * Batch MG16 builds one card and the shape under it:
 *
 *   · an action rule, `worksPullRivalHexes`, read in one place,
 *     `pullRivalHexesToWorks` (`cities.ts`). `expandBorders` calls the sweep
 *     last, so it runs once a turn in the borders phase and adds no phase;
 *   · each holder, in `realPlayers` order, walks its great-person works in
 *     tile order, and each work takes the first hex beside it, in ring
 *     order, that a rival's town owns and does not work, that is not a town
 *     centre and carries no great-person work, and that lies within
 *     `cities.claimRadius` of the holder's nearest town, which takes it;
 *   · a hex moves at most once a sweep, so when two holders' works reach for
 *     the same hex, the first in that order takes it;
 *   · a new writer, `seizeTile`, moves the hex and drops the losing town's
 *     pin there. Both towns are re-seated after each take and both empires'
 *     sight is redrawn.
 */

import { describe, expect, it } from 'vitest';

import {
  expandBorders,
  foundCityAt,
  pullRivalHexesToWorks,
  refreshCityDerived,
  seizeTile,
} from '../../../src/sim/cities';
import { type ImprovementId } from '../../../src/sim/improvementData';
import {
  type Tile,
  createMap,
  getTileAt,
  neighborTiles,
  raiseImprovement,
  tileHex,
  tileIndex,
  wrappedDistance,
} from '../../../src/sim/map';
import { RULES } from '../../../src/sim/rulesData';
import { type City, type GameState, bumpRevision, playerById } from '../../../src/sim/state';
import { cardActionRule, describeCard, stripRefs } from '../../../src/sim/statecraft';
import { type OrderId, orderDef, orderIsDealt, ordersForDecks } from '../../../src/sim/statecraftData';
import { END_OF_TURN_PHASES, emptyTurnReport } from '../../../src/sim/turn';
import { resetVisibility } from '../../../src/sim/visibility';
import { atWar, openWar } from '../../../src/sim/wars';
import { computeFreshwater } from '../../../src/sim/water';
import { newGame } from '../newGameHelpers';

const PULL = 'thePullOfTheMasters' as OrderId;

const LANDMARK = 'landmark' as ImprovementId;
const ACADEMY = 'academy' as ImprovementId;
const HOLY_SITE = 'holySite' as ImprovementId;
const FARM = 'farm' as ImprovementId;

/** What `visibility` holds for a hex in sight. */
const VISIBLE = 2;

/** How far a town's borders reach (`cities.claimRadius`). */
const REACH = RULES.cities.claimRadius;

const SEATS = [
  { name: 'A', color: '#a00', isHuman: true },
  { name: 'B', color: '#00a', isHuman: true },
  { name: 'C', color: '#0a0', isHuman: true },
];

/**
 * A blank grassland board, 24 by 14, with `seats` empires at peace and no
 * towns, pieces or borders.
 */
function board(seats = 2): GameState {
  const state = newGame({ seed: 1, sizeName: 'duel', players: SEATS.slice(0, seats), barbarians: false });
  state.map = createMap({ width: 24, height: 14, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  state.units = [];
  state.cities = [];
  state.nextEntityId = 1;
  state.wars = [];
  computeFreshwater(state.map);
  bumpRevision(state);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** Puts a card in a chair for a seat, the way the reading sees it. */
function seat(state: GameState, card: OrderId, playerId = 0): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/**
 * A town of one citizen for a seat, its citizen pinned to `pin`, so the test
 * knows which hex the town works.
 */
function town(state: GameState, col: number, row: number, playerId: number, pin: Tile): City {
  const city = foundCityAt(state, playerId, at(state, col, row));
  city.population = 1;
  city.largestSize = 1;
  city.queue = [];
  city.lockedTiles = [{ col: pin.col, row: pin.row }];
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

function worksOn(city: City, tile: Tile): boolean {
  return city.workedTiles.some((cell) => cell.col === tile.col && cell.row === tile.row);
}

function distance(state: GameState, a: Tile, b: Tile): number {
  return wrappedDistance(state.map, tileHex(a), tileHex(b));
}

/** The printed clauses of a card, with the keyword marks taken out. */
function words(id: OrderId): string[] {
  return describeCard(id).map((clause) => stripRefs(clause.text));
}

/**
 * The plain scene: seat 0's capital at (4, 7) works (3, 7); its Landmark
 * stands at (6, 7), two hexes east; seat 1's town at (10, 7) works (11, 7).
 * Every hex beside the Landmark that nobody owned is given to the rival
 * town, and `rivalRing` lists them in the map's ring order.
 */
function scene(): { state: GameState; capital: City; rival: City; work: Tile; rivalRing: Tile[] } {
  const state = board();
  const capital = town(state, 4, 7, 0, at(state, 3, 7));
  const rival = town(state, 10, 7, 1, at(state, 11, 7));
  const work = at(state, 6, 7);
  own(state, capital, [work]);
  lay(state, [work]);
  const rivalRing = neighborTiles(state.map, tileHex(work)).filter((tile) => ownerOf(state, tile) === null);
  own(state, rival, rivalRing);
  return { state, capital, rival, work, rivalRing };
}

// --- the row ---------------------------------------------------------------------

describe('Magisterial batch MG16: the row', () => {
  it('deals the card at the tier, rarity and type the sheet names', () => {
    const def = orderDef(PULL);
    expect(orderIsDealt(PULL)).toBe(true);
    expect(def.decks).toEqual(['magisterial']);
    expect(ordersForDecks(['magisterial'])).toContain(PULL);
    expect(def.band).toBe(4);
    expect(def.rarity).toBe('rare');
    expect(def.type).toBe('economic');
    expect(def.deferred).toBeUndefined();
  });

  it('carries the reworded text and the one rule', () => {
    // MG1 noted that the old text said "At the start of each turn", while the
    // sweep runs at the end of the turn, in the borders phase.
    expect(orderDef(PULL).text).toBe(
      "Each turn, each of your great-person works takes one hex beside it from a rival town, if no one works that hex. A town centre and a rival's own works are never taken.",
    );
    expect(orderDef(PULL).effects).toEqual([{ kind: 'rule', rule: 'worksPullRivalHexes' }]);
  });

  it('prints the card in plain words', () => {
    expect(words(PULL)).toEqual([
      "each turn, each of your great-person works takes one hex beside it from a rival city, if no one works that hex; a city centre and a rival's great-person work are never taken",
    ]);
  });

  it('holds the rule only while the card is seated', () => {
    const { state } = scene();
    expect(cardActionRule(state, 0, 'worksPullRivalHexes')).toBe(false);
    seat(state, PULL);
    expect(cardActionRule(state, 0, 'worksPullRivalHexes')).toBe(true);
    expect(cardActionRule(state, 1, 'worksPullRivalHexes')).toBe(false);
  });
});

// --- the writer --------------------------------------------------------------------

describe('seizeTile: the writer for a rival hex', () => {
  it("moves only a rival town's hex, and drops that town's pin there", () => {
    const { state, capital, rival, rivalRing } = scene();
    const second = foundCityAt(state, 0, at(state, 4, 11));
    const target = rivalRing[0]!;
    rival.lockedTiles.push({ col: target.col, row: target.row });
    // An unowned hex and a hex of another town of the same empire are refused,
    // and nothing is written.
    const open = at(state, 16, 2);
    expect(seizeTile(state, capital, open)).toBeNull();
    expect(ownerOf(state, open)).toBeNull();
    const own2 = at(state, 4, 11);
    expect(seizeTile(state, capital, own2)).toBeNull();
    expect(ownerOf(state, own2)).toBe(second.id);
    // A rival's hex moves, and the rival town loses its pin there.
    expect(seizeTile(state, capital, target)).toBe(rival);
    expect(ownerOf(state, target)).toBe(capital.id);
    expect(rival.lockedTiles).toEqual([{ col: 11, row: 7 }]);
    // The hex is the capital's now, so a second ask is refused.
    expect(seizeTile(state, capital, target)).toBeNull();
  });
});

// --- the sweep ---------------------------------------------------------------------

describe('The Pull of the Masters: the sweep (reading 40)', () => {
  it('moves nothing without the card', () => {
    const { state } = scene();
    const before = [...state.tileOwner];
    pullRivalHexesToWorks(state);
    expect(state.tileOwner).toEqual(before);
  });

  it('takes the first rival hex in ring order, one hex a work each sweep', () => {
    const { state, capital, rival, rivalRing } = scene();
    expect(rivalRing.length).toBeGreaterThanOrEqual(3);
    seat(state, PULL);
    for (let sweep = 0; sweep < rivalRing.length; sweep++) {
      pullRivalHexesToWorks(state);
      rivalRing.forEach((tile, k) => {
        expect(ownerOf(state, tile), `sweep ${sweep}, hex ${k}`).toBe(k <= sweep ? capital.id : rival.id);
      });
    }
    // Nothing is left to take.
    const before = [...state.tileOwner];
    pullRivalHexesToWorks(state);
    expect(state.tileOwner).toEqual(before);
  });

  it('runs at the end of the borders phase, and at peace', () => {
    const { state, capital, rivalRing } = scene();
    seat(state, PULL);
    expect(atWar(state, 0, 1)).toBe(false);
    const phase = END_OF_TURN_PHASES.find((entry) => entry.name === 'expandBorders')!;
    phase.run(state, emptyTurnReport());
    expect(ownerOf(state, rivalRing[0]!)).toBe(capital.id);
    expect(ownerOf(state, rivalRing[1]!)).not.toBe(capital.id);
    // At war it pulls the same way.
    openWar(state, 0, 1);
    expandBorders(state);
    expect(ownerOf(state, rivalRing[1]!)).toBe(capital.id);
  });

  it('leaves a hex the rival town works, and takes the next one', () => {
    const { state, capital, rival, rivalRing } = scene();
    rival.lockedTiles = [{ col: rivalRing[0]!.col, row: rivalRing[0]!.row }];
    refreshCityDerived(state, rival);
    expect(worksOn(rival, rivalRing[0]!)).toBe(true);
    seat(state, PULL);
    pullRivalHexesToWorks(state);
    expect(ownerOf(state, rivalRing[0]!)).toBe(rival.id);
    expect(ownerOf(state, rivalRing[1]!)).toBe(capital.id);
  });

  it('takes a pinned hex the town does not work, and the pin goes', () => {
    const { state, capital, rival, rivalRing } = scene();
    // One citizen and two pins: the first pin is worked, the second is not.
    rival.lockedTiles.push({ col: rivalRing[0]!.col, row: rivalRing[0]!.row });
    refreshCityDerived(state, rival);
    expect(worksOn(rival, rivalRing[0]!)).toBe(false);
    seat(state, PULL);
    pullRivalHexesToWorks(state);
    expect(ownerOf(state, rivalRing[0]!)).toBe(capital.id);
    expect(rival.lockedTiles).toEqual([{ col: 11, row: 7 }]);
  });

  it("never takes a town centre or a rival's great-person work, and a farm comes with its hex", () => {
    const state = board();
    const capital = town(state, 4, 7, 0, at(state, 3, 7));
    const work = at(state, 6, 7);
    own(state, capital, [work]);
    lay(state, [work]);
    // A rival town stands beside the work, its one citizen pinned away from it.
    const rival = town(state, 7, 7, 1, at(state, 8, 7));
    const ring = neighborTiles(state.map, tileHex(work));
    const centre = at(state, 7, 7);
    const rivalRing = ring.filter((tile) => ownerOf(state, tile) === rival.id);
    expect(rivalRing).toContain(centre);
    const others = rivalRing.filter((tile) => tile !== centre);
    expect(others.length).toBeGreaterThanOrEqual(2);
    lay(state, [others[0]!], ACADEMY);
    lay(state, [others[1]!], FARM);
    seat(state, PULL);
    for (let sweep = 0; sweep < 6; sweep++) pullRivalHexesToWorks(state);
    expect(ownerOf(state, centre)).toBe(rival.id);
    expect(ownerOf(state, others[0]!)).toBe(rival.id);
    expect(others[0]!.improvement).toBe(ACADEMY);
    expect(ownerOf(state, others[1]!)).toBe(capital.id);
    expect(others[1]!.improvement).toBe(FARM);
  });

  it("never takes an unowned hex or a hex of the holder's own towns", () => {
    const state = board();
    const capital = town(state, 4, 7, 0, at(state, 3, 7));
    const second = town(state, 8, 7, 0, at(state, 9, 7));
    const work = at(state, 6, 7);
    own(state, capital, [work]);
    lay(state, [work]);
    const ring = neighborTiles(state.map, tileHex(work));
    // Some hexes beside the work are the second town's and some are nobody's.
    expect(ring.some((tile) => ownerOf(state, tile) === second.id)).toBe(true);
    expect(ring.some((tile) => ownerOf(state, tile) === null)).toBe(true);
    seat(state, PULL);
    const before = [...state.tileOwner];
    pullRivalHexesToWorks(state);
    expect(state.tileOwner).toEqual(before);
  });

  it('pulls from a Holy Site, and not from a farm', () => {
    const { state, capital, rival, work, rivalRing } = scene();
    seat(state, PULL);
    lay(state, [work], FARM);
    pullRivalHexesToWorks(state);
    expect(ownerOf(state, rivalRing[0]!)).toBe(rival.id);
    lay(state, [work], HOLY_SITE);
    pullRivalHexesToWorks(state);
    expect(ownerOf(state, rivalRing[0]!)).toBe(capital.id);
  });

  it("does not pull from a work on nobody's ground", () => {
    const { state, capital, work, rivalRing } = scene();
    seat(state, PULL);
    // The capital's Landmark goes, and a Landmark stands on an unowned hex
    // beside the rival's hexes, near the capital.
    lay(state, [work], FARM);
    const stray = state.map.tiles.find(
      (tile) =>
        ownerOf(state, tile) === null &&
        distance(state, tile, at(state, capital.col, capital.row)) <= 2 &&
        neighborTiles(state.map, tileHex(tile)).some((next) => rivalRing.includes(next)),
    )!;
    expect(stray).toBeDefined();
    lay(state, [stray]);
    const before = [...state.tileOwner];
    pullRivalHexesToWorks(state);
    expect(state.tileOwner).toEqual(before);
  });

  it("pulls only for works in the holder's own borders", () => {
    // Seat 1 holds the card, seat 0 does not. The Landmark stands in seat
    // 0's borders, so it is not seat 1's work, and nothing moves.
    const state = board();
    const capital = town(state, 4, 7, 0, at(state, 3, 7));
    const rival = town(state, 8, 7, 1, at(state, 9, 7));
    const work = at(state, 6, 7);
    own(state, capital, [work]);
    lay(state, [work]);
    const ring = neighborTiles(state.map, tileHex(work));
    expect(ring.some((tile) => ownerOf(state, tile) === capital.id)).toBe(true);
    expect(ring.some((tile) => ownerOf(state, tile) === rival.id)).toBe(true);
    seat(state, PULL, 1);
    const before = [...state.tileOwner];
    pullRivalHexesToWorks(state);
    expect(state.tileOwner).toEqual(before);
    // Once the Landmark's hex is in seat 1's borders, the work is seat 1's,
    // whoever laid it, and it takes the first of the capital's hexes beside
    // it in ring order.
    own(state, rival, [work]);
    const first = ring.find((tile) => ownerOf(state, tile) === capital.id)!;
    pullRivalHexesToWorks(state);
    expect(ownerOf(state, first)).toBe(rival.id);
    const moved = state.tileOwner.filter((owner, index) => owner !== before[index]);
    expect(moved).toEqual([rival.id, rival.id]);
  });

  it('gives the hex to the nearest town of the holder', () => {
    const state = board();
    const capital = town(state, 3, 7, 0, at(state, 2, 7));
    const second = town(state, 7, 4, 0, at(state, 7, 3));
    const rival = town(state, 10, 9, 1, at(state, 11, 9));
    const work = at(state, 6, 7);
    own(state, capital, [work]);
    lay(state, [work]);
    const ring = neighborTiles(state.map, tileHex(work));
    const target = ring.find((tile) => ownerOf(state, tile) === null && distance(state, tile, at(state, 7, 4)) < distance(state, tile, at(state, 3, 7)))!;
    expect(target).toBeDefined();
    for (const tile of ring) {
      if (tile !== target && ownerOf(state, tile) === null) own(state, capital, [tile]);
    }
    own(state, rival, [target]);
    seat(state, PULL);
    pullRivalHexesToWorks(state);
    expect(ownerOf(state, target)).toBe(second.id);
  });

  it("never takes a hex beyond the reach of the town it would join", () => {
    // The work stands three hexes from the capital, so the hexes on its far
    // side are four from it. Those stay with the rival; the near ones move.
    const state = board();
    const capital = town(state, 4, 7, 0, at(state, 3, 7));
    const rival = town(state, 11, 7, 1, at(state, 12, 7));
    const work = at(state, 7, 7);
    own(state, capital, [at(state, 6, 7), work]);
    lay(state, [work]);
    const ring = neighborTiles(state.map, tileHex(work)).filter((tile) => ownerOf(state, tile) === null);
    own(state, rival, ring);
    const centre = at(state, 4, 7);
    const far = ring.filter((tile) => distance(state, tile, centre) > REACH);
    const near = ring.filter((tile) => distance(state, tile, centre) <= REACH);
    expect(far.length).toBeGreaterThan(0);
    expect(near.length).toBeGreaterThan(0);
    seat(state, PULL);
    for (let sweep = 0; sweep < 8; sweep++) pullRivalHexesToWorks(state);
    for (const tile of near) expect(ownerOf(state, tile), `${tile.col},${tile.row}`).toBe(capital.id);
    for (const tile of far) expect(ownerOf(state, tile), `${tile.col},${tile.row}`).toBe(rival.id);
    // So every hex the capital holds lies within its borders' reach, which
    // its owner's sight covers.
    for (const tile of state.map.tiles) {
      if (ownerOf(state, tile) !== capital.id) continue;
      expect(distance(state, tile, centre)).toBeLessThanOrEqual(REACH);
      expect(state.visibility[0]![tileIndex(state.map, tile.col, tile.row)]).toBe(VISIBLE);
    }
  });

  it('re-seats both towns and redraws both empires sight after a take', () => {
    const { state, capital, rival, rivalRing } = scene();
    // A farm on the first hex makes it the best hex the capital could work.
    lay(state, [rivalRing[0]!], FARM);
    capital.lockedTiles = [];
    refreshCityDerived(state, capital);
    expect(worksOn(capital, rivalRing[0]!)).toBe(false);
    // The rival's assignment is stale on purpose: the re-seat replaces it.
    rival.workedTiles = [];
    state.visibility[0]!.fill(0);
    state.visibility[1]!.fill(0);
    seat(state, PULL);
    pullRivalHexesToWorks(state);
    expect(ownerOf(state, rivalRing[0]!)).toBe(capital.id);
    expect(worksOn(capital, rivalRing[0]!)).toBe(true);
    expect(rival.workedTiles).toEqual([{ col: 11, row: 7 }]);
    const index = (tile: Tile): number => tileIndex(state.map, tile.col, tile.row);
    expect(state.visibility[0]![index(rivalRing[0]!)]).toBe(VISIBLE);
    expect(state.visibility[1]![index(at(state, 10, 7))]).toBe(VISIBLE);
  });
});

// --- the order --------------------------------------------------------------------

describe('The Pull of the Masters: the order of the sweep', () => {
  /**
   * Two holders' works face each other across one hex. Seat 0's Landmark
   * stands at (6, 7), seat 1's at (8, 7), and the hex between them, (7, 7),
   * is seat 1's.
   */
  function facing(): { state: GameState; capital: City; rival: City; middle: Tile } {
    const state = board();
    const capital = town(state, 4, 7, 0, at(state, 3, 7));
    const rival = town(state, 10, 7, 1, at(state, 11, 7));
    const middle = at(state, 7, 7);
    own(state, capital, [at(state, 6, 7)]);
    own(state, rival, [middle, at(state, 8, 7)]);
    lay(state, [at(state, 6, 7), at(state, 8, 7)]);
    seat(state, PULL, 0);
    seat(state, PULL, 1);
    return { state, capital, rival, middle };
  }

  it('lets a hex move once a sweep, so the first holder keeps it that turn', () => {
    const { state, capital, rival, middle } = facing();
    const before = [...state.tileOwner];
    pullRivalHexesToWorks(state);
    // Seat 0 comes first and takes the middle hex. Seat 1's work would take
    // it back, as it is now a rival's hex, but it moved this sweep.
    expect(ownerOf(state, middle)).toBe(capital.id);
    const changed = state.tileOwner.flatMap((owner, index) => (owner === before[index] ? [] : [index]));
    expect(changed).toEqual([tileIndex(state.map, middle.col, middle.row)]);
    // On the next sweep the hex may change hands again: seat 0's work has no
    // rival hex left beside it, and seat 1's work takes the middle hex back.
    pullRivalHexesToWorks(state);
    expect(ownerOf(state, middle)).toBe(rival.id);
  });

  it('gives a hex two holders reach for to the first seat, and the second takes its next hex', () => {
    const state = board(3);
    const capital = town(state, 4, 7, 0, at(state, 3, 7));
    const loser = town(state, 7, 10, 1, at(state, 7, 11));
    const third = town(state, 10, 7, 2, at(state, 11, 7));
    const west = at(state, 6, 7);
    const east = at(state, 8, 7);
    const middle = at(state, 7, 7);
    own(state, capital, [west]);
    own(state, third, [east]);
    lay(state, [west, east]);
    // The middle hex is the only seat-1 hex beside the western work. The
    // eastern work also has a second seat-1 hex beside it.
    const eastRing = neighborTiles(state.map, tileHex(east));
    const westRing = neighborTiles(state.map, tileHex(west));
    const spare = eastRing
      .slice(eastRing.indexOf(middle) + 1)
      .find((tile) => ownerOf(state, tile) === null && !westRing.includes(tile))!;
    expect(spare).toBeDefined();
    own(state, loser, [middle, spare]);
    // The eastern work reaches the middle hex before its spare.
    expect(eastRing.indexOf(middle)).toBeLessThan(eastRing.indexOf(spare));
    seat(state, PULL, 0);
    seat(state, PULL, 2);
    pullRivalHexesToWorks(state);
    expect(ownerOf(state, middle)).toBe(capital.id);
    expect(ownerOf(state, spare)).toBe(third.id);
  });

  it('gives the same board twice', () => {
    /**
     * Both seats hold the card, with three works each along a shared border,
     * and the borders phase runs for five turns.
     */
    function run(): { owners: (number | null)[]; worked: unknown; pins: unknown; sight: number[][] } {
      const state = board();
      const capital = town(state, 4, 7, 0, at(state, 3, 7));
      const rival = town(state, 10, 7, 1, at(state, 11, 7));
      for (const row of [5, 6, 7, 8, 9]) {
        own(state, capital, [at(state, 5, row), at(state, 6, row)]);
        own(state, rival, [at(state, 7, row), at(state, 8, row), at(state, 9, row)]);
      }
      lay(state, [at(state, 6, 5), at(state, 6, 7), at(state, 6, 9)]);
      lay(state, [at(state, 8, 6), at(state, 8, 8)], ACADEMY);
      lay(state, [at(state, 7, 8)], FARM);
      seat(state, PULL, 0);
      seat(state, PULL, 1);
      for (let turn = 0; turn < 5; turn++) {
        state.turn += 1;
        expandBorders(state);
      }
      return {
        owners: [...state.tileOwner],
        worked: state.cities.map((city) => city.workedTiles),
        pins: state.cities.map((city) => city.lockedTiles),
        sight: state.visibility.map((grid) => [...grid]),
      };
    }
    const first = run();
    const second = run();
    expect(second).toEqual(first);
    // And the run did move ground, so the two boards agree on something.
    const state = board();
    expect(first.owners.filter((owner) => owner !== null).length).toBeGreaterThan(
      state.tileOwner.filter((owner) => owner !== null).length,
    );
  });
});
