/**
 * **Every line a technology prints has one short form** (batch TT3,
 * `docs/flags.md` item (kkkkkkk)).
 *
 * The user: *"lets do a readability pass on the tech tree. i.e. 'workers +1
 * charge' instead of 'newly created workers gain 1 charge'. the rite unlock
 * should also be shorter and more readable. the change to improvement upgrades
 * is great, lets have the whole tech tree read the same way"*.
 *
 * The model is the improvement line of batch TT1 ("Farm +1🌾 on fresh water"):
 * the subject first, then the figure, with no "gain", "may", "now" or "newly
 * created", and no full stop. The node face, the hover card and the
 * Compendium's technology page print the same words. This file holds:
 *
 *   1. the spec table's rows, word for word, on each surface that prints them;
 *   2. Surveying's Aqueduct as an ordinary building unlock, with no rule line;
 *   3. Siege as the keyword alone, linked to its Compendium page;
 *   4. the form, over every line any technology prints;
 *   5. the register: every rule and trait effect a technology carries has a
 *      short form, so no line falls back to a card sentence;
 *   6. the Orders that carry the same effects keep their sentences.
 *
 * There is no jsdom in this suite, so the hover card is read through the
 * composers it is built out of (`techRuleClauses`, `abilityNote`,
 * `describeTraitLines`) and one source pin for its keyword link.
 */

import { describe, expect, it } from 'vitest';
import { describeCard, describeTraitLines, effectLine, stripRefs } from '../../src/sim/statecraft';
import {
  ALL_TECH_IDS,
  BUILDING_UNLOCK_TECH,
  type TechId,
  liveUnlocks,
  techDef,
  techRuleEffects,
} from '../../src/sim/techData';
import { techGifts } from '../../src/sim/techUnlocks';
import { compendiumId, compendiumSections } from '../../src/ui/compendium';
import { techHeadlines } from '../../src/ui/techTree';
import { abilityConcept, abilityNote, renewalNote, techRuleClauses } from '../../src/ui/techRuleWords';
import { braceBody, uiSource } from './sourceHelpers';

const BOOK = compendiumSections().flatMap((section) => section.entries);

/** The Compendium page of a technology, its clauses as plain words. */
function bookLines(id: TechId): string[] {
  const entry = BOOK.find((one) => one.id === compendiumId('tech', id));
  expect(entry, id).toBeDefined();
  return entry!.clauses.filter((clause) => clause.note !== true).map((clause) => stripRefs(clause.text));
}

/** The node face's rule lines, as plain words. */
function faceLines(id: TechId): string[] {
  return techHeadlines(id)
    .filter((line) => line.note === '')
    .map((line) => stripRefs(line.name));
}

/** The hover card's rule lines, as plain words. */
function hoverLines(id: TechId): string[] {
  return techRuleClauses(id).map(stripRefs);
}

/** The line an ability prints beside its name, on the hover card. */
function abilityLine(id: TechId, name: string): string {
  const gift = techGifts(id).find((one) => one.kind === 'ability' && one.name === name);
  expect(gift, `${id} → ${name}`).toBeDefined();
  if (gift?.kind !== 'ability') return '';
  return abilityNote(gift);
}

/** The spec table's rule rows: the technology, and the one line it prints. */
const RULE_ROWS: readonly (readonly [TechId, string])[] = [
  ['theWheel', 'Workers +1 charge'],
  ['stateWorkforce', 'Workers +1 charge'],
  ['kingship', 'Authority capacity +3'],
  ['theSilkRoad', 'Trade routes +1'],
  ['printing', 'Trade routes +1'],
  ['colonialCharters', 'New cities start with a Town Charter'],
  ['herbals', 'Physic Garden +2 happiness'],
];

/**
 * The spec table's ability rows: the technology, the verb, and its line.
 * Embark's subject is "Civilians and scouts" and not "Civilians", because a
 * scout embarks too (`moveProfile` in `pathfind.ts`: `isCivilian || isExplorer`).
 */
