/**
 * **The holy sites, the Opus and the authority capstone** (batch DV7 of
 * `docs/plans/devotion-themes-triage.md`). `devotion.test.ts` checks the rows
 * against the sheet. This file checks what the batch changed on a small board:
 *
 *   · The Anchorites (reading 27): `chargeCostOf` takes the empire, and a
 *     card's `chargePrice` rule sets the price of one act. A further holy site
 *     costs one charge; founding a religion still costs two. Every reader of a
 *     price asks it of the empire;
 *   · The Abbeys (reading 28): an apostle may raise a further holy site, at
 *     the planting price, only for an empire that has founded a religion;
 *   · The Interdict (reading 29): a rival's town that follows the holder's
 *     religion makes no production while it builds the Magnum Opus, as one
 *     line of step 13 that names the card;
 *   · The Caliphate (reading 5): devout towns cost no authority.
 */

import { describe, expect, it } from 'vitest';

import { BUILDING_IDS, type BuildingId, buildingDef } from '../../../src/sim/buildingData';
import { foundCityAt, refreshCityDerived } from '../../../src/sim/cities';
import { type Command, applyCommand } from '../../../src/sim/commands';
import { improvementErrorAt } from '../../../src/sim/improvements';
import { getTileAt, neighborTiles, tileHex } from '../../../src/sim/map';
import { explainAuthority } from '../../../src/sim/meters';
import {
  apostlesRaiseHolySites,
  chargeCostOf,
  chargeCostWords,
  plantHolySiteError,
  plantingCost,
} from '../../../src/sim/religion';
import { RULES } from '../../../src/sim/rulesData';
import {
  type City,
  type GameState,
  type Unit,
  bumpRevision,
  createUnit,
  playerById,
  unitById,
} from '../../../src/sim/state';
import { describeCard, stripRefs } from '../../../src/sim/statecraft';
import { cardOpusInterdictBy } from '../../../src/sim/statecraft/evaluator';
import { type OrderId, orderDef, orderIsDealt, ordersForDecks } from '../../../src/sim/statecraftData';
import { explainOpusGate, foldCity } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';

const ANCHORITES = 'theAnchorites' as OrderId;
const ABBEYS = 'theAbbeys' as OrderId;
const INTERDICT = 'theInterdict' as OrderId;
const CALIPHATE = 'theCaliphate' as OrderId;

/** Puts an Order in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, card: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
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
 * A religion founded by the town's owner, whose holy site is this town's
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

/** A hex beside this town where a holy site may stand, other than the ones to avoid. */
function groundBeside(state: GameState, city: City, ...avoid: { col: number; row: number }[]) {
  for (const tile of neighborTiles(state.map, tileHex(getTileAt(state.map, city.col, city.row)!))) {
    if (avoid.some((hex) => hex.col === tile.col && hex.row === tile.row)) continue;
    if (improvementErrorAt(state, city.ownerId, tile, 'holySite') === null) return tile;
  }
  throw new Error('no ground beside the town');
}

/** Seat 0 with a founded religion whose holy site is its town's centre. */
function foundedRealm(): { state: GameState; seat: City; religion: number } {
  const state = bareState(20, 12);
  const seat = town(state, 0, 6, 6, 4);
  const religion = religionAt(state, seat, [seat]);
  return { state, seat, religion };
}

/** Plants a holy site with this piece through the reducer. */
function plant(state: GameState, piece: Unit) {
  return applyCommand(state, { type: 'plantHolySite', playerId: piece.ownerId, unitId: piece.id } as Command);
}

/** The describer's clauses for a card, keyword marks stripped. */
function words(id: OrderId): string[] {
  return describeCard(id).map((clause) => stripRefs(clause.text));
}

/** The building that ends the game, read off its marker. */
const OPUS: BuildingId = BUILDING_IDS.find((id) => buildingDef(id).endsTheGame === true)!;

// --- the rows -----------------------------------------------------------------

describe('the four rows', () => {
  it('deals The Anchorites, The Caliphate, The Abbeys and The Interdict to a Devotion seat', () => {
    const mine = ordersForDecks(['devotion']);
    const expected: [OrderId, number, string][] = [
      [ANCHORITES, 2, 'uncommon'],
      [CALIPHATE, 3, 'rare'],
      [ABBEYS, 3, 'rare'],
      [INTERDICT, 4, 'rare'],
    ];
    for (const [id, band, rarity] of expected) {
      expect(orderIsDealt(id), id).toBe(true);
      expect(mine, id).toContain(id);
      expect(orderDef(id).band, id).toBe(band);
      expect(orderDef(id).rarity, id).toBe(rarity);
      expect(orderDef(id).type, id).toBe('civic');
      expect(orderDef(id).deferred, id).toBeUndefined();
      // Player prose with no figure and no identifier in it (rule 7).
      expect(orderDef(id).note ?? '', id).not.toMatch(/[0-9]/);
      expect(orderDef(id).note ?? '', id).not.toMatch(/[a-z][A-Z]/);
    }
  });

  it('prints every row through the describers in plain words', () => {
    expect(words(ANCHORITES)).toEqual(['raising a further holy site costs 1 charge']);
    expect(words(ABBEYS)).toEqual([
      'your apostles may raise a further holy site, as your prophets do, once you have founded a religion',
    ]);
    expect(words(INTERDICT)).toEqual([
      'a rival city that follows your religion adds no production toward a Magnum Opus',
    ]);
    expect(words(CALIPHATE)).toEqual(['the authority a devout city costs is 0']);
  });
});

