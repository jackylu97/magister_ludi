/**
 * **The two largest rule-breakers** (batch DV8 of
 * `docs/plans/devotion-themes-triage.md`). `devotion.test.ts` checks the rows
 * against the sheet. This file checks what the batch changed on a small board:
 *
 *   · The Turning of Swords (reading 30): the `faithfulKillsConvert` rule,
 *     read in `applyCombat` beside Blood Brothers' rule. An enemy land
 *     soldier the holder's attack kills on ground a following town owns
 *     changes sides at full health, once a turn for each card. It is a
 *     capture: no kill or death riders and no kill or loss tallies, but the
 *     loser's war record counts it. Not a barbarian, not a garrison;
 *   · The Double Feast (reading 31): the `twoRites` rule. A town keeps two
 *     different rites; the same rite never twice. The Votive Offering takes a
 *     place while it runs. A prophet's rite over the realm takes a free
 *     place, or the place of the older rite. The readers that ask whether a
 *     town keeps any rite do not pay twice; the tally of rites started counts
 *     each. The faith screen draws a town with a free place among the free
 *     towns, and a full town with both rites;
 *   · without either card, everything is placed as before.
 */

import { describe, expect, it } from 'vitest';

import { type CardImpactLine, explainRitePreview, foldCardImpact } from '../../../src/sim/cardImpact';
import { capitalCityOf, foundCityAt, refreshCityDerived } from '../../../src/sim/cities';
import { type Command, applyCommand } from '../../../src/sim/commands';
import { type Tile, getTileAt, neighborTiles, tileHex } from '../../../src/sim/map';
import {
  cityRite,
  cityRiteTurnsLeft,
  cityRites,
  cityTimedWithRite,
  empireRiteAt,
  performRiteAt,
  riteError,
  ritePlacesFor,
  ritesDisplacedBy,
  riteTurnsFor,
} from '../../../src/sim/religion';
import type { RiteId } from '../../../src/sim/religionData';
import { unitHealthBonus } from '../../../src/sim/resourceEffects';
import {
  type City,
  type GameState,
  type Player,
  type Unit,
  bumpRevision,
  createUnit,
  playerById,
  unitById,
} from '../../../src/sim/state';
import { describeCard, stripRefs, tallyOf } from '../../../src/sim/statecraft';
import { cardTurningSides } from '../../../src/sim/statecraft/evaluator';
import { type OrderId, orderDef, orderIsDealt, ordersForDecks } from '../../../src/sim/statecraftData';
import { unitMaxHp } from '../../../src/sim/unitData';
import { explainCity } from '../../../src/sim/yields/town';
import {
  type RitesReadings,
  freshRitesView,
  riteChipVoice,
  ritesCount,
  ritesTabModel,
  selectRite,
} from '../../../src/ui/ritesTab';
import { at, bareState } from '../improvementHelpers';

const SWORDS = 'theTurningOfSwords' as OrderId;
const FEAST = 'theDoubleFeast' as OrderId;
const MARTYROLOGY = 'theMartyrology' as OrderId;
const ROGATIONS = 'theRogations' as OrderId;
const VOTIVE_GIFTS = 'theVotiveGifts' as OrderId;
const ASTRONOMERS = 'thePriestAstronomers' as OrderId;

const OMEN: RiteId = 'omenReading';
const HARVEST: RiteId = 'riteOfTheHarvest';
const PLENTY: RiteId = 'riteOfPlenty';
const VOTIVE: RiteId = 'votiveOffering';

/** Puts an Order in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, card: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Takes an Order out of its chair, as when the card leaves. */
function unslot(state: GameState, playerId: number, card: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  sc.slots = sc.slots.map((seat) => (seat !== null && seat.card === card ? null : seat));
  bumpRevision(state);
}

