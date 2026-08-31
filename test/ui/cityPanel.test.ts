/**
 * The build list's preview — a row's figure and its hover card — off the sim's
 * own fold (user, 2026-08-28: "orders + religion benefits should show in city
 * build screen … preview for barracks in the city build list should show +1
 * prod").
 *
 * `explainBuildingPreview` and `foldBuildingPreview` are the sim's (see
 * `test/sim/cities.test.ts` for the claim that the fold is exactly the true
 * difference); this suite is only about the two pure printers the panel calls
 * to turn that list into what a player reads — `previewFigures` (the row's
 * dash-or-figures total) and `previewLineText` (one hover line, the sim's
 * label with its figures appended). Neither re-derives a number: every
 * assertion below is the printer applied to a list the sim actually returned.
 *
 * No jsdom (`controls.test.ts`), so the two are exported and called directly,
 * exactly as `stageRows` is in `cityModifiers.test.ts` — the DOM half of
 * `renderBuildables`/`buildingCard` is three lines that hand a printer's
 * output to an element, and nothing about a house dash or a joined line needs
 * a document to hold still.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { createMap, getTileAt } from '../../src/sim/map';
import { explainBuildingPreview, foldBuildingPreview, foundCityAt } from '../../src/sim/cities';
import { beliefDef } from '../../src/sim/religionData';
import { type City, type GameState, newGame } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';
import { cityGuildInflow, dismissSpecialistError, idleCitizens } from '../../src/sim/guilds';
import { guildThreshold } from '../../src/sim/specialists';
import { figure } from '../../src/ui/figures';
import {
  dismissBlocker,
  guildBarText,
  previewFigures,
  previewLineText,
  specialistRow,
  specialistRowText,
} from '../../src/ui/cityPanel';

/** A two-player state on a blank, landlocked desert rectangle — `cities.test.ts`'s `flatState`. */
function flatState(width = 16, height = 12): GameState {
  const state = newGame({
    seed: 1,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width, height, terrain: 'desert' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  return state;
}

function plant(state: GameState, ownerId: number, col: number, row: number): City {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return foundCityAt(state, ownerId, tile);
}

describe('the row figure: the fold, or the house dash', () => {
  it('is the dash while nothing wakes, and the belief’s gain the moment it does', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);

    // No god: a barracks pays nothing of its own (`explainBuildingYield`'s
    // list is all zero), so the preview is empty and the row prints the same
    // dash `turnsLabel` prints for an unanswerable estimate.
    const before = explainBuildingPreview(state, city, 'barracks');
    expect(before).toEqual([]);
    expect(previewFigures(foldBuildingPreview(before)) || '—').toBe('—');

    // God of the Forge: "Barracks supply +1 production" — a `cityYields`
    // effect scoped `hasBuilding: barracks`, invisible to the building's own
    // row and visible only to this preview.
    state.players[0]!.pantheon.beliefs.push('godOfTheForge');
    const after = explainBuildingPreview(state, city, 'barracks');
    const rowFigure = previewFigures(foldBuildingPreview(after)) || '—';
    expect(rowFigure).toBe('+1⚙');
  });

  it('folds to the row’s own figure when no card is in play', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    // A granary pays its table figure on its own — the fold with no card in
    // play is exactly that, "the row's base figure" — on a landlocked desert
    // town its water tile-line (gated on Sailing) never fires.
    const lines = explainBuildingPreview(state, city, 'granary');
    expect(previewFigures(foldBuildingPreview(lines))).toBe('+3🌾');
  });
});

describe('the hover card: every preview line, the sim’s own label', () => {
  it('carries the extra line for the belief, and only that line', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    state.players[0]!.pantheon.beliefs.push('godOfTheForge');
    const lines = explainBuildingPreview(state, city, 'barracks');
    expect(lines).toHaveLength(1);

    const hover = lines.map(previewLineText);
    expect(hover).toHaveLength(1);
    // The sim's own label, printed exactly as it labelled it — never reworded
    // or re-derived by the panel.
    expect(hover[0]).toBe(`${lines[0]!.source} +1⚙`);
    expect(hover[0]).toContain(beliefDef('godOfTheForge').name);
  });

  it('prints no line at all without the belief', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    expect(explainBuildingPreview(state, city, 'barracks').map(previewLineText)).toEqual([]);
  });

  it('joins a source and its figures with one space, and a figure-less line — the reconciliation floor, say — with none', () => {
    // No zero-figure line exists in today's content (`previewPays` never lets
    // one into the sim's list), so this is `previewLineText`'s own contract
    // rather than a fixture: the fallback branch a future all-rounding line
    // would take is exercised directly.
    expect(previewLineText({ source: 'Rounding', food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 })).toBe(
      'Rounding',
    );
    expect(
      previewLineText({ source: 'Granary', food: 3, production: 0, gold: 0, science: 0, culture: 0, faith: 0 }),
    ).toBe('Granary +3🌾');
  });
});

