/**
 * **The worker fixes from the bare-hex report, and the four citizen sheets** (bot
 * batch BP13b, `docs/flags.md` (ooooooo), the bullet "BP13b"; the report is
 * `docs/plans/bare-worked-hexes-2026-11-16.md`). The user, 2026-11-16: *"the
 * worker should target the highest value hexes, which is what it should be doing
 * now no? a march should count as a claim, and a worker's payoff should count the
 * charges that will actually land."*
 *
 * The tests pin four things:
 *
 *   - **the worker's choice shares the city's rule** (`rankPlanFor`,
 *     `citizenWouldWork`): a hex counts in full when a citizen would work it with
 *     the improvement on it, on the sheet the town carries, and otherwise only the
 *     part that needs no citizen counts, which for a luxury is its opening;
 *   - **a march is a claim** (`spadeClaims`): another worker does not walk to the
 *     hex a worker marches to, and the marching worker keeps it in view;
 *   - **the price counts the charges that will land** (`explainWorkerCraving`,
 *     `spokenFor`): a spade that cannot reach the ground inside the look-ahead
 *     does not cover it, and a spade's charge on its own hex is counted once;
 *   - **the focus arm compares all four sheets** (`sheetTable`,
 *     `growth.allFocusSheets`), with the starvation guard as it is, and its answer
 *     does not depend on the sheet the town stands on.
 *
 * Each board is arranged by hand, `aiWorkerGuards.test.ts`' bench.
 */

import { describe, expect, it } from 'vitest';

import { AI, withAiTuning } from '../../src/ai/aiConfig';
import { botSitting, focusReading, nextBotDecision, valueContext, workerAdvice } from '../../src/ai/bot';
import type { BotDecision } from '../../src/ai/decision';
import { type ImprovementPlan, buildImprovementPlan, explainWorkerCraving, rankPlanFor } from '../../src/ai/plan';
import { foundCityAt, refreshCityDerived, tileContextAt } from '../../src/sim/cities';
import { applyCommand } from '../../src/sim/commands';
import { type GameMap, type Tile, createMap, getTileAt, tileIndex, tileNeighbors, tileHex, wrappedDistance } from '../../src/sim/map';
import { HIDDEN, VISIBLE } from '../../src/sim/visibility';
import { improvementErrorAt, improvementYieldDelta } from '../../src/sim/improvements';
import { findPath } from '../../src/sim/pathfind';
import type { ResourceId } from '../../src/sim/resourceData';
import type { CitizenFocus } from '../../src/sim/rulesData';
import { type City, type GameState, type Player, type Unit, bumpRevision, createUnit } from '../../src/sim/state';
import { researchExpansion } from '../../src/sim/tech';
import type { TechId } from '../../src/sim/techData';
import type { TerrainId } from '../../src/sim/terrainData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { newGame } from './newGameHelpers';

/** A blank state of one terrain with two seats, `aiWorkerGuards.test.ts`' bench. */
function bench(terrain: TerrainId = 'grassland', width = 24, height = 12): GameState {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a' },
    ],
  });
  state.map = createMap({ width, height, terrain });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(width * height).fill(null);
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

function seat(state: GameState): Player {
  return state.players[0]!;
}

/** Seat 0 researches each goal and what it needs. */
function grant(state: GameState, goals: readonly TechId[]): void {
  const player = seat(state);
  for (const goal of goals) {
    for (const step of [...researchExpansion(state, 0, goal), goal]) {
      if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
    }
  }
}

interface Ground {
  terrain?: TerrainId;
  hills?: boolean;
  resource?: string;
  improvement?: string;
}

/**
 * Seat 0's town at (5,5), its ring arranged by `ground` (keys "col,row"), with
 * `population` citizens placed by the simulation.
 */
