/**
 * Five promises the city screen makes across four files, none of which any one
 * file can keep on its own — which is why they are read here rather than left as
 * comments. All five come from the 2026-08-27 legibility pass, and the first
 * four had already been broken once by an edit that looked local.
 *
 *   1. **One chip per voice, on one row.** `renderYields` prints six figures;
 *      `.city-yields` is a fixed-column grid. It said five for as long as faith
 *      has been a yield, and a fixed grid does not complain — it wraps, so the
 *      panel's headline strip read as five figures and a straggler underneath.
 *      A seventh voice would do it again, silently, so the count is asserted
 *      against the printer rather than written down twice.
 *   2. **The camera bias is half the panel.** `camera.cityFrameBiasPx` exists to
 *      push a framed city clear of `#city-panel`, and the panel's width is a CSS
 *      number in another file. Widening the box without moving the bias hides
 *      the very thing the box is talking about, and nothing about that failure
 *      is loud: the city is *somewhere*, just behind the panel.
 *   3. **The panel has one register of controls.** Buy Tiles was set 10.5px
 *      uppercase on tracked letters while every other control on the screen was
 *      11px face-ui in sentence case — the one shouting button on a parchment
 *      panel, and the specific thing the playtest note called out.
 *   4. **A build row is one row.** The purchase pass put a second control on
 *      every buildable; two columns of those left the name about seventy pixels,
 *      and the name is what the list is read by.
 *   5. **The vignette hangs off "which city is open" and nothing else.** The
 *      wash the board lays over the far country while a city screen is up is
 *      cleared by six different gestures, none of which knows it exists — see
 *      the last block of this file for why that is a property of *where* the
 *      call sits rather than of what it does.
 *
 * No jsdom in this suite (see `controls.test.ts`), so the sources are read
 * through Vite's raw glob exactly as `seatRoster.test.ts` and
 * `cityPurchase.test.ts` read theirs. That is the same instrument these
 * cross-file rules need anyway: the failure is never a thrown error, it is a
 * layout that is merely wrong.
 */

import { describe, expect, it } from 'vitest';

import viewJson from '../../data/view3d.json';
import { UNIT_TYPE_IDS, unitDef } from '../../src/sim/unitData';
import { isPurchaseOnly } from '../../src/sim/purchase';
import { offeredInBuildList } from '../../src/ui/cityPanel';

