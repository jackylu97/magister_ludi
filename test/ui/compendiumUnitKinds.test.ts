/**
 * The kinds of unit and of improvement in the Compendium (the user,
 * 2026-11-22: "Unit classes yes", after the kinds of building).
 *
 * The same three claims as `compendiumBuildingKinds.test.ts`. A page of a kind
 * lists exactly what the simulation's own function admits (`unitMatches` for a
 * unit, `isGreatPersonWork` and `isUniqueImprovement` for an improvement). A
 * unit's entry names every kind it is of, each as a link. A card that names a
 * kind links the page of that kind.
 */

import { describe, expect, it } from 'vitest';

import {
  IMPROVEMENT_IDS,
  isGreatPersonWork,
  isUniqueImprovement,
} from '../../src/sim/improvementData';
import {
  IMPROVEMENT_KIND_PAGES,
  UNIT_KINDS,
  describeCard,
  filterWords,
  markBuildingKinds,
  stripRefs,
  unitMatches,
} from '../../src/sim/statecraft';
import { ORDER_IDS, orderDef } from '../../src/sim/statecraftData';
import { UNIT_TYPE_IDS } from '../../src/sim/unitData';
import { type CompendiumEntry, compendiumGroups, compendiumSections } from '../../src/ui/compendium';
import { shortDefinition } from '../../src/ui/keywordDefinitions';

const BOOK = compendiumSections();
const ENTRIES = new Map<string, CompendiumEntry>(
  BOOK.flatMap((section) => section.entries).map((entry) => [entry.id, entry]),
);

/** The rows a page lists: the first paragraph's links, by id. */
function linked(entry: CompendiumEntry, kind: string): string[] {
  const marks = new RegExp(`\\[\\[${kind}:([A-Za-z0-9_]+)\\|`, 'g');
  return [...entry.clauses[0]!.text.matchAll(marks)].map((found) => found[1]!);
}

/** A row that has a page and is in the game. */
function listed(kind: string, id: string): boolean {
  const entry = ENTRIES.get(`${kind}:${id}`);
  return entry !== undefined && entry.group !== 'Not in the game';
}

describe('the page of a kind of unit', () => {
  it('lists exactly the units the card filter admits, under the card’s own words', () => {
    for (const kind of UNIT_KINDS) {
      const page = ENTRIES.get(`unit:${kind.page}`);
      expect(page, kind.page).toBeDefined();
      expect(page!.name.toLowerCase(), kind.page).toBe(filterWords(kind.filter));
      const expected = UNIT_TYPE_IDS.filter(
        (id) => listed('unit', id) && unitMatches(id, kind.filter),
      );
      expect(linked(page!, 'unit').sort(), kind.page).toEqual([...expected].sort());
    }
  });

  it('stands first on the Units shelf, under one heading', () => {
    const shelf = BOOK.find((section) => section.id === 'unit')!;
    expect(compendiumGroups(shelf)[0]).toEqual({ name: 'Kinds of unit', count: UNIT_KINDS.length });
  });

  it('lists a unit of two kinds on both pages', () => {
    // A catapult is a siege unit, a military unit and a unit with a ranged attack.
    for (const page of ['setSiegeUnits', 'setMilitaryUnits', 'setRangedAttackUnits']) {
      expect(linked(ENTRIES.get(`unit:${page}`)!, 'unit'), page).toContain('catapult');
    }
    // And the ranged class is not every unit with a ranged attack.
    expect(linked(ENTRIES.get('unit:setRangedUnits')!, 'unit')).not.toContain('catapult');
  });

  it('gives a hover card the list', () => {
    const definition = shortDefinition(ENTRIES.get('unit:setMountedUnits')!);
    expect(definition.prose).toBe(true);
    expect(definition.lines[0]!.text).toContain('[[unit:horseman|');
  });
});

describe('a unit’s own entry', () => {
  it('names every kind it is of in its Kinds row, each a link to the page of the kind', () => {
    for (const id of UNIT_TYPE_IDS) {
      const kinds = ENTRIES.get(`unit:${id}`)!.rows.find((row) => row.label === 'Kinds')?.figures ?? '';
      for (const kind of UNIT_KINDS) {
        expect(kinds.includes(`[[unit:${kind.page}|`), `${id} · ${kind.page}`).toBe(
          unitMatches(id, kind.filter),
        );
      }
    }
    const horseman = ENTRIES.get('unit:horseman')!.rows.find((row) => row.label === 'Kinds')!;
    expect(stripRefs(horseman.figures)).toBe('Military units · Mounted units');
  });
});

describe('the two kinds of improvement', () => {
  it('list exactly what the simulation’s own tests admit', () => {
    const works = ENTRIES.get(`improvement:${IMPROVEMENT_KIND_PAGES.greatPersonWork}`)!;
    expect(linked(works, 'improvement').sort()).toEqual(
      IMPROVEMENT_IDS.filter((id) => listed('improvement', id) && isGreatPersonWork(id)).sort(),
    );
    // The Paradise Garden counts as a work, though a worker builds it.
    expect(linked(works, 'improvement')).toContain('paradiseGarden');
    const unique = ENTRIES.get(`improvement:${IMPROVEMENT_KIND_PAGES.uniqueImprovement}`)!;
    expect(linked(unique, 'improvement').sort()).toEqual(
      IMPROVEMENT_IDS.filter((id) => listed('improvement', id) && isUniqueImprovement(id)).sort(),
    );
  });
});

describe('a card that names a kind of unit or of improvement', () => {
  it('links the page of the kind, and its plain words do not change', () => {
    expect(markBuildingKinds('+2 combat strength for mounted units')).toBe(
      '+2 combat strength for [[unit:setMountedUnits|mounted units]]',
    );
    expect(markBuildingKinds('ships: +1 movement')).toBe('[[unit:setShips|ships]]: +1 movement');
    // The longer phrase is one link, and "warships" is not "ships".
    expect(markBuildingKinds('against ships that fire at a distance')).toBe(
      'against [[unit:setFiringShips|ships that fire at a distance]]',
    );
    expect(markBuildingKinds('light warships cost less')).toBe(
      '[[unit:setLightWarships|light warships]] cost less',
    );
    expect(markBuildingKinds('on every hex carrying a great person’s work')).toBe(
      'on every hex carrying a [[improvement:setGreatPersonWorks|great person’s work]]',
    );
    expect(stripRefs(markBuildingKinds('melee and ranged units gain +1 movement'))).toBe(
      'melee and ranged units gain +1 movement',
    );
  });

  it('says a different word for the two sets that were both "ranged units"', () => {
    expect(filterWords({ modelClass: 'ranged' })).toBe('ranged units');
    expect(filterWords({ ranged: true })).toBe('units with a ranged attack');
    expect(filterWords({ modelClass: 'melee' })).toBe('melee units');
    expect(filterWords({ ranged: false })).toBe('units with no ranged attack');
  });

  it('points every such link on every Order at a page the book has', () => {
    let links = 0;
    for (const id of ORDER_IDS) {
      if (orderDef(id).retired === true) continue;
      for (const clause of describeCard(id)) {
        for (const found of clause.text.matchAll(/\[\[(unit|improvement):(set[A-Za-z]+)\|/g)) {
          expect(ENTRIES.has(`${found[1]}:${found[2]}`), `${id} → ${found[2]}`).toBe(true);
          links += 1;
        }
      }
    }
    expect(links).toBeGreaterThan(0);
  });
});
