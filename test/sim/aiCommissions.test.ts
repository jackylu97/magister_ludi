/**
 * **Dominion batch D16: bot pricing** (`docs/plans/dominion-themes-triage.md`,
 * the D16 section).
 *
 * Before this batch a commission row carried no effects, so a bot gave every
 * commission nothing, and the shapes of batches D11 to D15 met a zero or the
 * general stand-in. This file pins the three things D16 adds:
 *
 *   · **a commission's price.** The reward is priced (a one-time reward as a
 *     lump, a lasting one as a rate), then discounted by a forecast of the
 *     turns the goal takes, read off the seat's own record with a cautious
 *     default. It reads every deck's commissions, not only Dominion's;
 *   · **a stand-in for each new shape**, each with its own knob in
 *     `data/ai.json` (`score.commission`, `score.dominion`, and
 *     `score.tallyForecast.militaryGained`);
 *   · **the soldiers' seats** in the bot's copy of a town's citizen count.
 *
 * Every figure is computed here off the sheet or off the context the arm
 * read, and compared with `toBe`, the discipline of `aiAppraisal.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import { withAiTuning } from '../../src/ai/aiConfig';
import { foldTerms } from '../../src/ai/decision';
import {
  type ValueContext,
  explainCardEffects,
  explainCommission,
  explainCounted,
  explainEffects,
  explainLump,
  scoreEffects,
} from '../../src/ai/value';
import aiJson from '../../data/ai.json';

import { foundCityAt } from '../../src/sim/cities';
import { LIVE_GREAT_PERSON_IDS, greatPersonDef } from '../../src/sim/greatPeopleData';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
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
import { RULES } from '../../src/sim/rulesData';
import { layRoad } from '../../src/sim/roads';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

const HORIZON = aiJson.priorities.horizonTurns;
const COMMISSION = aiJson.score.commission;
const DOMINION = aiJson.score.dominion;

// --- the bench ---------------------------------------------------------------

/** A blank board with two seats and nothing on it: `aiAppraisal`'s bench. */
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

/** The `(H − delay) / H` discount, off the sheet. */
function discountFor(delay: number): number {
  return Math.max(0, (HORIZON - delay) / HORIZON);
}

/** The forecast rate of a counted goal, written out off the sheet. */
function smoothed(record: number, forecastOverHorizon: number, turn: number): number {
  const fallback = (forecastOverHorizon * COMMISSION.priorShare) / HORIZON;
  return (record + fallback * COMMISSION.priorTurns) / (turn + COMMISSION.priorTurns);
}

/** The reward half of a commission's price, before the wait discounts it. */
function rewardOf(id: OrderId, ctx: ValueContext): number {
  return explainCommission(id, ctx)!.terms[0]!.value;
}

/** The wait half: the discount the price is multiplied by. */
function waitOf(id: OrderId, ctx: ValueContext): number {
  const term = explainCommission(id, ctx)!.terms[1]!;
  expect(term.op).toBe('mul');
  return term.value;
}

const general = LIVE_GREAT_PERSON_IDS.find((id) => greatPersonDef(id).family === 'general')!;

// --- a commission's price ------------------------------------------------------

