/**
 * The page's last uncaught errors, kept for a problem report
 * (`problemReport.ts`).
 *
 * A playtester rarely has the developer tools open, so an error that a click
 * threw is gone by the time they describe it. This keeps the last few, with
 * the time, the message, where the browser said it was thrown and the first
 * lines of the stack.
 *
 * It listens to the window's `error` and `unhandledrejection` events and
 * nothing else. It never wraps `console`, so what the developer tools show is
 * unchanged, and a message the game only logs is not kept. `target` and `now`
 * are parameters, as in `installStaleDeployWatch`, so the suite can drive it
 * with a bare `EventTarget` and a fixed clock.
 */

import { messageText } from './staleDeploy';

/** One error the page saw: when, what it said, and where, when the browser said. */
export interface ReportError {
  /** Epoch milliseconds. */
  at: number;
  message: string;
  where?: string;
  stack?: string;
}

/** How many errors the log keeps. The newest are kept. */
export const ERROR_LINES = 20;

/** The page's recent errors. */
export interface ErrorLog {
  /** The errors kept, oldest first. A copy. */
  lines(): ReportError[];
  /** Removes the listeners. */
  dispose(): void;
}

/** The first lines of a stack, which is where the cause is. */
function shortStack(value: unknown): string | undefined {
  const stack = value instanceof Error ? value.stack : undefined;
  if (typeof stack !== 'string' || stack === '') return undefined;
  return stack.split('\n').slice(0, 8).join('\n');
}

/** Starts keeping the errors `target` reports. See the module docblock. */
export function createErrorLog(
  target: EventTarget,
  now: () => number = () => Date.now(),
  cap: number = ERROR_LINES,
): ErrorLog {
  const kept: ReportError[] = [];
  const keep = (line: ReportError): void => {
    kept.push(line);
    if (kept.length > cap) kept.shift();
  };
  const onError = (event: Event): void => {
    const carrier = event as Event & { message?: unknown; error?: unknown; filename?: unknown; lineno?: unknown };
    const message = messageText(carrier.message) ?? messageText(carrier.error) ?? 'An error with no message';
    const where =
      typeof carrier.filename === 'string' && carrier.filename !== ''
        ? `${carrier.filename}:${String(carrier.lineno ?? '?')}`
        : undefined;
    const stack = shortStack(carrier.error);
    keep({ at: now(), message, ...(where ? { where } : {}), ...(stack ? { stack } : {}) });
  };
  const onRejection = (event: Event): void => {
    const reason = (event as Event & { reason?: unknown }).reason;
    const message = messageText(reason) ?? String(reason);
    const stack = shortStack(reason);
    keep({ at: now(), message: `Unhandled promise rejection: ${message}`, ...(stack ? { stack } : {}) });
  };
  target.addEventListener('error', onError);
  target.addEventListener('unhandledrejection', onRejection);
  return {
    lines: () => kept.map((line) => ({ ...line })),
    dispose(): void {
      target.removeEventListener('error', onError);
      target.removeEventListener('unhandledrejection', onRejection);
    },
  };
}
