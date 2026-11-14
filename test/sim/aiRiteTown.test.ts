/**
 * **A rite is priced in the town it is said over** (bot batch BP5, fault B6 of
 * `docs/audit/bot-pass-3-card-values.md`; `docs/flags.md` (ooooooo), B6 "as the
 * audit proposes").
 *
 * The audit found the rites priced over the whole empire: a hex rite read every
 * town's worked hexes, so Rite of the Harvest read ten times its pay in a realm
 * of twelve towns, and the Rite of Fasting read the empire's whole harvest as
 * lost, because the growth rule read the empire's food a turn and not a town's
 * surplus. The fix hands the rite's town to the hex walk and to the growth rule,
 * and reads the growth rule on the surplus (`channelSurplus`). These are the
 * claims:
 *
 *   · a hex line said over one town reads that town's worked hexes only;
 *   · with no town named, a context priced for one town reads the mean town,
 *     and a context for the whole seat still reads every town;
 *   · a share of the food surplus said over one town is that town's surplus as
 *     the growth channel reads it, and nothing in a town with no surplus;
 *   · a card's share of the food surplus is the realm's surplus town by town,
 *     against the scope, and no longer the realm's food a turn.
 */

import { describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import { voiceWeight, valueOfYields } from '../../src/ai/prices';
import { type ValueContext, explainEffects, scoreEffects } from '../../src/ai/value';
import { channelSurplus, foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { readCity } from '../../src/sim/readings';
import { riteDef } from '../../src/sim/religionData';
import { type City, type GameState, type Player, bumpRevision, playerById } from '../../src/sim/state';
import type { CardEffect } from '../../src/sim/statecraftData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { foldEmpireRates } from '../../src/sim/yields/empire';
import { foldCity } from '../../src/sim/yields/town';
import { newGame } from './newGameHelpers';

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

/** Seat 0's towns on a blank grassland board, one for each population, six hexes apart. */
function board(populations: readonly number[]): { state: GameState; player: Player; towns: City[] } {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a' },
    ],
  });
  state.map = createMap({ width: 30, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(30 * 12).fill(null);
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
  state.turn = 40;
  recomputeAllVisibility(state);
  bumpRevision(state);
  return { state, player: seat(state, 0), towns };
}

/** The context a rite is priced through: the seat's book, read as one town (`townScoped`). */
function oneTown(ctx: ValueContext): ValueContext {
  return { ...ctx, cities: 1 };
}

/** The town's surplus as the growth channel reads it, with a share added. */
function surplus(state: GameState, city: City, percent = 0): number {
  return channelSurplus(state, city, foldCity(state, city, [], null, readCity(state, city)), percent);
}

const HARVEST = riteDef('riteOfTheHarvest').effects ?? [];
const FASTING = riteDef('riteOfFasting').effects ?? [];
const GROWTH_LINE = FASTING.find((effect) => effect.kind === 'rulePercent')!;

describe('a hex rite is priced in its own town (fault B6)', () => {
  it('reads the worked hexes of the town it is said over, and of no other', () => {
    const { state, player, towns } = board([6, 2]);
    const here = oneTown(valueContext(state, player));
    const food = valueOfYields({ food: 1 }, here);
    // On grassland every worked hex yields food, so the rite pays one food on each.
    for (const town of towns) {
      expect(town.workedTiles.length).toBeGreaterThan(0);
      expect(explainEffects(HARVEST, here, undefined, town).total).toBeCloseTo(food * town.workedTiles.length, 9);
    }
    expect(explainEffects(HARVEST, here, undefined, towns[0]).total).toBeGreaterThan(
      explainEffects(HARVEST, here, undefined, towns[1]).total,
    );
  });

  it('reads the mean town when no town is named, and every town on the seat’s own book', () => {
    const { state, player, towns } = board([6, 2]);
    const ctx = valueContext(state, player);
    const here = oneTown(ctx);
    const food = valueOfYields({ food: 1 }, ctx);
    const worked = towns.reduce((sum, town) => sum + town.workedTiles.length, 0);
    // The prophet's rite over the realm names no town: one middling town, times the towns.
    expect(explainEffects(HARVEST, here).total).toBeCloseTo((food * worked) / towns.length, 9);
    // A card is held by the empire and still reads every town's hexes.
    expect(explainEffects(HARVEST, ctx).total).toBeCloseTo(food * worked, 9);
  });
});

describe('a share of the food surplus reads the surplus (fault B6)', () => {
  it('prices the Rite of Fasting in its town at that town’s surplus, not the empire’s harvest', () => {
    const { state, player, towns } = board([6, 3]);
    const here = oneTown(valueContext(state, player));
    const food = voiceWeight(here, 'food');
    const town = towns[0]!;
    expect(surplus(state, town)).toBeGreaterThan(0);
    // The whole surplus is lost: the channel's factor falls to its floor of nought.
    expect(scoreEffects([GROWTH_LINE], here)).not.toBe(0);
    expect(explainEffects([GROWTH_LINE], here, undefined, town).total).toBeCloseTo(-surplus(state, town) * food, 9);
    // Far less than the empire's food a turn, which is what the rule used to read.
    const harvest = foldEmpireRates(state, player.id).foodPerTurn ?? 0;
    expect(surplus(state, town)).toBeLessThan(harvest);
  });

  it('reads nothing in a town whose growth has stopped', () => {
    const { state, player, towns } = board([6, 3]);
    const town = towns[1]!;
    // A settler at the front of the queue stops the town banking food toward growth.
    town.queue = [{ kind: 'unit', id: 'settler' } as never];
    refreshCityDerived(state, town);
    bumpRevision(state);
    const here = oneTown(valueContext(state, player));
    expect(surplus(state, town)).toBeLessThanOrEqual(0);
    expect(explainEffects([GROWTH_LINE], here, undefined, town).total).toBe(0);
  });

  it('prices a card’s share at the realm’s surplus, town by town, against its scope', () => {
    const { state, player, towns } = board([6, 3]);
    const ctx = valueContext(state, player);
    const food = voiceWeight(ctx, 'food');
    const share: CardEffect = { kind: 'rulePercent', rule: 'growthSurplus', percent: 30 };
    const realm = towns.reduce((sum, town) => sum + surplus(state, town, 30) - surplus(state, town), 0);
    expect(realm).toBeGreaterThan(0);
    expect(scoreEffects([share], ctx)).toBeCloseTo(realm * food, 9);
    // Synoecism's scope: towns of six citizens or more. Only the first admits it.
    const scoped: CardEffect = { ...share, scope: { test: 'populationAtLeast', value: 6 } } as CardEffect;
    const first = surplus(state, towns[0]!, 30) - surplus(state, towns[0]!);
    expect(scoreEffects([scoped], ctx)).toBeCloseTo(first * food, 9);
    // The old reading, a share of the empire's food a turn, read far more.
    const harvest = foldEmpireRates(state, player.id).foodPerTurn ?? 0;
    expect(realm).toBeLessThan(0.3 * harvest);
  });
});
