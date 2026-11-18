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
 *     and where the lean wins or loses by a few points the answer flipped.
 *     Since bot batch BP10 the bot chooses a town's focus when the town starts
 *     a build and keeps it until that build is finished or leaves the head of
 *     the queue (`focusRoll.ts`); with `driver.focusOrders` at nought it sends
 *     no focus order at all. BP9's five-turn hold is gone.
 *   - **The settlers that pile up.** BP9 priced no settler while one of the
 *     seat slept for want of a site. Bot batch BP10 traced the cause: several
 *     towns started a settler for the one site the empire read once a turn, and
 *     each settler then chose its own site with no notion of the others. Now a
 *     settler is raised only for a site no other settler of the seat (standing,
 *     marching or queued) is for, and a settler keeps the site it marches to
 *     (`settlerSites.ts`). BP9's guard is gone.
 */

import { describe, expect, it } from 'vitest';

import { botSitting, escortJobs, focusReading, nextBotCommand, nextBotDecision, valueContext } from '../../src/ai/bot';
import { foundingSites, freeSiteForTown, siteClaims } from '../../src/ai/settlerSites';
import aiJson from '../../data/ai.json';
import type { BotCandidate, ValueTerm } from '../../src/ai/decision';
import { type BuildMark, adoptFocusRoll, focusChoiceFor, noteFocusChoice } from '../../src/ai/focusRoll';
import { withAiTuning } from '../../src/ai/aiConfig';
import { readHarnessMemory } from '../../src/ai/harnessMemory';
import { type Game, dispatch } from '../../src/sim/game';
import { improvementErrorAt } from '../../src/sim/improvements';
import { workForFamily } from '../../src/sim/improvementData';
import { type Tile, getTileAt, mapRange, tileHex, wrappedDistance } from '../../src/sim/map';
import { foundReligion, religionBeliefPool } from '../../src/sim/religion';
import { BELIEF_IDS } from '../../src/sim/religionData';
import { type City, type GameState, type Player, addBuilding, bumpRevision, createUnit, playerById, queueItemKey } from '../../src/sim/state';
import { foundCityAt, foundingErrorAt, refreshCityDerived } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { createMap } from '../../src/sim/map';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { isWaterTerrain } from '../../src/sim/terrainData';
import { newGame } from './newGameHelpers';
import { findPath } from '../../src/sim/pathfind';
import { researchExpansion } from '../../src/sim/tech';
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

