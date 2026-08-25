/**
 * The yield printer's pure half: where the marks fall in a composed figure, and
 * which way each one faces.
 *
 * `splitYieldText` was split out of `yieldTextNodes` so that this could be asked
 * at all — the suite has no jsdom, as with every other UI pass — and because it
 * is the part that can be quietly wrong on every surface at once. The DOM half
 * is three lines that turn a part into a node.
 *
 * The other claim here is the one the whole pass was for: **no visible yield
 * emoji in the HUD**. That is checked by reading the interface's own source and
 * insisting every glyph that reaches a user goes through the printer — which is
 * a fact about the code, so it is asked of the code, exactly as
 * `test/ui/seatRoster.test.ts` asks its question.
 */

import { describe, expect, it } from 'vitest';

import { YIELD_GLYPH, type YieldKey } from '../../src/ui/figures';
import { hasYieldGlyph, splitYieldText } from '../../src/ui/yieldMark';

/** Just the marks of a split, in order: what was drawn and which way it faced. */
function marks(text: string): { key: YieldKey; lead: boolean }[] {
  return splitYieldText(text).flatMap((part) =>
    part.kind === 'mark' ? [{ key: part.key, lead: part.lead }] : [],
  );
}

/** Just the text of a split, rejoined: what a reader still sees as characters. */
function words(text: string): string {
  return splitYieldText(text)
    .flatMap((part) => (part.kind === 'text' ? [part.text] : []))
    .join('');
}

describe('splitYieldText', () => {
  it('leaves a string with no yield glyph in it entirely alone', () => {
    const plain = 'Granary · 4t · needs population 3';
    expect(splitYieldText(plain)).toEqual([{ kind: 'text', text: plain }]);
    expect(hasYieldGlyph(plain)).toBe(false);
  });

  it('finds every one of the six', () => {
    for (const key of Object.keys(YIELD_GLYPH) as YieldKey[]) {
      const composed = `40${YIELD_GLYPH[key]}`;
      expect(hasYieldGlyph(composed)).toBe(true);
      expect(marks(composed)).toEqual([{ key, lead: false }]);
      expect(words(composed)).toBe('40');
    }
  });

  /**
   * The whole of the placement rule, in the four shapes this interface writes.
   * A mark leads when the character after it is a space — a rule about the
   * sentence rather than a flag every call site has to remember, which is what
   * lets forty composition sites stay exactly as they were.
   */
  describe('the lead rule', () => {
    it('trails a quantity: `40⚙` is a unit on a number', () => {
      expect(marks(`40${YIELD_GLYPH.production}`)).toEqual([
        { key: 'production', lead: false },
      ]);
    });

    it('still trails when something that is not a space follows: `+1🔬/pop`', () => {
      expect(marks(`+1${YIELD_GLYPH.science}/pop`)).toEqual([
        { key: 'science', lead: false },
      ]);
      expect(words(`+1${YIELD_GLYPH.science}/pop`)).toBe('+1/pop');
    });

    it('leads a modifier: `⚙ +25%` names what is being modified', () => {
      expect(marks(`${YIELD_GLYPH.production} +25%`)).toEqual([
        { key: 'production', lead: true },
      ]);
    });

    it('tightens a run and gives only the last mark the gap', () => {
      // `⚙🔬🎭 −10%` — a meter effect names every voice it touches, so the row
      // is a list of marks and only the one against the figure takes the air.
      const run = `${YIELD_GLYPH.production}${YIELD_GLYPH.science}${YIELD_GLYPH.culture} −10%`;
      expect(marks(run)).toEqual([
        { key: 'production', lead: false },
        { key: 'science', lead: false },
        { key: 'culture', lead: true },
      ]);
      expect(words(run)).toBe(' −10%');
    });
  });

  /**
   * Four of the six glyphs are surrogate pairs. A loop over `text[i]` rather
   * than over code points would split them into halves that match nothing and
   * print as tofu — and it would do it to food, gold, science and culture while
   * leaving production and faith looking fine, which is the worst possible way
   * for it to fail.
   */
  it('walks by code point, so the surrogate-pair glyphs survive', () => {
    for (const key of ['food', 'gold', 'science', 'culture'] as YieldKey[]) {
      expect(YIELD_GLYPH[key].length).toBe(2); // two UTF-16 units, one character
      const composed = `Granary +3${YIELD_GLYPH[key]} every turn`;
      expect(marks(composed)).toEqual([{ key, lead: true }]);
      // Nothing of the glyph is left behind in the text runs — half a surrogate
      // pair is what tofu is made of.
      expect(words(composed)).toBe('Granary +3 every turn');
      expect(hasYieldGlyph(words(composed))).toBe(false);
    }
  });

  it('keeps every other character, glyphs of other kinds included', () => {
    // The boundary stone is not a yield (see `BORDER_GLYPH`) and a tech's own
    // glyph is mostly not one either: both must come through as text.
    const line = `⛫ +10% · 📜 · ${YIELD_GLYPH.culture} +5%`;
    expect(words(line)).toBe('⛫ +10% · 📜 ·  +5%');
    expect(marks(line)).toEqual([{ key: 'culture', lead: true }]);
  });

  it('never leaves a yield glyph in the text it hands back', () => {
    const composed = [
      `${YIELD_GLYPH.food}${YIELD_GLYPH.production}${YIELD_GLYPH.gold}`,
      `9${YIELD_GLYPH.production} · 4t`,
      `${YIELD_GLYPH.science} +20%  ${YIELD_GLYPH.production} +25%`,
      `230/250 ${YIELD_GLYPH.science} · 3t`,
      `+20${YIELD_GLYPH.production} → Uruk · completes Granary!`,
    ];
    for (const text of composed) {
      expect(hasYieldGlyph(words(text))).toBe(false);
      // And nothing was lost: the parts rejoin to the original, mark for glyph.
      const rebuilt = splitYieldText(text)
        .map((part) => (part.kind === 'text' ? part.text : YIELD_GLYPH[part.key]))
        .join('');
      expect(rebuilt).toBe(text);
    }
  });

  it('handles the degenerate strings without inventing a part', () => {
    expect(splitYieldText('')).toEqual([]);
    expect(splitYieldText(YIELD_GLYPH.faith)).toEqual([
      { kind: 'mark', key: 'faith', lead: false },
    ]);
    expect(splitYieldText(`${YIELD_GLYPH.faith} `)).toEqual([
      { kind: 'mark', key: 'faith', lead: true },
      { kind: 'text', text: ' ' },
    ]);
  });
});

