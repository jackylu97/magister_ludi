/**
 * **The light capstones** (batch MG10 of `docs/plans/magisterial-themes-triage.md`).
 *
 * Batch MG10 builds three cards:
 *
 *   · The Grand Vizier, a chair reader (`slotPosition`): the card in the
 *     first Economic chair pays its town and empire lines twice. Its hex
 *     lines, its percentages, its conversions and its rules are not doubled.
 *     An empty chair, a malice or a government with no Economic chair gives
 *     nothing (the triage's reading 25);
 *   · The Divine Proportion, an amplifier with a tile test
 *     (`cardYieldAmplifier`, `on: greatWork`): every other Order's hex line
 *     on a great-person work pays twice. Town lines, a share of a work's own
 *     yield and a leader's line are not reached (reading 26). A line paid for
 *     each hex beside the work is doubled for each such hex, so an
 *     amplifier's share now keeps the line's multipliers (`hexMultipliers`).
 *     The Age of Improvement's share of Mining Districts is counted the same
 *     way;
 *   · The Second Sitting, a pass rider with a new filter (`paidHand`): passing
 *     an Order hand that cost culture deals a free hand at once. Passing a
 *     free hand deals nothing. The free hand moves neither the draft count
 *     nor the price, and the pity the pass raised stays (reading 16).
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, ownedTiles, refreshCityDerived } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { type Tile, raiseImprovement, tileNeighbors } from '../../../src/sim/map';
import { type City, type GameState, addBuilding, bumpRevision, playerById } from '../../../src/sim/state';
import {
  cardTileLines,
  describeCard,
  describeEffects,
  explainCardCityYields,
  explainCardEmpireYields,
  explainCardPercentYields,
  stripRefs,
  windfallPayout,
} from '../../../src/sim/statecraft';
import {
  type CardEffect,
  type GovernmentId,
  type OrderId,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import { cityContext, explainTileYield } from '../../../src/sim/yields/hex';
import { at, bareState } from '../improvementHelpers';

const VIZIER = 'theGrandVizier' as OrderId;
const PROPORTION = 'theDivineProportion' as OrderId;
const SITTING = 'theSecondSitting' as OrderId;

const GRANARIES = 'civicGranaries' as OrderId;
const PRYTANEION = 'thePrytaneion' as OrderId;
const DOMAIN = 'theMastersDomain' as OrderId;
const PREFECTS = 'thePrefects' as OrderId;
const WORKING_COURT = 'theWorkingCourt' as OrderId;
const GUILD = 'magisterialTheGuildOfMasons' as OrderId;
const ART_DEALERS = 'theArtDealers' as OrderId;
const SITING = 'theSitingMasters' as OrderId;
const QUARTER = 'magisterialTheQuarterOfMasters' as OrderId;
const SCULPTED = 'theSculptedLandscape' as OrderId;
const LAUREATE = 'magisterialTheLaureate' as OrderId;
const CHAPTER = 'theUnwrittenChapter' as OrderId;

/** The three rows batch MG10 dealt, with the tier, rarity and type the sheet gives each. */
const MG10_ROWS: readonly [OrderId, number, string, string][] = [
  [VIZIER, 2, 'rare', 'wildcard'],
  [PROPORTION, 3, 'rare', 'wildcard'],
  [SITTING, 3, 'rare', 'wildcard'],
];

type Voice = 'food' | 'production' | 'gold' | 'science' | 'culture';

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

/** Puts a card in a chair for seat 0, the way the reading sees it. */
function slot(state: GameState, card: OrderId): void {
  const sc = playerById(state, 0)!.statecraft;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Lays out this government's council for seat 0, with these cards in these chairs. */
function council(state: GameState, government: GovernmentId, cards: readonly (OrderId | null)[]): void {
  const sc = playerById(state, 0)!.statecraft;
  sc.government = government;
  sc.slots = cards.map((card) => (card === null ? null : { card, sealedUntil: 0 }));
  for (const card of cards) if (card !== null && !sc.orders.includes(card)) sc.orders.push(card);
  bumpRevision(state);
}

/** What one card's town lines pay this town, in one voice. */
function townPays(state: GameState, city: City, card: OrderId, voice: Voice): number {
  return explainCardCityYields(state, city)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line[voice], 0);
}

/** What one card's empire lines pay, in one voice. */
function empirePays(state: GameState, card: OrderId, voice: Voice): number {
  return explainCardEmpireYields(state, 0)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line[voice], 0);
}

