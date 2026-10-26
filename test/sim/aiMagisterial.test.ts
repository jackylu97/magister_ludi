/**
 * **Magisterial batch MG17: bot pricing** (`docs/plans/magisterial-themes-triage.md`,
 * the MG17 section).
 *
 * Before this batch the Magisterial shapes of batches MG4 to MG16 met a
 * stand-in price. This file pins what MG17 adds:
 *
 *   · **a price for each new kind**, read off the board where the board can
 *     say it and off one knob in `score.magisterial` where it cannot: the
 *     counts of Orders, decks and Doctrines held, the moments (a government
 *     adopted, a great person spent, the hand's price), the rules, the wider
 *     hand, the on-draft grants, the claims, the Doctrine offer, the combat
 *     test on a work, the two rider filters and the empire-wide wall;
 *   · **the commissions' forecasts** for the new tallies and figures;
 *   · **the behaviours**: the pass candidate adds what the seat's pass riders
 *     pay, the purse buys a wonder with culture under Magnificence, a person
 *     acts before it lays its work under The Universal Genius, and The Mixed
 *     Constitution is priced at what unseating it would lose.
 *
 * Every figure is computed here off the sheet or off the context the arm read,
 * the discipline of `aiDevotion.test.ts` and `aiCommerce.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { nextBotDecision, scoreCard, valueContext } from '../../src/ai/bot';
import { type ValueTerm } from '../../src/ai/decision';
import {
  type ValueContext,
  bagOfTileYield,
  delayDiscount,
  explainActFor,
  explainBuildingRow,
  explainCardEffects,
  explainCommission,
  explainCounted,
  explainEffects,
  explainLump,
  lumpOfPoints,
  onDraftWorth,
  scoreEffects,
  valueOfYields,
  voiceWeight,
} from '../../src/ai/value';
import { expectedBestOrder } from '../../src/ai/wants';
import aiJson from '../../data/ai.json';
import boundsJson from '../../data/ai.bounds.json';

import { buildingDef, isWonder } from '../../src/sim/buildingData';
import { buildingProductionCost, foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { gardenWorkFor } from '../../src/sim/commissions';
import { type Game, dispatch } from '../../src/sim/game';
import { FAMILIES, LIVE_GREAT_PERSON_IDS, greatPersonDef } from '../../src/sim/greatPeopleData';
import { type GameMap, type Tile, createMap, getTileAt, mapRange, tileHex, tileIndex } from '../../src/sim/map';
import { readCity } from '../../src/sim/readings';
import { renownPerTurn, renownThreshold } from '../../src/sim/renown';
import { RULES } from '../../src/sim/rulesData';
import {
  type City,
  type GameConfig,
  type GameState,
  type Player,
  bumpRevision,
  capitalCityOf,
  createUnit,
  playerById,
  tileOwnerField,
} from '../../src/sim/state';
import { countOf, slotTypesOf } from '../../src/sim/statecraft';
import {
  HAND_POSITIONS,
  doctrineBagFor,
  draftCostFor,
  expectedHandBags,
  foreignCardBag,
  nextDraftCost,
  offerSize,
  rarityFirstOdds,
} from '../../src/sim/statecraft/draft';
import {
  type CardEffect,
  type CardPaysEffect,
  GOVERNMENT_IDS,
  GOVERNMENT_TIERS,
  type OrderId,
  doctrineDef,
  governmentDef,
  orderDef,
} from '../../src/sim/statecraftData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { foldTile, yieldContextFor } from '../../src/sim/yields/hex';
import { foldEmpireRates } from '../../src/sim/yields/empire';
import { foldCity } from '../../src/sim/yields/town';
import { grownGames } from './grownGameHelpers';
import { newGame } from './newGameHelpers';

const HORIZON = aiJson.priorities.horizonTurns;
const MAGISTERIAL = aiJson.score.magisterial;
const TALLY = aiJson.score.tallyForecast;

const UNIVERSAL_LIBRARY = 'theUniversalLibrary' as OrderId;
const POLYMATHS_STUDY = 'thePolymathsStudy' as OrderId;
const PANDECTS = 'thePandects' as OrderId;
const SED_FESTIVAL = 'theSedFestival' as OrderId;
const LAST_COMMISSION = 'theLastCommission' as OrderId;
const UNWRITTEN_CHAPTER = 'theUnwrittenChapter' as OrderId;
const ACCESSIONS_REGISTER = 'theAccessionsRegister' as OrderId;
const SECOND_SITTING = 'theSecondSitting' as OrderId;
const OFFICIALS = 'officialsByMerit' as OrderId;
const HALL_OF_WONDERS = 'theHallOfWonders' as OrderId;
const OPEN_DOOR = 'theOpenDoor' as OrderId;
const IMMORTALS = 'theImmortals' as OrderId;
const MAGNIFICENCE = 'magnificence' as OrderId;
const CONSTITUTION = 'theMixedConstitution' as OrderId;
const UNIVERSAL_GENIUS = 'theUniversalGenius' as OrderId;
const PULL = 'thePullOfTheMasters' as OrderId;
const ENVIOUS_EYE = 'theEnviousEye' as OrderId;
const WANDERING_MUSE = 'theWanderingMuse' as OrderId;
const RETROSPECTIVE = 'theGrandRetrospective' as OrderId;
const CABINET = 'theCabinetOfCuriosities' as OrderId;
const LANDMARK_BOUNDS = 'theLandmarkBounds' as OrderId;
const CUSTODIANS = 'theCustodians' as OrderId;
const BULWARK = 'theBulwarkOfMarvels' as OrderId;
const WORKSHOP = 'theWorkshopAtOlympia' as OrderId;
const ROLL_OF_THE_SENATE = 'magisterialTheRollOfTheSenate' as OrderId;
const EIGHTH_WONDER = 'magisterialTheEighthWonder' as OrderId;
const WONDER_OF_THE_AGE = 'magisterialTheWonderOfTheAge' as OrderId;
const GOLDEN_BULL = 'magisterialTheGoldenBull' as OrderId;
const PARADISE_GARDEN = 'magisterialTheParadiseGarden' as OrderId;
const SECOND_READING = 'theSecondReading' as OrderId;
const POLEMARCH = 'thePolemarch' as OrderId;
const PRYTANEION = 'thePrytaneion' as OrderId;
const PATRONS_GALLERY = 'magisterialThePatronsGallery' as OrderId;

/** A world wonder a bare town may raise, and the Opus. */
const WONDER = 'theOracle' as const;
const OPUS = 'theMagnumOpus' as const;
const WORK = 'academy' as const;

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
  bumpRevision(state);
  return town;
}

