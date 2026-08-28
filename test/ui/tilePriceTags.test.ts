/**
 * The price plate: one price, one language, three surfaces.
 *
 * A tile's price is quoted in three places that a player meets within a second
 * of each other — the plate on the hex, the city panel's `or 60💰` buy tag, and
 * the flair cabinet's specimen of the plate — and the failure this file exists
 * to catch is the one the pass was for: they drift into three different objects,
 * each individually reasonable, and "buying" stops being one gesture.
 *
 * Asked of the sources rather than of a rendered page, for the reason every UI
 * test in this suite is: there is no jsdom here (see `vite.config.ts`), and the
 * claims below are facts about the code — which tokens the plate is painted in,
 * which printer draws its coin, whether the gallery reproduced a rule it should
 * have borrowed. A behavioural test would need a browser to say less.
 *
 * `purchasableTiles` and `tilePurchaseError` are the *rule* and are pinned in
 * `test/sim/territory.test.ts`; nothing here re-asks what a tile costs.
 */

import { describe, expect, it } from 'vitest';

const SOURCES = import.meta.glob(
  [
    '../../src/ui/tilePriceTags.ts',
    '../../src/style.css',
    '../../src/flairGallery/flourishes.ts',
    '../../src/flairGallery/style.css',
  ],
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

/** One CSS rule's body, by selector. Comments are prose, not rules. */
function rule(css: string, selector: string): string {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const at = stripped.indexOf(`\n${selector} {`);
  if (at < 0) throw new Error(`No rule for \`${selector}\``);
  const open = stripped.indexOf('{', at);
  const close = stripped.indexOf('}', open);
  return stripped.slice(open + 1, close);
}

describe('the price plate', () => {
  // `src/style.css`, spelled with its directory: the gallery's stylesheet ends
  // in the same six characters and would otherwise answer for it.
  const css = source('src/style.css');
  const plate = rule(css, '.tile-price');

  /**
   * The pass's whole content. It used to be gilt numerals on an ink pill, which
   * reads as a *label* — the voice the damage numbers speak in — and a price is
   * an offer, not a label.
   */
  it('is parchment under an ink rim, not a figure on an ink pill', () => {
    expect(plate).toMatch(/--price-paper:\s*var\(--parchment\)/);
    expect(plate).toMatch(/--price-rim:\s*var\(--ink\)/);
    expect(plate).toMatch(/background:\s*var\(--price-paper\)/);
    expect(plate).toMatch(/border:.*var\(--price-rim\)/);
    // A plate, not a pill: the panel's small radius rather than a lozenge.
    expect(plate).toMatch(/border-radius:\s*var\(--radius-sm\)/);
    expect(plate).not.toMatch(/border-radius:\s*999px/);
  });

  it('counts in the mono voice, tabular, like every number in the game', () => {
    expect(plate).toMatch(/font-family:\s*var\(--face-num\)/);
    expect(plate).toMatch(/font-variant-numeric:\s*tabular-nums/);
  });

  /**
   * Greyed, not struck. A line through a price says *withdrawn*; what a plate
   * over a hex the treasury cannot cover means is *not today*, which is what the
   * city panel's disabled buy tag already says with faint ink on the table.
   */
  it('greys a refusal the way the city panel greys one', () => {
    const barred = rule(css, '.tile-price.is-barred');
    expect(barred).not.toMatch(/line-through/);
    expect(barred).toMatch(/var\(--price-ink-barred\)/);
    expect(barred).toMatch(/var\(--price-rim-barred\)/);
    // The panel's own disabled tokens, so the two refusals are one colour.
    const panel = rule(css, '.city-buildable-buy:disabled');
    expect(panel).toMatch(/var\(--ink-faint\)/);
    expect(plate).toMatch(/--price-ink-barred:\s*var\(--ink-faint\)/);
    expect(plate).toMatch(/--price-paper-barred:\s*var\(--table\)/);
  });

  it('takes a gilt rim under the cursor, by a class the gallery can also wear', () => {
    // The hover state is reachable without a cursor, which is what keeps the
    // flair cabinet from copying the rule — see the gallery test below.
    expect(css).toMatch(/\.tile-price\.is-hovered:not\(:disabled\)/);
    const hovered = rule(css, '.tile-price:hover:not(:disabled),\n.tile-price.is-hovered:not(:disabled)');
    expect(hovered).toMatch(/border-color:\s*var\(--price-rim-hover\)/);
    expect(plate).toMatch(/--price-rim-hover:\s*var\(--gilt\)/);
  });

  /**
   * The tunables live in one block on the class, which is the DOM register for
   * what `data/view3d.json` is to the renderer. A plate whose sizes were spread
   * through its rules could not be dialed in the cabinet.
   */
  it('keeps every tunable as a custom property in one block', () => {
    for (const knob of [
      '--price-paper',
      '--price-ink',
      '--price-rim',
      '--price-throw',
      '--price-size',
      '--price-pad',
      '--price-paper-barred',
      '--price-ink-barred',
      '--price-rim-barred',
      '--price-rim-hover',
    ]) {
      expect(plate).toContain(`${knob}:`);
    }
  });

  /**
   * The coin is drawn. `yieldMark.test.ts` sweeps `src/ui` for a composed figure
   * that reaches the DOM unprinted, so this only has to pin that the plate is
   * one of the surfaces that composes one — and that the emoji it still writes
   * goes to the two strings the platform builds and a node cannot enter.
   *
   * The composition moved when the caravan mode landed: the *supplier* writes
   * `${YIELD_GLYPH.gold} ${offer.price}` onto a `MapPlate` and the layer prints
   * whatever face it is handed. That is the pass's whole point, so the assertion
   * follows it rather than pinning the old line — what must stay true is that
   * the plate's face goes through the printer and its spoken form does not.
   */
  it('prints its coin through the yield printer, never as an emoji', () => {
    const module = source('tilePriceTags.ts');
    expect(module).toMatch(/from '\.\/yieldMark'/);
    // One printer for both modes' faces — a second `setYieldText` would be the
    // fork this layer exists to avoid.
    expect(module).toMatch(/setYieldText\(tag\.root, plate\.text\)/);
    expect(module).toMatch(/text: `\$\{YIELD_GLYPH\.gold\} \$\{offer\.price\}`/);
    // The spoken and hovered forms stay words: a screen reader given the glyph
    // reads its Unicode name before the number it decorates.
    expect(module).toMatch(/aria-label/);
    expect(module).toMatch(/\$\{offer\.price\} gold/);
  });

  /**
   * **One mechanism, two modes.** Buying a hex and sending a caravan are the
   * same gesture — arm a mode, read a figure on every candidate, click one — and
   * the failure this pass could have shipped is a second plate layer that merely
   * looks like this one and drifts out of step with it a milestone later. So the
   * lifecycle is asserted to exist once: one builder, one signature check, one
   * reposition loop, with the price supplier bolted on top.
   */
  it('is one layer with two suppliers, not two layers', () => {
    const module = source('tilePriceTags.ts');
    expect(module).toMatch(/export function createMapPlates/);
    // The price tags are that core, not a copy of it.
    expect(module).toMatch(/export function createTilePriceTags[\s\S]*?createMapPlates\(\{/);
    // And the handle is one shape rather than two declarations of three methods.
    expect(module).toMatch(/export type TilePriceTags = MapPlates/);
    // Exactly one place a tag element is made, and one place it is placed.
    expect(module.match(/document\.createElement\('button'\)/g)?.length).toBe(1);
    expect(module.match(/projectCell/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

describe('the flair cabinet’s specimen', () => {
  it('shows all three states, built from the game’s own class and printer', () => {
    const gallery = source('flourishes.ts');
    expect(gallery).toContain('pricePlateStall');
    expect(gallery).toMatch(/'tile-price'/);
    expect(gallery).toMatch(/is-barred/);
    expect(gallery).toMatch(/is-hovered/);
    expect(gallery).toMatch(/setYieldText/);
  });

  /**
   * The cabinet's standing bargain (its own docblock): nothing on that page is
   * reproduced. It may lay the plate out and give it a ground; it may not
   * restate what the plate looks like, or the page goes stale silently the first
   * time the shipping rule moves.
   */
  it('borrows the plate rather than repainting it', () => {
    const local = source('flairGallery/style.css');
    const priceRules = local.slice(local.indexOf('--- the price plate'));
    for (const painted of ['--price-paper', '--price-ink', '--price-rim', 'font-variant-numeric']) {
      expect(priceRules.includes(painted)).toBe(false);
    }
    // The one override it is allowed: the plate is placed by `projectCell` on
    // the board and by nothing at all here, so it returns to the flow.
    expect(priceRules).toMatch(/\.price-slot \.tile-price \{\s*position: static;/);
  });
});