describe('the fold equals the printed total', () => {
  it('sums the same six voices `foldBuildingPreview` sums, in the same glyphs', () => {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    state.players[0]!.pantheon.beliefs.push('godOfTheForge', 'keeperOfTheHearth');
    for (const id of ['barracks', 'granary', 'monument'] as const) {
      const lines = explainBuildingPreview(state, city, id);
      const fold = foldBuildingPreview(lines);
      // The row's printed figure, reconstructed from the hover's own lines by
      // hand — food/production/etc. summed the way `foldBuildingPreview`
      // sums them — must be the same string `previewFigures(fold)` prints.
      const byHand = { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
      for (const line of lines) {
        byHand.food += line.food;
        byHand.production += line.production;
        byHand.gold += line.gold;
        byHand.science += line.science;
        byHand.culture += line.culture;
        byHand.faith += line.faith;
      }
      expect(byHand).toEqual(fold);
      expect(previewFigures(fold)).toBe(previewFigures(byHand));
    }
  });
});

/**
 * The panel's arithmetic budget, read off its own source (user, 2026-08-29:
 * "the city screen is also starting to lag").
 *
 * The build list prices every row of a town — thirty-odd buildings, a dozen
 * units, the queue and the head — and every one of those prices used to be a
 * whole `cityYields`, which walks the empire twice for the two meter tiers. One
 * render was well over a hundred folds of the same town. `CityQuote` is the
 * half of that fold no *row* can change, taken once in `render` and handed to
 * every estimate below it, and the arithmetic is unchanged: `test/sim/cities.
 * test.ts` pins that a quoted answer is the unquoted one for every row in the
 * game, including the two cards that narrow their hammers to one silhouette and
 * to one building category.
 *
 * Pinned by reading the source rather than by counting calls at runtime,
 * because the property is structural and the suite has no document to render a
 * panel into (module docblock): **a fold asked in a section is asked with the
 * quote, and a fold asked without one belongs to a hover card**. A hover card
 * builds one at a time, when a pointer rests on a row, and reads the sim fresh
 * for exactly that reason — see `infoCard.bind`, which takes a builder and not
 * a node. The next row loop that forgets the quote is a hundred empire sweeps
 * back, and this is what says so.
 */
describe('the build list prices rows off one quote', () => {
  const UI_SOURCE = import.meta.glob('../../src/ui/*.ts', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as Record<string, string>;

  function panelSource(): string {
    const key = Object.keys(UI_SOURCE).find((path) => path.endsWith('/cityPanel.ts'));
    expect(`cityPanel.ts readable`).toBe(
      key === undefined ? 'cityPanel.ts missing' : 'cityPanel.ts readable',
    );
    return UI_SOURCE[key!]!;
  }

  /** Every line that folds the city — the two the row loops used to pay for. */
  function foldLines(source: string): { text: string; index: number }[] {
    const lines = source.split('\n');
    const found: { text: string; index: number }[] = [];
    lines.forEach((text, index) => {
      if (/\b(turnsToBuild|explainBuildingPreview)\(/.test(text)) found.push({ text, index });
    });
    return found;
  }

  it('takes exactly one quote, in `render`', () => {
    const source = panelSource();
    expect(source.match(/\bcityQuote\(/g) ?? []).toHaveLength(1);
    // And it is taken where the panel starts drawing, not inside a section that
    // would then be taking one per section.
    const at = source.indexOf('cityQuote(');
    expect(at).toBeGreaterThan(source.indexOf('// --- the whole panel'));
  });

  it('asks every section’s estimate with it, and only the hover cards without', () => {
    const source = panelSource();
    const sections = source.split('\n').findIndex((line) => line.includes('// --- sections'));
    expect(sections).toBeGreaterThan(0);
    const folds = foldLines(source);
    // Not vacuous: the list loops, the queue, the progress head and the three
    // cards are all in here.
    expect(folds.length).toBeGreaterThanOrEqual(8);
    for (const { text, index } of folds) {
      const quoted = text.includes('quote');
      const where = `${text.trim()} (line ${index + 1})`;
      expect(where).toBe(
        quoted === index > sections ? where : `${where} — a section fold must carry the quote`,
      );
    }
  });

  it('reads the percentages off the quote rather than folding them again', () => {
    // `cityYieldPercents` is `cityQuote`'s own work; a panel that called it
    // beside the quote would be walking the empire's two meters a second time
    // to print the very list the quote already holds.
    expect(panelSource()).not.toMatch(/\bcityYieldPercents\(/);
    expect(panelSource()).toMatch(/quote\.percents/);
  });
});



/**
 * The Specialists row (ledger Entry XLVIII), through the three printers the DOM
 * builder lays out — `previewLineText`'s split for the same reason: this suite
 * has no jsdom, and a row that is merely *wrong* throws nothing.
 */
describe('the specialists row', () => {
  function guilded(): { state: GameState; city: City } {
    const state = flatState();
    const city = plant(state, 0, 8, 5);
    city.population = 12;
    return { state, city };
  }

  it('is absent entirely until a town has a guild', () => {
    const { city } = guilded();
    // The ruling's "ignorable" as a return value: no row, rather than a row
    // saying zero on every town from turn one.
    expect(specialistRow(city)).toBeNull();
  });

  it('reads as the count and then one family at a time, in the fixed order', () => {
    const { city } = guilded();
    city.specialists.scholar = 3;
    city.specialists.merchant = 2;
    city.specialists.artist = 1;
    const parts = specialistRow(city);
    expect(parts).not.toBeNull();
    expect(specialistRowText(parts!)).toBe(
      'Specialists 6 · 3 scholars +6🔬 · 2 merchants +8💰 · 1 artist +2🎭',
    );
    // A family with nobody in it is not a part, and the order is the
    // apportionment's own.
    expect(parts!.families.map((entry) => entry.family)).toEqual([
      'scholar',
      'merchant',
      'artist',
    ]);
  });

  it('quotes the bar the phase itself compares against', () => {
    const { state, city } = guilded();
    city.specialists.scholar = 1;
    city.guildBasket = 12;
    // `guildThreshold` at one guild held, and the fold of `explainGuildInflow` —
    // no arithmetic of the panel's own.
    expect(guildBarText(state, city)).toContain(`/ ${guildThreshold(city)} `);
    expect(guildBarText(state, city)).toContain(
      `+${figure(cityGuildInflow(state, city))} renown a turn`,
    );
  });

  it('names the idle on a line of their own, and only when there are any', () => {
    const { state, city } = guilded();
    city.specialists.scholar = 1;
    const idle = idleCitizens(state, city);
    if (idle > 0) expect(guildBarText(state, city)).toContain(`${idle} idle · +`);
    else expect(guildBarText(state, city)).not.toContain(' idle · ');
  });

  it('greys Dismiss with the simulation’s own sentence', () => {
    const { state, city } = guilded();
    city.specialists.scholar = 1;
    // Available: the reducer would take it.
    expect(dismissBlocker(state, 0, city, 'scholar', false)).toBeNull();
    // And every refusal is the reducer's word for word, never a second sentence
    // composed here.
    expect(dismissBlocker(state, 0, city, 'artist', false)).toBe(
      dismissSpecialistError(state, 0, city, 'artist'),
    );
    expect(dismissBlocker(state, 1, city, 'scholar', false)).toBe(
      dismissSpecialistError(state, 1, city, 'scholar'),
    );
    // The one clause the panel adds is about the screen, not the town.
    expect(dismissBlocker(state, 0, city, 'scholar', true)).toMatch(/ended turn/);
  });
});

describe('the build list hides what can never be built (user, 2026-08-30)', () => {
  // Source-reading pins, the register's style: a row no technology can reach
  // and a wonder already claimed are *hidden*, never greyed — the greyed rows
  // are for things a player can do something about.
  const source = readFileSync(resolve(__dirname, '../../src/ui/cityPanel.ts'), 'utf8');
  it('skips awaitsTech rows in every roster loop', () => {
    expect(source.match(/awaitsTech === true\) continue;/g)?.length).toBeGreaterThanOrEqual(3);
  });
  it('skips a wonder somebody already raised', () => {
    expect(source).toContain('wonderClaim(getGame().state, id) !== undefined) continue;');
  });
});