/** Gives a hex to a town, as the borders would. */
function own(state: GameState, tile: Tile, city: City): void {
  state.tileOwner[tileIndex(state.map, tile.col, tile.row)] = city.id;
  bumpRevision(state);
}

function effectsOf(id: OrderId): CardEffect[] {
  return orderDef(id).effects;
}

/** The hands a seat's culture buys over the horizon, walked as `draftsAhead` walks them. */
function draftsAheadOf(state: GameState, player: Player): number {
  const income = Math.max(0, foldEmpireRates(state, player.id).culturePerTurn ?? 0);
  let budget = Math.max(0, player.culturePool) + income * HORIZON;
  let drafts = 0;
  while (drafts < HORIZON) {
    const price = draftCostFor(state, player, player.statecraft.drafts + drafts);
    if (price > budget) break;
    budget -= Math.max(0, price);
    drafts += 1;
  }
  return drafts;
}

/** Great people a turn, as `personRate` reads it. */
function personRateOf(state: GameState, player: Player): number {
  return Math.max(0, renownPerTurn(state, player.id)) / Math.max(1, renownThreshold(state, player));
}

/** What a hex a card claims is worth a turn, as `claimedHexWorth` reads it. */
function claimedHex(ctx: ValueContext, tile: Tile): number {
  const sight = yieldContextFor(ctx.state, ctx.playerId);
  return valueOfYields(bagOfTileYield(foldTile(tile, sight)), ctx) * MAGISTERIAL.claimedHexShare;
}

/** What `widerHandShare` gives for a hand of `base` cards widened to `wider`. */
function widerShare(base: number, wider: number): number {
  if (wider <= base) return 0;
  return wider / (wider + 1) / (base / (base + 1)) - 1;
}

/** Every term of an appraisal and of its nested parts, flattened. */
function allTerms(terms: readonly ValueTerm[]): ValueTerm[] {
  return terms.flatMap((term) => [term, ...allTerms(term.parts ?? [])]);
}

/** One seat's capital, which every test board has. */
function capital(state: GameState, playerId: number): City {
  const city = capitalCityOf(state, playerId);
  if (!city) throw new Error(`seat ${playerId} has no capital`);
  return city;
}

// --- the sheet --------------------------------------------------------------------

const VALUE_SOURCE = (
  import.meta.glob('../../src/ai/value.ts', { query: '?raw', import: 'default', eager: true }) as Record<
    string,
    string
  >
)['../../src/ai/value.ts']!;

describe('the sheet', () => {
  it('carries the score.magisterial group, and a bounds row for every knob in it', () => {
    expect(Object.keys(MAGISTERIAL).sort()).toEqual(
      ['claimedHexShare', 'lostRaceShare', 'opusShare', 'wonderFrontShare', 'workBesideShare'].sort(),
    );
    const bounds = boundsJson as Record<string, { min: number; max: number }>;
    for (const [knob, value] of Object.entries(MAGISTERIAL)) {
      const row = bounds[`score.magisterial.${knob}`];
      expect(row, knob).toBeDefined();
      expect(value, knob).toBeGreaterThanOrEqual(row!.min);
      expect(value, knob).toBeLessThanOrEqual(row!.max);
    }
    const tally = bounds['score.tallyForecast.wonderCompleted'];
    expect(tally).toBeDefined();
    expect(TALLY.wonderCompleted).toBeGreaterThanOrEqual(tally!.min);
    expect(TALLY.wonderCompleted).toBeLessThanOrEqual(tally!.max);
  });

  it('leaves no Magisterial stand-in waiting for this batch', () => {
    // Batches MG4 to MG16 each wrote "a stand-in until batch MG17" beside an arm.
    expect(VALUE_SOURCE).not.toContain('until batch MG17');
    for (const rule of [
      'wonderHammersMoveOn',
      'cultureBuysWonders',
      'cardsFitAnyChair',
      'actThenWork',
      'worksPullRivalHexes',
      'legaciesCountTwice',
    ]) {
      expect(VALUE_SOURCE, rule).not.toContain(`effect.rule === '${rule}') return ctx.ai.score.unknownEffect`);
    }
    expect(VALUE_SOURCE).not.toContain("namesCondition(effect.when, 'standingOnWork')) return ctx.ai.score.unknownEffect");
    expect(VALUE_SOURCE).not.toContain('grant.claimBeside === true) worth += ctx.ai.score.unknownEffect');
  });
});

// --- the counts --------------------------------------------------------------------

