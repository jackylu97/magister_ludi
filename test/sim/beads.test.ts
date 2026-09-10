/**
 * The Bead Race — the game's one victory condition (design ledger Entry VI,
 * `docs/beads.md`), **as batch Q1 left it** (`docs/wager.md` §5).
 *
 * A bead comes from a **wager kept** or from a **grant** — a thing that hands
 * one over — and from nothing else. The deeds are retired: feats, race projects
 * and quests carry `retired: true` beside the eight reckonings G2 withdrew, and
 * the machinery that dealt and swept them is deleted. So what this file pins, in
 * the order the mechanism runs: the catalogue is consistent and says which rows
 * are withdrawn; nothing is dealt and no deck exists to deal from; the world's
 * clock still opens an age and zeroes the per-age counters; a withdrawn row is
 * refused at `awardBead` however it is reached; a race project is offered to
 * nobody and priced by nothing; the four Æra V bead Orders are out of every
 * pool; every boon shape still *describes* itself, because the rows are kept for
 * the record; and the threshold opens the Magnum Opus at the figure the bench
 * cut for a world with no deeds in it.
 *
 * The schema **pin** lives here (37) because this pass is what moved it.
 */

import { describe, expect, it } from "vitest";

import {
  BEAD_COUNTS,
  BEAD_ENDEAVOUR_IDS,
  BEAD_FEAT_IDS,
  BEAD_GRANT_IDS,
  BEAD_QUEST_IDS,
  BEAD_RECKONING_IDS,
  BEAD_RULES,
  anyBeadDef,
  beadDataProblems,
  beadEndeavourDef,
  beadFeatDef,
  beadGrantDef,
  beadIsDormant,
  beadQuestDef,
  beadReckoningDef,
} from "../../src/sim/beadData";
import {
  awardBead,
  awardBeadGrant,
  awardBeadOccasion,
  awardOrderBeads,
  beadCapEffects,
  beadCount,
  beadsAwarded,
  describeBeadBoon,
  endeavourError,
  runWorldClock,
} from "../../src/sim/beads";
import { currentWorldAge } from "../../src/sim/worldClock";
import { BUILDING_IDS, buildingDef } from "../../src/sim/buildingData";
import { TECH_IDS } from "../../src/sim/techData";
import {
  cardBeadOccasions,
  settleOrderSkip,
  stripRefs,
} from "../../src/sim/statecraft";
import {
  ORDER_POOLS,
  orderDef,
  poolOrders,
} from "../../src/sim/statecraftData";
import { type Command, applyCommand } from "../../src/sim/commands";
import { advanceProduction, foundCityAt } from "../../src/sim/cities";
import {
  createGame,
  dispatch,
  loadGame,
  replay,
  saveGame,
} from "../../src/sim/game";
import {
  type GameMap,
  type Tile,
  createMap,
  getTileAt,
} from "../../src/sim/map";
import { explainAuthority } from "../../src/sim/meters";
import { PROJECT_IDS } from "../../src/sim/projectData";
import {
  type City,
  type GameConfig,
  type GameState,
  SCHEMA_VERSION,
  createUnit,
  newGame,
  bumpRevision,
} from "../../src/sim/state";
import { buildError, isUnlocked } from "../../src/sim/tech";
import { razeCityAt } from "../../src/sim/diplomacy";
import { END_OF_TURN_PHASES, runEndOfTurn } from "../../src/sim/turn";
import { resetVisibility } from "../../src/sim/visibility";
import { openEveryWar } from "./warHelpers";

// --- the bench --------------------------------------------------------------

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

