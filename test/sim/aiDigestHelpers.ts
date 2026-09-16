/**
 * **The six-seat game and its digest** — one reading shared by the slow tier's
 * pin (`aiDigest.slow.test.ts`) and the evolutionary harness's sentinel
 * (`scripts/evolve.ts`), so that "the bots decide identically" means the same
 * sentence in both places (`docs/plans/bot-evolution.md` §3.5, ruling 7).
 *
 * A non-test module on purpose (CLAUDE.md's tier rule): importing a `.test.ts`
 * file re-registers its tests, and the harness is not a test at all.
 *
 * Why the loop is here rather than borrowed from `runArenaGame`
 * -------------------------------------------------------------
 * The arena's engine (`src/arenaPage/run.ts`) plays exactly this loop but hands
 * back a *reading* — towns, rates, meters — and never the state, and both
 * readers here need the state itself: the digest is `snapshotState` hashed, and
 * the harness's judge is `explainScore(state, seat)`. So the loop is restated
 * in its own words, stop rules included (the target turn, a decided game, a
 * stalled seat), and the day `run.ts` grows a hook that hands the game out this
 * function becomes a call to it.
 *
 * Seating
 * -------
 * A seat plays either **by persona key** (the roster's path — `Player.persona`
 * is written into the state, the file's override merged by `aiConfigFor`) or
 * **by sheet** (the harness's path — a whole merged sheet installed through the
 * per-seat tuning door, `setAiTuning(sheet, {playerId})`, no key written, so
 * the file's persona tables are never consulted). The digest test seats by key;
 * the harness seats by sheet. Every seat sheet comes off in a `finally`, because
 * a thrown game must not leave a dial turned for the next one in the same
 * module instance (`gridSearch.ts`'s rule).
 */

import { type PersonaOverride, clearSeatTuning, setAiTuning } from '../../src/ai/aiConfig';
import { driveBots } from '../../src/ai/driver';
import { type Game, createGame, snapshotState } from '../../src/sim/game';
import type { GameState, PlayerSpec } from '../../src/sim/state';

/**
 * The persona order of the measured six-seat game (§3.6 of the plan): the
 * balanced seat twice, once at each end, so the mirror of a harness game gives
 * every genome every persona.
 */
export const SIX_SEAT_PERSONAS: readonly string[] = [
  'balanced',
  'wide',
  'tall',
  'zealot',
  'warmonger',
  'balanced',
];

/** The seed every 120-turn six-seat reading in `docs/flags.md` was taken at. */
export const DIGEST_SEED = 20260831;
export const DIGEST_TURNS = 120;

/** Six inks, one a seat. The simulation never interprets them. */
const SEAT_COLORS: readonly string[] = ['#d4502e', '#1f8a85', '#6a4c93', '#c9a227', '#3c6e47', '#8a5a44'];

export interface SeatSpec {
  name: string;
  color: string;
  /** The roster's path: a persona key written into the state. Absent = balanced. */
  persona?: string;
  /** The harness's path: a whole sheet installed for this seat alone. */
  sheet?: PersonaOverride | null;
}

export interface PlaySpec {
  seed: number;
  sizeName: string;
  turns: number;
  seats: readonly SeatSpec[];
  barbarians: boolean;
}

export interface Played {
  game: Game;
  /** The turn the run stopped on — the target, or earlier if the game decided. */
  turnsPlayed: number;
  winnerId: number | null;
  /** Refusals the driver reported. Any number above zero is a bug in the bot. */
  warnings: number;
  /** True if a turn passed without the clock advancing — a stalled seat. */
  stalled: boolean;
}

/** The measured six-seat game, seated by persona key. */
export function sixSeatSpec(sizeName: string, seed = DIGEST_SEED, turns = DIGEST_TURNS): PlaySpec {
  return {
    seed,
    sizeName,
    turns,
    barbarians: true,
    seats: SIX_SEAT_PERSONAS.map((persona, index) => ({
      name: `Seat ${index + 1}`,
      color: SEAT_COLORS[index]!,
      ...(persona === 'balanced' ? {} : { persona }),
    })),
  };
}

/**
 * The same six chairs seated **by sheet** — the harness's game: one whole merged
 * sheet a seat, no persona key written, so the file's persona tables are never
 * consulted and the genome's own are the only ones in play.
 */
export function sheetSeatedSpec(
  seed: number,
  sizeName: string,
  turns: number,
  sheets: readonly PersonaOverride[],
): PlaySpec {
  return {
    seed,
    sizeName,
    turns,
    barbarians: true,
    seats: sheets.map((sheet, index) => ({
      name: `Seat ${index + 1}`,
      color: SEAT_COLORS[index % SEAT_COLORS.length]!,
      sheet,
    })),
  };
}

/**
 * Plays one game to `spec.turns` and hands back the game itself.
 *
 * The loop is `runArenaGame`'s: stop on the target turn, on a decided game, and
 * on a stall — a `driveBots` pass that left the clock where it was means a seat
 * could not end its turn, and spinning on that is the one way this could hang.
 */
export function playSeatedGame(spec: PlaySpec): Played {
  for (const [index, seat] of spec.seats.entries()) {
    if (seat.sheet !== undefined && seat.sheet !== null) setAiTuning(seat.sheet, { playerId: index });
  }
  try {
    const players: PlayerSpec[] = spec.seats.map((seat) => ({
      name: seat.name,
      color: seat.color,
      // Balanced is written as no key at all, exactly as the landing screen and
      // the arena write it; a seat playing by sheet carries no key either.
      ...(seat.persona === undefined || seat.persona === 'balanced' ? {} : { persona: seat.persona }),
    }));
    const game = createGame({
      seed: spec.seed,
      sizeName: spec.sizeName,
      players,
      barbarians: spec.barbarians,
    });
    let warnings = 0;
    let stalled = false;
    while (game.state.turn <= spec.turns && game.state.winnerId === null) {
      const before = game.state.turn;
      driveBots(game, {
        warn: () => {
          warnings += 1;
        },
      });
      if (game.state.turn === before) {
        stalled = true;
        break;
      }
    }
    return {
      game,
      turnsPlayed: game.state.turn - 1,
      winnerId: game.state.winnerId,
      warnings,
      stalled,
    };
  } finally {
    clearSeatTuning();
  }
}

/**
 * FNV-1a over the text, printed as eight hex digits and the length — the
 * `explore.test.ts` `RANGED_BOARDS` print. A hash rather than the dump because a
 * six-seat state is several hundred kilobytes, and because a literal nobody can
 * read is a literal nobody is tempted to repair by hand.
 */
export function digest(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${hash.toString(16).padStart(8, '0')}:${text.length}`;
}

/** The whole state, hashed. The one reading both tiers and the harness take. */
export function digestOfState(state: GameState): string {
  return digest(snapshotState(state));
}