describe('the counts of the collection', () => {
  /** A seat holding a few Orders, with culture banked for several hands. */
  function collector(): { state: GameState; player: Player } {
    const { state, player } = board([6]);
    player.statecraft.orders.push(SECOND_READING, OPEN_DOOR, WANDERING_MUSE);
    player.culturePool = 400;
    bumpRevision(state);
    return { state, player };
  }

  it('counts the Orders held, and adds one for each hand the culture buys over the horizon', () => {
    const { state, player } = collector();
    const ctx = valueContext(state, player);
    const probe: CardPaysEffect = {
      kind: 'pays',
      where: 'empire',
      basis: 'count',
      count: 'ordersHeld',
      to: 'culture',
      amount: 1,
    };
    const counted = explainCounted(probe, ctx);
    expect(counted.terms[0]!.value).toBe(player.statecraft.orders.length);
    const ahead = draftsAheadOf(state, player);
    expect(ahead).toBeGreaterThan(0);
    expect(counted.terms[1]!.value).toBe(ahead);
  });

  it('prices The Universal Library on the Orders held and the hands to come, at its cap', () => {
    const { state, player } = collector();
    const ctx = valueContext(state, player);
    const [bonus] = effectsOf(UNIVERSAL_LIBRARY) as Extract<CardEffect, { kind: 'productionBonus' }>[];
    const helpings = Math.min(bonus!.max!, player.statecraft.orders.length + draftsAheadOf(state, player));
    const expected =
      voiceWeight(ctx, 'production') *
      (bonus!.percent / 100) *
      aiJson.score.unknownEffect *
      aiJson.score.nominalCount *
      ctx.cities *
      helpings;
    expect(explainEffects([bonus!], ctx).terms[0]!.value).toBeCloseTo(expected, 10);
  });

  it('counts the decks among the Orders held, and the decks still to find', () => {
    const { state, player } = collector();
    const ctx = valueContext(state, player);
    const [science] = effectsOf(POLYMATHS_STUDY) as CardPaysEffect[];
    const counted = explainCounted(science!, ctx);
    const held = countOf(state, 0, '' as never, science!);
    expect(counted.terms[0]!.value).toBe(held);
    const open = player.decks.length + 1;
    expect(counted.terms[1]!.value).toBe(Math.min(draftsAheadOf(state, player), Math.max(0, open - held)));
  });

  it('counts the Doctrines to come at the adoptions ahead whose tier still has one to offer', () => {
    const { state, player } = collector();
    player.decks = ['magisterial', 'dominion'] as never;
    const tier = GOVERNMENT_TIERS.find((rung) => doctrineBagFor(player, rung).length > 0);
    expect(tier).toBeDefined();
    player.statecraft.drafts = tier! - 1;
    player.culturePool = 5000;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const [science] = effectsOf(PANDECTS) as CardPaysEffect[];
    const counted = explainCounted(science!, ctx);
    const reach = player.statecraft.drafts + draftsAheadOf(state, player);
    const offered = GOVERNMENT_TIERS.filter(
      (rung) => rung > player.statecraft.drafts && rung <= reach && doctrineBagFor(player, rung).length > 0,
    ).length;
    expect(offered).toBeGreaterThan(0);
    expect(counted.terms[1]!.value).toBe(offered);
  });
});

// --- the moments --------------------------------------------------------------------

describe('the moments', () => {
  it('prices a government adopted at the ladder’s pace (The Sed Festival)', () => {
    const { state, player } = board([6]);
    const tier = GOVERNMENT_TIERS[0]!;
    player.statecraft.drafts = tier - 1;
    player.culturePool = 2000;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const reach = player.statecraft.drafts + draftsAheadOf(state, player);
    const tiers = GOVERNMENT_TIERS.filter((rung) => rung > player.statecraft.drafts && rung <= reach).length;
    expect(tiers).toBeGreaterThan(0);
    const person = lumpOfPoints(renownThreshold(state, player) * aiJson.weights.renown, ctx).total;
    expect(scoreEffects(effectsOf(SED_FESTIVAL), ctx)).toBeCloseTo((tiers / HORIZON) * person, 10);
  });

  it('prices no adoption for a seat past the last government tier', () => {
    const { state, player } = board([6]);
    player.statecraft.drafts = GOVERNMENT_TIERS[GOVERNMENT_TIERS.length - 1]! + 1;
    bumpRevision(state);
    expect(scoreEffects(effectsOf(SED_FESTIVAL), valueContext(state, player))).toBe(0);
  });

  it('prices a great person spent at the seat’s own pace, while a town raises the Opus (The Last Commission)', () => {
    const { state, player, towns } = board([6]);
    hold(state, 0, WORKSHOP);
    towns[0]!.buildings.push(WONDER);
    towns[0]!.queue = [{ kind: 'building', id: OPUS }];
    refreshCityDerived(state, towns[0]!);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const pace = personRateOf(state, player);
    expect(pace).toBeGreaterThan(0);
    const lump = explainLump({ production: 150 }, ctx).total;
    expect(scoreEffects(effectsOf(LAST_COMMISSION), ctx)).toBeCloseTo(pace * lump, 10);
    // A person standing now is one more moment over the horizon.
    const person = LIVE_GREAT_PERSON_IDS[0]!;
    createUnit(state, 0, 'greatPerson', towns[0]!.col, towns[0]!.row, person);
    bumpRevision(state);
    const standing = valueContext(state, player);
    expect(scoreEffects(effectsOf(LAST_COMMISSION), standing)).toBeCloseTo(
      (personRateOf(state, player) + 1 / HORIZON) * explainLump({ production: 150 }, standing).total,
      10,
    );
  });

  it('pays The Last Commission nothing while no town may raise the Opus', () => {
    const { state, player, towns } = board([6]);
    hold(state, 0, WORKSHOP);
    towns[0]!.buildings.push(WONDER);
    refreshCityDerived(state, towns[0]!);
    bumpRevision(state);
    expect(scoreEffects(effectsOf(LAST_COMMISSION), valueContext(state, player))).toBe(0);
  });

  it('reads the hand’s price for a pass and a pick (The Unwritten Chapter, The Accessions Register)', () => {
    const { state, player } = board([6]);
    const ctx = valueContext(state, player);
    const culture = Math.max(0, foldEmpireRates(state, 0).culturePerTurn ?? 0);
    expect(culture).toBeGreaterThan(0);
    const price = nextDraftCost(state, player);
    const after = draftCostFor(state, player, player.statecraft.drafts + 1);
    const science = explainLump({ science: Math.floor(0.5 * price) }, ctx).total;
    expect(scoreEffects(effectsOf(UNWRITTEN_CHAPTER), ctx)).toBeCloseTo((culture / after / 2) * science, 10);
    const production = explainLump({ production: Math.floor(0.5 * price) }, ctx).total;
    expect(scoreEffects(effectsOf(ACCESSIONS_REGISTER), ctx)).toBeCloseTo((culture / after) * production, 10);
  });

  it('prices a free hand at the culture a hand costs, at culture’s price (The Second Sitting)', () => {
    const { state, player } = board([6]);
    const ctx = valueContext(state, player);
    const culture = Math.max(0, foldEmpireRates(state, 0).culturePerTurn ?? 0);
    const after = draftCostFor(state, player, player.statecraft.drafts + 1);
    const hand = explainLump({ culture: nextDraftCost(state, player) }, ctx).total;
    expect(scoreEffects(effectsOf(SECOND_SITTING), ctx)).toBeCloseTo((culture / after / 2) * hand, 10);
  });
});

