/**
 * **The three loops the end check of bot pass 3 found** (bot batch BP9, faults
 * 3 to 5; `docs/flags.md` (ooooooo), the bullet "BP9").
 *
 *   - **The prophet that walks between two hexes.** `holySiteStep` stepped a
 *     prophet to any neighbour whose ground would take a holy site, also when
 *     the prophet could raise nothing there. Each hex was the first legal
 *     neighbour of the other, so it walked back and forth for the rest of the
 *     game. The step now asks the question the next order will ask.
 *   - **The town whose focus switches every turn.** The focus arm prices its
 *     two placements at the seat's live prices, which move from turn to turn,
 *     and where the lean wins or loses by a few points the answer flipped. The
 *     user's guard: the bot does not undo its own focus order within
 *     `driver.focusHoldTurns` turns (`focusRoll.ts`).
 *   - **The settlers that pile up.** A settler row was priced at a step of the
 *     next town while settlers of the seat already slept for want of a site,
 *     and at a whole next town when no site was open at all. Now a settler is
 *     worth nothing in both cases (the user's guard, and the faith purchase's
 *     own reading of an empire with no site).
 */

import { describe, expect, it } from 'vitest';

import { botSitting, nextBotCommand, nextBotDecision } from '../../src/ai/bot';
import { settlerWaits } from '../../src/ai/chain';
import type { BotCandidate, ValueTerm } from '../../src/ai/decision';
import { adoptFocusRoll, lastFocusOrder, noteFocusOrder } from '../../src/ai/focusRoll';
import { readHarnessMemory } from '../../src/ai/harnessMemory';
import aiJson from '../../data/ai.json';
import { type Game, dispatch } from '../../src/sim/game';
import { improvementErrorAt } from '../../src/sim/improvements';
import { workForFamily } from '../../src/sim/improvementData';
import { type Tile, getTileAt, mapRange, tileHex } from '../../src/sim/map';
import { foundReligion, religionBeliefPool } from '../../src/sim/religion';
import { BELIEF_IDS } from '../../src/sim/religionData';
import { type City, type GameState, type Player, addBuilding, bumpRevision, createUnit, playerById } from '../../src/sim/state';
import { foundCityAt, foundingErrorAt } from '../../src/sim/cities';
import { findPath } from '../../src/sim/pathfind';
import { CONFIG } from './aiBotHelpers';
import { grownGames } from './grownGameHelpers';

/** The duel played forward once for the whole file (`grownGameHelpers.ts`). */
const grownGame = grownGames(CONFIG);

/** The improvement a prophet plants, off the table's inverse rather than a name. */
const HOLY_SITE = workForFamily('prophet')!;

function seat(state: GameState, playerId: number): Player {
  const player = playerById(state, playerId);
  if (!player) throw new Error(`no seat ${playerId}`);
  return player;
}

function firstCity(state: GameState, playerId: number): City {
  const city = state.cities.find((town) => town.ownerId === playerId);
  if (!city) throw new Error(`seat ${playerId} has no city`);
  return city;
}

/** The hexes of this town's the stones would be legal on, the simulation's own rule. */
function plantableGround(state: GameState, city: City): Tile[] {
  const centre = getTileAt(state.map, city.col, city.row)!;
  return mapRange(state.map, tileHex(centre), 2).filter(
    (tile) => improvementErrorAt(state, city.ownerId, tile, HOLY_SITE) === null,
  );
}

/** What one named piece would be told to do, with every other blocker cleared. */
function nextCommandFor(game: Game, playerId: number, unitId: number): { type: string; target?: { col: number; row: number } } | null {
  for (let step = 0; step < 60; step++) {
    const command = nextBotCommand(game.state, playerId);
    if (command === null) return null;
    if ('unitId' in command && command.unitId === unitId) return command as never;
    if (!dispatch(game, command).ok) return null;
  }
  return null;
}

