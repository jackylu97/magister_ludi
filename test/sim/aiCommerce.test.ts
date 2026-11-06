/**
 * **Commerce batch T9: bot pricing** (`docs/plans/commerce-themes-triage.md`,
 * the T9 section).
 *
 * Before this batch the Commerce shapes of batches T3 to T7 met a zero or the
 * general stand-in. This file pins what T9 adds:
 *
 *   · **a price for each new kind**, read off the board where the board can
 *     say it and off one knob in `score.commerce` where it cannot: The Return
 *     Leg, The Admiralty of Trade, The Fondaci's moment, The Art Dealers'
 *     moment, Land Speculation's rider (and the hex planner's term for it),
 *     The Strongbox's tally, Mercenary Contracts' waiver, the four new counts,
 *     and a route rider's `count`, `per`, `max` and `family`;
 *   · **the two luxury cards the books read**: The Commenda and The
 *     Capitulations are priced by the marginal reading, as The Casa da Índia
 *     is;
 *   · **the commissions**: Corner the Market's and The Great Fair's
 *     institutions price as their effects, and The World's Fair prices the
 *     posts it writes;
 *   · **the purse**: a seat holding Letters of Credit sees its credit, and a
 *     purchase that runs it into debt is charged for the debt; a unit whose
 *     upkeep is waived is not the one let go;
 *   · **the deal appraisal**: a copy lent is cheaper to a seat holding Export
 *     Guilds or The Commenda, and a new partner is worth something to a seat
 *     holding The Treaty Ports.
 *
 * Every figure is computed here off the sheet or off the context the arm read,
 * the discipline of `aiAppraisal.test.ts`, `aiScientific.test.ts` and
 * `aiExpansionist.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { botSitting, nextBotDecision, valueContext, withDebtCharge } from '../../src/ai/bot';
import { type ValueTerm, appraise, foldTerms } from '../../src/ai/decision';
import { counterTerms } from '../../src/ai/diplomacy';
import {
  type ValueContext,
  costOfUpkeep,
  deckMargin,
  explainCommission,
  explainCountStep,
  explainCounted,
  explainLump,
  foodCarriedTerm,
  hasFoldReadEngine,
  hexPurchaseRiderTerm,
  meterWeight,
  routeSlotTerm,
  scoreEffects,
  valueOfYields,
  voiceWeight,
} from '../../src/ai/value';
import { explainRoutePay } from '../../src/ai/routes';
import { type Want, purseOf } from '../../src/ai/wants';
import aiJson from '../../data/ai.json';

import { cityBlockaded } from '../../src/sim/blockade';
import { channelSurplus, foundCityAt, ownedTiles, refreshCityDerived, resourceCopies } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { openDeal } from '../../src/sim/deals';
import { type GameMap, type Tile, createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { explainRouteSenderYield, explainRouteYield, foldRouteYield } from '../../src/sim/routeYields';
import { startRouteAt } from '../../src/sim/trade';
import { RULES } from '../../src/sim/rulesData';
import {
  type City,
  type GameState,
  type Player,
  type Unit,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import { draftCost } from '../../src/sim/statecraft/draft';
import { type CardEffect, type CardPaysEffect, type OrderId, orderDef } from '../../src/sim/statecraftData';
import { spendableGold } from '../../src/sim/statecraft/evaluator';
import { foldEmpireRates } from '../../src/sim/yields/empire';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

const HORIZON = aiJson.priorities.horizonTurns;
const COMMERCE = aiJson.score.commerce;
const COMMISSION = aiJson.score.commission;

const RETURN_LEG = 'theReturnLeg' as OrderId;
const ADMIRALTY = 'theAdmiraltyOfTrade' as OrderId;
const FONDACI = 'theFondaci' as OrderId;
const ART_DEALERS = 'theArtDealers' as OrderId;
const LAND_SPECULATION = 'landSpeculation' as OrderId;
const STRONGBOX = 'theStrongbox' as OrderId;
const MERCENARIES = 'mercenaryContracts' as OrderId;
const EXPORT_GUILDS = 'exportGuilds' as OrderId;
const TREATY_PORTS = 'theTreatyPorts' as OrderId;
const FOREIGN_FACTOR = 'theForeignFactor' as OrderId;
const LINGUA_FRANCA = 'theLinguaFranca' as OrderId;
const MERCHANT_GUILDS = 'theMerchantGuilds' as OrderId;
const COMMENDA = 'theCommenda' as OrderId;
const CAPITULATIONS = 'theCapitulations' as OrderId;
const CASA = 'theCasaDaIndia' as OrderId;
const LETTERS = 'lettersOfCredit' as OrderId;
const CORNER = 'cornerTheMarket' as OrderId;
const GREAT_FAIR = 'commissionTheGreatFair' as OrderId;
const WORLDS_FAIR = 'theWorldsFair' as OrderId;

// --- the bench ---------------------------------------------------------------

/** A blank grassland board with two seats and nothing on it. */
function bench(): GameState {
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
  return state;
}

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