// --- the hand -------------------------------------------------------------------------

describe('the hand', () => {
  it('prices Officials by Merit’s two cards at what they add to each hand, and its refusal at nothing', () => {
    const { state, player } = board([6]);
    player.culturePool = 400;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const [rider, rule] = effectsOf(OFFICIALS);
    expect(rule!.kind).toBe('rule');
    expect(scoreEffects([rule!], ctx)).toBe(0);
    const hand = explainLump({ culture: nextDraftCost(state, player) }, ctx).total;
    const base = Math.max(HAND_POSITIONS, offerSize(state, 0, 'order'));
    const wider = Math.min(RULES.offers.max, base + 2);
    const expected = (draftsAheadOf(state, player) / HORIZON) * hand * widerShare(base, wider);
    expect(expected).toBeGreaterThan(0);
    expect(scoreEffects([rider!], ctx)).toBeCloseTo(expected, 10);
  });

  it('counts The Hall of Wonders’ cards on the wonders held, two wonders a card, at most two', () => {
    const { state, player, towns } = board([6]);
    player.culturePool = 400;
    const ids = [WONDER, 'stonehenge', 'pyramids', 'hangingGardens'] as const;
    /** The card's price with this many wonders standing, and the price the reading should give. */
    const priced = (wonders: number, extra: number): { worth: number; expected: number } => {
      towns[0]!.buildings = towns[0]!.buildings.filter((id) => !isWonder(id));
      towns[0]!.buildings.push(...ids.slice(0, wonders));
      refreshCityDerived(state, towns[0]!);
      bumpRevision(state);
      const ctx = valueContext(state, player);
      const hand = explainLump({ culture: nextDraftCost(state, player) }, ctx).total;
      const pace = draftsAheadOf(state, player) / HORIZON;
      const base = Math.max(HAND_POSITIONS, offerSize(state, 0, 'order'));
      return {
        worth: scoreEffects(effectsOf(HALL_OF_WONDERS), ctx),
        expected: pace * hand * widerShare(base, Math.min(RULES.offers.max, base + extra)),
      };
    };
    expect(priced(0, 0).worth).toBe(0);
    const two = priced(2, 1);
    expect(two.expected).toBeGreaterThan(0);
    expect(two.worth).toBeCloseTo(two.expected, 10);
    const four = priced(4, 2);
    expect(four.worth).toBeCloseTo(four.expected, 10);
  });

  it('prices The Open Door at the share of the seat’s culture each hand no longer costs', () => {
    const { state, player } = board([6]);
    const ctx = valueContext(state, player);
    const culture = Math.max(0, foldEmpireRates(state, 0).culturePerTurn ?? 0);
    expect(scoreEffects(effectsOf(OPEN_DOOR), ctx)).toBeCloseTo(0.15 * culture * voiceWeight(ctx, 'culture'), 10);
  });
});

// --- the rules ---------------------------------------------------------------------------

