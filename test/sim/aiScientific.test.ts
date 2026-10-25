/**
 * **Scientific batch S13: bot pricing** (`docs/plans/scientific-build-triage.md`,
 * the S13 section).
 *
 * Before this batch a technology charter scored nothing, the bot priced a
 * technology at its column alone, and the Scientific shapes of batches S0 to S9
 * met a zero or the general stand-in. This file pins the three things S13 adds:
 *
 *   · **a charter's price**: what knowing its technology gives (its traits as
 *     strength lines, its buildings, its work rows, its own effects),
 *     discounted for the research turns at the folded price;
 *   · **the folded price in research**: the chains, the plan's landings and
 *     the cheapest fallback read `foldTechCost(explainTechCost(...))`, so a
 *     drafted charter technology carries its premium;
 *   · **a price for each new Scientific shape**, read off the board where the
 *     board can say it and off one knob in `score.scientific` where it cannot.
 *
 * Every figure is computed here off the sheet or off the context the arm read,
 * the discipline of `aiAppraisal.test.ts` and `aiCommissions.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import { withAiTuning } from '../../src/ai/aiConfig';
import { researchRoad, techChain } from '../../src/ai/chain';
import { foldTerms } from '../../src/ai/decision';
import { reachableTechs } from '../../src/ai/plan';
import {
  type ValueContext,
  buildTurns,
  delayDiscount,
  explainBuildingRow,
  explainCardEffects,
  explainCharter,
  explainCharterKnowledge,
  explainCommission,
  explainCounted,
  explainEffects,
  explainLump,
  explainTechTraits,
  explainTechWorks,
  explainYields,
  lumpOfPoints,
  scoreEffects,
  techCostFor,
  valueOfYields,
  voiceWeight,
} from '../../src/ai/value';
import aiJson from '../../data/ai.json';

import { buildingDef, isWonder } from '../../src/sim/buildingData';
import { buildingProductionCost, foundCityAt, ownedTiles } from '../../src/sim/cities';
import { type GameMap, type Tile, createMap, getTileAt, tileNeighbors } from '../../src/sim/map';
import { renownPerTurn, renownThreshold } from '../../src/sim/renown';
import { RULES } from '../../src/sim/rulesData';
import {
  type City,
  type GameState,
  type Player,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import {
  ORDER_IDS,
  type CardEffect,
  type CardPaysEffect,
  type OrderId,
  orderDef,
} from '../../src/sim/statecraftData';
import { explainTechCost, foldTechCost, researchExpansion } from '../../src/sim/tech';
import { type TechId, techDef } from '../../src/sim/techData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

const HORIZON = aiJson.priorities.horizonTurns;
const COMMISSION = aiJson.score.commission;
const SCIENTIFIC = aiJson.score.scientific;

// --- the bench ---------------------------------------------------------------

/** A blank board with two seats and nothing on it: `aiCommissions`' bench. */
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

/** Seat 0 with `towns` towns of six, on turn `turn`. */
function board(towns = 1, turn = 20): { state: GameState; player: Player; cities: City[] } {
  const state = bench();
  const cities: City[] = [];
  for (let index = 0; index < towns; index++) {
    const city = foundCityAt(state, 0, at(state.map, 3 + 6 * index, 5));
    city.population = 6;
    cities.push(city);
  }
  state.turn = turn;
  recomputeAllVisibility(state);
  bumpRevision(state);
  return { state, player: seat(state, 0), cities };
}

/** Seat 1 is met, and knows these technologies. */
function meet(state: GameState, player: Player, techs: string[]): void {
  const rival = seat(state, 1);
  player.metSeats = [1];
  rival.metSeats = [0];
  rival.techsResearched = techs as TechId[];
  bumpRevision(state);
}

/** The folded price of a road, written out off the simulation's own fold. */
function foldedRoad(state: GameState, player: Player, tech: TechId): number {
  let beakers = 0;
  for (const step of researchExpansion(state, player.id, tech)) {
    beakers += foldTechCost(explainTechCost(state, player, step));
  }
  return beakers;
}

