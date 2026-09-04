/**
 * The arena page, at the properties that are not visible from a screenshot.
 *
 * There is no jsdom in this suite (see `controls.test.ts`), so the rules about
 * the *page* read its sources, exactly as `spectatePage.test.ts` does. But the
 * two rules that actually matter here are not source rules at all, and they are
 * checked by running the real thing:
 *
 *   · **The panel is generated.** Not "the file looks like it walks the config"
 *     but "walking the config produces every block and every leaf the config
 *     currently has" — asserted against an independent walker written in this
 *     file, so a knob added to `data/ai.json` fails the test the day the page
 *     stops showing it. The source half is the other side of the same promise:
 *     no knob name may appear as a literal in the two modules that build the
 *     panel, because a name there is a name somebody has to maintain.
 *   · **The override seam is identity.** With nothing installed, `aiConfigFor`
 *     returns the very object it returned before the seam existed — which is what
 *     makes the tuning dial safe to have in a shipped module at all.
 *
 * The reading shape is checked by playing a real (tiny) game through the same
 * function the worker calls, because the worker itself cannot be asserted about
 * and a shape nothing checks is a shape that drifts.
 */

import { describe, expect, it } from 'vitest';

import { AI, aiConfigFor, aiTuning, withAiTuning } from '../../src/ai/aiConfig';
import {
  type Knob,
  blocksOf,
  describeEdit,
  editsOf,
  knobKey,
  knobsOf,
  sheetOfEdits,
} from '../../src/arenaPage/knobs';
import { READING_COLUMNS, runArenaGame } from '../../src/arenaPage/run';

const PAGE = import.meta.glob('../../src/arenaPage/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const HTML = import.meta.glob('../../arena.html', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const VITE_CONFIG = import.meta.glob('../../vite.config.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const STYLE = import.meta.glob('../../src/arenaPage/style.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function source(name: string): string {
  const found = Object.entries(PAGE).find(([path]) => path.endsWith(`/${name}`));
  if (!found) throw new Error(`arenaPage test: no source for ${name}`);
  return found[1];
}

const main = source('main.ts');
const html = Object.values(HTML).join('\n');
const viteConfig = Object.values(VITE_CONFIG).join('\n');
const style = Object.values(STYLE).join('\n');

/** Comments stripped, so a rule about code is never satisfied by prose about it. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Every string literal in a module, single- or double-quoted. */
function literals(text: string): string[] {
  return [...code(text).matchAll(/'([^'\\\n]*)'|"([^"\\\n]*)"/g)].map(
    (match) => match[1] ?? match[2] ?? '',
  );
}