describe('fault 4: one focus a build (bot batch BP10)', () => {
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

  /** The town's build as the roll reads it. */
  function buildOf(city: City): BuildMark {
    const head = city.queue[0];
    return { head: head === undefined ? '-' : queueItemKey(head), basket: city.hammerBasket };
  }

  it('undoes a focus the bot did not give, as before', () => {
    // The fixture's own claim: on this board the arm moves the town off the
    // production sheet. Since bot batch BP13b it moves it to the best of the four
    // sheets, which the table names, and not always to the balanced ordering.
    const { game, city } = leaning();
    expect(city.queue.length, 'the town is building something').toBeGreaterThan(0);
    const best = focusReading(game.state, city, valueContext(game.state, seat(game.state, 0))).best;
    expect(best).not.toBe('production');
    expect(focusOrders(game)).toContain(city.id);
    // And the order is written down against the town's build.
    expect(focusChoiceFor(game.state, city.id)).toMatchObject({ focus: best, head: buildOf(city).head });
  });

  it('with two sheets, sends the town back to the balanced ordering', () => {
    // `growth.allFocusSheets` at nought: the table that shipped before BP13b.
    withAiTuning({ growth: { allFocusSheets: 0 } } as never, () => {
      const { game, city } = leaning();
      expect(focusOrders(game)).toContain(city.id);
      expect(focusChoiceFor(game.state, city.id)).toMatchObject({ focus: 'default', head: buildOf(city).head });
    });
  });

  it('leaves a town on the focus the bot chose for the build it is on', () => {
    const { game, city } = leaning();
    noteFocusChoice(game.state, city.id, 'production', buildOf(city));
    expect(focusOrders(game)).not.toContain(city.id);
  });

  it('keeps the choice for turns, while the build goes on', () => {
    const { game, city } = leaning();
    // Chosen ten turns ago with fewer hammers in the basket: the same build.
    const now = buildOf(city);
    adoptFocusRoll(game.state, [{ cityId: city.id, turn: game.state.turn - 10, focus: 'production', head: now.head, basket: Math.max(0, now.basket - 5) }]);
    expect(focusOrders(game)).not.toContain(city.id);
    // The basket it saw is written down for the next look.
    expect(focusChoiceFor(game.state, city.id)?.basket).toBe(now.basket);
  });

  it('chooses again once the build is finished: the same head with a basket that fell', () => {
    const { game, city } = leaning();
    const now = buildOf(city);
    adoptFocusRoll(game.state, [{ cityId: city.id, turn: game.state.turn - 1, focus: 'production', head: now.head, basket: now.basket + 50 }]);
    expect(focusOrders(game)).toContain(city.id);
    expect(focusChoiceFor(game.state, city.id)?.turn).toBe(game.state.turn);
  });

  it('chooses again when the build leaves the head of the queue', () => {
    const { game, city } = leaning();
    noteFocusChoice(game.state, city.id, 'production', { head: 'unit:not-this-one', basket: 0 });
    expect(focusOrders(game)).toContain(city.id);
  });

  it('holds only the focus it chose: a town another hand moved is free', () => {
    const { game, city } = leaning();
    // The roll says default; the town stands on production, which the bot did not choose.
    noteFocusChoice(game.state, city.id, 'default', buildOf(city));
    expect(focusOrders(game)).toContain(city.id);
  });

  it('writes down a choice to keep the focus the town has, so the build keeps it', () => {
    const game = grownGame(10);
    const city = firstCity(game.state, 0);
    adoptFocusRoll(game.state, []);
    focusOrders(game);
    // Whatever the arm chose, the town stands on it, and the roll names this build.
    const row = focusChoiceFor(game.state, city.id);
    expect(row).not.toBeNull();
    expect(row!.head).toBe(buildOf(city).head);
    expect(row!.focus).toBe(city.focus ?? 'default');
  });

  it('sends no focus order at all with driver.focusOrders at nought', () => {
    const { game, city } = leaning();
    const orders = withAiTuning({ driver: { focusOrders: 0 } } as never, () => focusOrders(game));
    expect(orders).toEqual([]);
    expect(city.focus).toBe('production');
  });

  it('is carried to the bot worker with the other harness memories', () => {
    const { game, city } = leaning();
    noteFocusChoice(game.state, city.id, 'production', { head: 'unit:warrior', basket: 3 });
    expect(readHarnessMemory(game.state).focus).toEqual([
      { cityId: city.id, turn: game.state.turn, focus: 'production', head: 'unit:warrior', basket: 3 },
    ]);
  });
});