/**
 * A seat 0 whose faith is founded and has no belief left to take, so a prophet
 * of it has exactly one act: a further holy site, in a town that has none.
 */
function foundedFaith(): { game: Game; city: City } {
  const game = grownGame(8);
  const player = seat(game.state, 0);
  player.pantheon.beliefs = [BELIEF_IDS[0] as never];
  const religion = foundReligion(game.state, player);
  religion.follower = religionBeliefPool(religion, 'follower').slice(0, 3);
  bumpRevision(game.state);
  return { game, city: firstCity(game.state, 0) };
}

describe('fault 3: the prophet step', () => {
  it('does not step a prophet that could raise nothing on the next hex', () => {
    const { game, city } = foundedFaith();
    // The town's site stands, so no hex of its ground wants another.
    const [standing, ground] = plantableGround(game.state, city);
    standing!.improvement = HOLY_SITE;
    const prophet = createUnit(game.state, 0, 'prophet', ground!.col, ground!.row);
    bumpRevision(game.state);
    // Before the batch this was a step to the first legal neighbour, and the
    // order after it a step back.
    const command = nextCommandFor(game, 0, prophet.id);
    expect(command?.type).not.toBe('moveUnit');
    expect(command?.type).not.toBe('plantHolySite');
  });

  it('still takes a bought prophet off the centre of a town that wants a site, and plants', () => {
    const { game, city } = foundedFaith();
    const prophet = createUnit(game.state, 0, 'prophet', city.col, city.row);
    bumpRevision(game.state);
    const step = nextCommandFor(game, 0, prophet.id);
    expect(step?.type).toBe('moveUnit');
    // The order lands, the prophet walks, and the next order raises the site.
    expect(dispatch(game, step as never).ok).toBe(true);
    const moved = game.state.units.find((unit) => unit.id === prophet.id)!;
    expect({ col: moved.col, row: moved.row }).toEqual(step!.target);
    expect(nextCommandFor(game, 0, prophet.id)?.type).toBe('plantHolySite');
  });
});

describe('fault 3, one arm over: the apostle\'s walk', () => {
  it('does not walk to a town that keeps a relic already, and back', () => {
    // The end check's loop, found again in BP9's own games: an apostle with a
    // charge left walked between two towns whose cathedrals each kept a relic.
    const { game, city: home } = foundedFaith();
    const apostle = createUnit(game.state, 0, 'apostle', home.col, home.row);
    // A second town of the seat's, on the first legal site the apostle can walk to.
    const centre = getTileAt(game.state.map, home.col, home.row)!;
    const site = mapRange(game.state.map, tileHex(centre), 8).find(
      (tile) => foundingErrorAt(game.state, 0, tile) === null && findPath(game.state, apostle, tile) !== null,
    );
    expect(site, 'a site for a second town').toBeDefined();
    const other = foundCityAt(game.state, 0, site!);
    for (const town of [home, other]) {
      addBuilding(game.state, town, 'cathedral' as never);
      addBuilding(game.state, town, 'relic' as never);
    }
    bumpRevision(game.state);
    expect(nextCommandFor(game, 0, apostle.id)?.type).not.toBe('moveUnit');
    // And a town that keeps none is still worth the walk.
    other.buildings = other.buildings.filter((id) => id !== 'relic');
    bumpRevision(game.state);
    const walk = nextCommandFor(game, 0, apostle.id);
    expect(walk?.type).toBe('moveUnit');
    expect(walk?.target).toEqual({ col: other.col, row: other.row });
  });
});

