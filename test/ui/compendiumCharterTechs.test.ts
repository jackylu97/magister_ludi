/**
 * **The Compendium's charter technologies** (Scientific batch S12,
 * `docs/plans/scientific-build-triage.md`).
 *
 * A charter technology is a technology only an empire holding its charter may
 * research (`TechDef.charter`). Before this batch the book had no page for one,
 * so every surface named it without a keyword mark (the triage's reading 74).
 * This file checks what S12 built:
 *
 *   - each of the fourteen has a page at `tech:<id>`, filed after the tree
 *     under one heading;
 *   - the page opens with the charter that opens it, as a mark to the card;
 *   - the page prints the price as the column price and the charter premium,
 *     before any card, and those lines are the ones `explainTechCost` gives a
 *     seat that holds no card;
 *   - the page says what the technology opens and what knowing it gives, its
 *     traits included, through the describers;
 *   - every building and improvement it opens, and its charter card, link to
 *     the page, and the describer marks the technology on the card;
 *   - the Mouseion prints its cost premium as its own line;
 *   - the Aqueduct names Surveying as its early way in;
 *   - the Qanat and Niter Beds say what their row fields do.
 */

import { describe, expect, it } from 'vitest';

import { BUILDING_IDS, buildingDef, isWonder } from '../../src/sim/buildingData';
import { buildingProductionCost, explainBuildingCost } from '../../src/sim/cities';
import { IMPROVEMENT_IDS, improvementDef } from '../../src/sim/improvementData';
import { resourceDef } from '../../src/sim/resourceData';
import { RULES } from '../../src/sim/rulesData';
import { playerById } from '../../src/sim/state';
import { describeCard } from '../../src/sim/statecraft';
import { ORDER_IDS, type OrderId, orderDef } from '../../src/sim/statecraftData';
import { explainTechCost, foldTechCost } from '../../src/sim/tech';
import { CHARTER_TECH_IDS, type TechId, techDef } from '../../src/sim/techData';
import { techGifts } from '../../src/sim/techUnlocks';
import {
  CHARTER_TECH_GROUP,
  type CompendiumEntry,
  charterTechPrice,
  compendiumId,
  compendiumSections,
} from '../../src/ui/compendium';
import { definitionReader } from '../../src/ui/keywordDefinitions';
import { YIELD_GLYPH, figure, percentFigure, signedFigure } from '../../src/ui/figures';
import { newGame } from '../sim/newGameHelpers';

const BOOK = compendiumSections();
const ENTRIES = BOOK.flatMap((section) => section.entries);

function entryOf(id: string): CompendiumEntry {
  const found = ENTRIES.find((entry) => entry.id === id);
  expect(found, id).toBeDefined();
  return found!;
}

/** The entry's figures row with this label, or undefined. */
function rowOf(entry: CompendiumEntry, label: string): string | undefined {
  return entry.rows.find((row) => row.label === label)?.figures;
}

/** The one live charter that names this technology, read off the card rows. */
function charterOf(tech: TechId): OrderId {
  const found = ORDER_IDS.filter(
    (id) => orderDef(id).retired !== true && orderDef(id).charter?.unlocks.tech === tech,
  );
  expect(found, tech).toHaveLength(1);
  return found[0]!;
}

/** `[[order:<id>|<name>]]`, the mark to a charter card's page. */
function charterMark(tech: TechId): string {
  const charter = charterOf(tech);
  return `[[order:${charter}|${orderDef(charter).name}]]`;
}

/** An opening line: the clause that starts "Unlocked ". */
function openingOf(entry: CompendiumEntry): string {
  const lines = entry.clauses.filter((clause) => clause.text.startsWith('Unlocked '));
  expect(lines, entry.id).toHaveLength(1);
  return lines[0]!.text;
}

