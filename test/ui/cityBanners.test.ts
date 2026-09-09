/**
 * The one further exclusion `visibleCityBanners` layers on top of fog: the
 * open city's own banner drops out of the list, full stop, whatever else is
 * true about it — and, since the growth ring landed, the three states that ring
 * has, the ink it is drawn in and the one seat it is shown to — and, since the
 * hit-point bar landed beside it, the wound on the banner's foot: the town that
 * carries none because it is whole, the one that carries none because it is
 * only remembered, and the walls that are a longer bar rather than a second
 * segment.
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
import { cityMaxHp } from '../../src/sim/combat';
import { createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { type GameState, createUnit, newGame, bumpRevision } from '../../src/sim/state';
import { unitDef } from '../../src/sim/unitData';
import { EXPLORED, resetVisibility } from '../../src/sim/visibility';
import { badgeClassFor } from '../../src/render3d/board3d';
import {
  RING,
  cityGrowthRing,
  cityHealthBar,
  garrisonBadgeUri,
  growthRing,
  healthBar,
  strongestGarrison,
  visibleCityBanners,
} from '../../src/ui/cityBanners';
import { braceBody, uiSource } from './sourceHelpers';

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

  /**
   * The bar is the *size figure's* kind of fact and not the ring's: a rival's
   * countdown is that empire's food ledger read off tiles this seat cannot see,
   * while a rival's hit points are a fact about a thing this seat is looking at
   * — the board already draws exactly that bar over every hurt piece on it,
   * whoever owns the piece.
   */
  it('puts a bar on every watched town that is hurt, yours and theirs', () => {
    const state = boardState();
    const mine = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    const rival = foundCityAt(state, 1, getTileAt(state.map, 5, 4)!);
    rival.hp = Math.round(cityMaxHp(rival) / 2);

    const facts = visibleCityBanners(state, 0, null);
    const ours = facts.find((b) => b.cityId === mine.id)!;
    const theirs = facts.find((b) => b.cityId === rival.id)!;

    // A whole town is the banner that shipped before this pass: no bar at all.
    expect(ours.health).toBeNull();
    expect(theirs.health).not.toBeNull();
    expect(theirs.health!.filled).toBeCloseTo(0.5, 2);
    // And still no ring on it, which is what makes the two gates two rules.
    expect(theirs.growth).toBeNull();
  });

  /**
   * The fog rule the banner already keeps, kept: a sighting is a name and a
   * flag (`rememberedFacts`), and hit points twenty turns stale would be the
   * worst number on this surface to quote as current — a siege that may have
   * been lifted, or lost.
   */
  it('draws no bar on a remembered town, however hurt it was', () => {
    const state = boardState();
    foundCityAt(state, 0, getTileAt(state.map, 2, 2)!);
    // Far outside seat 0's sight, then wounded and *remembered*.
    const far = foundCityAt(state, 1, getTileAt(state.map, 13, 8)!);
    far.hp = 3;
    const tile = getTileAt(state.map, far.col, far.row)!;
    state.visibility[0]![tileIndex(state.map, tile.col, tile.row)] = EXPLORED;
    state.citySightings[0] = [
      { cityId: far.id, col: far.col, row: far.row, name: far.name, ownerId: far.ownerId },
    ];

    const remembered = visibleCityBanners(state, 0, null).find((b) => b.cityId === far.id)!;
    expect(remembered.stale).toBe(true);
    expect(remembered.health).toBeNull();
    // The other two memory-less figures are still absent, which is the rule
    // this one joined rather than a rule of its own.
    expect(remembered.pop).toBe('');
    expect(remembered.growth).toBeNull();
  });
});

/**
 * The bar's three answers (the user, 2026-09-07, `docs/flags.md` item ii: "we
 * need an hp bar for cities, maybe it can be integrated with the city banner"):
 * nothing at all, a fraction of the channel, and the floor a besieger cannot
 * push a town past.
 *
 * Asked of the arithmetic half for `growthRing`'s reason — the absence is the
 * design, and an absence is the one thing that cannot be read back off a banner
 * as a number.
 */
