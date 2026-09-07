/**
 * The card stamp: the number a card wears, and the choreography that puts it
 * there (`src/ui/cardStamp.ts`, `docs/history/doctrine-ideas.md` Part IV — the design of
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
import { METER_GLYPH, YIELD_GLYPH } from '../../src/ui/figures';
import type { CardImpactLine } from '../../src/sim/cardImpact';
import type { MeterId } from '../../src/sim/meters';

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

/** One file's source with its comments taken out — the rule is not the prose. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
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

/** A meter line: points into happiness or authority, and no voice at all. */
function meter(id: MeterId, amount: number): CardImpactLine {
  return line({ kind: 'meter', source: id === 'happiness' ? 'Happiness' : 'Authority', meter: id, amount });
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

  /**
   * **The meters are figures** (user, 2026-09-03 — "we should have happiness and
   * authority be yields that appear in the preview numbers, its confusing when
   * they aren't shown"). A card's own meter line counts up in the meter's own
   * mark, beside the six voices and after them.
   */
  it('prints a card\'s own meter line as a figure in the meter\'s mark', () => {
    const reading = stampReading([
      meter('happiness', 4),
      meter('authority', -1),
    ]);
    expect(reading.figures).toEqual([
      { glyph: METER_GLYPH.happiness, amount: 4 },
      { glyph: METER_GLYPH.authority, amount: -1 },
    ]);
    expect(stampText(reading.figures)).toBe(
      `+4${METER_GLYPH.happiness} −1${METER_GLYPH.authority}`,
    );
    // A meter is not a yield: it never joins one of the six, and a card that
    // pays only a meter is not empty and does not thunk.
    expect(stampIsEmpty(reading)).toBe(false);
    expect(stampThunks(reading)).toBe(false);
    expect(reading.knockOn).toEqual([]);
  });

  /** The six voices lead, the two meters follow — the top bar's own order. */
  it('sets the meters after the yields, in the order the chips stand', () => {
    const reading = stampReading([
      meter('authority', 3),
      line({ kind: 'city', science: 2 }),
      meter('happiness', 1),
    ]);
    expect(reading.figures).toEqual([
      { glyph: YIELD_GLYPH.science, amount: 2 },
      { glyph: METER_GLYPH.happiness, amount: 1 },
      { glyph: METER_GLYPH.authority, amount: 3 },
    ]);
  });

  /**
   * The card's own points and the yield a tier they crossed unlocked are two
   * different sentences: the first is a figure, the second stays the hover's.
   */
  it('keeps a meter figure apart from the cascade it caused', () => {
    const reading = stampReading([
      meter('happiness', 4),
      line({ kind: 'knockOn', source: 'Happiness', meter: 'happiness', science: 2 }),
    ]);
    expect(reading.figures).toEqual([
      { glyph: YIELD_GLYPH.science, amount: 2 },
      { glyph: METER_GLYPH.happiness, amount: 4 },
    ]);
    expect(reading.knockOn).toEqual([{ glyph: YIELD_GLYPH.science, amount: 2 }]);
    expect(stampCascadeText(reading)).toBe(`+2${YIELD_GLYPH.science} · Happiness`);
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

  /**
   * **The count writes digits, never nodes** (the 2026-09-03 "still feels a
   * little bit clunky" report). `setYieldText` rebuilds an element's children,
   * and each mark it builds carries a `data:` URI of the best part of a
   * kilobyte in an inline custom property — forty of those inside one count, every one of them
   * dirtying the layout of a card that is being animated at the same time. The
   * tick path goes through `yieldTextWriter`, which builds the row once and
   * moves text nodes afterwards; the one-shot writers (`landCardStamp`, the
   * thunk) may still rebuild, because they write once.
   */
  it('never calls the node-rebuilding printer from inside the count', () => {
    // Comments out first: the rule is the code, and the docblock beside it names
    // the very call it is there to forbid.
    const module = code(source('cardStamp.ts'));
    const play = module.slice(module.indexOf('export function playCardStamp'));
    const count = play.slice(play.indexOf("stamp.dataset.face = 'figure';"));
    expect(count).toContain('const write = yieldTextWriter(parts.figure)');
    expect(count).not.toContain('setYieldText');
    // And the writer is the one that patches rather than replaces.
    const printer = code(source('yieldMark.ts'));
    const writer = printer.slice(
      printer.indexOf('export function yieldTextWriter'),
      printer.indexOf('function shapeOf('),
    );
    expect(writer).toContain('slot.nodeValue = part.text');
  });

  /**
   * **The seat does not resize when the number lands.** One line-height in
   * pixels for both faces and a `min-height` equal to it, so the flourish and
   * the figure occupy identical boxes and the reveal moves nothing below it.
   */
  it('gives the flourish and the figure the same box', () => {
    const block = STYLE.slice(STYLE.indexOf('.card-stamp {'), STYLE.indexOf('.card-stamp-flourish'));
    const height = /min-height: (\d+)px/.exec(block)?.[1];
    const leading = /line-height: (\d+)px/.exec(block)?.[1];
    expect(height).toBeDefined();
    expect(leading).toBe(height);
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
    //
    // The anchor was `.card-stamp-figure.is-tick` until batch H4 cut that rule
    // (nothing ever set the class); it is now the stamp's landing keyframe,
    // which is declared once, immediately above the block that switches it off.
    const at = STYLE.indexOf(
      '@media (prefers-reduced-motion: reduce)',
      STYLE.indexOf('@keyframes stamp-land'),
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
    // The signature wraps since the reroll control joined it (batch C1), so the
    // slice starts at the name rather than at the first parameter.
    const show = OFFER.slice(OFFER.indexOf('function show('), OFFER.indexOf('const sheet = element('));
    expect(show).toContain('exitTimer');
  });
});

describe('the bench and the offices', () => {
  const SCREEN = source('statecraftScreen.ts');

  /**
   * A held card wears the flourish and costs nothing to draw; a card the law
   * holds in an office reads its figure; a card laid in an office this session
   * wears the pending mark and is not weighed at all. The asymmetry is
   * deliberate — see `stampFor` and the reveal ruling.
   */
  it('weighs only the cards the law already holds in an office', () => {
    const collection = SCREEN.slice(
      SCREEN.indexOf('function drawCollection('),
      SCREEN.indexOf('function draw()'),
    );
    expect(collection).toContain('cardStampNode()');
    // The reading is inside the in-force branch and nowhere else.
    // A card is named by its id alone since the levelling ruling of 2026-09-04.
    const inForce = collection.slice(collection.indexOf('} else if (inForce.has(id)) {'));
    expect(inForce).toContain("stampFor(state, seat, { kind: 'order', id })");
    expect(
      collection.slice(0, collection.indexOf('} else if (inForce.has(id)) {')),
    ).not.toContain('stampFor(');
  });

  /**
   * **Confirm plays the count, and nothing else does** — the reveal ruling
   * (`docs/history/fewer-things.md` §1 "The reveal", RULED 2026-09-06, the user's own
   * words: *"aggregate yields fire after hitting confirm"*).
   *
   * The three halves of it that can be quietly broken: the list is armed by the
   * commit rather than by the drop, it is spent by the draw that plays it, and a
   * card in force that was not part of the signature arrives landed.
   */
  it('plays the count for the cards Confirm just made law, and lands the rest', () => {
    expect(SCREEN).toContain(
      'if (justConfirmed.includes(id)) counting.push(playCardStamp(stamp, reading));',
    );
    expect(SCREEN).toContain('else landCardStamp(stamp, reading);');
    // Armed by the signature — `commitStaging` answers the guest list — and spent
    // by the draw that plays it.
    expect(SCREEN).toContain('justConfirmed = commitStaging();');
    expect(SCREEN).toContain('justConfirmed = [];');
    // And the gesture that lays a card down arms nothing at all.
    const drop = code(
      SCREEN.slice(
        SCREEN.indexOf('function drop(index: number)'),
        SCREEN.indexOf('function drawGovernment('),
      ),
    );
    expect(drop).not.toContain('playCardStamp');
    expect(drop).not.toContain('justConfirmed =');
  });

  /**
   * **A newly slotted card shows no figure.** The unconfirmed branch calls the
   * one writer that takes no reading (`pendCardStamp`), so there is no number in
   * scope for it to print, and neither of the two writers that do take one is
   * reachable from it.
   */
  it('prints the pending mark, and no figure, on an unconfirmed office', () => {
    const collection = SCREEN.slice(
      SCREEN.indexOf('function drawCollection('),
      SCREEN.indexOf('function draw()'),
    );
    const pending = code(
      collection.slice(
        collection.indexOf('if (pending.has(id)) {'),
        collection.indexOf('} else if (inForce.has(id)) {'),
      ),
    );
    expect(pending.length).toBeGreaterThan(40);
    expect(pending).toContain('pendCardStamp(stamp)');
    expect(pending).not.toContain('landCardStamp');
    expect(pending).not.toContain('playCardStamp');
    expect(pending).not.toContain('stampFor(');
    // The two halves of "in a slot" are told apart by the staging's own flag,
    // never by a second opinion about what the law says.
    expect(collection).toContain('(entry.staged ? pending : inForce).add(entry.card)');
  });

  /**
   * The **aggregate** band: the ceremony's own figure, counted up on Confirm and
   * standing at rest otherwise, read from the Ledger's deck slice so the two
   * surfaces cannot disagree.
   */
  it('fires the aggregate on Confirm, from the Ledger’s own reading', () => {
    const band = SCREEN.slice(
      SCREEN.indexOf('function drawAggregate('),
      SCREEN.indexOf('function drawCommit('),
    );
    expect(band).toContain('deckAggregate(state, seat)');
    expect(band).toContain('if (justConfirmed.length > 0) counting.push(playCardStamp(stamp, reading));');
    expect(band).toContain('else landCardStamp(stamp, reading);');
    // One source for the figure, and it is the Ledger's.
    expect(SCREEN).toContain("from './ledgerScreen'");
  });

  /**
   * **Rearranging is a placement like any other.** A card in an office is picked
   * up through the same staging verbs a benched card is placed with, and the
   * refusal is `removeError`'s — which is how the seal rules survive a gesture
   * that did not exist before.
   */
  it('lifts a slotted card through the staging’s own remove', () => {
    const lift = SCREEN.slice(
      SCREEN.indexOf('function lift(id: OrderId)'),
      SCREEN.indexOf('function drop(index: number)'),
    );
    expect(lift).toContain('removeError(state, seat, arrangement, index)');
    expect(lift).toContain('options.onRefuse?.(problem)');
    expect(lift).toContain('staged = remove(arrangement, index)');
    expect(lift).toContain('held = id');
    // Both branches of "in a slot" offer the gesture, and neither disables the
    // face any more.
    const collection = SCREEN.slice(
      SCREEN.indexOf('function drawCollection('),
      SCREEN.indexOf('function draw()'),
    );
    expect(collection.match(/lift\(id\)/g) ?? []).toHaveLength(2);
    expect(collection).not.toContain('button.disabled = true');
  });
});

/**
 * The Doctrines' shelf (`docs/flags.md` note 6, 2026-09-05: "doctrines that give
 * yields should also give an indicator of the yields they're supplying").
 *
 * An adopted Doctrine is permanently in force, so its face wears the standing
 * stamp exactly as an Order in an office does. The three things that could be
 * quietly wrong on every Doctrine at once are pinned here: that the seat is
 * built at all, that the reading is `explainCardImpact`'s for the **doctrine**
 * subject rather than borrowed from some other card class, and that it arrives
 * *landed* — a permanent card's ceremony was adoption day, and a screen that
 * replayed the count-up on every open would celebrate a decision made an age
 * ago.
 */
describe('the doctrines wear the stamp', () => {
  const SCREEN = source('statecraftScreen.ts');
  const DOCTRINES = SCREEN.slice(
    SCREEN.indexOf('function drawDoctrines('),
    SCREEN.indexOf('function drawCollection('),
  );

  it('finds the shelf, so the sweep is not vacuous', () => {
    expect(DOCTRINES.length).toBeGreaterThan(200);
    expect(DOCTRINES).toContain('sc-card-doctrine');
  });

  /** The same seat the hand's cards keep — one card shape, not two. */
  it('builds the stamp on every adopted doctrine\'s face', () => {
    expect(DOCTRINES).toContain('cardStampNode()');
    expect(DOCTRINES).toContain('card.append(stamp)');
  });

  /** The reading is the doctrine's own, through the one evaluator. */
  it('reads it from explainCardImpact for the doctrine id', () => {
    expect(DOCTRINES).toContain("stampFor(state, seat, { kind: 'doctrine', id })");
    // And `stampFor` is the one adapter both classes go through — nothing on
    // this screen asks `explainCardImpact` a second way.
    expect(code(SCREEN).match(/explainCardImpact\(/g) ?? []).toHaveLength(1);
  });

  /** Landed, never played: the count-up belongs to the adoption moment. */
  it('lands the figure rather than replaying the ceremony on open', () => {
    expect(DOCTRINES).toContain('landCardStamp(stamp, reading)');
    expect(DOCTRINES).not.toContain('playCardStamp');
  });

  /**
   * A doctrine with no yield-shaped effect keeps the flourish. `stampFor`
   * answers `null` for an empty reading and the draw simply does not write into
   * the seat — which leaves `cardStampNode`'s own `data-face='flourish'`
   * standing, the same thing a benched Order shows.
   */
  it('leaves the flourish standing when the reading is empty', () => {
    expect(code(DOCTRINES)).toContain('if (reading) landCardStamp(stamp, reading);');
    expect(SCREEN).toContain('return stampIsEmpty(reading) ? null : reading;');
    // The seat's default face, and the mark it wears there.
    const stampSource = code(source('cardStamp.ts'));
    expect(stampSource).toContain("stamp.dataset.face = 'flourish'");
    expect(stampSource).toContain('flourish.textContent = STAMP_FLOURISH');
    expect(STAMP_FLOURISH).toBe('— · ✶ · —');
  });

  /**
   * The stamp is a mark on paper wherever it lands, so the compact rule the
   * hand's cards keep has to reach the doctrine shelf too — both are `.sc-card`,
   * and the one block that quiets the mark is written on the class rather than
   * on the collection's grid.
   */
  it('is quieted by the same compact rule the hand\'s cards keep', () => {
    expect(STYLE).toContain('.sc-card .card-stamp {');
    expect(STYLE).not.toContain('.sc-card-order .card-stamp {');
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
