/**
 * The two conventions every surface writes numbers by.
 *
 * `turnsLabel` is three lines and it is the reason this file exists: it is the
 * single point where `turnsToFill`'s honest `null` becomes something a player
 * reads, and the wrong answer there is an `Infinity` or a `NaN` on a build
 * button — a data error wearing the costume of a number. The glyph table is
 * asserted because it had been copied into three files before it was one, and
 * the copies are what this table exists to stop coming back.
 */

import { describe, expect, it } from 'vitest';
import { turnsToFill } from '../../src/sim/cities';
import type { MeterEffect } from '../../src/sim/meters';
import {
  BORDER_GLYPH,
  HAMMER,
  YIELD_GLYPH,
  effectFigure,
  figure,
  meterFigure,
  netFigure,
  poolFigure,
  signedFigure,
  signedMeterFigure,
  turnsLabel,
} from '../../src/ui/figures';
import { BEAKER } from '../../src/ui/researchProgress';

describe('turnsLabel', () => {
  it('prints a count in the "3t" the whole interface uses', () => {
    expect(turnsLabel(3)).toBe('3t');
    expect(turnsLabel(1)).toBe('1t');
  });

  it('prints an em dash, never an infinity, when the answer is unknowable', () => {
    // What a city making no hammers and an empire making no science both get.
    expect(turnsLabel(null)).toBe('—');
    expect(turnsLabel(turnsToFill(40, 0))).toBe('—');
    // The failure it exists to prevent, spelt out: this is what the arithmetic
    // would have printed on its own.
    expect(String(Math.ceil(40 / 0))).toBe('Infinity');
  });

  it('keeps zero as a number, because "already paid" is a real answer', () => {
    // The thing lands at the next resolution; it is not unknowable.
    expect(turnsLabel(0)).toBe('0t');
    expect(turnsLabel(turnsToFill(-5, 0))).toBe('0t');
  });
});

describe('the yield voices', () => {
  it('quotes production as the glyph a cost is written in', () => {
    expect(HAMMER).toBe(YIELD_GLYPH.production);
    expect(HAMMER).not.toBe('h');
  });

  it('is the one table the research card counts beakers from', () => {
    // `BEAKER` used to be its own literal in a second file. It is now this one.
    expect(BEAKER).toBe(YIELD_GLYPH.science);
  });

  it('gives every yield its own distinct voice', () => {
    const glyphs = Object.values(YIELD_GLYPH);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });

  it('marks territory with a voice of its own, not with a yield glyph', () => {
    // Border growth is not a yield — the same culture is banked twice and only
    // the half that buys ground answers to the writ — so its mark must not be
    // one of the six.
    expect(Object.values(YIELD_GLYPH)).not.toContain(BORDER_GLYPH);
  });
});