describe('the arena page is a root page', () => {
  it('exists, is named in the build inputs, and mounts its own entry module', () => {
    expect(html.length).toBeGreaterThan(0);
    expect(viteConfig).toContain("arena: 'arena.html'");
    expect(html).toContain('src="/src/arenaPage/main.ts"');
  });

  it('looks up only elements the page actually has', () => {
    const wanted = [...code(main).matchAll(/need<[^>]*>\('([^']+)'\)/g)].map((match) => match[1]!);
    expect(wanted.length).toBeGreaterThan(8);
    expect(wanted.filter((id) => !html.includes(`id="${id}"`))).toEqual([]);
  });

  it('owns its own stylesheet, and every figure on it is tabular mono', () => {
    expect(main).toContain("import './style.css'");
    expect(style).toContain('tabular-nums');
    expect(style).toContain('--face-mono');
  });

  it('opens on the ruling’s own defaults: seventy-five turns, five games', () => {
    // The ruling of 2026-09-04 — *"run a simulation for X turns (make it 75 by
    // default) … simulate 5 games"*. The defaults live in the HTML because they
    // are what the boxes say before anybody touches them.
    expect(html).toMatch(/id="turns"[^>]*value="75"/);
    expect(html).toMatch(/id="games"[^>]*value="5"/);
  });
});

describe('the configuration panel is generated, not listed', () => {
  const knobs = knobsOf(AI);

  /** An independent walk of the same object — the canary's other half. */
  function leaves(node: unknown, path: readonly string[] = []): string[] {
    if (typeof node !== 'object' || node === null || Array.isArray(node)) {
      return path.length === 0 ? [] : [path.join('.')];
    }
    return Object.entries(node).flatMap(([key, value]) => leaves(value, [...path, key]));
  }

  it('shows every leaf of the configuration the bot actually reads', () => {
    const walked = knobs.map((knob) => knobKey(knob.path));
    // Not a count with a magic number in it: the *whole* set, both ways. A knob
    // added to `data/ai.json` is on the panel or this fails.
    expect(walked).toEqual(leaves(AI));
    expect(walked.length).toBeGreaterThan(100);
  });

  it('groups by the sheet’s own top-level blocks, in the file’s order', () => {
    const blocks = blocksOf(knobs).map((block) => block.name);
    expect(blocks).toEqual(Object.keys(AI));
    // Every block accounted for: no knob orphaned outside a group.
    const grouped = blocksOf(knobs).reduce((sum, block) => sum + block.knobs.length, 0);
    expect(grouped).toBe(knobs.length);
  });

  it('reads each leaf’s shape off the data rather than off a table of names', () => {
    const kinds = new Set(knobs.map((knob) => knob.kind));
    // What `data/ai.json` holds today: scalars, the age-banded rows, and the one
    // roster of improvement ids. Nothing unreadable — a new leaf shape is a
    // design decision and would show up here.
    expect([...kinds].sort()).toEqual(['number', 'numbers', 'strings']);
    const rows = knobs.filter((knob) => knob.kind === 'numbers');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect((row.value as readonly number[]).length).toBeGreaterThan(0);
  });

  it('names no knob anywhere in the modules that build the panel', () => {
    // The promise is *"all further bot changes adding to this page"*. A knob
    // name in the builder is a name somebody would have to remember to add, so
    // there must not be one — including a block name, which is what a curated
    // ordering would smuggle in.
    const names = new Set(knobs.flatMap((knob) => knob.path));
    for (const module of ['panel.ts', 'knobs.ts']) {
      const found = literals(source(module)).filter((text) => names.has(text));
      expect(found, module).toEqual([]);
    }
    // And the walk is a walk: the entries of the object, not a list.
    expect(code(source('knobs.ts'))).toContain('Object.entries');
    expect(code(source('panel.ts'))).toContain('knobsOf(AI)');
  });

  it('emits a sparse sheet of only what was edited, shaped like a persona', () => {
    const cap = knobs.find((knob) => knobKey(knob.path) === 'expansion.settlerCap')!;
    const food = knobs.find((knob) => knobKey(knob.path) === 'weights.food')!;
    const read = (knob: Knob): number | readonly number[] | null => {
      if (knob === cap) return 1;
      if (knob === food) return [9, 9, 9, 9];
      return knob.value as number | readonly number[];
    };
    const edits = editsOf(knobs, read);
    expect(edits.map((edit) => knobKey(edit.knob.path))).toEqual([
      'expansion.settlerCap',
      'weights.food',
    ]);
    expect(sheetOfEdits(edits)).toEqual({
      expansion: { settlerCap: 1 },
      weights: { food: [9, 9, 9, 9] },
    });
    // The marker's line: the delta, printed, so a run can be repeated.
    expect(describeEdit(edits[0]!)).toBe(`expansion.settlerCap ${AI.expansion.settlerCap} → 1`);
  });

  it('treats an unreadable box as un-edited rather than handing over a NaN', () => {
    expect(editsOf(knobs, () => null)).toEqual([]);
    expect(sheetOfEdits([])).toBeNull();
  });
});

describe('the tuning seam', () => {
  it('is identity while nothing is installed', () => {
    expect(aiTuning()).toBeNull();
    // The very object, not an equal one: the untuned path is the path that
    // existed before the seam, and `test/sim/aiPersona.test.ts` pins the same
    // identity from the other side.
    expect(aiConfigFor(undefined)).toBe(AI);
    expect(aiConfigFor('balanced')).toBe(AI);
  });

  it('folds a sheet under every persona, and puts it back afterwards', () => {
    const held = AI.weights.tech;
    withAiTuning({ weights: { tech: held + 100 } }, () => {
      expect(aiConfigFor(undefined).weights.tech).toBe(held + 100);
      // Under the persona, not over it: `tall` says nothing about this knob, so
      // it inherits the tuning exactly as it inherits every other base opinion.
      expect(aiConfigFor('tall').weights.tech).toBe(held + 100);
      // …and a knob the persona *does* pin is still the persona's.
      expect(aiConfigFor('tall').expansion.settlerCap).toBe(2);
    });
    expect(aiTuning()).toBeNull();
    expect(aiConfigFor(undefined)).toBe(AI);
    expect(AI.weights.tech).toBe(held);
  });

  it('restores the sheet even when the run throws', () => {
    expect(() =>
      withAiTuning({ weights: { tech: 1 } }, () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
    expect(aiTuning()).toBeNull();
    expect(aiConfigFor(undefined)).toBe(AI);
  });
});

describe('a headless run', () => {
  /** Small on purpose: this is a shape check, not a pacing measurement. */
  const spec = {
    seed: 7,
    sizeName: 'duel',
    turns: 4,
    barbarians: false,
    seats: [
      { name: 'Crimson', color: '#d4502e', persona: 'balanced' },
      { name: 'Teal', color: '#1f8a85', persona: 'balanced' },
    ],
    tuning: null,
  };

  it('reports one reading per seat, every column a finite number', () => {
    const reading = runArenaGame(spec);
    expect(reading.seed).toBe(7);
    expect(reading.turnsPlayed).toBe(4);
    expect(reading.stalled).toBe(false);
    // A refusal is a bug in the bot, not a fact about a run (`driver.ts`).
    expect(reading.warnings).toBe(0);
    expect(reading.seats).toHaveLength(2);
    for (const seat of reading.seats) {
      for (const column of READING_COLUMNS) {
        expect(Number.isFinite(seat[column]), `${seat.name}.${column}`).toBe(true);
      }
      expect(seat.persona).toBe('balanced');
    }
  });

  it('is deterministic: the same spec twice is the same table', () => {
    const first = runArenaGame(spec);
    const second = runArenaGame(spec);
    // Everything but the clock, which is a fact about the machine.
    expect({ ...second, ms: 0 }).toEqual({ ...first, ms: 0 });
  });

  it('plays differently under a sheet, and identically again without one', () => {
    // Long enough that the seats have decided something a weight could change,
    // and a sheet nobody could mistake for a rounding difference.
    const longer = { ...spec, turns: 14 };
    const plain = runArenaGame(longer);
    const tuned = runArenaGame({
      ...longer,
      tuning: {
        weights: { military: AI.weights.military * 40 },
        military: { armyPerCity: 12, garrisonPerCity: 6 },
      },
    });
    expect(tuned.seats).not.toEqual(plain.seats);
    // And the dial is not left turned: the untuned run is the untuned run.
    expect({ ...runArenaGame(longer), ms: 0 }).toEqual({ ...plain, ms: 0 });
  });

  it('progresses turn by turn, which is what the page’s progress line reads', () => {
    const seen: number[] = [];
    runArenaGame(spec, (turn) => seen.push(turn));
    expect(seen).toEqual([2, 3, 4, 5]);
  });
});

describe('the worker protocol', () => {
  const worker = code(source('worker.ts'));

  it('is a shell over the pure runner, and says which game every message is about', () => {
    expect(worker).toContain('runArenaGame');
    for (const kind of ['progress', 'done', 'failed']) expect(worker).toContain(`'${kind}'`);
    // Every message carries the game's index — five games post into one page.
    expect([...worker.matchAll(/index: task\.index/g)].length).toBeGreaterThanOrEqual(3);
    // A thrown simulation is reported rather than a game that never finishes.
    expect(worker).toContain('catch');
  });

  it('is built from a URL the bundler can see, one worker per game', () => {
    expect(code(main)).toContain("new Worker(new URL('./worker.ts', import.meta.url)");
    expect(code(main)).toContain('worker.terminate()');
  });

  it('never lets the page compute a figure of its own', () => {
    // Every number on the table comes off the simulation inside the worker. The
    // page's one arithmetic is the mean it exists to print.
    const text = code(main);
    for (const banned of ['cityYields', 'empireRateReading', 'driveBots', 'createGame']) {
      expect(text).not.toContain(banned);
    }
  });
});
