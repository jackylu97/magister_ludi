/**
 * **The words under the marker** — `docs/flags.md` item (ttttt).
 *
 * The user asked for the hover to say *why*: *"we recommend you build a city
 * here - access to X luxuries, the yields are good, etc"*, and the ruling wrote
 * the sentence out — "A good site: three luxuries in reach (Silk, Wine, Gems),
 * fresh water, strong food".
 *
 * Three claims:
 *
 *   1. **It speaks only for the hexes the board marked.** The row reads
 *      `readSites`, which is the list the marker is drawn from, so a sentence
 *      never appears under a hex with no pennant on it and a pennant never
 *      appears over a hex with nothing to say.
 *   2. **It names the luxuries**, in the resources' own words.
 *   3. **No figures** (rule 7). A count is a word; nothing in the sentence is a
 *      digit, because the numbers live in the ledger behind it.
 *
 * Core tier: pure strings, no DOM.
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt, foundingErrorAt } from '../../src/sim/cities';
import { createMap, getTileAt } from '../../src/sim/map';
import { readSites } from '../../src/sim/readings';
import { bumpRevision, type GameState, newGame } from '../../src/sim/state';
import { EXPLORED, resetVisibility } from '../../src/sim/visibility';
import { computeFreshwater } from '../../src/sim/water';
import { recommendedSiteRow } from '../../src/ui/tileReadout';

/** The ruling's own board: three named luxuries in one hex's ring. */
function board(): GameState {
  const state = newGame({
    seed: 4,
    sizeName: 'duel',
    players: [
      { name: 'A', color: '#a00', isHuman: true },
      { name: 'B', color: '#00a', isHuman: true },
    ],
  });
  state.map = createMap({ width: 12, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.cities = [];
  state.camps = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  for (const tile of state.map.tiles) delete tile.discovery;
  computeFreshwater(state.map);
  for (const [id, col, row] of [
    ['silk', 5, 4],
    ['wine', 7, 4],
    ['gems', 6, 6],
  ] as const) {
    getTileAt(state.map, col, row)!.resource = id;
  }
  const settler = state.units.find((unit) => unit.ownerId === 0);
  if (settler) {
    settler.col = 6;
    settler.row = 5;
    state.units = [settler];
  }
  foundCityAt(state, 0, getTileAt(state.map, 1, 1)!);
  state.visibility[0]!.fill(EXPLORED);
  bumpRevision(state);
  return state;
}

describe('the recommendation in words', () => {
  it('names the luxuries a marked site would reach, counted in words', () => {
    const state = board();
    const marked = readSites(state, 0);
    expect(marked.length).toBeGreaterThan(0);
    const best = marked[0]!;
    const words = recommendedSiteRow(state, 0, getTileAt(state.map, best.col, best.row)!);
    expect(words).not.toBeNull();
    expect(words!).toMatch(/^A good site: /);
    expect(words!).toMatch(/three luxuries in reach \(/);
    for (const name of ['Silk', 'Wine', 'Gems']) expect(words!).toContain(name);
    // The house list: commas between, "and" before the last. The order is the
    // ring walk's — a fact about the board rather than about the sentence.
    expect(words!).toMatch(/\(\w+, \w+ and \w+\)/);
    // And the whole sentence reads as the ruling wrote it.
    expect(words!).toBe('A good site: three luxuries in reach (Silk, Gems and Wine) and strong food.');
  });

  it('says nothing at all about a hex the board did not mark', () => {
    const state = board();
    const marked = new Set(readSites(state, 0).map((row) => `${row.col},${row.row}`));
    let asked = 0;
    for (const tile of state.map.tiles) {
      if (marked.has(`${tile.col},${tile.row}`)) continue;
      expect(recommendedSiteRow(state, 0, tile), `(${tile.col},${tile.row})`).toBeNull();
      asked += 1;
    }
    // Not vacuous, and it includes ground the rules would refuse outright.
    expect(asked).toBeGreaterThan(50);
    const refused = state.map.tiles.find((tile) => foundingErrorAt(state, 0, tile) !== null)!;
    expect(recommendedSiteRow(state, 0, refused)).toBeNull();
  });

  it('prints no figures — rule 7, the numbers stay in the ledger', () => {
    const state = board();
    for (const row of readSites(state, 0)) {
      const words = recommendedSiteRow(state, 0, getTileAt(state.map, row.col, row.row)!)!;
      expect(words, words).not.toMatch(/[0-9]/);
      expect(words.endsWith('.'), words).toBe(true);
    }
  });
});