describe('poolFigure', () => {
  it('leads with the pool, the rate in parens — the gold chip’s treasury-first idiom', () => {
    // `Player.gold` first, because that is the figure a purchase is checked
    // against; the per-turn total — what every other yield chip shows on its
    // own — moves into parens beside it.
    expect(poolFigure(132, 4)).toBe('132 (+4)');
  });

  it('signs the rate but never plusses the pool', () => {
    // A stalled treasury wears no `+`; only the rate carries an explicit sign,
    // because only the rate is a contribution.
    expect(poolFigure(0, 0)).toBe('0 (0)');
    expect(poolFigure(50, -3)).toBe('50 (−3)');
    // **But a bank under water keeps its minus** (2026-09-06, with item z's
    // pass over the strip): `netFigure`, not `figure`. A treasury of −22 printed
    // as a magnitude reads as twenty-two coins in hand, which is the one thing
    // the chip must never say.
    expect(poolFigure(-22, -3)).toBe('−22 (−3)');
  });

  it('rounds to a whole figure in the house voice, true minus sign included', () => {
    // Whole since batch X (exact yields, the user 2026-09-06 — *"just don't show
    // this to the player"*): the pools carry fractions now, and `roundYield` is
    // the one place any of them becomes a number a player reads. The tenth lives
    // on in `meterFigure` — for the two meters' **ledgers**, and nothing else,
    // since item z took it off the strip (see the suite below).
    expect(poolFigure(12.34, 1.25)).toBe('12 (+1)');
    expect(signedFigure(-2.4)).toBe('−2');
    expect(signedMeterFigure(-2.4)).toBe('−2.4');
    expect(meterFigure(9.64)).toBe('9.6');
  });

  /**
   * Faith is the second yield to wear this idiom, and the cases it adds are the
   * ones gold cannot reach — which is the whole reason it is worth a suite of
   * its own rather than a second `expect` beside the treasury's.
   *
   * `Player.faithPool` spent a long time **accumulate-only** and the two shapes
   * that came of it are still the interesting ones: a chip that sits at exactly
   * nothing for the opening, and one that only climbs. Augurs spend it now
   * (ledger Entry XXVIII), so the pool can also *fall* — which the treasury
   * already covered above and which needs no case of its own here.
   */
  describe('the faith chip, the second pool to use it', () => {
    it('reads as a flat nothing before any city pays it', () => {
      // Turns one through however many: no temple, no luxury, no faith. It must
      // not print an em dash or a bare `0` — the parens are what say "and it is
      // not growing either", which is a different fact from "there is none".
      expect(poolFigure(0, 0)).toBe('0 (0)');
    });

    it('leads with what has been gathered once it is running', () => {
      // The pool is the figure worth reading: an augur is priced against the
      // total, so the number that means anything is the bank and the rate is
      // the aside — which is why this idiom leads with it.
      expect(poolFigure(12, 2)).toBe('12 (+2)');
    });

    it('banks a fraction into a whole-looking pool without lying about either', () => {
      // A luxury signature can pay a fractional share, so the pool drifts off
      // the integers in a way a treasury does not. Both halves round to a tenth
      // rather than one being floored to look tidy.
      // Both halves round the same way, and both round *whole* since batch X:
      // a half-beaker rate reads as one and a half-full pool reads as eight.
      expect(poolFigure(7.5, 0.5)).toBe('8 (+1)');
    });

    it('has no way to say a falling pool, and does not need one', () => {
      // Nothing spends faith today. `poolFigure` would print it correctly if
      // something did — this is the assertion that the idiom is ready rather
      // than the claim that the case is reachable, and it is why the day faith
      // gains a sink costs no change here.
      expect(poolFigure(40, -6)).toBe('40 (−6)');
    });
  });
});

/**
 * Which chips wear the pool idiom, asked of the top bar's source.
 *
 * The suite has no jsdom, so the chip itself cannot be rendered — but the claim
 * that matters is not "the string is right" (that is every test above), it is
 * **which yields get it**, and that is one register in `topBar.ts`. It was two
 * hand-rolled `key === 'gold'` comparisons before faith joined, which is exactly
 * how a second banked yield ends up reading differently from the first on two
 * surfaces out of three.
 */
