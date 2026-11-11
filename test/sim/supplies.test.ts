import { afterEach, describe, expect, it } from 'vitest';

import { type BuildingId, buildingDef, buildingRowSupplies } from '../../src/sim/buildingData';
import { explainPurchaseCost } from '../../src/sim/purchase';
import { greatPersonDef } from '../../src/sim/greatPeopleData';
import { type City, type GameState, bumpRevision, playerById } from '../../src/sim/state';
import {
  type CardEffect,
  type CardPaysEffect,
  type OrderId,
  ORDER_IDS,
  orderDef,
} from '../../src/sim/statecraftData';
import {
  buildingSupplies,
  cardHappiness,
  cardRenownLines,
  countOf,
  describeCard,
  describeEffects,
  explainBuildingPackage,
  explainCardCityYields,
  foldBuildingPackage,
  stripRefs,
} from '../../src/sim/statecraft';
import { townBuildings } from '../../src/sim/statecraft/evaluator';
import { explainCardBuildingYields } from '../../src/sim/yields/town';
import { compendiumSections } from '../../src/ui/compendium';
import { found, game } from './statecraftHelpers';

/**
 * **Batch R2d: "supplies" means one thing across the game**
 * (`docs/plans/devotion-review-2026-10-28.md`, section R2d).
 *
 * The user, 2026-10-28: *"ok yeah, we should use the 'supplies' keyword
 * across the game."* Every reader that asks whether a building pays a yield
 * asks `buildingSupplies`: the building belongs to that yield's category, or
 * its package pays it. This file checks:
 *
 *   · a building's own counted lines are in its package (the Cathedral
 *     School), and a count of suppliers inside a package still ends;
 *   · a building share's `pays` selector reaches every building that
 *     supplies the voice, and ends;
 *   · the four rows that counted `scienceBuildings` count the buildings that
 *     supply science;
 *   · al-Khwārizmī's faith purchase asks the same question;
 *   · the word is marked where a card means the test, and the mark opens the
 *     Concepts page that defines it.
 *
 * The bots' price of a share over the package is in `aiAppraisal.test.ts`,
 * beside the other engine shapes. Core, not slow: small boards and the tables.
 */

/** Undo steps for rows the tests dress, run after each test. */
const restores: (() => void)[] = [];

afterEach(() => {
  while (restores.length > 0) restores.pop()!();
});

/** The Orders the tests dress, in table order. */
const CARD_A = ORDER_IDS[0]!;
const CARD_B = ORDER_IDS[1]!;

