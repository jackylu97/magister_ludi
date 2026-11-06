/**
 * **Batch DT19b: the bots' prices** (`docs/plans/doctrines-build-triage.md`, section
 * "DT19b: bot prices").
 *
 * Each test builds its own board and states the right figure and how it comes about.
 * The figures are worked out here from the rules, or from the row, and not read back
 * from the arm under test. A seeded game plays no part, so no change of the bots' other
 * choices can move these.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import { rankWorkSites } from '../../src/ai/plan';
import {
  type ValueContext,
  claimedHexWorth,
  explainBuildingRow,
  explainCitizenLevy,
  explainCounted,
  explainEffects,
  explainLump,
  explainRite,
  meterWeight,
  scoreEffects,
  townsAdmitting,
  valueOfYields,
  voiceWeight,
} from '../../src/ai/value';
import aiJson from '../../data/ai.json';

import { BUILDING_IDS, isWonder } from '../../src/sim/buildingData';
import { buildError } from '../../src/sim/tech';
import {
  buildingProductionCost,
  foundCityAt,
  growthSurplus,
  ownedTiles,
  refreshCityDerived,
} from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { improvementYield } from '../../src/sim/improvementData';
import { levyHammers } from '../../src/sim/levies';
import {
  type GameMap,
  type Tile,
  createMap,
  getTileAt,
  mapRange,
  raiseImprovement,
  tileHex,
  tileIndex,
} from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import {
  type City,
  type GameState,
  type Player,
  type Religion,
  bumpRevision,
  createUnit,
  newGame,
  playerById,
} from '../../src/sim/state';
import {
  type CardEffect,
  type CardPaysEffect,
  type DoctrineId,
  type OrderId,
  doctrineDef,
  orderDef,
} from '../../src/sim/statecraftData';
import { type RiteId, riteDef } from '../../src/sim/religionData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { foldTile, cityContext } from '../../src/sim/yields/hex';
import { lendDoctrineEffects } from './statecraftHelpers';

const HORIZON = aiJson.priorities.horizonTurns;
const PRIOR_TURNS = aiJson.score.commission.priorTurns;
const PRIOR_SHARE = aiJson.score.commission.priorShare;
const LUMP = aiJson.score.lumpTurns;
/** What the arms mean by a percentage of a town's hammers (`nominalRate`). */
const NOMINAL = aiJson.score.unknownEffect * aiJson.score.nominalCount;

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
  state.map = createMap({ width: 40, height: 12, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(40 * 12).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (tile === undefined) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function seat(state: GameState, id = 0): Player {
  return playerById(state, id)!;
}

/** One town for each population, seat 0, seven hexes apart, on turn 40. */
function board(populations: readonly number[]): { state: GameState; player: Player; towns: City[] } {
  const state = bench();
  const towns: City[] = [];
  for (const [index, population] of populations.entries()) {
    const town = foundCityAt(state, 0, at(state.map, 3 + 7 * index, 5));
    town.population = population;
    town.queue = [];
    refreshCityDerived(state, town);
    towns.push(town);
  }
  state.turn = 40;
  seat(state).gold = 500;
  recomputeAllVisibility(state);
  bumpRevision(state);
  return { state, player: seat(state), towns };
}

function give(state: GameState, city: City, ...ids: string[]): void {
  city.buildings.push(...(ids as never[]));
  refreshCityDerived(state, city);
  bumpRevision(state);
}

/** The first term of an appraisal of one row: the row's own price, without the hammer premium. */
function ownPrice(effect: CardEffect, ctx: ValueContext): number {
  return explainEffects([effect], ctx).terms[0]!.value;
}

const lent: (() => void)[] = [];
afterEach(() => {
  while (lent.length > 0) lent.pop()!();
});

describe('a line each town counts for itself is summed once', () => {
  it('reads The Choregia’s town line at 3 culture for each Monument, not that times the towns', () => {
    const { state, player, towns } = board([4, 4, 4]);
    for (const town of towns) give(state, town, 'monument');
    const ctx = valueContext(state, player);
    const line = doctrineDef('theChoregia' as DoctrineId).effects[0] as CardPaysEffect;
    // The fold pays each town 3 culture for its one Monument. Three towns make 9 culture,
    // at culture's price. The old reading summed the Monuments and multiplied by the
    // towns again, which is 3 × 3 × 3 culture: the plan's 405 against 135.
    const right = 9 * voiceWeight(ctx, 'culture');
    expect(explainCounted(line, ctx).total).toBeCloseTo(right, 10);
    expect(ownPrice(line, ctx) / voiceWeight(ctx, 'culture')).toBeCloseTo(9, 10);
  });

  it('asks the scope of each town, as the fold does', () => {
    const { state, player, towns } = board([6, 6, 6]);
    give(state, towns[0]!, 'library');
    give(state, towns[1]!, 'library');
    const ctx = valueContext(state, player);
    const line: CardPaysEffect = {
      kind: 'pays',
      where: 'city',
      basis: 'count',
      count: 'population',
      within: 'city',
      to: 'gold',
      amount: 1,
      scope: { test: 'hasBuilding', building: 'library' },
    };
    // Two towns of six citizens admit it, so 12 gold. The town with no Library pays nothing.
    expect(explainCounted(line, ctx).total).toBeCloseTo(12 * voiceWeight(ctx, 'gold'), 10);
  });

  it('floors `per` and holds `max` in each town, not over their sum', () => {
    const { state, player } = board([3, 3, 9]);
    const ctx = valueContext(state, player);
    const line: CardPaysEffect = {
      kind: 'pays',
      where: 'city',
      basis: 'count',
      count: 'population',
      within: 'city',
      to: 'gold',
      amount: 1,
      per: 2,
      max: 3,
    };
    // Towns of 3, 3 and 9 citizens pay floor(3/2) = 1, 1 and floor(9/2) = 4, capped at 3.
    // That is 5 gold. The old reading took 15 citizens, halved them, and capped the realm at 3.
    expect(explainCounted(line, ctx).total).toBeCloseTo(5 * voiceWeight(ctx, 'gold'), 10);
  });

  it('counts a capital line in the capital alone', () => {
    const { state, player, towns } = board([5, 5, 5]);
    give(state, towns[0]!, 'library', 'monument');
    give(state, towns[1]!, 'granary');
    give(state, towns[2]!, 'granary');
    const ctx = valueContext(state, player);
    const line: CardPaysEffect = {
      kind: 'pays',
      where: 'capital',
      basis: 'count',
      count: 'buildingsInCity',
      to: 'gold',
      amount: 1,
    };
    // The capital holds two rows and its own founding row or rows. What the fold pays is its
    // own count. Nothing in the other towns counts.
    const shelves = towns[0]!.buildings.length;
    expect(explainCounted(line, ctx).total).toBeCloseTo(shelves * voiceWeight(ctx, 'gold'), 10);
  });

  it('leaves a count of the whole empire paid in every town as it was', () => {
    const { state, player, towns } = board([4, 4]);
    give(state, towns[0]!, 'monument');
    const ctx = valueContext(state, player);
    const line: CardPaysEffect = {
      kind: 'pays',
      where: 'city',
      basis: 'count',
      count: 'cities',
      to: 'gold',
      amount: 1,
    };
    // Two towns counted, and each is paid for both: 4 gold.
    expect(explainCounted(line, ctx).total).toBeCloseTo(4 * voiceWeight(ctx, 'gold'), 10);
  });

  it('reads The Curator of Waters’ happiness per work once, at the meter’s price', () => {
    const { state, player, towns } = board([5, 5]);
    give(state, towns[0]!, 'aqueduct');
    give(state, towns[1]!, 'aqueduct');
    const ctx = valueContext(state, player);
    const line = doctrineDef('theCuratorOfWaters' as DoctrineId).effects[0] as CardPaysEffect;
    // Two public works, 2 happiness each, so 4 happiness. The plan named this line as a
    // double count, but a meter's payout was never multiplied by the towns.
    expect(explainCounted(line, ctx).total).toBeCloseTo(4 * meterWeight(ctx, 'happiness'), 10);
  });

  it('reads an ordinary building’s counted line in the town that raises it', () => {
    const { state, player, towns } = board([8, 20, 20]);
    const ctx = valueContext(state, player);
    const row = explainBuildingRow('amphitheater', ctx, towns[0]!);
    const written = row.terms.find((term) => term.label === 'its written effects')!;
    // +1 culture per two citizens, in the town of 8 raising it: 4 culture. The two towns
    // of 20 do not come into it. The old reading gave 48 citizens / 2 × 3 towns = 72.
    expect(written.value).toBeCloseTo(4 * voiceWeight(ctx, 'culture'), 10);
    // With no town named it reads the mean town: 16 citizens, so 8 culture.
    const middling = explainBuildingRow('amphitheater', ctx);
    const mean = middling.terms.find((term) => term.label === 'its written effects')!;
    expect(mean.value).toBeCloseTo(8 * voiceWeight(ctx, 'culture'), 10);
  });

  it('reads a rite’s count in the town that says it', () => {
    const { state, player, towns } = board([4, 20]);
    const ctx: ValueContext = { ...valueContext(state, player), cities: 1 };
    const id = 'omenReading' as RiteId;
    give(state, towns[0]!, 'monument', 'library');
    const shelves = towns[0]!.buildings.length;
    const duration = riteDef(id).duration ?? 1;
    // Omen Reading pays +1 science per building in the town, here for `duration` turns of a
    // lump's `lumpTurns`.
    const right = (shelves * voiceWeight(ctx, 'science') * duration) / LUMP;
    expect(explainRite(id, ctx, towns[0]!).total).toBeCloseTo(right, 8);
  });

  it('reads a scope as a share of the realm in a context priced for one town', () => {
    const { state, player } = board([10, 4, 4, 4]);
    const whole = valueContext(state, player);
    const scope = { test: 'populationAtLeast', value: 10 } as const;
    // One town of four admits it. The realm's reading says one town. A rite said in one town
    // lands in a town that admits it one time in four, where the old reading said one.
    expect(townsAdmitting(whole, scope)).toBe(1);
    expect(townsAdmitting({ ...whole, cities: 1 }, scope)).toBe(0.25);
  });
});

describe('a completion rider fires at the pace of its own rows', () => {
  const GOLD = { yield: 'gold', amount: 40 } as const;
  const worth = (ctx: ValueContext): number => explainLump({ gold: 40 }, ctx).total;
  /** `occasionForecastRate('wonderCompleted')` for a seat that has finished `done` wonders. */
  const wonderRate = (done: number, turn: number): number =>
    (done + ((aiJson.score.tallyForecast.wonderCompleted * PRIOR_SHARE) / HORIZON) * PRIOR_TURNS) /
    (turn + PRIOR_TURNS);

  it('reads a wonder rider at the wonders finished, however many other rows stand', () => {
    const { state, player, towns } = board([4, 4]);
    give(state, towns[0]!, 'monument', 'granary', 'library');
    give(state, towns[1]!, 'monument', 'granary', 'library');
    const rider: CardEffect = { kind: 'windfallRider', occasion: 'completion', wonder: true, grant: GOLD };
    const none = valueContext(state, player);
    // No wonder finished at turn 40: the table's default alone. The old reading counted
    // the six shelves standing and every unit built, so each Granary read as a wonder.
    expect(scoreEffects([rider], none)).toBeCloseTo(wonderRate(0, 40) * worth(none), 10);
    state.wonders.push({ building: 'theOracle' as never, cityId: towns[0]!.id, playerId: 0, turn: 30 });
    bumpRevision(state);
    const one = valueContext(state, player);
    expect(scoreEffects([rider], one)).toBeCloseTo(wonderRate(1, 40) * worth(one), 10);
  });

  it('reads a rider naming a row at the pace that row has stood', () => {
    const { state, player, towns } = board([4, 4]);
    give(state, towns[0]!, 'monument', 'granary');
    give(state, towns[1]!, 'monument', 'library');
    const ctx = valueContext(state, player);
    const named: CardEffect = {
      kind: 'windfallRider',
      occasion: 'buildingCompletion',
      building: 'monument' as never,
      grant: GOLD,
    };
    // Two Monuments at turn 40, and no town may raise another: 2 / 40 a turn.
    expect(scoreEffects([named], ctx)).toBeCloseTo((2 / 40) * worth(ctx), 10);
  });

  it('reads a row not yet raised at the towns that could raise it, over the horizon', () => {
    const { state, player } = board([4, 4]);
    player.techsResearched.push('stonecraft' as never);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const named: CardEffect = {
      kind: 'windfallRider',
      occasion: 'buildingCompletion',
      building: 'monument' as never,
      grant: GOLD,
    };
    // Each of the two towns may raise a Monument, and none stands: 2 / horizon a turn.
    expect(scoreEffects([named], ctx)).toBeCloseTo((2 / HORIZON) * worth(ctx), 10);
  });
});

describe('a hex line’s share of the works', () => {
  function farmed(population: number, farms: number): { state: GameState; player: Player; town: City } {
    const { state, player, towns } = board([population]);
    const town = towns[0]!;
    const hexes = ownedTiles(state, town).filter((tile) => tile.col !== town.col || tile.row !== town.row);
    town.workedTiles = [];
    for (const tile of hexes.slice(0, farms)) {
      raiseImprovement(tile, 'farm', state.turn);
      town.workedTiles.push({ col: tile.col, row: tile.row });
    }
    bumpRevision(state);
    return { state, player, town };
  }

  it('reads Crop Rotation’s gain at what a farm pays, not a nominal yield', () => {
    const { state, player, town } = farmed(4, 3);
    const ctx = valueContext(state, player);
    const row = doctrineDef('cropRotation' as DoctrineId).effects[0]!;
    // +100% of what the works pay on three farmed hexes. A farm's own row pays this:
    const works = improvementYield('farm');
    const one = valueOfYields(
      { food: works.food, production: works.production, gold: works.gold },
      ctx,
    );
    expect(one).toBeGreaterThan(0);
    expect(ownPrice(row, ctx)).toBeCloseTo(3 * one, 8);
    // The old reading: the percentage times the nominal rate times the hammer's weight,
    // on every hex. It did not read the farm at all.
    const old = 3 * NOMINAL * voiceWeight(ctx, 'production');
    expect(ownPrice(row, ctx)).not.toBeCloseTo(old, 2);
    expect(town.workedTiles).toHaveLength(3);
  });

  it('pays nothing on a seat with no works', () => {
    const { state, player } = farmed(4, 0);
    const row = doctrineDef('cropRotation' as DoctrineId).effects[0]!;
    expect(ownPrice(row, valueContext(state, player))).toBe(0);
  });

  it('adds what the fold adds, on the hex itself', () => {
    const { state, player, town } = farmed(4, 1);
    const ctx = valueContext(state, player);
    const row = doctrineDef('cropRotation' as DoctrineId).effects[0] as CardPaysEffect;
    const tile = at(state.map, town.workedTiles[0]!.col, town.workedTiles[0]!.row);
    const plain = foldTile(tile, cityContext(state, town));
    lent.push(lendDoctrineEffects('theApoikia' as DoctrineId, [row]));
    seat(state).statecraft.doctrines.push('theApoikia' as DoctrineId);
    bumpRevision(state);
    const raised = foldTile(tile, cityContext(state, town));
    const paid = {
      food: raised.food - plain.food,
      production: raised.production - plain.production,
      gold: raised.gold - plain.gold,
      science: raised.science - plain.science,
      culture: raised.culture - plain.culture,
      faith: raised.faith - plain.faith,
    };
    expect(ownPrice(row, ctx)).toBeCloseTo(valueOfYields(paid, ctx), 8);
  });
});

describe('a hex line that asks a work’s age', () => {
  it('prices The Georgics’ +1 production on the works that have stood twenty turns', () => {
    const { state, player, towns } = board([4]);
    const town = towns[0]!;
    state.turn = 60;
    const hexes = ownedTiles(state, town).filter((tile) => tile.col !== town.col || tile.row !== town.row);
    raiseImprovement(hexes[0]!, 'farm', 30);
    raiseImprovement(hexes[1]!, 'farm', 30);
    raiseImprovement(hexes[2]!, 'farm', 50);
    town.workedTiles = hexes.slice(0, 3).map((tile) => ({ col: tile.col, row: tile.row }));
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const line = doctrineDef('theGeorgics' as DoctrineId).effects[1]!;
    // Two works stood for 30 turns and one for 10, so +1 production on two hexes. With no
    // clock the arm read every hex as too young and priced the line at nothing.
    expect(ownPrice(line, ctx)).toBeCloseTo(2 * voiceWeight(ctx, 'production'), 8);
  });
});

describe('a bonus on named buildings reaches the hammers those rows cost', () => {
  const OPUS = 'theMagnumOpus' as never;

  it('reads The Opera del Duomo’s slower Opus at nothing while no town may raise it', () => {
    const { state, player } = board([6, 6, 6]);
    const ctx = valueContext(state, player);
    const slower = doctrineDef('theOperaDelDuomo' as DoctrineId).effects[1]!;
    // A seat that cannot begin the Opus loses nothing. The plan read -50 here.
    expect(ownPrice(slower, ctx)).toBeCloseTo(0, 10);
  });

  it('reads it in one town, not all of them, while a town raises the Opus', () => {
    const { state, player, towns } = board([6, 6, 6]);
    towns[1]!.queue = [{ kind: 'building', id: OPUS }];
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const slower = doctrineDef('theOperaDelDuomo' as DoctrineId).effects[1]!;
    // -25% of the nominal town, in the one town raising it. The old reading took all three.
    expect(ownPrice(slower, ctx)).toBeCloseTo(-0.25 * NOMINAL * voiceWeight(ctx, 'production'), 10);
  });

  it('reads The Gobelins’ bonus in one town, by the works in the borders', () => {
    const { state, player, towns } = board([6, 6, 6]);
    towns[1]!.queue = [{ kind: 'building', id: OPUS }];
    const hexes = ownedTiles(state, towns[0]!).filter(
      (tile) => tile.col !== towns[0]!.col || tile.row !== towns[0]!.row,
    );
    raiseImprovement(hexes[0]!, 'academy', 0);
    raiseImprovement(hexes[1]!, 'academy', 0);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const row = doctrineDef('theGobelins' as DoctrineId).effects[0]!;
    // +4% for each of two works, so +8%, in the one town raising the Opus.
    expect(ownPrice(row, ctx)).toBeCloseTo(0.08 * NOMINAL * voiceWeight(ctx, 'production'), 10);
  });

  it('reads a bonus on one row at that row’s share of what the seat could still raise', () => {
    const { state, player, towns } = board([6, 6]);
    player.techsResearched.push('stonecraft' as never, 'earthenware' as never, 'writing' as never);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const row: CardEffect = { kind: 'productionBonus', category: 'building', building: 'monument' as never, percent: 100 };
    const every: CardEffect = { kind: 'productionBonus', category: 'building', percent: 100 };
    const open = explainEffects([every], ctx).terms[0]!.value;
    const reached = explainEffects([row], ctx).terms[0]!.value;
    expect(open).toBeCloseTo(2 * NOMINAL * voiceWeight(ctx, 'production'), 10);
    // The two towns may each raise a Monument. Its hammers are the numerator, and the
    // hammers of every row either town may raise are the denominator.
    const monuments = 2 * buildingProductionCost('monument' as never, state, 0);
    let all = 0;
    for (const town of towns) {
      for (const id of BUILDING_IDS) {
        if (isWonder(id) || town.buildings.includes(id)) continue;
        if (buildError(state, 0, 'building', id, town) === null) all += buildingProductionCost(id, state, 0);
      }
    }
    expect(all).toBeGreaterThan(monuments);
    expect(reached).toBeCloseTo((open * monuments) / all, 8);
  });
});

describe('The Laurion Leases', () => {
  it('reads a little for a seat that has yet to buy a hex', () => {
    const { state, player, towns } = board([6]);
    const owned = ownedTiles(state, towns[0]!);
    const seam = owned.find((tile) => tile.col !== towns[0]!.col || tile.row !== towns[0]!.row)!;
    seam.resource = 'wheat' as never;
    bumpRevision(state);
    // With no hex in the book, the seat's own ground stands in for the hexes it would buy.
    const base = valueContext(state, player);
    const ctx: ValueContext = { ...base, wants: { ...base.wants, gold: [] } };
    const row = doctrineDef('theLaurionLeases' as DoctrineId).effects[0]!;
    // No hex bought, so the rate is the table's cautious default over the prior's turns.
    // The old rate was nought, so the card read nothing for a seat that had bought none.
    const rate =
      (((aiJson.score.tallyForecast.hexClaimed * PRIOR_SHARE) / HORIZON) * PRIOR_TURNS) / (40 + PRIOR_TURNS);
    const ring = RULES.cities.tilePurchase.ringBase[0]!;
    const passing = owned.filter((tile) => tile.resource !== undefined).length / owned.length;
    expect(passing).toBeGreaterThan(0);
    expect(scoreEffects([row], ctx)).toBeCloseTo(explainLump({ gold: 0.5 * ring * passing }, ctx).total * rate, 10);
  });
});

describe('a tech price counts only what the seat researches within the horizon', () => {
  it('reads The Court of Rudolf II at nothing for a young seat, far from the fourth age', () => {
    const { state, player } = board([3]);
    player.techsResearched = [];
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const rows = doctrineDef('theCourtOfRudolf' as DoctrineId).effects;
    // A town of three makes too little to reach the fourth age in sixty turns, so neither
    // price is paid. The old reading took the whole chain as one lump, in the thousands.
    expect(scoreEffects(rows, ctx)).toBe(0);
  });

  it('reads the whole chain for a seat with science enough to reach all of it', () => {
    const { state, player } = board([3]);
    lent.push(
      lendDoctrineEffects('theApoikia' as DoctrineId, [{ kind: 'pays', where: 'city', science: 100000 } as CardEffect]),
    );
    player.statecraft.doctrines.push('theApoikia' as DoctrineId);
    bumpRevision(state);
    const rows = doctrineDef('theCourtOfRudolf' as DoctrineId).effects;
    const ctx = valueContext(state, player);
    expect(scoreEffects(rows, ctx)).toBeGreaterThan(0);
  });
});

describe('the Order hand', () => {
  it('reads Officials by Merit on the same hands in force as The Hospitium', () => {
    const { state, player } = board([6]);
    player.culturePool = 400;
    bumpRevision(state);
    const ctx = valueContext(state, player);
    const rider = orderDef('officialsByMerit' as OrderId).effects[0]!;
    // Each hand's better card keeps paying once taken, so a seat buying `d` hands over the
    // horizon has d / 2 of them in force on average. Reading it as hands a turn was
    // horizon / 2 times lower, which is thirty at the sheet's sixty turns. The full figure
    // is pinned in `aiMagisterial.test.ts`.
    expect(scoreEffects([rider], ctx)).toBeGreaterThan(0);
  });
});

describe('a unit stamp narrowed to a town of a kind', () => {
  it('reads at the share of towns the scope admits', () => {
    const { state, player, towns } = board([4, 4, 4, 4]);
    give(state, towns[0]!, 'library');
    const ctx = valueContext(state, player);
    const scoped: CardEffect = {
      kind: 'unitStamp',
      strength: 4,
      scope: { test: 'hasWonder' },
    } as CardEffect;
    // No town holds a wonder, so no piece is stamped.
    expect(ownPrice(scoped, ctx)).toBe(0);
    const open: CardEffect = { kind: 'unitStamp', strength: 4 } as CardEffect;
    const whole = 4 * ctx.ai.weights.military * (1 + ctx.threat);
    expect(ownPrice(open, ctx)).toBeCloseTo(whole, 10);
    // One town of four is big enough, so a quarter of the pieces.
    towns[0]!.population = 10;
    refreshCityDerived(state, towns[0]!);
    bumpRevision(state);
    const big = valueContext(state, player);
    const narrowed: CardEffect = {
      kind: 'unitStamp',
      strength: 4,
      scope: { test: 'populationAtLeast', value: 10 },
    } as CardEffect;
    expect(ownPrice(narrowed, big)).toBeCloseTo((4 * big.ai.weights.military * (1 + big.threat)) / 4, 10);
  });
});

describe('The Two Capitals', () => {
  it('reads no growth cost for a seat of two towns', () => {
    const { state, player } = board([6, 4]);
    const ctx = valueContext(state, player);
    const rows = doctrineDef('theTwoCapitals' as DoctrineId).effects;
    const growth = rows[1]!;
    // Under the rule both towns are capitals, so nothing slows. Priced alone, the row reads
    // the second town as slowed. The card's own price takes that back.
    const alone = scoreEffects([growth], ctx);
    expect(alone).toBeLessThan(0);
    const spared = explainEffects(rows, ctx).terms.find((term) =>
      term.label.includes('second capital is spared'),
    )!;
    expect(spared.value).toBeCloseTo(-alone, 10);
  });

  it('reads the cost on the towns left for a seat of three', () => {
    const { state, player } = board([6, 4, 3]);
    const ctx = valueContext(state, player);
    const rows = doctrineDef('theTwoCapitals' as DoctrineId).effects;
    const alone = scoreEffects([rows[1]!], ctx);
    const spared = explainEffects(rows, ctx).terms.find((term) =>
      term.label.includes('second capital is spared'),
    )!;
    // Two towns are slowed before the rule and one after it, so half the cost comes back.
    expect(spared.value).toBeCloseTo(-alone / 2, 10);
  });
});

describe('a Citadel’s claim', () => {
  it('prices each hex of the ring the seat does not own', () => {
    const { state, player, towns } = board([4]);
    const town = towns[0]!;
    const general = createUnit(state, 0, 'greatPerson' as never, town.col, town.row);
    general.person = 'sunTzu' as never;
    // Beyond the town's borders, so the ring has hexes nobody owns.
    const ctx = valueContext(state, player);
    const sites = rankWorkSites(state, player, ctx, 'citadel' as never, general, 3);
    const site = sites.find((entry) => entry.terms.some((term) => term.label.includes('it would claim')));
    expect(site).toBeDefined();
    const term = site!.terms.find((entry) => entry.label.includes('it would claim'))!;
    const hex = at(state.map, site!.entry.col, site!.entry.row);
    let right = 0;
    let hexes = 0;
    for (const other of mapRange(state.map, tileHex(hex), RULES.greatPeople.citadelClaimRadius)) {
      if (state.tileOwner[tileIndex(state.map, other.col, other.row)] !== null) continue;
      hexes += 1;
      right += claimedHexWorth(ctx, other);
    }
    expect(hexes).toBeGreaterThan(0);
    expect(term.label).toContain(`the ${hexes} hexes`);
    expect(term.value).toBeCloseTo(right, 10);
  });
});

describe('a levy’s regrowth', () => {
  /** The turns `explainCitizenLevy` prints: "for the N turns the town takes to grow it back". */
  function regrowLabel(town: City, state: GameState): number {
    const levy = explainCitizenLevy(town, 'production', valueContext(state, seat(state)));
    const spends = levy.terms.find((term) => term.label === 'the citizen it spends');
    const line = spends?.parts?.find((term) => term.label.includes('turns the town takes to grow it back'));
    if (line === undefined) throw new Error('no regrowth line');
    return Number(/for the ([\d.]+) turns/.exec(line.label)![1]);
  }

  it('reads food carried along a route under The Grand Canal', () => {
    const { state, towns } = board([2, 2]);
    const [farm, market] = towns as [City, City];
    state.wars = [];
    // A worked farm in each town, so each makes a surplus, and a market for the route slot.
    for (const city of [farm, market]) {
      city.buildings.push('market' as never);
      refreshCityDerived(state, city);
    }
    bumpRevision(state);
    const trader = createUnit(state, 0, 'trader', farm.col, farm.row);
    const started = applyCommand(state, {
      type: 'startRoute',
      playerId: 0,
      unitId: trader.id,
      fromCityId: farm.id,
      toCityId: market.id,
    });
    expect(started.ok).toBe(true);
    bumpRevision(state);
    const plain = growthSurplus(state, market);
    expect(plain).toBeGreaterThan(0);
    const horizon = HORIZON;
    expect(regrowLabel(market, state)).toBeCloseTo(Math.min(horizon, levyHammers(market) / plain), 1);
    seat(state).statecraft.doctrines.push('theGrandCanal' as DoctrineId);
    bumpRevision(state);
    const fed = growthSurplus(state, market);
    expect(fed).toBeGreaterThan(plain);
    // The destination banks more, so the citizen comes back sooner. Food to spare at the far
    // end of the route shortens the wait by the share carried.
    expect(regrowLabel(market, state)).toBeCloseTo(Math.min(horizon, levyHammers(market) / fed), 1);
    expect(regrowLabel(market, state)).toBeLessThan(levyHammers(market) / plain);
  });
});

/** A religion founded by seat 0 at this town. */
function religionAt(state: GameState, site: City, follower: readonly string[]): Religion {
  at(state.map, site.col, site.row).improvement = 'holySite' as never;
  const religion = {
    id: state.religions.length,
    founderId: site.ownerId,
    name: 'The Testament',
    pantheon: [],
    follower: [...follower],
    enhancer: [],
    foundedTurn: state.turn,
    holySite: { col: site.col, row: site.row },
  } as unknown as Religion;
  state.religions.push(religion);
  site.followers = { [religion.id]: site.population };
  bumpRevision(state);
  return religion;
}

/** A town of seat 1, far from seat 0's, that follows nothing. */
function foreignTown(state: GameState, col: number, population: number): City {
  const town = foundCityAt(state, 1, at(state.map, col, 5));
  town.population = population;
  town.queue = [];
  refreshCityDerived(state, town);
  const ada = seat(state, 0);
  if (!ada.metSeats.includes(1)) ada.metSeats.push(1);
  state.visibility[0]!.fill(1);
  bumpRevision(state);
  return town;
}

describe('The Apostolic Camera', () => {
  const CARD = 'theApostolicCamera' as DoctrineId;

  it('reads a seat with a religion at the towns it can still turn, at what its beliefs pay', () => {
    const { state, player, towns } = board([8]);
    state.wars = [];
    religionAt(state, towns[0]!, ['titheHouses']);
    foreignTown(state, 20, 9);
    const ctx = valueContext(state, player);
    const row = doctrineDef(CARD).effects;
    // Tithe Houses pays +1 gold per three citizens, so the seat's mean town of 8 pays
    // floor(8 / 3) = 2 gold. One town can be turned, and its gold pays from the turn it
    // turns, so on average half of it over the horizon. The religion's pace is far above
    // one town in sixty turns, so the one known town is the cap.
    expect(scoreEffects(row, ctx)).toBeCloseTo(0.5 * 2 * voiceWeight(ctx, 'gold'), 8);
    // The old reading was nought: there is no follower abroad yet.
  });

  it('adds what one more town abroad pays to a lump that would turn it', () => {
    const { state, player, towns } = board([8]);
    state.wars = [];
    religionAt(state, towns[0]!, ['titheHouses']);
    foreignTown(state, 20, 4);
    foreignTown(state, 24, 4);
    const rider: CardEffect = {
      kind: 'windfallRider',
      occasion: 'townConverted',
      grant: { pressure: { amount: 300, range: 10 } },
    } as CardEffect;
    // Without the Camera a town turned pays only what the founder's trickle does.
    const plain = scoreEffects([rider], valueContext(state, player));
    const before = valueContext(state, player);
    const goldBefore = voiceWeight(before, 'gold');
    player.statecraft.doctrines.push(CARD);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    expect(voiceWeight(ctx, 'gold')).toBe(goldBefore);
    // Holding it, each town turned also pays the two gold above. A lump of this size turns
    // the other of the two towns wholly, so one town for each lump. The moment's rate is
    // the table's three towns over the horizon, for a religion founded this turn with no
    // town turned: 3 / horizon over the prior's turns, over the same turns.
    const rate = aiJson.score.tallyForecast.foreignCityConverted / HORIZON;
    expect(scoreEffects([rider], ctx) - plain).toBeCloseTo(rate * 2 * voiceWeight(ctx, 'gold'), 8);
  });
});

describe('The Martyr’s Crown', () => {
  const CARD = 'theMartyrsCrown' as DoctrineId;

  it('reads nothing with no town to turn, and nothing with no religion', () => {
    const { state, player, towns } = board([8]);
    state.wars = [];
    foreignTown(state, 20, 4);
    const row = doctrineDef(CARD).effects;
    // No religion, so nothing to press. The old stand-in read 0.1 here.
    expect(scoreEffects(row, valueContext(state, player))).toBe(0);
    state.cities = state.cities.filter((city) => city.ownerId === 0);
    religionAt(state, towns[0]!, ['titheHouses']);
    // A religion and no foreign town to turn.
    expect(scoreEffects(row, valueContext(state, player))).toBe(0);
  });

  it('reads the deaths a turn, times the share of a town the lump turns, times what it pays', () => {
    const { state, player, towns } = board([8]);
    state.wars = [];
    religionAt(state, towns[0]!, ['titheHouses']);
    foreignTown(state, 20, 4);
    const row = doctrineDef(CARD).effects;
    // A town turned pays the founder's trickle, so the row reads a little with no Camera.
    const plain = scoreEffects(row, valueContext(state, player));
    expect(plain).toBeGreaterThan(0);
    player.statecraft.doctrines.push('theApostolicCamera' as DoctrineId);
    bumpRevision(state);
    const ctx = valueContext(state, player);
    // Thirty pressure in converts, against a town of four whose majority is three citizens.
    const converts = Math.floor(30 / RULES.religion.pressurePerConvert);
    const share = Math.min(1, converts / 3);
    // Three deaths over the horizon, by the table. Under the Camera a town turned also pays
    // two gold, so that is what the card adds beside the trickle.
    const deaths = aiJson.score.tallyForecast.unitLost / HORIZON;
    expect(scoreEffects(row, ctx) - plain).toBeCloseTo(deaths * share * 2 * voiceWeight(ctx, 'gold'), 8);
  });
});
