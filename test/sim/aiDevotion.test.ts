/**
 * **Devotion batch DV9: bot pricing** (`docs/plans/devotion-themes-triage.md`,
 * the DV9 section).
 *
 * Before this batch the Devotion shapes of batches DV3 to DV8 met the general
 * stand-in. This file pins what DV9 adds:
 *
 *   · **a price for each new kind**, read off the board where the board can
 *     say it and off one knob in `score.devotion` where it cannot: the faith
 *     spent, faith that buys buildings, a faith-only purchase discount, a
 *     counted wall, the front row's tenths, the season rule, the rite's town,
 *     the Sabbath, the founding lump, the conversion moment and Pentecost's
 *     lump, the sight of the faithful, the price of a clergy's act, the
 *     apostle's planting, the interdict, the turning of soldiers and the second
 *     rite;
 *   · **the commissions**: The State Church's goal is forecast although its
 *     figure reads nought until every town is devout, and both Devotion
 *     institutions price as their effects;
 *   · **the two behaviours**: an apostle raises a holy site under The Abbeys,
 *     and the rite plan starts a second rite under The Double Feast.
 *
 * Every figure is computed here off the sheet or off the context the arm
 * read, the discipline of `aiCommerce.test.ts` and `aiScientific.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { nextBotCommand, valueContext } from '../../src/ai/bot';
import { type ValueTerm } from '../../src/ai/decision';
import {
  type ValueContext,
  delayDiscount,
  explainCommission,
  explainCountStep,
  explainCounted,
  explainEffects,
  explainLump,
  hammerPrice,
  meterWeight,
  scoreEffects,
  valueOfYields,
  voiceWeight,
} from '../../src/ai/value';
import aiJson from '../../data/ai.json';
import boundsJson from '../../data/ai.bounds.json';

import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { type Game, dispatch } from '../../src/sim/game';
import { improvementErrorAt } from '../../src/sim/improvements';
import { workForFamily } from '../../src/sim/improvementData';
import { type GameMap, type Tile, createMap, getTileAt, mapRange, tileHex } from '../../src/sim/map';
import { readCity } from '../../src/sim/readings';
import { availableRites, foundReligion, riteCostFor } from '../../src/sim/religion';
import { BELIEF_IDS, type RiteId, riteDef } from '../../src/sim/religionData';
import {
  type City,
  type GameConfig,
  type GameState,
  type Player,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import { countOf } from '../../src/sim/statecraft';
import { type CardEffect, type CardPaysEffect, type OrderId, orderDef } from '../../src/sim/statecraftData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { foldEmpireRates } from '../../src/sim/yields/empire';
import { foldCity } from '../../src/sim/yields/town';
import { grownGames } from './grownGameHelpers';
import { newGame } from './newGameHelpers';

const HORIZON = aiJson.priorities.horizonTurns;
const LUMP = aiJson.score.lumpTurns;
const DEVOTION = aiJson.score.devotion;
const COMMISSION = aiJson.score.commission;
const TALLY = aiJson.score.tallyForecast;

const BOOK_OF_LIFE = 'theBookOfLife' as OrderId;
const GIFTS = 'theGiftsOfTheFaithful' as OrderId;
const OFFERED_STONES = 'theOfferedStones' as OrderId;
const OFFERING_CHESTS = 'theOfferingChests' as OrderId;
const SHRINE_GUARDS = 'theShrineGuards' as OrderId;
const PRECINCTS = 'theSacredPrecincts' as OrderId;
const RISING_NAVE = 'theRisingNave' as OrderId;
const ROGATIONS = 'theRogations' as OrderId;
const PSALTER = 'thePsalter' as OrderId;
const FOUNDING_VOWS = 'theFoundingVows' as OrderId;
const PARISHES = 'theParishes' as OrderId;
const CONFESSORS = 'theConfessors' as OrderId;
const STATE_CHURCH = 'commissionTheStateChurch' as OrderId;
const GREAT_COMMISSION = 'theGreatCommission' as OrderId;
const PENTECOST = 'pentecost' as OrderId;
const MASS_BAPTISMS = 'theMassBaptisms' as OrderId;
const ANCHORITES = 'theAnchorites' as OrderId;
const ABBEYS = 'theAbbeys' as OrderId;
const INTERDICT = 'theInterdict' as OrderId;
const TURNING = 'theTurningOfSwords' as OrderId;
const DOUBLE_FEAST = 'theDoubleFeast' as OrderId;

/** The improvement a prophet plants, off the table's inverse rather than a name. */
const HOLY_SITE = workForFamily('prophet')!;

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

/** Teaches a seat these technologies. */
function learn(state: GameState, playerId: number, ...techs: string[]): void {
  const player = seat(state, playerId);
  for (const tech of techs) {
    if (!player.techsResearched.includes(tech as never)) player.techsResearched.push(tech as never);
  }
  bumpRevision(state);
}

