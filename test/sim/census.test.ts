import { describe, expect, it } from "vitest";

import {
  type GameConfig,
  type GameState,
  SCHEMA_VERSION,
  drawCensusInterval,
  newGame,
} from "../../src/sim/state";
import {
  CENSUS_STATS,
  type CensusStat,
  censusBlocker,
  censusFigure,
  censusProblems,
  censusRanking,
  censusSeats,
  censusTriumphIds,
  dismissCensusError,
  drawCensusStat,
  isCensusStat,
  lastCensus,
  runCensus,
} from "../../src/sim/census";
import { OCCASIONS } from "../../src/sim/occasions";
import { END_OF_TURN_PHASES } from "../../src/sim/turn";
import { RULES } from "../../src/sim/rulesData";
import { applyCommand } from "../../src/sim/commands";
import { explainRenown } from "../../src/sim/renown";
import { triumphDef } from "../../src/sim/triumphData";
import { firstBlocker } from "../../src/ui/turnBlockers";
import { makeRng } from "../../src/sim/rng";
// A bench that moves the board by hand says so (`test/sim/benches.test.ts`).
import { bumpRevision } from "../../src/sim/state";

/**
 * **The census** — batch C1, `docs/wager.md` §10/§11 (the spec of record).
 *
 * What this file pins, in the order the mechanism runs: the calendar is drawn
 * from `state.rng` inside the ruled window, so a **seed is a calendar** and two
 * seeds' first three censuses are two fixed lists of turns; the figure rotates
 * and is **never the same twice running**; the ranking is highest-first with
 * ties by seat order and a head row of nought naming nobody; the leader's
 * Triumph is paid through `settleRenownWindfall` and shows up by name in
 * `explainRenown`; the record rides the report; and the sheet is an End Turn
 * blocker cleared by one logged command that a second call refuses without
 * moving a byte.
 *
 * The bench is the **phase** rather than a whole resolution, for
 * `wagers.test.ts`' reason exactly: the claim is about this beat, and a
 * two-hundred-turn bot game measures the tree's pace instead.
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

/**
 * One turn of the census's own beat: the phase, then the clock.
 *
 * The order is the pipeline's — `applyEndTurn` runs every phase and raises
 * `state.turn` afterwards — so a census taken in the resolution of turn T is a
 * page the players first see on turn T+1, which is the off-by-one the blocker is
 * written against.
 */
function tick(state: GameState): void {
  runCensus(state);
  state.turn += 1;
}

/** The turns the first `count` censuses of this game fall on. */
function censusTurns(state: GameState, count: number): number[] {
  const turns: number[] = [];
  for (let step = 0; step < 400 && turns.length < count; step += 1) {
    tick(state);
    const last = lastCensus(state);
    if (last && !turns.includes(last.turn)) turns.push(last.turn);
  }
  return turns;
}

// --- 1. the calendar --------------------------------------------------------