/** The forecast rate of a counted occasion, written out off the sheet. */
function smoothed(record: number, forecastOverHorizon: number, turn: number): number {
  const fallback = (forecastOverHorizon * COMMISSION.priorShare) / HORIZON;
  return (record + fallback * COMMISSION.priorTurns) / (turn + COMMISSION.priorTurns);
}

/** The same sheet with one Scientific knob set. */
function tuned(knob: keyof typeof SCIENTIFIC, value: unknown): Parameters<typeof withAiTuning>[0] {
  return { score: { scientific: { [knob]: value } } } as Parameters<typeof withAiTuning>[0];
}

/** A strength line's price, before any share: points × military × threat. */
function strength(ctx: ValueContext, points: number): number {
  return points * ctx.ai.weights.military * (1 + ctx.threat);
}

const LIVE_CHARTERS = ORDER_IDS.filter((id) => {
  const def = orderDef(id);
  return def.charter?.unlocks.tech !== undefined && def.retired !== true && def.deferred === undefined;
});

// --- a charter's price ---------------------------------------------------------

describe('a technology charter is priced as what knowing its technology gives (S13)', () => {
  it('prices every live charter, on top of the row’s own walk', () => {
    const { state, player } = board(3);
    const ctx = valueContext(state, player);
    // The thirteen of the placeholder table.
    expect(LIVE_CHARTERS.length).toBe(13);
    for (const id of LIVE_CHARTERS) {
      const priced = explainCharter(id, ctx)!;
      expect(priced, id).not.toBeNull();
      expect(foldTerms(priced.terms), id).toBe(priced.total);
      expect(Number.isFinite(priced.total), id).toBe(true);
      const def = orderDef(id);
      const card = explainCardEffects(id, def.effects, ctx);
      expect(card.total, id).toBe(explainEffects(def.effects, ctx, id).total + priced.total);
    }
    // A row that opens no technology is no charter.
    expect(explainCharter('scientificTheAlmanac' as OrderId, ctx)).toBeNull();
  });

  it('discounts what knowing it gives by the research turns, at the folded price', () => {
    const { state, player } = board(2);
    const ctx = valueContext(state, player);
    const id = 'theBronzeFoundersCharter' as OrderId;
    const tech = 'casting' as TechId;
    const priced = explainCharter(id, ctx)!;
    // The premium is in the price the wait is read off: Casting alone costs its
    // column and half again.
    const premium = RULES.research.charterPremiumPercent;
    expect(techCostFor(ctx, tech)).toBe(Math.floor((techDef(tech).cost * (100 + premium)) / 100));
    expect(techCostFor(ctx, tech)).toBeGreaterThan(techDef(tech).cost);
    const beakers = foldedRoad(state, player, tech);
    expect(priced.terms[0]!.value).toBe(explainCharterKnowledge(tech, ctx).total);
    expect(priced.terms[1]!.op).toBe('mul');
    expect(priced.terms[1]!.value).toBe(delayDiscount(beakers / Math.max(1, ctx.scienceRate), ctx));
    expect(priced.total).toBeGreaterThan(0);
  });

  it('is worth nothing once its technology is opened or known', () => {
    const { state, player } = board(1);
    const id = 'theBronzeFoundersCharter' as OrderId;
    expect(explainCharter(id, valueContext(state, player))!.total).toBeGreaterThan(0);
    player.charteredTechs.push('casting' as TechId);
    bumpRevision(state);
    expect(explainCharter(id, valueContext(state, player))!.total).toBe(0);
  });

  it('prices a trait as its lines, at the share of the army on its line', () => {
    const { state, player, cities } = board(1);
    const tech = 'casting' as TechId;
    const traits = techDef(tech).traits!;
    const lines = (ctx: ValueContext, index: number): number =>
      explainEffects(traits[index]!.effects, ctx).total;
    // No army at all: each line is assumed to make up the knob's share.
    const bare = valueContext(state, player);
    const none = explainTechTraits(tech, bare);
    expect(none.terms[0]!.value).toBe(lines(bare, 0) * SCIENTIFIC.traitLine);
    expect(none.terms[1]!.value).toBe(lines(bare, 1) * SCIENTIFIC.traitLine);
    // Two spearmen and nothing else: the Hoplite reaches the whole army.
    createUnit(state, 0, 'spearman', cities[0]!.col + 1, cities[0]!.row);
    createUnit(state, 0, 'spearman', cities[0]!.col - 1, cities[0]!.row);
    bumpRevision(state);
    const armed = valueContext(state, player);
    const held = explainTechTraits(tech, armed);
    expect(held.terms[0]!.value).toBe(lines(armed, 0) * 1);
    expect(held.terms[1]!.value).toBe(lines(armed, 1) * SCIENTIFIC.traitLine);
    // The knob is the floor, and the panel moves it.
    const wider = withAiTuning(tuned('traitLine', SCIENTIFIC.traitLine * 2), () => {
      const ctx = valueContext(state, player);
      return explainTechTraits(tech, ctx).terms[1]!.value / lines(ctx, 1);
    });
    expect(wider).toBe(SCIENTIFIC.traitLine * 2);
  });

  it('prices a great house as one copy, and an ordinary shelf in every town', () => {
    const { state, player } = board(3);
    const ctx = valueContext(state, player);
    /** `scoreUnlockedBuilding`'s arithmetic, written out, for so many copies. */
    const shelf = (id: 'mouseion' | 'specularium', copies: number): number => {
      const def = buildingDef(id);
      const bag: Record<string, number> = {};
      for (const voice of ['food', 'production', 'gold', 'science', 'culture', 'faith']) {
        bag[voice] = (def as unknown as Record<string, number | undefined>)[voice] ?? 0;
      }
      const each = valueOfYields(bag, ctx) + explainBuildingRow(id, ctx).total;
      if (each <= 0) return 0;
      const turns = buildTurns(buildingProductionCost(id, state, player.id), ctx);
      return each * copies * delayDiscount(turns, ctx);
    };
    const knowing = (tech: TechId, label: string): number =>
      explainCharterKnowledge(tech, ctx).terms.find((term) => term.label.startsWith(label))!.value;
    expect(buildingDef('mouseion').oncePerEmpire).toBe(true);
    expect(knowing('cataloguing' as TechId, 'the Mouseion')).toBe(shelf('mouseion', 1));
    expect(knowing('optics' as TechId, 'the Specularium')).toBe(shelf('specularium', 3));
    expect(knowing('optics' as TechId, 'the Specularium')).toBeGreaterThan(0);
  });

  it('prices the works the towns would lay, where the ground allows them', () => {
    // The Qanat stands on any flat land, so each town lays one (the knob), and
    // its one gift is water for the farms beside it.
    const { state, player } = board(2);
    const ctx = valueContext(state, player);
    const qanat = explainTechWorks('surveying' as TechId, ctx);
    expect(qanat.terms).toHaveLength(1);
    expect(qanat.total).toBe(SCIENTIFIC.workGift * 2 * SCIENTIFIC.worksPerTown);
    const more = withAiTuning(tuned('worksPerTown', 2), () =>
      explainTechWorks('surveying' as TechId, valueContext(state, player)).total,
    );
    expect(more).toBe(SCIENTIFIC.workGift * 2 * 2);
    // The Physic Garden needs fresh water, and this dry bench has none: no
    // garden, and Herbals' happiness for each garden counts nothing.
    const herbals = 'herbals' as TechId;
    expect(explainTechWorks(herbals, ctx).total).toBe(0);
    const dry = explainCharterKnowledge(herbals, ctx).total;
    expect(dry).toBe(0);
    // Water one hex of each town: a garden a town, its science, and the
    // happiness Herbals pays for each garden.
    for (const city of state.cities) {
      const tile = ownedTiles(state, city).find((hex) => hex.col !== city.col || hex.row !== city.row)!;
      tile.freshwater = true;
    }
    bumpRevision(state);
    const wet = valueContext(state, player);
    const garden = explainTechWorks(herbals, wet);
    const science = explainYields({ science: 2 }, wet).total;
    expect(garden.total).toBe(science * 2);
    const knowledge = explainCharterKnowledge(herbals, wet);
    const rules = knowledge.terms.find((term) => term.label.startsWith('the rules'))!;
    // Two gardens counted, at what one helping pays: two happiness.
    expect(rules.value).toBe(2 * (2 * wet.prices.happiness));
  });
});