describe('the rules', () => {
  it('reads each live legacy again for The Immortals, and a lost one not at all', () => {
    const { state, player } = board([6]);
    const named = LIVE_GREAT_PERSON_IDS.find((id) =>
      greatPersonDef(id).legacy.some((effect) => effect.kind === 'productionBonus'),
    )!;
    player.legacies = [{ id: named, age: 1 } as never];
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const lines = greatPersonDef(named).legacy.filter(
      (effect) =>
        !['rule', 'metaRule', 'grantsAbility', 'unlocksBuilding', 'unlocksUnit', 'unlocksImprovement'].includes(
          effect.kind,
        ),
    );
    const again = explainEffects(lines, ctx).total;
    let roster = 0;
    for (const id of LIVE_GREAT_PERSON_IDS) {
      const kept = greatPersonDef(id).legacy.filter(
        (effect) =>
          !['rule', 'metaRule', 'grantsAbility', 'unlocksBuilding', 'unlocksUnit', 'unlocksImprovement'].includes(
            effect.kind,
          ),
      );
      roster += kept.length === 0 ? 0 : explainEffects(kept, ctx).total;
    }
    const later = (personRateOf(state, player) * HORIZON * (roster / LIVE_GREAT_PERSON_IDS.length)) / 2;
    expect(again).toBeGreaterThan(0);
    expect(scoreEffects(effectsOf(IMMORTALS), ctx)).toBeCloseTo(again + later, 10);
    player.legacies = [{ id: named, age: 1, revoked: true } as never];
    bumpRevision(state);
    expect(scoreEffects(effectsOf(IMMORTALS), valueContext(state, player))).toBeCloseTo(later, 10);
  });

  it('prices Magnificence at a wonder landing now, less the culture it costs, and nothing without one raised', () => {
    const { state, player, towns } = board([3]);
    expect(scoreEffects(effectsOf(MAGNIFICENCE), valueContext(state, player))).toBe(0);
    towns[0]!.queue = [{ kind: 'building', id: WONDER }];
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const needed = buildingProductionCost(WONDER, state, 0);
    const made = Math.max(0, foldCity(state, towns[0]!, [], null, readCity(state, towns[0]!)).production);
    const wait = Math.ceil(needed / Math.max(1, made));
    const def = buildingDef(WONDER);
    const row =
      valueOfYields(
        {
          food: def.food ?? 0,
          production: def.production ?? 0,
          gold: def.gold ?? 0,
          science: def.science ?? 0,
          culture: def.culture ?? 0,
          faith: def.faith ?? 0,
        },
        ctx,
      ) + explainBuildingRow(WONDER, ctx).total;
    const price = explainLump({ culture: Math.ceil(needed * RULES.production.culturePerHammer) }, ctx).total;
    const sooner = delayDiscount(0, ctx) - delayDiscount(wait, ctx);
    expect(scoreEffects(effectsOf(MAGNIFICENCE), ctx)).toBeCloseTo(Math.max(0, row * sooner - price), 10);
  });

  it('prices The Mixed Constitution at the cards only its fit would seat', () => {
    const { state, player } = board([6]);
    // A Wildcard card held, which no typed chair of the first government takes.
    player.statecraft.orders.push(SECOND_READING);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const own = explainCardEffects(SECOND_READING, effectsOf(SECOND_READING), ctx).total;
    expect(own).toBeGreaterThan(0);
    expect(scoreEffects(effectsOf(CONSTITUTION), ctx)).toBeCloseTo(own, 10);
  });

  it('keeps The Mixed Constitution against a bench card worth less than the cards it seats', () => {
    const { state, player } = board([6]);
    const sc = player.statecraft;
    sc.orders.push(SECOND_READING, OFFICIALS, CONSTITUTION);
    // In the government's own Wildcard chair, so the council has no chair more.
    const wildcard = slotTypesOf(sc).indexOf('wildcard');
    expect(wildcard).toBeGreaterThanOrEqual(0);
    sc.slots[wildcard] = { card: CONSTITUTION, sealedUntil: state.turn };
    bumpRevision(state);
    const ctx = valueContext(state, player);
    // Unseating it would send the Wildcard cards that only its fit seats back
    // to the collection, so it is worth at least the best of them.
    const best = Math.max(
      explainCardEffects(SECOND_READING, effectsOf(SECOND_READING), ctx).total,
      explainCardEffects(OFFICIALS, effectsOf(OFFICIALS), ctx).total,
    );
    expect(scoreEffects(effectsOf(CONSTITUTION), ctx)).toBeGreaterThanOrEqual(best - 1e-9);
    expect(scoreCard(player, CONSTITUTION, ctx)).toBeGreaterThan(scoreCard(player, SECOND_READING, ctx));
  });

  it('prices The Universal Genius at the mean act of the five families, at the pace people come', () => {
    const { state, player, towns } = board([6]);
    hold(state, 0, WORKSHOP);
    towns[0]!.buildings.push(WONDER);
    refreshCityDerived(state, towns[0]!);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const here = { col: towns[0]!.col, row: towns[0]!.row };
    let acts = 0;
    for (const family of FAMILIES) acts += explainActFor(state, player, ctx, family, here)?.total ?? 0;
    const expected = personRateOf(state, player) * (acts / FAMILIES.length);
    expect(expected).toBeGreaterThan(0);
    expect(scoreEffects(effectsOf(UNIVERSAL_GENIUS), ctx)).toBeCloseTo(expected, 10);
  });

  it('prices The Pull of the Masters at the rival hexes beside its works that the sweep may take', () => {
    const { state, player, towns } = board([6]);
    const rival = rivalTown(state, 11, 4);
    const work = at(state.map, 5, 5);
    own(state, work, towns[0]!);
    work.improvement = WORK;
    const taken = at(state.map, 6, 5);
    own(state, taken, rival);
    rival.workedTiles = rival.workedTiles.filter((cell) => cell.col !== 6 || cell.row !== 5);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    // Every rival hex beside the work, as the sweep reads it.
    const owner = tileOwnerField(state);
    let expected = 0;
    for (const next of mapRange(state.map, tileHex(work), 1)) {
      const index = tileIndex(state.map, next.col, next.row);
      if (owner.at(index) !== 1) continue;
      if (rival.col === next.col && rival.row === next.row) continue;
      if (rival.workedTiles.some((cell) => cell.col === next.col && cell.row === next.row)) continue;
      expected += claimedHex(ctx, next);
    }
    expect(expected).toBeGreaterThan(0);
    expect(scoreEffects(effectsOf(PULL), ctx)).toBeCloseTo(expected, 10);
  });

  it('prices The Envious Eye higher for the hammers already banked toward a wonder', () => {
    const { state, player, towns } = board([6]);
    towns[0]!.queue = [{ kind: 'building', id: WONDER }];
    bumpRevision(state);
    const empty = scoreEffects(effectsOf(ENVIOUS_EYE), valueContext(state, player));
    towns[0]!.hammerBasket = 100;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const refund = RULES.production.wonderRefundGoldPerHammer;
    const gain = voiceWeight(ctx, 'production') - refund * voiceWeight(ctx, 'gold');
    const banked = gain <= 0
      ? 0
      : explainLump(
          { production: 100 * MAGISTERIAL.lostRaceShare, gold: -100 * MAGISTERIAL.lostRaceShare * refund },
          ctx,
        ).total;
    expect(scoreEffects(effectsOf(ENVIOUS_EYE), ctx) - empty).toBeCloseTo(banked, 6);
  });
});

// --- the grants -----------------------------------------------------------------------------

