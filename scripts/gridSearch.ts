/**
 * **The grid search** — batch 7 of `docs/bot-priorities.md`, part 3.
 *
 * Five batches of the priority system landed on measurement of one shape: play
 * the acceptance seeds, count towns and buildings and technologies, and read the
 * table. That answers *did this change break anything*; it cannot answer *is
 * this number better than that one*, because a seat measured against its own
 * past is measured against a different board every time a knob moves.
 *
 * So this is the other measurement, and its three rules are the whole design:
 *
 *   · **Mirror matches.** A candidate sheet plays seat 0 against the file on
 *     seat 1, and then the same seed is played again with the seats swapped.
 *     Both games count, so a map that happens to hand seat 0 three rivers is a
 *     map that hands the *default* three rivers in the mirror, and the advantage
 *     is what survives the pair. Per-seat sheets are what makes this possible at
 *     all (`setAiTuning(sheet, {playerId})`, batch 7's part 2).
 *   · **The judge never wears a candidate's glasses.** Both seats are scored
 *     with the **default** weight table — the file's, not the sheet's. A
 *     candidate that raises `weights.science` and is then scored at its own
 *     raised weight would win by arithmetic rather than by play, which is the
 *     one way a self-play objective can be quietly circular.
 *   · **It is deterministic.** Same arguments, byte-identical JSON. Nothing
 *     here reads a clock into a result; the wall time is printed to the console
 *     and never written to the file. **Including under parallelism**: a game is
 *     a pure function of its seed and its two sheets, so the games are fanned
 *     out over a pool of child processes and every result is merged back **by
 *     its own key** (dial · value · seed · side) rather than by the order it
 *     arrived in. A run on two cores and a run on twelve write the same bytes.
 *
 * The objective is the game's own currency, folded at the final turn:
 *
 *     beads × weights.bead + techs × weights.tech + Σ voice rates × weights[voice][age]
 *
 * which is the same reading the arena's meters take (`empireRateReading` for the
 * four banked voices, the towns' own `cityYields` summed for food and hammers,
 * because the simulation has no empire-scale fold of a basket or a hammer). It
 * is deliberately *not* a win rate: a hundred and fifty turns is not a game, and
 * a duel that ends in nobody's victory would score every configuration nil.
 *
 * Usage
 * -----
 *     npx vite-node scripts/gridSearch.ts
 *     npx vite-node scripts/gridSearch.ts --turns 100 --seeds 5,777
 *     npx vite-node scripts/gridSearch.ts --dial 'weights.science×' --out /tmp/x.json
 *     npx vite-node scripts/gridSearch.ts --jobs 4      # a quieter machine
 *     npx vite-node scripts/gridSearch.ts --size standard   # and see the note below
 *
 * **The board is the duel, and the reason is measured.** The batch's brief asked
 * for the standard map (80×52), and the first pass was started there and
 * abandoned: 54 of its 159 games took **three hours and sixteen minutes** on eight
 * workers of a ten-core M4, and the rate was falling as the empires grew — call it
 * nine or ten CPU-hours for one OFAT sweep, which is not a tool anybody runs
 * between two changes. A duel board (40×25) is a quarter of the tiles, is the board
 * every acceptance table in `docs/bot-priorities.md` was measured on, and — with
 * two seats — is the one where the seats actually meet. `--size standard` is still
 * there for anybody who wants to pay for it.
 *
 * One task is one game and the pool is `os.availableParallelism() − 2` child
 * processes by default (`--jobs`), each of them this same file under `--worker`,
 * fed one task at a time down its stdin. Two are left over deliberately: the
 * parent is doing nothing but bookkeeping, and a machine with every core at a
 * hundred per cent measures its own thermal ceiling rather than the bot.
 *
 * It writes `gridsearch-results.json` in the repo root (`--out` to move it). The
 * file is **not** committed — it is a measurement, and the reading of it belongs
 * in `docs/bot-priorities.md` where a reader can argue with it.
 *
 * It is a tool and not a test, which is why it lives in `scripts/` and runs
 * under vite-node: a test asserts, and this one has nothing to assert. What it
 * has is an opinion, and the opinion goes in the doc.
 */

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AI, type PersonaOverride, clearSeatTuning, setAiTuning } from '../src/ai/aiConfig';
import { VOICES, type Voice } from '../src/ai/value';
import { driveBots } from '../src/ai/driver';
import { type Game, createGame } from '../src/sim/game';
// **The judge is its own module** — see its docblock. It is imported here and by
// `test/sim/gridObjective.test.ts`, and importing *this* file would start a run.
import { type Standing, foldStanding, standingOf } from './gridObjective';