// --- The Anchorites --------------------------------------------------------------

describe('The Anchorites', () => {
  it('sets the price of a further holy site for its holder alone, and leaves the founding at two', () => {
    const { state } = foundedRealm();
    const book = RULES.religion.prophetCosts;
    expect(chargeCostOf(state, 0, 'plantHolySite')).toBe(book.plantHolySite);
    slot(state, 0, ANCHORITES);
    expect(chargeCostOf(state, 0, 'plantHolySite')).toBe(1);
    expect(chargeCostWords(state, 0, 'plantHolySite')).toBe('1 charge');
    // The founding and every other act keep the book's price.
    expect(chargeCostOf(state, 0, 'foundReligion')).toBe(book.foundReligion);
    expect(chargeCostOf(state, 0, 'gainBelief')).toBe(book.gainBelief);
    expect(chargeCostOf(state, 0, 'proclaim')).toBe(book.proclaim);
    // Another empire pays the book's price.
    expect(chargeCostOf(state, 1, 'plantHolySite')).toBe(book.plantHolySite);
  });

  it('takes the lower price when two rows price the same act', () => {
    const { state } = foundedRealm();
    const player = playerById(state, 0)!;
    // A row hung on the seat as a timed effect, as a card's bill is, so it is
    // live without a chair. Alone it sets the price, even above the book's.
    player.timed = [
      ...(player.timed ?? []),
      {
        card: ANCHORITES,
        effect: { kind: 'rule', rule: 'chargePrice', verb: 'plantHolySite', value: 3 },
        expiresTurn: state.turn + 100,
      },
    ];
    bumpRevision(state);
    expect(chargeCostOf(state, 0, 'plantHolySite')).toBe(3);
    slot(state, 0, ANCHORITES);
    expect(chargeCostOf(state, 0, 'plantHolySite')).toBe(1);
  });

  it('lets a prophet raise a further site for one charge and keep the other', () => {
    const { state, seat } = foundedRealm();
    slot(state, 0, ANCHORITES);
    expect(plantingCost(state, 0)).toBe('plantHolySite');
    const ground = groundBeside(state, seat);
    const prophet = createUnit(state, 0, 'prophet', ground.col, ground.row);
    expect(prophet.chargesLeft).toBe(2);
    const done = plant(state, prophet);
    expect(done.ok).toBe(true);
    expect(done.ok ? done.planted?.prophetSpent : undefined).toBe(false);
    expect(at(state, ground.col, ground.row).improvement).toBe('holySite');
    // One charge of two is spent, and the act takes the day.
    const after = unitById(state, prophet.id)!;
    expect(after.chargesLeft).toBe(1);
    expect(after.movesLeft).toBe(0);
    // The next turn, the last charge raises one more site and the piece goes.
    after.movesLeft = 2;
    const next = groundBeside(state, seat, ground);
    after.col = next.col;
    after.row = next.row;
    bumpRevision(state);
    expect(plantHolySiteError(state, 0, prophet.id)).toBeNull();
    expect(plant(state, after).ok).toBe(true);
    expect(unitById(state, prophet.id)).toBeUndefined();
  });

  it('lets a prophet that has spoken once raise a further site, which it could not without the card', () => {
    const { state, seat } = foundedRealm();
    const ground = groundBeside(state, seat);
    const prophet = createUnit(state, 0, 'prophet', ground.col, ground.row);
    prophet.chargesLeft = 1;
    bumpRevision(state);
    expect(plantHolySiteError(state, 0, prophet.id)).toBe(
      'A prophet with one charge left cannot plant a holy site',
    );
    slot(state, 0, ANCHORITES);
    expect(plantHolySiteError(state, 0, prophet.id)).toBeNull();
  });

  it('leaves the founding at both charges', () => {
    const state = bareState(20, 12);
    const seat = town(state, 0, 6, 6, 4);
    slot(state, 0, ANCHORITES);
    const player = playerById(state, 0)!;
    player.pantheon.beliefs.push('keeperOfTheHearth' as never);
    bumpRevision(state);
    expect(plantingCost(state, 0)).toBe('foundReligion');
    const ground = groundBeside(state, seat);
    const prophet = createUnit(state, 0, 'prophet', ground.col, ground.row);
    prophet.chargesLeft = 1;
    bumpRevision(state);
    expect(plantHolySiteError(state, 0, prophet.id)).toBe(
      'A prophet with one charge left cannot found a faith',
    );
  });
});

