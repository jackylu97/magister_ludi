/**
 * **Dominion batch D14, the three drafts** (`docs/plans/dominion-themes-
 * triage.md`, the D14 section, and readings 35 to 37). The user took the
 * themes pass's drafts as written, to rework after a playtest.
 * `dominion.test.ts` checks the rows against the sheet, and
 * `test/fixtures/cardText.json` pins their words. This file checks that the
 * three shapes do what the cards say:
 *
 *   · The Longships (`shoreRaid`, the row `marineDrill`): at the end of the
 *     owner's turn each ship pillages the first enemy improvement on land
 *     beside it, a full pillage, one hex for each ship each turn, two under
 *     Double Time;
 *   · The Relay Stations (`unitStat` with `where: 'connectedTown'`): +2
 *     movement for a land military unit in one of its owner's towns joined to
 *     the capital by road, read where the allowance refills;
 *   · Circumvallation (`opusSiege`): a rival town under siege, with a unit of
 *     the holder beside it, makes no production toward a Magnum Opus, and its
 *     own breakdown names the card.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../../src/sim/cities';
import { siegeField, underSiege } from '../../../src/sim/combat';
import { raidFromTheSea } from '../../../src/sim/improvements';
import { type Tile, createMap, getTileAt, neighborTiles, raiseImprovement, tileHex, wrappedDistance } from '../../../src/sim/map';
import { makeRng } from '../../../src/sim/rng';
import { connectedCities, layRoad } from '../../../src/sim/roads';
import {
  type City,
  type GameState,
  type Unit,
  bumpRevision,
  createUnit,
  playerById,
  realPlayers,
} from '../../../src/sim/state';
import { cardOpusSiegeBy, cardShoreRaids, describeCard, stripRefs, tallyOf } from '../../../src/sim/statecraft';
import { type OrderId, orderDef, orderIsDealt } from '../../../src/sim/statecraftData';
import { runEndOfTurn } from '../../../src/sim/turn';
import { fullMovement } from '../../../src/sim/units';
import { resetVisibility } from '../../../src/sim/visibility';
import { openWar } from '../../../src/sim/wars';
import { explainOpusGate, explainSurplusMoved, foldCity } from '../../../src/sim/yields/town';
import { newGame } from '../newGameHelpers';

const LONGSHIPS = 'marineDrill' as OrderId;
const RELAY = 'dominionTheRelayStations' as OrderId;
const CIRCUMVALLATION = 'dominionCircumvallation' as OrderId;
const DOUBLE_TIME = 'doubleTime' as OrderId;
const OPUS = 'theMagnumOpus';

// --- benches -----------------------------------------------------------------

/** Seats on a flat grassland rectangle. Seats 0 and 1 are at war unless told otherwise. */
function flat(seats = 2, war = true): GameState {
  const names = ['A', 'B', 'C'];
  const colours = ['#a00', '#00a', '#0a0'];
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    barbarians: false,
    players: names.slice(0, seats).map((name, i) => ({ name, color: colours[i]!, isHuman: true })),
  });
  state.map = createMap({ width: 18, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(18 * 12).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  state.rng = makeRng(12345);
  if (war) {
    const real = realPlayers(state);
    openWar(state, real[0]!.id, real[1]!.id);
  }
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  return getTileAt(state.map, col, row)!;
}

/** Puts an Order in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

function words(id: OrderId): string {
  return describeCard(id)
    .map((clause) => stripRefs(clause.text))
    .join(' | ');
}

// --- The Longships -----------------------------------------------------------

/**
 * Seat 1's town at (8, 5). The first hex of its ring is turned to coast, and
 * seat 0's trireme stands on it. The two land hexes beside the ship that lie
 * in the town's ring are seat 1's ground; `shore` lists them in the map's
 * neighbour order.
 */
function coast(war = true): { state: GameState; town: City; ship: Unit; shore: Tile[] } {
  const state = flat(2, war);
  const town = foundCityAt(state, 1, at(state, 8, 5));
  const sea = neighborTiles(state.map, tileHex(at(state, town.col, town.row)))[0]!;
  sea.terrain = 'coast';
  const ship = createUnit(state, 0, 'trireme', sea.col, sea.row);
  bumpRevision(state);
  const shore = neighborTiles(state.map, tileHex(sea)).filter(
    (hex) =>
      hex.terrain !== 'coast' &&
      !(hex.col === town.col && hex.row === town.row) &&
      wrappedDistance(state.map, tileHex(hex), tileHex(at(state, town.col, town.row))) === 1,
  );
  expect(shore.length, 'the ship has seat 1 ground beside it').toBeGreaterThanOrEqual(2);
  for (const hex of shore) expect(state.tileOwner[hex.row * 18 + hex.col]).toBe(1);
  return { state, town, ship, shore };
}

function farm(state: GameState, tile: Tile): void {
  raiseImprovement(tile, 'farm' as never, state.turn);
  bumpRevision(state);
}

describe('Dominion D14 — The Longships', () => {
  it('takes over the row marineDrill as an uncommon Military Order of Tier II with one rule', () => {
    const def = orderDef(LONGSHIPS);
    expect(def.name).toBe('The Longships');
    expect(def.band).toBe(2);
    expect(def.rarity).toBe('uncommon');
    expect(def.type).toBe('military');
    expect(def.effects).toEqual([{ kind: 'rule', rule: 'shoreRaid' }]);
    expect(def.note).toBeUndefined();
    expect(orderIsDealt(LONGSHIPS)).toBe(true);
    expect(words(LONGSHIPS)).toBe(
      'at the end of your turn, each of your ships pillages one enemy improvement on the shore beside it',
    );
  });

  it('pillages an enemy farm on the shore beside a ship, as a full pillage', () => {
    const { state, ship, shore } = coast();
    slot(state, 0, LONGSHIPS);
    slot(state, 0, 'theCaptiveCraftsmen' as OrderId);
    farm(state, shore[0]!);
    const seat = playerById(state, 0)!;
    const gold = seat.gold;
    const reports = raidFromTheSea(state);
    expect(reports).toHaveLength(1);
    const report = reports[0]!;
    expect(report.ownerId).toBe(0);
    expect(report.fromOwnerId).toBe(1);
    expect([report.col, report.row]).toEqual([shore[0]!.col, shore[0]!.row]);
    expect(report.improvement).toBe('farm');
    expect(shore[0]!.improvement).toBeUndefined();
    // The salvage, the record and the tally, as any pillage pays them.
    expect(report.gold).toBeGreaterThan(0);
    expect(seat.gold).toBe(gold + report.gold);
    expect(seat.hexesPillaged).toBe(1);
    expect(tallyOf(seat.statecraft, 'theCaptiveCraftsmen' as OrderId)).toBe(1);
    // The ship spent the raid's movement point, as a raider does.
    expect(ship.movesLeft).toBeLessThan(fullMovement(ship, state));
  });

  it('burns one hex for each ship each turn: the first in neighbour order', () => {
    const { state, shore } = coast();
    slot(state, 0, LONGSHIPS);
    farm(state, shore[0]!);
    farm(state, shore[1]!);
    expect(raidFromTheSea(state)).toHaveLength(1);
    expect(shore[0]!.improvement).toBeUndefined();
    expect(shore[1]!.improvement).toBe('farm');
    // The next turn's raid takes the next hex.
    expect(raidFromTheSea(state)).toHaveLength(1);
    expect(shore[1]!.improvement).toBeUndefined();
    expect(raidFromTheSea(state)).toHaveLength(0);
  });

  it('burns two hexes under Double Time, which repeats an Order’s end-of-turn effects', () => {
    const { state, ship, shore } = coast();
    slot(state, 0, LONGSHIPS);
    slot(state, 0, DOUBLE_TIME);
    expect(cardShoreRaids(state, ship)).toBe(2);
    farm(state, shore[0]!);
    farm(state, shore[1]!);
    expect(raidFromTheSea(state)).toHaveLength(2);
    expect(shore[0]!.improvement).toBeUndefined();
    expect(shore[1]!.improvement).toBeUndefined();
  });

  it('never burns a tended work, a hex at peace, its own ground or open water', () => {
    // A tended work on the shore.
    const tended = coast();
    slot(tended.state, 0, LONGSHIPS);
    raiseImprovement(tended.shore[0]!, 'forestGarden' as never, tended.state.turn);
    bumpRevision(tended.state);
    expect(raidFromTheSea(tended.state)).toHaveLength(0);
    expect(tended.shore[0]!.improvement).toBe('forestGarden');

    // The same farm with no war between the two.
    const peace = coast(false);
    slot(peace.state, 0, LONGSHIPS);
    farm(peace.state, peace.shore[0]!);
    expect(raidFromTheSea(peace.state)).toHaveLength(0);
    expect(peace.shore[0]!.improvement).toBe('farm');

    // A farm on seat 0's own ground.
    const own = coast();
    slot(own.state, 0, LONGSHIPS);
    for (const hex of own.shore) own.state.tileOwner[hex.row * 18 + hex.col] = 0;
    farm(own.state, own.shore[0]!);
    expect(raidFromTheSea(own.state)).toHaveLength(0);

    // Fishing boats on an enemy water hex beside the ship.
    const water = coast();
    slot(water.state, 0, LONGSHIPS);
    const boats = water.shore[0]!;
    boats.terrain = 'coast';
    raiseImprovement(boats, 'fishingBoats' as never, water.state.turn);
    bumpRevision(water.state);
    expect(raidFromTheSea(water.state)).toHaveLength(0);
    expect(boats.improvement).toBe('fishingBoats');
  });

  it('does nothing without the card, and a land unit never raids with it', () => {
    const { state, ship, shore } = coast();
    farm(state, shore[0]!);
    expect(cardShoreRaids(state, ship)).toBe(0);
    expect(raidFromTheSea(state)).toHaveLength(0);

    slot(state, 0, LONGSHIPS);
    // A warrior on the far side of the farm is no ship.
    const beyond = neighborTiles(state.map, tileHex(shore[0]!)).find(
      (hex) => hex.terrain !== 'coast' && state.tileOwner[hex.row * 18 + hex.col] !== 1,
    );
    if (beyond) {
      const warrior = createUnit(state, 0, 'warrior', beyond.col, beyond.row);
      bumpRevision(state);
      expect(cardShoreRaids(state, warrior)).toBe(0);
    }
    state.units = state.units.filter((unit) => unit.id !== ship.id);
    bumpRevision(state);
    expect(raidFromTheSea(state)).toHaveLength(0);
    expect(shore[0]!.improvement).toBe('farm');
  });

  it('raids at the end of the turn, and the raid joins the turn’s pillage reports', () => {
    const { state, shore } = coast();
    slot(state, 0, LONGSHIPS);
    farm(state, shore[0]!);
    const report = runEndOfTurn(state);
    expect(shore[0]!.improvement).toBeUndefined();
    const raids = report.pillages.filter((entry) => entry.ownerId === 0);
    expect(raids).toHaveLength(1);
    expect(raids[0]!.fromOwnerId).toBe(1);
  });
});

// --- The Relay Stations ------------------------------------------------------

/**
 * Seat 0's capital at (3, 5) and a second town at (9, 5), joined by a road on
 * every hex between them. A third town at (15, 5) has no road.
 */
function relay(): { state: GameState; capital: City; joined: City; apart: City } {
  const state = flat(2, false);
  const capital = foundCityAt(state, 0, at(state, 3, 5));
  const joined = foundCityAt(state, 0, at(state, 9, 5));
  const apart = foundCityAt(state, 0, at(state, 15, 5));
  for (let col = 4; col <= 8; col++) layRoad(at(state, col, 5), 0);
  bumpRevision(state);
  expect(connectedCities(state, 0).map((entry) => entry.city.id)).toEqual([joined.id]);
  return { state, capital, joined, apart };
}

describe('Dominion D14 — The Relay Stations', () => {
  it('is a live uncommon Military Order of Tier II with one movement line', () => {
    const def = orderDef(RELAY);
    expect(def.band).toBe(2);
    expect(def.rarity).toBe('uncommon');
    expect(def.type).toBe('military');
    expect(def.deferred).toBeUndefined();
    expect(orderIsDealt(RELAY)).toBe(true);
    expect(def.effects).toEqual([
      {
        kind: 'unitStat',
        stat: 'movement',
        amount: 2,
        class: { category: 'military' },
        where: 'connectedTown',
      },
    ]);
    expect(words(RELAY)).toBe(
      'military units: +2 movement when they start their turn in one of your cities joined to your capital',
    );
  });

  it('gives +2 movement to a land military unit in a town joined to the capital', () => {
    const { state, joined } = relay();
    const soldier = createUnit(state, 0, 'warrior', joined.col, joined.row);
    bumpRevision(state);
    const plain = fullMovement(soldier, state);
    slot(state, 0, RELAY);
    expect(fullMovement(soldier, state)).toBe(plain + 2);
  });

  it('gives nothing in the capital, in a town with no road, or out in the field', () => {
    const { state, capital, apart } = relay();
    slot(state, 0, RELAY);
    const base = (type: string): number =>
      fullMovement(createUnit(state, 1, type as never, 0, 0), state);
    for (const [col, row] of [
      [capital.col, capital.row],
      [apart.col, apart.row],
      [6, 5],
    ] as const) {
      const soldier = createUnit(state, 0, 'warrior', col, row);
      bumpRevision(state);
      expect(fullMovement(soldier, state), `(${col}, ${row})`).toBe(base('warrior'));
    }
  });

  it('gives nothing to a ship in the town, which is not a land military unit', () => {
    const { state, joined } = relay();
    const ship = createUnit(state, 0, 'trireme', joined.col, joined.row);
    bumpRevision(state);
    const plain = fullMovement(ship, state);
    slot(state, 0, RELAY);
    expect(fullMovement(ship, state)).toBe(plain);
  });

  it('is read where the allowance refills: a unit that ends the turn in the town starts the next with +2', () => {
    const { state, joined } = relay();
    slot(state, 0, RELAY);
    const soldier = createUnit(state, 0, 'warrior', joined.col, joined.row);
    soldier.movesLeft = 0;
    bumpRevision(state);
    runEndOfTurn(state);
    const unslotted = createUnit(state, 1, 'warrior', 0, 0);
    expect(soldier.movesLeft).toBe(fullMovement(unslotted, state) + 2);
  });
});

// --- Circumvallation ---------------------------------------------------------

/** Hands a seat Siegecraft, the technology that lets its armies starve a town. */
function learnsSiege(state: GameState, playerId: number): void {
  const player = playerById(state, playerId)!;
  if (!player.techsResearched.includes('siegecraft')) player.techsResearched.push('siegecraft');
  bumpRevision(state);
}

/**
 * Seat 1's town at (8, 5), raising the Magnum Opus, ringed on all six sides
 * by seat 0's warriors. Seat 0 knows Siegecraft, so the town is under siege.
 */
function besieged(seats = 2): { state: GameState; town: City } {
  const state = flat(seats);
  learnsSiege(state, 0);
  const town = foundCityAt(state, 1, at(state, 8, 5));
  town.queue = [{ kind: 'building', id: OPUS as never }];
  for (const hex of neighborTiles(state.map, tileHex(at(state, town.col, town.row)))) {
    createUnit(state, 0, 'warrior', hex.col, hex.row);
  }
  bumpRevision(state);
  expect(underSiege(state, town, siegeField(state, town.ownerId))).toBe(true);
  return { state, town };
}

const production = (state: GameState, town: City): number =>
  foldCity(state, town, [], town.queue[0]).production;

describe('Dominion D14 — Circumvallation', () => {
  it('is a live uncommon Military Order of Tier IV with one rule', () => {
    const def = orderDef(CIRCUMVALLATION);
    expect(def.band).toBe(4);
    expect(def.rarity).toBe('uncommon');
    expect(def.type).toBe('military');
    expect(def.deferred).toBeUndefined();
    expect(orderIsDealt(CIRCUMVALLATION)).toBe(true);
    expect(def.effects).toEqual([{ kind: 'rule', rule: 'opusSiege' }]);
    expect(words(CIRCUMVALLATION)).toBe(
      'a rival city under siege by your units adds no production toward a Magnum Opus',
    );
  });

  it('stops a besieged rival town’s production toward the Opus, with a line that names the card', () => {
    const { state, town } = besieged();
    const before = production(state, town);
    expect(before).toBeGreaterThan(0);
    expect(explainOpusGate(state, town, town.queue[0])).toEqual([]);

    slot(state, 0, CIRCUMVALLATION);
    // The line is labelled as every card line is: the class word and the name.
    const source = 'Order · Circumvallation';
    expect(cardOpusSiegeBy(state, town)).toEqual({ playerId: 0, card: CIRCUMVALLATION, source });
    expect(explainOpusGate(state, town, town.queue[0])).toEqual([
      { source, yield: 'production', card: CIRCUMVALLATION },
    ]);
    expect(production(state, town)).toBe(0);
    // Only production stops: the town's other voices are what they were.
    const yields = foldCity(state, town, [], town.queue[0]);
    expect(yields.food).toBeGreaterThan(0);
  });

  it('banks no hammers at the end of the turn while the gate holds', () => {
    const { state, town } = besieged();
    slot(state, 0, CIRCUMVALLATION);
    const basket = town.hammerBasket;
    runEndOfTurn(state);
    expect(town.hammerBasket).toBe(basket);
  });

  it('stops nothing toward any other row', () => {
    const { state, town } = besieged();
    slot(state, 0, CIRCUMVALLATION);
    town.queue = [{ kind: 'unit', id: 'warrior' }];
    bumpRevision(state);
    expect(explainOpusGate(state, town, town.queue[0])).toEqual([]);
    expect(production(state, town)).toBeGreaterThan(0);
  });

  it('stops nothing once the siege is broken', () => {
    const { state, town } = besieged();
    slot(state, 0, CIRCUMVALLATION);
    // Lift three of the six warriors, on one side: the ring opens.
    const ring = neighborTiles(state.map, tileHex(at(state, town.col, town.row)));
    const lifted = new Set(ring.slice(0, 3).map((hex) => `${hex.col},${hex.row}`));
    state.units = state.units.filter((unit) => !lifted.has(`${unit.col},${unit.row}`));
    bumpRevision(state);
    expect(underSiege(state, town, siegeField(state, town.ownerId))).toBe(false);
    expect(explainOpusGate(state, town, town.queue[0])).toEqual([]);
    expect(production(state, town)).toBeGreaterThan(0);
  });

  it('needs one of the holder’s own units beside the town, among the besiegers', () => {
    // Seat 2 holds the card and knows Siegecraft, and seat 0 lays the siege.
    const { state, town } = besieged(3);
    slot(state, 2, CIRCUMVALLATION);
    learnsSiege(state, 2);
    expect(explainOpusGate(state, town, town.queue[0])).toEqual([]);
    expect(production(state, town)).toBeGreaterThan(0);
    // A unit of seat 2's beside the town, standing in for one of seat 0's.
    const ring = neighborTiles(state.map, tileHex(at(state, town.col, town.row)));
    const post = ring[0]!;
    state.units = state.units.filter((unit) => !(unit.col === post.col && unit.row === post.row));
    createUnit(state, 2, 'warrior', post.col, post.row);
    bumpRevision(state);
    expect(cardOpusSiegeBy(state, town)?.playerId).toBe(2);
    expect(production(state, town)).toBe(0);
    // Without Siegecraft that unit is not one of the besiegers, and the gap
    // it holds breaks the ring anyway.
    playerById(state, 2)!.techsResearched = playerById(state, 2)!.techsResearched.filter(
      (tech) => tech !== 'siegecraft',
    );
    bumpRevision(state);
    expect(cardOpusSiegeBy(state, town)).toBeNull();
    expect(production(state, town)).toBeGreaterThan(0);
  });

  it('never stops its holder’s own town', () => {
    const { state, town } = besieged();
    // The town's owner holds the card: it is not a rival of itself.
    slot(state, 1, CIRCUMVALLATION);
    expect(cardOpusSiegeBy(state, town)).toBeNull();
    expect(production(state, town)).toBeGreaterThan(0);
  });

  it('moves no food surplus into a town it has stopped', () => {
    const { state, town } = besieged();
    slot(state, 0, CIRCUMVALLATION);
    const yields = foldCity(state, town, [], town.queue[0]);
    expect(explainSurplusMoved(state, town, yields, town.queue[0])).toEqual([]);
  });
});
