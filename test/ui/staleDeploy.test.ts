/**
 * The stale-deploy notice: which failures count, and how many cards one bad
 * deploy makes.
 *
 * Both halves fail *silently* in the browser, which is the whole reason this
 * file exists:
 *
 *   · a matcher that is too narrow shows nothing at all, and the player goes on
 *     pressing a button that does nothing — the exact bug the notice was written
 *     for, now with a fix installed that never fires;
 *   · a latch that does not hold stacks a card per rejection, and one stale
 *     chunk rejects several times (a click, a retry, a background preload) and
 *     may arrive twice per rejection (`vite:preloadError` *and*
 *     `unhandledrejection`).
 *
 * The suite has no DOM (`vite.config.ts` — `environment: 'node'`), which is why
 * `installStaleDeployWatch` takes an `EventTarget` rather than reaching for
 * `window`: a bare target is enough to prove the wiring, and `EventTarget` and
 * `Event` are both node globals. The card itself — one element and a
 * `location.reload` — is the part left uncovered, and it is left uncovered on
 * purpose: everything about it that could be wrong is visible in a diff.
 */

import { describe, expect, it, vi } from 'vitest';

import {
  STALE_DEPLOY_TEXT,
  createStaleDeployLatch,
  installStaleDeployWatch,
  isStaleDeployError,
  messageText,
} from '../../src/ui/staleDeploy';

/** The real sentences, one per engine and per way a host can answer a gone asset. */
const REAL_FAILURES = [
  'Failed to fetch dynamically imported module: https://example.test/assets/techTree-a91f2c.js',
  'error loading dynamically imported module: /assets/compendium-7d1e.js',
  'Importing a module script failed.',
  'Unable to preload CSS for /assets/index-4b2a.css',
  'Loading chunk 42 failed.',
  "Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of \"text/html\". Strict MIME type checking is enforced for module scripts per HTML spec. 'text/html' is not a valid JavaScript MIME type.",
];

describe('the matcher', () => {
  it('recognises every wording a gone chunk arrives under', () => {
    for (const message of REAL_FAILURES) {
      expect(isStaleDeployError(message)).toBe(true);
    }
  });

  it('leaves the game’s own errors alone', () => {
    for (const message of [
      'Missing element #viewport',
      'resourceMarks: a polygon needs pairs of coordinates, got 5',
      'Cannot read properties of undefined (reading “col”)',
      'WebGL context lost',
      '',
    ]) {
      expect(isStaleDeployError(message)).toBe(false);
    }
  });

  it('is not fooled by a value that is not a sentence at all', () => {
    for (const value of [null, undefined, 42, {}, [], { detail: 'chunk' }]) {
      expect(isStaleDeployError(value)).toBe(false);
    }
  });

  /**
   * The unwrapping is the quiet half. An `Error` stringified by `String()` would
   * still match, but a bare `{ message }` — which is what a structured-clone of
   * a rejection reason can arrive as — would stringify to `[object Object]` and
   * never match anything at all.
   */
  it('reads the sentence out of whatever it was handed', () => {
    expect(messageText('plain')).toBe('plain');
    expect(messageText(new Error('wrapped'))).toBe('wrapped');
    expect(messageText({ message: 'shaped' })).toBe('shaped');
    expect(messageText({ message: 7 })).toBeNull();
    expect(messageText(null)).toBeNull();
    expect(isStaleDeployError(new Error(REAL_FAILURES[0]!))).toBe(true);
    expect(isStaleDeployError({ message: REAL_FAILURES[1]! })).toBe(true);
  });
});

