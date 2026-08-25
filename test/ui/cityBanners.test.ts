/**
 * The one further exclusion `visibleCityBanners` layers on top of fog: the
 * open city's own banner drops out of the list, full stop, whatever else is
 * true about it.
 *
 * Pure and state-in, list-out (see `cityBanners.ts`'s "The open city has no
 * banner"), so this is asserted without a renderer, a `container`, or any DOM
 * — the same reason `test/ui/tileReadout.test.ts` builds its state the way it
 * does. What is worth pinning here is exactly what a hide/show pair could get
 * wrong and a derived read cannot: every *other* banner — a second city of the
 * same seat, a rival's — must still be there, and un-hiding (passing `null`)
 * must bring the first one straight back, which is the whole of what "derived
 * every refresh" buys over "told to close".
 */

import { describe, expect, it } from 'vitest';

import { foundCityAt } from '../../src/sim/cities';
import { createMap, getTileAt } from '../../src/sim/map';
import { type GameState, newGame } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';
import { visibleCityBanners } from '../../src/ui/cityBanners';

/** A blank grassland board, two seats, nothing on it yet. */
function boardState(): GameState {
  const state = newGame({
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00', isHuman: true },
      { name: 'Bors', color: '#00a', isHuman: true },
    ],
  });
  // Swapped for a flat, generated-free rectangle for the same reason
  // `visibility.test.ts`'s `flatState` does: fog and sight are read off real
  // tiles, but which tiles they are is not the point of this suite.
  state.map = createMap({ width: 16, height: 10, terrain: 'grassland' });
  resetVisibility(state);
  state.units = [];
  state.cities = [];
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  resetVisibility(state);
  state.nextEntityId = 1;
  return state;
}

describe('visibleCityBanners', () => {
  it('lists every visible city when nothing is open', () => {
    const state = boardState();
    const mine = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    const other = foundCityAt(state, 0, getTileAt(state.map, 10, 4)!);
    // Owned by the *other* seat, but adjacent to `mine` and so well inside its
    // sight radius — visibility is asked of seat 0's grid, not of ownership.
    const rival = foundCityAt(state, 1, getTileAt(state.map, 5, 4)!);

    const ids = visibleCityBanners(state, 0, null).map((b) => b.cityId).sort();
    expect(ids).toEqual([mine.id, other.id, rival.id].sort((a, b) => a - b));
  });

  it('drops exactly the open city, and only while it is open', () => {
    const state = boardState();
    const mine = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    const other = foundCityAt(state, 0, getTileAt(state.map, 8, 4)!);

    const withOneOpen = visibleCityBanners(state, 0, mine.id);
    expect(withOneOpen.map((b) => b.cityId)).toEqual([other.id]);
    // The banner for the untouched city is unaffected by the exclusion.
    expect(withOneOpen[0].mine).toBe(true);

    // Un-hiding — the derived read after any close path, whatever it was —
    // brings the first banner straight back, with no memory of it having
    // been away.
    const withNoneOpen = visibleCityBanners(state, 0, null);
    expect(withNoneOpen.map((b) => b.cityId).sort((a, b) => a - b)).toEqual(
      [mine.id, other.id].sort((a, b) => a - b),
    );

    // And opening the *other* one hides that one instead — the End Turn
    // blocker landing on a different city, in miniature: no explicit
    // "un-hide the first" step, because there never was an imperative hide.
    const withOtherOpen = visibleCityBanners(state, 0, other.id);
    expect(withOtherOpen.map((b) => b.cityId)).toEqual([mine.id]);
  });

  it('hiding an id that names no visible city changes nothing', () => {
    const state = boardState();
    const mine = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);

    const facts = visibleCityBanners(state, 0, 999);
    expect(facts.map((b) => b.cityId)).toEqual([mine.id]);
  });
});
