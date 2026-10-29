/**
 * **Batch R3: the Scientific cards of the user's review**
 * (`docs/plans/scientific-review-2026-10-28.md`).
 *
 * The user left six comments on the Scientific sheet on 2026-10-28. This
 * file checks what the batch built from them:
 *
 *   · three cards moved from Tier 0 to Tier I, and The Prize Essay retired;
 *   · The Kept Secret and its new empire condition, `knowsUniqueTech`: the
 *     capital's food and culture shares hold while the empire knows a
 *     technology no other empire knows, charter technologies left out, and
 *     the bots read the same condition;
 *   · The Curators of Works: a town line counted by the public works in the
 *     town. Its science sits in each public work's package (batch R2b's rule,
 *     extended to the public-work marker), so a doubler on a Granary reaches
 *     it. Its happiness pays the town;
 *   · The Mountain Observatories, shared with Expansionist: a town line under
 *     the `terrainInBorders` scope for mountains, which stacks with The
 *     Mountain Schools;
 *   · the words each new row prints in the hand.
 *
 * `scientific.test.ts` and `expansionist.test.ts` check the rows against the
 * sheets of record.
 *
 * Core, not slow: it reads the tables and plays a few verbs on small boards.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { valueContext } from '../../../src/ai/bot';
import { scoreEffects } from '../../../src/ai/value';
import { isPublicWork } from '../../../src/sim/buildingData';
import { foundCityAt, ownedTiles, refreshCityDerived } from '../../../src/sim/cities';
import { type City, type GameState, bumpRevision, playerById } from '../../../src/sim/state';
import {
  type CardEffect,
  type OrderId,
  DECK_FILE_ORDERS,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import {
  cardHappiness,
  describeCard,
  explainBuildingPackage,
  explainCardCityYields,
  explainCardPercentYields,
  foldBuildingPackage,
  knowsUniqueTech,
  stripRefs,
} from '../../../src/sim/statecraft';
import { CHARTER_TECH_IDS, TECH_IDS, type TechId, isCharterTech } from '../../../src/sim/techData';
import { explainCardBuildingYields, explainCity } from '../../../src/sim/yields/town';
import { at, bareState } from '../improvementHelpers';

/** Effects swapped onto a row for one test, put back after it. */
const restores: (() => void)[] = [];

afterEach(() => {
  while (restores.length > 0) restores.pop()!();
});

/** Puts a card in a chair for this seat. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Puts a real Order in a chair, wearing effects of the test's choosing. */
function seatWearing(state: GameState, id: OrderId, effects: CardEffect[]): void {
  const def = orderDef(id) as { effects: CardEffect[] };
  const held = def.effects;
  def.effects = effects;
  restores.push(() => {
    def.effects = held;
  });
  slot(state, 0, id);
}

/** One town of the given size for a seat, with an empty queue. */
function town(state: GameState, owner: number, col: number, row: number, population: number): City {
  const city = foundCityAt(state, owner, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/** Gives the town buildings straight off the shelf. */
function raise(state: GameState, city: City, ...ids: string[]): void {
  for (const id of ids) if (!city.buildings.includes(id as never)) city.buildings.push(id as never);
  refreshCityDerived(state, city);
  bumpRevision(state);
}

/** What one card's town lines pay this town, in one voice. */
function townPays(state: GameState, city: City, card: string, voice: 'science' | 'culture' | 'food'): number {
  return explainCardCityYields(state, city)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line[voice], 0);
}

/** The percentage one card puts on this town's voice. */
function share(state: GameState, city: City, card: string, voice: 'food' | 'culture' | 'science'): number {
  return explainCardPercentYields(state, city)
    .filter((line) => line.card === card && line.yield === voice)
    .reduce((sum, line) => sum + line.percent, 0);
}

/** The happiness one card pays this empire. */
function happiness(state: GameState, playerId: number, card: string): number {
  return cardHappiness(state, playerId)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line.amount, 0);
}

/** The printed words of a card, marks stripped. */
function words(id: string): string[] {
  return describeCard(id as never).map((clause) => stripRefs(clause.text));
}

/** The hexes a town owns, its own centre left out. */
function ring(state: GameState, city: City) {
  return ownedTiles(state, city).filter((tile) => !(tile.col === city.col && tile.row === city.row));
}