/** One town for each population, seat 0, six hexes apart, on turn 40. */
function board(populations: readonly number[]): { state: GameState; player: Player; towns: City[] } {
  const state = bench();
  const towns: City[] = [];
  for (const [index, population] of populations.entries()) {
    const town = foundCityAt(state, 0, at(state.map, 3 + 6 * index, 5));
    town.population = population;
    town.queue = [];
    refreshCityDerived(state, town);
    towns.push(town);
  }
  state.turn = 40;
  seat(state, 0).gold = 500;
  recomputeAllVisibility(state);
  bumpRevision(state);
  return { state, player: seat(state, 0), towns };
}

/** A town for seat 1, met and explored by seat 0. */
function rivalTown(state: GameState, col: number, population: number): City {
  const town = foundCityAt(state, 1, at(state.map, col, 5));
  town.population = population;
  town.queue = [];
  refreshCityDerived(state, town);
  const ada = seat(state, 0);
  if (!ada.metSeats.includes(1)) ada.metSeats.push(1);
  const bors = seat(state, 1);
  if (!bors.metSeats.includes(0)) bors.metSeats.push(0);
  recomputeAllVisibility(state);
  state.visibility[0]!.fill(1);
  bumpRevision(state);
  return town;
}

/**
 * A religion founded by `owner` whose holy site is this town's centre, so the
 * owner holds it and is paid by it. Every citizen of `followers` follows it.
 * It was founded `age` turns ago. (`devotionFaith.test.ts`' helper.)
 */
function religionAt(
  state: GameState,
  site: City,
  followers: readonly City[],
  age = 20,
): { id: number; follower: string[] } {
  const tile = at(state.map, site.col, site.row);
  tile.improvement = HOLY_SITE;
  const religion = {
    id: state.religions.length,
    founderId: site.ownerId,
    name: `The Testament ${state.religions.length}`,
    pantheon: [],
    follower: [] as string[],
    enhancer: [],
    foundedTurn: state.turn - age,
    holySite: { col: site.col, row: site.row },
  };
  state.religions.push(religion as never);
  for (const city of followers) city.followers = { [religion.id]: city.population };
  bumpRevision(state);
  return religion;
}

/** Hangs a rite on a town, as `stampRite` does, for its full length. */
function keep(state: GameState, city: City, rite: RiteId): void {
  const def = riteDef(rite);
  const turns = def.duration ?? 1;
  const effects: CardEffect[] = def.effects?.length ? def.effects : [{ kind: 'pays', where: 'empire' }];
  city.timed = [
    ...(city.timed ?? []),
    ...effects.map((effect) => ({ card: rite as never, effect, expiresTurn: state.turn + turns })),
  ];
  bumpRevision(state);
}

function effectsOf(id: OrderId): CardEffect[] {
  return orderDef(id).effects;
}

/** A context whose `score.devotion` has one knob moved. */
function withKnob(ctx: ValueContext, knob: keyof typeof DEVOTION, value: number): ValueContext {
  return {
    ...ctx,
    ai: {
      ...ctx.ai,
      score: { ...ctx.ai.score, devotion: { ...ctx.ai.score.devotion, [knob]: value } },
    },
  };
}

/** Every term of an appraisal and of its nested parts, flattened. */
function allTerms(terms: readonly ValueTerm[]): ValueTerm[] {
  return terms.flatMap((term) => [term, ...allTerms(term.parts ?? [])]);
}

/** The seat's conversion rate, as `conversionRate` reads it: record over the faith's life, smoothed. */
function conversionRate(record: number, age: number): number {
  const fallback = TALLY.foreignCityConverted / HORIZON;
  return (record + fallback * COMMISSION.priorTurns) / (age + COMMISSION.priorTurns);
}

// --- the sheet ------------------------------------------------------------------

const VALUE_SOURCE = (
  import.meta.glob('../../src/ai/value.ts', { query: '?raw', import: 'default', eager: true }) as Record<
    string,
    string
  >
)['../../src/ai/value.ts']!;

describe('the sheet', () => {
  it('carries the score.devotion group, and a bounds row for every knob in it', () => {
    expect(Object.keys(DEVOTION).sort()).toEqual(
      [
        'faithSpentShare',
        'faithUnitShare',
        'followerSight',
        'frontRowShare',
        'opusInterdict',
        'parishTurns',
        'sitesOverHorizon',
      ].sort(),
    );
    const bounds = boundsJson as Record<string, { min: number; max: number }>;
    for (const [knob, value] of Object.entries(DEVOTION)) {
      const row = bounds[`score.devotion.${knob}`];
      expect(row, knob).toBeDefined();
      expect(value, knob).toBeGreaterThanOrEqual(row!.min);
      expect(value, knob).toBeLessThanOrEqual(row!.max);
    }
  });

  it('leaves no Devotion stand-in waiting for this batch', () => {
    // Batches DV3 to DV8 each wrote "a stand-in until batch DV9" beside an arm.
    expect(VALUE_SOURCE).not.toContain('until batch DV9');
    for (const rule of [
      'followersShareSight',
      'chargePrice',
      'apostlesPlantHolySites',
      'opusInterdict',
      'twoRites',
      'faithfulKillsConvert',
    ]) {
      expect(VALUE_SOURCE, rule).not.toContain(`effect.rule === '${rule}') return ctx.ai.score.unknownEffect`);
    }
  });
});

