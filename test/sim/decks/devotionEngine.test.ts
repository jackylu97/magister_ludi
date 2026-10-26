/**
 * **The Devotion engine's shapes** (batch DV3 of
 * `docs/plans/devotion-themes-triage.md`). `devotion.test.ts` checks the rows
 * against the sheet. This file checks what each new shape does on a small
 * board:
 *
 *   · the record of faith spent: `Player.faithSpent`, raised only by
 *     `spendFaith`, at the seven places faith leaves the bank, and the count
 *     `faithSpent` that The Book of Life reads (readings 13 and 33);
 *   · The Gifts of the Faithful: the `faithBuysBuildings` rule narrowed to the
 *     faith category of buildings (reading 14);
 *   · The Offering Chests: a purchase rider that reaches only the faith bank
 *     (reading 15);
 *   · The Creed: `beliefsHeld` counts the empire's own gods, and the follower
 *     and enhancer beliefs of the religions it is paid by (reading 16);
 *   · The Sacred Precincts: a counted city stat narrowed to one category of
 *     building (reading 17);
 *   · the shared The Rising Nave: the count of tenths of the current build,
 *     and the `building` field on the town scope `queueHolds` (reading 18).
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, queueItemCost, refreshCityDerived } from '../../../src/sim/cities';
import { getTileAt } from '../../../src/sim/map';
import {
  contributeAt,
  explainContribution,
  explainPurchaseCost,
  purchaseError,
  purchaseItemAt,
} from '../../../src/sim/purchase';
import {
  empireRiteAt,
  openFaithLadder,
  performRiteAt,
  planFaithRung,
  riteCostFor,
  riteError,
  settleReroll,
} from '../../../src/sim/religion';
import type { BeliefId, RiteId } from '../../../src/sim/religionData';
import { greatPersonOfferPrice, purchaseGreatPersonOfferAt } from '../../../src/sim/greatPeople';
import {
  type City,
  type GameState,
  type Player,
  bumpRevision,
  createUnit,
  playerById,
  spendFaith,
} from '../../../src/sim/state';
import {
  cardCityStat,
  countOf,
  describeCard,
  explainCardCityYields,
  explainCardPercentYields,
  stripRefs,
} from '../../../src/sim/statecraft';
import {
  type CardPaysEffect,
  type OrderId,
  DECK_FILE_ORDERS,
  orderDef,
  orderIsDealt,
  ordersForDecks,
} from '../../../src/sim/statecraftData';
import { at, bareState } from '../improvementHelpers';

/** Puts a card in a chair for this seat, the way the reading sees it. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
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

/** Gives the town a building straight off the shelf. */
function raise(state: GameState, city: City, building: string): void {
  if (!city.buildings.includes(building as never)) city.buildings.push(building as never);
  bumpRevision(state);
  refreshCityDerived(state, city);
}

/**
 * A religion founded by `founder`, whose holy site is the town's own centre.
 * The town's owner holds the site, so the owner is paid by it. Every citizen
 * of the town follows it.
 */
function religionAt(
  state: GameState,
  city: City,
  founder: number,
  beliefs: { pantheon?: string[]; follower?: string[]; enhancer?: string[] } = {},
): number {
  const tile = getTileAt(state.map, city.col, city.row)!;
  tile.improvement = 'holySite' as never;
  state.religions.push({
    id: state.religions.length,
    founderId: founder,
    name: 'The Testament',
    pantheon: beliefs.pantheon ?? [],
    follower: beliefs.follower ?? [],
    enhancer: beliefs.enhancer ?? [],
    foundedTurn: state.turn,
    holySite: { col: city.col, row: city.row },
  } as never);
  const religion = state.religions.length - 1;
  city.followers = { [religion]: city.population };
  bumpRevision(state);
  return religion;
}

/** What one card's town lines pay this town, in one voice. */
function townPays(state: GameState, city: City, card: string, voice: 'faith' | 'culture'): number {
  return explainCardCityYields(state, city)
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + ((line as unknown as Record<string, number>)[voice] ?? 0), 0);
}

