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
 * never dealt; and the threshold names a winner.
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
  isBeadReckoningId,
} from '../../src/sim/beadData';
import {
  awardBead,
  awardBeadOccasion,
  beadCount,
  beadHandIsShownTo,
  describeBeadBoon,
  endeavourError,
  endeavourPrerequisiteMet,
  runBeads,
  takeReckonings,
} from '../../src/sim/beads';
import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { ABILITY_TECH, TECH_IDS } from '../../src/sim/techData';
import { stripRefs } from '../../src/sim/statecraft';
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
} from '../../src/sim/state';
import { buildError, isUnlocked } from '../../src/sim/tech';
import { END_OF_TURN_PHASES, runEndOfTurn } from '../../src/sim/turn';
import { resetVisibility } from '../../src/sim/visibility';

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
}

/** Runs the bead phase alone, which is what every clock and sweep test wants. */
function beat(state: GameState): void {
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
    expect(SCHEMA_VERSION).toBe(51);
  });

  it('puts the beads phase directly after renown', () => {
    const names = END_OF_TURN_PHASES.map((phase) => phase.name);
    expect(names.indexOf('beads')).toBe(names.indexOf('renown') + 1);
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
    state.beads.worldAge = 3;
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
    state.beads.worldAge = 3;
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

describe("the world's clock", () => {
  it('opens an age on the first seat that reaches it, and turns the hand over', () => {
    const state = newGame(config());
    for (let turn = 0; turn < 3; turn++) {
      state.turn += 1;
      beat(state);
    }
    expect(state.beads.worldAge).toBe(1);
    expect(state.beads.hands['3']!.every((card) => !card.faceUp)).toBe(true);

    reachAge(state, 1, 3);
    state.turn += 1;
    beat(state);
    expect(state.beads.worldAge).toBe(3);
    expect(state.beads.hands['3']!.every((card) => card.faceUp)).toBe(true);
  });

  it('resets the per-age counters at every opening', () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    state.players[0]!.greatPeopleThisAge = 4;
    state.players[0]!.routeYieldsThisAge = 90;
    reachAge(state, 0, 3);
    state.turn += 1;
    beat(state);
    expect(state.beads.worldAge).toBe(3);
    expect(state.players[0]!.greatPeopleThisAge).toBe(0);
    expect(state.players[0]!.routeYieldsThisAge).toBe(0);
  });
});

// --- 3b. reckonings ---------------------------------------------------------

describe('a reckoning', () => {
  it('is four cards of the age deck, one per family, drawn from the pool', () => {
    const state = newGame(config({ seed: 55 }));
    for (const age of BEAD_DECK_AGES) {
      const drawn = (state.beads.decks[String(age)] ?? []).filter((id) => isBeadReckoningId(id));
      expect(drawn, `age ${age}`).toHaveLength(BEAD_FAMILIES.length);
      const families = drawn.map((id) => beadReckoningDef(id as never).family);
      expect(new Set(families).size, `age ${age}`).toBe(BEAD_FAMILIES.length);
    }
    // The pool, not a fixed set: a different seed measures different things.
    const other = newGame(config({ seed: 56 }));
    const pick = (one: GameState): string[] =>
      (one.beads.decks['3'] ?? []).filter((id) => isBeadReckoningId(id)).sort();
    expect(pick(state)).not.toEqual(pick(other));
    // And it is a function of the seed alone.
    expect(pick(newGame(config({ seed: 55 })))).toEqual(pick(state));
  });

  it('is taken at the next age opening, once, and pays nobody on a tie', () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    plant(state, 1, 9, 4);
    state.beads.worldAge = 3;
    state.beads.hands['3'] = [{ id: 'theMostCities', faceUp: true }];

    // Two seats, one city each: The Most Cities is a tie and pays nobody.
    expect(takeReckonings(state, 3)).toHaveLength(0);

    // Break the tie: now it is taken, once, and stamped with the closing age.
    plant(state, 0, 6, 8);
    const taken = takeReckonings(state, 3);
    expect(taken).toHaveLength(1);
    expect(taken[0]!.playerId).toBe(0);
    const claims = state.beads.claimed.filter((claim) => claim.id === 'theMostCities');
    expect(claims).toHaveLength(1);
    expect(claims[0]!.age).toBe(3);
    // And never twice.
    expect(takeReckonings(state, 3)).toHaveLength(0);
  });

  it('measures nobody while its card is still face down', () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    plant(state, 0, 6, 8);
    state.beads.worldAge = 3;
    state.beads.hands['3'] = [{ id: 'theMostCities', faceUp: false }];
    expect(takeReckonings(state, 3)).toHaveLength(0);
    // A card nobody was ever shown is a card the world never answered.
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
    state.beads.worldAge = 3;
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
    state.beads.worldAge = 3;
    state.beads.hands['3'] = [];
    state.players[0]!.citiesFounded = 8;
    beat(state);
    expect(state.players[0]!.beads.map((bead) => bead.id)).not.toContain('theFounder');
  });
});

