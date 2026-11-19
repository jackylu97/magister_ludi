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

  /**
   * Digits and the words beside them share one baseline; the row wraps
   * **between** figures and never through one (the user, 2026-09-07: a deck
   * paying five or six voices ran past the card's edge under `nowrap`).
   */
  it('keeps each figure on one baseline and one line, and lets the row wrap between them', () => {
    const block = STYLE.slice(STYLE.indexOf('.card-stamp {'), STYLE.indexOf('.card-stamp-flourish'));
    expect(block).toContain('align-items: baseline');
    expect(block).toContain('flex-wrap: wrap');
    const figure = STYLE.slice(
      STYLE.indexOf('.card-stamp-figure {'),
      STYLE.indexOf('.card-stamp-occasion {'),
    );
    expect(figure).toContain('white-space: nowrap');
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
    // No surface in the interface prints the rejected wording.
    for (const [path, text] of Object.entries(SOURCES)) {
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
    // The query is `ui/motion.ts`'s since batch H5 folded eight copies of it
    // into one; what this module must show is that it asks the shared reader.
    expect(module).toContain("import { wantsMotion } from './motion';");
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
    // Since batch C1 the card's body is built in one place for both faces
    // (`faceBody`, beside the A3 card's `suitHandCard`), and `face` only deals
    // the card it is handed. Neither may write a figure.
    const body = OFFER.slice(
      OFFER.indexOf('function faceBody('),
      OFFER.indexOf('export function createOfferCard('),
    );
    const face = OFFER.slice(OFFER.indexOf('function face('), OFFER.indexOf('const layout = orderOfferLayout'));
    expect(body).toContain('cardStampNode()');
    for (const part of [body, face]) {
      expect(part).not.toContain('playCardStamp');
      expect(part).not.toContain('landCardStamp');
      expect(part).not.toContain('stampText');
    }
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

describe('the table and its chairs', () => {
  const SCREEN = source('statecraftScreen.ts');
  const LIVE = source('orderLive.ts');
  const TABLE = SCREEN.slice(SCREEN.indexOf('function drawTable('), SCREEN.indexOf('// --- the hand'));

  /**
   * The orders screen (batch SS10, part 2) asks a card's figure only of a card
   * the law already holds in a chair. A card played this visit wears the
   * staged line and is not weighed at all, and the hand is never weighed. The
   * asymmetry is the reveal ruling's, and it is also what keeps the draw cheap.
   */
  it('weighs only the cards the law already holds in a chair', () => {
    // Stage 2: the plate is the card's share of the council's figures, taken once a draw.
    expect(TABLE).toContain(
      'const reading: CardLive = filled.staged ? stagedLive() : seatedOrderLive(state, seat, id, sheet, council ?? undefined);',
    );
    const hand = SCREEN.slice(SCREEN.indexOf('function drawHand('), SCREEN.indexOf('function layFan('));
    expect(hand.length).toBeGreaterThan(200);
    expect(hand).not.toContain('seatedOrderLive(');
    expect(hand).not.toContain('explainCardImpact');
  });

  /**
   * **One reading of the real board per draw** (`cardImpactSheet`, batch H18).
   * Taken in `draw`, handed to every card's reading, and let go in a `finally`,
   * because the reducer mutates `GameState` in place.
   */
  it('takes one shared reading of the board per draw, and lets go of it', () => {
    expect(SCREEN).toContain('cardImpactSheet(options.getState(), options.getPlayerId())');
    expect(LIVE).toContain("explainCardImpact(state, seat, { kind: 'order', id }, sheet)");
    const draw = SCREEN.slice(SCREEN.indexOf('function draw(): void {'));
    expect(draw.slice(0, draw.indexOf('function paint('))).toContain('sheet = null;');
    // The Faith sheet keeps the same bargain, one screen over.
    const votive = source('religionScreen.ts');
    expect(votive).toContain('cardImpactSheet(options.getState(), options.getPlayerId())');
    expect(votive.slice(votive.indexOf('function draw(): void {'))).toContain('sheet = null;');
  });

  /**
   * **Confirm counts the figures up, and nothing else does** (the reveal
   * ruling, `docs/history/fewer-things.md` §1, RULED 2026-09-06). The list is
   * armed by the commit, spent by the draw that plays it, and the gesture that
   * plays a card into a chair arms nothing.
   */
  it('counts up the cards Confirm just made law, and only those', () => {
    expect(TABLE).toContain('if (justConfirmed.includes(id)) {');
    // The Council screen (stage 1): the figure is the card's pay plate.
    expect(TABLE).toContain("counting.push(countUp([...face.querySelectorAll('.of-pay-fig b')]));");
    expect(SCREEN).toContain('justConfirmed = commitStaging();');
    expect(SCREEN).toContain('justConfirmed = [];');
    const drop = code(SCREEN.slice(SCREEN.indexOf('function drop(index: number,'), SCREEN.indexOf('function confirmStaging(')));
    expect(drop.length).toBeGreaterThan(200);
    expect(drop).not.toContain('countUp');
    expect(drop).not.toContain('justConfirmed =');
  });

  /**
   * **A card played this visit shows no figure.** Its reading takes no state at
   * all, so there is no number in scope for it to print: no tablet, and the
   * board's "awaits your seal: on Confirm" in the colophon.
   */
  it('prints the staged line, and no figure, on an unconfirmed chair', () => {
    const staged = code(LIVE.slice(LIVE.indexOf('export function stagedLive('), LIVE.indexOf('export function seatedOrderLive(')));
    expect(staged).toContain('LIVE_WORDS.staged');
    expect(staged).toContain('tablet: null');
    expect(staged).not.toContain('explainCardImpact');
    expect(staged).not.toContain('stampReading');
    expect(LIVE).toContain("staged: 'awaits your seal: on Confirm'");
    // Staged and in force are told apart by the staging's own flag.
    expect(TABLE).toContain('filled.staged ? stagedLive()');
  });

  /**
   * The head's total: counted up on Confirm and standing at rest otherwise,
   * read from the Ledger's deck slice so the two surfaces cannot disagree. It
   * is never a sum of the cards' own lines (rule 5).
   */
  it('counts the head’s total up on Confirm, from the council’s own reading', () => {
    const head = SCREEN.slice(SCREEN.indexOf('function paintHead('), SCREEN.indexOf('// --- the register'));
    // Stage 2: the totals are the fold of the whole council's impact list, the
    // reading every plate and chip on the screen is a share or a difference of.
    expect(head).toContain('const figures = councilFigures(exact);');
    expect(SCREEN).toContain('council = foldImpactVoices(explainCouncil(sheet.state, sheet.playerId, sheet));');
    // The Council screen (stage 1): the head's figures are the totals line.
    expect(head).toContain("if (countTotal) counting.push(countUp([...totalsNode.querySelectorAll('.council-total-fig b')]));");
    expect(SCREEN).toContain('countTotal = justConfirmed.length > 0;');
  });

  /**
   * **Moving a card is a placement like any other.** A card in a chair is
   * picked up through the staging's own `remove`, and the refusal is
   * `removeError`'s, which is how the seal rules survive the gesture.
   */
  it('lifts a seated card through the staging’s own remove', () => {
    const lift = SCREEN.slice(SCREEN.indexOf('function lift(index: number,'), SCREEN.indexOf('function putBack('));
    expect(lift).toContain('removeError(ctx.state, ctx.seat, ctx.arrangement, index)');
    expect(lift).toContain('refuse(problem);');
    expect(lift).toContain('staged = remove(ctx.arrangement, index);');
    expect(lift).toContain('held = entry.card;');
  });
});

/**
 * The Doctrines in the gilt register (`docs/flags.md` note 6, 2026-09-05:
 * "doctrines that give yields should also give an indicator of the yields
 * they're supplying"). Each Doctrine carries a live plate from the same
 * reading the Orders use, for the doctrine subject, and it is never counted
 * up: a Doctrine's ceremony was adoption day.
 */
describe('the Doctrines carry their live line', () => {
  const SCREEN = source('statecraftScreen.ts');
  const LIVE = source('orderLive.ts');
  const REGISTER = SCREEN.slice(SCREEN.indexOf('function drawRegister('), SCREEN.indexOf('// --- the table'));

  it('finds the register, so the sweep is not vacuous', () => {
    expect(REGISTER.length).toBeGreaterThan(200);
    // The Council screen (stage 1): each Doctrine is tucked under the government.
    expect(REGISTER).toContain('tuckedDoctrineNode(');
  });

  it('builds the live plate on every adopted Doctrine', () => {
    expect(REGISTER).toContain('sc.doctrines.forEach((id, index) => {');
    expect(REGISTER).toContain('const live = isDoctrineId(id) ? doctrineLive(state, seat, id, sheet, council ?? undefined) : null;');
    expect(REGISTER).toContain('const strip = tuckedDoctrineNode(id, live?.plate ?? null);');
  });

  it('reads it from explainCardImpact for the doctrine id, in one module', () => {
    expect(LIVE).toContain("explainCardImpact(state, seat, { kind: 'doctrine', id }, sheet)");
    // Three since stage 2: the Order, the Doctrine and the government in force,
    // which the stamp now measures with its law set aside.
    expect(code(LIVE).match(/explainCardImpact\(/g) ?? []).toHaveLength(3);
    expect(LIVE).toContain("explainCardImpact(state, seat, { kind: 'government', id }, sheet)");
    expect(code(SCREEN)).not.toContain('explainCardImpact(');
  });

  it('lands the figure rather than counting it up on open', () => {
    expect(REGISTER).not.toContain('countUp');
  });

  /**
   * A Doctrine whose reading is empty says why: "+0 now" when it pays yields
   * and pays nothing this turn, "in force" when it is a rule.
   */
  it('says "+0 now" or "in force" when the reading is empty', () => {
    const empty = code(LIVE.slice(LIVE.indexOf('function liveOfStamp('), LIVE.indexOf('export function stagedLive(')));
    expect(empty).toContain('if (cardCanPay(card)) {');
    expect(empty).toContain('idleReasonWords(cardIdleReason(state, seat, card))');
    expect(empty).toContain("line: { kind: 'standing', text: LIVE_WORDS.rule }");
  });

  /** The stamp's compact rule in `style.css` still reaches the Faith sheet's cards. */
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
