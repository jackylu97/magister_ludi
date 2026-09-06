/**
 * The End Turn press — the button raises, *then* the other empires move.
 *
 * `docs/flags.md`, "From the first full playthrough" note 14: by turn 88 the
 * click was followed by a visible freeze with the button stuck pressed into the
 * page, because `controls.endTurn` drives every bot seat before it commits the
 * local one (`onBeforeEndTurn`) and it did all of that inside the click's own
 * handler. The browser is never given a frame between the mousedown that painted
 * the button down and the handler's return, so the pressed look is what the
 * player looks at for as long as the rivals think.
 *
 * The fix is entirely about *ordering*, which is why it is pinned by reading the
 * source: there is no jsdom in this suite (`controls.test.ts`'s docblock), and
 * the four claims below are all claims about what happens before what.
 *
 *   1. **The press yields before the drive.** Two hops — `requestAnimationFrame`
 *      then a `setTimeout` — because rAF runs *before* the paint it is scheduled
 *      for, so a drive started in that callback would block the very frame it
 *      was waiting on. `controls.endTurn` is called inside the timeout and
 *      nowhere earlier.
 *   2. **The button says what is happening, and is not pressed while it says
 *      it.** Disabled with `aria-busy` and the working class on the press;
 *      cleared in a `finally` when the drive returns, so a throw cannot leave
 *      the corner dead.
 *   3. **A second press in the window is a no-op**, by a guard rather than by
 *      the disabled attribute — ⏎ does not go through one.
 *   4. **The key and the button are one gesture**: `controls.ts`'s ⏎ asks the
 *      host to press rather than calling `endTurn` itself.
 *
 * And the stylesheet's half, which is the visible complaint: the working state
 * must not look pressed, and must not look like the generic disabled plate.
 */

import { describe, expect, it } from 'vitest';