describe('fault 4: the focus hold', () => {
  const HOLD = (aiJson as { driver: { focusHoldTurns: number } }).driver.focusHoldTurns;

  /** Every focus order seat 0 sends until it falls quiet, by town. */
  function focusOrders(game: Game): number[] {
    const towns: number[] = [];
    for (let step = 0; step < 80; step++) {
      const command = nextBotCommand(game.state, 0);
      if (command === null || command.type === 'endTurn') break;
      if (command.type === 'setCitizenFocus') towns.push(command.cityId);
      if (!dispatch(game, command).ok) break;
    }
    return towns;
  }

  /** A town of seat 0 put on the production focus, which the bot would undo. */
  function leaning(): { game: Game; city: City } {
    const game = grownGame(10);
    const city = firstCity(game.state, 0);
    const put = dispatch(game, { type: 'setCitizenFocus', playerId: 0, cityId: city.id, focus: 'production' });
    expect(put.ok).toBe(true);
    return { game, city };
  }

  it('has a hold of a few turns', () => {
    expect(HOLD).toBeGreaterThan(1);
    expect(Number.isInteger(HOLD)).toBe(true);
  });

  it('undoes a focus the bot did not give, as before', () => {
    // The fixture's own claim: on this board the arm sends the town back.
    const { game, city } = leaning();
    expect(focusOrders(game)).toContain(city.id);
  });

  it('leaves a town on the focus the bot gave it within the hold', () => {
    const { game, city } = leaning();
    noteFocusOrder(game.state, city.id, 'production');
    expect(focusOrders(game)).not.toContain(city.id);
    expect(lastFocusOrder(game.state, city.id)).toEqual({ cityId: city.id, turn: game.state.turn, focus: 'production' });
  });

  it('may change it again once the hold has run', () => {
    const { game, city } = leaning();
    adoptFocusRoll(game.state, [{ cityId: city.id, turn: game.state.turn - HOLD, focus: 'production' }]);
    expect(focusOrders(game)).toContain(city.id);
    // And the order it gives is written down, so the next hold starts now.
    expect(lastFocusOrder(game.state, city.id)?.turn).toBe(game.state.turn);
  });

  it('holds only the focus it gave: a town another hand moved is free', () => {
    const { game, city } = leaning();
    // The roll says default; the town stands on production, which the bot did not give.
    noteFocusOrder(game.state, city.id, 'default');
    expect(focusOrders(game)).toContain(city.id);
  });

  it('is carried to the bot worker with the other harness memories', () => {
    const { game, city } = leaning();
    noteFocusOrder(game.state, city.id, 'production');
    expect(readHarnessMemory(game.state).focus).toEqual([
      { cityId: city.id, turn: game.state.turn, focus: 'production' },
    ]);
  });
});

describe('fault 5: the settler row', () => {
  /** The Settler row of seat 0's first town, with its queue emptied so the town decides. */
  function settlerRow(state: GameState): BotCandidate | undefined {
    const city = firstCity(state, 0);
    city.queue = [];
    bumpRevision(state);
    const decision = nextBotDecision(state, 0, botSitting(0));
    expect(decision?.kind).toBe('build');
    return decision!.candidates.find((row) => row.label.startsWith('Settler'));
  }

  function labels(terms: readonly ValueTerm[]): string[] {
    return terms.flatMap((term) => [term.label, ...labels(term.parts ?? [])]);
  }

  it('prices no settler while one of the seat sleeps for want of a site', () => {
    const game = grownGame(10);
    const city = firstCity(game.state, 0);
    // The seat's own settler of turn ten is taken off, so the chain owes one.
    game.state.units = game.state.units.filter((unit) => !(unit.ownerId === 0 && unit.type === 'settler'));
    bumpRevision(game.state);
    const free = settlerRow(game.state);
    // The fixture's claim: with no settler standing, a settler is worth a step
    // of the next town.
    expect(free, 'a settler row').toBeDefined();
    expect(free!.score).toBeGreaterThan(0);
    const waiting = createUnit(game.state, 0, 'settler', city.col, city.row);
    waiting.sleeping = true;
    bumpRevision(game.state);
    expect(settlerWaits(game.state, 0)).toBe(true);
    const held = settlerRow(game.state);
    expect(held!.score).toBe(0);
    expect(labels(held!.terms).some((label) => label.includes('already waits with nowhere to found'))).toBe(true);
  });
});
