/**
 * **The parity harness** — one-time, and it is deleted when E3 lands.
 *
 * `docs/flags.md` ruling (pp), batch E1: the evaluations cleanup (E2 and E3)
 * moves `cityQuote` onto a labelled list, splits `cities.ts` and
 * `statecraft.ts` along the layers of `docs/yields.md`, and renames half the
 * verbs. **Nothing about a number may move while it does.** So before any of
 * it, four boards are played out and every reading the refactor will touch is
 * written down; every later run replays the same four boards and compares.
 *
 * It is `slow` **by kind** (CLAUDE.md's tier rule): four full games to turn a
 * hundred and fifty, and a fixture comparison — a seed sweep in all but name.
 * The sibling core file for this concern is `test/sim/yieldOrder.test.ts`,
 * which pins the *order* the readings come out in; this pins the *figures*.
 *
 * **Why `node:fs` and not the house raw-glob** (`test/ui/seatRoster.test.ts`'s
 * pattern): the harness writes its own fixtures on the first run, and a glob
 * cannot write. The specifier is held in a variable so the project's type
 * surface stays `vite/client` alone — the same bargain `vite.config.ts` strikes
 * with `declare const process`.
 *
 * **The hash is FNV-1a, 32-bit, printed in hex.** Said out loud because the H6
 * probe used `djb2` and a fixture whose hash function drifted would fail as a
 * behaviour change. It hashes `snapshotState`'s own text, so the hash moves iff
 * the state's canonical print moves.
 */

import { driveBots } from '../../src/ai/driver';
import {
  cardBuildingYields,
  cityContext,
  cityQuote,
  cityYields,
  explainEmpireLines,
  explainTileYield,
} from '../../src/sim/cities';
import { type CardImpactSubject, explainCardImpact } from '../../src/sim/cardImpact';
import { type Game, createGame, snapshotState } from '../../src/sim/game';
import { getTileAt } from '../../src/sim/map';
import { type GameConfig, type GameState, realPlayers } from '../../src/sim/state';
import { cardCityYields, cardYieldConversions } from '../../src/sim/statecraft';
import { deckAggregate, ledgerReading } from '../../src/ui/ledgerScreen';
import { civYields } from '../../src/ui/topBar';

/** The four boards, in the order the fixtures are named for. */
export interface Board {
  /** The fixture's basename, and the first segment of every failure path. */
  id: string;
  config: GameConfig;
}

/**
 * Two duels and two standard maps, two bot seats each, the wild in the fog.
 *
 * The seeds are the ruling's: 20260831 is `aiBot.slow`'s own board (a world
 * both empires can grow in), 4242 and 20260907 are arbitrary, and 7 is the
 * seed every bench in `test/sim` opens on. Two sizes because a duel map's
 * towns crowd and a standard map's spread — the empire's lines and the routes
 * abroad only have anything to say on the second.
 */
export const BOARDS: readonly Board[] = [
  {
    id: 'duel-20260831',
    config: {
      seed: 20260831,
      sizeName: 'duel',
      players: [
        { name: 'Crimson', color: '#d4502e' },
        { name: 'Teal', color: '#1f8a85' },
      ],
      barbarians: true,
    },
  },
  {
    id: 'duel-4242',
    config: {
      seed: 4242,
      sizeName: 'duel',
      players: [
        { name: 'Crimson', color: '#d4502e' },
        { name: 'Teal', color: '#1f8a85' },
      ],
      barbarians: true,
    },
  },
  {
    id: 'standard-7',
    config: {
      seed: 7,
      sizeName: 'standard',
      players: [
        { name: 'Crimson', color: '#d4502e' },
        { name: 'Teal', color: '#1f8a85' },
      ],
      barbarians: true,
    },
  },
  {
    id: 'standard-20260907',
    config: {
      seed: 20260907,
      sizeName: 'standard',
      players: [
        { name: 'Crimson', color: '#d4502e' },
        { name: 'Teal', color: '#1f8a85' },
      ],
      barbarians: true,
    },
  },
];

/** The turns a reading is taken on. */
export const MARKS: readonly number[] = [30, 60, 150];

/**
 * Rounded to a billionth on the way into the JSON.
 *
 * Yields are exact decimals since batch X, so a fold's last bit can differ
 * between two arithmetically identical orders of the same sum. A billionth is
 * far below anything a rule reads and far above float noise. `-0` is written
 * as `0` for the reason `clampTakeBack` returns `0`: a ledger entry is compared
 * byte for byte.
 */
export function round9(value: number): number {
  const rounded = Math.round(value * 1e9) / 1e9;
  return rounded === 0 ? 0 : rounded;
}

const VOICES = ['food', 'production', 'gold', 'science', 'culture', 'faith'] as const;