function townOn(
  state: GameState,
  ground: Record<string, Ground>,
  population: number,
  goals: readonly TechId[] = ['agriculture', 'mining'],
): City {
  grant(state, goals);
  for (const [key, row] of Object.entries(ground)) {
    const [col, line] = key.split(',').map(Number) as [number, number];
    const tile = at(state.map, col, line);
    if (row.terrain !== undefined) tile.terrain = row.terrain;
    if (row.hills !== undefined) tile.hills = row.hills;
    if (row.resource !== undefined) tile.resource = row.resource as ResourceId;
    if (row.improvement !== undefined) tile.improvement = row.improvement as never;
  }
  const city = foundCityAt(state, 0, at(state.map, 5, 5));
  city.population = population;
  refreshCityDerived(state, city);
  recomputeAllVisibility(state);
  bumpRevision(state);
  return city;
}

function planOf(state: GameState): { plan: ImprovementPlan; ctx: ReturnType<typeof valueContext> } {
  const ctx = valueContext(state, seat(state));
  return { plan: buildImprovementPlan(state, seat(state), ctx), ctx };
}

function rankFor(state: GameState, unit: Unit) {
  const { plan, ctx } = planOf(state);
  return rankPlanFor(plan, state, unit, ctx);
}

it('repairs a damaged farm on worked wheat without using a charge', () => {
  const state = bench('plains');
  wheatTown(state);
  const tile = at(state.map, 5, 4);
  tile.damagedImprovement = { id: 'farm', improvedOn: 1 };
  const worker = createUnit(state, 0, 'worker', 5, 4);
  const charges = worker.chargesLeft;
  expect(workerAdvice(state, 0, worker.id)[0]).toMatchObject({ col: 5, row: 4, action: 'repair', improvement: 'farm' });
  const command = decisionFor(state, worker.id)?.command;
  expect(command).toEqual({ type: 'repairImprovement', playerId: 0, unitId: worker.id });
  expect(applyCommand(state, command!).ok).toBe(true);
  expect(worker.chargesLeft).toBe(charges);
  expect(tile.improvement).toBe('farm');
});

const where = (row: { entry: { col: number; row: number } }): string => `${row.entry.col},${row.entry.row}`;

/** Seat 0's decisions in one sitting, each put to the reducer, until it asks about `unitId`. */
function decisionFor(state: GameState, unitId: number, limit = 60): BotDecision | null {
  const sitting = botSitting(0);
  for (let step = 0; step < limit; step++) {
    const decision = nextBotDecision(state, 0, sitting);
    if (decision === null) return null;
    const command = decision.command as { unitId?: number; type: string };
    if (command.unitId === unitId) return decision;
    if (command.type === 'endTurn') return null;
    if (!applyCommand(state, decision.command).ok) return null;
  }
  return null;
}

/**
 * Plains all round and one grassland hex of wheat at (5,4), which the town of one
 * works. A farm on a plains hex makes it 2 food and 1 production, which scores 8 on
 * the balanced sheet; the wheat scores 9 bare. So no citizen would move to a
 * farmed plains hex, and the plan prices every farm the same in the bot's
 * currency.
 */
function wheatTown(state: GameState): City {
  return townOn(state, { '5,4': { terrain: 'grassland', resource: 'wheat' } }, 1);
}