describe('the moves and the retirement', () => {
  it('moves three cards from Tier 0 to Tier I, keeping their text, rarity and type', () => {
    const moved: [string, string, string][] = [
      ['scientificTheScribesHall', 'common', 'civic'],
      ['theLongStudy', 'uncommon', 'civic'],
      ['theSkyWatchers', 'common', 'civic'],
    ];
    for (const [id, rarity, type] of moved) {
      const def = orderDef(id as OrderId);
      expect(def.band, id).toBe(1);
      expect(def.rarity, id).toBe(rarity);
      expect(def.type, id).toBe(type);
      expect(orderIsDealt(id as OrderId), id).toBe(true);
      expect(ordersForDecks(['scientific']), id).toContain(id);
    }
  });

  it('retires The Prize Essay, with no type, dealt to nobody, its effects kept for saves', () => {
    const id = 'thePrizeEssay' as OrderId;
    const def = orderDef(id);
    expect(DECK_FILE_ORDERS.scientific).toContain(id);
    expect(def.retired).toBe(true);
    expect(def.type).toBeUndefined();
    expect(orderIsDealt(id)).toBe(false);
    expect(ordersForDecks(['scientific'])).not.toContain(id);
    expect(def.effects.length).toBeGreaterThan(0);
  });
});

describe('the three new cards', () => {
  it('are rows at Tier 0 with the rarity and type the spec gives', () => {
    const rows: [string, readonly string[], string, string][] = [
      ['theKeptSecret', ['scientific'], 'uncommon', 'civic'],
      ['theCuratorsOfWorks', ['scientific'], 'common', 'civic'],
      ['theMountainObservatories', ['expansionist', 'scientific'], 'common', 'civic'],
    ];
    for (const [id, decks, rarity, type] of rows) {
      const def = orderDef(id as OrderId);
      expect(def.decks, id).toEqual(decks);
      expect([def.band, def.rarity, def.type], id).toEqual([0, rarity, type]);
      expect(orderIsDealt(id as OrderId), id).toBe(true);
      expect(def.flavor, id).toBeTruthy();
      for (const deck of decks) expect(ordersForDecks([deck as never]), `${id} in ${deck}`).toContain(id);
    }
    expect(DECK_FILE_ORDERS.scientific).toContain('theKeptSecret');
    expect(DECK_FILE_ORDERS.scientific).toContain('theCuratorsOfWorks');
    expect(DECK_FILE_ORDERS.common).toContain('theMountainObservatories');
  });

  it('print what they do in the hand', () => {
    expect(words('theKeptSecret')).toEqual([
      'while you know a technology no other empire knows (charter technologies do not count): ' +
        '+20% food in your capital; +20% culture in your capital',
    ]);
    expect(words('theCuratorsOfWorks')).toEqual([
      '+1 science in every city per public work standing there',
      '+1 happiness in every city per public work standing there',
    ]);
    expect(words('theMountainObservatories')).toEqual([
      '+3 science in every city with a mountain hex inside its borders',
    ]);
  });
});

// --- The Kept Secret ---------------------------------------------------------

/**
 * A two-seat bench where both seats know the same ordinary technologies, so
 * neither knows one the other does not. `bareState` hands both seats one list.
 */
function secretBench(): { state: GameState; capital: City; second: City; secret: TechId } {
  const state = bareState(24, 10);
  const capital = town(state, 0, 4, 5, 4);
  const second = town(state, 0, 12, 5, 4);
  town(state, 1, 20, 5, 4);
  const ada = playerById(state, 0)!;
  const bors = playerById(state, 1)!;
  bors.techsResearched = [...ada.techsResearched];
  // An ordinary technology both seats know: the one Ada keeps to herself.
  const secret = ada.techsResearched.find((id) => !isCharterTech(id as TechId)) as TechId;
  bumpRevision(state);
  return { state, capital, second, secret };
}

