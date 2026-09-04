/**
 * **One arena game, played headless, read at the final turn.**
 *
 * The arena page's engine room, and pure over the simulation: no DOM, no canvas,
 * no renderer, nothing about a worker. That is what lets the very same function
 * run inside a Web Worker for the page and inside a test for the suite — and the
 * reading a test checks is therefore the reading the page prints.
 *
 * Two rules keep the numbers honest, and they are the mapgen page's two rules
 * one system over:
 *
 *   1. **The game is played with the real driver.** Every command comes out of
 *      `driveBots`, which is the loop the product plays its bots with. A page
 *      with a loop of its own would be a page measuring a game nobody plays.
 *   2. **Nothing is counted here.** Every figure is the simulation's own —
 *      `empireRateReading` for the four banked voices (the very fold
 *      `collectYields` banks, maintenance included), `cityYields` for food and
 *      hammers, `city.population` for citizens. This file sums over cities and
 *      filters unit rows; it computes no rate and invents no rule.
 *
 * The tuning sheet rides in through `withAiTuning` (see its docblock in
 * `aiConfig.ts`), which is scoped: a thrown exception cannot leave a dial turned
 * for whatever runs next in the same module instance.
 */

import { type PersonaOverride, withAiTuning } from '../ai/aiConfig';
import { driveBots } from '../ai/driver';
import { type Game, createGame } from '../sim/game';
import { type PlayerSpec, realPlayers } from '../sim/state';
import { cityYields, empireRateReading } from '../sim/cities';
import { authorityOf, happinessOf } from '../sim/meters';
import { isCombatant, isExplorer, unitDef } from '../sim/unitData';

/** What one seat is, as the page hands it over: a name, an ink, a persona. */
export interface ArenaSeat {
  name: string;
  color: string;
  /** A `PERSONA_IDS` entry. `balanced` is written as no key at all in the spec. */
  persona: string;
}

/** Everything one game needs. Plain JSON — it crosses a worker boundary. */
export interface ArenaSpec {
  seed: number;
  sizeName: string;
  turns: number;
  seats: readonly ArenaSeat[];
  barbarians: boolean;
  /** The panel's sparse sheet, or `null` for `data/ai.json` exactly as it is. */
  tuning: PersonaOverride | null;
}

/**
 * One seat's state of the world at the final turn.
 *
 * The four rate voices are per-turn (`empireRateReading`); `food` and
 * `production` are the same per-turn reading summed over the empire's towns,
 * because there is no empire-scale fold of those two — a basket and a hammer are
 * city-scoped facts and the sim never adds them up.
 */
export interface SeatReading {
  playerId: number;
  name: string;
  persona: string;
  color: string;
  eliminated: boolean;
  cities: number;
  population: number;
  food: number;
  production: number;
  gold: number;
  goldPerTurn: number;
  science: number;
  culture: number;
  faith: number;
  happiness: number;
  authority: number;
  units: number;
  soldiers: number;
  scouts: number;
  workers: number;
  techs: number;
  beads: number;
}

/** One finished game. */
export interface GameReading {
  seed: number;
  /** The turn the run stopped on — the target, or earlier if the game decided. */
  turnsPlayed: number;
  seats: SeatReading[];
  /** Set if somebody finished the Great Work before the clock ran out. */
  winnerId: number | null;
  /** Refusals the driver reported. Any number above zero is a bug in the bot. */
  warnings: number;
  /** True if a turn passed without the clock advancing — a stalled seat. */
  stalled: boolean;
  /** Wall time, milliseconds. A measurement of this page, not of the game. */
  ms: number;
}

/**
 * The **numeric** columns of a reading, which is what an average is taken over.
 *
 * Named here rather than derived with `keyof` so that adding a column to
 * `SeatReading` is a deliberate act on both sides: a new figure joins this list
 * and the table averages it, or it does not and the table says so.
 */
export const READING_COLUMNS = [
  'cities',
  'population',
  'food',
  'production',
  'gold',
  'goldPerTurn',
  'science',
  'culture',
  'faith',
  'happiness',
  'authority',
  'units',
  'soldiers',
  'scouts',
  'workers',
  'techs',
  'beads',
] as const;