describe('the grants', () => {
  it('prices The Wandering Muse’s great person at the renown the next one costs', () => {
    const { state, player } = board([6]);
    const ctx = valueContext(state, player);
    expect(onDraftWorth(WANDERING_MUSE, ctx)).toBeCloseTo(
      lumpOfPoints(renownThreshold(state, player) * aiJson.weights.renown, ctx).total,
      10,
    );
  });

  it('prices The Grand Retrospective at its counts now, itself among the Orders', () => {
    const { state, player, towns } = board([6]);
    towns[0]!.buildings.push(WONDER);
    player.statecraft.orders.push(SECOND_READING, OPEN_DOOR);
    const work = at(state.map, 4, 5);
    own(state, work, towns[0]!);
    work.improvement = WORK;
    refreshCityDerived(state, towns[0]!);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const counts = [1, 1, player.statecraft.orders.length + 1];
    let expected = 0;
    for (const found of counts) {
      for (const voice of ['culture', 'science', 'production'] as const) {
        expected += explainLump({ [voice]: 20 * found }, ctx).total;
      }
    }
    expect(onDraftWorth(RETROSPECTIVE, ctx)).toBeCloseTo(expected, 8);
  });

  it('prices The Cabinet of Curiosities at the mean card of the bag it draws from', () => {
    const { state, player } = board([6]);
    // A seat of two decks, so four decks are foreign to it.
    player.decks = ['magisterial', 'dominion'] as never;
    player.statecraft.drafts = 12;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    let expected = 0;
    for (const { id, chance } of rarityFirstOdds(foreignCardBag(state, player), 0)) {
      expected += chance * explainCardEffects(id, effectsOf(id), ctx).total;
    }
    expect(foreignCardBag(state, player).length).toBeGreaterThan(0);
    expect(onDraftWorth(CABINET, ctx)).toBeCloseTo(expected, 8);
  });

  it('prices The Landmark Bounds’ claim at the unowned land beside the seat’s ground, at the pace it lays works', () => {
    const { state, player, towns } = board([6]);
    hold(state, 0, WORKSHOP);
    towns[0]!.buildings.push(WONDER);
    refreshCityDerived(state, towns[0]!);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const owner = tileOwnerField(state);
    let sites = 0;
    let worth = 0;
    for (let index = 0; index < state.map.tiles.length; index++) {
      const tile = state.map.tiles[index]!;
      if (owner.at(index) !== 0 || state.cities.some((city) => city.col === tile.col && city.row === tile.row)) {
        continue;
      }
      sites += 1;
      for (const next of mapRange(state.map, tileHex(tile), 1)) {
        if (next === tile) continue;
        if (owner.at(tileIndex(state.map, next.col, next.row)) !== null) continue;
        worth += claimedHex(ctx, next);
      }
    }
    expect(sites).toBeGreaterThan(0);
    // A seat that has called nobody lays a work with half its people.
    const rate = personRateOf(state, player) / 2;
    expect(rate).toBeGreaterThan(0);
    expect(scoreEffects(effectsOf(LANDMARK_BOUNDS), ctx)).toBeCloseTo(rate * (worth / sites), 8);
  });
});

// --- combat and walls ------------------------------------------------------------------------

describe('combat on a work, and the wall of the Opus town', () => {
  it('prices The Custodians at the share of fights on a work', () => {
    const { state, player, towns } = board([6]);
    const work = at(state.map, 4, 5);
    own(state, work, towns[0]!);
    work.improvement = WORK;
    createUnit(state, 0, 'warrior', 4, 5);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    // One fighting unit, standing on the work.
    const line = 4 * aiJson.weights.military * (1 + ctx.threat);
    expect(scoreEffects(effectsOf(CUSTODIANS), ctx)).toBeCloseTo(line, 10);
    // Off the work, the share of the seat's land that is a work.
    state.units[0]!.col = 3;
    bumpRevision(state);
    const off = valueContext(state, player);
    const owner = tileOwnerField(state);
    let owned = 0;
    for (let index = 0; index < state.map.tiles.length; index++) if (owner.at(index) === 0) owned += 1;
    expect(scoreEffects(effectsOf(CUSTODIANS), off)).toBeCloseTo(
      4 * aiJson.weights.military * (1 + off.threat) * (1 / owned),
      10,
    );
  });

  it('counts every wonder the seat holds on The Bulwark of Marvels’ wall in the town raising the Opus', () => {
    const { state, player, towns } = board([6, 4]);
    towns[1]!.buildings.push(WONDER, 'stonehenge', 'pyramids');
    refreshCityDerived(state, towns[1]!);
    bumpRevision(state);
    expect(scoreEffects(effectsOf(BULWARK), valueContext(state, player))).toBe(0);
    towns[0]!.queue = [{ kind: 'building', id: OPUS }];
    bumpRevision(state);
    const ctx = valueContext(state, player);
    expect(scoreEffects(effectsOf(BULWARK), ctx)).toBeCloseTo(4 * 3 * aiJson.weights.military * (1 + ctx.threat), 10);
  });
});

// --- the commissions --------------------------------------------------------------------------

