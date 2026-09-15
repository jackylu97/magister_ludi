/**
 * **The evolutionary tuner** — E1b of `docs/flags.md` (zzzzz), the harness
 * `docs/plans/bot-evolution.md` §3 specifies. A tool, not a test: it asserts
 * nothing (`gridSearch.ts`'s argument) and **never writes `data/ai.json`** — the
 * winner is pasted back by hand and lands like any other balance change.
 *
 * Usage
 * -----
 *     npm run evolve -- --quick --generations 1 --workers 4     # smoke
 *     npm run evolve -- --generations 20                         # overnight
 *     npx vite-node scripts/evolve.ts --out /tmp/run --rng-seed 3
 *
 *   --quick          2 acceptance seeds, the duel board only (8 games a child)
 *   --generations N  generations to run (default 20)
 *   --workers N      child processes (default `os.cpus().length − 1`)
 *   --out DIR        the run directory (default `.claude/scratch/evolve/<timestamp>/`)
 *   --rng-seed N     the evolution's own generator (default 1)
 *   --mu N / --lambda N   elites kept / children a generation (default 6 / 12)
 *
 * The loop
 * --------
 * (μ + λ), μ = 6 elites, λ = 12 children a generation; parents by tournament
 * of three over the elites; a child by block-wise crossover of two parents
 * (when the elites hold two) and then Gaussian mutation within
 * `data/ai.bounds.json` (`evolveGenome.ts` has the operators and the reasons).
 * Every child plays **the reigning champion**: 4 seeds × {duel, standard} × 2
 * mirrored seatings = 16 games, seats 0/2/4 the candidate and 1/3/5 the
 * champion under the fixed persona order balanced · wide · tall · zealot ·
 * warmonger · balanced, the mirror swapping the two sides on the same seed so
 * over a pair each genome plays every persona and both sides of the seat-order
 * tie-breaks. Fitness is **the game's own judge**, never the bot's: V1's
 * `foldScore` at duel turn 120 / standard turn 100, plus an Opus-earliness term
 * of `rules.score.theOpus ÷ 20` a turn for a seat that raises the Opus before
 * the horizon (ten turns earlier is worth half an Opus). A game's advantage is
 * the candidate's three seats' mean minus the champion's three; fitness the
 * mean over games; the **promotion rule** counts signs — a child replaces the
 * champion only when it is ahead in at least two thirds of its games, never on
 * the mean (`t100-probe-noise`: eight seeds cannot read a mean to ±6.5). A
 * warning or a stall in any game disqualifies the child: a bot that refuses
 * its own commands is a bug, not a strategy.
 *
 * The champion's fitness is nought by definition, every other elite's a figure
 * against the champion it was scored on. A promotion inverts the old
 * champion's figure (its games are the new champion's, mirrored) and marks the
 * other elites stale; they are re-played against the new champion in the next
 * generation, the price of a promotion. Every fifth generation the champion is
 * validated against the file's own sheet on a held-out seed set and **flagged**
 * in the ledger if it loses there — never demoted by the script.
 *
 * Determinism
 * -----------
 * A game is a pure function of (seed, size, seating, the six merged sheets).
 * Tasks are keyed and merged by key, never by arrival; every fold runs in plan
 * order (floating-point sums in arrival order would make the ledger a fact
 * about the machine's load); the evolution's generator is the sim's own
 * `makeRng`, seeded from the command line. **Detected**: every result carries
 * the game's digest (`snapshotState` hashed, the reading `aiDigest.slow.test.ts`
 * pins), and every generation replays one **sentinel** — the champion against
 * itself on the first acceptance seed, the duel board — in two different
 * workers; a mismatch halts the run with the reason in `HALT.md`. Nothing in a
 * result carries a clock; wall time is printed, never written.
 *
 * The pool is `gridSearch.ts`'s: this same file re-spawned with `--worker`
 * under vite-node, one JSON task a line in, one result a line out, a shared
 * queue so a long game never leaves a worker idle.
 *
 * The seating door
 * ----------------
 * A seat plays a genome as persona P through the per-seat tuning seam
 * (`setAiTuning(sheet, {playerId})`) with the *whole* merged sheet — the file's
 * base under it is invisible and the file's persona tables are never consulted;
 * no persona key is written into the state. The play loop is
 * `test/sim/aiDigestHelpers.ts`'s (`runArenaGame` hands back a reading and not
 * the state, and both the judge and the digest need the state).
 */