// --- the faith bank (DV3) ------------------------------------------------------------

describe('The Book of Life', () => {
  it('counts the faith spent, and forecasts the faith the seat makes over the horizon', () => {
    const { state, player, towns } = board([6]);
    towns[0]!.buildings.push('shrine');
    refreshCityDerived(state, towns[0]!);
    player.faithSpent = 300;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const income = foldEmpireRates(state, 0).faithPerTurn ?? 0;
    expect(income).toBeGreaterThan(0);
    const [science] = effectsOf(BOOK_OF_LIFE) as CardPaysEffect[];
    const counted = explainCounted(science!, ctx, BOOK_OF_LIFE);
    expect(counted.terms[0]!.value).toBe(300);
    expect(counted.terms[1]!.value).toBeCloseTo(income * HORIZON * DEVOTION.faithSpentShare, 10);
    expect(counted.total).toBeGreaterThan(0);
  });
});

describe('faith that buys buildings', () => {
  /** A seat making faith, with a Shrine standing and the Temple open. */
  function faithful(): { state: GameState; player: Player; towns: City[] } {
    const made = board([6, 6]);
    learn(made.state, 0, 'divination', 'theHighTemple');
    made.towns[0]!.buildings.push('shrine');
    refreshCityDerived(made.state, made.towns[0]!);
    bumpRevision(made.state);
    return made;
  }

  it('is worth a point of faith on the shelf over a point elsewhere, times the faith made', () => {
    const { state, player } = faithful();
    const ctx = valueContext(state, player);
    const gifts = scoreEffects(effectsOf(GIFTS), ctx);
    expect(gifts).toBeGreaterThan(0);
    // The rule that opens every building reaches a wider shelf, so its best
    // row is at least as good.
    const [, everything] = effectsOf(OFFERED_STONES);
    expect(scoreEffects([everything!], ctx)).toBeGreaterThanOrEqual(gifts);
    // A faith book already buying something far better leaves the shelf worth
    // nothing more.
    const rich: ValueContext = {
      ...ctx,
      wants: {
        ...ctx.wants,
        faith: [
          {
            label: 'a rite worth a great deal',
            currency: 'faith',
            price: 1,
            worth: 1e6,
            delay: 0,
            terms: [],
            outOfReach: false,
            rite: { cityId: 0, rite: 'riteOfTheHarvest' },
          },
        ],
      },
    };
    expect(scoreEffects(effectsOf(GIFTS), rich)).toBe(0);
  });

  it('is worth nothing to a seat that makes no faith', () => {
    const { state, player } = board([6]);
    learn(state, 0, 'divination', 'theHighTemple');
    expect(scoreEffects(effectsOf(GIFTS), valueContext(state, player))).toBe(0);
  });
});

describe('The Offering Chests', () => {
  it('takes its share off the faith the seat spends on the units it reaches', () => {
    const { state, player, towns } = board([6]);
    towns[0]!.buildings.push('shrine');
    refreshCityDerived(state, towns[0]!);
    bumpRevision(state);
    // No town may buy a soldier with faith, so nothing is bought at the
    // discount.
    expect(scoreEffects(effectsOf(OFFERING_CHESTS), valueContext(state, player))).toBe(0);
    // The Shrine Guards open the faith bank to melee units in Shrine towns.
    hold(state, 0, SHRINE_GUARDS);
    const ctx = valueContext(state, player);
    const income = foldEmpireRates(state, 0).faithPerTurn ?? 0;
    expect(scoreEffects(effectsOf(OFFERING_CHESTS), ctx)).toBeCloseTo(
      0.3 * income * DEVOTION.faithUnitShare * voiceWeight(ctx, 'faith'),
      10,
    );
  });
});

describe('a counted wall (The Sacred Precincts)', () => {
  it('pays its defence for each faith building of a middling town', () => {
    const { state, player, towns } = board([6, 6]);
    const ctx0 = valueContext(state, player);
    expect(scoreEffects(effectsOf(PRECINCTS), ctx0)).toBe(0);
    towns[0]!.buildings.push('shrine', 'temple');
    refreshCityDerived(state, towns[0]!);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    // Two faith buildings in one town of two: one helping in the middling town.
    expect(scoreEffects(effectsOf(PRECINCTS), ctx)).toBeCloseTo(
      3 * 1 * aiJson.weights.military * (1 + ctx.threat),
      10,
    );
  });
});