describe('healthBar', () => {
  it('draws nothing at all on a town that is whole', () => {
    // **The** rule of this bar, and the piece's own (`hpBarFill`): a full bar
    // on every town is furniture, and the reading wanted is which town is hurt.
    expect(healthBar(100, 100, false)).toBeNull();
  });

  it('fills the channel with what is left, and prints the panel’s own figures', () => {
    expect(healthBar(84, 115, false)).toEqual({
      filled: 84 / 115,
      breached: false,
      label: '84/115 hp',
    });
  });

  /**
   * "Walls down" is a clause on the hover and not a second drawing: the town is
   * on `cityBeatenDown`'s floor, which is the predicate the three beats of an
   * assault turn on, and the bar is already sitting on its minimum.
   */
  it('names the breach in words rather than in a second mark', () => {
    const bar = healthBar(1, 115, true)!;
    expect(bar.breached).toBe(true);
    expect(bar.label).toBe('Walls down · 1/115 hp');
    expect(bar.filled).toBeCloseTo(1 / 115, 10);
  });

  it('clamps rather than overflowing, whatever a save holds', () => {
    // Above the maximum reads as whole, which is the same answer as whole.
    expect(healthBar(140, 115, false)).toBeNull();
    // And below zero is the empty channel, not a negative width.
    expect(healthBar(-4, 115, true)!.filled).toBe(0);
  });

  /**
   * Not reachable through `cityMaxHp`, but a hand-edited save is a thing and a
   * division by zero writes a `NaN` width — which the DOM resolves to no width
   * at all, silently, on every hurt town at once.
   */
  it('survives a maximum of nothing rather than painting NaN', () => {
    expect(healthBar(5, 0, false)).toBeNull();
  });
});

/**
 * The seam to the simulation, and the trap CLAUDE.md names by name: a town's
 * maximum is `cityMaxHp` — the base plus every wall it has built — and never
 * `combat.cityBaseHp`.
 */
