import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBotPreparationScheduler } from '../../src/ui/botPreparationScheduler';

function browser(withIdle: boolean) {
  let frame: FrameRequestCallback | undefined;
  let idle: (() => void) | undefined;
  const document = { hidden: false };
  const host = {
    setTimeout,
    clearTimeout,
    requestAnimationFrame(callback: FrameRequestCallback) { frame = callback; return 1; },
    cancelAnimationFrame() { frame = undefined; },
    ...(withIdle ? {
      requestIdleCallback(callback: () => void) { idle = callback; return 1; },
      cancelIdleCallback() { idle = undefined; },
    } : {}),
  };
  vi.stubGlobal('window', host);
  vi.stubGlobal('document', document);
  return {
    document,
    paint() { const callback = frame; frame = undefined; callback?.(performance.now()); },
    runIdle() { const callback = idle; idle = undefined; callback?.(); },
  };
}

beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('bot preparation during a human turn', () => {
  it('keeps the opening delay across edits and waits for paint and idle time', () => {
    const page = browser(true);
    const start = vi.fn();
    const schedule = createBotPreparationScheduler(start, () => false);
    schedule.schedule('turn');
    vi.advanceTimersByTime(100);
    schedule.schedule();
    vi.advanceTimersByTime(549);
    page.paint();
    page.runIdle();
    expect(start).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    page.paint();
    expect(start).not.toHaveBeenCalled();
    page.runIdle();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('keeps background work out of a handover and runs after paint without an idle API', () => {
    const page = browser(false);
    const start = vi.fn();
    let busy = true;
    const schedule = createBotPreparationScheduler(start, () => busy);
    schedule.schedule();
    vi.advanceTimersByTime(250);
    page.paint();
    vi.advanceTimersByTime(0);
    expect(start).not.toHaveBeenCalled();
    busy = false;
    vi.advanceTimersByTime(250);
    page.paint();
    expect(start).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('drops cancelled or hidden work, including a callback already waiting for idle', () => {
    const page = browser(true);
    const start = vi.fn();
    const schedule = createBotPreparationScheduler(start, () => false);
    schedule.schedule();
    vi.advanceTimersByTime(250);
    page.paint();
    schedule.cancel();
    page.runIdle();
    schedule.schedule();
    vi.advanceTimersByTime(250);
    page.paint();
    page.document.hidden = true;
    page.runIdle();
    expect(start).not.toHaveBeenCalled();
  });
});
