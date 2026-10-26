/**
 * **The boons** (batch MG14 of `docs/plans/magisterial-themes-triage.md`).
 *
 * Batch MG14 builds two cards that pay when they are drafted and do nothing
 * seated, and the shapes under them:
 *
 *   · the `foreignCard` arm of `OrderDef.onDraft`: one card drawn from
 *     `state.rng` (`drawForeignCard`) from the live rows of the seat's current
 *     band whose decks the seat holds none of, less the cards it holds, rarity
 *     first at the table's odds with no pity. A card that belongs to no deck is
 *     left out, and an empty bag gives nothing and uses no randomness. The
 *     card enters the collection as a pick does (`addToCollection`, then
 *     `settleCardTaken`): a charter opens what it opens, its own on-draft
 *     grant is paid, and the draft moment fires for it with no hand price
 *     (the triage's reading 37). Card: The Cabinet of Curiosities;
 *   · the `windfall` arm of `OrderDef.onDraft`, composed once
 *     (`onDraftPayout`) and paid through `payWindfallGrants`, the one
 *     delivery, and a tile test on a grant's count (`GrantCount.tile`) for the
 *     great-person works in the borders. Each count is read when the card is
 *     drafted, the card itself among the Orders (reading 38). Card: The Grand
 *     Retrospective.
 *
 * The draft moment's own seams are pinned in
 * `test/sim/decks/commercePairs.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { type BuildingId, WONDER_IDS, buildingDef } from '../../../src/sim/buildingData';
import { foundCityAt, ownedTiles, refreshCityDerived } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { restoreState, snapshotState } from '../../../src/sim/game';
import { type ImprovementId } from '../../../src/sim/improvementData';
import { type Tile, raiseImprovement, tileIndex } from '../../../src/sim/map';
import { type City, type GameState, type Player, addBuilding, bumpRevision, playerById } from '../../../src/sim/state';
import {
  describeCard,
  drawForeignCard,
  drawRarityFirst,
  eligibleFor,
  foreignCardBag,
  onDraftPayout,
  stripRefs,
} from '../../../src/sim/statecraft';
import {
  type DeckId,
  type OnDraftWindfall,
  type OrderId,
  DECK_IDS,
  ORDER_IDS,
  TIER_LADDER,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import { at, bareState } from '../improvementHelpers';

const CABINET = 'theCabinetOfCuriosities' as OrderId;
const RETROSPECTIVE = 'theGrandRetrospective' as OrderId;
const PAINTER = 'theCourtPainter' as OrderId;
const REGISTER = 'theAccessionsRegister' as OrderId;
const PLANTERS = 'thePlantersCharter' as OrderId;
const KINGS_LEVY = 'theKingsLevy' as OrderId;

/** The two rows batch MG14 dealt, with the tier, rarity and type the sheet gives each. */
const MG14_ROWS: readonly [OrderId, number, string, string][] = [
  [CABINET, 3, 'rare', 'wildcard'],
  [RETROSPECTIVE, 4, 'rare', 'civic'],
];

/**
 * World wonders that pay nothing on a moment, so a test that stands them in a
 * town reads The Grand Retrospective and nothing else.
 */
const PLAIN_WONDERS: readonly BuildingId[] = WONDER_IDS.filter(
  (id) =>
    buildingDef(id).endsTheGame !== true &&
    !(buildingDef(id).effects ?? []).some((effect) => effect.kind === 'windfallRider'),
);

