/**
 * The kinds of building in the Compendium (the user, 2026-11-22: "many of the
 * public works are labelled as food buildings. Could we add sections to the
 * buildings list that break down the types of building by type ... so that
 * it's clear what certain orders are referring to", and "also, defensive
 * buildings").
 *
 * Three claims. A page of a kind lists exactly the buildings the simulation's
 * own function says are of the kind. A building's entry names every kind it is
 * of, each as a link. A card that names a kind links the page of that kind, and
 * the card's plain words do not change.
 */

import { describe, expect, it } from 'vitest';

import {
  BUILDING_IDS,
  type BuildingId,
  buildingDef,
  buildingRowSupplies,
  isEmpireBuilding,
  isFaithHouse,
  isFortification,
  isPublicWork,
  isWonder,
} from '../../src/sim/buildingData';
import {
  BUILDING_KIND_PAGES,
  describeCard,
  markBuildingKinds,
  stripRefs,
} from '../../src/sim/statecraft';
import { ORDER_IDS, orderDef } from '../../src/sim/statecraftData';
import { type CompendiumEntry, compendiumGroups, compendiumSections } from '../../src/ui/compendium';
import { shortDefinition } from '../../src/ui/keywordDefinitions';

const BOOK = compendiumSections();
const ENTRIES = new Map<string, CompendiumEntry>(
  BOOK.flatMap((section) => section.entries).map((entry) => [entry.id, entry]),
);
const SHELF = BOOK.find((section) => section.id === 'building')!;

function page(id: string): CompendiumEntry {
  const found = ENTRIES.get(`building:${id}`);
  expect(found, id).toBeDefined();
  return found!;
}

