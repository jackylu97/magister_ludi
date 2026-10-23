/**
 * **Expansionist batch E13: bot pricing** (`docs/plans/expansionist-themes-triage.md`,
 * the E13 section).
 *
 * Before this batch the Expansionist shapes of batches E9 to E12 met a zero or
 * the general stand-in. This file pins what E13 adds:
 *
 *   · **a price for each new shape**, read off the board where the board can
 *     say it and off one knob in `score.expansionist` where it cannot: The Two
 *     Harvests, Commission: Break the Sod, The Cura Aquarum, The Burghers and
 *     The Marl Pits;
 *   · **the shapes the board prices with no knob**: The Mountain Schools'
 *     `atLeast`, The Public Good's promise and The Aediles' forecast;
 *   · **the shapes at nought for a seat with no levy card**: Watch and Ward,
 *     The Trained Bands and Veteran Colonies. Since the bot levy batch they
 *     are priced on the levy rate (`aiLevy.test.ts`), and a seat that holds
 *     no card raising a soldier, with no army over what it wants, reads
 *     nought for all three;
 *   · **the five Expansionist commissions**, priced by Dominion batch D16's
 *     commission price, with their institutions priced as their effects;
 *   · **what a town holds**: a town that The Cura Aquarum gives an Aqueduct
 *     gains nothing more from building one.
 *
 * Every figure is computed here off the sheet or off the context the arm read,
 * the discipline of `aiAppraisal.test.ts`, `aiCommissions.test.ts` and
 * `aiScientific.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import { withAiTuning } from '../../src/ai/aiConfig';
import {
  type ValueContext,
  buildTurns,
  delayDiscount,
  explainBuildingRow,
  explainCommission,
  explainCounted,
  explainLump,
  scoreEffects,
  valueOfYields,
} from '../../src/ai/value';
import aiJson from '../../data/ai.json';

import { BUILDING_IDS, buildingDef, isPublicWork } from '../../src/sim/buildingData';
import { buildingProductionCost, foundCityAt, ownedTiles } from '../../src/sim/cities';
import { explainGuildInflow, foldGuildInflow } from '../../src/sim/guilds';
import { type GameMap, type Tile, createMap, getTileAt, raiseImprovement } from '../../src/sim/map';
import { layRoad } from '../../src/sim/roads';
import { RULES } from '../../src/sim/rulesData';
import {
  type City,
  type GameState,
  type Player,
  bumpRevision,
  playerById,
} from '../../src/sim/state';
import { townHoldsBuilding } from '../../src/sim/statecraft/evaluator';
import {
  ORDER_IDS,
  type CardEffect,
  type CardPaysEffect,
  type OrderId,
  orderDef,
} from '../../src/sim/statecraftData';
import { buildError, researchExpansion } from '../../src/sim/tech';
import { type TechId } from '../../src/sim/techData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

const HORIZON = aiJson.priorities.horizonTurns;
const EXPANSIONIST = aiJson.score.expansionist;

// --- the bench ---------------------------------------------------------------

/** A blank board with two seats and nothing on it: `aiScientific`'s bench. */
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

/** The hexes a town owns, its own centre left out. */
function ring(state: GameState, city: City): Tile[] {
  return ownedTiles(state, city).filter((tile) => tile.col !== city.col || tile.row !== city.row);
}

/**
 * Lays works on hexes, each `age` turns old, and sets the town to work them.
 * The town works only the hexes this helper has handed it, so a count of
 * worked hexes is the count the test wrote.
 */
function work(state: GameState, city: City, hexes: Tile[], improvement: string, age: number): void {
  for (const tile of hexes) raiseImprovement(tile, improvement as never, state.turn - age);
  const laid = WORKED.get(city) ?? [];
  laid.push(...hexes.map((tile) => ({ col: tile.col, row: tile.row })));
  WORKED.set(city, laid);
  city.workedTiles = [...laid];
  bumpRevision(state);
}

const WORKED = new WeakMap<City, { col: number; row: number }[]>();

/** Seats an Order in the next chair, the way the live list reads it. */
function slot(state: GameState, player: Player, id: string): void {
  const card = id as OrderId;
  if (!player.statecraft.orders.includes(card)) player.statecraft.orders.push(card);
  const free = player.statecraft.slots.findIndex((chair) => chair === null);
  const chair = free >= 0 ? free : player.statecraft.slots.length;
  player.statecraft.slots[chair] = { card, sealedUntil: state.turn };
  bumpRevision(state);
}