/** The percentage one card puts on this town, in one voice. */
function townPercent(state: GameState, city: City, card: string, voice: string): number {
  return explainCardPercentYields(state, city)
    .filter((line) => line.card === card && line.yield === voice)
    .reduce((sum, line) => sum + line.percent, 0);
}

/** What one card adds to a town's defence. */
function defence(state: GameState, city: City, card: string): number {
  return cardCityStat(state, city, 'defense')
    .filter((line) => line.card === card)
    .reduce((sum, line) => sum + line.amount, 0);
}

/** The printed words of a card, marks stripped. */
function words(id: string): string[] {
  return describeCard(id as OrderId).map((clause) => stripRefs(clause.text));
}

/** The faith a seat has spent since `before`, read off the record. */
function spentSince(player: Player, before: number): number {
  return player.faithSpent - before;
}

describe('Devotion batch DV3: the record of faith spent', () => {
  it('starts at nought on every seat, the wild included', () => {
    const state = bareState(12, 10, true);
    for (const player of state.players) expect(player.faithSpent, player.name).toBe(0);
  });

  it('spendFaith takes the faith out of the bank and writes down what left it', () => {
    const state = bareState();
    const player = playerById(state, 0)!;
    player.faithPool = 100;
    spendFaith(state, player, 30);
    expect(player.faithPool).toBe(70);
    expect(player.faithSpent).toBe(30);
    // Clamped at zero, the record counts only what the bank held.
    spendFaith(state, player, 500, true);
    expect(player.faithPool).toBe(0);
    expect(player.faithSpent).toBe(100);
    // Nothing spent, nothing written.
    spendFaith(state, player, 0, true);
    expect(player.faithSpent).toBe(100);
  });

  it('is the one subtraction from the faith bank in the whole of src/sim', () => {
    // Every place faith leaves the bank goes through `spendFaith`, so The Book
    // of Life counts all seven (reading 13). A new subtraction elsewhere would
    // spend faith the record never sees, and fails here.
    const sources = {
      ...import.meta.glob('../../../src/sim/*.ts', { eager: true, query: '?raw', import: 'default' }),
      ...import.meta.glob('../../../src/sim/*/*.ts', { eager: true, query: '?raw', import: 'default' }),
    } as Record<string, string>;
    const writes: string[] = [];
    for (const [path, text] of Object.entries(sources)) {
      for (const [index, raw] of text.split('\n').entries()) {
        const code = raw.split('//')[0]!;
        if (code.trim().startsWith('*')) continue;
        if (/\.faithPool\s*(-=|=[^=])/.test(code)) {
          writes.push(`${path.replace(/^.*src\/sim\//, '')}:${index + 1}`);
        }
      }
    }
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatch(/^state\.ts:/);
    const state = Object.entries(sources).find(([path]) => path.endsWith('/sim/state.ts'))![1];
    const body = state.slice(state.indexOf('export function spendFaith('));
    expect(body.slice(0, body.indexOf('\n}\n'))).toMatch(/\.faithPool\s*=/);
  });

  it('counts a purchase and a contribution to a build', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5);
    const player = playerById(state, 0)!;
    player.faithPool = 100_000;
    slot(state, 0, 'theGiftsOfTheFaithful');
    const shrine = { kind: 'building', id: 'shrine' } as const;
    const price = explainPurchaseCost(state, 0, city.id, shrine, 'faith')!.total;
    expect(price).toBeGreaterThan(0);
    let before = player.faithSpent;
    purchaseItemAt(state, player, city, shrine as never, 'faith');
    expect(spentSince(player, before)).toBe(price);
    // Faith poured into the Magnum Opus.
    city.queue = [{ kind: 'building', id: 'theMagnumOpus' as never }];
    city.hammerBasket = 0;
    bumpRevision(state);
    const offer = explainContribution(state, 0, city.id, 'faith');
    expect(offer).not.toBeNull();
    before = player.faithSpent;
    contributeAt(state, player, city, 'faith');
    expect(spentSince(player, before)).toBe(offer!.spend);
  });

  it('counts a rite in a town and a rite over the realm once', () => {
    const state = bareState(20, 10);
    const city = town(state, 0, 4, 5);
    town(state, 0, 12, 5);
    const player = playerById(state, 0)!;
    const fasting = 'riteOfFasting' as RiteId;
    player.charteredRites.push(fasting);
    player.faithPool = 5000;
    expect(riteError(state, 0, city.id, fasting)).toBeNull();
    const cost = riteCostFor(state, 0);
    let before = player.faithSpent;
    performRiteAt(state, player, city, fasting);
    expect(spentSince(player, before)).toBe(cost);
    // A prophet's rite reaches both towns and is paid for once.
    const prophet = createUnit(state, 0, 'prophet', city.col, city.row);
    bumpRevision(state);
    const again = riteCostFor(state, 0);
    before = player.faithSpent;
    const done = empireRiteAt(state, player, prophet, fasting);
    expect(done.cities).toHaveLength(2);
    expect(spentSince(player, before)).toBe(again);
  });

  it('counts the gods the ladder buys and the rerolls of their hand', () => {
    const state = bareState();
    town(state, 0, 5, 5);
    const player = playerById(state, 0)!;
    player.faithPool = 5000;
    bumpRevision(state);
    const plan = planFaithRung(state, player);
    expect(plan).not.toBeNull();
    let before = player.faithSpent;
    openFaithLadder(state);
    expect(spentSince(player, before)).toBe(plan!.cost);
    expect(player.pantheon.pending).toBeDefined();
    // The first asking on a hand is free, and the second is paid for.
    let paid = 0;
    before = player.faithSpent;
    for (let asking = 0; asking < 2; asking++) paid += settleReroll(state, player)!.paid;
    expect(paid).toBeGreaterThan(0);
    expect(spentSince(player, before)).toBe(paid);
  });

  it('counts a great-person draft bought with faith', () => {
    const state = bareState();
    town(state, 0, 5, 5);
    const player = playerById(state, 0)!;
    player.faithPool = 100_000;
    bumpRevision(state);
    const before = player.faithSpent;
    purchaseGreatPersonOfferAt(state, player, 'faith');
    expect(spentSince(player, before)).toBe(greatPersonOfferPrice('faith'));
  });

  it('does not count gold, which keeps its own record', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5);
    const player = playerById(state, 0)!;
    player.gold = 100_000;
    const granary = { kind: 'building', id: 'granary' } as const;
    expect(purchaseError(state, 0, city.id, granary, 'gold')).toBeNull();
    purchaseItemAt(state, player, city, granary as never, 'gold');
    expect(player.goldSpent).toBeGreaterThan(0);
    expect(player.faithSpent).toBe(0);
  });
});

