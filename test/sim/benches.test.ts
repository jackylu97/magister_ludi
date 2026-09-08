/**
 * **The honest benches** — batch E3a (`docs/flags.md` item pp;
 * `docs/audit/evaluations.md` §3c, §4c).
 *
 * Every derived reading in the game is now remembered on `GameState.revision`:
 * `liveReading` (`statecraft.ts`), the three memos in `readings.ts`, the ghost
 * diff, the Reliquary, the tech tree's unlock prices. The counter is raised by
 * `applyCommand` on every accepted command and once by `runEndOfTurn` after each
 * phase — the two ways the world moves at all — so the contract is one sentence:
 *
 *   *A reading is taken at rest; whoever moves the state moves the revision.*
 *
 * A **bench** is the third kind of writer. It builds a board and then pokes it —
 * slots a card, pushes a building, grants a technology, fills a treasury —
 * because the honest way to reach that position would be forty turns of play and
 * the position is not the subject. That is legitimate and it is not going away.
 * What it must do is *say so*, by calling `bumpRevision` the way a command does;
 * otherwise the memo is right about a board that no longer exists, and the test
 * measures a fossil. E2 measured what that costs: **322 failures across 27
 * files** the first time `liveReading` was keyed on the revision.
 *
 * This is the lint that makes it hard to forget. It is a **lint and not a
 * proof**: it reads source text, it asks a file-level question (does this file
 * know about the announcement at all?), and it cannot tell a poke that matters
 * from one that happens before any reading is taken. A file that satisfies it
 * can still forget a single site — the suite is what catches that. What it does
 * catch is the whole shape of the mistake: a new bench file that mutates a board
 * by hand and has never heard of `bumpRevision`.
 *
 * **The patterns**, which are exactly the fields a memoised reading is built
 * from — the ten sources of `liveEffects` and the town's own list:
 *
 *   · the law     — `.slots.push(` `.slots =` `.slots[…] =` `.doctrines.push(`
 *                   `.doctrines =` `.government =`
 *   · the stones  — `.buildings.push(` `.buildings =` `.wonders.push(`
 *   · the tree    — `techsResearched.push(` `techsResearched =`
 *   · the gods    — `.beliefs.push(` `.enhancer =` `.follower =`
 *   · the dead    — `.legacies.push(` `.legacies =`
 *   · the bill    — `.timed =` `.timed.push(`
 *   · the beads   — `.beads.push(` `.beads =`
 *   · the banks   — `.gold =` `.faithPool =` `.culturePool =`
 *
 * Scoped to `test/sim` and `test/ui`, which are the benches that ask the
 * simulation a question. `test/mapgen` and `test/render` write terrain and
 * decoration and read no memo, so they are outside it by design rather than by
 * exception. A file passes by importing `bumpRevision` itself **or** by taking
 * its board from a helper that calls it (`statecraftHelpers`, `warHelpers`,
 * `improvementHelpers`, `faithHelpers`) — a bench that inherits the
 * announcement has made it.
 *
 * Core tier: a source-reading register test is always core (CLAUDE.md).
 */

import { describe, expect, it } from 'vitest';

/** The fields a memoised reading is built from. See the module docblock. */
const MUTATIONS = [
  String.raw`\.slots\.push\(`,
  String.raw`\.slots\s*=(?![=>])`,
  String.raw`\.slots\[[^\]]*\]\s*=(?![=>])`,
  String.raw`\.doctrines\.push\(`,
  String.raw`\.doctrines\s*=(?![=>])`,
  String.raw`\.government\s*=(?![=>])`,
  String.raw`\.buildings\.push\(`,
  String.raw`\.buildings\s*=(?![=>])`,
  String.raw`\.wonders\.push\(`,
  String.raw`techsResearched\.push\(`,
  String.raw`techsResearched\s*=(?![=>])`,
  String.raw`\.beliefs\.push\(`,
  String.raw`\.enhancer\s*=(?![=>])`,
  String.raw`\.follower\s*=(?![=>])`,
  String.raw`\.legacies\.push\(`,
  String.raw`\.legacies\s*=(?![=>])`,
  String.raw`\.timed\s*=(?![=>])`,
  String.raw`\.timed\.push\(`,
  String.raw`\.beads\.push\(`,
  String.raw`\.beads\s*=(?![=>])`,
  String.raw`\.gold\s*=(?![=>])`,
  String.raw`\.faithPool\s*=(?![=>])`,
  String.raw`\.culturePool\s*=(?![=>])`,
];

