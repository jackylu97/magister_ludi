/**
 * **The draft's price** (batch MG5 of `docs/plans/magisterial-themes-triage.md`).
 *
 * Batch MG5 gives an Order hand a price and builds the three cards that read
 * it:
 *
 *   · a hand bought with culture keeps the culture it cost
 *     (`OrderOffer.price`). A reroll keeps that price, and a free hand has
 *     none (the triage's reading 11);
 *   · the moment a card is drafted and the moment a hand is passed both carry
 *     the price as a fact (`handPrice`), read before the hand is removed, and
 *     a grant may pay a share of it (the `handPrice` measure);
 *   · The Accessions Register pays the capital half of it as production for
 *     each card drafted, and The Unwritten Chapter pays half of it as science
 *     for each hand passed. Both round down, and a free hand pays nothing;
 *   · The Open Door takes 15% off the price of each hand (reading 12). The
 *     discount is read in one place (`draftCostFor`). The draft count, the
 *     government tiers and the pity a pass buys do not move.
 *
 * The reroll's half of reading 11 is pinned in `test/sim/reroll.test.ts`, and
 * the screens' half of reading 12 in `test/ui/empireDrawer.test.ts` and
 * `test/ui/topBarCost.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, refreshCityDerived } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import { type City, type GameState, bumpRevision, playerById } from '../../../src/sim/state';
import {
  describeCard,
  draftCost,
  draftCostFor,
  draftSettledBy,
  nextDraftCost,
  planDraft,
  settleDraft,
  stripRefs,
  windfallPayout,
} from '../../../src/sim/statecraft';
import { openFreeDraft } from '../../../src/sim/statecraft/draft';
import {
  type OrderId,
  GOVERNMENT_TIERS,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import { at, bareState } from '../improvementHelpers';

const OPEN_DOOR = 'theOpenDoor' as OrderId;
const REGISTER = 'theAccessionsRegister' as OrderId;
const CHAPTER = 'theUnwrittenChapter' as OrderId;
const PAINTER = 'theCourtPainter' as OrderId;

/** The three rows batch MG5 dealt, with the tier, rarity and type the sheet gives each. */
const MG5_ROWS: readonly [OrderId, number, string, string][] = [
  [OPEN_DOOR, 1, 'uncommon', 'wildcard'],
  [REGISTER, 2, 'uncommon', 'economic'],
  [CHAPTER, 2, 'common', 'civic'],
];

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

/** Seat 0 passes on the hand, through the reducer. */
function pass(state: GameState): void {
  expect(applyCommand(state, { type: 'skipOrderOffer', playerId: 0 }).ok).toBe(true);
}

/** A board with a capital and a second town for seat 0, and no research under way. */
function board(): { state: GameState; capital: City; other: City } {
  const state = bareState(20, 10);
  const capital = town(state, 3, 5);
  const other = town(state, 12, 5);
  const player = playerById(state, 0)!;
  // Science a card pays stays in the pool: nothing is being researched.
  player.researching = null;
  player.researchQueue = [];
  player.culturePool = 0;
  bumpRevision(state);
  return { state, capital, other };
}

/** The ladder's price with `percent` off, taken once and rounded down. */
function discounted(drafts: number, percent: number): number {
  return Math.floor((draftCost(drafts) * (100 - percent)) / 100);
}

// --- the rows ------------------------------------------------------------------

