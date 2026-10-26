/**
 * **The hand** (batch MG6 of `docs/plans/magisterial-themes-triage.md`).
 *
 * Batch MG6 builds three cards that change an Order hand, and the three shapes
 * under them:
 *
 *   · a rule that refuses the reroll of an Order hand (`noOrderReroll`),
 *     asked in `rerollError` for an Order hand only. A Doctrine hand, a
 *     great-person hand and a belief hand may still be rerolled (the triage's
 *     reading 13). Card: Officials by Merit, whose other half is two more
 *     cards in each Order hand;
 *   · `count`, `per` and `max` on an `offerRider`, read in
 *     `explainOfferSize` through `countOf` and `helpings`, as a counted route
 *     rider is read. The cap on a hand still holds (reading 13). Card: The
 *     Hall of Wonders, one more card for every two wonders held, at most two
 *     more;
 *   · the `greatPerson` arm of `CompletionGrant` on `OrderDef.onDraft`, paid
 *     by `raiseOnDraft` through `grantGreatPersonOffer`: an offer when the
 *     seat may call great people and none waits, and otherwise the renown
 *     still needed for the next one (reading 15). Card: The Wandering Muse.
 *
 * The offer fold's own register is in `test/sim/offers.test.ts`, and the
 * reroll's in `test/sim/reroll.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { BUILDING_IDS, type BuildingId, buildingDef, isWonder } from '../../../src/sim/buildingData';
import { foundCityAt, refreshCityDerived } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { snapshotState } from '../../../src/sim/game';
import { drawGreatPersonOffer } from '../../../src/sim/greatPeople';
import { rerollError } from '../../../src/sim/religion';
import { RELIGION } from '../../../src/sim/religionData';
import { renownThreshold } from '../../../src/sim/renown';
import { RULES } from '../../../src/sim/rulesData';
import { type City, type GameState, bumpRevision, playerById } from '../../../src/sim/state';
import {
  describeCard,
  drawOrderOffer,
  explainOfferSize,
  offerSize,
  stripRefs,
} from '../../../src/sim/statecraft';
import { openFreeDraft } from '../../../src/sim/statecraft/draft';
import {
  type OrderId,
  DOCTRINE_IDS,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import { ABILITY_TECH, type TechId } from '../../../src/sim/techData';
import { at, bareState } from '../improvementHelpers';
import { createGame } from '../newGameHelpers';
import { found } from '../statecraftHelpers';

const MUSE = 'theWanderingMuse' as OrderId;
const OFFICIALS = 'officialsByMerit' as OrderId;
const HALL = 'theHallOfWonders' as OrderId;
const SECOND_READING = 'theSecondReading' as OrderId;

/** The three rows batch MG6 dealt, with the tier, rarity and type the sheet gives each. */
const MG6_ROWS: readonly [OrderId, number, string, string][] = [
  [MUSE, 1, 'uncommon', 'civic'],
  [OFFICIALS, 3, 'rare', 'wildcard'],
  [HALL, 4, 'rare', 'wildcard'],
];

/**
 * World wonders whose own effects leave the size of a hand alone, so a test
 * that stands them in a town reads The Hall of Wonders and nothing else. The
 * Oracle widens an Order hand by itself, so it is left out.
 */
const PLAIN_WONDERS: readonly BuildingId[] = BUILDING_IDS.filter(
  (id) =>
    isWonder(id) &&
    buildingDef(id).endsTheGame !== true &&
    !(buildingDef(id).effects ?? []).some((effect) => effect.kind === 'offerRider'),
);

