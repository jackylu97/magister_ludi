import { describe, expect, it } from "vitest";

import { RULES } from "../../src/sim/rulesData";
import {
  type GameConfig,
  type GameState,
  SCHEMA_VERSION,
  bumpRevision,
  newGame,
} from "../../src/sim/state";
import { LAST_TECH_AGE, type TechId } from "../../src/sim/techData";
import { closeTheGreatWork, runWorldClock } from "../../src/sim/beads";
import { OCCASIONS } from "../../src/sim/occasions";
import { BEAD_OCCASIONS } from "../../src/sim/beadData";
import { END_OF_TURN_PHASES } from "../../src/sim/turn";
import { foundCityAt } from "../../src/sim/cities";
import { createMap, getTileAt } from "../../src/sim/map";
import { resetVisibility } from "../../src/sim/visibility";
import {
  ageClosesThisTurn,
  currentWorldAge,
  worldAge,
  worldAgeCountdown,
} from "../../src/sim/worldClock";

/**
 * **The world's clock** — batch G1, `docs/wager.md` §1 (the spec of record).
 *
 * What this file pins, in the order the mechanism runs: the world's age is the
 * **mean** of the living real seats and it **floors**, so one empire alone does
 * not turn the world over; the wild is never counted and an eliminated seat is
 * dropped; the crossing opens a countdown of `rules.wager.countdown` turns
 * stamped as an absolute turn; the close fires on that turn and only that turn,
 * announces `ageClosed` to every seat, and puts the world in the next age; the
 * last age closes on its own backstop or on the Great Work, whichever comes
 * first; and nothing anywhere ticks.
 *
 * The bench is deliberately the *phase* rather than a whole resolution. The
 * clock is one beat and the claim is about that beat: a two-hundred-turn bot
 * game would be measuring the tree's pace with the clock's tests, which is the
 * slow tier's job and `beads.slow.test.ts`'s already.
 */

function config(over: Partial<GameConfig> = {}): GameConfig {
  return {
    seed: 7,
    sizeName: "duel",
    players: [
      { name: "Ada", color: "#a00", isHuman: true },
      { name: "Bors", color: "#00a", isHuman: false },
    ],
    ...over,
  };
}

/** A technology that belongs to each age. The clock reads `highestAge`. */
const OF_AGE: Record<number, TechId> = {
  1: "agriculture",
  2: "currency",
  3: "mathematics",
  4: "education",
};

/**
 * Puts one seat into a built age by handing it a node that belongs to it.
 *
 * `bumpRevision` because a bench that moves the board says so (`benches.test.ts`):
 * every derived reading in the game is memoised under the revision, and a tree
 * that grew without one is a board the memos have not been told about.
 */
function reach(state: GameState, playerId: number, age: number): void {
  const player = state.players[playerId]!;
  const tech = OF_AGE[age]!;
  if (!player.techsResearched.includes(tech)) player.techsResearched.push(tech);
  bumpRevision(state);
}

/** One turn of the clock, and nothing else: the turn advances, the phase runs. */
function tick(state: GameState): void {
  state.turn += 1;
  runWorldClock(state);
}

/**
 * Steps until the standing close has fired, and answers the turn it fired on.
 *
 * The question is asked **before** the phase runs, not after: a close usually
 * writes the next age's stamp in the same breath, so "is the stamp on this
 * turn" is only true on the way in.
 */
function runToClose(state: GameState): number {
  for (let step = 0; step < 200; step++) {
    state.turn += 1;
    const closing = state.ageClose?.turn === state.turn;
    runWorldClock(state);
    if (closing) return state.turn;
  }
  throw new Error("no age ever closed");
}

// --- 1. the reading ---------------------------------------------------------

