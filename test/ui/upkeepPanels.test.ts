/**
 * Maintenance, as the interface says it — and the faith lens's rack row, which
 * is here for the same reason: both are wordings a compiler cannot check.
 *
 * The simulation's half is `test/sim/upkeep.test.ts`. What this file pins is the
 * five surfaces the ruling of 2026-08-28 asked for, and specifically the thing
 * each one can be *quietly* wrong about:
 *
 *   1. **The unit sheet** — three sentences for three different facts. The one
 *      that fails silently is `Free — granted` on a settler, which would teach
 *      a rule that is not there.
 *   2. **The build list** — the figure beside the price is the *type's*, not a
 *      piece's, and it is absent rather than zero for everything exempt.
 *   3. **The Compendium's two shelves** — a row rather than prose, and `None`
 *      rather than an omission, because here the zero is the answer.
 *   4. **The disband toast and the End Turn warning** — one threshold, read off
 *      `RULES.upkeep` in both, so the warning and the loss can never name two
 *      different numbers. That is the whole test: a hard-coded "−10" in either
 *      sentence would pass every behavioural check in the game.
 *   5. **The trader's own wording**, which stopped being true when `trader`
 *      became its own `UnitCategory`: nothing in the book may go on calling a
 *      caravan a civilian.
 *
 * No jsdom here (see `controls.test.ts`), so what is exercised is the pure half
 * — the sentence functions and the two `upkeep.ts` readers the panels call —
 * plus, through the source exactly as `seatRoster.test.ts` reads its rule, the
 * wirings that span files.
 */

import { describe, expect, it } from 'vitest';

import { RULES } from '../../src/sim/rulesData';
import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { UNIT_TYPE_IDS, unitDef } from '../../src/sim/unitData';
import { buildingUpkeep, unitUpkeep } from '../../src/sim/upkeep';
import { type Unit, createUnit } from '../../src/sim/state';
import { debtWarning, disbandSentence } from '../../src/ui/controls';
import { upkeepNote } from '../../src/ui/unitPanel';
import { bareState } from '../sim/improvementHelpers';

const SOURCES = import.meta.glob(
  [
    '../../src/ui/cityPanel.ts',
    '../../src/ui/compendium.ts',
    '../../src/ui/compendiumShelves.ts',
    '../../src/ui/compendiumText.ts',
    '../../src/ui/unitPanel.ts',
    '../../src/ui/controls.ts',
    '../../src/main.ts',
  ],
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

function source(name: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(name));
  const text = key === undefined ? undefined : SOURCES[key];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`${name} came back empty`);
  }
  return text;
}

/** One piece of seat 0's, standing where nothing else is. */
function piece(type: Parameters<typeof createUnit>[2]): Unit {
  const state = bareState(9, 9);
  return createUnit(state, 0, type, 4, 4);
}

describe('the unit sheet’s upkeep line', () => {
  it('prints the bill for a soldier, in the age of the technology behind it', () => {
    const warrior = piece('warrior');
    expect(upkeepNote(warrior)).toBe(`Upkeep ${unitUpkeep('warrior')}💰 a turn`);
    // Not a constant: the sentence is the reader's answer, whatever the roster
    // and the tree between them say it is.
    expect(unitUpkeep('warrior')).toBeGreaterThan(0);
  });

  it('says "No upkeep" for everything the type exempts', () => {
    for (const type of ['settler', 'worker', 'trader', 'scout'] as const) {
      expect(upkeepNote(piece(type))).toBe('No upkeep');
    }
  });

  it('says "Free — granted" only for a piece whose empire never paid for it', () => {
    const warrior = piece('warrior');
    warrior.freeUpkeep = true;
    expect(upkeepNote(warrior)).toBe('Free — granted');
  });

  /**
   * The one ordering that matters, and the one that would fail silently: a
   * settler carrying `freeUpkeep` — every settler a windfall or a ruin hands
   * over does — must still read "No upkeep". "Free — granted" on one would say
   * an ordinary settler costs something.
   */
  it('asks the type before it asks the piece', () => {
    const settler = piece('settler');
    settler.freeUpkeep = true;
    expect(upkeepNote(settler)).toBe('No upkeep');
  });

  it('is on every sheet, through the notes rather than beside them', () => {
    const panel = source('unitPanel.ts');
    expect(panel).toContain('notes.push(upkeepNote(unit));');
    // And the note paragraph draws its glyphs, because this line put one there.
    expect(panel).toContain("setYieldText(note, notes.join(' · '));");
  });
});