/** Puts a card in a chair for seat 0, the way the reading sees it. */
function slot(state: GameState, id: OrderId): void {
  const sc = playerById(state, 0)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** One town of three citizens for seat 0, with an empty queue. The first is the capital. */
function town(state: GameState, col: number, row: number): City {
  const city = foundCityAt(state, 0, at(state, col, row));
  city.population = 3;
  city.largestSize = 3;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

/** Stands `count` plain wonders in this town. */
function raiseWonders(state: GameState, city: City, count: number): void {
  expect(PLAIN_WONDERS.length).toBeGreaterThanOrEqual(count);
  for (const id of PLAIN_WONDERS.slice(0, count)) {
    if (!city.buildings.includes(id)) city.buildings.push(id);
  }
  bumpRevision(state);
}

/** Lays an Order hand in front of seat 0: `price` culture paid for it, or none for a free hand. */
function offer(state: GameState, price: number | undefined, ...ids: string[]): void {
  const sc = playerById(state, 0)!.statecraft;
  sc.pendingOrder = price === undefined ? { options: ids as OrderId[] } : { options: ids as OrderId[], price };
  bumpRevision(state);
}

/** Seat 0 picks the first card of the hand, through the reducer. */
function pick(state: GameState): void {
  expect(applyCommand(state, { type: 'chooseOrder', playerId: 0, optionIndex: 0 }).ok).toBe(true);
}

/** Gives seat 0 a technology, or takes it away. */
function know(state: GameState, tech: TechId | undefined, held: boolean): void {
  expect(tech).toBeDefined();
  const player = playerById(state, 0)!;
  player.techsResearched = player.techsResearched.filter((id) => id !== tech);
  if (held) player.techsResearched.push(tech!);
  bumpRevision(state);
}

/** The technology that lets a seat call great people. */
const RITES = ABILITY_TECH.get('ancestorRites');
/** The technology that opens the reroll's door. */
const DOOR = ABILITY_TECH.get(RELIGION.reroll.ability);

/** A board with a capital for seat 0, the reroll's door open and faith in the bank. */
function board(): { state: GameState; capital: City } {
  const state = bareState(20, 10);
  const capital = town(state, 3, 5);
  know(state, DOOR, true);
  const player = playerById(state, 0)!;
  player.faithPool = 5_000;
  player.culturePool = 0;
  bumpRevision(state);
  return { state, capital };
}

// --- the rows ------------------------------------------------------------------

describe('Magisterial batch MG6: the rows', () => {
  it('deals all three from the tier, rarity and type the sheet names', () => {
    const pool = ordersForDecks(['magisterial']);
    for (const [id, band, rarity, type] of MG6_ROWS) {
      const def = orderDef(id);
      expect(orderIsDealt(id), id).toBe(true);
      expect(pool, id).toContain(id);
      expect(def.decks, id).toEqual(['magisterial']);
      expect(def.band, id).toBe(band);
      expect(def.rarity, id).toBe(rarity);
      expect(def.type, id).toBe(type);
      expect(def.deferred, id).toBeUndefined();
    }
  });

  it('carries the shapes the triage names', () => {
    expect(orderDef(MUSE).text).toBe('On draft: gain a free great-person draft. Seated, this card does nothing.');
    expect(orderDef(MUSE).onDraft).toEqual([{ grant: 'greatPerson' }]);
    expect(orderDef(MUSE).effects).toEqual([]);
    expect(orderDef(OFFICIALS).text).toBe('Order hands deal two extra cards. You cannot reroll Order hands.');
    expect(orderDef(OFFICIALS).effects).toEqual([
      { kind: 'offerRider', offer: 'order', extra: 2 },
      { kind: 'rule', rule: 'noOrderReroll' },
    ]);
    expect(orderDef(HALL).text).toBe(
      'Order hands deal one more card for every two wonders you hold, at most two more.',
    );
    expect(orderDef(HALL).effects).toEqual([
      { kind: 'offerRider', offer: 'order', extra: 1, count: 'wonders', per: 2, max: 2 },
    ]);
  });

  it('prints each card in plain words', () => {
    const words = (id: OrderId): string[] => describeCard(id).map((clause) => stripRefs(clause.text));
    expect(words(MUSE)).toEqual(['when drafted, you gain a great person to call; seated, this card does nothing']);
    expect(words(OFFICIALS)).toEqual(['+2 cards in every Order hand', 'you cannot reroll Order hands']);
    expect(words(HALL)).toEqual(['+1 card in every Order hand per 2 wonders you hold (at most +2)']);
  });
});

// --- Officials by Merit ----------------------------------------------------------

describe('Officials by Merit (reading 13)', () => {
  it('deals two more cards in each Order hand, and only in an Order hand', () => {
    const { state } = board();
    expect(offerSize(state, 0, 'order')).toBe(3);
    slot(state, OFFICIALS);
    const lines = explainOfferSize(state, 0, 'order');
    expect(lines).toHaveLength(2);
    expect(lines[1]!.delta).toBe(2);
    expect(offerSize(state, 0, 'order')).toBe(5);
    expect(offerSize(state, 0, 'doctrine')).toBe(3);
    expect(offerSize(state, 0, 'greatPerson')).toBe(3);
    expect(offerSize(state, 0, 'belief')).toBe(3);
  });

  it('refuses the reroll of an Order hand, and the refused command changes nothing', () => {
    const { state } = board();
    offer(state, 40, 'marketDay', 'firstRites', 'theMineralTrade');
    expect(rerollError(state, 0)).toBeNull();
    slot(state, OFFICIALS);
    expect(rerollError(state, 0)).toBe('Your laws forbid rerolling an Order hand');
    const before = snapshotState(state);
    const result = applyCommand(state, { type: 'rerollOffer', playerId: 0 });
    expect(result.ok).toBe(false);
    expect(snapshotState(state)).toBe(before);
  });

  it('refuses it even when the first reroll is free, and before the door is asked', () => {
    const { state } = board();
    offer(state, 40, 'marketDay', 'firstRites', 'theMineralTrade');
    slot(state, OFFICIALS);
    // The Second Reading makes the first reroll free; the Order hand is still refused.
    slot(state, SECOND_READING);
    expect(rerollError(state, 0)).toBe('Your laws forbid rerolling an Order hand');
    // With the door shut and no free reroll, the card is still the reason given.
    const sc = playerById(state, 0)!.statecraft;
    sc.slots = sc.slots.filter((seat) => seat?.card !== SECOND_READING);
    know(state, DOOR, false);
    expect(rerollError(state, 0)).toBe('Your laws forbid rerolling an Order hand');
  });

  it('leaves a Doctrine hand and a great-person hand free to be rerolled', () => {
    const { state } = board();
    const player = playerById(state, 0)!;
    slot(state, OFFICIALS);
    // A Doctrine hand on the table: the card's clause is not asked.
    player.statecraft.pendingDoctrine = { options: [DOCTRINE_IDS[0]!] };
    bumpRevision(state);
    expect(rerollError(state, 0)).toBeNull();
    delete player.statecraft.pendingDoctrine;
    // A great-person hand on the table: rerolled through the reducer.
    player.greatPersonOffer = drawGreatPersonOffer(state, player);
    bumpRevision(state);
    expect(player.greatPersonOffer.options.length).toBeGreaterThan(0);
    expect(rerollError(state, 0)).toBeNull();
    expect(applyCommand(state, { type: 'rerollOffer', playerId: 0 }).ok).toBe(true);
    expect(player.statecraft.rerollsTaken).toBe(1);
  });
});

// --- The Hall of Wonders ---------------------------------------------------------

describe('The Hall of Wonders (reading 13)', () => {
  it('deals one more card for every two wonders held, at most two more', () => {
    const { state, capital } = board();
    slot(state, HALL);
    const sizes: number[] = [];
    for (let wonders = 0; wonders <= 6; wonders++) {
      capital.buildings = capital.buildings.filter((id) => !isWonder(id));
      raiseWonders(state, capital, wonders);
      sizes.push(offerSize(state, 0, 'order'));
    }
    expect(sizes).toEqual([3, 3, 4, 4, 5, 5, 5]);
  });

  it('prints one line labelled with the helpings, and no line when the count buys none', () => {
    const { state, capital } = board();
    slot(state, HALL);
    raiseWonders(state, capital, 1);
    expect(explainOfferSize(state, 0, 'order')).toHaveLength(1);
    raiseWonders(state, capital, 5);
    const lines = explainOfferSize(state, 0, 'order');
    expect(lines).toHaveLength(2);
    expect(lines[1]!.delta).toBe(2);
    expect(lines[1]!.source).toMatch(/· ×2$/);
  });

  it('widens Order hands only', () => {
    const { state, capital } = board();
    slot(state, HALL);
    raiseWonders(state, capital, 4);
    expect(offerSize(state, 0, 'order')).toBe(5);
    expect(offerSize(state, 0, 'doctrine')).toBe(3);
    expect(offerSize(state, 0, 'greatPerson')).toBe(3);
    expect(offerSize(state, 0, 'belief')).toBe(3);
    expect(offerSize(state, 0, 'discovery')).toBe(3);
  });

  it('counts a wonder standing in a town you took from another empire', () => {
    const { state } = board();
    slot(state, HALL);
    // A town seat 1 founded and claimed two wonders in, now held by seat 0.
    const taken = foundCityAt(state, 1, at(state, 14, 5));
    raiseWonders(state, taken, 2);
    expect(offerSize(state, 0, 'order')).toBe(3);
    taken.ownerId = 0;
    bumpRevision(state);
    expect(offerSize(state, 0, 'order')).toBe(4);
  });

  it('keeps a hand to the cap of five beside Officials by Merit, and says it trimmed the hand', () => {
    const { state, capital } = board();
    slot(state, HALL);
    slot(state, OFFICIALS);
    raiseWonders(state, capital, 4);
    const lines = explainOfferSize(state, 0, 'order');
    expect(lines.map((line) => line.delta)).toEqual([3, 2, 2, RULES.offers.max - 7]);
    expect(lines[3]!.source).toContain(String(RULES.offers.max));
    expect(offerSize(state, 0, 'order')).toBe(RULES.offers.max);
  });

  it('deals the wider hand when the hand is drawn', () => {
    const g = createGame({
      seed: 11,
      sizeName: 'duel',
      players: [
        { name: 'Hypatia', color: '#d4502e', isHuman: true, leader: 'hypatiaOfAlexandria' },
        { name: 'Bors', color: '#3a7fe8', leader: 'pachacuti' },
      ],
    });
    const city = found(g.state, 0);
    slot(g.state, HALL);
    raiseWonders(g.state, city, 2);
    const seat = playerById(g.state, 0)!;
    expect(offerSize(g.state, 0, 'order')).toBe(4);
    expect(drawOrderOffer(g.state, seat).options).toHaveLength(4);
  });
});

// --- The Wandering Muse ----------------------------------------------------------

describe('The Wandering Muse (reading 15)', () => {
  it('deals a great-person offer when it is drafted', () => {
    const { state } = board();
    know(state, RITES, true);
    const player = playerById(state, 0)!;
    expect(player.greatPersonOffer).toBeUndefined();
    offer(state, 30, MUSE, 'marketDay', 'firstRites');
    pick(state);
    expect(player.statecraft.orders).toContain(MUSE);
    expect(player.greatPersonOffer).toBeDefined();
    expect(player.greatPersonOffer!.options.length).toBeGreaterThan(0);
  });

  it('pays a card picked from a free hand, and needs no capital', () => {
    const state = bareState(20, 10);
    know(state, RITES, true);
    const player = playerById(state, 0)!;
    expect(state.cities.some((city) => city.ownerId === 0)).toBe(false);
    offer(state, undefined, MUSE, 'marketDay', 'firstRites');
    pick(state);
    expect(player.greatPersonOffer).toBeDefined();
  });

  it('pays the renown still needed for the next great person while one is waiting', () => {
    const { state } = board();
    know(state, RITES, true);
    const player = playerById(state, 0)!;
    player.greatPersonOffer = drawGreatPersonOffer(state, player);
    player.renownPool = 10;
    bumpRevision(state);
    const waiting = JSON.stringify(player.greatPersonOffer);
    const threshold = renownThreshold(state, player);
    expect(threshold).toBeGreaterThan(10);
    offer(state, 30, MUSE, 'marketDay', 'firstRites');
    pick(state);
    // The waiting hand is kept as it was, and the pool reaches the next rung.
    expect(JSON.stringify(player.greatPersonOffer)).toBe(waiting);
    expect(player.renownPool).toBe(threshold);
  });

  it('pays the renown still needed when the seat cannot call great people yet', () => {
    const { state } = board();
    know(state, RITES, false);
    const player = playerById(state, 0)!;
    player.renownPool = 0;
    bumpRevision(state);
    const threshold = renownThreshold(state, player);
    offer(state, 30, MUSE, 'marketDay', 'firstRites');
    pick(state);
    expect(player.greatPersonOffer).toBeUndefined();
    expect(player.renownPool).toBe(threshold);
  });

  it('does nothing seated, and nothing when another card is drafted', () => {
    const { state } = board();
    know(state, RITES, true);
    const player = playerById(state, 0)!;
    slot(state, MUSE);
    offer(state, 30, 'marketDay', 'firstRites', 'theMineralTrade');
    const renown = player.renownEarned;
    pick(state);
    expect(player.greatPersonOffer).toBeUndefined();
    expect(player.renownEarned).toBe(renown);
    // A free hand dealt by the game moves nothing for it either.
    expect(openFreeDraft(state, player)).toBe(true);
    expect(player.greatPersonOffer).toBeUndefined();
  });
});

// --- the seams, pinned by source ---------------------------------------------------

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

/** The files whose code holds `needle`, by path under `src/`. */
function filesWith(needle: string): string[] {
  return Object.entries(SOURCES)
    .filter(([, text]) => code(text).includes(needle))
    .map(([path]) => path.replace('../../../src/', ''))
    .sort();
}

describe('the seams of the hand', () => {
  it('reads the reroll refusal in rerollError, for an Order hand only', () => {
    // Named by its declaration, its one reader and the bots' price arm. The
    // words table keys it without quotes.
    expect(filesWith("'noOrderReroll'")).toEqual(['ai/value.ts', 'sim/religion.ts', 'sim/statecraftData.ts']);
    expect(code(SOURCES['../../../src/sim/statecraft/describers.ts']!)).toContain('noOrderReroll:');
    const religion = code(SOURCES['../../../src/sim/religion.ts']!);
    expect(religion.split("'noOrderReroll'")).toHaveLength(2);
    const gate = /export function rerollError\([\s\S]*?\n\}/.exec(religion)?.[0] ?? '';
    expect(gate).toContain("kind === 'order' && cardActionRule(state, playerId, 'noOrderReroll')");
  });

  it('pays a great person on the draft through the one routine a rider uses', () => {
    const cities = code(SOURCES['../../../src/sim/cities.ts']!);
    const raise = /export function raiseOnDraft\([\s\S]*?\n\}/.exec(cities)?.[0] ?? '';
    expect(raise).toContain("grantGreatPersonOffer(state, player, grant.family ?? 'any')");
  });
});