/** The same sheet with one Expansionist knob set. */
function tuned(knob: keyof typeof EXPANSIONIST, value: number): Parameters<typeof withAiTuning>[0] {
  return { score: { expansionist: { [knob]: value } } } as Parameters<typeof withAiTuning>[0];
}

/** One effect of an Order row. */
function effectOf(id: string, index = 0): CardEffect {
  return orderDef(id as OrderId).effects[index]!;
}

/** A citizen's food at this seat's mean town, off the simulation's curve. */
function growthFood(meanPopulation: number): number {
  const rules = RULES.cities;
  return rules.growthBase + rules.growthLinear * Math.pow(Math.max(1, meanPopulation), rules.growthExponent);
}

// --- the new shapes, off their knobs --------------------------------------------

describe('a price for each Expansionist shape of E9 to E12 (E13)', () => {
  it('prices The Two Harvests by the tended-land lines it opens, and the works it names', () => {
    const { state, player, cities } = board(1, 20);
    const hexes = ring(state, cities[0]!);
    work(state, cities[0]!, hexes.slice(0, 3), 'farm', 5);
    work(state, cities[0]!, hexes.slice(3, 4), 'mine', 5);
    const harvests = [effectOf('theTwoHarvests')];
    // No card of this seat pays on tended land: the knob alone, for the four
    // works of the named rows inside the borders.
    expect(scoreEffects(harvests, valueContext(state, player))).toBe(EXPANSIONIST.fieldsTended * 4);
    const doubled = withAiTuning(tuned('fieldsTended', EXPANSIONIST.fieldsTended * 2), () =>
      scoreEffects(harvests, valueContext(state, player)),
    );
    expect(doubled).toBe(EXPANSIONIST.fieldsTended * 2 * 4);
    // The Garden of the World pays +2 food, +1 production and +1 culture on
    // each worked tended hex: the four worked works now count.
    slot(state, player, 'theGardenOfTheWorld');
    const ctx = valueContext(state, player);
    const hex = valueOfYields({ food: 2, production: 1, culture: 1 }, ctx);
    expect(scoreEffects(harvests, ctx)).toBe(4 * hex + EXPANSIONIST.fieldsTended * 4);
    // Seated, the card is priced by what it adds, not at nought.
    slot(state, player, 'theTwoHarvests');
    const seated = valueContext(state, player);
    expect(scoreEffects(harvests, seated)).toBe(
      4 * valueOfYields({ food: 2, production: 1, culture: 1 }, seated) + EXPANSIONIST.fieldsTended * 4,
    );
  });

  it('prices Break the Sod’s offset by the age lines it brings forward', () => {
    const { state, player, cities } = board(1, 40);
    const hexes = ring(state, cities[0]!);
    work(state, cities[0]!, hexes.slice(0, 2), 'farm', 12);
    work(state, cities[0]!, hexes.slice(2, 3), 'farm', 5);
    const offset: CardEffect[] = [{ kind: 'workAge', turns: 10 }];
    // No card reads a work's age: the knob, for each work and each turn.
    const knob = EXPANSIONIST.workAge * 10 * 3;
    expect(scoreEffects(offset, valueContext(state, player))).toBe(knob);
    // Dark Earth: +2 food on a farm of twenty turns. Ten turns older, the two
    // farms of twelve pay; the farm of five does not.
    slot(state, player, 'darkEarth');
    const ctx = valueContext(state, player);
    expect(scoreEffects(offset, ctx)).toBe(2 * valueOfYields({ food: 2 }, ctx) + knob);
    // The commission's institution is priced as its effect.
    const id = 'commissionBreakTheSod' as OrderId;
    const reward = explainCommission(id, ctx)!.terms[0]!.parts!;
    const lasting = reward.find((term) => term.label === 'for the rest of the game: workAge')!;
    expect(lasting.value).toBe(scoreEffects(offset, ctx));
  });

  it('prices The Cura Aquarum as the Aqueduct in each town joined by road', () => {
    const { state, player, cities } = board(3, 20);
    const cura = [effectOf('theCuraAquarum')];
    // A road joins the second town to the capital; the third is not joined.
    for (let col = 4; col <= 8; col++) layRoad(at(state.map, col, 5), 0);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const each = explainBuildingRow('aqueduct', ctx, undefined, false).total;
    expect(each).toBeGreaterThan(0);
    // One joined town, and the `heldLater` share of the town not yet joined.
    // The capital never counts.
    expect(scoreEffects(cura, ctx)).toBe(each * (1 + EXPANSIONIST.heldLater * 1));
    // A town that built its own Aqueduct gains nothing from the card.
    cities[1]!.buildings.push('aqueduct');
    bumpRevision(state);
    const built = valueContext(state, player);
    expect(scoreEffects(cura, built)).toBe(
      explainBuildingRow('aqueduct', built, undefined, false).total * (0 + EXPANSIONIST.heldLater * 1),
    );
  });

  it('prices The Burghers by the guild bars of the towns that can form a guild', () => {
    const { state, player, cities } = board(1, 20);
    const burghers = [effectOf('theBurghers')];
    const city = cities[0]!;
    // A town of six is not one of The Burghers' towns.
    expect(scoreEffects(burghers, valueContext(state, player))).toBe(0);
    // A town of twelve with no renown building forms no guild.
    city.population = 12;
    bumpRevision(state);
    expect(scoreEffects(burghers, valueContext(state, player))).toBe(0);
    // With a Library the scholars may form, and half of the bar is priced.
    city.buildings.push('library');
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const inflow = foldGuildInflow(explainGuildInflow(state, city));
    expect(inflow).toBeGreaterThan(0);
    expect(scoreEffects(burghers, ctx)).toBe(1 * (0.5 * inflow * EXPANSIONIST.guildPoint));
  });

  it('prices The Marl Pits by the farms and pastures a new mine or quarry would mark', () => {
    const { state, player, cities } = board(1, 20);
    const city = cities[0]!;
    const hexes = ring(state, city);
    for (const tile of hexes.slice(0, 3)) raiseImprovement(tile, 'farm' as never, state.turn);
    // One farm takes the first mark, one the second, and one carries both.
    hexes[1]!.marks = ['marl'];
    hexes[2]!.marks = ['marl', 'marlSecond'];
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const owned = ownedTiles(state, city).length;
    const firing = valueOfYields({ food: 2 * (EXPANSIONIST.markBesideRing / owned) }, ctx);
    const rate = 1 / HORIZON;
    const pits = orderDef('theMarlPits' as OrderId).effects;
    expect(scoreEffects([pits[0]!], ctx)).toBe(firing * rate);
    expect(scoreEffects(pits, ctx)).toBe(firing * rate + firing * rate);
  });

  it('reads The Mountain Schools’ two mountains off the board, with no knob', () => {
    const { state, player, cities } = board(1, 20);
    const schools = effectOf('theMountainSchools') as Extract<CardEffect, { kind: 'percentYields' }>;
    const open = { ...schools } as Record<string, unknown>;
    delete open.scope;
    const hexes = ring(state, cities[0]!);
    hexes[0]!.terrain = 'mountain' as never;
    bumpRevision(state);
    expect(scoreEffects([schools], valueContext(state, player))).toBe(0);
    hexes[1]!.terrain = 'mountain' as never;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    expect(scoreEffects([schools], ctx)).toBeGreaterThan(0);
    expect(scoreEffects([schools], ctx)).toBe(scoreEffects([open as unknown as CardEffect], ctx));
  });

  it('promises The Public Good the public works the towns could raise, and forecasts The Aediles', () => {
    const { state, player, cities } = board(2, 20);
    for (const step of researchExpansion(state, player.id, 'earthenware' as TechId)) {
      if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
    }
    cities[0]!.buildings.push('granary');
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const good = effectOf('thePublicGood') as CardPaysEffect;
    const counted = explainCounted(good, ctx, 'thePublicGood' as OrderId);
    // One Granary stands; the second town could raise one.
    expect(counted.terms[0]!.value).toBe(1);
    let open = 0;
    let hammers = 0;
    for (const city of cities) {
      for (const id of BUILDING_IDS.filter(isPublicWork)) {
        if (townHoldsBuilding(state, city, id)) continue;
        if (buildError(state, player.id, 'building', id, city) !== null) continue;
        open += 1;
        hammers += buildingProductionCost(id, state, player.id);
      }
    }
    expect(open).toBeGreaterThan(0);
    const promise = counted.terms[1]!;
    expect(promise.label).toMatch(/more the towns could raise/);
    expect(promise.value).toBe(open * delayDiscount(buildTurns(hammers / open, ctx), ctx));
    // The Aediles' count of public works finished: the forecast table's figure.
    const aediles = effectOf('theAediles', 2) as CardPaysEffect;
    const tally = explainCounted(aediles, ctx, 'theAediles' as OrderId);
    expect(tally.terms[1]!.value).toBe(aiJson.score.tallyForecast.publicWorkCompleted);
    expect(tally.terms[1]!.value).toBeGreaterThan(0);
  });
});