describe('a charter technology’s page', () => {
  it('exists for each of the fourteen, after the tree, under one heading', () => {
    // Thirteen Scientific charters, and Scholasticism for the shared The
    // Schoolmen's Charter (Devotion batch DV2).
    expect(CHARTER_TECH_IDS).toHaveLength(14);
    for (const tech of CHARTER_TECH_IDS) {
      const def = techDef(tech);
      const entry = entryOf(compendiumId('tech', tech));
      expect(entry.section, tech).toBe('tech');
      expect(entry.group, tech).toBe(CHARTER_TECH_GROUP);
      expect(entry.name, tech).toBe(def.name);
      expect(entry.eyebrow, tech).toMatch(/ charter technology$/);
      expect(entry.mark, tech).toEqual({ kind: 'glyph', glyph: def.glyph });
      expect(entry.flavor, tech).toBe(def.flavor ?? null);
    }
  });

  it('opens with the charter that opens it, as a mark to the card’s page', () => {
    const ids = new Set(ENTRIES.map((entry) => entry.id));
    for (const tech of CHARTER_TECH_IDS) {
      const first = entryOf(compendiumId('tech', tech)).clauses[0]!;
      expect(first.text, tech).toBe(
        `Opened by drafting ${charterMark(tech)}. Only an empire that holds that charter may research it.`,
      );
      expect(first.note, tech).toBeUndefined();
      expect(ids.has(compendiumId('order', charterOf(tech))), tech).toBe(true);
    }
  });

  it('prints the column price and the premium that a seat with no card is charged', () => {
    // The book takes no game, so it works the two lines out from the row; this
    // holds them to the game's own fold for a seat that holds no card.
    const state = newGame({
      seed: 7,
      sizeName: 'duel',
      players: [
        { name: 'Crimson', color: '#a00', isHuman: true },
        { name: 'Cobalt', color: '#00a', isHuman: true },
      ],
    });
    const player = playerById(state, 0)!;
    const science = YIELD_GLYPH.science;
    for (const tech of CHARTER_TECH_IDS) {
      const lines = explainTechCost(state, player, tech);
      expect(lines, tech).toHaveLength(2);
      const price = charterTechPrice(tech);
      expect(price.column, tech).toBe(lines[0]!.amount);
      expect(price.premium, tech).toBe(lines[1]!.amount);
      expect(price.total, tech).toBe(foldTechCost(lines));
      expect(price.premium, tech).toBeGreaterThan(0);

      const entry = entryOf(compendiumId('tech', tech));
      expect(rowOf(entry, 'Research cost'), tech).toBe(`${figure(price.total)}${science}`);
      expect(rowOf(entry, 'Column price'), tech).toBe(`${figure(price.column)}${science}`);
      expect(rowOf(entry, 'Charter premium'), tech).toBe(
        `${signedFigure(price.premium)}${science} (${percentFigure(RULES.research.charterPremiumPercent)})`,
      );
      expect(rowOf(entry, 'Requires first'), tech).toBe(
        techDef(tech).prereqs.map((prereq) => techDef(prereq).name).join(', '),
      );
    }
  });

  it('says what it opens, and what knowing it gives, through the describers', () => {
    for (const tech of CHARTER_TECH_IDS) {
      const entry = entryOf(compendiumId('tech', tech));
      const texts = entry.clauses.map((clause) => clause.text);
      // Each building and improvement it opens, by name.
      for (const gift of techGifts(tech)) {
        if (gift.kind === 'techEffect') continue;
        expect(texts.some((text) => text.includes(gift.name)), `${tech} → ${gift.name}`).toBe(true);
      }
      // Every clause the describer gives the technology, word for word: its
      // own rules and its line traits.
      const said = describeCard(tech).map((clause) => clause.text);
      for (const text of said) expect(texts, tech).toContain(text);
      // Every charter technology gives something: a row it opens, or a rule.
      const opens = techGifts(tech).filter((gift) => gift.kind !== 'techEffect');
      expect(opens.length + said.length, tech).toBeGreaterThan(0);
      for (const trait of techDef(tech).traits ?? []) {
        expect(
          texts.some((text) => text.includes(`gains the ${trait.name} trait`)),
          `${tech} → ${trait.name}`,
        ).toBe(true);
      }
      // In full: never a named rule, which would point at a page the Rules
      // shelf does not have for a charter technology.
      for (const text of texts) expect(text, tech).not.toContain('[[rule:');
    }
  });

  it('keeps its notes plain: under the rules, and with no figure in them', () => {
    for (const tech of CHARTER_TECH_IDS) {
      const entry = entryOf(compendiumId('tech', tech));
      const notes = entry.clauses.filter((clause) => clause.note === true);
      expect(notes.length, tech).toBeGreaterThan(0);
      const first = entry.clauses.findIndex((clause) => clause.note === true);
      expect(first, tech).toBe(entry.clauses.length - notes.length);
      for (const note of notes) expect(note.text, tech).not.toMatch(/\d/);
    }
  });

  it('answers a keyword hover with its name, its price and what it opens', () => {
    const read = definitionReader(BOOK);
    for (const tech of CHARTER_TECH_IDS) {
      const definition = read(compendiumId('tech', tech));
      expect(definition, tech).not.toBeNull();
      expect(definition!.name, tech).toBe(techDef(tech).name);
      expect(definition!.rows.map((row) => row.label), tech).toContain('Research cost');
      expect(definition!.lines[0]!.text, tech).toMatch(/^Opened by drafting /);
    }
  });
});

