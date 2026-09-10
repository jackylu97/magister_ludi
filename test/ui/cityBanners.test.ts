/**
 * The one further exclusion `visibleCityBanners` layers on top of fog: the
 * open city's own banner drops out of the list, full stop, whatever else is
 * true about it — and, since the growth ring landed, the three states that ring
 * has, the ink it is drawn in and the one seat it is shown to — and, since the
 * hit-point bar landed beside it, the wound on the banner's foot: the town that
 * carries none because it is whole, the one that carries none because it is
 * only remembered, and the walls that are a longer bar rather than a second
 * segment. Since U7, the one thing about this plate that is not a fact about a
 * town at all: **where it hangs** — a world rise over the flagpole, clear of
 * every roundel and hit bar the pieces on that hex float.
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
import { type UnitTypeId, unitMaxHp } from '../../src/sim/unitData';
import { EXPLORED, resetVisibility } from '../../src/sim/visibility';
import { cssHex } from '../../src/render3d/badges3d';
import { badgeClassFor } from '../../src/render3d/board3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { hpBarFill, unitColor } from '../../src/render3d/pieces';
import {
  BANNER_RISE,
  GARRISON_ROW,
  RING,
  bannerRise,
  cityGrowthRing,
  cityHealthBar,
  commandable,
  garrisonRow,
  garrisonSignature,
  garrisonsByCell,
  growthRing,
  healthBar,
  selectedRim,
  visibleCityBanners,
} from '../../src/ui/cityBanners';
import { uiSource } from './sourceHelpers';

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

// --- the garrison row -------------------------------------------------------

/**
 * U8, and the end of five passes at the same question (the user, 2026-09-09,
 * `docs/flags.md` (ooo)): *"Is it difficult to have the list of units in a city
 * appear above the banner?"*
 *
 * What is pinned here is the derivation — which pieces the row draws, in what
 * order, in whose ink, which of them carries a bar, which is ringed and which is
 * a control — because that is the half that can be quietly wrong on every banner
 * at once and the half a suite with no DOM can drive. The elements it is painted
 * into are read as source below, `tilePriceTags.test.ts`'s way, and the
 * suppression on the board's own side is `test/render/badges3d.test.ts`'s.
 */