function flatState(width = 16, height = 12): GameState {
  const state = newGame(config());
  state.map = createMap({ width, height, terrain: "grassland" });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
  state.units = [];
  state.nextEntityId = 1;
  // Every pair of real seats declares (schema 56): a blow between two empires
  // at peace is refused, and this bench is not about the refusal. See
  // `test/sim/warHelpers.ts`.
  openEveryWar(state);
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function plant(
  state: GameState,
  ownerId: number,
  col: number,
  row: number,
): City {
  return foundCityAt(state, ownerId, at(state.map, col, row));
}

/**
 * Puts one seat into a **built** age, by handing it a technology that belongs to
 * it. Since the tree pass of 2026-08-30 the deck keys and the doc's numerals are
 * the same numbers: deck 3 is Æra III (Empire) and deck 4 is Æra IV
 * (Cathedrals). See `BeadAge`.
 */
function reachAge(state: GameState, playerId: number, age: 3 | 4): void {
  const player = state.players[playerId]!;
  const tech = age === 3 ? "mathematics" : "theology";
  if (!player.techsResearched.includes(tech)) player.techsResearched.push(tech);
  bumpRevision(state);
}

/**
 * Puts the **world** in an age, the way the clock does.
 *
 * Since batch G1 the world's age is derived rather than stored (`worldClock.ts`
 * — the mean of the board, ten turns after it crossed), so a bench that wants
 * the world in Æra III stamps Æra II's close on a turn that has already passed.
 * There is no field to set: that is the whole point of the change, and a test
 * that could still set one would be the second clock the batch removed.
 */
function worldIn(state: GameState, age: number): void {
  state.ageClose = { age: age - 1, turn: state.turn - 1 };
  bumpRevision(state);
}

/**
 * Runs the world's clock — the whole of what an end of turn does to this table
 * since batch Q1 took the `beads` phase with the deeds it swept.
 */
function beat(state: GameState): void {
  runWorldClock(state);
}

// --- 1. the catalogue -------------------------------------------------------

describe("the bead catalogue", () => {
  it("is consistent", () => {
    expect(beadDataProblems()).toEqual([]);
  });

  it("keeps five classes of row and leaves three of them withdrawn", () => {
    // The bodies stay for the Compendium's record; what changed is that nothing
    // can be dealt or awarded off them.
    expect(BEAD_FEAT_IDS.length).toBeGreaterThan(0);
    expect(BEAD_ENDEAVOUR_IDS.length).toBeGreaterThan(0);
    expect(BEAD_QUEST_IDS.length).toBeGreaterThan(0);
    expect(BEAD_RECKONING_IDS.length).toBeGreaterThan(0);
    for (const id of BEAD_FEAT_IDS)
      expect(beadFeatDef(id).retired, id).toBe(true);
    for (const id of BEAD_ENDEAVOUR_IDS)
      expect(beadEndeavourDef(id).retired, id).toBe(true);
    for (const id of BEAD_QUEST_IDS)
      expect(beadQuestDef(id).retired, id).toBe(true);
    for (const id of BEAD_RECKONING_IDS)
      expect(beadReckoningDef(id).retired, id).toBe(true);
    for (const id of [
      ...BEAD_FEAT_IDS,
      ...BEAD_ENDEAVOUR_IDS,
      ...BEAD_QUEST_IDS,
    ]) {
      expect(beadIsDormant(id), id).toBe(true);
    }
  });

  it("leaves the wager’s four and the five a thing hands over live", () => {
    // **The whole of what still pays a bead.** The four repeatable rows a kept
    // wager mints, and the five a building or a node hands over. The other four
    // grants are the Æra V bead Orders' and are withdrawn with the cards that
    // minted them.
    const live = BEAD_GRANT_IDS.filter((id) => !beadIsDormant(id));
    expect(live).toEqual([
      "theGoldenBead",
      "theClosingWork",
      "theStarChart",
      "theTurningHeavens",
      "theCodex",
      "theWagerOfArms",
      "theWagerOfTheMuse",
      "theWagerOfTheLamp",
      "theWagerOfThePurse",
    ]);
    const withdrawn = BEAD_GRANT_IDS.filter((id) => beadIsDormant(id));
    expect(withdrawn).toEqual([
      "theLastLearning",
      "theWreathRefused",
      "theSownSalt",
      "theWordGoneOut",
    ]);
    for (const id of withdrawn) expect(beadGrantDef(id).retired, id).toBe(true);
  });

  it("is written to by two sources and no others", () => {
    // **The register of who mints a bead**, read at the source. `awardBead` is
    // the only writer of a rod, and the callers that reach it are the wager's
    // claim and the grant seam — which is `awardBeadGrant` and the two
    // conveniences over it (`awardOrderBeads`, and the occasion listener that
    // every retired row leaves refusing).
    const sims = import.meta.glob(
      ["../../src/sim/*.ts", "../../src/sim/*/*.ts"],
      {
        query: "?raw",
        import: "default",
        eager: true,
      },
    ) as Record<string, string>;
    const callers: string[] = [];
    for (const [path, body] of Object.entries(sims)) {
      if (path.endsWith("/beads.ts")) continue;
      if (/\bawardBead\s*\(/.test(body)) callers.push(path.split("/").pop()!);
    }
    expect(callers).toEqual(["wagers.ts"]);
  });

  it("names only counts the evaluator answers", () => {
    // The register test: a count declared and never read, or read and never
    // declared, is the drift this vocabulary exists to prevent.
    const state = flatState();
    for (const count of BEAD_COUNTS) {
      expect(typeof beadCount(state, 0, count), count).toBe("number");
    }
  });

  it("pins the schema version the Bead Race moved", () => {
    // v40: the Cathedral (Entry LV) — cost 340 and a consecration draw at completion
    // moved every replay that raised one.
    // v42: the faith rework of Entry LVIII — one-charge agents, the founding's
    // double draft and The Holy Office's tenants move every replay with a
    // prophet or an augur in it.
    // v44: the age-1 restoration and the deepened chains — Calendar is a node
    // again, Currency and Irrigation trade places, and Æra III/IV are re-chained,
    // so a v43 log aims research at a tree this build does not have.
    // v45: the endgame of Entry LVIII — the Magnum Opus, the three bead-paying
    // great works, the Long Count's die and Alchemy's closing bead. A v44 log
    // reaches a winner it never reached, and spends rolls it never spent.
    // v46: the card pools of Entry LVIII — nineteen new Orders, a Doctrine, two
    // beliefs and a sixth consecration join the bags a draft draws from, and The
    // Laureate's once-per-game great person becomes a renown trickle. A v45 log
    // names indices of hands this build does not deal.
    // v47: the timeline reshape and the column-formula costs — seventeen
    // prerequisite edges moved so every column earns its width, and every cost
    // is rewritten off the node's own column. A v46 log aims research at a tree
    // this build does not have, and pays prices it never paid.
    // v48: the user's balance pass — the authored Order deepening ladder, the
    // Order and Doctrine retunes, and the reworked luxury signatures. A v47 log
    // drafts from a deck this build does not deal, and deepens by numbers it
    // does not carry.
    // v49: the cost ladder re-anchored at the first *paid* tier — the root is
    // not a tier. Column 0 holds Agriculture alone and Agriculture is granted,
    // so every column now takes the price the column to its left used to carry
    // (Fletching 13 where it was 30) and a v48 log pays the wrong beakers from
    // the first technology anybody researches.
    // v50: tree revision 4 — the user's hand-drawn tree transcribed. Fourteen
    // nodes renamed with their ids kept, three ids cut (`ancestorRites`,
    // `chivalry`, `fortification`) and three added, almost every prerequisite
    // re-hung, twelve columns and a truncated cost ladder — and, beside it, the
    // one-unit-a-turn purchase rule widened to one *per class*.
    // v55 (2026-09-03, the playtest notes): two table deletions — the Standing
    // Stones improvement and the Terraces — so a v54 log that built either has
    // no row to replay into.
    // v57 (war & diplomacy, phase two): deals exist. Two registers, four
    // verbs and a widened `proposePeace`, a luxury that may be lent across a
    // table, and one technology that hands over a verb it did not — so a v56
    // log knows no deal commands and replays into a different world.
    // v68 (2026-09-05, the cards pass): Government IV and V become Order pools
    // of their own and twenty-seven rows join them, so a v67 log's `chooseOrder`
    // names indices into hands this build does not deal.
    // v69 (2026-09-05, the victory rule): finishing the Magnum Opus wins the
    // game outright — the builder is the winner, and the most-beads count with
    // its builder tie-break is retired. A v68 log replays to the same board and
    // to a different verdict, which is the one thing a version number is for.
    // v71 (2026-09-06, faith's currency): the dice of the Magister are gone —
    // `Player.dice`, the rules' starting dice, and the eight boons that paid
    // one, seven of which now pay nothing and say so. A v70 log's seats hold a
    // bank this build does not have.
    // 73 since batch D (2026-09-06): the buildings cut with chains — twelve
    // ordinary rows withdrawn, five uniques added, the chain field, the
    // Throne's per-unit rebate and the base beaker halved. 74 since batch C2
    // landed the rites beside it on the same day.
    // 75 since batch X (2026-09-06): yields are exact — no fold floors, every
    // bank and pool holds the fraction, so a v74 log banks different figures
    // from its second turn on.
    // 105 since batch G3 (2026-09-09): the malice deck — a missed wager seats
    // a card in one of the realm's own chairs, drawn at the judgement.
    // 106 since batch C1 (2026-09-09): the census's register and the seat's own
    // stamp for the last page it read.
    // 108 since batch Q1 (2026-09-09): the deeds retire. Three whole decks carry
    // `retired: true`, `BeadTable` is the world's register alone, and `newGame`
    // no longer shuffles anything — so a v107 log's every later roll is a
    // different number.
    expect(SCHEMA_VERSION).toBe(110);
  });

  it("puts the world clock after renown and the wager after it, with no bead phase left", () => {
    // Re-aimed twice. Batch G1 lifted the clock out of the `beads` phase into a
    // phase of its own in the same seat; batch Q1 deleted the `beads` phase
    // itself, because a phase that dealt a card and swept a deed had neither
    // left to do. What must still hold is the order of the two that remain.
    const names = END_OF_TURN_PHASES.map((phase) => phase.name);
    expect(names.indexOf("worldClock")).toBe(names.indexOf("renown") + 1);
    expect(names.indexOf("wagers")).toBe(names.indexOf("worldClock") + 1);
    // And batch C1 put the `census` phase directly after the wagers: the leader's
    // Triumph pays renown, and both read a board the clock has settled. The
    // `beads` phase that followed is gone (batch Q1): nothing left to deal or sweep.
    expect(names.indexOf("census")).toBe(names.indexOf("wagers") + 1);
    expect(names).not.toContain("beads");
  });
});

// --- 2. nothing is dealt ----------------------------------------------------

describe("the deal", () => {
  it("is gone: the table carries the world’s register and nothing else", () => {
    // Batch Q1. `BeadTable` held four fields — two decks, two hands, the
    // register and the streak book — and the three that served the deeds went
    // with them. A field nothing writes is a question somebody will one day try
    // to answer.
    const state = newGame(config({ seed: 12 }));
    expect(Object.keys(state.beads)).toEqual(["claimed"]);
    expect(state.beads.claimed).toEqual([]);
  });

  it("spends none of the generator, so a seed is no longer a deal", () => {
    // The one thing the deal *did* to the rest of the game was consume rolls in
    // `newGame`. It consumes none now, which is the whole reason a v106 log does
    // not replay — and what this pins is that `newBeadTable` takes no generator
    // at all rather than quietly rolling and throwing the numbers away.
    const sims = import.meta.glob("../../src/sim/state.ts", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>;
    const body = Object.values(sims)[0]!;
    expect(body).toContain("function newBeadTable(): BeadTable {");
    expect(body).toContain("beads: newBeadTable(),");
  });

  it("replays byte for byte with no cards behind it", () => {
    const game = createGame(config({ seed: 9 }));
    for (let turn = 0; turn < 6; turn++) {
      for (const player of game.state.players) {
        if (player.barbarian) continue;
        dispatch(game, { type: "endTurn", playerId: player.id });
      }
    }
    const again = loadGame(saveGame(game));
    expect(JSON.stringify(again.state)).toBe(
      JSON.stringify(replay(game.config, game.log)),
    );
  });
});

describe("the world's clock", () => {
  it("opens an age when the countdown reaches nought", () => {
    const state = newGame(config());
    for (let turn = 0; turn < 3; turn++) {
      state.turn += 1;
      beat(state);
    }
    expect(currentWorldAge(state)).toBe(1);

    // One seat alone no longer moves the world: the mean of a seat in Æra III
    // and a seat in Æra I is Æra II.
    reachAge(state, 1, 3);
    state.turn += 1;
    beat(state);
    expect(currentWorldAge(state)).toBe(1);

    // The close is the one moment the world changes age. Nothing turns face up
    // with it any more — there is no hand — and what it still does is zero the
    // per-age counters, which the next test reads.
    state.ageClose = { age: 2, turn: state.turn + 1 };
    state.turn += 1;
    beat(state);
    expect(currentWorldAge(state)).toBe(3);
  });

  it("resets the per-age counters at every opening", () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    state.players[0]!.greatPeopleThisAge = 4;
    state.players[0]!.routeYieldsThisAge = 90;
    // The countdown is standing and closes on the very next turn, which is the
    // moment the counters are meant to be zeroed.
    state.ageClose = { age: 2, turn: state.turn + 1 };
    state.turn += 1;
    beat(state);
    expect(currentWorldAge(state)).toBe(3);
    expect(state.players[0]!.greatPeopleThisAge).toBe(0);
    expect(state.players[0]!.routeYieldsThisAge).toBe(0);
  });
});

// --- 3b. the withdrawn decks ------------------------------------------------

describe("a withdrawn row", () => {
  it("is refused at `awardBead`, however it is reached", () => {
    // **The rung the refusal sits on is the rule.** `beadIsDormant` answers for
    // a dormant row and a retired one alike, and `awardBead` asks it before it
    // asks the register — so a hand-edited save, a stray call and a seam that
    // was never re-aimed all mint nothing.
    const state = flatState();
    plant(state, 0, 4, 4);
    for (const id of [
      BEAD_FEAT_IDS[0]!,
      BEAD_QUEST_IDS[0]!,
      BEAD_ENDEAVOUR_IDS[0]!,
      BEAD_RECKONING_IDS[0]!,
      "theSownSalt",
    ] as const) {
      expect(awardBead(state, 0, id, 0), id).toBeNull();
    }
    expect(state.players[0]!.beads).toEqual([]);
    expect(state.beads.claimed).toEqual([]);
  });

  it("is announced to and pays nothing, at every seam that still says a word", () => {
    // The occasion listener is kept — six seams say a word through it and it is
    // the second listener on the shared `Occasion` union — and every row it
    // could reach is withdrawn, so it answers with an empty list.
    const state = flatState();
    plant(state, 0, 4, 4);
    for (const occasion of [
      "religionFounded",
      "capitalCaptured",
      "ageClosed",
    ] as const) {
      expect(awardBeadOccasion(state, 0, occasion), occasion).toEqual([]);
    }
    expect(state.players[0]!.beads).toEqual([]);
  });

  it("takes a captured palace without clacking a bead for it", () => {
    // The seam is untouched — a capture is still counted — and what went is the
    // feat that used to be minted at it.
    const state = flatState();
    const seat = plant(state, 1, 9, 4);
    const raider = createUnit(state, 0, "swordsman", 8, 4);
    seat.hp = 1;
    const result = applyCommand(state, {
      type: "attack",
      playerId: 0,
      unitId: raider.id,
      target: { col: seat.col, row: seat.row },
    });
    expect(result.ok).toBe(true);
    expect(state.players[0]!.citiesCaptured).toBe(1);
    expect(state.players[0]!.beads).toEqual([]);
  });

  it("sweeps nothing over a played run of turns", () => {
    // The `beads` phase is gone, so a turn resolving is the pin: no rod moves
    // and the world's register stays empty on a board that would once have paid
    // a feat for the first city founded in the world.
    const state = flatState();
    plant(state, 0, 4, 4);
    plant(state, 1, 9, 4);
    for (let turn = 0; turn < 12; turn++) {
      state.turn += 1;
      runEndOfTurn(state);
    }
    expect(state.players[0]!.beads).toEqual([]);
    expect(state.players[1]!.beads).toEqual([]);
    expect(state.beads.claimed).toEqual([]);
  });
});

// --- 5. race projects, withdrawn --------------------------------------------

describe("a race project", () => {
  it("is offered to nobody and refused in one sentence", () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    for (const id of BEAD_ENDEAVOUR_IDS) {
      expect(isUnlocked(state, 0, "project", id), id).toBe(false);
      expect(buildError(state, 0, "project", id), id).toMatch(
        /no longer raced/,
      );
      expect(endeavourError(state, 0, id), id).toMatch(/no longer raced/);
    }
  });

  it("has left the project table the queue prices rows from", () => {
    for (const id of BEAD_ENDEAVOUR_IDS) {
      expect(PROJECT_IDS, id).not.toContain(id);
    }
    // The conversions are all that is left of the shelf.
    expect(PROJECT_IDS).toEqual(["tithes", "scholarship", "pageants"]);
  });

  it("cannot be put in a queue by the reducer", () => {
    const state = flatState();
    const city = plant(state, 0, 4, 4);
    const refused = applyCommand(state, {
      type: "setCityProduction",
      playerId: 0,
      cityId: city.id,
      queue: [{ kind: "project", id: BEAD_ENDEAVOUR_IDS[0]! }],
    } as unknown as Command);
    expect(refused.ok).toBe(false);
    expect(city.queue).toEqual([]);
  });
});

// --- 6. the boons -----------------------------------------------------------

describe("a boon", () => {
  /**
   * Re-aimed by batch Q1. Every row that carried a boon is withdrawn, so there
   * is nothing left for `payBoon` to settle — what is kept is the **describer**,
   * because the rows are kept and the Compendium prints what they promised, and
   * the **cap**, because a bead's permanent step is `liveEffects`' eighth source
   * and is read off the seat's own record rather than settled when it is earned.
   */
  it("leaves a quest whose only boon was a die paying nothing, and annotated", () => {
    for (const id of [
      "threeOfTheAge",
      "theScholarsWager",
      "thePatron",
      "theBuilder",
    ] as const) {
      const def = beadQuestDef(id);
      expect(describeBeadBoon(def.boon)).toEqual([]);
      expect(def.deferred?.length ?? 0).toBeGreaterThan(0);
    }
    // And the lint agrees: an empty boon is a data mistake unless the row owns
    // up to it.
    expect(beadDataProblems()).toEqual([]);
  });

  it("raises a cap that every ledger then reads, off the record alone", () => {
    // The bead is put on the rod directly rather than awarded: the row is
    // withdrawn, and what is under test is that a cap on a seat's *record* is
    // still folded into the ledger — which is what makes a saved game that
    // earned one keep what it paid for.
    const state = flatState();
    plant(state, 0, 4, 4);
    const before = explainAuthority(state, 0);
    state.players[0]!.beads.push({
      id: "theConqueror",
      kind: "quest",
      family: "domination",
      turn: 1,
    });
    bumpRevision(state);
    expect(beadCapEffects(state.players[0]!).map((line) => line.id)).toEqual([
      "theConqueror",
    ]);
    const after = explainAuthority(state, 0);
    const sum = (lines: readonly { value: number }[]): number =>
      lines.reduce((total, line) => total + line.value, 0);
    expect(sum(after)).toBe(sum(before) + 4);
  });
});

// --- 7. awaitsTech and the threshold ---------------------------------------

describe("a building shipped ahead of its age", () => {
  /**
   * **One row is in that state, and it is the register.** The cathedral, the
   * mint and the armoury were the three the tree pass of 2026-08-30 gave nodes
   * to; the re-cut of 2026-09-02 put the **Hall of Deeds** back into it from the
   * other end — the node that unlocked it is gone and the row is kept so a save
   * that raised one replays. The marker means the same thing either way ("no
   * technology opens this"), and the refusal is the same refusal.
   */
  it("names every row no technology opens", () => {
    const dormant = BUILDING_IDS.filter(
      (id) => buildingDef(id).awaitsTech === true,
    );
    // The Bastion joined the Hall of Deeds on 2026-09-02: tree revision 4 cut
    // Fortification, the node that opened it, and the user's ruling was to keep
    // the row as an Æra V candidate rather than re-home it. Same shape as the
    // Hall's — no node names it, and `buildError` and `purchaseError` refuse it
    // outright, which is what stops "no tech gates it" reading as "available on
    // turn one".
    expect(dormant).toEqual(["hallOfDeeds", "bastion"]);
  });

  it("is still refused by both the queue and the treasury when a row asks for it", () => {
    const state = flatState();
    const city = plant(state, 0, 4, 4);
    // The unlock tech is checked first, so the seat has to be able to build the
    // row before the dormancy refusal is the one that answers.
    state.players[0]!.techsResearched = [...TECH_IDS];
    bumpRevision(state);
    const def = buildingDef("observatory") as { awaitsTech?: boolean };
    def.awaitsTech = true;
    try {
      expect(buildError(state, 0, "building", "observatory", city)).toMatch(
        /waits on a technology/,
      );
      const player = state.players[0]!;
      player.gold = 100000;
      const refused = applyCommand(state, {
        type: "purchaseItem",
        playerId: 0,
        cityId: city.id,
        item: { kind: "building", id: "observatory" },
        currency: "gold",
      });
      expect(refused.ok).toBe(false);
    } finally {
      delete def.awaitsTech;
    }
  });
});

describe("the threshold", () => {
  /** Puts `count` beads on a seat's rod. Any row will do; the tally is the fact. */
  const clack = (state: GameState, playerId: number, count: number): void => {
    const player = state.players[playerId]!;
    for (let i = 0; i < count; i++) {
      player.beads.push({
        id: "theFounder",
        kind: "quest",
        family: "economic",
        turn: 1,
      });
      bumpRevision(state);
    }
  };

  /**
   * The row that ends the game, read off the marker exactly as the rule does —
   * so a second capstone joins this test without being named in it.
   */
  const opus = BUILDING_IDS.find((id) => buildingDef(id).endsTheGame === true)!;

  it("opens the Magnum Opus, and nothing below it", () => {
    // Ruled 2026-09-04 (schema 64): the threshold used to name a winner in the
    // `beads` phase — a reading that never once fired, because the Opus always
    // closed the age first — and now it opens the Opus instead.
    const state = flatState();
    const city = plant(state, 0, 4, 4);
    // Everything else the row asks for: the world's technology, and the town.
    for (const player of state.players) player.techsResearched = [...TECH_IDS];
    bumpRevision(state);

    clack(state, 0, BEAD_RULES.threshold - 1);
    expect(buildError(state, 0, "building", opus, city)).toBe(
      `The Magnum Opus asks for ${BEAD_RULES.threshold} beads; ${state.players[0]!.name} holds ${
        BEAD_RULES.threshold - 1
      }`,
    );

    clack(state, 0, 1);
    expect(buildError(state, 0, "building", opus, city)).toBeNull();
  });

  it("no longer names a winner in the phase", () => {
    // The retired reading, pinned so it cannot come back by accident: a rod that
    // is full wins nothing until the great work is actually raised.
    const state = flatState();
    plant(state, 0, 4, 4);
    clack(state, 0, BEAD_RULES.threshold + 5);
    beat(state);
    expect(state.winnerId).toBeNull();
  });
});

// --- 8. the news ------------------------------------------------------------

/**
 * **Re-aimed by batch G1.** The news is unchanged — an age opens once and the
 * report says so — but the *moment* is: an age opens when a countdown reaches
 * nought (`worldClock.ts`), not when a seat researches something. So both
 * benches now stand a close on the very next turn rather than handing one seat
 * a technology and expecting the world to move.
 */
describe("the age opening", () => {
  it("rides out on the report and on the command result", () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    // A quiet turn says nothing at all.
    expect(runEndOfTurn(state).beadAgeOpened).toBeUndefined();
    // Æra II closes on the turn about to resolve, so Æra III opens on it.
    state.ageClose = { age: 2, turn: state.turn + 1 };
    state.turn += 1;
    expect(runEndOfTurn(state).beadAgeOpened).toBe(3);
    // And once only: the age opened, and it does not open again.
    state.turn += 1;
    expect(runEndOfTurn(state).beadAgeOpened).toBeUndefined();
  });

  it("reaches the caller through endTurn", () => {
    const game = createGame(config({ seed: 3 }));
    game.state.ageClose = { age: 2, turn: game.state.turn };
    let opened: number | undefined;
    for (const player of game.state.players) {
      if (player.barbarian) continue;
      const result = applyCommand(game.state, {
        type: "endTurn",
        playerId: player.id,
      });
      if (result.ok && result.beadAgeOpened !== undefined)
        opened = result.beadAgeOpened;
    }
    expect(opened).toBe(3);
  });
});