describe("the worker's choice shares the city's rule (bot batch BP13b)", () => {
  it('walks to the hex a citizen works, not to a nearer one no citizen would work', () => {
    const state = bench('plains');
    const city = wheatTown(state);
    expect(city.workedTiles.some((cell) => cell.col === 5 && cell.row === 4), 'the town works the wheat').toBe(true);
    const worker = createUnit(state, 0, 'worker', 6, 5);
    bumpRevision(state);
    // The precondition: the plan prices the farms on plains hexes the same as the
    // farm on the wheat, and one stands under the worker's feet.
    const { plan } = planOf(state);
    const under = plan.byTile.get(tileIndex(state.map, 6, 5));
    expect(under?.improvement).toBe('farm');
    expect(under!.value).toBe(plan.byTile.get(tileIndex(state.map, 5, 4))!.value);
    const ranked = rankFor(state, worker);
    expect(ranked.map(where)).toEqual(['5,4']);
    expect(ranked[0]!.terms[0]!.label).toMatch(/a citizen of .* works \(5,4\)/);
    // And the arm walks there.
    const order = decisionFor(state, worker.id);
    expect(order?.command).toMatchObject({ type: 'moveUnit', target: { col: 5, row: 4 } });
  });

  it('offers the same nearby farm as the bot, reports the tile delta and reuses the answer until the board changes', () => {
    const state = bench('plains');
    wheatTown(state);
    const worker = createUnit(state, 0, 'worker', 6, 5);
    const tile = at(state.map, 5, 4);
    const before = JSON.stringify(state);
    const advice = workerAdvice(state, 0, worker.id);
    expect(advice).toHaveLength(1);
    expect(advice[0]).toMatchObject({ col: 5, row: 4, improvement: 'farm', action: 'build',
      delta: improvementYieldDelta(tile, 'farm', tileContextAt(state, 0, tile)) });
    expect(improvementErrorAt(state, 0, tile, 'farm')).toBeNull();
    expect(findPath(state, worker, tile)).not.toBeNull();
    expect(workerAdvice(state, 0, worker.id)).toBe(advice);
    expect(workerAdvice(state, 1, worker.id)).toEqual([]);
    expect(JSON.stringify(state)).toBe(before);
    const { command } = decisionFor(state, worker.id)!;
    expect(command).toMatchObject({ type: 'moveUnit', target: { col: 5, row: 4 } });
    state.visibility[0]![tileIndex(state.map, 5, 4)] = HIDDEN;
    bumpRevision(state);
    expect(workerAdvice(state, 0, worker.id)).toEqual([]);
  });

  it('includes a four-hex route when the display asks for that range', () => {
    const state = bench('plains');
    wheatTown(state);
    const target = at(state.map, 5, 4);
    const from = state.map.tiles.find(tile => wrappedDistance(state.map, tileHex(tile), tileHex(target)) === 4)!;
    const worker = createUnit(state, 0, 'worker', from.col, from.row);
    state.visibility[0]!.fill(VISIBLE);
    bumpRevision(state);
    expect(workerAdvice(state, 0, worker.id, { walk: 3, count: 3, near: 0.6 })).toEqual([]);
    expect(workerAdvice(state, 0, worker.id, { walk: 4, count: 3, near: 0.6 })[0]).toMatchObject({
      col: 5, row: 4, distance: 4, improvement: 'farm',
    });
  });

  it('places Nazca lines beside existing lines and includes the gain on the existing tile', () => {
    const state = bench('desert');
    townOn(state, { '5,4': { improvement: 'nazcaLines' } }, 6);
    seat(state).statecraft.orders.push('theDesertAndTheSnow');
    const worker = createUnit(state, 0, 'worker', 5, 5);
    bumpRevision(state);
    const { plan } = planOf(state);
    const existing = at(state.map, 5, 4);
    const adjacent = new Set(tileNeighbors(state.map, existing));
    const paired = plan.entries.find(row => row.improvement === 'nazcaLines' && adjacent.has(at(state.map, row.col, row.row)))!;
    const isolated = plan.entries.find(row => row.improvement === 'nazcaLines' && !adjacent.has(at(state.map, row.col, row.row)))!;
    expect(paired.improvement).toBe('nazcaLines');
    expect(isolated.improvement).toBe('nazcaLines');
    expect(paired.seatless).toBeGreaterThan(isolated.seatless);
    expect(paired.value).toBeGreaterThan(isolated.value);
    expect(workerAdvice(state, 0, worker.id)[0]?.improvement).toBe('nazcaLines');
  });

  it('offers an outpost on known land three hexes beyond the border and values the land it claims', () => {
    const state = bench('plains');
    townOn(state, {}, 1);
    const worker = createUnit(state, 0, 'worker', 9, 5);
    state.visibility[0]!.fill(VISIBLE);
    const tile = at(state.map, 9, 5);
    expect(improvementErrorAt(state, 0, tile, 'outpost')).not.toBeNull();
    seat(state).statecraft.orders.push('outposts');
    bumpRevision(state);
    expect(improvementErrorAt(state, 0, tile, 'outpost')).toBeNull();
    const { plan } = planOf(state);
    const chosen = plan.byTile.get(tileIndex(state.map, tile.col, tile.row));
    expect(chosen?.improvement).toBe('outpost');
    expect(chosen?.seatless).toBeGreaterThan(0);
    expect(workerAdvice(state, 0, worker.id).some(row => row.improvement === 'outpost')).toBe(true);
  });

  it('counts a hex no citizen works yet in full when its improved yield would win a citizen', () => {
    // A second wheat at (5,6): 9 bare, the same as the worked wheat, and the town
    // takes the lower tile index. Farmed it is 4 food, 12, so a citizen would move.
    const state = bench('plains');
    const city = townOn(
      state,
      { '5,4': { terrain: 'grassland', resource: 'wheat' }, '5,6': { terrain: 'grassland', resource: 'wheat' } },
      1,
    );
    expect(city.workedTiles.some((cell) => cell.col === 5 && cell.row === 6)).toBe(false);
    const worker = createUnit(state, 0, 'worker', 5, 6);
    bumpRevision(state);
    const ranked = rankFor(state, worker);
    const row = ranked.find((candidate) => where(candidate) === '5,6')!;
    expect(row).toBeDefined();
    expect(row.score).toBe(row.entry.value);
    expect(row.terms[0]!.label).toMatch(/would work \(5,6\)/);
  });

  it('prices the opening of a luxury the empire cannot draw on, which needs no citizen', () => {
    // Wine on a desert hex: 2 gold bare and 4 with a plantation, far under the
    // wheat the town works. No citizen would work it, and the first wine still
    // pays the empire, so the plantation keeps its opening and nothing else.
    const state = bench('plains');
    townOn(
      state,
      { '5,4': { terrain: 'grassland', resource: 'wheat' }, '6,5': { terrain: 'desert', resource: 'wine' } },
      1,
      ['agriculture', 'mining', 'calendar'],
    );
    const worker = createUnit(state, 0, 'worker', 6, 6);
    bumpRevision(state);
    const { plan, ctx } = planOf(state);
    const entry = plan.byTile.get(tileIndex(state.map, 6, 5))!;
    expect(entry.improvement).toBe('plantation');
    expect(entry.terms.some((term) => /a luxury this empire owns no copy of/.test(term.label))).toBe(true);
    expect(entry.seatless).toBe(ctx.ai.site.newLuxuryBonus);
    const ranked = rankPlanFor(plan, state, worker, ctx);
    const row = ranked.find((candidate) => where(candidate) === '6,5')!;
    expect(row.terms[0]!.label).toMatch(/no citizen would move to it/);
    expect(row.score).toBeCloseTo(ctx.ai.site.newLuxuryBonus / (1 + row.distance * ctx.ai.workers.walkDiscount), 10);
    // The plantation does not fall below the worked farm by accident.
    expect(ranked.findIndex((candidate) => where(candidate) === '6,5')).toBeLessThan(
      ranked.findIndex((candidate) => where(candidate) === '5,4'),
    );
  });

  it('reads the sheet the town carries', () => {
    // A grassland hill at (6,5) and grassland all round. On the balanced sheet the
    // town of one works grassland (6) over the bare hill (4), and a mine makes the
    // hill 6, which wins no citizen. On the production sheet the town works the
    // hill already, so a mine there counts.
    const state = bench('grassland');
    const city = townOn(state, { '6,5': { hills: true } }, 1);
    const worker = createUnit(state, 0, 'worker', 5, 5);
    bumpRevision(state);
    const hill = (): string[] => rankFor(state, worker).filter((row) => where(row) === '6,5').map((row) => row.terms[0]!.label);
    expect(hill()).toEqual([]);
    city.focus = 'production';
    refreshCityDerived(state, city);
    bumpRevision(state);
    expect(city.workedTiles.some((cell) => cell.col === 6 && cell.row === 5), 'the production sheet works the hill').toBe(true);
    expect(hill()).toEqual([expect.stringMatching(/works \(6,5\).*production sheet/)]);
  });
});

