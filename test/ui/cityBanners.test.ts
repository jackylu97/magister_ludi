/**
 * The one further exclusion `visibleCityBanners` layers on top of fog: the
 * open city's own banner drops out of the list, full stop, whatever else is
 * true about it — and, since the growth ring landed, the three states that ring
 * has, the ink it is drawn in and the one seat it is shown to.
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

import { foundCityAt, growthThreshold } from '../../src/sim/cities';
import { createMap, getTileAt } from '../../src/sim/map';
import { type GameState, newGame } from '../../src/sim/state';
import { resetVisibility } from '../../src/sim/visibility';
import {
  RING,
  cityGrowthRing,
  growthRing,
  visibleCityBanners,
} from '../../src/ui/cityBanners';

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

  /**
   * The ring is your own seat's, on the same gate production sits behind: a
   * rival's banner is a name, a flag and a size, and never that empire's food
   * ledger read off tiles this seat cannot see.
   */
  it('puts a ring on your own watched cities and on nobody else\u2019s', () => {
    const state = boardState();
    const mine = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    const rival = foundCityAt(state, 1, getTileAt(state.map, 5, 4)!);

    const facts = visibleCityBanners(state, 0, null);
    const ours = facts.find((b) => b.cityId === mine.id)!;
    const theirs = facts.find((b) => b.cityId === rival.id)!;

    expect(ours.growth).not.toBeNull();
    expect(ours.growth!.filled).toBeGreaterThanOrEqual(0);
    // Their size is a thing you can count by looking; their next citizen is not.
    expect(theirs.pop).not.toBe('');
    expect(theirs.growth).toBeNull();
  });
});

/**
 * The ring's three states (`docs/flags.md`, "Batch: city banner growth
 * countdown", the look re-ruled 2026-09-03): the banked arc, the pale arc for
 * what this turn adds, and the deficit that has neither.
 *
 * Asked of the arithmetic half, which is why it is a pure function: every one of
 * these is a case a real empire reaches rarely and a ring gets wrong on every
 * town at once — and an arc is the one thing on this banner that cannot be read
 * back off the DOM as a number.
 */
describe('growthRing', () => {
  it('fills the arc with what is banked against what it costs', () => {
    // Nine of eighteen banked, four more this turn: half the circle solid and
    // two ninths of it pale, with the words the tooltip says.
    expect(growthRing(4, 9, 18)).toEqual({
      filled: 0.5,
      ahead: 4 / 18,
      starving: false,
      label: 'Grows in 3 turns',
    });
  });

  it('says one turn in the singular', () => {
    expect(growthRing(6, 6, 12).label).toBe('Grows in 1 turn');
  });

  /**
   * A town one turn from growing usually banks more than it owes. Drawn
   * honestly the pale arc would run past twelve o'clock and start again, which
   * reads as *further away* — so it stops at the rim, and the two arcs never
   * sum past the whole circle.
   */
  it('clamps the pale arc at the rim rather than wrapping it', () => {
    const ring = growthRing(40, 10, 12);
    expect(ring.filled + ring.ahead).toBe(1);
    expect(ring.ahead).toBeCloseTo(1 / 6, 10);
    expect(ring.label).toBe('Grows in 1 turn');
  });

  /**
   * A basket that already covers the threshold grows at the next resolution
   * whatever the surplus is doing, so the ring is full and the words say so —
   * `turnsToFill`'s own reading of a thing already paid for.
   */
  it('closes the circle once the basket covers the threshold', () => {
    expect(growthRing(3, 14, 12)).toEqual({
      filled: 1,
      ahead: 0,
      starving: false,
      label: 'Grows next turn',
    });
  });

  it('draws no pale arc when nothing is being banked', () => {
    // A settler at the front of the queue, or the bottom rung of the happiness
    // ladder: the town banks nothing, so there is no step forward to draw.
    expect(growthRing(0, 6, 12)).toEqual({
      filled: 0.5,
      ahead: 0,
      starving: false,
      label: 'Growth stalled',
    });
  });

  it('marks a falling basket, which is not a slow one', () => {
    expect(growthRing(-2, 6, 12)).toEqual({
      filled: 0.5,
      ahead: 0,
      starving: true,
      label: 'Starving',
    });
    // The deficit is read first, exactly as the city panel's Growth line reads
    // it: a town losing food says so even when its basket is full today.
    expect(growthRing(-2, 20, 12).starving).toBe(true);
    expect(growthRing(-2, 20, 12).filled).toBe(1);
  });

  it('paints no arc at all before a town has banked anything', () => {
    expect(growthRing(0, 0, 12)).toEqual({
      filled: 0,
      ahead: 0,
      starving: false,
      label: 'Growth stalled',
    });
  });

  /**
   * Not reachable through `growthThreshold`, which never returns zero — but a
   * hand-edited save is a thing, and a division by zero paints `NaN` dashes,
   * which SVG renders as no ring at all, silently, on every town at once.
   */
  it('survives a threshold of nothing rather than painting NaN', () => {
    const ring = growthRing(2, 0, 0);
    expect(ring.filled).toBe(1);
    expect(ring.ahead).toBe(0);
    expect(Number.isFinite(ring.filled)).toBe(true);
  });
});