import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import aiSheet from '../data/ai.json';
import boundsSheet from '../data/ai.bounds.json';
import type { PersonaOverride } from '../src/ai/aiConfig';
import { type Rng, makeRng, nextFloat, nextInt } from '../src/sim/rng';
import { RULES } from '../src/sim/rulesData';
import { explainScore, foldScore } from '../src/sim/score';
import { SIX_SEAT_PERSONAS, digestOfState, playSeatedGame, sheetSeatedSpec } from '../test/sim/aiDigestHelpers';
import {
  type Bounds,
  type Genome,
  type Json,
  crossover,
  describeDiff,
  genomeId,
  genomeOfSheet,
  genomeProblems,
  mutate,
  seatSheet,
  sheetOfGenome,
  sparseDiff,
} from './evolveGenome';

// --- the fixed points -----------------------------------------------------------

const BOUNDS = boundsSheet as Bounds;
const FILE: Genome = genomeOfSheet(aiSheet as unknown as Json);

/** The fold's horizon per board (§3.3): the standard board's last twenty turns cost as much as its first hundred. */
const HORIZONS: Record<string, number> = { duel: 120, standard: 100 };

/** The sentinel's own horizon — the suite's digest is a 120-turn reading. */
const SENTINEL_TURNS = 120;

const ACCEPTANCE_SEEDS = [1, 2, 3, 4];
const HELD_OUT_SEEDS = [101, 102, 103, 104];

/** The Opus line's weight divided by twenty: ten turns earlier is half an Opus (ruling 4). */
const OPUS_BONUS_PER_TURN = RULES.score.theOpus / 20;

/** The share of games a child must be ahead in to take the crown. */
const PROMOTION_SHARE = 2 / 3;

const WIRE = '##game##';

// --- the wire ---------------------------------------------------------------------

/** One game, as a message: the six merged sheets travel, never a genome's name. */
interface Task {
  key: string;
  seed: number;
  sizeName: string;
  turns: number;
  sheets: Json[];
}

interface Done {
  key: string;
  /** `foldScore` per seat at the turn the game stopped. */
  folds: number[];
  /** The fold plus the Opus-earliness term, per seat. */
  scores: number[];
  turnsPlayed: number;
  winnerId: number | null;
  warnings: number;
  stalled: boolean;
  digest: string;
}

function playTask(task: Task): Done {
  const played = playSeatedGame(
    sheetSeatedSpec(task.seed, task.sizeName, task.turns, task.sheets as PersonaOverride[]),
  );
  const { state } = played.game;
  const folds: number[] = [];
  const scores: number[] = [];
  for (let seat = 0; seat < task.sheets.length; seat += 1) {
    const fold = foldScore(explainScore(state, seat));
    const early = played.winnerId === seat ? Math.max(0, task.turns - played.turnsPlayed) : 0;
    folds.push(fold);
    scores.push(fold + early * OPUS_BONUS_PER_TURN);
  }
  return {
    key: task.key,
    folds,
    scores,
    turnsPlayed: played.turnsPlayed,
    winnerId: played.winnerId,
    warnings: played.warnings,
    stalled: played.stalled,
    digest: digestOfState(state),
  };
}

/** The worker half: one task in, one line out, until the parent closes the pipe. */
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
      const answer = playTask(task);
      process.stdout.write(`${WIRE}${JSON.stringify(answer)}\n`);
    }
  });
  process.stdin.on('end', () => process.exit(0));
}

/**
 * Fans `tasks` over `workers` children of this script; answers keyed. Also
 * reports which worker answered which key, so the sentinel can say whether its
 * two replays really came from two processes.
 */
