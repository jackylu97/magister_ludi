/**
 * **Batch R1, part A: three new moments, and the cards that read them** (the
 * user's rulings of 2026-11-11, `docs/flags.md` item (jjjjjjj)).
 *
 * What this file pins:
 *
 *   1. **a levy** is a moment (the `levy` windfall occasion). It is announced
 *      once for every levy, from `levyAt`, and carries the town and the
 *      production the levy paid. The Terraces of Moray grants science equal to
 *      half of it;
 *   2. **a purchase with gold** is a moment (the `goldPurchase` tally). It is
 *      written once for each purchase by `buyWithGold`, the one seam the four
 *      purchase verbs call. The Strongbox's own tests are in
 *      `test/sim/decks/commercePurse.test.ts`;
 *   3. **faith spent** is a moment (the `faithSpent` windfall occasion). It is
 *      announced from `spendFaith`, the one subtraction from the faith bank,
 *      and carries the faith that left the bank. The Pilgrim Staff grants
 *      culture equal to a fourth of it;
 *   4. the bots price the new card and the new moments.
 */

import { describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import { scoreEffects } from '../../src/ai/value';
import { foundCityAt, growthThreshold, refreshCityDerived } from '../../src/sim/cities';
import { type Command, applyCommand } from '../../src/sim/commands';
import { type City, type GameState, bumpRevision, buyWithGold, playerById, spendFaith } from '../../src/sim/state';
import { describeCard, stripRefs, windfallPayout } from '../../src/sim/statecraft';
import { draftCostFor, tallyOf } from '../../src/sim/statecraft/draft';
import { type OrderId, TALLY_OCCASIONS, orderDef, orderIsDealt } from '../../src/sim/statecraftData';
import { at, bareState } from './improvementHelpers';

const TERRACES = 'theTerracesOfMoray' as OrderId;
const PILGRIM_STAFF = 'thePilgrimStaff' as OrderId;
const STRONGBOX = 'theStrongbox' as OrderId;

/** Puts an Order in a chair for seat 0, the way the reading sees it. */
function seat(state: GameState, id: OrderId): void {
  const sc = playerById(state, 0)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** One town of the given size for seat 0 on the bare board, with an empty queue. */
function town(state: GameState, col: number, row: number, population: number): City {
  const city = foundCityAt(state, 0, at(state, col, row));
  city.population = population;
  city.largestSize = population;
  city.queue = [];
  refreshCityDerived(state, city);
  bumpRevision(state);
  return city;
}

function levy(state: GameState, city: City, use: string): ReturnType<typeof applyCommand> {
  return applyCommand(state, { type: 'levyCitizen', playerId: 0, cityId: city.id, use } as Command);
}

/** A seat with nothing under research, so a science windfall stays in the pool. */
function idle(state: GameState): void {
  const player = playerById(state, 0)!;
  player.researching = null;
  player.researchQueue = [];
  bumpRevision(state);
}

// --- 1. the levy -------------------------------------------------------------

describe('the levy moment', () => {
  it('is a windfall occasion, and The Terraces of Moray rides it and nothing else', () => {
    expect(orderDef(TERRACES).text).toBe('A levy also grants science equal to half its production.');
    expect(orderDef(TERRACES).effects).toEqual([
      {
        kind: 'windfallRider',
        occasion: 'levy',
        grant: { yield: 'science', amount: 0.5, fromOccasion: 'production' },
      },
    ]);
    // It grants no levy of its own, so it is dealt only beside a card that does.
    expect(orderDef(TERRACES).needsLevy).toBe(true);
    expect(orderIsDealt(TERRACES)).toBe(true);
  });

  it('carries the production a levy paid, and a grant scaled by it pays half', () => {
    const state = bareState();
    seat(state, TERRACES);
    const payout = windfallPayout(state, 0, 'levy', 0, 0, { townId: 1, production: 40 });
    expect(payout.grants.map((grant) => [grant.card, grant.yield, grant.amount])).toEqual([
      [TERRACES, 'science', 20],
    ]);
    // A levy that paid no production carries none, and the rider pays nothing.
    expect(windfallPayout(state, 0, 'levy', 0, 0, { townId: 1 }).grants).toEqual([]);
  });

  it('pays the science through the research settlement, for a levy of production here', () => {
    const state = bareState();
    const city = town(state, 5, 5, 6);
    seat(state, TERRACES);
    seat(state, 'levyOfTheLand' as OrderId);
    idle(state);
    const player = playerById(state, 0)!;
    const pool = player.sciencePool;
    const hammers = growthThreshold(5);
    expect(levy(state, city, 'production').ok).toBe(true);
    expect(player.sciencePool).toBe(pool + hammers / 2);
  });

  it('pays the science for a levy sent to the Magnum Opus, which pays production too', () => {
    const state = bareState(20, 10);
    const city = town(state, 3, 5, 6);
    const workshop = town(state, 11, 5, 3);
    workshop.queue = [{ kind: 'building', id: 'theMagnumOpus' }];
    bumpRevision(state);
    seat(state, TERRACES);
    seat(state, 'theCorvee' as OrderId);
    idle(state);
    const player = playerById(state, 0)!;
    const pool = player.sciencePool;
    const result = levy(state, city, 'opus');
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
    expect(player.sciencePool).toBe(pool + growthThreshold(5) / 2);
  });

  it('pays nothing for a levy that raises a unit', () => {
    const state = bareState();
    const city = town(state, 5, 5, 6);
    seat(state, TERRACES);
    seat(state, 'theMusterOfTheFields' as OrderId);
    idle(state);
    const player = playerById(state, 0)!;
    const pool = player.sciencePool;
    const before = state.units.length;
    const result = levy(state, city, 'muster');
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
    expect(state.units.length).toBe(before + 1);
    expect(player.sciencePool).toBe(pool);
  });

  it('is announced in one place, after the levy has paid', () => {
    const levies = source('levies.ts');
    expect(levies.match(/payOccasionRiders\(state, player, 'levy'/g)).toHaveLength(1);
    const body = levies.slice(levies.indexOf('export function levyAt('));
    expect(body.indexOf("'levy'")).toBeGreaterThan(body.indexOf('settleProductionWindfall'));
    expect(body.indexOf("'levy'")).toBeLessThan(body.indexOf('hangAftermaths(state, city)'));
    // The old science use is gone.
    expect(levies).not.toContain("case 'science'");
  });

  it('says the card in the game’s words', () => {
    expect(describeCard(TERRACES).map((clause) => stripRefs(clause.text))).toEqual([
      'a levy grants science equal to 50% of the production it paid',
    ]);
  });
});

// --- 2. the purchase with gold ----------------------------------------------------

describe('the purchase-with-gold moment', () => {
  it('is a tally, read by The Strongbox', () => {
    expect(TALLY_OCCASIONS).toContain('goldPurchase');
    expect(TALLY_OCCASIONS).not.toContain('treasuryHeld' as never);
    for (const effect of orderDef(STRONGBOX).effects) {
      expect(effect).toMatchObject({ kind: 'pays', count: 'tally', tally: 'goldPurchase', max: 15 });
    }
  });

  it('is written once for each purchase, however dear', () => {
    const state = bareState();
    town(state, 5, 5, 3);
    seat(state, STRONGBOX);
    const player = playerById(state, 0)!;
    player.gold = 500;
    buyWithGold(state, player, 300);
    buyWithGold(state, player, 1);
    expect(tallyOf(player.statecraft, STRONGBOX)).toBe(2);
    expect(player.gold).toBe(199);
    expect(player.goldSpent).toBe(301);
  });

  it('is announced by the four verbs that buy with gold, and not by a contribution', () => {
    // A register by source: `buyWithGold` is the one place the moment is
    // written, and `spendGold` has exactly two callers, `buyWithGold` and
    // `contributeAt`.
    const sim = simSources();
    const writers = Object.entries(sim).filter(([, text]) => text.includes("'goldPurchase'"));
    expect(writers.map(([path]) => path.split('/').pop())).toEqual(['state.ts', 'statecraftData.ts']);
    const callers = (needle: string): string[] =>
      Object.entries(sim)
        .flatMap(([path, text]) =>
          [...text.matchAll(new RegExp(`\\b${needle}\\(state, `, 'g'))].map(() => path.split('/').pop()!),
        )
        .sort();
    expect(callers('buyWithGold')).toEqual(['cities.ts', 'commands.ts', 'greatPeople.ts', 'purchase.ts']);
    expect(callers('spendGold')).toEqual(['purchase.ts', 'state.ts']);
    expect(body(sim, 'purchase.ts', 'contributeAt')).toContain('spendGold(state, player, offer.spend)');
    expect(body(sim, 'purchase.ts', 'contributeAt')).not.toContain('buyWithGold');
  });
});

// --- 3. faith spent ----------------------------------------------------------------

describe('the faith-spent moment', () => {
  it('is a windfall occasion, and The Pilgrim Staff rides it', () => {
    const def = orderDef(PILGRIM_STAFF);
    expect([def.decks, def.band, def.type, def.rarity]).toEqual([['devotion'], 1, 'civic', 'common']);
    expect(def.text).toBe('Spending faith grants culture equal to a fourth of it.');
    expect(def.flavor).toBeTruthy();
    expect(def.effects).toEqual([
      { kind: 'windfallRider', occasion: 'faithSpent', grant: { yield: 'culture', amount: 0.25, fromOccasion: 'faith' } },
    ]);
    expect(orderIsDealt(PILGRIM_STAFF)).toBe(true);
  });

  it('carries the faith that left the bank, and pays a fourth of it as culture at once', () => {
    const state = bareState();
    town(state, 5, 5, 3);
    seat(state, PILGRIM_STAFF);
    const player = playerById(state, 0)!;
    // The culture stays below the first draft's price, so no draft spends it.
    expect(draftCostFor(state, player)).toBeGreaterThan(6);
    player.faithPool = 100;
    player.culturePool = 0;
    bumpRevision(state);
    // The figure the moment pays: a fourth of the faith it carries.
    const payout = windfallPayout(state, 0, 'faithSpent', 0, 0, { faith: 40 });
    expect(payout.grants.map((grant) => [grant.card, grant.yield, grant.amount])).toEqual([
      [PILGRIM_STAFF, 'culture', 10],
    ]);
    spendFaith(state, player, 16);
    expect(player.faithPool).toBe(84);
    expect(player.faithSpent).toBe(16);
    expect(player.culturePool).toBe(4);
    // A spend the bank could not cover counts only what left it.
    player.faithPool = 8;
    bumpRevision(state);
    spendFaith(state, player, 100, true);
    expect(player.faithPool).toBe(0);
    expect(player.faithSpent).toBe(24);
    expect(player.culturePool).toBe(6);
    // A spend of nothing is no moment.
    spendFaith(state, player, 30, true);
    expect(player.culturePool).toBe(6);
  });

  it('fires from a command that spends faith, and pays nothing without the card', () => {
    const state = bareState();
    const city = town(state, 5, 5, 3);
    const player = playerById(state, 0)!;
    player.faithPool = 1000;
    player.culturePool = 0;
    bumpRevision(state);
    // Without the card, faith spent pays no culture.
    spendFaith(state, player, 20);
    expect(player.culturePool).toBe(0);
    seat(state, PILGRIM_STAFF);
    city.queue = [{ kind: 'building', id: 'cathedral' }];
    city.hammerBasket = 0;
    bumpRevision(state);
    const before = player.faithPool;
    const result = applyCommand(state, { type: 'contribute', playerId: 0, cityId: city.id, currency: 'faith' } as Command);
    expect(result.ok, result.ok ? '' : result.error).toBe(true);
    const spent = before - player.faithPool;
    expect(spent).toBeGreaterThan(0);
    expect(player.faithSpent).toBe(20 + spent);
    // The culture is a fourth of what left the bank, less any draft it paid for.
    const drafted = player.statecraft.drafts;
    expect(player.culturePool + (drafted > 0 ? draftCostFor(state, player, 0) : 0)).toBe(spent / 4);
  });

  it('is announced in one place, the one subtraction from the faith bank', () => {
    const sim = simSources();
    const announcers = Object.entries(sim).filter(([, text]) => text.includes("'faithSpent', undefined"));
    expect(announcers.map(([path]) => path.split('/').pop())).toEqual(['state.ts']);
    expect(body(sim, 'state.ts', 'spendFaith')).toContain("payOccasionRiders(state, player, 'faithSpent', undefined, { faith: paid })");
  });

  it('says the card in the game’s words', () => {
    expect(describeCard(PILGRIM_STAFF).map((clause) => stripRefs(clause.text))).toEqual([
      'spending faith grants culture equal to 25% of the faith spent',
    ]);
  });
});

// --- 4. the bots -------------------------------------------------------------------

describe('the bots’ price of the new card and moments', () => {
  it('prices The Pilgrim Staff at the faith a turn brings in', () => {
    const state = bareState();
    const city = town(state, 5, 5, 4);
    city.buildings.push('shrine', 'temple');
    refreshCityDerived(state, city);
    bumpRevision(state);
    const ctx = valueContext(state, playerById(state, 0)!);
    const worth = scoreEffects(orderDef(PILGRIM_STAFF).effects, ctx);
    expect(Number.isFinite(worth)).toBe(true);
    expect(worth).toBeGreaterThan(0);
  });

  it('prices The Terraces of Moray at nothing without a levy for production, and above nothing with one', () => {
    const state = bareState();
    town(state, 5, 5, 6);
    const player = playerById(state, 0)!;
    const effects = orderDef(TERRACES).effects;
    expect(scoreEffects(effects, valueContext(state, player))).toBe(0);
    seat(state, 'levyOfTheLand' as OrderId);
    const worth = scoreEffects(effects, valueContext(state, player));
    expect(Number.isFinite(worth)).toBe(true);
    expect(worth).toBeGreaterThan(0);
  });

  it('prices The Strongbox finitely', () => {
    const state = bareState();
    town(state, 5, 5, 4);
    const ctx = valueContext(state, playerById(state, 0)!);
    expect(Number.isFinite(scoreEffects(orderDef(STRONGBOX).effects, ctx, STRONGBOX))).toBe(true);
  });
});

// --- the sources -------------------------------------------------------------------

function simSources(): Record<string, string> {
  return import.meta.glob(['../../src/sim/*.ts', '../../src/sim/*/*.ts'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
}

function source(name: string): string {
  const sim = simSources();
  return sim[Object.keys(sim).find((path) => path.endsWith(`/${name}`))!]!;
}

/** One exported function's text, from its head to the next export. */
function body(sim: Record<string, string>, file: string, fn: string): string {
  const text = sim[Object.keys(sim).find((path) => path.endsWith(`/${file}`))!]!;
  const start = text.indexOf(`export function ${fn}(`);
  expect(start, `${file}: ${fn}`).toBeGreaterThanOrEqual(0);
  const end = text.indexOf('\nexport ', start + 1);
  return text.slice(start, end === -1 ? undefined : end);
}
