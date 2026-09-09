/**
 * The two lines `statecraft.test.ts` and `statecraft.slow.test.ts` both open
 * with.
 *
 * The concern's two long replays — sixty turns of slotting and unslotting, and
 * forty turns of reaching a draft the honest way — are slow-tier by shape and
 * live in the sibling file. They start from the same duel game and found a city
 * the same way as every other test here, so the fixture lives in a plain module:
 * importing a `.test.ts` from a `.test.ts` re-registers its tests and the suite
 * would count them twice.
 */
import { foundCityAt } from '../../src/sim/cities';
import { type Game, createGame, dispatch, restoreState, snapshotState } from '../../src/sim/game';
import type { Command } from '../../src/sim/commands';
import { getTileAt } from '../../src/sim/map';
import { type GameConfig, type GameState, bumpRevision } from '../../src/sim/state';
import { ABILITY_TECH } from '../../src/sim/techData';

/**
 * The bench, generated once a seed and handed out as a private copy.
 *
 * Ten files open on this line and `statecraft.test.ts` alone asks for it two
 * hundred and sixty times; generating a duel map, placing its starts and
 * shuffling four bead decks is the same pure function of the same seed every
 * one of those times, bought at full price. `test/mapgen/fixtures.ts` made the
 * same bargain for the map generator and its docblock states the contract —
 * this is that contract one scale out, and it is a *snapshot* cache rather than
 * an object cache because a `GameState` is mutable by nature and every caller
 * here pokes the one it is given. What each caller gets is a JSON round trip of
 * a fresh `createGame` instead of a generation, which is what `restoreState`
 * exists for: the state is plain data (`Rng` is a number in a box), so the
 * restored board is the board `createGame` would have returned.
 *
 * The cache lives as long as the worker rather than as long as the file, which
 * is the whole win: `poolOptions.forks.isolate` is off (see `vite.config.ts`),
 * so a fork keeps its module graph from one test file to the next and the
 * second file to ask for seed 7 is handed the first file's generation.
 */
interface Bench {
  config: GameConfig;
  /** `snapshotState` of the board, parsed afresh for every caller. */
  state: string;
  /** The log as JSON, for the same reason. */
  log: string;
}

const benches = new Map<number, Bench>();

export function game(seed = 7): Game {
  let bench = benches.get(seed);
  if (bench === undefined) {
    const made = createGame({
      seed,
      sizeName: 'duel',
      players: [
        { name: 'Ada', color: '#d4502e', isHuman: true },
        { name: 'Bors', color: '#3a7fe8' },
      ],
    });
    // The two seats are at war from the first turn (schema 56). Several files
    // sharing this bench ask what a card, a legacy or a Triumph is worth *in a
    // fight*, and since the war ruling a blow between two empires at peace is
    // refused before a strength is folded.
    //
    // **Dispatched, not written.** This bench is handed to tests that replay
    // `{config, log}` and compare snapshots (`guilds.test.ts`), so a war written
    // straight into the register would be a fact the log does not carry and the
    // replay would part company with the game on the first byte. A declaration
    // rolls no dice, so it costs the seeded world nothing.
    dispatch(made, { type: 'declareWar', playerId: 0, targetId: 1 });
    bench = {
      config: made.config,
      state: snapshotState(made.state),
      log: JSON.stringify(made.log),
    };
    benches.set(seed, bench);
  }
  return {
    config: JSON.parse(JSON.stringify(bench.config)) as GameConfig,
    state: restoreState(bench.state),
    log: JSON.parse(bench.log) as Command[],
  };
}

/**
 * Puts the **ancestor rites** in every seat's hand — the gate a great-person
 * offer opens behind since the tree pass of 2026-08-30.
 *
 * Renown gathers from turn one and nobody answers it until an empire has
 * researched Ancestor Rites, so any test that is about what renown is *worth*,
 * what a legacy pays or what a Triumph mints has to get past the gate first.
 * The gate itself has its own test in `renown.test.ts`.
 *
 * Written directly onto the seat rather than through a command, exactly as the
 * other fixtures here reach for `foundCityAt`: it is scenery, not the subject.
 * It is therefore **not** for a test that replays a log — grant the technology
 * inside the log for those.
 *
 * Read through `ABILITY_TECH` so that moving the gate to another node moves this
 * with it, and never leaves it naming a technology that opens nothing.
 *
 * **It announces itself** (batch E3a). A technology is the tenth source of
 * `liveEffects` and every reading in the game is remembered on
 * `GameState.revision`, so a bench that writes one onto a seat is a writer and
 * says so exactly as `applyCommand` does. See `test/sim/benches.test.ts`.
 */
export function keepTheRites(state: GameState): void {
  const gate = ABILITY_TECH.get('ancestorRites');
  if (gate === undefined) return;
  for (const player of state.players) {
    if (!player.techsResearched.includes(gate)) player.techsResearched.push(gate);
  }
  bumpRevision(state);
}

/**
 * A city for a player, on the tile their first unit is standing on.
 *
 * `foundCityAt` is the sim's own seam and not a command, so the bench moves the
 * revision on its behalf — the same announcement `keepTheRites` makes.
 */
export function found(state: GameState, playerId: number) {
  const unit = state.units.find((u) => u.ownerId === playerId)!;
  const city = foundCityAt(state, playerId, getTileAt(state.map, unit.col, unit.row)!);
  bumpRevision(state);
  return city;
}
