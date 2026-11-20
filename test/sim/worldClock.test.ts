import { describe, expect, it } from "vitest";

import { RULES } from "../../src/sim/rulesData";
import {
  type GameConfig,
  type GameState,
  SCHEMA_VERSION,
  bumpRevision,
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
  turnOverRule,
  worldAge,
  worldAgeCountdown,
  worldProgress,
} from "../../src/sim/worldClock";
import { newGame } from './newGameHelpers';

/**
 * **The world's clock**: batch G1, and the faster turn-over rule of 2026-11-18
 * (`docs/flags.md`, "Age turn-over: a missing plate, the abacus motion, and a
 * faster clock", the bullet "The clock turns over sooner"; `docs/wager.md`,
 * "Rules").
 *
 * What this file checks, in the order the mechanism runs:
 *
 *   - the countdown that closes an age starts when any living seat is two ages
 *     past it, or when at least half of the living seats are one age past it
 *     (half of an odd count rounds up). Both figures come from `rules.wager`;
 *   - the wild is never counted, and an eliminated seat is dropped;
 *   - the countdown is `rules.wager.countdown` turns, stamped as an absolute
 *     turn;
 *   - the close fires on that turn and only that turn, announces `ageClosed`
 *     to every seat, and puts the world in the next age;
 *   - the world moves one age a close, each with a full countdown, however far
 *     ahead one seat runs;
 *   - the last age closes on its own backstop or on the Great Work, whichever
 *     comes first;
 *   - nothing anywhere ticks.
 *
 * The bench is the *phase* rather than a whole resolution. The clock is one
 * step of the turn, and a long bot game would measure the pace of the tree,
 * which is the job of the slow tier (`beads.slow.test.ts`).
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

/** A game with `count` real seats, the first of them human. */
function seated(count: number, over: Partial<GameConfig> = {}): GameConfig {
  const names = ["Ada", "Bors", "Cato", "Dido", "Enno"];
  const colors = ["#a00", "#00a", "#0a0", "#aa0", "#a0a"];
  return config({
    players: names.slice(0, count).map((name, index) => ({
      name,
      color: colors[index]!,
      isHuman: index === 0,
    })),
    ...over,
  });
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
  it("reads the two thresholds from the rules sheet", () => {
    // The defaults that give the user's rule: one seat two ages past the age
    // that is closing, or half the living seats one age past it.
    expect(RULES.wager.leadAges).toBe(2);
    expect(RULES.wager.shareOfSeats).toEqual({ numerator: 1, denominator: 2 });
    expect(turnOverRule()).toEqual({ leadAges: 2, shareNumerator: 1, shareDenominator: 2 });
  });

  it("turns over when any living seat is two ages past it", () => {
    const state = newGame(seated(3));
    expect(worldAge(state)).toBe(1);

    // One seat of three in Æra II is neither rule: not half, not two ahead.
    reach(state, 0, 2);
    expect(worldAge(state)).toBe(1);

    // The same seat in Æra III is two ages past Æra I, so Æra I is due to
    // close. It is not two ages past Æra II, and one seat of three is not half,
    // so the world's progress stops at Æra II.
    reach(state, 0, 3);
    expect(worldAge(state)).toBe(2);
    expect(currentWorldAge(state)).toBe(1);
  });

  it("turns over when exactly half of an even count is one age past it", () => {
    const duel = newGame(seated(2));
    // One of two is half.
    reach(duel, 0, 2);
    expect(worldAge(duel)).toBe(2);

    const four = newGame(seated(4));
    reach(four, 0, 2);
    expect(worldAge(four)).toBe(1);
    reach(four, 1, 2);
    expect(worldAge(four)).toBe(2);
  });

  it("rounds half up for an odd count", () => {
    const five = newGame(seated(5));
    reach(five, 0, 2);
    reach(five, 1, 2);
    // Two of five is less than half.
    expect(worldAge(five)).toBe(1);
    reach(five, 2, 2);
    expect(worldAge(five)).toBe(2);

    const three = newGame(seated(3));
    reach(three, 0, 2);
    expect(worldAge(three)).toBe(1);
    reach(three, 1, 2);
    expect(worldAge(three)).toBe(2);

    // With one living seat, that seat is the half.
    const alone = newGame(seated(1));
    expect(worldAge(alone)).toBe(1);
    reach(alone, 0, 2);
    expect(worldAge(alone)).toBe(2);
  });

  it("does not turn over when neither rule holds", () => {
    const state = newGame(seated(5));
    reach(state, 0, 2);
    reach(state, 1, 2);
    // Two of five one age ahead, and nobody two ages ahead.
    expect(worldAge(state)).toBe(1);
    tick(state);
    expect(state.ageClose).toBeUndefined();
    expect(worldAgeCountdown(state)).toBeNull();
  });

  it("never counts the wild", () => {
    const state = newGame(config({ barbarians: true }));
    const wild = state.players.find((player) => player.barbarian);
    expect(wild).toBeDefined();
    // One of the two real seats in Æra II is half of them. If the wild were
    // counted, one of three would not be half.
    reach(state, 0, 2);
    expect(worldAge(state)).toBe(2);
  });

  it("drops an eliminated seat, both from the count and from the lead", () => {
    const state = newGame(seated(3));
    reach(state, 0, 2);
    // One of three is not half.
    expect(worldAge(state)).toBe(1);
    // A conquered rival frozen in the first age leaves the count: one of two
    // is half.
    state.players[1]!.eliminated = true;
    expect(worldAge(state)).toBe(2);

    // An eliminated seat far ahead does not pull the world along either.
    const runaway = newGame(seated(3));
    reach(runaway, 2, 4);
    expect(worldAge(runaway)).toBe(3);
    runaway.players[2]!.eliminated = true;
    expect(worldAge(runaway)).toBe(1);
  });

  it("stays at most one age behind a runaway seat", () => {
    const state = newGame(seated(3));
    reach(state, 0, LAST_TECH_AGE);
    // Every age up to the one before the leader's is due to close, and no
    // further: the world never passes the leader on the lead rule alone.
    expect(worldAge(state)).toBe(LAST_TECH_AGE - 1);
  });

  it("never reads past the last age", () => {
    const state = newGame(seated(2));
    reach(state, 0, LAST_TECH_AGE);
    reach(state, 1, LAST_TECH_AGE);
    expect(worldAge(state)).toBe(LAST_TECH_AGE);
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

describe("the turn-over rule on an age list of its own", () => {
  // `worldProgress` takes the list of ages, so the rule can be checked on a
  // chart with a fifth age before the tech data has one. The phase reads the
  // real list (`TECH_AGES`) through `worldAge`.
  const FIVE = [1, 2, 3, 4, 5] as const;

  it("works with a fifth age", () => {
    // A seat in the fifth age is two past the third.
    expect(worldProgress([5, 1, 1], FIVE)).toBe(4);
    // Two of three in the fourth age.
    expect(worldProgress([4, 4, 1], FIVE)).toBe(4);
    expect(worldProgress([4, 3, 3], FIVE)).toBe(3);
    // The last age has nothing above it, so the progress stops there.
    expect(worldProgress([5, 5, 5], FIVE)).toBe(5);
  });

  it("stops at the last age of the list it is given", () => {
    expect(worldProgress([4, 4], [1, 2, 3, 4])).toBe(4);
    expect(worldProgress([5, 5], [1, 2, 3, 4])).toBe(4);
  });

  it("answers the first age for a world with no living seat", () => {
    expect(worldProgress([], FIVE)).toBe(1);
  });

  it("uses the thresholds it is given", () => {
    // Three ages ahead, or two seats of three.
    const strict = { leadAges: 3, shareNumerator: 2, shareDenominator: 3 };
    expect(worldProgress([3, 1, 1], FIVE, strict)).toBe(1);
    expect(worldProgress([4, 1, 1], FIVE, strict)).toBe(2);
    expect(worldProgress([2, 2, 1], FIVE, strict)).toBe(2);
    expect(worldProgress([2, 1, 1], FIVE, strict)).toBe(1);
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

  it("opens the next countdown when the world has already run further ahead", () => {
    const state = newGame(config());
    // Both seats jump straight to Æra III: the world still walks there one age
    // at a time, a countdown each, so an age is never a turn long for a world
    // that rushed.
    reach(state, 0, 3);
    reach(state, 1, 3);
    tick(state);
    expect(state.ageClose!.age).toBe(1);

    const firstClose = runToClose(state);
    expect(currentWorldAge(state)).toBe(2);
    // The same resolution sees that the rule still holds for Æra II and gives
    // it its own countdown, from this turn.
    expect(state.ageClose).toEqual({
      age: 2,
      turn: firstClose + RULES.wager.countdown,
    });

    runToClose(state);
    expect(currentWorldAge(state)).toBe(3);
  });

  it("closes one age at a time behind a runaway seat, each with a full countdown", () => {
    const state = newGame(seated(3));
    // One seat in the last age while the world is in the first.
    reach(state, 0, LAST_TECH_AGE);
    const started = state.turn + 1;
    tick(state);
    expect(state.ageClose).toEqual({ age: 1, turn: started + RULES.wager.countdown });

    // Each close moves the world by one age, and the next age gets its own
    // full countdown from the turn it opened.
    let opened = started;
    const closes: number[] = [];
    for (let age = 1; age < LAST_TECH_AGE - 1; age++) {
      const closedOn = runToClose(state);
      closes.push(closedOn);
      expect(closedOn - opened).toBe(RULES.wager.countdown);
      expect(currentWorldAge(state)).toBe(age + 1);
      opened = closedOn;
    }

    // The world stops one age behind the leader: nobody is two ages past it
    // and one seat of three is not half.
    expect(currentWorldAge(state)).toBe(LAST_TECH_AGE - 1);
    expect(worldAgeCountdown(state)).toBeNull();
    for (let step = 0; step < 3 * RULES.wager.countdown; step++) tick(state);
    expect(currentWorldAge(state)).toBe(LAST_TECH_AGE - 1);
    expect(closes.length).toBe(LAST_TECH_AGE - 2);
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

  it('requires the version that records the world age countdown', () => {
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(101);
  });
});
