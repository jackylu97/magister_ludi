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
import { type GameState, newGame, bumpRevision } from '../../src/sim/state';
import { UNIT_TYPE_IDS } from '../../src/sim/unitData';
import { EXPLORED, resetVisibility } from '../../src/sim/visibility';
import { badgeCenterY, hpBarY } from '../../src/render3d/badges3d';
import { pieceHeightFor } from '../../src/render3d/board3d';
import { VIEW3D } from '../../src/render3d/lookData';
import { SPRITE_HEIGHT } from '../../src/render3d/pieces';
import {
  BANNER_RISE,
  RING,
  bannerRise,
  cityGrowthRing,
  cityHealthBar,
  growthRing,
  healthBar,
  tallestPieceRise,
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

// --- where the plate hangs --------------------------------------------------

/**
 * U7, and the end of the garrison slot (the user, 2026-09-09, `docs/flags.md`
 * (hhh) 6, "once more, U7": *"it makes it look like the unit is part of the
 * city … the icon just appearing over the tile of the city, vertically below the
 * banner in screenspace … it needs to scale with multiple units in the city"*).
 *
 * U5's and U6's benches are **gone** with the thing they pinned — a slot on the
 * plate carrying the strongest piece's badge, its count, its seat ink and its
 * press. There is one icon in one place again, and it is the piece's own, on the
 * tile, where the board has always drawn it (`test/render/badges3d.test.ts`
 * holds that half). What is pinned here is the geometry that made room for it:
 * the plate is anchored above the flagpole *and* above everything a piece
 * floats, so nothing it has to sit clear of can reach it.
 *
 * The arithmetic is asked rather than restated — `bannerRise` is one expression
 * over the look table — because a second copy of it here would agree with the
 * shipping one until somebody dialled a sculpt class.
 */
describe('where the plate hangs', () => {
  const CITY = VIEW3D.city;
  const BADGE = VIEW3D.badges;
  const HP = VIEW3D.hpBar;
  const PIECES = VIEW3D.pieces;
  /** The camera's fixed elevation, which is what foreshortens a world rise. */
  const ELEVATION = (VIEW3D.camera.elevation * Math.PI) / 180;

  /** The tallest visual any roster row stands at, standees included. */
  function tallest(): number {
    let visual = SPRITE_HEIGHT;
    for (const type of UNIT_TYPE_IDS) visual = Math.max(visual, pieceHeightFor(type));
    return visual;
  }

  it('clears the flagpole the town flies its own colours from', () => {
    expect(bannerRise()).toBeGreaterThan(CITY.poleHeight);
    // And by the dialled gap at the very least — the pole is one of the two
    // things the rise takes a maximum over.
    expect(bannerRise()).toBeGreaterThanOrEqual(CITY.poleHeight + CITY.bannerClearance);
    expect(CITY.bannerClearance).toBeGreaterThan(0);
  });

  /**
   * The reading the whole pass exists for: the tallest row's **roundel** must be
   * under the plate's foot, and in *screen* space rather than in world Y — a
   * badge is a billboard, so its whole diameter shows however far the camera
   * leans, while a rise up the Y axis is foreshortened by the elevation's
   * cosine. Comparing the two raw would quietly pass with the disc's top
   * poking through the pill.
   */
  it('clears the tallest roster row’s roundel, measured on the screen', () => {
    const facing = 1 / Math.cos(ELEVATION);
    const badgeTop = badgeCenterY(tallest()) + (BADGE.diameter / 2) * facing;
    expect(bannerRise()).toBeGreaterThan(badgeTop);
  });

  /**
   * And its **hit bar**, which rides above the roundel on a hurt piece
   * (`hpBarY`). The user's acceptance for this pass says so in as many words: a
   * wounded piece standing in a city has to show its bar exactly as it does on
   * any other hex, and a bar behind the plate is not shown.
   */
  it('clears the bar a hurt piece carries above that roundel', () => {
    const facing = 1 / Math.cos(ELEVATION);
    const barTop = hpBarY(tallest()) + (HP.height / 2) * facing;
    expect(bannerRise()).toBeGreaterThan(barTop);
    // The bar is the taller of the two on the shipping numbers, which is why it
    // is measured at all — but the rise takes the maximum rather than assuming
    // it, so this assertion is a reading and not a rule.
    expect(barTop).toBeGreaterThan(badgeCenterY(tallest()) + (BADGE.diameter / 2) * facing);
  });

  /**
   * A stack does not fan straight down the screen: `placePiece` spreads pieces
   * round the tile centre, and the half of that circle *away* from the camera
   * climbs. A rise that cleared only the piece at the centre would be reached by
   * the second piece in a town — which is the "scale with multiple units" half
   * of the ruling, in geometry.
   */
  it('clears a stack’s fan, not only the piece at the tile centre', () => {
    const facing = 1 / Math.cos(ELEVATION);
    const climb = PIECES.stackSpread * Math.tan(ELEVATION);
    expect(climb).toBeGreaterThan(0);
    expect(bannerRise()).toBeGreaterThan(hpBarY(tallest()) + (HP.height / 2) * facing + climb);
  });

  /** One taste number, and it is the whole of the slack. */
  it('is the two clearances and the one dialled gap, and nothing else', () => {
    expect(bannerRise()).toBeCloseTo(
      Math.max(CITY.poleHeight, tallestPieceRise()) + CITY.bannerClearance,
      12,
    );
    // Resolved once for the page: `reposition` runs per drawn frame and must not
    // walk the roster to place a label.
    expect(BANNER_RISE).toBe(bannerRise());
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
   * at one zoom and wrong at every other, and it is what put the plate on top of
   * the roundels it now hangs above. A margin here would silently undo the rise.
   */
  it('lifts itself by no margin of its own', () => {
    const css = uiSource('style.css');
    const at = css.indexOf('\n.city-banner {');
    expect(at).toBeGreaterThan(0);
    const rule = css.slice(at, css.indexOf('}', at));
    expect(rule).not.toMatch(/margin-top:\s*-/);
  });

  /**
   * And the plate carries no piece's icon at all any more: the slot, its count,
   * its rim ink and its press left with U6, and so did the wiring that let it
   * select (`main.ts`'s `onSelectGarrison`, `controls.selectUnitAt`). One icon
   * in one place, and the place is the tile.
   */
  it('leaves the piece’s icon on the piece — the plate carries none', () => {
    const banners = uiSource('cityBanners.ts');
    expect(banners).not.toMatch(/buildGarrison|paintGarrison|garrisonSlot|onSelectGarrison/);
    expect(uiSource('main.ts')).not.toContain('onSelectGarrison');
    expect(uiSource('controls.ts')).not.toContain('selectUnitAt');
    const css = uiSource('style.css');
    expect(css).not.toContain('city-banner-garrison');
    expect(css).not.toContain('.city-banner.is-held');
    // The 3D tag U4 hung over the flagpole stays retired too — it was never the
    // fix, and it would now be a second badge beside the piece's own.
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
   * The cabinet's bargain (`flairGallery/main.ts`, "Nothing is reproduced"), and
   * this stall is the strongest form of it: the arrangement U7 rules on is a
   * *relation between two projections*, so the page mounts the shipping renderer
   * and the shipping banner overlay and lets them place themselves.
   */
  it('shows the arrangement on flair.html, driven by the real layers', () => {
    const gallery = Object.values(
      import.meta.glob('../../src/flairGallery/flourishes.ts', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>,
    )[0]!;
    const at = gallery.indexOf('function bannerAnchorStall');
    expect(at).toBeGreaterThan(0);
    const body = gallery.slice(at, gallery.indexOf('\n}\n', at));
    for (const called of ['Renderer3D', 'createCityBanners', 'createUnit', 'foundCityAt']) {
      expect(body, called).toMatch(new RegExp(`\\b${called}\\b`));
    }
    // The stack knob is what makes it a bench for "several units in the city",
    // and the wound knob for the bar over a hurt one.
    expect(body).toMatch(/ROSTER/);
    expect(body).toMatch(/unitMaxHp/);
    // No placement of its own: a rise or a projection written here would be the
    // page repainting the very thing it exists to inspect. It mounts the two
    // layers, and where they land is theirs to decide.
    expect(body.replace(/'[^']*'/g, '')).not.toMatch(/BANNER_RISE|projectCell|margin-top/);
    // And the retired stall is gone with the slot it showed.
    expect(gallery).not.toContain('cityGarrisonStall');
  });
});