describe('a march is a claim (bot batch BP13b)', () => {
  it('sends a second worker elsewhere, and the marching worker keeps its own target', () => {
    const state = bench('grassland');
    townOn(state, {}, 1);
    const marching = createUnit(state, 0, 'worker', 9, 5);
    bumpRevision(state);
    const aim = rankFor(state, marching)[0]!;
    marching.path = findPath(state, marching, at(state.map, aim.entry.col, aim.entry.row))!;
    expect(marching.path.length).toBeGreaterThan(0);
    const other = createUnit(state, 0, 'worker', 5, 5);
    bumpRevision(state);
    expect(rankFor(state, other).map(where)).not.toContain(where(aim));
    expect(rankFor(state, marching).map(where)).toContain(where(aim));
    expect(planOf(state).plan.byTile.get(tileIndex(state.map, aim.entry.col, aim.entry.row))!.unclaimed).toBe(false);
  });
});

describe('the price counts the charges that will land (bot batch BP13b)', () => {
  /** The town's craving for one more worker, with the look-ahead at `turns`. */
  function craving(state: GameState, city: City, turns = AI.workers.waitingTurns): number {
    const { plan, ctx } = planOf(state);
    const bounded = { ...ctx, ai: { ...ctx.ai, workers: { ...ctx.ai.workers, waitingTurns: turns } } };
    return explainWorkerCraving(plan, state, city, bounded, 'worker').terms.length;
  }

  it('does not let a spade that cannot reach the ground in time cover it', () => {
    // A town of one has three seated hexes and a Worker holds three charges.
    const state = bench('grassland');
    const city = townOn(state, {}, 1);
    expect(craving(state, city, 6)).toBeGreaterThan(0);
    // Twelve hexes off at two a turn: six turns of walking and one of digging,
    // past a look-ahead of six.
    const far = createUnit(state, 0, 'worker', 17, 5);
    bumpRevision(state);
    expect(craving(state, city, 6)).toBeGreaterThan(0);
    // The same spade beside the town lays all three inside the look-ahead: a
    // turn's walk and a turn's dig each.
    far.col = 6;
    far.row = 5;
    bumpRevision(state);
    expect(craving(state, city, 6)).toBe(0);
  });

  it('counts the charge a spade spends on the hex it stands on once', () => {
    // One charge left, standing on a seated hex: it lays that hex and nothing
    // more, so two of the three seated hexes are left for a new spade.
    const state = bench('grassland');
    const city = townOn(state, {}, 1);
    expect(craving(state, city)).toBe(3);
    const worked = city.workedTiles.find((cell) => cell.col !== city.col || cell.row !== city.row)!;
    const spade = createUnit(state, 0, 'worker', worked.col, worked.row);
    spade.chargesLeft = 1;
    bumpRevision(state);
    expect(craving(state, city)).toBe(2);
  });
});