describe('the latch', () => {
  it('fires once and never again, however many failures follow', () => {
    const onStale = vi.fn();
    const latch = createStaleDeployLatch(onStale);
    for (let i = 0; i < 5; i++) latch(REAL_FAILURES[0]);
    latch(REAL_FAILURES[3]);
    expect(onStale).toHaveBeenCalledTimes(1);
  });

  it('does not fire at all for something that is not a stale chunk', () => {
    const onStale = vi.fn();
    const latch = createStaleDeployLatch(onStale);
    latch('Missing element #viewport');
    latch(undefined);
    expect(onStale).not.toHaveBeenCalled();
  });

  /**
   * A game error first must not *arm* the latch — it must leave it waiting, so
   * the real failure that follows is still announced. The bug this guards
   * against is a latch that marks itself fired before it has decided.
   */
  it('is still armed after a failure that was not ours', () => {
    const onStale = vi.fn();
    const latch = createStaleDeployLatch(onStale);
    latch('WebGL context lost');
    latch(REAL_FAILURES[2]);
    expect(onStale).toHaveBeenCalledTimes(1);
  });
});

describe('the wiring', () => {
  /** An event of `type`, carrying whatever properties that shape puts on it. */
  function fire(target: EventTarget, type: string, props: Record<string, unknown>): void {
    const event = new Event(type);
    Object.assign(event, props);
    target.dispatchEvent(event);
  }

  it('hears Vite’s own preload error, through its payload', () => {
    const target = new EventTarget();
    const onStale = vi.fn();
    installStaleDeployWatch({ target, onStale });
    fire(target, 'vite:preloadError', { payload: new Error(REAL_FAILURES[0]!) });
    expect(onStale).toHaveBeenCalledTimes(1);
  });

  it('hears a window error, through its message', () => {
    const target = new EventTarget();
    const onStale = vi.fn();
    installStaleDeployWatch({ target, onStale });
    fire(target, 'error', { message: REAL_FAILURES[2]! });
    expect(onStale).toHaveBeenCalledTimes(1);
  });

  it('hears an unhandled rejection, through its reason', () => {
    const target = new EventTarget();
    const onStale = vi.fn();
    installStaleDeployWatch({ target, onStale });
    fire(target, 'unhandledrejection', { reason: new Error(REAL_FAILURES[1]!) });
    expect(onStale).toHaveBeenCalledTimes(1);
  });

  /**
   * The real sequence, and the one the card must survive: one dead chunk
   * reaching the page three times under two event names.
   */
  it('shows one card for one bad deploy, whatever route the news takes', () => {
    const target = new EventTarget();
    const onStale = vi.fn();
    installStaleDeployWatch({ target, onStale });
    fire(target, 'vite:preloadError', { payload: new Error(REAL_FAILURES[0]!) });
    fire(target, 'unhandledrejection', { reason: new Error(REAL_FAILURES[0]!) });
    fire(target, 'error', { message: REAL_FAILURES[0]! });
    expect(onStale).toHaveBeenCalledTimes(1);
  });

  it('ignores the game’s own thrown errors on the same events', () => {
    const target = new EventTarget();
    const onStale = vi.fn();
    installStaleDeployWatch({ target, onStale });
    fire(target, 'error', { message: 'Missing element #viewport' });
    fire(target, 'unhandledrejection', { reason: new Error('That save is no longer there.') });
    expect(onStale).not.toHaveBeenCalled();
  });

  it('can be taken down again', () => {
    const target = new EventTarget();
    const onStale = vi.fn();
    const watch = installStaleDeployWatch({ target, onStale });
    watch.dispose();
    fire(target, 'error', { message: REAL_FAILURES[0]! });
    expect(onStale).not.toHaveBeenCalled();
  });
});

describe('what the card says', () => {
  it('is one sentence, and it names the action', () => {
    expect(STALE_DEPLOY_TEXT).toBe(
      'A new version of the game is available — refresh to load it',
    );
    // Prose, so hard rule 7 applies: no digits, no identifiers, no jargon about
    // chunks or modules — a player has never heard of either.
    expect(STALE_DEPLOY_TEXT).not.toMatch(/\d/);
    expect(STALE_DEPLOY_TEXT.toLowerCase()).not.toMatch(/chunk|module|import|asset/);
  });
});
