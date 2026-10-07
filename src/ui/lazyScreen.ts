/**
 * A full-screen sheet whose code is loaded the first time it is opened.
 *
 * The game page used to import every screen statically, so the browser fetched,
 * parsed and ran all of them before the landing screen answered a click, even
 * the ones most players never open in a session (browser audit 2026-10-06,
 * finding 9). `lazyOverlay` stands in for such a screen: it has the screen's
 * own `isOpen`/`open`/`close`/`toggle`/`dispose`, so call sites do not change,
 * and it builds the real screen through a dynamic `import()` on first use.
 *
 * What changes for the caller:
 *
 * - The first `open` is asynchronous. The screen appears once its chunk has
 *   arrived and been built. Every later call goes straight to the real screen.
 * - The last request wins. A `close` (or `dispose`) issued while the first load
 *   is still in flight cancels the open it would have finished, so a sheet never
 *   pops up after the player has already moved on.
 * - Until the screen exists it is closed, so `isOpen` is `false`.
 * - A failed load is not swallowed. The rejection reaches the window as an
 *   unhandled rejection, which is what the stale-deploy notice listens for
 *   (`staleDeploy.ts`): a tab that outlived a deploy asks for a chunk the server
 *   no longer has, and the player should be told to reload. The failed promise
 *   is dropped, so the next open tries again.
 *
 * A screen that the End Turn flow must open by itself (a blocker) is a poor fit,
 * because a blocker expects the sheet to be up when its call returns. Use this
 * for sheets the player opens.
 *
 * Kept free of DOM types so the suite can drive it in Node.
 */

/** The part of a full-screen sheet's interface the stand-in forwards. */
export interface Overlay {
  readonly isOpen: boolean;
  // `never[]` so a sheet whose `open` takes arguments (the Compendium's entry
  // id) still satisfies this; the stand-in's own `open` keeps the real type.
  open(...args: never[]): void;
  close(): void;
  toggle(): void;
  dispose(): void;
}

export interface LazyOverlay<T extends Overlay> {
  readonly isOpen: boolean;
  open(...args: Parameters<T['open']>): void;
  close(): void;
  toggle(): void;
  dispose(): void;
  /** The built screen, or `null` until the first open has finished loading. */
  readonly screen: T | null;
  /** Loads and builds the screen if nothing has yet; every caller shares one load. */
  ready(): Promise<T>;
  /**
   * Fetches the screen's code without building it, so the first open does not
   * wait on the network. Errors are ignored here; a real open reports them.
   */
  prefetch(): void;
}

export interface LazyOverlayOptions<T extends Overlay> {
  /** Imports the screen's module and builds the screen. Called at most once per success. */
  load: () => Promise<T>;
  /** Imports the module only. Defaults to doing nothing. */
  prefetch?: () => Promise<unknown>;
}

export function lazyOverlay<T extends Overlay>(options: LazyOverlayOptions<T>): LazyOverlay<T> {
  let screen: T | null = null;
  let pending: Promise<T> | null = null;
  // Bumped by every request, so a load that finishes after a later close can
  // tell its open is no longer wanted.
  let ticket = 0;

  function ready(): Promise<T> {
    if (screen !== null) return Promise.resolve(screen);
    if (pending === null) {
      pending = options.load().then(
        (built) => {
          screen = built;
          return built;
        },
        (error: unknown) => {
          pending = null;
          throw error;
        },
      );
    }
    return pending;
  }

  function open(...args: Parameters<T['open']>): void {
    const mine = ++ticket;
    if (screen !== null) {
      (screen.open as (...a: Parameters<T['open']>) => void)(...args);
      return;
    }
    // No catch: a failed load must surface as an unhandled rejection (see the
    // module docblock).
    void ready().then((built) => {
      if (mine === ticket) (built.open as (...a: Parameters<T['open']>) => void)(...args);
    });
  }

  return {
    get isOpen(): boolean {
      return screen?.isOpen ?? false;
    },
    get screen(): T | null {
      return screen;
    },
    open,
    close(): void {
      ticket++;
      screen?.close();
    },
    toggle(): void {
      if (screen !== null) screen.toggle();
      else (open as () => void)();
    },
    dispose(): void {
      ticket++;
      screen?.dispose();
    },
    ready,
    prefetch(): void {
      if (screen !== null || options.prefetch === undefined) return;
      options.prefetch().catch(() => undefined);
    },
  };
}

/**
 * Runs `task` when the browser is idle, or after `fallbackMs` where
 * `requestIdleCallback` does not exist (Safari before 18).
 *
 * Used to fetch a lazy screen's code after the landing screen is up, so the
 * download stays off the page's load but is usually done before the first open.
 */
export function whenIdle(task: () => void, fallbackMs = 2000): void {
  const host = globalThis as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  // Called as a method on the global: a detached `requestIdleCallback` throws
  // "Illegal invocation" in browsers.
  if (typeof host.requestIdleCallback === 'function') {
    host.requestIdleCallback(task, { timeout: fallbackMs * 2 });
  } else {
    setTimeout(task, fallbackMs);
  }
}
