/**
 * The Bead Race — the game's one victory condition (design ledger Entry VI,
 * `docs/beads.md`).
 *
 * What this file pins, in the order the mechanism runs: the catalogue is
 * consistent; the deal is a function of the seed alone and replays byte for
 * byte; the world's clock opens an age and turns its hand over; a reckoning is
 * taken once at that opening and ties pay nobody; a count is taken by the first
 * seat and only once; a streak needs the run and resets on a miss; an occasion
 * fires at its seam; a race project appears only under its prerequisite while
 * face up, is claimed by the first finisher, and pays the second nothing; every
 * boon shape settles through the seam that already exists; a dormant card is
 * never dealt; and the threshold opens the Magnum Opus (schema 64 — it used to
 * name a winner outright, and that reading is retired).
 *
 * The schema **pin** lives here (37) because this pass is what moved it.
 */

import { describe, expect, it } from 'vitest';

import {
  BEAD_COUNTS,
  BEAD_DECK_AGES,
  BEAD_ENDEAVOUR_IDS,
  BEAD_FEAT_IDS,
  BEAD_QUEST_IDS,
  BEAD_RECKONING_IDS,
  BEAD_RULES,
  beadDataProblems,
  beadDeckFor,
  type BeadAge,
  BEAD_FAMILIES,
  beadEndeavourDef,
  beadIsDormant,
  beadQuestDef,
  beadReckoningDef,
  reckoningsOfFamily,
  isBeadReckoningId,
} from '../../src/sim/beadData';
import {
  awardBead,
  awardBeadOccasion,
  awardOrderBeads,
  beadCount,
  beadHandIsShownTo,
  describeBeadBoon,
  endeavourError,
  endeavourPrerequisiteMet,
  runBeads,
  runWorldClock,
  takeReckonings,
} from '../../src/sim/beads';
import { currentWorldAge } from '../../src/sim/worldClock';
import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { ABILITY_TECH, TECH_IDS } from '../../src/sim/techData';
import { cardBeadOccasions, settleOrderSkip, stripRefs } from '../../src/sim/statecraft';
import { type Command, applyCommand } from '../../src/sim/commands';
import {
  advanceProduction,
  foundCityAt,
  settleProduction,
} from '../../src/sim/cities';
import { createGame, loadGame, replay, saveGame } from '../../src/sim/game';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { explainAuthority } from '../../src/sim/meters';
import { projectDef } from '../../src/sim/projectData';
import {
  type City,
  type GameConfig,
  type GameState,
  SCHEMA_VERSION,
  createUnit,
  newGame,
  bumpRevision,
} from '../../src/sim/state';
import { buildError, isUnlocked } from '../../src/sim/tech';
import { razeCityAt } from '../../src/sim/diplomacy';
import { END_OF_TURN_PHASES, runEndOfTurn } from '../../src/sim/turn';
import { resetVisibility } from '../../src/sim/visibility';
import { openEveryWar } from './warHelpers';

// --- the bench --------------------------------------------------------------

function config(over: Partial<GameConfig> = {}): GameConfig {
  return {
    seed: 7,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00', isHuman: true },
      { name: 'Bors', color: '#00a', isHuman: false },
    ],
    ...over,
  };
}

