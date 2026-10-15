/**
 * Where a refusal is said (`src/ui/refusalLine.ts`, batch UX5): once at the
 * head of a group when several rows share it, under its own row when only one
 * row has it.
 *
 * `planRefusals` is pure and these are its rules, case by case. The sentences
 * are shaped like the purchase gate's real ones; `cityPanelBuying.test.ts`
 * runs the plan over real towns.
 */

import { describe, expect, it } from 'vitest';

import { SHARED_SUBJECT, planRefusals } from '../../src/ui/refusalLine';
import { braceBody, uiSource } from './sourceHelpers';

const STANDS = 'A Swordsman already stands in Aldermarch — move it first';

describe('a reason several rows share', () => {
  it('is said once, word for word, and every row it covers points at it', () => {
    const plan = planRefusals([
      { key: 'bowman', name: 'Bowman', refusal: STANDS },
      { key: 'spearman', name: 'Spearman', refusal: STANDS },
      { key: 'catapult', name: 'Catapult', refusal: STANDS },
    ]);
    expect(plan.head).toEqual([{ text: STANDS, mark: null }]);
    for (const key of ['bowman', 'spearman', 'catapult']) {
      expect(plan.places.get(key)).toEqual({ at: 'head', mark: null });
    }
  });

  it('is said once when the sentences differ only in the row’s own name at the start', () => {
    // Every wonder is refused in its own name ("The Oracle is a wonder — …").
    // Said once per wonder, that was the repetition the city audit named.
    const plan = planRefusals([
      { key: 1, name: 'The Oracle', refusal: 'The Oracle is a wonder — it must be built, not bought' },
      { key: 2, name: 'Stonehenge', refusal: 'Stonehenge is a wonder — it must be built, not bought' },
      { key: 3, name: 'Petra', refusal: 'Petra is a wonder — it must be built, not bought' },
    ]);
    expect(plan.head).toEqual([
      { text: `${SHARED_SUBJECT} is a wonder — it must be built, not bought`, mark: null },
    ]);
    expect([...plan.places.values()].every((place) => place.at === 'head')).toBe(true);
  });

  it('numbers its lines only when there is more than one, so a dash can find its reason', () => {
    const plan = planRefusals([
      { key: 'warrior', name: 'Warrior', refusal: STANDS },
      { key: 'worker', name: 'Worker', refusal: 'A Settler already stands in Aldermarch — move it first' },
      { key: 'spearman', name: 'Spearman', refusal: STANDS },
      { key: 'settler', name: 'Settler', refusal: 'A Settler already stands in Aldermarch — move it first' },
    ]);
    expect(plan.head).toEqual([
      { text: STANDS, mark: '1' },
      { text: 'A Settler already stands in Aldermarch — move it first', mark: '2' },
    ]);
    expect(plan.places.get('warrior')).toEqual({ at: 'head', mark: '1' });
    expect(plan.places.get('spearman')).toEqual({ at: 'head', mark: '1' });
    expect(plan.places.get('worker')).toEqual({ at: 'head', mark: '2' });
    expect(plan.places.get('settler')).toEqual({ at: 'head', mark: '2' });
  });

  it('lists the head in the order the first row of each reason was given', () => {
    const plan = planRefusals([
      { key: 'a', name: 'Monument', refusal: 'Monument is a wonder — x' },
      { key: 'b', name: 'Warrior', refusal: STANDS },
      { key: 'c', name: 'Shrine', refusal: 'Shrine is a wonder — x' },
      { key: 'd', name: 'Spearman', refusal: STANDS },
    ]);
    expect(plan.head.map((line) => line.text)).toEqual([`${SHARED_SUBJECT} is a wonder — x`, STANDS]);
  });
});

describe('a reason only one row has', () => {
  it('is said under that row, exactly as the gate wrote it', () => {
    const plan = planRefusals([
      { key: 'settler', name: 'Settler', refusal: 'Aldermarch needs population 2 to raise a Settler (it has 1)' },
      { key: 'warrior', name: 'Warrior', refusal: STANDS },
      { key: 'scout', name: 'Scout', refusal: STANDS },
    ]);
    expect(plan.places.get('settler')).toEqual({
      at: 'row',
      text: 'Aldermarch needs population 2 to raise a Settler (it has 1)',
    });
    // One shared reason, so no numbers.
    expect(plan.head).toEqual([{ text: STANDS, mark: null }]);
  });

  it('keeps its own name when nobody else shares its sentence', () => {
    const plan = planRefusals([
      { key: 1, name: 'The Oracle', refusal: 'The Oracle is a wonder — it must be built, not bought' },
    ]);
    expect(plan.head).toEqual([]);
    expect(plan.places.get(1)).toEqual({
      at: 'row',
      text: 'The Oracle is a wonder — it must be built, not bought',
    });
  });

  it('is never folded on a name that is only the start of a word', () => {
    // "Prophets need …" opens with "Prophet" and is not "Prophet " + the rest:
    // a sentence is only shared on the name as a whole word.
    const plan = planRefusals([
      { key: 'p', name: 'Prophet', refusal: 'Prophets need The High Temple' },
      { key: 'a', name: 'Apostle', refusal: 'Apostles need The High Temple' },
    ]);
    expect(plan.head).toEqual([]);
    expect(plan.places.get('p')).toEqual({ at: 'row', text: 'Prophets need The High Temple' });
    expect(plan.places.get('a')).toEqual({ at: 'row', text: 'Apostles need The High Temple' });
  });

  it('places every entry it was given, and nothing for no entries', () => {
    expect(planRefusals([])).toEqual({ head: [], places: new Map() });
    const entries = [
      { key: 'x', name: 'X', refusal: 'one' },
      { key: 'y', name: 'Y', refusal: 'two' },
      { key: 'z', name: 'Z', refusal: 'two' },
    ];
    const plan = planRefusals(entries);
    expect([...plan.places.keys()].sort()).toEqual(['x', 'y', 'z']);
  });
});

describe('the line as drawn', () => {
  it('wears the wanting voice wherever it stands, and a refused command is announced', () => {
    const body = braceBody(uiSource('refusalLine.ts'), 'export function refusalLineElement(');
    expect(body).toContain("element('p', `refusal-line is-${where} wanting`)");
    expect(body).toContain("if (where === 'command') line.setAttribute('role', 'alert');");
    // Printed through the yield printer, so a sentence quoting a price draws its mark.
    expect(body).toContain('setYieldText(words, text);');
  });
});