/** Puts an Order in a chair for seat 0, wearing effects of the test's choosing. */
function seat(state: GameState, id: OrderId, effects?: CardEffect[]): void {
  if (effects !== undefined) {
    const def = orderDef(id) as { effects: CardEffect[] };
    const held = def.effects;
    def.effects = effects;
    restores.push(() => {
      def.effects = held;
    });
  }
  const sc = playerById(state, 0)!.statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** Gives seat 0 a great person's legacy without spending a piece. */
function bear(state: GameState, id: string): void {
  playerById(state, 0)!.legacies.push({ id: id as never, age: 1 });
  bumpRevision(state);
}

/** A bench town for seat 0 that holds these buildings. */
function town(...buildings: string[]): { state: GameState; city: City } {
  const g = game(905);
  const city = found(g.state, 0);
  for (const id of buildings) city.buildings.push(id as BuildingId);
  bumpRevision(g.state);
  return { state: g.state, city };
}

/** How many buildings in this town supply this voice, through the count itself. */
function suppliers(state: GameState, city: City, voice: CardPaysEffect['voice']): number {
  const probe: CardPaysEffect = {
    kind: 'pays',
    where: 'city',
    basis: 'count',
    count: 'buildingsSupplying',
    voice,
    within: 'city',
  };
  return countOf(state, 0, CARD_A, probe, city);
}

/** What one source's town lines pay this town, in one voice. */
function townPays(state: GameState, city: City, source: string, voice: 'faith' | 'science' | 'food'): number {
  return explainCardCityYields(state, city)
    .filter((line) => line.card === source)
    .reduce((sum, line) => sum + line[voice], 0);
}

/** "+1 faith on the Library", written by scope. */
const FAITH_ON_LIBRARY: CardEffect = {
  kind: 'pays',
  where: 'city',
  faith: 1,
  scope: { test: 'hasBuilding', building: 'library' },
};

describe('a building’s own counted lines are in its package', () => {
  it('holds the Cathedral School’s science, and its count of faith suppliers ends', () => {
    const { state, city } = town('cathedralSchool', 'shrine', 'temple');
    const faith = suppliers(state, city, 'faith');
    // The school, the Shrine and the Temple at least: all three are faith
    // buildings, and the school counts itself.
    expect(faith).toBeGreaterThanOrEqual(3);
    // The school's own counted line is on it, whole, as the town banks it.
    const own = explainBuildingPackage(state, city, 'cathedralSchool').filter(
      (line) => line.card === 'cathedralSchool',
    );
    expect(own).toHaveLength(1);
    expect(own[0]!.science).toBe(2 * faith);
    expect(townPays(state, city, 'cathedralSchool', 'science')).toBe(2 * faith);
    expect(buildingSupplies(state, city, 'cathedralSchool', 'science')).toBe(true);
  });

  it('lets a doubler on the school double its counted science', () => {
    const { state, city } = town('cathedralSchool', 'shrine', 'temple');
    const science = foldBuildingPackage(explainBuildingPackage(state, city, 'cathedralSchool')).science;
    expect(science).toBeGreaterThan(0);
    seat(state, CARD_A, [{ kind: 'buildingYieldPercent', building: 'cathedralSchool', percent: 100 }]);
    const doubled = explainCardBuildingYields(state, city).find((line) => line.card === CARD_A)!;
    expect(doubled.science).toBe(science);
  });

  it('ends when a building’s own count asks whether the building itself supplies that voice', () => {
    // The Library made to pay +1 faith for each building in its town that
    // supplies faith. Reading its package asks the count, the count asks the
    // Library whether it supplies faith, and that reads its package again.
    // Inside that second reading the depth guard answers from the rows, so
    // the reading ends one step down: the Library's line counts the faith
    // buildings by their rows, which makes the Library supply faith, so the
    // outer count includes the Library too.
    const def = buildingDef('library') as { effects?: CardEffect[] };
    const held = def.effects;
    def.effects = [
      {
        kind: 'pays',
        where: 'city',
        basis: 'count',
        count: 'buildingsSupplying',
        voice: 'faith',
        within: 'city',
        to: 'faith',
        amount: 1,
        scope: { test: 'hasBuilding', building: 'library' },
      },
    ];
    restores.push(() => {
      def.effects = held;
    });
    const { state, city } = town('library', 'temple');
    const byRows = townBuildings(state, city).filter((id) => buildingRowSupplies(id, 'faith')).length;
    expect(byRows).toBeGreaterThanOrEqual(1);
    // The town counts the Library among the buildings that supply faith.
    expect(buildingSupplies(state, city, 'library', 'faith')).toBe(true);
    expect(suppliers(state, city, 'faith')).toBe(byRows + 1);
    // And the package holds the line exactly as the town banks it.
    const own = explainBuildingPackage(state, city, 'library').filter((line) => line.card === 'library');
    expect(own).toHaveLength(1);
    expect(own[0]!.faith).toBe(byRows + 1);
    expect(townPays(state, city, 'library', 'faith')).toBe(byRows + 1);
  });
});

describe('a building share selected by the voice its buildings supply', () => {
  it('reaches a building whose faith comes only from a card, ends, and pays', () => {
    const { state, city } = town('library');
    seat(state, CARD_A, [{ kind: 'buildingYieldPercent', pays: 'faith', percent: 100 }]);
    const before = explainCardBuildingYields(state, city).find((line) => line.card === CARD_A);
    expect(before?.faith ?? 0).toBe(0);
    seat(state, CARD_B, [FAITH_ON_LIBRARY]);
    const library = foldBuildingPackage(explainBuildingPackage(state, city, 'library'));
    expect(library.faith).toBe(1);
    const after = explainCardBuildingYields(state, city).find((line) => line.card === CARD_A)!;
    // The share names no voice, so it doubles the whole package of every
    // building it reaches: the Library's card faith and its own science.
    expect(after.faith).toBe(1);
    expect(after.science).toBeGreaterThanOrEqual(library.science);
  });

  it('reaches a faith building that pays no faith of its own', () => {
    // The Almshouse is a faith building whose row pays culture and no faith.
    expect(buildingDef('almshouse').category).toBe('faith');
    expect(buildingDef('almshouse').faith ?? 0).toBe(0);
    const { state, city } = town('almshouse');
    seat(state, CARD_A, [{ kind: 'buildingYieldPercent', pays: 'faith', percent: 100 }]);
    const line = explainCardBuildingYields(state, city).find((one) => one.card === CARD_A)!;
    expect(line.culture).toBeGreaterThanOrEqual(buildingDef('almshouse').culture);
  });
});

describe('the rows that counted science buildings', () => {
  it('count the buildings that supply science, and no row counts `scienceBuildings`', () => {
    const rows: CardEffect[] = [
      ...greatPersonDef('maimonides').legacy,
      ...greatPersonDef('aryabhata').legacy,
      ...orderDef('theRoyalTutors' as OrderId).effects,
      ...orderDef('theCommonTables' as OrderId).effects,
    ];
    expect(rows).toHaveLength(4);
    for (const effect of rows) {
      expect('count' in effect && effect.count).toBe('buildingsSupplying');
      expect('voice' in effect && effect.voice).toBe('science');
    }
  });

  it('Āryabhaṭa pays for a science building with no science of its own, and for a building a card makes pay science', () => {
    // The Examination Court is a science building whose row pays nothing.
    expect(buildingDef('examinationCourt').category).toBe('science');
    expect(buildingDef('examinationCourt').science).toBe(0);
    const { state, city } = town('library');
    bear(state, 'aryabhata');
    const base = suppliers(state, city, 'science');
    expect(townPays(state, city, 'aryabhata', 'faith')).toBe(2 * base);
    city.buildings.push('examinationCourt');
    bumpRevision(state);
    expect(townPays(state, city, 'aryabhata', 'faith')).toBe(2 * (base + 1));
    // A Temple pays no science by its row; a card that puts science on it
    // makes it supply science.
    city.buildings.push('temple');
    bumpRevision(state);
    expect(townPays(state, city, 'aryabhata', 'faith')).toBe(2 * (base + 1));
    seat(state, CARD_B, [
      { kind: 'pays', where: 'city', science: 1, scope: { test: 'hasBuilding', building: 'temple' } },
    ]);
    expect(townPays(state, city, 'aryabhata', 'faith')).toBe(2 * (base + 2));
  });

  it('The Common Tables and The Royal Tutors read the town’s count, and Maimonides the realm’s', () => {
    const { state, city } = town('library', 'examinationCourt');
    const here = suppliers(state, city, 'science');
    expect(here).toBeGreaterThanOrEqual(2);
    seat(state, 'theCommonTables' as OrderId);
    expect(townPays(state, city, 'theCommonTables', 'food')).toBe(2 * here);
    seat(state, 'theRoyalTutors' as OrderId);
    const tutors = cardRenownLines(state, 0).find((line) => line.card === 'theRoyalTutors');
    // Two renown a building since batch DS6 changed The Royal Tutors.
    expect(tutors?.amount).toBe(2 * here);
    bear(state, 'maimonides');
    const happiness = cardHappiness(state, 0).find((line) => line.card === 'maimonides');
    expect(happiness?.amount).toBe(here);
  });
});

describe('al-Khwārizmī’s faith purchase', () => {
  it('sells a science building with no science on its row', () => {
    // The Monument, read for this test as a science building: its row pays
    // culture and no science, so only its category can make it supply science.
    const def = buildingDef('monument') as { category: string };
    const held = def.category;
    const { state, city } = town();
    const monument = { kind: 'building', id: 'monument' } as const;
    playerById(state, 0)!.faithPool = 5000;
    bear(state, 'alKhwarizmi');
    expect(explainPurchaseCost(state, 0, city.id, monument, 'faith')).toBeNull();
    def.category = 'science';
    restores.push(() => {
      def.category = held;
    });
    bumpRevision(state);
    expect(buildingSupplies(state, city, 'monument', 'science')).toBe(true);
    expect(explainPurchaseCost(state, 0, city.id, monument, 'faith')?.currency).toBe('faith');
  });
});

describe('the word', () => {
  it('marks "supplies" where a card means the test, and the mark opens the Concepts page', () => {
    const raw = describeCard('aristotle' as never).map((clause) => clause.text);
    expect(raw.join(' ')).toContain('[[concept:supplies|supply]]');
    const school = describeCard('cathedralSchool' as never).map((clause) => clause.text);
    expect(school[0]).toContain('[[concept:supplies|supplies]]');
    const page = compendiumSections()
      .flatMap((section) => section.entries)
      .find((entry) => entry.id === 'concept:supplies');
    expect(page).toBeDefined();
    // The first paragraph is the definition a keyword's hover card shows.
    expect(page!.clauses[0]!.text).toMatch(/^A building supplies a yield if/);
    for (const clause of page!.clauses) expect(clause.text).not.toMatch(/\d/);
  });

  it('leaves the mirror’s ratified "supply" unmarked, since a mirror puts nothing on a building', () => {
    // The old Curia's mirror, written here: no live row carries the clause
    // since batch G1, and its describer stays with its arm.
    const row = {
      kind: 'pays',
      where: 'city',
      basis: 'mirror',
      to: 'science',
      from: 'faith',
      category: 'faith',
    } as CardEffect;
    const raw = describeEffects([row]).map((clause) => clause.text);
    const mirror = raw.find((text) => stripRefs(text).includes('equal to their faith'))!;
    expect(mirror).toContain('faith buildings supply science equal to their faith');
    expect(mirror).not.toContain('[[concept:');
  });
});
