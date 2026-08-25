/**
 * One rule, asserted by reading the sources: **the interface never sweeps
 * `state.players` itself.**
 *
 * The wild is a `Player` (design ledger, Entry XX) so that combat, stacking,
 * movement and fog need no second implementation, and `realPlayers` is the one
 * register for "who counts". The simulation has obeyed that from the start. The
 * *interface* quietly had not: the top-bar seat strip drew a "Barbarians ✓"
 * chip in every solo game, the Abacus strung it a scoring rod, the status
 * line's waiting list would have named it, and the hot-seat cycle re-wrote the
 * exclusion by hand. Four surfaces, one of which was written after the trap note
 * that says not to.
 *
 * A behavioural test would have caught one of the four. This catches the fifth,
 * which is the one that matters: the failure mode of a missed roster is a chip
 * nobody notices for a milestone, and the only property that distinguishes a
 * correct file from a nearly-correct one is *which function it asked*. So the
 * test is the same shape as `test/sim/cities.test.ts`'s assertion about
 * `assignCitizens`' callers — it reads the source, because that is where the
 * property lives.
 *
 * The rule is precise rather than blanket, and the distinction is the whole
 * point:
 *
 *   · `state.players[someId]` — **allowed**. An id lookup asks "who is this",
 *     and a barbarian unit's owner has a name and a colour like anybody else.
 *     The unit sheet, the city banners and the star chart all do this and are
 *     right to.
 *   · `state.players` anything else — **refused**. A `for…of`, a `.map`, a
 *     `.filter`, a `.length`: every one of those is "one row per seat", and one
 *     row per seat is exactly the question `realPlayers` answers.
 *
 * `config.players` is a different array — the *seat specs* a game was started
 * from, which the wild is never in (it is appended by `seatBarbarians` at
 * `newGame`) — so the load list's seat count is untouched by this and correctly
 * so.
 */

import { describe, expect, it } from 'vitest';

import { type Player, newGame, realPlayers } from '../../src/sim/state';

/**
 * The interface's own text. Read through Vite's raw glob rather than through
 * `node:fs`, for the reason `test/sim/cities.test.ts` gives where it does the
 * same thing: this project has no node typings and a source assertion is not
 * worth a dependency.
 */
const UI_SOURCE = {
  ...(import.meta.glob('../../src/ui/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../../src/main.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
};

/**
 * One file's source with its comments taken out.
 *
 * Comments are where the rule is *explained*, and every surface this covers
 * explains itself by naming the thing it no longer does. Matching them would
 * make the docblocks unwritable.
 */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function sourceOf(file: string): string {
  const key = Object.keys(UI_SOURCE).find((path) => path.endsWith(`/${file}`));
  expect(`${file} readable`).toBe(key === undefined ? `${file} missing` : `${file} readable`);
  return code(UI_SOURCE[key!]!);
}

describe('the seat roster', () => {
  it('is asked of realPlayers everywhere in the interface, never swept by hand', () => {
    // Anything but an immediate `[` after `state.players` is a sweep.
    const sweep = /\bstate\.players\s*(?!\[)/;
    const offenders: string[] = [];
    for (const path of Object.keys(UI_SOURCE).sort()) {
      const lines = code(UI_SOURCE[path]!).split('\n');
      for (const [index, line] of lines.entries()) {
        if (sweep.test(line)) offenders.push(`${path}:${index + 1}: ${line.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('is asked at all — the register is imported where the rosters are drawn', () => {
    // The other half of the claim: a file with no `state.players` in it at all
    // would pass the sweep test vacuously. These two draw one row per seat.
    expect(sourceOf('main.ts')).toContain('realPlayers(');
    expect(sourceOf('controls.ts')).toContain('realPlayers(');
  });

  it('leaves the wild out of a solo game, which is what the surfaces draw', () => {
    // The behavioural half, so the rule is not only a grep: a solo game seats
    // two `Player`s and exactly one of them is somebody at the table.
    const state = newGame({
      seed: 7,
      sizeName: 'duel',
      players: [{ name: 'Solo', color: '#c0392b' }],
      barbarians: true,
    });
    expect(state.players.length).toBe(2);
    const seats: Player[] = realPlayers(state);
    expect(seats.map((player) => player.name)).toEqual(['Solo']);
    expect(seats.every((player) => player.barbarian !== true)).toBe(true);
  });
});