describe('the build list’s hover', () => {
  it('asks the roster’s reader for a unit and the row’s reader for a building', () => {
    const panel = source('cityPanel.ts');
    expect(panel).toContain('upkeepFigure(unitUpkeep(id))');
    expect(panel).toContain('upkeepFigure(buildingUpkeep(id))');
  });

  /**
   * Absent rather than zero, which is the same rule the fighting numbers follow
   * one card over: a `0💰 a turn` beside a settler reads as a statistic rather
   * than as "this one is free to keep".
   */
  it('prints nothing at all for a row that pays nothing', () => {
    const panel = source('cityPanel.ts');
    expect(panel).toMatch(/function upkeepFigure\(gold: number\): HTMLElement \| null \{\s*\n\s*if \(gold <= 0\) return null;/);
  });
});

describe('the Compendium’s two shelves', () => {
  it('prints upkeep as a row on every unit and every building', () => {
    const book = source('compendium.ts');
    expect(book).toContain("...row('Upkeep each turn', upkeepRow(unitUpkeep(type)))");
    expect(book).toContain("...row('Upkeep each turn', upkeepRow(buildingUpkeep(id)))");
  });

  /**
   * `None`, never an empty string. `row` drops an empty one, and this is the
   * rare figure whose zero is the interesting answer — "a scout costs nothing to
   * keep" is a sentence a player is choosing between units on.
   */
  it('says None rather than dropping the row', () => {
    const book = source('compendium.ts');
    expect(book).toMatch(/function upkeepRow\(gold: number\): string \{\s*\n\s*return gold <= 0 \? 'None'/);
  });

  it('has a figure to print for at least one row of each shelf', () => {
    expect(UNIT_TYPE_IDS.some((id) => unitUpkeep(id) > 0)).toBe(true);
    expect(BUILDING_IDS.some((id) => buildingUpkeep(id) > 0)).toBe(true);
    // And a wonder is exempt by design rather than by accident.
    const wonder = BUILDING_IDS.find((id) => buildingDef(id).wonder === true);
    expect(wonder).toBeDefined();
    expect(buildingUpkeep(wonder!)).toBe(0);
  });

  /**
   * The lead pages are prose, so hard rule 7 applies to them and not to the rows
   * above: no digits, ever. `compendium.test.ts` says so for the shelf's own
   * strings; this says it for the two paragraphs this pass rewrote.
   */
  it('keeps the shelves’ new prose free of digits', () => {
    const shelves = source('compendiumShelves.ts');
    for (const line of shelves.split('\n')) {
      if (!line.includes('costs the treasury') && !line.includes('A trader is neither')) continue;
      expect(line).not.toMatch(/\d/);
    }
  });
});

describe('the treasury under water', () => {
  it('names the disbanded piece and the threshold it crossed', () => {
    const said = disbandSentence({ unitId: 3, ownerId: 0, type: 'swordsman', upkeep: 2 });
    expect(said).toContain(unitDef('swordsman').name);
    expect(said).toContain('was disbanded');
    expect(said).toContain(String(Math.abs(RULES.upkeep.disbandBelow)));
  });

  it('says nothing at all while the treasury is solvent', () => {
    expect(debtWarning({ gold: 0, barbarian: false } as never)).toBeNull();
    expect(debtWarning({ gold: 12, barbarian: false } as never)).toBeNull();
    expect(debtWarning(undefined)).toBeNull();
  });

  it('warns about the yields in debt, and about the army below the floor', () => {
    const mild = debtWarning({ gold: -1 } as never)!;
    expect(mild).toContain('science and culture');
    expect(mild).toContain(String(Math.abs(RULES.upkeep.debtPercent)));
    expect(mild).not.toContain('disbanded');

    const sharp = debtWarning({ gold: RULES.upkeep.disbandBelow - 1 } as never)!;
    expect(sharp).toContain('disbanded');
    expect(sharp).toContain(String(Math.abs(RULES.upkeep.disbandBelow)));
    expect(sharp).not.toBe(mild);
  });

  /**
   * The one property that would survive every behavioural test and still be
   * wrong: a threshold written into a sentence rather than read off the rules.
   * Both sentences are built out of `RULES.upkeep`, so a designer who moves the
   * line moves the words with it.
   */
  it('reads both figures off RULES.upkeep rather than writing them down', () => {
    const controls = source('controls.ts');
    const body = controls.slice(
      controls.indexOf('export function disbandSentence'),
      controls.indexOf('export interface GameControlsOptions'),
    );
    expect(body).toContain('RULES.upkeep.disbandBelow');
    expect(body).toContain('RULES.upkeep.debtPercent');
    const code = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(code).not.toMatch(/−?\b10💰/);
    expect(code).not.toContain('25%');
  });

  it('warns on End Turn without ever blocking it', () => {
    const controls = source('controls.ts');
    // Read before the dispatch and said after it succeeded — never a `return`.
    expect(controls).toContain('const debt = debtWarning(playerById(getGame().state, localPlayerId));');
    expect(controls).toContain('if (debt !== null) announce(debt);');
    // And the disband news goes through the same funnel every other report does.
    expect(controls).toContain('reportDisbands(result);');
  });
});

describe('the trader is its own kind of unit', () => {
  it('is a category of its own in the roster', () => {
    expect(unitDef('trader').category).toBe('trader');
  });

  it('is off the civilian list on the units shelf, with its own slot named', () => {
    const shelves = source('compendiumShelves.ts');
    const civilians = shelves.slice(shelves.indexOf('Military units fight.'));
    const sentence = civilians.slice(0, civilians.indexOf('Each entry below'));
    expect(sentence).not.toMatch(/Civilian units — [^—]*traders/);
    expect(sentence).toContain('A trader is neither');
    expect(sentence).toContain('slot of its own');
  });

  it('is not called a civilian unit in the Trade concept either', () => {
    const text = source('compendiumText.ts');
    expect(text).not.toContain('build a trader, a civilian unit');
    expect(text).toContain('its own kind of unit');
  });

  /**
   * `modelClass` is the *sculpt* class, and the caravan stands on the worker's
   * body — so the city panel's kind line printed "trader · worker". It now
   * prints the silhouette for a soldier and the category alone for everything
   * else, which is the only reading that is true of the augur and the prophet
   * as well.
   */
  it('is never described by the body it happens to be sculpted on', () => {
    expect(unitDef('trader').modelClass).toBe('worker');
    const panel = source('cityPanel.ts');
    expect(panel).toContain(
      "def.category === 'military' ? `${def.category} · ${def.modelClass}` : def.category",
    );
  });
});

describe('the faith lens’s rack row', () => {
  const main = source('main.ts');

  it('is the third lens, appended rather than inserted', () => {
    const rack = main.slice(main.indexOf('const LENS_OPTIONS'), main.indexOf('function isInputBlocked'));
    const order = [...rack.matchAll(/mode: '(none|settler|explorer|faith)'/g)].map((m) => m[1]);
    expect(order).toEqual(['none', 'settler', 'explorer', 'faith']);
  });

  /**
   * It looks like the other two rows: a name and a tick, nothing after the
   * name. It used to print a clause after an em dash ("— whose argument is
   * winning"), and `tail` was a `LensOption` field only the faith row ever
   * carried — so what it actually did was make one row look different for no
   * reason a player could name (user, 2026-08-28). The field is gone from the
   * record as well as from the row: an optional field with no reader is an
   * invitation to make one row strange again. The sentence a lens is worth is
   * in the tooltip every row already has.
   */
  it('is label-only, like every other lens row', () => {
    expect(main).not.toContain('tail:');
    expect(main).not.toContain('lens-option-tail');
    expect(main).not.toContain('whose argument is winning');
  });

  it('carries the key to all three of its marks, and why blank ground is blank', () => {
    expect(main).toContain('wash = the founder’s ink, darker is stronger; tight ring = holy site;');
    expect(main).toContain('wide ring = proclamation; unclaimed ground is blank because the tide acts on towns');
    // And the gesture that gives the reading, since the towns are where the
    // tide acts and the card is what says by how much (`faithHover.ts`).
    expect(main).toContain('hover a city for its pressure');
  });

  /**
   * The key is shown only while the lens is up. A paragraph in a closed menu is
   * noise, and *which pieces raise the lens* is pinned one file over
   * (`faithLens.test.ts`, on `lensForSelection`) rather than twice here.
   */
  it('shows the key only while that lens is the one on the board', () => {
    expect(main).toContain('key.hidden = true;');
    expect(main).toContain('if (option.key) option.key.hidden = !on;');
  });
});
