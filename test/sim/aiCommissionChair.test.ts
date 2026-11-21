/**
 * **Bot batch BP6 of bot pass 3, B12: a commission is an investment.** The spec
 * is `docs/flags.md` item (ooooooo), entry B12 ("as proposed on the page"; the
 * page is the proposal of 2026-11-12, linked from the item).
 *
 * A commission pays nothing while it sits and its reward once, when its goal is
 * met. Before this batch a chair priced it as a draft does, the reward at the
 * lump exchange times the delay, so a goal two turns away lost its chair to
 * almost any card, and nothing made a seat work toward a goal it held. Pinned
 * here:
 *
 *   - the chair price (`explainCommissionChair`): the whole reward for one turn
 *     of the chair when the goal is met; the reward, times the discount, over
 *     the forecast turns for a counted goal, which grows only while it sits;
 *     nothing for a reached goal not met yet, which grows without a chair;
 *   - the slot arm seats a met commission over a card that pays, and the
 *     re-seat arm looks on a turn that is not its own when one waits;
 *   - the pull (`commissionPullTerm`): one step's share of an open commission's
 *     price, for a counted goal only while its card sits, for a reached goal
 *     whether it sits or not, and nothing for a goal already met; and the
 *     production table's and the beeline's own steps.
 */
import { describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import { reslotDecision, slottingDecision } from '../../src/ai/council';
import { foldTerms } from '../../src/ai/decision';
import {
  buildingPullTerm,
  commissionPullTerm,
  explainCommission,
  explainCommissionChair,
  researchPullTerm,
} from '../../src/ai/value';
import aiJson from '../../data/ai.json';
import { buildingProductionCost, foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { type City, type GameState, type Player, bumpRevision, playerById } from '../../src/sim/state';
import { sealTurnsFor } from '../../src/sim/statecraft';
import { performRiteAt } from '../../src/sim/religion';
import { researchExpansion } from '../../src/sim/tech';
import {
  type OrderId,
  ORDER_IDS,
  isBoon,
  isCharter,
  orderDef,
} from '../../src/sim/statecraftData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

const HORIZON = aiJson.priorities.horizonTurns;
const LUMP = aiJson.score.lumpTurns;

const STRONGROOM = 'theStrongroom' as OrderId;
const FRONTIER = 'dominionClearTheFrontier' as OrderId;
const EIGHTH_WONDER = 'magisterialTheEighthWonder' as OrderId;
const GREAT_INSTRUMENT = 'theGreatInstrument' as OrderId;
const FOUNDING_VOWS = 'theFoundingVows' as OrderId;
const WONDER = 'theOracle' as const;

const LIVE = ORDER_IDS.filter((id) => orderDef(id).retired !== true);
/** Plain cards that pay a flat yield: seatable, and worth something. */
const PLAIN = LIVE.filter(
  (id) =>
    !isBoon(id) &&
    !isCharter(id) &&
    orderDef(id).commission === undefined &&
    orderDef(id).effects.length === 1 &&
    orderDef(id).effects.every((effect) => effect.kind === 'pays' && effect.where === 'city'),
);

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

/** One grown town for seat 0 on a blank board, under the opening government. */
function bench(turn = 30): { state: GameState; player: Player; city: City } {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a' },
    ],
  });
  state.map = createMap({ width: 30, height: 14, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(30 * 14).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  state.turn = turn;
  const city = foundCityAt(state, 0, at(state.map, 6, 6));
  city.population = 6;
  city.queue = [];
  refreshCityDerived(state, city);
  recomputeAllVisibility(state);
  bumpRevision(state);
  return { state, player: playerById(state, 0)!, city };
}

/** The reward half of a commission's draft price, per turn: lumps at the exchange and lasting rates. */
function rewardOf(id: OrderId, ctx: ReturnType<typeof valueContext>): number {
  return explainCommission(id, ctx)!.terms[0]!.value;
}

describe('the chair price', () => {
  it('is the whole reward for one turn of the chair when the goal is met', () => {
    const { state, player } = bench();
    player.statecraft.orders = [STRONGROOM];
    player.gold = 1600;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const chair = explainCommissionChair(STRONGROOM, ctx)!;
    expect(foldTerms(chair.terms)).toBe(chair.total);
    // The Strongroom pays once: culture off the treasury and a great person.
    expect(chair.total).toBeCloseTo(rewardOf(STRONGROOM, ctx) * LUMP, 6);
    expect(chair.terms[0]!.label).toMatch(/the goal is met/);
  });

  it('reads nothing for a reached goal not met yet, which grows without a chair', () => {
    const { state, player } = bench();
    player.statecraft.orders = [STRONGROOM];
    player.gold = 200;
    bumpRevision(state);
    const chair = explainCommissionChair(STRONGROOM, valueContext(state, player))!;
    expect(chair.total).toBe(0);
    expect(chair.terms[0]!.label).toMatch(/seated on the turn the goal is met/);
  });

  it('is the reward in full, times the discount, over the forecast turns for a counted goal', () => {
    const { state, player } = bench();
    player.statecraft.orders = [FRONTIER];
    // A seat that has burnt camps before, so its pace brings the goal inside the horizon.
    player.campsCleared = 10;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const draft = explainCommission(FRONTIER, ctx)!;
    const discount = draft.terms[1]!.value;
    const turns = Math.round(HORIZON * (1 - discount));
    expect(turns).toBeGreaterThan(0);
    expect(turns).toBeLessThan(HORIZON);
    const chair = explainCommissionChair(FRONTIER, ctx)!;
    expect(foldTerms(chair.terms)).toBe(chair.total);
    // A great person is paid once, so the reward in full is the lump times its turns.
    expect(chair.total).toBeCloseTo((rewardOf(FRONTIER, ctx) * LUMP * discount) / turns, 6);
    expect(chair.terms[2]).toMatchObject({ op: 'div', value: turns });
  });

  it('is null for a card that is not a commission, and for one already met', () => {
    const { state, player } = bench();
    player.statecraft.orders = [PLAIN[0]!, STRONGROOM];
    player.statecraft.commissionsFulfilled = [{ card: STRONGROOM, turn: 10 }];
    bumpRevision(state);
    const ctx = valueContext(state, player);
    expect(explainCommissionChair(PLAIN[0]!, ctx)).toBeNull();
    expect(explainCommissionChair(STRONGROOM, ctx)).toBeNull();
  });
});

describe('the chair arms', () => {
  it('seat a met commission in an empty chair over a card that pays', () => {
    const { state, player } = bench();
    const sc = player.statecraft;
    sc.orders = [PLAIN[0]!, PLAIN[1]!, PLAIN[2]!, STRONGROOM];
    sc.slots = [{ card: PLAIN[0]!, sealedUntil: 0 }, { card: PLAIN[1]!, sealedUntil: 0 }, null];
    player.gold = 1600;
    bumpRevision(state);
    const decision = slottingDecision(state, player)!;
    expect(decision.command).toMatchObject({ type: 'slotOrder', cardId: STRONGROOM });
  });

  it('look for a swap on a turn that is not the seat’s own when a held commission’s goal is met', () => {
    const { state, player } = bench();
    const every = sealTurnsFor(state, player.id);
    // A turn that is not this seat's turn to look (`isReseatTurn`).
    state.turn = every * 7 + 1;
    const sc = player.statecraft;
    sc.orders = [PLAIN[0]!, PLAIN[1]!, PLAIN[2]!, STRONGROOM];
    sc.slots = [
      { card: PLAIN[0]!, sealedUntil: 0 },
      { card: PLAIN[1]!, sealedUntil: 0 },
      { card: PLAIN[2]!, sealedUntil: 0 },
    ];
    player.gold = 200;
    bumpRevision(state);
    // Not met: nothing to look for off the seat's turn.
    expect(reslotDecision(state, player)).toBeNull();
    player.gold = 1600;
    bumpRevision(state);
    const decision = reslotDecision(state, player)!;
    expect(decision).not.toBeNull();
    expect(decision.command.type).toBe('unslotOrder');
    expect(decision.candidates.find((row) => row.chosen)!.label).toContain(orderDef(STRONGROOM).name);
  });
});

describe('the pull of a step', () => {
  it('gives a counted goal’s share of its price only while its card sits', () => {
    const { state, player, city } = bench();
    const sc = player.statecraft;
    player.techsResearched.push('divination');
    player.faithPool = 500;
    performRiteAt(state, player, city, 'omenReading');
    sc.orders = [FOUNDING_VOWS];
    bumpRevision(state);
    const step = { occasion: 'riteStarted' as const, count: 1 };
    expect(commissionPullTerm(valueContext(state, player), step)).toBeNull();
    sc.slots = [{ card: FOUNDING_VOWS, sealedUntil: 0 }, null, null];
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const price = explainCommission(FOUNDING_VOWS, ctx)!.total;
    expect(price).toBeGreaterThan(0);
    const need = orderDef(FOUNDING_VOWS).commission!.goals[0]!.count;
    const pull = commissionPullTerm(ctx, step)!;
    expect(pull.value).toBeCloseTo(price / need, 9);
    expect(foldTerms(pull.parts!)).toBe(pull.value);
  });

  it('gives a reached goal’s share whether its card sits or not, and nothing once it is met', () => {
    const { state, player } = bench();
    player.statecraft.orders = [STRONGROOM];
    player.gold = 1000;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const price = explainCommission(STRONGROOM, ctx)!.total;
    expect(price).toBeGreaterThan(0);
    const need = orderDef(STRONGROOM).commission!.goals[0]!.count;
    const pull = commissionPullTerm(ctx, { figure: 'treasury', count: 100 })!;
    expect(pull.value).toBeCloseTo((price * 100) / (need - 1000), 9);
    player.gold = 1600;
    bumpRevision(state);
    expect(commissionPullTerm(valueContext(state, player), { figure: 'treasury', count: 100 })).toBeNull();
  });

  it('reaches a wonder row in the production table, and no other row', () => {
    const { state, player, city } = bench();
    const sc = player.statecraft;
    sc.orders = [EIGHTH_WONDER];
    sc.slots = [{ card: EIGHTH_WONDER, sealedUntil: 0 }, null, null];
    // A wonder at the front of the town's queue, one turn from finished, so the
    // goal is forecast inside the horizon.
    city.queue = [{ kind: 'building', id: WONDER }];
    city.hammerBasket = buildingProductionCost(WONDER, state, player.id) - 1;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const price = explainCommission(EIGHTH_WONDER, ctx)!.total;
    expect(price).toBeGreaterThan(0);
    expect(buildingPullTerm(ctx, WONDER)!.value).toBeCloseTo(price, 9);
    expect(buildingPullTerm(ctx, 'monument' as never)).toBeNull();
  });

  it('reaches a research road only through the goal’s own technology', () => {
    const { state, player } = bench();
    const sc = player.statecraft;
    sc.orders = [GREAT_INSTRUMENT];
    sc.slots = [{ card: GREAT_INSTRUMENT, sealedUntil: 0 }, null, null];
    bumpRevision(state);
    // A seat whose science reaches Alchemy next turn, so the goal is inside the horizon.
    const ctx = { ...valueContext(state, player), scienceRate: 1e9 };
    const price = explainCommission(GREAT_INSTRUMENT, ctx)!.total;
    expect(price).toBeGreaterThan(0);
    const road = researchExpansion(state, player.id, 'alchemy');
    expect(road).toContain('alchemy');
    expect(researchPullTerm(ctx, road)!.value).toBeCloseTo(price, 9);
    expect(researchPullTerm(ctx, road.filter((tech) => tech !== 'alchemy'))).toBeNull();
  });
});