describe('the banked yields', () => {
  const TOP_BAR = (
    import.meta.glob('../../src/ui/topBar.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>
  )['../../src/ui/topBar.ts']!;

  /** Source with its comments taken out — the rule is not the prose about it. */
  const code = TOP_BAR.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('names gold and faith, through their own pools', () => {
    expect(code).toContain('player.gold');
    expect(code).toContain('player.faithPool');
    expect(code).toContain('poolFigure(');
  });

  it('decides who is banked in one register, not at each site', () => {
    // The three readers — the chip's figure, its title, the card's leading row.
    const uses = code.match(/BANKED\[/g) ?? [];
    expect(uses.length).toBeGreaterThanOrEqual(3);
    // And no site re-asks the question by hand. This is the assertion that
    // would have caught faith being added to the chip and forgotten on the card.
    expect(code).not.toContain("key === 'gold'");
    expect(code).not.toContain("key === 'faith'");
  });
});

/**
 * `netFigure` — the voice of a quantity that may honestly be negative.
 *
 * The third printer, and the reason it is not `figure` is one word: `figure` is
 * a **magnitude**. A caller quoting a cost or a strength has already decided the
 * sign is not part of the number; the top bar's chips have decided no such
 * thing, and a starving empire's food rate or an empire in debt is exactly the
 * case they have to print honestly.
 */
describe('netFigure', () => {
  it('rounds whole, keeps a true minus, and never wears a plus', () => {
    expect(netFigure(2.4)).toBe('2');
    expect(netFigure(2.5)).toBe('3');
    expect(netFigure(0)).toBe('0');
    expect(netFigure(-2.4)).toBe('−2');
    expect(netFigure(-2.5)).toBe('−3');
    // Never `+2`, and never `−0`.
    expect(netFigure(2)).toBe('2');
    expect(netFigure(-0.4)).toBe('0');
  });

  it('is the honest half of the pair `figure` gives up', () => {
    // The bug it exists to prevent, spelt out: the magnitude printer says a
    // loss and a gain with the same characters.
    expect(figure(-6)).toBe(figure(6));
    expect(netFigure(-6)).not.toBe(netFigure(6));
  });

  it('keeps the house abbreviation past three digits', () => {
    expect(netFigure(-22_000)).toBe('−22k');
    expect(netFigure(1_500)).toBe('1.5k');
  });
});

/**
 * **Every figure in the top bar is whole** — the user, 2026-09-06
 * (`docs/flags.md`, rulings "late — early production", item z: "every figure in
 * the top bar rounds to the nearest integer for display — the yield chips and
 * both meters; the underlying fold keeps the full decimal").
 *
 * Two things had to move for that and both are asserted here rather than
 * assumed, because neither can be rendered in this suite (no jsdom):
 *
 *   the six chips  printed `String(totals[key])` — the raw exact fold, which
 *                  after batch X is a number like `2.6666666666666665`. They go
 *                  through `netFigure` and `poolFigure` now.
 *   the two meters printed `signedMeterFigure`, which keeps a tenth. They go
 *                  through `signedFigure` with everything else on the strip.
 *
 * The tenth is **not deleted** — `signedMeterFigure` and `meterFigure` still
 * keep it, and are still asserted above. What the ruling withdrew is the tenth
 * *on the strip*; the meters' hover cards, their click-through ledgers and the
 * authority card's capacity headline still print through the pair, because that
 * is where the argument for the tenth lives (a fraction is worth seeing against
 * a rung, and a ledger is where a player counts). See `signedMeterFigure`.
 */
describe('the top bar prints whole figures', () => {
  const TOP_BAR = (
    import.meta.glob('../../src/ui/topBar.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>
  )['../../src/ui/topBar.ts']!;

  /** Source with its comments taken out — the rule is not the prose about it. */
  const code = TOP_BAR.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('sends every yield chip through a printer, never a raw fold', () => {
    expect(code).toContain('netFigure(totals[key])');
    expect(code).not.toContain('String(totals[key])');
  });

  it('rounds both meter chips whole', () => {
    // `writeChip` is the one place a meter's figure reaches the strip, and both
    // calls hand it the yields' printer.
    const chips = code.match(/writeChip\(\s*\w+Chip,\s*(\w+)\(/g) ?? [];
    expect(chips).toHaveLength(2);
    for (const call of chips) expect(call).toContain('signedFigure(');
  });

  it('leaves the tenth in the cards, which is where its argument lives', () => {
    // Not "the tenth is gone": the ledger lines, the group subtotals, the
    // card headlines and the authority card's capacity pair all still keep it.
    expect(code).toContain('signedMeterFigure(');
    expect(code).toContain('meterFigure(');
  });
});

describe('an empire modifier as a figure', () => {
  function effect(partial: Partial<MeterEffect>): MeterEffect {
    return {
      meter: 'authority',
      value: 6,
      percent: 10,
      yields: [],
      growth: false,
      borders: false,
      ...partial,
    };
  }

  it('names every channel it touches, borders included', () => {
    // A solvent writ builds *and* claims, and the chip says both on one line.
    const writ = effectFigure(effect({ yields: ['production'], borders: true }));
    expect(writ).toContain(YIELD_GLYPH.production);
    expect(writ).toContain(BORDER_GLYPH);
    expect(writ).toContain('+10%');
  });

  it('gives the freeze the boundary stone and nothing else', () => {
    const frozen = effectFigure(effect({ percent: -100, borders: true }));
    expect(frozen).toBe(`${BORDER_GLYPH} −100%`);
  });
});

describe('the three-digit abbreviation (user, 2026-08-30)', () => {
  it('leaves everything under a thousand alone, tenths included', () => {
    expect(figure(999)).toBe('999');
    // Whole since batch X — the abbreviation's own tenth (`1.5k`) is a scale
    // and survives; a fraction of a point is not shown at all.
    expect(figure(2.4)).toBe('2');
  });
  it('reads thousands as k and millions as M, one decimal while single-digit', () => {
    expect(figure(1000)).toBe('1k');
    expect(figure(1500)).toBe('1.5k');
    expect(figure(15300)).toBe('15k');
    expect(figure(234_000)).toBe('234k');
    expect(figure(1_000_000)).toBe('1M');
    expect(figure(2_400_000)).toBe('2.4M');
  });
  it('keeps the sign outside the abbreviation', () => {
    expect(signedFigure(-1500)).toBe('−1.5k');
    expect(signedFigure(1_000_000)).toBe('+1M');
  });
});
