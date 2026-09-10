import { describe, expect, it } from 'vitest';

import { braceBody, uiSource } from './sourceHelpers';

/**
 * **The Abacus's stage is a third of the sheet, not the sheet** — the user's
 * ruling of 2026-09-09 (`docs/flags.md` (nnn): *"the abacus is a bit too large
 * compared to the other wagers"*), pinned in the stylesheet where it is written.
 *
 * Read off the source rather than measured in a DOM, for the reason every
 * source-reading suite in this directory gives: jsdom lays nothing out, so a
 * mounted Abacus would report every box as nought and the assertion would pass
 * on a stylesheet that said nothing at all. The fact worth pinning is structural
 * anyway — *where* the cap is written, not what it computes to on one window.
 *
 * Three claims, and each is a way this regressed or could:
 *
 *   · **the stage is capped**, in viewport units, at about a third. It was
 *     `flex: 1` — grow into whatever the register left — which is exactly the
 *     screen the user was looking at.
 *   · **the register is not capped with it.** It carried a `max-height` of its
 *     own, so capping the stage alone would have left the middle of the sheet
 *     empty; it takes the rest and scrolls instead.
 *   · **the cap is CSS, not script.** The stage measures its host box on the
 *     first open (`ensureStage`, after `hidden` is cleared), so a height written
 *     from script would land after the measure and size the canvas twice. A
 *     stylesheet rule is in place before the element is ever shown.
 */
describe('the Abacus stage is capped at a third of the sheet', () => {
  /** One rule's body out of the stylesheet, by its selector. */
  function rule(selector: string): string {
    const css = uiSource('style.css');
    const at = css.indexOf(`\n${selector} {`);
    expect(at, selector).toBeGreaterThanOrEqual(0);
    const end = css.indexOf('}', at);
    return css.slice(at, end);
  }

  it('gives the stage a viewport-relative cap of about a third', () => {
    const stage = rule('.abacus-stage');
    const cap = /max-height:\s*(\d+(?:\.\d+)?)vh/.exec(stage);
    expect(cap, '.abacus-stage names no vh cap').not.toBeNull();
    const height = Number(cap![1]);
    // "About a third" with room to taste, and nowhere near the half-sheet the
    // frame used to take.
    expect(height).toBeGreaterThanOrEqual(25);
    expect(height).toBeLessThanOrEqual(40);
    // A grow would climb straight past the cap's intent on a tall window; the
    // basis is what makes the box exist at all, since the canvas inside is
    // `height: 100%` and would measure nothing against an auto-sized parent.
    expect(stage).toContain('flex: 0 0');
  });

  it('gives the register everything the stage leaves, and lets it scroll', () => {
    const register = rule('.abacus-register');
    expect(register).toContain('flex: 1 1 auto');
    expect(register).toContain('overflow-y: auto');
    // Its own cap is what used to hold the band to a third of the screen while
    // the frame took the rest — the ruling turns that around.
    expect(/max-height:\s*\d/.test(register), '.abacus-register is capped again').toBe(false);
  });

  it('writes the cap in the stylesheet and never from script', () => {
    const screen = uiSource('abacusScreen.ts');
    const body = braceBody(screen, 'function ensureStage()');
    // The stage's own box is never assigned a height on the way in — the whole
    // point of putting the cap in CSS is that it is already there to measure.
    expect(/host\.style\.(maxHeight|height)/.test(screen)).toBe(false);
    expect(body).toContain('host.replaceChildren(canvas, labelLayer)');
  });

  it('draws the wager band above the bead rods', () => {
    // The reading order of the mock's second sheet: what the age asks, then
    // where everybody stands, then the score. The band is appended into the
    // register before the caption and the rods, and nothing else may come first.
    const draw = braceBody(uiSource('abacusScreen.ts'), 'function drawRegister(');
    const band = draw.indexOf('register.append(band)');
    const caption = draw.indexOf('register.append(caption)');
    const rod = draw.indexOf('register.append(rod)');
    expect(band).toBeGreaterThan(0);
    expect(band).toBeLessThan(caption);
    expect(caption).toBeLessThan(rod);
  });
});
