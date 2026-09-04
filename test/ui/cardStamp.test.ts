/**
 * The card stamp: the number a card wears, and the choreography that puts it
 * there (`src/ui/cardStamp.ts`, `docs/doctrine-ideas.md` Part IV — the design of
 * record).
 *
 * There is no jsdom in this suite (see `test/ui/statecraftCards.test.ts` for the
 * note), so this asks the two kinds of question that survive that: the **pure**
 * half — the adapter that turns an impact list into figures, the eased count
 * and the signs — and the **source** half, which is where the rulings
 * that can be quietly broken on every card at once actually live: that no digit
 * is printed during a selection, that a pick reveals and the sheet leaves after
 * it, that the bench wears the flourish, and that motion off means no motion at
 * all rather than a faster one.
 */

import { describe, expect, it } from 'vitest';

import {
  STAMP_FLOURISH,
  STAMP_LIFETIME_LABEL,
  STAMP_TIMING,
  type StampReading,
  stampCascadeText,
  stampCountAt,
  stampFigureText,
  stampFigures,
  stampIsEmpty,
  stampReading,
  stampText,
  stampThunks,
} from '../../src/ui/cardStamp';
import type { CardImpactLine } from '../../src/sim/cardImpact';
import { YIELD_GLYPH } from '../../src/ui/figures';

const SOURCES = import.meta.glob('../../src/ui/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const STYLE = import.meta.glob('../../src/style.css', {
  query: '?raw',
  import: 'default',
  eager: true,
})['../../src/style.css'] as string;

function source(name: string): string {
  const text = SOURCES[`../../src/ui/${name}`];
  if (text === undefined) throw new Error(`no source for ${name}`);
  return text;
}

/** An impact line with only the fields the adapter reads. */
function line(over: Partial<CardImpactLine> & Pick<CardImpactLine, 'kind'>): CardImpactLine {
  return {
    source: 'A card',
    food: 0,
    production: 0,
    gold: 0,
    science: 0,
    culture: 0,
    faith: 0,
    ...over,
  };
}

describe('stampReading — the sim\'s list as a stamp', () => {
  /** The digits are the fold of every standing line. Rule 5, on a card face. */
  it('folds the standing lines into one figure per voice', () => {
    const reading = stampReading([
      line({ kind: 'city', gold: 1 }),
      line({ kind: 'empire', gold: 2, science: 1 }),
    ]);
    expect(reading.figures).toEqual([
      { glyph: YIELD_GLYPH.gold, amount: 3 },
      { glyph: YIELD_GLYPH.science, amount: 1 },
    ]);
    expect(reading.knockOn).toEqual([]);
    expect(reading.occasionFigures).toEqual([]);
  });

  /**
   * A tier flip is **in** the figure, and it is labelled apart so the *hover*
   * can lean on it. Nothing about it is drawn on the card — the number stands
   * alone (the final ruling).
   */
  it('carries a tier flip in the figure and labels it for the hover', () => {
    const reading = stampReading([
      line({ kind: 'knockOn', source: 'Happiness', meter: 'happiness', science: 2 }),
    ]);
    expect(reading.figures).toEqual([{ glyph: YIELD_GLYPH.science, amount: 2 }]);
    expect(reading.knockOn).toEqual([{ glyph: YIELD_GLYPH.science, amount: 2 }]);
    expect(reading.knockOnLabel).toBe('Happiness');
    expect(stampCascadeText(reading)).toBe(`+2${YIELD_GLYPH.science} · Happiness`);
  });

  /** An ordinary card — a flat, a percentage, a conversion — has no cascade. */
  it('marks nothing as a cascade that is not one', () => {
    const ordinary = stampReading([line({ kind: 'city', gold: 4 })]);
    expect(ordinary.knockOn).toEqual([]);
    expect(ordinary.knockOnLabel).toBeUndefined();
    expect(stampCascadeText(ordinary)).toBeNull();
  });

  /** An occasion's grant is its own register, never folded into a rate. */
  it('keeps an occasion apart from a per-turn figure', () => {
    const reading = stampReading([
      line({ kind: 'occasion', culture: 10, occasion: 'killing a barbarian unit' }),
    ]);
    expect(reading.figures).toEqual([]);
    expect(reading.occasionFigures).toEqual([{ glyph: YIELD_GLYPH.culture, amount: 10 }]);
    expect(reading.occasion).toBe('killing a barbarian unit');
    expect(stampThunks(reading)).toBe(true);
    // And it is what the stamp prints, at the same digit size as a rate's.
    expect(stampFigures(reading)).toEqual(reading.occasionFigures);
  });

  /** A card that is both counts, and says the occasion beside the count. */
  it('counts a card that pays both ways, and still names the moment', () => {
    const reading = stampReading([
      line({ kind: 'city', gold: 2 }),
      line({ kind: 'occasion', culture: 10, occasion: 'a city growing' }),
    ]);
    expect(stampThunks(reading)).toBe(false);
    expect(stampFigures(reading)).toEqual([{ glyph: YIELD_GLYPH.gold, amount: 2 }]);
    expect(reading.occasion).toBe('a city growing');
  });

  /** Nothing at all is nothing at all — the flourish stands, never a nought. */
  it('is empty for a card with no ledger footprint', () => {
    expect(stampIsEmpty(stampReading([]))).toBe(true);
  });

  /** A rider with no countable grant is said in words rather than dropped. */
  it('keeps a wordless grant as a note', () => {
    const reading = stampReading([
      line({ kind: 'occasion', occasion: 'pillaging', note: 'heals 25' }),
    ]);
    expect(reading.note).toBe('heals 25');
    expect(stampIsEmpty(reading)).toBe(false);
  });
});

