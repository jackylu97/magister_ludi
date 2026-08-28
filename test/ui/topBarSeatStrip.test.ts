/**
 * The seat strip is a hot-seat harness, not information an ordinary game
 * needs to print: the current player is extraneous the moment there is only
 * one human at the table (user report, 2026-08-28). `showsSeatStrip`
 * (`src/ui/controls.ts`) is the pure rule `renderSeats` (`src/main.ts`) gates
 * the strip's `hidden` attribute on, pulled out so it can be pinned without a
 * `GameControls` instance or a DOM behind it — `lensShowsYields`'s reason
 * exactly.
 *
 * Behavioural, on a real `GameState` from `newGame`, rather than a source
 * grep: the claim is about what the function returns for a one-human game and
 * a hot-seat sandbox, and a real state is the only way to be sure `isHuman`
 * and `realPlayers` (which the wild must never pass) actually compose the way
 * the docblock says.
 */

import { describe, expect, it } from 'vitest';

import { showsSeatStrip } from '../../src/ui/controls';
import { newGame } from '../../src/sim/state';

describe('the top-bar seat strip', () => {
  it('is hidden in the one-human game the product ships', () => {
    const state = newGame({
      seed: 1,
      sizeName: 'duel',
      players: [{ name: 'Crimson', color: '#d4502e', isHuman: true }],
      barbarians: true,
    });
    expect(showsSeatStrip(state)).toBe(false);
  });

  it('is shown once the hot-seat sandbox seats a second human', () => {
    const state = newGame({
      seed: 1,
      sizeName: 'duel',
      players: [
        { name: 'Crimson', color: '#d4502e', isHuman: true },
        { name: 'Teal', color: '#1f8a85', isHuman: true },
      ],
      barbarians: true,
    });
    expect(showsSeatStrip(state)).toBe(true);
  });

  it('does not count the barbarian seat as a second human', () => {
    // `newGame` appends the wild last (design-notes Entry XX) whether or not
    // `barbarians` is passed; a solo game with the wild seated must still
    // read as one human.
    const solo = newGame({
      seed: 1,
      sizeName: 'duel',
      players: [{ name: 'Crimson', color: '#d4502e', isHuman: true }],
      barbarians: true,
    });
    expect(solo.players.length).toBe(2); // Crimson + the wild
    expect(showsSeatStrip(solo)).toBe(false);
  });

  it('would not be tripped by a future AI seat, which is not somebody to switch to', () => {
    const state = newGame({
      seed: 1,
      sizeName: 'duel',
      players: [
        { name: 'Crimson', color: '#d4502e', isHuman: true },
        { name: 'Teal', color: '#1f8a85', isHuman: false },
      ],
      barbarians: true,
    });
    expect(showsSeatStrip(state)).toBe(false);
  });
});
