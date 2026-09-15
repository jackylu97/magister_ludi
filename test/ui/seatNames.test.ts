/**
 * **A seat is called by its figure** — one reading, asserted by reading the
 * sources, in `test/ui/seatRoster.test.ts`' shape and for its reason.
 *
 * The user, 2026-09-15 (`docs/flags.md` (ppppp)): *"players should be identified
 * by their leader choice — let's retire the color naming scheme unless the user
 * has selected no leader"*. `seatName(state, id)` and `seatPeople(state, id)`
 * (`src/sim/leaderData.ts`) are the whole of that: the figure where there is
 * one, the ink's name where there is not, and the country word for the sentences
 * that want a nation.
 *
 * `Player.name` is untouched — it is what the config wrote and what a save
 * carries — which is exactly why this has to be a source test. A surface that
 * prints the field instead of the reading is not wrong in any way a behavioural
 * test can see: it prints *a* name, the right length, in the right slot, and it
 * happens to say "Crimson" in a game the player has been calling Pachacuti for
 * an hour. The only property that tells a correct file from a nearly-correct one
 * is which of the two it asked, and that property lives in the text.
 *
 * **The stated exceptions**, both of which show the ink's name on purpose:
 *
 *   · **the setup screen's palette** (`gameSetup.ts`'s `SEATS`) — the twelve
 *     inks a table is dealt from, each named as a colour beside its swatch. A
 *     seat has no figure yet at that point; the colour is the whole identity.
 *   · **the save shelf's label** (`savesPanel.ts`) — a saved world is named by
 *     the figure seat 0 sat under, and falls back to *the save's own name*,
 *     which is what the player called it. Never an invented one.
 *   · **`src/ai/wants.ts`' two refusal mirrors** — not prints at all. They
 *     rebuild a sentence the simulation's own `purchaseError`/rite refusal
 *     writes, in order to compare against it, so they must read the very field
 *     those sentences read. The day those refusals speak in figures, these two
 *     lines follow them, and not before.
 */

import { describe, expect, it } from 'vitest';

import { LEADER_IDS, leaderDef, seatName, seatPeople } from '../../src/sim/leaderData';
import { type PlayerSpec, newGame, realPlayers } from '../../src/sim/state';
import { rosterFor } from '../../src/ui/gameSetup';
import { seatLeaders } from '../../src/ui/leaderSelect';

/**
 * Every surface that could print a seat's name: the interface, the shell, the
 * bot's own words about seats, and the spectator page that draws them.
 */
const SOURCE = {
  ...(import.meta.glob('../../src/ui/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../../src/ai/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../../src/main.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../../src/spectate/main.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
};

/**
 * One file's source with its comments taken out — `seatRoster.test.ts`' helper
 * and its reason: every surface here explains itself by naming the thing it no
 * longer does, and matching the prose would make the docblocks unwritable.
 */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** By its whole path under `src/`, so the two `main.ts` cannot be confused. */
function sourceOf(file: string): string {
  const key = Object.keys(SOURCE).find((path) => path.endsWith(`/src/${file}`));
  expect(`${file} readable`).toBe(key === undefined ? `${file} missing` : `${file} readable`);
  return code(SOURCE[key!]!);
}

/**
 * What reading a `Player`'s own name looks like in the text.
 *
 * Three shapes, which is all of them: the roster indexed by id, the lookup by
 * id, and a variable holding a seat. The receiver names are the ones this
 * codebase actually gives a `Player` — a `town.name` or a `def.name` is a
 * different thing entirely and is left alone.
 */
const READS_THE_FIELD: readonly RegExp[] = [
  /\bplayers\s*\[[^\]]*\]\s*[!?]?\s*\??\.name\b/,
  /\bplayerById\s*\([^)]*\)\s*[!?]?\s*\??\.name\b/,
  /\b(?:player|seat|owner|local|enemy|founder|giver|winner)\s*[!?]?\s*\??\.name\b/,
];

/** The two mirrors above, allowed by what they are rather than by line number. */
function allowed(path: string, line: string): boolean {
  return path.endsWith('/wants.ts') && line.includes('refusal ===');
}