// --- the dials ---------------------------------------------------------------

/**
 * One dial and the values to try it at.
 *
 * `sheet(value)` answers the **sparse override** that value means, which is why
 * a dial is a function rather than a path and a number: a per-voice weight
 * scalar multiplies a whole age band, and there is no leaf in `data/ai.json`
 * that a scalar *is*. `label(value)` is what the table prints.
 *
 * A value that reproduces the file answers an **empty** sheet, and an empty
 * sheet is the one configuration this harness does not play: both seats would
 * hold the same opinions, so the two mirrored games are the same game and the
 * advantage is exactly zero by construction. It is reported as such.
 */
interface Dial {
  id: string;
  values: readonly number[];
  sheet: (value: number) => PersonaOverride;
  label: (value: number) => string;
}

/** A dial that sets one leaf of the sheet outright. */
function leaf(path: string, values: readonly number[]): Dial {
  const parts = path.split('.');
  const held = parts.reduce<unknown>(
    (node, key) => (node as Record<string, unknown>)[key],
    AI as unknown,
  ) as number;
  return {
    id: path,
    values,
    label: (value) => String(value),
    sheet: (value) => {
      if (value === held) return {};
      const sheet: Record<string, unknown> = {};
      let node = sheet;
      for (const key of parts.slice(0, -1)) {
        node[key] = {};
        node = node[key] as Record<string, unknown>;
      }
      node[parts[parts.length - 1]!] = value;
      return sheet as PersonaOverride;
    },
  };
}

/**
 * A dial that **scales one voice's whole age band**.
 *
 * The band is four numbers that fall or rise with the age, and the shape of that
 * curve is a design opinion this search has no business flattening: what is
 * being asked is *how loud is this voice*, not *what should food be worth in
 * Æra III*. So the sheet multiplies all four and rounds to a tenth, which keeps
 * the rows printable and keeps two runs of the same scalar identical.
 */
function scale(voice: Voice, factors: readonly number[]): Dial {
  return {
    id: `weights.${voice}×`,
    values: factors,
    label: (value) => `×${value}`,
    sheet: (value) => {
      if (value === 1) return {};
      const row = AI.weights[voice].map((point) => Math.round(point * value * 10) / 10);
      return { weights: { [voice]: row } } as PersonaOverride;
    },
  };
}

/**
 * **The dials the user ruled for the first pass** (batch 7 of the spec).
 *
 * Each is a number somebody guessed once and nothing has argued with since: the
 * first luxury's premium, how loud each voice is, what a threat and an empty
 * town are worth to a soldier, what a missing trade in the army mix is worth,
 * what a town is worth, what a point of contentment is worth (batch 4's one
 * regression), the planning horizon, and the ceiling a shadow price may ride to
 * (batch 6's second question).
 */
const DIALS: readonly Dial[] = [
  leaf('site.newLuxuryBonus', [7, 14, 28]),
  scale('food', [0.7, 1, 1.4]),
  scale('production', [0.7, 1, 1.4]),
  scale('science', [0.7, 1, 1.4]),
  scale('culture', [0.7, 1, 1.4]),
  scale('gold', [0.7, 1, 1.4]),
  leaf('threat.militaryBonus', [30, 60, 90]),
  leaf('threat.garrisonValue', [70, 140, 210]),
  leaf('military.mixBonus', [20, 45, 70]),
  leaf('weights.city', [80, 110, 150]),
  leaf('weights.happiness', [8, 12, 18]),
  leaf('priorities.horizonTurns', [30, 40, 60]),
  leaf('priorities.priceBandHigh', [2, 3, 5]),
];

// --- the matches -------------------------------------------------------------

interface Options {
  turns: number;
  sizeName: string;
  seeds: readonly number[];
  out: string;
  only: readonly string[] | null;
  jobs: number;
}

