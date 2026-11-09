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
 * The shadow run of 2026-11-09 added these rows. Each is a kind of hand edit
 * that left a stale law or meter in a test:
 *
 *   · a removal: `.slots`, `.doctrines`, `.buildings` and `techsResearched`
 *     with `.pop(` or `.splice(`, and `.slots` with `.shift(` or `.unshift(`
 *   · the faiths: `.religions.push(` `.religions =` `.follower.push(`
 *     `.enhancer.push(` `.followers =`
 *   · the town: `.population =` `+=` `-=`, `.puppet =`, `delete ….puppet`,
 *     `.consecration =`, and `addBuilding(` (the helper that puts stones in a
 *     town)
 *   · the ground: `.improvement =`
 *   · the chairs: `.commissionsFulfilled =` `.commissionsFulfilled.push(`
 *
 * `state.turn =` is a source of the law too (a timed effect's label counts the
 * turns left), but it is not a row. Tests write it on cloned saves and after a
 * copy has been taken, where no memo is read, so the row would flag files that
 * are correct.
 *
 * Scoped to `test/sim` (with `test/sim/decks`) and `test/ui`, which are the
 * benches that ask the simulation a question. `test/mapgen` is outside it: it
 * writes terrain and reads no memo. `test/render` is outside it too, but not
 * because it reads no memo. Two of its files ask the simulation after a hand
 * edit (`lens3d.test.ts` through `pressureTotals`, `paintedCities.test.ts`
 * through `createUnit`) and call `bumpRevision` themselves. Thirteen more edit
 * the state by hand and do not announce, so bringing the folder in is a
 * decision of its own. A file passes by importing `bumpRevision` itself **or** by taking
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
  // The shadow run of 2026-11-09: the kinds of hand edit that left a stale answer.
  String.raw`\.slots\.(pop|splice|shift|unshift)\(`,
  String.raw`\.doctrines\.(pop|splice)\(`,
  String.raw`\.buildings\.(pop|splice)\(`,
  String.raw`techsResearched\.(pop|splice)\(`,
  String.raw`\.religions\.(push|splice)\(`,
  String.raw`\.religions\s*=(?![=>])`,
  String.raw`\.follower\.(push|splice)\(`,
  String.raw`\.enhancer\.(push|splice)\(`,
  String.raw`\.followers\s*=(?![=>])`,
  String.raw`\.population\s*(=(?![=>])|\+=|-=)`,
  String.raw`\.puppet\s*=(?![=>])`,
  String.raw`delete\s+[\w.!\[\]]+\.puppet\b`,
  String.raw`\.consecration\s*=(?![=>])`,
  String.raw`\baddBuilding\(`,
  String.raw`\.improvement\s*=(?![=>])`,
  String.raw`\.commissionsFulfilled\s*=(?![=>])`,
  String.raw`\.commissionsFulfilled\.push\(`,
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
  // The deck benches are `test/sim` too, and the glob above does not descend.
  ...(import.meta.glob('../sim/decks/*.ts', {
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
      "sc.slots.pop();",
      "city.buildings.splice(city.buildings.indexOf('imperialThrone'), 1);",
      "state.religions.push({ id, founderId, name: 'Faith', follower: [], enhancer: [] });",
      "religion.follower.push('theQuietHours');",
      "city.followers = { [religion]: count };",
      "city.population = 8;",
      "town.population += 3;",
      "city.puppet = true;",
      "delete state.cities[0]!.puppet;",
      "here.consecration = 'eternalFlame';",
      "addBuilding(state, holder, 'pyramids');",
      "at(state, 3, 4).improvement = 'holySite';",
      "sc.commissionsFulfilled = [{ card: RANKS, turn: state.turn }];",
    ];
    for (const line of caught) expect(HAND_MUTATION.test(line), line).toBe(true);
    const passed = [
      "expect(player.gold).toBe(5000);",
      "const rich = towns.filter((town) => town.buildings.length > 2);",
      "expect(sc.slots === null).toBe(false);",
      "const paid = lines.map((line) => line.gold => 0);",
      "if (player.gold >= cost) buy();",
      "expect(city.population).toBe(12);",
      "const grown = towns.filter((town) => town.population >= 4);",
      "if (city.puppet === true) annex();",
      "expect(field.improvement).toBe('farm');",
      "const sorted = city.buildings.slice().sort();",
    ];
    for (const line of passed) expect(HAND_MUTATION.test(line), line).toBe(false);
  });
});