describe('The Rising Nave', () => {
  it('counts each town’s own front row, and a share of a build in the others', () => {
    const { state, player, towns } = board([6, 6]);
    learn(state, 0, 'theology');
    towns[0]!.queue = [{ kind: 'building', id: 'cathedral' } as never];
    towns[0]!.hammerBasket = 1_000_000;
    bumpRevision(state);
    const [faith] = effectsOf(RISING_NAVE) as CardPaysEffect[];
    const tenths = countOf(state, 0, RISING_NAVE, faith!, towns[0]!);
    expect(tenths).toBe(10);
    towns[0]!.hammerBasket = 0;
    const cost = (() => {
      // A basket of a little over four tenths reads four.
      for (let basket = 1; basket < 10_000; basket++) {
        towns[0]!.hammerBasket = basket;
        if (countOf(state, 0, RISING_NAVE, faith!, towns[0]!) === 4) return basket;
      }
      throw new Error('the count never read four');
    })();
    expect(cost).toBeGreaterThan(0);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    // One town raising the Cathedral at four tenths, and one other town at the
    // knob's share of a build's middle (four and a half tenths).
    const expected = (4 + 1 * DEVOTION.frontRowShare * 4.5) * valueOfYields({ faith: 1 }, ctx);
    expect(scoreEffects([faith!], ctx)).toBeCloseTo(expected, 10);
  });
});

// --- rites (DV4) -------------------------------------------------------------------------

describe('the season rule', () => {
  it('reads the seasons the towns keep for The Rogations’ tally, never below the table', () => {
    const { state, player, towns } = board([6, 6]);
    learn(state, 0, 'divination');
    hold(state, 0, ROGATIONS);
    const [, faith] = effectsOf(ROGATIONS) as CardPaysEffect[];
    const quiet = explainCounted(faith!, valueContext(state, player), ROGATIONS);
    expect(quiet.terms[1]!.value).toBe(TALLY.riteStarted);
    // A Votive Offering is not a season, so it counts for nothing.
    keep(state, towns[0]!, 'votiveOffering');
    const offered = explainCounted(faith!, valueContext(state, player), ROGATIONS);
    expect(offered.terms[1]!.value).toBe(TALLY.riteStarted);
    // Two seasons kept now, each over ten turns: a fifth of a season a turn.
    keep(state, towns[0]!, 'riteOfTheHarvest');
    keep(state, towns[1]!, 'omenReading');
    const busy = explainCounted(faith!, valueContext(state, player), ROGATIONS);
    expect(busy.terms[1]!.value).toBeCloseTo(Math.max((2 / 10) * HORIZON, TALLY.riteStarted), 10);
  });

  it('forecasts The Founding Vows at the seat’s pace of seasons', () => {
    const { state, player, towns } = board([6, 6]);
    learn(state, 0, 'divination');
    keep(state, towns[0]!, 'riteOfTheHarvest');
    keep(state, towns[1]!, 'omenReading');
    const ctx = valueContext(state, player);
    const appraisal = explainCommission(FOUNDING_VOWS, ctx)!;
    // Two seasons over ten turns is a fifth a turn, above the cautious
    // default, so the goal's two seasons take ten turns.
    const fallback = (TALLY.riteStarted * COMMISSION.priorShare) / HORIZON;
    const rate = Math.max(2 / 10, fallback);
    expect(appraisal.terms[1]!.value).toBeCloseTo(delayDiscount(Math.ceil(2 / rate), ctx), 10);
  });
});

describe('The Psalter', () => {
  it('pays at the seasons started in devout towns, at a devout town’s citizens', () => {
    const { state, player, towns } = board([6, 4]);
    learn(state, 0, 'divination');
    religionAt(state, towns[0]!, [towns[0]!]);
    keep(state, towns[1]!, 'riteOfTheHarvest');
    const ctx = valueContext(state, player);
    // One season kept, over ten turns; half the towns are devout; the devout
    // town has six citizens.
    const rate = Math.max(1 / 10, TALLY.riteStarted / HORIZON) * (1 / 2);
    const [science] = effectsOf(PSALTER);
    expect(scoreEffects([science!], ctx)).toBeCloseTo(rate * explainLump({ science: 5 * 6 }, ctx).total, 10);
  });

  it('pays nothing to a seat that knows no season', () => {
    const { state, player, towns } = board([6]);
    religionAt(state, towns[0]!, [towns[0]!]);
    expect(scoreEffects(effectsOf(PSALTER), valueContext(state, player))).toBe(0);
  });
});