/**
 * **One game, as a message.** The unit of work the pool hands out, and the unit
 * the results are merged by.
 *
 * The sheet travels rather than the dial's name and value, so a worker never
 * re-derives a configuration and two workers can never disagree about what a
 * dial meant. `side` is which seat plays the candidate, and `-1` is the
 * baseline's own game, where nobody does.
 */
interface Task {
  key: string;
  seed: number;
  turns: number;
  sizeName: string;
  side: 0 | 1 | -1;
  sheet: PersonaOverride;
}

interface Done {
  key: string;
  candidate: Standing;
  base: Standing;
}

/** The one line of a worker's chatter the parent listens to. */
const WIRE = '##game##';

/**
 * One game: `sheet` on `candidateSeat`, the file on the other, played to the
 * turn — and the two seats' folds returned candidate-first. A `-1` seat is the
 * baseline: nobody is tuned, and the "candidate" is simply seat 0.
 *
 * The sheet goes on **before** `createGame`, because the bot reads its
 * configuration on the first turn it is driven and a seam installed halfway
 * through would be two different opinions inside one game. It comes off in a
 * `finally`, because a thrown game must not leave a dial turned for the next —
 * and this runs in a **worker**, which plays many games in one module instance.
 */
function playGame(task: Task): { candidate: Standing; base: Standing } {
  const candidateSeat: 0 | 1 = task.side === 1 ? 1 : 0;
  if (task.side !== -1) setAiTuning(task.sheet, { playerId: candidateSeat });
  try {
    const game: Game = createGame({
      seed: task.seed,
      sizeName: task.sizeName,
      players: [
        { name: 'Crimson', color: '#d4502e' },
        { name: 'Teal', color: '#1f8a85' },
      ],
      barbarians: true,
    });
    for (let turn = 0; turn < task.turns; turn++) driveBots(game, { warn: () => {} });
    return {
      candidate: standingOf(game.state, candidateSeat),
      base: standingOf(game.state, candidateSeat === 0 ? 1 : 0),
    };
  } finally {
    clearSeatTuning();
  }
}

/** One dial value, over every seed and both mirrors. */
interface Result {
  dial: string;
  value: number;
  label: string;
  /** Mean over games of (candidate's fold − the default seat's fold). */
  advantage: number;
  /** The same difference, per voice, so a degenerate winner is visible. */
  voices: Record<Voice, number>;
  beads: number;
  techs: number;
  /** Games played. Zero for a value that reproduces the file — see `Dial`. */
  games: number;
}

/**
 * Every game this run will play, in a fixed order — the parent's whole plan,
 * made before a worker starts so that the merge can be by key.
 */
function tasksOf(dials: readonly Dial[], options: Options): Task[] {
  const tasks: Task[] = [];
  for (const seed of options.seeds) {
    tasks.push({
      key: `baseline|${seed}`,
      seed,
      turns: options.turns,
      sizeName: options.sizeName,
      side: -1,
      sheet: {},
    });
  }
  for (const dial of dials) {
    for (const value of dial.values) {
      const sheet = dial.sheet(value);
      // The file against itself is the same game twice, mirrored: the two
      // differences are exact negations and the mean is nought. Reported, not
      // played — which is also a third of the pass not run.
      if (Object.keys(sheet).length === 0) continue;
      for (const seed of options.seeds) {
        for (const side of [0, 1] as const) {
          tasks.push({
            key: `${dial.id}|${value}|${seed}|${side}`,
            seed,
            turns: options.turns,
            sizeName: options.sizeName,
            side,
            sheet,
          });
        }
      }
    }
  }
  return tasks;
}

/** Folds one dial value's games — whichever of them the pool has answered. */
function resultOf(dial: Dial, value: number, options: Options, done: Map<string, Done>): Result {
  const voices = {} as Record<Voice, number>;
  for (const voice of VOICES) voices[voice] = 0;
  const result: Result = {
    dial: dial.id,
    value,
    label: dial.label(value),
    advantage: 0,
    voices,
    beads: 0,
    techs: 0,
    games: 0,
  };
  if (Object.keys(dial.sheet(value)).length === 0) return result;
  // **In the plan's own order, never the completion order** — floating-point
  // addition is not associative, so a sum taken in arrival order would make the
  // result a fact about how busy the machine was.
  for (const seed of options.seeds) {
    for (const side of [0, 1] as const) {
      const game = done.get(`${dial.id}|${value}|${seed}|${side}`);
      if (game === undefined) continue;
      const folded = foldStanding(game.candidate);
      const against = foldStanding(game.base);
      result.advantage += folded.total - against.total;
      result.beads += game.candidate.beads - game.base.beads;
      result.techs += game.candidate.techs - game.base.techs;
      for (const voice of VOICES) result.voices[voice] += folded.voices[voice] - against.voices[voice];
      result.games += 1;
    }
  }
  const games = Math.max(1, result.games);
  result.advantage = round(result.advantage / games);
  result.beads = round(result.beads / games);
  result.techs = round(result.techs / games);
  for (const voice of VOICES) result.voices[voice] = round(result.voices[voice] / games);
  return result;
}

