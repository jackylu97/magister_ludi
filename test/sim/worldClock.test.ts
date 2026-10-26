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
  worldAge,
  worldAgeCountdown,
} from "../../src/sim/worldClock";
import { newGame } from './newGameHelpers';

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
    expect(SCHEMA_VERSION).toBe(194);
  });
});