/** Puts a card in a chair for seat 0, the way the reading sees it. */
function slot(state: GameState, id: OrderId): void {
  const sc = playerById(state, 0)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** One town of three citizens for a seat, with an empty queue. A seat's first town is its capital. */
function town(state: GameState, col: number, row: number, seat = 0): City {
  const city = foundCityAt(state, seat, at(state, col, row));
  city.population = 3;
  city.largestSize = 3;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
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

/**
 * A board for seat 0 holding these decks, at the first draft of this band:
 * a capital with an empty queue, no research under way (so science a card
 * pays stays in the pool) and no culture banked.
 */
function board(decks: readonly DeckId[], band: number): { state: GameState; player: Player; capital: City } {
  const state = bareState(20, 10);
  const capital = town(state, 3, 5);
  const player = playerById(state, 0)!;
  player.decks = [...decks];
  player.statecraft.drafts = TIER_LADDER[band]!.drafts;
  player.researching = null;
  player.researchQueue = [];
  player.culturePool = 0;
  bumpRevision(state);
  return { state, player, capital };
}

/**
 * Holds every card of the seat's foreign bag but `keep`, so the draw can only
 * give `keep` (or nothing, without one). Holding a card can open others: a
 * card that grants a levy deals the cards that need one. So the cards are
 * held until the bag stops changing.
 */
function narrowBagTo(state: GameState, player: Player, keep?: OrderId): void {
  if (keep !== undefined) expect(foreignCardBag(state, player), `${keep} is in the bag`).toContain(keep);
  for (let round = 0; round < 10; round++) {
    const others = foreignCardBag(state, player).filter((id) => id !== keep);
    if (others.length === 0) break;
    player.statecraft.orders.push(...others);
    bumpRevision(state);
  }
  expect(foreignCardBag(state, player)).toEqual(keep === undefined ? [] : [keep]);
}

/** The cards seat 0 gained since `before`, in the order they joined. */
function gained(player: Player, before: readonly OrderId[]): OrderId[] {
  return player.statecraft.orders.filter((id) => !before.includes(id));
}

// --- the rows ------------------------------------------------------------------

describe('Magisterial batch MG14: the rows', () => {
  it('deals both from the tier, rarity and type the sheet names', () => {
    const pool = ordersForDecks(['magisterial']);
    for (const [id, band, rarity, type] of MG14_ROWS) {
      const def = orderDef(id);
      expect(orderIsDealt(id), id).toBe(true);
      expect(pool, id).toContain(id);
      expect(def.decks, id).toEqual(['magisterial']);
      expect(def.band, id).toBe(band);
      expect(def.rarity, id).toBe(rarity);
      expect(def.type, id).toBe(type);
      expect(def.deferred, id).toBeUndefined();
      expect(def.effects, id).toEqual([]);
    }
  });

  it('carries the shapes the triage names', () => {
    expect(orderDef(CABINET).text).toBe(
      'On draft: add a random card of your tier from a deck you do not hold to your collection. Seated, this card does nothing.',
    );
    expect(orderDef(CABINET).onDraft).toEqual([{ grant: 'foreignCard' }]);
    expect(orderDef(RETROSPECTIVE).text).toBe(
      'On draft: your capital gains 20 culture, 20 science and 20 production for each wonder, great-person work and Order you hold. Seated, this card does nothing.',
    );
    // Nine grants: three yields for each of three counts. Production goes to
    // the capital; culture and science are banked.
    const counts = [
      { count: 'wonders' },
      { count: 'tilesInBorders', tile: { test: 'greatWork' } },
      { count: 'ordersHeld' },
    ];
    const expected = counts.flatMap((perCount) =>
      (['culture', 'science', 'production'] as const).map((voice) => ({
        grant: 'windfall',
        yield: voice,
        amount: 20,
        perCount,
        ...(voice === 'production' ? { toCapital: true } : {}),
      })),
    );
    expect(orderDef(RETROSPECTIVE).onDraft).toEqual(expected);
  });

  it('prints each card in plain words', () => {
    const words = (id: OrderId): string[] => describeCard(id).map((clause) => stripRefs(clause.text));
    expect(words(CABINET)).toEqual([
      'when drafted, a random Order of your tier from a deck you do not hold joins your collection; seated, this card does nothing',
    ]);
    expect(words(RETROSPECTIVE)).toEqual([
      "when drafted, +20 culture, +20 science and +20 production in your capital for each wonder you hold, each hex carrying a great person's work in your borders and each Order you hold, seated or not; seated, this card does nothing",
    ]);
  });
});

// --- The Cabinet of Curiosities ---------------------------------------------------

describe('The Cabinet of Curiosities (reading 37)', () => {
  it('draws from the live rows of your tier in the decks you do not hold', () => {
    for (const band of [1, 3]) {
      const { state, player } = board(['magisterial', 'commerce'], band);
      const bag = foreignCardBag(state, player);
      expect(bag.length, `band ${band}`).toBeGreaterThan(1);
      // The same rows a seat holding every deck would be dealt now, less the
      // rows of a deck this seat holds and the rows of no deck, in file order.
      const everyDeck = { ...player, decks: [...DECK_IDS] };
      const dealtNow = eligibleFor(state, everyDeck);
      const expected = ORDER_IDS.filter((id) => {
        const home = orderDef(id).decks;
        return (
          dealtNow.includes(id) &&
          home.length > 0 &&
          !home.some((deck) => player.decks.includes(deck))
        );
      });
      expect(bag, `band ${band}`).toEqual(expected);
      for (const id of bag) {
        expect(orderDef(id).band, id).toBeLessThanOrEqual(band);
        expect(orderDef(id).decks.some((deck) => deck === 'magisterial' || deck === 'commerce'), id).toBe(false);
      }
    }
  });

  it('takes a card two decks share only when the seat holds neither deck', () => {
    const { state, player } = board(['magisterial', 'commerce'], 1);
    const bag = foreignCardBag(state, player);
    // Devotion and Scientific: neither is held.
    expect(bag).toContain('theSchoolmensCharter');
    // Dominion and Magisterial: one is held.
    expect(bag).not.toContain('theSwordOfState');
    // A card that belongs to no deck is never in the bag.
    expect(bag.every((id) => orderDef(id).decks.length > 0)).toBe(true);
  });

  it('leaves out a card the seat already holds', () => {
    const { state, player } = board(['magisterial', 'commerce'], 1);
    const [first] = foreignCardBag(state, player);
    expect(first).toBeDefined();
    player.statecraft.orders.push(first!);
    expect(foreignCardBag(state, player)).not.toContain(first);
  });

  it('adds one card from that bag to the collection when drafted', () => {
    const { state, player } = board(['magisterial', 'commerce'], 3);
    const bag = foreignCardBag(state, player);
    const before = [...player.statecraft.orders];
    offer(state, 40, CABINET, 'marketDay', 'theMineralTrade');
    pick(state);
    const added = gained(player, before);
    expect(added).toHaveLength(2);
    expect(added[0]).toBe(CABINET);
    expect(bag).toContain(added[1]);
    // The granted card lands in the collection, never in a chair.
    expect(player.statecraft.slots.some((seat) => seat?.card === added[1])).toBe(false);
  });

  it('gives the same card for the same state and command', () => {
    const { state, player } = board(['magisterial', 'commerce'], 3);
    expect(foreignCardBag(state, player).length).toBeGreaterThan(1);
    offer(state, 40, CABINET, 'marketDay', 'theMineralTrade');
    const saved = snapshotState(state);
    const runs = [restoreState(saved), restoreState(saved)].map((copy) => {
      const seat = playerById(copy, 0)!;
      const before = [...seat.statecraft.orders];
      pick(copy);
      return { added: gained(seat, before), after: snapshotState(copy) };
    });
    expect(runs[0]!.added).toHaveLength(2);
    expect(runs[1]!.added).toEqual(runs[0]!.added);
    expect(runs[1]!.after).toBe(runs[0]!.after);
  });

  it('draws rarity first at the table odds, with no pity, in one roll', () => {
    const { state } = board(['magisterial', 'commerce'], 3);
    const saved = snapshotState(state);
    // The pity a run of passes would give a hand is not read.
    const withPity = restoreState(saved);
    playerById(withPity, 0)!.statecraft.orderSkips = 4;
    const plain = restoreState(saved);
    const drawn = drawForeignCard(withPity, playerById(withPity, 0)!);
    const expected = drawRarityFirst(plain, foreignCardBag(plain, playerById(plain, 0)!), 0);
    expect(drawn).toBeDefined();
    expect(drawn).toBe(expected);
    expect(JSON.stringify(withPity.rng)).toBe(JSON.stringify(plain.rng));
    expect(JSON.stringify(withPity.rng)).not.toBe(JSON.stringify(state.rng));
  });

  it('gives nothing and uses no randomness when the bag is empty', () => {
    // A seat that holds every deck has no foreign deck at all.
    const every = board([...DECK_IDS], 3);
    expect(foreignCardBag(every.state, every.player)).toEqual([]);
    let rng = JSON.stringify(every.state.rng);
    expect(drawForeignCard(every.state, every.player)).toBeUndefined();
    expect(JSON.stringify(every.state.rng)).toBe(rng);
    offer(every.state, 40, CABINET);
    let before = [...every.player.statecraft.orders];
    pick(every.state);
    expect(gained(every.player, before)).toEqual([CABINET]);
    expect(JSON.stringify(every.state.rng)).toBe(rng);
    // A seat that already holds every card the bag would give.
    const held = board(['magisterial', 'commerce'], 3);
    narrowBagTo(held.state, held.player);
    rng = JSON.stringify(held.state.rng);
    offer(held.state, 40, CABINET);
    before = [...held.player.statecraft.orders];
    pick(held.state);
    expect(gained(held.player, before)).toEqual([CABINET]);
    expect(JSON.stringify(held.state.rng)).toBe(rng);
  });

  it('opens what a charter opens, as a pick does', () => {
    const { state, player } = board(['magisterial', 'dominion'], 1);
    narrowBagTo(state, player, PLANTERS);
    expect(player.charteredBuildings).not.toContain('plantationHouse');
    offer(state, 40, CABINET);
    pick(state);
    expect(player.statecraft.orders).toContain(PLANTERS);
    expect(player.charteredBuildings).toContain('plantationHouse');
  });

  it('pays the granted card its own on-draft grant', () => {
    const { state, player, capital } = board(['magisterial', 'commerce'], 1);
    narrowBagTo(state, player, KINGS_LEVY);
    const units = state.units.filter((unit) => unit.ownerId === 0).length;
    offer(state, 40, CABINET);
    pick(state);
    expect(player.statecraft.orders).toContain(KINGS_LEVY);
    const raised = state.units.filter((unit) => unit.ownerId === 0);
    expect(raised).toHaveLength(units + 1);
    const levy = raised[raised.length - 1]!;
    expect(levy.freeUpkeep).toBe(true);
    expect(Math.abs(levy.col - capital.col) + Math.abs(levy.row - capital.row)).toBeLessThanOrEqual(2);
  });

  it('fires the draft moment for the granted card, with no hand price', () => {
    const { state, player, capital } = board(['magisterial', 'commerce'], 3);
    slot(state, PAINTER);
    slot(state, REGISTER);
    offer(state, 50, CABINET);
    const renown = player.renownEarned;
    const hammers = capital.hammerBasket;
    pick(state);
    // The Court Painter pays for both cards.
    expect(player.renownEarned - renown).toBe(30);
    // The Accessions Register pays half the Cabinet's hand price, and nothing
    // for the granted card, which came from no hand.
    expect(capital.hammerBasket - hammers).toBe(25);
  });

  it('grants a card when picked from a free hand', () => {
    const { state, player } = board(['magisterial', 'commerce'], 3);
    offer(state, undefined, CABINET);
    const before = [...player.statecraft.orders];
    pick(state);
    expect(gained(player, before)).toHaveLength(2);
  });

  it('does nothing seated, and nothing when another card is drafted', () => {
    const { state, player } = board(['magisterial', 'commerce'], 3);
    slot(state, CABINET);
    offer(state, 40, 'marketDay', 'theMineralTrade');
    const before = [...player.statecraft.orders];
    const rng = JSON.stringify(state.rng);
    pick(state);
    expect(gained(player, before)).toEqual(['marketDay']);
    expect(JSON.stringify(state.rng)).toBe(rng);
  });
});

// --- The Grand Retrospective ---------------------------------------------------------

describe('The Grand Retrospective (reading 38)', () => {
  /** Stands `count` plain wonders in this town. */
  function wonders(state: GameState, city: City, count: number): void {
    expect(PLAIN_WONDERS.length).toBeGreaterThanOrEqual(count);
    for (const id of PLAIN_WONDERS.slice(0, count)) addBuilding(state, city, id);
    refreshCityDerived(state, city);
    bumpRevision(state);
  }

  /** The hexes a town owns, its own centre left out. */
  function ring(state: GameState, city: City): Tile[] {
    return ownedTiles(state, city).filter((tile) => !(tile.col === city.col && tile.row === city.row));
  }

  /** Lays a work on each hex and refreshes every town. */
  function lay(state: GameState, work: string, ...tiles: readonly Tile[]): void {
    for (const tile of tiles) raiseImprovement(tile, work as ImprovementId, state.turn);
    for (const city of state.cities) refreshCityDerived(state, city);
    bumpRevision(state);
  }

  /** The card's windfall arms, as `raiseOnDraft` hands them to `onDraftPayout`. */
  const ARMS = (orderDef(RETROSPECTIVE).onDraft ?? []).filter(
    (grant): grant is OnDraftWindfall => grant.grant === 'windfall',
  );

  /** What the payout would bank in one voice now. */
  function payoutOf(state: GameState, voice: string): number {
    return onDraftPayout(state, 0, RETROSPECTIVE, ARMS)
      .grants.filter((grant) => grant.yield === voice)
      .reduce((sum, grant) => sum + grant.amount, 0);
  }

  it('pays 20 culture, science and production for each wonder, work and Order you hold', () => {
    // Band 4: the next hand's price is far above what the card pays, so the
    // culture stays in the pool where the test can read it.
    const { state, player, capital } = board(['magisterial', 'commerce'], 4);
    const other = town(state, 12, 5);
    wonders(state, capital, 2);
    const hexes = ring(state, capital);
    lay(state, 'landmark', hexes[0]!);
    lay(state, 'academy', hexes[1]!);
    // A prophet's holy site is a great-person work too.
    lay(state, 'holySite', hexes[2]!);
    player.statecraft.orders.push('marketDay' as OrderId, 'theMineralTrade' as OrderId);
    bumpRevision(state);
    offer(state, 40, RETROSPECTIVE);
    const culture = player.culturePool;
    const science = player.sciencePool;
    const hammers = capital.hammerBasket;
    const elsewhere = other.hammerBasket;
    pick(state);
    // Two wonders, three works and three Orders, this card included.
    const helpings = 2 + 3 + 3;
    expect(player.culturePool - culture).toBe(20 * helpings);
    expect(player.sciencePool - science).toBe(20 * helpings);
    expect(capital.hammerBasket - hammers).toBe(20 * helpings);
    // The production goes to the capital and nowhere else.
    expect(other.hammerBasket).toBe(elsewhere);
  });

  it('counts the works in your borders only, whoever owns the hexes outside them', () => {
    const { state, capital } = board(['magisterial', 'commerce'], 4);
    expect(payoutOf(state, 'culture')).toBe(0);
    const hexes = ring(state, capital);
    lay(state, 'landmark', hexes[0]!);
    expect(payoutOf(state, 'culture')).toBe(20);
    // A work on a hex nobody owns does not count.
    const wild = at(state, 9, 2);
    expect(state.tileOwner[tileIndex(state.map, wild.col, wild.row)]).toBeNull();
    lay(state, 'academy', wild);
    expect(payoutOf(state, 'culture')).toBe(20);
    // A work in a rival's borders does not count.
    const rival = town(state, 15, 5, 1);
    lay(state, 'manufactory', ring(state, rival)[0]!);
    expect(payoutOf(state, 'culture')).toBe(20);
    // An ordinary improvement is not a great-person work.
    lay(state, 'farm', hexes[1]!);
    expect(payoutOf(state, 'culture')).toBe(20);
  });

  it('counts a wonder you captured', () => {
    const { state } = board(['magisterial', 'commerce'], 4);
    const taken = town(state, 14, 5, 1);
    wonders(state, taken, 1);
    expect(payoutOf(state, 'science')).toBe(0);
    taken.ownerId = 0;
    bumpRevision(state);
    expect(payoutOf(state, 'science')).toBe(20);
  });

  it('pays the culture and science with no capital, and the production nowhere', () => {
    const state = bareState(20, 10);
    const player = playerById(state, 0)!;
    player.decks = ['magisterial', 'commerce'];
    player.statecraft.drafts = TIER_LADDER[4]!.drafts;
    player.researching = null;
    player.researchQueue = [];
    player.culturePool = 0;
    bumpRevision(state);
    expect(state.cities.some((city) => city.ownerId === 0)).toBe(false);
    offer(state, 40, RETROSPECTIVE);
    const science = player.sciencePool;
    pick(state);
    // One Order held: this card.
    expect(player.culturePool).toBe(20);
    expect(player.sciencePool - science).toBe(20);
  });

  it('does nothing seated, and nothing when another card is drafted', () => {
    const { state, player, capital } = board(['magisterial', 'commerce'], 4);
    wonders(state, capital, 2);
    slot(state, RETROSPECTIVE);
    offer(state, 40, 'marketDay');
    const culture = player.culturePool;
    const hammers = capital.hammerBasket;
    pick(state);
    expect(player.culturePool).toBe(culture);
    expect(capital.hammerBasket).toBe(hammers);
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

/** One exported function's body, by name. */
function body(file: string, name: string): string {
  const text = code(SOURCES[`../../../src/${file}`]!);
  return new RegExp(`export function ${name}\\([\\s\\S]*?\\n\\}`).exec(text)?.[0] ?? '';
}

describe('the seams of the boons', () => {
  it('pays the yields on the draft through one composed payout and the one delivery', () => {
    const raise = body('sim/cities.ts', 'raiseOnDraft');
    expect(raise).toContain('onDraftPayout(state, player.id, id, windfalls)');
    expect(raise).toContain('deliverWindfall(state, player, payout)');
    const cities = code(SOURCES['../../../src/sim/cities.ts']!);
    const deliver = /function deliverWindfall\([\s\S]*?\n\}/.exec(cities)?.[0] ?? '';
    expect(deliver).toContain('payWindfallGrants(state, player, payout, at)');
    expect(filesWith('onDraftPayout(')).toEqual(['sim/cities.ts', 'sim/statecraft/evaluator.ts']);
  });

  it('draws the foreign card rarity first, with no pity', () => {
    expect(body('sim/statecraft/draft.ts', 'drawForeignCard')).toContain(
      'drawRarityFirst(state, foreignCardBag(state, player), 0)',
    );
    expect(filesWith('drawForeignCard(')).toEqual(['sim/cities.ts', 'sim/statecraft/draft.ts']);
  });

  it('writes the collection in one place, which the pick and the grant share', () => {
    // The sim's only writer of `PlayerStatecraft.orders`, and the only caller
    // of `applyCharter`.
    const sim = Object.keys(SOURCES).filter((path) => path.includes('/src/sim/'));
    const writers = sim.filter((path) => code(SOURCES[path]!).includes('orders.push('));
    expect(writers.map((path) => path.replace('../../../src/', ''))).toEqual(['sim/statecraft/draft.ts']);
    const draft = code(SOURCES['../../../src/sim/statecraft/draft.ts']!);
    expect(draft.split('orders.push(')).toHaveLength(2);
    expect(body('sim/statecraft/draft.ts', 'addToCollection')).toContain('sc.orders.push(id)');
    expect(filesWith('applyCharter(')).toEqual(['sim/statecraft/draft.ts']);
    expect(draft.split('applyCharter(')).toHaveLength(3);
    expect(body('sim/statecraft/draft.ts', 'addToCollection')).toContain('applyCharter(player, id)');
    expect(body('sim/statecraft/draft.ts', 'settleOrderChoice')).toContain('return addToCollection(player, id);');
  });
});
