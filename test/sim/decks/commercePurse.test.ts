/**
 * **Commerce batch T6, the purse and the hoard** (`docs/plans/commerce-themes-
 * triage.md`, readings 25 to 28). The sheet's sync test (`commerce.test.ts`)
 * checks the rows against the sheet. This file checks what the batch built:
 *
 *   - Letters of Credit: a spend floor on the card. The three gold gates and
 *     the Trade screen ask one helper (`spendableGold`), the creditors wait
 *     for the same floor (`disbandFloor`), and gold poured into a wonder keeps
 *     its own check. Since batch R1 the card also lifts the loss of science
 *     and culture down to its floor (`arrearsFloor`);
 *   - The Strongbox: since batch R1, the `goldPurchase` moment, written once
 *     for each purchase with gold of any kind (`buyWithGold`);
 *   - The Merchant Guilds: `family` on a route rider, so the slots are counted
 *     from merchants alone;
 *   - Mercenary Contracts: a unit stamp with `timed`, which hangs an upkeep
 *     waiver on a military unit bought with gold or faith, read by the upkeep
 *     fold as a give-back line.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, tilePurchaseError } from '../../../src/sim/cities';
import { type Command, applyCommand } from '../../../src/sim/commands';
import { greatPersonOfferPrice, greatPersonPurchaseError } from '../../../src/sim/greatPeople';
import { explainEmpireGold } from '../../../src/sim/empireGold';
import { contributeError, explainPurchaseCost, purchaseGate } from '../../../src/sim/purchase';
import { RULES } from '../../../src/sim/rulesData';
import {
  type City,
  type GameState,
  type Unit,
  bumpRevision,
  buyWithGold,
  createUnit,
  playerById,
} from '../../../src/sim/state';
import {
  cardSpendFloor,
  explainCardEmpireYields,
  spendableGold,
} from '../../../src/sim/statecraft/evaluator';
import { describeCard, stripRefs } from '../../../src/sim/statecraft/describers';
import { tallyOf } from '../../../src/sim/statecraft/draft';
import { type OrderId, orderDef } from '../../../src/sim/statecraftData';
import { explainRouteSlots, routeSlots } from '../../../src/sim/trade';
import {
  arrearsFloor,
  disbandCandidate,
  disbandFloor,
  explainUnitUpkeep,
  explainUnitUpkeepRebate,
  treasuryInArrears,
  unitUpkeepOf,
} from '../../../src/sim/upkeep';
import { cityYieldPercents } from '../../../src/sim/yields/town';
import { buyCommandFor, tradeContext } from '../../../src/ui/tradeScreen';
import { at, bareState } from '../improvementHelpers';

const LETTERS = 'lettersOfCredit' as OrderId;
const STRONGBOX = 'theStrongbox' as OrderId;
const GUILDS = 'theMerchantGuilds' as OrderId;
const MERCENARIES = 'mercenaryContracts' as OrderId;
const MERCHANT_PRINCES = 'merchantPrinces' as OrderId;
const STANDING_ARMY = 'dominionTheStandingArmy' as OrderId;

/** Seats an Order in a chair, which is what makes it live. */
function seat(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Takes an Order out of its chair. The collection keeps it. */
function unseat(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  sc.slots = sc.slots.filter((slot) => slot?.card !== id);
  bumpRevision(state);
}

/** One town for seat 0 on a blank board, and an empty treasury. */
function town(): { state: GameState; city: City } {
  const state = bareState(16, 9);
  const city = foundCityAt(state, 0, at(state, 4, 4));
  playerById(state, 0)!.gold = 0;
  bumpRevision(state);
  return { state, city };
}

function setGold(state: GameState, gold: number): void {
  playerById(state, 0)!.gold = gold;
  bumpRevision(state);
}

function buy(city: City, item: { kind: 'unit' | 'building'; id: string }, currency = 'gold'): Command {
  return { type: 'purchaseItem', playerId: 0, cityId: city.id, item, currency } as Command;
}

const GRANARY = { kind: 'building', id: 'granary' } as const;

// --- Letters of Credit --------------------------------------------------------

describe('Letters of Credit: buying below zero', () => {
  it('reads the floor off the row, and none without the card', () => {
    const { state } = town();
    expect(cardSpendFloor(state, 0)).toBe(0);
    expect(spendableGold(state, 0)).toBe(0);
    seat(state, 0, LETTERS);
    const credit = orderDef(LETTERS).effects.find((effect) => effect.kind === 'rule');
    expect(credit).toMatchObject({ rule: 'buysOnCredit', credit: 150 });
    expect(cardSpendFloor(state, 0)).toBe(-150);
    setGold(state, 40);
    expect(spendableGold(state, 0)).toBe(190);
  });

  it('lets a building be bought on credit, down to the floor and no further', () => {
    const { state, city } = town();
    const price = explainPurchaseCost(state, 0, city.id, GRANARY, 'gold')!.total;
    expect(price).toBeGreaterThan(0);
    expect(price).toBeLessThanOrEqual(150);
    // Without the card the empty treasury refuses, and the shortfall is the price.
    expect(purchaseGate(state, 0, city.id, GRANARY, 'gold')).toEqual({
      refusal: expect.stringContaining(`costs ${price} gold`),
      shortfall: price,
    });
    seat(state, 0, LETTERS);
    expect(purchaseGate(state, 0, city.id, GRANARY, 'gold')).toEqual({ refusal: null, shortfall: null });
    const result = applyCommand(state, buy(city, GRANARY));
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
    expect(playerById(state, 0)!.gold).toBe(-price);
    expect(city.buildings).toContain('granary');
    // Past the floor it refuses again, saying what may still be spent.
    setGold(state, -140);
    const monument = { kind: 'building', id: 'monument' } as const;
    const second = explainPurchaseCost(state, 0, city.id, monument, 'gold')!.total;
    expect(second).toBeGreaterThan(10);
    const gate = purchaseGate(state, 0, city.id, monument, 'gold');
    expect(gate.refusal).toContain('may spend 10, credit included');
    expect(gate.shortfall).toBe(second - 10);
  });

  it('lets a hex be bought on credit', () => {
    const { state, city } = town();
    const hex = { col: 6, row: 4 };
    expect(tilePurchaseError(state, 0, city.id, hex)).toMatch(/^Costs \d+ gold; you have 0$/);
    seat(state, 0, LETTERS);
    expect(tilePurchaseError(state, 0, city.id, hex)).toBeNull();
    setGold(state, -150);
    expect(tilePurchaseError(state, 0, city.id, hex)).toContain('credit included');
  });

  it('lets a great-person draft be bought on credit', () => {
    const { state } = town();
    seat(state, 0, MERCHANT_PRINCES);
    const price = greatPersonOfferPrice('gold');
    setGold(state, price - 100);
    expect(greatPersonPurchaseError(state, 0, 'gold')).toContain(`needs ${price} gold and has`);
    seat(state, 0, LETTERS);
    expect(greatPersonPurchaseError(state, 0, 'gold')).toBeNull();
  });

  it('keeps gold poured into a wonder to the gold the treasury holds', () => {
    const { state, city } = town();
    seat(state, 0, LETTERS);
    city.queue = [{ kind: 'building', id: 'cathedral' }];
    bumpRevision(state);
    expect(contributeError(state, 0, city.id, 'gold')).toContain('too little gold');
  });

  it('moves the creditors to the same floor', () => {
    const { state } = town();
    createUnit(state, 0, 'knight', 6, 6);
    expect(disbandFloor(state, 0)).toBe(RULES.upkeep.disbandBelow);
    setGold(state, RULES.upkeep.disbandBelow - 1);
    expect(disbandCandidate(state, 0)).not.toBeNull();
    seat(state, 0, LETTERS);
    expect(disbandFloor(state, 0)).toBe(-150);
    expect(disbandCandidate(state, 0)).toBeNull();
    setGold(state, -150);
    expect(disbandCandidate(state, 0)).toBeNull();
    setGold(state, -151);
    expect(disbandCandidate(state, 0)).not.toBeNull();
  });

  it('lets the Trade screen offer a hire the reducer would take', () => {
    const state = bareState(24, 9);
    const home = foundCityAt(state, 0, at(state, 3, 4));
    const near = foundCityAt(state, 0, at(state, 9, 4));
    home.buildings.push('market', 'market');
    bumpRevision(state);
    const price = tradeContext(state, 0).reading.price;
    expect(price).toBeGreaterThan(0);
    setGold(state, price - 100);
    const rowOf = (ctx: ReturnType<typeof tradeContext>) =>
      ctx.rows.find((row) => row.from.id === home.id && row.to.id === near.id)!;
    const poor = tradeContext(state, 0);
    expect(buyCommandFor(poor, rowOf(poor), rowOf(poor).modes[0]!)).toBeNull();
    seat(state, 0, LETTERS);
    const credited = tradeContext(state, 0);
    expect(credited.spendable).toBe(price + 50);
    const command = buyCommandFor(credited, rowOf(credited), rowOf(credited).modes[0]!);
    expect(command).not.toBeNull();
    const result = applyCommand(state, { type: 'buyRoute', playerId: 0, ...command! } as Command);
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
    expect(playerById(state, 0)!.gold).toBe(-100);
  });

  it('is asked by the three gold gates and the Trade screen, and by no other spend', () => {
    // A register by source (reading 25): the helper is the one figure the
    // purchases compare, and the Opus and the gold reroll keep their own.
    const sources = import.meta.glob(
      [
        '../../../src/sim/purchase.ts',
        '../../../src/sim/cities.ts',
        '../../../src/sim/greatPeople.ts',
        '../../../src/sim/religion.ts',
        '../../../src/ui/tradeScreen.ts',
      ],
      { eager: true, query: '?raw', import: 'default' },
    ) as Record<string, string>;
    const text = (name: string): string =>
      sources[Object.keys(sources).find((path) => path.endsWith(name))!]!;
    const body = (name: string, fn: string): string => {
      const all = text(name);
      const start = all.indexOf(`export function ${fn}(`);
      expect(start, `${name}: ${fn}`).toBeGreaterThanOrEqual(0);
      const end = all.indexOf('\nexport ', start + 1);
      return all.slice(start, end === -1 ? undefined : end);
    };
    expect(body('purchase.ts', 'purchaseGate')).toContain('spendableGold(');
    expect(body('cities.ts', 'tilePurchaseGate')).toContain('spendableGold(');
    expect(body('greatPeople.ts', 'greatPersonPurchaseError')).toContain('spendableGold(');
    expect(body('purchase.ts', 'contributeError')).not.toContain('spendableGold');
    expect(body('religion.ts', 'rerollError')).not.toContain('spendableGold');
    const screen = text('tradeScreen.ts');
    expect(screen).toContain('spendableGold(');
    expect(screen).not.toMatch(/ctx\.gold\s*(<|>=)/);
  });

  it('says the floor on the card', () => {
    // Batch R1: the card lifts the loss of science and culture too.
    expect(orderDef(LETTERS).text).toBe('Your treasury may fall to −150 with no penalty.');
    expect(describeCard(LETTERS).map((clause) => stripRefs(clause.text))).toEqual([
      'your treasury may fall to −150 with no penalty',
    ]);
  });

  it('costs no science or culture between 0 and −150, and the usual share below (batch R1)', () => {
    // The user's ruling of 2026-11-11 (`docs/flags.md` item (jjjjjjj)): "card
    // also lifts the 25% loss". The arrears line starts at the card's floor.
    const { state, city } = town();
    const arrears = (): number =>
      cityYieldPercents(state, city).filter((line) => line.source === 'Treasury in debt').length;
    const player = playerById(state, 0)!;
    setGold(state, -1);
    expect(treasuryInArrears(state, player)).toBe(true);
    expect(arrears()).toBe(2);
    seat(state, 0, LETTERS);
    expect(arrearsFloor(state, 0)).toBe(-150);
    for (const gold of [-1, -100, -150]) {
      setGold(state, gold);
      expect(treasuryInArrears(state, player), String(gold)).toBe(false);
      expect(arrears(), String(gold)).toBe(0);
    }
    setGold(state, -151);
    expect(treasuryInArrears(state, player)).toBe(true);
    expect(cityYieldPercents(state, city).filter((line) => line.source === 'Treasury in debt')).toEqual([
      { source: 'Treasury in debt', yield: 'science', percent: RULES.upkeep.debtPercent, stage: 'empire' },
      { source: 'Treasury in debt', yield: 'culture', percent: RULES.upkeep.debtPercent, stage: 'empire' },
    ]);
    // Off its chair the card lifts nothing.
    unseat(state, 0, LETTERS);
    setGold(state, -100);
    expect(arrears()).toBe(2);
  });
});

// --- The Strongbox -----------------------------------------------------------

describe('The Strongbox: each purchase with gold (batch R1)', () => {
  /** What the card pays the empire in one voice this turn. */
  function paid(state: GameState, voice: 'science' | 'culture'): number {
    return explainCardEmpireYields(state, 0)
      .filter((line) => line.card === STRONGBOX)
      .reduce((sum, line) => sum + line[voice], 0);
  }

  it('counts a building and a unit bought with gold, and only while seated', () => {
    const { state, city } = town();
    setGold(state, 1000);
    const sc = playerById(state, 0)!.statecraft;
    expect(applyCommand(state, buy(city, GRANARY)).ok).toBe(true);
    expect(tallyOf(sc, STRONGBOX)).toBe(0);
    seat(state, 0, STRONGBOX);
    expect(applyCommand(state, buy(city, { kind: 'building', id: 'monument' })).ok).toBe(true);
    expect(tallyOf(sc, STRONGBOX)).toBe(1);
    expect(applyCommand(state, buy(city, { kind: 'unit', id: 'warrior' })).ok).toBe(true);
    expect(tallyOf(sc, STRONGBOX)).toBe(2);
    expect(paid(state, 'science')).toBe(2);
    expect(paid(state, 'culture')).toBe(2);
    // Off the chair it counts nothing and keeps what it counted.
    unseat(state, 0, STRONGBOX);
    expect(applyCommand(state, buy(city, { kind: 'building', id: 'shrine' })).ok).toBe(true);
    expect(tallyOf(sc, STRONGBOX)).toBe(2);
  });

  it('counts a hex, a trade route and a great-person draft bought with gold', () => {
    const state = bareState(24, 9);
    const home = foundCityAt(state, 0, at(state, 3, 4));
    foundCityAt(state, 0, at(state, 9, 4));
    home.buildings.push('market', 'market');
    playerById(state, 0)!.gold = 5000;
    bumpRevision(state);
    seat(state, 0, STRONGBOX);
    seat(state, 0, MERCHANT_PRINCES);
    const sc = playerById(state, 0)!.statecraft;
    const hex = applyCommand(state, { type: 'purchaseTile', playerId: 0, cityId: home.id, col: 4, row: 2 } as Command);
    expect(hex.ok, hex.ok ? '' : hex.error).toBe(true);
    expect(tallyOf(sc, STRONGBOX)).toBe(1);
    const ctx = tradeContext(state, 0);
    const row = ctx.rows.find((one) => one.from.id === home.id)!;
    const command = buyCommandFor(ctx, row, row.modes[0]!)!;
    const route = applyCommand(state, { type: 'buyRoute', playerId: 0, ...command } as Command);
    expect(route.ok, route.ok ? '' : route.error).toBe(true);
    expect(tallyOf(sc, STRONGBOX)).toBe(2);
    expect(greatPersonPurchaseError(state, 0, 'gold')).toBeNull();
    const draft = applyCommand(state, { type: 'purchaseGreatPersonOffer', playerId: 0, buys: 'gold' } as Command);
    expect(draft.ok, draft.ok ? '' : draft.error).toBe(true);
    expect(tallyOf(sc, STRONGBOX)).toBe(3);
  });

  it('does not count gold or faith given toward a build', () => {
    // A contribution buys nothing outright: it pours a bank into what the town
    // is already building (`contributeAt`, which calls `spendGold` alone).
    const { state, city } = town();
    seat(state, 0, STRONGBOX);
    setGold(state, 1000);
    playerById(state, 0)!.faithPool = 1000;
    city.queue = [{ kind: 'building', id: 'cathedral' }];
    bumpRevision(state);
    const sc = playerById(state, 0)!.statecraft;
    for (const currency of ['gold', 'faith'] as const) {
      expect(contributeError(state, 0, city.id, currency), currency).toBeNull();
      const pour = applyCommand(state, { type: 'contribute', playerId: 0, cityId: city.id, currency } as Command);
      expect(pour.ok, pour.ok ? '' : pour.error).toBe(true);
    }
    expect(playerById(state, 0)!.gold).toBeLessThan(1000);
    expect(tallyOf(sc, STRONGBOX)).toBe(0);
  });

  it('stops paying at fifteen of each', () => {
    const { state } = town();
    seat(state, 0, STRONGBOX);
    setGold(state, 1000);
    // Twenty purchases, through the one seam every purchase with gold uses.
    for (let i = 0; i < 20; i++) buyWithGold(state, playerById(state, 0)!, 10);
    expect(tallyOf(playerById(state, 0)!.statecraft, STRONGBOX)).toBe(20);
    expect(playerById(state, 0)!.gold).toBe(800);
    bumpRevision(state);
    expect(paid(state, 'science')).toBe(15);
    expect(paid(state, 'culture')).toBe(15);
  });

  it('says the moment and the cap on the card', () => {
    // Batch DS8: a Scaler. The keyword says that it counts only while seated.
    expect(describeCard(STRONGBOX).map((clause) => stripRefs(clause.text))).toEqual([
      'Scaler',
      'Gains +1 science and +1 culture each time you buy something with gold, up to +15 each',
    ]);
  });
});

// --- The Merchant Guilds -----------------------------------------------------

describe('The Merchant Guilds: routes counted from merchants', () => {
  it('opens one route for every two merchants, and counts no other trade', () => {
    const { state, city } = town();
    const before = routeSlots(state, 0);
    seat(state, 0, GUILDS);
    expect(routeSlots(state, 0)).toBe(before);
    city.specialists.scholar = 6;
    city.specialists.merchant = 3;
    bumpRevision(state);
    expect(routeSlots(state, 0)).toBe(before + 1);
    city.specialists.merchant = 4;
    bumpRevision(state);
    expect(routeSlots(state, 0)).toBe(before + 2);
    expect(explainRouteSlots(state, 0).map((line) => line.source)).toContain(
      'Order · The Merchant Guilds · ×2',
    );
  });

  it('says the trade on the card', () => {
    expect(describeCard(GUILDS).map((clause) => stripRefs(clause.text))).toEqual([
      '+1 trade route per 2 merchants in the trades',
    ]);
  });
});

// --- Mercenary Contracts -----------------------------------------------------

describe('Mercenary Contracts: a bought unit costs no upkeep for twenty turns', () => {
  /** The give-back lines the waiver writes this turn. */
  function waived(state: GameState): number {
    return explainUnitUpkeepRebate(state, 0)
      .filter((line) => line.source === 'Order · Mercenary Contracts')
      .reduce((sum, line) => sum + line.gold, 0);
  }

  function hangs(unit: Unit): boolean {
    return (unit.timed ?? []).some((entry) => entry.card === MERCENARIES && entry.effect.kind === 'upkeepRebate');
  }

  it('hangs the waiver on a military unit bought with gold while seated', () => {
    const { state, city } = town();
    seat(state, 0, MERCENARIES);
    setGold(state, 5000);
    const result = applyCommand(state, buy(city, { kind: 'unit', id: 'warrior' }));
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
    const bought = state.units.find((unit) => unit.ownerId === 0 && unit.type === 'warrior')!;
    expect(bought.timed).toEqual([
      { card: MERCENARIES, effect: { kind: 'upkeepRebate', free: true }, expiresTurn: state.turn + 20 },
    ]);
    // The gross still lists it, and the waiver gives back its whole price.
    expect(explainUnitUpkeep(state, 0).some((line) => line.unitId === bought.id)).toBe(true);
    expect(unitUpkeepOf(bought)).toBeGreaterThan(0);
    expect(waived(state)).toBe(unitUpkeepOf(bought));
    // In the treasury's own fold the bill and the give-back cancel.
    const gold = explainEmpireGold(state, 0);
    const bill = gold.find((line) => line.source.startsWith('Unit maintenance'))!.gold;
    const back = gold.find((line) => line.source === 'Order · Mercenary Contracts')!.gold;
    expect(bill).toBe(-unitUpkeepOf(bought));
    expect(bill + back).toBe(0);
  });

  it('covers faith too, and no unit that was built, given or afloat', () => {
    const { state } = town();
    seat(state, 0, MERCENARIES);
    const faith = createUnit(state, 0, 'knight', 6, 6, undefined, undefined, 'faith');
    const built = createUnit(state, 0, 'knight', 6, 5);
    const ship = createUnit(state, 0, 'trireme', 6, 4, undefined, undefined, 'gold');
    expect(hangs(faith)).toBe(true);
    expect(hangs(built)).toBe(false);
    expect(hangs(ship)).toBe(false);
    expect(waived(state)).toBe(unitUpkeepOf(faith));
  });

  it('writes nothing while the card is not seated', () => {
    const { state } = town();
    const unit = createUnit(state, 0, 'knight', 6, 6, undefined, undefined, 'gold');
    expect(unit.timed).toBeUndefined();
    expect(waived(state)).toBe(0);
  });

  it('keeps the waiver after the card leaves its chair, and ends it on the twentieth turn', () => {
    const { state } = town();
    seat(state, 0, MERCENARIES);
    const unit = createUnit(state, 0, 'knight', 6, 6, undefined, undefined, 'gold');
    unseat(state, 0, MERCENARIES);
    expect(waived(state)).toBe(unitUpkeepOf(unit));
    state.turn += 19;
    bumpRevision(state);
    expect(waived(state)).toBe(unitUpkeepOf(unit));
    state.turn += 1;
    bumpRevision(state);
    expect(waived(state)).toBe(0);
  });

  it('forgives a waived unit once, beside a law that would also free it', () => {
    const { state, city } = town();
    seat(state, 0, MERCENARIES);
    seat(state, 0, STANDING_ARMY);
    // Garrisoned, so The Standing Army would also free it.
    const unit = createUnit(state, 0, 'knight', city.col, city.row, undefined, undefined, 'gold');
    const rebates = explainUnitUpkeepRebate(state, 0);
    expect(rebates.reduce((sum, line) => sum + line.gold, 0)).toBe(unitUpkeepOf(unit));
    expect(rebates.map((line) => line.source)).toEqual(['Order · Mercenary Contracts']);
  });

  it('says the waiver on the card', () => {
    expect(describeCard(MERCENARIES).map((clause) => stripRefs(clause.text))).toEqual([
      'military units bought with gold cost no upkeep for 20 turns',
      'military units bought with faith cost no upkeep for 20 turns',
    ]);
  });
});
