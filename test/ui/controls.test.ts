/**
 * The number-key lens hotkeys' pure half: which lens a digit selects.
 *
 * `lensForDigit` was written to take the menu's own order and the manual lens
 * as plain arguments precisely so this could be pinned without a keyboard or a
 * `window` (no jsdom in this suite, as with every other UI pass) — the actual
 * `keydown` wiring in `createGameControls` is one line that calls this and
 * `setLens`, and is covered by inspection the way the rest of that file's DOM
 * glue is.
 *
 * Three claims:
 *
 *   1. **`0` always clears**, independent of `order` — even an `order` whose
 *      first entry is not `'none'`.
 *   2. **`1..9` count the lenses**, not the menu's rows: the `'none'` row is
 *      struck out wherever it sits and the digits run down what is left — so a
 *      lens appended to the menu's list gets a working hotkey with nothing here
 *      to update, and a digit past the end of a short list names nothing. This
 *      is the off-by-one that shipped: `LENS_OPTIONS` opens with the "None" row,
 *      so a positional reading made `1` mean *off* — `0`'s job, and one lens
 *      short of a digit at the far end.
 *   3. **The active lens toggles off; a different one switches** — read off
 *      `current`, which the caller must pass as the *manual* lens, never
 *      `effectiveLens`'s answer.
 */

import { describe, expect, it } from 'vitest';

import { type LensMode } from '../../src/ui/mapView';
import { lensForDigit } from '../../src/ui/controls';

const ORDER: readonly LensMode[] = ['none', 'settler', 'explorer'];

describe('lensForDigit', () => {
  it('always clears on 0, whatever lens is active', () => {
    expect(lensForDigit(0, ORDER, 'none')).toBe('none');
    expect(lensForDigit(0, ORDER, 'settler')).toBe('none');
    expect(lensForDigit(0, ORDER, 'explorer')).toBe('none');
  });

  it('numbers the lenses, one-indexed, with the None row struck out', () => {
    expect(lensForDigit(1, ORDER, 'none')).toBe('settler');
    expect(lensForDigit(2, ORDER, 'none')).toBe('explorer');
  });

  it('never lets a digit mean "off" — that is 0 and only 0', () => {
    // The bug: `LENS_OPTIONS` opens with the None row, so a positional reading
    // gave `1` away to it. No digit in range may resolve to 'none' from a lens
    // that is not itself already up.
    for (let digit = 1; digit <= 9; digit++) {
      expect(lensForDigit(digit, ORDER, 'none')).not.toBe('none');
    }
  });

  it('strikes the None row out wherever the menu happens to put it', () => {
    // The rule is about the *entry*, not about position 0 — a menu that listed
    // "None" last would number its lenses exactly the same way.
    const trailing: readonly LensMode[] = ['settler', 'explorer', 'none'];
    expect(lensForDigit(1, trailing, 'none')).toBe('settler');
    expect(lensForDigit(2, trailing, 'none')).toBe('explorer');
    expect(lensForDigit(3, trailing, 'none')).toBeNull();
  });

  it('names nothing past the end of the list', () => {
    expect(lensForDigit(3, ORDER, 'none')).toBeNull();
    expect(lensForDigit(9, ORDER, 'none')).toBeNull();
  });

  it('rejects anything that is not a single decimal digit', () => {
    expect(lensForDigit(-1, ORDER, 'none')).toBeNull();
    expect(lensForDigit(10, ORDER, 'none')).toBeNull();
    expect(lensForDigit(1.5, ORDER, 'none')).toBeNull();
  });

  it('toggles the active manual lens off (Civ-style)', () => {
    // Pressing 1 while the settler lens (the first lens) is already up clears it.
    expect(lensForDigit(1, ORDER, 'settler')).toBe('none');
    expect(lensForDigit(2, ORDER, 'explorer')).toBe('none');
    // And 0, itself always 'none', "toggles off" the none lens into itself.
    expect(lensForDigit(0, ORDER, 'none')).toBe('none');
  });

  it('switches straight to a different lens without needing a second press', () => {
    expect(lensForDigit(2, ORDER, 'settler')).toBe('explorer');
    expect(lensForDigit(1, ORDER, 'explorer')).toBe('settler');
  });

  it('follows a grown order with no change to the mapping itself', () => {
    // A hypothetical third lens appended to the menu's list — the whole point
    // of reading `order` rather than a hardcoded table.
    const grown: readonly LensMode[] = [...ORDER, 'settler'];
    expect(lensForDigit(3, grown, 'none')).toBe('settler');
  });
});
