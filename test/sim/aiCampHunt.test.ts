/**
 * **Bot batch BP8** (bot pass 3; `docs/flags.md` (ooooooo) P5, P6 and the P8
 * check): the camp hunt ranked by what a camp costs the seat and what clearing
 * it pays, with a force sized to the camp; the worker priced by the ground
 * waiting for a spade across the empire; the two wake arms; and the want book
 * read again when a town is gained during a turn.
 *
 * Every board here is a blank grassland bench with the wild seated, so each
 * figure asserted is one the test placed.
 */

import { describe, expect, it } from 'vitest';

import { botSitting, nextBotDecision, valueContext } from '../../src/ai/bot';
import { type BotDecision, foldTerms } from '../../src/ai/decision';
import { buildImprovementPlan, explainWorkerCraving } from '../../src/ai/plan';
import { explainLump } from '../../src/ai/prices';
import { explainCamp } from '../../src/ai/value';
import { BUILDING_IDS, buildingDef } from '../../src/sim/buildingData';
import { applyCommand } from '../../src/sim/commands';
import { foundCityAt, refreshCityDerived } from '../../src/sim/cities';
import { type Tile, createMap, getTileAt, tileIndex } from '../../src/sim/map';
import { RULES } from '../../src/sim/rulesData';
import {
  type City,
  type GameState,
  type Player,
  type Unit,
  barbarianPlayer,
  bumpRevision,
  createUnit,
  playerById,
} from '../../src/sim/state';
import type { OrderId } from '../../src/sim/statecraftData';
import { researchExpansion } from '../../src/sim/tech';
import { unitDef } from '../../src/sim/unitData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { computeFreshwater } from '../../src/sim/water';
import { newGame } from './newGameHelpers';

/** Two bot seats and the wild on blank grassland, with nothing placed. */
function bench(width = 30, height = 16): GameState {
  const state = newGame({
    seed: 11,
    sizeName: 'duel',
    players: [
      { name: 'Ada', color: '#a00' },
      { name: 'Bors', color: '#00a' },
    ],
    barbarians: true,
  });
  state.map = createMap({ width, height, terrain: 'grassland' });
  resetVisibility(state);
  state.tileOwner = new Array<number | null>(state.map.tiles.length).fill(null);
  state.units = [];
  state.cities = [];
  state.camps = [];
  state.nextEntityId = 1;
  computeFreshwater(state.map);
  recomputeAllVisibility(state);
  return state;
}

function at(state: GameState, col: number, row: number): Tile {
  const tile = getTileAt(state.map, col, row);
  if (!tile) throw new Error(`no tile at (${col}, ${row})`);
  return tile;
}

function seat(state: GameState, playerId: number): Player {
  const player = playerById(state, playerId);
  if (!player) throw new Error(`no seat ${playerId}`);
  return player;
}

function wildId(state: GameState): number {
  return barbarianPlayer(state)!.id;
}

/** Holds and seats a card, growing the spread if the government has no room. */
function slotOrder(state: GameState, playerId: number, id: OrderId): void {
  const sc = seat(state, playerId).statecraft;
  if (!sc.orders.includes(id)) sc.orders.push(id);
  sc.slots.push({ card: id, sealedUntil: state.turn });
  bumpRevision(state);
}

/** A camp with a dug-in warden on it, and the guards given beside it. */
function campAt(state: GameState, col: number, row: number, guards: { type: string; col: number; row: number }[] = []): void {
  state.camps.push({ col, row, foundedTurn: state.turn });
  const warden = createUnit(state, wildId(state), 'warrior', col, row);
  warden.fortifiedTurns = 2;
  for (const guard of guards) createUnit(state, wildId(state), guard.type as never, guard.col, guard.row);
  recomputeAllVisibility(state);
  bumpRevision(state);
}

/**
 * The decision this seat sends for one named piece, every other decision
 * before it applied through the reducer. `null` when the seat ends its turn
 * first.
 */
