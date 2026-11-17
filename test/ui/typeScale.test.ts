/**
 * The type scale and its floor (batch SS8, the Type board in
 * `docs/plans/mockups/scholars-study/Type.dc.html`).
 *
 * The board sets nine size tokens and two floors: no text under 11 px, and no
 * sentence under 12 px. The tokens are named `--size-*` rather than the board's
 * `--type-*`, because `--type-*` already names the four chair-type inks.
 *
 * This file reads the game's stylesheets as text and checks the tokens, the
 * floor and the labels' voice, so a rule written later at 9 px fails here and
 * not in a player's eyes.
 *
 * Sizes in `em` or `%` are relative to a scaled thing (a card face, a tag
 * scaled to the board) and are not read here: only `px` and `rem` sizes are
 * absolute. The root size is the browser's 16 px.
 */
import { describe, expect, it } from 'vitest';

const SHEETS = import.meta.glob(
  ['../../src/style.css', '../../src/ui/*.css', '../../src/cardFaces.css', '../../src/displayFace.css'],
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

const STYLE = Object.entries(SHEETS).find(([path]) => path.endsWith('/src/style.css'))![1];

/** Every rule with a body and no nested block: the selector and its declarations. */
function rules(css: string): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = [];
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of text.matchAll(/([^{};]+)\{([^{}]*)\}/g)) {
    out.push({ selector: match[1]!.trim().replace(/\s+/g, ' '), body: match[2]! });
  }
  return out;
}

/** A size in px, from `font-size` or the size inside a `font` shorthand; null for em, % and tokens. */
function sizesIn(body: string): number[] {
  const sizes: number[] = [];
  for (const decl of body.matchAll(/(font-size|font)\s*:\s*([^;]+);/g)) {
    const value = decl[2]!.trim();
    const found =
      decl[1] === 'font-size'
        ? /^([\d.]+)(px|rem)$/.exec(value)
        : /(?:^|\s)([\d.]+)(px|rem)(?=\s*\/|\s)/.exec(value);
    if (found) sizes.push(Number(found[1]) * (found[2] === 'rem' ? 16 : 1));
  }
  return sizes;
}

/**
 * The rules allowed under the floor, each with its reason. Anything else under
 * 11 px fails.
 */
const UNDER_THE_FLOOR: Record<string, string> = {
  '.civ-yields.is-tight .civ-meter-icon': 'a drawn meter mark sized by the row it sits in, not text',
  '.civ-yields.is-tighter .civ-meter-icon': 'a drawn meter mark sized by the row it sits in, not text',
  '.suit-seat .suit-rank-numeral': 'a rank numeral drawn into the suit seat, part of the card picture',
  '.suit-ribbon-numeral': 'a rank numeral drawn into the suit ribbon, part of the card picture',
  '.sc-chair .suit-seat .suit-rank-numeral, .sc-chair .suit-seat .suit-ribbon-numeral':
    'the rank numeral drawn into the suit seat of the flair gallery’s chair row, part of the card picture',
  '.sc-chair .suit-seat':
    'the em base of the seated suit card at three quarters, drawn only in the flair gallery’s chair row (`chairs.ts`), the retired orders screen’s chair kept as a specimen',
  '.rel-house-glyph': 'SVG text in the pantheon wheel’s 100-unit box, drawn at the wheel’s scale',
  '.rel-wheel-count': 'SVG text in the pantheon wheel’s 100-unit box, drawn at the wheel’s scale',
  '.rel-wheel-of': 'SVG text in the pantheon wheel’s 100-unit box, drawn at the wheel’s scale',
};


/**
 * The retired orders screen's labels (`.sc-*` in `style.css`). The new orders
 * screen (batch SS10 part 2) does not use them; they are drawn now only by the
 * flair gallery's chair row (`chairs.ts`) and by the Faith sheet's Bonuses
 * cards (`.sc-card-type`). They are at the 11 px floor, and keep the mono
 * capitals until those two surfaces are redrawn.
 */
const OLD_SCREEN_LABEL = (selector: string): boolean => selector.startsWith('.sc-');

describe('the type scale (batch SS8)', () => {
  it('defines the nine sizes of the Type board', () => {
    const root = rules(STYLE).find((rule) => rule.selector === ':root' && rule.body.includes('--size-note'));
    expect(root).toBeDefined();
    const token = (name: string): string | undefined =>
      new RegExp(`--size-${name}:\\s*([^;]+);`).exec(root!.body)?.[1]?.trim();
    expect({
      plate: token('plate'),
      display: token('display'),
      title: token('title'),
      heading: token('heading'),
      name: token('name'),
      body: token('body'),
      ui: token('ui'),
      label: token('label'),
      note: token('note'),
    }).toEqual({
      plate: '120px',
      display: '44px',
      title: '32px',
      heading: '20px',
      name: '16px',
      body: '14px',
      ui: '13px',
      label: '12px',
      note: '11px',
    });
  });

  it('sets no text under 11 px, outside the stated exceptions', () => {
    const under: string[] = [];
    for (const [path, css] of Object.entries(SHEETS)) {
      for (const { selector, body } of rules(css)) {
        if (selector.startsWith('@')) continue;
        if (sizesIn(body).some((size) => size < 11) && !(selector in UNDER_THE_FLOOR)) {
          under.push(`${path.replace('../../', '')}: ${selector}`);
        }
      }
    }
    expect(under).toEqual([]);
  });

  it('keeps every stated exception real, so the list cannot go stale', () => {
    const selectors = new Set(Object.values(SHEETS).flatMap((css) => rules(css).map((rule) => rule.selector)));
    for (const selector of Object.keys(UNDER_THE_FLOOR)) expect(selectors.has(selector), selector).toBe(true);
  });

  it('sets a hint and the other sentences at 12 px or more', () => {
    const sentences = [
      '.hint',
      '.help-list',
      '.tile-requires',
      '.goal-note',
      '.end-turn-list-foot',
      '.refusal-line',
      '.city-not-yet-why',
      '.tech-hint',
      '.info-card-notes',
      '.info-card-state',
      '.offer-foot-note',
      '.faith-card-none',
      '.city-board-caption',
      '.loading-stage-detail',
    ];
    const all = rules(STYLE);
    for (const selector of sentences) {
      const rule = all.find((each) => each.selector === selector && /font(-size)?\s*:/.test(each.body));
      expect(rule, selector).toBeDefined();
      expect(rule!.body, selector).toMatch(/font-size:\s*var\(--size-(label|ui|body|name)\)/);
    }
  });

  it('sets no label in mono capitals: a label is in small capitals of the names face', () => {
    // The Type and Main boards: a tracked mono label is one of the looks the
    // redesign leaves behind. Mono stays for figures.
    const caps: string[] = [];
    for (const [path, css] of Object.entries(SHEETS)) {
      for (const { selector, body } of rules(css)) {
        if (OLD_SCREEN_LABEL(selector) || path.endsWith('statecraftScreen.css')) continue;
        if (/text-transform:\s*uppercase/.test(body) && /var\(--face-num\)/.test(body)) {
          caps.push(`${path.replace('../../', '')}: ${selector}`);
        }
      }
    }
    expect(caps).toEqual([]);
  });
});