async function fanOut(
  tasks: readonly Task[],
  workers: number,
): Promise<{ done: Map<string, Done>; workerOf: Map<string, number> }> {
  const done = new Map<string, Done>();
  const workerOf = new Map<string, number>();
  if (tasks.length === 0) return { done, workerOf };
  const count = Math.max(1, Math.min(workers, tasks.length));
  let next = 0;
  let finished = 0;
  const here = fileURLToPath(import.meta.url);
  const viteNode = resolve(here, '../../node_modules/vite-node/vite-node.mjs');

  await Promise.all(
    Array.from({ length: count }, (_, index) =>
      new Promise<void>((settle, fail) => {
        const child = spawn(process.execPath, [viteNode, here, '--worker'], {
          cwd: resolve(here, '../..'),
          stdio: ['pipe', 'pipe', 'inherit'],
        });
        let buffer = '';
        let holding: string | null = null;
        const feed = (): void => {
          if (next >= tasks.length) {
            child.stdin.end();
            return;
          }
          const task = tasks[next]!;
          next += 1;
          holding = task.key;
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
            workerOf.set(answer.key, index);
            finished += 1;
            process.stdout.write(`\r  ${finished}/${tasks.length} games`);
            feed();
          }
        });
        child.on('error', fail);
        child.on('exit', (code) => {
          if (code === 0 || code === null) settle();
          else fail(new Error(`worker ${index} exited ${code} while playing ${holding ?? 'nothing'}`));
        });
        feed();
      }),
    ),
  );
  process.stdout.write('\n');
  return { done, workerOf };
}

// --- the population ----------------------------------------------------------------

interface Member {
  id: string;
  genome: Genome;
  parents: string[];
  born: number;
  /** Mean advantage over its games against `scoredAgainst`. Nought for the champion. */
  fitness: number;
  wins: number;
  games: number;
  scoredAgainst: string;
}

interface Options {
  quick: boolean;
  generations: number;
  workers: number;
  out: string;
  rngSeed: number;
  mu: number;
  lambda: number;
}

interface Plan {
  seeds: number[];
  heldOut: number[];
  sizes: string[];
}

function parse(argv: readonly string[]): Options {
  const options: Options = {
    quick: false,
    generations: 20,
    workers: Math.max(1, cpus().length - 1),
    out: '',
    rngSeed: 1,
    mu: 6,
    lambda: 12,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === '--quick') options.quick = true;
    else if (flag === '--generations' && value !== undefined) (options.generations = Number(value)), (index += 1);
    else if (flag === '--workers' && value !== undefined) (options.workers = Math.max(1, Number(value))), (index += 1);
    else if (flag === '--out' && value !== undefined) (options.out = value), (index += 1);
    else if (flag === '--rng-seed' && value !== undefined) (options.rngSeed = Number(value)), (index += 1);
    else if (flag === '--mu' && value !== undefined) (options.mu = Math.max(1, Number(value))), (index += 1);
    else if (flag === '--lambda' && value !== undefined) (options.lambda = Math.max(1, Number(value))), (index += 1);
  }
  if (options.out === '') {
    // The one clock read in the run: a directory name, never a result.
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    options.out = resolve(fileURLToPath(import.meta.url), '../../.claude/scratch/evolve', stamp);
  }
  return options;
}

/** The six seats' sheets for one seating: `mirror` 0 puts the candidate on 0/2/4. */
function seatingOf(candidate: Genome, opponent: Genome, mirror: 0 | 1): Json[] {
  return SIX_SEAT_PERSONAS.map((persona, seat) =>
    seatSheet((seat + mirror) % 2 === 0 ? candidate : opponent, persona),
  );
}

function matchKey(candidate: string, opponent: string, seed: number, sizeName: string, mirror: number): string {
  return `${candidate}|${opponent}|${seed}|${sizeName}|${mirror}`;
}

/** Every game a candidate owes against an opponent, in plan order. */
function matchTasks(candidate: Member, opponent: Member, seeds: readonly number[], sizes: readonly string[]): Task[] {
  const tasks: Task[] = [];
  for (const seed of seeds) {
    for (const sizeName of sizes) {
      for (const mirror of [0, 1] as const) {
        tasks.push({
          key: matchKey(candidate.id, opponent.id, seed, sizeName, mirror),
          seed,
          sizeName,
          turns: HORIZONS[sizeName] ?? 120,
          sheets: seatingOf(candidate.genome, opponent.genome, mirror),
        });
      }
    }
  }
  return tasks;
}

interface Verdict {
  fitness: number;
  wins: number;
  games: number;
  bySize: Record<string, number>;
  bySeed: Record<number, number>;
  opusTurns: number[];
  warnings: number;
  stalls: number;
  digests: string[];
  disqualified: boolean;
}