describe('the garrison row', () => {
  /** A town with `types` standing on its hex, and the pieces it made. */
  function garrisoned(
    state: GameState,
    col: number,
    row: number,
    types: readonly UnitTypeId[],
    owner = 0,
  ) {
    const city = foundCityAt(state, 0, getTileAt(state.map, col, row)!);
    const units = types.map((type) => createUnit(state, owner, type, city.col, city.row));
    return { city, units };
  }

  it('lists one roundel per piece, in the stack’s own order', () => {
    const state = boardState();
    const { units } = garrisoned(state, 4, 4, ['warrior', 'worker', 'archer']);
    const row = garrisonRow(state, units, 0, null)!;
    expect(row.pieces.map((piece) => piece.unitId)).toEqual(units.map((unit) => unit.id));
    // `state.units` order and not strength: it is the order the board fans a
    // stack in and the order a click cycles it in, so the third roundel is the
    // third piece wherever a player aims.
    expect(row.pieces.map((piece) => piece.badge)).toEqual(
      units.map((unit) => badgeClassFor(unit.type)),
    );
    expect(row.more).toBe(0);
  });

  /** An empty hex draws nothing at all — the health bar's rule, and its reason. */
  it('draws no row over a town with nothing standing in it', () => {
    const state = boardState();
    const city = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    expect(garrisonRow(state, [], 0, null)).toBeNull();
    const banner = visibleCityBanners(state, 0, null).find((b) => b.cityId === city.id)!;
    expect(banner.garrison).toBeNull();
  });

  it('stands the roundels apart up to four and fans them past it', () => {
    const state = boardState();
    const four = garrisoned(state, 4, 4, ['warrior', 'worker', 'archer', 'scout']);
    expect(garrisonRow(state, four.units, 0, null)!.fanned).toBe(false);
    const five = garrisoned(state, 10, 4, [
      'warrior',
      'worker',
      'archer',
      'scout',
      'spearman',
    ]);
    expect(garrisonRow(state, five.units, 0, null)!.fanned).toBe(true);
    expect(GARRISON_ROW.fanFrom).toBe(4);
  });

  it('caps the row at eight and counts the rest', () => {
    const state = boardState();
    const many = garrisoned(state, 4, 4, [
      'warrior',
      'worker',
      'archer',
      'scout',
      'spearman',
      'settler',
      'horseman',
      'catapult',
      'swordsman',
      'chariot',
    ]);
    const row = garrisonRow(state, many.units, 0, null)!;
    expect(row.pieces).toHaveLength(GARRISON_ROW.cap);
    expect(GARRISON_ROW.cap).toBe(8);
    // Ten standing, eight drawn, and the remainder as a numeral rather than as
    // two more roundels nobody would count.
    expect(row.more).toBe(2);
    expect(row.pieces.map((piece) => piece.unitId)).toEqual(
      many.units.slice(0, 8).map((unit) => unit.id),
    );
  });

  /**
   * `hpBarFill`'s rule, asked rather than restated: a bar is drawn on a piece
   * that is hurt and on nobody else, so a wounded warrior in a town and a
   * wounded warrior in the open appear and disappear by one law.
   */
  it('puts a bar under a wounded piece and under nobody else', () => {
    const state = boardState();
    const { units } = garrisoned(state, 4, 4, ['warrior', 'worker']);
    expect(garrisonRow(state, units, 0, null)!.pieces.map((p) => p.hurt)).toEqual([null, null]);

    const hurt = units[1]!;
    hurt.hp = Math.max(1, Math.round(unitMaxHp(hurt) / 2));
    const row = garrisonRow(state, units, 0, null)!;
    expect(row.pieces[0]!.hurt).toBeNull();
    expect(row.pieces[1]!.hurt).toBe(hpBarFill(hurt));
    // And the figures are the town's own hover, one hover away from a drawing
    // that is only a glance.
    expect(row.pieces[1]!.label).toContain(`${hurt.hp}/${unitMaxHp(hurt)} hp`);
  });

  it('rims each roundel in its own piece’s owner’s ink', () => {
    const state = boardState();
    const city = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    const mine = createUnit(state, 0, 'warrior', city.col, city.row);
    const theirs = createUnit(state, 1, 'warrior', city.col, city.row);
    const row = garrisonRow(state, [mine, theirs], 0, null)!;
    // The board's own rim (`unitColor`), read off the *piece*: a captured town
    // garrisoned by its captor wears the captor's colour.
    expect(row.pieces[0]!.ink).toBe(cssHex(unitColor(state, mine)));
    expect(row.pieces[1]!.ink).toBe(cssHex(unitColor(state, theirs)));
    expect(row.pieces[0]!.ink).not.toBe(row.pieces[1]!.ink);
  });

  it('rings the piece in hand the way the board rings it', () => {
    const state = boardState();
    const { units } = garrisoned(state, 4, 4, ['warrior', 'worker']);
    const held = units[1]!;
    const row = garrisonRow(state, units, 0, held.id)!;
    expect(row.pieces[0]!.selected).toBe(false);
    expect(row.pieces[1]!.selected).toBe(true);
    // The board's own lift toward white (`badges.selectedRimShade`), so the row
    // and the tag cannot mark the piece in hand two different ways.
    expect(row.pieces[1]!.ink).toBe(selectedRim(unitColor(state, held)));
    expect(VIEW3D.badges.selectedRimShade).toBeGreaterThan(0);
  });

  /**
   * `ownUnitsAt`'s rule, read one surface over: your own piece, and not a
   * caravan walking a route. A rival's roundel is a reading and not a control.
   */
  it('makes a roundel a control only for a piece this seat may command', () => {
    const state = boardState();
    const city = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    const mine = createUnit(state, 0, 'warrior', city.col, city.row);
    const theirs = createUnit(state, 1, 'warrior', city.col, city.row);
    const caravan = createUnit(state, 0, 'trader', city.col, city.row);
    caravan.trade = { fromCityId: city.id, toCityId: city.id, kind: 'road' } as never;

    expect(commandable(mine, 0)).toBe(true);
    expect(commandable(theirs, 0)).toBe(false);
    expect(commandable(caravan, 0)).toBe(false);
    const row = garrisonRow(state, [mine, theirs, caravan], 0, null)!;
    expect(row.pieces.map((piece) => piece.mine)).toEqual([true, false, false]);
  });

  /** A memory keeps a name and a flag. An army is not something a chart keeps. */
  it('carries no row on a remembered town, whoever was standing in it', () => {
    const state = boardState();
    const city = foundCityAt(state, 1, getTileAt(state.map, 4, 4)!);
    createUnit(state, 1, 'warrior', city.col, city.row);
    state.citySightings[0] = [
      { cityId: city.id, col: city.col, row: city.row, name: city.name, ownerId: 1 },
    ];
    const seen = state.visibility[0]!;
    for (let i = 0; i < seen.length; i += 1) seen[i] = EXPLORED;
    bumpRevision(state);
    const banner = visibleCityBanners(state, 0, null).find((b) => b.cityId === city.id)!;
    expect(banner.stale).toBe(true);
    expect(banner.garrison).toBeNull();
  });

  /** Fog is the whole gate: a town this seat is not watching has no banner. */
  it('hides with the banner: no banner, no row', () => {
    const state = boardState();
    const city = foundCityAt(state, 1, getTileAt(state.map, 4, 4)!);
    createUnit(state, 1, 'warrior', city.col, city.row);
    expect(visibleCityBanners(state, 0, null).some((b) => b.cityId === city.id)).toBe(false);
  });

  /** One walk over the pieces per refresh, and it is the towns' own hexes. */
  it('walks the pieces once, by the tile each town stands on', () => {
    const state = boardState();
    const { city, units } = garrisoned(state, 4, 4, ['warrior', 'worker']);
    createUnit(state, 0, 'scout', city.col + 1, city.row);
    const cells = garrisonsByCell(state);
    expect(cells.get(tileIndex(state.map, city.col, city.row))).toEqual(units);
    // A piece on the hex beside it is not in anybody's row.
    expect([...cells.values()].flat()).toHaveLength(2);
  });

  /**
   * The two halves of "the row is rewritten when the pieces move, and never
   * otherwise": the module's own gates, neither of which is a value a caller can
   * read back.
   */
  it('folds what a roundel draws into the signature and nothing else', () => {
    const state = boardState();
    const { units } = garrisoned(state, 4, 4, ['warrior', 'worker']);
    const before = garrisonSignature(garrisonRow(state, units, 0, null));
    expect(before).not.toBe('');
    // A quiet garrison moves nothing.
    expect(garrisonSignature(garrisonRow(state, units, 0, null))).toBe(before);
    // A blow and a selection each move it.
    units[1]!.hp = 1;
    const wounded = garrisonSignature(garrisonRow(state, units, 0, null));
    expect(wounded).not.toBe(before);
    expect(garrisonSignature(garrisonRow(state, units, 0, units[0]!.id))).not.toBe(wounded);
    expect(garrisonSignature(null)).toBe('');
  });
});