describe('the figures themselves', () => {
  it('writes the sign the way every other number here is written', () => {
    expect(stampFigureText({ glyph: '💰', amount: 3 })).toBe('+3💰');
    expect(stampFigureText({ glyph: '💰', amount: -3 })).toBe('−3💰');
  });

  it('joins the voices with air, in the order they are printed', () => {
    expect(stampText([{ glyph: '🔬', amount: 2 }, { glyph: '🎵', amount: -1 }])).toBe('+2🔬 −1🎵');
  });
});

describe('the eased count', () => {
  it('starts at nothing and ends on the number', () => {
    expect(stampCountAt(7, 0)).toBe(0);
    expect(stampCountAt(7, STAMP_TIMING.countMs)).toBe(7);
    expect(stampCountAt(7, STAMP_TIMING.countMs + 200)).toBe(7);
  });

  it('never overshoots on the way, in either direction', () => {
    for (let t = 0; t <= STAMP_TIMING.countMs; t += 25) {
      expect(stampCountAt(9, t)).toBeGreaterThanOrEqual(0);
      expect(stampCountAt(9, t)).toBeLessThanOrEqual(9);
      expect(stampCountAt(-9, t)).toBeLessThanOrEqual(0);
      expect(stampCountAt(-9, t)).toBeGreaterThanOrEqual(-9);
    }
  });

  /** Eased out, so the digits sprint and settle rather than tick evenly. */
  it('is past halfway before half the time has gone', () => {
    expect(stampCountAt(100, STAMP_TIMING.countMs / 2)).toBeGreaterThan(50);
  });
});