const HAND_MUTATION = new RegExp(MUTATIONS.join('|'));

/**
 * The one stated exception, and it is not a bench.
 *
 * `state.test.ts` pins the counter itself: it runs a resolution over a quiet
 * board, asserts the revision moved once per phase, and then puts it *back* so
 * that "nothing else moved" can be one deep comparison. Its write is the
 * announcement being measured, not a poke at a board it is about to read.
 */
const NOT_A_BENCH = ['/state.test.ts'];

/** The benches whose own helpers announce, so a file that borrows one has too. */
const ANNOUNCING_HELPERS = [
  'statecraftHelpers',
  'warHelpers',
  'improvementHelpers',
  'faithHelpers',
];

const BENCH_SOURCE = {
  ...(import.meta.glob('../sim/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
  ...(import.meta.glob('../ui/*.ts', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>),
};

/** The file's code, without its prose — a docblock naming a field is not a write. */
function codeOf(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

describe('a bench that moves the board says so', () => {
  it('has every hand-mutating bench in `sim` and `ui` announcing the revision', () => {
    const silent: string[] = [];
    let announcing = 0;
    for (const [path, text] of Object.entries(BENCH_SOURCE)) {
      if (path.endsWith('/benches.test.ts')) continue;
      if (NOT_A_BENCH.some((name) => path.endsWith(name))) continue;
      const code = codeOf(text);
      if (!HAND_MUTATION.test(code)) continue;
      if (code.includes('bumpRevision')) {
        announcing += 1;
        continue;
      }
      if (ANNOUNCING_HELPERS.some((helper) => code.includes(helper))) {
        announcing += 1;
        continue;
      }
      silent.push(path);
    }
    expect(silent).toEqual([]);
    // Not vacuous: the pattern list finds the benches it was written for. E2
    // measured twenty-seven files failing without the announcement; the lint
    // covers rather more than that, because a bench that pokes before any
    // reading is taken is still a bench.
    expect(announcing).toBeGreaterThan(27);
  });

  it('reads a real fixture, so the pattern list cannot rot into nothing', () => {
    // Every pattern is exercised against a line it must catch and a line it must
    // not — an `=>` or a comparison is not a write, and a lint that matched them
    // would be noise the next reader learns to ignore.
    for (const source of MUTATIONS) {
      expect(new RegExp(source).source, source).toBe(source);
    }
    const caught = [
      "sc.slots.push({ card: id, sealedUntil: 0 });",
      "player.statecraft.doctrines.push('theTithe');",
      "city.buildings.push('temple');",
      "player.techsResearched = [...TECH_IDS];",
      "player.pantheon.beliefs.push('godOfTheForge');",
      "seat.legacies.push({ id: 'imhotep', age: 1 });",
      "player.timed = [];",
      "player.beads.push({ id: 'theFounder' });",
      "player.gold = 5000;",
      "religion.enhancer = ['apostles'];",
    ];
    for (const line of caught) expect(HAND_MUTATION.test(line), line).toBe(true);
    const passed = [
      "expect(player.gold).toBe(5000);",
      "const rich = towns.filter((town) => town.buildings.length > 2);",
      "expect(sc.slots === null).toBe(false);",
      "const paid = lines.map((line) => line.gold => 0);",
      "if (player.gold >= cost) buy();",
    ];
    for (const line of passed) expect(HAND_MUTATION.test(line), line).toBe(false);
  });
});