describe('the pages that name a charter technology link to it', () => {
  it('on each building and improvement it opens, with its charter beside it', () => {
    let linked = 0;
    for (const tech of CHARTER_TECH_IDS) {
      const mark = `[[tech:${tech}|${techDef(tech).name}]]`;
      for (const building of techDef(tech).unlocks.buildings ?? []) {
        const section = isWonder(building) ? 'wonder' : 'building';
        const line = openingOf(entryOf(compendiumId(section, building)));
        expect(line, building).toBe(
          `Unlocked by researching ${mark}, a charter technology that only an empire holding ${charterMark(tech)} may research.`,
        );
        linked += 1;
      }
      for (const work of IMPROVEMENT_IDS) {
        if (improvementDef(work).requiresTech !== tech) continue;
        const line = openingOf(entryOf(compendiumId('improvement', work)));
        expect(line, work).toContain(mark);
        expect(line, work).toContain(charterMark(tech));
        linked += 1;
      }
    }
    // Seven buildings (the Specularium, the Mouseion, the Bimaristan, the
    // Scriptorium, the Aldine Press, the Tophane and the Bastion) and three
    // improvements (the Physic Garden, the Qanat and Niter Beds).
    expect(linked).toBe(10);
  });

  it('on its charter card, in the describer’s words and in the book’s charter note', () => {
    for (const tech of CHARTER_TECH_IDS) {
      const charter = charterOf(tech);
      const mark = `[[tech:${tech}|${techDef(tech).name}]]`;
      // The describer marks it, so every surface that prints the card links it.
      expect(describeCard(charter)[0]!.text, charter).toBe(
        `once drafted, opens ${mark} for you to research; only an empire holding this charter may research it; this card takes no chair`,
      );
      const entry = entryOf(compendiumId('order', charter));
      const note = entry.clauses.find((clause) => clause.note === true && clause.text.startsWith('A charter:'));
      expect(note?.text, charter).toContain(`It opens ${mark}`);
    }
  });

  it('on the Aqueduct, as the early way in after Engineering', () => {
    const entry = entryOf(compendiumId('building', 'aqueduct'));
    expect(openingOf(entry)).toBe(
      'Unlocked by researching [[tech:engineering|Engineering]], or earlier by researching ' +
        `[[tech:surveying|Surveying]], a charter technology that only an empire holding ${charterMark('surveying')} may research.`,
    );
    // A technology once known is never lost, so the page carries no sentence
    // about a card leaving its chair.
    for (const clause of entry.clauses) expect(clause.text).not.toMatch(/card that opens it is yours/);
  });
});

describe('the rows the charter technologies open', () => {
  it('prints a building’s own cost premium as its own line, the Mouseion’s among them', () => {
    const premiumRows = BUILDING_IDS.filter((id) => buildingDef(id).retired !== true && !isWonder(id));
    let seen = 0;
    for (const id of premiumRows) {
      const entry = entryOf(compendiumId('building', id));
      const percent = buildingDef(id).costPercent ?? 0;
      const printed = rowOf(entry, 'Cost premium');
      if (percent === 0) {
        expect(printed, id).toBeUndefined();
        continue;
      }
      // The fold with no empire puts the premium last; the cost row is the
      // fold's total, the premium included.
      const lines = explainBuildingCost(id);
      const premium = lines[lines.length - 1]!;
      expect(premium.amount, id).toBe(Math.floor(((buildingProductionCost(id) - premium.amount) * percent) / 100));
      expect(printed, id).toBe(
        `${signedFigure(premium.amount)}${YIELD_GLYPH.production} (${percentFigure(percent)})`,
      );
      expect(rowOf(entry, 'Production cost'), id).toBe(
        `${figure(buildingProductionCost(id))}${YIELD_GLYPH.production}`,
      );
      seen += 1;
    }
    expect(buildingDef('mouseion').costPercent).toBe(30);
    expect(seen).toBeGreaterThan(0);
  });

  it('says what the Qanat and Niter Beds do, read off their row fields', () => {
    let said = 0;
    for (const id of IMPROVEMENT_IDS) {
      const def = improvementDef(id);
      const texts = entryOf(compendiumId('improvement', id)).clauses.map((clause) => clause.text);
      const has = (part: string): boolean => texts.some((text) => text.includes(part));
      expect(has('count as having fresh water'), id).toBe(def.watersBeside === true);
      if (def.suppliesResource !== undefined) {
        const resource = def.suppliesResource;
        expect(has(`a copy of [[resource:${resource}|${resourceDef(resource).name}]]`), id).toBe(true);
        said += 1;
      }
      if (def.besideImprovement !== undefined) {
        for (const work of def.besideImprovement) {
          expect(has(improvementDef(work).name), `${id} → ${work}`).toBe(true);
        }
        expect(has('Can only be built next to'), id).toBe(true);
        said += 1;
      }
      if (def.watersBeside === true) said += 1;
    }
    // The Qanat's water, and Niter Beds' neighbour and niter.
    expect(said).toBe(3);
  });
});

describe('the Technology concept page', () => {
  it('says what a charter technology is, inside its Details paragraph', () => {
    const entry = entryOf('concept:technology');
    const last = entry.clauses[entry.clauses.length - 1]!.text;
    expect(last.startsWith('Details:')).toBe(true);
    expect(last).toContain('A charter technology is one that only an empire holding its charter card may research.');
    expect(last).not.toMatch(/\d/);
  });
});