describe('The Kept Secret', () => {
  it('pays the capital +20% food and +20% culture while you know a technology no other empire knows', () => {
    const { state, capital, second, secret } = secretBench();
    slot(state, 0, 'theKeptSecret');
    // Both seats know the same technologies: no secret, no share.
    expect(knowsUniqueTech(state, 0)).toBe(false);
    expect(share(state, capital, 'theKeptSecret', 'food')).toBe(0);
    // The rival forgets one: Ada now knows a technology Bors does not.
    const bors = playerById(state, 1)!;
    bors.techsResearched = bors.techsResearched.filter((id) => id !== secret);
    bumpRevision(state);
    expect(knowsUniqueTech(state, 0)).toBe(true);
    expect(share(state, capital, 'theKeptSecret', 'food')).toBe(20);
    expect(share(state, capital, 'theKeptSecret', 'culture')).toBe(20);
    // The capital's percentages, at the city stage like the deck's others.
    const lines = explainCardPercentYields(state, capital).filter((line) => line.card === 'theKeptSecret');
    expect(lines.map((line) => line.stage)).toEqual(['city', 'city']);
    // Only the capital.
    expect(share(state, second, 'theKeptSecret', 'food')).toBe(0);
    expect(share(state, second, 'theKeptSecret', 'culture')).toBe(0);
    // The rival learns it: the secret is out, and the shares stop.
    bors.techsResearched.push(secret);
    bumpRevision(state);
    expect(knowsUniqueTech(state, 0)).toBe(false);
    expect(share(state, capital, 'theKeptSecret', 'food')).toBe(0);
    expect(share(state, capital, 'theKeptSecret', 'culture')).toBe(0);
  });

  it('never counts a charter technology', () => {
    const { state, capital } = secretBench();
    slot(state, 0, 'theKeptSecret');
    const ada = playerById(state, 0)!;
    const charter = CHARTER_TECH_IDS[0]!;
    ada.charteredTechs.push(charter);
    ada.techsResearched.push(charter);
    bumpRevision(state);
    // Ada alone knows the charter technology, and it does not count.
    expect(playerById(state, 1)!.techsResearched).not.toContain(charter);
    expect(knowsUniqueTech(state, 0)).toBe(false);
    expect(share(state, capital, 'theKeptSecret', 'food')).toBe(0);
  });

  it('counts every other empire, met or not, and never the barbarian seat', () => {
    const state = bareState(24, 10, true);
    const capital = town(state, 0, 4, 5, 4);
    town(state, 1, 20, 5, 4);
    slot(state, 0, 'theKeptSecret');
    const ada = playerById(state, 0)!;
    const bors = playerById(state, 1)!;
    const wild = state.players.find((player) => player.barbarian === true)!;
    expect(wild).toBeDefined();
    // Ada has met nobody, and the rule still compares her with Bors.
    ada.metSeats = [];
    const secret = TECH_IDS.find((id) => !isCharterTech(id) && !ada.techsResearched.includes(id))!;
    ada.techsResearched.push(secret);
    bors.techsResearched = bors.techsResearched.filter((id) => id !== secret);
    bumpRevision(state);
    expect(knowsUniqueTech(state, 0)).toBe(true);
    // The wild knowing it changes nothing: it is not an empire.
    wild.techsResearched.push(secret);
    bumpRevision(state);
    expect(knowsUniqueTech(state, 0)).toBe(true);
    expect(share(state, capital, 'theKeptSecret', 'culture')).toBe(20);
    // An empire Ada has never met knowing it ends the secret.
    bors.techsResearched.push(secret);
    bumpRevision(state);
    expect(knowsUniqueTech(state, 0)).toBe(false);
  });

  it('is priced by the bots only while the condition holds', () => {
    const { state, secret } = secretBench();
    const effects = orderDef('theKeptSecret' as OrderId).effects;
    const ada = playerById(state, 0)!;
    expect(scoreEffects(effects, valueContext(state, ada))).toBe(0);
    const bors = playerById(state, 1)!;
    bors.techsResearched = bors.techsResearched.filter((id) => id !== secret);
    bumpRevision(state);
    expect(scoreEffects(effects, valueContext(state, ada))).toBeGreaterThan(0);
  });
});

// --- The Curators of Works ---------------------------------------------------