/** Two decimals, so a printed table and a stored JSON say the same number. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * **The baseline**, folded out of the games the pool played for it.
 *
 * Two default seats are one game, so a mirror of it would be the same game
 * again; what it is for is the reference standing the advantages are read
 * against — an advantage of thirty points means one thing beside a baseline of
 * three hundred and another beside a baseline of three thousand.
 */
function baselineOf(
  options: Options,
  done: Map<string, Done>,
): { total: number; voices: Record<Voice, number> } {
  const voices = {} as Record<Voice, number>;
  for (const voice of VOICES) voices[voice] = 0;
  let total = 0;
  let seats = 0;
  for (const seed of options.seeds) {
    const game = done.get(`baseline|${seed}`);
    if (game === undefined) continue;
    for (const standing of [game.candidate, game.base]) {
      const folded = foldStanding(standing);
      total += folded.total;
      for (const voice of VOICES) voices[voice] += folded.voices[voice];
      seats += 1;
    }
  }
  const count = Math.max(1, seats);
  total = round(total / count);
  for (const voice of VOICES) voices[voice] = round(voices[voice] / count);
  return { total, voices };
}

// --- the pool ----------------------------------------------------------------

/**
 * **The worker half of this file**: one task in, one line out, for as long as the
 * parent keeps writing.
 *
 * A child process rather than a worker thread, and this file rather than a file
 * of its own, for the same reason: `vite-node` is what resolves the simulation's
 * imports, and the cheapest thing it knows how to start is *this script again*.
 * A worker thread would need its own transform pipeline; a second script would
 * need the dial table kept in step with this one.
 *
 * The protocol is deliberately one line of JSON per game with a marker on it, so
 * anything else a transform or a warning writes to stdout is simply not a
 * result. The parent's queue is what bounds memory: a worker holds one game.
 */
function serve(): void {
  let buffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;
    for (;;) {
      const line = buffer.indexOf('\n');
      if (line < 0) break;
      const text = buffer.slice(0, line);
      buffer = buffer.slice(line + 1);
      if (text.trim() === '') continue;
      const task = JSON.parse(text) as Task;
      const played = playGame(task);
      const answer: Done = { key: task.key, candidate: played.candidate, base: played.base };
      process.stdout.write(`${WIRE}${JSON.stringify(answer)}\n`);
    }
  });
  process.stdin.on('end', () => process.exit(0));
}

/**
 * Fans `tasks` out over `jobs` children of this same script and answers when
 * every one of them has come back, keyed.
 *
 * The queue is a shared index rather than a static shard per worker, because the
 * games are not the same length — a seat that founds six towns takes twice the
 * turn a seat with two does — and a static shard would end with one process
 * playing alone. Merging is by `Task.key`, so completion order reaches nothing.
 */