export type ReadingColumn = (typeof READING_COLUMNS)[number];

/**
 * Plays one game to `spec.turns` and reads every seat.
 *
 * `onTurn` is called after each resolved turn, which is what the page's progress
 * line is; a test passes nothing. The loop stops early on a decided game
 * (`winnerId`) and on a stall — a `driveBots` pass that left the clock where it
 * was means a seat could not end its turn, and spinning on that is the one way
 * this could hang.
 */
export function runArenaGame(spec: ArenaSpec, onTurn?: (turn: number) => void): GameReading {
  const started = performance.now();
  return withAiTuning(spec.tuning, () => {
    const players: PlayerSpec[] = spec.seats.map((seat) => ({
      name: seat.name,
      color: seat.color,
      // Balanced is written as *no key at all*, exactly as the landing screen and
      // the spectate page write it — so an untuned balanced arena game is
      // byte-identical to one from before personas existed.
      ...(seat.persona === 'balanced' ? {} : { persona: seat.persona }),
      // `isHuman` left off is what makes a chair a bot (`normalizeConfig`).
    }));
    const game: Game = createGame({
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
      onTurn?.(game.state.turn);
    }

    return {
      seed: spec.seed,
      turnsPlayed: game.state.turn - 1,
      seats: realPlayers(game.state).map((player) => readSeat(game, player.id)),
      winnerId: game.state.winnerId,
      warnings,
      stalled,
      ms: performance.now() - started,
    };
  });
}

function readSeat(game: Game, playerId: number): SeatReading {
  const { state } = game;
  const player = state.players[playerId]!;
  const rates = empireRateReading(state, playerId);

  let cities = 0;
  let population = 0;
  let food = 0;
  let production = 0;
  for (const city of state.cities) {
    if (city.ownerId !== playerId) continue;
    cities += 1;
    population += city.population;
    // The town priced toward what it is actually building, which is the reading
    // `empireRates` takes for the other four voices — one set of books.
    const yields = cityYields(state, city, [], city.queue[0]);
    food += yields.food;
    production += yields.production;
  }

  let units = 0;
  let soldiers = 0;
  let scouts = 0;
  let workers = 0;
  for (const unit of state.units) {
    if (unit.ownerId !== playerId) continue;
    const def = unitDef(unit.type);
    units += 1;
    if (isCombatant(def)) soldiers += 1;
    if (isExplorer(def)) scouts += 1;
    if (isBuilder(def)) workers += 1;
  }

  return {
    playerId,
    name: player.name,
    persona: player.persona ?? 'balanced',
    color: player.color,
    eliminated: player.eliminated === true,
    cities,
    population,
    food,
    production,
    gold: player.gold,
    // `RateReading`'s voices are optional — a reading may be asked of a shape
    // that banks nothing — so a missing line is nought rather than a hole.
    goldPerTurn: rates.goldPerTurn ?? 0,
    science: rates.sciencePerTurn ?? 0,
    culture: rates.culturePerTurn ?? 0,
    faith: rates.faithPerTurn ?? 0,
    // The two meters are standings, not rates — the same folds the top bar
    // prints (`happinessOf`/`authorityOf`), asked once at the reading turn.
    happiness: happinessOf(state, playerId),
    authority: authorityOf(state, playerId),
    units,
    soldiers,
    scouts,
    workers,
    techs: player.techsResearched.length,
    beads: player.beads.length,
  };
}

/**
 * Is this row the piece that lays farms and mines?
 *
 * The same sentence `bot.ts` says in `isPlainBuilder`, read off the row's own
 * markers and never off a type name: a settler spends its charge founding, an
 * augur on a rite, a prophet on a holy site, a great person on a work — four
 * other things in the roster carry charges and none of them is a spade. Written
 * here rather than imported because that one is private to the policy and this
 * page has no business reaching into it; if a third reader ever wants it, the
 * answer is to move it beside `isExplorer` in `unitData.ts`, not to keep three.
 */
function isBuilder(def: ReturnType<typeof unitDef>): boolean {
  if (def.charges === undefined) return false;
  if (def.foundsCity === true) return false;
  if (def.greatWork === true) return false;
  if (def.consecrates === true) return false;
  if (def.prophesies === true) return false;
  return true;
}
