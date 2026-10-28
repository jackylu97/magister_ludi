/**
 * **Batch R2c: the Devotion cards of the user's review**
 * (`docs/plans/devotion-review-2026-10-28.md`, section "R2c: the cards").
 *
 * The user left comments on the Devotion sheet on 2026-10-28. This file
 * checks what the batch built from them:
 *
 *   · three cards retired, four moved from Tier 0 to Tier I;
 *   · three new cards, each on a shape that already existed (reading 7): The
 *     Tithe Barns, The Royal Cult and The Temple Storehouses;
 *   · the Cathedral School, the new religious building that Scholasticism
 *     opens in place of the early Cathedral and Apostle. It pays +2 science
 *     for each building in its town that supplies faith (batch R2b's
 *     `buildingsSupplying` count), and +2 more for each while the town keeps
 *     a rite (reading 9);
 *   · the words: each new row and the building print what they do, and the
 *     Compendium page of the Cathedral School reads as one.
 *
 * `devotion.test.ts` checks the rows against the sheet of record, and
 * `devotionThemeCards.test.ts` checks the charter's gate.
 *
 * Core, not slow: it reads the tables and plays a few verbs on small boards.
 */

import { describe, expect, it } from 'vitest';

import { BUILDING_IDS, buildingDef } from '../../../src/sim/buildingData';
import { foundCityAt, refreshCityDerived } from '../../../src/sim/cities';
import { performRiteAt } from '../../../src/sim/religion';
import type { RiteId } from '../../../src/sim/religionData';
import { type City, type GameState, bumpRevision, playerById } from '../../../src/sim/state';
import {
  type CardEffect,
  type CityScope,
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
  foldBuildingPackage,
  stripRefs,
} from '../../../src/sim/statecraft';
import { isUnlocked } from '../../../src/sim/tech';
import { BUILDING_UNLOCK_TECH, techDef } from '../../../src/sim/techData';
import { compendiumId, compendiumSections } from '../../../src/ui/compendium';
import { at, bareState } from '../improvementHelpers';

