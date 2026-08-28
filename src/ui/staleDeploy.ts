/**
 * The stale-deploy notice: what to say when the page the player is holding is
 * older than the one on the server.
 *
 * The failure this exists for is invisible from inside the game. A deploy
 * replaces every hashed chunk under `/assets/`; a tab that was open before it
 * keeps running the old entry module, and the moment it reaches for a chunk it
 * has not loaded yet — the star chart, the Compendium, the Abacus — the request
 * 404s and the dynamic `import()` rejects. Nothing on screen changes. The
 * player presses the button again, and again, and files a bug about a screen
 * that will not open.
 *
 * So: one persistent card, in the toast idiom, saying the one true thing and
 * offering the one action that fixes it.
 *
 * Persistent, and that is the whole difference from a toast
 * ---------------------------------------------------------
 * Every other announcement in this interface is news — it happened, it is over,
 * it fades after a beat (`toasts.ts`). This is a **condition**: the page is old
 * and stays old until it is reloaded, so a card that faded would be a card the
 * player misses and then goes on pressing a dead button. It has no timer, it is
 * not in the stack the toast trimmer walks, and it takes pointer events because
 * it carries a control.
 *
 * Once, whatever happens next
 * ---------------------------
 * A stale chunk is not one failure. The player clicks the chart, it fails; they
 * click it again, it fails again; a preload the router fired in the background
 * fails a third time; each of those may arrive as *both* a `vite:preloadError`
 * and an `unhandledrejection`. So the latch is the module's real mechanism and
 * it is separated from the DOM on purpose (`createStaleDeployLatch`): a stack of
 * five identical cards is a worse bug than the one being reported.
 *
 * The matcher is a list of sentences, not a rule
 * ----------------------------------------------
 * There is no error *type* for "the chunk was not there". Every engine words it
 * differently and some of them do not mention the module at all — Safari says
 * "Importing a module script failed", a server that answers a missing asset with
 * its index page produces a MIME-type complaint, and Vite's own preload helper
 * says it could not preload a stylesheet. `STALE_PATTERNS` is that list, matched
 * case-insensitively, and it is deliberately a little wide: the cost of a false
 * positive is one dismissible card offering a refresh, and the cost of a false
 * negative is the bug this file is about.
 *
 * Testable without a DOM
 * ----------------------
 * The suite is `environment: 'node'` (`vite.config.ts`), and the two halves that
 * can be *quietly wrong* — which messages count, and how many cards one bad
 * deploy produces — are both pure. `installStaleDeployWatch` takes an
 * `EventTarget` rather than reaching for `window`, so the wiring itself is
 * exercised against a bare target with no browser in the room.
 */

/**
 * What a failed chunk load says, across the engines and the ways a server can
 * answer a missing asset.
 *
 * Every one of these is a real sentence from a real failure rather than a guess:
 * the first two are Chromium and Firefox's wording for a rejected dynamic
 * `import()`, the third is Safari's, the fourth is Vite's own preload helper,
 * the fifth is a bundler-agnostic "chunk N failed", and the last is what a
 * single-page host does when it answers a missing `.js` with `index.html`.
 */
const STALE_PATTERNS: readonly RegExp[] = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /unable to preload (css|stylesheet)/i,
  /loading (chunk|css chunk)\s*\S*\s*failed/i,
  /is not a valid javascript mime type/i,
];

/**
 * Does this message read as a chunk that never arrived?
 *
 * Takes `unknown` rather than `string` because every caller has one: an
 * `ErrorEvent`'s `message` is typed but a rejection's `reason` is `any`, a
 * `CustomEvent`'s `detail` is `any`, and a handler that narrowed each of them at
 * its own call site would be three narrowings that can disagree. Anything that
 * is not a string, or is a string none of the patterns match, is not ours.
 */