async function fanOut(tasks: readonly Task[], jobs: number): Promise<Map<string, Done>> {
  const done = new Map<string, Done>();
  if (tasks.length === 0) return done;
  const workers = Math.max(1, Math.min(jobs, tasks.length));
  let next = 0;
  let finished = 0;
  const total = tasks.length;
  const here = fileURLToPath(import.meta.url);
  const viteNode = resolve(here, '../../node_modules/vite-node/vite-node.mjs');

  await Promise.all(
    Array.from({ length: workers }, () =>
      new Promise<void>((settle, fail) => {
        const child = spawn(process.execPath, [viteNode, here, '--worker'], {
          cwd: resolve(here, '../..'),
          stdio: ['pipe', 'pipe', 'inherit'],
        });
        let buffer = '';
        const feed = (): void => {
          if (next >= tasks.length) {
            child.stdin.end();
            return;
          }
          const task = tasks[next]!;
          next += 1;
          child.stdin.write(`${JSON.stringify(task)}\n`);
        };
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk: string) => {
          buffer += chunk;
          for (;;) {
            const line = buffer.indexOf('\n');
            if (line < 0) break;
            const text = buffer.slice(0, line);
            buffer = buffer.slice(line + 1);
            if (!text.startsWith(WIRE)) {
              if (text.trim() !== '') console.log(text);
              continue;
            }
            const answer = JSON.parse(text.slice(WIRE.length)) as Done;
            done.set(answer.key, answer);
            finished += 1;
            process.stdout.write(`\r  ${finished}/${total} games`);
            feed();
          }
        });
        child.on('error', fail);
        child.on('exit', (code) => {
          if (code === 0 || code === null) settle();
          else fail(new Error(`a worker exited ${code}`));
        });
        feed();
      }),
    ),
  );
  process.stdout.write('\n');
  return done;
}

// --- the entry point ---------------------------------------------------------

function parse(argv: readonly string[]): Options {
  const options: Options = {
    turns: 150,
    sizeName: 'duel',
    seeds: [5, 777, 20260904],
    out: 'gridsearch-results.json',
    only: null,
    // Two cores left over: the parent is only bookkeeping, and a machine with
    // every core saturated measures its own thermal ceiling rather than the bot.
    jobs: Math.max(1, (availableParallelism?.() ?? 4) - 2),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === '--turns' && value !== undefined) {
      (options as { turns: number }).turns = Number(value);
      index += 1;
    } else if (flag === '--seeds' && value !== undefined) {
      (options as { seeds: readonly number[] }).seeds = value.split(',').map(Number);
      index += 1;
    } else if (flag === '--out' && value !== undefined) {
      (options as { out: string }).out = value;
      index += 1;
    } else if (flag === '--dial' && value !== undefined) {
      (options as { only: readonly string[] | null }).only = value.split(',');
      index += 1;
    } else if (flag === '--size' && value !== undefined) {
      (options as { sizeName: string }).sizeName = value;
      index += 1;
    } else if (flag === '--jobs' && value !== undefined) {
      (options as { jobs: number }).jobs = Math.max(1, Number(value));
      index += 1;
    }
  }
  return options;
}

async function main(): Promise<void> {
  const options = parse(process.argv.slice(2));
  const dials = options.only === null ? DIALS : DIALS.filter((dial) => options.only!.includes(dial.id));
  const started = Date.now();
  const tasks = tasksOf(dials, options);
  console.log(
    `grid search · ${dials.length} dials · ${options.sizeName} · turns ${options.turns} · ` +
      `seeds ${options.seeds.join('/')} · ${tasks.length} games over ${options.jobs} workers`,
  );

  const done = await fanOut(tasks, options.jobs);

  const baseline = baselineOf(options, done);
  console.log(`baseline fold, per seat: ${baseline.total}`);

  const results: Result[] = [];
  for (const dial of dials) {
    for (const value of dial.values) results.push(resultOf(dial, value, options, done));
  }

  const sorted = [...results].sort((a, b) => b.advantage - a.advantage);
  console.log('\n  dial                          value      advantage   beads   techs   per voice');
  for (const row of sorted) {
    // Two letters, not one: food and faith share an initial, and a table nobody
    // can read a column of is a table nobody can argue with.
    const voices = VOICES.map((voice) => `${voice.slice(0, 2)}${sign(row.voices[voice])}`).join(' ');
    console.log(
      `  ${row.dial.padEnd(28)} ${row.label.padEnd(8)} ${sign(row.advantage).padStart(9)} ` +
        `${sign(row.beads).padStart(7)} ${sign(row.techs).padStart(7)}   ${voices}`,
    );
  }

  // Metadata carries no clock: two runs of the same arguments write the same
  // bytes, which is what makes a result something a doc can quote.
  writeFileSync(
    options.out,
    `${JSON.stringify(
      { size: options.sizeName, turns: options.turns, seeds: options.seeds, baseline, results },
      null,
      2,
    )}\n`,
  );
  console.log(`\nwrote ${options.out} · ${Math.round((Date.now() - started) / 1000)}s`);
}

function sign(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`;
}

if (process.argv.includes('--worker')) serve();
else void main();