describe('a commission is priced as its reward, discounted by the wait (D16)', () => {
  it('prices every live commission of every deck, on top of the row’s own walk', () => {
    const { state, player } = board(3);
    const ctx = valueContext(state, player);
    const decks = new Set<string>();
    let commissions = 0;
    for (const id of ORDER_IDS) {
      const def = orderDef(id);
      if (def.commission === undefined) {
        expect(explainCommission(id, ctx), id).toBeNull();
        continue;
      }
      if (def.retired === true) continue;
      commissions += 1;
      for (const deck of def.decks) decks.add(deck);
      const priced = explainCommission(id, ctx)!;
      // The arithmetic is the fold of the printed terms, and the reward has a
      // term for something on every row.
      expect(foldTerms(priced.terms), id).toBe(priced.total);
      expect(priced.terms[0]!.parts!.length, id).toBeGreaterThan(0);
      expect(Number.isFinite(priced.total), id).toBe(true);
      // The card's door adds the price to the walk of its own effects.
      const card = explainCardEffects(id, def.effects, ctx);
      expect(card.total, id).toBe(explainEffects(def.effects, ctx, id).total + priced.total);
    }
    // Dominion's thirteen and the other decks' rows: the reading is general.
    expect(commissions).toBeGreaterThanOrEqual(20);
    for (const deck of ['dominion', 'expansionist', 'commerce', 'devotion']) {
      expect(decks.has(deck), deck).toBe(true);
    }
  });

  it('discounts a goal already met by one turn only', () => {
    // Man the Walls: a unit standing in three towns is the whole goal, and the
    // reward is 30 production in each town with a garrison.
    const { state, player, cities } = board(3);
    for (const city of cities) createUnit(state, 0, 'warrior', city.col, city.row);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const id = 'dominionManTheWalls' as OrderId;
    expect(waitOf(id, ctx)).toBe(discountFor(1));
    expect(rewardOf(id, ctx)).toBe(explainLump({ production: 30 * 3 }, ctx).total);
    expect(explainCommission(id, ctx)!.total).toBe(rewardOf(id, ctx) * discountFor(1));
  });

  it('forecasts a counted goal off the seat’s own record, with a cautious default', () => {
    // Clear the Frontier: two camps burnt out while seated. The rate is the
    // seat's record of camps over the turns played, leaning on the forecast
    // table while the record is short.
    const id = 'dominionClearTheFrontier' as OrderId;
    const forecast = aiJson.score.tallyForecast.campCleared;
    const bare = board(1, 4);
    const fresh = valueContext(bare.state, bare.player);
    const freshRate = smoothed(0, forecast, 4);
    expect(waitOf(id, fresh)).toBe(discountFor(Math.min(HORIZON, Math.ceil(2 / freshRate))));
    // The cautious default alone still prices a young seat's commission.
    expect(explainCommission(id, fresh)!.total).toBeGreaterThan(0);

    const hunter = board(1, 20);
    hunter.player.campsCleared = 6;
    bumpRevision(hunter.state);
    const ctx = valueContext(hunter.state, hunter.player);
    const rate = smoothed(6, forecast, 20);
    expect(waitOf(id, ctx)).toBe(discountFor(Math.ceil(2 / rate)));
    // A seat that burns camps is nearer the goal, so the same reward is worth more.
    expect(waitOf(id, ctx)).toBeGreaterThan(waitOf(id, fresh));
  });

  it('brings a held commission nearer as its own tally grows', () => {
    // Battle Honours counts six kills while seated; five already counted
    // leaves one to come.
    const id = 'dominionBattleHonours' as OrderId;
    const { state, player } = board(1, 20);
    player.enemiesKilled = 4;
    bumpRevision(state);
    const empty = waitOf(id, valueContext(state, player));
    player.statecraft.tallies = [{ card: id, count: 5 }];
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const rate = smoothed(4, aiJson.score.tallyForecast.unitKilled, 20);
    expect(waitOf(id, ctx)).toBe(discountFor(Math.ceil(1 / rate)));
    expect(waitOf(id, ctx)).toBeGreaterThan(empty);
  });

  it('cuts the rate of a goal with a floor, and prices a goal it cannot forecast at nothing', () => {
    // The Chosen Men count only Elite ranks: the seat's ranks at the floor's
    // share. A Victor's Peace counts a war ended, which no record keeps and the
    // forecast table does not name, so there is no pace to meet it at.
    const { state, player } = board(1, 30);
    player.ranksEarned = 9;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const chosen = 'dominionTheChosenMen' as OrderId;
    const rate = (9 / (30 + COMMISSION.priorTurns)) * COMMISSION.floorShare;
    expect(waitOf(chosen, ctx)).toBe(discountFor(Math.min(HORIZON, Math.ceil(3 / rate))));

    const peace = 'dominionAVictorsPeace' as OrderId;
    expect(waitOf(peace, ctx)).toBe(0);
    expect(explainCommission(peace, ctx)!.total).toBe(0);
    expect(explainCommission(peace, ctx)!.terms[1]!.label).toMatch(/no pace to forecast/);
  });

  it('prices a commission already met at nothing more', () => {
    const id = 'dominionClearTheFrontier' as OrderId;
    const { state, player } = board(1, 4);
    player.statecraft.commissionsFulfilled = [{ card: id, turn: 3 }];
    bumpRevision(state);
    const priced = explainCommission(id, valueContext(state, player))!;
    expect(priced.total).toBe(0);
    expect(priced.terms[0]!.label).toMatch(/already met/);
  });

  it('prices a lasting institution as a rate, at one town where the seat holds none yet', () => {
    // The First Province: +5 food and +5 gold in every captured town, for the
    // rest of the game. A seat with no captured town reads one, because the
    // goal that grants it takes one.
    const id = 'dominionTheFirstProvince' as OrderId;
    const { state, player } = board(2, 4);
    const ctx = valueContext(state, player);
    const lasting = orderDef(id).commission!.reward[0]!.lasting![0]! as CardPaysEffect;
    expect(scoreEffects([lasting], ctx)).toBe(0);
    const open: CardPaysEffect = { ...lasting };
    delete open.scope;
    const oneTown = scoreEffects([open], ctx) / ctx.cities;
    expect(oneTown).toBeGreaterThan(0);
    expect(rewardOf(id, ctx)).toBe(oneTown);

    // The Border Fortress pays on citadels, and a seat with none reads one hex.
    const fortress = 'dominionTheBorderFortress' as OrderId;
    const hex = orderDef(fortress).commission!.reward[0]!.lasting![0]! as CardPaysEffect;
    expect(scoreEffects([hex], ctx)).toBe(0);
    expect(rewardOf(fortress, ctx)).toBeGreaterThan(0);
  });

  it('reads a reward scaled by a figure no lower than the goal guarantees', () => {
    // The Strongroom: culture equal to a fifth of the treasury, once the
    // treasury reaches 1,500 (Commerce batch T1). A poorer seat is still paid
    // on 1,500.
    const id = 'theStrongroom' as OrderId;
    const { state, player } = board(1, 4);
    player.gold = 100;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const culture = explainLump({ culture: 0.2 * 1500 }, ctx).total;
    const priced = explainCommission(id, ctx)!.terms[0]!.parts!;
    expect(priced[0]!.value).toBe(culture);
  });
});