describe('the focus changes only by a clear margin (bot batch BP11, driver.focusOrders 2)', () => {
  /**
   * The two-sheet table (`growth.allFocusSheets` 0), which these first tests were
   * written for. The four-sheet rule has its own tests below.
   */
  const TWO = { growth: { allFocusSheets: 0 } };

  /** Every focus order seat 0 sends until it falls quiet, under one tuning. */
  function ordersUnder(game: Game, driver: { focusOrders: number; focusMargin?: number }, sheets = TWO): number[] {
    return withAiTuning({ ...sheets, driver } as never, () => {
      const towns: number[] = [];
      for (let step = 0; step < 80; step++) {
        const command = nextBotCommand(game.state, 0);
        if (command === null || command.type === 'endTurn') break;
        if (command.type === 'setCitizenFocus') towns.push(command.cityId);
        if (!dispatch(game, command).ok) break;
      }
      return towns;
    });
  }

  /** The fixture's town put on the hammers, and the two-sheet table's reading of it. */
  function leaning(): { game: Game; city: City; edge: number } {
    const game = grownGame(10);
    const city = firstCity(game.state, 0);
    expect(dispatch(game, { type: 'setCitizenFocus', playerId: 0, cityId: city.id, focus: 'production' }).ok).toBe(true);
    const reading = withAiTuning(TWO as never, () => focusReading(game.state, city, valueContext(game.state, seat(game.state, 0))));
    // The fixture's claim: the balanced ordering wins, by a score and not by a gate.
    expect(reading.gated).toBe(false);
    expect(reading.edge).toBeLessThan(0);
    return { game, city, edge: reading.edge };
  }

  /**
   * The same town under all four sheets (bot batch BP13b), and how far the
   * table's best sheet leads the production sheet the town stands on.
   */
  function leaningFour(): { game: Game; city: City; best: string; lead: number } {
    const game = grownGame(10);
    const city = firstCity(game.state, 0);
    expect(dispatch(game, { type: 'setCitizenFocus', playerId: 0, cityId: city.id, focus: 'production' }).ok).toBe(true);
    const reading = focusReading(game.state, city, valueContext(game.state, seat(game.state, 0)));
    expect(reading.four).toBe(true);
    expect(reading.sheets.production?.gated).toBe(false);
    expect(reading.best).not.toBe('production');
    const lead = (reading.sheets[reading.best]?.score ?? 0) - (reading.sheets.production?.score ?? 0);
    expect(lead).toBeGreaterThan(0);
    return { game, city, best: reading.best, lead };
  }

  it('with four sheets, moves the town to the best sheet when it leads by more than the margin', () => {
    const { game, city, best, lead } = leaningFour();
    expect(ordersUnder(game, { focusOrders: 2, focusMargin: lead / 2 }, { growth: { allFocusSheets: 1 } })).toContain(city.id);
    expect(city.focus ?? 'default').toBe(best);
  });

  it('with four sheets, keeps the town where it is when the best sheet leads by less than the margin', () => {
    const { game, city, lead } = leaningFour();
    expect(ordersUnder(game, { focusOrders: 2, focusMargin: lead + 1 }, { growth: { allFocusSheets: 1 } })).not.toContain(city.id);
    expect(city.focus).toBe('production');
  });

  it('sends a leaning town back when the balanced ordering wins by more than the margin', () => {
    const { game, city, edge } = leaning();
    expect(ordersUnder(game, { focusOrders: 2, focusMargin: -edge / 2 })).toContain(city.id);
    expect(city.focus ?? 'default').toBe('default');
  });

  it('keeps the town on its focus when the balanced ordering wins by less than the margin', () => {
    const { game, city, edge } = leaning();
    expect(ordersUnder(game, { focusOrders: 2, focusMargin: -edge + 1 })).not.toContain(city.id);
    expect(city.focus).toBe('production');
  });

  it('never changes a focus on a tie, where the other setting does', () => {
    // Uniform ground: both sheets put the citizens on the same hexes, so the
    // lean scores nought and no gate is asked.
    const state = newGame({ seed: 11, sizeName: 'duel', players: [{ name: 'Ada', color: '#a00' }, { name: 'Bors', color: '#00a' }] });
    state.map = createMap({ width: 20, height: 12, terrain: 'grassland' });
    resetVisibility(state);
    state.tileOwner = new Array<number | null>(20 * 12).fill(null);
    state.units = [];
    state.cities = [];
    state.camps = [];
    state.nextEntityId = 1;
    const city = foundCityAt(state, 0, getTileAt(state.map, 6, 6)!);
    createUnit(state, 0, 'warrior', city.col, city.row);
    city.population = 3;
    city.focus = 'production';
    refreshCityDerived(state, city);
    recomputeAllVisibility(state);
    const reading = focusReading(state, city, valueContext(state, seat(state, 0)));
    expect(reading.edge).toBe(0);
    expect(reading.gated).toBe(false);
    const ask = (driver: { focusOrders: number; focusMargin?: number }): boolean =>
      withAiTuning({ driver } as never, () => {
        const sitting = botSitting(0);
        for (let step = 0; step < 40; step++) {
          const command = nextBotCommand(state, 0, sitting);
          if (command === null || command.type === 'endTurn') return false;
          if (command.type === 'setCitizenFocus') return true;
          if (!applyCommand(state, command).ok) return false;
        }
        return false;
      });
    expect(ask({ focusOrders: 2, focusMargin: 0 })).toBe(false);
    expect(city.focus).toBe('production');
    adoptFocusRoll(state, []);
    expect(ask({ focusOrders: 1 })).toBe(true);
  });
});