/** Seats an Order in a chair for a seat, which is what makes it live. */
function hold(state: GameState, playerId: number, id: OrderId): void {
  const sc = seat(state, playerId).statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** One town for each population, seat 0, six hexes apart, on turn 40. */
function board(populations: readonly number[]): { state: GameState; player: Player; towns: City[] } {
  const state = bench();
  const towns: City[] = [];
  for (const [index, population] of populations.entries()) {
    const town = foundCityAt(state, 0, at(state.map, 3 + 6 * index, 5));
    town.population = population;
    refreshCityDerived(state, town);
    towns.push(town);
  }
  state.turn = 40;
  seat(state, 0).gold = 500;
  recomputeAllVisibility(state);
  bumpRevision(state);
  return { state, player: seat(state, 0), towns };
}

/** A town for seat 1 at the board's far end. */
function rivalTown(state: GameState, population: number): City {
  const town = foundCityAt(state, 1, at(state.map, 26, 5));
  town.population = population;
  refreshCityDerived(state, town);
  bumpRevision(state);
  return town;
}

/** A worked luxury seam on a hex this town holds (`deals.test.ts`' helper). */
function giveLuxury(state: GameState, city: City, col: number, row: number, id: string): Tile {
  const tile = at(state.map, col, row);
  tile.resource = id as never;
  tile.improvement = 'plantation';
  state.tileOwner[tileIndex(state.map, col, row)] = city.id;
  bumpRevision(state);
  return tile;
}

/** A domestic caravan of seat 0 running from one town to another. */
function caravan(state: GameState, from: City, to: City): Unit {
  from.buildings.push('market');
  bumpRevision(state);
  const cart = createUnit(state, 0, 'trader', from.col, from.row);
  const sent = applyCommand(state, {
    type: 'startRoute',
    playerId: 0,
    unitId: cart.id,
    fromCityId: from.id,
    toCityId: to.id,
    mode: 'land',
  });
  expect(sent.ok, sent.ok ? '' : sent.error).toBe(true);
  bumpRevision(state);
  return cart;
}

function effectsOf(id: OrderId): CardEffect[] {
  return orderDef(id).effects;
}

/** The `(record + default × priorTurns) ÷ (turns + priorTurns)` rate, off the sheet. */
function smoothed(record: number, fallback: number, turn: number): number {
  return (record + fallback * COMMISSION.priorTurns) / (turn + COMMISSION.priorTurns);
}

/** Every term of an appraisal and of its nested parts, flattened. */
function allTerms(terms: readonly ValueTerm[]): ValueTerm[] {
  return terms.flatMap((term) => [term, ...allTerms(term.parts ?? [])]);
}

/** A context whose route outlook is bound, with one unserved pair worth `pay`. */
function bound(ctx: ValueContext, from: City, to: City, pay: number): ValueContext {
  return {
    ...ctx,
    routes: {
      ...ctx.routes,
      bound: true,
      caravanDelay: 0,
      next: { from, to, mode: 'land', pay: appraise([{ label: 'the pair', value: pay }]) },
    },
  };
}

// --- the sheet ------------------------------------------------------------------

describe('the sheet', () => {
  it('carries the score.commerce group and the treasury forecast', () => {
    expect(Object.keys(COMMERCE).sort()).toEqual(
      [
        'boughtUnitShare',
        'countForecast',
        'foreignRouteOption',
        'postRangeWaiver',
        'postWorth',
        'postsOverHorizon',
        'shutTownBuys',
        'surplusCarried',
      ].sort(),
    );
    expect(Object.keys(COMMERCE.countForecast).sort()).toEqual(
      ['copiesLent', 'dealPartners', 'postCitizens', 'worldTradeRoutes'].sort(),
    );
    expect(aiJson.score.tallyForecast.treasuryHeld).toBeGreaterThan(0);
  });
});

// --- routes and posts (batch T3) -------------------------------------------------

describe('The Return Leg', () => {
  it('is worth what the seat’s home routes pay their destinations, a second time', () => {
    const { state, player, towns } = board([6, 6]);
    expect(scoreEffects(effectsOf(RETURN_LEG), valueContext(state, player))).toBe(0);
    const cart = caravan(state, towns[0]!, towns[1]!);
    const ctx = valueContext(state, player);
    const pay = valueOfYields(foldRouteYield(explainRouteYield(state, cart)), ctx);
    expect(pay).toBeGreaterThan(0);
    expect(scoreEffects(effectsOf(RETURN_LEG), ctx)).toBe(pay);
  });
});

describe('The Admiralty of Trade', () => {
  it('is the knob’s share of the best route’s pay, for each town holding the seat’s paying post', () => {
    const { state, player, towns } = board([6]);
    const theirs = rivalTown(state, 8);
    /** The seat's context, with the best route it could run paying 10. */
    const ctx = (): ValueContext => {
      const base = valueContext(state, player);
      const offer = { from: towns[0]!, to: theirs, mode: 'land' as const, pay: appraise([{ label: 'the pair', value: 10 }]) };
      return { ...base, routes: { ...base.routes, open: offer } };
    };
    expect(scoreEffects(effectsOf(ADMIRALTY), ctx())).toBe(0);
    // An established post abroad and one at home: two towns.
    theirs.posts = [{ by: 0, since: state.turn - 20 }];
    towns[0]!.posts = [{ by: 0, since: state.turn - 25 }];
    bumpRevision(state);
    expect(scoreEffects(effectsOf(ADMIRALTY), ctx())).toBe(2 * COMMERCE.postRangeWaiver * 10);
    // A post not yet established does not pay, so it waives nothing.
    theirs.posts = [{ by: 0, since: state.turn - 5 }];
    bumpRevision(state);
    expect(scoreEffects(effectsOf(ADMIRALTY), ctx())).toBe(COMMERCE.postRangeWaiver * 10);
  });
});

describe('The Fondaci', () => {
  it('rides the posts the routes have opened, and the seat’s record of posts', () => {
    const { state, player, towns } = board([6]);
    const theirs = rivalTown(state, 8);
    // One post on its way (five turns old) and one established at home.
    theirs.posts = [{ by: 0, since: state.turn - 5 }];
    towns[0]!.posts = [{ by: 0, since: state.turn - 30 }];
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const rate = 1 / HORIZON + smoothed(1, COMMERCE.postsOverHorizon / HORIZON, state.turn);
    // The grant reads the citizens of the town the next post is established in.
    const [science, culture] = effectsOf(FONDACI);
    expect(scoreEffects([science!], ctx)).toBeCloseTo(
      rate * explainLump({ science: 20 * theirs.population }, ctx).total,
      10,
    );
    expect(scoreEffects([culture!], ctx)).toBeCloseTo(
      rate * explainLump({ culture: 20 * theirs.population }, ctx).total,
      10,
    );
  });

  it('still forecasts a moment for a seat with no post, from the knob', () => {
    const { state, player } = board([6]);
    const ctx = valueContext(state, player);
    const rate = smoothed(0, COMMERCE.postsOverHorizon / HORIZON, state.turn);
    const [science] = effectsOf(FONDACI);
    expect(scoreEffects([science!], ctx)).toBeCloseTo(
      rate * explainLump({ science: 20 * 6 }, ctx).total,
      10,
    );
  });
});

// --- the moments of T5 and T7 ----------------------------------------------------

describe('the card-drafted moment', () => {
  it('comes round at the seat’s pace of drafting', () => {
    // The Art Dealers rode this moment until batch R1. No row rides it now,
    // so the rider is written here: The Court Painter and The Accessions
    // Register will ride it when the Magisterial build makes them.
    const { state, player, towns } = board([6]);
    towns[0]!.buildings.push('monument');
    refreshCityDerived(state, towns[0]!);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const culture = foldEmpireRates(state, 0).culturePerTurn ?? 0;
    expect(culture).toBeGreaterThan(0);
    const rate = culture / draftCost(player.statecraft.drafts + 1);
    const rider: CardEffect = {
      kind: 'windfallRider',
      occasion: 'cardDrafted',
      grant: { yield: 'gold', amount: 15 },
    };
    const price = scoreEffects([rider], ctx);
    expect(price).toBeCloseTo(rate * explainLump({ gold: 15 }, ctx).total, 10);
    expect(price).toBeGreaterThan(0);
  });
});

describe('The Art Dealers', () => {
  it('prices +3 gold for each chair of the council, filled or still empty', () => {
    // Batch R1: the card pays +3 gold for each Order in a chair. The Orders
    // seated today are counted, and the empty chairs are what the seat will
    // fill as it drafts (`commerceCountAhead`).
    const { state, player } = board([6]);
    const helping = (ctx: ValueContext): number => valueOfYields({ gold: 3 }, ctx);
    let ctx = valueContext(state, player);
    const chairs = player.statecraft.slots.length;
    expect(chairs).toBeGreaterThan(0);
    expect(player.statecraft.slots.every((slotted) => slotted === null)).toBe(true);
    expect(scoreEffects(effectsOf(ART_DEALERS), ctx)).toBeCloseTo(chairs * helping(ctx), 10);
    // A card seated in a chair of its own counts today, and the empty chairs
    // still count as promise.
    hold(state, 0, 'marketDay' as OrderId);
    ctx = valueContext(state, player);
    expect(player.statecraft.slots).toHaveLength(chairs + 1);
    expect(scoreEffects(effectsOf(ART_DEALERS), ctx)).toBeCloseTo((chairs + 1) * helping(ctx), 10);
    expect(scoreEffects(effectsOf(ART_DEALERS), ctx)).toBeGreaterThan(0);
  });
});

describe('Land Speculation', () => {
  it('pays the hex planner half a resource hex’s price in culture, and nothing on bare ground', () => {
    const { state, player, towns } = board([6]);
    hold(state, 0, LAND_SPECULATION);
    const silk = giveLuxury(state, towns[0]!, 5, 4, 'silk');
    // The hex planner asks about hexes the town does not own yet; the test
    // only needs a hex with a resource and one without.
    state.tileOwner[tileIndex(state.map, silk.col, silk.row)] = null;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const term = hexPurchaseRiderTerm(ctx, silk, 75)!;
    expect(term).not.toBeNull();
    expect(term.value).toBe(explainLump({ culture: Math.floor(0.5 * 75) }, ctx).total);
    expect(hexPurchaseRiderTerm(ctx, at(state.map, 6, 6), 75)).toBeNull();
  });

  it('adds what the card pays to the hex planner’s want for that hex', () => {
    const { state, player } = board([6]);
    hold(state, 0, LAND_SPECULATION);
    // A frontier hex with a resource the seat can name and holds no copy of.
    const silk = at(state.map, 5, 5);
    silk.resource = 'silk' as never;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const want = ctx.wants.gold.find((row) => row.ground?.col === 5 && row.ground?.row === 5);
    expect(want).toBeDefined();
    const rider = allTerms(want!.terms).find((term) =>
      term.label.startsWith('what this seat’s cards pay once'),
    );
    // The book is appraised at the prior prices, before the shadow prices it
    // sets, so the figure is not this context's; it is the card's culture,
    // added after the claim share and folded into the want's worth.
    expect(rider).toBeDefined();
    expect(rider!.value).toBeGreaterThan(0);
    expect(want!.terms[want!.terms.length - 1]).toBe(rider);
    expect(want!.worth).toBeCloseTo(foldTerms(want!.terms), 10);
    // A bare hex beside it carries no such term.
    const bare = ctx.wants.gold.find((row) => row.ground?.col === 5 && row.ground?.row === 4);
    if (bare !== undefined) {
      expect(allTerms(bare.terms).some((term) => term.label.startsWith('what this seat’s cards pay'))).toBe(
        false,
      );
    }
  });

  it('is priced at the seat’s pace of buying hexes, on the share its tile test admits', () => {
    const { state, player, towns } = board([6]);
    giveLuxury(state, towns[0]!, 4, 4, 'silk');
    player.tilesPurchased = 4;
    bumpRevision(state);
    // No hex in the book: the seat's own ground stands in, at the first price.
    const base = valueContext(state, player);
    const ctx: ValueContext = { ...base, wants: { ...base.wants, gold: [] } };
    const owned = ownedTiles(state, towns[0]!).length;
    const price = RULES.cities.tilePurchase.ringBase[0]!;
    const each = explainLump({ culture: Math.floor(0.5 * price) }, ctx).total;
    const rate = 4 / state.turn;
    expect(scoreEffects(effectsOf(LAND_SPECULATION), ctx)).toBeCloseTo((rate * each) / owned, 10);
  });
});

describe('The Strongbox', () => {
  it('forecasts the turns ending at the floor, scaled by the treasury against the floor', () => {
    const { state, player } = board([6]);
    const forecast = aiJson.score.tallyForecast.treasuryHeld;
    const science = effectsOf(STRONGBOX)[0] as CardPaysEffect;
    const floor = science.minTreasury!;
    player.gold = floor / 2;
    bumpRevision(state);
    const half = explainCounted(science, valueContext(state, player), STRONGBOX);
    expect(half.terms[1]!.value).toBe(forecast / 2);
    // At the floor the whole forecast, cut at the row's cap.
    player.gold = floor;
    bumpRevision(state);
    const whole = explainCounted(science, valueContext(state, player), STRONGBOX);
    expect(whole.terms[1]!.value).toBe(forecast);
    const counted = foldTerms(whole.terms.slice(0, 3).filter((term) => term.op !== 'mul'));
    expect(counted).toBe(Math.min(forecast, science.max!));
  });
});

describe('Mercenary Contracts', () => {
  it('is the upkeep its bought units do not pay, for the waiver’s turns', () => {
    const { state, player } = board([6]);
    const [gold, faith] = effectsOf(MERCENARIES);
    expect(scoreEffects([gold!], valueContext(state, player))).toBe(0);
    // Twenty military units gained over forty turns.
    player.unitsBuilt = { warrior: 20 };
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const rate = 20 / state.turn;
    const wage = ctx.age * RULES.upkeep.goldPerUnitAge;
    const each = costOfUpkeep(rate * COMMERCE.boughtUnitShare * 20 * wage, ctx);
    expect(each).toBeGreaterThan(0);
    expect(scoreEffects([gold!], ctx)).toBe(each);
    expect(scoreEffects([faith!], ctx)).toBe(each);
  });
});

// --- the new counts ----------------------------------------------------------------

describe('the Commerce counts, and what each could come to count', () => {
  /** The potential term `explainCounted` prints for the row's first effect. */
  function potential(id: OrderId, ctx: ValueContext): number {
    const effect = effectsOf(id)[0] as CardPaysEffect;
    return explainCounted(effect, ctx, id).terms[1]!.value;
  }

  it('reads the spare copies the seat could lend (Export Guilds)', () => {
    const { state, player, towns } = board([6]);
    expect(potential(EXPORT_GUILDS, valueContext(state, player))).toBe(0);
    giveLuxury(state, towns[0]!, 4, 4, 'silk');
    giveLuxury(state, towns[0]!, 2, 5, 'silk');
    giveLuxury(state, towns[0]!, 4, 5, 'silk');
    expect(resourceCopies(state, 0, 'silk')).toBe(3);
    expect(potential(EXPORT_GUILDS, valueContext(state, player))).toBe(
      Math.min(2, COMMERCE.countForecast.copiesLent),
    );
  });

  it('reads the met empires at peace it holds no deal with (The Treaty Ports)', () => {
    const { state, player } = board([6]);
    rivalTown(state, 6);
    expect(potential(TREATY_PORTS, valueContext(state, player))).toBe(0);
    player.metSeats.push(1);
    seat(state, 1).metSeats.push(0);
    bumpRevision(state);
    expect(potential(TREATY_PORTS, valueContext(state, player))).toBe(
      Math.min(1, COMMERCE.countForecast.dealPartners),
    );
    // A partner already is not a new one.
    openDeal(state, 900, 0, 1, { goldPerTurn: 1 }, {});
    bumpRevision(state);
    expect(potential(TREATY_PORTS, valueContext(state, player))).toBe(0);
  });

  it('reads the posts the routes will establish abroad (The Foreign Factor)', () => {
    const { state, player } = board([6]);
    const theirs = rivalTown(state, 13);
    expect(potential(FOREIGN_FACTOR, valueContext(state, player))).toBe(
      COMMERCE.countForecast.postCitizens,
    );
    theirs.posts = [{ by: 0, since: state.turn - 5 }];
    bumpRevision(state);
    const perTown = (effectsOf(FOREIGN_FACTOR)[0] as CardPaysEffect).perTown!;
    expect(potential(FOREIGN_FACTOR, valueContext(state, player))).toBe(
      Math.max(Math.floor(13 / perTown), COMMERCE.countForecast.postCitizens),
    );
  });

  it('reads the knob alone for the world’s routes (The Lingua Franca)', () => {
    const { state, player } = board([6]);
    expect(potential(LINGUA_FRANCA, valueContext(state, player))).toBe(
      COMMERCE.countForecast.worldTradeRoutes,
    );
  });
});

describe('a route rider’s count, per, max and family (The Merchant Guilds)', () => {
  it('opens a route for every two merchants, with the merchants the seat expects', () => {
    const { state, player, towns } = board([6, 6]);
    const forecast = aiJson.score.scientific.countForecast.guildsmen;
    const quiet = bound(valueContext(state, player), towns[0]!, towns[1]!, 10);
    // No merchant yet: only the forecast's helpings.
    expect(scoreEffects(effectsOf(MERCHANT_GUILDS), quiet)).toBe(
      routeSlotTerm(Math.floor(forecast / 2), quiet)?.value ?? 0,
    );
    towns[0]!.specialists.merchant = 4;
    towns[1]!.specialists.scholar = 3;
    bumpRevision(state);
    const busy = bound(valueContext(state, player), towns[0]!, towns[1]!, 10);
    const slots = Math.floor((4 + forecast) / 2);
    expect(slots).toBeGreaterThan(1);
    expect(scoreEffects(effectsOf(MERCHANT_GUILDS), busy)).toBe(routeSlotTerm(slots, busy)!.value);
  });
});

// --- the luxury cards the books read ----------------------------------------------

describe('the luxury cards read by the books', () => {
  it('reads The Commenda, The Capitulations and The Casa da Índia by the marginal reading', () => {
    for (const id of [COMMENDA, CAPITULATIONS, CASA]) {
      expect(hasFoldReadEngine(effectsOf(id)), id).toBe(true);
    }
  });

  it('prices The Capitulations at the happiness a post’s loan brings', () => {
    const { state, player } = board([6]);
    const theirs = rivalTown(state, 6);
    giveLuxury(state, theirs, 26, 4, 'wine');
    expect(deckMargin(valueContext(state, player), CAPITULATIONS)?.total ?? 0).toBe(0);
    expect(scoreEffects(effectsOf(CAPITULATIONS), valueContext(state, player))).toBe(0);
    theirs.posts = [{ by: 0, since: state.turn - 20 }];
    bumpRevision(state);
    const ctx = valueContext(state, player);
    expect(deckMargin(ctx, CAPITULATIONS)!.total).toBeGreaterThan(0);
    // The plain walk, for a row the margin has no pair for: one kind lent at
    // the loan's share of a luxury's happiness.
    const share = RULES.trade.importedLuxuryPercent / 100;
    expect(scoreEffects(effectsOf(CAPITULATIONS), ctx)).toBe(
      share * RULES.meters.happiness.perUniqueLuxury * meterWeight(ctx, 'happiness'),
    );
  });
});

// --- the commissions ---------------------------------------------------------------

describe('the Commerce commissions', () => {
  it('prices Corner the Market’s institution at no less than the one luxury its goal leaves doubled', () => {
    const { state, player } = board([6]);
    const ctx = valueContext(state, player);
    const reward = explainCommission(CORNER, ctx)!.terms[0]!;
    const lasting = (reward.parts ?? []).find((term) => term.label.includes('for the rest of the game'))!;
    expect(lasting.value).toBe(2 * meterWeight(ctx, 'happiness'));
  });

  it('prices The Great Fair’s institution as the two routes it opens', () => {
    const { state, player, towns } = board([6, 6]);
    const ctx = bound(valueContext(state, player), towns[0]!, towns[1]!, 10);
    const reward = explainCommission(GREAT_FAIR, ctx)!.terms[0]!;
    const lasting = (reward.parts ?? []).find((term) => term.label.includes('for the rest of the game'))!;
    expect(lasting.value).toBe(routeSlotTerm(2, ctx)!.value);
  });

  it('prices The World’s Fair as the posts it writes', () => {
    const { state, player } = board([6]);
    const plain = valueContext(state, player);
    const reward = explainCommission(WORLDS_FAIR, plain)!.terms[0]!;
    const posts = (reward.parts ?? []).find((term) => term.label.includes('trading posts'))!;
    // No partner yet: the goal's four, at the knob alone.
    expect(posts.value).toBe(4 * COMMERCE.postWorth);
    // A seated Foreign Factor counts each new post's citizens, at the seat's
    // mean town while it has no partner.
    hold(state, 0, FOREIGN_FACTOR);
    const ctx = valueContext(state, player);
    const held = (explainCommission(WORLDS_FAIR, ctx)!.terms[0]!.parts ?? []).find((term) =>
      term.label.includes('trading posts'),
    )!;
    const perTown = (effectsOf(FOREIGN_FACTOR)[0] as CardPaysEffect).perTown!;
    const gain =
      Math.floor(6 / perTown) *
      (valueOfYields({ science: 1 }, ctx) + valueOfYields({ culture: 1 }, ctx));
    expect(held.value).toBeCloseTo(4 * (COMMERCE.postWorth + gain), 10);
  });
});

// --- the purse ------------------------------------------------------------------

describe('the purse', () => {
  it('sees the credit Letters of Credit opens', () => {
    const { state, player } = board([6]);
    player.gold = 40;
    bumpRevision(state);
    expect(purseOf(state, player, 'gold')).toBe(40);
    hold(state, 0, LETTERS);
    expect(purseOf(state, player, 'gold')).toBe(spendableGold(state, 0));
    expect(purseOf(state, player, 'gold')).toBe(190);
    expect(purseOf(state, player, 'faith')).toBe(player.faithPool);
  });

  it('charges a purchase that runs the treasury into debt, and nothing else', () => {
    const { state, player, towns } = board([6]);
    towns[0]!.buildings.push('monument');
    refreshCityDerived(state, towns[0]!);
    hold(state, 0, LETTERS);
    player.gold = 20;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const want = (price: number): Want => ({
      label: 'a thing',
      currency: 'gold',
      price,
      worth: 500,
      delay: 0,
      terms: [{ label: 'what it is worth', value: 500 }],
      outOfReach: false,
    });
    // Within the treasury: unchanged.
    const cheap = want(20);
    expect(withDebtCharge(state, player, ctx, cheap)).toBe(cheap);
    // Eighty coins below zero: the debt's share of science and culture for the
    // turns the treasury takes to climb back, as a one-time cost.
    const rates = foldEmpireRates(state, 0);
    const net = rates.goldPerTurn ?? 0;
    const turns = net > 0 ? Math.min(HORIZON, 80 / net) : HORIZON;
    const lost =
      (-RULES.upkeep.debtPercent / 100) *
      ((rates.sciencePerTurn ?? 0) * voiceWeight(ctx, 'science') +
        (rates.culturePerTurn ?? 0) * voiceWeight(ctx, 'culture'));
    const charge = (lost * turns) / aiJson.score.lumpTurns;
    expect(charge).toBeGreaterThan(0);
    const dear = withDebtCharge(state, player, ctx, want(100))!;
    expect(dear.worth).toBeCloseTo(500 - charge, 10);
    expect(dear.worth).toBe(foldTerms(dear.terms));
  });

  it('lets go a unit still on the payroll, never one whose upkeep a card has waived', () => {
    const { state, player, towns } = board([3]);
    const town = towns[0]!;
    hold(state, 0, MERCENARIES);
    createUnit(state, 0, 'warrior', town.col, town.row);
    // The waived one first, so the old reading (gross upkeep) would take it.
    const waived = createUnit(state, 0, 'warrior', town.col + 8, town.row + 4, undefined, undefined, 'gold');
    expect((waived.timed ?? []).length).toBe(1);
    const spare: Unit[] = [];
    for (let index = 0; index < 8; index++) {
      spare.push(createUnit(state, 0, 'warrior', town.col + 9 + (index % 4), town.row + 2 + Math.floor(index / 4)));
    }
    player.gold = -100;
    bumpRevision(state);
    const decision = nextBotDecision(state, 0);
    expect(decision?.command.type).toBe('disbandUnit');
    const taken = (decision!.command as { unitId: number }).unitId;
    expect(taken).not.toBe(waived.id);
    expect(spare.some((unit) => unit.id === taken)).toBe(true);
    const refusedWaived = decision!.candidates.find(
      (candidate) => candidate.rejected !== undefined && candidate.rejected.includes('not on the payroll'),
    );
    expect(refusedWaived).toBeDefined();
  });
});

// --- the deal appraisal ----------------------------------------------------------

describe('the deal appraisal', () => {
  /** Seat 1 holds two silks; seat 0 a wine and a purse. Both met, at peace. */
  function table(): GameState {
    const state = bench();
    const mine = foundCityAt(state, 0, at(state.map, 3, 4));
    const theirs = foundCityAt(state, 1, at(state.map, 12, 4));
    giveLuxury(state, theirs, 11, 3, 'silk');
    giveLuxury(state, theirs, 13, 5, 'silk');
    giveLuxury(state, mine, 4, 3, 'wine');
    seat(state, 0).gold = 500;
    seat(state, 0).metSeats.push(1);
    seat(state, 1).metSeats.push(0);
    recomputeAllVisibility(state);
    bumpRevision(state);
    return state;
  }

  /** The coin a counter asks of seat 0 for one of seat 1's silks. */
  function askedFor(state: GameState): number {
    const ctx = valueContext(state, seat(state, 1));
    const counter = counterTerms(state, 1, 0, {}, { luxuries: ['silk'] }, ctx);
    expect(counter).not.toBeNull();
    return counter!.give.gold ?? 0;
  }

  const markup = 1 + aiJson.war.counterMarkup;
  const rate = aiJson.war.luxuryGoldBaseline / aiJson.war.luxuryGptBaseline;

  it('asks the baseline over the markup for a lent copy from a seat with no lending card', () => {
    const state = table();
    expect(resourceCopies(state, 1, 'silk')).toBe(2);
    expect(askedFor(state)).toBe(Math.ceil(aiJson.war.luxuryGoldBaseline * markup));
  });

  it('asks less of a seat holding The Commenda, which still counts half of the copy', () => {
    const state = table();
    hold(state, 1, COMMENDA);
    expect(askedFor(state)).toBe(Math.ceil(aiJson.war.luxuryGoldBaseline * 0.5 * markup));
  });

  it('asks less of a seat holding Export Guilds, by what the copy lent pays its capital', () => {
    const state = table();
    hold(state, 1, EXPORT_GUILDS);
    const ctx = valueContext(state, seat(state, 1));
    const step = explainCountStep('copiesLent', 1, ctx);
    expect(step.total).toBeGreaterThan(0);
    const coin = (step.total / voiceWeight(ctx, 'gold')) * rate;
    const asked = Math.max(0, Math.ceil((aiJson.war.luxuryGoldBaseline - coin) * markup));
    expect(askedFor(state)).toBe(asked);
    expect(asked).toBeLessThan(Math.ceil(aiJson.war.luxuryGoldBaseline * markup));
  });

  it('counts a new deal partner for a seat holding The Treaty Ports, and only a new one', () => {
    const state = table();
    hold(state, 1, TREATY_PORTS);
    const ctx = valueContext(state, seat(state, 1));
    const swap = counterTerms(state, 1, 0, { luxuries: ['wine'] }, { luxuries: ['silk'] }, ctx)!;
    const partner = allTerms(swap.appraisal.terms).find((term) => term.label.startsWith('a new deal partner'));
    expect(partner).toBeDefined();
    const step = explainCountStep('dealPartners', 1, ctx);
    expect(partner!.value).toBeCloseTo((step.total / voiceWeight(ctx, 'gold')) * rate, 10);
    // The term's parts fold to its value, so the feed shows the conversion.
    expect(foldTerms(partner!.parts ?? [])).toBe(partner!.value);
    // With a deal already standing, the empire is a partner already.
    openDeal(state, 901, 0, 1, { goldPerTurn: 1 }, {});
    bumpRevision(state);
    const again = counterTerms(
      state,
      1,
      0,
      { luxuries: ['wine'] },
      { luxuries: ['silk'] },
      valueContext(state, seat(state, 1)),
    )!;
    expect(allTerms(again.appraisal.terms).some((term) => term.label.startsWith('a new deal partner'))).toBe(
      false,
    );
  });
});

describe('the Doctrines that refuse (batch DT7)', () => {
  const NO_FOREIGN: CardEffect[] = [{ kind: 'rule', rule: 'noForeignRoutes' }];
  const GOLD_TOWNS = { test: 'buildingsOfCategory', category: 'gold', atLeast: 1 } as const;
  const SHUT: CardEffect[] = [{ kind: 'rule', rule: 'buysOnlyInScope', scope: GOLD_TOWNS }];

  /** Gives a seat a Doctrine, as a chosen offer does. */
  function holdDoctrine(state: GameState, id: string): void {
    seat(state, 0).statecraft.doctrines.push(id as never);
    bumpRevision(state);
  }

  /** Asks seat 0 for decisions until it is done. A refused command is a bug in the bot. */
  function sit(state: GameState, steps = 80): { type: string; cityId?: number }[] {
    const sitting = botSitting(0);
    const sent: { type: string; cityId?: number }[] = [];
    for (let step = 0; step < steps; step++) {
      const decision = nextBotDecision(state, 0, sitting);
      if (decision === null) break;
      const result = applyCommand(state, decision.command);
      expect(result.ok, `${decision.kind}: ${result.ok ? '' : result.error}`).toBe(true);
      sent.push(decision.command as { type: string; cityId?: number });
    }
    return sent;
  }

  it('prices the ban at a share of the best route abroad, and at nothing when that route is at home', () => {
    const { state, player, towns } = board([6, 6]);
    const theirs = rivalTown(state, 8);
    const pair = (to: City) => ({
      from: towns[0]!,
      to,
      mode: 'land' as const,
      pay: appraise([{ label: 'the pair', value: 10 }]),
    });
    const base = valueContext(state, player);
    const abroad: ValueContext = { ...base, routes: { ...base.routes, open: pair(theirs), next: pair(theirs) } };
    expect(scoreEffects(NO_FOREIGN, abroad)).toBe(-COMMERCE.foreignRouteOption * 10);
    const home: ValueContext = { ...base, routes: { ...base.routes, open: pair(towns[1]!), next: pair(towns[1]!) } };
    expect(scoreEffects(NO_FOREIGN, home)).toBe(0);
  });

  it('prices the ban at what a route abroad pays its sender', () => {
    const { state, player, towns } = board([6]);
    const theirs = rivalTown(state, 8);
    towns[0]!.buildings.push('market');
    const cart = createUnit(state, 0, 'trader', towns[0]!.col, towns[0]!.row);
    startRouteAt(state, cart, towns[0]!, theirs, 'land');
    bumpRevision(state);
    const base = valueContext(state, player);
    const quiet: ValueContext = { ...base, routes: { ...base.routes, open: null, next: null } };
    const pays = valueOfYields(foldRouteYield(explainRouteSenderYield(state, cart)), quiet);
    expect(pays).toBeGreaterThan(0);
    expect(scoreEffects(NO_FOREIGN, quiet)).toBe(0 - pays);
  });

  it('prices The Flying Money’s rule by the share of towns it shuts', () => {
    const { state, player, towns } = board([6, 6, 6, 6]);
    towns[0]!.buildings.push('market');
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const spend = Math.max(0, foldEmpireRates(state, 0).goldPerTurn ?? 0);
    expect(spend).toBeGreaterThan(0);
    expect(scoreEffects(SHUT, ctx)).toBeCloseTo(-0.75 * COMMERCE.shutTownBuys * spend * voiceWeight(ctx, 'gold'), 8);
    for (const town of towns.slice(1)) town.buildings.push('market');
    bumpRevision(state);
    expect(scoreEffects(SHUT, valueContext(state, player))).toBe(0);
  });

  it('finds a home route under the ban when routes abroad would fill every gate ask', () => {
    // Three of seat 0's towns and enough of seat 1's that the foreign pairs alone
    // pass `search.routeGateProbes`, each far richer than a road at home.
    const state = bench();
    const towns = [3, 8, 13].map((col) => {
      const town = foundCityAt(state, 0, at(state.map, col, 2));
      town.population = 2;
      return town;
    });
    towns[0]!.buildings.push('market');
    const foreign: City[] = [];
    for (let index = 0; index < 10; index++) {
      const town = foundCityAt(state, 1, at(state.map, 2 + 3 * index, 8));
      town.population = 30;
      foreign.push(town);
    }
    state.turn = 40;
    seat(state, 0).metSeats.push(1);
    recomputeAllVisibility(state);
    bumpRevision(state);
    expect(3 * foreign.length).toBeGreaterThan(aiJson.search.routeGateProbes);
    holdDoctrine(state, 'theSeaBan');
    const open = valueContext(state, seat(state, 0)).routes.open;
    expect(open).not.toBeNull();
    expect(open!.to.ownerId).toBe(0);
  });

  it('sends no refused command under The Flying Money, and buys only where it may', () => {
    const { state, towns } = board([6, 6]);
    towns[0]!.buildings.push('market');
    for (const town of towns) {
      town.queue = [{ kind: 'unit', id: 'warrior' }];
    }
    seat(state, 0).gold = 5000;
    holdDoctrine(state, 'theFlyingMoney');
    const sent = sit(state);
    const buys = sent.filter((command) => command.type === 'purchaseItem');
    expect(buys.length).toBeGreaterThan(0);
    for (const buy of buys) expect(buy.cityId).toBe(towns[0]!.id);
  });

  it('leaves an idle caravan standing under The Sea Ban when its only partner is abroad', () => {
    const { state, towns } = board([6]);
    rivalTown(state, 12);
    towns[0]!.buildings.push('market');
    seat(state, 0).metSeats.push(1);
    const cart = createUnit(state, 0, 'trader', towns[0]!.col, towns[0]!.row);
    bumpRevision(state);
    holdDoctrine(state, 'theSeaBan');
    sit(state);
    expect(cart.trade).toBeUndefined();
  });

  it('sends no refused command under The Sea Ban, with routes on offer abroad', () => {
    const { state, towns } = board([6, 6]);
    const theirs = rivalTown(state, 12);
    towns[0]!.buildings.push('market', 'market');
    seat(state, 0).metSeats.push(1);
    seat(state, 0).gold = 5000;
    bumpRevision(state);
    holdDoctrine(state, 'theSeaBan');
    const sent = sit(state);
    for (const command of sent) {
      if (command.type !== 'buyRoute' && command.type !== 'startRoute') continue;
      expect((command as unknown as { toCityId: number }).toCityId).not.toBe(theirs.id);
    }
  });
});

describe('The Grand Canal (batch DT18)', () => {
  const CANAL: CardEffect[] = [{ kind: 'rule', rule: 'routesCarrySurplus', percent: 50 }];

  /** Gives a seat a Doctrine, as a chosen offer does. */
  function holdCanal(state: GameState): void {
    seat(state, 0).statecraft.doctrines.push('theGrandCanal' as never);
    bumpRevision(state);
  }

  /** A context with no next route, so only the routes on the board are read. */
  function quiet(state: GameState, player: Player): ValueContext {
    const base = valueContext(state, player);
    return { ...base, routes: { ...base.routes, open: null, next: null } };
  }

  /** What one food moved to a larger town is worth, off the sheet. */
  function perFood(ctx: ValueContext): number {
    return COMMERCE.surplusCarried * voiceWeight(ctx, 'food');
  }

  it('prices a route from a small town to a larger one at the food it moves', () => {
    const { state, player, towns } = board([3, 5]);
    caravan(state, towns[0]!, towns[1]!);
    const ctx = quiet(state, player);
    const surplus = channelSurplus(state, towns[0]!);
    expect(surplus).toBeGreaterThan(0);
    expect(scoreEffects(CANAL, ctx)).toBeCloseTo((surplus / 2) * perFood(ctx), 8);
  });

  it('prices a route from a large town to a smaller one below nothing', () => {
    const { state, player, towns } = board([3, 2]);
    caravan(state, towns[0]!, towns[1]!);
    const ctx = quiet(state, player);
    const surplus = channelSurplus(state, towns[0]!);
    expect(surplus).toBeGreaterThan(0);
    expect(scoreEffects(CANAL, ctx)).toBeCloseTo(-(surplus / 2) * perFood(ctx), 8);
  });

  it('prices two towns of one size at nothing, and a seat with no route at nothing', () => {
    const level = board([3, 3]);
    caravan(level.state, level.towns[0]!, level.towns[1]!);
    expect(scoreEffects(CANAL, quiet(level.state, level.player))).toBe(0);
    const bare = board([3, 5]);
    expect(scoreEffects(CANAL, quiet(bare.state, bare.player))).toBe(0);
  });

  it('prices a foreign route at nothing', () => {
    const { state, player, towns } = board([3]);
    state.wars = [];
    const theirs = rivalTown(state, 8);
    towns[0]!.buildings.push('market');
    const cart = createUnit(state, 0, 'trader', towns[0]!.col, towns[0]!.row);
    startRouteAt(state, cart, towns[0]!, theirs, 'land');
    bumpRevision(state);
    expect(scoreEffects(CANAL, quiet(state, player))).toBe(0);
  });

  it('adds the next route the seat could send, when it stays at home', () => {
    const { state, player, towns } = board([3, 5]);
    const base = valueContext(state, player);
    const next = { from: towns[0]!, to: towns[1]!, mode: 'land' as const, pay: appraise([]) };
    const ctx: ValueContext = { ...base, routes: { ...base.routes, open: next } };
    const surplus = channelSurplus(state, towns[0]!);
    expect(scoreEffects(CANAL, ctx)).toBeCloseTo((surplus / 2) * perFood(ctx), 8);
  });

  it('reads the same food in the route planner, only for a seat that holds the card', () => {
    const { state, player, towns } = board([2, 3]);
    const small = towns[0]!;
    const large = towns[1]!;
    const before = valueContext(state, player);
    expect(foodCarriedTerm(small, large, before)).toBeNull();
    const plain = explainRoutePay(state, small, large, before).total;
    const reverse = explainRoutePay(state, large, small, before).total;
    holdCanal(state);
    const ctx = valueContext(state, player);
    const surplus = channelSurplus(state, small);
    const worth = (surplus / 2) * perFood(ctx);
    expect(worth).toBeGreaterThan(0);
    expect(explainRoutePay(state, small, large, ctx).total).toBeCloseTo(plain + worth, 8);
    const term = foodCarriedTerm(small, large, ctx)!;
    expect(term.label).toContain(small.name);
    expect(term.label).toContain(large.name);
    // The other way drains the town the seat wants large.
    const drained = channelSurplus(state, large);
    expect(drained).toBeGreaterThan(0);
    expect(explainRoutePay(state, large, small, ctx).total).toBeCloseTo(reverse - (drained / 2) * perFood(ctx), 8);
  });

  it('sees that a third route out of a town moves nothing more', () => {
    const { state, player, towns } = board([3, 5, 5, 5]);
    const farm = towns[1]!;
    farm.population = 2;
    refreshCityDerived(state, farm);
    caravan(state, farm, towns[2]!);
    const ctx = () => valueContext(state, player);
    holdCanal(state);
    // The second route takes the other half, which is what the card's words say.
    expect(foodCarriedTerm(farm, towns[3]!, ctx())!.value).toBeCloseTo(
      (channelSurplus(state, farm) / 2) * perFood(ctx()),
      8,
    );
    caravan(state, farm, towns[3]!);
    expect(channelSurplus(state, farm)).toBeGreaterThan(0);
    expect(foodCarriedTerm(farm, towns[0]!, ctx())).toBeNull();
    // A route up for renewal is not a route more: it reads what it carries now.
    expect(foodCarriedTerm(farm, towns[3]!, ctx())!.value).toBeCloseTo(
      (channelSurplus(state, farm) / 2) * perFood(ctx()),
      8,
    );
  });

  it('prices nothing for a route a blockade stops', () => {
    const { state, player, towns } = board([3, 5]);
    caravan(state, towns[0]!, towns[1]!);
    for (let row = 0; row < state.map.height; row++) at(state.map, 10, row).terrain = 'coast' as never;
    bumpRevision(state);
    expect(scoreEffects(CANAL, quiet(state, player))).toBeGreaterThan(0);
    createUnit(state, 1, 'carrack', 10, 5);
    bumpRevision(state);
    expect(cityBlockaded(state, towns[1]!)).toBe(true);
    expect(scoreEffects(CANAL, quiet(state, player))).toBe(0);
  });

  it('prices nothing for a town whose surplus a mover already takes', () => {
    const { state, player, towns } = board([3, 5]);
    caravan(state, towns[0]!, towns[1]!);
    towns[0]!.queue = [{ kind: 'unit', id: 'warrior' }];
    seat(state, 0).statecraft.doctrines.push('theLawsOfLordShang' as never);
    bumpRevision(state);
    expect(scoreEffects(CANAL, quiet(state, player))).toBe(0);
  });
});