describe('the Sabbath', () => {
  it('is the town’s production at the culture price less the price of a hammer there', () => {
    const { state, player, towns } = board([8, 3]);
    const ctx = valueContext(state, player);
    const here: ValueContext = { ...ctx, cities: 1 };
    const sabbath: CardEffect[] = [{ kind: 'productionToCulture' }];
    for (const town of towns) {
      const made = foldCity(state, town, [], town.queue[0] ?? null, readCity(state, town)).production;
      expect(explainEffects(sabbath, here, undefined, town).total).toBeCloseTo(
        made * (voiceWeight(ctx, 'culture') - hammerPrice(here, town)),
        10,
      );
    }
    // With no town in hand it reads the middling town in every town.
    expect(scoreEffects(sabbath, ctx)).toBeCloseTo(
      ctx.medianProduction * (voiceWeight(ctx, 'culture') - hammerPrice(ctx)) * ctx.cities,
      10,
    );
  });

  it('is priced town by town in the rite plan', () => {
    const { state, player, towns } = board([8, 3]);
    // A workshop in the first town, so the two towns make different hammers.
    towns[0]!.buildings.push('workshop');
    refreshCityDerived(state, towns[0]!);
    learn(state, 0, 'divination');
    player.charteredRites.push('riteOfTheSabbath' as RiteId);
    player.faithPool = 1000;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const rows = ctx.wants.faith.filter((want) => want.rite?.rite === 'riteOfTheSabbath');
    expect(rows.map((want) => want.rite!.cityId).sort()).toEqual(towns.map((town) => town.id).sort());
    // The two towns make different production, so the stand-in that priced
    // every town alike is gone.
    expect(rows[0]!.worth).not.toBeCloseTo(rows[1]!.worth, 6);
  });
});

// --- the faith's reach (DV5) ----------------------------------------------------------------

describe('The Parishes', () => {
  it('is worth a devout town for the turns sooner it follows, at the pace of founding', () => {
    const { state, player, towns } = board([6, 6]);
    // A seat paid by no religion presses nothing.
    expect(scoreEffects(effectsOf(PARISHES), valueContext(state, player))).toBe(0);
    // The seat holds the faith, and no town follows it yet: the new town is
    // the one that would.
    const religion = religionAt(state, towns[0]!, []);
    // A follower belief paying one culture and one faith in a following town.
    religion.follower = ['theQuietHours'];
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const counted =
      explainCountStep('followingCities', 1, ctx).total + explainCountStep('followingPop', 1, ctx).total;
    const devout = counted + valueOfYields({ culture: 1, faith: 1 }, ctx);
    const founding = ctx.cities / state.turn;
    expect(scoreEffects(effectsOf(PARISHES), ctx)).toBeCloseTo(
      (founding * devout * DEVOTION.parishTurns) / LUMP,
      10,
    );
    // Linear in the knob.
    expect(scoreEffects(effectsOf(PARISHES), withKnob(ctx, 'parishTurns', 2 * DEVOTION.parishTurns))).toBeCloseTo(
      2 * scoreEffects(effectsOf(PARISHES), ctx),
      10,
    );
  });
});

describe('The Confessors', () => {
  it('is worth the towns abroad that follow, and the towns the faith will turn', () => {
    const { state, player, towns } = board([6]);
    const theirs = rivalTown(state, 20, 5);
    expect(scoreEffects(effectsOf(CONFESSORS), valueContext(state, player))).toBe(0);
    religionAt(state, towns[0]!, [towns[0]!, theirs]);
    const ctx = valueContext(state, player);
    const more = conversionRate(1, 20) * HORIZON;
    expect(scoreEffects(effectsOf(CONFESSORS), ctx)).toBeCloseTo((1 + more) * DEVOTION.followerSight, 10);
  });
});

describe('Commission: The State Church', () => {
  it('is forecast from the devout towns, though the figure reads nought until every town is', () => {
    const { state, player, towns } = board([4, 4, 4, 4, 4]);
    state.turn = 20;
    religionAt(state, towns[0]!, towns.slice(0, 4));
    const ctx = valueContext(state, player);
    const appraisal = explainCommission(STATE_CHURCH, ctx)!;
    // Four of five towns devout, six needed: two to go, at four over twenty
    // turns played and twenty of prior.
    const rate = 4 / (20 + COMMISSION.priorTurns);
    expect(appraisal.terms[1]!.value).toBeCloseTo(delayDiscount(Math.ceil(2 / rate), ctx), 10);
    expect(appraisal.terms[1]!.value).toBeGreaterThan(0);
  });

  it('prices its institution as its effect, in the six towns the goal guarantees', () => {
    const { state, player, towns } = board([4, 4, 4]);
    religionAt(state, towns[0]!, towns.slice(0, 2));
    const ctx = valueContext(state, player);
    const reward = explainCommission(STATE_CHURCH, ctx)!.terms[0]!;
    const lasting = allTerms(reward.parts ?? []).find((term) => term.label.includes('for the rest of the game'))!;
    expect(lasting.value).toBeCloseTo(6 * meterWeight(ctx, 'authority'), 10);
  });
});

