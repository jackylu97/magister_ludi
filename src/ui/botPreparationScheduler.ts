const OPENING_DELAY_MS = 650;
const EDIT_DELAY_MS = 250;

/** Let the board paint before posting a copy of the game to the bot worker. */
export function createBotPreparationScheduler(prepare: () => void, busy: () => boolean) {
  let timer = 0;
  let frame = 0;
  let idle = 0;
  let openingUntil = 0;

  function clearPending(): void {
    window.clearTimeout(timer);
    window.cancelAnimationFrame(frame);
    if (idle !== 0) window.cancelIdleCallback(idle);
    timer = frame = idle = 0;
  }

  function start(): void {
    idle = timer = 0;
    if (document.hidden) return;
    if (busy()) {
      timer = window.setTimeout(afterFrame, EDIT_DELAY_MS);
      return;
    }
    prepare();
  }

  function afterFrame(): void {
    timer = 0;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      if (typeof window.requestIdleCallback === 'function') {
        idle = window.requestIdleCallback(start, { timeout: 150 });
      } else {
        // A timer queued from this frame runs after its paint.
        timer = window.setTimeout(start, 0);
      }
    });
  }

  return {
    schedule(reason: 'turn' | 'edit' = 'edit'): void {
      clearPending();
      if (document.hidden) return;
      const now = performance.now();
      if (reason === 'turn') openingUntil = now + OPENING_DELAY_MS;
      timer = window.setTimeout(afterFrame, Math.max(EDIT_DELAY_MS, openingUntil - now));
    },
    cancel(): void {
      clearPending();
      openingUntil = 0;
    },
  };
}