// --- what reads nought without a levy card ------------------------------------

describe('the levy cards and the retired soldier read nought without a levy card (E13)', () => {
  it('prices Watch and Ward, The Trained Bands and Veteran Colonies at nought for a seat with no levy card', () => {
    const { state, player } = board(2, 20);
    const ctx = valueContext(state, player);
    for (const id of ['watchAndWard', 'theTrainedBands', 'veteranColonies']) {
      expect(scoreEffects(orderDef(id as OrderId).effects, ctx), id).toBe(0);
    }
  });

  it('prices a grant of citizens at the food that grows them, at the rate of its moment', () => {
    const { state, player } = board(2, 20);
    const ctx = valueContext(state, player);
    const rider = (occasion: string): CardEffect[] => [
      { kind: 'windfallRider', occasion, grant: { citizens: 1 } } as CardEffect,
    ];
    // A soldier retired: this seat holds no army over what it wants and no
    // levy that raises one, so it forecasts no retirement (`retireRate`).
    expect(scoreEffects(rider('disband'), ctx)).toBe(0);
    // Growth is: five growths in each of two towns, over twenty turns.
    const lump = explainLump({ food: 1 * growthFood(6) }, ctx).total;
    expect(scoreEffects(rider('growth'), ctx)).toBe(lump * (10 / 20));
  });
});

