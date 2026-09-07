/**
 * **The readings** — batch E2 (`docs/flags.md` item pp;
 * `docs/audit/evaluations.md` §2b, §3a, §4b step 8).
 *
 * The user, 2026-09-07: *"information flows one way; downstream subscribers
 * never publish upwards and subscribe to a single source of truth rather than
 * recalculating; variables are cached and updated with the user's actions, so
 * yields that have not changed are not recalculated."*
 *
 * Three claims, and each is a way the batch could be wrong while every number
 * still added up:
 *
 *   1. **The list is the artefact.** `cityQuote` returns the labelled list its
 *      flats are the fold of, every line carries a step of `docs/yields.md` and
 *      a class, and `flats` is `foldQuoteLines(lines)` and nothing else. A
 *      summand folded without a line would balance and would be invisible.
 *   2. **The revision is the subscription.** A reading is handed back unchanged
 *      while the world has not moved and rebuilt the moment it has — and the
 *      counter moves on an accepted command, never on a refused one, and once
 *      per end-of-turn phase.
 *   3. **Nobody rebuilds the list any more.** The four private copies
 *      (§3a — the panel, the Ledger, the ghost-diff, the bot) are read out of
 *      the source: `cityFlatsByClass` is gone and each reader imports the
 *      reading rather than the sources.
 *
 * Core tier: a fold over one small board plus a source register (CLAUDE.md — a
 * source-reading register test is always core).
 */

import { describe, expect, it } from 'vitest';

import { applyCommand } from '../../src/sim/commands';
import {
  cityQuote,
  cityYields,
  emptyCityYields,
  foldQuoteLines,
} from '../../src/sim/cities';
import { LEDGER_CLASSES } from '../../src/sim/ledgerClass';
import { readCity, readEmpire, readEmpirePercents } from '../../src/sim/readings';
import { CITY_YIELD_KEYS } from '../../src/sim/resourceData';
import { bumpRevision, newGame } from '../../src/sim/state';
import { snapshotState } from '../../src/sim/game';
import { END_OF_TURN_PHASES, runEndOfTurn } from '../../src/sim/turn';
import { civYields } from '../../src/ui/topBar';
import { found, game } from './statecraftHelpers';

/** The steps a town's list may carry — `docs/yields.md`'s 1 through 10. */
const TOWN_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

describe('the town publishes its list', () => {
  it('folds to its own flats, voice for voice', () => {
    const { state } = game();
    const city = found(state, 0)!;
    city.population = 5;
    city.buildings.push('monument', 'library');
    const quote = cityQuote(state, city);
    const fold = foldQuoteLines(quote.lines);
    for (const key of CITY_YIELD_KEYS) {
      expect(fold[key], key).toBe(quote.flats[key]);
    }
    // Not vacuous: a town with people, ground and two buildings makes something.
    expect(quote.lines.length).toBeGreaterThan(3);
  });

  it('gives every line a step of the sequence and a class of the eight', () => {
    const { state } = game();
    const city = found(state, 0)!;
    city.buildings.push('monument');
    for (const line of cityQuote(state, city).lines) {
      expect(TOWN_STEPS, `${line.source} step ${line.step}`).toContain(line.step);
      expect(LEDGER_CLASSES, `${line.source} class`).toContain(line.class);
    }
  });

  it('runs its steps in the sequence of record, never doubling back', () => {
    // `docs/yields.md`'s order, read off the list rather than off the source —
    // the sync test reads the source, and this reads what the source produced.
    const { state } = game();
    const city = found(state, 0)!;
    city.buildings.push('monument', 'library');
    let last = 0;
    for (const line of cityQuote(state, city).lines) {
      expect(line.step, `${line.source} after step ${last}`).toBeGreaterThanOrEqual(last);
      last = line.step;
    }
  });

  it('keeps the centre and the town’s own two terms apart', () => {
    // The centre is a *hex* and files under the land; a citizen's beaker and the
    // culture a settlement makes by being one belong to no tile, no building and
    // no card, which is what `other` means.
    const { state } = game();
    const city = found(state, 0)!;
    const centre = cityQuote(state, city).lines.filter((line) => line.step === 1);
    expect(centre).toHaveLength(2);
    expect(centre[0]!.class).toBe('tiles');
    expect(centre[1]!.class).toBe('other');
    expect(centre[1]!.science).toBeGreaterThan(0);
  });
});