describe('cityHealthBar', () => {
  it('measures against the walls the town actually built', () => {
    const state = boardState();
    const city = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    expect(cityHealthBar(city)).toBeNull();

    const bare = cityMaxHp(city);
    city.hp = bare - 10;
    const wounded = cityHealthBar(city)!;
    expect(wounded.filled).toBeCloseTo((bare - 10) / bare, 10);
    expect(wounded.label).toBe(`${bare - 10}/${bare} hp`);

    // The palisade is the walls decision in one assertion: it lengthens the bar
    // rather than adding a segment to it, so the *same* hit points read as less
    // of a wound the day the stakes go up.
    city.buildings = [...city.buildings, 'palisade'];
    bumpRevision(state);
    const walled = cityHealthBar(city)!;
    expect(cityMaxHp(city)).toBeGreaterThan(bare);
    expect(walled.filled).toBeLessThan(wounded.filled);
    expect(walled.label).toBe(`${bare - 10}/${cityMaxHp(city)} hp`);
  });

  it('says the walls are down on the floor the simulation holds', () => {
    const state = boardState();
    const city = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    city.hp = 1;
    expect(cityHealthBar(city)!.breached).toBe(true);
    city.hp = 2;
    // One above the floor is a wounded town and not a breached one — the bar
    // asks `cityBeatenDown` rather than comparing hit points itself.
    expect(cityHealthBar(city)!.breached).toBe(false);
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

  /**
   * The bar's half of the same bargain. Its two insets are the pill's own
   * geometry — one clears the size roundel so the bar never cuts across the
   * seat's tincture, the other clears the 999px cap at the height the bar sits
   * at — and neither is a thing TypeScript can be wrong about.
   */
  it('lays the channel on the pill’s foot, clear of the badge and the cap', () => {
    const channel = rule('.city-banner-health');
    expect(channel).toMatch(/position:\s*absolute/);
    expect(channel).toMatch(/bottom:\s*2px/);
    // The badge is a 26px roundel in a 32px box against the pill's left edge.
    const left = /left:\s*(\d+)px/.exec(channel);
    expect(left).not.toBeNull();
    expect(Number(left![1])).toBeGreaterThanOrEqual(29);
    // And the right end stops short of the cap rather than poking out of it.
    const right = /right:\s*(\d+)px/.exec(channel);
    expect(right).not.toBeNull();
    expect(Number(right![1])).toBeGreaterThan(0);
    // The pill is the button; a child that swallowed a press would be a banner
    // with a dead stripe across it.
    expect(channel).toMatch(/pointer-events:\s*none/);
  });

  it('speaks the channel in the ring’s track and the fill in the alarm', () => {
    // One convention per surface: the ground is ink, so a channel is parchment
    // held back — the ring's track exactly, and never an ink rim, which on ink
    // is not a channel but nothing.
    expect(rule('.city-banner-health')).toMatch(
      /background:\s*rgba\(247,\s*242,\s*225,\s*0\.22\)/,
    );
    // One ink, because the bar is drawn only on a town that is hurt. The board's
    // second, calmer colour sorts a battle line of pieces; a banner shows one
    // town, and the ring beside it already owns two colours about food.
    expect(rule('.city-banner-health-fill')).toMatch(/background:\s*var\(--vermilion-lit\)/);
  });

  /**
   * `hpBarFillWidth`'s rule, one surface over: a town on the floor still holds
   * its hex, and a channel with nothing in it reads as a razed one.
   */
  it('never lets the fill draw as nothing', () => {
    const min = /min-width:\s*([\d.]+)px/.exec(rule('.city-banner-health-fill'));
    expect(min).not.toBeNull();
    expect(Number(min![1])).toBeGreaterThan(0);
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
 * The two halves of "it repaints when the town's hit points move, and never
 * otherwise", neither of which is a value a caller can read back: the module's
 * own signature gate, and the gallery's standing bargain that nothing on
 * `flair.html` is a second copy of what the game draws.
 *
 * Read as source for `test/ui/tilePriceTags.test.ts` reads its plate — there is
 * no jsdom in this project, so the DOM half of this module is pinned by what it
 * is written to do.
 */
describe('the wound’s fingerprint, and its stall', () => {
  const MODULES = import.meta.glob(
    [
      '../../src/ui/cityBanners.ts',
      '../../src/flairGallery/flourishes.ts',
      '../../src/flairGallery/style.css',
    ],
    { eager: true, query: '?raw', import: 'default' },
  ) as Record<string, string>;

  function source(name: string): string {
    const key = Object.keys(MODULES).find((path) => path.endsWith(name));
    const text = key === undefined ? undefined : MODULES[key];
    if (typeof text !== 'string' || text.length === 0) {
      throw new Error(`${name} came back empty`);
    }
    return text;
  }

  /**
   * The banner's rebuild rule is its **signature string** and not the board's
   * city fingerprint. `signCities`/`CityLook` gate the houses, the pole and the
   * walls of the 3D town, and hit points move none of them — a town would
   * rebuild its sculpt every time it was scratched, and the banner is not in
   * that layer at all (it is DOM over the canvas).
   */
  it('folds the bar into the signature the banner is rewritten on', () => {
    const text = source('ui/cityBanners.ts').replace(/\/\*[\s\S]*?\*\//g, '');
    const line = text.split('\n').find((row) => row.includes('const signature = '));
    expect(line).toBeDefined();
    expect(line!).toMatch(/\$\{wound\}/);
    // And the term is the fraction *and* the words, so a blow that lands, a
    // wall that finishes and a breach all move it.
    expect(text).toMatch(/const wound = [^\n]*filled\.toFixed\(4\)[^\n]*label/);
    // Painted inside the gate, beside the arcs, rather than on every refresh.
    expect(text).toMatch(/paintHealthBar\(banner\.health, facts\.health\)/);
  });

  /**
   * The cabinet's bargain (`flairGallery/main.ts`, "Nothing is reproduced"): the
   * page may lay the banner out and give it a ground; it may not own a second
   * copy of what a width means, or the stall goes stale silently the first time
   * the shipping rule moves.
   */
  it('shows the shipping bar on flair.html rather than a drawing of one', () => {
    const gallery = source('flairGallery/flourishes.ts');
    for (const called of ['buildHealthBar', 'paintHealthBar', 'cityHealthBar', 'cityMaxHp']) {
      expect(gallery).toMatch(new RegExp(`\\b${called}\\b`));
    }
    // The knob drives real hit points on a real town, which is the only way a
    // bar measured against `cityMaxHp` can be judged with the walls on.
    expect(gallery).toMatch(/foundCityAt/);
    expect(gallery).toMatch(/'palisade'/);
    // No arithmetic of its own: a percentage or a `filled` written here would be
    // the page repainting the thing it exists to inspect.
    const stall = gallery.slice(gallery.indexOf('function cityBannerStall'));
    const body = stall.slice(0, stall.indexOf('\n}\n'));
    expect(body).not.toMatch(/filled/);
    expect(body).not.toMatch(/%`/);
  });

  it('lets the gallery place the banner and repaint nothing', () => {
    const local = source('flairGallery/style.css');
    const banner = local.slice(local.indexOf('--- the city banner'));
    // The one override, and the reason: the pill is `position: absolute` and
    // lifted clear of its tile because `projectCell` anchors it every frame,
    // and nothing anchors it here.
    expect(banner).toMatch(/\.banner-slot \.city-banner \{[\s\S]*?position: static;/);
    for (const painted of ['--vermilion-lit', 'min-width', 'city-banner-health-fill']) {
      expect(banner.includes(painted)).toBe(false);
    }
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

// --- the puppet's yoke ------------------------------------------------------

describe('a puppet says so beside its name', () => {
  it('marks a town of yours that is held as a puppet', () => {
    const state = boardState();
    const city = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    expect(visibleCityBanners(state, 0, null)[0]!.puppet).toBe(false);
    city.puppet = true;
    expect(visibleCityBanners(state, 0, null)[0]!.puppet).toBe(true);
    // Annexation is the one verb, and it deletes the key — presence is the state.
    delete city.puppet;
    expect(visibleCityBanners(state, 0, null)[0]!.puppet).toBe(false);
  });

  it('says nothing about the inside of somebody else’s empire', () => {
    const state = boardState();
    foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    const rival = foundCityAt(state, 1, getTileAt(state.map, 5, 4)!);
    rival.puppet = true;
    const banner = visibleCityBanners(state, 0, null).find((b) => b.cityId === rival.id)!;
    expect(banner.mine).toBe(false);
    expect(banner.puppet).toBe(false);
  });

  /** One drawing, two printers — the flag's mark and the banner's are the same. */
  it('is drawn from the one mark the board’s own banner flies', () => {
    const banners = uiSource('cityBanners.ts');
    expect(banners).toContain("cityMarkDataUri('puppet')");
    const css = uiSource('style.css');
    expect(css).toContain('.city-banner-yoke');
    // A mask, so it takes the banner's ink and dims with it when the card
    // goes stale.
    const rule = css.slice(css.indexOf('.city-banner-yoke'));
    expect(rule.slice(0, rule.indexOf('}'))).toContain('mask-image: var(--yoke-mark)');
  });
});

// --- the garrison slot ------------------------------------------------------

/**
 * **The badge came into the plate** (U5, 2026-09-09). U4 hung it over the 3D
 * flagpole and the user could not see it, for a reason no amount of dialling
 * would have fixed: this banner is HTML positioned over the canvas, it covers
 * the town's own hex, and a mark at the pole's height is behind it. So the 3D
 * layer was retired and the slot is on the pill.
 *
 * The bench the user asked for is here in full — a scout, a worker and a warrior
 * standing in the capital in turn, then all three at once — because the point of
 * the ruling is that it works for **civilians**: a town held by one worker is a
 * town nobody is holding, and that is the reading a badge drawn only for
 * soldiers would silently withhold.
 */
describe('what is standing in the town', () => {
  /** The town, and `count` pieces of `type` on its hex, for one seat. */
  function held(type: Parameters<typeof createUnit>[2], count = 1, seat = 0): GameState {
    const state = boardState();
    const city = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    for (let i = 0; i < count; i += 1) createUnit(state, seat, type, city.col, city.row);
    return state;
  }

  function slot(state: GameState) {
    return visibleCityBanners(state, 0, null)[0]!.garrison;
  }

  it('draws nothing over a town with an empty hex', () => {
    const state = boardState();
    foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    expect(slot(state)).toBeNull();
  });

  /**
   * The three the user named, one at a time. The badge is asked of
   * `badgeClassFor` rather than written out here: the mapping under test is the
   * board's own sentence about what a piece is, and a list in this file would be
   * a second copy of it that could quietly disagree with the piece's roundel.
   */
  for (const type of ['scout', 'worker', 'warrior'] as const) {
    it(`shows a ${type}'s own badge on the plate`, () => {
      const facts = slot(held(type));
      expect(facts).not.toBeNull();
      expect(facts!.badge).toBe(badgeClassFor(type));
      expect(facts!.count).toBe(1);
      expect(facts!.label).toBe(`Standing here: ${unitDef(type).name}`);
    });
  }

  /** A civilian's strength of nothing still wins an empty field. */
  it('gives the slot to a settler, a caravan and a great person too', () => {
    for (const type of ['settler', 'trader', 'greatPerson'] as const) {
      expect(unitDef(type).combatStrength).toBe(0);
      expect(slot(held(type))!.badge).toBe(badgeClassFor(type));
    }
  });

  it('names the strongest when all three stand together, and counts them', () => {
    const state = boardState();
    const city = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    createUnit(state, 0, 'scout', city.col, city.row);
    createUnit(state, 0, 'worker', city.col, city.row);
    createUnit(state, 0, 'warrior', city.col, city.row);

    const facts = slot(state)!;
    expect(facts.badge).toBe(badgeClassFor('warrior'));
    expect(facts.count).toBe(3);
    expect(facts.label).toBe(`Standing here: ${unitDef('warrior').name} and 2 more`);
  });

  it('draws nothing for a piece merely standing beside the town', () => {
    const state = boardState();
    const city = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    createUnit(state, 0, 'warrior', city.col + 1, city.row);
    expect(slot(state)).toBeNull();
  });

  /**
   * Whose the **piece** is, which is not always whose the town is — the whole
   * reason to draw one, and the case a rim in the town's own ink could never
   * say: a rival's garrison in a rival's town comes out in the rival's colour.
   */
  it('takes the piece’s seat ink, not the town’s', () => {
    const state = boardState();
    foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    const rival = foundCityAt(state, 1, getTileAt(state.map, 5, 4)!);
    createUnit(state, 1, 'warrior', rival.col, rival.row);

    const facts = visibleCityBanners(state, 0, null).find((b) => b.cityId === rival.id)!;
    expect(facts.mine).toBe(false);
    expect(facts.garrison).not.toBeNull();
    expect(facts.garrison!.ownerId).toBe(1);
    expect(facts.garrison!.ink).toBe(state.players[1]!.color);
    expect(facts.garrison!.ink).not.toBe(state.players[0]!.color);
  });

  /**
   * An army is not something a chart remembers. This rides the **watched** gate
   * and nothing else — not `mine`, which is the ring's and the queue's gate — so
   * a remembered town carries no slot however lately it was garrisoned.
   */
  it('draws nothing on a town the seat only remembers', () => {
    const state = boardState();
    foundCityAt(state, 0, getTileAt(state.map, 2, 2)!);
    const far = foundCityAt(state, 1, getTileAt(state.map, 13, 8)!);
    createUnit(state, 1, 'warrior', far.col, far.row);
    const tile = getTileAt(state.map, far.col, far.row)!;
    state.visibility[0]![tileIndex(state.map, tile.col, tile.row)] = EXPLORED;
    state.citySightings[0] = [
      { cityId: far.id, col: far.col, row: far.row, name: far.name, ownerId: far.ownerId },
    ];

    const remembered = visibleCityBanners(state, 0, null).find((b) => b.cityId === far.id)!;
    expect(remembered.stale).toBe(true);
    expect(remembered.garrison).toBeNull();
  });

  it('breaks a tie by the order the pieces are iterated in, never by a sort', () => {
    const state = boardState();
    const city = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    const first = createUnit(state, 0, 'warrior', city.col, city.row);
    createUnit(state, 0, 'warrior', city.col, city.row);
    expect(strongestGarrison(state.units)?.id).toBe(first.id);
    // And the order they were founded in makes no difference to which is
    // strongest when they are not equal.
    const scout = createUnit(state, 0, 'scout', city.col, city.row);
    expect(strongestGarrison([scout, first])?.id).toBe(first.id);
    expect(strongestGarrison([first, scout])?.id).toBe(first.id);
  });
});

/**
 * The badge's artwork, which is the half of this that is not a fact about the
 * simulation: the plate must wear **the same drawing** the piece's own roundel
 * wears on the board, or the two say different things about one piece.
 */
describe('the badge on the plate is the badge on the board', () => {
  it('names the atlas’s own file for the drawn-from-file half', () => {
    // The file table is `BADGE_ICON_FILES`, asked rather than copied — the URL
    // is resolved against the document exactly as `loadIcon`'s `image.src` is.
    expect(garrisonBadgeUri(badgeClassFor('warrior'))).toBe('sprites/icons/warrior.svg');
    expect(garrisonBadgeUri(badgeClassFor('scout'))).toBe('sprites/icons/scout.svg');
    expect(garrisonBadgeUri(badgeClassFor('worker'))).toBe('sprites/icons/worker.svg');
  });

  /**
   * A ship in a coastal town is a real garrison (`pathfind.ts`: a coastal city's
   * hex is the one dry hex a hull may stand on), and the eighteen composed naval
   * cells have no file — the rig is drawn. They are composed here from the same
   * two mark tables the atlas composes, hull under canton.
   */
  it('composes a ship’s mark, hull under canton, for the drawn half', () => {
    const galley = garrisonBadgeUri(badgeClassFor('galley'));
    expect(galley.startsWith('data:image/svg+xml,')).toBe(true);
    const doc = decodeURIComponent(galley.slice('data:image/svg+xml,'.length));
    // Three documents: the outer one, the hull at full box, and the canton in
    // the fly corner — both halves printed by `markSvg` rather than by a
    // transform written here.
    expect(doc.match(/<svg /gu)!.length).toBe(3);
    expect(doc).toContain('viewBox="0 0 24 24"');
    // And two different rigs are two different drawings, which is the property
    // that makes the composition worth doing at all.
    expect(galley).not.toBe(garrisonBadgeUri(badgeClassFor('trireme')));
    expect(galley).not.toBe(garrisonBadgeUri(badgeClassFor('frigate')));
  });
});

/**
 * The two halves of "the plate repaints when the stack changes and not
 * otherwise", plus the half of the slot that is not TypeScript.
 */
describe('the garrison’s fingerprint, its ink and its stall', () => {
  it('folds the stack into the signature the banner is rewritten on', () => {
    const text = uiSource('cityBanners.ts').replace(/\/\*[\s\S]*?\*\//g, '');
    const line = text.split('\n').find((row) => row.includes('const signature = '));
    expect(line).toBeDefined();
    expect(line!).toMatch(/\$\{stack\}/);
    // The term is what the *slot* draws — a badge, a rim ink and a count — and
    // nothing else about `state.units`: a scout crossing empty ground on the far
    // side of the map must not repaint every banner in the world.
    expect(text).toMatch(/const stack = [^\n]*badge[^\n]*ownerId[^\n]*count/);
    // Painted inside the gate, beside the bar, rather than on every refresh.
    expect(text).toMatch(/paintGarrison\(banner\.garrison, facts\.garrison\)/);
  });

  /** One walk over the pieces per refresh, never one walk per town. */
  it('hoists the piece walk once for the whole sweep', () => {
    const body = braceBody(uiSource('cityBanners.ts'), 'export function visibleCityBanners');
    expect(body).toContain('garrisonsByCell(state)');
    expect(body.match(/garrisonsByCell\(/gu)!.length).toBe(1);
  });

  it('prints the mark as a mask on parchment, rimmed in the piece’s seat', () => {
    const css = uiSource('style.css');
    const rule = (selector: string): string => {
      const at = css.indexOf(`\n${selector} {`);
      expect(at, selector).toBeGreaterThan(0);
      const open = css.indexOf('{', at);
      return css.slice(open + 1, css.indexOf('}', open));
    };
    // A mask, so the drawing takes the plate's ink and dims with the card —
    // the yoke's trick, one slot over.
    expect(rule('.city-banner-garrison-mark')).toContain('mask-image: var(--garrison-mark)');
    // Parchment ground and an ink mark: the one pairing that reads for all
    // twelve tinctures. The rim is the *piece's* ink, so it is a property of
    // its own rather than the banner's `--banner-color`.
    const disc = rule('.city-banner-garrison');
    expect(disc).toMatch(/background:\s*var\(--parchment\)/);
    expect(disc).toContain('var(--garrison-color');
    // And the wound stops short of the roundel exactly as it stops short of the
    // size badge at the hoist, or the channel runs under the seat's tincture.
    const inset = /right:\s*(\d+)px/.exec(rule('.city-banner.is-held .city-banner-health'));
    expect(inset).not.toBeNull();
    expect(Number(inset![1])).toBeGreaterThanOrEqual(32);
  });

  /**
   * The 3D tag is **gone**, not hidden: the plate covers the hex it was drawn
   * over, and two badges for one fact is the chip the growth ruling refused.
   */
  it('leaves one badge in one place — the 3D layer is retired', () => {
    const RENDERER = Object.values(
      import.meta.glob('../../src/render3d/renderer3d.ts', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
    )[0]!;
    expect(RENDERER).not.toContain('Garrison');
    expect(RENDERER).not.toContain('garrison');
  });

  /**
   * The cabinet's bargain (`flairGallery/main.ts`, "Nothing is reproduced"): the
   * page may lay the plate out and give it a ground; it may not own a second
   * copy of what a badge, a rim or a count means. The knob drives real pieces on
   * a real town, so the mapping on show is `badgeClassFor`'s.
   */
  it('shows the shipping slot on flair.html rather than a drawing of one', () => {
    const gallery = Object.values(
      import.meta.glob('../../src/flairGallery/flourishes.ts', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
    )[0]!;
    const stall = gallery.slice(gallery.indexOf('function cityGarrisonStall'));
    const body = stall.slice(0, stall.indexOf('\n}\n'));
    for (const called of ['buildGarrison', 'paintGarrison', 'garrisonSlot', 'createUnit']) {
      expect(body, called).toMatch(new RegExp(`\\b${called}\\b`));
    }
    // No mapping of its own: a badge class named here would be the page
    // repainting the thing it exists to inspect.
    expect(body).not.toMatch(/badgeClassFor/);
    expect(body).not.toMatch(/sprites\/icons/);
  });
});