/** Folds a candidate's games against an opponent — in plan order, never arrival order. */
function verdictOf(
  candidate: Member,
  opponent: Member,
  seeds: readonly number[],
  sizes: readonly string[],
  games: Map<string, Done>,
): Verdict {
  const verdict: Verdict = {
    fitness: 0,
    wins: 0,
    games: 0,
    bySize: {},
    bySeed: {},
    opusTurns: [],
    warnings: 0,
    stalls: 0,
    digests: [],
    disqualified: false,
  };
  let total = 0;
  for (const seed of seeds) {
    for (const sizeName of sizes) {
      for (const mirror of [0, 1] as const) {
        const done = games.get(matchKey(candidate.id, opponent.id, seed, sizeName, mirror));
        if (done === undefined) continue;
        let ours = 0;
        let theirs = 0;
        for (let seat = 0; seat < done.scores.length; seat += 1) {
          if ((seat + mirror) % 2 === 0) ours += done.scores[seat]!;
          else theirs += done.scores[seat]!;
        }
        const advantage = ours / 3 - theirs / 3;
        total += advantage;
        verdict.games += 1;
        if (advantage > 0) verdict.wins += 1;
        verdict.bySize[sizeName] = (verdict.bySize[sizeName] ?? 0) + advantage;
        verdict.bySeed[seed] = (verdict.bySeed[seed] ?? 0) + advantage;
        if (done.winnerId !== null && (done.winnerId + mirror) % 2 === 0) verdict.opusTurns.push(done.turnsPlayed);
        verdict.warnings += done.warnings;
        if (done.stalled) verdict.stalls += 1;
        verdict.digests.push(done.digest);
      }
    }
  }
  const count = Math.max(1, verdict.games);
  verdict.fitness = round(total / count);
  for (const sizeName of sizes) verdict.bySize[sizeName] = round((verdict.bySize[sizeName] ?? 0) / (2 * seeds.length));
  for (const seed of seeds) verdict.bySeed[seed] = round((verdict.bySeed[seed] ?? 0) / (2 * sizes.length));
  verdict.disqualified = verdict.warnings > 0 || verdict.stalls > 0;
  return verdict;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The best of three elites drawn at random — with replacement when there are fewer. */
function tournament(elites: readonly Member[], rng: Rng): Member {
  let best: Member | null = null;
  for (let pick = 0; pick < 3; pick += 1) {
    const one = elites[nextInt(rng, 0, elites.length)]!;
    if (best === null || one.fitness > best.fitness || (one.fitness === best.fitness && one.id < best.id)) best = one;
  }
  return best!;
}

/** Elites first by fitness, then by id, so a tie is the same tie on every machine. */
function rank(members: Member[]): Member[] {
  return [...members].sort((a, b) => b.fitness - a.fitness || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// --- the ledger -----------------------------------------------------------------------

const CSV_HEAD =
  'generation,kind,id,parents,fitness,wins,games,advDuel,advStandard,advBySeed,opusTurns,warnings,stalls,digests,verdict\n';

function csvRow(generation: number, kind: string, member: Member, verdict: Verdict, plan: Plan, note: string): string {
  const cell = (value: unknown): string => `"${String(value).replace(/"/g, '""')}"`;
  return [
    generation,
    kind,
    member.id,
    cell(member.parents.join(' ')),
    verdict.fitness,
    verdict.wins,
    verdict.games,
    verdict.bySize.duel ?? '',
    verdict.bySize.standard ?? '',
    cell(plan.seeds.map((seed) => `${seed}:${verdict.bySeed[seed] ?? ''}`).join(' ')),
    cell(verdict.opusTurns.join(' ')),
    verdict.warnings,
    verdict.stalls,
    cell(verdict.digests.join(' ')),
    cell(note),
  ].join(',') + '\n';
}

function writeChampion(out: string, champion: Member): void {
  writeFileSync(join(out, 'champion.json'), `${JSON.stringify(sheetOfGenome(champion.genome), null, 2)}\n`);
  const lines = describeDiff(FILE, champion.genome);
  const sparse = sparseDiff(FILE, champion.genome);
  writeFileSync(
    join(out, 'champion-diff.md'),
    [
      `# Champion ${champion.id} against \`data/ai.json\``,
      '',
      lines.length === 0 ? "The file's own sheet — nothing differs." : lines.map((line) => `- ${line}`).join('\n'),
      '',
      "The base's sparse override (the arena's sheet loader takes this shape; persona lines above are applied by hand):",
      '',
      '```json',
      JSON.stringify(sparse, null, 2),
      '```',
      '',
    ].join('\n'),
  );
}

function writeReadme(out: string, options: Options, plan: Plan): void {
  writeFileSync(
    join(out, 'README.md'),
    [
      '# An evolve run',
      '',
      '**The winner is written back to `data/ai.json` by hand only** — this script never writes the sheet.',
      'Paste `champion.json` (or the sparse override in `champion-diff.md`) and let the suite be the gate:',
      '`aiPersona.test.ts`, `arenaPage.test.ts`, `aiBounds.test.ts`, and the digests of `aiDigest.slow.test.ts` re-cut with a sentence.',
      '',
      `- mode: ${options.quick ? 'quick' : 'full'} · μ ${options.mu} · λ ${options.lambda} · rng seed ${options.rngSeed} · workers ${options.workers}`,
      `- acceptance seeds ${plan.seeds.join('/')} · held-out ${plan.heldOut.join('/')} · boards ${plan.sizes.join('/')}`,
      `- horizons ${plan.sizes.map((size) => `${size} ${HORIZONS[size]}`).join(' · ')} · Opus bonus per turn ${OPUS_BONUS_PER_TURN} (\`rules.score.theOpus\` ÷ 20)`,
      `- promotion: ahead in at least ${Math.round(PROMOTION_SHARE * 100)}% of a child's games`,
      '',
      '`ledger.csv` is one row per candidate per generation; `gen-NNN.md` the generation read as a table; `games.json` every game played, keyed.',
      '',
    ].join('\n'),
  );
}

// --- the run ------------------------------------------------------------------------------

async function main(): Promise<void> {
  const options = parse(process.argv.slice(2));
  const plan: Plan = options.quick
    ? { seeds: ACCEPTANCE_SEEDS.slice(0, 2), heldOut: HELD_OUT_SEEDS.slice(0, 2), sizes: ['duel'] }
    : { seeds: ACCEPTANCE_SEEDS, heldOut: HELD_OUT_SEEDS, sizes: ['duel', 'standard'] };
  const out = options.out;
  if (!existsSync(out)) mkdirSync(out, { recursive: true });
  writeReadme(out, options, plan);
  const ledgerPath = join(out, 'ledger.csv');
  writeFileSync(ledgerPath, CSV_HEAD);

  const rng = makeRng(options.rngSeed);
  const games = new Map<string, Done>();
  const file: Member = {
    id: genomeId(FILE),
    genome: FILE,
    parents: [],
    born: 0,
    fitness: 0,
    wins: 0,
    games: 0,
    scoredAgainst: genomeId(FILE),
  };
  let elites: Member[] = [file];
  let champion: Member = file;
  let previousSentinel: string | null = null;
  const seen = new Set<string>([file.id]);

  console.log(
    `evolve · ${options.quick ? 'quick' : 'full'} · μ ${options.mu} λ ${options.lambda} · ` +
      `seeds ${plan.seeds.join('/')} · ${plan.sizes.join('/')} · ${options.workers} workers · ${out}`,
  );
  writeChampion(out, champion);

  for (let generation = 1; generation <= options.generations; generation += 1) {
    const started = Date.now();

    // Breed. A duplicate genome (an id already seen) is mutated again rather
    // than played twice; five tries, then it is what it is.
    const children: Member[] = [];
    for (let index = 0; index < options.lambda; index += 1) {
      let child: Genome | null = null;
      let parents: string[] = [];
      for (let attempt = 0; attempt < 5 && (child === null || seen.has(genomeId(child))); attempt += 1) {
        const a = tournament(elites, rng);
        const b = tournament(elites, rng);
        if (a.id !== b.id && nextFloat(rng) < 0.5) {
          child = mutate(crossover(a.genome, b.genome, rng), BOUNDS, rng);
          parents = [a.id, b.id];
        } else {
          child = mutate(a.genome, BOUNDS, rng);
          parents = [a.id];
        }
      }
      const problems = genomeProblems(child!);
      if (problems.length > 0) throw new Error(`a child is malformed: ${problems.join('; ')}`);
      const id = genomeId(child!);
      seen.add(id);
      children.push({ id, genome: child!, parents, born: generation, fitness: 0, wins: 0, games: 0, scoredAgainst: champion.id });
    }

    // Plan. The sentinel first, so two workers pick it up; then the stale
    // elites' re-plays, the children's games, and the held-out validation.
    const tasks: Task[] = [];
    const sentinelSeed = plan.seeds[0]!;
    for (const side of ['a', 'b']) {
      tasks.push({
        key: `sentinel|${generation}|${side}`,
        seed: sentinelSeed,
        sizeName: 'duel',
        turns: SENTINEL_TURNS,
        sheets: seatingOf(champion.genome, champion.genome, 0),
      });
    }
    const stale = elites.filter((elite) => elite.id !== champion.id && elite.scoredAgainst !== champion.id);
    for (const elite of stale) tasks.push(...matchTasks(elite, champion, plan.seeds, plan.sizes));
    for (const child of children) tasks.push(...matchTasks(child, champion, plan.seeds, plan.sizes));
    const validating = generation % 5 === 0 && champion.id !== file.id;
    if (validating) tasks.push(...matchTasks(champion, file, plan.heldOut, plan.sizes));
    const fresh = tasks.filter((task) => !games.has(task.key));

    console.log(
      `\ngeneration ${generation} · champion ${champion.id} · ${children.length} children · ` +
        `${stale.length} stale elites · ${fresh.length} games to play (${tasks.length - fresh.length} cached)`,
    );
    const { done, workerOf } = await fanOut(fresh, options.workers);
    for (const [key, answer] of done) games.set(key, answer);

    // The sentinel: two replays, one digest, or the run stops here.
    const a = games.get(`sentinel|${generation}|a`)!;
    const b = games.get(`sentinel|${generation}|b`)!;
    const sameWorker = workerOf.get(a.key) === workerOf.get(b.key);
    const sentinelNote = `${a.digest}${sameWorker ? ' (both replays in one worker)' : ''}`;
    let halt: string | null = null;
    if (a.digest !== b.digest) {
      halt = `sentinel replays disagree: ${a.digest} vs ${b.digest} (champion ${champion.id}, seed ${sentinelSeed}, duel ${SENTINEL_TURNS})`;
    } else if (previousSentinel !== null && previousSentinel !== a.digest) {
      halt = `the sentinel moved between generations with the champion unchanged: ${previousSentinel} → ${a.digest}`;
    }
    if (halt !== null) {
      writeFileSync(join(out, 'HALT.md'), `# Halted at generation ${generation}\n\n${halt}\n`);
      console.error(`\nHALT: ${halt}`);
      process.exit(1);
    }

    // Score. The stale elites first (against the champion, fresh), then the children.
    const verdicts = new Map<string, Verdict>();
    for (const elite of stale) {
      const verdict = verdictOf(elite, champion, plan.seeds, plan.sizes, games);
      verdicts.set(elite.id, verdict);
      elite.fitness = verdict.fitness;
      elite.wins = verdict.wins;
      elite.games = verdict.games;
      elite.scoredAgainst = champion.id;
    }
    for (const child of children) {
      const verdict = verdictOf(child, champion, plan.seeds, plan.sizes, games);
      verdicts.set(child.id, verdict);
      child.fitness = verdict.disqualified ? Number.NEGATIVE_INFINITY : verdict.fitness;
      child.wins = verdict.wins;
      child.games = verdict.games;
    }

    // Promote: the best child ahead in two thirds of its games, if any.
    const needed = Math.ceil(PROMOTION_SHARE * 2 * plan.seeds.length * plan.sizes.length);
    const qualified = rank(children.filter((child) => Number.isFinite(child.fitness) && child.wins >= needed));
    const promoted = qualified[0] ?? null;

    // Cut: the top μ of elites ∪ children in the old champion's frame, the
    // champion (new or old) always kept.
    const pool = rank([...elites, ...children.filter((child) => Number.isFinite(child.fitness))]);
    const keep: Member[] = [];
    const next = promoted ?? champion;
    keep.push(next);
    for (const member of pool) {
      if (keep.length >= options.mu) break;
      if (member.id !== next.id) keep.push(member);
    }
    const oldChampion = champion;
    if (promoted !== null) {
      // The old champion's games are the new champion's, mirrored — exact.
      oldChampion.fitness = round(-promoted.fitness);
      oldChampion.wins = promoted.games - promoted.wins;
      oldChampion.scoredAgainst = promoted.id;
      promoted.fitness = 0;
      promoted.scoredAgainst = promoted.id;
      champion = promoted;
      previousSentinel = null;
    } else {
      previousSentinel = a.digest;
    }
    elites = keep;

    // Held-out validation of the champion that *entered* this generation.
    let heldOutNote = '';
    if (validating) {
      const verdict = verdictOf(oldChampion, file, plan.heldOut, plan.sizes, games);
      const bar = Math.ceil(PROMOTION_SHARE * 2 * plan.heldOut.length * plan.sizes.length);
      heldOutNote = verdict.wins >= bar ? 'held-out: holds' : `held-out: FLAGGED (${verdict.wins}/${verdict.games} against the file)`;
      appendFileSync(ledgerPath, csvRow(generation, 'held-out', oldChampion, verdict, { ...plan, seeds: plan.heldOut }, heldOutNote));
    }

    // Ledger.
    const rows: string[] = [];
    const table: string[] = [];
    table.push('| id | kind | parents | fitness | ahead | duel | standard | by seed | Opus turns | warnings | stalls | verdict |');
    table.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
    const listed = rank([...stale, ...children]).sort((x, y) => {
      const fx = verdicts.get(x.id)!.fitness;
      const fy = verdicts.get(y.id)!.fitness;
      return fy - fx || (x.id < y.id ? -1 : 1);
    });
    for (const member of listed) {
      const verdict = verdicts.get(member.id)!;
      const kind = children.includes(member) ? 'child' : 'elite';
      const note = verdict.disqualified
        ? 'disqualified'
        : member.id === champion.id && promoted !== null
          ? 'PROMOTED'
          : verdict.wins >= needed
            ? 'qualified'
            : '';
      rows.push(csvRow(generation, kind, member, verdict, plan, note));
      table.push(
        `| ${member.id} | ${kind} | ${member.parents.join(' ')} | ${verdict.fitness} | ${verdict.wins}/${verdict.games} | ` +
          `${verdict.bySize.duel ?? '—'} | ${verdict.bySize.standard ?? '—'} | ` +
          `${plan.seeds.map((seed) => `${seed}: ${verdict.bySeed[seed] ?? '—'}`).join(', ')} | ` +
          `${verdict.opusTurns.join(' ') || '—'} | ${verdict.warnings} | ${verdict.stalls} | ${note} |`,
      );
    }
    appendFileSync(ledgerPath, rows.join(''));

    const diff = describeDiff(FILE, champion.genome);
    const md = [
      `# Generation ${generation}`,
      '',
      `- champion entering: ${oldChampion.id}${promoted !== null ? ` → **promoted ${champion.id}** (ahead in ${promoted.wins}/${promoted.games})` : ' — kept'}`,
      `- sentinel digest: ${sentinelNote}`,
      `- elites: ${elites.map((elite) => `${elite.id} (${elite.fitness})`).join(', ')}`,
      heldOutNote === '' ? '' : `- ${heldOutNote}`,
      '',
      ...table,
      '',
      `## Champion ${champion.id} against \`data/ai.json\``,
      '',
      diff.length === 0 ? "The file's own sheet." : diff.map((line) => `- ${line}`).join('\n'),
      '',
    ]
      .filter((line) => line !== undefined)
      .join('\n');
    writeFileSync(join(out, `gen-${String(generation).padStart(3, '0')}.md`), md);
    writeChampion(out, champion);
    writeFileSync(
      join(out, 'games.json'),
      `${JSON.stringify(Object.fromEntries([...games.entries()].sort(([x], [y]) => (x < y ? -1 : 1))), null, 1)}\n`,
    );

    const seconds = Math.round((Date.now() - started) / 1000);
    console.log(
      `generation ${generation} done in ${seconds}s · champion ${champion.id}` +
        `${promoted !== null ? ' (promoted)' : ''} · best child ${listed[0]?.id ?? '—'} ${verdicts.get(listed[0]?.id ?? '')?.fitness ?? ''}` +
        ` · sentinel ${a.digest}`,
    );
  }
  console.log(`\nwrote ${out}`);
}

if (process.argv.includes('--worker')) serve();
else void main();