describe("the world's age", () => {
  it("is the mean of the seats, floored — one empire alone does not turn it over", () => {
    const state = newGame(config());
    expect(worldAge(state)).toBe(1);
    expect(currentWorldAge(state)).toBe(1);

    // The acceptance bench of the brief: two seats in Æra I, one of them
    // reaches Æra II. The mean is one and a half and the world stays where it
    // is — this is the whole of the ruling that replaced the first-seat rule.
    reach(state, 0, 2);
    expect(worldAge(state)).toBe(1);
    expect(currentWorldAge(state)).toBe(1);
    expect(worldAgeCountdown(state)).toBeNull();

    // And when the second arrives, the mean is two.
    reach(state, 1, 2);
    expect(worldAge(state)).toBe(2);
  });

  it("never counts the wild", () => {
    const state = newGame(config({ barbarians: true }));
    const wild = state.players.find((player) => player.barbarian);
    expect(wild).toBeDefined();
    // The wild keeps no research, so a mean that counted it would be dragged to
    // the first age for the whole game. Both real seats in Æra III is Æra III.
    reach(state, 0, 3);
    reach(state, 1, 3);
    expect(worldAge(state)).toBe(3);
  });

  it("drops an eliminated seat rather than being held back by it", () => {
    const state = newGame(config());
    reach(state, 0, 3);
    // A conquered rival frozen in the first age would otherwise average the
    // survivor down to Æra II for the rest of the game.
    expect(worldAge(state)).toBe(2);
    state.players[1]!.eliminated = true;
    expect(worldAge(state)).toBe(3);
  });

  it("is derived, never stored — the state carries one stamp and no age", () => {
    const state = newGame(config());
    expect(state.ageClose).toBeUndefined();
    expect("worldAge" in state.beads).toBe(false);
    // `ageClose` absent *is* the first age, which is also what a save written
    // before this batch loads as (presence-is-state).
    expect(currentWorldAge(state)).toBe(1);
    expect(worldAgeCountdown(state)).toBeNull();
  });
});

// --- 2. the countdown -------------------------------------------------------

describe("the countdown", () => {
  it("opens on the crossing, at the turn plus the rules figure", () => {
    const state = newGame(config());
    const opened = state.turn + 1;
    reach(state, 0, 2);
    reach(state, 1, 2);
    tick(state);

    expect(state.ageClose).toEqual({
      age: 1,
      turn: opened + RULES.wager.countdown,
    });
    const countdown = worldAgeCountdown(state);
    expect(countdown?.age).toBe(1);
    expect(countdown?.turnsLeft).toBe(RULES.wager.countdown);
    // The world is still in the age that is closing. That is the point of the
    // notice: a bar staked on this age still has these turns to be met in.
    expect(currentWorldAge(state)).toBe(1);
  });

  it("is written once and never touched again — nothing ticks", () => {
    const state = newGame(config());
    reach(state, 0, 2);
    reach(state, 1, 2);
    tick(state);
    const stamp = { ...state.ageClose! };

    // Three more turns, and the *only* thing that moves is the answer to "how
    // many turns left", which is arithmetic on `state.turn` rather than a
    // number somebody decremented.
    tick(state);
    tick(state);
    tick(state);
    expect(state.ageClose).toEqual(stamp);
    expect(worldAgeCountdown(state)?.turnsLeft).toBe(RULES.wager.countdown - 3);
  });

  it("closes on its turn, puts the world in the next age, and closes once", () => {
    const state = newGame(config());
    reach(state, 0, 2);
    reach(state, 1, 2);
    tick(state);
    const closesOn = state.ageClose!.turn;

    while (state.turn < closesOn - 1) {
      tick(state);
      expect(currentWorldAge(state)).toBe(1);
    }

    tick(state);
    expect(state.turn).toBe(closesOn);
    expect(currentWorldAge(state)).toBe(2);
    expect(worldAgeCountdown(state)).toBeNull();

    // And it stays closed: the stamp is in the past for ever after, which is
    // what makes `ageClosesThisTurn` an equality rather than a comparison.
    tick(state);
    expect(ageClosesThisTurn(state)).toBe(false);
    expect(currentWorldAge(state)).toBe(2);
  });

  it("opens the next countdown when the mean has already run further ahead", () => {
    const state = newGame(config());
    // Both seats jump straight to Æra III: the world still walks there one age
    // at a time, a countdown each, which is what keeps an age from being a turn
    // long for a world that rushed.
    reach(state, 0, 3);
    reach(state, 1, 3);
    tick(state);
    expect(state.ageClose!.age).toBe(1);

    const firstClose = runToClose(state);
    expect(currentWorldAge(state)).toBe(2);
    // The same resolution notices the mean is still ahead and gives Æra II its
    // own notice, from this turn.
    expect(state.ageClose).toEqual({
      age: 2,
      turn: firstClose + RULES.wager.countdown,
    });

    runToClose(state);
    expect(currentWorldAge(state)).toBe(3);
  });
});

// --- 3. the last age --------------------------------------------------------