describe('Devotion batch DV3: The Book of Life', () => {
  it('pays +1% science and culture for every 150 faith spent, at most +30%', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5);
    const player = playerById(state, 0)!;
    slot(state, 0, 'theBookOfLife');
    const paidAfter = (spent: number): [number, number] => {
      player.faithSpent = spent;
      bumpRevision(state);
      return [
        townPercent(state, city, 'theBookOfLife', 'science'),
        townPercent(state, city, 'theBookOfLife', 'culture'),
      ];
    };
    expect(paidAfter(0)).toEqual([0, 0]);
    expect(paidAfter(149)).toEqual([0, 0]);
    expect(paidAfter(150)).toEqual([1, 1]);
    expect(paidAfter(1700)).toEqual([11, 11]);
    expect(paidAfter(4500)).toEqual([30, 30]);
    expect(paidAfter(100_000)).toEqual([30, 30]);
  });

  it('reads the record through the count, and prints it in a player’s words', () => {
    const state = bareState();
    const player = playerById(state, 0)!;
    player.faithSpent = 321;
    bumpRevision(state);
    const probe: CardPaysEffect = { kind: 'pays', where: 'city', basis: 'count', count: 'faithSpent' };
    expect(countOf(state, 0, 'theBookOfLife' as OrderId, probe)).toBe(321);
    expect(words('theBookOfLife')).toEqual([
      '+1% science in every city per 150 faith you have spent (at most +30% science)',
      '+1% culture in every city per 150 faith you have spent (at most +30% culture)',
    ]);
  });
});