function flatState(width = 16, height = 12): GameState {
  const state = newGame(config());
  state.map = createMap({ width, height, terrain: 'grassland' });
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

function plant(state: GameState, ownerId: number, col: number, row: number): City {
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
  const tech = age === 3 ? 'mathematics' : 'theology';
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
 * Runs the world's clock and then the bead phase, in the order
 * `END_OF_TURN_PHASES` runs them — which is what every sweep test wants: a deed
 * swept on a board whose age has already settled this turn.
 */
function beat(state: GameState): void {
  runWorldClock(state);
  runBeads(state);
}

/** Forces a card onto the table face up, for a test about what it then does. */
function table(state: GameState, id: string, age: BeadAge = 3): void {
  const key = String(age);
  state.beads.decks[key] = (state.beads.decks[key] ?? []).filter((one) => one !== id);
  state.beads.hands[key] = [{ id: id as never, faceUp: true }];
}

// --- 1. the catalogue -------------------------------------------------------

describe('the bead catalogue', () => {
  it('is consistent', () => {
    expect(beadDataProblems()).toEqual([]);
  });

  it('holds four classes of row, each with a family', () => {
    expect(BEAD_FEAT_IDS.length).toBeGreaterThan(0);
    expect(BEAD_ENDEAVOUR_IDS.length).toBeGreaterThan(0);
    expect(BEAD_QUEST_IDS.length).toBeGreaterThan(0);
    expect(BEAD_RECKONING_IDS.length).toBeGreaterThan(0);
  });

  it('names only counts the evaluator answers', () => {
    // The register test: a count declared and never read, or read and never
    // declared, is the drift this vocabulary exists to prevent.
    const state = flatState();
    for (const count of BEAD_COUNTS) {
      expect(typeof beadCount(state, 0, count), count).toBe('number');
    }
  });

  it('pins the schema version the Bead Race moved', () => {
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
    expect(SCHEMA_VERSION).toBe(102);
  });

  it('puts the beads phase directly after the world clock, itself after renown', () => {
    // Re-aimed by batch G1: the clock was beat one of this phase and is now a
    // phase of its own in the same seat, so the deed tables are still swept on
    // a board whose age has just settled. See `runWorldClock`.
    const names = END_OF_TURN_PHASES.map((phase) => phase.name);
    expect(names.indexOf('worldClock')).toBe(names.indexOf('renown') + 1);
    // Batch G2 put the `wagers` phase between them: a claim mints beads and the
    // deed sweep below reads the rod they land on.
    expect(names.indexOf('wagers')).toBe(names.indexOf('worldClock') + 1);
    expect(names.indexOf('beads')).toBe(names.indexOf('wagers') + 1);
  });
});

// --- 2. the deal ------------------------------------------------------------

describe('the deal', () => {
  it('is a function of the seed alone', () => {
    const a = newGame(config({ seed: 12 }));
    const b = newGame(config({ seed: 12 }));
    const c = newGame(config({ seed: 13 }));
    expect(a.beads.decks).toEqual(b.beads.decks);
    expect(a.beads.decks).not.toEqual(c.beads.decks);
  });

  it('never puts a dormant card in a deck', () => {
    for (const age of BEAD_DECK_AGES) {
      for (const id of beadDeckFor(age)) expect(beadIsDormant(id), id).toBe(false);
    }
    // **The endeavours woke on 2026-08-30.** The Cathedral of the Age, The Mint
    // and The Muster of the Realm each named a building no technology opened,
    // so all three were dormant *derived* rather than flagged; the tree pass
    // gave the cathedral to Theology, the mint to Paper Money and the armoury to
    // Steel, and the derivation now answers `false` for every one of them with
    // nothing here or in `beadData.ts` having changed. That is the whole point
    // of deriving dormancy — `BuildingDef.awaitsTech` was deleted from three
    // rows and three cards came back to life.
    for (const id of ['cathedral', 'mint', 'armoury'] as const) {
      expect(buildingDef(id).awaitsTech, id).toBeUndefined();
    }
    for (const id of ['theCathedralOfTheAge', 'theMint', 'theMusterOfTheRealm'] as const) {
      expect(beadIsDormant(id), id).toBe(false);
    }
  });

  it('deals one card a turn, face down until the age opens', () => {
    const state = newGame(config());
    expect(state.beads.hands['3']).toEqual([]);
    state.turn += 1;
    beat(state);
    expect(state.beads.hands['3']).toHaveLength(1);
    expect(state.beads.hands['3']?.[0]?.faceUp).toBe(false);
    state.turn += 1;
    beat(state);
    expect(state.beads.hands['3']).toHaveLength(2);
  });

  it('stops at the hand size and moves to the next age', () => {
    const state = newGame(config());
    const size = BEAD_RULES.handSize['3']!;
    for (let turn = 0; turn < size + 3; turn++) {
      state.turn += 1;
      beat(state);
    }
    expect(state.beads.hands['3']).toHaveLength(size);
    expect((state.beads.hands['4'] ?? []).length).toBeGreaterThan(0);
  });

  it('frees a slot when a card is claimed and deals into it', () => {
    // **A hand is a set of open slots, not a one-time deal.** The failure this
    // pins is a table four cards wide that never moves: a twenty-five card deck
    // showing four of its rows in a whole game.
    const state = flatState();
    plant(state, 0, 4, 4);
    worldIn(state, 3);
    const size = BEAD_RULES.handSize['3']!;
    const deck = state.beads.decks['3']!;
    state.beads.decks['3'] = deck.filter((id) => id !== 'theFounder');
    state.beads.hands['3'] = [
      { id: 'theFounder', faceUp: true },
      ...state.beads.decks['3'].splice(0, size - 1).map((id) => ({ id, faceUp: true })),
    ];
    expect(state.beads.hands['3']).toHaveLength(size);
    const deckBefore = state.beads.decks['3'].length;

    state.players[0]!.citiesFounded = 8;
    beat(state); // the sweep claims it, and it is still holding its slot
    expect(state.players[0]!.beads.map((bead) => bead.id)).toContain('theFounder');
    beat(state); // the broom takes it off, and the deck deals into the slot

    const hand = state.beads.hands['3']!;
    expect(hand.map((card) => card.id)).not.toContain('theFounder');
    expect(hand).toHaveLength(size);
    expect(state.beads.decks['3']!.length).toBe(deckBefore - 1);
  });

  it('lets a whole deck flow through the hand over an age', () => {
    // The bound is the **deck**, not the hand: with every card claimed as it
    // lands, a twenty-five card deck empties rather than stopping at four.
    const state = flatState();
    plant(state, 0, 4, 4);
    worldIn(state, 3);
    const dealt = new Set<string>();
    for (let turn = 0; turn < 120; turn++) {
      state.turn += 1;
      beat(state);
      for (const card of state.beads.hands['3'] ?? []) {
        dealt.add(card.id);
        // Claimed outright, whatever it is — the point here is the flow, not the
        // deed. Written under every key a card can be claimed at (a quest at 0,
        // an endeavour and a reckoning at their age), because `cardIsSpent` asks
        // the pair rather than the bare id.
        for (const age of [0, 2, 3]) {
          state.beads.claimed.push({ id: card.id, age, playerId: 0, turn: state.turn });
        }
      }
    }
    expect(state.beads.decks['3']).toHaveLength(0);
    expect(dealt.size).toBeGreaterThan(BEAD_RULES.handSize['3']! * 2);
  });

  it('replays byte for byte with awards in the log', () => {
    const game = createGame(config({ seed: 31 }));
    const endTurn = (playerId: number): Command => ({ type: 'endTurn', playerId });
    for (let turn = 0; turn < 12; turn++) {
      for (const player of game.state.players) {
        if (player.barbarian) continue;
        applyCommand(game.state, endTurn(player.id));
        game.log.push(endTurn(player.id));
      }
    }
    expect(game.state.beads.hands['3']!.length).toBeGreaterThan(0);
    expect(JSON.stringify(replay(game.config, game.log))).toBe(JSON.stringify(game.state));
    const json = saveGame(game);
    expect(JSON.stringify(loadGame(json).state)).toBe(JSON.stringify(game.state));
  });
});

// --- 3. the world's clock ---------------------------------------------------

/**
 * **Re-aimed by batch G1.** These two used to read "an age opens the turn the
 * *first* seat reaches it" off `state.beads.worldAge`. The rule is the mean now
 * and the field is gone (`docs/wager.md` §1, `worldClock.ts`): what the tables
 * still owe is that *when the world's age turns over*, the hand turns face up
 * and the per-age counters reset — which is the claim these always made, asked
 * of the new clock. The clock's own arithmetic is `worldClock.test.ts`'s.
 */
describe("the world's clock", () => {
  it('turns a hand over when the world enters its age', () => {
    const state = newGame(config());
    for (let turn = 0; turn < 3; turn++) {
      state.turn += 1;
      beat(state);
    }
    expect(currentWorldAge(state)).toBe(1);
    expect(state.beads.hands['3']!.every((card) => !card.faceUp)).toBe(true);

    // One seat alone no longer moves the world: the mean of a seat in Æra III
    // and a seat in Æra I is Æra II, and Æra III's hand stays face down.
    reachAge(state, 1, 3);
    state.turn += 1;
    beat(state);
    expect(state.beads.hands['3']!.every((card) => !card.faceUp)).toBe(true);

    // Æra II's close falling on the next turn is what turns them: the hand
    // opens *at* the close, which is the one moment the world changes age.
    state.ageClose = { age: 2, turn: state.turn + 1 };
    state.turn += 1;
    beat(state);
    expect(currentWorldAge(state)).toBe(3);
    expect(state.beads.hands['3']!.every((card) => card.faceUp)).toBe(true);
  });

  it('resets the per-age counters at every opening', () => {
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

// --- 3b. reckonings, retired -----------------------------------------------

describe('a reckoning', () => {
  it('is retired: every row carries the mark and leaves every pool', () => {
    // Batch G2 (`docs/wager.md` §5): the wager is the age's snapshot now, taken
    // for everybody rather than paying the leader alone. The eight rows keep
    // their bodies for saves and for the Compendium's record; `retired: true` is
    // read by the one predicate every seam already asks.
    for (const id of BEAD_RECKONING_IDS) {
      expect(beadReckoningDef(id).retired, id).toBe(true);
      expect(beadIsDormant(id), id).toBe(true);
    }
    for (const family of BEAD_FAMILIES) {
      expect(reckoningsOfFamily(family), family).toEqual([]);
    }
  });

  it('is never dealt into any age’s deck', () => {
    const state = newGame(config({ seed: 55 }));
    for (const age of BEAD_DECK_AGES) {
      const drawn = (state.beads.decks[String(age)] ?? []).filter((id) => isBeadReckoningId(id));
      expect(drawn, `age ${age}`).toEqual([]);
    }
  });

  it('measures nobody, even with its card put on the table by hand', () => {
    // A retired row is refused a rung above the measuring, in `awardBead`, so
    // the rule is not deleted with the piece: the arm stays, unreachable, and a
    // hand-edited save cannot pay one out either.
    const state = flatState();
    plant(state, 0, 4, 4);
    plant(state, 0, 6, 8);
    plant(state, 1, 9, 4);
    worldIn(state, 3);
    state.beads.hands['3'] = [{ id: 'theMostCities', faceUp: true }];
    expect(takeReckonings(state, 3)).toHaveLength(0);
    expect(state.players[0]!.beads).toHaveLength(0);
  });

  it('is never taken for an age that has no deck', () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    plant(state, 0, 6, 8);
    reachAge(state, 0, 3);
    state.turn += 1;
    beat(state);
    // Æra I closed, and Æra I holds no cards — so it closed with no reckoning.
    expect(state.beads.claimed).toHaveLength(0);
  });
});

// --- 4. deeds ---------------------------------------------------------------

describe('a count quest', () => {
  it('goes to the first seat, once', () => {
    const state = flatState();
    reachAge(state, 0, 3);
    table(state, 'theFounder');
    worldIn(state, 3);
    state.players[1]!.citiesFounded = 8;
    state.players[0]!.citiesFounded = 8;
    plant(state, 0, 4, 4);
    plant(state, 1, 9, 4);

    beat(state);
    // Seat order breaks the tie, like every other contention in the game.
    expect(state.players[0]!.beads.map((bead) => bead.id)).toContain('theFounder');
    expect(state.players[1]!.beads.map((bead) => bead.id)).not.toContain('theFounder');
    const held = state.players[0]!.beads.length;
    beat(state);
    expect(state.players[0]!.beads.length).toBe(held);
  });

  it('is not claimable while its card is off the table', () => {
    const state = flatState();
    worldIn(state, 3);
    state.beads.hands['3'] = [];
    state.players[0]!.citiesFounded = 8;
    beat(state);
    expect(state.players[0]!.beads.map((bead) => bead.id)).not.toContain('theFounder');
  });
});

describe('a streak quest', () => {
  it('needs the whole run, and starts again on a miss', () => {
    const state = flatState();
    worldIn(state, 3);
    table(state, 'theStandingArmy', 3);
    const def = beadQuestDef('theStandingArmy');
    expect(def.deed.shape).toBe('streak');
    const turns = def.deed.shape === 'streak' ? def.deed.turns : 0;

    const army: number[] = [];
    for (let i = 0; i < 20; i++) army.push(createUnit(state, 0, 'warrior', i % 12, 1 + (i % 8)).id);
    expect(beadCount(state, 0, 'combatUnits')).toBeGreaterThanOrEqual(20);

    for (let i = 0; i < turns - 1; i++) beat(state);
    expect(state.players[0]!.beads).toHaveLength(0);

    // A miss resets the run to nothing.
    state.units = state.units.filter((unit) => unit.id !== army[0]);
    beat(state);
    expect(state.players[0]!.beads).toHaveLength(0);

    createUnit(state, 0, 'warrior', 13, 9);
    for (let i = 0; i < turns; i++) beat(state);
    expect(state.players[0]!.beads.map((bead) => bead.id)).toContain('theStandingArmy');
  });
});

describe('an occasion', () => {
  it('is announced at the seam a founding already calls', () => {
    const state = flatState();
    expect(state.players[0]!.citiesFounded).toBe(0);
    plant(state, 0, 4, 4);
    expect(state.players[0]!.citiesFounded).toBe(1);
  });

  it('counts a capture and clacks the palace bead', () => {
    const state = flatState();
    const seat = plant(state, 1, 9, 4);
    const raider = createUnit(state, 0, 'swordsman', 8, 4);
    seat.hp = 1;
    const result = applyCommand(state, {
      type: 'attack',
      playerId: 0,
      unitId: raider.id,
      target: { col: seat.col, row: seat.row },
    });
    expect(result.ok).toBe(true);
    expect(state.players[0]!.citiesCaptured).toBe(1);
    expect(state.players[0]!.beads.map((bead) => bead.id)).toContain('theFallenPalace');
    // And it reaches the caller: `CommandResult.beads` is the diff of the seat's
    // own append-only list, taken in `applyCommand`.
    expect(result.ok && result.beads?.some((award) => award.id === 'theFallenPalace')).toBe(true);
  });

  it('goes to the first seat in the world and nobody else', () => {
    const state = flatState();
    expect(awardBeadOccasion(state, 0, 'religionFounded')).toHaveLength(1);
    expect(awardBeadOccasion(state, 1, 'religionFounded')).toHaveLength(0);
  });
});

// --- 5. endeavours ----------------------------------------------------------

describe('a race project', () => {
  it('is offered only while face up, unclaimed and within reach', () => {
    const state = flatState();
    const city = plant(state, 0, 4, 4);

    // Off the table: refused, and not in the build list at all.
    expect(isUnlocked(state, 0, 'project', 'theGrandSatrapy')).toBe(false);
    expect(buildError(state, 0, 'project', 'theGrandSatrapy')).toMatch(/not on the table/);

    worldIn(state, 3);
    table(state, 'theGrandSatrapy');
    // On the table but out of reach: the sentence names what is missing.
    expect(buildError(state, 0, 'project', 'theGrandSatrapy')).toMatch(/wants 10 cities/);
    expect(isUnlocked(state, 0, 'project', 'theGrandSatrapy')).toBe(false);

    for (let i = 1; i < 10; i++) plant(state, 0, i, 8);
    expect(buildError(state, 0, 'project', 'theGrandSatrapy')).toBeNull();
    expect(isUnlocked(state, 0, 'project', 'theGrandSatrapy')).toBe(true);
    expect(city.ownerId).toBe(0);
  });

  it('is claimed by the first finisher, with the bead and the boon', () => {
    const state = flatState();
    worldIn(state, 3);
    table(state, 'theGrandSatrapy');
    const cities: City[] = [];
    for (let i = 0; i < 10; i++) cities.push(plant(state, 0, i, 4));
    const city = cities[0]!;
    city.queue = [{ kind: 'project', id: 'theGrandSatrapy' }];
    city.hammerBasket = projectDef('theGrandSatrapy').cost;

    const done = settleProduction(state, city);
    bumpRevision(state);
    expect(done?.name).toBe('The Grand Satrapy');
    // A race project **finishes**: it leaves the queue, unlike a conversion.
    expect(city.queue).toEqual([]);
    expect(state.players[0]!.beads.map((bead) => bead.id)).toContain('theGrandSatrapy');
    // The cap is read off the record by `liveEffects`' ninth source, so it is
    // already in the authority ledger.
    const authority = explainAuthority(state, 0);
    expect(authority.some((line) => line.source.includes('The Grand Satrapy'))).toBe(true);
  });

  it('pays the second finisher nothing at all', () => {
    const state = flatState();
    worldIn(state, 3);
    table(state, 'theGrandSatrapy');
    for (let i = 0; i < 10; i++) plant(state, 0, i, 4);
    for (let i = 0; i < 10; i++) plant(state, 1, i, 9);
    const first = state.cities[0]!;
    const second = state.cities[10]!;
    const cost = projectDef('theGrandSatrapy').cost;

    first.queue = [{ kind: 'project', id: 'theGrandSatrapy' }];
    first.hammerBasket = cost;
    settleProduction(state, first);

    second.queue = [{ kind: 'project', id: 'theGrandSatrapy' }];
    second.hammerBasket = cost;
    settleProduction(state, second);
    // The hammers are spent and the row is gone; the bead is not.
    expect(second.hammerBasket).toBe(0);
    expect(state.players[1]!.beads).toHaveLength(0);
    // And it has left every other build list in the world.
    expect(buildError(state, 1, 'project', 'theGrandSatrapy')).toMatch(/finished first/);
  });
});

// --- 6. the boons -----------------------------------------------------------

describe('a boon settles through the seam that already exists', () => {
  it('banks a windfall in the bank it names', () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    worldIn(state, 3);
    table(state, 'theTithe');
    state.players[0]!.tithesGold = 600;
    const before = state.players[0]!.gold;
    beat(state);
    expect(state.players[0]!.gold).toBe(before + 200);
  });

  it('grants a piece through the free-unit path', () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    worldIn(state, 3);
    table(state, 'theFounder');
    state.players[0]!.citiesFounded = 8;
    beat(state);
    const settler = state.units.find((unit) => unit.type === 'settler' && unit.ownerId === 0);
    expect(settler).toBeDefined();
    // A gift is a gift: it costs its empire nothing to keep.
    expect(settler?.freeUpkeep).toBe(true);
  });

  /**
   * Re-aimed 2026-09-06 (schema 71, `docs/history/fewer-things.md` §1): the dice of the
   * Magister are gone — `Player.dice`, `BeadRules.startingDice` and the eight
   * boons that paid one. The two tests that stood here pinned the starting dice
   * and the absence of a cap on them; what is left to pin is that the seven
   * quests which paid *only* a die now pay nothing at all and **say so on their
   * face**, which is this codebase's standing answer for a card promising
   * something the vocabulary cannot yet pay.
   */
  it('leaves a quest whose only boon was a die paying nothing, and annotated', () => {
    for (const id of ['threeOfTheAge', 'theScholarsWager', 'thePatron', 'theBuilder'] as const) {
      const def = beadQuestDef(id);
      expect(describeBeadBoon(def.boon)).toEqual([]);
      expect(def.deferred?.length ?? 0).toBeGreaterThan(0);
    }
    // And the lint agrees: an empty boon is a data mistake unless the row owns
    // up to it.
    expect(beadDataProblems()).toEqual([]);
  });

  it('raises a cap that every ledger then reads', () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    const before = explainAuthority(state, 0);
    awardBead(state, 0, 'theConqueror', 0);
    bumpRevision(state);
    const after = explainAuthority(state, 0);
    const sum = (lines: readonly { value: number }[]): number =>
      lines.reduce((total, line) => total + line.value, 0);
    expect(sum(after)).toBe(sum(before) + 4);
  });
});

// --- 7. awaitsTech and the threshold ---------------------------------------

describe('a building shipped ahead of its age', () => {
  /**
   * **One row is in that state, and it is the register.** The cathedral, the
   * mint and the armoury were the three the tree pass of 2026-08-30 gave nodes
   * to; the re-cut of 2026-09-02 put the **Hall of Deeds** back into it from the
   * other end — the node that unlocked it is gone and the row is kept so a save
   * that raised one replays. The marker means the same thing either way ("no
   * technology opens this"), and the refusal is the same refusal.
   */
  it('names every row no technology opens', () => {
    const dormant = BUILDING_IDS.filter((id) => buildingDef(id).awaitsTech === true);
    // The Bastion joined the Hall of Deeds on 2026-09-02: tree revision 4 cut
    // Fortification, the node that opened it, and the user's ruling was to keep
    // the row as an Æra V candidate rather than re-home it. Same shape as the
    // Hall's — no node names it, and `buildError` and `purchaseError` refuse it
    // outright, which is what stops "no tech gates it" reading as "available on
    // turn one".
    expect(dormant).toEqual(['hallOfDeeds', 'bastion']);
  });

  it('is still refused by both the queue and the treasury when a row asks for it', () => {
    const state = flatState();
    const city = plant(state, 0, 4, 4);
    // The unlock tech is checked first, so the seat has to be able to build the
    // row before the dormancy refusal is the one that answers.
    state.players[0]!.techsResearched = [...TECH_IDS];
    bumpRevision(state);
    const def = buildingDef('observatory') as { awaitsTech?: boolean };
    def.awaitsTech = true;
    try {
      expect(buildError(state, 0, 'building', 'observatory', city)).toMatch(
        /waits on a technology/,
      );
      const player = state.players[0]!;
      player.gold = 100000;
      const refused = applyCommand(state, {
        type: 'purchaseItem',
        playerId: 0,
        cityId: city.id,
        item: { kind: 'building', id: 'observatory' },
        currency: 'gold',
      });
      expect(refused.ok).toBe(false);
    } finally {
      delete def.awaitsTech;
    }
  });
});

describe('the threshold', () => {
  /** Puts `count` beads on a seat's rod. Any row will do; the tally is the fact. */
  const clack = (state: GameState, playerId: number, count: number): void => {
    const player = state.players[playerId]!;
    for (let i = 0; i < count; i++) {
      player.beads.push({ id: 'theFounder', kind: 'quest', family: 'economic', turn: 1 });
      bumpRevision(state);
    }
  };

  /**
   * The row that ends the game, read off the marker exactly as the rule does —
   * so a second capstone joins this test without being named in it.
   */
  const opus = BUILDING_IDS.find((id) => buildingDef(id).endsTheGame === true)!;

  it('opens the Magnum Opus, and nothing below it', () => {
    // Ruled 2026-09-04 (schema 64): the threshold used to name a winner in the
    // `beads` phase — a reading that never once fired, because the Opus always
    // closed the age first — and now it opens the Opus instead.
    const state = flatState();
    const city = plant(state, 0, 4, 4);
    // Everything else the row asks for: the world's technology, and the town.
    for (const player of state.players) player.techsResearched = [...TECH_IDS];
    bumpRevision(state);

    clack(state, 0, BEAD_RULES.threshold - 1);
    expect(buildError(state, 0, 'building', opus, city)).toBe(
      `The Magnum Opus asks for ${BEAD_RULES.threshold} beads; ${state.players[0]!.name} holds ${
        BEAD_RULES.threshold - 1
      }`,
    );

    clack(state, 0, 1);
    expect(buildError(state, 0, 'building', opus, city)).toBeNull();
  });

  it('no longer names a winner in the phase', () => {
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
describe('the age opening', () => {
  it('rides out on the report and on the command result', () => {
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

  it('reaches the caller through endTurn', () => {
    const game = createGame(config({ seed: 3 }));
    game.state.ageClose = { age: 2, turn: game.state.turn };
    let opened: number | undefined;
    for (const player of game.state.players) {
      if (player.barbarian) continue;
      const result = applyCommand(game.state, { type: 'endTurn', playerId: player.id });
      if (result.ok && result.beadAgeOpened !== undefined) opened = result.beadAgeOpened;
    }
    expect(opened).toBe(3);
  });
});

describe('every award reaches the caller', () => {
  it('rides out on the turn report and on the command result', () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    worldIn(state, 3);
    table(state, 'theTithe');
    state.players[0]!.tithesGold = 600;
    const report = runEndOfTurn(state);
    const award = report.beads.find((one) => one.id === 'theTithe');
    expect(award).toBeDefined();
    expect(award?.playerId).toBe(0);
    // The boon lines survive: they exist only at the moment of settlement.
    expect(award?.boon.length).toBeGreaterThan(0);
  });
});

// --- 8b. the describer ------------------------------------------------------

describe('describeBeadBoon', () => {
  // Re-aimed 2026-09-06 (schema 71): the die clause is gone with the dice, so
  // the order the settlement pays in is windfall, grant, caps.
  it('says a windfall, a grant and a cap in that order', () => {
    expect(
      describeBeadBoon({ windfall: { yield: 'science', amount: 200, where: 'capital' } }).map(
        (c) => c.text,
      ),
    ).toEqual(['a one-time windfall of 200 science']);
    // `where` is printed only where the settlement reads it: beakers land in an
    // empire's bank whatever the row says, hammers land in a town.
    expect(
      describeBeadBoon({ windfall: { yield: 'production', amount: 200, where: 'capital' } }).map(
        (c) => c.text,
      ),
    ).toEqual(['a one-time windfall of 200 production in the capital']);
    expect(
      describeBeadBoon({ windfall: { yield: 'population', amount: 1, where: 'every' } }).map(
        (c) => c.text,
      ),
    ).toEqual(['a citizen in every city']);
    expect(describeBeadBoon({ grant: { settler: true } }).map((c) => stripRefs(c.text))).toEqual([
      'a free settler at the capital',
    ]);
    expect(describeBeadBoon({ grant: { prophet: true } }).map((c) => stripRefs(c.text))).toEqual([
      'a free prophet at the capital',
    ]);
    expect(describeBeadBoon({ grant: { greatPerson: 'choice' } }).map((c) => c.text)).toEqual([
      'a great person of your choosing',
    ]);
    expect(
      describeBeadBoon({ effects: [{ kind: 'authority', amount: 2 }] }).map((c) => c.text),
    ).toEqual(['a lasting step: +2 authority capacity']);

    // Several at once, in the settlement's own order.
    expect(
      describeBeadBoon({
        windfall: { yield: 'science', amount: 200, where: 'capital' },
        effects: [{ kind: 'happiness', amount: 2 }],
      }).map((c) => c.text),
    ).toEqual(['a one-time windfall of 200 science', 'a lasting step: +2 happiness']);
  });

  it('names a granted unit as a keyword ref', () => {
    // CLAUDE.md's rule: a describer that names a thing marks it, so the word is
    // a link wherever a click can land.
    expect(describeBeadBoon({ grant: { settler: true } })[0]!.text).toContain('[[unit:settler|');
  });

  it('prints exactly the words the award prints', () => {
    // The whole reason the describer exists beside the settlement: an offer card
    // that promised different words from the toast would be two vocabularies.
    const state = flatState();
    plant(state, 0, 4, 4);
    worldIn(state, 3);
    table(state, 'theTithe');
    state.players[0]!.tithesGold = 600;
    const report = runEndOfTurn(state);
    const award = report.beads.find((one) => one.id === 'theTithe')!;
    expect(award.boon).toEqual(
      describeBeadBoon(beadQuestDef('theTithe').boon).map((clause) => stripRefs(clause.text)),
    );
  });

  // Re-aimed 2026-09-06 (schema 71): seven quests paid a die of the Magister and
  // nothing else, and the dice are gone. Those rows say nothing in the boon
  // vocabulary now and say it in a `deferred` line instead — which is what the
  // lint requires of them (`beadDataProblems`) and what this reads.
  it('says every row in the catalogue, or owns up to paying nothing', () => {
    const speaks = (id: string, boon: Parameters<typeof describeBeadBoon>[0], deferred?: string[]): void => {
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

// --- 8c. the prerequisite, asked on its own ---------------------------------

describe('endeavourPrerequisiteMet', () => {
  it('is the reachability question, separate from the claim', () => {
    const state = flatState();
    worldIn(state, 3);
    table(state, 'theGrandSatrapy');
    for (let i = 0; i < 9; i++) plant(state, 0, i, 4);
    expect(endeavourPrerequisiteMet(state, 0, 'theGrandSatrapy')).toBe(false);
    plant(state, 0, 9, 4);
    expect(endeavourPrerequisiteMet(state, 0, 'theGrandSatrapy')).toBe(true);

    // Still met once somebody else has won it — which is exactly the fact
    // `endeavourError` cannot report, because it answers a refusal instead.
    state.beads.claimed.push({ id: 'theGrandSatrapy', age: 3, playerId: 1, turn: 1 });
    expect(endeavourPrerequisiteMet(state, 0, 'theGrandSatrapy')).toBe(true);
    expect(endeavourError(state, 0, 'theGrandSatrapy')).toMatch(/finished first/);
  });
});

// --- 9. the endeavour rows --------------------------------------------------

describe('the endeavour rows', () => {
  it('are project rows the queue already knows how to price', () => {
    for (const id of BEAD_ENDEAVOUR_IDS) {
      const def = projectDef(id);
      expect(def.finishes, id).toBe(true);
      expect(def.cost, id).toBe(beadEndeavourDef(id).cost);
      expect(def.bead?.family, id).toBe(beadEndeavourDef(id).family);
    }
  });

  it('names a prerequisite the evaluator can answer', () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    for (const id of BEAD_ENDEAVOUR_IDS) {
      // Every row answers a sentence rather than throwing, dormant or not.
      expect(typeof endeavourError(state, 0, id), id).toBe('string');
    }
  });
});

// Kept honest: `advanceProduction` is the phase that reaches `settleProduction`,
// and a race project must survive the sweep like any other row.
describe('the production phase', () => {
  it('finishes a race project inside the ordinary sweep', () => {
    const state = flatState();
    worldIn(state, 3);
    table(state, 'theGrandSatrapy');
    for (let i = 0; i < 10; i++) plant(state, 0, i, 4);
    const city = state.cities[0]!;
    city.queue = [{ kind: 'project', id: 'theGrandSatrapy' }];
    city.hammerBasket = projectDef('theGrandSatrapy').cost;
    advanceProduction(state);
    expect(state.players[0]!.beads.map((bead) => bead.id)).toContain('theGrandSatrapy');
  });
});

// --- 10. The Long Count -----------------------------------------------------

describe('The Long Count', () => {
  /** Puts the long count in a seat's hand, through the ability register. */
  function count(state: GameState, playerId: number): void {
    const gate = ABILITY_TECH.get('theLongCount');
    if (gate === undefined) throw new Error('no technology hands over the long count');
    const player = state.players[playerId]!;
    if (!player.techsResearched.includes(gate)) player.techsResearched.push(gate);
    bumpRevision(state);
  }

  it('shows the next age’s hand a turn early, and never turns a card over', () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    worldIn(state, 3);

    // Without it, the age ahead is shut.
    expect(beadHandIsShownTo(state, 0, 3)).toBe(true);
    expect(beadHandIsShownTo(state, 0, 4)).toBe(false);
    count(state, 0);
    expect(beadHandIsShownTo(state, 0, 4)).toBe(true);
    // Exactly one age ahead: a realm that reaches it early is not handed the
    // whole book.
    expect(beadHandIsShownTo(state, 0, 5)).toBe(false);

    // **Sight, never a claim.** `faceUp` is the world's fact and is what makes a
    // quest claimable, so the seat that can see the next hand still cannot race
    // for it — and the seat that has not researched it sees exactly what it saw
    // before, which is what makes this a per-seat reading and not a write.
    state.beads.hands['4'] = [{ id: 'theMetropolis', faceUp: false }];
    expect(state.beads.hands['4']!.every((card) => !card.faceUp)).toBe(true);
    expect(beadHandIsShownTo(state, 1, 4)).toBe(false);
  });
});

// --- 10. the bead Orders ----------------------------------------------------

/**
 * **A glass bead of your own, on a deed you choose to do** — the four Æra V
 * Orders, built as batch H3 (`docs/audit/orchestrator.md`). Until this batch
 * they carried `effects: []`, were dealt like any other rare card and paid
 * nothing at all.
 *
 * The division of labour is what these tests are really pinning. A seam says
 * the name of the deed and knows nothing else; `statecraft.ts` answers which
 * rows a live card mints and is the only module that reads the shape;
 * `awardBead` is still the only writer of `Player.beads`. So the rod, the
 * register and the announcement are unchanged, and what a card added is one
 * more caller.
 */
describe('the bead Orders', () => {
  /** Slots a card, as a draft and a chair would have. Scaffolding only. */
  function slotOrder(state: GameState, playerId: number, id: string): void {
    const sc = state.players[playerId]!.statecraft;
    if (!sc.orders.includes(id as never)) sc.orders.push(id as never);
    sc.slots.push({ card: id as never, sealedUntil: state.turn });
    bumpRevision(state);
  }

  it('mints nothing for an empire holding none of them', () => {
    const state = flatState();
    expect(cardBeadOccasions(state, 0, 'cityRazed')).toEqual([]);
    expect(awardOrderBeads(state, 0, 'cityRazed')).toEqual([]);
    expect(state.players[0]!.beads).toEqual([]);
  });

  it('pays The Salted Earth at the raze, and pays it again the next time', () => {
    const state = flatState();
    slotOrder(state, 0, 'theSaltedEarth');
    const first = plant(state, 0, 4, 4);
    const second = plant(state, 0, 8, 4);

    razeCityAt(state, first);
    expect(state.players[0]!.beads.map((bead) => bead.id)).toEqual(['theSownSalt']);
    // **The repeat is the whole point** (`BeadGrantDef.repeatable`): the deed is
    // one an empire chooses to do again, so the grant class's once-per-empire
    // key is the one thing these rows give up.
    razeCityAt(state, second);
    expect(state.players[0]!.beads.map((bead) => bead.id)).toEqual([
      'theSownSalt',
      'theSownSalt',
    ]);
    // And it is on the world's register both times, like every other bead.
    expect(state.beads.claimed.filter((claim) => claim.id === 'theSownSalt')).toHaveLength(2);
  });

  it('pays The Last Laurels at the pass, in the mechanism rather than the reducer', () => {
    const state = flatState();
    slotOrder(state, 0, 'theLastLaurels');
    const player = state.players[0]!;
    player.statecraft.pendingOrder = { options: [] } as never;

    const skip = settleOrderSkip(state, player);
    expect(skip).not.toBeNull();
    expect(player.beads.map((bead) => bead.id)).toEqual(['theWreathRefused']);
    // A pass that was not owed spends nothing and mints nothing.
    expect(settleOrderSkip(state, player)).toBeNull();
    expect(player.beads).toHaveLength(1);
  });

  it('pays The Final Proclamation for the act itself', () => {
    const state = flatState();
    slotOrder(state, 0, 'theFinalProclamation');
    expect(awardOrderBeads(state, 0, 'proclamationMade').map((award) => award.id)).toEqual([
      'theWordGoneOut',
    ]);
    // A different deed on the same rail pays nothing — the occasion is the key.
    expect(awardOrderBeads(state, 0, 'cityRazed')).toEqual([]);
  });

  /**
   * The rhythm, and the honest refusal beside it. The Great Enquiry pays on
   * every *second* node of the last age, so the card is asked against the tally
   * the seam keeps — and a seam that keeps none is told nothing rather than
   * being paid on the first, which would be the card paying twice what it says.
   */
  it('pays The Great Enquiry on every second node of the last age, and only then', () => {
    const state = flatState();
    slotOrder(state, 0, 'theGreatEnquiry');
    expect(cardBeadOccasions(state, 0, 'lastAgeTechnology', 1)).toEqual([]);
    expect(cardBeadOccasions(state, 0, 'lastAgeTechnology', 2)).toEqual(['theLastLearning']);
    expect(cardBeadOccasions(state, 0, 'lastAgeTechnology', 3)).toEqual([]);
    expect(cardBeadOccasions(state, 0, 'lastAgeTechnology', 4)).toEqual(['theLastLearning']);
    // No tally at all: nothing, rather than a bead on every node.
    expect(cardBeadOccasions(state, 0, 'lastAgeTechnology')).toEqual([]);
    expect(cardBeadOccasions(state, 0, 'lastAgeTechnology', 0)).toEqual([]);
  });

  it('reads the card only while it stands in a slot', () => {
    const state = flatState();
    slotOrder(state, 0, 'theSaltedEarth');
    expect(cardBeadOccasions(state, 0, 'cityRazed')).toEqual(['theSownSalt']);
    // Held but unslotted is the collection, not the law.
    state.players[0]!.statecraft.slots = [];
    bumpRevision(state);
    expect(cardBeadOccasions(state, 0, 'cityRazed')).toEqual([]);
  });

  it('mints nothing for the wild, which has no rod to put one on', () => {
    const state = flatState();
    const wild = state.players.find((player) => player.barbarian);
    if (wild) {
      wild.statecraft.slots.push({ card: 'theSaltedEarth' as never, sealedUntil: 0 });
      bumpRevision(state);
      expect(awardOrderBeads(state, wild.id, 'cityRazed')).toEqual([]);
      expect(wild.beads).toEqual([]);
    }
  });

  /**
   * The four seams, read at the source. Each is one line in the mechanism that
   * does the thing — never in the reducer — which is what makes a bot that
   * razes, passes, proclaims or finishes the chart earn what a player would.
   */
  it('hooks each deed at the one place it happens', () => {
    const sims = import.meta.glob(['../../src/sim/*.ts', '../../src/sim/*/*.ts'], {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;
    const read = (file: string): string =>
      sims[Object.keys(sims).find((path) => path.endsWith(`/${file}`))!]!;
    expect(read('tech.ts')).toContain(
      "awardOrderBeads(state, player.id, 'lastAgeTechnology', lastAgeTechCount(player))",
    );
    expect(read('statecraft/draft.ts')).toContain(
      "awardOrderBeads(state, player.id, 'draftPassed')",
    );
    expect(read('diplomacy.ts')).toContain("awardOrderBeads(state, report.ownerId, 'cityRazed')");
    expect(read('religion.ts')).toContain("awardOrderBeads(state, player.id, 'proclamationMade')");
    // And `awardBead` is still the only writer of the rod.
    const beads = read('beads.ts');
    expect(beads.match(/player\.beads\.push\(/g)).toHaveLength(1);
  });
});