describe('Magisterial batch MG5: the rows', () => {
  it('deals all three from the tier, rarity and type the sheet names', () => {
    const pool = ordersForDecks(['magisterial']);
    for (const [id, band, rarity, type] of MG5_ROWS) {
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
    expect(orderDef(OPEN_DOOR).text).toBe('Order hands cost 15% less culture.');
    expect(orderDef(OPEN_DOOR).effects).toEqual([{ kind: 'rulePercent', rule: 'draftCost', percent: -15 }]);
    expect(orderDef(REGISTER).text).toBe(
      'Each card you draft grants your capital production equal to half the culture its hand cost.',
    );
    expect(orderDef(REGISTER).effects).toEqual([
      {
        kind: 'windfallRider',
        occasion: 'cardDrafted',
        grant: { yield: 'production', amount: 0.5, fromOccasion: 'handPrice', whole: true, toCapital: true },
      },
    ]);
    expect(orderDef(CHAPTER).text).toBe(
      'Each time you pass on an Order hand, gain science equal to half the culture the hand cost.',
    );
    expect(orderDef(CHAPTER).effects).toEqual([
      {
        kind: 'windfallRider',
        occasion: 'draftPassed',
        grant: { yield: 'science', amount: 0.5, fromOccasion: 'handPrice', whole: true },
      },
    ]);
  });

  it('prints each card in plain words', () => {
    const words = (id: OrderId): string[] => describeCard(id).map((clause) => stripRefs(clause.text));
    expect(words(OPEN_DOOR)).toEqual(['Order hands cost 15% less culture']);
    expect(words(REGISTER)).toEqual([
      'drafting a card grants production equal to 50% of the culture paid for its hand to your capital',
    ]);
    expect(words(CHAPTER)).toEqual([
      'passing an Order draft grants science equal to 50% of the culture paid for that hand',
    ]);
  });
});

// --- the hand's price ----------------------------------------------------------

describe("the hand's price (reading 11)", () => {
  it('is the culture a bought hand cost, stored on the offer when the hand is dealt', () => {
    const { state } = board();
    const player = playerById(state, 0)!;
    const cost = nextDraftCost(state, player);
    expect(cost).toBe(draftCost(player.statecraft.drafts));
    player.culturePool = cost + 4;
    const done = settleDraft(state, player);
    expect(done).not.toBeNull();
    expect(player.statecraft.pendingOrder?.price).toBe(cost);
    expect(done!.offer.price).toBe(cost);
    expect(player.culturePool).toBe(4);
  });

  it('is absent on a free hand, which moves neither the count nor the price', () => {
    const { state } = board();
    const player = playerById(state, 0)!;
    const drafts = player.statecraft.drafts;
    const cost = nextDraftCost(state, player);
    expect(openFreeDraft(state, player)).toBe(true);
    expect(player.statecraft.pendingOrder).toBeDefined();
    expect(player.statecraft.pendingOrder!.price).toBeUndefined();
    expect('price' in player.statecraft.pendingOrder!).toBe(false);
    expect(player.statecraft.drafts).toBe(drafts);
    expect(nextDraftCost(state, player)).toBe(cost);
  });

  it('travels as the handPrice fact, which only a share of the price reads', () => {
    const { state } = board();
    slot(state, REGISTER);
    slot(state, CHAPTER);
    const production = (facts: { handPrice?: number }): number[] =>
      windfallPayout(state, 0, 'cardDrafted', 0, 0, facts).grants.map((grant) => grant.amount);
    const science = (facts: { handPrice?: number }): number[] =>
      windfallPayout(state, 0, 'draftPassed', 0, 0, facts).grants.map((grant) => grant.amount);
    expect(production({ handPrice: 61 })).toEqual([30]);
    expect(science({ handPrice: 61 })).toEqual([30]);
    // No fact, no grant: a free hand pays nothing.
    expect(production({})).toEqual([]);
    expect(science({})).toEqual([]);
  });
});

// --- The Accessions Register -----------------------------------------------------

describe('The Accessions Register', () => {
  it('pays nothing for drafting itself', () => {
    const { state, capital } = board();
    offer(state, 60, REGISTER);
    const before = capital.hammerBasket;
    pick(state);
    expect(capital.hammerBasket).toBe(before);
  });

  it('grants the capital half the culture the hand cost, rounded down, for each card drafted', () => {
    const { state, capital, other } = board();
    slot(state, REGISTER);
    const atOther = other.hammerBasket;
    // Half of 45 is 22, rounded down.
    offer(state, 45, 'marketDay');
    let before = capital.hammerBasket;
    pick(state);
    expect(capital.hammerBasket - before).toBe(22);
    // A charter counts.
    offer(state, 30, 'thePlantersCharter');
    before = capital.hammerBasket;
    pick(state);
    expect(playerById(state, 0)!.charteredBuildings).toContain('plantationHouse');
    expect(capital.hammerBasket - before).toBe(15);
    // A card from a free hand pays nothing.
    offer(state, undefined, 'theMineralTrade');
    before = capital.hammerBasket;
    pick(state);
    expect(capital.hammerBasket).toBe(before);
    // A pass pays nothing.
    offer(state, 40, 'firstRites');
    before = capital.hammerBasket;
    pass(state);
    expect(capital.hammerBasket).toBe(before);
    // The production goes to the capital and nowhere else.
    expect(other.hammerBasket).toBe(atOther);
  });

  it('rides the draft moment beside The Court Painter', () => {
    const { state, capital } = board();
    const player = playerById(state, 0)!;
    slot(state, REGISTER);
    slot(state, PAINTER);
    offer(state, 50, 'marketDay');
    const hammers = capital.hammerBasket;
    const renown = player.renownEarned;
    pick(state);
    expect(capital.hammerBasket - hammers).toBe(25);
    expect(player.renownEarned - renown).toBe(15);
    // A free hand still pays the painter's flat renown, and the register nothing.
    offer(state, undefined, 'theMineralTrade');
    const hammersFree = capital.hammerBasket;
    const renownFree = player.renownEarned;
    pick(state);
    expect(capital.hammerBasket).toBe(hammersFree);
    expect(player.renownEarned - renownFree).toBe(15);
  });

  it('pays from a hand the meter dealt, at the price the seat paid after The Open Door', () => {
    const { state, capital } = board();
    const player = playerById(state, 0)!;
    slot(state, REGISTER);
    slot(state, OPEN_DOOR);
    const price = discounted(player.statecraft.drafts, 15);
    player.culturePool = price;
    expect(settleDraft(state, player)).not.toBeNull();
    expect(player.statecraft.pendingOrder?.price).toBe(price);
    const before = capital.hammerBasket;
    pick(state);
    expect(capital.hammerBasket - before).toBe(Math.floor(price / 2));
  });
});

// --- The Unwritten Chapter -------------------------------------------------------

describe('The Unwritten Chapter', () => {
  it('grants half the culture the passed hand cost as science, rounded down', () => {
    const { state } = board();
    const player = playerById(state, 0)!;
    slot(state, CHAPTER);
    // Half of 61 is 30, rounded down.
    offer(state, 61, 'marketDay');
    let before = player.sciencePool;
    pass(state);
    expect(player.sciencePool - before).toBe(30);
    // Passing on a free hand pays nothing.
    offer(state, undefined, 'marketDay');
    before = player.sciencePool;
    pass(state);
    expect(player.sciencePool).toBe(before);
    // A pick pays nothing.
    offer(state, 61, 'marketDay');
    before = player.sciencePool;
    pick(state);
    expect(player.sciencePool).toBe(before);
  });

  it('pays from a hand the meter dealt and the seat passed on', () => {
    const { state } = board();
    const player = playerById(state, 0)!;
    slot(state, CHAPTER);
    const price = nextDraftCost(state, player);
    player.culturePool = price;
    expect(settleDraft(state, player)).not.toBeNull();
    const before = player.sciencePool;
    pass(state);
    expect(player.sciencePool - before).toBe(Math.floor(price / 2));
  });
});

// --- The Open Door ---------------------------------------------------------------

describe('The Open Door (reading 12)', () => {
  it('takes 15% off the price of each hand, rounded down once', () => {
    const { state } = board();
    const player = playerById(state, 0)!;
    for (let n = 0; n <= 30; n++) expect(draftCostFor(state, player, n), `rung ${n}`).toBe(draftCost(n));
    slot(state, OPEN_DOOR);
    for (let n = 0; n <= 30; n++) expect(draftCostFor(state, player, n), `rung ${n}`).toBe(discounted(n, 15));
    // The default count is the seat's own, which is the next hand.
    player.statecraft.drafts = 7;
    bumpRevision(state);
    expect(nextDraftCost(state, player)).toBe(discounted(7, 15));
    expect(draftCostFor(state, player)).toBe(discounted(7, 15));
  });

  it('adds two discounts together before the price is taken', () => {
    const { state } = board();
    const player = playerById(state, 0)!;
    slot(state, OPEN_DOOR);
    // A second discount, hung on the seat for a while.
    player.timed = [
      {
        card: OPEN_DOOR,
        effect: { kind: 'rulePercent', rule: 'draftCost', percent: -10 },
        expiresTurn: state.turn + 5,
      },
    ];
    bumpRevision(state);
    for (let n = 0; n <= 30; n++) expect(draftCostFor(state, player, n), `rung ${n}`).toBe(discounted(n, 25));
  });

  it('charges the discounted price and moves neither the count, the government tiers nor the pity', () => {
    const { state } = board();
    const player = playerById(state, 0)!;
    const sc = player.statecraft;
    slot(state, OPEN_DOOR);
    sc.drafts = GOVERNMENT_TIERS[0]! - 1;
    sc.orderSkips = 2;
    bumpRevision(state);
    const price = discounted(sc.drafts, 15);
    // One culture short of the discounted price drafts nothing.
    player.culturePool = price - 1;
    expect(planDraft(state, player)).toBeNull();
    expect(settleDraft(state, player)).toBeNull();
    player.culturePool = price;
    expect(planDraft(state, player)).toEqual({
      cost: price,
      tier: GOVERNMENT_TIERS[0],
      overflow: 0,
      offersGovernment: true,
    });
    const done = settleDraft(state, player)!;
    expect(done.tier).toBe(GOVERNMENT_TIERS[0]);
    expect(done.government).not.toBeNull();
    expect(sc.drafts).toBe(GOVERNMENT_TIERS[0]);
    expect(sc.orderSkips).toBe(2);
    expect(player.culturePool).toBe(0);
    expect(sc.pendingOrder?.price).toBe(price);
  });

  it("promises a draft at the discounted price on a culture grant's preview", () => {
    const { state } = board();
    const player = playerById(state, 0)!;
    const drafts = player.statecraft.drafts;
    const price = discounted(drafts, 15);
    expect(price).toBeLessThan(draftCost(drafts));
    expect(draftSettledBy(state, player, price)).toBeNull();
    slot(state, OPEN_DOOR);
    expect(draftSettledBy(state, player, price)).toBe(`tier ${drafts + 1}`);
    expect(draftSettledBy(state, player, price - 1)).toBeNull();
  });
});

// --- the one reader, pinned by source ---------------------------------------------

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
function filesWith(needle: string | RegExp): string[] {
  return Object.entries(SOURCES)
    .filter(([, text]) => (typeof needle === 'string' ? code(text).includes(needle) : needle.test(code(text))))
    .map(([path]) => path.replace('../../../src/', ''))
    .sort();
}

describe('the price of a hand, written and read at its seams', () => {
  it('is written by the meter, kept by a reroll and read before a pick or a pass removes the hand', () => {
    const draft = code(SOURCES['../../../src/sim/statecraft/draft.ts']!);
    // `settleDraft` writes the price it took; nothing else in the module does.
    const settle = /export function settleDraft\([\s\S]*?\n\}/.exec(draft)?.[0] ?? '';
    expect(settle).toContain('offer.price = plan.cost;');
    expect(draft.split('.price = ')).toHaveLength(2);
    // A free hand is dealt with no price.
    const free = /export function openFreeDraft\([\s\S]*?\n\}/.exec(draft)?.[0] ?? '';
    expect(free.length).toBeGreaterThan(50);
    expect(free).not.toContain('price');
    // The pass reads the price before it deletes the hand.
    const skip = /export function settleOrderSkip\([\s\S]*?\n\}/.exec(draft)?.[0] ?? '';
    const read = skip.indexOf('const price = sc.pendingOrder.price;');
    expect(read).toBeGreaterThan(-1);
    expect(read).toBeLessThan(skip.indexOf('delete sc.pendingOrder;'));
    expect(skip).toContain('{ handPrice: price }');
    // The reroll carries the price onto the new hand.
    const religion = code(SOURCES['../../../src/sim/religion.ts']!);
    const reroll = /export function settleReroll\([\s\S]*?\n\}/.exec(religion)?.[0] ?? '';
    expect(reroll).toContain('const price = sc.pendingOrder?.price;');
    expect(reroll).toContain('sc.pendingOrder.price = price;');
  });
});

describe('the price of a hand, read in one place', () => {
  it('reads the discount rule in draftCostFor and nowhere else', () => {
    // The rule is named by its declaration, its one reader and the bots' price arm.
    expect(filesWith("'draftCost'")).toEqual(['ai/value.ts', 'sim/statecraft/draft.ts', 'sim/statecraftData.ts']);
    const draft = code(SOURCES['../../../src/sim/statecraft/draft.ts']!);
    expect(draft.split("'draftCost'")).toHaveLength(2);
    const helper = /export function draftCostFor\([\s\S]*?\n\}/.exec(draft)?.[0] ?? '';
    expect(helper).toContain("cardRulePercent(state, player.id, 'draftCost')");
  });

  it('is asked with the state by every screen and bot that prints or plans it', () => {
    // No screen and no bot calls the bare ladder, except the bots' fallback for
    // a seat the board does not hold.
    expect(filesWith(/(?<![\w.])draftCost\(/)).toEqual(['ai/value.ts', 'sim/statecraft/draft.ts']);
    const value = code(SOURCES['../../../src/ai/value.ts']!);
    expect(value.split(/(?<![\w.])draftCost\(/)).toHaveLength(2);
    const fallback = /function afterNextDraftCost\([\s\S]*?\n\}/.exec(value)?.[0] ?? '';
    expect(fallback).toContain('draftCost(1)');
    // The seat's own price, with the state, everywhere it is printed or planned.
    for (const [file, call] of [
      ['ui/topBar.ts', 'nextDraftCost(state, player)'],
      ['ui/empireDrawer.ts', 'nextDraftCost(state, player)'],
      ['ui/statecraftScreen.ts', 'nextDraftCost(state, player)'],
      ['ai/wants.ts', 'nextDraftCost(state, player)'],
      ['ai/bot.ts', 'draftCostFor(state, player, sc.drafts + 1)'],
      ['ai/value.ts', 'draftCostFor(ctx.state, player, player.statecraft.drafts + 1)'],
    ] as const) {
      expect(code(SOURCES[`../../../src/${file}`]!), file).toContain(call);
    }
  });
});