/** One town of the given size for a seat, with an empty queue. */
function town(state: GameState, owner: number, col: number, row: number, population = 4): City {
  const city = foundCityAt(state, owner, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/**
 * A religion founded by the site's owner, whose holy site is this town's
 * centre. The owner holds the site, so the religion pays it. Every citizen of
 * the given towns follows it.
 */
function religionAt(state: GameState, site: City, followers: readonly City[]): number {
  const tile = getTileAt(state.map, site.col, site.row)!;
  tile.improvement = 'holySite' as never;
  state.religions.push({
    id: state.religions.length,
    founderId: site.ownerId,
    name: `The Testament ${state.religions.length}`,
    pantheon: [],
    follower: [],
    enhancer: [],
    foundedTurn: state.turn,
    holySite: { col: site.col, row: site.row },
  } as never);
  const religion = state.religions.length - 1;
  for (const city of followers) city.followers = { [religion]: city.population };
  bumpRevision(state);
  return religion;
}

/** Seat 0 with a deep faith bank. */
function faithful(state: GameState): Player {
  const player = playerById(state, 0)!;
  player.faithPool = 100_000;
  bumpRevision(state);
  return player;
}

/** The describer's clauses for a card, keyword marks stripped. */
function words(id: OrderId): string[] {
  return describeCard(id).map((clause) => stripRefs(clause.text));
}

// --- the rows -----------------------------------------------------------------

describe('the two rows', () => {
  it('deals The Turning of Swords and The Double Feast to a Devotion seat', () => {
    const mine = ordersForDecks(['devotion']);
    const expected: [OrderId, number, string][] = [
      [SWORDS, 3, 'military'],
      [FEAST, 4, 'civic'],
    ];
    for (const [id, band, type] of expected) {
      expect(orderIsDealt(id), id).toBe(true);
      expect(mine, id).toContain(id);
      expect(orderDef(id).band, id).toBe(band);
      expect(orderDef(id).rarity, id).toBe('rare');
      expect(orderDef(id).type, id).toBe(type);
    }
    expect(orderDef(SWORDS).effects).toEqual([{ kind: 'rule', rule: 'faithfulKillsConvert' }]);
    expect(orderDef(FEAST).effects).toEqual([{ kind: 'rule', rule: 'twoRites' }]);
  });

  it('says each rule in a player’s words', () => {
    expect(words(SWORDS)).toEqual([
      'once a turn, an enemy military unit your attack kills on land that follows your religion, outside a city, joins you at full health instead of dying',
    ]);
    expect(words(FEAST)).toEqual(['each of your cities may keep two different rites at once']);
  });
});

// --- The Turning of Swords ------------------------------------------------------

/**
 * Seat 0's religion, founded in its town at (5, 6), and a rival town of seat
 * 1's at (14, 6) that follows it. The two seats are at war (`bareState`).
 */
function holyWar(wild = false): { state: GameState; home: City; rival: City } {
  const state = bareState(24, 12, wild);
  const home = town(state, 0, 5, 6);
  const rival = town(state, 1, 14, 6);
  religionAt(state, home, [home, rival]);
  return { state, home, rival };
}

/** The hexes the rival's town owns around its centre, in a fixed order. */
function ringOf(state: GameState, city: City): Tile[] {
  const centre = getTileAt(state.map, city.col, city.row)!;
  return neighborTiles(state.map, tileHex(centre))
    .map((hex) => getTileAt(state.map, hex.col, hex.row)!)
    .filter((tile) => state.tileOwner[tile.row * state.map.width + tile.col] === city.id);
}

/** A hex beside this one with no town and no unit on it. */
function freeBeside(state: GameState, tile: Tile): Tile {
  for (const hex of neighborTiles(state.map, tileHex(tile))) {
    const next = getTileAt(state.map, hex.col, hex.row)!;
    if (state.cities.some((city) => city.col === next.col && city.row === next.row)) continue;
    if (state.units.some((unit) => unit.col === next.col && unit.row === next.row)) continue;
    return next;
  }
  throw new Error('no free hex beside the target');
}

/**
 * A wounded enemy soldier on this hex, killed by a fresh warrior of seat 0's
 * attacking from the hex beside it.
 */
function strike(state: GameState, target: Tile, owner = 1): { foe: Unit; mine: Unit } {
  const foe = createUnit(state, owner, 'warrior', target.col, target.row);
  foe.hp = 1;
  const from = freeBeside(state, target);
  const mine = createUnit(state, 0, 'warrior', from.col, from.row);
  bumpRevision(state);
  const result = applyCommand(state, {
    type: 'attack',
    playerId: 0,
    unitId: mine.id,
    target: { col: target.col, row: target.row },
  } as Command);
  expect(result.ok, JSON.stringify(result)).toBe(true);
  return { foe, mine };
}

describe('The Turning of Swords', () => {
  it('turns an enemy soldier killed on following ground to the killer’s side, at full health', () => {
    const { state, rival } = holyWar();
    slot(state, 0, SWORDS);
    // The loser holds The Martyrology, which counts its units that die.
    slot(state, 1, MARTYROLOGY);
    const target = ringOf(state, rival)[0]!;
    const { foe, mine } = strike(state, target);
    const after = unitById(state, foe.id);
    expect(after).toBeDefined();
    expect(after!.ownerId).toBe(0);
    expect(after!.hp).toBe(unitMaxHp(after!, unitHealthBonus(state, 0)));
    // Through `captureUnit`, so it costs no upkeep.
    expect(after!.freeUpkeep).toBe(true);
    // A capture, not a kill: no tallies on either side, and no death rider.
    const me = playerById(state, 0)!;
    const them = playerById(state, 1)!;
    expect(me.unitsKilled).toBe(0);
    expect(them.unitsLost).toBe(0);
    expect(tallyOf(them.statecraft, MARTYROLOGY)).toBe(0);
    // The loser's war record counts it.
    expect(them.warLosses).toEqual([{ turn: state.turn, by: 0, kind: 'unit' }]);
    // The stamp, once a turn for the card.
    expect(me.statecraft.sidesTurned).toEqual([{ card: SWORDS, turn: state.turn }]);
    // The hex holds the convert, so the attacker did not advance onto it.
    expect(unitById(state, mine.id)!.col).not.toBe(target.col);
  });

  it('turns at most one soldier a turn, and another the next turn', () => {
    const { state, rival } = holyWar();
    slot(state, 0, SWORDS);
    const [first, second, third] = ringOf(state, rival);
    const turned = strike(state, first!).foe;
    expect(unitById(state, turned.id)!.ownerId).toBe(0);
    // The second kill this turn is a kill.
    const killed = strike(state, second!).foe;
    expect(unitById(state, killed.id)).toBeUndefined();
    expect(playerById(state, 1)!.unitsLost).toBe(1);
    // The next turn the card turns another.
    state.turn += 1;
    bumpRevision(state);
    const next = strike(state, third!).foe;
    expect(unitById(state, next.id)!.ownerId).toBe(0);
    expect(playerById(state, 0)!.statecraft.sidesTurned).toEqual([{ card: SWORDS, turn: state.turn }]);
  });

  it('kills as before without the card, or on ground that does not follow', () => {
    const { state, rival } = holyWar();
    const [first, second] = ringOf(state, rival);
    expect(unitById(state, strike(state, first!).foe.id)).toBeUndefined();
    slot(state, 0, SWORDS);
    // The rival's town follows no religion now.
    rival.followers = {};
    bumpRevision(state);
    expect(cardTurningSides(state, 0, second!.col, second!.row)).toBeNull();
    expect(unitById(state, strike(state, second!).foe.id)).toBeUndefined();
    expect(playerById(state, 0)!.statecraft.sidesTurned).toBeUndefined();
  });

  it('never turns a barbarian', () => {
    const { state, rival } = holyWar(true);
    slot(state, 0, SWORDS);
    const wild = state.players.find((player) => player.barbarian)!;
    const target = ringOf(state, rival)[0]!;
    expect(unitById(state, strike(state, target, wild.id).foe.id)).toBeUndefined();
    expect(playerById(state, 0)!.statecraft.sidesTurned).toBeUndefined();
  });

  it('never turns a town’s garrison', () => {
    const { state, rival } = holyWar();
    slot(state, 0, SWORDS);
    // The walls are down, so the blow is struck at the garrison.
    rival.hp = 1;
    bumpRevision(state);
    const centre = getTileAt(state.map, rival.col, rival.row)!;
    const { foe } = strike(state, centre);
    expect(unitById(state, foe.id)).toBeUndefined();
    expect(playerById(state, 0)!.statecraft.sidesTurned).toBeUndefined();
  });
});

// --- The Double Feast -----------------------------------------------------------

/** Seat 0 with towns at the given columns of row 5, and a deep faith bank. */
function realm(columns: readonly number[]): { state: GameState; player: Player; towns: City[] } {
  const state = bareState(28, 10);
  const towns = columns.map((col) => town(state, 0, col, 5));
  const player = faithful(state);
  return { state, player, towns };
}

describe('The Double Feast: the gate', () => {
  it('refuses a second rite without the card, in the old words', () => {
    const { state, player, towns } = realm([5]);
    const city = towns[0]!;
    expect(ritePlacesFor(state, 0)).toBe(1);
    performRiteAt(state, player, city, OMEN);
    expect(riteError(state, 0, city.id, HARVEST)).toBe(`${city.name} is already keeping Omen Reading`);
    expect(riteError(state, 0, city.id, OMEN)).toBe(`${city.name} is already keeping Omen Reading`);
  });

  it('lets a town keep two different rites, never the same one twice', () => {
    const { state, player, towns } = realm([5]);
    const city = towns[0]!;
    slot(state, 0, FEAST);
    slot(state, 0, ROGATIONS);
    expect(ritePlacesFor(state, 0)).toBe(2);
    performRiteAt(state, player, city, OMEN);
    expect(riteError(state, 0, city.id, OMEN)).toBe(`${city.name} is already keeping Omen Reading`);
    expect(riteError(state, 0, city.id, HARVEST)).toBeNull();
    performRiteAt(state, player, city, HARVEST);
    expect(cityRites(state, city)).toEqual([OMEN, HARVEST]);
    // `cityRite` answers the older one: the reading for "keeps any rite".
    expect(cityRite(state, city)).toBe(OMEN);
    expect(riteError(state, 0, city.id, PLENTY)).toBe(
      `${city.name} is already keeping Omen Reading and Rite of the Harvest`,
    );
    // Each rite started counts (reading 31): The Rogations grew twice.
    expect(tallyOf(player.statecraft, ROGATIONS)).toBe(2);
  });

  it('counts the Votive Offering in a place while it runs', () => {
    const { state, player, towns } = realm([5]);
    const city = towns[0]!;
    slot(state, 0, FEAST);
    slot(state, 0, VOTIVE_GIFTS);
    performRiteAt(state, player, city, OMEN);
    city.queue = [{ kind: 'building', id: 'granary' as never }];
    bumpRevision(state);
    expect(riteError(state, 0, city.id, VOTIVE)).toBeNull();
    performRiteAt(state, player, city, VOTIVE);
    expect(cityRites(state, city)).toEqual([OMEN, VOTIVE]);
    expect(riteError(state, 0, city.id, HARVEST)).toBe(
      `${city.name} is already keeping Omen Reading and Votive Offering`,
    );
  });

  it('reads the turns left of each rite apart', () => {
    const { state, player, towns } = realm([5]);
    const city = towns[0]!;
    slot(state, 0, FEAST);
    performRiteAt(state, player, city, OMEN);
    state.turn += 3;
    bumpRevision(state);
    performRiteAt(state, player, city, HARVEST);
    const full = riteTurnsFor(state, 0, HARVEST)!;
    expect(cityRiteTurnsLeft(state, city, HARVEST)).toBe(full);
    expect(cityRiteTurnsLeft(state, city, OMEN)).toBe(full - 3);
    expect(cityRiteTurnsLeft(state, city)).toBe(full);
  });

  it('keeps both rites when the card leaves, and refuses a new one until a place is free', () => {
    const { state, player, towns } = realm([5]);
    const city = towns[0]!;
    slot(state, 0, FEAST);
    performRiteAt(state, player, city, OMEN);
    performRiteAt(state, player, city, HARVEST);
    unslot(state, 0, FEAST);
    expect(cityRites(state, city)).toEqual([OMEN, HARVEST]);
    expect(riteError(state, 0, city.id, PLENTY)).toBe(
      `${city.name} is already keeping Omen Reading and Rite of the Harvest`,
    );
  });
});

describe('The Double Feast: a prophet’s rite over the realm', () => {
  it('takes a free place, the same rite’s place, or the older rite’s place', () => {
    const { state, player, towns } = realm([3, 9, 15, 21]);
    const [none, one, two, same] = towns;
    slot(state, 0, FEAST);
    performRiteAt(state, player, one!, HARVEST);
    performRiteAt(state, player, two!, OMEN);
    performRiteAt(state, player, two!, HARVEST);
    performRiteAt(state, player, same!, PLENTY);
    performRiteAt(state, player, same!, OMEN);
    expect(ritesDisplacedBy(state, none!, PLENTY)).toEqual([]);
    expect(ritesDisplacedBy(state, one!, PLENTY)).toEqual([]);
    expect(ritesDisplacedBy(state, two!, PLENTY)).toEqual([OMEN]);
    expect(ritesDisplacedBy(state, same!, PLENTY)).toEqual([PLENTY]);
    const prophet = createUnit(state, 0, 'prophet', none!.col, none!.row);
    bumpRevision(state);
    empireRiteAt(state, player, prophet, PLENTY);
    expect(cityRites(state, none!)).toEqual([PLENTY]);
    expect(cityRites(state, one!)).toEqual([HARVEST, PLENTY]);
    expect(cityRites(state, two!)).toEqual([HARVEST, PLENTY]);
    // The same rite is renewed, never kept twice.
    expect(cityRites(state, same!)).toEqual([OMEN, PLENTY]);
    expect(cityRiteTurnsLeft(state, same!, PLENTY)).toBe(riteTurnsFor(state, 0, PLENTY));
  });

  it('takes every rite a town keeps without the card, as before', () => {
    const { state, player, towns } = realm([3, 9]);
    const [first, second] = towns;
    performRiteAt(state, player, first!, HARVEST);
    performRiteAt(state, player, second!, PLENTY);
    expect(ritesDisplacedBy(state, first!, PLENTY)).toEqual([HARVEST]);
    expect(ritesDisplacedBy(state, second!, PLENTY)).toEqual([PLENTY]);
    const prophet = createUnit(state, 0, 'prophet', first!.col, first!.row);
    bumpRevision(state);
    empireRiteAt(state, player, prophet, PLENTY);
    expect(cityRites(state, first!)).toEqual([PLENTY]);
    expect(cityRites(state, second!)).toEqual([PLENTY]);
  });

  it('takes both rites off a town that kept two when the card has left', () => {
    const { state, player, towns } = realm([5]);
    const city = towns[0]!;
    slot(state, 0, FEAST);
    performRiteAt(state, player, city, OMEN);
    performRiteAt(state, player, city, HARVEST);
    unslot(state, 0, FEAST);
    const prophet = createUnit(state, 0, 'prophet', city.col, city.row);
    bumpRevision(state);
    empireRiteAt(state, player, prophet, PLENTY);
    expect(cityRites(state, city)).toEqual([PLENTY]);
  });
});

describe('The Double Feast: the readers', () => {
  it('pays a card that counts towns keeping a rite once for a town keeping two', () => {
    const { state, player, towns } = realm([5]);
    const city = towns[0]!;
    expect(capitalCityOf(state, 0)?.id).toBe(city.id);
    slot(state, 0, FEAST);
    slot(state, 0, ASTRONOMERS);
    const science = (): number =>
      explainCity(state, city)
        .lines.filter((line) => line.card === ASTRONOMERS)
        .reduce((sum, line) => sum + line.science, 0);
    performRiteAt(state, player, city, OMEN);
    const once = science();
    expect(once).toBe(2);
    performRiteAt(state, player, city, HARVEST);
    bumpRevision(state);
    expect(science()).toBe(once);
  });

  it('previews a second rite on top of the first, and the prophet’s word without the card', () => {
    const { state, player, towns } = realm([5]);
    const city = towns[0]!;
    city.buildings.push('granary' as never, 'monument' as never);
    bumpRevision(state);
    performRiteAt(state, player, city, OMEN);
    // Without the card the preview takes Omen Reading off, as the prophet's
    // word would, so the town loses its science.
    const without = foldCardImpact(explainRitePreview(state, 0, city.id, HARVEST));
    expect(without.science).toBeLessThan(0);
    slot(state, 0, FEAST);
    const timed = cityTimedWithRite(state, 0, city, HARVEST)!;
    expect(timed.some((entry) => entry.card === OMEN)).toBe(true);
    expect(timed.some((entry) => entry.card === HARVEST)).toBe(true);
    const withFeast = foldCardImpact(explainRitePreview(state, 0, city.id, HARVEST));
    expect(withFeast.science).toBe(0);
    expect(withFeast.food).toBeGreaterThan(0);
  });

  it('draws a town with a free place among the free towns, and a full town with both rites', () => {
    const { state, player, towns } = realm([3, 9, 15]);
    const [half, full, empty] = towns;
    slot(state, 0, FEAST);
    performRiteAt(state, player, half!, OMEN);
    performRiteAt(state, player, full!, OMEN);
    performRiteAt(state, player, full!, HARVEST);
    const preview = (cityId: number, rite: RiteId): readonly CardImpactLine[] =>
      explainRitePreview(state, 0, cityId, rite);
    const readings: RitesReadings = { preview, voice: (rite) => riteChipVoice(state, 0, rite, preview) };
    const shown = ritesTabModel(state, 0, freshRitesView(state.turn), readings);
    expect(shown.places).toBe(2);
    expect(shown.free.map((row) => row.cityId)).toEqual([half!.id, empty!.id]);
    expect(shown.free[0]!.keeping.map((rite) => rite.rite)).toEqual([OMEN]);
    expect(shown.free[1]!.keeping).toEqual([]);
    expect(shown.kept.map((row) => row.cityId)).toEqual([full!.id]);
    expect(shown.kept[0]!.rites.map((rite) => rite.rite)).toEqual([OMEN, HARVEST]);
    expect(shown.kept[0]!.freeOnTurn).toBe(
      state.turn + Math.min(...shown.kept[0]!.rites.map((rite) => rite.turnsLeft)),
    );
    expect(shown.chips.find((chip) => chip.rite === OMEN)!.keptIn).toBe(2);
    expect(shown.chips.find((chip) => chip.rite === HARVEST)!.keptIn).toBe(1);
    expect(ritesCount(state, 0)).toBe('1 kept · 2 free');
    // The realm line names only the rites a prophet's word would take off:
    // Rite of Plenty takes the older rite's place in the full town alone.
    const plenty = ritesTabModel(state, 0, selectRite(freshRitesView(state.turn), PLENTY), readings);
    expect(plenty.realm.says).toContain('It replaces the rites your towns are keeping: Omen Reading in 1 town.');
  });
});
