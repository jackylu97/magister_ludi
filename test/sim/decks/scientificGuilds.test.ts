/**
 * **Scientific batch S2, feature A: the trades as a card quantity**
 * (`docs/plans/scientific-build-triage.md`, the S2 section;
 * `docs/plans/scientific-themes.md`, section 6).
 *
 * The `guilds` phase moves citizens into the trades (`City.specialists`). The
 * new count `guildsmen` lets a card read them: by family or all of them, in
 * one town (`within: 'city'`) or across the empire. One card reads it today,
 * The Scholars' Guild. What this file checks:
 *
 *   - the count, at both scales and with and without a family;
 *   - The Scholars' Guild on a board: each scholar in the trades pays its own
 *     town +1 food and +1 production, and the other trades pay nothing;
 *   - the words the describers print, and the row itself.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, refreshCityDerived } from '../../../src/sim/cities';
import { getTileAt } from '../../../src/sim/map';
import { runGuilds } from '../../../src/sim/guilds';
import { type City, type GameState, bumpRevision, playerById } from '../../../src/sim/state';
import { countOf, describeCard, describeEffects, stripRefs } from '../../../src/sim/statecraft';
import { type CardPaysEffect, type OrderId, orderDef, orderIsDealt } from '../../../src/sim/statecraftData';
import { guildThreshold, totalSpecialists } from '../../../src/sim/specialists';
import { explainCity, foldCity } from '../../../src/sim/yields/town';
import { found, game } from '../statecraftHelpers';

const GUILD: OrderId = 'theScholarsGuild';

/** Grants a card and seats it, the way `scientific.test.ts` does. */
function slot(state: GameState, playerId: number, id: OrderId): void {
  const sc = playerById(state, playerId)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Sets a town's guildsmen, and tells the town and the memo. */
function staff(state: GameState, city: City, held: Partial<City['specialists']>): void {
  city.specialists = { scholar: 0, merchant: 0, engineer: 0, artist: 0, ...held };
  refreshCityDerived(state, city);
  bumpRevision(state);
}

/** A second town for the seat, four hexes along from its first. */
function secondTown(state: GameState, first: City): City {
  const tile = getTileAt(state.map, first.col + 4, first.row)!;
  const city = foundCityAt(state, first.ownerId, tile);
  bumpRevision(state);
  return city;
}

/** A guildsmen count, as a row would carry it. */
function guildsmen(within?: 'city', family?: CardPaysEffect['family']): CardPaysEffect {
  return {
    kind: 'pays',
    where: 'city',
    basis: 'count',
    to: 'food',
    amount: 1,
    count: 'guildsmen',
    ...(within === undefined ? {} : { within }),
    ...(family === undefined ? {} : { family }),
  };
}

/** The Scholars' Guild's lines on one town's ledger. */
function guildLines(state: GameState, city: City) {
  return explainCity(state, city).lines.filter((line) => line.source.startsWith("Order · The Scholars' Guild"));
}

describe('the guildsmen count', () => {
  it('counts one trade or every trade, in one town or across the realm', () => {
    const g = game();
    const home = found(g.state, 0);
    home.population = 10;
    staff(g.state, home, { scholar: 2, merchant: 1 });
    const away = secondTown(g.state, home);
    away.population = 6;
    staff(g.state, away, { scholar: 1, artist: 1 });

    const ask = (effect: CardPaysEffect, city?: City): number => countOf(g.state, 0, GUILD, effect, city);
    // One town, one trade, and every trade.
    expect(ask(guildsmen('city', 'scholar'), home)).toBe(2);
    expect(ask(guildsmen('city', 'merchant'), home)).toBe(1);
    expect(ask(guildsmen('city'), home)).toBe(3);
    expect(ask(guildsmen('city', 'scholar'), away)).toBe(1);
    // The realm: every town of the seat, one trade or all of them.
    expect(ask(guildsmen(undefined, 'scholar'))).toBe(3);
    expect(ask(guildsmen())).toBe(5);
    // A general has no trade, and a town-scoped row asked with no town counts
    // nothing.
    expect(ask(guildsmen('city', 'general'), home)).toBe(0);
    expect(ask(guildsmen('city', 'scholar'))).toBe(0);
    // Another empire's guildsmen are not this seat's.
    expect(countOf(g.state, 1, GUILD, guildsmen(undefined, 'scholar'))).toBe(0);
  });

  it('follows the guilds phase: a citizen who joins a trade is counted at once', () => {
    const g = game();
    const city = found(g.state, 0);
    city.population = 12;
    city.buildings.push('library');
    refreshCityDerived(g.state, city);
    expect(countOf(g.state, 0, GUILD, guildsmen('city', 'scholar'), city)).toBe(0);
    // A bar exactly full: the next phase seats one citizen in the trade the
    // Library names, which is the scholars'.
    city.guildBasket = guildThreshold(city);
    runGuilds(g.state);
    expect(totalSpecialists(city)).toBe(1);
    expect(city.specialists.scholar).toBe(1);
    expect(countOf(g.state, 0, GUILD, guildsmen('city', 'scholar'), city)).toBe(1);
  });
});

describe("The Scholars' Guild", () => {
  it('pays each town +1 food and +1 production for each scholar in the trades there', () => {
    const g = game();
    const home = found(g.state, 0);
    home.population = 10;
    staff(g.state, home, { scholar: 2, merchant: 1 });
    const away = secondTown(g.state, home);
    away.population = 6;
    staff(g.state, away, { merchant: 2 });

    const homeBefore = foldCity(g.state, home);
    const awayBefore = foldCity(g.state, away);
    expect(guildLines(g.state, home)).toEqual([]);
    slot(g.state, 0, GUILD);

    // Two scholars at home: two food and two production, as two labelled lines.
    const lines = guildLines(g.state, home);
    expect(lines.reduce((sum, line) => sum + line.food, 0)).toBe(2);
    expect(lines.reduce((sum, line) => sum + line.production, 0)).toBe(2);
    const homeAfter = foldCity(g.state, home);
    expect(homeAfter.food).toBe(homeBefore.food + 2);
    // The other town has merchants only, so the card pays it nothing.
    expect(guildLines(g.state, away)).toEqual([]);
    expect(foldCity(g.state, away)).toEqual(awayBefore);

    // A third scholar at home adds one more of each.
    staff(g.state, home, { scholar: 3, merchant: 1 });
    const more = guildLines(g.state, home);
    expect(more.reduce((sum, line) => sum + line.food, 0)).toBe(3);
    expect(more.reduce((sum, line) => sum + line.production, 0)).toBe(3);
  });

  it('is a dealt Tier II economic card that pays a town by a count', () => {
    const def = orderDef(GUILD);
    expect(orderIsDealt(GUILD)).toBe(true);
    expect(def.decks).toEqual(['scientific']);
    expect(def.band).toBe(2);
    expect(def.rarity).toBe('uncommon');
    expect(def.type).toBe('economic');
    expect(def.deferred).toBeUndefined();
    expect(def.text).toBe('Scholars in the trades also pay +1 food and +1 production.');
    for (const effect of def.effects) {
      expect(effect.kind).toBe('pays');
      if (effect.kind !== 'pays') continue;
      expect(effect.count).toBe('guildsmen');
      expect(effect.family).toBe('scholar');
      expect(effect.within).toBe('city');
    }
  });

  it('is said in a first-time player’s words', () => {
    expect(describeCard(GUILD).map((clause) => stripRefs(clause.text))).toEqual([
      '+1 food in every city per scholar in the trades there',
      '+1 production in every city per scholar in the trades there',
    ]);
    // A row naming no trade counts every citizen in the trades.
    const all = describeEffects([{ ...guildsmen('city'), to: 'culture' }]).map((clause) => stripRefs(clause.text));
    expect(all).toEqual(['+1 culture in every city per citizen in the trades there']);
  });
});