describe('The Great Commission', () => {
  it('prices its institution as its effect', () => {
    const { state, player, towns } = board([4, 4, 4]);
    religionAt(state, towns[0]!, towns.slice(0, 2));
    const ctx = valueContext(state, player);
    const reward = explainCommission(GREAT_COMMISSION, ctx)!.terms[0]!;
    const lasting = allTerms(reward.parts ?? []).find((term) => term.label.includes('for the rest of the game'))!;
    const effect = orderDef(GREAT_COMMISSION).commission!.reward[0]!.lasting![0]!;
    expect(lasting.value).toBeCloseTo(scoreEffects([effect], ctx), 10);
    expect(lasting.value).toBeGreaterThan(0);
  });
});

// --- a conversion as a moment (DV6) ------------------------------------------------------------

describe('the conversion moment', () => {
  it('pays The Mass Baptisms at the seat’s pace of turning towns, at the next town’s citizens', () => {
    const { state, player, towns } = board([6]);
    const following = rivalTown(state, 14, 8);
    rivalTown(state, 24, 5);
    expect(scoreEffects(effectsOf(MASS_BAPTISMS), valueContext(state, player))).toBe(0);
    religionAt(state, towns[0]!, [towns[0]!, following]);
    const ctx = valueContext(state, player);
    const [science] = effectsOf(MASS_BAPTISMS);
    // One town abroad follows, over a faith twenty turns old; the town it
    // could turn next has five citizens.
    expect(scoreEffects([science!], ctx)).toBeCloseTo(
      conversionRate(1, 20) * explainLump({ science: 20 * 5 }, ctx).total,
      10,
    );
  });

  it('prices Pentecost’s lump by the towns within its range it would turn', () => {
    const { state, player, towns } = board([6]);
    const following = rivalTown(state, 14, 8);
    rivalTown(state, 20, 5);
    rivalTown(state, 23, 5);
    religionAt(state, towns[0]!, [towns[0]!, following]);
    const ctx = valueContext(state, player);
    // Two towns the faith could turn, three hexes apart: each lump of sixty
    // presses six converts on the other, a majority of five citizens.
    const each =
      explainCountStep('followingCities', 1, ctx).total +
      explainCountStep('followingForeign', 1, ctx).total +
      explainCountStep('followingPop', 5, ctx).total +
      explainCountStep('followingForeignPop', 5, ctx).total;
    expect(each).toBeGreaterThan(0);
    expect(scoreEffects(effectsOf(PENTECOST), ctx)).toBeCloseTo(conversionRate(1, 20) * 1 * each, 10);
  });

  it('prices Pentecost at nothing when no town within its range could turn', () => {
    const { state, player, towns } = board([6]);
    const following = rivalTown(state, 14, 8);
    rivalTown(state, 26, 5);
    religionAt(state, towns[0]!, [towns[0]!, following]);
    expect(scoreEffects(effectsOf(PENTECOST), valueContext(state, player))).toBe(0);
  });
});

// --- holy sites and the Opus (DV7) ---------------------------------------------------------------

describe('The Anchorites and The Abbeys', () => {
  /** A seat that founded its faith in its first town, with a second town wanting a site. */
  function founded(): { state: GameState; player: Player; towns: City[] } {
    const made = board([6, 6]);
    learn(made.state, 0, 'divination', 'theHighTemple', 'theology');
    religionAt(made.state, made.towns[0]!, [made.towns[0]!]);
    return made;
  }

  it('saves a charge of a prophet on each further site, at the pace of further sites', () => {
    const { state, player } = founded();
    const ctx = valueContext(state, player);
    // The second town holds no site: one site over the horizon, at the knob.
    const rate = Math.min(1, DEVOTION.sitesOverHorizon) / HORIZON;
    const charge = 120 / 2;
    const expected = rate * explainLump({ faith: (2 - 1) * charge }, ctx).total;
    expect(scoreEffects(effectsOf(ANCHORITES), ctx)).toBeCloseTo(expected, 10);
    // Seated, the card is priced against the book's price, not its own.
    hold(state, 0, ANCHORITES);
    const seated = valueContext(state, player);
    expect(scoreEffects(effectsOf(ANCHORITES), seated)).toBeCloseTo(
      rate * explainLump({ faith: (2 - 1) * charge }, seated).total,
      10,
    );
  });

  it('saves the difference between a prophet’s charges and an apostle’s on each further site', () => {
    const { state, player } = founded();
    const ctx = valueContext(state, player);
    const rate = Math.min(1, DEVOTION.sitesOverHorizon) / HORIZON;
    const saved = (120 / 2 - 90 / 2) * 2;
    expect(scoreEffects(effectsOf(ABBEYS), ctx)).toBeCloseTo(rate * explainLump({ faith: saved }, ctx).total, 10);
  });

  it('is worth nothing before the seat founds its faith', () => {
    const { state, player } = board([6, 6]);
    learn(state, 0, 'divination', 'theHighTemple', 'theology');
    const ctx = valueContext(state, player);
    expect(scoreEffects(effectsOf(ANCHORITES), ctx)).toBe(0);
    expect(scoreEffects(effectsOf(ABBEYS), ctx)).toBe(0);
  });
});

