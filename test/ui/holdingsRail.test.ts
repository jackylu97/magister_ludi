/**
 * The holdings rail — the always-visible answer to *"can I build another
 * horseman?"* (batch R4; `docs/strategic-resources-proposal.md` §5's S5 and §7).
 *
 * The rail's whole job is to be there, be right, and cost nothing. No jsdom in
 * this suite (see `controls.test.ts`), so the DOM half is read through the
 * source and the two pure halves are exercised:
 *
 *   1. **The fingerprint.** `render` runs from `updatePanel`, which also runs on
 *      pointer movement, so the rail redraws only when a row actually changed.
 *      A fingerprint that missed a change would leave a stale count on screen —
 *      worse than no count — and one that never matched would put a walk of the
 *      army on every mouse-move.
 *   2. **Where it is mounted, and what it is not.** The rail is in the HUD, not
 *      in a sheet: §7 says a count in a submenu only refuses people. That is a
 *      fact about `main.ts` and `style.css`, so it is read there.
 */

import { describe, expect, it } from 'vitest';
import { uiSource } from './sourceHelpers';

import {
  HOLDINGS_CAPTION,
  HOLDINGS_EYEBROW,
  holdingsFingerprint,
} from '../../src/ui/holdingsRail';
import type { CopyCount } from '../../src/ui/resourceCopies';

function count(id: CopyCount['id'], held: number, committed: number): CopyCount {
  return { id, name: id, held, committed, spare: Math.max(0, held - committed) };
}

describe('the fingerprint', () => {
  it('is equal for two readings that would draw the same rail', () => {
    const rows = [count('iron', 5, 2), count('horses', 6, 0)];
    expect(holdingsFingerprint(rows, 0)).toBe(holdingsFingerprint([...rows], 0));
  });

  it('moves when a copy is spent', () => {
    const before = holdingsFingerprint([count('iron', 5, 2)], 0);
    const after = holdingsFingerprint([count('iron', 5, 3)], 0);
    expect(after).not.toBe(before);
  });

  it('moves when ground is lost under a standing army', () => {
    const before = holdingsFingerprint([count('iron', 5, 2)], 0);
    const after = holdingsFingerprint([count('iron', 3, 2)], 0);
    expect(after).not.toBe(before);
  });

  it('moves when a resource joins or leaves the list', () => {
    const one = holdingsFingerprint([count('iron', 5, 0)], 0);
    const two = holdingsFingerprint([count('iron', 5, 0), count('camels', 5, 0)], 0);
    expect(two).not.toBe(one);
  });

  it('moves when the chair does, with no change of state at all', () => {
    const rows = [count('iron', 5, 2)];
    expect(holdingsFingerprint(rows, 1)).not.toBe(holdingsFingerprint(rows, 0));
  });
});

describe('the words on it', () => {
  it('says what the two figures are, in plain words and with no number in them', () => {
    expect(HOLDINGS_CAPTION).toBe('spare of what you hold');
    expect(HOLDINGS_CAPTION).not.toMatch(/\d/);
    expect(HOLDINGS_EYEBROW).not.toMatch(/\d/);
  });
});

describe('where it lives', () => {
  it('is a fixed card in the HUD, not a sheet', () => {
    const css = uiSource('style.css');
    expect(css).toContain('#hud-holdings');
    // Pinned under the dock by the same arithmetic every other card in the left
    // column uses, so it can never drift into the buttons above it.
    expect(css).toMatch(/#hud-holdings\s*\{[^}]*position:\s*fixed/);
    expect(css).toMatch(/#hud-holdings\s*\{[^}]*--hud-dock-h/);
    // It must not be built on `modalShell` — a sheet is the thing §7 forbids.
    expect(uiSource('holdingsRail.ts')).not.toContain('modalShell');
  });

  it('is mounted once and refreshed wherever the rest of the HUD is', () => {
    const main = uiSource('main.ts');
    expect(main).toContain('createHoldingsRail');
    expect(main).toContain('holdings?.render()');
    // Beside the dock, which is the surface it hangs under.
    expect(main).toContain('hudDockEl.after(holdings.root)');
  });

  it('watches the revision rather than recomputing per frame', () => {
    const source = uiSource('holdingsRail.ts');
    expect(source).toContain('state.revision === drawnRevision');
    // And it hides itself rather than drawing a card of nothing.
    expect(source).toContain('root.hidden = rows.length === 0');
  });
});