/** The six voices of any bag, rounded — the shape every reading below is made of. */
function voices(bag: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of VOICES) out[key] = round9((bag[key] as number | undefined) ?? 0);
  return out;
}

/** A labelled line: its source, whatever handles it carries, and the six voices. */
function line(
  source: string,
  bag: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return { source, ...extra, ...voices(bag) };
}

/** FNV-1a, 32-bit, hex — see the module docblock. */
export function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Every card this seat holds, in a deterministic order — the subjects
 * `explainCardImpact` is asked about.
 *
 * Array order throughout (CLAUDE.md rule 2), and a seat's own religion is read
 * off `state.religions` rather than off a follower city, because the founder is
 * who a belief's card impact is a fact about.
 */
export function heldCards(state: GameState, playerId: number): CardImpactSubject[] {
  const player = state.players[playerId];
  if (!player) return [];
  const sc = player.statecraft;
  const subjects: CardImpactSubject[] = [{ kind: 'government', id: sc.government }];
  for (const id of sc.orders) subjects.push({ kind: 'order', id });
  for (const id of sc.doctrines) subjects.push({ kind: 'doctrine', id });
  const beliefs: string[] = [];
  const takeBelief = (id: string): void => {
    if (!beliefs.includes(id)) beliefs.push(id);
  };
  for (const id of player.pantheon.beliefs) takeBelief(id);
  for (const religion of state.religions) {
    if (religion.founderId !== playerId) continue;
    for (const id of religion.follower) takeBelief(id);
    for (const id of religion.enhancer) takeBelief(id);
  }
  for (const id of beliefs) subjects.push({ kind: 'belief', id } as CardImpactSubject);
  for (const record of player.legacies) subjects.push({ kind: 'legacy', id: record.id });
  return subjects;
}

/** One town's whole reading — every fold `cityQuote` composes, in its own order. */
function townReading(state: GameState, cityIndex: number): Record<string, unknown> {
  const city = state.cities[cityIndex]!;
  const quote = cityQuote(state, city);
  const toward = city.queue[0] ?? null;
  const ctx = cityContext(state, city);
  const hexes: Record<string, unknown>[] = [];
  for (const cell of city.workedTiles) {
    const tile = getTileAt(state.map, cell.col, cell.row);
    if (!tile) continue;
    hexes.push({
      col: cell.col,
      row: cell.row,
      lines: explainTileYield(tile, ctx).map((entry) =>
        line(entry.source, entry as unknown as Record<string, unknown>, { kind: entry.kind }),
      ),
    });
  }
  return {
    id: city.id,
    name: city.name,
    population: city.population,
    flats: voices(quote.flats as unknown as Record<string, unknown>),
    percents: quote.percents.map((entry) => ({
      source: entry.source,
      yield: entry.yield,
      percent: entry.percent,
      stage: entry.stage,
    })),
    total: voices(
      cityYields(state, city, [], toward, quote) as unknown as Record<string, unknown>,
    ),
    cardCity: cardCityYields(state, city).map((entry) =>
      line(entry.source, entry as unknown as Record<string, unknown>),
    ),
    cardBuilding: cardBuildingYields(state, city).map((entry) =>
      line(entry.source, entry as unknown as Record<string, unknown>),
    ),
    conversions: cardYieldConversions(state, city, quote.flats).map((entry) =>
      line(entry.source, entry as unknown as Record<string, unknown>),
    ),
    hexes,
  };
}

/** One seat's whole reading at one mark. */
function seatReading(state: GameState, playerId: number): Record<string, unknown> {
  const towns: Record<string, unknown>[] = [];
  for (let i = 0; i < state.cities.length; i++) {
    if (state.cities[i]!.ownerId !== playerId) continue;
    towns.push(townReading(state, i));
  }
  return {
    seat: playerId,
    name: state.players[playerId]?.name ?? '',
    towns,
    civYields: voices(civYields(state, playerId) as unknown as Record<string, unknown>),
    empireLines: explainEmpireLines(state, playerId).map((entry) =>
      line(entry.source, entry as unknown as Record<string, unknown>, {
        origin: entry.origin,
        ...(entry.bill === true ? { bill: true } : {}),
        ...(entry.factor === undefined ? {} : { factor: round9(entry.factor) }),
      }),
    ),
    ledger: ledgerReading(state, playerId).map((voice) => ({
      key: voice.key,
      total: round9(voice.total),
      byClass: Object.fromEntries(
        Object.entries(voice.byClass).map(([cls, amount]) => [cls, round9(amount)]),
      ),
    })),
    deck: deckAggregate(state, playerId).figures.map((figure) => ({
      glyph: figure.glyph,
      amount: round9(figure.amount),
    })),
    cards: heldCards(state, playerId).map((subject) => ({
      subject: `${subject.kind}:${subject.id}`,
      lines: explainCardImpact(state, playerId, subject).map((entry) =>
        line(entry.source, entry as unknown as Record<string, unknown>, {
          kind: entry.kind,
          ...(entry.amount === undefined ? {} : { amount: round9(entry.amount) }),
        }),
      ),
    })),
  };
}