// --- research at the folded price ---------------------------------------------

describe('research reads the folded price (S13)', () => {
  it('prices a drafted charter technology’s road at its folded cost', () => {
    const { state, player } = board(1);
    player.charteredTechs.push('casting' as TechId);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const tech = 'casting' as TechId;
    const road = researchRoad(state, player, ctx, tech);
    let column = 0;
    for (const step of road.road) column += techDef(step).cost;
    expect(road.beakers).toBe(foldedRoad(state, player, tech));
    expect(road.beakers).toBeGreaterThan(column);
    // The plan's landing reads the same price.
    const landing = reachableTechs(ctx).get(tech)!;
    expect(landing).toBe(Math.max(0, road.beakers - player.sciencePool) / Math.max(1, ctx.scienceRate));
  });

  it('never lands a charter technology this seat has not drafted', () => {
    const { state, player } = board(1);
    expect(reachableTechs(valueContext(state, player)).has('casting' as TechId)).toBe(false);
    player.charteredTechs.push('casting' as TechId);
    bumpRevision(state);
    expect(reachableTechs(valueContext(state, player)).has('casting' as TechId)).toBe(true);
  });

  it('prices a drafted charter technology’s traits in its chain', () => {
    const { state, player } = board(1);
    player.charteredTechs.push('casting' as TechId);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const chain = techChain(state, player, ctx, 'casting' as TechId);
    const gifts = chain.terms[0]!.parts!;
    const traits = gifts.find((term) => term.label.startsWith('the traits'));
    expect(traits).toBeDefined();
    // The trait waits for its node like every other gift of the road.
    expect(traits!.parts![0]!.value).toBe(explainTechTraits('casting' as TechId, ctx).total);
    expect(traits!.value).toBeGreaterThan(0);
  });
});