/**
 * The interface's own text, read the way `test/ui/seatRoster.test.ts` reads it:
 * through Vite's raw glob rather than `node:fs`, because this project has no
 * node typings and a source assertion is not worth a dependency.
 */
const UI_SOURCE = {
  ...(import.meta.glob('../../src/ui/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../../src/main.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
};

/** One file's source with its comments taken out — the rule is not the prose. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * The claim the whole pass was for, held where it can actually be held.
 *
 * A yield emoji reaches a reader in exactly one way: a *composed string* is put
 * into the DOM without going through the printer. Every surface that composes
 * one now writes through `setYieldText` — either directly, or through its
 * panel's own `element()` builder, which is the one-line seam that retired the
 * emoji from the city panel and the star chart wholesale. So the sweep is: a
 * module that composes with `YIELD_GLYPH` must also import the printer.
 *
 * `figures.ts` is the exemption and the reason for it is the point of the split:
 * it is where the glyphs are *declared*, and it composes for the surfaces that
 * stay text on purpose (an `aria-label`, a `title`, a log record). It prints
 * nothing itself.
 */
describe('no composed yield figure reaches the DOM unprinted', () => {
  /**
   * Composes a figure **and** puts things on the screen. The second half is the
   * exemption, by rule rather than by name: `figures.ts` and
   * `researchProgress.ts` compose `40⚙` and `230/250 🔬 · 3t` and never touch a
   * node — they hand strings to whoever is printing, which is the whole point of
   * the split. A module with no `document` in it cannot show anybody an emoji.
   */
  const composers = Object.entries(UI_SOURCE).filter(([path, text]) => {
    if (path.endsWith('yieldMark.ts')) return false; // the printer itself
    const source = code(text);
    return source.includes('YIELD_GLYPH') && source.includes('document.');
  });

  it('finds the surfaces that quote a yield, so the sweep is not vacuous', () => {
    const names = composers.map(([path]) => path.split('/').pop());
    // The list is allowed to grow; it is not allowed to be empty, and these are
    // the ones that were swapped in the pass that added this.
    expect(names).toContain('cityPanel.ts');
    expect(names).toContain('techTree.ts');
    expect(names).toContain('unitPanel.ts');
    expect(names.length).toBeGreaterThanOrEqual(4);
  });

  /**
   * The two surfaces that compose a figure and hand it to somebody else to
   * print, named here with the printer they hand it to rather than left to be
   * discovered. Both are the same shape — a *string* that is a record first and
   * a display second — and both would be wrong to print at the composing end.
   */
  const HANDS_OFF: Record<string, string> = {
    // The discovery offer's payoff line: `OfferOption.payoff` is data ("strings
    // only — see the module docblock"), and `offerCard.ts` draws it.
    '../../src/main.ts': 'offerCard.ts',
    // A camp's bounty goes into a `NotificationEntry.text`, which is replayed
    // into the log and read aloud; `toasts.ts` and `notificationsPanel.ts` draw
    // the glyph in it and the record keeps the character.
    '../../src/ui/controls.ts': 'toasts.ts',
  };

  it('imports the printer in every one of them', () => {
    for (const [path, text] of composers) {
      const printsHere = /from '\.\/yieldMark'|from '\.\/ui\/yieldMark'/.test(code(text));
      const handedTo = HANDS_OFF[path];
      expect(
        printsHere || handedTo !== undefined,
        `${path} composes a yield figure but neither prints it nor hands it to a printer`,
      ).toBe(true);
      // And whoever it hands off to had better be a printer itself.
      if (!printsHere && handedTo) {
        expect(code(UI_SOURCE[`../../src/ui/${handedTo}`]!)).toContain('setYieldText');
      }
    }
  });

  it('keeps `figures.ts` as the declaration and not a printer', () => {
    const figures = code(UI_SOURCE['../../src/ui/figures.ts']!);
    expect(figures).toContain('YIELD_GLYPH');
    // No DOM in it at all: it composes strings and hands them on. This is what
    // makes the exemption above a rule and not a favour.
    expect(figures).not.toContain('document.');
    expect(figures).not.toContain('yieldMark');
  });

  /**
   * The six SVGs under `public/sprites/icons/yields/` are gone, and the atlas no
   * longer names them (`test/render/yieldMarks.test.ts` holds that end). This
   * holds the interface's end: nothing in the HUD reaches for a yield file
   * either, which is what a half-finished swap would have left behind.
   */
  it('reaches for no yield artwork file anywhere in the interface', () => {
    for (const [path, text] of Object.entries(UI_SOURCE)) {
      expect(text.includes('icons/yields'), `${path} names a retired yield file`).toBe(false);
    }
  });
});
