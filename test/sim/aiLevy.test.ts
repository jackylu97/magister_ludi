/**
 * **The bot levy batch**: bots spend citizens on levies, retire surplus
 * soldiers for Veteran Colonies' citizen, and price the levy cards on the levy
 * rate they expect. The user's answer of 2026-10-23 to question 2 of
 * `docs/plans/expansionist-themes-triage.md`.
 *
 * Pinned here:
 *
 *   · the levy arm (`levyDecision`, `bot.ts`) takes a levy when the terms
 *     favour it, and does not take one on the same board when they do not;
 *   · a levy candidate's score is the fold of its terms, and the reducer
 *     accepts the command;
 *   · the levy rate a seat expects, before it has levied (`levyOutlook`);
 *   · every card marked "Needs a levy", The Mit'a and Veteran Colonies among
 *     them, and the cards that grant a levy, are priced above nought once the
 *     seat has a levy rate and a card that raises a soldier;
 *   · the retire arm (`retireCommand`, `bot.ts`) sends surplus soldiers home
 *     for Veteran Colonies' citizen, stops at the army the seat wants, and
 *     does nothing without the card;
 *   · two plays of one game with the levy cards seated give the same log, the
 *     log replays to the same state, and levies happen in it.
 */

import { describe, expect, it } from 'vitest';

import { type BotDecision, botSitting, nextBotDecision, valueContext } from '../../src/ai/bot';
import { withAiTuning } from '../../src/ai/aiConfig';
import { foldTerms } from '../../src/ai/decision';
import { driveBots } from '../../src/ai/driver';
import { explainCitizenLevy, levyOutlook, scoreEffects } from '../../src/ai/value';
import aiJson from '../../data/ai.json';