describe("every award reaches the caller", () => {
  it("rides out on the seat’s own diff, from the grant seam", () => {
    // Re-aimed by batch Q1: the sweep that used to pay a quest here is gone, so
    // the bead comes from the class that still hands one over. The news is the
    // *diff* either way — `Player.beads` is append-only and stamped — which is
    // why not one seam grew a parameter when the sweep went.
    const state = flatState();
    plant(state, 0, 4, 4);
    const mark = state.players[0]!.beads.length;
    const award = awardBeadGrant(state, 0, "theClosingWork");
    expect(award?.name).toBe("The Closing Work");
    expect(beadsAwarded(state.players[0]!, mark).map((one) => one.id)).toEqual([
      "theClosingWork",
    ]);
    // Once per empire, and on the world's register with the seat that took it.
    expect(awardBeadGrant(state, 0, "theClosingWork")).toBeNull();
    expect(state.beads.claimed.map((claim) => claim.id)).toEqual([
      "theClosingWork",
    ]);
  });
});

// --- 8b. the describer ------------------------------------------------------

describe("describeBeadBoon", () => {
  // Re-aimed 2026-09-06 (schema 71): the die clause is gone with the dice, so
  // the order the settlement pays in is windfall, grant, caps.
  it("says a windfall, a grant and a cap in that order", () => {
    expect(
      describeBeadBoon({
        windfall: { yield: "science", amount: 200, where: "capital" },
      }).map((c) => c.text),
    ).toEqual(["a one-time windfall of 200 science"]);
    // `where` is printed only where the settlement reads it: beakers land in an
    // empire's bank whatever the row says, hammers land in a town.
    expect(
      describeBeadBoon({
        windfall: { yield: "production", amount: 200, where: "capital" },
      }).map((c) => c.text),
    ).toEqual(["a one-time windfall of 200 production in the capital"]);
    expect(
      describeBeadBoon({
        windfall: { yield: "population", amount: 1, where: "every" },
      }).map((c) => c.text),
    ).toEqual(["a citizen in every city"]);
    expect(
      describeBeadBoon({ grant: { settler: true } }).map((c) =>
        stripRefs(c.text),
      ),
    ).toEqual(["a free settler at the capital"]);
    expect(
      describeBeadBoon({ grant: { prophet: true } }).map((c) =>
        stripRefs(c.text),
      ),
    ).toEqual(["a free prophet at the capital"]);
    expect(
      describeBeadBoon({ grant: { greatPerson: "choice" } }).map((c) => c.text),
    ).toEqual(["a great person of your choosing"]);
    expect(
      describeBeadBoon({ effects: [{ kind: "authority", amount: 2 }] }).map(
        (c) => c.text,
      ),
    ).toEqual(["a lasting step: +2 authority capacity"]);

    // Several at once, in the settlement's own order.
    expect(
      describeBeadBoon({
        windfall: { yield: "science", amount: 200, where: "capital" },
        effects: [{ kind: "happiness", amount: 2 }],
      }).map((c) => c.text),
    ).toEqual([
      "a one-time windfall of 200 science",
      "a lasting step: +2 happiness",
    ]);
  });

  it("names a granted unit as a keyword ref", () => {
    // CLAUDE.md's rule: a describer that names a thing marks it, so the word is
    // a link wherever a click can land.
    expect(describeBeadBoon({ grant: { settler: true } })[0]!.text).toContain(
      "[[unit:settler|",
    );
  });

  it("is the one vocabulary the settlement would have paid in", () => {
    // The whole reason the describer exists beside the settlement: an offer card
    // that promised different words from the toast would be two vocabularies.
    // Nothing live carries a boon since batch Q1, so the pin is on the source —
    // `payBoon` prints these strings and no others, which is what held the two
    // together by construction rather than by discipline.
    const sims = import.meta.glob("../../src/sim/beads.ts", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>;
    const body = Object.values(sims)[0]!;
    expect(body).toContain("lines.push(stripRefs(windfallWords(windfall)));");
    expect(body).toContain("lines.push(stripRefs(clause.text));");
    expect(
      stripRefs(describeBeadBoon(beadQuestDef("theTithe").boon)[0]!.text),
    ).toBe("a one-time windfall of 200 gold");
  });

  // Re-aimed 2026-09-06 (schema 71): seven quests paid a die of the Magister and
  // nothing else, and the dice are gone. Those rows say nothing in the boon
  // vocabulary now and say it in a `deferred` line instead — which is what the
  // lint requires of them (`beadDataProblems`) and what this reads.
  it("says every row in the catalogue, or owns up to paying nothing", () => {
    const speaks = (
      id: string,
      boon: Parameters<typeof describeBeadBoon>[0],
      deferred?: string[],
    ): void => {
      const said = describeBeadBoon(boon).length;
      expect(said + (deferred?.length ?? 0), id).toBeGreaterThan(0);
    };
    for (const id of BEAD_QUEST_IDS) {
      speaks(id, beadQuestDef(id).boon, beadQuestDef(id).deferred);
    }
    for (const id of BEAD_ENDEAVOUR_IDS) {
      speaks(id, beadEndeavourDef(id).boon, beadEndeavourDef(id).deferred);
    }
  });
});

// --- 9. the withdrawn rows keep their bodies --------------------------------

describe("the endeavour rows", () => {
  it("keep the cost and the family the record was written against", () => {
    // The rows are not deleted — a game that finished one keeps its bead, and
    // the Compendium prints the page — so what is pinned is that the body is
    // still readable, not that anything prices it.
    for (const id of BEAD_ENDEAVOUR_IDS) {
      const def = beadEndeavourDef(id);
      expect(def.cost, id).toBeGreaterThan(0);
      expect(anyBeadDef(id).kind, id).toBe("endeavour");
    }
  });

  it("names a refusal the evaluator can answer", () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    for (const id of BEAD_ENDEAVOUR_IDS) {
      expect(typeof endeavourError(state, 0, id), id).toBe("string");
    }
  });
});

