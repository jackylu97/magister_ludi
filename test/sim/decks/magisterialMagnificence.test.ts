/**
 * **Magnificence** (batch MG11 of `docs/plans/magisterial-themes-triage.md`).
 *
 * Batch MG11 builds one card and the shape under it: culture as a third bank
 * of the purchase verb (`PurchaseCurrency`). While an empire holds the action
 * rule `cultureBuysWonders`, a town may buy the world wonder at the front of
 * its queue with culture from the draft pool, never the Magnum Opus. The price
 * is one culture for each hammer the wonder still needs, and the hammers the
 * town has banked toward it are used, not passed on. Every other purchase gate
 * still runs, and the purchase is not gold or faith spent (the triage's
 * reading 36).
 */

import { describe, expect, it } from 'vitest';

import { buildingDef } from '../../../src/sim/buildingData';
import { buildingProductionCost, foundCityAt, refreshCityDerived } from '../../../src/sim/cities';
import { applyCommand } from '../../../src/sim/commands';
import {
  type PurchasableItem,
  contributeError,
  explainPurchaseCost,
  purchaseError,
  purchaseShortfall,
} from '../../../src/sim/purchase';
import { RULES } from '../../../src/sim/rulesData';
import {
  type City,
  type GameState,
  buildingBank,
  bumpRevision,
  playerById,
  queueItemKey,
  wonderClaim,
} from '../../../src/sim/state';
import { describeCard, nextDraftCost, stripRefs } from '../../../src/sim/statecraft';
import { type OrderId, orderDef, orderIsDealt, ordersForDecks } from '../../../src/sim/statecraftData';
import { at, bareState } from '../improvementHelpers';

const MAGNIFICENCE = 'magnificence' as OrderId;
const BROKERS = 'theBrokersRedraw' as OrderId;
const GUILD = 'aGuildCommission' as OrderId;
const EIGHTH = 'magisterialTheEighthWonder' as OrderId;

/** The wonder every town here builds, and the row queued behind it. */
const WONDER = 'theOracle' as const;
const NEXT = 'monument' as const;
const OPUS = 'theMagnumOpus' as const;
const BUY_WONDER: PurchasableItem = { kind: 'building', id: WONDER };

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

/**
 * Seat 0's town building the wonder, with the Monument behind it and `banked`
 * hammers in its basket, and a draft pool of `culture`.
 *
 * The seat has drafted enough hands that the next one costs more than the
 * pool, which is how a pool stands between turns: the Statecraft phase deals a
 * hand whenever the pool covers one. So any hand dealt after a purchase here
 * would be one the purchase dealt.
 */
function builder(
  options: { held?: boolean; banked?: number; culture?: number } = {},
): { state: GameState; city: City } {
  const state = bareState(20, 10);
  const city = town(state, 4, 5);
  city.queue = [
    { kind: 'building', id: WONDER },
    { kind: 'building', id: NEXT },
  ];
  city.hammerBasket = options.banked ?? 0;
  const player = playerById(state, 0)!;
  player.culturePool = options.culture ?? 0;
  while (nextDraftCost(state, player) <= player.culturePool) player.statecraft.drafts += 1;
  if (options.held ?? true) seat(state, MAGNIFICENCE);
  bumpRevision(state);
  return { state, city };
}

/** What the wonder still needs in seat 0's town, in whole hammers. */
function stillNeeded(state: GameState, city: City): number {
  return Math.ceil(buildingProductionCost(WONDER, state, 0) - city.hammerBasket);
}

/** The printed clauses of a card, with the keyword marks taken out. */
function words(id: OrderId): string[] {
  return describeCard(id).map((clause) => stripRefs(clause.text));
}

// --- the row -------------------------------------------------------------------

describe('Magisterial batch MG11: the row', () => {
  it('deals Magnificence at Tier III, rare and Economic, as the sheet names it', () => {
    const def = orderDef(MAGNIFICENCE);
    expect(orderIsDealt(MAGNIFICENCE)).toBe(true);
    expect(def.decks).toEqual(['magisterial']);
    expect(ordersForDecks(['magisterial'])).toContain(MAGNIFICENCE);
    expect(def.band).toBe(3);
    expect(def.rarity).toBe('rare');
    expect(def.type).toBe('economic');
    expect(def.deferred).toBeUndefined();
  });

  it('carries the text of the sheet and one rule', () => {
    expect(orderDef(MAGNIFICENCE).text).toBe(
      'You may buy a wonder you are building with culture, one culture for each hammer it still needs.',
    );
    expect(orderDef(MAGNIFICENCE).effects).toEqual([{ kind: 'rule', rule: 'cultureBuysWonders' }]);
  });

  it('prints the card in plain words', () => {
    expect(words(MAGNIFICENCE)).toEqual([
      "you may buy the wonder at the front of a city's queue with culture, one culture for each hammer it still needs",
    ]);
  });

  it('keeps the rate at one culture a hammer, the "one" the card and its words say', () => {
    expect(RULES.production.culturePerHammer).toBe(1);
  });
});

