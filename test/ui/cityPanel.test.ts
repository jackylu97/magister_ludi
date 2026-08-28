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

import { describe, expect, it } from 'vitest';

import { createMap, getTileAt } from '../../src/sim/map';
import { explainBuildingPreview, foldBuildingPreview, foundCityAt } from '../../src/sim/cities';
import { beliefDef } from '../../src/sim/religionData';
import { type City, type GameState, newGame } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';
import { previewFigures, previewLineText } from '../../src/ui/cityPanel';

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