// The production sweep used to finish a race project inside itself. It cannot
// reach one now — the row is refused at the queue — and `advanceProduction` is
// pinned here as the phase that would have.
describe("the production phase", () => {
  it("finishes no race project, because none can be queued", () => {
    const state = flatState();
    worldIn(state, 3);
    for (let i = 0; i < 10; i++) plant(state, 0, i, 4);
    const city = state.cities[0]!;
    expect(
      buildError(state, 0, "project", BEAD_ENDEAVOUR_IDS[0]!),
    ).not.toBeNull();
    advanceProduction(state);
    expect(state.players[0]!.beads).toEqual([]);
    expect(city.queue).toEqual([]);
  });
});

// --- 10. the bead Orders, withdrawn -----------------------------------------

/**
 * **The four Æra V Orders that counted a deed** — The Great Enquiry, The Last
 * Laurels, The Salted Earth, The Final Proclamation — built as batch H3 and
 * **retired** as batch Q1 (`docs/flags.md` (nnn), ruling 2). They were waiting
 * on deeds: each pays a bead for a deed an empire chooses to repeat, and the
 * deeds are the thing that left the game. So the cards carry `retired: true`,
 * the four grant rows they minted carry it too, and the pair is what these pin.
 *
 * The **machinery** is untouched and that is deliberate: `beadPerOccasion` is a
 * live effect shape, `cardBeadOccasions` is still the only reader of it, and
 * `awardOrderBeads` is still the seam. A row is what was withdrawn, not a rule.
 */