function orderFor(state: GameState, playerId: number, unitId: number, sitting = botSitting(playerId)): BotDecision | null {
  for (let step = 0; step < 120; step++) {
    const decision = nextBotDecision(state, playerId, sitting);
    if (decision === null) return null;
    if ('unitId' in decision.command && decision.command.unitId === unitId) return decision;
    if (!applyCommand(state, decision.command).ok) return null;
  }
  return null;
}

/** Seat 0's town at (5,8) with its garrison, and seat 1's at (25,8). */
function twoTowns(state: GameState): { home: City; rival: City } {
  const home = foundCityAt(state, 0, at(state, 5, 8));
  const rival = foundCityAt(state, 1, at(state, 25, 8));
  createUnit(state, 0, 'warrior', home.col, home.row);
  createUnit(state, 1, 'warrior', rival.col, rival.row);
  // A treasury that pays the wages, so the disband arm has nothing to say, and
  // towns that have bought their pieces this turn, so nothing stands on the
  // board that the test did not place.
  seat(state, 0).gold = 500;
  seat(state, 1).gold = 500;
  for (const city of [home, rival]) {
    city.purchasedUnitTurns = { militaryGold: state.turn, civilianGold: state.turn, faith: state.turn };
  }
  recomputeAllVisibility(state);
  bumpRevision(state);
  return { home, rival };
}