describe('The Interdict', () => {
  it('is the knob for a rival raising the Opus in a town that follows this faith', () => {
    const { state, player, towns } = board([6]);
    const opus = rivalTown(state, 20, 6);
    const other = rivalTown(state, 26, 6);
    opus.queue = [{ kind: 'building', id: 'theMagnumOpus' } as never];
    bumpRevision(state);
    // Nobody follows this seat's faith yet.
    religionAt(state, towns[0]!, [towns[0]!]);
    expect(scoreEffects(effectsOf(INTERDICT), valueContext(state, player))).toBe(0);
    // Half the rival's towns follow, but not the one raising the Opus.
    other.followers = { 0: other.population };
    bumpRevision(state);
    expect(scoreEffects(effectsOf(INTERDICT), valueContext(state, player))).toBeCloseTo(
      0.5 * DEVOTION.opusInterdict,
      10,
    );
    // The Opus town follows: the whole knob.
    opus.followers = { 0: opus.population };
    bumpRevision(state);
    expect(scoreEffects(effectsOf(INTERDICT), valueContext(state, player))).toBeCloseTo(DEVOTION.opusInterdict, 10);
  });
});

// --- the rule-breakers (DV8) -------------------------------------------------------------------

describe('The Turning of Swords', () => {
  it('is a soldier for each kill on following ground, once a turn at most', () => {
    const { state, player, towns } = board([6]);
    const following = rivalTown(state, 20, 6);
    rivalTown(state, 26, 6);
    player.unitsKilled = 8;
    bumpRevision(state);
    expect(scoreEffects(effectsOf(TURNING), valueContext(state, player))).toBe(0);
    religionAt(state, towns[0]!, [towns[0]!, following]);
    const ctx = valueContext(state, player);
    // Eight kills over forty turns, half the rival's towns following.
    const piece = (aiJson.weights.military * aiJson.score.combatScale) / LUMP;
    expect(scoreEffects(effectsOf(TURNING), ctx)).toBeCloseTo(Math.min(1, (8 / 40) * 0.5) * piece, 10);
  });
});

describe('The Double Feast', () => {
  it('is what a point of faith buys in a second rite over what it buys elsewhere, times the faith made', () => {
    const { state, player, towns } = board([6]);
    learn(state, 0, 'divination');
    // A Shrine for faith a turn, and shelves for the Omen Reading to read.
    towns[0]!.buildings.push('shrine', 'workshop', 'smithy', 'monument');
    refreshCityDerived(state, towns[0]!);
    bumpRevision(state);
    // No town keeps a rite: a second place is worth nothing yet.
    expect(scoreEffects(effectsOf(DOUBLE_FEAST), valueContext(state, player))).toBe(0);
    keep(state, towns[0]!, 'riteOfTheHarvest');
    const base = valueContext(state, player);
    // A faith book with nothing else in it, so elsewhere is the band's floor.
    const ctx: ValueContext = { ...base, wants: { ...base.wants, faith: [] } };
    const here: ValueContext = { ...ctx, cities: 1 };
    const price = riteCostFor(state, 0);
    let best = 0;
    for (const id of availableRites(state, 0)) {
      if (id === 'riteOfTheHarvest') continue;
      const def = riteDef(id);
      const blessing = explainEffects(def.effects ?? [], here, undefined, towns[0]).total;
      best = Math.max(best, (blessing * (def.duration ?? 1)) / LUMP / price);
    }
    const floor = (aiJson.weights.faith[0]! * aiJson.priorities.priceBandLow) / LUMP;
    const income = foldEmpireRates(state, 0).faithPerTurn ?? 0;
    expect(best).toBeGreaterThan(floor);
    expect(scoreEffects(effectsOf(DOUBLE_FEAST), ctx)).toBeCloseTo((best - floor) * income, 10);
    // Seated, the rites it opens in the town are not the yardstick it is
    // measured against.
    hold(state, 0, DOUBLE_FEAST);
    player.faithPool = 1000;
    bumpRevision(state);
    const seated = valueContext(state, player);
    const offered = seated.wants.faith.filter((want) => want.rite?.cityId === towns[0]!.id);
    expect(offered.length).toBeGreaterThan(0);
    expect(scoreEffects(effectsOf(DOUBLE_FEAST), { ...seated, wants: { ...seated.wants, faith: offered } })).toBeGreaterThan(0);
  });
});

// --- the two behaviours ----------------------------------------------------------------------------

const CONFIG: GameConfig = {
  seed: 20260831,
  sizeName: 'duel',
  players: [
    { name: 'Crimson', color: '#d4502e' },
    { name: 'Teal', color: '#1f8a85' },
  ],
  barbarians: true,
};

const growDuel = grownGames(CONFIG);