describe('the commissions', () => {
  it('forecasts The Roll of the Senate at the drafting pace', () => {
    const { state, player } = board([6]);
    player.statecraft.orders.push(SECOND_READING);
    player.culturePool = 400;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const appraisal = explainCommission(ROLL_OF_THE_SENATE, ctx)!;
    const remaining = 10 - player.statecraft.orders.length;
    const rate = draftsAheadOf(state, player) / HORIZON;
    const turns = Math.min(HORIZON, Math.max(1, Math.ceil(remaining / rate)));
    expect(appraisal.terms[1]!.value).toBeCloseTo(delayDiscount(turns, ctx), 10);
    expect(appraisal.terms[1]!.label).toContain('more Orders');
  });

  it('forecasts The Eighth Wonder at the nearest wonder its towns are raising', () => {
    const { state, player, towns } = board([6]);
    hold(state, 0, EIGHTH_WONDER);
    towns[0]!.queue = [{ kind: 'building', id: WONDER }];
    towns[0]!.hammerBasket = 30;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const appraisal = explainCommission(EIGHTH_WONDER, ctx)!;
    const made = Math.max(1, foldCity(state, towns[0]!, [], null, readCity(state, towns[0]!)).production);
    const turns = Math.min(
      HORIZON,
      Math.max(1, Math.ceil((buildingProductionCost(WONDER, state, 0) - 30) / made)),
    );
    expect(appraisal.terms[1]!.value).toBeCloseTo(delayDiscount(turns, ctx), 10);
    expect(appraisal.terms[1]!.label).toContain(buildingDef(WONDER).name);
  });

  it('forecasts The Wonder of the Age at the production its towns put into wonders', () => {
    const { state, player, towns } = board([6, 4]);
    hold(state, 0, WONDER_OF_THE_AGE);
    towns[0]!.queue = [{ kind: 'building', id: WONDER }];
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const made = (city: City): number => Math.max(0, foldCity(state, city, [], null, readCity(state, city)).production);
    const rate = made(towns[0]!) + made(towns[1]!) * MAGISTERIAL.wonderFrontShare;
    const turns = Math.min(HORIZON, Math.max(1, Math.ceil(1500 / rate)));
    expect(explainCommission(WONDER_OF_THE_AGE, ctx)!.terms[1]!.value).toBeCloseTo(delayDiscount(turns, ctx), 10);
  });

  it('forecasts The Golden Bull at once when held cards fill every typed chair, and at the drafting pace when not', () => {
    const { state, player } = board([6]);
    player.culturePool = 400;
    // The first government's typed chairs are one Military and one Economic.
    expect(slotTypesOf(player.statecraft).filter((type) => type !== 'wildcard').sort()).toEqual([
      'economic',
      'military',
    ]);
    player.statecraft.orders.push(POLEMARCH);
    bumpRevision(state);
    const short = valueContext(state, player);
    const rate = draftsAheadOf(state, player) / HORIZON;
    const turns = Math.min(HORIZON, Math.max(1, Math.ceil(1 / rate)));
    const waiting = explainCommission(GOLDEN_BULL, short)!.terms[1]!;
    expect(waiting.label).toContain('1 typed chairs wait for a new card');
    expect(waiting.value).toBeCloseTo(delayDiscount(turns, short), 10);
    player.statecraft.orders.push(PRYTANEION);
    bumpRevision(state);
    const full = valueContext(state, player);
    const filled = explainCommission(GOLDEN_BULL, full)!.terms[1]!;
    expect(filled.label).toContain('every typed chair can be filled');
    expect(filled.value).toBeCloseTo(delayDiscount(1, full), 10);
  });

  it('forecasts The Patron’s Gallery at the pace the seat lays works of families it lacks', () => {
    const { state, player, towns } = board([6]);
    hold(state, 0, WORKSHOP);
    towns[0]!.buildings.push(WONDER);
    const work = at(state.map, 4, 5);
    own(state, work, towns[0]!);
    work.improvement = WORK;
    refreshCityDerived(state, towns[0]!);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    // Six families of works, one held; a seat that has called nobody lays a
    // work with half its people.
    const rate = personRateOf(state, player) * (1 / 2) * (5 / 6);
    expect(rate).toBeGreaterThan(0);
    const turns = Math.min(HORIZON, Math.max(1, Math.ceil(2 / rate)));
    expect(explainCommission(PATRONS_GALLERY, ctx)!.terms[1]!.value).toBeCloseTo(delayDiscount(turns, ctx), 10);
  });

  it('forecasts The Paradise Garden at the share of works laid beside a work', () => {
    const { state, player, towns } = board([6]);
    hold(state, 0, WORKSHOP);
    towns[0]!.buildings.push(WONDER);
    const work = at(state.map, 4, 5);
    own(state, work, towns[0]!);
    work.improvement = WORK;
    refreshCityDerived(state, towns[0]!);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const rate = personRateOf(state, player) * (1 / 2) * MAGISTERIAL.workBesideShare;
    const turns = Math.min(HORIZON, Math.max(1, Math.ceil(3 / rate)));
    const forecast = explainCommission(PARADISE_GARDEN, ctx)!.terms[1]!;
    expect(forecast.label).toContain('more works beside a work');
    expect(forecast.value).toBeCloseTo(delayDiscount(turns, ctx), 10);
  });

  it('prices The Golden Bull’s Doctrine offer at the expected best of the offer, and nothing from an empty bag', () => {
    const { state, player } = board([6]);
    player.decks = ['magisterial', 'dominion'] as never;
    const government = GOVERNMENT_IDS.find(
      (id) => governmentDef(id).retired !== true && doctrineBagFor(player, governmentDef(id).tier).length > 3,
    );
    expect(government).toBeDefined();
    player.statecraft.government = government!;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const offerTerm = (context: ValueContext): ValueTerm =>
      allTerms(explainCommission(GOLDEN_BULL, context)!.terms).find((term) => term.label.startsWith('a Doctrine offer'))!;
    // The expected best, by every subset of the offer's size.
    const bag = doctrineBagFor(player, governmentDef(government!).tier);
    const prices = bag.map((id) => Math.max(0, explainCardEffects(id, doctrineDef(id).effects ?? [], ctx).total));
    const k = Math.min(prices.length, Math.max(HAND_POSITIONS, offerSize(state, 0, 'doctrine')));
    let sum = 0;
    let subsets = 0;
    const walk = (from: number, chosen: number[]): void => {
      if (chosen.length === k) {
        sum += Math.max(...chosen);
        subsets += 1;
        return;
      }
      for (let index = from; index < prices.length; index++) walk(index + 1, [...chosen, prices[index]!]);
    };
    walk(0, []);
    expect(offerTerm(ctx).value).toBeCloseTo(sum / subsets, 8);
    // Every Doctrine of the tier already held: the bag is empty.
    player.statecraft.doctrines.push(...bag);
    bumpRevision(state);
    expect(offerTerm(valueContext(state, player)).value).toBe(0);
  });

  it('prices The Paradise Garden’s land at the unowned hexes within three of the seat’s first work', () => {
    const { state, player, towns } = board([6]);
    const work = at(state.map, 4, 5);
    own(state, work, towns[0]!);
    work.improvement = WORK;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    expect(gardenWorkFor(state, 0, 0)).toBe(work);
    const owner = tileOwnerField(state);
    let expected = 0;
    for (const tile of mapRange(state.map, tileHex(work), 3)) {
      if (owner.at(tileIndex(state.map, tile.col, tile.row)) !== null) continue;
      expected += claimedHex(ctx, tile);
    }
    expect(expected).toBeGreaterThan(0);
    const land = allTerms(explainCommission(PARADISE_GARDEN, ctx)!.terms).find((term) =>
      term.label.includes('unowned hexes within 3'),
    )!;
    expect(land.value).toBeCloseTo(expected, 8);
  });
});