describe("the bead Orders", () => {
  const BEAD_ORDERS = [
    "theGreatEnquiry",
    "theLastLaurels",
    "theSaltedEarth",
    "theFinalProclamation",
  ] as const;

  /** Slots a card, as a draft and a chair would have. Scaffolding only. */
  function slotOrder(state: GameState, playerId: number, id: string): void {
    const sc = state.players[playerId]!.statecraft;
    if (!sc.orders.includes(id as never)) sc.orders.push(id as never);
    sc.slots.push({ card: id as never, sealedUntil: state.turn });
    bumpRevision(state);
  }

  it("carry the mark and leave every pool", () => {
    for (const id of BEAD_ORDERS) {
      expect(orderDef(id).retired, id).toBe(true);
    }
    for (const pool of ORDER_POOLS) {
      for (const id of poolOrders(pool)) {
        expect(BEAD_ORDERS as readonly string[], `${pool}/${id}`).not.toContain(
          id,
        );
      }
    }
  });

  it("mint nothing, even standing in a chair", () => {
    // Held by a hand-edited save is the only way one can stand now, and the
    // refusal is `awardBead`'s: the grant row it names is withdrawn too.
    const state = flatState();
    slotOrder(state, 0, "theSaltedEarth");
    const city = plant(state, 0, 4, 4);
    razeCityAt(state, city);
    expect(state.players[0]!.beads).toEqual([]);

    slotOrder(state, 0, "theFinalProclamation");
    expect(awardOrderBeads(state, 0, "proclamationMade")).toEqual([]);
    expect(state.players[0]!.beads).toEqual([]);
  });

  it("mints nothing for an empire holding none of them", () => {
    const state = flatState();
    expect(cardBeadOccasions(state, 0, "cityRazed")).toEqual([]);
    expect(awardOrderBeads(state, 0, "cityRazed")).toEqual([]);
    expect(state.players[0]!.beads).toEqual([]);
  });

  it("pays The Last Laurels nothing at the pass, and still spends the hand", () => {
    // The *mechanism* is untouched: a pass is still a pass, it still raises the
    // skip count, and what it no longer does is mint.
    const state = flatState();
    slotOrder(state, 0, "theLastLaurels");
    const player = state.players[0]!;
    player.statecraft.pendingOrder = { options: [] } as never;
    const skip = settleOrderSkip(state, player);
    expect(skip).not.toBeNull();
    expect(player.beads).toEqual([]);
    expect(settleOrderSkip(state, player)).toBeNull();
  });

  /**
   * The four seams, read at the source. Each is one line in the mechanism that
   * does the thing — never in the reducer — and each is **kept**: the shape is
   * live, the rows are not, and re-hanging four calls the day a card wants them
   * again is not a thing a retirement should cost.
   */
  it("hooks each deed at the one place it happens", () => {
    const sims = import.meta.glob(
      ["../../src/sim/*.ts", "../../src/sim/*/*.ts"],
      {
        query: "?raw",
        import: "default",
        eager: true,
      },
    ) as Record<string, string>;
    const read = (file: string): string =>
      sims[Object.keys(sims).find((path) => path.endsWith(`/${file}`))!]!;
    expect(read("tech.ts")).toContain(
      "awardOrderBeads(state, player.id, 'lastAgeTechnology', lastAgeTechCount(player))",
    );
    expect(read("statecraft/draft.ts")).toContain(
      "awardOrderBeads(state, player.id, 'draftPassed')",
    );
    expect(read("diplomacy.ts")).toContain(
      "awardOrderBeads(state, report.ownerId, 'cityRazed')",
    );
    expect(read("religion.ts")).toContain(
      "awardOrderBeads(state, player.id, 'proclamationMade')",
    );
    // And `awardBead` is still the only writer of the rod.
    const beads = read("beads.ts");
    expect(beads.match(/player\.beads\.push\(/g)).toHaveLength(1);
  });
});