// --- The Abbeys --------------------------------------------------------------------

describe('The Abbeys', () => {
  it('lets no apostle plant without the card', () => {
    const { state, seat } = foundedRealm();
    const ground = groundBeside(state, seat);
    const apostle = createUnit(state, 0, 'apostle', ground.col, ground.row);
    expect(apostlesRaiseHolySites(state, 0)).toBe(false);
    expect(plantHolySiteError(state, 0, apostle.id)).toMatch(/is no prophet/);
    expect(plant(state, apostle).ok).toBe(false);
  });

  it('lets an apostle raise a further site at a prophet’s price, and spends it', () => {
    const { state, seat, religion } = foundedRealm();
    slot(state, 0, ABBEYS);
    expect(apostlesRaiseHolySites(state, 0)).toBe(true);
    const ground = groundBeside(state, seat);
    const apostle = createUnit(state, 0, 'apostle', ground.col, ground.row);
    expect(apostle.chargesLeft).toBe(2);
    expect(plantHolySiteError(state, 0, apostle.id)).toBeNull();
    const done = plant(state, apostle);
    expect(done.ok).toBe(true);
    expect(done.ok ? done.planted?.founded : undefined).toBe(false);
    expect(at(state, ground.col, ground.row).improvement).toBe('holySite');
    // Two charges of two: a further site's book price.
    expect(unitById(state, apostle.id)).toBeUndefined();
    // The seat of the faith does not move, and no religion is founded.
    expect(state.religions).toHaveLength(1);
    expect(state.religions[religion]!.holySite).toEqual({ col: seat.col, row: seat.row });
  });

  it('charges an apostle The Anchorites’ price too', () => {
    const { state, seat } = foundedRealm();
    slot(state, 0, ABBEYS);
    slot(state, 0, ANCHORITES);
    const ground = groundBeside(state, seat);
    const apostle = createUnit(state, 0, 'apostle', ground.col, ground.row);
    expect(plant(state, apostle).ok).toBe(true);
    expect(unitById(state, apostle.id)?.chargesLeft).toBe(1);
  });

  it('never lets an apostle found a religion', () => {
    const state = bareState(20, 12);
    const seat = town(state, 0, 6, 6, 4);
    slot(state, 0, ABBEYS);
    playerById(state, 0)!.pantheon.beliefs.push('keeperOfTheHearth' as never);
    bumpRevision(state);
    expect(plantingCost(state, 0)).toBe('foundReligion');
    const ground = groundBeside(state, seat);
    const apostle = createUnit(state, 0, 'apostle', ground.col, ground.row);
    expect(plantHolySiteError(state, 0, apostle.id)).toBe(
      'An apostle can raise a holy site only for a religion you have founded',
    );
    expect(plant(state, apostle).ok).toBe(false);
    expect(state.religions).toHaveLength(0);
  });

  it('tells an apostle on the city centre to move, in its own word', () => {
    const { state, seat } = foundedRealm();
    slot(state, 0, ABBEYS);
    const apostle = createUnit(state, 0, 'apostle', seat.col, seat.row);
    expect(plantHolySiteError(state, 0, apostle.id)).toBe(
      'Move the apostle off the city centre to plant a holy site',
    );
  });

  it('still asks every other piece the prophet’s questions', () => {
    const { state, seat } = foundedRealm();
    slot(state, 0, ABBEYS);
    const ground = groundBeside(state, seat);
    const worker = createUnit(state, 0, 'worker', ground.col, ground.row);
    expect(plantHolySiteError(state, 0, worker.id)).toMatch(/is no prophet/);
  });
});

// --- The Interdict -----------------------------------------------------------------