/**
 * The gates that keep the row off the frame: the walk behind the board's own
 * piece fingerprint, and the DOM behind the banner's signature.
 */
describe('the row’s fingerprint', () => {
  /**
   * The walk is gated on **`signUnits`**, which is what makes this layer a
   * fingerprint reader like the 3D unit layer: `refresh` runs on every accepted
   * command and every selection, and a walk over the whole army each time to
   * answer "did anybody move" is the walk the hash exists to replace.
   */
  it('re-walks only when signUnits moves, and never per frame', () => {
    const banners = uiSource('cityBanners.ts').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(banners).toContain("from '../render3d/pieces'");
    expect(banners).toMatch(/const stamp = signUnits\(state\);/);
    expect(banners).toMatch(/walked\.state === state && walked\.stamp === stamp/);
    // The row is painted inside the signature gate, beside the wound and the
    // arcs — never on every refresh, and never from `reposition`.
    expect(banners).toMatch(/paintGarrisonRow\(banner\.garrison, facts\.garrison, onSelectPiece\)/);
    const reposition = banners.slice(banners.indexOf('function reposition()'));
    expect(reposition.slice(0, reposition.indexOf('\n  }'))).not.toMatch(/garrison/i);
    // And the term is in the string the banner is rewritten on.
    const line = banners.split('\n').find((rowText) => rowText.includes('const signature = '));
    expect(line).toBeDefined();
    expect(line!).toMatch(/\$\{held\}/);
  });

  /**
   * And the row's DOM is rebuilt wholesale rather than patched, which is what
   * the gate above buys: the children are a list whose *length* changes, so a
   * patch would be a diff of the information the signature already carries.
   */
  it('rebuilds the row’s children rather than patching them', () => {
    const banners = uiSource('cityBanners.ts').replace(/\/\*[\s\S]*?\*\//g, '');
    const paint = banners.slice(banners.indexOf('export function paintGarrisonRow'));
    const body = paint.slice(0, paint.indexOf('\n}\n'));
    expect(body).toContain('root.replaceChildren()');
    expect(body).toContain('is-fanned');
    expect(body).toContain('city-banner-piece-more');
  });

  /**
   * The drawing is the atlas's own cell, printed once per class and cached —
   * never a second set of marks, and never a raw `<img>` of the icon file (half
   * the set has no file, and the half that does is recoloured on the way in).
   */
  it('prints the roundel through the atlas’s own cell painters', () => {
    const roundels = Object.values(
      import.meta.glob('../../src/ui/unitRoundels.ts', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
    )[0]!;
    for (const called of ['drawBadgeCell', 'drawNavalBadgeCell', 'wildBadgeStyle',
      'nationBadgeStyle', 'badgeAtlasLayout', 'loadIcon']) {
      expect(roundels, called).toMatch(new RegExp(`\\b${called}\\b`));
    }
    // Cached by class and ink pair, so a row of six warriors fetches one file.
    expect(roundels).toMatch(/printed\.set\(key, uri\)/);
    expect(roundels).toMatch(/printing\.get\(key\)/);
    // And a late arrival lands only on the element still waiting for it.
    expect(roundels).toMatch(/element\.dataset\.roundel !== key/);
  });
});

/**
 * The press: a roundel selects the piece it names, through the one seam every
 * other way of aiming at a piece ends at.
 *
 * Read as source — `createGameControls`' closures cannot be mounted in this
 * suite (`controls.test.ts`'s note) — so what is named is precise: the rule that
 * decides which pieces answer, the call that selects, and the seams that carry a
 * press from the plate to it.
 */
describe('a press on a roundel picks that piece up', () => {
  it('selects the named unit through the board’s own eligibility rule', () => {
    const controls = uiSource('controls.ts');
    const body = controls.slice(controls.indexOf('function selectPiece(unitId: number)'));
    const head = body.slice(0, body.indexOf('\n  }'));
    // `ownUnitsAt` and not a rule of its own: your own piece, and not a caravan
    // walking a route.
    expect(head).toContain('ownUnitsAt(unit.col, unit.row)');
    expect(head).toContain('select(unitId)');
    // Handed out on the interface, so a surface floating above the board can
    // take it.
    expect(controls).toMatch(/selectPiece\(unitId: number\): boolean;/);
    expect(controls).toMatch(/\n    selectPiece,\n/);
  });

  it('is wired from the banner to the controls and stops at the pill', () => {
    const banners = uiSource('cityBanners.ts').replace(/\/\*[\s\S]*?\*\//g, '');
    // The unit, not the tile: a row is a list.
    expect(banners).toMatch(/onSelectPiece\(piece\.unitId\)/);
    // Or selecting a piece would also open the city screen it is standing in.
    expect(banners).toMatch(/event\.stopPropagation\(\)/);
    const main = uiSource('main.ts');
    expect(main).toContain('onSelectPiece: (unitId) => {');
    expect(main).toContain('controls.selectPiece(unitId);');
    // And the ring follows the selection with no event to forget to send.
    expect(main).toContain('selectedUnitId: () => controls.selectedUnit()?.id ?? null');
  });
});

/**
 * The row as elements, and the one rule that answers the objection U6 died of
 * (*"it makes it look like the unit is part of the city"*): the row is
 * positioned **off** the plate with a gap under it, so nothing in it touches the
 * pill.
 */
describe('the row on the glass', () => {
  const css = uiSource('style.css');

  function cssRule(selector: string): string {
    const at = css.indexOf(`\n${selector} {`);
    expect(at, selector).toBeGreaterThan(0);
    return css.slice(at, css.indexOf('}', at));
  }

  it('hangs on the plate’s top edge, overlapping it by a few pixels', () => {
    const row = cssRule('.city-banner-garrison');
    expect(row).toMatch(/position: absolute/);
    // Just *below* the pill's own top edge — a small overlap, so the roundels
    // read as standing in the town rather than floating over it (the user,
    // 2026-09-10, after a day with a clear gap: "so it's clearer that the unit
    // is 'in' the city"). Small: a `bottom` of `100%` minus more than half a
    // roundel would sit them on the plate's face, which was the U6 objection.
    expect(row).toMatch(/bottom: calc\(100% - ([1-9]|1[0-2])px\)/);
    // Centred over it, whatever the town's name does to the pill's width.
    expect(row).toMatch(/left: 50%/);
    expect(row).toMatch(/translateX\(-50%\)/);
    // The row itself takes no pointer: the pill is the button, and the roundels
    // claim their own back.
    expect(row).toMatch(/pointer-events: none/);
    expect(cssRule('.city-banner-piece.is-own')).toMatch(/pointer-events: auto/);
  });

  it('wears the atlas’s own cell, rimmed in the piece’s ink', () => {
    const disc = cssRule('.city-banner-piece-disc');
    expect(disc).toMatch(/background-image: var\(--roundel-mark\)/);
    expect(disc).toMatch(/border: 2px solid var\(--roundel-ink/);
    expect(disc).toMatch(/border-radius: 999px/);
    // The zoom that makes the printed paper fill the element is written from the
    // atlas's own overlap, never typed here.
    expect(disc).toMatch(/var\(--roundel-zoom/);
    const banners = uiSource('cityBanners.ts');
    expect(banners).toContain("root.style.setProperty('--roundel-zoom'");
    expect(banners).toContain('roundelZoom()');
  });

  it('draws the wound in the board’s ink and at the board’s floor', () => {
    const banners = uiSource('cityBanners.ts').replace(/\/\*[\s\S]*?\*\//g, '');
    // `hpBarFillWidth` as a fraction of the bar it is drawn in: the board's own
    // pip floor, so a piece at one hit point still draws something here.
    expect(banners).toMatch(/hpBarFillWidth\(piece\.hurt\) \/ VIEW3D\.hpBar\.width/);
    expect(banners).toMatch(/VIEW3D\.hpBar\.goodColor/);
    expect(cssRule('.city-banner-piece-bar')).toMatch(/height: 3px/);
  });
});

// --- where the plate hangs --------------------------------------------------

/**
 * U8 puts the plate back where it hung before U7: at the top of the flagpole,
 * plus the one dialled gap.
 *
 * U7 had raised it over everything a *piece* could float on that hex, because
 * the pieces' own roundels had to be legible under it. The garrison row above
 * the plate carries those icons now (and the board suppresses them —
 * `test/render/badges3d.test.ts` holds that half), so there is nothing over the
 * pole left to clear. `tallestPieceRise` retired with the arrangement it
 * measured.
 *
 * The arithmetic is asked rather than restated — `bannerRise` is one expression
 * over the look table — because a second copy of it here would agree with the
 * shipping one until somebody dialled the pole.
 */
describe('where the plate hangs', () => {
  const CITY = VIEW3D.city;
  const css = uiSource('style.css');

  it('is the pole’s top and the one dialled gap, and nothing else', () => {
    expect(bannerRise()).toBeCloseTo(CITY.poleHeight + CITY.bannerClearance, 12);
    expect(CITY.bannerClearance).toBeGreaterThan(0);
    // Resolved once for the page: `reposition` runs per drawn frame and must not
    // do arithmetic to place a label.
    expect(BANNER_RISE).toBe(bannerRise());
    // And it is a rise off the pole, not off a piece: nothing in this expression
    // walks the roster any more.
    const banners = uiSource('cityBanners.ts').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(banners).not.toMatch(/tallestPieceRise|UNIT_TYPE_IDS|pieceHeightFor/);
  });

  /**
   * And it is **below** what U7 hung it at, which is the reading the user asked
   * for in as many words (*"it feels awkward"* at the higher one): the plate is
   * a label on a town, and the row is what stands above it now.
   */
  it('sits at the flag rather than over the pieces’ furniture', () => {
    expect(bannerRise()).toBeGreaterThan(CITY.poleHeight);
    // U7's figure was 1.92 — the tallest row's hit bar, measured on the screen.
    expect(bannerRise()).toBeLessThan(1.9);
  });

  /**
   * The two seams that carry the rise onto the glass.
   *
   * Read off the source because neither can be driven here: `projectCell` lives
   * on `Renderer3D`, which needs a WebGL context, and `reposition` needs a
   * renderer to ask. What could go wrong is precise — the rise being dropped on
   * the way through, or the *ground* point quietly moving with it — so both are
   * named.
   */
  it('is passed to projectCell, which lifts the point and leaves the ground alone', () => {
    const banners = uiSource('cityBanners.ts').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(banners).toMatch(/renderer\.projectCell\(banner\.col, banner\.row, BANNER_RISE\)/);
    const renderer = Object.values(
      import.meta.glob('../../src/render3d/renderer3d.ts', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
    )[0]!;
    // The default is the tile's own top face, so every other caller — the badge
    // hit test, the price plates, the damage figures — is untouched.
    expect(renderer).toMatch(/projectCell\(col: number, row: number, rise = 0\)/);
    expect(renderer).toMatch(/y: tileTopY\(tile\) \+ rise/);
  });

  /**
   * The pixel lift the plate used to be dragged up by is **gone**.
   *
   * `margin-top: -46px` was a world height written as a screen distance: right
   * at one zoom and wrong at every other. A margin here would silently undo the
   * rise, and now it would push the garrison row off the town with it.
   */
  it('lifts itself by no margin of its own', () => {
    const at = css.indexOf('\n.city-banner {');
    expect(at).toBeGreaterThan(0);
    const rule = css.slice(at, css.indexOf('}', at));
    expect(rule).not.toMatch(/margin-top:\s*-/);
  });

  /**
   * U5's and U6's slot **stays** retired: the icons are not *on* the plate, they
   * are in a row above it. The distinction is the whole ruling, so the names
   * that meant "a badge inside the pill" must not come back.
   */
  it('carries no icon inside the pill itself', () => {
    const banners = uiSource('cityBanners.ts');
    expect(banners).not.toMatch(/garrisonSlot|onSelectGarrison|strongestGarrison/);
    expect(uiSource('main.ts')).not.toContain('onSelectGarrison');
    expect(css).not.toContain('.city-banner.is-held');
    // The 3D tag U4 hung over the flagpole stays retired too — it was never the
    // fix, and it would now be a second badge beside the row's own.
    const renderer = Object.values(
      import.meta.glob('../../src/render3d/renderer3d.ts', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
    )[0]!;
    expect(renderer).not.toMatch(/garrison/i);
  });

  /**
   * The cabinet's bargain (`flairGallery/main.ts`, "Nothing is reproduced"), in
   * two stalls: one that lays four lengths of row side by side — a running game
   * will not hold still at one, three, six and ten — and one that mounts the
   * shipping renderer under the shipping overlay so the plate and the row are
   * placed by the very projection the game places them with.
   */
  it('shows the row and the arrangement on flair.html, driven by the real layers', () => {
    const gallery = Object.values(
      import.meta.glob('../../src/flairGallery/flourishes.ts', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
    )[0]!;

    const rowAt = gallery.indexOf('function garrisonRowStall');
    expect(rowAt).toBeGreaterThan(0);
    const rowBody = gallery.slice(rowAt, gallery.indexOf('\n}\n', rowAt));
    // The shipping row, built and painted by the shipping functions, off real
    // pieces standing in a real town.
    for (const called of [
      'buildGarrisonRow',
      'paintGarrisonRow',
      'garrisonRow',
      'createUnit',
      'foundCityAt',
      'unitMaxHp',
    ]) {
      expect(rowBody, called).toMatch(new RegExp(`\\b${called}\\b`));
    }
    // Four lengths, one wound and one piece in hand — the bench the ruling asks
    // for.
    for (const standing of [1, 3, 6, 10]) {
      expect(rowBody, `${standing} standing`).toMatch(new RegExp(`row\\(\\s*\\d+,\\s*${standing},`));
    }
    // No arithmetic of its own: a fan, a cap or a fraction written here would be
    // the page repainting the thing it exists to inspect.
    expect(rowBody).not.toMatch(/fanned|filled/);

    const at = gallery.indexOf('function bannerAnchorStall');
    expect(at).toBeGreaterThan(0);
    const body = gallery.slice(at, gallery.indexOf('\n}\n', at));
    for (const called of ['Renderer3D', 'createCityBanners', 'createUnit', 'foundCityAt']) {
      expect(body, called).toMatch(new RegExp(`\\b${called}\\b`));
    }
    // The stack knob is what makes it a bench for "several units in the city",
    // the wound knob for the bar under a hurt one, and the selection knob for
    // the ring the board no longer draws over a town.
    expect(body).toMatch(/ROSTER/);
    expect(body).toMatch(/unitMaxHp/);
    expect(body).toMatch(/selectedUnitId/);
    // No placement of its own: a rise or a projection written here would be the
    // page repainting the very thing it exists to inspect. It mounts the two
    // layers, and where they land is theirs to decide.
    expect(body.replace(/'[^']*'/g, '')).not.toMatch(/BANNER_RISE|projectCell|margin-top/);
    // And the retired stall is gone with the slot it showed.
    expect(gallery).not.toContain('cityGarrisonStall');
  });

  /** The gallery's one override, and the reason it is the opposite of the pill's. */
  it('lets the gallery give the row headroom and repaint nothing', () => {
    const local = Object.values(
      import.meta.glob('../../src/flairGallery/style.css', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
    )[0]!;
    const slot = local.slice(local.indexOf('.garrison-slot .city-banner'));
    const rule = slot.slice(0, slot.indexOf('}'));
    // The pill keeps its own containing block here, or the row would escape to
    // whatever ancestor happened to be positioned.
    expect(rule).toMatch(/position: relative/);
    expect(rule).toMatch(/margin-top: \d+px/);
    for (const painted of ['--roundel-ink', 'is-fanned', 'city-banner-piece-fill']) {
      expect(local.includes(painted), painted).toBe(false);
    }
  });
});