describe("the calendar", () => {
  it("is the ruled window, drawn uniformly, and never outside it", () => {
    // Every gap the generator can produce, over enough rolls that a bound off by
    // one would show: the ruling is thirteen to seventeen **inclusive**, and
    // seventeen is a gap the world can actually draw.
    const rng = makeRng(12345);
    const seen = new Set<number>();
    for (let roll = 0; roll < 500; roll += 1) {
      const gap = drawCensusInterval(rng);
      expect(gap).toBeGreaterThanOrEqual(RULES.census.min);
      expect(gap).toBeLessThanOrEqual(RULES.census.max);
      seen.add(gap);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([13, 14, 15, 16, 17]);
  });

  it("is on the state before a piece is placed", () => {
    const state = newGame(config());
    expect(state.census.taken).toEqual([]);
    expect(state.census.nextTurn).toBeGreaterThanOrEqual(
      RULES.game.startingTurn + RULES.census.min,
    );
    expect(state.census.nextTurn).toBeLessThanOrEqual(
      RULES.game.startingTurn + RULES.census.max,
    );
  });

  it("is a seed: two seeds are two fixed lists of turns", () => {
    // **The pin.** A change to the draw, to the order the three rolls are spent
    // in, or to anything upstream that touches the generator moves these, and it
    // should: a seed is a calendar, and a calendar that moved quietly would be a
    // determinism bug nobody could see.
    // Moved once already: batch Q1 (schema 108) took the two deck shuffles out
    // of `newGame`, so the first interval is now the derived stream's first roll.
    expect(censusTurns(newGame(config({ seed: 7 })), 3)).toEqual([14, 27, 44]);
    expect(censusTurns(newGame(config({ seed: 91 })), 3)).toEqual([15, 29, 44]);
  });

  it("replays: the same seed reaches the same calendar twice", () => {
    expect(censusTurns(newGame(config({ seed: 44 })), 5)).toEqual(
      censusTurns(newGame(config({ seed: 44 })), 5),
    );
  });
});

// --- 2. the rotation --------------------------------------------------------

describe("the rotation", () => {
  it("never measures the same figure twice running", () => {
    const state = newGame(config({ seed: 3 }));
    censusTurns(state, 12);
    const stats = state.census.taken.map((record) => record.stat);
    expect(stats.length).toBeGreaterThanOrEqual(12);
    for (let at = 1; at < stats.length; at += 1) {
      expect(stats[at], `census ${at}`).not.toBe(stats[at - 1]);
    }
    for (const stat of stats) expect(isCensusStat(stat)).toBe(true);
  });

  it("draws out of the whole list over a long game", () => {
    // Not a distribution test — a reach test. A rotation that had quietly
    // narrowed to three figures would still pass the rule above.
    const state = newGame(config({ seed: 5 }));
    censusTurns(state, 40);
    const seen = new Set(state.census.taken.map((record) => record.stat));
    expect(seen.size).toBeGreaterThan(CENSUS_STATS.length / 2);
  });

  it("excludes the previous figure from the bag it draws out of", () => {
    const state = newGame(config());
    for (const previous of CENSUS_STATS) {
      for (let roll = 0; roll < 40; roll += 1) {
        expect(drawCensusStat(state, previous)).not.toBe(previous);
      }
    }
  });
});

// --- 3. the ranking ---------------------------------------------------------

describe("the ranking", () => {
  it("counts every living seat and nobody else", () => {
    const state = newGame(config());
    expect(censusSeats(state).map((seat) => seat.id)).toEqual([0, 1]);
    state.players[1]!.eliminated = true;
    expect(censusSeats(state).map((seat) => seat.id)).toEqual([0]);
  });

  it("is highest first, and a tie goes to the lower seat", () => {
    const state = newGame(config());
    // Technologies is the one figure a test can set exactly without touching a
    // town: the reading is the length of the list.
    state.players[0]!.techsResearched = ["agriculture"];
    state.players[1]!.techsResearched = ["agriculture", "earthenware"];
    expect(
      censusRanking(state, "technologies").map((row) => row.playerId),
    ).toEqual([1, 0]);

    state.players[0]!.techsResearched = ["agriculture", "earthenware"];
    const tied = censusRanking(state, "technologies");
    expect(tied.map((row) => row.playerId)).toEqual([0, 1]);
    expect(tied.map((row) => row.figure)).toEqual([2, 2]);
  });

  it("names nobody on a page of noughts", () => {
    // An empty world: no towns, no pieces, no technologies — so **every** figure
    // in the list reads nought, whichever one the roll picks. Leading at nothing
    // is not a deed, so the page has no head and pays nobody.
    const state = newGame(config());
    state.units = [];
    bumpRevision(state);
    for (const player of state.players) player.techsResearched = [];
    bumpRevision(state);
    state.turn = state.census.nextTurn;
    bumpRevision(state);
    runCensus(state);

    const record = lastCensus(state)!;
    expect(record.rows.every((row) => row.figure === 0)).toBe(true);
    expect(record.leaderId).toBeNull();
    for (const player of state.players) {
      expect(
        player.triumphs.some((earned) => earned.id === "censusLeader"),
      ).toBe(false);
    }
  });

  it("answers every figure in the list for a live board", () => {
    // The register: every member of the union is answered by an arm, and none of
    // them throws or returns something that is not a number.
    const state = newGame(config());
    for (const stat of CENSUS_STATS) {
      const figure = censusFigure(state, 0, stat as CensusStat);
      expect(Number.isFinite(figure), stat).toBe(true);
    }
  });
});

// --- 4. the pay -------------------------------------------------------------

describe("the leader’s Triumph", () => {
  it("is a repeatable row worth what the rules say, and shown elsewhere", () => {
    expect(censusProblems()).toEqual([]);
    const ids = censusTriumphIds();
    expect(ids.length).toBe(1);
    const def = triumphDef(ids[0]!);
    expect(def.pays).toBe(RULES.census.renown);
    expect(def.pays).toBe(5);
    expect(def.scope).toBe("perEvent");
    // The user's ruling of 2026-09-09: the Triumph is inside the census sheet
    // and there is no second sheet. The marker is what `controls.ts` reads.
    expect(def.quiet).toBe(true);
  });

  it("pays the head of the ranking through the one renown seam", () => {
    // An empty world again, so every figure but one reads nought for everybody
    // — which means no census before the one that measures technologies can pay
    // anybody, and the tally at the end is exact.
    const state = newGame(config());
    state.units = [];
    bumpRevision(state);
    state.players[0]!.techsResearched = [
      "agriculture",
      "earthenware",
      "mining",
    ];
    state.players[1]!.techsResearched = [];

    for (let step = 0; step < 200; step += 1) {
      state.turn = state.census.nextTurn;
      bumpRevision(state);
      runCensus(state);
      if (lastCensus(state)!.stat === "technologies") break;
    }

    const record = lastCensus(state)!;
    expect(record.stat).toBe("technologies");
    expect(record.leaderId).toBe(0);
    expect(record.rows).toEqual([
      { playerId: 0, figure: 3 },
      { playerId: 1, figure: 0 },
    ]);

    // `settleRenownWindfall` is the one place renown is added, and `explainRenown`
    // is its rule-5 list — so the Triumph is on it, by name, on the turn it was
    // earned.
    const lines = explainRenown(state, 0);
    const line = lines.find(
      (row) => row.source === `Triumph · ${triumphDef("censusLeader").name}`,
    );
    expect(line, JSON.stringify(lines.map((row) => row.source))).toBeDefined();
    expect(line!.amount).toBe(RULES.census.renown);
    expect(line!.perTurn).toBe(false);
    expect(state.players[0]!.renownEarned).toBe(RULES.census.renown);
    // Exactly one, and it is repeatable rather than banked twice by accident.
    expect(
      state.players[0]!.triumphs.filter(
        (earned) => earned.id === "censusLeader",
      ).length,
    ).toBe(1);
    expect(state.players[1]!.triumphs.length).toBe(0);
  });
});

// --- 5. the phase and its report -------------------------------------------

describe("the phase", () => {
  it("runs directly after the wagers, the last of the calendar", () => {
    // The `beads` phase that once followed is gone (batch Q1): a wager kept is
    // what mints a bead, and the census counts the rods the wagers just paid.
    const names = END_OF_TURN_PHASES.map((phase) => phase.name);
    const wagers = names.indexOf("wagers");
    const census = names.indexOf("census");
    expect(census).toBe(wagers + 1);
    expect(names).not.toContain("beads");
  });

  it("announces the moment in the world’s one vocabulary", () => {
    expect(OCCASIONS).toContain("censusTaken");
    // Last, because the list's order is `BEAD_OCCASIONS`' own and a member
    // inserted rather than appended would move a register for no reason.
    expect(OCCASIONS[OCCASIONS.length - 1]).toBe("censusTaken");
  });

  it("writes the record into the report, once, on the turn it is taken", () => {
    const state = newGame(config());
    state.turn = state.census.nextTurn;
    bumpRevision(state);
    const report: { censusTaken?: unknown } = {};
    runCensus(state, report as never);
    expect(report.censusTaken).toBe(lastCensus(state));
    // And nothing on the very next turn: the calendar has moved on.
    state.turn += 1;
    const quiet: { censusTaken?: unknown } = {};
    runCensus(state, quiet as never);
    expect(quiet.censusTaken).toBeUndefined();
  });

  it("appends and never rewrites", () => {
    const state = newGame(config({ seed: 21 }));
    censusTurns(state, 4);
    const first = JSON.stringify(state.census.taken[0]);
    censusTurns(state, 2);
    expect(JSON.stringify(state.census.taken[0])).toBe(first);
    expect(state.census.taken.length).toBeGreaterThanOrEqual(4);
  });
});

// --- 6. the blocker ---------------------------------------------------------

describe("the blocker", () => {
  it("stands on the turn after a census and is cleared by the command", () => {
    const state = newGame(config());
    expect(censusBlocker(state, 0)).toBeNull();
    expect(firstBlocker(state, 0)?.kind).not.toBe("census");

    state.turn = state.census.nextTurn;
    bumpRevision(state);
    runCensus(state);
    state.turn += 1;

    const record = lastCensus(state)!;
    expect(censusBlocker(state, 0)).toBe(record);
    expect(censusBlocker(state, 1)).toBe(record);

    const result = applyCommand(state, { type: "dismissCensus", playerId: 0 });
    expect(result.ok).toBe(true);
    expect(state.players[0]!.censusSeen).toBe(record.turn);
    expect(censusBlocker(state, 0)).toBeNull();
    // The other seat still owes it a look: this is a fact about a seat.
    expect(censusBlocker(state, 1)).toBe(record);
  });

  it("refuses a second dismissal without moving a byte", () => {
    const state = newGame(config());
    state.turn = state.census.nextTurn;
    bumpRevision(state);
    runCensus(state);
    state.turn += 1;
    expect(applyCommand(state, { type: "dismissCensus", playerId: 0 }).ok).toBe(
      true,
    );

    const before = JSON.stringify(state);
    const again = applyCommand(state, { type: "dismissCensus", playerId: 0 });
    expect(again.ok).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
    expect(dismissCensusError(state, 0)).toBe(
      "You have already read this census",
    );
  });

  it("refuses a dismissal in a world nobody has counted", () => {
    const state = newGame(config());
    const before = JSON.stringify(state);
    expect(applyCommand(state, { type: "dismissCensus", playerId: 0 }).ok).toBe(
      false,
    );
    expect(JSON.stringify(state)).toBe(before);
  });

  it("rises again on the next census", () => {
    const state = newGame(config());
    state.turn = state.census.nextTurn;
    bumpRevision(state);
    runCensus(state);
    state.turn += 1;
    applyCommand(state, { type: "dismissCensus", playerId: 0 });
    expect(censusBlocker(state, 0)).toBeNull();

    state.turn = state.census.nextTurn;
    bumpRevision(state);
    runCensus(state);
    state.turn += 1;
    expect(censusBlocker(state, 0)).not.toBeNull();
  });

  it("never holds the wild or a seat that is out of the game", () => {
    const state = newGame(config({ barbarians: true }));
    state.turn = state.census.nextTurn;
    bumpRevision(state);
    runCensus(state);
    state.turn += 1;
    const wild = state.players.find((player) => player.barbarian)!;
    expect(censusBlocker(state, wild.id)).toBeNull();
    state.players[1]!.eliminated = true;
    expect(censusBlocker(state, 1)).toBeNull();
  });

  it("is the sixth blocker and reads the simulation’s own rule", () => {
    const state = newGame(config());
    state.turn = state.census.nextTurn;
    bumpRevision(state);
    runCensus(state);
    state.turn += 1;
    expect(firstBlocker(state, 0)?.kind).toBe("census");
  });

  it("shows only the last census — they do not stack", () => {
    const state = newGame(config());
    state.turn = state.census.nextTurn;
    bumpRevision(state);
    runCensus(state);
    state.turn = state.census.nextTurn;
    bumpRevision(state);
    runCensus(state);
    state.turn += 1;
    expect(state.census.taken.length).toBe(2);
    expect(censusBlocker(state, 0)).toBe(state.census.taken[1]);
    applyCommand(state, { type: "dismissCensus", playerId: 0 });
    expect(censusBlocker(state, 0)).toBeNull();
  });
});

// --- 7. the schema ----------------------------------------------------------

describe("the schema", () => {
  it("is bumped for the register the census added", () => {
    expect(SCHEMA_VERSION).toBe(108);
  });
});