/**
 * The half of the ring that is not TypeScript. A rule that went missing is not
 * a broken banner — it is a badge with no dial on it, or one drawn in whatever
 * stroke SVG defaults to, which is the failure nothing else here can see. Read
 * the way `test/ui/tilePriceTags.test.ts` reads its plate.
 */
describe('the ring\u2019s ink', () => {
  const SOURCES = import.meta.glob(['../../src/style.css'], {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as Record<string, string>;

  /** One CSS rule's body, by selector. Comments are prose, not rules. */
  function rule(selector: string): string {
    const key = Object.keys(SOURCES).find((path) => path.endsWith('src/style.css'))!;
    const stripped = SOURCES[key]!.replace(/\/\*[\s\S]*?\*\//g, '');
    const at = stripped.indexOf(`\n${selector} {`);
    if (at < 0) throw new Error(`No rule for \`${selector}\``);
    const open = stripped.indexOf('{', at);
    return stripped.slice(open + 1, stripped.indexOf('}', open));
  }

  it('stacks the ring and the badge on one centre', () => {
    const box = rule('.city-banner-size');
    expect(box).toMatch(/display:\s*inline-grid/);
    expect(box).toMatch(/place-items:\s*center/);
    // One cell, both children in it: the badge is centred by the same rule that
    // stacks them, so a two-digit town cannot push its ring off true.
    expect(rule('.city-banner-size > *')).toMatch(/grid-area:\s*1 \/ 1/);
  });

  it('starts the arc at twelve o\u2019clock', () => {
    // An arc that began at three would read as already part-grown.
    expect(rule('.city-banner-ring')).toMatch(/transform:\s*rotate\(-90deg\)/);
  });

  it('speaks in the lifted voices, because the banner\u2019s ground is ink', () => {
    expect(rule('.city-banner-ring-fill')).toMatch(/stroke:\s*var\(--y-food-lit\)/);
    expect(rule('.city-banner-size.is-bad .city-banner-ring-fill')).toMatch(
      /stroke:\s*var\(--vermilion-lit\)/,
    );
  });

  /**
   * The pale arc is the *same* green held back, not a second colour: it is a
   * tense — what the next resolution does — and a hue of its own would read as
   * a different quantity.
   */
  it('holds the ahead arc back rather than recolouring it', () => {
    const ahead = rule('.city-banner-ring-ahead');
    expect(ahead).toMatch(/stroke:\s*var\(--y-food-lit\)/);
    const opacity = /opacity:\s*([\d.]+)/.exec(ahead);
    expect(opacity).not.toBeNull();
    expect(Number(opacity![1])).toBeLessThan(1);
    expect(Number(opacity![1])).toBeGreaterThan(0);
  });

  it('keeps the badge inside the ring it is drawn in', () => {
    const box = /width:\s*(\d+)px/.exec(rule('.city-banner-size'));
    const badge = /height:\s*([\d.]+)px/.exec(rule('.city-banner-pop'));
    expect(box).not.toBeNull();
    expect(badge).not.toBeNull();
    // The stroke is drawn on the radius, so the ring's inner edge is half a
    // stroke inside the box: a badge as wide as the box would sit under it.
    expect(Number(badge![1])).toBeLessThan(Number(box![1]) - RING.width * 2);
  });
});

/**
 * The seam to the simulation: the ring is `growthSurplus`'s figure, not the
 * harvest, so every rule that stands between a town's food and its basket moves
 * the arcs. A settler at the front of the queue is the one that is a single
 * assignment away.
 */
describe('cityGrowthRing', () => {
  it('reads the growth surplus, so a settler at the front stops the pale arc', () => {
    const state = boardState();
    const city = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);

    const growing = cityGrowthRing(state, city);
    expect(growing.starving).toBe(false);
    expect(growing.ahead).toBeGreaterThan(0);
    expect(growing.label).toMatch(/^Grows in \d+ turns?$/u);

    city.queue = [{ kind: 'unit', id: 'settler' }];
    const stalled = cityGrowthRing(state, city);
    expect(stalled.ahead).toBe(0);
    expect(stalled.label).toBe('Growth stalled');
  });

  it('measures the arc against the threshold the simulation charges', () => {
    const state = boardState();
    const city = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    const threshold = growthThreshold(city.population);

    city.foodBasket = threshold / 4;
    expect(cityGrowthRing(state, city).filled).toBeCloseTo(0.25, 10);

    city.foodBasket = threshold;
    const full = cityGrowthRing(state, city);
    expect(full.filled).toBe(1);
    expect(full.ahead).toBe(0);
    expect(full.label).toBe('Grows next turn');
  });
});
