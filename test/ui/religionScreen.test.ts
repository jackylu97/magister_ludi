/**
 * Three promises the Religion sheet makes across two files, none of which
 * either file can keep on its own.
 *
 *   1. **It is a split, and it is the Statecraft sheet's split.** The 2026-08-27
 *      pass gave both parchment screens the same shape — a fixed column of what
 *      your empire *is*, a scrolling pane of what it can *do* — by having the
 *      Religion screen build the very classes the Statecraft one does. The
 *      failure this guards is quiet and total: a `draw()` that goes back to
 *      appending blocks straight onto the body still renders perfectly, in one
 *      column, off the bottom of a 720-tall viewport, which is the thing the
 *      pass existed to fix.
 *   2. **One breakpoint, not two that agree today.** The width at which a split
 *      stops being readable is a fact about the split. Both sheets stack in the
 *      *same* media query, so this asserts there is exactly one `max-width`
 *      query naming either overlay and that it names both.
 *   3. **The sheet has one register of controls.** `cityScreen.test.ts`'s rule
 *      three, one screen over: an eyebrow is a label and may shout, a *control*
 *      may not. The Buy control and the city select are the two on this sheet.
 *
 * No jsdom in this suite (see `controls.test.ts`), so the sources are read
 * through Vite's raw glob exactly as `cityScreen.test.ts` and
 * `seatRoster.test.ts` read theirs — and that is the right instrument anyway,
 * because every failure above is a layout that is merely wrong rather than an
 * error anything throws.
 */

import { describe, expect, it } from 'vitest';

const SOURCES = import.meta.glob(
  ['../../src/ui/religionScreen.ts', '../../src/ui/statecraftScreen.ts', '../../src/style.css'],
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
 * The prose beside these rules explains the very declarations being asserted —
 * "one media query for both sheets", "sentence case" — so a naive scan keeps
 * finding the explanation instead of the rule.
 */
function css(): string {
  return source('style.css').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** The declarations of one rule, by its exact selector list. */
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

/** The body of one top-level `function name(...) { … }` in a screen module. */
function fn(file: string, name: string): string {
  const text = source(file);
  const at = text.indexOf(`\n  function ${name}(`);
  if (at < 0) throw new Error(`${file} has no function ${name}`);
  const open = text.indexOf('{', at);
  let depth = 0;
  for (let index = open; index < text.length; index++) {
    if (text[index] === '{') depth += 1;
    if (text[index] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, index);
    }
  }
  throw new Error(`${file}'s ${name} never closes`);
}

describe('the Religion sheet is a split', () => {
  it("builds the Statecraft screen's own four split classes", () => {
    const draw = fn('religionScreen.ts', 'draw');
    for (const className of ['sc-split', 'sc-column', 'sc-column-body', 'sc-pane']) {
      expect(`${className}: ${draw.includes(`'${className}`)}`).toBe(`${className}: true`);
    }
  });

  it('puts the pantheon in the column and the augur and the rites in the pane', () => {
    const draw = fn('religionScreen.ts', 'draw');
    const column = draw.indexOf('sc-column-body');
    const pantheon = draw.indexOf('drawPantheon');
    const pane = draw.indexOf("'sc-pane'");
    const purchase = draw.indexOf('drawPurchase');
    const rites = draw.indexOf('drawRites');
    // Order in the source is order in the DOM here: every one of these is an
    // `append` onto the node built just above it.
    expect(column).toBeGreaterThan(-1);
    expect(pantheon).toBeGreaterThan(column);
    expect(pane).toBeGreaterThan(pantheon);
    expect(purchase).toBeGreaterThan(pane);
    expect(rites).toBeGreaterThan(purchase);
  });

  it('caps every parchment sheet at the viewport, from one rule', () => {
    // The cap is what makes a pane scroll instead of the page: without it the
    // sheet grows and the "fixed" column leaves with it.
    //
    // **Six ids now, and still one rule** — the block's own comment asks a
    // later overlay borrowing this paper to name itself here, and the Trade
    // screen, the Compendium (2026-08-27), the Bead Race (2026-08-30) and the
    // Diplomacy table (2026-09-03) have. What is pinned is that the list is
    // one rule with all six in it: a second block that agreed today would be
    // two blocks the first time either was touched.
    const SHEETS = [
      '#statecraft-overlay',
      '#religion-overlay',
      '#trade-overlay',
      '#compendium-overlay',
      '#diplomacy-overlay',
      '#beads-overlay',
    ];
    expect(declaration(SHEETS.join(',\n'), 'overflow')).toBe('hidden');
    expect(
      declaration(SHEETS.map((id) => `${id} .statecraft-sheet`).join(',\n'), 'max-height'),
    ).toBe('100%');
  });

  it('scrolls the two halves in themselves, not the sheet', () => {
    expect(declaration('.sc-column-body', 'overflow-y')).toBe('auto');
    expect(declaration('.sc-pane', 'overflow-y')).toBe('auto');
  });
});

describe('the breakpoint', () => {
  it('stacks both sheets in one and the same media query', () => {
    const text = css();
    const queries = [...text.matchAll(/@media \(max-width: (\d+)px\) \{([\s\S]*?)\n\}/g)].filter(
      ([, , body]) => body.includes('#statecraft-overlay') || body.includes('#religion-overlay'),
    );
    // Exactly one, naming both: two queries that agree today are two numbers.
    expect(queries).toHaveLength(1);
    const [, width, body] = queries[0]!;
    expect(Number(width)).toBe(860);
    expect(body).toContain('#statecraft-overlay');
    expect(body).toContain('#religion-overlay');
    // And what stacking means: the split becomes a column and the two scrollers
    // give their scrolling back to the sheet.
    expect(body).toContain('.sc-split');
    expect(body).toContain('flex-direction: column');
    expect(body).toContain('overflow-y: visible');
  });
});

describe("the sheet's controls", () => {
  it('leaves no uppercased control on the Religion sheet', () => {
    // The eyebrows are labels and may shout; a button and a select may not.
    // Three now: the religion pane's name field is the third control this
    // sheet builds, and it is the one most likely to be dressed as a form
    // element by accident.
    for (const selector of [
      '.rel-buy',
      '.rel-city-select',
      '.rel-name-field',
      '.btn',
      '.btn-primary',
    ]) {
      const transform = declaration(selector, 'text-transform') ?? 'none';
      expect(`${selector}: ${transform}`).toBe(`${selector}: none`);
    }
  });

  it('never sets a control on this sheet in upper case from its own markup', () => {
    // The other way a control can shout: the label written in capitals. Every
    // button and option this screen builds takes its text from a def's `name` or
    // from a sentence, and this pins the two literals it writes itself.
    const text = source('religionScreen.ts');
    expect(text).toContain('Call an augur · ');
    expect(/textContent = '[A-Z ]{4,}'/.test(text)).toBe(false);
  });
});