describe('a seat’s name', () => {
  it('is asked of the one reading everywhere it is printed, never off the field', () => {
    const offenders: string[] = [];
    for (const path of Object.keys(SOURCE).sort()) {
      const lines = code(SOURCE[path]!).split('\n');
      for (const [index, line] of lines.entries()) {
        if (!READS_THE_FIELD.some((shape) => shape.test(line))) continue;
        if (allowed(path, line)) continue;
        offenders.push(`${path}:${index + 1}: ${line.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('is asked at all — the reading is imported where the seats are named', () => {
    // The other half of the claim: a file that names nobody would pass the sweep
    // vacuously. These six are the surfaces the ruling names.
    for (const file of [
      'ui/topBar.ts',
      'ui/diplomacyScreen.ts',
      'ui/controls.ts',
      'ui/beadsScreen.ts',
      'ui/censusSheet.ts',
      'ui/tileReadout.ts',
      'main.ts',
      'spectate/main.ts',
    ]) {
      expect(sourceOf(file), file).toMatch(/\bseat(Name|People)\(/);
    }
    expect(sourceOf('ai/bot.ts')).toContain('seatName(state, player.id)');
    expect(sourceOf('main.ts')).toContain("from './sim/leaderData'");
  });

  it('leaves the two surfaces that show an ink’s name showing it', () => {
    // The setup screen's palette: twelve inks, each named as a colour. A seat
    // has no figure at that point and the swatch is the whole identity.
    expect(sourceOf('ui/gameSetup.ts')).toContain("{ name: 'Crimson'");
    // And the shelf's label falls back to what the player called the save.
    expect(sourceOf('ui/savesPanel.ts')).toContain('return slot.name;');
  });
});

describe('the two readings', () => {
  /** A table with a figure in seat 0 and nobody in seat 1. */
  function mixedTable() {
    return newGame({
      seed: 11,
      sizeName: 'duel',
      players: [
        { name: 'Crimson', color: '#d4502e', leader: 'pachacuti' },
        { name: 'Teal', color: '#1f8a85' },
      ],
      barbarians: true,
    });
  }

  it('call a figured seat by its figure, and its country by its people', () => {
    const state = mixedTable();
    expect(seatName(state, 0)).toBe('Pachacuti');
    expect(seatPeople(state, 0)).toBe('Inca');
    // And the seat keeps what the config wrote, untouched, for the save.
    expect(state.players[0]!.name).toBe('Crimson');
  });

  it('call a seat under nobody by its ink’s name, on both halves', () => {
    const state = mixedTable();
    expect(seatName(state, 1)).toBe('Teal');
    expect(seatPeople(state, 1)).toBe('Teal');
  });

  it('call the wild what the wild has always been called', () => {
    const state = mixedTable();
    const wild = state.players[state.players.length - 1]!;
    expect(wild.barbarian).toBe(true);
    expect(seatName(state, wild.id)).toBe(wild.name);
  });

  it('answer plainly for an id nobody sits at, rather than saying “undefined”', () => {
    const state = mixedTable();
    expect(seatName(state, 99)).toBe('an empire');
    expect(seatPeople(state, 99)).toBe('an empire');
  });

  it('give every figure on the sheet a people word the sentences can use', () => {
    for (const id of LEADER_IDS) {
      const def = leaderDef(id);
      expect(def.people.length, def.name).toBeGreaterThan(0);
      // Bare, without the article: every sentence writes its own "the".
      expect(def.people.startsWith('the '), def.name).toBe(false);
    }
  });
});

describe('two seats', () => {
  it('never share a name — the table deals each figure once', () => {
    const table: PlayerSpec[] = seatLeaders(rosterFor(6), 'pachacuti', 4);
    const state = newGame({ seed: 4, sizeName: 'standard', players: table, barbarians: true });
    const called = realPlayers(state).map((player) => seatName(state, player.id));
    expect(new Set(called).size).toBe(called.length);
    expect(called[0]).toBe('Pachacuti');
  });

  it('never share a figure, whichever figure the player takes', () => {
    for (const chosen of LEADER_IDS) {
      const table = seatLeaders(rosterFor(6), chosen, 9);
      const figures = table.map((spec) => spec.leader).filter((id) => id !== undefined);
      expect(new Set(figures).size, chosen).toBe(figures.length);
      expect(table[0]!.leader, chosen).toBe(chosen);
    }
  });
});