describe('Devotion batch DV3: The Gifts of the Faithful', () => {
  it('opens the religious buildings to faith in every town, and nothing else', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5);
    const player = playerById(state, 0)!;
    player.faithPool = 100_000;
    const shrine = { kind: 'building', id: 'shrine' } as const;
    const temple = { kind: 'building', id: 'temple' } as const;
    const granary = { kind: 'building', id: 'granary' } as const;
    expect(purchaseError(state, 0, city.id, shrine, 'faith')).not.toBeNull();
    slot(state, 0, 'theGiftsOfTheFaithful');
    expect(purchaseError(state, 0, city.id, shrine, 'faith')).toBeNull();
    raise(state, city, 'shrine');
    expect(purchaseError(state, 0, city.id, temple, 'faith')).toBeNull();
    // A building of another category stays a gold purchase.
    expect(purchaseError(state, 0, city.id, granary, 'faith')).not.toBeNull();
    // A wonder of the faith keeps its own rules (reading 14).
    city.queue = [{ kind: 'building', id: 'stonehenge' as never }];
    bumpRevision(state);
    expect(purchaseError(state, 0, city.id, { kind: 'building', id: 'stonehenge' }, 'faith')).not.toBeNull();
    // At the faith rate, with no discount of its own.
    const price = explainPurchaseCost(state, 0, city.id, temple, 'faith')!;
    expect(price.lines.some((line) => /Gifts/.test(line.source))).toBe(false);
    expect(words('theGiftsOfTheFaithful')).toEqual(['religious buildings other than wonders may be bought with faith']);
  });
});

describe('Devotion batch DV3: The Offering Chests', () => {
  it('takes 30% off the faith price of a military unit, and nothing off its gold price', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5);
    const player = playerById(state, 0)!;
    player.faithPool = 100_000;
    player.gold = 100_000;
    // The Shrine Guards opens melee units to faith in a Shrine town.
    slot(state, 0, 'theShrineGuards');
    raise(state, city, 'shrine');
    const warrior = { kind: 'unit', id: 'warrior' } as const;
    expect(purchaseError(state, 0, city.id, warrior, 'faith')).toBeNull();
    const faith = explainPurchaseCost(state, 0, city.id, warrior, 'faith')!.total;
    const gold = explainPurchaseCost(state, 0, city.id, warrior, 'gold')!.total;
    slot(state, 0, 'theOfferingChests');
    const eased = explainPurchaseCost(state, 0, city.id, warrior, 'faith')!;
    expect(eased.total).toBe(Math.floor((faith * 70) / 100));
    expect(eased.lines.some((line) => line.source.includes('The Offering Chests'))).toBe(true);
    // A unit bought with gold pays the full price (reading 15).
    expect(explainPurchaseCost(state, 0, city.id, warrior, 'gold')!.total).toBe(gold);
  });

  it('leaves a civilian bought with faith at its full price', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5);
    const player = playerById(state, 0)!;
    player.faithPool = 100_000;
    slot(state, 0, 'consecratedLabor');
    raise(state, city, 'shrine');
    const worker = { kind: 'unit', id: 'worker' } as const;
    const plain = explainPurchaseCost(state, 0, city.id, worker, 'faith')!.total;
    slot(state, 0, 'theOfferingChests');
    expect(explainPurchaseCost(state, 0, city.id, worker, 'faith')!.total).toBe(plain);
    expect(words('theOfferingChests')).toEqual(['military units cost −30% to buy with faith']);
  });
});

