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

const SOURCES = import.meta.glob(['../../src/style.css'], {
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
