/**
 * **Batch BP2 of bot pass 3, B9: the bot's count of units raised.** The spec is
 * `docs/flags.md` item (ooooooo), entry B9; the audit is
 * `docs/audit/bot-pass-3-card-values.md` fault 9 and "Rule faults seen in play".
 *
 * `Player.unitsBuilt` counts only the types with an escalation ladder (the
 * settler and the worker), because it sets their price. The bot read it as
 * "units raised", so every military pace read close to nought. The sim now
 * keeps `Player.unitsGained`, one count for each unit `realiseItem` brings into
 * being, and the bot reads that.
 *
 * Pinned here:
 *
 *   - the sim counts every way a town gains a unit (trained, bought, free,
 *     levied) and leaves `unitsBuilt` and the prices it sets alone;
 *   - the bot's military pace is not nought for a seat that has trained
 *     soldiers, and a card priced on that pace (Mercenary Contracts) is worth
 *     something;
 *   - the warscore's losses proxy counts a soldier that was trained and is no
 *     longer standing.
 */
import { describe, expect, it } from 'vitest';

import { valueContext } from '../../src/ai/bot';
import { aiConfigFor } from '../../src/ai/aiConfig';
import { explainWarScore } from '../../src/ai/diplomacy';
import { scoreEffects, unitsGainedMatching } from '../../src/ai/value';
import { type City, type GameState, type Player, bumpRevision, playerById } from '../../src/sim/state';
import { foundCityAt, realiseItem, refreshCityDerived, unitProductionCost } from '../../src/sim/cities';
import { type GameMap, type Tile, createMap, getTileAt } from '../../src/sim/map';
import { type OrderId, orderDef } from '../../src/sim/statecraftData';
import type { UnitTypeId } from '../../src/sim/unitData';
import { recomputeAllVisibility, resetVisibility } from '../../src/sim/visibility';
import { openWar } from '../../src/sim/wars';
import { newGame } from './newGameHelpers';

/** A blank grassland board with two seats and no wild. */
function bench(): GameState {
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
  state.turn = 40;
  return state;
}

function at(map: GameMap, col: number, row: number): Tile {
  const tile = getTileAt(map, col, row);
  if (!tile) throw new Error(`No tile at (${col}, ${row})`);
  return tile;
}

function seat(state: GameState, id: number): Player {
  return playerById(state, id)!;
}

function town(state: GameState, playerId: number, col: number): City {
  const city = foundCityAt(state, playerId, at(state.map, col, 6));
  city.population = 4;
  refreshCityDerived(state, city);
  recomputeAllVisibility(state);
  bumpRevision(state);
  return city;
}

/** A unit gained the way a town gains one: through `realiseItem`. */
function gain(state: GameState, city: City, type: UnitTypeId, options = {}): void {
  realiseItem(state, city, { kind: 'unit', id: type, tile: at(state.map, city.col, city.row) }, options);
  bumpRevision(state);
}

describe('the record of every unit gained (Player.unitsGained)', () => {
  it('counts a trained, a bought, a free and a levied unit, and leaves the price ladder alone', () => {
    const state = bench();
    const city = town(state, 0, 6);
    const player = seat(state, 0);
    expect(player.unitsGained).toBeUndefined();
    const workerBefore = unitProductionCost(state, 0, 'worker');
    gain(state, city, 'warrior');
    gain(state, city, 'warrior', { bought: 'gold' });
    gain(state, city, 'warrior', { free: true });
    gain(state, city, 'spearman', { untrained: true });
    expect(player.unitsGained).toEqual({ warrior: 3, spearman: 1 });
    // `unitsBuilt` still counts only the escalating types: no soldier joins it,
    // so no unit's price moves.
    expect(player.unitsBuilt).toEqual({});
    expect(unitProductionCost(state, 0, 'worker')).toBe(workerBefore);
    // A worker climbs both: its own ladder and the record.
    gain(state, city, 'worker');
    expect(player.unitsBuilt).toEqual({ worker: 1 });
    expect(player.unitsGained).toEqual({ warrior: 3, spearman: 1, worker: 1 });
  });
});

describe('the bot reads a military pace off the record', () => {
  it('reads a non-zero military pace for a seat that has trained soldiers', () => {
    const state = bench();
    const city = town(state, 0, 6);
    const player = seat(state, 0);
    expect(unitsGainedMatching(valueContext(state, player), { category: 'military' })).toBe(0);
    for (let index = 0; index < 5; index++) gain(state, city, 'warrior');
    gain(state, city, 'worker');
    const ctx = valueContext(state, player);
    // Five soldiers, and the worker is not one: the old record held no soldier.
    expect(unitsGainedMatching(ctx, { category: 'military' })).toBe(5);
    expect(unitsGainedMatching(ctx)).toBe(6);
    expect(Object.keys(player.unitsBuilt)).toEqual(['worker']);
  });

  it('prices Mercenary Contracts on the soldiers the seat has really trained', () => {
    const state = bench();
    const city = town(state, 0, 6);
    const player = seat(state, 0);
    player.gold = 500;
    const [waiver] = orderDef('mercenaryContracts' as OrderId).effects;
    expect(scoreEffects([waiver!], valueContext(state, player))).toBe(0);
    for (let index = 0; index < 8; index++) gain(state, city, 'warrior');
    expect(scoreEffects([waiver!], valueContext(state, player))).toBeGreaterThan(0);
  });

  it('counts a trained soldier that no longer stands in the warscore’s losses', () => {
    const state = bench();
    const mine = town(state, 0, 6);
    town(state, 1, 18);
    openWar(state, 0, 1);
    gain(state, mine, 'warrior');
    gain(state, mine, 'warrior');
    const ai = aiConfigFor(undefined);
    const before = explainWarScore(state, seat(state, 0), seat(state, 1), ai);
    expect(before.terms[1]!.label).toMatch(/^0 of ours/);
    // One of the two falls: the record still holds both.
    const fallen = state.units.find((unit) => unit.ownerId === 0)!;
    state.units = state.units.filter((unit) => unit.id !== fallen.id);
    bumpRevision(state);
    const after = explainWarScore(state, seat(state, 0), seat(state, 1), ai);
    expect(after.terms[1]!.label).toMatch(/^1 of ours/);
    expect(after.total).toBeLessThan(before.total);
  });
});