describe('fault 5: a settler only for a site no other settler is for (bot batch BP10)', () => {
  const RADIUS = (aiJson as { expansion: { siteSearchRadius: number } }).expansion.siteSearchRadius;

  /**
   * The Settler row of seat 0's first town, with its queue emptied so the town
   * decides. Since bot batch BP16's phases the sitting's phases (the beeline,
   * the council, the purse) answer before the loop reaches the town, so their
   * decisions are applied first.
   */
  function settlerRow(state: GameState): BotCandidate | undefined {
    const city = firstCity(state, 0);
    city.queue = [];
    bumpRevision(state);
    const sitting = botSitting(0);
    for (let step = 0; step < 20; step++) {
      const decision = nextBotDecision(state, 0, sitting);
      if (decision === null) break;
      if (decision.kind === 'build') return decision.candidates.find((row) => row.label.startsWith('Settler'));
      expect(applyCommand(state, decision.command).ok).toBe(true);
    }
    throw new Error('the town did not decide its build');
  }

  function labels(terms: readonly ValueTerm[]): string[] {
    return terms.flatMap((term) => [term.label, ...labels(term.parts ?? [])]);
  }

  /** Seat 0 at turn ten with its own settlers taken off the board. */
  function noSettlers(): { game: Game; city: City } {
    const game = grownGame(10);
    game.state.units = game.state.units.filter((unit) => !(unit.ownerId === 0 && unit.type === 'settler'));
    for (const town of game.state.cities) if (town.ownerId === 0) town.queue = town.queue.filter((item) => item.id !== 'settler');
    bumpRevision(game.state);
    return { game, city: firstCity(game.state, 0) };
  }

  it('claims a march\'s end, and gives a second march beside it no claim', () => {
    const { game, city } = noSettlers();
    const sites = foundingSites(game.state, 0, RADIUS);
    const first = sites[0]!.tile;
    const a = createUnit(game.state, 0, 'settler', city.col, city.row);
    a.path = [{ col: first.col, row: first.row }];
    const b = createUnit(game.state, 0, 'settler', city.col, city.row);
    b.path = [{ col: first.col, row: first.row }];
    const claims = siteClaims(game.state, 0, sites, RADIUS);
    expect(claims.filter((claim) => claim.by === 'march')).toEqual([
      { col: first.col, row: first.row, by: 'march', unitId: a.id, cityId: null },
    ]);
    // The second settler has lost the site, so it stands for the next free one.
    const second = claims.find((claim) => claim.unitId === b.id);
    expect(second?.by).toBe('standing');
    const there = getTileAt(game.state.map, second!.col, second!.row)!;
    expect(foundingErrorAt(game.state, 0, there)).toBeNull();
  });

  it('gives a town\'s next settler a different site from the one its queue is already for', () => {
    const { game, city } = noSettlers();
    const sites = foundingSites(game.state, 0, RADIUS);
    const before = freeSiteForTown(game.state, city, sites, RADIUS);
    expect(before, 'a free site near the town').not.toBeNull();
    city.queue = [{ kind: 'unit', id: 'settler' } as never];
    const after = freeSiteForTown(game.state, city, sites, RADIUS);
    expect(after === null || after.col !== before!.col || after.row !== before!.row).toBe(true);
  });

  it('prices a settler at the next town while a site is free, and at nothing once every site has a settler', () => {
    const { game, city } = noSettlers();
    const free = settlerRow(game.state);
    expect(free, 'a settler row').toBeDefined();
    expect(free!.score).toBeGreaterThan(0);
    // March a settler to every free site in reach of the town, one by one.
    const sites = foundingSites(game.state, 0, RADIUS);
    for (let guard = 0; guard < 80; guard++) {
      const site = freeSiteForTown(game.state, city, sites, RADIUS);
      if (site === null) break;
      createUnit(game.state, 0, 'settler', city.col, city.row).path = [{ col: site.col, row: site.row }];
    }
    expect(freeSiteForTown(game.state, city, sites, RADIUS)).toBeNull();
    bumpRevision(game.state);
    const held = settlerRow(game.state);
    expect(held!.score).toBe(0);
    expect(labels(held!.terms).some((label) => label.includes('already has a settler of this empire for it'))).toBe(true);
  });

  it('prices no settler while one of the seat sleeps in a town near it (bot batch BP12)', () => {
    const { game, city } = noSettlers();
    expect(settlerRow(game.state)!.score).toBeGreaterThan(0);
    // A settler asleep in the town: it waits for a soldier or a safe road. Its
    // own arm is kept out of this sitting so the town decides first.
    const waiting = createUnit(game.state, 0, 'settler', city.col, city.row);
    waiting.sleeping = true;
    city.queue = [];
    bumpRevision(game.state);
    // No soldier is coming for it: it cannot move.
    expect(escortJobs(game.state, 0).some((job) => job.settlerId === waiting.id)).toBe(false);
    const sitting = botSitting(0);
    sitting.roused.add(waiting.id);
    sitting.escortOrders.add(`${waiting.id}>`);
    let decision = nextBotDecision(game.state, 0, sitting);
    for (let step = 0; decision !== null && decision.kind !== 'build' && step < 40; step++) {
      expect(dispatch(game, decision.command).ok).toBe(true);
      decision = nextBotDecision(game.state, 0, sitting);
    }
    expect(decision?.kind).toBe('build');
    const row = decision!.candidates.find((candidate) => candidate.label.startsWith('Settler'));
    expect(row?.score).toBe(0);
    expect(labels(row!.terms).some((label) => label.includes('already waits in'))).toBe(true);
    // Once it has gone, the town raises one again.
    game.state.units = game.state.units.filter((unit) => unit.id !== waiting.id);
    bumpRevision(game.state);
    expect(settlerRow(game.state)!.score).toBeGreaterThan(0);
  });

  it('a settler asleep in a town with a soldier coming for it holds nothing back (bot batch BP12)', () => {
    const { game, city } = noSettlers();
    const waiting = createUnit(game.state, 0, 'settler', city.col, city.row);
    waiting.sleeping = true;
    // A free soldier a few hexes off on open land, which the plan calls for it.
    const from = tileHex(getTileAt(game.state.map, city.col, city.row)!);
    const probe = createUnit(game.state, 0, 'warrior', city.col, city.row);
    const ground = mapRange(game.state.map, from, 4).find(
      (tile) =>
        wrappedDistance(game.state.map, from, tileHex(tile)) >= 3 &&
        !isWaterTerrain(tile.terrain) &&
        !game.state.units.some((unit) => unit.col === tile.col && unit.row === tile.row) &&
        !game.state.cities.some((town) => town.col === tile.col && town.row === tile.row) &&
        findPath(game.state, probe, tile) !== null,
    );
    expect(ground, 'land three or four hexes from the town').toBeDefined();
    probe.col = ground!.col;
    probe.row = ground!.row;
    city.queue = [];
    bumpRevision(game.state);
    expect(escortJobs(game.state, 0).some((job) => job.settlerId === waiting.id && job.kind === 'meet')).toBe(true);
    const sitting = botSitting(0);
    sitting.roused.add(waiting.id);
    let decision = nextBotDecision(game.state, 0, sitting);
    for (let step = 0; decision !== null && decision.kind !== 'build' && step < 40; step++) {
      expect(dispatch(game, decision.command).ok).toBe(true);
      decision = nextBotDecision(game.state, 0, sitting);
    }
    expect(decision?.kind).toBe('build');
    const row = decision!.candidates.find((candidate) => candidate.label.startsWith('Settler'));
    expect(labels(row!.terms).some((label) => label.includes('already waits in'))).toBe(false);
  });

  it('sends a settler to a site another settler of the seat is not marching to', () => {
    const { game, city } = noSettlers();
    // The first settler marches to the site the second would choose alone.
    const lone = createUnit(game.state, 0, 'settler', city.col, city.row);
    bumpRevision(game.state);
    const alone = nextCommandFor(game, 0, lone.id);
    expect(alone?.type).toBe('moveUnit');
    const target = alone!.target!;
    const first = createUnit(game.state, 0, 'settler', city.col, city.row);
    first.path = [{ col: target.col, row: target.row }];
    bumpRevision(game.state);
    const order = nextCommandFor(game, 0, lone.id);
    // Not the same site, and not one inside the spacing rule of it.
    expect(order?.type).toBe('moveUnit');
    const there = getTileAt(game.state.map, order!.target!.col, order!.target!.row)!;
    const taken = getTileAt(game.state.map, target.col, target.row)!;
    expect(foundingErrorAt(game.state, 0, there)).toBeNull();
    expect(wrappedHexes(game, there, taken)).toBeGreaterThanOrEqual(4);
  });

  it('keeps marching to the site it is for when asked again on the way', () => {
    const { game, city } = noSettlers();
    const settler = createUnit(game.state, 0, 'settler', city.col, city.row);
    bumpRevision(game.state);
    const first = nextCommandFor(game, 0, settler.id);
    expect(first?.type).toBe('moveUnit');
    expect(dispatch(game, first as never).ok).toBe(true);
    // Asked again with a sitting, the way `reaskTheMarch` asks a piece under orders.
    const sitting = botSitting(0);
    for (let step = 0; step < 60; step++) {
      const decision = nextBotDecision(game.state, 0, sitting);
      if (decision === null) break;
      const command = decision.command as { type: string; unitId?: number };
      expect(command.unitId === settler.id && command.type === 'moveUnit').toBe(false);
      if (!dispatch(game, decision.command).ok) break;
    }
  });
});