// --- the price -------------------------------------------------------------------

describe('the culture price (reading 36)', () => {
  it('has no culture price without the card, and the gate says a wonder is built', () => {
    const { state, city } = builder({ held: false, culture: 5000 });
    expect(explainPurchaseCost(state, 0, city.id, BUY_WONDER, 'culture')).toBeNull();
    expect(purchaseError(state, 0, city.id, BUY_WONDER, 'culture')).toBe(
      `${buildingDef(WONDER).name} is a wonder — it must be built, not bought`,
    );
  });

  it('prices the wonder at the front at its cost less the hammers banked, one culture each', () => {
    const { state, city } = builder({ banked: 37, culture: 5000 });
    const cost = buildingProductionCost(WONDER, state, 0);
    expect(cost).toBeGreaterThan(37);
    const price = explainPurchaseCost(state, 0, city.id, BUY_WONDER, 'culture')!;
    expect(price.currency).toBe('culture');
    expect(price.total).toBe(cost - 37);
    // Rule 5, for a price: the list folds to the figure, and it says why.
    expect(price.lines.reduce((sum, line) => sum + line.amount, 0)).toBe(price.total);
    expect(price.lines).toContainEqual({ source: 'Hammers already banked', amount: -37 });
    expect(purchaseError(state, 0, city.id, BUY_WONDER, 'culture')).toBeNull();
  });

  it('rounds a fraction of a hammer up, so the culture never leaves the wonder short', () => {
    const { state, city } = builder({ banked: 10.25, culture: 5000 });
    const price = explainPurchaseCost(state, 0, city.id, BUY_WONDER, 'culture')!;
    expect(price.total).toBe(Math.ceil(buildingProductionCost(WONDER, state, 0) - 10.25));
  });

  it('has no culture price for a wonder further back, and the gate says to move it to the front', () => {
    const { state, city } = builder({ culture: 5000 });
    city.queue = [
      { kind: 'building', id: NEXT },
      { kind: 'building', id: WONDER },
    ];
    bumpRevision(state);
    expect(explainPurchaseCost(state, 0, city.id, BUY_WONDER, 'culture')).toBeNull();
    expect(purchaseError(state, 0, city.id, BUY_WONDER, 'culture')).toBe(
      `${buildingDef(WONDER).name} must be at the front of ${city.name}'s queue to be bought with culture`,
    );
  });

  it('prices nothing else in culture: not the Magnum Opus, not a building, not a unit', () => {
    const { state, city } = builder({ culture: 5000 });
    city.queue = [{ kind: 'building', id: OPUS }];
    bumpRevision(state);
    for (const item of [
      { kind: 'building', id: OPUS },
      { kind: 'building', id: NEXT },
      { kind: 'unit', id: 'warrior' },
    ] as PurchasableItem[]) {
      expect(explainPurchaseCost(state, 0, city.id, item, 'culture'), item.id).toBeNull();
    }
    expect(purchaseError(state, 0, city.id, { kind: 'building', id: OPUS }, 'culture')).toBe(
      `${buildingDef(OPUS).name} cannot be bought with culture`,
    );
    expect(purchaseError(state, 0, city.id, { kind: 'building', id: NEXT }, 'culture')).toBe(
      `${buildingDef(NEXT).name} cannot be bought with culture`,
    );
  });

  it('lets a purchase rider ride on it, as in the other banks', () => {
    // The Brokers' Redraw: "All other purchasing is 10% more expensive."
    const { state, city } = builder({ culture: 5000 });
    const plain = explainPurchaseCost(state, 0, city.id, BUY_WONDER, 'culture')!.total;
    seat(state, BROKERS);
    const dearer = explainPurchaseCost(state, 0, city.id, BUY_WONDER, 'culture')!;
    expect(dearer.total).toBe(Math.floor((plain * 110) / 100));
    expect(dearer.lines.reduce((sum, line) => sum + line.amount, 0)).toBe(dearer.total);
  });

  it('is short of culture by the gap, and only of culture', () => {
    const { state, city } = builder({ culture: 20 });
    const price = stillNeeded(state, city);
    expect(purchaseError(state, 0, city.id, BUY_WONDER, 'culture')).toBe(
      `${buildingDef(WONDER).name} costs ${price} culture; A has 20`,
    );
    expect(purchaseShortfall(state, 0, city.id, BUY_WONDER, 'culture')).toBe(price - 20);
  });
});