/** The buildings a page links, by id, from every paragraph but the last (the rule). */
function linked(entry: CompendiumEntry): string[] {
  const lists = entry.clauses.slice(0, -1).map((clause) => clause.text).join(' ');
  return [...lists.matchAll(/\[\[(?:building|wonder):([A-Za-z0-9_]+)\|/g)].map((found) => found[1]!);
}

/** The rows a page of a kind may list: every row that has a page and is in the game. */
const LISTED = BUILDING_IDS.filter((id) => {
  const entry = ENTRIES.get(`${isWonder(id) ? 'wonder' : 'building'}:${id}`);
  return entry !== undefined && entry.group !== 'Not in the game';
});

const KINDS: readonly [string, (id: BuildingId) => boolean][] = [
  [BUILDING_KIND_PAGES.publicWork, isPublicWork],
  [BUILDING_KIND_PAGES.empireBuilding, isEmpireBuilding],
  [BUILDING_KIND_PAGES.fortification, isFortification],
  [BUILDING_KIND_PAGES.faithHouse, isFaithHouse],
  ...(['food', 'production', 'gold', 'science', 'culture', 'faith', 'military'] as const).map(
    (category): [string, (id: BuildingId) => boolean] => [
      BUILDING_KIND_PAGES.category(category),
      (id) => buildingDef(id).category === category,
    ],
  ),
  ...(['food', 'production', 'gold', 'science', 'culture', 'faith'] as const).map(
    (voice): [string, (id: BuildingId) => boolean] => [
      BUILDING_KIND_PAGES.supplies(voice),
      (id) => buildingRowSupplies(id, voice),
    ],
  ),
];

describe('the page of a kind of building', () => {
  it('lists exactly the buildings the simulation’s own function names', () => {
    for (const [id, has] of KINDS) {
      expect(linked(page(id)).sort(), id).toEqual(LISTED.filter(has).sort());
    }
  });

  it('stands first on the shelf, under one heading, before the categories', () => {
    const groups = compendiumGroups(SHELF).map((group) => group.name);
    expect(groups[0]).toBe('Kinds of building');
    expect(groups.slice(1, 8)).toEqual([
      'Food buildings',
      'Production buildings',
      'Gold buildings',
      'Science buildings',
      'Culture buildings',
      'Faith buildings',
      'Military buildings',
    ]);
    expect(compendiumGroups(SHELF)[0]!.count).toBe(KINDS.length);
  });

  it('lists a building of two kinds on both pages', () => {
    expect(isPublicWork('granary')).toBe(true);
    expect(linked(page(BUILDING_KIND_PAGES.publicWork))).toContain('granary');
    expect(linked(page(BUILDING_KIND_PAGES.category('food')))).toContain('granary');
    // And a public work that is not a food building is on the first page only.
    const other = LISTED.find((id) => isPublicWork(id) && buildingDef(id).category !== 'food');
    expect(other).toBeDefined();
    expect(linked(page(BUILDING_KIND_PAGES.publicWork))).toContain(other);
    expect(linked(page(BUILDING_KIND_PAGES.category('food')))).not.toContain(other);
  });

  it('gives a hover card the list, since the list is the first paragraph', () => {
    const definition = shortDefinition(page(BUILDING_KIND_PAGES.publicWork));
    expect(definition.prose).toBe(true);
    expect(definition.lines[0]!.text).toContain('[[building:granary|');
  });
});

describe('a building’s own entry', () => {
  it('names every kind it is of in its Kinds row, each a link to the page of the kind', () => {
    for (const id of LISTED) {
      const entry = ENTRIES.get(`${isWonder(id) ? 'wonder' : 'building'}:${id}`)!;
      const kinds = entry.rows.find((row) => row.label === 'Kinds')?.figures ?? '';
      for (const [kind, has] of KINDS) {
        if (kind.startsWith('setSupplies')) continue;
        expect(kinds.includes(`[[building:${kind}|`), `${id} · ${kind}`).toBe(has(id));
      }
      const supplies = entry.rows.find((row) => row.label === 'Supplies')?.figures ?? '';
      for (const [kind, has] of KINDS) {
        if (!kind.startsWith('setSupplies')) continue;
        expect(supplies.includes(`[[building:${kind}|`), `${id} · ${kind}`).toBe(has(id));
      }
    }
  });

  it('says "public work" on the Granary as plainly as "food building"', () => {
    const granary = ENTRIES.get('building:granary')!;
    expect(granary.eyebrow).toBe('food building · public work');
    expect(stripRefs(granary.rows.find((row) => row.label === 'Kinds')!.figures)).toBe(
      'Food building · Public work',
    );
    expect(granary.group).toBe('Food buildings');
  });
});

describe('a card that names a kind of building', () => {
  it('links the page of the kind, and its plain words do not change', () => {
    expect(markBuildingKinds('+1 culture per public work you hold')).toBe(
      '+1 culture per [[building:setPublicWorks|public work]] you hold',
    );
    expect(markBuildingKinds('per military building or fortification there')).toBe(
      'per [[building:setMilitaryBuildings|military building]] or [[building:setFortifications|fortification]] there',
    );
    // A unit that has dug in is not a building.
    expect(markBuildingKinds('attacking does not break your units’ fortification')).toBe(
      'attacking does not break your units’ fortification',
    );
    // Words already inside a mark are left alone.
    const marked = '[[concept:empireBuilding|An empire building]]: one';
    expect(markBuildingKinds(marked)).toBe(marked);
    expect(stripRefs(markBuildingKinds('your science buildings pay +100%'))).toBe(
      'your science buildings pay +100%',
    );
  });

  it('points every such link on every Order at a page the book has', () => {
    let links = 0;
    for (const id of ORDER_IDS) {
      if (orderDef(id).retired === true) continue;
      for (const clause of describeCard(id)) {
        for (const found of clause.text.matchAll(/\[\[building:(set[A-Za-z]+)\|/g)) {
          expect(ENTRIES.has(`building:${found[1]}`), `${id} → ${found[1]}`).toBe(true);
          links += 1;
        }
      }
    }
    expect(links).toBeGreaterThan(0);
  });
});