describe('what a camp is worth to the seat', () => {
  it('reads the bounty, and the raiders only of a camp whose nearest town is ours', () => {
    const state = bench();
    twoTowns(state);
    campAt(state, 9, 8);
    campAt(state, 21, 8);
    const ctx = valueContext(state, seat(state, 0));
    const near = explainCamp(ctx, { col: 9, row: 8 });
    const far = explainCamp(ctx, { col: 21, row: 8 });
    expect(foldTerms(near.terms)).toBe(near.total);
    expect(foldTerms(far.terms)).toBe(far.total);
    // The bounty is the rule book's gold and food, paid once.
    const bounty = explainLump({ gold: RULES.barbarians.campClearGold, food: RULES.barbarians.campClearFood }, ctx);
    for (const reading of [near, far]) {
      const line = reading.terms.find((term) => /^the bounty/.test(term.label));
      expect(line?.value).toBeCloseTo(bounty.total, 10);
    }
    // The camp four hexes from our town raids us; the one four from theirs
    // raids them.
    const raid = near.terms.find((term) => /raiders it sends at this seat/.test(term.label));
    expect(raid?.value ?? 0).toBeGreaterThan(0);
    expect(far.terms.some((term) => /raiders it sends at this seat/.test(term.label))).toBe(false);
    expect(far.terms.some((term) => /go to another empire's town first/.test(term.label))).toBe(true);
    expect(near.total).toBeGreaterThan(far.total);
  });

  it('reads the cards that scale the payout and pay on a camp cleared', () => {
    const state = bench();
    twoTowns(state);
    campAt(state, 9, 8);
    const before = explainCamp(valueContext(state, seat(state, 0)), { col: 9, row: 8 });
    // Spoils of the Wild doubles what a camp pays; The Outriders hands every
    // town hammers when one is cleared.
    slotOrder(state, 0, 'spoilsOfTheWild' as OrderId);
    slotOrder(state, 0, 'theOutriders' as OrderId);
    const ctx = valueContext(state, seat(state, 0));
    const after = explainCamp(ctx, { col: 9, row: 8 });
    const doubled = explainLump(
      { gold: RULES.barbarians.campClearGold * 2, food: RULES.barbarians.campClearFood * 2 },
      ctx,
    );
    expect(after.terms.find((term) => /^the bounty/.test(term.label))?.value).toBeCloseTo(doubled.total, 10);
    const cards = after.terms.find((term) => /cards pay when it clears a camp/.test(term.label));
    expect(cards?.value ?? 0).toBeGreaterThan(0);
    expect(after.total).toBeGreaterThan(before.total);
  });

  it('carries the pull of an open commission that counts camps cleared', () => {
    const state = bench();
    twoTowns(state);
    campAt(state, 9, 8);
    const id = 'dominionClearTheFrontier' as OrderId;
    const plain = explainCamp(valueContext(state, seat(state, 0)), { col: 9, row: 8 });
    expect(plain.terms.some((term) => term.label === 'a step toward an open commission')).toBe(false);
    slotOrder(state, 0, id);
    const pulled = explainCamp(valueContext(state, seat(state, 0)), { col: 9, row: 8 });
    const pull = pulled.terms.find((term) => term.label === 'a step toward an open commission');
    expect(pull?.value ?? 0).toBeGreaterThan(0);
    expect(pulled.total).toBeCloseTo(plain.total + pull!.value, 10);
  });
});

describe('a force sized to the camp', () => {
  /** A guarded camp three hexes east of seat 0's town, and `free` spare warriors west of the town. */
  function guarded(free: number): { state: GameState; pieces: Unit[] } {
    const state = bench();
    twoTowns(state);
    campAt(state, 8, 8, [{ type: 'spearman', col: 9, row: 8 }]);
    const pieces: Unit[] = [];
    for (let index = 0; index < free; index++) pieces.push(createUnit(state, 0, 'warrior', 4, 6 + index));
    recomputeAllVisibility(state);
    bumpRevision(state);
    return { state, pieces };
  }

  it('sends no lone piece at a camp its seat cannot field a force for', () => {
    const { state, pieces } = guarded(1);
    // One warrior against a dug-in warden and a spearman: the seat cannot make
    // the force whole, so the piece digs in where it stands. The next case
    // differs only in the spare pieces, and there it marches.
    const order = orderFor(state, 0, pieces[0]!.id);
    expect(order).not.toBeNull();
    expect(order!.command.type).toBe('fortify');
    expect(order!.summary).toMatch(/no camp near a town worth marching on/);
  });

  it('marches a piece to the camp once the seat can make the force whole', () => {
    const { state, pieces } = guarded(4);
    const order = orderFor(state, 0, pieces[0]!.id);
    expect(order?.command.type).toBe('moveUnit');
    expect(order!.summary).toMatch(/Marches on the camp at \(8,8\)/);
    const chosen = order!.candidates.find((row) => row.chosen === true)!;
    expect(foldTerms(chosen.terms)).toBe(chosen.score);
  });

  it('strikes at the assault exchange once the whole force stands beside the camp', () => {
    // Warriors at the camp's door: one is short of the force, four are whole.
    const short = bench();
    twoTowns(short);
    campAt(short, 8, 8);
    const alone = createUnit(short, 0, 'warrior', 7, 8);
    const lone = orderFor(short, 0, alone.id);
    // Alone, the blow deals less than it takes, and the seat's own exchange
    // holds it back.
    expect(lone?.command.type).not.toBe('attack');

    const whole = bench();
    twoTowns(whole);
    campAt(whole, 8, 8);
    const first = createUnit(whole, 0, 'warrior', 7, 8);
    for (const [col, row] of [[8, 7], [9, 8], [8, 9]] as const) createUnit(whole, 0, 'warrior', col, row);
    recomputeAllVisibility(whole);
    bumpRevision(whole);
    const strike = orderFor(whole, 0, first.id);
    expect(strike?.command.type).toBe('attack');
    expect(strike!.command).toMatchObject({ target: { col: 8, row: 8 } });
  });

  it('calls a dug-in piece out for the hunt, once a turn', () => {
    const { state, pieces } = guarded(4);
    for (const piece of pieces) piece.fortifiedTurns = 3;
    bumpRevision(state);
    const sitting = botSitting(0);
    const order = orderFor(state, 0, pieces[0]!.id, sitting);
    expect(order?.command.type).toBe('moveUnit');
    expect(order!.summary).toMatch(/^Calls a dug-in piece out for the hunt/);
    expect(sitting.called.has(pieces[0]!.id)).toBe(true);
    // With no camp in reach, nobody is called.
    const quiet = bench();
    twoTowns(quiet);
    const dug = createUnit(quiet, 0, 'warrior', 4, 6);
    dug.fortifiedTurns = 3;
    bumpRevision(quiet);
    expect(orderFor(quiet, 0, dug.id)).toBeNull();
  });

  /**
   * Bot batch BP16 (the audit's T4): a hurt piece that is already dug in on its
   * own ground is resting. Before the fix the heal arm said nothing for it,
   * because `fortifyError` refuses "already fortified", so the hunt called it
   * out to the camp and the fall-back walked it home again the next turn.
   */
  it('leaves a hurt piece dug in on its own ground to mend, and calls the others out', () => {
    const { state, pieces } = guarded(5);
    for (const piece of pieces) piece.fortifiedTurns = 3;
    const home = state.cities.find((city) => city.ownerId === 0)!;
    const hurt = pieces[0]!;
    hurt.hp = 30;
    state.tileOwner[tileIndex(state.map, hurt.col, hurt.row)] = home.id;
    bumpRevision(state);
    const sitting = botSitting(0);
    const sent: BotDecision[] = [];
    for (let step = 0; step < 120; step++) {
      const decision = nextBotDecision(state, 0, sitting);
      if (decision === null) break;
      sent.push(decision);
      expect(applyCommand(state, decision.command).ok).toBe(true);
    }
    // The hunt is live on this board: the healthy pieces are called out.
    expect(sent.some((decision) => /^Calls a dug-in piece out for the hunt/.test(decision.summary))).toBe(true);
    // The hurt one is sent nothing, and it is still dug in.
    expect(sent.filter((decision) => (decision.command as { unitId?: number }).unitId === hurt.id)).toEqual([]);
    expect(hurt.fortifiedTurns).not.toBeUndefined();
  });
});

describe('the worker', () => {
  function farming(state: GameState, playerId: number): void {
    const player = seat(state, playerId);
    for (const goal of ['agriculture', 'mining'] as const) {
      for (const step of [...researchExpansion(state, playerId, goal), goal]) {
        if (!player.techsResearched.includes(step)) player.techsResearched.push(step);
      }
    }
    bumpRevision(state);
  }

  /** Seat 0's two towns: `west` at (4,8) and `east` at (12,8), each of size two. */
  function towns(): { state: GameState; west: City; east: City } {
    const state = bench(20, 16);
    const west = foundCityAt(state, 0, at(state, 4, 8));
    const east = foundCityAt(state, 0, at(state, 12, 8));
    for (const city of [west, east]) {
      city.population = 2;
      refreshCityDerived(state, city);
    }
    farming(state, 0);
    recomputeAllVisibility(state);
    bumpRevision(state);
    return { state, west, east };
  }

  function craving(state: GameState, city: City): { total: number; labels: string[] } {
    const ctx = valueContext(state, seat(state, 0));
    const plan = buildImprovementPlan(state, seat(state, 0), ctx);
    const reading = explainWorkerCraving(plan, state, city, ctx, 'worker');
    expect(foldTerms(reading.terms)).toBe(reading.total);
    return { total: reading.total, labels: reading.terms.map((term) => term.label) };
  }

  it('prices the ground of every town, less the charges of every spade and of a spade queued', () => {
    const { state, west, east } = towns();
    const before = craving(state, west);
    expect(before.total).toBeGreaterThan(0);
    // A spade standing by the east town speaks for the empire's best entries,
    // wherever they lie, so the west town's craving falls.
    createUnit(state, 0, 'worker', east.col + 1, east.row);
    bumpRevision(state);
    const spoken = craving(state, west);
    expect(spoken.total).toBeLessThan(before.total);
    // A spade queued in the east town speaks too; the asking town's own queue
    // does not.
    const queuedState = towns();
    queuedState.east.queue = [{ kind: 'unit', id: 'worker' }];
    bumpRevision(queuedState.state);
    const fresh = towns();
    expect(craving(queuedState.state, queuedState.west).total).toBeLessThan(craving(fresh.state, fresh.west).total);
    queuedState.west.queue = [{ kind: 'unit', id: 'worker' }];
    bumpRevision(queuedState.state);
    const own = craving(queuedState.state, queuedState.west).total;
    queuedState.west.queue = [];
    bumpRevision(queuedState.state);
    expect(own).toBe(craving(queuedState.state, queuedState.west).total);
  });

  it('reads another town’s bare hexes when its own are finished', () => {
    const { state, west, east } = towns();
    // Every hex the west town could work is improved already.
    for (const tile of state.map.tiles) {
      if (state.tileOwner[tileIndex(state.map, tile.col, tile.row)] === west.id && !(tile.col === west.col && tile.row === west.row)) {
        tile.improvement = 'farm';
      }
    }
    bumpRevision(state);
    const reading = craving(state, west);
    expect(reading.total).toBeGreaterThan(0);
    expect(reading.labels.every((label) => /at \((\d+),/.exec(label) !== null)).toBe(true);
    void east;
  });

  it('lays no hex it would reach past the look-ahead', () => {
    const { state, west } = towns();
    const ctx = valueContext(state, seat(state, 0));
    const plan = buildImprovementPlan(state, seat(state, 0), ctx);
    const bounded = explainWorkerCraving(plan, state, west, { ...ctx, ai: { ...ctx.ai, workers: { ...ctx.ai.workers, waitingTurns: 1 } } }, 'worker');
    // One turn is the dig alone: only a hex under the town's own walk of nought
    // could land, and the town's centre is not a hex a spade lays.
    expect(bounded.terms.length).toBe(0);
  });

  it('rouses a sleeping worker when ground waits for it', () => {
    const { state, west } = towns();
    const spade = createUnit(state, 0, 'worker', west.col + 1, west.row);
    spade.sleeping = true;
    bumpRevision(state);
    const order = orderFor(state, 0, spade.id);
    expect(order).not.toBeNull();
    expect(order!.summary).toMatch(/^Rouses a sleeping worker/);
    expect(['buildImprovement', 'moveUnit']).toContain(order!.command.type);
    void unitDef;
  });
});

describe('the next route after a hire', () => {
  /** The row that carries route slots, read off the marker exactly as the bot does. */
  const MARKET = BUILDING_IDS.find((id) => (buildingDef(id).routeSlots ?? 0) > 0)!;

  /** Three towns of seat 0 in a row, two of them with a market, and a full purse. */
  function routeBench(): GameState {
    const state = bench(20, 12);
    for (let index = 0; index < 3; index++) {
      const town = foundCityAt(state, 0, at(state, 2 + index * 5, 5));
      town.population = 6;
      if (index < 2) town.buildings.push(MARKET);
      refreshCityDerived(state, town);
    }
    seat(state, 0).gold = 5000;
    recomputeAllVisibility(state);
    bumpRevision(state);
    return state;
  }

  it('offers the next pair once a route is hired, so free slots fill in one turn', () => {
    const state = routeBench();
    const sitting = botSitting(0);
    const hires: BotDecision[] = [];
    for (let step = 0; step < 80; step++) {
      const decision = nextBotDecision(state, 0, sitting);
      if (decision === null) break;
      if (decision.command.type === 'buyRoute') hires.push(decision);
      expect(applyCommand(state, decision.command).ok).toBe(true);
    }
    // Two slots and the gold for both: the first route comes off the book read
    // at sit-down, the second off the route outlook read again after the hire.
    expect(hires.length).toBe(2);
    expect(sitting.routeOffer).not.toBeNull();
    expect(sitting.ctxRoutes).toBe(0);
    // One context for the whole turn: the hire does not read the book again.
    for (const hire of hires) {
      const chosen = hire.candidates.find((row) => row.chosen === true)!;
      expect(foldTerms(chosen.terms)).toBe(chosen.score);
    }
  });

  it('offers nothing beside the book while no route has been hired', () => {
    const state = routeBench();
    seat(state, 0).gold = 0;
    bumpRevision(state);
    const sitting = botSitting(0);
    for (let step = 0; step < 80; step++) {
      const decision = nextBotDecision(state, 0, sitting);
      if (decision === null) break;
      expect(decision.command.type).not.toBe('buyRoute');
      expect(applyCommand(state, decision.command).ok).toBe(true);
    }
    expect(sitting.routeOffer).toBeNull();
  });
});