const ABILITY_ROWS: readonly (readonly [TechId, string, string])[] = [
  ['bronzeWorking', 'Blessing of Arms', 'Rite: town +10 defence'],
  ['stonecraft', 'Consecration of the Bounds', 'Rite: luxury hexes +1 culture, borders grow 30% faster'],
  ['divination', 'Rite of the Harvest', 'Rite: food hexes +1 food'],
  ['divination', 'Omen Reading', 'Rite: +1 science per building'],
  ['currency', 'Rite of Plenty', 'Rite: resource hexes +1 gold'],
  ['sailing', 'Embark', 'Civilians and scouts cross coast and lakes'],
  ['wayfinding', 'Sea Legs', 'Soldiers cross coast and lakes'],
  ['theAstrolabe', 'Open Ocean', 'Ships and embarked units cross deep ocean'],
  ['epicPoetry', 'Ancestor Rites', 'Renown earns great people'],
  ['theLongCount', 'The Long Count', 'Spend faith to redraw an Order draft'],
  ['letters', 'Open Borders', 'Open-borders treaties'],
];

describe('the spec table’s rows', () => {
  it('prints each rule as its short line on the face, the hover card and the Compendium', () => {
    for (const [id, line] of RULE_ROWS) {
      expect(faceLines(id), id).toEqual([line]);
      expect(hoverLines(id), id).toEqual([line]);
      expect(bookLines(id), id).toContain(line);
    }
  });

  it('prints each ability’s line beside its name on the hover card and the Compendium', () => {
    for (const [id, name, line] of ABILITY_ROWS) {
      expect(abilityLine(id, name), `${id} → ${name}`).toBe(line);
      expect(bookLines(id), `${id} → ${name}`).toContain(`New ability: ${name} — ${line}`);
    }
  });

  it('prints the improvement lines, the model, in the same words on every surface', () => {
    for (const id of ALL_TECH_IDS) {
      for (const gift of techGifts(id)) {
        if (gift.kind !== 'renewal') continue;
        const line = `${gift.name} ${renewalNote(gift)}`;
        expect(
          techHeadlines(id).map((one) => `${one.name} ${one.note}`),
          id,
        ).toContain(line);
        expect(bookLines(id), id).toContain(line);
      }
    }
    expect(bookLines('irrigation')).toContain('Farm +1🌾 on fresh water');
  });
});

describe('Surveying', () => {
  it('prints the Aqueduct as an ordinary building unlock, with no rule line', () => {
    expect(techHeadlines('surveying')).toEqual([]);
    expect(techRuleClauses('surveying')).toEqual([]);
    expect(techRuleEffects('surveying')).toEqual([]);
    expect(liveUnlocks('surveying').buildings).toEqual(['aqueduct']);
    const gifts = techGifts('surveying').map((gift) => `${gift.kind}:${gift.id}`);
    expect(gifts).toContain('building:aqueduct');
    expect(gifts.some((gift) => gift.startsWith('techEffect:'))).toBe(false);
    const book = bookLines('surveying');
    expect(book.some((line) => /^New building: Aqueduct — \d+⚙$/.test(line))).toBe(true);
    expect(book.some((line) => line.includes('unlocks the Aqueduct'))).toBe(false);
  });

  it('keeps its Qanat and leaves the Aqueduct on Engineering for everyone', () => {
    expect(techGifts('surveying').map((gift) => `${gift.kind}:${gift.id}`)).toContain('improvement:qanat');
    expect(BUILDING_UNLOCK_TECH.get('aqueduct')).toBe('engineering');
    expect(liveUnlocks('engineering').buildings).toContain('aqueduct');
    // The rule itself still opens it early: the evaluator reads every effect.
    expect(techDef('surveying').effects).toEqual([{ kind: 'unlocksBuilding', building: 'aqueduct' }]);
  });
});

describe('Siege', () => {
  it('prints the keyword alone, linked to its Compendium page', () => {
    const gift = techGifts('siegecraft').find((one) => one.kind === 'ability' && one.id === 'siege');
    expect(gift?.kind).toBe('ability');
    if (gift?.kind !== 'ability') return;
    expect(abilityConcept(gift)).toBe('siege');
    expect(abilityNote(gift)).toBe('');
    const entry = BOOK.find((one) => one.id === compendiumId('tech', 'siegecraft'))!;
    expect(entry.clauses.map((clause) => clause.text)).toContain('New ability: [[concept:siege|Siege]]');
  });

  it('has a page that holds the rule', () => {
    const page = BOOK.find((one) => one.id === 'concept:siege');
    expect(page).toBeDefined();
    expect(page!.name).toBe('Siege');
    const rule = page!.clauses[0]!.text;
    expect(rule).toContain('cannot heal');
    expect(rule).toContain('loses health each turn');
    expect(rule).toContain('Siegecraft');
    for (const clause of page!.clauses) expect(clause.text).not.toMatch(/\d/);
  });

  it('is a keyword on the hover card, through the gift’s entry id', () => {
    const entry = braceBody(uiSource('techTree.ts'), 'function giftEntryId(gift: TechGift): string | null {');
    expect(entry).toContain('abilityConcept(gift)');
    expect(entry).toContain('`concept:${concept}`');
  });

  it('names a real page wherever a verb names one', () => {
    for (const id of ALL_TECH_IDS) {
      for (const gift of techGifts(id)) {
        if (gift.kind !== 'ability') continue;
        const concept = abilityConcept(gift);
        if (concept === null) continue;
        expect(BOOK.some((one) => one.id === `concept:${concept}`), `${id} → ${concept}`).toBe(true);
      }
    }
  });
});