const SOURCES = import.meta.glob(
  ['../../src/ui/cityPanel.ts', '../../src/ui/controls.ts', '../../src/style.css'],
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

/**
 * The stylesheet with its comments taken out.
 *
 * This file's prose explains the very declarations it sits beside — "half the
 * panel's width", "no tracking" — so a naive scan would keep finding the
 * explanation instead of the rule. Stripping first is also what makes the brace
 * matching below safe, since a comment may contain either brace.
 */
function css(): string {
  return source('style.css').replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * The declarations of one CSS rule, by its exact selector list.
 *
 * Deliberately literal — a selector is matched as written, so a rule renamed out
 * from under one of these assertions fails here rather than quietly passing on
 * an empty string.
 */
function rule(selector: string): string {
  const text = css();
  const at = text.indexOf(`\n${selector} {`);
  if (at < 0) throw new Error(`style.css has no rule for "${selector}"`);
  const open = text.indexOf('{', at);
  const close = text.indexOf('}', open);
  return text.slice(open + 1, close);
}

/** One declaration's value, or `undefined` if the rule does not set it. */
function declaration(selector: string, property: string): string | undefined {
  const match = new RegExp(`(?:^|[;{\\n])\\s*${property}\\s*:\\s*([^;]+)`).exec(rule(selector));
  return match?.[1]?.trim();
}

function pixels(selector: string, property: string): number {
  const value = declaration(selector, property);
  const number = Number.parseFloat(value ?? '');
  if (!Number.isFinite(number)) {
    throw new Error(`${selector} { ${property} } is not a pixel length: ${value}`);
  }
  return number;
}

describe('the yield strip', () => {
  it('has exactly one column per voice the panel prints', () => {
    // The printer's own list, read where it is written: `renderYields` builds
    // `entries` as one tuple per chip.
    const entries = /const entries: \[YieldKey, string, number\]\[\] = \[([\s\S]*?)\n {4}\];/.exec(
      source('cityPanel.ts'),
    );
    expect(entries).not.toBeNull();
    const voices = (entries![1]!.match(/^\s*\[/gm) ?? []).length;
    expect(voices).toBe(6);

    const columns = /repeat\((\d+), 1fr\)/.exec(declaration('.city-yields', 'grid-template-columns') ?? '');
    expect(columns).not.toBeNull();
    expect(Number(columns![1])).toBe(voices);
  });

  it("inks every chip's figure in its own voice", () => {
    const text = css();
    for (const key of ['food', 'production', 'gold', 'science', 'culture', 'faith']) {
      const has = text.includes(`.city-yield.is-${key} .city-yield-value {`);
      expect(`${key}: ${has}`).toBe(`${key}: true`);
    }
  });
});

describe('the framed city and the panel that hides it', () => {
  it('biases the camera by half the panel box, gutter included', () => {
    const width = pixels('#city-panel,\n#unit-panel', 'width');
    const gutter = pixels('#city-panel,\n#unit-panel', 'right');
    const bias = viewJson.camera.cityFrameBiasPx;
    // Half the footprint, to the nearest pixel or two — the rule is "roughly
    // half", and a tolerance is what keeps this a check on the *relationship*
    // rather than a second place the number is written.
    expect(Math.abs(bias - (width + gutter) / 2)).toBeLessThanOrEqual(2);
  });
});

describe("the panel's controls", () => {
  it('sets Buy Tiles in the same voice as a build row — no shouting', () => {
    expect(declaration('.city-buy-tiles', 'text-transform')).toBe('none');
    expect(declaration('.city-buy-tiles', 'font-family')).toBe(
      declaration('.city-buildable', 'font-family'),
    );
    expect(declaration('.city-buy-tiles', 'font-size')).toBe(
      declaration('.city-buildable', 'font-size'),
    );
    expect(declaration('.city-buy-tiles', 'font-weight')).toBe(
      declaration('.city-buildable', 'font-weight'),
    );
    expect(declaration('.city-buy-tiles', 'letter-spacing')).toBe('normal');
  });

  it('leaves no uppercased control anywhere on the panel', () => {
    // The eyebrows (`h3`, the citizen line, the size caption) are labels and may
    // shout; a *button* may not. This is the rule the Buy Tiles note is one
    // instance of, written so the next control added inherits it.
    for (const selector of [
      '.city-buy-tiles',
      '.city-buildable',
      '.city-buildable-buy',
      '.city-icon-button',
      '.city-close',
    ]) {
      const transform = declaration(selector, 'text-transform') ?? 'none';
      expect(`${selector}: ${transform}`).toBe(`${selector}: none`);
    }
  });
});

describe('the build list', () => {
  it('gives each buildable a whole row', () => {
    // One column, so the row below can be an honest name | cost · turns | buy
    // grid at the panel's ordinary type sizes.
    expect(declaration('.city-buildable-grid', 'grid-template-columns')).toBe('minmax(0, 1fr)');
  });

  it('lays the row and the button as grids, with the buy tag in its own track', () => {
    expect(declaration('.city-buildable-row', 'grid-template-columns')).toBe(
      'minmax(0, 1fr) auto',
    );
    expect(declaration('.city-buildable', 'display')).toBe('grid');
    expect(declaration('.city-buildable', 'grid-template-columns')).toBe('minmax(0, 1fr) auto');
  });

  it('floors the two figure columns so neither steals width from a name', () => {
    // The squeeze that started this pass was the buy tag growing a digit and
    // taking the room out of the name beside it. A floor on each figure column
    // means the name is the only thing that flexes, and it flexes *up*.
    expect(declaration('.city-buildable-cost', 'min-width')).toBeDefined();
    expect(declaration('.city-buildable-buy', 'min-width')).toBeDefined();
    // And the name is still the cell that gives: it, and only it, ellipsises.
    expect(declaration('.city-buildable-name', 'text-overflow')).toBe('ellipsis');
  });

  it('offers no row for a piece that is called rather than built', () => {
    // The playtest's (2026-08-27): "Great Person" sat among the units at
    // 0⚙ · 0t, which reads as the best piece in the game for nothing. It is
    // neither built nor bought — `buildError` and `purchaseError` both refuse
    // the row — so it has no place on a list of things a town can start.
    const called = UNIT_TYPE_IDS.filter((id) => unitDef(id).greatWork === true);
    // The premise: if the roster ever stops marking one, this test is vacuous
    // and should say so rather than pass.
    expect(called.length).toBeGreaterThan(0);
    for (const id of called) expect(offeredInBuildList(id), id).toBe(false);
  });

  it('still offers every ordinary unit, and still hides the ones sold in a bank', () => {
    // The other two arms, so "hide it" cannot quietly become "hide everything".
    expect(offeredInBuildList('warrior')).toBe(true);
    expect(offeredInBuildList('settler')).toBe(true);
    for (const id of UNIT_TYPE_IDS) {
      if (!isPurchaseOnly({ kind: 'unit', id })) continue;
      expect(offeredInBuildList(id), id).toBe(false);
    }
    // And the predicate turns away exactly the two marked classes, no third.
    const hidden = UNIT_TYPE_IDS.filter((id) => !offeredInBuildList(id));
    for (const id of hidden) {
      const def = unitDef(id);
      expect(def.greatWork === true || isPurchaseOnly({ kind: 'unit', id }), id).toBe(true);
    }
  });
});

/**
 * The captions under the two lists, and the one thing a caption must be: true.
 *
 * All three from the same playtest note (2026-08-27). Read from the source
 * because a stale sentence throws nothing, renders perfectly, and is only ever
 * caught by somebody reading it — which is exactly what happened.
 */
describe('what the panel says at the foot of a list', () => {
  it('does not say "dots" about a board that draws rings', () => {
    // `overlays.ts` has drawn a *ring* on every worked hex since the overlay
    // pass — bone white for the assignment's choice, the seat's ink for a pin.
    const text = source('cityPanel.ts');
    expect(text).not.toContain('Dots on the map');
    expect(text).toContain('A ringed hex is a tile this city works');
  });

  it('does not print the treasury a second time under the build list', () => {
    // The top bar carries `Player.gold` on a chip a hand's width above this
    // caption; a second copy is a number a player has to check against itself.
    // What is left is the rule a price tag cannot state on its own.
    const text = source('cityPanel.ts');
    expect(text).not.toContain('in the treasury');
    expect(text).toContain('A price tag buys the row outright at');
  });

  it('leaves air between the last build row and the caption', () => {
    // A paragraph after a list gets a list's worth of space, not a row's: at the
    // grid's own gap the caption read as one more row that had lost its button.
    const grid = pixels('.city-buildable-grid', 'gap');
    expect(pixels('.city-buildables .hint', 'margin-top')).toBeGreaterThan(grid);
  });
});

/**
 * The vignette's other half, which is not in the renderer at all: *when* the
 * board is told there is a city screen open.
 *
 * The renderer owns the wash; `controls.ts` owns the answer to "which city is
 * open", and the whole design is that there is only one of those and everything
 * reads it. The failure this guards is the obvious shortcut — arming the wash
 * in `setOpenCity`, where opening happens — because `setOpenCity` is one of the
 * ways a city stops being open and not all of them. A seat change, a new game
 * and a load each clear `openCityId` and refresh, and a city captured under the
 * panel stops resolving with nobody assigning anything. All of those already go
 * through `refreshOverlays`.
 *
 * Read from the source because there is no jsdom here and, more to the point,
 * because the thing being asserted is *where a call sits*, which no behavioural
 * test can see.
 */
describe('the vignette and the open city', () => {
  /** The body of one top-level `function name(...) { … }` in `controls.ts`. */
  function body(name: string): string {
    const text = source('controls.ts');
    const at = text.indexOf(`\n  function ${name}(`);
    if (at < 0) throw new Error(`controls.ts has no function ${name}`);
    const open = text.indexOf('{', at);
    let depth = 0;
    for (let i = open; i < text.length; i++) {
      if (text[i] === '{') depth += 1;
      else if (text[i] === '}') {
        depth -= 1;
        if (depth === 0) return text.slice(open + 1, i);
      }
    }
    throw new Error(`controls.ts: ${name} never closes`);
  }

  it('tells the board on the same sweep that refreshes every other overlay', () => {
    expect(body('refreshOverlays')).toContain('refreshCityFocus()');
  });

  it('asks the open city, never the spotlit one', () => {
    // `spotlitCity()` answers for a *hovered* banner too, which is right for the
    // worked-tile dots and wrong for this: a wash that swept the board every
    // time the pointer crossed a town would be announcing a screen change that
    // did not happen.
    const focus = body('refreshCityFocus');
    expect(focus).toContain('openCity()');
    expect(focus).not.toContain('spotlitCity');
  });

  it('has exactly one caller, so there is no parallel flag to fall out of step', () => {
    const calls = source('controls.ts').match(/renderer\.setCityFocus\?\./g) ?? [];
    expect(calls.length).toBe(2);
    const focus = body('refreshCityFocus');
    expect((focus.match(/renderer\.setCityFocus\?\./g) ?? []).length).toBe(2);
  });
});