describe("the last age", () => {
  /** Walks the world up to the last age the chart has, one countdown an age. */
  function reachLastAge(state: GameState): number {
    reach(state, 0, LAST_TECH_AGE);
    reach(state, 1, LAST_TECH_AGE);
    tick(state);
    let openedOn = state.turn;
    while (currentWorldAge(state) < LAST_TECH_AGE) openedOn = runToClose(state);
    return openedOn;
  }

  it("is given its own length the turn it opens", () => {
    const state = newGame(config());
    const openedOn = reachLastAge(state);
    // Nothing is above it for the mean to cross into, so its end is measured
    // from its beginning instead (`docs/wager.md` §1).
    expect(state.ageClose).toEqual({
      age: LAST_TECH_AGE,
      turn: openedOn + RULES.wager.lastAgeTurns,
    });
    expect(worldAgeCountdown(state)?.age).toBe(LAST_TECH_AGE);
  });

  it("closes once and stays in the last age — there is nothing above it", () => {
    const state = newGame(config());
    reachLastAge(state);
    runToClose(state);
    expect(currentWorldAge(state)).toBe(LAST_TECH_AGE);
    // No new countdown: the mean cannot exceed the chart's last age.
    tick(state);
    expect(worldAgeCountdown(state)).toBeNull();
    expect(ageClosesThisTurn(state)).toBe(false);
  });

  it("is closed early by the Great Work — the Opus or the backstop, whichever is first", () => {
    const state = newGame(config());
    state.map = createMap({ width: 16, height: 12, terrain: "grassland" });
    resetVisibility(state);
    state.tileOwner = new Array<number | null>(16 * 12).fill(null);
    state.units = [];
    reachLastAge(state);
    const backstop = state.ageClose!.turn;

    const city = foundCityAt(state, 0, getTileAt(state.map, 4, 4)!);
    closeTheGreatWork(state, city);
    // Pulled forward to *now*, never pushed out: one comparison, not two rules.
    expect(state.ageClose).toEqual({ age: LAST_TECH_AGE, turn: state.turn });
    expect(state.ageClose!.turn).toBeLessThan(backstop);
    expect(ageClosesThisTurn(state)).toBe(true);
  });
});

// --- 4. the register --------------------------------------------------------

describe("the clock as a register", () => {
  it("runs as a phase of its own, directly before the wager", () => {
    const names = END_OF_TURN_PHASES.map((phase) => phase.name);
    const clock = names.indexOf("worldClock");
    expect(clock).toBeGreaterThan(-1);
    // The position is the rule: every phase that reads the world's age runs
    // after it. Batch G2 put the `wagers` phase directly behind it — a deal and
    // a judgement are the loudest readers of the clock there are — and the deed
    // tables that sat behind *that* are retired with their rows (batch Q1).
    expect(names[clock + 1]).toBe("wagers");
    // And the census after the wagers since batch C1: it ranks the world on a
    // board the clock has settled. The `beads` phase that followed is gone
    // (batch Q1).
    expect(names[clock + 2]).toBe("census");
    expect(names).not.toContain("beads");
    expect(names.indexOf("renown")).toBeLessThan(clock);
  });

  it("announces the close as an occasion the whole vocabulary carries", () => {
    expect(OCCASIONS).toContain("ageClosed");
    // The beads take the union whole, which is what lets a deed name the close
    // without a second list to keep in step (`occasions.ts`).
    expect(BEAD_OCCASIONS).toContain("ageClosed");
  });

  /**
   * **Source-reading, therefore core tier** (CLAUDE.md). The occasion pays no
   * bead today — no row names it yet — so importing the module could only show
   * that the word exists, never that the phase says it. The phase's text is the
   * fact, exactly as the verb register reads its modules' text one system over.
   */
  it("says the word for every seat, in the phase that closes the age", () => {
    const source = SOURCES["../../src/sim/beads.ts"] as string;
    const phase = source.slice(source.indexOf("export function runWorldClock"));
    const body = phase.slice(0, phase.indexOf("\n}\n"));
    expect(body).toContain("'ageClosed'");
    expect(body).toContain("realPlayers(state)");
  });

  const SOURCES = import.meta.glob("../../src/sim/beads.ts", {
    eager: true,
    query: "?raw",
    import: "default",
  });

  it("pins the schema this batch moved", () => {
    expect(SCHEMA_VERSION).toBe(108);
  });
});