// --- the Scientific commissions -------------------------------------------------

describe('a Scientific commission is forecast from the research itself (S13)', () => {
  /** The wait half: the discount the price is multiplied by. */
  function waitOf(id: OrderId, ctx: ValueContext): number {
    const term = explainCommission(id, ctx)!.terms[1]!;
    expect(term.op).toBe('mul');
    return term.value;
  }

  it('waits for the nearest charter technology opened, for The Royal Charter Commission', () => {
    const { state, player } = board(1);
    player.charteredTechs.push('casting' as TechId, 'herbals' as TechId);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const id = 'theRoyalCharterCommission' as OrderId;
    const beakers = Math.min(
      foldedRoad(state, player, 'casting' as TechId),
      foldedRoad(state, player, 'herbals' as TechId),
    );
    const turns = Math.min(HORIZON, Math.max(1, Math.ceil(beakers / Math.max(1, ctx.scienceRate))));
    expect(waitOf(id, ctx)).toBe(delayDiscount(turns, ctx));
  });

  it('keeps the rate reading for The Royal Charter Commission with no charter opened', () => {
    const { state, player } = board(1, 20);
    const ctx = valueContext(state, player);
    const rate = smoothed(0, aiJson.score.tallyForecast.charterTechCompleted, 20);
    const turns = Math.min(HORIZON, Math.ceil(1 / rate));
    expect(waitOf('theRoyalCharterCommission' as OrderId, ctx)).toBe(delayDiscount(turns, ctx));
  });

  it('waits for Alchemy at its folded price, for The Great Instrument', () => {
    const { state, player } = board(1);
    const ctx = valueContext(state, player);
    const beakers = foldedRoad(state, player, 'alchemy' as TechId);
    const turns = Math.min(HORIZON, Math.max(1, Math.ceil(beakers / Math.max(1, ctx.scienceRate))));
    expect(waitOf('theGreatInstrument' as OrderId, ctx)).toBe(delayDiscount(turns, ctx));
  });
});