// --- feature C and the tally ---------------------------------------------------

describe('the commission moment and count, and the military tally (D16)', () => {
  it('prices The Ovation’s moment off the rate this seat meets commissions', () => {
    const ovation = orderDef('theOvation' as OrderId).effects;
    const { state, player } = board(1, 20);
    const none = scoreEffects(ovation, valueContext(state, player));
    // The cautious default alone: a seat that has met none still expects some.
    expect(none).toBeGreaterThan(0);
    player.statecraft.commissionsFulfilled = [
      { card: 'dominionClearTheFrontier' as OrderId, turn: 8 },
      { card: 'dominionBattleHonours' as OrderId, turn: 15 },
    ];
    bumpRevision(state);
    expect(scoreEffects(ovation, valueContext(state, player))).toBeGreaterThan(none);
  });

  it('promises The Res Gestae the commissions still to be met over the horizon', () => {
    const effect = orderDef('theResGestae' as OrderId).effects[0]! as CardPaysEffect;
    const { state, player } = board(1, 20);
    player.statecraft.commissionsFulfilled = [{ card: 'dominionClearTheFrontier' as OrderId, turn: 8 }];
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const appraisal = explainCounted(effect, ctx);
    expect(appraisal.terms[0]!.value).toBe(1);
    const prior = COMMISSION.metOverHorizon / HORIZON;
    const rate = (1 + prior * COMMISSION.priorTurns) / (20 + COMMISSION.priorTurns);
    expect(appraisal.terms[1]!.value).toBe(rate * HORIZON);
    expect(appraisal.terms[1]!.label).toMatch(/more commissions met, over the horizon/);
  });

  it('forecasts the military units The Gathering Host will count', () => {
    const effect = orderDef('theGatheringHost' as OrderId).effects[1]! as CardPaysEffect;
    const { state, player } = board(1, 20);
    const ctx = valueContext(state, player);
    const appraisal = explainCounted(effect, ctx, 'theGatheringHost' as OrderId);
    expect(appraisal.terms[1]!.value).toBe(aiJson.score.tallyForecast.militaryGained);
  });
});