/** One seat's first town. */
function firstCity(state: GameState, playerId: number): City {
  const city = state.cities.find((town) => town.ownerId === playerId);
  if (!city) throw new Error(`seat ${playerId} has no city`);
  return city;
}

/** A hex of this town's the stones would be legal on, asked of the simulation. */
function plantableGround(state: GameState, city: City): Tile {
  for (const tile of mapRange(state.map, tileHex(at(state.map, city.col, city.row)), 2)) {
    if (tile.col === city.col && tile.row === city.row) continue;
    if (improvementErrorAt(state, city.ownerId, tile, HOLY_SITE) !== null) continue;
    return tile;
  }
  throw new Error('no ground this town could plant on');
}

/** What one named piece would be told to do, with every other command played first. */
function nextBotCommandFor(game: Game, playerId: number, unitId: number): { type: string; target?: unknown } | null {
  for (let step = 0; step < 80; step++) {
    const command = nextBotCommand(game.state, playerId);
    if (command === null) return null;
    if ('unitId' in command && command.unitId === unitId) return command as { type: string; target?: unknown };
    if (!dispatch(game, command as never).ok) return null;
  }
  return null;
}

/** A grown duel whose first seat has founded its faith, with no stones raised. */
function faithfulGame(): { game: Game; player: Player; city: City } {
  const game = growDuel(8);
  const player = seat(game.state, 0);
  player.pantheon.beliefs = [BELIEF_IDS[0] as never];
  foundReligion(game.state, player);
  learn(game.state, 0, 'theology');
  bumpRevision(game.state);
  return { game, player, city: firstCity(game.state, 0) };
}

describe('an apostle under The Abbeys', () => {
  it('raises a holy site on the ground of a town that has none', () => {
    const { game, city } = faithfulGame();
    hold(game.state, 0, ABBEYS);
    const ground = plantableGround(game.state, city);
    const apostle = createUnit(game.state, 0, 'apostle', ground.col, ground.row);
    bumpRevision(game.state);
    expect(nextBotCommandFor(game, 0, apostle.id)?.type).toBe('plantHolySite');
  });

  it('plants nothing without the card', () => {
    const { game, city } = faithfulGame();
    const ground = plantableGround(game.state, city);
    const apostle = createUnit(game.state, 0, 'apostle', ground.col, ground.row);
    bumpRevision(game.state);
    expect(nextBotCommandFor(game, 0, apostle.id)?.type).not.toBe('plantHolySite');
  });

  it('steps off the town centre toward ground where a site would be legal', () => {
    const { game, city } = faithfulGame();
    hold(game.state, 0, ABBEYS);
    const apostle = createUnit(game.state, 0, 'apostle', city.col, city.row);
    bumpRevision(game.state);
    const command = nextBotCommandFor(game, 0, apostle.id);
    expect(command?.type).toBe('moveUnit');
    const target = command!.target as { col: number; row: number };
    expect(improvementErrorAt(game.state, 0, at(game.state.map, target.col, target.row), HOLY_SITE)).toBeNull();
  });
});

describe('the rite plan under The Double Feast', () => {
  /** A grown duel whose first town keeps the Rite of the Harvest, with faith to spare. */
  function feasting(): { game: Game; player: Player; city: City } {
    const game = growDuel(8);
    const player = seat(game.state, 0);
    learn(game.state, 0, 'divination');
    player.faithPool = 5000;
    const city = firstCity(game.state, 0);
    const said = applyCommand(game.state, {
      type: 'performRite',
      playerId: 0,
      cityId: city.id,
      rite: 'riteOfTheHarvest',
    });
    expect(said.ok, said.ok ? '' : said.error).toBe(true);
    bumpRevision(game.state);
    return { game, player, city };
  }

  /** The rites the faith book offers this town now. */
  function riteRows(game: Game, player: Player, city: City): string[] {
    return valueContext(game.state, player)
      .wants.faith.filter((want) => want.rite?.cityId === city.id)
      .map((want) => want.rite!.rite);
  }

  it('offers no second rite in a town keeping one without the card', () => {
    const { game, player, city } = feasting();
    expect(riteRows(game, player, city)).toEqual([]);
  });

  it('offers a second, different rite in a town keeping one, and the bot says it', () => {
    const { game, player, city } = feasting();
    hold(game.state, 0, DOUBLE_FEAST);
    const offered = riteRows(game, player, city);
    expect(offered.length).toBeGreaterThan(0);
    expect(offered).not.toContain('riteOfTheHarvest');
    // Played forward: the seat's faith arm starts the second rite in the town.
    let said: { cityId?: number; rite?: string } | null = null;
    for (let step = 0; step < 80 && said === null; step++) {
      const command = nextBotCommand(game.state, 0);
      if (command === null) break;
      if (command.type === 'performRite' && command.cityId === city.id) said = command;
      if (!dispatch(game, command as never).ok) break;
    }
    expect(said).not.toBeNull();
    expect(said!.rite).not.toBe('riteOfTheHarvest');
  });
});
