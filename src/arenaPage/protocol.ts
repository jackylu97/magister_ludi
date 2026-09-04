/**
 * What the page and one arena worker say to each other.
 *
 * A file of its own so that neither side imports the other for a type: the page
 * constructs the worker from a URL (`new Worker(new URL('./worker.ts', …))`) and
 * has no business pulling the worker's module graph — which is the whole
 * simulation — into the page's own bundle.
 *
 * Every message is plain JSON: it crosses a structured-clone boundary, so nothing
 * here may carry a function, a class instance or a `Map`.
 */

import type { ArenaSpec, GameReading } from './run';

/** One game, handed to one worker. */
export interface ArenaTask {
  /** Which of the run's games this is. The table's row order. */
  index: number;
  spec: ArenaSpec;
  /** Post a progress line every this many turns. Never zero. */
  progressEvery: number;
}

export interface ArenaProgress {
  kind: 'progress';
  index: number;
  turn: number;
}

export interface ArenaDone {
  kind: 'done';
  index: number;
  reading: GameReading;
}

/**
 * The worker threw. A refused command is *not* this — the driver reports those
 * as warnings on the reading, and a run that produced them still has numbers
 * worth reading.
 */
export interface ArenaFailed {
  kind: 'failed';
  index: number;
  error: string;
}

export type ArenaMessage = ArenaProgress | ArenaDone | ArenaFailed;