/** Hexes between two tiles on the duel's wrapped map. */
function wrappedHexes(game: Game, a: Tile, b: Tile): number {
  return wrappedDistance(game.state.map, tileHex(a), tileHex(b));
}

describe('the prophet the bot buys (bot batch BP10)', () => {
  it('prices no enhancer belief before the technology that opens them', () => {
    const { game } = foundedFaith();
    canBuyProphets(game);
    const player = seat(game.state, 0);
    // The follower beliefs are full, so the next rung is an enhancer, which waits on Theology.
    player.techsResearched = player.techsResearched.filter((id) => id !== 'theology');
    bumpRevision(game.state);
    const row = prophetRow(game);
    expect(row, 'a prophet for sale').toBeDefined();
    expect(row!.labels.some((label) => label.includes('enhancer beliefs it could still take'))).toBe(false);
    // With the technology, the rung is priced again.
    player.techsResearched.push('theology' as never);
    bumpRevision(game.state);
    expect(prophetRow(game)!.labels.some((label) => label.includes('enhancer beliefs it could still take'))).toBe(true);
  });

  /** The faith book's prophet row in seat 0's first town, or `undefined`. */
  function prophetRow(game: Game): { worth: number; labels: string[] } | undefined {
    const player = seat(game.state, 0);
    const city = firstCity(game.state, 0);
    const want = valueContext(game.state, player).wants.faith.find(
      (row) => row.buy?.item.kind === 'unit' && row.buy.item.id === 'prophet' && row.buy.cityId === city.id,
    );
    return want === undefined ? undefined : { worth: want.worth, labels: deepLabels(want.terms) };
  }

  function deepLabels(terms: readonly ValueTerm[]): string[] {
    return terms.flatMap((term) => [term.label, ...deepLabels(term.parts ?? [])]);
  }

  /** The technology that sells prophets, and the faith to buy one. */
  function canBuyProphets(game: Game): void {
    const player = seat(game.state, 0);
    for (const step of researchExpansion(game.state, 0, 'theHighTemple' as never)) {
      if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
    }
    player.faithPool = 5000;
    bumpRevision(game.state);
  }

  it('prices no rite said over every town, which no arm of the bot sends', () => {
    const { game } = foundedFaith();
    canBuyProphets(game);
    const row = prophetRow(game);
    expect(row, 'a prophet for sale').toBeDefined();
    expect(row!.labels.some((label) => label.includes('a rite said over every town'))).toBe(false);
  });

  it('prices a further holy site only in a town that would take one', () => {
    const { game, city } = foundedFaith();
    canBuyProphets(game);
    // Every rung taken, so the one act left is a further site.
    const religion = game.state.religions.find((faith) => faith.founderId === 0)!;
    religion.enhancer = religionBeliefPool(religion, 'enhancer').slice(0, 2);
    bumpRevision(game.state);
    const open = prophetRow(game)!;
    expect(open.labels.some((label) => label.includes('a further holy site'))).toBe(true);
    expect(open.worth).toBeGreaterThan(0);
    // The town's site stands: a prophet bought here has nothing left to raise.
    const [standing] = plantableGround(game.state, city);
    standing!.improvement = HOLY_SITE;
    bumpRevision(game.state);
    const closed = prophetRow(game)!;
    expect(closed.labels.some((label) => label.includes('a further holy site'))).toBe(false);
    expect(closed.worth).toBe(0);
  });
});