describe('a streak quest', () => {
  it('needs the whole run, and starts again on a miss', () => {
    const state = flatState();
    state.beads.worldAge = 3;
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

    state.beads.worldAge = 3;
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
    state.beads.worldAge = 3;
    table(state, 'theGrandSatrapy');
    const cities: City[] = [];
    for (let i = 0; i < 10; i++) cities.push(plant(state, 0, i, 4));
    const city = cities[0]!;
    city.queue = [{ kind: 'project', id: 'theGrandSatrapy' }];
    city.hammerBasket = projectDef('theGrandSatrapy').cost;

    const done = settleProduction(state, city);
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
    state.beads.worldAge = 3;
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
    state.beads.worldAge = 3;
    table(state, 'theTithe');
    state.players[0]!.tithesGold = 600;
    const before = state.players[0]!.gold;
    beat(state);
    expect(state.players[0]!.gold).toBe(before + 200);
  });

  it('grants a piece through the free-unit path', () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    state.beads.worldAge = 3;
    table(state, 'theFounder');
    state.players[0]!.citiesFounded = 8;
    beat(state);
    const settler = state.units.find((unit) => unit.type === 'settler' && unit.ownerId === 0);
    expect(settler).toBeDefined();
    // A gift is a gift: it costs its empire nothing to keep.
    expect(settler?.freeUpkeep).toBe(true);
  });

  it('seats every real player with the rules\' starting dice, and the wild with none', () => {
    const state = flatState();
    for (const player of state.players) {
      expect(player.dice).toBe(player.barbarian ? 0 : BEAD_RULES.startingDice);
    }
    expect(BEAD_RULES.startingDice).toBe(2);
  });

  it('keeps every die it is paid — there is no cap', () => {
    // The user's ruling of 2026-08-30 supersedes Entry XV's held cap of three:
    // a fourth die is kept like the first three.
    const state = flatState();
    plant(state, 0, 4, 4);
    const player = state.players[0]!;
    // Zeroed so the claim is about the awards alone — a fresh seat starts with
    // the rules' two (pinned below), which would fog this count.
    player.dice = 0;
    for (const id of ['threeOfTheAge', 'theScholarsWager', 'thePatron', 'theBuilder'] as const) {
      state.beads.claimed = state.beads.claimed.filter((claim) => claim.id !== id);
      awardBead(state, 0, id, 0);
    }
    expect(player.dice).toBe(4);
  });

  it('raises a cap that every ledger then reads', () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    const before = explainAuthority(state, 0);
    awardBead(state, 0, 'theConqueror', 0);
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
  it('names a winner, and a game that has been won stays won', () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    const player = state.players[0]!;
    for (let i = 0; i < BEAD_RULES.threshold; i++) {
      player.beads.push({ id: 'theFounder', kind: 'quest', family: 'economic', turn: 1 });
    }
    expect(state.winnerId).toBeNull();
    beat(state);
    expect(state.winnerId).toBe(0);
    // A second seat past the line does not take it away.
    const rival = state.players[1]!;
    for (let i = 0; i < BEAD_RULES.threshold; i++) {
      rival.beads.push({ id: 'theFounder', kind: 'quest', family: 'economic', turn: 1 });
    }
    beat(state);
    expect(state.winnerId).toBe(0);
  });
});

// --- 8. the news ------------------------------------------------------------

describe('the age opening', () => {
  it('rides out on the report and on the command result', () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    // A quiet turn says nothing at all.
    expect(runEndOfTurn(state).beadAgeOpened).toBeUndefined();
    reachAge(state, 0, 3);
    expect(runEndOfTurn(state).beadAgeOpened).toBe(3);
    // And once only: the clock rose, and it does not rise again.
    expect(runEndOfTurn(state).beadAgeOpened).toBeUndefined();
  });

  it('reaches the caller through endTurn', () => {
    const game = createGame(config({ seed: 3 }));
    reachAge(game.state, 0, 3);
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
    state.beads.worldAge = 3;
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
  it('says a die, a windfall, a grant and a cap in that order', () => {
    expect(describeBeadBoon({ dice: 1 }).map((c) => c.text)).toEqual(['a die of the Magister']);
    expect(describeBeadBoon({ dice: 2 }).map((c) => c.text)).toEqual([
      '2 dice of the Magister',
    ]);
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
      describeBeadBoon({ dice: 1, effects: [{ kind: 'happiness', amount: 2 }] }).map((c) => c.text),
    ).toEqual(['a die of the Magister', 'a lasting step: +2 happiness']);
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
    state.beads.worldAge = 3;
    table(state, 'theTithe');
    state.players[0]!.tithesGold = 600;
    const report = runEndOfTurn(state);
    const award = report.beads.find((one) => one.id === 'theTithe')!;
    expect(award.boon).toEqual(
      describeBeadBoon(beadQuestDef('theTithe').boon).map((clause) => stripRefs(clause.text)),
    );
  });

  it('says every row in the catalogue, and never says nothing', () => {
    for (const id of BEAD_QUEST_IDS) {
      expect(describeBeadBoon(beadQuestDef(id).boon).length, id).toBeGreaterThan(0);
    }
    for (const id of BEAD_ENDEAVOUR_IDS) {
      expect(describeBeadBoon(beadEndeavourDef(id).boon).length, id).toBeGreaterThan(0);
    }
  });
});

// --- 8c. the prerequisite, asked on its own ---------------------------------

describe('endeavourPrerequisiteMet', () => {
  it('is the reachability question, separate from the claim', () => {
    const state = flatState();
    state.beads.worldAge = 3;
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
    state.beads.worldAge = 3;
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
  }

  it('shows the next age’s hand a turn early, and never turns a card over', () => {
    const state = flatState();
    plant(state, 0, 4, 4);
    state.beads.worldAge = 3;

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
