/**
 * The yield strip's chips must expand to fit a long figure, never wrap or clip
 * it (bug report, 2026-08-28): a three-digit yield, a `poolFigure` like
 * "27/90 (+2)", the routes chip's "⇄ 2 / 3", or a four-digit treasury beside
 * its `(+123)` all have to print on one line.
 *
 * Asked of `src/style.css` itself, for `test/ui/tilePriceTags.test.ts`'s
 * reason exactly: there is no jsdom in this suite (`vite.config.ts`), so a
 * layout claim ("does this actually wrap") is not something a test here can
 * ask of a rendered page — only of the rule that would cause or prevent it.
 * The claims below are the CSS facts that add up to "never wraps": every chip
 * and its figure span refuse to line-break, no chip carries a fixed `width`
 * that could clip or force a shrink, and the strip's own give is its `gap`
 * before it is anything else.
 */

import { describe, expect, it } from 'vitest';

const SOURCES = import.meta.glob(['../../src/style.css', '../../src/ui/topBar.ts'], {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function source(name: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(name));
  const text = key === undefined ? undefined : SOURCES[key];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`${name} came back empty`);
  }
  return text;
}

/** One CSS rule's body, by selector. Comments are prose, not rules. */
function rule(css: string, selector: string): string {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const at = stripped.indexOf(`\n${selector} {`);
  if (at < 0) throw new Error(`No rule for \`${selector}\``);
  const open = stripped.indexOf('{', at);
  const close = stripped.indexOf('}', open);
  return stripped.slice(open + 1, close);
}

