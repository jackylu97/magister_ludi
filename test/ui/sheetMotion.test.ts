/**
 * How a sheet comes and goes (batch SS8, the Ornament board: "Sheets settle.
 * From 8 px below, in 240 ms, on cubic-bezier(0.16, 1, 0.3, 1)").
 *
 * The motion is the stylesheet's, on the class every sheet on `modalShell.ts`
 * wears, and the leave is the shell's: `hidden` goes on at once and the overlay
 * stays drawn, inert, while it fades. These read the two files as text, as the
 * other frame tests do.
 */
import { describe, expect, it } from 'vitest';
import { uiSource } from './sourceHelpers';

const CSS = uiSource('style.css');
const SHELL = uiSource('modalShell.ts');

/** The body of the first rule whose selector is exactly this, outside any media block. */
function rule(selector: string): string {
  const at = CSS.indexOf(`\n${selector} {\n`);
  expect(at, selector).toBeGreaterThan(-1);
  return CSS.slice(at, CSS.indexOf('\n}', at));
}

describe('sheet motion (batch SS8)', () => {
  it('settles a sheet from 8 px below in 240 ms, on the board’s curve, with no overshoot', () => {
    expect(rule('.statecraft-sheet')).toContain('animation: sheet-settle 240ms cubic-bezier(0.16, 1, 0.3, 1) both;');
    const settle = CSS.slice(CSS.indexOf('@keyframes sheet-settle'), CSS.indexOf('@keyframes sheet-leave'));
    expect(settle).toContain('transform: translateY(8px);');
    // The old spring (a y control point above 1) is gone from the sheets.
    expect(rule('.statecraft-sheet')).not.toContain('1.2');
  });

  it('leaves the same way back, drawn but inert, with every press going to the board', () => {
    const leaving = rule('.statecraft-overlay[hidden].is-leaving');
    expect(leaving).toContain('display: grid;');
    expect(leaving).toContain('pointer-events: none;');
    expect(leaving).toContain('animation: ground-leave 160ms');
    expect(rule('.statecraft-overlay.is-leaving .statecraft-sheet')).toContain('animation: sheet-leave 160ms');
  });

  it('only fades, and never moves, for a player who asked for less motion', () => {
    const reduced = CSS.slice(CSS.indexOf('@media (prefers-reduced-motion: reduce) {\n  .statecraft-sheet {'));
    const block = reduced.slice(0, reduced.indexOf('\n}\n'));
    expect(block).toContain('animation: offer-fade 160ms ease-out both;');
    expect(block).toMatch(/\.statecraft-overlay\.is-leaving \.statecraft-sheet \{\s*animation: none;/);
  });

  it('closes the screen state at once: hidden first, then the picture leaves', () => {
    const close = SHELL.slice(SHELL.indexOf('function close(): void {'));
    const body = close.slice(0, close.indexOf('\n  }\n'));
    expect(body).toContain('overlay.hidden = true;\n    startLeave();');
    // While it leaves, nothing on it can be pressed or focused.
    const start = SHELL.slice(SHELL.indexOf('function startLeave(): void {'));
    expect(start.slice(0, start.indexOf('\n  }\n'))).toContain('overlay.inert = true;');
    // A sheet opened again while it leaves drops the leave first.
    const open = SHELL.slice(SHELL.indexOf('function open(): void {'));
    expect(open.slice(0, open.indexOf('\n  }\n'))).toContain('endLeave();\n    overlay.hidden = false;');
    // And the leave's listener comes off with the others.
    expect(SHELL).toContain("overlay.addEventListener('animationend', onAnimationEnd);");
    expect(SHELL).toContain("overlay.removeEventListener('animationend', onAnimationEnd);");
  });
});

describe('only the stamp overshoots (batch SS8, the Ornament board)', () => {
  it('lets every other rising sheet and card settle', () => {
    for (const selector of ['.offer-sheet', '.triumph-sheet', '.confirm-card', '.pamphlet-sheet']) {
      expect(rule(selector), selector).toContain('animation: sheet-settle 240ms cubic-bezier(0.16, 1, 0.3, 1) both;');
    }
    expect(rule('.turn-splash')).toContain('cubic-bezier(0.16, 1, 0.3, 1)');
    expect(rule(".gp-ceremony-card[data-phase='read']")).toContain('cubic-bezier(0.16, 1, 0.3, 1)');
    // A curve whose y control point passes 1 overshoots. Only the two stamp
    // animations keep one.
    const overshoots = [...CSS.matchAll(/animation:\s*([\w-]+)[^;]*cubic-bezier\([\d.]+,\s*1\.\d+/g)].map((m) => m[1]);
    expect(overshoots.sort()).toEqual(['stamp-land', 'stamp-thunk']);
  });
});