// --- the purchase ----------------------------------------------------------------

describe('the purchase (reading 36)', () => {
  it('takes the culture from the draft pool and raises the wonder, using the banked hammers', () => {
    const { state, city } = builder({ banked: 37, culture: 5000 });
    const player = playerById(state, 0)!;
    // Hammers parked under the Monument from an earlier visit come back with it.
    city.itemProgress = { [queueItemKey({ kind: 'building', id: NEXT })]: 6 };
    const price = explainPurchaseCost(state, 0, city.id, BUY_WONDER, 'culture')!.total;
    const gold = player.gold;
    const faith = player.faithPool;
    const result = applyCommand(state, {
      type: 'purchaseItem',
      playerId: 0,
      cityId: city.id,
      item: BUY_WONDER,
      currency: 'culture',
    });
    expect(result.ok).toBe(true);
    expect(player.culturePool).toBe(5000 - price);
    expect(city.buildings).toContain(WONDER);
    expect(wonderClaim(state, WONDER)).toMatchObject({ cityId: city.id, playerId: 0 });
    expect(city.queue).toEqual([{ kind: 'building', id: NEXT }]);
    // The 37 banked hammers paid for the wonder with the culture; only the
    // Monument's own six come forward.
    expect(city.hammerBasket).toBe(6);
    expect(buildingBank(city, WONDER)).toBe('culture');
    expect(player.gold).toBe(gold);
    expect(player.faithPool).toBe(faith);
  });

  it('opens no Order hand, and spends nothing of gold or faith', () => {
    const { state, city } = builder({ culture: 5000 });
    const player = playerById(state, 0)!;
    const spent = { gold: player.goldSpent, faith: player.faithSpent };
    expect(player.statecraft.pendingOrder).toBeUndefined();
    applyCommand(state, {
      type: 'purchaseItem',
      playerId: 0,
      cityId: city.id,
      item: BUY_WONDER,
      currency: 'culture',
    });
    expect(player.statecraft.pendingOrder).toBeUndefined();
    expect(player.goldSpent).toBe(spent.gold);
    expect(player.faithSpent).toBe(spent.faith);
  });

  it('counts as no building bought with gold, and as a wonder completed', () => {
    // A Guild Commission counts buildings bought with gold; Commission: The
    // Eighth Wonder counts wonders this empire completes, bought ones included
    // (batch MG4's reading).
    const { state, city } = builder({ culture: 5000 });
    seat(state, GUILD);
    seat(state, EIGHTH);
    applyCommand(state, {
      type: 'purchaseItem',
      playerId: 0,
      cityId: city.id,
      item: BUY_WONDER,
      currency: 'culture',
    });
    const tallies = playerById(state, 0)!.statecraft.tallies;
    expect(tallies.find((row) => row.card === GUILD)).toBeUndefined();
    expect(tallies.find((row) => row.card === EIGHTH)?.count).toBe(1);
  });

  it('refunds a rival town that was racing for the wonder, as any completion does', () => {
    const { state, city } = builder({ culture: 5000 });
    const rival = town(state, 14, 5, 1);
    rival.queue = [{ kind: 'building', id: WONDER }];
    rival.hammerBasket = 30;
    bumpRevision(state);
    const gold = playerById(state, 1)!.gold;
    applyCommand(state, {
      type: 'purchaseItem',
      playerId: 0,
      cityId: city.id,
      item: BUY_WONDER,
      currency: 'culture',
    });
    expect(rival.queue).toEqual([]);
    expect(playerById(state, 1)!.gold).toBe(gold + 30 * RULES.production.wonderRefundGoldPerHammer);
  });

  it('refuses a seat short of culture and leaves the state as it was', () => {
    const { state, city } = builder({ culture: 20 });
    const before = JSON.stringify(state);
    const result = applyCommand(state, {
      type: 'purchaseItem',
      playerId: 0,
      cityId: city.id,
      item: BUY_WONDER,
      currency: 'culture',
    });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('still asks every other gate: a puppet spends nothing, and a rival may not buy here', () => {
    const { state, city } = builder({ culture: 5000 });
    playerById(state, 1)!.culturePool = 5000;
    seat(state, MAGNIFICENCE, 1);
    expect(purchaseError(state, 1, city.id, BUY_WONDER, 'culture')).toMatch(/does not belong/);
    city.puppet = true;
    bumpRevision(state);
    expect(purchaseError(state, 0, city.id, BUY_WONDER, 'culture')).toMatch(/is a puppet/);
  });

  it('is never given toward a build, as gold and faith may be', () => {
    const { state, city } = builder({ culture: 5000 });
    expect(contributeError(state, 0, city.id, 'culture')).toBe('Culture cannot be given toward a build');
  });
});