describe('The Curators of Works', () => {
  it('pays each town +1 science for each public work in it, and the empire +1 happiness for each', () => {
    const state = bareState(20, 10);
    const works = town(state, 0, 4, 5, 4);
    const bare = town(state, 0, 12, 5, 4);
    slot(state, 0, 'theCuratorsOfWorks');
    expect(townPays(state, works, 'theCuratorsOfWorks', 'science')).toBe(0);
    expect(happiness(state, 0, 'theCuratorsOfWorks')).toBe(0);
    // The Granary is a public work (the user's question), and so is the Aqueduct.
    expect(isPublicWork('granary')).toBe(true);
    expect(isPublicWork('aqueduct')).toBe(true);
    raise(state, works, 'granary', 'aqueduct');
    expect(townPays(state, works, 'theCuratorsOfWorks', 'science')).toBe(2);
    expect(happiness(state, 0, 'theCuratorsOfWorks')).toBe(2);
    // A building that is not a public work counts for nothing.
    expect(isPublicWork('library')).toBe(false);
    raise(state, works, 'library');
    expect(townPays(state, works, 'theCuratorsOfWorks', 'science')).toBe(2);
    // Another town's public works pay that town, and the happiness adds up.
    raise(state, bare, 'granary');
    expect(townPays(state, bare, 'theCuratorsOfWorks', 'science')).toBe(1);
    expect(townPays(state, works, 'theCuratorsOfWorks', 'science')).toBe(2);
    expect(happiness(state, 0, 'theCuratorsOfWorks')).toBe(3);
  });

  it('puts one science on each public work’s package, and none on another building', () => {
    const state = bareState(20, 10);
    const city = town(state, 0, 4, 5, 4);
    raise(state, city, 'granary', 'aqueduct', 'library');
    slot(state, 0, 'theCuratorsOfWorks');
    const onIt = (id: string) =>
      foldBuildingPackage(
        explainBuildingPackage(state, city, id as never).filter((line) => line.card === 'theCuratorsOfWorks'),
      );
    expect(onIt('granary').science).toBe(1);
    expect(onIt('aqueduct').science).toBe(1);
    expect(onIt('library').science).toBe(0);
    // Happiness is a meter, not a yield: it pays the town and is on no building.
    for (const id of ['granary', 'aqueduct']) {
      const line = onIt(id);
      expect(line.food + line.production + line.gold + line.culture + line.faith, id).toBe(0);
    }
  });

  it('lets a doubler on a Granary reach its science', () => {
    const state = bareState(20, 10);
    const city = town(state, 0, 4, 5, 4);
    raise(state, city, 'granary');
    slot(state, 0, 'theCuratorsOfWorks');
    const before = explainCity(state, city).flats.science;
    // A real Order wearing "double the yields of Granaries" for this test.
    const doubler = 'scientificTheAlmanac' as OrderId;
    seatWearing(state, doubler, [{ kind: 'buildingYieldPercent', building: 'granary', percent: 100 }]);
    const doubled = explainCardBuildingYields(state, city).find((line) => line.card === doubler)!;
    expect(doubled).toBeDefined();
    // The Granary's share takes the curators' science with its own row.
    expect(doubled.science).toBe(1);
    expect(explainCity(state, city).flats.science - before).toBe(1);
  });
});

// --- The Mountain Observatories ------------------------------------------------

describe('The Mountain Observatories', () => {
  it('gives a town with a mountain in its borders +3 science, and stacks with The Mountain Schools', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5, 3);
    slot(state, 0, 'theMountainObservatories');
    expect(townPays(state, city, 'theMountainObservatories', 'science')).toBe(0);
    // A mountain beyond the borders does not count.
    at(state, 5, 1).terrain = 'mountain';
    bumpRevision(state);
    expect(townPays(state, city, 'theMountainObservatories', 'science')).toBe(0);
    const [first, second] = ring(state, city);
    first!.terrain = 'mountain';
    bumpRevision(state);
    expect(townPays(state, city, 'theMountainObservatories', 'science')).toBe(3);
    // A second mountain pays nothing more: the line is one per town.
    second!.terrain = 'mountain';
    bumpRevision(state);
    expect(townPays(state, city, 'theMountainObservatories', 'science')).toBe(3);
    // The Mountain Schools reads the same ground; the two stack (reading 2).
    slot(state, 0, 'theMountainSchools');
    expect(share(state, city, 'theMountainSchools', 'science')).toBe(15);
    expect(townPays(state, city, 'theMountainObservatories', 'science')).toBe(3);
  });
});