import { applyCommand } from '../../src/sim/commands';
import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { snapshotState } from '../../src/sim/game';
import { levyOptions } from '../../src/sim/levies';
import { createMap, getTileAt } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import {
  type City,
  type GameState,
  type Player,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import { ORDER_IDS, type OrderId, orderDef } from '../../src/sim/statecraftData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { createGame, newGame } from './newGameHelpers';

// --- the bench -----------------------------------------------------------------

/** A blank board with two seats and nothing on it: `aiExpansionist`'s bench. */
function bench(): GameState {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a' },
    ],
  });
  state.map = createMap({ width: 24, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(24 * 12).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  return state;
}

/** Seat 0 with `towns` towns of `population`, on turn 30, holding `cards` in chairs. */
function board(
  cards: readonly string[],
  towns = 1,
  population = 6,
): { state: GameState; player: Player; cities: City[] } {
  const state = bench();
  const cities: City[] = [];
  for (let index = 0; index < towns; index++) {
    const city = foundCityAt(state, 0, getTileAt(state.map, 3 + 6 * index, 5)!)!;
    city.population = population;
    refreshCityDerived(state, city);
    cities.push(city);
  }
  state.turn = 30;
  const player = playerById(state, 0)!;
  // A purse, so the arrears arm (`disbandCommand`) stays out of every test.
  player.gold = 500;
  for (const card of cards) {
    player.statecraft.orders.push(card as OrderId);
    player.statecraft.slots.push({ card: card as OrderId, sealedUntil: state.turn });
  }
  recomputeAllVisibility(state);
  bumpRevision(state);
  return { state, player, cities };
}

/**
 * Asks seat 0 for its next decision and applies it, until it has nothing more
 * to say or `steps` run out. Every command must be accepted: a refused one is
 * a bug in the bot.
 */
function sit(state: GameState, steps = 40): BotDecision[] {
  const sitting = botSitting(0);
  const taken: BotDecision[] = [];
  for (let step = 0; step < steps; step++) {
    const decision = nextBotDecision(state, 0, sitting);
    if (decision === null) break;
    const result = applyCommand(state, decision.command);
    expect(result.ok, `${decision.kind}: ${result.ok ? '' : result.error}`).toBe(true);
    taken.push(decision);
  }
  return taken;
}

/**
 * Contentment priced near nothing, so the citizen's keep cannot carry a levy
 * on its own. The bench's town is starving and the next town over-spends
 * contentment, which prices happiness at the band's cap; this sheet takes that
 * away so the test is about the cards.
 */
const CHEAP_CONTENTMENT = { weights: { happiness: 0.1 } };

// --- the decision ----------------------------------------------------------------

describe('the levy arm', () => {
  const ENGINE = ['levyOfTheLand', 'theGleaners', 'seasonalLevies', 'theMita'];

  it('levies when the seated cards make a levy worth more than the citizen', () => {
    withAiTuning(CHEAP_CONTENTMENT, () => {
      const { state, player, cities } = board(ENGINE);
      const city = cities[0]!;
      const ctx = valueContext(state, player);
      const production = explainCitizenLevy(city, 'production', ctx);
      expect(production.total).toBeGreaterThan(0);

      const before = city.population;
      const taken = sit(state);
      const levies = taken.filter((decision) => decision.kind === 'levy');
      expect(levies).toHaveLength(1);
      const levy = levies[0]!;
      expect(levy.command).toEqual({ type: 'levyCitizen', playerId: 0, cityId: city.id, use: 'production' });
      // The chosen line's score is the fold of its terms, and it beat nought.
      const chosen = levy.candidates.find((candidate) => candidate.chosen)!;
      expect(chosen.score).toBe(foldTerms(chosen.terms));
      expect(chosen.score).toBeGreaterThan(0);
      expect(city.population).toBe(before - 1);
      expect(playerById(state, 0)!.citizensLevied).toBe(1);
      // One levy a town a turn: the town's wait is stamped.
      expect(city.levy?.turn).toBe(state.turn);
    });
  });

  it('does not levy on the same board when only the levy itself is seated', () => {
    withAiTuning(CHEAP_CONTENTMENT, () => {
      const { state, player, cities } = board(['levyOfTheLand']);
      const city = cities[0]!;
      const ctx = valueContext(state, player);
      // Hammers for the food that grew the citizen: the bot prices food above
      // hammers in the first age, so the trade alone is not worth it.
      expect(explainCitizenLevy(city, 'production', ctx).total).toBeLessThan(0);
      expect(levyOptions(state, 0, city).every((option) => option.blocked === null)).toBe(true);

      const before = city.population;
      const taken = sit(state);
      expect(taken.filter((decision) => decision.kind === 'levy')).toEqual([]);
      expect(city.population).toBe(before);
      expect(playerById(state, 0)!.citizensLevied ?? 0).toBe(0);
    });
  });

  it('prices a soldier only while the seat wants one', () => {
    const { state, player, cities } = board(['theMusterOfTheFields']);
    const city = cities[0]!;
    // An empty town is short of its garrison, so the soldier is wanted.
    const wanted = explainCitizenLevy(city, 'muster', valueContext(state, player));
    const bought = wanted.terms[0]!;
    expect(bought.value).toBeGreaterThan(0);
    // A full army and a full garrison: the soldier saves no hammers and costs a wage.
    for (let index = 0; index < 4; index++) createUnit(state, 0, 'warrior', city.col, city.row);
    bumpRevision(state);
    const full = explainCitizenLevy(city, 'muster', valueContext(state, player));
    expect(full.terms[0]!.value).toBeLessThanOrEqual(0);
    expect(full.total).toBeLessThan(wanted.total);
  });
});

// --- the prices ------------------------------------------------------------------

describe('the levy cards are priced on the levy rate', () => {
  it('expects a levy rate before the seat has levied, off the towns that may levy', () => {
    const { state, player } = board([], 2);
    const ctx = valueContext(state, player);
    const outlook = levyOutlook(ctx);
    const rule = RULES.cities.levy;
    expect(outlook.towns).toBe(2);
    expect(outlook.rate).toBe((2 * aiJson.score.citizenLevy.priorShare) / rule.everyTurns);
    expect(outlook.uses).toEqual([]);
    expect(outlook.soldierRate).toBe(0);
  });

  /**
   * Two towns of six, a card that raises a soldier, and two cards that hang
   * food on a town after a levy, so a levy is worth taking in both towns.
   */
  const LEVYING = ['theMusterOfTheFields', 'theGleaners', 'seasonalLevies'];

  it('prices every card marked "Needs a levy", The Mit\'a and Veteran Colonies above nought', () => {
    const { state, player } = board(LEVYING, 2);
    const ctx = valueContext(state, player);
    expect(levyOutlook(ctx).soldierRate).toBeGreaterThan(0);
    const needs = ORDER_IDS.filter((id) => orderDef(id).needsLevy === true && orderDef(id).retired !== true);
    // The register: the cards the deal gate holds back until a levy is held.
    expect([...needs].sort()).toEqual(
      [
        'seasonalLevies',
        'theGleaners',
        'theLabourFeasts',
        'theLabourRolls',
        'theMita',
        'theSlackSeason',
        'theTrainedBands',
        'watchAndWard',
      ].sort(),
    );
    for (const id of [...needs, 'veteranColonies']) {
      expect(scoreEffects(orderDef(id as OrderId).effects, ctx, id as OrderId), id).toBeGreaterThan(0);
    }
  });

  it('prices the cards that grant a levy above nought where a levy is worth taking', () => {
    const { state, player, cities } = board(LEVYING, 2);
    const ctx = valueContext(state, player);
    for (const city of cities) expect(explainCitizenLevy(city, 'muster', ctx).total).toBeGreaterThan(0);
    for (const id of ['theMusterOfTheFields', 'theGeneralLevy', 'levyOfTheLand']) {
      expect(scoreEffects(orderDef(id as OrderId).effects, ctx), id).toBeGreaterThan(0);
    }
  });

  it('leaves the soldier-only cards at nought for a seat whose levies raise no soldier', () => {
    const { state, player } = board(['levyOfTheLand'], 2);
    const ctx = valueContext(state, player);
    expect(levyOutlook(ctx).soldierRate).toBe(0);
    for (const id of ['watchAndWard', 'theTrainedBands', 'veteranColonies']) {
      expect(scoreEffects(orderDef(id as OrderId).effects, ctx), id).toBe(0);
    }
  });
});

// --- the retire arm --------------------------------------------------------------

describe('the retire arm', () => {
  function garrisoned(cards: readonly string[], soldiers: number) {
    const made = board(cards, 1, 4);
    const city = made.cities[0]!;
    for (let index = 0; index < soldiers; index++) createUnit(made.state, 0, 'warrior', city.col, city.row);
    bumpRevision(made.state);
    return { ...made, city };
  }

  it('retires surplus soldiers in a town for Veteran Colonies, down to the army it wants', () => {
    const { state, city } = garrisoned(['veteranColonies'], 4);
    const wanted = aiJson.military.armyPerCity;
    const before = city.population;
    const retired = sit(state).filter((decision) => decision.kind === 'disband');
    // Four soldiers against the two one town wants: two go home.
    expect(retired).toHaveLength(4 - wanted);
    expect(state.units.filter((unit) => unit.ownerId === 0)).toHaveLength(wanted);
    // Each comes home as a citizen.
    expect(city.population).toBe(before + retired.length);
    for (const decision of retired) {
      const chosen = decision.candidates.find((candidate) => candidate.chosen)!;
      expect(chosen.score).toBe(foldTerms(chosen.terms));
    }
  });

  it('retires nobody without the card, or without a surplus', () => {
    const without = garrisoned([], 4);
    expect(sit(without.state).filter((decision) => decision.kind === 'disband')).toEqual([]);
    const lean = garrisoned(['veteranColonies'], aiJson.military.armyPerCity);
    expect(sit(lean.state).filter((decision) => decision.kind === 'disband')).toEqual([]);
  });
});

// --- determinism -----------------------------------------------------------------

describe('a game with the levy cards seated', () => {
  const CONFIG = {
    seed: 31,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#d4502e' },
      { name: 'Bors', color: '#3a7fe8' },
    ],
  };
  const TURNS = 24;

  function play(): { log: string; snapshot: string; levies: number } {
    const game = createGame(CONFIG);
    // The cards are handed to seat 0 in its chairs before the first turn, the
    // way a slot command would leave them, so the levies can be watched.
    const player = playerById(game.state, 0)!;
    for (const card of ['levyOfTheLand', 'theGleaners', 'seasonalLevies', 'theMita']) {
      player.statecraft.orders.push(card as OrderId);
      player.statecraft.slots.push({ card: card as OrderId, sealedUntil: game.state.turn });
    }
    bumpRevision(game.state);
    for (let turn = 0; turn < TURNS; turn++) driveBots(game);
    const levies = game.log.filter((command) => command.type === 'levyCitizen').length;
    return { log: JSON.stringify(game.log), snapshot: snapshotState(game.state), levies };
  }

  it('levies, and plays the same way twice', () => {
    const first = play();
    const second = play();
    expect(first.levies).toBeGreaterThan(0);
    expect(second.log).toBe(first.log);
    expect(second.snapshot).toBe(first.snapshot);
  });

  it('replays its log to the same levies', () => {
    const game = createGame(CONFIG);
    const player = playerById(game.state, 0)!;
    for (const card of ['levyOfTheLand', 'theGleaners', 'seasonalLevies', 'theMita']) {
      player.statecraft.orders.push(card as OrderId);
      player.statecraft.slots.push({ card: card as OrderId, sealedUntil: game.state.turn });
    }
    bumpRevision(game.state);
    for (let turn = 0; turn < 12; turn++) driveBots(game);
    // The cards were handed over outside the log, so the replay starts from
    // the same hand-over: a replay of the log alone must agree on every
    // command the bots sent after it.
    const again = createGame(CONFIG);
    const seat = playerById(again.state, 0)!;
    for (const card of ['levyOfTheLand', 'theGleaners', 'seasonalLevies', 'theMita']) {
      seat.statecraft.orders.push(card as OrderId);
      seat.statecraft.slots.push({ card: card as OrderId, sealedUntil: again.state.turn });
    }
    bumpRevision(again.state);
    for (const command of game.log) expect(applyCommand(again.state, command).ok).toBe(true);
    expect(snapshotState(again.state)).toBe(snapshotState(game.state));
  });
});