describe('Devotion batch DV3: The Creed', () => {
  const GODS = ['goddessOfTheHarvest', 'keeperOfTheHearth'] as BeliefId[];

  it('counts the gods an empire holds before it founds a religion', () => {
    const state = bareState();
    const capital = town(state, 0, 5, 5);
    const player = playerById(state, 0)!;
    slot(state, 0, 'theCreed');
    expect(townPays(state, capital, 'theCreed', 'faith')).toBe(0);
    player.pantheon.beliefs.push(...GODS);
    bumpRevision(state);
    // Two gods at turn 32 pay +6 of each (the themes pass, section 4).
    expect(townPays(state, capital, 'theCreed', 'faith')).toBe(6);
    expect(townPays(state, capital, 'theCreed', 'culture')).toBe(6);
  });

  it('adds the follower and enhancer beliefs of its religion, and counts each god once', () => {
    const state = bareState();
    const capital = town(state, 0, 5, 5);
    const player = playerById(state, 0)!;
    player.pantheon.beliefs.push(...GODS);
    // The religion's pantheon is a copy of the founder's gods.
    religionAt(state, capital, 0, { pantheon: [...GODS], follower: ['pilgrimage'], enhancer: ['reliquaries'] });
    slot(state, 0, 'theCreed');
    expect(townPays(state, capital, 'theCreed', 'faith')).toBe(12);
    expect(townPays(state, capital, 'theCreed', 'culture')).toBe(12);
  });

  it('adds a captured holy city’s beliefs but not its founder’s gods', () => {
    const state = bareState(20, 10);
    const capital = town(state, 0, 4, 5);
    const taken = town(state, 0, 12, 5);
    const player = playerById(state, 0)!;
    player.pantheon.beliefs.push(GODS[0]!);
    // Seat 1 founded it, with three gods of its own; seat 0 holds the site.
    religionAt(state, taken, 1, {
      pantheon: ['starReaders', 'keeperOfTheCalendar', 'theStandingStones'],
      follower: ['pilgrimage'],
      enhancer: ['reliquaries'],
    });
    slot(state, 0, 'theCreed');
    // One god of its own, and the follower and the enhancer belief.
    expect(townPays(state, capital, 'theCreed', 'faith')).toBe(9);
    expect(words('theCreed')).toEqual([
      '+3 faith in your capital per god or belief you hold',
      '+3 culture in your capital per god or belief you hold',
    ]);
  });
});

describe('Devotion batch DV3: The Sacred Precincts', () => {
  it('gives a town +3 defence for every religious building in it, a faith wonder included', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5);
    slot(state, 0, 'theSacredPrecincts');
    expect(defence(state, city, 'theSacredPrecincts')).toBe(0);
    raise(state, city, 'shrine');
    expect(defence(state, city, 'theSacredPrecincts')).toBe(3);
    raise(state, city, 'temple');
    expect(defence(state, city, 'theSacredPrecincts')).toBe(6);
    // A building of another category does not count.
    raise(state, city, 'granary');
    expect(defence(state, city, 'theSacredPrecincts')).toBe(6);
    // A wonder of the faith counts, as The Painted Chapels counts it (reading 17).
    raise(state, city, 'stonehenge');
    expect(defence(state, city, 'theSacredPrecincts')).toBe(9);
    expect(words('theSacredPrecincts')).toEqual(['every city: +3 city defence per faith building there']);
  });

  it('counts only the town’s own buildings', () => {
    const state = bareState(20, 10);
    const walled = town(state, 0, 4, 5);
    const bare = town(state, 0, 12, 5);
    raise(state, walled, 'shrine');
    raise(state, walled, 'temple');
    slot(state, 0, 'theSacredPrecincts');
    expect(defence(state, walled, 'theSacredPrecincts')).toBe(6);
    expect(defence(state, bare, 'theSacredPrecincts')).toBe(0);
  });
});