describe('the top-bar yield strip', () => {
  const css = source('src/style.css');

  it('never wraps a chip: the chip, its icon and its figure all refuse to break', () => {
    for (const selector of ['.civ-yield', '.civ-yield-icon', '.civ-yield-value']) {
      expect(rule(css, selector)).toMatch(/white-space:\s*nowrap/);
    }
  });

  it('never shrinks a chip below its content — the chip is pinned, not left to flex-shrink', () => {
    expect(rule(css, '.civ-yield')).toMatch(/flex:\s*0 0 auto/);
  });

  it('carries no fixed width on any chip that could clip a long figure', () => {
    // `min-width` and `max-width` are fine (the fix's own `min-width: 0` on
    // the strip among them) — only a bare `width:` declaration, which a
    // three-digit figure could outgrow, is refused.
    for (const selector of ['.civ-yields', '.civ-yield', '.civ-yield-icon', '.civ-yield-value']) {
      const body = rule(css, selector);
      expect(body).not.toMatch(/^\s*width:\s*\d/m);
    }
  });

  it('gives first, before anything else, on the strip\u2019s own gap', () => {
    // `clamp(...)` lets the row's `gap` shrink under a narrow bar rather than
    // wrapping a chip or squeezing one below its content.
    expect(rule(css, '.civ-yields')).toMatch(/gap:\s*clamp\(/);
  });

  it('lets the strip itself yield — shrinkable and scrollable — rather than push the bar\u2019s right-hand controls off it', () => {
    const strip = rule(css, '.civ-yields');
    expect(strip).toMatch(/min-width:\s*0/);
    expect(strip).toMatch(/overflow-x:\s*auto/);
  });
});

/**
 * And the ruling that came out of the first full playthrough (turn 92, six
 * cities, six three-digit yields): **the figures shrink before the strip would
 * overflow**, so the two meters at its right-hand end are never what scrolls
 * out of sight (`docs/flags.md`, note 24).
 *
 * Same house rule as above — no jsdom, so nothing here can watch a row actually
 * shrink. What is pinned is the pair of facts that add up to it: the two steps
 * exist in the stylesheet and each is smaller than the one before, and the
 * script measures the strip rather than guessing at a width.
 */
describe('the yield strip steps down before it overflows', () => {
  const css = source('src/style.css');
  const bar = source('src/ui/topBar.ts');

  /** The `font-size` a rule sets, in px. */
  function figureSize(selector: string): number {
    const body = rule(css, selector);
    const match = /font-size:\s*([\d.]+)px/.exec(body);
    if (!match) throw new Error(`No font-size on \`${selector}\``);
    return Number(match[1]);
  }

  it('has two steps, each figure smaller than the step before it', () => {
    const base = figureSize('.civ-yield');
    const tight = figureSize(
      '.civ-yields.is-tight .civ-yield,\n.civ-yields.is-tight .civ-yield-icon,\n.civ-yields.is-tight .civ-meter',
    );
    const tighter = figureSize(
      '.civ-yields.is-tighter .civ-yield,\n.civ-yields.is-tighter .civ-yield-icon,\n.civ-yields.is-tighter .civ-meter',
    );
    expect(tight).toBeLessThan(base);
    expect(tighter).toBeLessThan(tight);
    // Legible is the other half of the ruling: nothing below the bar buttons'
    // own value, which is the smallest type this bar already prints.
    expect(tighter).toBeGreaterThanOrEqual(10);
  });

  it('closes the gap with the figures, at both steps', () => {
    expect(rule(css, '.civ-yields.is-tight')).toMatch(/gap:\s*8px/);
    expect(rule(css, '.civ-yields.is-tighter')).toMatch(/gap:\s*6px/);
  });

  it('steps the meters down with the yields — they are the end that used to scroll away', () => {
    expect(rule(css, '.civ-yields.is-tight .civ-meters')).toMatch(/gap:/);
    expect(rule(css, '.civ-yields.is-tighter .civ-meters')).toMatch(/gap:/);
    expect(figureSize('.civ-yields.is-tighter .civ-meter-icon')).toBeLessThan(
      figureSize('.civ-meter-icon'),
    );
  });

  it('keeps every figure tabular mono at every step — a smaller number, never a different one', () => {
    // The steps rewrite `font-size` and nothing else about the face, so the
    // tabular rule has to be stated where the digits are.
    expect(rule(css, '.civ-yield-value')).toMatch(/font-variant-numeric:\s*tabular-nums/);
    expect(rule(css, '.civ-yield')).toMatch(/font-variant-numeric:\s*tabular-nums/);
    expect(rule(css, '.civ-meter')).toMatch(/font-variant-numeric:\s*tabular-nums/);
    // …and the steps themselves touch the size only: no step rewrites the face
    // it inherits, so a stepped figure is the same mono, smaller.
    for (const selector of [
      '.civ-yields.is-tight',
      '.civ-yields.is-tighter',
      '.civ-yields.is-tight .civ-meters',
      '.civ-yields.is-tighter .civ-meters',
    ]) {
      expect(rule(css, selector)).not.toMatch(/font-family/);
    }
  });

  it('measures the strip rather than guessing a width: the class is set from scrollWidth against clientWidth', () => {
    expect(bar).toContain("const STRIP_FIT_STEPS = ['is-tight', 'is-tighter'] as const");
    expect(bar).toContain('container.scrollWidth - container.clientWidth');
    expect(bar).toContain('container.classList.add(step)');
    // A container query could only ask how wide the bar is, and the bar is the
    // window — what overflowed is the digits. The docblock says so; the code
    // must not quietly grow one.
    expect(css).not.toMatch(/@container[^{]*\{[^}]*\.civ-yield/);
  });

  it('re-fits when either input moves — the bar\u2019s width, or the digits printed', () => {
    expect(bar).toContain('new ResizeObserver(() => fitStrip())');
    expect(bar).toContain('fitObserver.observe(container)');
    // And the previous game's observer is disposed by the next one that takes
    // the element over: `#civ-yields` outlives every game.
    expect(bar).toContain('stripFitObservers.get(container)?.disconnect()');
    // The digits half, guarded so a hover that changes nothing costs no reflow.
    expect(bar).toContain('if (printed !== fittedText)');
  });

  it('keeps the strip\u2019s chips buttons at every step', () => {
    expect(rule(css, '.civ-yields.is-tighter .civ-yield-clickable')).toMatch(/padding:/);
    expect(rule(css, '.civ-yield-clickable')).toMatch(/cursor:\s*pointer/);
    expect(bar).toContain("classList.add('civ-yield-clickable')");
  });

  it('is not fought by the narrow-window breakpoint the stylesheet already has', () => {
    // `@media (max-width: 860px)` says nothing about this strip; if it ever
    // does, the two rules have to be reconciled deliberately rather than by
    // cascade order.
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const query = '@media (max-width: 860px)';
    let from = stripped.indexOf(query);
    expect(from).toBeGreaterThan(-1);
    while (from >= 0) {
      // Brace-count to the end of the at-rule: its own nested rules each close
      // with a `}` of their own, so the first one is not the block's end.
      let depth = 0;
      let at = stripped.indexOf('{', from);
      const open = at;
      do {
        if (stripped[at] === '{') depth += 1;
        else if (stripped[at] === '}') depth -= 1;
        at += 1;
      } while (depth > 0 && at < stripped.length);
      expect(stripped.slice(open, at)).not.toMatch(/\.civ-yield|\.civ-meter/);
      from = stripped.indexOf(query, at);
    }
  });
});