describe('the focus arm compares all four citizen sheets (bot batch BP13b)', () => {
  /**
   * A town of one at (5,5) on grassland, with a hill fort on a grassland hill at
   * (6,5) (4 production) and grassland (2 food) on the rest of its ring, (5,4)
   * the lowest tile index. At the first age the balanced sheet scores the hill
   * fort above grassland, so it takes the hill; the production sheet takes the
   * hill too. The food and gold sheets score the two the same, and the lower
   * tile index takes grassland. (Until 2026-11-22 this bench used a mined hill,
   * which the old balanced sheet scored level with grassland. The new balanced
   * sheet puts two food above three production, so the hill needed a fourth.)
   */
  function hillTown(): { state: GameState; city: City } {
    const state = bench('grassland');
    const city = townOn(state, { '6,5': { hills: true, improvement: 'hillfort' } }, 1);
    return { state, city };
  }

  it('puts a town on the food sheet where only a third sheet wins, and two sheets cannot', () => {
    const { state, city } = hillTown();
    const four = focusReading(state, city, valueContext(state, seat(state)));
    expect(four.four).toBe(true);
    expect(four.best).toBe('food');
    expect(four.sheets.food!.score).toBeGreaterThan(0);
    expect(four.candidates.map((candidate) => candidate.label)).toEqual([
      'work the hammers',
      'work the harvest',
      'work the coin',
      'the balanced ordering',
    ]);
    const two = withAiTuning({ growth: { allFocusSheets: 0 } } as never, () =>
      focusReading(state, city, valueContext(state, seat(state))),
    );
    expect(two.four).toBe(false);
    expect(two.best).toBe('default');
  });

  it('answers the same whatever sheet the town stands on', () => {
    const { state, city } = hillTown();
    const readings = (['default', 'food', 'production', 'gold'] as CitizenFocus[]).map((focus) => {
      city.focus = focus;
      refreshCityDerived(state, city);
      bumpRevision(state);
      const before = JSON.stringify(state);
      const table = focusReading(state, city, valueContext(state, seat(state)));
      expect(JSON.stringify(state)).toBe(before);
      return { best: table.best, scores: Object.values(table.sheets).map((row) => row!.score) };
    });
    for (const reading of readings) {
      expect(reading.best).toBe(readings[0]!.best);
      reading.scores.forEach((score, index) => expect(score).toBeCloseTo(readings[0]!.scores[index]!, 9));
    }
  });

  it('refuses a sheet that would starve the town', () => {
    // Two grassland hexes and two hexes of wine on desert. The gold sheet would put
    // both citizens on the wine, with no food at all.
    const state = bench('desert');
    const city = townOn(
      state,
      {
        '5,4': { terrain: 'grassland' },
        '6,4': { terrain: 'grassland' },
        '4,5': { resource: 'wine' },
        '6,5': { resource: 'wine' },
      },
      2,
      ['agriculture', 'mining', 'calendar'],
    );
    const table = focusReading(state, city, valueContext(state, seat(state)));
    expect(table.sheets.gold!.gated).toBe(true);
    expect(table.sheets.gold!.score).toBe(0);
    const coin = table.candidates.find((candidate) => candidate.label === 'work the coin')!;
    expect(coin.terms.some((term) => /would not feed itself on the gold sheet/.test(term.label))).toBe(true);
    expect(table.best).not.toBe('gold');
  });

  it('sends the order the table names, and none with the switch at nought', () => {
    const order = (sheets: number): BotDecision | null => {
      const { state, city } = hillTown();
      return withAiTuning({ growth: { allFocusSheets: sheets } } as never, () => {
        const sitting = botSitting(0);
        for (let step = 0; step < 60; step++) {
          const decision = nextBotDecision(state, 0, sitting);
          if (decision === null || decision.command.type === 'endTurn') return null;
          if (decision.kind === 'focus' && (decision.command as { cityId: number }).cityId === city.id) return decision;
          if (!applyCommand(state, decision.command).ok) return null;
        }
        return null;
      });
    };
    const sent = order(1);
    expect(sent?.command).toMatchObject({ type: 'setCitizenFocus', focus: 'food' });
    expect(sent!.summary).toMatch(/on the food sheet: it scores .* over the balanced ordering/);
    expect(order(0)).toBeNull();
  });
});