/** What one card's lines pay on a hex the town works, read off the hex's own list. */
function hexPays(state: GameState, city: City, tile: Tile, card: OrderId): Record<Voice, number> {
  const total: Record<Voice, number> = { food: 0, production: 0, gold: 0, science: 0, culture: 0 };
  for (const line of explainTileYield(tile, cityContext(state, city))) {
    if (line.card !== card) continue;
    for (const voice of Object.keys(total) as Voice[]) total[voice] += line[voice];
  }
  return total;
}

/** The printed clauses of a card, with the keyword marks taken out. */
function words(id: OrderId): string[] {
  return describeCard(id).map((clause) => stripRefs(clause.text));
}

/** The printed clauses of a list of effects, with the keyword marks taken out. */
function effectWords(effects: CardEffect[]): string[] {
  return describeEffects(effects).map((clause) => stripRefs(clause.text));
}

// --- the rows ------------------------------------------------------------------

describe('Magisterial batch MG10: the rows', () => {
  it('deals all three from the tier, rarity and type the sheet names', () => {
    const pool = ordersForDecks(['magisterial']);
    for (const [id, band, rarity, type] of MG10_ROWS) {
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

  it('carries the text of the sheet and the shapes the triage names', () => {
    expect(orderDef(VIZIER).text).toBe('The card in your first Economic chair pays its yields twice.');
    expect(orderDef(VIZIER).effects).toEqual([{ kind: 'slotPosition', slot: 'economic', position: 1, factor: 2 }]);
    expect(orderDef(PROPORTION).text).toBe('The bonuses your cards give great-person works are doubled.');
    expect(orderDef(PROPORTION).effects).toEqual([
      { kind: 'cardYieldAmplifier', yield: 'all', percent: 100, on: { test: 'greatWork' } },
    ]);
    expect(orderDef(SITTING).text).toBe(
      'Each time you pass on an Order hand you paid culture for, you are dealt a free Order hand at once.',
    );
    expect(orderDef(SITTING).effects).toEqual([
      { kind: 'windfallRider', occasion: 'draftPassed', paidHand: true, grant: { freeDraft: true } },
    ]);
  });

  it('prints each card in plain words', () => {
    expect(words(VIZIER)).toEqual(['the Order in your first economic slot pays twice']);
    expect(words(PROPORTION)).toEqual([
      "what your other Orders pay on hexes carrying a great person's work is +100% more",
    ]);
    expect(words(SITTING)).toEqual([
      'passing an Order draft you paid culture for opens an Order draft at once, at no culture cost',
    ]);
  });

  it('says the hand filter inside the moment that has a hand, and in a parenthesis elsewhere', () => {
    expect(
      effectWords([
        {
          kind: 'windfallRider',
          occasion: 'cardDrafted',
          paidHand: true,
          grant: { yield: 'culture', amount: 5 },
        },
      ]),
    ).toEqual(['drafting a card from a hand you paid culture for grants +5 culture']);
    const elsewhere = effectWords([
      { kind: 'windfallRider', occasion: 'greatPersonGained', paidHand: true, grant: { yield: 'culture', amount: 5 } },
    ]);
    expect(elsewhere).toHaveLength(1);
    expect(elsewhere[0]).toContain('(only for a hand you paid culture for)');
  });
});

// --- The Grand Vizier ------------------------------------------------------------

describe('The Grand Vizier: the card in the first Economic chair pays twice', () => {
  /** A capital with a Monument, under the Republic: three Economic chairs, one Civic and one Wildcard. */
  function republic(cards: readonly (OrderId | null)[]): { state: GameState; city: City } {
    const state = bareState(20, 10);
    const city = town(state, 5, 5);
    addBuilding(state, city, 'monument');
    refreshCityDerived(state, city);
    council(state, 'republic', cards);
    return { state, city };
  }

  it('doubles the town lines of the card in the first Economic chair, and not the second', () => {
    const { state, city } = republic([GRANARIES, PRYTANEION, null, null, VIZIER]);
    // Civic Granaries: +1 food and +1 production for the Monument.
    expect(townPays(state, city, GRANARIES, 'food')).toBe(1);
    expect(townPays(state, city, GRANARIES, 'production')).toBe(1);
    expect(townPays(state, city, VIZIER, 'food')).toBe(1);
    expect(townPays(state, city, VIZIER, 'production')).toBe(1);
    // The line names the card it doubled.
    const lines = explainCardCityYields(state, city).filter((line) => line.card === VIZIER);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.source).toContain('Civic Granaries');
    // The Prytaneion in the second chair pays +1 food for each of the three
    // cards seated, and the Vizier adds nothing for it.
    expect(townPays(state, city, PRYTANEION, 'food')).toBe(3);
  });

  it('follows whichever card sits first', () => {
    const { state, city } = republic([PRYTANEION, GRANARIES, null, null, VIZIER]);
    expect(townPays(state, city, PRYTANEION, 'food')).toBe(3);
    expect(townPays(state, city, VIZIER, 'food')).toBe(3);
    expect(townPays(state, city, VIZIER, 'production')).toBe(0);
  });

  it('pays nothing for an empty first chair, even when the second is full', () => {
    const { state, city } = republic([null, GRANARIES, null, null, VIZIER]);
    expect(townPays(state, city, GRANARIES, 'food')).toBe(1);
    expect(explainCardCityYields(state, city).filter((line) => line.card === VIZIER)).toEqual([]);
  });

  it('pays nothing while a malice holds the first Economic chair', () => {
    const { state, city } = republic([null, GRANARIES, null, null, VIZIER]);
    playerById(state, 0)!.malices.push({ id: 'leanYears', untilAge: 3, chair: 0 });
    bumpRevision(state);
    expect(explainCardCityYields(state, city).filter((line) => line.card === VIZIER)).toEqual([]);
  });

  it('pays nothing under a government with no Economic chair', () => {
    const state = bareState(20, 10);
    const city = town(state, 5, 5);
    addBuilding(state, city, 'monument');
    refreshCityDerived(state, city);
    // The Theocracy: one Military chair, three Civic and one Wildcard. An
    // Economic card may still sit in the Wildcard chair, but that chair is
    // not an Economic chair.
    council(state, 'theocracy', [null, null, null, null, VIZIER]);
    expect(townPays(state, city, VIZIER, 'food')).toBe(0);
    council(state, 'theocracy', [null, null, null, null, GRANARIES]);
    slot(state, VIZIER);
    expect(townPays(state, city, GRANARIES, 'food')).toBe(1);
    expect(explainCardCityYields(state, city).filter((line) => line.card === VIZIER)).toEqual([]);
  });

  it('doubles an empire line too', () => {
    const state = bareState(20, 10);
    town(state, 5, 5);
    // The Art Dealers: +3 gold for each card seated, three here.
    council(state, 'republic', [ART_DEALERS, PRYTANEION, null, null, VIZIER]);
    expect(empirePays(state, ART_DEALERS, 'gold')).toBe(9);
    expect(empirePays(state, VIZIER, 'gold')).toBe(9);
  });

  it('doubles a loss of gold the card carries, as built', () => {
    const state = bareState(20, 10);
    const city = town(state, 5, 5);
    city.queue = [{ kind: 'building', id: 'pyramids' as never }];
    refreshCityDerived(state, city);
    council(state, 'republic', [GUILD, null, null, null, VIZIER]);
    expect(townPays(state, city, GUILD, 'gold')).toBe(-2);
    expect(townPays(state, city, VIZIER, 'gold')).toBe(-2);
  });

  it('does not double a hex line, a percentage or a conversion', () => {
    const state = bareState(20, 10);
    const city = town(state, 5, 5);
    addBuilding(state, city, 'monument');
    const work = ownedTiles(state, city).find((tile) => !(tile.col === city.col && tile.row === city.row))!;
    raiseImprovement(work, 'academy' as never, state.turn);
    refreshCityDerived(state, city);
    // The Masters' Domain pays on the hex, so the Vizier finds no town line to double.
    council(state, 'republic', [DOMAIN, null, null, null, VIZIER]);
    expect(hexPays(state, city, work, DOMAIN).food).toBe(3);
    expect(hexPays(state, city, work, VIZIER)).toEqual({ food: 0, production: 0, gold: 0, science: 0, culture: 0 });
    expect(explainCardCityYields(state, city).filter((line) => line.card === VIZIER)).toEqual([]);
    // The Prefects pay a percentage: the Vizier adds no line and no percentage.
    council(state, 'republic', [PREFECTS, null, null, null, VIZIER]);
    expect(explainCardPercentYields(state, city).some((line) => line.card === PREFECTS)).toBe(true);
    expect(explainCardPercentYields(state, city).some((line) => line.card === VIZIER)).toBe(false);
    expect(explainCardCityYields(state, city).filter((line) => line.card === VIZIER)).toEqual([]);
    // The Working Court pays a share of the town's culture, folded apart.
    council(state, 'republic', [WORKING_COURT, null, null, null, VIZIER]);
    expect(explainCardCityYields(state, city).filter((line) => line.card === VIZIER)).toEqual([]);
  });
});

// --- The Divine Proportion -------------------------------------------------------

describe('The Divine Proportion: what the cards pay on a great-person work, twice', () => {
  /** A capital, and an Academy two hexes from its centre, so its six neighbours are ours to shape. */
  function workBoard(): { state: GameState; city: City; work: Tile; beside: Tile[] } {
    const state = bareState(20, 12);
    const city = town(state, 8, 6);
    const work = at(state, 8, 4);
    raiseImprovement(work, 'academy' as never, state.turn);
    const beside = tileNeighbors(state.map, work).filter(
      (tile) => !(tile.col === city.col && tile.row === city.row),
    );
    expect(beside.length).toBeGreaterThanOrEqual(5);
    refreshCityDerived(state, city);
    bumpRevision(state);
    return { state, city, work, beside };
  }

  it('doubles a flat hex line on a work', () => {
    const { state, city, work } = workBoard();
    slot(state, DOMAIN);
    expect(hexPays(state, city, work, PROPORTION).food).toBe(0);
    slot(state, PROPORTION);
    expect(hexPays(state, city, work, DOMAIN)).toEqual({ food: 3, production: 3, gold: 0, science: 0, culture: 0 });
    expect(hexPays(state, city, work, PROPORTION)).toEqual({
      food: 3,
      production: 3,
      gold: 0,
      science: 0,
      culture: 0,
    });
  });

  it('doubles a line paid for each hex beside the work for each such hex, at the same cap', () => {
    const { state, city, work, beside } = workBoard();
    slot(state, SITING);
    slot(state, PROPORTION);
    const culture = (card: OrderId): number => hexPays(state, city, work, card).culture;
    // No hill, mountain, forest or water beside the work: nothing to double.
    expect(culture(SITING)).toBe(0);
    expect(culture(PROPORTION)).toBe(0);
    beside[0]!.hills = true;
    beside[1]!.terrain = 'mountain' as never;
    bumpRevision(state);
    expect(culture(SITING)).toBe(2);
    expect(culture(PROPORTION)).toBe(2);
    beside[2]!.terrain = 'coast' as never;
    beside[3]!.feature = 'forest' as never;
    bumpRevision(state);
    expect(culture(SITING)).toBe(3);
    expect(culture(PROPORTION)).toBe(3);
  });

  it('raises nothing on a hex that is not a work', () => {
    const { state, city, beside } = workBoard();
    // The Sculpted Landscape pays a farm beside a work. A farm is not a work.
    slot(state, SCULPTED);
    slot(state, PROPORTION);
    const farm = beside[0]!;
    raiseImprovement(farm, 'farm' as never, state.turn);
    refreshCityDerived(state, city);
    bumpRevision(state);
    expect(hexPays(state, city, farm, SCULPTED).food).toBe(2);
    expect(hexPays(state, city, farm, PROPORTION)).toEqual({ food: 0, production: 0, gold: 0, science: 0, culture: 0 });
  });

  it('does not double a share of a work’s own yield, or a town line', () => {
    const { state, city, work, beside } = workBoard();
    // A second work beside the first, so The Quarter of Masters pays.
    raiseImprovement(beside[0]!, 'landmark' as never, state.turn);
    refreshCityDerived(state, city);
    slot(state, QUARTER);
    slot(state, LAUREATE);
    slot(state, PROPORTION);
    expect(hexPays(state, city, work, PROPORTION)).toEqual({ food: 0, production: 0, gold: 0, science: 0, culture: 0 });
    expect(explainCardCityYields(state, city).filter((line) => line.card === PROPORTION)).toEqual([]);
  });

  it('keeps the dressed line’s multipliers on its own line', () => {
    const { state } = workBoard();
    slot(state, SITING);
    slot(state, PROPORTION);
    const share = cardTileLines(state, 0).find((line) => line.card === PROPORTION);
    expect(share).toBeDefined();
    expect(share!.culture).toBe(1);
    expect(share!.perNeighbour).toEqual({
      test: 'any',
      of: [{ test: 'hills' }, { test: 'terrain', terrain: 'mountain' }, { test: 'feature', feature: 'forest' }, { test: 'water' }],
    });
    expect(share!.perNeighbourMax).toBe(3);
  });

  it('counts The Age of Improvement’s share of Mining Districts per two mines, as the line is', () => {
    const state = bareState(20, 12);
    slot(state, 'miningDistricts' as OrderId);
    slot(state, 'theAgeOfImprovement' as OrderId);
    const share = cardTileLines(state, 0).find((line) => line.card === 'theAgeOfImprovement');
    expect(share).toBeDefined();
    expect(share!.gold).toBe(2);
    expect(share!.science).toBe(2);
    expect(share!.perNeighbour).toEqual({ test: 'improvement', improvement: 'mine' });
    expect(share!.perNeighbourPer).toBe(2);
  });
});

// --- The Second Sitting ----------------------------------------------------------

describe('The Second Sitting: a paid pass deals a free hand', () => {
  /** A board with a capital for seat 0, and no research under way. */
  function board(): GameState {
    const state = bareState(20, 10);
    town(state, 3, 5);
    const player = playerById(state, 0)!;
    player.researching = null;
    player.researchQueue = [];
    player.culturePool = 0;
    bumpRevision(state);
    return state;
  }

  /** Lays an Order hand in front of seat 0: `price` culture paid for it, or none for a free hand. */
  function offer(state: GameState, price: number | undefined): void {
    const options = ordersForDecks(playerById(state, 0)!.decks).filter((id) => orderIsDealt(id)).slice(0, 3);
    const sc = playerById(state, 0)!.statecraft;
    sc.pendingOrder = price === undefined ? { options } : { options, price };
    bumpRevision(state);
  }

  /** Seat 0 passes on the hand, through the reducer. */
  function pass(state: GameState): void {
    expect(applyCommand(state, { type: 'skipOrderOffer', playerId: 0 }).ok).toBe(true);
  }

  it('rides the pass of a hand that cost culture, and only that', () => {
    const state = board();
    slot(state, SITTING);
    expect(windfallPayout(state, 0, 'draftPassed', 0, 0, { handPrice: 40 }).freeDraft).toBe(true);
    expect(windfallPayout(state, 0, 'draftPassed', 0, 0, { handPrice: 0 }).freeDraft).not.toBe(true);
    expect(windfallPayout(state, 0, 'draftPassed', 0, 0, {}).freeDraft).not.toBe(true);
  });

  it('deals a free hand at once after a paid pass, and moves neither the count nor the pity', () => {
    const state = board();
    slot(state, SITTING);
    const sc = playerById(state, 0)!.statecraft;
    const drafts = sc.drafts;
    offer(state, 40);
    pass(state);
    // A new hand waits, with no price: it cost nothing.
    expect(sc.pendingOrder).toBeDefined();
    expect(sc.pendingOrder!.price).toBeUndefined();
    expect(sc.drafts).toBe(drafts);
    // The pass still raised the pity, and the free hand does not lower it.
    expect(sc.orderSkips).toBe(1);
    // Passing the free hand deals nothing more.
    pass(state);
    expect(sc.pendingOrder).toBeUndefined();
    expect(sc.orderSkips).toBe(2);
  });

  it('deals nothing for a paid pass without the card', () => {
    const state = board();
    const sc = playerById(state, 0)!.statecraft;
    offer(state, 40);
    pass(state);
    expect(sc.pendingOrder).toBeUndefined();
  });

  it('deals nothing while a Doctrine offer waits', () => {
    const state = board();
    slot(state, SITTING);
    const sc = playerById(state, 0)!.statecraft;
    sc.pendingDoctrine = { options: [] };
    offer(state, 40);
    pass(state);
    expect(sc.pendingOrder).toBeUndefined();
  });

  it('pays beside The Unwritten Chapter on the same pass', () => {
    const state = board();
    slot(state, SITTING);
    slot(state, CHAPTER);
    const player = playerById(state, 0)!;
    const science = player.sciencePool;
    offer(state, 40);
    pass(state);
    expect(player.statecraft.pendingOrder).toBeDefined();
    expect(player.sciencePool - science).toBe(20);
  });
});
