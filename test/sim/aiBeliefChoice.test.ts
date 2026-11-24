/**
 * **A belief is priced in the towns its faith can expect to hold** (bot batch
 * BP5, fault B7 of `docs/audit/bot-pass-3-card-values.md`).
 *
 * The audit found the follower beliefs priced in every town, though one pays only
 * in the towns that follow the religion. The user's ruling (`docs/flags.md`
 * (ooooooo), B7): *"make sure that bot's price the potential across all cities
 * when making a selection (the first religious pick will always be zero because
 * there are no followers)"*. So at a choice the price reads the towns the seat
 * can expect to hold in its religion. These are the claims:
 *
 *   · the expected towns are every town at a first pick, and the towns that
 *     follow the religion or follow none at a later pick;
 *   · a follower line narrowed to following towns is priced in the expected
 *     towns, so a first pick is not worth nothing, and a count of the town's
 *     followers reads its citizens;
 *   · at a decision a follower belief is its stamp, the towns that follow now,
 *     and what the stamp cannot see; with every town following and no promise,
 *     the price is the stamp;
 *   · an enhancer's count of following towns counts the expected towns too.
 */

import { describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import { explainCard } from '../../src/ai/council';
import { voiceWeight } from '../../src/ai/prices';
import {
  explainBeliefChoice,
  explainCardStamp,
  explainEffects,
  faithTowns,
} from '../../src/ai/value';
import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { workForFamily } from '../../src/sim/improvementData';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { type BeliefId, beliefDef } from '../../src/sim/religionData';
import { type City, type GameState, type Player, bumpRevision, playerById } from '../../src/sim/state';
import type { CardEffect } from '../../src/sim/statecraftData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { stampOfTheSim } from './aiCardStampHelpers';
import { newGame } from './newGameHelpers';

const CATHEDRALS = 'cathedralsOfTheSky' as BeliefId;
const PILGRIMAGE = 'pilgrimage' as BeliefId;
const TITHE_HOUSES = 'titheHouses' as BeliefId;
const CONGREGATION = 'congregation' as BeliefId;

/** The improvement a prophet plants, off the table's inverse rather than a name. */
const HOLY_SITE = workForFamily('prophet')!;

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function seat(state: GameState, playerId: number): Player {
  const player = playerById(state, playerId);
  if (!player) throw new Error(`no seat ${playerId}`);
  return player;
}

/** Seat 0's towns on a blank grassland board, one for each population, and one town of seat 1. */
function board(populations: readonly number[]): { state: GameState; player: Player; towns: City[]; rival: City } {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a' },
    ],
  });
  state.map = createMap({ width: 36, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(36 * 12).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  const towns: City[] = [];
  for (const [index, population] of populations.entries()) {
    const town = foundCityAt(state, 0, at(state.map, 3 + 6 * index, 5));
    town.population = population;
    town.queue = [];
    refreshCityDerived(state, town);
    towns.push(town);
  }
  const rival = foundCityAt(state, 1, at(state.map, 33, 5));
  rival.population = 4;
  rival.queue = [];
  refreshCityDerived(state, rival);
  state.turn = 60;
  recomputeAllVisibility(state);
  bumpRevision(state);
  return { state, player: seat(state, 0), towns, rival };
}

/**
 * A religion founded by the owner of `site`, with its holy site on the town's
 * centre and these follower beliefs. Every citizen of `followers` follows it.
 */
function religionAt(state: GameState, site: City, followers: readonly City[], beliefs: readonly string[] = []): number {
  at(state.map, site.col, site.row).improvement = HOLY_SITE;
  const id = state.religions.length;
  state.religions.push({
    id,
    founderId: site.ownerId,
    name: `The Testament ${id}`,
    pantheon: [],
    follower: [...beliefs],
    enhancer: [],
    foundedTurn: state.turn - 10,
    holySite: { col: site.col, row: site.row },
  } as never);
  for (const city of followers) city.followers = { [id]: city.population };
  bumpRevision(state);
  return id;
}

/** A follower row's lines with the faith part of each scope taken off, written out by hand. */
function cathedralsInAFollowingTown(): CardEffect[] {
  return [
    { kind: 'pays', where: 'city', scope: { test: 'hasBuilding', building: 'temple' }, science: 2, culture: 2 },
  ] as CardEffect[];
}

describe('the towns a faith can expect to hold (fault B7)', () => {
  it('are every town at a first pick, and the towns that follow it or none at a later pick', () => {
    const { state, player, towns, rival } = board([6, 4, 3]);
    // No religion yet: the founding's own picks read every town.
    expect(faithTowns(valueContext(state, player))).toMatchObject({ towns: 3, following: 0, expected: 3 });
    // Founded, with no follower belief yet: still a first pick.
    const mine = religionAt(state, towns[0]!, []);
    // A rival's faith holds the third town.
    religionAt(state, rival, [towns[2]!]);
    expect(faithTowns(valueContext(state, player))).toMatchObject({ towns: 3, following: 0, expected: 3 });
    // A later pick: the towns that follow it or follow none, not the rival's.
    state.religions[mine]!.follower.push('choirs' as never);
    towns[0]!.followers = { [mine]: towns[0]!.population };
    bumpRevision(state);
    const later = faithTowns(valueContext(state, player));
    expect(later).toMatchObject({ towns: 3, following: 1, expected: 2 });
    expect(later.expectedIds).toEqual([towns[0]!.id, towns[1]!.id]);
  });
});

describe('a follower belief priced as a choice (fault B7)', () => {
  it('prices a line narrowed to following towns in every town at a first pick', () => {
    const { state, player, towns } = board([6, 4, 3]);
    religionAt(state, towns[0]!, []);
    const ctx = valueContext(state, player);
    const effects = beliefDef(CATHEDRALS).effects;
    // No town follows the faith yet, so the plain walk reads nothing for the line
    // asked of following towns: the fault. (The temple line reads one town under
    // the walk's floor for a scope that names a building.)
    expect(explainEffects([effects[0]!], ctx, CATHEDRALS).total).toBe(0);
    // As a choice, every town is taken to follow.
    const choice = explainBeliefChoice(CATHEDRALS, ctx).total;
    expect(choice).toBeGreaterThan(explainEffects(effects, ctx, CATHEDRALS).total);
    expect(choice).toBeCloseTo(explainEffects(cathedralsInAFollowingTown(), ctx).total, 9);
    expect(choice).toBeGreaterThan(0);
  });

  it('prices a later pick at the share of the towns the faith can expect to hold', () => {
    const { state, player, towns, rival } = board([6, 4, 3]);
    const mine = religionAt(state, towns[0]!, [towns[0]!], ['choirs']);
    religionAt(state, rival, [towns[2]!]);
    const ctx = valueContext(state, player);
    const every = explainEffects(cathedralsInAFollowingTown(), ctx).total;
    expect(state.religions[mine]!.follower.length).toBe(1);
    expect(explainBeliefChoice(CATHEDRALS, ctx).total).toBeCloseTo((every * 2) / 3, 9);
  });

  it('reads a count of the town’s followers as its citizens', () => {
    const { state, player, towns } = board([6, 4, 3]);
    religionAt(state, towns[0]!, []);
    const ctx = valueContext(state, player);
    // Pilgrimage: one faith for every three followers in the town.
    const helpings = towns.reduce((sum, town) => sum + Math.floor(town.population / 3), 0);
    expect(explainEffects(beliefDef(PILGRIMAGE).effects, ctx, PILGRIMAGE).total).toBe(0);
    expect(explainBeliefChoice(PILGRIMAGE, ctx).total).toBeCloseTo(helpings * voiceWeight(ctx, 'faith'), 9);
  });

  it('is priced at its stamp when every town follows and nothing is promised', () => {
    const { state, player, towns } = board([6, 4, 3]);
    religionAt(state, towns[0]!, towns, ['choirs']);
    const ctx = valueContext(state, player);
    expect(faithTowns(ctx)).toMatchObject({ towns: 3, following: 3, expected: 3 });
    const stamp = explainCardStamp(ctx, TITHE_HOUSES);
    expect(stamp).not.toBeNull();
    // The bot's stamp is the sim's own stamp.
    expect(stamp!.total).toBeCloseTo(stampOfTheSim(state, player.id, TITHE_HOUSES, ctx)!.worth, 9);
    expect(stamp!.total).toBeGreaterThan(0);
    // Tithe Houses counts each town's citizens, which nothing promises to raise.
    expect(explainCard(player, TITHE_HOUSES, ctx).total).toBeCloseTo(stamp!.total, 9);
  });

  it('adds the expected towns that do not follow yet to the stamp at a decision', () => {
    const { state, player, towns } = board([6, 4, 3]);
    religionAt(state, towns[0]!, [towns[0]!], ['choirs']);
    const ctx = valueContext(state, player);
    expect(faithTowns(ctx)).toMatchObject({ following: 1, expected: 3 });
    const stamp = explainCardStamp(ctx, TITHE_HOUSES)!.total;
    expect(stamp).toBeGreaterThan(0);
    // The stamp pays in the one town that follows; the choice reads all three.
    expect(explainCard(player, TITHE_HOUSES, ctx).total).toBeGreaterThan(stamp);
  });
});

describe('an enhancer belief priced as a choice (fault B7)', () => {
  it('counts the towns the faith can expect to hold among the towns that follow it', () => {
    const { state, player, towns } = board([6, 4, 3]);
    religionAt(state, towns[0]!, [], ['choirs', 'titheHouses', 'theQuietHours']);
    const ctx = valueContext(state, player);
    // Congregation: two faith for every town that follows. None follows yet.
    const effects = beliefDef(CONGREGATION).effects;
    expect(explainEffects(effects, ctx, CONGREGATION).total).toBe(0);
    // Three towns the faith can expect to hold (none follows a rival's).
    expect(explainBeliefChoice(CONGREGATION, ctx).total).toBeCloseTo(3 * 2 * voiceWeight(ctx, 'faith'), 9);
  });
});