describe('Devotion batch DV3: the shared The Rising Nave', () => {
  /** Puts a row at the front of the queue with this many hammers banked. */
  function building(state: GameState, city: City, id: string, share: number): number {
    city.queue = [{ kind: 'building', id: id as never }];
    const cost = queueItemCost(state, city.ownerId, city.queue[0]!)!;
    city.hammerBasket = Math.ceil(cost * share);
    bumpRevision(state);
    return cost;
  }

  it('pays +1 faith and +1 culture for every tenth of a Cathedral already built', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5);
    slot(state, 0, 'theRisingNave');
    building(state, city, 'cathedral', 0);
    expect(townPays(state, city, 'theRisingNave', 'faith')).toBe(0);
    building(state, city, 'cathedral', 0.35);
    expect(townPays(state, city, 'theRisingNave', 'faith')).toBe(3);
    expect(townPays(state, city, 'theRisingNave', 'culture')).toBe(3);
    building(state, city, 'cathedral', 0.95);
    expect(townPays(state, city, 'theRisingNave', 'faith')).toBe(9);
    // At most ten tenths, however full the basket.
    building(state, city, 'cathedral', 3);
    expect(townPays(state, city, 'theRisingNave', 'faith')).toBe(10);
  });

  it('pays toward a wonder and the Magnum Opus, and toward nothing else', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5);
    slot(state, 0, 'theRisingNave');
    building(state, city, 'pyramids', 0.55);
    expect(townPays(state, city, 'theRisingNave', 'faith')).toBe(5);
    // The Magnum Opus counts as a wonder here (reading 18).
    building(state, city, 'theMagnumOpus', 0.55);
    expect(townPays(state, city, 'theRisingNave', 'culture')).toBe(5);
    building(state, city, 'granary', 0.55);
    expect(townPays(state, city, 'theRisingNave', 'faith')).toBe(0);
    building(state, city, 'temple', 0.55);
    expect(townPays(state, city, 'theRisingNave', 'faith')).toBe(0);
  });

  it('reads only the front row of the queue', () => {
    const state = bareState();
    const city = town(state, 0, 5, 5);
    slot(state, 0, 'theRisingNave');
    city.queue = [
      { kind: 'building', id: 'granary' as never },
      { kind: 'building', id: 'cathedral' as never },
    ];
    city.hammerBasket = 10_000;
    bumpRevision(state);
    expect(townPays(state, city, 'theRisingNave', 'faith')).toBe(0);
  });

  it('is a shared Tier III card of Devotion and Magisterial, worded as the card', () => {
    const def = orderDef('theRisingNave' as OrderId);
    expect(DECK_FILE_ORDERS.common).toContain('theRisingNave');
    expect(def.decks).toEqual(['devotion', 'magisterial']);
    expect(def.band).toBe(3);
    expect(def.rarity).toBe('rare');
    expect(def.type).toBe('civic');
    expect(orderIsDealt('theRisingNave' as OrderId)).toBe(true);
    expect(ordersForDecks(['devotion'])).toContain('theRisingNave');
    expect(ordersForDecks(['magisterial'])).toContain('theRisingNave');
    expect(words('theRisingNave')[0]).toBe(
      '+1 faith in every city while it is building a wonder, a Cathedral or The Magnum Opus per 10% of the current build already done there',
    );
  });
});

describe('Devotion batch DV3: the new rows', () => {
  it('deals the four Devotion cards at their tiers, with their types', () => {
    const rows: [string, number, string, string][] = [
      ['theGiftsOfTheFaithful', 0, 'common', 'economic'],
      ['theSacredPrecincts', 1, 'common', 'military'],
      ['theBookOfLife', 2, 'uncommon', 'civic'],
      ['theOfferingChests', 3, 'common', 'military'],
    ];
    for (const [id, band, rarity, type] of rows) {
      const def = orderDef(id as OrderId);
      expect(DECK_FILE_ORDERS.devotion, id).toContain(id);
      expect(def.band, id).toBe(band);
      expect(def.rarity, id).toBe(rarity);
      expect(def.type, id).toBe(type);
      expect(orderIsDealt(id as OrderId), id).toBe(true);
      expect(ordersForDecks(['devotion']), id).toContain(id);
    }
  });

  it('gives each new row a plain note with no number and no identifier', () => {
    for (const id of [
      'theGiftsOfTheFaithful',
      'theSacredPrecincts',
      'theBookOfLife',
      'theOfferingChests',
      'theCreed',
      'theRisingNave',
    ]) {
      const note = orderDef(id as OrderId).note ?? '';
      expect(note.length, id).toBeGreaterThan(0);
      expect(note, id).not.toMatch(/\d/);
      expect(note, id).not.toMatch(/[a-z][A-Z]/);
    }
  });
});