/**
 * One board's whole fixture: three marks, every real seat at each.
 *
 * **Asynchronous only to breathe.** A board is forty seconds of straight-line
 * simulation, and a Vitest fork that never returns to its event loop for forty
 * seconds misses the reporter's heartbeat — the run then dies on
 * `Timeout calling "onTaskUpdate"` rather than on anything about a yield. So the
 * loop yields a macrotask every few turns. It touches no figure: the simulation
 * is pure and reads no clock (CLAUDE.md), so a board played in one breath and
 * one played in fifty are byte-identical.
 */
export async function playBoard(board: Board): Promise<Record<string, unknown>> {
  const game: Game = createGame(board.config);
  const marks: Record<string, unknown>[] = [];
  const last = MARKS[MARKS.length - 1]!;
  const wanted = new Set(MARKS);
  for (let turn = 0; turn < last; turn++) {
    driveBots(game, { warn: () => {} });
    if (turn % 5 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    if (!wanted.has(game.state.turn)) continue;
    marks.push({
      turn: game.state.turn,
      // Once per mark, not per seat: `snapshotState` is the whole board's
      // canonical print, and there is no per-seat reading of it.
      snapshot: fnv1a(snapshotState(game.state)),
      seats: realPlayers(game.state).map((player) => seatReading(game.state, player.id)),
    });
  }
  return { board: board.id, marks };
}

// --- the fixtures ------------------------------------------------------------

/** `node:fs`, behind a variable specifier — see the module docblock. */
const FS_SPECIFIER = 'node:fs';

interface MinimalFs {
  existsSync(path: string): boolean;
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  readFileSync(path: string, encoding: string): string;
  writeFileSync(path: string, data: string): void;
  statSync(path: string): { size: number };
}

async function fs(): Promise<MinimalFs> {
  return (await import(/* @vite-ignore */ FS_SPECIFIER)) as MinimalFs;
}

/** The fixture directory, resolved off this module rather than off a cwd. */
export const FIXTURE_DIR = new URL('../fixtures/parity/', import.meta.url).pathname;

export function fixturePath(boardId: string): string {
  return `${FIXTURE_DIR}${boardId}.json`;
}

export async function readFixture(boardId: string): Promise<Record<string, unknown> | null> {
  const io = await fs();
  const path = fixturePath(boardId);
  if (!io.existsSync(path)) return null;
  return JSON.parse(io.readFileSync(path, 'utf8')) as Record<string, unknown>;
}

/** Writes one fixture and answers its size in bytes. */
export async function writeFixture(
  boardId: string,
  reading: Record<string, unknown>,
): Promise<number> {
  const io = await fs();
  io.mkdirSync(FIXTURE_DIR, { recursive: true });
  const path = fixturePath(boardId);
  io.writeFileSync(path, `${JSON.stringify(reading)}\n`);
  return io.statSync(path).size;
}

// --- the comparison ----------------------------------------------------------

/** Where two readings first part company, and what each said there. */
export interface Difference {
  path: string;
  expected: unknown;
  actual: unknown;
}

/**
 * The **first** difference between the fixture and this run, by path.
 *
 * Depth-first in the fixture's own key order, so the path a failure names is
 * the outermost thing that moved (board → turn → seat → town → reading → line)
 * rather than the last leaf a diff happened to visit. `null` when the two agree.
 */
export function firstDifference(
  expected: unknown,
  actual: unknown,
  path = '',
): Difference | null {
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) {
      return { path, expected, actual };
    }
    const shared = Math.min(expected.length, actual.length);
    for (let i = 0; i < shared; i++) {
      const found = firstDifference(expected[i], actual[i], `${path}[${i}]`);
      if (found) return found;
    }
    if (expected.length !== actual.length) {
      return { path: `${path}.length`, expected: expected.length, actual: actual.length };
    }
    return null;
  }
  const bothObjects =
    typeof expected === 'object' &&
    expected !== null &&
    typeof actual === 'object' &&
    actual !== null;
  if (bothObjects) {
    const left = expected as Record<string, unknown>;
    const right = actual as Record<string, unknown>;
    const keys = [...Object.keys(left)];
    for (const key of Object.keys(right)) if (!keys.includes(key)) keys.push(key);
    for (const key of keys) {
      if (!(key in left) || !(key in right)) {
        return { path: `${path}.${key}`, expected: left[key], actual: right[key] };
      }
      const found = firstDifference(left[key], right[key], `${path}.${key}`);
      if (found) return found;
    }
    return null;
  }
  if (expected !== actual) return { path, expected, actual };
  return null;
}
