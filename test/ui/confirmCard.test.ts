/**
 * The confirm card: "are you sure?", and the four ways it could quietly be
 * wrong.
 *
 * The user asked for one (2026-08-29, with the disband verb): *"There should be
 * a confirmation modal (are you sure you want to delete this unit?)"*. No jsdom
 * in this suite (`controls.test.ts`'s note), so the card is split the way the
 * Triumph sheet is — everything that can be wrong *silently* is DOM-free and
 * asserted here directly, and the rest is read off the sources through Vite's
 * raw glob:
 *
 *   1. **A question is answered at most once.** A stray Enter arriving in the
 *      same tick as a click on the confirm button must not let two units go —
 *      the gate takes the callback before it runs it.
 *   2. **Cancel and Escape mean no.** Not "no" as in "close and run it anyway":
 *      the callback must never fire.
 *   3. **Escape is not a second yes.** The asymmetry against `triumphModal.ts`,
 *      where both keys proceed, is the whole point of a destructive verb's card.
 *   4. **It is never `window.confirm`.** The platform dialog is a different
 *      game's typeface and is suppressible on some platforms — which for the one
 *      verb that cannot be undone is the failure that matters. Pinned across all
 *      of `src/ui` and `src/main.ts`, because the rule is about the interface
 *      and not about this file.
 */

import { describe, expect, it, vi } from 'vitest';

import { confirmAnswer, confirmFace, createConfirmGate } from '../../src/ui/confirmCard';

const SOURCES = import.meta.glob(
  ['../../src/ui/*.ts', '../../src/main.ts', '../../index.html'],
  { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>;

function source(name: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(name));
  const text = key === undefined ? undefined : SOURCES[key];
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`${name} came back empty`);
  }
  return text;
}

describe('confirmFace', () => {
  it('fills in the only default there is', () => {
    const face = confirmFace({
      title: 'Disband the Warrior?',
      body: 'It leaves the board for good. It costs 1 gold a turn to keep.',
      confirmLabel: 'Disband',
    });
    expect(face.cancelLabel).toBe('Cancel');
    expect(face.confirmLabel).toBe('Disband');
    expect(face.title).toBe('Disband the Warrior?');
  });

  it('keeps a caller’s own words for the harmless answer', () => {
    const face = confirmFace({ title: 'T', body: 'B', confirmLabel: 'Disband', cancelLabel: 'Keep' });
    expect(face.cancelLabel).toBe('Keep');
  });
});

describe('confirmAnswer', () => {
  it('is Enter for yes and Escape for no, and nothing else', () => {
    expect(confirmAnswer('Enter')).toBe('confirm');
    // The asymmetry against the Triumph sheet, where Escape also proceeds.
    expect(confirmAnswer('Escape')).toBe('cancel');
    expect(confirmAnswer(' ')).toBeNull();
    expect(confirmAnswer('y')).toBeNull();
  });
});

describe('the gate', () => {
  it('opens, then runs the callback exactly once on a confirm', () => {
    const gate = createConfirmGate();
    const done = vi.fn();
    expect(gate.isOpen).toBe(false);
    gate.open(done);
    expect(gate.isOpen).toBe(true);

    expect(gate.settle('confirm')).toBe(true);
    expect(done).toHaveBeenCalledTimes(1);
    expect(gate.isOpen).toBe(false);

    // The stray second answer — a key arriving in the same tick as a click.
    expect(gate.settle('confirm')).toBe(false);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('never runs the callback on a cancel', () => {
    const gate = createConfirmGate();
    const done = vi.fn();
    gate.open(done);
    expect(gate.settle('cancel')).toBe(true);
    expect(done).not.toHaveBeenCalled();
    expect(gate.isOpen).toBe(false);
    // And Escape is that same answer, by `confirmAnswer` above.
    expect(gate.settle('confirm')).toBe(false);
    expect(done).not.toHaveBeenCalled();
  });

  it('answers nothing when nothing was asked', () => {
    const gate = createConfirmGate();
    expect(gate.settle('confirm')).toBe(false);
    expect(gate.settle('cancel')).toBe(false);
  });
});

describe('the interface never raises a platform dialog', () => {
  /**
   * Every module the player's interface is built out of, plus the page's own
   * entry. A `confirm(` anywhere in here is either `window.confirm` or a local
   * shadow of the word, and both are a card this game did not draw.
   */
  function interfaceSources(): [string, string][] {
    return Object.entries(SOURCES).filter(
      ([path]) => path.includes('/src/ui/') || path.endsWith('/src/main.ts'),
    );
  }

  /**
   * `confirm(` with a word boundary in front of it. It catches the bare call
   * and `window.confirm(` alike (`\b` fires after a dot), and it cannot catch
   * this card's own exports — `confirmFace(`, `confirmAnswer(`,
   * `createConfirmCard(` — because none of them is the word `confirm`
   * immediately followed by a parenthesis.
   */
  const CALL = /\bconfirm\s*\(/;

  /** Comments only, so the prose explaining this rule cannot fail it. */
  function code(text: string): string {
    return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  }

  it('reads every UI module and finds no confirm() call', () => {
    const found = interfaceSources().filter(([, text]) => CALL.test(code(text)));
    expect(found.map(([path]) => path)).toEqual([]);
  });

  it('would catch one — the pin is not a regex that never fires', () => {
    expect(CALL.test('if (window.confirm("sure?")) doIt();')).toBe(true);
    expect(CALL.test('if (confirm("sure?")) doIt();')).toBe(true);
    expect(CALL.test('const face = confirmFace(request);')).toBe(false);
    expect(CALL.test('const card = createConfirmCard(el);')).toBe(false);
  });

  it('reads its own sources — the glob is not empty', () => {
    expect(interfaceSources().length).toBeGreaterThan(20);
  });

  it('mounts the card on a shell the page owns', () => {
    expect(source('index.html')).toContain('id="confirm-overlay"');
    expect(source('main.ts')).toContain("requireElement<HTMLElement>('confirm-overlay')");
    // Escape order: the card is one of the surfaces `closePopovers` takes down,
    // and one of the surfaces the hotkeys refuse to fire under.
    expect(source('main.ts')).toContain('confirmCard.close()');
    expect(source('main.ts')).toContain('confirmCard.isOpen');
  });
});