const SOURCES: Record<string, string> = {
  ...(import.meta.glob('../../src/{main.ts,style.css}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../../src/ui/controls.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
};

function raw(file: string): string {
  const key = Object.keys(SOURCES).find((path) => path.endsWith(`/${file}`));
  if (key === undefined) throw new Error(`${file} was not globbed`);
  return SOURCES[key]!;
}

/** One file's source with its comments taken out — the prose explains the rules. */
function source(file: string): string {
  return raw(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** `pressEndTurn`'s body, which is where every ordering claim below is made. */
function press(): string {
  const main = source('main.ts');
  const at = main.indexOf('function pressEndTurn(');
  expect(at).toBeGreaterThan(-1);
  const end = main.indexOf('\n  }', at);
  expect(end).toBeGreaterThan(at);
  return main.slice(at, end);
}

describe('the End Turn press yields a frame before the bots think', () => {
  it('is what the button click calls — the click never drives the turn itself', () => {
    const main = source('main.ts');
    const at = main.indexOf("endTurnButton.addEventListener('click'");
    expect(at).toBeGreaterThan(-1);
    const handler = main.slice(at, at + 200);
    expect(handler).toContain('pressEndTurn(event.shiftKey)');
    // The whole bug in one line: a handler that ends the turn on its own frame.
    expect(handler).not.toContain('controls.endTurn(');
  });

  it('hops twice — rAF, then a timeout — before it calls endTurn', () => {
    const body = press();
    const raf = body.indexOf('window.requestAnimationFrame(');
    const timer = body.indexOf('window.setTimeout(');
    const drive = body.indexOf('controls.endTurn(force)', timer);
    expect(raf).toBeGreaterThan(-1);
    // The order is the claim: a frame is requested, the timeout is set inside
    // it, and only inside the timeout does the simulation take the thread.
    expect(timer).toBeGreaterThan(raf);
    expect(drive).toBeGreaterThan(timer);
    // And the timeout is a real hop to the back of the queue, not a delay.
    expect(body.slice(timer)).toContain('}, 0);');
  });

  it('raises and quiets the button in the press frame, before either hop', () => {
    const body = press();
    const working = body.indexOf('endTurnWorking = true');
    const paint = body.indexOf('showEndTurnState(');
    const raf = body.indexOf('window.requestAnimationFrame(');
    expect(working).toBeGreaterThan(-1);
    expect(paint).toBeGreaterThan(working);
    // Painted while the thread is still free. A DOM write after the rAF would
    // be a state the player never sees.
    expect(raf).toBeGreaterThan(paint);
  });

  it('clears the working state in a finally, so a throw cannot kill the corner', () => {
    const body = press();
    const drive = body.indexOf('controls.endTurn(force)');
    const cleared = body.indexOf('endTurnWorking = false');
    expect(cleared).toBeGreaterThan(drive);
    expect(body.slice(drive - 40, cleared)).toContain('finally');
    // And the repaint that ends the wait: the label goes back to whatever the
    // new turn owes, through the one place that decides it.
    expect(body.indexOf('updatePanel(null, renderer.getHover())', cleared)).toBeGreaterThan(cleared);
  });

  it('makes a second press inside the window a no-op, by a guard of its own', () => {
    const body = press();
    // First statement in the function: ⏎ reaches `pressEndTurn` without passing
    // the disabled attribute, so the attribute cannot be the guard.
    expect(body.indexOf('if (endTurnWorking) return;')).toBeLessThan(
      body.indexOf('endTurnWorking = true'),
    );
  });

  it('keeps the old instant path for a press that only bounces off a blocker', () => {
    const body = press();
    const blocked = body.indexOf('controls.endTurnBlocker() !== null');
    expect(blocked).toBeGreaterThan(-1);
    // No turn ends, no bot moves, nothing to wait for — so no working state,
    // which would otherwise flash for a frame on the way to a city screen.
    expect(blocked).toBeLessThan(body.indexOf('endTurnWorking = true'));
    expect(body.slice(blocked, body.indexOf('endTurnWorking = true'))).toContain(
      'controls.endTurn(force)',
    );
  });

  it('cancels both hops when the game is torn down', () => {
    const main = source('main.ts');
    expect(main).toContain('window.cancelAnimationFrame(endTurnRaf)');
    expect(main).toContain('window.clearTimeout(endTurnTimer)');
    // Entry LVII's register, for a pending hop rather than a listener.
    const at = main.indexOf('gameDisposers.push(() => {');
    expect(at).toBeGreaterThan(-1);
  });
});

describe('the button while the others move', () => {
  it('is the working state, and it outranks every blocker reading', () => {
    const main = source('main.ts');
    const at = main.indexOf('function showEndTurnState(');
    expect(at).toBeGreaterThan(-1);
    const body = main.slice(at, main.indexOf('\n}', at));
    const guard = body.indexOf('if (endTurnWorking) {');
    const labels = body.indexOf('END_TURN_LABELS[');
    expect(guard).toBeGreaterThan(-1);
    // Read mid-resolution, a blocker describes a turn being resolved rather than
    // one being played, so the working branch answers first and returns.
    expect(guard).toBeLessThan(labels);
    const working = body.slice(guard, labels);
    expect(working).toContain('END_TURN_WORKING_LABEL');
    expect(working).toContain("classList.add('btn-quiet', 'is-working')");
    expect(working).toContain('endTurnButton.disabled = true');
    expect(working).toContain("setAttribute('aria-busy', 'true')");
    // The vermilion is the "you may press this" colour and is given up.
    expect(working).toContain("classList.remove('btn-primary')");
    // And the other way out: the ordinary branch always undoes all three.
    const ordinary = body.slice(labels - 300, labels);
    expect(ordinary).toContain("classList.remove('is-working')");
    expect(ordinary).toContain('endTurnButton.disabled = false');
    expect(ordinary).toContain("removeAttribute('aria-busy')");
  });

  it('says it in the player’s own terms — the other empires, not the machine', () => {
    expect(raw('main.ts')).toContain("const END_TURN_WORKING_LABEL = 'The others are moving…'");
  });

  it('is drawn raised and quiet, never pressed, and never the spent plate', () => {
    const css = source('style.css');
    const at = css.indexOf('#end-turn.is-working:disabled');
    expect(at).toBeGreaterThan(-1);
    const rule = css.slice(at, css.indexOf('}', at));
    // The complaint itself: the button must not sit pushed into the page.
    expect(rule).toContain('transform: none');
    expect(rule).not.toContain('translate(');
    // On its full shadow, in parchment and ink — not the greyed "not for you"
    // plate `.btn:disabled` paints for a control that has been taken away.
    expect(rule).toContain('box-shadow: var(--shadow)');
    expect(rule).toContain('background: var(--parchment)');
    expect(rule).toContain('border-color: var(--ink)');
    expect(rule).toContain('cursor: progress');
    // And the press animation still refuses a disabled button, which is what
    // makes the rule above enough.
    expect(css).toContain('.btn-end:active:not(:disabled)');
  });

  it('breathes on the label alone, and not at all for a reader who asked for less', () => {
    const css = source('style.css');
    expect(css).toContain('@keyframes end-turn-working');
    const reduced = css.slice(css.lastIndexOf('#end-turn.is-working #end-turn-label'));
    expect(reduced).toContain('animation: none');
  });
});

describe('the key and the button are one gesture', () => {
  it('⏎ on the board asks the host to press rather than ending the turn itself', () => {
    const controls = source('controls.ts');
    const at = controls.indexOf("if (event.key === 'Enter' || event.key === ' ')");
    expect(at).toBeGreaterThan(-1);
    const branch = controls.slice(at, at + 700);
    expect(branch).toContain('if (onEndTurnPressed) onEndTurnPressed(event.shiftKey);');
    // The fallback is what a page that wires no press gets — this module still
    // owns ending the turn, and only borrows the press.
    expect(branch).toContain('else endTurn(event.shiftKey);');
    // Shift ⏎ is still the override, carried through the press unchanged.
    expect(branch).not.toContain('endTurn(false)');
  });

  it('is declared as a listener and wired from main to the same press', () => {
    expect(source('controls.ts')).toContain('onEndTurnPressed?: (force: boolean) => void;');
    expect(source('main.ts')).toContain('onEndTurnPressed: (force) => pressEndTurn(force),');
  });

  it('leaves the three beats behind the resolution exactly where they were', () => {
    const controls = source('controls.ts');
    const turn = controls.slice(controls.indexOf('function endTurn(force = false)'));
    // The bots still play inside `endTurn`, before this seat's own command, and
    // the hand-over still waits on the marches. The press moved *when* endTurn
    // runs; it moved nothing inside it.
    expect(turn.indexOf('onBeforeEndTurn?.()')).toBeLessThan(
      turn.indexOf("commit({ type: 'endTurn'"),
    );
    expect(turn.indexOf('onTurnResolved?.(')).toBeLessThan(turn.indexOf('scheduleHandOver('));
    expect(controls).toContain('renderer.pendingAnimationMs?.() ?? 0');
  });
});