describe('the form, over every line any technology prints', () => {
  /** Every line a node prints for a rule, an ability or a line trait. */
  function everyLine(): { id: TechId; line: string }[] {
    const out: { id: TechId; line: string }[] = [];
    for (const id of ALL_TECH_IDS) {
      for (const line of techRuleClauses(id)) out.push({ id, line: stripRefs(line) });
      for (const gift of techGifts(id)) {
        if (gift.kind === 'ability' && gift.pays === undefined) {
          const note = abilityNote(gift);
          if (note !== '') out.push({ id, line: note });
        }
      }
      for (const trait of techDef(id).traits ?? []) {
        for (const line of describeTraitLines(trait)) out.push({ id, line: stripRefs(line.text) });
      }
    }
    return out;
  }

  it('starts with a capital, ends with no full stop, and says no gain, may, now or newly created', () => {
    const lines = everyLine();
    expect(lines.length).toBeGreaterThan(20);
    for (const { id, line } of lines) {
      expect(line, id).toMatch(/^[A-Z]/);
      expect(line, id).not.toMatch(/\.$/);
      expect(line, id).not.toMatch(/\b(gains?|may|now|newly created)\b/i);
    }
  });

  it('prints a line trait as the units its line reaches, then the figure', () => {
    expect(describeTraitLines(techDef('casting').traits![0]!).map((line) => line.text)).toEqual([
      'Spearman to Pikeman +2 combat strength',
    ]);
    expect(describeTraitLines(techDef('mechanics').traits![0]!).map((line) => line.text)).toEqual([
      'Catapult and Trebuchet +1 range',
    ]);
    expect(describeTraitLines(techDef('mechanics').traits![1]!).map((line) => line.text)).toEqual([
      'Archer to Crossbowman move after attacking',
    ]);
    const book = bookLines('casting');
    expect(book).toContain('Hoplite: Spearman to Pikeman +2 combat strength');
  });
});

describe('the register of short forms', () => {
  it('has a short line for every rule and trait effect a technology carries', () => {
    let seen = 0;
    for (const id of ALL_TECH_IDS) {
      for (const effect of techRuleEffects(id)) {
        expect(effectLine(effect), `${id}: ${effect.kind}`).not.toBeNull();
        seen += 1;
      }
      for (const trait of techDef(id).traits ?? []) {
        for (const effect of trait.effects) {
          expect(effectLine(effect, 'Units'), `${id} · ${trait.name}: ${effect.kind}`).not.toBeNull();
          seen += 1;
        }
      }
    }
    expect(seen).toBeGreaterThan(10);
  });

  it('keeps a longer row on its sentence rather than drop a fact', () => {
    // A scope, a cap or a condition is a fact the short form cannot say, so the
    // row goes back to the sentence (`onlyFields`).
    expect(effectLine({ kind: 'authority', amount: 2, per: 'city' })).toBeNull();
    expect(effectLine({ kind: 'routeRider', extra: 1, scope: { test: 'coastal' } })).toBeNull();
    expect(effectLine({ kind: 'foundingRider', building: 'monument', maxCities: 3 })).toBeNull();
    expect(effectLine({ kind: 'unitStat', stat: 'charges', amount: 1, class: { type: 'worker' }, where: 'ownTerritory' })).toBeNull();
  });
});

describe('the Orders keep their sentences', () => {
  it('words the same effects as a card sentence on an Order face', () => {
    // The short form is the tree's. A card face is read as a sentence, so an
    // Order that carries the worker charge or the trade route is unchanged.
    const text = (id: string): string[] => describeCard(id as never).map((clause) => stripRefs(clause.text));
    expect(text('tinkersGuild')).toContain('newly created workers gain +1 charge');
    expect(text('ledgerKeepers')).toContain('+1 trade route');
  });
});
