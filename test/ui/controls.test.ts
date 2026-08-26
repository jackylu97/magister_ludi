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
import { lensForDigit, lensShowsYields, wantsNativeContextMenu } from '../../src/ui/controls';

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

/**
 * `effectiveLens`'s glyph rule, pulled out pure: the settler lens forces the
 * yield glyphs on regardless of the player's own switch, the same way an open
 * city panel already does — a settler player judging a site without yields
 * under the wash is the report that sent this in (`lensShowsYields`'s own
 * docblock has the reasoning). Neither the player's switch nor `effectiveLens`
 * itself is touched by this: dropping the settler or closing the panel must
 * restore exactly what the player had chosen, so the mode/city inputs here
 * stand in for "is a settler or a panel making the ask right now", never for a
 * write to `yieldsOn`.
 */
describe('lensShowsYields', () => {
  it('follows the switch when nothing else is asking', () => {
    expect(lensShowsYields('none', false, false)).toBe(false);
    expect(lensShowsYields('none', true, false)).toBe(true);
    expect(lensShowsYields('explorer', false, false)).toBe(false);
  });

  it('forces the glyphs on for the settler lens, switch off', () => {
    expect(lensShowsYields('settler', false, false)).toBe(true);
  });

  it('does not force the glyphs on for the explorer lens', () => {
    expect(lensShowsYields('explorer', false, false)).toBe(false);
  });

  it('an open city panel still forces the glyphs on, settler or not', () => {
    expect(lensShowsYields('none', false, true)).toBe(true);
    expect(lensShowsYields('settler', false, true)).toBe(true);
  });

  it('the switch alone is enough under any mode', () => {
    expect(lensShowsYields('settler', true, false)).toBe(true);
    expect(lensShowsYields('explorer', true, false)).toBe(true);
  });
});

/**
 * The right button belongs to the game, and `wantsNativeContextMenu` is the one
 * exemption from that.
 *
 * The bug this replaced was a `contextmenu` listener on the **viewport**: right
 * click pans with the pointer captured, but `contextmenu` is hit-tested like any
 * mouse event, so a pan that came to rest over a banner, a price tag, a toast or
 * the unit sheet handed the player the browser's Back/Forward menu. The fix is a
 * document-level suppression in `main.ts` gated on `landingEl.hidden`; what is
 * pinned here is the *predicate*, because a rule about which surfaces keep the
 * native menu is the half that can quietly grow wrong.
 *
 * The claim is narrow on purpose: **text a player might paste keeps its menu,
 * and nothing else does.** A checkbox is a control, a button is a control, and
 * the board is emphatically not text.
 */
describe('wantsNativeContextMenu', () => {
  it('keeps the native menu for the text fields a player types into', () => {
    expect(wantsNativeContextMenu({ tagName: 'TEXTAREA' })).toBe(true);
    expect(wantsNativeContextMenu({ tagName: 'INPUT', type: 'text' })).toBe(true);
    expect(wantsNativeContextMenu({ tagName: 'INPUT', type: 'search' })).toBe(true);
    expect(wantsNativeContextMenu({ tagName: 'INPUT', type: 'number' })).toBe(true);
    expect(wantsNativeContextMenu({ tagName: 'INPUT', type: 'password' })).toBe(true);
  });

  it('reads a bare <input> as text, the way the platform does', () => {
    expect(wantsNativeContextMenu({ tagName: 'INPUT' })).toBe(true);
  });

  it('is case-insensitive about both the tag and the type', () => {
    expect(wantsNativeContextMenu({ tagName: 'input', type: 'TEXT' })).toBe(true);
    expect(wantsNativeContextMenu({ tagName: 'textarea' })).toBe(true);
  });

  it('takes the menu away from every control that holds no text', () => {
    expect(wantsNativeContextMenu({ tagName: 'INPUT', type: 'checkbox' })).toBe(false);
    expect(wantsNativeContextMenu({ tagName: 'INPUT', type: 'range' })).toBe(false);
    expect(wantsNativeContextMenu({ tagName: 'INPUT', type: 'button' })).toBe(false);
    expect(wantsNativeContextMenu({ tagName: 'SELECT' })).toBe(false);
    expect(wantsNativeContextMenu({ tagName: 'BUTTON' })).toBe(false);
  });

  it('keeps it inside an editable region, which the DOM inherits for us', () => {
    expect(wantsNativeContextMenu({ tagName: 'SPAN', isContentEditable: true })).toBe(true);
  });

  it('takes it away from every surface the board is made of', () => {
    // The five that leaked: the canvas itself and the four DOM layers over it.
    expect(wantsNativeContextMenu({ tagName: 'CANVAS' })).toBe(false);
    expect(wantsNativeContextMenu({ tagName: 'DIV' })).toBe(false);
    expect(wantsNativeContextMenu({ tagName: 'SPAN' })).toBe(false);
    expect(wantsNativeContextMenu({ tagName: 'P' })).toBe(false);
    expect(wantsNativeContextMenu(null)).toBe(false);
  });
});