export function isStaleDeployError(message: unknown): boolean {
  const text = messageText(message);
  if (text === null) return false;
  return STALE_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * The sentence inside whatever was thrown.
 *
 * An `Error` carries it on `.message`, a rejection may be the error itself or
 * the string, and Vite's `vite:preloadError` carries the error under
 * `.payload`. Exported for the test that pins the unwrapping, which is the half
 * of the matcher that is easy to get silently wrong: an `Error` stringified by
 * `String()` reads "Error: …" and would still match, but a `{ message }` object
 * would stringify to "[object Object]" and never match anything.
 */
export function messageText(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  if (typeof value === 'object' && value !== null) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return null;
}

/**
 * The once-only latch, with no DOM anywhere near it.
 *
 * Returns the function every listener funnels through: hand it whatever the
 * event carried, and `onStale` runs at most once for the life of the latch.
 * Separated from the wiring because "how many cards does one bad deploy make"
 * is the question a stack of duplicates would answer wrongly, and it is a
 * question a unit test can ask.
 */
export function createStaleDeployLatch(onStale: () => void): (message: unknown) => void {
  let fired = false;
  return (message: unknown): void => {
    if (fired) return;
    if (!isStaleDeployError(message)) return;
    fired = true;
    onStale();
  };
}

/** What one event was *about*, across the three shapes a chunk failure arrives in. */
function payloadOf(event: Event): unknown {
  const carrier = event as Event & {
    message?: unknown;
    error?: unknown;
    reason?: unknown;
    payload?: unknown;
  };
  // Vite's own event, and the only one that is unambiguous — it fires for
  // exactly this failure and nothing else. Read first so a preload error with
  // an unhelpful message still reaches the matcher through its payload.
  if (event.type === 'vite:preloadError') return carrier.payload;
  if (event.type === 'unhandledrejection') return carrier.reason;
  // A window `error` event carries the sentence on `message` and the thrown
  // value on `error`; the sentence is the one the engines word consistently.
  return carrier.message ?? carrier.error;
}

/** The three event names a failed chunk load can reach a page under. */
const STALE_EVENTS = ['vite:preloadError', 'error', 'unhandledrejection'] as const;

/** What `installStaleDeployWatch` hands back, so a caller can take it down again. */
export interface StaleDeployWatch {
  /** Removes every listener. Idempotent. */
  dispose(): void;
}

/**
 * Listens for a failed chunk load on `target` and calls `onStale` once.
 *
 * `target` is a parameter rather than `window` for the reason at the top of the
 * file: the wiring is the half most likely to be wrong (a listener on the wrong
 * event name fires never, and nothing about that is visible) and a bare
 * `EventTarget` is enough to prove it in a suite with no browser.
 *
 * The listeners stay attached after the latch has fired. Removing them would be
 * one more thing to get right for no gain: the latch already refuses the second
 * call, and a page that is going to be reloaded has nothing to tidy.
 */
export function installStaleDeployWatch(options: {
  target: EventTarget;
  onStale: () => void;
}): StaleDeployWatch {
  const { target, onStale } = options;
  const latch = createStaleDeployLatch(onStale);
  const handler = (event: Event): void => latch(payloadOf(event));
  for (const name of STALE_EVENTS) target.addEventListener(name, handler);
  return {
    dispose(): void {
      for (const name of STALE_EVENTS) target.removeEventListener(name, handler);
    },
  };
}

/** The words on the card. One sentence, and it says what to do about it. */
export const STALE_DEPLOY_TEXT = 'A new version of the game is available — refresh to load it';

/**
 * Puts the card up, once, the first time a chunk fails to load.
 *
 * The DOM half, and the only part of this file a test does not touch: it builds
 * one element and calls `location.reload`, both of which are exactly as
 * interesting as they look. Everything that could be *quietly* wrong is above
 * it.
 *
 * The card is appended to `document.body` rather than into the toast container,
 * for the reason in the module docblock: `toasts.clear()` empties that box on a
 * new game or a load, and a stale page is still stale after either.
 */
export function createStaleDeployNotice(
  target: EventTarget = window,
  reload: () => void = () => location.reload(),
): StaleDeployWatch {
  return installStaleDeployWatch({
    target,
    onStale: () => {
      const card = document.createElement('div');
      card.className = 'toast stale-notice';
      // A live region, because nothing about this is a response to something the
      // player just did: the failure they saw was a button that did nothing.
      card.setAttribute('role', 'status');
      card.setAttribute('aria-live', 'polite');

      const text = document.createElement('span');
      text.className = 'toast-text';
      text.textContent = STALE_DEPLOY_TEXT;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'stale-notice-refresh';
      button.textContent = 'Refresh';
      button.addEventListener('click', () => reload());

      card.append(text, button);
      document.body.append(card);
    },
  });
}
