/**
 * **Every yield printer goes through the one formatter** — batch X's surface
 * half, pinned by reading the sources.
 *
 * The ruling (the user, 2026-09-06) is two sentences and this file is the
 * second: *"yields be valid as decimals … just don't show this to the player"*.
 * The simulation now carries fractions everywhere, so the obligation that fell
 * out of it is that **no surface may print one** — and that obligation is not
 * something a behavioural test can hold, because the failure mode is a *new*
 * call site somewhere in forty files composing `${value}` into a string.
 *
 * So it is read out of the source, in two claims:
 *
 *   1. the interface has exactly **two** number printers — `figure` and
 *      `signedFigure` in `src/ui/figures.ts` — and both of them round through
 *      `roundYield` (`src/sim/yieldFormat.ts`), which is also what the sim's own
 *      describers use, so a card's printed clause and the chip above it round
 *      the same way;
 *   2. every surface that composes a yield **itself**, rather than through those
 *      two, names `roundYield` / `signedYield` — the register below is that list,
 *      and a new one joins it in the pass that ships it.
 *
 * The two **meters** are deliberately outside all of this: happiness and
 * authority are ledgers compared against tier rungs rather than yields that are
 * spent, they carry genuinely fractional lines (a card's percentage off what a
 * citizen demands, a court's share of a town's demand), and their *ledgers*
 * print through `meterFigure` / `signedMeterFigure`, which keep the tenth. That
 * split is the third claim below, so nobody "tidies" the two pairs back into one.
 *
 * **Their chips do not** (the user, 2026-09-06, `docs/flags.md` item z: "every
 * figure in the top bar rounds to the nearest integer for display — the yield
 * chips and both meters"). The pair below is unchanged and still asserted; what
 * moved is the call site, and that half is pinned in `figures.test.ts`'s "the
 * top bar prints whole figures".
 */

import { describe, expect, it } from 'vitest';

import { figure, meterFigure, signedFigure, signedMeterFigure } from '../../src/ui/figures';
import { roundYield, signedYield } from '../../src/sim/yieldFormat';

/**
 * The sources, through Vite's raw glob rather than `node:fs` — this project has
 * no node typings and a source assertion is not worth a dependency.
 */
const SOURCE = {
  ...(import.meta.glob('../../src/ui/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>),
  ...(import.meta.glob(['../../src/sim/*.ts', '../../src/sim/*/*.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>),
  ...(import.meta.glob('../../src/spectate/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>),
};

const read = (path: string): string => {
  const key = Object.keys(SOURCE).find((entry) => entry.endsWith(path.slice(path.indexOf('src/') + 3)));
  expect(key, `${path} readable`).toBeDefined();
  return SOURCE[key!]!;
};

describe('the house printers round through the sim’s one rule', () => {
  it('rounds a figure whole, through roundYield and nothing else', () => {
    const source = read('src/ui/figures.ts');
    expect(source).toContain("import { roundYield } from '../sim/yieldFormat';");
    expect(source).toContain('return compact(Math.abs(roundYield(value)));');
    expect(source).toContain('const rounded = roundYield(value);');

    for (const value of [2.4, 2.5, -2.4, -2.5, 0.4, 7]) {
      expect(figure(value)).toBe(String(Math.abs(roundYield(value))));
    }
    expect(signedFigure(2.4)).toBe(signedYield(2.4));
    expect(signedFigure(-2.6)).toBe(signedYield(-2.6));
  });

  it('keeps the two meters’ ledgers on their own printer, at a tenth', () => {
    expect(meterFigure(9.64)).toBe('9.6');
    expect(signedMeterFigure(-2.44)).toBe('−2.4');
    // And they are a different answer from the yields' printer, which is the
    // whole reason the pair exists.
    expect(signedMeterFigure(-2.44)).not.toBe(signedFigure(-2.44));
  });
});

/**
 * The surfaces that compose a figure themselves.
 *
 * Each entry is a file that writes a yield into a string without going through
 * `figure` / `signedFigure` — a chip's own `${value}${glyph}`, a rail's
 * `${surplus} food`, a stamp's counted digits — and each one must therefore name
 * the rounding rule directly. The list is the register: a surface that starts
 * printing a yield joins it in the pass that ships it, exactly as a new visual
 * asset joins `flair.html`.
 */
const COMPOSERS: readonly { path: string; what: string }[] = [
  { path: 'src/ui/cityPanel.ts', what: 'the town rail: preview, specialist, building, route and luxury figures; the growth, border and production meters' },
  { path: 'src/ui/tileReadout.ts', what: 'the hex readout: the six chips and the itemised breakdown' },
  { path: 'src/ui/cardStamp.ts', what: 'the stamp: the digits a card counts up onto its face' },
  { path: 'src/ui/tradeLines.ts', what: 'a plunder’s spoils sentence' },
  { path: 'src/ui/controls.ts', what: 'the toasts: a raid, a camp’s bounty, a beaten wonder’s refund, a great person’s act, a chop, a survey' },
  { path: 'src/ui/statecraftScreen.ts', what: 'the culture ladder’s banked figure' },
  { path: 'src/ui/religionScreen.ts', what: 'the pressure ledger’s signed lines, and a follower belief’s trickle' },
  { path: 'src/ui/techTree.ts', what: 'a node’s gifts: a renewal’s tile delta' },
  { path: 'src/spectate/main.ts', what: 'the spectator’s seat line: the treasury and the faith pool' },
];

describe('every surface that composes a figure itself names the rule', () => {
  it('imports roundYield or signedYield, file by file', () => {
    for (const { path, what } of COMPOSERS) {
      const source = read(path);
      const names = /import \{[^}]*\b(roundYield|signedYield)\b[^}]*\} from '[^']*yieldFormat';/.test(
        source,
      );
      expect(names, `${path} — ${what}`).toBe(true);
    }
  });

  /**
   * And the sim's own describers, which compose player-facing prose out of card
   * and luxury figures. They keep the ASCII hyphen their ratified wording uses —
   * the true minus is the *interface's* rule — but they round through the same
   * function, so no clause can print `+1.5 science`.
   *
   * That hyphenated voice was written out three times (`statecraft.ts`,
   * `resourceEffects.ts`, and the Religion screen's pressure ledger) until batch
   * H5 folded it into `signedPlain`, beside `signedYield` in the one rounding
   * file. So what is pinned now is that each describer *asks* for it rather than
   * keeping a fourth copy of `roundYield` plus a sign test.
   */
  it('rounds the sim’s describers through the same function', () => {
    for (const path of [
      // The words' own file since batch E3b split `statecraft.ts` by layer.
      'src/sim/statecraft/describers.ts',
      'src/sim/resourceEffects.ts',
      'src/ui/religionScreen.ts',
    ]) {
      const source = read(path);
      expect(source, path).toMatch(
        /import \{[^}]*\bsignedPlain as signed\b[^}]*\} from '[^']*yieldFormat';/,
      );
      expect(source, path).not.toContain('function signed(');
    }
    // And the one definition rounds, exactly as the three copies did.
    const format = read('src/sim/yieldFormat.ts');
    expect(format).toContain('export function signedPlain(value: number): string {');
    expect(format).toContain('const rounded = roundYield(value);');
  });
});