// --- the behaviours ---------------------------------------------------------------------------

describe('the pass candidate', () => {
  /** A seat with a paid hand of three on the table. */
  function dealt(price: number): { state: GameState; player: Player } {
    const { state, player } = board([6]);
    player.statecraft.pendingOrder = {
      options: [SECOND_READING, OPEN_DOOR, WANDERING_MUSE],
      ...(price > 0 ? { price } : {}),
    } as never;
    bumpRevision(state);
    return { state, player };
  }

  function passRow(state: GameState): { score: number; terms: ValueTerm[] } {
    const decision = nextBotDecision(state, 0)!;
    const row = decision.candidates.find((candidate) => candidate.label === 'pass the hand');
    if (!row) throw new Error('no pass candidate');
    return row;
  }

  it('adds The Unwritten Chapter’s science at this hand’s own price', () => {
    const { state, player } = dealt(120);
    const before = passRow(state).score;
    hold(state, 0, UNWRITTEN_CHAPTER);
    const ctx = valueContext(state, player);
    const row = passRow(state);
    const rider = row.terms.find((term) => term.label.includes(orderDef(UNWRITTEN_CHAPTER).name))!;
    expect(rider.value).toBeCloseTo(explainLump({ science: 60 }, ctx).total, 10);
    expect(row.score).toBeGreaterThan(before);
  });

  it('reads The Second Sitting’s free hand in full and at once for a paid hand, and not for a free one', () => {
    const { state, player } = dealt(120);
    hold(state, 0, SECOND_SITTING);
    const ctx = valueContext(state, player);
    const pitied = expectedBestOrder(expectedHandBags(state, player), player.statecraft.orderSkips + 1, (id) =>
      scoreCard(player, id, ctx),
    );
    const row = passRow(state);
    expect(row.terms[0]!.label).toContain('a free hand dealt at once');
    expect(row.score).toBeCloseTo(pitied, 8);
    // A free hand on the table: the card deals nothing for passing it.
    const free = dealt(0);
    hold(free.state, 0, SECOND_SITTING);
    expect(passRow(free.state).terms[0]!.label).toContain('what one more pass of pity adds');
  });
});

describe('the culture purse under Magnificence', () => {
  /** A seat raising a wonder, deep in the draft ladder, with culture banked below its next hand. */
  function raising(held: boolean): { state: GameState; player: Player; city: City } {
    const { state, player, towns } = board([3]);
    const city = towns[0]!;
    city.queue = [{ kind: 'building', id: WONDER }];
    // The wonder's own technology, so the purchase gate asks only the bank.
    player.techsResearched.push('divination' as never);
    player.gold = 0;
    player.statecraft.drafts = 20;
    player.culturePool = nextDraftCost(state, player) - 1;
    if (held) hold(state, 0, MAGNIFICENCE);
    bumpRevision(state);
    return { state, player, city };
  }

  it('books the wonder in the culture bank only under the rule', () => {
    const without = raising(false);
    expect(valueContext(without.state, without.player).wants.culture.some((want) => want.buy !== undefined)).toBe(
      false,
    );
    const { state, player, city } = raising(true);
    const row = valueContext(state, player).wants.culture.find((want) => want.buy !== undefined)!;
    expect(row.buy).toEqual({ cityId: city.id, item: { kind: 'building', id: WONDER } });
    expect(row.currency).toBe('culture');
    expect(row.price).toBe(Math.ceil(buildingProductionCost(WONDER, state, 0) * RULES.production.culturePerHammer));
  });

  it('buys the wonder with culture when it beats the hand the culture would deal', () => {
    const { state, player, city } = raising(true);
    const book = valueContext(state, player).wants.culture;
    const wonder = book.find((want) => want.buy !== undefined)!;
    const draft = book.find((want) => want.buy === undefined)!;
    expect(wonder.worth / wonder.price).toBeGreaterThan(draft.worth / draft.price);
    const decision = nextBotDecision(state, 0)!;
    expect(decision.command).toEqual({
      type: 'purchaseItem',
      playerId: 0,
      cityId: city.id,
      item: { kind: 'building', id: WONDER },
      currency: 'culture',
    });
  });
});

describe('a great person under The Universal Genius', () => {
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

  /** What one named piece would be told to do, with every other command played first. */
  function commandFor(game: Game, unitId: number): { type: string } | null {
    for (let step = 0; step < 80; step++) {
      const decision = nextBotDecision(game.state, 0);
      if (decision === null) return null;
      const command = decision.command;
      if ('unitId' in command && command.unitId === unitId) return command as { type: string };
      if (!dispatch(game, command as never).ok) return null;
    }
    return null;
  }

  /** A merchant standing in the capital, with or without the card. */
  function merchantAtHome(held: boolean): { game: Game; unitId: number } {
    const game = growDuel(8);
    const home = capital(game.state, 0);
    const merchant = LIVE_GREAT_PERSON_IDS.find((id) => greatPersonDef(id).family === 'merchant')!;
    if (held) hold(game.state, 0, UNIVERSAL_GENIUS);
    const person = createUnit(game.state, 0, 'greatPerson', home.col, home.row, merchant);
    bumpRevision(game.state);
    return { game, unitId: person.id };
  }

  it('heads for its work without the card, because its work is worth more than its act', () => {
    const { game, unitId } = merchantAtHome(false);
    expect(commandFor(game, unitId)?.type).not.toBe('greatPersonAct');
  });

  it('acts first with the card, because the act no longer costs it the work', () => {
    const { game, unitId } = merchantAtHome(true);
    expect(commandFor(game, unitId)?.type).toBe('greatPersonAct');
  });

});