describe('the design of record, held at the source', () => {
  /**
   * **Boxless** (user, revision 3). No border, no background fill, no radius on
   * the stamp or its digits — the number is a mark on paper, not a widget.
   */
  it('draws no box around the stamp', () => {
    // Everything the player reads — the seat, the digits, the flourish and the
    // words. The glow below is the one exception and is checked as what it is:
    // a soft radial wash *behind* the number, never a ring.
    const block = STYLE.slice(STYLE.indexOf('.card-stamp {'), STYLE.indexOf('.card-stamp-glow {'));
    expect(block.length).toBeGreaterThan(0);
    for (const banned of ['border:', 'border-radius:', 'background-color:', 'box-shadow:', 'background:']) {
      expect(block.split(banned).length - 1, banned).toBe(0);
    }
    const glow = STYLE.slice(STYLE.indexOf('.card-stamp-glow {'), STYLE.indexOf('.card-stamp[data-phase='));
    expect(glow).toContain('radial-gradient');
    expect(glow).not.toContain('border:');
  });

  /** Digits and the words beside them share one baseline, and never wrap. */
  it('keeps the figure on one baseline and one line', () => {
    const block = STYLE.slice(STYLE.indexOf('.card-stamp {'), STYLE.indexOf('.card-stamp-flourish'));
    expect(block).toContain('align-items: baseline');
    expect(block).toContain('flex-wrap: nowrap');
  });

  /** The number is tabular mono, like every number in this interface. */
  it('sets the digits in the tabular mono face', () => {
    const block = STYLE.slice(
      STYLE.indexOf('.card-stamp-figure {'),
      STYLE.indexOf('.card-stamp-occasion {'),
    );
    expect(block).toContain('var(--face-num)');
    expect(block).toContain('tabular-nums');
  });

  /** The flourish is the seat of the number, in the card's own line ink. */
  it('seats the flourish in the line ink, half strength', () => {
    expect(STAMP_FLOURISH).toBe('— · ✶ · —');
    const block = STYLE.slice(
      STYLE.indexOf('.card-stamp-flourish {'),
      STYLE.indexOf('.card-stamp[data-face='),
    );
    expect(block).toContain('var(--stamp-ink)');
    expect(block).toContain('opacity: 0.55');
  });

  /**
   * **No popup, ever** (final ruling, 2026-09-03): the number stands alone.
   * Nothing on the card explains where it came from — that is the hover's job —
   * so there is no tag element, no tag rule and no tag keyframe anywhere.
   */
  it('draws nothing beside the number', () => {
    expect(STYLE).not.toContain('card-stamp-tag');
    const module = source('cardStamp.ts');
    expect(module).not.toContain("span('card-stamp-tag')");
    // The cascade survives as *data*, for the breakdown that will print it.
    expect(module).toContain('export function stampCascadeText');
  });

  /** The digits sit close under the clauses; the air is above the flavour. */
  it('leaves no dead band between the clauses and the digits', () => {
    const block = STYLE.slice(STYLE.indexOf('.card-stamp {'), STYLE.indexOf('.card-stamp-flourish'));
    expect(block).toContain('margin: 1px 0 12px');
  });

  /** The quiet register's words are the user's, and only theirs. */
  it('never says "banked"', () => {
    expect(STAMP_LIFETIME_LABEL).toBe('has produced');
    // And no surface in the interface prints the rejected wording. (The
    // constant's own docblock names it, once, to say why it is not used.)
    for (const [path, text] of Object.entries(SOURCES)) {
      if (path.endsWith('/cardStamp.ts')) continue;
      expect(text, path).not.toContain('banked since slotted');
    }
  });

  /** Motion off is *no* motion — every keyframe is switched off, not shortened. */
  it('turns the animation off rather than down under reduced motion', () => {
    // **The stamp's own** reduced-motion block, found by what it names rather
    // than by being the last one in the file: the spend ceremony added a second
    // (`greatPersonCeremony.ts`, 2026-09-03) and a later surface will add a
    // third, and "the last block" would quietly start asserting somebody else's.
    const at = STYLE.indexOf(
      '@media (prefers-reduced-motion: reduce)',
      STYLE.indexOf('.card-stamp-figure.is-tick') - 800,
    );
    expect(at).toBeGreaterThan(-1);
    const media = STYLE.slice(at, STYLE.indexOf('\n}\n', at));
    expect(media).toContain('.card-stamp[data-phase=\'landed\'] .card-stamp-figure');
    expect(media).toContain('.offer-option.is-taken');
    expect(media).toContain('animation: none');
    // And the module itself lands the number instantly rather than skipping it.
    const module = source('cardStamp.ts');
    expect(module).toContain("'(prefers-reduced-motion: reduce)'");
    expect(module).toMatch(/if \(!wantsMotion\(\)\) \{\s*landCardStamp\(stamp, reading\);/);
  });
});

describe('the offer\'s draft flow', () => {
  const OFFER = source('offerCard.ts');

  /**
   * **No numbers during selection.** The card face builds the stamp's element
   * and never fills it: the only writers are `playCardStamp` and
   * `landCardStamp`, and neither is called while the hand is on the table.
   */
  it('builds the stamp wearing the flourish and prints no digit until a pick', () => {
    const face = OFFER.slice(OFFER.indexOf('function face('), OFFER.indexOf('const layout = orderOfferLayout'));
    expect(face).toContain('cardStampNode()');
    expect(face).not.toContain('playCardStamp');
    expect(face).not.toContain('landCardStamp');
    expect(face).not.toContain('stampText');
  });

  /**
   * The pick reveals, and **the dispatch is not delayed** — the callback runs on
   * the same tick it always did. Only the sheet's exit waits.
   */
  it('reveals on the pick and delays only the sheet\'s exit', () => {
    const take = OFFER.slice(OFFER.indexOf('function take(index: number)'), OFFER.indexOf('function onKeyDown'));
    expect(take).toContain('playCardStamp(stampNode, stamp)');
    expect(take).toContain('STAMP_TIMING.exitMs');
    expect(take).toContain('callback?.(index)');
    // The passed cards fall away; the taken one holds the light.
    expect(take).toContain("'is-taken'");
    expect(take).toContain("'is-passed'");
    // A card with nothing to weigh behaves exactly as it did before.
    expect(take).toMatch(/stampIsEmpty\(stamp\)\) \{\s*teardown\(\);/);
  });

  /** The exit timer and the count are both cancelled by every ending. */
  it('leaves no timer running against a sheet that has gone', () => {
    const teardown = OFFER.slice(OFFER.indexOf('function teardown()'), OFFER.indexOf('function clear()'));
    expect(teardown).toContain('exitTimer');
    expect(teardown).toContain('cancelStamp?.()');
    // And a chained draft replaces the sheet rather than being taken away with it.
    const show = OFFER.slice(OFFER.indexOf('function show(offer: Offer'), OFFER.indexOf('const sheet = element('));
    expect(show).toContain('exitTimer');
  });
});

describe('the bench and the offices', () => {
  const SCREEN = source('statecraftScreen.ts');

  /**
   * A held card wears the flourish and costs nothing to draw; a card in an
   * office reads its figure. The asymmetry is deliberate — see `stampFor`.
   */
  it('weighs only the cards in an office', () => {
    const collection = SCREEN.slice(
      SCREEN.indexOf('function drawCollection('),
      SCREEN.indexOf('function draw()'),
    );
    expect(collection).toContain('cardStampNode()');
    // The reading is inside the slotted branch and nowhere else.
    const slotted = collection.slice(collection.indexOf('if (slotted.has(entry.id)) {'));
    expect(slotted).toContain('stampFor(state, seat, entry.id, entry.level)');
    expect(collection.slice(0, collection.indexOf('if (slotted.has(entry.id)) {'))).not.toContain('stampFor(');
  });

  /** Slotting plays the count with the true number; a card at rest does not. */
  it('plays the count for the office just filled, and lands the rest', () => {
    expect(SCREEN).toContain('if (justSlotted === entry.id) playCardStamp(stamp, reading);');
    expect(SCREEN).toContain('else landCardStamp(stamp, reading);');
    // The flag is armed by the gesture and spent by the draw that plays it.
    expect(SCREEN).toContain('justSlotted = held;');
    expect(SCREEN).toContain('justSlotted = null;');
  });
});

describe('a reading is a reading', () => {
  /** The three predicates agree about the same list, whichever asks first. */
  it('never calls an empty reading a thunk', () => {
    const empty: StampReading = { figures: [], occasionFigures: [], knockOn: [] };
    expect(stampIsEmpty(empty)).toBe(true);
    expect(stampThunks(empty)).toBe(false);
    expect(stampFigures(empty)).toEqual([]);
  });
});