describe('the revision is the subscription', () => {
  it('hands the same reading back until the world moves', () => {
    const { state } = game();
    const city = found(state, 0)!;
    expect(readCity(state, city)).toBe(readCity(state, city));
    expect(readEmpire(state, 0)).toBe(readEmpire(state, 0));
    expect(readEmpirePercents(state, 0)).toBe(readEmpirePercents(state, 0));

    const held = readCity(state, city);
    bumpRevision(state);
    expect(readCity(state, city)).not.toBe(held);
    // A fresh object, and the same answer: the memo is a cache and never a rule.
    for (const key of CITY_YIELD_KEYS) {
      expect(readCity(state, city).flats[key], key).toBe(held.flats[key]);
    }
  });

  it('keys on the board, so a second game reads its own', () => {
    const first = game().state;
    const cityA = found(first, 0)!;
    const second = game().state;
    const cityB = found(second, 0)!;
    expect(readCity(first, cityA)).not.toBe(readCity(second, cityB));
  });

  it('never reaches the snapshot', () => {
    // `snapshotState` is `JSON.stringify(state)` and every replay in the suite
    // compares it byte for byte, so a cache hung on the state would not be a
    // cache — it would be a rule. The memos are `WeakMap`s beside it.
    const { state } = game();
    found(state, 0);
    const clean = snapshotState(state);
    void readEmpire(state, 0);
    void readCity(state, state.cities[0]!);
    expect(snapshotState(state)).toBe(clean);
  });

  it('moves on an accepted command and stands still on a refused one', () => {
    const { state } = game();
    const was = state.revision;
    // A command that cannot be: no such unit. A refusal leaves the state
    // byte-identical, and a counter that moved would be a byte that moved.
    const refused = applyCommand(state, { type: 'fortify', playerId: 0, unitId: 99_999 });
    expect(refused.ok).toBe(false);
    expect(state.revision).toBe(was);

    const taken = applyCommand(state, { type: 'chooseResearch', playerId: 0, techId: 'mining' });
    expect(taken.ok).toBe(true);
    expect(state.revision).toBe(was + 1);
  });

  it('moves once per phase across a resolution', () => {
    const state = newGame({
      seed: 7,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#d4502e' },
        { name: 'Bors', color: '#3a7fe8' },
      ],
    });
    const was = state.revision;
    runEndOfTurn(state);
    // The whole reason the counter is not `game.log.length`: a resolution moves
    // the world without a command behind it (`docs/audit/evaluations.md` §2b).
    expect(state.revision - was).toBe(END_OF_TURN_PHASES.length);
  });

  it('starts at nought and is in the save', () => {
    const state = newGame({
      seed: 7,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#d4502e' },
        { name: 'Bors', color: '#3a7fe8' },
      ],
    });
    expect(state.revision).toBe(0);
    expect(JSON.parse(snapshotState(state)).revision).toBe(0);
  });
});

describe('the empire’s reading is what the surfaces read', () => {
  it('totals exactly what the top bar prints', () => {
    const { state } = game();
    const city = found(state, 0)!;
    city.buildings.push('monument', 'library');
    bumpRevision(state);
    const totals = readEmpire(state, 0).totals;
    const headline = civYields(state, 0);
    for (const key of CITY_YIELD_KEYS) expect(totals[key], key).toBe(headline[key]);
  });

  it('is the towns’ own totals plus the empire’s own lines, and nothing else', () => {
    const { state } = game();
    found(state, 0);
    const reading = readEmpire(state, 0);
    const sum = emptyCityYields();
    for (const town of reading.towns) {
      const banked = cityYields(state, town.city, [], town.city.queue[0], town.quote);
      for (const key of CITY_YIELD_KEYS) sum[key] += banked[key];
    }
    for (const line of reading.lines) {
      for (const key of CITY_YIELD_KEYS) sum[key] += line[key];
    }
    for (const key of CITY_YIELD_KEYS) expect(sum[key], key).toBe(reading.totals[key]);
  });
});

// --- the register -----------------------------------------------------------

describe('nobody rebuilds the town’s list', () => {
  const SOURCE = {
    ...(import.meta.glob('../../src/sim/*.ts', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>),
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
  };

  const read = (name: string): string => {
    const key = Object.keys(SOURCE).find((path) => path.endsWith(`/${name}`));
    expect(key, `${name} readable`).toBeDefined();
    return SOURCE[key!]!;
  };

  it('has no `cityFlatsByClass` left anywhere', () => {
    // The Ledger's mirror of `cityQuote` — eleven lists walked a second time —
    // is the largest of the four private copies §3a names, and it is gone rather
    // than merely unused: the class is on the line now.
    for (const [path, text] of Object.entries(SOURCE)) {
      expect(`${path}: ${text.includes('cityFlatsByClass')}`).toBe(`${path}: false`);
    }
  });

  it('has each reader subscribing to the reading', () => {
    // The five surfaces §3a names, each reading `readings.ts` rather than
    // walking the layers itself.
    for (const [file, what] of [
      ['ledgerScreen.ts', 'readEmpire'],
      ['cityPanel.ts', 'readCity'],
      ['topBar.ts', 'readEmpire'],
      ['cardImpact.ts', 'readCity'],
      ['value.ts', 'readCity'],
      ['bot.ts', 'readCity'],
    ] as const) {
      const text = read(file);
      expect(`${file} imports`).toBe(
        /from '(\.\.\/sim|\.)\/readings'/.test(text) ? `${file} imports` : `${file} does not import`,
      );
      expect(`${file}: ${text.includes(what)}`).toBe(`${file}: true`);
    }
  });

  it('keys no memo in the simulation on the log', () => {
    // `game.log.length` was the interface's revision and the right idea one
    // layer too high — the sim's own phases move the state without moving the
    // log, and nothing in `src/sim` can see a log at all. The state carries the
    // counter now, and `main.ts` reads it off the state.
    // One stated exception, and it is not a memo: `game.ts` replays a save by
    // walking the log it was handed.
    for (const [path, text] of Object.entries(SOURCE)) {
      if (!path.includes('/sim/') || path.endsWith('/game.ts')) continue;
      expect(`${path}: ${text.includes('log.length')}`).toBe(`${path}: false`);
    }
    expect(read('main.ts')).toContain('getRevision: () => game.state.revision');
  });

  it('keeps the reading leaf out of `cities.ts`', () => {
    // `readings.ts` imports `cities.ts`; the reverse would be a runtime cycle
    // (`test/mapgen/moduleCycles.test.ts` is the gate, and the symptom is "X is
    // not a function" everywhere). It is why `collectYields` still takes its own
    // readings — see the phase's docblock for the second reason.
    expect(read('cities.ts').includes("from './readings'")).toBe(false);
    expect(read('readings.ts').includes("from './cities'")).toBe(true);
  });
});