/** Puts a card in a chair for this seat. */
function slot(state: GameState, playerId: number, id: string): void {
  const sc = playerById(state, playerId)!.statecraft;
  const card = id as OrderId;
  if (!sc.orders.includes(card)) sc.orders.push(card);
  sc.slots.push({ card, sealedUntil: state.turn });
  bumpRevision(state);
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

/** What one source's town lines pay this town, in one voice. */
function townPays(
  state: GameState,
  city: City,
  source: string,
  voice: 'food' | 'production' | 'faith' | 'science',
): number {
  return explainCardCityYields(state, city)
    .filter((line) => line.card === source)
    .reduce((sum, line) => sum + line[voice], 0);
}

/** The printed words of a card or a building, marks stripped. */
function words(id: string): string[] {
  return describeCard(id as never).map((clause) => stripRefs(clause.text));
}

describe('the moves and the retirements', () => {
  it('retires three Devotion cards, with no type, dealt to nobody', () => {
    for (const id of ['theOldGodsRemain', 'theSacredPrecincts', 'theMonasticBuilders'] as OrderId[]) {
      const def = orderDef(id);
      expect(DECK_FILE_ORDERS.devotion, id).toContain(id);
      expect(def.retired, id).toBe(true);
      expect(def.type, id).toBeUndefined();
      expect(orderIsDealt(id), id).toBe(false);
      // The row keeps its effects, so a save that holds it still plays.
      expect(def.effects.length, id).toBeGreaterThan(0);
    }
  });

  it('moves four cards from Tier 0 to Tier I, keeping their text, rarity and type', () => {
    const moved: [string, string, string][] = [
      ['theFoundingVows', 'uncommon', 'wildcard'],
      ['theRogations', 'uncommon', 'civic'],
      ['theGiftsOfTheFaithful', 'common', 'economic'],
      ['theShrineGuards', 'common', 'military'],
    ];
    for (const [id, rarity, type] of moved) {
      const def = orderDef(id as OrderId);
      expect(def.band, id).toBe(1);
      expect(def.rarity, id).toBe(rarity);
      expect(def.type, id).toBe(type);
      expect(orderIsDealt(id as OrderId), id).toBe(true);
      expect(ordersForDecks(['devotion']), id).toContain(id);
    }
    // The Shrine Guards is still shared with Dominion.
    expect(orderDef('theShrineGuards' as OrderId).decks).toEqual(['dominion', 'devotion']);
    expect(ordersForDecks(['dominion'])).toContain('theShrineGuards');
  });
});

describe('the three new cards', () => {
  it('are Devotion rows at their tiers, with the rarity and type the spec gives', () => {
    const rows: [string, number, string, string][] = [
      ['theTitheBarns', 0, 'common', 'economic'],
      ['theRoyalCult', 0, 'uncommon', 'civic'],
      ['theTempleStorehouses', 1, 'common', 'economic'],
    ];
    for (const [id, band, rarity, type] of rows) {
      const def = orderDef(id as OrderId);
      expect(DECK_FILE_ORDERS.devotion, id).toContain(id);
      expect(def.decks, id).toEqual(['devotion']);
      expect([def.band, def.rarity, def.type], id).toEqual([band, rarity, type]);
      expect(orderIsDealt(id as OrderId), id).toBe(true);
      expect(def.flavor, id).toBeTruthy();
    }
  });

  it('The Tithe Barns gives a town with a Granary +1 faith and +1 production', () => {
    const state = bareState(20, 10);
    const barns = town(state, 0, 4, 5, 3);
    const bare = town(state, 0, 12, 5, 3);
    raise(state, barns, 'granary');
    slot(state, 0, 'theTitheBarns');
    expect(townPays(state, barns, 'theTitheBarns', 'faith')).toBe(1);
    expect(townPays(state, barns, 'theTitheBarns', 'production')).toBe(1);
    expect(townPays(state, bare, 'theTitheBarns', 'faith')).toBe(0);
    expect(townPays(state, bare, 'theTitheBarns', 'production')).toBe(0);
    expect(words('theTitheBarns')).toEqual(['+1 production, +1 faith in every city with a Granary']);
  });

  it('The Royal Cult gives the capital +1 faith for each citizen, and no other town anything', () => {
    const state = bareState(20, 10);
    const capital = town(state, 0, 4, 5, 6);
    const second = town(state, 0, 12, 5, 4);
    slot(state, 0, 'theRoyalCult');
    // Reading 6: a capital of six citizens makes six faith.
    expect(townPays(state, capital, 'theRoyalCult', 'faith')).toBe(6);
    expect(townPays(state, second, 'theRoyalCult', 'faith')).toBe(0);
    capital.population = 7;
    bumpRevision(state);
    expect(townPays(state, capital, 'theRoyalCult', 'faith')).toBe(7);
    expect(words('theRoyalCult')).toEqual(['+1 faith in your capital per citizen there']);
  });

  it('The Temple Storehouses gives a town with a Temple +2 food and +2 happiness', () => {
    const state = bareState(20, 10);
    const temple = town(state, 0, 4, 5, 3);
    const bare = town(state, 0, 12, 5, 3);
    raise(state, temple, 'shrine', 'temple');
    slot(state, 0, 'theTempleStorehouses');
    expect(townPays(state, temple, 'theTempleStorehouses', 'food')).toBe(2);
    expect(townPays(state, bare, 'theTempleStorehouses', 'food')).toBe(0);
    // Two happiness for the one town that holds a Temple.
    const happiness = cardHappiness(state, 0).filter((line) => line.card === 'theTempleStorehouses');
    expect(happiness.reduce((sum, line) => sum + line.amount, 0)).toBe(2);
    // The food is on the Temple (batch R2b's package), so a doubler on
    // temples doubles it.
    const onTemple = explainBuildingPackage(state, temple, 'temple').filter(
      (line) => line.card === 'theTempleStorehouses',
    );
    expect(foldBuildingPackage(onTemple).food).toBe(2);
    expect(words('theTempleStorehouses')).toEqual([
      '+2 food in every city with a Temple',
      '+2 happiness in every city with a Temple',
    ]);
  });
});

describe('the Cathedral School', () => {
  it('is a medium religious building that only Scholasticism opens', () => {
    const def = buildingDef('cathedralSchool');
    expect(def.name).toBe('Cathedral School');
    expect(def.category).toBe('faith');
    expect(def.size).toBe('medium');
    expect(def.unlockedByCard).toBeUndefined();
    expect(BUILDING_UNLOCK_TECH.get('cathedralSchool')).toBe('scholasticism');
    expect(techDef('scholasticism').unlocks.buildings).toEqual(['cathedralSchool']);
    // No yield of its own: it pays through its two counted lines.
    for (const voice of ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const) {
      expect(def[voice] ?? 0, voice).toBe(0);
    }
    const state = bareState();
    const city = town(state, 0, 5, 5, 4);
    const player = playerById(state, 0)!;
    player.techsResearched = player.techsResearched.filter((id) => id !== 'scholasticism');
    bumpRevision(state);
    expect(isUnlocked(state, 0, 'building', 'cathedralSchool', city)).toBe(false);
    player.charteredTechs.push('scholasticism');
    player.techsResearched.push('scholasticism');
    bumpRevision(state);
    expect(isUnlocked(state, 0, 'building', 'cathedralSchool', city)).toBe(true);
  });

  it('gives +2 science for each building in its town that supplies faith, itself included', () => {
    const state = bareState(20, 10);
    const school = town(state, 0, 4, 5, 4);
    const other = town(state, 0, 12, 5, 4);
    raise(state, school, 'cathedralSchool');
    // The school is a religious building, so it counts itself (reading 8).
    expect(townPays(state, school, 'cathedralSchool', 'science')).toBe(2);
    raise(state, school, 'shrine', 'temple');
    expect(townPays(state, school, 'cathedralSchool', 'science')).toBe(6);
    // A building of another category does not supply faith on its own.
    raise(state, school, 'library', 'granary');
    expect(townPays(state, school, 'cathedralSchool', 'science')).toBe(6);
    // A card that makes Libraries pay faith makes the Library supply it.
    slot(state, 0, 'theMonasteryLibraries');
    expect(townPays(state, school, 'cathedralSchool', 'science')).toBe(8);
    // Another town's religious buildings count for nothing here, and a town
    // without the school is paid nothing.
    raise(state, other, 'shrine', 'temple');
    expect(townPays(state, school, 'cathedralSchool', 'science')).toBe(8);
    expect(townPays(state, other, 'cathedralSchool', 'science')).toBe(0);
  });

  it('doubles the science while the town keeps a rite', () => {
    const state = bareState(20, 10);
    const school = town(state, 0, 4, 5, 4);
    raise(state, school, 'cathedralSchool', 'shrine', 'temple');
    expect(townPays(state, school, 'cathedralSchool', 'science')).toBe(6);
    const player = playerById(state, 0)!;
    const fasting = 'riteOfFasting' as RiteId;
    player.charteredRites.push(fasting);
    player.faithPool = 5000;
    performRiteAt(state, player, school, fasting);
    bumpRevision(state);
    // Reading 9: a second line of the same size, under a town keeping a rite.
    expect(townPays(state, school, 'cathedralSchool', 'science')).toBe(12);
    school.timed = [];
    bumpRevision(state);
    expect(townPays(state, school, 'cathedralSchool', 'science')).toBe(6);
  });

  it('prints both lines, the rite as a condition on the second', () => {
    expect(words('cathedralSchool')).toEqual([
      '+2 science per building in this city that supplies faith',
      '+2 science per building in this city that supplies faith, while it is keeping a rite',
    ]);
  });

  it('reads as one page in the Compendium', () => {
    const entries = compendiumSections().flatMap((section) => section.entries);
    const page = entries.find((entry) => entry.id === compendiumId('building', 'cathedralSchool'));
    expect(page).toBeDefined();
    const said = page!.clauses.map((clause) => stripRefs(clause.text));
    expect(said).toEqual([
      '+2 science per building in this city that supplies faith',
      '+2 science per building in this city that supplies faith, while it is keeping a rite',
      "Unlocked by researching Scholasticism, a charter technology that only an empire holding The Schoolmen's Charter may research.",
      buildingDef('cathedralSchool').note,
    ]);
    // The note is player prose: no number and no identifier.
    expect(buildingDef('cathedralSchool').note).not.toMatch(/\d/);
    expect(buildingDef('cathedralSchool').note).not.toMatch(/[a-z][A-Z]/);
  });
});

describe('a building’s own counted line and its scope', () => {
  /**
   * The describers print a building's own counted line as "in this city" and
   * take its `hasBuilding` tests out of the condition they print after it
   * (`hereCondition`). That is true only while every such test names the
   * building itself, so this walks every building row's counted lines.
   */
  it('names no building but its own in the scope of a counted line', () => {
    const named = (scope: CityScope | undefined, into: string[]): void => {
      if (scope === undefined) return;
      if (scope.test === 'hasBuilding') into.push(scope.building);
      if (scope.test === 'all' || scope.test === 'any') for (const inner of scope.of) named(inner, into);
    };
    const walk = (effects: readonly CardEffect[], id: string): void => {
      for (const effect of effects) {
        if (effect.kind === 'conditionRule') walk(effect.then, id);
        if (effect.kind !== 'pays' || effect.basis !== 'count') continue;
        const buildings: string[] = [];
        named(effect.scope, buildings);
        for (const building of buildings) expect(building, id).toBe(id);
      }
    };
    for (const id of BUILDING_IDS) walk(buildingDef(id).effects ?? [], id);
  });
});