// --- the Scientific stand-ins ------------------------------------------------------

describe('a price for each Scientific shape of S0 to S9 (S13)', () => {
  it('prices The Commonplace Book and The Patent Office by the beakers they save', () => {
    const { state, player } = board(1, 20);
    player.charteredTechs.push('casting' as TechId);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    // One charter opened, and the forecast expects no more than that.
    const folded = techCostFor(ctx, 'casting' as TechId);
    const premium = techDef('casting' as TechId).cost * (RULES.research.charterPremiumPercent / 100);
    const book = orderDef('theCommonplaceBook' as OrderId).effects;
    const office = orderDef('thePatentOffice' as OrderId).effects;
    expect(scoreEffects(book, ctx)).toBe(explainLump({ science: 0.15 * folded }, ctx).total);
    expect(scoreEffects(office, ctx)).toBe(explainLump({ science: 1 * premium }, ctx).total);
    expect(scoreEffects(book, ctx)).toBeGreaterThan(0);
  });

  it('prices The Almanac’s cheaper Libraries by the hammers saved in towns without one (R1)', () => {
    // Batch R1 made the discount a cost rule (`buildingCost`). It is worth a
    // quarter of a Library's price once in each town that has none yet, as a
    // lump, and nothing in a town that has one.
    const { state, player, cities } = board(2, 20);
    const [rule] = orderDef('scientificTheAlmanac' as OrderId).effects;
    expect(rule).toMatchObject({ kind: 'rulePercent', rule: 'buildingCost', building: 'library' });
    let ctx = valueContext(state, player);
    const price = buildingProductionCost('library', state, 0);
    expect(scoreEffects([rule!], ctx)).toBe(explainLump({ production: 0.25 * price * 2 }, ctx).total);
    expect(scoreEffects([rule!], ctx)).toBeGreaterThan(0);
    cities[0]!.buildings.push('library');
    cities[1]!.buildings.push('library');
    bumpRevision(state);
    ctx = valueContext(state, player);
    expect(scoreEffects([rule!], ctx)).toBe(0);
  });

  it('prices The Translation Movement by the beakers it saves on the gap', () => {
    const { state, player } = board(1, 20);
    const effects = orderDef('theTranslationMovement' as OrderId).effects;
    expect(scoreEffects(effects, valueContext(state, player))).toBe(0);
    meet(state, player, [...player.techsResearched, 'mining', 'earthenware']);
    const ctx = valueContext(state, player);
    const gap = techCostFor(ctx, 'mining' as TechId) + techCostFor(ctx, 'earthenware' as TechId);
    expect(scoreEffects(effects, ctx)).toBe(explainLump({ science: 0.2 * gap }, ctx).total);
  });

  it('prices The Royal Readers by the renown each great person costs less', () => {
    const { state, player, cities } = board(1, 20);
    const effects = orderDef('theRoyalReaders' as OrderId).effects;
    expect(scoreEffects(effects, valueContext(state, player))).toBe(0);
    cities[0]!.buildings.push('library');
    player.greatPeopleRecruited = 2;
    player.greatPeopleByFamily = { scholar: 2 };
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const curve = RULES.renown;
    const price = (at: number): number => Math.floor(curve.base + curve.linear * at + at ** curve.exponent);
    // Two scholars at half a step each: one step fewer.
    const saved = price(2) - price(1);
    const pace = renownPerTurn(state, 0) / renownThreshold(state, player);
    expect(pace).toBeGreaterThan(0);
    expect(scoreEffects(effects, ctx)).toBe(saved * pace * ctx.ai.weights.renown);
  });

  it('prices The Age of Reason by the technology riders seated', () => {
    const { state, player } = board(1, 20);
    const effects = orderDef('theAgeOfReason' as OrderId).effects;
    expect(scoreEffects(effects, valueContext(state, player))).toBe(0);
    const workshops = 'theRoyalWorkshops' as OrderId;
    player.statecraft.orders.push(workshops);
    player.statecraft.slots[0] = { card: workshops, sealedUntil: state.turn };
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const rider = scoreEffects(orderDef(workshops).effects, ctx);
    expect(rider).toBeGreaterThan(0);
    expect(scoreEffects(effects, ctx)).toBe(rider);
  });

  it('prices the line rules and the army rules off their knobs', () => {
    const { state, player, cities } = board(1, 20);
    const ctx = valueContext(state, player);
    const rule = (name: string): CardEffect[] => [{ kind: 'rule', rule: name } as CardEffect];
    const points = ctx.ai.weights.military * (1 + ctx.threat);
    expect(scoreEffects(rule('moveAfterAttack'), ctx)).toBe(SCIENTIFIC.moveAfterAttack * points);
    expect(scoreEffects(rule('blockades'), ctx)).toBe(SCIENTIFIC.blockades * points);
    // The two upgrade rules count the combat units with an upgrade ahead: two
    // warriors, and not the worker.
    expect(scoreEffects(rule('upgradeHeals'), ctx)).toBe(0);
    createUnit(state, 0, 'warrior', cities[0]!.col + 1, cities[0]!.row);
    createUnit(state, 0, 'warrior', cities[0]!.col - 1, cities[0]!.row);
    createUnit(state, 0, 'worker', cities[0]!.col, cities[0]!.row + 1);
    bumpRevision(state);
    const armed = valueContext(state, player);
    const military = armed.ai.weights.military * (1 + armed.threat);
    expect(scoreEffects(rule('upgradeHeals'), armed)).toBe(SCIENTIFIC.upgradeHeals * 2 * military);
    expect(scoreEffects(rule('upgradeIgnoresResource'), armed)).toBe(
      SCIENTIFIC.upgradeIgnoresResource * 2 * military,
    );
    const twice = withAiTuning(tuned('blockades', SCIENTIFIC.blockades * 2), () =>
      scoreEffects(rule('blockades'), valueContext(state, player)),
    );
    expect(twice).toBe(2 * scoreEffects(rule('blockades'), armed));
  });

  it('prices the Opus rules off the race and the rivals raising it', () => {
    const { state, player } = board(1, 20);
    const breach: CardEffect[] = [{ kind: 'rule', rule: 'opusBreach', percent: 5 }];
    expect(scoreEffects(breach, valueContext(state, player))).toBe(0);
    const rival = foundCityAt(state, 1, at(state.map, 18, 5));
    rival.queue = [{ kind: 'building', id: 'theMagnumOpus' as never }];
    player.metSeats = [1];
    bumpRevision(state);
    expect(scoreEffects(breach, valueContext(state, player))).toBe(SCIENTIFIC.opusBreach);
    // The race is out of reach on this young board, so the early start and the
    // closed door are worth nothing yet.
    const ctx = valueContext(state, player);
    const race = ctx.race === null || ctx.race.open ? 0 : Math.max(0, ctx.race.worth);
    expect(scoreEffects([{ kind: 'rule', rule: 'opusEarly', percent: 50 }], ctx)).toBe(SCIENTIFIC.opusEarly * race);
    expect(scoreEffects([{ kind: 'rule', rule: 'closedBook', turns: 10 }], ctx)).toBe(SCIENTIFIC.closedBook * race);
  });

  it('prices The Prototype Works by the rows the current research opens', () => {
    const { state, player } = board(1, 20);
    const effects = orderDef('thePrototypeWorks' as OrderId).effects;
    expect(scoreEffects(effects, valueContext(state, player))).toBe(0);
    player.researching = 'bronzeWorking' as TechId;
    bumpRevision(state);
    const unlocks = techDef('bronzeWorking' as TechId).unlocks;
    const rows =
      (unlocks.buildings ?? []).filter((id) => !isWonder(id)).length + (unlocks.units ?? []).length;
    expect(rows).toBeGreaterThan(0);
    expect(scoreEffects(effects, valueContext(state, player))).toBe(SCIENTIFIC.prototypes * rows);
  });

  it('prices The Studium Generale and The School of Mines off the works in the borders', () => {
    const { state, player, cities } = board(1, 20);
    const studium = orderDef('theStudiumGenerale' as OrderId).effects;
    const mines = orderDef('theStrategicReserves' as OrderId).effects;
    expect(scoreEffects(studium, valueContext(state, player))).toBe(0);
    expect(scoreEffects(mines, valueContext(state, player))).toBe(0);
    // An Academy, and a manufactory beside it, both inside the town's borders.
    const ring = ownedTiles(state, cities[0]!).filter(
      (hex) => hex.col !== cities[0]!.col || hex.row !== cities[0]!.row,
    );
    const academy = ring[0]!;
    const near = tileNeighbors(state.map, academy);
    const beside = ring.find((hex) => hex !== academy && near.includes(hex))!;
    academy.improvement = 'academy' as never;
    beside.improvement = 'manufactory' as never;
    bumpRevision(state);
    // The manufactory stands beside an Academy; the Academy beside no other.
    expect(scoreEffects(studium, valueContext(state, player))).toBe(SCIENTIFIC.worksCountAs);
    // Iron under the Academy: one deposit under the work, one more copy.
    academy.resource = 'iron' as never;
    for (const step of researchExpansion(state, player.id, 'ironWorking' as TechId)) {
      if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
    }
    bumpRevision(state);
    expect(scoreEffects(mines, valueContext(state, player))).toBe(1 * 1 * SCIENTIFIC.strategicCopy);
  });

  it('prices the Scientific combat conditions at their shares', () => {
    const { state, player } = board(1, 20);
    const ctx = valueContext(state, player);
    const scholars = orderDef('scientificTheSoldierScholars' as OrderId).effects[0]!;
    const strategikon = orderDef('theStrategikon' as OrderId).effects[0]!;
    expect(scoreEffects([scholars], ctx)).toBe(strength(ctx, 5) * 1 * SCIENTIFIC.inOwnTown);
    expect(scoreEffects([strategikon], ctx)).toBe(strength(ctx, 4) * 1 * SCIENTIFIC.nearLearning);
    // The Edge of the Sword: nothing with nobody met, then the share of the
    // met empires that know fewer technologies.
    const edge = orderDef('theEdgeOfTheSword' as OrderId).effects[0]!;
    expect(scoreEffects([edge], ctx)).toBe(0);
    meet(state, player, []);
    const met = valueContext(state, player);
    expect(scoreEffects([edge], met)).toBe(strength(met, 3) * 1 * (1 * SCIENTIFIC.vsFewerTechs));
  });

  it('prices the Scientific scales at the count known and expected', () => {
    const { state, player, cities } = board(1, 20);
    // The Proving Ground: +1 for each technology of the lead, at most +8.
    const proving = orderDef('theProvingGround' as OrderId).effects[0]!;
    meet(state, player, []);
    const ctx = valueContext(state, player);
    const lead = player.techsResearched.length;
    expect(lead).toBeGreaterThan(0);
    const points = Math.min(1 * ((lead + SCIENTIFIC.countForecast.techLead) / 1), 8);
    expect(scoreEffects([proving], ctx)).toBe(strength(ctx, points) * 1 * 1);
    // The Hoplite's line: +1 for each four citizens of the town it stands in,
    // at the share of fights fought in one's own town.
    const hoplite = techDef('casting' as TechId).traits![0]!.effects[1]!;
    cities[0]!.population = 9;
    bumpRevision(state);
    const big = valueContext(state, player);
    expect(scoreEffects([hoplite], big)).toBe(strength(big, 1 * (2 * SCIENTIFIC.inOwnTown)) * 1 * 1);
  });

  it('prices The Great Catalogue per charter technology, and The Great Designs at its share', () => {
    const { state, player } = board(2, 20);
    const catalogue = orderDef('theGreatCatalogue' as OrderId).effects[0]!;
    const designs = orderDef('theGreatDesigns' as OrderId).effects[0]!;
    const flat = (effect: CardEffect): CardEffect => {
      const open = { ...effect } as Record<string, unknown>;
      delete open.count;
      delete open.max;
      delete open.aheadOfMet;
      return open as unknown as CardEffect;
    };
    player.charteredTechs.push('casting' as TechId, 'herbals' as TechId);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    // The arm's own term, before the hammer premium beside it.
    const arm = (effect: CardEffect): number => explainEffects([effect], ctx).terms[0]!.value;
    // Two charters opened and not known; the pace expects fewer than that.
    expect(arm(catalogue)).toBe(arm(flat(catalogue)) * 2);
    expect(arm(designs)).toBe(arm(flat(designs)) * SCIENTIFIC.aheadOfMet);
    expect(voiceWeight(ctx, 'production')).toBeGreaterThan(0);
  });

  it('forecasts the Scientific counts that grow', () => {
    const { state, player } = board(1, 20);
    const ctx = valueContext(state, player);
    const potential = (id: string, index: number): number => {
      const effect = orderDef(id as OrderId).effects[index]! as CardPaysEffect;
      return explainCounted(effect, ctx, id as OrderId).terms[1]!.value;
    };
    // Technologies known: this seat's pace of research.
    expect(potential('theSumOfKnowledge', 0)).toBe(
      smoothed(player.techsResearched.length, aiJson.score.tallyForecast.techCompleted, 20) * HORIZON,
    );
    // Charters drafted: the knob, smoothed with the seat's record (none).
    const drafted =
      ((0 + (SCIENTIFIC.countForecast.chartersDrafted / HORIZON) * COMMISSION.priorTurns) /
        (20 + COMMISSION.priorTurns)) *
      HORIZON;
    expect(potential('theCharterRolls', 0)).toBe(drafted);
    // The lead and the guildsmen: the knob alone.
    expect(potential('theSecretArts', 0)).toBe(SCIENTIFIC.countForecast.techLead);
    expect(potential('theScholarsGuild', 0)).toBe(SCIENTIFIC.countForecast.guildsmen);
  });

  it('prices the Scientific grants: a great person, renown by price, a grant by citizens', () => {
    const { state, player } = board(2, 20);
    player.techsResearched.push('mining' as TechId);
    player.researching = 'bronzeWorking' as TechId;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const rate = player.techsResearched.length / 20;
    const rider = (grant: Record<string, unknown>): CardEffect[] => [
      { kind: 'windfallRider', occasion: 'tech', grant } as CardEffect,
    ];
    const next = renownThreshold(state, player) * ctx.ai.weights.renown;
    expect(scoreEffects(rider({ greatPerson: 'scholar' }), ctx)).toBe(lumpOfPoints(next, ctx).total * rate);
    const cost = techCostFor(ctx, 'bronzeWorking' as TechId);
    expect(
      scoreEffects(rider({ renown: 0.05, renownFamily: 'scholar', fromOccasion: 'techCost' }), ctx),
    ).toBe(lumpOfPoints(0.05 * cost * ctx.ai.weights.renown, ctx).total * rate);
    const journeymen = orderDef('theJourneymen' as OrderId).effects;
    expect(scoreEffects(journeymen, ctx)).toBe(
      explainLump({ production: 3 }, ctx).total * 2 * 1 * 6 * rate,
    );
  });
});