describe('The Interdict', () => {
  /**
   * Seat 0 founds a religion in its own town; seat 1's town builds the
   * Magnum Opus. The rival town follows seat 0's religion when `follows` is
   * true.
   */
  function rivalOpus(follows = true): { state: GameState; home: City; rival: City } {
    const state = bareState(24, 12);
    const home = town(state, 0, 4, 6, 4);
    const rival = town(state, 1, 16, 6, 6);
    religionAt(state, home, follows ? [home, rival] : [home]);
    rival.queue = [{ kind: 'building', id: OPUS }];
    home.queue = [{ kind: 'building', id: OPUS }];
    bumpRevision(state);
    return { state, home, rival };
  }

  it('holds a rival town’s production on the Opus at nothing, in one line that names the card', () => {
    const { state, rival } = rivalOpus();
    const toward = rival.queue[0]!;
    expect(explainOpusGate(state, rival, toward)).toEqual([]);
    expect(foldCity(state, rival, [], toward).production).toBeGreaterThan(0);
    slot(state, 0, INTERDICT);
    expect(cardOpusInterdictBy(state, rival)).toMatchObject({ playerId: 0, card: INTERDICT });
    const gate = explainOpusGate(state, rival, toward);
    expect(gate).toHaveLength(1);
    expect(gate[0]).toMatchObject({ yield: 'production', card: INTERDICT });
    expect(foldCity(state, rival, [], toward).production).toBe(0);
  });

  it('leaves every other row of the queue alone', () => {
    const { state, rival } = rivalOpus();
    slot(state, 0, INTERDICT);
    const granary = { kind: 'building', id: 'granary' as BuildingId } as const;
    expect(explainOpusGate(state, rival, granary)).toEqual([]);
    expect(foldCity(state, rival, [], granary).production).toBeGreaterThan(0);
  });

  it('never stops the holder’s own town, nor a rival town that does not follow the religion', () => {
    const followed = rivalOpus();
    slot(followed.state, 0, INTERDICT);
    expect(explainOpusGate(followed.state, followed.home, followed.home.queue[0])).toEqual([]);

    const unfollowed = rivalOpus(false);
    slot(unfollowed.state, 0, INTERDICT);
    expect(cardOpusInterdictBy(unfollowed.state, unfollowed.rival)).toBeNull();
    expect(explainOpusGate(unfollowed.state, unfollowed.rival, unfollowed.rival.queue[0])).toEqual([]);
  });

  it('is asked after the siege, so a siege names the line when both hold', () => {
    const source = SOURCES['../../../src/sim/yields/town.ts']!;
    const gate = /export function explainOpusGate\([\s\S]*?\n\}/.exec(source)?.[0] ?? '';
    const siege = gate.indexOf('cardOpusSiegeBy(');
    const interdict = gate.indexOf('cardOpusInterdictBy(');
    expect(siege).toBeGreaterThan(0);
    expect(interdict).toBeGreaterThan(siege);
  });
});

// --- The Caliphate -------------------------------------------------------------------

describe('The Caliphate', () => {
  /** What one town costs seat 0's writ, as a positive figure. */
  function townWrit(state: GameState, city: City): number {
    const line = explainAuthority(state, 0).find(
      (entry) => entry.part === 'cost' && entry.source.startsWith(city.name),
    );
    if (!line) throw new Error(`no writ line for ${city.name}`);
    return 0 - line.value;
  }

  it('makes devout towns cost no authority, and a town that does not follow pays in full', () => {
    const state = bareState(40, 10);
    const towns = [3, 9, 15, 21, 27].map((col) => town(state, 0, col, 5, 4));
    const devout = towns.slice(0, 4);
    const other = towns[4]!;
    religionAt(state, towns[0]!, devout);
    const before = towns.map((city) => townWrit(state, city));
    expect(before.some((was) => was > 0)).toBe(true);
    slot(state, 0, CALIPHATE);
    for (const city of devout) expect(townWrit(state, city), city.name).toBe(0);
    expect(townWrit(state, other)).toBe(before[4]);
  });
});

// --- the seams, pinned by source -----------------------------------------------------

const SOURCES = import.meta.glob(['../../../src/sim/**/*.ts', '../../../src/ui/*.ts', '../../../src/ai/*.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** A file's code with its comments taken out. */
function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

describe('the seams of the price', () => {
  it('asks every price of the empire', () => {
    // A call that names only the act would read the book and miss the card.
    for (const [path, text] of Object.entries(SOURCES)) {
      const body = code(text);
      expect(body, path).not.toMatch(/chargeCostOf\(\s*'/);
      expect(body, path).not.toMatch(/chargeCostWords\(\s*'/);
    }
  });

  it('reads a card’s price in chargeCostOf alone', () => {
    const readers = Object.entries(SOURCES)
      .filter(([, text]) => code(text).includes('cardChargePrice('))
      .map(([path]) => path.replace('../../../src/', ''))
      .sort();
    // The declaration, and its one reader.
    expect(readers).toEqual(['sim/religion.ts', 'sim/statecraft/evaluator.ts']);
    const religion = code(SOURCES['../../../src/sim/religion.ts']!);
    expect(religion.split('cardChargePrice(')).toHaveLength(2);
    const reader = /export function chargeCostOf\([\s\S]*?\n\}/.exec(religion)?.[0] ?? '';
    expect(reader).toContain('cardChargePrice(state, playerId, verb)');
  });
});
