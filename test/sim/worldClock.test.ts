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

  it("pins the schema this batch moved", () => {
    // 119 is the decks rework (D1a, branch `decks`): four seat fields, the
    // reward hands, universal chairs and a draw that deals every hand
    // differently — a v118 save is refused (`state.ts`'s changelog).
    // 121 since D2d (the decks rework, branch `decks`): a town remembers when
    // each of its buildings went up, a hex when its work was raised and a route
    // when it opened, so a v120 log answers "not old enough" to every card
    // written on an age — a bump within the branch, which migrates nothing
    // either way.
    // 123 since C8: a town records which bank paid for each of its buildings.
    // 124 since the current-band ruling of 2026-10-13: a hand is dealt only from
    // the seat's current band, so a v123 log would pick from different hands.
    // 125 since WC1: a town taken by force enters unrest, so a v124 log's
    // captured towns would bank hammers, beakers and culture this build withholds.
    // 126 since WC2: a war's losses are recorded and cost happiness, so a v125
    // log's losing empires would grow on turns this build holds them back.
    // 127 since WC3: units earn ranks in combat, so a v126 log's veterans
    // would fight weaker than this build makes them.
    // 128 since D0: fourteen Dominion cards join the decks and three are
    // retired, so a v127 log's picks name cards this build never dealt.
    // 129 since C2a: chairs have types again, adoption re-seats the council,
    // and the tier-38 governments are retired, so a v128 log can seat a card
    // where this build refuses it.
    // 130 since D1: eleven Dominion cards that give units experience or pay
    // when a unit earns a rank, a new end-of-turn phase and a new record, so
    // a v129 log's picks name cards this build never dealt.
    // 131 since C3: the reward hands go and an adoption opens a Doctrine
    // offer, so a v130 seat carries fields this build no longer reads.
    // 132 since D2: nine Dominion cards that read a unit's rank or change a
    // rule of combat, and a new unit field, so a v131 log's picks name cards
    // this build never dealt.
    // 133 since D3: nine Dominion cards about pillaging and where a grant
    // lands, and a new record, so a v132 log's picks name cards this build
    // never dealt.
    // 134 since E0: the Expansionist deck is typed and its cards that need
    // no new shape are built, so a v133 log's picks and seatings name cards
    // and chairs this build deals and fits differently.
    // 135 since D4: twelve Dominion cards about unrest, the writ and the game's
    // records, and a new record, so a v134 log's picks name cards this build
    // never dealt.
    // 136 since E1: the Expansionist levy cards, three new fields and a new
    // end-of-turn phase, so a v135 log's picks name cards this build deals
    // differently and its resolutions run one phase fewer.
    // 137 since D5: fourteen Dominion cards that raise units or pay on new
    // moments, and a new record, so a v136 log's picks name cards this build
    // never dealt.
    // 138 since D6: eleven Dominion cards about captures, commissions and the
    // end of a war, and new records on wars, towns and seats, so a v137 log's
    // picks name cards this build never dealt.
    // 139 since E2: ten Expansionist cards about moments, records and counts,
    // two new town fields and a new end-of-turn phase, so a v138 log's picks
    // name cards this build deals differently and its resolutions run one
    // phase fewer.
    // 140 since E3: ten Expansionist cards about the land and two new tile
    // fields, so a v139 log's picks name cards this build deals differently.
    // 141 since E4: ten Expansionist cards about works, claims and borders,
    // and two new end-of-turn phases, so a v140 log's picks name cards this
    // build deals differently and its resolutions run two phases fewer.
    // 142 since D7: thirteen Dominion cards about economy rules and Double
    // Time, and a fourteenth step in a town's yields, so a v141 log's picks
    // name cards this build never dealt.
    // 143 since E5: eight cards about meters, commissions and the shared
    // militia, and a new town field, so a v142 log's picks name cards this
    // build deals differently.
    // 144 since the lake fix (L1): a lake is water like the coast, so pieces
    // path across lakes and a v143 log's moves meet a different board.
    // 145 since D8: the last eight Dominion Doctrines and a record of the
    // attacks made this turn, so a v144 log's Doctrine offers hold cards
    // this build deals differently.
    // 146 since E6: The Breadbasket and Veteran Colonies come live, so a v145
    // log's picks name cards this build deals differently.
    // 147 since the movement fixes (flags item xxxxxx): a landing is planned
    // only where the piece may stop, and a blocked march goes round, so a
    // v146 log's marches would walk different routes.
    // 148 since the take (flags item aaaaaaa): a pin may take a hex from
    // another town of the empire, so a v147 log is judged by a new rule.
    // 149 since the rung fix: the Order tiers open at the government tiers
    // (4, 10, 18 and 29 drafts), so a v148 log's hands from draft 10 on
    // come from a different tier.
    // 150 since Tier IV moved to 26 drafts (flags item ddddddd), with the
    // tier-29 governments, so a v149 log's drafts 26 to 28 deal differently.
    // 151 since the Order tiers open at their draft rung alone (flags item
    // eeeeeee), so a v150 log's hands from a seat ahead of its research age
    // come from a later tier.
    // 152 since the charter technologies (Scientific batch S0): thirteen
    // technologies join the tree and two Scientific cards come live, so a
    // v151 log's research and drafts meet a different tree and deck.
    // 153 since the line traits (Scientific batch S1): three Scientific
    // charters are dealt, so a v152 log's hands differ from the first draft.
    // 154 since the Scientific types and retirements (batch S1b): a
    // Scientific seat's pool loses eleven cards, and typed chairs refuse some
    // seat commands a v153 log holds.
    // 155 since Dominion batch D9: ten Dominion Orders and one Doctrine are
    // retired and one Order comes live, so a v154 log's Dominion hands and
    // Doctrine offers hold different cards.
    // 156 since Scientific batches S2 and S3 (the guildsmen, and readings
    // against the empires a seat has met): eight Orders come live, so a v155
    // log's Scientific and Commerce hands hold different cards.
    // 157 since Dominion batch D10: nine Dominion Orders come live and two
    // change, so a v156 log's Dominion hands hold different cards.
    // 158 since Scientific batch S4 (the building charters): eight Scientific
    // charters are dealt, and five buildings and the Physic Garden join the
    // tables, so a v157 log's Scientific hands hold different cards.
    // 159 since Dominion batches D11 and D12, which landed together. D11:
    // five Dominion Orders come live and one changes. D12: two Dominion
    // Orders come live, three change, and resource lines read the sight gate.
    // So a v158 log's Dominion hands hold different cards.
    // 160 since Scientific batch S5 (the learned land): the Surveyors' and
    // the Alchemists' Charters are dealt, eight more Scientific Orders come
    // live and The Assay is shared with Expansionist, so a v159 log's
    // Scientific and Expansionist hands hold different cards.
    // 161 since Dominion batches D13, D14 and D15, which landed together. D13:
    // The Limitanei comes live. D14 and D15: The Relay Stations,
    // Circumvallation and The Upstarts come live and Marine Drill becomes The
    // Longships. So a v160 log's Dominion hands hold different cards.
    // 162 since Scientific batch S6 (the research record): eleven more
    // Scientific Orders come live, so a v161 log's Scientific hands hold
    // different cards.
    // 163 since Scientific batch S7 (the data-only cards of Tiers 0 to II):
    // nine more Scientific Orders come live and three change, so a v162
    // log's Scientific hands hold different cards.
    // 164 since Scientific batch S8 (great people and the great houses):
    // eleven more Scientific Orders come live, so a v163 log's Scientific
    // hands hold different cards.
    // 165 since Expansionist batches E7 and E8, which landed together. E7
    // (the themes sheet): fifteen Expansionist rows are retired, ten change in
    // place and five change type. E8 (five new data-only cards): five more
    // Expansionist Orders come live. So a v164 log's Expansionist hands and
    // chairs hold different cards.
    // 166 since Scientific batch S9 (the army and the Opus): nine more
    // Scientific Orders and the shared The Soldier-Scholars come live, so a
    // v165 log's Scientific and Dominion hands hold different cards.
    // 167 since Expansionist batches E9 and E10, which landed together. E9
    // (the land): two more Expansionist Orders come live and a worker's burn
    // may mark an improved hex. E10 (the militia and the trades): two more
    // Expansionist Orders come live and a retired soldier pays a citizen. So a
    // v166 log's Expansionist hands, land and towns differ.
    // 168 since Expansionist batches E11 and E12, which landed together. E11
    // (public works and empire buildings): two more Expansionist Orders come
    // live and The Topping Out pays every town for an empire building. E12
    // (The Cura Aquarum): one more Expansionist Order comes live. So a v167
    // log's Expansionist hands and towns differ.
    // 169 since Commerce batch T1 (the sheet of record): eleven Commerce rows
    // are retired, four move to the shared file, fifteen change in place, and
    // every listed Commerce row carries a type. So a v168 log's Commerce hands
    // and chairs hold different cards.
    // 170 since Commerce batch T2 (the new data-only cards): eight new
    // Commerce cards are dealt, and the shared Merchant Scholars moves to
    // Tier III with new text. So a v169 log's Commerce and Scientific hands
    // hold different cards.
    // 171 since Commerce batch T7 (the pair cards): the shared The Art Dealers
    // is dealt and pays on a card drafted, and The Standing Army moves to the
    // shared file for Dominion and Commerce. So a v170 log's Commerce,
    // Magisterial and Dominion hands hold different cards.
    // 172 since Commerce batch T3 (routes and posts): four Commerce cards come
    // live, a post established is a new moment, a home route may pay its
    // origin, and The Admiralty of Trade's waiver widens. So a v171 log's
    // Commerce hands hold different cards.
    // 173 since Commerce batch T4 (the trade commissions): Commission: The
    // Great Fair is a new Commerce card, and The World's Fair has a new goal
    // and a reward that writes posts. So a v172 log's Commerce hands hold
    // different cards.
    // 174 since Commerce batch T5 (goods and deals): two counts read the
    // deal register, a lent luxury may still count for its lender, a
    // foreign post may lend a luxury, and five more Commerce cards are
    // dealt. So a v173 log's Commerce hands hold different cards.
    // 175 since Commerce batch T6 (the purse and the hoard): purchases may
    // go into debt under a credit line, a turn's end is a tally moment, a
    // bought unit may carry an upkeep waiver, and four more cards are dealt.
    // So a v174 log's Commerce hands hold different cards.
    // 177 since Magisterial batch MG1 (the sheet of record): the deck's
    // rows carry types, 64 rows are retired and four cards change in
    // place. Devotion batch DV1 took 176 for its own sheet of record. So a
    // v175 log's Devotion and Magisterial hands hold different cards.
    // 178 since Devotion batch DV2 (the new data-only cards): seven Devotion
    // cards and four shared cards are dealt, and the charter technology
    // Scholasticism opens the Cathedral and the Apostle early. So a v177
    // log's Devotion, Dominion and Scientific hands hold different cards.
    // 179 since Magisterial batch MG2 (the data-only cards of Tiers 0 and
    // I): fourteen Magisterial cards are dealt. So a v178 log's Magisterial
    // hands hold different cards.
    // 180 since Devotion batch DV3 (the engine's shapes): `Player.faithSpent`
    // joins the state, four Devotion cards and the shared The Rising Nave are
    // dealt, and The Creed counts gods. So a v179 log's Devotion and
    // Magisterial hands hold different cards.
    // 181 since Magisterial batch MG3 (the data-only cards of Tiers II to
    // IV): eleven Magisterial cards are new and dealt, and The Golden Age
    // and The Magister's Court leave `deferred`. So a v180 log's Magisterial
    // hands hold different cards.
    // 182 since Devotion batch DV4 (rites are seasons): a rite that acts at
    // once no longer counts as a rite started, a prophet's rite counts once
    // in each town it reaches, the Rite of the Sabbath is new, and three
    // Devotion cards are dealt. So a v181 log's Devotion hands hold
    // different cards.
    // 183 since Magisterial batch MG4 (the collection and the wonder
    // commissions): two counts, a commission figure and two tally occasions
    // are new, five Magisterial cards are dealt, and Travelling Players pays
    // for each deck among the seated cards. So a v182 log's Magisterial hands
    // hold different cards.
    // 184 since Devotion batch DV5 (the faith's reach): a founding can press
    // a lump of the founder's religion, The Confessors' sight rule and the
    // commission goal's `every` switch are new, and three Devotion cards
    // are dealt. So a v183 log's Devotion hands hold different cards.
    // 185 since Magisterial batch MG5 (the draft's price): an Order hand
    // keeps the culture it cost, the two draft moments carry that price, the
    // discount rule is new, and three Magisterial cards are dealt. So a v184
    // log's Magisterial hands hold different cards.
    // 186 since Devotion batch DV6 (a conversion as a moment): a foreign
    // town that turns pays a new moment, queued and paid when the pressing
    // ends, a town keeps the turn it last turned to each religion, and two
    // Devotion cards are dealt. So a v185 log's Devotion hands hold
    // different cards.
    // 187 since Magisterial batch MG6 (the hand): a card may refuse an Order
    // reroll, an offer rider may be counted, an Order may hand over a great
    // person when it is drafted, and three Magisterial cards are dealt. So a
    // v186 log's Magisterial hands hold different cards.
    // 188 since Devotion batch DV7 (the holy sites, the Opus and the
    // authority capstone): a card may set the price of an act of the clergy,
    // an apostle may raise a holy site, a rival's town that follows a
    // religion may stop its Opus, and four Devotion cards are dealt. So a
    // v187 log's Devotion hands hold different cards.
    // 189 since Magisterial batch MG7 (the council's moments): adopting a
    // government is a moment the cards pay on, a card may count the Doctrines
    // held, a commission may ask for a council in order and offer a Doctrine,
    // and three Magisterial cards are dealt. So a v188 log's Magisterial
    // hands hold different cards.
    // 190 since Devotion batch DV8 (the two largest rule-breakers): an enemy
    // soldier killed on the faith's ground may change sides, a town may keep
    // two rites, and two Devotion cards are dealt. So a v189 log's Devotion
    // hands hold different cards.
    // 191 since Magisterial batch MG8 (great people spent): spending a great
    // person is a moment the cards pay on, a rider may pay only while the
    // Magnum Opus is being built, a card may make each legacy count twice, a
    // commission may count the families of the works in your borders, and four
    // Magisterial and shared cards are dealt. So a v190 log's Magisterial and
    // Devotion hands hold different cards.
    // 192 since Magisterial batch MG9 (works on the land, and the wonder
    // towns): a great-person work may claim the unowned hexes beside it, a
    // unit may gain strength standing on a work, a commission may ask for one
    // town with wonders and worked works, a lost wonder race may move its
    // hammers on, and four Magisterial cards are dealt. So a v191 log's
    // Magisterial hands hold different cards.
    // 193 since Magisterial batch MG10 (the light capstones): a rider may pay
    // only for an Order hand that cost culture, an amplifier's share of a hex
    // line keeps the line's per-neighbour count, and three Magisterial cards
    // are dealt. So a v192 log's Magisterial hands hold different cards.
    // 194 since Magisterial batch MG11 (Magnificence): culture is a third
    // bank of the purchase verb, which a card opens to buy the wonder at the
    // front of a queue, and one Magisterial card is dealt. So a v193 log's
    // Magisterial hands hold different cards.
    // 195 since Magisterial batch MG12 (The Mixed Constitution): a card may
    // let every card of its holder fit every chair, the council is re-seated
    // at once when that card leaves, and one Magisterial card is dealt. So a
    // v194 log's Magisterial hands hold different cards.
    // 196 since Magisterial batch MG13 (The Universal Genius): a great
    // person may act and stay on the board to lay their work, marked by a
    // new unit field, and one Magisterial card is dealt. So a v195 log's
    // Magisterial hands hold different cards.
    // 197 since Magisterial batch MG14 (the boons): a card may hand over a
    // random card from a deck the seat does not hold, or pay yields when it
    // is drafted, and two Magisterial cards are dealt. So a v196 log's
    // Magisterial hands hold different cards.
    // 198 since Magisterial batch MG15 (arrangements on the hex grid): a tile
    // test may ask for a work on a straight line of works, a commission may
    // count the works and tended hexes beside one work and claim the land
    // around it, and two Magisterial cards are dealt. So a v197 log's
    // Magisterial hands hold different cards.
    // 199 since Magisterial batch MG16 (The Pull of the Masters): a card may
    // let each great-person work take one rival hex beside it at the end of
    // the borders phase, and one Magisterial card is dealt. So a v198 log's
    // Magisterial hands hold different cards.
    // 200 since batch R2a (two religion rules): a rite costs more for each
    // rite the empire has started, counted on the player, and two empires
    // may hold the same pantheon god. So a v199 log charges different
    // prices for rites and deals different gods.
    // 201 since batch R2b (a building's package): a building share is
    // taken over every line a card or a luxury puts on the building, and
    // a faith building supplies faith. So a v200 log banks different
    // figures where a share meets a counted line or a luxury helping.
    // 202 since batch R2c (the Devotion review's cards): three Devotion
    // cards are retired, four move to Tier I, three are new, and
    // Scholasticism opens the Cathedral School in place of the early
    // Cathedral and Apostle. So a v201 log's Devotion and Dominion hands
    // hold different cards.
    // 203 since batch BR1 (barbarian camps): a new camp starts with one or
    // two units, each camp keeps two guards, and the other soldiers march on
    // the players' towns. So a v202 log's camps raise different units and
    // its rolls move after the first camp.
    // 204 since batch R2d ("supplies" means one thing): a building share's
    // `pays` selector, al-Khwārizmī's purchase and the four rows that counted
    // `scienceBuildings` ask `buildingSupplies`, and a building's own counted
    // lines join its package. So a v203 log's towns bank different figures.
    // 205 since batch R3 (the Scientific review's cards): three cards move to
    // Tier I, The Prize Essay is retired and three Tier 0 cards are new, so a
    // Scientific or Expansionist seat's pools hold different cards and a v204
    // log's draws move.
    // 206 since batch DT1 (Dominion's Doctrines): four rows change, two move
    // tier and two are retired, so a Dominion seat's Doctrine pools hold
    // different cards and a v205 log's draws move.
    // 207 since batch DT2 (Expansionist's Doctrines, data only): eleven rows join
    // the deck, so an Expansionist seat is now offered Doctrines and a v206 log's
    // draws move.
    // 208 since batch DT3 (Commerce's and Scientific's Doctrines, data only):
    // fifteen rows join the two decks, so their seats are now offered Doctrines and
    // a v207 log's draws move.
    // 209 since batch DT4 (Magisterial's and Devotion's Doctrines, data only):
    // ten rows join the two decks, so their seats are now offered Doctrines and a
    // v208 log's draws move.
    // 210 since batch DT5 (the gates on the Doctrine offer, and six rows): a
    // gated row leaves a seat's bag, so a v209 log's draws move.
    // 211 since batch DT6 (small narrowings): eleven rows join the Doctrine bags,
    // so a v210 log's draws move.
    // 242 since batch BP2 (bot pass 3): `Player.unitsGained` joins the state,
    // a record the bots read; no rule reads it.
    // 243 since batch BP7 (bot pass 3): the Forbidden City gives whoever holds
    // its town one more Wildcard chair.
    // 244 since batch BP13c: an empire lends only the luxury copies it owns, so
    // a borrowed copy cannot be lent on.
    // 245 since the faster world clock: an age starts to close when one seat
    // is two ages past it or half the seats are one age past it, so a v244
    // log's ages open on different turns.
    // Version 246 changes the generic draft pool. Old picks record offer positions.
    // Version 248 changes the draft pools and wonder effects used during replay.
    // Version 249 changes the leader and Great Person rosters, religion names and unit purchases.
    expect(SCHEMA_VERSION).toBe(249);
  });
});