// --- the Dominion stand-ins ------------------------------------------------------

describe('a stand-in price for each shape of D11 to D15, off its own knob (D16)', () => {
  /** The same sheet with one Dominion knob doubled. */
  function doubled(knob: keyof typeof DOMINION): Parameters<typeof withAiTuning>[0] {
    return { score: { dominion: { [knob]: DOMINION[knob] * 2 } } };
  }

  it('prices Harry the Border’s share of the plunder at the rate this seat raids', () => {
    const effect: CardEffect = {
      kind: 'effectAmplifier',
      target: 'pillageRewards',
      percent: 50,
      class: { modelClass: 'mounted' },
    };
    const { state, player } = board(1, 20);
    const quiet = valueContext(state, player);
    // At peace and with no threat nobody raids, so the share is of nothing.
    expect(scoreEffects([effect], quiet)).toBe(0);
    const tense: ValueContext = { ...quiet, threat: 3 };
    const plunder = explainLump({ gold: RULES.improvements.pillageGold }, tense).total;
    const rate = 3 / HORIZON;
    expect(scoreEffects([effect], tense)).toBe(0.5 * plunder * rate * DOMINION.pillageRewards);
    const twice = withAiTuning(doubled('pillageRewards'), () => {
      const ctx = valueContext(state, player);
      return scoreEffects([effect], { ...ctx, threat: 3 });
    });
    expect(twice).toBe(2 * scoreEffects([effect], tense));
  });

  it('prices The Marshalate’s flat step while a general stands in the field', () => {
    const effect = orderDef('dominionTheMarshalate' as OrderId).effects[0]!;
    const { state, player, cities } = board(1, 20);
    player.greatPeopleByFamily = { general: 3 };
    bumpRevision(state);
    expect(scoreEffects([effect], valueContext(state, player))).toBe(0);
    const piece = createUnit(state, 0, 'greatPerson', cities[0]!.col + 1, cities[0]!.row);
    piece.person = general;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const steps = Math.min(3, 5);
    expect(scoreEffects([effect], ctx)).toBe(
      steps * DOMINION.auraStep * ctx.ai.weights.military * (1 + ctx.threat),
    );
  });

  it('prices Rally to the Standard by the soldiers gained, beside a general', () => {
    const effect = orderDef('rallyToTheStandard' as OrderId).effects[0]!;
    const { state, player, cities } = board(1, 20);
    player.unitsBuilt = { warrior: 4, worker: 3 };
    bumpRevision(state);
    expect(scoreEffects([effect], valueContext(state, player))).toBe(0);
    const piece = createUnit(state, 0, 'greatPerson', cities[0]!.col + 1, cities[0]!.row);
    piece.person = general;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const piecePoints = ctx.ai.weights.military * ctx.ai.score.combatScale;
    // Only the military units count: the workers are not the rule's class.
    expect(scoreEffects([effect], ctx)).toBe((4 / 20) * DOMINION.rallyToGeneral * piecePoints);
  });

  it('prices The Limitanei by the soldiers standing in towns, up to the cap', () => {
    const effect = orderDef('theLimitanei' as OrderId).effects[0]!;
    const { state, player, cities } = board(2, 20);
    expect(scoreEffects([effect], valueContext(state, player))).toBe(0);
    createUnit(state, 0, 'warrior', cities[0]!.col, cities[0]!.row);
    bumpRevision(state);
    const one = scoreEffects([effect], valueContext(state, player));
    expect(one).toBeGreaterThan(0);
    createUnit(state, 0, 'warrior', cities[1]!.col, cities[1]!.row);
    bumpRevision(state);
    expect(scoreEffects([effect], valueContext(state, player))).toBe(2 * one);
    const twice = withAiTuning(doubled('garrisonWorks'), () =>
      scoreEffects([effect], valueContext(state, player)),
    );
    expect(twice).toBe(4 * one);
  });

  it('prices the zone-of-control rule for Elite units as a share of the stand-in', () => {
    const { state, player } = board(1, 20);
    const ctx = valueContext(state, player);
    const ranked: CardEffect = { kind: 'rule', rule: 'ignored', rank: 'elite' };
    const plain: CardEffect = { kind: 'rule', rule: 'ignored' };
    expect(scoreEffects([plain], ctx)).toBe(ctx.ai.score.unknownEffect);
    expect(scoreEffects([ranked], ctx)).toBe(ctx.ai.score.unknownEffect * DOMINION.zocRank);
  });

  it('prices The Upstarts by the share of met empires that know more', () => {
    const effect = orderDef('theUpstarts' as OrderId).effects[0]!;
    const { state, player } = board(1, 20);
    expect(scoreEffects([effect], valueContext(state, player))).toBe(0);
    const rival = seat(state, 1);
    player.metSeats = [1];
    rival.metSeats = [0];
    rival.techsResearched = [...player.techsResearched, 'mining' as never, 'pottery' as never];
    bumpRevision(state);
    const ctx = valueContext(state, player);
    expect(scoreEffects([effect], ctx)).toBe(
      3 * ctx.ai.weights.military * (1 + ctx.threat) * DOMINION.vsMoreTechs,
    );
  });

  it('prices The Longships by the warships at war, and nothing at peace', () => {
    const effect = orderDef('marineDrill' as OrderId).effects[0]!;
    const { state, player } = board(1, 20);
    // Two warships on the water beside the town.
    for (const col of [1, 2]) at(state.map, col, 0).terrain = 'coast' as never;
    createUnit(state, 0, 'trireme', 1, 0);
    createUnit(state, 0, 'trireme', 2, 0);
    bumpRevision(state);
    expect(scoreEffects([effect], valueContext(state, player))).toBe(0);
    state.wars.push({ a: 0, b: 1, declaredTurn: 10 });
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const plunder = explainLump({ gold: RULES.improvements.pillageGold }, ctx).total;
    expect(scoreEffects([effect], ctx)).toBe(2 * DOMINION.shoreRaid * plunder);
  });

  it('prices The Relay Stations by the towns joined to the capital', () => {
    const effect = orderDef('dominionTheRelayStations' as OrderId).effects[0]!;
    const { state, player } = board(2, 20);
    // No road joins the second town, so no unit starts its turn in a joined town.
    expect(scoreEffects([effect], valueContext(state, player))).toBe(0);
    const unbound = scoreEffects(
      [{ kind: 'unitStat', stat: 'movement', amount: 2, class: { category: 'military' } }],
      valueContext(state, player),
    );
    expect(unbound).toBeGreaterThan(0);
    // A road joins the second town: one town of two is joined (the capital is
    // what the others join), times the share of the army in a town.
    for (let col = 4; col <= 8; col++) layRoad(at(state.map, col, 5), 0);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    expect(scoreEffects([effect], ctx)).toBe(unbound * ((1 / 2) * DOMINION.connectedTown));
  });

  it('prices Circumvallation by the met empires raising the Opus', () => {
    const effect = orderDef('dominionCircumvallation' as OrderId).effects[0]!;
    const { state, player } = board(1, 20);
    expect(scoreEffects([effect], valueContext(state, player))).toBe(0);
    const rival = foundCityAt(state, 1, at(state.map, 18, 5));
    rival.queue = [{ kind: 'building', id: 'theMagnumOpus' as never }];
    player.metSeats = [1];
    bumpRevision(state);
    expect(scoreEffects([effect], valueContext(state, player))).toBe(DOMINION.opusSiege);
  });
});

// --- the citizen count ------------------------------------------------------------

describe('the bot counts the soldiers’ seats (D16)', () => {
  it('reads The Limitanei’s seats where it copies the citizen count', () => {
    // `focusTable` copies `chooseCitizens`' cap to price two placements. A
    // source pin, because the table is a private reading of the focus arm:
    // the copy must add the soldiers' seats through the one function the
    // assigner reads.
    const source = (
      import.meta.glob('../../src/ai/bot.ts', {
        query: '?raw',
        import: 'default',
        eager: true,
      }) as Record<string, string>
    )['../../src/ai/bot.ts']!;
    const body = source.slice(source.indexOf('function focusTable('));
    const seats = body.slice(body.indexOf('const seats ='), body.indexOf(';', body.indexOf('const seats =')));
    expect(seats).toMatch(/totalSpecialists\(city\)/);
    expect(seats).toMatch(/cardGarrisonSeats\(state, city\)/);
  });
});
