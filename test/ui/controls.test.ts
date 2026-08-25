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
 *   2. **`1..9` read `order`'s positions**, whatever `order` holds — so a lens
 *      appended to the menu's list gets a working hotkey with nothing here to
 *      update, and a digit past the end of a short list names nothing.
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

  it('reads 1..9 off the order, one-indexed', () => {
    expect(lensForDigit(1, ORDER, 'explorer')).toBe('none');
    expect(lensForDigit(2, ORDER, 'none')).toBe('settler');
    expect(lensForDigit(3, ORDER, 'none')).toBe('explorer');
  });

  it('names nothing past the end of the list', () => {
    expect(lensForDigit(4, ORDER, 'none')).toBeNull();
    expect(lensForDigit(9, ORDER, 'none')).toBeNull();
  });

  it('rejects anything that is not a single decimal digit', () => {
    expect(lensForDigit(-1, ORDER, 'none')).toBeNull();
    expect(lensForDigit(10, ORDER, 'none')).toBeNull();
    expect(lensForDigit(1.5, ORDER, 'none')).toBeNull();
  });

  it('toggles the active manual lens off (Civ-style)', () => {
    // Pressing 2 while the settler lens (position 2) is already up clears it.
    expect(lensForDigit(2, ORDER, 'settler')).toBe('none');
    expect(lensForDigit(3, ORDER, 'explorer')).toBe('none');
    // And 0, itself always 'none', "toggles off" the none lens into itself.
    expect(lensForDigit(0, ORDER, 'none')).toBe('none');
  });

  it('switches straight to a different lens without needing a second press', () => {
    expect(lensForDigit(3, ORDER, 'settler')).toBe('explorer');
    expect(lensForDigit(2, ORDER, 'explorer')).toBe('settler');
  });

  it('follows a grown order with no change to the mapping itself', () => {
    // A hypothetical fourth lens appended to the menu's list — the whole point
    // of reading `order` rather than a hardcoded table.
    const grown: readonly LensMode[] = [...ORDER, 'settler'];
    expect(lensForDigit(4, grown, 'none')).toBe('settler');
  });
});
