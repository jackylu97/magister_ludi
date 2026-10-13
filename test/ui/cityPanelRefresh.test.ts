/**
 * The city panel does no work twice for an unchanged world (browser performance
 * audit 2026-10-06, finding 7).
 *
 * Two layers, both in `cityPanel.ts`:
 *
 * - `render` skips the whole rebuild when `panelRenderKey` and the state object
 *   are what they were at the last render. `updatePanel` runs it after every
 *   selection and command, often two or three times in a row.
 * - the build list's "what if" previews are kept per building while the state
 *   object, its revision and the town stay the same
 *   (`createBuildingPreviewMemo`), so a tab or buy-mode click re-renders without
 *   folding the town twice per row again.
 *
 * Rule 5 is the constraint: every printed figure is still the fold of the
 * sim's own list. The memo tests below check that a kept list is equal to a
 * fresh `explainBuildingPreview` for several towns and buildings, and that a
 * new revision, town or game drops it. The suite has no document (see
 * `controls.test.ts`), so the render half is pinned by reading the source.
 */
import { describe, expect, it } from 'vitest';
import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt } from '../../src/sim/map';
import { readCity } from '../../src/sim/readings';
import { BUILDING_IDS } from '../../src/sim/buildingData';
import { type City, type GameState, bumpRevision } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';
import { explainBuildingPreview } from '../../src/sim/yields/town';
import { createBuildingPreviewMemo, panelRenderKey } from '../../src/ui/cityPanel';
import { braceBody, uiSource } from './sourceHelpers';
import { newGame } from '../sim/newGameHelpers';

function board(): { state: GameState; cities: City[] } {
  const state = newGame({
    seed: 3,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 20, height: 14, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(20 * 14).fill(null);
  state.units = [];
  const plant = (owner: number, col: number, row: number): City =>
    foundCityAt(state, owner, getTileAt(state.map, col, row)!);
  const cities = [plant(0, 4, 4), plant(0, 12, 4), plant(1, 8, 10)];
  cities[0]!.population = 7;
  cities[0]!.buildings.push('granary');
  cities[1]!.population = 3;
  cities[2]!.population = 5;
  bumpRevision(state);
  return { state, cities };
}

describe('the build list keeps its previews while the world stands still', () => {
  it('returns exactly what the sim returns, for every building in several towns', () => {
    const { state, cities } = board();
    const memo = createBuildingPreviewMemo();
    for (const city of cities) {
      const quote = readCity(state, city);
      for (const id of BUILDING_IDS) {
        expect(memo(state, city, id, quote)).toEqual(explainBuildingPreview(state, city, id, quote));
      }
    }
  });

  it('hands back the kept list at the same revision, and a fresh one after the world moves', () => {
    const { state, cities } = board();
    const city = cities[0]!;
    const memo = createBuildingPreviewMemo();
    const first = memo(state, city, 'barracks', readCity(state, city));
    expect(memo(state, city, 'barracks', readCity(state, city))).toBe(first);

    // A belief that wakes on a barracks changes the preview; the revision moves
    // with it, as it does for any accepted command.
    state.players[0]!.pantheon.beliefs.push('godOfTheForge');
    bumpRevision(state);
    const after = memo(state, city, 'barracks', readCity(state, city));
    expect(after).not.toBe(first);
    expect(after).toEqual(explainBuildingPreview(state, city, 'barracks'));
    expect(after).not.toEqual(first);
  });

  it('drops the kept lists for another town or another game', () => {
    const { state, cities } = board();
    const memo = createBuildingPreviewMemo();
    const here = memo(state, cities[0]!, 'library', readCity(state, cities[0]!));
    const there = memo(state, cities[1]!, 'library', readCity(state, cities[1]!));
    expect(there).not.toBe(here);
    expect(there).toEqual(explainBuildingPreview(state, cities[1]!, 'library'));

    const other = board();
    other.state.revision = state.revision;
    const fresh = memo(other.state, other.cities[1]!, 'library', readCity(other.state, other.cities[1]!));
    expect(fresh).not.toBe(there);
  });
});

describe('a render with nothing new to say is skipped', () => {
  it('keys on the revision, the town, the seat, buy mode and the guide', () => {
    const { state, cities } = board();
    const city = cities[0]!;
    const base = panelRenderKey(state, city, 0, false, false);
    expect(panelRenderKey(state, city, 0, false, false)).toBe(base);
    expect(panelRenderKey(state, cities[1]!, 0, false, false)).not.toBe(base);
    expect(panelRenderKey(state, city, 1, false, false)).not.toBe(base);
    expect(panelRenderKey(state, city, 0, true, false)).not.toBe(base);
    expect(panelRenderKey(state, city, 0, false, true)).not.toBe(base);
    bumpRevision(state);
    expect(panelRenderKey(state, city, 0, false, false)).not.toBe(base);
  });

  it('keys on the build-list tab, which lives in the module', () => {
    expect(braceBody(uiSource('cityPanel.ts'), 'export function panelRenderKey(')).toContain('addTab');
  });

  it('checks the key and the state object before taking anything down', () => {
    const body = braceBody(uiSource('cityPanel.ts'), '  function render(): void {');
    const check = body.indexOf('key === drawnKey');
    expect(check).toBeGreaterThan(-1);
    expect(body).toContain('drawing === drawnState');
    expect(body.indexOf('container.replaceChildren()')).toBeGreaterThan(check);
    expect(body.indexOf('info.hide()')).toBeGreaterThan(check);
  });

  it('prices each build-list row through the kept previews', () => {
    const body = braceBody(uiSource('cityPanel.ts'), 'function renderBuildables(');
    expect(body).toContain('buildingPreview(state, city, id, quote)');
    expect(body).not.toMatch(/\bexplainBuildingPreview\(/);
  });
});