// --- the commissions -----------------------------------------------------------

describe('the five Expansionist commissions are priced by D16’s commission price (E13)', () => {
  const FIVE = ['sixGardens', 'commissionBreakTheSod', 'theWideCountry', 'theHeartland', 'theDomesdaySurvey'];

  it('names exactly five live Expansionist commissions', () => {
    const live = ORDER_IDS.filter((id) => {
      const def = orderDef(id);
      return def.commission !== undefined && def.retired !== true && def.decks.includes('expansionist');
    });
    expect([...live].sort()).toEqual([...FIVE].sort());
  });

  it('prices each institution as its effect', () => {
    const { state, player, cities } = board(2, 20);
    const hexes = ring(state, cities[0]!);
    work(state, cities[0]!, hexes.slice(0, 3), 'farm', 5);
    const ctx: ValueContext = valueContext(state, player);
    for (const id of FIVE) {
      const priced = explainCommission(id as OrderId, ctx);
      expect(priced, id).not.toBeNull();
      const reward = priced!.terms[0]!.parts!;
      for (const line of orderDef(id as OrderId).commission!.reward) {
        for (const effect of line.lasting ?? []) {
          const term = reward.find((entry) => entry.label === `for the rest of the game: ${effect.kind}`);
          expect(term, `${id} ${effect.kind}`).toBeDefined();
          expect(term!.value, `${id} ${effect.kind}`).toBeGreaterThan(0);
          // The board's own price of the effect, wherever the board has one.
          const board = scoreEffects([effect], ctx);
          if (board !== 0) expect(term!.value, `${id} ${effect.kind}`).toBe(board);
        }
      }
    }
  });
});

// --- what a town holds ---------------------------------------------------------

describe('a town that holds the Aqueduct through The Cura Aquarum (E13)', () => {
  it('gains nothing from building a real one', () => {
    const { state, player, cities } = board(2, 20);
    for (let col = 4; col <= 8; col++) layRoad(at(state.map, col, 5), 0);
    bumpRevision(state);
    const joined = cities[1]!;
    const before = explainBuildingRow('aqueduct', valueContext(state, player), joined);
    expect(before.total).toBeGreaterThan(0);
    slot(state, player, 'theCuraAquarum');
    expect(townHoldsBuilding(state, joined, 'aqueduct')).toBe(true);
    const ctx = valueContext(state, player);
    const after = explainBuildingRow('aqueduct', ctx, joined);
    expect(after.total).toBe(0);
    expect(after.terms[0]!.label).toMatch(/already holds the Aqueduct/);
    // The capital is not joined to itself, so its row is read in full.
    expect(explainBuildingRow('aqueduct', ctx, cities[0]!).total).toBeGreaterThan(0);
    // The card is priced the same seated, so the bot does not bench it.
    expect(scoreEffects([effectOf('theCuraAquarum')], ctx)).toBe(
      explainBuildingRow('aqueduct', ctx, undefined, false).total * 1,
    );
    expect(buildingDef('aqueduct').publicWork).toBe(true);
  });
});
